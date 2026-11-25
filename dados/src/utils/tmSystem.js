import fs from 'fs';
import path from 'path';
import { DATABASE_DIR } from './paths.js';

// ============================================================================
// 📡 SISTEMA DE TRANSMISSÃO (!tm / !tmavisos / !tmconfig)
//  • Configuração e histórico guardados em dados/database/tmConfig.json
//  • Se o arquivo não existir ou estiver corrompido, usa os padrões abaixo
// ============================================================================

const TM_CONFIG_FILE = path.join(DATABASE_DIR, 'tmConfig.json');
const MAX_HISTORICO = 50;
const MAX_EMOJI_LEN = 12;
const MAX_TITULO_LEN = 40;

const PADRAO = {
  tm: {
    emoji: '📡',
    titulo: 'TRANSMISSÃO DO BOT'
  },
  avisos: {
    emoji: '⚠️',
    titulo: 'ATENÇÃO'
  },
  historico: [],
  contador: 0
};

const clonarPadrao = () => JSON.parse(JSON.stringify(PADRAO));

const carregar = () => {
  const base = clonarPadrao();
  try {
    if (!fs.existsSync(TM_CONFIG_FILE)) return base;
    const dados = JSON.parse(fs.readFileSync(TM_CONFIG_FILE, 'utf-8'));
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return base;
    return {
      tm: { ...base.tm, ...(dados.tm || {}) },
      avisos: { ...base.avisos, ...(dados.avisos || {}) },
      historico: Array.isArray(dados.historico) ? dados.historico : [],
      contador: Number.isFinite(dados.contador) ? dados.contador : 0
    };
  } catch (e) {
    console.error('Erro ao carregar tmConfig:', e.message);
    return base;
  }
};

const salvar = (dados) => {
  try {
    fs.mkdirSync(path.dirname(TM_CONFIG_FILE), { recursive: true });
    const tmp = TM_CONFIG_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(dados, null, 2), 'utf-8');
    fs.renameSync(tmp, TM_CONFIG_FILE);
    return true;
  } catch (e) {
    console.error('Erro ao salvar tmConfig:', e.message);
    return false;
  }
};

const getConfig = () => carregar();

const validarEmoji = (texto) => {
  const valor = String(texto || '').trim();
  if (!valor) return { ok: false, motivo: 'Informe um emoji.' };
  if (valor.length > MAX_EMOJI_LEN) return { ok: false, motivo: 'Emoji muito longo (use no máximo 3 emojis).' };
  // precisa ter pelo menos um caractere que não seja letra/número/espaço
  if (/^[\p{L}\p{N}\s]+$/u.test(valor)) return { ok: false, motivo: 'Isso não parece um emoji.' };
  return { ok: true, valor };
};

const setEmoji = (tipo, texto) => {
  if (tipo !== 'tm' && tipo !== 'avisos') return { ok: false, motivo: 'Tipo inválido.' };
  const v = validarEmoji(texto);
  if (!v.ok) return v;
  const dados = carregar();
  dados[tipo].emoji = v.valor;
  return salvar(dados) ? { ok: true, valor: v.valor } : { ok: false, motivo: 'Não consegui salvar a configuração.' };
};

const setTitulo = (tipo, texto) => {
  if (tipo !== 'tm' && tipo !== 'avisos') return { ok: false, motivo: 'Tipo inválido.' };
  const valor = String(texto || '').trim();
  if (!valor) return { ok: false, motivo: 'Informe o título.' };
  if (valor.length > MAX_TITULO_LEN) return { ok: false, motivo: `Título muito longo (máx. ${MAX_TITULO_LEN} caracteres).` };
  const dados = carregar();
  dados[tipo].titulo = valor;
  return salvar(dados) ? { ok: true, valor } : { ok: false, motivo: 'Não consegui salvar a configuração.' };
};

const resetarConfig = () => {
  const dados = carregar();
  dados.tm = { ...PADRAO.tm };
  dados.avisos = { ...PADRAO.avisos };
  return salvar(dados);
};

// Monta o cabeçalho no mesmo visual do !tm original
const montarCabecalho = (tipo) => {
  const cfg = carregar();
  const { emoji, titulo } = cfg[tipo] || PADRAO[tipo];
  return `╔══════════════════════\n║  ${emoji} *${titulo}* ${emoji}\n╚══════════════════════\n\n`;
};

const registrarAviso = ({ texto, temMidia, enviados, total }) => {
  const dados = carregar();
  dados.contador = (dados.contador || 0) + 1;
  dados.historico.push({
    numero: dados.contador,
    data: new Date().toISOString(),
    texto: String(texto || '').slice(0, 500),
    temMidia: !!temMidia,
    enviados,
    total
  });
  if (dados.historico.length > MAX_HISTORICO) {
    dados.historico = dados.historico.slice(-MAX_HISTORICO);
  }
  salvar(dados);
  return dados.contador;
};

const listarAvisos = (limite = 10) => {
  const { historico } = carregar();
  return historico.slice(-limite).reverse();
};

export default {
  getConfig,
  setEmoji,
  setTitulo,
  resetarConfig,
  montarCabecalho,
  registrarAviso,
  listarAvisos,
  TM_CONFIG_FILE
};
