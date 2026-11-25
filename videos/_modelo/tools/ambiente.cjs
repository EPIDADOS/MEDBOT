// Acha o Playwright e o ffmpeg: primeiro os da raiz do kit (npm install), depois os de uma pasta acima e,
// por último, o ffmpeg do sistema. MEDBOT_CANAL troca o navegador (msedge por padrão; chrome no Mac, por exemplo).
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..', '..');
const bases = [RAIZ, path.join(RAIZ, '..')];
const achar = (rel) => bases.map((b) => path.join(b, 'node_modules', rel)).find((p) => fs.existsSync(p));
const pw = achar('playwright');
if (!pw) throw new Error('Playwright não encontrado: rode npm install na raiz do kit');
const { chromium } = require(pw);
const pastasFfmpeg = [path.join(RAIZ, 'node_modules', 'ffmpeg-static'),
  ...['VIDEO MAPA', 'REACT IA', 'VIDEO MEDICINA'].map((d) => path.join(RAIZ, '..', d, 'node_modules', 'ffmpeg-static'))];
let FFMPEG = 'ffmpeg';
for (const p of pastasFfmpeg) for (const n of ['ffmpeg.exe', 'ffmpeg']) if (FFMPEG === 'ffmpeg' && fs.existsSync(path.join(p, n))) FFMPEG = path.join(p, n);
const CANAL = process.env.MEDBOT_CANAL || 'msedge';

module.exports = { chromium, FFMPEG, CANAL, RAIZ };
