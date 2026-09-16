---
name: assets-ia
description: Generar assets con IA (Rezona Lab y Higgsfield) y hornearlos para el juego — imágenes, texturas, audio, modelos 3D y rigs. Usar antes de pedir cualquier asset generado o de meter un GLB, una textura o un MP3 adentro de un HTML.
---

# Assets generados — pedir, hornear, meter

## Rezona Lab
Cliente: `python3 herramientas/rezona/rz.py tools | call <tool> '<json>' | esperar <task_id…>`.
Auth: `npx rezona@latest login --no-browser` (PAT `rz_live_…` en `~/.rezona/credentials.json`,
`.rezona/` va en `.gitignore`) o `REZONA_PAT`. Si dice «Not authenticated», comprobar
`${REZONA_PAT:+definida}` **antes** de pedir un login nuevo.

Catorce herramientas: `create_project` · `list_projects` · `submit_image_generation` ·
`submit_video_generation` · `submit_audio_generation` · `submit_model3d_generation` ·
`submit_sprite_generation` · `submit_rig3d_generation` · `submit_retexture_generation` ·
`check_generation_tasks` · `fetch_generated_asset` · `upload_project` · `open_workbench` ·
`publish_to_rezona_app`.

Trampas, todas pagadas:
- Las respuestas vuelven **desordenadas**: emparejar por el `id` del JSON-RPC.
- `check_generation_tasks` devuelve la lista bajo **`items`**.
- `fetch_generated_asset` escribe **relativo a su propio cwd** y exige marca `.rezona/` ahí:
  `npx rezona@latest init` en una carpeta **fuera del repo** y llamarlo con ese `cwd`.
- `fetch_generated_asset` **se vence a los 300 s con el archivo ya bajado**: esperar al archivo
  (dos lecturas de tamaño iguales), no al proceso.
- Todas las tareas devuelven el **mismo `asset_path`**: copiar al repo después de cada fetch.
- Tope de 12 tareas en vuelo **por cuenta**.
- El `output_path` lleva sufijo del servidor: `assets/x-g1.mp3`, no `assets/x.mp3`.
- `source_task_id` de rig/retexture es el `gtask-…` de **tu propio** `submit_model3d_generation`.
- Todo `*_url` tiene que ser **https público** (el servidor lo baja).
- `publish_to_rezona_app` es **irreversible**: nunca sin pedido explícito.
- **Todo se genera en UN proyecto descartable**; el borrado no se puede hacer por API (403).
- `list_projects` pagina de a 20 y devuelve `total`.

## Higgsfield
MCP a nivel de cuenta: `generate_image`, `generate_video`, `generate_audio`, `generate_3d`,
`media_upload` (devuelve URL pública permanente → sirve como `source_url` de un modelo 3D).
Conviene generar con los dos y **comparar dentro del juego**, no en la hoja de contactos.

## Horneado — cada regla costó una vuelta
1. **Pedir `face_limit` AL GENERAR** (`extra:{face_limit:6000}`): Tripo devuelve un millón de
   triángulos y el simplificador se come los tiradores.
2. El objetivo es un **número de triángulos**, no un ratio.
3. `gltfpack` va con **`-noq`** (`KHR_mesh_quantization` en `extensionsRequired` = nada se ve).
4. La textura se hornea **en los vértices antes de decimar**, muestreando el **centroide** del
   triángulo, **sin dar vuelta la V**, convirtiendo de sRGB a lineal.
5. Leer `COLOR_0` **como venga** (VEC4 de bytes normalizados): como floats sale blanco con motas.
6. **Contar los metros que cubre cada foto** para la repetición, y promediar la escala **por
   material**.
7. El tinte del material se **recalcula en lineal** cuando cambia la foto (`map × vColor × color`).
8. El mapa emisivo **se deriva de la propia foto** por percentil de luminancia con rampa.
9. Las costuras se resuelven con **`MirroredRepeatWrapping`**, no cosiéndolas.
10. Los ejes de un hueso **no se adivinan**: se giran y se mira dónde quedó la punta.
- El fondo se saca por **relleno desde el borde**, no por umbral.
- El recorte de un sprite va por **componentes conexas** (la reja pedida es una sugerencia).
- Un rig se rechaza por la **silueta**: si el hondo se parece al alto, `RIG_SOURCE_NOT_RIGGABLE`.
  Un busto o una calavera no se pueden riggear nunca.
- Las animaciones llevan **prefijo** (`preset:walk`) y los nombres desconocidos se ignoran en
  silencio. Tope 5 por tarea, y se cobra **por animación**.
- **41 huesos no entran en un teléfono viejo** (WebGL1: 128 vectores de uniform = 32 mat4): el
  shader no compila y la pantalla queda vacía. Los huesos de torsión se colapsan a sus padres.
- El `min`/`max` de un accesor va **en las unidades guardadas**, no en metros.
- WebP dentro de un GLB necesita `EXT_texture_webp`; JPEG es núcleo de glTF.
- El material se reemplaza **entero**, no se le sacan texturas de a una.
- Audio: se mide **sobre el MP3 ya escrito**, se nivela por **RMS**, el bucle **se cose**,
  `duration` es un techo, y un prompt que pide un sonido chiquito devuelve silencio — el nivel lo
  pone el código, nunca el prompt.

## La regla que manda
**Lo generado no reemplaza nada hasta que llega.** Se arranca con lo dibujado por código y el
asset lo pisa cuando decodifica: un base64 roto cuesta **una pieza**, no la pantalla. Y hace falta
una sonda `assets()`, porque un base64 que no decodifica **no falla ni avisa**.
