---
name: juego-vertical
description: Receta para juegos verticales de saltos para celular (a lo Ninja Tobu) — torre de celdas en anillo, tramos generados y verificados por una búsqueda con la física real, arrastre con cámara lenta, doble salto, siluetas sobre paletas intercambiables, modo infinito con tinta que sube y un bot de banco que juega. La usa juegos-pc/Sombra.html.
---

# Saltos verticales — la receta de SOMBRA

Fuentes en `herramientas/sombra/fuentes/`, se arma con `herramientas/sombra/armar.sh` y el banco está en
`herramientas/sombra/banco/` (bot.js, inf.js, dedo.js, fuzz.js, pantallas.js). **Se edita la fuente.**

## Pantalla
- **Vertical, sin girar** (`GIRADO = false`). La torre mide 176 px (22 columnas de 8) y el lienzo se agranda por un
  entero: `PX = floor(min(anchoReal, altoReal·0,62)/180)`. En una pantalla ancha sobran costados: se pintan de torre.
- Cámara con el ninja al 60% de la altura (se ve más para arriba) y **topada abajo**: sin tope, al arrancar se veía un
  38% de pantalla de piso macizo.

## La torre
- Un **anillo de 2048 filas** (`idx = ((r % N) + N) % N`): en el infinito lo nuevo de arriba pisa lo viejo de abajo.
  Fuera de lo generado: sólo las dos paredes de afuera; abajo del piso, piedra.
- Se hornea en **bloques de 16 filas** con la versión del mapa (`MAPA.ver`) y el efecto: cambiar una piedra o la paleta
  rehace sólo lo que se ve.

## Tramos generados y verificados
- Cada tramo (repisas, islas, columna, embudo, pinchera, móvil, desmorona) arma unas filas con la dificultad `d` y deja
  gente y plataformas. Entre tramos, un descanso que cruza la torre con un hueco.
- **`alcance()`**: nodos = lugares donde el ninja queda pegado; desde cada uno se prueban 28 direcciones × 3 fuerzas con
  **el mismo paso de física que el juego** (1/240). Con un paso distinto (1/60) el bot seguía caminos que en el juego no
  existían y quedaba yendo y viniendo.
- **Búsqueda golosa hacia arriba** (montón por altura): a lo ancho se agotaban 2.500 nodos antes de llegar arriba en las
  torres largas. Golosa: 30-40 ms por nivel, ~180 nodos.
- Si no llega, otra semilla. **Las monedas van sobre los arcos del camino encontrado**: guían y siempre se pueden agarrar.
- Sin doble salto ni plataformas móviles en la búsqueda: son margen para el jugador.

## Física y control
- Arrastrar para atrás y soltar (`v = −arrastre·5,6`, tope 345). Mientras se apunta, el tiempo va a 0,3 pegado y 0,1
  en el aire (Kaze lo baja más). No se puede tirar contra la superficie donde se está pegado.
- Se pega a cualquier piedra por el lado del choque; los pinchos perdonan 1,5 px. Cada baja devuelve el doble salto.
- **Con el ninja invencible, un pincho lo congela en el aire** (`morir()` vuelve sin moverlo): el bot invencible no
  sirve para medir niveles con pinchos, hay que usar el mortal.

## Arte
- Todo en silueta sobre un cielo en bandas con trama; el ninja es de huesos (poses pie/pared/techo/bola/salto/apunta)
  con una bufanda de verlet. Los efectos de la tienda son **paletas enteras** (cielo, sol, montes, torre, siluetas,
  partículas, tinte del revelado); cada mundo trae la suya.
- En el menú hay una torre infinita con un ninja que salta solo (elige al azar saltos que lo dejan pegado).
- **El fundido de entrada sólo bajaba en `paso()` del juego**: en el menú quedaba en 1 y la pantalla salía negra.

## Banco
- `bot.js`: en cada lugar pegado planea el camino entero al torii y **sigue el plan**; re-planea sólo si cayó en otro
  lado. Re-planeando en cada salto quedaba oscilando entre dos esquinas. Si un tirador está cargando, salta ya.
- `inf.js`: el mismo bot con la meta 300 px más arriba; mide altura, causa de muerte y el cuadro más lento (la
  generación de un tramo nuevo).
- `jefes.js`: arranca en la repisa izquierda de la arena (el jefe se activa al subir 14 px del piso) y apunta
  prediciendo la velocidad del jefe.

## Jefes
- Arena cerrada al final del desafío 8: piso con hueco, repisas, techo doble con hueco; la verificación llega hasta el
  techo y **recién después** se ponen las rejas (`T_REJA`, sólida para ninja y balas).
- Se le pega atravesándolo en el aire con una regla por jefe (entera, de arriba o por la espalda); de otro modo rebota.
  Todo ataque se avisa antes («!», marcas, línea roja).
- Ganar mira que el jefe **terminó de caer** (`fuera`), no que murió. Morir contra el jefe vuelve a la arena.

## Adornos
- Todo lo que sea sólo visual **no puede usar el azar del nivel**: cambia todos los niveles ya verificados. Va con un
  hash de la fila.

## Personajes
- Sprites en grilla de letras (`3b_personajes.js`): cada letra es un color de la paleta del efecto, se pintan en una
  lámina de 48×48, se giran ahí (vecino más cercano) y recién después llevan la luz de borde (aire arriba → fuerte, a la
  izquierda → suave) y un contorno tenue. Girar después de la luz la pondría del lado equivocado.
- La `y` de un enemigo es la **superficie**: los pies van en la fila de arriba (dy −1). El dibujo viejo los hundía.
- Lo que se dibuja con trazos (jefes) pasa por `conLuz`: se pinta aparte y se leen los píxeles opacos y oscuros.

