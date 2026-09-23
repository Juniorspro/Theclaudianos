# Banco de CHICHARRA

Chromium del contenedor con SwiftShader, 412x892, `hasTouch`. **Nunca `npx playwright install`.**

```bash
mkdir -p /tmp/banco && cd /tmp/banco && npm i playwright-core
cp <repo>/pruebas/chicharra/*.mjs . && node prueba.mjs
```

- `prueba.mjs` — completabilidad (el bot juega niveles enteros), capturas, tienda, rendimiento con
  calentamiento (200 cuadros) y medición (300), y que no haya **ningún** pedido a la red.
- `tacto.mjs` — toques de verdad por CDP: arrastre de la nave y bomba con un segundo dedo sin
  soltar el primero.
- `cartel.mjs` — captura del cartel de nivel.

Sondas del juego: `window.__C` (`nivel`, `anda`, `bot`, `mundo`, `medidas`, `tocar`, `donde`,
`jefeYa`, `matarJefe`, `invencible`, `hoja`).

**Los cuadros por segundo de este banco no valen**: dibuja por procesador. Valen los errores, las
capturas, los triángulos de la simulación y los ms comparados **contra el commit anterior**.
