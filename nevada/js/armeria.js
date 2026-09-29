/* =============================================================
   armeria.js -> La ARMORY por dentro.

   Es la sala 'room1_2_9' del SWF (madness_world 3821, dibujo 3541):
   la sala de armas del episodio 1, la mas ancha y despejada de las
   que tienen armeros. Aqui va SOLO la sala: el casco, las cañerias,
   el tablero electrico, la caja de pared, el aire acondicionado del
   rincon, el cartel y la alfombra. Los armeros (3398), el banco
   (3307), la papelera (3223), la bombona (3213) y el cubo (3189)
   estan medidos pero no se ponen todavia.

   LA ESCALA. Todo sale de la sala del SWF, en sus px:

     esquinas r0_ul (89,5; 312,1) y r0_ur (1106; 313,4): la pared del
     fondo mide 1016,5 px, y a la escala K de los personajes
     (0,214/13,06 m/px) son 16,66 m de ancho.

   Las piezas miden lo que miden en el SWF a esa misma escala, asi que
   guardan su tamaño contra el muñeco (un tablero de 1,15 x 1,97 m al
   lado de un personaje de 1,7). Pero la sala no puede tener los 3,52 m
   de techo del SWF (215 px): la camara va a 4,86 m y veria el techo por
   encima. Tiene el alto de la arena, 5,2, y las ALTURAS se reparten
   igual que en el dibujo: y = (312 - y_swf) * 5,2/215. Asi la
   composicion es la del SWF -la cañeria de abajo pasa justo por encima
   de la cabeza, a 2,31 m, como en el dibujo- y cada pieza conserva su
   tamaño de verdad.

   El fondo de la sala es el de la arena (misma camara): la linea del
   suelo de delante del SWF (r0_dl / r0_dr, y = 382) es el tope de
   delante de la pelea, Arena.Z_FRENTE, y la pared es la del fondo.

   Va lejos de la arena, en x = 80: los cadaveres, las manchas y las
   armas tiradas se quedan donde estaban sin tener que esconder nada.
   Arena.CX dice en que sala se esta (game.js).

   Coste: la malla de color (casco, cañerias, cajas, alfombra, tinta),
   la de las texturas del SWF (un atlas: paredes, cartel y frentes) y
   el suelo. Tres llamadas, como la arena.
   ============================================================= */
(function (global) {
  'use strict';

  const Armeria = {};
  const K = 0.214 / 13.06;                 // m por px del SWF (la de los personajes)
  Armeria.CX = 80;                         // donde esta, lejos de la arena
  const CX_SWF = (89.5 + 1106) / 2;        // el centro de la pared del fondo, en px
  Armeria.ANCHO = (1106 - 89.5) * K;       // 16,66 m
  const MX = Armeria.ANCHO / 2;

  /* px del SWF -> metros de la sala (x respecto a su centro, y sobre el
     suelo repartida en el alto de la sala) */
  const X = (px) => (px - CX_SWF) * K;
  const Y = (py) => (312 - py) * Arena.ALTO / 215;

  Armeria.construir = function () {
    const ALTO = Arena.ALTO;
    const MURO = Arena.FONDO + 0.25;        // la cara de la pared del fondo, como en la arena
    const Z0 = MURO, Z1 = Arena.VISTA;      // las laterales, hasta donde ve la camara
    const Zde = (py) => MURO + (py - 312) / (382 - 312) * (Arena.Z_FRENTE - MURO);
    const g = new THREE.Group();
    g.position.x = Armeria.CX;
    const B = U.builder();

    /* ---------------- el suelo ----------------
       El hormigon de la arena (Art.texSuelo) en su propia malla. */
    const texS = Art.texSuelo().clone();
    texS.needsUpdate = true;
    texS.wrapS = texS.wrapT = THREE.RepeatWrapping;
    texS.repeat.set(Armeria.ANCHO / 7, (Z1 - Z0) / 7);
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(Armeria.ANCHO, Z1 - Z0),
      new THREE.MeshBasicMaterial({ map: texS }));
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.set(0, 0, (Z0 + Z1) / 2);
    suelo.frustumCulled = false;
    g.add(suelo);

    /* ---------------- techo ----------------
       En el SWF es el mismo gris que el suelo, #585858 (88), sin sombra. */
    B.addBox(Armeria.ANCHO + 1, 0.3, Z1 - Z0 + 0.5, 0, ALTO + 0.15, (Z0 + Z1) / 2, 0x585858, { luz: false });

    /* ---------------- la tinta de las aristas ----------------
       En el SWF las cuatro esquinas de la sala llevan su linea negra. 1 px
       del SWF son 1,6 cm y desde la camara no se ve: 3,5 cm, el minimo que
       usa el resto de la tinta de la sala. */
    const T = 0.035, NEGRO = 0x000000;
    B.addBox(Armeria.ANCHO, T, T, 0, ALTO - T / 2, MURO + T / 2, NEGRO, { luz: false });
    B.addBox(Armeria.ANCHO, T, T, 0, T / 2, MURO + T / 2, NEGRO, { luz: false });
    for (const s of [-1, 1]) {
      const xs = s * (MX - T / 2);
      B.addBox(T, ALTO, T, xs, ALTO / 2, MURO + T / 2, NEGRO, { luz: false });
      B.addBox(T, T, Z1 - Z0, xs, ALTO - T / 2, (Z0 + Z1) / 2, NEGRO, { luz: false });
      B.addBox(T, T, Z1 - Z0, xs, T / 2, (Z0 + Z1) / 2, NEGRO, { luz: false });
    }

    /* ---------------- la alfombra (3452) ----------------
       Del SWF, en la columna x = 590: linea negra, filete #676767 de
       1,5 px, linea negra y el relleno #515151; su borde de atras en
       y = 318 (6 px de la pared) y el de delante en 379. Los x, los del
       borde de atras -que esta en el plano de la pared-: 370 a 884.
       Las lineas, a la tinta minima; el filete, en proporcion. */
    const aX0 = X(370), aX1 = X(884), aZ0 = Zde(318), aZ1 = Zde(379);
    const capa = (m, y, col) => {
      B.addQuad([aX0 + m, y, aZ1 - m], [aX1 - m, y, aZ1 - m], [aX1 - m, y, aZ0 + m], [aX0 + m, y, aZ0 + m], col, 1, true);
    };
    capa(0, 0.004, 0x000000);
    capa(T, 0.006, 0x676767);
    capa(T + 0.055, 0.008, 0x000000);
    capa(2 * T + 0.055, 0.010, 0x515151);

    /* ---------------- las cajas de pared ----------------
       Tablero electrico 3129: su frente de (178,45; 87,55) a (248,95;
       207,9) -1,16 x 1,97 m- y el canto de 8,5 px en escorzo (unos 30 cm
       de fondo). Caja 3127: frente de (388,05; 89,75) a (428,3; 190,35)
       -0,66 x 1,65 m-, canto de 5,3 px (25 cm). El color de los cantos,
       el del SWF. El frente es su dibujo (atlas). */
    const cajas = [];
    const caja = (x0, y0, x1, y1, fondo, canto, tex) => {
      const w = (x1 - x0) * K, h = (y1 - y0) * K;
      const cx = X((x0 + x1) / 2), cy = Y((y0 + y1) / 2);
      B.addBox(w, h, fondo, cx, cy, MURO + fondo / 2, canto, { skip: 'FB' });
      // su tinta: las cuatro aristas del frente
      B.addBox(w + T, T, T, cx, cy + h / 2, MURO + fondo, NEGRO, { luz: false });
      B.addBox(w + T, T, T, cx, cy - h / 2, MURO + fondo, NEGRO, { luz: false });
      B.addBox(T, h, T, cx - w / 2, cy, MURO + fondo, NEGRO, { luz: false });
      B.addBox(T, h, T, cx + w / 2, cy, MURO + fondo, NEGRO, { luz: false });
      cajas.push({ tex: tex, x: cx, y: cy, z: MURO + fondo + 0.002, w: w, h: h });
      return { cx: cx, cy: cy, w: w, h: h };
    };
    const tablero = caja(178.45, 87.55, 248.95, 207.9, 0.30, 0x3a3a3a, 'tablero');
    const cajaP = caja(388.05, 89.75, 428.3, 190.35, 0.25, 0x404040, 'caja');

    /* ---------------- las cañerias (3540) ----------------
       El trazado del SWF, en px (render a 2x de la forma 3540):
         la de abajo    y = 216,6, de x = 84,3 al codo de 457,8
         la bajante     x = 457,8, de y = 216,6 a 104,6
         la de arriba   y = 104,6, de 457,8 hasta el aire (1030,3)
         la del tablero sale de su canto (255,3; 132,6), va a 344,8,
                        baja a 209,6, sigue a 451,3, sube a 166,1 y entra
                        en la caja por su canto (432,8)
       Grosor de 2,5 px (4 cm); se lleva a 10, que a la distancia de la
       camara son 4 px de pantalla -con 7 la tinta se partia en rayitas-,
       y las abrazaderas cada 62,5 px, donde las pone el dibujo. */
    const R = 0.05, ZC = MURO + 0.10, TUBO = 0x5a5a5a, ABR = 0x2e2e2e;
    const tramo = (xa, ya, xb, yb) => {
      const x0 = X(Math.min(xa, xb)), x1 = X(Math.max(xa, xb));
      const y0 = Y(Math.max(ya, yb)), y1 = Y(Math.min(ya, yb));
      const w = Math.max(x1 - x0, 0) + 2 * R, h = Math.max(y1 - y0, 0) + 2 * R;
      B.addBox(w, h, 2 * R, (x0 + x1) / 2, (y0 + y1) / 2, ZC, TUBO, {});
      // tinta por encima y por debajo del tubo, que es lo que se lee de lejos
      if (w > h) {
        B.addBox(w, 0.022, 0.022, (x0 + x1) / 2, y1 + R, ZC + R, NEGRO, { luz: false });
        B.addBox(w, 0.022, 0.022, (x0 + x1) / 2, y0 - R, ZC + R, NEGRO, { luz: false });
      } else {
        B.addBox(0.022, h, 0.022, x0 - R, (y0 + y1) / 2, ZC + R, NEGRO, { luz: false });
        B.addBox(0.022, h, 0.022, x1 + R, (y0 + y1) / 2, ZC + R, NEGRO, { luz: false });
      }
    };
    const abrazadera = (px, py, vertical, doble) => {
      const l = doble ? 0.30 : 0.10;
      if (vertical) B.addBox(2 * R + 0.04, 0.07, 2 * R + 0.03, X(px), Y(py), ZC, ABR, {});
      else B.addBox(0.07, (doble ? l : 2 * R + 0.04), 2 * R + 0.03, X(px), Y(py), ZC, ABR, {});
    };
    tramo(84.3, 216.6, 457.8, 216.6);
    tramo(457.8, 216.6, 457.8, 104.6);
    tramo(457.8, 104.6, 1030.3, 104.6);
    tramo(255.3, 132.6, 344.8, 132.6);
    tramo(344.8, 132.6, 344.8, 209.6);
    tramo(344.8, 209.6, 451.3, 209.6);
    tramo(451.3, 209.6, 451.3, 166.1);
    tramo(451.3, 166.1, 432.8, 166.1);
    for (const x of [117.8, 180.3, 242.8, 305.3]) abrazadera(x, 216.6, false);
    for (let x = 498.3; x < 1025; x += 62.5) abrazadera(x, 104.6, false);
    abrazadera(457.8, 132.1, true);
    abrazadera(457.8, 194.6, true);
    for (const x of [267.3, 332.3]) abrazadera(x, 132.6, false);
    for (const y of [148.1, 195.1]) abrazadera(344.8, y, true);
    for (const x of [367.8, 430.3]) abrazadera(x, 213.1, false, true);

    /* ---------------- el aire acondicionado del rincon (3257) ----------------
       Colgado del techo, pegado a la lateral derecha y a la pared del
       fondo. Su cara de atras va de x = 1030 a la esquina (1106) y de
       y = 96,25 al techo hasta 168,75: 1,25 x 1,19 m. El frente (el del
       panel del rayo, 83,75 x 96,25 px) y la cara de las rejillas son su
       dibujo; la de las rejillas, enderezada, mide 110 x 72 -> el aire
       tiene 1,19 x 1,53 = 1,82 m de fondo. */
    const aW = (1106 - 1030) * K, aH = (168.75 - 96.25) * K, aL = aH * 110 / 72;
    const aCX = MX - aW / 2, aCY = ALTO - aH / 2, aCZ = MURO + aL / 2;
    B.addBox(aW, aH, aL, aCX, aCY, aCZ, 0x3c3c3c, { skip: 'FLR' });
    B.addBox(aW + T, T, T, aCX, ALTO - aH, MURO + aL, NEGRO, { luz: false });
    B.addBox(T, aH, T, MX - aW, aCY, MURO + aL, NEGRO, { luz: false });
    B.addBox(T, T, aL, MX - aW, ALTO - aH, aCZ, NEGRO, { luz: false });

    /* ---------------- los muebles del SWF ----------------
       Medidos en el render de la sala a 4x. Los del suelo van a la escala
       K sobre el suelo (miden lo que miden al lado de un personaje) y
       contra la pared; en x, los px del plano de la pared.

       BANCO (3307): frente de 190 x 46,25 px -> 3,11 x 0,76 m; en el plano
       de la pared va de x = 188,75 a 378,25. Tapa #2C2C2C, frente #585858,
       canto #3C3C3C; tres pares de puertas con marco y manijas #7A7A7A
       (pares en 175..230,5 / 238,25..293,5 / 300..355,5 del frente, de
       2,75 a 43,25 px sobre el suelo). Fondo: 0,62 m (un banco de taller;
       el escorzo del SWF no da un fondo real). */
    const trastos = [];
    const sq = (a, b, c, d, col) => B.addQuad(a, b, c, d, col, 1, true);
    {
      const x0 = X(188.75), x1 = X(378.25), h = 46.25 * K, zf = MURO + 0.62;
      const fx = (px) => x0 + (px - 170.75) / 190 * (x1 - x0);      // del frente del SWF a x
      sq([x0, 0, zf], [x1, 0, zf], [x1, h, zf], [x0, h, zf], 0x585858);                      // frente
      sq([x0, h, zf], [x1, h, zf], [x1, h, MURO], [x0, h, MURO], 0x2c2c2c);                  // tapa
      sq([x1, 0, zf], [x1, 0, MURO], [x1, h, MURO], [x1, h, zf], 0x3c3c3c);                  // cantos
      sq([x0, 0, MURO], [x0, 0, zf], [x0, h, zf], [x0, h, MURO], 0x3c3c3c);
      // tinta de las aristas que se ven
      B.addBox(x1 - x0 + T, T, T, (x0 + x1) / 2, h, zf, NEGRO, { luz: false });
      B.addBox(x1 - x0 + T, T, T, (x0 + x1) / 2, 0.01, zf, NEGRO, { luz: false });
      B.addBox(x1 - x0 + T, T, T, (x0 + x1) / 2, h, MURO + 0.01, NEGRO, { luz: false });
      for (const x of [x0, x1]) {
        B.addBox(T, h, T, x, h / 2, zf, NEGRO, { luz: false });
        B.addBox(T, T, zf - MURO, x, h, (zf + MURO) / 2, NEGRO, { luz: false });
      }
      const y0 = 2.75 * K, y1 = 43.25 * K, zp = zf + 0.006;
      for (const [a, b, m] of [[175, 230.5, 203], [238.25, 293.5, 265.75], [300, 355.5, 328]]) {
        const xa = fx(a), xb = fx(b), xm = fx(m);
        // marco claro del par, con su tinta, y la junta de las dos hojas
        for (const [w, hh, cx, cy] of [[xb - xa, 0.03, (xa + xb) / 2, y1], [xb - xa, 0.03, (xa + xb) / 2, y0],
                                       [0.03, y1 - y0, xa, (y0 + y1) / 2], [0.03, y1 - y0, xb, (y0 + y1) / 2]]) {
          B.addBox(w, hh, 0.012, cx, cy, zp, 0x7a7a7a, { luz: false });
        }
        B.addBox(0.022, y1 - y0, 0.014, xm, (y0 + y1) / 2, zp + 0.002, NEGRO, { luz: false });
        // manijas: barras en los bordes de fuera del par (297..304 y 519..525 px a 4x)
        for (const xh of [xa + 0.05, xb - 0.05]) B.addBox(0.035, (y1 - y0) * 0.86, 0.03, xh, (y0 + y1) / 2, zp + 0.012, 0x7a7a7a, {});
      }
      for (let i = 0; i < 4; i++) trastos.push({ x: x0 + (i + 0.5) * (x1 - x0) / 4, z: MURO + 0.3, r: 0.46 });
    }
    /* PAPELERA (3223): la boca de 111,75 a 154 px (0,69 m), el fondo de
       116,5 a 148,25 (0,52 m) y 51 px de alto (0,84 m) de la boca al suelo.
       Cuerpo #3C3C3C, aro #1E1E1E, dentro #242424, y el asa del costado. */
    {
      const cx = X(133), cz = MURO + 0.45, rT = 42.25 / 2 * K, rB = 31.75 / 2 * K, h = 51 * K;
      B.addCyl(rT, rB, h, 18, cx, h / 2, cz, 0x3c3c3c, { caps: false });
      B.addCyl(rT + 0.02, rT + 0.02, 0.07, 18, cx, h - 0.035, cz, 0x1e1e1e, { caps: false });
      B.addCyl(rT - 0.01, rT - 0.01, 0.01, 18, cx, h - 0.06, cz, 0x242424, {});   // lo oscuro de dentro
      B.addCyl(rB, rB, 0.01, 18, cx, 0.005, cz, 0x1e1e1e, {});
      // el asa: un arito en el costado izquierdo, a la altura del aro
      B.addBox(0.03, 0.12, 0.03, cx - rT - 0.05, h - 0.13, cz, 0x1e1e1e, {});
      B.addBox(0.06, 0.03, 0.03, cx - rT - 0.03, h - 0.07, cz, 0x1e1e1e, {});
      B.addBox(0.06, 0.03, 0.03, cx - rT - 0.03, h - 0.19, cz, 0x1e1e1e, {});
      trastos.push({ x: cx, z: cz, r: rT + 0.05 });
    }
    /* BOMBONA (3213): 16,5 px de ancho (0,27 m); cuerpo de 317,5 a 242,5
       (1,23 m con la cupula) y la valvula hasta 232,5. Tres bandas del
       SWF: #676767 arriba (249..267), #4A4A4A en medio y #676767 abajo
       (306..315); la valvula #999999. */
    {
      const cx = X(170.75), cz = MURO + 0.22, r = 16.5 / 2 * K, y = (py) => (317.5 - py) * K;
      B.addCyl(r, r, y(306), 16, cx, y(306) / 2, cz, 0x676767, { caps: false });
      B.addCyl(r, r, y(267) - y(306), 16, cx, (y(267) + y(306)) / 2, cz, 0x4a4a4a, { caps: false });
      B.addCyl(r, r, y(249) - y(267), 16, cx, (y(249) + y(267)) / 2, cz, 0x676767, { caps: false });
      B.addEllipsoid(r, y(242.5) - y(249), r, cx, y(249), cz, 0x676767, {});
      B.addCyl(0.025, 0.025, 0.10, 8, cx, y(242.5) + 0.05, cz, 0x333333, {});
      B.addEllipsoid(0.045, 0.045, 0.045, cx + 0.03, y(238.25), cz, 0x999999, {});
      trastos.push({ x: cx, z: cz, r: r + 0.05 });
    }

    /* ---------------- LA TIENDA ----------------

       El SWF no tiene tienda dentro de la sala: en la arena, 'storeRoster'
       es una ventana del menu. Aqui es un MOSTRADOR abierto en la pared del
       fondo, a la derecha del cartel y centrado en el hueco que el SWF deja
       para los armeros (x = 502..1022 px): un vano ancho y bajo, con el
       marco de las puertas del juego (#4F4F4F con sus dos lineas oscuras),
       un cuarto cuadrado detras con el tendero, y el cartel de SHOP encima.

         vano      4,4 m de ancho, de 1,05 m (el mostrador, altura de
                   barra) a 2,55 m; centrado en x = 762 px
         cuarto    5,2 x 4 m y 3,3 m de techo, detras de 30 cm de muro,
                   con una tarima de 50 cm: el Grunt tiene el torso hasta
                   1,1 m y la cabeza encima, asi que a pie de suelo -y con
                   28 cm- solo asomaba la cabeza por encima del mostrador;
                   con 50 se le ve el pecho y los puños, apoyado en el */
    const SH = Armeria.SHOP = { x: X(762), an: 4.4, y0: 1.05, y1: 2.55, muro: 0.30, fondo: 4.0, alto: 3.3, tarima: 0.50 };
    SH.x0 = SH.x - SH.an / 2; SH.x1 = SH.x + SH.an / 2;
    {
      const zi = MURO - SH.muro;                 // la cara de dentro del muro
      const zb = zi - SH.fondo;                   // la pared del fondo del cuarto
      const cx0 = SH.x0 - 0.4, cx1 = SH.x1 + 0.4; // el cuarto, un poco mas ancho que el vano
      // el grueso del muro en el vano: jambas, dintel y el alfeizar bajo el mostrador
      sq([SH.x0, SH.y0, MURO], [SH.x0, SH.y0, zi], [SH.x0, SH.y1, zi], [SH.x0, SH.y1, MURO], 0x4a4a4a);
      sq([SH.x1, SH.y0, zi], [SH.x1, SH.y0, MURO], [SH.x1, SH.y1, MURO], [SH.x1, SH.y1, zi], 0x4a4a4a);
      sq([SH.x0, SH.y1, MURO], [SH.x0, SH.y1, zi], [SH.x1, SH.y1, zi], [SH.x1, SH.y1, MURO], 0x3a3a3a);
      // el cuarto: suelo, techo, fondo y costados (los mira el vano desde fuera)
      const ta = SH.tarima;
      sq([cx0, ta, zi], [cx1, ta, zi], [cx1, ta, zb], [cx0, ta, zb], 0x4c4c4c);
      sq([cx0, 0, zi], [cx1, 0, zi], [cx1, ta, zi], [cx0, ta, zi], 0x3a3a3a);
      sq([cx0, SH.alto, zb], [cx1, SH.alto, zb], [cx1, SH.alto, zi], [cx0, SH.alto, zi], 0x3a3a3a);
      sq([cx0, 0, zb], [cx1, 0, zb], [cx1, SH.alto, zb], [cx0, SH.alto, zb], 0x565656);
      sq([cx0, 0, zi], [cx0, 0, zb], [cx0, SH.alto, zb], [cx0, SH.alto, zi], 0x4e4e4e);
      sq([cx1, 0, zb], [cx1, 0, zi], [cx1, SH.alto, zi], [cx1, SH.alto, zb], 0x4e4e4e);
      // la cara de dentro del muro del vano (se ve de canto por los lados)
      sq([cx1, 0, zi], [cx0, 0, zi], [cx0, SH.alto, zi], [cx1, SH.alto, zi], 0x4e4e4e);
      // la tinta de las esquinas del cuarto
      for (const x of [cx0, cx1]) B.addBox(T, SH.alto, T, x, SH.alto / 2, zb + T / 2, NEGRO, { luz: false });
      B.addBox(cx1 - cx0, T, T, (cx0 + cx1) / 2, 0.01, zb + T / 2, NEGRO, { luz: false });
      B.addBox(cx1 - cx0, T, T, (cx0 + cx1) / 2, SH.alto - 0.01, zb + T / 2, NEGRO, { luz: false });
      /* El tablero de las armas en el fondo del cuarto: un panel oscuro
         con su marco, donde cuelgan (mas abajo, con sus mallas). */
      const tb = { x0: SH.x - 2.2, x1: SH.x + 2.2, y0: 1.3, y1: 2.9 };
      B.addBox(tb.x1 - tb.x0, tb.y1 - tb.y0, 0.04, SH.x, (tb.y0 + tb.y1) / 2, zb + 0.03, 0x333333, { luz: false });
      for (const [w, h, x, y] of [[tb.x1 - tb.x0 + 0.08, 0.06, SH.x, tb.y1], [tb.x1 - tb.x0 + 0.08, 0.06, SH.x, tb.y0],
                                  [0.06, tb.y1 - tb.y0, tb.x0, (tb.y0 + tb.y1) / 2], [0.06, tb.y1 - tb.y0, tb.x1, (tb.y0 + tb.y1) / 2]]) {
        B.addBox(w, h, 0.06, x, y, zb + 0.05, 0x4f4f4f, { luz: false });
      }
      SH.tablero = tb; SH.zb = zb;
      /* La lampara: una pantalla colgada sobre el mostrador por dentro, la
         unica luz de la sala; la bombilla sin sombra. */
      /* Pegada al techo y a media sala: por debajo tapaba las armas del
         tablero (que llega a 2,9 m) y la cabeza del tendero. */
      const lz = zi - 1.8;
      B.addBox(0.02, 0.12, 0.02, SH.x, SH.alto - 0.06, lz, NEGRO, { luz: false });
      B.addCyl(0.08, 0.30, 0.16, 16, SH.x, SH.alto - 0.20, lz, 0x2a2a2a, { caps: false });
      B.addEllipsoid(0.08, 0.06, 0.08, SH.x, SH.alto - 0.28, lz, 0xf2eed8, { luz: false });
      /* EL MOSTRADOR: una losa que sale 35 cm hacia la sala y 45 hacia
         dentro, de 8 cm de grueso, con su canto oscuro y la tinta; debajo,
         el frente del muro sigue siendo la pared (con su dibujo). */
      const m0 = SH.x0 - 0.15, m1 = SH.x1 + 0.15, mz0 = zi - 0.45, mz1 = MURO + 0.35, my = SH.y0;
      B.addBox(m1 - m0, 0.08, mz1 - mz0, SH.x, my + 0.04, (mz0 + mz1) / 2, 0x4f4f4f, {});
      B.addBox(m1 - m0, 0.03, 0.02, SH.x, my + 0.08, mz1, 0x2a2a2a, { luz: false });
      B.addBox(m1 - m0 + T, T, T, SH.x, my, mz1, NEGRO, { luz: false });
      B.addBox(m1 - m0 + T, T, T, SH.x, my + 0.08, mz1, NEGRO, { luz: false });
      // mensulas debajo, contra la pared
      for (const x of [m0 + 0.35, SH.x, m1 - 0.35]) B.addBox(0.06, 0.28, 0.3, x, my - 0.14, MURO + 0.16, 0x2e2e2e, {});
      /* El marco del vano, como el de las puertas: #4F4F4F con la linea
         #1B1B1B por fuera y la #1A1A1A pegada al hueco. 12 cm. */
      const FM = 0.12, fz = MURO + 0.02;
      for (const [w, h, x, y] of [[SH.an + 2 * FM, FM, SH.x, SH.y1 + FM / 2], [FM, SH.y1 - SH.y0 + FM, SH.x0 - FM / 2, (SH.y0 + SH.y1 + FM) / 2],
                                  [FM, SH.y1 - SH.y0 + FM, SH.x1 + FM / 2, (SH.y0 + SH.y1 + FM) / 2]]) {
        B.addBox(w, h, 0.04, x, y, fz, 0x4f4f4f, { luz: false });
      }
      B.addBox(SH.an + 2 * FM, 0.02, 0.01, SH.x, SH.y1 + FM, fz + 0.021, 0x1b1b1b, { luz: false });
      for (const s of [-1, 1]) {
        B.addBox(0.02, SH.y1 - SH.y0 + FM, 0.01, SH.x + s * (SH.an / 2 + FM), (SH.y0 + SH.y1 + FM) / 2, fz + 0.021, 0x1b1b1b, { luz: false });
        B.addBox(0.02, SH.y1 - SH.y0, 0.01, SH.x + s * SH.an / 2, (SH.y0 + SH.y1) / 2, fz + 0.021, 0x1a1a1a, { luz: false });
      }
      B.addBox(SH.an, 0.02, 0.01, SH.x, SH.y1, fz + 0.021, 0x1a1a1a, { luz: false });
      for (let i = 0; i < 5; i++) trastos.push({ x: SH.x0 + (i + 0.5) * SH.an / 5, z: MURO + 0.1, r: 0.34 });
    }
    Armeria.trastos = trastos.map((q) => ({ x: q.x + Armeria.CX, z: q.z, r: q.r }));

    const malla = new THREE.Mesh(B.build(), Art.mats.plano);
    malla.frustumCulled = false;
    g.add(malla);

    /* ---------------- lo que es dibujo del SWF: un atlas ----------------
       Pared, laterales, cartel y frentes van en UN lienzo y UNA malla. Las
       imagenes vienen en data: (armeria_swf.js) y se pintan en el atlas al
       cargar; mientras, la malla sale con el gris de la pared. */
    const D = global.ARMERIA_SWF;
    const piezas = ['pared', 'lado', 'cartel', 'tablero', 'caja', 'aire', 'rejilla'];
    // colocacion en el atlas: pared y lado apilados, lo pequeño en una fila debajo
    const pos = {}; let fx = 0; const AW = 2048;
    pos.pared = [0, 0]; pos.lado = [0, D.pared.h + 2];
    const fy = pos.lado[1] + D.lado.h + 2;
    for (const k of piezas.slice(2)) { pos[k] = [fx, fy]; fx += D[k].w + 2; }
    const AH = fy + Math.max.apply(null, piezas.slice(2).map((k) => D[k].h));
    const lienzo = document.createElement('canvas');
    lienzo.width = AW; lienzo.height = AH;
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#616161'; ctx.fillRect(0, 0, AW, AH);
    const tex = new THREE.CanvasTexture(lienzo);
    tex.colorSpace = THREE.SRGBColorSpace;
    for (const k of piezas) {
      const im = new Image();
      im.onload = () => { ctx.clearRect(pos[k][0], pos[k][1], D[k].w, D[k].h);
                          ctx.drawImage(im, pos[k][0], pos[k][1]); tex.needsUpdate = true; };
      im.src = D[k].src;
    }
    // uv de un trozo de una pieza del atlas: u0..u1, v0..v1 en fracciones de la pieza
    const uv = (k, u0, u1, v0, v1) => {
      const p = pos[k], d = D[k];
      return [(p[0] + u0 * d.w) / AW, (p[0] + u1 * d.w) / AW,
              1 - (p[1] + v1 * d.h) / AH, 1 - (p[1] + v0 * d.h) / AH];
    };
    const P = [], UV = [], IDX = [];
    // un quad: esquinas abajo-izq, abajo-der, arriba-der, arriba-izq y su uv
    const quad = (a, b, c, d, u) => {
      const n = P.length / 3;
      P.push(...a, ...b, ...c, ...d);
      UV.push(u[0], u[2], u[1], u[2], u[1], u[3], u[0], u[3]);
      IDX.push(n, n + 1, n + 2, n, n + 2, n + 3);
    };
    /* La pared del fondo: el dibujo entero entre las dos esquinas. */
    /* partida por el vano de la tienda: izquierda, derecha, debajo y
       encima, cada trozo con su parte del dibujo */
    const trozo = (xa, xb, ya, yb) => quad([xa, ya, MURO], [xb, ya, MURO], [xb, yb, MURO], [xa, yb, MURO],
      uv('pared', (xa + MX) / (2 * MX), (xb + MX) / (2 * MX), 1 - yb / ALTO, 1 - ya / ALTO));
    trozo(-MX, SH.x0, 0, ALTO); trozo(SH.x1, MX, 0, ALTO);
    trozo(SH.x0, SH.x1, 0, SH.y0); trozo(SH.x0, SH.x1, SH.y1, ALTO);
    /* Las laterales: el mismo dibujo con sus grises, a la misma escala
       (16,66 m de ancho de dibujo), sin estirar. La izquierda deja el
       hueco de la puerta por donde se vuelve a la arena. */
    const fr = (Z1 - Z0) / Armeria.ANCHO;
    const PA = Arena.P_ALTO, PAN = PA / Art.aspectoPuerta('normal'), PZ = Armeria.PUERTA_Z;
    const zA = PZ - PAN / 2, zB = PZ + PAN / 2;
    const lat = (x, za, zb, ya, yb, der) => {
      const u0 = (za - Z0) / Armeria.ANCHO, u1 = (zb - Z0) / Armeria.ANCHO;
      const v0 = 1 - yb / ALTO, v1 = 1 - ya / ALTO;
      if (der) quad([x, ya, za], [x, ya, zb], [x, yb, zb], [x, yb, za], uv('lado', u0, u1, v0, v1));
      else quad([x, ya, zb], [x, ya, za], [x, yb, za], [x, yb, zb], uv('lado', u0, u1, v0, v1));
    };
    lat(MX, Z0, Z1, 0, ALTO, false);
    lat(-MX, Z0, zA, 0, ALTO, true);
    lat(-MX, zB, Z1, 0, ALTO, true);
    lat(-MX, zA, zB, PA, ALTO, true);
    void fr;
    /* El cartel 3405: 93 x 57,5 px, en (438,3; 258,15) y girado 3,3 grados
       (su matriz: b = 0,058). */
    {
      const w = 93 * K, h = 57.5 * K, cx = X(438.3), cy = Y(258.15), z = MURO + 0.012;
      const a = -Math.atan2(0.058, 0.998), c = Math.cos(a), s = Math.sin(a);
      const pt = (dx, dy) => [cx + dx * c - dy * s, cy + dx * s + dy * c, z];
      quad(pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2), uv('cartel', 0, 1, 0, 1));
    }
    for (const q of cajas) {
      quad([q.x - q.w / 2, q.y - q.h / 2, q.z], [q.x + q.w / 2, q.y - q.h / 2, q.z],
           [q.x + q.w / 2, q.y + q.h / 2, q.z], [q.x - q.w / 2, q.y + q.h / 2, q.z], uv(q.tex, 0, 1, 0, 1));
    }
    // el aire: el frente del panel y la cara de las rejillas (mira a la sala: -x)
    {
      const zF = MURO + aL + 0.002, y0 = ALTO - aH, xL = MX - aW - 0.002;
      quad([MX - aW, y0, zF], [MX, y0, zF], [MX, ALTO, zF], [MX - aW, ALTO, zF], uv('aire', 0, 1, 0, 1));
      quad([xL, y0, MURO], [xL, y0, MURO + aL], [xL, ALTO, MURO + aL], [xL, ALTO, MURO], uv('rejilla', 0, 1, 0, 1));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    geo.setIndex(IDX);
    const dib = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide }));
    dib.frustumCulled = false;
    g.add(dib);

    /* ---------------- la puerta de vuelta a la arena ----------------
       En el SWF la sala tiene su puerta en la lateral izquierda
       (PHdoor0). Es la misma puerta de la arena, montada con Arena.puerta. */
    const pu = Arena.puerta({ x: -MX - 0.09, dir: 'izq' }, 0);
    pu.grupo.position.z = PZ;
    g.add(pu.grupo);
    Armeria.puerta = pu;
    pu.x = Armeria.CX - MX; pu.z = PZ;

    /* ---------------- el cartel de SHOP ----------------
       Encima del vano, con la placa del ARMORY (Art.texCartelShop) y su
       mismo aire: un poco torcido (el ARMORY va 5,3 grados; este 2). */
    {
      const w = 2.3, h = w * Art.CARTEL_SHOP.aspecto;
      const cart = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: Art.texCartelShop(), transparent: true }));
      cart.position.set(SH.x, SH.y1 + 0.12 + 0.18 + h / 2, MURO + 0.05);
      cart.rotation.z = -2 * Math.PI / 180;
      g.add(cart);
    }
    /* ---------------- las armas del tablero ----------------
       Las del propio juego (Weapons.crear), de perfil a la sala y con el
       cañon a la DERECHA, como en el hueco del arma del HUD. Dos filas en
       el tablero de 4,4 x 1,6 m: arriba las largas (fusil 1,66 m y
       escopeta 1,97 m, con 34 cm entre las dos), abajo el subfusil, la
       pistola y la magnum. Cada una se centra por su CAJA -el origen de
       la malla es el de la empuñadura, no el centro- y apoya en dos
       ganchos del tablero. */
    if (global.Weapons) {
      const tb = SH.tablero, zc = SH.zb + 0.12, cajaA = new THREE.Box3(), cen = new THREE.Vector3(), tam = new THREE.Vector3();
      const G = U.builder();
      const pon = (id, cx, cy) => {
        const m = Weapons.crear(id);
        if (!m) return;
        m.rotation.y = Math.PI / 2;           // el cañon (+Z de la malla) hacia +X
        m.updateMatrixWorld(true);
        cajaA.setFromObject(m); cajaA.getCenter(cen); cajaA.getSize(tam);
        m.position.set(cx - cen.x, cy - cen.y, zc - cen.z);
        g.add(m);
        // los ganchos: dos clavijas bajo el arma, a un cuarto de cada punta
        for (const f of [-0.28, 0.28]) {
          G.addBox(0.035, 0.035, 0.14, cx + f * tam.x, cy - tam.y / 2 - 0.02, SH.zb + 0.11, 0x1e1e1e, {});
        }
      };
      const fila1 = tb.y1 - 0.42, fila2 = tb.y0 + 0.42;
      pon('fusil', SH.x - 1.05, fila1);
      pon('escopeta', SH.x + 1.10, fila1);
      pon('subfusil', SH.x - 1.35, fila2);
      pon('pistola', SH.x - 0.05, fila2);
      pon('magnum', SH.x + 1.25, fila2);
      const ganchos = new THREE.Mesh(G.build(), Art.mats.plano);
      ganchos.frustumCulled = false;
      g.add(ganchos);
    }

    Armeria.grupo = g;
    return g;
  };

  /* Donde esta la puerta, en la lateral izquierda: la z de las puertas
     laterales de la arena. */
  Armeria.PUERTA_Z = 1.75;
  /* El tope de la pelea dentro: medio metro de la pared (el radio del
     muñeco y algo). */
  Armeria.MARGEN = 0.5;

  /* La hoja de la puerta: el mismo ciclo y la misma curva que las de la
     arena (Arena.cicloPuerta). */
  Armeria.paso = function (dt) {
    if (Armeria.puerta) Arena.cicloPuerta(Armeria.puerta, dt);
    const t = Armeria.tendero;
    if (t && global.Game && Game.sala === 'armeria') {
      t.mover = 0; t.moverZ = 0; t.rumboObj = Math.PI / 2;
      Actor.actualizar(t, dt, Game.tiempo || 0);
    }
  };

  /* EL TENDERO: un Grunt detras del mostrador, mirando a la sala. No es
     un enemigo ni un objetivo: no esta en Game.actores y no tiene cerebro.
     Va sin tope (esta detras de la pared del fondo) y quieto. */
  Armeria.crearTendero = function (escena) {
    if (Armeria.tendero || !Armeria.SHOP) return Armeria.tendero;
    const SH = Armeria.SHOP;
    const t = Actor.crear({ tipo: 'grunt', arma: 'puños', x: Armeria.CX + SH.x, mirando: 1, z: 0 });
    t.z = Arena.FONDO + 0.25 - SH.muro - 0.6;
    t.sinTope = true; t.rumbo = t.rumboObj = Math.PI / 2; t.vida = 1e9;
    /* sobre la tarima: el grupo del muñeco cuelga de un nodo subido
       (su y la pone Actor a ras de suelo cada fotograma) */
    const tarima = new THREE.Group();
    tarima.position.y = SH.tarima;
    tarima.add(t.grupo);
    escena.add(tarima);
    Armeria.tendero = t;
    return t;
  };

  global.Armeria = Armeria;
})(window);

