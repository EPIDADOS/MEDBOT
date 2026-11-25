# 5. Som, render e entrega

Comandos na pasta do vídeo, salvo quando dito.

## Antes de renderizar

```bash
node tools/render.cjs --stills 1.5,4,9,16,22,30,38,46,55,60
```

Grava cada instante em `out/stills/`. Monte uma folha para olhar tudo junto:

```bash
python -I ../../ferramentas/conferir.py folha ../../folha.jpg 300 out/stills/*.jpg
```

Revise: marcação no lugar, nada cortado, nada em cima da legenda, selo legível, laser apontando para a coisa certa, Medbot sem cobrir o que importa, texto técnico certo. Corrija e repita só os instantes que mudaram.

## Som

```bash
node tools/render.cjs --deixas
```
```bash
python -I tools/mix.py diego
```

`out/audio-final.wav`: voz rápida, trilha que abaixa sozinha quando a voz fala (sobe em 30 ms, desce em 300 ms), efeitos nos instantes da cena, normalizado em -14 LUFS.

## Render

```bash
node tools/render.cjs
```

- Para 60 s, de 8 a 12 minutos (com clipes, uns 11). O log mostra o percentual a cada 10%: deixe rodando em segundo plano e acompanhe o `out/render.log` (`node tools/render.cjs > out/render.log 2>&1`).
- `--ate 3` renderiza só os 3 primeiros segundos, para testar.
- "erros na página: Failed to load resource 404" é o favicon e pode ser ignorado.
- O Edge é reaberto a cada 600 quadros (depois de uns 1.500 a GPU solta quadros brancos).
- Máquina com pouca memória (8 GB): um render por vez, nada pesado em paralelo, e apague os perfis temporários do Playwright de renders anteriores que ficaram na pasta temporária (`playwright_chromiumdev_profile-*`).

Confira o resultado:

```bash
python -I ../../ferramentas/conferir.py brancos out/<slug>.mp4
```
```bash
python -I ../../ferramentas/conferir.py quadros out/<slug>.mp4 ../../conferencia.jpg 3 12 25 40 55
```

Depois do render, `out/audio-final.wav` pode ser apagado (o `mix.py` refaz).

## Capa

`src/capa.html`: 1080 × 1920, com o texto entre y 260 e 1660 (a área que a grade do perfil mostra). Título grande do tema, uma faixa lima com a promessa, imagens reais do vídeo (com rótulo), os itens do macete em pílulas, o Medbot embaixo e @omedbot em cima. Sem a logo da Medfye.

```bash
node tools/capa.cjs
```

Grava `out/capa.png` e `out/capa.jpg`. Para usar um esquema do próprio vídeo na capa sem o laser, o exemplo 27 tem `tools/esquema-capa.cjs` (abre a página com `?sem-laser` e fotografa só o visor).

## Cópia para o Instagram

Na raiz do kit:

```bash
python -I ferramentas/instagram.py videos/28-video-tema/out/<slug>.mp4
```

720 × 1280, duas passadas a 600 kbps, de 5 a 7 MB. O arquivo de 1080p (30 a 45 MB) travava o upload pela extensão do Chrome.

## Legenda (`LEGENDA.txt`)

1. A frase do gancho com o termo que se pesquisa.
2. A regra de ouro e os pontos do vídeo, numerados, em linguagem técnica.
3. "Salva pro plantão e manda pro seu grupo do internato."
4. Os créditos das imagens: "Imagens reais via Wikimedia Commons: Autor (licença), ...".
5. De 5 a 9 hashtags, terminando em #omedbot.

## README do vídeo

Use o modelo: o que é (duração, tema, pedido do dono), os arquivos de `out/`, a estrutura fala por fala, de onde veio cada imagem e o que foi recortado, como foi feito (velocidade da voz, trilha, ferramentas próprias) e o conteúdo médico em linguagem de livro, para revisão.

## Publicar

- Instagram (@omedbot): pela extensão do Chrome logada na conta. Criar, Postar, anexar `out/<slug>-instagram.mp4`, recorte "Original", capa por "Selecionar do computador" com `out/capa.jpg`, Avançar, colar a legenda e **parar antes de "Compartilhar"** até o dono dar o OK.
- TikTok: o dono publica.
- Nunca digitar senha.
