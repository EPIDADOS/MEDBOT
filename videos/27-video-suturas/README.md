# Tipos de sutura: 5 pontos e quando usar cada um (vídeo com o Medbot)

Vídeo vertical de 63 s (1080 × 1920, 30 fps) para o TikTok e o Reels: os cinco pontos que todo interno precisa dominar (simples, Donati, em U, intradérmico e chuleio), quando usar cada um e o prazo de retirada. Feito em 24/11/2026 a pedido do dono ("um falando sobre os tipos de sutura"), no estilo do `13-video-tc-cranio/` (os pontos viram a barra de cima e cada um é um capítulo que voa para ela) e em linguagem técnica, para médicos e estudantes de medicina. Expositivo, sem quiz. Em verde-lima; o fim diz "Segue @omedbot", sem a logo da Medfye.

- `out/suturas.mp4`: o vídeo pronto (o render mostra o percentual a cada 10% e reabre o Edge a cada 600 quadros).
- `out/suturas-instagram.mp4`: a mesma coisa em 720p, para subir no Instagram pela extensão do Chrome.
- `out/capa.png` e `out/capa.jpg`: a capa ("Tipos de sutura, 5 pontos e quando usar cada um" com o esquema do Donati e os cinco pontos), de `src/capa.html` por `node tools/capa.cjs`; o esquema vem do próprio vídeo, sem o laser, por `node tools/esquema-capa.cjs 23.2` (abre a página com `?sem-laser`) em `out/capa-esquema.jpg`.
- `LEGENDA.txt`: o texto do post, com os cinco pontos, a retirada e as palavras de busca.

## Estrutura

- **Gancho**: "Sutura no plantão: cinco pontos que todo interno precisa dominar, e quando usar cada um", com a lista dos cinco e o desenho de cada um visto de cima.
- **Regra de ouro**: "everter as bordas", no corte da pele: as bordas evertidas, depois a borda invertida e a cicatriz alargada na vista de cima.
- **1 · Simples** (o coringa): agulha a 90°, as réguas de mesma distância e mesma profundidade, o nó, a ferida fechando; um ponto rompe e "os outros seguram".
- **2 · Donati** (colchoeiro vertical): a passada longe-longe e a perto-perto, "profunda: aproxima" e "superficial: everte"; "áreas de tensão, bordas que tendem a inverter".
- **3 · Em U** (colchoeiro horizontal): o U visto de cima (as passadas sob a pele tracejadas), a segunda passada paralela no corte, "distribui a tensão", "hemostasia"; "pele friável, como a do idoso".
- **4 · Intradérmico**: a derme destacada, o fio em zigue-zague paralelo à superfície e "sem marcas na pele"; cirurgia plástica e cesárea; "fio absorvível monofilamentar".
- **5 · Chuleio** (sutura contínua): um fio só, rápido, distribui a tensão; o fio rompe e a ferida inteira reabre, com o fio se desfazendo no corte: "se rompe, abre tudo".
- **Resumo e fim**: os cinco pontos com o desenho de cada um e a retirada (face 5 dias, couro cabeludo e tronco 7 a 10, membros 10 a 14); "Salva pro plantão" e "Segue @omedbot".

## Imagens

Os desenhos são esquemas feitos por código (`src/cena.js`: `topoBase`, `topoPontos`, `corteBase` e `corteFio`), marcados como ESQUEMA no visor, como o eletro esquemático do vídeo 19: a vista de cima da ferida e o corte da pele (epiderme, derme e subcutâneo, com os lóbulos de gordura), com o trajeto da agulha que se desenha na hora da fala, as bordas que aproximam (`g`) e evertem ou invertem (`e`). O Commons quase não tem fotos reais de cada técnica com licença aberta; as fotos que existem (pontos simples e o ponto em U numa cirurgia de túnel do carpo) não puderam ser baixadas pelo script (o Commons limitou os downloads, erro 429) e ficaram de fora desta versão.

## Como é feito

A receita dos vídeos `10` a `26`: voz do Eleven v3 (Diego), conferida com o Scribe e acelerada (87 s viram 61 s, 1,2x); trilha `suturas`; `tools/tempos.py`, `node tools/render.cjs --stills`, `--deixas`, `python -I tools/mix.py diego` e `node tools/render.cjs`. A chave do `.env.local` estava sem crédito; a voz e a trilha saíram com a chave Starter que o dono passou no chat, usada só no comando.

## Conteúdo

Eversão das bordas: a borda invertida cicatriza pior e alarga a cicatriz. Ponto simples separado: entrada perpendicular, distância e profundidade iguais dos dois lados; cada ponto é independente. Donati (colchoeiro vertical): passada profunda longe da borda e superficial perto, que everte; útil em áreas de tensão e bordas que tendem a inverter. Colchoeiro horizontal: duas passadas paralelas, distribui a tensão e faz hemostasia; útil em pele friável. Intradérmico: passadas na derme paralelas à superfície, sem marcas de ponto; cirurgia plástica e cesárea, em geral com fio absorvível monofilamentar. Chuleio: contínuo, rápido, distribui a tensão, mas a ruptura do fio abre toda a ferida. Retirada habitual: face 3 a 5 dias, couro cabeludo e tronco 7 a 10, membros 10 a 14.

Fora da regra de paridade das aplicações.
