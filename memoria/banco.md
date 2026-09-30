# Banco de pruebas
Fuente: `herramientas/banco/correr.py`, `ver_glb.py`, `ver_anim.py`. Ver también: [bosque](bosque.md).

## Correr el juego
```bash
python3 herramientas/banco/correr.py <segundos> [dia] [casa] [bicho] [joy] [cfg] [menu]
                                     [costo] [fase11|fase12] [guiar] [sinia] [pintar]
SALIDA=crudo/banco/x.jpg  BQ=otro.html  DIST=8  ESPERA=40   # variables
```
- Levanta chromium headless (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) con
  swiftshader, sirve `crudo/banco/` y **reescribe los CDN a copias locales**: el navegador del
  contenedor no sale a internet, `curl` sí.
- `sinia` es el A/B: **el mismo binario con `CDN_IA` dada vuelta**, sin assets generados.
- Las capturas salen **giradas**; el script las endereza con `rotate(90, expand=True)`.

## Trampas del banco (medidas)
- **El bucle avanza ~0,3 s de juego por segundo de pared.** Una sonda leída justo después de
  escribir el estado mide **el cuadro anterior**: hay que esperar varios segundos.
- Los cuadros por segundo de acá **no dicen nada** de un teléfono: sirven errores, llamadas,
  triángulos y capturas.
- `renderer.info` sin `autoReset=false` mide sólo la última pasada (daba «1 llamada, 2 triángulos»).
- `material.program === null` prueba que el objeto **nunca entró a la lista de dibujo**.
- Para apuntar la cámara a un punto va `atan2(-dx,-dz)` (mira por su −Z); con `atan2(dx,dz)` el
  punto proyecta **centrado y dado vuelta**. Comprobar siempre la profundidad.
- `camera.position` es **local** (cuelga de la cabeza): va `camera.getWorldPosition()`.
- Los botones responden a `touchstart`; el camino de `click` se saltea si hay `ontouchstart`.

## Nevada (2026-09-29)
- `node herramientas/banco/nevada.js [html] [carpeta]` → fotos del menú y de la partida, `hoja.png`
  enderezada y un JSON con errores, pedidos afuera, llamadas, triángulos, lienzo y reloj del juego.
  `DPR=2 SEG=8 ANCHO=446` (892 = foto a tamaño real). Tarda ~30 s.
- En este contenedor hay **Playwright de Node** (`/opt/node22/lib/node_modules/playwright`, 1.56.1)
  y **no** el de Python ni PIL: `correr.py` no anda sin instalar. La hoja se arma con CSS.
- Nevada cuelga todo de `window` (`Game`, `HUD`, `Device`…) y deja `__ir(destino)` para saltar
  de pantalla (`'nueva'` arranca la partida). `Game.tiempo` es el reloj del juego.
- Las llamadas se miden envolviendo `Game.dibujar` con `ren.info.autoReset=false`.

## Sintaxis antes de mirar nada
```bash
node -e "const a=require('/tmp/node_modules/acorn'),f=require('fs');
const m=f.readFileSync('juegos-pc/Bosque.html','utf8').match(/<script>([\s\S]*)<\/script>/);
try{a.parse(m[1],{ecmaVersion:'latest'});console.log('ok')}catch(e){console.log('ERROR',e.message)}"
```
La ruta de acorn va **absoluta**.

## Modelos
`python3 herramientas/banco/ver_glb.py <glb en crudo/ver> <salida.jpg>` da huesos, triángulos,
caja y cuatro fotos. `ver_anim.py <glb> <clip>` mide además **cuánto se movieron los vértices**:
un hueso mal pesado gira igual y no desplaza nada.

## Trazos: el detector (30/09)
- `node herramientas/banco/trazos.js ids cat carpeta [vistas] [y0] [D]`: cada prenda contra el muñeco
  pelado, en 36 vistas. Hace tres pasadas (con tinta, sin tinta y la profundidad real) y cuenta en px:
  - `suelta`: tinta sin contorno al lado;
  - `despegada`: tinta separada del contorno por algo que no es negro (la línea doble);
  - `hueco`: silueta sin tinta;
  - `fino`: rasgos de 1-2 px.
  Deja un JSON y recortes marcados en rojo. Para el torso: `SINMANOS=1 ... "" 0.68 3.0`.
- `fino` es orientativo: un canto negro visto de refilón también mide 1-2 px.
- Para ver la tinta sola: el material de tinta clonado en rojo (`mat.color`, que multiplica el color de
  vértice) y el color de la ropa descartado donde `aAde > 0`. Así se vio que el torso tapaba la tinta
  (la rampa `Art.CAPA`).
