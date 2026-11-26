/**
 * ★彡 ASTA MD 彡★ — JOGOS: duelo de magia (Black Clover) e "adivinhe o anime"
 */
import axios from 'axios';
import sharp from 'sharp';

/* ------------------------------ DUELO ------------------------------ */

export const GRIMORIOS = [
  { nome: 'Antimagia', e: '⚔️', golpe: 'Espada Mata-Demônios', trevos: 5 },
  { nome: 'Fogo', e: '🔥', golpe: 'Leão Flamejante', trevos: 4 },
  { nome: 'Vento', e: '🌪️', golpe: 'Tornado Cortante', trevos: 4 },
  { nome: 'Água', e: '🌊', golpe: 'Dragão de Água', trevos: 3 },
  { nome: 'Luz', e: '✨', golpe: 'Espadas do Julgamento', trevos: 4 },
  { nome: 'Trevas', e: '🌑', golpe: 'Corte Dimensional', trevos: 4 },
  { nome: 'Gelo', e: '❄️', golpe: 'Lança Glacial', trevos: 3 },
  { nome: 'Raio', e: '⚡', golpe: 'Relâmpago Divino', trevos: 4 },
  { nome: 'Espinhos', e: '🌹', golpe: 'Rosa Sangrenta', trevos: 3 },
  { nome: 'Espaço', e: '🌌', golpe: 'Portal Esmagador', trevos: 4 },
  { nome: 'Areia', e: '🏜️', golpe: 'Tempestade de Areia', trevos: 3 },
  { nome: 'Sangue', e: '🩸', golpe: 'Lâmina Carmesim', trevos: 4 }
];
export const sortearGrimorio = () => GRIMORIOS[Math.floor(Math.random() * GRIMORIOS.length)];
export const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

export const barraVida = (hp, max = 100) => {
  const n = Math.max(0, Math.round((hp / max) * 10));
  const cor = hp > 60 ? '🟩' : hp > 30 ? '🟨' : '🟥';
  return cor.repeat(n) + '⬛'.repeat(10 - n) + ` ${Math.max(0, hp)}`;
};

/**
 * Resolve uma ação do turno.
 * @returns {{ dano, cura, texto, erro? }}
 */
export function resolverAcao(acao, g, eu, ele) {
  const grim = g.grim[eu];
  const nomeEu = g.nome[eu];
  let dano = 0, cura = 0, texto = '';
  switch (acao) {
    case 'ataque': {
      dano = rnd(10, 18);
      const crit = Math.random() < 0.15;
      if (crit) dano = Math.round(dano * 1.5);
      texto = `🗡️ *${nomeEu}* atacou${crit ? ' — *CRÍTICO!* 💥' : ''}`;
      break;
    }
    case 'magia': {
      if (Math.random() < 0.25) { texto = `${grim.e} *${nomeEu}* tentou *${grim.golpe}*... e errou! 😵`; break; }
      dano = rnd(18, 30) + (grim.trevos >= 5 ? 3 : 0);
      texto = `${grim.e} *${nomeEu}* usou *${grim.golpe}*!`;
      break;
    }
    case 'defesa': {
      g.def[eu] = true;
      cura = 5;
      texto = `🛡️ *${nomeEu}* se defendeu (o próximo golpe causa metade) e recuperou 5 de vida`;
      break;
    }
    case 'cura': {
      if (!(g.curas[eu] > 0)) return { erro: '💚 Suas curas acabaram! Escolha outra ação.' };
      g.curas[eu]--;
      cura = rnd(12, 20);
      texto = `💚 *${nomeEu}* se curou (+${cura})`;
      break;
    }
    default: return { erro: 'ação inválida' };
  }
  if (dano > 0 && g.def[ele]) { dano = Math.max(1, Math.round(dano / 2)); g.def[ele] = false; texto += ` 🛡️ (defendido: metade do dano)`; }
  if (dano > 0) texto += ` → *-${dano}* em ${g.nome[ele]}`;
  return { dano, cura, texto };
}

/* ------------------------------ ADIVINHA ------------------------------ */

export const normTitulo = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const bigramas = (s) => { const a = []; for (let i = 0; i < s.length - 1; i++) a.push(s.slice(i, i + 2)); return a; };
export function similaridade(a, b) {
  a = normTitulo(a).replace(/ /g, ''); b = normTitulo(b).replace(/ /g, '');
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigramas(a), B = bigramas(b);
  if (!A.length || !B.length) return 0;
  const m = new Map(); for (const x of A) m.set(x, (m.get(x) || 0) + 1);
  let inter = 0; for (const x of B) { const c = m.get(x) || 0; if (c > 0) { inter++; m.set(x, c - 1); } }
  return (2 * inter) / (A.length + B.length);
}

/** A resposta bate com algum título? (aceita nome parcial bom e pequenos erros de digitação) */
export function acertou(resposta, titulos) {
  const r = normTitulo(resposta);
  if (r.length < 3) return false;
  for (const t of titulos) {
    const n = normTitulo(t);
    if (!n) continue;
    if (r === n) return true;
    if (similaridade(r, n) >= 0.82) return true;
    // parte principal do nome (ex.: "naruto" para "naruto shippuden", "one piece" etc.)
    const principal = n.split(/ (?:season|part|the movie|movie|2nd|3rd|\d+th|shippuden|kai|brotherhood)\b/)[0].trim();
    if (principal.length >= 4 && (r === principal || similaridade(r, principal) >= 0.85)) return true;
    if (r.length >= 5 && n.startsWith(r) && r.length >= n.length * 0.6) return true;
  }
  return false;
}

/** Sorteia um anime popular (Jikan / MyAnimeList). */
export async function animeAleatorio() {
  const page = rnd(1, 8);
  const { data } = await axios.get(`https://api.jikan.moe/v4/top/anime?page=${page}&filter=bypopularity`, { timeout: 20_000 });
  const lista = (data?.data || []).filter((a) => a?.images?.jpg?.large_image_url || a?.images?.jpg?.image_url);
  if (!lista.length) throw new Error('lista vazia');
  const a = lista[Math.floor(Math.random() * lista.length)];
  const titulos = [...new Set([a.title, a.title_english, ...(a.title_synonyms || []), ...((a.titles || []).map((t) => t.title))].filter(Boolean))];
  const url = a.images.jpg.large_image_url || a.images.jpg.image_url;
  const { data: img } = await axios.get(url, { responseType: 'arraybuffer', timeout: 20_000 });
  return { titulo: a.title_english || a.title, titulos, imagem: Buffer.from(img), ano: a.year || a.aired?.prop?.from?.year || null };
}

/** Versões da imagem: muito borrada → média → pouco → nítida */
export async function versoesBorradas(img) {
  const base = await sharp(img).resize(512, 720, { fit: 'inside', withoutEnlargement: false }).jpeg({ quality: 88 }).toBuffer();
  const blur = (s) => sharp(base).blur(s).jpeg({ quality: 85 }).toBuffer();
  return [await blur(45), await blur(22), await blur(8), base];
}
