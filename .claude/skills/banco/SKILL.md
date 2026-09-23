---
name: banco
description: Probar el juego de verdad — banco de pruebas headless, capturas en 412x892 vertical y sondas window.__X. Usar antes de afirmar que algo funciona y después de cada cambio visual.
---

# Banco de pruebas

El navegador del contenedor **no tiene salida a internet** (curl sí): hay que bajar three.js y
reescribir el CDN a un archivo local antes de correr nada.

```bash
cd /tmp/ui && curl -sS -o three128.js https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
sed 's#https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js#three128.js#' \
  juegos-pc/Bosque.html > /tmp/ui/bq.html
PAGINA=bq.html bash run2.sh plan.json out/x.log 412 892
```

Las capturas salen **giradas**: enderezar con `Image.rotate(90, expand=True)`. Sin girarla, la
captura miente.

Sintaxis (script clásico, no módulo):
```bash
node -e "const a=require('/tmp/ui/node_modules/acorn'),f=require('fs');
const m=f.readFileSync('juegos-pc/Bosque.html','utf8').match(/<script>([\s\S]*)<\/script>/);
try{a.parse(m[1],{ecmaVersion:'latest'});console.log('ok')}catch(e){console.log('ERROR',e.message)}"
```
**La ruta de acorn va absoluta.**

## Sondas
`window.__B` en Bosque: `{BAJO, CFG, FIN, bajar, subir, abrirTrampilla, activarNotas, cuenta, jug,
aplicarGfx}`. Las que siempre hacen falta: `est()` (llamadas/triángulos/ms), `brillo()`
(`readPixels`), `cajas()` (solapes con `offsetTop/Left/Width`, **no** `getBoundingClientRect`, que
en un marco girado infla la caja), `anda(n)`, `assets()`.

## Las trampas de las sondas
1. **La sonda puede estar mal antes que el juego.** Señal: un número demasiado redondo.
2. Una sonda que **escribe** el estado que va a medir aprueba cualquier cosa.
3. Una sonda que no adelanta **todos** los relojes mide un juego que no existe.
4. Las matrices de three.js se recalculan **al dibujar**: `updateMatrixWorld()` dentro de la sonda.
5. Un punto **detrás** de la cámara proyecta igual, dado vuelta, y cae adentro del cuadro.
6. **Medir sin un control no prueba nada**: el A/B va en el mismo binario con una constante dada
   vuelta, y contra el commit anterior en el mismo banco (`git show HEAD:archivo`).
7. Una prueba que nunca puede dar limpio deja de detectar el defecto de verdad.

## Entrada en el banco
Los botones responden a **`touchstart`**, no a `click` (`'ontouchstart' in window` es true y el
camino de click se saltea a propósito).

## Sondas de MATE AMARGO (`herramientas/mate/banco/`)
- `alc.js N…`: búsqueda de todos los saltos desde cada lugar pisable; `fin`, enemigos sueltos y mapa con `*`.
- `jefe2.js`: la pelea del jefe acelerada a 1/60 por paso; cuenta saltos, teteras, anillos y fases.
- `idiomas.js en pt`: recorre menús, cinemáticas y pistas y devuelve `TR_FALTA`.
- `pantallas.js ancho alto dpr idioma`: todas las pantallas de menú en cualquier viewport.
- `fuzz.js N`: toques, arrastres, dos dedos, cancelaciones, cambios de nivel y de pestaña; NaN y errores.
- **Una sonda que «saltea» una cinemática vaciándole el guion la deja colgada**: el juego queda en pausa
  y la sonda mide un mundo quieto (las partículas, congeladas). Se usa `__M.saltarCine()`.
- **El rayo contra `Points` pega en partículas muertas**: su posición queda aunque `tam` sea 0.
  Para saber qué se dibuja en un píxel, preguntar por las vivas o apagar capas.
