/**
 * TRANSMISSÃO DE QUALQUER MENSAGEM (usado pelo !tm e pelo !divdono)
 *
 * Aceita tudo que o WhatsApp tem hoje: texto, imagem, vídeo, GIF, áudio, nota de voz,
 * figurinha (inclusive figurinha com som e animada), documento, enquete, evento,
 * localização, contato(s), visualização única e qualquer outro tipo (copiado como está).
 *
 * A mídia é baixada e enviada ao servidor UMA vez; depois a mesma mensagem já pronta é
 * entregue em cada grupo (bem mais rápido e leve que reenviar o arquivo grupo a grupo).
 */
import {
  downloadContentFromMessage,
  generateWAMessageContent,
  generateWAMessageFromContent
} from 'baileys';
import { installStickerAudioProtocol, applyNativeSoundFields, rememberSoundSticker } from './soundSticker.js';
import crypto from 'crypto';
import fsp from 'fs/promises';
import path from 'path';

installStickerAudioProtocol();

/* ------------------------- identificar a mensagem ------------------------- */

const WRAPPERS = [
  'ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension',
  'documentWithCaptionMessage', 'editedMessage'
];

/** Tira embrulhos (temporária, visualização única, documento com legenda...). */
export const unwrapMessage = (msg) => {
  let m = msg;
  for (let i = 0; i < 6 && m; i++) {
    const w = WRAPPERS.find((k) => m[k]?.message);
    if (!w) break;
    m = m[w].message;
  }
  return m || null;
};

// tipos ignorados ao procurar o conteúdo (metadados)
const META_KEYS = new Set(['messageContextInfo', 'senderKeyDistributionMessage', 'protocolMessage', 'reactionMessage', '$unknowns']);

export const TYPE_LABELS = {
  text: 'texto', image: 'imagem', video: 'vídeo', gif: 'GIF', audio: 'áudio', ptt: 'nota de voz',
  sticker: 'figurinha', soundsticker: 'figurinha com som', document: 'documento', poll: 'enquete',
  event: 'evento', location: 'localização', contact: 'contato', contacts: 'contatos', other: 'mensagem'
};

/**
 * Descobre o tipo e o conteúdo de uma Message.
 * @returns {{ type: string, node: object, key: string, message: object } | null}
 */
export const detectMessage = (rawMsg) => {
  const msg = unwrapMessage(rawMsg);
  if (!msg) return null;
  if (msg.audioStickerMessage?.message?.stickerMessage) {
    return { type: 'soundsticker', node: msg.audioStickerMessage.message.stickerMessage, key: 'stickerMessage', message: msg };
  }
  const pick = (k) => msg[k] ? { node: msg[k], key: k } : null;
  let r;
  if ((r = pick('imageMessage'))) return { type: 'image', ...r, message: msg };
  if ((r = pick('videoMessage'))) return { type: r.node.gifPlayback ? 'gif' : 'video', ...r, message: msg };
  if ((r = pick('ptvMessage'))) return { type: 'video', ...r, message: msg };
  if ((r = pick('audioMessage'))) return { type: r.node.ptt ? 'ptt' : 'audio', ...r, message: msg };
  if ((r = pick('stickerMessage'))) return { type: r.node.audioMessage ? 'soundsticker' : 'sticker', ...r, message: msg };
  if ((r = pick('documentMessage'))) return { type: 'document', ...r, message: msg };
  for (const k of ['pollCreationMessage', 'pollCreationMessageV2', 'pollCreationMessageV3', 'pollCreationMessageV5']) {
    if ((r = pick(k))) return { type: 'poll', ...r, message: msg };
  }
  if ((r = pick('eventMessage'))) return { type: 'event', ...r, message: msg };
  if ((r = pick('locationMessage'))) return { type: 'location', ...r, message: msg };
  if ((r = pick('liveLocationMessage'))) return { type: 'location', ...r, message: msg };
  if ((r = pick('contactMessage'))) return { type: 'contact', ...r, message: msg };
  if ((r = pick('contactsArrayMessage'))) return { type: 'contacts', ...r, message: msg };
  if (typeof msg.conversation === 'string') return { type: 'text', node: { text: msg.conversation }, key: 'conversation', message: msg };
  if ((r = pick('extendedTextMessage'))) return { type: 'text', node: { text: r.node.text || '' }, key: 'extendedTextMessage', message: msg };
  const other = Object.keys(msg).find((k) => !META_KEYS.has(k) && msg[k] != null);
  return other ? { type: 'other', node: msg[other], key: other, message: msg } : null;
};

/** Texto de comando sem mídia? (só o comando, sem conteúdo próprio) */
export const isOnlyText = (det) => !det || det.type === 'text';

/* ------------------------------ montar envio ------------------------------ */

const toBuffer = async (node, type) => {
  const stream = await downloadContentFromMessage(node, type);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  const buf = Buffer.concat(chunks);
  if (!buf.length) throw new Error('mídia vazia (pode ter expirado)');
  return buf;
};

const stripCtx = (node) => {
  const { contextInfo, ...rest } = node || {};
  return rest;
};

/** "Pergunta | op1 | op2 | op3"  (até 12 opções). Use "*" no fim da pergunta p/ múltipla escolha. */
export const parsePollText = (text) => {
  const parts = String(text || '').split('|').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  let name = parts[0];
  let multi = false;
  if (name.endsWith('*')) { multi = true; name = name.slice(0, -1).trim(); }
  const values = [...new Set(parts.slice(1))].slice(0, 12);
  if (values.length < 2) return null;
  return { name, values, selectableCount: multi ? 0 : 1 };
};

/**
 * Prepara o "pacote" de envio a partir de uma mensagem detectada.
 * @param nazu  socket
 * @param det   retorno de detectMessage (ou null para só texto)
 * @param text  texto principal (legenda / mensagem / nome da enquete)
 * @returns pacote usado por sendPrepared
 */
export const preparePayload = async (nazu, det, text = '') => {
  const upload = { upload: nazu.waUploadToServer, mediaUploadTimeoutMs: 60_000 };
  const t = String(text || '').trim();

  if (!det || det.type === 'text') {
    const body = t || det?.node?.text || '';
    if (!body) throw new Error('Sem conteúdo para enviar.');
    return { kind: 'text', text: body };
  }

  const n = det.node;
  switch (det.type) {
    case 'image': {
      const buf = await toBuffer(n, 'image');
      const content = await generateWAMessageContent({ image: buf, mimetype: n.mimetype || 'image/jpeg', caption: '' }, upload);
      return { kind: 'relay', content, captionKey: 'imageMessage', text: t || n.caption || '' };
    }
    case 'video':
    case 'gif': {
      const buf = await toBuffer(n, 'video');
      const content = await generateWAMessageContent({
        video: buf, mimetype: n.mimetype || 'video/mp4', caption: '', gifPlayback: det.type === 'gif'
      }, upload);
      return { kind: 'relay', content, captionKey: 'videoMessage', text: t || n.caption || '' };
    }
    case 'audio':
    case 'ptt': {
      const buf = await toBuffer(n, 'audio');
      const content = await generateWAMessageContent({
        audio: buf,
        mimetype: n.mimetype || (det.type === 'ptt' ? 'audio/ogg; codecs=opus' : 'audio/mpeg'),
        ptt: det.type === 'ptt',
        seconds: n.seconds || undefined,
        waveform: n.waveform?.length ? Buffer.from(n.waveform) : (det.type === 'ptt' ? Buffer.alloc(64) : undefined)
      }, upload);
      return { kind: 'relay', content, captionKey: null, text: t };
    }
    case 'sticker': {
      const buf = await toBuffer(n, 'sticker');
      const content = await generateWAMessageContent({ sticker: buf }, upload);
      if (n.isAnimated) content.stickerMessage.isAnimated = true;
      return { kind: 'relay', content, captionKey: null, text: t };
    }
    case 'soundsticker': {
      const [img, snd] = await Promise.all([toBuffer(n, 'sticker'), toBuffer(n.audioMessage, 'audio')]);
      const [st, au] = await Promise.all([
        generateWAMessageContent({ sticker: img }, upload),
        generateWAMessageContent({
          audio: snd, mimetype: n.audioMessage.mimetype || 'audio/ogg; codecs=opus', ptt: false,
          seconds: n.audioMessage.seconds || 1,
          waveform: n.audioMessage.waveform?.length ? Buffer.from(n.audioMessage.waveform) : Buffer.alloc(64)
        }, upload)
      ]);
      if (n.isAnimated) st.stickerMessage.isAnimated = true;
      applyNativeSoundFields(st.stickerMessage, au.audioMessage);
      return { kind: 'soundsticker', sticker: st.stickerMessage, text: t };
    }
    case 'document': {
      const buf = await toBuffer(n, 'document');
      const content = await generateWAMessageContent({
        document: buf, mimetype: n.mimetype || 'application/octet-stream', fileName: n.fileName || 'arquivo', caption: ''
      }, upload);
      return { kind: 'relay', content, captionKey: 'documentMessage', text: t || n.caption || '' };
    }
    case 'poll': {
      const poll = {
        name: n.name || t || 'Enquete',
        values: (n.options || []).map((o) => o.optionName).filter(Boolean),
        selectableCount: Number(n.selectableOptionsCount) || 0
      };
      if (poll.values.length < 2) throw new Error('Enquete sem opções suficientes.');
      return { kind: 'poll', poll, text: n.name ? t : '' };
    }
    case 'event': {
      const start = Number(n.startTime) ? new Date(Number(n.startTime) * 1000) : new Date(Date.now() + 3600e3);
      return {
        kind: 'event',
        event: {
          name: n.name || 'Evento',
          description: t || n.description || '',
          startDate: start,
          endDate: Number(n.endTime) ? new Date(Number(n.endTime) * 1000) : undefined,
          location: n.location || undefined,
          extraGuestsAllowed: n.extraGuestsAllowed || false
        },
        text: ''
      };
    }
    case 'location': {
      const loc = {
        degreesLatitude: n.degreesLatitude, degreesLongitude: n.degreesLongitude,
        name: n.name || undefined, address: n.address || undefined, url: n.url || undefined
      };
      return { kind: 'relay', content: { locationMessage: loc }, captionKey: null, text: t };
    }
    case 'contact':
      return { kind: 'relay', content: { contactMessage: stripCtx(n) }, captionKey: null, text: t };
    case 'contacts':
      return { kind: 'relay', content: { contactsArrayMessage: stripCtx(n) }, captionKey: null, text: t };
    default:
      return { kind: 'relay', content: { [det.key]: stripCtx(n) }, captionKey: null, text: t };
  }
};

/** Pacote de enquete criada pelo texto do comando. */
export const pollPayload = (poll) => ({ kind: 'poll', poll, text: '' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Envia um pacote preparado para um chat.
 * @param decorate  (texto) => texto final (ex.: adiciona cabeçalho e ID). Recebe '' quando não há texto.
 */
export const sendPrepared = async (nazu, jid, payload, decorate = (s) => s) => {
  const userJid = nazu.user?.id;
  const relay = async (content, marker) => {
    const built = generateWAMessageFromContent(jid, content, { userJid });
    const msg = marker ? { ...built.message, ...marker } : built.message;
    await nazu.relayMessage(jid, msg, { messageId: built.key.id });
  };
  const extra = async () => {
    const txt = payload.text ? decorate(payload.text) : '';
    if (txt) await nazu.sendMessage(jid, { text: txt });
  };

  switch (payload.kind) {
    case 'text':
      await nazu.sendMessage(jid, { text: decorate(payload.text) });
      return;
    case 'poll':
      await nazu.sendMessage(jid, { poll: { ...payload.poll, values: [...payload.poll.values] } });
      await extra();
      return;
    case 'event':
      await nazu.sendMessage(jid, { event: { ...payload.event } });
      return;
    case 'soundsticker': {
      // monta direto (sem passar pelo fromObject do Baileys, que apagaria os campos que o iPhone precisa)
      const inner = applyNativeSoundFields({ ...payload.sticker }, payload.sticker.audioMessage ? { ...payload.sticker.audioMessage } : null);
      const ids = generateWAMessageFromContent(jid, { stickerMessage: { ...payload.sticker } }, { userJid });
      const wrapped = { audioStickerMessage: { message: { stickerMessage: inner } }, messageContextInfo: { messageSecret: crypto.randomBytes(32) }, stickerMessage: inner };
      await nazu.relayMessage(jid, wrapped, { messageId: ids.key.id });
      rememberSoundSticker(ids.key.id, wrapped.audioStickerMessage);
      await extra();
      return;
    }
    case 'relay': {
      const content = { ...payload.content };
      if (payload.captionKey && content[payload.captionKey]) {
        const cap = decorate(payload.text || '');
        content[payload.captionKey] = { ...content[payload.captionKey], caption: cap || undefined };
        await relay(content);
        return;
      }
      await relay(content);
      await extra();
      return;
    }
    default:
      throw new Error(`Tipo de pacote desconhecido: ${payload.kind}`);
  }
};

/**
 * Envia para vários chats com pausa entre eles.
 * @returns {{ sent: number, failed: number, total: number }}
 */
export const broadcastPrepared = async (nazuOrGetter, jids, payload, { decorate, delayMs = [1000, 2000], onError, shouldStop, onProgress } = {}) => {
  let sent = 0;
  let failed = 0;
  let stopped = false;
  const list = [...jids];
  for (let i = 0; i < list.length; i++) {
    if (shouldStop?.()) { stopped = true; break; }
    const sock = typeof nazuOrGetter === 'function' ? nazuOrGetter() : nazuOrGetter;
    try {
      await sendPrepared(sock, list[i], payload, decorate);
      sent++;
    } catch (e) {
      failed++;
      onError?.(list[i], e);
    }
    onProgress?.({ done: i + 1, total: list.length, sent, failed });
    if (i < list.length - 1) {
      const [a, b] = delayMs;
      await sleep(a + Math.floor(Math.random() * Math.max(0, b - a)));
    }
  }
  return { sent, failed, total: list.length, stopped, skipped: list.length - sent - failed };
};

/* ---------------------- itens salvos (divulgação agendada) ---------------------- */

const extOf = (mime = '', fallback = 'bin') => {
  const m = String(mime).toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('mp4')) return 'mp4';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mpeg')) return 'mp3';
  if (m.includes('pdf')) return 'pdf';
  return fallback;
};

/**
 * Salva em disco uma mensagem (qualquer tipo) para ser reenviada depois.
 * @returns item (objeto JSON) — guarde na lista de itens
 */
export const saveDetectedItem = async (det, text, dir) => {
  await fsp.mkdir(dir, { recursive: true });
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  const t = String(text || '').trim();
  const write = async (buf, ext) => { const f = `${id}.${ext}`; await fsp.writeFile(path.join(dir, f), buf); return f; };
  const item = { id, type: det ? det.type : 'text', createdAt: new Date().toISOString() };
  if (!det || det.type === 'text') {
    item.type = 'text';
    item.text = t || det?.node?.text || '';
    if (!item.text) throw new Error('Sem texto para salvar.');
    return item;
  }
  const n = det.node;
  switch (det.type) {
    case 'image':
      item.file = await write(await toBuffer(n, 'image'), extOf(n.mimetype, 'jpg'));
      Object.assign(item, { mimetype: n.mimetype || 'image/jpeg', text: t || n.caption || '' });
      break;
    case 'video': case 'gif':
      item.file = await write(await toBuffer(n, 'video'), 'mp4');
      Object.assign(item, { mimetype: n.mimetype || 'video/mp4', text: t || n.caption || '' });
      break;
    case 'audio': case 'ptt':
      item.file = await write(await toBuffer(n, 'audio'), extOf(n.mimetype, 'ogg'));
      Object.assign(item, {
        mimetype: n.mimetype || 'audio/ogg; codecs=opus', seconds: Number(n.seconds) || undefined,
        waveform: n.waveform?.length ? Buffer.from(n.waveform).toString('base64') : undefined, text: t
      });
      break;
    case 'sticker':
      item.file = await write(await toBuffer(n, 'sticker'), 'webp');
      Object.assign(item, { isAnimated: !!n.isAnimated, text: t });
      break;
    case 'soundsticker':
      item.file = await write(await toBuffer(n, 'sticker'), 'webp');
      item.audioFile = await write(await toBuffer(n.audioMessage, 'audio'), 'ogg');
      Object.assign(item, {
        isAnimated: !!n.isAnimated, seconds: Number(n.audioMessage.seconds) || 1,
        waveform: n.audioMessage.waveform?.length ? Buffer.from(n.audioMessage.waveform).toString('base64') : undefined, text: t
      });
      break;
    case 'document':
      item.file = await write(await toBuffer(n, 'document'), extOf(n.mimetype, 'bin'));
      Object.assign(item, { mimetype: n.mimetype || 'application/octet-stream', fileName: n.fileName || 'arquivo', text: t || n.caption || '' });
      break;
    case 'poll':
      item.poll = { name: n.name || t || 'Enquete', values: (n.options || []).map(o => o.optionName).filter(Boolean), selectableCount: Number(n.selectableOptionsCount) || 0 };
      if (item.poll.values.length < 2) throw new Error('Enquete sem opções.');
      item.text = n.name ? t : '';
      break;
    case 'event':
      item.event = { name: n.name || 'Evento', description: t || n.description || '', startTime: Number(n.startTime) || 0, endTime: Number(n.endTime) || 0, location: n.location || undefined };
      break;
    case 'location':
      item.location = { degreesLatitude: n.degreesLatitude, degreesLongitude: n.degreesLongitude, name: n.name || undefined, address: n.address || undefined };
      item.text = t;
      break;
    case 'contact':
      item.contact = { displayName: n.displayName, vcard: n.vcard };
      item.text = t;
      break;
    case 'contacts':
      item.contacts = { displayName: n.displayName, contacts: (n.contacts || []).map(c => ({ displayName: c.displayName, vcard: c.vcard })) };
      item.text = t;
      break;
    default:
      throw new Error(`Tipo "${det.type}" não pode ser salvo para agendamento.`);
  }
  return item;
};

/** Item de enquete criado a partir do texto do comando. */
export const pollItem = (poll) => ({ id: `${Date.now().toString(36)}p`, type: 'poll', poll, createdAt: new Date().toISOString() });

/** Recria o pacote de envio a partir de um item salvo (faz o upload da mídia uma vez). */
export const payloadFromItem = async (nazu, item, dir) => {
  const upload = { upload: nazu.waUploadToServer, mediaUploadTimeoutMs: 60_000 };
  const read = (f) => fsp.readFile(path.join(dir, f));
  const t = item.text || '';
  switch (item.type) {
    case 'text': return { kind: 'text', text: t };
    case 'image': {
      const content = await generateWAMessageContent({ image: await read(item.file), mimetype: item.mimetype, caption: '' }, upload);
      return { kind: 'relay', content, captionKey: 'imageMessage', text: t };
    }
    case 'video': case 'gif': {
      const content = await generateWAMessageContent({ video: await read(item.file), mimetype: item.mimetype || 'video/mp4', caption: '', gifPlayback: item.type === 'gif' }, upload);
      return { kind: 'relay', content, captionKey: 'videoMessage', text: t };
    }
    case 'audio': case 'ptt': {
      const content = await generateWAMessageContent({
        audio: await read(item.file), mimetype: item.mimetype, ptt: item.type === 'ptt', seconds: item.seconds,
        waveform: item.waveform ? Buffer.from(item.waveform, 'base64') : (item.type === 'ptt' ? Buffer.alloc(64) : undefined)
      }, upload);
      return { kind: 'relay', content, captionKey: null, text: t };
    }
    case 'sticker': {
      const content = await generateWAMessageContent({ sticker: await read(item.file) }, upload);
      if (item.isAnimated) content.stickerMessage.isAnimated = true;
      return { kind: 'relay', content, captionKey: null, text: t };
    }
    case 'soundsticker': {
      const [st, au] = await Promise.all([
        generateWAMessageContent({ sticker: await read(item.file) }, upload),
        generateWAMessageContent({
          audio: await read(item.audioFile), mimetype: 'audio/ogg; codecs=opus', ptt: false, seconds: item.seconds || 1,
          waveform: item.waveform ? Buffer.from(item.waveform, 'base64') : Buffer.alloc(64)
        }, upload)
      ]);
      if (item.isAnimated) st.stickerMessage.isAnimated = true;
      applyNativeSoundFields(st.stickerMessage, au.audioMessage);
      return { kind: 'soundsticker', sticker: st.stickerMessage, text: t };
    }
    case 'document': {
      const content = await generateWAMessageContent({ document: await read(item.file), mimetype: item.mimetype, fileName: item.fileName, caption: '' }, upload);
      return { kind: 'relay', content, captionKey: 'documentMessage', text: t };
    }
    case 'poll': return { kind: 'poll', poll: { ...item.poll, values: [...item.poll.values] }, text: t };
    case 'event': {
      const now = Date.now();
      let start = item.event.startTime ? item.event.startTime * 1000 : now + 3600e3;
      if (start < now) start = now + 3600e3; // evento antigo: marca para daqui a 1h
      return { kind: 'event', event: { name: item.event.name, description: item.event.description, startDate: new Date(start), location: item.event.location }, text: '' };
    }
    case 'location': return { kind: 'relay', content: { locationMessage: { ...item.location } }, captionKey: null, text: t };
    case 'contact': return { kind: 'relay', content: { contactMessage: { ...item.contact } }, captionKey: null, text: t };
    case 'contacts': return { kind: 'relay', content: { contactsArrayMessage: { ...item.contacts } }, captionKey: null, text: t };
    default: throw new Error(`Tipo de item desconhecido: ${item.type}`);
  }
};

/** Apaga os arquivos de um item salvo. */
export const deleteItemFiles = async (item, dir) => {
  for (const f of [item.file, item.audioFile].filter(Boolean)) await fsp.unlink(path.join(dir, f)).catch(() => {});
};
