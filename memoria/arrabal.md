# ARRABAL — juego de pelea con cartas
Archivo: `juegos-pc/Arrabal.html` (un solo HTML, ~1,35 MB con el arte adentro, sin red).
Arte: `assets/arrabal/` + `herramientas/arrabal/`. Banco: `pruebas/arrabal/`. Ver también:
[pixel2d](pixel2d.md), [chicharra](chicharra.md) (el motor que se reusó), [rezona](rezona.md).

## Qué es
Pedido del 23/09/2026: «un juego parecido a Skullgirls: Fighting RPG… mejores gráficos 2D,
animaciones, menús… mejorá todo en un 100%». **Todo original**: seis luchadores de un Buenos Aires
de los años 30 (La Morocha, El Bandoneón, Chispa Farolera, Doctor Mate, La Parca del Riachuelo,
Colectivo), marcos de fileteado porteño en vez de art déco, tangos propios.
- Peleas de equipos de 3 contra 3 con relevo al caer; cartas por rareza (bronce, plata, oro,
  diamante), elementos (agua > fuego > viento > agua; luna y sol entre sí), firma pasiva por carta.
- Campaña de 15 peleas en 3 barrios (la 5.ª de cada uno es jefe), árbol de habilidades de 8 nodos,
  cofre de cartas con fichas (repetidas dan estrella), subir nivel con monedas.

## Cómo está armado
- **En la pelea los personajes son títeres por código**: esqueleto con ángulos (`esqueleto()`),
  poses clave interpoladas con `suave()`, cápsulas de dos tonos + trazo de tinta. Se eligió así porque
  la generación de sprites de Rezona **no acepta imagen de referencia**: no garantiza el mismo personaje
  entre una acción y otra. Los retratos de Rezona van en cartas, VS, súper y menús.
- `TAM=1.55` escala todo el luchador (dibujo, cajas de golpe, alcances, separación).
- Controles: tocar = golpe (encadena 4), deslizar → fuerte, ↑ salto (en combo: alzada que lanza y el
  luchador persigue), ↓ barrida (en el aire: azote), ← retroceso, mantener quieto >200 ms = cubrirse.
  El gesto se lee apenas el dedo se corre 26 unidades. Especiales y súper son botones al APOYAR; un
  dedo que cae en un botón no cuenta como gesto (`Entrada.filtro`).
- El HTML es la fuente: el código entero está adentro. `herramientas/arrabal/empaquetar.py` saca y
  vuelve a meter el bloque `<script id="archivos">` con el arte; se puede correr las veces que haga falta.

## Números que costaron una vuelta
- **La cadena empuja poco y avanza**: con empuje normal el rival quedaba a 120 y el jab alcanza 105;
  el tercer golpe erraba. Cadena: `emp:40, avance:110`; sólo el remate empuja fuerte.
- **Las estocadas sostienen la velocidad** hasta llegar: con el empujón inicial solo, el roce del piso
  se lo comía y los especiales cuerpo a cuerpo hacían **0 de daño**. Además `busca:true`: si el rival
  está lejos, corren antes de pegar.
- La rareza de los rivales la manda el barrio (barrio 1: bronce y plata). Con rareza libre, la
  pelea 2 podía traer una carta diamante y era imposible.
- Reloj = `60 + 35 × tamaño del equipo` (3 contra 3 = 165 s): con 120 s se iba siempre a tiempo.
- Bot con equipo nivelado: gana 5 de 6 (peleas 2, 7, 10, 12 y 15; pierde el jefe de la 5).
