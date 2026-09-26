#!/bin/sh
# qa.sh nombre... : baja lo listo, saca cuadros a 12 fps y arma una hoja por animación en el scratchpad
S=/tmp/claude-0/-home-user-Theclaudianos/8563a2aa-76ca-5ddc-aa5a-e5102df0776e/scratchpad
cd "$(dirname "$0")"
IDS=$(python3 -c "import json,sys;t=json.load(open('/tmp/ronin/tareas.json'));print(' '.join(t[n]['task_id'] for n in sys.argv[1:]))" "$@")
timeout 1700 python3 esperar.py YNPYgCbiXO /tmp/ronin/crudo $IDS
for n in "$@"; do f=$(ls -t /tmp/ronin/crudo/${n}-g*.mp4 2>/dev/null | head -1); [ -z "$f" ] && continue
  python3 cuadros.py "$f" /tmp/ronin/f/$n 12 | sed "s/^/$n: /"; python3 /tmp/ronin/hoja.py /tmp/ronin/f/$n $S/q_$n.png 0.2; done
