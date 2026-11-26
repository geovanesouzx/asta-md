import { renderMenu, NL } from './_render.js';

export default async function menubn(prefix, botName = 'MeuBot', userName = 'Usuário', isLiteMode = false, design = {}) {
  return renderMenu(prefix, botName, userName, design, [
    {
      t: '⚔️ JOGOS DO ASTA MD', i: [
        'duelo @user [aposta] — duelo de magia Black Clover',
        'torneio criar 8 — torneio de duelos',
        'adivinha — qual é o anime?',
        'forcaanime — forca de anime',
        'quemdisse — quem mandou a frase?',
        'quizanime · quizrank',
        'pet — seu pet virtual',
        'lojinha — títulos, cores, escudo e bônus',
        'meuperfil — seu cartão'
      ]
    },
    {
      t: '🎮 JOGOS', i: [
        'jogodavelha @user',
        'connect4 @user',
        'uno criar · entrar · jogar <nº> · cancelar',
        'batalhanaval @user',
        'dueloquiz @user — duelo de perguntas',
        'digitar @user — quem digita mais rápido',
        'forca — em equipe, com placar e 💰',
        'wordle · anagrama · stop',
        'minado — campo minado',
        'adivinhaanime — imagem desfocada que vai clareando',
        'apostacorrida — corrida de cavalos com apostas 💰',
        'tesouro on/off — caça ao tesouro',
        'pegar — abre o baú do tesouro',
        'memoria · memoria ranking',
        'quiz <categoria>',
        'cacapalavras [dificuldade]'
      ]
    },
    {
      t: '🎲 SORTE E PERGUNTAS', i: [
        { g: ['eununca', 'vab', 'chance', 'quando', 'sorte', 'sn', 'ppt', NL('suicidio')], n: 4 },
        'vod — verdade ou desafio com botões',
        'caraoucoroa [cara|coroa] [valor]',
        'roletarussa',
        'euamor — o quanto você ama (30 brincadeiras)',
        'interesses — lugar favorito (20 brincadeiras)',
        'saudebrincadeira — medidor de saúde (19 brincadeiras)'
      ]
    },
    {
      t: '💞 RELACIONAMENTOS', i: [
        'brincadeira @user · namorar @user',
        'casar @user — com botões ACEITO/RECUSO',
        'casal — há quantos dias estão juntos',
        'casal sortear — casal aleatório',
        'shipo @user',
        'relacionamento · casais',
        'terminar · trair @user',
        'historicotraicao'
      ]
    },
    {
      t: '💬 FRASES', i: [{ g: ['conselho', 'conselhobiblico', 'cantada', 'piada', 'charada', 'motivacional', 'elogio', 'reflexao', 'fato', 'frasedeamor', 'frasebonita', 'frasecriativas', 'ansiedade', 'deboche', 'indiretas', 'raiva', 'recado'], n: 3 }]
    },
    {
      t: '🤝 INTERAÇÕES (marque alguém)', i: [{ g: ['abraco', 'beijo', 'cafune', 'tapa', 'soco', 'chute', 'morder', 'lamber', 'tomate', 'explodir', 'matar'], n: 4 }]
    },
    {
      t: '🔥 INTERAÇÕES PICANTES', nl: true, i: [{ g: ['beijob', 'tapar', 'sexo', 'surubao', 'goza', 'mamar'], n: 3 }]
    },
    {
      t: '🎯 BRINCADEIRAS (marque alguém)', i: [
        { sub: 'MASCULINAS' },
        { g: [NL('gay'), 'burro', 'inteligente', 'otaku', 'fiel', 'infiel', NL('corno'), 'gado', 'gostoso', 'feio', 'rico', 'pobre', NL('pirocudo'), NL('nazista'), NL('ladrao'), 'safado', 'vesgo', 'bebado', NL('machista'), NL('homofobico'), NL('racista'), 'chato', 'sortudo', 'azarado', 'forte', 'fraco', 'pegador', 'otario', 'macho', 'bobo', 'nerd', 'preguicoso', 'trabalhador', 'brabo', 'lindo', 'malandro', 'simpatico', 'engracado', 'charmoso', 'misterioso', 'carinhoso', 'humilde', 'desumilde', 'ciumento', 'corajoso', 'covarde', 'esperto', NL('talarico'), 'chorao', 'brincalhao', NL('bolsonarista'), NL('petista'), NL('comunista'), NL('lulista'), NL('traidor'), NL('bandido'), NL('cachorro'), NL('vagabundo'), NL('pilantra'), 'mito', 'padrao', 'comedia', NL('psicopata'), 'fortao', 'global', 'independente', 'infantil', 'inseguro', 'introvertido', 'irresponsavel', 'lider', 'liberal', 'local', 'maduro', 'magrelo', 'moderno', 'nervoso', 'offline', 'online', 'otimista', 'patriotico', 'pessimista', 'pratico', 'programador', 'rainha', 'realista', 'religioso', 'responsavel', 'romantico', 'rural', 'saudavel', 'seguidor', 'serio', 'social', 'solitario', 'sonhador', 'supersticioso', 'tecnologico', 'tradicional', 'urbano', 'viajante', 'visionario', 'zueiro', 'billionario', 'gamer', 'poderoso', 'vencedor', 'senhor'], n: 4 },
        { sub: 'FEMININAS' },
        { g: [NL('lesbica'), 'burra', 'inteligente', 'otaku', 'fiel', 'infiel', NL('corna'), 'gostosa', 'feia', 'rica', 'pobre', NL('bucetuda'), NL('nazista'), NL('ladra'), 'safada', 'vesga', 'bebada', NL('machista'), NL('homofobica'), NL('racista'), 'chata', 'sortuda', 'azarada', 'forte', 'fraca', 'pegadora', 'otaria', 'boba', 'nerd', 'preguicosa', 'trabalhadora', 'braba', 'linda', 'malandra', 'simpatica', 'engracada', 'charmosa', 'misteriosa', 'carinhosa', 'humilde', 'desumilde', 'ciumenta', 'corajosa', 'covarde', 'esperta', NL('talarica'), 'chorona', 'brincalhona', NL('bolsonarista'), NL('petista'), NL('comunista'), NL('lulista'), NL('traidora'), NL('bandida'), NL('cachorra'), NL('vagabunda'), NL('pilantra'), 'mito', 'padrao', 'comedia', NL('psicopata'), 'ateia', 'aventureira', 'bagunceira', 'calma', 'caseira', 'cetica', 'confiante', 'conservadora', 'cosmopolita', 'criativa', 'dependente', 'digital', 'dorminhoca', 'doente', 'economica', 'estudiosa', 'extrovertida', 'fofoqueira', 'fortona', 'gastadora', 'global', 'independente', 'infantil', 'insegura', 'introvertida', 'irresponsavel', 'lider', 'liberal', 'local', 'madura', 'magrela', 'moderna', 'nervosa', 'offline', 'online', 'otimista', 'patriotica', 'pessimista', 'pratica', 'programadora', 'rainha', 'realista', 'religiosa', 'romantica', 'rural', 'saudavel', 'sedentaria', 'seguidora', 'seria', 'social', 'solitaria', 'sonhadora', 'supersticiosa', 'tecnologica', 'tradicional', 'urbana', 'vencedora', 'viajante', 'visionaria', 'zueira', 'bilionaria', 'gamer', 'poderosa', 'senhora'], n: 4 }
      ]
    },
    {
      t: '🏆 RANKINGS DO GRUPO', i: [
        { sub: 'MASCULINOS' },
        { g: ['rankgay', 'rankburro', 'rankinteligente', 'rankotaku', 'rankfiel', 'rankinfiel', 'rankcorno', 'rankgado', 'rankgostoso', 'rankrico', 'rankpobre', 'rankforte', 'rankpegador', 'rankmacho', 'ranknerd', 'ranktrabalhador', 'rankbrabo', 'ranklindo', 'rankmalandro', 'rankengracado', 'rankcharmoso', 'rankvisionario', 'rankpoderoso', 'rankvencedor'], n: 3 },
        { sub: 'FEMININOS' },
        { g: ['ranklesbica', 'rankburra', 'rankcorna', 'rankgada', 'rankgostosa', 'rankrica', 'rankpegadora', 'ranktrabalhadora', 'rankbraba', 'ranklinda', 'rankmalandra', 'rankengracada', 'rankcharmosa', 'rankvisionaria', 'rankpoderosa', 'rankvencedora'], n: 3 }
      ]
    }
  ], { lite: !!isLiteMode, rodape: `💡 As brincadeiras precisam do ${prefix}modobn ligado no grupo.` });
}
