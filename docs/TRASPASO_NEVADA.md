# NEVADA (Madness Combat 3D) — traspaso completo de la sesión «chamaco»

Para pasarle a otra sesión de Claude Code que tenga que seguir **Arena Nevada** (el juego 3D estilo *Madness Combat*) o
sacarle más ropa del SWF. Está escrito para que no haga falta preguntar nada de lo que ya se sabe.

| dato | valor |
|---|---|
| Repo / rama de trabajo | `Juniorspro/Theclaudianos`, rama **`ccr-29311d97-jmb0eu`** (nunca otra; sin PR si no lo piden) |
| Último commit del juego | `06710f8` (chaleco armor3 + tienda completa + armadura) |
| El juego | `juegos-pc/ArenaNevada.html` (7,09 MB, un solo HTML), se arma con `python3 nevada/armar.py` desde `nevada/` |
| Cuándo | la sesión corrió el 29/09 y el 30/09 de 2026; este documento es del 04/10 |
| Estado | **EN PAUSA por pedido**: «no seguiremos trabajando en el juego hasta nuevo aviso». No toques el juego hasta que quien pide lo diga |
| Dónde se prueba | **en el celular, en vertical (412×892)**, con el marco girado 90° |

---

## 0. Si leés solo esto

1. **El SWF no está en git.** Todo el método parte de `crudo/swf/mpn.swf` (*Madness_Project_Nexus_Classic.swf*, 15,6 MB, AS2,
   30 fps). `crudo/` está en `.gitignore` y el contenedor es efímero. Si `crudo/swf/mpn.swf` no existe, **pedíselo a quien pide**
   (lo subió como adjunto el 29/09) y copialo ahí. Sin el SWF no hay referencias, ni baldosas, ni mediciones.
2. **El trabajo de ropa es 3D «con volumen», no dibujos pegados.** De cada prenda del SWF sale una referencia (se dibuja sin
   Ruffle con un conversor propio SWF → SVG → PNG), se **mide** en esa imagen, y la prenda se arma en geometría (mallas), con su
   **tinta** (el contorno negro) pensada aparte. Lo que más cuesta —y de lo que más se queja quien pide— son los **trazos de
   tinta**: rayas sueltas, líneas dobles, siluetas cortadas o deformes. Para eso hay un método y un detector (§ 7 y § 8).
3. **Quien pide mira de MUY cerca** y ve lo que un número grueso no ve. «Anda» sin un número al lado no vale. Cada vuelta se
   cierra con el HTML adjunto y los bancos en 0 errores.
4. **Reglas duras** (detalle en § 1): nunca `AskUserQuestion` (se buguea en el celular: preguntá en texto plano); commit y push
   **solo** a `ccr-29311d97-jmb0eu`; ningún identificador de modelo en nada que se pushee; castellano rioplatense; adjuntar el
   HTML al cerrar; si el modo auto frena algo, no buscar otro camino: decirlo y que decida quien pide.
5. **Lo hecho** (§ 12): 33 prendas modeladas en 3D (12 cascos, 12 máscaras/lentes, 5 bocas, 1 chaleco y 3 trajes de agente),
   todas en la tienda con su baldosa del SWF, y el **sistema de armadura** del SWF andando (resta daño antes de todo, pide la
   ventaja por peso, la perforación atraviesa lo liviano).
6. **Lo que falta** (§ 16): chalecos armor1, 2, 4, 5 y 6 (el catálogo los tiene; `Prendas.modelada` los esconde de la tienda),
   remodelar los trajes de los enemigos (el detector mide defectos reales en el Mk1) y una astilla fina de tinta bajo el borde
   de abajo del chaleco vista desde arriba.

---

## 1. Quién pide y cómo se trabaja con esa persona

**Perfil** (de `memoria/INDICE.md` y de la sesión):
- Juega **en el celular**, en vertical. Escribe en castellano rioplatense, en frases cortas, a veces con varias cosas juntas:
  conviene listarlas y contestarlas **una por una** (el 30/09 pidió cuatro cosas juntas: una pregunta, los chalecos, los atuendos de enemigos y la tienda).
- Quiere **números medidos**, no promesas, y **el archivo adjunto en cada vuelta** (el HTML armado).
- Trato: **neutro** («quien pide»); no adivines género ni pronombres.

**Reglas que no se discuten** (la lista oficial está en `memoria/INDICE.md`; acá, con el porqué):

| regla | porqué / cómo se aplica |
|---|---|
| Nunca cuadros de `AskUserQuestion` | se buguea en el celular. Preguntá en texto plano, corto, o elegí un default razonable y decilo |
| Commit y push **solo** a la rama indicada (`ccr-29311d97-jmb0eu`); **sin PR** si no lo piden | el contenedor se revierte solo; lo pusheado es lo único que sobrevive. Push seguido |
| El identificador del modelo no va en nada que se pushee | ni en código, ni en notas, ni en este tipo de documentos |
| **Verificar midiendo** antes de afirmar que algo funciona | siempre un número al lado: píxeles, centímetros, triángulos, errores |
| **Adjuntar el HTML armado** al cerrar cada vuelta, sin que lo pida | `SendUserFile` con `juegos-pc/ArenaNevada.html` |
| Ahorrar tokens | nada de barridos exploratorios; `grep` antes que `Read`; leer `memoria/INDICE.md` y solo la nota que la tarea pida |
| Castellano rioplatense | también en commits y notas |
| **Rezona**: todo en **un** proyecto descartable; `publish_to_rezona_app` jamás sin pedido explícito | ver `memoria/rezona.md` |
| Si el modo auto frena algo, **no se busca otro camino**: se dice y decide quien pide (el OK en el chat no lo destraba) | el 29/09 frenó instalar *Neko PC* («escape de contención») y `npx rezona@latest login`; el login se destrabó solo cuando quien pide pasó el modo a *Accept edits* desde la app |
| Nada de secretos, tokens ni datos personales en la memoria ni en el repo | ni claves de Rezona ni correos |
| Al terminar cada tarea: anotar lo aprendido en `memoria/` y pushear | método en `docs/MEMORIA.md` (índice corto + una nota por tema + `diario.md`) |

**Qué le molesta (historial real de la sesión)** — conviene saberlo antes de empezar:
- «Trazos de tinta como flotando o despegados»: el ejemplo fue la cinta de arriba de la cabeza (la vincha), después el sombrero
  mexicano, los auriculares («la silueta de abajo se ve desconectada»), el Blast Helm, el primer chaleco. **Esos detalles
  minúsculos importan: dejan sucio el modelo.**
- Cosas «horribles» o «estrechas» vistas de cerca: las bocas (la venda de bandido), la máscara de Tricky (mandó una vista de
  frente real para que se corrigiera), el cuadrado gris claro de la SWAT Cap («muy poco ancho comparado con el SWF», después «sin
  línea de silueta»).
- **Tocar la pieza equivocada**: para arreglar el Blast Helm se cambió el borde del casco *compartido* con el Soldier Helm y
  quien pide se molestó y pidió revertir. **Antes de tocar una pieza compartida (`casco`, `lamina`, `casquete`…), confirmá de
  qué prenda habla quien pide** y mirá quién más la usa (`grep`).
- Que se «repita el mismo trabajo» en TODO lo del mismo tipo, no en uno solo: cuando se rehicieron 6 máscaras bien, pidió lo
  mismo para **todos** los accesorios de cabeza, «cada uno por separado, en alta resolución y bien cerca».
- Prefiere que se frene lo que no pidió: el 30/09 cortó la remodelación («deja el chaleco así como está, no seguiremos haciendo
  más atuendos ni remodelando por ahora») y pidió cerrar la tienda y el HTML.

**Cómo cerrar una vuelta** (formato que funcionó): una lista corta de lo hecho **con un número por cada cosa**, lo que quedó sin
hacer, y el HTML adjunto. Si algo de lo que se dijo antes resulta impreciso, **corregirlo en voz alta** (en este mismo cierre
hay un caso: § 12.4).

---

## 2. Línea de tiempo de la sesión (hora UTC aproximada, de los mensajes)

| cuándo | pedido de quien pide | qué salió |
|---|---|---|
| 29/09 13:10 | Se llama «chamaco». Mejorar Nevada. Adjuntó `arena-nevada-4.html` (7,29 MB), el log de la sesión anterior (`sesion_madness_completa_2.md`), `MEMORIA.md`, `GUIA_JUEGOS_2D_PIXEL.md`, `GUIA-JUEGOS.md`; pidió instalar *Neko PC* y pasar la clave de Rezona | `memoria/` armada; Nevada entra al repo (`866a6cc`: fuentes en `nevada/`, armado idéntico byte a byte); Neko frenado por el modo auto; Rezona logueado (`0f753f2`, `9ba2faa`) |
| 29/09 13:45 | Subió el SWF. «Revisá la animación de correr y moverse, adaptala a 3D, fluida y que no se vea fea al subir la velocidad (perks)» | Lector de SWF en Python puro; `marcha.py` → `marcha_swf.js`; locomoción nueva en `anim.js` (`3e54f3b`). Feedback: «los pies se ven muy alejados del cuerpo» → ajustado |
| 29/09 14:49 | «Fijate en los accesorios, cosméticos y ropas de la Shop; agregá las máscaras, gafas y atuendos de los enemigos con sus íconos del juego» | Conversor SWF → SVG → PNG; baldosas; ropa en la tienda (`8fbc493`); banco `tienda.js` |
| 29/09 15:18 | «Probé la marcha, me gusta, pero **patina**». Más cosméticos del SWF en 3D («no lo tomes como un dibujo en 2D»). Agregar el **sistema de armadura** | Bota clavada en el suelo (`3e4e6b0`); armadura + doce sombreros (`551671b`) |
| 29/09 16:02 → 18:25 | «Trazos de tinta flotando» (vincha), sombrero mexicano, auriculares; bocas «horribles», Tricky «estrecha» | Bocas, pasamontañas, barbijo, respirador y Tricky rehechos (`59ed9c9`); método de `lamina` con borde que apoya vs. suelto |
| 29/09 19:12 → 19:58 | Vista de frente de Tricky; **«repetí el mismo trabajo para todo lo que va en la cabeza»**; SWAT Cap (cuadrado gris claro) | Barrido de todos los accesorios de cabeza (§ 7); auriculares (`90239b1`) |
| 29/09 20:30 → 21:31 | Auriculares sucios; visor del Blast Helm **en V**; revertir el cambio equivocado del casco; siluetas incompletas del Blast Helm | Cascos (`d8b2335`), Blast Helm limpio (`9a9f21c`) |
| 29/09 22:00 → 30/09 01:40 | Tandas de capturas con marcas sobre la imagen | Los 7 anteojos rehechos de su hoja, medidos y des-proyectados (`77c3147`); Agent Shades (`f37e712`); ATP Mask de geometría (`701321f`) |
| 30/09 01:51 | «¿Hiciste con los lentes **negros** de los agentes lo mismo que con los rojos? Seguí con **chalecos** y **atuendos de enemigos**, y después actualizá la **tienda**» | Respuesta: sí (misma geometría, solo cambia el vidrio, negro macizo). Chaleco armor3 |
| 30/09 02:04 → 02:09 | «Sigo viendo trazos o deformidades… el primer chaleco, silueta incompleta o deforme» | Se escribió el **detector de trazos** (`trazos.js`) y se rehízo el chaleco medido contra el SVG |
| 30/09 03:14 | «Dejá el chaleco así, no sigas con más atuendos ni remodelando. Agregá todo a la Shop con el sistema de armadura, pasame el HTML y **no seguimos con el juego hasta nuevo aviso**» | 33 baldosas, armadura integrada y probada, bancos en 0 errores, memoria, `06710f8`, HTML adjunto |
| 04/10 01:50 | Este documento | `docs/TRASPASO_NEVADA.md` |

La conversación se compactó varias veces (contexto lleno): lo que no estaba en `memoria/` se habría perdido. **Anotá lo
aprendido en `memoria/` temprano**, no al final.

Commits de la sesión, de abajo hacia arriba (`git log --oneline`):
`866a6cc` Nevada entra al repo · `c34c9ab` banco · `3e54f3b` marcha · `a6fd04e` memoria de la marcha · `8fbc493` ropa en la Shop ·
`3e4e6b0` bota clavada · `551671b` armadura + sombreros · `59ed9c9` bocas/Tricky · `90239b1` auriculares · `d8b2335` cascos ·
`9a9f21c` Blast Helm · `77c3147` anteojos · `f37e712` Agent Shades · `701321f` ATP Mask · `06710f8` chaleco + tienda.

---

## 3. El entorno (lo que hay y lo que no)

- Contenedor Linux efímero, cloud. Directorio de trabajo `/home/user/Theclaudianos`. Lo no pusheado **se pierde**.
- **Node 22 + Playwright 1.56.1** (en `/opt/node22/lib/node_modules/playwright`; `require('playwright')` falla y se cae a esa ruta).
  **Chromium** en `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. No se baja nada (`playwright install` no hace falta).
- **No hay PIL ni Python-Playwright** (`correr.py` y `ver_glb.py`, que los usan, no andan sin instalarlos; son del Bosque). Todo el
  procesamiento de imágenes de Nevada se hace **en el Chromium** con `<canvas>` (los `.js` de `herramientas/banco/` y `swf/`).
- **No hay Ruffle**: por eso existe el conversor SWF → SVG (§ 4).
- WebGL por **swiftshader** (software). Banderas que usan todos los bancos:
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --no-sandbox`. Los cuadros por
  segundo de acá **no dicen nada** de un teléfono: sirven errores, llamadas de dibujo, triángulos, capturas y mediciones de píxeles.
- El navegador no sale a internet pero `curl` sí (relevante para el Bosque, no para Nevada: Nevada **abre sin red**, Three.js r160
  y cannon-es 0.20.0 van embebidos).
- Sintaxis de un `.js` antes de armar: `node --check nevada/js/ropa.js` (no hay `acorn`).
- Pantalla de prueba: **412×892, DPR 2, `isMobile`, `hasTouch`**. El juego gira `#escenario` 90° en vertical, así que las
  capturas de pantalla **salen giradas**; los bancos las enderezan con CSS (`rotate(-90deg)`). Las capturas de `zoom_prendas.js`
  y `trazos.js` **no** están giradas (render propio con cámara propia).
- Nevada cuelga todo de `window` (`Game`, `Chars`, `Prendas`, `Ropa`, `Accesorios`, `Tienda`, `Actor`, `Art`, `U`…). Deja
  `__ir(destino)` para saltar de pantalla (`__ir('nueva')` arranca una partida) y `Game.tiempo` (reloj del juego); `Game.pausa = true`
  congela. Los botones responden a `touchstart` (el camino de `click` se saltea con `ontouchstart`).
- Carpeta temporal de la sesión (efímera, **no** está en el repo): `/tmp/claude-0/-home-user-Theclaudianos/<id>/scratchpad/`.
  Ahí vivieron los scripts de § 9; sus fuentes completas están en el **Apéndice A**.

---

## 4. El SWF y cómo se lee sin Ruffle

Fuente: `herramientas/swf/` (`swf.py`, `svg.py`, `rasterizar.js`, `imagen.js`, `as2.py`, `marcha.py`, `iconos_ropa.py`), nota
`memoria/swf.md`.

**Qué es**: *Madness Project Nexus (Classic)*, Flash AS2, 15,6 MB, CWS v10, 30 fps. Lo sube quien pide; va a `crudo/swf/mpn.swf`.

**El lector** (`swf.py`, Python puro con `zlib`/`lzma`):
```bash
python3 herramientas/swf/swf.py crudo/swf/mpn.swf            # resumen
python3 herramientas/swf/swf.py crudo/swf/mpn.swf 5628       # rótulos de un sprite
python3 herramientas/swf/swf.py crudo/swf/mpn.swf 5628 walk  # sus cuadros en un rótulo
```
Desde Python: `from swf import SWF; s = SWF(ruta); cuadros, rotulos = s.linea(id)`. `cuadros[n]` es un dict
`profundidad → {id, m (matriz a,b,c,d,tx,ty), nombre, ratio, ...}`; `rotulos` es `{'hat1': 22, ...}` (rótulo → cuadro).
En el módulo: `pools(s)` y `acciones(s, id_initclip)` desarman el ActionScript (los usa `as2.py`), y `etiquetas`, `cadena`, `matriz`, `rect` son los lectores de bajo nivel.

**El conversor a dibujo** (`svg.py` → `rasterizar.js` → `imagen.js`):
- `documento(s, id_sprite, cuadro, fuera, caja=None, hijos=None)` devuelve un SVG. `cuadro` es un número o el diccionario de rótulos
  indexado (`rot['civ']`). `fuera` es el conjunto de **nombres de instancia** a no dibujar (p. ej. `{'myMask','myMouth'}`).
  `hijos={'myHat': (1602, cuadro_del_sombrero)}` hace lo que el código del SWF con `gotoAndStop`: pone ese símbolo, en ese
  cuadro, dentro de esa instancia (opcional una matriz como tercer elemento).
- Lee `DefineShape` 1–4 (rellenos lisos, degradados lineales y radiales, líneas); cada borde va al relleno de su derecha tal cual
  y al de su izquierda dado vuelta. Compone sprites con matriz, color y recortes. **No hace** bitmaps, textos, filtros ni modos de
  fusión. Un `<clipPath>` no admite `<g>`: el recorte va con caminos sueltos y la matriz compuesta.
- `rasterizar.js` (Chromium) toma un JSON `[{svg, png, escala, caja:[x0,y0,x1,y1]}, ...]` y escribe PNG transparentes; sin `caja`
  recorta a lo dibujado. `imagen.js` mide lo opaco, compone capas y pasa a webp.
- Validado: el fondo de baldosa sale igual al de Ruffle (252×328 px; píxel = 3·px + 6).

**El descompilador de AS2** (`as2.py`): `python3 herramientas/swf/as2.py crudo/swf/mpn.swf 8392 > crudo/as2/MadnessCharacter.txt`
(o por nombre de clase). Los saltos quedan como `goto Lnnn`. Alcanza para leer reglas: daño (`checkDamage`), armadura
(`refreshArmor`), perks. `ItemGenerator.createArmor` está en el *initclip* 8402 (~105 prendas con `myName`, `myCat`, `myArmor`,
`myWeight`, `myPrice`).

**IDs del SWF que se usaron** (símbolo → qué es → cuadros/rótulos útiles):

| id | qué es | rótulos relevantes |
|---|---|---|
| 5628 | `madness_character` (el muñeco; estados idle 5317, run 5349, backtrack 5350, dash 5352, run_turn 5351) | piezas por profundidad: 1 y 3 botas, 5/7 manos de atrás, 9 `myBody`, 13 `myHead`, 17/19 manos de adelante. **Mira a la derecha** |
| 2708 | `Parts - Head` (la cabeza, con `myHat`, `myMask`, `myMouth`) | `civ`, `agent`, `agent2`, `agent3`, `mag`, `tricky`, `zombie*`, `agent_classic`… |
| 1602 | sombreros **en la cabeza** (el que va dentro de `myHat` de 2708) | `hat1…hat9`, `top`, `fedora`, `headphones`, `helmet1…6`, `hair*`, `jonas*` |
| 1498 | máscaras en la cabeza (dentro de `myMask`) | `shades1…13`, `goggles1/2`, `paintball1/2`, `tricky`, `agent1_mask`, `agent1_mask_b`, `agent2_mask_R/_L`, `agent3_mask_R/_L`, `hi1…8` |
| 1425 | bocas en la cabeza (dentro de `myMouth`) | `mouth1…10`, `mask1/2`, `chin1`, `beard1…4` (los mismos de 7318) |
| 7289 | `Parts - Body` (los cuerpos: 64 cuadros) | rótulos `civ`, `sanford`, `deimos`, `hank`, `swain`, `krinkels`, `blockhead`, `jesus`, `tricky`, `agent`, `agent2`, `agent3`…; capas `myBackup` (arma a la espalda), `bodySprite`, `myShirt` (ropa encima), `teamColor` (brazalete verde) |
| 7295 | `Outfit - Body - Core` (los chalecos, `myShirt`) | `armor1…14`, `armorgolem*`, `coat1-3`, `poncho`… |
| 7363 / 7358 / 7318 | `HatsAll` / `MasksAll` / `MouthsAll` (**para las baldosas de la tienda**) | los mismos rótulos de ropa |
| 8254 | `madness_item_portrait`: la baldosa de la tienda | cuadros `guns`, `hat`, `mask`, `mouth`, `shirt`, `none`; capa 3 (8226) es un recorte |
| 8392 / 8402 | clase `MadnessCharacter` / initclip de `ItemGenerator` | AS2 |

Ojo: **cada categoría tiene dos símbolos**: el de la cabeza/cuerpo (1602, 1498, 1425, 7289/7295) y el «All» de la tienda
(7363, 7358, 7318, 7295). Para **mirar cómo queda en la cabeza** (referencia de modelado) se usa el de la cabeza; para la
**baldosa** se usa el del retrato (8254) con el «All».

**Escalas medidas** (clave para pasar de píxeles de la hoja a metros del muñeco):
- Cuerpos (`Parts - Body`): **1 px del SWF = 16,39 mm** (`K = 0,214 / 13,06 m` por px); el trazo del SWF (1 px de su escala) = **1,64 cm**
  en el muñeco (`TR = 0,0164` en `ropa.js`). Referencias a escala 12 (`civ_armorN.png`), caja `(-34, -44, 34, 40)`.
- Cabezas: **todo trazo de la hoja mide 22 px = 1,9 cm** (a escala 22 de rasterizado), igual al contorno de la cabeza del juego.
  Las hojas están a **0,854 mm/px** (la elipse de la cabeza da b = 467 px ↔ 0,399 m).
- **La hoja de la cabeza es una cámara ortográfica a −38,6°**; el cuerpo del SWF está dibujado **de perfil** (se compara con la
  cámara del juego a **−90°**). La hoja **exagera el lado de lejos**: se calza el lado de cerca y se espeja.
- Nuestra cruz (la cara) está 2,6 cm más arriba en la cabeza que la del SWF: **todo va relativo a la cruz**.
- Paleta: los grises del SWF pasan al juego `gris(v) = v ≤ 153 ? v·0,77 : 118 + (v−153)·1,245` (el peto del civ: 153 → 118; la
  piel: 204 → 182; el blanco: 255 → 245). Helpers `sw(v)` y `swc(r,g,b)` en `prendas3d.js`. El traje de agente: 51 → 39.

**Generar las hojas de referencia** (el script exacto de la sesión está en el Apéndice A.1; lo esencial):
```python
from swf import SWF; from svg import documento
s = SWF('crudo/swf/mpn.swf')
_, rh = s.linea(2708)                     # la cabeza
ha = s.linea(1602)[1]; ma = s.linea(1498)[1]
svg = documento(s, 2708, rh['civ'], {'myMask','myMouth'}, hijos={'myHat': (1602, ha['hat1'])})   # SWAT Cap
```
Después `rasterizar.js` a escala 10 (vista general) y a **escala 22** (`*_g.png`, para medir). Para los cuerpos con chaleco:
`hijos={'myShirt': (7295, ro['armor3'])}` sobre `documento(s, 7289, rc['civ'], ...)` (Apéndice A.2).

---

## 5. Arquitectura de Nevada (lo que hay que saber para tocar ropa)

**Armado**: `python3 nevada/armar.py` junta `nevada/plantilla.html` con cada `{{ruta}}` → `juegos-pc/ArenaNevada.html`
(`MB` en la salida). 46 scripts en el orden de la plantilla; **el orden importa** (cada uno cuelga su módulo de `window`).
`js/*_swf.js` y `css/*_swf.css` son **generados con base64** y no se editan a mano (`.gitattributes` los saca de `git diff`).
`audio/` lleva los mp3 en base64. `nevada/vendor/` trae three y cannon.

**Módulos que importan para la ropa** (`nevada/js/`):

| módulo | tamaño | qué tiene |
|---|---|---|
| `prendas.js` | 11 kB | **El catálogo** (`Prendas.CAT`): id → nombre, cat, armor, peso, precio, bajada. `Prendas.armadura(at)`, `Prendas.modelada(id)`, `Prendas.cargaEnemigo(swf, L, rng)` (qué le toca a cada enemigo según su nivel), `PERK_PESO`, `DESC` |
| `accesorios.js` | 40 kB | Las **herramientas de geometría para lo que va en la cabeza** (`banda`, `barrido`, `barridoTinta`, `loft`, `prisma`, `cascara`, `cara`…, exportadas como `Accesorios._h`), el OBSV Goggles, `Accesorios.MODELOS`, `construir`, `ADELANTO`, `CUBRE`, `NOMBRES` |
| `prendas3d.js` | 180 kB | Las **prendas de la cabeza**: `casquete`, `torno`, `visera`, `lamina`, `losa`, `tubo3`, `caja`, `hebilla`, `mancha`, `trazo`, `panuelo`, `lentes()`, y un `MOD.<id>` por prenda; y los `CUBRE.<id>` (qué parte del contorno del óvalo tapa cada prenda) |
| `ropa.js` | 59 kB | **El torso**: la superficie exacta (`sup`, `supL`, `marco`, `metrica`, `avanzar`…), `correa`, `pieza`, `aro`, `almohada`, los trajes de agente (`traje`), y los **chalecos** (`placaL`, `hebilla`, `correaAtras`, `solapa`, `CHALECOS`) |
| `chars.js` | 73 kB | `Chars.TIPOS`, `Chars.vestido(base, atuendo)`, `cuerpo()` (arma el muñeco en dos pasadas), `geoDe(tipo)` (las mallas cacheadas), `Chars.crear(tipo)` |
| `art.js` | 112 kB | Materiales, la **tinta** (`Art.mats.contornoPiel`), las rampas de profundidad (`CAPA`, `NUCA`, `PIES`), `matFicha`/`tonoFicha` |
| `actor.js` | 126 kB | `Actor.crear`, `Actor.vestir`, `Actor.danoSWF` (daño con armadura), `Actor.golpear` |
| `tienda.js` | 45 kB | La pantalla de la tienda (armas y ropa) |
| `progreso.js` | 16 kB | `Progreso.ficha` (incluye `ficha.ropa = {tiene, traje, shirt, mask, hat, mouth}`), `Progreso.atuendo()`, perks |
| `ropa_swf.js` | 249 kB | **Generado**: las 33 baldosas webp en base64 (`ROPA_SWF.baldosa[id]`) |
| `anim.js`, `marcha_swf.js` | 119 kB / 4 kB | Animación; la marcha del SWF (§ 15) |

**Cómo se viste un muñeco**:
1. `Prendas.CAT[id]` dice a qué **ranura** va (`cat`: `traje`, `shirt`, `mask`, `hat`, `mouth`). Las ranuras del muñeco tienen
   otro nombre en `Chars.TIPOS` (`Prendas.CAMPO`): `traje→ropa`, `shirt→camisa`, `mask→mascara`, `hat→sombrero`, `mouth→boca`.
2. `Chars.vestido(base, atuendo)` devuelve un **tipo nuevo por combinación** (`'grunt|agent2|armor3|agent1_mask|helmet1|mouth3'`;
   formato `base|traje|camisa|mascara|sombrero|boca`) y lo registra en `Chars.TIPOS` con la ficha del tipo base.
3. `Chars.geoDe(tipo)` (cacheada en `_geos`) corre `cuerpo()` **dos veces**: una para el **color** (`bc`, `silueta=false`, `g=0`) y
   otra para la **tinta** (`bs`, `silueta=true`, `g=0,016`). Además arma la malla de **vidrio** (translúcida), la de **manos** y la
   de accesorios con textura (ya no se usa).
4. `Actor.vestir(A, atuendo)` cambia el cuerpo del actor al tipo nuevo, recuelga arma y funda y **rehace `A.armadura`**.
5. En la tienda, `botonRopa(id)` compra / pone / saca, actualiza `Progreso.ficha.ropa` y llama a `Actor.vestir` + `HUD.retrato`.
6. Los enemigos: `Prendas.cargaEnemigo(swf, L, rng)` (`equipLoadout` del SWF) elige por nivel; lo que no está modelado
   (`Prendas.modelada(id) === false`) sale como «nada».

**Cada prenda es una función `(B, g, silueta)`**: `B` es el constructor de geometría (`U.builder`), `g` el grosor de tinta
(0 en color, 0,016 en tinta), `silueta` dice cuál de las dos pasadas es. **En la pasada de color pinta las caras; en la de tinta
emite el casco que se ve como contorno.** Una prenda de la cabeza se registra con `MOD.<id> = function (B, g, silueta) {…}` en
`prendas3d.js` (y su `CUBRE.<id>`); un chaleco, como `CHALECOS.<id> = { nombre, hacer(B, F, g, silueta) }` en `ropa.js`;
un traje, en `MODELOS` de `ropa.js`. `B.skin(hueso)` elige a qué hueso se atan las caras siguientes (`H.CABEZA`, `H.CUERPO`…).

**Armadura** (`prendas.js` + `actor.js`), tal cual `checkDamage` del SWF:
- cabeza = `armor` del sombrero + máscara + boca; cuerpo = `armor` de la camisa (chaleco);
- en cada impacto, **antes de cualquier multiplicador**: `d -= armadura` (cabeza o cuerpo según `info.cabeza`), y `if (d < 0) d = 0`;
- `perkArmorPierce` en el atacante atraviesa la armadura **salvo** que la pieza que manda (sombrero en la cabeza, camisa en el
  cuerpo) sea `heavy`;
- con `d = 0` el golpe **rebota**: sin vida, sangre, aturdimiento ni derribo; suena `rebote` (tiro) o `bloqueo` (cuerpo a cuerpo);
- para **ponerse** algo con peso hace falta la ventaja: `light → perkArmor1`, `med → perkArmor2`, `heavy → perkArmor3`
  (`Prendas.PERK_PESO`; salen de END 5/10/20). Sin ella se puede **comprar** pero no poner: el botón dice «REQUIERE ARMOR 1».
- el precio es `myPrice + myArmor × 100` (los trajes de agente, precio nuestro: $900 / $1.200 / $1.200).

---

## 6. LA TINTA: por qué las siluetas salen sucias y cómo evitarlo

Esto es el corazón del trabajo. Leelo entero antes de tocar una prenda. Fuente: comentarios largos de `art.js`
(`Art.mats.contorno*`, `ADELANTO_GLSL`) y de `chars.js` (`geoDe`).

**El contorno es un casco invertido** (*inverted hull*): la **misma geometría** de cada pieza, hinchada `g = 1,6 cm` por su
normal, dibujada **del revés** (`side: BackSide`), en negro, **después** del color (`renderOrder 2`), con
`depthWrite: true` (para que el vidrio translúcido, que va después, no pinte encima). Dentro de la silueta no puede aparecer
negro por construcción (la cara de atrás del casco queda detrás de la cara de adelante de su propia pieza): **solo sobrevive el
borde de afuera, que es el contorno**.

**Tres cosas del shader de la tinta** (`M.contornoPiel`, vértice por vértice, en el **color del vértice** de la malla de tinta):
- **R = grosor mínimo en pantalla**: cada vértice del casco se empuja una fracción fija del alto de la vista **hacia afuera, por su
  normal proyectada**, hasta `Art.TINTA_MIN_PX = 1,6` px (para que en un celular la línea no baje de ~2 px). Vale 1 en torso,
  cabeza y pies, `Chars.TINTA_MANO = 0,25` en manos. Lo calcula `Game.redimensionar` (uniform `Art.UNI_TINTA`).
- **G = capa** y **B = adelanto (m)**: se desplaza la profundidad del vértice hacia la cámara para resolver quién tapa a quién
  (la cabeza pasa por encima del torso, el torso por encima de los pies…). `Art.CAPA = 0,30` (torso hacia atrás al subir:
  rampa `smoothstep(0,25, 0,85, y)`), `Art.NUCA = 0,25` (de espaldas, la joroba pasa por encima de la nuca), `Art.PIES = 0,12`
  (el bajo del torso tapa el pie). Adelantos por pieza (`geoDe`): torso **0,12 m**, pies 0,06, cabeza **solo el óvalo 0,15 m** (0,01 el resto),
  máscaras con dibujo `Accesorios.ADELANTO = 0,18`, **prendas de cabeza 0,01**, **ropa del torso: la tinta 0 y el color
  `Ropa.ADELANTO = 0,12`** (el atributo `aAde`, con su rampa propia de 0,30 a 0,45 de altura).
- `derecho()` y `vistaCapa()`: nada de esto aplica a un cuerpo tumbado, y la capa se desvanece según hacia dónde mira el muñeco.

**Consecuencias que son reglas** (cada una pagó al menos una vuelta):

1. **Toda cara de tinta a menos de ~1–2 cm *detrás* de una cara de color se ve a través**, porque el adelanto de la tinta es de
   1 cm en las prendas de cabeza. Resultado: rayitas, puntos, líneas punteadas. Las caras de tinta tienen que quedar **≥ 1 cm
   detrás** de lo que las tapa (`tintaN`), o terminar en la franja negra de la otra pieza.
2. **Un borde que apoya sobre otra superficie no es silueta.** Su trazo va **pintado** (una franja negra en la grilla de color) y
   su canto **baja hundido** dentro de la superficie. Solo el borde *suelto* estira tinta. Si no: línea doble (una franja de
   piel/tela entre el borde y la tinta) o raya suelta a `g` del borde.
3. **La cabeza es una malla de 16×12**: entre vértices sus caras quedan hasta **1 cm dentro** del óvalo. Toda tinta a menos de
   ~2 cm dentro del óvalo asoma a rayitas: la cara de dentro de lo que toca la cabeza baja `HUNDE` (queda a 2,8 cm).
4. **El torso es un tubo de 12 lados** (`addTubo`, superelipse de potencia 2/3): sus caras quedan hasta **0,9 cm** por dentro
   de la superelipse lisa (medido). Lo que va pegado a la tela sigue las caras punto a punto (cada cm); lo **rígido** se apoya
   en la **cáscara lisa** (`supL`) o su borde sale quebrado en cada arista.
5. **El empuje en pantalla usa la normal de cada vértice.** Con caras planas sueltas, cada arista abre una grieta finísima y el
   contorno sale con hilos claros: la tinta va en **vértices compartidos con la normal promediada** (`barridoTinta`, `tubo3`, `caja`).
6. **Los triángulos astilla se dan vuelta con el empuje** y se dibujan como rayas finas de punta a punta. La triangulación de
   three (`earcut`) las deja. Se usa `triangular()` (puntos por dentro + Delaunay, `o.paso`) y tinta plana.
7. **Lo que apoya en otra pieza no estira tinta a lo largo de ella**, solo hacia afuera (`sobreCab`, `tintaEn = 0`).
8. **Una pieza que entra en otra** entra poco (**3 mm**): la tinta es 1,6 cm más el adelanto de 1 y, más adentro, asoma por la
   cara de enfrente.
9. **Cristales translúcidos** van en **otra malla** (`B.vidrio`), transparente, y se dibujan después de la tinta. En una textura
   sRGB la mezcla es lineal y sale más claro/rosado (medido 156,129,128 contra 149,77,76 en pantalla): `Chars.matVidrioLineal`
   para la ficha de la tienda; para mirar el color real, `CANVAS=1 zoom_prendas.js`.
10. **Esquinas vivas de una placa → pico de tinta** (la normal salta): esquinas redondas.
11. **Tela que cuelga** baja pegada hasta la **tangente** a su punto de abajo y sigue derecha (`panuelo`): sin quiebre no hay
    arruga que doble la tinta.
12. **El borde de abajo de algo apoyado en el torso es un pliegue, no una silueta.** Probado en el chaleco (§ 13): el casco
    hinchado para todos lados hace una cornisa a `g` del borde (línea doble vista de arriba/abajo); el bisel plano se pone de
    canto a ~16° y deja una rayita; un canto redondo con el pie a `g` del borde deja ver, casi de frente, solo el pie empinado
    (raya suelta). **Lo que anda**: tinta en **cuarto de elipse** (semiejes `r` y `r+g`, mismo centro) que termina en el **mismo
    pie** que el color.

---

## 7. El método de trabajo, paso a paso (como se hizo, vuelta tras vuelta)

Se aplicó 12+ veces (una por accesorio de cabeza), y con variantes para chalecos. **No saltear pasos.**

**Paso 0 — Entender el pedido y la pieza.** Mirar la captura que mandó quien pide (suele traer marcas); nombrar **la prenda
exacta**; `grep` para ver qué otras prendas comparten la función que vas a tocar. Si hay duda, confirmar en texto plano.

**Paso 1 — Sacar la referencia del SWF, de cerca.** Generar el SVG de la prenda sobre la cabeza/cuerpo del civ (§ 4), rasterizar a
escala 22 (cabezas) o 12 (cuerpos), y **mirar cada una por separado, en alta resolución** (abrir el PNG con `Read`). Una hoja
con todas juntas no sirve para ver los trazos.
   - `node herramientas/banco/recorte.js x0 y0 w h escala out.png a.png b.png …` ampliado, lado a lado, con el nombre.
   - Hoja de contacto con rótulos: `hojaref.js` (Apéndice A.3).

**Paso 2 — Medir en la referencia.** Con colores y trazos:
   - `node herramientas/banco/region.js img.png r,g,b tol x0 x1 y0 y1 paso` → por fila, `minX–maxX` de los píxeles de ese color
     (con `N` en vez de `r,g,b`: los negros). Así se lee **cada cristal, cada panel, cada franja**.
   - `node herramientas/banco/bordes.js img.png h|v pos [desde hasta]` → tramos de color a lo largo de una fila (`h`) o columna
     (`v`): `N` negro (<45), `.` transparente, y el gris de cada tramo con su largo en px. **Con esto se miden los anchos de
     trazo y de franja.** Ej. del chaleco: fila 420 → `241-252 N (12 px)`, `253-282 108`, `284-306 N (23 px)`, … → traducido a cm
     con la escala (12 px = 1 trazo = 1,64 cm).
   - `node herramientas/banco/pix.js img.png x,y x,y …` → color de puntos.
   - `desproy.py` (anteojos): des-proyecta el contorno de un cristal medido en la hoja al **plano de su lente** (que mira a su
     azimut): da el azimut del centro y los puntos `(u, v)` en metros.
   - Todo **relativo a la cruz** de la cara (cabeza) o a las filas del torso (`y = 0,146 + (870 − y_png)/732` para chalecos).

**Paso 3 — Modelar con volumen** (§ 10): elegir el helper que corresponda (¿sigue la cabeza? `casquete`; ¿gira sobre un eje?
`torno`; ¿es una tela con grosor? `lamina`; ¿una placa con agujeros? `losa`; ¿pieza rígida chica? `tubo3`/`caja`; ¿trazo
pintado? `mancha`/`trazo`). Pensar **las dos pasadas** (color y tinta) desde el principio: qué bordes apoyan (pintados), cuáles
son silueta (tinta), qué se tapa con qué (`CUBRE`).

**Paso 4 — Armar y comparar superpuesto.**
```bash
python3 nevada/armar.py
# nuestro, con los mismos parámetros que el SWF (casi sin perspectiva: FOV 10, distancia x3):
SINMANOS=1 FOV=10 S=1600 TW=400 CANVAS=1 node herramientas/banco/zoom_prendas.js armor3 shirt out/p90 "-90:0" 0.25 0.12 0.75 0.88 9.6 "" 0.64
# calzar sobre la hoja y mezclar al 50 %:
K=1.5372 DX=112.7 DY=41.4 node herramientas/banco/calza.js out/p90_armor3.png ref/civ_armor3.png out/k.png
```
`calza.js` imprime escala y desplazamiento y saca **tres paneles: nuestro calzado | hoja | mezcla 50 %**. Con anteojos:
`K=2.623` con `FOV=10`, `D=9.6` (a 3,2 m lo cercano sale 10 % más grande). Para el chaleco de perfil: `K=1,5372`, `DX=112,7`, `DY=41,4`
(valores válidos para `S=1600 TW=400 CANVAS=1`, ventana `0,25 0,12 0,75 0,88`, `y0 = 0,64`). Cuando la prenda tapa la cabeza el
ajuste de la elipse falla: por eso `DX/DY` fijos. `FLIP=1` espeja el nuestro (el otro lado contra la hoja `_L`).

**Paso 5 — Mirar de cerca, desde varios lados** (`zoom_prendas.js`, 6 vistas por defecto: `0:10,35:10,70:10,110:10,160:10,-60:30`;
`"az:el,..."` propio; recorte en fracciones del cuadro). A **alta resolución** (`S=3000 TW=700`) y recortando el borde en
cuestión. Con el **modo `sin`** (el argumento `modo` de `zoom_prendas.js`: `… 9.6 sin 0.64`) se esconde toda la tinta; con `difpng.js con.png sin.png dif.png`
se ve en **rojo la tinta de más** y en verde lo más claro.

**Paso 6 — Aislar el culpable de una raya.** La pregunta siempre es: ¿esto es color, es tinta, o es otra pieza?
   - `PRE="window.x=true" node zoom_prendas.js …`: corre código en la página **antes de vestir** (para apagar una pieza con un
     flag temporal; sacalo después: `grep -c "__sin\|_dbg" juegos-pc/ArenaNevada.html` tiene que dar 0).
   - Modo `sin`: si la raya desaparece, **era tinta asomando**.
   - **Tinta sola en rojo** (`casco_rojo.js`, Apéndice A.8): clona el material de tinta con `mat.color` rojo (multiplica el color
     de vértice) y descarta el color de la ropa donde `aAde > 0`. Así se ve qué tapa a qué.
   - **Sin manos**: `SINMANOS=1` pone en `1e-4` la escala de los huesos de las manos. (Esconder la malla de la mano **dejaba
     manchas de tinta**; la escala del hueso la saca limpia.)
   - Sin empuje en pantalla: `Art.UNI_TINTA.value = 0`.

**Paso 7 — El detector de trazos** (§ 8.9). Un número por vista: `suelta`, `despegada`, `hueco`, `fino`. Se mira primero el
total y después los **recortes marcados en rojo** (`<id>.png`), peores primero.

**Paso 8 — Bancos de regresión** (§ 8.1): `nevada.js` (la partida), `prendas.js` (las 33 prendas: triángulos y errores),
`tienda.js` (comprar, poner, sacar, recargar). Los tres tienen que dar **0 errores**.

**Paso 9 — Cerrar la vuelta.** `python3 nevada/armar.py`; anotar en `memoria/` (nota del tema + `diario.md`); commit (mensaje con lo
medido) y push a la rama; **adjuntar el HTML**; contestar con una lista corta de lo hecho con números.

---

## 8. Catálogo de herramientas del repo

Todo `herramientas/**` corre con **Node 22** (`node …`) o **Python 3** (`python3 …`), desde la raíz del repo, y deja salidas en
`crudo/` o en la carpeta que se le pase (fuera de git).

### 8.1 Bancos del juego (`herramientas/banco/`)
| herramienta | uso | qué hace / mide |
|---|---|---|
| `nevada.js` | `node herramientas/banco/nevada.js [html] [carpeta]` (`DPR=2 SEG=8 ANCHO=446`) | Abre el HTML como celular en vertical, saca fotos del menú y de la partida, una `hoja.png` enderezada y un JSON con **errores, pedidos afuera, llamadas, triángulos, geometrías, texturas, lienzo, reloj**. ~30 s. Medido 29/09: carga 3,4 s, **0 errores**, partida **77 llamadas, ~95 mil triángulos** (95.226 el 30/09), 68 geometrías, 29 texturas, lienzo 802×370 |
| `prendas.js` | `node herramientas/banco/prendas.js [ids\|cat] [html] [carpeta]` | Cada prenda en un grunt quieto, 4 lados + cámara de arena, `hoja_N.png` cada 8 prendas y un JSON `datos[id] = {tris, ms}` (triángulos y milisegundos de armar la malla), `errores`. Por defecto, toda la ropa **modelada** |
| `tienda.js` | `node herramientas/banco/tienda.js [html] [carpeta]` | Abre la tienda con plata (pisa `Tienda.paso`, que la cierra lejos del mostrador), recorre pestañas, **compra, pone, saca**, cierra, mira al jugador vestido de cerca y **recarga** para ver que la ropa vuelve puesta. JSON con cada paso |
| `marcha.js` | `node herramientas/banco/marcha.js` | Hace correr al jugador en línea recta a varias velocidades (DEX 0/15/30) y mide: pasos/s, cuánto sube la bota, **`patina`** (0 = clavada), **`penetra`** (cuánto entra la bota en el torso), **`separa`** |
| `zoom_prendas.js` | ver Paso 4–5 | Una prenda en un grunt quieto, **varias vistas ampliadas** a la resolución que se pida. Opciones: `S` (lado del render), `TW` (ancho de cada vista), `FOV`, `SINMANOS=1`, `CANVAS=1` (dibuja al canvas del juego: los cristales se mezclan como en pantalla), `PRE` (código antes de vestir), modo `sin` (sin tinta), `D` (distancia), `y0` (altura del blanco) |
| `trazos.js` | § 8.9 | El **detector de trazos** |

### 8.2 Herramientas de imagen (`herramientas/banco/`, Chromium + canvas)
| herramienta | uso | para qué |
|---|---|---|
| `region.js` | `region.js img.png r,g,b tol x0 x1 y0 y1 paso` (o `N`) | por fila, min/max X de los píxeles de ese color (leer un cristal, un panel, una franja) |
| `bordes.js` | `bordes.js img.png h\|v pos [desde hasta]` | tramos de color a lo largo de una fila o columna: **anchos de trazo** |
| `pix.js` | `pix.js img.png x,y x,y …` | color de puntos |
| `recorte.js` | `recorte.js x0 y0 w h escala out.png a.png b.png …` | el mismo recorte de cada imagen, ampliado y lado a lado |
| `junta3.js` | `junta3.js a.png b.png c.png out.png` | tres imágenes lado a lado |
| `difpng.js` | `difpng.js a.png b.png out.png` | diferencia: **rojo donde `a` es más oscura** (tinta de más), verde donde es más clara |
| `calza.js` | `K= DX= DY= FLIP= node calza.js nuestro.png hoja.png out.png [x0 y0 x1 y1]` | calza la cabeza de `nuestro` sobre la de la hoja (o con `K/DX/DY` fijos) y saca nuestro \| hoja \| mezcla 50 %; imprime escala y desplazamiento |
| `desproy.py` | `desproy.py "salida de region.js" [yCruz] [cx] [mmx] [mmy] [rL]` | des-proyecta el contorno de un cristal al plano de su lente |

### 8.3 SWF (`herramientas/swf/`)
`swf.py` (lector), `svg.py` (SWF → SVG), `rasterizar.js` (SVG → PNG), `imagen.js` (medir / componer / webp), `as2.py` (AS2 a pseudocódigo),
`marcha.py` (→ `nevada/js/marcha_swf.js`), `iconos_ropa.py` (→ `nevada/js/ropa_swf.js`). Ver § 4 y § 14.

### 8.4 Rezona y modelos (`herramientas/rezona/`, `ver_glb.py`, `ver_anim.py`, `correr.py`)
Son del **Bosque** (el otro juego, en pausa): generación y horneado de assets con *Rezona Lab* (`rz.py`, `hornear_*`, `podar_rig.py`…).
Nevada no los usa. Reglas largas en `.claude/skills/assets-ia` y `memoria/rezona.md`. `.claude/skills/` tiene tres skills
(`assets-ia`, `banco`, `graficos`): invocalas con `Skill` cuando la tarea las toque.

### 8.9 `trazos.js` — el detector de trazos (nuevo de esta sesión)
```bash
node herramientas/banco/trazos.js ids cat carpeta [vistas] [y0] [D]
#   ids: lista con comas; cat: hat | mask | mouth | shirt | traje
#   vistas "az:el,az:el" (por defecto 12 azimuts × elevaciones -10, 15 y 45 = 36 vistas); y0 = 1,33; D = 2,3
#   env: S=900 (lado del render) FOV=30 SINMANOS=1 R=14 (radio en px para buscar el contorno de una tinta) UMBRAL=0.015 (m)
# torso:  SINMANOS=1 node herramientas/banco/trazos.js armor3 shirt out "" 0.68 3.0
```
**Cómo funciona.** En cada vista hace **tres pasadas** por figura: **con tinta**, **sin tinta** y la **profundidad real** (con
`MeshDepthMaterial` y `RGBADepthPacking`, sin los adelantos del shader). La **tinta** es lo que oscurece la primera respecto de la
segunda. Los **saltos de profundidad** (más de `UMBRAL` = 1,5 cm entre píxeles vecinos) son los contornos de la geometría.
Compara cada vista contra el **muñeco pelado** (misma pose, hueso por hueso) y cuenta solo lo marcado **cerca de la prenda** y
que el pelado no marca ya.
- **`suelta`**: píxeles de tinta sin ningún contorno al lado: ni una superficie más cerca a menos del ancho de la línea ni un
  salto de profundidad (rayitas, puntos, cascos que asoman).
- **`despegada`**: tinta junto a un contorno pero separada de él por algo que **no es negro** (la **línea doble**: una franja de
  tela entre el borde y la tinta).
- **`hueco`**: borde de la silueta contra el fondo **sin tinta** (silueta cortada).
- **`fino`**: rasgos de 1–2 px distintos de sus dos vecinos (grietas, astillas, puntitos). **Orientativo**: un canto negro visto
  de refilón también mide 1–2 px.
Salida: `carpeta/<id>.json` (por vista) y `carpeta/<id>.png` (recortes de 120×120 marcados en rojo, los 3 peores grupos de
cada vista, con su etiqueta `az/el tipo n`). Un grupo de 1–2 px es ruido de rasterizado y no se cuenta.
**Variación entre corridas**: ~7 % (la respiración y el reloj mueven un píxel). Comparar siempre con el **mismo método**.
**Dos trampas del propio detector** (descubiertas el 04/10 al medir toda la ropa):
- `R` tiene que ser **mayor que el grosor aparente de la tinta**. Con `R=14` y `D=2,3` (cabezas) la tinta gruesa de un sombrero
  mide ~16–20 px y su parte de afuera salía como `suelta` sin serlo (decenas de miles de px falsos). Por eso el defecto pasó a
  `R=30`. En el torso (`D=3,0`, tinta de ~11 px) `R=14` alcanzaba, y esas son las cifras de § 12.4.
- El **vidrio translúcido cuenta en la pasada de profundidad** (antes no): su borde salía como `hueco`.

---

## 9. Herramientas de scratch (NO están en el repo; fuentes en el Apéndice A)

Se escribieron durante la sesión en la carpeta temporal. **Si las vas a usar de nuevo, copialas a `herramientas/` y commiteá.**

| script | qué hace | cuándo |
|---|---|---|
| `hojas_ref.py` (A.1) | Genera las hojas de referencia de **todos** los sombreros, máscaras y cabezas de agente sobre la cabeza del civ (SVG → PNG a escala 10 y 22) | al empezar a rehacer cualquier prenda de cabeza |
| `cuerpos.py` (A.2) | Genera `civ`, `civ_armor1…6`, `agent`, `agent2`, `agent3` (el cuerpo del SWF, de perfil, con cada chaleco) a escala 12 | al empezar chalecos o trajes |
| `hojaref.js` (A.3) | Hoja de contacto con rótulos de varias imágenes | para ver todas las referencias juntas |
| `fig.js` (A.4) | Captura la **figura de la tienda** (el lienzo `#tdFigura`) con cada prenda elegida, en hoja | comprobar cómo se ve la baldosa/figura de cada prenda |
| `combo.js` (A.5) | Hoja de **combinaciones** (filas) × vistas: p. ej. traje + chaleco | comprobar que dos prendas conviven |
| `armadura.js` (A.6) | Prueba de punta a punta de la **armadura**: comprar y poner con y sin ventaja, daño que entra al jugador y al enemigo, perforación | tras tocar `prendas.js`, `actor.js` o la tienda |
| `tienda_tabs.js` (A.7) | Capturas de cada pestaña de ropa de la tienda con una prenda elegida, y el botón tras comprar | chequeo visual de la tienda |
| `casco_rojo.js` (A.8) | La **tinta sola en rojo** (y opcionalmente el color de la ropa descartado, sin empuje) | aislar una raya |
| `gap.js` (A.9) | Mide cuánto quedan las caras del dodecágono del torso por dentro de la superelipse lisa (**0,85–0,91 cm**) | si se cambia el torso |

También hubo (sin guardar): `seccion.js` (volcaba, vía un gancho temporal `Ropa._dbg`, las coordenadas `(y, distancia a la cáscara,
distancia al torso)` de cada vértice del borde de la placa — así se vio que el pie de la tinta quedaba 1,5 cm por dentro de lo
esperado), `columnas.js` (como `bordes.js` pero por columnas y por color) y varios `zoom*.js` anteriores a `zoom_prendas.js`.

---

## 10. La biblioteca de geometría (cómo se arma cada tipo de pieza)

**Cabeza** (`prendas3d.js` y `accesorios.js`). Coordenadas: la cabeza es el óvalo `Chars.CARA` con centro `(0, CARA.y, CABEZA_Z)`; la
cara mira a **+z** y **+x es su izquierda**; `sobre(az, el, d, e)` da el punto del óvalo en (azimut, elevación) en grados, `d` metros
por fuera, `e < 1` lo hace superelipsoide (más cuadrado: cascos).

| helper | qué es | cuándo / trampa |
|---|---|---|
| `casquete(B, o, g, silueta)` | **lo que sigue la cabeza** a unos milímetros: malla sobre el óvalo entre dos líneas de elevación `o.lo(az)`, `o.hi(az)` y azimut `o.a0..a1`, distancia `o.d`, color `o.color(az,el)`, `o.trazo` (franja negra pintada del borde que apoya), `o.filasBorde`, `o.azDe`, `{diagCorta}` | gorras, cascos, vinchas, pañuelos, el pasamontañas. **La tinta no se estira por los bordes** (apoyan). **Grilla muy sesgada** → `diagCorta` (si no, triángulos astilla → puntitos de la tinta de atrás) |
| `torno(B, perfil, o, g, silueta)` | un perfil `[[r, y, hex],…]` **girado** alrededor de un eje vertical, con planta elíptica, inclinado y ala alabeada | galeras, bombines, alas. `p[3]` = cuánta tinta lleva cada punto (0 en los dos extremos = sin cáscara); `juntaAla` pinta la junta con la cabeza |
| `visera(B, o, g, silueta)` | la de las gorras: sale del borde de delante del casquete, afina a los costados, baja `caida` grados | SWAT Cap, Ballcap |
| `copa(B, o, g, silueta)` | copa por columnas: lo que no sigue la cabeza a distancia fija (gorra de tapa plana) | |
| `pieza(B, perfil, p, eje, hex, g, silueta, M)` | pieza de revolución chica en cualquier eje | botones, perillas, copas de auriculares |
| `lamina(B, P, o, g, silueta)` | **tela o goma con grosor** de una grilla `P[i][j]` (cerrada si `o.vuelta`): `o.gr`, `o.color(i,j)`, `o.tintaEn(i,j)`, `o.apoyo(i,j)` (si ese borde apoya en la cabeza), `o.normal(i,j)` (normal impuesta), `o.dentro` (cuánto se hunde el canto: 1,2 cm por defecto), `o.apoyoLado`, `sinTintaLado`, `sinCantoLado`, `sinHundir`, `tintaN` (placa fina suelta: 0,25–0,5) | **la herramienta principal para tela**: pañuelos, correas, cristales curvos, costados de la ATP. Lo suelto a 2–3 cm de la cabeza deja rayitas; lo que apoya va como lámina |
| `losa(B, O, Hs, w0, w1, mapa, col, gT, silueta, o)` | **placa plana con agujeros**: polígono `(u,v)` proyectado al plano; `o.lado(k)` (cuánta tinta lleva el tramo `k`), `o.sinCanto(k)`, `o.paso` | frente de la ATP, cristales. Usa `triangular()` (Delaunay) |
| `triangular(conts, paso)` | triangulación **con puntos por dentro + aristas dadas vuelta hasta Delaunay** | reemplaza a `earcut` en losas grandes |
| `hincharLados(P, dk)` / `ofsetear(P, d)` / `isoLinea(K, d, h)` | agrandar un polígono por tramos / **de verdad** (campo de distancias + marching squares + Douglas–Peucker, cacheado) | `hinchar` hace rulos en esquinas de dentro cuando `d` > los tramos |
| `tubo3(B, anillos, color, g, silueta, sobreCab)` | **tubo de anillos 3D** con vértices compartidos y normal de sus dos aristas; la tinta es el mismo anillo corrido `g` (inglete), tapas estiradas | brazos, hebillas redondas. `sobreCab` acepta `(p, r) => [normal, pega, m]` |
| `caja(B, c, E, h, hex, g, silueta, sobreCab)` | **caja orientada** (centro, ejes, medios); ocho vértices compartidos | hebillas y pasadores |
| `hebilla(B, p, t, n, largo, ancho, alto, hex, hexRanura, g, silueta)` | hebilla de correa de cabeza | Blast Helm, Tricky |
| `mancha(B, poly, donde, n, hex, huecos, conLuz)` | **trazo/mancha pintado** sobre una superficie (pliegues, costuras, paneles), con `huecos` y `conLuz` | todo lo que en el SWF es un trazo o un panel plano (los marcos de los lentes) |
| `trazo(B, pts, nrm, ancho, hex)` | cinta plana negra sin luz, con puntas redondas | |
| `cristal(B, P, w, mapa, hex, opac)` / `vidrioCurvo(…)` | cristal **translúcido** (malla `B.vidrio`) plano / curvo (grilla de columnas que sigue la superficie; poligonizado de una, la cuerda hundía 4 cm un cristal de 30 cm) | lentes, visores |
| `lentes(o)` | fábrica de anteojos rígidos delante de los ojos: marco (trazo de 1,9 cm), puente, patillas en cuña | `shades3/5/12`, `agent1_mask(_b)` |
| `panuelo(o)` | la fábrica de los pañuelos | `mouth3`, `mouth6` |
| `parche(B, az0, az1, v0, v1, off, yC, cortes, colorDe, g, silueta)` | parche pegado a la cabeza con grilla cortada en los bordes de sus franjas | hebillas, pasadores |
| `juntaAla`, `juntaPieza`, `rebordeCasco`, `pantallaV`, `remache` | juntas **medidas** (donde el perfil entra en el óvalo), reborde de cascos a distancia medida, pantalla en V del Blast Helm | |
| `Accesorios._h` | `banda`, `barrido`, `barridoTinta`, `loft`, `prisma`, `cara`, `cascara`, `losaCurva`, `tubo`, `punto`, `hinchar`, `centroCruz`, `cab`, `recortar`, `cristalDegrade`, `densificar` | `barridoTinta` = anillos 3D con vértices compartidos y normal que sale del centro del anillo |
| `CUBRE.<id>` | `(az, el, n) => bool`: **qué parte del contorno del óvalo tapa la prenda**; ahí la tinta del óvalo (adelantada 15 cm) no se adelanta | un `CUBRE` de más **adelgaza el contorno de la cara donde se ve**; uno de menos deja la tinta de la cara cruzando la prenda |

**Torso** (`ropa.js`). Coordenadas sobre la tela: `psi` (ángulo desde delante, + hacia +x = la izquierda del muñeco) e `y` (altura).
Filas del torso `filasTorso(A)` (cintura 0,162 hasta la cúpula 1,11), `A = Chars.ANCHO_TORSO (1,055) × ancho de la ficha`.
- Superficie **exacta** (caras facetadas): `sup(F, psi, y, d)`, `metrica` (metros de tela por radián), `avanzar` (ángulo al avanzar `u` metros),
  `normal`, `marco` (plano tangente real en un punto: **una pieza rígida apoyada ahí nunca corta el torso**).
- Superficie **lisa** (cáscara): `supL`, `metricaL`, `normalL`, `marcoL`, `avanzarL`. **Para chalecos y todo lo rígido.**
- `correa(B, F, g, silueta, o)`: **correa 3D pegada a la tela** (por `tramo(t)` → `[psi, yBajo, yAlto]` o por `camino(t)` → `[psi, y]` + `ancho`),
  con borde negro a cada lado, cantos negros hasta dentro, tinta de casco continuo con vértices compartidos. Opciones: `redondo`, `bordes`,
  `bordeFin`, `tintaFin`, `entera`, `sinTinta`.
- `pieza(B, F, g, silueta, o)`: **placa plana** `(u,v)`, `o.pegada` (sigue la tela punto a punto) o rígida; `o.lisa`; `o.bisel` (tinta en bisel con
  el pie redondeado); `o.tinta`.
- `aro`, `almohada` (bulto pegado: bolso, nudo de corbata: superelipse con canto redondeado y filo negro).
- **Chalecos**: `placaL(B, F, g, silueta, o)` (placa sobre la **cáscara lisa**, por columnas de `psi` fijo, con franjas pintadas por punto y **canto en cuarto
  de caña**; la tinta, cuarto de elipse), `hebilla` (marco de cuatro barras, **una sola tinta alrededor**), `correaAtras` (correa con sus hebillas
  y lengüetas), `solapa` (la punta suelta de una correa). `CHALECOS.<id> = { nombre, hacer(B, F, g, silueta) }`.

---

## 11. Enciclopedia de defectos (síntoma → causa → cura)

| síntoma | causa | cura |
|---|---|---|
| Rayitas / línea punteada junto al borde de una tela pegada a la cabeza | la cara de dentro de la tela (1,25 cm dentro del óvalo) asoma por las caras de la malla de 16×12 | la cara de dentro baja `HUNDE` (2,8 cm); el borde que apoya va **pintado**, no con tinta |
| **Línea doble** (franja de piel/tela entre el borde y su tinta) | el casco hinchado para todos lados hace una cornisa a `g` del borde | tinta que termina en el mismo pie que el color; sin cáscara hacia la superficie de apoyo |
| Raya suelta a `g` del borde, vista casi de frente | el pie empinado del canto de la tinta | cuarto de elipse `r` × `r+g` con el mismo pie que el color (§ 6 regla 12) |
| Rayitas finas de punta a punta en una placa grande | astillas de `earcut` dadas vuelta por el empuje en pantalla | `triangular()` con puntos y Delaunay; tinta plana |
| Puntitos de la tinta de atrás en una mejilla de casco | grilla muy sesgada con diagonal fija | `casquete({diagCorta})` |
| Hilos claros en las aristas de una pieza facetada | caras sueltas + empuje en pantalla | vértices compartidos con normal promediada (`barridoTinta`, `tubo3`, `caja`) |
| Cuña negra bajo el ala de un sombrero | la cáscara de la cara de abajo llena el hueco entre el ala levantada y la cabeza | `p[3]` por punto del perfil + junta pintada (`juntaAla`) |
| Medialuna de cabeza entre una pieza y su raya | junta a ojo | `juntaPieza`: la junta se **mide** donde el perfil entra en el óvalo |
| Raya negra cruzando la prenda por el borde de la cabeza | la tinta del óvalo está adelantada 15 cm | `CUBRE.<id>`: donde la prenda la tapa, no se adelanta |
| Arco bajo un yugo en rayitas | toda cáscara a menos de 1 cm detrás de otra la atraviesa | terminar en la franja negra de la otra pieza; que la pieza entre 3 mm |
| Manchones en tela suelta apoyada | su canto entra 3,6 cm en la cabeza y sale a dientes | placa fina suelta (`tintaN` 0,25, apoyo 0, sin franja) |
| Costura con puntitos entre dos piezas cosidas | las normales de la costura difieren 0,04 mm | `o.normal` impuesta (la de la losa), `sinTintaLado`, `sinCantoLado` |
| Placa clara asoma por los huecos de otra | tinta clara a menos de 1 cm detrás | mover la placa 3,5 cm atrás; solo el borde de abajo con tinta |
| Cuernos / rayas en el borde de arriba de una pieza interior | puntos de Steiner en una tapa; tinta de la tapa fuera del borde | tapa dentro del borde a −4 mm, sin puntos, solo el borde de atrás con tinta |
| Borde de arriba **quebrado** en cada arista del torso | pieza rígida pegada a las 12 caras | cáscara lisa `supL` |
| Botón comido por la mitad; placa que se hunde 1 cm | el torso se inclina hacia atrás al subir; una pieza vertical se hunde | plano tangente real (`marco`/`marcoL`) |
| Correa de cuatro puntos que cruza una arista con una cuerda | puntos cada más de 1 cm | una muestra **por centímetro** (`PASO = 0,012`) |
| Nudo aplastado, botones ovalados, bandolera de ancho cambiante | convertir metros a ángulo con el radio medio | **métrica de verdad** (`metrica`: la cara plana mide ~1,5× el radio medio) |
| Espinas junto a una hebilla en la esquina de atrás del torso | pieza rígida con la tela 1,5 cm por debajo de su plano | `pegada: true` + `lisa: true`; el pie del bisel 2 cm bajo la tela punto por punto |
| Cristal más claro / rosado en la ficha de la tienda | render a textura sRGB: mezcla lineal | `Chars.matVidrioLineal(opacidad)` |
| Manos tapan el pecho en las fotos | — | `SINMANOS=1` (escala del hueso a `1e-4`; **no** esconder la malla) |
| Pieza que «desaparece» o sale a rayas al aislar con un flag | `window.__x` quedó en el código | `grep -c "__sin\|_dbg" juegos-pc/ArenaNevada.html` = 0 antes de commitear |
| `Math.cos(Math.PI/2)` ≠ 0 (6e-17) y una condición `h > 0` falla | redondeo | comparar con tolerancia (`> 1e-6`), nunca contra 0 exacto |
| El torso parece tapar la tinta de lo que apoya en él (astilla bajo el borde de abajo, vista desde arriba a 45°) | **hipótesis sin probar**: la rampa de profundidad del torso (`Art.CAPA`, 0,38 cm por cm de altura) aleja la tinta del borde, que está más alta que el torso que tapa | probar un adelanto chico para la **tinta** de la ropa (hoy 0) |
| La bota apoyada **patina** | su avance = el de la pisada, sin descontar lo que el muñeco recorrió | en el apoyo: avance = pisada − recorrido real (`A.dist`); medido `patina` 0,000 |

---

## 12. Estado de cada prenda

### 12.1 Las prendas del catálogo (38) y su estado

Armor y peso: de `ItemGenerator.createArmor`; **precio = `myPrice + myArmor × 100`** (trajes: precio nuestro). Triángulos: `prendas.js` (banco, 30/09; un grunt entero con esa prenda; **un grunt pelado ya tiene ~35 mil**).
Detector (`trazos.js`, 36 vistas, método del 04/10; § 8.9): `sueltas / despegadas / huecos / finos` en píxeles. **Es una guía para ordenar el trabajo, no un veredicto**: un `fino` es orientativo y los números cambian ~7 % entre corridas.

**CASCOS (`hat`)**

| id | nombre | armor | peso | precio | tris | detector | qué es / notas |
|---|---|---|---|---|---|---|---|
| `hat1` | SWAT Cap | 0,5 | light | $250 | 50.796 | — | SWAT Cap: casquete con el panel claro del frente ancho y su borde de arriba con trazo; visera con pico (`visera`). `90239b1` |
| `hat2` | Leon Cap | 0,5 | light | $250 | 38.196 | — | Leon Cap: gorro de lana caído (`MOD.hat2`) |
| `hat3` | Sweatband | 0,5 | light | $250 | 36.940 | — | Sweatband: vincha de tela; `CUBRE` entre `LO_HAT3` y `+ANCHO_HAT3`. Fue el primer caso de «trazos flotando» (la cinta de arriba) |
| `hat4` | Ballcap | 0,5 | light | $250 | 40.540 | — | Ballcap: gorra de béisbol con visera |
| `hat5` | Desperado | 0 | none | $100 | 37.136 | — | Desperado: ala plana (`torno` + ala alabeada, `juntaAla`) |
| `hat6` | Bowler | 0 | none | $100 | 38.192 | — | Bowler: bombín (`torno` + ala) |
| `headphones` | Headphones | 0 | none | $100 | 46.220 | — | Auriculares: copas de 1/3 de la cabeza a 76°, cara clara con su arco, arco y yugo como láminas apoyadas, `juntaPieza`. `90239b1`. Volvió varias veces |
| `top` | Tophat | 0 | none | $100 | 37.136 | — | Tophat: galera (`torno`) |
| `fedora` | Fedora | 0 | none | $100 | 37.488 | — | Fedora: sombrero de fieltro (`torno`, ala) |
| `hat9` | Sombrero | 0 | none | $100 | 41.880 | — | Sombrero mexicano: ala ancha (`torno`); su error fue de los primeros que señaló quien pide |
| `helmet1` | Soldier Helm | 2 | med | $700 | 55.934 | — | Soldier Helm: borde medido, reborde (trazo, banda gris, trazo) **pintado** a distancia medida (`rebordeCasco`), remache grande. `d8b2335` |
| `helmet3` | Blast Helm | 3 | heavy | $1.500 | 66.568 | — | Blast Helm: pantalla **en V** (`pantallaV`), brazos-placa sólidos (`tubo3`), bisagra con tornillo, vincha por la nuca, correa ancha con hebilla. `d8b2335`, `9a9f21c`. **La que más vueltas pidió** |

**MÁSCARAS (`mask`)**

| id | nombre | armor | peso | precio | tris | detector | qué es / notas |
|---|---|---|---|---|---|---|---|
| `agent1_mask` | Agent Shades | 0 | none | $900 | 34.414 | 759 / 0 / 897 / 72 | Agent Shades rojas (enemigo Agente): hexágonos planos y opacos de 17,6 × 10,3 cm, trazo 1,9 cm, borde de arriba subiendo hacia afuera, puente sobre la línea de la cruz, sin patillas. `f37e712` |
| `agent1_mask_b` | Agent Shades | 0 | none | $900 | 34.414 | 0 / 0 / 897 / 72 | Agent Shades negras (Agente clásico): **la misma geometría**, vidrio negro macizo |
| `agent2_mask` | ATP Mask | 0,5 | light | $1.250 | 51.802 | 1.519 / 52.956 / 704 / 10.715 | ATP Mask de geometría: frente = `losa` con el agujero de cerradura del visor, cristal naranja 255,175,29 al 41 %, costados en `lamina` cosidos sin tinta, rieles como ala abierta a 35°, solapa de la nuca suelta. `701321f`. La más cara de armar |
| `agent3_mask` | OBSV Goggles | 0 | none | $900 | 37.572 | 68 / 24.607 / 2.786 / 2.141 | OBSV Goggles: de su hoja de vueltas (constantes `OBSV` en `accesorios.js`) |
| `shades1` | Radio-Shades | 0 | none | $100 | 41.468 | 4.147 / 9.855 / 0 / 607 | Radio-Shades: pantalla de una pieza con la nariz recortada y patillas anchas. `77c3147` |
| `shades3` | State Troopers | 0 | none | $100 | 35.460 | 68 / 1.753 / 763 / 1.112 | State Troopers (aviador): cristales del tamaño de la hoja (16,7 × 13,6 cm), translúcidos al 69 %, `lentes()` |
| `shades5` | Professionals | 0 | none | $100 | 35.516 | 107 / 1.595 / 378 / 670 | Professionals (redondos): translúcidos al 64 %, gris 47 |
| `shades8` | 3-D | 0 | none | $100 | 43.236 | 598 / 4.813 / 32 / 2.888 | 3-D: frente de cartón blanco en V, el cristal rojo es el de −x y el azul el de +x, patillas con gancho |
| `shades12` | Coolguys | 0 | none | $100 | 35.096 | 283 / 1.952 / 1.228 / 1.095 | Coolguys (cuadrados): translúcidos al 50 % |
| `goggles1` | Dr. Horrible | 0 | none | $100 | 51.348 | 148 / 6.690 / 0 / 2.218 | Dr. Horrible: carcasa con escalón y nariz, cañones de 18 cm con aro y vidrio negro, remache y correa negra |
| `paintball1` | Paintball Mask | 0,8 | light | $480 | 55.376 | 7.257 / 33.222 / 340 / 3.653 | Paintball Mask: visor rojo translúcido al 61 % en su marco, bisagras con remache, correa gris con hebilla y pasador |
| `tricky` | Iron Slab | 1,2 | med | $9.120 | 36.082 | — | Iron Slab (Tricky): placa en V ancha como la cabeza, forma de escudo, correa por la tangente. La vista de frente la dio quien pide. `59ed9c9` |

**BOCA (`mouth`)**

| id | nombre | armor | peso | precio | tris | detector | qué es / notas |
|---|---|---|---|---|---|---|---|
| `mouth3` | Bandana 1 | 0,5 | light | $250 | 49.652 | 0 / 6.650 / 0 / 775 | Bandana 1: pañuelo negro (`panuelo`): cuelga por la tangente, con nudo, puntas y pliegues |
| `mouth6` | Bandana 2 | 0,5 | light | $250 | 49.652 | 0 / 7.642 / 0 / 1.831 | Bandana 2: pañuelo gris (`panuelo`) |
| `mask1` | Skimask | 0 | none | $100 | 47.948 | 1.066 / 6.973 / 0 / 574 | Skimask: pasamontañas (negro liso con ventana); `CUBRE` solo alrededor de la ventana |
| `mouth10` | SARS Guard | 0 | none | $100 | 40.356 | 129 / 1.542 / 0 / 3.406 | SARS Guard: barbijo |
| `mouth1` | Breather | 0,5 | light | $250 | 51.188 | 1.768 / 12.511 / 0 / 3.284 | Breather: respirador con correas (`CUBRE.mouth1`, `respCorreas`) |

**CHALECOS (`shirt`)**

| id | nombre | armor | peso | precio | tris | detector | qué es / notas |
|---|---|---|---|---|---|---|---|
| `armor1` | Padded Vest | 3 | light | $500 | — | — | Padded Vest: sin modelar (notas en § 13) |
| `armor2` | Utility Vest | 2 | light | $400 | — | — | Utility Vest: sin modelar (§ 13) |
| `armor3` | Armored Vest | 3 | light | $500 | 54.380 | 0 / 2.101 / 0 / 4.541 | Armored Vest: § 13. `06710f8` |
| `armor4` | Armored Vest | 3 | light | $500 | — | — | sin modelar (§ 13) |
| `armor5` | Armored Vest | 5 | med | $1.000 | — | — | sin modelar (§ 13) |
| `armor6` | Metal Vest | 10 | heavy | $2.200 | — | — | Metal Vest: sin modelar (§ 13) |

**TRAJES (`traje`)**

| id | nombre | armor | peso | precio | tris | detector | qué es / notas |
|---|---|---|---|---|---|---|---|
| `agent` | Agent Suit | 0 | none | $900 | 42.536 | 0 / 0 / 176 / 651 | Traje de agente: saco con corbata, solapas, cuello blanco, abertura y botones (`ropa.js › traje`) |
| `agent2` | Agent Suit Mk1 | 0 | none | $1.200 | 79.246 | 18 / 7.421 / 526 / 6.374 | Traje Mk1: arnés (collar, X de correas, pasadores, placa del pecho, hebilla de la espalda, bolso con tapa y correita) |
| `agent3` | Agent Suit Mk0 | 0 | none | $1.200 | 53.060 | 0 / 144 / 153 / 2.887 | Traje Mk0: bandolera con hebilla de marco y ojal |

Total modeladas: **33** de 38 (12 + 12 + 5 + 1 + 3). Las 5 que faltan son los chalecos armor1, 2, 4, 5 y 6 (están en el catálogo y la tienda no los muestra: `Prendas.modelada`).

### 12.2 Cómo leer la tabla del detector

- Una prenda con **decenas de miles** de `sueltas`/`despegadas` merece una mirada de cerca con `zoom_prendas.js` y los recortes de `trazos.js` **antes** de afirmar nada: el detector pudo marcar tinta legítima (p. ej. contornos finos de cristal).
- Las cabezas de **agente** (`agent1_mask*`, ATP, OBSV) y los **lentes** tienen `huecos` por cómo se ven los cristales translúcidos y sus marcos pintados.
- Todo esto se midió **después** de que quien pide diera por buenas la mayoría (las cabezas); no es una queja suya sino una **línea de base** para la próxima vuelta.

### 12.3 Estado visual verificado por quien pide

Quien pide dio el visto bueno explícito («bien», «se ve mejor», «la SWAT Cap está bien») a: bocas y Tricky, SWAT Cap, auriculares (tras varias vueltas), Blast Helm (tras revertir el cambio equivocado y limpiar siluetas), anteojos y ATP Mask. **No hay constancia de que haya visto la versión final del chaleco** (cortó antes) ni de que haya probado en el celular el HTML de cierre (7,09 MB).


### 12.4 Una corrección que hay que hacer en voz alta

El mensaje del commit `06710f8` y el cierre de la sesión dijeron que el chaleco bajó de **8.762 → 403** px «sueltos» y de
**48.738 → 2.086** «despegados». **Esas cifras comparan dos métodos distintos**: el «antes» se midió con la primera versión del
detector (sin descontar el muñeco pelado, que ya trae 14.728 y 28.920 por su cuenta) y el «después» con la versión final.
**Con el mismo método** (36 vistas, descontando el pelado, `R=14`, `D=3,0`, sin manos; el defecto de `R` cambió el 04/10, ver § 8.9):

| versión del chaleco | sueltos | despegados | huecos | finos | método |
|---|---|---|---|---|---|
| primera (placa + correas, con la tinta hinchada para todos lados) | **3.116** | **36.398** | 0 | 10.748 | `R=14` |
| final (cáscara lisa, canto en cuarto de caña, tinta en cuarto de elipse, hebillas y lengüetas) | **403–432** | **2.086–2.101** | 0 | ~4.600 | `R=14` |
| la misma, medida el 04/10 | **0** | **2.101** | 0 | 4.541 | `R=30` (el defecto de hoy) |

Sigue siendo una mejora grande, pero **la deuda no es cero**. Los ~400 `sueltos` con `R=14` eran, casi seguro, falsas alarmas (tinta
gruesa de las lengüetas a más de 14 px de la geometría); con `R=30` dan 0. Lo que queda son los `despegados` (2.101), que incluyen la
**astilla** bajo el borde de abajo vista desde arriba a 45° y que **nadie miró uno por uno**. Sin las lengüetas el detector (`R=14`)
daba `suelta` 0 y `despegada` 1.381. Quien pide **no vio la versión final** (cortó antes) y había dicho que en la primera seguía
viendo cosas. No lo des por terminado: **mirá de cerca antes de afirmar**.

---

## 13. El chaleco armor3 en detalle, y cómo seguir con los otros

**Qué es** (SWF `Outfit - Body - Core`, rótulo `armor3`): una **placa** (gris 69 → `0x353535`) de borde redondeado que envuelve el frente y los costados
del torso, con un **reborde** (gris 51 → `0x272727`) entre dos trazos negros, y **dos correas** por la espalda con **hebillas** (gris 131 → `0x656565`) pegadas
al borde de la placa, con las puntas sueltas asomando de la silueta.

**Medidas** (de su SVG, perfil; fila 420: `N 12 px`, `108 ×30`, `N 23`, …; col 360: `N 12+12`, `72…`, `N 12+13`):
- y de la placa (m): abajo **0,340**, arriba **0,895** (sube 0,011 hacia atrás); correas 0,828–0,884 (arriba) y 0,346–0,436 (abajo).
- Atrás llega a `psi = 2,29` en el borde de afuera (con las franjas); la cuenta de los píxeles de la placa (`ψ = π − acos((1 − d_b/0,285)^1,5)`, `d_b = (x_png − 228)/732`, calibrada con armor3) daba `2,13` para el borde de su cara.
- Franjas (`TR = 0,0164`): **arriba y atrás**, solo negro (3,3 cm: dos trazos pegados porque el reborde queda tapado); **abajo**, negro 1,78 + reborde 1 cm + negro 1,64
  (en la hoja el reborde mide 0,4 cm: a menos de dos píxeles de celular sale a rayitas, y sin antialias en calidad media, peor).
- Esquinas redondas: radio 8 cm arriba y 7 cm abajo (`RT`, `RB`).

**Cómo se construye** (`ropa.js`): `placaL` (columnas de `psi` fijo sobre la cáscara lisa, `franjas: [{T,B,E,hex}]`; el borde de la cara es el contorno
de más adentro; las franjas y el **canto en cuarto de caña** se arman *hacia afuera* desde ese borde, mezclando el ancho de arriba/abajo con el de las puntas en las
esquinas; la cara es una grilla de columnas), `correaAtras` + `hebilla` + `solapa`. `Ropa.construirCamisa(B, id, g, silueta, A, conTraje)` la pone. **Sobre un traje de
agente**, el traje no hace arnés ni bandolera (`Ropa.construir(…, chaleco)`, `Ropa.corte(id, chaleco)`: corte a 0,915).

**Notas de medición para los chalecos que faltan** (tomadas de las referencias `civ_armorN.png`; **sin implementar**):
- **armor4**: la misma placa que armor3 con **dos hebillas a otras alturas y con puntas más largas**.
- **armor5**: placa con **esquinas de atrás achaflanadas** (chaflanes que **no** son de 45°), **doble contorno interior**, hebillas con **remaches**, frente más
  alto por abajo (hasta ~0,289). Peso `med`.
- **armor6** (`Metal Vest`, armor 10, `heavy`): chapa metálica gris ~`0x616161` con **borde levantado**, remaches a lo largo de atrás y de abajo, labio de abajo más oscuro, dos hebillas.
- **armor1** (`Padded Vest`, armor 3): placa del frente `0x2a2a2a` hasta `psi ≈ 1,63`; **panel negro lateral** hasta `psi ≈ 2,1` con 2 remaches; **dos correas altas** de espalda con hebillas; **cinturón bajo** inclinado con 3 remaches.
- **armor2** (`Utility Vest`, armor 2): cuerpo `0x272727` con **borde de arriba inclinado que sube hacia atrás**, **tirantes con hebilla**, **dos bolsillos de cargadores**, un bolso en forma de caja abajo atrás, tira de borde del frente con broche.
- Alturas: `y = 0,146 + (870 − y_png)/732`. Comprobado con `bordes.js` sobre `civ_armor3.png` (columna 450): el borde de afuera de abajo cae en y_png 727 → **0,341** (el código usa 0,340) y el de arriba en 317 → 0,901.
Después de cada uno: el Paso 4–8 completo. **El detector es el criterio de salida**, y mirar de cerca el borde de abajo y las hebillas.

**Los trajes de enemigos** (`agent`, `agent2` arnés, `agent3` bandolera, en `ropa.js › traje`) están hechos pero **no remodelados con este método**; el detector
mide en el Mk1 (`agent2`) **~7.500 sueltos y ~7.300 despegados, 526 huecos** (el arnés, el bolso y su correa), y en el Mk0 **77/143/153**. `agent` (el saco) es
el más limpio (176 huecos). Es el trabajo pendiente más claro.

---

## 14. La tienda y la armadura

**Pantalla** (`tienda.js`): secciones `ARMAS LARGAS`, `PISTOLAS`, `CUERPO A CUERPO`, `CASCOS` (`hat`), `MASCARAS` (`mask`), `BOCA` (`mouth`), `ROPA` (`traje` + `shirt`).
Grilla de **6 casilleros por página** (2 filas de 3: la casilla del SWF es el 10 % del ancho), paginada. Solo se listan las prendas con `Prendas.modelada(id)`.
Cada prenda muestra: nombre, bajada, **baldosa del SWF**, descripción de la categoría (`Prendas.DESC`), barras **Armor** (contra 10, el Metal Vest) y **Weight**,
`Accuracy` y `Ammo` en ` - `, y el botón (`COMPRAR $x` / `FALTA DINERO` / `PONER` / `SACAR` / `REQUIERE ARMOR n`).
La **figura** (`#tdFigura`, 300×360): el muñeco con la prenda elegida en su ranura, en azul translúcido si todavía no es suya (como `applyAlpha` del SWF: alfa 0,7 y color
desplazado +80/+80/+150); render a textura con `colorSpace: SRGB`, `Art.matFicha()` y `Art.tonoFicha`.

**Baldosas** (`herramientas/swf/iconos_ropa.py`, `python3 herramientas/swf/iconos_ropa.py`): `madness_item_portrait` (8254) en su cuadro de la categoría (`hat`, `mask`, `mouth`, `shirt`),
con la prenda en el cuadro que le da el código del SWF (`myMask.gotoAndStop(myType)`), caja `(-2, -2, 88, 110)` a escala 3 → **270×336**. Los trajes de agente van como el cuerpo
(7289) puesto donde el retrato pone la ropa (`M_CUERPO = (0,95, 0, 0, 0,95, 800, 890)`; fuera `myBackup`, `myShirt`, `teamColor`). Las máscaras de dos lados usan la `_R`. El script lee dos
tablas: `CATS` (categoría → cuadro, instancia, símbolo) y `VENTA` (qué se vende); **para sumar una prenda: agregar su id a `VENTA` y volver a correrlo**. Salida:
`crudo/tienda/ropa/*.svg|png|webp` y `nevada/js/ropa_swf.js` (243 kB). 33 baldosas generadas el 30/09.

**Prueba de punta a punta de la armadura** (30/09, pistola de 7 de daño, `armadura.js` del Apéndice A.6):
- sin nada: entran **7** (cuerpo y cabeza);
- sin ARMOR 1: se compra `armor3` y el botón queda en «REQUIERE ARMOR 1» (no se pone);
- con ARMOR 1–3, chaleco + Blast Helm + visor de paintball + respirador: armadura `{cabeza 4,3, cuerpo 3}`; entran **4** al cuerpo y **2,7** a la cabeza; el botón pasa a «SACAR»;
- enemigo con chaleco + Soldier Helm: cabeza 2, cuerpo 3 → entran 4,27 al cuerpo y 5,33 a la cabeza (4 y 5 por la resta, ×1,067 por el `modArmor` de ese enemigo);
- con `perkArmorPierce` el atacante atraviesa el chaleco liviano (7 × 1,067 = 7,47 al cuerpo del enemigo) pero **no** el casco pesado (2,7 a la cabeza del jugador).

Bancos del 30/09: `nevada.js`, `prendas.js` (33 prendas), `tienda.js` → **0 errores** los tres. HTML: 6,87 → 7,09 MB (+243 kB de baldosas).

---

## 15. La marcha (primera parte de la sesión)

Se sacó del SWF: `madness_character` 5628, `run` 5349 (28 cuadros) y `dash` 5352 (14) → `herramientas/swf/marcha.py` → `nevada/js/marcha_swf.js` (el arco del pie,
el torso de run y de dash, cabeza y manos, simetrizados); la usa `anim.js › LA MARCHA DEL SWF`.
- **Cadencia por velocidad, no por distancia**: 1,40 ciclos/s a 3,5 m/s, 2,14 a 6,4, 2,69 a 10,7 (DEX 30) (antes 9 / 13 / 22 pasos/s: el «aleteo»).
- **Adaptado al 3D**, cada cosa por un choque medido: sin la agachada del dash (el bajo del torso a 16 cm y la bota mide 15,5); torso a la mitad de adelantado y a 2/3 de
  echado (13°) porque las botas quedaban lejos del cuerpo (lo pidió quien pide); talón y punta; `dentroTorso` baja la bota o sube el torso; puños que bombean al esprintar.
- **Bota clavada** (quien pide sentía que patinaba): en el apoyo su avance = el de la pisada − lo recorrido de verdad (`A.dist`); apoyo corto según la velocidad para que el recorrido
  se tope en 0,46 m andando, 0,60 esprintando, 0,66 con DEX; vuela con el arco del SWF; torso, vaivén y manos en `faseT`. Medido con `marcha.js`: `clavada` **0,000** (antes el pie apoyado iba
  al 70–79 % del cuerpo), bota dentro del torso 0–0,1 cm, pies separados hasta 0,37–0,53 m.
- Hechos del SWF: el personaje avanza 4,8 px/cuadro (2,36 m/s) y el pie apoyado retrocede 0,2 m por ciclo: **el original patina**; el dash son los pies del run cuadro por medio.
  Es 2,5D: lo que baja en pantalla se acerca (la bota de lejos «baja» 2,8 cm mientras apoya).

---

## 16. Pendientes, deuda y próximos pasos (por orden)

**Pedido de quien pide (30/09)**: el juego queda **en pausa** hasta nuevo aviso.

Cuando se retome:
1. **Chalecos armor1, 2, 4, 5 y 6** (notas en § 13). Agregarlos a `CHALECOS` hace que aparezcan solos en la tienda (`Prendas.modelada`), pero **sumar su baldosa a `VENTA`** en `iconos_ropa.py` y re-correrlo.
2. **Remodelar los trajes de los enemigos** (`ropa.js › traje`): Mk1 (`agent2`) primero (el detector marca ~7.500 sueltos), mismo método que los accesorios. Verificar con `combo.js` que conviven con el chaleco.
3. **La astilla bajo el borde de abajo del chaleco** (vista desde arriba a 45°; son los 2.101 `despegados`) y las **lengüetas de las correas**: inspeccionarlas de cerca una por una (el detector las dio por «sueltas» con `R=14` y por limpias con `R=30`).
4. Correr `trazos.js` sobre **todas** las prendas ya modeladas (tabla del § 12) y atacar las peores; el detector se escribió al final y no se había usado en la cabeza.
5. Pendientes viejos de la sesión anterior (en `memoria/nevada.md`, «Estado al cierre del log»): #40 mirar arriba/abajo cómodo con la mira táctil, #41 silueta y sombreado de los cuerpos, #44 al correr el pie de adelante atraviesa el torso, #42 ropa de enemigos, gore «próximamente», Hank sin modelo (ya no sale en el menú).
6. Nuestra línea horizontal de la cruz mide 3,7 cm (la del SWF 1,8) y asoma por fuera del cristal cercano con anteojos. No se tocó (es la cara de todos); es una decisión de quien pide.
7. Queda una franjita de puntos donde el tramo parado del brazo del Blast Helm cruza el borde de la silueta del casco (misma profundidad), solo de atrás-costado (±120°): ~7 px a escala de celular.

**Preguntas abiertas para quien pide** (hacerlas en texto plano, nunca con cuadros): ¿se retoma Nevada ya?; ¿qué sigue: chalecos o trajes?; ¿se prueba el HTML en el celular y qué ve?

---

## 17. Checklist de arranque para otra sesión

```bash
cd /home/user/Theclaudianos
git fetch origin ccr-29311d97-jmb0eu && git status          # la rama; commit 06710f8 o posterior
cat memoria/INDICE.md                                       # y NADA más; después, solo la nota del tema (nevada.md, swf.md, banco.md)
ls crudo/swf/mpn.swf                                        # si no está: pedirlo a quien pide
python3 nevada/armar.py                                     # arma juegos-pc/ArenaNevada.html (≈7,09 MB)
node herramientas/banco/nevada.js && node herramientas/banco/prendas.js && node herramientas/banco/tienda.js   # los tres con 0 errores
```
1. Leer este documento y `memoria/nevada.md` (secciones «La ropa de la cabeza en 3D», «Los anteojos», «La ATP Mask», «El chaleco armor3 y la tienda completa»).
2. **No empezar nada** sin que quien pide diga que se retoma (pausa).
3. Si se retoma: Paso 0–9 del § 7; nada de `AskUserQuestion`; commit solo a la rama; HTML adjunto; memoria al terminar.
4. Mantener la costumbre: **un número al lado de cada afirmación**; si una cifra anterior resulta imprecisa, corregirla en voz alta (§ 12.4).

---

## Apéndice A — Fuentes de los scripts de scratch

Copialos a `herramientas/` (y commiteá) si los vas a reusar. Todos asumen la raíz del repo como directorio actual y el Chromium de § 3.

### A.1 `hojas_ref.py` — referencias de la ropa de la cabeza

`python3 hojas_ref.py crudo/ref3` → `h_*` (sombreros), `m_*` (máscaras), `b_*` (bocas), `c_*` (cabezas de agente), cada una `.png` (escala 10) y `_g.png` (escala 22, para medir).

```python
#!/usr/bin/env python3
"""Hojas de referencia de la ropa de la CABEZA: cada sombrero, mascara y cabeza de agente del SWF sobre la
cabeza del civ ('Parts - Head', 2708), rasterizada a escala 10 (vista general: h_*.png, m_*.png, c_*.png) y a
escala 22 (para medir: *_g.png; todo trazo mide 22 px = 1,9 cm).

  python3 hojas_ref.py [carpeta]        (desde la raiz del repo; necesita crudo/swf/mpn.swf)

Simbolos: 2708 cabeza (rotulos civ, agent, agent2, agent3...), 1602 sombreros EN la cabeza (instancia
myHat), 1498 mascaras en la cabeza (myMask), 1425 bocas en la cabeza (myMouth).
Las bocas se hacen igual: hijos={'myMouth': (1425, rotulos_de_1425['mouth3'])} y fuera={'myHat','myMask'}.
"""
import json, os, subprocess, sys
sys.path.insert(0, 'herramientas/swf')
from swf import SWF
from svg import documento

SP = sys.argv[1] if len(sys.argv) > 1 else 'crudo/ref3'
os.makedirs(SP, exist_ok=True)
s = SWF('crudo/swf/mpn.swf')
_, rh = s.linea(2708)
ha = s.linea(1602)[1]; ma = s.linea(1498)[1]; bo = s.linea(1425)[1]
tr = []


def job(nombre, svg):
    f = os.path.join(SP, nombre + '.svg')
    open(f, 'w').write(svg)
    tr.append({'svg': f, 'png': f[:-4] + '.png', 'escala': 10})
    tr.append({'svg': f, 'png': f[:-4] + '_g.png', 'escala': 22})


for h in ['hat1', 'hat2', 'hat3', 'hat4', 'hat5', 'hat6', 'hat9', 'top', 'fedora', 'headphones', 'helmet1', 'helmet3']:
    job('h_' + h, documento(s, 2708, rh['civ'], {'myMask', 'myMouth'}, hijos={'myHat': (1602, ha[h])}))
for m in ['shades1', 'shades3', 'shades5', 'shades8', 'shades12', 'goggles1', 'paintball1', 'tricky', 'agent1_mask',
          'agent1_mask_b', 'agent2_mask_R', 'agent2_mask_L', 'agent3_mask_R', 'agent3_mask_L']:
    job('m_' + m, documento(s, 2708, rh['civ'], {'myHat', 'myMouth'}, hijos={'myMask': (1498, ma[m])}))
for b in ['mouth1', 'mouth3', 'mouth6', 'mouth10', 'mask1']:
    job('b_' + b, documento(s, 2708, rh['civ'], {'myHat', 'myMask'}, hijos={'myMouth': (1425, bo[b])}))
for c in ['agent', 'agent2', 'agent3']:
    job('c_' + c, documento(s, 2708, rh[c], {'myHat', 'myMask', 'myMouth'}))
json.dump(tr, open(os.path.join(SP, 't.json'), 'w'))
r = subprocess.run(['node', 'herramientas/swf/rasterizar.js', os.path.join(SP, 't.json')], check=True, capture_output=True, text=True)
print(len(json.loads(r.stdout)), 'png en', SP)
```

### A.2 `cuerpos.py` — el cuerpo del SWF con cada chaleco

`python3 cuerpos.py carpeta [escala]` → `civ`, `civ_armor1…6`, `agent`, `agent2`, `agent3` (`.svg`/`.png`, escala 12, caja `(-34,-44,34,40)`). El cuerpo está **de perfil**. Cambiar la ruta absoluta del `sys.path.insert` si el repo está en otro lado.

```python
# El cuerpo del SWF ('Parts - Body' 7289) con cada chaleco (myShirt -> 'Outfit - Body - Core' 7295), a escala fija
import json, os, subprocess, sys
sys.path.insert(0, '/home/user/Theclaudianos/herramientas/swf')
from swf import SWF
from svg import documento
s = SWF('/home/user/Theclaudianos/crudo/swf/mpn.swf')
_, rc = s.linea(7289); _, ro = s.linea(7295)
dest = sys.argv[1]; esc = float(sys.argv[2]) if len(sys.argv) > 2 else 12
CAJA = (-34, -44, 34, 40)
tr = []
def uno(nombre, cuerpo, camisa):
    fuera = {'myBackup', 'teamColor'} | ({'myShirt'} if camisa is None else set())
    hijos = {} if camisa is None else {'myShirt': (7295, ro[camisa])}
    svg = documento(s, 7289, rc[cuerpo], fuera, caja=CAJA, hijos=hijos)
    f = os.path.join(dest, nombre + '.svg'); open(f, 'w').write(svg)
    tr.append({'svg': f, 'png': f[:-4] + '.png', 'escala': esc, 'caja': list(CAJA)})
uno('civ', 'civ', None)
for n in range(1, 7): uno('civ_armor%d' % n, 'civ', 'armor%d' % n)
for a in ('agent', 'agent2', 'agent3'): uno(a, a, None)
json.dump(tr, open(os.path.join(dest, 'tr.json'), 'w'))
subprocess.run(['node', '/home/user/Theclaudianos/herramientas/swf/rasterizar.js', os.path.join(dest, 'tr.json')], check=True)
```

### A.3 `hojaref.js` — hoja de contacto con rótulos

`node hojaref.js salida.png ancho_celda img1.png img2.png …`

```js
// node hojaref.js salida.png ancho_celda img1 img2 ... : hoja con rotulos
const fs=require('fs'),path=require('path'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const [out,w,...imgs]=process.argv.slice(2);
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await nav.newPage({viewport:{width:1600,height:400}});
  const cel=imgs.map(f=>`<div class="c"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><b>${path.basename(f,'.png')}</b></div>`).join('');
  await pg.setContent(`<style>body{margin:0;background:#8a8a8a;font:14px monospace;display:flex;flex-wrap:wrap;width:${4*(+w+8)}px}.c{width:${w}px;margin:4px;text-align:center}img{max-width:${w}px;max-height:${w}px}b{display:block}</style>${cel}`);
  await pg.screenshot({path:out,fullPage:true}); await nav.close();
})();
```

### A.4 `fig.js` — la figura de la tienda con cada prenda

`node fig.js prefijo [tiene=0|1]` → `prefijo_hoja.png` y un PNG por prenda del lienzo `#tdFigura` (como lo ve quien juega; `tiene=1` = como si ya fuera suya, sin el tinte azul).

```js
// node fig.js out_prefix [tiene=0|1] -> la figura de la tienda con cada prenda elegida (como la ve quien juega)
const fs=require('fs'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const pre=process.argv[2], tiene=process.argv[3]==='1';
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const ctx=await nav.newContext({viewport:{width:412,height:892},hasTouch:true,isMobile:true,deviceScaleFactor:2});
  const pg=await ctx.newPage(); pg.on('pageerror',e=>console.log('ERR',e.message));
  await pg.goto('file://'+process.cwd()+'/juegos-pc/ArenaNevada.html',{waitUntil:'load'});
  await pg.waitForFunction('window.Game && Game.ren');
  await pg.evaluate(()=>{ try{localStorage.clear()}catch(e){} __ir('nueva'); });
  await pg.waitForFunction('Game.enMarcha && Game.tiempo > 1',null,{polling:250});
  const r=await pg.evaluate(async(tiene)=>{
    Tienda.paso=()=>{}; Game.olas.dinero=100000; Tienda.abrir();
    const ids=Object.keys(Prendas.CAT).filter(id=>Prendas.modelada(id));
    const out=[];
    for(const id of ids){
      if(tiene){ const f=Progreso.ficha.ropa; f.tiene=f.tiene||[]; if(f.tiene.indexOf(id)<0) f.tiene.push(id); }
      Tienda.elegir(id);
      const c=document.getElementById('tdFigura');
      out.push([id,c.width,c.height,c.toDataURL('image/png')]);
    }
    return out;
  },tiene);
  // hoja
  const W=r[0][1],H=r[0][2]; console.log('lienzo',W,H,'prendas',r.length);
  const hp=await nav.newPage({viewport:{width:1600,height:600}});
  await hp.setContent('<style>body{margin:0;background:#222;display:flex;flex-wrap:wrap;gap:4px;font:12px monospace;color:#ff0}figure{margin:0;position:relative}figcaption{position:absolute;left:4px;top:2px}img{display:block;background:#555}</style>'+r.map(([id,,,u])=>`<figure><img src="${u}"><figcaption>${id}</figcaption></figure>`).join(''));
  await hp.screenshot({path:pre+'_hoja.png',fullPage:true});
  for(const [id,,,u] of r) fs.writeFileSync(pre+'_'+id+'.png',Buffer.from(u.split(',')[1],'base64'));
  await nav.close();
})();
```

### A.5 `combo.js` — combinaciones de prendas × vistas

`node combo.js salida.png "agent2,armor3;agent3,armor3;agent2,-" "0:8,45:8,90:8,180:8"` (cada fila es `traje,chaleco`; `-` = nada). Sin manos.

```js
// node combo.js out.png "traje,shirt;traje,shirt;..." "az:el,..." -> hoja de combinaciones (filas) x vistas (columnas)
const fs=require('fs'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const [out, combos, vistasA]=process.argv.slice(2);
  const C=combos.split(';').map(s=>{ const [traje,shirt]=s.split(','); const at={}; if(traje&&traje!=='-') at.traje=traje; if(shirt&&shirt!=='-') at.shirt=shirt; return at; });
  const V=vistasA.split(',').map(s=>s.split(':').map(Number));
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const pg=await nav.newPage({viewport:{width:412,height:892},deviceScaleFactor:2}); pg.on('pageerror',e=>console.log('ERR',e.message));
  await pg.goto('file://'+process.cwd()+'/juegos-pc/ArenaNevada.html',{waitUntil:'load'});
  await pg.waitForFunction('window.Game && Game.ren && window.Prendas');
  await pg.evaluate(()=>{ __ir('nueva'); }); await pg.waitForFunction('Game.enMarcha && Game.tiempo > 0.5',null,{polling:250});
  const url=await pg.evaluate(({C,V})=>{
    Game.pausa=true; const S=700, ren=Game.ren, TW=300, TH=360;
    const c2=document.createElement('canvas'); c2.width=TW*V.length; c2.height=TH*C.length; const g2=c2.getContext('2d');
    const rt=new THREE.WebGLRenderTarget(S,S,{depthBuffer:true,colorSpace:THREE.SRGBColorSpace}); const c1=document.createElement('canvas'); c1.width=S; c1.height=S; const g1=c1.getContext('2d');
    C.forEach((at,fi)=>{
      const t=Actor.crear({tipo:Chars.vestido('grunt',at),arma:'puños',x:0,z:0,mirando:1}); t.sinTope=true; t.guion=true; t.rumbo=t.rumboObj=Math.PI/2;
      for(let i=0;i<40;i++) Actor.actualizar(t,1/60,i/60);
      const bs=t.cuerpo.piel.skeleton.bones; for(const i of Chars.MANOS_I.concat(Chars.MANOS_D)) if(bs[i]) bs[i].scale.setScalar(1e-4);
      const esc=new THREE.Scene(); esc.add(t.grupo);
      V.forEach(([az,el],vi)=>{
        const A=az*Math.PI/180,E=el*Math.PI/180,D=3.0,y0=0.72,cam=new THREE.PerspectiveCamera(30,1,0.05,60);
        cam.position.set(Math.sin(A)*Math.cos(E)*D,y0+Math.sin(E)*D,Math.cos(A)*Math.cos(E)*D); cam.lookAt(0,y0,0);
        ren.setRenderTarget(rt); ren.setClearColor(0x8a8a8a,1); ren.clear(true,true,false); ren.render(esc,cam);
        const buf=new Uint8Array(S*S*4); ren.readRenderTargetPixels(rt,0,0,S,S,buf); const im=g1.createImageData(S,S);
        for(let y=0;y<S;y++) im.data.set(buf.subarray((S-1-y)*S*4,(S-y)*S*4),y*S*4); g1.putImageData(im,0,0);
        g2.drawImage(c1,S*0.2,S*0.12,S*0.6,S*0.72,vi*TW,fi*TH,TW,TH);
        g2.fillStyle='#ff0'; g2.font='13px monospace'; g2.fillText((at.traje||'-')+'+'+(at.shirt||'-')+' '+az+'/'+el,vi*TW+4,fi*TH+14);
      });
      esc.remove(t.grupo);
    });
    ren.setRenderTarget(null); rt.dispose(); return c2.toDataURL('image/png');
  },{C,V});
  fs.writeFileSync(out,Buffer.from(url.split(',')[1],'base64')); await nav.close();
})();
```

### A.6 `armadura.js` — la armadura de punta a punta

`node armadura.js` → JSON: daño que entra al jugador pelado, sin ventaja, con ventaja y todo puesto, a un enemigo vestido y con perforación; imprime la cantidad de errores de consola.

```js
// la armadura de punta a punta: comprar y poner en la tienda (con la ventaja), la armadura del jugador,
// el daño que le entra, y la de un enemigo vestido
let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const ctx=await nav.newContext({viewport:{width:412,height:892},hasTouch:true,isMobile:true,deviceScaleFactor:2});
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await pg.goto('file://'+process.cwd()+'/juegos-pc/ArenaNevada.html',{waitUntil:'load'});
  await pg.waitForFunction('window.Game && Game.ren');
  await pg.evaluate(()=>{ try{localStorage.clear()}catch(e){} __ir('nueva'); });
  await pg.waitForFunction('Game.enMarcha && Game.tiempo > 1',null,{polling:250});
  const r=await pg.evaluate(()=>{
    const out={}, J=Game.jugador;
    Tienda.paso=()=>{}; Game.olas.dinero=100000; Tienda.abrir();
    const pistola={ id:'pistola', ficha: Weapons.CAT.pistola };
    const dano=(A, cabeza)=>Actor.danoSWF(A, 7, null, { arma: pistola, cabeza });
    out.sin = { armadura: J.armadura, cuerpo: dano(J,false), cabeza: dano(J,true) };
    // sin la ventaja: se compra pero no se pone
    Tienda.elegir('armor3'); document.getElementById('tdComprar').click();
    out.sinVentaja = { boton: document.getElementById('tdComprar').textContent, camisa: Progreso.ficha.ropa.shirt };
    // con ARMOR 1..3 (END 5, 10, 20): se pone
    for (const p of ['perkArmor1','perkArmor2','perkArmor3']) Progreso.ficha.perks[p] = true;
    Progreso.aplicar && Progreso.aplicar(J);
    J.perks = Progreso.ficha.perks;
    Tienda.elegir('armor3'); document.getElementById('tdComprar').click();
    Tienda.elegir('helmet3'); document.getElementById('tdComprar').click();
    Tienda.elegir('paintball1'); document.getElementById('tdComprar').click();
    Tienda.elegir('mouth1'); document.getElementById('tdComprar').click();
    out.puesto = { ropa: JSON.parse(JSON.stringify(Progreso.ficha.ropa)), tipo: J.tipo, armadura: J.armadura,
                   cuerpo: dano(J,false), cabeza: dano(J,true), boton: document.getElementById('tdComprar').textContent };
    Tienda.cerrar();
    // un enemigo con el chaleco y el casco de soldado
    const E = Actor.crear({ tipo: Chars.vestido('grunt', { shirt: 'armor3', hat: 'helmet1' }), arma: 'puños', x: 3, z: 0, mirando: -1 });
    out.enemigo = { tipo: E.tipo, armadura: E.armadura, cuerpo: dano(E,false), cabeza: dano(E,true) };
    // perforacion: con perkArmorPierce el atacante atraviesa lo que no es heavy
    const at = { perks: { perkArmorPierce: true }, x: 0, z: 0 };
    out.perfora = { enemigo_cuerpo: Actor.danoSWF(E, 7, at, { arma: pistola, cabeza: false }), jugador_cabeza_heavy: Actor.danoSWF(J, 7, at, { arma: pistola, cabeza: true }) };
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); console.log('errores', errs.length, errs.slice(0,3));
  await nav.close();
})();
```

### A.7 `tienda_tabs.js` — capturas de la tienda por pestaña

`mkdir out && node tienda_tabs.js out` → `out/t_<id>.png` con cada prenda elegida y el botón tras comprar el chaleco. Las capturas salen giradas (se enderezan con CSS `rotate(-90deg)`).

```js
// capturas de la tienda: cada pestaña de ropa y cada pagina, y una prenda elegida en cada una
const fs=require('fs'), path=require('path'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const out=process.argv[2];
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const ctx=await nav.newContext({viewport:{width:412,height:892},hasTouch:true,isMobile:true,deviceScaleFactor:2});
  const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  await pg.goto('file://'+process.cwd()+'/juegos-pc/ArenaNevada.html',{waitUntil:'load'});
  await pg.waitForFunction('window.Game && Game.ren');
  await pg.evaluate(()=>{ try{localStorage.clear()}catch(e){} __ir('nueva'); });
  await pg.waitForFunction('Game.enMarcha && Game.tiempo > 1',null,{polling:250});
  await pg.evaluate(()=>{ Tienda.paso=()=>{}; Game.olas.dinero=100000; Tienda.abrir(); });
  const fotos=[];
  const foto=async(n)=>{ await pg.waitForTimeout(300); const f=path.join(out,n+'.png'); await pg.screenshot({path:f}); fotos.push(f); };
  const pasos=[['3','hat1'],['3','helmet3'],['4','shades3'],['4','tricky'],['5','mouth1'],['6','armor3']];
  for(const [cat,id] of pasos){
    await pg.evaluate((cat)=>{ document.querySelector('[data-cat="'+cat+'"]').click(); },cat);
    await pg.evaluate((id)=>{ Tienda.elegir(id); },id);
    await foto('t_'+id);
  }
  // comprar el chaleco (pide ARMOR 1) y ver el boton; darle la ventaja y ponerlo
  const r1=await pg.evaluate(()=>{ Tienda.elegir('armor3'); document.getElementById('tdComprar').click(); return document.getElementById('tdComprar').textContent; });
  await foto('t_armor3_comprado');
  const r2=await pg.evaluate(()=>{ const F=Progreso.ficha; const est=F.stat||F.stats; return JSON.stringify(Object.keys(F).slice(0,40)); });
  console.log(JSON.stringify({boton_tras_comprar:r1, ficha:r2, errores:errs}));
  await nav.close();
})();
```

### A.8 `casco_rojo.js` — la tinta sola en rojo

`[SINROPA=1] [SINEMPUJE=1] node casco_rojo.js id cat out.png "az:el" x0 y0 x1 y1 D y0` (recorte en fracciones del cuadro de 2400 px). `SINROPA=1` descarta el color de la ropa (`aAde > 0`); `SINEMPUJE=1` apaga el empuje en pantalla. Los nombres `process_env_*` son parámetros de la función de la página.

```js
// (tinta en rojo, con su profundidad y su empuje de siempre)
// node casco.js id cat out "az:el" x0 y0 x1 y1 D y0 -> solo la tinta: caras de atras en rojo, de delante en azul; el cuerpo en gris claro sin tinta
const fs=require('fs'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const [id,cat,out,vista,x0,y0,x1,y1,D,Y0]=process.argv.slice(2);
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const pg=await nav.newPage({viewport:{width:412,height:892},deviceScaleFactor:2});
  pg.on('pageerror',e=>console.log('ERR',e.message)); pg.on('console',m=>console.log('PAGE',m.text()));
  await pg.goto('file://'+process.cwd()+'/juegos-pc/ArenaNevada.html',{waitUntil:'load'});
  await pg.waitForFunction('window.Game && Game.ren && window.Prendas');
  await pg.evaluate(()=>{ __ir('nueva'); });
  await pg.waitForFunction('Game.enMarcha && Game.tiempo > 0.5',null,{polling:250});
  const url=await pg.evaluate(({id,cat,vista,R,D,Y0,process_env_SINROPA,process_env_SINEMPUJE})=>{
    Game.pausa=true; const at={}; at[cat]=id; window.__uT=Art.UNI_TINTA.value; if (process_env_SINEMPUJE) Art.UNI_TINTA.value=0;
    const t=Actor.crear({tipo:Chars.vestido('grunt',at),arma:'puños',x:0,z:0,mirando:1}); t.sinTope=true; t.guion=true; t.rumbo=t.rumboObj=Math.PI/2;
    for(let i=0;i<40;i++) Actor.actualizar(t,1/60,i/60);
    const bs=t.cuerpo.piel.skeleton.bones; for(const i of Chars.MANOS_I.concat(Chars.MANOS_D)) if(bs[i]) bs[i].scale.setScalar(1e-4);
    const esc=new THREE.Scene(); esc.add(t.grupo);
    const mat=Art.mats.contornoPiel.clone(); mat.color.setHex(0xff2020); mat.onBeforeCompile=Art.mats.contornoPiel.onBeforeCompile; mat.customProgramCacheKey=Art.mats.contornoPiel.customProgramCacheKey;
    t.grupo.traverse(o=>{ if(!o.isMesh) return; if(o.material===Art.mats.contornoPiel){ o.material=mat; } });
    if (process_env_SINROPA) {
      // la ropa (aAde > 0) sin color: se ve que hay detras y que tinta la tapa
      const mc=Art.mats.cuerpo.clone(); const ob=Art.mats.cuerpo.onBeforeCompile;
      mc.onBeforeCompile=(sh,r)=>{ ob(sh,r); sh.vertexShader=sh.vertexShader.replace('void main() {','varying float vAdeX;\nvoid main() {\n\tvAdeX = aAde;'); sh.fragmentShader='varying float vAdeX;\n'+sh.fragmentShader.replace('void main() {','void main() {\n\tif (vAdeX > 0.001) discard;'); };
      mc.customProgramCacheKey=()=>'dbg-sinropa';
      t.cuerpo.piel.material=mc;
    }
    const S=2400, ren=Game.ren, rt=new THREE.WebGLRenderTarget(S,S,{depthBuffer:true,colorSpace:THREE.SRGBColorSpace});
    const [az,el]=vista.split(':').map(Number), A=az*Math.PI/180, E=el*Math.PI/180, cam=new THREE.PerspectiveCamera(30,1,0.05,60);
    cam.position.set(Math.sin(A)*Math.cos(E)*D,Y0+Math.sin(E)*D,Math.cos(A)*Math.cos(E)*D); cam.lookAt(0,Y0,0);
    ren.setRenderTarget(rt); ren.setClearColor(0x8a8a8a,1); ren.clear(true,true,false); ren.render(esc,cam);
    const buf=new Uint8Array(S*S*4); ren.readRenderTargetPixels(rt,0,0,S,S,buf); ren.setRenderTarget(null);
    const w=Math.round((R[2]-R[0])*S), h=Math.round((R[3]-R[1])*S), c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'), im=g.createImageData(w,h);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const X=Math.round(R[0]*S)+x, Yv=S-1-(Math.round(R[1]*S)+y), i=(Yv*S+X)*4, o=(y*w+x)*4; im.data[o]=buf[i]; im.data[o+1]=buf[i+1]; im.data[o+2]=buf[i+2]; im.data[o+3]=255; }
    g.putImageData(im,0,0); console.log('uTinta', window.__uT); return c.toDataURL('image/png');
  },{id,cat,vista,R:[+x0,+y0,+x1,+y1],D:+D,Y0:+Y0,process_env_SINROPA:!!process.env.SINROPA,process_env_SINEMPUJE:!!process.env.SINEMPUJE});
  fs.writeFileSync(out,Buffer.from(url.split(',')[1],'base64')); await nav.close();
})();
```

### A.9 `gap.js` — cuánto quedan las caras del torso por dentro de la cáscara lisa

`node gap.js` → hueco máximo en cm (0,85 a la altura de los hombros y 0,91 abajo; en la diagonal de 150°).

```js
const POT=2/3, L=12;
const DIR=Array.from({length:L},(_,i)=>{const th=(i/L)*2*Math.PI+Math.PI/L,c=Math.cos(th),s=Math.sin(th);return [Math.sign(c)*Math.pow(Math.abs(c),POT),Math.sign(s)*Math.pow(Math.abs(s),POT)];});
const dseg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1];let t=((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy);t=Math.max(0,Math.min(1,t));return Math.hypot(p[0]-a[0]-vx*t,p[1]-a[1]-vy*t);};
for (const [a,b] of [[0.244*1.055,0.222*1.055],[0.264*1.055,0.230*1.055]]) {
  const P=DIR.map(d=>[d[0]*a,d[1]*b]); let mx=0,at=0;
  for (let k=0;k<3600;k++){ const th=k/3600*2*Math.PI,c=Math.cos(th),s=Math.sin(th);
    const q=[a*Math.sign(c)*Math.pow(Math.abs(c),POT), b*Math.sign(s)*Math.pow(Math.abs(s),POT)];
    let d=1e9; for(let i=0;i<L;i++) d=Math.min(d,dseg(q,P[i],P[(i+1)%L]));
    if(d>mx){mx=d;at=th*180/Math.PI;} }
  console.log('a',a.toFixed(3),'b',b.toFixed(3),'hueco max',(mx*100).toFixed(2),'cm en th',at.toFixed(0));
}
```


---

## Apéndice B — Glosario del código (castellano de Nevada)

**tinta / contorno / silueta**: el casco negro invertido (§ 6). **casco**: la geometría hinchada de la tinta (y también el casco de ropa: `casco()` es una prenda).
**pegada**: sigue la superficie punto a punto. **rígida**: pieza plana apoyada en el plano tangente. **canto**: el lado de una placa (negro). **trazo**: la línea negra del
dibujo, pintada o de tinta. **losa**: placa plana con agujeros. **lámina**: tela con grosor. **adelanto**: cuánto se acerca a la cámara la profundidad de un vértice. **capa**:
orden de profundidad entre piezas (`Art.CAPA`). **CUBRE**: qué parte del contorno del óvalo tapa una prenda. **cruz**: la cruz de la cara (línea de los ojos). **baldosa**: el
icono de la tienda. **hoja (de vueltas)**: la referencia del SWF desde un ángulo. **ficha**: la ficha del personaje en la tienda (o el estado guardado: `Progreso.ficha`).
**el civ / el grunt**: el civil del SWF = el enemigo básico y el jugador por defecto (`Chars.TIPOS.grunt`). **agente / Mk1 / Mk0**: `agent`, `agent2` (con arnés y la ATP
Mask), `agent3` (con bandolera y las OBSV Goggles).
