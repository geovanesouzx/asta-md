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
