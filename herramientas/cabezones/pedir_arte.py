"""Pide a Rezona una tanda de imágenes y las baja. Reintenta los errores pasajeros y respeta el
tope de tareas en vuelo (12 por cuenta, compartido con cualquier otro script que esté pidiendo).
Uso: python3 pedir_arte.py pedidos.json carpeta_salida
pedidos.json: [[nombre, "WxH", prompt, (opcional) {"transparent": false, ...}], ...]
"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
from rz import Sesion

PROYECTO = 'RTkRyBVlHX'
pedidos, sal = json.load(open(sys.argv[1])), sys.argv[2]
os.makedirs(sal, exist_ok=True)
S = Sesion()
cola = [p for p in pedidos if not os.path.exists(os.path.join(sal, p[0] + '.png'))]
vuelo, intentos = {}, {}
while cola or vuelo:
    while cola and len(vuelo) < 6:
        p = cola[0]
        a = {'project_id': PROYECTO, 'output_path': 'assets/cab-%s.png' % p[0], 'prompt': p[2], 'size': p[1], 'transparent': True}
        if len(p) > 3:
            a.update(p[3])
        r = S.call('submit_image_generation', a)
        if r.get('task_id'):
            vuelo[r['task_id']] = p
            cola.pop(0)
        else:
            txt = json.dumps(r)[:200]
            print('NO ENTRÓ', p[0], txt, flush=True)
            if 'IN_FLIGHT' not in txt:              # el tope en vuelo no cuenta como intento
                intentos[p[0]] = intentos.get(p[0], 0) + 1
                if intentos[p[0]] > 5:
                    cola.pop(0)
            time.sleep(20)
            break
    if not vuelo:
        continue
    time.sleep(12)
    est = S.call('check_generation_tasks', {'task_ids': list(vuelo), 'project_id': PROYECTO})
    for it in est.get('items', []):
        tid, st = it['task_id'], it.get('status')
        if st == 'ready':
            p = vuelo.pop(tid)
            subprocess.run(['curl', '-sSf', '-o', os.path.join(sal, p[0] + '.png'), it['public_url']])
            print('LISTO', p[0], flush=True)
        elif st == 'failed':
            p = vuelo.pop(tid)
            f = it.get('failure') or {}
            print('FALLÓ', p[0], f.get('code'), (it.get('error') or '')[:100], flush=True)
            intentos[p[0]] = intentos.get(p[0], 0) + 1
            if f.get('retryable') and intentos[p[0]] <= 3:
                cola.append(p)
S.cerrar()
print('FIN', flush=True)
