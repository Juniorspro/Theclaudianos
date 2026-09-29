/* =============================================================
   hud.js -> El marcador y las pantallas.

   El HUD de Project Nexus dice cuatro cosas y nada mas: cuanto
   aguantas, por que oleada vas, cuanto llevas ganado y que tienes
   en la mano. Todo lo demas -mapas, brujulas, listas de bajas- se
   come la pantalla de un telefono y no cambia ni una decision.

   Y se toca lo MENOS posible. Escribir en el DOM obliga al
   navegador a recalcular la pagina, y hacerlo sesenta veces por
   segundo con el juego dibujando encima es la forma mas tonta de
   perder fotogramas. Aqui cada dato se guarda en una copia y solo
   se escribe cuando de verdad ha cambiado: en una partida normal
   eso son dos o tres escrituras por segundo en vez de doscientas.
   ============================================================= */
(function (global) {
  'use strict';

  const HUD = {};
  const $ = (id) => document.getElementById(id);
  const ant = {};     // la ultima copia de cada dato

  /* =================================================================
     LA CHAPA DEL HUD

     El HUD del original no son cajas sueltas: es UNA SOLA FORMA
     negra con filo rojo, y su silueta esta ESCALONADA. Medido
     sobre capturas del juego a 640x360 -y como --u es alto/360, un
     pixel de la captura es un --u-:

       banda de arriba, a todo lo ancho ....... hasta y = 28
       bloque de la izquierda, x 0..128 ....... hasta y = 85

     El paso entre los dos va en DIAGONAL, no en angulo recto: es
     el corte de Madness, el mismo que llevan los paneles del menu.

     El camino se genera aqui y no se deja escrito en el SVG porque
     el ancho depende de la pantalla; con un path fijo estirado, la
     diagonal y el filo saldrian deformados.
     ================================================================= */
  /* EL BLOQUE TIENE QUE TAPAR EL HUECO DEL ARMA.

     Con 128 de ancho no lo hacia. La diagonal va de
     (bloque - sesgo, alto) a (bloque, banda), asi que a la altura
     de la base del hueco del arma -y = 76- la chapa solo llegaba a

       x = 112 + 16 * (90-76)/(90-28) = 115,6

     y la caja del arma acaba en x = 126: se salia diez unidades
     por la derecha. Por eso el borde de la caja se veia cortado,
     colgando fuera del negro.

     Con 150 la chapa llega a 137,6 a esa altura y la caja queda
     dentro con margen. */
  const P = {
    banda: 28,       // alto de la banda
    alto: 90,        // alto del bloque de la izquierda
    bloque: 150,     // ancho del bloque
    sesgo: 16,       // cuanto avanza la diagonal del paso
    filo: 2.5
  };

  HUD.chapa = function () {
    const svg = $('platoHud'), path = $('platoPath');
    if (!svg || !path) return;
    const caja = svg.getBoundingClientRect();
    if (!caja.height) return;
    /* La caja mide 86 --u de alto; el viewBox se pone en las mismas
       unidades para que un --u sea una unidad del camino. */
    const H = 92, W = caja.width / caja.height * H;
    const f = P.filo * 0.5;
    const d = [
      'M', W + 4, -4,                       // se sale por arriba y por los lados:
      'L', -4, -4,                          // el filo solo se ve abajo y en el paso
      'L', -4, P.alto - f,
      'L', P.bloque - P.sesgo, P.alto - f,
      'L', P.bloque, P.banda + f,           // la diagonal del paso
      'L', W + 4, P.banda + f,
      'Z'
    ].join(' ');
    svg.setAttribute('viewBox', '0 0 ' + W.toFixed(2) + ' ' + H);
    path.setAttribute('d', d);
    path.setAttribute('stroke-width', P.filo);
  };

  /* =================================================================
     EL BOTON DE MENU

     Va a lienzo y no a CSS por un motivo concreto: con tres divs
     de alto fraccionario -2,4 --u son 2,93 px en esta ventana-
     cada raya cae en una fase distinta del pixel y el navegador
     las antialiasea distinto. Medido, salian de grosores
     distintos y desalineadas. En lienzo se redondea todo a
     enteros y las tres son identicas por construccion.

     La chapa es la del MAIN MENU del original, medida pixel a
     pixel sobre la captura:

       degradado vertical #6E0000 (arriba) -> #C80000 (abajo)
       filo casi negro y esquinas rectas
       sombra negra desplazada abajo-derecha

     y las rayas llevan CONTORNO NEGRO, como las letras del
     original, que es lo que las despega del rojo.
     ================================================================= */
  HUD.botonMenu = function () {
    const b = $('tpausa'), c = $('menuCanvas');
    if (!b || !c) return;
    const caja = b.getBoundingClientRect();
    if (!caja.width) return;
    const dpr = Math.min(3, global.devicePixelRatio || 1);
    const W = Math.round(caja.width * dpr), H = Math.round(caja.height * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const g = c.getContext('2d');
    g.clearRect(0, 0, W, H);

    const u = H / 30;                      // el boton mide 30 --u de alto
    const R = (v) => Math.max(1, Math.round(v * u));
    const sombra = R(2), filo = R(2), ceja = R(1);
    const an = W - sombra, al = H - sombra;

    // la sombra
    g.fillStyle = 'rgba(0,0,0,.62)';
    g.fillRect(sombra, sombra, an, al);
    // la ceja roja de fuera
    g.fillStyle = '#e61010';
    g.fillRect(0, 0, an, al);
    // el filo negro
    g.fillStyle = '#0a0a0a';
    g.fillRect(ceja, ceja, an - ceja * 2, al - ceja * 2);
    // el relleno, con el degradado del original
    const grad = g.createLinearGradient(0, ceja + filo, 0, al - ceja - filo);
    grad.addColorStop(0, '#6e0000');
    grad.addColorStop(0.45, '#8a0000');
    grad.addColorStop(1, '#c80000');
    g.fillStyle = grad;
    const ix = ceja + filo, iy = ceja + filo;
    const iw = an - ix * 2, ih = al - iy * 2;
    g.fillRect(ix, iy, iw, ih);

    /* Las tres rayas: todo en enteros y repartido con la misma
       cuenta, asi que salen calcadas. */
    const rAl = Math.max(2, Math.round(ih * 0.135));
    const hueco = Math.max(2, Math.round(ih * 0.135));
    const rAn = Math.round(iw * 0.62);
    const total = rAl * 3 + hueco * 2;
    let y = iy + Math.round((ih - total) / 2);
    const x = ix + Math.round((iw - rAn) / 2);
    for (let i = 0; i < 3; i++) {
      g.fillStyle = '#0a0a0a';                      // el contorno
      g.fillRect(x - ceja, y - ceja, rAn + ceja * 2, rAl + ceja * 2);
      g.fillStyle = '#f4e4e0';
      g.fillRect(x, y, rAn, rAl);
      y += rAl + hueco;
    }
  };

  /* =================================================================
     EL HUECO DEL ARMA, COMO EL DEL SWF

     Es el sprite 873 ('iconWeapon' de madness_game_menu) y lo que
     hace con el MadnessMenu.setWeaponIcon, desensamblado:

       - el recuadro con el arma dentro (la de fuego oscurecida por su
         cxform), el icono de SU cargador y una 'x': eso no cambia y
         viene pintado del SWF por arma (js/hud_swf.js);
       - clipsTotal = myClips, los cargadores de repuesto, en Impact de
         25 px blanca: NO el numero de balas;
       - debajo, myAmmo: una barra roja que se corre a la izquierda con
         myAmmo / myAmmoMax -las balas que le quedan al cargador- y el
         cartucho (myBullet) pegado a su punta. En las blancas la barra
         es el desgaste y en la punta va una cruz; sin arma, solo el
         marco vacio.

     Todo en px del SWF, relativo al origen del 873. */
  const HUECO = { x0: -0.5, y0: -25.7, an: 63, al: 60.7 };
  const AMMO = { y: 25.25, an: 61.5, al: 9.25, barra: 61.05, barraY: -2.3,
                 balaX: 60.05, balaY: 4.4, balaEsc: 1.142853 };
  const NUM = { x: 35.6, base: 23.06, cuerpo: 25 };
  const _imgHud = {};
  function imgHud(k, src) {
    let im = _imgHud[k];
    if (!im) {
      im = _imgHud[k] = new Image();
      im.onload = () => { huecoPintado = null; };
      im.src = src;
    }
    return im.complete && im.naturalWidth ? im : null;
  }
  let huecoPintado = null;
  function pintarHueco(a) {
    const c = $('armaCanvas'), D = global.HUD_SWF;
    if (!c || !D) return;
    const f = a.ficha, fuego = f.tipo === 'fuego', sinArma = !!f.sinMalla;
    /* la tira: balas del cargador; en las blancas, el desgaste (myHealth /
       myHealthMax, damageMelee) */
    const frac = fuego ? Math.max(0, Math.min(1, a.cargador / (f.cargador || 1)))
                       : (a.saludMax > 0 ? Math.max(0, Math.min(1, a.salud / a.saludMax)) : 1);
    const caja = c.getBoundingClientRect();
    const dpr = global.devicePixelRatio || 1;
    const W = Math.max(1, Math.round(caja.width * dpr)), H = Math.max(1, Math.round(caja.height * dpr));
    const clave = a.id + '|' + frac.toFixed(3) + '|' + (fuego ? a.cargas : '') + '|' + W + 'x' + H;
    if (clave === huecoPintado) return;
    huecoPintado = clave;
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    const s = W / HUECO.an;
    g.setTransform(s, 0, 0, s, -HUECO.x0 * s, -HUECO.y0 * s);
    g.imageSmoothingQuality = 'high';
    const G = D.geo;
    const pon = (k, src, x, y, w, h) => {
      const im = imgHud(k, src);
      if (im) g.drawImage(im, x, y, w, h);
      else huecoPintado = null;                  // se repinta al cargar
    };
    const cj = G.caja;
    pon('caja_' + a.id, D.caja[a.id] || D.caja['puños'], cj[0], cj[1], cj[2], cj[3]);
    if (fuego) {
      g.font = '400 ' + NUM.cuerpo + 'px "Impact SWF"';
      g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      if ('letterSpacing' in g) g.letterSpacing = '0.5px';
      g.fillStyle = '#fff';
      g.fillText(String(a.cargas), NUM.x, NUM.base);
      if ('letterSpacing' in g) g.letterSpacing = '0px';
    }
    /* La tira de myAmmo, debajo del recuadro. */
    const y0 = AMMO.y;
    if (!sinArma) {
      const gb = G.barra;
      g.save();
      g.beginPath(); g.rect(0, y0, AMMO.an, AMMO.al); g.clip();
      pon('barra', D.barra, -AMMO.barra + frac * AMMO.barra + gb[0], y0 + AMMO.barraY + gb[1], gb[2], gb[3]);
      g.restore();
    }
    const gm = G.marco;
    pon('marco', D.marco, gm[0], y0 + gm[1], gm[2], gm[3]);
    if (!sinArma) {
      const k = fuego ? 'bala' : 'filo', gp = G[k];
      const bx = frac * AMMO.barra - (fuego ? 0 : AMMO.barra - AMMO.balaX);   // la cruz de las blancas va con su desgaste
      pon(k, D[k], bx + gp[0], y0 + AMMO.balaY + gp[1] * AMMO.balaEsc, gp[2], gp[3] * AMMO.balaEsc);
    }
  }

  /* Los botones que ahora no tienen nada que hacer se apagan (siguen
     pulsables): sin arma no hay que tirar, sin blanca no hay guardia, sin
     arma a tiro no hay que coger, sin otra ranura no hay cambio. */
  const _bt = {};
  function apagar(act, off) {
    if (_bt[act] === off) return;
    _bt[act] = off;
    const b = document.querySelector('.tbtn[data-act="' + act + '"]');
    if (b) b.classList.toggle('apagado', off);
  }
  function botones(j) {
    const f = j.arma.ficha, blanca = f.tipo === 'melee' && j.arma.id !== 'puños';
    /* ATACAR dice lo que va a hacer: la mano en el panel cuando esta a
       mano (el mismo boton lo aprieta, game.js), si no el puño, la hoja o
       la Beretta con su fogonazo */
    if (global.Iconos) {
      const P = global.Arena && Arena.panel;
      const usar = !!(P && P.activo && P.cerca && global.Game && Game.sala === 'arena');
      Iconos.poner('fuego', usar ? 'usar' : f.tipo === 'fuego' ? 'fuego' : blanca ? 'blanca' : 'puno');
    }
    apagar('tirar', !(j.armas && j.armas[j.ranura]));
    apagar('bloquear', !blanca);
    apagar('recoger', !(global.Game && Game.pickupJugador));
    apagar('cambiar', !(j.armas && Actor.puedeCambiar(j)));
    apagar('recargar', !(f.tipo === 'fuego' && j.arma.cargas > 0 && j.arma.cargador < (f.cargador || 0)));
  }

  /* La marea de sangre del careto.  /* La marea de sangre del careto. Guarda su propia posicion
     porque es un perseguidor amortiguado, no un valor directo. */
  let mareaY = 0;
  function marea(frac, vivo) {
    const objetivo = 1 - Math.max(0, Math.min(1, frac));
    mareaY += (objetivo - mareaY) * 0.6;
    if (Math.abs(objetivo - mareaY) < 0.002) mareaY = objetivo;
    const n = $('caretoVida');
    if (n) n.style.height = (mareaY * 100).toFixed(1) + '%';
    const c = $('careto');
    if (c) c.classList.toggle('muerto', !vivo);
  }

  function poner(el, valor) {
    if (ant[el] === valor) return;
    ant[el] = valor;
    const n = $(el);
    if (n) n.textContent = valor;
  }
  function ancho(el, frac) {
    const k = Math.round(U.clamp(frac, 0, 1) * 100);
    if (ant['w' + el] === k) return;
    ant['w' + el] = k;
    const n = $(el);
    if (n) n.style.width = k + '%';
  }

  HUD.init = function () {
    HUD.avisoEl = $('aviso');
    if (global.Iconos) Iconos.montar();      // los iconos de los botones de accion
    /* El retrato NO se pinta aqui: necesita el acelerador, que
       todavia no existe cuando arranca el HUD. Lo llama Game
       cuando crea al jugador. */
    return HUD;
  };

  HUD.medir = function () { HUD.chapa(); HUD.botonMenu(); };

  HUD.mostrar = function (ver) {
    $('hud').classList.toggle('oculto', !ver);
    $('mandos').classList.toggle('oculto', !ver);
    /* La chapa se traza AQUI tambien. Game.medir() corre con el HUD
       todavia escondido -display:none-, asi que el SVG mide cero y
       el camino sale vacio: el plato negro no aparecia. */
    if (ver) { HUD.chapa(); HUD.botonMenu(); }
  };

  /* El nombre de la placa de debajo del retrato. */
  HUD.nombre = function (txt) {
    const n = $('chapaNombre');
    if (n && n.firstChild) n.firstChild.textContent = txt;
  };

  /* =============================================================
     EL RETRATO, EN 3D

     Lo tenia dibujado a mano con canvas y nunca iba a estar bien:
     una cara plana de frente cuando en el original el retrato
     muestra la cabeza Y UN POCO DE TORSO, de costadito.

     Y ademas es una copia: cualquier cambio en el muñeco -un
     casco, una venda, otro color- habia que repetirlo aqui a mano
     y se iban separando.

     Asi que el retrato ES EL PERSONAJE. Se monta una escena
     aparte con el mismo Chars.crear() que usa el juego, se gira de
     costado, se encuadra de la cabeza al pecho y se pinta UNA VEZ
     a un objetivo de render. Despues se leen los pixeles y se
     vuelcan al lienzo del HUD.

     Una sola vez, al empezar la partida: el retrato no cambia, asi
     que no hay motivo para gastarle un fotograma. Son 110x126
     pixeles leidos del acelerador y ya.

     Los materiales del muñeco son MeshBasicMaterial con color por
     vertice, o sea que no hacen falta luces.
     ============================================================= */
  HUD.retrato = function (ren, tipo) {
    const c = $('caraCanvas');
    if (!c || !ren || !global.THREE) return;
    const W = c.width, H = c.height;

    const cuerpo = Chars.crear(tipo || 'hank');
    const esc = new THREE.Scene();
    esc.add(cuerpo.grupo);
    /* De costadito, mirando un poco a su derecha. En el original
       el retrato nunca va de frente: de frente la cruz de la cara
       se convierte en una diana y el muñeco pierde el gesto.

       26 grados y no 35: con 35 la cara quedaba casi de perfil y
       la cruz se leia estirada. 26 es el tres cuartos de toda la
       vida -se ven los dos lados de la cara y sigue habiendo
       giro-, y queda por debajo de los 55 con los que el muñeco se
       gira en el juego, asi que el retrato mira mas a camara que
       el personaje, que es lo que se quiere de una ficha. */
    cuerpo.grupo.rotation.y = 0.45;

    /* EL ENCUADRE SE CALCULA, no se pone a ojo.

       Se decide que tiene que entrar -del pecho a la coronilla- y
       de ahi sale la distancia de la camara. Poniendola a mano
       quedaba centrada en la cintura y cortaba la cabeza: medido
       en coordenadas de pantalla, la coronilla caia en +1,21
       cuando el marco acaba en +1,00.

       pecho    = ALTO_CRUZ - 0,42    (bastante por debajo de la cara)
       coronilla= alto x 1,035        (el pelo pasa del alto nominal)

       Con 0,25 y margen 1,12 la cabeza entraba justa y la barbilla
       se comia el borde de abajo. Con 0,42 y 1,22 entra la cabeza
       ENTERA, sobra aire por arriba y asoma un buen trozo de
       torso, que es lo que se ve en el original. */
    const k = cuerpo.escala;
    const FOV = 20;
    const pecho = (Chars.ALTO_CRUZ - 0.50) * k;
    const coronilla = cuerpo.alto * 1.035;
    const medio = (pecho + coronilla) * 0.5;
    const margen = 1.22;                       // aire arriba y abajo
    const d = (coronilla - pecho) * margen /
              (2 * Math.tan(FOV * Math.PI / 360));

    const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 12);
    cam.position.set(0.10 * k, medio, d);
    cam.lookAt(0, medio, 0);
    /* LA LUZ COMO EN EL SWF. La cabeza del HUD original (la de la ficha
       del personaje) va iluminada casi entera y plana, con la sombra en
       una media luna FINA en la nuca, al lado contrario de la cara, de
       arriba abajo. Con la luz de la sala -arriba, a la derecha y de
       frente: U.LUZ = (0,44, 0,74, 0,51)- el muñeco de costado quedaba
       con media cabeza y todo el pecho en sombra, de abajo a la
       izquierda. Aqui la luz viene de la camara, apenas a la derecha y
       apenas de arriba: la nuca, que se va hacia el fondo, es lo unico
       que se escapa, como la media luna del dibujo. Solo para el
       retrato: se pinta una vez con su propio material. */
    const matRet = Art.matFicha();
    cuerpo.grupo.traverse((o) => { if (o.material === Art.mats.cuerpo) o.material = matRet; });

    const rt = new THREE.WebGLRenderTarget(W, H, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, depthBuffer: true,
      /* sRGB: sin esto three r160 deja el render a textura en espacio
         LINEAL y el retrato salia oscurisimo (cabeza 144 en vez de 184) */
      colorSpace: THREE.SRGBColorSpace
    });
    const antesRT = ren.getRenderTarget();
    const antesA = ren.getClearAlpha();
    ren.setRenderTarget(rt);
    /* Fondo TRANSPARENTE: detras del retrato sube la marea de
       sangre, y con el fondo opaco quedaba tapada. */
    ren.setClearAlpha(0);
    ren.clear(true, true, false);
    ren.render(esc, cam);

    const buf = new Uint8Array(W * H * 4);
    ren.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    ren.setRenderTarget(antesRT);
    ren.setClearAlpha(antesA);
    rt.dispose();
    esc.remove(cuerpo.grupo);

    /* El acelerador entrega las filas del reves, asi que se
       vuelcan de abajo arriba. */
    /* Y SE LE PONE EL TONO DE LA FICHA DEL SWF (Art.tonoFicha): los
       colores del muñeco son los de la arena y en el recuadro se leian
       apagados. Se corrige al volcar los pixeles y no tocando el
       muñeco, porque en la arena esta bien. Los transparentes se
       quedan como estan: el fondo del retrato tiene que seguir dejando
       ver la marea de sangre. */
    const g = c.getContext('2d');
    const img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      const o = (H - 1 - y) * W * 4;
      img.data.set(buf.subarray(o, o + W * 4), y * W * 4);
    }
    Art.tonoFicha(img.data);
    g.clearRect(0, 0, W, H);
    g.putImageData(img, 0, 0);
  };

  HUD.actualizar = function (jug, W, vivos) {
    /* =========================================================
       LA VIDA VA DENTRO DEL CARETO

       En el original no hay barra de vida: `healthBar` es hijo de
       `ui_mug` y lo unico que hace es subir y bajar tapando el
       retrato. De su tick():

         icon.targetHealthY = (iconHeight + 5) * (vida / vidaMax);
         icon.healthBar._y += (targetHealthY - healthBar._y) * 0.6;
         icon.deadX._visible = !(vida > 0);

       Ese 0,6 es lo que hace que la marea PERSIGA a la vida en vez
       de saltar: al encajar un tiro la sangre sube de golpe y se
       asienta en tres fotogramas. Se calcula aqui y no con una
       transicion de CSS porque es el numero del original, y una
       transicion por tiempo no da la misma curva.
       ========================================================= */
    marea(jug.vida / jug.vidaMax, jug.vivo);
    ancho('barraFuria', jug.slowMo / Player.SLOWMO_MAX);   // la barra BULLET-TIME
    /* La TAC ya NO esta aqui. Va sobre la cabeza del muñeco, que
       es donde la pone el original; ver js/tacbar.js.

       Y NO HAY NUMERO DE VIDA, NI DINERO, NI BAJAS. El original no
       los pone: la vida se lee en el retrato y el dinero sale en
       la armeria, que es cuando sirve para algo. Un HUD que enseña
       todo a la vez no enseña nada. */
    /* La oleada tampoco va en el HUD. La anuncian los carteles de
       'lines' del original -WAVE n y WAVE COMPLETE, ver cartel.js-;
       tenerla puesta todo el rato no cambia ninguna decision. */

    botones(jug);
    /* --- El arma: su hueco, como el del SWF (ver pintarHueco) --- */
    const a = jug.arma;
    pintarHueco(a);
    const rec = $('recargando');
    const recargando = a.recargando > 0;
    if (rec && rec.classList.contains('oculto') === recargando) {
      rec.classList.toggle('oculto', !recargando);
    }
  };

  /* Aviso grande en el centro. El chico se usa para cosas que no
     interrumpen (has cogido un arma); el grande para las que si
     (empieza una oleada). */
  HUD.aviso = function (texto, chico) {
    const el = HUD.avisoEl;
    if (!el) return;
    el.textContent = texto;
    el.style.fontSize = chico ? 'calc(var(--u)*16)' : 'calc(var(--u)*30)';
    el.classList.remove('pum');
    void el.offsetWidth;
    el.classList.add('pum');
  };

  /* =============================================================
     MUERTE
     ============================================================= */
  HUD.muerte = function (W, jug) {
    const rec = Math.max(U.store.get('madness.record', 0), W.oleada);
    U.store.set('madness.record', rec);
    poner('mOleada', W.oleada);
    poner('mBajas', jug.bajas);
    poner('mRecord', rec);
    $('muerte').classList.add('ver');
  };

  global.HUD = HUD;
})(window);

