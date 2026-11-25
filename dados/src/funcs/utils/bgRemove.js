/**
 * REMOVER FUNDO (foto e vídeo) — roda no próprio computador do bot, sem API.
 * Usa o modelo de IA do pacote @imgly/background-removal-node (instalado sob demanda: !instalarfundo).
 *
 * Foto  -> PNG com fundo transparente.
 * Vídeo -> remove o fundo quadro a quadro e devolve um vídeo .mov com transparência
 *          (depois vira figurinha animada normal pelo convertToWebp).
 */
import { withFfmpegSlot } from './ffmpegQueue.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOT_ROOT = path.join(__dirname, '../../../../');
const PKG = '@imgly/background-removal-node';
const PKG_VERSION = '1.4.5';

let _mod = null;
let _loadErr = null;

/** O removedor está instalado? (tenta carregar uma vez) */
export async function loadRemover() {
  if (_mod) return _mod;
  try {
    _mod = await import(PKG);
    _loadErr = null;
    return _mod;
  } catch (e) {
    _loadErr = e;
    return null;
  }
}
export const removerError = () => _loadErr?.message || null;

/** Instala o removedor (uso do dono, uma vez). Baixa ~300MB. */
export function installRemover(onLine = () => { }) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const args = ['install', `${PKG}@${PKG_VERSION}`, '--no-audit', '--no-fund', '--save'];
    const opts = { cwd: BOT_ROOT, env: { ...process.env, ONNXRUNTIME_NODE_INSTALL_CUDA: 'skip' } };
    const p = isWin ? spawn(['npm', ...args].join(' '), { ...opts, shell: true }) : spawn('npm', args, opts);
    let out = '';
    const take = (d) => { out += d; String(d).split('\n').filter(Boolean).forEach((l) => onLine(l)); if (out.length > 20000) out = out.slice(-20000); };
    p.stdout.on('data', take);
    p.stderr.on('data', take);
    p.on('error', (e) => resolve({ ok: false, log: e.message }));
    p.on('close', async (code) => {
      _mod = null;
      const ok = code === 0 && !!(await loadRemover());
      resolve({ ok, log: out.slice(-1500) });
    });
  });
}

/* ------------------------------------------------------------------ */

const TMP = () => {
  const d = path.join(__dirname, '../../../database/tmp');
  if (!fsSync.existsSync(d)) fsSync.mkdirSync(d, { recursive: true });
  return d;
};
const tmpName = (ext) => path.join(TMP(), `bg_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`);

// passa pela fila (lotes de figurinhas não sobrecarregam o computador)
const runFfmpeg = (args, timeoutMs = 180_000) => withFfmpegSlot(() => runFfmpegRaw(args, timeoutMs));
const runFfmpegRaw = (args, timeoutMs = 180_000) =>
  new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; if (err.length > 4000) err = err.slice(-4000); });
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('ffmpeg: tempo esgotado')); }, timeoutMs);
    p.on('error', (e) => { clearTimeout(t); reject(e); });
    p.on('close', (c) => { clearTimeout(t); c === 0 ? resolve() : reject(new Error(`ffmpeg (${c}): ${err.trim().split('\n').pop()}`)); });
  });

/** Limpa a máscara: tira os pontinhos soltos (quase transparentes) e firma o que é quase opaco. */
async function cleanAlpha(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    data[i] = a < 48 ? 0 : a > 215 ? 255 : Math.round(((a - 48) / 167) * 255);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Remove o fundo de uma imagem (o lado maior vai até maxSide px). Devolve PNG transparente. */
export async function removeBgImage(imageBuffer, { maxSide = 640, model = 'medium' } = {}) {
  const mod = await loadRemover();
  if (!mod) throw Object.assign(new Error('Removedor de fundo não instalado'), { code: 'SEM_REMOVEDOR' });
  const input = await sharp(imageBuffer, { animated: false })
    .rotate()
    .resize(maxSide, maxSide, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const blob = await mod.removeBackground(new Blob([input], { type: 'image/png' }), { model, output: { format: 'image/png' } });
  return cleanAlpha(Buffer.from(await blob.arrayBuffer()));
}

/**
 * Remove o fundo de um vídeo, quadro a quadro.
 * @returns {Promise<{ video: Buffer, frames: number }>}  vídeo .mov (codec png, com transparência)
 */
export async function removeBgVideo(videoBuffer, { seconds = 5, fps = 8, size = 320, onProgress = null } = {}) {
  const mod = await loadRemover();
  if (!mod) throw Object.assign(new Error('Removedor de fundo não instalado'), { code: 'SEM_REMOVEDOR' });
  const dir = tmpName('d');
  await fs.mkdir(dir, { recursive: true });
  const inFile = path.join(dir, 'in.mp4');
  const outFile = path.join(dir, 'out.mov');
  try {
    await fs.writeFile(inFile, videoBuffer);
    await runFfmpeg(['-i', inFile, '-t', String(seconds), '-vf', `fps=${fps},scale=${size}:${size}:force_original_aspect_ratio=decrease:flags=lanczos`, path.join(dir, 'f_%04d.png')]);
    const frames = (await fs.readdir(dir)).filter((f) => /^f_\d+\.png$/.test(f)).sort();
    if (!frames.length) throw new Error('não consegui ler os quadros do vídeo');
    let done = 0;
    for (const f of frames) {
      const p = path.join(dir, f);
      const blob = await mod.removeBackground(new Blob([await fs.readFile(p)], { type: 'image/png' }), { model: 'small', output: { format: 'image/png' } });
      await fs.writeFile(path.join(dir, 'o' + f.slice(1)), await cleanAlpha(Buffer.from(await blob.arrayBuffer())));
      done++;
      if (onProgress) try { onProgress(done, frames.length); } catch { }
    }
    // junta os quadros num vídeo com transparência (codec png dentro de .mov)
    await runFfmpeg(['-framerate', String(fps), '-i', path.join(dir, 'o_%04d.png'), '-c:v', 'png', '-pix_fmt', 'rgba', outFile]);
    return { video: await fs.readFile(outFile), frames: frames.length };
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => { });
  }
}
