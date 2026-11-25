/**
 * FIGURINHA COM ÁUDIO (sound sticker) para o WhatsApp.
 *
 * Como funciona: é uma stickerMessage normal (webp) que carrega um
 * audioMessage dentro dela (campo 26 do protobuf). O Baileys ainda não conhece
 * esse campo, então este arquivo:
 *   1) instala um patch leve no codec de StickerMessage (installStickerAudioProtocol)
 *   2) prepara o áudio (corta, normaliza, converte para Opus + waveform)
 *   3) gera a imagem de capa (ou usa uma imagem sua)
 *   4) sobe sticker + áudio e envia como uma única mensagem
 *
 * Quem não tem a função no WhatsApp ainda vê uma figurinha normal.
 * Referência da estrutura: github.com/nabilboubakri23-del/NEO-BOT (systems/media/soundSticker.js)
 */
import { withFfmpegSlot } from './ffmpegQueue.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import crypto from 'crypto';
import sharp from 'sharp';
import { proto, prepareWAMessageMedia, generateWAMessageFromContent } from 'baileys';

const __filename = fileURLToPath(import.meta.url);
const require = createRequire(import.meta.url);

/* ------------------------------------------------------------------ */
/* 1) Patch do codec: StickerMessage.audioMessage (campo 26)           */
/* ------------------------------------------------------------------ */

const AUDIO_FIELD = 26;            // StickerMessage.audioMessage
const AUDIO_TAG = (AUDIO_FIELD << 3) | 2;
const WRAP_FIELD = 134;           // Message.audioStickerMessage (FutureProofMessage)
const WRAP_TAG = (WRAP_FIELD << 3) | 2;
let codecReady = false;

const loadReader = () => {
  // usa o mesmo protobufjs que o Baileys usa
  const baileysRequire = createRequire(require.resolve('baileys'));
  return baileysRequire('protobufjs/minimal').Reader;
};

/**
 * Ensina o Baileys a ler/escrever:
 *   Message.audioStickerMessage (campo 134) = FutureProofMessage { message: Message }
 *   StickerMessage.audioMessage (campo 26)
 * Formato real da figurinha com áudio:
 *   Message { audioStickerMessage { message { stickerMessage { ..., audioMessage } } } }
 */
export function installStickerAudioProtocol() {
  if (codecReady) return true;
  try {
    const M = proto.Message;
    const T = M.StickerMessage;
    const A = M.AudioMessage;
    const F = M.FutureProofMessage;
    if (!M || !T || !A || !F) return false;
    const Reader = loadReader();

    const origT = { encode: T.encode, decode: T.decode, fromObject: T.fromObject, toObject: T.toObject };
    const origM = { encode: M.encode, decode: M.decode, fromObject: M.fromObject, toObject: M.toObject };

    // --- StickerMessage.audioMessage (26) ---
    const nativeSticker = T.decode(T.encode({ audioMessage: { seconds: 1 } }).finish()).audioMessage;
    if (!nativeSticker) {
      T.encode = function (value, writer) {
        const out = origT.encode.call(this, value, writer);
        if (value && value.audioMessage != null) A.encode(value.audioMessage, out.uint32(AUDIO_TAG).fork()).ldelim();
        return out;
      };
      T.decode = function (input, length, ...rest) {
        const reader = input instanceof Reader ? input : Reader.create(input);
        const start = reader.pos;
        const out = origT.decode.call(this, reader, length, ...rest);
        const scan = Reader.create(reader.buf.subarray(start, reader.pos));
        while (scan.pos < scan.len) {
          const tag = scan.uint32();
          if ((tag >>> 3) === AUDIO_FIELD && (tag & 7) === 2) out.audioMessage = A.decode(scan, scan.uint32());
          else scan.skipType(tag & 7);
        }
        return out;
      };
      T.fromObject = function (value) {
        const out = origT.fromObject.call(this, value);
        if (value && value.audioMessage != null) out.audioMessage = A.fromObject(value.audioMessage);
        return out;
      };
      T.toObject = function (value, options) {
        const out = origT.toObject.call(this, value, options);
        if (value && value.audioMessage != null) out.audioMessage = A.toObject(value.audioMessage, options);
        return out;
      };
    }

    // --- Message.audioStickerMessage (134) ---
    const nativeWrap = (() => {
      try { return M.decode(M.encode({ audioStickerMessage: { message: { conversation: 'x' } } }).finish()).audioStickerMessage; }
      catch { return null; }
    })();
    if (!nativeWrap) {
      M.encode = function (value, writer) {
        // marcador: se veio audioStickerMessage + stickerMessage (usado só p/ o Baileys achar mediatype="sticker"),
        // o stickerMessage de fora NÃO vai para o fio — só o de dentro do embrulho.
        if (value && value.audioStickerMessage != null && value.stickerMessage != null) {
          const { stickerMessage, ...rest } = value;
          value = rest;
        }
        const out = origM.encode.call(this, value, writer);
        if (value && value.audioStickerMessage != null) F.encode(value.audioStickerMessage, out.uint32(WRAP_TAG).fork()).ldelim();
        return out;
      };
      M.decode = function (input, length, ...rest) {
        const reader = input instanceof Reader ? input : Reader.create(input);
        const start = reader.pos;
        const out = origM.decode.call(this, reader, length, ...rest);
        const rawBytes = reader.buf.subarray(start, reader.pos);
        const scan = Reader.create(rawBytes);
        const seen = [];
        while (scan.pos < scan.len) {
          const tag = scan.uint32();
          seen.push(tag >>> 3);
          if ((tag >>> 3) === WRAP_FIELD && (tag & 7) === 2) out.audioStickerMessage = F.decode(scan, scan.uint32());
          else scan.skipType(tag & 7);
        }
        // guarda (escondido) os bytes originais de mensagens com figurinha, para o !soundinfo comparar formatos
        if (out.audioStickerMessage || out.stickerMessage) {
          try {
            Object.defineProperty(out, '__raw', { value: Buffer.from(rawBytes), enumerable: false, configurable: true });
            Object.defineProperty(out, '__fields', { value: seen, enumerable: false, configurable: true });
          } catch { }
        }
        return out;
      };
      M.fromObject = function (value) {
        const out = origM.fromObject.call(this, value);
        if (value && value.audioStickerMessage != null) out.audioStickerMessage = F.fromObject(value.audioStickerMessage);
        return out;
      };
      M.toObject = function (value, options) {
        const out = origM.toObject.call(this, value, options);
        if (value && value.audioStickerMessage != null) out.audioStickerMessage = F.toObject(value.audioStickerMessage, options);
        return out;
      };
    }

    // --- campos novos que o celular manda e o Baileys ainda não conhece (só escrita) ---
    //   ContextInfo.mediaDomainInfo (74) = { mediaKeyDomain (1, enum: 1 = E2EE), e2EeMediaKey (2, bytes) }
    //   StickerMessage.premium (24, int32)
    const C = proto.ContextInfo;
    if (C && !C.__astaPatched) {
      const origCEnc = C.encode;
      C.encode = function (value, writer) {
        const out = origCEnc.call(this, value, writer);
        const md = value && value.mediaDomainInfo;
        if (md) {
          const w = out.uint32((74 << 3) | 2).fork();
          if (md.mediaKeyDomain != null) w.uint32((1 << 3) | 0).int32(md.mediaKeyDomain);
          if (md.e2EeMediaKey != null) w.uint32((2 << 3) | 2).bytes(md.e2EeMediaKey);
          w.ldelim();
        }
        return out;
      };
      C.__astaPatched = true;
    }
    if (!T.__astaPremium) {
      const prevTEnc = T.encode;
      T.encode = function (value, writer) {
        const out = prevTEnc.call(this, value, writer);
        if (value && value.premium != null) out.uint32((24 << 3) | 0).int32(value.premium);
        return out;
      };
      T.__astaPremium = true;
    }

    // Confere o round-trip; se algo falhar, desfaz tudo.
    const probe = M.decode(M.encode({ audioStickerMessage: { message: { stickerMessage: { audioMessage: { seconds: 3 } } } } }).finish());
    const got = probe.audioStickerMessage?.message?.stickerMessage?.audioMessage;
    if (!got || Number(got.seconds) !== 3) {
      Object.assign(T, origT);
      Object.assign(M, origM);
      return false;
    }
    codecReady = true;
    return true;
  } catch (e) {
    console.error('[SOUND-STICKER] Falha ao instalar codec:', e.message);
    return false;
  }
}

export const stickerAudioReady = () => codecReady;

installStickerAudioProtocol();

/* ------------------------------------------------------------------ */
/* 2) Áudio: cortar, normalizar, Opus, waveform                        */
/* ------------------------------------------------------------------ */

export const DEFAULT_SECONDS = 10;
export const MIN_SECONDS = 1;
export let MAX_SECONDS = 30;
/** Muda o limite de duração do som (config.json -> figSomMaxSeg). */
export const setSoundLimits = ({ maxSeconds } = {}) => {
  const n = Number(maxSeconds);
  if (Number.isFinite(n) && n >= MIN_SECONDS) MAX_SECONDS = Math.round(n);
  return MAX_SECONDS;
};
const PCM_RATE = 8000;
const MAX_ANALYSIS_SECONDS = 15 * 60;

export class SoundStickerError extends Error {}

const tmpDir = () => {
  const dir = path.join(path.dirname(__filename), '../../../database/tmp');
  if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
  return dir;
};
const tmpFile = (ext) => path.join(tmpDir(), `snd_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`);

// passa pela fila (lotes de figurinhas não sobrecarregam o computador)
const runFfmpeg = (args, timeoutMs = 60_000) => withFfmpegSlot(() => runFfmpegRaw(args, timeoutMs));
const runFfmpegRaw = (args, timeoutMs = 60_000) =>
  new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; if (err.length > 4000) err = err.slice(-4000); });
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('ffmpeg: tempo esgotado')); }, timeoutMs);
    p.on('error', (e) => { clearTimeout(timer); reject(new Error(`ffmpeg não encontrado/erro: ${e.message}`)); });
    p.on('close', (code) => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error(`ffmpeg saiu com código ${code}: ${err.trim().split('\n').pop()}`));
    });
  });

/** Converte `buffer` usando ffmpeg com arquivos temporários. args(inPath, outPath) → array. */
const convert = async (buffer, inExt, outExt, args) => {
  const inPath = tmpFile(inExt || 'bin');
  const outPath = tmpFile(outExt);
  try {
    await fs.writeFile(inPath, buffer);
    await runFfmpeg(args(inPath, outPath));
    const out = await fs.readFile(outPath);
    if (!out.length) throw new Error('conversão gerou arquivo vazio');
    return out;
  } finally {
    fs.unlink(inPath).catch(() => {});
    fs.unlink(outPath).catch(() => {});
  }
};

const decodePcm = async (buffer, ext) => {
  const raw = await convert(buffer, ext, 'pcm', (i, o) => [
    '-t', String(MAX_ANALYSIS_SECONDS), '-i', i, '-vn', '-ac', '1', '-ar', String(PCM_RATE), '-f', 's16le', o
  ]);
  const aligned = Buffer.from(raw); // garante alinhamento p/ Int16Array
  return new Int16Array(aligned.buffer, aligned.byteOffset, Math.floor(aligned.length / 2));
};

/** Início (s) da janela mais "forte" do áudio — bom palpite para o refrão/gancho. */
export const bestWindow = (pcm, seconds, rate = PCM_RATE) => {
  const step = Math.floor(rate / 2);
  const blocks = Math.floor(pcm.length / step);
  const width = Math.max(1, Math.round((seconds * rate) / step));
  if (blocks <= width) return 0;
  const energy = new Float64Array(blocks);
  for (let b = 0; b < blocks; b++) {
    let sum = 0;
    for (let i = b * step, end = i + step; i < end; i++) sum += pcm[i] * pcm[i];
    energy[b] = sum;
  }
  const total = blocks * 0.5;
  const margin = total > seconds + 20 ? 10 : 0; // pula intro/final em músicas longas
  const first = Math.floor(margin * 2);
  const last = blocks - width - Math.floor(margin * 2);
  let window = 0;
  for (let b = first; b < first + width; b++) window += energy[b];
  let best = window;
  let bestAt = first;
  for (let b = first + 1; b <= last; b++) {
    window += energy[b + width - 1] - energy[b - 1];
    if (window > best) { best = window; bestAt = b; }
  }
  return bestAt * 0.5;
};

/** 64 valores (0-100) — as barrinhas de nota de voz. */
export const waveform = (pcm, bars = 64) => {
  const out = Buffer.alloc(bars);
  if (!pcm.length) return out;
  const per = Math.max(1, Math.floor(pcm.length / bars));
  const peaks = [];
  for (let b = 0; b < bars; b++) {
    let peak = 0;
    for (let i = b * per, end = Math.min(pcm.length, i + per); i < end; i++) peak = Math.max(peak, Math.abs(pcm[i]));
    peaks.push(peak);
  }
  const max = Math.max(...peaks) || 1;
  peaks.forEach((p, i) => { out[i] = Math.round((p / max) * 100); });
  return out;
};

export const clampSeconds = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SECONDS;
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(n)));
};

/** "1:05", "01:02:03", "65", "65s" → segundos; inválido → null. */
export const parseTime = (text) => {
  const raw = String(text ?? '').trim().toLowerCase().replace(/s$/, '');
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (!/^\d{1,2}(:\d{1,2}){1,2}$/.test(raw)) return null;
  return raw.split(':').reduce((t, p) => t * 60 + Number(p), 0);
};

/**
 * Argumentos do comando:  ""  |  "8"  |  "0:30 8"  (início duração)
 * @returns {{ start: number|null, seconds: number|null }}  null = automático
 */
export const parseArgs = (text) => {
  const parts = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { start: null, seconds: null };
  if (parts.length === 1) {
    const s = parseTime(parts[0]);
    if (s === null) throw new SoundStickerError('Duração inválida. Exemplo: 15 (segundos)');
    return { start: null, seconds: clampSeconds(s) };
  }
  const start = parseTime(parts[0]);
  const secs = parseTime(parts[1]);
  if (start === null || secs === null) throw new SoundStickerError('Formato inválido. Exemplo: 0:30 8 (começa em 0:30, dura 8s)');
  return { start, seconds: clampSeconds(secs) };
};

/**
 * Prepara o trecho: corta, aplica fade, normaliza volume e codifica em Opus mono (formato de nota de voz).
 * start null = automático (áudio curto: inteiro; áudio longo: trecho mais forte).
 */
export const prepareClip = async (buffer, ext = 'ogg', { start = null, seconds = null } = {}) => {
  const pcm = await decodePcm(buffer, ext);
  const total = pcm.length / PCM_RATE;
  if (total < 0.5) throw new SoundStickerError('Esse áudio está vazio ou curto demais.');

  // sem duração escolhida: usa o áudio inteiro até o limite (áudio maior: pega o trecho mais forte)
  const length = seconds ? clampSeconds(seconds) : Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.ceil(total)));
  const auto = start === null || start === undefined;
  let from = auto ? bestWindow(pcm, length) : Math.max(0, Number(start));
  if (from >= total) throw new SoundStickerError(`O áudio tem só ${Math.floor(total)}s. Escolha um início menor.`);
  const duration = Math.min(length, total - from);
  from = Math.round(from * 10) / 10;
  const fadeOut = Math.max(0, duration - 0.5).toFixed(2);

  const ogg = await convert(buffer, ext, 'ogg', (i, o) => [
    '-ss', String(from), '-t', duration.toFixed(2), '-i', i, '-vn',
    '-af', `afade=t=in:d=0.1,afade=t=out:st=${fadeOut}:d=0.5,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000`,
    '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '48k', '-vbr', 'on', '-compression_level', '10', '-frame_duration', '20', '-application', 'audio',
    '-avoid_negative_ts', 'make_zero', '-map_metadata', '-1', '-f', 'ogg', o
  ]);

  const slice = pcm.subarray(Math.floor(from * PCM_RATE), Math.floor((from + duration) * PCM_RATE));
  return { ogg, seconds: Math.max(1, Math.round(duration)), start: from, total, waveform: waveform(slice), auto };
};

/* ------------------------------------------------------------------ */
/* 3) Capa da figurinha                                                */
/* ------------------------------------------------------------------ */

/** Capa 512x512 (webp) com a onda do áudio — sem texto, então não depende de fontes. */
export const makeCover = async (wave = Buffer.alloc(64), palette = 0) => {
  const themes = [
    ['#7c3aed', '#ec4899'],
    ['#0ea5e9', '#22c55e'],
    ['#f97316', '#ef4444'],
    ['#6366f1', '#14b8a6']
  ];
  const [c1, c2] = themes[Math.abs(palette) % themes.length];
  const bars = 32;
  const barW = 10;
  const gap = 5;
  const totalW = bars * barW + (bars - 1) * gap;
  const x0 = (512 - totalW) / 2;
  let rects = '';
  for (let i = 0; i < bars; i++) {
    const v = Math.max(8, wave[Math.floor((i / bars) * wave.length)] ?? 20);
    const h = 20 + (v / 100) * 190;
    rects += `<rect x="${x0 + i * (barW + gap)}" y="${300 - h / 2}" width="${barW}" height="${h}" rx="5" fill="#ffffff" fill-opacity="0.95"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect x="8" y="8" width="496" height="496" rx="96" fill="url(#g)"/>
  <g transform="translate(256 118)">
    <circle r="44" fill="#ffffff" fill-opacity="0.22"/>
    <path d="M-22 -10 h12 l16 -14 v48 l-16 -14 h-12 z" fill="#ffffff"/>
    <path d="M14 -12 q12 12 0 24" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M22 -22 q22 22 0 44" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>
  ${rects}
</svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
};

/** Usa uma imagem do usuário como capa: quadrada 512x512 com fundo transparente. */
export const coverFromImage = async (imageBuffer) =>
  sharp(imageBuffer, { animated: false })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toBuffer();

/* ------------------------------------------------------------------ */
/* 4) Envio                                                            */
/* ------------------------------------------------------------------ */

/* ---------- conexão caiu no meio do envio: espera reconectar e tenta de novo ---------- */
const isClosedErr = (e) => /Connection Closed|Connection Terminated|Timed Out/i.test(e?.message || '') || [408, 428].includes(e?.output?.statusCode);
const sockIsOpen = (s) => !!(s?.ws?.isOpen ?? (s?.ws?.readyState === 1));
/** Espera até 30s por uma conexão aberta (o connect.js troca global.__nazunaSock ao reconectar). */
export const waitOpenSock = async (fallback, timeoutMs = 30_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = global.__nazunaSock || fallback;
    if (sockIsOpen(s)) return s;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
};
/** Roda fn(sock); se a conexão cair, espera reconectar e roda mais UMA vez com o socket novo. */
export const withReconnect = async (sock, fn) => {
  try {
    return await fn(sock);
  } catch (e) {
    if (!isClosedErr(e)) throw e;
    console.log('[FIGURINHA] Conexão caiu durante o envio — esperando reconectar para tentar de novo...');
    const s2 = await waitOpenSock(sock);
    if (!s2) throw e;
    await new Promise((r) => setTimeout(r, 1500));
    console.log('[FIGURINHA] Reconectado — reenviando.');
    return fn(s2);
  }
};

/**
 * Coloca na figurinha com som os campos que o celular manda (sem eles o iPhone não mostra o som).
 * Usado no envio normal e nas transmissões (!tm / !divdono).
 */
export const applyNativeSoundFields = (stickerMsg, audioMsg) => {
  const nowS = Math.floor(Date.now() / 1000);
  if (audioMsg) {
    audioMsg.ptt = false;
    if (!audioMsg.mediaKeyTimestamp) audioMsg.mediaKeyTimestamp = nowS;
    if (!audioMsg.waveform?.length) audioMsg.waveform = Buffer.alloc(64, 50);
    audioMsg.contextInfo = { ...(audioMsg.contextInfo || {}), mediaDomainInfo: { mediaKeyDomain: 1, e2EeMediaKey: audioMsg.mediaKey } };
    stickerMsg.audioMessage = audioMsg;
  }
  if (!stickerMsg.stickerSentTs) stickerMsg.stickerSentTs = Date.now();
  if (!stickerMsg.mediaKeyTimestamp) stickerMsg.mediaKeyTimestamp = nowS;
  stickerMsg.isAvatar = false;
  stickerMsg.isAiSticker = false;
  stickerMsg.isLottie = false;
  stickerMsg.premium = 0;
  stickerMsg.contextInfo = { ...(stickerMsg.contextInfo || {}), mediaDomainInfo: { mediaKeyDomain: 1, e2EeMediaKey: stickerMsg.mediaKey } };
  return stickerMsg;
};

/**
 * Guarda as figurinhas com som que o PRÓPRIO bot enviou (o WhatsApp não manda o som
 * dentro das respostas, então !tm, !divdono, take etc. recuperam o som por aqui).
 */
export const rememberSoundSticker = (id, audioStickerMessage) => {
  if (!id || !audioStickerMessage) return;
  if (!global.__astaSoundSent) global.__astaSoundSent = new Map();
  const m = global.__astaSoundSent;
  m.set(id, { audioStickerMessage, at: Date.now() });
  while (m.size > 300) m.delete(m.keys().next().value);
};

/** webp animado? (chunk ANIM) */
const isAnimatedWebp = (buf) => buf.includes(Buffer.from('ANIM'));

/**
 * Envia UMA mensagem de figurinha com áudio, no formato do WhatsApp:
 *   audioStickerMessage { message { stickerMessage { ..., audioMessage } } }
 * @param nazu   socket do Baileys
 * @param parts  { webp: Buffer (com EXIF, se quiser), clip: retorno de prepareClip, quoted?: mensagem, size?: 512 }
 */
export const sendSoundSticker = (nazu, jid, opts) => withReconnect(nazu, (sock) => sendSoundStickerOnce(sock, jid, opts));
const sendSoundStickerOnce = async (nazu, jid, { webp, clip, quoted, size = 512, mentions }) => {
  if (!installStickerAudioProtocol()) {
    throw new SoundStickerError('Essa versão do Baileys não suporta figurinha com áudio.');
  }
  const options = { upload: nazu.waUploadToServer, mediaUploadTimeoutMs: 30_000 };
  // tamanho real da figurinha (o WhatsApp usa isso para desenhar)
  let realSize = size;
  try { const m = await sharp(webp).metadata(); if (m?.width) realSize = m.width; } catch { }
  const [sticker, audio] = await Promise.all([
    prepareWAMessageMedia({ sticker: webp, width: realSize, height: realSize }, options),
    prepareWAMessageMedia({
      audio: clip.ogg,
      mimetype: 'audio/ogg; codecs=opus',
      seconds: clip.seconds,
      ptt: false,
      waveform: clip.waveform || Buffer.alloc(64)
    }, options)
  ]);
  // campos que o celular manda (sem eles o iPhone não mostra o som até alguém encaminhar)
  const nowS = Math.floor(Date.now() / 1000);
  const am = audio.audioMessage;
  am.ptt = false;
  if (!am.mediaKeyTimestamp) am.mediaKeyTimestamp = nowS;
  if (!am.waveform?.length) am.waveform = Buffer.alloc(64, 50);
  am.contextInfo = { ...(am.contextInfo || {}), mediaDomainInfo: { mediaKeyDomain: 1, e2EeMediaKey: am.mediaKey } };
  sticker.stickerMessage.audioMessage = am;
  if (isAnimatedWebp(webp)) sticker.stickerMessage.isAnimated = true;

  // 1) monta como figurinha normal (gera id, contextInfo da resposta etc.)
  const built = generateWAMessageFromContent(jid, sticker, {
    userJid: nazu.user?.id,
    ...(quoted ? { quoted } : {})
  });
  const innerSticker = built.message.stickerMessage;
  if (mentions?.length) innerSticker.contextInfo = { ...(innerSticker.contextInfo || {}), mentionedJid: mentions };

  // 2) embrulha em audioStickerMessage. O stickerMessage "solto" é só um marcador para o Baileys
  //    mandar mediatype="sticker"; o codec patchado não o escreve no fio.
  // o celular sempre manda: horário de envio da figurinha + messageContextInfo com messageSecret
  if (!innerSticker.stickerSentTs) innerSticker.stickerSentTs = Date.now();
  if (!innerSticker.mediaKeyTimestamp) innerSticker.mediaKeyTimestamp = nowS;
  innerSticker.isAvatar = false;
  innerSticker.isAiSticker = false;
  innerSticker.isLottie = false;
  innerSticker.premium = 0;
  innerSticker.contextInfo = { ...(innerSticker.contextInfo || {}), mediaDomainInfo: { mediaKeyDomain: 1, e2EeMediaKey: innerSticker.mediaKey } };
  const messageContextInfo = {
    ...(built.message.messageContextInfo || {}),
    messageSecret: built.message.messageContextInfo?.messageSecret || crypto.randomBytes(32)
  };
  const wrapped = {
    audioStickerMessage: { message: { stickerMessage: innerSticker } },
    messageContextInfo,
    stickerMessage: innerSticker
  };
  await nazu.relayMessage(jid, wrapped, { messageId: built.key.id });
  built.message = { audioStickerMessage: wrapped.audioStickerMessage, messageContextInfo };
  rememberSoundSticker(built.key.id, wrapped.audioStickerMessage);
  return built;
};

/** Resumo legível de uma figurinha com áudio recebida (para diagnóstico). */
export const describeSoundSticker = (msg) => {
  const st = msg?.audioStickerMessage?.message?.stickerMessage || msg?.stickerMessage;
  if (!st) return null;
  const hide = (k, v) => (Buffer.isBuffer(v) || v instanceof Uint8Array || (v && v.type === 'Buffer'))
    ? `<${v.length ?? v.data?.length} bytes>` : v;
  return JSON.stringify({
    embrulhada: !!msg?.audioStickerMessage,
    outerKeys: Object.keys(msg || {}),
    sticker: { ...st, audioMessage: undefined, contextInfo: undefined },
    audio: st.audioMessage || null
  }, hide, 2);
};


/** Monta o "clip" (para sendSoundSticker) a partir do audioMessage de uma figurinha com som + o áudio já baixado. */
export const clipFromAudioMessage = (audioMessage, oggBuffer) => ({
  ogg: oggBuffer,
  seconds: Math.max(1, Number(audioMessage?.seconds) || 1),
  waveform: audioMessage?.waveform?.length ? Buffer.from(audioMessage.waveform) : Buffer.alloc(64)
});

/** Figurinha marcada (comum ou com som) dentro de uma mensagem citada. */
export const quotedStickerOf = (quoted) =>
  quoted?.stickerMessage || quoted?.audioStickerMessage?.message?.stickerMessage || null;
