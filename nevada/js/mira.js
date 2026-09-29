/* =============================================================
   mira.js -> El puntero de punteria, al estilo de Project Nexus.

   POR QUE HACIA FALTA

   La punteria tactil era una ELEVACION y nada mas. El dedo
   arrastraba sobre el gatillo y eso sumaba en un acumulador,
   't.apuntaY', que se recortaba a +-0,9 radianes y NO SE DEVOLVIA
   NUNCA A CERO. Dos arrastres hacia arriba y el arma se quedaba
   clavada apuntando 51 grados al cielo para el resto de la partida.
   De ahi que las armas de fuego fueran inservibles: no es que
   apuntaran mal, es que el mando no tenia forma de volver.

   Y ademas el lado salia del propio angulo, asi que era un bucle
   cerrado: el dedo movia la elevacion y nadie movia el costado.

   COMO LO HACE EL ORIGINAL

   En MPN hay un PUNTO en el mundo -una mira de circulo y radios,
   roja- y del arma sale una linea hasta ella. El personaje apunta a
   donde esta la mira; no hay angulo que acumular. Medido sobre una
   captura del juego a 960 de ancho, la mira entera -aro mas radios-
   ocupa unos 100 px, o sea el 10% del ancho de pantalla, y el aro
   solo algo mas de la mitad de eso.

   Aqui se copia tal cual:

     - La mira es un punto del mundo, (Mira.x, Mira.y).
     - Con raton va donde el raton. Con el dedo, el arrastre la
       EMPUJA: es un desplazamiento, no un angulo, asi que nunca se
       queda clavada en un tope.
     - El personaje se orienta hacia ella, y el lado sale de que la
       mira este a un lado o a otro del cuerpo. Sin bucle.
     - Se dibuja el aro y la linea de punteria desde la boca del
       arma, que es lo que deja leer a donde va a salir el tiro.
   ============================================================= */
(function (global) {
  'use strict';

  const Mira = {};

  /* La mira es un PUNTO DEL MUNDO, y ahora en las tres
     coordenadas. Vivia en el plano X-Y, que es lo que tenia
     sentido cuando la pelea era un pasillo; en una habitacion, dos
     que comparten x pueden tener cuatro metros de por medio, y una
     mira sin profundidad se colocaba sobre el enemigo equivocado o
     -si estaba justo delante- se descolgaba al suelo, porque la
     direccion se volvia vertical. */
  Mira.x = 2; Mira.y = 1.2; Mira.z = 0.6;
  Mira.viva = false;            // hay arma de fuego en la mano
  Mira.malla = null;
  Mira.linea = null;

  /* Cuanto se aleja de la mano. El minimo evita que la mira se meta
     dentro del propio muñeco -ahi la direccion de tiro se vuelve
     loca- y el maximo la mantiene dentro de lo que se ve. */
  const CERCA = 1.05, LEJOS = 9.0;
  const ALTO_MIN = 0.16, ALTO_MAX = 4.2;

  /* =============================================================
     HASTA DONDE LLEGA LA MIRA  ->  Mira.rango(arma)

     En MPN la mira no es un adorno: es la REGLA con la que se
     juega. Esta siempre puesta -tambien con un bate- y lo que
     dice es "hasta aqui llego". Por eso su distancia no puede ser
     un numero fijo: tiene que ser el alcance del arma que se
     lleva, porque si no miente.

     Y el alcance ya esta escrito en la ficha de cada arma, asi que
     no hay nada que inventar; solo hay que traducir dos escalas
     distintas a metros de pantalla:

       MELEE. 'alcance' son ya metros por delante del cuerpo -de
       1,05 los puños a 1,82 el bate-, o sea que vale tal cual. Se
       le suma un pelo (10%) porque el golpe conecta con la caja
       del enemigo, no con su centro, y la mira tiene que caer
       donde de verdad se toca.

       FUEGO. 'alcance' son metros de VUELO de la bala -de 14 la
       escopeta a 44 el fusil- y ninguno de esos numeros cabe en
       pantalla: el ancho visible son unos 7,4 m a media altura.
       Asi que se recorta a la vista con una recta que respeta el
       orden y la separacion entre armas:

         escopeta 14 -> 2,60    subfusil 28 -> 4,84
         9 mm     32 -> 5,48    magnum   40 -> 6,76
         fusil    44 -> 7,40

       o sea 2,60 + (alcance - 14) * 0,16. La escopeta se queda
       corta y el fusil llega al borde del cuadro, que es
       exactamente lo que se quiere leer de un calaño y de otro.

     Al final se recorta a lo que la camara deja ver: una mira
     fuera del cuadro no es informacion, es un estorbo. */
  const F_BASE = 2.60, F_PEND = 0.16, F_REF = 14;
  Mira.rango = function (jug) {
    const f = jug && jug.arma ? jug.arma.ficha : null;
    let d;
    if (!f) d = 1.15;
    else if (f.tipo === 'fuego') {
      d = F_BASE + (f.alcance - F_REF) * F_PEND;
      /* En el SWF la mira llega a myRange + modRange + 45 + r4 px
         (58643): el AWR y los perks de rango la alargan. Se escala en
         esa proporcion sobre la de sin perks, myRange + 45. */
      if (f.rangoSWF && global.Progreso) d *= (Progreso.rangoPx(jug, f) + 45) / (f.rangoSWF + 45);
    }
    else d = (f.alcance || 1.05) * 1.10;
    /* el techo lo pone la pantalla, no el arma */
    const ancho = (Game.ALTO_VISTA || 9.5) * (Game.cam ? Game.cam.aspect : 1.78);
    return U.clamp(d, 0.90, Math.min(LEJOS, ancho * 0.42));
  };
  /* Tamaño. Medido sobre la captura de MPN a 960 de ancho, la mira
     entera ocupa 100 px, o sea el 10,4% del ancho de pantalla, y el
     aro solo el 5,7%. Con la camara de aqui
     la vista mide 4,6 m de alto por 10,2 de ancho, asi que la mira
     entera tiene que medir 1,07 m. El dibujo llena el 92%
     del lienzo, de donde sale el plano. */
  const TAM = 0.46;

  /* -------------------------------------------------------------
     EL DIBUJO DE LA MIRA

     Un aro con cuatro radios hacia dentro y cuatro brazos hacia
     fuera en diagonal, todo en rojo y translucido. Va pintado en un
     lienzo y no con geometria: son cuatro llamadas de canvas una
     sola vez contra dos docenas de triangulos cada fotograma.
     ------------------------------------------------------------- */
  function texMira() {
    const S = 256, c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    const C = S / 2;
    const R = S * 0.255;               // el aro
    x.lineCap = 'round';
    x.strokeStyle = 'rgba(214,26,32,0.92)';

    // los cuatro brazos de fuera, en diagonal y afilados
    x.lineWidth = S * 0.040;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      x.beginPath();
      x.moveTo(C + Math.cos(a) * R * 0.92, C + Math.sin(a) * R * 0.92);
      x.lineTo(C + Math.cos(a) * S * 0.425, C + Math.sin(a) * S * 0.425);
      x.stroke();
    }
    // el aro
    x.lineWidth = S * 0.055;
    x.beginPath(); x.arc(C, C, R, 0, Math.PI * 2); x.stroke();
    // los cuatro radios de dentro, hasta un cubo central
    x.lineWidth = S * 0.034;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      x.beginPath();
      x.moveTo(C + Math.cos(a) * R, C + Math.sin(a) * R);
      x.lineTo(C + Math.cos(a) * R * 0.22, C + Math.sin(a) * R * 0.22);
      x.stroke();
    }
    x.fillStyle = 'rgba(214,26,32,0.92)';
    x.beginPath(); x.arc(C, C, S * 0.022, 0, Math.PI * 2); x.fill();

    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
  }

  /* La linea de punteria: un degradado que se apaga hacia la boca
     del arma. Encendida en los dos extremos parece un laser de
     juguete; apagandola en el arranque parece lo que es, una ayuda
     de punteria que nace del cañon. */
  function texLinea() {
    const W = 64, H = 4, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0.00, 'rgba(214,26,32,0.00)');
    g.addColorStop(0.35, 'rgba(214,26,32,0.16)');
    g.addColorStop(1.00, 'rgba(214,26,32,0.52)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
  }

  Mira.init = function (escena) {
    if (Mira.malla) return;
    Mira.malla = new THREE.Mesh(
      new THREE.PlaneGeometry(TAM * 2.32, TAM * 2.32),
      new THREE.MeshBasicMaterial({ map: texMira(), transparent: true,
                                    opacity: 0.80,
                                    depthTest: false, depthWrite: false })
    );
    Mira.linea = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.045),
      new THREE.MeshBasicMaterial({ map: texLinea(), transparent: true,
                                    depthTest: false, depthWrite: false })
    );
    // el plano se dibuja desde su centro: se corre el origen a un
    // extremo para poder estirarlo desde la boca del arma
    Mira.linea.geometry.translate(0.5, 0, 0);
    Mira.malla.renderOrder = 90;
    Mira.linea.renderOrder = 89;
    Mira.malla.visible = false;
    Mira.linea.visible = false;
    escena.add(Mira.malla);
    escena.add(Mira.linea);
  };

  /* =============================================================
     MOVERLA

     EL CRITERIO DE MANDO. Un telefono no tiene raton, y la mitad
     derecha de la pantalla ya esta ocupada por seis botones. Pedirle
     al jugador que arrastre una mira a pulso cada vez que quiere
     disparar seria cambiar un mando roto por uno incomodo.

     Asi que la mira TRABAJA SOLA y el dedo manda cuando quiere:

       1. Por defecto se engancha al enemigo vivo mas cercano que
          tenga a tiro, y se le pega al pecho. Sacar una pistola y
          disparar no necesita ni un gesto.
       2. Arrastrando -en el hueco libre de la derecha o sin soltar
          el gatillo- el dedo toma el mando y la mueve a donde
          quiera. El enganche se suspende mientras dura el arrastre
          y un segundo largo despues, para poder rematar sin que la
          mira se escape sola al siguiente enemigo.
       3. Sin enemigos y sin dedo, se desliza delante del personaje
          a la altura del pecho. Nunca se queda colgada detras.

     Y el enganche NO teletransporta: la mira viaja hacia el objetivo
     amortiguada. Un salto instantaneo de un enemigo a otro se lee
     como un fallo del juego, no como una ayuda.

     'entrada' trae, por fotograma:
       miraDX, miraDY  arrastre del dedo en fracciones de PANTALLA
       miraAbs        punto absoluto {x,y} (raton), o null
     ============================================================= */
  const MANO_DURA = 1.6;       // cuanto manda el dedo tras soltarlo (apoyado, siempre)
  const VISTA_TIRO = 15.0;     // hasta donde busca enemigo
  Mira.tManual = 0;
  Mira.fijado = false;
  /* A QUIEN esta enganchada, no solo que lo esta. Lo lee player.js
     para girar el cuerpo hacia el: con arma blanca no hay linea de
     punteria que mirar, asi que lo unico que le dice al jugador a
     quien va a pegar es hacia donde mira su muñeco. */
  Mira.blanco = null;

  /* Lo que la camara deja ver AHORA, con un margen. Sirve para dos
     cosas, y las dos importan: no engancharse a un enemigo que esta
     fuera de pantalla -se veria una linea de punteria saliendose del
     cuadro hacia una mira que no esta- y no dejar que el dedo se
     lleve la mira fuera de la vista. */
  const _lim = { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0 };
  function limites() {
    const alto = Game.ALTO_VISTA, ancho = alto * Game.cam.aspect;
    const cx = Game.camX || 0, cy = Game.camY || alto * 0.5;
    _lim.x0 = cx - ancho * 0.44; _lim.x1 = cx + ancho * 0.44;
    _lim.y0 = Math.max(ALTO_MIN, cy - alto * 0.40);
    _lim.y1 = Math.min(ALTO_MAX, cy + alto * 0.40);
    /* Y en profundidad la encierra la habitacion, con un palmo de
       margen: fuera de la banda jugable no hay a quien apuntar. */
    _lim.z0 = Arena.Z_ATRAS - 0.7;
    _lim.z1 = Arena.Z_FRENTE + 1.0;
    return _lim;
  }

  function objetivoCerca(jug, objetivos) {
    if (!objetivos) return null;
    const L = limites();
    let mejor = null, mejorD = VISTA_TIRO;
    for (let i = 0; i < objetivos.length; i++) {
      const o = objetivos[i];
      if (!o.vivo || o.actor === jug || o.actor.bando === jug.bando) continue;
      if (o.x < L.x0 || o.x > L.x1) continue;      // fuera de pantalla
      /* LA DISTANCIA ES DEL SUELO, NO DE UNA RECTA.

         Aqui era |o.x - jug.x| y nada mas, que era cierto mientras
         la arena fue un pasillo de izquierda a derecha. Ahora se
         anda por toda la habitacion, asi que un enemigo pegado en
         X pero tres metros al fondo salia como "el mas cerca" y la
         mira se le iba a el en vez de al que tenias encima. */
      const dz = (o.z || 0) - (jug.z || 0);
      const d = Math.hypot(o.x - jug.x, dz);
      if (d > mejorD) continue;
      /* A igualdad de distancia gana el que este del lado al que ya
         se apunta: asi la mira no salta de un costado a otro cada
         vez que dos enemigos se cruzan. */
      const mismoLado = (o.x - jug.x) * (Mira.x - jug.x) >= 0;
      /* Y el que ya esta enganchado pesa menos: alejandose de el a la
         carrera, justo en el borde del alcance, la mira soltaba y
         volvia a coger al blanco fotograma si, fotograma no, y el tiro
         saltaba entre el blanco y la direccion de la carrera. */
      const peso = d * (mismoLado ? 1 : 1.6) * (o === Mira.blanco ? 0.8 : 1);
      if (peso < mejorD) { mejorD = peso; mejor = o; }
    }
    return mejor;
  }

  /* =============================================================
     LA MIRA ES UNA DIRECCION, NO UN PUNTO DEL SUELO

     Estaba guardada como un punto (x, y, z) que se empujaba por el
     suelo, y con la camara picada eso se maneja fatal: el dedo va
     por la pantalla y la mira por el suelo, que no son el mismo
     plano. Arrastrar a la derecha no la llevaba a la derecha de la
     PANTALLA, y arriba y abajo no habia forma de apuntar al techo
     ni al suelo, porque la altura la ponia el juego solo.

     Ahora se guarda lo unico que de verdad se apunta:

       Mira.yaw    hacia donde, en planta (0 = a la derecha)
       Mira.pico   cuanto sube o baja el cañon
       el alcance  lo pone el arma, Mira.rango()

     y el punto de mira SALE de los tres. Eso arregla las tres cosas
     de una vez:

       - el cuerpo gira a Mira.yaw y la bala sale a (yaw, pico), asi
         que apuntar y disparar son literalmente el mismo dato y no
         pueden discrepar;
       - se puede apuntar al techo y al suelo, porque el pico existe;
       - y el dedo se lleva a coordenadas de PANTALLA: se proyecta
         la mira, se le suma el arrastre en pixeles y se deshace la
         proyeccion contra la esfera de alcance. Arrastrar a la
         derecha mueve la mira a la derecha de la pantalla, mire la
         camara desde donde mire. Que es lo unico que el pulgar
         entiende.
     ============================================================= */
  Mira.yaw = 0;
  Mira.pico = 0;
  const PICO_MAX = 1.05;        // 60 grados arriba y abajo

  Mira.paso = function (dt, jug, entrada, objetivos) {
    const arma = jug && jug.arma;
    /* LA MIRA NO ES DE LAS ARMAS DE FUEGO, ES DEL JUGADOR.

       Estaba atada a 'tipo === fuego', asi que con un bate o con los
       puños desaparecia. En el original esta SIEMPRE puesta: es lo
       que dice a donde va el golpe, y un golpe de bate tambien va a
       algun sitio. */
    Mira.viva = !!(jug && jug.vivo);
    Mira.tiro = !!(Mira.viva && arma && arma.ficha.tipo === 'fuego');
    if (!jug) return;

    const cx = jug.x, cz = jug.z || 0, cy = Actor.cruz(jug);
    const R = Mira.rango(jug);
    Mira.tManual = Math.max(0, Mira.tManual - dt);

    /* =============================================================
       APUNTAR A MANO: A LO QUE HAY DEBAJO DE LA MIRA

       La camara esta picada 26 grados, asi que un mismo punto de la
       pantalla puede ser "mas al fondo" o "mas arriba". Las dos
       maneras de antes elegian una sola lectura para toda la pantalla:
       por los ejes de la camara, subir el dedo alejaba Y levantaba el
       cañon a la vez -no se podia mirar de lado sin apuntar al cielo-;
       por el plano del pecho, el cañon no subia ni bajaba nunca -no se
       podia mirar al techo ni al suelo-.

       Ahora la mira es un punto de la PANTALLA y se apunta a lo que se
       ve debajo de el: se lanza el rayo de la camara por ese punto y
       manda lo primero que toca (resolverMira):

         un enemigo      a esa parte del cuerpo -cabeza, pecho,
                         piernas-, con un iman para el dedo
         pared o techo   a ese punto: se mira hacia arriba
         el suelo        junto a los pies se mira AL SUELO; a partir de
                         dos metros la superficie sube a la altura del
                         pecho y el tiro va horizontal: arriba en la
                         pantalla es entonces "al fondo"

       La mira se pinta en ese punto, que por construccion cae justo
       bajo el dedo o el raton: lo que se ve es a lo que se apunta. */
    let manual = false;
    if (entrada && entrada.miraNdc) {
      if (resolverMira(entrada.miraNdc.x, entrada.miraNdc.y, jug, objetivos, IMAN_RATON)) {
        fijarManual(jug, R);
        manual = true;
      }
    } else if (entrada && entrada.tactil &&
               (entrada.miraDX || entrada.miraDY || entrada.dedo || (Mira._cursor && Mira.tManual > 0))) {
      /* EL DEDO ES UN CURSOR DE PANTALLA, como el raton del SWF.

         Antes el punto se guardaba en 3D respecto del jugador, recortado
         al alcance del arma, y cada fotograma se volvia a proyectar: la
         mira no seguia al dedo. Medido arrastrando 1% de pantalla por
         paso: hacia la derecha avanzaba y luego RETROCEDIA (el recorte al
         alcance), hacia abajo se clavaba a media pantalla y en vertical
         se iba sola de lado.

         Ahora manda el punto de la PANTALLA (_nx, _ny): el arrastre se le
         suma tal cual y cada fotograma se apunta a lo que hay debajo
         (resolverMira). La mira se pinta ahi -sin recortar-, justo bajo
         el cursor, y el alcance ya no la mueve. Con el dedo apoyado no
         vuelve el fijado automatico; al soltarlo, MANO_DURA despues. */
      const gesto = !!(entrada.miraDX || entrada.miraDY || entrada.dedo);
      if (!Mira._cursor || Mira.tManual <= 0) {
        _ndc.set(Mira.x, Mira.y, Mira.z).project(Game.cam);     // empieza donde se ve la mira
        Mira._nx = _ndc.x; Mira._ny = _ndc.y;
      }
      Mira._nx = U.clamp(Mira._nx + (entrada.miraDX || 0) * 2, -0.97, 0.97);
      Mira._ny = U.clamp(Mira._ny - (entrada.miraDY || 0) * 2, -0.95, 0.95);
      Mira._cursor = true;
      if (resolverMira(Mira._nx, Mira._ny, jug, objetivos, IMAN_DEDO)) {
        fijarManual(jug, R);
        Mira._tx = _pt3.x - jug.x; Mira._ty = _pt3.y; Mira._tz = _pt3.z - (jug.z || 0);   // bajo el dedo
      }
      if (gesto) manual = true;
      else { Mira.fijado = false; Mira.blanco = null; }        // soltado: corre el reloj
    }
    if (manual) { Mira.tManual = MANO_DURA; Mira.fijado = false; Mira.blanco = null; }
    else if (Mira.tManual <= 0) {
      Mira._cursor = false;
      const o = Mira.viva ? objetivoCerca(jug, objetivos) : null;
      let yObj, pObj, k;
      if (o) {
        const dx = o.x - cx, dz2 = (o.z || 0) - cz;
        yObj = Math.atan2(dz2, dx);
        pObj = Math.atan2(o.y - cy, Math.max(0.2, Math.hypot(dx, dz2)));
        k = Math.min(1, dt * 9);
        Mira.fijado = true; Mira.blanco = o;
      } else {
        /* Sin nadie a quien apuntar se queda donde mira el cuerpo y
           a la altura del pecho: asi el jugador VE el alcance que
           lleva en la mano en cuanto cambia de arma. */
        yObj = jug.rumbo; pObj = 0;
        k = Math.min(1, dt * 2.4);
        /* ...y andando, hacia donde anda. Con un arma de fuego el cuerpo
           encara la mira y la mira seguia al cuerpo: un lazo cerrado, y
           el muñeco cruzaba la sala de espaldas -medido: 1,5 s andando y
           un esprint a 6,4 m/s sin girarse-. En el SWF, sin la mira
           detras, myFacing sale de la velocidad. */
        const v = Math.hypot(jug.vx || 0, jug.vz || 0);
        if (v > 0.8) { yObj = Math.atan2(jug.vz || 0, jug.vx); k = Math.min(1, dt * 8); }
        Mira.fijado = false; Mira.blanco = null;
      }
      Mira.yaw = U.angLerp(Mira.yaw, yObj, k);
      Mira.pico += (U.clamp(pObj, -PICO_MAX, PICO_MAX) - Mira.pico) * k;
    }

    if (Mira.yaw > Math.PI) Mira.yaw -= U.TAU;
    else if (Mira.yaw < -Math.PI) Mira.yaw += U.TAU;
    /* Y EL ALCANCE SE RECORTA A LA SALA.

       El fusil llega a 7,2 m y la sala mide 9 de fondo, asi que
       apuntando hacia la camara la mira se plantaba fuera de la
       habitacion, a tres metros del objetivo: enorme y medio fuera
       del cuadro. Aqui se busca donde la punteria sale de la caja
       de la sala -suelo, techo, paredes y la banda jugable- y se
       usa lo que sea mas corto. La mira se para en la pared, que es
       exactamente lo que hace una bala. */
    Mira.x = jug.x; Mira.y = Actor.cruz(jug); Mira.z = jug.z || 0;
    /* Con el dedo encima, la mira se pinta DONDE ESTA EL CURSOR -con un
       minimo, para que no se meta en el cuerpo-: si se pintara al
       alcance, al cruzar el dedo por encima del muñeco la mira
       saltaria al otro lado de golpe. Al soltar vuelve al alcance. */
    if (Mira._cursor && Mira.tManual > 0) {
      Mira.x = jug.x + Mira._tx; Mira.y = Mira._ty; Mira.z = (jug.z || 0) + Mira._tz;
      return;
    }
    colocaPunto(jug, Math.min(R, hastaLaPared(jug, R)));
    Mira.x = _pt3.x; Mira.y = _pt3.y; Mira.z = _pt3.z;
  };

  /* -------------------------------------------------------------
     EL RAYO DE LA MIRA

     Desde la camara, por el punto (nx, ny) de la pantalla. Deja en
     _pt3 el punto al que se apunta y devuelve false si el rayo no
     entra en la sala.
     ------------------------------------------------------------- */
  const IMAN_DEDO = 0.35, IMAN_RATON = 0.12;   // m de mas alrededor de un cuerpo
  const SUELO_R0 = 0.9, SUELO_R1 = 2.1;         // del suelo al pecho, en m del jugador
  const _ro = new THREE.Vector3(), _rd = new THREE.Vector3();
  function alturaCuenco(d, cy) {
    const u = U.clamp((d - SUELO_R0) / (SUELO_R1 - SUELO_R0), 0, 1);
    return cy * u * u * (3 - 2 * u);
  }
  function resolverMira(nx, ny, jug, objetivos, iman) {
    if (!Game.cam) return false;
    _ro.set(nx, ny, -1).unproject(Game.cam);
    _rd.set(nx, ny, 1).unproject(Game.cam).sub(_ro).normalize();
    const cy = Actor.cruz(jug), jx = jug.x, jz = jug.z || 0;

    // 1. hasta donde llega dentro de la sala: suelo, techo y paredes
    let tFin = 400;
    const lim = Arena.limite() + 1.2;
    if (_rd.y < -1e-5) tFin = Math.min(tFin, -_ro.y / _rd.y);
    if (_rd.y > 1e-5) tFin = Math.min(tFin, (Arena.ALTO - _ro.y) / _rd.y);
    if (_rd.z < -1e-5) tFin = Math.min(tFin, (Arena.FONDO + 0.1 - _ro.z) / _rd.z);
    if (_rd.x > 1e-5) tFin = Math.min(tFin, (Arena.CX + lim - _ro.x) / _rd.x);
    if (_rd.x < -1e-5) tFin = Math.min(tFin, (Arena.CX - lim - _ro.x) / _rd.x);
    if (!(tFin > 0)) return false;

    // 2. los enemigos, con iman: el cilindro de cada uno, ensanchado
    let tEn = Infinity, oEn = null;
    const hl = Math.hypot(_rd.x, _rd.z);
    for (let i = 0; objetivos && hl > 1e-6 && i < objetivos.length; i++) {
      const o = objetivos[i];
      if (!o.vivo || o.actor === jug || (o.actor && o.actor.bando === jug.bando)) continue;
      const r = o.r + iman, ux = _rd.x / hl, uz = _rd.z / hl;
      const px = o.x - _ro.x, pz = (o.z || 0) - _ro.z;
      const proy = px * ux + pz * uz;
      const perp = Math.abs(px * uz - pz * ux);
      if (proy <= 0 || perp > r) continue;
      const t = (proy - Math.sqrt(r * r - perp * perp)) / hl;
      if (t <= 0 || t >= tEn || t > tFin) continue;
      const y = _ro.y + _rd.y * t;
      if (y < o.y - o.alto * 0.5 - iman || y > o.y + o.alto * 0.5 + iman) continue;
      tEn = t; oEn = o;
    }

    // 3. el cuenco: suelo junto a los pies, pecho a partir de dos metros
    let tCu = Infinity;
    if (_rd.y < -1e-5) {
      const t0 = Math.max(0, (cy + 0.01 - _ro.y) / _rd.y);
      const bajo = (t) => {
        const x = _ro.x + _rd.x * t, z = _ro.z + _rd.z * t;
        return _ro.y + _rd.y * t <= alturaCuenco(Math.hypot(x - jx, z - jz), cy);
      };
      for (let t = t0; t <= Math.min(tFin, tEn) + 0.08; t += 0.08) {
        if (!bajo(t)) continue;
        let a = Math.max(t0, t - 0.08), b = t;
        for (let k = 0; k < 10; k++) { const m = (a + b) / 2; if (bajo(m)) b = m; else a = m; }
        tCu = b;
        break;
      }
    }

    const t = Math.min(tEn, tCu, tFin);
    if (t === tEn && oEn) {
      /* Al eje del cuerpo, a la altura por la que pasa el rayo: se
         apunta a la cabeza, al pecho o a las piernas, no al borde del
         iman. */
      const y = _ro.y + _rd.y * t;
      _pt3.set(oEn.x, U.clamp(y, oEn.y - oEn.alto * 0.45, oEn.y + oEn.alto * 0.5), oEn.z || 0);
    } else {
      _pt3.copy(_ro).addScaledVector(_rd, t);
    }
    return true;
  }

  /* Del punto resuelto (en _pt3) salen el rumbo y el pico; si se va mas
     alla del alcance del arma, se trae hasta el alcance por la misma
     linea -mismo rumbo, mismo pico-, que es lo que marca la mira. */
  function fijarManual(jug, R) {
    const cy = Actor.cruz(jug), jx = jug.x, jz = jug.z || 0;
    let dx = _pt3.x - jx, dy = _pt3.y - cy, dz = _pt3.z - jz;
    const hor = Math.hypot(dx, dz);
    if (hor > R) { const k = R / hor; dx *= k; dy *= k; dz *= k; }
    if (Math.hypot(dx, dz) > 0.3) Mira.yaw = Math.atan2(dz, dx);
    Mira.pico = U.clamp(Math.atan2(dy, Math.max(0.3, Math.hypot(dx, dz))), -PICO_MAX, PICO_MAX);
    Mira._tx = dx; Mira._ty = cy + dy; Mira._tz = dz;
    Mira._cursor = true;
  }

  /* Cuanto puede avanzar la punteria antes de salirse de la sala.
     Seis planos y el mas cercano manda. */
  function hastaLaPared(jug, R) {
    const cp = Math.cos(Mira.pico);
    const dx = cp * Math.cos(Mira.yaw), dy = Math.sin(Mira.pico), dz = cp * Math.sin(Mira.yaw);
    const ox = jug.x, oy = Actor.cruz(jug), oz = jug.z || 0;
    let t = R;
    const lim = Arena.limite() + 0.9;
    if (dx > 1e-4) t = Math.min(t, (Arena.CX + lim - ox) / dx);
    if (dx < -1e-4) t = Math.min(t, (Arena.CX - lim - ox) / dx);
    if (dy > 1e-4) t = Math.min(t, (ALTO_MAX - oy) / dy);
    if (dy < -1e-4) t = Math.min(t, (ALTO_MIN - oy) / dy);
    if (dz > 1e-4) t = Math.min(t, (Arena.Z_FRENTE + 0.8 - oz) / dz);
    if (dz < -1e-4) t = Math.min(t, (Arena.Z_ATRAS - 0.5 - oz) / dz);
    return Math.max(0.55, t);
  }

  const _ndc = new THREE.Vector3();

  /* El punto de mira: el jugador mas la direccion por el alcance. */
  const _pt3 = new THREE.Vector3();
  function colocaPunto(jug, R) {
    const cp = Math.cos(Mira.pico);
    _pt3.set(jug.x + cp * Math.cos(Mira.yaw) * R,
             Actor.cruz(jug) + Math.sin(Mira.pico) * R,
             (jug.z || 0) + cp * Math.sin(Mira.yaw) * R);
    return _pt3;
  }


  /* =============================================================
     ORIENTAR AL PERSONAJE

     El orden importa y es lo que rompe el bucle cerrado de antes:
     PRIMERO el lado, que sale de que la mira este a un lado o a
     otro del cuerpo; DESPUES la boca del arma, que depende del
     lado; y por ultimo el angulo, que va de la boca a la mira.
     Ninguno de los tres se alimenta de si mismo.
     ============================================================= */
  const _boca = { x: 0, y: 0, z: 0 };
  Mira.apuntar = function (a) {
    /* 1. EL RUMBO. Se PIDE, no se impone: el cuerpo llega girando,
          amortiguado, igual que todo lo demas. Y es literalmente el
          yaw de la mira, asi que apuntar y girarse no pueden
          discrepar. */
    a.rumboObj = Mira.yaw;

    /* 2. LA BOCA DEL ARMA, donde de verdad esta. Va sobre el rumbo
          ACTUAL del cuerpo -no sobre el pedido-, porque la bala sale
          del cañon que se ve, no del que se querria tener. */
    /* 3. EL PICO, desde la EMPUÑADURA y con la linea del cañon
          pasando por la mira -ver Weapons.pico-. Calculado desde la
          boca, un arma larga con la mira cerca se iba al cielo. Y la
          boca, despues, con ese pico: es donde nace la bala. */
    a.apunta = U.clamp(Weapons.pico(a, Mira.x, Mira.y, Mira.z), -1.25, 1.25);
    Weapons.puntoBoca(a, a.apunta, _boca);
    return _boca;
  };

  /* =============================================================
     DIBUJARLA
     ============================================================= */
  const _o = new THREE.Vector3();
  const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3();
  const _base = new THREE.Matrix4();
  Mira.dibujar = function (jug) {
    if (!Mira.malla) return;
    /* Cruzando el vano de una puerta no se juega, asi que tampoco se
       apunta: Mira.paso ni se llama ahi, y sin esto el aro se
       quedaba pintado en el sitio del fotograma anterior mientras el
       muñeco entra. */
    if (!Mira.viva || Actor.enVano(jug)) {
      Mira.malla.visible = false; Mira.linea.visible = false;
      return;
    }
    const pb = Weapons.puntoBoca(jug, jug.apunta || 0);
    _o.set(pb.x, pb.y, pb.z);

    Mira.malla.visible = true;
    Mira.malla.position.set(Mira.x, Mira.y, Mira.z + 0.10);
    /* Enganchada se cierra un poco y se enciende. Sin esa señal el
       jugador no sabe si el juego le esta ayudando o no, y una ayuda
       invisible se siente como que el arma dispara sola. */
    const obj = Mira.fijado ? 0.82 : 1;
    Mira._e = Mira._e === undefined ? 1 : Mira._e + (obj - Mira._e) * 0.22;
    Mira.malla.scale.setScalar(Mira._e);
    Mira.malla.material.opacity = Mira.fijado ? 1 : 0.80;
    Mira.malla.rotation.z += Mira.fijado ? 0 : 0.004;

    /* LA LINEA DE PUNTERIA, EN EL ESPACIO.

       Era un rectangulo girado sobre Z, o sea una linea dentro del
       plano de la pantalla. Ahora la bala puede irse al fondo o
       venir hacia la camara, asi que la linea tiene que ir por
       donde va el plomo, en tres dimensiones. Y aun asi tiene que
       verse: un rectangulo plano orientado a pelo se pone de canto
       y desaparece.

       Se arma una base a medida, que resuelve las dos cosas de una
       vez:

         bx  la direccion del tiro, que es por donde se estira
         bz  hacia la CAMARA, para que la cinta no se vea de canto
         by  la perpendicular a las dos, que le da el grosor

       Ortonormalizada en ese orden -bx manda, bz se corrige- la
       linea siempre sale del cañon, siempre acaba en la mira y
       siempre se ve de cara. Solo hay un caso degenerado, disparar
       exactamente a lo largo del eje de la camara, y ahi la linea
       mide cero en pantalla de todas formas. */
    _bx.set(Mira.x - _o.x, Mira.y - _o.y, Mira.z - _o.z);
    const largo = _bx.length();
    /* La linea de punteria es de cañon: sale de la boca del arma y
       dice por donde va a salir la bala. Con un bate no hay boca ni
       bala, asi que la mira se queda sola. */
    Mira.linea.visible = Mira.tiro && largo > 0.25;
    if (Mira.linea.visible) {
      _bx.multiplyScalar(1 / largo);
      _bz.subVectors(Game.cam.position, _o).normalize();
      _by.crossVectors(_bz, _bx);
      if (_by.lengthSq() < 1e-6) _by.set(0, 1, 0); else _by.normalize();
      _bz.crossVectors(_bx, _by);
      _base.makeBasis(_bx, _by, _bz);
      Mira.linea.quaternion.setFromRotationMatrix(_base);
      Mira.linea.position.copy(_o);
      Mira.linea.scale.set(largo, 1, 1);
    }
  };

  global.Mira = Mira;
})(window);

