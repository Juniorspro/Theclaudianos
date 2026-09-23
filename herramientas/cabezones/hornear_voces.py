"""Hornea las voces del relator (WAV de Higgsfield seed_audio) en un solo MP3 con mapa, como los
efectos: assets/cabezones/voces.mp3 + voces.json {nombre: [[inicio, largo], ...]}.
Los nombres con número al final (gol0, gol1…) son variantes del mismo grito.
Uso: python3 hornear_voces.py <carpeta_wav>
"""
import os, sys, json, re, wave
import numpy as np
from scipy import signal
import lameenc

SR = 32000
CRUDO = sys.argv[1]
SAL = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'cabezones')
hueco = np.zeros(int(0.08 * SR))
partes, mapa, pos = [hueco], {}, len(hueco)
for f in sorted(os.listdir(CRUDO)):
    if not f.endswith('.wav'):
        continue
    w = wave.open(os.path.join(CRUDO, f))
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    x = x.reshape(-1, w.getnchannels()).mean(axis=1)
    x = signal.resample_poly(x, SR, w.getframerate())
    env = np.abs(x) > 0.02                           # sin silencio adelante ni atrás
    i0 = max(0, np.argmax(env) - 400); i1 = len(x) - np.argmax(env[::-1]) + 1600
    x = x[i0:i1]
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.92
    x[-600:] *= np.linspace(1, 0, 600)
    nom = re.sub(r'\d+$', '', f[:-4])
    mapa.setdefault(nom, []).append([round(pos / SR, 5), round(len(x) / SR, 5)])
    partes += [x, hueco]
    pos += len(x) + len(hueco)
todo = np.concatenate(partes)
enc = lameenc.Encoder(); enc.set_bit_rate(64); enc.set_in_sample_rate(SR); enc.set_channels(1); enc.set_quality(2)
open(os.path.join(SAL, 'voces.mp3'), 'wb').write(enc.encode((np.clip(todo, -1, 1) * 32767).astype('<i2').tobytes()) + enc.flush())
mapa['_largo'] = round(len(todo) / SR, 5)
json.dump(mapa, open(os.path.join(SAL, 'voces.json'), 'w'), separators=(',', ':'))
print(len(mapa) - 1, 'voces,', round(len(todo) / SR, 1), 's,', os.path.getsize(os.path.join(SAL, 'voces.mp3')) // 1024, 'kB')
