#!/usr/bin/env python3
"""Achica un GLB para que entre en un HTML: reescala las texturas y recompacta el binario.

  python3 hornear.py entrada.glb salida.glb [--lado 1024] [--calidad 82] [--solo-color]

--solo-color deja nada más el baseColorTexture: los demás mapas se sacan del material ENTERO
(y el emissiveFactor se pone en cero: dejarlo en blanco pinta el modelo entero de blanco).
--emisivo agrega un mapa emisivo derivado de la propia textura por percentil.
Recompacta SIEMPRE: sin rehacer el buffer, cambiar una textura sólo agranda el archivo.
"""
import io, json, struct, sys
from PIL import Image

def leer(r):
    d = open(r,'rb').read(); _,_,largo = struct.unpack('<III', d[:12])
    js=bin=None; p=12
    while p < largo:
        cl, ct = struct.unpack('<II', d[p:p+8]); p+=8
        t=d[p:p+cl]; p+=cl
        if ct==0x4E4F534A: js=json.loads(t.decode('utf-8'))
        elif ct==0x004E4942: bin=t
    return js,(bin or b'')

def escribir(r,js,bin):
    jb=json.dumps(js,separators=(',',':')).encode(); jb+=b' '*((4-len(jb)%4)%4)
    bb=bin+b'\0'*((4-len(bin)%4)%4)
    with open(r,'wb') as f:
        f.write(struct.pack('<III',0x46546C67,2,12+8+len(jb)+8+len(bb)))
        f.write(struct.pack('<II',len(jb),0x4E4F534A)); f.write(jb)
        f.write(struct.pack('<II',len(bb),0x004E4942)); f.write(bb)

def main():
    ent, sal = sys.argv[1], sys.argv[2]
    lado = int(sys.argv[sys.argv.index('--lado')+1]) if '--lado' in sys.argv else 1024
    cal  = int(sys.argv[sys.argv.index('--calidad')+1]) if '--calidad' in sys.argv else 82
    solo = '--solo-color' in sys.argv
    emisivo = '--emisivo' in sys.argv
    js, bin = leer(ent)

    if solo:
        for m in js.get('materials', []):
            p = m.setdefault('pbrMetallicRoughness', {})
            p.pop('metallicRoughnessTexture', None)
            p.setdefault('metallicFactor', 0.0); p.setdefault('roughnessFactor', 0.8)
            for k in ('normalTexture','occlusionTexture','emissiveTexture'):
                m.pop(k, None)
            # sacar el mapa emisivo y dejar el factor en blanco pinta el modelo ENTERO de blanco
            m['emissiveFactor'] = [0.0, 0.0, 0.0]

    # qué texturas siguen referenciadas por algún material
    usadas = set()
    for m in js.get('materials', []):
        p = m.get('pbrMetallicRoughness', {})
        for t in (p.get('baseColorTexture'), p.get('metallicRoughnessTexture'),
                  m.get('normalTexture'), m.get('occlusionTexture'), m.get('emissiveTexture')):
            if t: usadas.add(t['index'])
    vivas = {js['textures'][i]['source'] for i in usadas if 'source' in js['textures'][i]}

    # imágenes: reescaladas a bytes sueltos; las que nadie usa se tiran
    crudas = {}
    for i, im in enumerate(js.get('images', [])):
        if i not in vivas or 'bufferView' not in im: continue
        bv = js['bufferViews'][im['bufferView']]
        d = bin[bv.get('byteOffset',0): bv.get('byteOffset',0)+bv['byteLength']]
        f = Image.open(io.BytesIO(d)); antes = f.size
        if max(f.size) > lado:
            f = f.resize((min(f.size[0],lado), min(f.size[1],lado)), Image.LANCZOS)
        b = io.BytesIO(); f.convert('RGB').save(b, 'JPEG', quality=cal, optimize=True)
        crudas[i] = b.getvalue()
        print('  img%d %s -> %s  %d -> %d bytes' % (i, antes, f.size, len(d), len(crudas[i])))

    # mapa emisivo derivado de la propia textura: percentil sobre lo "cian" con rampa
    if emisivo and crudas:
        import numpy as np
        i0 = sorted(crudas)[0]
        base = Image.open(io.BytesIO(crudas[i0])).convert('RGB')
        a3 = np.asarray(base).astype(np.float32)
        cian = (a3[:,:,1] + a3[:,:,2])/2.0 - a3[:,:,0]
        lum  = a3.mean(axis=2)
        puntaje = cian * (lum/255.0)
        p0, p1 = np.percentile(puntaje, 97.0), np.percentile(puntaje, 99.7)
        if p1 <= p0: p1 = p0 + 1e-3
        rampa = np.clip((puntaje - p0)/(p1 - p0), 0, 1)[:,:,None]
        em = np.clip(a3 * rampa * 1.15, 0, 255).astype(np.uint8)
        b2 = io.BytesIO(); Image.fromarray(em).save(b2,'JPEG',quality=78,optimize=True)
        crudas['em'] = b2.getvalue()
        print('  emisivo: %d bytes (umbral %.1f a %.1f)' % (len(crudas['em']), p0, p1))

    # buffer nuevo: sólo las vistas que siguen en uso, en orden
    nbin = bytearray(); nvistas = []; mapa = {}
    def meter(datos, zancada=None):
        nonlocal nbin
        while len(nbin) % 4: nbin.append(0)
        off = len(nbin); nbin += datos
        v = {'buffer':0,'byteOffset':off,'byteLength':len(datos)}
        if zancada: v['byteStride'] = zancada
        nvistas.append(v); return len(nvistas)-1

    for k, a in enumerate(js.get('accessors', [])):
        if 'bufferView' not in a: continue
        bv = js['bufferViews'][a['bufferView']]
        clave = ('bv', a['bufferView'])
        if clave not in mapa:
            d = bin[bv.get('byteOffset',0): bv.get('byteOffset',0)+bv['byteLength']]
            i = meter(d, bv.get('byteStride'))
            if 'target' in bv: nvistas[i]['target'] = bv['target']
            mapa[clave] = i
        a['bufferView'] = mapa[clave]

    for i, im in list(enumerate(js.get('images', []))):
        if i in crudas:
            im['bufferView'] = meter(crudas[i]); im['mimeType'] = 'image/jpeg'
            im.pop('uri', None)

    if 'em' in crudas:
        js['images'].append({'name':'emisivo','bufferView':meter(crudas['em']),'mimeType':'image/jpeg'})
        muestreador = js['textures'][0].get('sampler')
        t = {'source': len(js['images'])-1}
        if muestreador is not None: t['sampler'] = muestreador
        js['textures'].append(t)
        for m in js.get('materials', []):
            m['emissiveTexture'] = {'index': len(js['textures'])-1}
            m['emissiveFactor'] = [1.0, 1.0, 1.0]

    js['bufferViews'] = nvistas
    js['buffers'] = [{'byteLength': len(nbin)}]
    escribir(sal, js, bytes(nbin))
    print('salida:', len(nbin), 'bytes')

main()
