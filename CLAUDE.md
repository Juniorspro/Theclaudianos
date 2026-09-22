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
   cacheados en canvas offscreen + halo de luz pre-dibujado: **2,7 ms** (misma escena, mismo banco).
7. En CSS, `#acciones .bt` le ganaba en especificidad a `#bPausa`: el botón de pausa medía 70 px
   y tapaba el HUD. Salió del bloque de acciones.

Sondas: `window.__T` — `est()`, `anda(n)`, `entrada(k,v)`, `teletransportar(x)`, `semilla(s)`,
`medirHuecos()`, `matarTodo()`, `cuentaTipos()`, `dibujarYa()`.

**Ojo con el bot de pruebas**: si deja una tecla apretada no hay flanco y el salto nunca sale —
dos vueltas se fueron en culpar al juego de un defecto del instrumento.
