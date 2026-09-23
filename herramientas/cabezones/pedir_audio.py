"""Pide a Rezona la música, voces o efectos de CABEZONES y los baja. Reintenta NOIZ_FAILED (el
proveedor de audio se cae seguido) cada 2 minutos, hasta `tope` vueltas.
Uso: python3 pedir_audio.py audio.json carpeta [tope]
audio.json: [[nombre, kind, segundos_o_null, prompt], ...]
"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
from rz import Sesion

PROYECTO = 'RTkRyBVlHX'
pedidos, sal = json.load(open(sys.argv[1])), sys.argv[2]
tope = int(sys.argv[3]) if len(sys.argv) > 3 else 15
os.makedirs(sal, exist_ok=True)
S = Sesion()
for vuelta in range(tope):
    falta = [p for p in pedidos if not os.path.exists(os.path.join(sal, p[0] + '.mp3'))]
    if not falta:
        break
    vuelo = {}
    for p in falta:
        a = {'project_id': PROYECTO, 'output_path': 'assets/cab-%s.mp3' % p[0], 'kind': p[1], 'prompt': p[3], 'output_format': 'mp3'}
        if p[2]:
            a['duration'] = p[2]
        r = S.call('submit_audio_generation', a)
        if r.get('task_id'):
            vuelo[r['task_id']] = p
        else:
            print('NO ENTRÓ', p[0], json.dumps(r)[:150], flush=True)
    while vuelo:
        time.sleep(15)
        est = S.call('check_generation_tasks', {'task_ids': list(vuelo), 'project_id': PROYECTO})
        for it in est.get('items', []):
            st = it.get('status')
            if st in ('ready', 'failed'):
                p = vuelo.pop(it['task_id'])
                if st == 'ready':
                    subprocess.run(['curl', '-sSf', '-o', os.path.join(sal, p[0] + '.mp3'), it['public_url']])
                    print('LISTO', p[0], flush=True)
                else:
                    print('FALLÓ', p[0], (it.get('failure') or {}).get('provider_code'), flush=True)
    print('vuelta', vuelta, 'terminada', flush=True)
    time.sleep(120)
S.cerrar()
print('FIN', flush=True)
