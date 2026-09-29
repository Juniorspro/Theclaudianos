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
- Generados con base64 adentro, que el original **no editaba a mano**: `js/*_swf.js`,
  `js/accesorios_tex.js`, `css/*_swf.css`.
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

## Estado al cierre del log (29/09 05:31)
- Lo último fue rehacer los íconos de los botones con piezas del SWF; USAR quedó con el dedo en
  diagonal y la sesión preguntó si lo quería más girado.
- **Hank ya no sale en el menú** (`main.js › TIPOS_MENU`, commit `e89b80d` del otro repo);
  falta rehacer su modelo, «más adelante».
- Abiertos: #40 mirar arriba/abajo cómodo (la mira táctil se rehízo el 29/09, falta que la pruebe
  quien pide); #41 silueta y sombreado de los cuerpos; #44 al correr el pie de adelante atraviesa
  el torso; #42 ropa de enemigos (necesita el SWF, que no está); el gore sigue «próximamente».
