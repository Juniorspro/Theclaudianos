#!/usr/bin/env python3
"""Cuadros aprobados de un personaje → un video chico por animación con el alfa empaquetado al costado.
  python3 procesar.py spec.json salida_dir
La mitad izquierda es el color premultiplicado sobre negro y la derecha el alfa en gris: el códec comprime entre
cuadros, que es donde está la ganancia (un tajo de 18 cuadros: 96 KB en H.264 contra 170 KB en WebP cuadro por
cuadro). Se escriben dos: MP4 H.264 para los celulares y WebM VP9 para el Chromium del banco, que no trae H.264.
spec: {"pj":…, "alto":px del personaje parado, "raiz_de":anim, "anims":{nombre:{"src":"heroe_tajo2", "max":14,
       "desde":0, "hasta":null, "loop":false, "fps":12, "golpe":true, "recortar":true}}}"""
import sys, os, json, glob, subprocess
import numpy as np
from PIL import Image
FF = '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
spec = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
def cuadros(src): return sorted(glob.glob(f'/tmp/ronin/f/{src}/a_*.png'))
def pies(a):
    ys, xs = np.nonzero(a > 128); yb = ys.max(); banda = ys > yb - (ys.max() - ys.min())*0.05
    return float(xs[banda].mean()), float(yb)
# la raíz: los pies del primer cuadro de la animación de referencia (todas arrancan de la misma imagen)
A0 = np.asarray(Image.open(cuadros(spec['anims'][spec['raiz_de']]['src'])[0]))[..., 3]
rx, ry = pies(A0); ys, xs = np.nonzero(A0 > 128); esc = spec['alto']/(ys.max() - ys.min())
meta = {'pj': spec['pj'], 'alto': spec['alto'], 'anims': {}}; tot = [0, 0]
tmp = '/tmp/ronin/pk_' + spec['pj']; os.makedirs(tmp, exist_ok=True)
for nom, s in spec['anims'].items():
    fs = cuadros(s['src'])[s.get('desde', 0): s.get('hasta') or None]
    ims = [np.asarray(Image.open(f)) for f in fs]
    chico = [np.asarray(Image.fromarray(im).resize((160, 90))).astype(np.float32) for im in ims]
    dif = lambda i, j: float(np.abs(chico[i] - chico[j]).mean())
    i0, i1 = 0, len(ims) - 1
    if s.get('recortar', True):
        while i0 < i1 - 2 and dif(i0 + 1, 0) < 1.2: i0 += 1
        while i1 > i0 + 2 and dif(i1 - 1, len(ims) - 1) < 1.2: i1 -= 1
    idx = list(range(i0, i1 + 1))
    alc = lambda i: int(np.nonzero(ims[i][..., 3] > 128)[1].max())
    golpe = max(idx, key=alc) if s.get('golpe') else None
    mx = s.get('max', 12)
    if len(idx) > mx:
        sel = [idx[int(round(k))] for k in np.linspace(0, len(idx) - 1, mx)]
        if golpe is not None and golpe not in sel:
            j = min(range(len(sel)), key=lambda k: abs(sel[k] - golpe)); sel[j] = golpe
        idx = sorted(set(sel))
    bb = None
    for i in idx:
        b = Image.fromarray(ims[i]).getbbox(); bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    w = max(2, int((bb[2] - bb[0])*esc)//2*2); h = max(2, int((bb[3] - bb[1])*esc)//2*2)
    for f in glob.glob(tmp + '/p_*.png'): os.remove(f)
    for k, i in enumerate(idx):
        a = np.asarray(Image.fromarray(ims[i]).crop(bb).resize((w, h), Image.LANCZOS)).astype(np.float32)
        al = a[..., 3:4]/255; rgb = a[..., :3]*al
        Image.fromarray(np.concatenate([rgb, np.repeat(a[..., 3:4], 3, axis=2)], axis=1).clip(0, 255).astype(np.uint8)).save(f'{tmp}/p_{k:03d}.png')
    base = os.path.join(out, f"{spec['pj']}_{nom}")
    crf = str(s.get('crf', 30))
    subprocess.run([FF, '-loglevel', 'error', '-y', '-framerate', '12', '-i', f'{tmp}/p_%03d.png', '-c:v', 'libx264', '-preset', 'veryslow', '-crf', crf,
                    '-bf', '0', '-g', '999', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', base + '.mp4'], check=True)
    subprocess.run([FF, '-loglevel', 'error', '-y', '-framerate', '12', '-i', f'{tmp}/p_%03d.png', '-c:v', 'libvpx-vp9', '-crf', str(int(crf) + 4), '-b:v', '0',
                    '-row-mt', '1', '-pix_fmt', 'yuv420p', '-an', base + '.webm'], check=True)
    px0 = pies(ims[idx[0]][..., 3])[0]; px1 = pies(ims[idx[-1]][..., 3])[0]
    meta['anims'][nom] = {'n': len(idx), 'fps': s.get('fps', 12), 'loop': s.get('loop', False), 'w': w, 'h': h,
        'ox': round((bb[0] - rx)*esc), 'oy': round((bb[1] - ry)*esc), 'golpe': idx.index(golpe) if golpe in idx else None,
        'avance': round((px1 - px0)*esc)}
    tot[0] += os.path.getsize(base + '.mp4'); tot[1] += os.path.getsize(base + '.webm')
json.dump(meta, open(os.path.join(out, spec['pj'] + '.json'), 'w'), separators=(',', ':'))
print(spec['pj'], sum(a['n'] for a in meta['anims'].values()), 'cuadros · mp4', tot[0]//1024, 'KB · webm', tot[1]//1024, 'KB ·', {k: (v['n'], v['golpe'], v['avance']) for k, v in meta['anims'].items()})
