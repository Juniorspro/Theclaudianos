# Idiomas — selector común a todos los juegos
Pedido del 23/09/2026: «A todos los juegos agrégale selección de idiomas en la pantalla principal al
inicio». Juegos de esta línea: ARRABAL, CABEZONES, CHICHARRA (el Bosque es de otra línea: no se toca).

## Cómo funciona (`herramientas/comun/idioma.js`)
- Español, English, Português, Français. La **primera vez** que se abre el juego sale la pantalla de
  idioma (arranca marcado el del navegador); después, un **globo con la sigla** en la pantalla
  principal la vuelve a abrir. Se guarda en `localStorage` como `<juego>.idioma`.
- **Traduce al dibujar**: parchea `fillText`, `strokeText` y `measureText` del contexto 2D. El juego
  no cambia; sólo hace falta el diccionario. Las frases con números van por reglas regex (`_re`); lo
  que queda entre `{llaves}` en el reemplazo vuelve a pasar por el diccionario (nombres de copas,
  rondas, pantallas).
- Lo que se dibuja **letra por letra** o se **parte en renglones** hay que traducirlo antes con
  `Idioma.T(txt)` y dibujar los pedazos con `Idioma.pausa++`/`--` (si no, se traducen los pedazos).
- Toma los toques en fase de captura: mientras la pantalla está abierta, el juego no recibe nada.
- Enganches en cada juego (4 líneas): `Idioma.iniciar(clave, aMundo, acento)` al arrancar,
  `Idioma.dibujar(g,ANCHO,ALTO,t)` al final del cuadro, `Idioma.botonAqui(x,y)` en la pantalla
  principal, y `T()` en los textos partidos.

## Cómo se agrega a un juego nuevo
1. Los cuatro enganches de arriba.
2. `python3 herramientas/comun/poner_idioma.py juego.html herramientas/<juego>/idioma.json` (mete el
   módulo y el diccionario como `<script id="idioma">` antes del juego; se puede repetir).
3. Juntar los textos: con `Idioma.vistos={}` el módulo anota todo lo que se dibuja; recorrer las
   pantallas en el banco y volcar `Object.keys(Idioma.vistos)` (ej.: `pruebas/cabezones`,
   `chi-textos.mjs` en el scratchpad de esa sesión). Completar con los literales del código.
4. Diccionario `{en:{…},pt:{…},fr:{…},_re:{en:[[patrón,reemplazo]…]}}` en `herramientas/<juego>/`.
5. Probar: `pruebas/<juego>/idioma.mjs` (primera vez abierta, toque real en ENGLISH, guardado, el
   globo reabre, capturas por idioma).

## Trampas
- El banco de CHICHARRA necesita `deviceScaleFactor:2`: con 1 las capturas salen recortadas.
- **Nunca `git stash`** con un horneado corriendo en segundo plano: se lleva archivos a medio escribir.
