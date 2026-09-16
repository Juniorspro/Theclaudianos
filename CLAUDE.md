# Theclaudianos — bitácora y reglas

Repo de juegos web. Un juego = **un HTML autocontenido** en `juegos-pc/`, three.js desde CDN,
se prueba **en el celular, en vertical (412×892)**.

## Qué hay acá

| ruta | qué es |
|---|---|
| `juegos-pc/Bosque.html` | **El juego VHS.** Terror en primera persona, three.js r128 (script clásico), escenario girado 90°. Es el único juego activo del repo. |
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

### 2026-09-16 (2) — pies, costo, luz, cinta y HUD propio

**Pedido textual:** «El monstruo está bajo tierra, el vhs ya se satura demasiado, hay poca
iluminación global y está muy mal optimizado; necesito un menú hud completo y un Hud de controles
personalizados con imágenes e íconos propios generados».

| | antes | ahora |
|---|---|---|
| llamadas de dibujo (día) | 1298 | **591** |
| triángulos por cuadro (día) | 12,10 M | **2,65 M** |
| llamadas / triángulos (noche) | — | 455 / 1,86 M |
| brillo medio del cuadro (día) | 61,9 | **93,3** |
| brillo medio (noche) | 10,5 | 16,5 |
| objetos en la escena | 2111 | 1341 |
| errores de página | 0 | 0 |

- **Los pies se MIDEN.** El bicho caminaba enterrado: el bind dice dónde termina el pie en reposo
  y el ciclo lo baja. Al cargar se barren los tres clips en seis instantes cada uno, se busca el
  vértice más bajo de la piel y se corrige el modelo por esa diferencia.
- **Fundir las casas** (cientos de cajas que comparten una geometría unitaria escalada por
  instancia) por casa y por material: de eso sale casi la mitad de las llamadas. El índice va en
  `Uint32`. Y el raycast de oclusión pasó de mirar ~800 cajas a mirar las fundidas.
- **Las hojas no proyectan sombra**: son el 90 % de los triángulos y su sombra es la mancha que la
  copa ya proyecta con las ramas. Una sombra es una pasada entera de la escena.
- **Recorte por cuadra atado a la niebla**: a `2,25/densidad` no queda nada detrás, pero el frustum
  lo dibujaba igual. Y **la cuadra se achicó de 110 m a 55 m**, medido:

  | CELDA_ARB | llamadas | triángulos |
  |---|---|---|
  | 110 | 434 | 4,10 M |
  | 70 | 515 | 2,90 M |
  | **55** | **596** | **2,70 M** |
  | 40 | 707 | 2,09 M |

  Trozos más chicos son los que el frustum descarta: partir más fino **baja** los triángulos
  aunque suba las llamadas. 55 es la rodilla de la curva.
- **Luz**: la hemisférica pasó de .21-.50 a .40-.80 con los dos colores bien distintos, la
  exposición de .86-.94 a .94-1.02, y entró **luz de entorno de verdad**: una foto 360 generada,
  pasada por `PMREMGenerator` a `scene.environment`, con la intensidad siguiendo el ciclo de día
  (.20-.42). El cielo del juego es un shader de degradado y no ilumina; esto sí.
- **La cinta**: `uFuerza` llegaba a 2,1 y a esa altura el filtro se come la imagen. Ahora se topa
  en 1,25, la base bajó de .62 a .40, y el desaturado, el arrastre, las líneas de barrido, el
  grano y la viñeta bajaron entre un 25 % y un 40 %. Y hay **ajuste del jugador**: NO / SUAVE /
  MEDIA / FUERTE, en `localStorage`.
- **HUD propio**: doce íconos y el título generados con Rezona, horneados a **máscaras PNG de
  63 kB en total, adentro del HTML**. Menú con título, JUGAR, AJUSTES y CÓMO SE JUEGA; joystick
  con aro y pulgar propios; botones de linterna, correr, VHS, pantalla y ajustes; contador con
  ícono que cambia de reliquia a nota; y un ojo que se enciende cuando algo te mira.

**Lo que costó una vuelta:**

1. **El CSS enmascara por el CANAL ALFA, no por la luminancia.** Guardé los íconos como PNG en
   gris (un tercio del peso) y salieron todos como cuadrados llenos. Van en gris+alfa: el gris
   constante en blanco comprime a casi nada y la silueta va en el alfa. 345 kB → 63 kB.
2. **`io.open(p,'w').write(expr)` me dejó el banco en cero bytes** — el mismo defecto que está
   escrito en el manual, cometido igual: un `NameError` adentro del argumento. Se recuperó de
   `origin` porque estaba pusheado. El texto se calcula entero y recién después se abre.
3. **La interfaz no puede depender de una descarga**: los íconos van embebidos, las texturas y el
   GLB por CDN.

**Sin resolver:** quedan 595 mallas sueltas fuera de las casas (faroles, carteles, cercos) sin
fundir, el menú no se puede volver a abrir una vez que entrás (sólo el ⚙), y la escala del ciclo
de marcha del bicho sigue sin medirse contra el patinaje de los pies.

### 2026-09-16 — texturas de foto y el monstruo riggeado

**Pedido textual:** «mejores el juego vhs a full con nuevas texturas etc hechos con IA de Rezona y
modelos 3D de monstruos riggeados de verdad etc y mejores animaciones y visuales».

Qué se hizo y **por qué esa decisión y no la otra**:

- **Los assets NO van en base64 adentro del HTML.** Un GLB riggeado son 1,3 MB y en base64 suma un
  33 % más; el archivo dejaría de poder parchearse. Van en `assets/` y el juego los pide a jsDelivr
  por **SHA de commit**, no por rama: la rama lleva barra (`claude/…`) y jsDelivr corta el nombre
  de versión en la primera barra. **Cada lote de assets nuevos obliga a tocar `CDN_IA`.**
- **La UV se proyecta desde la posición de mundo** en lugar de ajustar `map.repeat`. Todas las
  cajas del pueblo comparten UNA geometría unitaria escalada por instancia: con UV 0..1 por cara y
  un material compartido, ninguna repetición global puede ser correcta para todas. Con la
  proyección, los metros por baldosa son los que cubre la foto y vale para todo el pueblo.
- **El normal se deriva de la propia foto** (Sobel sobre luminancia, 512²) en vez de pedir un
  segundo mapa: son 0 bytes de descarga y el suelo dejó de leerse plano.
- **Los 16 huesos de torsión se colapsan a su padre**: 41 huesos son 164 vectores de uniform de
  vértice y WebGL1 garantiza 128. Quedaron 25. En este banco `isWebGL2` da true y habría andado
  igual — se poda por los teléfonos donde no.

**Números medidos** (412×892, el A/B en el mismo binario con `CDN_IA` dada vuelta):

| | procedural | con IA |
|---|---|---|
| brillo medio del cuadro | 63,56 | 61,91 |
| llamadas de dibujo | 1808 | 1808 |
| triángulos | 12,02 M | 11,97 M |
| errores de página | 0 | 0 |

Rig: 25 huesos, 5.830 triángulos, clips walk/run/idle; desplazamiento real de vértices hasta
**0,43** sobre una altura de 1,0 en el ciclo de correr. GLB 1,81 MB → **1,29 MB**.

**Lo que costó una vuelta, para no repetirlo:**

1. **`camera.position` es LOCAL.** La cámara cuelga de la cabeza del jugador, así que su
   `.position` es (0,0,0) y plantar al bicho «delante de la cámara» con eso lo dejaba a 20 m,
   del tamaño de una mota. Va `camera.getWorldPosition()`.
2. **`material.program` es la prueba de que un objeto se dibujó.** Con `program:false` el objeto
   no entró nunca a la lista de dibujo, y eso contesta en un cuadro lo que una foto no contesta.
3. **El títere se repintaba solo**: `for(const m of P.cuerpo)m.visible=!soloOjos` corre cada
   cuadro y volvía a encender los cilindros que el GLB acababa de reemplazar.
4. **Un `bufferView` viejo que ya nadie mira se queda adentro del GLB**: achicar las texturas sin
   compactar el binario dejó el archivo MÁS grande (1,81 → 2,01 MB).
5. **El banco reescribe el HTML antes de escribirlo**: una sustitución agregada después del
   `write` no existe. El GLTFLoader local no cargaba por eso.

**Sin resolver:** el cielo sigue sin iluminar (no hay `scene.environment`), las 1.808 llamadas de
dibujo y los 12 M de triángulos por cuadro no se tocaron, y la escala del ciclo de marcha
(`VEL_CAMINA`/`VEL_CORRE`) está puesta a ojo: falta medir el patinaje de los pies.

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
