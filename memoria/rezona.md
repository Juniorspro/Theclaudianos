# Rezona Lab — generar y hornear
Fuente: `herramientas/rezona/`; reglas largas en `.claude/skills/assets-ia` y `docs/GUIA-JUEGOS.md`.
Ver también: [entrega](entrega.md).

## Acceso
- Cliente stdio propio: `python3 herramientas/rezona/rz.py tools | call <tool> '<json>' | esperar <id>`.
  Levanta `npx rezona@latest mcp` como hijo, así que **no depende de que el cliente tenga el MCP**.
- Login sin navegador: `npx rezona@latest login --no-browser` imprime
  `https://rezona.ai/api-keys?code=XXXX-…`; el PAT queda en `~/.rezona/credentials.json`.
  **El contenedor es efímero: cada sesión nueva puede necesitar login nuevo** (2026-09-22: la
  credencial seguía viva).
- Proyecto descartable **único**: `tOMtshuHnZ` («tmp — descartable, borrar»). Créditos al
  2026-09-16: 478.723.
- Los `task_id` de todo lo pedido están en `herramientas/rezona/crudo/tareas.json` (versionado):
  perder un id es perder un asset pagado.

## Trampas (todas pagadas)
- Las respuestas vuelven **desordenadas**: emparejar por el `id` del JSON-RPC.
- `check_generation_tasks` devuelve la lista bajo **`items`**; pasándole `project_id`, cada ítem
  listo trae `public_url` — con eso alcanza `curl`, no hace falta `fetch_generated_asset`.
- El `output_path` que vale es **el de la respuesta** (`assets/x-g1.png`).
- `transparent:true` para fondo transparente de verdad; el modelo por defecto saca **PNG**.
- `size` respeta la proporción, no el número (pedí 1536×768, llegó 1376×768).
- `submit_rig3d_generation`: `source_task_id` es el `gtask-…` de **tu propio** model3d, cada
  animación se cobra aparte y los nombres van con prefijo (`preset:walk`).
- Tope de 12 tareas en vuelo **por cuenta**.

## Horneado, lo medido acá
- Un rig de Tripo vino con **41 huesos**: WebGL1 garantiza 128 vectores de uniform de vértice
  (32 mat4) y el shader no compila → pantalla vacía. `podar_rig.py` colapsa los 16 de torsión → 25.
- `achicar_glb.py` baja color a 1024 y normal/ORM a 512 **y compacta el binario**: un `bufferView`
  viejo que ya nadie mira se queda adentro y hace el archivo MÁS grande (1,81 → 2,01 MB).
- Los pies de un rig se **miden** barriendo los clips: el bind no dice dónde termina el pie
  cuando el ciclo baja la cadera.
- Íconos de interfaz: el CSS enmascara por el **canal alfa**, no por la luminancia. Van en gris+alfa
  (`hornear_ui.py`): 345 kB → 63 kB.
- Texturas: pedirlas *sin sombras*, contar los **metros** que cubre cada foto y guardarlos
  (`assets/metros.json`).
