#!/usr/bin/env python3
"""Manda un lote a Rezona reintentando cuando hay límite de tasa, y anota las tareas.
  python3 enviar.py lote.json tareas.json
lote: [{"nombre":…, "tool":…, "args":{…}}]; tareas.json acumula {nombre: {task_id, output_path}}."""
import os, sys, json, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
import rz
lote = json.load(open(sys.argv[1])); dest = sys.argv[2]
hechas = json.load(open(dest)) if os.path.exists(dest) else {}
s = rz.Sesion()
for j in lote:
    nom = j.get('nombre') or j['args']['output_path']
    for intento in range(40):
        r = s.call(j['tool'], j['args'])
        txt = json.dumps(r, ensure_ascii=False)
        if isinstance(r, dict) and r.get('task_id'):
            hechas[nom] = {'task_id': r['task_id'], 'output_path': r['output_path'], 'ignorado': r.get('ignored_params')}
            json.dump(hechas, open(dest, 'w'), indent=1, ensure_ascii=False)
            print('enviado', nom, r['task_id'], r.get('ignored_params'), flush=True); break
        if any(k in txt.upper() for k in ('RATE_LIMIT', 'CONCURREN', 'IN_FLIGHT', 'TOO_MANY', 'LIMIT_REACHED', 'QUOTA_BUSY')):
            time.sleep(min(60, 10 + intento*5)); continue
        print('error', nom, txt[:400], flush=True); break
s.cerrar()
