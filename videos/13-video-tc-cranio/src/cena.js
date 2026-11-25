// "Como ler uma TC de crânio" (Blood Can Be Very Bad): toda a animação em função do tempo (window.seek(t)), para o render quadro a quadro.
import { criarPalco, carregarMedbot } from '../../_personagem/web/medbot-3d.js';

const T = window.TEMPOS;
const FPS = T.fps;
window.FPS = FPS;
window.DURATION = T.duracao;
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- tempo e curvas
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const sai = (u) => { u = clamp(u); return 1 - Math.pow(1 - u, 3); };
const entra = (u) => { u = clamp(u); return u * u * u; };
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

const C = {
  gancho: [0, F('gancho-2').ini], mnemo: [F('gancho-2').ini, F('regra').ini], dens: [F('regra').ini, F('blood').ini],
  blood: [F('blood').ini, F('epidural').ini], epidural: [F('epidural').ini, F('subdural').ini], subdural: [F('subdural').ini, F('hsa').ini],
  hsa: [F('hsa').ini, F('cisternas').ini], cisternas: [F('cisternas').ini, F('cerebro').ini], cerebro: [F('cerebro').ini, F('avc').ini],
  avc: [F('avc').ini, F('ventriculos').ini], ventriculos: [F('ventriculos').ini, F('osso').ini], osso: [F('osso').ini, F('resumo').ini],
  resumo: [F('resumo').ini, F('fim').ini], fim: [F('fim').ini, T.duracao + 2],
};
// capítulos do mnemônico: cena de abertura, letra, nome, palavra em inglês, fim do capítulo
const CAPS = [
  ['blood', 'B', 'Sangue', 'Blood', C.cisternas[0]], ['cisternas', 'C', 'Cisternas', 'Can', C.cerebro[0]],
  ['cerebro', 'B', 'Cérebro', 'Be · brain', C.ventriculos[0]], ['ventriculos', 'V', 'Ventrículos', 'Very', C.osso[0]],
  ['osso', 'B', 'Osso', 'Bad · bone', C.resumo[0]],
];
const CARTAO = 0.78;
const conteudo = (c) => (CAPS.some(([p]) => p === c) ? C[c][0] + CARTAO : C[c][0]);

// ---------------------------------------------------------------- ícones (Lucide)
const SVG = (d, w = 2.6) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = {
  check: SVG('<path d="M20 6 9 17l-5-5"/>', 3.2),
  x: SVG('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 3.2),
  relogio: SVG('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  lados: SVG('<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>'),
  alerta: SVG('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  lupa: SVG('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  seta: SVG('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', 3),
  salvar: SVG('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>'),
  seguir: SVG('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>'),
};

// ---------------------------------------------------------------- tomografias (tamanhos de assets/fotos/prep/tamanhos.json)
const TAM = {
  normal08: [736, 1000], normal11: [736, 1000], normal16: [736, 1000], normal21: [736, 1000], normal26: [736, 1000],
  epidural: [878, 1000], subdural: [801, 1000], desvio: [876, 1000], hsa: [787, 1000], hidro: [812, 1000],
  avc: [879, 1100], fratura: [1028, 1000], pneumo: [1052, 900],
};
const CRED = {
  normal: 'TC: Mikael Häggström · CC0', epidural: 'TC: Hellerhoff · CC BY-SA 3.0', subdural: 'TC: James Heilman · CC BY-SA 3.0',
  desvio: 'TC: James Heilman · CC BY-SA 3.0', hsa: 'TC: Lipothymia · CC BY-SA 3.0', hidro: 'TC: Lucien Monfils · CC BY-SA 3.0',
  avc: 'TC: Lucien Monfils · CC BY-SA 4.0', fratura: 'TC: Cerevisae · CC BY-SA 4.0', pneumo: 'TC: James Heilman · CC BY-SA 4.0',
};
const visorHTML = (id, nomes, info = 'Axial') => `<div class="visor" id="${id}">${nomes.map((n) => `<img data-n="${n}" src="../assets/fotos/prep/${n}.jpg" alt="">`).join('')}
  <div class="pacs tl">TC de crânio<br>sem contraste</div><div class="pacs tr" id="${id}-wl">W <b>80</b> · L <b>40</b><br>janela de cérebro</div>
  <div class="pacs bl" id="${id}-info">${info}</div><div class="ori esq" id="${id}-oe">D</div><div class="ori dir" id="${id}-od">E</div>
  <div class="varre" id="${id}-varre"></div><div class="alarme" id="${id}-alarme"></div><div class="credito claro" id="${id}-cred"></div></div>`;
const miniHTML = (id, nome) => `<div class="visor" id="${id}" style="border-radius:28px"><img data-n="${nome}" src="../assets/fotos/prep/${nome}.jpg" alt="">
  <div class="credito claro" id="${id}-cred" style="font-size:12px;right:10px;bottom:8px;padding:2px 6px"></div></div>`;

// coloca a imagem no visor: v = { z, fx, fy } (fx, fy = ponto da imagem, de 0 a 1, que fica no centro do visor); devolve o mapa imagem -> tela
function poeVisor(id, R, nome, v, extra = {}) {
  const el = $(id);
  el.style.left = R.x + 'px'; el.style.top = R.y + 'px'; el.style.width = R.w + 'px'; el.style.height = R.h + 'px';
  const [iw, ih] = TAM[nome];
  const s = (extra.cobre ? Math.max(R.w / iw, R.h / ih) : Math.min(R.w / iw, R.h / ih)) * v.z;
  for (const im of el.querySelectorAll('img')) {
    if (im.dataset.n !== nome) { im.style.display = 'none'; continue; }
    im.style.display = 'block'; im.style.width = iw * s + 'px'; im.style.height = ih * s + 'px';
    im.style.left = (R.w / 2 - v.fx * iw * s) + 'px'; im.style.top = (R.h / 2 - v.fy * ih * s) + 'px';
    im.style.filter = extra.filtro || 'none';
  }
  const tl = el.querySelector('.pacs.tl');
  if (tl) tl.style.visibility = R.w < 600 ? 'hidden' : 'visible';
  const wl = $(id + '-wl');
  if (wl) wl.style.visibility = R.w < 600 ? 'hidden' : 'visible';
  const cred = $(id + '-cred');
  if (cred) cred.textContent = CRED[nome.startsWith('normal') ? 'normal' : nome];
  const oe = $(id + '-oe'), od = $(id + '-od');
  if (oe) { oe.textContent = nome === 'pneumo' ? 'A' : 'D'; od.textContent = nome === 'pneumo' ? 'P' : 'E'; }
  const vr = $(id + '-varre');
  if (vr) {
    const u = extra.varre;
    if (u == null || u < 0 || u >= 1) vr.style.visibility = 'hidden';
    else { vr.style.visibility = 'visible'; vr.style.top = (u * R.h) + 'px'; vr.style.opacity = Math.sin(Math.PI * u); }
  }
  const al = $(id + '-alarme');
  if (al) al.style.opacity = extra.alarme || 0;
  return (nx, ny) => [R.x + R.w / 2 + (nx - v.fx) * iw * s, R.y + R.h / 2 + (ny - v.fy) * ih * s];
}
// vista animada: ks = [[t, z, fx, fy], ...]
function vista(t, ks) {
  if (t <= ks[0][0]) return { z: ks[0][1], fx: ks[0][2], fy: ks[0][3] };
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1];
    if (t <= b[0]) { const u = vaivem((t - a[0]) / (b[0] - a[0])); return { z: lerp(a[1], b[1], u), fx: lerp(a[2], b[2], u), fy: lerp(a[3], b[3], u) }; }
  }
  const k = ks[ks.length - 1];
  return { z: k[1], fx: k[2], fy: k[3] };
}
const varreEm = (t, t0, d = 0.55) => (t >= t0 && t < t0 + d ? (t - t0) / d : null);

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
// contorno desenhado aos poucos (u de 0 a 1), com preenchimento que acende no fim
function contorno(P, pts, u, { cor = '#C1FF72', fechada = true, larg = 6, preenche = 0.18, classe = 'neon', tracejado = '' } = {}) {
  if (u <= 0) return '';
  const d = curva(pts.map(([x, y]) => P(x, y)), fechada);
  const dash = u < 1 ? `pathLength="1" stroke-dasharray="${u.toFixed(3)} 1.01"` : tracejado ? `stroke-dasharray="${tracejado}"` : '';
  const fill = fechada && preenche > 0 ? `<path d="${d}" fill="${cor}" opacity="${(preenche * clamp((u - 0.7) / 0.3)).toFixed(3)}"/>` : '';
  return `${fill}<path d="${d}" fill="none" stroke="${cor}" stroke-width="${larg}" stroke-linecap="round" stroke-linejoin="round" ${dash} class="${classe}"/>`;
}
const anel = (x, y, r, t, t0, cor = '#C1FF72') => {
  if (t < t0) return '';
  const e = back((t - t0) / 0.35), ritmo = ((t - t0) * 1.6) % 1;
  return `<circle cx="${x}" cy="${y}" r="${r * e}" fill="none" stroke="${cor}" stroke-width="6" class="${cor === '#C1FF72' ? 'neon' : cor === '#FF4D57' ? 'neon-v' : ''}"/>
    <circle cx="${x}" cy="${y}" r="${r * (1 + 0.6 * ritmo)}" fill="none" stroke="${cor}" stroke-width="4" opacity="${(1 - ritmo) * 0.8}"/>`;
};
const linha = (a, b, u, cor = '#fff', larg = 5, dash = '') => {
  if (u <= 0) return '';
  const x2 = lerp(a[0], b[0], clamp(u)), y2 = lerp(a[1], b[1], clamp(u));
  return `<line x1="${a[0]}" y1="${a[1]}" x2="${x2}" y2="${y2}" stroke="${cor}" stroke-width="${larg}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
};
const chip = (t, t0, html, x, y, { cls = '', tam = 34, ancora = 'c', ate = 99 } = {}) => {
  if (t < t0 || t > ate + 0.25) return '';
  const tr = ancora === 'e' ? 'translate(0,-50%)' : ancora === 'd' ? 'translate(-100%,-50%)' : 'translate(-50%,-50%)';
  const orig = ancora === 'e' ? 'left center' : ancora === 'd' ? 'right center' : 'center';
  return `<div class="chip ${cls}" style="left:${x}px;top:${y}px;font-size:${tam}px;padding:${Math.round(tam * 0.36)}px ${Math.round(tam * 0.56)}px;transform:${tr} scale(${pop(t, t0) * (1 - surge(t, ate, 0.2))});transform-origin:${orig}">${html}</div>`;
};
const selo = (t, t0, txt, x, y, { alerta = false, tam = 96, ate = 99, rot = -5 } = {}) => {
  if (t < t0 || t > ate + 0.3) return '';
  const s = pop(t, t0, 0.36) * (1 - surge(t, ate, 0.25));
  return `<div class="selo ${alerta ? 'alerta' : ''}" style="left:${x}px;top:${y}px;font-size:${tam}px;padding:${Math.round(tam * 0.26)}px ${Math.round(tam * 0.45)}px;transform:translate(-50%,-50%) scale(${s}) rotate(${rot}deg)">${txt}</div>`;
};
const duas = (a, b) => `<span style="display:block;line-height:1.05">${a}<small style="display:block;font:700 .62em/1.2 var(--texto);opacity:.85;margin-top:4px">${b}</small></span>`;

// ---------------------------------------------------------------- cenas
const cenas = $('cenas');
function cena(id, html) { const d = document.createElement('div'); d.className = 'cena'; d.id = id; d.innerHTML = html; cenas.appendChild(d); return d; }
const VIS = { x: 60, y: 270, w: 960, h: 780 };
const SVGT = (id) => `<svg id="${id}" width="1080" height="1920" style="position:absolute;left:0;top:0;overflow:visible"></svg>`;
const CAM = (id) => `<div id="${id}" style="position:absolute;inset:0"></div>`;
const PILHA = ['normal08', 'normal11', 'normal16', 'normal21', 'normal26'];
const MNEMO = [['B', 'Blood', 'sangue'], ['C', 'Can', 'cisternas'], ['B', 'Be', 'brain · cérebro'], ['V', 'Very', 'ventrículos'], ['B', 'Bad', 'bone · osso']];

cena('c-gancho', `<div class="manchete" id="g-1" style="top:120px;font-size:124px"><span>TC</span><span>de</span><span>crânio</span></div>
  <div class="manchete" id="g-2" style="top:252px;font-size:104px"><span>na</span><span class="lima">emergência</span></div>
  ${visorHTML('v-g', PILHA)}${SVGT('g-svg')}${CAM('g-cam')}`);
cena('c-mnemo', MNEMO.map(([l, en, pt], i) => `<div class="linha" id="mn-${i}"><div class="letra">${l}</div><div><div class="en">${en}</div><div class="pt">${pt}</div></div></div>`).join('') + CAM('mn-cam'));
cena('c-dens', `${visorHTML('v-d', ['desvio'])}<div class="barra" id="d-barra"></div>${SVGT('d-svg')}${CAM('d-cam')}`);
cena('c-blood', [0, 1, 2].map((i) => miniHTML('t-' + i, ['epidural', 'subdural', 'hsa'][i])).join('') + SVGT('b-svg') + CAM('b-cam'));
cena('c-epi', `${visorHTML('v-epi', ['epidural'])}${SVGT('epi-svg')}${CAM('epi-cam')}`);
cena('c-sub', `${visorHTML('v-sub', ['subdural'])}${SVGT('sub-svg')}${CAM('sub-cam')}`);
cena('c-hsa', `${visorHTML('v-hsa', ['hsa'])}${SVGT('hsa-svg')}${CAM('hsa-cam')}`);
cena('c-cis', `${visorHTML('v-cis', ['normal26'])}<div class="visor" id="cis-esq" style="background:#0A0A0A"><svg id="cis-esq-svg" width="470" height="680"></svg></div>${SVGT('cis-svg')}${CAM('cis-cam')}`);
cena('c-cer', `${visorHTML('v-cer', ['avc'])}${SVGT('cer-svg')}${CAM('cer-cam')}`);
cena('c-avc', `${visorHTML('v-avc', ['normal16'])}${SVGT('avc-svg')}${CAM('avc-cam')}`);
cena('c-ven', `${visorHTML('v-ven', ['hidro', 'desvio'])}${SVGT('ven-svg')}${CAM('ven-cam')}`);
cena('c-osso', `${visorHTML('v-os', ['fratura', 'pneumo'])}${SVGT('os-svg')}${CAM('os-cam')}`);
const MINIS = [['epidural', 0.27, 0.5, 1.2], ['normal26', 0.5, 0.45, 2.0], ['avc', 0.32, 0.42, 1.3], ['hidro', 0.5, 0.5, 1.15], ['fratura', 0.3, 0.33, 1.6]];
cena('c-res', CAPS.map(([, l, nome], i) => `<div class="linha" id="rs-${i}"><div class="letra">${l}</div><div class="en" style="font-size:82px">${nome}</div></div>`).join('')
  + MINIS.map(([n], i) => miniHTML('rm-' + i, n)).join('') + CAM('rs-cam'));
cena('c-fim', `<div class="botao lima" id="b-salva"><span>${IC.salvar}</span>Salva</div><div class="botao" id="b-segue"><span>${IC.seguir}</span>Segue @omedbot</div>
  <div id="marca" style="color:var(--lima)">@omedbot</div>`);
$('hud').innerHTML = CAPS.map(([, l, n]) => `<div><span><em>${l}</em> ${n}</span><b><i></i></b></div>`).join('');

// ---------------------------------------------------------------- legenda: blocos de até 3 palavras (com exceções)
const T_PERG = PAL('gancho', 'o'), T_MN_EN = PAL('gancho-2', 'blood'), T_RS_EN = PAL('resumo', 'blood');
const blocos = [];
T.falas.forEach((f, i) => {
  let ws = T.palavras.filter((p) => p.fala === i);
  if (f.cena === 'gancho') { blocos.push({ fala: f, ws: ws.filter((w) => w.ini >= T_PERG - 0.01) }); return; }
  if (f.cena === 'gancho-2') ws = ws.filter((w) => w.ini < T_MN_EN - 0.01);
  if (f.cena === 'resumo') { blocos.push({ fala: f, ws: ws.filter((w) => w.ini >= T_RS_EN - 0.01), lima: true }); return; }
  let k = 0;
  while (k < ws.length) {
    let n = Math.min(3, ws.length - k);
    if (ws.length - k - n === 1) n += 1;
    blocos.push({ fala: f, ws: ws.slice(k, k + n) });
    k += n;
  }
});
const legendaY = (c) => (c === 'fim' ? 300 : 1150);

// ---------------------------------------------------------------- Medbot: pula para um lado a cada cena, como um professor
const LE = 225, LD = 855, YB = 1450, SB = 380;
const PULOS = [
  [C.mnemo[0], LD], [C.dens[0], LE], [C.blood[0] + 0.85, LD], [C.epidural[0], LE], [C.subdural[0], LD], [C.hsa[0], LE],
  [C.cisternas[0] + 0.85, LD], [PAL('cisternas', 'apagadas') - 0.25, 540], [C.cerebro[0] + 0.85, LE], [PAL('cerebro', 'sumiu') - 0.3, LD],
  [C.avc[0], LE], [C.ventriculos[0] + 0.85, LD], [PAL('ventriculos', 'empurrados') - 0.3, LE], [C.osso[0] + 0.85, LD],
  [PAL('osso', 'ar') - 0.3, LE], [C.resumo[0], 540],
];
const KB = [[0, 540, 2500, 520], [0.45, 540, 1520, 520]];
{
  let ant = KB[1];
  for (const [t0, x] of PULOS) {
    const y = x === 540 && t0 >= C.resumo[0] ? 1440 : YB, s = t0 >= C.resumo[0] ? 420 : SB;
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
const CARA = { gancho: 'normal', 'gancho-2': 'feliz', regra: 'normal', 'regra-escala': 'normal', blood: 'desconfiado', epidural: 'normal', subdural: 'normal',
  hsa: 'surpreso', cisternas: 'preocupado', cerebro: 'normal', avc: 'desconfiado', ventriculos: 'normal', osso: 'normal', resumo: 'feliz', fim: 'feliz' };
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
function deslocCena(t, ini, fim) {
  const e = 1 - sai((t - ini) / 0.32), s = entra((t - (fim - 0.08)) / 0.26);
  return { x: e * 1150 - s * 1150, blur: 22 * Math.max(t < ini + 0.32 ? Math.sin(Math.PI * clamp((t - ini) / 0.32)) : 0, Math.sin(Math.PI * clamp((t - (fim - 0.08)) / 0.26))), vis: t >= ini - 0.01 && t < fim + 0.2 };
}
const aplica = (el, d) => { el.style.visibility = d.vis ? 'visible' : 'hidden'; el.style.transform = `translateX(${d.x}px)`; el.style.filter = d.blur > 0.5 ? `blur(${d.blur}px)` : 'none'; };

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

// ---------------------------------------------------------------- tempos-chave
const T_EMERG = PAL('gancho', 'emergencia'), T_PRIM = PAL('gancho', 'primeiro');
const PILHA_T = [0.05, 0.3, 0.55, 0.8, 1.05, 1.3, 1.55];
const PILHA_N = [0, 1, 2, 3, 4, 3, 2];
const T_MN = ['blood', 'can', 'be', 'very', 'bad'].map((w) => PAL('gancho-2', w));
const T_VOA = C.dens[0] - 0.12;
const T_REGRA_Q = PAL('regra', 'quanto'), T_DENSO = PAL('regra', 'denso'), T_BRANCO = PAL('regra', 'branco');
const T_ESC = F('regra-escala').ini;
const PINS = [
  { t: PAL('regra-escala', 'ar'), nome: 'ar', uh: 'cerca de −1000 UH', p: [0.08, 0.07], bar: 0, chip: [168, 330] },
  { t: PAL('regra-escala', 'liquor'), nome: 'líquor', uh: '0 a 15 UH', p: [0.665, 0.6], bar: 0.12, chip: [905, 640] },
  { t: PAL('regra-escala', 'osso'), nome: 'osso', uh: 'até +1000 UH', p: [0.905, 0.5], bar: 1, chip: [905, 470] },
  { t: PAL('regra-escala', 'sangue'), nome: 'sangue fresco', uh: '50 a 80 UH', p: [0.18, 0.52], bar: 0.86, chip: [168, 640] },
];
const T_TAMBEM = PAL('regra-escala', 'tambem');
const T_PROCURA = PAL('blood', 'procura'), T_ONDE = PAL('blood', 'onde');
const T_LENTE = PAL('epidural', 'lente'), T_SUT1 = PAL('epidural', 'suturas'), T_EPI = PAL('epidural', 'epidural'), T_MMA = PAL('epidural', 'arteria');
const T_LUA = PAL('subdural', 'meia'), T_CRUZ = PAL('subdural', 'cruzando'), T_SUB = PAL('subdural', 'subdural'), T_VEIAS = PAL('subdural', 'veias'), T_IDOSO = PAL('subdural', 'classico');
const T_CIST = PAL('hsa', 'cisternas'), T_SULCOS = PAL('hsa', 'sulcos'), T_HSA = PAL('hsa', 'subaracnoide'), T_SEMTR = PAL('hsa', 'sem'), T_ANEU = PAL('hsa', 'aneurisma');
const T_ABERTAS = PAL('cisternas', 'base'), T_APAG = PAL('cisternas', 'apagadas'), T_HIC = PAL('cisternas', 'hipertensao'), T_HERN = PAL('cisternas', 'risco');
const T_COMPARA = PAL('cerebro', 'compara'), T_SUMIU = PAL('cerebro', 'sumiu'), T_BRANCA = PAL('cerebro', 'branca'), T_AVC = PAL('cerebro', 'avc');
const T_HORAS = PAL('avc', 'primeiras'), T_NORMAL = PAL('avc', 'normal'), T_EXCLUIR = PAL('avc', 'excluir'), T_SANGR = PAL('avc', 'sangramento'), T_TROMBO = PAL('avc', 'trombolitico');
const T_DILAT = PAL('ventriculos', 'dilatados'), T_HIDRO = PAL('ventriculos', 'hidrocefalia'), T_EMP = PAL('ventriculos', 'empurrados'), T_EFEITO = PAL('ventriculos', 'efeito'), T_DESVIO = PAL('ventriculos', 'desvio');
const T_JANELA = PAL('osso', 'janela'), T_CACAR = PAL('osso', 'cacar'), T_FRAT = PAL('osso', 'fratura'), T_AR = PAL('osso', 'ar'), T_CRANIO = PAL('osso', 'cranio'), T_COMUN = PAL('osso', 'fratura', 2);
const T_RS = ['sangue', 'cisternas', 'cerebro', 'ventriculos', 'osso'].map((w) => PAL('resumo', w));
const T_RE = ['blood', 'can', 'be', 'very', 'bad'].map((w) => PAL('resumo', w));

// formas sobre as imagens (coordenadas de 0 a 1 na imagem preparada)
const LENTE = [[0.31, 0.15], [0.22, 0.2], [0.15, 0.3], [0.115, 0.42], [0.11, 0.55], [0.13, 0.68], [0.17, 0.78], [0.22, 0.85],
  [0.28, 0.8], [0.33, 0.7], [0.37, 0.57], [0.38, 0.44], [0.37, 0.31], [0.34, 0.21]];
const LUA = [[0.6, 0.085], [0.7, 0.11], [0.78, 0.17], [0.845, 0.27], [0.875, 0.39], [0.88, 0.5], [0.865, 0.62], [0.83, 0.72],
  [0.8, 0.66], [0.81, 0.56], [0.81, 0.45], [0.79, 0.33], [0.74, 0.22], [0.67, 0.14]];
const ESTRELA = [[0.46, 0.37], [0.52, 0.355], [0.58, 0.38], [0.63, 0.45], [0.61, 0.52], [0.55, 0.5], [0.5, 0.53], [0.45, 0.5], [0.41, 0.45]];
const CISTERNA = [[0.45, 0.39], [0.5, 0.37], [0.555, 0.39], [0.565, 0.44], [0.54, 0.48], [0.5, 0.47], [0.46, 0.48], [0.435, 0.44]];
const INFARTO = [[0.42, 0.08], [0.47, 0.2], [0.47, 0.35], [0.45, 0.5], [0.38, 0.58], [0.3, 0.62], [0.25, 0.72], [0.2, 0.82], [0.13, 0.75], [0.08, 0.6],
  [0.07, 0.42], [0.12, 0.25], [0.22, 0.13], [0.32, 0.08]];
const MEIO_AVC = [[0.6, 0.04], [0.41, 0.95]];
const VENTR = [[0.36, 0.27], [0.47, 0.28], [0.5, 0.33], [0.53, 0.28], [0.64, 0.27], [0.67, 0.33], [0.62, 0.45], [0.66, 0.55], [0.73, 0.62], [0.75, 0.75],
  [0.69, 0.82], [0.62, 0.78], [0.58, 0.62], [0.5, 0.57], [0.42, 0.62], [0.38, 0.78], [0.31, 0.82], [0.25, 0.75], [0.27, 0.62], [0.34, 0.55], [0.38, 0.45], [0.33, 0.33]];
const HEMATOMA = [[0.3, 0.15], [0.2, 0.2], [0.11, 0.32], [0.075, 0.5], [0.1, 0.68], [0.2, 0.8], [0.3, 0.85], [0.33, 0.7], [0.35, 0.5], [0.34, 0.3]];
const MEIO_DESVIO = [[0.49, 0.06], [0.525, 0.94]];
const SEPTO = [[0.6, 0.27], [0.585, 0.55]];
const FRATURA = [0.21, 0.325];
const BOLHAS = [[0.635, 0.165], [0.75, 0.25], [0.85, 0.32], [0.875, 0.45], [0.66, 0.42]];
const SEIO = [[0.2, 0.12], [0.28, 0.12], [0.3, 0.2], [0.28, 0.3], [0.21, 0.3], [0.19, 0.2]];

// ---------------------------------------------------------------- deixas de som (para tools/mix.py)
const CUES = [];
const som = (t, s, v = 1) => CUES.push({ t: Math.max(0, +t.toFixed(3)), som: s, vol: v });
som(0.0, 'scanner', 0.9);
PILHA_T.forEach((tp) => som(tp, 'clique', 0.45));
som(T_EMERG, 'alarme', 0.45); som(T_PRIM, 'tum', 0.8); som(T_PRIM + 0.02, 'pop', 0.5);
for (const c of ['mnemo', 'dens', 'epidural', 'subdural', 'hsa', 'avc', 'resumo', 'fim']) som(C[c][0] - 0.06, 'whoosh', 0.55);
for (const [c] of CAPS) { som(C[c][0] - 0.06, 'whoosh', 0.6); som(C[c][0] + 0.02, 'tum', 0.55); som(C[c][0] + 0.72, 'whoosh', 0.35); }
for (const s of SALTOS) if (s > 0.5) som(s + 0.02, 'boing', 0.38);
T_MN.forEach((tm, i) => som(tm, i === 4 ? 'ding' : 'pop', i === 4 ? 0.6 : 0.5));
som(T_VOA, 'whoosh', 0.45);
som(C.dens[0] + 0.02, 'pop', 0.6); som(T_REGRA_Q, 'riser', 0.35); som(T_BRANCO, 'ding', 0.5);
PINS.forEach((p) => som(p.t, 'pop', 0.5)); som(T_TAMBEM + 0.1, 'ding', 0.45);
[0, 1, 2].forEach((i) => som(T_PROCURA + i * 0.17, 'pop', 0.45)); som(T_ONDE, 'scanner', 0.35);
som(T_LENTE + 0.05, 'zoom', 0.5); som(T_SUT1, 'pop', 0.45); som(T_EPI, 'tum', 0.7); som(T_MMA, 'pop', 0.45);
som(T_LUA + 0.05, 'zoom', 0.5); som(T_CRUZ, 'pop', 0.45); som(T_SUB, 'tum', 0.7); som(T_VEIAS, 'pop', 0.45); som(T_IDOSO, 'pop', 0.4);
som(T_CIST, 'zoom', 0.5); som(T_SULCOS, 'pop', 0.45); som(T_HSA, 'tum', 0.7); som(T_ANEU, 'alarme', 0.4);
som(T_ABERTAS, 'zoom', 0.45); som(T_APAG, 'whoosh', 0.45); som(T_HIC, 'pop', 0.5); som(T_HERN, 'alarme', 0.75); som(T_HERN, 'tum', 0.6);
som(T_COMPARA, 'clique', 0.4); som(T_COMPARA + 0.35, 'clique', 0.35); som(T_SUMIU, 'zoom', 0.45); som(T_AVC, 'tum', 0.7);
som(T_HORAS, 'pop', 0.45); som(T_NORMAL, 'ding', 0.45); som(T_EXCLUIR, 'scanner', 0.4); som(T_SANGR, 'pop', 0.5); som(T_TROMBO, 'ding', 0.55);
som(T_DILAT, 'zoom', 0.45); som(T_HIDRO, 'tum', 0.7); som(T_EMP - 0.1, 'clique', 0.45); som(T_EFEITO, 'pop', 0.45); som(T_DESVIO, 'pop', 0.5);
som(T_JANELA, 'clique', 0.5); som(T_CACAR, 'zoom', 0.5); som(T_FRAT + 0.1, 'pop', 0.5); som(T_AR - 0.1, 'clique', 0.45);
BOLHAS.forEach((b, i) => som(T_AR + 0.1 + i * 0.16, 'pop', 0.35)); som(T_COMUN, 'alarme', 0.35);
T_RS.forEach((tr) => som(tr, 'ding', 0.42)); T_RE.forEach((tr) => som(tr, 'pop', 0.45));
som(C.fim[0] - 1.15, 'riser', 0.5); som(PAL('fim', 'salva'), 'ding', 0.6); som(PAL('fim', 'segue'), 'pop', 0.6);
CUES.sort((a, b) => a.t - b.t);
window.CUES = CUES;

// ---------------------------------------------------------------- um quadro
function seek(t) {
  desenhaFundo(t);
  let alvo = null, laser = false, tremor = 0, flash = 0, corFlash = '255,255,255';
  const quer = (a) => { laser = true; alvo = a; };

  // ---- Gancho: rolagem dos cortes, emergência e a pergunta
  {
    const el = $('c-gancho');
    el.style.visibility = t < C.gancho[1] + 0.3 ? 'visible' : 'hidden';
    const sai2 = surge(t, C.gancho[1] - 0.12, 0.25);
    el.style.opacity = 1 - sai2;
    el.style.transform = `scale(${1 + 0.08 * sai2})`;
    const pal = [['tc'], ['de'], ['cranio'], ['na'], ['emergencia']];
    let i = 0;
    for (const id of ['g-1', 'g-2']) for (const sp of $(id).children) {
      const p = pop(t, PAL('gancho', pal[i++][0]) - 0.04, 0.3);
      sp.style.transform = `scale(${p}) rotate(${(1 - clamp(p)) * -8}deg)`; sp.style.opacity = clamp(p * 3);
    }
    let k = 0;
    for (let j = 0; j < PILHA_T.length; j++) if (t >= PILHA_T[j]) k = PILHA_N[j];
    const R = { x: 110, y: 400, w: 860, h: 640 };
    const alarme = t >= T_EMERG ? 0.9 * Math.abs(Math.sin((t - T_EMERG) * 9)) * Math.exp(-(t - T_EMERG) * 1.1) : 0;
    const P = poeVisor('v-g', R, PILHA[k], { z: 1 + 0.03 * t, fx: 0.5, fy: 0.5 }, { varre: varreEm(t, 0.05, 1.5), alarme });
    $('v-g-info').innerHTML = `Axial · <b>${k + 1}</b>/5`;
    const pv = pop(t, 0.0, 0.45);
    $('v-g').style.transform = `scale(${0.88 + 0.12 * pv})`; $('v-g').style.opacity = clamp(pv * 2);
    let h = '';
    if (t >= T_PRIM - 0.05) {
      const p = pop(t, T_PRIM - 0.05, 0.42);
      h += `<div style="position:absolute;left:540px;top:720px;width:300px;height:300px;margin:-150px 0 0 -150px;border-radius:50%;background:var(--lima);color:var(--tinta);
        display:flex;align-items:center;justify-content:center;font:800 250px/1 var(--titulo);box-shadow:0 0 0 18px rgba(193,255,114,.25),0 30px 80px rgba(0,0,0,.6);
        transform:scale(${p}) rotate(${(1 - clamp(p)) * 25 + 6 * Math.sin(t * 4)}deg)">?</div>`;
      if (t < T_PRIM + 0.22) tremor = Math.max(tremor, 14 * (1 - (t - T_PRIM) / 0.22));
    }
    $('g-cam').innerHTML = h;
    $('g-svg').innerHTML = '';
    if (t > 0.9 && t < T_PRIM - 0.1) quer(P(0.5, 0.5));
  }

  // ---- Mnemônico: Blood Can Be Very Bad (e as linhas voam para a barra)
  {
    const el = $('c-mnemo');
    el.style.visibility = t >= C.mnemo[0] - 0.05 && t < T_VOA + 0.5 ? 'visible' : 'hidden';
    const largHud = (960 - 4 * 12) / 5;
    MNEMO.forEach((m, i) => {
      const row = $('mn-' + i);
      const ent = pop(t, C.mnemo[0] + 0.1 + i * 0.07, 0.4);
      const cheio = t >= T_MN[i] - 0.03;
      const letra = row.querySelector('.letra');
      letra.className = 'letra' + (cheio ? '' : ' vazia');
      const pl = cheio ? pop(t, T_MN[i] - 0.03, 0.35) : 1;
      letra.style.transform = `scale(${pl})`;
      const en = row.querySelector('.en'), pt = row.querySelector('.pt');
      en.style.opacity = cheio ? 1 : 0; en.style.transform = `translateX(${cheio ? (1 - sai((t - T_MN[i]) / 0.25)) * 60 : 60}px)`;
      pt.style.opacity = surge(t, T_MN[i] + 0.12, 0.25);
      const voa = vaivem((t - (T_VOA + i * 0.04)) / 0.42);
      const x0 = 230, y0 = 410 + i * 148;
      const hx = 60 + i * (largHud + 12) + 18, hy = 190;
      const x = lerp(x0, hx, voa), y = lerp(y0, hy, voa), s = lerp(1, 0.2, voa) * ent;
      row.style.transform = `translate(${x}px, ${y}px) translateY(-50%) scale(${s})`;
      row.style.opacity = clamp(ent * 2) * (1 - clamp((voa - 0.7) / 0.3));
      row.style.filter = voa > 0.02 && voa < 0.98 ? `blur(${Math.sin(Math.PI * voa) * 5}px)` : 'none';
    });
    if (t >= T_MN[0] - 0.1 && t < T_VOA) { const k = T_MN.filter((x) => x <= t + 0.05).length - 1; quer([288, 410 + Math.max(0, k) * 148]); }
  }

  // ---- Densidade: regra de ouro, escala e a TC com ar, líquor, osso e sangue
  {
    const el = $('c-dens');
    const d = deslocCena(t, C.dens[0], C.dens[1]);
    aplica(el, d);
    if (d.vis) {
      const m = vaivem((t - (T_ESC - 0.15)) / 0.55);
      // barra: grande no meio (regra), depois embaixo do visor (escala)
      const bx = 90, bw = 900, by = lerp(600, 935, m), bh = lerp(120, 60, m);
      const rev = sai((t - (C.dens[0] + 0.15)) / 0.5);
      const barra = $('d-barra');
      barra.style.left = bx + 'px'; barra.style.top = by + 'px'; barra.style.width = bw + 'px'; barra.style.height = bh + 'px';
      barra.style.clipPath = `inset(0 ${(1 - rev) * 100}% 0 0 round 22px)`;
      const g = t >= T_BRANCO ? 0.6 + 0.4 * Math.sin((t - T_BRANCO) * 8) : 0;
      barra.style.boxShadow = `0 0 0 3px rgba(255,255,255,.18), 0 20px 50px rgba(0,0,0,.5), ${g > 0 && m < 1 ? `${18 * g}px 0 ${40 * g}px rgba(255,255,255,${0.5 * g * (1 - m)})` : '0 0 0 transparent'}`;
      // visor
      const pv = m;
      const R = { x: 60, y: lerp(-700, 270, pv), w: 960, h: 600 };
      const vis = $('v-d');
      vis.style.visibility = pv > 0.01 ? 'visible' : 'hidden';
      const P = poeVisor('v-d', R, 'desvio', { z: 1, fx: 0.5, fy: 0.5 }, { varre: varreEm(t, T_ESC + 0.3) });
      let s = '';
      // seta da regra
      if (m < 1) {
        const ua = clamp((t - T_REGRA_Q) / (T_DENSO + 0.3 - T_REGRA_Q));
        if (ua > 0) s += `<g opacity="${1 - m}">${linha([110, 790], [970, 790], ua, '#C1FF72', 9)}${ua > 0.97 ? `<path d="M948 768 L980 790 L948 812" fill="none" stroke="#C1FF72" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` : ''}</g>`;
      }
      // pinos
      if (m >= 1) {
        PINS.forEach((p) => {
          if (t < p.t - 0.05) return;
          const [x, y] = P(p.p[0], p.p[1]);
          const branco = (p.nome === 'osso' || p.nome === 'sangue fresco') && t >= T_TAMBEM;
          s += anel(x, y, 30, t, p.t - 0.05, branco && Math.sin((t - T_TAMBEM) * 12) > 0 ? '#ffffff' : '#C1FF72');
          const [cx, cy] = p.chip;
          s += `<line x1="${x}" y1="${y}" x2="${cx}" y2="${cy}" stroke="#C1FF72" stroke-width="3" opacity="${surge(t, p.t, 0.2) * 0.8}"/>`;
        });
      }
      $('d-svg').innerHTML = s;
      let h = '';
      h += selo(t, C.dens[0] + 0.02, 'Regra de ouro', 540, 400, { tam: 92, ate: T_ESC - 0.1 });
      if (m < 1) {
        const o = 1 - m;
        h += `<div style="opacity:${o}">`;
        h += chip(t, T_DENSO - 0.05, 'mais denso', 970, 870, { ancora: 'd', tam: 40 });
        h += chip(t, T_REGRA_Q, 'menos denso', 110, 870, { ancora: 'e', tam: 40, cls: '' });
        h += chip(t, T_BRANCO - 0.05, 'mais branco', 990, 540, { ancora: 'd', tam: 44 });
        h += `</div>`;
      }
      if (m >= 1) {
        PINS.forEach((p, i) => {
          h += chip(t, p.t - 0.02, duas(p.nome, p.uh), p.chip[0], p.chip[1], { tam: 32 });
          if (t >= p.t) {
            const mx = bx + 22 + p.bar * (bw - 44);
            h += `<div class="marca-barra" style="left:${mx}px;top:${by + bh / 2 - 22}px;transform:translate(-50%,-50%) scale(${pop(t, p.t, 0.3)})"><span>${p.nome === 'sangue fresco' ? 'sangue' : p.nome}</span><i></i></div>`;
          }
        });
        h += `<div class="marca-barra" style="left:${bx + 22 + 0.42 * (bw - 44)}px;top:${by + bh / 2 - 22}px;opacity:${0.75 * surge(t, T_ESC + 0.4)}"><span style="color:#cfd8db">cérebro</span><i style="border-color:#cfd8db;box-shadow:none"></i></div>`;
      }
      $('d-cam').innerHTML = h;
      if (t >= C.dens[0] + 0.3 && t < T_ESC - 0.1) quer(t >= T_BRANCO - 0.05 ? [980, by + bh / 2] : t >= T_REGRA_Q ? [lerp(110, 970, clamp((t - T_REGRA_Q) / (T_DENSO + 0.3 - T_REGRA_Q))) + d.x, 790] : [540 + d.x, 400]);
      if (m >= 1) {
        const atual = PINS.filter((p) => t >= p.t - 0.05).pop();
        if (atual && t < C.dens[1] - 0.1) { const [x, y] = P(atual.p[0], atual.p[1]); quer([x + d.x, y]); }
      }
    }
  }

  // ---- Blood: três TCs, procura o branco
  {
    const ini = conteudo('blood');
    const d = deslocCena(t, ini, C.blood[1]);
    aplica($('c-blood'), d);
    if (d.vis) {
      const TILES = [['epidural', 0.27, 0.5, 1.15, [0.24, 0.5], 'lente'], ['subdural', 0.72, 0.42, 1.15, [0.8, 0.42], 'meia-lua'], ['hsa', 0.52, 0.46, 1.5, [0.53, 0.45], 'cisternas']];
      let s = '', h = '';
      TILES.forEach(([n, fx, fy, z, alvoN, rot], i) => {
        const R = { x: 60 + i * 335, y: 400, w: 290, h: 480 };
        const p = pop(t, T_PROCURA + i * 0.17 - 0.05, 0.4);
        const el = $('t-' + i);
        el.style.transform = `scale(${p}) rotate(${(1 - clamp(p)) * (i - 1) * 8}deg)`; el.style.opacity = clamp(p * 2);
        const P = poeVisor('t-' + i, R, n, { z: z * (1 + 0.02 * (t - ini)), fx, fy }, { cobre: true });
        const [x, y] = P(alvoN[0], alvoN[1]);
        s += anel(x, y, 52, t, T_ONDE + i * 0.1);
        h += chip(t, PAL('blood', 'nao') + i * 0.12, rot, R.x + R.w / 2, R.y + R.h + 50, { tam: 36 });
      });
      $('b-svg').innerHTML = s;
      h += chip(t, ini + 0.05, 'branco = sangue fresco', 540, 340, { tam: 40 });
      $('b-cam').innerHTML = h;
      if (t >= T_PROCURA && t < C.blood[1] - 0.1) {
        const i = t >= T_ONDE ? Math.min(2, Math.floor((t - T_ONDE) / 0.3)) : 0;
        quer([60 + i * 335 + 145 + d.x, 640]);
      }
    }
  }

  // ---- Epidural: lente que não cruza a sutura
  {
    const ini = C.epidural[0];
    const d = deslocCena(t, ini, C.epidural[1]);
    aplica($('c-epi'), d);
    if (d.vis) {
      const v = vista(t, [[ini, 1, 0.5, 0.5], [T_LENTE, 1, 0.5, 0.5], [T_LENTE + 0.6, 1.12, 0.38, 0.5]]);
      const P = poeVisor('v-epi', VIS, 'epidural', v, { varre: varreEm(t, ini + 0.15) });
      let s = contorno(P, LENTE, clamp((t - (T_LENTE + 0.25)) / 0.6));
      // as suturas: a lente para nelas
      if (t >= T_SUT1 - 0.05) {
        for (const [a, b] of [[[0.27, 0.115], [0.35, 0.175]], [[0.17, 0.865], [0.25, 0.84]]]) {
          const u = clamp((t - (T_SUT1 - 0.05)) / 0.25);
          s += linha(P(a[0], a[1]), P(lerp(a[0], b[0], 1), lerp(a[1], b[1], 1)), u, '#FF4D57', 9);
        }
      }
      // artéria meníngea média: o sangue arterial pulsando junto do osso
      if (t >= T_MMA - 0.05) {
        const pts = LENTE.slice(0, 8).map(([x, y]) => P(x + 0.012, y));
        const pul = 0.5 + 0.5 * Math.sin((t - T_MMA) * 14);
        s += `<path d="${curva(pts, false)}" fill="none" stroke="#FF4D57" stroke-width="${7 + 5 * pul}" stroke-linecap="round" class="neon-v" pathLength="1" stroke-dasharray="${clamp((t - T_MMA + 0.05) / 0.5).toFixed(3)} 1.01" opacity=".95"/>`;
      }
      $('epi-svg').innerHTML = s;
      let h = '';
      const [lx, ly] = P(0.44, 0.36);
      h += chip(t, T_LENTE + 0.3, 'lente biconvexa', lx + 30, ly - 40, { ancora: 'e', tam: 38, ate: T_MMA - 0.1 });
      const [s1x, s1y] = P(0.29, 0.14), [s2x, s2y] = P(0.2, 0.87);
      h += chip(t, T_SUT1, `${IC.x}para na sutura`, s1x - 30, s1y + 40, { ancora: 'd', tam: 30, cls: 'alerta', ate: T_MMA - 0.1 });
      h += chip(t, T_SUT1 + 0.12, `${IC.x}para na sutura`, s2x - 30, s2y - 10, { ancora: 'd', tam: 30, cls: 'alerta', ate: T_MMA - 0.1 });
      h += selo(t, T_EPI - 0.04, 'Epidural', 760, 820, { tam: 96 });
      const [mx, my] = P(0.5, 0.62);
      h += chip(t, T_MMA - 0.02, duas('a. meníngea média', 'sangue arterial'), mx + 40, my, { ancora: 'e', tam: 34, cls: 'alerta' });
      $('epi-cam').innerHTML = h;
      if (t >= T_EPI - 0.04 && t < T_EPI + 0.2) tremor = Math.max(tremor, 12 * (1 - (t - T_EPI + 0.04) / 0.24));
      if (t >= ini + 0.3 && t < C.epidural[1] - 0.1) {
        const a = t >= T_MMA ? P(0.13, 0.5) : t >= T_SUT1 - 0.05 ? (t < T_SUT1 + 0.35 ? P(0.31, 0.145) : P(0.22, 0.855)) : P(0.25, 0.5);
        quer([a[0] + d.x, a[1]]);
      }
    }
  }

  // ---- Subdural: meia-lua que cruza a sutura
  {
    const ini = C.subdural[0];
    const d = deslocCena(t, ini, C.subdural[1]);
    aplica($('c-sub'), d);
    if (d.vis) {
      const v = vista(t, [[ini, 1, 0.5, 0.5], [T_LUA, 1, 0.5, 0.5], [T_LUA + 0.6, 1.18, 0.64, 0.42]]);
      const P = poeVisor('v-sub', VIS, 'subdural', v, { varre: varreEm(t, ini + 0.15) });
      let s = contorno(P, LUA, clamp((t - (T_LUA + 0.25)) / 0.6));
      if (t >= T_CRUZ - 0.05) {
        for (const [a, b] of [[[0.74, 0.11], [0.69, 0.2]], [[0.9, 0.58], [0.79, 0.58]]]) s += linha(P(a[0], a[1]), P(b[0], b[1]), clamp((t - (T_CRUZ - 0.05)) / 0.25), '#ffffff', 8, '10 9');
      }
      $('sub-svg').innerHTML = s;
      let h = '';
      const [lx, ly] = P(0.74, 0.3);
      h += chip(t, T_LUA + 0.3, 'meia-lua', lx - 30, ly, { ancora: 'd', tam: 40, ate: T_SUB - 0.1 });
      const [cx, cy] = P(0.77, 0.58);
      h += chip(t, T_CRUZ + 0.1, `${IC.check}cruza a sutura`, cx - 20, cy, { ancora: 'd', tam: 32, ate: T_SUB - 0.1 });
      h += selo(t, T_SUB - 0.04, 'Subdural', 400, 880, { tam: 96 });
      const [vx, vy] = P(0.78, 0.36);
      h += chip(t, T_VEIAS - 0.02, duas('veias ponte', 'sangue venoso'), vx - 40, vy, { tam: 34, ancora: 'd' });
      h += chip(t, T_IDOSO - 0.02, 'idoso, etilista, anticoagulado', 540, 420, { tam: 32 });
      $('sub-cam').innerHTML = h;
      if (t >= T_SUB - 0.04 && t < T_SUB + 0.2) tremor = Math.max(tremor, 12 * (1 - (t - T_SUB + 0.04) / 0.24));
      if (t >= ini + 0.3 && t < C.subdural[1] - 0.1) { const a = t >= T_CRUZ && t < T_SUB ? P(0.84, 0.58) : P(0.84, 0.36); quer([a[0] + d.x, a[1]]); }
    }
  }

  // ---- Subaracnoide: cisternas e sulcos brancos
  {
    const ini = C.hsa[0];
    const d = deslocCena(t, ini, C.hsa[1]);
    aplica($('c-hsa'), d);
    if (d.vis) {
      const v = vista(t, [[ini, 1, 0.5, 0.5], [T_CIST - 0.1, 1, 0.5, 0.5], [T_CIST + 0.5, 1.45, 0.52, 0.47]]);
      const P = poeVisor('v-hsa', VIS, 'hsa', v, { varre: varreEm(t, ini + 0.1) });
      let s = contorno(P, ESTRELA, clamp((t - (T_CIST + 0.3)) / 0.5));
      if (t >= T_SULCOS - 0.05) { const [a, b] = P(0.36, 0.43), [c, e] = P(0.68, 0.42); s += anel(a, b, 34, t, T_SULCOS - 0.05) + anel(c, e, 34, t, T_SULCOS + 0.07); }
      $('hsa-svg').innerHTML = s;
      let h = '';
      const [ex, ey] = P(0.52, 0.33);
      h += chip(t, T_CIST + 0.3, 'cisternas', ex, ey - 30, { tam: 40, ate: T_SEMTR - 0.1 });
      const [sx, sy] = P(0.36, 0.55);
      h += chip(t, T_SULCOS, 'sulcos', sx, sy + 30, { tam: 36, ate: T_SEMTR - 0.1 });
      h += selo(t, T_HSA - 0.04, 'Subaracnoide', 540, 960, { tam: 92 });
      h += chip(t, T_SEMTR - 0.02, `${IC.alerta}sem trauma?`, 540, 420, { tam: 40, cls: 'alerta' });
      h += chip(t, T_ANEU - 0.02, duas('aneurisma roto', 'a pior dor de cabeça da vida'), 540, 560, { tam: 40, cls: 'alerta' });
      $('hsa-cam').innerHTML = h;
      if (t >= T_HSA - 0.04 && t < T_HSA + 0.2) tremor = Math.max(tremor, 12 * (1 - (t - T_HSA + 0.04) / 0.24));
      if (t >= ini + 0.3 && t < C.hsa[1] - 0.1) {
        const a = t >= T_ANEU - 0.05 ? [540, 560] : t >= T_SEMTR ? [540, 420] : t >= T_SULCOS ? P(0.36, 0.43) : P(0.52, 0.45);
        quer([a[0] + d.x, a[1]]);
      }
    }
  }

  // ---- Cisternas: abertas (TC normal) e apagadas (esquema)
  {
    const ini = conteudo('cisternas');
    const d = deslocCena(t, ini, C.cisternas[1]);
    aplica($('c-cis'), d);
    if (d.vis) {
      const div = vaivem((t - (T_APAG - 0.1)) / 0.5);
      const R = { x: 60, y: 270, w: lerp(960, 470, div), h: lerp(780, 680, div) };
      const v = vista(t, [[ini, 1, 0.5, 0.5], [T_ABERTAS - 0.4, 1, 0.5, 0.5], [T_ABERTAS + 0.2, 1.9, 0.5, 0.44]]);
      const P = poeVisor('v-cis', R, 'normal26', v, { varre: varreEm(t, ini + 0.05) });
      let s = contorno(P, CISTERNA, clamp((t - (T_ABERTAS + 0.1)) / 0.5), { preenche: 0.12 });
      $('cis-svg').innerHTML = s;
      // painel do esquema
      const E = { x: lerp(1100, 550, div), y: 270, w: 470, h: 680 };
      const pe = $('cis-esq');
      pe.style.visibility = div > 0.01 ? 'visible' : 'hidden';
      pe.style.left = E.x + 'px'; pe.style.top = E.y + 'px'; pe.style.width = E.w + 'px'; pe.style.height = E.h + 'px';
      const fecha = vaivem((t - (T_APAG + 0.35)) / 0.9);
      const anelL = lerp(26, 0, fecha);
      const empurra = Math.sin(Math.PI * clamp((t - (T_APAG + 0.3)) / 1.1));
      let e = `<rect width="470" height="680" fill="#474C4F"/>`;
      e += `<ellipse cx="235" cy="340" rx="${120 + anelL}" ry="${100 + anelL}" fill="#050505"/>`;
      e += `<ellipse cx="235" cy="340" rx="120" ry="100" fill="#9AA0A4"/>`;
      e += `<text x="235" y="352" text-anchor="middle" font-family="Onest" font-weight="800" font-size="30" fill="#0C1A21">tronco</text>`;
      if (anelL > 2) e += `<text x="235" y="${222 - anelL}" text-anchor="middle" font-family="Onest" font-weight="800" font-size="24" fill="#C1FF72">cisterna</text>`;
      if (t >= T_APAG + 0.3) {
        for (const sx of [-1, 1]) {
          const x0 = 235 + sx * (215 + 15 * (1 - empurra)), x1 = 235 + sx * (140 + anelL);
          e += `<line x1="${x0}" y1="290" x2="${x1}" y2="315" stroke="#FF4D57" stroke-width="10" stroke-linecap="round"/><line x1="${x0}" y1="390" x2="${x1}" y2="365" stroke="#FF4D57" stroke-width="10" stroke-linecap="round"/>`;
        }
      }
      e += `<text x="235" y="662" text-anchor="middle" font-family="Onest" font-weight="700" font-size="22" fill="#cfd8db" letter-spacing="2">ESQUEMA</text>`;
      $('cis-esq-svg').innerHTML = e;
      let h = '';
      const [cx, cy] = P(0.5, 0.37);
      h += chip(t, T_ABERTAS + 0.35, duas('abertas', 'pretas = líquor'), lerp(cx, 295, div), lerp(cy - 70, 880, div), { tam: 36 });
      if (div > 0.01) {
        h += `<div class="chip" style="left:295px;top:300px;transform:translate(-50%,-50%) scale(${pop(t, T_APAG)});font-size:34px;padding:10px 20px">${IC.check}normal</div>`;
        h += `<div class="chip alerta" style="left:${E.x + 235}px;top:300px;transform:translate(-50%,-50%) scale(${pop(t, T_APAG + 0.1)});font-size:34px;padding:10px 20px">${IC.x}apagadas</div>`;
      }
      h += chip(t, T_HIC - 0.02, duas('hipertensão', 'intracraniana'), E.x + 235, 840, { tam: 36, cls: 'alerta' });
      h += selo(t, T_HERN - 0.04, 'risco de herniação', 540, 640, { tam: 80, alerta: true });
      $('cis-cam').innerHTML = h;
      if (t >= T_HERN - 0.04 && t < T_HERN + 0.25) { tremor = Math.max(tremor, 16 * (1 - (t - T_HERN + 0.04) / 0.29)); flash = Math.max(flash, 0.3 * (1 - (t - T_HERN + 0.04) / 0.29)); corFlash = '255,77,87'; }
      if (t >= ini + 0.3 && t < C.cisternas[1] - 0.1) {
        const a = t >= T_APAG + 0.2 ? [E.x + 235, E.y + 340 - 100] : P(0.5, 0.43);
        quer([a[0] + d.x, a[1]]);
      }
    }
  }

  // ---- Cérebro: compara os lados, a área hipodensa do AVC
  {
    const ini = conteudo('cerebro');
    const d = deslocCena(t, ini, C.cerebro[1]);
    aplica($('c-cer'), d);
    if (d.vis) {
      const v = vista(t, [[ini, 1, 0.5, 0.5], [T_SUMIU - 0.1, 1, 0.5, 0.5], [T_SUMIU + 0.5, 1.12, 0.4, 0.45]]);
      const P = poeVisor('v-cer', VIS, 'avc', v, { varre: varreEm(t, ini + 0.05) });
      let s = '';
      const [a, b] = MEIO_AVC;
      if (t >= T_COMPARA - 0.1) {
        s += linha(P(a[0], a[1]), P(b[0], b[1]), clamp((t - (T_COMPARA - 0.1)) / 0.35), '#ffffff', 5, '16 12');
        if (t < T_SUMIU) {
          const lado = Math.floor((t - T_COMPARA) / 0.35) % 2;
          const pol = lado === 0 ? [[0, 0], [a[0], 0], [b[0], 1], [0, 1]] : [[a[0], 0], [1, 0], [1, 1], [b[0], 1]];
          if (t >= T_COMPARA) s += `<path d="M${pol.map(([x, y]) => P(x, y).map((q) => q.toFixed(1)).join(' ')).join(' L')} Z" fill="#C1FF72" opacity=".16"/>`;
        }
      }
      s += contorno(P, INFARTO, clamp((t - (T_SUMIU + 0.3)) / 0.6), { cor: '#FF4D57', classe: 'neon-v', preenche: 0.16 });
      $('cer-svg').innerHTML = s;
      let h = '';
      h += chip(t, T_COMPARA - 0.05, `${IC.lados}compara os dois lados`, 540, 330, { tam: 36, ate: T_SUMIU - 0.1 });
      h += chip(t, T_BRANCA - 0.05, duas('sumiu o limite', 'entre a branca e a cinzenta'), 760, 420, { tam: 34, cls: 'alerta' });
      h += selo(t, T_AVC - 0.04, 'AVC isquêmico?', 600, 900, { tam: 84 });
      $('cer-cam').innerHTML = h;
      if (t >= T_AVC - 0.04 && t < T_AVC + 0.2) tremor = Math.max(tremor, 12 * (1 - (t - T_AVC + 0.04) / 0.24));
      if (t >= ini + 0.2 && t < C.cerebro[1] - 0.1) {
        let q = P(0.5, 0.5);
        if (t >= T_COMPARA && t < T_SUMIU) q = Math.floor((t - T_COMPARA) / 0.35) % 2 === 0 ? P(0.25, 0.45) : P(0.72, 0.45);
        if (t >= T_SUMIU) q = P(0.3, 0.4);
        quer([q[0] + d.x, q[1]]);
      }
    }
  }

  // ---- AVC: nas primeiras horas a TC pode vir normal, serve para excluir sangramento
  {
    const ini = C.avc[0];
    const d = deslocCena(t, ini, C.avc[1]);
    aplica($('c-avc'), d);
    if (d.vis) {
      const R = { x: 60, y: 270, w: 960, h: 560 };
      const P = poeVisor('v-avc', R, 'normal16', { z: 1.05 + 0.01 * (t - ini), fx: 0.5, fy: 0.5 }, { varre: varreEm(t, T_EXCLUIR, 0.7) });
      let s = '';
      const fl = clamp((t - T_SANGR) / 0.4);
      if (fl > 0) s += `<g opacity="${surge(t, T_SANGR, 0.2)}">${linha([400, 930], [640, 930], fl, '#C1FF72', 8)}${fl >= 1 ? '<path d="M620 912 L644 930 L620 948" fill="none" stroke="#C1FF72" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' : ''}</g>`;
      $('avc-svg').innerHTML = s;
      let h = '';
      h += chip(t, T_HORAS - 0.03, `${IC.relogio}primeiras horas`, 90, 330, { ancora: 'e', tam: 36 });
      h += chip(t, T_NORMAL - 0.03, `${IC.check}pode vir normal`, 540, 760, { tam: 40 });
      h += chip(t, T_EXCLUIR - 0.03, `${IC.lupa}procura sangue`, 990, 330, { ancora: 'd', tam: 32 });
      h += chip(t, T_SANGR - 0.03, `${IC.check}sem sangramento`, 250, 930, { tam: 36 });
      h += chip(t, T_TROMBO - 0.03, duas('trombolítico', 'se dentro da janela'), 830, 930, { tam: 38 });
      $('avc-cam').innerHTML = h;
      if (t >= ini + 0.3 && t < C.avc[1] - 0.1) {
        const q = t >= T_TROMBO ? [830, 930] : t >= T_SANGR ? [250, 930] : t >= T_EXCLUIR ? P(0.5, 0.5) : t >= T_NORMAL ? [540, 760] : [200, 330];
        quer([q[0] + d.x, q[1]]);
      }
    }
  }

  // ---- Ventrículos: dilatados (hidrocefalia) e empurrados (desvio da linha média)
  {
    const ini = conteudo('ventriculos');
    const d = deslocCena(t, ini, C.ventriculos[1]);
    aplica($('c-ven'), d);
    if (d.vis) {
      const fase2 = t >= T_EMP - 0.1;
      const nome = fase2 ? 'desvio' : 'hidro';
      const v = fase2 ? { z: 1, fx: 0.5, fy: 0.5 } : vista(t, [[ini, 1, 0.5, 0.5], [T_DILAT - 0.1, 1, 0.5, 0.5], [T_DILAT + 0.5, 1.15, 0.5, 0.52]]);
      const P = poeVisor('v-ven', VIS, nome, v, { varre: fase2 ? varreEm(t, T_EMP - 0.1) : varreEm(t, ini + 0.05) });
      let s = '';
      if (!fase2) {
        s += contorno(P, VENTR, clamp((t - (T_DILAT + 0.2)) / 0.6), { preenche: 0.2 });
        if (t >= T_DILAT + 0.6) {
          const u = ((t - T_DILAT) * 1.5) % 1;
          for (const [nx, ny, dx, dy] of [[0.25, 0.7, -1, 0], [0.75, 0.7, 1, 0], [0.36, 0.27, -0.6, -0.8], [0.64, 0.27, 0.6, -0.8]]) {
            const [x, y] = P(nx, ny);
            s += `<line x1="${x + dx * 20}" y1="${y + dy * 20}" x2="${x + dx * (50 + 30 * u)}" y2="${y + dy * (50 + 30 * u)}" stroke="#C1FF72" stroke-width="7" stroke-linecap="round" opacity="${1 - u}"/>`;
          }
        }
      } else {
        const [a, b] = MEIO_DESVIO;
        s += linha(P(a[0], a[1]), P(b[0], b[1]), clamp((t - (T_EMP + 0.15)) / 0.4), '#ffffff', 5, '16 12');
        s += contorno(P, HEMATOMA, clamp((t - (T_EFEITO - 0.05)) / 0.5), { cor: '#FF4D57', classe: 'neon-v', preenche: 0.12 });
        if (t >= T_DESVIO - 0.1) {
          s += linha(P(SEPTO[0][0], SEPTO[0][1]), P(SEPTO[1][0], SEPTO[1][1]), clamp((t - (T_DESVIO - 0.1)) / 0.3), '#C1FF72', 8);
          const yy = 0.4, xm = lerp(a[0], b[0], (yy - a[1]) / (b[1] - a[1])), xs = lerp(SEPTO[0][0], SEPTO[1][0], (yy - SEPTO[0][1]) / (SEPTO[1][1] - SEPTO[0][1]));
          const [x1, y1] = P(xm, yy), [x2] = P(xs, yy);
          const u = clamp((t - T_DESVIO) / 0.3);
          if (u > 0) s += `<g class="neon"><line x1="${x1}" y1="${y1}" x2="${lerp(x1, x2, u)}" y2="${y1}" stroke="#C1FF72" stroke-width="7"/>
            <path d="M${x1 + 16} ${y1 - 12} L${x1} ${y1} L${x1 + 16} ${y1 + 12}" fill="none" stroke="#C1FF72" stroke-width="6"/>${u >= 1 ? `<path d="M${x2 - 16} ${y1 - 12} L${x2} ${y1} L${x2 - 16} ${y1 + 12}" fill="none" stroke="#C1FF72" stroke-width="6"/>` : ''}</g>`;
        }
      }
      $('ven-svg').innerHTML = s;
      let h = '';
      if (!fase2) {
        h += chip(t, T_DILAT + 0.1, 'dilatados', 540, 330, { tam: 40 });
        h += selo(t, T_HIDRO - 0.04, 'Hidrocefalia', 540, 960, { tam: 96, ate: T_EMP - 0.15 });
      } else {
        const [mx, my] = P(0.49, 0.06);
        h += chip(t, T_EMP + 0.25, 'linha média', mx, my + 6, { tam: 30 });
        h += chip(t, T_EFEITO - 0.02, duas('efeito de massa', 'o hematoma empurra'), 330, 960, { tam: 34, cls: 'alerta' });
        const [dx, dy] = P(0.62, 0.4);
        h += chip(t, T_DESVIO + 0.1, duas('desvio', 'da linha média'), dx + 70, dy - 80, { ancora: 'e', tam: 34 });
      }
      $('ven-cam').innerHTML = h;
      if (t >= T_HIDRO - 0.04 && t < T_HIDRO + 0.2) tremor = Math.max(tremor, 12 * (1 - (t - T_HIDRO + 0.04) / 0.24));
      if (t >= ini + 0.2 && t < C.ventriculos[1] - 0.1) {
        const q = fase2 ? (t >= T_DESVIO ? P(0.585, 0.4) : t >= T_EFEITO ? P(0.2, 0.5) : P(0.5, 0.3)) : P(0.4, 0.4);
        quer([q[0] + d.x, q[1]]);
      }
    }
  }

  // ---- Osso: janela óssea, fratura, ar dentro do crânio
  {
    const ini = conteudo('osso');
    const d = deslocCena(t, ini, C.osso[1]);
    aplica($('c-osso'), d);
    if (d.vis) {
      const fase2 = t >= T_AR - 0.1;
      const nome = fase2 ? 'pneumo' : 'fratura';
      const jan = clamp((t - T_JANELA) / 0.5);
      const v = fase2 ? vista(t, [[T_AR, 1, 0.5, 0.5], [T_CRANIO, 1, 0.5, 0.5], [T_CRANIO + 0.5, 1.15, 0.62, 0.4]])
        : vista(t, [[ini, 1, 0.5, 0.5], [T_CACAR - 0.15, 1, 0.5, 0.5], [T_CACAR + 0.45, 2.1, FRATURA[0] + 0.03, FRATURA[1] + 0.02]]);
      const filtro = fase2 ? 'none' : `contrast(${lerp(3.2, 1, jan).toFixed(3)}) brightness(${lerp(0.8, 1, jan).toFixed(3)})`;
      const P = poeVisor('v-os', VIS, nome, v, { filtro, varre: fase2 ? varreEm(t, T_AR - 0.1) : jan > 0 && jan < 1 ? jan : varreEm(t, ini + 0.05) });
      $('v-os-wl').innerHTML = fase2 || jan < 0.5 ? 'W <b>80</b> · L <b>40</b><br>janela de cérebro' : 'W <b>2000</b> · L <b>500</b><br>janela óssea';
      $('v-os-info').innerHTML = fase2 ? 'Sagital' : 'Axial';
      let s = '';
      if (!fase2) { const [fx, fy] = P(FRATURA[0], FRATURA[1]); s += anel(fx, fy, 46, t, T_FRAT); }
      else {
        BOLHAS.forEach(([bx, by], i) => { const [x, y] = P(bx, by); s += anel(x, y, 30, t, T_AR + 0.1 + i * 0.16); });
        s += contorno(P, SEIO, clamp((t - T_COMUN) / 0.4), { cor: '#FF4D57', classe: 'neon-v', preenche: 0.15 });
      }
      $('os-svg').innerHTML = s;
      let h = '';
      if (!fase2) {
        h += chip(t, T_JANELA, 'janela óssea', 540, 330, { tam: 40 });
        const [fx, fy] = P(FRATURA[0], FRATURA[1]);
        h += chip(t, T_FRAT + 0.05, 'fratura', fx + 70, fy, { ancora: 'e', tam: 44, cls: 'alerta' });
      } else {
        h += chip(t, T_CRANIO - 0.05, duas('ar no crânio', 'pneumoencéfalo'), 800, 880, { tam: 36 });
        const [sx, sy] = P(0.3, 0.3);
        h += chip(t, T_COMUN, duas('fratura comunicando', 'com o seio frontal'), sx + 20, sy + 90, { ancora: 'e', tam: 34, cls: 'alerta' });
      }
      $('os-cam').innerHTML = h;
      if (t >= ini + 0.3 && t < C.osso[1] - 0.1) {
        let q = fase2 ? (t >= T_COMUN ? P(0.245, 0.21) : P(BOLHAS[Math.min(4, Math.floor(Math.max(0, t - T_AR) / 0.16))][0], BOLHAS[Math.min(4, Math.floor(Math.max(0, t - T_AR) / 0.16))][1])) : t >= T_CACAR ? P(FRATURA[0], FRATURA[1]) : [540, 330];
        quer([q[0] + d.x, q[1]]);
      }
    }
  }

  // ---- Resumo: as cinco perguntas, na ordem
  {
    const el = $('c-res');
    const d = deslocCena(t, C.resumo[0], C.resumo[1]);
    aplica(el, d);
    if (d.vis) {
      let h = '';
      CAPS.forEach((cap, i) => {
        const row = $('rs-' + i);
        const y = 400 + i * 140;
        const ent = pop(t, T_RS[i] - 0.06, 0.4);
        const ativo = t >= T_RE[i] - 0.03 && t < (T_RE[i + 1] || T_RE[i] + 0.6) - 0.03;
        const pulo = ativo ? Math.sin(Math.PI * clamp((t - T_RE[i] + 0.03) / 0.3)) : 0;
        row.style.transform = `translate(${110 + (1 - clamp(ent)) * -200}px, ${y - 24 * pulo}px) translateY(-50%) scale(${0.9 + 0.1 * clamp(ent)})`;
        row.style.opacity = clamp(ent * 2);
        row.querySelector('.letra').style.transform = `scale(${1 + 0.18 * pulo})`;
        const [n, fx, fy, z] = MINIS[i];
        const R = { x: 812, y: y - 66, w: 150, h: 132 };
        const pm = pop(t, T_RS[i], 0.4);
        const mi = $('rm-' + i);
        mi.style.transform = `scale(${pm})`; mi.style.opacity = clamp(pm * 2);
        poeVisor('rm-' + i, R, n, { z, fx, fy }, { cobre: true });
        $('rm-' + i + '-cred').style.display = 'none';
        if (t >= T_RS[i] + 0.15) h += `<div class="ok-mini" style="left:${R.x + R.w - 40}px;top:${R.y - 18}px;transform:scale(${pop(t, T_RS[i] + 0.15, 0.3)})">${IC.check}</div>`;
      });
      $('rs-cam').innerHTML = h;
      if (t >= C.resumo[0] + 0.2 && t < C.resumo[1] - 0.1) {
        const k = T_RE[0] <= t ? Math.max(0, T_RE.filter((x) => x <= t + 0.03).length - 1) : Math.max(0, T_RS.filter((x) => x <= t + 0.03).length - 1);
        quer([170 + d.x, 400 + k * 140]);
      }
    }
  }

  // ---- Fim
  {
    const t0 = C.fim[0];
    $('c-fim').style.visibility = t >= t0 ? 'visible' : 'hidden';
    const bs = $('b-salva'), bg = $('b-segue');
    bs.style.left = '330px'; bs.style.top = '520px'; bs.style.transform = `translate(-50%,-50%) scale(${pop(t, PAL('fim', 'salva') - 0.05, 0.4)}) rotate(${-5 + 3 * Math.sin(t * 3)}deg)`;
    bg.style.left = '650px'; bg.style.top = '660px'; bg.style.transform = `translate(-50%,-50%) scale(${pop(t, PAL('fim', 'segue') - 0.05, 0.4)}) rotate(${4 + 3 * Math.sin(t * 3 + 1)}deg)`;
    $('marca').style.opacity = surge(t, t0 + 0.6, 0.4);
  }

  // ---- Cartão do capítulo, que voa para a barra
  {
    const p = $('passo');
    let mostra = false, veu = 0;
    CAPS.forEach(([c, letra, nome, en], i) => {
      const t0 = C[c][0];
      if (t < t0 - 0.02 || t > t0 + 1.12) return;
      mostra = true;
      p.querySelector('i').textContent = letra; p.querySelector('b').textContent = nome; p.querySelector('small').textContent = en;
      const ent = pop(t, t0, 0.4), voa = vaivem((t - (t0 + 0.72)) / 0.38);
      const largHud = (960 - 4 * 12) / 5, hx = 60 + i * (largHud + 12) + largHud / 2, hy = 190;
      const x = lerp(540, hx, voa), y = lerp(700, hy, voa), s = lerp(1, 0.16, voa) * ent;
      p.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s}) rotate(${(1 - clamp(ent)) * 10}deg)`;
      p.style.opacity = 1 - clamp((voa - 0.75) / 0.25);
      p.style.filter = `blur(${Math.sin(Math.PI * voa) * 6}px)`;
      veu = clamp(ent) * (1 - voa);
    });
    p.style.visibility = mostra ? 'visible' : 'hidden';
    $('scrim').style.opacity = veu;
  }

  // ---- Barra
  {
    const hud = $('hud');
    const e = surge(t, T_VOA + 0.25, 0.3) * (1 - surge(t, C.resumo[0] - 0.05, 0.3));
    hud.style.transform = `translateY(${(1 - e) * -30}px)`; hud.style.opacity = e;
    hud.style.visibility = e > 0.01 ? 'visible' : 'hidden';
    [...hud.children].forEach((div, i) => {
      const [c, , , , fim] = CAPS[i];
      const a = C[c][0];
      const chega = a + 1.08;
      const prog = t < chega ? 0 : clamp((t - chega) / (fim - chega));
      div.querySelector('i').style.width = (prog * 100) + '%';
      div.className = t >= fim ? 'feito' : t >= a ? 'ativo' : '';
    });
  }

  // ---- Legenda
  {
    let atual = null;
    for (let i = 0; i < blocos.length; i++) {
      const b = blocos[i], prox = blocos[i + 1];
      if (!b.ws.length) continue;
      const ini = b.ws[0].ini - 0.04;
      const fim = prox && prox.ws.length && prox.ws[0].ini - 0.04 < b.fala.fim + 0.35 ? prox.ws[0].ini - 0.04 : b.fala.fim + 0.35;
      if (t >= ini && t < fim) { atual = b; break; }
    }
    const el = $('legenda');
    if (!atual) el.innerHTML = '';
    else {
      el.style.top = (legendaY(atual.fala.cena) - 115) + 'px';
      el.innerHTML = atual.ws.map((w) => {
        const p = t < w.ini - 0.03 ? 0 : back((t - w.ini + 0.03) / 0.18, 2.6);
        const agora = t >= w.ini - 0.03 && t < w.fim + 0.05;
        return `<span class="${agora || atual.lima ? 'agora' : ''}" style="opacity:${t < w.ini - 0.03 ? 0 : 1};transform:scale(${0.6 + 0.4 * p}) ${agora ? 'rotate(-2deg)' : ''}">${w.texto}</span>`;
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
  if (t >= T_HERN && t < T_HERN + 0.5) { const u = (t - T_HERN) / 0.5; y -= 60 * Math.sin(Math.PI * u); }
  let olhar = [Math.sin(t * 0.9) * 4, Math.sin(t * 0.7) * 3];
  if (alvo) {
    const dx = alvo[0] - x, dy = y - alvo[1];
    olhar = [clamp(dx / 9, -30, 30), clamp(dy / 16, -12, 24)];
    yaw += clamp(dx / 2600, -0.3, 0.3);
  }
  const tA = Math.max(0, t - 0.08), tB = Math.min(T.duracao, t + 0.08);
  const vxy = [(trajeto(tB).x - trajeto(tA).x) / 0.16, (trajeto(tB).y - trajeto(tA).y) / 0.16];
  const pend = [clamp(vxy[1] * 0.0005, -0.7, 0.7) + 0.06 * Math.sin(2 * Math.PI * t / 1.5), clamp(-vxy[0] * 0.0006, -0.8, 0.8) + 0.05 * Math.sin(2 * Math.PI * t / 1.7) - roll * 1.2];
  if (bot) {
    bot.pose({ x, y, tamanho: tr.tam, yaw, roll, estica, olhar, olho: [lw, lh, arco], pisca: pisca(t, cara), boca, pendulo: pend });
    palco.render();
  }

  // ---- Laser
  {
    const l = $('laser');
    if (!laser || !alvo || !bot || tr.movendo) l.innerHTML = '';
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

  // ---- Tremor e flash
  $('mundo').style.transform = tremor > 0.3 ? `translate(${Math.sin(t * 91) * tremor}px, ${Math.cos(t * 77) * tremor * 0.7}px) rotate(${Math.sin(t * 53) * tremor * 0.04}deg)` : 'none';
  for (const c of ['mnemo', 'dens', 'blood', 'epidural', 'subdural', 'hsa', 'cisternas', 'cerebro', 'avc', 'ventriculos', 'osso', 'resumo', 'fim']) { const dd = t - C[c][0]; if (dd >= -0.02 && dd < 0.14) flash = Math.max(flash, 0.2 * (1 - dd / 0.14)); }
  $('flash').style.background = `rgba(${corFlash},${flash})`;
  return Promise.resolve();
}

window.seek = seek;
window.ready = (async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((im) => (im.complete ? null : new Promise((r) => { im.onload = im.onerror = r; }))));
  bot = await carregarMedbot(palco, '../../_personagem/web/medbot.glb');
  seek(0);
})();
