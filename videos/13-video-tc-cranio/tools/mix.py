"""Mixa o áudio do vídeo: a voz rápida, a trilha (que abaixa sozinha quando a voz fala) e os efeitos nos instantes
que a animação exporta (out/deixas.json, de node tools/render.cjs --deixas). Termina em -14 LUFS.

Uso (na pasta do vídeo): python -I tools/mix.py [take]   -> out/audio-final.wav
"""
import json
import re
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
TAKE = sys.argv[1] if len(sys.argv) > 1 else "diego"
SR = 48000
EF = PASTA / "assets" / "audio" / "efeitos"


def le(arq):
    pcm = subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-i", str(arq), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32).copy()


deixas = json.loads((PASTA / "out" / "deixas.json").read_text(encoding="utf-8"))
tempos = (PASTA / "src" / "tempos.js").read_text(encoding="utf-8")
atraso = float(re.search(r'"atraso": ([0-9.]+)', tempos).group(1))
audio_voz = re.search(r'"audio": "([^"]+)"', tempos).group(1)
n = int(deixas["duracao"] * SR)

# Voz
voz = le(PASTA / "assets" / "audio" / TAKE / audio_voz)
v = np.zeros(n, np.float32)
a = int(atraso * SR)
v[a:a + len(voz)] = voz[: max(0, n - a)]
v *= 0.5 / (np.percentile(np.abs(v[v != 0]), 99.5) + 1e-9)

# Trilha, com o abaixamento sob a voz (envelope da voz: sobe em 30 ms, desce em 300 ms)
m = le(EF / "trilha.mp3")[:n]
m = np.pad(m, (0, n - len(m)))
m *= 0.5 / (np.percentile(np.abs(m), 99.5) + 1e-9)
env = np.abs(v)
bloco = SR // 100
e = env[: len(env) // bloco * bloco].reshape(-1, bloco).max(axis=1)
s, suav = 0.0, []
for x in e:
    s += (x - s) * (0.6 if x > s else 0.035)
    suav.append(s)
suav = np.repeat(np.array(suav), bloco)
suav = np.pad(suav, (0, n - len(suav)), mode="edge")
fala = np.clip(suav / 0.08, 0, 1)
ganho_m = 10 ** ((-13 - 9 * fala) / 20)  # -13 dB sem voz, -22 dB com voz
fade = np.ones(n, np.float32)
fim = int(1.4 * SR)
fade[-fim:] = np.linspace(1, 0, fim)
m = m * ganho_m * fade

# Efeitos
sons = {}
ef = np.zeros(n, np.float32)
for c in deixas["cues"]:
    if c["som"] not in sons:
        x = le(EF / f"sfx-{c['som']}.mp3")
        sons[c["som"]] = x * (0.5 / (np.max(np.abs(x)) + 1e-9))
    x = sons[c["som"]] * c.get("vol", 1) * 0.55
    i = int(c["t"] * SR)
    j = min(n, i + len(x))
    if i < n:
        ef[i:j] += x[: j - i]

mix = v + m + ef
mix /= max(1.0, np.max(np.abs(mix)) / 0.95)
tmp = PASTA / "out" / "audio-mix.wav"
with wave.open(str(tmp), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
# Volume em duas passadas: mede e depois corrige de forma linear, para cair em -14 LUFS.
med = subprocess.run([str(FFMPEG), "-hide_banner", "-nostats", "-i", str(tmp), "-af", "loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
j = json.loads(med[med.rindex("{"):med.rindex("}") + 1])
filtro = (f"loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", "-i", str(tmp),
                "-af", filtro, "-ar", str(SR), "-ac", "2", str(PASTA / "out" / "audio-final.wav")], check=True)
tmp.unlink()
print(f"audio-final.wav: {n / SR:.1f} s, {len(deixas['cues'])} efeitos")
