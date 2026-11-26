/**
 * ★彡 ASTA MD 彡★ — DOWNLOADER UNIVERSAL (!baixar)
 *
 * Baixa vídeo/áudio/imagem de vários apps a partir do link:
 * TikTok, YouTube, Instagram, Twitter/X, Facebook, Kwai, Pinterest, Reddit,
 * Threads, Snapchat, Tumblr, Vimeo, Dailymotion, Likee, Bilibili, Capcut,
 * Twitch (clips), SoundCloud e muitos outros.
 *
 * Motor principal: nayan-video-downloader (o mesmo já usado no !facebook do bot),
 * que é um "all-in-one" e cobre a maioria dos sites. Para o Pinterest, tem um
 * resolvedor próprio (lê o og:video / og:image da página).
 *
 * Retorno padrão:
 *   { ok: true, plataforma, titulo, itens: [{ type:'video'|'image'|'audio', url?, buffer?, resolution? }] }
 *   { ok: false, msg }
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import { spawn } from 'child_process';
import { mediaClient } from '../../utils/httpClient.js';

/** Baixa a URL para um Buffer (usa o cliente de mídia do bot, com keep-alive). */
export async function baixarBuffer(url) {
  const r = await mediaClient.get(url, { responseType: 'arraybuffer', timeout: 180000, maxContentLength: Infinity, maxBodyLength: Infinity, headers: { 'User-Agent': UA } });
  return Buffer.from(r.data);
}

/** Converte um buffer de vídeo/áudio em MP3 (para o !baixar audio). */
export function paraMp3(buffer) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-vn', '-ac', '2', '-ar', '44100', '-b:a', '128k', '-f', 'mp3', 'pipe:1']);
    const chunks = []; let err = '';
    p.stdout.on('data', (c) => chunks.push(c));
    p.stderr.on('data', (c) => (err += c));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 && chunks.length ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg ${code}: ${err.slice(-200)}`))));
    p.stdin.on('error', () => { });
    p.stdin.end(buffer);
  });
}

const NAYAN = 'https://nayan-video-downloader.vercel.app';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const cache = new Map();
const TTL = 20 * 60 * 1000;
const getC = (k) => { const i = cache.get(k); if (!i) return null; if (Date.now() - i.ts > TTL) { cache.delete(k); return null; } return i.val; };
const setC = (k, v) => { if (cache.size >= 400) cache.delete(cache.keys().next().value); cache.set(k, { val: v, ts: Date.now() }); };

/** @returns {string|null} apelido da plataforma ou null se não parecer link suportado */
export function detectarPlataforma(url = '') {
  const u = String(url).trim();
  if (!/^https?:\/\//i.test(u)) return null;
  let host = '';
  try { host = new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
  // casa pelo DOMÍNIO (fim do host), para "pinterest.com" não bater em "t.co"
  const casa = (...dominios) => dominios.some(d => host === d || host.endsWith('.' + d));
  if (casa('tiktok.com', 'douyin.com')) return 'tiktok';
  if (casa('youtube.com', 'youtu.be', 'youtube-nocookie.com')) return 'youtube';
  if (casa('instagram.com', 'instagr.am', 'ig.me')) return 'instagram';
  if (casa('twitter.com', 'x.com', 't.co', 'fxtwitter.com', 'vxtwitter.com')) return 'twitter';
  if (casa('facebook.com', 'fb.watch', 'fb.me')) return 'facebook';
  if (casa('kwai.com', 'kwai-video.com', 'kwai.app', 'kw.ai', 'm.kwai.com')) return 'kwai';
  if (casa('pinterest.com', 'pinterest.co.uk', 'pin.it') || /(^|\.)pinterest\./.test(host)) return 'pinterest';
  if (casa('reddit.com', 'redd.it')) return 'reddit';
  if (casa('threads.net')) return 'threads';
  if (casa('snapchat.com')) return 'snapchat';
  if (casa('tumblr.com')) return 'tumblr';
  if (casa('vimeo.com')) return 'vimeo';
  if (casa('dailymotion.com', 'dai.ly')) return 'dailymotion';
  if (casa('likee.video', 'like.video', 'likee.com', 'l.likee.video')) return 'likee';
  if (casa('bilibili.com', 'b23.tv')) return 'bilibili';
  if (casa('capcut.com')) return 'capcut';
  if (casa('twitch.tv')) return 'twitch';
  if (casa('soundcloud.com', 'snd.sc')) return 'soundcloud';
  if (casa('linkedin.com')) return 'linkedin';
  if (casa('vk.com', 'vk.ru')) return 'vk';
  return 'outro';
}

const ehImagem = (u = '') => /\.(jpe?g|png|webp|heic|gif)(\?|$)/i.test(u);
const ehAudio = (u = '') => /\.(mp3|m4a|ogg|opus|wav|aac)(\?|$)/i.test(u);

/** Normaliza a resposta do nayan /ndown (vale para quase todos os sites). */
async function viaNayan(url) {
  const { data } = await axios.get(`${NAYAN}/ndown`, { params: { url }, timeout: 120000, headers: { 'User-Agent': UA } });
  if (!data || data.status === false) return null;
  const bruto = data.data ?? data.result ?? data.medias ?? data;
  const lista = Array.isArray(bruto) ? bruto : (Array.isArray(bruto?.medias) ? bruto.medias : [bruto]);
  const titulo = data.data?.title || data.title || bruto?.title || '';
  const itens = [];
  for (const it of lista) {
    const link = it?.url || it?.link || it?.download || it?.hd || it?.sd;
    if (!link || typeof link !== 'string' || link.startsWith('/') || it?.shouldRender) continue;
    itens.push({
      type: ehImagem(link) || it?.type === 'image' ? 'image' : ehAudio(link) || it?.type === 'audio' ? 'audio' : 'video',
      url: link,
      resolution: it?.resolution || it?.quality || ''
    });
  }
  if (!itens.length) return null;
  // melhor qualidade de vídeo primeiro
  const ordem = ['1080p', '720p (hd)', '720p', '480p', '360p', '240p'];
  itens.sort((a, b) => ordem.indexOf(String(a.resolution).toLowerCase()) - ordem.indexOf(String(b.resolution).toLowerCase()));
  return { titulo, itens };
}

/** Pinterest: resolve vídeo (og:video / contentUrl .mp4) e, se não houver, a imagem. */
export async function pinterestMidia(url) {
  let alvo = url;
  // resolve encurtador pin.it
  if (/pin\.it/i.test(url)) {
    try { const r = await axios.get(url, { maxRedirects: 5, timeout: 30000, headers: { 'User-Agent': UA } }); alvo = r.request?.res?.responseUrl || r.request?._redirectable?._currentUrl || alvo; } catch { }
  }
  const { data: html } = await axios.get(alvo, { timeout: 60000, headers: { 'User-Agent': UA } });
  const $ = cheerio.load(html);
  const meta = (p) => $(`meta[property="${p}"]`).attr('content') || $(`meta[name="${p}"]`).attr('content');
  // vídeo direto
  let video = meta('og:video') || meta('og:video:url') || meta('og:video:secure_url');
  if (!video) {
    const m = html.match(/"url":"(https:\/\/[^"]+?\.mp4[^"]*)"/i) || html.match(/(https?:\\?\/\\?\/[^"']+?\.mp4[^"']*)/i);
    if (m) video = m[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
  }
  if (video) return { titulo: meta('og:title') || 'Pinterest', itens: [{ type: 'video', url: video }] };
  const img = meta('og:image');
  if (img) return { titulo: meta('og:title') || 'Pinterest', itens: [{ type: 'image', url: img }] };
  return null;
}

/**
 * Baixa a partir do link. Não baixa o arquivo em memória: devolve as URLs diretas
 * (o Baileys envia por URL). Só o Pinterest/Facebook podem precisar de buffer, mas
 * aqui mandamos por URL para ficar leve.
 * @param {string} url
 * @param {{ audio?: boolean }} opts  audio: tenta devolver só o áudio
 */
export async function baixar(url, { audio = false } = {}) {
  const plataforma = detectarPlataforma(url);
  if (!plataforma) return { ok: false, msg: 'Esse não parece um link válido. Mande um link começando com http.' };

  const ck = `${audio ? 'a' : 'v'}:${url}`;
  const hit = getC(ck);
  if (hit) return hit;

  let res = null;
  try {
    if (plataforma === 'pinterest') {
      res = await pinterestMidia(url).catch(() => null);
      if (!res) res = await viaNayan(url).catch(() => null);
    } else {
      res = await viaNayan(url).catch(() => null);
      if (!res && plataforma === 'pinterest') res = await pinterestMidia(url).catch(() => null);
    }
  } catch { res = null; }

  if (!res || !res.itens?.length) {
    return { ok: false, msg: `Não consegui baixar desse link (${plataforma}). Pode ser privado, ter saído do ar, ou o site mudou. Tente outro link.` };
  }

  let itens = res.itens;
  if (audio) {
    const sohAudio = itens.filter(i => i.type === 'audio');
    itens = sohAudio.length ? sohAudio : [{ ...itens.find(i => i.type === 'video') || itens[0], type: 'audio', forcarAudio: true }];
  }

  const out = { ok: true, plataforma, titulo: res.titulo || '', itens };
  setC(ck, out);
  return out;
}

export default { baixar, detectarPlataforma, pinterestMidia, baixarBuffer, paraMp3 };
