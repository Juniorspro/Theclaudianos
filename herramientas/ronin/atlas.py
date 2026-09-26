#!/usr/bin/env python3
"""Cuadros recortados (cuadros.py) → un atlas WebP por personaje + su ficha JSON.
  python3 atlas.py spec.json salida_dir
spec: {"pj":"heroe","alto":280,"anims":{"quieto":{"dir":"/tmp/ronin/f_x","loop":true,"max":12,"desde":0,"hasta":null,"fps":10}, …}}
- La raíz (los pies) sale del primer cuadro de la primera animación: todas arrancan de la misma referencia.
- Se recortan las colas quietas (cuadros casi iguales al primero o al último) y se submuestrea hasta `max`,
  pero sin perder el cuadro del golpe (el de mayor alcance hacia la derecha).
- Cada cuadro guarda su caja en el atlas y su esquina relativa a la raíz, en píxeles ya escalados."""
import sys, os, json, glob
import numpy as np
from PIL import Image
spec = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
def pies(a):
    ys, xs = np.nonzero(a > 128); yb = ys.max(); banda = ys > yb - (ys.max() - ys.min())*0.05
    return float(xs[banda].mean()), float(yb)
def alcance(a):
    ys, xs = np.nonzero(a > 128); return int(xs.max()) if len(xs) else 0
anims = spec['anims']; primero = next(iter(anims.values()))
f0 = sorted(glob.glob(primero['dir'] + '/a_*.png'))[0]
A0 = np.asarray(Image.open(f0))[..., 3]; rx, ry = pies(A0)
ys, xs = np.nonzero(A0 > 128); alto0 = ys.max() - ys.min(); esc = spec['alto']/alto0
meta = {'pj': spec['pj'], 'alto': spec['alto'], 'anims': {}}; piezas = []
for nom, s in anims.items():
    fs = sorted(glob.glob(s['dir'] + '/a_*.png'))[s.get('desde', 0): s.get('hasta') or None]
    ims = [np.asarray(Image.open(f)) for f in fs]
    al = [im[..., 3] for im in ims]
    small = [np.asarray(Image.fromarray(im).resize((160, 90))).astype(np.float32) for im in ims]
    dif = lambda i, j: float(np.abs(small[i] - small[j]).mean())
    i0, i1 = 0, len(ims) - 1
    if s.get('recortar', True):
        while i0 < i1 - 2 and dif(i0 + 1, 0) < 1.2: i0 += 1
        while i1 > i0 + 2 and dif(i1 - 1, len(ims) - 1) < 1.2: i1 -= 1
    idx = list(range(i0, i1 + 1))
    golpe = max(idx, key=lambda i: alcance(al[i])) if s.get('golpe') else None
    mx = s.get('max', 12)
    if len(idx) > mx:
        sel = sorted(set(int(round(k)) for k in np.linspace(0, len(idx) - 1, mx)))
        idx2 = [idx[k] for k in sel]
        if golpe is not None and golpe not in idx2:
            j = min(range(len(idx2)), key=lambda k: abs(idx2[k] - golpe)); idx2[j] = golpe
        idx = sorted(set(idx2))
    cuadros = []
    for i in idx:
        im = Image.fromarray(ims[i]); bb = im.getbbox()
        if not bb: continue
        c = im.crop(bb); w, h = max(1, round(c.width*esc)), max(1, round(c.height*esc)); c = c.resize((w, h), Image.LANCZOS)
        piezas.append((nom, len(cuadros), c)); cuadros.append({'ox': round((bb[0] - rx)*esc), 'oy': round((bb[1] - ry)*esc), 'w': w, 'h': h, 'src': i})
    px0 = pies(al[idx[0]])[0]; px1 = pies(al[idx[-1]])[0]
    meta['anims'][nom] = {'fps': s.get('fps', 12), 'loop': s.get('loop', False), 'cuadros': cuadros,
        'golpe': idx.index(golpe) if golpe in idx else None, 'avance': round((px1 - px0)*esc)}
# empaquetado en estantes, lo más alto primero
piezas.sort(key=lambda p: -p[2].height); W = spec.get('ancho', 2048); x = y = fila = 0; pos = []
for nom, k, c in piezas:
    if x + c.width > W: x = 0; y += fila + 2; fila = 0
    pos.append((nom, k, c, x, y)); x += c.width + 2; fila = max(fila, c.height)
H = y + fila; atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for nom, k, c, x, y in pos:
    atlas.paste(c, (x, y)); meta['anims'][nom]['cuadros'][k].update({'x': x, 'y': y})
q = spec.get('calidad', 74)
ruta = os.path.join(out, spec['pj'] + '.webp'); atlas.save(ruta, 'WEBP', quality=q, method=6, alpha_quality=80)
for a in meta['anims'].values():
    for c in a['cuadros']: c.pop('src', None)
meta['atlas'] = [W, H]
json.dump(meta, open(os.path.join(out, spec['pj'] + '.json'), 'w'), separators=(',', ':'))
n = sum(len(a['cuadros']) for a in meta['anims'].values())
print(spec['pj'], n, 'cuadros', f'{W}x{H}', os.path.getsize(ruta)//1024, 'KB', {k: (len(v['cuadros']), v['golpe'], v['avance']) for k, v in meta['anims'].items()})
