#!/usr/bin/env python3
"""Junta varios GLB riggeados del MISMO modelo en uno solo con todos los clips.

  python3 juntar_anim.py salida.glb base.glb:quieto otro.glb:caminar otro2.glb:correr …

Cada entrada aporta SUS animaciones; el primero aporta además la malla y el esqueleto.
Los canales se reapuntan por NOMBRE de nodo, nunca por índice: dos trabajos distintos del
mismo rigger devuelven el mismo esqueleto pero no hay por qué fiarse del orden.
"""
import json, struct, sys

def leer(ruta):
    d = open(ruta,'rb').read()
    magia, ver, largo = struct.unpack('<III', d[:12])
    assert magia == 0x46546C67, ruta + ': no es GLB'
    js = bin = None; p = 12
    while p < largo:
        clargo, ctipo = struct.unpack('<II', d[p:p+8]); p += 8
        trozo = d[p:p+clargo]; p += clargo
        if ctipo == 0x4E4F534A: js = json.loads(trozo.decode('utf-8'))
        elif ctipo == 0x004E4942: bin = trozo
    return js, (bin or b'')

def escribir(ruta, js, bin):
    jb = json.dumps(js, separators=(',',':')).encode('utf-8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    bb = bin + b'\0' * ((4 - len(bin) % 4) % 4)
    total = 12 + 8 + len(jb) + 8 + len(bb)
    with open(ruta,'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A)); f.write(jb)
        f.write(struct.pack('<II', len(bb), 0x004E4942)); f.write(bb)

def datos(js, bin, acc_i):
    """Devuelve los bytes crudos de un accesor de animación (sin entrelazar)."""
    a = js['accessors'][acc_i]
    comp = {5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a['componentType']]
    nume = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
    paso = comp*nume
    bv = js['bufferViews'][a['bufferView']]
    base = bv.get('byteOffset',0) + a.get('byteOffset',0)
    zancada = bv.get('byteStride') or paso
    if zancada == paso:
        return bin[base:base + paso*a['count']]
    return b''.join(bin[base+i*zancada : base+i*zancada+paso] for i in range(a['count']))

def main():
    salida, entradas = sys.argv[1], sys.argv[2:]
    base_ruta, base_nombre = entradas[0].split(':')
    js, bin = leer(base_ruta)
    bin = bytearray(bin)
    js.setdefault('animations', [])
    for i, an in enumerate(js['animations']):
        an['name'] = base_nombre if i == 0 else base_nombre + '_' + str(i)
    porNombre = {n.get('name'): i for i, n in enumerate(js.get('nodes', []))}

    for ent in entradas[1:]:
        ruta, nombre = ent.split(':')
        js2, bin2 = leer(ruta)
        faltan = []
        for k, an in enumerate(js2.get('animations', [])):
            nueva = {'name': nombre if k == 0 else nombre+'_'+str(k), 'samplers': [], 'channels': []}
            for sm in an['samplers']:
                nuevo = {'interpolation': sm.get('interpolation','LINEAR')}
                for campo in ('input','output'):
                    a2 = js2['accessors'][sm[campo]]
                    crudo = datos(js2, bin2, sm[campo])
                    while len(bin) % 4: bin.append(0)
                    off = len(bin); bin += crudo
                    js['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(crudo)})
                    nac = {'bufferView':len(js['bufferViews'])-1,
                           'componentType':a2['componentType'],'count':a2['count'],'type':a2['type']}
                    if 'min' in a2: nac['min'] = a2['min']          # va en las unidades guardadas
                    if 'max' in a2: nac['max'] = a2['max']
                    js['accessors'].append(nac)
                    nuevo[campo] = len(js['accessors'])-1
                nueva['samplers'].append(nuevo)
            for ch in an['channels']:
                objetivo = ch['target']
                if 'node' not in objetivo: continue
                nom = js2['nodes'][objetivo['node']].get('name')
                if nom not in porNombre:
                    faltan.append(nom); continue
                nueva['channels'].append({'sampler':ch['sampler'],
                    'target':{'node':porNombre[nom],'path':objetivo['path']}})
            if nueva['channels']: js['animations'].append(nueva)
        if faltan:
            print('  ojo: %d canales sin hueso equivalente (%s…)' % (len(faltan), faltan[0]))

    js['buffers'] = [{'byteLength': len(bin)}]
    escribir(salida, js, bytes(bin))
    print('clips:', [a.get('name') for a in js['animations']])
    print('huesos:', len(js.get('nodes',[])), '· bytes:', len(bin))

main()
