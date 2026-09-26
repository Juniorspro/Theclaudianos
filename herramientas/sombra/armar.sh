#!/bin/sh
# arma juegos-pc/Sombra.html concatenando las fuentes (y una copia para el banco)
set -e
D=$(cd "$(dirname "$0")" && pwd); F="$D/fuentes"; R="$D/../.."
cd "$F"
sed '/^(function(){$/,$d' 0.html > /tmp/sombra_cab.html
AUDIO=2_audio.js; [ -f 2_audio.js ] || AUDIO=/tmp/ui/sombra_audio_stub.js
{ cat /tmp/sombra_cab.html; echo "(function(){"; echo "'use strict';"; cat 9_idiomas.js 1_base.js $AUDIO 3_arte.js 4_post.js 5_mundo.js 6_juego.js 8_ui.js 8d_menu.js 9z_arranque.js z.js; } > "$R/juegos-pc/Sombra.html"
mkdir -p /tmp/ui && cp "$R/juegos-pc/Sombra.html" /tmp/ui/sombra_b.html
echo "Sombra.html: $(wc -c < "$R/juegos-pc/Sombra.html") bytes"
