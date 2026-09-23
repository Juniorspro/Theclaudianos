"""Arma la tabla ANIM_AOS de BRONCA con poses calcadas de videos de Anger of Stick 5.

Cada golpe usa cuadros revisados a ojo (hoja de verificación: el cuadro original al lado del palito
rearmado sólo con los números). Lo que el video no deja ver (un brazo detrás del torso) sale de la guardia.
    python3 golpes_aos.py DIR_CALCOS > anim_aos.js
"""
import json, sys, numpy as np
import exportar_golpes as X

D = sys.argv[1] if len(sys.argv) > 1 else '.'
C764 = D + '/c/7644216474915163412_calco.json'   # combo a puño: directo, estocada, gancho arriba, guardia
C709 = D + '/c/7091473179801029914_calco.json'   # patada lateral
C762 = D + '/c/7625425895171345685_calco.json'   # patada alta
C029 = D + '/g/029_calco.json'                   # carrera y guardia
CLAVES = ('cad', 'cue', 'cab', 'manoA', 'manoB', 'pieA', 'pieB')

def pose(clip, k, miembro, a=None, b=None):
    r = X.mover(clip, a if a is not None else k, b if b is not None else k, k, miembro)
    return r['cuadros'][k]

def promedio(ps):
    o = {}
    for c in CLAVES:
        v = [p[c] for p in ps if c in p]
        if v: o[c] = np.median(v, 0).tolist()
    return o

def completar(p, base):
    o = {c: p.get(c, base[c]) for c in CLAVES}
    return {c: [round(o[c][0], 3), round(o[c][1], 3)] for c in CLAVES}

# guardia: piernas y el puño que asoma, de dos clips; el puño de atrás pegado a la cara
g = promedio([pose(C764, k, 'mano') for k in (1201, 1203, 1205, 1207)] + [pose(C029, 300, 'mano')])
g.setdefault('manoB', [g['manoA'][0] - 0.12, g['manoA'][1] - 0.05])
GUARDIA = completar(g, g)

def espejo_pies(p):
    q = dict(p); q['pieA'], q['pieB'] = p['pieB'], p['pieA']; q['manoA'], q['manoB'] = p['manoB'], p['manoA']; return q

ANIM = {'guardia': GUARDIA}
# directo: de la guardia al brazo estirado a la altura del hombro (cuadro 620), se sostiene y vuelve
jab = completar(pose(C764, 620, 'mano', 619, 621), GUARDIA)
ANIM['jab'] = [[0, GUARDIA], [0.3, jab], [0.62, jab], [1, GUARDIA]]
# estocada: la piña baja con las piernas bien abiertas (611-613)
cr = completar(promedio([pose(C764, k, 'mano', 611, 614) for k in (611, 613)]), GUARDIA)
ANIM['cross'] = [[0, GUARDIA], [0.38, cr], [0.66, cr], [1, GUARDIA]]
# gancho arriba: se agacha con el puño adelante (626) y sube con el brazo recto (631)
g0 = completar(pose(C764, 626, 'mano', 626, 631), GUARDIA)
g1 = completar(pose(C764, 631, 'mano', 626, 631), GUARDIA)
ANIM['gancho'] = [[0, GUARDIA], [0.25, g0], [0.5, g1], [0.8, g1], [1, GUARDIA]]
# patada alta (4984-4985)
p1 = completar(promedio([pose(C762, k, 'pie', 4982, 4986) for k in (4984, 4985)]), GUARDIA)
ANIM['patada'] = [[0, GUARDIA], [0.32, p1], [0.64, p1], [1, GUARDIA]]
# patada lateral con el cuerpo tirado atrás (105 recoge, 106 estira, 113 estocada larga): también la voladora
l0 = completar(pose(C709, 105, 'pie', 100, 113), GUARDIA)
l1 = completar(pose(C709, 106, 'pie', 100, 113), GUARDIA)
l2 = completar(pose(C709, 113, 'pie', 100, 113), GUARDIA)
ANIM['lateral'] = [[0, GUARDIA], [0.2, l0], [0.45, l1], [0.75, l2], [1, GUARDIA]]
ANIM['voladora'] = [[0, l0], [0.25, l1], [0.8, l2], [1, l2]]
# carrera: zancada y paso (media vuelta); la otra media es la misma con las piernas cambiadas
anchas, pasos = [], []
for k in (955, 958, 961, 964):
    p = pose(C029, k, 'pie', 955, 964)
    if p['pieA'][0] < p['pieB'][0]: p = espejo_pies(p)
    anchas.append(p)
for k in (957, 960, 963):
    pasos.append(pose(C029, k, 'pie', 955, 964))
z = completar(promedio(anchas), GUARDIA); pa = completar(promedio(pasos), GUARDIA)
ANIM['correr'] = [[0, z], [0.25, pa], [0.5, completar(espejo_pies(z), GUARDIA)], [0.75, completar(espejo_pies(pa), GUARDIA)], [1, z]]

# ---- ajuste al esqueleto de AoS5 que usa BRONCA para los humanos ----
# cabeza, pies y manos son lo más preciso del calco; la cadera es lo menos. Se deja cabeza, pies y manos
# como en el video y se busca la cadera y el ángulo del torso que los hacen alcanzables con estos huesos.
PIERNA, BRAZO, TORSO, R_CAB = 1.16, 0.8, 0.32, 0.27
def ajustar(q, en_aire=False):
    H = np.array(q.get('cab', q['cue'])); F = [np.array(q['pieA']), np.array(q['pieB'])]; M = [np.array(q['manoA']), np.array(q['manoB'])]
    c0 = np.array(q['cad']); mejor = None
    for th in np.linspace(-1.5, 1.5, 61):
        u = np.array([np.sin(th), np.cos(th)])
        for dx in np.arange(-0.7, 0.71, 0.035):
            for dy in np.arange(-0.7, 0.71, 0.035):
                cad = c0 + [dx, dy]; cue = cad + u * TORSO; cab = cue + u * R_CAB; hom = cue + [-0.02, -0.06]
                e = 4 * np.sum((cab - H) ** 2) + 0.25 * (dx * dx + dy * dy)
                e += sum(3 * max(0, np.hypot(*(f - cad)) - PIERNA * 0.98) ** 2 for f in F)
                e += sum(1 * max(0, np.hypot(*(m - hom)) - BRAZO * 0.98) ** 2 for m in M)
                if not en_aire and cad[1] < 0.35: e += 5
                if mejor is None or e < mejor[0]: mejor = (e, cad, cue)
    _, cad, cue = mejor
    o = {'cad': cad, 'cue': cue, 'pieA': F[0], 'pieB': F[1], 'manoA': M[0], 'manoB': M[1]}
    dx = cad[0]
    return {k: [round(float(v[0] - dx), 3), round(float(v[1]), 3)] for k, v in o.items()}
def con_cab(q, base):
    return q
for k in list(ANIM):
    if k == 'guardia': ANIM[k] = ajustar(ANIM[k])
    else: ANIM[k] = [[t, ajustar(q, k == 'voladora')] for t, q in ANIM[k]]
# la guardia de entrada y salida se da vuelta (pies y manos) si así viaja menos hasta la pose vecina
def dar_vuelta(q, pares):
    o = dict(q)
    for a_, b_ in pares: o[a_], o[b_] = q[b_], q[a_]
    return o
def recorrido(a_, b_): return sum(np.hypot(*np.subtract(a_[k], b_[k])) for k in ('pieA', 'pieB', 'manoA', 'manoB'))
for k, kf in ANIM.items():
    if k in ('guardia', 'correr'): continue
    for i in (0, len(kf) - 1):
        vec = kf[1][1] if i == 0 else kf[-2][1]; q = kf[i][1]
        opciones = [q, dar_vuelta(q, [('pieA', 'pieB')]), dar_vuelta(q, [('manoA', 'manoB')]), dar_vuelta(q, [('pieA', 'pieB'), ('manoA', 'manoB')])]
        kf[i][1] = min(opciones, key=lambda o: recorrido(o, vec))
print('/* poses calcadas de videos de Anger of Stick 5 con herramientas/calco_palitos.py y golpes_aos.py */')
print('const ANIM_AOS = ' + json.dumps(ANIM, separators=(',', ':')) + ';')
