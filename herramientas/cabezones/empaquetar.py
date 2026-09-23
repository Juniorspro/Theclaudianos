"""Mete los assets horneados de CABEZONES adentro del HTML, como data: URIs.

Queda un <script id="archivos"> al final del <body> con window.ARCHIVOS. Corre
antes de DOMContentLoaded, así que el juego lo encuentra al arrancar. Se puede
correr las veces que haga falta: reemplaza el bloque anterior.
Uso: python3 empaquetar.py
"""
import base64, json, os, re
RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
HTML = os.path.join(RAIZ, 'juegos-pc', 'Cabezones.html')
ASSETS = os.path.join(RAIZ, 'assets', 'cabezones')
TIPOS = {'.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': ''}

archivos = {}
for n in sorted(os.listdir(ASSETS)):
    base, ext = os.path.splitext(n)
    if ext not in TIPOS:
        continue
    if ext == '.json':                   # datos (cuadros de los sprites, mapa de efectos): van como objeto
        archivos[{'sfx': 'sfxMapa', 'voces': 'vocesMapa'}.get(base, base)] = json.load(open(os.path.join(ASSETS, n)))
        continue
    datos = open(os.path.join(ASSETS, n), 'rb').read()
    archivos[base] = 'data:%s;base64,%s' % (TIPOS[ext], base64.b64encode(datos).decode())
bloque = '<script id="archivos">window.ARCHIVOS=%s;</script>' % json.dumps(archivos, separators=(',', ':'))
s = open(HTML, encoding='utf-8').read()
s = re.sub(r'\n?<script id="archivos">.*?</script>', '', s, flags=re.S)
s = s.replace('</body>', bloque + '\n</body>', 1)
open(HTML, 'w', encoding='utf-8').write(s)
print('%d assets, HTML: %.1f kB' % (len(archivos), os.path.getsize(HTML) / 1024))
