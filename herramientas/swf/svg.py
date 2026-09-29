#!/usr/bin/env python3
"""Formas y sprites del SWF a SVG, sin Ruffle: para sacar dibujos (iconos, prendas) y rasterizarlos
con el Chromium del contenedor (herramientas/swf/rasterizar.js).

  python3 herramientas/swf/svg.py crudo/swf/mpn.swf <id> [cuadro|rotulo] > dibujo.svg

Lee DefineShape 1 a 4 (rellenos lisos, degradados lineales y radiales, lineas), los junta en
caminos cerrados por estilo como hace Flash (cada borde va al relleno de su derecha tal cual y al
de su izquierda dado vuelta) y compone los sprites con sus matrices, su color y sus recortes.
Unidades: px del SWF (twip/20). No hace: bitmaps, textos, filtros ni modos de fusion.
"""
import struct, sys
from collections import defaultdict
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from swf import SWF, matriz, rect

VERSION = {2: 1, 22: 2, 32: 3, 83: 4}


class Lector:
    def __init__(self, b, pos):
        self.b, self.pos, self.bit = b, pos, 0

    def alinear(self):
        if self.bit:
            self.bit, self.pos = 0, self.pos + 1

    def u8(self):
        self.alinear(); v = self.b[self.pos]; self.pos += 1; return v

    def u16(self):
        self.alinear(); v, = struct.unpack_from('<H', self.b, self.pos); self.pos += 2; return v

    def s16(self):
        self.alinear(); v, = struct.unpack_from('<h', self.b, self.pos); self.pos += 2; return v

    def ub(self, n):
        v = 0
        for _ in range(n):
            v = (v << 1) | ((self.b[self.pos] >> (7 - self.bit)) & 1)
            self.bit += 1
            if self.bit == 8:
                self.bit, self.pos = 0, self.pos + 1
        return v

    def sb(self, n):
        v = self.ub(n)
        return v - (1 << n) if n and v & (1 << (n - 1)) else v

    def mat(self):
        self.alinear(); m, self.pos = matriz(self.b, self.pos); return m

    def color(self, alfa):
        r, g, b = self.u8(), self.u8(), self.u8()
        return (r, g, b, self.u8() if alfa else 255)


def relleno(L, v):
    t = L.u8()
    if t == 0x00:
        return {'t': 'liso', 'c': L.color(v >= 3)}
    if t in (0x10, 0x12, 0x13):
        m = L.mat()
        L.alinear()
        spread, _interp, n = L.ub(2), L.ub(2), L.ub(4)
        paradas = [(L.u8(), L.color(v >= 3)) for _ in range(n)]
        focal = L.s16() / 256 if t == 0x13 else 0.0
        return {'t': 'lineal' if t == 0x10 else 'radial', 'm': m, 'p': paradas, 'spread': spread, 'focal': focal}
    if t in (0x40, 0x41, 0x42, 0x43):
        bid = L.u16()
        return {'t': 'bitmap', 'id': bid, 'm': L.mat()}
    raise ValueError('relleno %#x' % t)


def estilo_linea(L, v):
    ancho = L.u16()
    if v < 4:
        return {'ancho': ancho, 'c': L.color(v >= 3), 'cap': 0, 'union': 0}
    cap, union, con_relleno = L.ub(2), L.ub(2), L.ub(1)
    L.ub(3); L.ub(5); L.ub(1); L.ub(2)
    if union == 2:
        L.u16()
    c = (0, 0, 0, 255)
    if con_relleno:
        f = relleno(L, v)
        c = f['c'] if f['t'] == 'liso' else f['p'][0][1] if f.get('p') else c
    else:
        c = L.color(True)
    return {'ancho': ancho, 'c': c, 'cap': cap, 'union': union}


def arreglo(L, v, f):
    n = L.u8()
    if n == 0xFF and v >= 2:
        n = L.u16()
    return [f(L, v) for _ in range(n)]


def leer_forma(s, fid):
    """Grupos de estilos de la forma: [(rellenos, lineas, bordes_por_relleno, bordes_por_linea)].
    Un borde es (x0, y0, cx, cy, x1, y1) en twips, con cx = None si es recto."""
    codigo, p, largo = s.def_forma[fid]
    v = VERSION[codigo]
    _, q = rect(s.b, p + 2)
    if v == 4:
        _, q = rect(s.b, q)
        q += 1
    L = Lector(s.b, q)
    rell, lin = arreglo(L, v, relleno), arreglo(L, v, estilo_linea)
    L.alinear()
    nF, nL = L.ub(4), L.ub(4)
    grupos = []
    br, bl = defaultdict(list), defaultdict(list)
    x = y = f0 = f1 = ln = 0
    while True:
        if L.ub(1) == 0:
            fl = L.ub(5)
            if fl == 0:
                break
            if fl & 1:
                nb = L.ub(5); x = L.sb(nb); y = L.sb(nb)
            if fl & 2:
                f0 = L.ub(nF)
            if fl & 4:
                f1 = L.ub(nF)
            if fl & 8:
                ln = L.ub(nL)
            if fl & 16:
                grupos.append((rell, lin, br, bl))
                rell, lin = arreglo(L, v, relleno), arreglo(L, v, estilo_linea)
                L.alinear()
                nF, nL = L.ub(4), L.ub(4)
                br, bl = defaultdict(list), defaultdict(list)
        else:
            if L.ub(1):
                nb = L.ub(4) + 2
                if L.ub(1):
                    dx, dy = L.sb(nb), L.sb(nb)
                elif L.ub(1):
                    dx, dy = 0, L.sb(nb)
                else:
                    dx, dy = L.sb(nb), 0
                e = (x, y, None, None, x + dx, y + dy)
            else:
                nb = L.ub(4) + 2
                cx = x + L.sb(nb); cy = y + L.sb(nb)
                ax = cx + L.sb(nb); ay = cy + L.sb(nb)
                e = (x, y, cx, cy, ax, ay)
            if f1:
                br[f1].append(e)
            if f0:
                br[f0].append((e[4], e[5], e[2], e[3], e[0], e[1]))
            if ln:
                bl[ln].append(e)
            x, y = e[4], e[5]
    grupos.append((rell, lin, br, bl))
    return grupos


def encadenar(bordes):
    """Junta bordes en caminos siguiendo punta con punta."""
    por_inicio = defaultdict(list)
    for i, e in enumerate(bordes):
        por_inicio[(e[0], e[1])].append(i)
    usado = [False] * len(bordes)
    caminos = []
    for i, e in enumerate(bordes):
        if usado[i]:
            continue
        usado[i] = True
        cam, fin, ini = [e], (e[4], e[5]), (e[0], e[1])
        while fin != ini:
            sig = next((j for j in por_inicio.get(fin, []) if not usado[j]), None)
            if sig is None:
                break
            usado[sig] = True
            cam.append(bordes[sig]); fin = (bordes[sig][4], bordes[sig][5])
        caminos.append(cam)
    return caminos


def d_de(caminos, cerrar=True):
    k = lambda v: ('%.2f' % (v / 20)).rstrip('0').rstrip('.')
    out = []
    for cam in caminos:
        out.append('M%s %s' % (k(cam[0][0]), k(cam[0][1])))
        x, y = cam[0][0], cam[0][1]
        for e in cam:
            if (e[0], e[1]) != (x, y):
                out.append('M%s %s' % (k(e[0]), k(e[1])))
            if e[2] is None:
                out.append('L%s %s' % (k(e[4]), k(e[5])))
            else:
                out.append('Q%s %s %s %s' % (k(e[2]), k(e[3]), k(e[4]), k(e[5])))
            x, y = e[4], e[5]
        if cerrar and (x, y) == (cam[0][0], cam[0][1]):
            out.append('Z')
    return ''.join(out)


class Lienzo:
    """Arma un SVG: definiciones (degradados, recortes, filtros) y el cuerpo."""

    def __init__(self, s):
        self.s, self.defs, self.n = s, [], 0

    def nuevo(self, pre):
        self.n += 1
        return '%s%d' % (pre, self.n)

    def pintura(self, f):
        if f['t'] == 'liso':
            r, g, b, a = f['c']
            return 'rgb(%d,%d,%d)' % (r, g, b), a / 255
        if f['t'] in ('lineal', 'radial'):
            gid = self.nuevo('g')
            a, b, c, d, tx, ty = f['m']
            tr = 'matrix(%g %g %g %g %g %g)' % (a, b, c, d, tx / 20, ty / 20)
            spread = ['pad', 'reflect', 'repeat'][min(f['spread'], 2)]
            paradas = ''.join('<stop offset="%.4f" stop-color="rgb(%d,%d,%d)" stop-opacity="%.3f"/>'
                              % (r_ / 255, c_[0], c_[1], c_[2], c_[3] / 255) for r_, c_ in f['p'])
            if f['t'] == 'lineal':
                self.defs.append('<linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="-819.2" y1="0" x2="819.2" y2="0" '
                                 'spreadMethod="%s" gradientTransform="%s">%s</linearGradient>' % (gid, spread, tr, paradas))
            else:
                self.defs.append('<radialGradient id="%s" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="819.2" fx="%g" fy="0" '
                                 'spreadMethod="%s" gradientTransform="%s">%s</radialGradient>'
                                 % (gid, f['focal'] * 819.2, spread, tr, paradas))
            return 'url(#%s)' % gid, 1.0
        return 'rgb(128,128,128)', 1.0              # bitmap: sin soporte, gris

    def forma(self, fid):
        out = []
        for rell, lin, br, bl in leer_forma(self.s, fid):
            for i in sorted(br):
                if i - 1 < len(rell):
                    col, op = self.pintura(rell[i - 1])
                    out.append('<path d="%s" fill="%s"%s fill-rule="evenodd"/>'
                               % (d_de(encadenar(br[i])), col, '' if op >= 1 else ' fill-opacity="%.3f"' % op))
            for i in sorted(bl):
                if i - 1 < len(lin):
                    L = lin[i - 1]
                    r, g, b, a = L['c']
                    out.append('<path d="%s" fill="none" stroke="rgb(%d,%d,%d)"%s stroke-width="%.2f" '
                               'stroke-linecap="%s" stroke-linejoin="%s"/>'
                               % (d_de(encadenar(bl[i]), False), r, g, b,
                                  '' if a >= 255 else ' stroke-opacity="%.3f"' % (a / 255),
                                  max(1.0, L['ancho'] / 20), ['round', 'butt', 'square'][min(L['cap'], 2)],
                                  ['round', 'bevel', 'miter'][min(L['union'], 2)]))
        return ''.join(out)

    def planos(self, cid, cuadro, M, prof=0):
        """Los caminos de un simbolo, sueltos y con la matriz M (en twips) ya compuesta: para los
        recortes."""
        if cid in self.s.def_forma:
            a, b, c, d, tx, ty = M
            tr = ' transform="matrix(%g %g %g %g %g %g)"' % (a, b, c, d, tx / 20, ty / 20)
            return [p.replace('<path ', '<path' + tr + ' ', 1) for p in self.forma(cid).split('/>') and
                    [x + '/>' for x in self.forma(cid).split('/>') if x.strip()]]
        if cid not in self.s.sprites or prof > 12:
            return []
        cuadros, _ = self.s.linea(cid)
        if not cuadros:
            return []
        out = []
        for p in sorted(cuadros[min(cuadro, len(cuadros) - 1)].items()):
            e = p[1]
            if e['id'] is None or e.get('recorte'):
                continue
            a1, b1, c1, d1, x1, y1 = M
            a2, b2, c2, d2, x2, y2 = e['m']
            out += self.planos(e['id'], 0, (a1 * a2 + c1 * b2, b1 * a2 + d1 * b2, a1 * c2 + c1 * d2, b1 * c2 + d1 * d2,
                                            a1 * x2 + c1 * y2 + x1, b1 * x2 + d1 * y2 + y1), prof + 1)
        return out

    def filtro(self, cx):
        fid = self.nuevo('cx')
        rm, gm, bm, am, ra, ga, ba, aa = cx
        self.defs.append('<filter id="%s" x="-50%%" y="-50%%" width="200%%" height="200%%" color-interpolation-filters="sRGB">'
                         '<feColorMatrix type="matrix" values="%g 0 0 0 %g 0 %g 0 0 %g 0 0 %g 0 %g 0 0 0 %g %g"/></filter>'
                         % (fid, rm, ra / 255, gm, ga / 255, bm, ba / 255, am, aa / 255))
        return fid

    def dibujo(self, cid, cuadro=0, fuera=None, prof=0, hijos=None):
        """Una forma, o un cuadro de un sprite con sus hijos en su cuadro 0. 'fuera': nombres de
        instancia que no se pintan (textos, marcos de seleccion). 'hijos': {nombre de instancia:
        cuadro o (id, cuadro)}, lo que en el SWF hace el codigo con gotoAndStop (myMask ->
        'agent1_mask'); con un id se pinta otro simbolo en su lugar."""
        if cid in self.s.def_forma:
            return self.forma(cid)
        if cid not in self.s.sprites or prof > 12:
            return ''
        cuadros, _ = self.s.linea(cid)
        if not cuadros:
            return ''
        f = cuadros[min(cuadro, len(cuadros) - 1)]
        out, recorte = [], None
        for p in sorted(f):
            e = f[p]
            # los cambios valen solo para los hijos directos del simbolo de arriba: mas adentro
            # puede haber otra instancia con el mismo nombre
            cambio = (hijos or {}).get(e['nombre']) if prof == 0 else None
            if e['id'] is None or (cambio is None and fuera and e['nombre'] in fuera):
                continue
            if cambio is None:
                cid_h, cuadro_h, mat = e['id'], 0, e['m']
            elif isinstance(cambio, tuple):
                cid_h, cuadro_h, mat = cambio[0], cambio[1], cambio[2] if len(cambio) > 2 else e['m']
            else:
                cid_h, cuadro_h, mat = e['id'], cambio, e['m']
            a, b, c, d, tx, ty = mat
            hijo = self.dibujo(cid_h, cuadro_h, fuera, prof + 1, hijos)
            g = '<g transform="matrix(%g %g %g %g %g %g)"%s>%s</g>' % (
                a, b, c, d, tx / 20, ty / 20,
                ' filter="url(#%s)"' % self.filtro(e['cx']) if e.get('cx') and e['cx'] != [1, 1, 1, 1, 0, 0, 0, 0] else '',
                hijo)
            if e.get('recorte'):
                # un clipPath no admite <g>: sus caminos van sueltos, cada uno con su matriz entera
                rid = self.nuevo('clip')
                self.defs.append('<clipPath id="%s">%s</clipPath>' % (rid, ''.join(self.planos(e['id'], 0, e['m']))))
                recorte = (rid, e['recorte'])
                continue
            if recorte and p <= recorte[1]:
                g = '<g clip-path="url(#%s)">%s</g>' % (recorte[0], g)
            out.append(g)
        return ''.join(out)


def documento(s, cid, cuadro=0, fuera=None, caja=None, hijos=None):
    """SVG entero. 'caja' = (x0, y0, x1, y1) en px; si no, una grande (rasterizar.js recorta)."""
    lz = Lienzo(s)
    cuerpo = lz.dibujo(cid, cuadro, fuera, 0, hijos)
    if caja is None:
        caja = (-500, -500, 500, 500)
    x0, y0, x1, y1 = caja
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%g %g %g %g" width="%g" height="%g">'
            '<defs>%s</defs>%s</svg>' % (x0, y0, x1 - x0, y1 - y0, x1 - x0, y1 - y0, ''.join(lz.defs), cuerpo))


if __name__ == '__main__':
    s = SWF(sys.argv[1])
    cid = int(sys.argv[2])
    cuadro = 0
    if len(sys.argv) > 3:
        a = sys.argv[3]
        cuadro = int(a) if a.isdigit() else s.linea(cid)[1][a]
    print(documento(s, cid, cuadro))
