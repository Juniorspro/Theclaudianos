# Banco de ARRABAL

Chromium del contenedor, `hasTouch`. El juego es apaisado: en 412x892 se gira solo (así se prueba el giro), en 892x412 va derecho. **Nunca `npx playwright install`.**
`mkdir -p /tmp/banco && cd /tmp/banco && npm i playwright-core`, copiar los `.mjs` y correrlos.

- `menus.mjs` — portada, mapa, equipo, colección, detalle, árbol, cofre (captura cada pantalla).
- `pelea.mjs` — cadena de 4, lanzar + aéreos, los 12 especiales y los 6 súper (daño medido), y
  peleas enteras del bot **con el equipo nivelado** (con cartas nivel 1 contra el barrio 3 pierde
  siempre: eso es la progresión, no un error).
- `mando.mjs` — el mando apaisado por CDP: GOLPE pega, el palito camina y salta, CUBRIR se sostiene,
  palito + golpe a la vez. Correr con `412x892` (teléfono parado: el juego se gira solo) y `892x412`.
- `musica.mjs` / `efectos.mjs` — la banda sonora decodifica y el bucle se ajusta; cada golpe suena.
- `arcade.mjs` — atracción → menú → selección (la cuenta elige sola) → VS → rondas con bonos → la
  escalera entera con el bot → continuar → iniciales → récords; y que la historia siga andando.
- `atraccion.mjs` — la demo de la portada corre 2 minutos pasando de pelea en pelea sin trabarse.

Sondas: `window.__A` (`ir`, `pelea`, `saltarIntro`, `quieto`, `bot`, `orden`, `gesto`, `medidor`,
`nivelar`, `mundo`, `imgs`, `tocar`, `donde`, `darTodo`, `borrar`).

Trampas del banco: la pelea avanza en **tiempo de juego**, no en cuadros (los golpes congelan y el
K.O. va en cámara lenta: 9.000 cuadros no son 150 s). Y después del último toque de una cadena hay
que esperar ~30 cuadros: el cuarto golpe entra tarde.
