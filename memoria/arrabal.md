# ARRABAL — juego de pelea con cartas
Archivo: `juegos-pc/Arrabal.html` (un solo HTML, ~8,6 MB con el arte y la música adentro, sin red).
Arte: `assets/arrabal/` + `herramientas/arrabal/`. Banco: `pruebas/arrabal/`. Ver también:
[pixel2d](pixel2d.md), [chicharra](chicharra.md) (el motor que se reusó), [rezona](rezona.md).

## Qué es
Pedido del 23/09/2026: «un juego parecido a Skullgirls: Fighting RPG… mejores gráficos 2D,
animaciones, menús… mejorá todo en un 100%». **Todo original**: seis luchadores de un Buenos Aires
de los años 30 (La Morocha, El Bandoneón, Chispa Farolera, Doctor Mate, La Parca del Riachuelo,
Colectivo), marcos de fileteado porteño en vez de art déco, tangos propios.
- Peleas de equipos de 3 contra 3 con relevo al caer; cartas por rareza (bronce, plata, oro,
  diamante), elementos (agua > fuego > viento > agua; luna y sol entre sí), firma pasiva por carta.
- Campaña de 15 peleas en 3 barrios (la 5.ª de cada uno es jefe), árbol de habilidades de 8 nodos,
  cofre de cartas con fichas (repetidas dan estrella), subir nivel con monedas.

## Modo arcade (23/09/2026)
Pedido: «Haz el estilo más Arcade el segundo juego». Se sumó, sin tocar la historia con cartas:
- **Atracción**: la portada corre una pelea demo CPU contra CPU (`M.modo='demo'`) con «TOCÁ PARA
  EMPEZAR» titilando; un toque va al menú (ARCADE, HISTORIA, cartas, cofre, récords, ajustes).
- **Arcade**: elegir luchador en grilla con cuenta regresiva de 20 s (al llegar a 0 juega el marcado),
  VS en diagonal, escalera de 6 (los otros cinco y un jefe final), rondas de 60 s al mejor de tres.
- Puntaje: daño × 10 + 50 por golpe de combo; bonos al ganar ronda: tiempo × 100, vida (hasta 5.000)
  y ¡PERFECTO! +10.000. ¿Continuás? de 10 s (el puntaje vuelve a cero). Récords top 5 con iniciales,
  guardados en `Prog.ranking` (arranca con cinco récords de fábrica).
- Look de salón: `textoArcade()` (cursiva gorda con degradé y borde), carteles con zoom y temblor
  («RONDA 1», «¡PELEEN!», «RONDA FINAL»), anuncios de combo en 5/10/15/20 golpes, y `capaCRT()`: líneas de
  tubo + viñeta + un barrido claro que baja (se apaga en ajustes: «EFECTO DE TUBO»).
- La historia usa el mismo motor con `modo='historia'` (equipos y relevos, sin rondas).

## Efectos de sonido de los golpes (23/09/2026)
Pedido: «Ponle efectos de sonido a los golpes». Antes eran un tono + un soplo sintetizados al vuelo.
- `herramientas/arrabal/efectos.py` (usa las funciones de `componer.py`): 44 efectos, 20 nombres,
  en **un solo** `sfx.mp3` (96 kbps, 237 kB) + `sfx.json` (en `ARCHIVOS.sfxMapa`: `[inicio,largo]`
  por variante, `_largo` total). Impacto por capas: cuerpo (seno que cae), chasquido, cachetazo y
  crujido en los pesados. También patada, madera, metal, garra, bloqueo, silbidos, crítico, K.O.,
  caída, fuego, electro, agua, viento, cadena, dash.
- `Sonido.fx(n,vol)` prueba primero `Sonido.muestra()` (variante al azar distinta de la última,
  tono ±6 %, `GANANCIA_SFX`, retardo del MP3 de 1105 muestras si el navegador no lo recortó) y si
  no hay grabado cae al sintetizador. `sonarGolpe()` (a6) arma las capas: patada si el golpe es de
  pierna, arma según `CAPA_ARMA[estilo]`, crítico encima y peso grave en `parada>=10`.
- Prueba: `pruebas/arrabal/efectos.mjs` cuenta qué efecto suena en cada golpe.

## Movimiento, golpes, banda sonora y menú (23/09/2026)
Pedido: «Mejora los movimientos y los efectos de los golpes y movimientos y agrégale banda sonora y
mejora el menú principal».
- **18 cuadros** por luchador: hoja c = `paso1 paso2 prepGolpe prepPatada levanta volando`
  (caminar en ciclo de 4, preparaciones en `jabPrep/patPrep/fuertePrep`, levantarse, salir volando).
  Hojas con 7 figuras (kanji, buzo): `SALTEAR` en `hornear_sprites.py`. Recorte ahora por
  **cuerpos en orden de lectura** + lo chico al cuerpo más cercano de su fila.
- `dibujarSprite()`: tirón hacia adelante al entrar un cuadro de golpe, aplastar al caer, estirar al
  saltar, inclinarse al recibir, girar volando, fundido corto con el cuadro anterior, estela de
  siluetas de color en dash/especial/súper, destello blanco del golpeado (`F.tBlanco`), temblor
  del golpeado durante el congelado, sombra que se achica con la altura. Silueta = lienzo de
  trabajo con `source-in` (no se cachean atlas blancos: memoria).
- FX nuevos (a7): `onda` (aro), `tajo` (medialuna en armas y especiales), `acercar` (zoom de
  cámara en `parada>=10` o crítico, en `dibujarPelea`), `velocidad` (líneas de historieta, súper).
- **Banda sonora compuesta y sintetizada en Python** (`herramientas/arrabal/componer.py`): la música
  de Rezona falló dos veces el mismo día. Seis temas (menú, conventillo, milonga, riachuelo, jefe,
  relicario), MP3 mono 64 kbps a 32 kHz, 1,8 MB en total, nivel por RMS (−14 dB). El bucle pliega
  la cola de la reverb sobre el principio. `musica.json` guarda el largo exacto: **Chrome no recorta
  el retardo del MP3** (medido por correlación: 1105 muestras a 32 kHz = 576 + 529) → `loopStart`
  y `loopEnd` en `ponerPista`. Prueba: `pruebas/arrabal/musica.mjs`.
- Menú: pareja de luchadores que cambia cada 5 s (entran corriendo, VS, cruzan golpe y bloqueo con
  chispa y sonido), reflectores, humo, logo con halo y brillo, ARCADE que late, marquesina con
  récord y consejos. `cuadroSuelto()` dibuja un cuadro fuera de la pelea.
- Peso: sprites 3,3 MB (guardia a 250 px, WebP 78) + música 1,8 MB → HTML ~8,6 MB.

## Sprites pintados (23/09/2026)
Pedido: «personajes de pelea 2D con anatomía humana realista… NO quiero personajes tipo palito…
con los modelos que te mandé». Los modelos de la hoja de Street Fighter no se copian: se pintaron
**los 12 propios** con ese estilo (cuerpo entero, manos, pies, ropa).
- 12 cuadros por luchador: `guardia golpe patada golpeado caido victoria` (hoja a) y `alzada barrida
  salto bloqueo especial dash` (hoja b), de Rezona con el retrato como referencia (receta en [rezona](rezona.md)).
- `hornear_sprites.py`: borra la grilla (filas/columnas llenas > 97 %), abre 5x5 para separar poses
  pegadas por rayas finas, cada mancha a la celda de su centro, tira lo que cae debajo de los pies
  (texto) y las sombras chatas. Escala por el **alto del cuerpo** (la mancha más grande, sin los peces
  de La Parca) y la hoja b se empareja por `bloqueo` = `guardia`. Ancla x: columna más cargada del
  torso. Salen `sprites-<id>.webp` (atlas) + `sprites.json` (`[x,y,w,h,anclaX,anclaY]`).
- En el juego (a5): `dibujarSprite()` pisa al títere si el atlas llegó; `cuadroSprite()` elige el
  cuadro por estado y, en un ataque, por la pose clave del golpe (`CUADRO_DE`). La guardia pintada
  mide `142 × alto × TAM`. `empaquetar.py` mete los `.json` como objeto en `ARCHIVOS`.
- Trampa: la primera versión del borrado de grilla (> 60 %) cortó a todos en tiras: una columna que
  cruza dos figuras apiladas ya pasa el 60 %. Mirar siempre el atlas armado.
- Pesa: 3,1 MB de sprites; el HTML queda en ~5,9 MB.

## Los seis de la segunda tanda (23/09/2026)
Pedido: una hoja de sprites de Street Fighter con «Agrega esos modelos de personajes». **No se
copian personajes con dueño** (ni parecidos): se hicieron seis originales de arquetipos parecidos
y se le explicó al usuario. Plantel de 12, grilla de selección 4 × 3.
- DON KANJI (maestro de karate, `punos`), XIAO FENG (bastón largo, `baston`), EL BUZO TÁCTICO
  (comando anfibio, `arpon`), EL LOBIZÓN (hombre lobo del folclore, `garras`, cabeza propia
  `cabezaLobo()` en vez de cara + peinado), EL TORO DE MATADEROS (luchador enmascarado, `lucha`),
  VALE (colegiala con palo de hockey, `palo`). Cartas `ka/xi/bu/lo/to/va 1-3`.
- Especiales y súper de cada uno: `ESPECIALES`/`SUPERS` en a6; proyectiles nuevos: palma, arpón (tira
  del rival como el anzuelo), mina (trampa que cae donde está el rival si está entre 60 y 300; si no,
  a 200), aullido, bocha, torpedo, lluvia de bochas. Retratos de Rezona (fondo transparente).
- Números: la mina fija a 120 no tocaba a nadie (0 de daño); el torpedo a 420 pasaba de largo
  (2 de 6 golpes) → 280; la lluvia de bochas abierta a 30 pegaba 2 de 10 → 9.
- Para agregar un luchador hay que tocar: LUCH/ORDEN_LUCH/CARTAS (a4), trajes en a5, CADENAS,
  ALCANCE_ARMA, ESPECIALES, SUPERS y proyectiles (a6), dibujo del proyectil (a8), CASA y
  CARTA_ARCADE (a12), `RETRATOS` en `hornear.py`.

## Cómo está armado
- **En la pelea los personajes son títeres por código**: esqueleto con ángulos (`esqueleto()`),
  poses clave interpoladas con `suave()`, cápsulas de dos tonos + trazo de tinta. Se eligió así porque
  la generación de sprites de Rezona **no acepta imagen de referencia**: no garantiza el mismo personaje
  entre una acción y otra. Los retratos de Rezona van en cartas, VS, súper y menús.
- `TAM=1.55` escala todo el luchador (dibujo, cajas de golpe, alcances, separación).
- Controles: tocar = golpe (encadena 4), deslizar → fuerte, ↑ salto (en combo: alzada que lanza y el
  luchador persigue), ↓ barrida (en el aire: azote), ← retroceso, mantener quieto >200 ms = cubrirse.
  El gesto se lee apenas el dedo se corre 26 unidades. Especiales y súper son botones al APOYAR; un
  dedo que cae en un botón no cuenta como gesto (`Entrada.filtro`).
- El HTML es la fuente: el código entero está adentro. `herramientas/arrabal/empaquetar.py` saca y
  vuelve a meter el bloque `<script id="archivos">` con el arte; se puede correr las veces que haga falta.

## Números que costaron una vuelta
- **La cadena empuja poco y avanza**: con empuje normal el rival quedaba a 120 y el jab alcanza 105;
  el tercer golpe erraba. Cadena: `emp:40, avance:110`; sólo el remate empuja fuerte.
- **Las estocadas sostienen la velocidad** hasta llegar: con el empujón inicial solo, el roce del piso
  se lo comía y los especiales cuerpo a cuerpo hacían **0 de daño**. Además `busca:true`: si el rival
  está lejos, corren antes de pegar.
- La rareza de los rivales la manda el barrio (barrio 1: bronce y plata). Con rareza libre, la
  pelea 2 podía traer una carta diamante y era imposible.
- Reloj = `60 + 35 × tamaño del equipo` (3 contra 3 = 165 s): con 120 s se iba siempre a tiempo.
- Bot con equipo nivelado: gana 5 de 6 (peleas 2, 7, 10, 12 y 15; pierde el jefe de la 5).
