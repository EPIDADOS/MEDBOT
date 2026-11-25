"""Prepara o texto da narração a partir do roteiro e confere o básico antes de gastar crédito no ElevenLabs.

Uso (na pasta do vídeo): python -I tools/roteiro.py
Lê roteiro/falas.json e grava roteiro/narracao.txt (as falas em sequência, com as marcações [excited] e [serious]).
Mostra o número de caracteres (é o que o ElevenLabs cobra), a duração estimada e os avisos: travessão no texto, fala
sem cena, cena repetida e o fim sem "Segue" ou "me segue".
"""
import json
import re
import sys
from pathlib import Path

PASTA = Path(__file__).resolve().parents[1]
falas = json.loads((PASTA / 'roteiro' / 'falas.json').read_text(encoding='utf-8'))['falas']
texto = ' '.join(f['fala'].strip() for f in falas)
(PASTA / 'roteiro' / 'narracao.txt').write_text(texto, encoding='utf-8')

limpo = re.sub(r'\[[a-z ]+\]', '', texto)
palavras = len(limpo.split())
print(f'{len(texto)} caracteres, {palavras} palavras, cerca de {palavras / 3.05:.0f} s depois de acelerada (voz_rapida 1,2x)')
avisos = []
if '—' in texto or '–' in texto:
    avisos.append('tem travessão no texto: troque por vírgula, ponto ou dois-pontos')
cenas = [f.get('cena', '') for f in falas]
if any(not c for c in cenas):
    avisos.append('há fala sem "cena"')
repetidas = sorted({c for c in cenas if cenas.count(c) > 1})
if repetidas:
    avisos.append('cenas repetidas (a cena precisa ser única): ' + ', '.join(repetidas))
if not re.search(r'segue', falas[-1]['fala'], re.I):
    avisos.append('a última fala não chama para seguir (@omedbot)')
for a in avisos:
    print('aviso:', a)
print('cenas:', ', '.join(cenas))
sys.exit(1 if avisos else 0)
