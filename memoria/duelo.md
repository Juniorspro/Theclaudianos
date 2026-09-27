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
- Tus tiros: 50 % gol (ángulos 80 %, al medio ±0,8 m 35 %, con efecto 40 %) con los futbolistas de mocap.
  Con la estirada de mocap tal cual entraban 60 % (el arquero no llegaba) y con IK a la pelota exacta 17 %:
  el IK apunta a donde el arquero CREE que va (con el error de la IA), no a la trayectoria real.
  IA: demora 0,39−0,18d, error (1,35(1−d)+0,3), manos 0,14.
- Tiros del rival: sin moverte entran 12 de 15; tirándote a los 0,25 s atajás 8 de 15.

## Cómo está hecho
- three.js 0.160 como módulo desde jsDelivr (hace falta internet); ACES, sombras PCF 2048 sobre la
  cancha, cielo = cilindro gigante con el fondo pintado (sin luz ni niebla).
- Dos lienzos: el 3D abajo y la interfaz 2D encima (el kit de UI de CABEZONES y el módulo de idiomas
  funcionan tal cual). Pantalla **parada**: 412 de ancho; en pantallas anchas, columna centrada.
- **Futbolistas** (`fuentes/d6b_futbolista.js`, `assets/duelo/jugador-*.glb` ~1,9 MB c/u + `viajes-*.json`):
  malla de Rezona, **esqueleto y 14 clips de la biblioteca de mocap de Meshy** (vía Higgsfield `3d_rigging`,
  8 créditos c/u: patada, carrera, sprint, caminata, 3 idles, 2 lamentos, 3 festejos, levantarse, atrapar) y
  **8 clips sacados de video con MediaPipe** (estiradas alta/baja/lateral izq y der, postura de arquero x2).
  Capas por código: IK de manos a la pelota, IK de pierna en el contacto de la patada y en el jueguito,
  cabeza que sigue la pelota, pies al piso, guantes pintados por peso de hueso, número pintado en la textura.
  El muñeco de cápsulas (`d6_jugador.js`) queda de respaldo; `posar`/`partesArquero`/`vestirJugador`/
  `pasarVolada` despachan según `J.glb`. La patada sale en el **contacto real** (`J.contacto`) y el
  pateador se para donde su pie llega a la pelota (`puntoDePatada`). La repetición graba `te` y `var`.
- Tubería de mocap (herramientas en `herramientas/duelo/modelos/mocap/` y `hornear_clips.mjs`):
  - Meshy necesita la malla **mirando a +Z**: la de Rezona mira a +X y el rig sale roto (piernas
    encimadas). `girar.mjs` hornea −90°, `media_upload` de Higgsfield da la URL pública.
  - **Cada pedido ajusta el esqueleto distinto** (hasta ~9 cm): no se copian rotaciones; se hace
    retarget por delta de rotación en mundo contra un esqueleto base (`retarget_esq.html`).
  - «DeepMotion casero»: video Kling 3.0 (7,5 créditos, cámara FIJA, cuerpo entero) → MediaPipe Pose
    heavy en Chromium con recorte que sigue al cuerpo (`mediapipe.html`, 121/121 cuadros) → retarget por
    direcciones con marcos de cadera/pecho/cabeza y giro de rodilla/codo (`retarget_mp.html`) → espejo.
    El viaje lateral sale de la trayectoria 2D; con cámara que sigue no hay viaje (se pone uno sintético).
  - `hornear_clips.mjs` saca el viaje de las estiradas (el juego lo escala hasta la pelota) y centra la
    cadera de los idles (el cuerpo queda donde el juego cree: antes estaba corrido 23 cm).
- **Tiro preciso** (`leerTiro` en d7): la pelota va adonde termina el dedo, proyectado al plano del arco con
  `rayoAPlanoZ` (perspectiva real). Trazo corto → se prolonga por la cuerda hasta la línea del arco y la fuerza lo
  levanta. El trazo es `Entrada.traza` (cada evento con su `timeStamp`), no un punto por cuadro. Medido con
  `pruebas/duelo/precision.mjs` (toques CDP, sin arquero): error medio **2 cm** (antes 2,87 m, peor 6 m).
  Mientras se apunta se dibuja el trazo suavizado, la trayectoria con la misma física (`trayectoriaTiro`) y la mira.
- Cámara de patear: detrás de la pelota (`sx, 2,8, sz+6,8`, mira a `sx·0,5`, fov 46), buscada por fuerza bruta
  con la pelota en las esquinas: arco ~65 % más grande y pelota+pateador siempre en pantalla. Ojo: en pantalla
  parada el campo horizontal es angosto; una cámara cerrada que no sigue a la pelota la deja afuera.
- **Bucle**: un paso por cuadro dibujado, del largo real (partido en ≤1/60 s). Con pasos fijos de 1/60, a 90/120 Hz
  había cuadros repetidos. La repetición se graba a 60 por segundo por tiempo (`grabar(dt)`).
- Paso lateral del arquero: mocap de video (`arquero_paso_izq/der`, 1,12 m por ciclo) mezclado por velocidad
  lateral; la fase avanza con la distancia (no patina). La velocidad se mide con `J.t` porque en vuelo se posa con dt=0.
- Trampas (cada una costó una vuelta):
  - Los atributos de piel vienen **entrelazados** (así escribe gltf-transform): `.array` lee basura
    (puntitos de guante en el torso); se lee con `getX..getW`. Y `getComponent` no existe en r160.
  - **El idle de Meshy viene flotando 17 cm**: la altura de apoyo de los pies se mide en la pose de reposo.
  - El mocap de la patada pasa el pie 10 cm por arriba del centro de la pelota: IK de pierna en el contacto.
  - La estirada de mocap tarda (paso de impulso): se arranca desde el despegue, la mano llega en 0,3 s y la
    cadera sale disparada de entrada; en la fase de vuelo el arquero se posa con dt=0, así que la estirada
    corre con su propio reloj `J.p`.
  - `AnimationMixer` no reescribe un hueso que no cambió: se restaura la pose limpia antes de cada update.
  - En `__D.evalua` con números interpolados: `P.zArco-${z}` con z negativo da `--` (error de sintaxis): paréntesis.
  - Una captura con `isMobile:true` recorta la escena: para fotos, sólo `hasTouch`.
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
- Sonda: `__D.yo()`, `__D.el()`, `__D.posar(J,dt)`, `__D.cam()`, `__D.render()`, `__D.evalua(código)` (corre dentro del alcance del juego: `posarFutbolista`, `B`, `P`...).
