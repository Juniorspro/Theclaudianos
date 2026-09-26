# Theclaudianos — bitácora y reglas

Repo de juegos web. Un juego = **un HTML autocontenido** en `juegos-pc/`, three.js desde CDN,
se prueba **en el celular, en vertical (412×892)**. EL TIPO se juega **acostado**: con el teléfono parado, gira todo 90°.

## Qué hay acá

| ruta | qué es |
|---|---|
| `juegos-pc/ElTipo.html` | **EL TIPO.** Beat'em up de plataformas al estilo Dan The Man: canvas 2D, un archivo, sin red, 5 niveles procedurales con jefe cada uno. |
| `juegos-pc/AOscuras.html` | **A OSCURAS.** Táctico de arriba estilo Bullet Echo: linterna en cono, ecos de pasos y tiros, 5 misiones procedurales (equipo, robo en sigilo, dominio, batalla real, jefe). Canvas 2D en píxeles, un archivo, sin red. |
| `juegos-pc/Andes.html` | **ANDES.** Descenso en tabla al estilo Alto's Adventure: un dedo (tocar salta, mantener gira), mortales, grinds, toldos, llamas, ancianos, avalancha, alas; 5 montañas procedurales con hora del día y clima. Canvas 2D vectorial, acostado, sin red. |
| `juegos-pc/Bronca.html` | **BRONCA · ZOMBIS.** Palitos contra zombis al estilo Anger of Stick 5: combos, armas que apuntan solas, aliados, robot y helicóptero, experiencia y base con tienda; 5 misiones procedurales (una es defensa) con jefe cada una. Canvas 2D vectorial, acostado, sin red. |
| `juegos-pc/Brecha.html` | **BRECHA 7.** Tirador táctico en primera persona sobre rieles al estilo SIERRA 7: cubrirse para recargar, brechas en cámara lenta con rehenes, francotirador con caída y viento, convoy con helicóptero; 5 misiones procedurales. three.js r128 y **todo lo generado con Rezona adentro del archivo** (texturas PBR, cielos, arte, armas, utilería, vehículos, personajes con esqueleto), sin red, acostado. Se arma con `herramientas/brecha/armar.py`. |
| `herramientas/brecha` | Partes del código de BRECHA 7, su armador y el banco (`banco/*.js`). |
| `juegos-pc/Alas.html` | **ALAS · DUELO AÉREO.** Combate aéreo en tercera persona (o cabina) al estilo Modern Warplanes: archipiélago procedural con islas, costa, mar con reflejo y nubes; cañón, misiles con fijado, bengalas, turbo y freno; 5 misiones (duelo, cordillera con compañero, defensa de portaaviones, rasante contra destructores, El As en tormenta), hangar con 4 aviones y mejoras. three.js r128 y todo lo generado con Rezona adentro, sin red, acostado. Se arma con `herramientas/alas/armar.py`. |
| `herramientas/alas` | Partes del código de ALAS, su armador y el banco (`banco/*.js`). |
| `juegos-pc/Contragolpe.html` | **CONTRAGOLPE.** Tirador táctico a lo Counter-Strike con tinta tipo Borderlands (el preset de CS2 en Nuke): bomba 5v5 con rondas y economía, deathmatch y carrera de armas; mapas NUCLEAR (dos pisos), DESIERTO y ALMACÉN con luz horneada; armas, manos, personajes y bots por código. three.js r128 adentro, sin red, acostado. Se arma con `herramientas/contragolpe/armar.py`. |
| `herramientas/contragolpe` | Partes, armador, luz horneada (`luz/`) y banco (`banco/*.js`: partida, hornear, vmjuego, vm3). |
| `juegos-pc/Bosque.html` | **El juego VHS.** Terror en primera persona, three.js r128 (script clásico), escenario girado 90°. De otra línea de trabajo. |
| `.claude/skills/graficos` | Reglas de render que ya costaron una vuelta cada una. |
| `.claude/skills/assets-ia` | Generar con Rezona Lab / Higgsfield y hornear lo generado. |
| `.claude/skills/banco` | Banco de pruebas, capturas y sondas. |
| `herramientas/rezona/rz.py` | Cliente stdio del MCP de Rezona (no depende de que el cliente lo tenga configurado). |
| `docs/MANUAL_JUEGOS.md` | Manual completo heredado. **Referencia, no plan de trabajo**: los juegos que nombra (BARRIO, CUBOS, Maicol…) no se continúan acá. |
| `docs/TRASPASO_BOSQUE.md` | Estado del Bosque al traspaso. |
| `docs/GUIA_JUEGOS_2D_PIXEL.md` | **Guía para hacer juegos 2D pixel art estilo Dan The Man**, destilada de EL TIPO: render, personajes por piezas, niveles procedurales, combate, mandos, menús, banco y trampas. |

## Reglas fijas del usuario

- **Nunca** cuadros de `AskUserQuestion` — «se buguea, uso celular». Preguntar en texto plano.
- Desarrollar, commitear y pushear **sólo** a la rama de trabajo indicada.
- **No** abrir pull requests salvo pedido explícito.
- **No** poner el identificador del modelo en nada que se pushee.
- **Verificar midiendo antes de afirmar que algo funciona.**
- **Siempre adjuntar el HTML** armado al cerrar cada vuelta, sin que lo pida.
- **Ahorrar tokens**: nada de barridos exploratorios ni narración larga.
- Escribir en **castellano rioplatense**.
- Rezona: todo se genera en **un** proyecto descartable; `publish_to_rezona_app` jamás sin pedido.

## Bitácora

### 2026-09-16 — arranque del repo
**Pedido textual:** «Aquí te van unas skills para mejorar los juegos que hagas también no quiero
que sigas con los juegos que se mencionan acá solo rescates lo que te sirva para gráficos y cosas
de más juegos también pásame el link para generarte la llave key … y mejores el juego vhs a full
con nuevas texturas etc hechos con IA de Rezona y modelos 3D de monstruos riggeados de verdad etc
y mejores animaciones y visuales».

Qué se hizo: el repo estaba **vacío** (cero commits). Se sembró con el Bosque, el manual heredado
como referencia, y **tres skills destiladas** del manual — gráficos, assets-ia y banco — en vez de
copiar las ~85 skills de three.js que el manual nombra pero que no viajaron con el archivo.
Se escribió `rz.py` porque en esta sesión **el MCP de Rezona no está conectado**: el cliente stdio
levanta `npx rezona@latest mcp` como proceso hijo y no depende de la config del cliente.
Credencial: `npx rezona@latest login --no-browser` (el PAT queda en `~/.rezona`, fuera del repo).

Sin resolver todavía: el PAT depende de que el usuario apruebe el código en la web, y **el
contenedor es efímero** — cada sesión nueva necesita un login nuevo.

### 2026-09-22 — EL TIPO (otra sesión, otra persona)
**Pedido textual:** «GENERAME un juego HTML single, dónde el juego trate de una copia parecida a
Dan The Man peleas y puñetazos, investiga todo sobre ese juego y dame 5 niveles completos
procedural y de mecánicas goty de verdad».

Sesión nueva sobre el mismo repo: **el Bosque no se sigue**, sólo se reusan las skills. Se hizo
`juegos-pc/ElTipo.html` — canvas 2D vectorial (siluetas con contorno, sin assets externos), audio
WebAudio sintetizado, todo en un archivo que abre sin red.

Lo que costó una vuelta cada una, medido en el banco (Playwright headless, 412×892):

1. **La arena contaba enemigos dormidos de otros tramos** → nunca se limpiaba y el nivel quedaba
   trabado para siempre. Ahora `vivosDeZona()` sólo cuenta a los de la oleada y a los encerrados.
2. **Huecos sin fondo**: caerse mandaba al spawn del nivel y era un bucle infinito. Ahora son
   fosas de 34 de profundidad (se sale de un salto) y caerse del mapa devuelve al último piso
   firme, no al principio.
3. **No se podía saltar mientras se pegaba** → uno quedaba clavado en una fosa pegando trompadas.
   Se agregó *jump-cancel*: con eso el bot pasó de 11/15 a **15/15 niveles completados** (3 semillas × 5).
4. **El lienzo se medía una sola vez**, antes del layout: el juego entero se dibujaba aplastado.
   Ahora `ResizeObserver` + revisión cada 15 cuadros.
5. **El fin de nivel era un `setTimeout`** y se disparaba encima del nivel siguiente. Ahora se
   cuenta en cuadros del nivel en curso.
6. **Dibujo a 9 ms/cuadro** por gradientes creados 60 veces por segundo. Cielo y siluetas
   cacheados en canvas offscreen + halo de luz pre-dibujado: bajó a 2,7 ms en la misma escena y
   el mismo banco. **Ojo con ese número**: esas dos mediciones eran sin calentar y son optimistas.
   Midiendo con 200 cuadros de calentamiento y 300 de medición, el dibujo real está en
   **~6,5 ms/cuadro** con 27 entidades. La mejora relativa vale (las dos puntas se midieron igual);
   el absoluto de 2,7 ms, no.
7. En CSS, `#acciones .bt` le ganaba en especificidad a `#bPausa`: el botón de pausa medía 70 px
   y tapaba el HUD. Salió del bloque de acciones.

Sondas: `window.__T` — `est()`, `anda(n)`, `entrada(k,v)`, `teletransportar(x)`, `semilla(s)`,
`medirHuecos()`, `matarTodo()`, `cuentaTipos()`, `dibujarYa()`.

**Ojo con el bot de pruebas**: si deja una tecla apretada no hay flanco y el salto nunca sale —
dos vueltas se fueron en culpar al juego de un defecto del instrumento.

### 2026-09-22 (tarde) — texturas propias y el cobro de Rezona caído
**Pedido textual:** «genera texturas de cielo y tierra con rezonalab, también te los personajes del
juego Dan The Man peleas y puñetazos».

**Rezona no generó nada en toda la sesión.** Todo `submit_*` de imagen, sprite, 3D y video vuelve con
`CREDIT_RESERVE_FAILED: 扣费服务暂时不可用` («servicio de cobro no disponible»). Lo que se descartó,
midiendo, antes de culpar al servicio:

- No es la key: con la del login viejo y con una nueva del usuario pasa igual; `list_projects`,
  `create_project` y `status` andan (446.069 créditos gastables).
- No es cómo se pasa la key: por `REZONA_PAT` y escrita en `~/.rezona/credentials.json`, lo mismo.
- No es el proyecto: falla en dos proyectos distintos.
- No es el endpoint: sacarle `/game/pgcserver` al `baseUrl` da HTTP 405, o sea el que está es el bueno.
- No son los parámetros ni el modelo: falla la llamada mínima; los nombres de modelo conocidos
  (seedream, flux, gpt-image-1…) devuelven `GENERATION_MODEL_UNSUPPORTED`, otro error distinto.
- No es el registro MCP: `~/.claude.json` tiene exactamente `npx -y rezona@latest mcp`, igual que `rz.py`.
- **El audio engaña**: `submit_audio_generation` devuelve `task_id` y parece que anda, pero la tarea
  termina `failed` con el mismo mensaje de cobro. Desde afuera parece que Rezona funciona.
- Con el CLI 0.1.5 la misma key da `PAT_INACTIVE`: 0.1.5 y 0.2.0 no validan igual.

Queda `herramientas/rezona/hornear_eltipo.py` y el bloque `ASSETS` entre marcas: cuando el cobro
vuelva, se generan, se bajan, se hornean y pisan lo dibujado. El camino se probó entero con imágenes
falsas **antes** de gastar una generación.

Mientras tanto, cielo y tierra se hicieron **por código**, uno por tema (asfalto picado, chapa con
remaches, baldosón sucio, grava, piedra quemada con brasas; estrellas y luna, vapor, luces de túnel,
humo de incendio). Y los peleadores ganaron zapatilla, guante trasero, cinturón, ceja y estrella de
impacto.

Dos cosas que costaron una vuelta:
- **Las partículas usaban el rng del nivel**: corrían la secuencia y una misma semilla dejaba de dar
  la misma partida. El azar visual ahora sale de `Math.random`.
- **Medir sin calentar miente**: el mismo banco daba 2,7 ms o 5,6 ms para el mismo dibujo. Con 200
  cuadros de calentamiento, la textura de tierra no cuesta nada medible (6,2 vs 6,2 ms).

### 2026-09-22 (noche) — render pixel art y el enredo de los dos Rezona
**Pedido textual:** «Necesito que sean pixelart y hechos si o si con Rezona si necesitas key manda
limk» + el sprite del protagonista.

**Los dos Rezona no son el mismo servicio.** El usuario generaba sin problema en `rezona.ai/studio`
(la web) mientras acá todo rebotaba: el MCP habla con `lab.rezona.ai/game/pgcserver`, que es el
backend de juegos, y ese tiene el cobro caído. Misma cuenta, mismos 446.069 créditos, distinto
servicio. **Tres keys distintas dieron el mismo error**, así que pedir otra key no arregla nada.
Camino que sí destraba: que el usuario genere en Studio y adjunte las imágenes al chat — llegan como
archivo local y se hornean igual.

El juego pasó a **pixel art de verdad**: el mundo se dibuja en un lienzo chico (`ANCHO/PX`, con PX
entero, 2 en 412×892) y se agranda con `imageSmoothingEnabled=false`; el HUD se sigue dibujando en el
lienzo grande, así que el texto queda nítido. Se apaga con `PIXELADO=false`.

- Escala **entera** o no sirve: con 1,94 los píxeles salen de distinto tamaño y tiembla todo.
- `J.cam.esc` pasó a valer PX, así que todo lo que hacía `ANCHO/cam.esc` siguió andando sin tocarse.
- Los patrones se crean con el contexto del mundo, no con el de pantalla.
- Medido con calentamiento, misma escena: **6,4 → 2,6 ms** por cuadro. Son 4 veces menos píxeles.

El protagonista es ahora el del sprite de referencia, armado por partes dentro del rig (pelo naranja
en púas que se tira con la carrera, vincha con gema y colas que flamean, ojos blancos que se
entrecierran al pegar, gi gris, faja verde). La paleta salió de contar colores del PNG, no a ojo.

### 2026-09-22 (noche, 2) — el protagonista en pixel art, idéntico al sprite
**Pedido textual:** «Hacelo procedural idéntico» (sobre el sprite de `juegos-pc/referencias/protagonista.jpg`).

El protagonista ya no es vectorial: es un **calco en píxeles del sprite de referencia**, 28×46, limpiado a
mano (`herramientas/calco_protagonista.py`) y partido en piezas — cabeza, colas de la vincha, torso, dos
puños, dos piernas y pie. Cada pieza **sigue a su articulación del rig**, así hereda todas las poses que
ya había sin escribir ni una animación nueva. Brazos y piernas estirados se completan con cápsulas
pintadas de a un píxel, sin antialias.

- La imagen de referencia viene **suavizada, sin grilla**: el factor de ampliación no se puede sacar
  (el error por bloque crece parejo con el factor). Se redujo por moda de paleta y se limpió a mano.
- La conversión automática confunde la vincha con la piel y deja píxeles sueltos: sirve de calco, no de sprite.
- Con cabeza enorme, **el puño que sube tapa la cara**: si el puño cae sobre la cara, el brazo va por
  detrás de la cabeza; y cuando sube, avanza.
- Los brazos estirados al 165 % quedaban de goma: 135 % con tope de largo (17 px) y grosor 3.
- **Capturar el cuadro pico**: el directo está estirado sólo en los cuadros 2 y 3. Una captura en el 4
  muestra el puño volviendo y parece que la animación no anda. `__T.pose()` y `__T.lienzoHeroe()`
  sirven para mirar la pose y el personaje aislado.
- Costo: 2,44 ms contra 2,47 ms con el héroe vectorial. Nada.

### 2026-09-22 (noche, 3) — enemigos y fondos en pixel art
**Pedido textual:** «Hazlo aún mejor también a los enemigos y fondos».

**Enemigos**: el mismo sistema de piezas que el protagonista, generalizado en `dibujarPx(e, fuente)`.
Un kit con letras de **rol** (piel, uniforme, pantalón, casco, detalle, barba, guante, bota) y una
paleta por tipo: 7 cabezas (casco, casco con nasal, gorra, pelado con barba, capucha, boina con
bigote, corona con barba) × 4 torsos (base, mandil, coraza, manto). Once personajes —los siete
matones y cuatro jefes— salen de ahí; La Máquina sigue vectorial. Fuente del kit:
`herramientas/kit_enemigos.py` y `kit_enemigos_tipos.py`. Las piezas se hornean la primera vez
que se piden y quedan en caché.

- La barba compartía rol con el dorado y el rey salió con barba de oro: barba y bigote tienen su
  propio rol (`h`/`H`).
- Pesado y jefes se escalan (1,2 y `e.escala`) con vecino más cercano: algún píxel queda doble,
  pero no se inventan medios tonos.

**Fondos**: un pintor por tema en `PINTORES` (pixel art a escala 1, cacheado) y `animFondo()` para lo
que se mueve: neones que parpadean como tubo quemado, faroles, humo de chimeneas, tubos
fluorescentes, balizas de antena, nubes, banderas.

Medido con calentamiento contra el commit anterior: **2,46 → 1,51 ms** por cuadro. Las piezas
horneadas cuestan menos que los trazos vectoriales que reemplazan.

### 2026-09-22 (noche, 4) — menús en pixel art, vivos
**Pedido textual:** «Mejora los menús que sean dinámicos y gotys o sea pixel art el fondo también que el
nombré este escrito en pixels que tengan animaciones de colores o algo etc».

- **Fuente de píxeles propia** (`FUENTE_PX`, 5×7, con tildes, Ñ, ¡¿ y moneda) sin fuentes externas.
  `pixelar(el, S, {grad})` convierte el texto de un elemento en un lienzo con contorno, sombra y degradé
  por fila, a escala entera; guarda el texto en `data-px` para poder rehacerlo. `pixelarCapa(id)` se
  llama al mostrar cada capa.
- **Portada viva** (`dibujarMenu`/`pasarMenu`): el fondo del nivel con su parallax y sus animaciones,
  el protagonista que corre, se cruza a un matón, le mete el combo de tres con hit-stop, estrellas y
  K.O., y lo manda a volar; después fundido con trama Bayer (como las consolas) al nivel y rival
  siguientes. El nombre **EL TIPO** se dibuja en el mundo pixelado: cada letra cae al abrir, ondula,
  bandas de color de fuego que corren y un barrido de luz.
- El nombre grande va **sólo en la portada** (`ESC.conTitulo`): en tienda y cómo se juega se metía
  detrás del encabezado.
- En los menús los mandos se sacan del layout (`display:none`) y la escena ocupa toda la pantalla.
- Botones y paneles de 16 bits con bisel por `box-shadow`, entradas escalonadas con `steps()`,
  el rango del fin de nivel cicla colores con `hue-rotate`, íconos de la tienda y retratos de jefes en
  la lista de niveles sacados del mismo kit de piezas; candado en los cerrados.
- Música de menú propia (triángulo, más lenta) y blip al tocar botones.

### 2026-09-23 — mandos y HUD como en Dan The Man
**Pedido textual:** «quiero que los controles sean igual que el de la imágen, también la barra de vida en
la esquina izquierda con el logo redondo de la cara del personaje» (captura del juego original).

- **Mandos flotantes** sobre la tierra, sin panel negro: dos flechas grandes a la izquierda, puño azul
  redondo y flecha de salto a la derecha, íconos en pixel art dibujados por código (`ICONO_BOTON`,
  `lienzoForma`). El puño se dibujó **a mano**: con fórmulas (rectángulo redondeado con líneas) se leía
  como una carita.
- Con sólo dos botones de acción no se pierde nada: **puño deslizando arriba = gancho** (cancela el
  directo recién tirado), **abajo en el aire = plancha**, **doble toque en una flecha = dash**, y
  deslizar el dedo sobre las flechas da ▲/▼ (bajar de tabla: ▼ + salto). Escudo y furia quedan como
  botones chicos. `EDGE.G` y `EDGE.S` son los pulsos de gesto.
- **El botón de FURIA nunca se mostraba** en el celu: nada lo prendía y sólo andaba con la tecla F.
  Ahora aparece, late, y se dispara al tocarlo.
- **La cámara** encuadra sobre lo que dejan libre los mandos (`ZONA_MANDOS`) y el piso tiene tierra
  hasta el borde de abajo (sólidos y fondos de fosa de 320 de profundidad).
- **HUD en pixel art** en su propio lienzo chico (`cvH`), encima de oscuridad y tintes: retrato redondo
  con la cara del héroe recortada en círculo píxel por píxel (sin `clip()`, que suaviza el borde), aro
  verde/amarillo/rojo según la vida, barra con rastro blanco del último golpe, furia debajo, ranura
  del arma con munición, moneda con contador de cuatro dígitos y pausa cuadrada.
- Probado con toques reales por CDP (`Input.dispatchTouchEvent`), varios dedos a la vez: los nueve
  gestos andan. Los eventos sintéticos de Playwright no traen `changedTouches` y no sirven para el pad.

### 2026-09-23 (2) — pantalla girada y escudos que no son eternos
**Pedido textual:** «quiero que gires la pantalla 90°, en horizontal, sin la necesidad de poner el teléfono
en vertical, hay un enemigo que tiene un escudo, por más que lo pegue no le hace daño, debería tener
sólo por un tiempo el escudo o no todo el tiempo».

**Giro.** Si el visor está parado (`innerHeight > innerWidth`), `orientar()` le da a `#pantalla` el tamaño
acostado y la gira con `translate(vw,0) rotate(90deg)` (o `-90deg`, botón «DAR VUELTA PANTALLA», guardado).
En un navegador ya horizontal no gira nada. Todo el layout pasa a la clase `.apaisado`.

- **Trampa:** `getBoundingClientRect` devuelve la caja **ya girada**. El lienzo se mide con
  `clientWidth/clientHeight` y el pad con `offsetLeft/offsetWidth`.
- **Trampa:** los toques llegan en coordenadas de la pantalla física. `aLocal(sx,sy)` los pasa al juego:
  con 90°, `x = sy`, `y = innerWidth − sx`. Con el teléfono parado, «arriba» del juego es hacia la derecha.
- **Trampa:** un `<canvas>` con `flex:1 1 auto` queda trabado en su tamaño propio (medía 446 en una
  pantalla de 412 y se cortaba la tierra). `flex:1 1 0; min-height:0`.
- `PX` sale del lado corto (`min(ANCHO,ALTO)/212`) → 2 en 892×412, se ven 446×206 de mundo.
  `ZONA_MANDOS` baja a 118 px en horizontal y la cámara ancla los pies al 80 %.
- Menús en horizontal: las capas pasan a filas con salto (`flex-wrap`), los botones van de a varios por fila
  y con texto a escala 2; la tienda en dos columnas, el rango al lado de la tabla.
- Las capturas del banco salen giradas: enderezar con `Image.rotate(90, expand=True)`. Los gestos en el
  test por CDP también van girados (deslizar «arriba» = +x en la pantalla física).

**Escudos.** Había dos culpables: el escudero sólo perdía el escudo con dash, gancho o plancha (nadie lo
explica), y el **elite, al bloquear, se quedaba con el escudo para siempre** (se ponía en 1 y nada lo bajaba).

- El escudero **baja el escudo en ciclos** (≈ un tercio del tiempo, avisa «¡AHORA!») y siempre que ataca.
- Cada golpe al escudo **araña un 25 % de vida** y lo gasta: al tercero se rompe y queda mareado
  (`golpeAlEscudo`, `romperEscudo`). Dash, gancho y plancha lo siguen rompiendo de una.
- El bloqueo del elite dura 45 cuadros y se va solo.
- Medido: 400 → 398 → 395 → roto a 386; 309 de 900 cuadros sin escudo; el elite vuelve a 0.

### 2026-09-23 (3) — horizontal de verdad al entrar
**Pedido textual:** «quiero que al entrar al juego la pantalla ya se ponga en horizontal».

Al abrir, el juego ya se ve acostado (giro por CSS). Con el **primer toque** (`touchend`/`click`, que son
los que habilitan el permiso) `pantallaHorizontal()` pide pantalla completa y `screen.orientation.lock('landscape')`:
en Android el teléfono pasa a horizontal de verdad y `orientar()` apaga el giro solo porque el visor
queda más ancho que alto. Cada botón del menú lo vuelve a pedir si se salió de pantalla completa.
**Trampa:** `touchstart` no cuenta como gesto para `requestFullscreen`. En iOS no hay `lock`: queda el giro.

### 2026-09-23 (4) — el giro se descuajeringaba en el visor
**Pedido textual:** «Bug» (captura del visor de HTML de la app: capa de fin de nivel y lienzo de tamaños distintos).

Causa: el giro ponía **anchos y altos en px por JS** y en el WebView del visor quedaban viejos después del
intento de pantalla completa (el visor cambia de tamaño sin avisar como uno espera). Arreglo:

- Giro **sólo por CSS**: `@media (orientation: portrait)` con `width:100vh; height:100vw` (y `dvh/dvw` si hay)
  + `translateX(100vw) rotate(90deg)`. Ya no hay números que se queden viejos.
- `aLocal` sale del `getBoundingClientRect()` real de `#pantalla`, no de `innerWidth`.
- Si `orientation.lock` falla, **se sale de pantalla completa** y no se reintenta (`bloqueoFallo`).
- Medido con `visor.js` cambiando el tamaño del visor (412×742 → 412×915 → 742×412 → vuelta): pantalla =
  visor, capa = pantalla, lienzo coherente en cada paso; un toque en ▶ da `der=1`. Gestos 9/9, bot 15/15.

### 2026-09-23 (5) — cámara más lejos
**Pedido textual:** «quiero que alejes un poco más la cámara y el peronaje se vea desde lejos, lo mismo con los mapas».

- El píxel del mundo ahora mide un número **entero de píxeles del aparato** (`PXd`), no de CSS: `PX = PXd/DPR`
  puede ser fraccionario sin que tiemble nada. `FILAS_MUNDO = 280` fija cuánto mundo entra en el lado corto.
  En un teléfono de 412 con DPR 2,625: de 446×206 a **585×270** de mundo (≈ 30 % más lejos).
- `DPR` sube de tope 1,5 a 3. **Trampa:** con 1,5 el navegador reescalaba el lienzo 1,75 veces y los píxeles
  salían borrosos o desparejos en el celu; en el banco con DPR 1 o 2 no se notaba.
- En DPR 1 no cambia nada (el mínimo sigue siendo 2 px por píxel de mundo). **Probar con `deviceScaleFactor:2.625`.**
- El HUD va a su propia escala (`PXH`, `ANCHO_H`, `ALTO_H`, `ZONA_H`) y no se achica. El halo de `oscuridad()`
  pasó a medirse en mundo. El título de la portada crece con `ALTO_M`.
- Medido: bot 15/15, gestos 9/9, sin errores; dibujo a DPR 2,625 de 2,08/1,80 a 2,23/2,49 ms (n1/n5).

### 2026-09-23 (6) — resolución baja y optimizaciones
**Pedido textual:** «Bájale la resolución a un 80% va muy lag y busca optimizaciones».

Culpable, medido con el perfilador de Chrome a DPR 2,625 y CPU ×6 más lenta: **el JS del juego no llega al 2 %**; todo
se iba en pintar píxeles. La vuelta anterior había subido el lienzo a la resolución del aparato (2342×1082) y
bajó de 34 a **13 cuadros por segundo**.

- **Lienzo = mundo × m**, con `m` divisor de `PXd` y `≤ RES_LIENZO (0,8) × PXd`; el CSS lo agranda con
  `image-rendering:pixelated` (lo hace el compositor, gratis). Con `PXd 4` → `m 2`: 1171×541, la cuarta parte de
  los píxeles, y el mundo se ve **igual** porque cada píxel del mundo sigue midiendo 4 del aparato. El HUD va a
  `hs` píxeles de lienzo enteros, así que tampoco sale desparejo.
- **Velos** (oscuridad, niebla, tintes de furia/cámara lenta/daño) se pintan en el lienzo del mundo antes de agrandarlo.
- **Tiras del parallax recortadas** a las filas que tienen algo (`filasUsadas`, `tiraPx`): se pintaban enteras,
  casi todas transparentes.
- **HUD**: se borra y se agranda sólo la franja de arriba (`HUD_Y1`); entera sólo con jefe, cartel o flecha.
- **No se redibuja un cuadro que no cambió** (`if(!pasos) return`): en pantallas de 90/120 Hz se dibujaba dos veces.
- Medido con CPU ×6: antes del zoom 37/35, con zoom 13/14, ahora **42/40** cuadros por segundo (n1/n4). Bot 15/15,
  gestos 9/9, sin errores; capturas de n1, n3, n5 y jefe iguales a las de antes.
- **Trampa del banco:** `Emulation.setCPUThrottlingRate` en headless también frena el rasterizado por software, así
  que el costo de rellenar píxeles aparece. Sin frenar, todo da 60 y no se ve nada.

### 2026-09-23 (7) — A OSCURAS, estilo Bullet Echo
**Pedido textual:** «GENERAME un juego HTML single, dónde el juego trate de una copia parecida a Bullet Echo, investiga todo
sobre ese juego y dame 5 niveles completos procedural y de mecánicas goty de verdad y usa lo anterior aprendido de menú y
modelos procedurales y hazlo incluso mejor». (Antes pidió un Subway Surfers y lo cortó dos veces: no quedó nada escrito.)

`juegos-pc/AOscuras.html`, vertical, 1 px del lienzo = 1 px del mundo y el CSS lo agranda entero (`PXd` del aparato).
Reusa de EL TIPO la fuente de píxeles, `pixelar`, `lienzoForma` y los botones de 16 bits.

- **Visión:** polígono por DDA contra las paredes para cada linterna del equipo, cortado en una máscara con
  `destination-out` y degradé cacheado por radio. Los compañeros comparten lo que ven (máscara de bits por equipo).
  Lo que no se ve **no se dibuja**; sus pasos y tiros dejan **ecos** en el piso y flechas en el borde.
- **Personajes de arriba por código:** grilla de roles → EPX ×2 → horneado girado en 32 direcciones (sin escaleras
  en las diagonales) + pies animados aparte. Retratos de frente 16×16 recortados en círculo píxel por píxel.
- **Mapas:** BSP con vueltas extra, columnas, cajas en grupitos validadas por BFS (nunca tapan el paso), vidrios en
  paredes finas, charcos tóxicos, luces fijas horneadas con su polígono. El puerto es un patio con contenedores y agua.
- **Misiones:** equipo 3v3, robo con alarma, dominio A/B/C con reaparición, batalla real con gas y cofres, jefe con
  escudo de frente, granadas, carga y guardias por fase.
- **IA:** ve con su linterna (reacción, puntería y giro por nivel), oye pasos y tiros del cuadro anterior, investiga,
  busca, rodea con A*, usa habilidades. El jugador camina en sigilo con empuje corto; corriendo, lo oyen.

Trampas que costaron una vuelta:
- **El buscador de caminos no sabía de barriles ni cofres**: el piloto quedaba clavado contra un barril. Ahora hay
  máscara `M.obst`, también para no cortar esquinas.
- **Ir a romper un cofre = meta imposible**: el A* agotaba la búsqueda cada vez (la meta estaba tapada). La meta se acepta
  aunque esté ocupada.
- **Destino al azar en cada cuadro** (el gas) → A* por bot por cuadro. Destino fijo + recalcular cada 20 cuadros y
  tope de 2 por cuadro en todo el mapa.
- **Dibujar el mapa entero** en cada cuadro: sólo el recorte que se ve.
- Con CPU ×6 la batalla real pasó de **6 a 60** cuadros por segundo; las otras misiones, 60.
- Sin ajustar, el piloto moría a los 10–20 s: daño enemigo por nivel (`SK.dmg` 0,5→0,74) y blindaje que vuelve
  tras 4,5 s sin recibir.

Medido: piloto automático invencible 14/15 (3 semillas × 5; la que perdió fue un dominio 99 a 100), sin invencibilidad
5/15 (el piloto corre sin sigilo y no rodea al jefe). Toques reales por CDP: mover, correr/sigilo, apuntar con el segundo
dedo, habilidad, pausa. Sondas: `window.__A` — `iniciar(n,sem)`, `anda(n)`, `autopiloto(v)`, `dios(v)`, `est()`, `mapaAscii()`.

### 2026-09-23 (8) — Rezona sigue sin cobrar
**Pedido textual:** «Ya anda Rezona? Proba generar una imagen de perro».

La key guardada daba `PAT_INACTIVE` (revocada). Login nuevo con `npx rezona@latest login --no-browser` corriendo en segundo
plano con `nohup timeout 1500` (con `timeout 25` el proceso muere antes de que el usuario apruebe y el código queda inservible).
Con la key nueva `list_projects` anda, pero `submit_image_generation` en «perro-prueba» vuelve dos veces con
`CREDIT_RESERVE_FAILED`: el cobro del backend de juegos sigue caído, igual que el 22.

### 2026-09-23 (9) — A OSCURAS: botiquines y habilidades en el mapa
**Pedido textual:** «te matan muy rápido, agrega botiquines y habilidades en el mapa».

- **Estaciones** (`J.estaciones`) repartidas por los cuartos (9 a 24 por mapa, una garantizada al lado de la base):
  botiquín (a veces grande, 60 % de la vida), chaleco, energía (habilidad lista), **burbuja** (absorbe 70 de daño),
  **turbo** (+45 % de velocidad 8 s) y **radar** (pulso que muestra enemigos). Vuelven a salir a los 18 s (vida y
  chaleco) o 28 s (el resto). Se dibujan **encima de la oscuridad**, con aro y cuenta regresiva: se ven desde lejos.
- La IA baja de vida va a la estación más cercana (y el enemigo también la usa).
- **Sólo con los objetos no alcanzaba**: el piloto moría en el primer tiroteo antes de llegar a uno (5/15 → 4/15).
  Además: el jugador recibe 25 % menos, la vida vuelve sola tras 6 s sin recibir, el blindaje tras 3,5 s, daño
  enemigo `SK.dmg` 0,42→0,66, arco rojo que marca de dónde vienen los tiros, y El Mole tarda 1,15 s en arrancar la
  ametralladora (suena) y pega 5 en vez de 6.
- Medido, piloto sin invencibilidad: **4–5/15 → 8/15** (dos corridas); con invencibilidad 14/15. El piloto levanta
  hasta 6 estaciones por partida. El jefe sigue ganándole al piloto porque le tira de frente al escudo.
  CPU ×6: 60 cuadros por segundo en las tres misiones medidas.

### 2026-09-23 (10) — ANDES, estilo Alto's Adventure
**Pedido textual:** «GENERAME un juego HTML single, dónde el juego trate de una copia parecida a Alto's Adventure, investiga
todo sobre ese juego y dame 5 niveles completos procedural y de mecánicas goty de verdad y usa lo anterior aprendido de menú y
modelos procedurales y hazlo incluso mejor».

`juegos-pc/Andes.html`, acostado con el giro sólo por CSS de EL TIPO (y pantalla completa + `orientation.lock` al primer toque).
Estética vectorial (no pixel art, como el original): cielo que cambia con la hora a lo largo de la bajada (4 momentos por
montaña que se funden), tres cordilleras por suma de senos, sol/luna, estrellas, fugaces, aurora, nieve, tormenta con rayos.

- **Suelo** = perfil de alturas cada 1 m con huecos (`J.H`, `J.S`, `J.T` hielo); **plataformas de una mano** (cuerdas con
  comba, techos, toldos que rebotan). Segmentos: lomas, rampa con labio, abismo (a veces con cuerda), escalón, precipicio,
  cuerdas, rocas, pueblo, bosque, hielo, llamas, campamento de anciano, santuario (guarda progreso) y refugio (meta).
- **Física**: sobre la nieve la velocidad sigue la pendiente; despega sola cuando el suelo cae más rápido que la balística.
  Mantener en el aire = mortal; soltar frena el giro. Caída buena si la tabla queda a menos de 0,72 rad (1,0 en techos y cuerdas).
- **Cadenas** estilo Alto: mortal, doble/triple, perfecto, rasante, grind, beso de cuerda, rebote, abismo, llama, roca rota;
  con 3 seguidas, impulso que rompe rocas. La bufanda se carga con trucos → doble toque en el aire = alas.
- Metas (3 por montaña) que se cumplen al pasar y quedan guardadas; taller con 4 riders y 4 mejoras.
- **Portada viva**: el piloto automático baja una montaña al azar detrás del título.

Trampas que costaron una vuelta (piloto automático, 3 semillas × 5):
- Dos rocas a 14 m: el salto dura justo eso y caías encima de la segunda. 26–40 m y **salto guardado** (tocar antes de caer).
- El anciano aceleraba hasta 25 m/s y alcanzaba a cualquiera: ahora va al 90 % de tu velocidad.
- **Viento en contra en el aire** hacía imposibles los abismos: ×0,35.
- **Después de las alas** caías en picada: gracia hasta tocar la nieve.
- Rocas en la zona de aterrizaje de rampas y precipicios: nunca a menos de 55 m.
- La calidad automática medía el JS del dibujo y nunca bajaba: el costo es pintar píxeles. Ahora mide el intervalo real
  entre cuadros. Se sacaron tres franjas de niebla y la viñeta de pantalla entera.

Medido: bot 15/15 y 13/15 (dos juegos de semillas); mortal doble en 12/15; toldos ≥4 en el pueblo; CPU ×6 45–51 cuadros por
segundo con calidad automática (60 a CPU normal); toques reales por CDP: tocar salta, mantener gira, pausa.
Sondas: `window.__N` — `iniciar(n,sem)`, `anda(n)`, `bot(v)`, `est()`, `dibujarYa()`.

### 2026-09-23 (11) — ANDES más rápido
**Pedido textual:** «le falta más velocidad a la tabla».

- Pendiente ×0,85 (antes 0,6), rozamiento 0,02·v + 0,0072·v² (antes 0,035 y 0,013), mínima 13 m/s, máxima 36 (impulso ×1,2,
  piso de 25 con impulso), arranque a 15. Medido con el piloto: **promedio 17,5 → 27 m/s**, pico 33 → 43.
- Montañas un 30 % más largas (2100–3700 m) para que la bajada no dure la mitad. Ancianos (hasta 30 m/s), avalancha
  (15 → 23,5) y llamas acompañan. Cámara más lejos y más adelantada con la velocidad; rayas de velocidad desde 24 m/s.
- **Trampa:** a 30 m/s el salto cubre tanta montaña que si la loma sube hacia la roca pasás 0,5 m por encima del piso
  (se esperaban 2). El salto crece con la velocidad (+1,4 % por m/s sobre 18) y las rocas no van donde la loma empieza a subir.
- Piloto: 13/15 y 14/15 (dos juegos de semillas); CPU ×6 con calidad automática 48–52 cuadros por segundo.

### 2026-09-23 (12) — BRONCA · ZOMBIS, estilo Anger of Stick 5
**Pedido textual:** «GENERAME un juego HTML single, dónde el juego trate de una copia parecida a Anger of Stick 5: Zombie, investiga
todo sobre ese juego y dame 5 niveles completos procedural y de mecánicas goty de verdad y usa lo anterior aprendido de menú y
modelos procedurales y hazlo incluso mejor».

`juegos-pc/Bronca.html`, acostado con el giro sólo por CSS y pantalla completa + `orientation.lock` al primer toque, como ANDES.
- **Palitos por cinemática inversa**: `pose(e)` arma cada pose en coordenadas locales (x adelante, y arriba, pies en el origen) con IK
  de dos huesos; `aMundo()` la pasa al mundo. Al morir, la misma pose se vuelve **muñeco de trapo** (verlet) y puede perder un miembro.
- **Combate**: combo piña-piña-patada-gancho (el gancho levanta), patada voladora en el aire, doble salto que cancela el golpe, doble
  toque = rodar con invulnerabilidad. Con arma, el puño **dispara solo** al zombi más cercano si está lejos. Habilidades GIRO, SISMO y
  FURIA con recarga. Hit-stop con `J.congelado`, cámara lenta con `J.lento`.
- **8 zombis** (caminante, corredor, gordo que explota, escupidor, blindado con casco, saltador, rastrero, cuervo) y **5 jefes** con fases
  al 66 y 33 % y avisos: Gordo Podrido (ondas de suelo, vómito), Cirujano (carga, salto, bisturíes), Capataz (martillazo), Tanque (escudo de
  frente, se atonta si choca la pared) y La Madre (marcas rojas con tentáculos, lluvia ácida, crías).
- **Misiones**: calles con zombis dormidos, arenas cerradas con oleadas y zona de jefe; el Refugio es defensa de una puerta con seis
  oleadas; en el Hospital y el Laboratorio hay robot para subirse, el Puente se cruza en helicóptero. Aliados (5, hasta 3 a la vez),
  experiencia y nivel, base con arsenal, equipo y habilidades (3 niveles cada cosa), rango S–D y 3 estrellas.

Trampas que costaron una vuelta:
- **La arena contaba a los zombis dormidos de más adelante** y no se limpiaba nunca: el mismo defecto que tuvo EL TIPO. Ahora sólo
  cuentan los despiertos. El bot con invencibilidad pasó de 1/5 a 5/5.
- **El fondo daba 10–14 cuadros por segundo con CPU ×6.** El JS del paso cuesta 0,12 ms; todo era pintar. Cielo y capa lejana van
  juntos en un lienzo **opaco**; las otras dos capas, recortadas a las filas que tienen algo. Y lo que más pesaba: **copiar en medio
  píxel** hace que el navegador reescale la imagen entera en cada cuadro. Con copias 1:1 en píxeles enteros del lienzo y sin suavizado,
  a calidad 1 pasó de 18,7 a 39,3 cuadros por segundo; con calidad automática, 44–52.
- La calidad automática medía cada 90 cuadros: a 10 cuadros por segundo tardaba 9 s en reaccionar. Ahora mide cada 40.
- **«El puño no pega» en el banco de toques era un disparo**: con pistola y un zombi dormido a menos de 20 m, el puño dispara y no queda
  `atq`. Pegarle a un dormido ahora lo despierta.

Medido: bot sin invencibilidad 11/15 dos veces (3 semillas × 5; casi siempre pierde contra el Tanque o La Madre, sin comprar mejoras),
con invencibilidad 5/5 en dos semillas; misiones de 2,5 a 6 minutos. Toques reales por CDP: caminar, pegar con un segundo dedo, saltar,
rodar, habilidades, cambiar arma, pausa y seguir. Sin errores. Sondas: `window.__B` — `iniciar(n,sem)`, `anda(n)`, `bot(v)`, `dios(v)`,
`est()`, `dibujarYa()`.

### 2026-09-23 (13) — BRONCA con golpes calcados de videos de AoS5
**Pedido textual:** «Puedes buscar videos de todas las animaciones de anger of stick 5 y hacerle bodytracking para copiar las
animaciones y golpes a la perfección si o si» y después «Puedes usar tiktok y YouTube mediante Neko PC y buscar ssstiktok etc».

- **YouTube no se deja** desde el contenedor: `yt-dlp` pide iniciar sesión o da 429/403 en todos los clientes, y los espejos
  (Invidious, Piped) también están bloqueados. **TikTok sí**: la API de tikwm (la que usan ssstik y compañía) baja por URL con curl;
  su búsqueda tiene desafío de Cloudflare. Las URLs salen de las páginas `tiktok.com/discover/...` abiertas con Chromium.
  Neko no hizo falta: el Chromium del banco es un navegador de verdad.
- **Trampa:** Chromium daba `ERR_CERT_AUTHORITY_INVALID` porque el almacén NSS (`~/.pki/nssdb`) estaba vacío. Se le agregó la CA del
  proxy de la sesión con `certutil -A -t "C,," -i /root/.ccr/agent-proxy-ca.crt` (confiar en la CA oficial, no apagar la verificación).
- Se bajaron ~60 clips (226 URLs, portadas revisadas a ojo). **Los rastreadores de cuerpo entrenados con personas no sirven para un
  palito**: `herramientas/calco_palitos.py` usa geometría — silueta negra → relleno de agujeros → se saca la cabeza (máximo de la
  transformada de distancia) → esqueleto desde el borde de la cabeza → piernas = el par de puntas que se separa más lejos del cuello,
  brazos = las que salen cerca. Probado contra poses conocidas de BRONCA: cabeza a 0,7 cm, pies 1,6 cm, mano 1,1 cm; la cadera, 7 cm.
- **Trampas del calco:** el ojo blanco hacía un rulo en la cabeza (se rellena); al recortar la cabeza los hombros quedaban sueltos
  (varias raíces); las piernas gruesas se funden antes del hueso (cadera = rodilla + largo de canilla sobre el muslo); la escala por
  cadera-cuello se disparaba (se usa el radio de la cabeza: **en AoS5 el palito en guardia mide 6,7 radios de cabeza**); los clips
  repiten cuadros (el juego se grabó a ~15 cuadros por segundo). Clasificar golpes solo daba casi todo carrera y armas: **el golpe se
  tira casi parado** (filtro por velocidad de la cadera) y los buenos se eligieron a ojo en hojas cuadro por cuadro.
- Fuentes buenas: un combo completo del juego (TikTok 7644216474915163412, cuadros 606–645: directo, estocada, gancho arriba),
  patadas laterales (7091473179801029914, 100–113), patada alta (7625425895171345685, 4982–4985) y carrera (clip 029, 955–964).
- `herramientas/golpes_aos.py` arma `ANIM_AOS` (guardia, jab, cross, gancho, patada, lateral, voladora, correr): deja cabeza, pies y
  manos como en el video y busca la cadera y el ángulo del torso que los hacen alcanzables. `pose()` las muestrea por fotogramas.
- **Proporciones de AoS5 en los humanos** (`HUMANO`): torso corto 0,32, piernas 1,16, brazos 0,8, cabeza 0,27, trazo ×1,5, escala 0,9.
  Las poses hechas a mano se agrandan ×1,32 y se les acorta el torso. Los zombis siguen como estaban.
- Comparación cuadro original / pose del juego: `juegos-pc/referencias/aos_calco_comparar.jpg`.

Medido: bot con invencibilidad 5/5, sin invencibilidad 12/15 (antes 11/15); toques por CDP como antes; sin errores.

### 2026-09-23 (14) — BRECHA 7, estilo SIERRA 7
**Pedido textual:** «GENERAME un juego HTML single, dónde el juego trate de una copia parecida a SIERRA 7 - Tactical Shooter, investiga
todo sobre ese juego y dame 5 niveles completos procedural y de mecánicas goty de verdad y usa lo anterior aprendido de menú y
modelos procedurales y hazlo incluso mejor».

`juegos-pc/Brecha.html`: primera persona sobre rieles, three.js r128 (cdnjs), acostado con el giro sólo por CSS y pantalla
completa + `orientation.lock` al primer toque, como ANDES y BRONCA.
- **Mundo por código**: cada cuarto se funde en una malla con color por vértice (`Obra`) y sus cajas sólidas van a `MUNDO.cajas`
  para los rayos. Los tiros son rayos analíticos contra cajas, cápsulas del cuerpo y la caja girada del escudo; nada de raycaster.
- **Soldados**: esqueleto de 16 puntos con IK de dos huesos en 3D (`poseSoldado`, `aMundo3`, `vestir`); al morir, muñeco de
  trapo verlet. Casco y placas que se rompen, escudo que se corre al disparar, cabeza = daño ×.
- **Misiones**: Depósito (asalto con cubiertas y brecha final con rehén), Embajada (tres salones con brecha en cámara lenta,
  captores con cuenta regresiva, reloj de 5 min), Puerto (francotirador en tres puestos de grúa: caída, viento, aguantar el aire,
  blanco que escapa en auto), Autopista (convoy: camionetas, motos, cohetes y helicóptero) y Búnker (escudos, pesados y El Coloso).
  Armería con 6 armas, 4 mejoras y equipo; rango, estrellas y medallas.
- Calidad automática por el intervalo real entre cuadros; sombras sólo afuera (adentro los techos dejaban todo negro).

Trampas que costaron una vuelta:
- **Cámara, boca del arma y caja del escudo se actualizaban al dibujar**: el paso del banco usaba posiciones viejas. Todo va en `pasar()`.
- **El botón BRECHA nunca anduvo con el dedo**: `pasarJugador` borraba `IN.brecha` antes de que `pasarEtapa` lo leyera. El bot
  entraba igual (`|| J.bot`) y lo tapaba. Lo encontró la prueba de toques por CDP, no el bot.
- **Enemigos detrás de cubierta alta para siempre**: si pasan 6 s sin verse (pared, civil en la línea o fuera del giro de la mira),
  se mudan a un lugar a la vista. El criterio de «se ve» tiene que ser **el mismo** que usa el bot (cabeza o pecho, 0,2 m): con
  0,3 vs 0,2 un enemigo quedaba justo en el borde y no se mudaba nunca.
- **Rehenes con las manos arriba tapaban la línea de tiro** y el bot les pegaba (el control por ángulo miraba cabeza, pecho y pelvis,
  no los brazos). Ahora `civEnLinea` tira cinco rayos contra el cuerpo entero, y los rehenes se tiran al piso con las manos en la nuca.
- **El giro de la mira tenía tope 1,05 rad** y en las brechas el que entra por un costado tiene enemigos a 1,1: quedaba apuntando al
  tope. 1,35 adentro.
- **El bot francotirador nunca disparaba a un blanco en movimiento**: miraba el error antes de corregir la puntería, y el blanco se
  mueve más que la tolerancia en un cuadro. Se mira el error que queda.
- **La baranda de la grúa tapaba media vista** (el ojo quedaba 15 cm arriba de ella): plataforma más baja y baranda al lado del jugador.
- **El francotirador enemigo pegaba el 94 % de los tiros** a cualquier distancia (láser = alcance 500): 55 % y 30 de daño.
- **El HUD a DPR 2 costaba un tercio del cuadro** en celulares lentos: su escala baja con la calidad automática (tope nuevo 0,4).

Medido: bot con invencibilidad 15/15 (3 semillas × 5), sin invencibilidad 13/15 (pierde el convoy o El Coloso, sin comprar
mejoras). Toques reales por CDP 11/11: mira, fuego, fuego arrastrando, cubrirse con otro dedo apuntando, recargar, cambiar
arma, mira telescópica, granada, pausa, seguir, brecha. CPU ×6 con calidad automática: 32–46 cuadros por segundo (antes 21–32);
sin frenar, 53–56. Sin errores. Sondas: `window.__S` — `iniciar(n,sem)`, `anda(n)`, `bot(v)`, `dios(v)`, `est()`, `dibujarYa()`.

### 2026-09-23 (15) — BRECHA 7 no abría en el visor de la app
**Pedido textual:** «solucionalo rápido los errores» + captura: «SIN CONEXIÓN: EL JUEGO NECESITA THREE.JS DEL CDN».

- **El visor de HTML de la app no deja bajar nada de la red**: three.js desde cdnjs no cargaba nunca. Ahora three.js r128 (MIT, 603 KB)
  va **dentro del HTML** (764 KB en total). Probado con el contexto `offline` de Playwright y cortando todo pedido que no sea `file:`:
  cero pedidos a la red, sin errores, la misión corre. **Trampa del banco:** con red, el CDN anda y el problema no se ve nunca;
  para juegos three.js, probar siempre sin red.
- **INSTRUCCIÓN no tenía salida**: el texto medía 464 px en una pantalla de 412 y el VOLVER quedaba afuera. Texto en dos columnas.
  Recorrido de menús con toques reales por CDP: todos los botones andan, y ninguno queda tapado ni fuera de pantalla.

### 2026-09-23 (16) — BRECHA 7 en tres idiomas
**Pedido textual:** «agrega al menú de inicio un selector de idioma de inglés, español y portugués».

- Selector en la portada (ESPAÑOL · ENGLISH · PORTUGUÊS), se guarda en `G.idioma`; la primera vez sale de `navigator.language`.
- **Todo se sigue escribiendo en castellano** y `T()` traduce al mostrar: entero si el texto está en `TR[idioma]`, y si no frase por
  frase con una sola regex de palabras enteras (`(?<!\p{L})…(?!\p{L})`, la más larga primero) y caché. Así andan solos los textos
  armados como `'OLEADA ' + n`, `'COMPRAR $' + p` o el objetivo con `· 3 HOSTILES`. Portugués de Brasil.
- Enganches: `textoH` (todo el HUD), `aviso`, `fila`/`barrasArma`/`armarMisiones`/`armarEquipo`, informe y medallas (las claves de
  `G.medallas` siguen en castellano). El HTML fijo se traduce recorriendo los nodos de texto y guardando el original.
  La instrucción tiene negritas adentro: va entera por idioma (`COMO_TXT`).
- **Trampa:** el recorrido traducía también el nombre del juego («BREACH 7», «INVADIR 7»). `.titulo` queda afuera, igual que los
  elementos que el JS reescribe (si no, se traduciría un texto ya traducido).
- Medido: recorrido completo en inglés y portugués (portada, operaciones, equipo, armería, instrucción, HUD, aviso, pausa, informe):
  sin restos en castellano y todo entra; el idioma queda guardado. Toques 11/11, menús sin botones tapados, sin red y sin errores.

### 2026-09-23 (17) — los otros cuatro juegos en tres idiomas
**Pedido textual:** «en todos los anteriores» (el selector de idioma de BRECHA 7). EL TIPO, A OSCURAS, ANDES y BRONCA; el Bosque no.

Misma receta que BRECHA en los cuatro: se escribe en castellano, se traduce al mostrar (entero o por palabras enteras con una regex y
caché), el HTML fijo por TreeWalker desde el original, idioma guardado y la primera vez de `navigator.language`; selector
ESPAÑOL · ENGLISH · PORTUGUÊS en la portada. Nombres propios (héroes, apodos, riders, EL MOLE) y los títulos de los juegos no se traducen.
- **EL TIPO**: el traductor se llama `trad()` porque `T` ya es el tema del nivel. Engancha en `lienzoTexto()` y `texto()`; `pixelar()`
  guarda el castellano en `data-px` y el idioma en `data-pl` y rehace desde ahí. Idioma en `eltipo.idioma`.
- **A OSCURAS**: engancha en `lienzoTexto()` (todo lo pixelado); los avisos que no entran a escala 2 bajan a 1.
- **Fuente de píxeles** (EL TIPO y A OSCURAS): Ã Õ Â Ê Ô À Ç. **Trampa:** la cedilla de una fila se la comía el contorno; son 3 píxeles
  y el lienzo crece una fila **sólo** si el texto tiene Ç (con la fila en todos, las tarjetas de niveles se desbordaban).
- **ANDES**: engancha en `aviso`, `mostrarCombo`, `hud`, `metasHtml`, taller y resultado; números con el formato de cada idioma.
- **BRONCA**: engancha en `aviso`, `texto`, textos flotantes, `botonesHab`, misiones, base y resultado.
- **Trampa:** `¡` no es letra: `¡NIVEL 3!` salía «¡LEVEL 3!». Las que empiezan con `¡` van con clave entera o se les saca el signo.
  «SONIDO: SÍ/NO» va con clave entera para que `NO` no se traduzca suelto.
- **Defectos viejos que aparecieron de paso** (ya estaban en castellano): en ANDES el VOLVER de «Cómo se juega» quedaba fuera de
  pantalla (467 px en 412: dos columnas + `justify-content: safe center`) y el texto del sonido no salía del guardado; en EL TIPO las
  tarjetas de niveles centradas cortaban las tildes de arriba (`flex-start`).
- Medido en cada juego: recorrido por toques CDP en inglés y portugués sin restos en castellano ni nada desbordado, idioma guardado al
  recargar, cero `pageerror`, bots como antes (EL TIPO 15/15, A OSCURAS 5/5 invencible, ANDES 14/15 con partidas idénticas, BRONCA 5/5
  invencible), gestos iguales y el traductor a 0,2 µs por llamada (nada medible en el cuadro). Control final: toque real en cada botón
  de idioma de los cinco juegos, sin red.

### 2026-09-23 (18) — BRECHA 7 con assets de Rezona, a fondo
**Pedido textual:** «Usa Rezona para generar mejores texturas a brecha con imágenes modelos 3D etc y música y sonidos también
mejores gráficos y menús en un 500% mejoralo no tenes límites de generación en Rezona así que hacelo todo pbr texturas también y
modelos 3D incluso de armas» y después «Ahora en vez de mejorar 1000% debes mejorar todo y hacerlo a tu máximo» (con una guía
adjunta: luz primero, HDR + ACES, niebla del color del cielo, PBR sin costuras, trampas de GLB, audio, todo adentro del HTML).

**Lo generado con Rezona** (proyecto descartable `tOMtshuHPE`, cuatro agentes en paralelo): 19 juegos de texturas PBR (albedo,
normal y ORM, procesados sin costura), 2 cielos equirectangulares con el sol medido, 7 ilustraciones de menú, 8 armas, escudo,
10 piezas de utilería, 5 vehículos, las dos manos con guante, 4 personajes con esqueleto de 24 huesos (soldado, pesado, El Coloso,
rehén) y, para el puerto, contenedor de 40 pies, grúa de pórtico y buque portacontenedores. **Audio: nada.** El proveedor de audio de Rezona devolvió `NOIZ_FAILED` en los ~50 pedidos (efectos, voces,
música, con parámetros mínimos): se aceptan, dan `task_id` y a los 25 s terminan `failed`.

**Cómo entra al HTML** (12,7 MB, sin red): `window.ARCH` con data URIs y `window.MAN` con lo medido. Sin `fetch` ni `blob:` (el
visor los bloquea): imágenes con `createImageBitmap(Blob)`, modelos con `GLTFLoader.parse`, sonido con `decodeAudioData`. Todo
arranca con lo dibujado por código y lo generado lo pisa cuando decodifica. Las imágenes se decodifican **cuando algo las usa** y
se sueltan al cambiar de tema: todas juntas son cientos de MB en un teléfono.
- **Armado**: `herramientas/brecha/armar.py` junta `herramientas/brecha/partes/*` y mete los assets achicados a lo que se ve en
  un teléfono (texturas 512, ORM 256, armas del jugador 1024, GLB cuantizados, clips de animación afuera). **En una sesión nueva,
  sin la carpeta de generados, reusa los assets del HTML ya armado**: se puede tocar el código sin regenerar nada.
- **Render**: HDR en medio flotante, multimuestreo ×4 sólo con calidad ≥ 0,85, resplandor por cadena de mips, ACES, gradación por
  tema, viñeta, grano; niebla teñida hacia el sol; entorno PMREM del cielo (o dibujado adentro); sombra que sigue al jugador.
- **Mundo PBR**: UV en metros, tinte por vértice relativo al color medio de la foto, oclusión horneada por vértice.
- **Personajes**: el GLB se mueve con el mismo esqueleto de 16 puntos (IK y muñeco de trapo) de antes; cada hueso se orienta
  desde esos puntos. El choque sigue siendo el de las cápsulas.
- **Menús**: el arte generado en un lienzo único detrás de las capas (portada con título a la izquierda y paneo lento, armería,
  una imagen por operación), carga con la portada y barra, miniaturas de las operaciones, íconos de las armas renderizados desde
  los modelos 3D. Mientras el arte tapa la pantalla, la escena 3D no se dibuja.
- **Agua del puerto**: casi espejo que refleja el cielo, olas con un mapa de normales sin costura (senos de frecuencia entera) que
  se corre con el tiempo.
- **Sonido nuevo** (`p2s.js`): 72 muestras sintetizadas por capas al abrir el audio (estampido, cuerpo con corte que cae, golpe
  grave y mecánica metálica; impactos, recargas, cerrojo, casquillos, patada de puerta, explosión, batería), de a 8 ms por tarea:
  350 ms en total sin trabar el toque. Reverb por convolución con la respuesta de cada lugar (galpón, salones, búnker, puerto con
  ecos de contenedores, ruta abierta). Música por capas que entran con la tensión (menú, sigilo, combate). Motor y rotor en bucle
  cosido. Impactos según el material de la caja. Pasos, casquillos, latido con poca vida. Voces de radio en el idioma elegido con
  la voz del sistema si es local. **Lugar listo para los MP3 de Rezona** (disparos, voces `v_<frase>_<idioma>`, `mus_<modo>`):
  si llegan, pisan lo sintetizado sin tocar código.
- **Gráficos: AUTO / ALTOS / MEDIOS / BAJOS** en la portada; la calidad aprendida se guarda.

Trampas que costaron una vuelta:
- En r128 `Texture` no tiene `userData`: la marca va en `t.__asset`.
- **El fondo equirectangular se convierte a cubo una sola vez**: con el marcador de 4×4 quedaba un cielo violeta liso. Al llegar la
  imagen: `dispose()` y reasignar.
- **Lo cuantizado (`KHR_mesh_quantization`) se pasa a coma flotante antes de hornear la matriz**: si no, todo lo que pasa de 1 se
  recorta sin aviso. Con `GLTFLoader` r128 anda (la regla de `-noq` era por otro cargador).
- Sacar los clips no achicaba el GLB: hay que soltar canales, muestreadores y accesores antes de podar.
- El esqueleto generado tenía la derecha en +x: la pose se espeja; los cuerpos muertos se hundían (radio de piso por punto).
- **El umbral del resplandor afuera**: con sol 3,2 medio mundo pasa de 1,25 y todo lo soleado brillaba como neón. Afuera va 2,3.
- **470.000 triángulos de vallas** en la autopista (800 × 585 instancias) y **6.000 por arma de cada enemigo**: se simplifican al
  armar (valla 160, utilería pesada a la mitad) y los enemigos llevan una versión `_lod` de 900 que comparte texturas.
- **La calidad automática no bajaba nunca en un aparato lento**: tiraba los cuadros de más de 100 ms, y después se salteaba 20
  cuadros al empezar cada misión (12 s a 1,6 cuadros por segundo). Ahora cuenta hasta 1,5 s por cuadro, se saltea 1,2 s por reloj,
  reacciona a los 8 cuadros si va muy lento y arranca sin multimuestreo en pantallas táctiles.
- Banco: con el render nuevo las esperas fijas mienten (cubrirse «no andaba», el informe «no salía»): se espera por el estado del
  juego, no por tiempo.
- Rezona audio: música tope 30 s, efectos mínimo 1 s (si no, `VALIDATION_ERROR` sin detalle), `voice_id` inventado se acepta
  sin validar y `model` desconocido da «Unsupported speech model».

Medido (3 semillas × 5, dos corridas): bot con invencibilidad 14/15 y 13/15 (un rehén ejecutado en la embajada y una vez
trabado en el convoy; repetidas, 3/3 cada una: es el azar de la IA), sin invencibilidad 13/15 y 14/15, como antes. Toques reales por CDP 11/11, recorrido de menús sin botones tapados ni desbordes en cinco
tamaños de visor, sin red, inglés y portugués sin restos. Sonido: 72 muestras sin NaN ni silencio, suenan en partida, el bucle
del motor sigue al convoy y los lugares de Rezona se probaron con buffers falsos. **Rendimiento en el banco (render por software,
sin GPU), con calidad automática: 11–14 cuadros por segundo a CPU normal y 7–9 a CPU ×6; el puerto, 3,6 y 1,3** (antes
53–56 y 32–46; el puerto es el más pesado: se ve todo el muelle, 88.000 triángulos de utilería y los modelos de contenedor
sólo a menos de 50 m de los puestos): ahí se pagan en la CPU los triángulos y el PBR por píxel. En un teléfono con GPU no lo pude medir; si va lento,
GRÁFICOS: BAJOS.

### 2026-09-24 (19) — BRECHA 7: miras, enemigos que atravesaban cosas y menús que se deslizan
**Pedido textual:** «Arregla las miras agujerea los modelos 3D de las armas también arregla que atraviesen objetos ponerlos bien
ubicados a los npc en brecha no te deben disparar atraves, también deberías agregar que se puedan desplazar por los menús anda
tosco, y eso».

- **Miras**: la mejora «mira holo» pegaba una caja negra metida adentro de todos los modelos, también en los que ya traen óptica.
  Ahora, en los que no traen (P9, K5, B12), va un punto rojo de marco abierto apoyado sobre lo más alto del arma en ese punto
  (`altoSobre` sobre la geometría del modelo), y apuntando el punto queda en el centro. Los que traen óptica en el modelo (R4,
  M14) no llevan nada encima; como el fondo de esa óptica es opaco y tapaba el centro, al apuntar del todo el arma se esconde y
  aparece la mira holo (R4, `#holo` por CSS) o la telescópica (M14, la del L96).
- **Enemigos que atravesaban cosas**: caminaban en línea recta a través de cajones, escritorios y paredes, y el último cuarto
  tenía un punto de aparición **detrás de la pared de fondo** (esa pared no tiene puerta): nacían afuera y la atravesaban.
  Ahora los destinos se acomodan donde entra un cuerpo (`acomodar`), al caminar se rodea la primera caja que corta el camino por
  la esquina que menos alarga (`rodear`), lo que igual quede metido se empuja afuera (`sacarDeCajas`), y si en 3 s no se acercó
  medio metro se queda donde está. Aparecen en la puerta **del lado de adentro**; en el último cuarto, desde el fondo. La puerta
  cerrada de una brecha también frena. Autoelevador, racks y archiveros pasaron a ser sólidos (antes no frenaban ni balas ni cuerpos).
- **Tiros a través**: el enemigo disparaba sin mirar si había algo en el medio; los de adentro de una brecha tiraban a través de
  la puerta todavía cerrada. Ahora sólo dispara con línea de tiro (la misma prueba que la vista: cabeza o pecho libres); si no, sigue
  apuntando y espera. Si la pierde en medio de la ráfaga, la bala pega en lo que haya.
- **Menús**: con la pantalla girada por CSS el desplazamiento nativo iba para el lado que no era. Ahora se desliza a mano, en las
  coordenadas del juego, con envión al soltar; arrastrar sobre un botón no lo aprieta; un degradé abajo avisa que hay más.

Medido: misiones de interior (depósito, embajada, búnker × 2 semillas, con el bot y vida infinita) — enemigos metidos adentro de
una caja: **50 de 582 muestras antes, 0 de 610 ahora**; tiros que te pegaron a través de algo: **3 antes, 0 ahora**. Menús con toques
reales girado y sin girar: 188 px arrastrando y el envión suma ~85; arrastrar sobre COMPRAR no compra, tocar sí. Bot con
invencibilidad 15/15, sin invencibilidad 13/15 (convoy y El Coloso, como antes). Toques 11/11, menús, sin red e idiomas sin errores.

### 2026-09-26 (20) — ALAS · DUELO AÉREO
**Pedido textual:** «quiero un juego de aviones inspirado en guerra pero en este caso duelo de aviones, un mundo god con cielo celeste y
nubes, mares, montañas y islas, el juego va a tratar de vs de aviones, el jugador va a poder controlar el avión y disparar misiles y balas
al enemigo Hacelo super realista ahí tienes Rezona lab … gasta lo que quieras … que sea 1000% veces mejor que los juegos anteriores en menú
estilo animaciones e incluso animaciones y motion graphics en los menú» (con capturas de Warplanes, Alliance: Air War y Modern Warplanes, y
un TikTok de Modern Jet Fighters).

`juegos-pc/Alas.html` (7,5 MB, sin red), armado como BRECHA con `herramientas/alas/armar.py` desde `partes/*` y los generados. Si la
carpeta de generados no está, reusa los assets del HTML ya armado.
- **Rezona** (un proyecto, `EUDERiogUk`): 3 cielos equirectangulares con el sol medido, 8 nubes sueltas, 5 texturas de isla (arena, pasto,
  selva, roca, nieve) + normales de agua, 8 ilustraciones de menú (portada, hangar, mapa del archipiélago, una por misión), 10 modelos
  (6 jets, misil, portaaviones, destructor, faro) con puntos medidos (toberas, puntas de ala, rieles) y **29 audios**: motor, posquemador,
  viento y alarma en bucle cosido, cañón, misil, explosión, impacto, pasada, bengalas, música de menú, combate y victoria, y 15 voces de
  radio (5 frases × es/en/pt). **El audio de Rezona volvió a andar.** Pero `duration` se ignora (la música viene de 8 a 10 s aunque se
  pidan 30), y el habla a veces devuelve un monólogo inventado de 20–30 s en vez de la frase: se repite hasta que sale sola.
- **Mundo**: cielo por shader desde el panorama girado para que su sol caiga en la luz; niebla teñida hacia el sol. Mar en un plano que sigue
  a la cámara: normales en tres escalas, Fresnel con el cielo, brillo de sol, bajío turquesa y espuma desde un mapa de costa. Islas de ruido
  (meseta, crestas, playa) con mezcla de cinco texturas por pesos por vértice, y la misma altura para choque e IA. Nubes instanciadas que
  miran a la cámara, ordenadas de atrás para adelante, que se funden de cerca y blanquean la pantalla por dentro.
- **Vuelo y combate**: cuaterniones con giro limitado por G; empuje contra resistencia (inducida por G) y gravedad por la trayectoria;
  pérdida; asistencia que inclina para girar. Cañón con calor; balas como segmento contra esfera. Misiles con adelanto, giro limitado,
  espoleta de proximidad y bengalas. Barcos con antiaérea. HUD de verdad: escalera de cabeceo, vector de vuelo, recuadros, rombo de fijado,
  pipper de adelanto, flechas fuera de pantalla, cintas de velocidad y altura, G, radar y apagón por G sostenida. Destello de lente.
- **Menús con motion graphics**: el avión de la portada vuela detrás del título con recuadro de seguimiento, telemetría, radar y texto que
  se tipea; barrido entre capas y entradas escalonadas; mapa de misiones con rutas que se dibujan, pulso de radar y un avión que las
  recorre; hangar con el avión girando, rótulos con líneas guía y barras que crecen; resultado con números que cuentan y estrellas.

Trampas que costaron una vuelta:
- **`PMREMGenerator.fromScene` daba basura** en este armado: todo `MeshStandardMaterial` salía negro con halo blanco (Lambert, Phong y
  Standard con `envMapIntensity:0` andaban). El entorno sale del panorama dibujado en un canvas con `fromEquirectangular`, como BRECHA.
- **La cámara se movía al dibujar**: después de `anda()` quedaba vieja y a pocos cuadros por segundo se quedaba atrás del avión. Va en `pasar()`.
- **El modo barato (Lambert, calidad ≤ 0,45) perdía la mezcla de texturas de la isla**: quedaba el color por vértice, que es la oclusión
  (casi blanco), y las islas salían como manchas blancas. El clon Lambert se lleva el mismo `onBeforeCompile` y la clave (`userData.propio`).
- **Las nubes de Rezona salían marrones**: el gris del sprite multiplicado por el sol cálido. Ahora el brillo del sprite elige entre sombra
  azulada del cielo y sol.
- **La costa se veía en escalones**: el mapa de costa tenía texeles de 78 m. La caja abraza a las islas, 1024 texeles, dos canales (bajío
  difuminado y espuma pegada a la orilla). Cuesta 100 ms al armar la misión.
- **`vh` con la pantalla girada por CSS mide el lado largo físico**: el mapa de misiones medía `52vh` = 463 px en una pantalla de 412 y
  DESPEGAR quedaba afuera. `flex:1 1 0` con mínimo y máximo. Y el mapa arrancaba su animación antes de que la capa fuera visible (salía
  transparente): arranca desde `mostrar()`.
- **El cañón acumulaba deuda de cadencia**: sin gatillo el contador seguía bajando y al apretar salían de golpe todas las balas de los
  segundos anteriores. El primer caza que disparaba metía 30 balas en un cuadro y **el bot moría a los 7 s en las 15 partidas**.
- **La espoleta de proximidad miraba una vez por cuadro**: a 1000 m/s de acercamiento son 17 m por cuadro y el misil pasaba de largo el
  radio de 21 m. Distancia mínima **dentro** del cuadro.
- **Cada bengala tiraba su propio dado**: con seis juntas el misil se engañaba el 96 % de las veces. Una tirada por salva (78 % contra
  misiles enemigos, 42 % contra los del jugador).
- **Círculo de Lufbery**: dos aviones iguales girando a fondo a 900 m, ninguno con la nariz encima, 10 minutos. La IA con pericia alta frena
  para cortar por dentro después de 4 s de círculo, y esquiva en rachas con descanso (antes quebraba el 90 % de los cuadros con alguien
  en la cola y nadie conseguía solución de tiro). Para el jugador: cono de fijado 0,42 rad, ayuda de puntería del cañón cerca del blanco
  fijado y misiles que se recargan de a uno cada 12 s, como en los juegos de celular.
- **La línea de flotación del manifiesto estaba mal**: la franja roja del destructor llega a ~11 m sobre la quilla, no a 4,5. Se midió a
  ojo contra el agua: destructor −7,5 m, portaaviones −2,5 m. Antes de culpar a la profundidad del agua con el búfer logarítmico, un
  material básico en el agua mostró que tapaba bien.
- `lanzarOla` sumaba oleadas aunque no quedaran; la vitrina del hangar no copiaba la posición a la malla (el avión estaba en el origen).

Medido: bot con invencibilidad **15/15** (3 semillas × 5, misiones de 50 s a 4,5 min), sin invencibilidad **10/15** (pierde contra El As
y en la rasante contra destructores). Toques reales por CDP **sin red** (cero pedidos): stick en dos ejes, fuego con segundo dedo
apretando el stick, misil, turbo, freno, bengalas, cámara, pausa, seguir, salir, hangar y cómo se juega; ningún botón tapado ni fuera de
pantalla en 412×892 ni en 892×412. Inglés y portugués sin restos en castellano (DOM y todo lo escrito en canvas). Los 29 audios
decodifican y suenan. Sin errores. Banco sin GPU: 18–20 cuadros por segundo a CPU normal y 10–12 a CPU ×6. Ahí manda el compositor:
la simulación cuesta 0,07 ms por paso y el dibujo 3,4 ms a calidad 1 (43 llamadas, 113.000 triángulos), así que en un teléfono con GPU
tendría que ir mucho mejor. No lo pude medir en un teléfono. Sondas: `window.__V` — `iniciar(n,sem)`, `anda(n)`, `bot(v)`, `dios(v)`,
`est()`, `assets()`, `dibujarYa()`, `x` (escena, cámara, islas, agua, barcos).

### 2026-09-26 (21) — ALAS: vueltas rápidas y cámara libre
**Pedido textual:** «las vueltas dan muy lentas, quiero que pueda dar la vuelta más rápido y que yo pueda mover la cámara a los lados,
arriba y abajo, ver para donde yo quiera».

- **Giro**: con el límite de G real (8 G a 1150 km/h = 0,25 rad/s) una vuelta tardaba 22 s. El avión gira con `ARCADE` (3,4) veces esos
  G; el HUD, el apagón y la resistencia inducida ven los G «reales» (divididos por `ARCADE`). La pérdida de mando a baja velocidad
  empieza más cerca de la pérdida, así que **frenar cierra el giro** (antes lo alargaba: 42 s).
- **Trampa:** la asistencia tiraba con `cos(inclinación)` (a 70°, casi nada). Ahora tira más cuanto más inclinado y sólo si ya inclinó
  hacia ese lado; la inclinación objetivo se corrige con la nariz (más si sube, menos si baja) y la vuelta queda plana: subía 630 m
  por vuelta, ahora 58.
- El apagón sólo aparece si se sostienen más de 7,5 G durante 2,5 s: con los giros rápidos tapaba cada vuelta.
- **Cámara libre** (`MIRAR`): arrastrar la mitad derecha (`#zonaMirar`, detrás de los botones) gira la cámara alrededor del avión, o la
  cabeza en la cabina; mirando para otro lado la cámara apunta al avión y se esconden la escalera, la mira y el vector de vuelo. Al
  soltar vuelve sola a los 0,9 s; el doble toque la centra. En PC, con el mouse. Cartel «CÁMARA LIBRE» en tres idiomas y línea nueva
  en «Cómo se vuela».

Medido (`banco/giro.js`, stick a fondo): vuelta del F-14 **21,9 → 5,9 s**, con freno **41,6 → 6,1 s**, rizo **17,7 → 5,5 s**; F-16
5,4 / 4,8 / 5,2 s. Toques reales por CDP en vertical girado (`banco/mirar.js`): mirar a la derecha, atrás y arriba deja la cámara
apuntando a ese lado (producto con el eje 0,95 / −0,99 / 0,95), vuelve sola, doble toque centra, stick y mirar con dos dedos a la vez,
en la cabina, y FUEGO encima de la zona sigue andando. Bot con invencibilidad 15/15, sin invencibilidad **12/15** (antes 10/15).
Toques, menús en dos tamaños, idiomas y sin red como antes; sin errores.

### 2026-09-26 (22) — CONTRAGOLPE, a lo Counter-Strike
**Pedido textual:** «GENERAME un juego mejor que brecha en un 500% haz que el juego sea súper goty y súper parecido a counter strike,
necesito que diseñes los personajes no de bloques … que sea lowpoly pero súper buenos gráficos … 3 modos de juegos … buenos mapas
construidos bien desde cero … hagas vos proceduralmente las armas … con sus animaciones de recarga e inspección … cuando mueren radgoll
… las manos hazlas bien realistas como el vídeo y las armas también y el agarre …» (con un TikTok de CS2 en Nuke con el preset
Borderlands) y después «intentá terminarlo rápido».

`juegos-pc/Contragolpe.html` (12 MB, sin red), armado por `herramientas/contragolpe/armar.py` desde `partes/*`. De Rezona: texturas PBR,
dos cielos con el sol medido, calcomanías, 9 ilustraciones de menú y ~90 audios (disparos, mecánica de armas, pasos por piso, voces de
radio en tres idiomas, música). Todo lo demás es código.
- **Render**: HDR, tinta en post (segunda diferencia de 1/z para pliegues y siluetas, Sobel de luminancia, trama en lo oscuro), bloom,
  ACES. El mundo son cajas con **luz horneada por cara** (sol con penumbra, cielo, lámparas, un rebote) en un atlas; se hornea sin
  conexión con `banco/hornear.js <mapa>` y el mapa carga en <1 s. Utilería y calcomanías toman la luz del mapa por vértice.
- **Armas y manos**: 13 armas en medidas reales con piezas que se mueven; manos con piel sobre 16 huesos y **dedos que se cierran hasta
  tocar el arma** (volúmenes de choque por arma: perfil extruido, caja y cápsula; la palma se apoya sola). Clips de sacar, disparo,
  recarga (el cargador sale y la mano izquierda lo trae), recarga en vacío, inspección, cerrojo del AWP, cuchillo, granadas y C4, más
  capas de balanceo, paso, retroceso con resorte y aterrizaje. La Glock va a dos manos como en CS2.
- **Juego**: movimiento Source, imprecisión por estado + patrón por bala con golpe de vista, penetración por grosor y material, daño por
  zona con blindaje y casco, caída con la distancia; HE, flash (con ángulo y distancia), humo que tapa la vista; bomba con plantar,
  desactivar (kit) y explosión; economía de CS; cambio de lado; deathmatch; carrera de armas.
- **Bots**: navegación por grilla en capas (dos pisos, escalones, bajadas, saltos agachados), A*, campo visual y oídos, reacción por
  blanco, error que se asienta, control del retroceso, contraparada, ráfagas; T eligen sitio y plantan, CT se reparten y retoman.
- **Mapas**: armados por grilla (se declaran los lugares caminables y los edificios salen solos) + utilería procedural.

Trampas que costaron una vuelta:
- **Horneado con los mismos rayos en todos los texeles**: cada rayo proyectaba la silueta de la escena sobre las paredes grandes
  (parecían nubes). Giro al azar por texel + desenfoque 3×3 por cara.
- **`angDif(a, b)` devuelve b − a**: los bots giraban alejándose del blanco y nadie mataba a nadie.
- **La reacción se reiniciaba con cualquier enemigo nuevo a la vista**: con varios, el bot no disparaba nunca. Va por blanco.
- **`const` globales no cuelgan de `window`**: `window.VM`, `window.FABRICA` daban falso y el arma no se veía ni caían armas al piso.
- Funciones globales con el mismo nombre en dos partes (`caja` del HUD pisaba a la de modelado): una sola gana, sin aviso.
- Mano: la orientación va en el marco del arma, no del enchufe inclinado; el antebrazo que apunta a la cámara se ve desde adentro de
  la manga: la manga termina en un tramo alineado con la mano y el codo se tuerce hacia la esquina.
- Pisos sobre un nivel de abajo necesitan cara inferior (desde B se veía el cielo).

Medido: partidas simuladas (jugador en piloto): deathmatch 10 bots ~100 bajas/min en la sala de prueba, bomba en NUCLEAR 7 rondas en
5 min, DESIERTO 5–0 con bomba plantada, carrera de armas termina sola; 0,5 ms por paso con 10 bots. Alcance: desde cada spawn se llega
a los dos sitios y a todos los spawn de DM en los tres mapas. Toques reales por CDP con la pantalla parada: palanca, mirar y fuego.
Sin red: 0 pedidos, carga en 0,9 s, luz horneada, idiomas es/en/pt, sin errores. Banco sin GPU: 14–20 cuadros por segundo.
**Pendiente** (los agentes se cortaron por el límite de gasto): muñeco de trapo de verdad (hoy cae de una pieza hacia el empuje y
respeta paredes), mocap en los personajes (hoy caminata procedural) y afinar el agarre del resto de las armas.
