import { renderMenu } from './_render.js';

export default async function menuLogos(prefix, botName = 'MeuBot', userName = 'Usuário', design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '🖌️ LOGOS (1 texto)', i: [{ g: ['amongus', 'royal', 'mascotemetal', 'firework', 'summerbeach', 'cloudsky', 'techstyle', 'watercolor', 'ligatures', 'graffitistyle', 'frozen', 'colorful', 'balloon', 'multicolor', 'metal', 'doubleexposure', 'mascoteneon', 'eraser', 'america', 'snow', 'sunset', 'halloween', 'blood', 'hallobat', 'cemiterio', 'ffavatar', 'vintage3d', 'hollywood', 'glitch', 'galaxy', 'glossy', 'dragonfire', 'pubgavatar', 'comics'], n: 2 }]
    },
    { t: '🖌️ LOGOS (2 textos)', i: [{ g: ['pornhub', 'avengers', 'marvel', 'deadpool'], n: 2 }] }
  ], { rodape: `💡 Ex: ${prefix}galaxy Geovane  ·  2 textos: ${prefix}marvel ASTA/MD` });
}
