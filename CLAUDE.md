# Mariano Peak — bitácora y reglas

Repo de juegos web (antes `Theclaudianos`; en GitHub el remoto sigue siendo `juniorspro/theclaudianos`
hasta que se renombre desde Settings). Un juego = **un HTML autocontenido** en `juegos-pc/`, three.js desde CDN,
se prueba **en el celular, en vertical (412×892)**.

## Qué hay acá

| ruta | qué es |
|---|---|
| `juegos-pc/Bosque.html` | **El juego VHS.** Terror en primera persona, three.js r128 (script clásico), escenario girado 90°. Heredado de otra sesión del repo — **no es el proyecto de Mariano Peak**, se deja quieto. |
| `.claude/skills/graficos` | Reglas de render que ya costaron una vuelta cada una. |
| `.claude/skills/assets-ia` | Generar con Rezona Lab / Higgsfield y hornear lo generado. |
| `.claude/skills/banco` | Banco de pruebas, capturas y sondas. |
| `herramientas/rezona/rz.py` | Cliente stdio del MCP de Rezona (no depende de que el cliente lo tenga configurado). |
| `docs/MANUAL_JUEGOS.md` | Manual completo heredado. **Referencia, no plan de trabajo**: los juegos que nombra (BARRIO, CUBOS, Maicol…) no se continúan acá. |
| `docs/TRASPASO_BOSQUE.md` | Estado del Bosque al traspaso (referencia de esa otra línea de trabajo). |

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

### 2026-09-16 — el repo se llama Mariano Peak
**Pedido textual:** «Mariano peak se llamará este repo».

Qué se hizo: se renombró el proyecto a **Mariano Peak** en la documentación — título de esta
bitácora y un `README.md` nuevo que es la portada del repo. El nombre no toca ningún juego:
`juegos-pc/Bosque.html` sigue igual.

Sin resolver todavía: el **rename en GitHub** no se puede hacer desde acá (no hay permiso de
administración del repo por API). Lo tiene que hacer el usuario en
`github.com/juniorspro/theclaudianos` → Settings → Repository name → `mariano-peak`. GitHub deja
un redirect del nombre viejo, así que los clones existentes siguen andando; igual conviene correr
después `git remote set-url origin https://github.com/juniorspro/mariano-peak.git`.

### 2026-09-16 — Mariano Peak arranca limpio
**Pedido textual:** «esta es otra sesión para otra persona pero usa el mismo repositorio nomás,
acá lo del bosque nada que ver pero si quedan las habilidades de creación de juegos».

Qué se hizo: el repo es **compartido**. El Bosque queda donde está, intacto, pero **no es el
proyecto de esta línea**: acá lo que se hereda son las **skills** (`graficos`, `assets-ia`,
`banco`), `herramientas/rezona/rz.py` y el manual. Juego nuevo, carpeta nueva.

Login de Rezona: se corrió `npx rezona@latest login --no-browser` y se le pasó al usuario el link
`rezona.ai/api-keys?code=…` para aprobar. El contenedor es efímero: **cada sesión nueva necesita
un login nuevo**.
