"""Compone la música de CABEZONES -> assets/cabezones/musica-*.mp3 + musica.json

Usa los instrumentos y la mezcla de ARRABAL (herramientas/arrabal/componer.py) y suma los de acá:
güira, cencerro, acordeón, bronces, y una hinchada entera (voces con formantes, palmas, bombos).
Temas: menu (cumbia, 100), partido (murga-rock, 132), final (épico, 148), hinchada (bucle de tribuna).
Uso: python3 componer.py [tema ...]
"""
import os, sys, json
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'arrabal'))
import componer as B
from componer import (SR, tt, pasa, serrucho, envolvente, hz, bombo, caja, platillo, crash, timbal, bajo,
                      bandoneon, piano, cuerdas, coro, golpe_orquesta, subida, melodia, acorde, Tema, mp3)
SALIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'cabezones')
rng = np.random.default_rng(23)


# ---------------- instrumentos nuevos ----------------
def guira(vol=1.0, largo=False):
    t = tt(0.09 if largo else 0.035)
    r = pasa(rng.uniform(-1, 1, len(t)), 'banda', (4500, 11000))
    rasp = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 180 * t))          # las estrías del metal
    return r * rasp * np.exp(-t * (30 if largo else 90)) * vol * 0.9


def cencerro(vol=1.0):
    t = tt(0.25)
    y = (np.sign(np.sin(2 * np.pi * 562 * t)) + np.sign(np.sin(2 * np.pi * 845 * t))) * 0.5
    return pasa(y, 'banda', (500, 3000)) * np.exp(-t * 18) * vol * 0.5


def palmas(vol=1.0):
    t = tt(0.12)
    y = np.zeros(len(t))
    for k in range(4):                                                  # varias manos, apenas corridas
        i = int(rng.uniform(0, 0.012) * SR)
        y[i:] += pasa(rng.uniform(-1, 1, len(t) - i), 'banda', (900, 3500)) * np.exp(-t[:len(t) - i] * 45)
    return y * vol * 0.5


def acordeon(m, dur, vol=1.0):
    """el bandoneón de ARRABAL, más brillante y con el vaivén del fuelle más rápido"""
    y = bandoneon(m, dur, vol)
    t = tt(len(y) / SR)
    return pasa(y, 'alto', 500) * (1 - 0.1 * np.sin(2 * np.pi * 7.5 * t)) * 1.25


def bronce(m, dur, vol=1.0):
    t = tt(dur + 0.08)
    f = hz(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 4 - 0.4, 0, 1))
    ph = np.cumsum(f) / SR
    y = (2 * (ph % 1) - 1) + (2 * ((ph * 1.003) % 1) - 1) * 0.7        # dos serruchos apenas desafinados
    # el filtro se abre al soplar: el ataque "brrap" de la trompeta
    env = envolvente(len(t), 0.03, 0.07)
    brillo = np.clip(t / 0.06, 0, 1) * np.exp(-t * 1.5)
    y = pasa(y, 'bajo', 1200) * (1 - brillo) + pasa(y, 'bajo', 4000) * brillo
    return y * env * vol * 0.28


def sinte(m, dur, vol=1.0):
    t = tt(dur + 0.05)
    f = hz(m)
    y = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + np.sign(np.sin(2 * np.pi * f * 1.006 * t)) * 0.5
    return pasa(y, 'bajo', 2600) * envolvente(len(t), 0.005, 0.05) * np.exp(-t * 1.2) * vol * 0.22


def voces(ms, dur, vol=1.0, vocal='a'):
    """un canto de tribuna: muchas voces desafinadas por formantes (a / o / e)"""
    t = tt(dur + 0.15)
    F = {'a': (750, 1150), 'o': (480, 850), 'e': (520, 1750)}[vocal]
    y = np.zeros(len(t))
    for m in ms:
        for k in range(9):
            f = hz(m) * 2 ** (rng.normal(0, 0.18) / 12)
            vib = 1 + 0.006 * np.sin(2 * np.pi * rng.uniform(4, 6.5) * t + rng.uniform(0, 6))
            ph = np.cumsum(f * vib) / SR
            y += (2 * (ph % 1) - 1) * rng.uniform(0.6, 1)
    y = pasa(y, 'banda', (F[0] * 0.7, F[0] * 1.3)) + pasa(y, 'banda', (F[1] * 0.8, F[1] * 1.2)) * 0.6
    return y * envolvente(len(t), 0.06, 0.15) * vol * 0.05


def bombo_murga(vol=1.0):
    """el bombo con platillo encima: la murga"""
    y = bombo(vol * 1.1)
    p = crash(vol * 0.35)[:int(0.4 * SR)] * np.exp(-tt(0.4) * 7)
    n = max(len(y), len(p))
    out = np.zeros(n)
    out[:len(y)] += y
    out[:len(p)] += p
    return out


def percu(T, patron, desde, compases, vol=1.0):
    piezas = {'g': guira, 'G': lambda v: guira(v, True), 'b': cencerro, 'p': palmas, 'm': bombo_murga,
              'k': bombo, 's': caja, 'h': platillo, 'c': crash, 't': lambda v: timbal(40, v)}
    for c in range(compases):
        for pieza, fila in patron.items():
            for i, ch in enumerate(fila):
                if ch in 'xo':
                    T.poner('bateria', piezas[pieza]((1.0 if ch == 'x' else 0.55) * vol), desde + c * 16 + i)


def bajo_cumbia(T, raices, desde, vol=1.0):
    """la cumbia: raíz en el uno, quinta en el tres, y una corchea que empuja"""
    for c, r in enumerate(raices):
        for p, d, s in ((0, 4, 0), (6, 2, 7), (8, 4, 7), (12, 2, 0), (14, 2, 12)):
            T.poner('bajo', bajo(r + s, d * T.s16, vol), desde + c * 16 + p)


def plancha(T, inst, acordes, desde, patron, vol=1.0, largo=2, pista='sala'):
    for c, ac in enumerate(acordes):
        for p in patron:
            for m in ac:
                T.poner(pista, inst(m, largo * T.s16, vol), desde + c * 16 + p)


# ---------------- los temas ----------------
def tema_menu():
    """menú: cumbia en sol, 100. A: acordeón con el tema; B: bronces y coro de tribuna."""
    T = Tema(100, 16)
    G, Em, C, D, Am = acorde('g3 b3 d4'), acorde('e3 g3 b3'), acorde('c4 e4 g4'), acorde('d4 f#4 a4'), acorde('a3 c4 e4')
    prog = [G, Em, C, D, G, Em, Am, D] * 2
    raices = [43, 40, 36, 38, 43, 40, 45, 38] * 2
    base = {'g': 'x.xxx.xxx.xxx.xx', 'b': '..x...x...x...x.', 'k': 'x.......x.......', 's': '....o.......o...'}
    percu(T, base, 0, 16, 0.8)
    percu(T, {'p': '....x.......x...'}, 64, 8, 0.7)
    bajo_cumbia(T, raices, 0, 0.85)
    plancha(T, piano, prog, 0, (2, 6, 10, 14), 0.3, 1)                 # el tumbao del piano a contratiempo
    tema = melodia('d5:2 g5:2 g5:2 a5:2 b5:4 a5:2 g5:2  e5:2 g5:2 b5:4 a5:2 g5:2 e5:4 '
                   'c5:2 e5:2 g5:4 e5:2 g5:2 a5:4  f#5:2 a5:2 d6:4 c6:2 a5:2 f#5:4 '
                   'd5:2 g5:2 g5:2 a5:2 b5:4 a5:2 g5:2  e5:2 g5:2 b5:4 d6:2 b5:2 g5:4 '
                   'a5:2 c6:2 e6:4 d6:2 c6:2 a5:4  d6:3 c6:1 b5:2 a5:2 g5:8')
    T.linea(acordeon, tema, 0, 0.9)
    T.linea(bronce, melodia('b5:2 r:2 b5:2 d6:4 b5:2 r:4  g5:2 r:2 g5:2 b5:4 g5:2 r:4 '
                            'e5:2 r:2 e5:2 g5:4 c6:2 r:4  f#5:2 a5:2 d6:4 r:8 '
                            'b5:2 r:2 b5:2 d6:4 b5:2 r:4  g5:2 r:2 g5:2 b5:4 d6:2 r:4 '
                            'c6:2 r:2 a5:2 e6:4 c6:2 r:4  d6:4 f#6:4 g6:8'), 64, 0.8)
    for c in range(8, 16, 2):
        T.poner('sala', voces(prog[c], 8 * T.s16, 0.9, 'o'), 64 + (c - 8) * 16)
    T.poner('bateria', crash(0.5), 64)
    return T


def tema_partido():
    """partido: murga-rock en la menor, 132. Bombo con platillo, bronces y un sinte que no cansa."""
    T = Tema(132, 16)
    Am, F, C, G, E = acorde('a3 c4 e4'), acorde('f3 a3 c4'), acorde('c4 e4 g4'), acorde('g3 b3 d4'), acorde('e3 g#3 b3')
    prog = [Am, F, C, G, Am, F, E, E] * 2
    raices = [45, 41, 36, 43, 45, 41, 40, 40] * 2
    murga = {'m': 'x..x..x...x..x..', 's': '....x.......x.xo', 'h': 'x.x.x.x.x.x.x.x.', 'p': '....x.......x...'}
    percu(T, murga, 0, 16, 0.85)
    for c, r in enumerate(raices):
        for p in range(0, 16, 2):
            T.poner('bajo', bajo(r + (12 if p in (6, 14) else 0), 2 * T.s16, 0.75), c * 16 + p)
    plancha(T, sinte, prog, 0, (0, 3, 6, 10, 12), 0.5, 2)
    T.linea(bronce, melodia('a5:3 a5:1 c6:2 a5:2 e6:4 d6:2 c6:2  c6:3 a5:1 f5:4 r:8 '
                            'g5:3 g5:1 c6:2 e6:2 g6:4 f6:2 e6:2  d6:3 b5:1 g5:4 r:8 '
                            'a5:3 a5:1 c6:2 a5:2 e6:4 d6:2 c6:2  f6:4 e6:2 d6:2 c6:4 a5:4 '
                            'g#5:4 b5:4 e6:4 d6:2 b5:2  e6:8 r:8'), 64, 0.85)
    T.linea(acordeon, melodia('e5:4 a5:4 c6:4 a5:4  f5:4 a5:4 c6:8  e5:4 g5:4 c6:4 g5:4  d5:4 g5:4 b5:8 '
                              'e5:4 a5:4 c6:4 a5:4  f5:4 a5:4 c6:8  e5:4 g#5:4 b5:4 e6:4  g#5:16'), 0, 0.6)
    for c in (8, 10, 12, 14):
        T.poner('sala', voces(prog[c], 7 * T.s16, 0.7, 'e'), c * 16)
    T.poner('bateria', crash(0.5), 64)
    return T


def tema_final():
    """la final y el trofeo: épico en re menor, 148, timbales y coro."""
    T = Tema(148, 16)
    Dm, Bb, F, C, A = acorde('d3 f3 a3'), acorde('bb2 d3 f3'), acorde('f3 a3 c4'), acorde('c3 e3 g3'), acorde('a2 c#3 e3')
    prog = [Dm, Bb, F, C, Dm, Bb, A, A] * 2
    raices = [38, 34, 41, 36, 38, 34, 33, 33] * 2
    percu(T, {'k': 'x.....x...x.....', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.', 't': 'x.....x.....x.x.'}, 0, 16, 0.8)
    percu(T, {'m': 'x..x..x.x..x..x.'}, 64, 8, 0.6)
    for c, r in enumerate(raices):
        for p in range(0, 16, 2):
            T.poner('bajo', bajo(r, 2 * T.s16, 0.8), c * 16 + p)
    for c, ac in enumerate(prog):
        T.poner('colchon', cuerdas([m + 12 for m in ac], 16 * T.s16, 0.8), c * 16)
        if c >= 8:
            T.poner('sala', coro([m + 12 for m in ac], 16 * T.s16, 0.7), c * 16)
    T.linea(bronce, melodia('d5:6 a5:2 f5:4 d5:4  bb5:6 a5:2 f5:8  a5:6 c6:2 f6:4 c6:4  e6:6 d6:2 c6:8 '
                            'd6:6 a5:2 f5:4 a5:4  d6:4 f6:4 bb5:8  a5:4 c#6:4 e6:4 g6:4  f6:6 e6:2 c#6:8 '
                            'd5:6 a5:2 f5:4 d5:4  bb5:6 a5:2 f5:8  a5:6 c6:2 f6:4 c6:4  e6:6 d6:2 c6:8 '
                            'd6:6 a5:2 f5:4 a5:4  d6:4 f6:4 bb6:8  a6:4 g6:4 e6:4 c#6:4  d6:16'), 0, 0.9)
    for c in (0, 8):
        T.poner('seco', golpe_orquesta(acorde('d3 a3 d4 f4'), 0.7), c * 16)
    T.poner('bateria', crash(0.6), 0)
    T.poner('bateria', crash(0.6), 128)
    return T


def tema_hinchada():
    """la tribuna: murmullo que respira, un canto de "oh-oh-oh" que va y viene, palmas y bombos."""
    T = Tema(120, 8)                                                   # 16 s de bucle
    n = int(T.largo * SR)
    t = np.arange(n) / SR
    rumor = pasa(rng.uniform(-1, 1, n), 'banda', (250, 2400))
    # el murmullo sube y baja: frecuencias que entran justas en el bucle, no se nota la costura
    mod = 0.75 + 0.15 * np.sin(2 * np.pi * t / T.largo * 2) + 0.1 * np.sin(2 * np.pi * t / T.largo * 5 + 1)
    T.pistas['colchon'][:n] += rumor * mod * 0.5
    for k in range(40):                                                # gritos sueltos de gente
        m = int(rng.uniform(52, 64))
        T.poner('sala', voces([m], rng.uniform(0.3, 0.7), 0.25, rng.choice(['a', 'e', 'o'])), rng.uniform(0, 124))
    canto = melodia('e4:4 e4:4 g4:6 e4:2  d4:4 d4:4 g4:8')              # "oh, oh, ooh-oh / oh, oh, ooh"
    for c in (0, 4):
        p = c * 16
        for m, d in canto:
            T.poner('sala', voces([m, m - 12], d * T.s16 * 0.95, 0.9, 'o'), p)
            p += d
    percu(T, {'p': '....x.......x...', 'm': 'x.......x..x....'}, 0, 8, 0.45)
    return T


TEMAS = {'menu': tema_menu, 'partido': tema_partido, 'final': tema_final, 'hinchada': tema_hinchada}

if __name__ == '__main__':
    rmeta = os.path.join(SALIDA, 'musica.json')
    meta = json.load(open(rmeta)) if os.path.exists(rmeta) else {}
    for n in (sys.argv[1:] or list(TEMAS)):
        y = TEMAS[n]().mezclar()
        if n == 'hinchada':
            y *= 0.8
        ruta = os.path.join(SALIDA, 'musica-%s.mp3' % n)
        mp3(y, ruta)
        meta[n] = round(len(y) / SR, 5)
        print('%-9s %5.1f s  pico %5.1f dB  %6.1f kB' % (n, len(y) / SR, 20 * np.log10(np.max(np.abs(y)) + 1e-9), os.path.getsize(ruta) / 1024))
    json.dump(meta, open(rmeta, 'w'))
