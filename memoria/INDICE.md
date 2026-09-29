# Memoria — el índice
Última puesta al día: 2026-09-29.

## Reglas que no se discuten
- Nunca cuadros de `AskUserQuestion`: se buguea en el celular. Preguntar en texto plano.
- Commit y push **sólo** a la rama de trabajo indicada. Nada de pull requests sin pedido.
- El identificador del modelo no va en nada que se pushee.
- **Verificar midiendo antes de afirmar que algo funciona.** «Anda» sin un número al lado no vale.
- **Adjuntar el HTML armado al cerrar cada vuelta**, sin que lo pida.
- Ahorrar tokens: nada de barridos exploratorios ni narración larga.
- Castellano rioplatense.
- Rezona: todo en **un** proyecto descartable; `publish_to_rezona_app` jamás sin pedido explícito.
- Si el modo auto frena algo, no se busca otro camino: se dice y decide quien pide (el OK en el chat no lo destraba).

## Quién pide
- Juega **en el celular**, en vertical (412×892), con el marco girado 90°.
- Quiere números medidos, no promesas; y el archivo adjunto en cada vuelta.
- Pide en frases cortas, a veces con varias cosas juntas: conviene listarlas y contestarlas una por una.

## Las notas
| nota | abrila cuando… |
|---|---|
| [bosque](bosque.md) | tocás el juego: estructura, constantes, sondas, qué hace cada fase |
| [graficos](graficos.md) | luz, materiales, post, rendimiento, o querés saber qué falta del método |
| [rezona](rezona.md) | vas a generar o a hornear un asset (imagen, 3D, rig, audio) |
| [banco](banco.md) | vas a probar o medir algo |
| [entrega](entrega.md) | pushear, el link para el celular, el CDN de los assets |
| [nevada](nevada.md) | tocás Arena Nevada (Madness 3D): de dónde viene, cómo se arma, qué quedó pendiente |
| [swf](swf.md) | vas a sacar algo del SWF de Madness: cómo leerlo sin Ruffle, qué hay en cada sprite |
| [juegos2d](juegos2d.md) | vas a hacer o tocar un juego 2D en pixel art (la serie nueva) |
| [diario](diario.md) | qué pasó en cada sesión y qué quedó sin resolver |

## Qué hay en cada carpeta
| carpeta | qué es | detalle en |
|---|---|---|
| `juegos-pc/` | los juegos, un HTML por juego: `Bosque.html` (3D, **en pausa**), `ArenaNevada.html` (armado) y la serie 2D | [bosque](bosque.md) · [nevada](nevada.md) · [juegos2d](juegos2d.md) |
| `nevada/` | fuentes de Arena Nevada: plantilla, js, css, audio y `armar.py` | [nevada](nevada.md) |
| `assets/` | lo generado que el juego baja por CDN (texturas, GLB, cielo) | [entrega](entrega.md) |
| `herramientas/rezona/` | cliente stdio `rz.py`, pedidos y horneados, `crudo/tareas.json` | [rezona](rezona.md) |
| `herramientas/swf/` | lector de SWF en Python puro y los extractores (`marcha.py`) | [swf](swf.md) |
| `herramientas/banco/` | `correr.py` (Bosque), `nevada.js` y `marcha.js` (Nevada) y `ver_glb.py` / `ver_anim.py` (modelos) | [banco](banco.md) |
| `.claude/skills/` | graficos, assets-ia, banco: las reglas largas heredadas | — |
| `docs/` | `MANUAL_JUEGOS.md`, `GUIA-JUEGOS.md`, `MEMORIA.md`, traspaso | referencia, no plan |
| `crudo/` | descargas y capturas de trabajo, **fuera de git** | — |
