#!/usr/bin/env python3
"""Hornea los PNG de Rezona y los mete en el HTML como data URLs."""
import base64, io, json, os, re, sys
from PIL import Image

CRUDO = sys.argv[1] if len(sys.argv)>1 else '/home/user/rezona-cwd/assets'
HTML  = '/home/user/Theclaudianos/juegos-pc/ElTipo.html'
HORNO = '/home/user/Theclaudianos/juegos-pc/assets-eltipo'
os.makedirs(HORNO, exist_ok=True)

def jpeg(im, q):
    b = io.BytesIO(); im.convert('RGB').save(b, 'JPEG', quality=q, optimize=True, progressive=True)
    return b.getvalue()
def png(im, colores):
    p = im.convert('RGBA')
    alfa = p.getchannel('A')
    q = p.convert('RGB').quantize(colors=colores, method=Image.MEDIANCUT)
    q = q.convert('RGBA'); q.putalpha(alfa)
    b = io.BytesIO(); q.save(b, 'PNG', optimize=True)
    return b.getvalue()
def recortar_alfa(im, margen=2):
    im = im.convert('RGBA')
    caja = im.getchannel('A').point(lambda v: 255 if v>16 else 0).getbbox()
    if not caja: return im
    x0,y0,x1,y1 = caja
    return im.crop((max(0,x0-margen), max(0,y0-margen),
                    min(im.width,x1+margen), min(im.height,y1+margen)))

salida = {}
for archivo in sorted(os.listdir(CRUDO)):
    if not archivo.lower().endswith(('.png','.jpg','.jpeg','.webp')): continue
    nombre = re.sub(r'-g\d+$', '', os.path.splitext(archivo)[0])
    ruta = os.path.join(CRUDO, archivo)
    im = Image.open(ruta)
    if nombre.startswith('cielo'):
        # el fondo se usa "cover" sobre un lienzo vertical: recorto al alto y achico
        objetivo = (330, 554)
        esc = max(objetivo[0]/im.width, objetivo[1]/im.height)
        im2 = im.convert('RGB').resize((round(im.width*esc), round(im.height*esc)), Image.LANCZOS)
        ix = (im2.width-objetivo[0])//2
        im2 = im2.crop((ix, im2.height-objetivo[1], ix+objetivo[0], im2.height))
        datos, mime = jpeg(im2, 60), 'image/jpeg'
    elif nombre.startswith('piso'):
        lado = min(im.width, im.height)
        im2 = im.convert('RGB').crop(((im.width-lado)//2, (im.height-lado)//2,
                                      (im.width+lado)//2, (im.height+lado)//2)).resize((96,96), Image.LANCZOS)
        datos, mime = jpeg(im2, 72), 'image/jpeg'
    else:
        im2 = recortar_alfa(im)
        alto = 200
        im2 = im2.resize((max(1,round(im2.width*alto/im2.height)), alto), Image.LANCZOS)
        datos, mime = png(im2, 72), 'image/png'
    open(os.path.join(HORNO, nombre + ('.jpg' if mime=='image/jpeg' else '.png')), 'wb').write(datos)
    salida[nombre] = 'data:%s;base64,%s' % (mime, base64.b64encode(datos).decode())
    print('%-10s %5d KB  %s' % (nombre, len(datos)//1024, im2.size))

if not salida:
    print('nada que hornear'); sys.exit(1)
bloque = ('/*ASSETS-INI*/\nconst ASSETS = {\n'
          + ',\n'.join('%s:"%s"' % (k,v) for k,v in sorted(salida.items()))
          + '\n};\n/*ASSETS-FIN*/')
s = open(HTML, encoding='utf-8').read()
ini, fin = s.index('/*ASSETS-INI*/'), s.index('/*ASSETS-FIN*/') + len('/*ASSETS-FIN*/')
s2 = s[:ini] + bloque + s[fin:]
assert s2 != s, 'no se pudo inyectar el bloque ASSETS'
open(HTML,'w',encoding='utf-8').write(s2)
print('total base64: %d KB — HTML: %d KB' % (sum(len(v) for v in salida.values())//1024, len(s2)//1024))
