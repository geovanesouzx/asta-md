/**
 * ★彡 ASTA MD 彡★ — ATUALIZADOR AUTOMÁTICO
 *
 * Baixa a versão mais nova do repositório oficial do ASTA MD no GitHub e aplica por cima,
 * sem precisar de Git e sem o usuário mexer em arquivos.
 *
 * NUNCA mexe em:
 *   - dados/database/   (sessão do WhatsApp, grupos, usuários, backups...)
 *   - node_modules/
 *   - dados/src/config.json  (só ACRESCENTA opções novas; nada do usuário muda)
 *   - mídias que o usuário já tem em dados/midias (ex.: banner personalizado)
 *
 * Antes de aplicar, guarda um .zip com os arquivos que vão mudar em
 * dados/database/backups-atualizacao (mantém os 3 últimos).
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import axios from 'axios';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { makeZip } from './extras.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BOT_ROOT = path.resolve(__dirname, '../../../../');
const DB_DIR = path.join(BOT_ROOT, 'dados', 'database');
const STATE_FILE = path.join(DB_DIR, 'atualizacao.json');
const BACKUP_DIR = path.join(DB_DIR, 'backups-atualizacao');
const CONFIG_FILE = path.join(BOT_ROOT, 'dados', 'src', 'config.json');

export const DEFAULT_REPO = 'geovanesouzx/asta-md';
export const DEFAULT_BRANCH = 'main';

/* ------------------------------------------------------------------ */
/* estado e configuração                                               */
/* ------------------------------------------------------------------ */

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf-8')); } catch { return d; } };
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2)); };

export const readState = () => readJson(STATE_FILE, {});
export const writeState = (patch) => { const s = { ...readState(), ...patch }; writeJson(STATE_FILE, s); return s; };

/** Repositório / ramo / endereços (dá para trocar no config.json: repoAtualizacao, ramoAtualizacao). */
export function updateSource() {
  const cfg = readJson(CONFIG_FILE, {});
  const repo = String(cfg.repoAtualizacao || DEFAULT_REPO).replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
  const branch = String(cfg.ramoAtualizacao || DEFAULT_BRANCH);
  // ASTA_UPDATE_BASE: só para testes (servidor local imitando o GitHub)
  const base = process.env.ASTA_UPDATE_BASE || null;
  return {
    repo, branch,
    commitUrl: base ? `${base}/commit` : `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`,
    rawUrl: (ref, file) => base ? `${base}/raw/${file}` : `https://raw.githubusercontent.com/${repo}/${ref}/${file}`,
    tarUrl: (ref) => base ? `${base}/tar` : `https://codeload.github.com/${repo}/tar.gz/${ref}`
  };
}

export const localVersion = () => readJson(path.join(BOT_ROOT, 'package.json'), {}).version || '0.0.0';

/** -1 se a < b, 0 se igual, 1 se a > b (ex.: 10.7.2 x 10.10.0) */
export function compareVersions(a, b) {
  const pa = String(a || '0').split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b || '0').split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

const http = axios.create({
  timeout: 60_000,
  headers: { 'User-Agent': 'ASTA-MD-Updater', Accept: 'application/vnd.github+json' },
  maxContentLength: 200 * 1024 * 1024,
  maxBodyLength: 200 * 1024 * 1024
});

/* ------------------------------------------------------------------ */
/* verificar                                                           */
/* ------------------------------------------------------------------ */

/**
 * Confere se tem versão nova no GitHub.
 * @returns {{ available, current, latest, sha, shortSha, message, date, repo, branch, firstCheck }}
 */
export async function checkForUpdate() {
  const src = updateSource();
  const current = localVersion();
  const state = readState();
  const readPkgVersion = async (ref) => {
    const { data: pkg } = await http.get(src.rawUrl(ref, 'package.json'), { responseType: 'json' });
    return (typeof pkg === 'string' ? JSON.parse(pkg) : pkg)?.version || null;
  };
  let commit = null;
  try {
    ({ data: commit } = await http.get(src.commitUrl));
  } catch (e) {
    // API do GitHub indisponível (limite de consultas, rede): compara só pela versão do package.json
    const latestV = await readPkgVersion(src.branch);
    if (!latestV) throw e;
    const available = compareVersions(latestV, current) > 0;
    return {
      available, current, latest: latestV, sha: src.branch, shortSha: src.branch, tarRef: src.branch, byVersion: true,
      message: `versão ${latestV}`, date: null, repo: src.repo, branch: src.branch, firstCheck: !state.sha
    };
  }
  const sha = commit?.sha;
  if (!sha) throw new Error('não consegui ler o último commit do GitHub');
  let latest = null;
  try { latest = await readPkgVersion(sha); } catch { }
  let available;
  let firstCheck = false;
  if (state.sha) {
    available = state.sha !== sha;
  } else {
    // primeira verificação: sem saber o commit local, decide pela versão
    firstCheck = true;
    available = latest ? compareVersions(latest, current) > 0 : false;
    if (!available) writeState({ sha, version: current, checkedAt: Date.now() });
  }
  return {
    available, current, latest: latest || '?', sha, shortSha: sha.slice(0, 7), tarRef: sha,
    message: String(commit?.commit?.message || '').split('\n')[0].slice(0, 200),
    date: commit?.commit?.author?.date || commit?.commit?.committer?.date || null,
    repo: src.repo, branch: src.branch, firstCheck
  };
}

/* ------------------------------------------------------------------ */
/* tar.gz do GitHub                                                    */
/* ------------------------------------------------------------------ */

function parsePax(data) {
  const out = {};
  let i = 0;
  const s = data.toString('utf-8');
  while (i < s.length) {
    const sp = s.indexOf(' ', i);
    if (sp < 0) break;
    const len = parseInt(s.slice(i, sp), 10);
    if (!len) break;
    const rec = s.slice(sp + 1, i + len - 1);
    const eq = rec.indexOf('=');
    if (eq > 0) out[rec.slice(0, eq)] = rec.slice(eq + 1);
    i += len;
  }
  return out;
}

/** Lê um .tar (já descompactado) e devolve [{ name, data }] só dos arquivos. */
export function untar(buf) {
  const files = [];
  let i = 0, pax = {}, longName = null;
  const str = (h, o, l) => { const b = h.subarray(o, o + l); const z = b.indexOf(0); return (z >= 0 ? b.subarray(0, z) : b).toString('utf-8'); };
  while (i + 512 <= buf.length) {
    const h = buf.subarray(i, i + 512);
    if (h.every((b) => b === 0)) break;
    let name = str(h, 0, 100);
    const size = parseInt(str(h, 124, 12).trim() || '0', 8) || 0;
    const type = h[156] ? String.fromCharCode(h[156]) : '0';
    const prefix = str(h, 345, 155);
    if (prefix) name = `${prefix}/${name}`;
    const data = buf.subarray(i + 512, i + 512 + size);
    i += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') { pax = parsePax(data); continue; }
    if (type === 'g') continue;
    if (type === 'L') { longName = str(data, 0, data.length); continue; }
    if (pax.path) name = pax.path;
    if (longName) name = longName;
    pax = {}; longName = null;
    if (type === '0' || type === '7') files.push({ name, data: Buffer.from(data) });
  }
  return files;
}

/* ------------------------------------------------------------------ */
/* aplicar                                                             */
/* ------------------------------------------------------------------ */

const norm = (p) => p.replace(/\\/g, '/');
/** caminhos que o atualizador NUNCA sobrescreve */
const NEVER = [/^dados\/database\//, /^node_modules\//, /^\.git\//, /^dados\/logs\//];
const KEEP_IF_EXISTS = [/^dados\/midias\//];

/** Junta o config.json: mantém TUDO do usuário e só acrescenta chaves novas. */
export function mergeConfig(localCfg, remoteCfg) {
  const out = { ...localCfg };
  const added = [];
  for (const [k, v] of Object.entries(remoteCfg || {})) {
    if (!(k in out)) { out[k] = v; added.push(k); }
  }
  return { config: out, added };
}

const depsSignature = (pkg) => JSON.stringify({ d: pkg?.dependencies || {}, o: pkg?.optionalDependencies || {} });

export function runNpmInstall(onLine = () => { }) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const args = ['install', '--force', '--no-audit', '--no-fund', '--no-bin-links'];
    const p = isWin ? spawn(['npm', ...args].join(' '), { cwd: BOT_ROOT, shell: true }) : spawn('npm', args, { cwd: BOT_ROOT });
    let log = '';
    const take = (d) => { log += d; if (log.length > 20000) log = log.slice(-20000); String(d).split('\n').filter(Boolean).forEach(onLine); };
    p.stdout.on('data', take);
    p.stderr.on('data', take);
    p.on('error', (e) => resolve({ ok: false, log: e.message }));
    p.on('close', (c) => resolve({ ok: c === 0, log: log.slice(-1500) }));
  });
}

/**
 * Baixa e aplica a atualização.
 * @param {(texto: string) => any} progress  recebe mensagens de andamento
 * @returns {{ changed, added, configAdded, depsChanged, npmOk, version, sha, backup }}
 */
export async function applyUpdate(progress = () => { }, { force = false } = {}) {
  if (global.__astaUpdating) throw new Error('já existe uma atualização em andamento');
  global.__astaUpdating = true; // o vigia de arquivos não reinicia o bot no meio
  try {
    const info = await checkForUpdate();
    if (!info.available && !force) return { nothing: true, ...info };
    const src = updateSource();

    await progress(`📥 Baixando a versão ${info.latest} (${info.shortSha})...`);
    const { data } = await http.get(src.tarUrl(info.tarRef || info.sha), { responseType: 'arraybuffer', headers: { Accept: '*/*' } });
    const tar = zlib.gunzipSync(Buffer.from(data));
    const entries = untar(tar);
    if (!entries.length) throw new Error('o arquivo baixado veio vazio');
    // o GitHub coloca tudo dentro de "repo-<sha>/": tira essa primeira pasta
    const root = entries[0].name.split('/')[0] + '/';
    const files = entries
      .filter((e) => e.name.startsWith(root))
      .map((e) => ({ rel: norm(e.name.slice(root.length)), data: e.data }))
      .filter((e) => e.rel && !e.rel.endsWith('/'));
    if (!files.some((f) => f.rel === 'package.json') || !files.some((f) => f.rel.startsWith('dados/src/'))) {
      throw new Error('o download não parece ser o ASTA MD (faltam arquivos principais)');
    }

    // separa o que muda
    const toWrite = [];
    let remoteCfg = null, remotePkg = null;
    for (const f of files) {
      if (f.rel.includes('..') || path.isAbsolute(f.rel)) continue;
      if (NEVER.some((r) => r.test(f.rel))) continue;
      if (f.rel === 'dados/src/config.json') { try { remoteCfg = JSON.parse(f.data.toString('utf-8')); } catch { } continue; }
      if (f.rel === 'package.json') { try { remotePkg = JSON.parse(f.data.toString('utf-8')); } catch { } }
      const dest = path.join(BOT_ROOT, f.rel);
      const exists = fs.existsSync(dest);
      if (exists && KEEP_IF_EXISTS.some((r) => r.test(f.rel))) continue;
      if (exists) {
        try { if (Buffer.compare(fs.readFileSync(dest), f.data) === 0) continue; } catch { }
      }
      toWrite.push({ ...f, dest, exists });
    }

    // backup dos arquivos que vão ser trocados
    let backup = null;
    const old = toWrite.filter((f) => f.exists).map((f) => ({ name: f.rel, data: fs.readFileSync(f.dest) }));
    if (old.length) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      backup = path.join(BACKUP_DIR, `antes-de-${info.latest}-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`);
      fs.writeFileSync(backup, makeZip(old));
      const all = fs.readdirSync(BACKUP_DIR).filter((n) => n.endsWith('.zip')).sort();
      for (const n of all.slice(0, Math.max(0, all.length - 3))) fs.rmSync(path.join(BACKUP_DIR, n), { force: true });
    }

    const oldPkg = readJson(path.join(BOT_ROOT, 'package.json'), {});
    await progress(`🧩 Aplicando ${toWrite.length} arquivo(s)...`);
    for (const f of toWrite) {
      fs.mkdirSync(path.dirname(f.dest), { recursive: true });
      const tmp = `${f.dest}.atualizando`;
      fs.writeFileSync(tmp, f.data);
      fs.renameSync(tmp, f.dest);
    }

    // config.json: só acrescenta o que é novo
    let configAdded = [];
    if (remoteCfg) {
      const localCfg = readJson(CONFIG_FILE, null);
      if (localCfg) {
        const m = mergeConfig(localCfg, remoteCfg);
        configAdded = m.added;
        if (m.added.length) writeJson(CONFIG_FILE, m.config);
      } else {
        writeJson(CONFIG_FILE, remoteCfg);
      }
    }

    // dependências mudaram? instala
    const depsChanged = !!remotePkg && depsSignature(remotePkg) !== depsSignature(oldPkg);
    let npmOk = true;
    if (depsChanged) {
      await progress('📦 As dependências mudaram — instalando (pode levar alguns minutos)...');
      const r = await runNpmInstall();
      npmOk = r.ok;
      if (!r.ok) await progress(`⚠️ O npm install deu erro (o bot vai tentar ligar mesmo assim):\n${r.log.slice(-500)}`);
    }

    writeState({ sha: info.byVersion ? null : info.sha, version: info.latest, appliedAt: Date.now(), from: oldPkg.version || null });
    return {
      changed: toWrite.filter((f) => f.exists).length,
      added: toWrite.filter((f) => !f.exists).length,
      files: toWrite.map((f) => f.rel),
      configAdded, depsChanged, npmOk, version: info.latest, sha: info.sha, shortSha: info.shortSha,
      message: info.message, backup: backup ? path.relative(BOT_ROOT, backup) : null
    };
  } finally {
    global.__astaUpdating = false;
  }
}
