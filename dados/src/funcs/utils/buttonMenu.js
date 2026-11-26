/**
 * MENSAGENS COM BOTÕES (native flow) para Baileys sem modificar a biblioteca.
 *
 * Formato igual ao usado pelo fork Itsukichan/Baileys:
 *   interactiveMessage { header(imagem) , body, footer, nativeFlowMessage { buttons[] } }
 *   + nó <biz> na stanza (sem ele o WhatsApp não desenha os botões)
 *
 * Tipos de botão:
 *   quickReply(texto, id)        -> ao clicar, o bot recebe "id" como se fosse um comando
 *   urlButton(texto, url)        -> abre um link
 *   copyButton(texto, codigo)    -> copia um texto
 *   callButton(texto, numero)    -> liga para um número
 *   listButton(texto, secoes)    -> abre uma lista (single_select) com várias opções
 */
import { prepareWAMessageMedia, generateWAMessageFromContent } from 'baileys';
import { randomBytes } from 'crypto';

const isGroupJid = (jid) => String(jid || '').endsWith('@g.us');

export const quickReply = (display_text, id) => ({
  name: 'quick_reply',
  buttonParamsJson: JSON.stringify({ display_text, id })
});

export const urlButton = (display_text, url) => ({
  name: 'cta_url',
  buttonParamsJson: JSON.stringify({ display_text, url, merchant_url: url })
});

export const copyButton = (display_text, copy_code) => ({
  name: 'cta_copy',
  buttonParamsJson: JSON.stringify({ display_text, id: copy_code, copy_code })
});

export const callButton = (display_text, phone_number) => ({
  name: 'cta_call',
  buttonParamsJson: JSON.stringify({ display_text, phone_number })
});

/**
 * @param title     texto do botão que abre a lista
 * @param sections  [{ title, highlight_label?, rows: [{ header?, title, description?, id }] }]
 */
export const listButton = (title, sections) => ({
  name: 'single_select',
  buttonParamsJson: JSON.stringify({ title, sections })
});

/** Nó <biz> que faz o WhatsApp renderizar os botões. */
const bizNode = () => ({
  tag: 'biz',
  attrs: {
    actual_actors: '2',
    host_storage: '2',
    privacy_mode_ts: String(Math.floor(Date.now() / 1000))
  },
  content: [
    {
      tag: 'interactive',
      attrs: { type: 'native_flow', v: '1' },
      content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
    },
    { tag: 'quality_control', attrs: { source_type: 'third_party' } }
  ]
});

/**
 * Envia uma mensagem com botões.
 * @param nazu   socket
 * @param jid    chat
 * @param opts   { text, footer?, title?, image?: Buffer, video?: Buffer, buttons: [], quoted?, mentions?: [] }
 * @param cfg    { privateBotNode?: boolean }  nó extra <bot> em chats privados (algumas versões do app pedem)
 */
export const sendButtons = async (nazu, jid, opts, cfg = {}) => {
  const { text = '', footer = '', title = '', image, video, buttons = [], quoted, mentions } = opts;
  if (!buttons.length) throw new Error('Nenhum botão informado.');
  const formato = String(cfg.formato || global.__astaBotoesFormato || 'AUTO').toUpperCase();
  if (formato !== 'A') return enviarFormato(formato, nazu, jid, opts);

  const interactiveMessage = {
    body: { text },
    footer: { text: footer },
    nativeFlowMessage: { buttons, messageParamsJson: '' }
  };

  if (image || video) {
    const media = await prepareWAMessageMedia(
      image ? { image } : { video },
      { upload: nazu.waUploadToServer, mediaUploadTimeoutMs: 60_000 }
    );
    interactiveMessage.header = {
      title: title || '',
      subtitle: '',
      hasMediaAttachment: true,
      ...(image ? { imageMessage: media.imageMessage } : { videoMessage: media.videoMessage })
    };
  } else {
    interactiveMessage.header = { title: title || '', subtitle: '', hasMediaAttachment: false };
    if (!title) delete interactiveMessage.header.title;
  }

  if (mentions?.length) interactiveMessage.contextInfo = { mentionedJid: mentions };

  const built = generateWAMessageFromContent(jid, { interactiveMessage }, {
    userJid: nazu.user?.id,
    ...(quoted ? { quoted } : {})
  });
  // generateWAMessageFromContent substitui o contextInfo ao citar: recoloca as menções
  if (mentions?.length && built.message.interactiveMessage) {
    built.message.interactiveMessage.contextInfo = {
      ...(built.message.interactiveMessage.contextInfo || {}),
      mentionedJid: mentions
    };
  }

  const additionalNodes = [bizNode()];
  if (cfg.privateBotNode && !isGroupJid(jid)) additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });

  // lembra "texto do botão -> comando" nesta conversa (alguns aparelhos devolvem só o texto ao clicar)
  global.__astaBtnMap = global.__astaBtnMap || new Map();
  for (const b of buttons) {
    try {
      const pj = JSON.parse(b.buttonParamsJson);
      if (b.name === 'quick_reply' && pj.display_text && pj.id) global.__astaBtnMap.set(`${jid}|${pj.display_text.trim()}`, pj.id);
      if (b.name === 'single_select') for (const sec of pj.sections || []) for (const r of sec.rows || []) if (r.title && r.id) global.__astaBtnMap.set(`${jid}|${String(r.title).trim()}`, r.id);
    } catch { }
  }
  if (global.__astaBtnMap.size > 2000) global.__astaBtnMap = new Map([...global.__astaBtnMap].slice(-1000));

  await nazu.relayMessage(jid, built.message, { messageId: built.key.id, additionalNodes });
  return built;
};


/* ============================================================================
 * FORMATOS ALTERNATIVOS (para o !testebotoes descobrir qual chega em cada celular)
 *  A = o atual (padrão)          B = A sem campos vazios + messageSecret
 *  C = B + nó <bot> no privado    D = dentro de viewOnceMessage + <biz> simples + <bot>
 *  E = botões antigos (buttonsMessage)   F = lista clássica (listMessage)
 * ========================================================================== */
export const FORMATOS = {
  AUTO: 'automático: B (até 3 botões) e F (listas e mais de 3 opções)',
  A: 'o de antes',
  B: 'sem campos vazios + messageSecret',
  C: 'B + marca de bot no privado',
  D: 'viewOnce + marca de bot',
  E: 'botões antigos (buttonsMessage)',
  F: 'lista clássica'
};

const bizSimples = () => ({ tag: 'biz', attrs: {}, content: [{ tag: 'interactive', attrs: { type: 'native_flow', v: '1' }, content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }] }] });
const bizLista = () => ({ tag: 'biz', attrs: {}, content: [{ tag: 'list', attrs: { type: 'product_list', v: '2' } }] });
const noBot = () => ({ tag: 'bot', attrs: { biz_bot: '1' } });
const segredo = (m) => { m.messageContextInfo = { ...(m.messageContextInfo || {}), messageSecret: randomBytes(32) }; return m; };
const lerBotoes = (buttons) => buttons.map(b => { try { return { name: b.name, p: JSON.parse(b.buttonParamsJson) }; } catch { return null; } }).filter(Boolean);

export async function enviarFormato(formato, nazu, jid, opts) {
  const { text = '', footer = '', title = '', image, video, buttons = [], quoted, mentions } = opts;
  let F = String(formato).toUpperCase();
  if (F === 'A') return sendButtons(nazu, jid, opts, { formato: 'A' });
  // lembra "texto do botão -> comando" (alguns aparelhos devolvem só o texto ao clicar)
  global.__astaBtnMap = global.__astaBtnMap || new Map();
  for (const b of buttons) {
    try {
      const pj = JSON.parse(b.buttonParamsJson);
      if (b.name === 'quick_reply' && pj.display_text && pj.id) global.__astaBtnMap.set(`${jid}|${pj.display_text.trim()}`, pj.id);
      if (b.name === 'single_select') for (const sec of pj.sections || []) for (const r of sec.rows || []) if (r.title && r.id) global.__astaBtnMap.set(`${jid}|${String(r.title).trim()}`, r.id);
    } catch { }
  }
  if (F === 'AUTO') {
    // B para botões comuns; F (lista clássica) quando tem lista ou mais de 3 opções — os dois aparecem no iPhone
    const lb = lerBotoes(buttons);
    F = (lb.some(b => b.name === 'single_select') || lb.filter(b => b.name === 'quick_reply').length > 3) ? 'F' : 'B';
  }
  const privado = !isGroupJid(jid);
  const qo = quoted ? { quoted } : {};
  const lidos = lerBotoes(buttons);
  const rapidos = lidos.filter(b => b.name === 'quick_reply');
  let content, nodes;
  let txt = text;
  if ((F === 'E' || F === 'F') && (image || video)) {
    // esses formatos não têm imagem: manda a mídia antes, com o texto na legenda
    await nazu.sendMessage(jid, { ...(image ? { image } : { video }), caption: text, ...(mentions?.length ? { mentions } : {}) }, qo);
    txt = '👇 Escolha uma opção';
  }

  if (F === 'E') {
    // botões antigos: só respostas rápidas (até 3)
    const bts = (rapidos.length ? rapidos : lidos).slice(0, 3).map(b => ({ buttonId: b.p.id || b.p.url || 'x', buttonText: { displayText: b.p.display_text || b.p.title || 'OK' }, type: 1 }));
    content = { buttonsMessage: { contentText: txt || '👇', ...(footer ? { footerText: footer } : {}), buttons: bts, headerType: 1 } };
    nodes = [bizNode()];
  } else if (F === 'F') {
    const secoes = [];
    for (const b of lidos) {
      if (b.name === 'single_select') for (const sec of b.p.sections || []) { const rows = (sec.rows || []).filter(r => r?.id && r?.title).map(r => ({ title: String(r.title).slice(0, 72), ...(r.description ? { description: String(r.description).slice(0, 72) } : {}), rowId: r.id })); if (rows.length) secoes.push({ ...(sec.title ? { title: sec.title } : {}), rows }); }
    }
    if (rapidos.length) secoes.push({ title: 'Opções', rows: rapidos.map(b => ({ title: String(b.p.display_text).slice(0, 72), rowId: b.p.id })) });
    content = { listMessage: { description: txt || '👇', buttonText: '👉 Escolher', ...(footer ? { footerText: footer } : {}), listType: 1, sections: secoes } };
    nodes = [bizLista()];
  } else {
    const im = { body: { text: text || '👇' }, ...(footer ? { footer: { text: footer } } : {}), nativeFlowMessage: { buttons } };
    if (image || video) {
      const media = await prepareWAMessageMedia(image ? { image } : { video }, { upload: nazu.waUploadToServer, mediaUploadTimeoutMs: 60_000 });
      im.header = { ...(title ? { title } : {}), hasMediaAttachment: true, ...(image ? { imageMessage: media.imageMessage } : { videoMessage: media.videoMessage }) };
    } else if (title) im.header = { title, hasMediaAttachment: false };
    if (mentions?.length) im.contextInfo = { mentionedJid: mentions };
    if (F === 'D') {
      content = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: im } } };
      nodes = [bizSimples(), ...(privado ? [noBot()] : [])];
    } else {
      content = { interactiveMessage: im };
      nodes = [bizNode(), ...(F === 'C' && privado ? [noBot()] : [])];
    }
  }
  const built = generateWAMessageFromContent(jid, content, { userJid: nazu.user?.id, ...qo });
  if (mentions?.length) { const k = Object.keys(built.message).find(x => x !== 'messageContextInfo'); const alvo = k === 'viewOnceMessage' ? built.message.viewOnceMessage.message.interactiveMessage : built.message[k]; if (alvo) alvo.contextInfo = { ...(alvo.contextInfo || {}), mentionedJid: mentions }; }
  segredo(built.message);
  await nazu.relayMessage(jid, built.message, { messageId: built.key.id, additionalNodes: nodes });
  if (F === 'F') {
    const links = lidos.filter(b => ['cta_url', 'cta_copy', 'cta_call'].includes(b.name));
    if (links.length) await enviarFormato('B', nazu, jid, { text: '🔗', buttons: buttons.filter(b => ['cta_url', 'cta_copy', 'cta_call'].includes(b.name)).slice(0, 3) });
  }
  return built;
}
