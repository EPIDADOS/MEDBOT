# Como ler uma TC de crânio (vídeo com o Medbot)

Vídeo vertical de 64 s (1080 × 1920, 30 fps) para o TikTok e o Reels: o Medbot ensina ao estudante de Medicina a leitura sistemática da TC de crânio sem contraste na emergência, com o mnemônico **Blood Can Be Very Bad** (sangue, cisternas, cérebro, ventrículos e osso), sobre tomografias reais. Feito em 14/11/2026, com a receita dos vídeos `10` a `12` (voz do Eleven v3 rápida, Medbot em 3D andando pela tela e apontando com o laser, motion design, trilha e efeitos do ElevenLabs). O fim diz "Segue @omedbot", sem a logo da Medfye.

- `out/tc-cranio.mp4`: o vídeo pronto (o render mostra o percentual a cada 10%).
- `out/tc-cranio-instagram.mp4`: a mesma coisa em 720p (cerca de 5 MB), para subir no Instagram pela extensão do Chrome.
- `out/capa.png` e `out/capa.jpg`: a capa ("Você sabe ler TC de crânio?"), de `src/capa.html` por `node tools/capa.cjs`.
- `LEGENDA.txt`: o texto do post, com o passo a passo, as palavras de busca (TC de crânio, tomografia, radiologia) e os créditos das imagens.

## Estrutura (início, meio e fim)

- **Gancho** (0 a 3 s): "TC de crânio na emergência. O que você procura primeiro?", com os cortes rolando num visor no estilo PACS, a borda piscando em vermelho e um "?" enorme.
- **A frase**: "Decora essa frase: Blood Can Be Very Bad". As cinco letras entram uma a uma e voam para a barra de cima, que vira o índice do vídeo (B Sangue, C Cisternas, B Cérebro, V Ventrículos, B Osso).
- **Regra de ouro**: "quanto mais denso, mais branco", com a barra do preto ao branco; na TC, ar (cerca de −1000 UH), líquor (0 a 15), osso (até +1000) e sangue fresco (50 a 80) marcados na imagem e na barra (janela de cérebro, W 80 L 40).
- **B · Sangue**: epidural (lente biconvexa que para na sutura; artéria meníngea média), subdural (meia-lua que cruza a sutura; veias ponte; idoso, etilista, anticoagulado) e subaracnoide (cisternas e sulcos; sem trauma, aneurisma roto).
- **C · Cisternas**: as da base abertas numa TC normal; apagadas num esquema; hipertensão intracraniana e risco de herniação.
- **B · Cérebro**: comparar os dois lados; a área hipodensa do AVC isquêmico de artéria cerebral média; nas primeiras horas a TC pode vir normal e serve para excluir sangramento antes do trombolítico (se dentro da janela).
- **V · Ventrículos**: dilatados (hidrocefalia) e empurrados (efeito de massa, desvio da linha média medido entre a linha média e o septo).
- **B · Osso**: a janela muda para óssea (W 2000 L 500) e o zoom acha a fratura; ar dentro do crânio (pneumoencéfalo) com fratura do seio frontal.
- **Resumo e fim**: as cinco linhas com uma miniatura de cada passo e "Blood Can Be Very Bad"; "Salva e me segue pra próxima aula!".

## Imagens

Todas reais, do Wikimedia Commons, com licença que permite uso comercial (créditos e páginas em `assets/fotos/creditos.json`, e o crédito aparece no canto de cada visor): cortes normais de Mikael Häggström (CC0), epidural de Hellerhoff (CC BY-SA 3.0), subdural, desvio da linha média e pneumoencéfalo de James Heilman (CC BY-SA 3.0 e 4.0), subaracnoide de Lipothymia (CC BY-SA 3.0), hidrocefalia e AVC de Lucien Monfils (CC BY-SA 3.0 e 4.0), fratura em janela óssea de Cerevisae (CC BY-SA 4.0). Alterações: `python -I tools/fotos.py` recorta, converte para tons de cinza e apaga as setas e os textos que os autores puseram sobre algumas imagens (seta vermelha na epidural e na subdural, seta preta no desvio, legenda em inglês na fratura); a anatomia e as lesões não são alteradas. As marcações do vídeo são desenhadas por cima, e as posições foram conferidas quadro a quadro (a área do AVC com realce de contraste). O único desenho é o esquema das cisternas apagadas, identificado como "esquema".

## Como é feito

Igual ao `../12-video-litotripsia/README.md`: roteiro em `roteiro/falas.json`; voz com `tools/elevenlabs.py voz3 ... diego 0.0`, conferida com `conferir` e acelerada com `tools/voz_rapida.py diego 1.18 0.08` (80 s viram 62 s); trilha `tc` e efeitos novos (`scanner`, `clique`, `alarme`, `zoom`) em `assets/audio/efeitos/`; `tools/tempos.py`, `node tools/render.cjs --stills`, `--deixas`, `python -I tools/mix.py diego` e `node tools/render.cjs`.

## Conteúdo

Leitura sistemática da TC de crânio sem contraste na emergência (mnemônico "Blood Can Be Very Bad", de Perron): sangue agudo é hiperdenso (cerca de 50 a 80 UH) na janela de cérebro; hematoma epidural biconvexo, limitado pelas suturas, em geral arterial (artéria meníngea média, com fratura temporal); subdural em crescente, cruza as suturas, venoso (veias ponte), mais comum em idosos, etilistas e anticoagulados; hemorragia subaracnoide nas cisternas e nos sulcos, sem trauma sobretudo por aneurisma roto; cisternas da base apagadas indicam hipertensão intracraniana e risco de herniação; perda da diferenciação entre substância branca e cinzenta é sinal precoce de isquemia, mas a TC pode ser normal nas primeiras horas, e no AVC agudo ela serve principalmente para excluir hemorragia antes da trombólise; ventrículos dilatados sugerem hidrocefalia e ventrículos comprimidos ou deslocados, efeito de massa com desvio da linha média; a janela óssea mostra fraturas, e ar intracraniano no trauma indica fratura que comunica com seio paranasal, mastoide ou o meio externo.

Fora da regra de paridade das aplicações.
