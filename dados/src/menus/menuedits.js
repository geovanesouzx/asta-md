import { renderMenu } from './_render.js';

export default async function menuedits(prefix, botName = 'MeuBot', userName = 'Usuário', design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '🖼️ EDIÇÕES DE IMAGEM', i: [
        'jornal — foto em capa de jornal',
        'cinema — foto em tela de cinema',
        'blackwhite — preto e branco',
        'desfoque — borra a foto',
        'wojakreaction — reação wojak',
        'camera — efeito de câmera'
      ]
    }
  ], { rodape: '💡 Responda uma foto com o comando.' });
}
