"""Calcador de palitos: saca la pose de un personaje de palitos cuadro por cuadro.

Los rastreadores de cuerpo entrenados con personas no sirven para un palito. Acá se usa la
geometría: silueta oscura -> esqueleto de un píxel -> cabeza (máximo de la transformada de
distancia), cadera y cuello (donde se abren piernas y brazos), manos y pies (puntas) y codos y
rodillas (el punto más lejos de la cuerda de cada miembro).

La salida es la que usa pose() de BRONCA: coordenadas locales en metros, x hacia adelante,
y hacia arriba, origen entre los pies; escala = 0,56 m entre cadera y cuello.

    python3 calco_palitos.py video.mp4 --desde 12.5 --hasta 14 --x 320 --y 300 --salida jab.json
    python3 calco_palitos.py cuadros/*.png --salida prueba.json
"""
import argparse, json, sys, glob
from collections import deque
import numpy as np
import cv2
from skimage.morphology import skeletonize

CAD_CUE = 0.56  # metros entre cadera y cuello en el rig de BRONCA


def mascara(img, oscuro=70):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    m = (hsv[..., 2] < oscuro).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    return m


def componente(m, cerca=None):
    n, lab, st, cen = cv2.connectedComponentsWithStats(m, 8)
    if n <= 1:
        return None
    cand = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 40]
    if not cand:
        return None
    if cerca is None:
        i = max(cand, key=lambda i: st[i, cv2.CC_STAT_AREA])
    else:
        i = min(cand, key=lambda i: np.hypot(*(cen[i] - cerca)) - st[i, cv2.CC_STAT_AREA] * 0.01)
    return (lab == i).astype(np.uint8)


VEC = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def arbol(sk, raices):
    """BFS sobre el esqueleto desde el borde de la cabeza: padre de cada píxel."""
    h, w = sk.shape
    padre = {r: None for r in raices}
    q = deque(raices)
    while q:
        y, x = q.popleft()
        for dy, dx in VEC:
            v = (y + dy, x + dx)
            if 0 <= v[0] < h and 0 <= v[1] < w and sk[v] and v not in padre:
                padre[v] = (y, x)
                q.append(v)
    return padre


def camino(padre, p):
    c = []
    while p is not None:
        c.append(p)
        p = padre[p]
    return c[::-1]  # de la cabeza a la punta


def curva(c):
    """codo o rodilla: el punto del camino más lejos de la cuerda."""
    a, b = np.array(c[0], float), np.array(c[-1], float)
    d = b - a
    L = np.hypot(*d) or 1
    mejor, md = c[len(c) // 2], -1
    for p in c:
        e = abs(d[0] * (p[1] - a[1]) - d[1] * (p[0] - a[0])) / L
        if e > md:
            md, mejor = e, p
    return mejor if md > 1.5 else c[len(c) // 2]


def rellenar(m):
    """tapa agujeros (ojos, vinchas claras): si no, el esqueleto hace rulos en la cabeza."""
    cs, jer = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    o = m.copy()
    if jer is not None:
        for k, h in enumerate(jer[0]):
            if h[3] >= 0 and cv2.contourArea(cs[k]) < m.sum() * 0.05:
                cv2.drawContours(o, cs, k, 1, -1)
    return o


def recta(pts):
    p = np.array(pts, float); c = p.mean(0)
    u = np.linalg.svd(p - c)[2][0]
    return c, u


def cadera(a, b, n):
    """las piernas gruesas se funden en la imagen antes del hueso: la cadera se pone sobre la línea
    de cada muslo, a un largo de canilla desde la rodilla (muslo = canilla en el rig), y se promedia."""
    ja = np.array(a[max(0, n - 1)], float)
    est = []
    for c in (a, b):
        k = np.array(curva(c[n - 1:]), float); pie = np.array(c[-1], float)
        canilla = np.hypot(*(pie - k)); d = ja - k; L = np.hypot(*d)
        if L < 2 or canilla < 2:
            continue
        est.append(k + d / L * canilla)
    if not est:
        return tuple(int(v) for v in ja)
    x = np.mean(est, 0)
    return (int(round(x[0])), int(round(x[1])))


def pose_de(img, cerca=None, oscuro=70):
    m = mascara(img, oscuro)
    m = componente(m, cerca)
    if m is None:
        return None
    m = rellenar(m)
    dt = cv2.distanceTransform(m, cv2.DIST_L2, 3)
    hy, hx = np.unravel_index(np.argmax(dt), dt.shape)
    rc = float(dt[hy, hx])
    grosor = float(np.median(dt[skeletonize(m > 0)])) * 2 or 2
    # se saca la cabeza: el esqueleto arranca en el cuello, donde el cuerpo toca el círculo
    sin = m.copy(); cv2.circle(sin, (int(hx), int(hy)), int(rc * 1.25), 0, -1)
    sk = skeletonize(sin > 0)
    ys, xs = np.nonzero(sk)
    if len(ys) < 10:
        return None
    d = np.sqrt((ys - hy) ** 2 + (xs - hx) ** 2)
    cerca_c = d < d.min() + max(2.0, grosor * 0.6)
    borde = d < rc * 1.25 + max(2.0, grosor * 0.6)
    # raíces: lo que toca el recorte de la cabeza (cuello y, si quedaron sueltos, hombros)
    raices = [(int(y), int(x)) for y, x in zip(ys[borde | cerca_c], xs[borde | cerca_c])]
    # de cada pedazo tocado, un solo píxel (el más cercano a la cabeza)
    n_, lab = cv2.connectedComponents(sk.astype(np.uint8), connectivity=8)
    elegidas = {}
    for r in raices:
        l = lab[r]; dd = (r[0] - hy) ** 2 + (r[1] - hx) ** 2
        if l not in elegidas or dd < elegidas[l][0]:
            elegidas[l] = (dd, r)
    raices = [v[1] for v in elegidas.values()]
    raiz = min(raices, key=lambda r: (r[0] - hy) ** 2 + (r[1] - hx) ** 2)
    padre = arbol(sk, raices)
    hijos = {}
    for v, q in padre.items():
        if q is not None:
            hijos[q] = hijos.get(q, 0) + 1
    hojas = [v for v in padre if v not in hijos and padre[v] is not None]
    caminos = [camino(padre, h) for h in hojas]
    # ramitas del esqueletizado: muy cortas respecto del grosor del trazo
    caminos = [c for c in caminos if len(c) > grosor * 2.5]
    if len(caminos) < 2:
        return None
    def diverge(a, b):
        n = 0
        while n < min(len(a), len(b)) and a[n] == b[n]:
            n += 1
        return n
    # piernas: el par de puntas que se separa más lejos del cuello (vale acostado o dando vueltas)
    mejor, par = -1, None
    for x in range(len(caminos)):
        for y in range(x + 1, len(caminos)):
            n = diverge(caminos[x], caminos[y])
            if min(len(caminos[x]), len(caminos[y])) - n < grosor * 3:
                continue
            if n > mejor:
                mejor, par = n, (x, y)
    if par is None:
        return None
    pieA, pieB = caminos[par[0]], caminos[par[1]]
    if mejor < 2:   # las piernas salen del cuello mismo: no es un palito legible
        return None
    cad = cadera(pieA, pieB, mejor)
    tronco = pieA[:mejor]
    # brazos: las demás puntas que dejan el tronco antes de la mitad
    brazos = []
    for n, c in enumerate(caminos):
        if n in par:
            continue
        s = diverge(c, pieA)
        if s < mejor * 0.6 and len(c) - s > grosor * 3:
            brazos.append((len(c) - s, s, c))
    brazos = [b[1:] for b in sorted(brazos, reverse=True)[:2]]
    # cuello: donde el torso toca la cabeza (donde salen los brazos no sirve: si tapan el torso, cae en la cadera)
    cue = tronco[0]
    j = {'cab': (hy, hx), 'cue': cue, 'cad': cad,
         'rodA': curva(pieA[mejor - 1:]), 'pieA': pieA[-1],
         'rodB': curva(pieB[mejor - 1:]), 'pieB': pieB[-1]}
    for nm, (s, c) in zip('AB', brazos):
        tramo = c[max(0, s - 1):]
        j['codo' + nm] = curva(tramo)
        j['mano' + nm] = c[-1]
    return {'px': {k: (int(v[1]), int(v[0])) for k, v in j.items()}, 'rc': rc,
            'centro': (float(hx), float(hy)), 'brazos': len(brazos)}


def a_local(p, dir_=None):
    """de píxeles a metros del rig: origen entre los pies, y arriba, x adelante."""
    px = p['px']
    cad, cue = np.array(px['cad'], float), np.array(px['cue'], float)
    esc = CAD_CUE / (np.hypot(*(cue - cad)) or 1)
    pies = [np.array(px[k], float) for k in ('pieA', 'pieB')]
    ox = (pies[0][0] + pies[1][0]) / 2
    oy = max(pies[0][1], pies[1][1])
    if dir_ is None:  # mira hacia donde está la cabeza respecto de la cadera, o hacia las manos
        manos = [px[k][0] for k in ('manoA', 'manoB') if k in px]
        ref = (np.mean(manos) if manos else px['cab'][0]) - px['cad'][0]
        dir_ = 1 if ref >= 0 else -1
    o = {}
    for k, v in px.items():
        o[k] = [round((v[0] - ox) * esc * dir_, 3), round((oy - v[1]) * esc, 3)]
    return o, dir_, esc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('entrada', nargs='+')
    ap.add_argument('--desde', type=float, default=0)
    ap.add_argument('--hasta', type=float, default=1e9)
    ap.add_argument('--x', type=float)
    ap.add_argument('--y', type=float)
    ap.add_argument('--oscuro', type=int, default=70)
    ap.add_argument('--salida', default='calco.json')
    a = ap.parse_args()
    cuadros = []
    if len(a.entrada) == 1 and a.entrada[0].lower().endswith(('.mp4', '.webm', '.mov', '.mkv')):
        cap = cv2.VideoCapture(a.entrada[0])
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        cap.set(cv2.CAP_PROP_POS_MSEC, a.desde * 1000)
        while True:
            ok, img = cap.read()
            t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
            if not ok or t > a.hasta:
                break
            cuadros.append((t, img))
    else:
        fps = 60
        for i, f in enumerate(sorted(sum((glob.glob(e) for e in a.entrada), []))):
            cuadros.append((i / fps, cv2.imread(f)))
    cerca = np.array([a.x, a.y]) if a.x is not None else None
    salida, dir_ = [], None
    for t, img in cuadros:
        p = pose_de(img, cerca, a.oscuro)
        if not p:
            salida.append({'t': round(t, 3), 'ok': False})
            continue
        cerca = np.array(p['centro'])
        loc, dir_, esc = a_local(p, dir_)
        salida.append({'t': round(t, 3), 'ok': p['brazos'] == 2, 'pose': loc, 'px': p['px']})
    json.dump({'fps': fps, 'cuadros': salida}, open(a.salida, 'w'))
    bien = sum(1 for c in salida if c.get('ok'))
    print(f'{bien}/{len(salida)} cuadros con las 11 articulaciones -> {a.salida}')


if __name__ == '__main__':
    main()
