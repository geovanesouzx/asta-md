import { renderMenu } from './_render.js';

export default async function menuSticker(prefix, botName = 'MeuBot', userName = 'Usuário', design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '🎨 FAZER FIGURINHA', i: [
        's — foto, vídeo, GIF ou áudio (vídeo e áudio saem com som 🔊)',
        's 0:15 10 — começa em 0:15 e dura 10s',
        'sc — figurinha redonda',
        'squadrado — corta em quadrado (cima/baixo/esquerda/direita)',
        'scorte — tira a tarja preta do vídeo',
        'sfundo — tira o fundo da foto ou do vídeo',
        'sl <texto> — figurinha com legenda',
        'ssom <link ou música> — figurinha com a música',
        'sticker2 — formato original, sem cortar',
        'autofigu — no privado: toda foto/vídeo que você mandar vira figurinha',
        { sub: 'VISUALIZAÇÃO ÚNICA' },
        's — também funciona em foto/vídeo/áudio de visualização única',
        'revelar — reenvia a visualização única'
      ]
    },
    {
      t: '🔇 FIGURINHA SEM SOM', i: [
        'ssoff — figurinha normal, mas sem o som',
        'scoff — redonda sem som',
        'sqoff — quadrada sem som',
        'scorteoff — sem tarja e sem som',
        'sfundooff — sem fundo e sem som',
        'sloff <texto> — com legenda, sem som',
        's2off — formato original, sem som',
        'sefeitooff <efeito> — efeito sem som',
        'somfig — tira o som de uma figurinha pronta'
      ]
    },
    {
      t: '🎬 EFEITOS', i: [
        'sefeito lento · rapido · reverso · vaievolta · espelho',
        'svoz grave · esquilo · robo · eco · radio · monstro · reverso',
        'trocarsom — troca o som da figurinha (figurinha + áudio)',
        'sfala <texto> — figurinha que fala'
      ]
    },
    {
      t: '✨ CRIAR', i: [
        'emojimix 🤓/🙄 — mistura dois emojis',
        'ttp <texto> — texto em figurinha',
        'attp <texto> — texto animado',
        'brat <texto> — estilo brat',
        'bratvid <texto> — brat animado',
        'qc <texto> — figurinha de citação'
      ]
    },
    {
      t: '⚙️ GERENCIAR', i: [
        'rgtake Autor/Pacote — salva o seu nome de figurinha',
        'take — coloca o seu nome salvo na figurinha',
        'rename Autor/Pacote — renomeia a figurinha',
        'toimg — figurinha → imagem',
        'tovideo — figurinha animada → vídeo (com som)',
        'pack add · ver · nome · limpar — seu pacote',
        'topfig — as mais mandadas do grupo',
        'figurinhas — figurinhas aleatórias',
        'figualeatoria — uma figurinha aleatória',
        'soundinfo — diagnóstico da figurinha com som'
      ]
    }
  ]);
}
