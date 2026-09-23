---
name: juego-25d
description: Receta para juegos 2.5D pixel art (personajes 2D en planos, mundo 3D iluminado, post HDR a baja resolución) con cinemáticas, menús en la grilla de píxeles, niveles verificados por búsqueda y traducción auditada. La usa juegos-pc/Mate.html.
---

# Juego 2.5D pixel art — la receta de MATE AMARGO

Fuentes en `herramientas/mate/fuentes/` (un archivo por parte), se arma con `herramientas/mate/armar.sh`
y el banco está en `herramientas/mate/banco/`. **Se edita la fuente, nunca el HTML armado.**

## El render (lo que hace que el 3D sea pixel art)
- Se dibuja a **W×H chicos** (≈470×217 en un celular acostado) y el lienzo se agranda por un **entero**
  de píxeles reales: `PX = floor(altoReal/200)`, `image-rendering: pixelated`.
- **16 texeles por unidad** de mundo (`TX`). La distancia de cámara sale de `(H/TX)/2/tan(fov/2)`,
  así un texel de sprite mide exactamente un píxel. La cámara **se clava a la grilla** de 1/16.
- Cadena: escena en HDR (HalfFloat) → brillo → gaussiano → rayos de dios (40 muestras radiales hacia
  la luna) → final con ACES **de three**, gradación lift/gain, cámara lenta (aberración, desaturado),
  viñeta, grano, destello y fundido.
- **Los rayos radiales agarran cualquier cosa brillante**: un sprite quemado o un NaN tira una estela
  en diagonal. Si aparece una mancha que «sale» del personaje, apagar rayos y brillo para aislarla.
- Sprites: planos con `MeshStandardMaterial`, `alphaTest 0.5`, `DoubleSide`, **mapa normal sacado de la
  distancia al borde** (la luz de costado dibuja el contorno) y `customDepthMaterial` para que hagan sombra.
  Cada entidad clona la textura para tener su propio `offset` de cuadro.
- **Luz del personaje**: una puntual tibia que lo sigue (0,9, alcance 4,5). Sin eso, un héroe de campera
  oscura en un puerto de noche desaparece.
- Cantidad de luces **fija** (seis de nivel repartidas a las lámparas más cercanas, cuatro de fogonazo):
  cambiar cuántas hay recompila todos los materiales.
- Conos volumétricos aditivos: **el largo sale del piso de abajo**, si no atraviesan el suelo.
- Un plano de reflejo aditivo lejano, visto rasante, se lee como **mancha rota** entre objetos.

## Personajes por código
- Esqueleto de pose (cadera, torso, muslos, rodillas, cabeza) pintado píxel a píxel, contorno y pasada
  de luz arriba a la izquierda. **Los brazos van aparte**, con el pivote en el hombro: cada uno apunta
  a su enemigo (tocar dos enemigos con dos dedos = un brazo a cada uno).
- La bufanda es una cadena de verlet. **`computeVertexNormals` sobre posiciones en cero da NaN**: la
  normal se pone a mano. Un NaN en el HDR se ve negro en el cuadro y blanco en el brillo.
- **Girar un sprite sobre los pies** lo saca dos metros de lugar: la voltereta gira sobre el centro.
- Estela de cámara lenta: copias aditivas del sprite. **`alphaTest` corta la opacidad**: con opacidad
  0,5 y `alphaTest 0,5` no se ve nada.

## Niveles
- Mapas de texto armados con piezas en Python (`niveles.py`: `suelo`, `r`, `tablon`, `p`), en metros y
  desde abajo; el JSON sale solo. Las filas se **completan** al cargar.
- Leyenda: `#` sólido, `=` tablón (sólo frena cayendo), `B` madera que vuela con explosión (cada
  baldosa su malla, así se esconde), `x` cajón, `V` vidrio, `^` alambre, `<` `>` cinta, `v` vapor,
  `o` garrafa, `c` chapa de rebote, `l` lámpara, `n` neón, `P` arranque, `D` puerta, `m e p t J` enemigos.
- **Fuera del mapa por abajo es vacío**, no sólido: si no, los pozos tienen piso invisible.
- **`alcance()` verifica cada nivel**: búsqueda en anchura sobre los estados «parado» y «en la pared»,
  probando 68 saltos y deslizamientos con la física real del juego. Dice si se llega a la puerta, qué
  enemigos no se pueden ver desde ningún lugar alcanzable y dibuja el mapa con `*` donde se pisa.
  Encontró dos niveles imposibles antes de jugarlos (un piso que faltaba bajo un puente de mando y un
  respiradero que no subía hasta el tablón).

## Cinemáticas y menús
- Guion = lista de pasos: `vineta`, `txt` (narración), `habla` (retrato + máquina de escribir con voz),
  `titulo` (capítulo), `cartel` (el del jefe), `cam` (cámara del motor), `barras`, `musica`, `fundir`,
  `creditos`. El toque completa el texto o pasa; «SALTEAR» arriba a la derecha.
- Viñetas ilustradas por código a 300×164 y agrandadas por entero, con paneo lento.
- **Menús en la misma grilla de píxeles**, encima del mundo vivo: los botones se registran al dibujarse
  y se eligen **al soltar sobre el mismo botón**. El logo: cada píxel de la fuente es un bloque, con
  degradé, canto en 3D, contorno y un brillo que lo cruza.
- Un cartel que depende del ancho (tarjetas del mapa) se parte en renglones: en una tablet W es 293.

## Idiomas
- `tr('frase en castellano')` y tabla `FRASES` de tríos. La auditoría recorre menús, cinemáticas y
  pistas en inglés y portugués y lee `TR_FALTA`.
- **El texto que se escribe de a poco o se parte en renglones da falsos «faltantes»**: se descarta si
  todas sus palabras (la última como prefijo) ya son de alguna traducción.
- La fuente no tiene `;` ni `’`: se chequea que cada carácter de las traducciones exista.

## Sonido
Motor sintetizado en `2_audio.js` (electro-tango noir, 9 temas, 44 efectos, ambientes, voces de
diálogo, cámara lenta que baja altura y cierra el filtro). `window.SONIDOS_BUF[nombre]` pisa cualquier
efecto con un archivo sin tocar código.
