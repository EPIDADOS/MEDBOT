// Fotografa src/index.html quadro a quadro (1080 × 1920, 30 fps) e manda direto ao ffmpeg, com o áudio mixado.
// Sobe um servidor local para a pasta TIKTOK/ (o Medbot 3D, em three.js, não carrega por file://) e usa a GPU do Edge.
//   node tools/render.cjs --deixas                     grava out/deixas.json (os instantes dos efeitos sonoros, para tools/mix.py)
//   node tools/render.cjs --stills 1,5.5,20            instantes soltos em out/stills/
//   node tools/render.cjs [--ate 12] [--saida x.mp4]   o vídeo (ou o começo dele) com out/audio-final.wav
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { abrir } = require('./servidor.cjs');

const PASTA = path.join(__dirname, '..');
const { chromium, FFMPEG, CANAL } = require('./ambiente.cjs');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };

(async () => {
  const { url, fechar } = await abrir();
  // O Edge reaberto a cada TROCA quadros: depois de ~1.500 quadros seguidos a GPU dele se esgota e os quadros saem brancos
  // (aconteceu no vídeo 15, a partir de 50 s). A página calcula tudo a partir de t, então reabrir não muda nada na imagem.
  const TROCA = 600;
  const erros = [];
  let navegador, aba;
  const abre = async () => {
    if (navegador) await navegador.close();
    navegador = await chromium.launch({ channel: CANAL, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
    aba = await navegador.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    aba.on('pageerror', (e) => erros.push(e.message));
    aba.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    await aba.goto(url + '/' + path.basename(PASTA) + '/src/index.html');
    await aba.evaluate(() => window.ready);
  };
  await abre();
  const { fps, duracao } = await aba.evaluate(() => ({ fps: window.FPS, duracao: window.DURATION }));
  const foto = async (t, tipo) => {
    await aba.evaluate((t) => new Promise((ok) => Promise.resolve(window.seek(t)).then(() => requestAnimationFrame(() => requestAnimationFrame(ok)))), t);
    for (let tentativa = 1; ; tentativa++) {
      try {
        return await aba.screenshot({ type: tipo, quality: tipo === 'jpeg' ? 92 : undefined, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
      } catch (e) {
        if (tentativa >= 4) throw e;
        await new Promise((ok) => setTimeout(ok, 1500 * tentativa));
      }
    }
  };

  if (process.argv.includes('--deixas')) {
    const cues = await aba.evaluate(() => window.CUES);
    fs.mkdirSync(path.join(PASTA, 'out'), { recursive: true });
    fs.writeFileSync(path.join(PASTA, 'out', 'deixas.json'), JSON.stringify({ duracao, cues }, null, 1));
    console.log(`${cues.length} deixas em out/deixas.json`);
  } else if (arg('stills', '')) {
    const dir = path.join(PASTA, 'out', 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const lista = arg('stills', '').split(',');
    for (const s of lista) fs.writeFileSync(path.join(dir, `t${Number(s).toFixed(2).padStart(6, '0')}.jpg`), await foto(Number(s), 'jpeg'));
    console.log(`${lista.length} instantes em out/stills/`);
  } else {
    const audio = path.join(PASTA, 'out', 'audio-final.wav');
    if (!fs.existsSync(audio)) throw new Error('falta out/audio-final.wav (rode node tools/render.cjs --deixas e python -I tools/mix.py)');
    const saida = path.join(PASTA, 'out', arg('saida', 'pocus.mp4'));
    const ate = Number(arg('ate', duracao));
    const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', audio,
      '-map', '0:v', '-map', '1:a', '-shortest',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(fps),
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', saida], { stdio: ['pipe', 'inherit', 'inherit'] });
    const fim = new Promise((ok, erro) => ff.on('close', (c) => (c === 0 ? ok() : erro(new Error('ffmpeg saiu com ' + c)))));
    const total = Math.round(Math.min(duracao, ate) * fps);
    const inicio = Date.now();
    for (let q = 0; q < total; q++) {
      if (q > 0 && q % TROCA === 0) await abre();
      const img = await foto(q / fps, 'jpeg');
      if (!ff.stdin.write(img)) await new Promise((ok) => ff.stdin.once('drain', ok));
      const pct = Math.floor(((q + 1) / total) * 100);
      if (pct % 10 === 0 && Math.floor((q / total) * 100) % 10 !== 0 || q === 0) {
        const falta = q ? Math.round((Date.now() - inicio) / (q + 1) * (total - q - 1) / 1000) : 0;
        console.log(`progresso ${pct}% (${q + 1} de ${total} quadros, faltam ~${falta} s)`);
        fs.writeFileSync(path.join(PASTA, 'out', 'progresso.txt'), `${pct}%
`);
      }
    }
    ff.stdin.end();
    await fim;
    console.log(`${total} quadros em ${Math.round((Date.now() - inicio) / 1000)} s -> ${path.relative(PASTA, saida)}`);
  }
  if (erros.length) console.log('erros na página:', [...new Set(erros)].join(' | '));
  await navegador.close();
  fechar();
})();
