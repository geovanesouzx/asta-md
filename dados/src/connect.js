import { DisconnectReason, makeCacheableSignalKeyStore, makeWASocket, fetchLatestBaileysVersion, isJidBroadcast, isJidNewsletter, isJidStatusBroadcast } from 'baileys';
import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import readline from 'readline';
import pino from 'pino';
import fs from 'fs/promises';
import path, { dirname, join } from 'path';
import qrcode from 'qrcode-terminal';
import { readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import fsSync from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import axios from 'axios';
import util from 'util';
import PerformanceOptimizer from './utils/performanceOptimizer.js';
import RentalExpirationManager from './utils/rentalExpirationManager.js';
import { loadMsgBotOn } from './utils/database.js';
import { buildUserId } from './utils/helpers.js';
import { initCaptchaIndex, loadCaptchaJson, saveCaptchaJson } from './utils/captchaIndex.js';
import CaptchaIndex from './utils/captchaIndex.js';
import { useSafeMultiFileAuthState } from './utils/authState.js';
import { sendButtons, quickReply } from './funcs/utils/buttonMenu.js';
import { recordJoin, recordLeave } from './funcs/utils/extras.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const modules = await import('./funcs/exports.js');
const {
    canvas
} = modules.default;


class MessageQueue {
    /**
     * Fila com "pool" de workers: assim que UMA mensagem termina, a próxima já começa.
     * (A versão antiga esperava o lote inteiro terminar — um único comando lento,
     * tipo download de vídeo, travava a resposta de todas as outras mensagens.)
     */
    constructor(maxWorkers = 20, slotTimeoutMs = 90_000) {
        this.queue = [];
        this.maxWorkers = maxWorkers;
        this.slotTimeoutMs = slotTimeoutMs;
        this.activeWorkers = 0;
        this.paused = false;
        this.errorHandler = null;
        this.batchSize = maxWorkers;
        this.messagesPerBatch = 1;
        this.stats = {
            totalProcessed: 0,
            totalErrors: 0,
            currentQueueLength: 0,
            startTime: Date.now(),
            batchesProcessed: 0,
            avgBatchTime: 0,
            slowMessages: 0
        };
        this.idCounter = 0;
    }

    get isProcessing() {
        return this.activeWorkers > 0;
    }

    setErrorHandler(handler) {
        this.errorHandler = handler;
    }

    add(message, processor) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                message,
                processor,
                resolve,
                reject,
                timestamp: Date.now(),
                id: `msg_${++this.idCounter}_${Date.now()}`
            });
            this.stats.currentQueueLength = this.queue.length;
            this.pump();
        });
    }

    pump() {
        while (!this.paused && this.activeWorkers < this.maxWorkers && this.queue.length > 0) {
            const item = this.queue.shift();
            this.stats.currentQueueLength = this.queue.length;
            this.runItem(item);
        }
    }

    runItem(item) {
        this.activeWorkers++;
        const started = Date.now();
        let released = false;
        const release = () => {
            if (released) return;
            released = true;
            this.activeWorkers--;
            const dur = Date.now() - started;
            this.stats.batchesProcessed++;
            this.stats.avgBatchTime += (dur - this.stats.avgBatchTime) / this.stats.batchesProcessed;
            this.pump();
        };

        // Se um comando demorar demais, libera a vaga para não travar a fila
        const slotTimer = setTimeout(() => {
            this.stats.slowMessages++;
            if (DEBUG_MODE) console.warn(`⏳ Mensagem ${item.id} demorando mais de ${this.slotTimeoutMs / 1000}s — liberando vaga na fila.`);
            release();
        }, this.slotTimeoutMs);

        Promise.resolve()
            .then(() => item.processor(item.message))
            .then((result) => {
                this.stats.totalProcessed++;
                item.resolve(result);
            })
            .catch((error) => this.handleProcessingError(item, error))
            .finally(() => {
                clearTimeout(slotTimer);
                release();
            });
    }

    async handleProcessingError(item, error) {
        this.stats.totalErrors++;
        console.error(`❌ Erro ao processar mensagem ${item.id}:`, error?.message || error);
        if (this.errorHandler) {
            try {
                await this.errorHandler(item, error);
            } catch (handlerError) {
                console.error('❌ Error handler failed:', handlerError.message);
            }
        }
        item.reject(error);
    }

    pause() {
        this.paused = true;
    }

    resume() {
        if (this.paused) {
            console.log('[MessageQueue] Retomando processamento');
            this.paused = false;
            this.pump();
        }
    }

    startProcessing() {
        this.resume();
        this.pump();
    }

    stopProcessing() {
        this.paused = true;
    }

    getStatus() {
        const uptime = Date.now() - this.stats.startTime;
        return {
            queueLength: this.queue.length,
            activeWorkers: this.activeWorkers,
            maxWorkers: this.maxWorkers,
            batchSize: this.batchSize,
            messagesPerBatch: this.messagesPerBatch,
            isProcessing: this.isProcessing,
            paused: this.paused,
            totalProcessed: this.stats.totalProcessed,
            totalErrors: this.stats.totalErrors,
            currentQueueLength: this.queue.length,
            batchesProcessed: this.stats.batchesProcessed,
            avgBatchTime: Math.round(this.stats.avgBatchTime),
            slowMessages: this.stats.slowMessages,
            uptime,
            uptimeFormatted: this.formatUptime(uptime),
            throughput: this.stats.totalProcessed > 0 ?
                (this.stats.totalProcessed / (uptime / 1000)).toFixed(2) : 0,
            errorRate: this.stats.totalProcessed > 0 ?
                ((this.stats.totalErrors / this.stats.totalProcessed) * 100).toFixed(2) : 0
        };
    }

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    clear() {
        this.queue.forEach(item => item.reject?.(new Error('Queue cleared')));
        this.queue = [];
        this.stats.currentQueueLength = 0;
    }

    async shutdown() {
        console.log('🛑 Finalizando MessageQueue...');
        this.paused = true;
        const startTime = Date.now();
        while (this.activeWorkers > 0 && (Date.now() - startTime) < 10000) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (this.activeWorkers > 0) {
            console.warn(`⚠️ ${this.activeWorkers} workers ainda ativos após timeout de shutdown`);
        }
        this.clear();
        console.log('✅ MessageQueue finalizado');
    }
}

const messageQueue = new MessageQueue(20, 90_000);
// estatísticas para o comando !status
global.__astaQueue = messageQueue;
global.__astaStats = global.__astaStats || { startedAt: Date.now(), connectedAt: null, reconnects: 0, lastDisconnect: null };

// ===== BACKUP DIÁRIO DA SESSÃO (guarda as 3 últimas cópias da pasta qr-code) =====
let sessionBackupTimer = null;
async function backupSessionFolder() {
    try {
        const srcDir = path.join(__dirname, '..', 'database', 'qr-code');
        const baseDir = path.join(__dirname, '..', 'database', 'backups-sessao');
        const credsOk = await fs.stat(path.join(srcDir, 'creds.json')).then(st => st.size > 0).catch(() => false);
        if (!credsOk) return;
        const d = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD
        const dest = path.join(baseDir, `qr-code-${d}`);
        await fs.mkdir(baseDir, { recursive: true });
        const exists = await fs.stat(dest).then(() => true).catch(() => false);
        if (!exists) {
            await fs.cp(srcDir, dest, { recursive: true });
            console.log(`💾 Backup da sessão salvo: database/backups-sessao/qr-code-${d}`);
        }
        const all = (await fs.readdir(baseDir)).filter(n => n.startsWith('qr-code-')).sort();
        for (const old of all.slice(0, Math.max(0, all.length - 3))) {
            await fs.rm(path.join(baseDir, old), { recursive: true, force: true });
        }
    } catch (e) {
        console.error('⚠️ Falha no backup da sessão:', e.message);
    }
}
// ===== REINÍCIO AUTOMÁTICO: quando um arquivo .js do bot é alterado, reinicia para aplicar =====
let codeWatcherStarted = false;
function startCodeWatcher() {
    if (codeWatcherStarted) return;
    codeWatcherStarted = true;
    const srcDir = __dirname; // dados/src
    const ignorar = /(^|[\\/])(node_modules|database|tmp|temp|midias)([\\/]|$)|\.(bak|tmp|log)$/i;
    const alterados = new Set();
    let timer = null;
    const lerAutoReload = () => {
        try {
            const cfg = JSON.parse(fsSync.readFileSync(path.join(srcDir, 'config.json'), 'utf-8'));
            return cfg.autoReload !== false;
        } catch { return true; }
    };
    try {
        fsSync.watch(srcDir, { recursive: true }, (evento, arquivo) => {
            if (!arquivo) return;
            if (global.__astaUpdating) return; // o !atualizar reinicia sozinho no final
            const nome = String(arquivo);
            if (!/\.(m?js|cjs)$/i.test(nome) || ignorar.test(nome)) return;
            alterados.add(nome);
            clearTimeout(timer);
            // espera 3s sem novas alterações (extrair um zip mexe em vários arquivos de uma vez)
            timer = setTimeout(() => {
                if (global.__astaUpdating || global.__astaUpdateRestarting) { alterados.clear(); return; }
                if (!lerAutoReload()) {
                    console.log(`♻️ Arquivos alterados (${[...alterados].join(', ')}), mas o reinício automático está desligado (!autoreload on).`);
                    alterados.clear();
                    return;
                }
                console.log(`\n♻️ Arquivos do bot alterados: ${[...alterados].slice(0, 8).join(', ')}${alterados.size > 8 ? ` e mais ${alterados.size - 8}` : ''}`);
                console.log('♻️ Reiniciando para aplicar as novas funções...\n');
                try { messageQueue.pause?.(); } catch { }
                setTimeout(() => process.exit(0), 1500);
            }, 3000);
        });
        console.log('👀 Reinício automático ativo: alterações nos arquivos do bot reiniciam sozinhas.');
    } catch (e) {
        console.warn('⚠️ Não foi possível vigiar os arquivos do bot:', e.message);
    }
}

function startSessionBackups() {
    if (sessionBackupTimer) return;
    setTimeout(backupSessionFolder, 2 * 60_000);          // 2 min depois de conectar
    sessionBackupTimer = setInterval(backupSessionFolder, 3 * 60 * 60_000); // confere a cada 3h (1 cópia por dia)
}
 

const configPath = path.join(__dirname, "config.json");
let config;
let DEBUG_MODE = false; 



global.CAPTCHA_LOCK = global.CAPTCHA_LOCK || new Set();


try {
    const configContent = readFileSync(configPath, "utf8");
    config = JSON.parse(configContent);


    if (!config.prefixo || !config.nomebot || !config.numerodono) {
        throw new Error('Configuração inválida: campos obrigatórios ausentes (prefixo, nomebot, numerodono)');
    }


    DEBUG_MODE = config.debug === true || process.env.NAZUNA_DEBUG === '1';
    if (DEBUG_MODE) {
        console.log('🐛 Modo DEBUG ativado - Logs detalhados habilitados');
    }
} catch (err) {
    console.error(`❌ Erro ao carregar configuração: ${err.message}`);
    process.exit(1);
}

const indexModule = (await import('./index.js')).default ?? (await import('./index.js'));

const performanceOptimizer = new PerformanceOptimizer();

const {
    prefixo,
    nomebot,
    nomedono,
    numerodono
} = config;

const rentalExpirationManager = new RentalExpirationManager(null, {
    ownerNumber: numerodono,
    ownerName: nomedono,
    checkInterval: '0 */6 * * *',
    warningDays: 3,
    finalWarningDays: 1,
    cleanupDelayHours: 24,
    enableNotifications: true,
    enableAutoCleanup: true,
    logFile: path.join(__dirname, '../logs/rental_expiration.log')
});

const logger = pino({
    level: 'silent'
});

const AUTH_DIR = path.join(__dirname, '..', 'database', 'qr-code');
const DATABASE_DIR = path.join(__dirname, '..', 'database');
const GLOBAL_BLACKLIST_PATH = path.join(__dirname, '..', 'database', 'dono', 'globalBlacklist.json');

 let _globalBlacklistCache = null;
let _globalBlacklistCacheTime = 0;
const GLOBAL_BLACKLIST_TTL_MS = 60_000;

// ===================== CACHES (vivem durante todo o processo) =====================
// Criados ANTES do socket para o Baileys conseguir usá-los desde a primeira conexão
// e para sobreviverem às reconexões (antes eram recriados só depois de conectar).
const msgRetryCounterCache = new NodeCache({ stdTTL: 10 * 60, useClones: false });
const groupMetadataCache = new NodeCache({ stdTTL: 5 * 60, useClones: false, checkperiod: 120 });
const messagesCache = new Map();
const MESSAGES_CACHE_LIMIT = 3000;

// Socket ativo no momento (sempre o mais novo). index.js usa global.__nazunaSock
// para que tarefas agendadas não fiquem presas num socket antigo já fechado.
let currentSock = null;
let sockGeneration = 0;

const isSockOpen = (sock) => {
    try {
        return !!sock && sock === currentSock && sock.ws?.isOpen !== false && !!sock.user;
    } catch {
        return false;
    }
};
global.__nazunaIsOpen = () => isSockOpen(currentSock);

let optimizedCachesInitialized = false;
async function initializeOptimizedCaches() {
    if (optimizedCachesInitialized) return;
    optimizedCachesInitialized = true;
    try {
        await performanceOptimizer.initialize();
    } catch (error) {
        console.error('❌ Erro ao inicializar sistema de otimização:', error.message);
    }
    try {
        const requestCaptchaMsg = async (dataCaptcha) => {
            const sock = currentSock;
            if (!isSockOpen(sock)) return;
            await sock.sendMessage(dataCaptcha.groupId, { text: `⚠️ @${dataCaptcha.idOrigin.split('@')[0]} não resolveu o captcha a tempo e foi removido.`, mentions: [dataCaptcha.idOrigin] });
            await sock.groupParticipantsUpdate(dataCaptcha.groupId, [dataCaptcha.idOrigin], 'remove').catch(() => { });
        };
        await initCaptchaIndex(requestCaptchaMsg);
    } catch (error) {
        console.error('❌ Erro ao iniciar captcha:', error.message);
    }
}
const codeMode = process.argv.includes('--code') || process.env.NAZUNA_CODE_MODE === '1';


let cacheCleanupInterval = null;
const setupMessagesCacheCleanup = () => {
    if (cacheCleanupInterval) clearInterval(cacheCleanupInterval);

    cacheCleanupInterval = setInterval(() => {
        if (!messagesCache || messagesCache.size <= MESSAGES_CACHE_LIMIT) return;

        const keysToDelete = Math.floor(messagesCache.size * 0.4); 
        const keys = Array.from(messagesCache.keys()).slice(0, keysToDelete);
        keys.forEach(key => messagesCache.delete(key));

        if (DEBUG_MODE) console.log(`🧹 Cache limpo: ${keysToDelete} mensagens removidas (total: ${messagesCache.size})`);
    }, 300000); // A cada 5 minutos
};


const startCacheCleanup = () => {
    setupMessagesCacheCleanup();
};

const ask = (question) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
    }));
};

async function clearAuthDir(dirToRemove = AUTH_DIR) {

    try {
        const normalized = path.resolve(dirToRemove);


        const rootPath = path.parse(normalized).root;
        if (normalized === rootPath) {
            console.error(`❌ Abortando limpeza: caminho inválido (${normalized})`);
            return;
        }

        const normalizedParts = normalized.split(path.sep).filter(Boolean);
        const looksLikeAuthDir = normalizedParts.includes('qr-code') || normalizedParts.includes('auth');
        if (!looksLikeAuthDir) {
            console.error(`❌ Abortando limpeza: caminho não parece diretório de auth/qr-code (${normalized})`);
            return;
        }

        // guarda uma cópia antes de apagar (dados/database/qr-code-backup/AAAA-MM-DD_HH-MM-SS)
        try {
            const bkRoot = path.join(path.dirname(normalized), 'qr-code-backup');
            const stamp = new Date(Date.now() - 3 * 3600e3).toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19);
            if (fsSync.existsSync(normalized) && typeof fs.cp === 'function') {
                await fs.mkdir(bkRoot, { recursive: true });
                await fs.cp(normalized, path.join(bkRoot, stamp), { recursive: true });
                const antigos = (await fs.readdir(bkRoot)).sort();
                for (const velho of antigos.slice(0, Math.max(0, antigos.length - 3))) await fs.rm(path.join(bkRoot, velho), { recursive: true, force: true }).catch(() => { });
                console.log(`💾 Cópia da sessão guardada em ${path.join(bkRoot, stamp)}`);
            }
        } catch (bkErr) { console.log('⚠️ Não consegui copiar a sessão antes de apagar:', bkErr.message); }

        if (typeof fs.rm === 'function') {
            await fs.rm(normalized, { recursive: true, force: true });
        } else if (typeof fs.rmdir === 'function') {

            await fs.rmdir(normalized, { recursive: true }).catch(() => { });
        } else {
            throw new Error('API de remoção de diretório não disponível (fs.rm/fs.rmdir)');
        }

        console.log(`🗑️ Pasta de autenticação (${normalized}) excluída com sucesso.`);
    } catch (err) {
        console.error(`❌ Erro ao excluir pasta de autenticação (${dirToRemove}): ${err.message}`);
    }
}

async function loadGroupSettings(groupId) {
    const groupFilePath = path.join(DATABASE_DIR, 'grupos', `${groupId}.json`);
    try {
        const data = await fs.readFile(groupFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        // grupo sem arquivo de configuração = grupo que ainda não mudou nada (normal) → usa o padrão sem avisar
        if (e.code !== 'ENOENT') console.error(`❌ Erro ao ler configurações do grupo ${groupId}: ${e.message}`);
        return {};
    }
}

async function loadGlobalBlacklist() {

    const now = Date.now();
    if (_globalBlacklistCache !== null && (now - _globalBlacklistCacheTime) < GLOBAL_BLACKLIST_TTL_MS) {
        return _globalBlacklistCache;
    }
    try {
        const data = await fs.readFile(GLOBAL_BLACKLIST_PATH, 'utf-8');
        _globalBlacklistCache = JSON.parse(data).users || {};
        _globalBlacklistCacheTime = now;
        return _globalBlacklistCache;
    } catch (e) {
        console.error(`❌ Erro ao ler blacklist global: ${e.message}`);

        return _globalBlacklistCache ?? {};
    }
}

function formatMessageText(template, replacements) {
    let text = template;
    for (const [key, value] of Object.entries(replacements)) {
        text = text.replaceAll(key, value);
    }
    return text;
}


async function createGroupMessage(NazunaSock, groupMetadata, participants, settings, isWelcome = true) {
  const globalJson = JSON.parse(
    await fs.readFile(DATABASE_DIR + '/global.json', 'utf-8')
  );

  const mentions = participants.map(p => p);

  const replacements = {
    '#numerodele#': participants.map(p => `@${p.split('@')[0]}`).join(', '),
    '#nomedogp#': groupMetadata.subject,
    '#desc#': groupMetadata.desc || 'Nenhuma',
    '#membros#': groupMetadata.participants.length,
  };

  const defaultText = isWelcome
    ? (globalJson.textbv || "╭━━━⊱ 🌟 *BEM-VINDO(A/S)!* 🌟 ⊱━━━╮\n│\n│ 👤 #numerodele#\n│\n│ 🏠 Grupo: *#nomedogp#*\n│ 👥 Membros: *#membros#*\n│\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n✨ *Seja bem-vindo(a/s) ao grupo!* ✨")
    : (globalJson.exit?.text || "╭━━━⊱ 👋 *ATÉ LOGO!* 👋 ⊱━━━╮\n│\n│ 👤 #numerodele#\n│\n│ 🚪 Saiu do grupo\n│ *#nomedogp#*\n│\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n💫 *Até a próxima!* 💫");


  const chosenText = settings.textbv || defaultText;
  const text = formatMessageText(chosenText, replacements);

  const message = {
    text,
    mentions
  };

  if (settings.photo === false) {

  } else if (settings.photoType === 'api') {

    let profilePicUrl = 'https://raw.githubusercontent.com/nazuninha/uploads/main/outros/1747053564257_bzswae.bin';

    if (participants.length === 1) {
      profilePicUrl = await NazunaSock.profilePictureUrl(participants[0], 'image')
        .catch(() => profilePicUrl);
    }

    const nome = participants.length === 1
      ? participants[0].split('@')[0]
      : `${participants.length} membros`;

    const cardTitle = isWelcome ? 'Bem vindo (a)!' : 'Até logo!';

    const result = await canvas.gerarwelcomecard(
      profilePicUrl,
      nome,
      cardTitle,
      globalJson.welcomecard?.fundo || null,
      globalJson.welcomecard?.corMoldura || null,
      globalJson.welcomecard?.corLinhas || null,
      false
    );

    if (result?.ok) {
      message.image = { url: result.url };
      message.caption = text;
      delete message.text;
    }
  } else if (settings.photoType === 'custom' && settings.image) {
    message.image = { url: settings.image };
    message.caption = text;
    delete message.text;
  } else if (globalJson.welcomecard?.fundo) {
    message.image = { url: globalJson.welcomecard.fundo };
    message.caption = text;
    delete message.text;
  }

  return message;
}





async function handleGroupParticipantsUpdate(NazunaSock, inf) {
    try {
        const from = inf.id || inf.jid || (inf.participants?.length
            ? inf.participants[0].split('@')[0] + '@s.whatsapp.net'
            : null);

        if (DEBUG_MODE) {
            console.log('🐛 [EVENTO]');
            console.log('📌 Grupo:', from);
            console.log('📌 Ação:', inf.action);
        }

        if (!from) return;
        if (!inf.participants?.length) return;

        const botId = NazunaSock.user.id.split(':')[0];

        inf.participants = inf.participants.map(isValidParticipant).filter(Boolean);
        if (inf.participants.some(p => p.startsWith(botId))) return;

        const groupMetadata = await NazunaSock.groupMetadata(from).catch(() => null);
        if (!groupMetadata) return;

        const groupSettings = await loadGroupSettings(from);
        
        
        const globalBlacklist = await loadGlobalBlacklist();
        const captchaData = await loadCaptchaJson();

        switch (inf.action) {


            case 'add': {
                global.CAPTCHA_LOCK = global.CAPTCHA_LOCK || new Set();

                const membersToWelcome = [];
                const membersToWelcome2 = [];
                const membersToRemove = [];
                const removalReasons = [];

const entradaPorLink = !inf.author || inf.participants.includes(inf.author);


if (groupSettings?.x9 && inf.author && !entradaPorLink) {

    const autor = inf.author.split('@')[0];

    for (const membro of inf.participants) {

        const membroNum = membro.split('@')[0];

        await NazunaSock.sendMessage(from, {
            text: `✅ @${autor} aprovou a entrada de
👤 @${membroNum}`,
            mentions: [inf.author, membro]
        }).catch(() => {});
    }
}

                for (const participant of inf.participants) {

                    const userId = participant.split('@')[0];


                    if (globalBlacklist?.[participant]) {
                        membersToRemove.push(participant);
                        removalReasons.push(`@${userId} (blacklist global)`);
                        continue;
                    }


                    if (groupSettings.blacklist?.[participant]) {
                        membersToRemove.push(participant);
                        removalReasons.push(`@${userId} (blacklist grupo)`);
                        continue;
                    }


                    const participantStripped = participant.replace(/@.*/, '');
                    let participantNumber = participantStripped;

                    let isLid = false;

                    if (participant.endsWith('@lid')) {
                        isLid = true;
                        try {
                            const resolved = await NazunaSock.onWhatsApp(participant);
                            if (resolved?.[0]?.jid) {
                                participantNumber = resolved[0].jid.replace(/@.*/, '');

                            }
                        } catch { }
                    }




                    const hasCaptchaJson = Object.values(captchaData).find(c => {
                        const lid = c.lid?.replace(/@.*/, '');
                        const id = c.id?.replace(/@.*/, '');
                        const idOrigin = c.idOrigin?.replace(/@.*/, '');

                        return (
                            lid === participantStripped ||
                            id === participantStripped ||
                            id === participantNumber ||
                            idOrigin === participantStripped ||
                            idOrigin === participantNumber
                        );
                    });


                    const hasCaptchaLock = [...global.CAPTCHA_LOCK].some(x => {
                        const xStripped = x.replace(/@.*/, '');
                        return xStripped === participantNumber;
                    });

                    if (groupSettings.captchaEnabled) {

                        if (hasCaptchaJson || hasCaptchaLock) {

                            continue;
                        }


                        if (!entradaPorLink) {

                            continue;
                        }

                        if (isLid && participantNumber === participantStripped) {

                            continue;
                        }



                        global.CAPTCHA_LOCK.add(`${participantNumber}@s.whatsapp.net`);

                        const typeIds = {
                            id: `${participantNumber}@s.whatsapp.net`,
                            lid: isLid ? participant : '',
                            participant
                        };

                        const num1 = Math.floor(Math.random() * 10) + 1;
                        const num2 = Math.floor(Math.random() * 10) + 1;

                        const answer = num1 + num2;
                        const expiresAt = Date.now() + 5 * 60 * 1000;

                        CaptchaIndex.add(typeIds, from, answer, expiresAt, participantNumber);

                        await NazunaSock.sendMessage(from, {
                            text: `🔐 *VERIFICAÇÃO*\n\nOlá @${participantNumber}\n\n❓ ${num1} + ${num2} = ?\n\n⏱️ 5 minutos.`,
                            mentions: [`${participantNumber}@s.whatsapp.net`]
                        });

                        continue; 
                    }


                    if (groupSettings.bemvindo) {
                        console.log(`✅ Enviando welcome para ${participantNumber}`);
                        membersToWelcome.push(participant);
                    }

                    if (groupSettings.bemvindo2) {
                        console.log(`✅ Enviando welcome2 (sem foto) para ${participantNumber}`);
                        membersToWelcome2.push(participant);
                    }
                }


                if (membersToRemove.length) {
                    await NazunaSock.groupParticipantsUpdate(from, membersToRemove, 'remove');

                    await NazunaSock.sendMessage(from, {
                        text: `🚫 Removidos:\n- ${removalReasons.join('\n- ')}`,
                        mentions: membersToRemove
                    });
                }


                if (membersToWelcome.length) {
                    const message = await createGroupMessage(
                        NazunaSock,
                        groupMetadata,
                        membersToWelcome,
                        { ...(groupSettings.welcome || {}), textbv: groupSettings.textbv }
                    );

                    await NazunaSock.sendMessage(from, message);
                }

                if (membersToWelcome2.length) {
                    const mentions = membersToWelcome2.map(p => p);
                    const replacements = {
                        '#numerodele#': membersToWelcome2.map(p => `@${p.split('@')[0]}`).join(', '),
                        '#nomedogp#': groupMetadata.subject,
                        '#desc#': groupMetadata.desc || 'Nenhuma',
                        '#membros#': groupMetadata.participants.length,
                    };
                    const defaultText2 = "╭━━━⊱ 🌟 *BEM-VINDO(A/S)!* 🌟 ⊱━━━╮\n│\n│ 👤 #numerodele#\n│\n│ 🏠 Grupo: *#nomedogp#*\n│ 👥 Membros: *#membros#*\n│\n╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n✨ *Seja bem-vindo(a/s) ao grupo!* ✨";
                    const chosenText2 = groupSettings.textbv2 || defaultText2;
                    const text2 = formatMessageText(chosenText2, replacements);
                    await NazunaSock.sendMessage(from, { text: text2, mentions });
                }

                const ficaram = inf.participants.filter(p => !membersToRemove.includes(p));
                if (ficaram.length) recordJoin(from, ficaram.length);

                // ===== BOTÕES NAS BOAS-VINDAS =====
                if (groupSettings.bvBotoes && (membersToWelcome.length || membersToWelcome2.length)) {
                    await sendButtons(NazunaSock, from, {
                        text: '👇 Antes de tudo, dá uma olhada:',
                        footer: groupMetadata.subject || '',
                        buttons: [quickReply('📜 REGRAS', '!regras'), quickReply('📋 MENU', '!menu')]
                    }).catch(err => console.log('⚠️ botões de boas-vindas:', err.message));
                }

                // ===== FIGURINHA (COM SOM) NAS BOAS-VINDAS =====
                if (groupSettings.bvFig && ficaram.length) {
                    try {
                        const baseBv = path.join(__dirname, '..', 'database', 'bvfig', from.replace(/[^0-9a-z@._-]/gi, '_'));
                        const webpBv = fsSync.readFileSync(`${baseBv}.webp`);
                        let metaBv = {};
                        try { metaBv = JSON.parse(fsSync.readFileSync(`${baseBv}.json`, 'utf-8')); } catch { }
                        if (fsSync.existsSync(`${baseBv}.ogg`)) {
                            const { sendSoundSticker } = await import('./funcs/utils/soundSticker.js');
                            await sendSoundSticker(NazunaSock, from, { webp: webpBv, clip: { ogg: fsSync.readFileSync(`${baseBv}.ogg`), seconds: metaBv.seconds || 1, waveform: metaBv.waveform ? Buffer.from(metaBv.waveform, 'base64') : Buffer.alloc(64) } });
                        } else {
                            await NazunaSock.sendMessage(from, { sticker: webpBv });
                        }
                    } catch (err) { console.log('⚠️ figurinha de boas-vindas:', err.message); }
                }

                // ===== CARTÃO DE BOAS-VINDAS EM IMAGEM (!bvcard) =====
                if (groupSettings.bvCard && ficaram.length) {
                    try {
                        const PLUS = await import('./funcs/utils/astaPlus.js');
                        const total = groupMetadata?.participants?.length || ficaram.length;
                        const lista = ficaram.slice(0, 5);
                        for (const [i, p] of lista.entries()) {
                            let foto = null;
                            try { const u = await NazunaSock.profilePictureUrl(p, 'image'); const r = await fetch(u); foto = Buffer.from(await r.arrayBuffer()); } catch { }
                            const part = (groupMetadata?.participants || []).find(x => x.id === p || x.lid === p || x.phoneNumber === p);
                            const pn = String(part?.phoneNumber || (String(p).endsWith('@s.whatsapp.net') ? p : '')).split('@')[0];
                            const nome = pn ? `+${pn}` : 'Novo membro';
                            const img = await PLUS.cartaoBoasVindas({ foto, nome, grupo: groupMetadata?.subject || '', numero: Math.max(1, total - (lista.length - 1 - i)), tema: String(groupSettings.bvCard) });
                            await NazunaSock.sendMessage(from, { image: img, caption: `👋 Bem-vindo(a), @${String(p).split('@')[0]}!\nAgora somos *${Math.max(1, total - (lista.length - 1 - i))}* no grupo *${groupMetadata?.subject || ''}*.`, mentions: [p] });
                        }
                    } catch (err) { console.log('⚠️ cartão de boas-vindas:', err.message); }
                }

                // ===== REGRAS COM ACEITE (!regrasaceite on) =====
                if (groupSettings.regrasAceite && ficaram.length) {
                    try {
                        const PLUS = await import('./funcs/utils/astaPlus.js');
                        const db = PLUS.readJ('regras-aceite.json');
                        db[from] = db[from] || {};
                        for (const p of ficaram) db[from][PLUS.baseNum(p)] = { jid: p, at: Date.now() };
                        PLUS.writeJ('regras-aceite.json', db);
                        const regras = Array.isArray(groupSettings.rules) && groupSettings.rules.length
                            ? groupSettings.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')
                            : '1. Respeite todos os membros.\n2. Nada de spam, golpes ou conteúdo impróprio.\n3. Siga as orientações dos admins.';
                        const pref = (() => { try { return JSON.parse(fsSync.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')).prefixo || '!'; } catch { return '!'; } })();
                        await sendButtons(NazunaSock, from, {
                            text: `📜 *REGRAS DO GRUPO*\n\n${ficaram.map(p => `@${String(p).split('@')[0]}`).join(', ')}, leia antes de conversar:\n\n${regras}\n\n👇 Toque em *✅ LI E ACEITO* para liberar suas mensagens.\n(Até lá, o que você mandar é apagado.)`,
                            footer: groupMetadata?.subject || '',
                            mentions: ficaram,
                            buttons: [quickReply('✅ LI E ACEITO', `${pref}aceitoregras`)]
                        }).catch(() => NazunaSock.sendMessage(from, { text: `📜 Leia as regras e digite *aceito* para liberar suas mensagens.\n\n${regras}`, mentions: ficaram }));
                    } catch (err) { console.log('⚠️ regras com aceite:', err.message); }
                }

                // ===== VERIFICAÇÃO DE NOVATO (botão "Sou humano") =====
                if (groupSettings.verificarNovato && ficaram.length) {
                    const minutos = Math.max(1, Math.min(30, Number(groupSettings.verificarTempo) || 2));
                    global.__astaNovatos = global.__astaNovatos || new Map();
                    for (const novato of ficaram) {
                        const token = Math.random().toString(36).slice(2, 8);
                        const key = `${from}|${token}`;
                        const num = novato.split('@')[0];
                        await sendButtons(NazunaSock, from, {
                            text: `🔐 @${num}, para continuar no grupo toque em *✅ SOU HUMANO* em até *${minutos} min*.`,
                            footer: 'Verificação anti-robô',
                            buttons: [quickReply('✅ SOU HUMANO', `!souhumano ${token}`)],
                            mentions: [novato]
                        }).catch(err => console.log('⚠️ verificação de novato:', err.message));
                        const timer = setTimeout(async () => {
                            if (!global.__astaNovatos.has(key)) return;
                            global.__astaNovatos.delete(key);
                            try {
                                await NazunaSock.groupParticipantsUpdate(from, [novato], 'remove');
                                await NazunaSock.sendMessage(from, { text: `🚫 @${num} não confirmou a verificação a tempo e foi removido.`, mentions: [novato] });
                            } catch (e) {
                                console.log('⚠️ Não consegui remover novato não verificado (sou ADM?):', e.message);
                            }
                        }, minutos * 60_000);
                        global.__astaNovatos.set(key, { group: from, jid: novato, token, timer });
                    }
                }

                break;
            }

            case 'remove': {
                recordLeave(from, inf.participants.length);
                if (groupSettings.exit?.enabled) {
                    const message = await createGroupMessage(
                        NazunaSock,
                        groupMetadata,
                        inf.participants,
                        groupSettings.exit,
                        false
                    );

                    await NazunaSock.sendMessage(from, message)
                        .catch(err => console.log('❌ erro saída:', err.message));
                }
                break;
            }

            case 'promote':
            case 'demote': {

                if (!groupSettings?.x9) return;

                const autor = inf.author || '';

                for (const user of inf.participants) {

                    const userNum = user.split('@')[0];
                    const autorNum = autor ? autor.split('@')[0] : 'desconhecido';

                    const texto =
                        inf.action === 'promote'
                            ? `⬆️ @${userNum} virou ADM por @${autorNum}`
                            : `⬇️ @${userNum} deixou de ser ADM por @${autorNum}`;

                    await NazunaSock.sendMessage(from, {
                        text: texto,
                        mentions: autor ? [user, autor] : [user]
                    }).catch(() => { });
                }

                break;
            }
        }

    } catch (error) {
        console.error('❌ ERRO GERAL:', error);
    }
}






export async function saveGroupSettings(groupId, settings) {
    try {

        const safeId = groupId.replace(/[^a-zA-Z0-9]/g, '_');


        const dirPath = path.join(__dirname, 'database', 'groups');
        const filePath = path.join(dirPath, `${safeId}.json`);


        await fs.mkdir(dirPath, { recursive: true });


        const data = JSON.stringify(settings, null, 2);

        await fs.writeFile(filePath, data, 'utf-8');

        if (global.DEBUG_MODE) {
            console.log(`📝 [Settings] Configurações de ${groupId} atualizadas.`);
        }
    } catch (error) {
        console.error(`❌ Erro ao salvar settings de ${groupId}:`, error);
    }
}
async function handleGroupJoinRequest(NazunaSock, inf) {
    try {
        const typeIds = { id: '', lid: '', participant: '' };
        const from = inf.id;
        let participantJid = inf.participantPn || inf.participant;

        if (!from || !participantJid) return;


        if (typeof participantJid === "object") {
            Object.assign(typeIds, {
                id: participantJid?.pn?.endsWith("s.whatsapp.net") ? participantJid?.pn : '',
                lid: participantJid?.pn?.endsWith("lid") ? participantJid?.pn : participantJid?.lid,
            });
            participantJid = participantJid.pn || participantJid.lid;
        } else {
            typeIds.lid = participantJid.endsWith("lid") ? participantJid : '';
            typeIds.id = participantJid.endsWith("s.whatsapp.net") ? participantJid : '';
        }

        typeIds.participant = participantJid;


        global.CAPTCHA_LOCK.add(participantJid);

        if (typeIds.lid) {
            global.CAPTCHA_LOCK.add(typeIds.lid);

        }
        if (typeIds.id) {
            global.CAPTCHA_LOCK.add(typeIds.id);

        }

        const groupSettings = await loadGroupSettings(from);

if (
    groupSettings?.x9 &&
    (
        inf.action === 'reject' ||
        inf.action === 'rejected'
    )
) {

    const autor = inf.author;

    if (autor) {

        const autorNum = autor.split('@')[0];
        const membroNum = participantJid.split('@')[0];

        await NazunaSock.sendMessage(from, {
            text:
`❌ @${autorNum} recusou a entrada de
👤 @${membroNum}`,
            mentions: [autor, participantJid]
        }).catch(() => {});
    }

    return;
}


        if (groupSettings.autoAcceptRequests) {
            if (DEBUG_MODE) console.log(`[Auto-Accept] Aceitando ${participantJid} no grupo ${from}`);
            await NazunaSock.groupRequestParticipantsUpdate(from, [participantJid], 'approve');
            if (!groupSettings.captchaEnabled) return;
        }


        if (groupSettings.captchaEnabled) {

            const num1 = Math.floor(Math.random() * 10) + 1;
            const num2 = Math.floor(Math.random() * 10) + 1;
            const answer = num1 + num2;
            const timeAt = 5 * 60 * 1000;
            const expiresAt = Date.now() + timeAt;

            const numero = participantJid.split('@')[0];

            const foto = await NazunaSock.profilePictureUrl(participantJid, 'image')
                .catch(() => 'sem foto');

            const waInfo = await NazunaSock.onWhatsApp(participantJid)
                .catch(() => null);

            let nome = inf.participant;
            try {
                nome = await NazunaSock.getName(participantJid);
            } catch { }

            const metadata = await NazunaSock.groupMetadata(from).catch(() => null);
            const participanteMeta = metadata?.participants?.find(p => p.id === participantJid);



            CaptchaIndex.add(typeIds, from, answer, expiresAt, nome);

            await NazunaSock.sendMessage(from, {
                text: `🔐 *VERIFICAÇÃO DE SEGURANÇA*\n\n👋 Olá @${numero}!\n\nPara garantir que você não é um bot, resolva:\n❓ *${num1} + ${num2} = ?*\n\n⏱️ Você tem 5 minutos ou será removido.`,
                mentions: [participantJid]
            });
        }

    } catch (error) {
        console.error(`❌ Erro em handleGroupJoinRequest: ${error.message}`);
    }
}

const isValidJid = (str) => /^\d+@s\.whatsapp\.net$/.test(str);
const isValidLid = (str) => /^[a-zA-Z0-9_]+@lid$/.test(str);
const isValidUserId = (str) => isValidJid(str) || isValidLid(str);

function isValidParticipant(participant) {

    if (typeof participant === 'string') {
        if (participant.trim().length === 0) return false;
        return participant;
    }


    if (participant && typeof participant === 'object' && participant.hasOwnProperty('id')) {
        const id = participant.id;
        if (id === null || id === undefined || id === '') return false;
        if (typeof id === 'string' && id.trim().length === 0) return false;
        if (id === 0) return false;

        return id;
    }

    return false;
}

function collectJidsFromJson(obj, jidsSet = new Set()) {
    if (Array.isArray(obj)) {
        obj.forEach(item => collectJidsFromJson(item, jidsSet));
    } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(value => collectJidsFromJson(value, jidsSet));
    } else if (typeof obj === 'string' && isValidJid(obj)) {
        jidsSet.add(obj);
    }
    return jidsSet;
}

function replaceJidsInJson(obj, jidToLidMap, orphanJidsSet, replacementsCount = { count: 0 }, removalsCount = { count: 0 }) {
    if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            const newItem = replaceJidsInJson(item, jidToLidMap, orphanJidsSet, replacementsCount, removalsCount);
            if (newItem !== item) obj[index] = newItem;
        });
    } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (typeof value === 'string' && isValidJid(value)) {
                if (jidToLidMap.has(value)) {
                    obj[key] = jidToLidMap.get(value);
                    replacementsCount.count++;
                } else if (orphanJidsSet.has(value)) {
                    delete obj[key];
                    removalsCount.count++;
                }
            } else {
                const newValue = replaceJidsInJson(value, jidToLidMap, orphanJidsSet, replacementsCount, removalsCount);
                if (newValue !== value) obj[key] = newValue;
            }
        });
    } else if (typeof obj === 'string' && isValidJid(obj)) {
        if (jidToLidMap.has(obj)) {
            replacementsCount.count++;
            return jidToLidMap.get(obj);
        } else if (orphanJidsSet.has(obj)) {
            removalsCount.count++;
            return null;
        }
    }
    return obj;
}

async function scanForJids(directory) {
    const uniqueJids = new Set();
    const affectedFiles = new Map();
    const jidFiles = new Map();

    const scanFileContent = async (filePath) => {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const jsonObj = JSON.parse(content);
            const fileJids = collectJidsFromJson(jsonObj);
            if (fileJids.size > 0) {
                affectedFiles.set(filePath, Array.from(fileJids));
                fileJids.forEach(jid => uniqueJids.add(jid));
            }
        } catch (parseErr) {
            console.warn(`⚠️ Arquivo ${filePath} não é JSON válido. Usando fallback regex.`);
            const jidPattern = /(\d+@s\.whatsapp\.net)/g;
            const content = await fs.readFile(filePath, 'utf-8');
            let match;
            const fileJids = new Set();
            while ((match = jidPattern.exec(content)) !== null) {
                const jid = match[1];
                uniqueJids.add(jid);
                fileJids.add(jid);
            }
            if (fileJids.size > 0) {
                affectedFiles.set(filePath, Array.from(fileJids));
            }
        }
    };

    const checkAndScanFilename = async (fullPath) => {
        try {
            const basename = path.basename(fullPath, '.json');
            const filenameMatch = basename.match(/(\d+@s\.whatsapp\.net)/);
            if (filenameMatch) {
                const jidFromName = filenameMatch[1];
                if (isValidJid(jidFromName)) {
                    uniqueJids.add(jidFromName);
                    jidFiles.set(jidFromName, fullPath);
                }
            }
            await scanFileContent(fullPath);
        } catch (err) {
            console.error(`Erro ao processar ${fullPath}: ${err.message}`);
        }
    };

    const scanDir = async (dirPath) => {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    await scanDir(fullPath);
                } else if (entry.name.endsWith('.json')) {
                    await checkAndScanFilename(fullPath);
                }
            }
        } catch (err) {
            console.error(`Erro ao escanear diretório ${dirPath}: ${err.message}`);
        }
    };

    await scanDir(directory);

    try {
        await scanFileContent(configPath);
        const configBasename = path.basename(configPath, '.json');
        const filenameMatch = configBasename.match(/(\d+@s\.whatsapp\.net)/);
        if (filenameMatch) {
            const jidFromName = filenameMatch[1];
            if (isValidJid(jidFromName)) {
                uniqueJids.add(jidFromName);
                jidFiles.set(jidFromName, configPath);
            }
        }
    } catch (err) {
        console.error(`Erro ao escanear config.json: ${err.message}`);
    }

    return {
        uniqueJids: Array.from(uniqueJids),
        affectedFiles: Array.from(affectedFiles.entries()),
        jidFiles: Array.from(jidFiles.entries())
    };
}

async function replaceJidsInContent(affectedFiles, jidToLidMap, orphanJidsSet) {
    let totalReplacements = 0;
    let totalRemovals = 0;
    const updatedFiles = [];

    for (const [filePath, jids] of affectedFiles) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            let jsonObj = JSON.parse(content);
            const replacementsCount = { count: 0 };
            const removalsCount = { count: 0 };
            replaceJidsInJson(jsonObj, jidToLidMap, orphanJidsSet, replacementsCount, removalsCount);
            if (replacementsCount.count > 0 || removalsCount.count > 0) {
                const updatedContent = JSON.stringify(jsonObj, null, 2);
                await fs.writeFile(filePath, updatedContent, 'utf-8');
                totalReplacements += replacementsCount.count;
                totalRemovals += removalsCount.count;
                updatedFiles.push(path.basename(filePath));
            }
        } catch (err) {
            console.error(`Erro ao substituir em ${filePath}: ${err.message}`);
        }
    }

    return { totalReplacements, totalRemovals, updatedFiles };
}

async function handleJidFiles(jidFiles, jidToLidMap, orphanJidsSet) {
    let totalReplacements = 0;
    let totalRemovals = 0;
    const updatedFiles = [];
    const renamedFiles = [];
    const deletedFiles = [];

    for (const [jid, oldPath] of jidFiles) {
        if (orphanJidsSet.has(jid)) {
            try {
                await fs.unlink(oldPath);
                deletedFiles.push(path.basename(oldPath));
                totalRemovals++;
                continue;
            } catch (err) {
                console.error(`Erro ao excluir arquivo órfão ${oldPath}: ${err.message}`);
            }
        }

        const lid = jidToLidMap.get(jid);
        if (!lid) {
            continue;
        }

        try {
            const content = await fs.readFile(oldPath, 'utf-8');
            let jsonObj = JSON.parse(content);
            const replacementsCount = { count: 0 };
            const removalsCount = { count: 0 };
            replaceJidsInJson(jsonObj, jidToLidMap, orphanJidsSet, replacementsCount, removalsCount);
            totalReplacements += replacementsCount.count;
            totalRemovals += removalsCount.count;

            const dir = path.dirname(oldPath);
            const newPath = join(dir, `${lid}.json`);

            try {
                await fs.access(newPath);
                continue;
            } catch { }

            const updatedContent = JSON.stringify(jsonObj, null, 2);
            await fs.writeFile(newPath, updatedContent, 'utf-8');
            await fs.unlink(oldPath);

            updatedFiles.push(path.basename(newPath));
            renamedFiles.push({ old: path.basename(oldPath), new: path.basename(newPath) });

        } catch (err) {
            console.error(`Erro ao processar renomeação de ${oldPath}: ${err.message}`);
        }
    }

    return { totalReplacements, totalRemovals, updatedFiles, renamedFiles, deletedFiles };
}

async function fetchLidWithRetry(NazunaSock, jid, maxRetries = 3) {
    if (!jid || !isValidJid(jid)) {
        console.warn(`⚠️ JID inválido fornecido: ${jid}`);
        return null;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await NazunaSock.onWhatsApp(jid);
            if (result && result[0] && result[0].lid) {
                return { jid, lid: result[0].lid };
            }
            return null;
        } catch (err) {
            if (attempt === maxRetries) {
                console.warn(`⚠️ Falha ao buscar LID para ${jid} após ${maxRetries} tentativas`);
            }
        }
        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }
    }
    return null;
}

async function fetchLidsInBatches(NazunaSock, uniqueJids, batchSize = 5) {
    const lidResults = [];
    const jidToLidMap = new Map();
    let successfulFetches = 0;

    for (let i = 0; i < uniqueJids.length; i += batchSize) {
        const batch = uniqueJids.slice(i, i + batchSize);

        const batchPromises = batch.map(jid => fetchLidWithRetry(NazunaSock, jid));
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                const { jid, lid } = result.value;
                lidResults.push({ jid, lid });
                jidToLidMap.set(jid, lid);
                successfulFetches++;
            }
        });

        if (i + batchSize < uniqueJids.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    return { lidResults, jidToLidMap, successfulFetches };
}

async function updateOwnerLid(NazunaSock) {
    const ownerJid = `${numerodono}@s.whatsapp.net`;
    try {
        const result = await fetchLidWithRetry(NazunaSock, ownerJid);
        if (result && result.lid && result.lid !== config.lidowner) {
            config.lidowner = result.lid;
            await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
        }
    } catch (err) {
        console.error(`❌ Erro ao atualizar LID do dono: ${err.message}`);
    }
}

async function performMigration(NazunaSock) {
    let scanResult;
    try {
        scanResult = await scanForJids(DATABASE_DIR);
    } catch (err) {
        console.error(`Erro crítico no scan: ${err.message}`);
        return;
    }

    const { uniqueJids, affectedFiles, jidFiles } = scanResult;

    if (uniqueJids.length === 0) {
        return;
    }

    const { jidToLidMap, successfulFetches } = await fetchLidsInBatches(NazunaSock, uniqueJids);
    const orphanJidsSet = new Set(uniqueJids.filter(jid => !jidToLidMap.has(jid)));

    if (jidToLidMap.size === 0) {
        return;
    }

    let totalReplacements = 0;
    let totalRemovals = 0;
    const allUpdatedFiles = [];

    try {
        const renameResult = await handleJidFiles(jidFiles, jidToLidMap, orphanJidsSet);
        totalReplacements += renameResult.totalReplacements;
        totalRemovals += renameResult.totalRemovals;
        allUpdatedFiles.push(...renameResult.updatedFiles);

        const filteredAffected = affectedFiles.filter(([filePath]) => !jidFiles.some(([, jidPath]) => jidPath === filePath));
        const contentResult = await replaceJidsInContent(filteredAffected, jidToLidMap, orphanJidsSet);
        totalReplacements += contentResult.totalReplacements;
        totalRemovals += contentResult.totalRemovals;
        allUpdatedFiles.push(...contentResult.updatedFiles);
    } catch (processErr) {
        console.error(`Erro no processamento de substituições: ${processErr.message}`);
        return;
    }

}


// ===================== CONEXÃO / RECONEXÃO =====================
let reconnectAttempts = 0;          // falhas ao CRIAR o socket
let consecutiveCloses = 0;          // quedas seguidas sem conseguir abrir
let isStarting = false;
let reconnectTimer = null;
let connectWatchdog = null;
let forbidden403Attempts = 0;
let badSessionAttempts = 0;
let replacedAttempts = 0;
let firstOpenDone = false;
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_BAD_SESSION_ATTEMPTS = 6;
const MAX_REPLACED_ATTEMPTS = 3;
const RECONNECT_DELAY_BASE = 3000;
const RECONNECT_DELAY_MAX = 60000;
const CONNECT_WATCHDOG_MS = 150_000;

// Ignorar mensagens antigas que chegam de uma vez quando o bot liga
// (config.json: "ignorarMsgAntigas": false para desativar, "limiteMsgAntigaSeg": 180)
const IGNORE_OLD_MESSAGES = config.ignorarMsgAntigas !== false;
const OLD_MESSAGE_LIMIT_SEC = Number(config.limiteMsgAntigaSeg) > 0 ? Number(config.limiteMsgAntigaSeg) : 180;

let ownerMsgTimer = null;
let subBotInitTimer = null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const toUnixSeconds = (ts) => {
    if (ts == null) return 0;
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'object') {
        if (typeof ts.toNumber === 'function') return ts.toNumber();
        if (typeof ts.low === 'number') return ts.low >>> 0;
    }
    const n = Number(ts);
    return Number.isFinite(n) ? n : 0;
};

let _cachedWAVersion = null;
async function getWAVersion() {
    if (_cachedWAVersion) return _cachedWAVersion;
    try {
        const result = await Promise.race([
            fetchLatestBaileysVersion(),
            sleep(10_000).then(() => null)
        ]);
        if (Array.isArray(result?.version)) {
            _cachedWAVersion = result.version;
            return _cachedWAVersion;
        }
    } catch { /* usa a versão padrão do Baileys */ }
    return undefined;
}

function backoffDelay(attempt) {
    const base = Math.min(RECONNECT_DELAY_BASE * Math.pow(2, Math.max(0, attempt - 1)), RECONNECT_DELAY_MAX);
    return Math.round(base + Math.random() * 1000);
}

function scheduleReconnect(delayMs) {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        startNazu();
    }, delayMs);
}

function clearConnectWatchdog() {
    if (connectWatchdog) {
        clearTimeout(connectWatchdog);
        connectWatchdog = null;
    }
}

// Fecha um socket antigo de vez (sem disparar nova reconexão)
function destroySock(sock) {
    if (!sock) return;
    try { sock.end(undefined); } catch { }
    try { sock.ev.removeAllListeners(); } catch { }
    try { sock.ws?.close?.(); } catch { }
}

// ---------- Seguir canais: só UMA vez, e não a cada mensagem ----------
const CANAIS_OFICIAIS = [
    '120363423737963555@newsletter',
    '120363420339387200@newsletter',
    '120363238585488726@newsletter'
];
const CANAIS_FILE = path.join(DATABASE_DIR, 'canaisSeguidos.json');
let followChannelsDone = false;
async function followChannelsOnce(sock) {
    if (followChannelsDone) return;
    followChannelsDone = true;
    let estado = {};
    try { estado = JSON.parse(await fs.readFile(CANAIS_FILE, 'utf-8')) || {}; } catch { }
    let mudou = false;
    for (const jid of CANAIS_OFICIAIS) {
        const info = estado[jid] || { ok: false, tentativas: 0 };
        if (info.ok || info.tentativas >= 3) continue;
        if (!isSockOpen(sock)) break;
        try {
            await sock.newsletterFollow(jid);
            info.ok = true;
        } catch (e) {
            info.tentativas = (info.tentativas || 0) + 1;
            if (DEBUG_MODE) console.log(`⚠️ Não foi possível seguir o canal ${jid}: ${e?.message || e}`);
        }
        estado[jid] = info;
        mudou = true;
        await sleep(3000);
    }
    if (mudou) await fs.writeFile(CANAIS_FILE, JSON.stringify(estado, null, 2)).catch(() => { });
}

async function createBotSocket(authDir) {
    await fs.mkdir(path.join(DATABASE_DIR, 'grupos'), { recursive: true });
    await fs.mkdir(authDir, { recursive: true });

    const { state, saveCreds, backupCreds } = await useSafeMultiFileAuthState(authDir);

    const version = await getWAVersion();
    if (version) console.log(`📱 Usando versão do WhatsApp: ${version.join('.')}`);

    const myGeneration = ++sockGeneration;

    const NazunaSock = makeWASocket({
        ...(version ? { version } : {}),
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 25_000,
        defaultQueryTimeoutMs: 60_000,
        retryRequestDelayMs: 2_000,
        qrTimeout: 60_000,
        maxMsgRetryCount: 5,
        msgRetryCounterCache,
        shouldIgnoreJid: (jid) =>
            isJidBroadcast(jid) || isJidStatusBroadcast(jid) || isJidNewsletter(jid),
        // Baileys usa isso para reenviar mensagens que falharam ao descriptografar
        getMessage: async (key) => {
            const cached = messagesCache.get(`${key.remoteJid}_${key.id}`);
            return cached?.__rawMessage || cached?.message || undefined;
        },
        // Evita buscar os dados do grupo no WhatsApp a cada mensagem enviada
        cachedGroupMetadata: async (jid) => groupMetadataCache.get(jid)
    });

    currentSock = NazunaSock;
    global.__nazunaSock = NazunaSock;
    const isCurrent = () => myGeneration === sockGeneration;

    // ===== VISUALIZAÇÃO ÚNICA: pede o arquivo ao celular principal =====
    // O WhatsApp manda para aparelhos conectados (o bot) só um aviso "<unavailable type=view_once>",
    // e o Baileys 7 descarta esse aviso sem pedir nada. Aqui o bot pede a mensagem completa ao
    // celular principal (o mesmo pedido que o WhatsApp usa para mensagens que não chegaram).
    // Se o celular responder, a mensagem chega normal no messages.upsert e o .s / !revelar funcionam.
    try {
        const voAsked = new Map();
        NazunaSock.ws.on('CB:message', (node) => {
            try {
                if (!isCurrent() || !node?.attrs?.id) return;
                const kids = Array.isArray(node.content) ? node.content : [];
                // diagnóstico do !soundinfo: guarda o "envelope" das figurinhas recebidas (tipo de mídia declarado etc.)
                const encs = kids.filter((c) => c?.tag === 'enc');
                if (encs.some((c) => /sticker/i.test(String(c?.attrs?.mediatype || '')))) {
                    if (!global.__astaStickerNodes) global.__astaStickerNodes = new Map();
                    const sn = global.__astaStickerNodes;
                    sn.set(node.attrs.id, { attrs: { ...node.attrs }, enc: encs.map((c) => ({ ...c.attrs })), outros: kids.filter((c) => c?.tag !== 'enc').map((c) => ({ tag: c.tag, attrs: { ...(c.attrs || {}) } })) });
                    if (sn.size > 60) sn.delete(sn.keys().next().value);
                }
                const unav = kids.find((c) => c?.tag === 'unavailable');
                const tipo = String(unav?.attrs?.type || '');
                if (!unav || !/view_once/.test(tipo)) return;
                const id = node.attrs.id;
                if (voAsked.has(id)) return;
                voAsked.set(id, Date.now());
                if (voAsked.size > 300) for (const [k, t] of voAsked) { if (Date.now() - t > 3600_000 || voAsked.size > 200) voAsked.delete(k); else break; }
                const from = node.attrs.from;
                const isGroup = String(from || '').endsWith('@g.us');
                const key = { remoteJid: from, fromMe: false, id, ...(isGroup && node.attrs.participant ? { participant: node.attrs.participant } : {}) };
                const msgData = { key: { ...key }, messageTimestamp: Number(node.attrs.t) || Math.floor(Date.now() / 1000), pushName: node.attrs.notify };
                console.log(`[VISU ÚNICA] ${node.attrs.notify || ''}: chegou só o aviso (${tipo}) — pedindo o arquivo ao celular principal...`);
                if (typeof NazunaSock.requestPlaceholderResend !== 'function') {
                    console.log('[VISU ÚNICA] Esta versão do Baileys não permite pedir ao celular.');
                    return;
                }
                // espera o Baileys terminar de processar o aviso e então pede
                setTimeout(() => {
                    NazunaSock.requestPlaceholderResend(key, msgData)
                        .then((r) => { if (r && r !== 'RESOLVED') console.log(`[VISU ÚNICA] pedido enviado ao celular (${id}). Aguardando resposta...`); })
                        .catch((e) => console.log('[VISU ÚNICA] não consegui pedir ao celular:', e?.message || e));
                }, 1500);
            } catch (e) { console.log('[VISU ÚNICA] erro ao tratar aviso:', e?.message || e); }
        });
    } catch (e) { console.log('[VISU ÚNICA] não consegui ativar o pedido ao celular:', e?.message || e); }

    // groupMetadata com cache + junta pedidos simultâneos do mesmo grupo
    const originalGroupMetadata = NazunaSock.groupMetadata;
    const inflightGroupMeta = new Map();
    NazunaSock.groupMetadata = async (jid, ...rest) => {
        const cached = groupMetadataCache.get(jid);
        if (cached) return cached;
        if (inflightGroupMeta.has(jid)) return inflightGroupMeta.get(jid);
        const p = originalGroupMetadata(jid, ...rest)
            .then(meta => {
                if (meta) groupMetadataCache.set(jid, meta);
                return meta;
            })
            .finally(() => inflightGroupMeta.delete(jid));
        inflightGroupMeta.set(jid, p);
        return p;
    };

    NazunaSock.ev.on('creds.update', saveCreds);

    if (codeMode && !NazunaSock.authState.creds.registered) {
        console.log('📱 Insira o número de telefone (com código de país, ex: +5511912345678 ou +554112345678): ');
        let phoneNumber = await ask('--> ');
        phoneNumber = phoneNumber.replace(/\D/g, '');
        if (!/^\d{10,15}$/.test(phoneNumber)) {
            console.log('⚠️ Número inválido! Use um número válido com código de país (ex: 551199999999).');
            process.exit(1);
        }
        const rawCode = await NazunaSock.requestPairingCode(phoneNumber);
        const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
        console.log(`🔑 Código de pareamento: ${formattedCode}`);
        console.log('📲 Envie este código no WhatsApp para autenticar o bot.');
    }

    // Se ficar "conectando" para sempre (acontece em hospedagem), força nova tentativa
    clearConnectWatchdog();
    if (NazunaSock.authState.creds.registered) {
        connectWatchdog = setTimeout(() => {
            if (!isCurrent()) return;
            console.log('⏱️ A conexão não abriu a tempo. Tentando de novo...');
            destroySock(NazunaSock);
            scheduleReconnect(2000);
        }, CONNECT_WATCHDOG_MS);
    }

        NazunaSock.ev.on('groups.update', async (updates) => {
            if (!isCurrent()) return;
            if (!Array.isArray(updates) || updates.length === 0) return;
            for (const u of updates) if (u?.id) groupMetadataCache.del(u.id);

            if (DEBUG_MODE) {
                console.log('\n🐛 ========== GROUPS UPDATE ==========');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('📊 Number of updates:', updates.length);

                updates.forEach((update, index) => {
                    console.log(`\n--- Update ${index + 1} ---`);
                    console.log('📦 Update data:', JSON.stringify(update, null, 2));
                });

                console.log('🐛 ====================================\n');
            }

            const updatePromises = updates.map(async (ev) => {
                if (!ev || !ev.id) return;

                try {
                    const groupId = ev.id;


                    const groupData = await loadGroupSettings(groupId).catch(() => null);

                    if (!groupData?.x9) return; 

                    let mensagem = null;


                    if (ev.imgUrl || ev.picUrl) {
                        mensagem = `📸 *X9 Report:* A foto do grupo foi alterada!`;
                        console.log('[DEBUG] Foto alterada detectada');
                    }


                    else if (ev.subject) {
                        mensagem = `📝 *X9 Report:* Nome do grupo alterado para:\n*${ev.subject}*`;
                        console.log('[DEBUG] Nome alterado:', ev.subject);
                    }


                    else if (ev.desc) {
                        mensagem = `📜 *X9 Report:* Descrição do grupo foi alterada!`;
                        console.log('[DEBUG] Descrição alterada');
                    }

                    if (mensagem) {
                        await NazunaSock.sendMessage(groupId, {
                            text: mensagem
                        }).catch(err => {
                            console.error(`❌ Erro ao enviar X9: ${err.message}`);
                        });
                    }


                    if (DEBUG_MODE) {
                        const meta = await NazunaSock.groupMetadata(groupId).catch(() => null);
                        if (meta) {
                            console.log('🐛 Metadata atualizado para:', groupId);
                        }
                    }

                } catch (e) {
                   
                }
            });

            await Promise.allSettled(updatePromises);
        });



        NazunaSock.ev.on('group.join-request', async (inf) => {
            if (!isCurrent()) return;
            if (DEBUG_MODE) {
                console.log('\n🐛 ========== GROUP JOIN REQUEST ==========');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('🆔 Group ID:', inf.id);
                console.log('⚡ Action:', inf.action);
                console.log('👤 Participant:', inf.participant);
                console.log('📱 Participant Phone:', inf.participantPn);
                console.log('👮 Author:', inf.author);
                console.log('📝 Method:', inf.method);
                console.log('📦 Full event data:', JSON.stringify(inf, null, 2));
                console.log('🐛 ===========================================\n');
            }
            await handleGroupJoinRequest(NazunaSock, inf);
        });



        NazunaSock.ev.on('group-participants.update', async (inf) => {
            if (!isCurrent()) return;
            if (inf?.id) groupMetadataCache.del(inf.id);
            if (DEBUG_MODE) {
                console.log('\n🐛 ========== GROUP PARTICIPANTS UPDATE ==========');
                console.log('📅 Timestamp:', new Date().toISOString());
                console.log('🆔 Group ID:', inf.id || inf.jid || 'unknown');
                console.log('⚡ Action:', inf.action);
                console.log('👥 Participants:', inf.participants);
                console.log('� Author:', inf.author || 'N/A');
                console.log('�📦 Full event data:', JSON.stringify(inf, null, 2));
                console.log('🐛 ================================================\n');
            }
            await handleGroupParticipantsUpdate(NazunaSock, inf);
        });

        let messagesListenerAttached = false;

        const queueErrorHandler = async (item, error) => {
            if (error?.message?.includes('ENOSPC') || error?.message?.includes('ENOMEM')) {
                console.error('🚨 Critical system error detected, triggering emergency cleanup...');
                try {
                    await performanceOptimizer.emergencyCleanup();
                } catch (cleanupErr) {
                    console.error('❌ Emergency cleanup failed:', cleanupErr.message);
                }
            }
            if (DEBUG_MODE) {
                console.error({
                    messageId: item.id,
                    errorType: error?.constructor?.name,
                    errorMessage: error?.message,
                    stack: error?.stack,
                    queueStatus: messageQueue.getStatus()
                });
            }
        };

        messageQueue.setErrorHandler(queueErrorHandler);

        const processMessage = async (info) => {
            if (!isCurrent()) return;

            const isJoinRequest = info?.messageStubType === 172;
            if (isJoinRequest) {
                info.message = {
                    messageStubType: info.messageStubType,
                    messageStubParameters: info.messageStubParameters
                };
            }

            if (!info || !info.message || !info.key?.remoteJid) {
                return;
            }

            if (typeof indexModule === 'function') {
                await indexModule(NazunaSock, info, null, messagesCache, rentalExpirationManager);
            } else {
                throw new Error('Módulo index.js não é uma função válida. Verifique o arquivo index.js.');
            }
        };

        const attachMessagesListener = () => {
            if (messagesListenerAttached) return;
            messagesListenerAttached = true;

            NazunaSock.ev.on('messages.upsert', async (m) => {
                if (!isCurrent()) return;
                if (!m.messages || !Array.isArray(m.messages)) return;

                // guarda TODAS as mensagens (inclusive as do bot) para o getMessage/reenvio
                for (const info of m.messages) {
                    if (info?.key?.id && info.key.remoteJid && info.message) {
                        messagesCache.set(`${info.key.remoteJid}_${info.key.id}`, info);
                    }
                }

                if (m.type === 'append') {
                    const isJoinRequest = m.messages.some(info => info?.messageStubType === 172);
                    if (!isJoinRequest) return;
                }

                if (m.type !== 'notify' && m.type !== 'append') return;

                const nowSec = Math.floor(Date.now() / 1000);
                let skipped = 0;

                for (const info of m.messages) {
                    if (IGNORE_OLD_MESSAGES) {
                        const ts = toUnixSeconds(info?.messageTimestamp);
                        if (ts && nowSec - ts > OLD_MESSAGE_LIMIT_SEC) {
                            skipped++;
                            continue;
                        }
                    }
                    messageQueue.add(info, processMessage).catch(() => { /* já logado na fila */ });
                }

                if (skipped && DEBUG_MODE) {
                    console.log(`⏭️ ${skipped} mensagem(ns) antiga(s) ignorada(s) (enviadas com o bot desligado).`);
                }
            });
        };

        NazunaSock.ev.on('connection.update', async (update) => {
            if (!isCurrent()) return;
            const { connection, lastDisconnect, qr } = update;

            if (qr && !NazunaSock.authState.creds.registered && !codeMode) {
                console.log('🔗 QR Code gerado para autenticação:');
                qrcode.generate(qr, { small: true }, (qrcodeText) => {
                    console.log(qrcodeText);
                });
                console.log('📱 Escaneie o QR code acima com o WhatsApp para autenticar o bot.');
            }

            if (connection === 'open') {
                clearConnectWatchdog();
                reconnectAttempts = 0;
                consecutiveCloses = 0;
                forbidden403Attempts = 0;
                badSessionAttempts = 0;
                replacedAttempts = 0;
                backupCreds(true).catch(() => { });

                const isFirstOpen = !firstOpenDone;
                firstOpenDone = true;
                global.__astaStats.connectedAt = Date.now();
                if (!isFirstOpen) {
                    global.__astaStats.reconnects++;
                    const rt = (global.__astaStats.reconnectTimes = (global.__astaStats.reconnectTimes || []).filter(t => Date.now() - t < 15 * 60_000));
                    rt.push(Date.now());
                    if (rt.length >= 3 && Date.now() - (global.__astaStats.lastReconAviso || 0) > 30 * 60_000) {
                        global.__astaStats.lastReconAviso = Date.now();
                        setTimeout(() => global.__astaNotifyOwner?.(`📶 *Conexão instável*\n\nO bot reconectou ${rt.length} vezes nos últimos 15 minutos.\nÚltima queda: código ${global.__astaStats.lastDisconnect?.code ?? '?'}.\n\nSe continuar, confira a internet do computador/painel. ${'!'}status mostra os detalhes.`), 5000);
                    }
                }
                startSessionBackups();
                startCodeWatcher();
                console.log(isFirstOpen ? '🔄 Conexão aberta. Inicializando...' : '✅ Reconectado ao WhatsApp.');

                try {
                    await initializeOptimizedCaches();

                    rentalExpirationManager.nazu = NazunaSock;
                    if (isFirstOpen) await rentalExpirationManager.initialize();

                    attachMessagesListener();
                    startCacheCleanup();

                    // tarefas pesadas em segundo plano, sem travar as respostas
                    setTimeout(() => {
                        if (!isSockOpen(NazunaSock)) return;
                        NazunaSock.groupFetchAllParticipating()
                            .then(groups => {
                                for (const [jid, meta] of Object.entries(groups || {})) groupMetadataCache.set(jid, meta);
                            })
                            .catch(() => { });
                    }, 5_000);

                    setTimeout(() => {
                        if (isSockOpen(NazunaSock)) updateOwnerLid(NazunaSock).catch(() => { });
                    }, 8_000);

                    if (isFirstOpen) {
                        setTimeout(() => {
                            if (!isSockOpen(NazunaSock)) return;
                            performMigration(NazunaSock).catch(err => {
                                console.error('❌ Erro na migração (não-bloqueante):', err.message);
                            });
                        }, 30_000);

                        setTimeout(() => {
                            followChannelsOnce(NazunaSock).catch(() => { });
                        }, 20_000);

                        // ===== ATUALIZADOR: avisa que voltou atualizado + procura versão nova a cada 6h =====
                        setTimeout(async () => {
                            try {
                                const upd = await import('./funcs/utils/autoUpdate.js');
                                const st = upd.readState();
                                if (st.notify && isSockOpen(NazunaSock)) {
                                    await NazunaSock.sendMessage(st.notify, { text: `✅ *★彡 ASTA MD 彡★ atualizado!*\n\n📦 Versão: *${upd.localVersion()}*\n🟢 Bot online de novo.` }).catch(() => { });
                                    upd.writeState({ notify: null });
                                    console.log(`✅ Atualizado para a versão ${upd.localVersion()}`);
                                }
                                const verificar = async () => {
                                    try {
                                        const cfgA = JSON.parse(fsSync.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));
                                        if (cfgA.avisoAtualizacao === false || !isSockOpen(NazunaSock)) return;
                                        const inf = await upd.checkForUpdate();
                                        const st2 = upd.readState();
                                        if (!inf.available || st2.notifiedSha === inf.sha) return;
                                        const ownerJid = buildUserId(numerodono, config);
                                        const pfx = cfgA.prefixo || '!';
                                        await NazunaSock.sendMessage(ownerJid, { text: `🆕 *Tem atualização do ★彡 ASTA MD 彡★!*\n\n📦 Atual: *${inf.current}* → Nova: *${inf.latest}*\n📝 ${inf.message || '-'}\n\n👉 Para atualizar: *${pfx}atualizar*\n🔕 Para não receber este aviso: ${pfx}atualizar aviso off` });
                                        upd.writeState({ notifiedSha: inf.sha });
                                        console.log(`🆕 Atualização disponível: ${inf.current} -> ${inf.latest} (${inf.shortSha})`);
                                    } catch (e) { if (DEBUG_MODE) console.log('[ATUALIZAR] verificação falhou:', e.message); }
                                };
                                await verificar();
                                if (!global.__astaUpdateTimer) global.__astaUpdateTimer = setInterval(verificar, 6 * 60 * 60_000);
                            } catch (e) { console.log('[ATUALIZAR] erro no aviso:', e.message); }
                        }, 25_000);

                        try {
                            const msgBotOnConfig = loadMsgBotOn();
                            if (msgBotOnConfig.enabled) {
                                if (ownerMsgTimer) clearTimeout(ownerMsgTimer);
                                ownerMsgTimer = setTimeout(async () => {
                                    ownerMsgTimer = null;
                                    if (!isSockOpen(NazunaSock)) return;
                                    try {
                                        const ownerJid = buildUserId(numerodono, config);
                                        await NazunaSock.sendMessage(ownerJid, { text: msgBotOnConfig.message });
                                        console.log('✅ Mensagem de inicialização enviada para o dono');
                                    } catch (sendError) {
                                        console.error('❌ Erro ao enviar mensagem de inicialização:', sendError.message);
                                    }
                                }, 3000);
                            } else {
                                console.log('ℹ️ Mensagem de inicialização desativada');
                            }
                        } catch (msgError) {
                            console.error('❌ Erro ao processar mensagem de inicialização:', msgError.message);
                        }

                        try {
                            const subBotManagerModule = await import('./utils/subBotManager.js');
                            const subBotManager = subBotManagerModule.default ?? subBotManagerModule;
                            if (subBotInitTimer) clearTimeout(subBotInitTimer);
                            subBotInitTimer = setTimeout(async () => {
                                subBotInitTimer = null;
                                try {
                                    await subBotManager.initializeAllSubBots();
                                } catch (e) {
                                    console.error('❌ Erro ao iniciar sub-bots:', e.message);
                                }
                            }, 15_000);
                        } catch (error) {
                            console.error('❌ Erro ao inicializar sub-bots:', error.message);
                        }

                        console.log(`✅ Bot ${nomebot} iniciado com sucesso! Prefixo: ${prefixo} | Dono: ${nomedono}`);
                        console.log(`📊 Fila: até ${messageQueue.maxWorkers} mensagens processadas ao mesmo tempo`);
                    }
                } catch (initErr) {
                    // NÃO cria outro socket aqui (isso causava duas conexões brigando
                    // pela mesma sessão e o WhatsApp acabava deslogando o bot)
                    console.error('❌ Erro na inicialização pós-conexão:', initErr.message);
                    attachMessagesListener();
                }
            }

            if (connection === 'close') {
                clearConnectWatchdog();
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                global.__astaStats.lastDisconnect = { at: Date.now(), code: reason, msg: lastDisconnect?.error?.message || '' };
                const reasonMessage = {
                    [DisconnectReason.loggedOut]: 'Deslogado do WhatsApp',
                    403: 'Acesso proibido (Forbidden)',
                    [DisconnectReason.connectionClosed]: 'Conexão fechada',
                    [DisconnectReason.connectionLost]: 'Conexão perdida / sem resposta',
                    [DisconnectReason.connectionReplaced]: 'Conexão substituída (outra sessão aberta)',
                    [DisconnectReason.badSession]: 'Sessão com erro',
                    [DisconnectReason.restartRequired]: 'Reinício necessário',
                    [DisconnectReason.unavailableService]: 'Serviço indisponível',
                    411: 'Incompatibilidade de multi-dispositivo'
                }[reason] || 'Motivo desconhecido';

                if (cacheCleanupInterval) {
                    clearInterval(cacheCleanupInterval);
                    cacheCleanupInterval = null;
                }
                if (ownerMsgTimer) { clearTimeout(ownerMsgTimer); ownerMsgTimer = null; }

                // este socket morreu: tira os listeners para não acumular
                try { NazunaSock.ev.removeAllListeners(); } catch { }
                if (currentSock === NazunaSock) currentSock = null;

                // 515 = normal logo após escanear o QR, reconecta na hora
                if (reason === DisconnectReason.restartRequired) {
                    console.log('🔁 Reiniciando conexão (normal após autenticar)...');
                    scheduleReconnect(1000);
                    return;
                }

                // 401 = o WhatsApp realmente desconectou o aparelho
                if (reason === DisconnectReason.loggedOut) {
                    console.log(`❌ Conexão fechada. Código: ${reason} | Motivo: ${reasonMessage}`);
                    console.log('🚪 O aparelho foi desconectado no WhatsApp. Apagando sessão para gerar novo QR Code...');
                    await clearAuthDir(authDir);
                    scheduleReconnect(5000);
                    return;
                }

                // 403 = o WhatsApp recusou o login. NÃO apaga a sessão (apagar não resolve e obriga
                // a escanear o QR de novo). Espera cada vez mais e tenta de novo, sem parar.
                if (reason === 403) {
                    forbidden403Attempts++;
                    const esperas403 = [60_000, 3 * 60_000, 10 * 60_000, 30 * 60_000, 60 * 60_000];
                    const espera403 = esperas403[Math.min(forbidden403Attempts - 1, esperas403.length - 1)] + Math.floor(Math.random() * 15_000);
                    const quando = espera403 >= 60_000 ? `${Math.round(espera403 / 60_000)} min` : `${Math.round(espera403 / 1000)}s`;
                    console.log(`❌ Conexão fechada. Código: 403 | ${reasonMessage} (vez ${forbidden403Attempts}) → tentando de novo em ${quando}. A sessão NÃO foi apagada.`);
                    if (forbidden403Attempts === 3) {
                        console.log('⚠️ O WhatsApp está recusando a conexão várias vezes seguidas. Isso costuma ser:');
                        console.log('   • limite temporário do WhatsApp (muitas reconexões ou muitas mensagens em pouco tempo), ou');
                        console.log('   • restrição no número: abra o WhatsApp no celular do bot e veja se aparece algum aviso.');
                        console.log('   O bot continua tentando sozinho, com espera cada vez maior.');
                    }
                    scheduleReconnect(espera403);
                    return;
                }

                // 503 = servidor do WhatsApp indisponível/ocupado. Reconectar rápido demais
                // faz o WhatsApp responder 403, então espera pelo menos 20s.
                if (reason === DisconnectReason.unavailableService) {
                    consecutiveCloses++;
                    const espera503 = Math.min(20_000 * Math.pow(2, Math.max(0, consecutiveCloses - 1)), 5 * 60_000) + Math.floor(Math.random() * 5000);
                    console.log(`❌ Conexão fechada. Código: 503 | Motivo: ${reasonMessage} (o servidor do WhatsApp está ocupado) → reconectando em ${Math.round(espera503 / 1000)}s (tentativa ${consecutiveCloses})`);
                    scheduleReconnect(espera503);
                    return;
                }

                // 440 = outra instância com a mesma sessão (bot ligado em dois lugares)
                if (reason === DisconnectReason.connectionReplaced) {
                    replacedAttempts++;
                    console.log(`⚠️ Conexão substituída: a MESMA sessão está aberta em outro lugar (${replacedAttempts}/${MAX_REPLACED_ATTEMPTS}).`);
                    console.log('   Verifique se o bot não está rodando em outro servidor/terminal ao mesmo tempo.');
                    if (replacedAttempts >= MAX_REPLACED_ATTEMPTS) {
                        console.log('⛔ Parando as tentativas para não derrubar a sessão. Desligue a outra instância e reinicie o bot.');
                        return;
                    }
                    scheduleReconnect(30_000);
                    return;
                }

                // 500 = erro de sessão. Antes apagava a sessão na hora (por isso pedia QR do nada).
                // Agora só apaga se continuar falhando várias vezes seguidas.
                if (reason === DisconnectReason.badSession) {
                    badSessionAttempts++;
                    if (badSessionAttempts >= MAX_BAD_SESSION_ATTEMPTS) {
                        console.log(`❌ Sessão falhou ${badSessionAttempts}x seguidas (500). Apagando sessão para gerar novo QR Code...`);
                        await clearAuthDir(authDir);
                        badSessionAttempts = 0;
                        scheduleReconnect(5000);
                        return;
                    }
                }

                consecutiveCloses++;
                const delay = backoffDelay(consecutiveCloses);
                console.log(`❌ Conexão fechada. Código: ${reason ?? '-'} | Motivo: ${reasonMessage} → reconectando em ${Math.round(delay / 1000)}s (tentativa ${consecutiveCloses})`);
                scheduleReconnect(delay);
            }
        });
    return NazunaSock;
}

async function startNazu() {
    if (isStarting) return;
    isStarting = true;

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    try {
        // garante que nunca existam DOIS sockets usando a mesma sessão
        if (currentSock) {
            const old = currentSock;
            currentSock = null;
            sockGeneration++;
            destroySock(old);
        }

        console.log(firstOpenDone ? '🔌 Reconectando...' : '🚀 Iniciando ASTA MD...');
        await createBotSocket(AUTH_DIR);
    } catch (err) {
        reconnectAttempts++;
        console.error(`❌ Erro ao iniciar o bot (tentativa ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}): ${err.message}`);

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error(`❌ Máximo de tentativas de reconexão alcançado (${MAX_RECONNECT_ATTEMPTS}). Parando...`);
            process.exit(1);
        }

        if (err.message?.includes('ENOSPC') || err.message?.includes('ENOMEM')) {
            console.log('🧹 Tentando limpeza de emergência...');
            try {
                await performanceOptimizer.emergencyCleanup();
                console.log('✅ Limpeza de emergência concluída');
            } catch (cleanupErr) {
                console.error('❌ Falha na limpeza de emergência:', cleanupErr.message);
            }
        }

        const delay = backoffDelay(reconnectAttempts);
        console.log(`🔄 Aguardando ${Math.round(delay / 1000)} segundos antes de tentar novamente...`);
        scheduleReconnect(delay);
    } finally {
        isStarting = false;
    }
}

async function gracefulShutdown(signal) {
    const signalName = signal === 'SIGTERM' ? 'SIGTERM' : 'SIGINT';
    console.log(`📡 ${signalName} recebido, parando bot graciosamente...`);


    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    isReconnecting = false;

    let shutdownTimeout;


    shutdownTimeout = setTimeout(() => {
        console.error('⚠️ Timeout de shutdown, forçando saída...');
        process.exit(1);
    }, 15000);

    try {

        try {
            const subBotManagerModule = await import('./utils/subBotManager.js');
            const subBotManager = subBotManagerModule.default ?? subBotManagerModule;
            await subBotManager.disconnectAllSubBots();
            console.log('✅ Sub-bots desconectados');
        } catch (error) {
            console.error('❌ Erro ao desconectar sub-bots:', error.message);
        }


        if (cacheCleanupInterval) {
            clearInterval(cacheCleanupInterval);
            cacheCleanupInterval = null;
        }


        await messageQueue.shutdown();
        console.log('✅ MessageQueue finalizado');


        await performanceOptimizer.shutdown();
        console.log('✅ Performance optimizer finalizado');

        clearTimeout(shutdownTimeout);
        console.log('✅ Desligamento concluído');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro durante desligamento:', error.message);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', async (error) => {
    console.error('🚨 Erro não capturado — reiniciando processo:', error.message);
    console.error(error.stack);

    if (error.message.includes('ENOSPC') || error.message.includes('ENOMEM')) {
        try {
            await performanceOptimizer.emergencyCleanup();
        } catch (cleanupErr) {
            console.error('❌ Falha na limpeza de emergência:', cleanupErr.message);
        }
    }

    process.exit(1);
});

// Mostra cada erro "solto" uma vez só a cada 30s (antes enchia o terminal
// com a mesma mensagem de "Connection Closed" várias vezes)
const _recentRejections = new Map();
process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || String(reason);
    const now = Date.now();
    const last = _recentRejections.get(msg) || 0;
    if (now - last < 30_000) return;
    _recentRejections.set(msg, now);
    if (_recentRejections.size > 200) _recentRejections.clear();
    if (/Connection Closed|Connection Terminated|Timed Out/i.test(msg) && !DEBUG_MODE) {
        console.warn(`⚠️ Ação cancelada porque a conexão caiu: ${msg}`);
        return;
    }
    console.error('🚨 Promise rejeitada sem tratamento:', DEBUG_MODE ? reason : msg);
});

export { rentalExpirationManager, messageQueue };

startNazu();
