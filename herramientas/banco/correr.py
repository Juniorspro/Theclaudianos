#!/usr/bin/env python3
"""Corre el Bosque en chromium headless y mide. Las capturas salen giradas (el marco esta
girado 90 grados): se enderezan con rotate(90,expand=True) o la foto miente.

  python3 herramientas/banco/correr.py [segundos]
"""
import functools, http.server, json, os, re, shutil, sys, threading, time
from playwright.sync_api import sync_playwright
from PIL import Image

DIR = "crudo/banco"
CHROME = os.environ.get("CHROME_BIN", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
CDN3 = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"


def preparar():
    os.makedirs(DIR + "/assets", exist_ok=True)
    s = open(os.environ.get("BQ", "juegos-pc/Bosque.html"), encoding="utf-8").read()
    s = s.replace(CDN3, "three.min.js")                       # el navegador no sale a internet
    # el A/B va en el MISMO binario con una constante dada vuelta: sin IA, el juego
    # se queda con el canvas procedural y todo lo demas es identico
    destino = "assets-no-existe/" if "sinia" in sys.argv else "assets/"
    s = re.sub(r"const CDN_IA='[^']*'", "const CDN_IA='%s'" % destino, s)
    s = s.replace("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js",
                  "GLTFLoader.js")
    open(DIR + "/bq.html", "w", encoding="utf-8").write(s)
    shutil.copy("crudo/ver/three.min.js", DIR + "/three.min.js")
    shutil.copy("crudo/ver/GLTFLoader.js", DIR + "/GLTFLoader.js")
    for f in os.listdir("assets"):
        shutil.copy("assets/" + f, DIR + "/assets/" + f)


def main():
    segundos = float(sys.argv[1]) if len(sys.argv) > 1 else 6
    preparar()
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIR)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8098), h)
    srv.log_message = lambda *a: None
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with sync_playwright() as pw:
        nav = pw.chromium.launch(executable_path=CHROME,
                                 args=["--use-gl=angle", "--use-angle=swiftshader",
                                       "--enable-unsafe-swiftshader", "--no-sandbox"])
        ctx = nav.new_context(viewport={"width": 412, "height": 892}, has_touch=True,
                              is_mobile=True, device_scale_factor=2)
        pg = ctx.new_page()
        errores = []
        pg.on("pageerror", lambda e: errores.append(str(e)))
        pg.on("console", lambda m: errores.append((m.type, m.text[:300]))
              if m.type in ("error", "warning") else None)
        pg.goto("http://127.0.0.1:8098/bq.html")
        pg.wait_for_function("window.__B", timeout=90000)
        pg.evaluate("document.getElementById('intro')"
                    ".dispatchEvent(new Event('touchstart',{bubbles:true,cancelable:true}))")
        time.sleep(1.5)
        if "dia" in sys.argv:
            pg.evaluate("window.__B.saltar(200)")       # el ciclo arranca de noche
        if "bicho" in sys.argv:
            print("bicho:", pg.evaluate("window.__B.bicho(7,2.6)"))
        if "casa" in sys.argv:
            c = pg.evaluate("window.__B.casas()")[0]
            pg.evaluate(f"window.__B.ir({c['x']:.2f},{c['z']+24:.2f})")
            pg.evaluate("window.__B.mirar(0)")
        time.sleep(segundos)
        if "bicho" in sys.argv:
            print("bicho:", pg.evaluate("window.__B.bicho(%s,2.6)" % os.environ.get("DIST","8")))
            time.sleep(1.2)          # que el mixer corra: en bind pose no se ve el ciclo
        if "bicho" in sys.argv:
            print("diag:", pg.evaluate("window.__B.diag()"))
        if "pintar" in sys.argv:
            print("pintar:", pg.evaluate("window.__B.pintar()"))
            time.sleep(1)
        med = {
            "ia": pg.evaluate("window.__B.ia()"),
            "cuenta": pg.evaluate("window.__B.cuenta()"),
            "brillo": pg.evaluate("window.__B.brillo().then(r=>r)"),
            "lienzo": pg.evaluate("[renderer.domElement.width,renderer.domElement.height]")
            if pg.evaluate("typeof renderer!=='undefined'") else None,
        }
        print(json.dumps(med, ensure_ascii=False))
        print("errores de pagina:", len(errores))
        for e in errores[:6]:
            print("  -", e)
        pg.screenshot(path="crudo/banco/cruda.png")
        ctx.close(); nav.close()
    im = Image.open("crudo/banco/cruda.png").rotate(90, expand=True)
    im.save(os.environ.get("SALIDA", "crudo/banco/vista.jpg"), quality=86)
    print("captura: crudo/banco/vista.jpg", im.size)


if __name__ == "__main__":
    main()
