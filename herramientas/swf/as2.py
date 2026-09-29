#!/usr/bin/env python3
"""Descompilador a medias del ActionScript 2 de un SWF: pasa un DoInitAction (una clase de
__Packages) a pseudocodigo legible, simulando la pila. Los saltos quedan como 'goto Lnnn' y las
etiquetas 'Lnnn:' en su lugar; alcanza para leer reglas (daño, armadura, perks) sin Ruffle.

  python3 herramientas/swf/as2.py crudo/swf/mpn.swf 8392 > crudo/as2/MadnessCharacter.txt
  python3 herramientas/swf/as2.py crudo/swf/mpn.swf MadnessCharacter      (por nombre de clase)
"""
import re, struct, sys
from swf import SWF, etiquetas, cadena

BIN = {0x0A: '+', 0x0B: '-', 0x0C: '*', 0x0D: '/', 0x0E: '==', 0x0F: '<', 0x10: '&&', 0x11: '||',
       0x13: 'eq', 0x21: '..', 0x29: 'lt', 0x3F: '%', 0x47: '+', 0x48: '<', 0x49: '==', 0x54: 'instanceof',
       0x60: '&', 0x61: '|', 0x62: '^', 0x63: '<<', 0x64: '>>', 0x65: '>>>', 0x66: '===', 0x67: '>',
       0x68: 'gt'}
UNA = {0x12: '!', 0x14: 'length', 0x18: 'int', 0x44: 'typeof', 0x45: 'targetPath', 0x4A: 'Number',
       0x4B: 'String', 0x32: 'ord', 0x33: 'chr'}
PROP = ['_x', '_y', '_xscale', '_yscale', '_currentframe', '_totalframes', '_alpha', '_visible', '_width',
        '_height', '_rotation', '_target', '_framesloaded', '_name', '_droptarget', '_url', '_highquality',
        '_focusrect', '_soundbuftime', '_quality', '_xmouse', '_ymouse']
ID = re.compile(r'^[A-Za-z_$][\w$]*$')


def lit(v, regs):
    if isinstance(v, str):
        return '"' + v.replace('"', '\\"') + '"'
    if isinstance(v, tuple) and v[0] == 'r':
        return regs.get(v[1], 'r%d' % v[1])
    if v is None:
        return 'undefined'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, float) and v == int(v) and abs(v) < 1e15:
        return str(int(v))
    return repr(v)


def nombre(e):
    """'"foo"' -> foo si es identificador (para miembros y variables)."""
    if len(e) > 1 and e[0] == '"' and e[-1] == '"' and ID.match(e[1:-1]):
        return e[1:-1]
    return None


def descompilar(b, q, fin):
    sal, etiq = [], set()
    # 1ra pasada: destinos de salto
    p = q
    while p < fin:
        op = b[p]; n = 0
        if op >= 0x80:
            n, = struct.unpack_from('<H', b, p + 1)
        if op in (0x99, 0x9D):
            d, = struct.unpack_from('<h', b, p + 3); etiq.add(p + 3 + n + d)
        p += 1 + (2 + n if op >= 0x80 else 0)
        if op == 0:
            continue
    pool = []
    ctx = [{'pila': [], 'regs': {}, 'fin': fin, 'lineas': sal, 'sang': ''}]
    funcs = {}

    def emit(txt):
        c = ctx[-1]
        for m in re.findall(r'@F(\d+)', txt):
            f = funcs.pop(int(m), None)
            if f:
                txt = txt.replace('@F' + m, 'function(%s)' % f['params'])
                c['lineas'].append(c['sang'] + txt + ' {')
                c['lineas'].extend(c['sang'] + '  ' + l for l in f['lineas'])
                c['lineas'].append(c['sang'] + '}')
                return
        c['lineas'].append(c['sang'] + txt)

    def pop():
        pila = ctx[-1]['pila']
        return pila.pop() if pila else '?'

    def push(x):
        ctx[-1]['pila'].append(x)

    def args():
        k = pop()
        try:
            k = int(float(k))
        except ValueError:
            return [k + '?']
        return [pop() for _ in range(k)]

    p = q
    while p < fin:
        if p in etiq:
            ctx[-1]['lineas'].append('L%d:' % p)
        op = b[p]; n = 0
        if op >= 0x80:
            n, = struct.unpack_from('<H', b, p + 1)
        d0 = p + 3 if op >= 0x80 else p + 1
        dato = b[d0:d0 + n]
        sig = d0 + n
        regs = ctx[-1]['regs']
        if op == 0:
            pass
        elif op == 0x88:
            k, = struct.unpack_from('<H', dato, 0); r = 2; pool = []
            for _ in range(k):
                c_, r = cadena(dato, r); pool.append(c_)
        elif op == 0x96:
            r = 0
            while r < n:
                t = dato[r]; r += 1
                if t == 0: c_, r = cadena(dato, r); push(lit(c_, regs))
                elif t == 1: push(lit(struct.unpack_from('<f', dato, r)[0], regs)); r += 4
                elif t == 2: push('null')
                elif t == 3: push('undefined')
                elif t == 4: push(lit(('r', dato[r]), regs)); r += 1
                elif t == 5: push(lit(bool(dato[r]), regs)); r += 1
                elif t == 6:
                    hi, lo = struct.unpack_from('<II', dato, r); r += 8
                    push(lit(struct.unpack('<d', struct.pack('<II', lo, hi))[0], regs))
                elif t == 7: push(str(struct.unpack_from('<i', dato, r)[0])); r += 4
                elif t == 8: push(lit(pool[dato[r]], regs) if dato[r] < len(pool) else 'c%d' % dato[r]); r += 1
                elif t == 9:
                    i, = struct.unpack_from('<H', dato, r); r += 2
                    push(lit(pool[i], regs) if i < len(pool) else 'c%d' % i)
                else: break
        elif op in BIN:
            y, x = pop(), pop(); push('(%s %s %s)' % (x, BIN[op], y))
        elif op in UNA:
            x = pop(); push('%s(%s)' % (UNA[op], x))
        elif op == 0x17:
            x = pop()
            if x != '?' and not x.startswith('"'):
                emit(x)
        elif op == 0x1C:
            x = pop(); push(nombre(x) or 'eval(%s)' % x)
        elif op == 0x1D:
            v, x = pop(), pop(); emit('%s = %s' % (nombre(x) or 'set(%s)' % x, v))
        elif op == 0x3C:
            v, x = pop(), pop(); emit('var %s = %s' % (nombre(x) or x, v))
        elif op == 0x41:
            x = pop(); emit('var %s' % (nombre(x) or x))
        elif op == 0x4E:
            m, o = pop(), pop(); k = nombre(m); push('%s.%s' % (o, k) if k else '%s[%s]' % (o, m))
        elif op == 0x4F:
            v, m, o = pop(), pop(), pop(); k = nombre(m)
            emit('%s = %s' % ('%s.%s' % (o, k) if k else '%s[%s]' % (o, m), v))
        elif op == 0x3D:
            f = pop(); a = args(); push('%s(%s)' % (nombre(f) or f, ', '.join(a)))
        elif op == 0x52:
            m, o = pop(), pop(); a = args(); k = nombre(m)
            if m in ('undefined', '""'):
                push('%s(%s)' % (o, ', '.join(a)))
            else:
                push('%s.%s(%s)' % (o, k, ', '.join(a)) if k else '%s[%s](%s)' % (o, m, ', '.join(a)))
        elif op == 0x40:
            f = pop(); a = args(); push('new %s(%s)' % (nombre(f) or f, ', '.join(a)))
        elif op == 0x53:
            m, o = pop(), pop(); a = args(); k = nombre(m)
            push('new %s(%s)' % ('%s.%s' % (o, k) if k else o, ', '.join(a)))
        elif op == 0x42:
            a = args(); push('[%s]' % ', '.join(a))
        elif op == 0x43:
            k = int(float(pop())); pares = []
            for _ in range(k):
                v, m = pop(), pop(); pares.append('%s: %s' % (nombre(m) or m, v))
            push('{%s}' % ', '.join(pares))
        elif op == 0x50:
            push('(%s + 1)' % pop())
        elif op == 0x51:
            push('(%s - 1)' % pop())
        elif op == 0x4C:
            x = pop(); push(x); push(x)
        elif op == 0x4D:
            y, x = pop(), pop(); push(y); push(x)
        elif op == 0x87:
            x = pop(); rn = regs.get(dato[0], 'r%d' % dato[0])
            if x != rn:
                emit('%s = %s' % (rn, x))
            push(rn)
        elif op == 0x3E:
            emit('return %s' % pop())
        elif op == 0x9D:
            d, = struct.unpack_from('<h', dato, 0); emit('if %s goto L%d' % (pop(), sig + d))
        elif op == 0x99:
            d, = struct.unpack_from('<h', dato, 0); emit('goto L%d' % (sig + d))
        elif op == 0x22:
            i, o = pop(), pop()
            try:
                push('%s.%s' % (o, PROP[int(float(i))]))
            except (ValueError, IndexError):
                push('getProperty(%s, %s)' % (o, i))
        elif op == 0x23:
            v, i, o = pop(), pop(), pop()
            try:
                emit('%s.%s = %s' % (o, PROP[int(float(i))], v))
            except (ValueError, IndexError):
                emit('setProperty(%s, %s, %s)' % (o, i, v))
        elif op == 0x30:
            push('random(%s)' % pop())
        elif op == 0x34:
            push('getTimer()')
        elif op == 0x3A:
            m, o = pop(), pop(); push('delete %s.%s' % (o, nombre(m) or m))
        elif op == 0x3B:
            push('delete %s' % pop())
        elif op == 0x69:
            sup, sub = pop(), pop(); emit('%s extends %s' % (sub, sup))
        elif op == 0x2C:
            c_ = pop(); a = args(); emit('%s implements %s' % (c_, ', '.join(a)))
        elif op == 0x2B:
            o, c_ = pop(), pop(); push('%s(%s)' % (c_, o))
        elif op == 0x26:
            emit('trace(%s)' % pop())
        elif op == 0x2A:
            emit('throw %s' % pop())
        elif op in (0x46, 0x55):
            push('enumerate(%s)' % pop())
        elif op == 0x20:
            emit('tellTarget(%s)' % pop())
        elif op == 0x8B:
            emit('tellTarget("%s")' % cadena(dato, 0)[0])
        elif op == 0x8C:
            emit('gotoLabel("%s")' % cadena(dato, 0)[0])
        elif op == 0x81:
            emit('gotoFrame(%d)' % struct.unpack_from('<H', dato, 0)[0])
        elif op == 0x9F:
            emit('gotoAndPlay(%s)' % pop() if dato[0] & 1 else 'gotoAndStop(%s)' % pop())
        elif op in (0x06, 0x07, 0x04, 0x05):
            emit({6: 'play()', 7: 'stop()', 4: 'nextFrame()', 5: 'prevFrame()'}[op])
        elif op in (0x8E, 0x9B):
            nom, r = cadena(dato, 0)
            k, = struct.unpack_from('<H', dato, r); r += 2
            nregs = {}
            if op == 0x8E:
                r += 1; f1, f2 = dato[r], dato[r + 1]; r += 2
                reg = 1
                for bit, s_ in ((0x01, 'this'), (0x04, 'arguments'), (0x10, 'super'), (0x40, '_root'),
                                (0x80, '_parent')):
                    if f1 & bit:
                        nregs[reg] = s_; reg += 1
                if f2 & 0x01:
                    nregs[reg] = '_global'
                ps = []
                for _ in range(k):
                    rg = dato[r]; s_, r = cadena(dato, r + 1); ps.append(s_)
                    if rg:
                        nregs[rg] = s_
            else:
                ps = []
                for _ in range(k):
                    s_, r = cadena(dato, r); ps.append(s_)
            tam, = struct.unpack_from('<H', dato, r)
            fid = sig
            if nom:
                ctx[-1]['lineas'].append(ctx[-1]['sang'] + 'function %s(%s) {' % (nom, ', '.join(ps)))
                ctx.append({'pila': [], 'regs': nregs, 'fin': sig + tam, 'lineas': ctx[-1]['lineas'],
                            'sang': ctx[-1]['sang'] + '  ', 'id': fid, 'nombrada': True})
            else:
                funcs[fid] = {'params': ', '.join(ps), 'lineas': []}
                ctx.append({'pila': [], 'regs': nregs, 'fin': sig + tam, 'lineas': funcs[fid]['lineas'],
                            'sang': '', 'id': fid})
        else:
            emit('op_%02X' % op)
        p = sig
        while len(ctx) > 1 and p >= ctx[-1]['fin']:
            c = ctx.pop()
            if c.get('nombrada'):
                c['lineas'].append(ctx[-1]['sang'] + '}')
            else:
                push('@F%d' % c['id'])
    return sal


if __name__ == '__main__':
    s = SWF(sys.argv[1])
    cual = sys.argv[2]
    cid = int(cual) if cual.isdigit() else next(k for k, v in s.clases.items() if v.split('.')[-1] == cual)
    for codigo, p, largo in etiquetas(s.b, s.pos0, len(s.b)):
        if codigo == 59 and struct.unpack_from('<H', s.b, p)[0] == cid:
            print('\n'.join(descompilar(s.b, p + 2, p + largo)))
            break
