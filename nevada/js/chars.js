/* =============================================================
   chars.js -> Los cuerpos de Madness, en tres dimensiones.

   ANATOMIA: CUATRO PIEZAS Y NINGUNA MAS
   Un personaje de Madness Combat es un ovalo con una cruz, una
   cuña gris, dos manoplas que flotan en el aire y dos pies. No
   hay brazos. No hay piernas. No hay cuello, ni hombros, ni
   codos, ni rodillas. Dibujar cualquiera de esas cosas -aunque
   sea un tubo fino- es el error que delata al que no ha mirado la
   serie.

   Y no es solo estetica: sin codo que respetar, la mano va
   directa a donde agarra el arma, y animar se reduce a mover dos
   puntos por el espacio. Es literalmente como se anima en Flash,
   y es lo que hace que estos muñecos peleen tan rapido.

   TODAS LAS MEDIDAS SALEN DEL RENDER DE REFERENCIA
   No hay un solo numero puesto a ojo. La imagen del Grunt se
   segmento por componentes conectadas y se midio pieza a pieza;
   al lado de cada valor esta lo que dio la medicion en pixeles.
   Escala: la figura mide 428 px de la coronilla a la suela, que
   aqui son 1,70 m -> 1 px = 0,003972 m.

     cabeza   147 x 161 px, centro a 152 px de la coronilla
     cruz     trazo horiz. 86 px, vert. 89 px, grosor max. 10 px
     cuerpo   de 110 px de ancho arriba a 142 abajo; alto 222 px
     manopla  69 x 77 px, centro a 82 px del eje del cuerpo
     pie      62 px de ancho, 55 px visibles

   Y los tonos, medidos con la mediana de cada pieza:
     manopla 194 > cabeza 186 > cuerpo 95 > pie 24 > cruz 13
   Esa escalera -manos mas claras que la cara, cara mucho mas
   clara que el peto, pies casi negros- es la que hace que la
   silueta se lea de un vistazo.

   UN PERSONAJE = DOS LLAMADAS DE DIBUJO
   Todo el cuerpo va en un unico buffer con pesos de piel: cada
   vertice atado a un hueso con peso 1, giro rigido, una pasada.
   La segunda pasada es el contorno: la misma silueta hinchada dos
   centimetros, negra y pintada solo por dentro (BackSide). Asi
   sale la linea de tinta sin post-proceso.
   ============================================================= */
(function (global) {
  'use strict';

  const Chars = {};
  const C = Art.C;

  /* =============================================================
     ESQUELETO -> nueve huesos.
     ============================================================= */
  /* Los dos huesos de mas son el truco de las POSES DE MANO: cada
     mano existe DOS VECES en la malla -puño cerrado y mano
     abierta-, cada version atada a su propio hueso, y en cada
     fotograma se encoge a escala cero la que no toca. Los
     triangulos de la version escondida se colapsan en un punto y
     la tarjeta los tira sin pintar un pixel.

     Es mucho mas barato que sacar las manos a mallas aparte -eso
     serian cuatro llamadas de dibujo mas por personaje- y evita
     tener que deformar un puño hasta convertirlo en una mano
     abierta, que con piezas rigidas no sale bien jamas. */
  const H = {
    RAIZ: 0, CUERPO: 1, CABEZA: 2,
    MANO_I: 3,  MANO_D: 4,         // reposo: la pose de la hoja
    PUNO_I: 5,  PUNO_D: 6,         // puño cerrado, para pegar
    PALMA_I: 7, PALMA_D: 8,        // mano plana, para cachetear y agarrar
    AGAR_I: 9,  AGAR_D: 10,        // cerrada en C, empuñando
    PIE_I: 11,  PIE_D: 12,
    /* El arma NO cuelga del hueso de la mano: cuelga del suyo.

       Colgaba de MANO_D, que es el hueso de la pose de reposo, y al
       empuñar la pose activa es AGARRE: MANO_D se escala a cero para
       esconder su geometria y se llevaba el arma con el. El bate de
       los enemigos no se veia por eso -medido: escala de mundo 0-.

       Este hueso copia posicion y orientacion de la mano pero no se
       escala nunca, y tampoco hereda el rodado cosmetico de muñeca,
       que en un arma movería el cañon fuera del plano de punteria. */
    ARMA_D: 13,
    /* La quinta pose: la mano DEBAJO DEL CAÑON, que es la que se ve
       en la referencia de Deimos con el fusil -tres deditos asomando
       por debajo del guardamanos-. Es el sprite 8 de la hoja. */
    CANON_I: 14, CANON_D: 15,
    /* La sexta: el REPOSO VISTO POR DENTRO, el hand_back del SWF (dibujo
       B, sprite 7291: los dedos doblados y el pulgar). En la serie la mano
       de cerca enseña el dorso -los nudillos, dibujo A- y la de lejos esta
       otra; con el dorso en las dos salian dos manos del mismo lado.
       anim.js elige entre REPOSO y REVES segun que cara de la mano mira a
       camara, como Weapons.caraManos con las manos de las armas. */
    REVES_I: 16, REVES_D: 17
  };
  Chars.H = H;
  /* Las cuatro poses de cada mano, en orden. anim.js elige una por
     indice y encoge las otras tres a cero. */
  Chars.POSES = 6;
  Chars.MANOS_I = [H.MANO_I, H.PUNO_I, H.PALMA_I, H.AGAR_I, H.CANON_I, H.REVES_I];
  Chars.MANOS_D = [H.MANO_D, H.PUNO_D, H.PALMA_D, H.AGAR_D, H.CANON_D, H.REVES_D];

  // nombre, padre, pivote en la pose de reposo.
  // Todo sale de la hoja de turnaround: 429 px de la coronilla a la
  // suela = 1,70 m, o sea 1 px = 0,003963 m.
  const HUESOS = [
    ['raiz',   -1,  0.000, 0.000, 0],
    ['cuerpo',  0,  0.000, 0.260, 0],   // pivota en el tercio bajo del peto
    ['cabeza',  1,  0.000, 0.930, 0.096],  // ADELANTADA: ver la vista de perfil
    ['manoI',   1, -0.365, 0.286, 0.150],
    ['manoD',   1,  0.365, 0.286, 0.150],
    ['punoI',   1, -0.365, 0.286, 0.150],
    ['punoD',   1,  0.365, 0.286, 0.150],
    ['palmaI',  1, -0.365, 0.286, 0.150],
    ['palmaD',  1,  0.365, 0.286, 0.150],
    ['agarI',   1, -0.365, 0.286, 0.150],
    ['agarD',   1,  0.365, 0.286, 0.150],
    ['pieI',    0, -0.188, 0.187, 0],
    ['pieD',    0,  0.188, 0.187, 0],
    ['armaD',   1,  0.365, 0.286, 0.150],
    ['canonI',  1, -0.365, 0.286, 0.150],
    ['canonD',  1,  0.365, 0.286, 0.150],
    ['revesI',  1, -0.365, 0.286, 0.150],
    ['revesD',  1,  0.365, 0.286, 0.150]
  ];

  Chars.ALTO = 1.70;
  Chars.ALTO_CRUZ = 1.329;    // el centro de la cara: a donde se dispara
  Chars.ALTO_PECHO = 0.78;
  Chars.RADIO = 0.33;
  // reposo de las manos, en coordenadas del personaje
  Chars.MANO = { x: 0.365, y: 0.286, z: 0.150 };
  Chars.CABEZA_Z = 0.152;   // cuanto se adelanta el ovalo

  function nuevoEsqueleto() {
    const bones = [];
    for (let i = 0; i < HUESOS.length; i++) {
      const d = HUESOS[i], p = d[1];
      const b = new THREE.Bone();
      b.name = d[0];
      if (p < 0) b.position.set(d[2], d[3], d[4]);
      else {
        b.position.set(d[2] - HUESOS[p][2], d[3] - HUESOS[p][3], d[4] - HUESOS[p][4]);
        bones[p].add(b);
      }
      bones.push(b);
    }
    return bones;
  }

  /* Las inversas de reposo son siempre las mismas. Se calculan una
     vez y se reparten: crear un enemigo deja de recorrer nada. */
  let _inversas = null;
  function inversasDeReposo() {
    if (_inversas) return _inversas;
    const b = nuevoEsqueleto();
    b[0].updateMatrixWorld(true);
    _inversas = b.map((x) => x.matrixWorld.clone().invert());
    return _inversas;
  }

  /* =============================================================
     FICHAS DE FACCION
     ============================================================= */
  /* -------------------------------------------------------------
     LOS NIVELES, Y POR QUE HAY ENEMIGOS CON BARRA Y OTROS NO

     "Some enemies have TAC-BARs, too" dice el tutorial del
     original, y el codigo explica cuales: la barra sale de una
     suma sobre los niveles 5 a 44, asi que POR DEBAJO DE NIVEL 5
     NO HAY BARRA. No es una lista de excepciones, es la propia
     formula. Un grunt de relleno tiene nivel bajo y cae de un
     tiro; un agente ya tiene con que defenderse.

     Y hay un segundo grupo que la tiene a cero por ficha, no por
     nivel: los lentos y pesados -Fatboy, Fatman, el zombi G03LM-
     llevan amSlow, y el original les pone myTactics = 0 a mano. El
     ingeniero A.T.P. es de esos: es un bruto de cuerpo a cuerpo,
     no un tirador, y esquivar no es lo suyo.

     Todo sale de la ficha de cada personaje en el SWF (t178349), en
     'swf':
       nivel    [min, max]: se sortea al nacer, como SwainMath.randomNumber
                del original. De el salen la barra (formula de arriba) y
                la VIDA: changeStats la pisa con 6 + nivel (+10 si es
                especial), asi que el 'myHealth = 12' de la ficha del
                agente nunca llega a valer.
       str      modDmg = 1 + STR/15: sus puñetazos x modDmg/3 (las armas
                blancas no: ver Actor.danoSWF)
       end      modArmor = 1 + END/15: multiplica el daño que RECIBE
       tac      modRecharge = 1 + TAC/10: lo rapido que recarga la barra
       awr      modHurtTactics = 1 + AWR/50: cuanta barra ajena muerde
       melee, unarmed  habilidades (applyStats): eligen los golpes
                       (golpes.js)
     ------------------------------------------------------------- */
  Chars.TIPOS = {
    grunt: {
      nombre: 'GRUNT',
      cara: C.piel, peto: C.mono, guante: C.guante, pie: C.bota, cruz: C.cruz,
      /* Grunt: nivel 1, applyStats(1,1,1,1,0,1) y sin habilidades (t178349). */
      escala: 1.00,
      swf: { nivel: [1, 1], str: 1, end: 1, tac: 1, awr: 1, melee: 0, unarmed: 0, especial: false }
    },
    /* =========================================================
       LOS AGENTES, COMO EN EL SWF

       En la arena del original salen solo cuatro personajes (ver
       waves.js): civ, agent, agent2 y agent3. Los tres agentes son el
       MISMO traje (bodyType 'agent') con lo que lleva encima cada uno
       -ver trajeAgente()-, y el agent tiene dos versiones: 'agent'
       con las Agent Shades rojas (agent1_mask) y 'agent_classic' con
       las negras (agent1_mask_b), misma vida y mismo traje.

       El traje del SWF mide 51 de gris contra los 153 del civ; aqui
       el peto del grunt va a 118, asi que el traje va a 118 x 51/153
       = 39. La camisa, al tono de la cabeza. */
    agente: {
      nombre: 'AGENTE',
      cara: C.piel, guante: C.piel, pie: C.bota, cruz: C.cruz,
      ropa: 'agent', mascara: 'agent1_mask',
      /* agent: nivel 2-4, applyStats(4,4,4,4,2,4), habilidades 5 (t178349). */
      escala: 1.00,
      swf: { nivel: [2, 4], str: 4, end: 4, tac: 4, awr: 4, melee: 5, unarmed: 5, especial: false }
    },
    agenteClasico: {
      nombre: 'AGENTE',
      cara: C.piel, guante: C.piel, pie: C.bota, cruz: C.cruz,
      ropa: 'agent', mascara: 'agent1_mask_b',
      /* agent_classic: la misma ficha que agent (t178349). */
      escala: 1.00,
      swf: { nivel: [2, 4], str: 4, end: 4, tac: 4, awr: 4, melee: 5, unarmed: 5, especial: false }
    },
    /* agent3 / Agent Mk0: el traje con la bandolera y las OBSV Goggles
       (agent3_mask), el monocular de lente amarilla. */
    agenteMk0: {
      nombre: 'AGENTE MK0',
      cara: C.piel, guante: C.piel, pie: C.bota, cruz: C.cruz,
      ropa: 'agent3', mascara: 'agent3_mask',
      /* agent3 / Mk0: nivel 9-11, applyStats(10,15,10,10,5,10), habilidades 15 (t178349). */
      escala: 1.00,
      swf: { nivel: [9, 11], str: 10, end: 10, tac: 10, awr: 10, melee: 15, unarmed: 15, especial: false }
    },
    /* agent2 / Agent Mk1: el traje con la correa del pecho y la ATP Mask
       (agent2_mask): casco, visor color arena y barbillera.
       El nombre 'soldat' se queda por lo que ya lo usa. */
    soldat: {
      nombre: 'AGENTE MK1',
      cara: C.piel, guante: C.piel, pie: C.bota, cruz: C.cruz,
      ropa: 'agent2', mascara: 'agent2_mask',
      /* agent2 / Mk1: nivel 5-7, applyStats(7,7,7,7,4,7), habilidades 10 (t178349). */
      escala: 1.00,
      swf: { nivel: [5, 7], str: 7, end: 7, tac: 7, awr: 7, melee: 10, unarmed: 10, especial: false }
    },
    hank: {
      nombre: 'HANK',
      /* El guante va CLARO aunque el abrigo sea negro. Estaba en
         0x161616 -practicamente el negro del contorno- y la mano se
         perdia: quedaba un disco oscuro aplastado, sin silueta ni
         lineas de dedos, porque relleno, contorno y rayas eran el
         mismo color.

         Y es lo que hace la serie: en el arte de los agentes el
         cuerpo da 9 de luminancia y las manos 40-60, la misma banda
         que la cara. Hank lleva abrigo negro, no guantes negros. */
      cara: C.piel, peto: 0x1c1c1c, guante: C.guante, pie: C.bota, cruz: C.cruz,
      pelo: 0x0d0d0d, venda: true,
      /* Hank: nivel 30, especial, applyStats(25,30,25,25,0,25), habilidades 25 (t178349). */
      escala: 1.06,
      swf: { nivel: [30, 30], str: 25, end: 25, tac: 25, awr: 25, melee: 25, unarmed: 25, especial: true }
    }
  };

  /* La parte alta del torso: [y, medio ancho, medio fondo, z del
     centro] antes de ANCHO_TORSO. Esta aparte porque tambien la usa el
     shader de la linea de la union con la cabeza (Art.aplicarEscalonesMundo),
     que tiene que saber donde esta la superficie del torso. */
  Chars.ANCHO_TORSO = 1.055;
  /* La cupula se CIERRA: acababa en una tapa plana de 7 cm de radio a
     1,096, y esa tapa -con la cabeza inclinada o vista de espaldas-
     asomaba como un disco con esquina. Ahora baja como un casquete
     redondo hasta casi un punto, a la misma altura: mismo perfil de la
     hoja hasta 1,03, y de ahi una curva sin cantos. */
  Chars.PERFIL_ALTO = [
    [0.689, 0.244, 0.222, -0.012],
    [0.800, 0.232, 0.218, -0.019],
    [0.911, 0.220, 0.214, -0.026],
    [0.985, 0.212, 0.206, -0.034],
    [1.030, 0.197, 0.191, -0.042],
    [1.058, 0.176, 0.170, -0.048],
    [1.078, 0.148, 0.143, -0.053],
    [1.093, 0.112, 0.108, -0.056],
    [1.104, 0.068, 0.066, -0.058],
    [1.110, 0.024, 0.024, -0.059]
  ];

  /* =============================================================
     EL CUERPO
     g = cuanto se hincha cada pieza. g=0 -> el personaje;
     g=0.021 -> su contorno negro.
     ============================================================= */
  function cuerpo(B, F, g, silueta) {
    const col = (c) => (silueta ? 0x000000 : c);
    const d2 = g * 2;
    const k = F.ancho || 1;      // el soldat es mas corpulento
    // Lo dibujado -la cruz, un visor, una cinta reflectante- no se
    // ilumina: en la serie son trazos de tinta encima del muñeco,
    // no volumen. Por eso llevan luz:false.
    const TINTA = { luz: false };

    /* ---------------------------------------------------------
       EL CUERPO: una cuña
       Estrecho arriba, donde el ovalo lo tapa, y ensanchando hasta
       el bajo. Medido en el render: 110 px de ancho a la altura
       del menton y 142 px abajo. No es una caja ni una capsula; es
       una campana de lados casi rectos, y por eso el perfil se
       describe con secciones y no con una primitiva.

       El 1,055 compensa que un anillo de ocho lados nunca toca el
       ancho maximo: su vertice mas lateral se queda en el 94,9%.
       Sin esa correccion el cuerpo sale ocho pixeles estrecho.
       --------------------------------------------------------- */
    /* LA JOROBA.

       Esto es lo que se ve en la vista de perfil de la hoja y lo
       que hace que un grunt se reconozca de espaldas: el torso no
       es una columna recta con una bola encima. La espalda sube y
       se cierra en una cupula que queda POR DETRAS y POR ENCIMA de
       donde apoya la cabeza, y el ovalo se apoya adelantado, casi
       en voladizo sobre el pecho. De perfil, el centro de la
       cabeza queda 40 px por delante del eje del cuerpo -0,16 m- y
       la cupula de la espalda llega hasta 1,07, catorce
       centimetros por encima del menton.

       Y el torso es casi tan hondo como ancho (108 px de fondo
       contra 111 de ancho arriba, 119 contra 137 abajo): es una
       columna redonda, no una plancha. Modelarlo plano es lo que
       hacia que de perfil pareciera un cartel.

       La z de cada seccion echa la espalda hacia atras conforme
       sube: ocho pixeles y medio entre el bajo y los hombros. Poco,
       pero es la diferencia entre un muñeco erguido y uno que anda
       encorvado, que es como andan todos en Madness. */
    const A = Chars.ANCHO_TORSO * k;
    B.skin(H.CUERPO);
    /* La linea del bajo del torso es su propio contorno, que pasa por
       encima de los pies (ver Art.PIES). La tapa de abajo va
       negra: vista desde abajo -un muñeco que se inclina, uno tirado-
       es el interior de la tinta, no el fondo gris de un tubo. */
    const bajo = [
      [0.162 - g, 0.258 * A + g, 0.232 * A + g,  0.006],  // el bajo se recoge
      [0.190,     0.271 * A + g, 0.236 * A + g,  0.004]   // 137 x 119 px
    ];
    let filas = bajo.concat([
      [0.467,     0.264 * A + g, 0.230 * A + g,  0.000]
    ], Chars.PERFIL_ALTO.map((q, i, T) =>
      // 0,911: 111 x 108 px; la ultima, la cupula de la espalda
      [q[0] + (i === T.length - 1 ? g : 0), q[1] * A + g, q[2] * A + g, q[3]]));
    /* EL TRAJE NO LLEGA ARRIBA: por encima de su borde (el cuello del saco,
       o el collar del arnes) asoma la piel del muñeco, como en las hojas
       de vueltas. Un anillo repetido en el corte: debajo la tela, encima
       la piel, con el borde nitido. */
    const corte = !silueta && F.ropa && Ropa.corte ? Ropa.corte(F.ropa, F.camisa) : 0;
    if (corte) {
      let k = 0;
      while (k < filas.length - 1 && filas[k + 1][0] <= corte) k++;
      const a = filas[k], b = filas[k + 1], t = (corte - a[0]) / (b[0] - a[0]);
      const f = [corte, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
      filas = filas.slice(0, k + 1).concat([f, f.concat([undefined, F.cara])],
        filas.slice(k + 1).map((q) => q.concat([undefined, F.cara])));
    }
    B.addTubo(filas, col(F.ropa ? Ropa.tela(F.ropa) : F.peto), { lados: 12, redondez: 3.0, tapaBaja: 0x000000 });
    /* La tinta con los MISMOS lados que el color. Tenia 7 contra 10: la
       cara plana de un heptagono queda un 10% por dentro de su radio, y
       ahi los vertices del torso asomaban por fuera de su propio
       contorno -la linea doble y el canto roto de perfil-. Y 12 en vez
       de 10: con la luz de la sala los facetados se leian. */

    /* LA ROPA: el traje es una PRENDA aparte, con el nombre del cuerpo
       base del SWF ('Parts - Body', 7289) -ver ropa.js-: se le pone al
       torso de quien la lleve. */
    if (F.ropa) {
      /* la tinta de la ropa NO se adelanta como la del torso (0,12 m): las
         correas van a 2 cm de el, y adelantada su tinta les pasaba por
         delante y las pintaba de negro enteras */
      const n0 = B.n;
      Ropa.construir(B, F.ropa, g, silueta, A, F.cara, F.camisa);
      (B.ropa = B.ropa || []).push([n0, B.n]);
    }
    /* EL CHALECO (la ranura shirt del SWF, prendas.js): va ENCIMA del
       cuerpo o del traje, con las mismas reglas de adelanto que la ropa. */
    if (F.camisa && Ropa.construirCamisa) {
      const n0 = B.n;
      Ropa.construirCamisa(B, F.camisa, g, silueta, A, !!F.ropa);
      (B.ropa = B.ropa || []).push([n0, B.n]);
    }
    if (!silueta && F.venda) {
      B.addBox(0.452, 0.032, 0.014, -0.012, 0.740, 0.232, 0xb5afa1, TINTA);
      B.addBox(0.452, 0.026, 0.014, 0.014, 0.686, 0.233, 0xa49e92, TINTA);
    }

    /* ---------------------------------------------------------
       LA CABEZA: el ovalo
       150 x 162 px medidos -> mas alta que ancha. Ni nariz, ni
       orejas, ni boca, ni cuello. Sale del cuerpo sin transicion.
       --------------------------------------------------------- */
    B.skin(H.CABEZA);
    /* El soldat no tiene cara: el casco ES su cabeza, y por eso el
       ovalo se pinta ya del color del blindaje y se salta la cruz.
       Encajar un casco encima de una cara que no se ve seria pagar
       dos veces por lo mismo.

       Y la malla es mas fina aqui que en ninguna otra pieza -16 x
       12- porque la silueta del ovalo es LO QUE MIRA EL JUGADOR.
       Con nueve anillos se le notaban los cantos y parecia una
       tuerca; con doce vuelve a ser un huevo dibujado. Son
       doscientos triangulos mas por personaje y estan bien
       gastados. */
    B.addEllipsoid(0.333 + g, 0.392 + g, 0.327 + g, 0, 1.315, Chars.CABEZA_Z,
                   col(F.cara), { seg: 16, rings: 12 });

    if (!silueta) {
      /* LA CRUZ.
         Dos trazos de pincel, no dos rectangulos. La medicion dio 2
         px de grosor en las puntas y 10 en el cruce: el pincel
         carga en el centro. Se monta con cuatro tramos por trazo,
         cada uno con su grosor, y el conjunto va girado un par de
         grados. Y no esta centrada: en el render cae 20 px a la
         derecha y 6 por debajo del centro del ovalo. Esa asimetria
         es lo unico que separa un simbolo trazado a mano de uno
         hecho con la regla, y es lo primero que se pierde cuando
         alguien "limpia" el dibujo. */
      /* Medida en la hoja: el trazo horizontal ocupa el 49% del
         ancho del ovalo, el vertical el 39% del alto, y los dos
         tienen el mismo grosor -unos 5 px, el 3% del ancho de la
         cabeza-. Se cruzan practicamente en el centro. Son dos
         barras rectas y parejas: nada de puntas afiladas ni
         inclinaciones. */
      /* Y va PINTADA sobre el ovalo, no montada delante.

         Eran dos cajas de trece centimetros de fondo plantadas a la
         altura del polo. El ovalo se curva, asi que en las puntas de
         los trazos la caja sobresalia seis centimetros de la
         superficie: de perfil se veian los cantos y la cruz parecia
         una pieza pegada con cola. Es una marca de tinta en la cara,
         no un objeto.

         Ahora cada trazo es una tira de dos milimetros que SIGUE la
         superficie del elipsoide: en cada paso se resuelve la z del
         ovalo para esa x -o esa y- y se levanta la tira cuatro
         milimetros. Sin cantos, sin fondo y sin volumen; y como no
         entra en la pasada de contorno, tampoco lleva linea negra
         propia. */
      /* Mas grande que en la hoja a proposito: a la distancia de
         camara del juego la cruz es lo UNICO que identifica a un
         personaje, y con el 49% del ancho de la cabeza que da la
         medicion se perdia. Al 62% se lee desde el otro lado de la
         arena y sigue cabiendo dentro del ovalo. */
      const gr = 0.032;
      trazoEnCara(B, 'h', -0.196, 0.218, Chars.ALTO_CRUZ, gr, F.cruz);
      trazoEnCara(B, 'v', Chars.ALTO_CRUZ - 0.196, Chars.ALTO_CRUZ + 0.196, 0.014, gr, F.cruz);

      if (F.pelo) {
        // casquete: un elipsoide achatado que sigue el craneo
        B.addEllipsoid(0.346, 0.268, 0.340, 0, 1.487, Chars.CABEZA_Z - 0.018, F.pelo,
                       { seg: 14, rings: 7 });
        // la melena corta de la nuca
        B.addEllipsoid(0.262, 0.230, 0.150, 0, 1.295, Chars.CABEZA_Z - 0.218, F.pelo,
                       { seg: 10, rings: 5 });
      }
      if (F.venda) {
        /* La venda de Hank tiene que ABRAZAR el ovalo, no
           atravesarlo. Con una caja recta sobresalia por los
           costados y por delante, y de lejos parecia que llevaba
           una tabla clavada en la cara. Un elipsoide achatado se
           queda dentro de la silueta y cruza justo por debajo de
           la cruz, que es donde va. */
        B.addEllipsoid(0.336, 0.090, 0.306, 0, 1.162, Chars.CABEZA_Z - 0.004,
                       0xb5afa1, { seg: 12, rings: 4 });
        B.addBox(0.150, 0.066, 0.090, -0.190, 1.150, Chars.CABEZA_Z - 0.210,
                 0xa39d90, { shade: 1 });
      }
    }

    /* LO QUE LLEVA EN LA CABEZA: gafas, mascaras, anteojos. Son objetos
       aparte, con los nombres del SWF -ver accesorios.js-: se le ponen a
       quien los lleve, y el dia que haya tienda, al jugador. */
    // (las que van en su malla aparte, ver Accesorios.enMallaAparte, aqui solo ponen su tinta)
    if (F.mascara && (silueta || !Accesorios.enMallaAparte(F.mascara))) {
      B.skin(H.CABEZA);
      Accesorios.construir(B, F.mascara, g, silueta);
    }
    /* EL SOMBRERO Y LA BOCA (prendas3d.js) van con su profundidad de
       verdad, sin adelantar: adelantados, lo que queda detras de la cabeza
       -la vuelta de una vincha por la nuca, el fondo de una gorra- asomaba
       a traves de ella. Lo que se toca es la tinta del ovalo, que va
       adelantada 15 cm y cruzaba la prenda por el borde de la cabeza: donde
       la prenda la tapa, no se adelanta (ver geoDe). */
    for (const id of [F.boca, F.sombrero]) {
      if (!id) continue;
      B.skin(H.CABEZA);
      const n0 = B.n;
      Accesorios.construir(B, id, g, silueta, F);
      (B.prendaCabeza = B.prendaCabeza || []).push([n0, B.n]);
    }

    /* LAS MANOS -> ver POSE_MANO y barrerMano(), mas abajo. Se
       construyen LAS CUATRO poses de cada mano; la animacion decide
       cual se ve encogiendo las otras tres a cero. */
    /* Con las manos del SWF -manos.js- el color va en una malla
       aparte, con su textura (ver geoDe), y aqui solo entra su tinta. */
    for (let s = 0; s < 2; s++) {
      const u = s ? 1 : -1;
      const huesos = s ? Chars.MANOS_D : Chars.MANOS_I;
      for (let q = 0; q < Chars.POSES; q++) {
        B.skin(huesos[q]);
        if (!global.Manos) barrerMano(B, F, g, silueta, u, POSE_MANO[q] || POSE_MANO[0]);
        else if (silueta) manoSWF(B, u, q, g * 0.95);
      }
    }

    /* ---------------------------------------------------------
       LOS PIES, LOS DEL SWF

       En Madness: Project Nexus el pie es UNA forma para todos los
       tipos: el DefineShape 2789 dentro del sprite 2790, que el muñeco
       (mySprite 5317) coloca dos veces REFLEJADO (escala x = -1). Asi
       que la punta es el extremo de la izquierda del dibujo y el talon
       el de la derecha. Medido sobre el relleno, sin la tinta (134 x 65
       px, 2,06 : 1):

         · arriba casi plano, lo mas alto un poco por delante del medio
         · la suela en mecedora: toca el suelo hacia la punta y sube en
           los dos extremos, que acaban en punta redondeada a tres
           cuartos de la altura
         · una muesca en la suela, del lado del talon
         · un solo gris, 102, sin suela de otro color

       En 3D: el perfil se barre de talon a punta, y cada seccion es una
       superelipse -una losa de cantos redondos, no un tubo- que se
       estrecha hacia los extremos tambien vista desde arriba. 40 cm de
       largo, 19 de alto y 23 de ancho (la hoja de turnaround da 66 px de
       frente con la tinta: 23 cm de relleno).

       Todo es una sola superficie: la tinta es su casco, sin piezas
       sueltas que asomen. Ver PIE_SWF. */
    for (let s = 0; s < 2; s++) {
      const bx = (s ? 1 : -1) * 0.188;
      B.skin(s ? H.PIE_D : H.PIE_I);
      const cPie = silueta ? 0x000000 : (F.pie || C.bota);
      const an = anillosPie(bx, g, cPie);
      B.addAro(an, cPie, { tapas: false });
      tapaPie(B, an[0], -1, cPie);
      tapaPie(B, an[an.length - 1], 1, cPie);
    }

    return B;
  }

  /* EL CONTORNO DEL PIE DEL SWF, TAL CUAL.

     El borde del relleno de la forma 2789, ya reflejado como lo pone el
     muñeco (punta a la derecha), en 96 puntos antihorarios: [u, v] con
     u de talon (0) a punta (1) y v la altura, las dos en largos del pie
     -el dibujo mide 0,49 de alto por largo-. Trazado con marching
     squares sobre el render de Ruffle, en la isolinea del 50% entre el
     gris del relleno y la tinta (407 puntos), suavizado un pelo y
     remuestreado por largo de arco.

     Antes el perfil se muestreaba columna a columna -suela y arriba en
     13 puntos- y eso no puede dar lo que define a este pie: el talon es
     un canto un poco inclinado con las esquinas redondas, y la punta
     baja en DIAGONAL, mas larga arriba que abajo. Salia un ladrillo con
     el talon en pico y la punta cortada a pico. */
  const PIE_CONTORNO = [
    [0.5330, 0.4883], [0.5063, 0.4838], [0.4795, 0.4799], [0.4527, 0.4766], [0.4256, 0.4757], [0.3989, 0.4719],
    [0.3720, 0.4690], [0.3449, 0.4681], [0.3182, 0.4641], [0.2912, 0.4615], [0.2642, 0.4604], [0.2374, 0.4562],
    [0.2105, 0.4539], [0.1835, 0.4528], [0.1567, 0.4486], [0.1297, 0.4465], [0.1030, 0.4430], [0.0766, 0.4370],
    [0.0511, 0.4279], [0.0270, 0.4157], [0.0077, 0.3973], [0.0000, 0.3715], [0.0036, 0.3448], [0.0063, 0.3178],
    [0.0115, 0.2913], [0.0148, 0.2645], [0.0193, 0.2379], [0.0213, 0.2109], [0.0254, 0.1841], [0.0268, 0.1571],
    [0.0278, 0.1301], [0.0319, 0.1033], [0.0428, 0.0789], [0.0650, 0.0636], [0.0902, 0.0540], [0.1167, 0.0490],
    [0.1435, 0.0458], [0.1703, 0.0420], [0.1973, 0.0409], [0.2200, 0.0515], [0.2366, 0.0716], [0.2626, 0.0781],
    [0.2896, 0.0776], [0.3156, 0.0703], [0.3415, 0.0623], [0.3673, 0.0542], [0.3932, 0.0468], [0.4193, 0.0396],
    [0.4455, 0.0332], [0.4717, 0.0265], [0.4980, 0.0200], [0.5246, 0.0153], [0.5512, 0.0111], [0.5778, 0.0060],
    [0.6048, 0.0040], [0.6318, 0.0026], [0.6588, 0.0009], [0.6859, 0.0000], [0.7128, 0.0021], [0.7397, 0.0051],
    [0.7658, 0.0123], [0.7918, 0.0198], [0.8178, 0.0271], [0.8435, 0.0356], [0.8672, 0.0485], [0.8896, 0.0638],
    [0.9085, 0.0831], [0.9232, 0.1058], [0.9355, 0.1299], [0.9468, 0.1545], [0.9566, 0.1797], [0.9658, 0.2051],
    [0.9743, 0.2308], [0.9812, 0.2570], [0.9875, 0.2832], [0.9930, 0.3097], [0.9988, 0.3360], [1.0000, 0.3630],
    [0.9948, 0.3893], [0.9797, 0.4115], [0.9592, 0.4291], [0.9344, 0.4396], [0.9082, 0.4459], [0.8812, 0.4481],
    [0.8548, 0.4535], [0.8279, 0.4562], [0.8012, 0.4608], [0.7742, 0.4629], [0.7476, 0.4678], [0.7206, 0.4696],
    [0.6941, 0.4746], [0.6671, 0.4766], [0.6404, 0.4810], [0.6137, 0.4853], [0.5870, 0.4896], [0.5600, 0.4905]
  ];
  /* EL TAMAÑO, DEL SWF Y NO DE LA HOJA DE VUELTAS. La hoja daba 100 px
     de largo contra 168 de cabeza (0,60) y salian botas de payaso. En
     el SWF, con los sprites de la cabeza y el pie a la misma escala
     (h_cp_cabeza 618 px con tinta, h_cp_pie 301; tinta de 16 px), el
     relleno del pie mide 285/602 = 0,473 del ancho de la cabeza; la
     estatua del menu -el muñeco entero- lo confirma (puño 0,35 de la
     cabeza contra 0,32 de los sprites). 0,473 x 0,666 = 0,315 m. El
     ancho y el talon bajan en la misma proporcion (x 0,7875). */
  const PIE_LARGO = 0.315, PIE_ANCHO = 0.0906, PIE_Z0 = -0.1355;
  const PIE_ALTO = PIE_LARGO * 0.4905;
  const PIE_SUELO = 0.016;
  // para las pruebas: un pie suelto en el constructor B
  Chars._piePrueba = (B, bx, g, hex) => {
    const an = anillosPie(bx, g, hex);
    B.addAro(an, hex, { tapas: false });
    tapaPie(B, an[0], -1, hex); tapaPie(B, an[an.length - 1], 1, hex);
  };
  Chars.PIE = { largo: PIE_LARGO, alto: PIE_ALTO, ancho: PIE_ANCHO * 2, z0: PIE_Z0 };

  /* El pie en 3D: una LOSA con esa silueta, del ancho del pie, con los
     cantos de los lados redondeados -la misma construccion que las
     manos-: de costado es el dibujo del SWF exacto, y de frente o desde
     arriba una pieza de cantos blandos. Cada anillo es la silueta metida
     hacia dentro lo que toca a esa altura del canto. */
  const CANTO_PIE = [[-1.00, 0.030], [-0.95, 0.013], [-0.82, 0.003], [-0.55, 0],
                     [0.55, 0], [0.82, 0.003], [0.95, 0.013], [1.00, 0.030]];
  /* Las caras de los lados del pie. La silueta tiene una concavidad -la
     muesca de la suela- y un abanico desde el centro la cruzaba con
     triangulos del reves: salia una ranura negra en el costado. Se
     triangula por recorte de orejas (THREE.ShapeUtils) y cada triangulo
     se orienta hacia su lado. */
  function tapaPie(B, aro, lado, hex) {
    const v2 = aro.map((q) => new THREE.Vector2(q[2], q[1]));
    const tris = THREE.ShapeUtils.triangulateShape(v2, []);
    const c = B._rgb(hex, 1);
    const ids = aro.map((q) => B._vert(q[0], q[1], q[2], lado, 0, 0, c[0], c[1], c[2]));
    for (const t of tris) {
      const a = aro[t[0]], b = aro[t[1]], d = aro[t[2]];
      // componente x de la normal del triangulo (z, y en el plano)
      const nx = (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]);
      if (nx * lado > 0) B.idx.push(ids[t[0]], ids[t[1]], ids[t[2]]);
      else B.idx.push(ids[t[0]], ids[t[2]], ids[t[1]]);
    }
  }

  function anillosPie(bx, g, hex) {
    /* El pie se levanta lo que mide su casco de tinta (1,6 cm, el g de
       la pasada de contorno): con la suela en y = 0 la linea de abajo
       quedaba enterrada en el piso y el pie parecia hundido. En el SWF
       el trazo de la suela APOYA sobre el suelo, no se mete. */
    const base = PIE_CONTORNO.map((q) => [PIE_Z0 + q[0] * PIE_LARGO, PIE_SUELO + q[1] * PIE_LARGO]);
    const sil = g > 0 ? encoger(base, -g) : base;
    const anillos = [];
    for (const c of CANTO_PIE) {
      const P = c[1] > 0 ? encoger(sil, c[1]) : sil;
      const x = bx + c[0] * (PIE_ANCHO + g);
      // visto desde +x la silueta antihoraria en (z, y) queda horaria:
      // se recorre al reves para que las caras miren hacia fuera
      const aro = [];
      for (let i = P.length - 1; i >= 0; i--) aro.push([x, P[i][1], P[i][0], hex]);
      anillos.push(aro);
    }
    return anillos;
  }

  /* ---------------------------------------------------------
     UN TRAZO PINTADO SOBRE LA CARA

     El ovalo de la cabeza mide 0,333 x 0,392 x 0,327 y esta centrado
     en (0, 1.315, CABEZA_Z). Para que una marca se vea PINTADA y no
     pegada, cada punto de la tira tiene que apoyarse en esa
     superficie:

       z = rz * raiz(1 - (x/rx)^2 - (y/ry)^2)

     y salir cuatro milimetros hacia afuera para no pelearse con el
     ovalo por el mismo pixel. La tira se hace en once tramos: con
     menos, en las puntas se despega; con mas, no se nota.

     eje 'h' recorre la x y 'v' la y. El grosor va siempre en el eje
     contrario, y se toma el mismo z de la linea central -a once
     milimetros del eje la diferencia de curvatura es de dos
     centesimas de milimetro, invisible-.
     --------------------------------------------------------- */
  const CARA_RX = 0.333, CARA_RY = 0.392, CARA_RZ = 0.327;
  const CARA_Y = 1.315;
  // el ovalo, para la linea de la union con el torso (Art.aplicarEscalonesMundo)
  Chars.CARA = { rx: CARA_RX, ry: CARA_RY, rz: CARA_RZ, y: CARA_Y };

  function zDeCara(x, y) {
    const a = x / CARA_RX, b = (y - CARA_Y) / CARA_RY;
    const k = 1 - a * a - b * b;
    return Chars.CABEZA_Z + CARA_RZ * Math.sqrt(k > 0.02 ? k : 0.02);
  }

  function trazoEnCara(B, eje, desde, hasta, fijo, grosor, hex) {
    const N = 11, h = grosor * 0.5, fuera = 0.004;
    const fila = [];
    for (let i = 0; i <= N; i++) {
      const t = desde + (hasta - desde) * (i / N);
      const x = eje === 'h' ? t : fijo;
      const y = eje === 'h' ? fijo : t;
      const z = zDeCara(x, y) + fuera;
      fila.push(eje === 'h' ? [[x, y - h, z], [x, y + h, z]]
                            : [[x - h, y, z], [x + h, y, z]]);
    }
    for (let i = 0; i < N; i++) {
      const A = fila[i], C = fila[i + 1];
      // el orden cambia con el eje para que la tira mire hacia afuera
      if (eje === 'h') B.addQuad(A[0], C[0], C[1], A[1], hex, 1, true);
      else B.addQuad(A[0], A[1], C[1], C[0], hex, 1, true);
    }
  }

  /* ---------------------------------------------------------
     LAS MANOPLAS -> un pulgar y tres dedos

     Flotan: no hay nada que las una al cuerpo. Y no son un bulto
     con marcas encima; ampliando la hoja se ve como estan montadas.
     El canto de DENTRO -el que mira al cuerpo- hace un zigzag de
     tres tramos:

       1. arriba, el PULGAR sobresale como un muñon corto
       2. justo debajo, el contorno se mete: es LA MUESCA
       3. mas abajo, los TRES DEDOS vuelven a sobresalir

     Esa muesca es el hueco del agarre. El puño esta dibujado ya
     cerrado alrededor de algo, y cuando el personaje coge un arma
     el cañon pasa justo por ahi; por eso las manos vacias siguen
     teniendo el agujero. Estos puños nunca se abren.

     Y son TRES dedos, no cuatro: en la vista de perfil se cuentan
     tres lobulos festoneando el borde de abajo, con dos pliegues
     entre ellos. Gruesos, tocandose, sin holgura.

     La masa principal ocupa solo el 60% de fuera; el 40% de dentro
     lo rellenan el pulgar arriba y los dedos abajo, y entre los dos
     queda el aire. Construido asi la silueta sale sola y no hay que
     dibujar ni una linea encima.

     El parametro u vale +1 para la mano derecha y -1 para la
     izquierda: todo lo que va "hacia adentro" se escribe como -u,
     y asi la pieza se construye una sola vez.
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     EL PERFIL DE LA MANO

     Una seccion de la mano, en el plano X-Y, para una profundidad
     dada. Se barre a lo largo de Z -de la parte de atras de la mano
     a los nudillos-, y asi el PULGAR es simplemente un tramo del
     barrido donde la seccion se abulta hacia dentro. No hace falta
     una pieza aparte, que es lo que rompia el contorno.

       ancho    medio ancho de la seccion
       alto     media altura
       cy       centro vertical
       pulgar   cuanto se abulta el costado de dentro
       u        +1 mano derecha, -1 izquierda
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     EL PUÑO

     UNA sola superficie barrida de abajo arriba. Ni masa + dedos +
     pulgar ni nada: una pieza. Ver addAro() en util.js para por
     que; en corto, la tinta de este juego es un casco hinchado y
     cada pieza suelta trae el suyo, asi que varias piezas solapadas
     salpican cuñas negras dentro de la silueta.

     Medidas de la hoja (1 px = 0,003963 m):
       de frente  54 x 72 px -> 0,214 de ancho, 0,285 de alto
       de perfil  68 x 63 px -> 0,269 de fondo

     El perfil va ESTRECHO ARRIBA Y ANCHO ABAJO -en la hoja la mano
     se ensancha hacia los nudillos-, y el PULGAR sale HACIA
     ADELANTE, no hacia el costado. Eso ultimo costo verlo: en la
     vista de frente parece que el pulgar cruza por dentro, pero es
     escorzo; en la de perfil se ve que el lobulo sobresale por
     delante. Modelandolo de costado no se veia nunca, porque ese
     costado mira a camara y no sale en silueta.

     Los tres dedos NO son geometria. En la hoja el canto de abajo
     apenas ondula: son PLIEGUES dentro de una forma cerrada.
     Modelarlos como bultos era lo que hacia que se vieran
     separados, como tres salchichas pegadas.
     --------------------------------------------------------- */

  /* =============================================================
     LAS MANOS: CUATRO POSES

     La hoja de turnaround solo trae una mano, y en REPOSO -dedos
     flojos, pulgar enganchado-. El sprite sheet de la serie trae el
     resto, y ahi se ve que en Madness la mano no es una pieza fija:
     cambia de forma entera segun lo que hace. Un puño no es la mano
     de reposo girada, es otro dibujo.

     Asi que aqui hay cuatro, y la animacion elige una:

       REPOSO   la de la hoja. Andando, esperando, corriendo.
       PUÑO     cerrado y compacto, con los tres rollos de los dedos
                marcados. Para pegar.
       PALMA    plana y ancha, dedos estirados. Para cachetear, para
                agarrar de la pechera y para cuando desarman a uno.
       AGARRE   cerrada en C sobre el mango, con el hueco por donde
                pasa el arma. Para empuñar.

     Las cuatro son LA MISMA construccion -un barrido de perfil, ver
     addAro() en util.js- con otras tablas, y las cuatro caben dentro
     de una silueta parecida: el cambio de pose es instantaneo -un
     fotograma, como en la serie-, y si una creciera de golpe se
     veria como un globo hinchandose.

     Existen las cuatro a la vez en la malla, cada una atada a su
     hueso, y la animacion encoge a cero las tres que no tocan. Sale
     mas barato que sacarlas a mallas aparte -serian seis llamadas de
     dibujo mas por personaje- y evita tener que deformar un puño
     hasta convertirlo en una mano abierta, que con piezas rigidas no
     sale bien jamas.
     ============================================================= */

  /* Un tono mas oscuro del mismo color, para los pliegues. */
  function tinte(hex, k) {
    const r = Math.round(((hex >> 16) & 255) * k);
    const g = Math.round(((hex >> 8) & 255) * k);
    const b = Math.round((hex & 255) * k);
    return (r << 16) | (g << 8) | b;
  }

  /* -------------------------------------------------------------
     COMO SE CONSTRUYE UNA MANO

     Sacada del sprite sheet de la serie, no de memoria. Las 24 manos
     del sheet se recortaron una a una, se les siguio el borde del
     relleno claro y se midieron. De ahi salen cuatro cosas que
     ninguna version anterior tenia bien:

       · Las manos de Madness NO LLEVAN DEDOS ESCULPIDOS. Son manchas
         con un contorno negro grueso y, como mucho, dos rayitas
         dentro. Toda la talla de palma + tres dedos + pulgar era
         inventada, y de ahi salian las puas, los agujeros en las
         puntas y el dedo de otro color.

       · El reposo -sprite 0- YA ES UN PUÑO: una mancha lisa con dos
         rayitas en el medio. No hay que sacarle dedos.

       · La mano que empuña -sprite 15- se reconoce por el HUECO: el
         pulgar enroscado y tres rollos, y entre medio el agujero por
         donde pasa el mango. No es un puño.

       · El puño de verdad es el sprite 21, visto de nudillos, una
         mancha partida por una sola costura en diagonal.

       · La mano abierta -sprite 2- si abre los dedos, pero en
         abanico y dentro de UNA sola silueta.

     Asi que una pose no es una talla: es un juego de LOSAS. Un
     poligono por mancha de relleno, extruido con el canto
     redondeado, y la linea negra entre mancha y mancha la pone sola
     la pasada de contorno. Como el contorno se dibuja DESPUES del
     color -ver Art.mats.contorno-, las losas pueden solaparse sin
     que salgan cuñas negras.
     ------------------------------------------------------------- */

  /* Del alto de la mano del sheet a metros.

     Estuvo en 0,285 -el alto de la mano en la hoja de turnaround-,
     pero eso mide la mano EN REPOSO y aqui se usa para normalizar la
     silueta del sprite, que es otra cosa. El resultado eran unas
     manos del 0,42 de la cabeza cuando en la serie son del 0,31-0,34:
     medido en dos referencias distintas, mano 39 px contra cabeza
     114 en la hoja del bate, y 0,31 en el grunt de la wiki.

     Con manos un 25% demasiado grandes se solapaban entre ellas al
     coger un arma a dos manos y se tragaban el pomo del bate. */
  Chars.MANO_ESC = 0.225;
  /* Medio grueso de la losa. Estuvo en 0,040 -8 cm en una mano de
     28- y se veia como DOS manos superpuestas: en guardia la mano
     lleva 45 grados de cabeceo, y a ese angulo una losa tan gorda
     enseña la cara de delante y ademas un trozo enorme del canto y
     de la de atras. */
  Chars.MANO_MEDIO = 0.017;

  /* DONDE AGARRA DE VERDAD LA MANO.

     El hueso pivota en la MUÑECA, no en la palma: medido sobre la
     malla, el centro de la mano en pose de agarre cae 0,109 por
     debajo del pivote, siguiendo el eje de los dedos. Colgando el
     arma del pivote a secas, el mango pasaba por el borde de arriba
     del puño en vez de por dentro. */
  Chars.MANO_CENTRO = 0.086;

  /* Y cuanto se mete el arma POR DETRAS del plano de la mano.

     En el dibujo de la serie el mango pasa por detras de la mano y
     los dedos se ven por delante de el: por eso se leen las dos
     manos como dos piezas y no como un bulto atravesado por un
     palo. Metiendo el arma en el plano de la mano, el mango partia
     el puño en dos por la mitad.

     Medido en el juego: las dos manos ocupan de z -0,203 a -0,155,
     y el mango tiene 0,042 de radio con la escala puesta. Para que
     no asome por delante de ninguna, el eje del bate tiene que
     quedar por debajo de -0,245; con 0,085 cae en -0,268 y sobran
     dos centimetros y medio de margen. */
  Chars.MANO_FONDO = 0.085;

  /* Mete un poligono hacia adentro una distancia FIJA, por la
     bisectriz de cada vertice. Es lo que redondea el canto sin
     comerse las partes finas: escalando desde el centro, los dedos
     de la mano abierta se quedaban en nada. Con d negativo lo saca
     hacia afuera, que es como se hincha la pasada de tinta. */
  function encoger(poly, d) {
    const n = poly.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = poly[(i - 1 + n) % n], b = poly[i], c = poly[(i + 1) % n];
      let x1 = b[0] - a[0], y1 = b[1] - a[1];
      let x2 = c[0] - b[0], y2 = c[1] - b[1];
      const l1 = Math.hypot(x1, y1) || 1, l2 = Math.hypot(x2, y2) || 1;
      x1 /= l1; y1 /= l1; x2 /= l2; y2 /= l2;
      const n1x = -y1, n1y = x1, n2x = -y2, n2y = x2;   // normal interior
      let bx = n1x + n2x, by = n1y + n2y;
      const lb = Math.hypot(bx, by);
      if (lb < 1e-6) { bx = n2x; by = n2y; } else { bx /= lb; by /= lb; }
      /* En un vertice agudo la bisectriz es corta y hay que alargarla,
         pero con tope: sin el, una punta afilada se dispara al otro
         lado del poligono y la losa se cruza sola. */
      const k = Math.min(2.4, 1 / Math.max(0.42, bx * n2x + by * n2y));
      out.push([b[0] + bx * d * k, b[1] + by * d * k]);
    }
    return out;
  }

  /* El canto: cinco anillos, el del medio es el poligono tal cual y
     los de los extremos van metidos hacia adentro. Con dos anillos
     la mano sale como una galleta cortada con molde. */
  const CANTO = [[0.100, -1], [0.032, -0.74], [0, 0], [0.032, 0.74], [0.100, 1]];

  /* Una losa. El poligono viene en el marco del sprite -x hacia los
     dedos, y hacia arriba- y aqui se gira -90 grados, porque el resto
     de la animacion da por hecho que la mano cuelga hacia -Y. */
  function losa(B, hex, poly, g, medio, ancla, u) {
    const E = Chars.MANO_ESC;
    const base = g > 0 ? encoger(poly, -g / E) : poly;
    const anillos = [];
    for (let r = 0; r < CANTO.length; r++) {
      const d = CANTO[r][0], f = CANTO[r][1];
      const P = d > 0 ? encoger(base, d) : base;
      /* La tinta engorda EN EL PLANO, casi nada en profundidad. Con
         el mismo hinchado en z la losa de tinta salia un 70% mas
         gruesa que la de color, y como la mano se ve a 45 grados ese
         grueso se proyecta en pantalla y se suma a la linea: el
         contorno se comia el interior de la mano. */
      const z = u * f * (medio + g * 0.3);
      /* El tono baja del dorso al canto. Con todo del mismo color,
         el canto -la mano se ve a 45 grados, asi que se ve entero-
         salia igual de claro que el dorso y leia como una segunda
         mano detras de la primera.

         Se elige por el signo REAL de z, no por el numero de anillo:
         la mano izquierda va reflejada en profundidad, asi que en
         ella los anillos van al reves y por numero de anillo saldria
         iluminada por detras. */
      const frente = u * f;
      const tono = tinte(hex, 0.58 + 0.42 * (frente * 0.5 + 0.5));
      const anillo = P.map((q) => [q[1] * E, -(q[0] - ancla) * E, z, tono]);
      anillo.reverse();
      anillos.push(anillo);
    }
    /* Reflejar en profundidad invierte el sentido de las caras; dando
       la vuelta al orden de los anillos se vuelve a poner bien. La
       mano izquierda es la derecha reflejada EN PROFUNDIDAD, no de
       costado: las dos apuntan al enemigo y lo que cambia de lado es
       el pulgar. Reflejandola en X salian las dos mirando igual. */
    if (u < 0) anillos.reverse();
    B.addAro(anillos, hex, {});
  }

  /* Las rayitas de dentro: los pliegues del sprite. Atraviesan la
     losa para verse por las dos caras, pero asoman SOLO 1,5 mm.

     Estaban asomando 4 mm por cada lado y, como la mano se ve de
     canto en media animacion, las barras salian POR FUERA de la
     silueta: la mano dejaba de ser una mano y quedaba un manojo de
     palos negros verticales. A 1,5 mm el saliente mide 0,17 px en
     pantalla -invisible de canto- y de cara se sigue viendo entera. */
  function rayaMano(B, r, medio, ancla) {
    const E = Chars.MANO_ESC;
    B.push();
    B.translate(r[1] * E, -(r[0] - ancla) * E, 0);
    B.rotateZ(r[4] - Math.PI / 2);
    B.addBox(r[2] * E, r[3] * E, (medio + 0.0015) * 2, 0, 0, 0, 0x0a0a0a, { luz: false });
    B.pop();
  }

  /* LAS SEPARACIONES DE LA POSE DEL CAÑON NO SON BARRAS.

     Las tenia puestas como dos rectas y estaban mal. En el sprite
     los tres rollos estan MONTADOS uno sobre otro, asi que lo que
     los separa es el BORDE del rollo de delante: un arco, no una
     raya. Medido sobre el sprite -separando las tres manchas de
     relleno y cogiendo el punto medio del hueco negro fila a fila-
     cada separacion se desvia 0,051 y 0,063 unidades de la recta,
     que sobre una mano de 0,78 es un 7-8%: se ve.

     Ademas el hueco real mide 0,074 y 0,078, no los 0,055 que tenia
     puestos, y estaban al reves de lado.

     Se dibuja engordando la polilinea a los dos lados por su normal
     y cerrando el contorno, que es lo mismo que hace losa() pero
     sin el bisel del canto: aqui no hay volumen que biselar, es
     tinta plana. */
  function curvaMano(B, C, medio, ancla, u) {
    const E = Chars.MANO_ESC;
    const P = C.pts, h = C.grosor * 0.5;
    const izq = [], der = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i > 0 ? i - 1 : 0], b = P[i < P.length - 1 ? i + 1 : i];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const L = Math.hypot(tx, ty) || 1;
      tx /= L; ty /= L;
      izq.push([P[i][0] - ty * h, P[i][1] + tx * h]);
      der.push([P[i][0] + ty * h, P[i][1] - tx * h]);
    }
    der.reverse();
    const poly = izq.concat(der);

    /* Asoma lo mismo que las rayitas: 1,5 mm. Mas que eso y, con la
       mano vista de canto, la linea sale por fuera de la silueta. */
    const z = medio + 0.0015;
    const anillos = [];
    for (let f = -1; f <= 1; f += 2) {
      const zz = u * f * z;
      const anillo = poly.map((q) => [q[1] * E, -(q[0] - ancla) * E, zz, 0x0a0a0a]);
      anillo.reverse();
      anillos.push(anillo);
    }
    if (u < 0) anillos.reverse();
    B.addAro(anillos, 0x0a0a0a, { luz: false });
  }

  function barrerMano(B, F, g0, silueta, u, T) {
    /* La mano lleva la linea MAS GRUESA que el resto del cuerpo, no
       mas fina. Medido en el juego, a 112 px/m: la mano entera ocupa
       32 px y con el 0,46 de antes la tinta daba 0,82 px -menos de
       un pixel-, asi que la linea salia a trozos. Es lo que se veia
       como contorno roto y desprolijo.

       Y engordarla no tapa nada: la tinta se dibuja DESPUES del
       color y sin escribir profundidad, asi que solo asoma por
       fuera de cada losa. Lo unico que hace es rellenar de negro los
       huecos entre lobulo y lobulo, que es EXACTAMENTE lo que hace
       el sprite: manchas claras separadas por linea gorda.

       A 1,5 se pasaba: los dedos de la mano abierta -2,8 cm de
       ancho- desaparecian debajo de su propia tinta. 0,95 deja la
       linea del mismo grosor que la del cuerpo, 1,7 px. */
    const g = g0 * 0.95;
    const col = silueta ? 0x000000 : F.guante;
    const medio = Chars.MANO_MEDIO;

    B.push();
    B.translate(u * Chars.MANO.x, Chars.MANO.y, Chars.MANO.z);
    if (T.giro) B.rotateZ(u * T.giro);

    for (let i = 0; i < T.lobulos.length; i++) {
      losa(B, col, T.lobulos[i], g, medio, T.ancla, u);
    }
    /* Las rayitas son dibujo de dentro: en la pasada de tinta no van,
       porque ahi solo interesa la silueta de fuera. */
    if (!silueta) {
      for (let i = 0; i < T.rayas.length; i++) {
        rayaMano(B, T.rayas[i], medio, T.ancla);
      }
      if (T.curvas) {
        for (let i = 0; i < T.curvas.length; i++) {
          curvaMano(B, T.curvas[i], medio, T.ancla, u);
        }
      }
    }
    B.pop();
  }

  /* LA MANO DEL SWF en el hueso de una pose. Cada pose trae dos
     manos -'d' la derecha, 'i' la izquierda- porque no son la misma
     mano reflejada: la derecha enseña a camara el dibujo de delante
     del SWF (hand_front) y la izquierda el de atras (hand_back), que
     es lo que hace la serie con la mano de cerca y la de lejos. El
     marco del hueso -dedos hacia -Y, cara a +Z- sale de ajustar cada
     dibujo a la pose vieja de su indice: ver tools/swf_modelos/manos.py.

     Sin tinta es el color, con la textura; con tinta, el casco negro
     de la pasada de contorno, hinchado ese tanto por la normal. */
  const H_REVES = 5;     // indice de REVES en MANOS_I / MANOS_D
  function manoSWF(B, u, q, tinta) {
    B.push();
    B.translate(u * Chars.MANO.x, Chars.MANO.y, Chars.MANO.z);
    const inst = q === H_REVES ? Manos.reves(0) : Manos.datos.poses[q][u > 0 ? 'd' : 'i'];
    Manos.meter(B, inst, 'hueso', tinta, 0x000000);
    B.pop();
  }

  /* -------------------------------------------------------------
     LAS CUATRO POSES, MEDIDAS DEL SPRITE SHEET

     Cada lobulo es el borde de una mancha de relleno del sprite,
     remuestreado por longitud de arco y normalizado al alto de la
     mano. Cada raya es [x, y, largo, grosor, angulo].

       pose      sprite   manchas   ancho/alto
       reposo       0        1         0,93     + 2 rayitas
       puño        21        1         0,81     + la costura
       palma        2        1         1,15     + 2 rayitas
       agarre      15        4         1,10     con el hueco del mango
       cañon        8        1         1,52     + 2 separaciones
     ------------------------------------------------------------- */
  const POSE_MANO = [
    /* reposo -> sprite 0 del sheet */
    {
      lobulos: [
        [[0.013,0.399], [0.133,0.400], [0.237,0.343], [0.290,0.234], [0.336,0.123], [0.369,0.008], [0.274,-0.062], [0.229,-0.173], [0.193,-0.286], [0.099,-0.360], [-0.016,-0.396], [-0.130,-0.381], [-0.240,-0.329], [-0.332,-0.252], [-0.364,-0.140], [-0.326,-0.026], [-0.291,0.090], [-0.275,0.210], [-0.211,0.310], [-0.102,0.360]]
      ],
      rayas: [[0.042, 0.110, 0.212, 0.059, 0.000],
              [-0.029, -0.116, 0.158, 0.072, -0.248]]
    },

    /* puno -> sprite 21 del sheet, el puño visto de nudillos.

       Silueta cerrada por lo mismo: la costura llega hasta el borde
       y le abria una hendidura al contorno, que ademas repetia la
       raya que ya se dibuja dentro. */
    {
      lobulos: [
        [[-0.063,0.415], [0.033,0.370], [0.125,0.322], [0.224,0.292], [0.294,0.210], [0.317,0.105], [0.319,-0.003], [0.339,-0.107], [0.311,-0.212], [0.247,-0.300], [0.175,-0.380], [0.077,-0.420], [-0.031,-0.420], [-0.131,-0.381], [-0.220,-0.318], [-0.297,-0.242], [-0.339,-0.143], [-0.334,-0.035], [-0.306,0.070], [-0.263,0.170], [-0.211,0.265], [-0.149,0.354]]
      ],
      rayas: [[0.061, 0.046, 0.575, 0.105, -1.975]]
    },

    /* palma -> sprite 2 del sheet.

       Silueta CERRADA. En el sprite los dedos abiertos se separan
       por ranuras de 0,02 de grosor -mas finas que la propia linea
       de tinta-, asi que a los 32 px que mide la mano en pantalla
       cada ranura se llenaba de negro y la mano salia deshilachada,
       como flecos colgando. Cerrada la silueta y puestas las
       separaciones como linea de dentro con 0,048 de grosor -el de
       los demas trazos del sheet- se lee igual que el sprite y el
       contorno sale de una pieza. */
    {
      lobulos: [
        [[-0.043,0.415], [0.090,0.388], [0.194,0.294], [0.327,0.306], [0.445,0.304], [0.389,0.181], [0.434,0.062], [0.447,-0.066], [0.360,-0.175], [0.368,-0.312], [0.244,-0.332], [0.110,-0.316], [-0.020,-0.369], [-0.156,-0.403], [-0.296,-0.400], [-0.410,-0.330], [-0.450,-0.196], [-0.465,-0.057], [-0.463,0.082], [-0.398,0.206], [-0.296,0.301], [-0.177,0.376]]
      ],
      /* SOLO los dos pliegues del sprite. Estuvieron ademas tres
         "separaciones de dedos" que no salian de separaciones de
         verdad: eran astillas del cierre morfologico, y con sus
         angulos de 45 y 135 grados quedaban cruzadas sobre la mano.
         En pantalla se leian como dos columnas negras verticales y
         la mano dejaba de parecer una mano. */
      rayas: [[0.027, 0.114, 0.238, 0.059, -0.007],
              [-0.010, -0.085, 0.193, 0.079, -0.318]]
    },

    /* agarre -> sprite 15 del sheet: la mano EMPUÑANDO, que no es
       un puño. Se reconoce por el HUECO entre el pulgar enroscado y
       los dedos, que es por donde pasa el mango.

       Dos piezas: el pulgar suelto -es lo que abre el hueco- y los
       tres rollos fundidos en una masa, con las separaciones como
       linea de dentro. Sueltos, a 32 px cada rollo se comia al de
       al lado por debajo de su propia tinta y quedaban tres
       burbujas; las lineas vienen de los bordes medidos:
         rollo 0  cy +0,272  alto 0,245 -> borde bajo  +0,150
         rollo 1  cy -0,040  alto 0,208 -> bordes +0,064 / -0,144
         rollo 2  cy -0,305  alto 0,170 -> borde alto -0,220 */
    {
      lobulos: [
        [[-0.217,0.329], [-0.115,0.304], [-0.051,0.214], [-0.022,0.107], [-0.018,-0.003], [-0.060,-0.104], [-0.162,-0.135], [-0.241,-0.066], [-0.238,0.043], [-0.317,0.083], [-0.363,-0.017], [-0.335,-0.122], [-0.319,-0.207], [-0.405,-0.138], [-0.437,-0.036], [-0.409,0.071], [-0.361,0.171], [-0.308,0.268]],
        [[0.075,0.405], [0.194,0.410], [0.312,0.393], [0.417,0.341], [0.459,0.235], [0.390,0.140], [0.396,0.038], [0.428,-0.071], [0.350,-0.159], [0.373,-0.270], [0.319,-0.369], [0.207,-0.401], [0.090,-0.391], [0.014,-0.304], [0.069,-0.205], [0.085,-0.106], [0.074,0.007], [0.110,0.115], [0.046,0.214], [0.002,0.325]]
      ],
      /* El grosor es el del TRAZO del sheet -0,055, el mismo que los
         pliegues del sprite 0-, no el del hueco medido entre rollo
         y rollo. El hueco incluye el contorno propio de cada rollo,
         y esta losa ya pone el suyo: usando el hueco la linea iba
         al doble y partia la masa en barras. */
      rayas: [[0.237, 0.116, 0.330, 0.055, 0.000],
              [0.218, -0.173, 0.300, 0.055, 0.000]]
    },

    /* cañon -> sprite 8 de la hoja: LOS TRES DEDITOS de debajo del
       guardamanos. Es la mano de delante de un arma larga, y es la
       que se ve en la referencia de Deimos con el fusil: no es un
       puño envolviendo, es la mano por DEBAJO con tres dedos
       asomando.

       LA FORMA SON LOS ENTRANTES. En la hoja los tres rollos son
       ovalos solapados, y lo que hace que se lean como tres dedos no
       son las rayas de dentro: son las MUESCAS del contorno entre
       rollo y rollo. Con catorce puntos la silueta se las comia y
       salia un canto rodado con dos rayas pintadas encima; con
       treinta las muescas sobreviven.

       Probe tambien trazar los tres rellenos por separado, como tres
       losas. No vale: a 32 px en pantalla los contornos de tres
       piezas tan juntas se funden en una mancha negra -es el mismo
       motivo por el que la pose de agarre lleva los rollos en una
       sola silueta-.

       Las dos separaciones van como linea de dentro, y NO SON
       RECTAS: en el sprite los rollos estan montados uno sobre
       otro, asi que lo que los separa es el borde curvo del de
       delante. Estan trazadas del sprite; ver curvaMano().

       Y va GIRADA 90 grados respecto a la hoja. El eje q0 de una
       pose es el del brazo -de la muñeca a los dedos-, y aqui la
       fila de tres dedos tiene que ir por el eje del CAÑON, que es
       el perpendicular. Sin girarla los tres rollos salen apilados
       en vertical, cruzados al arma en vez de tumbados debajo.

       Escala: 0,776 unidades por los 740 px de ancho del sprite
       -medido, relacion 1,510 contra los 1,522 que da el contorno
       guardado-. Va SIN GIRAR respecto a la hoja: la x de la hoja
       es q1 y la y es q0. Girandolo 90 grados -que fue lo primero
       que probe- los rollos salen chatos y apilados al reves, como
       una oruga. */
    {
      lobulos: [
        [[0.255,0.203], [0.223,0.138], [0.244,0.068], [0.240,-0.009], [0.192,-0.068], [0.202,-0.133], [0.202,-0.211], [0.166,-0.275], [0.107,-0.323], [0.042,-0.356], [-0.028,-0.377], [-0.102,-0.388], [-0.176,-0.377], [-0.234,-0.338], [-0.255,-0.268], [-0.244,-0.194], [-0.223,-0.124], [-0.255,-0.058], [-0.244,0.016], [-0.212,0.081], [-0.210,0.152], [-0.223,0.225], [-0.202,0.295], [-0.149,0.345], [-0.079,0.366], [-0.009,0.388], [0.069,0.388], [0.142,0.373], [0.207,0.340], [0.255,0.282]]
      ],
      rayas: [],
      /* Trazadas del sprite: el punto medio del hueco negro entre
         mancha y mancha, fila a fila, remuestreado a nueve puntos.
         Ver curvaMano() arriba. */
      curvas: [
        { grosor: 0.0735, pts: [
          [ 0.1830, -0.1468], [ 0.1360, -0.1468], [ 0.0889, -0.1573],
          [ 0.0364, -0.1611], [-0.0057, -0.1579], [-0.0522, -0.1468],
          [-0.0896, -0.1267], [-0.1316, -0.1101], [-0.1620, -0.1363]] },
        { grosor: 0.0777, pts: [
          [ 0.1410,  0.0787], [ 0.1028,  0.0839], [ 0.0602,  0.0734],
          [ 0.0090,  0.0734], [-0.0368,  0.0793], [-0.0752,  0.0944],
          [-0.1135,  0.1101], [-0.1466,  0.1311], [-0.1935,  0.1363]] }
      ]
    }
  ];

  /* El ancla de cada pose: la muñeca, o sea el extremo de atras de la
     mancha grande. Es el punto por donde gira, no el centro: girando
     por el centro la mano se despega de la muñeca al levantarla. */
  for (let i = 0; i < POSE_MANO.length; i++) {
    const P = POSE_MANO[i], L = P.lobulos;
    let min = Infinity;
    for (let j = 0; j < L.length; j++) {
      for (let k = 0; k < L[j].length; k++) min = Math.min(min, L[j][k][0]);
    }
    P.ancla = min + 0.10;
  }

  /* =============================================================
     CACHE DE GEOMETRIA
     ============================================================= */
  const _geos = Object.create(null);

  function geoDe(tipo) {
    if (_geos[tipo]) return _geos[tipo];
    const F = Chars.TIPOS[tipo];
    if (!F) throw new Error('Tipo de personaje desconocido: ' + tipo);
    const bc = U.builder({ skinned: true });
    /* LOS CRISTALES TRANSLUCIDOS de los anteojos (prendas3d.js: lentes): en
       el SWF se ve la cruz a traves. Van en su propia malla, transparente,
       atada a la cabeza; la prenda pone la opacidad en bc.vidrio.opacidad. */
    bc.vidrio = U.builder({ skinned: true }).skin(H.CABEZA);
    cuerpo(bc, F, 0, false);
    const vid = bc.vidrio.count() ? bc.vidrio.build() : null, vidOp = bc.vidrio.opacidad || 0.6;
    const bs = U.builder({ skinned: true });
    cuerpo(bs, F, 0.016, true);
    let manos = null, tm = 0;
    if (global.Manos) {
      const bm = U.builder({ skinned: true, uv: true });
      for (let s = 0; s < 2; s++) {
        const u = s ? 1 : -1;
        const huesos = s ? Chars.MANOS_D : Chars.MANOS_I;
        for (let q = 0; q < Chars.POSES; q++) {
          bm.skin(huesos[q]);
          manoSWF(bm, u, q, 0);
        }
      }
      manos = bm.build(); tm = bm.count();
    }
    /* Los accesorios con dibujo proyectado (ver accesorios.js): su propia
       malla, con su atlas. */
    let acc = null;
    if (F.mascara && global.Accesorios && Accesorios.conMalla(F.mascara)) {
      const ba = U.builder({ skinned: true, uv: true });
      ba.skin(H.CABEZA);
      acc = Accesorios.construirTex(ba, F.mascara); tm += ba.count();
    }
    const gs = bs.build();
    /* La capa de cada vertice (ver Art.CAPA): cuanto se corre el torso
       hacia atras para que la cabeza le pase por encima. Rampa suave de
       0,25 a 0,85: nada donde estan los pies, entero en los hombros. */
    const capa = (b) => b === H.CUERPO ? 1 : 0;    // las rampas, en el shader (Art.CAPA)
    /* El grosor de tinta en pantalla de cada vertice, en el rojo; en el verde la capa y en el azul el adelanto (ver
       Art.mats.contornoPiel): la mano lleva un cuarto. Con la linea
       entera, una mano vista de frente -32 px en un movil- quedaba
       comida por su propio contorno y no se leia. */
    {
      const si = gs.attributes.skinIndex, co = gs.attributes.color, P = gs.attributes.position;
      const manosH = new Set(Chars.MANOS_I.concat(Chars.MANOS_D));
      // lo que tapan el sombrero y la boca (prendas3d.js: Accesorios.CUBRE)
      const tapas = [F.sombrero, F.boca, F.mascara].map((id) => id && Accesorios.CUBRE && Accesorios.CUBRE[id]).filter(Boolean);
      const GRA = 180 / Math.PI;
      const enRango = (L, i) => L && L.some(([a, z]) => i >= a && i < z);
      // lo que envuelve la cabeza entera adelanta la cara de fuera de su tinta como el ovalo (prendas3d.js: lamina)
      const adOv = bs.adelantoOvalo ? new Set(bs.adelantoOvalo) : null;
      for (let i = 0; i < co.count; i++) {
        const b = si.getX(i);
        /* La cabeza se adelanta solo en el OVALO: las mascaras y el
           monocular son cascaras de 2-3 cm, y con 15 cm su tinta les
           pasaba por delante y las pintaba de negro enteras. */
        let ade = b === H.CUERPO ? 0.12 : (b === H.PIE_I || b === H.PIE_D) ? 0.06 : 0;
        if (b === H.CABEZA) {
          const G = 0.016;
          const nx = P.getX(i) / (CARA_RX + G), ny = (P.getY(i) - CARA_Y) / (CARA_RY + G), nz = (P.getZ(i) - Chars.CABEZA_Z) / (CARA_RZ + G);
          const q = Math.hypot(nx, ny, nz);
          ade = Math.abs(q - 1) < 0.02 ? 0.15 : 0.01;
          /* DEBAJO DE UNA PRENDA, EL CONTORNO DEL OVALO NO SE ADELANTA: la
             prenda va delante con su profundidad de verdad, y adelantado le
             pasaba por encima en el borde de la cabeza (una raya negra
             cruzando la vincha, el gorro, el pañuelo). */
          if (ade > 0.1 && tapas.length) {
            const n = [nx / q, ny / q, nz / q], az = Math.atan2(n[0], n[2]) * GRA, el = Math.asin(Math.max(-1, Math.min(1, n[1]))) * GRA;
            if (tapas.some((t) => t(az, el, n))) ade = 0.01;
          }
        }
        // la tinta de las mascaras con dibujo, tan adelantada como ellas (Accesorios.ADELANTO)
        if (enRango(bs.adelante, i)) ade = Accesorios.ADELANTO;
        // la del sombrero y la boca, con su profundidad (sin adelanto)
        if (enRango(bs.prendaCabeza, i)) ade = adOv && adOv.has(i) ? 0.15 : 0.01;
        if (enRango(bs.ropa, i)) ade = 0;
        co.setXYZ(i, manosH.has(b) ? Chars.TINTA_MANO : 1, capa(b), ade);
      }
    }
    const gc = bc.build();
    {
      const si = gc.attributes.skinIndex, P = gc.attributes.position;
      const a = new Float32Array(P.count);
      for (let i = 0; i < P.count; i++) a[i] = capa(si.getX(i));
      gc.setAttribute('aCapa', new THREE.BufferAttribute(a, 1));
      // la ropa, adelantada como la tinta del torso (ver Ropa.ADELANTO)
      const ad = new Float32Array(P.count);
      for (const [a0, z] of bc.ropa || []) ad.fill(Ropa.ADELANTO, a0, z);
      gc.setAttribute('aAde', new THREE.BufferAttribute(ad, 1));
    }
    _geos[tipo] = { color: gc, contorno: gs, manos: manos, acc: acc, vidrio: vid, vidOp,
                    tris: bc.count() + bs.count() + tm };
    return _geos[tipo];
  }
  Chars.geoDe = geoDe;
  Chars.encoger = (poly, d) => encoger(poly, d);   // lo usa ropa.js
  Chars.TINTA_MANO = 0.25;
  Chars._poseMano = barrerMano;   // expuesta para probar las manos sueltas

  /* =============================================================
     CREAR UN PERSONAJE
     ============================================================= */
  const _matsVidrio = {};
  const matVidrio = (op) => {
    if (!_matsVidrio[op]) {
      _matsVidrio[op] = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
      _matsVidrio[op].userData.vidrio = true;
    }
    return _matsVidrio[op];
  };
  /* EL MISMO CRISTAL EN UN RENDER A TEXTURA sRGB (la ficha de la tienda): ahi
     la mezcla es lineal y el visor rojo al 61% salia rosado (156, 129, 128
     medido; en la pantalla, 149, 77, 76, como el SWF). Con esta opacidad deja
     pasar lo mismo de una cara 204 que en la pantalla. */
  const srgbALin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  Chars.matVidrioLineal = (op) => matVidrio(Math.round((1 - srgbALin(0.8 * (1 - op)) / srgbALin(0.8)) * 1000) / 1000);
  Chars.crear = function (tipo, opts) {
    opts = opts || {};
    const F = Chars.TIPOS[tipo];
    const g = geoDe(tipo);

    const grupo = new THREE.Group();
    const bones = nuevoEsqueleto();
    // Hay que refrescar el mundo ANTES de atar la piel: bind() sin
    // matriz recalcula las inversas a partir de lo que vea, y unos
    // huesos recien creados no tienen matriz de mundo todavia. Sin
    // esto el cuerpo sale desmontado, cada pieza desplazada por la
    // altura de su propio hueso.
    bones[0].updateMatrixWorld(true);
    const esq = new THREE.Skeleton(bones, inversasDeReposo());

    const piel = new THREE.SkinnedMesh(g.color, Art.mats.cuerpo);
    piel.bind(esq, new THREE.Matrix4());   // matriz explicita: no recalcules
    piel.frustumCulled = false;

    grupo.add(bones[0]);
    grupo.add(piel);

    /* Las manos del SWF: su propia malla -llevan textura-, atada al
       mismo esqueleto. Una llamada de dibujo mas por personaje. */
    let manos = null;
    if (g.manos) {
      manos = new THREE.SkinnedMesh(g.manos, Manos.material(Manos.pielDe(tipo)));
      manos.bind(esq, new THREE.Matrix4());
      manos.frustumCulled = false;
      grupo.add(manos);
    }

    if (g.acc) {
      const ma = new THREE.SkinnedMesh(g.acc, Accesorios.material(F.mascara));
      ma.bind(esq, new THREE.Matrix4());
      ma.frustumCulled = false;
      grupo.add(ma);
    }

    // los cristales: transparentes, se dibujan despues de todo lo opaco (tinta incluida)
    if (g.vidrio) {
      const mv = new THREE.SkinnedMesh(g.vidrio, matVidrio(g.vidOp));
      mv.bind(esq, new THREE.Matrix4());
      mv.frustumCulled = false;
      grupo.add(mv);
    }

    let contorno = null;
    if (opts.contorno !== false) {
      contorno = new THREE.SkinnedMesh(g.contorno, Art.mats.contornoPiel);
      contorno.bind(esq, new THREE.Matrix4());
      contorno.frustumCulled = false;
      contorno.renderOrder = 2;   // despues del color: ver Art.mats.contorno
      grupo.add(contorno);
    }

    const esc = (F.escala || 1) * (opts.escala || 1);
    grupo.scale.setScalar(esc);

    return {
      tipo: tipo, ficha: F, grupo: grupo, piel: piel, contorno: contorno, manos: manos,
      huesos: bones, esqueleto: esq, escala: esc, alto: Chars.ALTO * esc
    };
  };

  /* LA ROPA DE LA TIENDA (tienda.js). La mascara y el traje van fundidos en
     la malla del personaje, asi que cada combinacion es un tipo mas, con su
     malla cacheada como los demas: 'grunt|agent|agent1_mask' es el grunt con
     el traje de agente y las Agent Shades. Todo lo demas -nombre, escala,
     colores, ficha del SWF- es el del tipo de base. */
  /* 'at' es un atuendo con las ranuras del SWF (Prendas.RANURAS: traje,
     shirt, mask, hat, mouth): las que trae cambian las del tipo de base
     (null = nada) y las que no, se quedan como estan -el agente sigue con
     su traje y sus gafas aunque le toque un chaleco-. La clave lleva las
     cinco: 'grunt|agent|armor1|agent1_mask|hat1|' es el grunt con el traje
     de agente, un chaleco, las Agent Shades y la gorra. */
  Chars.vestido = function (base, at) {
    base = Chars.base(base);
    const B0 = Chars.TIPOS[base], F = {};
    for (const r of Prendas.RANURAS) {
      const c = Prendas.CAMPO[r];
      F[c] = at && r in at ? (at[r] || null) : (B0[c] || null);
    }
    if (Prendas.RANURAS.every((r) => F[Prendas.CAMPO[r]] === (B0[Prendas.CAMPO[r]] || null))) return base;
    const k = base + '|' + Prendas.RANURAS.map((r) => F[Prendas.CAMPO[r]] || '').join('|');
    if (!Chars.TIPOS[k]) Chars.TIPOS[k] = Object.assign({}, B0, F, { base: base });
    return k;
  };
  Chars.base = (tipo) => (Chars.TIPOS[tipo] && Chars.TIPOS[tipo].base) || tipo;

  /* LAS MALLAS DE LOS VESTIDOS, POR ADELANTADO. Cada combinacion es un
     tipo con su malla, y armarla lleva su tiempo: la oleada pide las suyas
     al montarse y se van armando de a una por cuadro, antes de que salga
     el primero (Game llama a Chars.precalentar). */
  const _pend = [];
  Chars.encargar = function (tipos) {
    for (const t of tipos) if (!_geos[t] && _pend.indexOf(t) < 0) _pend.push(t);
  };
  Chars.precalentar = function () {
    while (_pend.length) {
      const t = _pend.shift();
      if (!_geos[t] && Chars.TIPOS[t]) { geoDe(t); return true; }
    }
    return false;
  };

  Chars.limpiar = function () {
    for (const k in _geos) {
      _geos[k].color.dispose();
      _geos[k].contorno.dispose();
      if (_geos[k].manos) _geos[k].manos.dispose();
      if (_geos[k].acc) _geos[k].acc.dispose();
      if (_geos[k].vidrio) _geos[k].vidrio.dispose();
      delete _geos[k];
    }
  };

  global.Chars = Chars;
})(window);

