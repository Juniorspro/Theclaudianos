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
- Tus tiros: 47 % gol (ángulos 70 %, al medio 35 %, con efecto 47 %) con los futbolistas de Rezona.
  Con los muñecos eran 43 %; al pasar al modelo nuevo saltó a 70 % hasta que la estirada apuntó las
  manos al objetivo (ver abajo). Antes de ablandar al arquero entraban 4 de 30.
- Tiros del rival: sin moverte entran 14 de 15; tirándote a los 0,25 s, 7 de 15.

## Cómo está hecho
- three.js 0.160 como módulo desde jsDelivr (hace falta internet); ACES, sombras PCF 2048 sobre la
  cancha, cielo = cilindro gigante con el fondo pintado (sin luz ni niebla).
- Dos lienzos: el 3D abajo y la interfaz 2D encima (el kit de UI de CABEZONES y el módulo de idiomas
  funcionan tal cual). Pantalla **parada**: 412 de ancho; en pantallas anchas, columna centrada.
- **Futbolistas**: GLB de Rezona (`assets/duelo/jugador-rojo.glb`, `-amarillo.glb`, ~1,5 MB c/u,
  29 mil triángulos, 41 huesos, clips idle/run/walk/jump/hurt) en `fuentes/d6b_futbolista.js`.
  Patada, postura de arquero, estirada, festejo, lamento y jueguito = huesos girados **encima** del
  clip. El muñeco de cápsulas (`d6_jugador.js`) queda de respaldo si el GLB no carga; `posar`,
  `partesArquero` y `vestirJugador` despachan según `J.glb`. Esferas de choque en los huesos.
  La camiseta se cambia repintando la textura por reglas de color (HSV), con caché.
- Cómo se armó el GLB: `face_limit:30000` al pedir el modelo; **el rig devuelve UN clip por pedido**
  → un rig por animación y se juntan por nombre de hueso con `herramientas/duelo/modelos/juntar.mjs`
  (también saca metal/rugosidad y pasa texturas a webp 1024).
- Trampas del modelo (cada una costó una vuelta):
  - El esqueleto viene **con z arriba**: el avance de la carrera está en la `y` de la cadera. Se
    detecta el eje vertical (el mayor en idle) y se clavan los otros dos; si no, el que corre se va.
  - El ángulo para mirar a −z es `π − atan2(f.x, f.z)` (f = talón→punta del pie).
  - Calibrar ejes **en la pose de idle**, no en la de reposo (brazos en cruz). Puntuar por
    desplazamiento sin normalizar; el giro del tronco se calibra con los dos hombros opuestos.
  - `AnimationMixer` **no reescribe un hueso si el valor no cambió** (dt=0 o dos veces por cuadro):
    los giros de encima se acumulaban y el arquero terminaba cabeza abajo. Se guarda la pose limpia
    y se restaura antes de `mixer.update`.
  - La estirada acuesta todo el cuerpo (rotación z de la raíz, orden YXZ) apuntando las manos al
    objetivo; los pies sólo se corren lo que falta. Con el rolido de cadera las manos quedaban bajas.
- Cancha: césped de 6 capas (conchas con alphaTest, 3 si baja la resolución) sobre textura con
  franjas y líneas pintadas en metros; bloom + viñeta + saturación (se apaga con escala < 0,75);
  banderines que flamean, LED que corren, bancos de suplentes, techos de tribuna, fotógrafos.
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
- Sonda: `__D.yo()`, `__D.el()`, `__D.posar(J,dt)`, `__D.cam()`, `__D.render()` para hojas de poses.
