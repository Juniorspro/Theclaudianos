"""Saca de las animaciones los cuadros que quedaron con un recuadro de fondo.
Pasa cuando el video de Rezona cambia el fondo verde por otro (el fuego de un especial oscurece la
escena) y el recorte por color no lo reconoce. Borrar ese fondo a mano se come al personaje (probado:
queda fantasmal), así que el cuadro con caja se reemplaza en anim.json por el cuadro limpio más
cercano de la misma animación. El atlas no se toca.
Un cuadro tiene caja cuando más del 45 % de su borde (3 px) está opaco.
Uso: python3 tapar_cajas.py
"""
import json, os
import numpy as np
from PIL import Image

A = os.path.join(os.path.dirname(__file__), '..', 'assets')
ruta = os.path.join(A, 'anim.json')
META = json.load(open(ruta))
for L, d in META.items():
    im = np.array(Image.open(os.path.join(A, 'anim-%s.avif' % L)).convert('RGBA'))[..., 3]
    cambios = []
    for n, fr in d['a'].items():
        def caja(f):
            x, y, w, h = f[:4]; c = im[y:y + h, x:x + w]
            ring = np.concatenate([c[:3].ravel(), c[-3:].ravel(), c[:, :3].ravel(), c[:, -3:].ravel()])
            return (ring > 128).mean() > 0.45
        malo = [caja(f) for f in fr]
        if not any(malo) or all(malo):
            continue
        buenos = [i for i, m in enumerate(malo) if not m]
        d['a'][n] = [fr[min(buenos, key=lambda j: abs(j - i))] if malo[i] else fr[i] for i in range(len(fr))]
        cambios.append('%s:%d' % (n, sum(malo)))
    if cambios:
        print(L, ' '.join(cambios))
json.dump(META, open(ruta, 'w'), separators=(',', ':'))
