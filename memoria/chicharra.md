# CHICHARRA — el juego de Mariano Peak
Archivo: `juegos-pc/Chicharra.html` (un solo HTML, ~830 KB con los assets adentro, sin red).
Banco: `pruebas/chicharra/`. Assets: `assets/chicharra/` (WebP horneados) + `herramientas/chicharra/`.
Ver también: [pixel2d](pixel2d.md) (de dónde salió el método), [repo](repo.md).

## Qué es
Matamarcianos vertical de celular: la nave sigue al dedo y dispara sola, oleadas de bichos, jefe al
final del nivel, monedas y tienda. Inspirado en los arcade de naves tipo Galaxy Attack **sin copiar
nada**: bichos, paleta, música y nombre propios. Pedido del 23/09/2026: «Recréame este juego… con
muy buenas animaciones menús y soundtrack más efectos de sonido».

## Dónde se juega (links comprobados el 23/09/2026)
- **githack** (lo que pide el usuario para iOS): `https://raw.githack.com/Juniorspro/Theclaudianos/<commit>/juegos-pc/Chicharra.html`
  — con el hash **completo** del commit. Comprobado: 200, `text/html`, 78.200 bytes, idéntico al
  del repo. Cada versión nueva = link nuevo con su commit.
- **Rezona: NO.** El usuario pidió «nunca lo subas ahí». Se había subido una vez (proyecto
  `oEZocHewgj`); ni el MCP ni el CLI tienen comando para borrar, así que lo tiene que borrar él
  desde la web de Rezona Lab.

## Versión 2 (23/09/2026): assets HD de Rezona + menús nuevos
Pedido: «texturas HD a todo haciendo assets con Rezona lab… música menú nuevo… mejoralo en un 100%».
- **14 imágenes de Rezona**: 3 naves, 5 bichos, 3 jefes, 3 fondos. Crudo 17 MB → **525 KB** en WebP
  (`herramientas/chicharra/hornear.py`: recorta al contenido, gira la chicharra que salió mirando para
  arriba) → `empaquetar.py` las mete como `data:` en `<script id="archivos">` al final del `<body>`.
  El crudo NO se commitea: se rebaja con `curl` del `public_url` del proyecto `nLqnwefrUA`.
- **Lo generado no reemplaza nada hasta que llega**: el arte de código sigue y cada imagen lo pisa al
  decodificar (`cargarAssets` → `aplicarAsset`).
- **Música generada: falló** (ver [rezona](rezona.md)). Suena el sintetizador nuevo (`TEMAS`: acordes,
  bajo, arpegio, melodía y batería por tema). Si algún día hay `musica-menu/juego/jefe.mp3` en
  `assets/chicharra/`, `empaquetar.py` las mete y `Sonido` las prefiere solo, sin tocar código.
- 3 naves con disparo propio (HALCÓN abanico, BRASA pesada 2.500, JADE agujas 5.000); 3 jefes con
  geometría y ataques propios (`JEFES`), uno por zona; 3 zonas con su fondo.
- Hangar (vitrina que gira, deslizar para cambiar nave), mapa de niveles con rangos, ajustes
  (música, efectos, control, sensibilidad, vibración, temblor), tienda con íconos, fin con sello.
- **Control relativo por defecto**: la nave copia el movimiento del dedo. Se ACUMULAN los
  movimientos (`Entrada.acx/acy`): en un cuadro pueden llegar varios. Medido: dedo −120,−60 →
  nave −120,−60, y no salta al apoyar.
- Botones del juego al APOYAR (bomba, pausa); de menú al LEVANTAR sin correr el dedo.
- Un dedo que cae sobre la bomba no maneja la nave (`Entrada.filtro`). Medido: 0 px.

## Números de la v2
- Jefes HD a **250 de ancho** y plantados en `80 + alto/2`: a 300 se metían debajo del HUD.
  Su geometría está medida sobre 300 y `geoJefe` la escala.
- Nave HD a 90 de ancho (a 76 se veía chica al lado de los bichos).
- Banco: 1,0–1,3 ms por cuadro (antes 0,5): los sprites HD cuestan el doble. Sigue siendo SwiftShader.
- Bot: gana 4 de 6 niveles con las tres naves, sin mejoras (varía entre 4 y 5 por corrida).

## Música por zona (23/09/2026)
- Tres temas sintetizados propios: `juego` (violeta), `esmeralda` y `carmesi`, más `menu` y `jefe`.
  Medido: 62, 64 y 88 osciladores en 4 s por zona (son temas distintos). La música de Rezona sigue
  sin poder generarse; si vuelve, `empaquetar.py` mete los MP3 y `Sonido` los prefiere solo.

## Cómo está armado
- **No es pixel art**: se dibuja con gradientes y halos, y cada sprite se **hornea una vez** a un
  lienzo (`K=2`, se dibuja a la mitad). El horneado es lo que lo hace barato.
- Unidades de diseño fijas: el mundo mide **siempre 412 de ancho**; el alto sale de la pantalla.
  En apaisado, si el alto baja de 620 se achica todo y se centra (si no, el menú no entra).
- Simulación a **60 Hz fijos**, dibujo a lo que dé la pantalla. Los flancos de entrada se borran al
  final del paso.
- Azar del mundo con semilla (`mulberry`), azar visual con `Math.random`: separados a propósito.
- Progreso en `localStorage` (`chicharra.v1`) dentro de `try/catch`.

## Números que ya se pagaron (medidos en el banco)
- **Daño base 2, no 1**: con 1 el jefe aguantaba 60 s de tiro seguido (medido: 11 de daño en 15 s).
- Jefe: `220 + nivel*90` de vida; cañones `48 + nivel*14`.
- Se arranca con arma `1 + min(2, nivel/3)`: sin eso los niveles altos eran imposibles.
- Oleadas: espera `2.8 - nivel*0.16` (mín 1.2) y tope de `10 + nivel*2` bichos a la vez.
- Rendimiento en el banco: **0,51 ms por cuadro** (simulación + dibujo), 0,78 ms de dibujo.
  Son de SwiftShader: **no dicen nada de un teléfono**.
- El bot gana **5 de 6** niveles probados (1,2,3,4,8; pierde el 6), sin mejoras compradas.

## Trampas de esta vuelta
- `golpearJugador()` **vacía** `M.balasE`; el bucle que recorría ese array quedaba con el índice
  colgado y tiraba `undefined.x`. Después de golpear: `i=Math.min(i,M.balasE.length)`.
- El fundido entre pantallas se descuenta en el **paso**, no en el dibujo: si se descuenta al
  dibujar, una prueba que adelanta sin dibujar deja la pantalla oscurecida para siempre.
- La nebulosa se repite en vertical: sin llevar los dos bordes al color base se ve **una raya
  horizontal** cruzando el fondo.
- La portada necesita su mundo **antes** del primer dibujo: el primer cuadro dibuja sin haber pasado.
- El bot no apuntaba al jefe (sólo a los bichos) y parecía que el jefe era inmortal. **Un resultado
  raro suele ser la prueba, no el juego.**
