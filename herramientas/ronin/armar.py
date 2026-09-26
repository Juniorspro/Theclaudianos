#!/usr/bin/env python3
"""Arma juegos-pc/Ronin.html (animaciones en MP4 H.264) y /tmp/ui/ronin/r.html (WebM VP9, para el Chromium del banco)."""
import os, json, base64, glob
AQ = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(AQ, 'fuentes'); A = os.path.join(AQ, 'assets'); R = os.path.join(AQ, '..', '..')
PARTES = ['1_base.js', '9_idiomas.js', '2_audio.js', '3_assets.js', '4_render.js', '5_lucha.js', '6_juego.js', '7_menu.js', '9z_arranque.js']
def datos(tipo):
    D = {'tipo':tipo, 'pj':{}, 'fondos':{}}
    for d in sorted(glob.glob(os.path.join(A, '*', '*.json'))):
        p = os.path.basename(d)[:-5]; meta = json.load(open(d)); clips = {}
        for a in meta['anims']: clips[a] = base64.b64encode(open(os.path.join(os.path.dirname(d), f'{p}_{a}.{tipo}'), 'rb').read()).decode()
        D['pj'][p] = {'meta':meta, 'clips':clips}
    for f in sorted(glob.glob(os.path.join(A, 'fondos', '*.webp'))): D['fondos'][os.path.basename(f)[:-5]] = base64.b64encode(open(f, 'rb').read()).decode()
    return 'const DATOS = ' + json.dumps(D, separators=(',', ':')) + ';\n'
cab = open(os.path.join(F, '0.html')).read()
codigo = ''.join(open(os.path.join(F, p)).read() + '\n' for p in PARTES if os.path.exists(os.path.join(F, p)))
pie = open(os.path.join(F, 'z.js')).read()
for tipo, ruta in [('mp4', os.path.join(R, 'juegos-pc', 'Ronin.html')), ('webm', '/tmp/ui/ronin/r.html')]:
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    open(ruta, 'w').write(cab + datos(tipo) + codigo + pie)
    print(ruta, os.path.getsize(ruta)//1024, 'KB')
