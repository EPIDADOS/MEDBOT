// Fotografa a capa (src/capa.html) em out/capa.png e out/capa.jpg (1080 × 1920).
// Uso (na pasta do vídeo): node tools/capa.cjs
const path = require('path');
const { abrir } = require('./servidor.cjs');

const PASTA = path.join(__dirname, '..');
const { chromium, CANAL } = require('./ambiente.cjs');

(async () => {
  const { url, fechar } = await abrir();
  const nav = await chromium.launch({ channel: CANAL, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
  const aba = await nav.newPage({ viewport: { width: 1080, height: 1920 } });
  await aba.goto(url + '/' + path.basename(PASTA) + '/src/capa.html');
  await aba.waitForFunction(() => window.pronto, null, { timeout: 60000 });
  await aba.waitForTimeout(300);
  for (const tipo of ['png', 'jpeg']) await aba.screenshot({ path: path.join(PASTA, 'out', tipo === 'png' ? 'capa.png' : 'capa.jpg'), type: tipo, quality: tipo === 'jpeg' ? 94 : undefined });
  console.log('out/capa.png e out/capa.jpg');
  await nav.close();
  fechar();
  process.exit(0);
})();
