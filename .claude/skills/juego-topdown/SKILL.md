---
name: juego-topdown
description: Receta para juegos de acción vistos desde arriba en pixel art 2D (a lo Hotline Miami) con canvas chico, revelado WebGL, pisos de celdas generados y verificados, IA con cono de vista y campo de distancias, dos palancas fijas y modo censura. La usa juegos-pc/Linea.html.
---

# Acción desde arriba — la receta de LÍNEA CALIENTE

Fuentes en `herramientas/linea/fuentes/`, se arma con `herramientas/linea/armar.sh` (corre `niveles.py`) y el banco
vive en `/tmp/ui/linea/` (bot.js, pal.js, idi.js, fuzz.js, fotos.js, cine.js, quieto.js). **Se edita la fuente.**

## Render
- El mundo se dibuja en 2D a **W×H chicos** (`PX = floor(altoReal/200)`, ~469×217 acostado) y pasa por un revelado
  WebGL de una sola pasada: aberración que late con los golpes, brillo de 8 muestras, saturación, viñeta, grano,
  destello y rojo al morir. Con «efectos visuales bajos» se copia plano.
- El piso se **hornea en capas** al cargar: suelo (con alfombras y sillas, que no chocan), manchas (sangre, casquillos,
  vidrio: se pintan ahí y quedan) y lo alto (paredes y muebles que chocan). Por cuadro sólo va lo que se mueve.
- Los sprites giran a **64 ángulos** (`q64`): libre titila. Piernas hacia donde camina, torso y cabeza hacia donde mira.
- El balanceo de cámara de los 80 es un `rotate` chico del contexto; los toques pasan por `aMundo()`, que lo deshace.

## Choques: el cuerpo cabe en una celda
- Celdas de 8 px y **radio 3,8**. Con 5,2 el cuerpo no cabía centrado en ninguna celda pegada a una pared: los caminos
  del campo de distancias van por el centro de las celdas y todos (bot, patota y jugador) se clavaban en los marcos.
- Además, al chocar una esquina de frente se **resbala** hacia el lado que deja pasar (`esquina()`).
- La hoja de la puerta se resuelve **desde su punto más cercano**, no por la normal: en la punta el cuerpo la rodea. Con
  la normal, una puerta abierta al tope trababa a quien venía por la punta.
- La punta de una puerta cerrada **toca el marco**: si se prueba el choque en la punta exacta la puerta no se mueve nunca.
- Todo lo que empuja por afuera de `moverCirculo` puede meter a alguien en la pared: `desatascar()` lo devuelve a la
  celda libre más cercana. Jugador y patota se separan como los enemigos entre sí (si no, se enciman y nadie pega).
- La bala pega con un radio más grande que el del cuerpo (+2,2): con el del choque se escapaban tiros al centro.

## Niveles: generados con semilla y verificados
- `niveles.py` parte cada edificio en cuartos (BSP), los une con un árbol al azar más algunos lazos, pone puertas o
  huecos, ventanas hacia afuera y vidrios entre cuartos, muebles según el tipo de cuarto, escaleras, gente y armas.
- **Se llega a todo**: búsqueda con cuadrado 2×2 libre desde el arranque a cada puerta, hueco, escalera, auto,
  enemigo y arma. Si un mueble tapa, se saca. Un piso salió con el cuarto de arranque cerrado por un mueble: pedir sólo
  la escalera no alcanza, hay que pedir **todas las puertas**.
- Quien llega por la escalera aparece **dos celdas adentro**: parado en la escalera nunca «salía» de ella y no podía
  volver a bajar.
- Los enemigos nacen a 18 celdas del arranque o más; `quieto.js` deja al pibe quieto 8 s en cada piso y mide si lo matan.

## IA
- Cono de 1,05 rad, 210 px, se ve por el vidrio y no por paredes ni puertas. Medio segundo de reacción antes de tirar.
- Un campo de distancias hacia el jugador cada 0,2 s, compartido; los tiros hacen ruido y mandan a buscar con su campo.
- La patota abre puertas despacio; **sólo la puerta que empujó el jugador voltea** (`deJug`).

## Quién pega primero (como en el original)
- En *Hotline Miami* el jugador gana si reacciona en la ventana antes de que el enemigo pegue: los de lejos, de costado
  o de espaldas tardan más en darse cuenta, los de fuego tiran un rato después de verte y los de mano **llegan, se paran
  y recién ahí bajan el golpe**. Las balas pasan por arriba del que está en el piso: al caído se lo remata.
- La primera versión pegaba en el mismo cuadro en que el enemigo llegaba: con 0,2 s de reflejo el jugador perdía 22 de
  30 duelos a puño limpio. Con carga de 0,3 s visible (arma levantada y «!»), alcance enemigo 0,85 del arma y envión del
  jugador de 6 px, gana 30 de 30 con 0,2 s y pierde con 0,45 s. Se mide con `banco/duelo.js`, no a ojo.
- `DIF()` junta todo lo que cambia la dificultad (reacción, carga, vista, cono, bala, dispersión, vida extra).

## Controles
- Izquierda fija: camina. Derecha fija: apunta (la mira se engancha al de menor ángulo que se ve) y **pasada la raya
  de adentro pega o tira**. Botón arriba de la derecha: rematar / agarrar / tirar según lo que haya. Tocar a alguien
  lejos de las palancas le pega una vez. Teclado para la compu (WASD, flechas, E, R).

## Banco
- `bot.js` juega solo cada capítulo con `__L.sim()` (paso sin dibujo) y dice dónde se traba: así salieron las puertas,
  las esquinas, el radio y la escalera. Invulnerable mide que se pueda terminar; mortal, la dificultad.
- El azar del juego usa `Math.random`: una traba puede no repetirse. Correr dos veces.
- Las pruebas de idioma en portugués dan falsos castellanos (DE, O, NA): se miran a mano.

## Censura
- Un solo interruptor (`AJ.censura`): sangre → estrellitas y confite, cadáver sin partir con estrellas que giran,
  REMATAR → ATAR, y cada sonido crudo se cambia por el de dibujito en `fx()`.
