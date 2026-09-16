#!/usr/bin/env python3
"""Colapsa los huesos de torsion de un GLB riggeado a sus padres.

Por que: WebGL1 garantiza 128 vectores de uniform de vertice, o sea 32 mat4. Un rig de 41 huesos
son 164 vectores y **el shader no compila** — y eso no falla con un dibujo feo, falla con una
pantalla vacia. Tripo devuelve 16 huesos *Twist* que no llevan hijos: se colapsan a su padre y
quedan 25.

  python3 herramientas/rezona/podar_rig.py entrada.glb salida.glb
"""
import json, struct, sys
import numpy as np

COMP = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
NUM = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def leer_glb(p):
    b = open(p, "rb").read()
    off, j, bina = 12, None, b""
    while off < len(b):
        ln, ty = struct.unpack_from("<II", b, off)
        ch = b[off + 8: off + 8 + ln]
        off += 8 + ln
        if ty == 0x4E4F534A:
            j = json.loads(ch)
        elif ty == 0x004E4942:
            bina = ch
    return j, bytearray(bina)


def escribir_glb(p, j, bina):
    js = json.dumps(j, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    bina = bytes(bina) + b"\0" * ((4 - len(bina) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(bina)
    with open(p, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(bina), 0x004E4942)); f.write(bina)


def acc_leer(j, bina, i):
    a = j["accessors"][i]
    bv = j["bufferViews"][a["bufferView"]]
    fmt, tam = COMP[a["componentType"]]
    n = NUM[a["type"]]
    base = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    paso = bv.get("byteStride") or tam * n
    if paso == tam * n:
        d = np.frombuffer(bytes(bina[base: base + paso * a["count"]]), dtype=np.dtype("<" + fmt))
        return d.reshape(a["count"], n).copy()
    filas = [np.frombuffer(bytes(bina[base + k * paso: base + k * paso + tam * n]),
                           dtype=np.dtype("<" + fmt)) for k in range(a["count"])]
    return np.array(filas)


def acc_escribir(j, bina, i, datos):
    """Reescribe un accessor en un bufferView NUEVO al final del binario (no toca a nadie mas)."""
    a = j["accessors"][i]
    cru = datos.astype(np.dtype("<" + COMP[a["componentType"]][0])).tobytes()
    while len(bina) % 4:
        bina += b"\0"
    off = len(bina)
    bina += cru
    j["bufferViews"].append({"buffer": 0, "byteOffset": off, "byteLength": len(cru)})
    a["bufferView"] = len(j["bufferViews"]) - 1
    a.pop("byteOffset", None)
    a["count"] = datos.shape[0]


def main():
    ent, sal = sys.argv[1], sys.argv[2]
    j, bina = leer_glb(ent)
    N = j["nodes"]
    sk = j["skins"][0]
    joints = list(sk["joints"])

    padre = {}
    for i, n in enumerate(N):
        for c in n.get("children", []):
            padre[c] = i

    def es_torsion(i):
        nm = N[i].get("name", "")
        return "Twist" in nm and "Neck" not in nm   # el cuello se queda: lleva la cabeza

    fuera = [i for i in joints if es_torsion(i)]
    assert all(not [c for c in N[i].get("children", []) if c not in fuera] for i in fuera), \
        "un hueso de torsion tiene hijos que se quedan: habria que recomponer su transformacion"

    # cada hueso que se va apunta al ancestro vivo mas cercano
    destino = {}
    for i in fuera:
        p = padre[i]
        while p in fuera:
            p = padre[p]
        destino[i] = p

    vivos = [i for i in joints if i not in fuera]
    idx_nuevo = {n: k for k, n in enumerate(vivos)}            # nodo -> indice de joint nuevo
    mapa_joint = {}                                            # joint viejo -> joint nuevo
    for k, n in enumerate(joints):
        mapa_joint[k] = idx_nuevo[destino[n] if n in fuera else n]

    # --- pesos: remapear e ir sumando lo que cae en el mismo hueso ---
    for m in j["meshes"]:
        for pr in m["primitives"]:
            if "JOINTS_0" not in pr["attributes"]:
                continue
            jo = acc_leer(j, bina, pr["attributes"]["JOINTS_0"]).astype(np.int32)
            we = acc_leer(j, bina, pr["attributes"]["WEIGHTS_0"]).astype(np.float64)
            nj = np.vectorize(lambda v: mapa_joint[int(v)])(jo)
            for v in range(nj.shape[0]):                       # sumar duplicados por vertice
                acum = {}
                for c in range(nj.shape[1]):
                    acum[nj[v, c]] = acum.get(nj[v, c], 0.0) + we[v, c]
                pares = sorted(acum.items(), key=lambda kv: -kv[1])[:4]
                s = sum(p[1] for p in pares) or 1.0
                for c in range(nj.shape[1]):
                    if c < len(pares):
                        nj[v, c], we[v, c] = pares[c][0], pares[c][1] / s
                    else:
                        nj[v, c], we[v, c] = 0, 0.0
            acc_escribir(j, bina, pr["attributes"]["JOINTS_0"], nj)
            acc_escribir(j, bina, pr["attributes"]["WEIGHTS_0"], we.astype(np.float32))

    # --- matrices de bind: se quedan las filas vivas ---
    ibm = acc_leer(j, bina, sk["inverseBindMatrices"])
    acc_escribir(j, bina, sk["inverseBindMatrices"], ibm[[joints.index(v) for v in vivos]])

    # --- animaciones: fuera los canales de los huesos que ya no existen ---
    for an in j.get("animations", []):
        an["channels"] = [c for c in an["channels"] if c["target"]["node"] not in fuera]

    # --- sacar los nodos y renumerar TODO lo que apunta a un nodo ---
    quedan = [i for i in range(len(N)) if i not in fuera]
    ren = {v: k for k, v in enumerate(quedan)}
    nuevos = []
    for i in quedan:
        n = dict(N[i])
        if "children" in n:
            h = [ren[c] for c in n["children"] if c not in fuera]
            if h:
                n["children"] = h
            else:
                n.pop("children")
        nuevos.append(n)
    j["nodes"] = nuevos
    sk["joints"] = [ren[v] for v in vivos]
    if "skeleton" in sk:
        sk["skeleton"] = ren[sk["skeleton"]]
    for esc in j.get("scenes", []):
        esc["nodes"] = [ren[v] for v in esc["nodes"] if v not in fuera]
    for an in j.get("animations", []):
        for c in an["channels"]:
            c["target"]["node"] = ren[c["target"]["node"]]

    escribir_glb(sal, j, bina)
    print("huesos %d -> %d   nodos %d -> %d" % (len(joints), len(vivos), len(N), len(nuevos)))


if __name__ == "__main__":
    main()
