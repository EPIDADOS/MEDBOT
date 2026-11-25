// "Tipos de sutura": cinco pontos no estilo do vídeo da TC de crânio. Cada ponto é um capítulo que voa para a barra de cima; no visor,
// um ESQUEMA animado mostra a ferida vista de cima e o corte da pele (epiderme, derme e subcutâneo), com o trajeto da agulha, as bordas
// aproximando e evertendo. Fotos reais entram quando houver (FOTOS). Tudo em função do tempo (window.seek(t)).
import { criarPalco, carregarMedbot } from '../../_personagem/web/medbot-3d.js';

const T = window.TEMPOS;
const FPS = T.fps;
window.FPS = FPS;
window.DURATION = T.duracao;
const $ = (id) => document.getElementById(id);
const LIMA = '#C1FF72', ALERTA = '#FF4D57';
// ?sem-laser: a foto do esquema para a capa (tools/esquema-capa.cjs), sem o laser do Medbot
const SEM_LASER = location.search.includes('sem-laser');

// ---------------------------------------------------------------- tempo e curvas
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const sai = (u) => { u = clamp(u); return 1 - Math.pow(1 - u, 3); };
const vaivem = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const back = (u, s = 2.2) => { u = clamp(u); const c = s + 1; return 1 + c * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2); };
const pop = (t, t0, d = 0.38) => (t < t0 ? 0 : back((t - t0) / d));
const surge = (t, t0, d = 0.25) => sai((t - t0) / d);
const anda = (t, t0, d) => vaivem((t - t0) / d);
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
  x: SVG('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 3.2),
  alerta: SVG('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  salvar: SVG('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>'),
  seguir: SVG('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>'),
  relogio: SVG('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  tesoura: SVG('<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>'),
};

// ---------------------------------------------------------------- capítulos: cena, número, nome, apelido, fim
const CAPS = [
  ['simples', '1', 'Simples', 'o coringa', () => C.donati[0]],
  ['donati', '2', 'Donati', 'colchoeiro vertical', () => C.u[0]],
  ['u', '3', 'Em U', 'colchoeiro horizontal', () => C.intradermico[0]],
  ['intradermico', '4', 'Intradérmico', 'sem marcas na pele', () => C.chuleio[0]],
  ['chuleio', '5', 'Chuleio', 'sutura contínua', () => C.resumo[0]],
];
const FIM = (c) => CAPS.find((k) => k[0] === c)[4]();
const CARTAO = 0.78;

// ---------------------------------------------------------------- tempos-chave
const W = {
  cinco: PAL('gancho', 'cinco'),
  everter: PAL('regra', 'everter'), invertida: PAL('regra', 'invertida'), pior: PAL('regra', 'pior'), alarga: PAL('regra', 'alarga'),
  coringa: PAL('simples', 'coringa'), agulha: PAL('simples', 'agulha'), distancia: PAL('simples', 'distancia'), profundidade: PAL('simples', 'profundidade'),
  dois: PAL('simples', 'dois'), rompe: PAL('simples', 'rompe'), seguram: PAL('simples', 'outros'),
  longe: PAL('donati', 'longe'), perto: PAL('donati', 'perto'), profunda: PAL('donati', 'profunda'), superficial: PAL('donati', 'superficial'), bomD: PAL('donati', 'bom'),
  emU: PAL('u', 'ponto'), distribui: PAL('u', 'distribui'), hemostasia: PAL('u', 'hemostasia'), friavel: PAL('u', 'friavel'),
  derme: PAL('intradermico', 'derme'), paralelo: PAL('intradermico', 'paralelo'), marcas: PAL('intradermico', 'sem'), plastica: PAL('intradermico', 'cirurgia'),
  cesarea: PAL('intradermico', 'cesarea'), absorvivel: PAL('intradermico', 'absorvivel'),
  continua: PAL('chuleio', 'sutura'), rapido: PAL('chuleio', 'rapido'), tensaoC: PAL('chuleio', 'distribui'), romper: PAL('chuleio', 'romper'), ferida: PAL('chuleio', 'ferida'), abre: PAL('chuleio', 'abre'),
  rs: ['simples', 'donati', 'em', 'intradermico', 'chuleio'].map((w) => PAL('resumo', w)),
  retirada: PAL('resumo', 'retirada'), face: PAL('resumo', 'face'), couro: PAL('resumo', 'couro'), membros: PAL('resumo', 'membros'),
};
const T_VOA = C.simples[0] - 0.12;
const LISTA_T = [1.6, 2.15, 2.7, 3.25, 3.8];

// ---------------------------------------------------------------- o esquema: cores e geometria
const COR = { pele: '#EFC1A9', pele2: '#E5AE94', ferida: '#8E1E26', cicatriz: '#D59A8E', fio: '#1E3C9A', no: '#11245E', furo: '#6B2E25',
  epi: '#D58A70', derme: '#F0B49D', sub: '#F6DA96', lob: '#ECC877', borda: 'rgba(12,26,33,.25)' };
const R_VISOR = { x: 60, y: 285, w: 960, h: 700 };
const TOP = { x0: 100, x1: 980, y0: 345, y1: 590, yc: 467 };
const CS = { cx: 540, top: 700, ep: 722, de: 805, sub: 965, x0: 100, x1: 980 };

const caminho = (pts) => 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L');
function curva(pts) {
  const n = pts.length;
  const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let d = `M${f(pts[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const p1 = pts[i], p2 = pts[i + 1], p0 = pts[i - 1] || p1, p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1)} ${f(c2)} ${f(p2)}`;
  }
  return d;
}
// um traço que se desenha (u de 0 a 1)
const traco = (d, u, { cor = COR.fio, larg = 6, escondido = false, op = 1, classe = '' } = {}) => {
  if (u <= 0) return '';
  const dash = escondido ? 'stroke-dasharray="10 8"' : (u < 1 ? `pathLength="1" stroke-dasharray="${u.toFixed(3)} 1.01"` : '');
  const vis = escondido && u < 1 ? `opacity="${(op * 0.55 * clamp(u * 3)).toFixed(2)}"` : `opacity="${(escondido ? op * 0.55 : op).toFixed(2)}"`;
  return `<path d="${d}" fill="none" stroke="${cor}" stroke-width="${larg}" stroke-linecap="round" stroke-linejoin="round" ${dash} ${vis} class="${classe}"/>`;
};
const no = (x, y, u, cor = COR.no) => (u <= 0 ? '' : `<circle cx="${x}" cy="${y}" r="${8 * back(clamp(u * 2))}" fill="${cor}"/>
  <path d="M${x} ${y} l14 -10 M${x} ${y} l-12 -12" stroke="${cor}" stroke-width="4" stroke-linecap="round" opacity="${clamp(u * 2)}"/>`);
const furo = (x, y, u) => (u <= 0 ? '' : `<circle cx="${x}" cy="${y}" r="5" fill="${COR.furo}" opacity="${clamp(u * 3)}"/>`);

// pele vista de cima: a ferida aberta (fechado = 0) ou fechada (1); cicatriz alargada (larga = 0 a 1)
function topoBase(fechado, larga = 0) {
  const largura = lerp(18, 3, fechado) + larga * 16;
  const cor = larga > 0.02 ? COR.cicatriz : COR.ferida;
  return `<defs><linearGradient id="gpele" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COR.pele}"/><stop offset="1" stop-color="${COR.pele2}"/></linearGradient></defs>
    <rect x="${TOP.x0}" y="${TOP.y0}" width="${TOP.x1 - TOP.x0}" height="${TOP.y1 - TOP.y0}" rx="26" fill="url(#gpele)"/>
    <path d="M${TOP.x0 + 50} ${TOP.yc} L${TOP.x1 - 50} ${TOP.yc}" stroke="${cor}" stroke-width="${largura.toFixed(1)}" stroke-linecap="round"/>`;
}

// os pontos vistos de cima; u = progresso do desenho (0 a 1), estado = { quebra: índice, falha: 0 a 1 }
function topoPontos(tipo, u, est = {}) {
  let s = '';
  const yA = TOP.yc - 40, yB = TOP.yc + 40;
  if (tipo === 'simples') {
    const X = [250, 395, 540, 685, 830];
    X.forEach((x, i) => {
      const ui = clamp(u * X.length - i);
      if (ui <= 0) return;
      const quebrado = est.quebra === i ? clamp(est.romp) : 0;
      const op = 1 - quebrado;
      s += furo(x, yA, ui) + furo(x, yB, ui);
      if (op > 0.01) s += traco(caminho([[x, yB], [x, yA]]), ui, { op, cor: quebrado > 0 ? ALERTA : COR.fio }) + no(x, yA, (ui - 0.6) * 2.5 * op);
    });
  } else if (tipo === 'donati') {
    const X = [280, 460, 640, 820];
    X.forEach((x, i) => {
      const ui = clamp(u * X.length - i);
      if (ui <= 0) return;
      const longe = clamp(ui * 2), perto = clamp(ui * 2 - 1);
      s += furo(x, TOP.yc - 62, longe) + furo(x, TOP.yc + 62, longe) + furo(x, TOP.yc - 26, perto) + furo(x, TOP.yc + 26, perto);
      s += traco(caminho([[x - 6, TOP.yc - 62], [x - 6, TOP.yc + 62]]), longe, { escondido: true });
      s += traco(caminho([[x, TOP.yc + 62], [x, TOP.yc + 26]]), perto);
      s += traco(caminho([[x + 6, TOP.yc + 26], [x + 6, TOP.yc - 26]]), perto, { escondido: true });
      s += traco(caminho([[x, TOP.yc - 26], [x, TOP.yc - 62]]), perto) + no(x, TOP.yc - 44, (perto - 0.6) * 2.5);
    });
  } else if (tipo === 'u') {
    const X = [280, 460, 640, 820];
    X.forEach((x, i) => {
      const ui = clamp(u * X.length - i);
      if (ui <= 0) return;
      const a = [x - 26, yA], b = [x - 26, yB], c = [x + 26, yB], d = [x + 26, yA];
      s += furo(...a, ui) + furo(...b, ui) + furo(...c, ui) + furo(...d, ui);
      s += traco(caminho([a, b]), clamp(ui * 3), { escondido: true });
      s += traco(caminho([b, c]), clamp(ui * 3 - 1));
      s += traco(caminho([c, d]), clamp(ui * 3 - 2), { escondido: true });
      s += traco(caminho([d, a]), clamp(ui * 3 - 2)) + no(x, yA, (ui - 0.8) * 5);
    });
  } else if (tipo === 'intradermico') {
    const pts = [[140, TOP.yc]];
    let x = 175, lado = -1;
    pts.push([x, TOP.yc + lado * 22]);
    while (x < 880) { pts.push([x + 60, TOP.yc + lado * 22]); x += 60; lado = -lado; pts.push([x, TOP.yc + lado * 22]); }
    pts.push([940, TOP.yc]);
    s += traco(caminho(pts), u, { escondido: true, larg: 5 });
    s += traco(caminho([[110, TOP.yc - 14], [140, TOP.yc]]), clamp(u * 8)) + traco(caminho([[940, TOP.yc], [970, TOP.yc + 14]]), clamp(u * 1.2 - 0.2));
  } else if (tipo === 'chuleio') {
    const X = Array.from({ length: 9 }, (_, i) => 175 + i * 90);
    const op = 1 - clamp(est.falha || 0);
    s += no(X[0], yA, clamp(u * 9) * op);
    X.forEach((x, i) => {
      const ui = clamp(u * X.length - i);
      if (ui <= 0) return;
      s += furo(x, yA, ui) + furo(x, yB, ui);
      s += traco(caminho([[x, yA], [x, yB]]), clamp(ui * 2), { escondido: true, op });
      if (i < X.length - 1) {
        const rompeu = est.quebra === i;
        s += traco(caminho([[x, yB], [X[i + 1], yA]]), clamp(ui * 2 - 1), { op: rompeu ? Math.min(op, 1 - clamp((est.romp || 0) * 2 - 1)) : op, cor: rompeu && (est.romp || 0) > 0 ? ALERTA : COR.fio });
      }
    });
    if (u >= 1) s += no(X[X.length - 1], yB, op);
  }
  return s;
}

// corte da pele: g = meia-largura da ferida (26 aberta, 0 fechada), e = eversão (+) ou inversão (-) das bordas
function corteBase(g, e) {
  let s = '';
  for (const lado of [-1, 1]) {
    const ext = lado < 0 ? CS.x0 : CS.x1, inn = CS.cx + lado * g, tr = inn + lado * 70;
    const camada = (y0, y1, k0, k1, cor) => `<path d="M${ext} ${y0} L${tr} ${y0} L${inn} ${y0 - e * k0} L${inn} ${y1 - e * k1} L${tr} ${y1} L${ext} ${y1} Z" fill="${cor}" stroke="${COR.borda}" stroke-width="1.5"/>`;
    s += camada(CS.de, CS.sub, 0.3, 0, COR.sub) + camada(CS.ep, CS.de, 0.8, 0.3, COR.derme) + camada(CS.top, CS.ep, 1, 0.8, COR.epi);
    for (let k = 0; k < 7; k++) {
      const dx = 30 + k * 58, cy = 850 + ((k * 37) % 80);
      if (dx < 400) s += `<ellipse cx="${CS.cx + lado * (g + dx)}" cy="${cy}" rx="22" ry="16" fill="${COR.lob}" opacity=".7"/>`;
    }
  }
  return s;
}
// um ponto do corte: [lado, distância da borda, y] (y = 'S' é a superfície, que sobe junto com a eversão)
const PC = (g, e) => ([lado, dx, y]) => [CS.cx + lado * (g + dx), y === 'S' ? CS.top - e * clamp(1 - dx / 70) : y];

// o trajeto do fio no corte, por técnica; u = progresso do desenho, f = 0 a 1 (fio frouxo a apertado)
function corteFio(tipo, g, e, u, f = 0) {
  const p = PC(g, e);
  const alto = (a, b, h) => { const pa = p(a), pb = p(b); return [pa, [(pa[0] + pb[0]) / 2, Math.min(pa[1], pb[1]) - h], pb]; };
  let s = '';
  if (tipo === 'simples' || tipo === 'chuleio') {
    const laco = [[-1, 85, 'S'], [-1, 118, 830], [1, 118, 830], [1, 85, 'S']].map(p);
    s += traco(curva(laco), clamp(u * 1.5), { larg: 7 });
    s += traco(curva(alto([1, 85, 'S'], [-1, 85, 'S'], lerp(70, 16, f))), clamp(u * 1.5 - 0.5), { larg: 7 });
    if (tipo === 'simples') { const k = p([-1, 50, 'S']); s += no(k[0], k[1] - lerp(40, 14, f), clamp(u * 2 - 1)); }
  } else if (tipo === 'donati') {
    const longe = [[-1, 155, 'S'], [-1, 172, 895], [1, 172, 895], [1, 155, 'S']].map(p);
    const perto = [[1, 38, 'S'], [1, 40, 742], [-1, 40, 742], [-1, 38, 'S']].map(p);
    s += traco(curva(longe), clamp(u * 2), { larg: 7 });
    s += traco(curva(alto([1, 155, 'S'], [1, 38, 'S'], 30)), clamp(u * 4 - 2), { larg: 7 });
    s += traco(curva(perto), clamp(u * 4 - 2.5), { larg: 7 });
    s += traco(curva(alto([-1, 38, 'S'], [-1, 155, 'S'], lerp(40, 22, f))), clamp(u * 4 - 3.2), { larg: 7 });
    const k = p([-1, 96, 'S']); s += no(k[0], k[1] - lerp(40, 22, f), clamp(u * 4 - 3.4));
  } else if (tipo === 'u') {
    const laco = [[-1, 85, 'S'], [-1, 110, 818], [1, 110, 818], [1, 85, 'S']].map(p);
    const volta = [[1, 85, 'S'], [1, 102, 806], [-1, 102, 806], [-1, 85, 'S']].map((q) => [q[0], q[1] + 8]);
    s += traco(curva(laco), clamp(u * 2), { larg: 7 });
    s += traco(curva(volta), clamp(u * 2 - 1), { larg: 6, escondido: true, op: 1.4 });
  } else if (tipo === 'intradermico') {
    const ida = [[-1, 120, 748], [-1, 10, 748], [1, 10, 756], [1, 120, 756]].map(p);
    s += traco(curva(ida), u, { larg: 7 });
  }
  return s;
}
const rotuloCorte = (op) => (op <= 0 ? '' : `<g opacity="${op}" font-family="Onest" font-weight="800" font-size="21" fill="rgba(12,26,33,.72)" text-anchor="end">
  <text x="${CS.x1 - 14}" y="${CS.top + 17}">epiderme</text><text x="${CS.x1 - 14}" y="${(CS.ep + CS.de) / 2 + 7}">derme</text><text x="${CS.x1 - 14}" y="${(CS.de + CS.sub) / 2 + 7}">subcutâneo</text></g>`);
const legendaPainel = `<g font-family="Onest" font-weight="800" font-size="20" fill="#9FB4BA" letter-spacing="1.5" text-anchor="end"><text x="${TOP.x1 - 4}" y="${TOP.y0 - 14}">VISTA DE CIMA</text><text x="${CS.x1 - 4}" y="${CS.top - 34}">CORTE DA PELE</text></g>`;

// ---------------------------------------------------------------- marcas HTML
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
// régua de medida (duas setas iguais) no corte
const medida = (a, b, u, cor = LIMA) => {
  if (u <= 0) return '';
  const x2 = lerp(a[0], b[0], clamp(u)), y2 = lerp(a[1], b[1], clamp(u));
  return `<path d="M${a[0]} ${a[1]} L${x2} ${y2}" stroke="${cor}" stroke-width="5" stroke-linecap="round" class="neon"/><circle cx="${a[0]}" cy="${a[1]}" r="6" fill="${cor}"/><circle cx="${x2}" cy="${y2}" r="6" fill="${cor}"/>`;
};

// ---------------------------------------------------------------- o estado do esquema em cada instante
function esquema(t) {
  // devolve { tipo, u (desenho de cima), uc (desenho do corte), g, e, f, fechado, larga, est } ou null
  const q = (c) => C[c][0] + CARTAO - 0.05;
  if (t >= C.regra[0] - 0.05 && t < C.simples[0]) {
    const ev = anda(t, W.everter, 0.5), inv = anda(t, W.invertida, 0.5);
    return { tipo: 'regra', g: lerp(26, 0, ev), e: lerp(lerp(0, 16, ev), -16, inv), fechado: ev, larga: anda(t, W.alarga, 0.6), u: 0, uc: 0, ent: C.regra[0], sai: C.simples[0] - 0.2 };
  }
  if (t >= q('simples') && t < C.donati[0]) {
    const fecha = anda(t, W.dois, 0.5);
    return { tipo: 'simples', u: clamp((t - W.agulha) / 1.6), uc: clamp((t - W.agulha) / 1.0), g: lerp(26, 0, fecha), e: lerp(0, 12, fecha), f: fecha, fechado: fecha,
      est: { quebra: 2, romp: clamp((t - W.rompe - 0.1) / 0.5) }, ent: q('simples'), sai: C.donati[0] - 0.2 };
  }
  if (t >= q('donati') && t < C.u[0]) {
    const aprox = anda(t, W.profunda, 0.5), ev = anda(t, W.superficial, 0.6);
    const ul = clamp((t - W.longe) / 0.8), up = clamp((t - W.perto) / 0.8);
    return { tipo: 'donati', u: ul * 0.5 + up * 0.5, uc: ul * 0.5 + up * 0.5, g: lerp(26, 0, aprox), e: lerp(0, 20, ev), f: aprox, fechado: aprox, ent: q('donati'), sai: C.u[0] - 0.2 };
  }
  if (t >= q('u') && t < C.intradermico[0]) {
    const fecha = anda(t, W.distribui, 0.5);
    return { tipo: 'u', u: clamp((t - W.emU + 0.4) / 1.4), uc: clamp((t - W.emU + 0.4) / 1.2), g: lerp(26, 0, fecha), e: lerp(0, 12, fecha), f: fecha, fechado: fecha, ent: q('u'), sai: C.intradermico[0] - 0.2 };
  }
  if (t >= q('intradermico') && t < C.chuleio[0]) {
    const fecha = anda(t, W.marcas, 0.5);
    return { tipo: 'intradermico', u: clamp((t - W.paralelo) / 1.4), uc: clamp((t - W.derme) / 0.8), g: lerp(26, 0, fecha), e: lerp(0, 5, fecha), f: fecha, fechado: fecha, ent: q('intradermico'), sai: C.chuleio[0] - 0.2 };
  }
  if (t >= q('chuleio') && t < C.resumo[0]) {
    const fecha = anda(t, W.rapido, 0.5) * (1 - anda(t, W.ferida, 0.6));
    return { tipo: 'chuleio', u: clamp((t - W.continua) / 1.2), uc: clamp((t - W.continua) / 0.8) * (1 - clamp((t - W.ferida - 0.1) / 0.6)), g: lerp(26, 0, fecha), e: lerp(0, 8, fecha), f: fecha, fechado: fecha,
      est: { quebra: 4, romp: clamp((t - W.romper - 0.05) / 0.4), falha: clamp((t - W.ferida - 0.1) / 0.6) }, ent: q('chuleio'), sai: C.resumo[0] - 0.2 };
  }
  return null;
}

// ---------------------------------------------------------------- cenas
$('cenas').innerHTML = `<div class="titulo" id="g-tit" style="top:140px"><span>Sutura no</span><span><b>plantão</b></span></div>
  <div class="cena" id="c-lista">${CAPS.map(([, n, nome, sub], i) => `<div class="lista" id="ls-${i}"><div class="letra" style="width:96px;height:96px;font-size:60px">${n}</div><div><div class="nome" style="font-size:70px">${nome}</div><div class="sub">${sub}</div></div></div>`).join('')}</div>
  <div class="visor" id="v1" style="background:#0B1E26"><div class="pacs tl"><b>ESQUEMA</b></div><div class="pacs tr" id="v1-tr"></div></div>
  <div class="cena" id="c-res">${CAPS.map(([, n, nome, sub], i) => `<div class="lista" id="rs-${i}"><div class="letra" style="width:80px;height:80px;font-size:50px">${n}</div><div><div class="nome" style="font-size:54px">${nome}</div><div class="sub" style="font-size:24px">${sub}</div></div></div>`).join('')}</div>
  <svg id="palco-svg" width="1080" height="1920" style="position:absolute;left:0;top:0;overflow:visible"></svg><div id="cam"></div>
  <div class="cena" id="c-fim"><div class="botao lima" id="b-salva"><span>${IC.salvar}</span>Salva pro plantão</div><div class="botao" id="b-segue"><span>${IC.seguir}</span>Segue @omedbot</div>
  <div id="marca">@omedbot</div></div>`;
$('hud').innerHTML = CAPS.map(([, n, nome]) => `<div><span><em>${n}</em> ${nome}</span><b><i></i></b></div>`).join('');

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
const CARA = { gancho: 'surpreso', regra: 'normal', simples: 'normal', donati: 'desconfiado', u: 'normal', intradermico: 'feliz', chuleio: 'preocupado', resumo: 'feliz', fim: 'feliz' };
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
som(0.0, 'whoosh', 0.5); LISTA_T.forEach((x) => som(x, 'clique', 0.45));
som(C.regra[0] - 0.05, 'whoosh', 0.5); som(W.everter, 'pop', 0.5); som(W.invertida, 'alarme', 0.28); som(W.alarga, 'zoom', 0.4); som(T_VOA, 'whoosh', 0.45);
CAPS.forEach((_, k) => som(T_VOA + 0.35 + k * 0.05, 'clique', 0.25));
for (const [c] of CAPS) { som(C[c][0] - 0.06, 'whoosh', 0.6); som(C[c][0] + 0.02, 'tum', 0.55); som(C[c][0] + 0.72, 'whoosh', 0.35); }
som(W.coringa, 'pop', 0.45); som(W.agulha, 'zoom', 0.35); som(W.distancia, 'clique', 0.4); som(W.profundidade, 'clique', 0.4); som(W.dois, 'pop', 0.45); som(W.rompe, 'alarme', 0.28); som(W.seguram, 'ding', 0.45);
som(W.longe, 'zoom', 0.35); som(W.perto, 'zoom', 0.35); som(W.profunda, 'pop', 0.4); som(W.superficial, 'pop', 0.4); som(W.bomD, 'ding', 0.45);
som(W.emU, 'zoom', 0.35); som(W.distribui, 'pop', 0.4); som(W.hemostasia, 'clique', 0.4); som(W.friavel, 'ding', 0.45);
som(W.derme, 'zoom', 0.35); som(W.paralelo, 'clique', 0.35); som(W.marcas, 'pop', 0.45); som(W.plastica, 'clique', 0.35); som(W.cesarea, 'clique', 0.35); som(W.absorvivel, 'ding', 0.45);
som(W.continua, 'zoom', 0.35); som(W.rapido, 'pop', 0.4); som(W.romper, 'alarme', 0.3); som(W.ferida + 0.2, 'tum', 0.6);
som(C.resumo[0] - 0.06, 'whoosh', 0.55); W.rs.forEach((x) => som(x, 'clique', 0.4)); som(W.retirada, 'whoosh', 0.4); [W.face, W.couro, W.membros].forEach((x) => som(x, 'ding', 0.4));
for (const s of SALTOS) if (s > 0.5) som(s + 0.02, 'boing', 0.32);
som(C.fim[0] - 1.1, 'riser', 0.45); som(PAL('fim', 'salva'), 'ding', 0.6); som(PAL('fim', 'segue'), 'pop', 0.6);
CUES.sort((a, b) => a.t - b.t);
window.CUES = CUES;

// ---------------------------------------------------------------- um quadro
function seek(t) {
  desenhaFundo(t);
  let alvo = null, laser = false, tremor = 0, flash = 0, corFlash = '255,255,255';
  const quer = (a) => { laser = true; alvo = a; };
  let s = '', h = '';
  let clip = null;

  // ---- gancho: título e a lista dos cinco pontos
  {
    const fora = surge(t, C.regra[0] - 0.15, 0.25);
    [...$('g-tit').children].forEach((sp, i) => { const p = pop(t, 0.12 + i * 0.3, 0.3) * (1 - fora); sp.style.transform = `scale(${p})`; sp.style.opacity = clamp(p * 3); });
    $('g-tit').style.visibility = fora < 1 ? 'visible' : 'hidden';
    const vis = t < C.regra[0] + 0.2;
    $('c-lista').style.visibility = vis ? 'visible' : 'hidden';
    if (vis) {
      CAPS.forEach(([c], i) => {
        const p = pop(t, LISTA_T[i] - 0.05, 0.35) * (1 - fora);
        const y = 420 + i * 128;
        const el = $('ls-' + i);
        el.style.transform = `translate(110px, ${y}px) translateY(-50%) scale(${p})`;
        el.style.opacity = clamp(p * 2);
        if (p > 0.01) s += `<g transform="translate(835, ${y - 34}) scale(0.19)" opacity="${clamp(p * 2)}"><g transform="translate(${-100}, ${-345})">${topoBase(1)}${topoPontos(c, 1)}</g></g>`;
      });
      const k = LISTA_T.filter((x) => x <= t + 0.05).length - 1;
      if (k >= 0 && t < C.regra[0] - 0.1) quer([158, 420 + k * 128]);
    }
  }

  // ---- visor com o esquema
  const es = esquema(t);
  {
    const v1 = $('v1');
    v1.style.visibility = es ? 'visible' : 'hidden';
    if (es) {
      const R = R_VISOR;
      v1.style.left = R.x + 'px'; v1.style.top = R.y + 'px'; v1.style.width = R.w + 'px'; v1.style.height = R.h + 'px';
      const ent = pop(t, es.ent, 0.4) * (1 - surge(t, es.sai, 0.2));
      v1.style.transform = `scale(${ent})`;
      clip = R;
      const op = clamp(ent);
      let e = '';
      e += legendaPainel;
      e += topoBase(es.fechado, es.larga || 0);
      if (es.tipo !== 'regra') e += topoPontos(es.tipo, es.u, es.est || {});
      e += `<line x1="${R.x + 30}" y1="${CS.top - 62}" x2="${R.x + R.w - 30}" y2="${CS.top - 62}" stroke="rgba(255,255,255,.08)" stroke-width="2"/>`;
      e += corteBase(es.g, es.e) + rotuloCorte(1);
      if (es.tipo !== 'regra') e += corteFio(es.tipo, es.g, es.e, es.uc, es.f);
      s += `<g opacity="${op.toFixed(3)}" transform="translate(540 635) scale(${ent.toFixed(4)}) translate(-540 -635)">${e}</g>`;
      if (t < es.sai) {
        const r = marcas(t, es, quer);
        s += r.s; h += r.h; flash = Math.max(flash, r.flash || 0); tremor = Math.max(tremor, r.tremor || 0); if (r.corFlash) corFlash = r.corFlash;
      }
    }
  }

  // ---- resumo
  {
    const el = $('c-res');
    const vis = t >= C.resumo[0] - 0.05 && t < C.fim[0] + 0.2;
    el.style.visibility = vis ? 'visible' : 'hidden';
    if (vis) {
      const fora = surge(t, C.fim[0] - 0.1, 0.25);
      CAPS.forEach(([c], i) => {
        const row = $('rs-' + i);
        const p = pop(t, W.rs[i] - 0.05, 0.35) * (1 - fora);
        const y = 330 + i * 112;
        row.style.transform = `translate(70px, ${y}px) translateY(-50%) scale(${p})`;
        row.style.opacity = clamp(p * 2);
        if (p > 0.01) s += `<g transform="translate(790, ${y - 32}) scale(0.24)" opacity="${clamp(p * 2)}"><g transform="translate(-100 -345)">${topoBase(1)}${topoPontos(c, 1)}</g></g>`;
      });
      const k = W.rs.filter((x) => x <= t + 0.05).length - 1;
      // a retirada dos pontos
      const ate = C.fim[0] - 0.1;
      h += chip(t, W.retirada, `${IC.tesoura} retirada dos pontos`, 540, 905, { tam: 40, ate });
      h += ptag(t, W.face, duasL('face', '5 dias'), 200, 1010, { tam: 30, ate });
      h += ptag(t, W.couro, duasL('couro cabeludo<br>e tronco', '7 a 10 dias'), 540, 1010, { tam: 30, ate });
      h += ptag(t, W.membros, duasL('membros', '10 a 14 dias'), 880, 1010, { tam: 30, ate });
      if (t >= W.retirada) quer(t >= W.membros ? [880, 1010] : t >= W.couro ? [540, 1010] : t >= W.face ? [200, 1010] : [540, 905]);
      else if (k >= 0 && t < C.fim[0] - 0.1) quer([110, 330 + k * 112]);
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
    CAPS.forEach(([c, n, nome, sub], i) => {
      const t0 = C[c][0];
      if (t < t0 - 0.02 || t > t0 + 1.12) return;
      mostra = true;
      p.querySelector('i').textContent = n; p.querySelector('b').textContent = nome; p.querySelector('small').textContent = sub;
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
  const qb = Math.min(T.boca.length - 1, Math.round(t * FPS));
  const boca = T.boca[qb] || 0;
  let x = tr.x, y = tr.y + 9 * Math.sin(2 * Math.PI * t / 1.5);
  let estica = 1 + 0.05 * (boca - 0.3);
  if (tr.movendo) estica *= tr.u < 0.12 ? lerp(0.86, 1.12, tr.u / 0.12) : 1 + 0.1 * Math.sin(Math.PI * tr.u);
  if (tr.pousou < 0.45) estica *= 1 - 0.17 * Math.exp(-tr.pousou * 8) * Math.cos(tr.pousou * 24);
  let roll = tr.movendo ? -0.32 * tr.dir * Math.sin(Math.PI * tr.u) : 0;
  let yaw = tr.movendo ? 0.55 * tr.dir * Math.sin(Math.PI * tr.u) : 0;
  const fa = T.falas.filter((f) => f.ini - 0.08 <= t).pop();
  if (fa && CARA[fa.cena] === 'feliz') { const dt = t - fa.ini; roll += 0.13 * Math.sin(2 * Math.PI * dt / 0.5) * Math.exp(-dt * 0.8); }
  for (const tt of [W.invertida, W.rompe, W.ferida + 0.2]) { if (t >= tt && t < tt + 0.5) { const u = (t - tt) / 0.5; y -= 70 * Math.sin(Math.PI * u); } }
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
    if (!laser || !alvo || !bot || tr.movendo || naCarta || SEM_LASER) l.innerHTML = '';
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
  for (const tt of [W.invertida, W.rompe, W.romper, W.ferida + 0.2]) { const dd = t - tt; if (dd >= 0 && dd < 0.25) { tremor = Math.max(tremor, 9 * (1 - dd / 0.25)); flash = Math.max(flash, 0.18 * (1 - dd / 0.25)); corFlash = '255,77,87'; } }
  $('mundo').style.transform = tremor > 0.3 ? `translate(${Math.sin(t * 91) * tremor}px, ${Math.cos(t * 77) * tremor * 0.7}px) rotate(${Math.sin(t * 53) * tremor * 0.04}deg)` : 'none';
  $('flash').style.background = `rgba(${corFlash},${flash})`;
  return Promise.resolve();
}
const duasL = (a, b) => `<span style="display:block;line-height:1.05;text-align:center">${a}<small style="display:block;font:800 1.15em/1.1 var(--titulo);margin-top:4px">${b}</small></span>`;

// ---------------------------------------------------------------- marcações de cada capítulo
function marcas(t, es, quer) {
  let s = '', h = '';
  const base = R_VISOR.y + R_VISOR.h;
  const p = PC(es.g, es.e);
  if (es.tipo === 'regra') {
    const borda = p([-1, 0, 'S']);
    h += ptag(t, W.everter + 0.2, `${IC.check} bordas evertidas`, 540, CS.top - 120, { tam: 32, ate: W.invertida - 0.1 });
    h += ptag(t, W.invertida + 0.2, `${IC.x} borda invertida`, 540, CS.top - 120, { cls: 'alerta', tam: 32 });
    h += ptag(t, W.alarga, 'cicatriz alargada', 540, TOP.yc - 70, { cls: 'alerta', tam: 30 });
    quer(t >= W.alarga ? [540, TOP.yc] : [borda[0] + 0, borda[1]]);
  } else if (es.tipo === 'simples') {
    h += chip(t, W.coringa, 'o coringa', 540, R_VISOR.y + 50, { tam: 32, ate: W.agulha + 0.5 });
    const ent = p([-1, 85, 'S']), sai = p([1, 85, 'S']);
    if (t >= W.agulha && t < W.dois) h += ptag(t, W.agulha + 0.1, 'agulha a 90°', ent[0] - 40, ent[1] - 60, { tam: 26, ate: W.distancia - 0.1 });
    s += medida([ent[0], ent[1] + 14], [CS.cx - es.g, ent[1] + 14], clamp((t - W.distancia) / 0.4)) + medida([CS.cx + es.g, sai[1] + 14], [sai[0], sai[1] + 14], clamp((t - W.distancia - 0.15) / 0.4));
    const fundoE = p([-1, 118, 830]), fundoD = p([1, 118, 830]);
    s += medida([fundoE[0] - 60, CS.top], [fundoE[0] - 60, 830], clamp((t - W.profundidade) / 0.4)) + medida([fundoD[0] + 60, CS.top], [fundoD[0] + 60, 830], clamp((t - W.profundidade - 0.15) / 0.4));
    h += ptag(t, W.distancia + 0.2, 'mesma distância', 540, CS.top - 100, { tam: 26, ate: W.profundidade - 0.1 });
    h += ptag(t, W.profundidade + 0.2, 'mesma profundidade', 540, CS.top - 100, { tam: 26, ate: W.rompe - 0.1 });
    h += ptag(t, W.rompe + 0.1, `${IC.x} rompeu`, 540, TOP.yc - 90, { cls: 'alerta', tam: 28 });
    h += selo(t, W.seguram, 'os outros seguram', '', 540, base - 60, { tam: 54 });
    quer(t >= W.seguram ? [540, base - 60] : t >= W.rompe ? [540, TOP.yc] : t >= W.dois ? [540, CS.top] : t >= W.profundidade ? [fundoE[0] - 60, 770] : t >= W.distancia ? [ent[0] + 40, ent[1] + 14] : t >= W.agulha ? ent : [395, TOP.yc]);
  } else if (es.tipo === 'donati') {
    const lE = p([-1, 155, 'S']), pE = p([-1, 38, 'S']);
    h += ptag(t, W.longe + 0.1, 'longe-longe', 330, CS.top - 110, { tam: 28 });
    h += ptag(t, W.perto + 0.1, 'perto-perto', 750, CS.top - 110, { cls: 'escura', tam: 28 });
    h += ptag(t, W.profunda + 0.1, 'profunda: aproxima', 790, 900, { cls: 'escura', tam: 26, ate: W.bomD - 0.1 });
    h += ptag(t, W.superficial + 0.1, 'superficial: everte', 290, CS.top + 70, { tam: 26, ate: W.bomD - 0.1 });
    h += selo(t, W.bomD, 'áreas de tensão', 'bordas que tendem a inverter', 540, base - 60, { tam: 54 });
    quer(t >= W.bomD ? [540, base - 60] : t >= W.superficial ? [CS.cx, CS.top - 20] : t >= W.profunda ? [CS.cx, 895] : t >= W.perto ? pE : t >= W.longe ? lE : [460, TOP.yc]);
  } else if (es.tipo === 'u') {
    h += ptag(t, W.emU + 0.2, 'ponto em U', 460, TOP.yc - 92, { tam: 28 });
    h += ptag(t, W.emU + 0.6, '2ª passada, paralela', 270, CS.top + 70, { cls: 'escura', tam: 24, ate: W.friavel - 0.1 });
    h += ptag(t, W.distribui, `${IC.check} distribui a tensão`, 300, 900, { tam: 26, ate: W.friavel - 0.1 });
    h += ptag(t, W.hemostasia, `${IC.check} hemostasia`, 780, 900, { tam: 26, ate: W.friavel - 0.1 });
    h += selo(t, W.friavel, 'pele friável', 'como a do idoso', 540, base - 60, { tam: 56 });
    quer(t >= W.friavel ? [540, base - 60] : t >= W.hemostasia ? [780, 900] : t >= W.distribui ? [300, 900] : [460, TOP.yc]);
  } else if (es.tipo === 'intradermico') {
    if (t >= W.derme) s += `<rect x="${CS.x0 + 6}" y="${CS.ep + 2}" width="${CS.x1 - CS.x0 - 12}" height="${CS.de - CS.ep - 4}" rx="8" fill="none" stroke="${LIMA}" stroke-width="4" stroke-dasharray="14 9" opacity="${clamp((t - W.derme) / 0.3)}" class="neon"/>`;
    h += ptag(t, W.paralelo, 'paralelo à superfície', 540, TOP.yc - 92, { tam: 26 });
    h += ptag(t, W.marcas, `${IC.check} sem marcas na pele`, 540, CS.top - 110, { tam: 28 });
    h += chip(t, W.plastica, 'cirurgia plástica', 300, 900, { tam: 28, ate: W.absorvivel - 0.1 });
    h += chip(t, W.cesarea, 'cesárea', 760, 900, { tam: 28, ate: W.absorvivel - 0.1 });
    h += selo(t, W.absorvivel, 'fio absorvível', 'monofilamentar', 540, base - 60, { tam: 56 });
    quer(t >= W.absorvivel ? [540, base - 60] : t >= W.cesarea ? [760, 900] : t >= W.plastica ? [300, 900] : t >= W.marcas ? [540, CS.top - 60] : t >= W.paralelo ? [540, TOP.yc] : t >= W.derme ? [540, 760] : [540, TOP.yc]);
  } else if (es.tipo === 'chuleio') {
    h += ptag(t, W.continua + 0.3, 'um fio só, contínuo', 540, TOP.yc - 92, { tam: 26, ate: W.romper - 0.1 });
    h += chip(t, W.rapido, `${IC.relogio} rápido`, 300, 900, { tam: 28, ate: W.romper - 0.1 });
    h += chip(t, W.tensaoC, 'distribui a tensão', 760, 900, { tam: 28, ate: W.romper - 0.1 });
    h += ptag(t, W.romper + 0.1, `${IC.x} rompeu`, 175 + 4.5 * 90, TOP.yc - 92, { cls: 'alerta', tam: 28 });
    h += selo(t, W.ferida + 0.35, 'se rompe, abre tudo', '', 540, base - 60, { alerta: true, tam: 56 });
    quer(t >= W.ferida + 0.35 ? [540, base - 60] : t >= W.romper ? [175 + 4.5 * 90, TOP.yc] : t >= W.tensaoC ? [760, 900] : t >= W.rapido ? [300, 900] : [540, TOP.yc]);
  }
  return { s, h };
}

window.seek = seek;
window.ready = (async () => {
  await document.fonts.ready;
  bot = await carregarMedbot(palco, '../../_personagem/web/medbot.glb');
  seek(0);
})();
