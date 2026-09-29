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

## Pendiente según el log (§ 5, 29/09)
- Hank fuera del menú y rehacer su modelo; gore «próximamente»; mirar arriba/abajo cómodo en el
  celu; silueta y sombreado de los cuerpos; ropa de enemigos que falta; caminata y carrera sin
  piernas que se buguean.
