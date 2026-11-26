/**
 * ★彡 ASTA MD 彡★ — PERMISSÕES DE SUBDONOS
 * O dono escolhe quais comandos de dono cada subdono pode usar:
 *   !permsub @fulano tm            -> só o !tm (e os comandos do !tm: tmparar, tmcanal...)
 *   !permsub @fulano tm divdono    -> !tm e !divdono
 *   !permsub @fulano tudo          -> todos os comandos de dono (menos os protegidos abaixo)
 *   !permsub @fulano limpar        -> tira as permissões
 * Salvo em dados/database/subdonos-permissoes.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '../../../database/subdonos-permissoes.json');

/** nunca liberados para subdono (só o dono principal) */
export const SO_DONO_PRINCIPAL = ['permsub', 'permissoes', 'addsubdono', 'rmsubdono', 'remsubdono', 'atualizar', 'update', 'atualizarbot', 'apikey', 'setapikey', 'reiniciar', 'restart', 'desligar', 'backupdados', 'instalarfundo', 'painelweb'];

/** "famílias": dar a permissão do comando principal libera os comandos ligados a ele */
export const FAMILIAS = {
  tm: (c) => c === 'tm' || /^tm[a-z]+$/.test(c) || c === 'transmissao' || c === 'transmitir',
  divdono: (c) => c.startsWith('divdono') || c === 'divulgar' || c === 'divulgacao',
  manutencao: (c) => c === 'manutencao',
  bangeral: (c) => ['bangeral', 'banirtodos', 'limpargrupo'].includes(c),
  agendar: (c) => ['agendar', 'agendados', 'desagendar'].includes(c),
  status: (c) => ['status', 'logs', 'avisos'].includes(c)
};

const base = (id) => String(id || '').split('@')[0].split(':')[0];
let cache = null, cacheM = 0;
function load() {
  try {
    const st = fs.statSync(FILE);
    if (cache && st.mtimeMs === cacheM) return cache;
    cache = JSON.parse(fs.readFileSync(FILE, 'utf-8')) || {};
    cacheM = st.mtimeMs;
  } catch { cache = cache || {}; }
  return cache;
}
function save(d) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(d, null, 2));
  cache = d; try { cacheM = fs.statSync(FILE).mtimeMs; } catch { }
}

export const getSubPerms = (id) => load()[base(id)] || [];
export function setSubPerms(id, perms) {
  const d = { ...load() };
  if (!perms?.length) delete d[base(id)]; else d[base(id)] = [...new Set(perms)];
  save(d);
  return d[base(id)] || [];
}
export const allSubPerms = () => load();

/** O subdono pode usar este comando? */
export function subPodeUsar(id, command) {
  const c = String(command || '').toLowerCase();
  if (!c || SO_DONO_PRINCIPAL.includes(c)) return false;
  const perms = getSubPerms(id);
  if (!perms.length) return false;
  if (perms.includes('*')) return true;
  return perms.some((p) => p === c || (FAMILIAS[p] && FAMILIAS[p](c)));
}
