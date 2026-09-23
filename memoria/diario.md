# Diario — una entrada por sesión
Lo viejo abajo. Rama de trabajo: `claude/mariano-peak-repo-63ebvl`.

### 2026-09-23 — nació CHICHARRA
**Pedido textual:** «Recréame este juego hazlo lo más parecidos o que se inspirate con muy buenas
animaciones menús y soundtrack más efectos de sonido etce y todo lo necesario» (con tres capturas de
un arcade de naves de celular).

Qué se hizo: `juegos-pc/Chicharra.html`, matamarcianos vertical completo en un solo archivo, y su
banco en `pruebas/chicharra/`. Todo medido: 5 de 6 niveles ganados por el bot, cero errores, cero
pedidos a la red, 0,51 ms por cuadro. Detalle y trampas en [chicharra](chicharra.md).

Qué falta: nada bloqueado. Ideas para la próxima — más tipos de jefe (hoy hay 3 pinturas y un solo
patrón de cuerpo), naves distintas para elegir, y probarlo en un teléfono de verdad (el banco no
puede decir los FPS reales).

### 2026-09-23 — escuela de 2D pixel art
**Pedido textual:** «No los copies pero mira aprende sobre pixel art y otras cosas procedurales y del
arte 2D quizás después te pida juegos 2D diferentes a estos para no ser copias pero te enseñan bien».

Qué se hizo: se estudiaron `GUIA_JUEGOS_2D_PIXEL.md` (EL TIPO) y `luz-mala-1.html` (LUZ MALA, 5.426
líneas) **sin copiarlos al repo**, y salió la nota [pixel2d](pixel2d.md). El HTML no se leyó entero
(~88 mil tokens): se leyeron las cabeceras de los 22 módulos y cinco bloques puntuales.

Qué falta: sigue sin definirse **qué juego es Mariano Peak**. Cuando se pida uno 2D, tiene que ser
**distinto** a esos dos — la nota es método, no molde.

### 2026-09-22 — memoria y receta instaladas
**Pedido:** llegaron `MEMORIA.md` y `GUIA-JUEGOS.md` (sin texto, sólo los archivos).

Qué se hizo: se instaló el método de memoria (`memoria/` + `MEMORIA.md`) y la receta en
`docs/GUIA-JUEGOS.md`. `CLAUDE.md` pasó de 73 líneas a un puntero corto: la bitácora larga se
mudó acá abajo. Credencial de Rezona: seguía viva de la sesión anterior (`~/.rezona`).

Qué falta: **no hay juego nuevo todavía** — falta que el usuario diga qué juego es Mariano Peak.
Sigue pendiente el rename del repo en GitHub (lo hace él, ver [repo](repo.md)).

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
