# DUELO DE ARCOS — fútbol 1 contra 1 en 3D
`juegos-pc/Duelo.html` (~3,9 MB). Pedido del 26/09/2026: «recreame un juego en 3D muy parecido
[a Soccer Clash] y mejoralo al 100%: menú principal, carteles, texto, mecánicas y movimientos».
Nombre, arenas y jugadores propios (no se copia la marca). Primer juego 3D de la línea.

## Cómo se juega
- Por turnos: vos pateás al arco de arriba (el rival ataja) y después patea él a tu arco, pegado a
  la cámara. 90 s de reloj que corre sólo en juego; empate → muerte súbita de a un tiro.
- **Patear**: deslizar hacia el arco. Ángulo del gesto = dirección; velocidad + largo = fuerza y
  altura (pasarse de fuerza tira sin precisión); **la panza del camino = efecto** (Magnus). El tiro
  se resuelve simulando la trayectoria y corrigiendo la puntería 4 veces: termina donde apuntaste,
  pero curvo. El arquero rival **predice en línea recta**: el efecto lo engaña.
- **Atajar**: arrastrar el dedo mueve al arquero; soltar con un tirón rápido lo tira en esa
  dirección (tirón hacia arriba = salto). Hay una ayudita si la estirada pasa cerca de la pelota.
  Al patear el rival hay 0,3 s de cámara lenta para reaccionar.
- Barra de poder (goles y atajadas la llenan): pateando → SÚPER TIRO (fuego, más rápido y curvo);
  atajando → REFLEJOS (cámara lenta 1,8 s y más alcance). El rival también la usa.
- Goles con repetición a media velocidad desde el costado del arco; carteles según el gol
  (¡AL ÁNGULO!, ¡CON EFECTO!, ¡MISIL!, ¡SÚPER GOLAZO!); relator de CABEZONES.

## Equilibrio (medido con `pruebas/duelo/equilibrio.mjs`, dificultad 0,5, 30+30 tiros)
- Tus tiros: 43 % gol (ángulos 60 %, al medio 35 %, con efecto 53 %). Antes de ablandar al arquero
  (reacción 0,36−0,18d, estirada 1,35+0,45d, manos 0,14) entraban 4 de 30.
- Tiros del rival: sin moverte entran 14 de 15; tirándote a los 0,25 s, 4 de 15.

## Cómo está hecho
- three.js 0.160 como módulo desde jsDelivr (hace falta internet); ACES, sombras PCF 2048 sobre la
  cancha, cielo = cilindro gigante con el fondo pintado (sin luz ni niebla).
- Dos lienzos: el 3D abajo y la interfaz 2D encima (el kit de UI de CABEZONES y el módulo de idiomas
  funcionan tal cual). Pantalla **parada**: 412 de ancho; en pantallas anchas, columna centrada.
- Muñecos armados con cápsulas y animados por código (correr, patear, arquero, estirada, festejo,
  lamento, jueguito). Las manos, antebrazos, cabeza, torso y piernas son esferas de choque reales.
- Arte de Higgsfield: 3 fondos panorámicos 21:9 (`nano_banana_pro`), césped, franja de carteles
  (se recorta la banda de abajo: el pedido vino con una tribuna arriba), logo (bien escrito).
  Se reutilizan de CABEZONES placas, íconos, efectos de sonido, relator y el bucle de hinchada.
- Música: Rezona volvió a dar `NOIZ_FAILED`; samba y batucada con `herramientas/duelo/componer.py`
  (carga el de CABEZONES con `importlib`: los tres se llaman componer.py y se pisan).
- Llamadas de dibujo: 318 → 155 fundiendo palmeras, líneas, postes, caños de los arcos y sombrillas.
- Fuentes en `herramientas/duelo/fuentes/` (en el repo, no en el scratchpad); `armar.py` arma todo.

## Trampas del banco
- El bucle real (requestAnimationFrame) sigue corriendo mientras la prueba manda toques: el tiro
  terminaba antes de la estirada. `__D.congelar(true)` y el tiempo lo maneja `__D.anda(n)`.
- La velocidad de un gesto se mide con `e.timeStamp` del toque (no con `performance.now()`), y se
  mira además lo recorrido en las últimas tres muestras: con el navegador ocupado, llegan juntos.
- three.js viene de jsDelivr: `pruebas/duelo/cdn.mjs` lo baja con curl para el Chromium headless.
