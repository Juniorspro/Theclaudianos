/* =============================================================
   actor.js -> Lo que comparten el jugador y todo lo que quiere
   matarlo.

   Un actor es un cilindro que anda por una linea recta, lleva un
   arma en la mano y tiene un muñeco encima. Nada mas. El jugador
   y la IA se diferencian solo en QUIEN decide las intenciones
   (moverse, pegar, disparar); de ahi para abajo el codigo es el
   mismo, y eso significa que cualquier cosa que el jugador pueda
   hacer, un enemigo tambien: desarmar, recoger del suelo, lanzar
   el arma vacia. En Madness eso no es un lujo, es el juego.

   EL TRES CUARTOS
   El cuerpo no se pone de perfil puro aunque camine de perfil: se
   gira 55 grados hacia la camara. De perfil, la cruz de la cara
   -que es lo unico que identifica a un personaje de Madness- se
   convierte en una raya, y sin ella un grunt y un agente son la
   misma mancha gris. Cincuenta y cinco grados dejan ver la cara
   entera, las dos manos y el paso, y siguen leyendose como "va
   hacia alli".
   ============================================================= */
(function (global) {
  'use strict';

  const Actor = {};
  const H = Chars.H;

  /* Cuanto se gira el cuerpo hacia la camara. 0 seria de frente,
     PI/2 de perfil puro. */
  const MEDIO_PI = Math.PI / 2;
  /* =============================================================
     SE ACABO EL ANGULO FIJO DE TRES CUARTOS

     Esto valia 0,96 rad -55 grados- y era el corazon del look:
     un personaje de perfil no se dibujaba de perfil, se dibujaba
     girado 35 grados hacia la camara para que se le viera el
     pecho, el arma y la cara. Con el juego siendo un pasillo de
     izquierda a derecha, esa era LA pose y no habia mas.

     Con la sala en dos dimensiones, ese mismo sesgo es lo que se
     siente tosco, y no por gusto sino por una cuenta: con

         giro = th - sen(th) * SESGO

     la velocidad a la que el cuerpo gira respecto al rumbo es
     1 - cos(th)*SESGO, que vale 0,39 mirando a camara y 1,00 de
     perfil. O sea que el cuerpo giraba DOS VECES Y MEDIA mas
     despacio en unas direcciones que en otras: se quedaba pegado a
     unos angulos y pasaba de largo por otros. Eso es la "maña de
     ponerse en un angulo especifico".

     Con SESGO = 0 el giro es el rumbo y punto: uniforme, sin
     angulos preferidos, como en MPN2, que es un juego en 3D de
     verdad y donde el que anda a la derecha mira a la derecha.

     Y no se pierde la cara, porque la cara no la salva el tronco:
     la salva LA CABEZA, que ahora se gira ella sola hacia la
     camara -ver 'miraCab' mas abajo-. Es ademas lo que hace
     cualquiera y lo que dibuja la serie: el cuerpo va a lo suyo y
     la cara te mira.

     De propina, todas las correcciones repartidas por el animador
     que valian (PI/2 - VISTA) -el giro de la bota, la alineacion
     del pie- se anulan solas en vez de quedarse compensando un
     sesgo que ya no existe.
     ============================================================= */
  const VISTA = MEDIO_PI;
  const SESGO = MEDIO_PI - VISTA;     // 0: el giro ES el rumbo

  /* =============================================================
     DEL RUMBO AL GIRO DEL GRUPO

     El problema. Un rumbo es una direccion del mundo y el giro del
     grupo tendria que ser, sin mas, el angulo que pone el frente
     del modelo -su +Z local- en esa direccion:

       giro_puro = pi/2 - rumbo

     Pero entonces un personaje que mira a la derecha sale de
     PERFIL PURO, y Madness no se dibuja de perfil: se dibuja en
     tres cuartos. De ahi VISTA = 0,96 rad en vez de pi/2, o sea 35
     grados robados al perfil para que el cuerpo se abra a la
     camara y se le vea el pecho, el arma y la cara.

     Asi que hace falta el mismo sesgo, pero que valga para
     CUALQUIER rumbo y no solo para los dos de siempre. Y tiene que
     cumplir tres cosas:

       - de perfil (mira a un lado) roba los 35 grados enteros,
         para no cambiar ni un grado la pose de pelea de siempre;
       - de frente y de espaldas no roba nada: un cuerpo que mira a
         la camara no se puede abrir mas a la camara, y uno de
         espaldas sesgado se veria retorcido;
       - y entre medias va suave, sin escalon, porque el cuerpo pasa
         por todos los rumbos al girar.

     El seno del giro puro hace las tres a la vez -vale 1 de perfil,
     0 de frente y 0 de espaldas- asi que:

       giro = th - sen(th) * SESGO        con th = pi/2 - rumbo

     Y los dos casos viejos salen exactos: rumbo 0 da th = pi/2 y
     giro = pi/2 - 0,611 = 0,96 = VISTA; rumbo pi da -0,96. Los
     valores que habia son el caso particular de este, que es la
     unica forma de añadir rumbo libre sin tocar la pelea.
     ============================================================= */
  function giroDeRumbo(rumbo) {
    let th = MEDIO_PI - rumbo;
    while (th > Math.PI) th -= U.TAU;
    while (th < -Math.PI) th += U.TAU;
    return th - Math.sin(th) * SESGO;
  }
  Actor.giroDeRumbo = giroDeRumbo;

  Actor.GRAVEDAD = 26;
  Actor.PLANO_Z = 0;

  Actor.crear = function (opts) {
    const tipo = opts.tipo || 'grunt';
    const ficha = Chars.TIPOS[tipo];
    const cuerpo = Chars.crear(tipo);
    /* La ficha del SWF: nivel sorteado en su rango, y de el la vida
       -changeStats: 6 + nivel, +10 si es especial- y la barra. Ver
       Chars.TIPOS. Lo que venga en opts manda (el jugador). */
    const S = ficha.swf || {};
    const nivel = opts.nivel !== undefined ? opts.nivel
      : (S.nivel ? S.nivel[0] + Math.floor(Math.random() * (S.nivel[1] - S.nivel[0] + 1)) : 0);
    const especial = opts.especial !== undefined ? !!opts.especial : !!S.especial;
    const est = (k, def) => (opts[k] !== undefined ? opts[k] : (S[k] !== undefined ? S[k] : def));
    const vidaSWF = opts.vida || (6 + nivel + (especial ? 10 : 0));
    const A = {
      tipo: tipo, ficha: ficha,
      cuerpo: cuerpo, grupo: cuerpo.grupo,
      anim: Anim.crear(cuerpo),

      x: opts.x || 0, y: 0, z: opts.z || 0,
      vx: 0, vy: 0,
      mirando: opts.mirando || 1,
      r: Chars.RADIO * cuerpo.escala,
      alto: Chars.ALTO * cuerpo.escala,

      nivel: nivel,
      vidaMax: vidaSWF,
      vida: vidaSWF,
      /* modDmg = 1 + STR/15 y modArmor = 1 + END/15 (Actor.danoSWF). */
      modDmg: 1 + est('str', 0) / 15,
      modArmor: 1 + est('end', 0) / 15,
      /* myHeadArmor / myBodyArmor (refreshArmor): lo que suma su ropa. */
      armadura: Prendas.armadura(Prendas.atuendoDe(ficha)),
      vivo: true,
      muerte: 0,
      aturdido: 0,
      invulnerable: 0,

      arma: null,
      mallaArma: null,
      /* TAC: la reserva tactica del original. Solo la llevan los
         que la ficha diga; un grunt de relleno no tiene por que
         ser dificil de matar. Va en PUNTOS, no en fraccion: son
         las mismas unidades que usa Madness: Project Nexus. */
      tacMax: Actor.tacDeNivel(nivel),
      tac: Actor.tacDeNivel(nivel),
      tacMod: 1 + est('tac', 0) / 10,
      /* modHurtTactics = 1 + statAWR/50: cuanta barra AJENA muerde
         este de un disparo. Es lo que hace que un soldat vacie la
         guardia mas rapido que un grunt con la misma arma. */
      tacDano: 1 + est('awr', 0) / 50,
      especial: especial,                     // amSpecial: los principales
      tacEspera: 0,
      tacMostrar: 0,
      tacSello: -1,
      tacBrillo: 0,
      /* La finta de 'tactics'. Ver Actor.finta. */
      finta: 0,
      fintaDir: 1,
      /* 1 mientras esta cruzando el vano de una puerta, 0 fuera.
         Lo usa el giro para sacarlo de frente. */
      saliendo: 0,
      zPuerta: 0,
      /* LA ARENA ES UNA HABITACION, NO UN PASILLO.

         moverZ es la otra mitad de la palanca y vz la velocidad
         hacia el fondo o hacia la camara. Hasta ahora todo el
         mundo vivia clavado en z = 0 y esto era un juego de
         izquierda a derecha; ahora se anda por el suelo. */
      moverZ: 0,
      vz: 0,
      marcha: 0,
      /* Y salFondo es la salida por una puerta de la pared del
         fondo. Antes eso se deducia de 'z < 0', que valia mientras
         z fuera solo la profundidad del vano; con la z libre, una
         z negativa es simplemente estar cerca de la pared. */
      salFondo: 0,
      /* Las puertas de los EXTREMOS no se salen hacia la camara:
         se salen de lado, por la X, y de perfil desde el primer
         fotograma -que es como lo hace el original-. salLado es
         hacia donde, y salX lo que le queda. */
      salLado: 0,
      salX: 0,
      velZ: 0,
      bloqueando: false,
      /* la guardia del SWF: actionTimer desde que empezo o paro el ultimo
         golpe (s), y meleeHealth, los golpes que aguanta rompiendole la
         guardia antes de perder el arma (3 en todas las fichas de la
         Arena: MadnessDataFile 12308) y su reloj de reposicion */
      bloqueoT: 0,
      meleeSalud: 3,
      meleeSaludT: 0,
      apunta: 0,             // angulo del mundo al que apunta
      esJugador: !!opts.jugador,
      bando: opts.bando || 'enemigo',
      /* Habilidades de cuerpo a cuerpo y sin armas (golpes.js): las fijas
         de la ficha del SWF (applyStats). randomStats, lo que se usaba
         antes, es solo para los mercenarios que se contratan. */
      skillMelee: est('melee', 0),
      skillUnarmed: est('unarmed', 0),
      dex: est('dex', 0),            // destreza: la variante de la esquiva (player.js)
      meleeCombos: 0, golpeSuelto: 1, golpeEnCola: false,

      // lo que se pide cada fotograma
      mover: 0,              // -1..1
      corriendo: false,
      /* EL SALTO ES UN PETICION CON FECHA, NO UN PESTILLO.

         Era un booleano que no caducaba: si pedias saltar en el
         aire -o con una animacion en marcha-, la peticion se
         quedaba puesta y el muñeco saltaba SOLO en cuanto tocaba
         el suelo, sin que nadie se lo hubiera pedido en ese
         momento. Ahora son segundos y se agotan.

         Los 0,12 s no son para que caduque: son el COLCHON. Pedir
         el salto una milesima antes de aterrizar es lo que hace
         todo el mundo, y sin colchon eso se traga y parece que el
         mando no responde. Con el colchon se guarda y se ejecuta
         al tocar suelo, que es lo que el jugador creia haber
         hecho. Mas de ahi ya son saltos que nadie pidio. */
      salto: 0,
      /* Cuando algo impone la velocidad -la voltereta de esquiva-
         se escribe aqui. Sin esto, el frenado normal se comia el
         impulso en tres fotogramas y la esquiva no movia a nadie:
         era el motivo de que "no tuviera sentido". */
      forzarVx: null,
      forzarVz: null,       // lo mismo por el eje de profundidad
      esqX: 1, esqZ: 0,     // hacia donde va la voltereta, en el suelo
      /* =========================================================
         RUMBO -> HACIA DONDE MIRA, DE VERDAD

         Hasta ahora esto no existia porque no hacia falta: el
         personaje mira a la derecha o a la izquierda, 'mirando'
         vale +1 o -1 y el grupo se gira mirando*VISTA. Un juego de
         pasillo no necesita mas.

         Pero la arena ya es una habitacion y se anda por todo el
         suelo, asi que un cuerpo anclado a dos angulos es
         exactamente lo que se ve mal: el muñeco camina hacia la
         camara con el tronco de perfil, o retrocede de espaldas
         mirando al frente.

         'rumbo' es un angulo del MUNDO en el plano del suelo, medido
         desde +X hacia +Z:

            0      mira a la derecha
            pi/2   mira a la camara
            pi     mira a la izquierda
           -pi/2   mira al fondo, de espaldas

         y de el salen las otras tres cosas, en vez de ir cada una
         por su cuenta: el lado ('mirando'), el angulo de marcha que
         usa el animador ('marcha') y el giro del grupo ('giro').
         Antes 'giro' y 'marcha' se calculaban por separado, y eso
         era un cuerpo girado a un sitio con las manos puestas en
         otro plano. Ahora no pueden desincronizarse porque son el
         mismo dato leido de dos maneras.

         'rumboObj' es la peticion del fotograma -la pone la IA o el
         jugador cuando quieren mirar a un sitio concreto, como al
         enemigo al que van a pegar- y se consume y se borra. Si
         nadie la pone, manda la marcha. */
      rumbo: 0,
      rumboObj: null,
      paso: 0,
      /* A donde quiere mirar la CABEZA, en angulo del mundo, y
         cuanto le queda de querer mirar ahi. Ver 'miraCab'. */
      mirada: Math.PI / 2,
      miradaT: 0,
      rag: null              // el cadaver, cuando toque
    };

    /* El giro se fija YA, no en el primer paso de simulacion. Si se
       deja sin definir, cualquiera que coloque al actor antes de ese
       primer paso -matarlo nada mas crearlo, por ejemplo- mete un
       cuaternion NaN y el ragdoll nace con las ocho masas en NaN. */
    A.giro = A.mirando * VISTA;
    A.rumbo = A.mirando > 0 ? 0 : Math.PI;
    /* LAS DOS RANURAS: myWeapons[0] y myWeapons[1] de la ficha del SWF, y
       myWeapon la que se empuña. Vacia = a puños. La 1 es la del perk
       Sidearm ("Carry a second weapon"). */
    A.armas = [null, null];
    A.ranura = 0;
    Actor.colocar(A);
    Actor.equipar(A, opts.arma || 'puños');
    return A;
  };

  /* =============================================================
     ARMAS
     ============================================================= */
  /* Un arma NUEVA en la ranura que se empuña (la tienda, la oleada). Lo
     que hubiera en esa ranura se pierde: quien llame se encarga antes. */
  Actor.equipar = function (A, id) {
    const o = id && id !== 'puños' ? Weapons.equipar(id) : null;
    if (A.armas) A.armas[A.ranura || 0] = o;
    Actor.empuñar(A, o);
  };

  /* LA ROPA DE LA TIENDA. La mascara y el traje van fundidos en la malla
     (chars.js), asi que ponerse algo es cambiar de cuerpo: uno nuevo del tipo
     vestido, en el mismo sitio y con el mismo animador -la fase del paso, la
     accion en curso-, y el arma y la funda se vuelven a colgar de los huesos
     nuevos. Devuelve si cambio algo. */
  Actor.vestir = function (A, at) {
    const tipo = Chars.vestido(Chars.base(A.tipo), at);
    A.armadura = Prendas.armadura(Prendas.atuendoDe(Chars.TIPOS[tipo]));
    if (tipo === A.tipo) return false;
    const viejo = A.cuerpo, padre = viejo.grupo.parent;
    const nuevo = Chars.crear(tipo);
    nuevo.grupo.position.copy(viejo.grupo.position);
    nuevo.grupo.quaternion.copy(viejo.grupo.quaternion);
    if (padre) { padre.remove(viejo.grupo); padre.add(nuevo.grupo); }
    const anim = Anim.crear(nuevo);
    for (const k in A.anim) if (k !== 'c' && k !== 'reposo') anim[k] = A.anim[k];
    A.cuerpo = nuevo; A.grupo = nuevo.grupo; A.tipo = tipo; A.anim = anim;
    // la funda se rehace aunque sea la misma arma: colgaba del torso viejo
    if (A.mallaFunda) { A.mallaFunda.parent.remove(A.mallaFunda); A.mallaFunda = null; }
    A.fundaObj = null;
    Actor.empuñar(A, A.arma && A.arma.id !== 'puños' ? A.arma : null);
    return true;
  };

  /* Pone en la mano el arma o (el objeto de su ranura, con lo que le
     quede) o los puños si no hay. Solo la malla y el animador: las
     ranuras las lleva quien llama. */
  Actor.empuñar = function (A, o) {
    if (A.mallaArma) {
      A.mallaArma.parent.remove(A.mallaArma);
      A.mallaArma = null;
    }
    A.anim.ejeArma = null;
    A.anim.manosArma = null;
    A.anim.nManos = 0;
    A.anim.armaDelante = false;
    A.arma = o || Weapons.equipar('puños');
    const id = A.arma.id;
    const f = A.arma.ficha;
    // las de fuego van en la mano de delante (ver anim.js)
    A.anim.armaDelante = f.tipo === 'fuego';
    if (!f.sinMalla) {
      const m = Weapons.crear(id, global.Manos ? Manos.pielDe(A.cuerpo.tipo) : null);
      if (m) {
        /* El arma cuelga del hueso de la mano: se mueve con ella sin
           que nadie tenga que sincronizar nada.

           Y lleva su propia inclinacion de reposo. Todas las mallas
           se construyen apuntando a +Z -hacia el frente del
           personaje-, que es lo que quiere una pistola pero no un
           machete: un arma blanca se lleva EN ALTO, no apuntando al
           enemigo como un florete. Sin esa inclinacion, Hank cruzaba
           el machete por delante del pecho como si llevara una
           bandolera. */
        const pose = f.pose;
        if (pose) m.rotation.set(pose[0], pose[1], pose[2]);
        A.cuerpo.huesos[H.ARMA_D].add(m);
        A.mallaArma = m;
        /* Las manos las pone el arma, calcadas de su postura del SWF:
           el animador esconde las del personaje (ver Weapons.crear). */
        if (m.userData.manos) {
          A.anim.manosArma = { g: m.userData.manos, q: m.quaternion };
          A.anim.nManos = Weapons.manosDe(id);
        }
        /* El eje largo del arma y la normal de su cara, EN EL MARCO
           DEL HUESO. El animador los necesita para rodar el arma
           sobre si misma hasta poner su cara de frente a la camara.

           Y no valen (0,0,1) y (1,0,0) a secas: la malla lleva esa
           inclinacion de reposo de ahi arriba, asi que la Z del hueso
           NO es el eje de la hoja. Rodando sobre la Z del hueso lo
           que se hace es abanicar el arma -medido: la estocada del
           cuchillo se iba 79 grados fuera de su propia direccion-.

           SOLO PARA HOJAS. Una hoja es una chapa: da igual como
           quede rodada sobre su eje mientras la cara mire a camara,
           y de canto no se ve. Un arma de fuego NO: tiene arriba y
           abajo, y rodarla sobre el cañon hasta poner su costado de
           frente la deja boca arriba, con la empuñadura apuntando al
           cielo y la corredera de cara. Que es exactamente lo que
           pasaba con la pistola. */
        if (f.hoja) {
          A.anim.ejeArma = new THREE.Vector3(0, 0, 1).applyQuaternion(m.quaternion);
          A.anim.caraArma = new THREE.Vector3(1, 0, 0).applyQuaternion(m.quaternion);
        } else {
          A.anim.ejeArma = null;
        }
      }
    }
    Actor.funda(A);
  };

  /* LA OTRA RANURA, A LA VISTA. En el SWF el arma guardada simplemente
     no se dibuja; aqui cuelga del torso para que se sepa que sigue ahi.

     Se apoya en la SUPERFICIE DE VERDAD del torso (Ropa.marcoTorso: el
     plano tangente del tubo de 12 lados, que en un cuerpo convexo nunca
     lo corta), separada hacia fuera lo que mide el arma en esa direccion
     -su caja- mas 2 cm de la tinta de los dos. Asi no puede atravesarlo.
       espalda  las largas y las blancas: psi = pi (atras), a 0,62 m (donde
                la espalda es mas plana), de plano contra ella y en
                diagonal por el plano (12 grados), como colgada de una
                correa.
       cadera   pistolas y revolveres: psi = 2pi/3 (el lado de la mano del
                arma, +x, algo hacia atras, fuera del paso de la mano que
                cuelga), a 0,40 m, el dibujo apoyado en la cadera, cañon
                abajo y 15 grados hacia atras.
     Y ninguna baja de FUNDA_BAJO: si no, sube por su plano.
     Dos mallas (color y tinta) mas, solo mientras haya algo guardado. */
  const _cajaF = new THREE.Box3();
  const CORTAS = { pistol: 1, revolver: 1 };
  const HUESO_TORSO_Y = 0.26;       // pivote de 'cuerpo' (chars.js, HUESOS)
  const HOLGURA_FUNDA = 0.02;
  const FUNDA_BAJO = 0.30;         // m sobre el suelo: por encima del bajo del torso (0,162)
  /* la cadera un poco hacia atras (120 grados desde delante): al costado
     justo (90) la mano que cuelga se metia en la pistola */
  const PSI_CADERA = 2 * Math.PI / 3;
  const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  Actor.funda = function (A) {
    const o = A.armas ? A.armas[1 - (A.ranura || 0)] : null;
    if (A.fundaObj === o) return;
    if (A.mallaFunda) { A.mallaFunda.parent.remove(A.mallaFunda); A.mallaFunda = null; }
    A.fundaObj = o;
    if (!o || !A.vivo || !global.Ropa || !Ropa.marcoTorso) return;
    const m = Weapons.crear(o.id);
    if (!m) return;
    _cajaF.setFromObject(m);                  // en el marco del arma: eje +Z, dibujo en Y-Z
    const b = _cajaF;
    const corta = !!CORTAS[o.ficha.cat];
    const T = Ropa.marcoTorso(A.ficha && A.ficha.ancho, corta ? PSI_CADERA : Math.PI, corta ? 0.40 : 0.62);
    const P = v3(T.P), U = v3(T.U), V = v3(T.V), n = v3(T.n);
    const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
    let fuera;
    if (corta) {
      // el dibujo (normal del arma, su X) hacia fuera del costado; cañon abajo
      X.copy(n);
      Z.copy(V).multiplyScalar(-Math.cos(0.26)).addScaledVector(U, Math.sin(0.26)).normalize();
      Y.crossVectors(Z, X).normalize();
      fuera = HOLGURA_FUNDA - b.min.x;         // la cara de dentro, a la holgura
    } else {
      /* DE PLANO contra la espalda, como colgada de una correa: el dibujo
         (su X) por la normal, o sea paralelo a la tela, y en diagonal por
         el plano. De perfil hacia fuera sobresalia su alto entero (el
         cargador, la culata) y se veia flotando detras del muñeco. */
      X.copy(n);
      Z.copy(V).multiplyScalar(Math.cos(0.21)).addScaledVector(U, Math.sin(0.21)).normalize();
      Y.crossVectors(Z, X).normalize();
      fuera = HOLGURA_FUNDA - b.min.x;
    }
    const cz = (b.min.z + b.max.z) / 2, cy = corta ? 0 : (b.min.y + b.max.y) / 2;
    const g = new THREE.Group();
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    g.position.copy(P).addScaledVector(n, fuera).addScaledVector(Z, -cz).addScaledVector(Y, -cy);
    /* LAS LARGAS NO LLEGAN AL SUELO. Un fusil (1,1 m con su escala) centrado
       en la espalda bajaba la culata hasta el piso. Su punto mas bajo ya
       colocado (las 8 esquinas de su caja) no pasa de FUNDA_BAJO sobre el
       suelo: si baja mas, el arma sube por el MISMO plano tangente (V), asi
       sigue sin tocar el torso; lo que sobra asoma por encima del hombro. */
    let bajo = Infinity;
    for (let k = 0; k < 8; k++) {
      const q = new THREE.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z);
      bajo = Math.min(bajo, g.position.y + X.y * q.x + Y.y * q.y + Z.y * q.z);
    }
    if (bajo < FUNDA_BAJO && V.y > 0.2) g.position.addScaledVector(V, (FUNDA_BAJO - bajo) / V.y);
    g.position.y -= HUESO_TORSO_Y;
    g.add(m);
    capaFunda(A, g);
    A.cuerpo.huesos[H.CUERPO].add(g);
    A.mallaFunda = g;
  };

  /* LA CAPA DEL TORSO, TAMBIEN EN LA FUNDA. El torso se dibuja con la
     profundidad corrida (Art.CAPA: hasta 0,30 m hacia atras de frente y de
     costado, para que la cabeza salga entera como en el SWF; la joroba
     adelantada Art.NUCA de espaldas; el bajo adelantado Art.PIES). Un arma
     colgada a la espalda sin esa correccion quedaba POR DELANTE del torso
     corrido y se veia a traves del pecho. Aqui lleva la MISMA rampa, con la
     altura de cada vertice sobre los pies del muñeco: entre ella y la tela
     manda otra vez su orden de verdad. La direccion (vistaCapa) y lo
     derecho que esta (derecho) se calculan en la CPU como en el shader del
     cuerpo (Art.VISTA_GLSL) y van por uniforms, porque la matriz de la
     funda no tiene los ejes del muñeco. */
  function capaFunda(A, g) {
    const Uf = A.fundaU = { uSuelo: { value: 0 }, uV: { value: 1 }, uDer: { value: 1 } };
    const C = Art.CAPA.toFixed(3), N = Art.NUCA.toFixed(3), P = Art.PIES.toFixed(3);
    g.traverse((o) => {
      if (!o.isMesh) return;
      const b = o.material, esTinta = b === Art.mats.contorno;
      const m = b.clone();
      if (!esTinta) Art.aplicarEscalones(m);
      const antes = m.onBeforeCompile;
      m.onBeforeCompile = (sh) => {
        if (!esTinta && antes) antes(sh);
        Object.assign(sh.uniforms, Uf);
        sh.vertexShader = 'uniform float uSuelo;\nuniform float uV;\nuniform float uDer;\n' +
          sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' +
          '\t{ float h = (modelMatrix * vec4(transformed, 1.0)).y - uSuelo;\n' +
          '\t  float pe = uDer * (smoothstep(0.25, 0.85, h) * (' + C + ' * uV - ' + N + ' * (1.0 - uV)) - (1.0 - smoothstep(0.20, 0.34, h)) * ' + P + ');\n' +
          '\t  vec4 pz = projectionMatrix * vec4(mvPosition.xy, mvPosition.z - pe, 1.0);\n' +
          '\t  gl_Position.z = pz.z / pz.w * gl_Position.w; }\n');
      };
      m.customProgramCacheKey = () => 'madness-funda' + (esTinta ? '-tinta' : '-color');
      o.material = m;
    });
  }
  const _fw = new THREE.Vector3(), _up = new THREE.Vector3();
  const liso = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function pasoFunda(A) {
    const F = A.fundaU;
    if (!F || !A.mallaFunda) return;
    const M = A.grupo.matrixWorld, cam = global.Game && Game.cam;
    F.uSuelo.value = A.y || 0;
    _up.set(0, 1, 0).transformDirection(M);
    F.uDer.value = A.vivo ? liso(0.55, 0.85, _up.y) : 0;
    _fw.set(0, 0, 1).transformDirection(M);
    if (cam) {
      const ax = _fw.x, az = _fw.z, bx = cam.position.x - M.elements[12], bz = cam.position.z - M.elements[14];
      const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
      const c = (ax * bx + az * bz) / Math.max(1e-5, la * lb);
      F.uV.value = U.lerp(1, liso(-0.75, -0.25, c), liso(0.2, 0.5, la));
    }
  }


  /* =============================================================
     DAÑO
     ============================================================= */
  /* =============================================================
     LA TAC BAR, LA DE VERDAD

     La primera version de esto me la invente: una tirada de dados
     proporcional a la barra. Estaba mal. Abriendo el SWF original
     de Madness: Project Nexus Classic y leyendo su ActionScript,
     la TAC no es suerte: es un ESCUDO. Lo dice el propio tutorial
     del juego, palabra por palabra:

       "Your TAC-BAR indicates your battle prowess and natural
        ability to avoid enemy fire. Keep it from hitting empty,
        and you'll never take a bullet."

     Y el codigo lo confirma. En la rutina de disparo del original:

       if (objetivo.myStatus != "restrained" && aimTimer == -1
           && objetivo.myTactics > 0 && (!autoHit || !melee)
           && !amSurprised) {
            objetivo.hitTactics(arma, this, false, false, enRango);
            targetsTac.push(objetivo);
            return;                    // <- ni daño, ni sangre
       }

     O sea: MIENTRAS QUEDE BARRA, EL DISPARO FALLA. No hay dado.
     Lo unico que hace el impacto es morder la barra. Cuando la
     barra llega a cero, entonces si, las balas entran.

     Los numeros que siguen tambien son suyos, leidos del bytecode:

       tacRerchargeDelay = 90            (el original cuenta en
       myTactics += 0.05 * (1+speed)      unidades de 1/60 s: sus
       myTacticsMax = suma sobre niveles  timers suben 2 por
         5..44 de floor(5*(0,7 - n/100))  fotograma a 30 fps)
       modRecharge  = 1 + statTAC/10
       hitTactics:  t = myROF/6 * modHurtTactics

     myROF son FOTOGRAMAS entre disparos, asi que myROF/6 es
     "segundos entre disparos x 5": la barra baja a un ritmo fijo
     de unos 5 puntos por segundo de fuego sostenido, sea cual sea
     el arma. Lo que cambia el ritmo son los multiplicadores, y
     esos son los que dan el juego:

       fusil x2   subfusil x1,2   pesada x0,5   electrica x6
       por la espalda x1,5    objetivo quieto x2    bloqueando x0,25
       disparo lejano x0,9    principal aturdido: 0

     Y un ultimo detalle del original que es puro diseño: cuando un
     personaje PRINCIPAL encaja daño de verdad, la barra se le
     rellena entera. Es la red de seguridad que hace que Hank no se
     muera de tres balas seguidas.
     ============================================================= */

  /* El tamaño de la barra, nivel a nivel, tal cual el original.
     Hasta nivel 4 no hay barra; a nivel 12 son 22 puntos; el tope,
     a nivel 44, son 72. */
  Actor.tacDeNivel = function (nivel) {
    let t = 0;
    for (let i = 5; i <= nivel && i < 45; i++) t += Math.floor(5 * (0.7 - i / 100));
    return t;
  };

  Actor.TAC_ESPERA = 1.5;    // 90 unidades / 60 por segundo
  Actor.TAC_REG    = 3.0;    // 0,05 x 2 por fotograma a 30 fps
  Actor.TAC_SEG    = 5;      // myROF/6 = segundos entre disparos x 5
  Actor.TAC_VER    = 0.667;  // 20 unidades de tacDisplayTimer a 30 fps
  Actor.TAC_VER_MIN = 0.333; // las 10 que deja puestas cuando esta vacia
  /* Un sello por ataque: los perdigones de un mismo gatillazo lo
     comparten, asi que la barra solo se muerde una vez. */
  Actor.sello = 0;

  Actor.TAC_CAT = {
    melee: 1, pistol: 1, revolver: 1, smg: 1.2,
    shotgun: 1, rifle: 2, heavy: 0.5, electric: 6
  };

  Actor.pasoTac = function (A, dt) {
    A.finta = Math.max(0, A.finta - dt);
    if (!A.tacMax) return;

    if (!A.vivo) {
      A.tac = 0; A.tacEspera = 0;
    } else if (!(A.esquiva > 0) && !A.bloqueando) {
      /* Rodando o bloqueando el reloj NO corre: el original mete
         amDodging y blocking dentro del mismo if. El agache 'tactics'
         no esta en ese if, asi que aqui tampoco. */
      const espera = Math.max(0, Actor.TAC_ESPERA - Math.floor(10 * A.tacMod) / 60);
      if (A.tacEspera < espera) {
        A.tacEspera += dt;
        if (A.tac > 0) A.tacMostrar = Actor.TAC_VER;
      } else {
        A.tac = Math.min(A.tacMax, A.tac + Actor.TAC_REG * A.tacMod * dt);
      }
    }

    /* Cuanto se ve. En el original la barra esta ESCONDIDA hasta
       que algo la toca, y se queda puesta mientras este vacia o el
       personaje muerto. Se baja a mitad de velocidad mientras no
       este llena, para que no desaparezca justo cuando mas falta
       hace mirarla. */
    if (A.tacMostrar > 0) {
      const lento = (A.vivo && A.tac > 0 && A.tac < A.tacMax);
      A.tacMostrar = Math.max(0, A.tacMostrar - dt * (lento ? 0.5 : 1));
    }
    if (!A.vivo || A.tac <= 0) A.tacMostrar = Math.max(A.tacMostrar, Actor.TAC_VER_MIN);

    A.tacBrillo = Math.max(0, A.tacBrillo - dt * 3.4);
  };

  /* Lo que cuesta un impacto. Portado de hitTactics() del original
     linea a linea, en el mismo orden; 'info' trae
     {arma, enRango, bloqueo, apuntado, sello}.

     EL ORDEN IMPORTA. El corte a cero de los principales
     aturdidos va DESPUES de los multiplicadores y ANTES de los de
     posicion, exactamente donde esta en el bytecode: puesto al
     principio, un x6 de arma electrica volvia a levantarlo. */
  /* ¿Esta cruzando el vano de una puerta? Mientras lo hace no se
     le maneja: ni anda por su cuenta, ni apunta, ni pega. Sale, y
     cuando pisa el plano de pelea empieza la partida para el.

     Antes no habia nada de esto y se notaba: el jugador podia
     andar de lado con medio cuerpo dentro de la puerta, y un
     enemigo podia empezar a disparar desde el hueco. */
  Actor.enVano = function (A) { return A.salFondo > 0 || !!A.salLado; };

  Actor.tacCoste = function (A, atacante, info) {
    const f = info && info.arma ? info.arma.ficha : null;

    /* Base: myROF/6 x modHurtTactics del que dispara. myROF son
       fotogramas entre disparos, asi que esto es "segundos entre
       disparos x 5": la barra cae a un ritmo parecido con
       cualquier arma y lo que la diferencia son los factores. */
    let t = (f ? (f.cadencia || 0.3) : 0.3) * Actor.TAC_SEG;
    t *= (atacante && atacante.tacDano) || 1;
    t *= Actor.TAC_CAT[(f && f.cat) || 'melee'] || 1;

    /* Disparo de lejos (hitTactics, 116207..116349): x0,5 si el que
       lo recibe tiene perkLowAcc3 o perkLowAcc1 (Evade 3 / Evade 1),
       y si no x0,9. Evade 3 dice "no damage" pero el bytecode hace lo
       mismo que Evade 1, x0,5, y aqui va lo del bytecode. */
    if (!(info && info.enRango)) {
      t *= (Progreso.perk(A, 'perkLowAcc3') || Progreso.perk(A, 'perkLowAcc1')) ? 0.5 : 0.9;
    }
    /* perkLowAcc2 (Evade 2): x0,5 contra armas blancas y puños (116380). */
    if (f && f.cat === 'melee' && Progreso.perk(A, 'perkLowAcc2')) t *= 0.5;
    /* perkCoverShoot (Cover Fire) es x0,5 disparando desde una
       cobertura (116457); en la Arena de este juego no hay coberturas,
       asi que no tiene donde aplicarse. */

    /* Los principales no pierden barra mientras estan aturdidos:
       sin esto un aturdimiento encadenado se la come entera y no
       hay forma de salir. */
    if (A.especial && A.aturdido > 0) t = 0;

    /* Por la espalda, x1,5. Es lo que dice el tutorial del
       original con todas las letras: "Being fired on from behind
       or at close range will decimate their (and your!) bar." */
    if (atacante && (atacante.x - A.x) * A.mirando < 0) t *= 1.5;

    /* x0,25 BLOQUEANDO, x2 QUIETO. La frase del original es
       "Blocking will reduce TAC-BAR damage, while dodging will
       outright prevent it", y juntas son lo que hace que la TAC
       premie moverse. Son excluyentes: al que bloquea no se le
       considera un blanco quieto.

       La guardia es la del SWF (Actor.guardia / Actor.paro): el golpe
       parado llama a hitTactics con inBlock y paga un cuarto. La finta
       -los 0,3 s de postura tras un impacto absorbido- NO cuenta como
       bloqueo: medido, con una pistola cada tiro caia en la finta del
       anterior y vaciar la guardia de un soldat pasaba de 17 disparos a
       44 (tools/medir_tac.js). */
    if (info && info.bloqueo) t *= 0.25;
    else if (Math.abs(A.vx) < 0.05 && Math.abs(A.vy) < 0.05) {
      /* Blanco quieto: x1,2 con perkSMGTacDamage (subfusil) o
         perkRifleTacDamage (fusil), y x2 (117043..117196). El SWF mira
         el perk en el que RECIBE (r1), y eso contradice lo que el
         propio juego dice del perk -"Increased SMG damage on Tac-Bar
         hits versus stationary targets"-: con el del bytecode el perk
         solo haria que al jugador le doliera mas. Se mira en el que
         dispara, que es lo que promete la ficha. */
      if (f && f.cat === 'smg' && Progreso.perk(atacante, 'perkSMGTacDamage')) t *= 1.2;
      if (f && f.cat === 'rifle' && Progreso.perk(atacante, 'perkRifleTacDamage')) t *= 1.2;
      t *= 2;
    }

    /* AQUI EL ORIGINAL HACE UNA COSA MAS, Y SOLO EN HISTORIA:

         if (myRoster == playerRoster && gameMode == 'story')
             c = c/2 + c*damageDifficultyMod/2;

       con damageDifficultyMod = 0,3 facil / 0,5 normal / 1 dificil.
       O sea, en el modo historia la barra del JUGADOR aguanta un
       35% mas en facil y un 25% mas en normal. En ARENA esa linea
       NO se ejecuta: la arena se juega siempre al coste entero,
       igual que la historia en dificil.

       Este juego es solo arena, asi que no hay nada que aplicar.
       Se deja escrito porque es justo la pregunta que uno se hace
       al notar que aqui la barra dura menos que en la historia del
       original: no es un error de copia, es que la arena es asi. */
    return t;
  };

  /* -------------------------------------------------------------
     LA FINTA  (myStatus = 'tactics')

     Lo que hace el original en cuanto la barra encaja un impacto:

       if (tacTimer == 0 && myStatus == 'idle'
           && havePerk(perkDodge1) && !targetLock)
           myStatus = 'tactics';

     y 'tactics' no esta agrupado con los aturdimientos sino con
     andar: el personaje sigue apuntando y disparando, pero se
     mueve. Es una finta, no un encogimiento.

     DOS DECISIONES QUE NO SON DEL ORIGINAL Y POR QUE

     1. Aqui la hace CUALQUIERA que tenga barra, no solo quien
        lleve perkDodge1. En el original los perks son del jugador
        y los enemigos casi nunca los tienen, asi que la finta
        practicamente no se ve en los enemigos. Con enemigos que
        ahora SI llevan barra, eso seria un problema de lectura:
        disparas, no pasa nada, y no hay forma de saber si fallaste
        o si te comio la guardia. La finta es la respuesta visual a
        esa pregunta y tiene que verse en los dos lados.

     2. Se empuja con un impulso en vx y no forzando la velocidad.
        Forzandola le quitaria el control al jugador durante un
        tercio de segundo cada vez que le disparan, que con seis
        enemigos es no jugar.
     ------------------------------------------------------------- */
  Actor.SALTO_VEL = 8.4;
  Actor.SALTO_COLCHON = 0.12;   // ver el comentario en Actor.crear

  /* Lo que dura el agache 'tactics' del SWF: 21 cuadros a 30 fps. */
  Actor.TAC_FINTA = 0.70;

  Actor.finta = function (A, atacante) {
    if (!A.vivo || A.aturdido > 0 || (A.esquiva > 0)) return;
    /* EL JUGADOR, como en el SWF: solo con perkDodge1 (Dodge 1, DEX 5).
       La excepcion de arriba -la finta para cualquiera con barra- queda
       para los enemigos, que no llevan perks. */
    if (A.esJugador && !Progreso.perk(A, 'perkDodge1')) return;
    if (Anim.rodando(A.anim)) return;
    /* Hacia el lado contrario al que dispara. Si no hay nadie
       -una explosion- se aparta hacia donde no esta mirando. */
    const d = atacante ? Math.sign(A.x - atacante.x) || 1 : -A.mirando;
    /* SIN EMPUJON. El de antes (2,6 m/s de lado, con el agarre bajado
       a 5 para que durara) no existe en el SWF: 'tactics' es un estado
       de andar -el personaje sigue con su aceleracion de siempre- que
       solo reproduce el agache. Era lo que movia a los personajes de
       lado o hacia atras de forma irreal. */
    if (A.finta > Actor.TAC_FINTA * 0.5) return;     // ya agachado: no se reinicia a cada bala
    A.finta = Actor.TAC_FINTA;
    A.fintaDir = d;
    Anim.esquivaTac(A.anim, d, Actor.TAC_FINTA);
  };

  /* =============================================================
     EL DAÑO DEL SWF (MadnessCharacter, la rutina de impacto)

       d = myDamage del arma                (weapons.js, tal cual)
         - blindaje natural (minimo 1)      (ninguno de nuestros tipos tiene)
         x modDmg / 3 del atacante          SOLO los puños (myType 'unarmed')
         x 0,5 si el disparo fue mas alla   del myRange del arma (inRangeGood; en el
                                            SWF no llega a ocurrir, aqui si: combat.js)
         x modArmor del que lo recibe
       modDmg = 1 + STR/15 y modArmor = 1 + END/15 (applyStats/changeStats).
       Si: modArmor MULTIPLICA el daño que se recibe, asi en el
       bytecode ('r3 = r3 * modArmor'). En la cabeza no hay extra salvo
       con perkHeadshotCrits (AWR 5).

       LA FUERZA NO SUBE LAS ARMAS BLANCAS (applyDamage, 61482..61562):
         if (inWeapon.myType == 'melee')   r3 *= modDmg
         if (inWeapon.myType == 'unarmed') r3 *= modDmg / 3
       y el myType de cada arma es la clave con que la crea
       ItemGenerator.createWeapon -'pipe', 'bat', 'bowieknife',
       'machette'-: ninguna es 'melee', asi que la primera linea no se
       cumple nunca. La ficha de STR dice 'Melee/Unarmed damage +', pero el
       juego solo se lo aplica a los puños. Antes aqui se multiplicaban
       todas las armas blancas y con un par de puntos de STR el caño (6)
       ya mataba de un golpe a un grunt de nivel 1 (vida 7); en el SWF
       hacen falta dos.
     ============================================================= */
  /* LA ARMADURA VA PRIMERO (checkDamage): se RESTA del daño del arma
     antes que cualquier multiplicador. En la cabeza, sombrero + mascara +
     boca; en el cuerpo, la camisa (Prendas.armadura). Con perkArmorPierce
     el atacante la atraviesa, salvo que la pieza que manda -el sombrero en
     la cabeza, la camisa en el cuerpo- sea 'heavy':
       if (!havePerk('perkArmorPierce', atacante) || myHat.myWeight == 'heavy')
         r3 -= myHeadArmor
     Y lo que quede, nunca por debajo de 0 ('if (r3 < 0) r3 = 0'). Un
     chaleco de 3 deja una Beretta (7) en 4; uno de metal (10) para las
     pistolas enteras. Con 0 el golpe no entra: rebota (Actor.golpear). */
  Actor.danoSWF = function (A, base, quien, info) {
    let d = base;
    const arma = info && info.arma, f = arma && arma.ficha;
    const Ar = A.armadura;
    if (Ar) {
      const perfora = !!(quien && Progreso.perk(quien, 'perkArmorPierce'));
      if (info && info.cabeza) { if (!perfora || Ar.pesoCasco === 'heavy') d -= Ar.cabeza; }
      else if (!perfora || Ar.pesoCamisa === 'heavy') d -= Ar.cuerpo;
    }
    /* perkShotgunDamage (61107..61201): escopeta a menos de 120 px, x1,3. */
    if (f && f.cat === 'shotgun' && quien && Progreso.perk(quien, 'perkShotgunDamage') &&
        Math.hypot(A.x - quien.x, (A.z || 0) - (quien.z || 0)) < 120 * Weapons.PX) d *= 1.3;
    if (d < 0) d = 0;
    if (f && quien && arma.id === 'puños') d *= (quien.modDmg || 1) / 3;
    if (info && info.enRango === false) d *= 0.5;
    d *= (A.modArmor || 1);
    /* perkStunProof1 (61618..61703): un golpe de mas de 0 y no mas de
       6 se queda en 1. Es lo que la ficha cuenta de 'Immunity'
       ("Low-damage shots inflict next to no damage"), pero el bytecode
       lo cuelga de perkStunProof1 y perkImmuneLowDmg no se mira en
       ningun sitio: se hace como el bytecode. */
    if (Progreso.perk(A, 'perkStunProof1') && d > 0 && d <= 6) d = 1;
    /* perkHeadshotCrits (61828..62881): en la cabeza, x r18, al azar
       entre 1,2 y 2 -r18 = randomNumber(120, 200) / 100-, salvo contra
       un principal (amSpecial) o con arma blanca, que r18 = 1. */
    if (info && info.cabeza && quien && Progreso.perk(quien, 'perkHeadshotCrits') &&
        !A.especial && !(f && f.tipo === 'melee')) {
      d *= (120 + Math.floor(Math.random() * 81)) / 100;
    }
    return d;
  };

  /* La cabeza: el ovalo de chars.js va de 1,315 - 0,392 = 0,923 a
     1,707 (x la escala del muñeco); un impacto por encima de su borde
     de abajo es un tiro en la cabeza (el hitTest con myHead del SWF). */
  Actor.cabezaBaja = function (A) { return (1.315 - 0.392) * ((A && A.cuerpo && A.cuerpo.escala) || 1); };

  Actor.golpear = function (A, dano, ex, ey, hx, hy, quien, info, ez) {
    if (!A.vivo || A.invulnerable > 0) return false;
    /* Si la TAC lo para, no sangra: quien llama mira info.bloqueado. */
    if (info) info.bloqueado = false;
    /* LA GUARDIA va antes que la TAC (checkMeleeHit 82453 y 85374). */
    if (Actor.bloquea(A, quien, info)) {
      Actor.paro(A, quien, info, hx, hy);
      if (info) { info.bloqueado = true; info.parado = true; }
      return false;
    }

    /* --- LA TAC: mientras quede barra, el golpe NO entra ---

       Un disparo APUNTADO si entra: es la unica llave que abre la
       guardia, igual que el aimTimer del original, y es lo que
       hace que apuntar a mano valga la pena.

       El sello es por gatillazo: los ocho perdigones de una
       escopeta son UN disparo, asi que muerden la barra una sola
       vez. Sin esto, un escopetazo la vaciaba entero. */
    /* LA TIRADA DE FUERA DE RANGO (Progreso.desvia): un disparo no
       apuntado que pasa del myRange puede irse a la TAC del blanco en
       vez de al cuerpo, TENGA O NO BARRA. Con barra ya iba a ella;
       sin barra es un tiro que se esquiva y no hace nada. */
    const fi = info && info.arma && info.arma.ficha;
    const desvio = !!(info && info.enRango === false && !info.apuntado && fi && fi.tipo === 'fuego' &&
                      (!A.tacMax || A.tac <= 0) && Progreso.desvia(quien, fi, info.excesoPx));
    if ((A.tacMax && A.tac > 0 && !(info && info.apuntado)) || desvio) {
      if (!info || A.tacSello !== info.sello) {
        if (info) A.tacSello = info.sello;
        const coste = Actor.tacCoste(A, quien, info);
        A.tac = Math.max(0, A.tac - coste);
        /* El reloj de recarga se reinicia SOLO si el impacto
           costo algo. En el original:

             hitTactics: ... if (c > 0) this.tacTimer = 0;

           Parece un detalle y no lo es: un principal aturdido
           paga 0, y reiniciando el reloj igualmente se quedaba sin
           recargar nunca mientras lo tuvieran bajo fuego. La
           barra NO se le llenaba jamas. */
        if (coste > 0) {
          A.tacEspera = 0;
          Actor.finta(A, quien);
        }
        if (info) info.bloqueado = true;
        /* Esto, en cambio, va SIEMPRE: el original pone
           tacDisplayTimer = 20 en la primera linea de hitTactics,
           antes de calcular nada. Aunque el golpe no cueste, la
           barra se enciende: te han disparado y te enteras. */
        A.tacMostrar = Actor.TAC_VER;
        A.tacBrillo = 1;
        Anim.encajar(A.anim, 0.3);
        /* Librarse de un machetazo no suena como librarse de una
           bala: uno es chapa contra chapa -el bloqueo- y la otra
           es un rebote. El original tambien los separa. */
        Sonido.tocar((info && info.arma && info.arma.ficha.tipo === 'melee')
                     ? 'bloqueo' : 'tac',
                     { x: A.x, cam: Game.camX, vol: 0.55 });
        /* Ya no hace falta el cartel de 'TAC' en el HUD: la barra
           esta sobre la cabeza del muñeco y se enciende sola. Dos
           avisos de lo mismo es uno de mas. */
      }
      return false;
    }

    /* EL ULTIMO GOLPE DE UN ARMA ROTA (applyDamage, 62516..62719): si el
       arma blanca que pega esta 'broken' (Actor.desgastar), se queda en
       0 -se deshace al volver a gastarla- y al que la recibe, si tiene
       menos de 50 de vida y no es un jefe, se le deja en 0 y el golpe en
       1: lo remata. Asi acaba en el SWF un bate de 20 golpes. */
    const oa = info && info.arma;
    let remate = false;
    if (oa && oa.roto && oa.id !== 'puños' && oa.ficha && oa.ficha.tipo === 'melee') {
      oa.salud = 0;
      if (A.vida < 50 && !A.jefe) { A.vida = 0; dano = 1; remate = true; }
    }
    dano = Actor.danoSWF(A, dano, quien, info);
    /* LA ARMADURA LO PARO ENTERO (checkDamage con r3 = 0): ni vida, ni
       sangre, ni aturdimiento, ni derribo. Suena 'blockmelee' si fue un
       golpe cuerpo a cuerpo y 'ricochet' si fue un tiro (el 'clang' es de
       las prendas que se rompen, que en la tienda no hay), y saltan
       chispas donde pego. */
    if (dano <= 0 && !remate) {
      if (info) { info.bloqueado = true; info.blindado = true; }
      Sonido.tocar(fi && fi.tipo === 'melee' ? 'bloqueo' : 'rebote', { x: A.x, cam: Game.camX, vol: 0.6 });
      if (global.Combat && Combat.chispas) Combat.chispas(hx, hy, A.z || 0);
      return false;
    }
    A.vida -= dano;
    if (remate) A.vida = Math.min(A.vida, 0);
    saludGuardia(A, quien);
    /* SIN DESARME AL RECIBIR DAÑO. En applyDamage (69588..69762) hay un
         if (amZombie && daño > 0 && (randomNumber(ceil(daño/3), 10) == 10
             || el que pega viene de un 'melee_dash')) dropGun()
       y es SOLO para zombis (myDataRef.amZombie, 69596): en la Arena no hay.
       Aqui se habia leido sin el amZombie y los enemigos soltaban el arma
       con cualquier golpe y siempre con el golpe corriendo. El arma solo
       cae con el derribo (applyKnockback -> dropGun, Actor.derribar). */
    /* La red de seguridad de los principales: encajar daño de
       verdad les rellena la barra entera. Del original, tal cual. */
    if (A.especial && A.vida > 0 && dano > 0 && A.tac < A.tacMax) {
      A.tac = A.tacMax;
      A.tacEspera = 0;
      A.tacMostrar = Actor.TAC_VER;
      A.tacBrillo = 1;
    }
    A.vx += ex;
    /* El empujon en profundidad. Antes no existia porque no habia a
       donde empujar: con la habitacion, un golpe de frente tiene
       que echar el cuerpo hacia el fondo. Va recortado a la banda
       jugable por el mismo tope que el andar. */
    if (ez) A.vz += ez;
    if (ey > 0 && A.y < 0.05) A.vy += Math.min(ey, 3.2);
    /* Las reacciones, a la escala del SWF (una Beretta hace 7, un bate
       9, una Colt 12): antes se median contra daños tres veces mayores. */
    Anim.encajar(A.anim, Math.min(1.4, dano / 9));
    Sonido.tocar('herida', { x: A.x, cam: Game.camX, vol: Math.min(1.2, 0.5 + dano / 20) });
    /* El aturdimiento (69000..69269): nunca con perkStunProof2, y con
       perkStunProof1 solo si el golpe llega a 20. */
    if (!Progreso.perk(A, 'perkStunProof2') && !(Progreso.perk(A, 'perkStunProof1') && dano < 20)) {
      A.aturdido = Math.max(A.aturdido, Math.min(0.5, dano / 30));
    }
    if (A.vida <= 0) {
      A.asesino = quien || null;          // para la barra de bullet time
      Actor.morir(A, ex, ey, hx, hy, ez);
      return true;
    }
    return false;
  };

  /* -------------------------------------------------------------
     MORIR

     Aqui es donde el muñeco deja de estar animado y pasa a estar
     SIMULADO. El impulso se pasa con el punto donde entro el golpe,
     y el ragdoll lo reparte por cercania: un tiro en la cabeza tira
     la cabeza y el cuerpo va detras; un escopetazo al pecho levanta
     el tronco entero. Eso es lo que hace que dos muertes distintas
     se vean distintas.
     ------------------------------------------------------------- */
  Actor.morir = function (A, ex, ey, hx, hy, ez) {
    if (!A.vivo) return;
    A.vivo = false;
    A.muerte = 0;
    A.vx = (ex || 0) * 0.55;
    A.vz = (ez || 0) * 0.55;
    A.vy = 1.4;
    const cy = A.y + A.alto * 0.62;
    /* Un cuerpo que cae de un empujon fuerte no suena como uno que
       se desploma: el original tiene S_Land1..6 y un S_LandHard
       aparte, y la diferencia es exactamente esa. */
    Sonido.tocar(Math.abs(ex || 0) > 4 ? 'caidaDura' : 'caida',
                 { x: A.x, cam: Game.camX });
    Combat.matanza(A.x, cy, A.z, Math.sign(ex || 1), (ez || 0) * 0.25);
    A.rag = Ragdolls.crear(A, {
      x: hx === undefined ? A.x : hx,
      y: hy === undefined ? cy : hy,
      z: A.z,
      ix: (ex || 0) * 1.15,
      iy: 2.4 + Math.hypot(ex || 0, ez || 0) * 0.34,
      /* El cadaver sale por donde le dieron, tambien al fondo. Era
         0 fijo: un tiro de frente tumbaba al muñeco de lado. */
      iz: (ez || 0) * 1.15,
      radio: 0.62,
      /* El par de giro va SIEMPRE, incluso si el empujon es flojo:
         de lo contrario un muerto de un puñetazo suave se queda de
         pie sobre la pelvis, en equilibrio, sin nada que lo tumbe.
         Ver la explicacion larga en ragdoll.js. */
      giro: Math.sign(ex || (A.mirando || 1)) * (3.4 + Math.abs(ex || 0) * 0.55)
    });
    /* AL MORIR SE SUELTA EL ARMA DE VERDAD.

       Antes solo se APUNTABA cual era -A.soltoAlMorir- y el bucle
       generaba una copia en el suelo, pero al cadaver no se le
       quitaba nada: se quedaba empuñandola. O sea que por cada
       enemigo muerto habia dos armas, la del suelo y la de su mano,
       y al recoger la del suelo quedaban tres.

       Y cae EL MISMO objeto que llevaba (Weapons.equipar): con lo que le
       quedaba en el cargador y su desgaste. Un fusil tirado por un muerto
       que acababa de vaciarlo no puede aparecer lleno. */
    if (A.arma && A.arma.id !== 'puños') {
      A.soltoAlMorir = A.arma;
      if (A.armas) A.armas[A.ranura] = null;
      Actor.empuñar(A, null);
    } else {
      A.soltoAlMorir = null;
    }
    A.man = null;
  };

  /* =============================================================
     LO QUE UN GOLPE CUERPO A CUERPO HACE ADEMAS DEL DAÑO
     (MadnessCharacter, despues de checkDamage: 85924..86562, y el
     applyDamage del que lo recibe: 69341..69524). Solo si el golpe
     entro en el cuerpo -uno que se come la TAC va a targetsTac y se
     salta todo esto-.

     - STUN-DASH 1: un golpe corriendo (myStatus 'melee_dash...': aqui
       swf_melee_dash2 con arma y swf_unarmed_dash1, el melee_dash1 del
       SWF, sin ella) deja al blanco en 'stun_dash' si el que pega tiene
       perkStunDash1 (o el blanco es weakToDash, que en la Arena no hay).
     - EL DERRIBO: r10 = 22; con el golpe corriendo y perkStunDash2, 0;
       si no, 2 con perkKnockdown2 y 6 con perkKnockdown1. Con un arma
       ROMA o un puñetazo (myDamageType 'blunt' o 'punch': aqui lo que
       no corta) y randomNumber(0, r10) == 0 -1 de cada 23 sin perks-,
       applyKnockback(el que pega, STR / 2). A cualquiera: tambien al
       jugador cuando le pega un enemigo.
     ============================================================= */
  const DASH = /^swf_(melee_dash|unarmed_dash)/;
  Actor.efectosGolpe = function (V, quien, f, info, murio) {
    if (murio || !V || !V.vivo || !quien || (info && info.bloqueado) || !f || f.tipo !== 'melee') return;
    const dash = DASH.test((quien.anim && quien.anim.accion) || '');
    if (dash && Progreso.perk(quien, 'perkStunDash1') && !(V.derribo > 0)) Actor.aturdirDash(V);
    let r10 = 22;
    if (dash && Progreso.perk(quien, 'perkStunDash2')) r10 = 0;
    else if (!dash && Progreso.perk(quien, 'perkKnockdown2')) r10 = 2;
    else if (!dash && Progreso.perk(quien, 'perkKnockdown1')) r10 = 6;
    if (!f.corta && Math.floor(Math.random() * (r10 + 1)) === 0) Actor.derribar(V, quien, (quien.statSTR || 0) / 2);
  };

  /* applyKnockback (123664..124223): myStatus 'knockback', suelta el
     arma (dropGun), '_1' si mira al que le pega y '_2' si le da la
     espalda, y sale despedido a 'potencia' px por cuadro alejandose de
     el. El sprite (knockback_1/2, 82 cuadros, esquivas_swf.js) vuela
     hasta el cuadro 23 -actionSlowdown y el golpe contra el suelo- y
     desde ahi la velocidad se multiplica por 0,92 cada cuadro y se para
     por debajo de 1 (37709..37820). Tambien apaga el bullet time. */
  Actor.derribar = function (V, fuente, potencia) {
    if (!V.vivo || V.derribo > 0) return false;
    const fx = Math.cos(V.rumbo), fz = Math.sin(V.rumbo);
    const hx = fuente.x - V.x, hz = (fuente.z || 0) - (V.z || 0);
    const nombre = hx * fx + hz * fz >= 0 ? 'knockback_1' : 'knockback_2';
    const g = global.ESQUIVAS_SWF && global.ESQUIVAS_SWF[nombre];
    if (!g) return false;
    V.anim.accion = null;
    if (!Anim.esquivaSWF(V.anim, nombre, fx, fz)) return false;
    V.derribo = g.cuadros / 30; V.derG = g; V.derCuadro = 0; V.derFreno = false;
    const L = Math.hypot(hx, hz) || 1;
    V.derVx = -hx / L * potencia; V.derVz = -hz / L * potencia;       // px por cuadro
    V.aturdidoDash = 0; V.esquiva = 0;
    V.pendiente = false; V.golpeEnCola = false; V.bulletTime = false;
    Actor.soltarArma(V);
    return true;
  };

  /* dropGun: el arma cae al suelo con lo que le quede y se sigue a puños. */
  Actor.soltarArma = function (V) {
    if (!V.arma || V.arma.id === 'puños' || !global.Game || !Game.tirarArma) return false;
    Game.tirarArma(V.arma, V.x, V.y + 0.6, undefined, V.z);
    if (V.armas) V.armas[V.ranura] = null;
    Actor.empuñar(V, null);
    return true;
  };

  /* 'stun_dash' (sprite 5574): 54 cuadros sin control. En los cuadros
     2, 5, 17, 27 y 37 el sprite llama a generalStaggerMovement: a cara o
     cruz applySpeed(-5..-1) o (1..5) px por cuadro hacia donde mira, y
     -2..2 en profundidad; y los aturdidos frenan 0,65 px por cuadro cada
     cuadro (37190..37594). */
  const TAMBALEOS = [2, 5, 17, 27, 37];
  Actor.aturdirDash = function (V) {
    const g = global.ESQUIVAS_SWF && global.ESQUIVAS_SWF.stun_dash;
    if (!g || !V.vivo) return;
    V.anim.accion = null;
    if (!Anim.esquivaSWF(V.anim, 'stun_dash', Math.cos(V.rumbo), Math.sin(V.rumbo))) return;
    V.aturdidoDash = g.cuadros / 30; V.dashCuadro = 0; V.derVx = 0; V.derVz = 0;
    V.aturdido = Math.max(V.aturdido, V.aturdidoDash);
    V.pendiente = false; V.golpeEnCola = false; V.bulletTime = false;
  };

  /* El paso del derribo y del stun_dash: la velocidad la imponen ellos. */
  function pasoFuera(A, dt) {
    const PXS = Weapons.PX * 30;
    if (A.derribo > 0) {
      A.derribo -= dt;
      const g = A.derG, hasta = (g.cuadros / 30 - Math.max(0, A.derribo)) * 30;
      for (const e of g.eventos) {
        if (e[0] <= A.derCuadro || e[0] > hasta) continue;
        if (e[1] === 'freno') A.derFreno = e[2];
        else if (e[1] === 'suelo' && global.Sonido) Sonido.tocar('caida', { x: A.x, cam: Game.camX });
      }
      A.derCuadro = hasta;
      if (A.derFreno) {
        const k = Math.pow(0.92, dt * 30);
        A.derVx *= k; A.derVz *= k;
        if (Math.hypot(A.derVx, A.derVz) < 1) { A.derVx = 0; A.derVz = 0; }
      }
    } else if (A.aturdidoDash > 0) {
      A.aturdidoDash -= dt;
      const hasta = (54 / 30 - Math.max(0, A.aturdidoDash)) * 30;
      for (const c of TAMBALEOS) {
        if (c <= A.dashCuadro || c > hasta) continue;
        const v = Math.random() < 0.5 ? -(1 + Math.floor(Math.random() * 5)) : 1 + Math.floor(Math.random() * 5);
        const vz = Math.floor(Math.random() * 5) - 2;
        // applySpeed: v hacia donde mira, vz en profundidad (a lo ancho del rumbo)
        const fx = Math.cos(A.rumbo), fz = Math.sin(A.rumbo);
        A.derVx = fx * v - fz * vz; A.derVz = fz * v + fx * vz;
      }
      A.dashCuadro = hasta;
      const sp = Math.hypot(A.derVx, A.derVz), baja = 0.65 * dt * 30;
      const k = sp > baja ? (sp - baja) / sp : 0;
      A.derVx *= k; A.derVz *= k;
    } else return false;
    const sigue = A.derribo > 0 || A.aturdidoDash > 0;
    A.forzarVx = sigue ? A.derVx * PXS : null;
    A.forzarVz = sigue ? A.derVz * PXS : null;
    A.mover = 0; A.moverZ = 0; A.corriendo = false;
    return sigue;
  }
  Actor.fuera = function (A) { return A.derribo > 0 || A.aturdidoDash > 0; };

  /* =============================================================
     EL MANEJO DE ARMAS DEL SWF: RECOGER, CAMBIAR Y LANZAR

     Tres estados de MadnessCharacter, cada uno un sprite de
     madness_character (esquivas_swf.js, tools/swf_melee/esquivas.py):

       pickup        5589, 22 cuadros  pickupGun en el 15
       swap          5590, 24 cuadros  swapGear en el 16
       melee_throw1  5514, 48 cuadros  swish en el 11, throwWeapon en el 15

     Van con los de 'melee' y 'stun' (24699..24987, 35444..35527): sin
     control, la velocidad se apaga x0,89 por cuadro y acaban al llegar
     al ultimo cuadro del sprite. Aqui corren sobre la esquiva del SWF
     del animador (Anim.esquivaSWF), que ya pone cada pieza donde la
     pone el sprite, y esto va disparando sus eventos. */
  Actor.maniobra = function (A, nombre, fns, forzar) {
    const g = global.ESQUIVAS_SWF && global.ESQUIVAS_SWF[nombre];
    if (!g || !A.vivo || Actor.fuera(A) || A.esquiva > 0) return false;
    /* los aturdimientos (stun_parry, stun1..3) cortan lo que estuviera
       haciendo: el SWF cambia myStatus y el sprite sin esperar */
    if (forzar) { A.man = null; A.anim.accion = null; A.anim.esq = null; A.bloqueando = false; }
    if (A.man || Anim.ocupado(A.anim)) return false;
    if (!Anim.esquivaSWF(A.anim, nombre, Math.cos(A.rumbo), Math.sin(A.rumbo))) return false;
    /* Las manos, con el reparto de 'con arma' todo el rato: la de delante
       (handShoot_front) es la que coge, suelta o lanza el arma, y si el
       reparto cambiara al aparecer o irse el arma a mitad del sprite las
       dos manos saltarian de lado en un cuadro. */
    A.anim.esqArma = true;
    A.man = { nombre: nombre, g: g, cuadro: 0, fns: fns || {} };
    A.pendiente = false; A.golpeEnCola = false; A.irA = null;
    return true;
  };
  function pasoManiobra(A) {
    const M = A.man;
    if (!M) return;
    // cortada por otra cosa (un derribo): lo que no paso ya no pasa
    if (A.anim.esq !== M.g) { A.man = null; return; }
    const c = A.anim.esqT * 30;
    for (const e of M.g.eventos) {
      if (e[0] <= M.cuadro || e[0] > c) continue;
      if (e[1] === 'sonido') Sonido.tocar(e[2] === 'swish' ? 'silbido' : e[2], { x: A.x, cam: Game.camX });
      else if (M.fns[e[1]]) M.fns[e[1]]();
    }
    M.cuadro = c;
  }
  Actor.maniobrando = function (A) { return !!A.man; };

  /* =============================================================
     LA GUARDIA (toggleGuard con arma blanca, MadnessCharacter
     32824..32948): mientras se sostiene, myStatus 'block' -el sprite
     5357 en bucle-, blocking = true, sin andar (37798..37836) y el
     actionTimer contando. Sin arma blanca el mismo boton es la esquiva.
     ============================================================= */
  Actor.puedeGuardia = function (A) {
    return A.vivo && A.arma && A.arma.id !== 'puños' && A.arma.ficha.tipo === 'melee' &&
           !A.man && !A.irA && !Actor.fuera(A) && !(A.esquiva > 0) && !(A.aturdido > 0);
  };
  Actor.guardia = function (A, on) {
    const g = global.ESQUIVAS_SWF && global.ESQUIVAS_SWF.block;
    if (on && Actor.puedeGuardia(A)) {
      if (A.bloqueando && A.anim.esq === g) return true;
      if (Anim.ocupado(A.anim)) return false;              // no a mitad de un golpe
      if (!Anim.esquivaSWF(A.anim, 'block', Math.cos(A.rumbo), Math.sin(A.rumbo))) return false;
      A.anim.esqArma = true; A.anim.esqSostener = true;
      A.bloqueando = true; A.bloqueoT = 0;                 // actionTimer = 1
      return true;
    }
    if (A.bloqueando) {
      A.bloqueando = false;
      A.anim.giroBloqueo = undefined;
      if (A.anim.esq === g) { A.anim.esq = null; A.anim.centroEsq = null; A.anim.anguloRodada = 0; }
    }
    return false;
  };

  /* amBlocking (87620..87926): blocking y (arma blanca o perkBlock1 en el
     que para) y el que pega DELANTE; y no para si el que pega tiene
     perkBlockBreak y el golpe es de arma blanca (82517..82611: en la
     Arena siempre, el 'story' solo mira autoHit). Los puños son arma
     blanca (unarmedWeapon: melee = true). Lo lanzado no pasa por aqui. */
  Actor.bloquea = function (A, quien, info) {
    if (!A.bloqueando || !A.vivo || !quien || (info && info.lanzada)) return false;
    const f = info && info.arma && info.arma.ficha;
    const blanca = !f || f.tipo === 'melee';
    if (!blanca && !Progreso.perk(A, 'perkBlock1')) return false;
    if ((quien.x - A.x) * Math.cos(A.rumbo) + ((quien.z || 0) - (A.z || 0)) * Math.sin(A.rumbo) <= 0) return false;
    if (blanca && Progreso.perk(quien, 'perkBlockBreak')) return false;
    return true;
  };

  /* Lo que pasa al parar (checkMeleeHit 82618..83376):
     - de bala: con perkBlock2 la devuelve (deflectBullet y un makeBullet
       hacia el que disparo); si no, chispas (blockBullet).
     - perkMeleeDisarm en el que para, con el actionTimer por debajo de 10
       -los primeros 0,15 s de la guardia o desde la ultima parada- y un
       golpe de arma blanca que no sea de puños: el que pega queda en
       stun_parry1/2 y suelta el arma (disarmGun).
     - blockReset: actionTimer = 1 y recoilTimer = 14 (el retroceso).
     - hitTactics(inBlock): la TAC paga un cuarto (Actor.tacCoste).
     - damageMelee de las dos armas. */
  Actor.paro = function (A, quien, info, hx, hy, hz) {
    const f = info && info.arma && info.arma.ficha;
    const blanca = !f || f.tipo === 'melee';
    /* donde chocan: a media altura del arma de la guardia (su malla y 0,35 m
       por su eje), o donde llego el golpe si no hay arma */
    let px = hx === undefined ? A.x + Math.cos(A.rumbo) * 0.4 : hx;
    let py = hy === undefined ? A.y + A.alto * 0.6 : hy;
    let pz = hz === undefined ? (A.z || 0) + Math.sin(A.rumbo) * 0.4 : hz;
    if (A.mallaArma) {
      A.grupo.updateMatrixWorld(true);
      const e = _ejeG.set(0, 0, 1).transformDirection(A.mallaArma.matrixWorld);
      const o = _pt.setFromMatrixPosition(A.mallaArma.matrixWorld);
      px = o.x + e.x * 0.35; py = o.y + e.y * 0.35; pz = o.z + e.z * 0.35;
    }
    const parry = blanca && info && info.arma && info.arma.id !== 'puños' && info.arma.id !== 'lanzada' &&
                  Progreso.perk(A, 'perkMeleeDisarm') && A.bloqueoT < 0.15;
    Combat.chispazo(px, py, pz, quien.x - A.x, (quien.z || 0) - (A.z || 0), parry);
    Sonido.tocar('bloqueo', { x: A.x, cam: Game.camX });
    if (!blanca && Progreso.perk(A, 'perkBlock2') && info.arma && info.arma.ficha) {
      const r = Math.atan2((quien.z || 0) - (A.z || 0), quien.x - A.x);
      Combat.disparar(px, py, pz, r, 0, info.arma, Game.objetivos, A, true, true);
    }
    if (parry) {
      Actor.maniobra(quien, 'stun_parry' + (1 + Math.floor(Math.random() * 2)), null, true);
      Actor.soltarArma(quien);
    }
    A.bloqueoT = 0;
    A.anim.retroGuardia = 14;
    const c = Actor.tacCoste(A, quien, Object.assign({}, info, { bloqueo: true }));
    if (A.tacMax) {
      A.tac = Math.max(0, A.tac - c);
      if (c > 0) A.tacEspera = 0;
      A.tacMostrar = Actor.TAC_VER; A.tacBrillo = 1;
    }
    if (blanca && info && info.arma) Actor.desgastar(quien, info.arma);
    Actor.desgastar(A, A.arma);
  };

  /* meleeHealthHit (124233..125123): el golpe que ENTRA estando en
     guardia (con perkBlockBreak) le quita 1 de meleeHealth, que se repone
     a los 90 medios cuadros (1,5 s); a 0, suelta el arma, stun_parry, y
     si el que pega no es mas pequeño, applyKnockback(15). Luego 999 durante
     500 medios cuadros (8,3 s): no le vuelve a pasar enseguida. */
  function saludGuardia(A, quien) {
    if (!A.bloqueando || !(A.meleeSalud > 0)) return;
    A.meleeSalud -= 1; A.meleeSaludT = 1.5;
    if (A.meleeSalud !== 0 || !A.vivo) return;
    Actor.guardia(A, false);
    A.meleeSaludT = 500 / 60; A.meleeSalud = 999;
    if (quien && Actor.derribar(A, quien, 15)) return;      // derribar ya suelta el arma
    Actor.soltarArma(A);
    Actor.maniobra(A, 'stun_parry' + (1 + Math.floor(Math.random() * 2)), null, true);
  }

  /* findClosestPickup (114958..115613): el arma del suelo mas cercana
     dentro de una caja. Para el jugador (inPlayer) +-55 px de ancho y
     +-35 de fondo; para la IA +-255 y +-235. Solo las que ya estan
     quietas en el suelo (MadnessParticle.killMe la mete en allPickups al
     pararse). */
  const PX_ = 0.214 / 13.06;
  const _ejeG = new THREE.Vector3();
  Actor.pickupCercano = function (A, sueltas, esJugador) {
    const ax = esJugador ? 55 * PX_ : 255 * PX_, az = esJugador ? 35 * PX_ : 235 * PX_;
    let mejor = null, dmin = Infinity;
    for (let i = 0; i < sueltas.length; i++) {
      const s = sueltas[i];
      if (!s.alive || s.vuela || !s.obj) continue;
      const dx = s.x - A.x, dz = (s.z || 0) - (A.z || 0);
      if (Math.abs(dx) >= ax || Math.abs(dz) >= az) continue;
      const d = Math.hypot(dx, dz);
      if (d < dmin) { dmin = d; mejor = s; }
    }
    return mejor;
  };

  /* attractToMC(pickup, 'pickup') (113793..114034): se fija el arma como
     destino y se va andando hasta ella sin hacer caso a los mandos
     (targetLock); al llegar, initiatePickup (121647..121722): status
     'pickup', velocidad a 0. */
  Actor.irARecoger = function (A, s) {
    if (!s || A.man) return false;
    A.irA = { s: s, t: 0 };
    return true;
  };
  Actor.irAPunto = function (A, x, z, rumbo, alLlegar) {
    if (A.man) return false;
    A.irA = { punto: { x: x, z: z }, rumbo: rumbo, alLlegar: alLlegar, t: 0 };
    return true;
  };
  /* Lo llaman el jugador y la IA en su paso, en vez de sus mandos. */
  Actor.pasoIrA = function (A, dt) {
    const I = A.irA;
    if (!I) return false;
    I.t += dt;
    /* A UN SITIO (el panel: interactType 'activator' del SWF, que lleva al
       muñeco hasta intendedX/Y y le pone myStatus 'use'): al llegar se
       gira a I.rumbo y llama a I.alLlegar */
    if (I.punto) {
      const P = I.punto, dx = P.x - A.x, dz = P.z - (A.z || 0), d = Math.hypot(dx, dz);
      if (I.t > 2.5 || Actor.fuera(A) || !A.vivo) { A.irA = null; return false; }
      if (d < 0.10) {
        A.mover = 0; A.moverZ = 0; A.vx *= 0.3; A.vz = (A.vz || 0) * 0.3;
        A.irA = null;
        if (I.rumbo !== undefined) { A.rumbo = A.rumboObj = I.rumbo; }
        if (I.alLlegar) I.alLlegar();
        return true;
      }
      A.mover = dx / d; A.moverZ = dz / d; A.corriendo = false;
      A.rumboObj = Math.atan2(dz, dx);
      return true;
    }
    const s = I.s;
    if (!s.alive || s.vuela || I.t > 2 || Actor.fuera(A) || !A.vivo || A.armas[A.ranura]) { A.irA = null; return false; }
    const dx = s.x - A.x, dz = (s.z || 0) - (A.z || 0), d = Math.hypot(dx, dz);
    if (d < 0.12) {
      A.mover = 0; A.moverZ = 0; A.vx *= 0.3; A.vz = (A.vz || 0) * 0.3;
      A.irA = null;
      Actor.recoger(A, s);
      return true;
    }
    A.mover = dx / d; A.moverZ = dz / d; A.corriendo = false;
    A.rumboObj = Math.atan2(dz, dx);
    return true;
  };

  /* initiatePickup + pickupGun (121305..121639): en el cuadro 15 el arma
     del suelo pasa a la ranura que se empuña, la MISMA (myWeapons[n] =
     targetPickup.myGun) con sus balas y su desgaste, y suena swapmelee o
     swapgun. */
  Actor.recoger = function (A, s) {
    if (A.armas[A.ranura]) return false;
    return Actor.maniobra(A, 'pickup', {
      pickupGun: () => {
        if (!s.alive || s.vuela || !s.obj || A.armas[A.ranura]) return;
        const o = s.obj;
        s.alive = false; s.obj = null;
        if (s.malla) s.malla.visible = false;
        A.armas[A.ranura] = o;
        Actor.empuñar(A, o);
        Sonido.tocar(o.ficha.tipo === 'melee' ? 'cambiarMelee' : 'cambiar', { x: A.x, cam: Game.camX });
      }
    });
  };

  /* togglePickup (32453..32809) con algo en la mano: si es pesada
     (amHeavy) la suelta y queda aturdido; si no, 'melee_throw1' mirando
     hacia la mira, y en el cuadro 15 throwWeapon (121731..122962): el
     arma sale volando desde la mano (Game.lanzarArma). */
  Actor.lanzar = function (A, rumbo) {
    const o = A.armas[A.ranura];
    if (!o || A.man) return false;
    if (rumbo !== undefined) { A.rumbo = rumbo; A.rumboObj = rumbo; }
    return Actor.maniobra(A, 'melee_throw1', {
      throwWeapon: () => {
        if (A.armas[A.ranura] !== o) return;
        /* los de otro bando tiran el arma sin sus cargadores de repuesto
           (122770..122887: myRoster != playerRoster y myClips > 0 -> 0) */
        if (!A.esJugador && o.cargas > 0) o.cargas = 0;
        /* sale de la mano que la lleva (myHand / myHand2, localToGlobal) */
        let desde = null;
        if (A.mallaArma) {
          A.grupo.updateMatrixWorld(true);
          const p = new THREE.Vector3().setFromMatrixPosition(A.mallaArma.matrixWorld);
          desde = { x: p.x, y: p.y, z: p.z };
        }
        A.armas[A.ranura] = null;
        Actor.empuñar(A, null);
        if (global.Game && Game.lanzarArma) Game.lanzarArma(o, A, desde);
      }
    });
  };

  /* toggleAction (33592..33951): cambia de ranura si
       (myWeapon == 1 || perkSidearm1 || myWeapons[1]) && (myWeapons[0] || myWeapons[1])
     o sea: sin el perk solo se puede volver de la 1, o ir a ella si ya
     tiene algo; con una ranura vacia se cambia a los puños. Al empezar,
     solo el jugador, suena swapmelee si la otra es blanca y swapgun si
     es de fuego; en el cuadro 16 swapGear (115746..115817):
     myWeapon = 1 - myWeapon y rofTimer = 300 (listo para disparar). */
  Actor.puedeCambiar = function (A) {
    const w = A.armas;
    return (A.ranura === 1 || Progreso.perk(A, 'perkSidearm1') || !!w[1]) && (!!w[0] || !!w[1]);
  };
  Actor.cambiar = function (A) {
    if (!Actor.puedeCambiar(A) || A.man) return false;
    const otra = A.armas[1 - A.ranura];
    const ok = Actor.maniobra(A, 'swap', {
      swapGear: () => {
        A.ranura = 1 - A.ranura;
        Actor.empuñar(A, A.armas[A.ranura]);
        A.arma.espera = 0;
      }
    });
    if (ok && A.esJugador && otra) {
      Sonido.tocar(otra.ficha.tipo === 'melee' ? 'cambiarMelee' : 'cambiar', { x: A.x, cam: Game.camX });
    }
    return ok;
  };

  /* damageMelee (117440..118015): cada golpe de arma blanca que ENTRA le
     quita 1 de myHealth al arma del que pega (85924), y al parar uno con
     la guardia, 1 a cada arma (83317, 83376). A 12% o menos queda
     'broken' -saltan trozos (weaponBreakParticle) y su proximo golpe
     remata, ver Actor.golpear- y a 0 se deshace en la mano: la ranura se
     vacia, el que la llevaba queda aturdido (stun1..3, 17, 21 o 18
     cuadros hasta su stop()) y suena 'break'. Los puños no se gastan. */
  const STUN_ROTURA = [17, 21, 18];
  Actor.desgastar = function (A, o, n) {
    if (!o || o.id === 'puños' || o.ficha.tipo !== 'melee' || !(o.saludMax > 0)) return;
    o.salud -= n || 1;
    if (o.salud <= o.saludMax * 0.12 && !o.roto) {
      o.roto = true;
      if (A && A.vivo && A.arma === o && A.mallaArma) {
        let p = Actor.puntaArma(A);
        if (!p) { A.grupo.updateMatrixWorld(true); p = _pt.setFromMatrixPosition(A.mallaArma.matrixWorld); }
        Combat.chispas(p.x, p.y, p.z);
      }
    }
    if (o.salud <= 0 && A && A.armas) {
      const k = A.armas.indexOf(o);
      if (k >= 0) A.armas[k] = null;
      if (A.arma === o) {
        Actor.empuñar(A, null);
        const k = Math.floor(Math.random() * 3);
        if (!Actor.maniobra(A, 'stun' + (k + 1), null, true)) A.aturdido = Math.max(A.aturdido, STUN_ROTURA[k] / 30);
      }
      Sonido.tocar('romper', { x: A.x, cam: Game.camX });
    }
  };

  /* =============================================================
     PASO DE SIMULACION
     ============================================================= */
  Actor.actualizar = function (A, dt, t) {
    if (!A.vivo) return Actor.actualizarMuerto(A, dt, t);

    A.aturdido = Math.max(0, A.aturdido - dt);
    A.invulnerable = Math.max(0, A.invulnerable - dt);
    Actor.pasoTac(A, dt);
    if (A.derribo > 0 || A.aturdidoDash > 0) pasoFuera(A, dt);
    pasoManiobra(A);
    pasoFunda(A);
    /* la guardia: el actionTimer, el retroceso (recoilTimer x0,8 por
       cuadro, 54266..54340) y el reloj de meleeHealth */
    if (A.bloqueando) {
      A.bloqueoT += dt;
      /* El arma de una mano a 19,2 grados de la vertical (Anim.GUARDIA_ARMA):
         se mide donde quedo en el cuadro anterior y se corrige el giro de la
         mano. Medido, el arma gira 1:1 con ese giro (57 grados por radian,
         tambien el bate), asi que converge en un cuadro. */
      if (A.mallaArma) {
        A.grupo.updateMatrixWorld(true);
        const e = _ejeG.set(0, 0, 1).transformDirection(A.mallaArma.matrixWorld);
        const err = Anim.GUARDIA_ARMA - Math.atan2(e.x * Math.cos(A.rumbo) + e.z * Math.sin(A.rumbo), e.y);
        A.anim.giroBloqueo = (A.anim.giroBloqueo === undefined ? -0.6 : A.anim.giroBloqueo) + err;
      }
      if (A.anim.esq !== (global.ESQUIVAS_SWF && ESQUIVAS_SWF.block)) A.bloqueando = false;
      else { A.mover = 0; A.moverZ = 0; A.corriendo = false; }
    }
    if (A.anim.retroGuardia > 0.05) A.anim.retroGuardia *= Math.pow(0.8, dt * 30); else A.anim.retroGuardia = 0;
    if (A.meleeSaludT > 0) { A.meleeSaludT -= dt; if (A.meleeSaludT <= 0) A.meleeSalud = 3; }

    /* --- Movimiento ---
       La aceleracion es alta y el frenado tambien: en Madness
       nadie desliza. Se arranca y se para casi en el sitio, que es
       lo que permite esquivar una escopeta a un metro. */
    const puedeAndar = A.aturdido <= 0 && !Anim.ocupado(A.anim);
    /* frenoCadaver: empujar un cadaver cuesta (ragdoll.js, R.paso). */
    /* modSpeed = 1 + DEX/45 multiplica mySpeed y myAccel
       (resetStats, 54977..55012). */
    const kVel = A.modSpeed || 1;
    const tope = (A.corriendo ? 6.4 : 3.5) * (A.frenoCadaver || 1) * kVel;
    /* EN DIAGONAL NO SE CORRE MAS.

       Con dos ejes sueltos, empujar la palanca a la esquina da
       sqrt(2) = 1,41 veces la velocidad de ir recto, y eso se nota
       enseguida: todo el mundo se mueve en diagonal porque es mas
       rapido. La palanca se recorta al circulo unidad. */
    let mvX = A.mover, mvZ = A.moverZ;
    const mag = Math.hypot(mvX, mvZ);
    if (mag > 1) { mvX /= mag; mvZ /= mag; }
    const objetivo = puedeAndar ? mvX * tope : 0;
    const objetivoZ = puedeAndar ? mvZ * tope : 0;
    const enSuelo = A.y <= 0.001;
    /* El agarre es el de siempre tambien durante el agache 'tactics':
       en el SWF ese estado no empuja (ver Actor.finta). */
    const agarre = (enSuelo ? 42 : 9) * kVel;
    if (A.forzarVx !== null) A.vx = A.forzarVx;
    else A.vx = U.damp(A.vx, objetivo, agarre, dt);
    /* La voltereta impone las DOS velocidades. Antes la z se
       amortiguaba a cero mientras durase, asi que rodar hacia el
       fondo o hacia la camara no movia al muñeco ni un palmo. */
    if (A.forzarVz !== null && A.forzarVz !== undefined) A.vz = A.forzarVz;
    else A.vz = U.damp(A.vz, A.forzarVx !== null ? 0 : objetivoZ, agarre, dt);

    if (A.salto > 0) {
      A.salto = Math.max(0, A.salto - dt);
      if (enSuelo && puedeAndar) { A.vy = Actor.SALTO_VEL; A.salto = 0; }
    }
    A.vy -= Actor.GRAVEDAD * dt;
    // en bullet time el desplazamiento va al 40% (ver Game.paso)
    const kMov = A.kMov !== undefined ? A.kMov : global.Game ? (Game.movLento || 1) : 1;   // A.kMov: el jugador (Player.kMov)
    A.x += A.vx * dt * kMov;
    A.y += A.vy * dt * kMov;
    if (A.y <= 0) { A.y = 0; A.vy = 0; }

    /* SALIR DE LA PUERTA. Quien nace en el hueco -z negativa- se
       viene andando al plano de pelea en vez de aparecer ya
       puesto. Es medio segundo y es lo que hace que la puerta
       sirva para algo: se ve de donde sale cada uno. */
    A.velZ = 0;
    if (A.salFondo > 0) {
      /* SALIR DE LA PUERTA A PASO, no deslizandose.

         Se sale a velocidad CONSTANTE -la de andar- en vez de con
         un amortiguador: un amortiguador arranca de golpe y frena
         al final, que es como se mueve una caja empujada, no como
         anda alguien. Y la velocidad se guarda en velZ para que el
         animador tenga con que mover las piernas: sin eso el
         muñeco cruzaba el vano en pose de reposo, flotando. */
      const paso = 2.35;
      A.z = Math.min(Arena.PLANO, A.z + paso * dt);
      A.velZ = paso;
      /* Cuanto queda de salir, de 1 a 0. Lo lee el giro de arriba
         para orientar al muñeco de frente mientras cruza el vano. */
      A.saliendo = Math.min(1, (A.z - Arena.PLANO) / -(A.zPuerta || 1.05));
      if (A.z >= Arena.PLANO - 0.002) {
        A.z = Arena.PLANO; A.salFondo = 0; A.saliendo = 0; A.vz = 0;
      }
    } else {
      /* Y fuera del vano, la z es una coordenada mas: se anda por
         ella como por la x. */
      A.z += A.vz * dt * kMov;
      A.velZ = A.vz;
      if (A.saliendo) A.saliendo = Math.max(0, A.saliendo - dt * 2.4);
      if (!A.sinTope && A.z < Arena.Z_ATRAS)  { A.z = Arena.Z_ATRAS;  A.vz = Math.max(0, A.vz); }
      if (!A.sinTope && A.z > Arena.Z_FRENTE) { A.z = Arena.Z_FRENTE; A.vz = Math.min(0, A.vz); }
    }

    /* SALIR POR UNA PUERTA DE EXTREMO.

       Estas estan en la pared de los extremos y miran hacia dentro
       de la arena, asi que por ellas se sale andando por la X, no
       hacia la camara. Aqui no hay pose de frente ni giro: el que
       sale ya esta de perfil, porque es la postura con la que va a
       pelear. Es lo que hace el original.

       Va a la misma velocidad que la salida de fondo -2,35 m/s, la
       de andar- para que las cinco puertas escupan igual. */
    if (A.salLado) {
      const paso = 2.35 * dt;
      A.salX = Math.max(0, A.salX - paso);
      A.x += A.salLado * paso;
      if (A.salX <= 0) { A.salLado = 0; A.salX = 0; }
    }

    // los trastos empujan, no bloquean
    const emp = Arena.empujar(A.x, A.z, A.r);
    const kEmp = Math.min(1, dt * 26);
    A.x += emp.x * kEmp;
    A.z += emp.z * kEmp;
    /* El tope de la arena esta 1,8 m por dentro de la pared, o sea
       POR DELANTE de las puertas de extremo. Aplicarselo a quien
       todavia esta cruzando el vano lo teletransporta al tope y la
       salida no ocurre: mientras sale, no hay tope. */
    /* sinTope: cruzando una puerta con guion (game.js, pasoCruce) se
       entra en el vano, que esta por fuera del tope. */
    if (!A.salLado && !A.sinTope) {
      const lim = Arena.limite();
      if (A.x < Arena.CX - lim) { A.x = Arena.CX - lim; A.vx = Math.max(0, A.vx); }
      if (A.x > Arena.CX + lim) { A.x = Arena.CX + lim; A.vx = Math.min(0, A.vx); }
    }

    /* =============================================================
       HACIA DONDE MIRA

       Un solo dato, 'rumbo', y de el salen el lado, el angulo de
       marcha y el giro del grupo. Antes eran tres calculos
       independientes y por eso se peleaban.

       El objetivo del fotograma, por orden de mando:

         1. Lo que pida quien le maneja ('rumboObj'). Es como un
            enemigo mira al jugador para pegarle: con la arena en
            dos dimensiones, el que te pega desde el fondo a la
            izquierda tiene que mirar ahi, en diagonal, y no
            simplemente "a la izquierda".
            Apuntar con un arma de fuego entra por aqui tambien:
            lo pide mira.js, con el rumbo a la mira. Y tiene que ser
            asi, porque desde que la bala viaja en el plano el rumbo
            del cuerpo ES la direccion del tiro: si el cuerpo mirase
            a un sitio y la bala saliera por otro, la linea de
            punteria estaria mintiendo.
         2. Andando, hacia donde anda. Aqui esta el rumbo libre: se
            cruza la habitacion de frente, de espaldas o en
            diagonal, y el cuerpo va con el paso.
         3. Y si no hay nada de lo anterior -parado y sin apuntar-
            se queda donde estaba. Volver solo al eje de la pelea
            haria que cualquiera que se detiene pegue un tiron.

       El umbral de 0,25 m/s es el mismo de siempre: por debajo, el
       vector de velocidad es ruido y el rumbo daria bandazos con el
       muñeco quieto. ============================================= */
    const vPlano = Math.hypot(A.vx, A.vz);
    let rObj = null;
    if (A.rumboObj !== null && A.rumboObj !== undefined) rObj = A.rumboObj;
    else if (vPlano > 0.25) rObj = Math.atan2(A.vz, A.vx);
    /* Derribado o tambaleandose (knockback, stun_dash) sale despedido o da
       tumbos, pero el cuerpo NO se gira hacia donde lo lleva la velocidad:
       el SWF lo empuja con mySpeedRight sin tocar myFacing. */
    if (A.derribo > 0 || A.aturdidoDash > 0) rObj = A.rumbo;

    /* LA CABEZA SIGUE AL OBJETIVO, NO A UN LADO FIJO.

       El giro de cabeza era un sesgo constante hacia la camara mas
       un '- mirando*0.06', y eso es exactamente lo que se veia: el
       cuello siempre torcido al mismo lado cuando el cuerpo se
       pone de costado, mire a donde mire el personaje.

       Lo que tiene que hacer una cabeza es mirar a lo que le
       importa. 'rumboObj' ya es eso -la mira del jugador, el
       enemigo al que va a pegar- asi que se guarda, con ocho
       decimas de memoria para que no se le caiga la vista en cuanto
       el que le maneja deja de pedir rumbo. Y sin nada que mirar,
       la cabeza mira A DONDE MIRA EL CUERPO, que es lo que hace
       cualquiera que anda sin nada que mirar.

       Y esto importa mas de lo que parece: el valor por defecto
       era 'a la camara', y como el cuello no da para noventa
       grados, de perfil el recorte saltaba SIEMPRE y la cabeza se
       quedaba clavada en el tope, al mismo lado, mirara a donde
       mirara el personaje. O sea el anclaje otra vez, ahora en el
       cuello. Con el cuerpo como valor por defecto, la cabeza solo
       se gira cuando hay algo a lo que girarse. */
    if (rObj !== null) { A.mirada = rObj; A.miradaT = 0.8; }
    else {
      A.miradaT = Math.max(0, A.miradaT - dt);
      if (A.miradaT <= 0) A.mirada = A.rumbo;
    }
    A.rumboObj = null;

    /* SALIENDO POR LA PUERTA SE SALE DE FRENTE, Y PUNTO.

       Habia una curva escrita que giraba al muñeco a su angulo de
       pelea mientras todavia estaba cruzando el vano: media
       zancada de frente y el resto girandose de lado, que es el
       anclaje de siempre asomando otra vez. Nadie sale de una
       puerta poniendose de perfil; se sale andando hacia delante y
       se gira DESPUES, cuando ya hay algo a lo que girarse.

       Asi que aqui no hay curva ni caso especial en el animador:
       se le pone el rumbo de frente -PI/2, a la camara- y de ese
       rumbo salen solos el lado, el paso y el giro del grupo, con
       la misma cuenta que el resto del juego. Al salir del vano,
       el rumbo se queda donde estaba y el amortiguador normal se
       encarga de llevarlo a donde haga falta.

       Las puertas de los EXTREMOS son otra cosa: por ahi se sale
       andando por la X, asi que el rumbo de salida es el de la X. */
    if (A.salFondo > 0) { A.rumbo = MEDIO_PI; A.paso = MEDIO_PI; rObj = null; }
    else if (A.salLado) {
      A.rumbo = A.salLado > 0 ? 0 : Math.PI; A.paso = 0; rObj = null;
    }
    if (rObj !== null) {
      A.rumbo = U.angLerp(A.rumbo, rObj, Math.min(1, dt * 12));
      /* angLerp suma diferencias y no envuelve, asi que el rumbo se
         va saliendo de [-PI, PI] al dar vueltas. El seno y el
         coseno no se enteran, pero un numero que crece sin tope
         acaba perdiendo precision en una partida larga. */
      if (A.rumbo > Math.PI) A.rumbo -= U.TAU;
      else if (A.rumbo < -Math.PI) A.rumbo += U.TAU;
    }

    /* EL LADO, CON HISTERESIS.

       'mirando' es el espejo del dibujo: cambia de signo la X del
       mundo y deja la profundidad igual. Sacarlo de cos(rumbo) a
       pelo hace que parpadee cuando el personaje mira casi de
       frente -cos pasa por cero y cualquier temblor lo cruza-, y un
       espejo que parpadea es un muñeco que vibra. Con el margen de
       0,10 tiene que pasarse de verdad al otro lado para voltear.

       Y vale TAMBIEN apuntando. Antes el lado lo ponia la mira a
       mano -'mirando = Mira.x >= a.x ? 1 : -1'- y el giro lo ponia
       otro sitio: dos dueños para el mismo dato, que es el bucle
       cerrado que ya habia roto la punteria una vez. Ahora la mira
       solo pide rumbo y el lado sale de aqui, de un sitio. */
    {
      const cr = Math.cos(A.rumbo);
      if (A.mirando > 0 && cr < -0.10) A.mirando = -1;
      else if (A.mirando < 0 && cr > 0.10) A.mirando = 1;
    }

    /* El angulo de marcha que lee el animador: el mismo rumbo,
       medido desde el eje de la pelea y con el espejo ya aplicado.
       No es otra cuenta, es una lectura de la de arriba. */
    A.marcha = Math.atan2(Math.sin(A.rumbo), A.mirando * Math.cos(A.rumbo));

    /* Y EL ANGULO DEL PASO, QUE NO ES EL DE LA MIRADA.

       Casi siempre coinciden: se anda hacia donde se mira. Pero con
       un arma en la mano no: el cuerpo se queda encarando al enemigo
       y los pies se van de lado, que es como se dispara moviendose.
       Si los pies dan el paso por el eje del tronco mientras el
       cuerpo se desplaza de costado, sale el paso de luna.

       Va amortiguado por lo mismo que el rumbo: un cambio
       instantaneo del eje de marcha hace que las piernas den un
       tiron al cambiar de direccion. Y parado hereda el de la
       mirada, para que los pies queden bajo el cuerpo. */
    if (vPlano > 0.25) {
      const pObj = Math.atan2(A.vz, A.mirando * A.vx);
      A.paso = U.angLerp(A.paso === undefined ? A.marcha : A.paso, pObj,
                         Math.min(1, dt * 12));
    } else {
      A.paso = U.angLerp(A.paso === undefined ? A.marcha : A.paso, A.marcha,
                         Math.min(1, dt * 6));
    }

    // el giro se suaviza: un cambio instantaneo de lado hace que el
    // muñeco parezca teletransportarse
    /* SALIENDO POR LA PUERTA, DE FRENTE.

       Mientras el actor todavia esta dentro del vano cruza la
       camara de frente, no de tres cuartos: es lo que se ve en el
       original y es lo que hace que la entrada se lea como entrar
       y no como aparecer de lado.

       El giro se mezcla con la profundidad que le queda por
       recorrer: dentro del hueco mira al frente -giro 0-, y segun
       sale se va girando a su angulo de pelea. La mezcla usa el
       cuadrado para que el giro ocurra sobre todo al final, ya
       fuera de la puerta, en vez de repartirse por todo el
       camino. */
    /* Y el giro del grupo es el rumbo, siempre y sin excepciones.

       Aqui vivian una curva de salida con rebase y un angLerp que
       perseguia mirando*VISTA. Los dos sobran: el rumbo ya viene
       amortiguado de arriba, asi que no hace falta un perseguidor
       detras -un perseguidor sobre otro es lo que hacia los
       tirones- y el cuerpo, las piernas y las manos comparten el
       mismo angulo por construccion. */
    A.giro = giroDeRumbo(A.rumbo);

    /* --- Arma --- */
    const arma = A.arma;
    if (arma) {
      /* rofTimer: +1 cuadro con perkBulletTime3 en bullet time. */
      arma.espera = Math.max(0, arma.espera - dt * Progreso.kTiempoROF(A));
      A.desdeTiro = (A.desdeTiro || 0) + dt;
      Progreso.pasoSMG(A, arma.ficha, A.desdeTiro, dt);
      if (arma.recargando > 0) {
        /* El reloj es el del Reload R: el cargador vacio cae y el
           nuevo entra en SUS cuadros (disparo.js). El de antes se tira
           con lo que llevase, como en el original. Los perks de
           recarga lo aceleran (Progreso.kRecarga). */
        const antes = arma.ficha.recarga - arma.recargando;
        arma.recargando -= dt * Progreso.kRecarga(A, arma.ficha);
        Disparo.recargando(A, antes, arma.ficha.recarga - arma.recargando);
        if (arma.recargando <= 0) Disparo.finRecarga(A);
      }
    }

    /* --- Animacion --- */
    const f = arma ? arma.ficha : null;
    const est = {
      /* La velocidad que ve el animador incluye la de salir por la
         puerta: andar hacia camara es andar igual. */
      vel: A.salLado ? 2.35 : Math.hypot(A.vx, A.velZ || 0),
      /* Donde esta de verdad: el animador clava la bota apoyada en el suelo
         con lo que el muñeco se movio (anim.js, LOS PIES), no con la
         velocidad pedida, que contra una pared o en bullet time miente. */
      x: A.x, z: A.z,
      aire: !enSuelo,
      tiempo: t,
      mirando: A.mirando,
      /* El giro DE VERDAD del grupo, no el de pelea. El animador
         convierte de eje de pelea a espacio de hueso con el, y si
         le llega el de pelea mientras el cuerpo esta de frente
         coloca las manos en un plano que no es el que se ve. */
      giro: A.giro,
      saliendo: A.saliendo,
      /* HACIA DONDE ANDA, de verdad.

         Mientras el juego fue de izquierda a derecha esto se podia
         deducir -solo habia una direccion posible- y el animador
         lo sacaba del giro del cuerpo. Ahora se anda por toda la
         habitacion, asi que el angulo de marcha es un dato y se
         mide del movimiento: cero es ir hacia donde se mira, pi
         medios es ir hacia la camara, pi es andar de espaldas.

         Solo se recalcula por encima de 0,25 m/s: por debajo, el
         vector de velocidad es ruido y el angulo daria bandazos
         con el muñeco parado. Y va amortiguado, porque un cambio
         instantaneo del eje de marcha hace que las piernas den un
         tiron al cambiar de direccion. */
      marcha: A.marcha,
      /* Y el eje por el que PISA, que con un arma en la mano no es
         el mismo. Ver la nota de A.paso en el paso de simulacion. */
      paso: A.paso,
      apunta: A.apuntando ? anguloLocal(A) : 0,
      /* LA CABEZA MIRA A DONDE HAY QUE MIRAR.

         'mirada' es un angulo del mundo y el giro del grupo sale de
         PI/2 - rumbo, asi que lo que hay que sumarle a la cabeza es

             (PI/2 - mirada) - (PI/2 - rumbo) = rumbo - mirada

         o sea la diferencia corta entre a donde mira el cuerpo y a
         donde quiere mirar la cara. Recortada a 0,72 rad -41
         grados, el giro de cuello de alguien que mira por encima
         del hombro; mas ya seria una lechuza-.

         Sin objetivo, 'mirada' vale PI/2 y la cuenta da -giro: la
         cara se pone de frente. Con objetivo, la cara se va a el.
         En los dos casos es un resultado, no un lado elegido a
         mano, y por eso ya no hay un lado preferido.

         (nota vieja) LA CABEZA BUSCA LA CAMARA.

         Aqui habia un giro de cabeza sacado del angulo de
         punteria, y desde que 'apunta' es el PICO del cañon -no un
         angulo del plano- eso ya no significaba nada: le metia a la
         cabeza un giro lateral proporcional a cuanto sube el arma.

         Lo que tiene que hacer es lo que hacia el sesgo del tronco
         antes de quitarlo: que se vea la cara. El cuerpo gira libre
         y la cabeza le devuelve el 42% de ese giro hacia la camara,
         con tope en 0,72 rad -41 grados, el giro de cuello de
         alguien que mira por encima del hombro; mas ya seria una
         lechuza-.

         Asi, de perfil el tronco esta a 90 grados y la cara a 49:
         tres cuartos, que es la pose de Madness de siempre. Y de
         espaldas el tope corta y la cara NO se ve, que es lo
         correcto: un personaje que te da la espalda te da la
         espalda. */
      miraCab: U.clamp(U.angDiff(A.mirada, A.rumbo), -0.72, 0.72),
      /* Esprintando con la mira a un lado o detras: cuanto giran manos,
         arma y cabeza respecto del cuerpo (el dash_turn del SWF). Del
         rumbo ACTUAL, para que el arma siga en la mira mientras el
         cuerpo se da la vuelta. */
      giroTiro: A.tiroGirado ? U.angDiff(A.yawTiro, A.rumbo) : 0,
      rumbo: A.rumbo,
      /* El agarre manda SIEMPRE que el arma lo tenga, se este
         apuntando o no. Antes solo se aplicaba apuntando, asi que
         quien llevaba un bate lo arrastraba a la altura de la
         cadera como si fuera una bolsa de la compra: las manos se
         quedaban en guardia y el arma, colgada del hueso, con
         ellas. */
      agarre: (f && f.agarre) ? f.agarre : null
    };
    Anim.actualizar(A.anim, dt, est);
    /* Los sonidos de los golpes del SWF, en su cuadro (el swish no va al
       pulsar: en chump1 suena en el cuadro 21). */
    const sp = A.anim.sonidosPend;
    if (sp && sp.length) {
      for (const n of sp) Sonido.tocar('silbido', { x: A.x, cam: Game.camX, vol: n === 'swishlow' ? 0.8 : 1 });
      sp.length = 0;
    }
    if (global.Golpes) Golpes.paso(A, dt);
    // la corredera, la bomba y el cargador, en su cuadro del SWF
    Disparo.piezas(A);
    Actor.colocar(A);
    armaLibre(A, dt);
  };

  /* -------------------------------------------------------------
     EL ARMA NO ENTRA EN EL SUELO NI EN EL CUERPO

     Los golpes del SWF son dibujos de perfil, y en 2D el arma se
     pinta SIEMPRE por encima del muñeco (handShoot_front va en la
     capa de delante). Dos cosas que en el dibujo se leen como "el
     arma pasa por delante" en 3D son choques:

       - por debajo de la linea de los pies: better6, finish2,
         basic5... el megachette baja hasta 0,9 m bajo los pies en el
         propio SWF. En 3D esa linea es el suelo.
       - por encima del cuerpo: los reveses y los golpes cruzados
         barren el torso y la cabeza. En 3D, con la mano a ras del
         costado, la hoja atravesaba el pecho.

     Un swing de verdad no hace ninguna de las dos: pasa por el
     COSTADO, por delante del cuerpo del lado de la mano que lo lleva,
     y se para en el suelo. Asi que en cada cuadro en que el arma choca:

       1. la mano, si ha entrado en el torso, sale hasta su superficie;
       2. contra el suelo, el arma se levanta en su plano de perfil -de
          lado se ve parada en el suelo-;
       3. contra el cuerpo, la hoja se gira sobre el agarre hacia el
          costado lo justo, con tope; si no basta, la mano sale algo mas.
          Girar hacia el costado no cambia el angulo de perfil: de lado
          se sigue viendo el dibujo del SWF.

     Medido contra la superficie de la malla (tools/swf_melee: cuerpo.js,
     suelo.js, mano_libre.js): de
     95 golpes que atravesaban el cuerpo y 71 que entraban en el suelo, a
     0 y 0. Ver G33-G36 en tools/swf_modelos/ERRORES.md.

     El cuerpo es el de la malla, medido una vez: el torso por
     anillos (superelipses de exponente 3, como lo construye
     addTubo), la cabeza y las botas por su caja, cada uno en el
     marco de su hueso.
     ------------------------------------------------------------- */
  const SUELO_MARGEN = 0.025;
  const CUERPO_MARGEN = 0.035;     // holgura del arma contra el cuerpo
  const RADIO_PUNO = 0.055;          // medio grueso del puño que agarra
  const _vv = new THREE.Vector3();

  /* El volumen de cada pieza del cuerpo, en el marco de su hueso. Se
     mide sobre la malla del contorno (la mas grande: es la que se ve)
     y se guarda en la geometria, que comparten todos los del mismo
     tipo. */
  function volumenCuerpo(c) {
    const geo = (c.contorno || c.piel).geometry;
    if (geo.userData.volumen) return geo.userData.volumen;
    const P = geo.attributes.position, S = geo.attributes.skinIndex;
    const inv = c.esqueleto.boneInverses, huesos = c.esqueleto.bones;
    const iT = huesos.indexOf(c.huesos[H.CUERPO]);
    const cajas = {};
    for (const k of ['CABEZA', 'PIE_I', 'PIE_D']) cajas[huesos.indexOf(c.huesos[H[k]])] = new THREE.Box3();
    /* El torso son anillos -las secciones de addTubo-: se mide cada
       anillo y entre dos se interpola. Por rodajas de alto fijo, las
       que caian entre dos anillos quedaban vacias y ahi "no habia
       cuerpo". */
    const anillos = new Map();
    for (let i = 0; i < P.count; i++) {
      const b = S.getX(i);
      _vv.fromBufferAttribute(P, i).applyMatrix4(inv[b]);
      if (b === iT) {
        const k = Math.round(_vv.y * 500);
        const q = anillos.get(k) || [Infinity, -Infinity, Infinity, -Infinity, 0, 0];
        q[0] = Math.min(q[0], _vv.x); q[1] = Math.max(q[1], _vv.x);
        q[2] = Math.min(q[2], _vv.z); q[3] = Math.max(q[3], _vv.z);
        q[4] += _vv.y; q[5]++;
        anillos.set(k, q);
      } else if (cajas[b]) cajas[b].expandByPoint(_vv);
    }
    // [y, cx, rx, cz, rz], de abajo arriba
    const aro = [...anillos.values()].map((q) => [q[4] / q[5], (q[0] + q[1]) / 2, (q[1] - q[0]) / 2,
                                                   (q[2] + q[3]) / 2, (q[3] - q[2]) / 2])
                                    .sort((a, b) => a[0] - b[0]);
    const piezas = [];
    for (const k of ['CABEZA', 'PIE_I', 'PIE_D']) {
      const bx = cajas[huesos.indexOf(c.huesos[H[k]])];
      if (!bx.isEmpty()) piezas.push({ hueso: H[k], c: bx.getCenter(new THREE.Vector3()),
                                       r: bx.getSize(new THREE.Vector3()).multiplyScalar(0.5) });
    }
    return (geo.userData.volumen = { aro: aro, piezas: piezas });
  }

  /* Cuanto esta metido un punto (del mundo) en el cuerpo: 0 si esta
     fuera. Las matrices inversas de los huesos van en _mInv. */
  const _mInv = [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()];
  const _vl = new THREE.Vector3();
  function metido(vol, P, margen) {
    const mg = margen === undefined ? CUERPO_MARGEN : margen;
    let m = 0;
    _vl.copy(P).applyMatrix4(_mInv[0]);
    const aro = vol.aro;
    if (_vl.y >= aro[0][0] && _vl.y <= aro[aro.length - 1][0]) {
      let k = 1;
      while (aro[k][0] < _vl.y) k++;
      const a = aro[k - 1], b = aro[k], t = (_vl.y - a[0]) / Math.max(1e-6, b[0] - a[0]);
      const cx = a[1] + (b[1] - a[1]) * t, rx = a[2] + (b[2] - a[2]) * t;
      const cz = a[3] + (b[3] - a[3]) * t, rz = a[4] + (b[4] - a[4]) * t;
      const dx = Math.abs(_vl.x - cx) / (rx + mg);
      const dz = Math.abs(_vl.z - cz) / (rz + mg);
      const e = dx * dx * dx + dz * dz * dz;
      if (e < 1) m += 1 - e;
    }
    for (let i = 0; i < vol.piezas.length; i++) {
      const pz = vol.piezas[i];
      _vl.copy(P).applyMatrix4(_mInv[i + 1]).sub(pz.c);
      const dx = _vl.x / (pz.r.x + mg), dy = _vl.y / (pz.r.y + mg), dz = _vl.z / (pz.r.z + mg);
      const e = dx * dx + dy * dy + dz * dz;
      if (e < 1) m += 1 - e;
    }
    return m;
  }
  /* Para medir desde fuera (sin holgura: la superficie de la malla). */
  Actor.metidoEnCuerpo = function (A, P) {
    const vol = volumenCuerpo(A.cuerpo);
    A.grupo.updateMatrixWorld(true);
    _mInv[0].copy(A.cuerpo.huesos[H.CUERPO].matrixWorld).invert();
    vol.piezas.forEach((pz, i) => _mInv[i + 1].copy(A.cuerpo.huesos[pz.hueso].matrixWorld).invert());
    return metido(vol, P, 0);
  };

  const _smi = new THREE.Matrix4(), _smo = new THREE.Matrix4(), _sb = new THREE.Box3();
  /* La caja del arma en su marco. 'conManos': con las manos que lleva
     pegadas (para el suelo); sin ellas, solo la hoja y el mango (para
     el cuerpo: la mano va a ras del costado y la toca por fuerza). */
  function cajaLocal(m, conManos) {
    const caja = new THREE.Box3();
    const fuera = new Set(conManos ? [] : Object.values(m.userData.manos || {}));
    m.updateWorldMatrix(true, true);
    _smi.copy(m.matrixWorld).invert();
    (function rec(o) {
      if (fuera.has(o)) return;
      if (o.isMesh && o.geometry) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        _smo.multiplyMatrices(_smi, o.matrixWorld);
        caja.union(_sb.copy(o.geometry.boundingBox).applyMatrix4(_smo));
      }
      for (const h of o.children) rec(h);
    })(m);
    return caja;
  }
  /* Los puntos del arma que se prueban: las 8 esquinas de su caja
     entera contra el suelo, y una rejilla por la hoja contra el
     cuerpo -a lo largo, a lo ancho y de canto: el bate es redondo-. */
  function puntosArma(m) {
    const c = cajaLocal(m, true), h = cajaLocal(m, false);
    const suelo = [], cuerpo = [];
    for (let k = 0; k < 8; k++)
      suelo.push(new THREE.Vector3(k & 1 ? c.max.x : c.min.x, k & 2 ? c.max.y : c.min.y, k & 4 ? c.max.z : c.min.z));
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const z = h.min.z + (h.max.z - h.min.z) * i / N;
      const ym = (h.min.y + h.max.y) / 2, xm = (h.min.x + h.max.x) / 2;
      cuerpo.push(new THREE.Vector3(xm, h.min.y, z), new THREE.Vector3(xm, ym, z), new THREE.Vector3(xm, h.max.y, z),
                  new THREE.Vector3(h.min.x, ym, z), new THREE.Vector3(h.max.x, ym, z));
    }
    return { suelo: suelo, cuerpo: cuerpo, n: suelo.length };
  }

  const _sp = new THREE.Vector3(), _sn = new THREE.Vector3(), _sd = new THREE.Vector3();
  const _sa = new THREE.Vector3(), _se = new THREE.Vector3();
  const _sq = new THREE.Quaternion(), _sr = new THREE.Quaternion(), _sqp = new THREE.Quaternion();
  let _sw = [];                       // los puntos del arma, del agarre a ellos, en el mundo
  /* Lo que choca el arma girada 'ang' sobre el eje (0 = nada), y en
     _falta lo que habria que levantarla para que no toque el suelo. */
  let _falta = 0;
  function choque(vol, nSuelo, ang) {
    let c = 0; _falta = 0;
    const meta = SUELO_MARGEN - _sp.y;
    for (let i = 0; i < _sw.length; i++) {
      _se.copy(_sw[i]).applyAxisAngle(_sa, ang);
      if (i < nSuelo) {
        if (_se.y < meta) { c += meta - _se.y; _falta = Math.max(_falta, meta - _se.y); }
      } else {
        c += metido(vol, _se.add(_sp)) * 0.2;
      }
    }
    return c;
  }

  /* Lo que se mete en el suelo el arma girada 'ang' sobre 'eje'. */
  function choqueSuelo(nSuelo, ang, eje) {
    let c = 0;
    const meta = SUELO_MARGEN - _sp.y;
    for (let i = 0; i < nSuelo; i++) {
      _se.copy(_sw[i]).applyAxisAngle(eje, ang);
      if (_se.y < meta) c += meta - _se.y;
    }
    return c;
  }

  /* LA MANO LIBRE, FUERA DEL CUERPO. Los golpes del SWF la mueven sola
     (handNone_back): en 2D pasa por delante del torso y de la cara, y
     en 3D se metia -finish1 la sube a la cara-. Su hueso cuelga del
     torso, asi que se mira en su marco -el del volumen- y si el puño
     entra se lo saca en direccion radial hasta la superficie. */
  const _vm = new THREE.Vector3(), _vc = new THREE.Vector3();
  function manoLibreFuera(A, vol, ids) {
    const hs = A.cuerpo.huesos;
    ids = ids || Chars.MANOS_I;
    const p = hs[ids[0]].position, aro = vol.aro;
    /* La cabeza (un ovalo): en finish1 la mano sube a la cara. Su hueso
       cuelga del torso, asi que su centro se pasa a este marco. */
    const cab = vol.piezas.find((pz) => pz.hueso === H.CABEZA);
    if (cab) {
      const hc = hs[H.CABEZA];
      _vc.copy(cab.c).applyQuaternion(hc.quaternion).add(hc.position);
      const dx = p.x - _vc.x, dy = p.y - _vc.y, dz = p.z - _vc.z;
      const rx = cab.r.x + RADIO_PUNO, ry = cab.r.y + RADIO_PUNO, rz = cab.r.z + RADIO_PUNO;
      const e = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) + (dz * dz) / (rz * rz);
      if (e < 1 && e > 1e-6) {
        const k = 1 / Math.sqrt(e);
        _vm.set(_vc.x + dx * k, _vc.y + dy * k, _vc.z + dz * k);
        for (const id of ids) hs[id].position.copy(_vm);
      }
    }
    if (p.y < aro[0][0] || p.y > aro[aro.length - 1][0]) return;
    let k = 1;
    while (aro[k][0] < p.y) k++;
    const a = aro[k - 1], b = aro[k], t = (p.y - a[0]) / Math.max(1e-6, b[0] - a[0]);
    const cx = a[1] + (b[1] - a[1]) * t, rx = a[2] + (b[2] - a[2]) * t + RADIO_PUNO;
    const cz = a[3] + (b[3] - a[3]) * t, rz = a[4] + (b[4] - a[4]) * t + RADIO_PUNO;
    const dx = p.x - cx, dz = p.z - cz;
    const e = Math.pow(Math.abs(dx) / rx, 3) + Math.pow(Math.abs(dz) / rz, 3);
    if (e >= 1) return;
    // sobre el mismo rayo desde el eje, hasta la superficie (exponente 3)
    const d = Math.hypot(dx, dz);
    const ux = d > 1e-4 ? dx / d : -1, uz = d > 1e-4 ? dz / d : 0;
    const r = 1 / Math.cbrt(Math.pow(Math.abs(ux) / rx, 3) + Math.pow(Math.abs(uz) / rz, 3));
    _vm.set(cx + ux * r, p.y, cz + uz * r);
    for (const id of ids) hs[id].position.copy(_vm);
  }

  function armaLibre(A, dt) {
    /* Durante el golpe y un rato despues: al acabar, la mano vuelve a la
       guardia amortiguada, y en esa vuelta tambien cruza el cuerpo. */
    if (A.anim.accion) A.trasGolpe = 0.7;
    else if ((A.trasGolpe = (A.trasGolpe || 0) - dt) <= 0) return;
    const vol = volumenCuerpo(A.cuerpo);
    if (A.anim.accion && /^swf_/.test(A.anim.accion)) {
      manoLibreFuera(A, vol);
      // sin arma las dos manos son libres: la D tambien cruza por delante
      if (/^swf_unarmed/.test(A.anim.accion)) manoLibreFuera(A, vol, Chars.MANOS_D);
    }
    const m = A.mallaArma, f = A.arma && A.arma.ficha;
    if (!m || !f || f.tipo !== 'melee') return;
    A.grupo.updateMatrixWorld(true);
    const pts = m.userData.puntosArma || (m.userData.puntosArma = puntosArma(m));
    _mInv[0].copy(A.cuerpo.huesos[H.CUERPO].matrixWorld).invert();
    vol.piezas.forEach((pz, i) => _mInv[i + 1].copy(A.cuerpo.huesos[pz.hueso].matrixWorld).invert());
    const ar = A.cuerpo.huesos[H.ARMA_D];
    ar.getWorldPosition(_sp);                          // el agarre: el pivote
    const todos = pts.suelo.concat(pts.cuerpo);
    while (_sw.length < todos.length) _sw.push(new THREE.Vector3());
    _sw.length = todos.length;
    for (let i = 0; i < todos.length; i++) _sw[i].copy(todos[i]).applyMatrix4(m.matrixWorld).sub(_sp);
    // hacia fuera: el costado del TORSO del lado de la mano del arma (su
    // +x), en planta. El del grupo no vale: el torso se tuerce y se
    // inclina en el golpe
    _sn.set(1, 0, 0).transformDirection(A.cuerpo.huesos[H.CUERPO].matrixWorld);
    _sn.y = 0;
    if (_sn.lengthSq() < 1e-6) return;
    _sn.normalize();
    /* 1. LA MANO FUERA DEL PECHO. En los golpes el SWF recoge el puño
       hasta la linea del cuerpo -en 2D pasa por delante-, y aqui la mano
       va a 0,21-0,39 m del eje con un torso de 0,30 de medio ancho: se
       metia dentro, y con ella el arranque de la hoja. Se la saca hacia
       fuera hasta su superficie, contando el grueso del puño. */
    let saca = 0;
    const borde = () => _se.copy(_sp).addScaledVector(_sn, saca - RADIO_PUNO);
    while (saca < 0.45 && metido(vol, borde()) > 0) saca += 0.01;
    _sp.addScaledVector(_sn, saca);
    /* 2. EL SUELO: el arma se levanta en su plano de perfil -sobre el
       eje del costado- lo justo para rozarlo, hacia el lado que menos
       gira. Asi no se mueve en profundidad y el pomo no se va hacia el
       cuerpo; de lado se ve el arma parada en el suelo. */
    let gs = 0;
    const cs0 = choqueSuelo(pts.n, 0, _sn);
    if (cs0 > 0) {
      let mejor = null;
      for (const sg of [1, -1]) {
        let a1 = -1;
        for (let ang = 0.05; ang <= 1.6; ang += 0.05) if (choqueSuelo(pts.n, sg * ang, _sn) === 0) { a1 = ang; break; }
        if (a1 < 0) continue;
        let a0 = a1 - 0.05;
        for (let k = 0; k < 5; k++) {
          const mid = (a0 + a1) / 2;
          if (choqueSuelo(pts.n, sg * mid, _sn) === 0) a1 = mid; else a0 = mid;
        }
        if (!mejor || a1 < Math.abs(mejor)) mejor = sg * a1;
      }
      if (mejor !== null) {
        gs = mejor;
        for (const v of _sw) v.applyAxisAngle(_sn, gs);
      }
    }
    /* 3. EL CUERPO: la mano algo mas fuera y la hoja girada hacia el
       costado, la combinacion mas pequeña que no toca nada. Girando
       mucho sobre el agarre el pomo se mete por el otro lado: por eso
       el giro va con tope y lo demas lo hace sacar la mano. */
    _sd.set(0, 0, 1).transformDirection(m.matrixWorld).applyAxisAngle(_sn, gs);
    _sa.crossVectors(_sd, _sn);
    const conEje = _sa.lengthSq() > 1e-6;
    if (conEje) _sa.normalize();
    const bx = _sp.x, bz = _sp.z;
    const c0 = choque(vol, pts.n, 0);
    let hi = 0, falta = 0;
    if (c0 > 0) {
      const PASO = 0.1;
      let mejor = null;                 // [coste, saca extra, angulo]
      for (let extra = 0; extra <= 0.36 + 1e-9 && !(mejor && mejor[0] === 0); extra += 0.03) {
        _sp.x = bx + _sn.x * extra; _sp.z = bz + _sn.z * extra;
        // sin eje -la hoja apunta justo al costado- solo se puede sacar
        const tope = conEje ? 0.9 : 0;
        for (let ang = 0; ang <= tope + 1e-9; ang += PASO) {
          const c = choque(vol, pts.n, ang);
          if (c === 0) {
            // afinado entre el anterior que chocaba y este
            let a0 = Math.max(0, ang - PASO), a1 = ang;
            if (ang > 0) for (let k = 0; k < 5; k++) {
              const mid = (a0 + a1) / 2;
              if (choque(vol, pts.n, mid) === 0) a1 = mid; else a0 = mid;
            }
            mejor = [0, extra, a1];
            break;
          }
          const coste = c + extra * 0.1 + ang * 0.01;
          if (!mejor || coste < mejor[0]) mejor = [coste, extra, ang];
        }
      }
      saca += mejor[1];
      hi = mejor[2];
      _sp.x = bx + _sn.x * mejor[1]; _sp.z = bz + _sn.z * mejor[1];
    }
    choque(vol, pts.n, hi);
    falta = _falta;
    if (saca === 0 && hi === 0 && gs === 0 && falta === 0) return;
    if (hi || gs) {
      // los giros -primero el del suelo, luego el del costado-, del
      // mundo al marco del padre del hueso
      _sr.setFromAxisAngle(_sa, hi).multiply(_sq.setFromAxisAngle(_sn, gs));
      ar.parent.getWorldQuaternion(_sqp);
      ar.quaternion.premultiply(_sq.copy(_sqp).invert().multiply(_sr).multiply(_sqp));
    }
    if (saca > 0 || falta > 0) {
      _sp.y += falta;
      ar.position.copy(ar.parent.worldToLocal(_sp));
    }
    ar.updateMatrixWorld(true);
  }

  /* -------------------------------------------------------------
     PONER EL GRUPO EN SU SITIO

     Casi siempre es una posicion y un giro sobre Y. La excepcion es
     la VOLTERETA, y por eso vive aqui y no en el animador: rodar es
     girar sobre la Z del MUNDO -el eje que apunta a la camara-, y
     ese eje no es ninguno de los del muñeco, que esta ladeado 55
     grados. Intentar rodar desde un hueso sale como una peonza en
     diagonal; desde el grupo, con cuaterniones, sale una voltereta.

     Y el pivote no es el suelo ni un punto fijo: es el CENTRO del
     cuerpo, y ese centro BAJA mientras se rueda.

     Con un pivote fijo a la altura del pecho la vuelta salia, pero
     el muñeco pasaba por arriba: al medio giro quedaba tumbado a
     78 cm del suelo, flotando como si lo hubieran lanzado. Una
     voltereta de verdad es una rueda: el cuerpo se ovilla y su
     centro se queda a la altura del radio de ese ovillo, no a la
     del pecho de pie.

     Asi que el centro sigue una altura propia -88 cm de pie, 46 en
     cuanto el cuerpo se tumba- y la posicion del grupo se despeja
     de ahi. De pie da cero exacto, tumbado deja el cuerpo pegado al
     suelo, y boca abajo la coronilla pasa a quince centimetros.
     ------------------------------------------------------------- */
  const EJE_Y = new THREE.Vector3(0, 1, 0);
  const EJE_Z = new THREE.Vector3(0, 0, 1);
  const _qA = new THREE.Quaternion(), _qB = new THREE.Quaternion();
  const _ejeRod = new THREE.Vector3();
  const ALTO_CENTRO = 0.88;      // el centro del cuerpo, de pie
  const RADIO_OVILLO = 0.46;     // a que altura queda ese centro ovillado

  Actor.colocar = function (A) {
    const ang = A.anim.anguloRodada, ce = A.anim.centroEsq;
    if (ang || ce) {
      const esc = A.cuerpo.escala;
      /* La esquiva del SWF (anim.js) trae su propio centro: el del torso,
         a la altura y con el avance que dice el SWF. */
      const hc = (ce ? ce.hc : ALTO_CENTRO) * esc;
      const co = Math.cos(ang);
      // de pie el centro esta arriba; en cuanto se tumba, al radio
      const cy = ce ? ce.y * esc : (RADIO_OVILLO + (ALTO_CENTRO - RADIO_OVILLO) * Math.max(0, co)) * esc;
      /* EL EJE DE LA VOLTERETA ES PERPENDICULAR A POR DONDE RUEDA.

         Era la Z del mundo, fija, o sea que el cuerpo solo podia
         dar la vuelta hacia los lados. Rodando hacia el fondo, el
         muñeco giraba de costado mientras se iba de frente: una
         peonza. El eje correcto es el horizontal perpendicular a la
         direccion de la rodada, que con (ex, ez) es (-ez, 0, ex),
         y el desplazamiento del centro va por esa misma direccion.
         Con ex = 1 y ez = 0 -rodar a la derecha- sale la Z del
         mundo y el eje viejo es el caso particular. */
      const rx = A.anim.rodarX === undefined ? 1 : A.anim.rodarX;
      const rz = A.anim.rodarZ === undefined ? 0 : A.anim.rodarZ;
      const s = hc * Math.sin(ang) + (ce ? ce.a * esc : 0);
      A.grupo.position.set(A.x + rx * s, A.y + cy - hc * co, A.z + rz * s);
      _ejeRod.set(-rz, 0, rx);
      _qA.setFromAxisAngle(_ejeRod, ang);
      _qB.setFromAxisAngle(EJE_Y, A.giro);
      A.grupo.quaternion.copy(_qA).multiply(_qB);
    } else {
      A.grupo.position.set(A.x, A.y, A.z);
      A.grupo.quaternion.setFromAxisAngle(EJE_Y, A.giro);
    }
  };

  /* El angulo de punteria, pasado al espacio del personaje.
     El cuerpo esta girado, asi que el mismo gesto del jugador
     significa cosas distintas segun a que lado mire. */
  function anguloLocal(A) {
    /* YA NO HAY CONVERSION QUE HACER.

       Esto era 'si mira a la izquierda, pi - a', y hacia falta
       porque 'apunta' era un angulo del MUNDO en el plano X-Y: el
       mismo numero significaba subir el arma mirando a la derecha y
       bajarla mirando a la izquierda.

       Ahora 'apunta' es el PICO del cañon, medido contra la
       distancia en planta y por tanto ya relativo a hacia donde
       mira el cuerpo. Positivo es arriba mire a donde mire, que es
       lo que el animador necesita. El recorte se queda: nadie se
       disloca el hombro. */
    return U.clamp(A.apunta, -1.25, 1.25);
  }
  Actor.anguloLocal = anguloLocal;

  /* =============================================================
     MUERTOS -> los lleva el ragdoll
     ============================================================= */
  Actor.actualizarMuerto = function (A, dt, t) {
    A.muerte += dt;
    if (!A.rag) return;
    Ragdolls.actualizar(A.rag, dt);
    Ragdolls.aplicar(A.rag, A);
    // la x del actor sigue al cuerpo: es lo que usan los objetivos
    const c = Ragdolls.centro(A.rag);
    A.x = c.x; A.y = Math.max(0, c.y - A.alto * 0.5);

    // sangra un momento y para; el charco lo deja el sistema de sangre
    if (A.muerte < 0.55 && U.rng() < dt * 20) {
      Combat.sangre(c.x, c.y, c.z, A.vx >= 0 ? 1 : -1, 0.22, 0, 2);
    }
  };

  /* Que un cadaver reciba un empujon: explosiones, o rematarlo a
     tiros, que en Madness es medio juego. */
  Actor.empujarCadaver = function (A, golpe) {
    if (A.rag) Ragdolls.impulso(A.rag, golpe);
  };

  /* =============================================================
     QUE NO SE ATRAVIESEN

     Hasta ahora dos personajes ocupaban el mismo metro cuadrado sin
     enterarse: se cruzaban como fantasmas, y tres grunts pegandole
     al jugador se fundian en una sola mancha. Lo mismo con los
     cadaveres, que caian unos dentro de otros.

     Para un juego que pasa en una linea recta esto es barato: si
     dos cilindros se pisan, se separan por el eje X y ya esta. No
     hace falta ni resolutor ni nada, porque no hay apilamiento
     posible -nadie se sube encima de nadie-.

     Se reparte segun el peso: un cadaver cede mas que un vivo, y un
     vivo mas que el jugador. Asi el jugador se abre paso a empujones
     -que es lo que tiene que pasar en Madness- en vez de quedarse
     atascado detras de una pared de grunts.

     El coste es n*(n-1)/2 comparaciones. Con el aforo de la arena
     son menos de cuarenta por fotograma.
     ============================================================= */
  Actor.separar = function (lista, dt) {
    const k = Math.min(1, dt * 22);
    for (let i = 0; i < lista.length; i++) {
      const A = lista[i];
      for (let j = i + 1; j < lista.length; j++) {
        const B = lista[j];
        /* Los cadaveres los lleva el ragdoll, tambien contra los vivos:
           el vivo es un cilindro que aparta cada masa dentro del paso de
           fisica (ragdoll.js, choque). Aqui se empujaba el cadaver ENTERO
           por la x y el vivo se frenaba contra el como contra una caja:
           se veia tieso y tosco. */
        if (!A.vivo || !B.vivo) continue;
        const dz = Math.abs(A.z - B.z);
        if (dz > 1.1) continue;
        /* SI NO SE SOLAPAN EN ALTURA, NO SE TOCAN.

           La separacion era solo horizontal: un cadaver tumbado mide
           unos 30 cm de alto y seguia empujando a un jugador que le
           pasaba metro y medio por encima. Saltar por encima de un
           cuerpo lo arrastraba de lado, que es justo lo contrario de
           poder esquivarlo. */
        if (!solapaEnAlto(A, B)) continue;
        /* EN EL PLANO, no por la x: la arena es una habitacion y dos que
           se cruzan en diagonal se metian uno en el otro por la z.

           Y LAS CABEZAS TAMPOCO SE ATRAVIESAN. La cabeza es mas ancha que
           el torso -ovalo de 0,333 de radio contra 0,33 del cuerpo- y va
           0,152 adelantada hacia donde mira (chars.js): dos que se
           encaran con los cuerpos tocandose tienen las cabezas metidas
           una en la otra, y se veian besandose. Asi que se separan los
           cuerpos (radio del cilindro) y ademas las cabezas (su centro
           en planta, con el adelanto, y su radio). */
        const pa = peso(A), pb = peso(B), t = pa + pb;
        const aparta = (dx, dz, d, min) => {
          if (d >= min) return;
          if (d < 1e-4) { dx = (A.mirando || 1) * -1; dz = 0; d = 1; }
          const e = (min - d) * k / d;
          A.x -= dx * e * (pb / t); A.z -= dz * e * (pb / t);
          B.x += dx * e * (pa / t); B.z += dz * e * (pa / t);
        };
        const dx = B.x - A.x, dz2 = (B.z || 0) - (A.z || 0);
        aparta(dx, dz2, Math.hypot(dx, dz2), (A.r + B.r) * 0.92);
        const ea = A.cuerpo.escala, eb = B.cuerpo.escala;
        const hx = (B.x + Math.cos(B.rumbo) * Chars.CABEZA_Z * eb) - (A.x + Math.cos(A.rumbo) * Chars.CABEZA_Z * ea);
        const hz = ((B.z || 0) + Math.sin(B.rumbo) * Chars.CABEZA_Z * eb) - ((A.z || 0) + Math.sin(A.rumbo) * Chars.CABEZA_Z * ea);
        aparta(hx, hz, Math.hypot(hx, hz), Chars.CARA.rx * (ea + eb));
        const emp = 0;
        /* Al cadaver se le EMPUJA, no se le traslada: mover() le
           corre las dos posiciones a la vez y el muerto se deslizaba
           tieso, como un mueble. empujar() le mete velocidad de
           verdad y reparte por cercania al que lo pisa, asi que si
           andas contra las piernas se le van las piernas. */
        const cy = (Actor.centro(A) + Actor.centro(B)) * 0.5;
        if (!A.vivo && A.rag) Ragdolls.empujar(A.rag, -emp * (pb / t), B.x, cy);
        if (!B.vivo && B.rag) Ragdolls.empujar(B.rag, emp * (pa / t), A.x, cy);
      }
    }
  };

  /* La franja vertical que ocupa un actor. Un cadaver la saca de su
     ragdoll -que es donde estan de verdad sus pedazos-; uno vivo, de
     su altura. */
  function franja(A, salida) {
    if (!A.vivo && A.rag) {
      const f = Ragdolls.franja(A.rag);
      salida.y0 = f.y0; salida.y1 = f.y1;
    } else {
      salida.y0 = A.y; salida.y1 = A.y + A.alto;
    }
    return salida;
  }
  const _fA = { y0: 0, y1: 0 }, _fB = { y0: 0, y1: 0 };

  /* Con un dedo de margen: rozar el borde de un cuerpo tumbado no
     tiene que frenar a nadie. */
  const MARGEN_ALTO = 0.06;
  function solapaEnAlto(A, B) {
    franja(A, _fA); franja(B, _fB);
    return _fA.y0 < _fB.y1 - MARGEN_ALTO && _fB.y0 < _fA.y1 - MARGEN_ALTO;
  }

  /* Cuanto cuesta apartar a cada uno. El jugador es el mas pesado:
     empuja y no lo empujan.

     Un cadaver no mueve a nadie: pesa 0 contra un vivo, asi que toda
     la correccion se la come el cuerpo y el que anda sigue su
     camino. Con 0,55 el jugador se frenaba al pisar un muerto, y
     encima lo arrastraba consigo. */
  function peso(A) {
    if (!A.vivo) return 0.0001;
    if (A.esJugador) return 3.0;
    return 1.0;
  }

  /* =============================================================
     CONSULTAS
     ============================================================= */
  /* Donde esta la PUNTA del arma ahora mismo, en el mundo. La usa el
     melee para poner la zona de impacto donde de verdad esta el
     filo: sin esto un machacon de arriba abajo pegaba a la misma
     altura que un reves, porque la caja era un punto fijo. */
  const _pt = new THREE.Vector3();
  /* Hacia donde apunta el arma en planta: el rumbo del cuerpo mas el
     giro de los brazos (esprintando con la mira detras). */
  /* RESTANDO: el giro es de los huesos, sobre +Y local, y un giro
     local positivo baja el rumbo del mundo -que es atan2(z, x)-. Con
     el signo sumado el rumbo del arma salia espejado respecto del
     cuerpo: bien con la mira justo detras (+PI y -PI son lo mismo),
     que es lo que media la prueba, y hasta 180 grados mal con la
     mira en diagonal. */
  Actor.rumboTiro = function (A) {
    return A.rumbo - ((A.anim && A.anim.giroTiro) || 0);
  };

  Actor.puntaArma = function (A) {
    const m = A.mallaArma;
    if (!m || !A.arma || !A.arma.ficha.punta) return null;
    A.grupo.updateMatrixWorld(true);
    _pt.set(0, 0, A.arma.ficha.punta).applyMatrix4(m.matrixWorld);
    return _pt;
  };

  /* Donde esta la mano libre ahora mismo: de ahi salen los puñetazos de
     los combos del SWF (checkMeleeHit 'unarmed'). */
  const _pl = new THREE.Vector3();
  Actor.manoLibre = function (A) {
    const h = A.cuerpo.huesos[H.MANO_I];
    if (!h) return null;
    A.grupo.updateMatrixWorld(true);
    return h.getWorldPosition(_pl);
  };

  /* De donde sale un golpe sin arma del SWF: la mano o el pie que pega
     (golpes_swf.js: manoD, manoI o pie, el que va delante en el cuadro
     del checkMeleeHit). Los puñetazos de la mano libre de los combos con
     arma ('unarmed') salen de la I. */
  /* manoD es la mano 'shoot' del SWF, la de delante del cuerpo, que en el
     muñeco es la I (lado de la camara); manoI es la 'none', la de detras:
     la D. Ver la rama sin arma de anim.js. */
  const HUESO_GOLPE = { manoD: H.MANO_I, manoI: H.MANO_D, unarmed: H.MANO_I, pie: H.PIE_D };
  Actor.puntoGolpe = function (A, tipo) {
    const h = A.cuerpo.huesos[HUESO_GOLPE[tipo]];
    if (!h) return null;
    A.grupo.updateMatrixWorld(true);
    return h.getWorldPosition(_pl);
  };

  /* ¿El golpe sin arma alcanza a o? En el SWF checkMeleeHit no mira
     donde esta el puño: mira si el blanco esta dentro del alcance del
     arma (Unarmed: myRange 95 px = 1,56 m) delante de quien pega. Y el
     puño del SWF llega justo ahi (85-92 px en el cuadro del golpe). Aqui
     es lo mismo en planta: el tramo que BARRE el puño, del cuerpo hasta
     donde esta, tiene que pasar por el blanco (su radio mas el grueso
     del puño). Un disco alrededor del puño fallaba de cerca: el puño
     pasa de largo 1,8 m y el que esta a medio metro quedaba fuera.
     Vale igual para las armas blancas (pt = la punta): el brazo y el
     arma barren todo el tramo, y con el enemigo encima la punta caia
     detras de el y el golpe no tocaba. */
  Actor.barrePuno = function (A, pt, o) {
    /* El tramo va por el EJE hacia el que mira, hasta donde llega el puño
       hacia delante: el puño va a un costado (la guardia 3D lo lleva a
       0,35 del eje) y en el SWF no hay costado, lo que cuenta es cuanto
       avanza. Medido al puño de verdad, con el alcance recortado para
       parar en el blanco, ese costado lo dejaba fuera. */
    const ax = A.x, az = A.z || 0, cx = Math.cos(A.rumbo), cz = Math.sin(A.rumbo);
    const lleg = Math.max(0, (pt.x - ax) * cx + (pt.z - az) * cz);
    const vx = cx * lleg, vz = cz * lleg;
    const l2 = vx * vx + vz * vz || 1e-6;
    const u = U.clamp(((o.x - ax) * vx + ((o.z || 0) - az) * vz) / l2, 0, 1);
    return Math.hypot(o.x - ax - vx * u, (o.z || 0) - az - vz * u) < o.r + 2 * RADIO_PUNO;
  };

  Actor.centro = function (A) { return A.y + A.alto * 0.55; };
  Actor.cruz = function (A) { return A.y + Chars.ALTO_CRUZ * A.cuerpo.escala; };

  /* Envuelve un actor como objetivo para el sistema de disparo */
  Actor.comoObjetivo = function (A) {
    return {
      get x() { return A.x; },
      get y() { return Actor.centro(A); },
      get z() { return A.z; },
      get r() { return A.r; },
      get alto() { return A.alto * 0.86; },
      get vivo() { return A.vivo; },
      actor: A,
      golpear: (d, ex, ey, hx, hy, quien, info, ez) =>
        Actor.golpear(A, d, ex, ey, hx, hy, quien, info, ez)
    };
  };

  Actor.destruir = function (A, escena) {
    escena.remove(A.grupo);
    if (A.rag && global.Ragdolls) { Ragdolls.quitar(A.rag); A.rag = null; }
    if (A.mallaArma && A.mallaArma.parent) A.mallaArma.parent.remove(A.mallaArma);
  };

  global.Actor = Actor;
})(window);

