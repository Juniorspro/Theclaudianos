# Banco de ARRABAL

Chromium del contenedor, 412x892, `hasTouch`. **Nunca `npx playwright install`.**
`mkdir -p /tmp/banco && cd /tmp/banco && npm i playwright-core`, copiar los `.mjs` y correrlos.

- `menus.mjs` — portada, mapa, equipo, colección, detalle, árbol, cofre (captura cada pantalla).
- `pelea.mjs` — cadena de 4, lanzar + aéreos, los 12 especiales y los 6 súper (daño medido), y
  peleas enteras del bot **con el equipo nivelado** (con cartas nivel 1 contra el barrio 3 pierde
  siempre: eso es la progresión, no un error).
- `tacto.mjs` — toques reales por CDP: deslizar ↑ salta, mantener cubre, especial con un segundo
  dedo sin que cuente como gesto, pausa y menú.
- `toque.mjs` — un toque rápido pega y cuatro seguidos arman el combo de 4.

Sondas: `window.__A` (`ir`, `pelea`, `saltarIntro`, `quieto`, `bot`, `orden`, `gesto`, `medidor`,
`nivelar`, `mundo`, `imgs`, `tocar`, `donde`, `darTodo`, `borrar`).

Trampas del banco: la pelea avanza en **tiempo de juego**, no en cuadros (los golpes congelan y el
K.O. va en cámara lenta: 9.000 cuadros no son 150 s). Y después del último toque de una cadena hay
que esperar ~30 cuadros: el cuarto golpe entra tarde.
