import { renderMenu } from './_render.js';

export default async function menuDono(prefix, botName = 'MeuBot', userName = 'Usuário', design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '⚔️ SISTEMA', i: [
        'atualizar — baixa a versão nova do GitHub',
        'atualizar aviso on/off',
        'reiniciar',
        'status · logs',
        'avisos on/off — erros no seu privado',
        'manutencao on/off — só você usa o bot',
        'autoreload on/off',
        'painelweb on/off — controle pelo navegador',
        'backupdados · backupsemanal on/off',
        'instalarfundo — removedor de fundo local',
        'figfps 30/24/20/auto',
        'menubotoes on/off',
        'barraprogresso on/off',
        'testebotoes <número> — qual formato de botão chega no celular',
        'formatobotoes AUTO/A-F — escolhe o formato dos botões',
        'tutorial'
      ]
    },
    {
      t: '🔐 PERMISSÕES E REGISTRO', i: [
        'addsubdono @user · delsubdono @user',
        'listasubdonos',
        'permsub @user tm — o que cada subdono pode usar',
        'registropv on/off — registro obrigatório no PV',
        'registrados [busca] · desregistrar @user',
        'addpremium @user · delpremium @user · listprem',
        'resetgold'
      ]
    },
    {
      t: '📢 TRANSMISSÃO (!tm)', i: [
        'tm <texto> — ou responda qualquer mensagem',
        'tmm <texto> — igual ao tm, marcando todos (sem @)',
        'tm enquete Pergunta | op1 | op2',
        'tm direto · tmparar',
        'tmexcluir · tmincluir · tmexcluidos',
        'tmprevia on/off',
        'tmcanal <link>',
        'tmavisos · tmavisos lista · tmavisos ajuda',
        'tmconfig',
        { sub: 'NO PRIVADO' },
        'tm2 · statustm',
        'inscrevertm (o usuário manda no PV)'
      ]
    },
    {
      t: '📣 DIVULGAÇÃO (!divdono)', i: [
        'divdono add · rem · list',
        'divdono msg · send · time · status',
        'divdono img · video · gif · fig',
        'divdono audio · voz · doc',
        'divdono enquete · evento · local · contato',
        'divdono tudo',
        'divdono salvar · itens · veritem',
        'divdono enviaritem · remitem',
        'divdonomidia on/off'
      ]
    },
    {
      t: '🤖 CONFIGURAR O BOT', i: [
        'prefixo · nomebot · nomedono · numerodono',
        'fotobot · fotomenu · videomenu · audiomenu',
        'lermais',
        'configcmdnotfound · setcmdmsg',
        'personalizargrupo',
        'cargos asta',
        { sub: 'DESENHO DO MENU' },
        'designmenu · resetdesign',
        'setheader · settitulo · setitem',
        'setborda · setbordameio · setbordafim',
        'setseparador',
        { sub: 'ASSISTENTE' },
        'setpersonalidade · criarpers · novapers'
      ]
    },
    {
      t: '⚙️ AUTOMAÇÕES', i: [
        'addauto · addautomidia · listauto · delauto',
        'addreact · listreact · delreact',
        'addnopref · listnopref · delnopref'
      ]
    },
    {
      t: '🧩 COMANDOS PERSONALIZADOS', i: [
        'addcmd · addcmdmidia · listcmd · delcmd',
        'testcmd',
        'addcmd-subdono · removecmd-subdono · listcmd-subdono',
        'addalias · listalias · delalias',
        'addblackglobal · listblackglobal · rmblackglobal',
        { sub: 'LIMITES' },
        'cmdlimitar · cmddeslimitar · cmdlimites'
      ]
    },
    {
      t: '🏠 ALUGUEL E DIVULGAÇÃO', i: [
        'modoaluguel',
        'addaluguel · gerarcod',
        'listaraluguel · listaluguel · infoaluguel',
        'estenderaluguel · removeraluguel · limparaluguel',
        'dayfree',
        'setdiv · divulgar',
        { sub: 'INDICAÇÕES' },
        'addindicacao · delindicacao · topindica'
      ]
    },
    {
      t: '🤖 SUB-BOTS', i: ['addsubbot · removesubbot · listarsubbots', 'conectarsubbot · gerarcodigo']
    },
    {
      t: '💎 VIP', i: ['addcmdvip · removecmdvip · listcmdvip', 'togglecmdvip · statsvip · infovip', 'menuvip']
    },
    {
      t: '🛠️ CONTROLE', i: [
        'entrar <link> · sairgp',
        'gruposinativos — grupos parados (sair / continuar)',
        'gruposinativos dias 5 · auto on/off · on/off',
        'seradm · sermembro',
        'listagp',
        'bangp · unbangp · listbangp',
        'blockcmdg · unblockcmdg',
        'blockuserg · unblockuserg · listblocks',
        'antibanmarcar',
        'antipv · antipv2 · antipv3 · antipv4',
        'antipvmsg · antispamcmd',
        'modoliteglobal · msgprefix',
        'viewmsg · cases · getcase',
        'iaclear · limpardb · limparrankg',
        'reviverqr · nuke'
      ]
    }
  ]);
}
