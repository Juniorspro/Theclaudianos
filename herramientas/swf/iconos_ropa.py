#!/usr/bin/env python3
"""Las baldosas de la ropa para la tienda: madness_item_portrait (8254) en su cuadro de la
categoria, con la prenda en el cuadro que le da el codigo del SWF (myMask.gotoAndStop(myType)).

  python3 herramientas/swf/iconos_ropa.py [crudo/swf/mpn.swf] [crudo/tienda/ropa]
  -> <carpeta>/<id>.svg, .png y .webp, y nevada/js/ropa_swf.js (window.ROPA_SWF.baldosa[id])
  Rasteriza con herramientas/swf/rasterizar.js y pasa a webp con imagen.js (Chromium).

Misma encuadre que las baldosas de armas de tienda_swf.js (Ruffle, x3): pixel = 3 * px + 6, o
sea la caja (-2, -2, 88, 110) a escala 3 da 270 x 336.
- Las mascaras con dos lados (flipMe: agent2_mask, agent3_mask) no tienen rotulo propio en
  MasksAll, solo _R y _L: el original se quedaba en el cuadro 1 (otra mascara). Va la _R.
- Los trajes de agente no se venden en el SWF: son el cuerpo del agente ('Parts - Body', 7289,
  cuadros agent / agent2 / agent3), puesto donde el retrato pone la ropa (myShirt).
- Cascos (HatsAll 7363, myHat), mascaras (MasksAll 7358, myMask), bocas (MouthsAll 7318, myMouth) y
  chalecos (Outfit - Body - Core 7295, myShirt): el cuadro hat / mask / mouth / shirt del retrato.
"""
import base64, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from swf import SWF
from svg import documento

RETRATO, CAJA, ESCALA = 8254, (-2, -2, 88, 110), 3
FUERA = {'gunNameTEXT', 'myShade', 'amEquipped', 'selectMe', 'amSpecial'}
# del cuerpo del agente solo el traje (bodySprite): fuera el arma de la espalda (myBackup), la ropa de
# encima (myShirt, cuadro 0 = armor1) y el brazalete de equipo (teamColor, verde)
FUERA_CUERPO = {'myBackup', 'myShirt', 'teamColor'}
# el cuerpo (34 x 61 px, centro en 0,-0,5) a escala 0,95 centrado en (40, 44), el centro de la ropa
# de la tienda (armor1 de 'Outfit - Body - Core' puesto por el retrato)
M_CUERPO = (0.95, 0.0, 0.0, 0.95, 800, 890)
# id de la tienda -> (cuadro del retrato, instancia, simbolo, rotulo de la prenda): TODO lo que la
# tienda vende (lo modelado en 3D: Prendas.modelada). El rotulo es el id del SWF salvo las mascaras con
# dos lados, que van con la _R.
CATS = {'hat': ('hat', 'myHat', 7363), 'mask': ('mask', 'myMask', 7358), 'mouth': ('mouth', 'myMouth', 7318),
        'shirt': ('shirt', 'myShirt', 7295), 'traje': ('shirt', 'myShirt', 7289)}
VENTA = {
    'hat':   ['hat1', 'hat2', 'hat3', 'hat4', 'hat5', 'hat6', 'headphones', 'top', 'fedora', 'hat9', 'helmet1', 'helmet3'],
    'mask':  ['agent1_mask', 'agent1_mask_b', 'agent2_mask', 'agent3_mask', 'shades1', 'shades3', 'shades5', 'shades8',
              'shades12', 'goggles1', 'paintball1', 'tricky'],
    'mouth': ['mouth3', 'mouth6', 'mask1', 'mouth10', 'mouth1'],
    'shirt': ['armor3'],
    'traje': ['agent', 'agent2', 'agent3'],
}
ROTULO = {'agent2_mask': 'agent2_mask_R', 'agent3_mask': 'agent3_mask_R'}
PRENDAS = {pid: CATS[cat] + (ROTULO.get(pid, pid),) for cat, L in VENTA.items() for pid in L}


def main():
    ruta = sys.argv[1] if len(sys.argv) > 1 else 'crudo/swf/mpn.swf'
    dest = sys.argv[2] if len(sys.argv) > 2 else 'crudo/tienda/ropa'
    os.makedirs(dest, exist_ok=True)
    s = SWF(ruta)
    _, rot_retrato = s.linea(RETRATO)
    trabajos = []
    for pid, (cat, inst, sim, rot) in PRENDAS.items():
        _, rot_sim = s.linea(sim)
        if sim == 7289:
            svg = documento(s, RETRATO, rot_retrato[cat], FUERA | FUERA_CUERPO, caja=CAJA,
                            hijos={inst: (sim, rot_sim[rot], M_CUERPO)})
        else:
            svg = documento(s, RETRATO, rot_retrato[cat], FUERA, caja=CAJA, hijos={inst: (sim, rot_sim[rot])})
        f = os.path.join(dest, pid + '.svg')
        open(f, 'w').write(svg)
        trabajos.append({'svg': f, 'png': os.path.join(dest, pid + '.png'), 'escala': ESCALA, 'caja': list(CAJA)})
    aqui = os.path.dirname(os.path.abspath(__file__))
    tj = os.path.join(dest, 'trabajos.json')
    json.dump(trabajos, open(tj, 'w'), indent=1)
    subprocess.run(['node', os.path.join(aqui, 'rasterizar.js'), tj], check=True, stdout=subprocess.DEVNULL)
    cj = os.path.join(dest, 'webp.json')
    json.dump([{'base': t['png'], 'capas': [], 'salida': t['png'][:-4] + '.webp', 'calidad': 0.9} for t in trabajos],
              open(cj, 'w'))
    subprocess.run(['node', os.path.join(aqui, 'imagen.js'), 'componer', cj], check=True, stdout=subprocess.DEVNULL)
    baldosa = {pid: 'data:image/webp;base64,' + base64.b64encode(open(os.path.join(dest, pid + '.webp'), 'rb').read()).decode()
               for pid in PRENDAS}
    js = os.path.join(aqui, '..', '..', 'nevada', 'js', 'ropa_swf.js')
    with open(js, 'w', encoding='utf-8') as f:
        f.write('/* ropa_swf.js -> GENERADO por herramientas/swf/iconos_ropa.py: no se edita a mano.\n'
                '   Baldosas de la ropa de la tienda: madness_item_portrait (8254) del SWF con la prenda\n'
                '   dentro (HatsAll 7363, MasksAll 7358, MouthsAll 7318, Outfit - Body - Core 7295; los trajes\n'
                '   de agente, bodySprite de Parts - Body 7289), con el\n'
                '   mismo encuadre que las baldosas de armas de tienda_swf.js (270 x 336, x3). */\n'
                '(function (global) {\n  global.ROPA_SWF = ' + json.dumps({'baldosa': baldosa}, separators=(',', ':')) +
                ';\n})(window);\n')
    print(len(trabajos), 'baldosas ->', os.path.relpath(js), '%.1f kB' % (os.path.getsize(js) / 1024))


if __name__ == '__main__':
    main()
