#!/bin/sh
# arma juegos-pc/Linea.html concatenando las fuentes (y una copia para el banco)
set -e
D=$(cd "$(dirname "$0")" && pwd); F="$D/fuentes"; R="$D/../.."
cd "$F" && python3 niveles.py > /dev/null
cat 0.html | sed '/^(function(){$/,$d' > /tmp/linea_cab.html
{ cat /tmp/linea_cab.html; echo "(function(){"; echo "'use strict';"; cat 9_idiomas.js 1_base.js 2_audio.js 3_arte.js 4_post.js 5_mundo.js 6_juego.js 7_niveles.js 8_ui.js 8c_cine.js 8d_menu.js 9z_arranque.js z.js; } > "$R/juegos-pc/Linea.html"
mkdir -p /tmp/ui && cp "$R/juegos-pc/Linea.html" /tmp/ui/linea_b.html
echo "Linea.html: $(wc -c < "$R/juegos-pc/Linea.html") bytes"
