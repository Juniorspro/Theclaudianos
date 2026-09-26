"""Hornea el arte de DUELO DE ARCOS -> assets/duelo/ y copia lo que se reutiliza de CABEZONES
(placas y botones de interfaz, íconos, efectos de sonido, voces del relator, bucle de hinchada).
Uso: python3 hornear.py <carpeta_cruda>
"""
import os, sys, shutil
from PIL import Image
CRUDO = sys.argv[1]
RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
SAL = os.path.join(RAIZ, 'assets', 'duelo')
CAB = os.path.join(RAIZ, 'assets', 'cabezones')
os.makedirs(SAL, exist_ok=True)
def guardar(im, n, q=80):
    im.save(os.path.join(SAL, n + '.webp'), 'WEBP', quality=q, method=6)
for n in ('fondo-playa', 'fondo-terraza', 'fondo-noche'):
    im = Image.open(os.path.join(CRUDO, n + '.png')).convert('RGB')
    guardar(im.resize((2048, round(im.height * 2048 / im.width)), Image.LANCZOS), n, 78)
im = Image.open(os.path.join(CRUDO, 'cesped.png')).convert('RGB')
guardar(im.resize((512, 512), Image.LANCZOS), 'cesped', 82)
im = Image.open(os.path.join(CRUDO, 'carteles.png')).convert('RGB')
w, h = im.size
banda = im.crop((0, int(h * 0.665), w, int(h * 0.905)))            # la franja de abajo: sólo el dibujo
guardar(banda.resize((1536, round(banda.height * 1536 / w)), Image.LANCZOS), 'carteles', 80)
im = Image.open(os.path.join(CRUDO, 'logo.png')).convert('RGBA')
im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
guardar(im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS), 'logo', 88)
for f in os.listdir(CAB):
    if f.startswith(('ui-placa-', 'ui-btn-pausa', 'ui-moneda', 'ui-gema', 'ui-trofeo-', 'ui-cofre', 'ui-fx-explosion', 'ui-fx-fuego')) or f in (
            'sfx.mp3', 'sfx.json', 'voces.mp3', 'voces.json', 'musica-hinchada.mp3'):
        shutil.copy(os.path.join(CAB, f), os.path.join(SAL, f))
tot = sum(os.path.getsize(os.path.join(SAL, f)) for f in os.listdir(SAL))
print('listo:', len(os.listdir(SAL)), 'archivos,', tot // 1024, 'kB')
