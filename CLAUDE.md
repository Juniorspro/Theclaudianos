# Theclaudianos — bitácora y reglas

Repo de juegos web. Un juego = **un HTML autocontenido** en `juegos-pc/`, three.js desde CDN,
se prueba **en el celular, en vertical (412×892)**.

## Qué hay acá

| ruta | qué es |
|---|---|
| `juegos-pc/Bosque.html` | **El juego VHS.** Terror en primera persona, three.js r128 (script clásico), escenario girado 90°. |
| `juegos-pc/Alien.html` | **Alien Grid.** **Primera persona** móvil, **escenario girado 90°** (se juega apaisado): base militar de arranque, nave de dos cubiertas que se recorre por dentro, seis galaxias que se ganan, caminata espacial con soga, fotos que se venden y álbum de 21 especies. |
| `juegos-pc/Saltos.html` | **A LOS SALTOS.** Gladiadores 2D pixel art con física de saltos (a la Gladihoppers): 7 clases, cortes y sangre, carrera con edad, fama, mercado y estatuas. Canvas 2D, sin red, vertical. |
| `docs/GUIA_JUEGOS_2D_PIXEL.md` | Receta para juegos 2D pixel art (escala entera, piezas, banco). La usa `Saltos.html`. |
| `herramientas/glb/` | `juntar_anim.py` (varios GLB del mismo rig → uno con todos los clips) y `hornear.py` (achicar texturas y recompactar para meterlo en un HTML). |
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

### 2026-09-22 — Alien Grid (sesión Luck)
**Pedido textual:** «GENERAME un personaje alien riggeado 3D con Rezona lab y métele a un mundo 3D
grid con cielo hermoso 360 y suelo gris controles moviles modernos y cámara dinámica en tercera
persona desde arriba con animaciones básicas de correr caminar saltar etc sacadas de Rezona lab».

Salió `juegos-pc/Alien.html`: mundo grid gris, cielo 360 equirectangular, palanca flotante +
arrastre de cámara + botón de salto, cámara picada con retardo y alcance según la velocidad, y un
alien riggeado de 24 huesos con `idle/walk/run/jump`.

**Rezona no se pudo usar**: `CREDIT_RESERVE_FAILED` («扣费服务暂时不可用») en todos los
`submit_*_generation` durante más de una hora, con 478k créditos en la cuenta y `list_projects`
respondiendo bien — es el servicio de cobro de ellos, no la credencial. Los assets salieron por
**Higgsfield**, que para 3D corre el mismo Meshy. Queda pendiente rehacerlos por Rezona cuando
vuelva.

Lo que costó una vuelta cada uno:
- **La caja de bind miente.** El GLB traía la malla a 0,019 y el esqueleto a 1,26: `Box3.setFromObject`
  daba 1,85 pero lo dibujado salía 66 veces más grande, fuera de cuadro. Se mide con
  `boneTransform` sobre los vértices ya deformados.
- **Sacar el mapa emisivo y dejar el `emissiveFactor` en blanco pinta el modelo entero de blanco.**
- Cambiar una textura adentro de un GLB **sin recompactar el buffer sólo lo agranda** (12,6 MB → 12,9);
  recompactando queda en 1,2 MB.
- Una foto de cielo **no es equirectangular**: el horizonte hay que llevarlo a v=0,5 y coser los
  bordes (el salto de costura se mide, quedó en 0,77 sobre 255).
- Con la niebla a 46 m el mundo entero era beige; y el borde del plano de suelo deja una **banda
  oscura bajo el horizonte** si no se lo estira más allá de la niebla.
- Los clips de biblioteca **traen el desplazamiento adentro**: sin aplanar la posición de la raíz el
  alien patina.
- En el banco, una captura tomada **con espera después de dibujar sale negra** aunque `brillo()` mida
  153: se captura inmediatamente después del `render()`.

### 2026-09-22 (b) — nave de dos cubiertas, caminar arreglado y cambio de personaje
**Pedido textual:** «Ahora agrega una nave espacial con 2 pisos en la que el jugador se pueda
subir y caminar en su interior (El caminar del jugador tiene un error, arreglado)» y después
«El modelo es muy zarpado hace otro de militar o fotógrafo».

El alien lo reemplazó un **militar** (mismo camino: referencia en T, malla Meshy, cuatro rigs
con `idle/walk/run/jump`, juntados y horneados a 1,39 MB). Rezona seguía con
`CREDIT_RESERVE_FAILED` cada vez que se probó.

Lo que costó una vuelta cada uno:
- **Los ejes de la palanca estaban dados vuelta.** `camYaw` es hacia dónde MIRA la cámara: su
  derecha es −X con yaw 0, y la palanca hacia arriba da y negativo. Sin dar vuelta las dos cosas
  se camina para atrás. Y el auto-encuadre sumaba π, o sea dejaba la cámara ADELANTE.
- **El reloj del clip no puede ir contra una constante inventada.** Los clips de Meshy vienen
  *en el lugar* (la raíz recorre 10 cm en 4,2 s), así que la velocidad propia se mide del tranco:
  cuánto retrocede el pie plantado respecto del cuerpo, dividido por la duración. Con un A/B en el
  mismo binario (`CFG.escalaForzada`) el mínimo de patinaje cae justo en lo que elige la
  calibración sola. El deslizamiento del pie bajó de 56-64% del avance a 20%.
- **La escala de una sola pose no alcanza**: al caminar el pie quedaba 15 cm en el aire. Cada clip
  necesita su propio punto más bajo, muestreado a lo largo del ciclo.
- **Una sonda que adelanta cuadros mientras el juego sigue corriendo mide dos relojes.** Dos
  pruebas de la misma escalera daban resultados distintos; la buena es la que maneja con el dedo y
  deja correr el tiempo real.
- **Cayendo rápido se atraviesa el piso.** Buscar el piso desde donde quedó el jugador, y no desde
  donde estaba, lo mandaba de la cubierta al suelo de afuera. Va la prueba barrida más sub-pasos
  de física (a 6,6 m/s un cuadro de 0,1 s cruza medio muro).
- **16 cm de luz entre el último escalón y el piso de arriba** hacen caer al jugador a la cubierta
  de abajo si sube despacio; rápido, los saltea y no se nota.
- El interior no puede ser una caja cerrada: el techo de la cubierta baja **es** el piso de la
  alta, que ya viene partido alrededor del hueco de la escalera.
- Una sola lámpara pegada al techo deja el techo negro: van dos por cubierta y más abajo.
- La puerta metida adentro del casco no se ve: va **por delante** de la cara de popa.

### 2026-09-22 (c) — nave grande con texturas generadas y referencias reales
**Pedido textual:** «Genera texturas en Rezona lab para la nave, genera una más grande espaciosa
y mejor diseñada busca referencias reales etc».

Referencias medidas, no inventadas: la bodega sigue la proporción de la **bodega del C-17**
(26,8 × 5,5 × 3,76 m de alto, rampa de popa) ensanchada a 24 × 12 con 3,80 de puntal; las
paredes van forradas de **racks tipo módulo Destiny de la ISS** (1,9 m de alto × 1,1 de ancho,
con los raceways de caños en el chaflán de los rincones). La nave pasó de 20 a 30 m de largo y
de 13 a 15,4 de ancho; cubierta alta de 20 × 10 con puente, consolas y asientos; escalera de 15
escalones con baranda alrededor del hueco; rampa de embarque de 8 m.

**Rezona sigue caído** (`CREDIT_RESERVE_FAILED` en cada reintento, ahora van horas). Las texturas
salieron por Higgsfield: casco de chapas remachadas y piso de bodega con tread de diamante y
argollas de amarre. La de pared quedó colgada del lado del proveedor; el slot está cableado y
entra sin tocar nada más.

Lo que costó una vuelta cada uno:
- **Un `map` repetido sobre geometría fundida se estira distinto en cada pieza.** La UV se rehace
  por proyección de caja (el eje dominante de la normal elige qué dos coordenadas del mundo van),
  así la textura mide lo mismo en todo el casco. Metros por repetición: 6 el casco, 2 el piso.
- **Una imagen generada no es repetible aunque el prompt lo pida.** Se cose solapando las últimas
  filas y columnas sobre las primeras y recortando; el salto de costura se mide (3,2 y 4,7 sobre
  255 en el casco).
- **El mapa multiplica al color del material**: poner el color en blanco al aplicar la textura
  revienta el interior.
- El estado de los trabajos del proveedor **miente**: dos texturas figuraban «queued» media hora
  después de estar terminadas. Hay que mirar el historial, no el estado del trabajo.

### 2026-09-22 (d) — botón de despegue
**Pedido textual:** «Ahora agrega un botón para que la nave comience a volar por el espacio exterior».

Botón `DESPEGAR` que aparece **sólo estando a bordo** y pasa a `ATERRIZAR` una vez en el espacio.
Siete segundos de subida: se cierran las dos hojas de la compuerta de popa, sacude la cámara, el
cielo se funde del atardecer al espacio, y aparece el polvo de estrellas que pasa de largo. Desde
el puente se ve todo por el ventanal de proa. El aterrizaje lo deshace en unos seis segundos.

Lo que costó una vuelta cada uno:
- **La nave no se mueve: se va el mundo.** Mover la nave obligaría a mover también sus 19 pisos y
  15 muros, y cualquier desfasaje entre lo que se ve y lo que se pisa se paga caro. El suelo y los
  pilares van en un grupo que baja y se apaga.
- **El puente era una caja cerrada**: el «ventanal» era un panel opaco y adentro no se veía nada
  del espacio. Hay que abrir un hueco de verdad en la pared de proa (antepecho, dintel y dos
  jambas) y sacar el vidrio exterior que lo tapaba.
- **Un `hash` sobre la celda sola da cubos**: la nebulosa salía de ladrillos. Va ruido con las ocho
  esquinas interpoladas.
- Una hoja de compuerta lisa se lee a pared: necesita nervios, franja de peligro y el filo del
  encuentro encendido.
- La compuerta cerrada tiene que **bloquear de verdad**: va un muro con bandera `soloVuelo`, que se
  saltea mientras la nave está en tierra.
- Bajar a 8 m/s desde 270 m son treinta segundos de aterrizaje: el piso de velocidad va en 22.

### 2026-09-22 (e) — cámara de fotos en la bodega
**Pedido textual:** «Haz que en la primera planta de la nave haya una cámara arriba de una mesa
que el jugador podrá tomar y usarla para sacar fotos (Las fotos de la cámara deben verse como si
fuesen viejas, casi arruinadas)».

Mesa en la bodega con una cámara encima. Acercándose aparece `TOMAR CÁMARA`; agarrada, la cámara
se cuelga del hueso `RightHand`, sale el visor con REC y el botón pasa a `FOTO`. El disparo
revela una copia gastada sobre papel amarillento que se cierra tocando.

Lo que costó una vuelta cada uno:
- **Se dibuja y se captura en el MISMO turno.** Sin `preserveDrawingBuffer`, un `drawImage` del
  lienzo de WebGL en cualquier otro momento da negro. Se mide el promedio del papel para saberlo
  (quedó en 150 sobre 255, con mínimo 3 y máximo 241).
- **Colgar algo de un hueso hereda su escala**: el esqueleto vive a 0,0093, así que la cámara hay
  que dividirla por la escala del hueso en el mundo. Medido: escala final 1,0 y 21 cm de lado.
- **El círculo perfecto se lee a agujero de cartulina.** Las manchas de humedad y las mordidas del
  borde van con un contorno irregular, no con `arc`.
- Con la copia abierta hay que **cortar el `pointerdown`** del juego, si no el dedo que cierra la
  foto arma la palanca abajo.
- El envejecido que funciona: sepia sucio con un resto de color, negros levantados, desvanecido
  desparejo por campo de ruido, viñeta, grano, halación por encima, humedad, rayas, polvo y
  emulsión comida en los bordes. Y el papel también manchado y mordido.

### 2026-09-22 (f) — caminata espacial y bichos que empeoran
**Pedido textual:** «Ahora haz que cuando la nave despegue y esté volando por el espacio, el
jugador pueda salir al espacio exterior atado a una soga y podrá sacarle foto a los aliens que se
vean allí (Quiero que inventes aliens cada vez más raros, que al principio sean un poco normales
y mientras más avance el jugador sean más extraños)».

En el espacio, parado en la esclusa, el botón de la nave pasa a `SALIR AL ESPACIO`. Afuera: cero
gravedad, la palanca empuja en el plano de la cámara, el botón da envión para arriba, y una soga
de 16 m que cuelga con panza y tira cuando se termina. Volviendo a la esclusa el botón dice
`ENTRAR`.

Los bichos se arman por código con una semilla y una **rareza** que sube con cada uno
fotografiado: 0 es un huevo con dos ojos y cuatro patas; 9 es una cosa de anillos rojos, bocas con
dientes, ojos en tallos, copias de sí misma adentro y pedazos orbitando sueltos. Cada uno tiene
nombre inventado (`Mnouul-43 pálido`) que va al pie de la copia junto con la rareza y el número de
especie.

Lo que costó una vuelta cada uno:
- **El HUD se actualizaba después del `return` de EVA**, así que el botón nunca decía `ENTRAR`.
  Sacarlo a una función aparte y llamarlo en los dos caminos.
- **La cámara se metía adentro del casco al flotar afuera.** Los muros no alcanzan: por arriba de
  la nave no hay ninguno. Va el bulto entero del casco como caja, y se acorta la distancia hasta
  que la cámara sale.
- **`mirar()` es relativo**: una sonda que lo llamaba con el ángulo absoluto apuntaba a cualquier
  lado y daba 2 de 5 fotos falladas. Con `apuntar()` absoluto, 4 de 4.
- El levantado de negros del revelado **tapaba el espacio**: en una escena oscura hay que bajarlo
  (va por `VUELO.espacio`) y aflojar el fogonazo, si no la copia sale lechosa.
- `PointsMaterial` sin textura dibuja **cuadrados**: el polvo de estrellas necesita un punto
  redondo hecho con un degradado radial en un canvas.
- La nebulosa que se veía bien por el ventanal chico **se come el cuadro** cuando estás afuera.

### 2026-09-22 (g) — los bichos dejan de ser bultos
**Pedido textual:** «Haz que los aliens no sean tan deformes, dales formas y características
únicas a cada uno, hazlos de distintos tamaños, como si buscasen asustar al jugador con su
apariencia».

El generador tiraba primitivas al azar y por eso salían amorfos. Ahora hay **ocho arquetipos
dibujados a propósito**, cada uno con su silueta, su tamaño y desde qué rareza aparece:
`acechante` (biped larguísimo de brazos hasta las rodillas, una ranura de luz por cara, 3-4,4 m),
`insecto` (tórax segmentado, seis patas, mandíbulas y aguijón, 1,1-1,9 m), `medusa` (campana con
ojos abajo y hilos de 4-6,5 m), `vigía` (un ojo enorme rodeado de ojos chicos), `fauces` (dos
mandíbulas con dientes y un cuerpito atrás, 3,2-5,2 m), `colonia` (coral que se ramifica con ojos
en las puntas), `hueco` (esqueleto abierto sin nada adentro) y `torre` (segmentos apilados, cada
uno con su cara). La rareza agrega ojos, dientes y largo, pero **no rompe la silueta**, y no se
repite el arquetipo anterior.

Lo que costó una vuelta cada uno:
- **`pasoBichos` borra todo lo que pasa de 70 m de la nave.** Una sonda que teleportaba al jugador
  y al bicho a 230 m para sacar la ficha les borraba el bicho en el cuadro siguiente: las capturas
  salían vacías y parecía que el generador no dibujaba nada.
- **Los muros no alcanzan para frenar la cámara**: las alas y los motores quedan fuera del casco.
  Van tres bultos (fuselaje y un ala por lado) y no una caja sola, porque una caja que cubra las
  alas también tapa el punto por donde se sale a caminar.
- **Un bicho de 1,5 m a 30 m es un punto.** La distancia de aparición sale del tamaño del bicho.
- La piel va apagada y los ojos encendidos: lo que asusta es que te miren desde lo oscuro, no el
  color. Bajaron de 89 mil a 53 mil triángulos con tres en pantalla.

### 2026-09-22 (h) — los bichos se mueven
**Pedido textual:** «Hazlos que se muevan, que no estén quietos en el espacio, que tengan algún
movimiento o que hagan algo».

Cada especie se mueve como corresponde a su cuerpo, no todas igual:
- **acechante**: se queda quieto mirándote y cada tantos segundos avanza de golpe.
- **insecto**: corridas cortas en direcciones al azar, con pausa, girando sobre sí mismo.
- **medusa**: la campana se contrae y esa contracción la empuja; el rumbo va virando solo.
- **vigía**: orbita alrededor del jugador, siempre mirándolo, y **parpadea**.
- **fauces**: se echa atrás, abre grande y muerde para adelante.
- **colonia**: gira en espiral y late la escala.
- **hueco**: cae dando vueltas, con tics secos cada tanto.
- **torre**: cada piso gira a su ritmo y se desfasa, así el apilado se retuerce.

Para que una parte se mueva **no puede ir fundida con el resto**: la campana de la medusa, las dos
mandíbulas de las fauces y cada piso de la torre se funden aparte y cuelgan de un pivote propio,
con la geometría trasladada a ese pivote para que gire donde corresponde.

Medido: 1,1 a 5,4 m de recorrido en cuatro segundos según la especie, 7 pisos de torre moviéndose
hasta 1,5 rad y las mandíbulas 0,53 rad. Además los bichos se frenan a 3,2 m del jugador y se
empujan afuera si quedan encima de la nave.

### 2026-09-22 (i) — carta de navegación y cinco galaxias
**Pedido textual:** «Ahora haz que en el piso de arriba de la nave haya un panel de control en el
que se podrá elegir a que galaxia ir (Deberán haber distintos aliens en cada galaxia así que
piensa bien cada alien, que no sea repetitivo y único, confío en ti)».

Pupitre de navegación en la cubierta alta: acercándose aparece `PANEL` y se abre la carta con las
cinco galaxias, su frase y cuántas especies de cada una llevás en la cámara. En el espacio,
elegir una dispara el salto (fogonazo, cambio de cielo y bichos nuevos); en tierra sólo deja el
rumbo puesto para el próximo despegue.

Cada galaxia tiene **cielo, luz y especies propias, sin repetir ninguna**:
- **Vega Rota** — polvo violeta, sol apagado: acechante, insecto, medusa.
- **El Hervidero** — naranja denso y estrellas encimadas: fauces, **forja** (planchas soldadas con
  costuras al rojo), **enjambre** (seis cúmulos que respiran y se separan).
- **La Quietud** — azul casi negro, sin estrellas: hueco, **peregrino** (un aro enorme y lentísimo),
  **vela** (una membrana que ondea y se deja llevar).
- **Coral Profundo** — verde bioluminiscente: colonia, vigía, **farol** (cuerpo oscuro con un cebo
  encendido en una caña), **raíz** (un árbol dado vuelta que camina con las raíces).
- **El Reverso** — magenta: torre, **espejo** (dos mitades que se copian y cada tanto se alinean),
  **nudo** (aros trabados que giran cada uno por su lado).

Lo que costó una vuelta:
- **`const` no se puede usar antes de declararlo aunque esté en el mismo archivo.** `PANEL` se
  declaraba en el bloque de galaxias pero `construirNave()` —que corre al evaluar el script— ya lo
  usaba para armar el pupitre: la página entera moría con «Cannot access 'PANEL' before
  initialization» y `window.__A` nunca existía. Las constantes de posición van arriba de todo.
- Que no se repita el arquetipo anterior no alcanza cuando hay tres bichos vivos y tres especies:
  también hay que descartar los que ya están dando vueltas.

### 2026-09-22 (j) — EL VACÍO, la galaxia de los colosos
**Pedido textual:** «Ahora agrega una nueva galaxia, esta será la más peligrosa de todas, se llamara
"el vacio" en esta galaxia solo habrán 5 aliens pero serán de tamaño enorme, colosal, se verán de
lejos aunque se podrán acercar, hazlos bien detallados y que realmente provoquen miedo, esfuérzate
yo confío en ti».

Sexta galaxia en la carta, marcada como peligrosa: cielo casi negro con un sol rojo apagado, dos
bichos vivos a la vez, y las cinco especies son **sólo de ella**. Medidos en el banco: 93 a 165 m
de alto, apareciendo entre 170 y 420 m y sin borrarse hasta los 900 (las otras galaxias borran a
los 70). Se ven de lejos y se puede llegar hasta ellos con la soga.

- **El Segador** — un arco de 16 tramos con el filo encendido, cabeza bulbosa con doce ojos y
  filamentos que arrastra; barre despacio, como una guadaña que ya pasó.
- **La Catedral** — seis pisos de columnas y arcos con retículas de ventanas que titilan,
  contrafuertes y un rosetón con un ojo en el medio. Cada piso gira con su propia fase.
- **El Desollado** — doce vértebras, nueve pares de costillas abiertas, brazos enormes con dedos y
  una calavera de tres mandíbulas dentadas que **se da vuelta a mirar al jugador**.
- **El Pozo** — esfera oscura con cuatro anillos dentados que giran al revés uno del otro y tiran
  del jugador cuando está en caminata espacial.
- **La Marea** — cinco cortinas de tentáculos desfasadas, con ojos a lo largo de la cresta, que
  ondean como una ola.

Sistema de peligro nuevo: `BICHOS.peligro` sube a medida que un coloso se acerca (1 a los 0 m, 0 a
los 160), y con eso se prende un velo rojo en los bordes, parpadea «MASA COLOSAL EN APROXIMACIÓN» y
la cámara empieza a temblar: el temblor del despegue y el del miedo son el mismo número sumado.

Lo que costó una vuelta cada uno:
- **Un coloso a 300 m en una galaxia sin luz es un agujero.** Con el cielo casi negro y la luz
  ambiente baja, el bicho no se veía: proyectando su caja a pantalla y leyendo esos píxeles daba
  **20,1 sobre 255**. Se alumbra solo — emisivo mucho más alto en piel y caparazón.
- **La intensidad tiene que ir con el tamaño.** Un `PointLight` de 9 en un cuerpo de 160 m no
  alumbra nada: el alcance y la intensidad se calculan del alto del bicho (`objetivo*0.55`,
  `objetivo*3.0`). Después de eso, 34,2 sobre 255.
- **El borrado por distancia era fijo en 70 m.** Con eso, un coloso que nace a 400 m se borra antes
  de dibujarse. El alcance pasó a ser por galaxia (`lejos`).
- En el banco, **al jugador lo tira la soga**: mover al jugador para encuadrar no sirve, vuelve solo
  a los 16 m del ancla. Se encuadra moviendo al BICHO delante de la cámara, y la distancia buena no
  se calcula: se mide la caja proyectada en píxeles y se corrige.

### 2026-09-22 (k) — afuera se mira para donde uno quiera
**Pedido textual:** «Haz que cuando el jugador esté en el espacio exterior fuera de la nave, pueda
ver hacia donde quiera y la cámara no se quede fija en un lugar entiendes (Creo que es un pequeño
bug arreglado porfavor)».

Eran dos cosas, las dos medidas:
- **La picada estaba topada entre 0,10 y 1,05 rad**, o sea flotando en el espacio sólo se podía
  mirar para ABAJO, entre 6° y 60°. Afuera el tope pasa a ±1,28 rad (73° para arriba y para abajo);
  adentro queda como estaba. Medido con el dedo arrastrando de verdad: la componente vertical de
  la mirada iba de −0,10 a −0,87 y ahora va de **+0,78 a −0,96**.
- **El auto-encuadre le robaba el yaw al dedo.** La cámara se acomoda sola detrás del movimiento
  cuando la rapidez pasa de 1,2, y en cero gravedad la deriva no para nunca: apuntabas a un lado y
  la cámara se volvía sola. Afuera no corre más. Medido: con yaw en 1,2 y empujando 4 segundos en
  contra, el yaw queda en **1,2**.

Lo que costó una vuelta:
- **Mirando para arriba la cámara se hunde por debajo del jugador**, y pegado a la esclusa eso la
  mete bajo la panza de la nave: el cuadro entero quedaba en **0,00 sobre 255** (no es que no
  dibujara, es que desde abajo el casco es una pared sin luz). Afuera la distancia de cámara se
  acorta hasta la mitad según cuánto se mire para arriba: **24,7 sobre 255**.
- Volviendo a la nave hay que **volver a topar la picada**, si no la cámara entra con el ángulo de
  afuera y queda por debajo del piso de la cubierta.

### 2026-09-22 (l) — primera persona y la caminata a mano
**Pedido textual:** «Mira el vídeo completo y fíjate si puedes recrear ese juego con lo que tenemos
dejando la tercera persona atrás» + «Lo mejor sería que sí toques alien grid y que lo transformes
para no perder tiempo y créditos».

El video es **«God Sized»** de `@160_dev` (Godot), terror espacial sobre astrofobia. Se bajó y se
miró cuadro por cuadro (36 s, 60 cuadros por segundo): primera persona sin cuerpo, un cursor de
mano blanco en el centro que se abre y se cierra, barras que se prenden en azul al mirarlas, un
plato de antena mal apuntado con un rayo rojo de mira, un monitor chico que dice
`[ LINK READY ] SIGNAL: 92% RATE: 128 KBPS STANDBY`, y el plano final de la nave cruzando el disco
de Neptuno.

Alien Grid **pasó a primera persona** en vez de nacer un juego nuevo:
- La cámara no orbita más: **es la cabeza**, a 1,58 m, con cabeceo del tranco y balanceo.
  `camPitch` cambió de sentido — antes era la picada de una cámara en órbita (0,10 a 1,05 rad, o
  sea sólo se podía mirar para abajo), ahora es la mirada: positivo arriba, ±1,45 rad.
- El cuerpo no se dibuja, pero **el esqueleto sigue ahí**: la cámara de fotos sigue colgada del
  hueso de la mano derecha y se ve en el borde del cuadro, como se ve en primera persona.
- Afuera, la caminata espacial se hace **de agarradera en agarradera**: 14 barras desde la esclusa
  de popa, subiendo por la popa y siguiendo el espinazo hasta el mástil. Se mira una, se toca, y el
  tranco dura 0,62 s. `SOLTARSE` te deja a la deriva; `TIRAR DE LA SOGA` te trae de vuelta.
- Tarea nueva: **la antena**. Se la toca para agarrarla y el mismo arrastre que mueve la cámara
  pasa a girar el plato. La pantallita mide la señal contra el puntito azul del cielo y a 99,65%
  de alineación engancha: `[ ENLACE LISTO ] SEÑAL: 100% RÉGIMEN: 128 KBPS TRANSMITIENDO`, y
  contesta control.
- Linterna de casco, luz que se escapa por la escotilla, viñeta y reflejo de visor.

Lo que costó una vuelta cada uno:
- **Apuntar con un rayo a una barra de 5 cm es imposible con el dedo.** El raycaster daba «nada»
  aunque la barra estuviera en el centro de la pantalla: 7 cm de error de puntería son 14 cm a dos
  metros, y el cilindro tiene 5. Se elige la agarradera **más cerca del centro de la mirada** por
  ángulo (tolerancia 0,30 rad), no por rayo.
- **Dónde está el casco no se adivina.** Las barras de popa quedaban adentro de una plancha que
  está 56 cm por delante de la cara del casco: el jugador salía y veía una pared lisa. Ahora cada
  barra se pega tirando un rayo contra la nave al construirla.
- **La soga de 16 m no llegaba**: la ruta de agarraderas termina a 19 m del gancho, así que al
  llegar al mástil te tironeaba para atrás. Pasó a 26.
- **Un `CanvasTexture` que sólo se pinta cuando cambia el valor arranca negro.** La pantalla de la
  antena hay que pintarla una vez al armarla.
- **El cielo es una esfera de 460 m**: el puntito azul puesto a 700 quedaba tapado por atrás. Va a
  300 y con la escala achicada para que siga midiendo medio grado.
- Con la linterna a 2,8 y sin caída, el casco a un metro se **quema en blanco** (117 sobre 255 en
  una escena que tiene que dar miedo). Con 1,25 e intensidad que cae con la distancia, 41.

### 2026-09-22 (m) — afuera queda limpio otra vez
**Pedido textual:** «Quiero que ahora borres la antena esa que esta ahí arriba de la nave, no es
necesario también la pantalla que está a su lado borrala, también borra la escalera esa que está
por fuera la nave».

Se sacó todo lo de afuera que había traído la vuelta anterior: el mástil con el plato, el monitor
de la señal con su poste, y las 14 agarraderas del casco (la «escalera»). Con eso se fueron también
las piezas que sólo existían para ellas: el cursor de mano, el toque para agarrarse, los botones
`SOLTARSE` y `TIRAR DE LA SOGA`, la línea de tarea, los mensajes de control y el puntito azul.
Son 19.465 caracteres menos.

**Lo que queda:** primera persona, la linterna del casco, la luz que se escapa por la escotilla y
el visor con viñeta. Afuera se vuelve a volar con la palanca y el botón de envión, como antes.
La soga vuelve a 16 m (se había estirado a 26 sólo para que la ruta de agarraderas llegara).
Probado: entrar, despegar, salir, empujar 16 m hasta que la soga tensa, y volver a entrar — sin
errores de consola, 33 draw calls.

### 2026-09-22 (n) — el carrete se vende
**Pedido textual:** «Ahora haz que las fotos que el jugador saque (solo podrá sacar 3) pueda
venderlas en una computadora que estará en el primer piso (dependiendo de la rareza del alien será
más o menos pagado). El dinero le servirá para comprarse mejores cámaras y mejoras dentro de la
nave».

**El carrete tiene 3 fotos.** Cada disparo anota la copia: nombre del bicho, rareza, galaxia y
cuánto paga. Con el carrete lleno el botón dice `CARRETE LLENO` y `sacarFoto` devuelve nulo — hay
que volver a vender. Una placa sin nada adentro también gasta una foto y paga cero.

**Precio:** `(55 + rareza×48) × 4,2 si es colosal × encuadre × calidad de la cámara`. El encuadre
sale de la caja del bicho proyectada a pantalla, así que llenar el cuadro paga casi el triple que
un puntito en un rincón. Medido con tres bichos de rareza 0: 39, 49 y 65 créditos.

**La terminal** va en la bodega, sobre la banda de estribor a 1,5 m de las escaleras: escritorio,
torre y monitor verde que muestra créditos, carrete y `[ HAY QUE VENDER ]`. Acercándose sale el
botón `COMPUTADORA` y se abre el panel: la lista de lo que traés con su precio, `VENDER TODO`, las
cámaras y las mejoras.

**Cámaras** (la comprada se puede poner y sacar): de mano (3 fotos, alcance 75 m), réflex de 6×6
(1.400 cr, 5 fotos, alcance 130 m, paga 55% más) y teleobjetivo 600 (5.200 cr, 8 fotos, alcance
340 m, paga 130% más — es la que llega a los colosos).

**Mejoras de la nave**, cada una con efecto medible: luces de bodega (800 cr, las lámparas pasan de
0,95 a 1,9 de intensidad), soga larga (1.600 cr, de 16 a 28 m) e impulsores del traje (2.600 cr,
empuje de 7 a 12).

Lo que costó una vuelta:
- **El alcance de la cámara estaba clavado en 75 m** adentro de `bichoEnCuadro`: sin sacarlo a la
  ficha de la cámara, el teleobjetivo no se notaría en nada.
- La sonda leía `FOTO.lleno`, que sólo se recalcula en el HUD: justo después de vender decía
  «lleno» con el carrete vacío. El estado se calcula en el momento, no se lee del cachito del HUD.

### 2026-09-22 (o) — el álbum
**Pedido textual:** «Quiero que ahora agregues un álbum en el que se verá a todos los aliens a los
que el jugador le sacó foto seguido de una breve descripción de ese alien (Los aliens que aún no ha
visto el jugador aparecerán como "?")».

Ficha de las **21 especies**, agrupadas por galaxia y en el orden de la carta. La que fotografiaste
muestra el nombre de la especie, su descripción, el nombre del ejemplar, la rareza, cuántas fotos
le sacaste y cuánto pagó la mejor. La que no viste es un `?` con borde punteado y «Sin registro».
Arriba, el contador: «2 de 21 especies fichadas».

**La tapa de cada ficha es la foto del propio jugador**, no un dibujo: al disparar se recorta la
copia ya envejecida a 108×135 y se guarda como JPEG al 62%. Si volvés a fotografiar la misma
especie, sólo pisa la tapa si esa copia paga más.

Se abre de dos maneras: tocando el chip `ESPECIES n/21` de arriba a la izquierda, o desde el botón
`ÁLBUM` que quedó primero en la terminal de la bodega.

Probado: con el teleobjetivo en EL VACÍO entraron **El Segador (761 cr) y La Marea (711 cr)** con su
tapa, los otros tres colosos siguen en `?`, y el botón de la terminal abre el álbum. Sin errores.

### 2026-09-22 (p) — las galaxias se ganan
**Pedido textual:** «Ahora haz que el jugador no pueda ir a todas las galaxias desde el comienzo,
solo podrá ir a 2 desde el principio, tendrá que mejorar su nave para poder ir una por una a cada
galaxia».

Arrancan abiertas **Vega Rota** y **El Hervidero**. Las otras cuatro se abren de a una con el motor,
y el motor se compra en la terminal **en orden**: cada clase exige la anterior.

| motor | precio | abre |
|---|---|---|
| Salto clase II | 1.800 cr | La Quietud |
| Salto clase III | 3.600 cr | Coral Profundo |
| Salto clase IV | 6.500 cr | El Reverso |
| Blindaje de vacío | 12.000 cr | EL VACÍO |

En la carta de navegación las trabadas salen con borde punteado, un cuadradito negro delante del
nombre, «fuera del alcance del motor» y qué motor hace falta con su precio. No responden al toque y
`viajarA` las rechaza aunque se la llame de prestado.

Que EL VACÍO sea lo último cierra la economía sola: los colosos pagan 700 cr por foto, pero para
llegar hay que haber comprado los cuatro motores (23.900 cr) juntando de a 50 en Vega Rota.

Medido: al arrancar `[true,true,false,false,false,false]`; `comprarSalto('salto3')` da falso con
30.000 créditos en el bolsillo mientras falte el II; con el II puesto, el III entra y Coral Profundo
pasa a `true` y el salto llega.

### 2026-09-22 (q) — el álbum con todos los huecos
**Pedido textual:** «Quiero que el álbum esté completo, osea no con las imágenes, sino me refiero a
con cada alien que exista dentro del juego entiendes, que cada alien tenga su hueco en el álbum».

Primero se midió: **los 21 bichos del juego ya estaban todos**. `ARQ` tiene 21 arquetipos, las seis
galaxias suman esos mismos 21 y ninguno queda afuera (`sólo en ARQ: []`, `sólo en galaxias: []`).
Lo que faltaba era que se leyera como álbum de figuritas y no como una lista con interrogantes:

- **Cada bicho tiene su hueco numerado**, `#01` a `#21`, en el orden de la carta de navegación. El
  número va abajo de la tapa, tanto en el hueco vacío como sobre la foto pegada.
- El hueco vacío es un **hueco de verdad**: borde punteado y rayado diagonal, con el `?` encima y
  abajo qué número y de qué galaxia es.
- Cada galaxia lleva su marcador al costado (`VEGA ROTA 3/3`) y arriba va el total:
  «3 de 21 huecos llenos · faltan 18», que pasa a «álbum completo» cuando no falta ninguno.

Medido en el banco: 21 fichas dibujadas, numeración `#01 … #21` sin saltos, y con tres fotos en
Vega Rota el grupo marca 3/3 y el encabezado «faltan 18».

### 2026-09-22 (r) — siluetas en los huecos y pasada de errores
**Pedido textual:** «Haz que los huecos vacíos muestren la silueta del alien (De paso arregla TODOS
LOS POSIBLES ERRORES DENTRO DEL JUEGO, TODOS)».

**Las siluetas salen del mismo generador que el bicho**, no están dibujadas a mano: se arma la
especie en una escena aparte, se le pisan todos los materiales por uno plano, se dibuja a un
`WebGLRenderTarget` de 108×135 con fondo transparente y se leen los píxeles — alpha > 8 pinta,
el resto queda calado. Sale un PNG que se guarda en caché. Las 21 tardan 680 ms la primera vez que
se abre el álbum y después ya están.

**Lo que se arregló midiendo, no mirando:**
- **Fuga de memoria.** Los bichos se sacaban de la escena con `esc.remove` pero nunca se tiraban las
  geometrías ni los materiales: una partida completa dejaba **329 geometrías vivas** (arranca con
  75). Va `tirarBicho()` en los tres lugares que los borran. Mismo recorrido: **109**, y 20 camadas
  seguidas de bichos suben de 75 a 88 y se quedan ahí.
- **Trampa al tirar geometrías.** `_cajaG`, `_cilG` y `_esferaG` son COMPARTIDAS y los bichos las
  usan directas para los pedazos sueltos: tirarlas al borrar uno rompía todos los que vinieran
  después. `tirarBicho` las saltea por identidad.
- **La rareza no pagaba.** `userData.rareza` va de 0 a 1, pero el precio y la ficha la trataban como
  si fuera de 0 a 9: entre un bicho común y el más raro había 48 créditos de diferencia. Ahora va
  `rareza9()` en los dos lados. Medido: rareza 0 → 54 cr, rareza 4 → 218 cr, rareza 9 → 547 cr.
- **Cambiar a una cámara con menos carrete tiraba las fotos sin avisar.** Ahora se niega y la
  terminal dice «Vendé el carrete antes de poner la CÁMARA DE MANO».
- **Los paneles se abrían detrás de la copia abierta** (álbum, terminal y carta). Los tres chequean
  `FOTO.abierta`.
- **El chip del álbum armaba la palanca por atrás**: está en la lista de cosas que no arman joystick.
- **Bomba de tiempo**: `MAT_SILUETA` se usaba en `tirarBicho`, declarada 1.200 líneas más abajo. Con
  que un bicho se borrara antes de que el álbum existiera, la partida moría con un TDZ. Subió.

Banco: recorrido completo (pasto, escaleras ×3, fotos en tierra, vender vacío, comprar sin plata,
paneles encimados, deriva con soga, seis galaxias con fotos y ventas, aterrizaje y segundo
despegue) más 70 toques y arrastres al azar — **cero errores de consola**, ningún NaN, ningún
crédito negativo, el carrete nunca se pasa y el jugador nunca se cae del mundo.

### 2026-09-22 (s) — base militar en el planeta de arranque
**Pedido textual:** «Ahora quiero que hagas que en el planeta inicial (el planeta donde empieza el
juego) esté decorado como si fuese una base militar me explico? (Osea que esa nave la que usa el
jugador es una nave militar, solo quiero que adornes y coloques piso y todo eso en ese planeta
inicial, captas?)».

El descampado con grilla pasó a ser **BASE ALFA**, y todo cuelga de `mundo`, así que se hunde y se
apaga igual que el suelo al despegar.

- **Plataforma pintada de una sola vez**: 80 × 98 m de asfalto dibujado en un lienzo de 1024, con
  juntas de losa cada 8 m, grano y manchas de aceite, el **círculo de aterrizaje** centrado en la
  nave con sus cuatro marcas de eje, «ALFA-3», los chevrones de peligro atrás de la rampa, el
  pasillo de rodaje amarillo hasta el portón, cajones de estacionamiento y los carteles pintados
  «BASE ALFA · PLATAFORMA 03» y «ACCESO CONTROLADO — ALTO EN LA BARRERA».
- **Hangar** de 26 × 22 × 12 con nervios de techo, portón oscuro con costillas y umbral pintado.
- **Torre de control** de 19 m con cabina vidriada, alero, mástil y baliza.
- **Tres tanques de combustible** adentro de su dique, con caños.
- **Seis contenedores apilados**, cajones, bidones y **tres camiones** estacionados.
- **Cuatro torres de luz** de 13 m en las esquinas de la plataforma, **radar que gira**, manga de
  viento, bandera, puesto de guardia con bolsas de arena, dos barreras y **pórtico de entrada**.
- **Cerco perimetral** de 104 m de lado con postes cada 5,2 m y tres alambres, con el hueco del
  portón.

Todo se funde por material: siete mallas y el radar aparte. Medido: **47 a 54 llamadas de dibujo**
en tierra (antes 33-38), 29.712 triángulos, sin errores.

Lo que costó una vuelta:
- Las marcas pintadas salieron de **1 a 1,5 m de ancho**: una línea de rodaje de verdad tiene 15 a
  35 cm. El ancho se calcula en metros × píxeles por metro, no en píxeles a ojo.
- Los muros de la base **no pueden frenar al que está volando**: va la bandera `soloTierra`, al
  revés de la `soloVuelo` de la compuerta. Medido: en tierra el cerco frena en z −103,6 y en
  caminata espacial no frena nada.
- `MAT_NAVE` se declara después de los pilares, así que el bloque de la base va **después** de
  construir la nave o revienta con un TDZ, como ya pasó con `PANEL`.

### 2026-09-22 (t) — pasada de construcción: puerta, escalera, rampa y base
**Pedido textual:** «Hey bro mejora la nave y estructuras la puerta está tapada y traspasable fíjate
bien bien todo y arreglalo hay muchos errores de construcción recuerda que es un juego AAA».

Todo se encontró **tirando rayos y caminando contra las cosas**, no mirando capturas.

**La nave**
- **La puerta estaba tapada por una losa maciza** de 5,1 × 3,55 m clavada en el hueco (z 11,44), sin
  colisión: por eso se veía cerrada y se atravesaba. Y atrás de la losa, **la cara trasera de la
  panza también cruzaba el hueco** (z 12,00). El rayo desde afuera chocaba a 3,44 m.
- **El casco era dos ladrillos macizos** (panza y lomo). Pasó a ser una **cáscara**: cada cara va
  sólo donde hay casco. La boca de popa es un túnel forrado y con luz hasta la puerta de adentro.
  Ahora el rayo desde afuera llega a la pared del fondo de la bodega, a 29,84 m.
- **La rampa estaba dibujada al revés** desde la vuelta (b): el giro positivo de `cajaP` baja el eje
  largo hacia +Z, así que se veía alta afuera y baja en la puerta (el «trapecio negro» era su
  panza). La colisión subía bien. Va con giro negativo, y una franja de peligro en la boca.
- **El hueco de la escalera estaba tapado por los dos lados**: desde la bodega lo tapaba la panza
  del lomo (y 5,40) y desde arriba el techo de la panza (y 5,60). Además **una viga del techo
  cruzaba el hueco a la altura de la cabeza** (y 5,00). Las tres se fueron; ahora el rayo va del
  escalón al techo de la cubierta alta sin chocar nada.
- **El techo de la bodega tenía dos caras a 4 cm** (5,40 y 5,44): parpadeo seguro en el celular. Hay
  un techo propio, con el hueco de la escalera y un brocal alrededor.
- **Con doble salto la cabeza salía por el techo**: la cámara llega ahora hasta 4,87 con el techo en
  5,20.
- **El ventanal de proa era una pared** vista de afuera: el casco del lomo tiene el hueco de verdad,
  forrado, con **vidrio transparente** y el marco abrazando el hueco que existe.
- El marco encendido de la puerta flotaba medio metro delante del casco (estaba pegado a la losa):
  ahora está pegado a la cara de popa.

**La base**
- **El hangar era un bloque macizo con un portón pintado.** Ahora se entra: hueco de 15 × 9,4, las
  dos hojas corridas sobre su riel, piso pisable, cuatro paredes de colisión, tubos de luz, líneas
  de seguridad, cajones y banco de trabajo. El techo salía negro porque el metal sin mapa de entorno
  no devuelve la lámpara: va en panel pintado mate.
- **`cajaP` gira en X y en Z, nunca en Y**: los cajones y las bolsas de arena salían volcados, y
  `cil` acuesta en Z, así que **las ruedas de los camiones miraban para adelante como platos** y la
  manga de viento apuntaba mal. Van `cajaY` y `cilX`.
- **Las losas de 0,4 a 0,9 m te hundían los pies** (dique de 0,9, garita de 0,4, hangar de 0,5):
  ahora son losas bajas con piso.
- **El portón estaba 74 m adentro de un cerco sin hueco.** El frente del cerco pasa por el pórtico y
  deja el paso entre los postes; las barreras están levantadas y la garita va al costado del paso.
- **44 pilares viejos del mundo grilla** seguían tirados al azar entre 14 y 100 m, sin colisión: uno
  estaba adentro del hangar. Son las **balizas del camino de acceso**, afuera del portón, con un
  camino de asfalto nuevo de 16 m (a 256 × 1024: con 128 px para 16 m la raya del medio medía un metro).
- Cajones, bidones, bolsas de arena, manga y bandera ahora frenan; los cajones de estacionamiento
  pintados están donde están los camiones y no debajo de los contenedores.

Lo que costó una vuelta:
- **Dos TDZ más, esquivados antes de que salieran**: `MAT_FRANJA` y `MUROS` se declaran más abajo de
  donde los necesitaban `construirNave` y los pilares. La franja usa un material propio de la nave y
  la colisión de las balizas la carga la base, que corre después.

Medido: al hangar se entra y el piso da 0,15; el costado frena en x −17,58; el portón deja pasar y el
cerco al lado frena en z −29,28; ningún pilar quedó adentro del cerco. Auditoría completa (pasto,
escaleras, fotos, terminal, seis galaxias, aterrizaje) **sin errores**, 56 a 61 llamadas de dibujo.

### 2026-09-22 (u) — el juego se juega apaisado
**Pedido textual:** «Puedes girar el juego 90°».

Mismo patrón que el Bosque: todo el juego (lienzo, HUD, paneles, copia de la foto, pantalla de
carga) vive adentro de un `#stage` que se gira 90° cuando la pantalla está vertical, así que con el
celular parado se juega acostado. Con la pantalla ya horizontal no se gira.

- `medir()` mide en píxeles reales con `visualViewport` y escribe a mano el ancho, el alto y el giro
  del escenario (`vh`/`vw` mienten en el celular). Escucha `resize`, `orientationchange` y el
  `resize` del `visualViewport`.
- **Cada toque se pasa a coordenadas del escenario**: girado 90° a la derecha, `(x, y) → (y, W − x)`.
  La palanca sigue en la mitad izquierda *del escenario*, y la mirada y la palanca usan los mismos
  ejes que antes.
- **El campo visual se ajusta**: 60° verticales en apaisado son 103° de horizontal, ojo de pez. Va
  54 (95° de horizontal) y 62 corriendo.

Medido a 412 × 892: escenario 892 × 412 girado, aspecto 2,165; arrastre hacia la derecha del
escenario → yaw −0,55; hacia abajo → mirada −0,43; palanca adelante → 4,56 m hacia adelante y 0 de
costado. Acostando el celular en caliente el escenario queda 892 × 412 sin girar, y al pararlo
vuelve a girar. Auditoría completa y 70 toques al azar sin errores.

Lo que costó una vuelta:
- **`vh`/`vw` miden la pantalla, no el escenario girado**: los paneles tenían `max-height:82vh` =
  731 px en un escenario de 412. Van en `%` del contenedor fijo.
- **La copia de la foto se salía por abajo** (terminaba en 566 con 412 de alto): un `%` en el
  `max-height` de un ítem de grilla no agarra porque la fila no tiene alto definido. Va en
  `vmin`/`vmax`, que son el lado corto y el largo de la pantalla — justo el alto y el ancho del
  escenario, gire o no.
- **Las capturas del banco salen giradas**, igual que en el Bosque: se enderezan con
  `Image.rotate(90, expand=True)` antes de mirarlas. Y las cajas del HUD se miden con `offset*`,
  no con `getBoundingClientRect`, que en un marco girado infla la caja.

### 2026-09-22 (v) — la guía: luz, niebla, revelado y sombras
**Pedido textual:** «Con esta guía mejora el juego en un 100% si necesitas la key de Rezona dámelo
y no uses highsfield» (con `GUIA-JUEGOS.md` adjunta) y, a mitad de camino, «Le hace falta sombras
JAJAJJ».

**Rezona volvió a fallar** con la credencial andando: `CREDIT_RESERVE_FAILED` en imagen y en audio
(el de audio se aceptó y falló después, como en `perro/`). No hace falta otra llave. Se siguió el
plan B de la guía (sección 8): todo lo que no cuesta créditos, y nada de Higgsfield.

**Luz que sale del sol pintado.** Se midió el sol en el panorama (1,8° de alto, dirección
(0,203; 0,032; −0,979)): el panorama sube 8° y la luz va con el mismo acimut a 16°, así las
sombras son largas y vienen de donde se ve el sol. Sol 6,4, cielo 0,30, contraluz 0,18. En el
mismo pedazo de piso con el sol prendido y apagado, el sol aportaba 0,51 veces el ambiente y
ahora 1,26 (la guía pide que nunca gane el ambiente).

**Niebla con el color medido** de la bruma del horizonte (`e08853`, dorada `e8a55a` hacia el sol),
exponencial 0,0018 más una bruma baja de 0,0048 que cae cada 9 m, integrada a lo largo del rayo.
Los parches van encadenados con su clave de caché, una sola vez por material.

**Revelado en HDR**: la escena se dibuja en coma flotante con multimuestra ×4, el brillo sale de
una cadena ½ → ¼ → ⅛ con gaussiano en cada escala, y al final el ACES de three (la misma curva de
antes), grano, viñeta y un pelo de aberración. El umbral del brillo se acomoda como el ojo: 4,0 al
sol (la chapa al sol llega a 4-6 lineal y no puede encandilar entera) y 2,2 adentro o en el
espacio, donde lo que pasa de ahí son lámparas, ojos y estrellas. Las fotos siguen saliendo: el
papel promedia 144,6 en tierra y 99,4 en el espacio.

**Sombras** — tenía razón: casi nada proyectaba. La nave tenía `castShadow = false`, la base entera
sólo recibía, y el cuerpo del jugador estaba en `visible = false`, que para three también lo saca
del mapa de sombra. Encima, como la nave no tapaba el sol, **la bodega estaba iluminada por el sol
a través del techo**. Ahora todo lo sólido proyecta y recibe con `DoubleSide` (si no, las caras
sueltas de la cáscara no tapan nada), el cuerpo escribe sin color ni profundidad para que sólo
quede su sombra, la caja de sombra pasó a ±40 m con el sol a 110 m (la torre a 70 m también
cuenta), y el sesgo bajó a −0,00022 porque con 240 m de fondo el de antes despegaba la sombra
14 cm del pie. Medido en el piso: detrás de la nave 18 contra 88 al sol, detrás del hangar 27
contra 66. El sol bajo entra por la compuerta de popa y deja una mancha de luz larga en la bodega.
Adentro las lámparas no proyectan (una puntual con sombra son seis pasadas de toda la nave):
van **sombras de contacto** debajo de mesa, terminal, cajones, escalera, consolas y asientos, y
una franja al pie de los racks — medido, el piso ahí baja de 67 a 31. Llamadas de dibujo en
tierra: de 38 a 83, por la pasada de sombra.

Lo que costó una vuelta cada uno:
- **Sin stencil, three le da a un target profundidad de 16 bits.** Con `stencilBuffer:true` pasa a 24.
- **Un borrón ralo a ¼ dibuja copias sueltas de cada punto**: un reflejo de 113 en el puente salía
  como una cuadrícula. Va la cadena de mitades y un tope de 24 a lo que entra al brillo.
- **El ACES de Narkowicz no es el de three**: sin las matrices satura las luces y la base salía
  amarilla. Se copió el de three.
- **La plataforma a veces no se dibujaba** (1 de cada 4 cargas, también en la versión anterior): el
  suelo eran dos triángulos de 3 km y no alcanzaban para separar 3 cm de asfalto. Suelo partido en
  celdas de 125 m y corrimiento de profundidad en los calcos: 8 de 8 cargas bien.
- El `dt` nunca negativo, el lienzo se cambia de tamaño al empezar el cuadro, y al perder el foco
  se sueltan palanca, mirada y teclas.

Auditoría completa (pasto, escaleras, fotos, terminal, paneles, soga, seis galaxias) sin errores
ni avisos.

**Segunda parte, lo que faltaba de la guía:**
- **Relieve**: mapas de normales sacados de la luminancia de las mismas texturas (lo oscuro es lo
  hondo), con diferencias que dan la vuelta para que también se repitan. La chapa remachada pasó
  al hangar, los contenedores, los tanques y las paredes de adentro, **conservando el color medio**
  de cada material (el color se divide por el promedio lineal de la textura). El hormigón es de
  código: ruido en cuatro octavas sobre rejillas que dan la vuelta, con poros.
- **Polvo en el aire**: 720 motas en una caja de 10 × 5 × 10 m que viaja con la cabeza y da la
  vuelta en el vértice. Brillan mirando al sol (el polvo desvía la luz hacia adelante), adentro
  apenas, en el espacio no hay. Una sola llamada. Medido: 183 píxeles con mota mirando al sol.
- **Pulso de mano**: la mirada respira y se corre un pelo también quieta; flotando, más.
- **Sonido, todo sintetizado** (Web Audio), buscando antes cada efecto por nombre en
  `window.SONIDOS` para que lo que genere Rezona lo pise sin tocar código: pisadas distintas en
  chapa y en asfalto (en el fondo del cabeceo), salto y caída, clic, obturador con el trinquete
  del arrastre, tomar la cámara, venta, compra, negado, esclusa, salto de galaxia, encendido,
  golpe de la compuerta, soga tensa, latido, y un quejido lejano cuando aparece un bicho, paneado
  donde está. Capas continuas: viento con ráfagas, zumbido de la nave, motor según el vuelo, la
  compuerta mientras se mueve, la respiración adentro del casco en la caminata, el chorro de los
  impulsores, y dos sierras graves que baten cuando un coloso se acerca. Reverberación armada al
  arrancar (−60 dB a los 2,6 s). Arranca con el primer toque y se suspende con la pestaña
  escondida. Medido: los 16 efectos dan señal, viento 0,023 RMS, zumbido adentro 0,034, una
  pisada en chapa 0,063 encima; caminando 4 s adentro, 7 pisadas de chapa.
- **Compilación al cargar**, contra el target HDR (contra el lienzo compilaría otra variante).

Lo que costó una vuelta:
- **Una sonda que apaga algo con `visible = false` no sirve si el juego lo prende cada cuadro**:
  las motas «no se dibujaban» porque `pasoMotas` las volvía a prender adentro del mismo
  `brillo()`. Se apaga el material.
- Con el grano prendido **dos dibujos seguidos nunca son iguales**: para comparar con y sin algo,
  el grano va en cero.

Auditoría completa y 80 toques y arrastres al azar sin errores.

### 2026-09-22 (w) — la base tiene gente
**Pedido textual:** «Agrégale más cosas a la base de la tierra, npc's que caminen y le den vida,
detallitos».

**Diez personas con rutina propia**, todas del mismo militar riggeado del jugador:
- dos **centinelas** con casco y fusil a la espalda que recorren el cerco (oeste y este);
- dos **mecánicos** de chaleco naranja: uno va de la rampa al banco del hangar, el otro trabaja
  al costado del casco (con su carro de herramientas) y va hasta los contenedores;
- uno que **trota** una vuelta grande por el noreste de la plataforma;
- el **guardia de la barrera**, que mira la ruta y cada tanto para otro lado;
- **dos que charlan** al pie de la torre, mirándose;
- el **señalero** frente a la nariz de la nave, con bastones de luz en las manos;
- uno que trabaja en el **banco del hangar**.

Te siguen con la cabeza cuando pasás cerca (hasta 1,1 rad), se dan vuelta si te les parás
encima, frenan si les cortás el paso y no se atraviesan (quedás a 0,62 m). Sus pisadas se oyen
donde están, y cada 14 a 34 s a alguno le habla la radio.

**Detallitos:** remolcador amarillo que da vueltas por el frente de la plataforma con baliza
giratoria, faros, ruedas que giran y motor que suena donde está (frena si le cortás el paso y a
los 0,8 s toca bocina); balizas rojas de aviación en la torre, el hangar y las torres de luz
(destello cada 1,4 s); **bandera** y **manga de viento** que flamean con el mismo viento que suena;
siete **carroñeros** planeando en círculos que cada tanto aletean; conos con banda reflectiva,
jeep al lado de la garita, cisterna de combustible, pallets con cajas y el carro del mecánico.

Medido en el banco: 15 minutos de juego sin que nadie quede trabado más de medio segundo fuera
de sus pausas (los centinelas completaron 41 y 45 tramos, los mecánicos 69 y 58, el que trota
135), el remolcador dio 21 vueltas, y **ningún choque contra la base** muestreando cada medio
segundo. Desde la entrada se ven 9 personas: 157 llamadas y 232 mil triángulos.

Lo que costó una vuelta cada uno:
- **`clone()` de un modelo riggeado comparte el esqueleto**: los diez bailarían con los huesos
  del primero. Se clona el árbol y se arma un `Skeleton` nuevo con los huesos de la copia.
- **Colgar algo de un hueso hereda su escala y su giro**: un intermedio los deshace en la pose de
  armado (el muñeco en el origen y mirando +Z), y desde ahí todo va en metros y derecho.
- **El abrazo mortal**: el centinela esperaba al remolcador y el remolcador al centinela, y no se
  movían nunca más. El que ya está en el carril del remolcador sigue para despejarlo.
- Cinco accesorios por persona eran **172 llamadas**: cada accesorio es una sola malla, no entra en
  el mapa de sombra, y las personas fuera de cuadro no se dibujan (el cuerpo deformado no trae una
  esfera confiable, se prueba una propia). Desde adentro de la nave el casco tapa todo: se dibuja
  sólo a quien se vería por la compuerta o el ventanal — de 218 mil triángulos a 93 mil.
- **Un problema de sonido no puede cortar el cuadro**: un NaN en el motor del remolcador tiraba una
  excepción adentro del dibujo. Todas las entradas del sonido van envueltas.
- La base baja con `mundo` al despegar pero sus posiciones son locales: el motor del remolcador y
  las pisadas de la gente se hubieran seguido oyendo en el espacio.

Auditoría completa y 80 toques al azar sin errores.

### 2026-09-22 (x) — oclusión ambiental: la sombra que no depende del sol
**Pedido textual:** «Hey agrega sombras con eso servirá para hacerlo ver 3A ya».

Las sombras del sol ya estaban desde la vuelta (v). Lo que faltaba para el look AAA es la otra
mitad: la **oclusión ambiental**, la sombra que se junta en rincones, contactos y debajo de las
cosas aunque no les pegue el sol. Va en pantalla (SSAO), a media resolución: 8 muestras en una
semiesfera alrededor de la normal de cada pixel, giradas con ruido de gradiente intercalado, de
1,1 m de radio, con curva 1,5 para que el rincón quede hondo y lo abierto igual, un borrón que no
cruza bordes de profundidad, y apagada entre 26 y 75 m (lejos manda la niebla). Se aplica en
lineal, antes del brillo.

También: los bichos chicos proyectan y reciben sombra (en el espacio la base no está y el
presupuesto sobra), la sombra de la gente llega a 38 m (la caja de sombra llega a 40), y los
accesorios reciben sombra aunque no la proyecten.

Medido: en la bodega el mapa de oclusión da mínimo 16 sobre 255 en los rincones y limpio en el
piso plano; las fotos siguen saliendo (papel 145,8 en tierra, 95,9 en el espacio); tres llamadas
de dibujo más por cuadro, todas a media resolución.

Lo que costó una vuelta:
- **La profundidad sale del mismo dibujo.** Con una `DepthTexture` (24 bits con stencil, el mismo
  formato del renderbuffer) colgada del target con multimuestra, three la copia al resolver: no
  hace falta otra pasada de geometría, que con diez personas y la base serían otras cien llamadas.
- **La normal se saca del vecino de menor salto** (a la derecha o a la izquierda, arriba o abajo):
  con la diferencia de un solo lado, cada borde de un objeto inventaba oclusión en el fondo.

Auditoría completa y 80 toques al azar sin errores.

### 2026-09-23 (y) — tutorial hasta la primera venta
**Pedido textual:** «Ahora agrega un tutorial cuando comience el juego donde se expliquen los
controles básicos y el objetivo del juego, el tutorial debe acompañar al jugador durante sus
primeras fotos y primeras ventas».

Tarjeta arriba al centro con el número de paso, título, texto, barra de avance y «saltar
tutorial». **Cada paso se cumple haciendo la cosa**, no tocando «siguiente» (sólo el primero y el
último tienen botón): se pone verde, suena y pasa al que sigue. Un **marcador en 3D** (flecha que
baja y aro en el piso, sin profundidad para verse a través del casco) señala adónde ir, con la
distancia en metros en la tarjeta.

Los 13 pasos: bienvenida con el objetivo (fotografiar, vender, mejorar, llenar el álbum de 21) ·
caminar con la palanca (3 m) · mirar con el otro dedo · subir por la rampa · tomar la cámara de
la mesa · despegar · subida · salir por la compuerta de popa · flotar · primera foto (el marcador
va al alien más cercano; si la foto sale velada lo dice) · volver a entrar · vender en la
computadora · qué se hace con los créditos (cámaras, mejoras, motores, carta de navegación y
álbum). Terminado o salteado, queda anotado en el navegador y no vuelve.

Medido en el banco, jugando cada paso como el jugador (el EMPEZAR y el LISTO tocados con el
dedo): los 13 pasos en orden, el marcador prendido en rampa, mesa, compuerta, alien y
computadora, el aviso de placa velada, y `aliengrid.tutorial = hecho` al final.

Lo que costó una vuelta:
- **Medir la caminata por cuadro no sirve cuando el cuadro dura mucho**: un salto de más de 2 m
  entre cuadros se descartaba como teletransporte y el paso CAMINAR no se cumplía nunca. Se mide
  en cada paso de física.

Auditoría completa y 80 toques al azar sin errores.

### 2026-09-23 (z) — BAJAR en la caminata y el casco sólido
**Pedido textual:** «Haz que cuando el jugador esté en el espacio exterior haya también un botón
para bajar (La manera en la que está ahora está bien solo que falta un botón que haga que el
jugador flote hacia abajo para no perderse) (También arregla el error de traspasar las paredes
cuando el jugador esté flotando)».

**Botón BAJAR** al lado del de salto, sólo en la caminata; ahí el salto pasa a llamarse **SUBIR**.
Los dos igual: un toque da un envión de 3,2 m/s y sostenido sigue empujando a 5 m/s² (todo
escala con los impulsores del traje). Medido con el dedo: BAJAR sostenido 1,5 s llega a −5,1 m/s
y baja 9,6 m.

Además, lo que había debajo: afuera **el botón de salto hacía el salto de tierra** (9,2 m/s de
golpe) y, como el contador de saltos sólo se reinicia al pisar, **servía dos veces por salida**.
Ahora cada toque da el mismo envión: cuatro toques seguidos, cuatro de 3,1 m/s.

**Traspasar las paredes flotando:** los muros son verticales y tienen alto, así que por arriba
del lomo o por debajo de la panza no había nada que frenara. Ahora el casco es **sólido en 3D**
con 18 cajas medidas de `construirNave` (panza, lomo, proa, popa afinada, alas, motores, aletas y
patas), y el cuerpo como caja de 0,84 × 1,7 m que sale por el lado de menor penetración. Medido
empujando con la palanca: la panza frena en x −8,32, el motor en z 13,98, el ala en x −14,02 y
bajando sobre el lomo se queda en y 9,4 — **cero cuadros adentro** en los siete tiros.

Lo que costó una vuelta:
- **La soga tira en línea recta a la compuerta** y puede meterte hondo en el casco; ahí la panza
  y el lomo se pasaban al jugador de uno a otro sin sacarlo nunca (113 cuadros adentro en un
  tiro). Si después de empujar sigue adentro, vuelve a la última posición libre y la soga queda
  tensa contra el casco.

Auditoría completa y 80 toques al azar sin errores.

### 2026-09-23 (aa) — menú principal, tres idiomas y tres calidades
**Pedido textual:** «Ahora agrega un menú principal antes de que inicie el juego donde habrán 3 opciones.
Una opción para iniciar el juego / Otra para cambiar el idioma, español, inglés y portugués (cuando el
juego se traduzca a un idioma debe ser traducido al 100%) / Un botonnoara elegir la calidad gráfica
(alta, media y baja)».

**Menú** encima del juego ya cargado: logo, lema, `JUGAR` y un panel con `IDIOMA` (ESPAÑOL /
ENGLISH / PORTUGUÊS) y `CALIDAD GRÁFICA` (ALTA / MEDIA / BAJA, con una línea que dice qué cambia).
Atrás la cámara se pasea despacio frente a la popa, con la base viva (gente, remolcador, pájaros).
Mientras está abierto no se arma la palanca, no corre el tutorial, no hay HUD y el cuerpo
invisible del jugador no deja su sombra. Idioma y calidad quedan guardados en el navegador.

**Traducción:** `tr(frase, …)` con la frase en castellano como clave y `{0}`, `{1}` para números y
nombres; 260 frases en inglés y portugués: HUD, carta, terminal, tienda, álbum con las 21 fichas,
fotos (anotación y pie de la copia), los 80 epítetos de los bichos, el tutorial entero, los
carteles pintados en la plataforma y la pantalla de la terminal (se repintan al cambiar), y
«CARGANDO», que se traduce antes de que cargue three. Las tablas (galaxias, cámaras, mejoras,
motores, fichas) se traducen en el lugar guardando el original. Lo que falte queda en `TR_FALTA`.

**Calidad:**

| | resolución | sombra | multimuestra | oclusión | brillo | motas | gente se dibuja / hace sombra |
|---|---|---|---|---|---|---|---|
| alta | ×2 | 2048 suave | 4 | ½ res | sí | 720 | 85 / 38 m |
| media | ×1,5 | 1024 suave | 2 | ¼ res | sí | 380 | 70 / 22 m |
| baja | ×1 | 1024 PCF | 0 | no | no | 0 | 55 m / sin sombra |

Lo que costó una vuelta:
- **El botón de la nave decidía qué hacer leyendo su propio texto** (`=== 'DESPEGAR'`): traducido,
  no despegaba nunca. Ahora la acción va en `data-k` y el texto es sólo lo que se ve.
- **La multimuestra se fija al armar el target**: cambiar `samples` no hace nada hasta tirarlo
  (`dispose`) y que three lo rearme. Y el tipo de sombra va compilado en cada material: cambiarlo
  pide `needsUpdate` en todos.
- **Los carteles de la plataforma van debajo de las rayas del rodaje**: repintar sólo las letras
  las dejaba encima. Se repinta el lienzo entero.
- Las sondas del banco llaman `paso()` directo: con el menú abierto no pasaba nada. Van con
  `__A.jugar()` después de cargar.

Medido: auditoría completa en inglés (calidad alta), portugués (baja) y castellano (media): 14 de
14, **`TR_FALTA` vacío** en los dos idiomas, cero frases con tildes o «de/que/la/el» en carta,
terminal, álbum, HUD y los 13 pasos del tutorial en inglés. Tutorial entero en portugués hasta
«hecho». Fuzz en inglés y calidad baja sin errores. Con la misma resolución, baja da 4,0 cuadros
contra 2,3 de media en el banco (sin GPU), y 136 llamadas contra 164 de alta.

### 2026-09-23 (ab) — pasada de errores: 22 fallos reales
**Pedido textual:** «Ahora quiero que arregles TODOS los posibles fallos o errores existentes dentro del
juego, confío en ti».

Tres revisiones del código por partes (render/nave/base/fotos, bichos/EVA/gente, entrada/HUD/
tienda/tutorial/menú) y sondas en el banco para los casos raros. Cada hallazgo se verificó contra
el código antes de tocarlo, y cada arreglo se midió.

**Fotos**
- **La copia sacaba sólo la franja del medio** (37% del ancho en apaisado) pero el bicho contaba,
  cobraba y entraba al álbum en toda la pantalla: fotos pagas donde no salía nada. La copia ahora es
  apaisada hasta 3:2, **sólo cuenta y paga lo que entra en el recorte**, el encuadre se mide contra
  el recorte y el visor dibuja justo eso. Medido: bicho en x 0,85 y 0,75 → placa velada; 0,5 y 0 → cobra.
- **Se fotografiaba a través del casco**: desde la bodega mirando a la pared contaba el bicho de
  afuera. Adentro de la nave sólo cuenta lo que se ve por el ventanal o por la compuerta abierta.
- **El fogonazo no se veía nunca**: el 0,92 y el apagado caían en el mismo cálculo de estilo. Ahora
  0,92 → 0,68 → 0 en 600 ms.
- El pie de la copia decía «RAREZA 1» con la terminal en 0,0, y «ESPECIE N°» era el contador de
  fotos: ahora la misma rareza y el número del álbum.
- Carrete lleno de placas veladas: la terminal decía «NADA QUE VENDER» apagado y era la única
  salida. Dice **DESCARTAR CARRETE**, la pantalla «[ CARRETE VELADO ]» y el tutorial lo explica.

**Toques y botones**
- **Deslizar la terminal o la carta compraba, vendía o saltaba de galaxia** (las filas respondían al
  apoyar el dedo). Ahora se eligen al soltar sin haber arrastrado. Medido: arrastrar sobre LUCES no
  compra, tocar sí.
- La carta se cerraba con cualquier toque adentro: ahora sólo tocando afuera.
- **Toque fantasma**: cerrar la copia tocando encima de FOTO sacaba otra foto por el mousedown de
  compatibilidad. Se descarta el mousedown cerca de un toque. Medido: una foto, no dos.
- SUBIR quedaba apretado si el sistema cancelaba el toque; el mouse soltado afuera también.
- El chip invisible del álbum se abría tocando la esquina antes de la primera foto.
- Con un panel o la copia abiertos se seguía caminando con el teclado, y la repetición de la tecla
  hacía doble salto sola.
- El aviso «Vendé el carrete…» tapaba los créditos para siempre.
- **El audio no arrancaba con el primer toque en el celular**: apoyar el dedo no cuenta como gesto,
  soltarlo sí.

**Vuelo, luz y bichos**
- **La compuerta se abría de golpe en el espacio al empezar a aterrizar** y volvía a cerrarse (dos
  golpes de más): iba atada a `e.t`, que se reinicia. Ahora va a su meta a su ritmo. Igual las toberas.
- **Tirón al despegar y al llegar a EL VACÍO**: esconder `mundo` sacaba tres luces de la cuenta, y
  los colosos traían la suya; cambiar cuántas luces hay recompila todos los materiales. Ahora las de
  la base van en la escena y se apagan, y los colosos usan dos focos fijos que se prenden.
  Medido: 15 luces y 26 programas en tierra y en el espacio.
- El foco de un coloso llegaba a 600 m y alumbraba la nave por dentro (las puntuales no hacen
  sombra): ahora alcanza su propio cuerpo.
- Aterrizar con un coloso cerca dejaba el velo rojo, el temblor y el aviso para siempre en tierra.
- El cuerpo quedaba inclinado 10° después de la primera caminata (y con él la cámara de la mano).
- Los bichos que se metían en la nave se probaban por la base del cuerpo y salían siempre hacia −z,
  cruzando la nave: ahora por el centro, con su radio, y por el lado más corto.

**Construcción y repuestos**
- Las barreras del portón estaban dibujadas al revés (el brazo bajo en medio del paso y el alto
  sobre el poste).
- La chapa oscura de la nave se volvía gris clara al llegar la textura del casco.
- Si el GLB no llegara, el cuerpo de repuesto se dibujaba delante de la cámara.

Lo que costó una vuelta:
- **Otro TDZ, el cuarto**: `LUCES_BASE` se usaba en la base antes de declararse y la página moría
  en blanco. Subió arriba con `MENU`. Regla: toda tabla que llene la construcción va arriba de todo.

Medido: auditoría completa 14/14 en castellano, `TR_FALTA` vacío, fuzz en inglés y calidad media
sin errores, tutorial entero hasta «hecho», cinco ciclos seguidos de despegar-salir-fotos-vender-
aterrizar con geometrías, texturas, nodos y memoria estables (82 / 38 / 437 / 23 MB).

### 2026-09-23 (ac) — ambiente sonoro por lugar, y EL VACÍO pesa
**Pedido textual:** «Quiero que agregues sonidos ambientales a cada lugar en el que este el jugador, la
base, la nave y cada galaxia, haz que la atmósfera de "el vacio" sea pesada así un ambiente pesado me
entiendes».

Rezona sigue con `CREDIT_RESERVE_FAILED` (imagen, audio y 3D, probado a las 03:28-03:31), así que todo
es sintetizado en Web Audio, y cualquier `window.SONIDOS` generado lo sigue pisando.

Cada lugar tiene un **lecho** (capas continuas que se arman al entrar y se paran 4 s después de
salir) y **sucesos** sueltos cada tantos segundos alrededor del jugador:

| lugar | lecho | sucesos |
|---|---|---|
| base | generador que late, grillos en tandas, rumor de ruta | golpe metálico lejano, avión que cruza alto, perro de guardia |
| nave | aire que circula, ventilador con aspas, línea eléctrica | el casco que se queja, relé, consola que avisa, caño que golpea |
| Vega Rota | acorde hueco que se desafina, soplo de polvo | crujido de polvo, un tono triste que se cae |
| El Hervidero | retumbo grave, rugido que respira, crepitar | chasquidos de algo que arde, llamarada |
| La Quietud | un zumbido de oído finísimo y casi nada | un golpe lejísimos, una copa de vidrio |
| Coral Profundo | oleaje lento bajo el agua | burbujas, la ballena |
| El Reverso | colchón que se desfasa y va y vuelve | campana al revés, golpe que llega antes de sonar |
| **EL VACÍO** | presión de dos sierras a 31 y 31,6 Hz que baten, tritono abajo, ruido pardo, respiración del lecho entero cada 9 s, racimo disonante arriba | algo enorme gime, impacto lejano, metal que raspa, un corazón que no es el tuyo |

La galaxia suena entera en la caminata y **apagada por el casco** desde adentro (pasabajos a 760 Hz).
En EL VACÍO además **se aprieta la mezcla entera** (un pasabajos de 18 kHz a 3,2 kHz antes del
compresor) y pesa a la vista: la viñeta pasa de 0,28 a 0,52, el grano de 1 a 1,7 y la exposición late
un 11% al mismo ritmo que respira el sonido.

Lo que costó una vuelta:
- **En el parlante de un celular 31 Hz no suena**: lo que se oye son los armónicos. La presión va por
  un pasabajos a 170 Hz, no a 60, para que queden 62, 93 y 124.
- **La foto dibuja con `dibujar(0)` y su propia exposición y sin grano**: lo visual del VACÍO sólo se
  aplica con el tiempo corriendo, si no pisaba el fogonazo de la copia.

Medido con el audio andando: en la base 38% de la energía en graves y 61% en medios; adentro de la
nave 73% graves; en EL VACÍO **93% graves y 0,2% agudos**, con la mezcla apretada a 3,7 kHz, y el
lecho más fuerte (0,077 RMS contra 0,03-0,05 de las otras). Las seis galaxias arman su lecho y
disparan sus sucesos. Auditoría 14/14, fuzz en portugués y fotos en las tres calidades sin errores.

### 2026-09-23 (ad) — A LOS SALTOS, gladiadores 2D pixel art
**Pedido textual:** «genera un nuevo juego está vez 2D pixel art con este estilo usa este md para aprender a
hacer juegos 2D únicos que no se repitan entre sí, y busca información sobre este juego para recrearlo»
(con una captura de **Gladihoppers**, de Dreamon Studios, y `GUIA_JUEGOS_2D_PIXEL.md`, que quedó en `docs/`).

Lo que se sacó del original (sitio de Dreamon, reseñas y tiendas; la wiki de Fandom no dejó entrar):
pelea 1 contra 1 con física, los gladiadores **no caminan: saltan**, dos posturas con ataques
direccionales, escudo, jabalina, controles por gestos o botones, carrera con edad, fama y monedas,
tres reclutas (gratis, 50 y 100), una mejora de atributo por victoria, siete clases con FUE/RES
distintas, muerte permanente con **estatua**, sangre en píxeles y miembros que se cortan.

`juegos-pc/Saltos.html` (111 KB, un solo archivo, cero red), siguiendo la guía:
- **Escala entera de verdad**: el mundo se dibuja chico y se agranda por un número entero de
  píxeles REALES del dispositivo (8 en un 412×892 a 2,625) — en píxeles CSS la escala daba 2,6.
- **Personajes por piezas**: cabeza/casco (siete: pez, grifo, liso, penacho, gálea, pelado con
  barba, pelo con vincha), torso con coraza encima (cuero, escamas, lorica) y escudo horneados de
  grillas con roles de color; brazos, piernas y **armas dibujados píxel por píxel a cualquier ángulo**
  (gladio, sica curva, spatha, hacha, bipenne, maza, rompecráneos, lanza, tridente).
- **Física**: pies en el piso, cadera sobre piernas que se comprimen, torso con resorte que lo
  endereza, brazos con motor hacia su ángulo. Mantener ◀/▶ carga el salto (un toque ≈ 18 px, medio
  segundo ≈ 54). El golpe vale por la **velocidad de la punta** del arma.
- **Seis partes con vida** (cabeza, torso, dos brazos, dos piernas) con armadura propia. Brazo
  cortado suelta el arma o el escudo, pierna cortada casi no deja saltar, cabeza o torso deshechos
  matan, y la sangre se va. La sangre queda pintada en la arena. Bloqueo con el escudo por
  geometría, paradas arma contra arma con chispas, golpe que frena y sacudida.
- **Clases**: mirmillón, tracio, retiario (tridente y **red** que enreda), secutor (casco liso donde
  la red casi no agarra), hoplómaco (lanza y dos jabalinas), dimaquero (dos espadas) y fanático.
- **Carrera**: reclutas, ludus, tres rivales por fama (fácil/parejo/difícil) y el campeón del
  coliseo, mercado de cinco rubros, médico, salud que se arrastra, edad (desde los 31 se pierde
  algo cada cumpleaños, a los 38 retiro), y **salón de estatuas** en piedra con el mismo sprite.
- Portada viva (dos IA peleando atrás del título que cae y ondula), pelea rápida, ajustes (sangre
  mucha/poca/nada, sonido, botones o gestos, vibrar), ayuda, y sonido todo sintetizado: metal,
  madera, carne, cortes, la multitud que ruge con la emoción, tambores de pelea y una melodía en
  frigio dominante en el menú.

Lo que costó una vuelta:
- **Peleas de 6 segundos y 41 de 49 decapitaciones**: un tajo rápido a la cabeza hacía 49 contra 27
  de vida. Más vida por parte, velocidad que paga hasta ×1,45 y decapitar sólo con cortes de más
  de 17: mediana de 11 s y 10 golpes, mitad de las muertes por decapitación.
- **Un contador con decimales pasaba de largo el cero**: `caido = 86 − 1,6·AGI` y se descontaba de a
  uno; quedaba en −0,8, que es verdadero, y el gladiador se quedaba «caído» para siempre (dos peleas
  de 150 s sin final). Entero y topado en cero.
- **El salto cargado cruzaba media arena** (110 px de 184): bajó a 54.
- Los carteles se encimaban («¡DECAPITADO!» sobre «¡MUERTO!» sobre «¡BRUTAL!»); el nuevo sube.
- Las armas cortadas seguían girando en el piso y quedaban clavadas de punta.
- La fuente de píxeles no tiene ◀ ▶: los consejos van en palabras de hasta 22 letras (136 de ancho).

Medido: IA contra IA en las 49 combinaciones de clases, **49 de 49 terminan** (4 a 29 s), cero NaN,
cero errores; todas las clases ganan alguna. Toques reales por CDP: saltos a los dos lados, los
cuatro ataques, guardia, **dos dedos a la vez**, postura, jabalina y pausa; en gestos, tocar,
deslizar arriba/abajo/hacia el rival y para atrás. Carrera completa: recluta, cuatro victorias con
mejora, salud que baja 100 → 63 → 47%, mercado, muerte y estatua. 3,4 ms por cuadro en vertical
(200 de calentamiento, 300 medidos).

### 2026-09-23 (ae) — A LOS SALTOS: pixel art con el doble de detalle
**Pedido textual:** «Haz el pixel art más detallado».

**El doble de resolución sin cambiar el tamaño**: la física, las zonas de toque y el HUD siguen en
unidades, pero el mundo se dibuja en una grilla **fina** de 2×2 por unidad (`DET = 2`). El lienzo
del mundo es de 272×586 en un 412×892 y se agranda ×4 píxeles reales (entero), así que los
personajes miden lo mismo con **cuatro veces más píxeles**. Todo redondea a la grilla fina (`rf`)
y los grosores se piden en píxeles finos.

**Sprites con detalle de verdad**, sin redibujar cada grilla a mano:
- **Scale2x** sobre la grilla de roles: redondea las diagonales y no inventa colores.
- **Sombreado por luz de arriba a la izquierda**, píxel por píxel: brillo del lado de la luz, sombra
  en dos pasos del otro, destello en el metal, trama en cuero y tela, poros en la piel, y el
  **contorno del lado iluminado teñido** del color de adentro (el del otro lado queda negro).
- La coraza se funde con el torso **antes** de agrandar, así el sombreado ve la silueta entera.
- Las rejas de los cascos pasaron de cuadros a **barrotes verticales**: agrandados, los cuadros
  formaban dos ojos y los cascos parecían calaveras.

**Lo dibujado por código, a resolución fina**: brazos y piernas con contorno de un píxel, brillo y
sombra a lo largo; grebas con rodillera; sandalias con suela y tiras; manica a cuadros con
brillo; hojas con acanaladura y filo blanco; empuñaduras envueltas en cuero; guardas y pomos de
bronce con volumen; hachas con el filo brillante; mazas redondas con luz y púas; lanzas con nervio
en la punta; jabalinas con plumas; restos cortados con el hueso a la vista; sangre en gotas finas.

**El coliseo**: cielo con degradé en bandas y trama 2×2, nubes de cuatro tonos, arcada con
pilastras, dovelas y fondo de arco, estandartes, escalones con canto y sombra, público de cabeza
(con pelo) y cuerpo (con sombra), vomitorios, palco imperial con columnas, toldo plegado y el
emperador con laurel, sillares del podio con luz y sombra y alguna grieta, friso de meandros,
rejas con remaches, arena con cuatro tonos de grano y piedritas, antorchas con llama de cuatro
tonos, e hipogeo de sillares.

Lo que costó una vuelta:
- **Los discos pintados píxel por píxel duplicaron el costo** (3,4 → 7,3 ms por cuadro): manos,
  rodillas y muñones se hornean una vez por radio y color. Volvió a **3,6 ms**.
- El HUD sigue en unidades: `disco` es de la grilla de unidades (botones) y `discoF` de la fina.

Medido: 49 de 49 peleas de IA contra IA terminan (4 a 29 s) sin errores ni NaN; toques reales,
carrera y menús sin errores; 3,6 ms por cuadro en vertical.

### 2026-09-23 (af) — A LOS SALTOS: gladiadores un poco más humanos
**Pedido textual:** «Haz más humano los modelos de los gladiadores, solo un poco».

- **Proporciones**: piernas de 13 a 14,5 unidades y la cabeza 0,7 más arriba (se ve el cuello), así la
  cabeza pesa menos en el total sin redibujar los siete cascos.
- **Torso de persona**: trapecios, hombros más anchos que la cintura, pecho, abdomen y una faldita
  que se abre sobre los muslos. El músculo se marca con un rol nuevo `Q` (piel al 87%) y no con la
  sombra `P`, que agrandada salía como manchas; también se sacaron los poros. Las corazas salen
  ahora de la forma del torso (patrón por rol sobre la piel), así siguen la silueta nueva.
- **Brazos y piernas que se afinan** (`musculo`/`trazoVar`): bíceps que se afina al codo, antebrazo
  ancho abajo del codo y fino en la muñeca, muslo ancho arriba, pantorrilla que se abulta y se
  afina al tobillo; hombro redondo, rodilla, puño con pulgar.
- **Caras**: ceja, oreja, nariz y boca en el retiario, el fanático y la gálea.
- **Respira**: quieto, torso, cabeza y brazos suben y bajan medio píxel fino con su propia fase.

Lo que costó una vuelta:
- **La faldita salía como dos pompones a cuadros**: la pierna de adelante se dibujaba después del
  torso y le tapaba el medio. Las dos piernas van antes del torso.

Medido: 49 de 49 peleas terminan (4 a 37 s) sin errores ni NaN, toques y carrera bien; A/B contra el
commit anterior en el mismo banco: ~1 ms más por cuadro (6-7 contra 4-6 ms), lejos de los 16,7.

### 2026-09-23 (ag) — A LOS SALTOS: gladiadores un poco más flacos
**Pedido textual:** «Hazlos un poco más flacos, solo un poco entiendes, parecen muy gordos ahora».

- **Torso de 12 a 10 de ancho** en la grilla de roles (antes de agrandar), con el ancla corrida al
  medio nuevo (x 6 → 5); el radio de choque del torso baja de 4,2 a 3,8.
- **Miembros un pixel fino más angostos**: muslo 6→4, pantorrilla 5→3 al tobillo, brazo 5→3,
  antebrazo 4→3, manica 6→5; hombros, rodillas y puños con discos más chicos; los restos cortados
  también.
- Las corazas ahora cubren también el rol `Q` (músculo): con el torso nuevo quedaban huecos de piel
  adentro del cuero y la lorica.

Medido: 49 de 49 peleas de IA contra IA terminan sin errores ni NaN, todas las clases ganan alguna;
toques, carrera y capturas sin errores; 4,9 ms por cuadro en vertical.

### 2026-09-23 (ah) — A LOS SALTOS: cinco tiendas distintas
**Pedido textual:** «Ahora haz que las tiendas no parezcan tan iguales entre sí, haz cada tuenda distinta, agrégale un distintivo».

Las cinco pestañas del mercado eran el mismo panel marrón con otra lista. Ahora cada una es un local:

| tienda | tendero | fachada | cartel y emblema | colores |
|---|---|---|---|---|
| LA FRAGUA DE BRONTES (armas) | herrero pelado con barba que martilla el yunque y saca chispas | ladrillo tiznado, fragua que late, bastidor con 7 armas y el trofeo cruzado de bipenne y rompecráneos | placa de hierro con remaches, yunque | brasa |
| EL ESCUDERO DE OSTIA (escudos) | carpintero con hacha y parma | tablones, pared llena de escudos pintados en cinco colores, caballete con viruta | tabla de madera, áspis | madera y oro |
| YELMOS DE LA VÍA APIA (cascos) | broncista con casco de penacho que lustra un casco liso | sillares de mármol con verdín, dos estantes de cascos sobre cabezas de madera | placa con pátina, casco de grifo | verdín |
| CURTIDURÍA DE MARCIA (corazas) | curtidora con sica cortando cuero | revoque ocre, cueros estaqueados, maniquíes con cuero, escamas y lorica | tabla oscura, lorica | cuero rojo |
| BAZAR DEL FENICIO (otros) | mercader de Tiro con manica violeta y oro | carpa a rayas, alfombra, ánforas, haz de jabalinas, red, grebas y monedas | estandarte con flecos, bolsa | púrpura de Tiro |

- Todo lo que se exhibe es **la pieza del juego** (`dibujarArma`, `ESCUDO_SPR`, `CABEZAS`, `piezas`, `dibujarProy`), no un dibujo aparte.
- Cada fila trae su **vista previa**; cascos y corazas se ven puestos en la cabeza y el torso del propio gladiador.
- El tendero habla: una frase al entrar, otra al comprar y otra si no alcanza. Cada tienda suena distinto al entrar y al comprar.
- Las pestañas llevan el color de su tienda y se prenden con su propio anillo.
- La fachada se repinta a 10 cuadros por segundo y se corta sola cuando sale del DOM. Los horneados van en caché.

Medido: las cinco abren sin errores, con su color de panel; la compra descuenta y el tendero agradece; sin plata no compra y el tendero lo dice; al volver no queda ninguna fachada viva. Carrera y toques sin errores.

### 2026-09-23 (ai) — A LOS SALTOS: pasada de errores
**Pedido textual:** «Ahora corrige cualquier posible error existente dentro del juego, cualquier error por más mínimo que sea, arreglalo».

Se revisó el código por partes: datos, sprites y sonido; física y combate; dibujo y controles; menús, carrera y tiendas. Cada hallazgo se verificó contra el código y los que se podían medir, se midieron.

**Combate**
- **Lo cortado volvía a crecer.** `cortado[k] = 90` era a la vez la marca y el contador del chorro. A los 1,5 s llegaba a 0 y la cabeza, el brazo y el arma volvían al cuerpo: medido, **55 de 55** gladiadores con un corte. Ahora la marca es para siempre y el chorro lleva su propio contador. Medido después: **0 de 55**.
- Con eso apareció una pelea sin final posible: los dos sin brazo del arma y sin segunda. En ese caso los muñones no paran de sangrar.
- El que ganaba podía morir en los 3 s del festejo, por la sangre o por una jabalina en el aire, y la victoria contaba igual. En el cierre ya no se desangra ni le pegan proyectiles.
- **La hoja atravesaba sin tocar**: una punta rápida recorre ~15 unidades por cuadro y la cabeza mide 9. Ahora se prueba también por dónde pasó (hasta 3 cortes intermedios).
- Los golpes del mismo cuadro valen los dos: antes siempre ganaba el primero en la lista, o sea el jugador.
- El salto soltado en el aire sale al aterrizar (el buffer existía pero no hacía nada).
- La red que choca contra el escudo ya no deja una jabalina en el piso.
- La parada con la segunda espada ya no sacude el brazo equivocado.
- El empujón entre cuerpos no mete a nadie en la pared.
- La jabalina empuja hacia donde viaja.
- La puntería de la IA usa la semilla, y un tiro con el rival encima no da infinito.

**Controles**
- **Pausa → ENTREGARSE → NO sacaba de la pelea sin castigo** y dejaba la próxima congelada en «LISTOS...». El NO vuelve a la pausa y cada pelea arranca sin pausa.
- En gestos, **el dedo quieto no daba guardia**: un dedo quieto no manda `touchmove`. Ahora se revisa cada cuadro y la guardia es de cada dedo.
- Un `touchcancel` del sistema tiraba un golpe: ahora sólo suelta.
- El pad de gestos se comía el borde del ▶.
- El clic derecho dejaba un botón apretado.
- Pausar o perder el foco a mitad de una carga de salto lo hacía saltar al volver. Esconder la pestaña pausa la pelea.
- El atraso no se acumula en un celular lento: antes, al aliviarse, la pelea corría ×4.

**Dibujo y HUD**
- El brazo y el arma cortados salían espejados si el dueño miraba a la izquierda. La manica y las grebas cortadas salían siempre del color del tracio. La mancha del cuello de la cabeza caía del lado equivocado.
- Hacha, bipenne, maza y rompecráneos caídos rebotaban para siempre: su piso era −1 y se reponían en −3. Medido: de 288 caídas repetidas a 61, los rebotes naturales.
- Lo caído atravesaba las paredes: el tope salía del medio del arma y no de la punta.
- **Nombres de 9 letras** (CARPÓFORO) pisaban el cuerpito del HUD. El cuerpito va del lado de afuera. Si los dos nombres no entran, se acorta una letra del rival.
- «RED 2 JAB 3» pisaba la pausa: va en dos renglones.
- El ▶ y el escudo se tocaban.
- Los carteles flotantes se cortaban contra el borde.
- Con la sacudida asomaban bandas negras.
- Había público parado encima del palco del emperador.
- Las estatuas tenían el filo blanco.
- El arma y el escudo no seguían al puño al respirar.
- Un error de dibujo dejaba la pila de `save` creciendo.

**Fuente, sonido y escala**
- La fuente no tenía **`$`, `◀` ni `▶`**: «MÉDICO · 45 ?» y los selectores de pelea rápida eran seis «?». El `·` estaba corrido.
- En iOS el audio no volvía después de una llamada (queda `interrupted`).
- Después de un cuadro trabado sonaban todas las notas juntas.
- La última nota de la fanfarria se cortaba.
- El tope de DPR en 3 rompía la escala entera en teléfonos a 3,5.

**Carrera y tienda**
- Recargar la página en plena pelea anulaba la muerte: ahora cuenta como abandonar la arena. Recargar en «¡VICTORIA!» ya no pierde el punto de entrenamiento.
- Entrenar un atributo que ya está en 30 gastaba el punto.
- El cumpleaños decía «perdiste 1» sin sacar nada.
- Un empate en carrera decía «Lo mató X». Ahora dice «cayó junto con».
- El rango CAMPEÓN salía sin haber ganado: ahora es ASPIRANTE.
- Decía «1 victorias».
- BORRAR CARRERA ahora pide confirmación.
- Un ajuste corrupto en el navegador rompía la pantalla de ajustes.
- **Una fila GRATIS tiraba equipo caro sin aviso**, y volver a tenerlo costaba otra vez. Lo comprado queda en el ludus: volver a ponérselo dice PONER y es gratis.
- El dimaquero perdía para siempre su segunda espada: ahora la recupera al sacarse el escudo.
- Un arma a dos manos ahora saca el escudo, y el escudero no te vende uno mientras la tengas.
- Textos de la tienda: «CUBRE 16 · PESO 0,38» en mayúscula y con coma, y AL TOPE con las jabalinas y las redes llenas.

Medido:
- 49 de 49 peleas de IA contra IA terminan (4 a 30 s, mediana 12), sin errores ni NaN, y todas las clases ganan alguna.
- 98 peleas más con cortes, todas terminan.
- Toques, gestos, carrera y las cinco tiendas sin errores. La sonda de cada arreglo dio lo esperado.
- Dos fuzz de 600 acciones (toques, dedos sostenidos, dos dedos, cancelaciones, rotaciones y pestaña escondida) con cero errores y ningún estado imposible.
- 3,5 ms por cuadro en vertical.
