# El repo
Ver también: [rezona](rezona.md), [juegos](juegos.md), [diario](diario.md).

## Nombre
- Se llama **Mariano Peak** (pedido del 16/09/2026). En GitHub el remoto **todavía** es
  `juniorspro/theclaudianos`: el rename lo tiene que hacer el usuario en Settings → Repository name;
  desde acá no hay permiso de administración por API. GitHub deja redirect, no se rompe nada.

## Qué hay dónde
- `juegos-pc/Bosque.html` — juego VHS de terror, de **otra línea de trabajo**. No se toca.
- `docs/GUIA-JUEGOS.md` — **la receta**, con los números medidos. Es lo que se abre por sección.
- `docs/MANUAL_JUEGOS.md` y `docs/TRASPASO_BOSQUE.md` — referencia heredada, no plan de trabajo.
  Los juegos que nombran (BARRIO, CUBOS, Maicol) no se continúan acá.
- `assets/` — texturas del Bosque ya horneadas a 768 JPEG.

## Trampa de la guía
`GUIA-JUEGOS.md` fue escrita en **otro** repo: las rutas que cita (`bosque/`, `pique3d/`, `perro/`,
`enjambre/`, `bosque/herramientas/…`) **no existen acá**. Los números y las recetas valen igual;
los archivos de ejemplo, no: no perder tokens buscándolos.

## Entregar
- **Un HTML autocontenido**: cada textura y cada modelo como `data:` URI en `window.ARCHIVOS`.
  **Sin `fetch`** (desde `file://` se bloquea en silencio): los GLB con `atob` → `loader.parse`, y
  las texturas de adentro del GLB como `<img>` con un plugin del parser. → `docs/GUIA-JUEGOS.md § 10`
- El base64 engorda un tercio (8,6 MB de datos → 11,4 MB; archivo final 12,1 MB en el bosque).
- Adjuntar el HTML al cerrar cada vuelta, sin que lo pida.
