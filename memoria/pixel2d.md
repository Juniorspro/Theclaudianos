# Pixel art y 2D procedural
Aprendido de dos juegos que el usuario **mostró para estudiar, no para copiar** (23/09/2026):
`GUIA_JUEGOS_2D_PIXEL.md` (la receta de EL TIPO, beat'em up) y `luz-mala-1.html` (metroidvania,
308 KB / 5.426 líneas). **Ninguno de los dos está en este repo ni se copia**: lo que sigue es lo que
enseñan. Lo que pida el usuario tiene que ser un juego **distinto**, no una versión de estos.
Ver también: [juegos](juegos.md) (3D), [repo](repo.md).

## Las reglas que mandan
- **Un archivo, cero red.** Canvas 2D, audio de osciladores, sprites como grillas de texto en el
  código. Sin CDN ni imágenes sueltas. (En 3D el repo sí usa CDN; en 2D no hace falta nada.)
- **Escala entera o tiembla.** El mundo se dibuja chico y se agranda ×2, ×3… nunca ×1,94, o los
  píxeles salen de distinto tamaño y todo vibra al moverse.
- **Una semilla = la misma partida.** Azar del mundo con un rng con semilla (`mulberry32`), azar
  **visual con `Math.random`**: si las partículas consumen el rng del mundo, la semilla deja de repetir.
- **Verificar midiendo**, con bot que juega y capturas a 412×892.

## El armado que usan los dos
- **Dos lienzos:** el del mundo (W×H píxeles de juego, escala 1, `alpha:false`) y el visible. Por
  cuadro se dibuja todo en el chico y se copia **una vez** agrandado, con `imageSmoothingEnabled=false`.
- `PX = round(lado_corto / base)` con `base ≈ 200`: en un celular de 412 da **2** y el mundo mide
  ~206 de ancho; en 1280×720 da 4 y mide 320×180. El lienzo se mide con `ResizeObserver` **y** una
  revisión cada tantos cuadros, y el cambio de tamaño se hace **al empezar** el cuadro (cambiarlo
  borra el lienzo: hecho después de dibujar, se ve un cuadro negro).
- **Bucle a paso fijo:** simulación a 60 Hz (`while(acum>=CUADRO && pasos<4)`), dibujo a lo que dé la
  pantalla. Así un teléfono de 120 Hz y uno trabado juegan el mismo juego.
- **Los flancos de entrada se borran al FINAL del paso**, no al principio, o «recién apretado» nunca
  se lee. Durante el hit-stop **no** se consume la entrada, así el golpe apretado en el congelado sale.
- **Nada de `setTimeout` para lógica de juego** (fin de nivel, muerte): se disparan encima del nivel
  siguiente. Todo se cuenta en cuadros.
- LUZ MALA separa **motor** (`base, idioma, pantalla, entrada, sonido, fuente, sprites, fx, bucle`) de
  **juego** (`fisica, bichos, jefes, salas, textos, letra, arte, musica, menus, dibujo, pantallas`) y
  los concatena adentro de **una** función `'use strict'`. Buena idea para reusar sin copiar y pegar.

## Sprites: grillas de texto horneadas
- Cada sprite es un array de strings, **una letra por color** + paleta (`'.'` es aire). Se **hornea
  una vez** a un lienzo chico (y su espejo) y después sólo se copia: pintar píxel por píxel cada
  cuadro cuesta mucho más. Pasar los enemigos a piezas horneadas bajó el dibujo de 2,46 a 1,51 ms.
- El **contorno de 1 px se genera solo** mirando los vecinos llenos: no se dibuja a mano en cada cuadro.
- Variantes baratas del mismo horneado: espejo (`scale(-1,1)`) y **silueta de un color** para el
  destello al recibir un golpe.
- **Personaje por piezas, no por tira de cuadros:** una función `pose()` devuelve las articulaciones
  (cadera, hombros, cabeza, manos, pies, inclinación) y cada pieza se corre `(pose − reposo) × 1,3`.
  Una sola función da todas las animaciones. Topes: estirar al 135 %, no al 165 %, o los brazos
  quedan de goma; el lienzo donde se compone necesita aire (104×84 para un muñeco de 28×46).
- **Un rol de color por cada cosa que pueda cambiar** entre personajes, o el rey sale con barba de oro.
- Escalar jefes por **vecino más cercano**: algún píxel doble, nunca medios tonos.

## Luz y fondos
- Dos maneras de oscurecer, las dos válidas:
  - **Trama Bayer 4×4** (EL TIPO): se ve a consola, y sirve de fundido llenándola de 0 a 16.
  - **Oscuridad suave** (LUZ MALA): la oscuridad se pinta **a media resolución** en un lienzo aparte,
    las luces le cortan agujeros con degradés radiales en `destination-out`, y se agranda **suavizada**
    (ahí sí `imageSmoothingEnabled=true`). Encima, cada luz suma su color. Barato y queda hermoso.
  - Sumale una **viñeta** radial y que la oscuridad de cada zona sea un número del tema, que baja
    cuando el jugador resuelve algo (prender un farol).
- **Lo oscuro nunca es negro puro:** violetas y marrones muy bajos, y lo que se lee de lejos es lo que
  brilla (ojos, una capucha naranja, la luz del personaje).
- **Lo fijo se pinta una vez** en un lienzo por sala/tira y después se copia. Crear degradés por cuadro
  llevaba el dibujo a 9 ms. Cacheado: cielo, tiras de parallax, patrón de tierra, textos, íconos.
- **Parallax:** `desp = ((-cam.x*p) % w + w) % w`, la tira dibujada dos veces. Lo que se mueve
  (neones, humo, banderas) **no** va horneado en la tira: son puntos registrados que se pintan aparte.
- Las paredes más oscuras cuanto más adentro de la madera: los pasillos parecen tallados.

## Texto e interfaz sin fuentes
- **Fuente propia de 5×7** en una tabla, con tildes, Ñ, Ü y ¡¿ como marcas encima. LUZ MALA usa una
  de 9 filas con minúsculas de verdad (0-6 mayúsculas, 2-6 cuerpo, 7-8 lo que baja) y **halo en vez de
  contorno negro**: la letra dice de qué juego es. Cachear cada texto dibujado.
- Los textos largos en píxeles **no se leen en el celu**: para instrucciones, monoespaciada en negrita.
- Menús **dibujados en el lienzo** (palabras que se prenden) en vez de botones del DOM: quedan del
  mundo del juego. Entonces hace falta una sonda que diga dónde tocar cada palabra en píxeles de ventana.
- Mandos táctiles flotando sobre el juego, `touchstart` con `{passive:false}`, cada dedo por su
  `identifier`. Gestos (deslizar el botón de golpe) dan más acciones sin más botones.

## Mundo procedural
- Un nivel/mapa = segmentos con tipo (pasillo, plataformas, trampa, tesoro, arena, jefe), sacados del
  rng con semilla.
- **Alcanzabilidad por construcción:** primero se miden el salto y sus medidas reales (EL TIPO: 84 de
  alto, 94 de largo → se generan huecos de 82×70; LUZ MALA: 5,5 × 6,5 baldosas), y **después** se
  generan huecos que entren en eso. Al final un validador tapa lo que se escape.
- LUZ MALA va más lejos: la física es **código puro sin DOM ni audio**, así un **resolvedor en Node**
  recorre el mapa entero con la misma física del juego y comprueba que se puede llegar a todo y que lo
  cerrado está cerrado. **Esto es lo más copiable de todo: separar la física del navegador.**
- Nunca huecos sin fondo que devuelvan al principio: caer devuelve al último piso firme.

## Sondas (`window.__X`) que hacen falta
`empezar(sala, {habilidades})` para saltear la intro, `anda(n)` que adelanta **todos** los relojes,
`entrada(accion, v)`, `poner(x,y)`, `estado()`, `medidas()` (ms de dibujo, W, H, PX, partículas),
`menu()` y `donde(id)` para tocar de verdad, y una `hoja(nombres)` que arma una lámina de sprites
agrandados para mirar las animaciones. Un número demasiado redondo suele ser la sonda rota.

## Sonido en iOS (trampa del 23/09/2026)
- **El audio web respeta el interruptor de silencio del iPhone** y el contexto arranca suspendido: con
  el teléfono en silencio, el juego queda mudo aunque todo "ande". Arreglo, en cada toque:
  `navigator.audioSession.type='playback'` (iOS 17+), un `<audio>` mudo en bucle con un WAV `data:`
  (iOS viejos: pasa la sesión a reproducción) y `ac.resume()` si no está en `running`.
  Está en `Chicharra.html` y `Arrabal.html` (buscar `SILENCIO`).

## Medir sin mentir
200 cuadros de calentamiento y 300 de medición, y comparar **contra el commit anterior en el mismo
banco**: el mismo dibujo daba 2,7 o 5,6 ms según cómo se midiera. El bot de pruebas tiene que
**soltar** las teclas, o no hay flanco y el salto nunca sale (dos vueltas perdidas culpando al juego).
