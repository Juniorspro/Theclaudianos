# El SWF de Madness Project Nexus (Classic)
Fuente: `herramientas/swf/swf.py` (lector sin dependencias) y `marcha.py`. Ver también: [nevada](nevada.md).

## Dónde está y cómo se lee
- Lo sube quien pide (29/09: `Madness_Project_Nexus_Classic.swf`, 15,6 MB, CWS v10, 30 fps, AS2).
  Se copia a `crudo/swf/mpn.swf`, **fuera de git**. Sin Ruffle ni PIL en el contenedor: el lector
  es Python puro (zlib) y saca sprites, líneas de tiempo, rótulos, matrices y cajas de formas.
- `python3 herramientas/swf/swf.py crudo/swf/mpn.swf 5628` lista los rótulos de un sprite;
  con un rótulo más, las piezas cuadro a cuadro. Tarda 0,3 s.
- Escala de los personajes: K = 0,214/13,06 m por px (px = twip/20); comprobado con la cabeza a
  0,573 m del centro del torso (= REF.cab de `esquivas_swf.js`).

## madness_character (5628)
- Cada estado es UN cuadro con un clip `mySprite` en la profundidad 3: idle 5317 (50 cuadros),
  run 5349 (28), backtrack 5350 (el run al revés), dash 5352 (14), run_turn 5351.
- Piezas del clip: prof 1 bota de lejos, 3 bota de cerca (sprite 2790), 5/7 manos de atrás,
  9 `myBody`, 13 `myHead`, 17/19 manos de delante. **Mira a la derecha.**
- 2,5D: lo que baja en pantalla se acerca; la bota de lejos "baja" 2,8 cm mientras apoya. La
  altura de un pie en vuelo se mide sobre la recta despegue-aterrizaje, no sobre la y.
- El dash son los pies del run cuadro por medio; cambia el torso (20°, +25 cm, −3,6 cm).
- El personaje avanza 4,8 px/cuadro (2,36 m/s) y el pie apoyado retrocede 0,2 m por ciclo: el
  original **patina**.
