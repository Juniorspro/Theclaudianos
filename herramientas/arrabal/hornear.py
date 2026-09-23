"""Hornea el arte crudo de Rezona para ARRABAL -> assets/arrabal/*.webp

Uso: python3 hornear.py <carpeta_cruda>
"""
import os, sys
from PIL import Image
CRUDO = sys.argv[1]
SALIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'arrabal')
RETRATOS = ['morocha', 'bandoneon', 'chispa', 'mate', 'parca', 'colectivo',
            'kanji', 'xiao', 'buzo', 'lobizon', 'toro', 'vale']
os.makedirs(SALIDA, exist_ok=True)
total = 0
def guardar(im, n, q):
    global total
    p = os.path.join(SALIDA, n + '.webp')
    im.save(p, 'WEBP', quality=q, method=6)
    total += os.path.getsize(p)
    print('%-22s %4dx%-4d %6.1f kB' % (n, im.width, im.height, os.path.getsize(p) / 1024))
for r in RETRATOS + ['relicario']:
    n = r if r == 'relicario' else 'retrato-' + r
    im = Image.open(os.path.join(CRUDO, n + '.png')).convert('RGBA')
    a = im.split()[3].point(lambda v: 255 if v > 12 else 0)
    im = im.crop(a.getbbox())            # recortado al contenido: si no, las cartas se ven vacías
    im.thumbnail((520, 520), Image.LANCZOS)
    guardar(im, n, 80)
for e in ['conventillo', 'milonga', 'riachuelo']:
    im = Image.open(os.path.join(CRUDO, 'escenario-' + e + '.png')).convert('RGB')
    guardar(im, 'escenario-' + e, 76)
print('TOTAL %.1f kB' % (total / 1024))
