#!/usr/bin/env python3
"""Achica las imagenes de adentro de un GLB. Lo que se descarga en un telefono es casi todo
textura, y un bicho que se ve de lejos y a oscuras no necesita 2048.

  python3 herramientas/rezona/achicar_glb.py entrada.glb salida.glb [color=1024] [resto=512]
"""
import io as _io, json, struct, sys
from PIL import Image

def leer(p):
    b = open(p, "rb").read(); off, j, bina = 12, None, b""
    while off < len(b):
        ln, ty = struct.unpack_from("<II", b, off); ch = b[off+8:off+8+ln]; off += 8+ln
        if ty == 0x4E4F534A: j = json.loads(ch)
        elif ty == 0x004E4942: bina = ch
    return j, bytearray(bina)

def escribir(p, j, bina):
    js = json.dumps(j, separators=(",", ":")).encode(); js += b" " * ((4-len(js) % 4) % 4)
    bina = bytes(bina) + b"\0" * ((4-len(bina) % 4) % 4)
    with open(p, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, 12+8+len(js)+8+len(bina)))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(bina), 0x004E4942)); f.write(bina)

def compactar(j, bina):
    """Rebuilds the binary keeping only the bufferViews that alguien mira: un bufferView viejo
    que ya nadie referencia se queda adentro del archivo y lo hace MAS grande, no mas chico."""
    usados = set()
    for a in j.get("accessors", []):
        if "bufferView" in a: usados.add(a["bufferView"])
    for im in j.get("images", []):
        if "bufferView" in im: usados.add(im["bufferView"])
    orden = sorted(usados)
    nueva, mapa, salida = bytearray(), {}, []
    for k, i in enumerate(orden):
        bv = dict(j["bufferViews"][i]); o = bv.get("byteOffset", 0)
        d = bytes(bina[o:o+bv["byteLength"]])
        while len(nueva) % 4: nueva += b"\0"
        bv["byteOffset"] = len(nueva); nueva += d
        mapa[i] = k; salida.append(bv)
    j["bufferViews"] = salida
    for a in j.get("accessors", []):
        if "bufferView" in a: a["bufferView"] = mapa[a["bufferView"]]
    for im in j.get("images", []):
        if "bufferView" in im: im["bufferView"] = mapa[im["bufferView"]]
    j["buffers"][0]["byteLength"] = len(nueva) + ((4-len(nueva) % 4) % 4)
    return nueva


def main():
    ent, sal = sys.argv[1], sys.argv[2]
    color = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
    resto = int(sys.argv[4]) if len(sys.argv) > 4 else 512
    j, bina = leer(ent)
    for im in j.get("images", []):
        bv = j["bufferViews"][im["bufferView"]]
        o = bv.get("byteOffset", 0)
        cru = bytes(bina[o:o+bv["byteLength"]])
        foto = Image.open(_io.BytesIO(cru)).convert("RGB")
        lado = color if "Color" in im.get("name", "") else resto
        if foto.width <= lado:
            continue
        foto = foto.resize((lado, lado), Image.LANCZOS)
        buf = _io.BytesIO(); foto.save(buf, "JPEG", quality=84, optimize=True)
        nuevo = buf.getvalue()
        while len(bina) % 4: bina += b"\0"
        off = len(bina); bina += nuevo
        j["bufferViews"].append({"buffer": 0, "byteOffset": off, "byteLength": len(nuevo)})
        im["bufferView"] = len(j["bufferViews"]) - 1
        print("%-14s %d -> %d px, %d -> %d kB" % (im.get("name", "")[:14], 2048, lado,
                                                  len(cru)//1024, len(nuevo)//1024))
    bina = compactar(j, bina)
    escribir(sal, j, bina)

if __name__ == "__main__":
    main()
