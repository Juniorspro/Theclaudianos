# Que se vea bien
Fuente: `docs/GUIA-JUEGOS.md` (la receta entera, por secciones). Ver también: [rezona](rezona.md).
Skills del repo: `.claude/skills/graficos`, `.claude/skills/banco`, `.claude/skills/assets-ia`.

## El orden que más rinde
1. Una sola hora del día y **un sol que manda** (el ambiente nunca le gana: sol 4,6 / ambiente 0,5
   / reflejo 0,26 — con el ambiente arriba sale plano y lechoso). → `§ 6.2`
2. Niebla del color del horizonte, más densa abajo y dorada hacia el sol. → `§ 6.3`
3. HDR (`HalfFloatType`) + AgX al final, con `toneMapping = NoToneMapping` en el renderer. → `§ 6.1`
4. Texturas generadas antes que colores planos; densidad antes que detalle.
5. Post-proceso con identidad (VHS, grano): tapa lo que delata lo falso. → `§ 6.10`
- Los pasos 1, 2, 3 y 5 **no cuestan un crédito**: se hacen aunque Rezona no genere.

## Lo que no se genera
Árboles enteros en 3D (salen repollo: esqueleto por código + fotos en tarjetas, `§ 6.5`), botones,
partículas y el terreno (ruido, `§ 6.4`).

## Trampas que no dan error
- Geometría **cuantizada**: hornear la escala en los vértices recorta todo lo que pasa de 1 (una
  cabaña de 9,5 m quedó en 2 m y no aparecía). Pasar a coma flotante antes. → `§ 4.2`
- `onBeforeCompile` es **uno** por material y three **reutiliza programas**: encadenar los parches y
  darle clave a cada uno, y aplicar uno solo por material. → `§ 6.3`
- El lienzo se cambia de tamaño **al empezar** el cuadro; `dt` nunca negativo. → `§ 6.1`
- `renderer.info.autoReset = false` o `info` cuenta sólo la última pasada y dice «1 triángulo». → `§ 9`
- La tabla completa de trampas pagadas: `docs/GUIA-JUEGOS.md § 11`.

## Probar
- Chromium de Playwright con SwiftShader, `executablePath: '/opt/pw-browsers/chromium'`.
  **Nunca `npx playwright install`.** → `§ 9`
- Dibuja por procesador (~1,5 s por cuadro): **los FPS de acá no se informan como si valieran**.
  Lo que vale: errores, triángulos, llamadas de dibujo y capturas.
- Esperar **tiempo de juego** (`window.__juego.t`), no de reloj.
- Lista de cierre antes de decir «listo»: `§ 12`.
