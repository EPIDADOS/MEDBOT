# 1. Pauta e roteiro

## O que viraliza

- **Salvamento e compartilhamento são o motor.** O vídeo que mais rendeu, a TC de crânio (13), teve 51.803 visualizações (98,3% de quem não seguia), 1.485 salvamentos, 1.171 compartilhamentos e 836 seguidores novos, com só 6 comentários. O vídeo funciona como "cola para estudar depois".
- **Tema amplo, que se pesquisa e que não envelhece**: como ler um exame (TC, raio-X, eletro, POCUS, gasometria, monitor), sinais que entregam doenças (língua, olhos, pele), técnicas do plantão (suturas), mitos, "normal × doente". Não ficar só em exame de imagem.
- **Expositivo, nunca quiz.** O dono recusou vídeos com perguntas ao público ("chuta nos comentários", contagem regressiva). Uma pergunta retórica no gancho é aceita quando a resposta vem logo (a TC abre com "O que você procura primeiro?").

## Formatos que funcionaram

| Formato | Como é | Exemplo |
|---|---|---|
| Macete em capítulos | um mnemônico ou uma lista (Blood Can Be Very Bad, os 5 Ps) vira a barra de cima; cada item é um capítulo que voa para ela | 13, 20, 26, 27 |
| Normal × doente | tela dividida, o normal à esquerda e o doente revelado por uma cortina | 24 |
| Mito × verdade | o mito num cartão, carimbo vermelho de MITO, a verdade numa imagem real com selo VERDADE | 25 |
| Sinais que entregam doença | uma foto real por sinal, com a marcação e o nome do sinal | 21, 22, 23 |

## A estrutura do roteiro

1. **Gancho** (3 a 5 s): a promessa concreta. "POCUS na emergência: com cinco pês você acha pneumotórax, hemoperitônio e tamponamento." Pode vir em duas falas (`gancho` e `gancho-2`), a segunda apresentando o macete ("Decora: ...").
2. **Regra de ouro** (5 s): a frase que resolve metade dos casos ("quanto mais denso, mais branco"; "líquido é anecoico"; "everter as bordas").
3. **Capítulos** (de 4 a 6, de 6 a 11 s cada): o que é, como aparece na imagem e o que muda a conduta. Um capítulo pode ter mais de uma fala (no POCUS, `praia` e `pneumo` formam o capítulo Praia).
4. **Resumo** (5 s): o macete inteiro de novo.
5. **Fim**: "[excited] Salva pro plantão e me segue pra próxima aula!" (ou "Manda pra quem..."). A tela mostra "Segue @omedbot".

Duração: de 55 a 75 s depois de acelerada. Uns 180 a 210 palavras de narração.

## Linguagem

- **Técnica.** O público é de médicos e estudantes: anecoico e hiperecoico, sombra acústica posterior, hemoperitônio, síndrome intersticial, patognomônico, colapso diastólico. Nunca "sangue na barriga", "água no pulmão" nem "líquido é preto". Os nomes do macete podem ser populares (praia, poça), o conteúdo não.
- Letra no plural: "os 5 Ps" na tela e "cinco pês" na voz.
- Sem travessão (use vírgula, ponto ou dois-pontos), sem "Conteúdo educacional", "imagens geradas por IA" ou "fontes na legenda".
- Sinal com nome: só o que a literatura confirma. Quando o pedido não bate com nenhuma fonte (o "sinal do polvo" do derrame pleural), pesquise, pergunte ao dono e use o nome da literatura (o sinal da água-viva).
- Números escritos por extenso na fala ("dez por cento", "mil novecentos e um" vira "1901" na legenda sozinho).

## O arquivo `roteiro/falas.json`

```json
{
  "voz": "pAPuuSJNHMlOqQrrh8hx",
  "falas": [
    { "cena": "gancho", "fala": "[excited] POCUS na emergência: com cinco pês você acha pneumotórax, hemoperitônio e tamponamento." },
    { "cena": "gancho-2", "fala": "Decora: praia, pulmão, pleura, poça e pericárdio." },
    { "cena": "regra", "fala": "Regra de ouro: líquido é anecoico, preto. ..." },
    { "cena": "praia", "fala": "Praia: no pulmão normal, a linha pleural desliza. ..." },
    { "cena": "resumo", "fala": "Praia, pulmão, pleura, poça e pericárdio: os cinco pês do POCUS." },
    { "cena": "fim", "fala": "[excited] Salva pro plantão e me segue pra próxima aula!" }
  ]
}
```

- `cena` é o nome que `src/cena.js` usa (`C.praia[0]` é o instante em que a fala começa; `PAL('praia', 'pleural')` é o instante da palavra). Cada cena aparece uma vez.
- `[excited]` e `[serious]` são marcações do Eleven v3 (interpretação); não entram na legenda.
- A palavra que vai disparar uma animação precisa estar escrita do jeito que a legenda vai mostrar. Palavra repetida na mesma fala: `PAL(cena, palavra, 2)` pega a segunda.

Depois de escrever: `python -I tools/roteiro.py` (gera `narracao.txt` e avisa de travessão, cena repetida e fim sem "segue").

## Pedido da trilha (`roteiro/trilha.txt`)

Em inglês, instrumental, com o andamento e a energia do tema, sem pausas longas e com um final limpo perto do fim. Exemplo do POCUS: "Driving, modern electronic instrumental for a fast medical ultrasound tutorial on TikTok for medical students. 124 BPM, tight punchy drums, pulsing synth bass, a clean arpeggiated synth that feels like a scanning sonar ping... No vocals, no lyrics."
