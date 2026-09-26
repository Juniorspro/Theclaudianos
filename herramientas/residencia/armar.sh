#!/bin/sh
# arma juegos-pc/Residencia.html concatenando las fuentes (y una copia para el banco con three.js local)
set -e
D=$(cd "$(dirname "$0")" && pwd); F="$D/fuentes"; R="$D/../.."
cd "$F"
sed '/^(function(){$/,$d' 0.html > /tmp/res_cab.html
AUDIO=2_audio.js; [ -f 2_audio.js ] || AUDIO=/tmp/ui/res/audio_stub.js
{ cat /tmp/res_cab.html; echo "(function(){"; cat 1_base.js 9_idiomas.js $AUDIO 3_texturas.js 4_casa.js 5_render.js 6_jugador.js 7_mundo.js 8_monstruo.js 8b_ia.js 8c_partida.js 9a_ui.js 9b_menu.js 9z_arranque.js z.js; } > "$R/juegos-pc/Residencia.html"
mkdir -p /tmp/ui/res
sed 's#https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js#../three128.js#' "$R/juegos-pc/Residencia.html" > /tmp/ui/res/r.html
echo "Residencia.html: $(wc -c < "$R/juegos-pc/Residencia.html") bytes"
