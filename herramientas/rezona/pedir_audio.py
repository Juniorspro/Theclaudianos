#!/usr/bin/env python3
"""Sonido del Bosque. Musica y ambiente en bucle + efectos cortos.
Reglas: el nivel lo pone el codigo, nunca el prompt; los prompts describen el OBJETO FISICO y
piden fuerte, cerca y seco; la musica termina en 'seamless loop, no fade out'."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from rz import Sesion

PROY = "tOMtshuHnZ"
CRUDO = os.path.join(os.path.dirname(__file__), "crudo", "tareas.json")

PEDIDOS = [
    ("mus-menu", "music", 45,
     "Slow dark ambient horror drone for a game menu: low detuned strings, a distant metallic "
     "resonance, faint tape hiss, no melody, no drums, oppressive and patient. Seamless loop, "
     "consistent energy, no fade in, no fade out."),
    ("mus-abajo", "music", 40,
     "Claustrophobic underground horror ambience: deep sub drone, slow metallic scrapes far away, "
     "dripping resonance in a concrete corridor, rising dread, no melody, no drums. Seamless "
     "loop, consistent energy, no fade in, no fade out."),
    ("amb-noche", "sound", 30,
     "Night forest atmosphere recorded in a clearing: steady wind through pine needles, distant "
     "owl calls, occasional creaking branch, far crickets, no music, no people, no footsteps. "
     "Even level throughout, seamless loop, no fade."),
    ("sfx-reliquia", "sound", 2,
     "A small faceted crystal amulet on a chain being picked up from stone: bright glassy chime "
     "with a short metallic chain rattle. Close, loud and dry, no reverb tail, no music."),
    ("sfx-nota", "sound", 2,
     "A single sheet of old dry paper being snatched and crumpled once. Close, loud and dry, "
     "no reverb, no music."),
    ("sfx-trampilla", "sound", 3,
     "A heavy rusted steel hatch in the ground being unlatched and swung open, deep metallic "
     "groan and a dull thud. Close, loud and dry, no music."),
]


def main():
    s = Sesion()
    tareas = json.load(open(CRUDO)) if os.path.exists(CRUDO) else {}
    try:
        for nombre, kind, dur, prompt in PEDIDOS:
            r = s.call("submit_audio_generation", {
                "project_id": PROY, "output_path": "assets/%s.mp3" % nombre,
                "prompt": prompt, "kind": kind, "duration": dur})
            tareas[nombre] = r
            print("%-14s %s" % (nombre, r.get("task_id") or r))
    finally:
        json.dump(tareas, open(CRUDO, "w"), ensure_ascii=False, indent=1)
        s.cerrar()


if __name__ == "__main__":
    main()
