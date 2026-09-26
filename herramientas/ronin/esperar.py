#!/usr/bin/env python3
"""Espera tareas de Rezona y baja cada una apenas está lista (por su public_url, sin fetch_generated_asset).
  python3 esperar.py PROYECTO DESTINO gtask-a gtask-b ...
Imprime una línea por tarea: listo <archivo> | fallo <motivo>."""
import os, sys, time, json, subprocess
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
import rz
proy, dest, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(dest, exist_ok=True)
pend = set(ids); s = rz.Sesion(); t0 = time.time()
while pend and time.time() - t0 < 3000:
    r = s.call('check_generation_tasks', {'task_ids': sorted(pend), 'project_id': proy})
    for it in (r or {}).get('items', []):
        tid, st = it['task_id'], it['status']
        if st == 'ready' and it.get('public_url'):
            f = os.path.join(dest, it['asset_filename'])
            subprocess.run(['curl', '-sS', '-o', f, it['public_url']], check=False)
            print('listo', f, flush=True); pend.discard(tid)
        elif st in ('failed', 'error', 'cancelled'):
            print('fallo', tid, json.dumps(it.get('failure') or it.get('error'), ensure_ascii=False)[:300], flush=True); pend.discard(tid)
    if pend: time.sleep(20)
for tid in pend: print('sin terminar', tid, flush=True)
s.cerrar()
