/**
 * ★彡 ASTA MD 彡★ — RECURSOS EXTRAS (v10.9.0)
 * links permitidos · forca de anime · pets · lojinha · cartões em imagem · captcha
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PLUS_DB = path.join(__dirname, '../../../database');

export const readJ = (nome, def = {}) => {
  try { return JSON.parse(fs.readFileSync(path.join(PLUS_DB, nome), 'utf-8')); } catch { return typeof def === 'function' ? def() : JSON.parse(JSON.stringify(def)); }
};
export const writeJ = (nome, data) => {
  const f = path.join(PLUS_DB, nome);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f + '.tmp', JSON.stringify(data, null, 2));
  fs.renameSync(f + '.tmp', f);
};
export const baseNum = (id) => String(id || '').split('@')[0].split(':')[0];
export const xmlEsc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
/** tira emojis e símbolos que a fonte do cartão não desenha */
export const limparTexto = (t, max = 40) => String(t || '').normalize('NFC').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{E000}-\u{F8FF}彡★☆]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max);

/* ------------------------------ LINKS PERMITIDOS ------------------------------ */

const TLDS = 'com|net|org|gov|edu|br|io|gg|dev|xyz|app|co|me|tv|ly|be|link|site|online|store|shop|info|biz|us|uk|pt|es|fun|top|live|club|vip|cc|to|in|ru|jp|de|fr|it';
const RE_URL = new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?((?:[a-z0-9-]+\\.)+(?:${TLDS}))(?![a-z0-9-])(?:[\\/?#][^\\s]*)?`, 'gi');

/** Domínios de todos os links da mensagem (sem "www."). */
export function extrairDominios(texto) {
  const out = new Set();
  const t = String(texto || '').toLowerCase();
  let m;
  RE_URL.lastIndex = 0;
  while ((m = RE_URL.exec(t))) {
    const d = m[1].replace(/^www\./, '').replace(/\.+$/, '');
    if (d && d.includes('.')) out.add(d);
  }
  return [...out];
}

/** Atalhos: "youtube" libera youtube.com, youtu.be e m.youtube.com etc. */
export const LINK_PRESETS = {
  youtube: ['youtube.com', 'youtu.be'],
  tiktok: ['tiktok.com'],
  instagram: ['instagram.com', 'instagr.am'],
  twitter: ['twitter.com', 'x.com', 't.co'],
  x: ['x.com', 'twitter.com', 't.co'],
  facebook: ['facebook.com', 'fb.com', 'fb.watch'],
  spotify: ['spotify.com', 'spotify.link'],
  kwai: ['kwai.com', 'kw.ai'],
  pinterest: ['pinterest.com', 'pin.it'],
  google: ['google.com', 'goo.gl', 'g.co'],
  drive: ['drive.google.com', 'docs.google.com'],
  github: ['github.com'],
  twitch: ['twitch.tv'],
  discord: ['discord.gg', 'discord.com'],
  reddit: ['reddit.com', 'redd.it'],
  shopee: ['shopee.com.br', 'shope.ee'],
  mercadolivre: ['mercadolivre.com.br', 'mercadolivre.com']
};
export function normalizarDominio(entrada) {
  const e = String(entrada || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#\s]/)[0];
  if (LINK_PRESETS[e]) return LINK_PRESETS[e];
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(e)) return [e];
  return [];
}
export const dominioPermitido = (dom, lista = []) => lista.some((d) => dom === d || dom.endsWith('.' + d));
/** true = a mensagem tem link e TODOS são de sites liberados */
export function todosLinksPermitidos(texto, lista = []) {
  if (!lista?.length) return false;
  const doms = extrairDominios(texto);
  return doms.length > 0 && doms.every((d) => dominioPermitido(d, lista));
}
/** links que NÃO estão liberados */
export const linksProibidos = (texto, lista = []) => extrairDominios(texto).filter((d) => !dominioPermitido(d, lista));

/* ------------------------------ FORCA DE ANIME ------------------------------ */

export const FORCA_ANIME = [
  ['naruto', 'Anime: ninja que quer ser Hokage'], ['one piece', 'Anime: piratas atrás do maior tesouro'], ['bleach', 'Anime: shinigami substituto'],
  ['black clover', 'Anime: garoto sem magia com grimório de cinco folhas'], ['dragon ball', 'Anime: esferas que realizam desejos'], ['death note', 'Anime: caderno que mata'],
  ['attack on titan', 'Anime: muralhas e gigantes'], ['demon slayer', 'Anime: caçador de onis com espada'], ['jujutsu kaisen', 'Anime: maldições e feiticeiros'],
  ['hunter x hunter', 'Anime: licença de caçador'], ['fullmetal alchemist', 'Anime: irmãos alquimistas'], ['my hero academia', 'Anime: escola de heróis'],
  ['tokyo ghoul', 'Anime: meio humano, meio ghoul'], ['chainsaw man', 'Anime: garoto com motosserra'], ['spy x family', 'Anime: espião, assassina e telepata'],
  ['one punch man', 'Anime: herói que vence com um soco'], ['sword art online', 'Anime: preso num jogo de realidade virtual'], ['code geass', 'Anime: poder de dar ordens'],
  ['haikyuu', 'Anime: vôlei'], ['blue lock', 'Anime: futebol e egoísmo'], ['dr stone', 'Anime: humanidade petrificada'], ['vinland saga', 'Anime: vikings'],
  ['fairy tail', 'Anime: guilda de magos'], ['mob psycho', 'Anime: garoto com poderes psíquicos'], ['cowboy bebop', 'Anime: caçadores de recompensa no espaço'],
  ['evangelion', 'Anime: robôs gigantes e anjos'], ['frieren', 'Anime: elfa maga depois da jornada'], ['solo leveling', 'Anime: o caçador mais fraco que sobe de nível'],
  ['asta', 'Personagem de Black Clover'], ['yuno', 'Personagem de Black Clover'], ['yami sukehiro', 'Capitão dos Touros Negros'], ['noelle silva', 'Maga de água de Black Clover'],
  ['luffy', 'Personagem de One Piece'], ['zoro', 'Espadachim de One Piece'], ['nami', 'Navegadora de One Piece'], ['sanji', 'Cozinheiro de One Piece'],
  ['goku', 'Personagem de Dragon Ball'], ['vegeta', 'Príncipe dos saiyajins'], ['gohan', 'Filho do Goku'], ['sasuke', 'Personagem de Naruto'], ['kakashi', 'Sensei de Naruto'],
  ['itachi', 'Irmão do Sasuke'], ['ichigo', 'Personagem de Bleach'], ['light yagami', 'Dono do Death Note'], ['eren yeager', 'Personagem de Attack on Titan'],
  ['levi', 'Capitão de Attack on Titan'], ['tanjiro', 'Personagem de Demon Slayer'], ['nezuko', 'Irmã do Tanjiro'], ['gojo satoru', 'Feiticeiro de Jujutsu Kaisen'],
  ['itadori', 'Personagem de Jujutsu Kaisen'], ['sukuna', 'Rei das Maldições'], ['gon', 'Personagem de Hunter x Hunter'], ['killua', 'Amigo do Gon'],
  ['edward elric', 'Alquimista de aço'], ['deku', 'Personagem de My Hero Academia'], ['bakugo', 'Rival do Deku'], ['denji', 'Personagem de Chainsaw Man'],
  ['anya', 'Personagem de Spy x Family'], ['saitama', 'Personagem de One Punch Man'], ['kirito', 'Personagem de Sword Art Online'], ['lelouch', 'Personagem de Code Geass'],
  ['natsu', 'Personagem de Fairy Tail'], ['senku', 'Personagem de Dr Stone'], ['thorfinn', 'Personagem de Vinland Saga'], ['kaneki', 'Personagem de Tokyo Ghoul']
];
export const sortearForca = () => { const [p, d] = FORCA_ANIME[Math.floor(Math.random() * FORCA_ANIME.length)]; return { palavra: p, dica: d }; };
export const semAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const mascarar = (palavra, letras) => [...palavra].map((c) => (c === ' ' ? '  ' : letras.has(semAcento(c)) ? c.toUpperCase() : '_')).join(' ');
export const forcaCompleta = (palavra, letras) => [...semAcento(palavra)].every((c) => c === ' ' || !/[a-z0-9]/.test(c) || letras.has(c));
const BONECO = [
  ' +---+\n |   |\n     |\n     |\n     |\n=====',
  ' +---+\n |   |\n O   |\n     |\n     |\n=====',
  ' +---+\n |   |\n O   |\n |   |\n     |\n=====',
  ' +---+\n |   |\n O   |\n/|   |\n     |\n=====',
  ' +---+\n |   |\n O   |\n/|\\  |\n     |\n=====',
  ' +---+\n |   |\n O   |\n/|\\  |\n/    |\n=====',
  ' +---+\n |   |\n O   |\n/|\\  |\n/ \\  |\n====='
];
export const desenhoForca = (erros) => '```' + BONECO[Math.min(6, erros)] + '```';

/* ---------------------------------- PETS ---------------------------------- */

export const PET_ESPECIES = [
  { id: 'sylph', nome: 'Sylph', e: '🌪️', elem: 'Vento' },
  { id: 'salamandra', nome: 'Salamandra', e: '🔥', elem: 'Fogo' },
  { id: 'undine', nome: 'Undine', e: '🌊', elem: 'Água' },
  { id: 'gnomo', nome: 'Gnomo', e: '🪨', elem: 'Terra' },
  { id: 'nero', nome: 'Nero', e: '🐦', elem: 'Selamento' },
  { id: 'lumiere', nome: 'Lumière', e: '✨', elem: 'Luz' }
];
export const PET_ESTAGIOS = [
  { xp: 0, nome: 'Filhote' }, { xp: 120, nome: 'Jovem' }, { xp: 400, nome: 'Adulto' }, { xp: 1000, nome: 'Espírito Lendário' }
];
export const petEstagio = (xp) => { let s = PET_ESTAGIOS[0]; for (const e of PET_ESTAGIOS) if (xp >= e.xp) s = e; return s; };
export const proximoEstagio = (xp) => PET_ESTAGIOS.find((e) => e.xp > xp) || null;
const HORA = 3600e3;
/** Aplica o tempo passado (fome e felicidade caem). Retorna { pet, fugiu } */
export function petTick(pet, now = Date.now()) {
  if (!pet) return { pet: null, fugiu: false };
  const h = Math.max(0, (now - (pet.tick || now)) / HORA);
  pet.fome = Math.max(0, (pet.fome ?? 100) - h * 4);
  pet.feliz = Math.max(0, (pet.feliz ?? 100) - h * 3);
  pet.energia = Math.min(100, (pet.energia ?? 100) + h * 10);
  pet.tick = now;
  if (pet.fome <= 0 && pet.feliz <= 0) { pet.abandonadoDesde = pet.abandonadoDesde || now; }
  else pet.abandonadoDesde = null;
  // se ficou com fome E triste por mais de 24h, ele foge
  const fugiu = !!(pet.abandonadoDesde && now - pet.abandonadoDesde > 24 * HORA);
  return { pet, fugiu };
}
export const barra = (v, n = 10) => { const k = Math.round(Math.max(0, Math.min(100, v)) / (100 / n)); return '█'.repeat(k) + '░'.repeat(n - k) + ` ${Math.round(v)}%`; };

/* --------------------------------- LOJINHA --------------------------------- */

export const LOJA_TITULOS = [
  { id: 1, nome: 'Cavaleiro Mágico', preco: 200 },
  { id: 2, nome: 'Touro Negro', preco: 350 },
  { id: 3, nome: 'Vice-Capitão', preco: 600 },
  { id: 4, nome: 'Capitão de Esquadrão', preco: 1000 },
  { id: 5, nome: 'Usuário de Antimagia', preco: 1500 },
  { id: 6, nome: 'Portador do Grimório de 5 Folhas', preco: 2500 },
  { id: 7, nome: 'Rei Mago', preco: 5000 }
];
export const LOJA_CORES = {
  vermelho: ['#7f1d1d', '#ef4444'], azul: ['#1e3a8a', '#3b82f6'], roxo: ['#4c1d95', '#a855f7'], verde: ['#14532d', '#22c55e'],
  dourado: ['#78350f', '#f59e0b'], rosa: ['#831843', '#ec4899'], ciano: ['#164e63', '#06b6d4'], preto: ['#0a0a0a', '#404040']
};
export const PRECO_COR = 150;
export const LOJA_ITENS = {
  escudo: { nome: '🛡️ Escudo contra roubo (24h)', preco: 300, horas: 24 },
  dobro: { nome: '⚡ Bônus em dobro de 💰 (1h)', preco: 500, horas: 1 }
};
export const lojaUser = (db, jid) => (db[baseNum(jid)] ||= { titulos: [], cores: [] });
export const temEscudo = (jid, now = Date.now()) => (readJ('asta-loja.json')[baseNum(jid)]?.escudoAte || 0) > now;
export const temDobro = (jid, now = Date.now()) => (readJ('asta-loja.json')[baseNum(jid)]?.dobroAte || 0) > now;
/** valor ganho com o bônus em dobro aplicado */
export const comDobro = (jid, valor) => (temDobro(jid) ? valor * 2 : valor);

/* ------------------------------ CARTÕES (imagem) ------------------------------ */

export const TEMAS_BV = {
  asta: { nome: 'Asta (vermelho e preto)', c1: '#0b0b0f', c2: '#5b0000', acc: '#ff2a2a', txt: '#ffffff' },
  noite: { nome: 'Noite (azul)', c1: '#020617', c2: '#1e3a8a', acc: '#60a5fa', txt: '#ffffff' },
  roxo: { nome: 'Roxo neon', c1: '#1a0530', c2: '#6d28d9', acc: '#e879f9', txt: '#ffffff' },
  verde: { nome: 'Floresta', c1: '#03140a', c2: '#14532d', acc: '#4ade80', txt: '#ffffff' },
  dourado: { nome: 'Dourado', c1: '#1c1300', c2: '#78350f', acc: '#fbbf24', txt: '#fff7e6' },
  rosa: { nome: 'Rosa', c1: '#2a0716', c2: '#9d174d', acc: '#f9a8d4', txt: '#ffffff' },
  claro: { nome: 'Claro', c1: '#f8fafc', c2: '#cbd5e1', acc: '#dc2626', txt: '#0f172a' }
};
const FONTE = "DejaVu Sans, Arial, Helvetica, sans-serif";

async function avatarCircular(foto, tam, iniciais, cor) {
  let base = null;
  if (foto) { try { base = await sharp(foto).resize(tam, tam, { fit: 'cover' }).png().toBuffer(); } catch { base = null; } }
  if (!base) {
    base = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}"><rect width="100%" height="100%" fill="${cor}"/><text x="50%" y="54%" font-family="${FONTE}" font-size="${Math.round(tam * 0.42)}" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${xmlEsc(iniciais || '?')}</text></svg>`)).png().toBuffer();
  }
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}"><circle cx="${tam / 2}" cy="${tam / 2}" r="${tam / 2}" fill="#fff"/></svg>`);
  return sharp(base).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}
const iniciaisDe = (nome) => limparTexto(nome, 30).split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
const encurtar = (t, n) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

/** Cartão de boas-vindas 1000x420 (JPG). */
export async function cartaoBoasVindas({ foto, nome, grupo, numero, tema = 'asta' }) {
  const T = TEMAS_BV[tema] || TEMAS_BV.asta;
  const W = 1000, H = 420, A = 230;
  const nomeL = encurtar(limparTexto(nome, 40) || 'Novo membro', 24);
  const grupoL = encurtar(limparTexto(grupo, 60) || "o grupo", 30);
  const fundo = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.c1}"/><stop offset="1" stop-color="${T.c2}"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<circle cx="${W - 60}" cy="40" r="170" fill="${T.acc}" opacity="0.10"/><circle cx="80" cy="${H + 30}" r="160" fill="${T.acc}" opacity="0.08"/>
<rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="28" fill="none" stroke="${T.acc}" stroke-opacity="0.55" stroke-width="3"/>
<circle cx="${70 + A / 2}" cy="${H / 2}" r="${A / 2 + 9}" fill="${T.acc}"/>
<text x="360" y="128" font-family="${FONTE}" font-size="30" font-weight="700" fill="${T.acc}" letter-spacing="6">BEM-VINDO(A)</text>
<text x="360" y="200" font-family="${FONTE}" font-size="58" font-weight="800" fill="${T.txt}">${xmlEsc(nomeL)}</text>
<text x="360" y="255" font-family="${FONTE}" font-size="26" fill="${T.txt}" opacity="0.85">ao grupo ${xmlEsc(grupoL)}</text>
<rect x="360" y="290" width="${Math.max(260, 40 + String(numero).length * 20 + 230)}" height="62" rx="31" fill="${T.acc}" opacity="0.18"/>
<text x="388" y="332" font-family="${FONTE}" font-size="30" font-weight="700" fill="${T.txt}">Membro nº ${xmlEsc(numero)}</text>
</svg>`;
  const av = await avatarCircular(foto, A, iniciaisDe(nome), T.acc);
  return sharp(Buffer.from(fundo)).composite([{ input: av, left: 70, top: Math.round(H / 2 - A / 2) }]).jpeg({ quality: 90 }).toBuffer();
}

/** Cartão de perfil 1000x560 (JPG). */
export async function cartaoPerfil({ foto, nome, titulo, cor = 'vermelho', linhas = [], rodape = '' }) {
  const [c1, c2] = LOJA_CORES[cor] || LOJA_CORES.vermelho;
  const W = 1000, H = 560, A = 210;
  const nomeL = encurtar(limparTexto(nome, 40) || 'Usuário', 22);
  const tit = titulo ? encurtar(limparTexto(titulo, 50), 34) : '';
  const ls = linhas.slice(0, 6).map((l, i) => {
    const y = 300 + i * 40;
    return `<text x="70" y="${y}" font-family="${FONTE}" font-size="26" fill="#ffffff" opacity="0.75">${xmlEsc(limparTexto(l[0], 22))}</text><text x="380" y="${y}" font-family="${FONTE}" font-size="26" font-weight="700" fill="#ffffff">${xmlEsc(encurtar(limparTexto(String(l[1]), 60), 40))}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="100%" height="100%" fill="#0b0b0f"/><rect width="100%" height="240" fill="url(#g)"/>
<rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="26" fill="none" stroke="${c2}" stroke-width="3"/>
<circle cx="${70 + A / 2}" cy="130" r="${A / 2 + 8}" fill="#0b0b0f"/>
<text x="320" y="125" font-family="${FONTE}" font-size="52" font-weight="800" fill="#ffffff">${xmlEsc(nomeL)}</text>
${tit ? `<text x="320" y="175" font-family="${FONTE}" font-size="28" font-weight="700" fill="#ffffff" opacity="0.9">${xmlEsc(tit)}</text>` : ''}
${ls}
${rodape ? `<text x="${W - 50}" y="${H - 40}" font-family="${FONTE}" font-size="20" fill="#ffffff" opacity="0.45" text-anchor="end">${xmlEsc(limparTexto(rodape, 60))}</text>` : ''}
</svg>`;
  const av = await avatarCircular(foto, A, iniciaisDe(nome), c2);
  return sharp(Buffer.from(svg)).composite([{ input: av, left: 70, top: 130 - A / 2 }]).jpeg({ quality: 90 }).toBuffer();
}

/** Imagem do código de confirmação (com riscos, para robôs não lerem fácil). */
export async function captchaImagem(codigo) {
  const W = 520, H = 200;
  const r = (a, b) => a + Math.random() * (b - a);
  let riscos = '';
  for (let i = 0; i < 9; i++) riscos += `<line x1="${r(0, W)}" y1="${r(0, H)}" x2="${r(0, W)}" y2="${r(0, H)}" stroke="hsl(${r(0, 360)},70%,60%)" stroke-width="${r(2, 4)}" opacity="0.7"/>`;
  for (let i = 0; i < 60; i++) riscos += `<circle cx="${r(0, W)}" cy="${r(0, H)}" r="${r(1, 3)}" fill="#fff" opacity="${r(0.2, 0.6)}"/>`;
  const digs = [...String(codigo)].map((d, i) => `<text x="${95 + i * 105}" y="${r(120, 145)}" transform="rotate(${r(-18, 18)} ${95 + i * 105} 120)" font-family="${FONTE}" font-size="${Math.round(r(84, 100))}" font-weight="800" fill="hsl(${r(0, 360)},80%,72%)">${d}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" rx="24" fill="#111827"/>${riscos}${digs}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}
