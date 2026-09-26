---
name: juego-terror
description: Receta para terror en primera persona para celular (a lo Residence Massacre) — casa de bloques con paredes huecas, luz de adentro separada del sol, grupo fijo de luces, interacción por ángulo, bicho con máquina de estados y caminos afuera/adentro, placard con minijuego, susto encuadrado, y un bot de noche que mide el equilibrio. La usa juegos-pc/Residencia.html.
---

# Terror en primera persona — la receta de NO LO DEJES ENTRAR

Fuentes en `herramientas/residencia/fuentes/`, se arma con `herramientas/residencia/armar.sh`, banco en
`herramientas/residencia/banco/`. **Se edita la fuente.** El armado deja una copia con three local en `/tmp/ui/res/r.html`.

## Render
- **La luz de adentro no es la de afuera.** Cada vértice lleva `aFuera` (1 afuera, 0 adentro) y un parche de
  `onBeforeCompile` multiplica sol, hemisferio y ambiente por `mix(uAdentro, 1, vFuera)`. Sin eso el sol entra por las
  paredes. De día `uAdentro` ≈ 0,6 (se ve la casa); de noche 0,2 (sólo alumbran las lámparas).
- **Cuatro puntuales fijas**, repartidas cada cuadro entre las lámparas prendidas más cercanas. Nunca se agregan ni se
  sacan luces: cambiar la cuenta recompila todos los materiales.
- Linterna = `SpotLight` colgada de la cámara. En el susto, una puntual pegada a la cara: en un cuarto a oscuras la cara
  del bicho mide 40 sobre 255 y no se lee.
- **Dos caras al mismo alto parpadean**: piso de la casa 1,5 cm arriba del pasto, cimiento en el medio.

## La casa
- Paredes por líneas con huecos (puertas, ventanas, arcos). **Los huecos se filtran al tramo de la pared**: dos paredes
  sobre la misma línea (la de z = 0 partida por el hall) se robaban los huecos y dejaban una pared fantasma de lado a lado,
  que además cortaba los caminos del bicho.
- Colisión: cajas en 2D por piso; el jugador es un círculo que sale por el lado más corto.
- Una sonda de alcance (`alcance.js`) recorre una grilla de 0,15 m desde la vereda con las puertas abiertas y la
  escalera como puente, y dice qué cosa no se alcanza caminando. Las puertas se abren con `meta = 1` y se deja que se
  animen: tocar `abierta` a mano no mueve la hoja ni su colisión.

## Interactuar
- **Por ángulo, no por rayo**: la cosa más cerca del centro de la mirada dentro de su radio. La visibilidad muestrea el
  segmento contra las cajas del piso, **sin contar el mueble que la sostiene** (la radio sobre la mesa, el tambor).
- Tocar para lo instantáneo; mantener (con aro que se llena) para clavar, cargar nafta, instalar.
- `prep.js` hace toda la preparación como la haría el dedo: se para cerca, mira, toca o mantiene, y verifica el efecto.

## El bicho
- Estados: merodea → acercarse → respira (la pista) → rompe el vidrio → arranca tablas → entra → busca / olfatea
  placards → persigue → mata; huye con la luz del cuarto o la linterna en la cara.
- Afuera: grafo de nodos alrededor de la casa (Dijkstra); adentro: grilla de 0,25 m por piso con A* y la escalera.
- **La respiración dura según la dificultad** (fácil 7→5 s, normal 5,5→3,6, pesadilla 4,2→2,8 de 12 a 6): con 2,4 s
  fijos nadie llega a prender la luz.
- **La cara va en el vidrio**: el bicho mide 2,6 m y la cabeza le quedaba arriba del dintel. Respirando se agacha y se
  corre la raíz (medida con la cabeza, como en el susto) para que el centro de la cabeza quede en el medio de la ventana, a
  0,6 m del vidrio y mirando para adentro. Los ojos se dibujan después del vidrio (`renderOrder`) o el vaho los apaga.
- El vidrio donde respira se empaña (el vaho sube en 3 s y tarda 15 en irse).

## El placard
- **Un toque corre la marca, no le da velocidad.** Con impulsos de velocidad una persona con 0,3 s de atraso perdía el
  90% (el control oscila). Con toques que corren 0,06 y frenan el tirón, `qte.js` mide: rápida 100/97/87% (a las 12,
  a las 3 y a las 6), normal 100/95/75%, lenta 98/87/47%.
- La persona del banco ve con atraso, toca a lo sumo 5 veces por segundo, duda y a veces se equivoca de lado.

## El susto
- Se mide dónde quedó la cabeza respecto de la raíz y se corre la raíz para que **el centro de la cabeza** quede a 1,05 m
  y a la altura de los ojos (aparece a 1,9 m y se tira encima en un cuarto de segundo). Con 0,6 m se ve el entrecejo.
- Sin HUD, temblor, y la cámara gira hacia la cabeza.

## Banco
- `noche.js escenario reacción repeticiones [dificultad]`: una noche entera a 1/30 con un jugador que prende la luz del
  cuarto atacado con cierta demora, se esconde si entra y juega el placard como persona. Quieto muere siempre; sólo
  placard sobrevive a veces; con luz a 2,5 s casi siempre.
- `toques.js`: dedos de verdad sobre la pantalla girada (escenario (X, Y) → pantalla (W − Y, X)).
- `fuzz.js`, `vista.js` / `foto.js` (capturas: las del escenario girado se enderezan con `rotate(90, expand=True)`).
