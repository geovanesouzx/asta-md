/**
 * Fila do ffmpeg: limita quantas conversões rodam AO MESMO TEMPO.
 * Em lotes de figurinhas (vários .s / .squadrado / .scorte seguidos), rodar tudo junto
 * sobrecarrega o computador e as conversões estouram o tempo. Aqui elas esperam a vez.
 *
 * Padrão: metade dos núcleos do processador (mínimo 2, máximo 4).
 * Dá para mudar com "ffmpegSimultaneos" no config.json.
 */
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, '../../config.json');

const maxSlots = () => {
  try {
    const n = Number(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')).ffmpegSimultaneos);
    if (Number.isFinite(n) && n >= 1) return Math.min(16, Math.round(n));
  } catch { }
  return Math.max(2, Math.min(4, Math.floor((os.cpus()?.length || 2) / 2)));
};

const q = global.__astaFfmpegQueue || (global.__astaFfmpegQueue = { running: 0, waiting: [] });

/** Roda fn() quando tiver uma vaga livre. */
export async function withFfmpegSlot(fn) {
  if (q.running >= maxSlots()) {
    await new Promise((resolve) => q.waiting.push(resolve));
  }
  q.running++;
  try {
    return await fn();
  } finally {
    q.running--;
    const next = q.waiting.shift();
    if (next) next();
  }
}

export const ffmpegQueueStatus = () => ({ running: q.running, waiting: q.waiting.length, max: maxSlots() });
