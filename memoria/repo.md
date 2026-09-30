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

## Espacio (medido el 30/09/2026, `git rev-list --objects --disk-usage` por rama)
- Todo el repo empaquetado: ~214 MB. **Nuestra rama (`claude/mariano-peak-repo-63ebvl`) aporta 149 MB**;
  las de otras sesiones (`luck-session`, `otra-sesion-persona`, `ccr-…`) ~66 MB: son de otra gente, no se tocan.
- De los 149 MB, **85 MB son copias viejas de ARRABAL de antes del sellado** (`juegos-pc/Arrabal.html` con
  varias versiones de ~46 MB y `assets/arrabal/`): ya no están en el árbol, sólo en la historia. Otros ~17 MB
  son versiones viejas de `Duelo.html`/`Cabezones.html` y de los GLB (git comprime bien las versiones
  seguidas cuando los assets no cambian: cada `Duelo.html` nuevo cuesta ~3 MB, no 9).
- **No reescribir la historia a ciegas**: ARRABAL baja sus assets de jsDelivr **fijados a un commit** de esta
  rama; si se purgan esas copias viejas cambian los hash y el juego sellado se puede romper, y re-fijarlo exige
  abrir `arrabal/` (código del usuario). Además se caen los links de githack a commits viejos y hace falta
  `push --force`. Sólo con pedido explícito del usuario y el código del sello.
- El árbol está limpio: lo pesado son los HTML armados (se necesitan para githack) y los assets fuente. Los
  assets de CABEZONES se usan todos (nombres dinámicos: `'cab-'+id+'-'+expr`, `'ui-fx-'+n`…). Los de DUELO
  que se repiten con CABEZONES no cuestan nada en git (mismo blob).
- Limpieza del 30/09: 4 imágenes que DUELO no usaba, 3 clips sin uso en los GLB (`arquero_alto`,
  `levantarse`, `caminar`) y `juntar.mjs`. `Duelo.html` 9,11 → 8,72 MB.
- `git fetch origin` trae las ramas de todas las sesiones: el `.git` local pasa de ~65 a ~215 MB. Es sólo local.
