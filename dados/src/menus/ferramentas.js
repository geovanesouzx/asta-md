import { renderMenu } from './_render.js';

export default async function menuFerramentas(prefix, botName = 'MeuBot', userName = 'Usuário', design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '🧰 FERRAMENTAS', i: [
        'tradutor inglês | Bom dia',
        'tts <texto> — texto em áudio',
        'transcrever — responda um áudio',
        'calc <conta>',
        'calc converter <valor> <de> <para>',
        'hora <cidade> · clima <cidade>',
        'qrcode <texto> · lerqr',
        'ssweb <site> — print de um site',
        'encurtalink <link>',
        'upload — responda uma mídia',
        'verificar <link> — o link é seguro?',
        'removebg — tira o fundo da foto',
        'gerarnick <nome>',
        'revelar — abre visualização única'
      ]
    },
    {
      t: '📝 NOTAS E LEMBRETES', i: [
        'nota add <texto> · notas',
        'nota ver <id> · nota del <id>',
        'nota fixar <id> · nota buscar <termo>',
        'lembrete em 30m beber água',
        'meuslembretes · apagalembrete <id>'
      ]
    },
    { t: '🔮 HORÓSCOPO', i: ['horoscopo <signo>', 'signos'] },
    { t: '📊 OUTROS', i: ['estatisticas'] }
  ]);
}
