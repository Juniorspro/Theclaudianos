# Arena Nevada (Madness 3D)
Fuente: `nevada/` → `juegos-pc/ArenaNevada.html`. Ver también: [banco](banco.md), [entrega](entrega.md), [rezona](rezona.md).

## De dónde viene
- Juego 3D estilo *Madness Combat*, calcado del SWF de *Madness Project Nexus (Classic)*: arena por
  oleadas en Nevada. Otra sesión, 14→29/09/2026, 139 commits, repo `goshumio/juegardos` rama
  `claude/madness-combat-3d-mobile-7ys4hp`. **Ese repo no está al alcance**: el 29/09 el modo auto
  frenó engancharlo.
- Llegó como adjunto `arena-nevada-4.html` (7,29 MB) + el log de esa sesión
  (`sesion_madness_completa_2.md`, 472 kB, fuera del repo: § 3 estado, § 4 herramientas, § 5 pendientes).
- Aparato de referencia de esa sesión: TCL 20SE (Adreno 610). Three.js r160 y cannon-es 0.20.0 van
  embebidos: abre sin red.
- Lo que **no** vino: `build.js`, `tools/qa/verificar.js` y demás QA, `tools/swf_*` y el SWF
  (`/tmp/rf/mpn.swf`). Acá hace falta banco propio.

## Cómo está armado acá
- `python3 nevada/armar.py` junta `nevada/plantilla.html` con cada `{{ruta}}` →
  `juegos-pc/ArenaNevada.html`. El 29/09 salió **idéntico byte a byte** al adjunto (sha256 `0f93e370…`).
- `plantilla.html` (18 kB): el marcado del HUD y las pantallas; cada script lleva su marca
  `/* ---- js/x.js ---- */`.
- `js/`: 46 scripts en el orden de la plantilla; cada uno cuelga su módulo de `window`, así que el
  orden importa.
- Generados con base64 adentro, que el original **no editaba a mano**: `js/*_swf.js`, `css/*_swf.css`
  (`js/accesorios_tex.js`, el atlas de la ATP vieja, se borró el 30/09: −690 kB).
- `audio/`: `window.__AUDIO` (sonidos, 436 kB) y `window.__MUSICA` (2,27 MB), mp3 en base64.
- `.gitattributes` saca lo armado y lo generado de `git diff`: si no, un diff tira megas de base64.

## Medido acá (banco, 2026-09-29, DPR 2, swiftshader)
- Carga 3,4 s; **0 errores, 0 pedidos afuera**; sólo el aviso de three de «build/three.min.js».
- Menú: 3 llamadas (el fondo es 2D; la figura va en otro lienzo). Partida: **77 llamadas,
  95 mil triángulos**, 68 geometrías, 29 texturas; lienzo interno 802×370 (resolución AUTO).
- El jugador arranca en la puerta del fondo; la oleada se abre con ATACAR en el panel.

## La marcha (29/09, sesión chamaco)
- Sale del SWF ([swf](swf.md)): `herramientas/swf/marcha.py` → `nevada/js/marcha_swf.js` (pie, torso
  de run y de dash, cabeza y manos, simetrizados); la usa `anim.js § LA MARCHA DEL SWF`.
- Cadencia por velocidad, no por distancia: 1,40 ciclos/s a 3,5 m/s, 2,14 a 6,4, 2,69 a 10,7 (DEX 30).
  Antes (zancada fija) daba 9 / 13 / 22 pasos/s: el "aleteo" que se veía feo al subir DEX.
- Adaptado al 3D, cada cosa por un choque medido: sin la agachada del dash (el bajo del torso a
  16 cm, la bota mide 15,5); torso a la mitad de adelantado y a 2/3 de echado (13°) porque las
  botas quedaban lejos del cuerpo (lo pidió quien pide); talón y punta; `dentroTorso` baja la bota
  o sube el torso; puños que bombean al esprintar.
- **Bota clavada** (29/09, quien pide sentía que patinaba): en el apoyo su avance = el de la pisada
  − lo recorrido de verdad (`A.dist`, con `est.x/z` del actor); apoyo corto según la velocidad
  para que el recorrido se tope en 0,46 m andando, 0,60 esprintando, 0,66 con DEX; vuela con el
  arco del SWF. Torso, vaivén y manos van en `faseT` (lo más bajo, a mitad del apoyo).
- Medido con `node herramientas/banco/marcha.js`: `clavada` 0,000 (antes el pie apoyado iba al
  70-79% del cuerpo), bota dentro del torso 0-0,1 cm, pies separados hasta 0,37-0,53 m.

## La ropa en la Shop (29/09)
- MÁSCARAS: Agent Shades roja y negra ($900), ATP Mask ($1200, light: pide ARMOR 1 para ponerla) y
  OBSV Goggles ($900), datos del SWF. ROPA: los trajes de agente, agent/agent2/agent3 ($900/1200/1200,
  precio nuestro: el SWF no los vende). CASCOS y BOCA siguen vacíos: no hay 3D.
- Baldosas: `herramientas/swf/iconos_ropa.py` → `nevada/js/ropa_swf.js` ([swf](swf.md)).
- Vestir: `Chars.vestido(base, ropa, mascara)` = un tipo por combinación (`grunt|agent2|agent1_mask`)
  con su malla; `Actor.vestir` cambia el cuerpo y recuelga arma y funda (`fundaObj = null` o no se
  recuelga). Se guarda en `Progreso.ficha.ropa {tiene, mask, shirt}` y se pone en `Game.empezar`.
- La vista previa tiñe el muñeco entero (la prenda va fundida en la malla). El Armor del SWF se ve en
  el panel pero **todavía no protege**.
- Banco: `node herramientas/banco/tienda.js` (pisa `Tienda.paso`, que cierra la tienda lejos del mostrador).

## La ropa de la cabeza en 3D (29/09, chamaco)
- `nevada/js/prendas.js` (catálogo del SWF, precios, `armadura()`, `cargaEnemigo()`) y `prendas3d.js`
  (sombreros, anteojos, bocas, Tricky). Armadura del SWF (`checkDamage`) en `Actor.danoSWF`: Beretta
  al cuerpo 7 / Padded 4 / Metal 0 (rebota); casco Soldier 5, Blast 4 ([swf](swf.md) › as2.py).
- Zoom: `node herramientas/banco/zoom_prendas.js ids cat pre "az:el,..."` (6 vistas ampliadas) y
  `difpng.js con.png sin.png dif.png` (modo `sin` esconde la tinta: lo rojo es tinta de más).
- **La cabeza es una malla 16×12**: entre vértices sus caras quedan hasta 1 cm dentro del óvalo, y la
  tinta de las prendas se adelanta 1 cm. Toda tinta a menos de ~2 cm dentro del óvalo asoma a rayitas:
  la cara de dentro de lo que toca la cabeza baja `HUNDE` (queda a 2,8 cm).
- **Un borde que apoya en la cabeza no es silueta**: el trazo va PINTADO (franja negra en la grilla,
  `filas()`) y el canto baja 1,2 cm dentro; solo el borde suelto estira la tinta (`lamina`, `apoyo`).
- Lo que va pegado (correas, hebillas) no estira la tinta a lo largo de la cabeza, solo hacia fuera:
  si no, desde arriba se ve su cara de abajo suelta (tira de piel + raya). Piezas chicas: tinta 4,5 mm.
- Tinta de piezas facetadas: vértices compartidos con la normal promediada (`tubo3`, `caja`, placa);
  con caras sueltas el empuje en pantalla abre las aristas y sale raya doble.
- Tela que cuelga: baja pegada hasta la TANGENTE a su punto de abajo y sigue derecha (`panuelo`): sin
  quiebre no hay arruga que doble la tinta. Lo que envuelve la cabeza entera (pasamontañas) deja el
  óvalo adelantado salvo junto a la ventana y adelanta solo la cara de FUERA de su tinta.
- Luz de la sala (0,44, 0,74, 0,51); escalones en 0,50/0,62/0,88: para que se lea un pliegue (Tricky,
  placa en V de 30°) cada cara tiene que caer en un escalón distinto (medido: 71 y 79).
- **La tinta de la ropa de la cabeza va adelantada 1 cm**: toda cáscara a menos de 1 cm detrás de
  otra superficie la atraviesa (el arco bajo el yugo salía en rayitas). Lo que se mete bajo otra pieza
  termina en la franja negra de esa pieza.
- Alas (`torno`): la cáscara de la cara de abajo llenaba el hueco entre el ala levantada y la cabeza
  (cuña negra + franja clara). `p[3]` = cuánta tinta lleva cada punto del perfil (0 en los dos extremos
  de un tramo = sin cáscara) y la junta con la cabeza va pintada (`juntaAla`, `juntaPieza`: medidas
  donde el perfil entra en el óvalo; a ojo quedaban corridas y asomaba una medialuna de cabeza).
- Lo que apoya en la cabeza (arco y yugo de los auriculares) va como `lamina`: suelto a 2-3 cm dejaba
  rayitas de cabeza y una tinta finita. Una pieza que pasa detrás del contorno de otra a su misma
  profundidad le tapa la tinta de adentro: se corta en el contorno. Esquinas vivas de una placa → pico
  de tinta de sesgo: redondas. `CUBRE` de más adelgaza el contorno de la cara donde se ve.
- Cascos (`casco`): el reborde va pintado a distancia MEDIDA del borde (`rebordeCasco`); el Blast
  Helm lleva la pantalla EN V (`pantallaV`, el método de Tricky) y los brazos como sólido (`tubo3`):
  como lámina en el aire, la tinta estirada de costado hacía cuñas. **Antes de tocar una pieza
  compartida (`casco`), confirmar de qué prenda habla quien pide**: la V era de la pantalla del Blast
  Helm y se la puse al borde del casco (revertido).
- Lo pegado a OTRA superficie (brazo sobre el casco) tampoco estira la tinta a lo largo de ella:
  `tubo3(..., sobreCab)` acepta `(p, r) => [normal, pega, m]` (m = cuánta tinta lleva el anillo).
  Estirada, quedaba 1-2 mm dentro del casco a 1,2 cm del brazo y salía una raya punteada al lado.
  Un tramo parado corto va sin cáscara (lo contornean sus costados y franjas negras).
- Una pieza que entra en otra (el brazo en la pantalla) entra solo 3 mm: la tinta es 1,6 cm más
  el adelanto de 1, y más adentro asomaba por la cara de enfrente.
- **Grilla muy sesgada** (borde que cae casi vertical, la mejilla del casco): con la diagonal fija,
  de un lado era la larga y los triángulos astilla se daban vuelta de refilón → puntitos de la tinta
  de atrás. La pista: salía de UN solo costado. `casquete({diagCorta})` parte cada cuadro por la corta.
- Queda una franjita de puntos donde el tramo parado del brazo cruza el borde de la silueta del casco
  (misma profundidad), solo de atrás-costado (±120°): ~7 px a escala de celular.

## Los anteojos, medidos en su hoja (30/09)
- Método: la hoja (`ref3/m_*_g.png`) es la cámara a −38,6°, ortográfica; todas a 0,854 mm/px (la
  elipse de la cabeza da b = 467 px ↔ 0,399 m), la de paintball corrida 44 px en x. Cada cristal se
  lee fila por fila por su color (`region.js`, `bordes.js`) y se des-proyecta al plano de su lente,
  que mira a su azimut (`desproy.py`); todo en `herramientas/banco/`. Comparar superpuesto con `calza.js` y la escala FIJA
  (`K=2.623` con `FOV=10`, D 9.6: casi sin perspectiva; a 3,2 m lo cercano sale 10% más grande).
- Todo trazo de la hoja mide 22 px = 1,9 cm (= el contorno de la cabeza). Los anteojos del SWF son
  GRANDES (el cristal del aviador 16,7 × 13,6 cm); los de antes eran la mitad y de un solo molde.
- La hoja exagera el lado de lejos (lente lejana más ancha y corrida): se calza el de cerca y se
  espeja. Nuestra cruz está 2,6 cm más arriba en la cabeza que la del SWF: todo va relativo a ella.
- **Cristales translúcidos** (aviador 69%, redondos 64% gris 47, cuadrados 50%, visor rojo 61%): malla
  aparte `B.vidrio` (chars.js). En render a textura sRGB (ficha de la tienda, zoom) la mezcla es
  lineal y sale más claro/rosado (medido 156,129,128 contra 149,77,76 en pantalla):
  `Chars.matVidrioLineal` para la tienda; para mirar colores reales, `CANVAS=1 zoom_prendas.js`.
- Piezas en V o curvas grandes: `lamina` (grilla que sigue la curva), no un polígono triangulado de
  una (las cuerdas hundían 4 cm un cristal de 30 cm). Lentes y trazos pintados, planos, en su panel.
- Una placa despegada que sigue en otra pieza (frente de los 3-D → patilla): `sinTintaLado` y
  `tintaEn` = 0 en esa columna; si no, la pared o la cara de adentro de su tinta asoma en una raya.
- Nuestra línea horizontal de la cruz mide 3,7 cm (la del SWF 1,8) y arranca ~5 cm más afuera: con
  anteojos asoma por fuera del cristal cercano. No la toqué (es la cara de todos).

## La ATP Mask de geometría (30/09)
- Frente = `losa` plana CON el agujero del visor (la cara se ve por el cristal translúcido 255,175,29
  al 41%); esquinas + costados = una `lamina` por lado, cosidas SIN tinta en la costura: `o.lado`/
  `o.sinCanto` en la losa, `sinTintaLado:[0]`, `sinCantoLado:[0]` y `normal` impuesta (la de la losa) en
  la columna 0 de la lámina; con la normal de la grilla las caras quedaban corridas 0,04 mm y asomaba
  la tinta a puntitos. Panel, marco y quijada, pintados (`mancha` ahora acepta huecos y `conLuz`).
- La hoja de tres cuartos y la de costado no cuadran: de costado la ATP cubre 2/3 de la cabeza, de
  tres cuartos apenas la cara. Mandé la de tres cuartos (costados hasta z = 0,32); rieles como ALA
  abierta 35° (así asoman de frente y se ven anchos de tres cuartos, como en las dos hojas).
- **El adelanto de 1 cm de la tinta de la cabeza**: toda cara de la tinta a menos de 1 cm detrás de
  una cara de color se ve a través (tiras finas: `tintaN` para que su cara de atrás quede ≥1 cm;
  la placa de la boca, 3,5 cm detrás del frente; las puntas de la solapa, 5 cm dentro del costado).
- **`losa`, la tinta**: caras planas (w1+g2 / w0−g2 también en los agujeros, sin canto en ellos) y
  triangulación con puntos por dentro (`o.paso`) + aristas dadas vuelta hasta Delaunay (`triangular`):
  las astillas de earcut, con el empuje en pantalla de la tinta (por la normal de cada punto), se
  daban vuelta y se dibujaban en rayas finas de punta a punta. La tapa sin puntos (con ellos, una raya).
- Una tela SUELTA a 2 cm (la solapa): placa fina (`tintaN` 0,25, bordes sueltos). Apoyada, su canto
  entra 3,6 cm en la cabeza y sale a dientes por las caras del óvalo; con tinta gruesa, manchones.
- `ofsetear(P, d)`: agrandar de verdad (campo de distancias + marching squares). `Hh.hinchar` hace
  rulos en las esquinas de dentro cuando d > los tramos (la cerradura del visor).
- Para aislar qué pieza pinta una raya: `PRE="window.x=..." zoom_prendas.js` (código antes de vestir) y
  el modo `sin` (sin tinta): si con `sin` se va, es tinta asomando.

## El chaleco armor3 y la tienda completa (30/09)
- **Nevada en pausa por pedido** («no seguiremos trabajando en el juego hasta nuevo aviso»). Quedaron
  sin modelar armor1, 2, 4, 5 y 6 (el catálogo los tiene; `Prendas.modelada` los esconde) y sin
  remodelar los trajes de los enemigos.
- Chaleco (`ropa.js › placaL`): la placa va sobre la **cáscara lisa** (`supL`: la superelipse que pasa
  por las esquinas del dodecágono; las caras quedan hasta 0,9 cm por dentro, medido). Pegada a las
  caras, el borde de arriba salía quebrado en cada arista. Se arma desde el borde de la cara hacia
  afuera: franjas pintadas por punto (arriba T, abajo B, puntas E, mezcladas en las esquinas) y el
  canto en **cuarto de caña** negro de radio = alto de la cara.
- **La tinta de algo apoyado en el torso**: su borde de abajo es un pliegue, no una silueta. Probé tres
  cosas, y el detector las contó:
  - el casco hinchado para todos lados (cornisa a g del borde) daba línea doble vista de arriba o de
    abajo, y rayitas vista de canto;
  - el bisel plano se pone de canto a unos 16° y deja una rayita cortada;
  - el canto redondo de radio r + g, con el pie g más allá del borde, casi de frente deja ver solo el pie
    empinado: una raya suelta.
  Lo que anda: tinta en **cuarto de elipse** (semiejes r y r + g, mismo centro) que termina en el MISMO
  pie que el color. Lo que va por debajo de la cáscara se mide desde la cara facetada (`sup`).
- Ojo: `r * Math.cos(Math.PI / 2)` da 6e-17 > 0; `h > 0` no separa «en la cáscara» de «debajo».
- Hebillas: pegadas a la cáscara (rígidas en la esquina de atrás del torso, sus cantos salían por la
  otra cara como espinas), tinta en bisel con las esquinas del pie redondas. La correa termina bajo la
  barra de adelante de la hebilla: metida bajo la placa, en su esquina redonda quedaba al aire. Las
  lengüetas (`solapa`) son las del perfil del SWF.
- Queda: vista de arriba a 45°, una astilla fina bajo el borde de abajo (2.101 px «despegados» con el detector corregido, R=30; las
  lengüetas de las correas, que con R=14 daban ~400 «sueltos», con R=30 dan 0). **Hipótesis sin probar** de la astilla: la rampa de profundidad del
  torso (`Art.CAPA`: 0,30 m × smoothstep(0,25, 0,85, y), por vértice) aleja 0,38 cm por cada cm de
  altura, y la tinta del borde, más alta que el torso que tapa, queda detrás. Se arreglaría con un
  adelanto chico para la tinta de la ropa, que el color de la ropa (adelantado 12 cm) sigue tapando.
- Con chaleco encima, el traje no hace arnés ni bandolera (asomaban por la placa) y corta a 0,915
  (`Ropa.construir(..., chaleco)`, `Ropa.corte(id, chaleco)`), como en el SWF.
- Tienda: `iconos_ropa.py` saca las **33 baldosas** (cascos 7363 `myHat`, máscaras 7358, bocas 7318
  `myMouth`, chalecos 7295 `myShirt`, trajes 7289) → `ropa_swf.js` (243 kB). Armadura medida con una
  pistola de 7: sin nada, 7; chaleco + Blast Helm + Paintball + Breather, 4 al cuerpo y 2,7 a la cabeza;
  sin ARMOR 1 se compra pero no se pone («REQUIERE ARMOR 1»); perforación atraviesa lo liviano y no lo
  heavy. Grunt con el chaleco: 54.380 triángulos.

## Estado al cierre del log (29/09 05:31)
- Lo último fue rehacer los íconos de los botones con piezas del SWF; USAR quedó con el dedo en
  diagonal y la sesión preguntó si lo quería más girado.
- **Hank ya no sale en el menú** (`main.js › TIPOS_MENU`, commit `e89b80d` del otro repo);
  falta rehacer su modelo, «más adelante».
- Abiertos: #40 mirar arriba/abajo cómodo (la mira táctil se rehízo el 29/09, falta que la pruebe
  quien pide); #41 silueta y sombreado de los cuerpos; #44 al correr el pie de adelante atraviesa
  el torso; #42 ropa de enemigos (necesita el SWF, que no está); el gore sigue «próximamente».
