import { renderMenu } from './_render.js';

export default async function menu(prefix, botName = 'MeuBot', userName = 'Usuário', design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '⚔️ MENU PRINCIPAL', i: [
        'menufig — figurinhas (com e sem som)',
        'menudown — downloads de música e vídeo',
        'menubn — jogos e brincadeiras',
        'menumemb — comandos para todos',
        'ferramentas — utilidades',
        'alteradores — efeitos de áudio e vídeo',
        'menuedits — edições de imagem',
        'menulogos — logos com seu nome',
        'menurpg — RPG e economia',
        'menuvip — comandos VIP',
        'topcmd — comandos mais usados',
        'todoscmd — TODOS os comandos e o total'
      ]
    },
    { t: '🛡️ ADMINISTRAÇÃO', i: ['menuadm — comandos dos admins do grupo', 'menudono — comandos do dono do bot'] }
  ], { rodape: `💡 ${prefix}menu → menu com botões · ${prefix}dono → falar com o dono` });
}
