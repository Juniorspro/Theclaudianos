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

## Dibujar sin Ruffle (29/09)
- `svg.py`: DefineShape 1-4 → SVG (lisos, degradados, líneas; cada borde al relleno de su derecha y
  dado vuelta al de su izquierda) y sprites con matriz, color y recortes. Un `<clipPath>` no admite
  `<g>`: el recorte va con caminos sueltos y la matriz compuesta (si no, tapa todo sin error).
- `rasterizar.js` (Chromium, PNG transparente) e `imagen.js` (medir lo opaco, componer, pasar a webp).
- Validado: el fondo de baldosa sale igual al de Ruffle (252×328 px de dibujo; píxel = 3·px + 6).
- `hijos={'myMask': (id, cuadro[, matriz])}` hace lo que el código del SWF con `gotoAndStop`.

## La tienda del SWF
- `madness_item_portrait` 8254: cuadros guns/hat/mask/mouth/shirt/none; la capa 3 (8226) es un
  recorte. La prenda: `myMask.gotoAndStop(myType)` sobre MasksAll 7358 (HatsAll 7363, MouthsAll
  7318, `Outfit - Body - Core` 7295 para la ropa de la tienda).
- Las máscaras con dos lados (`flipMe`: agent2_mask, agent3_mask) sólo tienen `_R`/`_L`: el original
  mostraba otra máscara. Se usa la `_R`.
- Catálogo: `ItemGenerator.createArmor` (initclip 8402), ~105 prendas con myName, myCat, myArmor,
  myWeight (none/light/med/heavy) y myPrice; ponerse light/med/heavy pide perkArmor1/2/3.
  `swf.acciones()` desarma los ActionPush del AS2.
- `Parts - Body` 7289 (cuerpos): capas myBackup (arma a la espalda), bodySprite, myShirt (ropa
  encima, cuadro 0 = armor1) y teamColor (el brazalete verde). Los trajes de agente son esto.
