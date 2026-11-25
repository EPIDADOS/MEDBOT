// "Os 5 Ps do POCUS": o ultrassom da beira do leito no estilo do vídeo da TC de crânio. O macete (praia, pulmão, pleura, poça e
// pericárdio) vira a barra de cima; cada P é um capítulo com clipes reais de ultrassom (Commons) num visor, quadro a quadro, e as
// marcações por cima. Tudo em função do tempo (window.seek(t)); os quadros dos clipes são trocados e decodificados antes da foto.
import { criarPalco, carregarMedbot } from '../../_personagem/web/medbot-3d.js';

const T = window.TEMPOS;
const FPS = T.fps;
window.FPS = FPS;
window.DURATION = T.duracao;
const $ = (id) => document.getElementById(id);
const LIMA = '#C1FF72', ALERTA = '#FF4D57';

// ---------------------------------------------------------------- tempo e curvas
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const sai = (u) => { u = clamp(u); return 1 - Math.pow(1 - u, 3); };
const vaivem = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const back = (u, s = 2.2) => { u = clamp(u); const c = s + 1; return 1 + c * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2); };
const pop = (t, t0, d = 0.38) => (t < t0 ? 0 : back((t - t0) / d));
const surge = (t, t0, d = 0.25) => sai((t - t0) / d);
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const F = (c) => { const f = T.falas.find((x) => x.cena === c); if (!f) throw new Error('fala ' + c); return f; };
function PAL(cena, txt, n = 1) {
  const i = T.falas.indexOf(F(cena));
  const ws = T.palavras.filter((p) => p.fala === i);
  const exatas = ws.filter((p) => norm(p.texto) === norm(txt));
  const w = exatas[n - 1] || ws.filter((p) => norm(p.texto).startsWith(norm(txt)))[n - 1];
  if (!w) throw new Error(`palavra ${txt} em ${cena}`);
  return w.ini;
}
const C = {};
T.falas.forEach((f, i) => { C[f.cena] = [f.ini, (T.falas[i + 1] || { ini: T.duracao + 2 }).ini]; });

// ---------------------------------------------------------------- ícones (Lucide)
const SVG = (d, w = 2.6) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = {
  check: SVG('<path d="M20 6 9 17l-5-5"/>', 3.2),
  alerta: SVG('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  salvar: SVG('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>'),
  seguir: SVG('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>'),
  setas: SVG('<path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/>'),
  pausa: SVG('<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>'),
};

// ---------------------------------------------------------------- capítulos: cena, letra, nome, o que acha, fim
const CAPS = [
  ['praia', 'P', 'Praia', 'pneumotórax', () => C.pulmao[0]],
  ['pulmao', 'P', 'Pulmão', 'linhas B', () => C.pleura[0]],
  ['pleura', 'P', 'Pleura', 'derrame pleural', () => C.poca[0]],
  ['poca', 'P', 'Poça', 'FAST', () => C.pericardio[0]],
  ['pericardio', 'P', 'Pericárdio', 'tamponamento', () => C.resumo[0]],
];
const FIM = (c) => CAPS.find((k) => k[0] === c)[4]();
const CARTAO = 0.78;

// ---------------------------------------------------------------- clipes (assets/clipes/tamanhos.json: largura, altura, quadros)
const CLIPES = window.CLIPES_TAM || {};
const CRED = { pedra: 'Nevit Dilmen · CC BY-SA 3.0', praia: 'Tinss · CC BY-SA 4.0', desliza: 'Gillman e Kirkpatrick · CC BY 2.0', naodesliza: 'Gillman et al. · CC BY 2.0',
  ponto: 'Gillman et al. · CC BY 2.0', blinhas: 'Gargani · CC BY 2.0', pleural: 'Gillman et al. · CC BY 2.0', fast: 'Gillman et al. · CC BY 2.0',
  pericardio: 'CardioNetworks · CC BY-SA 3.0' };
const quadroSrc = (nome, k) => `../assets/clipes/${nome}/f${String(k + 1).padStart(3, '0')}.jpg`;
const espera = [];
// põe o quadro do clipe que corresponde a t no <img> e devolve a função que leva (x, y) da imagem (0 a 1) para a tela
function poeClipe(id, R, nome, v, t, t0) {
  const el = $(id), im = $(id + '-img');
  el.style.left = R.x + 'px'; el.style.top = R.y + 'px'; el.style.width = R.w + 'px'; el.style.height = R.h + 'px';
  const [iw, ih, n] = CLIPES[nome];
  const s = (v.cabe ? Math.min : Math.max)(R.w / iw, R.h / ih) * (v.z || 1);
  const fx = v.fx ?? 0.5, fy = v.fy ?? 0.5;
  im.style.width = iw * s + 'px'; im.style.height = ih * s + 'px';
  im.style.left = (R.w / 2 - fx * iw * s) + 'px'; im.style.top = (R.h / 2 - fy * ih * s) + 'px';
  // um trecho em vaivém (v.seg = [primeiro, último quadro]) ou o clipe inteiro em laço
  const q = Math.floor(Math.max(0, t - t0) * 30);
  let k = n > 1 ? q % n : 0;
  if (v.seg && n > 1) { const [a, b] = v.seg, L = b - a, r = q % (2 * L); k = Math.min(n - 1, a + (r <= L ? r : 2 * L - r)); }
  const src = quadroSrc(nome, k);
  if (im.dataset.src !== src) { im.dataset.src = src; im.src = src; espera.push(im.decode().catch(() => {})); }
  const cr = $(id + '-cred'); if (cr) cr.textContent = CRED[nome];
  const P = (nx, ny) => [R.x + R.w / 2 + (nx - fx) * iw * s, R.y + R.h / 2 + (ny - fy) * ih * s];
  P.esc = iw * s; P.escY = ih * s;
  return P;
}
const visorHTML = (id) => `<div class="visor" id="${id}"><img class="quadro" id="${id}-img" alt="">
  <div class="pacs tl" id="${id}-tl"></div><div class="pacs tr" id="${id}-tr"></div><div class="credito claro" id="${id}-cred"></div></div>`;

// ---------------------------------------------------------------- desenho sobre a imagem
function curva(pts, fechada = true) {
  const n = pts.length;
  const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let d = `M${f(pts[0])}`;
  const N = fechada ? n : n - 1;
  for (let i = 0; i < N; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % n];
    const p0 = !fechada && i === 0 ? p1 : pts[(i - 1 + n) % n];
    const p3 = !fechada && i + 2 >= n ? p2 : pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1)} ${f(c2)} ${f(p2)}`;
  }
  return fechada ? d + ' Z' : d;
}
function contorno(P, pts, u, { cor = LIMA, fechada = true, larg = 6, preenche = 0.16, classe = 'neon', tracejado = '' } = {}) {
  if (u <= 0) return '';
  const d = curva(pts.map(([x, y]) => P(x, y)), fechada);
  const dash = u < 1 ? `pathLength="1" stroke-dasharray="${u.toFixed(3)} 1.01"` : tracejado ? `stroke-dasharray="${tracejado}"` : '';
  const fill = fechada && preenche > 0 ? `<path d="${d}" fill="${cor}" opacity="${(preenche * clamp((u - 0.7) / 0.3)).toFixed(3)}"/>` : '';
  return `${fill}<path d="${d}" fill="none" stroke="${cor}" stroke-width="${larg}" stroke-linecap="round" stroke-linejoin="round" ${dash} class="${classe}"/>`;
}
const anel = (x, y, r, t, t0, cor = LIMA) => {
  if (t < t0) return '';
  const e = back((t - t0) / 0.35), ritmo = ((t - t0) * 1.6) % 1;
  return `<circle cx="${x}" cy="${y}" r="${r * e}" fill="none" stroke="${cor}" stroke-width="6" class="${cor === LIMA ? 'neon' : 'neon-v'}"/>
    <circle cx="${x}" cy="${y}" r="${r * (1 + 0.6 * ritmo)}" fill="none" stroke="${cor}" stroke-width="4" opacity="${(1 - ritmo) * 0.8}"/>`;
};
const linha = (a, b, u, cor = '#fff', larg = 5, dash = '') => {
  if (u <= 0) return '';
  const x2 = lerp(a[0], b[0], clamp(u)), y2 = lerp(a[1], b[1], clamp(u));
  return `<line x1="${a[0]}" y1="${a[1]}" x2="${x2}" y2="${y2}" stroke="${cor}" stroke-width="${larg}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''} style="filter:drop-shadow(0 0 6px ${cor})"/>`;
};
const chip = (t, t0, html, x, y, { cls = '', tam = 34, ate = 99, rot = 0 } = {}) => {
  if (t < t0 || t > ate + 0.25) return '';
  return `<div class="chip ${cls}" style="left:${x}px;top:${y}px;font-size:${tam}px;padding:${Math.round(tam * 0.36)}px ${Math.round(tam * 0.56)}px;transform:translate(-50%,-50%) scale(${pop(t, t0) * (1 - surge(t, ate, 0.2))}) rotate(${rot}deg)">${html}</div>`;
};
const ptag = (t, t0, html, x, y, { cls = '', ate = 99, tam = 30 } = {}) => {
  if (t < t0 || t > ate + 0.25) return '';
  return `<div class="ptag ${cls}" style="left:${x}px;top:${y}px;font-size:${tam}px;transform:translate(-50%,-50%) scale(${pop(t, t0, 0.3) * (1 - surge(t, ate, 0.2))})">${html}</div>`;
};
const selo = (t, t0, a, b, x, y, { alerta = false, tam = 60, ate = 99, rot = -3 } = {}) => {
  if (t < t0 || t > ate + 0.3) return '';
  const s = pop(t, t0, 0.36) * (1 - surge(t, ate, 0.25));
  return `<div class="selo ${alerta ? 'alerta' : ''}" style="left:${x}px;top:${y}px;font-size:${tam}px;padding:${Math.round(tam * 0.26)}px ${Math.round(tam * 0.44)}px;transform:translate(-50%,-50%) scale(${s}) rotate(${rot}deg)">
    <span style="display:block;line-height:1.02">${a}</span>${b ? `<small style="display:block;font:700 .56em/1.2 var(--texto);opacity:.88;margin-top:6px;letter-spacing:0">${b}</small>` : ''}</div>`;
};
// setinhas que andam para os dois lados ao longo de uma linha (o deslizamento da pleura)
const formigas = (a, b, t, t0, cor = LIMA) => {
  if (t < t0) return '';
  const e = clamp((t - t0) / 0.3), out = [];
  for (let i = 0; i < 6; i++) {
    const u = (i + 0.5) / 6 + 0.035 * Math.sin((t - t0) * 7 + i);
    const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u) - 26;
    const dir = Math.sin((t - t0) * 7 + i) > 0 ? 1 : -1;
    out.push(`<path d="M${x - 12 * dir} ${y - 9} L${x} ${y} L${x - 12 * dir} ${y + 9}" fill="none" stroke="${cor}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="${e}" class="neon"/>`);
  }
  return out.join('');
};

// ---------------------------------------------------------------- tempos-chave
const W = {
  emergencia: PAL('gancho', 'emergencia'), cinco: PAL('gancho', 'cinco'), pneumo: PAL('gancho', 'pneumotorax'), sangue: PAL('gancho', 'hemoperitonio'), tampona: PAL('gancho', 'tamponamento'),
  lista: ['praia', 'pulmao', 'pleura', 'poca', 'pericardio'].map((w) => PAL('gancho-2', w)),
  liquido: PAL('regra', 'liquido'), preto: PAL('regra', 'preto'), osso: PAL('regra', 'osso'), pedra: PAL('regra', 'calculo'), brancos: PAL('regra', 'hiperecoicos'), sombra: PAL('regra', 'sombra'),
  desliza: PAL('praia', 'desliza'), pleura: PAL('praia', 'pleural'), brilha: PAL('praia', 'desliza'), modo: PAL('praia', 'modo'), mar: PAL('praia', 'mar'), areia: PAL('praia', 'areia'),
  parou: PAL('pneumo', 'sem'), pnx: PAL('pneumo', 'pneumotorax'), ponto: PAL('pneumo', 'ponto'), volta: PAL('pneumo', 'reaparece'), confirma: PAL('pneumo', 'praticamente'),
  linhasB: PAL('pulmao', 'linhas'), descem: PAL('pulmao', 'saem'), tres: PAL('pulmao', 'tres'), costelas: PAL('pulmao', 'intercostal'), agua: PAL('pulmao', 'sindrome'),
  diafragma: PAL('pleura', 'diafragma'), pretaP: PAL('pleura', 'anecoica'), derrameP: PAL('pleura', 'diafragma'), atelect: PAL('pleura', 'atelectasiado'), aguaviva: PAL('pleura', 'agua'),
  figado: PAL('poca', 'figado'), rim: PAL('poca', 'rim'), morison: PAL('poca', 'morison'), fast: PAL('poca', 'fast'), anecoicaF: PAL('poca', 'anecoica'), livre: PAL('poca', 'livre'), hemo: PAL('poca', 'hemoperitonio'),
  faixa: PAL('pericardio', 'faixa'), coracao: PAL('pericardio', 'coracao'), derrame: PAL('pericardio', 'derrame'), ventriculo: PAL('pericardio', 'ventriculo'),
  colaba: PAL('pericardio', 'indica'), tamponamento: PAL('pericardio', 'tamponamento'),
  rs: ['praia', 'pulmao', 'pleura', 'poca', 'pericardio'].map((w) => PAL('resumo', w)), pocus: PAL('resumo', 'cinco'),
};
const T_VOA = C.praia[0] - 0.12;

// ---------------------------------------------------------------- marcações (0 a 1 na imagem de cada clipe; conferidas nas grades)
const M = {
  pedra: { bile: [0.39, 0.42], pedra: [0.575, 0.51], sombra: [[0.555, 0.63], [0.555, 0.85]] },
  naodesliza: { pleura: [[0.38, 0.515], [0.71, 0.555]], v: { fy: 0.5 } },
  ponto: { ponto: [0.44, 0.375], parado: [0.2, 0.6], anda: [0.8, 0.6], v: { cabe: true } },
  pleural: { diafragma: [[0.765, 0.26], [0.74, 0.36], [0.72, 0.47], [0.708, 0.58], [0.712, 0.68]],
    derrame: [[0.61, 0.22], [0.72, 0.25], [0.7, 0.45], [0.69, 0.63], [0.63, 0.67], [0.6, 0.45]], pulmao: [0.42, 0.55], rotDer: [0.66, 0.15],
    pulmaoC: [[0.47, 0.27], [0.6, 0.25], [0.6, 0.45], [0.57, 0.63], [0.5, 0.8], [0.34, 0.84], [0.27, 0.7], [0.36, 0.5]], v: { fy: 0.47, seg: [0, 30] } },
  fast: { figado: [0.6, 0.27], rim: [0.6, 0.58], rotMor: [0.58, 0.34],
    faixa: [[0.43, 0.415], [0.5, 0.398], [0.6, 0.403], [0.68, 0.418], [0.73, 0.445], [0.66, 0.437], [0.56, 0.433], [0.47, 0.44]], v: { cabe: true, z: 1.35, fy: 0.45, seg: [0, 20] } },
  pericardio: { faixa: [[0.83, 0.53], [0.786, 0.705], [0.665, 0.833], [0.5, 0.88], [0.335, 0.833], [0.214, 0.705], [0.17, 0.53], [0.214, 0.355], [0.335, 0.227], [0.5, 0.18], [0.665, 0.227], [0.786, 0.355]],
    vd: [0.5, 0.36], rotulo: [0.5, 0.21], v: { fy: 0.52 } },
  praia: { mar: [0.5, 0.13], areia: [0.5, 0.66] },
  desliza: { pleura: [[0.1, 0.52], [0.82, 0.5]], v: { fy: 0.5 } },
  blinhas: { linhas: [[0.375, 0.16], [0.46, 0.14], [0.535, 0.16]], fundo: 0.98, v: { fy: 0.5, seg: [44, 56] } },
};

// ---------------------------------------------------------------- o que o visor mostra em cada instante
const GRANDE = { x: 60, y: 285, w: 960, h: 700 };
function midia(t) {
  const r = midia0(t);
  return r && CLIPES[r.nome] ? r : null;
}
function midia0(t) {
  if (t >= 0.2 && t < C['gancho-2'][0] - 0.05) return { nome: 'pericardio', t0: 0.2, R: { x: 190, y: 400, w: 700, h: 525 }, v: { z: 1 }, tl: 'POCUS', tr: 'emergência', ent: 0.2, sai: C['gancho-2'][0] - 0.25 };
  if (t >= C.regra[0] - 0.05 && t < C.praia[0]) return { nome: 'pedra', t0: C.regra[0], R: { x: 60, y: 290, w: 960, h: 600 }, v: { z: 1 }, tl: 'vesícula', tr: 'modo <b>B</b>', ent: C.regra[0], sai: C.praia[0] - 0.2 };
  const q = (c) => C[c][0] + CARTAO - 0.05;
  if (t >= q('praia') && t < W.modo) return { nome: 'desliza', t0: q('praia'), R: GRANDE, v: M.desliza?.v || {}, tl: 'pulmão', tr: 'modo <b>B</b>', ent: q('praia'), sai: 99 };
  if (t >= W.modo && t < C.pneumo[0]) return { nome: 'praia', t0: W.modo, R: GRANDE, v: { fx: 0.5, fy: 0.5 }, tl: 'pulmão', tr: 'modo <b>M</b>', ent: W.modo, sai: 99, troca: true };
  if (t >= C.pneumo[0] && t < W.ponto) return { nome: 'naodesliza', t0: C.pneumo[0], R: GRANDE, v: M.naodesliza?.v || {}, tl: 'pulmão', tr: 'modo <b>B</b>', ent: C.pneumo[0], sai: 99, troca: true };
  if (t >= W.ponto && t < C.pulmao[0]) return { nome: 'ponto', t0: W.ponto, R: GRANDE, v: M.ponto?.v || {}, tl: 'pulmão', tr: 'modo <b>B</b>', ent: W.ponto, sai: C.pulmao[0] - 0.2, troca: true };
  if (t >= q('pulmao') && t < C.pleura[0]) return { nome: 'blinhas', t0: q('pulmao'), R: GRANDE, v: M.blinhas?.v || {}, tl: 'pulmão', tr: 'modo <b>B</b>', ent: q('pulmao'), sai: C.pleura[0] - 0.2 };
  if (t >= q('pleura') && t < C.poca[0] + 0.4) return { nome: 'pleural', t0: q('pleura'), R: GRANDE, v: M.pleural?.v || {}, tl: 'tórax', tr: 'modo <b>B</b>', ent: q('pleura'), sai: C.poca[0] + 0.05 };
  if (t >= q('poca') && t < C.pericardio[0]) return { nome: 'fast', t0: q('poca'), R: GRANDE, v: M.fast?.v || {}, tl: 'FAST · janela hepatorrenal', tr: 'modo <b>B</b>', ent: q('poca'), sai: C.pericardio[0] - 0.2 };
  if (t >= q('pericardio') && t < C.resumo[0]) return { nome: 'pericardio', t0: q('pericardio'), R: GRANDE, v: M.pericardio?.v || {}, tl: 'coração', tr: 'modo <b>B</b>', ent: q('pericardio'), sai: C.resumo[0] - 0.2 };
  return null;
}

// ---------------------------------------------------------------- cenas
$('cenas').innerHTML = `<div class="titulo" id="g-tit" style="top:150px"><span>POCUS na</span><span><b>emergência</b></span></div>
  <div class="titulo" id="g-tit2" style="top:150px;font-size:84px"><span>Os <b>5 Ps</b> do POCUS</span></div>
  <div class="cena" id="c-lista">${CAPS.map(([, l, nome, sub], i) => `<div class="lista" id="ls-${i}"><div class="letra">${l}</div><div><div class="nome">${nome}</div><div class="sub">${sub}</div></div></div>`).join('')}</div>
  ${visorHTML('v1')}
  <div class="cena" id="c-regua"><div class="regua" id="regua" style="top:940px"></div></div>
  <div class="cena" id="c-res">${CAPS.map(([, l, nome, sub], i) => `<div class="lista" id="rs-${i}"><div class="letra" style="width:90px;height:90px;font-size:60px">${l}</div><div><div class="nome" style="font-size:62px">${nome}</div><div class="sub" style="font-size:26px">${sub}</div></div></div>`).join('')}
    ${CAPS.map((_, i) => `<div class="mini" id="mn-${i}"><img id="mn-${i}-img" alt=""></div>`).join('')}</div>
  <svg id="palco-svg" width="1080" height="1920" style="position:absolute;left:0;top:0;overflow:visible"></svg><div id="cam"></div>
  <div class="cena" id="c-fim"><div class="botao lima" id="b-salva"><span>${IC.salvar}</span>Salva pro plantão</div><div class="botao" id="b-segue"><span>${IC.seguir}</span>Segue @omedbot</div>
  <div id="marca">@omedbot</div></div>`;
$('hud').innerHTML = CAPS.map(([, l, nome]) => `<div><span><em>${l}</em> ${nome}</span><b><i></i></b></div>`).join('');

// ---------------------------------------------------------------- legenda
const blocos = [];
T.falas.forEach((f, i) => {
  const ws = T.palavras.filter((p) => p.fala === i);
  let k = 0;
  while (k < ws.length) {
    let n = Math.min(3, ws.length - k);
    if (ws.length - k - n === 1) n += 1;
    blocos.push({ fala: f, ws: ws.slice(k, k + n) });
    k += n;
  }
});
const legendaY = (c) => (c === 'fim' ? 300 : 1150);

// ---------------------------------------------------------------- Medbot
const LE = 225, LD = 855, YB = 1450, SB = 380;
const ORDEM = ['regra', ...CAPS.map(([c]) => c)];
const PULOS = ORDEM.map((c, i) => [C[c][0] + (c === 'regra' ? 0 : CARTAO), i % 2 ? LE : LD]);
PULOS.push([C.resumo[0], 540]);
const KB = [[0, 540, 2500, 460], [0.45, 540, 1480, 460]];
{
  let ant = KB[1];
  for (const [t0, x] of PULOS) {
    const y = x === 540 ? 1460 : YB, s = x === 540 ? 400 : SB;
    KB.push([t0, ant[1], ant[2], ant[3]]);
    ant = [t0 + 0.45, x, y, s];
    KB.push(ant);
  }
  KB.push([C.fim[0] - 0.05, ant[1], ant[2], ant[3]], [C.fim[0] + 0.5, 540, 1110, 700]);
}
function trajeto(t) {
  if (t <= KB[0][0]) return { x: KB[0][1], y: KB[0][2], tam: KB[0][3], u: 0, dir: 0, pousou: 99 };
  for (let i = 0; i < KB.length - 1; i++) {
    const [t0, x0, y0, s0] = KB[i], [t1, x1, y1, s1] = KB[i + 1];
    if (t >= t0 && t <= t1) {
      const parado = x0 === x1 && y0 === y1 && s0 === s1;
      const u = parado ? 0 : vaivem((t - t0) / (t1 - t0));
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const salto = parado || i === 0 ? 0 : Math.min(300, dist * 0.42 + 90) * Math.sin(Math.PI * clamp((t - t0) / (t1 - t0)));
      let pousou = 99;
      for (let j = i; j >= 1; j--) { const a = KB[j - 1], b = KB[j]; if (!(a[1] === b[1] && a[2] === b[2] && a[3] === b[3]) && b[0] <= t) { pousou = t - b[0]; break; } }
      return { x: lerp(x0, x1, u), y: lerp(y0, y1, u) - salto, tam: lerp(s0, s1, u), u: parado ? 0 : clamp((t - t0) / (t1 - t0)), dir: Math.sign(x1 - x0), pousou, movendo: !parado };
    }
  }
  const k = KB[KB.length - 1];
  return { x: k[1], y: k[2], tam: k[3], u: 0, dir: 0, pousou: t - k[0] };
}
const SALTOS = KB.slice(1).map((k, i) => [KB[i], k]).filter(([a, b]) => !(a[1] === b[1] && a[2] === b[2] && a[3] === b[3])).map(([a]) => a[0]);
const CARA = { gancho: 'surpreso', 'gancho-2': 'feliz', regra: 'normal', praia: 'normal', pneumo: 'preocupado', pulmao: 'desconfiado', pleura: 'normal', poca: 'preocupado', pericardio: 'surpreso', resumo: 'feliz', fim: 'feliz' };
const OLHOS = { normal: [1, 1, 0], feliz: [0, 0, 1], surpreso: [1.28, 0.5, 0], desconfiado: [1.05, 0.42, 0], preocupado: [0.92, 0.8, 0] };
function caraEm(t) {
  let ant = 'normal', atual = 'normal', t0 = 0;
  for (const f of T.falas) { if (f.ini - 0.08 <= t) { ant = atual; atual = CARA[f.cena] || 'normal'; t0 = f.ini - 0.08; } }
  const u = clamp((t - t0) / 0.14); const uu = u * u * (3 - 2 * u);
  return OLHOS[ant].map((v, i) => lerp(v, OLHOS[atual][i], uu)).concat([atual]);
}
const PISCADAS = [];
for (let p = 1.1; p < T.duracao; p += 2.3 + ((p * 7.3) % 1.1)) PISCADAS.push(p);
const pisca = (t, cara) => {
  if (cara === 'feliz' || cara === 'surpreso') return 1;
  for (const p of PISCADAS) { const d = t - p; if (d >= -0.06 && d <= 0.14) return d < 0 ? 0.5 : d < 0.05 ? 0.08 : 0.08 + 0.92 * (d - 0.05) / 0.09; }
  return 1;
};

// ---------------------------------------------------------------- palco 3D e fundo
const palco = criarPalco($('bot'));
let bot = null;
const fundo = $('fundo').getContext('2d');
const ruidos = [0, 1, 2].map((s) => {
  const c = document.createElement('canvas'); c.width = 540; c.height = 960;
  const g = c.getContext('2d'); const im = g.createImageData(540, 960);
  let r = 12345 + s * 999;
  for (let i = 0; i < im.data.length; i += 4) { r = (r * 1103515245 + 12345) & 0x7fffffff; const v = r % 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
});
function desenhaFundo(t) {
  const g = fundo;
  const grad = g.createRadialGradient(540, 820, 60, 540, 900, 1250);
  grad.addColorStop(0, '#15323C'); grad.addColorStop(0.55, '#0E222A'); grad.addColorStop(1, '#081217');
  g.fillStyle = grad; g.fillRect(0, 0, 1080, 1920);
  const off = (t * 22) % 54;
  g.lineWidth = 1; g.strokeStyle = 'rgba(193,255,114,0.04)';
  for (let x = -54 + off; x < 1080; x += 54) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1920); g.stroke(); }
  for (let y = -54 + off; y < 1920; y += 54) { g.beginPath(); g.moveTo(0, y); g.lineTo(1080, y); g.stroke(); }
  g.save(); g.globalAlpha = 0.07; g.globalCompositeOperation = 'overlay';
  g.drawImage(ruidos[Math.floor(t * FPS) % 3], 0, 0, 1080, 1920); g.restore();
  const v = g.createRadialGradient(540, 960, 500, 540, 960, 1250);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = v; g.fillRect(0, 0, 1080, 1920);
}

// ---------------------------------------------------------------- deixas de som
const CUES = [];
const som = (t, s, v = 1) => CUES.push({ t: Math.max(0, +t.toFixed(3)), som: s, vol: v });
som(0.0, 'whoosh', 0.5); som(0.2, 'scanner', 0.35); som(W.pneumo, 'alarme', 0.25); som(W.sangue, 'pop', 0.45); som(W.tampona, 'pop', 0.45);
som(C['gancho-2'][0] - 0.05, 'whoosh', 0.5); W.lista.forEach((x) => som(x, 'clique', 0.45));
som(C.regra[0] - 0.05, 'whoosh', 0.5); som(W.preto, 'pop', 0.45); som(W.pedra, 'clique', 0.4); som(W.brancos, 'pop', 0.45); som(W.sombra, 'zoom', 0.4); som(T_VOA, 'whoosh', 0.45);
CAPS.forEach((_, k) => som(T_VOA + 0.35 + k * 0.05, 'clique', 0.25));
for (const [c] of CAPS) { som(C[c][0] - 0.06, 'whoosh', 0.6); som(C[c][0] + 0.02, 'tum', 0.55); som(C[c][0] + 0.72, 'whoosh', 0.35); som(C[c][0] + CARTAO, 'scanner', 0.3); }
som(W.pleura, 'clique', 0.4); som(W.modo - 0.04, 'whoosh', 0.4); som(W.mar, 'pop', 0.4); som(W.areia, 'pop', 0.4);
som(C.pneumo[0] - 0.04, 'whoosh', 0.4); som(W.pnx, 'alarme', 0.3); som(W.ponto - 0.04, 'whoosh', 0.4); som(W.volta, 'clique', 0.4); som(W.confirma, 'ding', 0.45);
som(W.linhasB, 'clique', 0.4); som(W.descem, 'zoom', 0.35); [0, 1, 2].forEach((i) => som(W.tres + i * 0.22, 'clique', 0.4)); som(W.agua, 'alarme', 0.28);
som(W.diafragma, 'clique', 0.4); som(W.pretaP, 'zoom', 0.35); som(W.diafragma + 0.5, 'ding', 0.4);
som(W.morison, 'pop', 0.4); som(W.anecoicaF, 'zoom', 0.4); som(W.figado, 'pop', 0.4); som(W.rim, 'pop', 0.4); som(W.livre, 'alarme', 0.3); som(W.hemo, 'pop', 0.4);
som(W.atelect, 'zoom', 0.35); som(W.aguaviva, 'ding', 0.45);
som(W.faixa, 'zoom', 0.4); som(W.derrame, 'ding', 0.4); som(W.ventriculo, 'clique', 0.4); som(W.tamponamento, 'alarme', 0.3);
som(C.resumo[0] - 0.06, 'whoosh', 0.55); W.rs.forEach((x) => som(x, 'ding', 0.4)); som(W.pocus, 'pop', 0.5);
for (const s of SALTOS) if (s > 0.5) som(s + 0.02, 'boing', 0.32);
som(C.fim[0] - 1.1, 'riser', 0.45); som(PAL('fim', 'salva'), 'ding', 0.6); som(PAL('fim', 'segue'), 'pop', 0.6);
CUES.sort((a, b) => a.t - b.t);
window.CUES = CUES;

// ---------------------------------------------------------------- marcações de cada clipe
function marcas(t, nome, P, R, quer, ef) {
  let s = '', h = '';
  const base = R.y + R.h;
  const m = M[nome] || {};
  if (nome === 'pedra') {
    const bile = P(...(m.bile || [0.4, 0.4])), pedra = P(...(m.pedra || [0.5, 0.5])), sombra = m.sombra || [[0.5, 0.6], [0.5, 0.95]];
    s += anel(bile[0], bile[1], 56, t, W.preto);
    h += ptag(t, W.preto + 0.1, 'líquido: anecoico', bile[0], bile[1] - 90, { tam: 30 });
    s += anel(pedra[0], pedra[1], 42, t, W.pedra);
    h += ptag(t, W.pedra + 0.1, 'cálculo: hiperecoico', pedra[0] + 170, pedra[1] - 40, { tam: 30 });
    if (t >= W.sombra) s += linha(P(...sombra[0]), P(...sombra[1]), clamp((t - W.sombra) / 0.5), ALERTA, 8, '14 10');
    h += ptag(t, W.sombra + 0.3, 'sombra acústica', P(...sombra[1])[0], P(...sombra[1])[1] - 40, { cls: 'alerta', tam: 28 });
    quer(t >= W.sombra ? P(...sombra[1]) : t >= W.pedra ? pedra : t >= W.preto ? bile : P(0.5, 0.5));
  } else if (nome === 'desliza') {
    const a = P(...(m.pleura?.[0] || [0.2, 0.4])), b = P(...(m.pleura?.[1] || [0.8, 0.4]));
    s += linha(a, b, clamp((t - W.pleura) / 0.5), LIMA, 7);
    h += ptag(t, W.pleura + 0.1, 'linha pleural', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 70, { cls: 'escura', tam: 30 });
    s += formigas(a, b, t, W.brilha);
    h += chip(t, W.desliza + 0.3, `${IC.setas} deslizamento pleural`, 540, R.y + 80, { tam: 34 });
    quer(t >= W.pleura ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : P(0.5, 0.45));
  } else if (nome === 'praia') {
    const mar = P(...(m.mar || [0.5, 0.15])), areia = P(...(m.areia || [0.5, 0.7]));
    h += ptag(t, W.mar, 'mar: parede torácica', mar[0], mar[1], { tam: 32 });
    h += ptag(t, W.areia, 'areia: pulmão deslizando', areia[0], areia[1], { tam: 32 });
    h += selo(t, W.areia + 0.5, 'sinal da praia', 'deslizamento presente', 540, base - 70, { tam: 60 });
    quer(t >= W.areia + 0.5 ? [540, base - 70] : t >= W.areia ? areia : t >= W.mar ? mar : P(0.5, 0.4));
  } else if (nome === 'naodesliza') {
    const a = P(...(m.pleura?.[0] || [0.2, 0.4])), b = P(...(m.pleura?.[1] || [0.8, 0.4]));
    s += linha(a, b, clamp((t - C.pneumo[0] - 0.2) / 0.5), ALERTA, 7);
    h += chip(t, W.parou, `${IC.pausa} sem deslizamento`, 540, R.y + 80, { cls: 'alerta', tam: 36 });
    h += selo(t, W.pnx, 'pneumotórax?', '', 540, base - 70, { alerta: true, tam: 70 });
    quer(t >= W.pnx ? [540, base - 70] : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  } else if (nome === 'ponto') {
    const pp = P(...(m.ponto || [0.5, 0.4]));
    s += anel(pp[0], pp[1], 60, t, W.ponto + 0.2);
    h += ptag(t, PAL('pneumo', 'onde'), 'sem deslizamento', P(...m.parado)[0] - 30, P(...m.parado)[1], { cls: 'alerta', tam: 24 });
    h += ptag(t, W.volta, `${IC.setas} deslizamento`, P(...m.anda)[0] + 30, P(...m.anda)[1], { tam: 24 });
    h += ptag(t, W.ponto + 0.3, 'ponto pulmonar', pp[0], pp[1] - 100, { tam: 32 });
    h += selo(t, W.confirma, 'praticamente patognomônico', '', 540, base - 70, { alerta: true, tam: 50 });
    quer(t >= W.confirma ? [540, base - 70] : pp);
  } else if (nome === 'blinhas') {
    const linhas = m.linhas || [[0.35, 0.3], [0.5, 0.3], [0.65, 0.3]];
    const fundoY = m.fundo || 0.95;
    linhas.forEach(([x, y], i) => {
      const a = P(x, y), b = P(x, fundoY);
      s += linha(a, b, clamp((t - W.descem - i * 0.12) / 0.7), LIMA, 6, '18 10');
      if (t >= W.tres + i * 0.22) h += `<div class="ptag" style="left:${a[0]}px;top:${a[1] - 50}px;font-size:34px;transform:translate(-50%,-50%) scale(${pop(t, W.tres + i * 0.22, 0.3)})">${i + 1}</div>`;
    });
    h += ptag(t, W.linhasB + 0.1, 'linhas B', 540, R.y + 70, { tam: 34, ate: W.tres - 0.1 });
    h += selo(t, W.agua, 'síndrome intersticial', '3 ou mais linhas B por espaço', 540, base - 70, { alerta: true, tam: 64 });
    const k = linhas.filter((_, i) => t >= W.tres + i * 0.22).length - 1;
    quer(t >= W.agua ? [540, base - 70] : k >= 0 ? P(...linhas[k]) : t >= W.descem ? P(linhas[0][0], 0.6) : P(0.5, 0.35));
  } else if (nome === 'pleural') {
    const dia = m.diafragma || [[0.3, 0.6], [0.5, 0.55], [0.7, 0.6]];
    const der = m.derrame || [[0.4, 0.3], [0.6, 0.3], [0.6, 0.5], [0.4, 0.5]];
    s += contorno(P, der, clamp((t - W.pretaP) / 0.7), { cor: ALERTA, classe: 'neon-v', preenche: 0.2 });
    h += ptag(t, W.pretaP + 0.15, 'coleção anecoica', P(...m.rotDer)[0], P(...m.rotDer)[1], { cls: 'alerta', tam: 28, ate: W.atelect - 0.1 });
    s += contorno(P, dia, clamp((t - W.diafragma) / 0.6), { fechada: false, larg: 7 });
    h += ptag(t, W.diafragma + 0.15, 'diafragma', P(...dia[0])[0] + 120, P(...dia[0])[1] + 20, { cls: 'escura', tam: 30 });
    h += selo(t, W.diafragma + 0.5, 'derrame pleural', '', 540, base - 70, { alerta: true, tam: 62, ate: W.atelect - 0.1 });
    s += contorno(P, m.pulmaoC, clamp((t - W.atelect) / 0.7), { cor: LIMA, preenche: 0.1, tracejado: '16 9' });
    h += ptag(t, W.atelect + 0.25, 'pulmão atelectasiado', P(...m.pulmao)[0], P(...m.pulmao)[1], { cls: 'escura', tam: 28 });
    h += selo(t, W.aguaviva - 0.05, 'sinal da água-viva', 'o pulmão ondula no derrame', 540, base - 70, { tam: 58 });
    const cd = der.reduce((a, p) => [a[0] + p[0] / der.length, a[1] + p[1] / der.length], [0, 0]);
    quer(t >= W.aguaviva - 0.05 ? [540, base - 70] : t >= W.atelect ? P(...m.pulmao) : t >= W.diafragma + 0.5 ? [540, base - 70] : t >= W.diafragma ? P(...dia[1]) : t >= W.pretaP ? P(...cd) : P(0.5, 0.5));
  } else if (nome === 'fast') {
    const fig = P(...(m.figado || [0.35, 0.35])), rim = P(...(m.rim || [0.6, 0.6]));
    const faixa = m.faixa || [[0.4, 0.45], [0.55, 0.42], [0.6, 0.48], [0.45, 0.52]];
    h += ptag(t, W.figado, 'fígado', fig[0], fig[1], { cls: 'escura', tam: 32 });
    h += ptag(t, W.rim, 'rim', rim[0], rim[1], { cls: 'escura', tam: 32 });
    h += ptag(t, W.morison + 0.1, 'espaço de Morison', P(...m.rotMor)[0], P(...m.rotMor)[1], { tam: 30, ate: W.anecoicaF - 0.1 });
    s += contorno(P, faixa, clamp((t - W.anecoicaF) / 0.7), { cor: ALERTA, classe: 'neon-v', preenche: 0.22 });
    h += selo(t, W.livre, 'líquido livre', 'FAST positivo', 540, base - 70, { alerta: true, tam: 62 });
    h += chip(t, W.hemo, `${IC.alerta} trauma: hemoperitônio`, 540, R.y + 80, { cls: 'alerta', tam: 32 });
    const cf = faixa.reduce((a, p) => [a[0] + p[0] / faixa.length, a[1] + p[1] / faixa.length], [0, 0]);
    quer(t >= W.hemo ? [540, R.y + 80] : t >= W.livre ? [540, base - 70] : t >= W.rim ? rim : t >= W.figado ? fig : t >= W.morison ? P(...cf) : P(0.5, 0.4));
  } else if (nome === 'pericardio' && t >= C.pericardio[0]) {
    const faixa = m.faixa || [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]];
    const vd = P(...(m.vd || [0.5, 0.35]));
    s += contorno(P, faixa, clamp((t - W.faixa) / 0.8), { cor: ALERTA, classe: 'neon-v', preenche: 0, larg: 7 });
    h += ptag(t, W.derrame, 'derrame', P(...(m.rotulo || [0.8, 0.5]))[0], P(...(m.rotulo || [0.8, 0.5]))[1], { cls: 'alerta', tam: 32 });
    s += anel(vd[0], vd[1], 50, t, W.ventriculo);
    h += ptag(t, W.ventriculo + 0.1, 'VD', vd[0] + 115, vd[1] - 10, { tam: 32 });
    h += selo(t, W.colaba, 'colapso diastólico do VD', '= tamponamento', 540, base - 70, { alerta: true, tam: 56 });
    quer(t >= W.colaba ? [540, base - 70] : t >= W.ventriculo ? vd : t >= W.faixa ? P(...faixa[0]) : P(0.5, 0.5));
  }
  return { s, h };
}

// ---------------------------------------------------------------- um quadro
function seek(t) {
  espera.length = 0;
  desenhaFundo(t);
  let alvo = null, laser = false, tremor = 0, flash = 0, corFlash = '255,255,255';
  const quer = (a) => { laser = true; alvo = a; };
  let s = '', h = '';
  let clip = null;

  // ---- gancho: título, o visor com o coração e os três achados
  {
    const fora = surge(t, C['gancho-2'][0] - 0.15, 0.25);
    [...$('g-tit').children].forEach((sp, i) => { const p = pop(t, 0.1 + i * 0.35, 0.3) * (1 - fora); sp.style.transform = `scale(${p})`; sp.style.opacity = clamp(p * 3); });
    $('g-tit').style.visibility = fora < 1 ? 'visible' : 'hidden';
    if (t < C['gancho-2'][0]) {
      const fim = C['gancho-2'][0] - 0.2;
      h += chip(t, W.pneumo, `${IC.alerta} pneumotórax`, 300, 520, { cls: 'alerta', tam: 40, ate: fim, rot: -4 });
      h += chip(t, W.sangue, `${IC.alerta} hemoperitônio`, 720, 680, { cls: 'alerta', tam: 40, ate: fim, rot: 3 });
      h += chip(t, W.tampona, `${IC.alerta} tamponamento`, 360, 840, { cls: 'alerta', tam: 40, ate: fim, rot: -3 });
      if (t >= W.cinco - 0.05) h += `<div class="chip" style="left:540px;top:${1000}px;font-size:46px;padding:16px 28px;transform:translate(-50%,-50%) scale(${pop(t, W.cinco - 0.05) * (1 - fora)})">com <b style="color:#fff;margin:0 8px">5 Ps</b> você acha</div>`;
      if (t > 0.8) quer(t >= W.tampona ? [360, 840] : t >= W.sangue ? [720, 680] : t >= W.pneumo ? [300, 520] : [540, 660]);
    }
  }

  // ---- gancho 2: a lista dos 5 P
  {
    const vis = t >= C['gancho-2'][0] - 0.1 && t < C.regra[0] + 0.2;
    $('c-lista').style.visibility = vis ? 'visible' : 'hidden';
    const fora = surge(t, C.regra[0] - 0.12, 0.25);
    const tt = $('g-tit2'); tt.style.visibility = vis ? 'visible' : 'hidden';
    tt.style.transform = `scale(${pop(t, C['gancho-2'][0] - 0.05, 0.35) * (1 - fora)})`;
    if (vis) {
      CAPS.forEach((_, i) => {
        const p = pop(t, W.lista[i] - 0.05, 0.35) * (1 - fora);
        const el = $('ls-' + i);
        el.style.transform = `translate(130px, ${400 + i * 150}px) translateY(-50%) scale(${p})`;
        el.style.opacity = clamp(p * 2);
      });
      const k = W.lista.filter((x) => x <= t + 0.05).length - 1;
      if (k >= 0 && t < C.regra[0] - 0.1) quer([184, 400 + k * 150]);
    }
  }

  // ---- visor
  const md = midia(t);
  {
    const v1 = $('v1');
    v1.style.visibility = md ? 'visible' : 'hidden';
    if (md) {
      const P = poeClipe('v1', md.R, md.nome, md.v, t, md.t0);
      const e = pop(t, md.troca ? md.ent - 0.01 : md.ent, md.troca ? 0.01 : 0.4) * (1 - surge(t, md.sai, 0.2));
      v1.style.transform = `scale(${e})`;
      $('v1-tl').innerHTML = md.tl; $('v1-tr').innerHTML = md.tr;
      if (md.troca && t < md.ent + 0.15) { flash = Math.max(flash, 0.18 * (1 - (t - md.ent) / 0.15)); }
      clip = md.R;
      if ((md.nome !== 'pericardio' || t >= C.pericardio[0]) && t < md.sai) {
        const r = marcas(t, md.nome, P, md.R, quer);
        s += r.s; h += r.h;
      }
    }
  }

  // ---- régua de cinza da regra de ouro
  {
    const vis = t >= W.preto - 0.1 && t < C.praia[0];
    $('c-regua').style.visibility = vis ? 'visible' : 'hidden';
    if (vis) {
      const fora = surge(t, C.praia[0] - 0.25, 0.2);
      $('regua').style.transform = `scaleX(${sai((t - W.preto + 0.1) / 0.4) * (1 - fora)})`;
      h += ptag(t, W.preto, 'anecoico', 150, 1000, { tam: 30, ate: C.praia[0] - 0.25 });
      h += ptag(t, W.brancos, 'hiperecoico', 900, 1000, { tam: 30, ate: C.praia[0] - 0.25 });
    }
  }

  // ---- resumo
  {
    const el = $('c-res');
    const vis = t >= C.resumo[0] - 0.05 && t < C.fim[0] + 0.2;
    el.style.visibility = vis ? 'visible' : 'hidden';
    if (vis) {
      const fora = surge(t, C.fim[0] - 0.1, 0.25);
      const NOMES = ['desliza', 'blinhas', 'pleural', 'fast', 'pericardio'];
      CAPS.forEach((_, i) => {
        const row = $('rs-' + i);
        const p = pop(t, W.rs[i] - 0.05, 0.35) * (1 - fora);
        const y = 380 + i * 150;
        row.style.transform = `translate(70px, ${y}px) translateY(-50%) scale(${p})`;
        row.style.opacity = clamp(p * 2);
        const mn = $('mn-' + i), im = $('mn-' + i + '-img');
        const R = { x: 790, y: y - 62, w: 220, h: 124 };
        mn.style.left = R.x + 'px'; mn.style.top = R.y + 'px'; mn.style.width = R.w + 'px'; mn.style.height = R.h + 'px';
        mn.style.transform = `scale(${p})`; mn.style.opacity = clamp(p * 2);
        const [iw, ih, n] = CLIPES[NOMES[i]] || [4, 3, 1];
        const sc = Math.max(R.w / iw, R.h / ih);
        im.style.width = iw * sc + 'px'; im.style.height = ih * sc + 'px'; im.style.left = (R.w - iw * sc) / 2 + 'px'; im.style.top = (R.h - ih * sc) / 2 + 'px';
        const src = quadroSrc(NOMES[i], n > 1 ? Math.floor(Math.max(0, t - W.rs[i]) * 30) % n : 0);
        if (p > 0 && im.dataset.src !== src) { im.dataset.src = src; im.src = src; espera.push(im.decode().catch(() => {})); }
      });
      h += selo(t, W.pocus - 0.05, 'os 5 Ps do POCUS', '', 540, 215, { tam: 62, ate: C.fim[0] - 0.1 });
      const k = W.rs.filter((x) => x <= t + 0.05).length - 1;
      if (t >= W.pocus) quer([540, 215]);
      else if (k >= 0 && t < C.fim[0] - 0.1) quer([115, 380 + k * 150]);
    }
  }

  $('palco-svg').innerHTML = clip ? `<defs><clipPath id="cl0"><rect x="${clip.x}" y="${clip.y}" width="${clip.w}" height="${clip.h}" rx="40"/></clipPath></defs><g clip-path="url(#cl0)">${s}</g>` : s;
  $('cam').innerHTML = h;

  // ---- fim
  {
    const t0 = C.fim[0];
    $('c-fim').style.visibility = t >= t0 ? 'visible' : 'hidden';
    const bs = $('b-salva'), bg = $('b-segue');
    bs.style.left = '470px'; bs.style.top = '520px'; bs.style.transform = `translate(-50%,-50%) scale(${pop(t, PAL('fim', 'salva') - 0.05, 0.4)}) rotate(${-5 + 3 * Math.sin(t * 3)}deg)`;
    bg.style.left = '650px'; bg.style.top = '660px'; bg.style.transform = `translate(-50%,-50%) scale(${pop(t, PAL('fim', 'segue') - 0.05, 0.4)}) rotate(${4 + 3 * Math.sin(t * 3 + 1)}deg)`;
    $('marca').style.opacity = surge(t, t0 + 0.6, 0.4);
  }

  // ---- cartão do capítulo, que voa para a barra
  {
    const p = $('passo');
    let mostra = false, veu = 0;
    CAPS.forEach(([c, l, nome, sub], i) => {
      const t0 = C[c][0];
      if (t < t0 - 0.02 || t > t0 + 1.12) return;
      mostra = true;
      p.querySelector('i').textContent = l; p.querySelector('b').textContent = nome; p.querySelector('small').textContent = sub;
      const ent = pop(t, t0, 0.4), voa = vaivem((t - (t0 + 0.72)) / 0.38);
      const larg = (960 - 4 * 12) / 5, hx = 60 + i * (larg + 12) + larg / 2, hy = 190;
      const x = lerp(540, hx, voa), y = lerp(700, hy, voa), sc = lerp(1, 0.16, voa) * ent;
      p.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${sc}) rotate(${(1 - clamp(ent)) * 10}deg)`;
      p.style.opacity = 1 - clamp((voa - 0.75) / 0.25);
      p.style.filter = `blur(${Math.sin(Math.PI * voa) * 6}px)`;
      veu = clamp(ent) * (1 - voa);
    });
    p.style.visibility = mostra ? 'visible' : 'hidden';
    $('scrim').style.opacity = veu;
  }

  // ---- barra
  {
    const hud = $('hud');
    const e = surge(t, T_VOA + 0.25, 0.3) * (1 - surge(t, C.resumo[0] - 0.05, 0.3));
    hud.style.transform = `translateY(${(1 - e) * -30}px)`; hud.style.opacity = e;
    hud.style.visibility = e > 0.01 ? 'visible' : 'hidden';
    [...hud.children].forEach((div, i) => {
      const [c] = CAPS[i];
      const a = C[c][0], chega = a + 1.08, fim = FIM(c);
      div.querySelector('i').style.width = (t < chega ? 0 : clamp((t - chega) / (fim - chega)) * 100) + '%';
      div.className = t >= fim ? 'feito' : t >= a ? 'ativo' : '';
      div.style.transform = `scale(${pop(t, T_VOA + 0.35 + i * 0.05, 0.3)})`;
    });
  }

  // ---- legenda
  {
    let atual = null;
    for (let i = 0; i < blocos.length; i++) {
      const b = blocos[i], prox = blocos[i + 1];
      const ini = b.ws[0].ini - 0.04;
      const fim = prox && prox.ws[0].ini - 0.04 < b.fala.fim + 0.35 ? prox.ws[0].ini - 0.04 : b.fala.fim + 0.35;
      if (t >= ini && t < fim) { atual = b; break; }
    }
    const el = $('legenda');
    if (!atual) el.innerHTML = '';
    else {
      el.style.top = (legendaY(atual.fala.cena) - 115) + 'px';
      el.innerHTML = atual.ws.map((w) => {
        const p = t < w.ini - 0.03 ? 0 : back((t - w.ini + 0.03) / 0.18, 2.6);
        const agora = t >= w.ini - 0.03 && t < w.fim + 0.05;
        return `<span class="${agora ? 'agora' : ''}" style="opacity:${t < w.ini - 0.03 ? 0 : 1};transform:scale(${0.6 + 0.4 * p}) ${agora ? 'rotate(-2deg)' : ''}">${w.texto}</span>`;
      }).join('');
    }
  }

  // ---- Medbot
  const tr = trajeto(t);
  const [lw, lh, arco, cara] = caraEm(t);
  const q = Math.min(T.boca.length - 1, Math.round(t * FPS));
  const boca = T.boca[q] || 0;
  let x = tr.x, y = tr.y + 9 * Math.sin(2 * Math.PI * t / 1.5);
  let estica = 1 + 0.05 * (boca - 0.3);
  if (tr.movendo) estica *= tr.u < 0.12 ? lerp(0.86, 1.12, tr.u / 0.12) : 1 + 0.1 * Math.sin(Math.PI * tr.u);
  if (tr.pousou < 0.45) estica *= 1 - 0.17 * Math.exp(-tr.pousou * 8) * Math.cos(tr.pousou * 24);
  let roll = tr.movendo ? -0.32 * tr.dir * Math.sin(Math.PI * tr.u) : 0;
  let yaw = tr.movendo ? 0.55 * tr.dir * Math.sin(Math.PI * tr.u) : 0;
  const fa = T.falas.filter((f) => f.ini - 0.08 <= t).pop();
  if (fa && CARA[fa.cena] === 'feliz') { const dt = t - fa.ini; roll += 0.13 * Math.sin(2 * Math.PI * dt / 0.5) * Math.exp(-dt * 0.8); }
  for (const tt of [W.pnx, W.agua, W.livre, W.colaba]) { if (t >= tt && t < tt + 0.5) { const u = (t - tt) / 0.5; y -= 70 * Math.sin(Math.PI * u); } }
  let olhar = [Math.sin(t * 0.9) * 4, Math.sin(t * 0.7) * 3];
  if (alvo) { const dx = alvo[0] - x, dy = y - alvo[1]; olhar = [clamp(dx / 9, -30, 30), clamp(dy / 16, -12, 24)]; yaw += clamp(dx / 2600, -0.3, 0.3); }
  const tA = Math.max(0, t - 0.08), tB = Math.min(T.duracao, t + 0.08);
  const vxy = [(trajeto(tB).x - trajeto(tA).x) / 0.16, (trajeto(tB).y - trajeto(tA).y) / 0.16];
  const pend = [clamp(vxy[1] * 0.0005, -0.7, 0.7) + 0.06 * Math.sin(2 * Math.PI * t / 1.5), clamp(-vxy[0] * 0.0006, -0.8, 0.8) + 0.05 * Math.sin(2 * Math.PI * t / 1.7) - roll * 1.2];
  if (bot) { bot.pose({ x, y, tamanho: tr.tam, yaw, roll, estica, olhar, olho: [lw, lh, arco], pisca: pisca(t, cara), boca, pendulo: pend }); palco.render(); }

  // ---- laser
  {
    const l = $('laser');
    const naCarta = CAPS.some(([c]) => t >= C[c][0] - 0.05 && t < C[c][0] + CARTAO + 0.05);
    if (!laser || !alvo || !bot || tr.movendo || naCarta) l.innerHTML = '';
    else {
      const a = alvo;
      const dx = a[0] - x, dy = a[1] - y, dist = Math.hypot(dx, dy) || 1;
      const sx = x + dx / dist * tr.tam * 0.36, sy = y + dy / dist * tr.tam * 0.36 - tr.tam * 0.05;
      const ritmo = (t * 3) % 1;
      l.innerHTML = `<defs><filter id="brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>
        <line x1="${sx}" y1="${sy}" x2="${a[0]}" y2="${a[1]}" stroke="#C1FF72" stroke-width="16" stroke-opacity=".35" filter="url(#brilho)"/>
        <line x1="${sx}" y1="${sy}" x2="${a[0]}" y2="${a[1]}" stroke="#E9FFC9" stroke-width="5" stroke-linecap="round" stroke-dasharray="22 14" stroke-dashoffset="${-t * 160}"/>
        <circle cx="${sx}" cy="${sy}" r="9" fill="#E9FFC9"/>
        <circle cx="${a[0]}" cy="${a[1]}" r="${22 + 26 * ritmo}" fill="none" stroke="#C1FF72" stroke-width="5" opacity="${1 - ritmo}"/>
        <circle cx="${a[0]}" cy="${a[1]}" r="13" fill="#E9FFC9" filter="url(#brilho)"/><circle cx="${a[0]}" cy="${a[1]}" r="8" fill="#fff"/>`;
    }
  }

  // ---- tremor e flash
  for (const [c] of CAPS) { const dd = t - C[c][0]; if (dd >= 0 && dd < 0.2) tremor = Math.max(tremor, 8 * (1 - dd / 0.2)); }
  for (const tt of [W.pnx, W.agua, W.livre, W.colaba]) { const dd = t - tt; if (dd >= 0 && dd < 0.25) { tremor = Math.max(tremor, 9 * (1 - dd / 0.25)); flash = Math.max(flash, 0.2 * (1 - dd / 0.25)); corFlash = '255,77,87'; } }
  $('mundo').style.transform = tremor > 0.3 ? `translate(${Math.sin(t * 91) * tremor}px, ${Math.cos(t * 77) * tremor * 0.7}px) rotate(${Math.sin(t * 53) * tremor * 0.04}deg)` : 'none';
  $('flash').style.background = `rgba(${corFlash},${flash})`;
  return Promise.all(espera);
}

window.seek = seek;
window.ready = (async () => {
  await document.fonts.ready;
  bot = await carregarMedbot(palco, '../../_personagem/web/medbot.glb');
  await seek(0);
})();
