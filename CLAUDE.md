# Theclaudianos — bitácora y reglas

Repo de juegos web. Un juego = **un HTML autocontenido** en `juegos-pc/`, three.js desde CDN,
se prueba **en el celular, en vertical (412×892)**.

## Qué hay acá

| ruta | qué es |
|---|---|
| `juegos-pc/Bosque.html` | **El juego VHS.** Terror en primera persona, three.js r128 (script clásico), escenario girado 90°. |
| `juegos-pc/Alien.html` | **Alien Grid.** Tercera persona móvil: personaje riggeado con 4 clips, mundo grid, cielo 360 y una nave de dos cubiertas que se recorre por dentro. |
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
