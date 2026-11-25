#!/usr/bin/env node
/**
 * ★彡 ASTA MD 彡★ — atualização pelo terminal:  npm run update
 * (o mesmo atualizador do comando !atualizar: baixa do GitHub do ASTA MD e mantém
 *  sessão, dados, config.json e banner)
 *
 *   npm run update            -> atualiza se tiver versão nova
 *   npm run update -- --forcar -> reinstala a versão do GitHub mesmo sem versão nova
 */
import { checkForUpdate, applyUpdate, localVersion } from '../funcs/utils/autoUpdate.js';

const c = { g: '\x1b[1;32m', r: '\x1b[1;31m', y: '\x1b[1;33m', b: '\x1b[1;36m', x: '\x1b[0m' };
const force = process.argv.includes('--forcar') || process.argv.includes('--force');

(async () => {
  console.log(`${c.b}============================================${c.x}`);
  console.log(`${c.b}🔄 ASTA MD — Atualizador (versão instalada: ${localVersion()})${c.x}`);
  console.log(`${c.b}============================================${c.x}`);
  try {
    const inf = await checkForUpdate();
    if (!inf.available && !force) {
      console.log(`${c.g}✅ Já está na versão mais nova (${inf.current}, commit ${inf.shortSha}).${c.x}`);
      console.log(`${c.y}💡 Para reinstalar mesmo assim: npm run update -- --forcar${c.x}`);
      return;
    }
    console.log(`${c.y}🆕 ${inf.current} -> ${inf.latest} (${inf.shortSha}) ${inf.message}${c.x}`);
    const r = await applyUpdate((t) => console.log(t), { force });
    console.log(`${c.g}✅ Atualizado para ${r.version}: ${r.changed} arquivo(s) trocado(s), ${r.added} novo(s).${c.x}`);
    if (r.configAdded?.length) console.log(`⚙️ Opções novas no config.json: ${r.configAdded.join(', ')}`);
    if (r.backup) console.log(`💾 Backup: ${r.backup}`);
    console.log(`${c.g}🚀 Pronto! Ligue o bot com: npm start${c.x}`);
  } catch (e) {
    console.log(`${c.r}❌ Não consegui atualizar: ${e.message}${c.x}`);
    process.exitCode = 1;
  }
})();
