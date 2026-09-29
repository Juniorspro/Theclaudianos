#!/usr/bin/env python3
"""Saca la carrera ('run', 5349) y el esprint ('dash', 5352) de madness_character (5628) y
escribe nevada/js/marcha_swf.js.

  python3 herramientas/swf/marcha.py [crudo/swf/mpn.swf] [nevada/js/marcha_swf.js]

Lo medido en el SWF (29/09/2026):
  - Cada estado de madness_character es UN cuadro con un clip 'mySprite' adentro: idle 5317
    (50 cuadros), run 5349 (28), backtrack 5350 (el run al reves), dash 5352 (14).
  - Piezas por profundidad: 1 y 3 las botas (sprite 2790; la 1 es la de LEJOS, la 3 la de
    cerca), 5/7 manos de atras, 9 myBody, 13 myHead, 17/19 manos de delante.
  - Mira a la DERECHA. Escala K = 0,214/13,06 m por px (px = twip/20): la cabeza queda 0,573 m
    sobre el centro del torso en idle, lo mismo que REF.cab de esquivas_swf.js.
  - Los pies del dash son los del run cuadro por medio: mismo ciclo, doble cadencia. Lo que
    cambia es el torso: 0,31-0,36 rad mas inclinado, 0,23-0,27 m adelantado y 2-6 cm mas bajo.
  - El pie apoyado retrocede 0,20-0,24 m por ciclo, y el personaje avanza 4,8 px por cuadro
    (2,36 m/s): el original patina; el pie no esta clavado.

Lo que se escribe, simetrizado (media del paso de un pie y del otro corrido medio ciclo:
en 2D el pie de cerca se mueve mas que el de lejos, en 3D la perspectiva ya la pone la camara):
  pie    [avance respecto a la media del ciclo, alto sobre su apoyo] por cuadro del run
  torso  [avance, alto, inclinacion hacia delante] del centro del torso respecto a idle
  cab    [avance, alto] de la cabeza respecto al torso, menos lo de idle
  mano   [avance, alto] del vaiven de la mano de delante respecto a su media
"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from swf import SWF

K = 0.214 / 13.06
PERSONAJE = 5628


def ap(m, x, y):
    a, b, c, d, tx, ty = m
    return a * x + c * y + tx, b * x + d * y + ty


def caja(s, cid, cache={}):
    """Caja (xmin, ymin, xmax, ymax) en twips de una forma o sprite (primer cuadro)."""
    if cid in s.formas:
        x0, x1, y0, y1 = s.formas[cid]
        return (x0, y0, x1, y1)
    if cid in cache:
        return cache[cid]
    cuadros, _ = s.linea(cid)
    xs, ys = [], []
    for e in (cuadros[0].values() if cuadros else []):
        bb = e['id'] is not None and caja(s, e['id'])
        if bb:
            for px, py in ((bb[0], bb[1]), (bb[2], bb[1]), (bb[0], bb[3]), (bb[2], bb[3])):
                X, Y = ap(e['m'], px, py)
                xs.append(X); ys.append(Y)
    cache[cid] = (min(xs), min(ys), max(xs), max(ys)) if xs else None
    return cache[cid]


def clip(s, rotulos, cuadros_p, rotulo):
    return cuadros_p[rotulos[rotulo]][3]['id']      # prof 3 = mySprite


def piezas(s, sid):
    """Por cuadro: centro (x, y) en m con Y arriba y giro (rad, + antihorario) de cada pieza."""
    cuadros, _ = s.linea(sid)
    nombres = {1: 'pieL', 3: 'pieC', 5: 'manoA', 9: 'torso', 13: 'cab', 17: 'manoD'}
    sal = []
    for f in cuadros:
        fila = {}
        for prof, n in nombres.items():
            e = f[prof]
            x0, y0, x1, y1 = caja(s, e['id'])
            X, Y = ap(e['m'], (x0 + x1) / 2, (y0 + y1) / 2)
            fila[n] = (X / 20 * K, -Y / 20 * K, -math.atan2(e['m'][1], e['m'][0]))
        sal.append(fila)
    return sal


def sim(v, corrimiento):
    """Media de la curva y la misma corrida 'corrimiento' cuadros (ciclica)."""
    n = len(v)
    return [[(a + b) / 2 for a, b in zip(v[i], v[(i + corrimiento) % n])] for i in range(n)]


def r4(t):
    return [[round(x, 4) for x in fila] for fila in t]


def main():
    ruta = sys.argv[1] if len(sys.argv) > 1 else 'crudo/swf/mpn.swf'
    salida = sys.argv[2] if len(sys.argv) > 2 else 'nevada/js/marcha_swf.js'
    s = SWF(ruta)
    cuadros_p, rotulos = s.linea(PERSONAJE)
    ids = {r: clip(s, rotulos, cuadros_p, r) for r in ('idle', 'run', 'dash', 'backtrack')}
    idle = piezas(s, ids['idle'])[0]
    run, dash = piezas(s, ids['run']), piezas(s, ids['dash'])
    n = len(run)

    # los pies: el avance, respecto a la media de su ciclo. El alto NO es la y del dibujo: en
    # 2,5D lo que baja en pantalla se acerca, y el pie de lejos 'baja' 2,8 cm mientras apoya.
    # Apoya mientras retrocede (va a la izquierda); vuela mientras avanza, y la altura del
    # vuelo se mide sobre la recta entre la y del despegue y la del aterrizaje.
    def pie(nombre):
        xs = [f[nombre][0] for f in run]
        ys = [f[nombre][1] for f in run]
        mx = sum(xs) / n
        vuela = [xs[(i + 1) % n] - xs[(i - 1) % n] > 1e-4 for i in range(n)]
        alto = [0.0] * n
        for i in range(n):
            if vuela[i] and not vuela[(i - 1) % n]:           # empieza un vuelo en i
                j = i
                while vuela[j % n]:
                    j += 1
                a, b = (i - 1) % n, j % n                     # despegue y aterrizaje
                largo = j - i + 1
                for k in range(i, j):
                    u = (k - i + 1) / largo
                    alto[k % n] = max(0.0, ys[k % n] - (ys[a] + (ys[b] - ys[a]) * u))
        return [[x - mx, h] for x, h in zip(xs, alto)]
    cerca, lejos = pie('pieC'), pie('pieL')
    # el de lejos va medio ciclo corrido: se alinea con el de cerca antes de promediar
    pie_sim = [[(a + b) / 2 for a, b in zip(cerca[i], lejos[(i + n // 2) % n])] for i in range(n)]

    t0 = idle['torso']
    def torso(clip_):
        return [[f['torso'][0] - t0[0], f['torso'][1] - t0[1], t0[2] - f['torso'][2]] for f in clip_]

    c0 = (idle['cab'][0] - t0[0], idle['cab'][1] - t0[1])
    def cab(clip_):
        return [[f['cab'][0] - f['torso'][0] - c0[0], f['cab'][1] - f['torso'][1] - c0[1]] for f in clip_]

    def mano(clip_):
        xs = [f['manoD'][0] - f['torso'][0] for f in clip_]
        ys = [f['manoD'][1] - f['torso'][1] for f in clip_]
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        return [[x - mx, y - my] for x, y in zip(xs, ys)]

    datos = {
        'fps': 30, 'K': round(K, 6), 'clips': ids,
        'pie': r4(pie_sim),
        'run': {'cuadros': n, 'torso': r4(sim(torso(run), n // 2)), 'cab': r4(sim(cab(run), n // 2)),
                'mano': r4(mano(run))},
        'dash': {'cuadros': len(dash), 'torso': r4(sim(torso(dash), len(dash) // 2)),
                 'cab': r4(sim(cab(dash), len(dash) // 2)), 'mano': r4(mano(dash))}
    }
    cab_js = ('/* marcha_swf.js -> GENERADO por herramientas/swf/marcha.py desde madness_character\n'
              '   (5628) del SWF: run %d, dash %d. NO se edita: se regenera.\n'
              '   Metros (K = 0,214/13,06 m/px), 30 fps, mirando a la derecha, Y arriba.\n'
              '   pie   [avance, alto] de una bota por cuadro del run; la otra va medio ciclo corrida\n'
              '   torso [avance, alto, inclinacion +adelante] del centro del torso respecto a idle\n'
              '   cab   [avance, alto] de la cabeza respecto al torso, menos lo de idle\n'
              '   mano  [avance, alto] del vaiven de la mano de delante respecto a su media\n'
              '   El dash usa los mismos pies (en el SWF son los del run cuadro por medio). */\n'
              % (ids['run'], ids['dash']))
    with open(salida, 'w', encoding='utf-8') as f:
        f.write(cab_js + '(function (global) {\n  global.MARCHA_SWF = '
                + json.dumps(datos, separators=(',', ':')) + ';\n})(window);\n')
    ex = [p[0] for p in pie_sim]
    al = [p[1] for p in pie_sim]
    print(f'{salida}: pie avance {min(ex):+.3f}..{max(ex):+.3f} m, alto hasta {max(al):.3f} m; '
          f'dash inclinacion {min(t[2] for t in datos["dash"]["torso"]):.3f}..{max(t[2] for t in datos["dash"]["torso"]):.3f} rad')


if __name__ == '__main__':
    main()
