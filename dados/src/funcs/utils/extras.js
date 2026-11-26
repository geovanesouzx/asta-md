/**
 * EXTRAS DO ASTA MD — funções de apoio usadas por vários comandos novos:
 * estatísticas de grupo, duração ("30m", "2h"), armazenamento JSON, zip, conversão para nota de voz,
 * banco de perguntas do quiz e títulos temáticos.
 */
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_DIR = path.join(__dirname, '..', '..', '..', 'database');

/* ------------------------------ JSON simples ------------------------------ */

export const readJson = (file, def) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return def; }
};
export const writeJson = (file, data) => {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
    return true;
  } catch (e) {
    console.error('[EXTRAS] Erro ao salvar', file, e.message);
    return false;
  }
};

/* ------------------------------- duração ------------------------------- */

/** "30s" "10m" "10min" "2h" "1d" -> milissegundos (ou null) */
export const parseDuration = (txt) => {
  const m = String(txt || '').trim().toLowerCase().match(/^(\d+(?:[.,]\d+)?)\s*(s|seg|m|min|h|hr|hora|horas|d|dia|dias)$/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  const unit = m[2];
  const mult = unit.startsWith('s') ? 1e3 : (unit === 'm' || unit === 'min') ? 6e4 : unit.startsWith('h') ? 36e5 : 864e5;
  const ms = Math.round(n * mult);
  return ms > 0 ? ms : null;
};

export const formatDuration = (ms) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 24) return r ? `${h}h ${r}min` : `${h}h`;
  const d = Math.floor(h / 24), rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
};

export const baseId = (jid) => String(jid || '').split('@')[0].split(':')[0];

export const todaySP = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
export const hourSP = (d = new Date()) => Number(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false })) % 24;

/* --------------------------- estatísticas de grupo --------------------------- */
// Guarda na memória e grava a cada 60s (evita escrever no disco a cada mensagem).

const STATS_DIR = path.join(DB_DIR, 'estatisticas');
const statsCache = new Map(); // groupId -> data
const statsDirty = new Set();
const KEEP_DAYS = 15;

const statsFile = (g) => path.join(STATS_DIR, `${g.replace(/[^\w@.-]/g, '_')}.json`);
const loadStats = (g) => {
  if (!statsCache.has(g)) statsCache.set(g, readJson(statsFile(g), { days: {} }));
  return statsCache.get(g);
};
const dayObj = (data, day) => (data.days[day] ||= { total: 0, users: {}, hours: {}, joins: 0, leaves: 0 });

export const flushStats = () => {
  for (const g of statsDirty) {
    const data = statsCache.get(g);
    if (!data) continue;
    const keys = Object.keys(data.days).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete data.days[k];
    writeJson(statsFile(g), data);
  }
  statsDirty.clear();
};
if (!global.__astaStatsFlush) {
  global.__astaStatsFlush = setInterval(flushStats, 60_000);
  process.once('beforeExit', flushStats);
}

export const recordMessage = (groupId, userId) => {
  if (!groupId?.endsWith('@g.us') || !userId) return;
  const d = dayObj(loadStats(groupId), todaySP());
  d.total++;
  d.users[userId] = (d.users[userId] || 0) + 1;
  const h = hourSP();
  d.hours[h] = (d.hours[h] || 0) + 1;
  statsDirty.add(groupId);
};
export const recordJoin = (groupId, n = 1) => { const d = dayObj(loadStats(groupId), todaySP()); d.joins += n; statsDirty.add(groupId); };
export const recordLeave = (groupId, n = 1) => { const d = dayObj(loadStats(groupId), todaySP()); d.leaves += n; statsDirty.add(groupId); };

/** Soma os últimos `days` dias (1 = hoje). */
export const getStats = (groupId, days = 1) => {
  const data = loadStats(groupId);
  const out = { total: 0, users: {}, hours: {}, joins: 0, leaves: 0, days };
  for (let i = 0; i < days; i++) {
    const day = todaySP(new Date(Date.now() - i * 864e5));
    const d = data.days[day];
    if (!d) continue;
    out.total += d.total; out.joins += d.joins; out.leaves += d.leaves;
    for (const [u, n] of Object.entries(d.users)) out.users[u] = (out.users[u] || 0) + n;
    for (const [h, n] of Object.entries(d.hours)) out.hours[h] = (out.hours[h] || 0) + n;
  }
  return out;
};

/* --------------------------------- zip --------------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

/** Cria um .zip (deflate) a partir de [{ name, data: Buffer }]. */
export const makeZip = (files) => {
  const locals = [], centrals = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  for (const f of files) {
    const name = Buffer.from(f.name.replace(/\\/g, '/'), 'utf-8');
    const raw = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data);
    const comp = zlib.deflateRawSync(raw, { level: 9 });
    const crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
};

/** Lista arquivos de uma pasta (recursivo), ignorando nomes/pastas que batem com `skip`. */
export const listFiles = (dir, skip = /$^/, base = dir) => {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full);
    if (skip.test(rel) || skip.test(e.name)) continue;
    if (e.isDirectory()) out.push(...listFiles(full, skip, base));
    else if (e.isFile()) out.push(rel);
  }
  return out;
};

/* ------------------------- áudio: MP3 -> nota de voz ------------------------- */

export const toVoiceNote = (buffer) => new Promise((resolve, reject) => {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '48k', '-f', 'ogg', 'pipe:1']);
  const chunks = [];
  let err = '';
  p.stdout.on('data', (c) => chunks.push(c));
  p.stderr.on('data', (d) => { err += d; });
  p.on('error', reject);
  p.on('close', (code) => (code === 0 && chunks.length ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg ${code}: ${err.slice(-200)}`))));
  p.stdin.on('error', () => {});
  p.stdin.end(buffer);
});

/* ------------------------------ títulos (níveis) ------------------------------ */

export const ASTA_PATENTS = [
  { name: '🌱 Plebeu', minLevel: 1 },
  { name: '📜 Aprendiz de Grimório', minLevel: 3 },
  { name: '🗡️ Cavaleiro Mágico', minLevel: 5 },
  { name: '⚔️ Cavaleiro Sênior', minLevel: 10 },
  { name: '🛡️ Cavaleiro de Elite', minLevel: 15 },
  { name: '🔥 Vice-Capitão', minLevel: 20 },
  { name: '👑 Capitão', minLevel: 30 },
  { name: '🌌 Comandante Supremo', minLevel: 40 },
  { name: '⚡ Lenda do Reino', minLevel: 50 },
  { name: '🌑 Anti-Magia Desperta', minLevel: 70 },
  { name: '👹 Rei Mago', minLevel: 100 }
];

/* --------------------------------- quiz --------------------------------- */
// a = índice da resposta certa

export const QUIZ_ANIME = [
  { q: 'Em Naruto, qual é o nome da raposa de nove caudas?', o: ['Kurama', 'Shukaku', 'Gyuki', 'Matatabi'], a: 0 },
  { q: 'Qual é o sonho do Luffy em One Piece?', o: ['Ser Hokage', 'Ser o Rei dos Piratas', 'Ser o Rei Mago', 'Achar as Esferas'], a: 1 },
  { q: 'Em Dragon Ball, quantas Esferas do Dragão existem na Terra?', o: ['5', '6', '7', '9'], a: 2 },
  { q: 'Em Death Note, qual é o nome do shinigami que deixa cair o caderno?', o: ['Rem', 'Ryuk', 'Sidoh', 'Gelus'], a: 1 },
  { q: 'Em Attack on Titan, qual é o sobrenome do Eren?', o: ['Ackerman', 'Arlert', 'Yeager', 'Braun'], a: 2 },
  { q: 'Qual anime tem um personagem chamado Tanjiro Kamado?', o: ['Jujutsu Kaisen', 'Demon Slayer', 'Bleach', 'Chainsaw Man'], a: 1 },
  { q: 'Em My Hero Academia, qual é o nome da individualidade passada para o Deku?', o: ['One For All', 'All For One', 'Explosão', 'Meio-Frio Meio-Quente'], a: 0 },
  { q: 'Em Fullmetal Alchemist, qual é a primeira lei da alquimia?', o: ['Troca equivalente', 'Transmutação humana', 'Pedra filosofal', 'Círculo perfeito'], a: 0 },
  { q: 'Em Jujutsu Kaisen, quem é o professor do Yuji Itadori?', o: ['Nanami', 'Satoru Gojo', 'Sukuna', 'Yaga'], a: 1 },
  { q: 'Em Hunter x Hunter, qual é o tipo de Nen do Gon?', o: ['Emissor', 'Transmutador', 'Intensificador', 'Manipulador'], a: 2 },
  { q: 'Em Bleach, qual é a profissão de Ichigo após ganhar poderes?', o: ['Hollow', 'Shinigami substituto', 'Quincy', 'Arrancar'], a: 1 },
  { q: 'Em One Piece, qual é a fruta do diabo do Luffy (nome original)?', o: ['Gomu Gomu', 'Mera Mera', 'Hito Hito', 'Gura Gura'], a: 0 },
  { q: 'Em Naruto, qual é o clã do Sasuke?', o: ['Hyuga', 'Uzumaki', 'Uchiha', 'Senju'], a: 2 },
  { q: 'Em Dragon Ball Z, qual é o nome do filho mais velho do Goku?', o: ['Goten', 'Gohan', 'Trunks', 'Pan'], a: 1 },
  { q: 'Em Tokyo Ghoul, o que é o Ken Kaneki após o acidente?', o: ['Humano', 'Meio-ghoul', 'Vampiro', 'Titã'], a: 1 },
  { q: 'Qual estúdio é famoso por "A Viagem de Chihiro"?', o: ['Toei', 'MAPPA', 'Ghibli', 'Bones'], a: 2 },
  { q: 'Em Chainsaw Man, qual é o nome do demônio-motosserra?', o: ['Pochita', 'Power', 'Makima', 'Aki'], a: 0 },
  { q: 'Em Spy x Family, qual é o poder da Anya?', o: ['Voar', 'Ler mentes', 'Ficar invisível', 'Ver o futuro'], a: 1 },
  { q: 'Em Sword Art Online, qual é o nome do protagonista no jogo?', o: ['Kirito', 'Asuna', 'Klein', 'Eugeo'], a: 0 },
  { q: 'Em Haikyuu!!, qual esporte é jogado?', o: ['Basquete', 'Vôlei', 'Futebol', 'Beisebol'], a: 1 },
  { q: 'Em Naruto, qual é o sonho do Naruto?', o: ['Ser Hokage', 'Ser Kazekage', 'Vingar o clã', 'Ser Sannin'], a: 0 },
  { q: 'Em One Punch Man, quantos socos o Saitama precisa normalmente?', o: ['Um', 'Dois', 'Três', 'Dez'], a: 0 },
  { q: 'Em Pokémon, qual é o Pokémon inicial do Ash?', o: ['Charmander', 'Squirtle', 'Pikachu', 'Bulbasaur'], a: 2 },
  { q: 'Em Dragon Ball, qual é o nome da transformação dourada mais famosa?', o: ['Kaioken', 'Super Saiyajin', 'Ultra Instinto', 'Oozaru'], a: 1 },
  { q: 'Em Demon Slayer, qual é a respiração do Tanjiro no início?', o: ['Chama', 'Trovão', 'Água', 'Vento'], a: 2 },
  { q: 'Em Attack on Titan, qual é o nome da muralha mais externa?', o: ['Maria', 'Rose', 'Sina', 'Paradis'], a: 0 },
  { q: 'Em Jujutsu Kaisen, Sukuna é conhecido como...', o: ['Rei das Maldições', 'Deus do Trovão', 'Rei Pirata', 'Sexto Hokage'], a: 0 },
  { q: 'Em Fairy Tail, qual é a magia principal do Natsu?', o: ['Gelo', 'Dragon Slayer de fogo', 'Espíritos celestiais', 'Requip'], a: 1 },
  { q: 'Em Death Note, qual é o nome verdadeiro do "L"?', o: ['L Lawliet', 'Light Yagami', 'Near River', 'Mello Keehl'], a: 0 },
  { q: 'Em Naruto, como se chama a técnica de esfera de chakra do Naruto?', o: ['Chidori', 'Rasengan', 'Amaterasu', 'Kamui'], a: 1 },
  { q: 'Em One Piece, quem é o espadachim do bando do Chapéu de Palha?', o: ['Sanji', 'Usopp', 'Zoro', 'Franky'], a: 2 },
  { q: 'Em Black Clover, qual é o nome do esquadrão do protagonista?', o: ['Touros Negros', 'Águias Prateadas', 'Leões Carmesins', 'Aurora Dourada'], a: 0 },
  { q: 'Em Black Clover, quantas folhas tem o grimório do protagonista?', o: ['Três', 'Quatro', 'Cinco', 'Uma'], a: 2 },
  { q: 'Em Black Clover, qual é o maior título que os magos buscam?', o: ['Rei Mago', 'Hokage', 'Rei Pirata', 'Hashira'], a: 0 },
  { q: 'Em Hunter x Hunter, qual é o sobrenome do Killua?', o: ['Freecss', 'Zoldyck', 'Kurta', 'Netero'], a: 1 },
  { q: 'Em Code Geass, qual é o nome do poder do Lelouch?', o: ['Geass', 'Nen', 'Haki', 'Stand'], a: 0 },
  { q: 'Em JoJo, como se chamam os espíritos de luta?', o: ['Stands', 'Personas', 'Quirks', 'Espectros'], a: 0 },
  { q: 'Em Dr. Stone, qual é o objetivo do Senku?', o: ['Reconstruir a civilização', 'Virar rei', 'Derrotar titãs', 'Achar o One Piece'], a: 0 },
  { q: 'Em Mob Psycho 100, o que acontece quando o Mob chega a 100%?', o: ['Ele dorme', 'Explode de emoção', 'Perde poderes', 'Vira demônio'], a: 1 },
  { q: 'Em Blue Lock, qual esporte é o foco?', o: ['Basquete', 'Futebol', 'Tênis', 'Boxe'], a: 1 }
];

// ===================== AGENDAMENTO REPETIDO =====================
const DIAS_SEMANA = { domingo: 0, dom: 0, segunda: 1, seg: 1, terca: 2, 'terça': 2, ter: 2, quarta: 3, qua: 3, quinta: 4, qui: 4, sexta: 5, sex: 5, sabado: 6, 'sábado': 6, sab: 6 };
const NOMES_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * Lê o começo do !agendar para repetição:
 *  "todo dia 08:00 ..."  ·  "toda segunda 08:00 ..."  ·  "dias uteis 08:00 ..."  ·  "fim de semana 10:00 ..."
 * @returns {{ repeat, hh, mm, rest } | null}
 */
export function parseRepeatSchedule(text) {
  const t = String(text || '').trim();
  const low = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const tm = '(\\d{1,2}):(\\d{2})';
  let m;
  if ((m = low.match(new RegExp(`^(?:todo dia|todos os dias|diariamente|diario)\\s+(?:as\\s+)?${tm}`)))) return { repeat: { type: 'daily' }, hh: +m[1], mm: +m[2], rest: t.slice(m[0].length).trim() };
  if ((m = low.match(new RegExp(`^(?:dias? uteis|seg a sex|segunda a sexta)\\s+(?:as\\s+)?${tm}`)))) return { repeat: { type: 'days', days: [1, 2, 3, 4, 5] }, hh: +m[1], mm: +m[2], rest: t.slice(m[0].length).trim() };
  if ((m = low.match(new RegExp(`^(?:fim de semana|fds|finais de semana)\\s+(?:as\\s+)?${tm}`)))) return { repeat: { type: 'days', days: [0, 6] }, hh: +m[1], mm: +m[2], rest: t.slice(m[0].length).trim() };
  if ((m = low.match(new RegExp(`^tod[ao]s?\\s+(?:as\\s+|os\\s+)?(domingo|segunda|terca|quarta|quinta|sexta|sabado)s?(?:-feira|\\s+feira)?s?\\s+(?:as\\s+)?${tm}`)))) {
    return { repeat: { type: 'days', days: [DIAS_SEMANA[m[1]]] }, hh: +m[2], mm: +m[3], rest: t.slice(m[0].length).trim() };
  }
  return null;
}

/** Próximo horário (timestamp) de um agendamento repetido, no horário de São Paulo (UTC-3). */
export function nextRepeatAt(repeat, hh, mm, after = Date.now()) {
  const days = repeat?.type === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : (repeat?.days || []);
  if (!days.length) return null;
  const sp = new Date(after - 3 * 3600e3);
  for (let add = 0; add <= 8; add++) {
    const at = Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate() + add, hh + 3, mm);
    const dow = new Date(at - 3 * 3600e3).getUTCDay();
    if (at > after + 30_000 && days.includes(dow)) return at;
  }
  return null;
}

export function describeRepeat(repeat) {
  if (!repeat) return '';
  if (repeat.type === 'daily') return 'todo dia';
  const d = [...(repeat.days || [])].sort();
  if (d.join() === '1,2,3,4,5') return 'de segunda a sexta';
  if (d.join() === '0,6') return 'todo fim de semana';
  return 'toda ' + d.map((x) => NOMES_DIA[x]).join(', ');
}
