// Cria a pasta de um vídeo novo: as ferramentas, os efeitos sonoros e o roteiro do modelo (videos/_modelo) e a cena
// (src/index.html, src/cena.js e src/capa.html) de um vídeo pronto, que vira o ponto de partida.
//
// Uso (na raiz do kit): node ferramentas/novo-video.cjs 28-video-tema [--base 26-video-pocus]
//   --base 13-video-tc-cranio   fotos de exame num visor tipo PACS, com a lista do mnemônico
//   --base 26-video-pocus       fotos e clipes reais em movimento num visor (o padrão)
//   --base 27-video-suturas     esquemas desenhados por código (vista de cima e corte), quando não há foto aberta
// Depois: edite roteiro/falas.json e siga o README.md da raiz, a partir de "3. Voz".
const fs = require('fs');
const path = require('path');

const KIT = path.join(__dirname, '..');
const VIDEOS = path.join(KIT, 'videos');
const nome = process.argv[2];
const i = process.argv.indexOf('--base');
const base = i > 0 ? process.argv[i + 1] : '26-video-pocus';

if (!nome || !/^\d{2}-video-[a-z0-9-]+$/.test(nome)) {
  console.error('Dê um nome como 28-video-tema (dois dígitos, "-video-", letras minúsculas, números e hífens).');
  process.exit(1);
}
const destino = path.join(VIDEOS, nome);
if (fs.existsSync(destino)) { console.error('Já existe', destino); process.exit(1); }
const origem = path.join(VIDEOS, base);
if (!fs.existsSync(path.join(origem, 'src', 'cena.js'))) { console.error('Base sem src/cena.js:', base); process.exit(1); }

const copia = (de, para) => fs.cpSync(de, para, { recursive: true });
const modelo = path.join(VIDEOS, '_modelo');
copia(path.join(modelo, 'tools'), path.join(destino, 'tools'));
copia(path.join(modelo, 'assets'), path.join(destino, 'assets'));
copia(path.join(modelo, 'roteiro'), path.join(destino, 'roteiro'));
// o Git não guarda pasta vazia: estas três são criadas aqui
fs.mkdirSync(path.join(destino, 'src'), { recursive: true });
fs.mkdirSync(path.join(destino, 'out'), { recursive: true });
fs.mkdirSync(path.join(destino, 'assets', 'fotos'), { recursive: true });
for (const arq of ['index.html', 'cena.js', 'capa.html']) {
  const de = path.join(origem, 'src', arq);
  if (fs.existsSync(de)) fs.copyFileSync(de, path.join(destino, 'src', arq));
}
// ferramentas próprias da base (por exemplo, a foto do esquema para a capa)
for (const arq of fs.readdirSync(path.join(origem, 'tools'))) {
  if (!fs.existsSync(path.join(destino, 'tools', arq))) fs.copyFileSync(path.join(origem, 'tools', arq), path.join(destino, 'tools', arq));
}
const slug = nome.replace(/^\d{2}-video-/, '');
const titulo = slug.replace(/-/g, ' ');
for (const arq of ['README.md', 'LEGENDA.txt']) {
  const s = fs.readFileSync(path.join(modelo, arq), 'utf8').replace(/SLUG/g, slug);
  fs.writeFileSync(path.join(destino, arq), s);
}
const render = path.join(destino, 'tools', 'render.cjs');
fs.writeFileSync(render, fs.readFileSync(render, 'utf8').replace(/arg\('saida', '[^']+\.mp4'\)/, `arg('saida', '${slug}.mp4')`));

console.log(`Criado videos/${nome} (cena de partida: ${base}).`);
console.log(`Próximos passos, na pasta videos/${nome}:`);
console.log('  1. roteiro/falas.json (o texto) e roteiro/trilha.txt (o pedido da trilha); python -I tools/roteiro.py');
console.log('  2. as imagens em assets/fotos (ferramentas/commons-busca.mjs e ferramentas/baixar-commons.py) e os recortes');
console.log('  3. voz, voz_rapida, tempos e trilha; depois adapte src/cena.js ao roteiro (README.md da raiz, passo 5)');
console.log(`Tema: ${titulo}`);
