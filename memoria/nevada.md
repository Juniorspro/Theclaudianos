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
  botas quedaban lejos del cuerpo (lo pidió quien pide); paso ×1,3; apoyo al 30% del ciclo;
  talón y punta; `dentroTorso` baja la bota o sube el torso; puños que bombean al esprintar.
- Medido con `node herramientas/banco/marcha.js`: bota dentro del torso 7-8 → 0-0,2 cm; patina
  0,70-0,79 (antes 0,66-0,74: el pie apoyado sigue deslizando, como en el SWF).

## Estado al cierre del log (29/09 05:31)
- Lo último fue rehacer los íconos de los botones con piezas del SWF; USAR quedó con el dedo en
  diagonal y la sesión preguntó si lo quería más girado.
- **Hank ya no sale en el menú** (`main.js › TIPOS_MENU`, commit `e89b80d` del otro repo);
  falta rehacer su modelo, «más adelante».
- Abiertos: #40 mirar arriba/abajo cómodo (la mira táctil se rehízo el 29/09, falta que la pruebe
  quien pide); #41 silueta y sombreado de los cuerpos; #44 al correr el pie de adelante atraviesa
  el torso; #42 ropa de enemigos (necesita el SWF, que no está); el gore sigue «próximamente».
