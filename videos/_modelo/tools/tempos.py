"""Cruza o roteiro (roteiro/falas.json) com o tempo de cada letra da narração e mede a voz quadro a quadro.

Uso (na pasta do vídeo): python -I tools/tempos.py [take]   (take padrão: diego, em assets/audio/<take>/)
Usa a versão rápida da narração (narracao-rapida.wav, de tools/voz_rapida.py) quando ela existe.
Gera src/tempos.js (window.TEMPOS): duração, cada fala (início, fim, cena, legenda), cada palavra da legenda e a
abertura da boca do Medbot em cada quadro (medida no volume da voz). As marcações do Eleven v3 ([excited]) não
entram na legenda. A voz começa em ATRASO segundos e o vídeo termina CAUDA segundos depois dela.
"""
import array
import json
import math
import re
import subprocess
import sys
from pathlib import Path

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

RAIZ = PASTA.parents[1]
FFMPEG = _ffmpeg(PASTA.parents[1])
TAKE = sys.argv[1] if len(sys.argv) > 1 else "diego"
AUDIO = PASTA / "assets" / "audio" / TAKE
RAPIDA = (AUDIO / "narracao-rapida-alinhamento.json").exists()
NOME = "narracao-rapida" if RAPIDA else "narracao"
ARQ_AUDIO = NOME + (".wav" if RAPIDA else ".mp3")
FPS = 30
ATRASO = 0.25
CAUDA = 1.6
MARCA = re.compile(r"\[[^\]]*\]\s*")

roteiro = json.loads((PASTA / "roteiro" / "falas.json").read_text(encoding="utf-8"))
al = json.loads((AUDIO / f"{NOME}-alinhamento.json").read_text(encoding="utf-8"))["alignment"]
letras = al["characters"]
ini_l = al["character_start_times_seconds"]
fim_l = al["character_end_times_seconds"]
baixo = "".join(letras).lower()

# ---------------------------------------------------------------- falas e palavras
falas, palavras = [], []
pos = 0
for i, f in enumerate(roteiro["falas"]):
    alvo = f["fala"].lower()
    k = baixo.find(alvo, pos)
    if k < 0:
        raise SystemExit(f"fala não achada no alinhamento: {f['fala']}")
    a, b = k, k + len(alvo) - 1
    pos = b + 1
    if letras[a] == "[":  # pula a marcação do começo da fala
        a = baixo.index("]", a) + 1
        while letras[a].isspace():
            a += 1
    t0, t1 = ini_l[a] + ATRASO, fim_l[b] + ATRASO
    legenda = MARCA.sub("", f.get("legenda", f["fala"])).strip()
    falas.append({"cena": f["cena"], "legenda": legenda, "ini": round(t0, 3), "fim": round(t1, 3)})
    faladas, j = [], a
    while j <= b:
        while j <= b and letras[j].isspace():
            j += 1
        if j > b:
            break
        s = j
        while j <= b and not letras[j].isspace():
            j += 1
        if letras[s] != "[":
            faladas.append((ini_l[s] + ATRASO, fim_l[j - 1] + ATRASO))
    escritas = legenda.split()
    if len(escritas) == len(faladas):
        tempos = faladas
    else:  # a legenda difere do que a voz lê (DI, aVF, 300): reparte o tempo da fala pelo tamanho das palavras
        total = sum(len(w) + 1 for w in escritas)
        tempos, acc = [], t0
        for w in escritas:
            d = (t1 - t0) * (len(w) + 1) / total
            tempos.append((acc, acc + d))
            acc += d
    for w, (p0, p1) in zip(escritas, tempos):
        palavras.append({"fala": i, "texto": w, "ini": round(p0, 3), "fim": round(p1, 3)})

duracao = math.ceil((fim_l[-1] + ATRASO + CAUDA) * FPS) / FPS
quadros = round(duracao * FPS)

# ---------------------------------------------------------------- voz por quadro (abertura da boca)
pcm = subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-i", str(AUDIO / ARQ_AUDIO),
                      "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
amostras = array.array("h", pcm)
por_quadro = 16000 / FPS
rms = []
for q in range(quadros):
    c = (q / FPS - ATRASO) * 16000
    a, b = int(c - por_quadro * 0.5), int(c + por_quadro * 0.5)
    if b <= 0 or a >= len(amostras):
        rms.append(0.0)
        continue
    trecho = amostras[max(0, a):min(len(amostras), b)]
    rms.append(math.sqrt(sum(x * x for x in trecho) / max(1, len(trecho))))
ref = sorted(rms)[int(len(rms) * 0.95)] or 1.0
boca, v = [], 0.0
for r in rms:
    alvo = min(1.0, max(0.0, (r / ref - 0.10) / 0.8)) ** 0.8
    v += (alvo - v) * (0.7 if alvo > v else 0.42)  # abre rápido e fecha um pouco mais devagar
    boca.append(round(v, 3))

(PASTA / "src").mkdir(exist_ok=True)
dados = {"fps": FPS, "duracao": duracao, "atraso": ATRASO, "take": TAKE, "audio": ARQ_AUDIO,
         "falas": falas, "palavras": palavras, "boca": boca}
(PASTA / "src" / "tempos.js").write_text(
    "// Gerado por tools/tempos.py a partir do roteiro e do tempo de cada letra da narração. Não edite à mão.\n"
    f"window.TEMPOS = {json.dumps(dados, ensure_ascii=False)};\n", encoding="utf-8")
print(f"{len(falas)} falas, {len(palavras)} palavras, {duracao:.2f} s, {quadros} quadros ({ARQ_AUDIO})")
