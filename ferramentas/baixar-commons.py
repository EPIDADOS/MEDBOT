"""Baixa arquivos do Wikimedia Commons e grava os créditos (autor, licença e página) em creditos.json.

Uso (na raiz do kit):
  python -I ferramentas/baixar-commons.py <pasta de destino> [espera inicial em s] apelido=File:Título ...
  python -I ferramentas/baixar-commons.py videos/28-video-x/assets/fotos 0 "rx=File:Normal chest X-ray.jpg"

Cada arquivo vira <apelido>.<extensão> na pasta, e creditos.json guarda de onde veio. Imagens maiores que 1600 px
vêm na miniatura de 1600 px; vídeos (.ogv, .webm) vêm no original.

O Commons responde 429 quando se pede rápido demais. O script espera entre um arquivo e outro e, no 429, tenta de novo
com esperas cada vez maiores. Nunca troque o User-Agent para escapar do limite: se o 429 não passar, use a API do
Europe PMC (docs/02-imagens.md) ou baixe os arquivos pelo navegador e coloque na pasta.
"""
import json
import re
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

UA = 'image-research-script/1.0'
pasta = Path(sys.argv[1])
pasta.mkdir(parents=True, exist_ok=True)
arq_cred = pasta / 'creditos.json'
cred = json.loads(arq_cred.read_text(encoding='utf-8')) if arq_cred.exists() else {}
limpa = lambda v: re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', str((v or {}).get('value', '')))).strip()


def curl(url, saida=None):
    for t in range(12):
        cmd = ['curl', '-s', '-L', '-A', UA, '-w', '%{http_code}']
        if saida:
            cmd += ['-o', str(saida)]
        r = subprocess.run(cmd + [url], capture_output=True)
        out = r.stdout.decode('utf-8', 'replace')
        codigo = out[-3:]
        if codigo == '200':
            return out[:-3]
        print('  status', codigo, 'tentativa', t + 1, flush=True)
        time.sleep(60 + 30 * t)
    raise SystemExit('não baixou: ' + url)


args = sys.argv[2:]
if args and args[0].isdigit():
    time.sleep(int(args.pop(0)))
for par in args:
    apelido, titulo = par.split('=', 1)
    if apelido in cred and (pasta / cred[apelido]['arquivo']).exists():
        print(apelido, 'já está na pasta')
        continue
    q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': titulo, 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata',
                                'iiurlwidth': '1600', 'iiextmetadatafilter': 'LicenseShortName|LicenseUrl|Artist|Credit'})
    info = json.loads(curl('https://commons.wikimedia.org/w/api.php?' + q))
    ii = list(info['query']['pages'].values())[0]['imageinfo'][0]
    video = titulo.lower().endswith(('.ogv', '.webm', '.mpg', '.mp4'))
    url = (ii['thumburl'] if ii.get('width', 0) > 1600 and not video else ii['url']).split('?')[0]
    ext = Path(urllib.parse.urlparse(url).path).suffix.lower() or '.jpg'
    destino = pasta / (apelido + ext)
    time.sleep(8)
    curl(url, destino)
    m = ii.get('extmetadata', {})
    cred[apelido] = {'arquivo': destino.name, 'titulo': titulo, 'pagina': ii['descriptionurl'], 'licenca': limpa(m.get('LicenseShortName')),
                     'licenca_url': limpa(m.get('LicenseUrl')), 'autor': limpa(m.get('Artist')), 'original': f"{ii['width']}x{ii['height']}"}
    arq_cred.write_text(json.dumps(cred, ensure_ascii=False, indent=1), encoding='utf-8')
    print(apelido, destino.name, destino.stat().st_size >> 10, 'KB', cred[apelido]['licenca'], '|', cred[apelido]['autor'][:50], flush=True)
    time.sleep(20)
print('fim')
