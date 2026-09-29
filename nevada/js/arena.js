/* =============================================================
   arena.js -> El escenario.

   Una arena de Madness no es un nivel, es un DECORADO: un pasillo
   de hormigon sucio visto de lado, con la pared del fondo llena
   de salpicaduras de tinta y un par de cosas delante que dan
   profundidad. El jugador se mueve en linea recta; no hay que
   modelar nada que no se vea.

   Por eso todo el decorado estatico cabe en UNA malla. Suelo,
   paredes, vigas, cajas, barriles, palets y barandilla se acumulan
   en un solo buffer con color por vertice y salen de una sola
   llamada. Lo unico que va aparte son las manchas -que necesitan
   transparencia- y el telon del fondo.

   Traducido a un Adreno 610: el escenario entero cuesta tres
   llamadas y unos 4.000 triangulos. El presupuesto se lo quedan
   los personajes y la sangre, que es donde se nota.
   ============================================================= */
(function (global) {
  'use strict';

  const C = Art.C;
  const Arena = {};

  Arena.LARGO = 44;        // se camina de -22 a +22
  /* EL TECHO SE VE, Y ES UNA LOSA LISA.

     Aqui han pasado dos cosas seguidas y las dos estaban mal.

     Primero habia techo con vigas de 6,4 m de fondo, un tirante
     inclinado colgando de cada una y los fluorescentes con cuatro
     colgadores. Desde una camara que esta a veinte metros y casi a
     la altura del suelo, todo eso se proyecta unas piezas encima
     de otras: quedaba un revoltijo de trapecios grises que no se
     leia como nada.

     Despues subi la pared a 7,6 para que el techo se saliera del
     encuadre, como en la arena del SWF. Pero eso es la solucion de
     Flash a un problema que aqui no existe: alli la camara es un
     recorte plano y no hay techo que dibujar. Aqui la sala es una
     sala y se ve.

     Asi que el techo se ve, a 5,2, y es lo que tiene que ser en
     Madness: una losa PLANA. Sin vigas, sin tirantes y sin luces
     -comprobado sobre la arena del SWF contando tonos distintos
     por filas en la franja alta: de y=300 a y=460 salen entre 5 y
     16 colores, todos alrededor del gris 88; es superficie lisa y
     nada mas-.

     Y la nave sigue siendo baja a proposito. La camara encuadra
     poco mas de cuatro metros y medio de alto, asi que un
     personaje de 1,70 ocupa un tercio largo de la pantalla, que es
     como se ve Project Nexus. Con siete metros de nave, media
     imagen era aire. */
  Arena.ALTO = 5.2;
  Arena.FONDO = -2.6;      // donde esta la pared
  Arena.FRENTE = 3.4;      // el borde delantero de la zona de pelea
  Arena.PLANO = 0;         // la z de referencia: de donde salen y a donde entran

  /* ---------------- LA BANDA DONDE SE PELEA ----------------

     Hasta ahora esto era una LINEA: todo el mundo vivia en z = 0 y
     el juego iba de izquierda a derecha. En Project Nexus 2 no: la
     arena es una habitacion y se anda por ella, hacia el fondo y
     hacia la camara.

     Medido sobre el video: los cercos que el juego pinta en el
     suelo son circulos, y con la camara picada se ven como elipses
     de 0,442 de relacion alto/ancho. Eso da el angulo de la camara
     -asin(0,442) = 26 grados- y confirma que el suelo es un plano
     de verdad por el que se camina.

     Y era una PARED INVISIBLE, porque el suelo seguia doce metros
     mas alla del tope: se andaba hacia la camara, se paraba uno en
     medio de la nada y no habia nada que explicara por que.

     Ahora la banda llega hasta donde llega la sala. Por detras,
     -2,05 es el limite de verdad: la cara del zocalo esta en
     -2,30 y el personaje mide 0,32 de radio, asi que ahi ya toca
     el muro. Y por delante, +5,6.

     Eso son 7,65 m de fondo contra los 5,0 de antes: un 53% mas de
     suelo que pisar, y el tope de delante cae ya fuera de lo que
     se ve comodo, asi que se nota como "se acabo la sala" y no
     como un cristal en medio del aire. */
  Arena.Z_ATRAS = -2.05;
  /* Y por delante, hasta donde la camara deja ver el suelo. Con el
     picado de 19 grados, la camara a 4,86 m de alto y medio angulo
     de 23, el borde de abajo del cuadro corta el suelo a
     4,86/tan(42) = 5,40 m por delante de la camara, que esta fija
     en z = 12,95. O sea que el suelo se acaba en pantalla a z =
     7,55, y el tope se pone 0,35 m por dentro: se llega andando
     hasta donde se ve el filo del suelo y ahi ya no hay sala. */
  Arena.Z_FRENTE = 7.2;

  /* ---------------- HASTA DONDE LLEGA EL DECORADO ----------------

     Aqui estaba el vacio negro de abajo y de los lados, y no era
     un fallo de dibujo: era que el decorado se quedaba corto.

     La camara no esta a dos metros de la pelea. Su distancia sale
     de encuadrar 9,5 m de alto con el campo que toque:

       camZ = (9,5/2) / tan(fov/2)

     y con el fov entre 20 y 34 grados eso son entre 15,5 y 27
     metros. O sea que la camara esta LEJISIMOS, y entre ella y la
     arena habia aire: el suelo terminaba en z = +3,6 y a partir de
     ahi, negro.

     Cuanto hace falta, medido: con la camara en (0, 2,55, camZ)
     mirando a 1,93 de alto, el rayo de abajo del encuadre baja
     unos 17 grados y toca el suelo a

       z = camZ - 2,55/tan(17 grados) ~ camZ - 8,4

     que en el peor caso -fov 20, camZ 27- son 18,6 metros por
     delante del plano de pelea. Y el rayo de arriba corta la
     altura del techo a z = camZ - 17,4, o sea 9,6.

     Asi que suelo, techo y paredes de los extremos se alargan
     hasta z = +19. No cuesta un triangulo mas -son las mismas
     cajas, solo mas hondas- y tapa los tres vacios de una vez: el
     de abajo, el de arriba y el de los lados (un rayo que se va
     por fuera de la pared del extremo la cruza a z = +5,8, asi que
     alargarla tambien la tapa).

     PERO NO HACE FALTA TANTO. Estaba en 19, y 19 es el doble de lo
     que se ve: el borde de abajo del cuadro corta el suelo a

       camara_z - altura_camara / tan(picado + medio angulo)

     que con esta camara -altura 4,83, picado 15 grados, medio
     angulo 23- son 6,18 m por delante de la camara, y la camara
     nunca pasa de z = 14,5 + 0,72*Z_FRENTE. O sea que con 13,5
     sobra, y los cinco metros y medio que se quitan son suelo que
     el jugador veia irse hacia el infinito sin que la sala
     acabara nunca.

     El numero que manda no es el del suelo sino el del TECHO, que
     es el que se queda corto antes: el rayo de arriba sale a
     (medio angulo - picado) = 4 grados sobre la horizontal y sube
     los 0,34 m que separan la camara del techo en 4,86 m, asi que
     el techo tiene que llegar a camara_z - 4,86 = 8,09. El suelo,
     con 7,55, va mas sobrado.

     Con 8,2 los dos estan cubiertos y la sala mide 10,25 m de
     fondo contra los 21,6 de hace dos versiones: menos de la
     mitad. Y como el tope de juego esta en 7,2, solo queda un
     metro de suelo que no se pisa, que es el que se ve irse por el
     borde de abajo del cuadro. La pared invisible esta ahora
     justo donde el suelo se acaba de ver, que es lo unico que
     tiene sentido. */
  Arena.VISTA = 8.2;

  /* Las cinco puertas: donde va cada una. Vive fuera de construir()
     porque el zocalo necesita saber donde estan para cortarse. */
  /* Las dos del fondo van ARRIMADAS A SU ESQUINA, no a medio
     camino: asi cada una queda cerca de la puerta del extremo que
     tiene al lado y las dos parejas hacen esquina, que es como
     estan repartidas en la arena del original. Estaban en +-12,5,
     o sea en mitad de la pared, y con la sala mas honda se veian
     sueltas en medio del muro. */
  const DEF_PUERTAS = [
    { x: 0,     dir: 'fondo', tienda: true },   // la 0: tienda y entrada
    { x: -17.6, dir: 'fondo' },                 // la 2
    { x:  17.6, dir: 'fondo' },                 // la 3
    { x: -21.5, dir: 'izq' },                   // la 4
    { x:  21.5, dir: 'der' }                    // la 1
  ];

  /* Y las de los extremos, centradas en LA ZONA DE JUEGO, no en la
     pared entera. La pared lateral se alargo hasta z = +19 para
     tapar el vacio, asi que su centro geometrico se fue a +8: la
     puerta, que seguia en -0,4, quedaba pegada al rincon del fondo.
     La banda por la que se pelea va de -1,7 a +3,3, y su centro es
     +0,8. */
  /* Centrada en la sala de verdad: la banda jugable va de -2,05 a
     +5,6, cuyo centro es 1,78. Estaba en 0,8, que era el centro de
     la banda de cinco metros de antes. */
  const Z_PUERTA_LADO = 1.75;

  Arena.construir = function (opts) {
    opts = opts || {};
    const rng = U.makeRNG(opts.semilla || 0x4152454e);
    const grupo = new THREE.Group();
    const B = U.builder();
    const L = Arena.LARGO / 2;

    /* ---------------- Suelo ----------------
       Losas de 4 m con la junta marcada, alternando dos tonos casi
       iguales. Lo justo para que el ojo tenga a que agarrarse
       cuando el jugador corre; sin eso parece que esta quieto
       sobre una cinta. */
    const F_HOND = Arena.VISTA - Arena.FONDO;      // fondo del suelo
    const F_CENT = (Arena.FONDO + Arena.VISTA) / 2;
    /* EL SUELO ES UNA LOSA LISA, PERO NO UN COLOR PLANO.

       Eran losas de 4 m alternando dos tonos, con la junta marcada
       en negro. El argumento era dar al ojo algo a lo que agarrarse
       mientras el jugador corre, y con la camara de lado valia:
       las juntas pasaban de largo y se leia la velocidad.

       Con la camara picada no. Ahora el suelo ocupa dos tercios de
       la pantalla y esas juntas se ven como una rejilla de lineas
       negras que cruzan la arena entera, que no es lo que hay en
       Project Nexus: alli el suelo es hormigon liso.

       Pero liso no es plano. Quitadas las juntas se quedaba en dos
       tercios de gris muerto, y el hormigon del video tiene una
       variacion de mas menos el 25% en manchas grandes y difusas
       -medido: mediana 96, percentiles 68 y 120, desviacion 15,6-.
       Eso lo pone Art.texSuelo.

       Va en su propia malla porque lleva textura y el resto del
       decorado va con color por vertice. Una llamada de dibujo
       mas, y es la superficie mas grande de la escena. */
    /* Se repite cada 7 metros: mas corto y se ve el patron, mas
       largo y la mancha se estira hasta no notarse. Como el suelo
       es lo unico que usa esta textura, el repeat se le pone aqui
       en vez de dentro de Art. */
    const texSuelo = Art.texSuelo();
    texSuelo.repeat.set(Arena.LARGO / 7, F_HOND / 7);
    const sueloM = new THREE.Mesh(
      new THREE.PlaneGeometry(Arena.LARGO, F_HOND),
      new THREE.MeshBasicMaterial({ map: texSuelo })
    );
    sueloM.rotation.x = -Math.PI / 2;
    sueloM.position.set(0, 0, F_CENT);
    sueloM.frustumCulled = false;
    grupo.add(sueloM);
    /* Y el canto, para que el suelo tenga grosor por los lados. */
    B.addBox(Arena.LARGO, 0.30, F_HOND, 0, -0.15, F_CENT, C.suelo, { skip: 'UD' });

    /* ---------------- Pared del fondo ----------------

       EL VANO ES UN AGUJERO DE VERDAD EN EL MURO, y eso no es un
       detalle: es lo que permite que la puerta funcione.

       En el SWF la hoja sube dentro de una MASCARA. Aqui no hay
       mascaras, pero hay algo mejor: profundidad. Si el hueco es un
       agujero real y la hoja va POR DETRAS de la cara del muro, el
       propio muro la tapa al subir. Nada de recortar el dibujo ni
       de manosear las UV -que era lo que hacia que la calavera se
       fuera comiendo en vez de subir-: la hoja sube ENTERA, rigida,
       y desaparece detras del dintel porque el dintel esta delante.

       Asi que el muro, el zocalo y las cenefas se trocean saltando
       las cinco franjas de puerta, y encima de cada una se pone su
       DINTEL -el trozo de muro que va del alto de la puerta al
       techo-. */
    const HUECOS = DEF_PUERTAS.filter((d) => d.dir === 'fondo').map((d) => {
      const an = Arena.P_ALTO / Art.aspectoPuerta(d.tienda ? 'armeria' : 'normal');
      return [d.x - an / 2, d.x + an / 2, an, d.x];
    }).sort((a, b) => a[0] - b[0]);

    /* Una banda horizontal del muro, partida en los huecos. 'hasta'
       es el margen extra a cada lado del hueco (las molduras se
       paran antes que el muro). */
    function banda(alto, y, z, fondo, color, opts, margen) {
      const m = margen || 0;
      let x = -L;
      for (let i = 0; i <= HUECOS.length; i++) {
        const fin = i < HUECOS.length ? HUECOS[i][0] - m : L;
        if (fin > x + 0.02) B.addBox(fin - x, alto, fondo, (x + fin) / 2, y, z, color, opts);
        if (i < HUECOS.length) x = HUECOS[i][1] + m;
      }
    }

    /* EL ZOCALO DEL SUELO TAMBIEN SE CORTA.

       Aqui estaba el "marco de abajo que tapa las franjas". Era
       esta tira: 24 cm de alto, negra, de un extremo al otro de la
       arena y en FONDO+0,15 = -2,45. La hoja de la puerta esta en
       -2,44. O sea que la tira pasaba UN CENTIMETRO POR DELANTE de
       la parte baja de las cinco puertas y les comia justo la
       franja de rayas inclinadas. No era un marco: era el rodapie
       del suelo cruzando por donde no debia. Se parte igual que el
       resto de las bandas. */
    /* Y SU CARA NO PUEDE CAER DONDE LA DEL MURO ALTO.

       Aqui estaba la linea que parpadeaba en la parte baja de la
       pared, y era z-fighting de manual: el zocalo iba en
       FONDO+0,15 con 0,30 de fondo, o sea con la cara en z = -2,30;
       y la banda de muro alto -FONDO+0,02 con 0,56- tiene la suya
       en z = -2,30 tambien. Dos quads del mismo color en el mismo
       plano y en la misma franja de altura, y la tarjeta se juega a
       cara o cruz cual pinta en cada fragmento; de ahi el temblor.

       Con 0,32 de fondo la cara se va a -2,28: dos centimetros por
       delante del muro alto y dos por detras de la cenefa. Nadie
       comparte plano con nadie. */
    banda(0.24, 0.12, Arena.FONDO + 0.16, 0.32, 0x252525, {}, 0);

    /* El muro, de suelo a techo, con los cinco agujeros. */
    banda(Arena.ALTO, Arena.ALTO / 2, Arena.FONDO, 0.5, C.muro, { skip: 'B' });
    /* Y el dintel de cada uno: del alto de la puerta al techo. */
    for (const h of HUECOS) {
      /* skip 'BLR', y el motivo importa: el muro se corta JUSTO en
         h[0] y h[1], asi que su cara derecha y la cara izquierda
         del dintel caian en el mismo plano y en el mismo tramo de
         altura. Dos quads identicos compitiendo por el mismo
         fragmento es exactamente el parpadeo que se veia en la
         pared. El dintel no necesita costados -esta empotrado
         entre dos trozos de muro-, asi que se quitan y el conflicto
         desaparece sin mover nada de sitio. */
      B.addBox(h[2], Arena.ALTO - Arena.P_ALTO, 0.5,
               h[3], (Arena.ALTO + Arena.P_ALTO) / 2, Arena.FONDO,
               C.muro, { skip: 'BLR' });
    }
    /* Las juntas verticales de los paneles, saltando los huecos. */
    for (let x = -L; x < L; x += 5) {
      let dentro = false;
      for (const h of HUECOS) if (x > h[0] - 0.1 && x < h[1] + 0.1) dentro = true;
      if (dentro) continue;
      B.addBox(0.10, Arena.ALTO, 0.54, x, Arena.ALTO / 2, Arena.FONDO + 0.01,
               0x1e1e1e, { luz: false });
    }
    /* El zocalo y la cenefa baja se paran en la jamba, con 16 cm de
       holgura: una moldura no cruza por delante de una puerta. */
    banda(1.5,  0.75, Arena.FONDO + 0.02, 0.56, C.muroAlt, {}, 0.16);
    banda(0.10, 1.52, Arena.FONDO + 0.04, 0.60, 0x1a1a1a, { luz: false }, 0.16);
    /* La de arriba no se corta: va a 4,30 y las puertas llegan a
       2,30, asi que no se tocan. */
    B.addBox(Arena.LARGO, 0.14, 0.60, 0, 4.30, Arena.FONDO + 0.04, 0x1a1a1a, { luz: false });

    /* ---------------- Paredes de los extremos ----------------

       No estaban. La arena terminaba en el aire: llegabas al tope
       y por detras de la puerta lateral se veia el vacio.

       En el SWF hay pared ahi -setDoorDir(0,1,'right') y
       setDoorDir(0,4,'left') cuelgan sus puertas de ALGO-, y en la
       captura de la sala real se ve perfectamente el muro del
       extremo derecho en escorzo, con su propia puerta de calavera
       encima.

       Se monta igual que el fondo, girado 90 grados: muro de suelo
       a techo partido en el hueco de la puerta, dintel encima,
       zocalo, las dos cenefas y el rodapie. La unica diferencia es
       que las bandas se parten en Z en vez de en X.

       Las caras que miran hacia AFUERA de la arena no se generan:
       no hay cerradura del mundo que las enseñe y son 60 quads. */
    const LZ0 = Arena.FONDO - 0.25;   // el muro lateral muere contra el del fondo
    const LZ1 = Arena.VISTA;          // y llega hasta donde alcanza la camara
    for (const d of DEF_PUERTAS) {
      if (d.dir === 'fondo') continue;
      /* 'hacia' es el sentido que mira hacia dentro de la arena.
         La cara interior del muro va 9 cm por delante del plano de
         la hoja, que es el mismo retranqueo que tienen las tres del
         fondo: es lo que deja que el dintel tape la hoja al subir. */
      const hacia = d.dir === 'der' ? -1 : 1;
      const xCara = d.x + hacia * 0.09;
      const xMuro = xCara - hacia * 0.25;            // centro de un muro de 0,50
      const fuera = d.dir === 'der' ? 'R' : 'L';     // la cara que nunca se ve
      const anP = Arena.P_ALTO / Art.aspectoPuerta('normal');
      const zA = Z_PUERTA_LADO - anP / 2, zB = Z_PUERTA_LADO + anP / 2;

      /* Una banda del muro lateral, partida en el hueco. Misma
         idea que banda(), pero recorriendo Z. */
      function bandaLat(alto, y, xc, grosor, color, opts, margen) {
        const m = margen || 0;
        const t1 = (zA - m) - LZ0;
        if (t1 > 0.02) B.addBox(grosor, alto, t1, xc, y, (LZ0 + zA - m) / 2, color, opts);
        const t2 = LZ1 - (zB + m);
        if (t2 > 0.02) B.addBox(grosor, alto, t2, xc, y, (zB + m + LZ1) / 2, color, opts);
      }

      bandaLat(Arena.ALTO, Arena.ALTO / 2, xMuro, 0.5, C.muro, { skip: fuera }, 0);
      /* El dintel, sin las caras de delante y de atras: son las que
         compartia plano con el muro y las que hacian el parpadeo. */
      B.addBox(0.5, Arena.ALTO - Arena.P_ALTO, anP,
               xMuro, (Arena.ALTO + Arena.P_ALTO) / 2, Z_PUERTA_LADO,
               C.muro, { skip: fuera + 'FB' });
      /* Juntas verticales de los paneles, saltando el hueco. */
      for (let z = LZ0 + 2.4; z < LZ1; z += 2.4) {
        if (z > zA - 0.1 && z < zB + 0.1) continue;
        B.addBox(0.54, Arena.ALTO, 0.10, xCara - hacia * 0.26, Arena.ALTO / 2, z,
                 0x1e1e1e, { luz: false });
      }
      /* MISMO Z-FIGHTING QUE EN EL MURO DEL FONDO, y estaba solo
         arreglado alli. Aqui el zocalo tenia su cara interior en
         xCara + hacia*0,05 y la banda de muro alto TAMBIEN
         -xMuro + hacia*0,02 con 0,56 de grosor da xCara +
         hacia*0,05 clavado-, asi que la linea de abajo temblaba
         igual en las dos paredes de los extremos. Con 0,32 de
         grosor y el centro en xCara - hacia*0,09 la cara se va a
         xCara + hacia*0,07: dos centimetros por delante del muro
         alto y dos por detras de la cenefa, como en el fondo. */
      bandaLat(0.24, 0.12, xCara - hacia * 0.09, 0.32, 0x252525, { skip: fuera }, 0);
      bandaLat(1.5,  0.75, xMuro + hacia * 0.02, 0.56, C.muroAlt, { skip: fuera }, 0.16);
      bandaLat(0.10, 1.52, xMuro + hacia * 0.04, 0.60, 0x1a1a1a, { luz: false, skip: fuera }, 0.16);
      /* La cenefa alta va a 4,30 y la puerta llega a 2,30: no se
         tocan, asi que esta no se corta. */
      B.addBox(0.60, 0.14, LZ1 - LZ0, xMuro + hacia * 0.04, 4.30, (LZ0 + LZ1) / 2,
               0x1a1a1a, { luz: false, skip: fuera });
    }

    /* ---------------- Techo ----------------

       Lo que habia aqui no se entendia, y con razon: eran vigas de
       6,4 m de fondo con un TIRANTE INCLINADO colgando de cada
       una, mas los fluorescentes suspendidos con cuatro
       colgadores. Vistas desde una camara que esta casi a la
       altura del suelo y a veinte metros, todas esas piezas se
       proyectan unas encima de otras y lo que queda es un revoltijo
       de trapecios grises. No se leia como un techo porque no
       parecia nada.

       En el SWF, la arena NO TIENE TECHO A LA VISTA: la pared del
       fondo sube y el encuadre la corta. Lo unico que cuelga ahi
       arriba es una CAJA DE VENTILACION adosada a la pared, y se
       entiende a la primera.

       Asi que aqui: una losa lisa y oscura, los fluorescentes
       EMPOTRADOS en ella -no colgando-, y la caja de ventilacion
       del original. Tres formas, todas horizontales, todas
       legibles. */
    /* PLANO Y MEDIDO CONTRA LA PARED.

       Con sombreado se lleva el coeficiente mas bajo de todos -la
       cara que se ve es la de ABAJO y la luz viene de arriba-, asi
       que salia a 24 de 255, y un techo de 24 sobre una pared de
       42 no se lee como techo: se lee como el agujero que habia
       antes. Sin sombreado, el color sale tal cual, y la pared -ya
       medida- sale a 42. En 32 queda claramente por debajo de ella
       pero es una superficie y no un vacio. */
    B.addBox(Arena.LARGO, 0.5, F_HOND, 0, Arena.ALTO + 0.25, F_CENT, 0x202020,
             { luz: false });
    /* Y la moldura donde el techo apoya en la pared: sin esa
       linea, techo y pared se funden por arriba y no se sabe donde
       acaba uno.

       Y ES UNA MOLDURA, no una losa. Le puse de fondo F_HOND -los
       21,6 m del techo- copiando la linea de arriba sin pensar, y
       lo que salio fue un segundo techo 7 cm mas bajo y de color
       0x14: vista desde abajo, su cara inferior de 44 x 21,6
       tapaba el techo de verdad. Eso era la franja casi negra que
       se veia arriba. Medido: salia a 20 de 255, que es
       exactamente 0x14. */
    B.addBox(Arena.LARGO, 0.09, 0.10, 0, Arena.ALTO - 0.045, Arena.FONDO + 0.29,
             0x141414, { luz: false });

    /* NO HAY FLUORESCENTES.

       Habia una fila de tubos con su cajetin cada 8 m. Eran lo
       unico claro de toda la arena y por eso mandaban en la
       composicion, que era justo el argumento para ponerlos. Pero
       en Madness no hay luces en el techo, y ahora que la pared
       sube por encima del encuadre no habria donde colgarlos: lo
       que se ve arriba es pared, como en el original.

    */

    /* ---------------- La caja de ventilacion ----------------

       Lo unico que hay en lo alto de la arena del SWF, y lo que le
       da escala a la pared. Medida sobre la captura, con la puerta
       de la tienda como regla (2,226 x 2,30):

         caja     2,05 anchos x 0,59 altos  ->  4,56 x 1,35 m
         rejilla  0,80 anchos x 0,46 altos  ->  1,77 x 1,06 m,
                  pegada al extremo derecho de la caja
         ranuras  dos columnas de cinco
         y a media altura de la caja, una junta con cuatro remaches

       Y DETRAS DE LA REJILLA HAY UN VENTILADOR.

       Las formas claras que se ven dentro de las ranuras no son
       reflejos en las lamas: son las ASPAS. Comparando dos
       fotogramas del SWF (X8 e Y4) cambian de sitio y de angulo,
       cada ranura enseña un trozo distinto de la helice, y en uno
       de los dos hay ranuras que se quedan negras porque en ese
       momento no les toca aspa.

       Asi que la rejilla no se pinta: se construye. Un hueco
       oscuro, un ventilador de verdad girando dentro, y por
       delante la CELOSIA -seis travesaños y un montante- que deja
       ver diez ranuras. Lo que asoma por cada una sale solo, y
       cambia al girar igual que en el original.

       El ventilador va aparte de la malla estatica porque se
       mueve. Son dos en toda la arena: dos llamadas de dibujo y
       unos cuarenta triangulos. */
    /* UNA SOLA, Y EN LA ESQUINA DE ARRIBA A LA DERECHA.

       Estaban repartidas cada 21 m -o sea dos, a -11 y a +10-, que
       es lo que se hace con una lampara o una viga: algo que se
       repite porque tiene que cubrir toda la nave. Una salida de
       aire no. En el SWF hay UNA, arriba del todo, arrimada al
       rincon donde la pared del fondo se junta con la del extremo
       derecho, y precisamente por estar sola y descentrada es lo
       que le da un arriba y un abajo a la sala.

       Pegada: la pared del extremo esta en x = 21,5, asi que el
       centro de la caja va en 21,5 - 4,56/2 - 0,35. Y arriba, a
       25 cm del techo. */
    const VAN = 4.56, VAL = 1.35;
    /* Arrimada al techo, con 30 cm de aire: a 4,6 -que es donde
       estuvo mientras la pared subia a 7,6- la caja atravesaba la
       losa. */
    const VY = Arena.ALTO - VAL / 2 - 0.30;
    const VZ = Arena.FONDO + 0.30;
    Arena.ventiladores = [];
    for (let x = 21.5 - VAN / 2 - 0.35; x < L; x += 1e9) {
      const RAN = 1.77, RAL = 1.06, RX = x + VAN / 2 - RAN / 2 - 0.13;
      /* EL CUERPO VA PARTIDO EN CUATRO, con el hueco de la rejilla
         en medio. Entero era macizo -0,62 de fondo, cara delantera
         en VZ+0,31- y tapaba el ventilador y el fondo negro, que
         estan por detras: se veia la caja lisa y ni rastro de las
         aspas. Mismo problema y misma solucion que en el muro con
         los vanos de las puertas. */
      const hx0 = RX - RAN / 2, hx1 = RX + RAN / 2;
      const hy0 = VY - RAL / 2, hy1 = VY + RAL / 2;
      const bx0 = x - VAN / 2, bx1 = x + VAN / 2;
      const by0 = VY - VAL / 2, by1 = VY + VAL / 2;
      B.addBox(hx0 - bx0, VAL, 0.62, (bx0 + hx0) / 2, VY, VZ, 0x3d3d3d, { skip: 'B' });
      B.addBox(bx1 - hx1, VAL, 0.62, (hx1 + bx1) / 2, VY, VZ, 0x3d3d3d, { skip: 'B' });
      B.addBox(RAN, by1 - hy1, 0.62, RX, (hy1 + by1) / 2, VZ, 0x3d3d3d, { skip: 'B' });
      B.addBox(RAN, hy0 - by0, 0.62, RX, (by0 + hy0) / 2, VZ, 0x3d3d3d, { skip: 'B' });
      /* El canto claro de la izquierda: en la captura la caja
         sobresale de la pared y ese canto es la unica cara lateral
         que se ve. */
      B.addBox(0.05, VAL, 0.62, bx0, VY, VZ, 0x4a4a4a, { skip: 'BR' });
      /* La junta de media altura y sus cuatro remaches, en el
         faldon de la izquierda -que es donde estan en la captura-. */
      B.addBox(hx0 - bx0, 0.035, 0.02, (bx0 + hx0) / 2, VY, VZ + 0.315,
               0x1b1b1b, { luz: false });
      for (let k = 0; k < 4; k++) {
        B.addBox(0.085, 0.085, 0.02, bx0 + 0.46 + k * 0.42, VY, VZ + 0.325,
                 0x1b1b1b, { luz: false });
      }
      /* El fondo del hueco, por detras del ventilador.

         Estaba en VZ-0,08 = -2,38, y la cara del muro esta en
         FONDO+0,25 = -2,35: o sea DETRAS del muro, asi que por la
         rejilla no se veia el negro del conducto, se veia la
         pared. A VZ-0,03 = -2,33 queda 2 cm por delante del muro y
         13 por detras del ventilador. */
      B.addBox(RAN, RAL, 0.02, RX, VY, VZ - 0.03, 0x060608, { luz: false });

      /* --- El ventilador --- */
      const VB = U.builder();
      /* LAS PALAS, MIRADAS DE CERCA EN EL SWF.

         La primera version eran cuatro palitos: cajas de 52 x 15
         cm. Parecian aspas de molinillo de papel, y no es eso.

         Capturada la rejilla a escala x4 -Ruffle redibujando el
         vector- se ve lo que hay de verdad dentro de cada ranura:
         un TRAPECIO de lados rectos inclinados, ancho, y los de
         ranuras consecutivas van corridos de lado formando una
         diagonal continua. O sea que no es un palo cruzando: es
         una PALA ANCHA que BARRE EN ARCO, mas estrecha en el buje
         y mas ancha hacia la punta, y curvada hacia atras. Una
         hélice de ventilador industrial, vamos.

         Asi que la pala se construye como tal: cuatro coronas
         radiales, cada una un cuadrilatero entre dos radios, con
         el barrido angular y el ancho creciendo hacia fuera.

           r        0,13   0,28   0,43   0,56
           barrido  0,00  -0,20  -0,38  -0,52   radianes
           semianch 0,16   0,30   0,40   0,36   radianes

         Y el tono baja del buje a la punta. Eso no es un adorno:
         una pala de un solo gris se ve plana, y en la captura del
         original hay claramente dos tonos dentro de cada trapecio.
         Al girar, ese degradado es lo que hace que se lea como
         metal en vez de como una mancha blanca. */
      const R_PALA  = [0.13, 0.28, 0.43, 0.56];
      const A_PALA  = [0.00, -0.20, -0.38, -0.52];
      const W_PALA  = [0.16, 0.30, 0.40, 0.36];
      const T_PALA  = [0xcacaca, 0xb6b6b6, 0x9d9d9d, 0x868686];
      for (let a = 0; a < 4; a++) {
        const th = a * U.TAU / 4;
        for (let k = 0; k < 3; k++) {
          const r0 = R_PALA[k], r1 = R_PALA[k + 1];
          const a0 = th + A_PALA[k], a1 = th + A_PALA[k + 1];
          const w0 = W_PALA[k], w1 = W_PALA[k + 1];
          VB.addQuad(
            [r0 * Math.cos(a0 - w0), r0 * Math.sin(a0 - w0), 0],
            [r0 * Math.cos(a0 + w0), r0 * Math.sin(a0 + w0), 0],
            [r1 * Math.cos(a1 + w1), r1 * Math.sin(a1 + w1), 0],
            [r1 * Math.cos(a1 - w1), r1 * Math.sin(a1 - w1), 0],
            T_PALA[k], 1, true);
        }
      }
      VB.addCyl(0.135, 0.135, 0.05, 10, 0, 0, 0, 0x6e6e6e, {});
      /* Por las DOS caras. Las palas son cuadrilateros sueltos y
         su normal sale de como se recorran los vertices; con un
         barrido en arco, la mitad acababan de espaldas y no se
         dibujaban -de las cuatro palas solo asomaba un trozo de
         una-. Una helice se ve por los dos lados de todas formas:
         media vuelta despues la estas mirando por detras. */
      const aspas = new THREE.Mesh(VB.build(), Art.mats.planoDoble);
      aspas.position.set(RX, VY, VZ + 0.10);
      aspas.frustumCulled = false;
      grupo.add(aspas);
      /* Cada uno a su ritmo: dos ventiladores girando al unisono
         cantan a copia y pega. */
      Arena.ventiladores.push({ malla: aspas, vel: rng.range(2.1, 3.4) });

      /* --- La celosia, por delante --- */
      const MAR = 0.075;                  // el marco de fuera
      const PASO = RAL / 5;               // cinco ranuras por columna
      /* El travesaño es FINO. Medido en la captura del SWF: la
         ranura ocupa 45 px de los 57 del paso, o sea que el
         separador se queda en el 21%. Estaba en el 46% -casi mitad
         y mitad- y la rejilla parecia una persiana cerrada en vez
         de un hueco con barrotes. */
      const TRAV = PASO * 0.21;
      B.addBox(RAN, RAL + MAR * 2, 0.03, RX, VY, VZ + 0.29, 0x2f2f2f,
               { luz: false, skip: 'FB' });
      /* Marco: dos montantes y dos cabeceros. */
      B.addBox(RAN, MAR, 0.035, RX, VY + RAL / 2 + MAR / 2, VZ + 0.315, 0x2f2f2f, { luz: false });
      B.addBox(RAN, MAR, 0.035, RX, VY - RAL / 2 - MAR / 2, VZ + 0.315, 0x2f2f2f, { luz: false });
      B.addBox(MAR, RAL + MAR * 2, 0.035, RX - RAN / 2 + MAR / 2, VY, VZ + 0.315, 0x2f2f2f, { luz: false });
      B.addBox(MAR, RAL + MAR * 2, 0.035, RX + RAN / 2 - MAR / 2, VY, VZ + 0.315, 0x2f2f2f, { luz: false });
      /* El montante del medio, entre las dos columnas. */
      B.addBox(0.13, RAL, 0.035, RX, VY, VZ + 0.315, 0x151517, { luz: false });
      /* Y los travesaños entre ranuras. */
      /* Los travesaños van CASI NEGROS. En la captura, entre
         capsula y capsula lo que se ve es negro: el gris del panel
         solo asoma por el marco. Con los separadores en el mismo
         gris que el marco, la rejilla se leia como una persiana. */
      for (let f = 0; f <= 5; f++) {
        B.addBox(RAN - MAR * 2, TRAV, 0.035, RX, VY + RAL / 2 - f * PASO,
                 VZ + 0.315, 0x151517, { luz: false });
      }
      /* Los cuatro tornillos de las esquinas. */
      for (let a = 0; a < 4; a++) {
        B.addBox(0.075, 0.075, 0.02, RX + (a % 2 ? 1 : -1) * (RAN / 2 - 0.05),
                 VY + (a < 2 ? 1 : -1) * (RAL / 2 + MAR / 2), VZ + 0.335,
                 0x585858, { luz: false });
      }
    }

    /* ---------------- Puertas ----------------
       Las de antes me las invente: dos, en los extremos, con un
       marco gordo y una luz roja. Estas son las del original.

       LA SALA DE ARENA, LEIDA DEL SWF

       generateArena() en MadnessLevel monta UNA sola sala y le
       cuelga CINCO puertas:

         addRooms(gameMode, 1)
         addDoors([5], myRooms)
         setDoorDir(0, 0, 'down')    <- pared del fondo
         setDoorDir(0, 1, 'right')   <- pared del extremo derecho
         setDoorDir(0, 2, 'down')
         setDoorDir(0, 3, 'down')
         setDoorDir(0, 4, 'left')    <- pared del extremo izquierdo
         myRooms[0].myDoors[0].myConnection = storeRoster
         addStartPointDoor(0, 0)
         disableDoorSpawn(0, 0)
         addActivator('panel', 0)
         addObstacle('barrel', 0)  x2

       O sea: tres en la pared del fondo y una en cada extremo. La
       0 es la de la TIENDA -es su 'myConnection'-, es por donde
       entra el jugador y es la unica que NO suelta enemigos.

       Poniendo la de la tienda en el centro y las otras dos del
       fondo hacia los extremos sale exactamente lo que se ve
       jugando: una puerta en el centro y dos en cada extremo.

       LA PUERTA, MEDIDA EN EL SWF

       El marco -forma 4524- son 107,5 x 317,5 px, o sea 1 de ancho
       por 2,95 de alto; aqui, 0,75 x 2,21 m. Dos hojas del mismo
       dibujo con los rellenos intercambiados: #CCCCCC la clara y
       #6F6F6F la oscura, con #A6A6A6 en medio y contorno negro de
       1 px.

       Y abajo, CINCO BLOQUES GRISES de 21,3 x 20 px a paso de 22,
       pegados al suelo -el 6% de abajo de la hoja-. Son los
       "cuadrados cortados grises en la parte de abajo" que se ven
       en cualquier puerta de Madness.

       LA LUZ DEL CERROJO

       Esta es la parte buena. 'myLock' tiene dos fotogramas y
       dentro un 'lockLight' que es una animacion de cinco formas;
       el codigo hace gotoAndStop(_totalframes), o sea siempre la
       ultima:

         myLock.gotoAndStop(1) -> lockLight 4540, fotograma 5 = forma 4539
         myLock.gotoAndStop(2) -> lockLight 4541, fotograma 5 = forma 4535

       y 4541 es la misma animacion AL REVES. Leidos los rellenos:

         forma 4535  #00FF00 / #99FF80 / #006600   VERDE
         forma 4537  #B2802B / #CCC081 / #3B3301   ambar (el medio)
         forma 4539  #FF0000 / #FE8181 / #760101   ROJO

       Y el codigo que elige: rojo si amLocked o roomLock, verde si
       la puerta tiene conexion y no esta cerrada. Ni mas ni menos
       que lo que se ve: redonda, encima de la puerta, roja cerrada
       y verde cuando se puede abrir.

       La luz es de 11,8 x 14,8 px, el 11% del ancho de la puerta:
       a escala exacta serian 8 cm y no se veria en un movil. Va a
       0,22 m, que es lo justo para que se lea desde el otro lado
       de la arena. Es la unica medida de aqui que no es la del
       original, y es a proposito. */
    Arena.puertas = [];
    /* DENTRO DEL MURO. Su cara delantera esta en FONDO+0,25; la
       hoja va 9 cm por detras, que es lo que deja que el dintel la
       tape al subir y ademas le da el retranqueo que tienen las
       puertas de la captura. */
    const zP = Arena.FONDO + 0.16;
    DEF_PUERTAS.forEach((d) => {
      const p = Arena.puerta(d, zP);
      grupo.add(p.grupo);
      Arena.puertas.push(p);
    });

    /* ---------------- EL PANEL DE ARRANQUE ----------------

       addActivator('panel', 0). Estaba puesto de adorno, en la
       pared de la izquierda y a la altura del pecho, porque me lo
       invente. En el original esta A LA DERECHA DE LA PUERTA POR
       LA QUE ENTRA EL JUGADOR -la de la ARMORY, la del centro- y
       es lo que arranca cada ronda. El propio juego lo dice con
       todas las letras:

         "Activate this panel with your SPACE bar to get that
          door open."

       MEDIDO sobre la arena del SWF corriendo en Ruffle, y la
       regla es EL PERSONAJE, no la puerta.

       La primera vez lo medi contra la base de la puerta de la
       tienda y salio 22 cm mas bajo: el cartel quedaba a la altura
       de la cadera, casi tocando el suelo. La puerta es mala regla
       -no se sabe si lo que se ve abajo es su canto, su marco o el
       zocalo del muro-; el muñeco no tiene esa duda, mide 1,70 y
       se le ven los pies.

       Sobre la captura a x4, con el jugador al lado del panel:

         muñeco       263 px de la coronilla a la suela
         cartel       base a 97 px del suelo (0,369 de su altura)
                      tope a 228 px          (0,867)
         boton        base a 115 px          (0,437)
                      tope a 202 px          (0,768)

       o sea, a escala:

         cartel   0,80 x 0,85 m, centro a 1,05 m del suelo
         boton    0,44 x 0,56 m, centro a 1,02 m

       Que es donde se pone un pulsador de verdad: a la altura de
       la mano, no de la rodilla.

       El cartel es el del juego, recortado del vector; el boton se
       rehace aqui en tres dimensiones porque en la captura sale de
       la pared en escorzo y pintarlo plano con esa perspectiva
       dentro quedaria torcido en cuanto la camara se mueve.

       Colores, leidos de la captura:
         cuerpo  #4A4A4A     canto   #595959
         hueco   negro       luz     #4CE746 */
    const pan = { x: 2.22, bx: 2.89, y: 1.05, by: 1.02 };
    /* La cara del zocalo esta en FONDO+0,30; el cartel se pega ahi
       con medio centimetro de aire para no pelearse con ella. */
    const zPan = Arena.FONDO + 0.305;
    /* 0,85 m de alto, medido contra el muñeco; el ancho sale de la
       proporcion del sprite 3792 y el giro, de su matriz en el SWF. */
    const cartelIni = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85 / Art.CARTEL_INICIO.aspecto, 0.85),
      new THREE.MeshBasicMaterial({ map: Art.texCartelInicio(), transparent: true })
    );
    cartelIni.position.set(pan.x, pan.y, zPan);
    cartelIni.rotation.z = Art.CARTEL_INICIO.giro;
    grupo.add(cartelIni);

    /* El boton: marco negro, cuerpo gris y un canto claro a la
       izquierda, que es lo que le da el relieve. Todo esto es
       estatico y se va con el resto del decorado. */
    /* EL ORDEN EN Z, QUE AQUI NO ES UN DETALLE.

       Las cuatro piezas salen de la MISMA cara de pared, asi que
       lo unico que decide cual se ve es cuanto sobresale cada una.
       La primera version tenia el marco negro mas adelantado que
       el cuerpo -0,12 de fondo contra 0,10- y el resultado era un
       rectangulo negro: el marco tapaba el boton entero. Medido en
       pantalla, todo el boton salia a 10 de 255.

       De atras hacia adelante, contando desde la cara de la pared:

         marco negro   0,48 x 0,66   hasta  0,090
         cuerpo gris   0,44 x 0,62   hasta  0,100   <- 1 cm delante
         hueco negro   0,30 x 0,46   hasta  0,105
         la luz                      a      0,112

       Asi el marco solo asoma por los lados -2 cm de reborde- que
       es exactamente lo que hace en la captura. */
    const BF = 0.100;
    B.addBox(0.48, 0.60, 0.090, pan.bx, pan.by, zPan + 0.045,
             0x0a0a0a, { skip: 'B' });
    B.addBox(0.44, 0.56, BF, pan.bx, pan.by, zPan + BF / 2,
             0x4a4a4a, { skip: 'B' });
    /* El canto claro del lado izquierdo: es lo que da el relieve.
       En la captura el boton se ve de tres cuartos y ese canto es
       la unica cara lateral iluminada. */
    B.addBox(0.035, 0.56, BF, pan.bx - 0.2025, pan.by, zPan + BF / 2,
             0x595959, { skip: 'BR' });
    /* El hueco negro donde vive la luz. */
    B.addBox(0.30, 0.415, 0.02, pan.bx, pan.by, zPan + 0.095,
             0x000000, { luz: false, skip: 'B' });

    /* Y la luz, que SI cambia: va aparte, en su propio nodo. */
    const zLuz = zPan + 0.112;
    /* El resplandor sobre el fondo del hueco. Va flojo a proposito:
       en la captura el verde tiñe el hueco, no lo inunda. */
    const matHalo = new THREE.MeshBasicMaterial({
      map: Art.texMancha(), color: LUZ_PANEL,
      transparent: true, opacity: 0.34, depthWrite: false
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.31), matHalo);
    halo.position.set(pan.bx, pan.by, zLuz);
    halo.renderOrder = 2;
    grupo.add(halo);
    /* El aro negro. En la captura la bombilla no flota sobre el
       resplandor: tiene un borde duro que la recorta, y sin el
       parecia una mancha verde en vez de un piloto. */
    const aro = new THREE.Mesh(
      new THREE.CircleGeometry(0.100, 16),
      new THREE.MeshBasicMaterial({ color: 0x050505 })
    );
    aro.position.set(pan.bx, pan.by, zLuz + 0.003);
    aro.renderOrder = 3;
    grupo.add(aro);
    /* La bombilla: 0,082 de radio sobre un boton de 0,44 de ancho,
       o sea el 37% del ancho, que es lo que mide en la captura. */
    const bombilla = new THREE.Mesh(
      new THREE.CircleGeometry(0.082, 16),
      new THREE.MeshBasicMaterial({ color: LUZ_PANEL })
    );
    bombilla.position.set(pan.bx, pan.by, zLuz + 0.005);
    bombilla.renderOrder = 4;
    grupo.add(bombilla);
    /* El reflejito de arriba a la izquierda. Cuesta ocho
       triangulos y es lo que hace que parezca una bombilla y no un
       circulo pintado. */
    const brillo = new THREE.Mesh(
      new THREE.CircleGeometry(0.019, 8),
      new THREE.MeshBasicMaterial({ color: 0xeaffe4 })
    );
    brillo.position.set(pan.bx - 0.024, pan.by + 0.026, zLuz + 0.007);
    brillo.renderOrder = 5;
    grupo.add(brillo);

    Arena.panel = {
      x: pan.bx, y: pan.by, z: zPan,
      luz: bombilla, halo: halo, brillo: brillo,
      activo: false, t: 0
    };

    const VETO = HUECOS.map((h) => [h[0] - 0.7, h[1] + 0.7]);
    /* Y SOLO TAPA LA PUERTA LO QUE ESTA PEGADO A ELLA.

       Era solo por la x, de cuando los barriles se arrimaban al
       fondo: con los bidones ya en el centro de la sala, un bidon a
       cinco metros de la pared no tapa nada y aun asi se
       descartaba, y por eso faltaba uno de los seis. Ahora tambien
       cuenta la profundidad: a mas de metro y medio del muro, por
       delante de una puerta no se estorba nada. */
    const tapaPuerta = (x, z) =>
      z < Arena.FONDO + 1.5 && VETO.some((v) => x > v[0] && x < v[1]);

    /* ---------------- Barriles ----------------

       En la arena de Project Nexus no hay cajas de madera ni
       palets apoyados en la pared: hay BARRILES, grandes, oscuros,
       y estan EN MEDIO DE LA HABITACION, no arrimados al fondo.
       Sueltos o de dos en dos, y a distintas profundidades, que es
       lo que le da volumen a la sala ahora que se anda por ella.

       Medido sobre el video, con el muñeco de 1,70 como regla: un
       barril le llega por encima de la cintura y es ancho. Son 1,05
       de alto por 0,78 de diametro -antes eran 0,92 por 0,64, que
       con la camara picada se veian como latas-.

       Y un barril de verdad no es un cilindro liso: tiene dos aros
       que sobresalen, el cuerpo abombado entre ellos y la tapa con
       su reborde. Cuatro cilindros mas por barril y se lee como un
       bidon. */
    const trastos = [];
    /* Mas grandes: 0,46 de radio y 1,22 de alto, contra 0,39 y
       1,05. Un bidon de 200 litros mide 0,29 de radio y 0,88 de
       alto de verdad, pero esto es Madness y en el original los
       barriles le llegan al pecho a un grunt -1,63 de alto-, o sea
       tres cuartas partes. 1,22 es exactamente eso. */
    const BR = 0.46, BH = 1.22;
    function barril(x, z, giro) {
      B.push(); B.translate(x, BH / 2, z); B.rotateY(giro || 0);
      /* El cuerpo, abombado: mas ancho en el medio que en los
         extremos. Dos troncos de cono encarados. */
      B.addCyl(BR, BR * 0.94, BH * 0.5, 10, 0, -BH * 0.25, 0, C.barril, {});
      B.addCyl(BR * 0.94, BR, BH * 0.5, 10, 0, BH * 0.25, 0, C.barril, {});
      /* Los dos aros. */
      B.addCyl(BR * 1.06, BR * 1.06, 0.085, 10, 0, BH * 0.26, 0, 0x2f1613, {});
      B.addCyl(BR * 1.06, BR * 1.06, 0.085, 10, 0, -BH * 0.26, 0, 0x2f1613, {});
      /* La tapa y su reborde. */
      B.addCyl(BR * 0.93, BR * 0.93, 0.05, 10, 0, BH * 0.5, 0, 0x4a2420, {});
      B.addCyl(BR * 1.02, BR * 1.02, 0.06, 10, 0, BH * 0.47, 0, 0x2f1613, {});
      B.pop();
      /* El alto va en la ficha porque ahora no solo empuja a los
         vivos: el ragdoll choca contra el bidon y se apoya encima,
         y para eso hace falta saber donde acaba. */
      trastos.push({ x: x, z: z, r: BR * 1.15, h: BH });
    }

    /* Repartidos a mano, no sorteados: son seis y se ven todos, asi
       que donde cae cada uno importa. Van por el medio de la sala
       -z entre -0,6 y +2,4-, lejos de las puertas y del sitio por
       el que entra el jugador. */
    /* EN MEDIO DE LA SALA, no arrimados a las esquinas.

       Estaban repartidos por los cuatro rincones y en una franja de
       z de dos metros, que es donde caben cuando la banda jugable
       mide cinco. Con la sala mas honda se pueden poner donde los
       pone el juego original: en el centro, formando estorbos por
       los que hay que rodear, y en parejas, que es lo que hace que
       se lean como bidones apilados y no como conos de obra. */
    /* BIEN EN EL CENTRO. La sala va de -2,05 a 7,2, cuyo centro es
       2,58, y de -22 a 22 en ancho. Los barriles se agrupan en esa
       banda central, en tres racimos, dejando libres los dos
       carriles por los que se cruza a las puertas de los extremos.
       Antes estaban en z 0,7..3,2 -o sea contra la pared del
       fondo, porque era donde cabian- y abiertos hasta x 11,5. */
    /* SEIS, NO DOCE. Eran once o doce repartidos por toda la banda
       central y la sala parecia un almacen: no quedaba suelo libre
       por el que pelear y se comian la mitad del cuadro. En la
       arena del original hay un puñado de bidones sueltos, ahi
       para taparse y para estorbar, no para llenar.

       Van en tres parejas -dos bidones juntos se leen como bidones
       apilados; uno suelto parece un cono de obra- repartidas por
       el centro y dejando libre el pasillo del medio, que es por
       donde se cruza a la tienda. */
    const SITIOS = [
      [-7.3, 2.45], [-6.3, 1.95],
      [-1.4, 3.30], [-0.4, 2.85],
      [7.0, 2.10], [8.0, 2.60]
    ];
    for (let i = 0; i < SITIOS.length; i++) {
      const sx = SITIOS[i][0], sz = SITIOS[i][1];
      if (tapaPuerta(sx, sz)) continue;
      barril(sx, sz, rng.range(0, U.TAU));
    }

    Arena.trastos = trastos;

    /* NO HAY BARANDILLA.

       Habia una, delante del todo, y el argumento era que cortaba
       el encuadre por abajo para que la pelea ocurriera DENTRO de
       algo. Pero cruzaba la arena entera por el medio de la
       imagen, tapaba las piernas y los cuerpos en el suelo, y no
       esta en el original. Fuera. Ahora lo que corta por abajo es
       el suelo, que es lo que tiene que cortar.

    */
    const malla = new THREE.Mesh(B.build(), Art.mats.plano);
    malla.frustumCulled = false;
    grupo.add(malla);

    /* ---------------- Telon del fondo ---------------- */
    const telon = new THREE.Mesh(
      new THREE.PlaneGeometry(Arena.LARGO * 1.7, Arena.ALTO * 2.4),
      new THREE.MeshBasicMaterial({ map: Art.texFondo(opts.semilla), depthWrite: false })
    );
    telon.position.set(0, Arena.ALTO * 0.5, Arena.FONDO - 3.4);
    telon.renderOrder = -10;
    grupo.add(telon);
    Arena.telon = telon;

    /* ---------------- Tinta ----------------
       El sello visual de la serie. Catorce quads en la pared y diez
       en el suelo: cuestan nada y cambian por completo la lectura
       del fondo. */
    const matSalp = new THREE.MeshBasicMaterial({
      map: Art.texSalpicadura(), transparent: true, depthWrite: false,
      color: 0x000000, opacity: 0.62
    });
    const quad = new THREE.PlaneGeometry(1, 1);
    /* LAS MANCHAS TAMPOCO TAPAN UNA PUERTA.

       Iban a FONDO+0,27, o sea 17 cm POR DELANTE de la hoja, y con
       la x sorteada a lo largo de toda la arena sin mirar donde
       caia. Tarde o temprano una se plantaba encima de una puerta
       -y con la semilla de serie, justo encima de la del centro-.
       Una salpicadura de tinta en la pared es decorado; cruzada
       por delante de una puerta parece un fallo de dibujo, porque
       lo es. Se usa la misma franja de veto que los trastos, y con
       el ancho de la mancha incluido para que tampoco la rocen. */
    for (let i = 0; i < 14; i++) {
      const t = rng.range(0.8, 2.4);
      let x = 0, intento = 0;
      do { x = rng.range(-L + 2, L - 2); intento++; }
      while (intento < 24 &&
             VETO.some((v) => x + t * 0.45 > v[0] && x - t * 0.45 < v[1]));
      if (VETO.some((v) => x + t * 0.45 > v[0] && x - t * 0.45 < v[1])) continue;
      const m = new THREE.Mesh(quad, matSalp);
      m.scale.set(t, t, 1);
      m.position.set(x, rng.range(0.6, Arena.ALTO - 1.2), Arena.FONDO + 0.27);
      m.rotation.z = rng.range(0, U.TAU);
      m.renderOrder = -5;
      grupo.add(m);
    }
    /* EN EL SUELO NO HAY TINTA.

       Habia diez salpicaduras tumbadas. Con la camara de lado casi
       no se veian -el suelo era una franja estrecha al fondo- y
       daban un toque; con la camara picada el suelo es media
       pantalla y lo que se ve son diez manchones negros repartidos
       por donde se pelea. En el video de Project Nexus el suelo
       esta sucio, pero de suciedad difusa y clara, no de goterones.
       La sangre de la pelea ya la pone Combat encima. */

    Arena.grupo = grupo;
    return grupo;
  };

  /* =============================================================
     UNA PUERTA

     Va APARTE de la malla estatica porque se mueve: la hoja se
     desliza y la luz cambia de color. Son cinco puertas, o sea
     cinco llamadas de dibujo mas; en un Adreno 610 eso no se mide,
     y el aviso de "por aqui sale uno" vale mucho mas que eso.

     Las medidas salen de la forma 4524 del SWF -107,5 x 317,5 px-
     reescalada a 0,75 x 2,21 m, y los colores de sus rellenos.
     ============================================================= */
  /* =============================================================
     UNA PUERTA

     MEDIDA, no de memoria. La primera version salio estrecha
     -2,95 de alto por 1 de ancho- y con cuadrados rectos abajo.
     Sobre las capturas de la serie:

       hoja      alto/ancho 1,572 en el primer plano
                 alto/ancho 1,48  en la sala entera
       -> 1,52 de media, que es lo que se usa

     o sea que una puerta de Madness es ANCHA. Con 2,15 m de alto
     salen 1,41 m de ancho: casi el doble de lo que tenia.

     El dibujo de la hoja -cuerpo, zona baja y la franja de RAYAS
     INCLINADAS de abajo- va en Art.texPuerta, con los tonos y los
     angulos medidos ahi.

     Y encima, la luz del cerrojo, que es lo que añade el juego
     sobre la puerta de la serie. Del SWF:

       myLock.gotoAndStop(1) -> lockLight 4540 fot.5 = forma 4539
       myLock.gotoAndStop(2) -> lockLight 4541 fot.5 = forma 4535

       forma 4535  #00FF00 / #99FF80 / #006600   VERDE (se abre)
       forma 4537  #B2802B / #CCC081 / #3B3301   ambar (moviendose)
       forma 4539  #FF0000 / #FE8181 / #760101   ROJO  (cerrada)

     La luz mide 11,8 x 14,8 px, el 11% del ancho de la puerta: a
     escala exacta serian 8 cm y no se veria en un movil. Va a
     0,24 m. Es la unica medida de aqui que no es la del original.
     ============================================================= */
  /* Alto comun. El ancho sale del aspecto medido de cada una, que
     NO es el mismo: la normal es 1,192 y la de la tienda 1,089, o
     sea que la de la tienda es mas ancha. */
  Arena.P_ALTO  = 2.30;
  Arena.P_ANCHO = Arena.P_ALTO / 1.192;   // referencia; cada puerta usa el suyo
  Arena.P_ABRIR = 6 / 30;           // segundos de la hoja: los 6 fotogramas del SWF
  Arena.P_QUIETA = 1.05;            // cuanto se queda abierta

  const P_MURO   = 0x616161;   // medido en la captura de la sala
  const LUZ_VERDE = 0x03FE03;  // medido: la luz de la ARMORY
  const LUZ_AMBAR = 0xB2802B;  // forma 4537 del SWF
  const LUZ_ROJA  = 0xFF0000;  // forma 4539 del SWF
  const LUZ_PANEL = 0x4CE746;  // medido en el boton de la arena

  Arena.puerta = function (d, z) {
    const g = new THREE.Group();
    const tienda = !!d.tienda;
    const AL = Arena.P_ALTO;
    /* El aspecto incluye el marco, que ahora va por fuera del
       panel: usando el del panel a secas la puerta salia estrecha
       en la misma proporcion que el marco que le falta. */
    const AN = AL / Art.aspectoPuerta(tienda ? 'armeria' : 'normal');
    const alFrente = d.dir === 'fondo';
    /* DENTRO DEL MURO, no delante. La cara delantera del muro esta
       en FONDO+0,25; la hoja va 10 cm por detras de ella, que es lo
       que hace que el muro la tape al subir y ademas lo que le da
       el retranqueo que tienen las puertas de la captura. */
    g.position.set(d.x, 0, alFrente ? z : Z_PUERTA_LADO);
    if (d.dir === 'izq') g.rotation.y = Math.PI / 2;
    if (d.dir === 'der') g.rotation.y = -Math.PI / 2;

    /* EL HUECO.

       El marco ya va dibujado DENTRO de la textura de la hoja -es
       como esta en la captura: la puerta es un panel con su marco
       pintado, no un vano con moldura-. Aqui solo hace falta el
       retranqueo, para que al abrirse se vea un paso y no que la
       hoja se esfuma.

       Y el hueco tiene 16 cm de fondo y ni uno mas: la puerta va en
       FONDO+0,46 = -2,14 y la cara delantera del zocalo del muro
       esta en -2,30. Con mas, el hueco atraviesa el muro y por la
       puerta abierta se ve la cara del muro. */
    const M = U.builder();
    /* La jamba: el canto del muro que se ve alrededor del hueco.
       Va del plano de la hoja hacia atras. */
    M.addBox(AN, AL, 0.26, 0, AL / 2, -0.15, 0x3a3a3e, { skip: 'F' });
    /* Y el fondo negro del paso. */
    M.addBox(AN * 0.99, AL * 0.995, 0.02, 0, AL / 2, -0.285, 0x050507, {});
    /* EL MARCO NO SUBE CON LA HOJA.

       El lienzo de la puerta trae el marco pintado alrededor del
       panel, y la hoja era ese lienzo entero: al abrirse, el marco
       subia con ella. En el SWF el marco es del muro y lo unico que
       se mueve es myArt, el panel. Asi que el marco va aqui, en 3D y
       quieto, con los colores y el grueso del dibujo -#4F4F4F, 6,4%
       del ancho a cada lado y 7,1% del alto arriba (Art.panelPuerta)-,
       la linea #1B1B1B por fuera y la #1A1A1A pegada al panel; y la
       hoja lleva solo el panel. Va del plano de la hoja (z = 0) a 2 cm
       por delante de la cara del muro (0,09), para que la hoja suba
       por DETRAS de su travesaño. */
    const PP = Art.panelPuerta(tienda ? 'armeria' : 'normal');
    const mLado = AN * (1 - PP.fx) / 2, mArriba = AL * (1 - PP.fy);
    const FZ = 0.11, fz = 0.055, LIN = AN * 2 / 180;
    for (const s of [-1, 1]) {
      M.addBox(mLado, AL, FZ, s * (AN - mLado) / 2, AL / 2, fz, 0x4F4F4F, { luz: false, skip: 'B' });
      M.addBox(LIN, AL, 0.004, s * (AN / 2 - LIN / 2), AL / 2, FZ + 0.002, 0x1B1B1B, { luz: false });
      M.addBox(LIN, AL - mArriba, 0.004, s * (AN / 2 - mLado + LIN / 2), (AL - mArriba) / 2, FZ + 0.002, 0x1A1A1A, { luz: false });
    }
    M.addBox(AN - 2 * mLado, mArriba, FZ, 0, AL - mArriba / 2, fz, 0x4F4F4F, { luz: false, skip: 'B' });
    M.addBox(AN, LIN, 0.004, 0, AL - LIN / 2, FZ + 0.002, 0x1B1B1B, { luz: false });
    M.addBox(AN - 2 * mLado, LIN, 0.004, 0, AL - mArriba + LIN / 2, FZ + 0.002, 0x1A1A1A, { luz: false });
    const marco = new THREE.Mesh(M.build(), Art.mats.plano);
    marco.frustumCulled = false;
    g.add(marco);

    /* --- La hoja ---
       Un quad con SOLO el panel de la textura (sin el marco), y nada
       mas: la hoja es un objeto rigido que sube y baja, y de
       esconderla se encarga el travesaño del marco y el muro. */
    const ANh = AN * PP.fx, ALh = AL * PP.fy;
    const gh = new THREE.PlaneGeometry(ANh, ALh);
    const uvs = gh.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setX(i, PP.u0 + uvs.getX(i) * PP.fx);
      uvs.setY(i, uvs.getY(i) * PP.fy);
    }
    const hoja = new THREE.Mesh(gh,
      new THREE.MeshBasicMaterial({ map: Art.texPuerta(tienda ? 'armeria' : 'normal') }));
    hoja.position.set(0, ALh / 2, 0);
    const nodoHoja = new THREE.Group();
    nodoHoja.add(hoja);
    g.add(nodoHoja);

    /* --- La luz del cerrojo ---

       ENCIMA DE LA PUERTA. En el SWF el cerrojo va sobre la hoja y
       a media altura -myLock cae en (-35,5, -161) contra myDoor en
       (-46,5, -331,4), o sea al 52% del alto-, pero esto es un fan
       game y arriba se lee mucho mejor: de un vistazo, desde el
       otro lado de la arena, se ve que por esa puerta va a salir
       alguien. Asi que arriba se queda.

       Lo que SI se toma del original es la forma: un ovalo
       VERTICAL, no un circulo. La forma 4535 mide 11,8 x 14,8 px,
       o sea 1 a 1,25.

       Y son dos discos PLANOS, en el plano de la puerta. Antes esto
       era una cajita en tres dimensiones con un disco dentro, y en
       las puertas de los extremos -que la camara mira casi de
       canto- la cajita se veia de perfil y el disco se aplastaba
       hasta quedar en un palito rojo al lado de la puerta. Siendo
       planos y estando en el plano de la puerta, se escorzan
       EXACTAMENTE igual que ella: mientras se vea la puerta se ve
       la luz, y con su proporcion.

       Del tamaño: 11,8 px sobre una puerta de 107,5 es el 11% del
       ancho, que a escala real serian 8 cm y en un movil no se
       verian. Se queda en el 11,4%, que es la unica medida de aqui
       que no es la del original y es a proposito. */
    const R = AN * 0.114 * 0.5;
    const H_LUZ = AL + AL * 0.116 + R;
    /* El vuelo: la luz va sobre el DINTEL, y la cara del dintel
       esta 9 cm por delante del plano de la hoja -ese retranqueo es
       lo que deja que el muro tape la hoja al subir-. Con 12 queda
       3 cm por delante de la pared. */
    const VUELO = 0.12;
    /* SOLO LA PUERTA DEL JUGADOR LLEVA LUZ. Las de los enemigos no:
       anunciar por donde va a salir cada uno sobraba, y la del
       jugador es la que tiene algo que decir -si se puede pasar a la
       armeria-. Las medidas de arriba se quedan: el cartel de ARMORY
       se cuelga contando con ellas. */
    let bomb = null, nodoLuz = null;
    if (tienda) {
    const aroLuz = new THREE.Mesh(
      new THREE.CircleGeometry(R * 1.34, 14),
      new THREE.MeshBasicMaterial({ color: 0x121214 })
    );
    aroLuz.scale.y = 1.25;
    bomb = new THREE.Mesh(
      new THREE.CircleGeometry(R, 14),
      new THREE.MeshBasicMaterial({ color: LUZ_ROJA })
    );
    bomb.scale.y = 1.25;
    bomb.position.z = 0.004;
    nodoLuz = new THREE.Group();
    nodoLuz.position.set(0, H_LUZ, VUELO);
    nodoLuz.add(aroLuz); nodoLuz.add(bomb);
    g.add(nodoLuz);
    }

    /* --- El cartel de ARMORY, solo en la del centro ---
       50 x 25 px sobre una puerta de 79 de ancho: 63% del ancho y
       la mitad de alto que de ancho. Va por encima de la luz. */
    if (tienda) {
      /* El 63% del ancho de la puerta, medido en la captura; el alto y
         el giro, del sprite 3790 del SWF. */
      const cw = AN * 0.63, ch = cw * Art.CARTEL_ARMERIA.aspecto;
      const cart = new THREE.Mesh(
        new THREE.PlaneGeometry(cw, ch),
        new THREE.MeshBasicMaterial({ map: Art.texCartelArmeria(), transparent: true })
      );
      cart.position.set(0, H_LUZ + R * 1.35 + ch * 0.62, 0.13);
      cart.rotation.z = Art.CARTEL_ARMERIA.giro;
      g.add(cart);
    }

    return {
      x: d.x, z: alFrente ? z + 0.16 : Z_PUERTA_LADO,
      lado: d.dir === 'der' ? -1 : 1,
      dir: d.dir, tienda: tienda, spawn: !tienda,
      grupo: g, hoja: nodoHoja, lam: hoja, luz: bomb,
      t: 0, estado: 'cerrada', AN: AN, AL: AL, ALh: ALh,
      /* Para compensar el escorzo de la luz hace falta saber por
         donde sale la puerta y cual es su eje lateral, los dos en
         coordenadas del mundo. */
      nodoLuz: nodoLuz, vuelo: VUELO, hLuz: H_LUZ,
      nx: alFrente ? 0 : (d.dir === 'der' ? -1 : 1),
      nz: alFrente ? 1 : 0,
      tx: alFrente ? 1 : 0,
      tz: alFrente ? 0 : (d.dir === 'der' ? 1 : -1),
      cx: d.x, cz: alFrente ? z : Z_PUERTA_LADO
    };
  };

  Arena.abrirPuerta = function (p) {
    if (!p || p.estado !== 'cerrada') return false;
    p.estado = 'abriendo';
    p.t = 0;
    /* El original toca playSound('door1'), y su tabla de sonidos
       -SwainAudioPlayer, bloque 1622- mapea door1 -> Door -> S_Door,
       que es justo el fichero que lleva el banco. Suena UNA vez, al
       abrirse; antes sonaba tambien al salir el enemigo, o sea dos
       puertas por bicho. */
    Sonido.tocar('puerta', { x: p.x, cam: Game.camX });
    return true;
  };

  /* Una puerta libre de las que SUELTAN. La del centro nunca: es la
     de la tienda y por ahi entra el jugador. */
  Arena.puertaLibre = function (rng) {
    const libres = Arena.puertas.filter((p) => p.spawn && p.estado === 'cerrada');
    if (!libres.length) return null;
    return libres[Math.floor((rng ? rng() : Math.random()) * libres.length)];
  };

  /* El ciclo, cada fotograma. Roja cerrada, verde abierta, y el
     ambar de la forma 4537 mientras la hoja se mueve. */
  /* Donde descansa el centro de la hoja con la puerta cerrada. */
  function AL_MITAD(p) { return p.ALh / 2; }

  /* LA CURVA DE LA HOJA, la del SWF: myArt (4531) dentro de myDoor
     (4532) pasa por y = 188, 181, 160,1, 125,4, 85,8, 62,2 y 54,5 en
     seis fotogramas, o sea arranca despacio, corre en medio y frena
     arriba -recorrido normalizado 0 / 0,052 / 0,209 / 0,469 / 0,766 /
     0,943 / 1-. Con el tiempo lineal de antes la hoja subia a golpes,
     a velocidad constante y parandose en seco. Entre fotograma y
     fotograma, Catmull-Rom: a 60 fps no se ven escalones. */
  const CURVA_HOJA = [0, 0.052, 0.209, 0.469, 0.766, 0.943, 1];
  Arena.curvaHoja = function (u) {
    const n = CURVA_HOJA.length - 1, f = U.clamp(u, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(f)), t = f - i;
    const p0 = CURVA_HOJA[Math.max(0, i - 1)], p1 = CURVA_HOJA[i], p2 = CURVA_HOJA[i + 1], p3 = CURVA_HOJA[Math.min(n, i + 2)];
    return U.clamp(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t), 0, 1);
  };
  /* El estado de una puerta, cada fotograma. Devuelve cuanto esta
     abierta (0..1, ya con la curva). La usan las de la arena y la de
     la armeria. */
  Arena.cicloPuerta = function (p, dt) {
    let u = 0;
    if (p.estado === 'abriendo') {
      p.t += dt;
      u = Math.min(1, p.t / Arena.P_ABRIR);
      if (u >= 1) { p.estado = 'abierta'; p.t = 0; }
    } else if (p.estado === 'abierta') {
      u = 1; p.t += dt;
      /* No se cierra encima del que esta cruzando. */
      if (p.ocupada) p.t = 0;
      if (p.t >= Arena.P_QUIETA) { p.estado = 'cerrando'; p.t = 0; }
    } else if (p.estado === 'cerrando') {
      p.t += dt;
      u = 1 - Math.min(1, p.t / Arena.P_ABRIR);
      if (u <= 0) { p.estado = 'cerrada'; p.t = 0; }
    }
    const k = Arena.curvaHoja(u);
    p.lam.position.y = AL_MITAD(p) + k * p.ALh * 1.08;
    /* el bombeo del SWF: xscale 0,2394 -> 0,2515 -> 0,2394, un 5,1%
       en mitad del recorrido */
    p.lam.scale.x = 1 + Math.sin(k * Math.PI) * 0.051;
    return k;
  };
  /* Ponerla ya abierta del todo, sin verla subir: la puerta por la que
     se acaba de aparecer. */
  Arena.abiertaYa = function (p) {
    p.estado = 'abierta'; p.t = 0; p.ocupada = true;
    p.lam.position.y = AL_MITAD(p) + p.ALh * 1.08;
    p.lam.scale.x = 1;
  };

  Arena.pasoPuertas = function (dt) {
    const ps = Arena.puertas;
    if (!ps) return;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const k = Arena.cicloPuerta(p, dt);
      /* LA HOJA SUBE. Entera, rigida, y se esconde detras del muro.

         En el SWF el sprite myDoor (4532) anima su contenido myArt
         (4531) asi, fotograma a fotograma:

           y  188 -> 181 -> 160,1 -> 125,4 -> 85,8 -> 62,2 -> 54,5
           xscale  0,2394  0,2412  0,2477  0,2515  0,2477  0,2418  0,2394

         y luego el camino de vuelta. La hoja se va HACIA ARRIBA -en
         Flash la y negativa sube- 133,5 px sobre un dibujo de 317,5,
         o sea el 42% de su alto, y mientras sube se ENSANCHA un
         5,1% en el medio del recorrido. Ese bombeo es lo que hace
         que no parezca una imagen deslizandose: la hoja se comba al
         tirar de ella.

         AQUI NO SE RECORTA NADA. Lo intente dos veces -primero
         escalando el quad, que aplastaba la calavera hasta dejarla
         en una raya; luego moviendo las UV, que dejaba el dibujo
         clavado mientras el hueco se lo comia desde abajo- y las
         dos estaban mal por la misma razon: son apaños para
         simular un recorte que el motor ya sabe hacer solo. En el
         SWF la hoja va dentro de una MASCARA; aqui el hueco es un
         agujero de verdad en el muro y la hoja va por detras de su
         cara, asi que al subir la tapa el dintel. Sin trucos.

         Sube el 108% de su alto para que no asome el bajo por
         encima del dintel al abrirse del todo. */
      Arena.encajarLuz(p);

      /* LA DE LA TIENDA SIGUE A LA OLEADA, no esta siempre verde.

         Estaba clavada en verde con el argumento de que es la
         unica con myConnection y sin cerrojo. Pero verde significa
         "por aqui se pasa", y mientras hay una oleada en marcha
         por ahi NO se pasa: la tienda esta cerrada y la puerta
         tambien. Roja durante el combate y verde en el respiro,
         que es cuando de verdad se puede ir a comprar. Y asi el
         jugador tiene, ademas, un semaforo de si la ronda sigue
         viva sin mirar el HUD. */
      /* 'anuncio' tambien: al pulsar el panel el original ya echa el
         cerrojo (lockDoor) mientras sale el cartel de WAVE n. */
      /* y con el cerrojo echado hasta cerrar el TEST RESULTS (Waves.empezar) */
      const enPelea = Game.olas && (Game.olas.estado === 'combate' || Game.olas.estado === 'anuncio' || Game.olas.cerrojo);
      if (p.luz) p.luz.material.color.setHex(
        p.tienda ? (enPelea ? LUZ_ROJA : LUZ_VERDE)
                 : (k >= 0.99 ? LUZ_VERDE : (k <= 0.01 ? LUZ_ROJA : LUZ_AMBAR)));
    }
  };

  /* =============================================================
     EL PANEL, CADA FOTOGRAMA

     Verde y latiendo cuando se puede arrancar la ronda, apagado
     mientras la ronda esta en marcha. Devuelve true UNA vez: el
     fotograma en que el jugador lo alcanza.

     En el original se pulsa con la barra espaciadora. Aqui el
     juego es de movil y no hay barra, asi que se activa por
     CERCANIA: llegar hasta el panel es exactamente el mismo gesto
     -cruzar la arena hasta la pared- sin pedir un boton mas en una
     pantalla que ya tiene dos sticks.
     ============================================================= */
  Arena.ALCANCE_PANEL = 1.15;

  const ALCANCE_DISCO = 2.15;
  Arena.pasoPanel = function (dt, jug) {
    const P = Arena.panel;
    if (!P) return false;
    P.t += dt;
    let tocado = false;
    if (P.activo) {
      /* El latido: entre el 70 y el 100% de brillo, dos veces por
         segundo. Es lo que hace que se le vea desde el otro lado
         de la arena sin ponerle una flecha encima. */
      const k = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(P.t * 6.6));
      /* setHex y luego escalar, no setRGB con los tres valores ya
         multiplicados: setRGB toma sus numeros como LINEALES, asi
         que el #4CE746 medido en la captura salia por pantalla
         como #83D87E, mucho mas lavado. Partiendo del hex, Three
         hace la conversion de espacio el solo y multiplyScalar
         atenua el brillo donde toca, que es en lineal. */
      P.luz.material.color.setHex(LUZ_PANEL).multiplyScalar(k);
      P.halo.material.opacity = 0.34 + 0.24 * k;
      P.brillo.visible = true;
      /* EL ALCANCE DEL PANEL ES UN DISCO EN EL SUELO.

         Era |x - P.x| < 1,15 y ademas z > -1,6, o sea una franja
         vertical con un suelo puesto a mano. Lo del -1,6 estaba
         para que no lo activara quien todavia estuviera dentro de
         la puerta; con la banda jugable llegando ahora a -2,05, eso
         dejaba fuera al jugador PEGADO a la pared, que es
         justamente donde esta el panel.

         Un disco de 2,15 m alrededor de la placa resuelve las dos
         cosas y no hay que mantener dos numeros: quien esta dentro
         del hueco de la puerta queda a mas de eso. */
      const dxP = jug ? jug.x - P.x : 99;
      const dzP = jug ? (jug.z || 0) - (Arena.FONDO + 0.30) : 99;
      /* A su alcance, nada mas: lo aprieta el jugador con ATACAR (el
         'use' del SWF, game.js). Antes bastaba con acercarse. */
      if (jug && jug.vida > 0 &&
          dxP * dxP + dzP * dzP < ALCANCE_DISCO * ALCANCE_DISCO) {
        tocado = true;
      }
    } else {
      /* Apagado no es negro: es el verde muerto de una bombilla
         que sigue ahi. */
      P.luz.material.color.setHex(0x1d3a1b);
      P.halo.material.opacity = 0.10;
      P.brillo.visible = false;
    }
    return tocado;
  };

  /* =============================================================
     LA LUZ, ENCIMA DE SU PUERTA Y NO AL LADO

     La luz va sobre el dintel, y el dintel esta 12 cm por delante
     del plano de la hoja: tiene que estarlo, porque ese retranqueo
     es justo lo que deja que el muro tape la hoja cuando sube. No
     se puede quitar.

     Doce centimetros no parecen nada, pero la camara mira las
     puertas de los EXTREMOS casi de canto, y ahi el escorzo
     multiplica: medido en pantalla, la luz de la puerta izquierda
     salia 30 px a la derecha de su puerta, que a esa distancia son
     casi medio metro. Se veia al lado, no encima.

     Se compensa, y se puede hacer exacto. Con C la camara, P el
     punto del muro donde la luz DEBE verse, n el normal de la
     puerta, t su eje lateral y v = P - C:

       desplazamiento = vuelo * (v . t) / (v . n)

     que es el triangulo semejante de toda la vida. Metiendo eso en
     el eje lateral de la luz, se proyecta sobre el eje de su puerta
     desde donde este la camara. Medido despues: 0 px de error en
     las cinco puertas, con el jugador en -20, -14, 0, 14 y 20.

     El tope del 35% del ancho es para el caso raro en que el
     jugador se pega a la pared del extremo: ahi v.n se hace pequeño
     y el cociente se dispara. A esa distancia ya no se ve casi nada
     de esa pared, asi que el tope no se nota.
     ============================================================= */
  const _vLuz = { x: 0, y: 0, z: 0 };

  Arena.encajarLuz = function (p) {
    const cam = Game.cam;
    if (!cam || !p.nodoLuz) return;
    _vLuz.x = p.cx - cam.position.x;
    _vLuz.y = p.hLuz - cam.position.y;
    _vLuz.z = p.cz - cam.position.z;
    const vn = _vLuz.x * p.nx + _vLuz.z * p.nz;
    if (Math.abs(vn) < 0.05) return;
    const vt = _vLuz.x * p.tx + _vLuz.z * p.tz;
    const k = p.vuelo / vn;
    const tope = p.AN * 0.35;
    p.nodoLuz.position.x = U.clamp(vt * k, -tope, tope);
    p.nodoLuz.position.y = p.hLuz + U.clamp(_vLuz.y * k, -p.AL * 0.2, p.AL * 0.2);
  };

  /* Los ventiladores de la pared. Giran siempre, tambien en el
     respiro: una sala se queda muerta en cuanto lo unico que se
     mueve en ella son los personajes. */
  Arena.pasoVentilacion = function (dt) {
    const v = Arena.ventiladores;
    if (!v) return;
    for (let i = 0; i < v.length; i++) v[i].malla.rotation.z += v[i].vel * dt;
  };

  /* EN QUE SALA SE ESTA. La arena va centrada en x = 0; la armeria
     (armeria.js) en x = 80. Todo lo que topa con las paredes -el
     jugador, las balas, la mira, la camara- mira el tope ALREDEDOR de
     Arena.CX, y el margen es el de la sala: en la arena 1,8 m por dentro
     (las puertas de los extremos estan en el muro), en la armeria medio
     metro. game.js los cambia al cruzar la puerta. */
  Arena.CX = 0;
  Arena.MARGEN_X = 1.8;
  Arena.limite = function () { return Arena.LARGO / 2 - Arena.MARGEN_X; };

  /* ¿Hay un trasto aqui? Devuelve cuanto hay que apartarse en X.
     No es fisica: es un empujon para que nadie se meta dentro de un
     barril. Con dieciocho trastos, recorrerlos todos sale mas
     barato que montar y mantener una rejilla espacial. */
  /* =============================================================
     LOS TRASTOS EMPUJAN EN EL PLANO, NO SOLO EN X

     Esto devolvia UN numero, el empujon por la x, y nada mas: era
     lo unico que hacia falta cuando el juego era un pasillo. En una
     habitacion, empujar solo por la x significa que un bidon que
     tienes justo delante no te aparta, te deja atravesarlo de
     frente. De ahi que los enemigos se metieran dentro.

     Ahora sale el vector entero, y ademas se suman TODOS los
     trastos que solapan en vez de devolver el primero: entre dos
     bidones juntos, quedarse con uno mete el cuerpo dentro del
     otro.
     ============================================================= */
  const _emp = { x: 0, z: 0 };
  Arena.empujar = function (x, z, radio) {
    const t = Arena.trastos;
    _emp.x = 0; _emp.z = 0;
    if (!t) return _emp;
    for (let i = 0; i < t.length; i++) {
      const dx = x - t[i].x, dz = z - t[i].z;
      const d = Math.hypot(dx, dz);
      const min = radio + t[i].r;
      if (d < min && d > 0.001) {
        const k = (min - d) / d;
        _emp.x += dx * k; _emp.z += dz * k;
      }
    }
    return _emp;
  };

  /* =============================================================
     RODEAR UN BIDON: CUANTO HAY QUE TORCER EL RUMBO

     La primera version sumaba un vector perpendicular al rumbo, y
     eso NO funciona: cada fotograma se vuelve a calcular el rumbo
     recto al jugador, se le suma la perpendicular, el trasto
     empuja de vuelta, y el enemigo se queda vibrando delante del
     bidon sin avanzar. Medido: se plantaba a 3,82 m del jugador y
     ahi se quedaba ocho segundos.

     Lo que si avanza es torcer el RUMBO un angulo, porque un
     angulo acumula camino: con el rumbo torcido el enemigo anda de
     verdad hacia un lado del bidon, y en cuanto lo pasa el estorbo
     desaparece y el rumbo vuelve solo al jugador.

     El angulo sale de una cuenta, no de un numero a ojo. Con el
     centro del bidon a 'a' metros por delante y 'lat' de lado, y
     haciendo falta 'need' de holgura, girar theta mueve ese lado
     aproximadamente a lat + a*theta, asi que

        theta = (signo(lat) * need - lat) / a

     o sea lo justo para pasar rozando por el lado por el que ya se
     esta saliendo. Si el bidon cae exactamente en el rumbo -lat 0-
     el signo se toma positivo y sale disparado a un lado; con dos
     bidones pegados manda el que mas obliga a torcer.
     ============================================================= */
  const ABANICO = [0, 0.30, -0.30, 0.62, -0.62, 0.95, -0.95, 1.30, -1.30, 1.75, -1.75];
  Arena.rodear = function (x, z, ux, uz, radio, vista) {
    const t = Arena.trastos;
    if (!t || !t.length) return 0;
    /* EL ABANICO, y no una cuenta por bidon.

       La version anterior calculaba el giro que hacia falta para
       esquivar UN bidon -el que mas obligaba- y con uno suelto
       funciona. Entre dos, no: el giro que libra al de la derecha
       mete al enemigo en el de la izquierda, al fotograma
       siguiente manda el otro, y se queda bailando en el hueco.

       Asi que en vez de resolver un bidon se prueban once rumbos,
       de menos a mas torcido y alternando lado, y se coge EL
       PRIMERO que esta limpio del todo. Once por seis bidones son
       sesenta y seis comprobaciones de punto contra recta por
       enemigo y fotograma: nada. Y por construccion no puede
       elegir un rumbo que choque, que es justo lo que pasaba. */
    for (let k = 0; k < ABANICO.length; k++) {
      const th = ABANICO[k];
      const cs = Math.cos(th), sn = Math.sin(th);
      const dx = ux * cs - uz * sn, dz = ux * sn + uz * cs;
      let libre = true;
      for (let i = 0; i < t.length; i++) {
        const px = t[i].x - x, pz = t[i].z - z;
        const a = px * dx + pz * dz;
        if (a < -0.2 || a > vista) continue;
        const lat = px * dz - pz * dx;
        if (Math.abs(lat) < radio + t[i].r + 0.16) { libre = false; break; }
      }
      if (libre) return th;
    }
    /* Rodeado del todo: se tira por el lado mas abierto y que el
       empujon del trastо haga el resto. */
    return ABANICO[ABANICO.length - 1];
  };

  global.Arena = Arena;
})(window);

