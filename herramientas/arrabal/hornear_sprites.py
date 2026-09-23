"""Hornea las hojas de sprites de Rezona -> assets/arrabal/sprites-<id>.webp + sprites.json

Cada luchador tiene dos o tres hojas de 3 x 2 poses (hoja-<id>-a/b/c.png), fondo transparente
(la c, con pasos y preparaciones, es opcional). El recorte va por componentes conexas (la reja pedida es una sugerencia): las manchas
grandes son los cuerpos, en orden de lectura; lo chico (peces, chispas) va con el cuerpo más
cercano de su fila; las rayas finas (texto, líneas de piso, grilla) se tiran.
Ancla de cada cuadro: abajo = los pies del cuerpo (la mancha más grande); en x = la columna más cargada del torso, así el
cuerpo no baila al cambiar de pose aunque el brazo o la pierna se estiren.
Uso: python3 hornear_sprites.py <carpeta_con_las_hojas> [id,id,...]
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

CRUDO = sys.argv[1]
SALIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'arrabal')
IDS = ['morocha', 'bandoneon', 'chispa', 'mate', 'parca', 'colectivo',
       'kanji', 'xiao', 'buzo', 'lobizon', 'toro', 'vale']
if len(sys.argv) > 2:                    # para probar con algunos: ... kanji,toro
    IDS = sys.argv[2].split(',')
CUADROS = {'a': ['guardia', 'golpe', 'patada', 'golpeado', 'caido', 'victoria'],
           'b': ['alzada', 'barrida', 'salto', 'bloqueo', 'especial', 'dash'],
           'c': ['paso1', 'paso2', 'prepGolpe', 'prepPatada', 'levanta', 'volando']}
ALTO_GUARDIA = 250          # px de la pose de guardia en el atlas


# figuras sobrantes (la hoja trajo 7 en vez de 6): índice en orden de lectura que se saltea
SALTEAR = {('kanji', 'c'): [3], ('buzo', 'c'): [3]}


def celdas(ruta, saltear=()):
    im = Image.open(ruta).convert('RGBA')
    a = np.array(im)
    W, H = im.size
    masc = a[:, :, 3] > 40
    # una grilla dibujada (filas o columnas llenas de punta a punta) se borra entera
    filas = masc.sum(1) > 0.97 * W
    cols = masc.sum(0) > 0.97 * H
    masc[ndimage.binary_dilation(filas, iterations=2), :] = False
    masc[:, ndimage.binary_dilation(cols, iterations=2)] = False
    # las rayas finas (texto, líneas) se abren antes de buscar manchas: si no, pegan poses
    # entre sí; después cada mancha recupera su borde fino original
    base = ndimage.binary_opening(masc, structure=np.ones((5, 5)), iterations=1)
    lab, n = ndimage.label(ndimage.binary_dilation(base, iterations=2), structure=np.ones((3, 3)))
    lab = ndimage.grey_dilation(lab, size=(9, 9)) * masc
    comps = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None:
            continue
        comp = (lab[sl] == i) & masc[sl]
        area = int(comp.sum())
        h, w = comp.shape
        if area < 120 or h < 24:            # motas, texto
            continue
        if h < 40 and w > 3 * h:             # la sombra chata del piso (en el salto queda en el aire)
            continue
        ys, xs = np.nonzero(comp)
        comps.append({'i': i, 'sl': sl, 'area': area, 'cx': xs.mean() + sl[1].start, 'cy': ys.mean() + sl[0].start})
    # los cuerpos: las manchas grandes, en orden de lectura (fila de arriba, fila de abajo; izquierda a derecha)
    amax = max(c['area'] for c in comps)
    cuerpos = [c for c in comps if c['area'] > 0.25 * amax]
    cuerpos.sort(key=lambda c: (c['cy'] >= H / 2, c['cx']))
    cuerpos = [c for k, c in enumerate(cuerpos) if k not in saltear]
    assert len(cuerpos) == 6, (ruta, len(cuerpos))
    grupos = {k: [c] for k, c in enumerate(cuerpos)}
    # lo demás (peces, chispas, el arma suelta) va con el cuerpo más cercano de su misma fila
    for c in comps:
        if any(c is b for b in cuerpos) or (c['area'] > 0.25 * amax):
            continue
        k = min(range(6), key=lambda k: (cuerpos[k]['cy'] >= H / 2) != (c['cy'] >= H / 2) and 1e9 or
                abs(cuerpos[k]['cx'] - c['cx']) + abs(cuerpos[k]['cy'] - c['cy']))
        grupos[k].append(c)
    out = []
    for k in range(6):
        sl0 = cuerpos[k]['sl']
        pie = sl0[0].stop
        m = np.zeros(masc.shape, bool)
        for c in grupos[k]:
            if c is not cuerpos[k] and c['sl'][0].start > pie - 4:   # texto o rayas debajo de los pies
                continue
            m[c['sl']] |= (lab[c['sl']] == c['i']) & masc[c['sl']]
        ys, xs = np.nonzero(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgba = a[y0:y1, x0:x1].copy()
        rgba[:, :, 3] = np.where(m[y0:y1, x0:x1], rgba[:, :, 3], 0)
        # alto del cuerpo (sin peces ni chispas alrededor) y dónde pisa, dentro del recorte
        out.append((rgba, sl0[0].stop - sl0[0].start, pie - y0))
    return out


def ancla_x(rgba, tirado):
    al = rgba[:, :, 3] > 40
    h = al.shape[0]
    if tirado:
        return float(np.nonzero(al)[1].mean())
    banda = al[int(h * 0.3):int(h * 0.62)].sum(0).astype(float)
    banda = np.convolve(banda, np.ones(15) / 15, 'same')
    return float(banda.argmax())


meta = {}
for id_ in IDS:
    fr = {}
    for hoja in 'abc':
        ruta = os.path.join(CRUDO, 'hoja-%s-%s.png' % (id_, hoja))
        if not os.path.exists(ruta):         # la hoja c (pasos, preparaciones) es opcional
            continue
        for nom, c in zip(CUADROS[hoja], celdas(ruta, SALTEAR.get((id_, hoja), ()))):
            fr[nom] = c
    # la hoja b viene a otra escala: se empareja la guardia en bloqueo con la guardia de la a
    ka = ALTO_GUARDIA / fr['guardia'][1]
    kb = ka * fr['guardia'][1] / fr['bloqueo'][1]
    # la c se empareja por los pasos: caminando mide un poco más que en guardia
    kc = ka * fr['guardia'][1] * 1.04 * 2 / (fr['paso1'][1] + fr['paso2'][1]) if 'paso1' in fr else ka
    imgs = {}
    for nom, (rgba, alto, pie) in fr.items():
        k = ka if nom in CUADROS['a'] else kb if nom in CUADROS['b'] else kc
        im = Image.fromarray(rgba)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        imgs[nom] = (im, ancla_x(rgba, nom == 'caido') * k, pie * k)
    # atlas por estantes
    orden = sorted(imgs, key=lambda n: -imgs[n][0].height)
    ANCHO_AT, x, y, fila, pos = 1400, 0, 0, 0, {}
    for n in orden:
        im = imgs[n][0]
        if x + im.width > ANCHO_AT:
            x, y, fila = 0, y + fila + 2, 0
        pos[n] = (x, y)
        x += im.width + 2
        fila = max(fila, im.height)
    at = Image.new('RGBA', (ANCHO_AT, y + fila), (0, 0, 0, 0))
    m = {}
    for n in orden:
        im, ax, ay = imgs[n]
        at.paste(im, pos[n])
        m[n] = [pos[n][0], pos[n][1], im.width, im.height, round(ax, 1), round(ay, 1)]
    p = os.path.join(SALIDA, 'sprites-%s.webp' % id_)
    at.save(p, 'WEBP', quality=78, method=6)
    meta[id_] = {'alto': ALTO_GUARDIA, 'f': m}
    print('%-10s %4dx%-4d %6.1f kB' % (id_, at.width, at.height, os.path.getsize(p) / 1024))
json.dump(meta, open(os.path.join(SALIDA, 'sprites.json'), 'w'), separators=(',', ':'))
