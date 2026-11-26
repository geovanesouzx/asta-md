/**
 * ★彡 ASTA MD 彡★ — EFEITOS DE FIGURINHA
 *  - efeitos de vídeo (com o som acompanhando): lento, rápido, reverso, vai e volta, espelho
 *  - efeitos de voz no som: grave, esquilo, robô, eco, rádio, monstro, reverso
 *  - voz falando um texto (para o !sfala): Vex API (se tiver chave) ou voz gratuita do Google
 */
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import axios from 'axios';
import { withFfmpegSlot } from './ffmpegQueue.js';

const TMP = path.join(os.tmpdir(), 'asta-fx');
const tmp = async (ext) => { await fs.mkdir(TMP, { recursive: true }); return path.join(TMP, `fx_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`); };

const run = (bin, args, timeoutMs = 180_000) => withFfmpegSlot(() => new Promise((resolve, reject) => {
  const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  p.stdout.on('data', (d) => { out += d; });
  p.stderr.on('data', (d) => { err += d; if (err.length > 6000) err = err.slice(-6000); });
  const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch { } reject(new Error(`${bin}: tempo esgotado`)); }, timeoutMs);
  p.on('error', (e) => { clearTimeout(t); reject(e); });
  p.on('close', (c) => { clearTimeout(t); c === 0 ? resolve(out) : reject(new Error(`${bin} (${c}): ${err.trim().split('\n').pop()}`)); });
}));
const ffmpeg = (args, t) => run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], t);

async function probe(file) {
  try {
    const out = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file], 30_000);
    const j = JSON.parse(out || '{}');
    return { duration: Number(j.format?.duration) || 0, hasAudio: (j.streams || []).some((s) => s.codec_type === 'audio'), hasVideo: (j.streams || []).some((s) => s.codec_type === 'video') };
  } catch { return { duration: 0, hasAudio: false, hasVideo: true }; }
}

/* ------------------------------------------------------------------ */
/* efeitos de vídeo                                                    */
/* ------------------------------------------------------------------ */

export const VIDEO_FX = {
  lento: { nome: '🐢 câmera lenta', fator: 2 },
  rapido: { nome: '⚡ acelerado', fator: 0.5 },
  reverso: { nome: '⏪ de trás pra frente', fator: 1 },
  vaievolta: { nome: '🔁 vai e volta', fator: 2 },
  espelho: { nome: '🪞 espelhado', fator: 1 }
};
const FX_ALIASES = {
  lento: 'lento', lenta: 'lento', slow: 'lento', camera: 'lento', camlenta: 'lento',
  rapido: 'rapido', rápido: 'rapido', acelerado: 'rapido', fast: 'rapido', acelerar: 'rapido',
  reverso: 'reverso', reverse: 'reverso', tras: 'reverso', trás: 'reverso', inverso: 'reverso', ao_contrario: 'reverso',
  vaievolta: 'vaievolta', boomerang: 'vaievolta', bumerangue: 'vaievolta', vai: 'vaievolta', vaivem: 'vaievolta', ida: 'vaievolta',
  espelho: 'espelho', espelhar: 'espelho', mirror: 'espelho', flip: 'espelho'
};
export const parseVideoFx = (txt) => {
  const t = String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
  for (const [k, v] of Object.entries(FX_ALIASES)) if (t.startsWith(k.normalize('NFD').replace(/[̀-ͯ]/g, ''))) return v;
  return null;
};

/**
 * Aplica o efeito num vídeo (o som acompanha). Entrada: mp4. Saída: mp4 (512px, com som se tiver).
 * maxInput: segundos máximos usados da entrada (efeitos que dobram a duração usam metade).
 */
export async function applyVideoEffect(mp4, fx, { maxOutput = 15 } = {}) {
  const def = VIDEO_FX[fx];
  if (!def) throw new Error('efeito desconhecido');
  const inF = await tmp('mp4'), outF = await tmp('mp4');
  try {
    await fs.writeFile(inF, mp4);
    const info = await probe(inF);
    const useIn = Math.max(1, Math.min(info.duration || maxOutput, maxOutput / def.fator));
    const pre = 'fps=30,scale=512:512:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2';
    let vf, af = null, complex = null;
    switch (fx) {
      case 'lento': vf = `${pre},setpts=2.0*PTS`; af = 'atempo=0.5'; break;
      case 'rapido': vf = `${pre},setpts=0.5*PTS`; af = 'atempo=2.0'; break;
      case 'reverso': vf = `${pre},reverse`; af = 'areverse'; break;
      case 'espelho': vf = `${pre},hflip`; break;
      case 'vaievolta':
        complex = info.hasAudio
          ? `[0:v]${pre},split[v1][v2];[v2]reverse[vr];[0:a]asplit[a1][a2];[a2]areverse[ar];[v1][a1][vr][ar]concat=n=2:v=1:a=1[v][a]`
          : `[0:v]${pre},split[v1][v2];[v2]reverse[vr];[v1][vr]concat=n=2:v=1:a=0[v]`;
        break;
    }
    const args = ['-t', useIn.toFixed(2), '-i', inF];
    if (complex) {
      args.push('-filter_complex', complex, '-map', '[v]');
      if (info.hasAudio) args.push('-map', '[a]');
    } else {
      args.push('-vf', vf, '-map', '0:v:0');
      if (info.hasAudio) { args.push('-map', '0:a:0'); if (af) args.push('-af', af); }
    }
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p');
    if (info.hasAudio) args.push('-c:a', 'aac', '-b:a', '128k');
    args.push('-movflags', '+faststart', outF);
    await ffmpeg(args);
    const out = await fs.readFile(outF);
    const outInfo = await probe(outF);
    return { video: out, seconds: Math.max(1, Math.ceil(outInfo.duration || useIn * def.fator)), hasAudio: info.hasAudio };
  } finally {
    fs.unlink(inF).catch(() => { }); fs.unlink(outF).catch(() => { });
  }
}

/* ------------------------------------------------------------------ */
/* efeitos de voz                                                      */
/* ------------------------------------------------------------------ */

export const VOICE_FX = {
  grave: { nome: '🔉 grave', af: 'aresample=48000,asetrate=48000*0.75,aresample=48000,atempo=1.3333' },
  esquilo: { nome: '🐿️ esquilo', af: 'aresample=48000,asetrate=48000*1.5,aresample=48000,atempo=0.6667' },
  robo: { nome: '🤖 robô', af: "aresample=48000,afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75" },
  eco: { nome: '🏔️ eco', af: 'aecho=0.8:0.88:250|500:0.4|0.25' },
  radio: { nome: '📻 rádio', af: 'highpass=f=400,lowpass=f=3200,acompressor=threshold=0.1:ratio=6' },
  monstro: { nome: '👹 monstro', af: 'aresample=48000,asetrate=48000*0.6,aresample=48000,atempo=1.6667' },
  reverso: { nome: '⏪ ao contrário', af: 'areverse' }
};
const VOICE_ALIASES = {
  grave: 'grave', grossa: 'grave', grosso: 'grave', baixo: 'grave',
  esquilo: 'esquilo', fina: 'esquilo', fino: 'esquilo', chipmunk: 'esquilo', agudo: 'esquilo',
  robo: 'robo', robô: 'robo', robot: 'robo',
  eco: 'eco', echo: 'eco', caverna: 'eco',
  radio: 'radio', rádio: 'radio', telefone: 'radio',
  monstro: 'monstro', demonio: 'monstro', demônio: 'monstro', monster: 'monstro',
  reverso: 'reverso', reverse: 'reverso', contrario: 'reverso', contrário: 'reverso'
};
export const parseVoiceFx = (txt) => {
  const w = String(txt || '').toLowerCase().trim().split(/\s+/)[0] || '';
  return VOICE_ALIASES[w] || null;
};

/** Aplica o efeito de voz. Entrada: áudio ou vídeo (qualquer formato). Saída: ogg/opus. */
export async function applyVoiceEffect(buffer, ext, fx) {
  const def = VOICE_FX[fx];
  if (!def) throw new Error('efeito de voz desconhecido');
  const inF = await tmp(ext || 'bin'), outF = await tmp('ogg');
  try {
    await fs.writeFile(inF, buffer);
    await ffmpeg(['-i', inF, '-vn', '-t', '120', '-af', def.af, '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '64k', '-f', 'ogg', outF]);
    return await fs.readFile(outF);
  } finally {
    fs.unlink(inF).catch(() => { }); fs.unlink(outF).catch(() => { });
  }
}

/* ------------------------------------------------------------------ */
/* voz falando um texto                                                */
/* ------------------------------------------------------------------ */

/** Voz gratuita (Google). Até ~200 caracteres por pedaço; junta os pedaços. */
export async function freeTts(text, lang = 'pt-BR') {
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 600);
  if (!clean) throw new Error('texto vazio');
  const parts = [];
  let rest = clean;
  while (rest.length) {
    let cut = rest.length <= 190 ? rest.length : Math.max(rest.lastIndexOf(' ', 190), 100);
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  const bufs = [];
  for (const [i, part] of parts.entries()) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&total=${parts.length}&idx=${i}&textlen=${part.length}&q=${encodeURIComponent(part)}`;
    const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 20_000, headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://translate.google.com/' } });
    bufs.push(Buffer.from(data));
  }
  return Buffer.concat(bufs); // mp3
}
