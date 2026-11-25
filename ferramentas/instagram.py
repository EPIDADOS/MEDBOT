"""Cópia em 720p para subir no Instagram pela extensão do Chrome (o arquivo de 1080p, de 30 a 45 MB, travava o upload).

Uso (na raiz do kit): python -I ferramentas/instagram.py videos/28-video-x/out/x.mp4
Gera videos/28-video-x/out/x-instagram.mp4: 720 × 1280, duas passadas a cerca de 600 kbps, com redução de ruído leve
(hqdn3d), áudio AAC de 128 kbps e faststart. Fica com 5 a 7 MB.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from conferir import ffmpeg  # noqa: E402

entrada = Path(sys.argv[1])
saida = entrada.with_name(entrada.stem + '-instagram.mp4')
filtro = 'scale=720:1280:flags=lanczos,hqdn3d=1.5:1.5:4:4'
with tempfile.TemporaryDirectory() as tmp:
    log = str(Path(tmp) / 'passagem')
    nulo = 'NUL' if sys.platform.startswith('win') else '/dev/null'
    subprocess.run([ffmpeg(), '-hide_banner', '-loglevel', 'error', '-y', '-i', str(entrada), '-vf', filtro, '-c:v', 'libx264', '-preset', 'slow',
                    '-b:v', '600k', '-pass', '1', '-passlogfile', log, '-an', '-f', 'mp4', nulo], check=True)
    subprocess.run([ffmpeg(), '-hide_banner', '-loglevel', 'error', '-y', '-i', str(entrada), '-vf', filtro, '-c:v', 'libx264', '-preset', 'slow',
                    '-b:v', '600k', '-pass', '2', '-passlogfile', log, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(saida)], check=True)
print(saida, round(saida.stat().st_size / 1e6, 1), 'MB')
