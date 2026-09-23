"""De los cuadros calcados a animaciones del rig de BRONCA.

Escala fija por clip (altura mediana del palito parado = 1,8 m), origen en la cadera (x) y el piso (y),
x hacia donde pega el golpe. El miembro que pega va como A (se dibuja adelante)."""
import json, sys, numpy as np
ALTO = 1.8
NOMBRES = ('cab', 'cue', 'cad', 'codoA', 'manoA', 'codoB', 'manoB', 'rodA', 'pieA', 'rodB', 'pieB')

ALTO_RC = 6.7   # en AoS5 el palito en guardia mide 6,7 radios de cabeza (medido en el clip limpio)

def escala_en(cs, k, v=15):
    """metros por píxel alrededor del cuadro k: del radio de la cabeza (mediana de la ventana: los TikTok hacen zoom)."""
    rc = [cs[j]['rc'] for j in range(max(0, k - v), min(len(cs), k + v + 1)) if cs[j].get('px')]
    return ALTO / (ALTO_RC * float(np.median(rc)))

def piso_en(cs, k, v=30):
    ys = [max(cs[j]['px']['pieA'][1], cs[j]['px']['pieB'][1]) for j in range(max(0, k - v), min(len(cs), k + v + 1)) if cs[j].get('px')]
    return float(np.percentile(ys, 80))

def local(c, esc, piso, dir_):
    P = c['px']; ox = P['cad'][0]
    return {k: [round((P[k][0] - ox) * esc * dir_, 3), round((piso - P[k][1]) * esc, 3)] for k in P}

def mover(clip, a, b, pico, miembro, dir_=None, piso=None):
    """miembro: 'mano' o 'pie'. pico: el cuadro donde está más estirado."""
    cs = json.load(open(clip))['cuadros']; esc = escala_en(cs, pico); piso = piso or piso_en(cs, pico)
    cp = cs[pico]
    if dir_ is None:
        xs = [cp['px'][m + s][0] for s in 'AB' for m in (miembro,) if m + s in cp['px']]
        dir_ = 1 if max(xs, key=lambda x: abs(x - cp['px']['cad'][0])) > cp['px']['cad'][0] else -1
    out = {}
    L = {k: local(cs[k], esc, piso, dir_) for k in range(a, b + 1) if cs[k].get('px')}
    # el que pega es A: en el pico, el más estirado; hacia los costados, el más cercano al anterior
    def asignar(k, ref):
        q = L[k]; cand = [s for s in 'AB' if miembro + s in q]
        if not cand: return None
        s = min(cand, key=lambda s: np.hypot(*np.subtract(q[miembro + s], ref)))
        return s
    refA = max((s for s in 'AB' if miembro + s in L[pico]), key=lambda s: L[pico][miembro + s][0])
    orden = list(range(pico, b + 1)) + list(range(pico - 1, a - 1, -1)); refs = {pico: L[pico][miembro + refA]}
    for k in orden:
        if k not in L: continue
        prev = refs.get(k - 1 if k > pico else k + 1, refs[pico])
        s = asignar(k, prev) if k != pico else refA
        q = dict(L[k])
        if s == 'B':
            for base in (('mano', 'codo') if miembro == 'mano' else ('pie', 'rod')):
                q[base + 'A'], q[base + 'B'] = q.get(base + 'B'), q.get(base + 'A')
            q = {k2: v for k2, v in q.items() if v is not None}
        if miembro + 'A' in q: refs[k] = q[miembro + 'A']
        out[k] = q
    return {'esc': esc, 'dir': dir_, 'cuadros': {k: out[k] for k in sorted(out)}}

if __name__ == '__main__':
    r = mover(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5])
    for k, q in r['cuadros'].items():
        f = lambda n: ('%5.2f,%5.2f' % tuple(q[n])) if n in q else '   ----   '
        print(k, '| mA', f('manoA'), 'mB', f('manoB'), '| pA', f('pieA'), 'pB', f('pieB'), '| cad', f('cad'), 'cue', f('cue'), 'cab', f('cab'))
    print('esc', r['esc'], 'dir', r['dir'])
