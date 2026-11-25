# 3. Voz, ritmo, tempos e trilha

## A chave

A chave do ElevenLabs fica no `.env.local` da raiz do kit e entra só como variável de ambiente no comando (nunca escrita em código, nunca colada em chat ou em commit). Na pasta do vídeo:

```bash
set -a; . <(grep '^ELEVENLABS_API_KEY=' ../../.env.local | tr -d '\r'); set +a
```

Se o dono passar uma chave pelo chat (outra conta, com mais crédito), use só no próprio comando: `ELEVENLABS_API_KEY=<chave> python ...`. `python -X utf8 -I tools/elevenlabs.py conta` mostra o plano e os caracteres que sobram. Uma narração de 60 s gasta uns 1.100 a 1.400 caracteres; a trilha usa o crédito de música.

## Narração (Eleven v3, voz Diego)

```bash
python -I tools/roteiro.py
```
```bash
python -X utf8 -I tools/elevenlabs.py voz3 pAPuuSJNHMlOqQrrh8hx narracao.txt diego 0.0
```

- `pAPuuSJNHMlOqQrrh8hx` é o Diego, a voz de todos os vídeos do Medbot. Estabilidade 0 (a mais expressiva).
- Grava `assets/audio/diego/narracao.mp3` e `narracao-alinhamento.json` (o tempo de cada letra).
- Para comparar vozes: `tools/prosodia.py` mede a variação de tom em semitons (quanto mais, mais viva).

## Conferir o que a voz falou

```bash
python -X utf8 -I tools/elevenlabs.py conferir diego
```

O Scribe transcreve a narração. O v3 às vezes troca uma palavra (falou "positivo" no lugar de "onda P"): reescreva a fala para evitar a troca e gere de novo. Diferenças só de grafia na transcrição ("Pocos" para POCUS, "Morrison") costumam ser só o Scribe; na dúvida, ouça.

## Ritmo de rede social

```bash
python -X utf8 -I tools/voz_rapida.py diego 1.2 0.07
```

Encurta cada pausa para no máximo 0,07 s e acelera 1,2 vez sem mudar o tom. Uns 180 palavras por minuto. Grava `narracao-rapida.wav` e o alinhamento novo. De 1,18 a 1,21 deu certo; acima disso a voz soa apressada.

## Tempos da cena

```bash
python -X utf8 -I tools/tempos.py diego
```

Gera `src/tempos.js` (`window.TEMPOS`): a duração total, cada fala (`cena`, `ini`, `fim`, `legenda`), cada palavra (`texto`, `ini`, `fim`, `fala`) e a abertura da boca do Medbot em cada quadro, medida no volume da voz. A voz começa 0,25 s depois do início e o vídeo termina 1,6 s depois dela. Para ver as palavras e os instantes (útil para escrever a cena):

```bash
python -X utf8 -I -c "import json; s=open('src/tempos.js',encoding='utf-8').read(); d=json.loads(s[s.index('{'):s.rindex('}')+1]); [print(f['cena'], round(f['ini'],2), ' '.join(w['texto']+'@'+format(w['ini'],'.2f') for w in d['palavras'] if w['fala']==i)) for i,f in enumerate(d['falas'])]"
```

## Trilha

```bash
python -X utf8 -I tools/elevenlabs.py trilha 70 efeitos
```

Usa o pedido de `roteiro/trilha.txt` e grava `assets/audio/efeitos/trilha.mp3`. Peça uns 5 s a mais que a duração do vídeo. O Eleven Music às vezes recusa (429) ou cai no meio: tente de novo depois de 20 s. Se a trilha ficar 1 ou 2 s curta, estique sem mudar o tom:

```bash
ffmpeg -i trilha-curta.mp3 -filter:a "atempo=0.962" -b:a 160k trilha.mp3
```

## Efeitos sonoros

Os 10 efeitos de `assets/audio/efeitos/` (whoosh, tum, pop, clique, ding, zoom, alarme, boing, riser, scanner) vieram do ElevenLabs e servem para todos os vídeos. A cena diz quando tocar cada um (`som(t, 'pop', 0.45)` em `CUES`); `tools/render.cjs --deixas` exporta e `tools/mix.py` mixa. Para criar outro: `python -X utf8 -I tools/elevenlabs.py efeito sfx-nome "descrição em inglês" 1.2 efeitos`.
