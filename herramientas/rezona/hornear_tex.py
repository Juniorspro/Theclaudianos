#!/usr/bin/env python3
"""Hornea las fotos crudas de Rezona a texturas del juego.
Recorta lo que no es textura, lleva a 768 y guarda JPEG: lo que se descarga en el celular.
Los METROS que cubre cada foto salen del prompt y son lo que fija la repeticion en el juego."""
import json, os
from PIL import Image

CRUDO, SALIDA = "crudo/img", "assets"
# nombre: (recorte o None, lado final, calidad, metros que cubre la foto)
PLAN = {
    "suelo":   (None,                 768, 82, 4.0),
    "corteza": ((330, 40, 1010, 990), 768, 82, 2.2),   # el crudo es un tronco entero con fondo
    "piedra":  (None,                 768, 82, 2.0),
    "tabla":   (None,                 768, 82, 2.4),
    "teja":    (None,                 768, 82, 2.4),
}

def main():
    os.makedirs(SALIDA, exist_ok=True)
    metros = {}
    for n, (rec, lado, q, m) in PLAN.items():
        im = Image.open(os.path.join(CRUDO, n + ".png")).convert("RGB")
        if rec:
            im = im.crop(rec)
        im = im.resize((lado, lado), Image.LANCZOS)
        p = os.path.join(SALIDA, n + ".jpg")
        im.save(p, quality=q, optimize=True, progressive=True)
        metros[n] = m
        print("%-8s %6.1f kB  %.1f m" % (n, os.path.getsize(p) / 1024, m))
    json.dump(metros, open(os.path.join(SALIDA, "metros.json"), "w"), indent=1)

if __name__ == "__main__":
    main()
