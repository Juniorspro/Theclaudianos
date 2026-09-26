#!/usr/bin/env python3
"""Video de Rezona (fondo verde plano) → cuadros recortados con alfa.
  python3 cuadros.py video.mp4 salida_dir [fps]
Saca los cuadros con ffmpeg, mide el verde en los bordes de cada cuadro, lo quita por relleno desde el borde
(no por umbral suelto: un verde adentro del dibujo no se toca si no toca el fondo), le saca el derrame verde
a los bordes y guarda PNG con alfa. Informa por cuadro: verde del fondo, área del personaje y su caja, para
poder descartar videos con fallas (el fondo que cambia, el personaje que se sale, el cuerpo que se corta)."""
import sys, os, subprocess, json, glob
import numpy as np
from PIL import Image
from scipy import ndimage
FF = '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2'
def extraer(video, d, fps):
    os.makedirs(d, exist_ok=True)
    for f in glob.glob(os.path.join(d, 'c_*.png')): os.remove(f)
    subprocess.run([FF, '-loglevel', 'error', '-i', video, '-vf', f'fps={fps}', os.path.join(d, 'c_%03d.png')], check=True)
    return sorted(glob.glob(os.path.join(d, 'c_*.png')))
def recortar(f):
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    borde = np.concatenate([a[:4].reshape(-1, 3), a[-4:].reshape(-1, 3), a[:, :4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)])
    fondo = np.median(borde, axis=0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # "verdor": cuánto le gana el verde al máximo de rojo y azul
    verdor = g - np.maximum(r, b)
    ref = fondo[1] - max(fondo[0], fondo[2])
    cand = verdor > ref*0.45                       # parece fondo
    lab, n = ndimage.label(cand)
    toca = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fondoM = np.isin(lab, list(toca))
    # alfa suave: en la franja del borde el alfa sale del verdor
    alfa = np.where(fondoM, 0.0, 1.0)
    borde_m = ndimage.binary_dilation(fondoM, iterations=2) & ~fondoM
    t = np.clip(1 - (verdor - ref*0.15)/(ref*0.35), 0, 1)
    alfa[borde_m] = t[borde_m]
    # sacar el derrame verde: el verde no puede pasar al mayor de rojo y azul
    g2 = np.minimum(g, np.maximum(r, b)*1.02 + 4)
    out = np.dstack([r, g2, b, alfa*255]).clip(0, 255).astype(np.uint8)
    # limpiar motas: sólo las componentes grandes
    lab2, n2 = ndimage.label(alfa > 0.5)
    if n2:
        tam = ndimage.sum(np.ones_like(alfa), lab2, range(1, n2 + 1))
        chicas = [i + 1 for i, s in enumerate(tam) if s < 80]
        out[np.isin(lab2, chicas), 3] = 0
    ys, xs = np.nonzero(out[..., 3] > 128)
    caja = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if len(xs) else None
    return Image.fromarray(out, 'RGBA'), {'fondo': [round(float(v)) for v in fondo], 'area': int(len(xs)), 'caja': caja, 'toca_borde': bool(caja and (caja[0] <= 2 or caja[2] >= w - 3 or caja[1] <= 2 or caja[3] >= h - 3))}
if __name__ == '__main__':
    video, d = sys.argv[1], sys.argv[2]; fps = sys.argv[3] if len(sys.argv) > 3 else '12'
    fs = extraer(video, d, fps); info = []
    for f in fs:
        im, i = recortar(f); im.save(f.replace('c_', 'a_')); i['f'] = os.path.basename(f); info.append(i)
    json.dump(info, open(os.path.join(d, 'info.json'), 'w'))
    areas = [i['area'] for i in info]
    print(len(fs), 'cuadros; área', min(areas), '-', max(areas), '; fondos', info[0]['fondo'], info[-1]['fondo'], '; tocan el borde', sum(i['toca_borde'] for i in info))
