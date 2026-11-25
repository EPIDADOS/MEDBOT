# Regras do dono para os vídeos do Medbot

Cada regra veio de um pedido ou de uma recusa do dono. Valem para todo vídeo novo.

## Conteúdo

1. **Estilo da TC de crânio**: expositivo, com um método ou macete na barra de cima, um capítulo por item, imagem real num visor e marcações desenhadas por cima. Nunca quiz, nunca contagem regressiva, nunca "chuta nos comentários".
2. **Gancho forte** nos primeiros 3 segundos: a promessa concreta do que a pessoa vai saber fazer. Pergunta retórica só se a resposta vier logo.
3. **Linguagem técnica**: o público é de médicos e estudantes de medicina. Termos de livro (anecoico, hemoperitônio, síndrome intersticial, patognomônico, colapso diastólico), nunca "sangue na barriga" ou "água no pulmão".
4. Letra do macete no plural: "os 5 Ps" na tela, "cinco pês" na voz.
5. Sinal ou nome que a literatura não confirma: pesquisar, avisar o dono e usar o nome da literatura com o OK dele.
6. Temas amplos e que viralizam, não só exames de imagem.
7. Sem travessão no texto (vírgula, ponto ou dois-pontos), sem "Conteúdo educacional", "imagens geradas por IA" ou "fontes na legenda".
8. Revisar o texto médico antes de entregar (o README de cada vídeo tem a seção "Conteúdo" para isso).

## Imagens

9. **Só imagens reais**, com licença que permite uso comercial (CC0, domínio público, CC BY, CC BY-SA), com crédito no visor e na legenda. Nunca NC nem ND.
10. **Nunca imagem de exame gerada por IA.**
11. **Nenhum dado de paciente** à vista (nome, número, data no cabeçalho do aparelho), rosto recortado, criança sem exposição do corpo.
12. O único desenho é o Medbot. Esquema só quando não há foto aberta, sempre com a etiqueta ESQUEMA.
13. Ler a descrição do autor antes de usar a imagem.
14. Limite do Commons (429): esperar, usar a API do Europe PMC ou pedir ao dono que baixe. Nunca trocar o User-Agent nem passar por desafio anti-robô.

## Visual e marca

15. Verde-lima (`#C1FF72`) sobre tinta (`#0C1A21`), alerta em vermelho (`#FF4D57`), fontes Bricolage Grotesque e Onest. Outra paleta só a pedido (o vídeo de sífilis usou cobre e vinho).
16. Ícones Lucide; nunca emoji nem símbolo de texto como ícone.
17. O fim diz "Segue @omedbot". **Nunca a logo nem o nome da Medfye** nos vídeos do Medbot.
18. Movimento constante: o Medbot pula entre os cantos, aponta com o laser, a tela treme e pisca nos impactos, a legenda acende palavra por palavra. Animação que explica algo fica em laço, sem botão de "repetir".

## Voz e som

19. Voz Diego no Eleven v3, acelerada para uns 180 palavras por minuto, conferida pelo Scribe.
20. Trilha instrumental do Eleven Music que abaixa sob a voz, e os 10 efeitos do kit nos impactos.

## Chaves, publicação e máquina

21. Chave do ElevenLabs só no `.env.local` ou como variável no próprio comando; nunca em arquivo de código, commit ou mensagem.
22. Publicar no Instagram só com o OK do dono, na hora (a extensão do Chrome para antes de "Compartilhar"). Nunca digitar senha.
23. Nada vai para o Git sem o dono pedir.
24. Na máquina de 8 GB: um render por vez, nada pesado em paralelo, apagar os perfis temporários do Playwright e os arquivos que se refazem (`out/audio-final.wav`, `_grade-*`).
