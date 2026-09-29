/* =================================================================
   LA TAC BAR, SACADA DEL SWF

   Dos cosas estaban mal y las dos eran por hacerlo de memoria.

   DONDE VA. La tenia en la esquina del HUD. El SWF no deja lugar a
   dudas: es un HIJO del personaje.

     r1.myTacBar._alpha = 0;                        // al nacer
     r1.myTacBar._xscale = (myFacing=='left') ? -100 : 100;
     r1.myTacBar._visible = false;                  // en paintMe()

   Ese _xscale es la prueba -se invierte con la cara del muñeco
   porque cuelga de el- y paintMe(), que hornea el cadaver en el
   mapa de bits de cuerpos, la esconde justo antes: si estuviera en
   el HUD no haria falta. En el simbolo madness_character esta
   colocada en (0,1, -98,5), o sea justo encima de la cabeza.

   COMO ES. Aqui me la invente entera: cuatro bloques rojos macizos.
   No es eso. Leyendo el simbolo 5340 y sus formas:

     5318  el marco, #FE4545. NO son dos rectangulos: son dos ARCOS
           que se afilan hacia las puntas. El de arriba mide 33,30 x
           3,85 px y el de abajo 20,85 x 1,70. Dibujados a mano, con
           la punta en cero, como todo en Madness.
     5319..5324  el punto: un RECTANGULO HUECO. Solo trazo, 1,5 px,
           sin relleno ninguno, de 6,55 x 7,20 px, y colocado con
           escala (0,98, 1,43) -o sea estirado a lo alto-.

   Los cuatro puntos van en x = -13,3 / -4,4 / +4,7 / +13,6, y los
   de los extremos bajan 1,2 px respecto a los del medio. dot1 es el
   de la DERECHA, que cuadra con el umbral del original -el de
   indice mas alto pide mas barra-: se vacia de derecha a izquierda.

   EL DESTELLO. Cada punto es un clip de dos fotogramas, y cada uno
   de esos dos es a su vez una animacion de cinco:

     gotoAndStop(1) -> apagarse:  #FF0000, #FE6767, #FFFFFF, #FE6767, #FE6767
     gotoAndStop(2) -> encenderse: #FE6767, #FEB4B4, #FFFFFF, #FE6767, #FF0000

   O sea que al cambiar de estado el punto PEGA UN FOGONAZO BLANCO y
   despues se queda. Eso es lo que se ve como "se van desvaneciendo".
   Diez fotogramas a 30 fps son 0,33 s; el blanco cae por la mitad.

   LA UNICA LIBERTAD QUE ME TOMO. En el original el punto apagado
   queda en #FE6767, un rosa palido: lo que distingue encendido de
   apagado es la SATURACION, no el brillo. En un monitor de
   escritorio con el muñeco a 90 px se lee; en un TCL 20SE con la
   barra a 30 px, no. Asi que el apagado va ademas a menos alfa.
   Es el unico numero de aqui que no sale del archivo.

   LA ESCALA. En coordenadas del muñeco la barra va en y = -98,5 y
   mide 33,30 px de ancho. La cabeza acaba sobre los -90, asi que la
   barra mide un 37% de lo que mide el personaje y se centra a 1,10
   de su altura. Con 1,8 m de muñeco: 0,666 x 0,379 m.
   ================================================================= */
(function (global) {
  'use strict';

  const T = {};
  const CUPO = 8;            // cuantas barras puede haber a la vez

  /* --- todo esto en pixeles del SWF, tal cual se leyo --- */
  /* La caja del simbolo es exactamente x -16,65..16,65 e
     y -9,70..9,20. Se le da medio pixel de margen por cada lado:
     sin el, el arco de abajo -que mide 1,70 px de grueso y llega
     justo al borde- se quedaba medio fuera del lienzo y el
     suavizado se comia el resto. Desaparecia. */
  const M = 0.6;
  const CAJA = { x0: -16.65 - M, x1: 16.65 + M, y0: -9.70 - M, y1: 9.20 + M };
  const ARCO = '#FE4545';
  const ENCENDIDO = '#FF0000';
  const APAGADO = '#FE6767';
  const FOGONAZO = '#FFFFFF';

  /* El arco de arriba (33,30 x 3,85) y el de abajo (20,85 x 1,70),
     con sus trece puntos cada uno. */
  const ARCO_ALTO = [[-16.65,-5.85],[-11.05,-6.70],[-5.45,-7.25],[0.10,-7.40],
                     [5.65,-7.25],[11.15,-6.70],[16.65,-5.85],[11.15,-8.00],
                     [5.65,-9.30],[0.10,-9.70],[-5.45,-9.30],[-11.05,-8.00]];
  const ARCO_BAJO = [[10.50,8.35],[7.20,7.90],[3.85,7.60],[0.40,7.50],
                     [-3.10,7.60],[-6.70,7.90],[-10.35,8.35],[-6.85,8.85],
                     [-3.35,9.15],[0.10,9.20],[3.60,9.15],[7.05,8.85]];

  /* El punto, en su propio sistema, y donde va cada uno. dot1 es el
     de la derecha. */
  const PUNTO = [[3.15,3.60],[-3.40,3.60],[-3.40,-3.60],[3.15,-3.60]];
  const TRAZO = 1.50;
  const SITIOS = [                       // de izquierda (dot4) a derecha (dot1)
    { x: -13.3, y: 1.4, ex: 0.980, ey: 1.411 },
    { x:  -4.4, y: 0.2, ex: 0.991, ey: 1.427 },
    { x:   4.7, y: 0.2, ex: 0.991, ey: 1.427 },
    { x:  13.6, y: 1.4, ex: 0.980, ey: 1.411 }
  ];
  const TRAMOS = SITIOS.length;

  const ANCHO = 0.666;       // metros
  const ALTO = ANCHO * (CAJA.y1 - CAJA.y0) / (CAJA.x1 - CAJA.x0);
  /* Altura del centro de la barra, en alturas de personaje. En el
     original va en y = -98,5 con la cabeza acabando sobre los -90,
     o sea a 1,09 de la altura del muñeco. */
  const SOBRE = 1.09;
  const DESTELLO = 0.16;     // lo que dura el fogonazo blanco, en segundos

  let planos = null;
  const _v = new THREE.Vector3();
  const estado = [];         // por actor: ultimo numero de tramos y su destello

  /* -----------------------------------------------------------------
     EL LIENZO, Y POR QUE ES TAN CHICO

     La barra ocupa unos 46 px en pantalla -medido-. Dibujandola a
     333 px y dejando que el filtro la reduzca 7 veces pasaba esto,
     fila a fila:

       #........########........#########........#########.......##

     Eso no son cuatro cuadrados huecos: son CINCO barras. Los
     trazos de dos puntos vecinos se habian fundido. La cuenta:
     entre dos puntos hay 2,5 px de sprite y cada trazo se come
     0,75 por lado, asi que el hueco de tinta real es de UN pixel
     del sprite -1,4 px en pantalla-. Cualquier filtro se lo traga.

     Dos arreglos, y los dos son medidas, no gustos:

       1. El lienzo va a 64x32, que es casi el tamaño en el que se
          ve. Sin reduccion no hay nada que fundir. Y todo se ajusta
          a pixeles enteros del lienzo para que los cuatro puntos
          salgan calcados en vez de cada uno con el trazo de un
          ancho.
       2. El hueco de tinta pasa de 1,0 a 2,0 px de sprite
          estrechando cada punto un 15%. ES LA UNICA LIBERTAD QUE ME
          TOMO CON LA FORMA, y hace falta: el original se dibujaba
          como vector a 33 px en una pantalla de 850x530, con el
          borde nitido. Aqui es una textura sobre un plano en 3D y
          un hueco de pixel y medio no sobrevive al muestreo.

     Todo lo demas -los arcos, el paso entre puntos, la altura
     estirada, los colores- se queda como esta en el archivo.
     ----------------------------------------------------------------- */
  const LIENZO_W = 64, LIENZO_H = 32;
  const SX = LIENZO_W / (CAJA.x1 - CAJA.x0);
  const SY = LIENZO_H / (CAJA.y1 - CAJA.y0);
  const ESTRECHA = 0.85;     // ver punto 2 de arriba
  function px(x) { return (x - CAJA.x0) * SX; }
  function py(y) { return (y - CAJA.y0) * SY; }

  function camino(g, pts) {
    g.beginPath();
    g.moveTo(px(pts[0][0]), py(pts[0][1]));
    for (let i = 1; i < pts.length; i++) g.lineTo(px(pts[i][0]), py(pts[i][1]));
    g.closePath();
  }

  /* -----------------------------------------------------------------
     UNA TEXTURA POR ESTADO: cuantos tramos quedan encendidos y, si
     acaba de cambiar, cual esta dando el fogonazo. Cinco cuentas por
     cinco destellos posibles -ninguno, o uno de los cuatro- son
     veinte lienzos de 64x32, que se generan una vez y ya.
     ----------------------------------------------------------------- */
  function texTac(encendidos, destello) {
    const c = document.createElement('canvas');
    c.width = LIENZO_W; c.height = LIENZO_H;
    const g = c.getContext('2d');

    g.fillStyle = ARCO;
    camino(g, ARCO_ALTO); g.fill();
    camino(g, ARCO_BAJO); g.fill();

    /* El trazo, en pixeles enteros del lienzo: si sale fraccionario
       cada punto lo reparte distinto entre dos columnas y se ven
       disparejos. */
    const tr = Math.max(1, Math.round(TRAZO * SX));
    g.lineWidth = tr;
    g.lineJoin = 'miter';

    /* LOS CUATRO PUNTOS, IDENTICOS.

       En el archivo no lo son del todo: los de los extremos van a
       escala 0,980 y los del medio a 0,991, y los extremos bajan
       1,2 px. Es el temblor de haberlo dibujado a mano, y a 33 px
       con borde vectorial no se nota.

       Aqui si: medido en pantalla, esas diferencias del 1% mas el
       redondeo del muestreo daban trazos de 2, 3, 4 y 5 px en la
       misma barra. Se veia sucio. Asi que el ancho, el alto y el
       trazo se calculan UNA VEZ, en pixeles enteros de lienzo, y
       los cuatro usan los mismos numeros; lo unico que cambia es
       donde va cada uno.

       El paso sale de los extremos del archivo -de -13,3 a +13,6 en
       tres saltos- para no perder el ancho real de la barra. */
    const ESC_X = (SITIOS[0].ex + SITIOS[1].ex) * 0.5;
    const ESC_Y = (SITIOS[0].ey + SITIOS[1].ey) * 0.5;
    const AN = Math.round((PUNTO[0][0] - PUNTO[1][0]) * ESC_X * ESTRECHA * SX);
    const AL = Math.round((PUNTO[0][1] - PUNTO[3][1]) * ESC_Y * SY);
    const X0 = SITIOS[0].x, PASO = (SITIOS[TRAMOS - 1].x - X0) / (TRAMOS - 1);
    const CY = py((SITIOS[0].y + SITIOS[1].y) * 0.5);
    /* Medio pixel de desfase cuando el trazo es impar: centrado en
       un borde entero se repartiria entre dos columnas. */
    const med = (tr % 2) ? 0.5 : 0;
    const y0 = Math.round(CY - AL / 2) + med;

    for (let k = 0; k < TRAMOS; k++) {
      /* dot1 -el de la derecha, k=3- pide mas barra, asi que es el
         primero en apagarse: los encendidos se cuentan desde la
         izquierda. */
      const vivo = k < encendidos;
      const cx = px(X0 + PASO * k) +
                 (PUNTO[0][0] + PUNTO[1][0]) * 0.5 * ESC_X * ESTRECHA * SX;
      const x0 = Math.round(cx - AN / 2) + med;

      g.globalAlpha = (k === destello) ? 1 : (vivo ? 1 : 0.45);
      g.strokeStyle = (k === destello) ? FOGONAZO : (vivo ? ENCENDIDO : APAGADO);
      g.beginPath();
      g.rect(x0, y0, AN, AL);
      g.stroke();
      g.globalAlpha = 1;
    }

    const t = new THREE.CanvasTexture(c);
    /* Sin mipmaps a proposito: el lienzo ya esta al tamaño en el que
       se ve, asi que no hay reduccion que filtrar, y un mipmap solo
       serviria para emborronar los trazos. */
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
  }

  T.init = function (escena) {
    if (planos) return;
    T.texturas = [];
    for (let n = 0; n <= TRAMOS; n++) {
      const fila = [];
      for (let d = -1; d < TRAMOS; d++) fila.push(texTac(n, d));
      T.texturas.push(fila);
    }

    const g = new THREE.PlaneGeometry(ANCHO, ALTO);
    planos = [];
    for (let i = 0; i < CUPO; i++) {
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        map: T.texturas[TRAMOS][0], transparent: true,
        depthTest: false, depthWrite: false
      }));
      /* Por encima de todo lo del mundo pero por debajo de la mira:
         si una barra tapa el puntero, el puntero deja de servir. */
      m.renderOrder = 80;
      m.visible = false;
      escena.add(m);
      planos.push(m);
    }
  };

  function tex(n, d) { return T.texturas[n][d + 1]; }

  T.dibujar = function (actores, cam, dt) {
    if (!planos) return;
    let n = 0;
    for (let i = 0; i < actores.length; i++) {
      const A = actores[i];
      if (!A.tacMax) continue;

      /* Cuantos tramos quedan. Es el umbral del original:
         el tramo k sigue encendido mientras tac > max - (max/4)*(k+1). */
      const viv = Math.max(0, Math.min(TRAMOS,
        Math.ceil(A.tac / (A.tacMax / TRAMOS) - 1e-6)));

      let E = estado[i];
      if (!E || E.a !== A) E = estado[i] = { a: A, n: viv, t: 0, d: -1 };
      if (viv !== E.n) {
        /* El que acaba de cambiar es el que pega el fogonazo. */
        E.d = Math.min(TRAMOS - 1, Math.max(viv, E.n) - 1);
        E.t = DESTELLO;
        E.n = viv;
      }
      if (E.t > 0) { E.t -= dt; if (E.t <= 0) E.d = -1; }

      if (!(A.tacMostrar > 0) || n >= CUPO) continue;
      const p = planos[n++];
      const m = tex(viv, E.d);
      if (p.material.map !== m) p.material.map = m;

      /* DONDE VA, Y POR QUE NO ES A.x.

         En el original la barra cuelga del personaje en (0,1,
         -98,5): x cero y altura fija. Y ahi da igual porque el
         muñeco es plano.

         Aqui el cuerpo va girado 55 grados hacia camara, asi que la
         cabeza queda ADELANTADA y en pantalla se corre de lado:
         medido, con la barra en A.x la cara estaba en x=304 y la
         barra en x=284, veinte pixeles a la izquierda. Se veia
         descentrada porque lo estaba.

         La primera correccion fue colgarla del hueso de la cabeza y
         eso trajo un fallo peor: el hueso respira, asi que la barra
         se acercaba y se alejaba de camara y CAMBIABA DE TAMAÑO
         -medido: de 52 a 62 px entre dos fotogramas del reposo-.

         Asi que se usa el desplazamiento de REPOSO de la cabeza,
         girado por el giro del actor. Queda centrada sobre la
         cabeza y quieta como una chapa, que es lo que es. La altura
         y la profundidad salen del actor, no del hueso: asi el
         tamaño en pantalla no depende de la animacion. */
      let dx = 0;
      const hc = A.cuerpo && A.cuerpo.huesos && A.cuerpo.huesos[Chars.H.CABEZA];
      if (hc) {
        const c = Math.cos(A.giro), sn = Math.sin(A.giro);
        dx = (hc.position.x * c + hc.position.z * sn) * A.cuerpo.escala;
      }
      p.position.set(A.x + dx, A.y + A.alto * SOBRE, A.z);
      p.quaternion.copy(cam.quaternion);
      p.material.opacity = Math.min(1, A.tacMostrar / Actor.TAC_VER_MIN);
      p.visible = true;
    }
    for (let i = n; i < CUPO; i++) planos[i].visible = false;
  };

  T.limpiar = function () {
    estado.length = 0;
    if (!planos) return;
    for (let i = 0; i < planos.length; i++) planos[i].visible = false;
  };

  global.TacBar = T;
})(window);

