# Theclaudianos — bitácora y reglas

Repo de juegos web. Un juego = **un HTML autocontenido** en `juegos-pc/`, three.js desde CDN,
se prueba **en el celular, en vertical (412×892)**. EL TIPO se juega **acostado**: con el teléfono parado, gira todo 90°.

## Qué hay acá

| ruta | qué es |
|---|---|
| `juegos-pc/ElTipo.html` | **EL TIPO.** Beat'em up de plataformas al estilo Dan The Man: canvas 2D, un archivo, sin red, 5 niveles procedurales con jefe cada uno. |
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
