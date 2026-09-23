---
name: graficos
description: Reglas de render de three.js que ya costaron una vuelta cada una — color, luz, sombra, siluetas, fundido de geometría, costo de relleno. Usar antes de tocar materiales, luces, post-proceso o rendimiento de cualquier juego del repo.
---

# Gráficos — lo que hace que se vea bien y lo que hace que ande

## Color (cuatro vueltas pagadas)
- `setRGB` y `new THREE.Color(0x…)` toman los números como **lineales**: un color escrito en sRGB
  sale lavado. Va `convertSRGBToLinear()`.
- Una pasada de post con `ShaderMaterial` crudo **no** recibe la conversión a sRGB que three.js
  inyecta en sus materiales: se escribe a mano o todo sale oscuro.
- Un render target declarado `SRGBColorSpace` guarda codificado y el hardware decodifica al
  muestrear: sin volver a codificar, la pantalla mide 3,7 donde el destino mide 36,6.
- **El tone mapping no se aplica dibujando a un render target**: la exposición no mueve nada ahí.

## Luz
- Una luz frontal **no modela**. La clave va 40° de costado y 35° de alto, con un contra frío.
- La caída al cuadrado no sirve adentro de un cuarto: va en 1,1–1,35.
- `HemisphereLight` con los dos colores iguales no tiene forma; con el suelo negro, toda cara que no
  mire al cielo recibe cero.
- Una luz con intensidad cero **no puede proyectar sombra**.
- La intensidad de una luz pegada a la cámara tiene que **crecer con la distancia** al objeto.
- **Una sola luz que sigue al jugador** en un pasillo: una puntual fija deja los extremos negros y
  no entran más luces en el límite de uniformes.

## Que una cosa se lea a cosa
- **La silueta gana sobre el detalle.** Tres bloques planos y un color que no está en ninguna otra
  parte le ganan a un modelo fotorrealista de 40 px.
- El negro absoluto no tiene sombreado: `0x14100f` se lee a agujero. Va gris pardo, brillo húmedo y
  un emisivo **plano** (el emisivo por mapa multiplica y no levanta nada oscuro).
- Un plano de color parejo se lee a cartulina; un cono se lee a cono. Para un halo va un degradado
  radial encarado a la cámara.
- Lo que se mira a tres metros son **los bordes**: alero, fascia, zócalo, alféizar.
- Perspectiva aérea: lo lejano con menos color y menos contraste.

## Trampas de geometría
- El descarte de caras traseras mira el **orden de los vértices**, no la normal: un techo invertido
  no se ve como «falta», se ve como «está oscuro».
- `computeVertexNormals` sobre geometría indexada **promedia**: va `toNonIndexed()`.
- Un `map` sin UV no falla ni avisa: setenta metros de pasillo con **un solo texel**.
- `Matrix4.lookAt` orienta por el −Z y un `PlaneGeometry` tiene la cara en +Z.
- Los mipmaps mezclan la baldosa de al lado: un atlas va `NEAREST`, sin mipmaps y con la UV metida
  medio texel para adentro.
- `Group.add()` devuelve **el grupo**, no el hijo.

## Rendimiento
- Lo que siempre se paga es el **relleno de píxeles**: dibujar a un destino reducido y estirar.
- `renderer.info.render` se pone a cero al empezar **cada** `render()`, y la sombra es otra pasada:
  sin `info.autoReset=false`, apagar sombras *parece* no cambiar nada. (Tres veces.)
- **Fundir geometría** es la palanca más grande de llamadas: 331 → 49. Con índice `Uint32`.
- El color por vértice es lo que hace que fundir no cueste variedad.
- **Instanciar**: una malla instanciada cuesta una llamada haya uno o catorce. Para esconder una
  instancia va la matriz en cero, no saltearla. Y `frustumCulled=false` si el centro no es el del objeto.
- Un material instanciado tiene **una sola opacidad**: lo que late, late con la **escala**.
- Se funde **por cuadra, no por mundo**: con todo en una malla no hay recorte por frustum.
- La caja de sombra sigue al jugador; el mapa viejo se suelta a mano (`mapSize` no lo recrea).
- **Un cambio que no mide mejor no se deja puesto por parecer razonable.**
- **Contar triángulos por categoría antes de optimizar**: 470.000 eran vallas instanciadas (800 × 585) y
  30.000 las armas de 6.000 que llevaba cada enemigo. Lo repetido se simplifica al armar; lo que lleva un
  enemigo va en una versión `_lod` que comparte el material. Un modelo hecho de **piezas sueltas** no baja
  de su piso por más error que se le permita (el contenedor quedó en 1.172): ahí va distancia, no simplificar.
- **La calidad automática tiene que contar los cuadros lentos**: si descarta los de más de 100 ms, en el
  aparato que más lo necesita no mide nada y no baja nunca. Saltear el arranque **por reloj**, no por
  cuadros (20 cuadros a 1,6 por segundo son 12 s).
- El escalón de abajo de todo: los `MeshStandardMaterial` pasan a Lambert (en r128 la luz va por vértice) y
  el original queda en `userData` para volver. El arma en primera persona queda PBR: sin entorno sale negra.
- Afuera, con sol fuerte, **el umbral del resplandor sube** (2,3 en vez de 1,25): si no, todo lo soleado
  brilla como neón.

## Método
- **Un parámetro que no cambia lo que tiene que cambiar no está en el camino.** Antes de barrer
  valores, un **material de diagnóstico** (pintar normales) contesta en un cuadro.
- Medir el brillo con `readPixels`, nunca con `drawImage` (sin `preserveDrawingBuffer` da cero).
- El fondo equirectangular **se convierte a cubo una sola vez**: si arrancó con un marcador, al llegar la
  imagen de verdad hay que `dispose()` y reasignar, o el cielo queda del color del marcador.
- Un ícono renderizado a un render target sale **lineal**: pasarlo a sRGB y despremultiplicar el borde.
