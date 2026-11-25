// Servidor estático mínimo para a pasta TIKTOK/ (o three.js e o modelo .glb não carregam por file://).
// Uso: const { abrir } = require('./servidor.cjs'); const { url, fechar } = await abrir();
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.css': 'text/css', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webp': 'image/webp' };

function abrir(porta = 0) {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const arq = path.normalize(path.join(RAIZ, rel));
      if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(arq).pipe(res);
    });
    srv.listen(porta, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${srv.address().port}`, fechar: () => srv.close() }));
  });
}

module.exports = { abrir, RAIZ };
if (require.main === module) abrir(Number(process.argv[2] || 8765)).then(({ url }) => console.log('servindo TIKTOK/ em', url));
