# Banco de CHICHARRA

Chromium del contenedor con SwiftShader, 412x892, `hasTouch`. **Nunca `npx playwright install`.**

```bash
mkdir -p /tmp/banco && cd /tmp/banco && npm i playwright-core
cp <repo>/pruebas/chicharra/*.mjs . && node prueba.mjs
```

- `prueba.mjs` — completabilidad (el bot juega niveles enteros), capturas, tienda, rendimiento con
  calentamiento (200 cuadros) y medición (300), y que no haya **ningún** pedido a la red.
- `tacto.mjs` — toques de verdad por CDP: control relativo (la nave copia el dedo y no salta al
  apoyar), bomba con un segundo dedo sin mover la nave, control «bajo el dedo», deslizar la vitrina
  del hangar y toque corto en un botón de menú.

Sondas del juego: `window.__C` (`ir`, `nivel`, `nave`, `anda`, `bot`, `mundo`, `medidas`, `assets`,
`tocar`, `deslizar`, `donde`, `jefeYa`, `matarJefe`, `invencible`, `monedas`, `borrar`).

**El jefe tarda ~390 cuadros en estar peleable** (alerta de 2,4 s + entrada): esperar a
`__C.mundo().jefe` antes de medirlo o matarlo, si no la prueba dice que es inmortal.

**Los cuadros por segundo de este banco no valen**: dibuja por procesador. Valen los errores, las
capturas, los triángulos de la simulación y los ms comparados **contra el commit anterior**.
