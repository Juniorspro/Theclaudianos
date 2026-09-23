# Rezona Lab
Fuente: `docs/GUIA-JUEGOS.md § 1. Preparar Rezona` y `§ 4`. Ver también: [juegos](juegos.md), [repo](repo.md).

## Entrar
- El MCP **no viene conectado** en estas sesiones: se le habla por stdio con
  `python3 herramientas/rezona/rz.py tools | call <tool> '<json>'`. → `herramientas/rezona/rz.py`
- Login sin navegador: `npx rezona@latest login --no-browser` imprime
  `https://rezona.ai/api-keys?code=XXXX-…`; el usuario lo aprueba en el celular. El PAT queda en
  `~/.rezona/credentials.json` (fuera del repo). Tarda ~40 s en imprimir el link.
- 2026-09-16: login aprobado y **comprobado** — `list_projects` devolvió proyectos reales.
- **El contenedor es efímero**: cada sesión nueva puede necesitar login nuevo. Comprobar primero
  `ls ~/.rezona` y `${REZONA_PAT:+definida}` **antes** de pedirle otro código al usuario.
- Créditos al 2026-09-16: ~478.700.
- 23/09/2026: el PAT del 16/09 volvió `PAT_INACTIVE` aunque el archivo seguía: **que exista
  `~/.rezona/credentials.json` no quiere decir que sirva**. Probar con una llamada antes de usarlo.

## Al generar (cada trampa cuesta créditos)
- **El `output_path` que vale es el de la respuesta**: pedís `roca.png`, vuelve `roca-g1.png`.
- `size` respeta la proporción, **no** el número. Lados múltiplos de 16, ≥655.360 px, lado largo ≤3840.
- Fondo transparente **sólo** con `transparent: true`.
- El modelo de imagen por defecto saca **PNG**: con `.jpg` da `GENERATION_OUTPUT_FORMAT_MISMATCH`,
  que es terminal — no reintentar, cambiar la extensión.
- `fetch_generated_asset` y `upload_project` exigen carpeta `.rezona/` en el directorio donde escriben.
- **Una imagen de prueba antes de cada tanda.** Si vuelve `CREDIT_RESERVE_FAILED` (pasó el
  22/09/2026 con la cuenta llena), no reintentar en bucle: plan B por código y decirlo.
  → `docs/GUIA-JUEGOS.md § 8. Plan B`
- 3D: ~155-185 s por modelo y **sale de 28-30 MB y ~960 mil triángulos** — hay que simplificar a
  ~2.500 (repetido) o ~20.000 (único y cercano). → `docs/GUIA-JUEGOS.md § 4.1`
- Rig: `source_task_id` es el `gtask-…` del modelo propio; **comprobar los clips que llegaron**, no
  los que se pidieron (ya volvieron tres iguales). → `§ 4.3`
- **Imágenes: andan bien.** 23/09/2026: 14 de 14 al primer intento, de 11 s a 160 s cada una.
  `transparent: true` recorta bien. `768x1664` pedido → llega `768x1376` (la proporción, no el número).
- **Bajar lo generado sin `fetch_generated_asset`**: `check_generation_tasks` con `project_id` da el
  `public_url` de cada ítem listo; con `curl` alcanza. No hace falta la marca `.rezona/`.
- **Audio: caído el 23/09/2026.** 11 pedidos (3 músicas ×2, 5 efectos) → `PROVIDER_UNAVAILABLE`
  (`NOIZ_FAILED`), todos. Se reintentó una vez y se pasó al sintetizador. No reintentar en bucle.
- Música con `duration: 60` → `VALIDATION_ERROR` (terminal); con **30** el pedido entra.
- **Subir juegos a Rezona está prohibido** (23/09/2026). Rezona se usa, si acaso, para generar assets.
- No existe comando para borrar un proyecto subido: ni en el MCP ni en el CLI (`init`, `login`, `status`, `mcp`).
