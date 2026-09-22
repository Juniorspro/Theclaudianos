# Entregar
Ver también: [rezona](rezona.md), [bosque](bosque.md).

## El link para el celular
`https://raw.githack.com/Juniorspro/Theclaudianos/claude/mmm-repo-name-53rbfd/juegos-pc/Bosque.html`
— `raw.githubusercontent` y jsDelivr sirven el HTML como `text/plain` con `nosniff`, así que
muestran el código en vez de correr el juego. Y **el HTML se adjunta siempre** al cerrar la vuelta.

## Los assets no van adentro del HTML
- Texturas, cielo y el GLB del bicho viven en `assets/` y el juego los pide por **jsDelivr con SHA
  de commit**: la rama lleva barra (`claude/…`) y jsDelivr corta la versión en la primera barra.
- La constante es `CDN_IA` en `juegos-pc/Bosque.html`. **Cada lote de assets nuevos obliga a:**
  1. commitear los assets, 2. `git rev-parse HEAD`, 3. cambiar `CDN_IA`, 4. commitear el código.
- Lo que sí va embebido: los **íconos del HUD** (63 kB de máscaras). La interfaz no puede depender
  de una descarga.
- Peso hoy: HTML ~250 kB; assets 2,6 MB (el GLB del bicho, 1,29 MB, es el grueso).

## Git
- Rama de trabajo: `claude/mmm-repo-name-53rbfd`. Push seguido: **el contenedor se revierte solo**
  y lo pusheado es lo único que sobrevive.
- Antes de commitear, mirar el diff; si algo parece faltar, `git fetch` antes de sacar conclusiones.
