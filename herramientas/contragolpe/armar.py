#!/usr/bin/env python3
"""Arma CONTRAGOLPE: junta las partes y mete adentro los assets procesados (manifiestos de gen/listo) y los mapas de luz horneados.

  python3 armar.py                  → juegos-pc/Contragolpe.html
  python3 armar.py --sin-assets     → sin ARCH (para comparar contra lo dibujado por código)
  python3 armar.py --solo tex,luz   → sólo esas categorías

Los mapas de luz salen del banco (banco/hornear.js corre el juego y guarda luz/<mapa>.png + .json con la huella de la geometría);
si la geometría cambia, la huella no coincide y el juego hornea uno rápido al cargar hasta que se vuelva a hornear.
En una sesión nueva sin la carpeta de generados, se reusan los assets del HTML ya armado.
"""
import base64, json, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(AQUI, 'partes')
GEN = os.environ.get('CG_GEN', '/tmp/claude-0/cs/gen/listo')
LUZ = os.path.join(AQUI, 'luz')
SALIDA = os.path.normpath(os.path.join(AQUI, '..', '..', 'juegos-pc', 'Contragolpe.html'))
PARTES = ['c0.html', 'three.html', '@assets', 'c1.js', 'c1i.js', 'c1c.js', 'c1s.js', 'c2.js', 'c3f.js', 'c3t.js', 'c3k.js', 'c3p.js', 'c3n.js', 'c3m.js',
          'c4m.js', 'c4a.js', 'c4v.js', 'c4x.js', 'c4n.js', 'c4p.js', 'c5.js', 'c5d.js', 'c5b.js', 'c6.js', 'c6h.js', 'c6m.js', 'c7.js']
MIME = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav'}
CACHE = os.environ.get('CG_CACHE', '/tmp/claude-0/cs/gen/cache')


def presupuesto(ruta, lado=None, calidad=82, alfa=False, sin_perdida=False):
    """Achica a lo que se ve en un teléfono (con caché): imágenes a `lado` px en webp."""
    import hashlib
    from PIL import Image
    os.makedirs(CACHE, exist_ok=True)
    clave = hashlib.md5(('%s|%s|%s|%s|%s|%s' % (ruta, os.path.getmtime(ruta), lado, calidad, alfa, sin_perdida)).encode()).hexdigest()[:16]
    dst = os.path.join(CACHE, clave + '.webp')
    if not os.path.exists(dst):
        im = Image.open(ruta)
        im = im.convert('RGBA' if (alfa or im.mode in ('RGBA', 'LA', 'P')) else 'RGB')
        if lado and max(im.size) > lado:
            f = lado / max(im.size)
            im = im.resize((max(1, round(im.size[0] * f)), max(1, round(im.size[1] * f))), Image.LANCZOS)
        if sin_perdida:
            im.save(dst, 'WEBP', lossless=True, method=6, exact=True)
        else:
            im.save(dst, 'WEBP', quality=calidad, method=6)
    return dst


def uri(ruta):
    ext = os.path.splitext(ruta)[1].lower()
    with open(ruta, 'rb') as f:
        return 'data:%s;base64,%s' % (MIME[ext], base64.b64encode(f.read()).decode())


def leer(nombre):
    p = os.path.join(GEN, nombre + '.json')
    if not os.path.exists(p):
        return []
    with open(p) as f:
        d = json.load(f)
    return d if isinstance(d, list) else d.get('items', [])


def armar(solo=None, sin=False, salida=SALIDA):
    ARCH, MAN, peso = {}, {k: [] for k in ('tex', 'cielo', 'arte', 'decal', 'aud', 'luz', 'mocap')}, {}
    quiere = lambda k: not sin and (not solo or k in solo)

    def mete(clave, ruta, cat, **kw):
        if ruta and not os.path.isabs(ruta):
            ruta = os.path.join(GEN, ruta)
        if not ruta or not os.path.exists(ruta):
            return False
        partes = clave.split('/')
        if cat == 'tex':
            ruta = presupuesto(ruta, 256 if partes[-1] == 'orm' else 512, 84 if partes[-1] == 'normal' else 80)
        elif cat == 'arte':
            ruta = presupuesto(ruta, 1280, 78)
        elif cat == 'cielo':
            ruta = presupuesto(ruta, 2048, 84)
        elif cat == 'decal':
            ruta = presupuesto(ruta, 512, 86, alfa=True)
        elif cat == 'luz':
            ruta = presupuesto(ruta, None, 95, alfa=True, sin_perdida=True)
        ARCH[clave] = uri(ruta)
        peso[cat] = peso.get(cat, 0) + len(ARCH[clave])
        return True

    if quiere('tex'):
        for e in leer('tex'):
            if mete('tex/%s/albedo' % e['id'], e.get('albedo'), 'tex'):
                mete('tex/%s/normal' % e['id'], e.get('normal'), 'tex')
                MAN['tex'].append({k: e.get(k) for k in ('id', 'metros', 'normalScale', 'rugosidad', 'metal', 'color_medio', 'modo') if e.get(k) is not None})
    if quiere('cielo'):
        for e in leer('cielo'):
            if mete('cielo/' + e['id'], e.get('archivo'), 'cielo'):
                MAN['cielo'].append({k: e.get(k) for k in ('id', 'sol', 'cenit', 'horizonte', 'bruma_sol', 'bruma_opuesta') if e.get(k) is not None})
    if quiere('decal'):
        for e in leer('decal'):
            if mete('decal/' + e['id'], e.get('archivo'), 'decal'):
                MAN['decal'].append({k: e.get(k) for k in ('id', 'ancho_m', 'alto_m') if e.get(k) is not None})
    if quiere('arte'):
        for e in leer('arte'):
            if mete('arte/' + e['id'], e.get('archivo') or e.get('webp') or e.get('ruta'), 'arte'):
                MAN['arte'].append({'id': e['id']})
    if quiere('aud'):
        for e in leer('aud'):
            if mete('aud/' + e['id'], e.get('archivo'), 'aud'):
                MAN['aud'].append({k: e.get(k) for k in ('id', 'dur', 'bucle') if e.get(k) is not None})
    if quiere('mocap'):
        for e in leer('mocap'):
            ruta = e.get('archivo') or os.path.join(GEN, 'mocap', e['id'] + '.json')
            if not os.path.isabs(ruta):
                ruta = os.path.join(GEN, ruta)
            if os.path.exists(ruta) and e.get('bueno', True):
                with open(ruta) as f:
                    clip = json.load(f)
                # se redondea a milímetros: el clip pesa la tercera parte
                clip['cuadros'] = [[[round(v, 3) for v in p] for p in q] for q in clip.get('cuadros', [])]
                if 'puntas_pie' in clip:
                    clip['puntas_pie'] = [[[round(v, 3) for v in p] for p in q] for q in clip['puntas_pie']]
                MAN['mocap'].append({k: clip.get(k) for k in ('id', 'fps', 'bucle', 'juntas', 'cuadros', 'puntas_pie', 'velocidad_mps') if clip.get(k) is not None})
                peso['mocap'] = peso.get('mocap', 0) + len(json.dumps(MAN['mocap'][-1]))
    if quiere('luz') and os.path.isdir(LUZ):
        for f in sorted(os.listdir(LUZ)):
            if f.endswith('.json'):
                with open(os.path.join(LUZ, f)) as h:
                    m = json.load(h)
                png, sol = os.path.join(LUZ, m['id'] + '.png'), os.path.join(LUZ, m['id'] + '_sol.png')
                if os.path.exists(png) and os.path.exists(sol) and mete('luz/' + m['id'], png, 'luz') and mete('luz/' + m['id'] + '_sol', sol, 'luz'):
                    MAN['luz'].append({k: m.get(k) for k in ('id', 'huella', 'w', 'h')})

    if not sin and not any(MAN[k] for k in ('tex', 'cielo', 'arte', 'decal', 'aud')) and os.path.exists(SALIDA):
        with open(SALIDA) as f:
            viejo = f.read()
        try:
            a = viejo.index('window.ARCH=') + len('window.ARCH='); b = viejo.index(';\nwindow.MAN=', a)
            c = b + len(';\nwindow.MAN='); d = viejo.index(';\n</script>', c)
            A2, M2 = json.loads(viejo[a:b]), json.loads(viejo[c:d])
            for k, v in A2.items():
                if not k.startswith('luz/') and k not in ARCH:
                    ARCH[k] = v
            for k, v in M2.items():
                if k != 'luz' and not MAN.get(k):
                    MAN[k] = v
            print('assets tomados del HTML armado:', len(A2))
        except ValueError:
            pass
    js = '<script>/* assets generados con Rezona y procesados, y mapas de luz horneados (ver CLAUDE.md) */\nwindow.ARCH=' + json.dumps(ARCH, separators=(',', ':')) + ';\nwindow.MAN=' + json.dumps(MAN, ensure_ascii=False, separators=(',', ':')) + ';\n</script>\n'
    assert '</script' not in js[8:-10].lower()
    trozos = []
    for p in PARTES:
        if p == '@assets':
            trozos.append(js)
            continue
        ruta = os.path.join(BASE, p)
        if os.path.exists(ruta):
            with open(ruta) as f:
                trozos.append(f.read())
    html = ''.join(trozos)
    with open(salida, 'w') as f:
        f.write(html)
    kb = {k: round(v / 1024) for k, v in sorted(peso.items())}
    print('HTML %.2f MB · %s · %d assets' % (len(html) / 1048576, ' · '.join('%s %d KB' % kv for kv in kb.items()), len(ARCH)))


if __name__ == '__main__':
    a = sys.argv[1:]
    solo = None
    if '--solo' in a:
        solo = set(a[a.index('--solo') + 1].split(','))
    salida = a[a.index('--salida') + 1] if '--salida' in a else SALIDA
    armar(solo=solo, sin='--sin-assets' in a, salida=salida)
