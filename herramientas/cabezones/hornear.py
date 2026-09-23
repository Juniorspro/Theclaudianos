"""Hornea el arte crudo de CABEZONES (Higgsfield, gpt_image_2_5 con fondo transparente).

Cabezas: recorta cada PNG 1024² a su mancha principal (la cabeza; deja afuera chispas o humo
sueltos que agrandarían el recuadro), la centra abajo en un cuadrado de 256 y la guarda en WebP.
Canchas: las achica a 1600 de ancho, WebP.
Uso: python3 hornear.py <carpeta_cruda>   (espera <id>.png, <id>-gol.png, <id>-bronca.png, cancha-*.png)
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

CRUDO = sys.argv[1]
SALIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'cabezones')
IDS = 'pibe zurda colorado mudo pocha gaucho flaca firulais chatarra profe'.split()
LADO = 256

def cabeza(src, dst):
    im = Image.open(src).convert('RGBA')
    a = np.array(im)[:, :, 3]
    etiq, n = ndimage.label(a > 128)
    tam = ndimage.sum(np.ones_like(a), etiq, range(1, n + 1))
    mayor = 1 + int(np.argmax(tam))
    ys, xs = np.where(etiq == mayor)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    m = 6
    im = im.crop((max(0, x0 - m), max(0, y0 - m), min(im.width, x1 + m), min(im.height, y1 + m)))
    esc = LADO / max(im.size)
    im = im.resize((max(1, round(im.width * esc)), max(1, round(im.height * esc))), Image.LANCZOS)
    lienzo = Image.new('RGBA', (LADO, LADO), (0, 0, 0, 0))
    lienzo.paste(im, ((LADO - im.width) // 2, LADO - im.height), im)
    lienzo.save(dst, 'WEBP', quality=86, method=6)

for i in IDS:
    for e, nom in (('', 'normal'), ('-gol', 'gol'), ('-bronca', 'bronca')):
        cabeza(os.path.join(CRUDO, i + e + '.png'), os.path.join(SALIDA, 'cab-%s-%s.webp' % (i, nom)))
for c in ('potrero', 'club', 'estadio'):
    im = Image.open(os.path.join(CRUDO, 'cancha-%s.png' % c)).convert('RGB')
    im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    im.save(os.path.join(SALIDA, 'cancha-%s.webp' % c), 'WEBP', quality=80, method=6)
tot = sum(os.path.getsize(os.path.join(SALIDA, f)) for f in os.listdir(SALIDA) if f.endswith('.webp'))
print('listo: %.0f kB en webp' % (tot / 1024))
