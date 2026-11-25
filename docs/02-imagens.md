# 2. Imagens reais

## O que pode

- **Só imagens reais** de exame, de clínica ou de procedimento. O único desenho é o Medbot. Quando o assunto não tem foto aberta (as técnicas de sutura), o vídeo usa um esquema desenhado por código, sempre com a etiqueta ESQUEMA no visor.
- **Licença que permite uso comercial**: CC0, domínio público, CC BY, CC BY-SA. Nunca NC (não comercial) nem ND (sem derivados). Crédito no canto do visor (`CRED` em `cena.js`) e na legenda do post.
- **Nunca imagem de exame gerada por IA** (sai anatomicamente errada).
- **Nenhum dado de paciente**: nome, número de prontuário, data de nascimento, rosto. Muitos vídeos de artigos trazem o nome do paciente no cabeçalho do aparelho: o recorte pega só o setor do exame. Rosto recortado (só a faixa dos olhos, quando o sinal está nos olhos). Criança sem exposição do corpo.
- **Ler a descrição do autor** antes de usar. O vídeo do Commons chamado "Pericardial effusion in a patient with NSTEMI" mostrava uma dissecção de aorta.

## Onde procurar

1. **Wikimedia Commons**, pelo `ferramentas/commons-busca.mjs` (lista título, tamanho, licença, autor e descrição; não baixa nada):
   ```bash
   node ferramentas/commons-busca.mjs "lung ultrasound B-lines" "Morison pouch free fluid ultrasound"
   ```
   Termos em inglês funcionam melhor. Vídeos de artigos de acesso aberto aparecem como `.ogv` (por exemplo, "Clinician-performed resuscitative ultrasonography", CC BY 2.0, com FAST positivo, deslizamento pleural e ponto pulmonar).
2. **Europe PMC**, os arquivos suplementares de artigos de acesso aberto pela API oficial (o mesmo vídeo que está no Commons):
   ```bash
   curl -L --max-time 1700 -o artigo.zip "https://www.ebi.ac.uk/europepmc/webservices/rest/PMC3352312/supplementaryFiles"
   ```
   O PMCID sai de `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:<doi>&format=json`. O zip chega devagar e às vezes cortado; o `tar.exe` do Windows abre zip cortado e salva os arquivos inteiros que vieram. O site do PMC tem um desafio anti-robô: não tente passar por ele.
3. **Openverse** (`https://api.openverse.org/v1/images/?q=<termo>&license_type=commercial`), que junta Flickr, Commons e museus. Confira a licença na página de origem.

## Baixar

```bash
python -I ferramentas/baixar-commons.py videos/28-video-tema/assets/fotos 0 "rx=File:Normal posteroanterior (PA) chest radiograph (X-ray).jpg" "ptx=File:Pneumothorax.jpg"
```

Cada arquivo vira `<apelido>.<ext>` e entra em `assets/fotos/creditos.json` (título, página, licença, autor, tamanho original). Imagem maior que 1600 px vem na miniatura de 1600 px.

**Limite do Commons (429).** Depois de muitos downloads, o Commons responde 429 ao script por mais de uma hora. O script espera e tenta de novo devagar. Nunca troque o User-Agent para escapar do limite. Se não passar, use o Europe PMC ou mande ao dono os links das páginas para ele baixar pelo navegador na pasta `assets/fotos/` (ele faz em minutos).

## Recortar (sem alterar)

**Fotos** (`tools/fotos.py`): um dicionário `FOTOS = { nome: (arquivo, (x0, y0, x1, y1)) }` com o recorte em fração da imagem. Gera `assets/fotos/prep/<nome>.jpg` e `prep/tamanhos.json`. Nunca aumenta a imagem.

```bash
python -I tools/fotos.py grade
```

**Clipes de vídeo** (`tools/clipes.py`): `CLIPES = { nome: (arquivo, início, duração, (x0, y0, x1, y1)) }`. Tira 30 quadros por segundo do trecho, só do setor do exame, para `assets/clipes/<nome>/f001.jpg`... e grava `src/clipes.js` com largura, altura e número de quadros. Foto parada também entra (duração 0) e vira um "clipe" de um quadro. Vídeo com pixel não quadrado (720 × 480 com SAR 8:9) passa antes por `PRE` (`scale=640:480,setsar=1`).

```bash
python -I tools/clipes.py grade
```

O `grade` desenha uma grade de 0 a 1 sobre o primeiro quadro (`_grade-<nome>.jpg`): é por ela que se acham as coordenadas das marcações. Confira depois numa still com zoom. Apague os `_grade-*` no fim.

**Achar a estrutura num clipe que se mexe**: quando a imagem parada não basta (o ponto pulmonar), meça o movimento coluna por coluna ao longo dos quadros (uma "imagem tempo × posição", como um modo M sintético): o lado que não desliza fica com linhas paralelas paradas, o lado que desliza muda a cada respiração.

**Trecho em vaivém**: quando o achado aparece só numa parte do clipe (linhas B mais nítidas entre os quadros 44 e 56), `v.seg = [44, 56]` na cena faz o visor ir e voltar só nesse trecho.

## Tirar marcas de autor

Setas e letras do autor sobre a imagem saem por inpainting do OpenCV no `fotos.py` do vídeo 13 (máscara na cor da seta, `cv2.inpaint`). Só para marcas que não fazem parte do exame.
