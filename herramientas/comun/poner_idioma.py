"""Mete (o reemplaza) el módulo de idiomas y el diccionario de un juego en su HTML, como un
<script id="idioma"> antes del script del juego.
Uso: python3 poner_idioma.py <juego.html> <diccionario.json>
"""
import json, os, re, sys
html, dic = sys.argv[1], sys.argv[2]
mod = open(os.path.join(os.path.dirname(__file__), 'idioma.js'), encoding='utf-8').read()
d = json.load(open(dic, encoding='utf-8')) if os.path.exists(dic) else {}
bloque = '<script id="idioma">window.IDIOMA_DIC=%s;\n%s</script>\n' % (json.dumps(d, ensure_ascii=False, separators=(',', ':')), mod)
s = open(html, encoding='utf-8').read()
s = re.sub(r'<script id="idioma">.*?</script>\n', '', s, count=1, flags=re.S)
i = s.index('<script>')
s = s[:i] + bloque + s[i:]
open(html, 'w', encoding='utf-8').write(s)
print('idioma puesto en', os.path.basename(html), '·', sum(len(v) for k, v in d.items() if k != '_re'), 'traducciones')
