"""Arma juegos-pc/Duelo.html: cabecera + fuentes JS + assets como data: + selector de idiomas.
Uso: python3 armar.py
"""
import base64, json, os, re, subprocess
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, '..', '..')
F = os.path.join(AQUI, 'fuentes')
ORDEN = ['d0_base.js', 'd1_entrada.js', 'd2_sonido.js', 'd3_ui.js', 'd4_mundo.js', 'd5_datos.js', 'd6_jugador.js', 'd6b_futbolista.js',
         'd7_partido.js', 'd8_hud.js', 'd9_menus.js', 'd10_bucle.js']
cab = open(os.path.join(F, '00_cabecera.html'), encoding='utf-8').read()
js = ''.join(open(os.path.join(F, f), encoding='utf-8').read() + '\n' for f in ORDEN)
sil = open(os.path.join(AQUI, 'silencio.txt')).read().strip()
js = js.replace('__SILENCIO__', sil)
A = os.path.join(RAIZ, 'assets', 'duelo')
TIPOS = {'.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary'}
arch = {}
for n in sorted(os.listdir(A)):
    b, e = os.path.splitext(n)
    if e == '.json':
        arch[{'sfx': 'sfxMapa', 'voces': 'vocesMapa'}.get(b, b)] = json.load(open(os.path.join(A, n)))
    elif e in TIPOS:
        arch[b] = 'data:%s;base64,%s' % (TIPOS[e], base64.b64encode(open(os.path.join(A, n), 'rb').read()).decode())
bloque = '<script>window.ARCHIVOS=%s;</script>\n' % json.dumps(arch, separators=(',', ':'))
html = cab.replace('<script>window.__arranque', bloque + '<script>window.__arranque', 1)
html += js + '\n})();\n</script>\n</body>\n</html>\n'
sal = os.path.join(RAIZ, 'juegos-pc', 'Duelo.html')
open(sal, 'w', encoding='utf-8').write(html)
subprocess.run(['python3', os.path.join(RAIZ, 'herramientas', 'comun', 'poner_idioma.py'), sal, os.path.join(AQUI, 'idioma.json')])
print('Duelo.html: %.0f kB' % (os.path.getsize(sal) / 1024))
