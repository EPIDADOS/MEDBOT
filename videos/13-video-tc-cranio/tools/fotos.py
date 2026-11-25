"""Prepara as tomografias reais (Wikimedia Commons, licença aberta) para o vídeo da TC de crânio.

Uso (na pasta do vídeo): python -I tools/fotos.py   -> assets/fotos/prep/ e assets/fotos/prep/tamanhos.json

- As normais (Mikael Häggström, CC0) vêm com a reconstrução sagital ao lado: fica só o corte axial, com o mesmo recorte
  em todas, para a rolagem de cortes do gancho.
- As setas e os textos que os autores puseram sobre algumas imagens (seta vermelha na epidural, seta preta no desvio,
  seta vermelha na subdural, legenda em inglês na fratura) são apagados por inpainting (OpenCV), porque o vídeo
  desenha as próprias marcações. Nenhum pixel da anatomia ou da lesão é inventado: só as marcas sobrepostas saem.
"""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

PASTA = Path(__file__).resolve().parents[1] / "assets" / "fotos"
SAIDA = PASTA / "prep"
SAIDA.mkdir(exist_ok=True)
tamanhos = {}


def abre(nome):
    return np.array(Image.open(PASTA / nome).convert("RGB"))


def apaga(img, mascara, raio=6):
    """Inpainting das marcas (máscara 0/255)."""
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    out = cv2.inpaint(bgr, mascara.astype(np.uint8), raio, cv2.INPAINT_TELEA)
    return cv2.cvtColor(out, cv2.COLOR_BGR2RGB)


def dist_segmento(h, w, a, b):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    u = np.clip(((xx - ax) * dx + (yy - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    return np.hypot(xx - (ax + u * dx), yy - (ay + u * dy))


def salva(nome, img, altura=None):
    img = img[3:-3, 3:-3]  # tira a moldura de 1 a 2 px que algumas imagens trazem
    im = Image.fromarray(img).convert("L").point(lambda v: 0 if v < 14 else v).convert("RGB")
    if altura and im.height != altura:
        im = im.resize((round(im.width * altura / im.height), altura), Image.LANCZOS)
    im.save(SAIDA / f"{nome}.jpg", quality=92)
    tamanhos[nome] = [im.width, im.height]


# normais: só o corte axial, mesmo recorte para todas
for n in ["08", "11", "16", "21", "26"]:
    salva(f"normal{n}", abre(f"normal{n}.png")[15:468, 15:350], 1000)

# epidural (Hellerhoff): apaga a seta vermelha na pele
img = abre("epidural2.jpg")
r, g, b = img[..., 0].astype(int), img[..., 1].astype(int), img[..., 2].astype(int)
verm = (r > 120) & (r - g > 60) & (r - b > 60)
verm[:, 80:] = False
m = cv2.dilate(verm.astype(np.uint8) * 255, np.ones((5, 5), np.uint8), iterations=2)
salva("epidural", apaga(img, m, 5), 1000)

# subdural (James Heilman): apaga a seta vermelha
img = abre("subdural2.png")
r, g, b = img[..., 0].astype(int), img[..., 1].astype(int), img[..., 2].astype(int)
verm = (r > 120) & (r - g > 60) & (r - b > 60)
m = cv2.dilate(verm.astype(np.uint8) * 255, np.ones((5, 5), np.uint8), iterations=2)
salva("subdural", apaga(img, m, 7), 1000)

# desvio da linha média (Heilman): apaga a seta preta
img = abre("desvio.png")
h, w = img.shape[:2]
d = dist_segmento(h, w, (313, 221), (221, 336))
escuro = img.max(axis=2) < 70
m = ((d < 20) & escuro).astype(np.uint8) * 255
m = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=2)
salva("desvio", apaga(img, m, 7), 1000)

# hemorragia subaracnoide (Lipothymia): sem marcas
salva("hsa", abre("hsa2.jpg"), 1000)

# hidrocefalia (Monfils): tira os apoios de cabeça dos lados
img = abre("hidro.jpg").copy()
for x0, x1 in [(0, 108), (420, 512)]:
    reg = img[:, x0:x1]
    reg[reg.max(axis=2) > 140] = 0
reg = img[420:512, 408:512]
reg[reg.max(axis=2) > 100] = 0
salva("hidro", img[75:480, 100:430], 1000)

# AVC isquêmico de ACM (Monfils): sem marcas
salva("avc", abre("avc.jpg"), 1100)

# fratura em janela óssea (Cerevisae): apaga a legenda em inglês e o traço que aponta
img = abre("fratura.jpg")
h, w = img.shape[:2]
claro = img.max(axis=2) > 150
m = np.zeros((h, w), bool)
m[0:46, 0:330] = claro[0:46, 0:330]
d = dist_segmento(h, w, (70, 40), (122, 177))
m |= (d < 7) & claro & (np.mgrid[0:h, 0:w][0] < 178)
m = cv2.dilate(m.astype(np.uint8) * 255, np.ones((3, 3), np.uint8), iterations=2)
salva("fratura", apaga(img, m, 6)[40:480, 30:482], 1000)

# pneumoencéfalo com fratura do seio frontal (Heilman, sagital): sem marcas
salva("pneumo", abre("pneumo.png"), 900)

(SAIDA / "tamanhos.json").write_text(json.dumps(tamanhos, indent=1), encoding="utf-8")
print(json.dumps(tamanhos))
