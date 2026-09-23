# CABEZONES — fútbol de cabezas del barrio
`juegos-pc/Cabezones.html` (~3 MB, todo adentro). Pedido del 23/09/2026: «un juego parecido a
"Head Ball"… controles móviles, mejores gráficos 2D, animaciones, menús… mejorá todo en un 100%».
No se copian jugadores reales: diez cabezones originales de barrio.

## Qué tiene (lo que lo hace distinto de ARRABAL)
- Uno contra uno de cabezas con botín. Mundo de 900 de ancho, entra entero; apaisado y **se gira
  solo** en vertical (el `Pantalla` de ARRABAL, con `aMundo`/`aVentana`).
- Mando tipo Head Ball: ◀ ▶ abajo a la izquierda (se desliza de una a otra sin levantar el dedo),
  SALTO / PATADA / PODER abajo a la derecha. Multitáctil leyendo **todos** los `Entrada.dedos`
  cada cuadro (`c6_mando.js`), el aro de PODER se llena con la barra.
- 10 personajes con velocidad, salto, disparo, tamaño y un poder (fuego, chanfle, cabezón, muralla,
  chancleta, boleadoras, onda, turbo, rayo, silbato). Rareza, nivel 1–10 (+3 por nivel), compra.
- Torneos: 3 copas con llave de 8 (cuartos, semi, final), premios por ronda, las líneas de la
  llave se dibujan animadas al pasar de ronda. Gol de oro si empatan (fuera del partido rápido).
- Pantallas: portada con partido de muestra de fondo, menú, vestuario, torneos, llave, VS,
  partido, pausa, resultado (monedas que cuentan), cofre (tres toques y explota), ajustes.
  Cortina de franjas con pelota entre pantallas; fogonazo blanco del VS al partido.
- Arte Higgsfield: cabezas `gpt_image_2_5` con fondo transparente (0,5 créditos c/u), 3 caras por
  personaje (normal, gol, bronca: la segunda y tercera con `medias` role `image_references` = el
  job de la normal); canchas `nano_banana` 16:9 2k.

## Segunda vuelta (23/09): Rezona para botones y efectos, relator, dos piernas
Pedido: «Genera mejores botones y animaciones etc con Rezona también dos piernas y eso mejor música
recuerda que Rezona crea música y voces etc guardalo en memoria».
- **Arte de interfaz de Rezona** (`herramientas/cabezones/pedir_arte.py` + `hornear_ui.py`): botones
  redondos del mando (◀ ▶ salto patada poder pausa), placas de botón en blanco que el juego estira en
  tres partes (`placa()` en la UI: las puntas no se deforman), logo CABEZONES (salió bien escrito),
  trofeos, cofre cerrado y abierto, moneda, gema, un botín por personaje.
  - Trampas: los botines salieron con **rayas o curvas de marcas conocidas** y dos trofeos con pelota
    de rugby: se pidieron de nuevo con «original unbranded, no logos, no stripes» y «round soccer ball».
  - Pedir de a 6 en vuelo: el tope de 12 lo comparte con otros scripts, y
    `GENERATION_RATE_LIMITED` / `TOO_MANY_IN_FLIGHT` no cuentan como intento.
- **Efectos animados**: hojas 4x4 de 16 cuadros (explosión, fuego, polvo, impacto, rayo) con una sola
  imagen. Salen coherentes. A veces `transparent` no se aplica y vienen **sobre magenta con reja
  negra**: `hornear_ui.py` saca el magenta con despill y recorta 3 % de cada celda.
- **Relator**: Rezona voz dio `NOIZ_FAILED`; las 18 frases salieron de Higgsfield `seed_audio`
  (voz preset «Andre»), horneadas en `voces.mp3` + `voces.json` (`hornear_voces.py`, variantes gol0…
  gol2). `Sonido.voz()` habla de a una frase, la de gol pisa, y baja la música mientras habla.
- **Dos piernas**: `PIERNA=30` (de la cabeza al piso, antes 14 y quedaban tapadas por el cuello del
  dibujo). Paso de carrera alternado, rodillas arriba en el aire, la de adelante barre al patear,
  la de atrás en sombra (botín oscurecido **en un lienzo aparte**: `source-atop` sobre el lienzo
  principal oscurece un cuadrado de todo lo que haya abajo).
- **Música**: Rezona siguió dando `NOIZ_FAILED` toda la tarde (el script `pedir_audio.py` reintenta
  cada 2 min). Mientras, la sintetizada pasó a estéreo (sala ancha, retardo Haas, toque humano ±5 ms).

## Cómo se arma
- Fuentes JS en el scratchpad de la sesión (`cab/c0…c9`), orden: base, entrada, sonido, datos,
  partido, ui, vista, mando, menús, bucle. Si se pierden, se sacan del HTML (es JS plano).
- `herramientas/cabezones/hornear.py <crudo>`: recorta cada cabeza a su **mancha principal**
  (scipy `label`, deja afuera chispas sueltas), 256² WebP; canchas a 1600 de ancho.
- `componer.py` (4 temas: cumbia de menú, murga-rock de partido, final épico, bucle de hinchada) y
  `efectos.py` (33 efectos) **importan** los de `herramientas/arrabal/` y suman güira, cencerro,
  acordeón, bronces y voces con formantes.
- `empaquetar.py` mete `assets/cabezones/*` como data: en el HTML.

## Equilibrio (medido con `pruebas/cabezones`, 12 partidos IA contra IA)
- Al principio salían 18-4: la IA perseguía la pelota y dejaba el arco vacío, y los tiros rasantes
  desde campo propio entraban. Arreglos: vuelve a tapar si la pelota le pasó, espera en 3/4 si la
  pelota está lejos, salta como arquero sólo si la pelota pasa **por encima de la cabeza** (saltar
  con la pelota a la altura de la cara la deja pasar por abajo), no empuja la pelota a su arco
  (la salta), tiros más en arco, más roce en el aire, arco de 148.
- La dificultad `d` pesa en velocidad (×0,62+0,38d), reacción, puntería y saltos: 0,8 contra 0,3
  gana 6-3; iguales ~6 goles por lado. Pibe (fuego) era el más fuerte: aturde 0,8 s, no 1,3.
- Trampa del banco: si hubo gol, el partido está en `gol`/`saque` y no obedece el mando; esperar
  `estado==='juego'` antes de probar un botón.

## Pruebas
`pruebas/cabezones/`: `menus.mjs [vertical]` (todas las pantallas + un partido entero con la IA
manejando al jugador), `mando.mjs` (toques CDP de dos dedos, deslizar, salto, pausa; parado y
apaisado). Sondas en `window.__H` (`jugar`, `iaYo`, `partido`, `tocar`, `zona`…).
