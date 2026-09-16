#!/usr/bin/env python3
"""Iconos y titulo del HUD. Transparentes, monocromos y CENTRADOS: el codigo les pone el color,
el tamaño y el halo. Un icono con su propio color no se puede teñir despues."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from rz import Sesion

PROY = "tOMtshuHnZ"
CRUDO = os.path.join(os.path.dirname(__file__), "crudo", "tareas.json")

ESTILO = ("Single flat icon, pure white shape on a fully transparent background, thick clean "
          "strokes, high contrast, centered, filling most of the frame, no text, no letters, "
          "no frame, no border, no drop shadow, no gradient, no background objects, "
          "simple pictogram, subtle worn scratches")

ICONOS = {
    "ui-linterna": "A hand-held flashlight pointing right with a short light cone. " + ESTILO,
    "ui-correr":   "A running human figure silhouette, side view, legs mid-stride. " + ESTILO,
    "ui-vhs":      "A VHS video cassette tape seen from the front, two reels visible. " + ESTILO,
    "ui-ajustes":  "A gear wheel with eight teeth and a round hole in the middle. " + ESTILO,
    "ui-pantalla": "Four corner brackets forming a square, the expand-to-fullscreen pictogram. " + ESTILO,
    "ui-reliquia": "A small faceted crystal amulet hanging from a short chain. " + ESTILO,
    "ui-nota":     "A torn sheet of handwritten note paper, slightly curled corner. " + ESTILO,
    "ui-mapa":     "A folded paper map pictogram. " + ESTILO,
    "ui-joystick": ("A circular joystick ring: a thick outer ring with eight small tick marks "
                    "around it, hollow in the middle. " + ESTILO),
    "ui-pulgar":   ("A filled circle with a soft ring around it, the thumb knob of a virtual "
                    "joystick. " + ESTILO),
    "ui-ojo":      "A single wide open eye with a round pupil, horror style. " + ESTILO,
}

TITULO = ("The single word BOSQUE written in tall condensed horror lettering, letter by letter: "
          "B, O, S, Q, U, E. White weathered letters on a fully transparent background, cracked "
          "and scratched like an old VHS title card, no other text, no frame, centered")


def main():
    s = Sesion()
    tareas = json.load(open(CRUDO)) if os.path.exists(CRUDO) else {}
    try:
        for nombre, prompt in ICONOS.items():
            r = s.call("submit_image_generation", {
                "project_id": PROY, "output_path": "assets/%s.png" % nombre,
                "prompt": prompt, "size": "1024x1024", "transparent": True})
            tareas[nombre] = r
            print(nombre, r.get("task_id"))
        # un modelo de imagen no deletrea a pedido: se piden variantes y se elige la que esta bien
        r = s.call("submit_image_generation", {
            "project_id": PROY, "output_path": "assets/ui-titulo.png",
            "prompt": TITULO, "size": "1024x1024", "transparent": True, "n": 3})
        tareas["ui-titulo"] = r
        print("ui-titulo", r.get("task_id"))
    finally:
        json.dump(tareas, open(CRUDO, "w"), ensure_ascii=False, indent=1)
        s.cerrar()


if __name__ == "__main__":
    main()
