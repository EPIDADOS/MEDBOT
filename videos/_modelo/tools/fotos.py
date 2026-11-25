"""Prepara as fotos reais (Wikimedia Commons, licença aberta) do vídeo mito × verdade.

Uso (na pasta do vídeo): python -I tools/fotos.py [grade]   -> assets/fotos/prep/ e assets/fotos/prep/tamanhos.json
Só recortes: a coleta de sangue no tubo, o PET sem a régua de cores, a língua só na boca (sem os olhos), o grupo na
termografia (a foto da tela da câmera) sem a escala e o logotipo, as mãos estalando sem o rosto e o raio-X da mão
nos dedos e nas articulações (sem a marca do lado). Nada é alterado. Créditos em assets/fotos/creditos.json.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

PASTA = Path(__file__).resolve().parents[1] / "assets" / "fotos"
SAIDA = PASTA / "prep"
SAIDA.mkdir(exist_ok=True)
tamanhos = {}

FOTOS = {
    "sangue": ("sangue.jpg", (0.0, 0.0, 1.0, 0.75)),
    "cerebro": ("pet.jpg", (0.3, 0.1, 0.77, 0.98)),
    "lingua": ("lingua.jpg", (0.25, 0.0, 0.95, 0.9)),
    "calor": ("termica.jpg", (0.2, 0.135, 0.78, 0.85)),
    "dedos": ("estalo.jpg", (0.05, 0.3, 0.95, 1.0)),
    "mao": ("mao.jpg", (0.0, 0.1, 1.0, 0.62)),
}

for nome, (arq, caixa) in FOTOS.items():
    im = Image.open(PASTA / arq).convert("RGB")
    w, h = im.size
    im = im.crop((round(caixa[0] * w), round(caixa[1] * h), round(caixa[2] * w), round(caixa[3] * h)))
    if im.height > 1100:
        im = im.resize((round(im.width * 1100 / im.height), 1100), Image.LANCZOS)
    im.save(SAIDA / f"{nome}.jpg", quality=92)
    tamanhos[nome] = [im.width, im.height]
    if "grade" in sys.argv:
        g = im.copy()
        d = ImageDraw.Draw(g)
        for k in range(1, 10):
            x, y = g.width * k / 10, g.height * k / 10
            d.line((x, 0, x, g.height), fill=(0, 200, 255), width=2)
            d.line((0, y, g.width, y), fill=(0, 200, 255), width=2)
            d.text((x + 4, 4), f"{k / 10:.1f}", fill=(255, 255, 0))
            d.text((4, y + 4), f"{k / 10:.1f}", fill=(255, 255, 0))
        g.save(SAIDA / f"_grade-{nome}.jpg", quality=80)

(SAIDA / "tamanhos.json").write_text(json.dumps(tamanhos, indent=1), encoding="utf-8")
print(json.dumps(tamanhos))
