"""Hornea el arte de interfaz que hizo Rezona para CABEZONES (botones, placas, íconos, logo,
botines y hojas de efectos) -> assets/cabezones/ui-*.webp
Uso: python3 hornear_ui.py <carpeta_cruda>
- btn-*: botones redondos, recortados a su caja, 256².
- placa-*: placas de botón en blanco, 96 de alto (el juego las estira en tres partes).
- logo, trofeo-*, cofre*, moneda, gema: recortados, lado largo 256 (el logo, 1000).
- botin-*: recortado, 160 de ancho, punta a la derecha.
- fx-*: hoja de 4x4 cuadros; cada celda se deja en 160² y se arma una tira de 16 cuadros.
"""
import os, sys
from PIL import Image

CRUDO = sys.argv[1]
SAL = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'cabezones')

def recortar(im):
    a = im.getchannel('A').point(lambda v: 255 if v > 24 else 0)
    return im.crop(a.getbbox()) if a.getbbox() else im

def sin_magenta(im):
    """a veces el fondo transparente no se aplica y viene magenta: se saca a mano, con despill"""
    import numpy as np
    a = np.array(im).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.minimum(r, b) - g
    alfa = np.clip(1 - (mag - 60) / 90, 0, 1)
    a[..., 3] = np.minimum(a[..., 3], alfa * 255)
    tope = g + np.maximum(0, 60 - np.maximum(0, mag - 60))   # el borde rosado vuelve a su color
    a[..., 0] = np.where(mag > 20, np.minimum(r, np.maximum(tope, g + 20)), r)
    a[..., 2] = np.where(mag > 20, np.minimum(b, np.maximum(tope, g + 20)), b)
    return Image.fromarray(a.astype('uint8'), 'RGBA')

def lado(im, n):
    e = n / max(im.size)
    return im.resize((max(1, round(im.width * e)), max(1, round(im.height * e))), Image.LANCZOS)

for f in sorted(os.listdir(CRUDO)):
    if not f.endswith('.png'):
        continue
    n = f[:-4]
    im = Image.open(os.path.join(CRUDO, f)).convert('RGBA')
    if n.startswith('fx-'):
        c = im.width // 4
        tira = Image.new('RGBA', (160 * 16, 160))
        im = sin_magenta(im)
        m = int(c * 0.03)                              # las líneas de la reja quedan afuera
        for k in range(16):
            celda = im.crop(((k % 4) * c + m, (k // 4) * c + m, (k % 4 + 1) * c - m, (k // 4 + 1) * c - m)).resize((160, 160), Image.LANCZOS)
            tira.paste(celda, (k * 160, 0))
        out = tira
    else:
        im = recortar(im)
        if n.startswith('btn-'):
            out = lado(im, 256)
        elif n.startswith('placa-'):
            out = im.resize((round(im.width * 96 / im.height), 96), Image.LANCZOS)
        elif n.startswith('botin-'):
            out = im.resize((160, round(im.height * 160 / im.width)), Image.LANCZOS)
        elif n == 'logo':
            out = lado(im, 1000)
        else:
            out = lado(im, 256)
    out.save(os.path.join(SAL, 'ui-%s.webp' % n), 'WEBP', quality=88, method=6)
    print(n, out.size)
