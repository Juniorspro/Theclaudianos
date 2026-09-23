#!/bin/sh
# arma juegos-pc/Mate.html concatenando las fuentes, y la copia de banco que usa three local
set -e
D=$(cd "$(dirname "$0")" && pwd); F="$D/fuentes"; R="$D/../.."
cd "$F" && python3 niveles.py
cat 0.html 9_idiomas.js 1_base.js 2_audio.js 3_pixel.js 4_render.js 5_mundo.js 5b_escenas.js 6_juego.js 6b_jefe.js 7_niveles.js 8_ui.js 8c_cine.js 8d_menu.js 9z_arranque.js z.js > "$R/juegos-pc/Mate.html"
mkdir -p /tmp/ui && sed 's#https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js#three128.js#' "$R/juegos-pc/Mate.html" > /tmp/ui/mate_b.html
echo "Mate.html: $(wc -c < "$R/juegos-pc/Mate.html") bytes"
