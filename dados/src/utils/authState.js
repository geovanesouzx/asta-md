/**
 * Auth state em arquivos com gravação ATÔMICA + backup do creds.json.
 *
 * Por que existe:
 * O useMultiFileAuthState padrão do Baileys grava os arquivos direto por cima.
 * Se o processo morrer no meio da gravação (painel reiniciou, crash, falta de
 * memória), o creds.json fica cortado/corrompido. Na próxima vez que o bot
 * liga, o Baileys não consegue ler o arquivo e cria credenciais NOVAS, ou seja,
 * pede para escanear o QR Code de novo do nada.
 *
 * Aqui cada arquivo é gravado num .tmp e depois renomeado (rename é atômico),
 * e o creds.json tem uma cópia de segurança (creds.json.bak) usada se o
 * principal estiver danificado.
 */
import { mkdir, readFile, rename, stat, unlink, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';
import { initAuthCreds, BufferJSON, proto } from 'baileys';

const fileLocks = new Map();

// Fila simples por arquivo (evita leituras/escritas simultâneas no mesmo arquivo)
function withLock(filePath, fn) {
    const prev = fileLocks.get(filePath) || Promise.resolve();
    const next = prev.catch(() => { }).then(fn);
    fileLocks.set(filePath, next.finally(() => {
        if (fileLocks.get(filePath) === next) fileLocks.delete(filePath);
    }).catch(() => { }));
    return next;
}

const fixFileName = (file) => file?.replace(/\//g, '__')?.replace(/:/g, '-');

async function atomicWrite(filePath, content) {
    const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, content);
    try {
        await rename(tmp, filePath);
    } catch (err) {
        await unlink(tmp).catch(() => { });
        throw err;
    }
}

export async function useSafeMultiFileAuthState(folder) {
    const folderInfo = await stat(folder).catch(() => null);
    if (folderInfo && !folderInfo.isDirectory()) {
        throw new Error(`Existe um arquivo no lugar da pasta de sessão: ${folder}`);
    }
    if (!folderInfo) await mkdir(folder, { recursive: true });

    const pathOf = (file) => join(folder, fixFileName(file));

    const readJson = async (filePath) => {
        const raw = await readFile(filePath, { encoding: 'utf-8' });
        if (!raw || !raw.trim()) throw new Error('arquivo vazio');
        return JSON.parse(raw, BufferJSON.reviver);
    };

    const readData = (file) => {
        const filePath = pathOf(file);
        return withLock(filePath, async () => {
            try {
                return await readJson(filePath);
            } catch {
                return null;
            }
        });
    };

    const writeData = (data, file) => {
        const filePath = pathOf(file);
        return withLock(filePath, () => atomicWrite(filePath, JSON.stringify(data, BufferJSON.replacer)));
    };

    const removeData = (file) => {
        const filePath = pathOf(file);
        return withLock(filePath, () => unlink(filePath).catch(() => { }));
    };

    // ---------- carrega o creds.json com fallback para o backup ----------
    const credsPath = pathOf('creds.json');
    const backupPath = `${credsPath}.bak`;
    let creds = null;
    let credsExisted = false;

    try {
        await stat(credsPath);
        credsExisted = true;
        creds = await readJson(credsPath);
    } catch {
        creds = null;
    }

    if (!creds) {
        try {
            const bak = await readJson(backupPath);
            if (bak) {
                creds = bak;
                console.warn('⚠️ creds.json estava danificado/ausente — sessão restaurada do backup (creds.json.bak).');
                await atomicWrite(credsPath, JSON.stringify(creds, BufferJSON.replacer)).catch(() => { });
            }
        } catch { /* sem backup */ }
    }

    if (!creds) {
        if (credsExisted) {
            console.warn('⚠️ creds.json corrompido e sem backup válido — será necessário escanear o QR Code.');
        }
        creds = initAuthCreds();
    }

    let lastBackup = 0;
    const backupCreds = async (force = false) => {
        // só faz backup de sessão já registrada (logada)
        if (!creds?.registered && !creds?.me) return;
        const now = Date.now();
        if (!force && now - lastBackup < 60_000) return;
        lastBackup = now;
        await withLock(backupPath, () => atomicWrite(backupPath, JSON.stringify(creds, BufferJSON.replacer))).catch(() => { });
    };

    const state = {
        creds,
        keys: {
            get: async (type, ids) => {
                const data = {};
                await Promise.all(ids.map(async (id) => {
                    let value = await readData(`${type}-${id}.json`);
                    if (type === 'app-state-sync-key' && value) {
                        value = proto.Message.AppStateSyncKeyData.fromObject(value);
                    }
                    data[id] = value;
                }));
                return data;
            },
            set: async (data) => {
                const tasks = [];
                for (const category in data) {
                    for (const id in data[category]) {
                        const value = data[category][id];
                        const file = `${category}-${id}.json`;
                        tasks.push(value ? writeData(value, file) : removeData(file));
                    }
                }
                await Promise.all(tasks);
            }
        }
    };

    const saveCreds = async () => {
        await writeData(creds, 'creds.json');
        await backupCreds();
    };

    return { state, saveCreds, backupCreds };
}

export default useSafeMultiFileAuthState;
