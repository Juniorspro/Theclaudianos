#!/usr/bin/env python3
"""Fotografía un GLB desde cuatro ángulos con three.js en chromium headless.
   python3 herramientas/banco/ver_glb.py <glb dentro de crudo/ver> <salida.jpg>"""
import base64, json, os, subprocess, sys, threading, http.server, functools
from playwright.sync_api import sync_playwright
from PIL import Image

DIR = "crudo/ver"

def servir(puerto=8099):
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIR)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", puerto), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def main():
    glb = sys.argv[1] if len(sys.argv) > 1 else "monstruo.glb"
    sal = sys.argv[2] if len(sys.argv) > 2 else "crudo/glb.jpg"
    for f in ("ver_glb.html",):
        subprocess.run(["cp", "herramientas/banco/" + f, DIR + "/" + f], check=True)
    servir()
    fotos = []
    with sync_playwright() as pw:
        nav = pw.chromium.launch(executable_path=os.environ.get("CHROME_BIN","/opt/pw-browsers/chromium-1194/chrome-linux/chrome"), args=["--use-gl=angle", "--use-angle=swiftshader",
                                       "--enable-unsafe-swiftshader", "--no-sandbox"])
        pg = nav.new_page(viewport={"width": 420, "height": 560})
        errores = []
        pg.on("pageerror", lambda e: errores.append(str(e)))
        pg.goto(f"http://127.0.0.1:8099/ver_glb.html?glb={glb}")
        pg.wait_for_function("window.__V && window.__V.listo", timeout=60000)
        info = pg.evaluate("window.__V.info || {error: window.__V.error}")
        print(json.dumps(info, ensure_ascii=False))
        if errores:
            print("ERRORES", errores)
        if info and "error" not in info:
            for i, (ang, alt) in enumerate([(0, .15), (1.57, .15), (3.14, .15), (0.8, .55)]):
                pg.evaluate(f"window.__V.foto({ang},{alt})")
                p = f"{DIR}/f{i}.png"
                pg.locator("canvas").screenshot(path=p)
                fotos.append(p)
        nav.close()
    if fotos:
        ims = [Image.open(p) for p in fotos]
        hoja = Image.new("RGB", (sum(i.width for i in ims), ims[0].height))
        x = 0
        for i in ims:
            hoja.paste(i, (x, 0)); x += i.width
        hoja.save(sal, quality=85)
        print("hoja:", sal)

if __name__ == "__main__":
    main()
