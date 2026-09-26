"""Música de DUELO DE ARCOS -> assets/duelo/musica-menu.mp3, musica-partido.mp3 + musica.json
Samba de playa: surdo, tamborim, agogó, ganzá, cavaquinho y bronces. Usa los instrumentos de
CABEZONES (que usa el sintetizador base de herramientas/comun) y su mezcla estéreo.
(La música de Rezona se pidió primero: NOIZ_FAILED, como en las vueltas anteriores.)
Uso: python3 componer.py
"""
import os, sys, json
import numpy as np
import importlib.util
# el de CABEZONES se carga con otro nombre: los tres módulos se llaman componer.py
_esp = importlib.util.spec_from_file_location('componer_cab', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cabezones', 'componer.py'))
CB = importlib.util.module_from_spec(_esp); _esp.loader.exec_module(CB)
SR, tt, pasa, hz, bombo, caja, crash, bajo, piano, melodia, acorde, Tema = CB.SR, CB.tt, CB.pasa, CB.hz, CB.bombo, CB.caja, CB.crash, CB.bajo, CB.piano, CB.melodia, CB.acorde, CB.Tema
bronce, sinte, palmas, voces, mezclar_estereo, mp3_estereo = CB.bronce, CB.sinte, CB.palmas, CB.voces, CB.mezclar_estereo, CB.mp3_estereo
SALIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'duelo')
rng = np.random.default_rng(41)

def surdo(vol=1.0, abierto=True):
    t = tt(0.6)
    f = 58 + 40 * np.exp(-t * 18)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (5 if abierto else 14))
    return np.tanh(y * 1.8) * vol

def tamborim(vol=1.0):
    t = tt(0.07)
    y = pasa(rng.uniform(-1, 1, len(t)), 'banda', (1800, 6000)) * np.exp(-t * 60) + np.sin(2 * np.pi * 820 * t) * np.exp(-t * 70) * 0.6
    return y * vol * 0.8

def agogo(vol=1.0, alto=True):
    t = tt(0.3)
    f = 980 if alto else 740
    y = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 14)
    return y * vol * 0.35

def ganza(vol=1.0):
    t = tt(0.05)
    return pasa(rng.uniform(-1, 1, len(t)), 'alto', 6000) * np.exp(-t * 70) * vol * 0.6

def cavaco(m, dur, vol=1.0):
    """cuerdas pulsadas: un piano corto y brillante"""
    y = piano(m, min(dur, 0.18), vol)
    return pasa(y, 'alto', 300) * 1.1

def percu(T, patron, desde, compases, vol=1.0):
    piezas = {'S': surdo, 's': lambda v: surdo(v, False), 't': tamborim, 'a': agogo, 'A': lambda v: agogo(v, False),
              'g': ganza, 'k': bombo, 'n': caja, 'p': palmas, 'c': crash}
    for c in range(compases):
        for pieza, fila in patron.items():
            for i, ch in enumerate(fila):
                if ch in 'xo':
                    T.poner('bateria', piezas[pieza]((1.0 if ch == 'x' else 0.55) * vol), desde + c * 16 + i)

def tema_menu():
    """menú: samba-funk en re mayor, 104. Cavaquinho, bajo con síncopa y un gancho de bronces."""
    T = Tema(104, 16)
    D, Bm, G, A7, Em = acorde('d4 f#4 a4'), acorde('b3 d4 f#4'), acorde('g3 b3 d4'), acorde('a3 c#4 g4'), acorde('e4 g4 b4')
    prog = [D, Bm, G, A7, D, Bm, Em, A7] * 2
    raices = [38, 35, 43, 45, 38, 35, 40, 45] * 2
    base = {'S': '....x.......x...', 's': 'x.......x.......', 't': 'x.xx.x.xx.x.x.xx', 'g': 'xoxoxoxoxoxoxoxo', 'a': 'x..x..x.....x...', 'A': '......x..x......'}
    percu(T, base, 0, 16, 0.75)
    for c, r in enumerate(raices):
        for p, d, s in ((0, 3, 0), (3, 1, 7), (6, 2, 12), (8, 3, 0), (11, 2, 7), (14, 2, 10)):
            T.poner('bajo', bajo(r + s, d * T.s16, 0.8), c * 16 + p)
    for c, ac in enumerate(prog):
        for p in (0, 3, 6, 8, 10, 13):
            for m in ac:
                T.poner('sala', cavaco(m + 12, 2 * T.s16, 0.35), c * 16 + p)
    T.linea(bronce, melodia('a5:2 r:1 a5:1 f#5:2 d5:2 e5:3 f#5:1 e5:4  d5:2 r:1 d5:1 b4:2 d5:2 f#5:8 '
                            'g5:2 r:1 g5:1 f#5:2 e5:2 d5:3 e5:1 f#5:4  e5:4 c#5:4 a4:8 '
                            'a5:2 r:1 a5:1 f#5:2 d5:2 e5:3 f#5:1 e5:4  d5:2 r:1 d5:1 b4:2 d5:2 f#5:8 '
                            'b5:2 a5:2 g5:2 f#5:2 e5:2 f#5:2 g5:4  a5:4 c#6:4 d6:8'), 0, 0.8)
    for c in (8, 12):
        T.poner('sala', voces([62, 66], 6 * T.s16, 0.6, 'o'), c * 16)
    T.poner('bateria', crash(0.5), 0)
    return T

def tema_partido():
    """partido: batucada en la menor, 132. Surdos que empujan, tamborines, sinte y bronces cortos."""
    T = Tema(132, 16)
    Am, F, G, E = acorde('a3 c4 e4'), acorde('f3 a3 c4'), acorde('g3 b3 d4'), acorde('e3 g#3 b3')
    prog = [Am, Am, F, G, Am, Am, F, E] * 2
    raices = [45, 45, 41, 43, 45, 45, 41, 40] * 2
    bat = {'S': '....x.......x...', 's': 'x.......x.o.....', 't': 'xxx.xx.xxx.xx.x.', 'g': 'xoxoxoxoxoxoxoxo', 'n': '..o...o...o..oo.', 'a': 'x.x...x.x...x...'}
    percu(T, bat, 0, 16, 0.85)
    percu(T, {'p': '....x.......x...'}, 64, 8, 0.6)
    for c, r in enumerate(raices):
        for p in (0, 3, 6, 8, 11, 14):
            T.poner('bajo', bajo(r + (12 if p in (6, 14) else 0), 2 * T.s16, 0.75), c * 16 + p)
    for c, ac in enumerate(prog):
        for p in (2, 6, 10, 14):
            for m in ac:
                T.poner('sala', sinte(m + 12, 1 * T.s16, 0.4), c * 16 + p)
    T.linea(bronce, melodia('e5:2 e5:2 r:2 a5:2 g5:2 e5:2 r:4  c5:2 c5:2 r:2 f5:2 e5:2 c5:2 r:4 '
                            'd5:2 d5:2 r:2 g5:2 f5:2 d5:2 r:4  b4:2 d5:2 e5:4 g#5:4 b5:4 '
                            'e5:2 e5:2 r:2 a5:2 g5:2 e5:2 r:4  c5:2 c5:2 r:2 f5:2 a5:2 c6:2 r:4 '
                            'b5:2 a5:2 g5:2 f5:2 e5:2 d5:2 c5:2 b4:2  a4:4 e5:4 a5:8'), 64, 0.8)
    T.poner('bateria', crash(0.5), 64)
    return T

if __name__ == '__main__':
    meta = {}
    for n, f in (('menu', tema_menu), ('partido', tema_partido)):
        y = mezclar_estereo(f())
        ruta = os.path.join(SALIDA, 'musica-%s.mp3' % n)
        mp3_estereo(y, ruta)
        meta[n] = round(len(y) / SR, 5)
        print(n, round(len(y) / SR, 1), 's', os.path.getsize(ruta) // 1024, 'kB')
    meta['hinchada'] = 16.0
    json.dump(meta, open(os.path.join(SALIDA, 'musica.json'), 'w'))
