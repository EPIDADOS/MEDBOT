// Medbot: o mascote médico da Medfye nos carrosséis do TikTok.
// Forma lisa de uma cor, dois olhos em pílula e acessórios de médico (estetoscópio, espelho frontal, touca, lupa).
// Tudo desenhado por código, em SVG. Funciona no navegador (window.medbot) e no Node (module.exports).
//
// medbot({ forma, corpo, olho, expressao, olhar, acessorios, sombra, tamanho })
//   forma: 'bola' | 'capsula' | 'cruz'
//   corpo / olho: cores (padrão lima #C1FF72 e tinta #0C1A21)
//   expressao: 'normal' | 'feliz' | 'surpreso' | 'piscando' | 'desconfiado' | 'preocupado' | 'calmo'
//   olhar: 'frente' | 'direita' | 'esquerda' | 'cima' | 'baixo' | 'cima-esquerda' | 'cima-direita' | 'baixo-esquerda'
//   acessorios: lista com 'estetoscopio', 'espelho', 'touca', 'lupa' (touca: cor em op.touca)
//   sombra: true põe uma sombra no chão; contorno: cor de um traço em volta do corpo (para fundo claro)
//   tubo: cor do estetoscópio e dos aros (padrão: a cor do olho)
(function (raiz) {
  const TINTA = '#0C1A21';
  const LIMA = '#C1FF72';

  const OLHAR = {
    frente: [0, -6, 0],
    direita: [24, -8, 8],
    esquerda: [-24, -8, -8],
    cima: [12, -24, 6],
    baixo: [8, 12, 4],
    'cima-esquerda': [-18, -22, -8],
    'cima-direita': [18, -22, 8],
    'baixo-esquerda': [-16, 10, -6],
  };

  function pilula(cx, cy, w, h, rot, cor) {
    return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="${cor}" transform="rotate(${rot} ${cx} ${cy})"/>`;
  }

  function arco(cx, cy, rot, cor, paraCima) {
    const d = paraCima ? `M${cx - 9} ${cy + 5} Q${cx} ${cy - 12} ${cx + 9} ${cy + 5}` : `M${cx - 9} ${cy - 4} Q${cx} ${cy + 11} ${cx + 9} ${cy - 4}`;
    return `<path d="${d}" fill="none" stroke="${cor}" stroke-width="8" stroke-linecap="round" transform="rotate(${rot} ${cx} ${cy})"/>`;
  }

  function olhos(expressao, olhar, cor, centro) {
    const [dx, dy, rot] = OLHAR[olhar] || OLHAR.frente;
    const cx = centro[0] + dx;
    const cy = centro[1] + dy;
    const e = [cx - 12, cy];
    const d = [cx + 12, cy - 1.5];
    switch (expressao) {
      case 'feliz':
        return arco(e[0], e[1], rot, cor, true) + arco(d[0], d[1], rot, cor, true);
      case 'calmo':
        return arco(e[0], e[1], rot, cor, false) + arco(d[0], d[1], rot, cor, false);
      case 'surpreso':
        return `<circle cx="${e[0]}" cy="${e[1]}" r="10" fill="${cor}"/><circle cx="${d[0]}" cy="${d[1]}" r="10" fill="${cor}"/>`;
      case 'piscando':
        return pilula(e[0], e[1], 13, 30, rot, cor) + arco(d[0], d[1] + 2, rot, cor, true);
      case 'desconfiado':
        return pilula(e[0], e[1] + 6, 16, 12, rot, cor) + pilula(d[0], d[1] + 6, 16, 12, rot, cor);
      case 'preocupado':
        return pilula(e[0], e[1] + 2, 12, 26, rot + 16, cor) + pilula(d[0], d[1] + 2, 12, 26, rot - 16, cor);
      default:
        return pilula(e[0], e[1], 13, 30, rot, cor) + pilula(d[0], d[1], 13, 30, rot, cor);
    }
  }

  // Corpo de cada forma: o contorno (para recorte) e o desenho.
  function corpo(forma, cor, contorno) {
    const traco = contorno ? ` stroke="${contorno}" stroke-width="5"` : '';
    if (forma === 'capsula') {
      const contorno = '<rect x="58" y="34" width="124" height="180" rx="62"/>';
      const desenho =
        `<rect x="58" y="34" width="124" height="180" rx="62" fill="#FFFFFF"${traco}/>` +
        `<path d="M58 124 V96 A62 62 0 0 1 182 96 V124 Z" fill="${cor}"/>` +
        `<rect x="58" y="121" width="124" height="6" fill="${cor}" opacity=".35"/>`;
      return { contorno, desenho, centroOlhos: [120, 92] };
    }
    if (forma === 'cruz') {
      const d = 'M94 40 H146 Q160 40 160 54 V84 H190 Q204 84 204 98 V150 Q204 164 190 164 H160 V194 Q160 208 146 208 H94 Q80 208 80 194 V164 H50 Q36 164 36 150 V98 Q36 84 50 84 H80 V54 Q80 40 94 40 Z';
      return { contorno: `<path d="${d}"/>`, desenho: `<path d="${d}" fill="${cor}"${traco}/>`, centroOlhos: [120, 116] };
    }
    return {
      contorno: '<circle cx="120" cy="124" r="84"/>',
      desenho: `<circle cx="120" cy="124" r="84" fill="${cor}"${traco}/>`,
      centroOlhos: [120, 104],
    };
  }

  const METAL = '#E7ECEF';

  function diafragma(cx, cy, tubo) {
    return (
      `<circle cx="${cx}" cy="${cy}" r="15" fill="${METAL}" stroke="${tubo}" stroke-width="5"/>` +
      `<circle cx="${cx}" cy="${cy}" r="5.5" fill="${tubo}" opacity=".16"/>` +
      `<path d="M${cx - 8} ${cy - 6} A10 10 0 0 1 ${cx + 3} ${cy - 10}" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>`
    );
  }

  // Estetoscópio no pescoço: o tubo em U na frente da parte de baixo e o diafragma pendurado à direita.
  function estetoscopio(tubo) {
    return (
      `<path d="M40 150 C52 196 188 196 200 150" fill="none" stroke="${tubo}" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M160 184 C164 196 166 204 166 210" fill="none" stroke="${tubo}" stroke-width="7" stroke-linecap="round"/>` +
      diafragma(166, 216, tubo)
    );
  }

  function espelho(tubo) {
    return (
      `<path d="M48 76 Q120 30 192 76" fill="none" stroke="${tubo}" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="84" cy="54" r="20" fill="${METAL}" stroke="${tubo}" stroke-width="5"/>` +
      `<circle cx="84" cy="54" r="4.5" fill="${tubo}"/>` +
      `<path d="M72 48 A13 13 0 0 1 82 41" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>`
    );
  }

  // Touca de centro cirúrgico: a calota de cima em outra cor, com a dobra.
  function touca(id, cor) {
    return (
      `<g clip-path="url(#${id})">` +
      `<path d="M20 20 H220 V70 Q120 52 20 70 Z" fill="${cor}"/>` +
      `<path d="M20 70 Q120 52 220 70" fill="none" stroke="#FFFFFF" stroke-opacity=".28" stroke-width="5"/>` +
      `</g>`
    );
  }

  function lupa(tubo) {
    return (
      `<g transform="rotate(-28 214 168)">` +
      `<rect x="208" y="186" width="13" height="40" rx="6.5" fill="${tubo}"/>` +
      `<circle cx="214" cy="160" r="27" fill="#DDF3FF" fill-opacity=".55" stroke="${tubo}" stroke-width="7"/>` +
      `<path d="M199 151 A17 17 0 0 1 212 141" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>` +
      `</g>`
    );
  }

  let contador = 0;
  function medbot(op = {}) {
    const forma = op.forma || 'bola';
    const cor = op.corpo || LIMA;
    const corOlho = op.olho || TINTA;
    const tubo = op.tubo || corOlho;
    const acess = new Set(op.acessorios || ['estetoscopio']);
    const id = `mb${++contador}`;
    const c = corpo(forma, cor, op.contorno);
    const larg = acess.has('lupa') ? 260 : 240;
    const partes = [];
    partes.push(`<defs><clipPath id="${id}">${c.contorno}</clipPath></defs>`);
    if (op.sombra) partes.push(`<ellipse cx="120" cy="226" rx="70" ry="8" fill="${TINTA}" opacity=".12"/>`);
    partes.push(c.desenho);
    if (forma === 'bola' && acess.has('touca')) partes.push(touca(id, op.touca || '#2E7D8C'));
    partes.push(olhos(op.expressao || 'normal', op.olhar || 'frente', corOlho, c.centroOlhos));
    if (forma === 'bola' && acess.has('espelho')) partes.push(espelho(tubo));
    if (forma === 'bola' && acess.has('estetoscopio')) partes.push(estetoscopio(tubo));
    if (acess.has('lupa')) partes.push(lupa(tubo));
    const tam = op.tamanho ? ` width="${op.tamanho}" height="${Math.round((op.tamanho * 248) / larg)}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${larg} 248"${tam} role="img" aria-label="Medbot">${partes.join('')}</svg>`;
  }

  // Preenche cada elemento com data-medbot='{"expressao":"surpreso","olhar":"esquerda"}' (JSON com as opções).
  medbot.montar = function (raizDom) {
    (raizDom || document).querySelectorAll('[data-medbot]').forEach((el) => {
      el.innerHTML = medbot(JSON.parse(el.dataset.medbot || '{}'));
    });
  };

  medbot.TINTA = TINTA;
  medbot.LIMA = LIMA;
  raiz.medbot = medbot;
  if (typeof module !== 'undefined') module.exports = medbot;
})(typeof window !== 'undefined' ? window : globalThis);
