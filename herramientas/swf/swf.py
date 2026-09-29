#!/usr/bin/env python3
"""Lector minimo de SWF, sin dependencias: cabecera, etiquetas, sprites y su linea de tiempo.

Lo que hace falta para sacar animaciones de Madness Project Nexus: que pieza hay en cada
profundidad de un sprite, cuadro a cuadro, con su matriz. No dibuja formas (para eso, Ruffle).

  python3 herramientas/swf/swf.py crudo/swf/mpn.swf              resumen
  python3 herramientas/swf/swf.py crudo/swf/mpn.swf 5628         rotulos de un sprite
  python3 herramientas/swf/swf.py crudo/swf/mpn.swf 5628 walk    su lista de cuadros en un rotulo
"""
import lzma, struct, sys, zlib


class Bits:
    def __init__(self, b, pos=0):
        self.b, self.pos, self.bit = b, pos, 0

    def ub(self, n):
        v = 0
        for _ in range(n):
            byte = self.b[self.pos]
            v = (v << 1) | ((byte >> (7 - self.bit)) & 1)
            self.bit += 1
            if self.bit == 8:
                self.bit, self.pos = 0, self.pos + 1
        return v

    def sb(self, n):
        v = self.ub(n)
        return v - (1 << n) if n and v & (1 << (n - 1)) else v

    def fb(self, n):
        return self.sb(n) / 65536.0

    def alinear(self):
        if self.bit:
            self.bit, self.pos = 0, self.pos + 1


def rect(b, pos):
    r = Bits(b, pos)
    n = r.ub(5)
    v = [r.sb(n) for _ in range(4)]           # xmin, xmax, ymin, ymax en twips
    r.alinear()
    return v, r.pos


def matriz(b, pos):
    """(a, b, c, d, tx, ty): x' = a*x + c*y + tx ; y' = b*x + d*y + ty  (tx, ty en twips)."""
    r = Bits(b, pos)
    a = d = 1.0
    bb = c = 0.0
    if r.ub(1):
        n = r.ub(5); a = r.fb(n); d = r.fb(n)
    if r.ub(1):
        n = r.ub(5); bb = r.fb(n); c = r.fb(n)
    n = r.ub(5)
    tx = r.sb(n); ty = r.sb(n)
    r.alinear()
    return (a, bb, c, d, tx, ty), r.pos


def cadena(b, pos):
    fin = b.index(0, pos)
    return b[pos:fin].decode('utf-8', 'replace'), fin + 1


def etiquetas(b, pos, fin):
    while pos < fin:
        cl, = struct.unpack_from('<H', b, pos); pos += 2
        codigo, largo = cl >> 6, cl & 0x3F
        if largo == 0x3F:
            largo, = struct.unpack_from('<I', b, pos); pos += 4
        yield codigo, pos, largo
        pos += largo
        if codigo == 0:
            return


class SWF:
    def __init__(self, ruta):
        raw = open(ruta, 'rb').read()
        firma, self.version = raw[:3], raw[3]
        if firma == b'FWS':
            b = raw
        elif firma == b'CWS':
            b = raw[:8] + zlib.decompress(raw[8:])
        elif firma == b'ZWS':
            props = raw[12:17]
            d = lzma.LZMADecompressor(format=lzma.FORMAT_RAW, filters=[
                lzma._decode_filter_properties(lzma.FILTER_LZMA1, props)])
            b = raw[:8] + d.decompress(raw[17:])
        else:
            raise ValueError('no es un SWF')
        self.b = b
        self.marco, pos = rect(b, 8)
        self.fps = b[pos + 1] + b[pos] / 256.0
        self.cuadros, = struct.unpack_from('<H', b, pos + 2)
        self.pos0 = pos + 4
        self.sprites, self.formas, self.clases, self.abc = {}, {}, {}, []
        for codigo, p, largo in etiquetas(b, self.pos0, len(b)):
            if codigo == 39:
                sid, n = struct.unpack_from('<HH', b, p)
                self.sprites[sid] = (n, p + 4, p + largo)
            elif codigo in (2, 22, 32, 83):
                fid, = struct.unpack_from('<H', b, p)
                self.formas[fid] = rect(b, p + 2)[0]
            elif codigo in (76, 56):
                n, = struct.unpack_from('<H', b, p); q = p + 2
                for _ in range(n):
                    cid, = struct.unpack_from('<H', b, q)
                    nombre, q = cadena(b, q + 2)
                    self.clases[cid] = nombre
            elif codigo in (72, 82):
                self.abc.append((p, largo))

    def linea(self, sid):
        """Lista de cuadros: cada uno {prof: {'id', 'm', 'nombre', 'ratio'}}; y los rotulos."""
        n, ini, fin = self.sprites[sid]
        b, lista, cuadros, rotulos = self.b, {}, [], {}
        for codigo, p, largo in etiquetas(b, ini, fin):
            if codigo == 1:
                cuadros.append({k: dict(v) for k, v in lista.items()})
            elif codigo == 43:
                rotulos[cadena(b, p)[0]] = len(cuadros)
            elif codigo == 28:
                lista.pop(struct.unpack_from('<H', b, p)[0], None)
            elif codigo == 5:
                lista.pop(struct.unpack_from('<H', b, p + 2)[0], None)
            elif codigo in (26, 70):
                f = b[p]; q = p + 1
                f2 = 0
                if codigo == 70:
                    f2 = b[q]; q += 1
                prof, = struct.unpack_from('<H', b, q); q += 2
                if codigo == 70 and (f2 & 0x08 or (f2 & 0x10 and f & 0x02)):
                    _, q = cadena(b, q)                     # nombre de clase
                mover = f & 0x01
                e = lista.get(prof) if mover else None
                if e is None:
                    e = {'id': None, 'm': (1.0, 0.0, 0.0, 1.0, 0, 0), 'nombre': None, 'ratio': 0}
                if f & 0x02:
                    cid, = struct.unpack_from('<H', b, q); q += 2
                    if e['id'] != cid:
                        e = {'id': cid, 'm': e['m'], 'nombre': e['nombre'], 'ratio': 0}
                if f & 0x04:
                    e['m'], q = matriz(b, q)
                if f & 0x08:                                # transformacion de color: se saltea
                    r = Bits(b, q)
                    sm, ad, nb = r.ub(1), r.ub(1), r.ub(4)
                    for _ in range((4 if codigo == 70 else 4) * (sm + ad)):
                        r.sb(nb)
                    r.alinear(); q = r.pos
                if f & 0x10:
                    e['ratio'], = struct.unpack_from('<H', b, q); q += 2
                if f & 0x20:
                    e['nombre'], q = cadena(b, q)
                lista[prof] = e
        return cuadros, rotulos


if __name__ == '__main__':
    s = SWF(sys.argv[1])
    if len(sys.argv) == 2:
        print(f'SWF v{s.version}, {s.fps} fps, {s.cuadros} cuadros, marco {s.marco}; '
              f'{len(s.sprites)} sprites, {len(s.formas)} formas, {len(s.clases)} clases, abc {len(s.abc)}')
    else:
        sid = int(sys.argv[2])
        cuadros, rotulos = s.linea(sid)
        print(f'sprite {sid} ({s.clases.get(sid, "")}): {len(cuadros)} cuadros')
        orden = sorted(rotulos.items(), key=lambda kv: kv[1])
        if len(sys.argv) == 3:
            for i, (r, c) in enumerate(orden):
                sig = orden[i + 1][1] if i + 1 < len(orden) else len(cuadros)
                print(f'  {c:5d} +{sig - c:<4d} {r}')
        else:
            c0 = rotulos[sys.argv[3]]
            sig = min([c for c in rotulos.values() if c > c0] + [len(cuadros)])
            for i in range(c0, sig):
                print(i - c0, {k: (v['id'], v['nombre'], tuple(round(x, 3) for x in v['m'][:4]), v['m'][4:])
                               for k, v in sorted(cuadros[i].items())})
