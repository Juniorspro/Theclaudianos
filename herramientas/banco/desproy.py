#!/usr/bin/env python3
"""Des-proyecta el contorno de un cristal medido en la hoja (salida de region.js) al plano del lente.
   uso: desproy.py "salida de region.js" [yCruz] [cx] [mmx] [mmy] [rL]
   Vista: la camara a -38,6 grados (orto). El lente mira a su propio azimut (el de su centro).
   Da el azimut del centro, y los puntos (u hacia fuera, v desde la linea de la cruz) en metros."""
import sys, math
filas = [(int(a.split(':')[0]), *map(int, a.split(':')[1].split('-'))) for a in sys.argv[1].split()]
yc = float(sys.argv[2]) if len(sys.argv) > 2 else 549
cx = float(sys.argv[3]) if len(sys.argv) > 3 else 454
mx = float(sys.argv[4]) if len(sys.argv) > 4 else 0.84e-3
my = float(sys.argv[5]) if len(sys.argv) > 5 else 0.854e-3
rL = float(sys.argv[6]) if len(sys.argv) > 6 else 0.35
fc = -38.6
xs = [((l + r) / 2 - cx) * mx for _, l, r in filas]
anchos = [(r - l) for _, l, r in filas]
# el centro: el punto medio de la fila mas ancha
k = anchos.index(max(anchos)); xm = xs[k]
s = xm / rL; fL = math.degrees(math.asin(max(-1, min(1, s)))) + fc
co = math.cos(math.radians(fL - fc))
print('az centro %.1f  (cos %.3f)' % (fL, co))
izq, der = [], []
for y, l, r in filas:
    v = (yc - y) * my
    ul = ((l - cx) * mx - xm) / co; ur = ((r - cx) * mx - xm) / co
    # cercano: la izquierda de la pantalla es hacia fuera -> u_fuera = -u
    izq.append((round(-ul, 4), round(v, 4))); der.append((round(-ur, 4), round(v, 4)))
pts = izq + der[::-1]
print('ancho %.4f alto %.4f' % (max(p[0] for p in pts) - min(p[0] for p in pts), max(p[1] for p in pts) - min(p[1] for p in pts)))
print('[' + ', '.join('[%.4f, %.4f]' % p for p in pts) + ']')
