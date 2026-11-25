// Fotografa o esquema do Donati (o visor, sem o laser) em out/capa-esquema.jpg, para a capa.
// Uso (na pasta do vídeo): node tools/esquema-capa.cjs [instante]
const path = require('path');
const { abrir } = require('./servidor.cjs');

const PASTA = path.join(__dirname, '..');
const { chromium, CANAL } = require('./ambiente.cjs');
const t = Number(process.argv[2] || 22.6);

(async () => {
  const { url, fechar } = await abrir();
  const nav = await chromium.launch({ channel: CANAL, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
  const aba = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
  await aba.goto(url + '/' + path.basename(PASTA) + '/src/index.html?sem-laser');
  await aba.evaluate(() => window.ready);
  await aba.evaluate((t) => new Promise((ok) => Promise.resolve(window.seek(t)).then(() => requestAnimationFrame(() => requestAnimationFrame(ok)))), t);
  await aba.screenshot({ path: path.join(PASTA, 'out', 'capa-esquema.jpg'), type: 'jpeg', quality: 94, clip: { x: 60, y: 285, width: 960, height: 700 } });
  console.log('out/capa-esquema.jpg');
  await nav.close();
  fechar();
  process.exit(0);
})();
