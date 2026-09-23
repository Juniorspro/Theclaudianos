"""Sintetiza los efectos de sonido de la pelea de ARRABAL -> assets/arrabal/sfx.mp3 + sfx.json

Un solo MP3 con todos los efectos uno detrás del otro (60 ms de silencio entre cada uno) y un
mapa {nombre: [[inicio, largo], ...]} con varias variantes por nombre: lo que se repite no cansa.
Cada impacto se arma por capas: el cuerpo (un seno que cae de tono), el chasquido (ruido corto y
brillante), el cachetazo (un clic agudo) y, en los pesados, el crujido (granitos de ruido).
Uso: python3 efectos.py
"""
import json, os
import numpy as np
from scipy import signal
import componer as C

SR = C.SR
rng = np.random.default_rng(11)
tt, pasa = C.tt, C.pasa


def ruido(n):
    return rng.uniform(-1, 1, n)


def cae_tono(f0, f1, dur, caida):
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t * caida)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (4.5 / dur))


def rafaga(dur, banda, caida):
    t = tt(dur)
    return pasa(ruido(len(t)), 'banda', banda) * np.exp(-t * caida)


def sala_corta(y, largo=0.25, mezcla=0.14):
    t = tt(largo)
    ir = pasa(ruido(len(t)), 'bajo', 5000) * np.exp(-t / (largo / 5))
    ir /= np.sqrt(np.sum(ir ** 2))
    return y + signal.fftconvolve(y, ir)[:len(y)] * mezcla


def mezcla(*capas):
    n = max(len(c) for c in capas)
    y = np.zeros(n + int(0.3 * SR))
    for c in capas:
        y[:len(c)] += c
    return y


def listo(y, pico=0.89):
    y = sala_corta(y)
    # se corta el silencio del final
    env = np.abs(y)
    fin = len(y) - np.argmax(env[::-1] > 0.002 * env.max())
    y = y[:max(fin, 200)]
    y[-200:] *= np.linspace(1, 0, 200)
    return y / (np.max(np.abs(y)) + 1e-9) * pico


# ---------------- los golpes ----------------
def pina(peso):
    """peso 0 (jab) .. 1 (golpe pesado)"""
    f0 = 190 - 100 * peso + rng.uniform(-15, 15)
    f1 = 80 - 45 * peso
    dur = 0.08 + 0.26 * peso
    cuerpo = np.tanh(cae_tono(f0, f1, dur, 40 - 20 * peso) * (1.6 + 2 * peso)) * (0.8 + 0.4 * peso)
    chasq = rafaga(0.02 + 0.03 * peso, (1400, 6500), 160 - 60 * peso) * (0.9 - 0.2 * peso)
    cachet = pasa(ruido(int(0.004 * SR)), 'alto', 3000) * 0.9
    golpe_sordo = rafaga(0.06 + 0.1 * peso, (120, 900), 40) * 0.6 * peso
    capas = [cuerpo, chasq, cachet, golpe_sordo]
    if peso > 0.6:           # el crujido de los golpes que duelen
        cr = np.zeros(int(0.08 * SR))
        for _ in range(5):
            i = rng.integers(0, len(cr) - 200)
            cr[i:i + 160] += rafaga(160 / SR, (1800, 7000), 400)[:160] * rng.uniform(0.3, 0.7)
        capas.append(cr)
    return listo(mezcla(*capas))


def patada():
    """más cuerpo en los medios (el empeine contra la ropa) y el chasquido de la tela"""
    base = cae_tono(150 + rng.uniform(-15, 15), 55, 0.18, 30)
    thwack = rafaga(0.09, (300, 1400), 45) * 0.9
    tela = rafaga(0.03, (3000, 9000), 120) * 0.5
    return listo(mezcla(np.tanh(base * 2.4) * 0.9, thwack, tela))


def madera():
    """bastón o palo contra el cuerpo: tres resonancias de madera, cortas"""
    t = tt(0.16)
    f = rng.uniform(0.9, 1.1)
    res = sum(np.sin(2 * np.pi * fr * f * t) * np.exp(-t * d) * a
              for fr, d, a in ((690, 38, 1.0), (1130, 50, 0.6), (1870, 70, 0.4), (2600, 90, 0.25)))
    clic = rafaga(0.01, (2000, 8000), 300) * 0.8
    return listo(mezcla(res * 0.8, clic, cae_tono(160, 70, 0.1, 40) * 0.6))


def metal():
    """llave inglesa, ancla, arpón: parciales inarmónicos que suenan largo"""
    t = tt(0.7)
    f = rng.uniform(560, 760)
    campana = sum(np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * np.exp(-t * d) * a
                  for r, d, a in ((1, 5, 1.0), (2.76, 7, 0.55), (5.40, 10, 0.35), (8.93, 14, 0.2)))
    return listo(mezcla(campana * 0.5, np.tanh(cae_tono(140, 60, 0.14, 35) * 2) * 0.7, rafaga(0.015, (2500, 9000), 250) * 0.7))


def garra():
    """zarpazo: tres rasguños rápidos que suben, y el desgarro"""
    y = np.zeros(int(0.2 * SR))
    for k in range(3):
        d = 0.05
        t = tt(d)
        r = ruido(len(t))
        seg = np.concatenate([pasa(r[max(0, i - 256):i + 80], 'banda', (1500 + 5000 * i / len(t) * (0.6 + 0.2 * k),
                                                                       1900 + 6000 * i / len(t)))[-len(r[i:i + 80]):]
                              for i in range(0, len(t), 80)])[:len(t)]
        seg *= np.sin(np.pi * t / d) ** 2
        i0 = int(k * 0.035 * SR)
        y[i0:i0 + len(seg)] += seg * (0.7 + 0.15 * k)
    return listo(mezcla(y, cae_tono(170, 70, 0.1, 40) * 0.5))


def bloqueo():
    """contra los antebrazos: sordo, con un taco de cuero y un clac chiquito"""
    sordo = pasa(np.tanh(cae_tono(210, 110, 0.07, 60) * 2), 'bajo', 1200)
    cuero = rafaga(0.025, (600, 2500), 140) * 0.7
    clac = rafaga(0.008, (3500, 8000), 400) * 0.4
    return listo(mezcla(sordo, cuero, clac), 0.8)


def silbido(peso):
    """el aire que corta el golpe: una banda de ruido que sube y baja"""
    dur = 0.13 + 0.14 * peso
    t = tt(dur)
    r = ruido(len(t))
    y = np.zeros_like(t)
    paso = 64
    for i in range(0, len(t), paso):
        x = i / len(t)
        fc = (700 - 250 * peso) + (2200 - 600 * peso) * np.sin(np.pi * x)
        y[i:i + paso] = pasa(r[max(0, i - 256):i + paso], 'banda', (fc * 0.75, fc * 1.3), 1)[-min(paso, len(t) - i):]
    y *= np.sin(np.pi * t / dur) ** 1.5
    return listo(y, 0.8)


def critico():
    t = tt(0.9)
    ting = (np.sin(2 * np.pi * 2800 * t) * 0.6 + np.sin(2 * np.pi * 4210 * t) * 0.35) * np.exp(-t * 6)
    return listo(mezcla(ting * 0.5, pina(0.9) * 0.9))


def ko():
    t = tt(1.6)
    grave = np.sin(2 * np.pi * np.cumsum(28 + 40 * np.exp(-t * 3)) / SR) * np.exp(-t * 2.2)
    rumor = pasa(ruido(len(t)), 'bajo', 700) * np.exp(-t * 2.5) * 0.7
    escombro = np.zeros(len(t))
    for _ in range(14):
        i = rng.integers(int(0.1 * SR), int(0.9 * SR))
        g = rafaga(0.03, (800, 5000), 150)
        escombro[i:i + len(g)] += g * rng.uniform(0.1, 0.35)
    y = mezcla(np.tanh(grave * 2.5), rumor, escombro, pina(1.0))
    return listo(sala_corta(y, 1.2, 0.35))


def caida():
    """el cuerpo contra el piso: dos golpes (el torso y después los brazos) y el roce"""
    a = np.tanh(cae_tono(95, 40, 0.3, 20) * 2.2)
    b = np.tanh(cae_tono(120, 55, 0.18, 30) * 1.8) * 0.6
    roce = rafaga(0.3, (400, 3000), 12) * 0.25
    y = mezcla(a, roce)
    i = int(0.11 * SR)
    y[i:i + len(b)] += b
    return listo(y)


def aterriza():
    return listo(mezcla(np.tanh(cae_tono(130, 60, 0.1, 40) * 1.6), rafaga(0.06, (500, 3000), 60) * 0.4), 0.7)


def fuego():
    t = tt(0.55)
    rugido = pasa(ruido(len(t)), 'bajo', 1500) * np.sin(np.pi * t / 0.55) ** 0.7
    chisporroteo = np.zeros(len(t))
    for _ in range(40):
        i = rng.integers(0, len(t) - 100)
        chisporroteo[i:i + 60] += pasa(ruido(60), 'alto', 3000) * rng.uniform(0.2, 0.8)
    return listo(mezcla(rugido, chisporroteo * 0.5, pina(0.4) * 0.5))


def electro():
    t = tt(0.32)
    f = 180 + 900 * np.abs(np.sin(2 * np.pi * 37 * t)) * rng.uniform(0.6, 1.4)
    zumbido = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 7)
    chispas = pasa(ruido(len(t)), 'alto', 4000) * (rng.uniform(0, 1, len(t)) > 0.97) * 1.5
    return listo(mezcla(pasa(zumbido, 'bajo', 5000) * 0.6, chispas, pina(0.3) * 0.5))


def agua():
    t = tt(0.4)
    salpicon = rafaga(0.4, (600, 6000), 9)
    burbujas = np.zeros(len(t))
    for _ in range(8):
        i = rng.integers(0, int(0.3 * SR))
        d = tt(0.04)
        b = np.sin(2 * np.pi * np.cumsum(rng.uniform(500, 900) * (1 + 3 * d / 0.04)) / SR) * np.exp(-d * 60)
        burbujas[i:i + len(b)] += b * 0.3
    return listo(mezcla(salpicon, burbujas, pina(0.3) * 0.5))


def viento():
    t = tt(0.5)
    r = ruido(len(t))
    y = pasa(r, 'banda', (500, 2600), 2) * np.sin(np.pi * t / 0.5) ** 1.2
    return listo(mezcla(y, pina(0.35) * 0.45), 0.8)


def cadena():
    y = np.zeros(int(0.3 * SR))
    for k in range(7):
        t = tt(0.06)
        f = rng.uniform(2200, 3600)
        p = (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * f * 1.41 * t) * 0.5) * np.exp(-t * 70)
        i = int((k * 0.03 + rng.uniform(0, 0.01)) * SR)
        y[i:i + len(p)] += p * rng.uniform(0.4, 0.8)
    return listo(mezcla(y, pina(0.3) * 0.6))


def paso_rapido():
    """el dash: un soplido corto y la suela que raspa"""
    return listo(mezcla(silbido(0.3) * 0.8, rafaga(0.08, (1500, 6000), 40) * 0.3), 0.7)


EFECTOS = {
    'golpe1': [lambda: pina(0.1), lambda: pina(0.15), lambda: pina(0.2)],
    'golpe2': [lambda: pina(0.45), lambda: pina(0.5), lambda: pina(0.55)],
    'golpe3': [lambda: pina(0.85), lambda: pina(0.95), lambda: pina(1.0)],
    'patada': [patada, patada, patada],
    'madera': [madera, madera, madera],
    'metal': [metal, metal],
    'garra': [garra, garra],
    'bloqueo': [bloqueo, bloqueo, bloqueo],
    'silbido': [lambda: silbido(0.1), lambda: silbido(0.2), lambda: silbido(0.3)],
    'silbido2': [lambda: silbido(0.8), lambda: silbido(0.9)],
    'critico': [critico],
    'ko': [ko],
    'caida': [caida, caida],
    'cae': [aterriza, aterriza],
    'fuego': [fuego, fuego],
    'electro': [electro, electro],
    'agua': [agua, agua],
    'viento': [viento],
    'cadena': [cadena, cadena],
    'dash': [paso_rapido, paso_rapido],
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
    salida = os.path.join(C.SALIDA, 'sfx.mp3')
    enc = C.lameenc.Encoder()
    enc.set_bit_rate(96)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    open(salida, 'wb').write(enc.encode((np.clip(todo, -1, 1) * 32767).astype('<i2').tobytes()) + enc.flush())
    mapa['_largo'] = round(len(todo) / SR, 5)
    json.dump(mapa, open(os.path.join(C.SALIDA, 'sfx.json'), 'w'), separators=(',', ':'))
    n = sum(len(v) for k, v in mapa.items() if k != '_largo')
    print('%d efectos (%d nombres), %.1f s, %.1f kB' % (n, len(EFECTOS), len(todo) / SR, os.path.getsize(salida) / 1024))
