# Theclaudianos — bitácora y reglas

Repo de juegos web. Un juego = **un HTML autocontenido** en `juegos-pc/`, three.js desde CDN,
se prueba **en el celular, en vertical (412×892)**.

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
