"""Conferências do vídeo pronto.

Uso (na raiz do kit):
  python -I ferramentas/conferir.py brancos videos/28-video-x/out/x.mp4      quadros brancos (falha da GPU no render)
  python -I ferramentas/conferir.py folha saida.jpg 300 q1.jpg q2.jpg ...      folha com quadros lado a lado (para revisar stills)
  python -I ferramentas/conferir.py quadros videos/28-video-x/out/x.mp4 saida.jpg 2.5 10 20.4
                                                                              tira esses instantes do vídeo e monta a folha
"""
import shutil
import subprocess
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parents[1]


def ffmpeg():
    pastas = [KIT / 'node_modules' / 'ffmpeg-static'] + [KIT.parent / d / 'node_modules' / 'ffmpeg-static' for d in ('VIDEO MAPA', 'REACT IA', 'VIDEO MEDICINA')]
    for pasta in pastas:
        for nome in ('ffmpeg.exe', 'ffmpeg'):
            if (pasta / nome).exists():
                return str(pasta / nome)
    achado = shutil.which('ffmpeg')
    if achado:
        return achado
    raise SystemExit('ffmpeg não encontrado: rode npm install na raiz do kit ou instale o ffmpeg')


def brancos(videos):
    for v in videos:
        d = subprocess.run([ffmpeg(), '-hide_banner', '-loglevel', 'error', '-i', v, '-vf', 'fps=30,scale=27:48', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
                           capture_output=True, check=True).stdout
        n = 27 * 48
        medias = [sum(d[i:i + n]) / n for i in range(0, len(d), n)]
        achados = [i for i, x in enumerate(medias) if x > 180]
        faixas = []
        for b in achados:
            if faixas and b == faixas[-1][1] + 1:
                faixas[-1][1] = b
            else:
                faixas.append([b, b])
        print(Path(v).name, len(medias), 'quadros,', len(achados), 'brancos', [(round(a / 30, 2), round(b / 30, 2)) for a, b in faixas])


def folha(saida, largura, imagens):
    from PIL import Image, ImageDraw
    ims = [Image.open(p).convert('RGB') for p in imagens]
    alt = round(largura * 1920 / 1080)
    f = Image.new('RGB', (len(ims) * (largura + 6), alt), (40, 40, 40))
    for i, im in enumerate(ims):
        j = im.resize((largura, alt), Image.LANCZOS)
        ImageDraw.Draw(j).text((6, 6), Path(imagens[i]).name, fill=(255, 0, 255))
        f.paste(j, (i * (largura + 6), 0))
    f.save(saida, quality=90)
    print(saida)


def quadros(video, saida, instantes):
    tmp = Path(saida).with_suffix('')
    tmp.mkdir(exist_ok=True)
    arqs = []
    for t in instantes:
        a = tmp / f'q-{float(t):07.2f}.jpg'
        subprocess.run([ffmpeg(), '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(t), '-i', video, '-frames:v', '1', '-q:v', '3', str(a)], check=True)
        arqs.append(str(a))
    folha(saida, 260, arqs)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'brancos':
        brancos(sys.argv[2:])
    elif cmd == 'folha':
        folha(sys.argv[2], int(sys.argv[3]), sys.argv[4:])
    elif cmd == 'quadros':
        quadros(sys.argv[2], sys.argv[3], sys.argv[4:])
    else:
        print(__doc__)
