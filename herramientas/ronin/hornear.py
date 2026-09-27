#!/usr/bin/env python3
"""Hornea los assets del juego a herramientas/ronin/assets/: personajes (con procesar.py) y fondos (WebP recortado).
  python3 hornear.py [pj ...]   (sin argumentos: todo lo que tenga cuadros en /tmp/ronin/f)"""
import sys, os, json, subprocess, glob
from PIL import Image
AQ = os.path.dirname(os.path.abspath(__file__)); DEST = os.path.join(AQ, 'assets')
F = '/tmp/ronin/f24'   # los cuadros a 24 por segundo (los de 12 quedaron en /tmp/ronin/f)
def ultimo(nom):   # la versión aprobada: _v2 pisa a la primera si existe
    for n in (nom + '_v3', nom + '_v2', nom):
        if os.path.isdir(os.path.join(F, n)) and glob.glob(os.path.join(F, n, 'a_*.png')): return n
    return None
# 'fj' es a cuántos cuadros por segundo pasa el juego esa animación (su fpsAnim): con eso procesar.py saca los cuadros que
# hacen falta para verla a 30 por segundo sin cambiar lo que dura
HEROE = {'quieto':{'loop':True, 'max':12, 'recortar':False, 'fps':8, 'fj':8}, 'caminar':{'loop':True, 'max':12, 'recortar':False, 'fps':12, 'fj':14},
  'tajo':{'golpe':True, 'max':14, 'fj':22}, 'tajo2':{'golpe':True, 'max':12, 'fj':24}, 'tajo3':{'golpe':True, 'max':12, 'fj':24},
  'guardia':{'max':10, 'fj':26}, 'desvio':{'max':10, 'fj':26}, 'esquive':{'max':12, 'fj':26}, 'golpeado':{'max':9, 'fj':20},
  'muerte':{'max':14, 'fj':12}, 'habilidad':{'max':18, 'fj':16}, 'victoria':{'max':14, 'fj':12}, 'relampago':{'max':16, 'fj':26},
  'chiburi':{'max':14, 'fj':16}, 'aturdido':{'loop':True, 'max':12, 'recortar':False, 'fps':10, 'fj':10}, 'bloqueo':{'max':9, 'fj':22},
  'remate':{'golpe':True, 'max':16, 'fj':20}, 'levantarse':{'max':16, 'fj':14}}
ENEM = {'quieto':{'loop':True, 'max':10, 'recortar':False, 'fps':8, 'fj':8}, 'caminar':{'loop':True, 'max':10, 'recortar':False, 'fps':12, 'fj':12},
  'ataque':{'golpe':True, 'max':12, 'fj':16}, 'pesado':{'golpe':True, 'max':14, 'fj':13}, 'golpeado':{'max':8, 'fj':20}, 'muerte':{'max':12, 'fj':12},
  'especial':{'golpe':True, 'max':14, 'fj':13}, 'guardia':{'max':9, 'fj':22}, 'aturdido':{'loop':True, 'max':12, 'recortar':False, 'fps':10, 'fj':10},
  'burla':{'max':14, 'fj':14}}
YOK = {'quieto':{'loop':True, 'max':10, 'recortar':False, 'fps':8, 'fj':8}, 'ataque':{'golpe':True, 'max':12, 'fj':16}, 'pesado':{'golpe':True, 'max':14, 'fj':13},
  'golpeado':{'max':8, 'fj':20}, 'muerte':{'max':12, 'fj':12}, 'rugido':{'max':14, 'fj':14}, 'aturdido':{'loop':True, 'max':12, 'recortar':False, 'fps':10, 'fj':10}}
ALTO = {'heroe':300, 'j_general':320, 'j_oni':330, 'y_gashadokuro':320, 'y_oogama':300}
EXTRA = {('e_bandido', 'golpeado'):{'sinverde':True}, ('j_general', 'guardia'):{'solo_mayor':True}}   # una mancha de sangre con verde de fondo adentro
SRC_HEROE = {'tajo':'heroe_tajo', 'quieto':'heroe_quieto', 'relampago':'heroe_relampago'}
def pj(p):
    base = HEROE if p == 'heroe' else YOK if p.startswith('y_') else ENEM
    anims = {}
    for a, s in base.items():
        src = ultimo(SRC_HEROE.get(a, f'{p}_{a}') if p == 'heroe' else f'{p}_{a}')
        if not src: continue
        anims[a] = dict(s, src=src, **EXTRA.get((p, a), {}), **({'sincian':True} if p == 'e_shinobi' else {}))
    if 'quieto' not in anims: print('falta quieto de', p); return
    spec = {'pj':p, 'alto':ALTO.get(p, 280), 'raiz_de':'quieto', 'anims':anims}
    sp = f'/tmp/ronin/spec_{p}.json'; json.dump(spec, open(sp, 'w'))
    subprocess.run(['python3', os.path.join(AQ, 'procesar.py'), sp, os.path.join(DEST, p)], check=True)
def fondos():
    os.makedirs(os.path.join(DEST, 'fondos'), exist_ok=True)
    fs = {'f_bambu':'/tmp/ronin/fondo_bambu-g1.png'}
    for k in ['f_templo', 'f_luna', 'f_yokai', 'f_aldea']: fs[k] = f'/tmp/ronin/crudo/{k}-g1.png'
    for k, f in fs.items():
        im = Image.open(f).convert('RGB'); w, h = im.size
        im = im.crop((int(w*0.012), int(h*0.01), int(w*0.988), int(h*0.955))).resize((1600, int(1600*h*0.945/(w*0.976))), Image.LANCZOS)
        ruta = os.path.join(DEST, 'fondos', k + '.webp'); im.save(ruta, 'WEBP', quality=68, method=6); print(k, im.size, os.path.getsize(ruta)//1024, 'KB')
if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or 'fondos' in args: fondos()
    for p in (a for a in args if a != 'fondos'): pj(p)
