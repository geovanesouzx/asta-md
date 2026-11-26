import { renderMenu } from './_render.js';

export default async function menudown(prefix, botName = 'MeuBot', userName = 'Usuário', design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '🎵 MÚSICA', i: [
        'play <nome ou link> — áudio (com botões ÁUDIO/VÍDEO)',
        'play2 <nome> — outra fonte de áudio',
        'spotify <link ou nome>',
        'soundcloud <link ou nome>',
        'letra <música> — letra da música'
      ]
    },
    { t: '🎬 VÍDEO', i: ['playvid <nome ou link> — vídeo do YouTube'] },
    {
      t: '📥 REDES SOCIAIS', i: [
        'tiktok <link>',
        'instagram <link>',
        'igstory <usuário>',
        'facebook <link>',
        'twitter <link>',
        'kwai <link>',
        'pinterest <busca>'
      ]
    },
    { t: '📁 ARQUIVOS', i: ['gdrive <link>', 'mediafire <link>'] }
  ]);
}
