"""Deixa a narração no ritmo de rede social: encurta os silêncios entre as frases e acelera um pouco, sem mudar o tom.
Recalcula o tempo de cada letra para a legenda e a boca do Medbot continuarem certas.

Uso (na pasta do vídeo): python -I tools/voz_rapida.py <take> [velocidade=1.10] [pausa=0.09]
Lê assets/audio/<take>/narracao.mp3 e narracao-alinhamento.json; grava narracao-rapida.wav e narracao-rapida-alinhamento.json.
"""
import json
import subprocess
import sys
import wave
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
TAKE = sys.argv[1]
VEL = float(sys.argv[2]) if len(sys.argv) > 2 else 1.10
PAUSA = float(sys.argv[3]) if len(sys.argv) > 3 else 0.09
SR = 44100
DIR = PASTA / "assets" / "audio" / TAKE

pcm = subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-i", str(DIR / "narracao.mp3"), "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768
passo = int(0.01 * SR)
rms = np.array([np.sqrt(np.mean(x[i:i + passo] ** 2)) for i in range(0, len(x) - passo, passo)])
limiar = max(0.006, np.percentile(rms, 95) * 0.06)
mudo = rms < limiar

# Trechos mudos (em quadros de 10 ms) com mais de 0,16 s; o começo e o fim viram quase nada.
cortes = []  # (início, fim) em amostras do original a remover
i = 0
while i < len(mudo):
    if mudo[i]:
        j = i
        while j < len(mudo) and mudo[j]:
            j += 1
        a, b = i * passo, j * passo
        if i == 0:
            cortes.append((0, max(0, b - int(0.06 * SR))))
        elif j >= len(mudo):
            cortes.append((a + int(0.25 * SR), len(x)))
        elif (b - a) / SR > 0.16:
            fica = int(PAUSA * SR)
            cortes.append((a + fica // 2, b - fica // 2))
        i = j
    else:
        i += 1

# Monta o áudio sem os cortes, com uma emenda suave de 8 ms em cada um.
partes, pos, emenda = [], 0, int(0.008 * SR)
for a, b in cortes:
    if a > pos:
        partes.append(x[pos:a].copy())
    pos = b
partes.append(x[pos:].copy())
y = partes[0]
for p in partes[1:]:
    if len(y) > emenda and len(p) > emenda:
        r = np.linspace(0, 1, emenda, dtype=np.float32)
        y = np.concatenate([y[:-emenda], y[-emenda:] * (1 - r) + p[:emenda] * r, p[emenda:]])
    else:
        y = np.concatenate([y, p])


def novo_tempo(t):
    """Tempo no áudio sem as pausas, antes de acelerar."""
    s = t * SR
    tirado = 0
    for a, b in cortes:
        if s >= b:
            tirado += b - a
        elif s > a:
            tirado += s - a
            break
        else:
            break
    return (s - tirado) / SR


tmp = DIR / "sem-pausas.wav"
with wave.open(str(tmp), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", "-i", str(tmp), "-af", f"atempo={VEL}", "-ar", str(SR), str(DIR / "narracao-rapida.wav")], check=True)
tmp.unlink()

al = json.loads((DIR / "narracao-alinhamento.json").read_text(encoding="utf-8"))
a = al["alignment"]
a["character_start_times_seconds"] = [round(novo_tempo(t) / VEL, 4) for t in a["character_start_times_seconds"]]
a["character_end_times_seconds"] = [round(novo_tempo(t) / VEL, 4) for t in a["character_end_times_seconds"]]
al["rapida"] = {"velocidade": VEL, "pausa": PAUSA, "cortes": len(cortes)}
(DIR / "narracao-rapida-alinhamento.json").write_text(json.dumps(al, ensure_ascii=False), encoding="utf-8")
print(f"{len(x) / SR:.1f} s -> {len(y) / SR / VEL:.1f} s ({len(cortes)} pausas encurtadas, {VEL}x)")
