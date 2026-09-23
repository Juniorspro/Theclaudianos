"""Sintetiza los efectos de CABEZONES -> assets/cabezones/sfx.mp3 + sfx.json

Mismo formato que ARRABAL (un MP3 con todo en fila y un mapa {nombre: [[inicio, largo], ...]}),
y reusa sus capas (cae_tono, rafaga, pina, fuego, electro, agua, viento...). Lo nuevo: la pelota
de cuero, el palo que vibra, la red, el silbato del árbitro, la tribuna que grita gol o silba.
Uso: python3 efectos.py
"""
import os, sys, json
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'comun'))
import componer as B
import efectos as E
from efectos import SR, tt, pasa, ruido, cae_tono, rafaga, mezcla, listo, pina, silbido
C2 = B
SALIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'cabezones')
rng = np.random.default_rng(31)


def cuero(peso):
    """la pelota: un "pum" hueco (la cámara de aire) más el chasquido del cuero"""
    f0 = 260 - 90 * peso + rng.uniform(-20, 20)
    cuerpo = np.tanh(cae_tono(f0, f0 * 0.45, 0.09 + 0.1 * peso, 35) * (1.4 + peso))
    hueco = cae_tono(f0 * 2.3, f0 * 1.8, 0.06, 50) * 0.35
    chasq = rafaga(0.018 + 0.02 * peso, (1200, 7000), 170) * (0.7 + 0.4 * peso)
    return mezcla(cuerpo, hueco, chasq)


def patada():
    return listo(cuero(0.35))


def patada2():
    """el tiro fuerte: el cuero y un zumbido que se va"""
    y = mezcla(cuero(1.0), np.pad(silbido(0.6) * 0.6, (int(0.03 * SR), 0)))
    return listo(y)


def cabezazo():
    frente = np.tanh(cae_tono(170, 80, 0.12, 40) * 1.5) * 0.7
    return listo(mezcla(cuero(0.55), frente))


def poste():
    """el palo: metal que suena largo, con batido"""
    t = tt(1.1)
    f = rng.uniform(420, 520)
    y = sum(np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t * d) * a
            for r, d, a in ((1, 3.2, 1), (2.76, 5, 0.6), (5.4, 8, 0.4), (8.9, 12, 0.25), (1.013, 3.4, 0.7)))
    return listo(mezcla(y, cuero(0.8) * 0.8, rafaga(0.02, (2000, 9000), 200)))


def red():
    """la pelota entra y la red se infla: un fru fru de soga"""
    t = tt(0.6)
    y = pasa(ruido(len(t)), 'banda', (700, 5000)) * np.exp(-t * 6) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t))
    return listo(mezcla(y, cuero(0.3) * 0.4), 0.75)


def silbato(largo=0.35, veces=1):
    y = np.zeros(int((largo * veces + 0.1 * veces) * SR))
    for v in range(veces):
        t = tt(largo)
        trino = 1 + 0.035 * np.sign(np.sin(2 * np.pi * 30 * t))        # la bolita adentro del silbato
        f = 2750 * trino * (1 + 0.01 * np.sin(2 * np.pi * 5 * t))
        s = (np.sin(2 * np.pi * np.cumsum(f) / SR) + pasa(ruido(len(t)), 'banda', (2300, 3500)) * 0.3)
        s *= np.clip(t / 0.015, 0, 1) * np.clip((largo - t) / 0.03, 0, 1)
        i = int(v * (largo + 0.1) * SR)
        y[i:i + len(s)] += s
    return listo(y, 0.8)


def tribuna(dur, alegre=True):
    t = tt(dur)
    y = np.zeros(len(t))
    for k in range(60):
        f = rng.uniform(180, 420) * (1.5 if alegre else 1)
        d = rng.uniform(0.4, dur)
        tk = tt(d)
        fk = f * (1 + (0.25 if alegre else -0.15) * tk / d) * (1 + 0.01 * np.sin(2 * np.pi * 6 * tk))
        ph = np.cumsum(fk) / SR
        v = 2 * (ph % 1) - 1
        v = pasa(v, 'banda', (500, 1300) if alegre else (350, 900))
        v *= np.sin(np.pi * tk / d) ** 0.5
        i = int(rng.uniform(0, max(0.01, dur - d)) * SR)
        v = v[:len(y) - i]
        y[i:i + len(v)] += v * rng.uniform(0.3, 1)
    rumor = pasa(ruido(len(t)), 'banda', (300, 3000)) * np.sin(np.pi * t / dur) ** 0.4 * 1.2
    return y * 0.25 + rumor


def gol():
    """¡gol!: la tribuna explota, bombos y un golpe de platillo"""
    y = mezcla(tribuna(2.6), C2.crash(0.8)[:int(2.6 * SR)], C2.bombo(1.0), np.pad(C2.bombo(0.9), (int(0.35 * SR), 0)))
    return listo(y, 0.85)


def abucheo():
    y = tribuna(1.6, False)
    for k in range(6):                                                  # silbidos de bronca
        t = tt(rng.uniform(0.4, 0.8))
        s = np.sin(2 * np.pi * np.cumsum(rng.uniform(1800, 2600) * (1 - 0.1 * t)) / SR) * np.sin(np.pi * t / t[-1])
        i = int(rng.uniform(0, 0.7) * SR)
        s = s[:len(y) - i]
        y[i:i + len(s)] += s * 0.25
    return listo(y, 0.7)


def festejo():
    """copa ganada / subir de nivel: arpegio de bronces y aplausos"""
    y = np.zeros(int(1.8 * SR))
    for k, m in enumerate((67, 71, 74, 79)):
        t = tt(0.5 if k < 3 else 1.0)
        f = C2.hz(m)
        s = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 9)) * np.exp(-t * 3) * np.clip(t / 0.02, 0, 1)
        i = int(k * 0.11 * SR)
        y[i:i + len(s)] += s * 0.5
    ap = np.zeros_like(y)
    for k in range(90):
        i = int(rng.uniform(0.1, 1.6) * SR)
        a = pasa(ruido(int(0.02 * SR)), 'banda', (800, 4000)) * np.exp(-tt(0.02) * 200)
        ap[i:i + len(a)] += a * rng.uniform(0.2, 0.6)
    return listo(mezcla(y, ap), 0.8)


def rebote():
    return listo(cuero(0.12), 0.45)


def salto():
    t = tt(0.14)
    y = np.sin(2 * np.pi * np.cumsum(300 + 500 * t / 0.14) / SR) * np.exp(-t * 18) * 0.5
    return listo(mezcla(y, rafaga(0.05, (1500, 5000), 60) * 0.4), 0.6)


def super_():
    """la barra de poder llena y se usa: una subida con brillo"""
    t = tt(0.7)
    f = 200 * 2 ** (t / 0.7 * 3)
    y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * 0.4
    y = pasa(y, 'bajo', 5000) * np.clip(t / 0.05, 0, 1) * np.exp(-np.maximum(0, t - 0.5) * 12)
    return listo(mezcla(y, C2.crash(0.4)[:int(0.8 * SR)] * 0.5))


def hielo():
    y = np.zeros(int(0.6 * SR))
    for k in range(10):                                                 # cristales que se quiebran
        t = tt(0.1)
        f = rng.uniform(2500, 6000)
        p = np.sin(2 * np.pi * f * t) * np.exp(-t * 50)
        i = int(rng.uniform(0, 0.4) * SR)
        y[i:i + len(p)] += p * rng.uniform(0.2, 0.6)
    return listo(mezcla(y, rafaga(0.3, (3000, 9000), 12) * 0.5, cae_tono(900, 300, 0.2, 20) * 0.3))


def chancleta():
    """el chancletazo: goma contra cabeza"""
    plaf = rafaga(0.05, (400, 4000), 90) * 1.2
    goma = np.tanh(cae_tono(330, 140, 0.08, 50) * 2) * 0.6
    return listo(mezcla(plaf, goma, E.viento() * 0.3))


def onda():
    t = tt(0.9)
    grave = np.sin(2 * np.pi * np.cumsum(60 + 180 * np.exp(-t * 5)) / SR) * np.exp(-t * 3)
    return listo(mezcla(np.tanh(grave * 2), E.viento() * 0.7))


def clic():
    t = tt(0.06)
    return listo(mezcla(np.sin(2 * np.pi * np.cumsum(1200 - 500 * t / 0.06) / SR) * np.exp(-t * 60), rafaga(0.01, (3000, 8000), 400) * 0.3), 0.5)


def moneda():
    y = np.zeros(int(0.5 * SR))
    for k, f in enumerate((1976, 2637)):
        t = tt(0.4)
        s = (np.sign(np.sin(2 * np.pi * f * t)) * 0.3 + np.sin(2 * np.pi * f * t) * 0.5) * np.exp(-t * 9)
        i = int(k * 0.07 * SR)
        y[i:i + len(s)] += s
    return listo(pasa(y, 'bajo', 7000), 0.6)


def cofre():
    """el cofre: la tapa que cruje, y la luz que sale (arpegio)"""
    cruje = rafaga(0.3, (300, 1500), 8) * np.sign(np.sin(2 * np.pi * 40 * tt(0.3))) * 0.3
    y = np.zeros(int(1.4 * SR))
    for k, m in enumerate((72, 76, 79, 84, 88)):
        t = tt(0.8)
        f = C2.hz(m)
        s = (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * f * 2 * t) * 0.3) * np.exp(-t * 5)
        i = int((0.3 + k * 0.07) * SR)
        y[i:i + len(s)] += s * 0.4
    return listo(mezcla(cruje, y))


def chilena():
    """la chilena: el giro en el aire (silbido) y un tiro bien pesado"""
    s = silbido(0.9)
    y = mezcla(s * 0.7, np.pad(cuero(1.0) * 1.2, (int(0.18 * SR), 0)), np.pad(C2.crash(0.3)[:int(0.6 * SR)], (int(0.18 * SR), 0)))
    return listo(y)


EFECTOS = {
    'patada': [patada, patada, patada], 'patada2': [patada2, patada2], 'cabezazo': [cabezazo, cabezazo, cabezazo],
    'poste': [poste, poste], 'red': [red, red], 'silbato': [lambda: silbato(0.35)], 'silbatofin': [lambda: silbato(0.3, 3)],
    'gol': [gol], 'rebote': [rebote, rebote, rebote], 'salto': [salto, salto], 'super': [super_],
    'fuego': [E.fuego], 'rayo': [E.electro], 'hielo': [hielo], 'chancleta': [chancleta], 'onda': [onda],
    'soga': [E.cadena], 'clic': [clic], 'moneda': [moneda], 'cofre': [cofre], 'abucheo': [abucheo],
    'festejo': [festejo], 'chilena': [chilena],
}

if __name__ == '__main__':
    hueco = np.zeros(int(0.06 * SR))
    partes, mapa, pos = [hueco], {}, len(hueco)
    for nom, fs in EFECTOS.items():
        mapa[nom] = []
        for f in fs:
            y = f()
            mapa[nom].append([round(pos / SR, 5), round(len(y) / SR, 5)])
            partes += [y, hueco]
            pos += len(y) + len(hueco)
    todo = np.concatenate(partes)
    salida = os.path.join(SALIDA, 'sfx.mp3')
    enc = B.lameenc.Encoder()
    enc.set_bit_rate(96)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    open(salida, 'wb').write(enc.encode((np.clip(todo, -1, 1) * 32767).astype('<i2').tobytes()) + enc.flush())
    mapa['_largo'] = round(len(todo) / SR, 5)
    json.dump(mapa, open(os.path.join(SALIDA, 'sfx.json'), 'w'), separators=(',', ':'))
    print('%d efectos, %.1f s, %.1f kB' % (sum(len(v) for v in EFECTOS.values()), len(todo) / SR, os.path.getsize(salida) / 1024))
