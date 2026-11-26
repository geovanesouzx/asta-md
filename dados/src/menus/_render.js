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
  // modo "colher ajuda": devolve os itens com a explicação (usado pela ajuda automática dos comandos)
  if (Array.isArray(design?.__colherAjuda)) {
    for (const sec of sections) {
      if (!sec) continue;
      for (const it of sec.i || []) if (typeof it === 'string') design.__colherAjuda.push({ cat: sec.t, item: it });
    }
    return '';
  }
  const out = [String(header).replace(/#user#/g, userName)];
  const vistos = new Set();
  for (const sec of sections) {
    if (!sec || (sec.nl && lite)) continue;
    const linhas = [];
    for (const it of sec.i || []) {
      if (!it) continue;
      if (typeof it === 'object' && it.nl && lite) continue;
      if (typeof it === 'string') {
        // no menu aparece só o comando (o "como usar" aparece quando a pessoa manda o comando sem nada)
        for (const c of soComandos(it)) {
          if (vistos.has(c)) continue;
          vistos.add(c);
          linhas.push(`${middleBorder}${menuItemIcon}${prefix}${c}`);
        }
        continue;
      }
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

/** opção que não é comando (ex.: "args", "@user", "on/off", "<texto>") */
const ehArgumento = (w) => !w || /^[<\[@(]/.test(w) || /^\d/.test(w) || w.includes('/') || w.includes('|');

/**
 * "mute @user · desmute @user — silencia" -> ['mute', 'desmute']
 * "uno criar · entrar · jogar <nº>"         -> ['uno']  (são opções do mesmo comando)
 */
export function soComandos(item) {
  const parte = String(item).split(' — ')[0];
  const segs = parte.split(' · ');
  const p0 = segs[0].trim().split(/\s+/);
  const out = [p0[0]];
  const opcoesDoMesmo = p0.length > 1 && (!ehArgumento(p0[1]) || p0[1].includes('/')); // "antitoxic on/off · config" = opções
  for (const sg of segs.slice(1)) {
    const w = sg.trim().split(/\s+/)[0];
    if (!w || ehArgumento(w)) continue;
    if (!opcoesDoMesmo || w.startsWith(p0[0])) out.push(w);
  }
  return out.filter(Boolean);
}

/** só fora do modo lite */
export const NL = (c) => ({ c, nl: true });
