import { renderMenu } from './_render.js';

export default async function menuadm(prefix, botName = 'MeuBot', userName = 'Usuário', design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '👮 MEMBROS', i: [
        'ban @user — remove do grupo',
        'ban2 @user',
        'bangeral — remove todos (menos admins), pede confirmação',
        'inativos [dias] — lista e remove quem não fala',
        'promover @user · rebaixar @user',
        'punir @user — painel advertir / silenciar / banir',
        'mutar @user 30m — silencia por um tempo',
        'mutados — quem está mutado',
        'mute @user · desmute @user',
        'mute2 @user · desmute2 @user',
        'adv @user · rmadv @user · listadv',
        'advs @user — histórico de advertências com data',
        'roletaban — sorteia alguém para banir',
        'bam @user — ban de brincadeira',
        'setbammsg <texto>',
        { sub: 'BLOQUEIOS' },
        'blockuser @user · unblockuser @user',
        'listblocksgp',
        'addblacklist @user · delblacklist @user',
        'listblacklist',
        'blockcmd <cmd> · unblockcmd <cmd>'
      ]
    },
    {
      t: '👋 ENTRADA E SAÍDA', i: [
        'bemvindo — boas-vindas com a foto de perfil de quem entrou',
        'bemvindo 1 — escolher o modelo da imagem (10 modelos)',
        'bemvindo2 — boas-vindas só texto',
        'legendabv <texto>',
        'fotobv · set-fotobv · set-bannerbv · rmfotobv',
        'bvcard on [tema] — cartão de boas-vindas em imagem',
        'bvfig — figurinha (com som) para quem entra',
        'bvbotoes on/off — botões REGRAS e MENU',
        'verificarnovato on/off — botão "sou humano"',
        'regrasaceite on/off — novato precisa aceitar as regras',
        'addregra <texto> · delregra <nº>',
        'saida — mensagem de saída',
        'legendasaiu <texto>',
        'fotosaiu · rmfotosaiu',
        { sub: 'PEDIDOS PARA ENTRAR' },
        'solicitacoes',
        'aprovar · aprovar all',
        'recusarsolic'
      ]
    },
    {
      t: '💬 GRUPO', i: [
        'marcar — marca todos',
        'hidetag <texto> — marca todos sem aparecer',
        'del — apaga a mensagem respondida',
        'limpar — limpa o chat',
        'nomegp <nome> · descgrupo <texto> · fotogrupo',
        'linkgp — link do grupo',
        'grupo a/f — abre ou fecha',
        'opengp HH:MM · closegp HH:MM (ou off)',
        'modonoturno 23:00 07:00 — fecha e abre sozinho',
        'automsg — mensagens automáticas',
        'limitmessage · dellimitmessage',
        'banghost 1 — remove quem mandou até 1 mensagem',
        'setprefix <prefixo>',
        'fotomenugrupo — foto do menu do grupo',
        'infoperso'
      ]
    },
    {
      t: '⏰ AGENDA E EVENTOS', i: [
        'agendar HH:MM <mensagem>',
        'agendar todo dia 08:00 <mensagem> — repete',
        'agendados · desagendar <nº>',
        'enquete Pergunta | op1 | op2',
        'votacao 30m Pergunta | a | b',
        'evento Nome | DD/MM HH:MM',
        'sorteio — sorteia um membro',
        'sorteiobotao 10m <prêmio>',
        'aniversario auto on/off · hora HH:MM',
        'figdia on/off — figurinha do dia',
        'rankingsemanal on/off',
        'resumo · resumo semana',
        'role.criar · role.alterar · role.excluir'
      ]
    },
    {
      t: '🔒 PROTEÇÃO', i: [
        'anticategoria <links|midia|seguranca|todos>',
        { sub: 'LINKS' },
        'antilinkgp — links de outros grupos',
        'antilinkcanal — links de canais',
        'antilinkhard — qualquer link (remove)',
        'antilinksoft — qualquer link (apaga)',
        'antilinkpro on/off — só passam sites liberados',
        'linkspermitidos add youtube tiktok',
        { sub: 'MENSAGENS' },
        'antifig · antifig limite 5',
        'antifig mute 5 — passou do limite: aviso e depois silêncio',
        'antiimg · antivideo · antiaudio',
        'anticontato · anticatalogo',
        'antigringo — só +55 entra (ou bloqueie países)',
        'antiflood · antidoc · antiloc',
        'antibtn · antistickerplus',
        'antiporn · antistatus',
        'antitoxic on/off · config · sensibilidade',
        'antipalavra on/off/add/del/list',
        'x9 — avisa quem adicionou/removeu',
        { sub: 'LIBERADOS DOS ANTIS' },
        'wladd @user · wl.remove @user · wl.lista'
      ]
    },
    {
      t: '📊 ATIVIDADE', i: [
        'atividade · checkativo',
        'rankddd — de onde é o pessoal',
        'limparrank · resetrank',
        'mantercontador'
      ]
    },
    {
      t: '👥 MODERADORES', i: [
        'addmod @user · delmod @user · listmods',
        'grantmodcmd @user <cmd>',
        'revokemodcmd @user <cmd>',
        'listmodcmds'
      ]
    },
    { t: '🤝 PARCERIAS', i: ['parcerias', 'addparceria @user', 'delparceria @user', 'modoparceria'] },
    {
      t: '💬 RESPOSTAS AUTOMÁTICAS', i: [
        'addautoadm oi/Olá! Tudo bem?',
        'addautoadmidia',
        'listautoadm · delautoadm <nº>',
        'autorespostas · autorepo'
      ]
    },
    {
      t: '⚡ MODOS DO GRUPO', i: [
        'modobn — brincadeiras',
        'modorpg — RPG e economia',
        'modolite — esconde conteúdo +18',
        'soadm — só admins usam o bot',
        'autodl — baixa links sozinho',
        'autosticker — mídia vira figurinha',
        'autotranscrever — transcreve áudios',
        'assistente · assistentevoz on/off',
        'minmessage · cmdlimit'
      ]
    }
  ]);
}
