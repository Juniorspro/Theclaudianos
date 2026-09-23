"""Hornea los videos de Rezona en animaciones de 24 cuadros -> assets/arrabal/anim-<id>.webp + anim.json

Por cada video (videos/<id>-<anim>.mp4, fondo verde o magenta plano):
  1. se sacan todos los cuadros (24 por segundo) y se les quita el fondo con un recorte suave por
     distancia al color del fondo, más un "despill" que saca el reflejo verde/magenta del borde;
  2. se elige el tramo: en los golpes, desde que el cuerpo arranca hasta que vuelve (la energía de
     movimiento contra el primer cuadro); en respirar y caminar, un ciclo que cierra (el par de
     cuadros más parecidos a la distancia de un período);
  3. se toman 24 cuadros parejos de ese tramo, todos con la MISMA ancla (los pies y el torso del
     primer cuadro): el cuerpo se mueve dentro de la animación y no tiembla entre cuadros;
  4. cada cuadro se recorta a lo suyo y se empaqueta en un atlas por luchador.
anim.json: {id: {alto: px de la guardia, a: {anim: [[x, y, w, h, dx, dy], ...24]}}}
(dx, dy: dónde va la esquina del cuadro respecto del ancla, en px del atlas)
Uso: python3 hornear_animaciones.py <carpeta_videos> [id ...]
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
from scipy import ndimage
import imageio_ffmpeg

VIDEOS = sys.argv[1]
SALIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'arrabal')
IDS = sys.argv[2:] or ['morocha', 'bandoneon', 'chispa', 'mate', 'parca', 'colectivo',
                       'kanji', 'xiao', 'buzo', 'lobizon', 'toro', 'vale']
ANIMS = ['idle', 'caminar', 'golpe', 'patada', 'especial', 'golpeado', 'caida', 'victoria']
CICLO = {'idle', 'caminar'}
ALTO = 160            # px de la guardia en el atlas
N = 24
FF = imageio_ffmpeg.get_ffmpeg_exe()


def cuadros(ruta):
    info = subprocess.run([FF, '-i', ruta], capture_output=True, text=True).stderr
    import re
    m = re.search(r'(\d{2,5})x(\d{2,5})', info[info.index('Video:'):])
    w, h = int(m.group(1)), int(m.group(2))
    crudo = subprocess.run([FF, '-loglevel', 'error', '-i', ruta, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                           capture_output=True).stdout
    return np.frombuffer(crudo, np.uint8).reshape(-1, h, w, 3).astype(np.float32)


def sin_fondo(f, fondo):
    """alfa suave por distancia al color del fondo + despill"""
    d = np.sqrt(((f - fondo) ** 2).sum(-1))
    a = np.clip((d - 60) / 70, 0, 1)
    # en el borde el color es mezcla de luchador y fondo: se despeja el luchador (c = a·fg + (1-a)·fondo)
    am = np.maximum(a, 0.08)[..., None]
    rgb = np.where(a[..., None] < 0.98, (f - (1 - am) * fondo) / am, f)
    rgb = np.clip(rgb, 0, 255)
    if fondo[1] > fondo[0]:          # verde: el verde no puede pasar al máximo de rojo y azul
        tope = np.maximum(rgb[..., 0], rgb[..., 2])
        rgb[..., 1] = np.where(rgb[..., 1] > tope, tope + (rgb[..., 1] - tope) * a * 0.3, rgb[..., 1])
    else:                            # magenta: rojo y azul no pasan al verde (más un poco)
        tope = rgb[..., 1] + 25
        for c in (0, 2):
            rgb[..., c] = np.where(rgb[..., c] > tope, tope + (rgb[..., c] - tope) * a * 0.3, rgb[..., c])
    # se queda con la mancha grande (el luchador) y lo que la toca: fuera motas del fondo
    m = a > 0.5
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=6))
    if n > 1:
        tam = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        grandes = [i + 1 for i, s in enumerate(tam) if s > 0.08 * tam.max()]
        a = a * np.isin(lab, grandes)
    return np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)


def tramo(fr, alfas, anim):
    n = len(fr)
    if anim in CICLO:
        # el ciclo que mejor cierra: período entre 0,8 y 2 s, buscado en el medio del video
        chico = [np.asarray(Image.fromarray(a).resize((64, 64))).astype(np.float32) for a in alfas]
        mejor = (1e18, 0, 24)
        for s in range(6, n - 30):
            for P in range(20, min(48, n - s - 1)):
                d = np.mean(np.abs(chico[s] - chico[s + P]))
                if d < mejor[0]:
                    mejor = (d, s, P)
        _, s, P = mejor
        return [s + int(i * P / N) for i in range(N)]
    # los golpes: dónde se mueve respecto del primer cuadro
    ref = alfas[0].astype(np.float32)
    e = np.array([np.mean(np.abs(a.astype(np.float32) - ref)) for a in alfas])
    umbral = max(e.max() * 0.12, 1.5)
    mov = np.nonzero(e > umbral)[0]
    if len(mov) == 0:
        return [int(i * (n - 1) / (N - 1)) for i in range(N)]
    a0 = max(0, mov[0] - 3)
    if anim in ('caida', 'victoria'):
        # termina cuando se queda quieto (tirado o en la pose)
        paso = np.array([np.mean(np.abs(alfas[i].astype(np.float32) - alfas[i - 1].astype(np.float32))) for i in range(1, n)])
        quieto = [i for i in range(mov[0] + 6, n - 1) if paso[i - 1:i + 4].max() < paso.max() * 0.08]
        a1 = quieto[0] + 2 if quieto else n - 1
    else:
        a1 = min(n - 1, mov[-1] + 3)
    a1 = max(a1, a0 + N - 1) if a0 + N - 1 < n else n - 1
    return [a0 + int(round(i * (a1 - a0) / (N - 1))) for i in range(N)]


def ancla(alfa):
    """pies (fila más baja con cuerpo) y torso (columna más cargada en la banda media)"""
    m = alfa > 128
    ys, xs = np.nonzero(m)
    y0, y1 = ys.min(), ys.max()
    h = y1 - y0
    banda = m[y0 + int(h * 0.3):y0 + int(h * 0.62)].sum(0).astype(float)
    banda = np.convolve(banda, np.ones(15) / 15, 'same')
    return float(banda.argmax()), float(y1), float(h)


def luchador(id_):
    meta, imgs = {'a': {}}, []
    alto_ref = None
    for anim in ANIMS:
        ruta = os.path.join(VIDEOS, '%s-%s.mp4' % (id_, anim))
        if not os.path.exists(ruta):
            continue
        fr = cuadros(ruta)
        esq = np.concatenate([fr[0, :8, :8].reshape(-1, 3), fr[0, :8, -8:].reshape(-1, 3), fr[0, -8:, :8].reshape(-1, 3)])
        fondo = np.median(esq, 0)
        rgba = [sin_fondo(f, fondo) for f in fr]
        alfas = [r[..., 3] for r in rgba]
        idx = tramo(fr, alfas, anim)
        ax, ay, h = ancla(alfas[0])
        if alto_ref is None:
            alto_ref = h
        k = ALTO / h                   # cada video se lleva a la misma altura de guardia
        lista = []
        previo = None
        for i in idx:
            # un cuadro casi igual al anterior (la pose que se sostiene) reusa el mismo lugar del atlas
            if previo is not None and np.mean(np.abs(rgba[i].astype(np.int16) - rgba[previo].astype(np.int16))) < 1.2:
                lista.append(lista[-1])
                continue
            previo = i
            r = rgba[i]
            m = r[..., 3] > 8
            ys, xs = np.nonzero(m)
            if len(ys) == 0:
                ys, xs = np.array([0, 1]), np.array([0, 1])
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            im = Image.fromarray(r[y0:y1, x0:x1]).resize((max(1, round((x1 - x0) * k)), max(1, round((y1 - y0) * k))), Image.LANCZOS)
            lista.append((im, round((x0 - ax) * k, 1), round((y0 - ay) * k, 1)))
        imgs.append((anim, lista))
    # atlas por estantes
    todos, visto = [], {}
    for anim, lista in imgs:
        for j, q in enumerate(lista):
            if id(q) in visto:                 # repetido: apunta al mismo recorte
                continue
            visto[id(q)] = (anim, j)
            todos.append((anim, j, q[0], q[1], q[2]))
    ANCHO_AT, x, y, fila, pos = 2048, 0, 0, 0, {}
    for anim, j, im, dx, dy in sorted(todos, key=lambda q: -q[2].height):
        if x + im.width > ANCHO_AT:
            x, y, fila = 0, y + fila + 1, 0
        pos[(anim, j)] = (x, y)
        x += im.width + 1
        fila = max(fila, im.height)
    at = Image.new('RGBA', (ANCHO_AT, y + fila), (0, 0, 0, 0))
    for anim, j, im, dx, dy in todos:
        at.paste(im, pos[(anim, j)])
    for anim, lista in imgs:
        for j, q in enumerate(lista):
            x, y = pos[visto[id(q)]]
            meta['a'].setdefault(anim, [None] * N)[j] = [x, y, q[0].width, q[0].height, q[1], q[2]]
    meta['alto'] = ALTO
    p = os.path.join(SALIDA, 'anim-%s.webp' % id_)
    at.save(p, 'WEBP', quality=62, method=6)
    print('%-10s %d anims, atlas %dx%d, %.0f kB' % (id_, len(imgs), at.width, at.height, os.path.getsize(p) / 1024), flush=True)
    return meta


if __name__ == '__main__':
    rj = os.path.join(SALIDA, 'anim.json')
    todo = json.load(open(rj)) if os.path.exists(rj) else {}
    for id_ in IDS:
        if any(os.path.exists(os.path.join(VIDEOS, '%s-%s.mp4' % (id_, a))) for a in ANIMS):
            todo[id_] = luchador(id_)
    json.dump(todo, open(rj, 'w'), separators=(',', ':'))
