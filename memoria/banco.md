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
