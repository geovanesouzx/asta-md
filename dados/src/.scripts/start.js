#!/usr/bin/env node

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import readline from 'readline/promises';
import os from 'os';

const CONFIG_PATH = path.join(process.cwd(), 'dados', 'src', 'config.json');
const NODE_MODULES_PATH = path.join(process.cwd(), 'node_modules');
const QR_CODE_DIR = path.join(process.cwd(), 'dados', 'database', 'qr-code');
const CONNECT_FILE = path.join(process.cwd(), 'dados', 'src', 'connect.js');
const isWindows = os.platform() === 'win32';
const isTermux = fsSync.existsSync('/data/data/com.termux');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[1;32m',
  red: '\x1b[1;31m',
  blue: '\x1b[1;34m',
  yellow: '\x1b[1;33m',
  cyan: '\x1b[1;36m',
  bold: '\x1b[1m',
};

// roda um comando do npm (no Windows passa como texto único: evita o aviso DEP0190 do Node)
const runNpm = (args, opts = {}) => isWindows
  ? spawn(['npm', ...args].join(' '), { stdio: 'inherit', shell: true, ...opts })
  : spawn('npm', args, { stdio: 'inherit', ...opts });

const mensagem = (text) => console.log(`${colors.green}${text}${colors.reset}`);
const aviso = (text) => console.log(`${colors.red}${text}${colors.reset}`);
const info = (text) => console.log(`${colors.cyan}${text}${colors.reset}`);
const separador = () => console.log(`${colors.blue}============================================${colors.reset}`);

const getVersion = () => {
  try {
    const packageJson = JSON.parse(fsSync.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    return packageJson.version || 'Desconhecida';
  } catch {
    return 'Desconhecida';
  }
};

let botProcess = null;
const version = getVersion();

// ===== TERMUX: bot sempre ligado =====
// Pergunta UMA vez e configura:
//  1) ao abrir o Termux, o bot liga sozinho em segundo plano (se ainda não estiver ligado)
//  2) ao ligar o celular, o bot volta sozinho (precisa do app Termux:Boot)
//  3) comandos: asta-log, asta-parar, asta-reiniciar, asta-iniciar
// (a versão antiga abria uma cópia nova do bot a cada vez que o Termux era aberto)
const TERMUX_MARK_START = '# >>> ASTA MD (não apague estas linhas) >>>';
const TERMUX_MARK_END = '# <<< ASTA MD <<<';

function termuxBashrcBlock(botDir) {
  const q = (x) => `"${x}"`;
  return `${TERMUX_MARK_START}
ASTA_DIR=${q(botDir)}
asta_rodando() { [ -f "$ASTA_DIR/dados/database/.asta-rodando.pid" ] && kill -0 "$(cat "$ASTA_DIR/dados/database/.asta-rodando.pid" 2>/dev/null)" 2>/dev/null; }
asta-iniciar() {
  if asta_rodando; then echo "⚔️ O ASTA MD já está ligado. Console: asta-log"; return; fi
  if [ "$(ls "$ASTA_DIR/dados/database/qr-code" 2>/dev/null | wc -l)" -le 2 ]; then
    echo "📱 Primeira conexão: conecte o WhatsApp abaixo."; (cd "$ASTA_DIR" && sh "$ASTA_DIR/iniciar.sh"); return
  fi
  mkdir -p "$ASTA_DIR/dados/logs"
  nohup sh "$ASTA_DIR/iniciar.sh" >> "$ASTA_DIR/dados/logs/termux.log" 2>&1 &
  echo "🚀 ASTA MD ligado em segundo plano."
}
asta-log() { tail -n 40 -f "$ASTA_DIR/dados/logs/termux.log"; }
asta-parar() {
  pkill -f "$ASTA_DIR/iniciar.sh" 2>/dev/null; pkill -f "dados/src/.scripts/start.js" 2>/dev/null; pkill -f "dados/src/connect.js" 2>/dev/null
  rm -f "$ASTA_DIR/dados/database/.asta-rodando.pid"; echo "🛑 ASTA MD parado. Para ligar: asta-iniciar"
}
asta-reiniciar() { asta-parar; sleep 2; asta-iniciar; }
if [ -z "$ASTA_SEM_AUTO" ] && [ -z "$ASTA_JA_ABRIU" ] && [ -d "$ASTA_DIR" ]; then
  export ASTA_JA_ABRIU=1
  asta-iniciar
  echo "📜 Console: asta-log  |  🛑 Parar: asta-parar  |  ♻️ Reiniciar: asta-reiniciar"
fi
${TERMUX_MARK_END}`;
}

function termuxBootScript(botDir) {
  return `#!/data/data/com.termux/files/usr/bin/sh
# ASTA MD — liga o bot quando o celular liga (precisa do app Termux:Boot)
termux-wake-lock
sleep 25
ASTA_DIR="${botDir}"
PIDF="$ASTA_DIR/dados/database/.asta-rodando.pid"
if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF" 2>/dev/null)" 2>/dev/null; then exit 0; fi
mkdir -p "$ASTA_DIR/dados/logs"
cd "$ASTA_DIR" && nohup sh "$ASTA_DIR/iniciar.sh" >> "$ASTA_DIR/dados/logs/termux.log" 2>&1 &
`;
}

async function writeTermuxAutostart(botDir) {
  const home = process.env.HOME;
  const bashrcPath = path.join(home, '.bashrc');
  let rc = fsSync.existsSync(bashrcPath) ? await fs.readFile(bashrcPath, 'utf8') : '';
  // remove o autostart antigo (am startservice ... RUN_COMMAND), que duplicava o bot
  rc = rc.replace(/\n?am startservice --user 0 \\\n(?:.*\\\n)*?.*RUN_COMMAND_SESSION_ACTION.*\n?/g, '\n');
  // remove o bloco do ASTA (se já existir) e escreve de novo (o caminho da pasta pode ter mudado)
  const re = new RegExp(`\\n?${TERMUX_MARK_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${TERMUX_MARK_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`, 'g');
  rc = rc.replace(re, '\n').replace(/\n{3,}/g, '\n\n').trimEnd();
  rc += `\n\n${termuxBashrcBlock(botDir)}\n`;
  await fs.writeFile(bashrcPath, rc);
  const bootDir = path.join(home, '.termux', 'boot');
  await fs.mkdir(bootDir, { recursive: true });
  const bootFile = path.join(bootDir, 'asta-md.sh');
  await fs.writeFile(bootFile, termuxBootScript(botDir));
  try { await fs.chmod(bootFile, 0o755); } catch { }
  try { await fs.chmod(path.join(botDir, 'iniciar.sh'), 0o755); } catch { }
}

async function setupTermuxAutostart() {
  if (!isTermux) return;
  const botDir = process.cwd();
  const statePath = path.join(botDir, 'dados', 'database', 'termux-auto.json');
  let state = {};
  try { state = JSON.parse(fsSync.readFileSync(statePath, 'utf8')); } catch { }
  const bashrcPath = path.join(process.env.HOME || '', '.bashrc');
  const rc = fsSync.existsSync(bashrcPath) ? fsSync.readFileSync(bashrcPath, 'utf8') : '';
  const hasOld = rc.includes('com.termux.RUN_COMMAND');

  // já configurado: só atualiza em silêncio (pasta mudou / versão nova do bloco)
  if (rc.includes(TERMUX_MARK_START)) {
    if (!rc.includes(`ASTA_DIR="${botDir}"`) || hasOld) {
      try { await writeTermuxAutostart(botDir); } catch { }
    }
    return;
  }
  if (state.recusado && !hasOld) return;
  // sem terminal (ex.: ligado pelo Termux:Boot): não dá para perguntar
  if (!process.stdin.isTTY) return;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${colors.yellow}📱 Termux detectado. Deixar o ASTA MD SEMPRE ligado (liga sozinho ao abrir o Termux e ao ligar o celular)? (S/n): ${colors.reset}`);
  rl.close();
  if (answer.trim().toLowerCase().startsWith('n')) {
    try { fsSync.mkdirSync(path.dirname(statePath), { recursive: true }); fsSync.writeFileSync(statePath, JSON.stringify({ recusado: true })); } catch { }
    info('📱 Ok! Para ligar depois: cd ~/asta-md && sh iniciar.sh');
    return;
  }
  try {
    await writeTermuxAutostart(botDir);
    mensagem('✅ Pronto! Agora o ASTA MD liga sozinho ao abrir o Termux.');
    info('📱 Para ligar também quando o celular reiniciar: instale o app "Termux:Boot" (F-Droid) e abra ele uma vez.');
    info('🔋 Importante: em Configurações > Apps > Termux > Bateria, escolha "Sem restrições".');
    info('📜 Comandos: asta-log (ver console) | asta-parar | asta-reiniciar | asta-iniciar');
  } catch (error) {
    aviso(`❌ Erro ao configurar o modo sempre ligado: ${error.message}`);
  }
}

function setupGracefulShutdown() {
  const shutdown = () => {
    mensagem('🛑 Encerrando o ASTA MD... Até logo!');
    if (botProcess) {
      botProcess.removeAllListeners();
      botProcess.kill();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  if (isWindows) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.on('SIGINT', shutdown);
  }
}

async function displayHeader() {
  const header = [
    `${colors.bold}🚀 ASTA MD - Conexão WhatsApp${colors.reset}`,
    `${colors.bold}📦 Versão: ${version}${colors.reset}`,
  ];

  separador();
  for (const line of header) {
    console.log(line);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  separador();
  console.log();
}

async function checkPrerequisites() {
  if (!fsSync.existsSync(CONFIG_PATH)) {
    aviso('⚠️ Arquivo de configuração (config.json) não encontrado! Iniciando configuração automática...');
    try {
      await new Promise((resolve, reject) => {
        const configProcess = runNpm(['run', 'config']);
        configProcess.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Configuração falhou com código ${code}`))));
        configProcess.on('error', reject);
      });
      mensagem('📝 Configuração concluída com sucesso!');
    } catch (error) {
      aviso(`❌ Falha na configuração: ${error.message}`);
      mensagem('📝 Tente executar manualmente: npm run config');
      process.exit(1);
    }
  }

  if (!fsSync.existsSync(NODE_MODULES_PATH)) {
    aviso('⚠️ Módulos do Node.js não encontrados! Iniciando instalação automática...');
    try {
      await new Promise((resolve, reject) => {
        const installProcess = runNpm(['run', 'config:install']);
        installProcess.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Instalação falhou com código ${code}`))));
        installProcess.on('error', reject);
      });
      mensagem('📦 Instalação dos módulos concluída com sucesso!');
    } catch (error) {
      aviso(`❌ Falha na instalação dos módulos: ${error.message}`);
      mensagem('📦 Tente executar manualmente: npm run config:install');
      process.exit(1);
    }
  }

  if (!fsSync.existsSync(CONNECT_FILE)) {
    aviso(`⚠️ Arquivo de conexão (${CONNECT_FILE}) não encontrado!`);
    aviso('🔍 Verifique a instalação do projeto.');
    process.exit(1);
  }
}

// O sharp (figurinhas) precisa de um binário para o sistema. No Termux (Android) não existe versão
// pronta, e às vezes a instalação no Windows falha: nesses casos instala a versão WebAssembly,
// que funciona em qualquer aparelho, sem compilar nada.
function sharpLoads() {
  try {
    execSync(`node -e "import('sharp').then(()=>process.exit(0)).catch(()=>process.exit(1))"`, { cwd: process.cwd(), stdio: 'ignore', timeout: 60000 });
    return true;
  } catch { return false; }
}
async function ensureSharp() {
  if (sharpLoads()) return;
  let ver = '';
  try { ver = JSON.parse(fsSync.readFileSync(path.join(NODE_MODULES_PATH, 'sharp', 'package.json'), 'utf-8')).version; } catch { }
  aviso('⚠️ O módulo de figurinhas (sharp) não carregou neste aparelho. Instalando a versão compatível (WebAssembly)...');
  try {
    await new Promise((resolve, reject) => {
      const p = runNpm(['install', '--no-save', '--force', '--no-audit', '--no-fund', '--no-bin-links', `@img/sharp-wasm32${ver ? '@' + ver : ''}`]);
      p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`código ${c}`))));
      p.on('error', reject);
    });
  } catch (e) {
    aviso(`❌ Não consegui instalar o sharp compatível: ${e.message}`);
  }
  if (sharpLoads()) mensagem('✅ Módulo de figurinhas pronto (versão WebAssembly).');
  else aviso('❌ O sharp ainda não carrega. Rode na pasta do bot: npm install --force && npm start');
}

function startBot(codeMode = false) {
  const args = ['--expose-gc', CONNECT_FILE];
  if (codeMode) args.push('--code');

  info(`📷 Iniciando com ${codeMode ? 'código de pareamento' : 'QR Code'}`);

  botProcess = spawn('node', args, {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  botProcess.on('error', (error) => {
    aviso(`❌ Erro ao iniciar o processo do bot: ${error.message}`);
    restartBot(codeMode);
  });

  botProcess.on('close', (code) => {
    if (code === 0) {
      info(`✅ O bot terminou normalmente (código: ${code}). Reiniciando...`);
    } else {
      aviso(`⚠️ O bot terminou com erro (código: ${code}). Reiniciando...`);
    }
    restartBot(codeMode);
  });

  return botProcess;
}

function restartBot(codeMode) {
  aviso('🔄 Reiniciando o bot em 500ms...');
  setTimeout(() => {
    if (botProcess) botProcess.removeAllListeners();
    startBot(codeMode);
  }, 500);
}

async function checkAutoConnect() {
  try {
    if (!fsSync.existsSync(QR_CODE_DIR)) {
      await fs.mkdir(QR_CODE_DIR, { recursive: true });
      return false;
    }
    const files = await fs.readdir(QR_CODE_DIR);
    return files.length > 2;
  } catch (error) {
    aviso(`❌ Erro ao verificar diretório de QR Code: ${error.message}`);
    return false;
  }
}

async function promptConnectionMethod() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`${colors.yellow}🔧 Escolha o método de conexão:${colors.reset}`);
  console.log(`${colors.yellow}1. 📷 Conectar via QR Code${colors.reset}`);
  console.log(`${colors.yellow}2. 🔑 Conectar via código de pareamento${colors.reset}`);
  console.log(`${colors.yellow}3. 🚪 Sair${colors.reset}`);

  const answer = await rl.question('➡️ Digite o número da opção desejada: ');
  console.log();
  rl.close();

  switch (answer.trim()) {
    case '1':
      mensagem('📷 Iniciando conexão via QR Code...');
      return { method: 'qr' };
    case '2':
      mensagem('🔑 Iniciando conexão via código de pareamento...');
      return { method: 'code' };
    case '3':
      mensagem('👋 Encerrando... Até mais!');
      process.exit(0);
    default:
      aviso('⚠️ Opção inválida! Usando conexão via QR Code como padrão.');
      return { method: 'qr' };
  }
}

async function main() {
  try {
    setupGracefulShutdown();
    await displayHeader();
    await checkPrerequisites();
    await ensureSharp();
    await setupTermuxAutostart();

    const hasSession = await checkAutoConnect();
    if (hasSession) {
      mensagem('📷 Sessão de QR Code detectada. Conectando automaticamente...');
      startBot(false);
    } else {
      const { method } = await promptConnectionMethod();
      startBot(method === 'code');
    }
  } catch (error) {
    aviso(`❌ Erro inesperado: ${error.message}`);
    process.exit(1);
  }
}

(async () => {
  await main();
})();