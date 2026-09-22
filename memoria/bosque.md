# Bosque — el juego
Fuente: `juegos-pc/Bosque.html` (un solo archivo, script clásico, three.js r128 por CDN).
Ver también: [graficos](graficos.md), [banco](banco.md), [entrega](entrega.md).

## Forma
- Terror en primera persona, vertical 412×892 con el **marco girado 90°** (`#stage`), sin pantalla
  de «girá el celular».
- Fase 1: **13 reliquias**, una por casa (12 sitios en 3 anillos) + 1 repartida.
- Fase 2: **5 notas** en los mismos sitios. Fase 3: trampilla en el claro → laboratorio de 45×6,8 m
  a −13,6 con 22 tubos; el final se dispara en el tubo reventado (`BAJO.rotoX/rotoZ`).
- La marca dorada (`MARCA_R`, sin atenuación por distancia ni `depthTest`) señala las **dos
  últimas** reliquias: `recogidas>=TOTAL-2 && recogidas<TOTAL`. La última la deja la sombra en
  `INICIO` (0, 14).
- La sombra guía hasta la trampilla caminando `GUIA.delante = 19 m` adelante y se queda al lado
  dentro de `GUIA.llega = 9 m`; mientras guía lleva halo propio (`MARCA_G`) y emisivo frío.

## Piezas que conviene conocer antes de tocar
- `PRESENCIA`: el bicho. El títere de cilindros **no se borró**, se apaga cuando llega el GLB
  (`PRESENCIA.modelo`). Su ciclo sale de la velocidad medida, nunca de un temporizador.
- Las casas se **funden por material** al terminar `crearCasa` (`fundirCasa`, marca
  `userData.f`); las reliquias se crean después y quedan sueltas a propósito.
- Los árboles van instanciados por cuadra de **55 m** (`CELDA_ARB`) y se recortan con
  `recortarCuadras()` a `2,25/densidad de niebla`.
- Materiales del pueblo: la UV se **proyecta desde la posición de mundo** (`proyectarCaja`), así
  que los metros por baldosa son los de la foto. Cambiar el `map.repeat` ahí no hace nada.
- HUD: íconos propios como **máscaras PNG en base64 dentro del HTML** (`:root{--ic-*}`), tintados
  por CSS. El menú vive en `#menu` sobre `#intro`.
- Ajustes en `localStorage`: `bosque_sens`, `bosque_gfx`, `bosque_vhs`.

## Sonda `window.__B`
`BAJO, CFG, FIN, bajar, subir, abrirTrampilla, activarNotas, cuenta, jug, aplicarGfx,
ia, brillo, saltar, casas, ir, mirar, mirarA, mirarRel, bicho, diag, pintar, fase, marcas,
guia, fundido, sombras, costo`. Detalle de uso en [banco](banco.md).

## Números de la última medición (412×892)
| | día | noche |
|---|---|---|
| llamadas de dibujo | 591 | 455 |
| triángulos por cuadro | 2,65 M | 1,86 M |
| brillo medio del cuadro | 93,3 | 16,5 |
