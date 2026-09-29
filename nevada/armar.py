#!/usr/bin/env python3
"""Arma juegos-pc/ArenaNevada.html juntando nevada/plantilla.html con sus fuentes.

Cada {{ruta}} de la plantilla se reemplaza por el contenido de nevada/<ruta>, tal cual.
Uso: python3 nevada/armar.py [salida]
"""
import os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, '..', 'juegos-pc', 'ArenaNevada.html')


def leer(ruta):
    with open(os.path.join(AQUI, ruta), encoding='utf-8', newline='') as f:
        return f.read()


def fuente(m):
    ruta = m.group(1)
    txt = leer(ruta)
    cierre = '</style' if ruta.endswith('.css') else '</script'
    if cierre in txt.lower():
        sys.exit(f'{ruta} trae "{cierre}" suelto: escapalo')
    return txt


html = re.sub(r'\{\{([^}]+)\}\}', fuente, leer('plantilla.html'))
with open(SALIDA, 'w', encoding='utf-8', newline='') as f:
    f.write(html)
print(f'{os.path.relpath(SALIDA)}: {len(html.encode()) / 1e6:.2f} MB')
