/**
 * ★彡 ASTA MD 彡★ — BARRA DE PROGRESSO (mensagem editada pelo bot)
 *
 *   🎨 Fazendo a figurinha...   [▰▰▰▰▱▱▱▱▱▱] 40%
 *   📤 Enviando...              [▰▰▰▰▰▰▰▰▰▱] 95%
 *   ✅ Figurinha enviada!       [▰▰▰▰▰▰▰▰▰▰] 100%
 *
 * Funciona para qualquer comando sem mexer nele: o socket do comando é "embrulhado".
 *  • a barra só aparece se o comando demorar mais que ~1,5 s (comando rápido não ganha barra);
 *  • as mensagens de espera do próprio comando ("⏳ Baixando...", "Aguarde...") viram a barra;
 *  • quando o comando manda a mídia → "Enviando..." e depois "Enviada!";
 *  • se o comando responde com erro (❌ / ⚠️), a barra vira a mensagem de erro.
 */

const BARRA = (p) => { const n = Math.max(0, Math.min(10, Math.round(p / 10))); return `[${'▰'.repeat(n)}${'▱'.repeat(10 - n)}] ${Math.round(p)}%`; };

export const TIPOS = {
  fig: { faz: '🎨 Fazendo a figurinha', fim: '✅ Figurinha enviada!' },
  down: { faz: '📥 Baixando', fim: '✅ Enviado!' },
  efeito: { faz: '🎚️ Aplicando o efeito', fim: '✅ Pronto, enviado!' },
  edit: { faz: '🖼️ Editando a imagem', fim: '✅ Imagem enviada!' },
  logo: { faz: '🖌️ Criando a logo', fim: '✅ Logo enviada!' },
  audio: { faz: '🔊 Gerando o áudio', fim: '✅ Áudio enviado!' },
  img: { faz: '🖼️ Processando a imagem', fim: '✅ Imagem enviada!' },
  texto: { faz: '📝 Buscando', fim: '✅ Pronto!' },
  outro: { faz: '⏳ Processando', fim: '✅ Enviado!' }
};

const ESPERA = /^\s*(⏳|⌛|🔄|🔃|⏬|📥|🎨|🎬|🎵|🔊|🖌️|🖼️|🎚️|🔎|🔍|⚙️)|^\s*\*?(aguarde|aguardando|processando|baixando|gerando|carregando|convertendo|fazendo|preparando|criando|buscando|enviando|pesquisando|editando|removendo|aplicando)/i;
const ERRO = /^\s*(❌|⚠️|🚫|❗|⛔)/;
const CHAVES_MIDIA = ['sticker', 'image', 'video', 'audio', 'document', 'ptv'];
const MSG_MIDIA = ['stickerMessage', 'audioStickerMessage', 'imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'documentWithCaptionMessage', 'ptvMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'lottieStickerMessage'];

/**
 * Embrulha o socket do comando com a barra de progresso.
 * @returns { sock, prog }  use "sock" no lugar do socket original durante o comando
 */
export function comProgresso(real, from, info, tipo = 'outro', { atrasoMs = 1500, intervaloMs = 1800 } = {}) {
  const T = TIPOS[tipo] || TIPOS.outro;
  const st = { edits: 0, key: null, iniciada: false, fim: false, pct: 0, etapa: T.faz, ultimoEdit: 0, timer: null, tique: null, fila: Promise.resolve(), pendente: false };

  const mandar = (texto) => {
    st.fila = st.fila.then(async () => {
      try {
        if (!st.key) {
          const m = await real.sendMessage(from, { text: texto }, { quoted: info });
          st.key = m?.key || null;
        } else {
          await real.sendMessage(from, { text: texto, edit: st.key });
        }
        st.ultimoEdit = Date.now();
      } catch { }
    });
    return st.fila;
  };
  const texto = () => `${st.etapa}...\n${BARRA(st.pct)}`;
  const editar = (forcar = false) => {
    if (st.fim && !forcar) return;
    // depois de 10 atualizações, edita a cada 5 s (download longo não fica editando sem parar)
    if (!forcar && Date.now() - st.ultimoEdit < (st.edits >= 10 ? 5000 : intervaloMs)) { st.pendente = true; return; }
    st.edits++;
    st.pendente = false;
    return mandar(texto());
  };
  const iniciar = (etapa) => {
    if (st.iniciada || st.fim) return;
    st.iniciada = true;
    clearTimeout(st.timer);
    if (etapa) st.etapa = etapa;
    st.pct = Math.max(st.pct, 8);
    editar(true);
    // sobe sozinha devagar até 90% (o resto vem quando a mídia é enviada)
    st.tique = setInterval(() => {
      if (st.fim) return clearInterval(st.tique);
      st.pct = Math.min(90, st.pct + Math.max(1, (90 - st.pct) * 0.18));
      editar();
    }, intervaloMs);
    // segurança: some com a barra se ficar parada muito tempo
    setTimeout(() => { if (!st.fim) finalizar(null); }, 10 * 60_000);
  };
  const finalizar = (textoFinal, apagar = false) => {
    if (st.fim) return st.fila;
    st.fim = true;
    clearTimeout(st.timer); clearInterval(st.tique);
    if (!st.iniciada) return st.fila;
    if (apagar) {
      st.fila = st.fila.then(async () => { try { if (st.key) await real.sendMessage(from, { delete: st.key }); } catch { } });
      return st.fila;
    }
    if (textoFinal) return mandar(textoFinal);
    return st.fila;
  };

  st.timer = setTimeout(() => iniciar(), atrasoMs);

  const ehMidia = (c) => c && typeof c === 'object' && CHAVES_MIDIA.some(k => k in c);
  const ehMsgMidia = (m) => m && typeof m === 'object' && MSG_MIDIA.some(k => k in m);

  const enviando = async () => {
    if (st.fim) return;
    if (!st.iniciada) { clearTimeout(st.timer); return; } // foi rápido: nem mostra barra
    st.pct = Math.max(st.pct, 95);
    st.etapa = '📤 Enviando';
    await editar(true);
  };
  const enviada = () => {
    if (!st.iniciada) { st.fim = true; clearTimeout(st.timer); return; }
    st.pct = 100;
    return finalizar(`${T.fim}\n${BARRA(100)}`);
  };

  const sendMessage = async (jid, content, opts) => {
    if (jid !== from || st.fim || !content || content.edit || content.delete || content.react) return real.sendMessage(jid, content, opts);
    if (typeof content.text === 'string' && !ehMidia(content)) {
      const t = content.text.trim();
      // mensagem de espera do comando: vira a barra
      if (ESPERA.test(t) && t.length < 300 && !ERRO.test(t)) {
        st.etapa = t.split('\n')[0].replace(/\.{2,}\s*$/, '').replace(/^\*|\*$/g, '').slice(0, 80);
        if (!st.iniciada) iniciar(st.etapa); else editar(true);
        return { key: st.key };
      }
      // erro: a barra vira o erro
      if (ERRO.test(t) && st.iniciada) {
        await finalizar(t);
        return { key: st.key };
      }
      // outro texto qualquer: o comando terminou sem mídia → tira a barra
      if (st.iniciada) await finalizar(null, true); else { st.fim = true; clearTimeout(st.timer); }
      return real.sendMessage(jid, content, opts);
    }
    if (ehMidia(content)) {
      await enviando();
      const r = await real.sendMessage(jid, content, opts);
      enviada();
      return r;
    }
    return real.sendMessage(jid, content, opts);
  };
  const relayMessage = async (jid, message, opts) => {
    if (jid !== from || st.fim || !ehMsgMidia(message)) return real.relayMessage(jid, message, opts);
    await enviando();
    const r = await real.relayMessage(jid, message, opts);
    enviada();
    return r;
  };

  const sock = new Proxy(real, {
    get(t, k) {
      if (k === 'sendMessage') return sendMessage;
      if (k === 'relayMessage') return relayMessage;
      if (k === '__astaReal') return real;
      const v = t[k];
      return typeof v === 'function' ? v.bind(t) : v;
    }
  });
  return { sock, prog: { iniciar, finalizar, enviando, enviada, st } };
}
