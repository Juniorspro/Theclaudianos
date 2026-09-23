"""Hornea los assets crudos de Rezona para CHICHARRA.

Crudo (1024 px, PNG, ~1,3 MB cada uno) -> WebP al tamaño de juego, recortado al
contenido. Uso: python3 hornear.py <carpeta_cruda>   (salida: assets/chicharra/)
"""
import os, sys
from PIL import Image

CRUDO = sys.argv[1]
SALIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'chicharra')
# nombre: (lado máximo en px, calidad, girar 180°)
SPRITES = {
    'nave-halcon': (256, 82, False), 'nave-brasa': (256, 82, False), 'nave-jade': (256, 82, False),
    # la chicharra salió mirando para arriba: los bichos tienen que mirar al jugador
    'bicho-chicharra': (200, 80, True), 'bicho-mosca': (200, 80, False),
    'bicho-avispa': (200, 80, False), 'bicho-escarabajo': (200, 80, False),
    'bicho-polilla': (200, 80, False),
    'jefe-reina': (520, 80, False), 'jefe-mantis': (520, 80, False), 'jefe-coloso': (520, 80, False),
}
FONDOS = {'fondo-violeta': 74, 'fondo-esmeralda': 74, 'fondo-carmesi': 74}

os.makedirs(SALIDA, exist_ok=True)
total = 0
for n, (lado, q, girar) in SPRITES.items():
    im = Image.open(os.path.join(CRUDO, n + '.png')).convert('RGBA')
    # recortar al contenido: si queda margen, el sprite se ve más chico que su hitbox
    a = im.split()[3].point(lambda v: 255 if v > 12 else 0)
    im = im.crop(a.getbbox())
    if girar:
        im = im.rotate(180)
    im.thumbnail((lado, lado), Image.LANCZOS)
    p = os.path.join(SALIDA, n + '.webp')
    im.save(p, 'WEBP', quality=q, method=6)
    total += os.path.getsize(p)
    print('%-18s %4dx%-4d %6.1f kB' % (n, im.width, im.height, os.path.getsize(p) / 1024))
for n, q in FONDOS.items():
    im = Image.open(os.path.join(CRUDO, n + '.png')).convert('RGB')
    p = os.path.join(SALIDA, n + '.webp')
    im.save(p, 'WEBP', quality=q, method=6)
    total += os.path.getsize(p)
    print('%-18s %4dx%-4d %6.1f kB' % (n, im.width, im.height, os.path.getsize(p) / 1024))
print('TOTAL %.1f kB' % (total / 1024))
