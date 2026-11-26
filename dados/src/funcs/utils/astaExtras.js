/**
 * ★彡 ASTA MD 彡★ — EXTRAS (v10.15)
 * Funções novas refeitas do zero (utilidades, brincadeiras, jogos).
 */
import axios from 'axios';

/* ======================= ATALHOS =======================
 * nome que o pessoal conhece de outros bots -> comando do ASTA que faz a mesma coisa */
export const ATALHOS_EXTRAS = {
  play1: 'play', play4: 'play', play5: 'play', playmix: 'play', playlist: 'play',
  playvideo: 'playvid', playvid2: 'playvid',
  tiktok2: 'tiktok', tiktok3: 'tiktok', tiktok4: 'tiktok', tiktok5: 'tiktok', tiktokaudio2: 'tiktokaudio',
  instagram2: 'instagram', facebook2: 'facebook', twittervideo: 'twitter',
  attp1: 'attp', attp2: 'attp', attp3: 'attp', attp4: 'attp', attp5: 'attp', attp6: 'attp', attp7: 'attp', attp8: 'attp', attp9: 'attp',
  bratimg: 'brat',
  pinterest2: 'pinterest', letramusic: 'letra',
  ping2: 'ping', marcar2: 'marcar', gerarnick2: 'gerarnick',
  fechar: 'fechargp', descgp: 'descgrupo', grupoinfo: 'dadosgp',
  advertencia: 'adv', adverti: 'adv', advertidos: 'listadv',
  listanegra: 'blacklist', so_adm: 'soadm',
  traduzir: 'tradutor', gtts: 'tts',
  tinyur: 'encurtar', bitly: 'encurtar', cuttly: 'encurtar',
  jogodaforca: 'forca', resetforca: 'forca',
  antisticker: 'antifig', antipalavrao: 'antipalavra', antifake: 'antigringo',
  mina: 'minado', minareset: 'minado', mineshelp: 'minado', minatips: 'minado',
  caracoroa: 'caraoucoroa',
  dolar: 'cotacao', euro: 'cotacao', btc: 'cotacao', bitcoin: 'cotacao', eth: 'cotacao', libra: 'cotacao',
  frasedeamor: 'frases', frasesdeamor: 'frases', frasebonita: 'frases', frasecriativas: 'frases',
  ansiedade: 'frases', deboche: 'frases', indiretas: 'frases', raiva: 'frases', recado: 'frases',
  verdade: 'vod', verdadeoudesafio: 'vod',
  adivinheanime: 'adivinhaanime', quemeanime: 'adivinhaanime',
  apostas: 'apostacorrida',
  bau: 'tesouro', cacatesouro: 'tesouro',
  raiz: 'raizquadrada', senha: 'gerarsenha', extenso: 'dinextenso',
  listaddi: 'rankddd', listaddd: 'ddd'
};

/* ======================= FRASES ======================= */
export const FRASES = {
  frasedeamor: [
    'Você chegou devagar e, quando eu vi, já morava em todos os meus planos.',
    'Meu lugar favorito no mundo é qualquer um, desde que seja do seu lado.',
    'Amar você é a coisa mais fácil e mais bonita que eu já fiz.',
    'Se eu pudesse escolher de novo, escolheria você em todas as vidas.',
    'Seu sorriso conserta dias que eu nem sabia que estavam quebrados.',
    'Contigo, até o silêncio vira conversa boa.',
    'Não sei o que o futuro guarda, mas espero que seja você.',
    'Você é a minha calma no meio de toda bagunça.'
  ],
  frasebonita: [
    'Seja a energia que você quer atrair.',
    'O que é seu encontra o caminho até você.',
    'Florescer exige passar por todas as estações.',
    'Tudo que é leve fica. O resto, a gente solta.',
    'Um passo de cada vez ainda é andar para frente.',
    'Às vezes o recomeço é o melhor capítulo.',
    'Gentileza é uma língua que todo mundo entende.',
    'Você não precisa ter pressa, só precisa não desistir.'
  ],
  frasecriativas: [
    'Sou tipo Wi-Fi de rodoviária: às vezes conecto, às vezes só decepciono.',
    'Minha vida é um filme. Pena que o roteirista tá de férias.',
    'Eu não procrastino, eu dou tempo pro universo resolver sozinho.',
    'Não sou preguiçoso, estou em modo economia de energia.',
    'A dieta começa segunda. Qual segunda? Não sei, mas começa.',
    'Se a vida te der limões, peça açúcar e faça uma limonada.',
    'Meu talento oculto é ficar com sono em qualquer lugar.',
    'Eu e a academia temos um relacionamento sério: eu pago e ela me espera.'
  ],
  ansiedade: [
    'Respira. Você já passou por dias difíceis antes e chegou até aqui.',
    'Nem todo pensamento é verdade. Você não precisa acreditar em tudo que a ansiedade diz.',
    'Um dia ruim não é uma vida ruim.',
    'Vai com calma: você está fazendo o melhor que pode com o que tem agora.',
    'Tá tudo bem não estar bem. Pedir ajuda também é coragem.',
    'O que você sente agora vai passar. Sempre passa.',
    'Faça só a próxima coisa. Não precisa resolver tudo hoje.',
    'Você não é a sua ansiedade. Você é quem continua apesar dela.'
  ],
  deboche: [
    'Me erra que hoje eu acordei acertada.',
    'Se fosse pra agradar todo mundo, eu seria pastel de feira.',
    'Falar de mim é fácil, difícil é ser eu.',
    'Pode até tentar me copiar, mas o original continua aqui.',
    'Meu santo é forte, o seu que lute.',
    'Eu não sou de briga, mas também não sou capacho.',
    'Quem fala de mim pelas costas tá na posição certa: atrás.',
    'Calma, amor, eu não sou o centro do universo. Só do seu assunto.'
  ],
  indiretas: [
    'Tem gente que só lembra que eu existo quando precisa.',
    'Não mudei, só aprendi quem merece minha atenção.',
    'Engraçado como certas pessoas somem e depois aparecem com saudade.',
    'Quem quer, dá um jeito. Quem não quer, dá desculpa.',
    'Saí da sua vida, mas parece que você não saiu dos meus stories.',
    'Fiquei sabendo que você anda falando de mim. Pelo menos agora você tem assunto.',
    'Algumas pessoas são lição, não destino.',
    'Não guardo mágoa, guardo aprendizado. E distância.'
  ],
  raiva: [
    'Hoje minha paciência saiu e não disse quando volta.',
    'Respira fundo e conta até dez… ou até mil, se precisar.',
    'Não é raiva, é só o meu limite avisando que chegou.',
    'Estou calmo. Calmo igual panela de pressão.',
    'Não testa minha paciência que ela já tá no modo bateria fraca.',
    'Eu tenho autocontrole. Só não sei onde deixei.',
    'Hoje não é um bom dia pra me pedir favor.',
    'Minha cara é de paisagem, mas por dentro tá trovejando.'
  ],
  recado: [
    'Bom dia! Que hoje você seja tão incrível quanto acha que não é.',
    'Passando só pra lembrar que você é importante por aqui.',
    'Lembrete do dia: beba água, se alongue e não leve tudo tão a sério.',
    'Se ninguém te disse hoje: você está indo bem.',
    'Que a semana seja leve e o café, forte.',
    'Aquele recado de sempre: cuide de você do jeito que cuida dos outros.',
    'Hoje é um bom dia para recomeçar o que deu errado ontem.',
    'Sorria: o grupo fica melhor com você nele.'
  ]
};
FRASES.frasesdeamor = FRASES.frasedeamor;
export const TITULOS_FRASES = {
  frasedeamor: '💘 Frase de amor', frasesdeamor: '💘 Frase de amor', frasebonita: '🌸 Frase bonita', frasecriativas: '😂 Frase criativa',
  ansiedade: '🫶 Para a ansiedade', deboche: '😏 Deboche', indiretas: '👀 Indireta', raiva: '😤 Modo raiva', recado: '💌 Recado'
};

/* ======================= EU AMOR / INTERESSES / SAÚDE ======================= */
export const BRINCADEIRAS_PCT = {
  euamor: {
    titulo: '💖 O quanto você ama', modelo: (n, x) => `@${n} ama *${x}*`,
    itens: { amigos: 'os amigos', animais: 'os animais', artes: 'artes', aventura: 'aventura', cachorro: 'cachorros', carro: 'carros', chocolate: 'chocolate', chuva: 'dias de chuva', ciencia: 'ciência', comida: 'comer', cozinhar: 'cozinhar', esporte: 'esportes', familia: 'a família', festas: 'festas', filmes: 'filmes', flor: 'flores', futebol: 'futebol', gato: 'gatos', livros: 'livros', mae: 'a mãe', musica: 'música', natureza: 'a natureza', novelas: 'novelas', pai: 'o pai', pizza: 'pizza', sol: 'dias de sol', series: 'séries', teatro: 'teatro', tecnologia: 'tecnologia', viagens: 'viajar' }
  },
  interesses: {
    titulo: '📍 Lugar favorito', modelo: (n, x) => `@${n} gosta de ficar ${x}`,
    itens: { aeroporto: 'no aeroporto', academia: 'na academia', biblioteca: 'na biblioteca', casa: 'em casa', cinema: 'no cinema', curso: 'no curso', estadio: 'no estádio', escola: 'na escola', festa: 'na festa', hospital: 'no hospital', livraria: 'na livraria', museu: 'no museu', onibus: 'no ônibus', parque: 'no parque', praia: 'na praia', restaurante: 'no restaurante', rua: 'na rua', shopping: 'no shopping', supermercado: 'no supermercado', trabalho: 'no trabalho' }
  },
  saude: {
    titulo: '🩺 Medidor de saúde (de brincadeira)', modelo: (n, x) => `${x} de @${n}`,
    itens: { alimentacao_saudavel: 'Alimentação saudável', cardiovascular: 'Saúde do coração', condicionamento_fisico: 'Condicionamento físico', digestiva: 'Saúde digestiva', equilibrio_emocional: 'Equilíbrio emocional', exercicios_diarios: 'Exercícios diários', flexibilidade: 'Flexibilidade', geral: 'Saúde geral', hidratacao: 'Hidratação', imunologica: 'Imunidade', mental: 'Saúde mental', mental_trabalho: 'Saúde mental no trabalho', muscular: 'Força muscular', ossea: 'Saúde dos ossos', relacionamentos: 'Saúde dos relacionamentos', relaxamento: 'Relaxamento', respiratoria: 'Saúde respiratória', rotina_sono: 'Rotina de sono', energia_fisica: 'Energia física' }
  }
};
export function comandosPct() {
  const out = [];
  for (const [g, d] of Object.entries(BRINCADEIRAS_PCT)) for (const k of Object.keys(d.itens)) out.push(`${g}_${k}`);
  return out;
}
export function brincadeiraPct(cmd, num) {
  const i = cmd.indexOf('_');
  if (i < 0) return null;
  const g = BRINCADEIRAS_PCT[cmd.slice(0, i)];
  const x = g?.itens[cmd.slice(i + 1)];
  if (!x) return null;
  const p = Math.floor(Math.random() * 101);
  const barra = '▰'.repeat(Math.round(p / 10)) + '▱'.repeat(10 - Math.round(p / 10));
  const fim = p >= 90 ? 'É paixão total! 🔥' : p >= 70 ? 'Muito! 😍' : p >= 40 ? 'Na média 🙂' : p >= 15 ? 'Pouquinho 😅' : 'Quase nada 🙈';
  return `*${g.titulo}*\n\n${g.modelo(num, x)}\n${barra} *${p}%*\n${fim}\n\n_é só brincadeira 😉_`;
}

/* ======================= VERDADE OU DESAFIO ======================= */
export const VERDADES = [
  'Qual foi a maior vergonha que você já passou?', 'Quem do grupo você chamaria para uma viagem?', 'Qual mentira você mais conta?',
  'Já stalkeou alguém hoje? Quem?', 'Qual seu maior medo?', 'Qual foi o último sonho estranho que você teve?',
  'Quem do grupo você acha mais engraçado?', 'Qual música você ouve escondido?', 'Já fingiu estar doente para não sair de casa?',
  'Qual o app que você mais usa?', 'O que você faria com 1 milhão agora?', 'Qual seu crush famoso?',
  'Qual foi a última coisa que você pesquisou no Google?', 'Qual hábito seu ninguém sabe?', 'Já mandou mensagem para a pessoa errada? Conta!',
  'Qual foi a pior nota que você já tirou?', 'Qual comida você odeia mas finge gostar?', 'Se pudesse apagar uma memória, qual seria?',
  'Quem você bloquearia se pudesse sem a pessoa saber?', 'Qual foi o maior mico em público?', 'Qual seu talento mais inútil?',
  'Qual a coisa mais cara que você já quebrou?', 'Você já chorou vendo anime? Qual?', 'Qual personagem fictício seria seu melhor amigo?',
  'Qual foi a desculpa mais esfarrapada que você já deu?', 'Já riu em momento sério? Conta como foi.', 'O que te deixa com ciúmes?',
  'Qual o seu maior arrependimento da semana?', 'Qual a última foto da sua galeria? (descreve!)', 'Qual apelido você odeia?'
];
export const DESAFIOS = [
  'Mande um áudio cantando o refrão de uma música por 10 segundos.', 'Mude seu recado do WhatsApp para "eu amo o bot" por 1 hora.',
  'Mande a última figurinha que você salvou.', 'Escreva uma poesia de 4 linhas sobre a pessoa acima de você no grupo.',
  'Mande um áudio imitando um personagem de anime.', 'Fale só com emojis pelas próximas 3 mensagens.',
  'Elogie 3 pessoas do grupo agora.', 'Mande um print da sua tela inicial.', 'Faça uma declaração dramática para o admin.',
  'Conte uma piada. Se ninguém rir, conte outra.', 'Mande "bom dia" para o primeiro contato da sua lista (pode ser de tarde).',
  'Mande um áudio falando um trava-língua 3 vezes.', 'Escreva seu nome com a mão que você não usa e mande foto.',
  'Mande a foto mais antiga da sua galeria (que dê pra mostrar!).', 'Mude sua foto de perfil para um gato por 30 minutos.',
  'Mande um áudio rindo por 5 segundos.', 'Descreva seu dia usando só nomes de animes.', 'Faça uma propaganda de 20 segundos de algo do seu quarto.',
  'Mande uma figurinha feita agora de uma selfie sua fazendo careta.', 'Escreva "eu sou o mais lindo do grupo" e não apague por 10 minutos.',
  'Imite a forma de falar de alguém do grupo (sem ofender!).', 'Mande um áudio narrando o que está acontecendo à sua volta como um jogo de futebol.',
  'Escolha alguém do grupo para responder uma verdade no seu lugar.', 'Mande 3 figurinhas que te representam.', 'Fique 5 minutos sem mandar mensagem no grupo.'
];

/* ======================= UTILIDADES ======================= */
export function bhaskara(a, b, c) {
  const d = b * b - 4 * a * c;
  const f = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(4).replace(/\.?0+$/, ''));
  if (a === 0) return `⚠️ Com *a = 0* não é equação do 2º grau. Resultado: x = ${f(-c / b)}`;
  let t = `📐 *BHASKARA*  (${f(a)}x² ${b < 0 ? '-' : '+'} ${f(Math.abs(b))}x ${c < 0 ? '-' : '+'} ${f(Math.abs(c))} = 0)\n\nΔ = b² - 4ac = ${f(b * b)} - ${f(4 * a * c)} = *${f(d)}*\n`;
  if (d < 0) return t + '\n❌ Δ negativo: não tem raiz real.';
  const x1 = (-b + Math.sqrt(d)) / (2 * a), x2 = (-b - Math.sqrt(d)) / (2 * a);
  return t + (d === 0 ? `\n✅ Uma raiz: *x = ${f(x1)}*` : `\n✅ x' = *${f(x1)}*\n✅ x'' = *${f(x2)}*`);
}

export function gerarSenha(tam = 16, simbolos = true) {
  const L = 'abcdefghijkmnopqrstuvwxyz', U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', N = '23456789', S = '!@#$%&*?-_+=';
  const todos = L + U + N + (simbolos ? S : '');
  const pega = (s) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const base = [pega(L), pega(U), pega(N), ...(simbolos ? [pega(S)] : [])];
  while (base.length < tam) base.push(pega(todos));
  for (let i = base.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [base[i], base[j]] = [base[j], base[i]]; }
  return base.join('');
}

export function validarCPF(v) {
  const c = String(v).replace(/\D/g, '');
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const dig = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dig(9) === Number(c[9]) && dig(10) === Number(c[10]);
}
export function validarCNPJ(v) {
  const c = String(v).replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (n) => { const p = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * p[i]; const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

const UNI = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEN = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
function ate999(n) {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100), r = n % 100, p = [];
  if (c) p.push(CEN[c]);
  if (r) p.push(r < 20 ? UNI[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UNI[r % 10] : ''));
  return p.join(' e ');
}
export function numeroExtenso(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'zero';
  const grupos = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões'], ['trilhão', 'trilhões']];
  const partes = []; let i = 0;
  while (n > 0 && i < grupos.length) {
    const g = n % 1000;
    if (g) {
      let t = i === 1 && g === 1 ? 'mil' : `${ate999(g)}${grupos[i][0] ? ' ' + (g === 1 ? grupos[i][0] : grupos[i][1]) : ''}`;
      partes.unshift({ t, g, i });
    }
    n = Math.floor(n / 1000); i++;
  }
  return partes.map((p, k) => {
    if (k === 0) return p.t;
    const redondo = p.g < 100 || p.g % 100 === 0;
    return (redondo ? ' e ' : p.i === 0 ? ' ' : ', ') + p.t;
  }).join('');
}
export function dinheiroExtenso(v) {
  const n = Math.round(Math.abs(Number(String(v).replace(/\./g, '').replace(',', '.'))) * 100);
  if (!Number.isFinite(n)) return null;
  const reais = Math.floor(n / 100), cent = n % 100;
  const pr = reais ? `${numeroExtenso(reais)}${/(lhão|lhões)$/.test(numeroExtenso(reais)) ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}` : '';
  const pc = cent ? `${numeroExtenso(cent)} ${cent === 1 ? 'centavo' : 'centavos'}` : '';
  return [pr, pc].filter(Boolean).join(' e ') || 'zero reais';
}

/* ======================= INTERNET (APIs gratuitas, sem chave) ======================= */
const http = axios.create({ timeout: 15_000, headers: { 'User-Agent': 'Mozilla/5.0 ASTA-MD' } });

export async function encurtarLink(url) {
  try { const { data } = await http.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`); if (/^https?:\/\//.test(String(data).trim())) return String(data).trim(); } catch { }
  const { data } = await http.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
  if (!/^https?:\/\//.test(String(data).trim())) throw new Error('não consegui encurtar');
  return String(data).trim();
}

export const MOEDAS = { dolar: 'USD', euro: 'EUR', libra: 'GBP', btc: 'BTC', bitcoin: 'BTC', eth: 'ETH', iene: 'JPY', peso: 'ARS', yuan: 'CNY' };
export async function cotacao(siglas = ['USD', 'EUR', 'BTC']) {
  const pares = siglas.map(s => `${s}-BRL`).join(',');
  const { data } = await http.get(`https://economia.awesomeapi.com.br/json/last/${pares}`);
  return siglas.map(s => data[`${s}BRL`]).filter(Boolean);
}

export async function buscarCEP(cep) {
  const c = String(cep).replace(/\D/g, '');
  if (c.length !== 8) throw new Error('CEP precisa ter 8 números');
  try { const { data } = await http.get(`https://viacep.com.br/ws/${c}/json/`); if (!data.erro) return { cep: data.cep, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf, ddd: data.ddd }; } catch { }
  const { data } = await http.get(`https://brasilapi.com.br/api/cep/v1/${c}`);
  return { cep: data.cep, rua: data.street, bairro: data.neighborhood, cidade: data.city, uf: data.state };
}

export const DDD_UF = {
  11: 'SP', 12: 'SP', 13: 'SP', 14: 'SP', 15: 'SP', 16: 'SP', 17: 'SP', 18: 'SP', 19: 'SP', 21: 'RJ', 22: 'RJ', 24: 'RJ', 27: 'ES', 28: 'ES',
  31: 'MG', 32: 'MG', 33: 'MG', 34: 'MG', 35: 'MG', 37: 'MG', 38: 'MG', 41: 'PR', 42: 'PR', 43: 'PR', 44: 'PR', 45: 'PR', 46: 'PR',
  47: 'SC', 48: 'SC', 49: 'SC', 51: 'RS', 53: 'RS', 54: 'RS', 55: 'RS', 61: 'DF', 62: 'GO', 64: 'GO', 63: 'TO', 65: 'MT', 66: 'MT', 67: 'MS',
  68: 'AC', 69: 'RO', 71: 'BA', 73: 'BA', 74: 'BA', 75: 'BA', 77: 'BA', 79: 'SE', 81: 'PE', 87: 'PE', 82: 'AL', 83: 'PB', 84: 'RN',
  85: 'CE', 88: 'CE', 86: 'PI', 89: 'PI', 91: 'PA', 93: 'PA', 94: 'PA', 92: 'AM', 97: 'AM', 95: 'RR', 96: 'AP', 98: 'MA', 99: 'MA'
};
export async function infoDDD(ddd) {
  const { data } = await http.get(`https://brasilapi.com.br/api/ddd/v1/${ddd}`);
  return { uf: data.state, cidades: data.cities || [] };
}
export async function feriados(ano) {
  const { data } = await http.get(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
  return data;
}

/* DDI -> país (os mais comuns em grupos brasileiros) */
export const DDI_PAIS = {
  1: '🇺🇸 EUA/Canadá', 7: '🇷🇺 Rússia', 20: '🇪🇬 Egito', 27: '🇿🇦 África do Sul', 30: '🇬🇷 Grécia', 31: '🇳🇱 Holanda', 32: '🇧🇪 Bélgica', 33: '🇫🇷 França', 34: '🇪🇸 Espanha',
  39: '🇮🇹 Itália', 40: '🇷🇴 Romênia', 44: '🇬🇧 Reino Unido', 49: '🇩🇪 Alemanha', 51: '🇵🇪 Peru', 52: '🇲🇽 México', 53: '🇨🇺 Cuba', 54: '🇦🇷 Argentina', 55: '🇧🇷 Brasil',
  56: '🇨🇱 Chile', 57: '🇨🇴 Colômbia', 58: '🇻🇪 Venezuela', 60: '🇲🇾 Malásia', 62: '🇮🇩 Indonésia', 63: '🇵🇭 Filipinas', 66: '🇹🇭 Tailândia', 81: '🇯🇵 Japão', 82: '🇰🇷 Coreia do Sul',
  84: '🇻🇳 Vietnã', 86: '🇨🇳 China', 90: '🇹🇷 Turquia', 91: '🇮🇳 Índia', 92: '🇵🇰 Paquistão', 93: '🇦🇫 Afeganistão', 94: '🇱🇰 Sri Lanka', 98: '🇮🇷 Irã',
  212: '🇲🇦 Marrocos', 213: '🇩🇿 Argélia', 234: '🇳🇬 Nigéria', 244: '🇦🇴 Angola', 254: '🇰🇪 Quênia', 258: '🇲🇿 Moçambique', 351: '🇵🇹 Portugal', 595: '🇵🇾 Paraguai',
  591: '🇧🇴 Bolívia', 593: '🇪🇨 Equador', 598: '🇺🇾 Uruguai', 880: '🇧🇩 Bangladesh', 966: '🇸🇦 Arábia Saudita', 971: '🇦🇪 Emirados', 972: '🇮🇱 Israel', 977: '🇳🇵 Nepal'
};
/** devolve o DDI (string) do número internacional */
export function ddiDe(numero) {
  const n = String(numero).replace(/\D/g, '');
  for (const len of [3, 2, 1]) if (DDI_PAIS[n.slice(0, len)]) return n.slice(0, len);
  return n.slice(0, 2);
}

/* ======================= ADIVINHE O ANIME ======================= */
export async function animeAleatorio() {
  const pagina = 1 + Math.floor(Math.random() * 8); // top 200 animes: dá pra adivinhar
  const { data } = await http.get(`https://api.jikan.moe/v4/top/anime?page=${pagina}&sfw=true`);
  const lista = (data?.data || []).filter(a => a?.images?.jpg?.large_image_url);
  if (!lista.length) throw new Error('sem animes');
  const a = lista[Math.floor(Math.random() * lista.length)];
  const nomes = new Set([a.title, a.title_english, ...(a.title_synonyms || []), ...((a.titles || []).map(t => t.title))].filter(Boolean));
  const { data: img } = await http.get(a.images.jpg.large_image_url, { responseType: 'arraybuffer' });
  return { titulo: a.title, ingles: a.title_english, ano: a.year, nomes: [...nomes], imagem: Buffer.from(img), url: a.url };
}
const normal = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function distancia(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let v = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) { const w = [i]; for (let j = 1; j <= n; j++) w[j] = Math.min(v[j] + 1, w[j - 1] + 1, v[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); v = w; }
  return v[n];
}
/** acertou o nome do anime? (aceita erro pequeno de digitação e o nome "curto", ex.: "shingeki" / "attack on titan") */
export function acertouAnime(chute, nomes) {
  const c = normal(chute);
  if (c.length < 3) return false;
  for (const nome of nomes) {
    const n = normal(nome);
    if (!n) continue;
    if (c === n) return true;
    const principal = normal(nome.split(/[:\-–(]/)[0]);
    if (principal.length >= 4 && (c === principal || distancia(c, principal) <= Math.floor(principal.length / 6))) return true;
    if (distancia(c, n) <= Math.floor(n.length / 6)) return true;
  }
  return false;
}

/* ======================= CAMPO MINADO ======================= */
export function novoMinado(tam = 6, minas = 6) {
  const total = tam * tam, set = new Set();
  while (set.size < minas) set.add(Math.floor(Math.random() * total));
  return { tam, minas: [...set], abertos: [], bandeiras: [], fim: false, inicio: Date.now() };
}
const LETRAS = 'ABCDEFGHIJ';
export function vizinhasMinado(g, i) {
  const t = g.tam, r = Math.floor(i / t), c = i % t, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < t && cc < t) out.push(rr * t + cc); }
  return out;
}
export function abrirMinado(g, i) {
  if (g.abertos.includes(i)) return 'ja';
  if (g.minas.includes(i) && !g.abertos.length) {
    // primeira jogada nunca explode: a mina muda de lugar
    const livre = [...Array(g.tam * g.tam).keys()].filter(x => x !== i && !g.minas.includes(x));
    g.minas[g.minas.indexOf(i)] = livre[Math.floor(Math.random() * livre.length)];
  }
  if (g.minas.includes(i)) { g.fim = 'perdeu'; return 'mina'; }
  const fila = [i];
  while (fila.length) {
    const x = fila.shift();
    if (g.abertos.includes(x)) continue;
    g.abertos.push(x);
    const n = vizinhasMinado(g, x).filter(v => g.minas.includes(v)).length;
    if (n === 0) for (const v of vizinhasMinado(g, x)) if (!g.abertos.includes(v) && !g.minas.includes(v)) fila.push(v);
  }
  if (g.abertos.length === g.tam * g.tam - g.minas.length) g.fim = 'ganhou';
  return 'ok';
}
export function desenharMinado(g, mostrarTudo = false) {
  const NUM = ['🟩', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
  let s = '⬛' + [...Array(g.tam)].map((_, c) => ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'][c]).join('') + '\n';
  for (let r = 0; r < g.tam; r++) {
    s += ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭'][r] + '​';
    for (let c = 0; c < g.tam; c++) {
      const i = r * g.tam + c;
      if (g.minas.includes(i) && (mostrarTudo || g.fim)) s += '💣';
      else if (g.abertos.includes(i)) s += NUM[vizinhasMinado(g, i).filter(v => g.minas.includes(v)).length];
      else if (g.bandeiras.includes(i)) s += '🚩';
      else s += '⬜';
    }
    s += '\n';
  }
  return s;
}
/** "b3" / "B 3" -> índice da casa */
export function casaMinado(g, txt) {
  const m = String(txt || '').toUpperCase().replace(/\s+/g, '').match(/^([A-H])([1-8])$|^([1-8])([A-H])$/);
  if (!m) return -1;
  const L = m[1] || m[4], N = Number(m[2] || m[3]);
  const r = LETRAS.indexOf(L), c = N - 1;
  if (r >= g.tam || c >= g.tam) return -1;
  return r * g.tam + c;
}
