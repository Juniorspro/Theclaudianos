import numpy as np, sys, math
from bucle import *
from entregar import guardar_clip
NPZ = 'np/cs2tp_a.npz'
nom, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
for cq in (True, False):
    try:
        p = preparar(NPZ, a, b, lados=False, camara_quieta=cq)
        Jf, Ef, info = bucle_multi([p], 'adelante', afinar=True)
        break
    except Exception as e: print('camara_quieta', cq, 'falla:', e)
print(nom, 'ciclos', info['n_ciclos'], 'dur', round(info['dur_ciclo'], 3), 'V', np.round(info['V'], 2), 'disp', info['dispersion_ciclos_m'])
d = guardar_clip(nom, Jf, Ef, info['fps_ciclo'], True, info['V'],
    fuente='https://www.bilibili.com/video/BV1WvER6kErG («CS2全动作演示（第三人称）»: agente de CS2 visto por otro jugador), cuadros %d-%d a 30 fps' % (a, b),
    calidad='animación de locomoción en tercera persona del propio CS2 (MediaPipe); %d ciclos promediados' % info['n_ciclos'], apoyo=info['apoyo'])
print(d['metricas'], d['velocidad_mps'], len(d['cuadros']))
