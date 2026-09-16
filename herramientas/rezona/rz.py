#!/usr/bin/env python3
"""Cliente stdio mínimo del MCP de Rezona Lab.

  python3 rz.py tools
  python3 rz.py call submit_image_generation '{"project_id":"…","output_path":"assets/x.png","prompt":"…"}'
  python3 rz.py lote lote.json          # varias llamadas en una sola sesión, emparejadas por id
  python3 rz.py esperar gtask-a gtask-b # bloquea hasta que terminen

Trampas que este cliente ya contempla (todas pagadas, ver docs/MANUAL_JUEGOS.md §5.1):
  - las respuestas vuelven DESORDENADAS: se emparejan por el id del JSON-RPC, nunca por posición;
  - check_generation_tasks devuelve la lista bajo 'items';
  - fetch_generated_asset escribe RELATIVO A SU CWD y exige marca .rezona/ ahí: se corre en CASA;
  - fetch se vence a los 300 s CON EL ARCHIVO YA BAJADO: se espera al archivo, no al proceso.
"""
import json, os, subprocess, sys, time

CASA = os.environ.get("REZONA_CASA", os.path.expanduser("~/rezona-cwd"))
CMD = ["npx", "-y", "rezona@latest", "mcp"]


class Sesion:
    def __init__(self, cwd=CASA):
        os.makedirs(cwd, exist_ok=True)
        env = dict(os.environ, NODE_USE_ENV_PROXY="1")
        self.p = subprocess.Popen(CMD, cwd=cwd, env=env, stdin=subprocess.PIPE,
                                  stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
        self.n = 0
        self._rpc("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                                 "clientInfo": {"name": "rz.py", "version": "1"}})
        self._notif("notifications/initialized")

    def _notif(self, metodo, params=None):
        self.p.stdin.write(json.dumps({"jsonrpc": "2.0", "method": metodo,
                                       "params": params or {}}) + "\n")
        self.p.stdin.flush()

    def _rpc(self, metodo, params, espera=600):
        self.n += 1
        mio = self.n
        self.p.stdin.write(json.dumps({"jsonrpc": "2.0", "id": mio, "method": metodo,
                                       "params": params}) + "\n")
        self.p.stdin.flush()
        lim = time.time() + espera
        while time.time() < lim:
            linea = self.p.stdout.readline()
            if not linea:
                raise RuntimeError("el servidor MCP cerró la salida")
            try:
                msg = json.loads(linea)
            except json.JSONDecodeError:
                continue
            if msg.get("id") != mio:      # respuesta de otra llamada: se descarta, no se asume orden
                continue
            if "error" in msg:
                raise RuntimeError(msg["error"])
            return msg.get("result")
        raise TimeoutError(metodo)

    def tools(self):
        return [t["name"] for t in self._rpc("tools/list", {}).get("tools", [])]

    def call(self, nombre, args, espera=900):
        r = self._rpc("tools/call", {"name": nombre, "arguments": args}, espera)
        txt = "".join(c.get("text", "") for c in r.get("content", []) if c.get("type") == "text")
        try:
            return json.loads(txt)
        except (json.JSONDecodeError, TypeError):
            return {"texto": txt, "crudo": r}

    def esperar(self, ids, cada=20, tope=1800):
        """Bloquea hasta que todos los task_id terminen. Devuelve {task_id: item}."""
        pendientes, hechos = set(ids), {}
        lim = time.time() + tope
        while pendientes and time.time() < lim:
            r = self.call("check_generation_tasks",
                          {"task_ids": sorted(pendientes)})
            for it in r.get("items", []):          # 'items', no 'tasks' ni 'results'
                est = (it.get("status") or "").lower()
                if est in ("succeeded", "success", "completed", "failed", "error", "cancelled"):
                    hechos[it.get("task_id") or it.get("id")] = it
            pendientes -= set(hechos)
            if pendientes:
                time.sleep(cada)
        return hechos

    def cerrar(self):
        try:
            self.p.stdin.close()
            self.p.wait(10)
        except Exception:
            self.p.kill()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    s = Sesion()
    try:
        cmd = sys.argv[1]
        if cmd == "tools":
            print("\n".join(s.tools()))
        elif cmd == "call":
            print(json.dumps(s.call(sys.argv[2], json.loads(sys.argv[3])), ensure_ascii=False, indent=1))
        elif cmd == "lote":
            plan = json.load(open(sys.argv[2]))          # [{"tool":…,"args":{…}}, …]
            print(json.dumps([s.call(p["tool"], p["args"]) for p in plan], ensure_ascii=False, indent=1))
        elif cmd == "esperar":
            print(json.dumps(s.esperar(sys.argv[2:]), ensure_ascii=False, indent=1))
        else:
            print(__doc__)
            return 1
    finally:
        s.cerrar()
    return 0


if __name__ == "__main__":
    sys.exit(main())
