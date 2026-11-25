// Medbot 3D no navegador (three.js): carrega o modelo exportado do Blender (medbot.glb, por blender/medbot3d.py glb=...)
// e o posiciona em pixels da tela. Tudo é calculado a partir de um estado; nada anda sozinho (bom para render quadro a quadro).
//
//   const palco = criarPalco(canvas, 1080, 1920);
//   const bot = await carregarMedbot(palco, '../../_personagem/web/medbot.glb');
//   bot.pose({ x: 540, y: 1300, tamanho: 500, yaw: 0, roll: 0, estica: 1, olhar: [0, 0], olho: [1, 1, 0], pisca: 1, boca: 0.4 });
//   palco.render();
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function criarPalco(canvas, largura = 1080, altura = 1920) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(largura, altura, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environmentIntensity = 0.5;
  const cam = new THREE.OrthographicCamera(-largura / 2, largura / 2, altura / 2, -altura / 2, -6000, 6000);
  cam.position.set(0, 0, 3000);
  const luz = (cor, forca, x, y, z) => { const l = new THREE.DirectionalLight(cor, forca); l.position.set(x, y, z); cena.add(l); return l; };
  luz(0xfff3e4, 2.6, -700, 900, 1300);   // principal, de cima à esquerda
  luz(0xe8f0ff, 0.8, 1000, 100, 900);    // preenche
  luz(0xffffff, 2.4, 600, 700, -1000);   // contorno
  luz(0xf2ffe0, 1.4, -800, 200, -700);   // contorno do outro lado
  cena.add(new THREE.AmbientLight(0xffffff, 0.15));
  return { renderer, cena, cam, largura, altura, render: () => renderer.render(cena, cam) };
}

// opcoes.cor troca a cor do corpo (material 'lima') só naquele vídeo, ex.: '#E0915C' no da sífilis; sem ela, o Medbot fica lima.
export async function carregarMedbot(palco, url, opcoes = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const ator = new THREE.Group();
  const giro = new THREE.Group();   // yaw/pitch/roll do corpo inteiro
  giro.add(gltf.scene);
  ator.add(giro);
  palco.cena.add(ator);
  const no = (n) => {
    const o = gltf.scene.getObjectByName(n);
    if (!o) throw new Error('nó do Medbot não achado: ' + n);
    return o;
  };
  const N = {
    raiz: no('raiz'), olhar: no('olhar'), boca: no('boca'), lingua: no('lingua'), pendulo: no('pendulo'),
    olhos: [no('olho_esq'), no('olho_dir')], arcos: [no('arco_esq'), no('arco_dir')],
  };
  // Escalas de base (as do Blender), para o estado multiplicar em cima.
  const base = (o) => o.scale.clone();
  const B = { olhos: N.olhos.map(base), arcos: N.arcos.map(base), boca: base(N.boca), lingua: base(N.lingua) };
  const rot0 = { olhar: N.olhar.quaternion.clone(), pendulo: N.pendulo.quaternion.clone() };
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      o.frustumCulled = false;
      const m = o.material;
      if (m && m.name === 'lima') {
        m.roughness = 0.38; if ('clearcoat' in m) { m.clearcoat = 0.35; m.clearcoatRoughness = 0.14; }
        if (opcoes.cor) m.color.set(opcoes.cor);
      }
    }
  });
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();

  function pose(s) {
    const tam = s.tamanho ?? 500;
    ator.position.set((s.x ?? 540) - palco.largura / 2, palco.altura / 2 - (s.y ?? 960), s.z ?? 0);
    ator.scale.setScalar(tam / 2);
    ator.visible = (s.visivel ?? 1) > 0;
    // Um pouco de cima, como no Blender; yaw vira o corpo, roll inclina, spin dá a volta inteira.
    giro.rotation.set(0.10 + (s.pitch ?? 0), (s.yaw ?? 0) + (s.spin ?? 0), s.roll ?? 0, 'YXZ');
    const sz = s.estica ?? 1, sx = 1 / Math.sqrt(sz);
    N.raiz.scale.set(sx, sz, sx);
    // Olhar: [para a direita, para cima] em graus; o rosto inteiro (olhos, arcos e boca) gira junto.
    const [ox, oy] = s.olhar ?? [0, 0];
    e.set(THREE.MathUtils.degToRad(-oy), THREE.MathUtils.degToRad(ox), 0, 'YXZ');
    N.olhar.quaternion.copy(rot0.olhar).multiply(q.setFromEuler(e));
    const [lw, lh, arco] = s.olho ?? [1, 1, 0];
    const pisca = s.pisca ?? 1;
    N.olhos.forEach((o, i) => o.scale.set(B.olhos[i].x * Math.max(lw, 1e-4), B.olhos[i].y * Math.max(lh * pisca, 1e-4), B.olhos[i].z));
    N.arcos.forEach((o, i) => o.scale.copy(B.arcos[i]).multiplyScalar(Math.max(arco, 1e-4)));
    const b = s.boca ?? 0, abre = s.bocaAberta ?? 1;
    N.boca.visible = (s.temBoca ?? 1) > 0;
    N.boca.scale.set(B.boca.x * (0.82 + 0.22 * b), B.boca.y * Math.max(1e-4, (0.13 + 0.87 * b) * abre), B.boca.z);
    const lg = Math.min(1, Math.max(0, (b - 0.35) / 0.4));
    N.lingua.scale.copy(B.lingua).multiplyScalar(Math.max(lg * lg * (3 - 2 * lg), 1e-4));
    const [px, pz] = s.pendulo ?? [0, 0];
    e.set(px, 0, pz, 'XYZ');
    N.pendulo.quaternion.copy(rot0.pendulo).multiply(q.setFromEuler(e));
  }

  return { ator, nos: N, pose };
}
