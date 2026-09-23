"""Compone y renderiza la banda sonora de ARRABAL -> assets/arrabal/musica-<tema>.mp3

Seis temas de electrotango para salón de arcade, escritos a mano (notas, acordes y baterías) y
sintetizados acá: bandoneón (dos serruchos desafinados con trémolo), piano de marcato, cuerdas,
bajo en habanera, batería, guitarra saturada y coro para el jefe. Cada tema es un bucle: la cola
de la reverb se pliega sobre el principio, así el corte no se oye.
Uso: python3 componer.py [tema ...]      (sin argumentos: los seis)
Pide numpy, scipy y lameenc (pip install numpy scipy lameenc).
"""
import os, sys
import numpy as np
from scipy import signal
import lameenc

SR = 32000
SALIDA = os.path.join(os.path.dirname(__file__), 'salida')   # sólo si se corre suelto; cada juego usa la suya
rng = np.random.default_rng(7)
NOTAS = {'c': 0, 'c#': 1, 'db': 1, 'd': 2, 'd#': 3, 'eb': 3, 'e': 4, 'f': 5, 'f#': 6, 'gb': 6,
         'g': 7, 'g#': 8, 'ab': 8, 'a': 9, 'a#': 10, 'bb': 10, 'b': 11}


def midi(n):
    """'a4' -> 69"""
    nom, oct_ = n[:-1], int(n[-1])
    return NOTAS[nom] + 12 * (oct_ + 1)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def pasa(x, tipo, f, orden=2):
    if tipo == 'banda':
        b, a = signal.butter(orden, [f[0] / (SR / 2), f[1] / (SR / 2)], 'band')
    else:
        b, a = signal.butter(orden, f / (SR / 2), 'low' if tipo == 'bajo' else 'high')
    return signal.lfilter(b, a, x)


def serrucho(f, t, fase=0.0):
    """serrucho con banda limitada (suma de armónicos hasta Nyquist): sin aliasing"""
    n = max(1, int((SR / 2 - 200) / f))
    n = min(n, 60)
    y = np.zeros_like(t)
    w = 2 * np.pi * f * t + fase
    for k in range(1, n + 1):
        y += np.sin(k * w) / k
    return y * 0.6


def cuadrada(f, t):
    n = min(40, max(1, int((SR / 2 - 200) / f)))
    y = np.zeros_like(t)
    for k in range(1, n + 1, 2):
        y += np.sin(2 * np.pi * k * f * t) / k
    return y * 0.8


def envolvente(n, at, rel, sost=1.0):
    e = np.full(n, sost)
    a = min(n, int(at * SR))
    r = min(n - a, int(rel * SR))
    if a:
        e[:a] = np.linspace(0, sost, a)
    if r:
        e[n - r:] *= np.linspace(1, 0, r)
    return e


# ---------------- los instrumentos ----------------
def bombo(vol=1.0):
    t = tt(0.42)
    f = 44 + 110 * np.exp(-t * 30)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8.5)
    y[:90] += rng.uniform(-1, 1, 90) * np.linspace(0.6, 0, 90)
    return np.tanh(y * 1.6) * vol


def caja(vol=1.0):
    t = tt(0.26)
    ruido = pasa(rng.uniform(-1, 1, len(t)), 'banda', (900, 7000)) * np.exp(-t * 20)
    cuerpo = np.sin(2 * np.pi * 186 * t) * np.exp(-t * 32)
    return (ruido * 1.3 + cuerpo * 0.7) * vol


def platillo(abierto=False, vol=1.0):
    t = tt(0.35 if abierto else 0.06)
    return pasa(rng.uniform(-1, 1, len(t)), 'alto', 7000) * np.exp(-t * (11 if abierto else 70)) * vol


def crash(vol=1.0):
    t = tt(2.4)
    return pasa(rng.uniform(-1, 1, len(t)), 'alto', 3800) * np.exp(-t * 2.2) * vol


def madera(vol=1.0, f=1400):
    """el golpe en la caja del contrabajo (chasquido de tango) / el tic-tac"""
    t = tt(0.05)
    return pasa(rng.uniform(-1, 1, len(t)), 'banda', (f * 0.7, f * 1.4), 2) * np.exp(-t * 90) * vol * 1.6


def timbal(m, vol=1.0):
    t = tt(1.2)
    f = hz(m) * (1 + 0.15 * np.exp(-t * 18))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2) * vol


def bajo(m, dur, vol=1.0):
    t = tt(dur + 0.05)
    f = hz(m)
    y = pasa(serrucho(f, t), 'bajo', 750) * 0.9 + np.sin(2 * np.pi * f * t) * 0.7
    return y * envolvente(len(t), 0.006, 0.06) * np.exp(-t * 1.6) * vol


def bandoneon(m, dur, vol=1.0):
    t = tt(dur + 0.12)
    f = hz(m)
    vib = 1 + 0.0035 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t * 3, 0, 1)
    ph = np.cumsum(f * vib) / SR * 2 * np.pi
    y = (sum(np.sin(k * ph * 2 ** (6 / 1200)) / k for k in range(1, 18)) +
         sum(np.sin(k * ph * 2 ** (-6 / 1200)) / k for k in range(1, 18)) * 0.9 +
         sum(np.sin(k * ph * 0.5) / k for k in range(1, 12, 2)) * 0.35)
    y = pasa(pasa(y, 'bajo', 3600), 'alto', 380)
    trem = 1 - 0.14 * (0.5 + 0.5 * np.sin(2 * np.pi * 6.1 * t))
    return y * envolvente(len(t), 0.04, 0.12) * trem * vol * 0.32


def piano(m, dur, vol=1.0):
    t = tt(min(dur, 1.6) + 0.3)
    f = hz(m)
    y = np.zeros_like(t)
    for k in range(1, 9):
        if f * k > SR / 2 - 500:
            break
        y += np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k * k)) / k * np.exp(-t * (2.5 + k * 1.3))
    y[:60] += rng.uniform(-1, 1, 60) * 0.3
    return y * envolvente(len(t), 0.002, 0.08) * vol * 0.5


def cuerdas(ms, dur, vol=1.0):
    t = tt(dur + 0.6)
    y = np.zeros_like(t)
    for m in ms:
        for c in (-9, -3, 4, 10):
            y += serrucho(hz(m) * 2 ** (c / 1200), t, rng.uniform(0, 6))
    y = pasa(y, 'bajo', 2600)
    return y * envolvente(len(t), 0.35, 0.6) * vol * 0.05


def coro(ms, dur, vol=1.0):
    t = tt(dur + 0.8)
    y = np.zeros_like(t)
    for m in ms:
        for c in (-7, 0, 7):
            y += serrucho(hz(m) * 2 ** (c / 1200), t, rng.uniform(0, 6))
    y = pasa(y, 'banda', (600, 820)) * 1.4 + pasa(y, 'banda', (1050, 1300))
    return y * envolvente(len(t), 0.5, 0.8) * vol * 0.09


def guitarra(m, dur, vol=1.0, apagada=False):
    t = tt(dur + 0.05)
    y = sum(serrucho(hz(x), t, rng.uniform(0, 6)) for x in (m, m + 7, m + 12))
    y = np.tanh(y * 6)
    y = pasa(pasa(y, 'bajo', 3200), 'alto', 90)
    e = envolvente(len(t), 0.004, 0.05) * (np.exp(-t * 14) if apagada else np.exp(-t * 0.8))
    return y * e * vol * 0.22


def golpe_orquesta(ms, vol=1.0):
    t = tt(0.7)
    y = sum(serrucho(hz(m), t, rng.uniform(0, 6)) for m in ms)
    y = pasa(y, 'bajo', 3000) * np.exp(-t * 6) + pasa(rng.uniform(-1, 1, len(t)), 'banda', (200, 3000)) * np.exp(-t * 18) * 0.5
    return y * vol * 0.3


def subida(dur, vol=1.0):
    """el barrido de ruido que anuncia la vuelta al tema"""
    t = tt(dur)
    r = rng.uniform(-1, 1, len(t))
    y = np.zeros_like(t)
    tramos = 16
    for i in range(tramos):
        a, b = i * len(t) // tramos, (i + 1) * len(t) // tramos
        fc = 400 * (12 ** (i / tramos))
        y[a:b] = pasa(r, 'banda', (fc * 0.8, fc * 1.25), 1)[a:b]
    return y * (t / dur) ** 2 * vol


# ---------------- la partitura ----------------
def melodia(txt):
    """'e5:3 d5:1 r:4 ...' -> [(midi o None, dieciseisavos)]"""
    out = []
    for tok in txt.split():
        n, d = tok.split(':')
        out.append((None if n == 'r' else midi(n), float(d)))
    return out


def acorde(txt):
    """'a3 c4 e4' -> [57, 60, 64]"""
    return [midi(x) for x in txt.split()]


class Tema:
    def __init__(self, bpm, compases):
        self.bpm = bpm
        self.s16 = 60 / bpm / 4
        self.largo = compases * 16 * self.s16
        n = int((self.largo + 3) * SR)
        self.pistas = {k: np.zeros(n) for k in ('seco', 'sala', 'bateria', 'bajo', 'colchon')}

    def poner(self, pista, y, paso, vol=1.0):
        i = int(round(paso * self.s16 * SR))
        buf = self.pistas[pista]
        j = min(len(buf), i + len(y))
        buf[i:j] += y[:j - i] * vol

    def linea(self, inst, notas, desde, vol=1.0, pista='sala', largo=1.0, trans=0):
        p = desde
        for m, d in notas:
            if m is not None:
                self.poner(pista, inst(m + trans, d * self.s16 * largo), p, vol)
            p += d
        return p

    def bateria(self, patron, desde, compases, vol=1.0):
        """patron: dict pieza -> 16 caracteres ('x' fuerte, 'o' suave, '.' nada)"""
        piezas = {'k': bombo, 's': caja, 'h': platillo, 'H': lambda v: platillo(True, v),
                  'w': madera, 'c': crash}
        for c in range(compases):
            for pieza, fila in patron.items():
                for i, ch in enumerate(fila):
                    if ch in 'xo':
                        v = (1.0 if ch == 'x' else 0.55) * vol
                        self.poner('bateria', piezas[pieza](v), desde + c * 16 + i)

    def mezclar(self):
        P = self.pistas
        n = len(P['seco'])
        # el bombo aprieta el colchón y el bajo (bombeo)
        env = np.abs(P['bateria'])
        env = signal.lfilter([1 - 0.9993], [1, -0.9993], env)
        duck = 1 - np.clip(env / (env.max() + 1e-9) * 1.6, 0, 0.45)
        tt_ = np.arange(int(1.8 * SR)) / SR
        ir = rng.uniform(-1, 1, len(tt_)) * np.exp(-tt_ / 0.42)
        ir = pasa(ir, 'bajo', 5000)
        ir /= np.sqrt(np.sum(ir ** 2))
        envio = P['sala'] + P['colchon'] * duck * 0.8 + P['bateria'] * 0.12
        sala = signal.fftconvolve(envio, ir)[:n] * 0.5
        y = P['seco'] + P['sala'] + P['colchon'] * duck + P['bajo'] * duck + P['bateria'] + sala
        # el bucle: lo que sobra después del último compás vuelve al principio
        L = int(round(self.largo * SR))
        cola = y[L:]
        y = y[:L].copy()
        y[:len(cola)] += cola[:L]
        y = pasa(y, 'alto', 32)
        y /= np.sqrt(np.mean(y ** 2)) / 0.16            # nivel por RMS, no por pico
        y = np.tanh(y * 1.1) / np.tanh(1.1)
        return y * 0.93


HAB_BAJO = [(0, 3), (3, 1), (4, 2), (6, 2), (8, 3), (11, 1), (12, 2), (14, 2)]   # habanera


def bajo_habanera(T, raices, desde, vol=1.0, quinta=True):
    for c, r in enumerate(raices):
        for k, (p, d) in enumerate(HAB_BAJO):
            m = r + (7 if quinta and k in (2, 6) else 12 if k == 7 else 0)
            T.poner('bajo', bajo(m, d * T.s16, vol), desde + c * 16 + p)


def marcato(T, acordes, desde, vol=1.0, patron=(0, 4, 8, 12), largo=2):
    for c, ac in enumerate(acordes):
        for p in patron:
            for m in ac:
                T.poner('sala', piano(m, largo * T.s16, vol), desde + c * 16 + p)


# ---------------- los seis temas ----------------
def tema_menu():
    """menú: electrotango en la menor, 124. A: el tema. A': con cuerdas y contracanto. B: el puente."""
    T = Tema(124, 24)
    Am, Dm, E7, F, G, C, B7 = (acorde('a3 c4 e4'), acorde('d3 f3 a3'), acorde('e3 g#3 d4'), acorde('f3 a3 c4'),
                               acorde('g3 b3 d4'), acorde('c4 e4 g4'), acorde('b2 d#3 a3'))
    prog = [Am, Dm, E7, Am, Am, Dm, E7, Am]
    raices = [45, 38, 40, 45, 45, 38, 40, 45]
    tema = melodia('e5:3 d5:1 e5:2 a5:4 g5:2 f5:2 e5:2  f5:6 e5:2 d5:4 a4:4 '
                   'g#4:2 b4:2 d5:2 f5:2 e5:3 d5:1 c5:2 b4:2  a4:10 r:2 e5:2 g#5:2 '
                   'a5:3 g5:1 a5:2 c6:4 b5:2 a5:2 g5:2  f5:4 a5:4 d5:4 f5:4 '
                   'e5:3 f5:1 e5:2 d5:2 b4:3 c5:1 d5:2 g#4:2  a4:12 r:4')
    contra = melodia('c5:8 e5:8  d5:8 f5:8  b4:8 d5:8  c5:8 e5:8  e5:8 a5:8  a5:8 f5:8  g#5:8 e5:8  e5:16')
    duro = {'k': 'x..x.x..x..x.x..', 's': '....x.......x..o', 'h': 'x.o.x.o.x.o.x.oo', 'w': '......x.......x.'}
    suave = {'k': 'x.......x.......', 'w': '......x.......x.', 'h': '..o...o...o...o.'}
    # A (0-7): tema solo con piano y bajo
    marcato(T, prog, 0, 0.5)
    bajo_habanera(T, raices, 0, 0.8)
    T.bateria(suave, 0, 8, 0.8)
    T.poner('bateria', crash(0.8), 0)
    T.linea(bandoneon, tema, 0, 1.0, largo=0.95)
    # A' (8-15): todo el salón
    marcato(T, prog, 128, 0.55)
    bajo_habanera(T, raices, 128, 0.9)
    T.bateria(duro, 128, 8, 1.0)
    T.poner('bateria', crash(0.9), 128)
    for c, ac in enumerate(prog):
        T.poner('colchon', cuerdas([m + 12 for m in ac], 16 * T.s16), 128 + c * 16)
    T.linea(bandoneon, tema, 128, 1.0, largo=0.95)
    T.linea(bandoneon, contra, 128, 0.45, largo=0.9, trans=-12)
    # B (16-23): el puente, fa · sol · mi7 · la m, y la subida que devuelve al tema
    prog2 = [F, G, E7, Am, F, G, B7, E7]
    raices2 = [41, 43, 40, 45, 41, 43, 35, 40]
    puente = melodia('a5:4 g5:2 f5:2 e5:4 c5:4  b4:4 d5:2 g5:2 f5:4 d5:4  e5:2 g#5:2 b5:4 a5:2 g#5:2 f5:4  e5:8 c5:4 a4:4 '
                     'c6:4 b5:2 a5:2 g5:4 f5:4  d5:4 f5:2 b5:2 a5:4 g5:4  f#5:4 a5:4 b5:4 d#6:4  e6:8 d6:4 b5:4')
    marcato(T, prog2, 256, 0.55, patron=(0, 3, 6, 8, 12))
    bajo_habanera(T, raices2, 256, 0.9)
    T.bateria(duro, 256, 7, 0.95)
    T.bateria({'k': 'x.x.x.x.x.x.x.x.', 's': 'x.x.x.x.xxxxxxxx'}, 256 + 112, 1, 0.9)
    for c, ac in enumerate(prog2):
        T.poner('colchon', cuerdas([m + 12 for m in ac], 16 * T.s16), 256 + c * 16)
    T.linea(bandoneon, puente, 256, 1.0, largo=0.95)
    T.poner('seco', subida(16 * T.s16, 0.35), 256 + 112)
    return T


def tema_conventillo():
    """el conventillo: milonga rápida con guitarra saturada, en do menor, 140."""
    T = Tema(140, 24)
    Cm, Fm, G7, Ab, Bb, Eb = (acorde('c4 eb4 g4'), acorde('f3 ab3 c4'), acorde('g3 b3 f4'), acorde('ab3 c4 eb4'),
                              acorde('bb3 d4 f4'), acorde('eb4 g4 bb4'))
    prog = [Cm, Cm, Fm, G7, Cm, Ab, G7, Cm]
    raices = [36, 36, 41, 43, 36, 44, 43, 36]
    riff = melodia('c5:2 eb5:2 g5:2 c6:2 bb5:2 g5:2 ab5:2 g5:2  f5:2 eb5:2 d5:2 eb5:2 c5:4 g4:4 '
                   'ab4:2 c5:2 f5:2 ab5:2 g5:2 f5:2 eb5:2 d5:2  b4:2 d5:2 f5:2 ab5:2 g5:8 '
                   'c6:3 bb5:1 ab5:2 g5:2 f5:2 eb5:2 d5:2 c5:2  eb5:4 ab5:4 c6:4 eb6:4 '
                   'd6:2 c6:2 b5:2 ab5:2 g5:2 f5:2 d5:2 b4:2  c5:12 r:4')
    bateria = {'k': 'x..x..x.x..x..x.', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.', 'w': '.......x.......x'}
    for vuelta in range(3):
        d = vuelta * 128
        bajo_habanera(T, raices, d, 0.9)
        T.bateria(bateria, d, 8, 1.0 if vuelta else 0.85)
        T.poner('bateria', crash(0.9), d)
        for c, r in enumerate(raices):
            for p in (0, 3, 6, 8, 11, 14):
                T.poner('seco', guitarra(r + 12, 2 * T.s16, 0.9 if vuelta else 0.6, apagada=True), d + c * 16 + p)
        if vuelta == 1:
            for c, ac in enumerate(prog):
                T.poner('colchon', cuerdas([m + 12 for m in ac], 16 * T.s16, 0.9), d + c * 16)
        if vuelta == 2:
            # el solo: el bandoneón una octava abajo y la guitarra sostenida
            for c, r in enumerate(raices):
                T.poner('seco', guitarra(r + 12, 16 * T.s16, 0.5), d + c * 16)
            T.linea(bandoneon, riff, d, 0.9, trans=-12, largo=0.9)
            marcato(T, prog, d, 0.45, patron=(0, 3, 6, 8, 11, 14), largo=1)
        else:
            T.linea(bandoneon, riff, d, 1.0, largo=0.9)
    T.poner('seco', subida(8 * T.s16, 0.3), 376)
    return T


def tema_milonga():
    """el salón dorado: tango dramático en re menor, 112, con cuerdas y golpes de orquesta."""
    T = Tema(112, 20)
    Dm, Gm, A7, Bb, C, F = (acorde('d4 f4 a4'), acorde('g3 bb3 d4'), acorde('a3 c#4 g4'), acorde('bb3 d4 f4'),
                            acorde('c4 e4 g4'), acorde('f3 a3 c4'))
    prog = [Dm, Gm, A7, Dm, Bb, Gm, A7, Dm]
    raices = [38, 43, 45, 38, 46, 43, 45, 38]
    tema = melodia('a5:6 bb5:2 a5:4 f5:4  g5:6 a5:2 bb5:4 d5:4  c#5:2 e5:2 g5:2 bb5:2 a5:4 g5:2 e5:2  f5:4 e5:2 d5:2 a4:8 '
                   'd6:6 c6:2 bb5:4 f5:4  g5:4 bb5:4 d6:4 g5:4  e5:2 g5:2 bb5:2 c#6:2 e6:4 c#6:4  d6:12 r:4')
    for vuelta in range(2):
        d = vuelta * 128
        marcato(T, prog, d, 0.6, patron=(0, 4, 8, 12, 14) if vuelta else (0, 8), largo=3)
        bajo_habanera(T, raices, d, 0.85)
        T.bateria({'k': 'x...x...x...x...', 's': '............x...', 'w': '...x.......x....'}, d, 8, 0.8)
        for c, ac in enumerate(prog):
            T.poner('colchon', cuerdas([m + 12 for m in ac], 16 * T.s16, 1.2), d + c * 16)
            if c % 2 == 0:
                T.poner('seco', golpe_orquesta([m for m in ac] + [ac[0] - 12], 0.8), d + c * 16)
                T.poner('bateria', timbal(raices[c] - 12, 0.9), d + c * 16)
        T.linea(bandoneon, tema, d, 1.0, largo=0.97)
        if vuelta:
            T.linea(bandoneon, tema, d, 0.35, largo=0.97, trans=-12)
    # coda de cuatro compases: los golpes solos, y vuelve
    for c, (ac, r) in enumerate(zip([Bb, C, A7, A7], [46, 48, 45, 45])):
        for p in (0, 3, 6, 10, 12):
            T.poner('seco', golpe_orquesta(ac, 0.55), 256 + c * 16 + p)
        T.poner('bateria', timbal(r - 12, 0.8), 256 + c * 16)
        T.poner('colchon', cuerdas([m + 12 for m in ac], 16 * T.s16, 1.3), 256 + c * 16)
    bajo_habanera(T, [46, 48, 45, 45], 256, 0.9)
    T.bateria({'k': 'x..x.x..x..x.x..', 's': '....x.......x...', 'w': '...x.......x....'}, 256, 3, 0.9)
    T.bateria({'k': 'x.x.x.x.x.x.x.x.', 's': 'x.x.x.x.xxxxxxxx'}, 304, 1, 0.8)
    T.poner('seco', subida(16 * T.s16, 0.3), 304)
    return T


def tema_riachuelo():
    """el Riachuelo de noche: tango oscuro en mi menor, 100, niebla de cuerdas y bajo profundo."""
    T = Tema(100, 16)
    Em, C, B7, Am = acorde('e3 g3 b3'), acorde('c3 e3 g3'), acorde('b2 d#3 a3'), acorde('a2 c3 e3')
    prog = [Em, C, B7, Em, Am, C, B7, B7]
    raices = [40, 36, 35, 40, 33, 36, 35, 35]
    tema = melodia('b4:6 c5:2 b4:4 e5:4  g5:8 e5:4 c5:4  d#5:6 e5:2 f#5:4 a5:4  g5:12 r:4 '
                   'a5:6 g5:2 e5:4 c5:4  e5:4 g5:4 c6:4 b5:4  a5:4 f#5:4 d#5:4 b4:4  b4:12 r:4')
    for vuelta in range(2):
        d = vuelta * 128
        for c, ac in enumerate(prog):
            T.poner('colchon', cuerdas([m + 12 for m in ac], 16 * T.s16, 1.4), d + c * 16)
            T.poner('bajo', bajo(raices[c] - 12, 6 * T.s16, 1.0), d + c * 16)
            T.poner('bajo', bajo(raices[c] - 12, 2 * T.s16, 0.7), d + c * 16 + 10)
            for k, p in enumerate((0, 6, 10)):
                T.poner('sala', piano(ac[k % 3] + 24, 4 * T.s16, 0.35), d + c * 16 + p)
        T.bateria({'k': 'x.........x.....', 's': '........x.......', 'h': '..o...o...o...o.', 'w': '.....x.........x'},
                  d, 8, 0.85 if vuelta else 0.6)
        T.poner('bateria', crash(0.6), d)
        T.linea(bandoneon, tema, d, 1.0 if vuelta else 0.85, largo=1.0, trans=0 if vuelta else -12)
    T.poner('seco', subida(8 * T.s16, 0.25), 248)
    return T


def tema_jefe():
    """el jefe: tango metal en la menor, 150. Guitarras, coro, doble bombo."""
    T = Tema(150, 24)
    Am, Bb, G, E, F, Dm = (acorde('a3 c4 e4'), acorde('bb3 d4 f4'), acorde('g3 b3 d4'), acorde('e3 g#3 b3'),
                           acorde('f3 a3 c4'), acorde('d4 f4 a4'))
    prog = [Am, Bb, Am, E, Am, Bb, G, E]
    raices = [45, 46, 45, 40, 45, 46, 43, 40]
    tema = melodia('a5:2 e5:2 a5:2 c6:2 b5:2 a5:2 g#5:2 a5:2  bb5:4 a5:2 g5:2 f5:4 d5:4  a5:2 c6:2 e6:4 d6:2 c6:2 b5:4  g#5:8 e5:8 '
                   'a5:2 b5:2 c6:2 e6:2 d6:2 c6:2 b5:2 a5:2  bb5:2 d6:2 f6:4 e6:2 d6:2 bb5:4  b5:4 d6:4 g6:4 f6:4  e6:12 r:4')
    metal = {'k': 'xxxxxxxxxxxxxxxx', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.'}
    for vuelta in range(3):
        d = vuelta * 128
        T.poner('bateria', crash(1.0), d)
        if vuelta == 1:
            # el quiebre: sólo coro, bandoneón y el bombo en habanera
            for c, ac in enumerate(prog):
                T.poner('colchon', coro([m + 12 for m in ac], 16 * T.s16, 1.3), d + c * 16)
                T.poner('seco', golpe_orquesta(ac, 0.6), d + c * 16)
            bajo_habanera(T, raices, d, 0.9)
            T.bateria({'k': 'x..x.x..x..x.x..', 's': '............x...', 'w': '......x.......x.'}, d, 7, 0.9)
            T.bateria({'k': 'x.x.x.x.x.x.x.x.', 's': 'x.x.x.x.xxxxxxxx'}, d + 112, 1, 1.0)
            T.linea(bandoneon, tema, d, 0.9, trans=-12, largo=0.9)
            T.poner('seco', subida(16 * T.s16, 0.35), d + 112)
            continue
        for c, r in enumerate(raices):
            for p in range(0, 16, 2):
                T.poner('seco', guitarra(r, 2 * T.s16, 0.8, apagada=p not in (0, 6, 12)), d + c * 16 + p)
            T.poner('colchon', coro([m + 12 for m in prog[c]], 16 * T.s16, 0.9 if vuelta else 0.6), d + c * 16)
            for p in (0, 3, 6, 8, 11, 14):
                T.poner('bajo', bajo(r - 12, 1.5 * T.s16, 0.9), d + c * 16 + p)
        T.bateria(metal, d, 8, 0.8)
        T.linea(bandoneon, tema, d, 1.1, largo=0.9)
    return T


def tema_relicario():
    """el ¿continuás?: tango suspendido en fa, 84, con el tic-tac de la cuenta."""
    T = Tema(84, 8)
    F, Dm, Bb, C = acorde('f3 a3 c4'), acorde('d3 f3 a3'), acorde('bb2 d3 f3'), acorde('c3 e3 bb3')
    prog = [F, Dm, Bb, C, F, Dm, Bb, C]
    for c, ac in enumerate(prog):
        T.poner('colchon', cuerdas([m + 12 for m in ac], 16 * T.s16, 1.3), c * 16)
        T.poner('bajo', bajo(ac[0] - 12, 12 * T.s16, 0.8), c * 16)
        for p in range(0, 16, 2):
            T.poner('sala', piano(ac[(p // 2) % 3] + 24, 2 * T.s16, 0.28), c * 16 + p)
    T.bateria({'w': 'x...x...x...x...'}, 0, 8, 0.7)
    T.linea(bandoneon, melodia('c6:8 a5:8 d6:8 f5:8 bb5:8 d6:4 f6:4 e6:12 r:4 '
                               'c6:6 bb5:2 a5:8 f5:8 a5:8 d6:8 c6:4 bb5:4 g5:16'), 0, 0.8, largo=1.0)
    return T


TEMAS = {'menu': tema_menu, 'conventillo': tema_conventillo, 'milonga': tema_milonga,
         'riachuelo': tema_riachuelo, 'jefe': tema_jefe, 'relicario': tema_relicario}


def mp3(y, ruta):
    enc = lameenc.Encoder()
    enc.set_bit_rate(64)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2').tobytes()
    open(ruta, 'wb').write(enc.encode(pcm) + enc.flush())


if __name__ == '__main__':
    import json
    rmeta = os.path.join(SALIDA, 'musica.json')
    meta = json.load(open(rmeta)) if os.path.exists(rmeta) else {}
    for n in (sys.argv[1:] or list(TEMAS)):
        T = TEMAS[n]()
        y = T.mezclar()
        ruta = os.path.join(SALIDA, 'musica-%s.mp3' % n)
        mp3(y, ruta)
        meta[n] = round(len(y) / SR, 5)       # el largo exacto del bucle: el MP3 le agrega silencio al principio
        pico = 20 * np.log10(np.max(np.abs(y)) + 1e-9)
        rms = 20 * np.log10(np.sqrt(np.mean(y ** 2)) + 1e-9)
        print('%-12s %5.1f s  pico %5.1f dB  RMS %5.1f dB  %6.1f kB' % (n, len(y) / SR, pico, rms, os.path.getsize(ruta) / 1024))
    json.dump(meta, open(rmeta, 'w'))
