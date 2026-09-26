---
name: sprites-video
description: Animaciones 2D de personajes sacadas de videos generados (Rezona/Seedance) — referencia sobre verde, un video por golpe, control cuadro por cuadro, recorte por relleno, y cuadros empaquetados en un video chico con el alfa al lado que el navegador decodifica al cargar. La usa juegos-pc/Ronin.html (herramientas/ronin/).
---

# Sprites que salen de un video

## La cadena (herramientas/ronin/)
1. **Referencia**: una imagen por personaje, cuerpo entero, **de perfil mirando a la DERECHA**, sobre verde plano #00FF00,
   ocupando ~55% del alto. El tamaño en cuadro de la referencia es el de todos sus videos: no se corrige después.
2. **Un video por animación** (`prompts.py` → `enviar.py`): Seedance, 4 s (acepta 4 a 15), 720p 16:9,
   `source_url` = la referencia y, si vuelve a la pose, **`last_frame_url` = la misma referencia**. `extra:{generate_audio:false}`
   (con audio, a veces lo rechaza por política). Caminar se pide «en el lugar, como en una cinta».
3. **Control** (`qa.sh` + `filas.py`): una fila de 8 cuadros por animación. **Se rechaza** y se rehace si: gira hacia la cámara o
   se da vuelta, cambia de ropa, sale un efecto de dibujito (explosión, aura), o se sale del cuadro por un costado.
4. **Recorte** (`cuadros.py`): relleno desde el borde sobre el «verdor» g − max(r, b), alfa suave en la franja, componentes grandes.
5. **Horneado** (`hornear.py` → `procesar.py`): raíz = los pies del primer cuadro de `quieto`, escala = alto pedido / alto de pie;
   se sacan las colas quietas, se submuestrea guardando el cuadro del golpe (el de mayor alcance), y cada animación va a un
   **video con el alfa al lado**: izquierda el color premultiplicado sobre negro, derecha el alfa en gris.
   H.264 CRF 34, `-bf 0 -g 999`, yuv420p. A CRF 34 no se distingue de 30 (34,8 contra 36,8 dB) y pesa un 25% menos.
6. **En el juego** (`3_assets.js`): un `<video>` por clip, se busca cada cuadro a (k + 0,5)/12, `drawImage`, `getImageData`,
   se despremultiplica y se recorta. Tres clips en paralelo. Se decodifica cuando hace falta el personaje y se tira después.

## Lo que costó una vuelta cada uno
- **El Chromium del banco no tiene H.264**: el armado sale doble (MP4 para el celular, WebM VP9 para el banco). El MP4 se
  prueba con un Google Chrome bajado y desempaquetado con `dpkg-deb -x` (sin instalar nada).
- **Esperar `requestVideoFrameCallback` con el video en pausa se come el tope entero**: con 60 ms por cuadro el héroe tardaba 9 s.
  Después de `seeked` el cuadro ya se puede dibujar: 1,5 s.
- **Un video que pega en el segundo cuadro no deja reaccionar**: el enemigo sostiene la pose de carga (temblando) hasta que haya
  al menos 0,46 s entre el aviso y el golpe.
- **Lo que el video corta contra el borde** (una espada en alto) se disuelve en 48 px en vez de terminar en una línea recta.
- **El verde se mete en telas y borroneados**: el verde nunca pasa del máximo de rojo y azul. Un margen fijo («promedio + 12»)
  no toca los oscuros, que es donde se nota. Un cian pintado por el propio video se neutraliza aparte, sólo en ese personaje.
- **Pedirle a la IA que achique a un personaje en la referencia no sirve**: o lo agranda o lo deja diminuto y sin detalle.
- **Esperar con `pgrep -f "texto"` se encuentra a sí mismo** (el texto está en la línea de comando del propio shell): el bucle
  no termina nunca. Se ancla: `pgrep -f "^python3 enviar.py …"`.
- **Los cuerpos anchos** (un esqueleto en cuatro patas) necesitan su ancho en el alcance y en la separación, si no el que pega
  queda afuera de su propio alcance.
