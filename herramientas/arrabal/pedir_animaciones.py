"""Pide a Rezona los videos de las animaciones de ARRABAL y los baja (12 en vuelo, el tope).

Cada video (4 s, 480p, 1:1) arranca de la pose base del luchador (fuentes/<id>.jpg, fondo
verde o magenta plano) y hace UN movimiento con la cámara quieta. Después hornear_animaciones.py
saca 24 cuadros del tramo en que se mueve y le quita el fondo.
Uso: python3 pedir_animaciones.py <commit_con_las_fuentes> <carpeta_salida> [id:anim ...]
"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
from rz import Sesion

PROYECTO = 'RTkRyBVlHX'
COMMIT, SALIDA = sys.argv[1], sys.argv[2]
FUENTE = 'https://raw.githubusercontent.com/Juniorspro/Theclaudianos/%s/herramientas/arrabal/fuentes/%s.jpg'
MAGENTA = {'xiao', 'mate', 'parca'}
QUIEN = {
    'morocha': 'the tango dancer woman in the red dress',
    'bandoneon': 'the burly strongman with brass bellows gauntlets',
    'chispa': 'the young lamplighter woman with the lantern pole',
    'mate': 'the old gaucho with the electric boleadoras',
    'parca': 'the ghostly drowned woman with the anchor and chain',
    'colectivo': 'the young mechanic in yellow overalls with the giant wrench',
    'kanji': 'the old bald karate master',
    'xiao': 'the kung fu girl with the long red staff',
    'buzo': 'the commando woman with the harpoon speargun',
    'lobizon': 'the werewolf',
    'toro': 'the huge masked bull wrestler',
    'vale': 'the schoolgirl with the hockey stick',
}
GOLPE = {
    'morocha': 'throws one fast straight punch to the right',
    'bandoneon': 'throws one heavy straight punch to the right with his brass gauntlet',
    'chispa': 'swings her lamplighter pole forward to the right in one fast strike',
    'mate': 'whips the boleadoras forward to the right in one fast strike',
    'parca': 'swings the anchor on its chain forward to the right in one strike',
    'colectivo': 'swings the giant wrench forward to the right in one fast strike',
    'kanji': 'throws one fast straight punch to the right',
    'xiao': 'thrusts her long staff forward to the right in one fast strike',
    'buzo': 'jabs forward to the right with the butt of her harpoon speargun',
    'lobizon': 'slashes forward to the right with his claws',
    'toro': 'throws one heavy straight punch to the right',
    'vale': 'swings her hockey stick forward to the right in one fast strike',
}
ESPECIAL = {
    'morocha': 'spins on one heel and delivers a spinning high kick to the right, with a trail of red petals',
    'bandoneon': 'squeezes his bellows gauntlets together and blasts a burst of wind forward to the right',
    'chispa': 'thrusts her lantern pole forward and a burst of fire shoots out to the right',
    'mate': 'swings the boleadoras over his head and throws a crackle of blue electricity forward to the right',
    'parca': 'raises her arms and a wave of glowing ghost fish rushes forward to the right',
    'colectivo': 'winds up and throws his giant wrench forward to the right, spinning',
    'kanji': 'pushes a glowing golden open palm strike forward to the right with a flash of energy',
    'xiao': 'spins her staff in a fast whirlwind and strikes forward to the right',
    'buzo': 'aims the harpoon speargun and fires a harpoon to the right with a flash',
    'lobizon': 'howls and lunges forward to the right with both claws in a fast double slash',
    'toro': 'lowers his horns and charges forward with a heavy shoulder tackle to the right',
    'vale': 'swings her hockey stick hard and hits a glowing ball flying to the right',
}
ANIMS = {
    'idle': '{q} breathes in a relaxed fighting stance, bouncing gently on the knees, a calm looping idle animation',
    'caminar': '{q} walks forward to the right in place, like on a treadmill, one full walk cycle, staying in the center',
    'golpe': '{q} {golpe} and then returns to the fighting stance',
    'patada': '{q} throws one high side kick to the right and then returns to the fighting stance',
    'especial': '{q} {esp} and then returns to the fighting stance',
    'golpeado': '{q} gets hit hard in the face, recoils backward in pain and then recovers to the fighting stance',
    'caida': '{q} is knocked out: gets thrown backward, falls onto the floor and lies there',
    'victoria': '{q} celebrates the victory with a proud triumphant pose',
}
COLA = (' 2D hand-painted fighting game character animation, side view facing right, the camera is completely static '
        'and locked, flat solid {fondo} background that stays exactly the same, the character stays in place at the '
        'same size, no camera movement, no zoom, no cuts, no background change, no other characters, no text.')


# el filtro de contenido de Rezona rebota algunos textos: estos van con otras palabras
ALTERNATIVO = {
    ('mate', 'victoria'): 'The old gaucho with the boleadoras lifts his hat in the air and smiles, happy after the match',
    ('parca', 'golpe'): 'The ghost woman swings her heavy chain forward to the right in one strike and then returns to her stance',
}


def pedido(n, a):
    txt = ALTERNATIVO.get((n, a)) or ANIMS[a].format(q=QUIEN[n].capitalize(), golpe=GOLPE[n], esp=ESPECIAL[n])
    txt += COLA.format(fondo='magenta' if n in MAGENTA else 'green')
    return {'project_id': PROYECTO, 'output_path': 'assets/anim-%s-%s.mp4' % (n, a), 'prompt': txt,
            'source_url': FUENTE % (COMMIT, n), 'seconds': 4, 'resolution': '480p', 'ratio': '1:1'}


def main():
    os.makedirs(SALIDA, exist_ok=True)
    trabajos = [x.split(':') for x in sys.argv[3:]] or [(n, a) for n in QUIEN for a in ANIMS]
    trabajos = [(n, a) for n, a in trabajos if not os.path.exists(os.path.join(SALIDA, '%s-%s.mp4' % (n, a)))]
    S = Sesion()
    vuelo, fallos, reintentos = {}, [], {}
    try:
        while trabajos or vuelo:
            while trabajos and len(vuelo) < 12:
                n, a = trabajos.pop(0)
                r = S.call('submit_video_generation', pedido(n, a))
                txt = json.dumps(r, ensure_ascii=False)
                tid = r.get('task_id') if isinstance(r, dict) else None
                if not tid:
                    import re
                    m = re.search(r'gtask-[0-9a-f]+', txt)
                    tid = m.group(0) if m else None
                if tid:
                    vuelo[tid] = (n, a)
                elif 'transient' in txt and reintentos.get((n, a), 0) < 6:
                    reintentos[(n, a)] = reintentos.get((n, a), 0) + 1
                    trabajos.append((n, a))                 # error pasajero: vuelve a la cola
                    print('REINTENTO', n, a, flush=True)
                    time.sleep(15)
                    break
                else:
                    fallos.append((n, a, txt[:200]))
                    print('NO ENTRÓ', n, a, txt[:200], flush=True)
            time.sleep(20)
            if not vuelo:
                continue
            est = S.call('check_generation_tasks', {'task_ids': list(vuelo), 'project_id': PROYECTO})
            for it in (est.get('items') if isinstance(est, dict) else []) or []:
                tid = it.get('task_id')
                if tid not in vuelo:
                    continue
                n, a = vuelo[tid]
                if it.get('status') == 'ready':
                    url = it.get('public_url') or ('https://lab.rezona.ai/game/pgcserver/pv/%s/%s' % (PROYECTO, it.get('asset_path')))
                    dest = os.path.join(SALIDA, '%s-%s.mp4' % (n, a))
                    subprocess.run(['curl', '-sS', '-o', dest, url], check=True)
                    print('LISTO', n, a, os.path.getsize(dest), flush=True)
                    del vuelo[tid]
                elif it.get('status') == 'failed':
                    print('FALLÓ', n, a, it.get('error'), flush=True)
                    fallos.append((n, a, it.get('error')))
                    del vuelo[tid]
    finally:
        S.cerrar()
    print('FIN. fallos:', len(fallos), fallos, flush=True)


if __name__ == '__main__':
    main()
