"""Mede o quanto uma narração soa viva: variação de altura (melodia) e de volume, e a velocidade.
Voz robótica tem a melodia achatada (desvio pequeno em semitons) e o volume sempre igual.

Uso (na pasta do vídeo): python -I tools/prosodia.py <take> [<take> ...]   (takes em assets/audio/<take>/)
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

PASTA = Path(__file__).resolve().parents[1]


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

FFMPEG = _ffmpeg(PASTA.parents[1])
SR = 16000


def analisa(take):
    mp3 = PASTA / "assets" / "audio" / take / "narracao.mp3"
    pcm = subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-i", str(mp3), "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768
    jan, passo = int(0.04 * SR), int(0.01 * SR)
    f0, rms = [], []
    for i in range(0, len(x) - jan, passo):
        q = x[i:i + jan] * np.hanning(jan)
        e = float(np.sqrt(np.mean(q * q)))
        rms.append(e)
        if e < 0.02:
            f0.append(np.nan)
            continue
        ac = np.correlate(q, q, "full")[jan - 1:]
        ac /= ac[0] + 1e-9
        lo, hi = SR // 400, SR // 70
        k = lo + int(np.argmax(ac[lo:hi]))
        f0.append(SR / k if ac[k] > 0.45 else np.nan)
    f0 = np.array(f0)
    v = f0[~np.isnan(f0)]
    st = 12 * np.log2(v / np.median(v))
    rms = np.array(rms)
    falado = rms > 0.02
    al = json.loads((mp3.parent / "narracao-alinhamento.json").read_text(encoding="utf-8"))
    texto = al["text"]
    palavras = len([w for w in texto.split() if not w.startswith("[")])
    dur = len(x) / SR
    db = 20 * np.log10(rms[falado] + 1e-9)
    print(f"{take:22s} melodia {np.std(st):4.2f} st (faixa {np.percentile(st, 90) - np.percentile(st, 10):4.1f})  "
          f"volume {np.std(db):4.1f} dB  {palavras / dur * 60:5.0f} palavras/min  {dur:5.1f} s")


for t in sys.argv[1:]:
    analisa(t)
