/**
 * ★彡 ASTA MD 彡★ — RANKING DE FIGURINHAS DO GRUPO (!topfig)
 * Conta quantas vezes cada figurinha foi mandada em cada grupo (pela "impressão digital"
 * da figurinha, o fileSha256, então a mesma figurinha mandada por pessoas diferentes soma).
 * Salva em dados/database/topfig/<grupo>.json (guarda as 150 mais mandadas).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, '../../../database/topfig');
const KEEP = 150;

const toJ = (o) => JSON.parse(JSON.stringify(o, (k, v) => {
  if (v && v.type === 'Buffer' && Array.isArray(v.data)) return { __b64: Buffer.from(v.data).toString('base64') };
  if (v instanceof Uint8Array) return { __b64: Buffer.from(v).toString('base64') };
  return v;
}));
const fromJ = (o) => JSON.parse(JSON.stringify(o), (k, v) => (v && typeof v === 'object' && typeof v.__b64 === 'string') ? Buffer.from(v.__b64, 'base64') : v);

const mem = global.__astaTopFig || (global.__astaTopFig = { groups: new Map(), dirty: new Set(), timer: null });
const fileOf = (g) => path.join(DIR, `${g.replace(/[^0-9a-z@._-]/gi, '_')}.json`);

function load(group) {
  if (mem.groups.has(group)) return mem.groups.get(group);
  let data = { since: Date.now(), items: {} };
  try { data = JSON.parse(fs.readFileSync(fileOf(group), 'utf-8')); } catch { }
  if (!data.items) data.items = {};
  mem.groups.set(group, data);
  return data;
}

function scheduleFlush() {
  if (mem.timer) return;
  mem.timer = setTimeout(() => {
    mem.timer = null;
    try { fs.mkdirSync(DIR, { recursive: true }); } catch { }
    for (const g of mem.dirty) {
      const d = mem.groups.get(g);
      if (!d) continue;
      const entries = Object.entries(d.items).sort((a, b) => b[1].n - a[1].n).slice(0, KEEP);
      d.items = Object.fromEntries(entries);
      try { fs.writeFileSync(fileOf(g), JSON.stringify(d)); } catch { }
    }
    mem.dirty.clear();
  }, 30_000);
}

/** Registra uma figurinha mandada no grupo. */
export function recordSticker(group, sender, message) {
  try {
    const st = message?.stickerMessage || message?.audioStickerMessage?.message?.stickerMessage;
    const sha = st?.fileSha256;
    if (!sha || !group?.endsWith('@g.us')) return;
    const key = Buffer.from(sha).toString('base64');
    const d = load(group);
    const it = d.items[key] || (d.items[key] = { n: 0, people: [], first: Date.now() });
    it.n++;
    it.last = Date.now();
    const who = String(sender || '').split('@')[0].split(':')[0];
    if (who && !it.people.includes(who)) { it.people.push(who); if (it.people.length > 300) it.people.shift(); }
    // guarda a mensagem mais recente (link mais novo da mídia) para o bot conseguir reenviar
    const sound = !!st.audioMessage;
    it.sound = sound || it.sound || false;
    if (sound || !it.msg || !it.sound) it.msg = toJ(message.audioStickerMessage ? { audioStickerMessage: message.audioStickerMessage } : { stickerMessage: st });
    mem.dirty.add(group);
    scheduleFlush();
  } catch { }
}

/** Ranking: [{ pos, n, pessoas, som, msg }] */
export function topStickers(group, limit = 10) {
  const d = load(group);
  return Object.entries(d.items)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, limit)
    .map(([key, it], i) => ({ pos: i + 1, key, n: it.n, pessoas: it.people?.length || 1, som: !!it.sound, last: it.last, msg: it.msg ? fromJ(it.msg) : null }));
}

export const topSince = (group) => load(group).since || Date.now();

export function resetTop(group) {
  mem.groups.set(group, { since: Date.now(), items: {} });
  try { fs.rmSync(fileOf(group), { force: true }); } catch { }
}
