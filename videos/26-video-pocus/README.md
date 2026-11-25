# Os 5 Ps do POCUS (vídeo com o Medbot)

Vídeo vertical de 72 s (1080 × 1920, 30 fps) para o TikTok e o Reels: o ultrassom da beira do leito (POCUS) num macete, os cinco pês (praia, pulmão, pleura, poça e pericárdio), sobre clipes reais de ultrassom que se mexem no visor. Feito em 24/11/2026 a pedido do dono ("macete sobre POCUS, tipo o de TC, viral"), no estilo do `13-video-tc-cranio/`: o macete é apresentado no gancho, vira a barra de cima e cada P é um capítulo que voa para ela. Expositivo, sem quiz. Na segunda versão (24/11/2026), a pedido do dono, a linguagem ficou técnica (o público é de médicos e estudantes de medicina: anecoico, hemoperitônio, síndrome intersticial, nunca "sangue na barriga"), o macete virou "5 Ps" (na voz, "cinco pês") e a pleura ganhou o sinal da água-viva. Em verde-lima; o fim diz "Segue @omedbot", sem a logo da Medfye.

- `out/pocus.mp4`: o vídeo pronto (o render mostra o percentual a cada 10% e reabre o Edge a cada 600 quadros).
- `out/pocus-instagram.mp4`: a mesma coisa em 720p, para subir no Instagram pela extensão do Chrome.
- `out/capa.png` e `out/capa.jpg`: a capa ("Os 5 Ps do POCUS" com três clipes reais), de `src/capa.html` por `node tools/capa.cjs`.
- `LEGENDA.txt`: o texto do post, com os 5 Ps, os créditos e as palavras de busca.

## Estrutura

- **Gancho**: "POCUS na emergência: com cinco pês você acha pneumotórax, hemoperitônio e tamponamento", sobre o coração com derrame batendo no visor; depois a lista dos 5 Ps.
- **Regra de ouro**: "líquido é anecoico; osso, cálculo e ar são hiperecoicos e geram sombra acústica posterior", na vesícula com cálculo e numa régua de cinza (anecoico a hiperecoico).
- **1 · Praia**: o pulmão deslizando (a linha pleural marcada e setinhas que vão e voltam), o modo M com "mar" (parede torácica) e "areia" (sinal da praia); depois o pulmão sem deslizamento ("pneumotórax?") e o ponto pulmonar, "praticamente patognomônico", com o lado sem deslizamento e o lado que desliza.
- **2 · Pulmão**: linhas B (artefatos verticais hiperecoicos) marcadas e contadas (1, 2, 3), "síndrome intersticial, 3 ou mais linhas B por espaço".
- **3 · Pleura**: a coleção anecoica acima do diafragma ("derrame pleural"), depois o pulmão atelectasiado contornado e o selo "sinal da água-viva" (jellyfish sign: o pulmão ondula no derrame). O dono pediu o "sinal do polvo"; esse nome não aparece na literatura, e ele escolheu o nome que a literatura usa.
- **4 · Poça**: o FAST na janela hepatorrenal, o espaço de Morison, a faixa anecoica entre o fígado e o rim, "líquido livre, FAST positivo" e "trauma: hemoperitônio".
- **5 · Pericárdio**: o derrame em volta do coração que balança, o VD marcado e a regra "colapso diastólico do VD = tamponamento".
- **Resumo e fim**: as cinco linhas com o clipe de cada uma em miniatura, "os 5 Ps do POCUS"; "Salva pro plantão" e "Segue @omedbot".

## Imagens

Todas reais, com licença que permite uso comercial (créditos e páginas em `assets/fotos/creditos.json`; o crédito aparece no canto do visor). Clipes de artigos de acesso aberto publicados no Wikimedia Commons: Gillman, Ball, Panebianco, Al-Kadi e Kirkpatrick (FAST positivo, pulmão sem deslizar e ponto pulmonar, CC BY 2.0), Gillman e Kirkpatrick (pulmão deslizando e derrame pleural, CC BY 2.0), Gargani (linhas B, CC BY 2.0) e CardioNetworks ECHOpedia (derrame pericárdico, CC BY-SA 3.0). Fotos: o modo M do sinal da praia (Tinss, CC BY-SA 4.0) e a vesícula com cálculo (Nevit Dilmen, CC BY-SA 3.0, a mesma do vídeo 24).

O Commons limitou os downloads do script no meio do trabalho (erro 429). Dois clipes vieram pela API oficial do Europe PMC (os mesmos vídeos dos artigos) e o dono baixou os outros pelo navegador. Os vídeos de origem trazem no cabeçalho o nome ou o número do paciente; `python -I tools/clipes.py` recorta só o setor do ultrassom, sem esses textos e sem as marcas do aparelho, e tira 30 quadros por segundo para `assets/clipes/<nome>/` (o `src/clipes.js` guarda o tamanho e o número de quadros). A página troca o quadro do clipe a cada instante e espera a decodificação antes da foto.

## Como é feito

A receita dos vídeos `10` a `25`: voz do Eleven v3 (Diego), conferida com o Scribe e acelerada (101 s viram 72 s, 1,21x); trilha `pocus` (70 s, esticada 4% para cobrir os 72 s); `tools/tempos.py`, `node tools/render.cjs --stills`, `--deixas`, `python -I tools/mix.py diego` e `node tools/render.cjs`. Nesse vídeo a chave do `.env.local` estava sem crédito; a voz e a trilha saíram com a chave Starter que o dono passou no chat, usada só no comando.

## Conteúdo

Líquido é anecoico (preto); interfaces muito refletoras (osso, cálculo, ar) são hiperecoicas e fazem sombra acústica. Deslizamento pleural presente afasta pneumotórax no ponto examinado; no modo M ele dá o sinal da praia. Ausência de deslizamento sugere pneumotórax, e o ponto pulmonar é específico. Três ou mais linhas B por espaço intercostal indicam síndrome intersticial (edema pulmonar, entre outras causas). Derrame pleural é uma coleção anecoica acima do diafragma. No FAST, o recesso hepatorrenal (Morison) é a janela que mais costuma mostrar líquido livre. Derrame pericárdico é anecoico em volta do coração; colapso diastólico do ventrículo direito indica tamponamento.

Fora da regra de paridade das aplicações.
