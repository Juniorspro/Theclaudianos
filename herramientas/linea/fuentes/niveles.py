# arma 7_niveles.js: cada piso es un edificio partido en cuartos (BSP con semilla), con puertas, ventanas,
# muebles según el cuarto, escaleras, gente y armas. Todo se verifica con una búsqueda: se llega a cada
# enemigo, a la escalera y al auto. Celdas de 8 px; los muebles van en píxeles.
import json, random, sys
MUE = {'sillon':(24,12), 'sofa':(36,12), 'mesa':(20,14), 'mesaR':(16,16), 'cama':(20,30), 'escr':(26,12), 'inod':(8,10), 'banera':(26,12),
       'mesada':(32,10), 'hela':(12,12), 'planta':(10,10), 'tele':(14,8), 'pool':(34,20), 'barra':(40,10), 'cajon':(12,12), 'tacho':(10,10),
       'estante':(32,8), 'silla':(7,7), 'alfom':(30,20), 'parlante':(12,12)}
NOCHOCA = {'silla', 'alfom'}
PISOS_ES = set('aAmdbkclposeg')

class P:
    def __init__(s, w, h, sem):
        s.w, s.h = w, h; s.g = [[' ']*w for _ in range(h)]; s.r = random.Random(sem)
        s.cuartos = []; s.puertas = []; s.muebles = []; s.enem = []; s.armas = []; s.huecos = set(); s.meta = {}
    def f(s, x0, y0, x1, y1, c):
        for y in range(y0, y1+1):
            for x in range(x0, x1+1):
                if 0 <= x < s.w and 0 <= y < s.h: s.g[y][x] = c
    def paredes(s):
        for y in range(s.h):
            for x in range(s.w):
                if s.g[y][x] != ' ': continue
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        X, Y = x+dx, y+dy
                        if 0 <= X < s.w and 0 <= Y < s.h and s.g[Y][X] in PISOS_ES: s.g[y][x] = '#'
    def celdas(s): return [''.join(f) for f in s.g]

# ---------------------------------------------------------------- partir un edificio en cuartos
def bsp(p, x0, y0, x1, y1, minimo, prof=0):
    w, h = x1-x0+1, y1-y0+1
    if (w < minimo*2+1 and h < minimo*2+1) or (prof > 2 and p.r.random() < 0.25 and w*h < 260): return [(x0, y0, x1, y1)]
    vert = w > h if abs(w-h) > 4 else p.r.random() < 0.5
    if vert and w < minimo*2+1: vert = False
    if not vert and h < minimo*2+1: vert = True
    if vert:
        c = p.r.randint(x0+minimo, x1-minimo); return bsp(p, x0, y0, c-1, y1, minimo, prof+1) + bsp(p, c+1, y0, x1, y1, minimo, prof+1)
    c = p.r.randint(y0+minimo, y1-minimo); return bsp(p, x0, y0, x1, c-1, minimo, prof+1) + bsp(p, x0, c+1, x1, y1, minimo, prof+1)

def vecinos(a, b):
    # la pared que comparten: (orientación, fila o columna de la pared, desde, hasta)
    ax0, ay0, ax1, ay1 = a; bx0, by0, bx1, by1 = b
    if ax1+2 == bx0 or bx1+2 == ax0:
        col = ax1+1 if ax1+2 == bx0 else bx1+1; lo, hi = max(ay0, by0), min(ay1, by1)
        if hi-lo >= 3: return ('v', col, lo, hi)
    if ay1+2 == by0 or by1+2 == ay0:
        fila = ay1+1 if ay1+2 == by0 else by1+1; lo, hi = max(ax0, bx0), min(ax1, bx1)
        if hi-lo >= 3: return ('h', fila, lo, hi)
    return None

def edificio(p, x0, y0, x1, y1, tipos, minimo=6, extra=0.35, prob_puerta=0.65):
    cs = bsp(p, x0, y0, x1, y1, minimo)
    cs.sort(key=lambda c: (c[1], c[0]))
    # el cuarto más grande es el principal, los chiquitos baños
    area = lambda c: (c[2]-c[0]+1)*(c[3]-c[1]+1)
    orden = sorted(range(len(cs)), key=lambda i: -area(cs[i]))
    tipo = {}
    tipo[orden[0]] = tipos['principal']
    resto = list(tipos['otros'])
    for i in orden[1:]:
        if area(cs[i]) <= 30 and tipos.get('chico'): tipo[i] = tipos['chico']
        else: tipo[i] = resto[len(tipo) % len(resto)]
    for i, c in enumerate(cs):
        t = tipo[i]; p.f(c[0], c[1], c[2], c[3], PISO_DE[t](p.r) if callable(PISO_DE[t]) else PISO_DE[t])
        p.cuartos.append({'r':c, 't':t, 'i':i})
    # conectar: árbol con Kruskal al azar + algunas de más
    pares = [(i, k, v) for i in range(len(cs)) for k in range(i+1, len(cs)) for v in [vecinos(cs[i], cs[k])] if v]
    p.r.shuffle(pares); padre = list(range(len(cs)))
    def raiz(i):
        while padre[i] != i: i = padre[i]
        return i
    for i, k, v in pares:
        ri, rk = raiz(i), raiz(k)
        if ri != rk or p.r.random() < extra:
            padre[ri] = rk; abrir(p, v, p.r.random() < prob_puerta)
    return cs

def abrir(p, v, puerta):
    o, linea, lo, hi = v
    if puerta:
        a = p.r.randint(lo+1, hi-2)
        if o == 'h': p.puertas.append([a, linea, 'h']); celdas = [(a, linea), (a+1, linea)]
        else: p.puertas.append([linea, a, 'v']); celdas = [(linea, a), (linea, a+1)]
    else:
        n = min(3, hi-lo-1); a = p.r.randint(lo+1, hi-n)
        celdas = [(a+i, linea) if o == 'h' else (linea, a+i) for i in range(n)]
    for (x, y) in celdas:
        p.huecos.add((x, y)); p.g[y][x] = '?'          # se rellena con el piso de al lado

def rellenar(p):
    for (x, y) in p.huecos:
        for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
            c = p.g[y+dy][x+dx]
            if c in PISOS_ES: p.g[y][x] = c; break

PISO_DE = {'living':'m', 'dormi':'a', 'cocina':'k', 'banio':'b', 'pasillo':'l', 'oficina':'A', 'pista':'p', 'vip':'d', 'barra':'m',
           'camarin':'a', 'galpon':'c', 'deposito':'c', 'salon':'o', 'biblio':'A', 'comedor':'m', 'sotano':'c', 'boveda':'d', 'pool':'A',
           'calle':'s', 'vereda':'e', 'patio':'g'}

# ---------------------------------------------------------------- amueblar
def cabe(p, k, x, y, rot, cuarto):
    w, h = MUE[k]
    if rot: w, h = h, w
    X0, Y0, X1, Y1 = cuarto['r']
    if x < X0*8 or y < Y0*8 or x+w > (X1+1)*8 or y+h > (Y1+1)*8: return False
    for m in p.muebles:
        mw, mh = MUE[m[0]]
        if m[3]: mw, mh = mh, mw
        if x < m[1]+mw+2 and x+w+2 > m[1] and y < m[2]+mh+2 and y+h+2 > m[2]:
            if k == 'alfom' or m[0] == 'alfom': continue
            return False
    if k in NOCHOCA: return True
    # nada delante de una puerta o un hueco, ni de la escalera
    for (hx, hy) in list(p.huecos) + p.meta.get('reservas', []):
        if x-20 < hx*8+8 and x+w+20 > hx*8 and y-20 < hy*8+8 and y+h+20 > hy*8: return False
    return True

def poner(p, k, cuarto, donde='pared', rot=None, intentos=40):
    X0, Y0, X1, Y1 = cuarto['r']
    for _ in range(intentos):
        r = p.r.random() < 0.5 if rot is None else rot
        w, h = MUE[k]
        if r: w, h = h, w
        if donde == 'centro':
            x = (X0*8 + (X1+1)*8)//2 - w//2 + p.r.randint(-8, 8); y = (Y0*8 + (Y1+1)*8)//2 - h//2 + p.r.randint(-6, 6)
        else:
            lado = p.r.randint(0, 3)
            if lado == 0: x = p.r.randint(X0*8, (X1+1)*8-w); y = Y0*8
            elif lado == 1: x = p.r.randint(X0*8, (X1+1)*8-w); y = (Y1+1)*8-h
            elif lado == 2: x = X0*8; y = p.r.randint(Y0*8, (Y1+1)*8-h)
            else: x = (X1+1)*8-w; y = p.r.randint(Y0*8, (Y1+1)*8-h)
        if cabe(p, k, x, y, r, cuarto):
            p.muebles.append([k, x, y, 1 if r else 0]); return True
    return False

JUEGO_MUEBLES = {
    'living':[('alfom', 'centro'), ('sofa', 'pared'), ('sillon', 'pared'), ('tele', 'pared'), ('mesa', 'centro'), ('planta', 'pared'), ('planta', 'pared')],
    'dormi':[('cama', 'pared'), ('planta', 'pared'), ('escr', 'pared'), ('silla', 'pared')],
    'cocina':[('mesada', 'pared'), ('hela', 'pared'), ('mesaR', 'centro'), ('silla', 'pared'), ('tacho', 'pared')],
    'banio':[('inod', 'pared'), ('banera', 'pared')],
    'pasillo':[('planta', 'pared'), ('planta', 'pared')],
    'oficina':[('escr', 'pared'), ('silla', 'pared'), ('estante', 'pared'), ('planta', 'pared')],
    'pista':[('parlante', 'pared'), ('parlante', 'pared'), ('parlante', 'pared'), ('barra', 'pared'), ('mesaR', 'pared'), ('mesaR', 'pared')],
    'vip':[('sofa', 'pared'), ('sillon', 'pared'), ('mesaR', 'centro'), ('planta', 'pared')],
    'barra':[('barra', 'pared'), ('hela', 'pared'), ('cajon', 'pared'), ('tacho', 'pared')],
    'camarin':[('escr', 'pared'), ('sillon', 'pared'), ('estante', 'pared')],
    'galpon':[('cajon', 'pared'), ('cajon', 'pared'), ('cajon', 'centro'), ('cajon', 'pared'), ('estante', 'pared'), ('tacho', 'pared'), ('cajon', 'pared')],
    'deposito':[('estante', 'pared'), ('estante', 'pared'), ('cajon', 'pared'), ('cajon', 'pared')],
    'salon':[('alfom', 'centro'), ('sofa', 'pared'), ('sillon', 'pared'), ('sillon', 'pared'), ('planta', 'pared'), ('planta', 'pared'), ('mesaR', 'centro')],
    'biblio':[('estante', 'pared'), ('estante', 'pared'), ('estante', 'pared'), ('escr', 'centro'), ('sillon', 'pared')],
    'comedor':[('mesa', 'centro'), ('silla', 'pared'), ('silla', 'pared'), ('estante', 'pared'), ('planta', 'pared')],
    'pool':[('pool', 'centro'), ('barra', 'pared'), ('sillon', 'pared')],
    'sotano':[('cajon', 'pared'), ('cajon', 'pared'), ('estante', 'pared'), ('tacho', 'pared')],
    'boveda':[('estante', 'pared'), ('escr', 'centro'), ('cajon', 'pared')],
}
def amueblar(p):
    for c in p.cuartos:
        for k, d in JUEGO_MUEBLES.get(c['t'], []): poner(p, k, c, d)

# ---------------------------------------------------------------- lo que se puede pisar (igual que el juego)
def bloqueo(p):
    b = [[p.g[y][x] in ' #v' for x in range(p.w)] for y in range(p.h)]
    for k, x, y, rot in p.muebles:
        if k in NOCHOCA: continue
        w, h = MUE[k]
        if rot: w, h = h, w
        for cy in range((y+2)//8, (y+h-2)//8+1):
            for cx in range((x+2)//8, (x+w-2)//8+1): b[cy][cx] = True
    return b

def libre(p, x, y, b):
    return 0 <= x < p.w and 0 <= y < p.h and not b[y][x]

def alcance(p, desde):
    b = bloqueo(p); vis = {desde}; cola = [desde]
    while cola:
        x, y = cola.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x+dx, y+dy)
            # el cuerpo mide 10,4 px: hacen falta dos celdas libres de ancho, se prueba el cuadrado 2×2
            if q in vis or not libre(p, q[0], q[1], b): continue
            vis.add(q); cola.append(q)
    return vis

def ancho2(p, b, x, y):
    # hay un cuadrado 2×2 libre que contiene a (x, y)
    return any(all(libre(p, x+ox+i, y+oy+k, b) for i in (0, 1) for k in (0, 1)) for ox in (-1, 0) for oy in (-1, 0))

def alcance2(p, desde):
    b = bloqueo(p); vis = {desde}; cola = [desde]
    while cola:
        x, y = cola.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x+dx, y+dy)
            if q in vis or not libre(p, q[0], q[1], b) or not ancho2(p, b, q[0], q[1]): continue
            vis.add(q); cola.append(q)
    return vis

def quitar_estorbos(p, desde, objetivos):
    # si algún mueble tapa el paso, se saca (del último al primero) hasta que se llegue a todo
    for _ in range(60):
        v = alcance2(p, desde)
        falta = [o for o in objetivos if tuple(o) not in v]
        if not falta: return True
        chocan = [m for m in p.muebles if m[0] not in NOCHOCA]
        if not chocan: return False
        p.muebles.remove(chocan[-1])
    return False

# ---------------------------------------------------------------- gente y armas
def lugar(p, cuarto, b, lejos_de=None, dist=0, usados=()):
    X0, Y0, X1, Y1 = cuarto['r']
    for _ in range(80):
        x, y = p.r.randint(X0+1, X1-1), p.r.randint(Y0+1, Y1-1)
        if not libre(p, x, y, b) or not ancho2(p, b, x, y): continue
        if any(abs(x-u[0]) + abs(y-u[1]) < 4 for u in usados): continue
        if lejos_de and abs(x-lejos_de[0]) + abs(y-lejos_de[1]) < dist: continue
        return (x, y)
    return None

def centro(c): X0, Y0, X1, Y1 = c['r']; return ((X0+X1)//2, (Y0+Y1)//2)

def poblar(p, n, mezcla, inicio, armas_piso, rondas=0.35):
    b = bloqueo(p); usados = [inicio]
    cuartos = [c for c in p.cuartos if c['t'] not in ('calle', 'vereda', 'patio')] or p.cuartos
    alc = alcance2(p, tuple(inicio))
    k = 0; intentos = 0
    while k < n and intentos < 400:
        intentos += 1
        c = cuartos[(k*7 + intentos) % len(cuartos)]
        q = lugar(p, c, b, inicio, 18, usados)
        if not q or q not in alc: continue
        t, arma = mezcla[k % len(mezcla)]
        e = {'t':t, 'x':q[0], 'y':q[1], 'dir':p.r.choice([0, 90, 180, 270])}
        if arma: e['arma'] = arma
        if t not in ('perro', 'jefe') and p.r.random() < rondas:
            # ronda: del lugar a otro punto del mismo cuarto o al centro de uno vecino
            q2 = lugar(p, c, b, None, 0, [])
            if q2 and q2 in alc and abs(q2[0]-q[0]) + abs(q2[1]-q[1]) > 5: e['ruta'] = [[q[0], q[1]], [q2[0], q2[1]]]
        p.enem.append(e); usados.append(q); k += 1
    for a in armas_piso:
        for _ in range(60):
            c = p.r.choice(cuartos); q = lugar(p, c, b, None, 0, usados)
            if q and q in alc: p.armas.append([a, q[0], q[1]]); usados.append(q); break
    return k

# ---------------------------------------------------------------- escaleras
def escalera(p, cuarto, junto=None):
    # una celda libre pegada a una pared del cuarto (se dibuja la escalera ahí)
    X0, Y0, X1, Y1 = cuarto['r']
    cands = [(x, Y0) for x in range(X0+1, X1)] + [(x, Y1) for x in range(X0+1, X1)]
    if junto: cands.sort(key=lambda q: abs(q[0]-junto[0]) + abs(q[1]-junto[1]))
    else: p.r.shuffle(cands)
    b = bloqueo(p)
    for q in cands:
        if libre(p, q[0], q[1], b) and ancho2(p, b, q[0], q[1]) and not any(abs(q[0]-h[0]) < 3 and abs(q[1]-h[1]) < 3 for h in p.huecos): return list(q)
    return list(centro(cuarto))

def adentro(q, c):
    X0, Y0, X1, Y1 = c['r']; return [q[0], q[1] + 2 if q[1] == Y0 else q[1] - 2]

def ventanas(p, prob=0.5):
    # las paredes de afuera con piso de un lado y vacío del otro se hacen ventana a tramos
    for y in range(1, p.h-1):
        x = 1
        while x < p.w-1:
            c = p.g[y][x]
            if c == '#' and p.r.random() < prob*0.12:
                hz = (p.g[y-1][x] == ' ' and p.g[y+1][x] in PISOS_ES) or (p.g[y+1][x] == ' ' and p.g[y-1][x] in PISOS_ES)
                if hz:
                    n = p.r.randint(3, 5)
                    for i in range(n):
                        if p.g[y][x+i] == '#' and ((p.g[y-1][x+i] == ' ' and p.g[y+1][x+i] in PISOS_ES) or (p.g[y+1][x+i] == ' ' and p.g[y-1][x+i] in PISOS_ES)): p.g[y][x+i] = 'v'
                    x += n + 3; continue
            x += 1
    for x in range(1, p.w-1):
        y = 1
        while y < p.h-1:
            c = p.g[y][x]
            if c == '#' and p.r.random() < prob*0.12:
                vt = (p.g[y][x-1] == ' ' and p.g[y][x+1] in PISOS_ES) or (p.g[y][x+1] == ' ' and p.g[y][x-1] in PISOS_ES)
                if vt:
                    n = p.r.randint(3, 4)
                    for i in range(n):
                        if y+i < p.h-1 and p.g[y+i][x] == '#' and ((p.g[y+i][x-1] == ' ' and p.g[y+i][x+1] in PISOS_ES) or (p.g[y+i][x+1] == ' ' and p.g[y+i][x-1] in PISOS_ES)): p.g[y+i][x] = 'v'
                    y += n + 3; continue
            y += 1

def ventanas_internas(p, n):
    # vidrios entre cuartos (vidriera de oficina, pecera del VIP)
    hechas = 0
    for _ in range(200):
        if hechas >= n: break
        x, y = p.r.randint(2, p.w-3), p.r.randint(2, p.h-3)
        if p.g[y][x] != '#': continue
        if p.g[y-1][x] in PISOS_ES and p.g[y+1][x] in PISOS_ES and p.g[y][x-1] == '#' and p.g[y][x+1] == '#':
            for i in range(-1, 2):
                if p.g[y][x+i] == '#' and p.g[y-1][x+i] in PISOS_ES and p.g[y+1][x+i] in PISOS_ES: p.g[y][x+i] = 'v'
            hechas += 1

# ---------------------------------------------------------------- un piso entero
def piso(sem, w, h, tipos, n_enem, mezcla, armas, calle=False, sube=True, baja=False, minimo=6, extra=0.35, jefe=None, vidrios=2):
    p = P(w, h, sem)
    y1 = h-3 if not calle else h-12
    edificio(p, 2, 2, w-3, y1, tipos, minimo, extra)
    if calle:
        # vereda y calle abajo, con la entrada por el cuarto de abajo más cercano a la izquierda
        p.f(1, y1+2, w-2, y1+4, 'e'); p.f(1, y1+5, w-2, h-2, 's')
        p.cuartos.append({'r':(1, y1+2, w-2, h-2), 't':'calle', 'i':99})
        abajo = sorted([c for c in p.cuartos if c['r'][3] == y1], key=lambda c: c['r'][0])
        c = abajo[min(1, len(abajo)-1)]; x = (c['r'][0] + c['r'][2])//2
        p.puertas.append([x, y1+1, 'h']); p.huecos.update({(x, y1+1), (x+1, y1+1)}); p.g[y1+1][x] = p.g[y1+1][x+1] = '?'
        # una segunda entrada, hueco abierto, en el otro extremo
        c2 = abajo[-1]; x2 = (c2['r'][0] + c2['r'][2])//2
        if c2 is not c:
            for i in range(3): p.huecos.add((x2+i, y1+1)); p.g[y1+1][x2+i] = '?'
    p.paredes(); rellenar(p)
    ventanas(p, 0.9 if calle else 0.6); ventanas_internas(p, vidrios)
    # arranque, auto, escaleras
    meta = {}
    if calle:
        meta['auto'] = [6, h-5]; meta['inicio'] = [11, h-5]
    reserva = []
    if baja:
        cb = min(p.cuartos, key=lambda c: c['r'][0] + c['r'][1]*2)
        meta['baja'] = escalera(p, cb); meta['llegaSube'] = adentro(meta['baja'], cb); reserva.append(tuple(meta['baja']))
        meta['inicio'] = meta['llegaSube']
    if sube:
        lejos = max([c for c in p.cuartos if c['t'] != 'calle'], key=lambda c: abs(centro(c)[0]-meta['inicio'][0]) + abs(centro(c)[1]-meta['inicio'][1]))
        meta['sube'] = escalera(p, lejos); meta['llegaBaja'] = adentro(meta['sube'], lejos); reserva.append(tuple(meta['sube']))
    p.meta['reservas'] = [q for r in reserva for q in [r, (r[0]+1, r[1]), (r[0]-1, r[1]), (r[0], r[1]+1), (r[0], r[1]-1)]]
    amueblar(p)
    objetivos = [meta['inicio']] + [meta[k] for k in ('sube', 'baja', 'auto') if k in meta] + [list(h) for h in p.huecos]
    if not quitar_estorbos(p, tuple(meta['inicio']), objetivos): print('!! piso', sem, 'sin salida', file=sys.stderr)
    if jefe:
        lejos = max([c for c in p.cuartos if c['t'] != 'calle'], key=lambda c: abs(centro(c)[0]-meta['inicio'][0]) + abs(centro(c)[1]-meta['inicio'][1]))
        q = centro(lejos); p.enem.append({'t':'jefe', 'x':q[0], 'y':q[1], 'dir':90, 'arma':jefe})
    k = poblar(p, n_enem, mezcla, meta['inicio'], armas)
    if k < n_enem: print('!! piso', sem, 'con', k, 'de', n_enem, 'enemigos', file=sys.stderr)
    # la verificación: cada enemigo, arma y escalera se alcanza
    v = alcance2(p, tuple(meta['inicio']))
    for e in p.enem:
        if (e['x'], e['y']) not in v: print('!! piso', sem, 'enemigo inalcanzable', e, file=sys.stderr)
    d = {'w':w, 'h':h, 'celdas':p.celdas(), 'puertas':p.puertas, 'muebles':p.muebles, 'enemigos':p.enem, 'armas':p.armas}
    d.update(meta); return d, p

def ver(p, d):
    g = [list(f) for f in d['celdas']]
    for e in d['enemigos']: g[e['y']][e['x']] = 'J' if e['t'] == 'jefe' else ('P' if e['t'] == 'perro' else 'E')
    for a in d['armas']: g[a[2]][a[1]] = '*'
    for k, ch in (('inicio', '@'), ('sube', 'S'), ('baja', 'B'), ('auto', 'C')):
        if k in d: g[d[k][1]][d[k][0]] = ch
    for x, y, o in d['puertas']: g[y][x] = '-' if o == 'h' else '|'
    print('\n'.join(''.join(f) for f in g)); print()

# ---------------------------------------------------------------- los capítulos
T_DEPTO = {'principal':'living', 'otros':['dormi', 'cocina', 'pasillo', 'dormi', 'oficina'], 'chico':'banio'}
T_BAIL = {'principal':'pista', 'otros':['vip', 'barra', 'camarin', 'pasillo', 'deposito'], 'chico':'banio'}
T_DEPO = {'principal':'galpon', 'otros':['deposito', 'oficina', 'galpon', 'pasillo'], 'chico':'banio'}
T_MANS = {'principal':'salon', 'otros':['biblio', 'comedor', 'dormi', 'pool', 'cocina', 'pasillo'], 'chico':'banio'}
T_SOT = {'principal':'sotano', 'otros':['boveda', 'deposito', 'sotano', 'pasillo'], 'chico':'banio'}

CAPS = []
def cap(id, estilo, musica, ambiente, pisos, **kw):
    c = {'id':id, 'estilo':estilo, 'musica':musica, 'ambiente':ambiente, 'pisos':pisos}; c.update(kw); CAPS.append(c); return c

VER = '--ver' in sys.argv
def hecho(t):
    d, p = t
    if VER: ver(p, d)
    return d

# PRÓLOGO: una casita en Floresta, para aprender
pr = hecho(piso(1989, 44, 30, T_DEPTO, 5, [('patota', None), ('patota', 'bate'), ('patota', None), ('patota', 'pistola'), ('perro', None)], ['cano'], calle=True, sube=False, minimo=6, vidrios=1))
cap('prologo', 'depto', 'nivel1', 'calle', [pr], tutorial=True)
# 1: el edificio de la calle Lavalle, Once
cap('once', 'depto', 'nivel1', 'edificio', [
    hecho(piso(3101, 56, 40, T_DEPTO, 9, [('patota', 'bate'), ('patota', None), ('patota', 'pistola'), ('perro', None), ('patota', 'cano'), ('patota', 'cuchillo'), ('patota', 'escopeta'), ('patota', None), ('patota', 'bate')], ['cuchillo', 'bate'], calle=True)),
    hecho(piso(3102, 52, 36, T_DEPTO, 11, [('patota', 'uzi'), ('patota', 'bate'), ('patota', 'pistola'), ('perro', None), ('patota', 'cano'), ('gordo', None), ('patota', 'escopeta'), ('patota', 'cuchillo'), ('patota', 'pistola'), ('patota', 'bate'), ('perro', None)], ['katana'], sube=False, baja=True))])
# 2: la bailanta de Constitución
cap('bailanta', 'bailanta', 'nivel2', 'bailanta', [
    hecho(piso(4201, 60, 42, T_BAIL, 11, [('fiesta', 'bate'), ('fiesta', None), ('patota', 'uzi'), ('fiesta', 'cuchillo'), ('gordo', None), ('patota', 'pistola'), ('fiesta', 'cano'), ('patota', 'escopeta'), ('fiesta', None), ('patota', 'uzi'), ('fiesta', 'bate')], ['bate', 'pistola'], calle=True, minimo=7, vidrios=3)),
    hecho(piso(4202, 54, 38, T_BAIL, 12, [('patota', 'uzi'), ('fiesta', 'bate'), ('gordo', None), ('patota', 'escopeta'), ('fiesta', 'cuchillo'), ('patota', 'pistola'), ('fiesta', None), ('perro', None), ('patota', 'uzi'), ('fiesta', 'cano'), ('patota', 'silenciada'), ('gordo', None)], ['katana', 'cuchillo'], sube=False, baja=True, minimo=6, vidrios=3))])
# 3: el depósito de Dock Sud
cap('deposito', 'deposito', 'nivel3', 'deposito', [
    hecho(piso(5301, 62, 42, T_DEPO, 12, [('guardia', 'fusil'), ('perro', None), ('guardia', 'cano'), ('guardia', 'escopeta'), ('perro', None), ('guardia', 'pistola'), ('gordo', None), ('guardia', 'uzi'), ('guardia', 'bate'), ('perro', None), ('guardia', 'fusil'), ('guardia', 'cuchillo')], ['cano', 'silenciada'], calle=True, minimo=7, extra=0.5)),
    hecho(piso(5302, 58, 40, T_DEPO, 13, [('guardia', 'fusil'), ('guardia', 'escopeta'), ('perro', None), ('guardia', 'uzi'), ('gordo', None), ('guardia', 'pistola'), ('guardia', 'bate'), ('perro', None), ('guardia', 'fusil'), ('guardia', 'escopeta'), ('guardia', 'cuchillo'), ('gordo', None), ('guardia', 'uzi')], ['katana', 'bate'], sube=False, baja=True, minimo=7, extra=0.5))])
# 4: la mansión de San Isidro y el sótano del Jefe
cap('mansion', 'mansion', 'nivel4', 'mansion', [
    hecho(piso(6401, 62, 44, T_MANS, 13, [('guardia', 'silenciada'), ('patota', 'katana'), ('perro', None), ('guardia', 'escopeta'), ('gordo', None), ('guardia', 'fusil'), ('patota', 'cuchillo'), ('perro', None), ('guardia', 'uzi'), ('patota', 'bate'), ('guardia', 'pistola'), ('gordo', None), ('guardia', 'silenciada')], ['cuchillo', 'cano'], calle=True, minimo=7, vidrios=3)),
    hecho(piso(6402, 54, 38, T_SOT, 10, [('guardia', 'fusil'), ('guardia', 'escopeta'), ('perro', None), ('gordo', None), ('guardia', 'uzi'), ('patota', 'katana'), ('guardia', 'pistola'), ('perro', None), ('guardia', 'escopeta'), ('guardia', 'fusil')], ['katana', 'escopeta'], sube=False, baja=True, minimo=7, jefe='escopeta'))], estiloPisos=['mansion', 'sotano'], jefe=True)

js = '/* generado por niveles.py: no se edita a mano */\nconst CAPITULOS = ' + json.dumps(CAPS, ensure_ascii=False, separators=(',', ':')) + ';\n'
import os
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '7_niveles.js'), 'w').write(js)
print('7_niveles.js:', len(js), 'bytes,', sum(len(c['pisos']) for c in CAPS), 'pisos,', sum(len(p['enemigos']) for c in CAPS for p in c['pisos']), 'enemigos')
