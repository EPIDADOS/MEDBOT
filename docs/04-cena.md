# 4. A cena (`src/index.html` e `src/cena.js`)

O vídeo é uma página de 1080 × 1920 em que **tudo é função do tempo**: `window.seek(t)` desenha o quadro do instante `t` do zero, sem animação própria do navegador. Por isso o render pode fotografar qualquer quadro em qualquer ordem, e reabrir o navegador no meio não muda nada.

## Camadas (`src/index.html`)

De baixo para cima, dentro de `#mundo` (que treme nos impactos):

1. `#fundo` (canvas): degradê tinta, grade lima a 4% que desliza, ruído de filme e vinheta.
2. `#cenas`: o HTML de cada momento (título, lista, visor, resumo, fim) e `#palco-svg` (as marcações desenhadas: contornos, anéis, linhas, esquemas), recortado pelo visor.
3. `#cam`: as etiquetas em HTML (`.ptag`, `.chip`, `.selo`), que não podem ser cortadas pelo visor.
4. `#laser` (SVG): o laser do Medbot até o alvo.
5. `#bot` (canvas WebGL): o Medbot em three.js.
6. `#scrim` e `#passo`: o véu escuro e o cartão do capítulo que voa para a barra.
7. `#hud`: a barra de capítulos com o progresso de cada um.
8. `#legenda`: a legenda palavra por palavra (a palavra falada fica lima).

Fora de `#mundo`, `#flash` (o clarão vermelho ou branco dos impactos).

Classes prontas no CSS: `.titulo`, `.lista` (com `.letra`, `.nome`, `.sub`), `.visor` (com `.pacs.tl` e `.pacs.tr`, os textos dos cantos, e `.credito`), `.chip`, `.chip.alerta`, `.ptag`, `.ptag.escura`, `.ptag.alerta`, `.selo`, `.selo.alerta`, `.regua`, `.mini`, `.botao`, `.botao.lima`, `#marca`. Cores: tinta `#0C1A21`, lima `#C1FF72`, alerta `#FF4D57`. Fontes: Bricolage Grotesque (títulos) e Onest (texto).

## Anatomia de `cena.js`

As seções aparecem nesta ordem nos três exemplos. Para um vídeo novo, quase tudo de "tempo e curvas", "legenda", "Medbot", "fundo" e o fim de `seek` fica igual; muda o que está marcado com **(muda)**.

1. **Tempo e curvas.** `clamp`, `lerp`, `sai` (desacelera), `vaivem` (acelera e desacelera), `back` (passa do ponto e volta, para "pular" na tela), `pop(t, t0, d)` (escala 0 → 1 com mola a partir de `t0`), `surge(t, t0, d)` (0 → 1 suave). `PAL(cena, palavra, n)` devolve o instante da palavra na fala (procura a forma sem acento; com `n`, a n-ésima). `C[cena] = [início, início da fala seguinte]`.
2. **Ícones (Lucide)** em SVG embutido (`IC.check`, `IC.alerta`, `IC.x`, `IC.salvar`, `IC.seguir`...). Nunca emoji nem símbolo de texto como ícone.
3. **Capítulos (muda).** `CAPS = [[cena, letra ou número, nome na barra, subtítulo, fim do capítulo], ...]`. `CARTAO = 0.78`: o cartão do capítulo fica 0,78 s na tela antes de voar para a barra.
4. **Imagens ou clipes (muda).**
   - Fotos e clipes (exemplo 26): `CLIPES` (de `src/clipes.js`), `CRED` (crédito de cada um), `poeClipe(id, R, nome, v, t, t0)` põe o quadro certo no `<img>` do visor e devolve `P(nx, ny)`, que leva um ponto da imagem (0 a 1) para a tela, já com o zoom. `v = { z, fx, fy, cabe, seg }`: zoom, ponto focal, "caber inteiro" em vez de cobrir, trecho em vaivém.
   - Fotos num visor PACS (exemplo 13): `poeVisor` com a janela, a orientação D/E e os textos dos cantos.
   - Esquema (exemplo 27): funções que desenham em SVG (`topoBase`, `topoPontos`, `corteBase`, `corteFio`), com parâmetros que mudam com o tempo (`g`, a ferida abrindo e fechando; `e`, a eversão).
5. **Desenho sobre a imagem.** `curva(pontos)` (spline suave), `contorno(P, pontos, u, {...})` (contorno que se desenha de 0 a 1, com preenchimento leve), `anel(x, y, r, t, t0, cor)` (anel que pulsa), `linha(a, b, u, cor)`, `formigas` (setinhas que vão e voltam, para deslizamento). Etiquetas: `ptag`, `chip`, `selo(t, t0, título, subtítulo, x, y, {alerta, tam, ate})`. O `ate` tira a etiqueta da tela antes do selo seguinte: duas etiquetas nunca se sobrepõem.
6. **Tempos-chave (muda).** `W = { nome: PAL('cena', 'palavra'), ... }`: cada animação dispara numa palavra da fala, nunca num segundo solto. Assim a cena acompanha a voz mesmo se ela mudar.
7. **Marcações (muda).** `M = { clipe: { pontos em 0 a 1, v: {...} } }`, conferidas nas grades (`tools/clipes.py grade`) e nas stills.
8. **O que o visor mostra em cada instante (muda).** `midia(t)` (ou `esquema(t)`) devolve o clipe, o retângulo do visor, os textos dos cantos e quando entra e sai, ou `null`.
9. **O HTML das cenas (muda).** `$('cenas').innerHTML = ...` com o título do gancho, a lista, o visor, o resumo e o fim; `$('hud').innerHTML` com a barra.
10. **Legenda.** Blocos de 3 palavras (4 quando sobraria uma), na altura 1150 (300 no fim, porque o Medbot sobe).
11. **Medbot.** Posições em pixels: `LE = 225` e `LD = 855` (cantos de baixo), `YB = 1450`, tamanho 380. Pula de um canto ao outro a cada capítulo (`PULOS`, `KB`), vai ao centro no resumo e cresce no fim. `CARA` dá a expressão de cada fala (normal, feliz, surpreso, desconfiado, preocupado); a boca vem da voz (`T.boca`); pisca sozinho. Dá um pulinho nos impactos.
12. **Fundo.**
13. **Deixas de som (muda).** `som(t, 'efeito', volume)` em cada impacto, cada etiqueta e cada pulo. `window.CUES` vai para `out/deixas.json`.
14. **`seek(t)`**, o quadro: gancho, lista, visor e marcações (dentro do recorte do visor), resumo, fim, cartão do capítulo, barra, legenda, Medbot, laser (só quando o Medbot está parado e fora do cartão do capítulo), tremor e flash. Devolve uma `Promise`: com clipes, ela espera a decodificação do quadro novo antes da foto.
15. **`window.ready`**: espera as fontes e o Medbot carregarem.

## Como adaptar a cena a um roteiro novo

1. Gere `src/tempos.js` e liste as palavras com o tempo (comando em `docs/03-voz-e-trilha.md`).
2. Troque `CAPS` (as cenas do roteiro), `W` (as palavras que disparam cada coisa) e o título do gancho.
3. Prepare as imagens (`tools/fotos.py` ou `tools/clipes.py`) e preencha `CRED`, `midia` e `M`.
4. Reescreva `marcas`: para cada capítulo, o que acende em cada palavra e para onde o laser aponta (`quer([x, y])`).
5. Ajuste `CUES` e `CARA`.
6. Stills de cada palavra importante, folha lado a lado, ajuste, de novo. Os problemas que mais aparecem:
   - etiqueta em cima da outra ou do selo (use `ate`);
   - etiqueta fora do visor ou em cima da legenda (o visor vai até y 985 e a legenda começa em y 1035);
   - quebra de linha feia no cartão (use espaço inquebrável, ` `);
   - marcação fora da estrutura (confira na grade e com zoom);
   - selo que some junto com o visor (estenda o visor até o cartão do capítulo seguinte cobrir).

## O Medbot

`videos/_personagem/web/medbot-3d.js`: `criarPalco(canvas)`, `carregarMedbot(palco, '../../_personagem/web/medbot.glb', { cor })` e `bot.pose({ x, y, tamanho, yaw, roll, estica, olhar: [x, y], olho: [largura, altura, arco], pisca, boca, pendulo })`, depois `palco.render()`. O modelo vem do Blender por código (`videos/_personagem/blender/medbot3d.py`, exportado em glTF). `{ cor }` troca a cor do corpo quando o tema pede outra paleta (o vídeo de sífilis usou cobre e vinho, a pedido do dono).

## Servidor e render

`tools/servidor.cjs` serve a pasta `videos/` (o three.js e o `.glb` não carregam por `file://`). `tools/render.cjs` abre a página no Edge com a GPU (`--use-angle=d3d11`), chama `seek` para cada quadro e manda o JPEG direto ao ffmpeg, sem gravar quadros no disco.
