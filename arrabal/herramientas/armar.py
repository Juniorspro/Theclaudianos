"""Arma arrabal/index.html: el juego sin los assets adentro. Cada asset se baja por streaming
desde jsDelivr (el CDN sirve este repo de GitHub con CORS), fijado al commit que se le pasa, así
la URL no cambia nunca y queda en caché. Los JSON chicos (cuadros de atlas, mapas) van adentro.
Uso: python3 armar.py <sha_del_commit_con_los_assets>
El sha tiene que ser de un commit YA PUSHEADO que tenga arrabal/assets/ como está ahora.
"""
import json, os, subprocess, sys
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, '..')
SHA = sys.argv[1]
BASE = 'https://cdn.jsdelivr.net/gh/Juniorspro/Theclaudianos@%s/arrabal/assets/' % SHA
ORDEN = ['a0_base.js', 'a1_entrada.js', 'a2_sonido.js', 'a3_musica.js', 'a4_datos.js', 'a5_titere.js', 'a6_pelea.js',
         'a7_combate.js', 'a8_vista.js', 'a9_ui.js', 'a10_menus.js', 'a12_arcade.js', 'a13_mando.js', 'a11_bucle.js']
F = os.path.join(RAIZ, 'fuentes')
cab = open(os.path.join(F, 'cabecera.html'), encoding='utf-8').read()
js = ''.join(open(os.path.join(F, f), encoding='utf-8').read() for f in ORDEN)
archivos = {}
A = os.path.join(RAIZ, 'assets')
for n in sorted(os.listdir(A)):
    base, ext = os.path.splitext(n)
    if ext == '.json':
        archivos[{'sfx': 'sfxMapa'}.get(base, base)] = json.load(open(os.path.join(A, n)))
    elif ext in ('.avif', '.webp', '.png', '.mp3'):
        archivos[base] = BASE + n
bloque = '<script id="archivos">window.ARCHIVOS=%s;</script>' % json.dumps(archivos, separators=(',', ':'))
html = os.path.join(RAIZ, 'index.html')
open(html, 'w', encoding='utf-8').write(cab + js + '\n})();\n</script>\n' + bloque + '\n</body>\n</html>\n')
subprocess.run(['python3', os.path.join(RAIZ, '..', 'herramientas', 'comun', 'poner_idioma.py'), html, os.path.join(AQUI, 'idioma.json')])
print('index.html: %.0f kB, %d assets por streaming desde %s' % (os.path.getsize(html) / 1024, sum(1 for v in archivos.values() if isinstance(v, str)), BASE))
