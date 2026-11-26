import { renderMenu } from './_render.js';

export default async function menuRPG(prefix, botName = 'MeuBot', userName = 'Usuário', design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '👤 PERFIL', i: [
        'perfilrpg · carteira',
        'inv · equipamentos',
        'conquistas · missoes',
        'toprpg · rankglobal · ranklvl',
        'meustats'
      ]
    },
    {
      t: '📈 EVOLUÇÃO', i: [
        'evoluir · prestige',
        'streak · reivindicar',
        'speedup · boost'
      ]
    },
    {
      t: '💰 ECONOMIA', i: [
        'diario — recompensa diária',
        'dep <valor|all> · sacar <valor|all>',
        'pix @user <valor> · doar <valor>',
        'loja · comprar <item> · vender <item> <qtd>',
        'vagas · emprego <vaga> · demitir',
        'habilidades',
        'desafiosemanal · desafiomensal',
        { sub: 'INVESTIMENTOS' },
        'investir · investir <ação> <qtd>',
        'sell <ação> <qtd>',
        'propriedades · cprop <id> · cprops',
        'tributos'
      ]
    },
    {
      t: '⛏️ TRABALHO E COLETA', i: [
        { g: ['work', 'mine', 'fish', 'caçar', 'coletar', 'colher', 'explore'], n: 4 },
        { sub: 'FAZENDA E COZINHA' },
        'plantar <planta> · plantacao · sementes',
        'cook <receita> · receitas · ingredientes',
        'eat <comida> · vendercomida <item>'
      ]
    },
    {
      t: '🎰 APOSTAS', i: [
        'dados <valor>',
        'coinflip <cara|coroa> <valor>',
        'crash <valor> · slots <valor>',
        'apostar <valor>',
        'roleta <valor> <cor>',
        'blackjack <valor>',
        'corrida <valor> <cavalo>',
        'loteria · loteria comprar <qtd>',
        'leilao · topriqueza'
      ]
    },
    {
      t: '⚔️ COMBATE E AVENTURA', i: [
        'duelrpg @user · arena',
        'torneio — torneio do RPG',
        'assaltar @user · crime',
        'guerra · desafio',
        'masmorra · bossrpg · eventos',
        { sub: 'DUNGEONS' },
        'dungeon — lista',
        'dungeon criar <tipo> · entrar <id>',
        'dungeon iniciar · sair',
        { sub: 'CLASSES' },
        'class — ver classes · class <nome> — escolher'
      ]
    },
    {
      t: '🔨 FORJA', i: [
        'forge <item> · enchant',
        'dismantle <item> · reparar <item>',
        'materiais · precos'
      ]
    },
    {
      t: '🏠 CASA', i: ['casa', 'casa comprar <tipo> · coletar', 'casa decorar <item>']
    },
    {
      t: '🛒 MERCADO', i: [
        'auction — leilão de jogadores',
        'auction vender <item> <preço> · comprar <nº>',
        'auction meus · cancelar <nº>',
        { sub: 'MERCADO GERAL' },
        'mercado · listar <item> <preço>',
        'cmerc <nº> · meusan · cancelar <nº>'
      ]
    },
    {
      t: '💞 SOCIAL E FAMÍLIA', i: [
        'casar @user · namorar @user',
        'divorciar · terminar',
        'relacionamento · casais',
        'abracarrpg · beijarrpg · baterrpg · proteger @user',
        'familia · arvore',
        'adotaruser @user · deserdar @user',
        'rep · vote @user'
      ]
    },
    {
      t: '🛡️ CLÃS', i: [
        'criarcla <nome> · cla',
        'convidar @user · expulsar @user',
        'aceitarconvite <clã> · recusarconvite <clã>',
        'rmconvite @user · sair'
      ]
    },
    {
      t: '🐾 PETS DO RPG', i: [
        'pets · adotar <pet>',
        'feed <nº> · train <nº> · evolve <nº>',
        'petbattle <nº> · petbet <valor> <nº> @user',
        'renamepet <nº> <nome>',
        'equippet <nº> <item> · unequippet <nº>'
      ]
    },
    {
      t: '💎 PREMIUM', i: ['lojapremium · comprarpremium <item>', 'presente @user <item>']
    },
    {
      t: '👑 ADMIN DO RPG', i: [
        'rpgadd @user <valor> · rpgremove @user <valor>',
        'rpgsetlevel @user <nível>',
        'rpgadditem @user <item> <qtd>',
        'rpgremoveitem @user <item> <qtd>',
        'rpgresetplayer @user',
        'rpgresetglobal confirmar',
        'rpgstats'
      ]
    }
  ], { rodape: `💡 O RPG precisa do ${prefix}modorpg ligado no grupo.` });
}
