#!/usr/bin/env python3
"""Hornea los iconos del HUD a base64 chico. Van ADENTRO del HTML: la interfaz no puede
depender de una descarga — un boton que aparece dos segundos tarde es un boton roto.
Se recorta por el alfa (el generador centra a ojo) y se deja un margen parejo."""
import base64, io, json, os
from PIL import Image

CRUDO, SALIDA = "crudo/ui", "herramientas/rezona/crudo/ui_b64.json"
LADO = {"ui-titulo": (560, 148), "ui-joystick": (192, 192), "ui-pulgar": (112, 112)}
POR_DEFECTO = (96, 96)

def main():
    out = {}
    for f in sorted(os.listdir(CRUDO)):
        if not f.endswith(".png"):
            continue
        n = f[:-4]
        im = Image.open(os.path.join(CRUDO, f)).convert("RGBA")
        caja = im.split()[3].getbbox()          # recorte por el alfa, no por luminancia
        if caja:
            im = im.crop(caja)
        w, h = LADO.get(n, POR_DEFECTO)
        escala = min(w / im.width, h / im.height)
        im = im.resize((max(1, int(im.width*escala)), max(1, int(im.height*escala))), Image.LANCZOS)
        lienzo = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        lienzo.paste(im, ((w-im.width)//2, (h-im.height)//2))
        # El CSS enmascara por el CANAL ALFA, no por la luminancia: un PNG en gris sin alfa
        # da una mascara opaca y el icono sale como un cuadrado lleno. Va gris+alfa (LA), con
        # el gris constante en blanco — que comprime a casi nada — y la silueta en el alfa.
        alfa = lienzo.split()[3]
        blanco = Image.new("L", lienzo.size, 255)
        buf = io.BytesIO()
        Image.merge("LA", [blanco, alfa]).save(buf, "PNG", optimize=True)
        out[n] = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
        print("%-14s %3dx%-3d %5.1f kB" % (n, w, h, len(out[n])/1024))
    json.dump(out, open(SALIDA, "w"))
    print("total %.1f kB" % (sum(len(v) for v in out.values())/1024))

if __name__ == "__main__":
    main()
