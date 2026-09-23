# Memoria — el índice
Última puesta al día: 2026-09-23. Cómo se mantiene: `MEMORIA.md` en la raíz.

## Reglas que no se discuten
- **Nunca** cuadros de `AskUserQuestion` — «se buguea, uso celular». Preguntar en texto plano.
- Commit y push **sólo** a la rama de trabajo indicada. **No** abrir PRs salvo pedido explícito.
- **No** poner el identificador del modelo en nada que se pushee.
- **Verificar midiendo antes de afirmar que algo funciona.** «Anda» sin un número al lado no vale.
- **Siempre adjuntar el HTML** armado al cerrar cada vuelta, sin que lo pida.
- **Ahorrar tokens**: nada de barridos exploratorios ni narración larga.
- Escribir en **castellano rioplatense**.
- **Cada juego 2D nuevo tiene que ser un 100% mejor y distinto al anterior** en animación, menús y
  dinámicas (pedido del 23/09/2026). Antes de arrancar uno, mirar la nota del último y superarlo.
- Rezona: todo en **un** proyecto descartable; `publish_to_rezona_app` **jamás** sin pedido (es irreversible).
- **Nunca subir juegos a Rezona** (`upload_project` prohibido, pedido del 23/09/2026). Los juegos se
  comparten con **githack** sobre el commit: ver [chicharra](chicharra.md).

## Quién pide
- Juniors. Prueba **en el celular, en vertical (412×892)**. Un juego = **un HTML autocontenido**.
- El repo es **compartido entre sesiones de distintas personas**: lo común son las skills y las
  herramientas, no los juegos. Esta línea es **Mariano Peak**; el Bosque es de otra línea.

## Las notas
| nota | abrila cuando… |
|---|---|
| [rezona](rezona.md) | vayas a generar un asset, bajarlo, subir el juego o el login falle |
| [juegos](juegos.md) | hagas **3D**: render, luz, niebla, vegetación, personaje, post-proceso |
| [pixel2d](pixel2d.md) | hagas **2D pixel art**: escala, sprites, luz, mundo procedural, sonido |
| [arrabal](arrabal.md) | toques `juegos-pc/Arrabal.html`, el juego de pelea con cartas (**apaisado** desde el 23/09: en vertical se gira solo) |
| [cabezones](cabezones.md) | toques `juegos-pc/Cabezones.html`, el fútbol de cabezas (el último 2D: **el próximo lo tiene que superar**) |
| [chicharra](chicharra.md) | toques `juegos-pc/Chicharra.html`, el juego de esta línea |
| [idiomas](idiomas.md) | toques textos de un juego o hagas uno nuevo: **todos llevan selector de idioma** (es/en/pt/fr) |
| [repo](repo.md) | necesites saber qué hay dónde, cómo se prueba y cómo se entrega |
| [diario](diario.md) | quieras saber qué pasó en las sesiones anteriores y qué quedó a medias |

## Qué hay en cada carpeta
| carpeta | qué es | detalle en |
|---|---|---|
| `juegos-pc/` | los HTML: `Arrabal.html`, `Cabezones.html`, `Chicharra.html` (de acá) y `Bosque.html` (otra línea) | [repo](repo.md) |
| `.claude/skills/` | `graficos`, `assets-ia`, `banco` | [juegos](juegos.md), [rezona](rezona.md) |
| `herramientas/rezona/` | `rz.py` (cliente stdio del MCP) y scripts de horneado | [rezona](rezona.md) |
| `herramientas/comun/` | `idioma.js` y `poner_idioma.py`: el selector de idiomas de todos los juegos | [idiomas](idiomas.md) |
| `herramientas/arrabal/`, `herramientas/cabezones/` | horneado de arte, música y efectos de cada juego | [arrabal](arrabal.md), [cabezones](cabezones.md) |
| `pruebas/arrabal/`, `pruebas/cabezones/`, `pruebas/chicharra/` | los bancos de cada juego | la nota del juego |
| `docs/` | `GUIA-JUEGOS.md` (la receta), `MANUAL_JUEGOS.md` y `TRASPASO_BOSQUE.md` (referencia) | [repo](repo.md) |
| `assets/` | arte y sonido horneados: `arrabal/`, `cabezones/`, y texturas del Bosque (otra línea) | la nota del juego |
| `memoria/` | esto | `MEMORIA.md` |
