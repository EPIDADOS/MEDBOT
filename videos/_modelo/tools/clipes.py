"""Prepara os clipes reais de ultrassom (Wikimedia Commons, licença aberta) do vídeo dos 5 P do POCUS.

Uso (na pasta do vídeo):
  python -I tools/clipes.py            -> assets/clipes/<nome>/f001.jpg... (30 quadros por segundo) e assets/clipes/tamanhos.json
  python -I tools/clipes.py grade      -> também assets/clipes/_grade-<nome>.jpg (o 1º quadro com a grade de 0 a 1, para achar as marcações)
Só recorta o setor do ultrassom (sem os textos e as marcas do aparelho e do artigo) e escolhe um trecho; nada é alterado.
As fotos paradas (o modo M e a vesícula) também viram um "clipe" de 1 quadro. Créditos em assets/fotos/creditos.json.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

PASTA = Path(__file__).resolve().parents[1]
FONTE = PASTA / 'assets' / 'fotos'
SAIDA = PASTA / 'assets' / 'clipes'
RAIZ = PASTA.parents[1]


def _ffmpeg(raiz):
    """O ffmpeg da raiz do kit (npm install instala o ffmpeg-static), de uma pasta acima ou o do sistema."""
    import shutil
    pastas = [raiz / "node_modules" / "ffmpeg-static"] + [raiz.parent / d / "node_modules" / "ffmpeg-static" for d in ("VIDEO MAPA", "REACT IA", "VIDEO MEDICINA")]
    for pasta in pastas:
        for nome in ("ffmpeg.exe", "ffmpeg"):
            if (pasta / nome).exists():
                return pasta / nome
    achado = shutil.which("ffmpeg")
    if achado:
        return Path(achado)
    raise SystemExit("ffmpeg não encontrado: rode npm install na raiz do kit ou instale o ffmpeg")


FF = _ffmpeg(PASTA.parents[1])

# nome: (arquivo, início em s, duração em s ou 0 para foto, recorte normalizado x0, y0, x1, y1)
# O FAST vem com pixels não quadrados (720 × 480, SAR 8:9): passa antes por 640 × 480.
PRE = {'fast': ('scale=640:480,setsar=1,', 640, 480)}
CLIPES = {
    'pedra': ('pedra.jpg', 0, 0, (0.08, 0.0, 0.95, 1.0)),
    'praia': ('praia.jpg', 0, 0, (0.05, 0.53, 0.9, 0.95)),
    'desliza': ('desliza.mpg', 0.5, 4, (0.25, 0.12, 0.81, 0.84)),
    'naodesliza': ('naodesliza.ogv', 0, 2.6, (0.24, 0.075, 0.825, 0.82)),
    'ponto': ('ponto.ogv', 0, 6, (0.36, 0.095, 0.71, 0.86)),
    'blinhas': ('blinhas.avi', 0, 3, (0.25, 0.19, 0.98, 0.84)),
    'pleural': ('pleural2.ogv', 0, 4, (0.13, 0.07, 0.9, 0.93)),
    'fast': ('fast.ogv', 0, 1.4, (0.15, 0.02, 0.72, 0.92)),
    'pericardio': ('pericardio.webm', 0, 0.92, (0.12, 0.03, 0.8, 0.8)),
}
ALTURA = 720
so = [a for a in sys.argv[1:] if a in CLIPES]
grade = 'grade' in sys.argv
SAIDA.mkdir(parents=True, exist_ok=True)
arq_t = SAIDA / 'tamanhos.json'
tamanhos = json.loads(arq_t.read_text(encoding='utf-8')) if arq_t.exists() else {}


def tamanho_video(arq):
    r = subprocess.run([str(FF), '-hide_banner', '-i', str(arq)], capture_output=True, text=True, encoding='utf-8', errors='replace')
    for linha in r.stderr.splitlines():
        if 'Video:' in linha:
            for parte in linha.replace(',', ' ').split():
                if 'x' in parte and parte.split('x')[0].isdigit() and parte.split('x')[1].isdigit():
                    return int(parte.split('x')[0]), int(parte.split('x')[1])
    raise SystemExit('sem vídeo em ' + str(arq))


for nome, (arq, ini, dur, (x0, y0, x1, y1)) in CLIPES.items():
    if so and nome not in so:
        continue
    origem = FONTE / arq
    if not origem.exists():
        print('falta', arq)
        continue
    dest = SAIDA / nome
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir()
    if dur == 0:
        im = Image.open(origem).convert('RGB')
        w, h = im.size
        im = im.crop((round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h)))
        if im.height > ALTURA:
            im = im.resize((round(im.width * ALTURA / im.height), ALTURA), Image.LANCZOS)
        im.save(dest / 'f001.jpg', quality=92)
        n = 1
    else:
        pre, *wh = PRE.get(nome, ('',))
        w, h = wh if wh else tamanho_video(origem)
        cw, ch = round((x1 - x0) * w / 2) * 2, round((y1 - y0) * h / 2) * 2
        cx, cy = round(x0 * w), round(y0 * h)
        esc = f',scale=-2:{ALTURA}:flags=lanczos' if ch > ALTURA else ''
        subprocess.run([str(FF), '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(ini), '-t', str(dur), '-i', str(origem),
                        '-vf', f'{pre}crop={cw}:{ch}:{cx}:{cy}{esc},fps=30', '-q:v', '3', str(dest / 'f%03d.jpg')], check=True)
        n = len(list(dest.glob('f*.jpg')))
        im = Image.open(dest / 'f001.jpg')
    tamanhos[nome] = [im.width, im.height, n]
    if grade:
        g = Image.open(dest / 'f001.jpg').convert('RGB')
        d = ImageDraw.Draw(g)
        for k in range(1, 10):
            x, y = g.width * k / 10, g.height * k / 10
            d.line((x, 0, x, g.height), fill=(0, 200, 255), width=1)
            d.line((0, y, g.width, y), fill=(0, 200, 255), width=1)
            d.text((x + 3, 3), f'{k / 10:.1f}', fill=(255, 255, 0))
            d.text((3, y + 3), f'{k / 10:.1f}', fill=(255, 255, 0))
        g.save(SAIDA / f'_grade-{nome}.jpg', quality=85)
    print(nome, tamanhos[nome])

arq_t.write_text(json.dumps(tamanhos, indent=1), encoding='utf-8')
(PASTA / 'src' / 'clipes.js').write_text('// Gerado por tools/clipes.py: largura, altura e quadros de cada clipe. Não edite à mão.\n'
                                         'window.CLIPES_TAM = ' + json.dumps(tamanhos) + ';\n', encoding='utf-8')
