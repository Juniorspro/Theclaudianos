#!/usr/bin/env python3
"""Fotografia y MIDE un rig: cuatro instantes de un clip, con el desplazamiento real de los
vertices en cada uno. Un hueso mal pesado gira igual y no mueve un vertice."""
import functools, http.server, json, os, shutil, sys, threading
from playwright.sync_api import sync_playwright
from PIL import Image

DIR = "crudo/ver"
CHROME = os.environ.get("CHROME_BIN", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome")

def main():
    glb = sys.argv[1]; clip = sys.argv[2] if len(sys.argv) > 2 else "preset:walk"
    sal = sys.argv[3] if len(sys.argv) > 3 else "crudo/anim.jpg"
    shutil.copy("herramientas/banco/ver_glb.html", DIR + "/ver_glb.html")
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIR)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8097), h)
    srv.log_message = lambda *a: None
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    fotos = []
    with sync_playwright() as pw:
        nav = pw.chromium.launch(executable_path=CHROME,
            args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"])
        pg = nav.new_page(viewport={"width": 420, "height": 560})
        err = []
        pg.on("pageerror", lambda e: err.append(str(e)))
        pg.goto(f"http://127.0.0.1:8097/ver_glb.html?glb={glb}")
        pg.wait_for_function("window.__V && window.__V.listo", timeout=60000)
        print(json.dumps(pg.evaluate("window.__V.info")))
        dur = pg.evaluate(f"window.__V.clip({json.dumps(clip)})")
        print("clip", clip, "dura", dur)
        med = []
        for i in range(4):
            t = dur * i / 4.0
            med.append(pg.evaluate(f"window.__V.enT({t})"))
            pg.evaluate("window.__V.foto(0.55,0.15)")
            p = f"{DIR}/a{i}.png"; pg.locator("canvas").screenshot(path=p); fotos.append(p)
        print("desplazamiento de vertices por instante:", json.dumps(med))
        if err: print("ERRORES", err[:4])
        nav.close()
    ims = [Image.open(p) for p in fotos]
    hoja = Image.new("RGB", (sum(i.width for i in ims), ims[0].height))
    x = 0
    for i in ims: hoja.paste(i, (x, 0)); x += i.width
    hoja.save(sal, quality=85); print("hoja:", sal)

if __name__ == "__main__":
    main()
