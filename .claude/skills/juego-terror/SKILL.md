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
- **Cada tramo de pared se corta donde cambia el cuarto de cada lado.** El material salía del cuarto del medio del tramo:
  el baño se quedaba con el empapelado del dormitorio y el depósito con el del cuarto del nene.
- Texturas por cuarto (todas por código): tachas de 33 cm en las alfombras (como el original), tablas con veta, damero,
  azulejo de 15 cm, empapelado a rayas o con dibujito, siding afuera y ladrillo en el zócalo. `ESC_TEX` dice cuántos
  metros mide cada repetición.
- La sombra que no da el sol va pintada: las paredes se apagan cerca del piso y del techo (parche por `vY`), una franja
  negra que se apaga al pie de cada pared y bajo la moldura, y una mancha difusa bajo cada mueble (más ancha cuanto más
  alto). Calcos con `polygonOffset` y sin escribir profundidad, arriba de las alfombras.
- Muebles: cada receta se arma en su espacio propio (frente a +z) y se gira de a cuartos de vuelta (`mueblR`); todo se
  funde por material. Lo que va afuera recibe el sol (`alSol`).
- **El orden se mide** (`orden.js`): ningún mueble adentro de una pared (más de 4 cm) ni de otro, nada en el barrido de
  una puerta (la hoja muestreada de 0 a abierta), el vano libre medio metro de cada lado, nada más alto que el alféizar
  a menos de 0,9 m de una ventana, un lugar libre para clavar tablas a menos de 0,35 m del de la ventana y cada llave de
  luz alcanzable. La primera pasada encontró 6: la biblioteca, la consola, un placard y una mesita metidos en la pared, la mesada
  tapando el paso de la puerta de la cocina, la cama del dormitorio grande delante de la ventana…
- La tele prendida es una luz más del grupo (azul, titila), sin llave y sin contar para los fusibles.
- Una sonda de alcance (`alcance.js`) recorre una grilla de 0,15 m desde la vereda con las puertas abiertas y la
  escalera como puente, y dice qué cosa no se alcanza caminando. Las puertas se abren con `meta = 1` y se deja que se
  animen: tocar `abierta` a mano no mueve la hoja ni su colisión.

## Interactuar
- **Por ángulo, no por rayo**: la cosa más cerca del centro de la mirada dentro de su radio. La visibilidad muestrea el
  segmento contra las cajas del piso, **sin contar el mueble que la sostiene** (la radio sobre la mesa, el tambor).
- Tocar para lo instantáneo; mantener (con aro que se llena) para clavar, cargar nafta, instalar.
- `prep.js` hace toda la preparación como la haría el dedo: se para cerca, mira, toca o mantiene, y verifica el efecto.

## El bicho
- **Larry, el del original**: cabeza amarilla de Roblox con dos ojos negros y pupila blanca, la mandíbula partida en dos con
  dientes sólo adelante, el torso partido unido por la columna y los antebrazos estirados en hojas de guadaña con las que
  camina. De pie llega a 2,08 m; en cuatro patas la cabeza a 1,5 m. `larry.js` saca la hoja de modelo y mide sobre los
  vértices (la caja de `setFromObject` exagera con piezas giradas).
- **Las hojas pisan el piso con un IK mínimo**: el antebrazo gira hasta que la marca de la punta toca el suelo (sin eso se
  clavaban 57 cm). La altura de la punta contra el codo tiene un fondo, así que va bisección en el tramo monótono: un Newton
  se iba para el otro lado. La cadera se corre para que apoye el pie más bajo.
- El emisivo de la piel va con la misma textura en `emissiveMap`: un emisivo parejo pinta de oliva el negro de los ojos.
- Estados: merodea → acercarse → respira (la pista) → rompe el vidrio → arranca tablas → entra → busca / olfatea
  placards → persigue → mata; huye con la luz del cuarto o la linterna en la cara.
- Afuera: grafo de nodos alrededor de la casa (Dijkstra); adentro: grilla de 0,25 m por piso con A* y la escalera.
- **La respiración dura según la dificultad** (fácil 7→5 s, normal 5,5→3,6, pesadilla 4,2→2,8 de 12 a 6): con 2,4 s
  fijos nadie llega a prender la luz.
- **La cara va en el vidrio**: parado, la cabeza queda arriba del dintel. Respirando se agacha y se
  corre la raíz (medida con la cabeza, como en el susto) para que el centro de la cabeza quede en el medio de la ventana, a
  0,6 m del vidrio y mirando para adentro. Los ojos se dibujan después del vidrio (`renderOrder`) o el vaho los apaga.
- El vidrio donde respira se empaña (el vaho sube en 3 s y tarda 15 en irse).

## El placard
- **Un toque corre la marca, no le da velocidad.** Con impulsos de velocidad una persona con 0,3 s de atraso perdía el
  90% (el control oscila). Con toques que corren 0,06 y frenan el tirón, `qte.js` mide: rápida 100/97/87% (a las 12,
  a las 3 y a las 6), normal 100/95/75%, lenta 98/87/47%.
- La persona del banco ve con atraso, toca a lo sumo 5 veces por segundo, duda y a veces se equivoca de lado.

## El susto
- Se mide dónde quedó la cabeza respecto de la raíz y se corre la raíz para que **el centro de la cabeza** quede delante de
  los ojos: aparece a 1,5 m y en un cuarto de segundo llega a 0,52 (la cabeza de Larry a escala mide 46 cm), con la
  mandíbula abierta y la cámara mirando 16 cm por debajo del centro. Mirando al centro se ve el entrecejo y la boca cerrada.
- Sin HUD, temblor, y la cámara gira hacia la cabeza.

## Banco
- `noche.js escenario reacción repeticiones [dificultad]`: una noche entera a 1/30 con un jugador que prende la luz del
  cuarto atacado con cierta demora, se esconde si entra y juega el placard como persona. Quieto muere siempre; sólo
  placard sobrevive a veces; con luz a 2,5 s casi siempre.
- `toques.js`: dedos de verdad sobre la pantalla girada (escenario (X, Y) → pantalla (W − Y, X)).
- `fuzz.js`, `vista.js` / `foto.js` (capturas: las del escenario girado se enderezan con `rotate(90, expand=True)`).
