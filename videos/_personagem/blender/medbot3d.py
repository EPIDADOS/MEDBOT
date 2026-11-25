"""Medbot em 3D, feito só por código no Blender, e animado num loop de 6 s (30 fps, 180 quadros).

A mesma figura do SVG (bot/medbot.js): bola lima, dois olhos em pílula, sem boca e o estetoscópio no pescoço
com o diafragma de metal pendurado à direita. No loop ele flutua, pisca, olha para a direita e para cima,
toma um susto, pula, aterrissa amassando, fica feliz balançando e volta ao começo (o último quadro emenda no primeiro).

Uso (na raiz do repositório):
  blender -b --factory-startup -P TIKTOK/_personagem/blender/medbot3d.py -- quadros=0,40,112,140 saida=<pasta> res=540
  blender -b --factory-startup -P TIKTOK/_personagem/blender/medbot3d.py -- animacao=1 saida=<pasta> res=1080
Opções: quadros (lista, renderiza só esses), animacao=1 (todos), saida (pasta dos PNG com transparência),
res (lado do quadro quadrado), amostras (padrão 32), blend=<arquivo.blend> (salva a cena),
glb=<arquivo.glb> (exporta o Medbot parado para o navegador), fala=<arquivo.json> (modo fala: a boca segue a voz e o olhar e a expressão seguem o roteiro; gerado pelo
tools/tempos.py do vídeo; com animacao=1 renderiza o vídeo inteiro).
"""
import math
import sys
import time
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

ARGS = dict(a.split("=", 1) for a in (sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []))
RES = int(ARGS.get("res", 540))
AMOSTRAS = int(ARGS.get("amostras", 32))
SAIDA = Path(ARGS.get("saida", "render/medbot3d")).resolve()
QUADROS = 180

# ---------------------------------------------------------------- cena limpa
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)
cena = bpy.context.scene
colecao = cena.collection


def lin(hexa):
    h = hexa.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


def material(nome, cor, rough, metal=0.0, coat=0.0, coat_rough=0.1, sss=0.0, spec=0.5):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = lin(cor)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Coat Roughness"].default_value = coat_rough
    p.inputs["Specular IOR Level"].default_value = spec
    if sss:
        p.inputs["Subsurface Weight"].default_value = sss
        p.inputs["Subsurface Radius"].default_value = (0.25, 0.35, 0.12)
        p.inputs["Subsurface Scale"].default_value = 0.08
    return m


LIMA = material("lima", "#B6FA5E", 0.42, coat=0.25, coat_rough=0.14, sss=0.10, spec=0.4)
TINTA = material("olho", "#0A151B", 0.5, coat=0.35, coat_rough=0.1, spec=0.2)
BORRACHA = material("borracha", "#0A151B", 0.55, coat=0.15, coat_rough=0.25, spec=0.25)
METAL = material("metal", "#E7ECEF", 0.16, metal=1.0)
MEMBRANA = material("membrana", "#F3F6F7", 0.3, coat=0.5)


def objeto(nome, dados, mat=None, pai=None, inversa=None):
    ob = bpy.data.objects.new(nome, dados)
    colecao.objects.link(ob)
    if mat is not None:
        ob.data.materials.append(mat)
    if pai is not None:
        ob.parent = pai
        ob.matrix_parent_inverse = inversa if inversa is not None else Matrix()
    return ob


def malha(nome, bm):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def vazio(nome, pai=None, inversa=None, loc=(0, 0, 0)):
    ob = objeto(nome, None, pai=pai, inversa=inversa)
    ob.empty_display_size = 0.2
    ob.location = loc
    return ob


def curva(nome, pontos, raio, mat, pai=None, inversa=None, fechada=False):
    cu = bpy.data.curves.new(nome, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = raio
    cu.bevel_resolution = 6
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pontos) - 1)
    for pt, co in zip(sp.points, pontos):
        pt.co = (co[0], co[1], co[2], 1.0)
    sp.use_cyclic_u = fechada
    sp.use_smooth = True
    return objeto(nome, cu, mat, pai, inversa)


# ---------------------------------------------------------------- hierarquia
# raiz: no pé da bola (z = -1), para amassar e esticar a partir do chão; os filhos usam coordenadas do mundo.
raiz = vazio("raiz", loc=(0, 0, -1))
INV_RAIZ = Matrix.Translation((0, 0, 1))

bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=128, v_segments=64, radius=1.0)
corpo = objeto("corpo", malha("corpo", bm), LIMA, raiz, INV_RAIZ)

olhar = vazio("olhar", raiz, INV_RAIZ)


def orientacao(n):
    """Matriz com o Y local para dentro da bola, o X para a direita da imagem e o Z para cima."""
    y = -Vector(n).normalized()
    x = y.cross(Vector((0, 0, 1))).normalized()
    z = x.cross(y)
    return Matrix((x, y, z)).transposed().to_4x4()


def malha_pilula(a=0.077, b=0.036, c=0.178):
    """Pílula (cápsula) achatada e curvada para acompanhar a superfície da bola."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1.0)
    h = c - a
    for v in bm.verts:
        x, y, z = v.co.x * a, v.co.y * b, v.co.z * a
        z += h if v.co.z > 1e-5 else (-h if v.co.z < -1e-5 else 0.0)
        v.co = (x, y + (x * x + z * z) / 2, z)
    return malha("pilula", bm)


def pontos_arco():
    """O olho feliz (um arco), na superfície: Y local negativo é para fora."""
    pts = []
    for i in range(25):
        t = math.radians(12 + 156 * i / 24)
        x, z = 0.098 * math.cos(t), 0.082 * math.sin(t) - 0.035
        pts.append((x, -0.024 + (x * x + z * z) / 2, z))
    return pts


MALHA_OLHO = malha_pilula()
OLHOS, ARCOS = [], []
for lado, n in (("esq", (-0.143, -0.94, 0.31)), ("dir", (0.143, -0.94, 0.33))):
    n = Vector(n).normalized()
    base = Matrix.Translation(n * 0.988) @ orientacao(n)
    olho = objeto(f"olho_{lado}", MALHA_OLHO, TINTA, olhar)
    olho.matrix_basis = base
    OLHOS.append(olho)
    arco = curva(f"arco_{lado}", pontos_arco(), 0.031, TINTA, olhar)
    arco.matrix_basis = base
    arco.scale = (0, 0, 0)
    ARCOS.append(arco)

# Boca (só no modo fala): escura, reta em cima e redonda embaixo, com a língua rosa quando abre bem.
BOCA_MAT = material("boca", "#22090F", 0.55, coat=0.2, spec=0.2)
LINGUA_MAT = material("lingua", "#FF6F7D", 0.45, coat=0.2, sss=0.2)


def malha_boca(a=0.128, b=0.032, c=0.10, topo=0.032):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1.0)
    for v in bm.verts:
        x, y = v.co.x * a, v.co.y * b
        z = v.co.z * (topo if v.co.z > 0 else c)
        v.co = (x, y + (x * x + z * z) / 2, z)
    return malha("boca", bm)


n_boca = Vector((0, -1, 0.02)).normalized()
boca = objeto("boca", malha_boca(), BOCA_MAT, olhar)
boca.matrix_basis = Matrix.Translation(n_boca * 0.99) @ orientacao(n_boca)
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1.0)
for v in bm.verts:
    v.co = (v.co.x * 0.062, v.co.y * 0.017, v.co.z * 0.036)
lingua = objeto("lingua", malha("lingua", bm), LINGUA_MAT, boca)
lingua.location = (0, -0.026, -0.062)
boca.scale = (0, 0, 0)

# Estetoscópio: o tubo dá a volta no pescoço e cai em U na frente.
pts = []
for i in range(160):
    psi = 2 * math.pi * i / 160
    f = max(0.0, math.cos(psi)) ** 2
    z = -0.34 - 0.40 * f
    rh = math.sqrt(1 - z * z) + 0.046
    pts.append((rh * math.sin(psi), -rh * math.cos(psi), z))
curva("estetoscopio", pts, 0.044, BORRACHA, raiz, INV_RAIZ, fechada=True)

PSI = math.radians(30)
z_a = -0.34 - 0.40 * math.cos(PSI) ** 2
rh_a = math.sqrt(1 - z_a * z_a) + 0.046
ANCORA = Vector((rh_a * math.sin(PSI), -rh_a * math.cos(PSI), z_a))
pendulo = vazio("pendulo", raiz, INV_RAIZ, loc=ANCORA)
INV_PEND = Matrix.Translation(-ANCORA)

DISCO = ANCORA + Vector((0.035, -0.10, -0.46))
curva("tubo", [ANCORA, ANCORA + Vector((0.012, -0.03, -0.12)), ANCORA + Vector((0.026, -0.065, -0.24)), DISCO + Vector((0, 0.01, 0.2))],
      0.044, BORRACHA, pendulo, INV_PEND)

frente = Matrix.Rotation(math.radians(90), 4, "X")  # cilindros e toro de frente para a câmera
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=64, radius1=0.17, radius2=0.17, depth=0.08)
peca = objeto("diafragma", malha("diafragma", bm), METAL, pendulo, INV_PEND)
peca.matrix_basis = Matrix.Translation(DISCO) @ frente
bev = peca.modifiers.new("chanfro", "BEVEL")
bev.width, bev.segments, bev.limit_method = 0.025, 4, "ANGLE"
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=64, radius1=0.12, radius2=0.12, depth=0.02)
memb = objeto("membrana", malha("membrana", bm), MEMBRANA, pendulo, INV_PEND)
memb.matrix_basis = Matrix.Translation(DISCO + Vector((0, -0.042, 0))) @ frente
bpy.ops.mesh.primitive_torus_add(major_radius=0.172, minor_radius=0.034, major_segments=64, minor_segments=16)
aro = bpy.context.active_object
aro.name = "aro"
aro.data.materials.append(BORRACHA)
for p in aro.data.polygons:
    p.use_smooth = True
aro.parent = pendulo
aro.matrix_parent_inverse = INV_PEND
aro.matrix_basis = Matrix.Translation(DISCO + Vector((0, -0.012, 0))) @ frente
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=0.034, radius2=0.034, depth=0.12)
haste = objeto("haste", malha("haste", bm), METAL, pendulo, INV_PEND)
haste.location = DISCO + Vector((0, 0.005, 0.2))

# Sombra no chão: uma mancha macia que encolhe quando ele sobe.
sm = bpy.data.materials.new("sombra")
sm.use_nodes = True
nt = sm.node_tree
nt.nodes.clear()
saida = nt.nodes.new("ShaderNodeOutputMaterial")
mix = nt.nodes.new("ShaderNodeMixShader")
transp = nt.nodes.new("ShaderNodeBsdfTransparent")
emis = nt.nodes.new("ShaderNodeEmission")
emis.inputs["Color"].default_value = lin("#0C1A21")
coord = nt.nodes.new("ShaderNodeTexCoord")
grad = nt.nodes.new("ShaderNodeTexGradient")
grad.gradient_type = "SPHERICAL"
rampa = nt.nodes.new("ShaderNodeValToRGB")
rampa.color_ramp.interpolation = "EASE"
rampa.color_ramp.elements[0].position = 0.0
rampa.color_ramp.elements[0].color = (0, 0, 0, 1)
rampa.color_ramp.elements[1].position = 0.75
rampa.color_ramp.elements[1].color = (0.34, 0.34, 0.34, 1)
nt.links.new(coord.outputs["Object"], grad.inputs["Vector"])
nt.links.new(grad.outputs["Fac"], rampa.inputs["Fac"])
nt.links.new(rampa.outputs["Color"], mix.inputs["Fac"])
nt.links.new(transp.outputs[0], mix.inputs[1])
nt.links.new(emis.outputs[0], mix.inputs[2])
nt.links.new(mix.outputs[0], saida.inputs["Surface"])
sm.surface_render_method = "BLENDED"
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0)
sombra = objeto("sombra", malha("sombra", bm), sm)
sombra.rotation_euler = (math.radians(90), 0, 0)
sombra.location = (0, 0.3, -1.5)
sombra.visible_shadow = False
SOMBRA_ESC = (0.95, 0.15, 1.0)

# ---------------------------------------------------------------- luz, mundo e câmera
mundo = bpy.data.worlds.new("mundo")
cena.world = mundo
mundo.use_nodes = True
mundo.node_tree.nodes["Background"].inputs["Color"].default_value = lin("#B8C4C8")
mundo.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.32


def luz(nome, loc, energia, tamanho, cor="#FFFFFF", alvo=(0, 0, 0)):
    dados = bpy.data.lights.new(nome, "AREA")
    dados.energy = energia
    dados.shape = "DISK"
    dados.size = tamanho
    dados.color = lin(cor)[:3]
    ob = objeto(nome, dados)
    ob.location = loc
    direcao = Vector(alvo) - Vector(loc)
    ob.rotation_euler = direcao.to_track_quat("-Z", "Y").to_euler()
    return ob


luz("principal", (-3.2, -4.2, 3.4), 430, 3.4, "#FFF6EA")
luz("preenche", (4.0, -3.5, 0.2), 140, 4.0, "#EAF2FF")
luz("contorno", (2.6, 3.0, 2.8), 520, 2.0)
luz("contorno2", (-2.8, 2.6, 1.2), 260, 2.0)
luz("baixo", (0, -2.5, -3.2), 60, 3.0, "#F4FFE6")

cam_dados = bpy.data.cameras.new("camera")
cam_dados.lens = 92
cam_dados.sensor_fit = "VERTICAL"
cam_dados.sensor_height = 36
camera = objeto("camera", cam_dados)
camera.location = (0, -10.2, 0.85)
camera.rotation_euler = (Vector((0, 0, -0.14)) - camera.location).to_track_quat("-Z", "Y").to_euler()
cena.camera = camera

# ---------------------------------------------------------------- animação
def suave(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def chaves(f, lista):
    """Interpola entre chaves (quadro, valor) com entrada e saída suaves."""
    if f <= lista[0][0]:
        return lista[0][1]
    for (f0, v0), (f1, v1) in zip(lista, lista[1:]):
        if f0 <= f <= f1:
            t = suave((f - f0) / (f1 - f0)) if f1 > f0 else 1.0
            if isinstance(v0, tuple):
                return tuple(a + (b - a) * t for a, b in zip(v0, v1))
            return v0 + (v1 - v0) * t
    return lista[-1][1]


GIRO = [(0, (0, 0)), (22, (0, 0)), (30, (-3, 17)), (62, (-3, 17)), (72, (-11, -14)), (94, (-11, -14)),
        (100, (4, 0)), (128, (-2, 0)), (134, (-5, 0)), (160, (-5, 0)), (170, (0, 0)), (180, (0, 0))]
ESTICA = [(0, 1.0), (94, 1.0), (103, 0.85), (107, 1.13), (116, 1.0), (125, 1.07), (129, 0.82), (133, 1.06),
          (137, 0.97), (141, 1.01), (145, 1.0), (180, 1.0)]
# Olho: (largura, altura) da pílula e o tamanho do arco feliz.
FORMA = [(0, (1, 1, 0)), (98, (1, 1, 0)), (102, (1.28, 0.5, 0)), (127, (1.28, 0.5, 0)), (130, (0.6, 0.3, 0)),
         (131, (0, 0, 0)), (134, (0, 0, 1)), (158, (0, 0, 1)), (160, (0, 0, 0)), (161, (0.6, 0.4, 0)),
         (165, (1, 1, 0)), (180, (1, 1, 0))]
PISCADAS = [46, 84, 172]


def piscada(f):
    for p in PISCADAS:
        if p - 2 <= f <= p + 4:
            return 0.08 if p <= f <= p + 1 else (0.45 if f < p else 0.45 + 0.55 * (f - p - 1) / 3)
    return 1.0


def pulo(f):
    return 0.46 * max(0.0, 1 - ((f - 117.5) / 11.5) ** 2) if 106 <= f <= 129 else 0.0


def flutua(f):
    return 0.055 * math.sin(2 * math.pi * f / 60)


def balanco(f):
    """Balança de alegria, de 133 a 160."""
    if not 133 <= f <= 160:
        return 0.0
    t = (f - 133) / 27
    return math.radians(8) * math.sin(2 * math.pi * (f - 133) / 13.5) * math.sin(math.pi * t)


def pendulo_angulos(f):
    """O diafragma balança atrasado: um pouco o tempo todo, para cima na subida e quicando na aterrissagem."""
    x = 4 * math.sin(2 * math.pi * f / 60 + 1.2)
    y = 3 * math.sin(2 * math.pi * f / 60 + 0.4)
    if 104 <= f <= 129:
        x += -22 * math.sin(math.pi * (f - 104) / 25)
    if f >= 129:
        d = f - 129
        x += 24 * math.exp(-d / 9) * math.sin(2 * math.pi * d / 14)
    y += -math.degrees(balanco(f - 2)) * 1.8
    return math.radians(x), math.radians(y)


# ---------------------------------------------------------------- modo fala (vídeos com narração)
CARAS = {"normal": (1, 1, 0), "feliz": (0, 0, 1), "surpreso": (1.28, 0.5, 0), "desconfiado": (1.05, 0.42, 0),
         "preocupado": (0.9, 0.78, 0)}


def animar_fala(caminho):
    """Lê o arquivo de tools/tempos.py (abertura da boca por quadro e falas com olhar e expressão) e anima tudo."""
    import json
    dados = json.loads(Path(caminho).read_text(encoding="utf-8"))
    total, abre, falas = dados["quadros"], dados["boca"], dados["falas"]

    def fala_em(f):
        atual = None
        for i, x in enumerate(falas):
            if x["ini"] - 4 <= f:
                atual = i
        return atual

    # Piscadas a cada 3 a 4,5 s, fora das caras felizes ou de susto.
    piscadas, f = [], 40
    while f < total:
        i = fala_em(f)
        if i is None or falas[i]["cara"] not in ("feliz", "surpreso"):
            piscadas.append(f)
        f += 92 + (f * 37) % 46

    def pisca(f):
        for p in piscadas:
            if p - 2 <= f <= p + 4:
                return 0.08 if p <= f <= p + 1 else (0.45 if f < p else 0.45 + 0.55 * (f - p - 1) / 3)
        return 1.0

    olho_v = list(CARAS["normal"])
    giro_v = [0.0, 0.0]
    incl_v = 0.0
    boca_lenta = 0.0
    for f in range(total):
        cena.frame_set(f)
        i = fala_em(f)
        x = falas[i] if i is not None else {"olhar": "frente", "cara": "normal", "ini": 0, "fim": 0}
        lado = -1 if (i or 0) % 2 else 1
        # Olhar: para cima (a aula fica em cima dele) ou para a câmera.
        alvo = (-13.0, 6.0 * lado) if x["olhar"] == "cima" else (-1.0, 2.0 * lado)
        for k in range(2):
            giro_v[k] += (alvo[k] - giro_v[k]) * 0.2
        olhar.rotation_euler = (math.radians(giro_v[0]), 0, math.radians(giro_v[1]))
        # Expressão, com troca suave.
        alvo_c = CARAS.get(x["cara"], CARAS["normal"])
        for k in range(3):
            olho_v[k] += (alvo_c[k] - olho_v[k]) * 0.3
        for olho in OLHOS:
            olho.scale = (olho_v[0], 1, olho_v[1] * pisca(f))
        for a in ARCOS:
            a.scale = (olho_v[2],) * 3
        # Boca pela voz.
        v = abre[f] if f < len(abre) else 0.0
        surpresa = 1.25 if x["cara"] == "surpreso" else 1.0
        boca.scale = (0.82 + 0.22 * v, 1, (0.13 + 0.87 * v) * surpresa)
        lingua.scale = (suave((v - 0.35) / 0.4),) * 3
        boca_lenta += (v - boca_lenta) * 0.22
        # Corpo: flutua, estica um pouco com a voz, inclina a cada fala; pula no susto e balança de alegria.
        altura = 0.035 * math.sin(2 * math.pi * f / 66)
        sz = 1 + 0.045 * (boca_lenta - 0.35)
        roll = 0.0
        if i is not None:
            d = f - x["ini"]
            if x["cara"] == "surpreso" and 0 <= d <= 16:
                altura += 0.24 * math.sin(math.pi * d / 16)
                sz *= 1.06 if d < 12 else 0.9
            if x["cara"] == "feliz" and 0 <= d <= max(20, x["fim"] - x["ini"]):
                dur = max(20, x["fim"] - x["ini"])
                roll = math.radians(6) * math.sin(2 * math.pi * d / 15) * math.sin(math.pi * d / dur)
        incl_alvo = math.radians(2.5 * lado) if i is not None else 0.0
        incl_v += (incl_alvo - incl_v) * 0.08
        sx = 1 / math.sqrt(sz)
        raiz.location = (0, 0, -1 + altura)
        raiz.scale = (sx, sx, sz)
        raiz.rotation_euler = (0, roll + incl_v, 0)
        px = math.radians(4 * math.sin(2 * math.pi * f / 60 + 1.2) - 25 * (altura - 0.035 * math.sin(2 * math.pi * f / 66)))
        py = math.radians(3 * math.sin(2 * math.pi * f / 60 + 0.4)) - (roll + incl_v) * 1.6
        pendulo.rotation_euler = (px, py, 0)
        e = max(0.35, 1 - 0.9 * altura)
        sombra.scale = (SOMBRA_ESC[0] * e * sx, SOMBRA_ESC[1] * e, 1)
        for ob, caminhos in ((raiz, ("location", "scale", "rotation_euler")), (olhar, ("rotation_euler",)),
                             (pendulo, ("rotation_euler",)), (sombra, ("scale",)), (boca, ("scale",)), (lingua, ("scale",))):
            for c in caminhos:
                ob.keyframe_insert(c, frame=f)
        for ob in OLHOS + ARCOS:
            ob.keyframe_insert("scale", frame=f)
    return total


def animar_loop():
    for f in range(QUADROS + 1):
        cena.frame_set(f)
        altura = flutua(f) + pulo(f)
        sz = chaves(f, ESTICA)
        sx = 1 / math.sqrt(sz)
        raiz.location = (0, 0, -1 + altura)
        raiz.scale = (sx, sx, sz)
        raiz.rotation_euler = (0, balanco(f), 0)
        rx, rz = chaves(f, GIRO)
        olhar.rotation_euler = (math.radians(rx), 0, math.radians(rz))
        lw, lh, arco = chaves(f, FORMA)
        pisca = piscada(f)
        for olho in OLHOS:
            olho.scale = (lw, 1, lh * pisca)
        for a in ARCOS:
            a.scale = (arco, arco, arco)
        px, py = pendulo_angulos(f)
        pendulo.rotation_euler = (px, py, 0)
        e = max(0.35, 1 - 0.9 * altura)
        sombra.scale = (SOMBRA_ESC[0] * e * sx, SOMBRA_ESC[1] * e, 1)
        for ob, caminhos in ((raiz, ("location", "scale", "rotation_euler")), (olhar, ("rotation_euler",)),
                             (pendulo, ("rotation_euler",)), (sombra, ("scale",))):
            for c in caminhos:
                ob.keyframe_insert(c, frame=f)
        for ob in OLHOS + ARCOS:
            ob.keyframe_insert("scale", frame=f)


if "glb" in ARGS:
    # Exporta o Medbot parado (sem sombra, luz e câmera) para o navegador (three.js): as curvas viram malhas e
    # a boca, a língua e os arcos voltam ao tamanho 1, porque quem anima tudo é a página.
    grafo = bpy.context.evaluated_depsgraph_get()
    for ob in [o for o in bpy.data.objects if o.type == "CURVE"]:
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(grafo))
        for pol in me.polygons:
            pol.use_smooth = True
        novo = bpy.data.objects.new(ob.name, me)
        colecao.objects.link(novo)
        novo.parent = ob.parent
        novo.matrix_parent_inverse = ob.matrix_parent_inverse.copy()
        novo.matrix_basis = ob.matrix_basis.copy()
        for c in list(ob.children):
            c.parent = novo
        nome = ob.name
        bpy.data.objects.remove(ob, do_unlink=True)
        novo.name = nome
    for nome in ("boca", "lingua", "arco_esq", "arco_dir"):
        bpy.data.objects[nome].scale = (1, 1, 1)
    bpy.ops.object.select_all(action="DESELECT")
    pilha = [bpy.data.objects["raiz"]]
    while pilha:
        ob = pilha.pop()
        ob.select_set(True)
        pilha.extend(ob.children)
    bpy.ops.export_scene.gltf(filepath=str(Path(ARGS["glb"]).resolve()), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_animations=False)
    print("glb ok", ARGS["glb"])
    raise SystemExit(0)

if "fala" in ARGS:
    QUADROS = animar_fala(ARGS["fala"])
else:
    animar_loop()

for ob in bpy.data.objects:
    if ob.animation_data and ob.animation_data.action:
        acao = ob.animation_data.action
        curvas = acao.fcurves if hasattr(acao, "fcurves") else [c for l in acao.layers for s in l.strips for b in s.channelbags for c in b.fcurves]
        for fc in curvas:
            for k in fc.keyframe_points:
                k.interpolation = "LINEAR"

# ---------------------------------------------------------------- render
cena.render.engine = "BLENDER_EEVEE_NEXT"
cena.eevee.taa_render_samples = AMOSTRAS
cena.eevee.use_shadows = True
cena.render.resolution_x = RES
cena.render.resolution_y = RES
cena.render.fps = 30
cena.frame_start = int(ARGS.get("inicio", 0))  # inicio=<quadro> retoma um render interrompido
cena.frame_end = QUADROS - 1 if "fala" in ARGS else QUADROS - 1
cena.render.film_transparent = True
cena.view_settings.view_transform = "Standard"
cena.view_settings.look = "None"
cena.render.image_settings.file_format = "PNG"
cena.render.image_settings.color_mode = "RGBA"
cena.render.image_settings.compression = 40

if "blend" in ARGS:
    bpy.ops.wm.save_as_mainfile(filepath=str(Path(ARGS["blend"]).resolve()))

SAIDA.mkdir(parents=True, exist_ok=True)
if ARGS.get("animacao") == "1":
    cena.render.filepath = str(SAIDA / "q")
    bpy.ops.render.render(animation=True)
else:
    for q in [int(x) for x in ARGS.get("quadros", "0").split(",")]:
        t0 = time.time()
        cena.frame_set(q)
        cena.render.filepath = str(SAIDA / f"q{q:04d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"quadro {q} em {time.time() - t0:.1f} s")
