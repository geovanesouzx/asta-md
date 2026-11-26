/**
 * ★彡 ASTA MD 彡★ — montador de menus
 * Todos os menus usam o mesmo desenho (bordas e ícones do !designmenu).
 *
 * Seção: { t: 'TÍTULO', i: [itens] }
 * Item:
 *   'cmd args — descrição'      -> uma linha
 *   { sub: 'SUBTÍTULO' }        -> subtítulo dentro da seção
 *   { g: ['a', 'b', 'c'], n: 3 } -> vários comandos curtos por linha (listas grandes)
 *   { nl: true, ... }            -> só aparece fora do modo lite
 */
export function renderMenu(prefix, botName, userName, design = {}, sections = [], { lite = false, rodape = '' } = {}) {
  const {
    header = `╭┈⊰ 🌸 『 *${botName}* 』\n┊Olá, #user#!\n╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯`,
    menuTopBorder = '╭┈',
    bottomBorder = '╰─┈┈┈┈┈◜❁◞┈┈┈┈┈─╯',
    menuTitleIcon = '🍧ฺꕸ▸',
    menuItemIcon = '•.̇𖥨֗💜⭟',
    separatorIcon = '❁',
    middleBorder = '┊'
  } = design || {};
  const out = [String(header).replace(/#user#/g, userName)];
  for (const sec of sections) {
    if (!sec || (sec.nl && lite)) continue;
    const linhas = [];
    for (const it of sec.i || []) {
      if (!it) continue;
      if (typeof it === 'object' && it.nl && lite) continue;
      if (typeof it === 'string') { linhas.push(`${middleBorder}${menuItemIcon}${prefix}${it}`); continue; }
      if (it.sub) { if (linhas.length) linhas.push(middleBorder); linhas.push(`${middleBorder}${menuTitleIcon} *${it.sub}*`); continue; }
      if (it.c) { linhas.push(`${middleBorder}${menuItemIcon}${prefix}${it.c}`); continue; }
      if (it.g) {
        const lista = it.g.filter((x) => !(lite && typeof x === 'object' && x.nl)).map((x) => (typeof x === 'object' ? x.c : x));
        const n = it.n || 3;
        for (let k = 0; k < lista.length; k += n) linhas.push(`${middleBorder}${menuItemIcon}${lista.slice(k, k + n).map((c) => `${prefix}${c}`).join('  ')}`);
      }
    }
    if (!linhas.length) continue;
    out.push(`${menuTopBorder}${separatorIcon} *${sec.t}*\n${middleBorder}\n${linhas.join('\n')}\n${bottomBorder}`);
  }
  if (rodape) out.push(rodape);
  return out.join('\n\n');
}

/** só fora do modo lite */
export const NL = (c) => ({ c, nl: true });
