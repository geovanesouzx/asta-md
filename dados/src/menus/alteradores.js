import { renderMenu } from './_render.js';

export default async function menuAlterador(prefix, botName = 'MeuBot', userName = 'Usuário', design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '🎬 VÍDEO', i: [
        'cortarvideo <início> <fim>',
        'tomp3 — vídeo em áudio',
        { sub: 'VELOCIDADE' },
        { g: ['videorapido', 'videolento', 'videoreverso', 'videoloop'], n: 2 },
        { sub: 'EFEITOS' },
        { g: ['videomudo', 'pretoebranco', 'sepia', 'espelhar', 'rotacionar'], n: 3 }
      ]
    },
    { t: '🖼️ IMAGEM', i: ['rmbg — tira o fundo', 'upscale — melhora a qualidade'] },
    {
      t: '🎵 ÁUDIO', i: [
        'cortaraudio <início> <fim>',
        'velocidade <0.5 a 3.0>',
        'normalizar',
        { sub: 'VOZ' },
        { g: ['vozmenino', 'vozmulher', 'vozhomem', 'vozcrianca', 'vozgrave', 'vozrapida', 'vozlenta', 'vozeco', 'vozcaverna'], n: 3 },
        { sub: 'GRAVE E VOLUME' },
        { g: ['bass', 'bass2', 'bass3', 'bassbn 10', 'grave', 'aumentarvolume', 'equalizar', 'overdrive', 'pitch', 'lowpass'], n: 3 },
        { sub: 'EFEITOS' },
        { g: ['audiorapido', 'audiolento', 'audioreverso', 'reverb', 'eco', 'chorus', 'phaser', 'flanger', 'tremolo', 'vibrato'], n: 3 }
      ]
    }
  ], { rodape: '💡 Responda o vídeo ou o áudio com o comando.' });
}
