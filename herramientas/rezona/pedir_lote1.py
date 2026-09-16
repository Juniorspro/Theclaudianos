#!/usr/bin/env python3
"""Lote 1 del Bosque: texturas del bosque + el primer monstruo 3D.
Guarda los task_id en crudo/tareas.json — perder un id es perder un asset pagado."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from rz import Sesion

PROY = "tOMtshuHnZ"          # tmp — descartable, borrar
CRUDO = os.path.join(os.path.dirname(__file__), "crudo", "tareas.json")

SIN_SOMBRA = ("flat even diffuse lighting, no cast shadows, no baked shadows, no specular "
              "highlights, no vignette, orthographic top-down, photographic detail, "
              "seamless tileable texture, full frame, no border, no watermark")

IMAGENES = [
    ("suelo",   "Dark damp forest floor: wet black soil, brown pine needles, scattered dead oak "
                "leaves, patches of dark green moss, small twigs and grit. The frame covers about "
                "4 meters of ground. " + SIN_SOMBRA),
    ("corteza", "Bark of an old pine trunk, deep vertical furrows, grey-brown plates, thin green "
                "lichen in the cracks, damp. The frame covers about 2 meters of trunk height and "
                "1.4 meters around. " + SIN_SOMBRA),
    ("piedra",  "Old stone foundation wall: rough grey granite blocks, dark mortar joints, moss "
                "and damp stains in the joints. About 5 courses of blocks fill the frame, "
                "covering 2 meters wide. " + SIN_SOMBRA),
    ("tabla",   "Weathered vertical pine planks of an abandoned cabin wall, grey-brown rotten "
                "wood, visible grain, small knots, thin dark gaps between boards. Six boards fill "
                "the frame, covering 2.4 meters wide. " + SIN_SOMBRA),
    ("teja",    "Old split wooden shingle roof, overlapping rows of grey weathered cedar shakes, "
                "moss in the overlaps. Eight rows fill the frame, covering 2.4 meters. "
                + SIN_SOMBRA),
]

MONSTRUO = ("Tall emaciated humanoid horror creature, standing upright and facing forward, arms "
            "hanging down at its sides, legs straight and slightly apart, elongated thin limbs, "
            "gaunt ribcage, smooth eyeless head, wet grey-brown skin, full body from head to feet, "
            "no base, no pedestal, T-pose friendly, game asset")


def main():
    s = Sesion()
    tareas = json.load(open(CRUDO)) if os.path.exists(CRUDO) else {}
    try:
        for nombre, prompt in IMAGENES:
            r = s.call("submit_image_generation", {
                "project_id": PROY, "output_path": f"assets/bq-{nombre}.png",
                "prompt": prompt, "size": "1024x1024", "transparent": False})
            tareas[nombre] = r
            print(nombre, r.get("task_id"), r.get("output_path"))
        r = s.call("submit_model3d_generation", {
            "project_id": PROY, "output_path": "assets/bq-monstruo.glb",
            "prompt": MONSTRUO, "texture": True, "pbr": True,
            "texture_quality": "standard", "extra": {"face_limit": 6000}})
        tareas["monstruo"] = r
        print("monstruo", r.get("task_id"), r.get("output_path"))
    finally:
        json.dump(tareas, open(CRUDO, "w"), ensure_ascii=False, indent=1)
        s.cerrar()


if __name__ == "__main__":
    main()
