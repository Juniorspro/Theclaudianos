# Diario
Una entrada por sesión: qué quedó y qué falta. Lo largo de cada vuelta está en el mensaje del
commit; acá va lo que otra sesión necesita saber.

## 2026-09-22 — se instaló la memoria
Rama `claude/mmm-repo-name-53rbfd`. Llegaron `docs/MEMORIA.md` y `docs/GUIA-JUEGOS.md`.
Se armó `memoria/` (índice + cinco notas + este diario) y `CLAUDE.md` quedó en tres líneas.
Medido en caracteres ÷ 3,5: el arranque pasó de **~3.510 tokens** (el `CLAUDE.md` de 202 líneas,
que Claude Code carga solo en cada sesión) a **~765** (`CLAUDE.md` 123 + `INDICE.md` 642), y cada
nota que la tarea pida suma entre 360 y 720. O sea **4,6 veces menos** para arrancar.
La bitácora vieja pasó a las notas; los números siguen en los mensajes de commit.
**Falta:** decidir qué del método de `GUIA-JUEGOS.md` se aplica — la lista ordenada por impacto
está en [graficos](graficos.md).

## 2026-09-17 — marca de la última reliquia y guía de lejos
La marca dorada vale para las dos últimas (visible en `INICIO` a 99,2 m, dentro del cuadro).
`GUIA.delante` 8 → 19 m, con halo propio y emisivo frío mientras guía (con opacidad 0,24 no se
encontraba a 19 m; quedó 0,40 ± 0,14).
**Aprendido:** la cámara mira por su −Z; el banco avanza ~0,3 s de juego por segundo de pared.

## 2026-09-16 (2) — pies, costo, luz, cinta y HUD
Pies medidos, casas fundidas, hojas sin sombra, cuadras de 55 m, IBL, VHS topado y HUD con íconos
propios. Día: 1298 → 591 llamadas y 12,10 → 2,65 M triángulos; brillo 61,9 → 93,3.
**Quedó sin hacer:** 595 mallas sueltas sin fundir, el menú no se reabre en partida, y el ciclo de
marcha del bicho sin medir contra el patinaje.

## 2026-09-16 — texturas de foto y monstruo riggeado
Cinco texturas de Rezona con normal derivado y UV proyectada desde el mundo; monstruo riggeado
(41 → 25 huesos, 1,81 → 1,29 MB) con walk/run/idle.
**Aprendido:** `camera.position` es local; `material.program` prueba que algo se dibujó; un
`bufferView` huérfano agranda el GLB.

## 2026-09-16 — arranque
El repo estaba vacío. Se sembró con el Bosque, tres skills destiladas y `rz.py`.
