import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webp from 'node-webpmux';
import sharp from 'sharp';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { spawn, spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório temporário
function ensureTmpDir() {
  const tmpDir = path.join(path.dirname(__filename), "../../../database/tmp");
  if (!fsSync.existsSync(tmpDir)) {
    fsSync.mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
}
function generateTempFileName(ext) {
  const dir = ensureTmpDir();
  return path.join(dir, `${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`);
}

// Download para buffer
async function getBuffer(url) {
  const { data } = await axios.get(url, { responseType: "arraybuffer" });
  if (!data || data.length === 0) throw new Error("Download vazio");
  return Buffer.from(data);
}

// Detecção mínima só para imagens
function detectImageExtension(buf) {
  if (buf.length >= 12) {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "png";
    if (buf[0] === 0xFF && buf[1] === 0xD8) return "jpg";
    if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "webp";
  }
  return "jpg";
}

// ===================== FIGURINHA ANIMADA FLUIDA =====================
// O WhatsApp limita figurinha animada a ~1MB. Para ficar fluida, a prioridade é manter
// muitos quadros por segundo (30/24/20) e só reduzir resolução/qualidade o necessário.
const ANIM_MAX_SIZE = 990000;

let _animEncoder = null;
function animEncoder() {
  if (_animEncoder) return _animEncoder;
  try {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8', timeout: 15000 });
    // libwebp_anim guarda só o que muda entre os quadros (fica menor); senão usa libwebp
    _animEncoder = /libwebp_anim/.test(r.stdout || '') ? 'libwebp_anim' : 'libwebp';
  } catch {
    _animEncoder = 'libwebp';
  }
  return _animEncoder;
}

function runFfmpeg(args, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; if (err.length > 4000) err = err.slice(-4000); });
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('ffmpeg: tempo esgotado')); }, timeoutMs);
    p.on('error', e => { clearTimeout(t); reject(e); });
    p.on('close', code => { clearTimeout(t); code === 0 ? resolve() : reject(new Error(`ffmpeg (${code}): ${err.trim().split('\n').pop()}`)); });
  });
}

// recorte circular com borda suave (transparente fora do círculo)
const circleFilter = (size) =>
  `crop='min(iw,ih)':'min(iw,ih)',scale=${size}:${size},format=rgba,` +
  `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*clip(W/2-hypot(X-W/2+0.5,Y-H/2+0.5),0,1)'`;

// corte quadrado de verdade (1:1): pega um quadrado do tamanho do lado menor e descarta o resto
const CROP_POS = {
  centro: ['(iw-ow)/2', '(ih-oh)/2'], cima: ['(iw-ow)/2', '0'], baixo: ['(iw-ow)/2', 'ih-oh'],
  esquerda: ['0', '(ih-oh)/2'], direita: ['iw-ow', '(ih-oh)/2']
};
const squareCropFilter = (size, pos = 'centro') => {
  const [x, y] = CROP_POS[pos] || CROP_POS.centro;
  return `crop='min(iw,ih)':'min(iw,ih)':${x}:${y},scale=${size}:${size}:flags=lanczos`;
};

async function encodeAnim(tmpIn, dur, size, fps, q, forceSquare, circle = false) {
  const out = generateTempFileName('webp');
  // circle: true = redonda | 'centro'/'cima'/'baixo'/'esquerda'/'direita' = corte quadrado
  const scale = typeof circle === 'string'
    ? squareCropFilter(size, circle)
    : circle
    ? circleFilter(size)
    : forceSquare
    ? `scale=${size}:${size}:flags=lanczos`
    : `scale=${size}:${size}:flags=lanczos:force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba`;
  try {
    await runFfmpeg([
      '-i', tmpIn, '-t', String(dur),
      '-vf', `fps=${fps},${scale}`,
      '-c:v', animEncoder(), '-lossless', '0', '-q:v', String(q),
      '-compression_level', '4', '-loop', '0', '-an', '-f', 'webp', out
    ]);
    const buf = await fs.readFile(out);
    if (!buf.length) throw new Error('Conversão falhou: saída vazia');
    return buf;
  } finally {
    fs.unlink(out).catch(() => {});
  }
}

// modelo de tamanho medido em vídeos reais: tamanho ∝ lado^1.1 × fps^0.73 × (0.33 + 0.0134·qualidade)
// curva qualidade -> tamanho medida com libwebp_anim (igual em vídeos diferentes; q50 = 1)
const Q_CURVE = [[5, 0.39], [10, 0.45], [20, 0.58], [30, 0.71], [40, 0.86], [50, 1.0], [60, 1.15], [70, 1.35], [80, 1.84], [90, 2.97]];
const qFactor = (q) => {
  if (q <= Q_CURVE[0][0]) return Q_CURVE[0][1];
  for (let i = 1; i < Q_CURVE.length; i++) {
    const [q1, f1] = Q_CURVE[i - 1], [q2, f2] = Q_CURVE[i];
    if (q <= q2) return f1 + (f2 - f1) * (q - q1) / (q2 - q1);
  }
  return Q_CURVE[Q_CURVE.length - 1][1];
};
const animModel = (size, fps, q) => Math.pow(size, 1.09) * Math.pow(fps, 0.73) * qFactor(q);

/** Escolhe o conjunto mais fluido (fps) e nítido que, pela estimativa, cabe no limite. */
/**
 * Escolhe os parâmetros (lado, fps, qualidade) que, pela estimativa, cabem no limite de ~1MB.
 * mode:
 *  'qualidade' (padrão) -> nitidez primeiro: até 512px e qualidade alta; baixa o fps antes de pixelar
 *  'auto'               -> equilíbrio: 30/24/20 fps conforme a duração
 *  'fixo'               -> fps NUNCA baixa (ex.: 30 sempre); resolução/qualidade se ajustam
 */
function pickAnimParams(k, fpsTarget, tried, mode = 'qualidade') {
  const allFps = [30, 25, 24, 20, 15, 12, 10, 8, 6];
  const fpsList = (mode === 'fixo' || mode === 'fixo-hd') ? [fpsTarget] : allFps.filter(f => f <= fpsTarget);
  let passes;
  if (mode === 'fixo-hd') {
    // fps fixo, mas sem pixelar: baixa um pouco a resolução antes de baixar a qualidade
    passes = [
      { qmin: 75, smin: 512, fmin: fpsTarget },
      { qmin: 65, smin: 448, fmin: fpsTarget },
      { qmin: 60, smin: 384, fmin: fpsTarget },
      { qmin: 58, smin: 352, fmin: fpsTarget },
      { qmin: 55, smin: 320, fmin: fpsTarget },
      { qmin: 52, smin: 288, fmin: fpsTarget },
      { qmin: 46, smin: 256, fmin: fpsTarget },
      { qmin: 42, smin: 240, fmin: fpsTarget },
      { qmin: 38, smin: 224, fmin: fpsTarget },
      { qmin: 34, smin: 208, fmin: fpsTarget },
      { qmin: 28, smin: 192, fmin: fpsTarget },
      { qmin: 10, smin: 160, fmin: fpsTarget }
    ];
  } else if (mode === 'fixo') {
    passes = [
      { qmin: 35, smin: 256, fmin: fpsTarget },
      { qmin: 20, smin: 224, fmin: fpsTarget },
      { qmin: 15, smin: 192, fmin: fpsTarget },
      { qmin: 10, smin: 160, fmin: fpsTarget },
      { qmin: 5, smin: 128, fmin: fpsTarget }
    ];
  } else if (mode === 'auto') {
    passes = [
      { qmin: 60, smin: 448, fmin: fpsTarget },
      { qmin: 50, smin: 320, fmin: fpsTarget },
      { qmin: 35, smin: 256, fmin: fpsTarget },
      { qmin: 20, smin: 224, fmin: Math.min(fpsTarget, 20) },
      { qmin: 25, smin: 224, fmin: 15 },
      { qmin: 20, smin: 192, fmin: 12 },
      { qmin: 10, smin: 160, fmin: 10 }
    ];
  } else {
    // qualidade: o que mais estraga figurinha é ficar pixelada, então a qualidade é a última a cair
    passes = [
      { qmin: 75, smin: 512, fmin: 20 },
      { qmin: 70, smin: 448, fmin: 15 },
      { qmin: 65, smin: 384, fmin: 15 },
      { qmin: 65, smin: 320, fmin: 15 },
      { qmin: 60, smin: 384, fmin: 12 },
      { qmin: 55, smin: 320, fmin: 12 },
      { qmin: 50, smin: 320, fmin: 10 },
      { qmin: 50, smin: 288, fmin: 8 },
      { qmin: 45, smin: 256, fmin: 8 },
      { qmin: 38, smin: 240, fmin: 6 },
      { qmin: 25, smin: 192, fmin: 6 },
      { qmin: 10, smin: 160, fmin: 6 }
    ];
  }
  const sizes = [512, 480, 448, 416, 384, 352, 320, 288, 256, 240, 224, 208, 192, 176, 160, 144, 128];
  const qs = [90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 42, 38, 35, 30, 25, 20, 15, 10, 5];
  for (const pass of passes) {
    for (const f of fpsList.filter(x => x >= pass.fmin)) {
      for (const sz of sizes.filter(x => x >= pass.smin)) {
        for (const q of qs.filter(x => x >= pass.qmin)) {
          const key = `${sz}/${f}/${q}`;
          if (tried.has(key)) continue;
          if (k * animModel(sz, f, q) <= ANIM_MAX_SIZE * 0.95) return { size: sz, fps: f, q };
        }
      }
    }
  }
  return (mode === 'fixo' || mode === 'fixo-hd') ? { size: 160, fps: fpsTarget, q: 10 } : { size: 160, fps: 6, q: 10 };
}

/**
 * config.json -> "figFps":
 *   ausente / "qualidade" -> modo qualidade (padrão)
 *   0 / "auto"            -> equilíbrio
 *   10..30                -> fps fixo
 */
function readFigMode() {
  try {
    const cfg = JSON.parse(fsSync.readFileSync(path.join(__dirname, '../../config.json'), 'utf-8'));
    const v = cfg.figFps;
    const ate30 = Math.max(0, Math.min(30, Number(cfg.fig30AteSeg ?? 15) || 0));
    if (v === undefined || v === null || v === 'qualidade') return { mode: 'qualidade', fps: 30, ate30 };
    if (v === 0 || v === '0' || v === 'auto') return { mode: 'auto', fps: 30, ate30: 0 };
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return { mode: 'fixo', fps: Math.min(30, Math.max(10, Math.round(n))) };
    return { mode: 'qualidade', fps: 30, ate30 };
  } catch {
    return { mode: 'qualidade', fps: 30, ate30: 15 };
  }
}

async function convertVideoToAnimatedWebp(tmpIn, maxDuration, forceSquare, circle = false) {
  const dur = Math.max(1, Math.min(60, Number(maxDuration) || 8));
  const figMode = readFigMode();
  // padrão: até 15s (fig30AteSeg) sempre 30 fps sem pixelar; acima disso, modo qualidade
  const mode = (figMode.mode === 'qualidade' && dur <= (figMode.ate30 ?? 15)) ? 'fixo-hd' : figMode.mode;
  if (mode === 'fixo-hd') figMode.fps = 30;
  const fixed = mode === 'fixo' || mode === 'fixo-hd';
  const fpsTarget = fixed ? figMode.fps : (dur <= 6 ? 30 : dur <= 10 ? 24 : mode === 'auto' ? 20 : 25);
  const tried = new Set();
  const choose = (k) => pickAnimParams(k, fpsTarget, tried, mode);
  // 1) amostra curta em 512px para estimar quanto este vídeo "pesa" (evita várias conversões completas)
  const probeDur = Math.min(dur, 2.5);
  const startFps = fixed ? fpsTarget : Math.min(fpsTarget, dur <= 6 ? 30 : dur <= 10 ? 24 : 15);
  let k;
  try {
    const probe = await encodeAnim(tmpIn, probeDur, 512, startFps, 70, forceSquare, circle);
    k = (probe.length * (dur / probeDur)) / animModel(512, startFps, 70);
  } catch {
    k = 1e9; // não deu para medir: começa conservador
  }
  let p = choose(k);
  let best = null;      // melhor resultado que cabe
  let smallest = null;  // menor resultado (se nada couber)
  for (let attempt = 0; attempt < 4; attempt++) {
    tried.add(`${p.size}/${p.fps}/${p.q}`);
    const buf = await encodeAnim(tmpIn, dur, p.size, p.fps, p.q, forceSquare, circle);
    if (process.env.FIG_DEBUG) console.log(`  tentativa ${attempt + 1}: ${p.size}px ${p.fps}fps q${p.q} = ${(buf.length / 1024).toFixed(0)}KB`);
    if (!smallest || buf.length < smallest.buf.length) smallest = { buf, p };
    k = buf.length / animModel(p.size, p.fps, p.q); // recalibra com o tamanho real
    if (buf.length <= ANIM_MAX_SIZE) {
      best = { buf, p };
      // sobrou espaço (menos de 80% do limite)? tenta UMA vez algo mais nítido
      if (buf.length < ANIM_MAX_SIZE * 0.8 && attempt < 3) {
        const up = choose(k * 1.04);
        const nitidez = (x) => Math.min(x.q, 80) * Math.sqrt(x.size) + (x.fps >= p.fps ? 0 : -1e6);
        const better = nitidez(up) > nitidez(p) * 1.05;
        if (better) {
          tried.add(`${up.size}/${up.fps}/${up.q}`);
          const b2 = await encodeAnim(tmpIn, dur, up.size, up.fps, up.q, forceSquare, circle).catch(() => null);
          if (process.env.FIG_DEBUG && b2) console.log(`  melhoria: ${up.size}px ${up.fps}fps q${up.q} = ${(b2.length / 1024).toFixed(0)}KB`);
          if (b2 && b2.length <= ANIM_MAX_SIZE) best = { buf: b2, p: up };
        }
      }
      break;
    }
    p = choose(k * 1.03); // passou do limite: escolhe de novo com margem
  }
  const out = best || smallest;
  console.log(`[FIGURINHA] animada ${out.p.size}px ${out.p.fps}fps q${out.p.q} -> ${(out.buf.length / 1024).toFixed(0)}KB (${dur}s)${best ? '' : ' (no limite mínimo)'}`);
  return out.buf;
}

// Converter para WebP (sempre .mp4 para vídeo)
async function convertToWebp(mediaBuffer, isVideo = false, forceSquare = false, maxDuration = 8, opts = {}) {
  // forma: redonda (circle) ou corte quadrado (crop: 'centro' | 'cima' | 'baixo' | 'esquerda' | 'direita')
  const circle = opts.circle ? true : (typeof opts.crop === 'string' ? opts.crop : false);
  // Se já for webp estático e não for vídeo, retorna direto
  if (!isVideo && !circle &&
      mediaBuffer.slice(0, 4).toString() === "RIFF" &&
      mediaBuffer.slice(8, 12).toString() === "WEBP") {
    return mediaBuffer;
  }

  // Arquivo de entrada temporário
  const inExt = isVideo ? "mp4" : detectImageExtension(mediaBuffer);
  const tmpIn = generateTempFileName(isVideo ? "mp4" : inExt);

  await fs.writeFile(tmpIn, mediaBuffer);
  const st = await fs.stat(tmpIn);
  if (st.size === 0) throw new Error("Arquivo temporário de entrada vazio");

  if (isVideo) {
    try {
      return await convertVideoToAnimatedWebp(tmpIn, maxDuration, forceSquare, circle);
    } finally {
      await fs.unlink(tmpIn).catch(() => {});
    }
  }

  // figurinha de imagem em 512px (tamanho padrão do WhatsApp) — nítida no celular
  const vfBase = typeof circle === 'string'
    ? squareCropFilter(512, circle)
    : circle
    ? circleFilter(512)
    : forceSquare
    ? "scale=512:512:flags=lanczos"
    : "scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba";

  // animações longas usam menos quadros por segundo para caber no limite de ~1MB
  const filters = isVideo ? `${vfBase},fps=${maxDuration > 10 ? 10 : 15}` : vfBase;

  // Limites de tamanho e qualidade
  const MAX_SIZE = 990000; // Menos de 1MB com margem de segurança (~966KB)
  const MIN_QUALITY = isVideo ? 15 : 25;
  let quality = isVideo ? 45 : 90;
  let outBuffer = null;
  let attempts = 0;
  const MAX_ATTEMPTS = 8;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    const tmpOut = generateTempFileName("webp");

    const cmdOptions = [
      "-vf", filters,
      "-c:v", "libwebp",
      "-lossless", "0",
      "-compression_level", "6",
      "-preset", "default",
      ...(isVideo
        ? ["-q:v", String(quality), "-loop", "0", "-an", "-t", String(maxDuration)]
        : ["-q:v", String(quality)])
    ];

    await new Promise((resolve, reject) => {
      ffmpeg(tmpIn)
        .outputOptions(cmdOptions)
        .format("webp")
        .on("error", err => reject(err))
        .on("end", () => resolve())
        .save(tmpOut);
    });

    const outStat = await fs.stat(tmpOut).catch(() => null);
    if (!outStat || outStat.size === 0) {
      await fs.unlink(tmpOut).catch(()=>{});
      throw new Error("Conversão falhou: saída vazia");
    }

    outBuffer = await fs.readFile(tmpOut);
    await fs.unlink(tmpOut).catch(()=>{});

    // Verifica se está dentro do limite
    if (outBuffer.length <= MAX_SIZE) {
      break;
    }

    // Se ainda está grande, reduz qualidade
    if (quality <= MIN_QUALITY) {
      break;
    }

    // Reduz qualidade progressivamente
    const reductionFactor = outBuffer.length / MAX_SIZE;
    if (reductionFactor > 1.5) {
      quality = Math.max(MIN_QUALITY, Math.floor(quality * 0.6));
    } else if (reductionFactor > 1.2) {
      quality = Math.max(MIN_QUALITY, Math.floor(quality * 0.75));
    } else {
      quality = Math.max(MIN_QUALITY, quality - 10);
    }
  }

  // Limpeza
  await fs.unlink(tmpIn).catch(()=>{});

  return outBuffer;
}

/** Corta um trecho de vídeo/áudio (início e duração em segundos) e devolve o buffer em mp4. */
async function trimMedia(buffer, start = 0, duration = 8) {
  const tmpIn = generateTempFileName('mp4');
  const tmpOut = generateTempFileName('mp4');
  await fs.writeFile(tmpIn, buffer);
  try {
    await runFfmpeg(['-ss', String(Math.max(0, start)), '-i', tmpIn, '-t', String(Math.max(0.5, duration)),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', tmpOut]);
    const out = await fs.readFile(tmpOut);
    if (!out.length) throw new Error('corte gerou arquivo vazio');
    return out;
  } finally {
    fs.unlink(tmpIn).catch(() => {});
    fs.unlink(tmpOut).catch(() => {});
  }
}

// ===================== TARJA PRETA (letterbox) =====================
/**
 * Procura tarjas pretas (em cima/embaixo ou nas laterais) em vídeo ou imagem.
 * Usa o cropdetect do ffmpeg em vários quadros e pega o recorte mais comum.
 * @returns {{ w, h, x, y, W, H, top, bottom, left, right } | null}  null = não tem tarja
 */
async function detectBlackBars(buffer, isVideo = true) {
  const tmpIn = generateTempFileName(isVideo ? 'mp4' : detectImageExtension(buffer));
  await fs.writeFile(tmpIn, buffer);
  try {
    const args = ['-hide_banner', '-i', tmpIn];
    // vídeo: analisa ~2 quadros por segundo dos primeiros 60s; imagem: 1 quadro
    if (isVideo) args.push('-t', '60', '-vf', 'fps=2,cropdetect=limit=28:round=2:reset=1');
    else args.push('-frames:v', '1', '-vf', 'cropdetect=limit=28:round=2:reset=1:skip=0');
    args.push('-an', '-f', 'null', '-');
    const r = spawnSync('ffmpeg', args, { encoding: 'utf8', timeout: 90000, maxBuffer: 32 * 1024 * 1024 });
    const err = String(r.stderr || '');
    const dim = err.match(/Stream #.*Video:.*?(\d{2,5})x(\d{2,5})/);
    if (!dim) return null;
    const W = Number(dim[1]), H = Number(dim[2]);
    const counts = new Map();
    for (const m of err.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)) counts.set(m[0], (counts.get(m[0]) || 0) + 1);
    if (!counts.size) return null;
    // recorte mais frequente (ignora quadros totalmente pretos, que dão recorte minúsculo)
    const list = [...counts.entries()]
      .map(([k, c]) => { const [w, h, x, y] = k.slice(5).split(':').map(Number); return { w, h, x, y, c }; })
      .filter((o) => o.w >= W * 0.3 && o.h >= H * 0.3)
      .sort((a, b) => b.c - a.c || (b.w * b.h) - (a.w * a.h));
    if (!list.length) return null;
    const { w, h, x, y } = list[0];
    const top = y, bottom = H - h - y, left = x, right = W - w - x;
    // só considera tarja se tirar pelo menos 3% da altura ou da largura
    const hasV = (top + bottom) >= H * 0.03, hasH = (left + right) >= W * 0.03;
    if (!hasV && !hasH) return null;
    return {
      w: hasH ? w : W, h: hasV ? h : H, x: hasH ? x : 0, y: hasV ? y : 0,
      W, H, top: hasV ? top : 0, bottom: hasV ? bottom : 0, left: hasH ? left : 0, right: hasH ? right : 0
    };
  } finally {
    fs.unlink(tmpIn).catch(() => {});
  }
}

/** Corta a tarja (vídeo mantém o áudio). Imagem volta em PNG. */
async function cropBlackBars(buffer, isVideo, crop) {
  const tmpIn = generateTempFileName(isVideo ? 'mp4' : detectImageExtension(buffer));
  const tmpOut = generateTempFileName(isVideo ? 'mp4' : 'png');
  await fs.writeFile(tmpIn, buffer);
  try {
    const vf = `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`;
    if (isVideo) {
      await runFfmpeg(['-i', tmpIn, '-vf', `${vf},scale=trunc(iw/2)*2:trunc(ih/2)*2`, '-map', '0:v:0', '-map', '0:a?',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', tmpOut]);
    } else {
      await runFfmpeg(['-i', tmpIn, '-vf', vf, '-frames:v', '1', tmpOut]);
    }
    const out = await fs.readFile(tmpOut);
    if (!out.length) throw new Error('corte gerou arquivo vazio');
    return out;
  } finally {
    fs.unlink(tmpIn).catch(() => {});
    fs.unlink(tmpOut).catch(() => {});
  }
}

// ===================== LEGENDA NA FIGURINHA (estilo meme) =====================
const escapeMarkup = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** PNG transparente com o texto branco e contorno preto, na largura indicada. */
async function renderCaptionPng(text, width) {
  const t = escapeMarkup(String(text).slice(0, 120));
  const fontSize = Math.round(width / (t.length > 40 ? 16 : t.length > 20 ? 13 : 10));
  const mk = (color) => sharp({
    text: { text: `<span foreground="${color}" font_weight="heavy">${t}</span>`, font: `sans ${fontSize}px`, rgba: true, width: Math.round(width * 0.92), align: 'centre', dpi: 72 }
  }).png().toBuffer();
  const [white, black] = await Promise.all([mk('white'), mk('black')]);
  const meta = await sharp(white).metadata();
  const pad = Math.max(2, Math.round(fontSize / 10));
  const W = meta.width + pad * 2, H = meta.height + pad * 2;
  const offs = [];
  for (let dx = -pad; dx <= pad; dx += pad) for (let dy = -pad; dy <= pad; dy += pad) if (dx || dy) offs.push({ input: black, left: pad + dx, top: pad + dy });
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([...offs, { input: white, left: pad, top: pad }]).png().toBuffer();
}

/**
 * Escreve um texto na parte de baixo da mídia.
 * Imagem -> PNG quadrado 512 | Vídeo -> MP4 quadrado 512 (com áudio, se tiver)
 */
async function captionMedia(buffer, isVideo, text) {
  const S = 512;
  const cap = await renderCaptionPng(text, S);
  const cm = await sharp(cap).metadata();
  const top = Math.max(0, S - cm.height - Math.round(S * 0.04));
  if (!isVideo) {
    const base = await sharp(buffer).resize(S, S, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    return sharp(base).composite([{ input: cap, left: Math.round((S - cm.width) / 2), top }]).png().toBuffer();
  }
  const tmpIn = generateTempFileName('mp4');
  const tmpCap = generateTempFileName('png');
  const tmpOut = generateTempFileName('mp4');
  await fs.writeFile(tmpIn, buffer);
  await fs.writeFile(tmpCap, cap);
  try {
    await runFfmpeg(['-i', tmpIn, '-i', tmpCap, '-filter_complex',
      `[0:v]scale=${S}:${S}:force_original_aspect_ratio=decrease,pad=${S}:${S}:(ow-iw)/2:(oh-ih)/2:color=black[b];[b][1:v]overlay=(W-w)/2:${top}[v]`,
      '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-t', '60', tmpOut]);
    return await fs.readFile(tmpOut);
  } finally {
    for (const f of [tmpIn, tmpCap, tmpOut]) fs.unlink(f).catch(() => {});
  }
}

// ===================== FIGURINHA ANIMADA -> VÍDEO =====================
/**
 * Converte webp animado em MP4 (o ffmpeg não lê webp animado, então os quadros saem pelo sharp).
 * audioBuffer opcional: som da figurinha (repete o vídeo até o fim do som).
 */
async function stickerToVideo(webpBuffer, audioBuffer = null) {
  const meta = await sharp(webpBuffer, { animated: true }).metadata();
  const pages = meta.pages || 1;
  const w = meta.width, h = meta.pageHeight || meta.height;
  const delays = (meta.delay && meta.delay.length ? meta.delay : [100]).map(d => (d > 0 ? d : 100));
  const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
  const fps = Math.max(1, Math.min(60, Math.round(1000 / avg)));
  const raw = await sharp(webpBuffer, { animated: true }).flatten({ background: '#ffffff' }).raw().toBuffer();
  const W2 = w - (w % 2), H2 = h - (h % 2);
  const tmpRaw = generateTempFileName('rgb');
  const tmpAud = audioBuffer ? generateTempFileName('ogg') : null;
  const tmpOut = generateTempFileName('mp4');
  await fs.writeFile(tmpRaw, raw);
  if (tmpAud) await fs.writeFile(tmpAud, audioBuffer);
  try {
    const args = ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-r', String(fps)];
    if (tmpAud) args.push('-stream_loop', '-1');
    args.push('-i', tmpRaw);
    if (tmpAud) args.push('-i', tmpAud);
    args.push('-vf', `crop=${W2}:${H2}:0:0,scale=trunc(iw*2/2)*2:trunc(ih*2/2)*2`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p');
    if (tmpAud) args.push('-c:a', 'aac', '-shortest');
    args.push('-movflags', '+faststart', tmpOut);
    await runFfmpeg(args);
    return { video: await fs.readFile(tmpOut), frames: pages, fps };
  } finally {
    for (const f of [tmpRaw, tmpAud, tmpOut].filter(Boolean)) fs.unlink(f).catch(() => {});
  }
}

// Escrever EXIF
async function writeExif(webpBuffer, metadata) {
  try {
    const img = new webp.Image();
    await img.load(webpBuffer);
    const json = {
      "sticker-pack-id": "https://github.com/hiudyy",
      "sticker-pack-name": metadata.packname || "",
      "sticker-pack-publisher": metadata.author || "",
      "emojis": ["ASTA MD"]
    };
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2A, 0x00,
      0x08, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x16, 0x00,
      0x00, 0x00
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    img.exif = exif;
    return await img.save(null);
  } catch (e) {
    return webpBuffer;
  }
}

// Resolver input
async function resolveInputToBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (typeof input === "string") {
    if (/^data:.*?;base64,/i.test(input)) {
      return Buffer.from(input.split(",")[1], "base64");
    }
    if (/^https?:\/\//i.test(input)) {
      return await getBuffer(input);
    }
    return await fs.readFile(input);
  }
  if (input && typeof input === "object" && input.url) {
    return await getBuffer(input.url);
  }
  throw new Error("Entrada de sticker inválida");
}

/**
 * Envia sticker
 */
const sendSticker = async (nazu, jid, {
  sticker: input,
  type = "image",
  packname = "",
  author = "",
  forceSquare = false,
  circle = false,
  maxDuration = 8,
  audio = null,      // { ogg, seconds, waveform } -> envia como figurinha COM som
  mentions = null
}, { quoted } = {}) => {
  if (!["image", "video"].includes(type)) {
    throw new Error('Tipo deve ser "image" ou "video"');
  }
  const buffer = await resolveInputToBuffer(input);
  if (!buffer || buffer.length < 10) {
    throw new Error("Buffer inválido/vazio");
  }

  let webpBuffer = await convertToWebp(buffer, type === "video", forceSquare, maxDuration, { circle });

  if (packname || author) {
    webpBuffer = await writeExif(webpBuffer, { packname, author });
  }

  if (audio?.ogg) {
    const { sendSoundSticker } = await import('./soundSticker.js');
    await sendSoundSticker(nazu, jid, { webp: webpBuffer, clip: audio, quoted, size: 320, mentions: mentions || undefined });
    return webpBuffer;
  }

  const { withReconnect } = await import('./soundSticker.js');
  await withReconnect(nazu, (sock) => sock.sendMessage(jid, { sticker: webpBuffer, ...(mentions ? { mentions } : {}) }, { quoted }));
  return webpBuffer;
};

export { sendSticker, writeExif, convertToWebp, trimMedia, captionMedia, stickerToVideo, detectBlackBars, cropBlackBars };
