# Fluxo dos vídeos do Medbot

Tudo o que é preciso para criar os vídeos verticais do Medbot (@omedbot) para o TikTok e o Reels: aulas rápidas de medicina para estudantes e médicos, com o Medbot (a bola verde-lima de estetoscópio) pulando pela tela e apontando com um laser, imagens reais de exame, voz do ElevenLabs, trilha, efeitos e legenda palavra por palavra.

O vídeo é uma página HTML animada em função do tempo (`window.seek(t)`), fotografada quadro a quadro pelo navegador (Playwright com o Edge) e montada pelo ffmpeg com o áudio mixado. Nada é editado à mão: o roteiro, a voz, os tempos, a cena e o render saem de comandos.

## Os vídeos de exemplo

Três vídeos prontos estão em `videos/`, com o código, o roteiro, a voz e as imagens, para servir de base e de consulta. Cada um renderiza de novo sem gastar crédito, porque a narração já está na pasta.

| Pasta | O que mostra | Quando usar como base |
|---|---|---|
| `videos/13-video-tc-cranio/` | TC de crânio pelo "Blood Can Be Very Bad": o mnemônico vira a barra de capítulos, tomografias reais num visor tipo PACS, contornos e escala de densidade | o estilo que mais rendeu (51,8 mil visualizações, 1.485 salvamentos); fotos de exame |
| `videos/26-video-pocus/` | "Os 5 Ps do POCUS": clipes reais de ultrassom em movimento no visor, sinal da praia, linhas B, FAST, derrame | fotos e clipes reais; é a base padrão do `novo-video` |
| `videos/27-video-suturas/` | os 5 pontos de sutura: o trajeto da agulha animado em esquema (vista de cima e corte da pele) | quando não há foto aberta e o assunto pede desenho (marcado ESQUEMA) |

## Instalação (uma vez)

1. **Node 20 ou mais novo** e **Python 3.11 ou mais novo**.
2. **Microsoft Edge** instalado (o render usa o Edge pela GPU). Em outro navegador, defina `MEDBOT_CANAL=chrome` antes dos comandos.
3. Na raiz do kit:
   ```bash
   npm install
   ```
   ```bash
   python -m pip install -r requirements.txt
   ```
   O `npm install` traz o Playwright e o ffmpeg (`ffmpeg-static`); as ferramentas acham os dois sozinhas.
4. Copie `.env.example` para `.env.local` e cole a chave do ElevenLabs. O `.env.local` nunca vai para o Git, e a chave nunca é escrita em arquivo de código nem no chat.
5. Internet ligada no render: a página carrega o three.js e as fontes (Bricolage Grotesque e Onest) pela CDN.

Para conferir a instalação, renderize um trecho de um exemplo (passo 7 com `--ate 3`).

## O fluxo, passo a passo

Cada passo tem detalhes no arquivo de `docs/` indicado. Os comandos rodam **na pasta do vídeo** (`videos/<nn-video-tema>/`), salvo quando dito.

### 1. Pauta e roteiro (`docs/01-pauta-e-roteiro.md`)

- Escolha um tema amplo, que se pesquisa e se salva, para estudantes de medicina e médicos. Formatos que já funcionaram: o macete que vira barra de capítulos (TC de crânio, POCUS, suturas), "normal × doente", "mito × verdade". Nunca quiz nem pergunta ao público.
- Gancho forte nos 3 primeiros segundos, regra de ouro, de 4 a 6 capítulos, resumo e o fim "Salva pro plantão e me segue pra próxima aula!".
- Linguagem técnica (anecoico, hemoperitônio, síndrome intersticial), sem travessão, sem disclaimer.

Crie a pasta (na raiz do kit):
```bash
node ferramentas/novo-video.cjs 28-video-tema --base 26-video-pocus
```
Escreva `roteiro/falas.json` (cada fala com a sua `cena`) e o pedido da trilha em `roteiro/trilha.txt`. Depois:
```bash
python -I tools/roteiro.py
```
Ele gera `roteiro/narracao.txt`, mostra os caracteres (o que o ElevenLabs cobra), a duração estimada e os avisos.

### 2. Imagens reais (`docs/02-imagens.md`)

- Só imagens reais com licença que permite uso comercial (CC0, domínio público, CC BY, CC BY-SA). Nunca NC nem ND, nunca imagem de exame gerada por IA, nunca dado de paciente à vista, rosto recortado, criança sem exposição do corpo.
- Busque e baixe (na raiz do kit):
  ```bash
  node ferramentas/commons-busca.mjs "lung ultrasound B-lines" "FAST Morison pouch"
  ```
  ```bash
  python -I ferramentas/baixar-commons.py videos/28-video-tema/assets/fotos 0 "rx=File:Nome do arquivo.jpg"
  ```
- Leia a descrição do autor antes de usar (um "derrame pericárdico" do Commons era dissecção de aorta).
- Recorte sem alterar: `tools/fotos.py` (fotos) e `tools/clipes.py` (vídeos em quadros de 30 por segundo), cada um com `grade` para achar as coordenadas das marcações.
- Se o Commons responder 429, não troque o User-Agent: use a API do Europe PMC ou peça os arquivos ao dono.

### 3. Voz (`docs/03-voz-e-trilha.md`)

```bash
set -a; . <(grep '^ELEVENLABS_API_KEY=' ../../.env.local | tr -d '\r'); set +a
```
```bash
python -X utf8 -I tools/elevenlabs.py voz3 pAPuuSJNHMlOqQrrh8hx narracao.txt diego 0.0
```
```bash
python -X utf8 -I tools/elevenlabs.py conferir diego
```
O Diego no Eleven v3 é a voz de todos os vídeos. Confira a transcrição: o v3 às vezes troca uma palavra, e aí se reescreve a fala e se gera de novo.

### 4. Ritmo, tempos e trilha

```bash
python -X utf8 -I tools/voz_rapida.py diego 1.2 0.07
```
```bash
python -X utf8 -I tools/tempos.py diego
```
```bash
python -X utf8 -I tools/elevenlabs.py trilha 70 efeitos
```
O `voz_rapida` encurta as pausas e acelera (de 1,18 a 1,21 vez, uns 180 palavras por minuto). O `tempos` gera `src/tempos.js` com o início de cada fala e de cada palavra e a abertura da boca do Medbot quadro a quadro. A trilha vai para `assets/audio/efeitos/trilha.mp3`; peça uns 5 s a mais que a narração.

### 5. Cena (`docs/04-cena.md`)

Adapte `src/cena.js` ao roteiro novo: os capítulos (`CAPS`), as palavras-chave (`W`, achadas por `PAL(cena, palavra)`), o que o visor mostra em cada fala (`midia` ou `esquema`), as marcações (`M` e `marcas`), a lista do gancho, o resumo e os sons (`CUES`). Ajuste o `<title>` de `src/index.html`.

Renderize instantes soltos e confira cada um (posição das marcações, sobreposição com a legenda, texto cortado):
```bash
node tools/render.cjs --stills 2,8.5,15,22,31,40,52
```
```bash
python -I ../../ferramentas/conferir.py folha ../../folha.jpg 300 out/stills/*.jpg
```

### 6. Som

```bash
node tools/render.cjs --deixas
```
```bash
python -I tools/mix.py diego
```
O primeiro grava em `out/deixas.json` os instantes dos efeitos que a cena pediu; o segundo mixa a voz, a trilha (que abaixa sob a voz) e os efeitos em `out/audio-final.wav`, normalizado.

### 7. Render

```bash
node tools/render.cjs
```
Leva de 8 a 12 minutos para 60 s (a página mostra o percentual a cada 10%). O Edge é reaberto a cada 600 quadros, porque depois de uns 1.500 seguidos a GPU dele solta quadros brancos. Confira:
```bash
python -I ../../ferramentas/conferir.py brancos out/<slug>.mp4
```
```bash
python -I ../../ferramentas/conferir.py quadros out/<slug>.mp4 ../../conferencia.jpg 3 12 25 40 55
```

### 8. Entrega (`docs/05-render-e-entrega.md`)

- Capa: `src/capa.html` (título em cima, imagens reais, o Medbot embaixo, @omedbot), fotografada por `node tools/capa.cjs`.
- Cópia para o Instagram: `python -I ../../ferramentas/instagram.py out/<slug>.mp4` (720p, de 5 a 7 MB).
- `LEGENDA.txt`: gancho com o termo de busca, os pontos do vídeo, os créditos das imagens e de 5 a 9 hashtags.
- `README.md` do vídeo: estrutura, imagens, como foi feito e o conteúdo médico para revisão.
- Publicar no Instagram só com o OK do dono, na hora.

## Estrutura do kit

```
FLUXO VIDEOS MEDBOT/
  README.md               este fluxo
  docs/                   cada passo em detalhe, as regras do dono e o histórico dos vídeos
  ferramentas/            novo-video.cjs, commons-busca.mjs, baixar-commons.py, conferir.py, instagram.py
  videos/
    _personagem/          o Medbot: web/medbot-3d.js e web/medbot.glb (three.js), blender/medbot3d.py (gera o .glb), medbot.js (versão 2D em SVG)
    _modelo/              o que todo vídeo novo recebe: tools/, efeitos sonoros, roteiro de partida, README e LEGENDA
    13-video-tc-cranio/   exemplo: TC de crânio
    26-video-pocus/       exemplo: POCUS com clipes reais
    27-video-suturas/     exemplo: suturas em esquema
  package.json            Playwright e ffmpeg-static
  requirements.txt        numpy, Pillow (e OpenCV para o vídeo 13)
  .env.example            a chave do ElevenLabs (copie para .env.local)
```

Cada pasta de vídeo:
```
tools/        render.cjs, servidor.cjs, ambiente.cjs, capa.cjs, elevenlabs.py, voz_rapida.py, tempos.py, mix.py,
              roteiro.py, fotos.py, clipes.py, prosodia.py
roteiro/      falas.json, narracao.txt, trilha.txt
assets/       audio/diego (narração), audio/efeitos (efeitos e trilha), fotos (originais, prep e creditos.json), clipes
src/          index.html, cena.js, tempos.js (gerado), clipes.js (gerado), capa.html
out/          o vídeo, a cópia de 720p, a capa, as stills e a mixagem (fora do Git)
README.md, LEGENDA.txt
```

## Regras que valem para todo vídeo

Estão completas em `docs/regras.md`. As principais: estilo da TC de crânio (expositivo, nunca quiz); linguagem técnica; imagens reais com licença comercial e crédito; esquema só quando não há foto aberta, sempre marcado ESQUEMA; nenhum dado de paciente; fim com "Segue @omedbot" e nunca a logo da Medfye; sem travessão no texto; chaves só em variável de ambiente; nada publicado sem o OK do dono.
