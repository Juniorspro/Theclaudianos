# Juegos 2D en pixel art
Método completo: `docs/GUIA_JUEGOS_2D_PIXEL.md` (destilado de EL TIPO, que vive en otro repo).
Ver también: [banco](banco.md), [diario](diario.md).

## La regla de la serie (pedido del usuario, 2026-09-23)
**Cada juego 2D nuevo tiene que ser 100 % mejor que el anterior**: menús, botones y animaciones
mejores que los del anterior, y **una historia distinta cada vez**. Se comparan entre sí, así que
cada juego nuevo arranca leyendo esta nota y la ficha del anterior.

| # | juego | qué trajo de nuevo | archivo |
|---|---|---|---|
| 0 | EL TIPO (referencia, otro repo) | beat'em up, 5 niveles, jefes, tienda, portada viva | `docs/GUIA_JUEGOS_2D_PIXEL.md` |

## Lo que no se discute en un juego 2D de acá
- **Un solo HTML, cero red**: canvas 2D, audio sintetizado, sprites como grillas de texto.
- **Escala de pixelado ENTERA** (×2, ×3); con 1,94 todo tiembla.
- **Paso fijo de 60 Hz** y dibujo libre; los flancos de entrada se consumen **al final** del paso.
- **Nada de `setTimeout` para lógica**: todo se cuenta en cuadros.
- **Semilla para el mundo, `Math.random` para lo visual**: si las partículas usan el rng del
  mundo, la misma semilla deja de dar la misma partida.
- **Botones con `touchstart` y `preventDefault`**, nunca `click`.
- **Bot de completabilidad desde el día uno** y medición **con calentamiento** (200 cuadros) contra
  el commit anterior en el mismo banco.
- Personajes **por piezas** con una sola función `pose()`, no tiras de cuadros.

## Trampas que ya costaron una vuelta (las que más se repiten)
- El bot que deja la tecla apretada no genera flanco: el salto «no anda» y el juego está bien.
- Un botón nuevo sin nadie que lo prenda no aparece nunca.
- En CSS, `#contenedor .bt` le gana a `#bPausa`.
- Gradientes creados por cuadro: el dibujo se va a 9 ms.
- Una sonda que escribe el estado que mide aprueba cualquier cosa.
