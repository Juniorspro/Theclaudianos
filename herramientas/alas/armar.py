#!/usr/bin/env python3
"""Arma ALAS · DUELO AÉREO: junta las partes y mete los assets procesados (manifiestos de gen/listo) adentro del HTML.

  python3 armar.py                 → juegos-pc/Brecha.html del repo
  python3 armar.py --sin-assets    → sin ARCH (para comparar contra lo dibujado por código)
  python3 armar.py --solo tex,cielo → sólo esas categorías
"""
import base64, json, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(AQUI, 'partes')
GEN = os.environ.get('ALAS_GEN', '/tmp/claude-0/av/gen/listo')
SALIDA = os.path.normpath(os.path.join(AQUI, '..', '..', 'juegos-pc', 'Alas.html'))
PARTES = ['a0.html', 'three.html', 'gltf.html', '@assets', 'a1.js', 'a1i.js', 'a1c.js', 'a1s.js', 'a2.js', 'a2p.js', 'a3.js', 'a4.js', 'a5.js']
MIME = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wav': 'audio/wav'}


CACHE = os.environ.get('ALAS_CACHE', '/tmp/claude-0/av/gen/cache')


# lo que va instanciado de a cientos se simplifica (ratio, error): la silueta es una caja, el detalle lo pone el mapa de normales
SIMPLIFICAR = {'prop_jersey': (0.05, 0.05), 'prop_autoelevador': (0.5, 0.01), 'prop_mesa_lab': (0.5, 0.01), 'prop_bolsas': (0.5, 0.01),
               'prop_pallet': (0.5, 0.01), 'prop_escritorio': (0.6, 0.01), 'prop_barril': (0.6, 0.01)}
CLI = '/tmp/tools/node_modules/@gltf-transform/cli/bin/cli.js'


def presupuesto(ruta, lado=None, calidad=82, glb=False, simp=None):
    """Achica a lo que se ve en un teléfono (con caché): imágenes a `lado` px en webp, GLB cuantizado (sin decodificador)."""
    import hashlib, subprocess
    os.makedirs(CACHE, exist_ok=True)
    clave = hashlib.md5(('%s|%s|%s|%s|%s|%s' % (ruta, os.path.getmtime(ruta), lado, calidad, glb, simp)).encode()).hexdigest()[:16]
    if glb:
        dst = os.path.join(CACHE, clave + '.glb')
        if not os.path.exists(dst) and simp:
            w, sm = os.path.join(CACHE, clave + '_w.glb'), os.path.join(CACHE, clave + '_s.glb')
            r1 = subprocess.run(['node', CLI, 'weld', ruta, w], capture_output=True, text=True)
            r2 = subprocess.run(['node', CLI, 'simplify', w, sm, '--ratio', str(simp[0]), '--error', str(simp[1])], capture_output=True, text=True)
            if r1.returncode == 0 and r2.returncode == 0 and os.path.exists(sm):
                ruta = sm
            else:
                print('  sin simplificar', os.path.basename(ruta), (r1.stderr + r2.stderr)[-200:])
        if not os.path.exists(dst) and glb == 'piel':
            r = subprocess.run(['node', '/tmp/tools/sin_clips.mjs', ruta, dst], capture_output=True, text=True, cwd='/tmp/tools')
            if r.returncode != 0 or not os.path.exists(dst):
                print('  con clips', os.path.basename(ruta), r.stderr[-300:])
                return ruta
        if not os.path.exists(dst):
            r = subprocess.run(['node', '/tmp/tools/node_modules/@gltf-transform/cli/bin/cli.js', 'quantize', ruta, dst,
                                '--quantize-position', '14', '--quantize-normal', '10', '--quantize-texcoord', '12'], capture_output=True, text=True)
            if r.returncode != 0 or not os.path.exists(dst):
                print('  sin cuantizar', os.path.basename(ruta), r.stderr[-200:])
                return ruta
        return dst
    from PIL import Image
    dst = os.path.join(CACHE, clave + '.webp')
    if not os.path.exists(dst):
        im = Image.open(ruta)
        if lado and max(im.size) > lado:
            f = lado / max(im.size)
            im = im.resize((max(1, round(im.size[0] * f)), max(1, round(im.size[1] * f))), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=calidad, method=6)
    return dst


def uri(ruta):
    ext = os.path.splitext(ruta)[1].lower()
    with open(ruta, 'rb') as f:
        return 'data:%s;base64,%s' % (MIME[ext], base64.b64encode(f.read()).decode())


def leer(nombre):
    p = os.path.join(GEN, nombre + '.json')
    if not os.path.exists(p):
        # sin manifiesto todavía (el procesado sigue): se arma uno provisorio con lo que ya está en la carpeta
        d = os.path.join(GEN, nombre)
        if nombre in ('mod', 'pj') and os.path.isdir(d):
            out = []
            for f in sorted(os.listdir(d)):
                if f.endswith('.glb'):
                    i = f[:-4]
                    out.append({'id': i, 'glb': os.path.join(d, f), **{k: os.path.join(d, '%s_%s.webp' % (i, k)) for k in ('color', 'normal', 'mr')}})
            return out
        return []
    with open(p) as f:
        d = json.load(f)
    d = d if isinstance(d, list) else d.get('items', [])
    # lo que ya está procesado en la carpeta pero todavía no figura en el manifiesto
    carpeta = os.path.join(GEN, nombre)
    if nombre in ('mod', 'pj') and os.path.isdir(carpeta):
        ids = {e['id'] for e in d}
        for f in sorted(os.listdir(carpeta)):
            if f.endswith('.glb') and f[:-4] not in ids:
                i = f[:-4]
                d.append({'id': i, 'glb': os.path.join(carpeta, f), **{k: os.path.join(carpeta, '%s_%s.webp' % (i, k)) for k in ('color', 'normal', 'mr')}})
    return d


def armar(solo=None, sin=False, salida=SALIDA):
    ARCH, MAN, peso = {}, {k: [] for k in ('tex', 'cielo', 'arte', 'nubes', 'mod', 'pj', 'aud')}, {}
    quiere = lambda k: not sin and (not solo or k in solo)

    ARMAS_JUG = {'jet_tomcat', 'jet_viper', 'jet_flanker', 'jet_sombra', 'jet_as', 'jet_enemigo'}

    def mete(clave, ruta, cat):
        if ruta and not os.path.isabs(ruta):
            ruta = os.path.join(GEN, ruta)
        if ruta and os.path.exists(ruta):
            partes = clave.split('/')
            if clave.startswith('glb/'):
                idg = partes[1]
                simp = SIMPLIFICAR.get(idg) or ((0.15, 0.03) if idg.endswith('_lod') else None)
                ruta = presupuesto(ruta, glb='piel' if cat == 'pj' else True, simp=simp)
            elif cat == 'tex':
                ruta = presupuesto(ruta, 256 if partes[-1] == 'orm' else 512, 84 if partes[-1] == 'normal' else 80)
            elif cat in ('mod', 'pj'):
                cerca = partes[1] in ARMAS_JUG or cat == 'pj'
                ruta = presupuesto(ruta, (1024 if cerca else 512) if partes[-1] == 'color' else (512 if cerca else 256), 80)
            elif cat == 'arte':
                ruta = presupuesto(ruta, 1280, 78)
            elif cat == 'nubes':
                ruta = presupuesto(ruta, 512, 82)
            ARCH[clave] = uri(ruta)
            peso[cat] = peso.get(cat, 0) + len(ARCH[clave])
            return True
        return False

    if quiere('tex'):
        for e in leer('tex'):
            ok = mete('tex/%s/albedo' % e['id'], e.get('albedo'), 'tex')
            mete('tex/%s/normal' % e['id'], e.get('normal'), 'tex')
            mete('tex/%s/orm' % e['id'], e.get('orm'), 'tex')
            if ok:
                MAN['tex'].append({k: e.get(k) for k in ('id', 'metros', 'normalScale', 'rugosidad', 'metal', 'color_medio')})
    if quiere('cielo'):
        # el sol pintado se gira hacia donde conviene al juego (atrás o al costado de la vista, no de frente)
        GIRO_AZ = {}
        for e in leer('cielo'):
            ruta = e.get('archivo')
            if ruta and not os.path.isabs(ruta):
                ruta = os.path.join(GEN, ruta)
            sol = dict(e.get('sol') or {})
            if ruta and os.path.exists(ruta) and e['id'] in GIRO_AZ and sol.get('az') is not None:
                from PIL import Image
                import numpy as np
                im = np.array(Image.open(ruta).convert('RGB'))
                dx = int(round((GIRO_AZ[e['id']] - sol['az']) / 360 * im.shape[1]))
                os.makedirs(CACHE, exist_ok=True)
                dst = os.path.join(CACHE, 'cielo_%s_%d.webp' % (e['id'], dx))
                if not os.path.exists(dst):
                    Image.fromarray(np.roll(im, dx, axis=1)).save(dst, 'WEBP', quality=84)
                ruta = dst
                sol['az'] = (sol['az'] + dx / im.shape[1] * 360) % 360
            if mete('cielo/' + e['id'], ruta, 'cielo'):
                m = {k: e.get(k) for k in ('id', 'bruma_sol', 'bruma_opuesta', 'cenit', 'horizonte')}
                m['sol'] = sol
                MAN['cielo'].append(m)
    if quiere('nubes'):
        for e in leer('nubes'):
            if mete('nubes/' + e['id'], e.get('archivo'), 'nubes'):
                MAN['nubes'].append({k: e.get(k) for k in ('id', 'vista', 'base_v', 'cobertura')})
    if quiere('arte'):
        for e in leer('arte'):
            if mete('arte/' + e['id'], e.get('archivo') or e.get('webp') or e.get('ruta'), 'arte'):
                MAN['arte'].append({'id': e['id']})
    for cat in ('mod', 'pj'):
        if not quiere(cat):
            continue
        for e in leer(cat):
            if not mete('glb/' + e['id'], e.get('glb'), cat):
                continue
            for k in ('color', 'normal', 'mr'):
                mete('%s/%s/%s' % (cat, e['id'], k), e.get(k), cat)
            MAN[cat].append({k: e.get(k) for k in ('id', 'tris', 'caja', 'metal', 'rugosidad', 'puntos', 'mapa', 'mira', 'alto', 'clips', 'huesos') if e.get(k) is not None})
            # las armas que llevan los enemigos: una versión simplificada que comparte las texturas
            if False and mete('glb/%s_lod' % e['id'], e.get('glb'), cat):
                MAN[cat].append({'id': e['id'] + '_lod', 'base': e['id'], 'caja': e.get('caja'), 'puntos': e.get('puntos'), 'metal': e.get('metal'), 'rugosidad': e.get('rugosidad')})
    if quiere('aud'):
        for e in leer('aud'):
            if mete('aud/' + e['id'], e.get('archivo'), 'aud'):
                MAN['aud'].append({k: e.get(k) for k in ('id', 'dur', 'bucle') if e.get(k) is not None})

    if not sin and not any(MAN.values()) and os.path.exists(SALIDA):
        # no hay carpeta de generados (sesión nueva, contenedor limpio): se reusan los assets del HTML ya armado
        with open(SALIDA) as f:
            viejo = f.read()
        a = viejo.index('window.ARCH=') + len('window.ARCH='); b = viejo.index(';\nwindow.MAN=', a)
        c = b + len(';\nwindow.MAN='); d = viejo.index(';\n</script>', c)
        ARCH, MAN = json.loads(viejo[a:b]), json.loads(viejo[c:d])
        print('assets tomados del HTML armado:', len(ARCH))
    js = '<script>/* assets generados con Rezona y procesados (ver CLAUDE.md) */\nwindow.ARCH=' + json.dumps(ARCH, separators=(',', ':')) + ';\nwindow.MAN=' + json.dumps(MAN, ensure_ascii=False, separators=(',', ':')) + ';\n</script>\n'
    assert '</script' not in js[8:-10].lower()
    trozos = []
    for p in PARTES:
        if p == '@assets':
            trozos.append(js)
        else:
            with open(os.path.join(BASE, p)) as f:
                trozos.append(f.read())
    html = ''.join(trozos)
    with open(salida, 'w') as f:
        f.write(html)
    kb = lambda n: round(n * 3 / 4 / 1024)
    print('HTML %.2f MB · ' % (len(html) / 1e6) + ' · '.join('%s %d KB' % (k, kb(v)) for k, v in sorted(peso.items())), '·', sum(len(v) for v in MAN.values()), 'assets')


if __name__ == '__main__':
    a = sys.argv[1:]
    solo = set(a[a.index('--solo') + 1].split(',')) if '--solo' in a else None
    salida = a[a.index('--salida') + 1] if '--salida' in a else SALIDA
    armar(solo, '--sin-assets' in a, salida)
