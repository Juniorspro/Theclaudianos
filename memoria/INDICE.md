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
- Rezona: todo en **un** proyecto descartable; `publish_to_rezona_app` **jamás** sin pedido (es irreversible).

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
| [repo](repo.md) | necesites saber qué hay dónde, cómo se prueba y cómo se entrega |
| [diario](diario.md) | quieras saber qué pasó en las sesiones anteriores y qué quedó a medias |

## Qué hay en cada carpeta
| carpeta | qué es | detalle en |
|---|---|---|
| `juegos-pc/` | los HTML de los juegos, uno por juego | [repo](repo.md) |
| `.claude/skills/` | `graficos`, `assets-ia`, `banco` | [juegos](juegos.md), [rezona](rezona.md) |
| `herramientas/rezona/` | `rz.py` (cliente stdio del MCP) y scripts de horneado | [rezona](rezona.md) |
| `docs/` | `GUIA-JUEGOS.md` (la receta), `MANUAL_JUEGOS.md` y `TRASPASO_BOSQUE.md` (referencia) | [repo](repo.md) |
| `assets/` | texturas ya horneadas del Bosque (otra línea) | [repo](repo.md) |
| `memoria/` | esto | `MEMORIA.md` |
