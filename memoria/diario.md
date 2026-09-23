# Diario — una entrada por sesión
Lo viejo abajo. Rama de trabajo: `claude/mariano-peak-repo-63ebvl`.

### 2026-09-23 — CABEZONES, fútbol de cabezas tipo Head Ball
**Pedido textual:** «Ahora haceme un juego parecido a "Head Ball" y busca referencias como es como se
juega controles moviles mejores gráficos 2D animaciones menús etc, etc. Mejora todo en un 100%».
Qué se hizo: `juegos-pc/Cabezones.html`, 10 cabezones originales con 3 caras cada uno (Higgsfield),
3 canchas, torneos con llave, cofres, vestuario con mejoras, música y efectos propios. Detalle y
números del equilibrio en [cabezones](cabezones.md). ARRABAL sigue generando los videos de 24
cuadros en segundo plano (101 de 144 al cerrar esta parte).

### 2026-09-23 — ARRABAL apaisado, con botones y animaciones de 24 cuadros
**Pedido textual:** «Agrega que sea más con botones que una zona así, también mejora en un 100% la
interfaz a algo más cómodo también haz que cada personaje o sea cada animación golpe 1 etc tenga 24
fotogramas que debes generar ahora también varias animaciones Idle etc etc etc más goty y también
gira 90° el juego».
Qué se hizo: juego apaisado (se gira solo con el teléfono parado), mando de palito + botones,
todas las pantallas rehechas, y 96 animaciones de 24 cuadros (8 por luchador) sacadas de videos
de Rezona. Detalle en [arrabal](arrabal.md) § Apaisado, mando de botones y animaciones.
Trampa del día: `pkill -f "while pgrep"` mató también a la propia terminal (el patrón estaba en su
línea de comando). Y `pgrep -f patrón` dentro de un `while` se encuentra a sí mismo.

### 2026-09-23 — ARRABAL: efectos de sonido de los golpes
**Pedido textual:** «Ponle efectos de sonido a los golpes».
Qué se hizo: impactos grabados por capas (efectos.py), con variantes y capa de arma; el sintetizador
queda de respaldo. Detalle en [arrabal](arrabal.md) § Efectos de sonido de los golpes.

### 2026-09-23 — ARRABAL: movimiento, golpes, banda sonora y menú
**Pedido textual:** «Mejora los movimientos y los efectos de los golpes y movimientos y agrégale
banda sonora y mejora el menú principal».
Qué se hizo: 6 cuadros más por luchador (caminar, preparaciones, levantarse, volar), animación con
estirar/aplastar, estelas y destellos; ondas, tajos, zoom y líneas de velocidad en los golpes;
banda sonora propia compuesta en Python (Rezona sin audio); menú nuevo con luchadores en escena.
Detalle en [arrabal](arrabal.md) § Movimiento, golpes, banda sonora y menú.

### 2026-09-23 — ARRABAL con sprites pintados
**Pedido textual:** «Quiero personajes de pelea 2D con anatomía humana realista y proporciones
normales… NO quiero personajes tipo palito… con los modelos que te mandé».
Qué se hizo: los 12 luchadores propios pasaron de títeres a sprites pintados (12 cuadros cada uno,
Rezona con el retrato de referencia). Los de Street Fighter no se copian. Detalle en [arrabal](arrabal.md)
§ Sprites pintados.

### 2026-09-23 — ARRABAL, seis luchadores más
**Pedido textual:** «Agrega esos modelos de personajes» (con una hoja de sprites de Street Fighter).
Qué se hizo: seis luchadores **originales** de arquetipos parecidos (no se copian personajes con
dueño), plantel de 12 y grilla 4 × 3. Detalle en [arrabal](arrabal.md) § Los seis de la segunda tanda.
Trampa del día: un parche largo en Python se cortó a la mitad por un ancla vieja; lo anterior quedó
aplicado y lo demás no. Revisar qué entró antes de volver a correrlo.

### 2026-09-23 — ARRABAL, modo arcade
**Pedido textual:** «Haz el estilo más Arcade el segundo juego».
Qué se hizo: atracción con demo, modo arcade completo (selección, VS, rondas, puntaje, continuar,
récords con iniciales) y look de salón (CRT, letras, carteles, anuncios). Detalle en [arrabal](arrabal.md).
Trampa del día: reescribir un archivo con `open(p,'w').write(open(p).read()...)` lo **vacía** (abrir para
escribir trunca antes de leer). Leer primero, escribir después.

### 2026-09-23 — música para CHICHARRA y el sonido en iOS
**Pedido textual:** «Dame el enlace del juego y al juego anterior agrégale música».
Qué se hizo: CHICHARRA tiene un tema propio por zona. En los dos juegos se arregló que iOS los deje
mudos con el interruptor de silencio (ver [pixel2d](pixel2d.md) § Sonido en iOS). La música de Rezona
volvió a fallar (7 intentos en el día, `PROVIDER_UNAVAILABLE`).

### 2026-09-23 — nació ARRABAL, el juego de pelea con cartas
**Pedido textual:** «Ahora haceme un juego parecido a "Skullgirls: Fighting RPG" … controles
moviles mejores gráficos 2D animaciones menús etc … cada nuevo juego 2D ve mejorandolo en un 100%».
(Después pidió un selector de idiomas y enseguida dijo «Ignora el segundo mensaje seguí con el
juego»: no se hizo el selector.)

Qué se hizo: `juegos-pc/Arrabal.html` con 10 ilustraciones de Rezona (6 retratos, 3 escenarios,
cofre), títeres animados por código, 3 contra 3, especiales, súper con cinemática, campaña,
colección, árbol y cofre. Detalle en [arrabal](arrabal.md). La regla nueva quedó en el índice.

Qué falta: música generada (audio de Rezona caído); probarlo en un teléfono de verdad.

### 2026-09-23 — CHICHARRA v2: HD de Rezona, hangar, mapa, ajustes
**Pedido textual:** «texturas HD a todo haciendo assets con Rezona lab, generación de imágenes música
menú nuevo etc etc etc, mejoralo en un 100% también agrega animaciones de menú controles etc sin
limitarte y usa este md para aprender no copiar ya que este juego no es pixel art».

Qué se hizo: 14 imágenes HD de Rezona (naves, bichos, jefes, fondos) horneadas a 525 KB y metidas
en el HTML; 3 naves jugables, 3 jefes distintos, 3 zonas; hangar, mapa de niveles, ajustes, tienda y
fin nuevos y animados; control relativo; sintetizador de música nuevo. Detalle en [chicharra](chicharra.md).

Qué falta: **la música generada** — el audio de Rezona estuvo caído toda la vuelta. Cuando ande:
generar las 3 pistas (30 s), bajarlas a `assets/chicharra/` y correr `empaquetar.py`.

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
