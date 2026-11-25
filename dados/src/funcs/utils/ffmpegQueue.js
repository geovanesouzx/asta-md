/**
 * Fila do ffmpeg: limita quantas conversões rodam AO MESMO TEMPO.
 * Em lotes de figurinhas (vários .s / .squadrado / .scorte seguidos), rodar tudo junto
 * sobrecarrega o computador e as conversões estouram o tempo. Aqui elas esperam a vez.
 *
 * Padrão: PC = metade dos núcleos (2 a 4) · Termux/celular = todos os núcleos menos 1 (até 7).
 * Dá para mudar com "ffmpegSimultaneos" no config.json.
 */
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, '../../config.json');
const IS_TERMUX = !!process.env.TERMUX_VERSION || String(process.env.PREFIX || '').includes('com.termux') || fs.existsSync('/data/data/com.termux');

const maxSlots = () => {
  try {
    const n = Number(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')).ffmpegSimultaneos);
    if (Number.isFinite(n) && n >= 1) return Math.min(16, Math.round(n));
  } catch { }
  const cores = (typeof os.availableParallelism === 'function' ? os.availableParallelism() : 0) || os.cpus()?.length || 2;
  // Termux (celular): usa quase todos os núcleos (deixa 1 livre para o bot continuar respondendo)
  if (IS_TERMUX) return Math.max(2, Math.min(7, cores - 1));
  return Math.max(2, Math.min(4, Math.floor(cores / 2)));
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
