/**
 * ★彡 ASTA MD 彡★ — MODELOS DA IMAGEM DE BOAS-VINDAS
 *
 * 1–5  : só a foto de perfil do membro (com estilos diferentes)
 * 6–10 : cartões com foto, nome, grupo e número do membro
 *
 * gerarModeloBV(n, { foto, nome, grupo, numero }) -> Buffer JPG
 */
import sharp from 'sharp';

const FONTE = "DejaVu Sans, Arial, Helvetica, sans-serif";
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const limpar = (t, n = 40) => String(t ?? '').replace(/[\u0000-\u001f]/g, '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').trim().slice(0, n);
const curto = (t, n) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

export const MODELOS_BV = {
  1: { nome: 'Foto pura', tipo: 'foto', desc: 'só a foto de perfil, do jeito que ela é' },
  2: { nome: 'Foto redonda', tipo: 'foto', desc: 'foto redonda com anel colorido, fundo desfocado' },
  3: { nome: 'Polaroid', tipo: 'foto', desc: 'foto revelada com moldura branca' },
  4: { nome: 'Moldura neon', tipo: 'foto', desc: 'foto com borda neon brilhando' },
  5: { nome: 'Story', tipo: 'foto', desc: 'foto em pé, estilo story, fundo desfocado' },
  6: { nome: 'Cartão clássico', tipo: 'cartao', desc: 'foto, nome, grupo e nº do membro' },
  7: { nome: 'Capa (estilo Discord)', tipo: 'cartao', desc: 'capa colorida com a foto por cima' },
  8: { nome: 'Minimalista claro', tipo: 'cartao', desc: 'fundo claro e limpo' },
  9: { nome: 'Cyber neon', tipo: 'cartao', desc: 'grade neon roxa e azul' },
  10: { nome: 'Carteirinha', tipo: 'cartao', desc: 'carteirinha de membro do grupo' }
};

async function fotoBase(foto, tam, nome, cor = '#7c3aed') {
  if (foto) { try { return await sharp(foto).resize(tam, tam, { fit: 'cover' }).png().toBuffer(); } catch { } }
  // sem foto: iniciais do nome; se o "nome" for só número, um bonequinho
  const ini = limpar(nome, 30).split(' ').filter((p) => /\p{L}/u.test(p)).slice(0, 2).map((p) => p.match(/\p{L}/u)[0]).join('').toUpperCase();
  const dentro = ini
    ? `<text x="50%" y="54%" font-family="${FONTE}" font-size="${Math.round(tam * 0.42)}" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${esc(ini)}</text>`
    : `<g fill="#fff" opacity=".9"><circle cx="${tam / 2}" cy="${tam * 0.38}" r="${tam * 0.17}"/><path d="M${tam * 0.18} ${tam} C${tam * 0.2} ${tam * 0.66} ${tam * 0.36} ${tam * 0.6} ${tam / 2} ${tam * 0.6} C${tam * 0.64} ${tam * 0.6} ${tam * 0.8} ${tam * 0.66} ${tam * 0.82} ${tam} Z"/></g>`;
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}"><rect width="100%" height="100%" fill="${cor}"/>${dentro}</svg>`)).png().toBuffer();
}
async function recortar(buf, tam, forma = 'circulo', raio = 0) {
  const m = forma === 'circulo'
    ? `<circle cx="${tam / 2}" cy="${tam / 2}" r="${tam / 2}" fill="#fff"/>`
    : `<rect width="${tam}" height="${tam}" rx="${raio}" fill="#fff"/>`;
  return sharp(buf).resize(tam, tam).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}">${m}</svg>`), blend: 'dest-in' }]).png().toBuffer();
}
async function desfocado(foto, w, h, nome, escurecer = 0.45) {
  const b = await fotoBase(foto, Math.max(w, h), nome);
  const bg = await sharp(b).resize(w, h, { fit: 'cover' }).blur(28).modulate({ saturation: 1.3 }).png().toBuffer();
  return sharp(bg).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#000" opacity="${escurecer}"/></svg>`) }]).png().toBuffer();
}
const jpg = (img) => sharp(img).jpeg({ quality: 90 }).toBuffer();

export async function gerarModeloBV(n, { foto, nome, grupo, numero, registro = false }) {
  n = Number(n) || 1;
  // registro no privado: os textos mudam ("Registro nº", "se registrou no ...")
  const R = registro
    ? { membro: 'Registro nº', MEMBRO: 'REGISTRO Nº', entrou: 'se registrou no', acabou: 'acabou de se registrar no', topo: 'REGISTRADO(A)', player: '&gt; NOVO REGISTRO', cart: 'CARTEIRINHA DE REGISTRO', grupo: 'BOT', data: 'REGISTRADO EM', id: 'REGISTRO' }
    : { membro: 'Membro nº', MEMBRO: 'MEMBRO Nº', entrou: 'entrou em', acabou: 'acabou de entrar em', topo: 'BEM-VINDO(A)', player: '&gt; NOVO PLAYER', cart: 'CARTEIRINHA DE MEMBRO', grupo: 'GRUPO', data: 'ENTROU EM', id: 'MEMBRO' };
  const nomeL = curto(limpar(nome, 40) || 'Novo membro', 22);
  const grupoL = curto(limpar(grupo, 60) || 'o grupo', 30);
  const num = String(numero || 1);

  /* ---------------- SÓ A FOTO ---------------- */
  if (n === 1) {
    return jpg(await fotoBase(foto, 640, nome));
  }
  if (n === 2) {
    const S = 720, A = 460;
    const bg = await desfocado(foto, S, S, nome);
    const anel = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f472b6"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs><circle cx="${S / 2}" cy="${S / 2}" r="${A / 2 + 16}" fill="url(#g)"/><circle cx="${S / 2}" cy="${S / 2}" r="${A / 2 + 6}" fill="#111"/></svg>`;
    const av = await recortar(await fotoBase(foto, A, nome), A);
    return jpg(await sharp(bg).composite([{ input: Buffer.from(anel) }, { input: av, left: (S - A) / 2, top: (S - A) / 2 }]).png().toBuffer());
  }
  if (n === 3) {
    const W = 720, H = 820, P = 560;
    const card = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="720"><rect x="0" y="0" width="620" height="720" rx="10" fill="#fdfdf8"/></svg>`;
    const av = await fotoBase(foto, P, nome);
    const pol = await sharp(Buffer.from(card)).composite([{ input: av, left: 30, top: 30 }]).png().toBuffer();
    const rot = await sharp(pol).rotate(-4, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const meta = await sharp(rot).metadata();
    const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2118"/><stop offset="1" stop-color="#47362a"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
    return jpg(await sharp(Buffer.from(bg)).composite([{ input: rot, left: Math.round((W - meta.width) / 2), top: Math.round((H - meta.height) / 2) }]).png().toBuffer());
  }
  if (n === 4) {
    const S = 720, A = 540, R = 60;
    const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs><filter id="f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="100%" height="100%" fill="#07070d"/>
<rect x="${(S - A) / 2 - 8}" y="${(S - A) / 2 - 8}" width="${A + 16}" height="${A + 16}" rx="${R + 8}" fill="none" stroke="#22d3ee" stroke-width="16" filter="url(#f)"/>
<rect x="${(S - A) / 2 - 8}" y="${(S - A) / 2 - 8}" width="${A + 16}" height="${A + 16}" rx="${R + 8}" fill="none" stroke="#a5f3fc" stroke-width="5"/></svg>`;
    const av = await recortar(await fotoBase(foto, A, nome), A, 'quadrado', R);
    return jpg(await sharp(Buffer.from(bg)).composite([{ input: av, left: (S - A) / 2, top: (S - A) / 2 }]).png().toBuffer());
  }
  if (n === 5) {
    const W = 720, H = 1280, A = 600;
    const bg = await desfocado(foto, W, H, nome, 0.35);
    const sombra = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><filter id="f"><feGaussianBlur stdDeviation="22"/></filter></defs><rect x="${(W - A) / 2}" y="${(H - A) / 2 + 18}" width="${A}" height="${A}" rx="40" fill="#000" opacity=".55" filter="url(#f)"/></svg>`;
    const av = await recortar(await fotoBase(foto, A, nome), A, 'quadrado', 40);
    return jpg(await sharp(bg).composite([{ input: Buffer.from(sombra) }, { input: av, left: (W - A) / 2, top: (H - A) / 2 }]).png().toBuffer());
  }

  /* ---------------- CARTÕES ---------------- */
  if (n === 6) {
    const W = 1000, H = 420, A = 230;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b0b0f"/><stop offset="1" stop-color="#5b0000"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/><circle cx="${W - 60}" cy="40" r="170" fill="#ff2a2a" opacity=".10"/>
<rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="28" fill="none" stroke="#ff2a2a" stroke-opacity=".55" stroke-width="3"/>
<circle cx="${70 + A / 2}" cy="${H / 2}" r="${A / 2 + 9}" fill="#ff2a2a"/>
<text x="360" y="128" font-family="${FONTE}" font-size="30" font-weight="700" fill="#ff2a2a" letter-spacing="6">${R.topo}</text>
<text x="360" y="200" font-family="${FONTE}" font-size="56" font-weight="800" fill="#fff">${esc(nomeL)}</text>
<text x="360" y="255" font-family="${FONTE}" font-size="26" fill="#fff" opacity=".85">${esc(grupoL)}</text>
<rect x="360" y="290" width="${270 + num.length * 18}" height="62" rx="31" fill="#ff2a2a" opacity=".18"/>
<text x="388" y="332" font-family="${FONTE}" font-size="30" font-weight="700" fill="#fff">${R.membro} ${esc(num)}</text></svg>`;
    const av = await recortar(await fotoBase(foto, A, nome, '#ff2a2a'), A);
    return jpg(await sharp(Buffer.from(svg)).composite([{ input: av, left: 70, top: Math.round(H / 2 - A / 2) }]).png().toBuffer());
  }
  if (n === 7) {
    const W = 1000, H = 560, A = 220, cx = 80;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5865f2"/><stop offset="1" stop-color="#eb459e"/></linearGradient></defs>
<rect width="100%" height="100%" fill="#1e1f22"/><rect width="${W}" height="230" fill="url(#g)"/>
<circle cx="${cx + A / 2}" cy="230" r="${A / 2 + 12}" fill="#1e1f22"/>
<text x="${cx}" y="410" font-family="${FONTE}" font-size="52" font-weight="800" fill="#fff">${esc(nomeL)}</text>
<text x="${cx}" y="455" font-family="${FONTE}" font-size="26" fill="#b5bac1">${R.acabou} ${esc(grupoL)}</text>
<rect x="${W - 300}" y="380" width="230" height="64" rx="16" fill="#2b2d31"/>
<text x="${W - 185}" y="422" font-family="${FONTE}" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">#${esc(num)}</text>
<text x="${W - 70}" y="${H - 30}" font-family="${FONTE}" font-size="20" fill="#80848e" text-anchor="end">${R.topo}</text></svg>`;
    const av = await recortar(await fotoBase(foto, A, nome, '#5865f2'), A);
    return jpg(await sharp(Buffer.from(svg)).composite([{ input: av, left: cx, top: 230 - A / 2 }, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><circle cx="30" cy="30" r="24" fill="#23a55a" stroke="#1e1f22" stroke-width="8"/></svg>`), left: cx + A / 2 + 48, top: 230 + 48 }]).png().toBuffer());
  }
  if (n === 8) {
    const W = 1000, H = 440, A = 250;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="100%" height="100%" fill="#f4f1ea"/>
<rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="6" fill="#ffffff"/>
<line x1="${120 + A}" y1="110" x2="${120 + A}" y2="${H - 110}" stroke="#e5e0d5" stroke-width="2"/>
<text x="${170 + A}" y="150" font-family="${FONTE}" font-size="22" fill="#9a8f7a" letter-spacing="8">${R.topo}</text>
<text x="${170 + A}" y="220" font-family="Georgia, DejaVu Serif, serif" font-size="56" fill="#1f1b16">${esc(nomeL)}</text>
<text x="${170 + A}" y="270" font-family="${FONTE}" font-size="24" fill="#6b6253">${esc(grupoL)}</text>
<text x="${170 + A}" y="330" font-family="${FONTE}" font-size="22" fill="#b0603c" letter-spacing="2">${R.MEMBRO} ${esc(num)}</text></svg>`;
    const av = await recortar(await fotoBase(foto, A, nome, '#b0603c'), A);
    return jpg(await sharp(Buffer.from(svg)).composite([{ input: av, left: 90, top: Math.round(H / 2 - A / 2) }]).png().toBuffer());
  }
  if (n === 9) {
    const W = 1000, H = 440, A = 240;
    let grade = '';
    for (let x = 0; x <= W; x += 40) grade += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#7c3aed" stroke-opacity=".18"/>`;
    for (let y = 0; y <= H; y += 40) grade += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#7c3aed" stroke-opacity=".18"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
<linearGradient id="t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#e879f9"/></linearGradient></defs>
<rect width="100%" height="100%" fill="#09051a"/>${grade}
<polygon points="${80 + A / 2},${H / 2 - A / 2 - 22} ${80 + A + 22},${H / 2} ${80 + A / 2},${H / 2 + A / 2 + 22} ${80 - 22},${H / 2}" fill="none" stroke="#e879f9" stroke-width="10" filter="url(#f)"/>
<circle cx="${80 + A / 2}" cy="${H / 2}" r="${A / 2 + 8}" fill="none" stroke="url(#t)" stroke-width="6"/>
<text x="380" y="140" font-family="${FONTE}" font-size="26" font-weight="700" fill="#22d3ee" letter-spacing="10">${R.player}</text>
<text x="380" y="215" font-family="${FONTE}" font-size="58" font-weight="800" fill="url(#t)">${esc(nomeL)}</text>
<text x="380" y="265" font-family="${FONTE}" font-size="24" fill="#c4b5fd">${R.entrou} ${esc(grupoL)}</text>
<rect x="380" y="300" width="${300 + num.length * 16}" height="56" fill="none" stroke="#22d3ee" stroke-width="2"/>
<text x="400" y="338" font-family="DejaVu Sans Mono, Consolas, monospace" font-size="26" fill="#22d3ee">ID://${R.id}_${esc(num)}</text></svg>`;
    const av = await recortar(await fotoBase(foto, A, nome, '#7c3aed'), A);
    return jpg(await sharp(Buffer.from(svg)).composite([{ input: av, left: 80, top: Math.round(H / 2 - A / 2) }]).png().toBuffer());
  }
  // 10 — carteirinha
  const W = 1000, H = 600, AW = 240, AH = 290;
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f766e"/><stop offset="1" stop-color="#134e4a"/></linearGradient></defs>
<rect width="100%" height="100%" fill="#d6d3cd"/>
<rect x="50" y="50" width="${W - 100}" height="${H - 100}" rx="30" fill="#fbfaf7"/>
<path d="M50 80 a30 30 0 0 1 30 -30 h${W - 160} a30 30 0 0 1 30 30 v70 h-${W - 100} z" fill="url(#g)"/>
<text x="90" y="118" font-family="${FONTE}" font-size="32" font-weight="800" fill="#fff" letter-spacing="3">${R.cart}</text>
<text x="${W - 90}" y="118" font-family="${FONTE}" font-size="26" font-weight="700" fill="#99f6e4" text-anchor="end">Nº ${esc(num)}</text>
<rect x="86" y="196" width="${AW + 8}" height="${AH + 8}" rx="14" fill="#e7e5e0"/>
<text x="380" y="230" font-family="${FONTE}" font-size="20" fill="#78716c" letter-spacing="3">NOME</text>
<text x="380" y="275" font-family="${FONTE}" font-size="42" font-weight="800" fill="#1c1917">${esc(nomeL)}</text>
<text x="380" y="330" font-family="${FONTE}" font-size="20" fill="#78716c" letter-spacing="3">${R.grupo}</text>
<text x="380" y="368" font-family="${FONTE}" font-size="28" font-weight="700" fill="#1c1917">${esc(grupoL)}</text>
<text x="380" y="423" font-family="${FONTE}" font-size="20" fill="#78716c" letter-spacing="3">${R.data}</text>
<text x="380" y="461" font-family="${FONTE}" font-size="28" font-weight="700" fill="#1c1917">${esc(hoje)}</text>
<g fill="#1c1917">${Array.from({ length: 34 }, (_, i) => `<rect x="${640 + i * 9}" y="430" width="${(i * 7) % 3 + 2}" height="60"/>`).join('')}</g>
<text x="${W - 90}" y="${H - 72}" font-family="${FONTE}" font-size="18" fill="#a8a29e" text-anchor="end">válida enquanto seguir as regras</text></svg>`;
  const ft = await sharp(await fotoBase(foto, AH, nome, '#0f766e')).resize(AW, AH, { fit: 'cover' }).png().toBuffer();
  const ftR = await sharp(ft).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${AW}" height="${AH}"><rect width="${AW}" height="${AH}" rx="10" fill="#fff"/></svg>`), blend: 'dest-in' }]).png().toBuffer();
  return jpg(await sharp(Buffer.from(svg)).composite([{ input: ftR, left: 90, top: 200 }]).png().toBuffer());
}

/** Folha com a prévia de vários modelos lado a lado (para o adm/dono escolher). */
export async function folhaModelosBV(ids, dados, titulo = '') {
  const cw = 520, ch = 420, pad = 30, cols = Math.min(3, ids.length), rows = Math.ceil(ids.length / cols);
  const W = cols * cw + (cols + 1) * pad, H = rows * (ch + 60 + pad) + pad + 90;
  const comps = [];
  let txt = `<text x="${W / 2}" y="60" font-family="${FONTE}" font-size="36" font-weight="800" fill="#fff" text-anchor="middle">${esc(titulo)}</text>`;
  for (let i = 0; i < ids.length; i++) {
    const n = ids[i], c = i % cols, r = Math.floor(i / cols);
    const x = pad + c * (cw + pad), y = 90 + pad + r * (ch + 60 + pad);
    const img = await gerarModeloBV(n, dados);
    comps.push({ input: await sharp(img).resize(cw, ch, { fit: 'contain', background: '#1f2937' }).toBuffer(), left: x, top: y });
    txt += `<text x="${x + cw / 2}" y="${y + ch + 42}" font-family="${FONTE}" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">${n} — ${esc(MODELOS_BV[n].nome)}</text>`;
  }
  return sharp({ create: { width: W, height: H, channels: 3, background: '#111827' } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${txt}</svg>`) }, ...comps])
    .jpeg({ quality: 85 }).toBuffer();
}
