/* =============================================================
   anim.js -> Como se mueve un muñeco de Madness.

   =============================================================
   EL FALLO QUE LO ESTROPEABA TODO
   =============================================================

   El personaje NO mira a la camara y NO mira de perfil: su grupo
   esta girado 55 grados (VISTA). Eso significa que su "adelante"
   propio -el eje +Z del modelo- apunta en diagonal, a 35 grados
   del eje por el que se pelea.

   La primera version movia los pies y los puños por el eje del
   MODELO. Asi que un pie que "avanzaba" 22 cm por su propio
   frente solo avanzaba 13 cm sobre el suelo del juego, y ademas
   se iba 18 cm hacia la camara. El cuerpo viajaba mas deprisa que
   los pies y salia el clasico paso de luna: parece que retrocede
   mientras anda hacia adelante.

   Lo mismo con los golpes: el puño salia por el frente del modelo,
   asi que en pantalla iba en diagonal hacia el fondo en vez de ir
   a la cara del enemigo.

   Ahora todo se escribe en el eje de la PELEA:

     alcance -> metros por el eje X del mundo, hacia donde mira
     alto    -> metros de altura
     sep     -> separacion lateral en el propio modelo; es lo que
                mantiene una mano a cada lado del cuerpo

   y aHueso() lo convierte al espacio del hueso deshaciendo el
   giro de vista. Es la unica forma de que lo que se escribe aqui
   sea lo que se ve alli.

   =============================================================
   EL PIE SE QUEDA CLAVADO EN EL SUELO
   =============================================================

   Un ciclo de paso bien hecho tiene dos mitades. En la de APOYO
   el pie NO se mueve respecto al suelo: es el cuerpo el que pasa
   por encima, asi que el pie retrocede respecto al cuerpo a
   exactamente la velocidad a la que este avanza. En la de VUELO
   el pie despega, describe un arco y vuelve adelante.

   Eso obliga a que la amplitud del paso sea EXACTAMENTE un cuarto
   de la zancada: en media zancada el cuerpo recorre Z/2, y el pie
   tiene que recorrer esa misma distancia hacia atras, de +Z/4 a
   -Z/4. Con cualquier otro numero el pie patina, y patinar es lo
   que hace que una caminata parezca de juguete barato.

   Los cuatro instantes del ciclo son los de toda la vida:
   contacto (pie delante, apoyado), apoyo bajo (el cuerpo pasa por
   encima), despegue y vuelo.
   ============================================================= */
(function (global) {
  'use strict';

  const H = Chars.H;
  const Anim = {};

  /* Las cuatro poses de mano que trae chars.js. Cada mano existe
     cuatro veces en la malla y aqui se elige cual se ve. */
  const REPOSO = 0, PUNO = 1, PALMA = 2, AGARRE = 3, CANON = 4, REVES = 5;
  Anim.POSES = { REPOSO: REPOSO, PUNO: PUNO, PALMA: PALMA, AGARRE: AGARRE };

  /* Cuanto se gira el cuerpo hacia la camara. Tiene que ser el
     mismo numero que usa actor.js, y por eso vive aqui: es lo que
     necesita la conversion de ejes. */
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
  Anim.VISTA = VISTA;

  /* EL GIRO NO SIEMPRE ES VISTA, Y ESO ROMPIA LA SALIDA DE FRENTE.

     Estos dos valian Math.cos(VISTA) y Math.sin(VISTA) y eran
     constantes. Toda la conversion de ejes de aqui abajo da por
     hecho que el grupo del personaje esta girado exactamente
     mirando*VISTA, y mientras el muñeco pelea eso es cierto.

     Pero al salir por una puerta NO lo es: actor.js lo gira
     mirando*VISTA*(1-s)^2, o sea casi cero mientras cruza el vano.
     Con las constantes puestas, el animador seguia colocando manos
     y pies como si el cuerpo estuviera ladeado 55 grados sobre un
     cuerpo que estaba de frente, y de ahi salian las manos fuera
     de sitio y en un plano que no era el que se ve. Eran dos
     sistemas de coordenadas distintos peleandose.

     Ahora se recalculan cada fotograma con el giro de verdad. La
     formula no cambia -la de aHueso sigue siendo exacta, con f en
     vez de VISTA-, solo deja de estar congelada:

       f = giro real del grupo
       cosV = cos f          senV = mirando * sin f

     Con f = mirando*VISTA sale cos(VISTA) y sin(VISTA), que es lo
     que habia: los valores viejos son el caso particular. */
  let COS_V = Math.cos(VISTA);
  let SEN_V = Math.sin(VISTA);
  /* Y LOS PIES, APARTE.

     Mientras el cuerpo miraba siempre a donde andaba, un solo par de
     ejes bastaba. Con rumbo libre ya no: se puede apuntar a un
     enemigo y desplazarse de lado -es lo que hace cualquiera con un
     arma en la mano-, y ahi el tronco mira a un sitio y los pies
     pisan hacia otro. Con un par unico, las piernas daban el paso
     por el eje del tronco mientras el cuerpo se iba de costado, o
     sea el paso de luna de siempre pero al reves.

     Asi que hay dos pares: este es el del PASO y solo lo usan los
     pies. Cuando se anda hacia donde se mira -el caso normal- los
     dos pares son identicos y no cambia nada. */
  let COS_P = Math.cos(VISTA);
  let SEN_P = Math.sin(VISTA);

  /* -------------------------------------------------------------
     DEL EJE DE LA PELEA AL ESPACIO DEL HUESO

     El grupo del personaje esta girado un angulo f = mirando*VISTA
     sobre Y. El eje de la pelea es la X del mundo, que dentro del
     modelo queda en la direccion (cos V, 0, sen V) multiplicada
     por mirando. Asi que:

       hueso = alcance * (mirando*cosV, 0, senV)
             + sep     * (1, 0, 0)

     El seno NO lleva el mirando: al girar el grupo al otro lado, el
     signo se aplica dos veces y se cancela. Ponerselo -que es lo
     que parece logico- deja los golpes correctos mirando a la
     derecha y de 27 cm mirando a la izquierda. Medido.

     LA SEPARACION LATERAL SI LO LLEVA, y aqui estaba el fallo que
     dejaba las manos mal puestas al mirar a la izquierda. Estaba sin
     el, con el argumento de que el giro de vista ya le da sola la
     profundidad. Le da una, pero LA CONTRARIA al darse la vuelta.

     Un personaje que se gira tiene que verse REFLEJADO: el mismo
     dibujo con la X del mundo cambiada de signo y la profundidad
     igual. O sea, llamando f = mirando*VISTA al giro del grupo:

       X(-) = -X(+)      y      Z(-) = Z(+)

     Poniendo x = mirando*(alcance*cosV + sep) y z = alcance*senV y
     girando por f, sale:

       X = mirando*(alcance + sep*cosV)      -> cambia de signo
       Z = -sep*senV                         -> NO cambia

     que es exactamente el reflejo. Sin el mirando en sep, en cambio,
     Z salia +sep*senV al otro lado: la mano que estaba DETRAS del
     cuerpo se pasaba DELANTE al girarse. Medido con el bate: las dos
     manos saltaban de z -0,18 a z +0,33, medio metro hacia la
     camara, y por eso se veian enormes, despegadas del mango y con
     el bate cruzandolas por encima.

     (Todo lo de arriba es de cuando el muñeco era un DIBUJO que se
     reflejaba. Ya no lo es.)

     EL MUÑECO SE GIRA, NO SE REFLEJA.

     Con el reflejo, la mano de delante seguia delante al darse la
     vuelta, y eso en 3D es cambiar de mano: la pistola pasaba de la
     derecha a la izquierda cada vez que el personaje se giraba. Un
     tio no se cambia el arma de mano para que se le vea mejor.

     Desde el rumbo libre el grupo gira de verdad -giro = pi/2 -
     rumbo- y el eje de la pelea en el hueso es (mirando*cosV, 0,
     senV), que en juego vale (0, 0, 1) mire a donde mire. Asi que
     la separacion lateral va TAL CUAL en la X del hueso, sin lado:
     cada mano se queda en su costado del cuerpo y, al girarse, pasa
     de delante a detras de el como pasa de verdad. El giro de todo
     lo demas ya era de cuerpo rigido (ponGiroMano, medido): solo la
     posicion se reflejaba.

       hueso = alcance * (mirando*cosV, 0, senV) + sep * (1, 0, 0)
     ------------------------------------------------------------- */
  function aHueso(alcance, sep, mirando, salida) {
    salida.x = mirando * alcance * COS_V + sep;
    salida.z = alcance * SEN_V;
    return salida;
  }
  Anim.aHueso = aHueso;
  /* La misma cuenta con los ejes del paso. */
  function aHuesoPaso(alcance, sep, mirando, salida) {
    salida.x = mirando * alcance * COS_P + sep;
    salida.z = alcance * SEN_P;
    return salida;
  }
  const _t1 = { x: 0, z: 0 }, _t2 = { x: 0, z: 0 };

  /* -------------------------------------------------------------
     GIRAR SOBRE EJES DEL MUNDO

     Mismo problema que con las posiciones, y aqui se notaba aun
     mas: una bota que cabecea sobre su propia X no levanta la
     punta, la levanta de costado, porque su X apunta 35 grados
     fuera del eje por el que anda.

     Componer eulerianas a ojo no vale -a 0,3 radianes ya bizquea-,
     asi que el giro se arma con cuaterniones sobre los ejes del
     MUNDO expresados en el espacio del hueso:

       eje de la pelea (X del mundo) -> (mirando*cosV, 0, senV)
       eje a camara    (Z del mundo) -> (-mirando*senV, 0, cosV)
       vertical        (Y del mundo) -> (0, 1, 0), la misma en ambos

     'adelante' inclina la pieza hacia donde camina -la coronilla
     va delante, la punta de la bota baja-; 'ladeo' la escora sobre
     el eje de la marcha; 'giroY' la orienta en planta.
     ------------------------------------------------------------- */
  const EJE_Y = new THREE.Vector3(0, 1, 0);
  const _ejeF = new THREE.Vector3();
  const _ejeC = new THREE.Vector3();
  const _ejeMano = new THREE.Vector3();
  const _q0 = new THREE.Quaternion();
  const _q1 = new THREE.Quaternion();
  const _q2 = new THREE.Quaternion();

  /* -------------------------------------------------------------
     Y ADEMAS, HACIA DONDE ANDA

     Corregir el giro no bastaba. 'alcance' -lo que se adelanta un
     pie o una mano- se mide sobre el EJE DE LA PELEA, que es la X
     del mundo, y el personaje que sale de una puerta no anda por
     la X: anda hacia la camara. Con el giro ya bien, el muñeco
     salia de frente pero moviendo las piernas de lado: caminaba
     como un cangrejo mientras avanzaba hacia ti.

     Asi que la conversion lleva un segundo angulo, alfa, que es
     hacia donde anda medido desde el eje de la pelea:

       alfa = 0      anda por la X       (peleando)
       alfa = pi/2   anda hacia camara   (saliendo del vano)

     y el vector de avance en el mundo pasa a ser

       (mirando*cos alfa, 0, sen alfa)

     que, girado por f, da

       COS_V = cos a * cos f - mirando * sen a * sen f
       SEN_V = mirando * cos a * sen f + sen a * cos f

     Con alfa = 0 sale cos f y mirando*sen f, que es lo de antes, y
     con f = mirando*VISTA sale cos(VISTA) y sen(VISTA), que es lo
     de siempre: los dos casos viejos son casos particulares de
     este y no se movio ni un pie de la pose de pelea.

     Y alfa NO se pasa desde fuera: se deduce del propio giro. El
     cuerpo va de frente (f=0) a su angulo de pelea (f=mirando*
     VISTA), asi que g = f/(mirando*VISTA) va de 0 a 1 y

       alfa = (pi/2) * (1 - g)

     El cuerpo y las piernas giran con la MISMA curva, tomada del
     giro que ya esta amortiguado, asi que es imposible que se
     desincronicen: no hay dos temporizadores que cuadrar.
     ------------------------------------------------------------- */
  function ejesDe(mirando, giro, alfa, alfaPaso) {
    const f = giro === undefined ? mirando * VISTA : giro;
    /* alfa puede venir DADO -es el caso normal desde que la arena
       es una habitacion: el actor sabe hacia donde anda de verdad
       y lo pasa- o deducirse del giro, que es lo que hace falta
       cuando el muñeco cruza el vano de una puerta y ahi el giro
       es lo unico que describe el movimiento. */
    let al;
    if (alfa !== undefined) al = alfa;
    else {
      const g = U.clamp(f / (mirando * VISTA), 0, 1);
      al = MEDIO_PI * (1 - g);
    }
    const ca = Math.cos(al), sa = Math.sin(al);
    const cf = Math.cos(f), sf = Math.sin(f);
    COS_V = ca * cf - mirando * sa * sf;
    SEN_V = mirando * ca * sf + sa * cf;
    _ejeF.set(mirando * COS_V, 0, SEN_V);
    _ejeC.set(-mirando * SEN_V, 0, COS_V);
    /* Y el par del paso, con la misma formula y el angulo de la
       marcha de verdad. Si no viene, es el mismo. */
    if (alfaPaso === undefined || alfaPaso === al) {
      COS_P = COS_V; SEN_P = SEN_V;
    } else {
      const cp = Math.cos(alfaPaso), sp = Math.sin(alfaPaso);
      COS_P = cp * cf - mirando * sp * sf;
      SEN_P = mirando * cp * sf + sp * cf;
    }
  }

  const _qcab = new THREE.Quaternion();
  function ponGiro(obj, adelante, ladeo, giroY, mirando) {
    _q0.setFromAxisAngle(_ejeC, -mirando * adelante);
    _q1.setFromAxisAngle(_ejeF, ladeo);
    _q2.setFromAxisAngle(EJE_Y, giroY);
    obj.quaternion.copy(_q0).multiply(_q1).multiply(_q2);
  }

  /* Cuanto se adelanta la mano respecto al pecho en reposo. Sale
     de la hoja: las manoplas no estan pegadas al peto. */
  const Z_MANO = 0.120;
  Anim.Z_MANO = Z_MANO;

  /* -------------------------------------------------------------
     LA GUARDIA
     En la hoja de referencia las manos cuelgan a la altura de las
     botas, pero esa es la pose de una FICHA DE PERSONAJE. En
     cuanto empieza el tiroteo los puños suben al pecho: si se deja
     la pose de la hoja, el muñeco anda por la arena con los brazos
     muertos.
     ------------------------------------------------------------- */
  const GUARDIA = { alcance: 0.21, alto: 0.46, sep: 0.350 };
  Anim.GUARDIA = GUARDIA;

  /* -------------------------------------------------------------
     EL GIRO DE LA GUARDIA

     Esto es lo que hacia que los puños "siempre miraran al suelo".
     El esculpido tiene los nudillos en su -Y, o sea colgando, que
     es la pose de la HOJA DE PERSONAJE: un tio de pie con los
     brazos muertos. Y la guardia pedia giro cero, asi que esa pose
     de ficha se quedaba puesta andando, corriendo y esperando.

     Un golpe dura tres decimas. El resto del tiempo -que es el
     noventa y cinco por ciento- el muñeco andaba por la arena con
     las manos colgando como un maniqui de escaparate. Daba igual lo
     bien que estuviera el puñetazo.

     Ahora la guardia lleva su propio giro: los puños suben de
     canto, con los nudillos hacia adelante y abajo, que es como se
     lleva la guardia cuando se espera un golpe. Y sube mas al
     andar, porque andar hacia el enemigo es ir a pegarle.
     ------------------------------------------------------------- */
  const GIRO_GUARDIA = -0.78;
  /* La guardia con arma (block): el arma a 19,2 grados hacia delante de la
     vertical, que es como va en la mano en melee_front (MadnessGunDump
     5271) con la mano sin girar, que es como la lleva el sprite 5357. */
  const GUARDIA_ARMA = 19.2 * Math.PI / 180;
  Anim.GUARDIA_ARMA = GUARDIA_ARMA;
  const SEP_DOS_MANOS = 0.225;
  const _pmD = [0, 0, 0];
  const GIRO_ANDANDO = -0.20;

  /* Hasta donde llega un brazo estirado, medido sobre el eje de la
     pelea. 'puños' tiene alcance 1.05 en la ficha del arma: el
     puño tiene que llegar ahi, ni un centimetro menos, o el golpe
     conecta con el aire por delante de la mano. */
  const BRAZO = 0.96;

  /* =============================================================
     LA MARCHA DEL SWF

     La caminata y la carrera salen de madness_character (marcha_swf.js,
     que genera herramientas/swf/marcha.py): el 'run' (28 cuadros) y el
     'dash' (14). En el SWF el dash son los MISMOS pies que el run, un
     cuadro de cada dos; lo que cambia es el torso: 19-20 grados echado
     hacia delante, 25 cm adelantado y 3-4 cm mas bajo. Asi que aqui hay
     un solo ciclo de pies y dos de torso, mezclados segun la velocidad:
     nunca se salta de una animacion a otra.

     LA CADENCIA YA NO VA PEGADA A LA DISTANCIA. Iba: una zancada fija
     de 0,96 m daba 13,5 pasos por segundo corriendo a 6,4 m/s y 22 con
     DEX 30 (10,7 m/s), medido con herramientas/banco/marcha.js. Eso es
     un aleteo, no una carrera. El original tampoco lo hace: su ciclo va
     a 30 fps vaya a la velocidad que vaya, y el pie patina. Aqui la
     cadencia crece con la velocidad pero cada vez menos, como en una
     persona, que primero alarga el paso y despues lo acelera:

       andar   3,5 m/s   1,40 ciclos/s   2,8 pasos/s
       correr  6,4 m/s   2,14 ciclos/s   4,3 pasos/s  (el dash a 30 fps)
       DEX 30 10,7 m/s   2,69 ciclos/s   5,4 pasos/s

     Y con DEX la carrera no se ve como una pelicula pasada rapido: se
     echa mas hacia delante, baja un poco y levanta y alarga el paso.
     ============================================================= */
  const V_ANDA = 3.5, V_CORRE = 6.4, V_TOPE = 6.4 * (1 + 30 / 45);   // actor.js: tope * modSpeed
  const C_ANDA = 1.40, C_CORRE = 2.14;                              // ciclos por segundo
  const EXP_ANDA = Math.log(C_CORRE / C_ANDA) / Math.log(V_CORRE / V_ANDA);   // 0,70
  function cadencia(v) {
    if (v <= V_CORRE) return C_ANDA * Math.pow(v / V_ANDA, EXP_ANDA);
    return C_CORRE * Math.pow(v / V_CORRE, 0.45);
  }
  Anim.cadencia = cadencia;
  /* Una fila de una tabla del SWF en la fase f (0..1), interpolada. */
  function enCiclo(tabla, f, sal) {
    const n = tabla.length, x = f * n, i = Math.floor(x) % n, j = (i + 1) % n, u = x - Math.floor(x);
    const a = tabla[i], b = tabla[j];
    for (let k = 0; k < a.length; k++) sal[k] = a[k] + (b[k] - a[k]) * u;
    return sal;
  }
  const _tr = [0, 0, 0], _td = [0, 0, 0], _pp = [0, 0], _mr = [0, 0], _md = [0, 0];
  const Q_VUELO = 16 / 28;        // en MARCHA_SWF.pie la bota vuela de la fase 0 a la 16/28

  /* LA BOTA NO SE METE EN EL TORSO.

     El bajo del torso esta a 16 cm del suelo y la bota mide 15,5: en
     reposo ya se tocan. En el SWF da igual -las botas se pintan DETRAS
     del cuerpo-, pero en 3D un pie que sube 5 cm debajo del torso
     entra en el: medido con el paso de antes, hasta 8 cm dentro de la
     caja interior del ragdoll, que ya va 2,8 cm por dentro de la malla.
     Es el "pie que atraviesa el torso".

     Asi que despues de colocar cada bota se mira cuanto entra en esa
     caja (sus nueve puntos de arriba, en el marco del torso) y se baja
     lo que haga falta. Si ya esta en el suelo y aun entra, sube el
     torso. Las medidas son las de ragdoll.js. */
  const CAJA_T = { hx: 0.26, y0: -0.07, y1: 0.80, hz: 0.235, z: 0.004 };
  const BOTA = [0, -0.0935, 0.022, 0.09, 0.0775, 0.1575];     // centro y medio lado
  const _mT = new THREE.Matrix4(), _mB = new THREE.Matrix4(), _vB = new THREE.Vector3(), _uno = new THREE.Vector3(1, 1, 1);
  function dentroTorso(cu, pie) {
    _mT.compose(cu.position, cu.quaternion, _uno).invert();
    _mB.compose(pie.position, pie.quaternion, _uno).premultiply(_mT);   // la bota, en el marco del torso
    let hondo = 0;
    for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) {
      _vB.set(BOTA[0] + i * BOTA[3], BOTA[1] + BOTA[4], BOTA[2] + k * BOTA[5]).applyMatrix4(_mB);
      if (Math.abs(_vB.x) < CAJA_T.hx && Math.abs(_vB.z - CAJA_T.z) < CAJA_T.hz && _vB.y < CAJA_T.y1)
        hondo = Math.max(hondo, _vB.y - CAJA_T.y0);
    }
    return hondo;
  }

  /* El pie que vuela se recoge hacia dentro este tanto: su canto de
     fuera sobresale 4 cm del torso y, subido, perforaba el costado. */
  const RECOGE_PIE = 0.20;
  const SEP_PIE = 0.188;          // el mismo sitio donde se esculpio la bota

  const suave = (t) => t * t * t * (t * (t * 6 - 15) + 10);   // smootherstep

  /* =============================================================
     ESTADO
     ============================================================= */
  Anim.crear = function (cuerpo) {
    /* La pose de reposo hay que GUARDARLA antes de tocar nada: la
       posicion de un hueso es su desplazamiento respecto al padre,
       no una coordenada del mundo. */
    const reposo = cuerpo.huesos.map((h) => h.position.clone());
    // de las cuatro poses de cada mano solo se ve la de reposo
    for (let q = 1; q < Chars.POSES; q++) {
      cuerpo.huesos[Chars.MANOS_I[q]].scale.setScalar(0);
      cuerpo.huesos[Chars.MANOS_D[q]].scale.setScalar(0);
    }
    return {
      c: cuerpo, reposo: reposo,
      fase: 0, vel: 0, aire: 0,
      accion: null, t: 0,
      semilla: U.rng() * 100,
      // las manos, en el eje de la pelea
      mIa: GUARDIA.alcance, mIy: GUARDIA.alto, mIs: -GUARDIA.sep,
      mDa: GUARDIA.alcance, mDy: GUARDIA.alto, mDs: GUARDIA.sep,
      gI: 0, gD: 0,             // giro de cada puño
      giroCab: 0, incCab: 0, giroTiro: 0,
      poseI: REPOSO, poseD: REPOSO,
      retro: 0, dolor: 0,
      rodar: 0, rodarDur: 0.34, rodarDir: 1, anguloRodada: 0,
      /* La postura de esquiva de la TAC. Ver Anim.esquivaTac. */
      evade: 0, evadeDur: 0.30, evadeDir: 1,
      poseI: 0, poseD: 0,
      patA: 0, patY: 0
    };
  };

  /* =============================================================
     ACCIONES

     Cada via es una lista de [t, alcance, alto, sep, giroCuerpo]
     EN EL EJE DE LA PELEA. Las duraciones son cortas a proposito:
     un golpe entero dura menos que un parpadeo, y esa es la
     diferencia entre pegar y empujar.

     Y todas tienen la misma forma: anticipacion corta hacia
     ATRAS, impacto instantaneo con el brazo estirado del todo, dos
     fotogramas RETENIDO ahi, y una recuperacion QUE SE PASA de la
     guardia y vuelve.

     La retencion es lo que hace que el golpe se sienta; sin ella el
     puño rebota y parece que no ha tocado nada. Y pasarse de la
     guardia al volver es el acompañamiento: un brazo tiene masa y
     no frena en seco justo en su sitio. Volver clavado a la pose de
     guardia era lo que hacia que la cadena de tres pareciera un
     metronomo.

     La sexta columna -el giro del puño- arranca y acaba en
     GIRO_GUARDIA, no en cero: acabando en cero, al terminar el
     golpe el puño pegaba un tiron para volver a colgar.

     Fijarse en la columna 'sep': en la anticipacion la mano se
     abre HACIA AFUERA y en el impacto se cierra sobre el eje del
     cuerpo. Un puño que sale y vuelve por el mismo carril lateral
     parece un piston; uno que describe ese arco parece un brazo.
     ============================================================= */
  const ACCIONES = {
    /* Cruzado con la mano de delante. El cuerpo gira DETRAS de la
       mano, no a la vez: primero sale el puño y el tronco lo sigue.
       Asi el golpe tira en vez de acompañar. */
    golpeA: {
      dur: 0.32, impacto: 0.12, mano: 'D',
      via: [
        [0.00,  0.21, 0.460, 0.350,  0.00, -0.78],
        [0.07, -0.20, 0.560, 0.420, -0.26, -0.10],
        [0.12,  0.96, 0.660, 0.075,  0.38, -1.52],
        [0.19,  0.92, 0.650, 0.085,  0.34, -1.44],
        [0.26,  0.10, 0.425, 0.370, -0.07, -0.96],
        [0.32,  0.21, 0.460, 0.350,  0.00, -0.78]
      ]
    },
    /* Directo con la de atras: mas recto, mas corto y mas rapido. */
    golpeB: {
      dur: 0.28, impacto: 0.10, mano: 'I',
      via: [
        [0.00,  0.21, 0.460, -0.350,  0.00, -0.78],
        [0.06, -0.10, 0.545, -0.400,  0.20, -0.15],
        [0.10,  0.90, 0.670, -0.070, -0.30, -1.56],
        [0.16,  0.86, 0.660, -0.080, -0.26, -1.48],
        [0.23,  0.09, 0.425, -0.375,  0.06, -0.98],
        [0.28,  0.21, 0.460, -0.350,  0.00, -0.78]
      ]
    },
    /* Remate a dos manos: suben por encima de la cabeza y bajan de
       golpe. Es el tercero de la cadena y el que manda al suelo.

       Aqui el giro del puño es lo que lo cambia todo: arriba el
       puño esta armado hacia atras y en el impacto baja con los
       NUDILLOS MIRANDO AL SUELO. Sin ese giro, las dos manos bajan
       de canto y el remate parece que planta una maceta. */
    golpeC: {
      dur: 0.44, impacto: 0.18, mano: 'ambas',
      via: [
        [0.00,  0.21, 0.460, 0.350, 0.00, -0.78],
        [0.11, -0.16, 1.060, 0.300, 0.00, -2.55],
        [0.18,  0.78, 0.150, 0.180, 0.00, -0.55],
        [0.27,  0.75, 0.175, 0.190, 0.00, -0.50],
        [0.36,  0.16, 0.390, 0.365, 0.00, -1.05],
        [0.44,  0.21, 0.460, 0.350, 0.00, -0.78]
      ]
    },
    /* Manotazo: la mano ABIERTA cruza de fuera adentro. Llega antes
       que el puño, hace menos daño y sirve para desarmar. En la
       serie es el gesto de quitarle la pistola a alguien: por eso
       la 'sep' termina PASADA del centro, cruzando el cuerpo. */
    manotazo: {
      dur: 0.28, impacto: 0.09, mano: 'D', abierta: true,
      via: [
        [0.00, 0.21, 0.480, 0.350,  0.00, -0.78],
        [0.06, 0.04, 0.660, 0.480,  0.30, -0.22],
        [0.09, 0.84, 0.690, -0.170, -0.34, -1.45],
        [0.15, 0.80, 0.680, -0.150, -0.30, -1.38],
        [0.22, 0.12, 0.450, 0.330, -0.06, -0.94],
        [0.28, 0.21, 0.480, 0.350,  0.00, -0.78]
      ]
    },
    /* Agarron: las dos manos abiertas salen de frente, con las
       palmas por delante para coger de la pechera. */
    agarron: {
      dur: 0.34, impacto: 0.11, mano: 'ambas', abierta: true,
      via: [
        [0.00, 0.21, 0.460, 0.320, 0.00, -0.78],
        [0.07, 0.00, 0.600, 0.380, 0.00, -0.30],
        [0.11, 0.92, 0.740, 0.150, 0.00, -1.42],
        [0.21, 0.90, 0.725, 0.155, 0.00, -1.36],
        [0.28, 0.14, 0.430, 0.340, 0.00, -0.95],
        [0.34, 0.21, 0.460, 0.320, 0.00, -0.78]
      ]
    },
    /* Patada: el pie de delante sale disparado por el eje de la
       pelea. 'sep' no se usa: el pie no se sale de su carril, y el
       giro de puño tampoco -las manos siguen en guardia-. */
    patada: {
      dur: 0.36, impacto: 0.13, pie: true,
      via: [
        [0.00,  0.00, 0.000, 0, 0.00, 0],
        [0.08, -0.18, 0.070, 0, -0.14, 0],
        [0.13,  0.66, 0.330, 0,  0.20, 0],
        [0.21,  0.62, 0.315, 0,  0.18, 0],
        [0.36,  0.00, 0.000, 0,  0.00, 0]
      ]
    }
  };

  /* =============================================================
     LOS GOLPES CON ARMA

     Hasta ahora, con un bate en la mano el muñeco tiraba puñetazos:
     se lanzaban golpeA/B/C pasara lo que pasara, asi que el arma
     acompañaba a la mano como un adorno y el golpe no se leia como
     un golpe de arma.

     Un arma pesa y tiene punta, y eso son dos cosas en la via:

       ANTICIPACION LARGA. Un puño sale de la guardia; un bate tiene
       que IRSE ATRAS primero. Por eso el alcance se va a negativo y
       el 'sep' se abre hacia afuera antes de entrar.

       LA MUÑECA ES EL GOLPE. En un puñetazo el giro de muñeca solo
       orienta los nudillos. Aqui es lo que barre: el arma cuelga del
       hueso de la mano, asi que girar la muñeca de +1,0 a -1,9 es lo
       que hace que el bate describa el arco. Sin ese barrido, mover
       la mano hacia adelante solo TRASLADA el bate.

       Y el cuerpo gira DETRAS de la mano, como en los puñetazos:
       primero sale el arma y el tronco la sigue.

     La columna es la misma de siempre:
       [t, alcance, alto, sep, giro del cuerpo, giro de la muñeca]
     ============================================================= */
  const ACCIONES_ARMA = {
    /* ---------------------------------------------------------
       BATE, swing horizontal ascendente. ESTA VIA NO ESTA PUESTA A
       OJO: sale de seguir cuadro a cuadro el bate de un video de
       referencia de Madness Combat a 24 fps.

       Como se saco: el bate no tiene relleno propio -su interior es
       el gris del fondo-, asi que no hay color que segmentar. Lo que
       lo delata son sus dos aristas negras largas y paralelas,
       separadas por el grosor del bate; el abrigo tambien da aristas
       largas, pero sus dos lados estan a 200 px uno de otro. Con eso
       y una prueba del color de dentro -el bate va hueco, la corbata
       va sobre el negro del traje- sale el eje del bate en cada
       cuadro, y de ahi su angulo y la posicion del puño MEDIDA
       CONTRA EL TRONCO, que es lo unico portable: en el video el
       agente da un paso entero mientras pega y aqui el cuerpo se
       mueve por su cuenta.

       Lo medido, con el tope del armado como origen de tiempos:

         t(s)   angulo   alcance   alto
         0.000   127      -0.47    +0.66
         0.042   148      -0.22    +0.36
         0.083   191      -0.06    +0.24
         0.167   199      +0.16    +0.23
         0.208   326      +1.00     0.00
         0.250   349      +1.14    +0.39
         0.292   377      +1.21    +0.77   <- impacto
         0.333   377      +1.23    +0.78   <- RETENIDO

       (angulo 0 = el arma apunta al enemigo; +90 = apunta arriba)

       Y salen tres cosas que la version anterior no tenia:

       1. EL BATE SE QUEDA ATRAS mientras el cuerpo ya va adelante.
          Entre 0,042 y 0,167 el puño avanza de -0,22 a +0,16 y el
          bate sigue girando HACIA ATRAS, de 148 a 199 grados. Ese
          retraso es lo que carga el golpe.
       2. EL LATIGAZO ES UN SOLO FOTOGRAMA: 127 grados entre 0,167 y
          0,208. Casi la mitad del arco entero en 42 milisegundos.
          Antes el pico de velocidad caia en la anticipacion, medido:
          t=0,12 con el impacto en 0,20.
       3. EL PUÑO DESCRIBE UNA U. Empieza arriba y atras, BAJA hasta
          lo mas bajo del arco a mitad de swing, y sube al frente.
          Con el puño en linea recta el bate no barre nada.

       Y el arco va en la direccion correcta. La version anterior lo
       tenia INVERTIDO -medido: el armado dejaba el bate apuntando al
       frente, a -10 grados, y el impacto lo dejaba apuntando hacia
       atras y arriba, a 122-, que es exactamente lo que se veia como
       un empujon con el mango por delante.

       La sexta columna se escribe con la calibracion del rig, que
       tambien esta medida y sale una recta limpia:

         angulo en pantalla = 44,8 grados - giro de muñeca

       La via se cierra en -2pi, no en 0: el bate del video NO desanda
       el swing, sigue girando hasta volver a la guardia por el otro
       lado. Una vuelta entera.
       --------------------------------------------------------- */
    bateA: {
      dur: 0.48, impacto: 0.260, arma: true,
      via: [
        [0.000,  0.28, 0.640,  0.290,  0.00,  0.000],
        [0.060, -0.34, 0.766,  0.430, -0.34, -1.435],
        [0.088, -0.15, 0.631,  0.400, -0.30, -1.801],
        [0.118, -0.03, 0.578,  0.330, -0.16, -2.552],
        [0.174,  0.14, 0.573,  0.240,  0.06, -2.691],
        [0.202,  0.78, 0.470,  0.060,  0.34, -4.908],
        [0.232,  0.89, 0.645,  0.020,  0.44, -5.309],
        [0.260,  0.94, 0.815, -0.030,  0.46, -5.798],
        [0.292,  0.96, 0.820, -0.040,  0.44, -5.798],
        [0.480,  0.28, 0.640,  0.290,  0.00, -6.283]
      ]
    },
    /* BATE, machaque en diagonal. La misma gramatica del video -se
       queda arriba cargando, cae de golpe, y retiene el contacto un
       fotograma- pero el arco cruza por DELANTE, no por abajo.

       Aqui la via SI vuelve a cero: un machaque vertical no se enrolla
       alrededor del cuerpo, se levanta otra vez por donde bajo. La
       vuelta se hace lenta a proposito -125 grados en 0,27 s contra
       los 163 en 0,15 de la bajada- para que se lea como recoger el
       bate y no como un segundo golpe. */
    bateB: {
      dur: 0.54, impacto: 0.240, arma: true,
      via: [
        [0.000,  0.28, 0.640, 0.290,  0.00,  0.000],
        [0.070, -0.18, 1.010, 0.330, -0.26, -1.278],
        [0.110, -0.02, 1.045, 0.300, -0.20, -0.960],
        [0.170,  0.30, 0.960, 0.240,  0.10, -0.140],
        [0.205,  0.72, 0.680, 0.150,  0.34,  1.100],
        [0.240,  0.86, 0.500, 0.120,  0.42,  1.568],
        [0.270,  0.88, 0.470, 0.120,  0.40,  1.700],
        [0.540,  0.28, 0.640, 0.290,  0.00,  0.000]
      ]
    },
    /* CUCHILLO, estocada.

       El fallo era de punteria, no de recorrido: medido, en el
       instante de la estocada la hoja apuntaba 76 grados HACIA
       ARRIBA. Una puñalada que entra de canto y mirando al cielo.

       Ahora la muñeca se coloca para que el filo vaya EN LA
       DIRECCION DEL GOLPE: 35 grados al recoger junto a las
       costillas y 0 grados -recto al enemigo- en la estocada. Y como la hoja se endereza mientras el brazo se
       estira, el giro SUMA al avance en vez de restarle, que es lo
       que hacia que la punta recorriese menos que la empuñadura
       (ratio medido: 0,88). */
    cuchilloA: {
      dur: 0.30, impacto: 0.110, arma: true,
      via: [
        [0.000,  0.30, 0.660, 0.300,  0.00,  0.000],
        [0.045, -0.22, 0.700, 0.370, -0.24, -0.150],
        [0.110,  0.98, 0.675, 0.120,  0.36,  0.782],
        [0.160,  0.94, 0.672, 0.130,  0.32,  0.790],
        [0.240,  0.34, 0.655, 0.305,  0.04,  0.120],
        [0.300,  0.30, 0.660, 0.300,  0.00,  0.000]
      ]
    },
    /* CUCHILLO, tajo en diagonal. Corto y por delante: una hoja de
       medio metro no se enrolla al cuerpo. Armado arriba-atras a 150
       grados y sale a -15 cruzando el pecho. */
    cuchilloB: {
      dur: 0.38, impacto: 0.140, arma: true,
      via: [
        [0.000,  0.30, 0.660, 0.300,  0.00,  0.000],
        [0.055, -0.10, 0.930, 0.400, -0.28, -1.836],
        [0.095,  0.24, 0.840, 0.280, -0.06, -1.100],
        [0.140,  0.86, 0.560, 0.070,  0.38,  1.044],
        [0.180,  0.82, 0.500, 0.020,  0.34,  1.480],
        [0.280,  0.34, 0.650, 0.300,  0.04,  0.150],
        [0.380,  0.30, 0.660, 0.300,  0.00,  0.000]
      ]
    },
    /* MEGACHETTE, tajo de arriba abajo.

       Es un cuchillon de 1,23 m: pesa. Asi que se le alarga la parte
       en la que se SOSTIENE ARRIBA -entre 0,09 y 0,145 el arma casi
       no gira, solo carga- y la caida es mas larga que la del bate.
       El resto es la misma curva del video: retraso, latigazo y un
       fotograma de retencion en el contacto. */
    megachetteA: {
      dur: 0.62, impacto: 0.300, arma: true,
      via: [
        [0.000,  0.30, 0.700, 0.300,  0.00,  0.000],
        [0.090, -0.22, 1.040, 0.360, -0.32, -1.400],
        [0.145, -0.06, 1.070, 0.330, -0.26, -1.100],
        [0.215,  0.32, 0.980, 0.250,  0.12, -0.180],
        [0.262,  0.78, 0.700, 0.150,  0.38,  1.130],
        [0.300,  0.94, 0.510, 0.090,  0.46,  1.740],
        [0.335,  0.96, 0.480, 0.080,  0.44,  1.920],
        [0.620,  0.30, 0.700, 0.300,  0.00,  0.000]
      ]
    },
    /* MEGACHETTE, reves horizontal a la altura del cuello: el que
       decapita. Es el swing del bate, alargado y con la hoja llegando
       casi plana al cuello (14 grados). Tambien se cierra dando la
       vuelta entera. */
    megachetteB: {
      dur: 0.64, impacto: 0.320, arma: true,
      via: [
        [0.000,  0.30, 0.700,  0.300,  0.00,  0.000],
        [0.080, -0.36, 0.860,  0.460, -0.38, -1.480],
        [0.115, -0.18, 0.700,  0.430, -0.32, -1.900],
        [0.155, -0.04, 0.630,  0.350, -0.14, -2.600],
        [0.225,  0.16, 0.625,  0.250,  0.10, -2.740],
        [0.262,  0.82, 0.560,  0.060,  0.36, -4.950],
        [0.295,  0.94, 0.720,  0.000,  0.46, -5.360],
        [0.320,  0.99, 0.790, -0.060,  0.48, -5.760],
        [0.355,  1.00, 0.795, -0.070,  0.46, -5.760],
        [0.640,  0.30, 0.700,  0.300,  0.00, -6.283]
      ]
    }
  };
  for (const k in ACCIONES_ARMA) ACCIONES[k] = ACCIONES_ARMA[k];

  /* =============================================================
     LOS GOLPES DEL SWF (golpes_swf.js, tools/swf_melee)

     Cada golpe de madness_character, cuadro a cuadro a 30 fps y
     respecto a la guardia: el puño del arma, el giro del arma, la
     inclinacion del cuerpo y la mano libre. Se suman a la guardia de
     CADA arma (su agarre), asi que valen para todas, como en el SWF.

     Varios golpes por accion (better2 pega dos veces, finish2 tres) y
     algunos con la mano libre ('unarmed': el puñetazo de better4).
     Y el final se acelera: el SWF sube myGameSpeed en los ultimos 7
     cuadros si no se mantiene el boton.
     ============================================================= */
  const FPS_SWF = 30;
  if (global.GOLPES_SWF) {
    for (const n in global.GOLPES_SWF) {
      const g = global.GOLPES_SWF[n];
      // los cuadros sin mano (ninguno hoy) toman el anterior
      for (let i = 1; i < g.filas.length; i++) if (!g.filas[i]) g.filas[i] = g.filas[i - 1];
      const imp = g.golpes.map((x, k) => ({ t: (x[0] - 1) / FPS_SWF, tipo: x[1], alto: x[2],
                                              ultimo: k === g.golpes.length - 1 }));
      ACCIONES['swf_' + n] = {
        swf: g, arma: true, dur: g.cuadros / FPS_SWF,
        sinArma: n.startsWith('unarmed_'),
        // el alcance mayor de las dos manos: con el se escala el golpe (Golpes.tope)
        alcMax: n.startsWith('unarmed_') ? Math.max(...g.filas.map((f) => Math.max(f[0], f[4]))) : 0,
        patada: g.golpes.some((x) => x[1] === 'pie'),
        cola: Math.max(0, g.cuadros - 7) / FPS_SWF,
        impactos: imp, impacto: imp.length ? imp[0].t : 0,
        sonidos: g.sonidos.map((x) => ({ t: (x[0] - 1) / FPS_SWF, nombre: x[1] })),
        via: [[0, 0, 0, 0, 0, 0]]
      };
    }
  }
  /* La fila del SWF en el instante t, entre dos cuadros. */
  function filaSWF(g, t) {
    const f = t * FPS_SWF, i = Math.min(g.filas.length - 1, Math.floor(f));
    const a = g.filas[i], b = g.filas[Math.min(g.filas.length - 1, i + 1)], k = f - i;
    const r = new Array(a.length);
    for (let j = 0; j < a.length; j++) r[j] = a[j] + (b[j] - a[j]) * k;
    return r;
  }

  Anim.ACCIONES = ACCIONES;

  /* Interpola dentro de una via.

     'lineal' es el instante hasta el que NO se suaviza nada. Los
     golpes de arma lo llevan puesto en su fotograma de impacto, y es
     deliberado: sus claves salen del tracking de un video a 24 fps,
     o sea que la CURVA DE VELOCIDAD ya esta dentro de las claves.
     Suavizar cada tramo por encima la aplasta -cada tramo arrancaria
     rapido y frenaria, incluido el de la espera-, y lo que se pierde
     justo es el latigazo, que en el video son 127 grados en un solo
     fotograma. Despues del impacto se vuelve a suavizar: la
     recuperacion no esta medida, es del animador. */
  function enVia(via, t, lineal) {
    if (t <= via[0][0]) return via[0];
    for (let i = 1; i < via.length; i++) {
      if (t <= via[i][0]) {
        const a = via[i - 1], b = via[i];
        const k = (t - a[0]) / (b[0] - a[0] || 1);
        /* Salida rapida y frenada: es lo que da el latigazo. Con una
           recta, el golpe parece un empujon. */
        const e = (lineal && b[0] <= lineal + 1e-4) ? k
                                                   : 1 - Math.pow(1 - k, 2.4);
        return [t, U.lerp(a[1], b[1], e), U.lerp(a[2], b[2], e),
                U.lerp(a[3], b[3], e), U.lerp(a[4], b[4], e),
                U.lerp(a[5], b[5], e)];
      }
    }
    return via[via.length - 1];
  }

  Anim.lanzar = function (A, nombre) {
    if (!ACCIONES[nombre] || A.rodar > 0 || A.esq) return false;
    A.accion = nombre; A.t = 0;
    return true;
  };
  Anim.ocupado = function (A) { return A.accion !== null || A.rodar > 0 || !!A.esq; };
  /* El golpe que acaba de caer, o false. Los del SWF se van apuntando en
     A.golpesPend al avanzar la accion (pueden ser varios); los demas,
     por su instante de impacto. */
  Anim.tocaImpacto = function (A, dt) {
    if (A.golpesPend && A.golpesPend.length) return A.golpesPend.shift();
    if (!A.accion) return false;
    const a = ACCIONES[A.accion];
    if (a.swf) return false;
    return (A.t >= a.impacto && A.t - dt < a.impacto) ? { tipo: 'full', ultimo: true } : false;
  };

  /* -------------------------------------------------------------
     LA VOLTERETA DE ESQUIVA

     No es una pose: es el cuerpo ENTERO dando una vuelta completa.
     Y la vuelta hay que darla sobre el eje Z del MUNDO -el que
     apunta a la camara-, no sobre ningun eje del muñeco, porque
     el muñeco esta girado 55 grados y rodar sobre su eje propio
     sale como una peonza en diagonal.

     Por eso aqui solo se calcula el angulo y se guarda; quien lo
     aplica es actor.js, que es el que maneja el grupo y puede
     componerlo con el giro de vista mediante cuaterniones.
     ------------------------------------------------------------- */
  Anim.rodada = function (A, dir, dur, ex, ez) {
    A.rodar = 1;
    A.rodarDur = dur || 0.34;
    A.rodarDir = dir >= 0 ? 1 : -1;
    /* Por donde rueda, en el suelo. Lo usa actor.js para sacar el
       eje de giro; si no viene, se rueda por la X como siempre. */
    A.rodarX = ex === undefined ? (dir >= 0 ? 1 : -1) : ex;
    A.rodarZ = ez === undefined ? 0 : ez;
    A.accion = null;
  };
  Anim.rodando = function (A) { return A.rodar > 0; };

  /* -------------------------------------------------------------
     LA ESQUIVA DEL SWF (esquivas_swf.js, tools/swf_melee/esquivas.py)

     No es una voltereta: en MPN2 el que no tiene destreza SE TIRA AL
     SUELO -dodge_clumsy-, de cara si va hacia donde mira y de espaldas
     si va al reves, se queda tumbado y se levanta empujandose. Con
     destreza 15 rueda (dodge_max) y con 25 da un mortal (dodge_flip).

     Del SWF sale, cuadro a cuadro, TAL CUAL: el giro del torso, su
     centro, y el centro y el giro de la cabeza, cada bota y cada mano
     (el registro de cada dibujo mas el centro de su caja). Todo a la
     escala K de los golpes, que es a la que estan las piezas de este
     muñeco (ver tools/swf_melee/esquivas.py). El torso lo gira el grupo
     entero (actor.js, como la voltereta) y el resto se coloca en su
     marco. */
  const CENTRO_TORSO = 0.638;      // el centro del torso sobre el suelo: -0,098 a 0,85 sobre la pelvis (0,262)
  const CENTRO_CAB = new THREE.Vector3(0, 0.385, 0.056), _cc = new THREE.Vector3();
  const CENTRO_BOTA = new THREE.Vector3(0, -0.0935, 0.022);
  const EJE_X_M = new THREE.Vector3(1, 0, 0);     // el eje lateral del muñeco
  /* EL ENGANCHE de cada pieza a este muñeco: donde esta en reposo aqui
     menos donde esta en reposo en el SWF (ESQUIVAS_SWF.REF). Es constante:
     lo que el SWF mueve se mueve igual, cuadro a cuadro. Aqui, respecto al
     centro del torso (0,638 sobre el suelo): cabeza (0,152, 0,679) -el
     ovalo en (0, 1,055, 0,152) sobre la pelvis-, botas (0,022, -0,5445)
     -hueso a 0,187 del suelo y centro de la bota 0,0935 por debajo-. */
  const ENG = (() => {
    const R0 = global.ESQUIVAS_SWF && global.ESQUIVAS_SWF.REF;
    if (!R0) return { torso: 0, cab: [0, 0], pieD: [0, 0], pieA: [0, 0] };
    return { torso: CENTRO_TORSO - R0.torso,
             cab: [0.152 - R0.cab[0], 0.679 - R0.cab[1]],
             pieD: [0.022 - R0.pieD[0], -0.5445 - R0.pieD[1]],
             pieA: [0.022 - R0.pieA[0], -0.5445 - R0.pieA[1]] };
  })();
  Anim.CENTRO_TORSO = CENTRO_TORSO;
  Anim.esquivaSWF = function (A, nombre, fx, fz) {
    const g = global.ESQUIVAS_SWF && global.ESQUIVAS_SWF[nombre];
    if (!g) return false;
    A.esq = g; A.esqT = 0; A.esqArma = false; A.esqSostener = false;
    /* se tira al suelo y se queda tumbado: solo la esquiva torpe. El
       derribo (knockback_1/2) NO: vuela -el centro del torso sube a 1,31 m
       en los cuadros 10 a 16-, cae de cabeza con los pies en alto (-125
       grados en _1, 148 en _2) y queda tendido a 0,29 m, que ya apoya en
       el suelo con los numeros del SWF. Con el tope a 90 grados y el apoyo
       de la esquiva torpe se quedaba pegado al piso desde el principio. */
    g.tumba = nombre.startsWith('clumsy');
    A.accion = null; A.rodar = 0;
    // de cara o de espaldas: siempre sobre el eje hacia el que MIRA
    A.rodarX = fx; A.rodarZ = fz;
    return true;
  };
  Anim.esquivando = function (A) { return !!A.esq; };

  /* -------------------------------------------------------------
     LA POSTURA DE ESQUIVA DE LA TAC  (myStatus = 'tactics')

     En el original, en cuanto la TAC se come un impacto el
     personaje pasa a 'tactics', y ese estado no esta agrupado con
     los aturdimientos sino con andar: sigue apuntando, sigue
     disparando, pero se DESPLAZA. Es una finta, no un encogimiento.

     Aqui se traduce a lo que se puede leer en tres cuartos de
     perfil: el cuerpo se echa de lado en la direccion de la finta,
     se agacha un palmo, y la cabeza se va al lado CONTRARIO -o
     sea, se queda mirando a quien dispara-. Esa oposicion entre
     tronco y cabeza es lo que hace que se lea como esquivar y no
     como perder el equilibrio.

     Va aparte de 'dolor': encajar y esquivar son cosas distintas y
     mezclarlas da un muñeco que tiembla. Y va aparte de la
     voltereta, que es una accion completa que bloquea todo lo
     demas; esta no bloquea nada.
     ------------------------------------------------------------- */
  /* LA ESQUIVA 'tactics' DEL SWF, CUADRO A CUADRO.

     La version de antes era inventada: el cuerpo se echaba de lado 0,42
     rad y actor.js le daba un empujon lateral de 2,6 m/s. En el SWF no
     hay empujon ninguno: 'tactics' es un estado de ANDAR (el personaje
     se sigue moviendo con su aceleracion de siempre) que reproduce el
     sprite 5359 de madness_character: 21 cuadros a 30 fps, un AGACHE.
     El cuerpo baja y se inclina hacia delante, la cabeza se hunde entre
     los hombros por debajo de la bala y la mano de delante sube a
     cubrirse. Extraido con tools/swf_melee (leer.py), K = 0,214/13,06
     m/px, respecto al cuadro 0:
       [cuerpo y (m, + arriba), inclinacion (rad, + delante),
        cabeza y respecto al cuerpo (m), mano libre alcance, mano libre y] */
  const TACTICS = [[0, 0, 0, 0, 0], [-0.007, 0.023, -0.018, 0.026, 0.045], [-0.012, 0.044, -0.036, 0.053, 0.094],
    [-0.024, 0.089, -0.065, 0.066, 0.157], [-0.033, 0.141, -0.092, 0.078, 0.221], [-0.045, 0.172, -0.117, 0.097, 0.274],
    [-0.057, 0.206, -0.141, 0.115, 0.328], [-0.064, 0.204, -0.16, 0.12, 0.35], [-0.07, 0.206, -0.178, 0.127, 0.373],
    [-0.075, 0.204, -0.186, 0.138, 0.392], [-0.078, 0.206, -0.195, 0.147, 0.414], [-0.057, 0.204, -0.187, 0.158, 0.417],
    [-0.037, 0.206, -0.178, 0.168, 0.422], [-0.027, 0.147, -0.126, 0.142, 0.399], [-0.016, 0.092, -0.071, 0.115, 0.377],
    [-0.007, 0.046, -0.055, 0.066, 0.311], [0.004, 0.005, -0.037, 0.016, 0.246], [0.008, -0.004, -0.033, -0.008, 0.187],
    [0.012, -0.018, -0.029, -0.033, 0.127], [0.012, -0.018, -0.029, -0.033, 0.127], [0.012, -0.018, -0.029, -0.033, 0.127]];
  Anim.TACTICS_DUR = TACTICS.length / 30;
  const _tac = [0, 0, 0, 0, 0];
  function filaTactics(A) {
    if (!(A.evade > 0)) { for (let k = 0; k < 5; k++) _tac[k] = 0; return _tac; }
    const f = (1 - A.evade) * (TACTICS.length - 1), i = Math.min(TACTICS.length - 2, Math.floor(f)), k = f - i;
    for (let j = 0; j < 5; j++) _tac[j] = TACTICS[i][j] + (TACTICS[i + 1][j] - TACTICS[i][j]) * k;
    return _tac;
  }
  Anim.esquivaTac = function (A, dir, dur) {
    if (A.evade > 0.5) return;            // ya esta agachado: no se reinicia a cada bala
    A.evade = 1;
    A.evadeDur = dur || Anim.TACTICS_DUR;
    A.evadeDir = dir >= 0 ? 1 : -1;
  };

  /* =============================================================
     ACTUALIZAR
     ============================================================= */
  Anim.actualizar = function (A, dt, est) {
    const hs = A.c.huesos, R = A.reposo;
    const mirando = est.mirando || 1;
    const vel = est.vel || 0;
    ejesDe(mirando, est.giro, est.marcha, est.paso);
    /* LO QUE SE MOVIO DE VERDAD. La bota apoyada tiene que retroceder
       exactamente lo que avanza el muñeco, y eso lo dice su posicion, no la
       velocidad pedida: contra una pared, en bullet time o saliendo por una
       puerta no coinciden. A.dist suma lo recorrido (en metros del modelo) y
       la velocidad que anima sale de ahi. */
    let recorrido = -1;
    if (est.x !== undefined) {
      if (A.px !== undefined) recorrido = Math.min(0.5, Math.hypot(est.x - A.px, est.z - A.pz));
      A.px = est.x; A.pz = est.z;
    }
    if (recorrido >= 0) A.dist = (A.dist || 0) + recorrido / (A.c.escala || 1);
    A.vel = U.damp(A.vel, recorrido >= 0 && dt > 0 ? recorrido / dt : vel, 16, dt);
    A.aire = U.damp(A.aire, est.aire ? 1 : 0, 18, dt);
    A.retro = Math.max(0, A.retro - dt * 7);
    /* La animacion del arma del SWF -Fire R o Reload R- que este en
       marcha: el arma sube, retrocede y vuelve cuadro a cuadro. */
    Disparo.avanzar(A, dt);
    const curvaArma = est.agarre ? Disparo.curva(A) : null;
    A.dolor = Math.max(0, A.dolor - dt * 5);
    if (A.evade > 0) A.evade = Math.max(0, A.evade - dt / A.evadeDur);
    /* Campana: entra rapido, aguanta y sale. Una rampa lineal se ve
       como un deslizamiento; la campana se ve como un impulso. */
    const tac = filaTactics(A);

    /* ---------------- La esquiva del SWF ----------------
       Manda sobre todo lo demas mientras dura (ver Anim.esquivaSWF).
       Cada pieza va al CENTRO que le da el SWF en ese cuadro y con su
       giro: nada se interpola por nuestra cuenta ni se dibuja a mano. */
    if (A.esq) {
      A.esqT += dt;
      /* EN BUCLE mientras se sostenga (block: del cuadro 'loop' al ultimo,
         el GoToLabel del sprite) */
      if (A.esq.bucle && A.esqSostener && A.esqT * FPS_SWF >= A.esq.cuadros) {
        A.esqT -= (A.esq.cuadros - (A.esq.bucle - 1)) / FPS_SWF;
      }
      if (A.esqT * FPS_SWF >= A.esq.cuadros) { A.esq = null; A.centroEsq = null; A.anguloRodada = 0; }
      else {
        const f = filaSWF(A.esq, A.esqT);
        /* TUMBADO, EL TORSO NO PASA DE LA HORIZONTAL. En el dodge_clumsy el
           SWF lo deja 19 grados mas alla (en 2D la cadera se apoya en las
           piernas dobladas). Este muñeco no tiene piernas: un torso rigido
           pasado de la horizontal se queda de punta sobre un canto, con el
           otro extremo en el aire, flotando. Se tope a 90 grados y queda
           tumbado sobre el suelo. Solo en clumsy: max y flip dan vueltas. */
        /* + el retroceso de la guardia (blockReset: recoilTimer = 14 y el
           personaje entero gira recoilTimer / 2 grados hacia atras,
           22139..22290): A.retroGuardia en grados */
        const th = (A.esq.tumba ? U.clamp(f[0], -MEDIO_PI, MEDIO_PI) : f[0]) - (A.retroGuardia || 0) * Math.PI / 360;
        const cth = Math.cos(th), sth = Math.sin(th);
        // del marco del torso (avance, alto) al plano del mundo, respecto al centro
        const mundoY = (x, y) => -x * sth + y * cth;
        const cab = [f[3] + ENG.cab[0], f[4] + ENG.cab[1]];
        const pD = [f[6] + ENG.pieD[0], f[7] + ENG.pieD[1]], pA = [f[9] + ENG.pieA[0], f[10] + ENG.pieA[1]];
        const yc0 = f[2] + ENG.torso;
        /* EL SUELO. El SWF es 2,5D: lo que esta mas abajo en pantalla esta
           mas cerca, y tumbado se dibuja por debajo de la linea de las
           botas. En 3D eso es meterse en el piso. El TORSO manda: si su
           canto mas bajo (medio alto 0,474, medio fondo 0,243: ragdoll.js)
           queda bajo el suelo, se sube el muñeco entero lo justo, y si
           queda por encima se baja hasta apoyarlo cuando el SWF lo tiene
           tumbado (asi no flota). La cabeza, los puños y las botas se
           suben ELLOS SOLOS si tocan el suelo -se dobla el cuello, se
           apoya la mano-: no levantan el cuerpo. */
        const bajoT = yc0 - (0.474 * Math.abs(cth) + 0.243 * Math.abs(sth));
        /* apoyarlo va entrando segun se tumba y se suelta segun se levanta,
           a lo largo de todo el giro (de 30 a 72 grados): en un tramo corto
           se soltaba en un cuadro al levantarse y el cuerpo pegaba un salto
           de 17 cm */
        const apoya = bajoT < 0 ? 1 : (A.esq.tumba ? U.clamp((Math.abs(sth) - 0.5) / 0.45, 0, 1) : 0);
        const yc = yc0 - bajoT * apoya;
        const alSuelo = (p, radio) => {
          const pen = radio - (yc + mundoY(p[0], p[1]));
          // se sube en vertical del mundo, que en el marco del torso es (-sen, cos)
          if (pen > 0) { p[0] -= sth * pen; p[1] += cth * pen; }
        };
        const fc = th + f[5], fD = th + f[8], fA = th + f[11];
        alSuelo(cab, Math.hypot(0.392 * Math.cos(fc), 0.333 * Math.sin(fc)));
        alSuelo(pD, 0.1575 * Math.abs(Math.sin(fD)) + 0.0775 * Math.abs(Math.cos(fD)));
        alSuelo(pA, 0.1575 * Math.abs(Math.sin(fA)) + 0.0775 * Math.abs(Math.cos(fA)));
        A.anguloRodada = -th;
        A.centroEsq = { hc: CENTRO_TORSO, a: f[1], y: yc };
        const cu0 = hs[H.CUERPO], rc0 = R[H.CUERPO];
        cu0.position.set(rc0.x, rc0.y, rc0.z);
        cu0.quaternion.identity();
        const sobrePelvis = CENTRO_TORSO - rc0.y;         // 0,376: del hueso del torso a su centro
        /* La cabeza: el registro de myHead (5316) es el centro de su dibujo
           (caja de -19,4 a 19,3 por -23,4 a 23,3 px) y gira sobre el. El
           hueso nuestro esta en la base del ovalo, 0,385 por debajo y 0,056
           por detras del centro: se gira y se coloca el hueso de modo que
           el CENTRO caiga donde dice el SWF. */
        const ca0 = hs[H.CABEZA];
        /* El giro va sobre el eje LATERAL del muñeco (su X), no sobre el
           del mundo que mira a camara (ponGiro): mirando al fondo o a camara
           ese eje es el del cuerpo, y la cabeza se torcia de lado. */
        ca0.quaternion.setFromAxisAngle(EJE_X_M, f[5]);
        /* Y LA MIRADA SIGUE EN EL BLANCO. El dibujo del SWF solo trae el
           cabeceo; el giro hacia donde apunta (miraCab, +-0,72 rad de
           cuello) se seguia amortiguando fuera de aqui, asi que durante
           el pickup o el swap la cara se iba con el cuerpo -hasta 100
           grados, medido con un blanco fijado- y al acabar volvia de un
           latigazo. Se aplica igual que en la pose normal (ponGiro: la
           guiñada la ultima, en el marco de la cabeza). */
        A.giroCab = U.damp(A.giroCab || 0, est.miraCab || 0, 9, dt);
        _qcab.setFromAxisAngle(EJE_Y, A.giroCab);
        ca0.quaternion.multiply(_qcab);
        _cc.copy(CENTRO_CAB).applyQuaternion(ca0.quaternion);
        aHueso(cab[0], 0, mirando, _t1);
        ca0.position.set(_t1.x - _cc.x, sobrePelvis + cab[1] - _cc.y, _t1.z - _cc.z);
        /* Las botas: su centro y su giro, igual (el hueso esta 0,0935 por
           encima y 0,022 por detras del centro de la bota: chars.js).
           La de delante del SWF (myFoot2) es la derecha del hueso. */
        for (const [id, p, g, sep] of [[H.PIE_D, pD, f[8], SEP_PIE], [H.PIE_I, pA, f[11], -SEP_PIE]]) {
          hs[id].quaternion.setFromAxisAngle(EJE_X_M, g);         // lateral, como la cabeza
          _cc.copy(CENTRO_BOTA).applyQuaternion(hs[id].quaternion);
          /* Con los ejes del CUERPO, no los del paso: el paso sale de la
             velocidad, y en la esquiva de espaldas va hacia atras -medido
             corriendo con un blanco fijado: gira hasta 3 rad mientras dura-
             y las botas daban la vuelta alrededor del cuerpo. */
          aHueso(p[0], sep, mirando, _t1);
          hs[id].position.set(_t1.x - _cc.x, CENTRO_TORSO + p[1] - _cc.y, _t1.z - _cc.z);
        }
        /* LAS MANOS: las dos que se ven en el SWF, donde y como las pone.
           - La de delante (handShoot_front) es la I del muñeco, la del lado
             de la camara; la de detras (handNone_back), la D. Con arma, la
             del arma es la D y va donde este su mano en la guardia.
           - El giro, tal cual: el del SWF en pantalla (de -28 a 42 grados;
             el dibujo es siempre el mismo puño, 5274). Como cuelgan del
             torso, que va girado th, se les descuenta.
           - No se meten en el torso (ver abajo) y si tocan el suelo, se
             apoyan en el.
           - Con el dorso a la camara, como todas las manos del juego. */
        const lado = est.agarre && A.armaDelante ? -1 : 1;
        const conArma = !!A.esqArma || !!est.agarre;   // recoger/cambiar/lanzar: ver Actor.maniobra
        /* EL FINAL: el SWF acaba con las manos en SU reposo (sujetando un
           arma, altas) y aqui sigue la guardia. En los ultimos 10 cuadros
           -los que el SWF usa para volver a su reposo- cada mano va a su
           sitio de guardia en el marco del torso (alcance + Z_MANO, alto
           sobre el centro del torso): el mismo enganche al muñeco que la
           cabeza y las botas, sin salto al terminar. */
        const qf = A.esq.cuadros - A.esqT * FPS_SWF;
        const fin = qf < 10 && !A.esq.bucle ? (1 - qf / 10) * (1 - qf / 10) * (1 + 2 * qf / 10) : 0;
        const guardD = [GUARDIA.alcance + Z_MANO, GUARDIA.alto - sobrePelvis];
        const guardI = [GUARDIA.alcance - 0.05 + Z_MANO, GUARDIA.alto - 0.035 - sobrePelvis];
        // mirando a la izquierda, el otro par del SWF (columnas 20-27)
        const o = mirando < 0 && f.length > 20 ? 8 : 0;
        const delante = [f[12 + o], f[13 + o], f[15 + o]], detras = [f[16 + o], f[17 + o], f[19 + o]];
        for (const [ids, h, s0, esD] of [[Chars.MANOS_D, conArma ? delante : detras, GUARDIA.sep * lado, true],
                                        [Chars.MANOS_I, conArma ? detras : delante, -GUARDIA.sep * lado, false]]) {
          /* A la altura del torso (medio alto 0,474) la mano va a SU COSTADO,
             justo por fuera (medio ancho 0,279 mas el puño 0,10 = 0,38):
             el SWF no tiene fondo y la dibuja encima del cuerpo, pero en 3D
             eso es atravesarlo. Empujarla a la cara del torso la hacia
             saltar de la espalda a la panza en un cuadro. */
          const gd = esD ? guardD : guardI;
          const hy = U.lerp(h[1], gd[1], fin);
          const w = U.clamp((0.474 - Math.abs(hy)) / 0.12, 0, 1);
          const pm = [U.lerp(h[0], gd[0], fin), hy];
          alSuelo(pm, 0.10);
          let sep = Math.sign(s0) * U.lerp(Math.abs(s0), Math.max(Math.abs(s0), 0.38), w);
          /* LA GUARDIA (block, 5357): el SWF dibuja la mano del arma
             (handShoot_front) ENCIMA del cuerpo, a la altura del pecho y
             con el arma cruzada delante. Llevada al costado, en 3D la mano
             del arma -la D, la del lado lejos de la camara- y el arma
             entera quedaban tapadas por el torso. Va delante del pecho, al
             alcance de la guardia de siempre, sin apartarla de lado. */
          if (esD && conArma && A.esq.bucle) { pm[0] = Math.max(pm[0], GUARDIA.alcance + Z_MANO); sep = s0; _pmD[0] = pm[0]; _pmD[1] = pm[1]; _pmD[2] = sep; }
          /* Con arma de dos manos (el bate) la orienta la segunda mano: va
             0,225 m por debajo de la primera -la separacion entre manos
             medida en la hoja (ver bate.agarre)- sobre el eje del arma de la
             guardia del SWF, 19,2 grados hacia delante de la vertical
             (melee_front de MadnessGunDump), en el marco del torso (- th). */
          if (!esD && conArma && A.esq.bucle && (A.nManos || 0) >= 2) {
            const fi = GUARDIA_ARMA - th;
            pm[0] = _pmD[0] - SEP_DOS_MANOS * Math.sin(fi); pm[1] = _pmD[1] - SEP_DOS_MANOS * Math.cos(fi); sep = _pmD[2];
          }
          colocaMano(hs, R, ids, pm[0] - Z_MANO, sobrePelvis + pm[1], sep, mirando);
          const gm = (esD && conArma && A.esq.bucle && A.giroBloqueo !== undefined) ? A.giroBloqueo - th
                                                                                 : U.lerp(h[2] - th, GIRO_GUARDIA, fin);
          ponGiroMano(hs, ids, gm, 0, 0, mirando);
          if (esD) { A.mDa = pm[0] - Z_MANO; A.mDy = sobrePelvis + pm[1]; A.mDs = sep; }
          else { A.mIa = pm[0] - Z_MANO; A.mIy = sobrePelvis + pm[1]; A.mIs = sep; }
        }
        A.gI = 0; A.gD = 0;
        const nm = A.nManos || 0;
        const pDf = nm >= 1 ? -1 : reposoOReves(A, hs, Chars.MANOS_D, est.agarre && !est.agarre.poseReposo ? AGARRE : REPOSO, 1);
        const pIf = nm >= 2 ? -1 : reposoOReves(A, hs, Chars.MANOS_I, REPOSO, -1);
        ponPose(A, hs, pIf, pDf);
        encararManos(A, hs, pIf < 0 ? REPOSO : pIf, pDf < 0 ? REPOSO : pDf);
        return;
      }
    }
    A.centroEsq = null;

    /* ---------------- La voltereta ----------------
       Manda sobre todo lo demas mientras dura. */
    if (A.rodar > 0) {
      A.rodar = Math.max(0, A.rodar - dt / A.rodarDur);
      const p = 1 - A.rodar;
      /* Rodar en +X es girar en NEGATIVO sobre la Z del mundo: la
         coronilla tiene que irse hacia adelante, no hacia atras. */
      /* Rodar hacia +X es girar en NEGATIVO sobre el eje
         perpendicular: la coronilla tiene que irse hacia adelante.
         El sentido ya lo lleva el propio eje (-rodarZ, 0, rodarX),
         asi que aqui el angulo va siempre en el mismo sentido y no
         se multiplica por el lado: hacerlo daba media vuelta al
         reves cuando se rodaba hacia la izquierda. */
      A.anguloRodada = -p * U.TAU;
      /* El encogido: brazos y piernas recogidos contra el pecho en
         mitad del giro y desplegados al entrar y al salir. Un
         muñeco que rueda rigido parece un tronco. */
      const tuck = Math.sin(p * Math.PI);
      colocaMano(hs, R, Chars.MANOS_I, 0.04 + tuck * 0.12, 0.46 - tuck * 0.16, -0.30 + tuck * 0.10, mirando);
      colocaMano(hs, R, Chars.MANOS_D, 0.04 + tuck * 0.12, 0.46 - tuck * 0.16, 0.30 - tuck * 0.10, mirando);
      /* Los pies se recogen HACIA ADELANTE, no hacia arriba. Subidos
         -como estaban, a 34 cm- se metian dentro del peto y durante
         media voltereta no se veian: parecia que el muñeco rodaba
         sin piernas. Por delante quedan siempre fuera de la silueta
         del cuerpo. */
      colocaPie(hs, R, H.PIE_I, -0.10 + tuck * 0.40, tuck * 0.20, -SEP_PIE, mirando);
      colocaPie(hs, R, H.PIE_D, 0.12 + tuck * 0.22, tuck * 0.16, SEP_PIE, mirando);
      const giroBota = mirando * 0.75 * (MEDIO_PI - VISTA);
      ponGiro(hs[H.PIE_I], tuck * 0.95, 0, giroBota, mirando);
      ponGiro(hs[H.PIE_D], tuck * 0.95, 0, giroBota, mirando);
      ponGiroMano(hs, Chars.MANOS_I, -tuck * 0.55, 0, 0, mirando);
      ponGiroMano(hs, Chars.MANOS_D, -tuck * 0.55, 0, 0, mirando);
      A.gI = 0; A.gD = 0;
      const cu0 = hs[H.CUERPO], rc0 = R[H.CUERPO];
      cu0.position.set(rc0.x, rc0.y - tuck * 0.12, rc0.z);
      cu0.quaternion.identity();
      const ca0 = hs[H.CABEZA], rca0 = R[H.CABEZA];
      ca0.position.set(rca0.x, rca0.y - tuck * 0.13, rca0.z - tuck * 0.05);
      // la barbilla al pecho: es lo que hace que la voltereta se lea
      ponGiro(ca0, tuck * 0.62, 0, 0, mirando);
      ponPose(A, hs, (A.nManos || 0) >= 2 ? -1 : REPOSO, (A.nManos || 0) >= 1 ? -1 : REPOSO);
      return;
    }
    A.anguloRodada = 0;

    /* ---------------- La fase del paso ----------------
       Avanza con la CADENCIA, que sale de la velocidad (ver LA MARCHA DEL
       SWF, arriba), y al pararse vuelve al contacto por el camino corto.
       La fase la llevan los pies Y el torso: los dos ciclos del SWF van
       siempre juntos. */
    if (A.vel > 0.12 && A.aire < 0.5) {
      A.fase = (A.fase + cadencia(A.vel) * dt) % 1;
    } else {
      const d = U.angDiff(A.fase * U.TAU, 0) / U.TAU;
      A.fase = (A.fase + d * Math.min(1, dt * 8) + 1) % 1;
    }
    /* Cuanto se ve el ciclo: nada parado, entero desde 1,5 m/s. */
    const anda = U.clamp(A.vel / 1.5, 0, 1);
    /* Del run al dash del SWF segun la velocidad, y lo que DEX suma por
       encima de correr. Van amortiguados: apretar correr lleva de 3,5 a
       6,4 m/s en una decima, y el torso no se echa 20 grados de golpe. */
    A.galope = U.damp(A.galope || 0, suave(U.clamp((A.vel - V_ANDA) / (V_CORRE - V_ANDA), 0, 1)), 7, dt);
    A.extra = U.damp(A.extra || 0, U.clamp((A.vel - V_CORRE) / (V_TOPE - V_CORRE), 0, 1), 5, dt);
    /* CUANTO DEL CICLO APOYA CADA BOTA. Con la bota clavada, en el apoyo el
       cuerpo avanza v * apoyo / cadencia, y eso es lo que la bota recorre de
       delante a atras respecto a el. Se topa ese recorrido -0,46 m andando,
       0,60 esprintando, 0,66 con DEX- y el apoyo sale de ahi: 18% del ciclo
       andando (0,13 s en el suelo), 20% corriendo (0,09 s), 17% con DEX 30
       (0,06 s), que es lo que pisa alguien que corre. El resto vuela. */
    const recMax = 0.46 + 0.14 * A.galope + 0.06 * A.extra;
    const apoyoObj = A.vel > 0.05 ? U.clamp(recMax * cadencia(A.vel) / A.vel, 0.12, 0.40) : 0.40;
    A.st = U.damp(A.st || apoyoObj, apoyoObj, 6, dt);
    const st = A.st;
    /* El torso, el vaiven y las manos del SWF van en la fase de las
       pisadas: lo mas bajo del torso, a mitad del apoyo de cada bota. */
    const faseT = ((A.fase - st / 2 + 0.5) % 1 + 1) % 1;
    const t = est.tiempo || 0;

    /* ---------------- Accion en curso ---------------- */
    let mI = null, mD = null, giroAcc = 0;
    let gI = 0, gD = 0;
    /* QUE FORMA TIENE CADA MANO. En Madness un puño no es la mano de
       reposo girada: es otro dibujo. Aqui se elige cual de las cuatro
       se ve, y el cambio es instantaneo, como en la serie. */
    let pI = REPOSO, pD = REPOSO;
    /* Si una accion de arma manda sobre la muñeca, el bloque de
       agarre no la puede poner a cero: sin esto el bate se quedaba
       clavado en su angulo de guardia durante todo el swing y el
       golpe se veia como mover la mano de sitio. */
    let manoAcc = false;
    let manosSWF = false;       // las manos las pone un golpe del SWF
    A.patA = 0; A.patY = 0; A.patA2 = 0; A.patY2 = 0;
    A.cuerpoSWF = null;
    A.puñoSWF = false;
    A.inclAcc = 0;
    if (A.accion) {
      const a = ACCIONES[A.accion];
      const t0 = A.t;
      // el final del golpe del SWF va al doble (myGameSpeed)
      A.t += dt * (a.swf && A.t >= a.cola ? 2 : 1);
      if (a.swf) {
        for (const x of a.impactos) if (x.t >= t0 && x.t < A.t) (A.golpesPend || (A.golpesPend = [])).push(x);
        for (const x of a.sonidos) if (x.t >= t0 && x.t < A.t) (A.sonidosPend || (A.sonidosPend = [])).push(x.nombre);
      }
      if (A.t >= a.dur) { A.accion = null; A.t = 0; }
      else if (a.swf && a.sinArma) {
        /* GOLPE SIN ARMA DEL SWF (unarmed_*), TAL CUAL: las dos manos que
           se ven, los dos pies y el torso -su avance, su altura y su
           inclinacion-, cuadro a cuadro y respecto a la guardia sin arma.
           - LAS MANOS: el SWF enseña handShoot_front (delante del cuerpo)
             y handNone_back (detras) mirando a la derecha, y las otras dos
             mirando a la izquierda (MadnessCharacter, reparto de _visible).
             Aqui el muñeco se gira y no se refleja, asi que la de delante
             es siempre la I del hueso (lado de la camara) y la de detras la
             D: 'shoot' -> I, 'none' -> D. Las filas estan en el mundo y
             las manos cuelgan del torso, asi que se les quita lo que se
             mueve el torso.
           - EL TORSO gira sobre SU CENTRO, como el dibujo (myBody gira
             sobre su registro, el centro de su caja): el hueso esta en la
             pelvis, 0,376 por debajo, y se desplaza para compensar.
           - Lo que el perfil no tiene lo pone el 3D, con los numeros del
             directo de golpeA: el puño va hacia el eje de la pelea
             (separacion de 0,35 a 0,075 con el brazo estirado), los
             nudillos al frente (giro de -0,78 a -1,52) y el tronco gira
             0,25 rad por metro hacia el puño que sale. 'Estirado del
             todo' es 0,9 m sobre la guardia. */
        const f = filaSWF(a.swf, A.t);
        /* Mirando a la izquierda el SWF enseña las otras dos piezas de mano
           (handShoot_back y handNone_front), y hacen su propio recorrido:
           columnas 12 a 15. */
        if (mirando < 0 && f.length > 12) { f[0] = f[12]; f[1] = f[13]; f[4] = f[14]; f[5] = f[15]; f[16] = f[18]; f[17] = f[19]; }
        // el alcance escalado para que el puño pare en el blanco (golpes.js)
        const kA = A.escAlcance === undefined ? 1 : A.escAlcance;
        f[0] *= kA; f[4] *= kA;
        manosSWF = true;
        const incS = f[3];
        const cA = f[10] - 0.376 * Math.sin(incS), cY = f[11] + 0.376 * (1 - Math.cos(incS));
        A.cuerpoSWF = [cA, cY];
        const eI = U.clamp(f[0] / 0.9, 0, 1), eD = U.clamp(f[4] / 0.9, 0, 1);
        mI = [GUARDIA.alcance - 0.05 + f[0] - cA, GUARDIA.alto - 0.035 + f[1] - cY, -U.lerp(GUARDIA.sep, 0.075, eI)];
        mD = [GUARDIA.alcance + f[4] - cA, GUARDIA.alto + f[5] - cY, U.lerp(GUARDIA.sep, 0.075, eD)];
        /* EL PUÑO, TAL CUAL: el mismo dibujo de la guardia todo el golpe (el
           SWF no cambia de dibujo: 5274, 'hand_front') y su giro en pantalla
           sumado al de la guardia. Antes se le forzaba 'nudillos al frente'
           (de -0,78 a -1,52) y eso encendia el alineado de 90 grados con el
           eje de la pelea: el enderezado a camara le daba la vuelta al
           dibujo y el puño cambiaba de lado a mitad de golpe. */
        gI = GIRO_GUARDIA + (f[16] || 0);
        gD = GIRO_GUARDIA + (f[17] || 0);
        A.puñoSWF = true;
        giroAcc = U.clamp((f[4] - f[0]) * 0.25, -0.4, 0.4);
        A.inclAcc = incS;
        // los pies, tal cual (en el mundo; el de delante, myFoot2, es el D)
        A.patA = f[6]; A.patY = f[7]; A.patA2 = f[8]; A.patY2 = f[9];
      }
      else if (a.swf && est.agarre) {
        /* GOLPE DEL SWF: la guardia del arma mas lo que el SWF mueve el
           puño, el giro del arma tal cual, el cuerpo que se inclina y la
           mano libre. El giro del tronco no existe en un dibujo de
           perfil: aqui acompaña al alcance del puño, que es lo que hace
           que el golpe se lea en 3D. */
        const f = filaSWF(a.swf, A.t), G = est.agarre;
        manosSWF = true;
        mD = [G.alcance + f[0], G.alto + f[1], G.sep];
        gD = f[2] + (G.giroGuardia || 0);
        manoAcc = true;
        giroAcc = U.clamp(f[0] * 0.45, -0.35, 0.45);
        A.inclAcc = f[3];
        if (G.dos) {
          mI = [mD[0] + (G.alcance2 - G.alcance), mD[1] + (G.alto2 - G.alto), mD[2] + (G.sep2 - G.sep)];
          gI = gD;
        } else {
          /* La mano libre: su guardia (la del bloque de agarre) mas lo que
             la mueve el SWF. Adelantada es un puñetazo: puño y nudillos
             al frente. */
          mI = [GUARDIA.alcance * 0.8 + f[4], GUARDIA.alto - 0.06 + f[5], -GUARDIA.sep * 0.92];
          const pega = U.clamp(f[4] / 0.8, 0, 1);
          gI = pega * 1.57;
          if (pega > 0.3) pI = PUNO;
        }
      }
      else {
        const p = enVia(a.via, A.t, a.arma ? a.impacto : 0);
        giroAcc = p[4];
        if (a.pie) { A.patA = p[1]; A.patY = p[2]; }
        else if (a.mano === 'ambas') {
          /* A dos manos las dos van al mismo alcance pero cada una
             se queda en su lado: un par de puños juntos en el eje
             se lee como una sola mancha. */
          mI = [p[1], p[2], -p[3]];
          mD = [p[1], p[2], p[3]];
          gI = p[5]; gD = p[5];
          pI = pD = a.abierta ? PALMA : PUNO;
        } else if (a.arma) {
          /* GOLPE CON ARMA. La mano del arma sigue la via y NO cambia
             de pose: un bate se lleva agarrado todo el golpe, no se
             convierte en puño a mitad de swing.

             Y si el arma es de dos manos, la de atras acompaña con
             el MISMO desfase que tiene en guardia: asi el bate sigue
             en las dos manos durante todo el arco en vez de
             escaparse de la de atras al primer fotograma. */
          mD = [p[1], p[2], p[3]];
          gD = p[5];
          manoAcc = true;
          const G = est.agarre;
          if (G && G.dos) {
            mI = [p[1] + (G.alcance2 - G.alcance),
                  p[2] + (G.alto2 - G.alto),
                  p[3] + (G.sep2 - G.sep)];
            gI = p[5];
          }
        } else if (a.mano === 'D') {
          mD = [p[1], p[2], p[3]];
          gD = p[5];
          pD = a.abierta ? PALMA : PUNO;
        } else {
          mI = [p[1], p[2], p[3]];
          gI = p[5];
          pI = a.abierta ? PALMA : PUNO;
        }
      }
    }

    /* ---------------- EL CUERPO ----------------
       Va ANTES que los pies: para saber si una bota se mete en el torso
       hay que saber donde esta el torso.

       Es el torso del SWF, el del run y el del dash mezclados por
       'galope', en la misma fase que los pies. Su CENTRO va a donde dice
       el SWF -sube y baja dos veces por ciclo, una por pie- y se inclina
       sobre la pelvis, que es donde pivota el hueso; el pivote se corre
       lo que haga falta para que el centro quede en su sitio. */
    /* Cuanto queda de cruzar el vano, elevado al cuadrado: la
       misma curva con la que gira el cuerpo, asi que todo lo que
       depende de ella entra y sale a la vez. */
    const sal = est.saliendo || 0;
    const frente = sal * sal;
    const M = global.MARCHA_SWF;
    const g = A.galope, e = A.extra;
    enCiclo(M.run.torso, faseT, _tr);
    enCiclo(M.dash.torso, faseT, _td);
    /* EL DASH NO SE AGACHA AQUI. En el SWF baja el torso 3,6 cm de media,
       pero alli las botas se pintan detras del cuerpo. Aqui el bajo del
       torso esta a 16 cm del suelo y la bota mide 15,5: agachado, el
       torso se sentaba encima de las botas. Del dash se queda su rebote
       -lo que sube y baja respecto a su media-, no la media. */
    /* NI SE ADELANTA TANTO NI SE ECHA TANTO. En el SWF el torso del dash
       va 25 cm por delante de los pies y echado 20 grados; pintado encima
       de las botas eso se lee como un esprint, pero en 3D las botas se
       quedaban colgando detras, lejos del cuerpo. Aqui va a la mitad de
       adelantado y a dos tercios de echado (13 grados): las botas quedan
       debajo de la mitad de atras del torso. */
    if (M.dash.medio === undefined) M.dash.medio = M.dash.torso.reduce((a, f) => a + f[1], 0) / M.dash.torso.length;
    const tAv = (U.lerp(_tr[0], _td[0] * 0.5, g) + 0.02 * e) * anda;
    const tAl = U.lerp(_tr[1], _td[1] - M.dash.medio, g) * anda;
    const inclMarcha = (U.lerp(_tr[2], _td[2] * 0.65, g) + 0.05 * e) * anda;

    const cu = hs[H.CUERPO], rc = R[H.CUERPO];
    const resp = Math.sin(t * 1.9 + A.semilla) * 0.010 * (1 - anda);
    /* El peso va al pie que apoya: el vaiven lateral y el ladeo son
       maximos a mitad del apoyo de cada pie (el izquierdo apoya de la
       fase 0 a la 'st': su mitad es st/2). */
    const apoyo = Math.cos((A.fase - st / 2) * U.TAU) * anda;
    const vaiven = -apoyo * 0.020;
    cu.position.set(rc.x + vaiven, rc.y + resp - A.aire * 0.03 + tac[0], rc.z);
    const incl = inclMarcha + A.retro * 0.10 - A.dolor * 0.16 + A.inclAcc + tac[1];
    const brazoC = CENTRO_TORSO - rc.y;              // del pivote al centro del torso
    aHueso(tAv - brazoC * Math.sin(inclMarcha), 0, mirando, _t1);
    cu.position.x += _t1.x; cu.position.z += _t1.z;
    /* Andando, el torso va 1,2 cm mas alto: la bota ya roza su bajo en
       reposo, y sin ese hueco no podria levantarse ni dos centimetros. */
    cu.position.y += tAl + brazoC * (1 - Math.cos(inclMarcha)) + 0.012 * anda * (1 - g);
    /* El resto de la inclinacion -retroceso, dolor, golpes- sigue su
       regla de antes: el torso pivota a 0,26 del suelo y su bajo, a
       0,16, esta por DEBAJO del pivote, asi que al echarse hacia
       delante el borde de delante del bajo BAJA y se comia los pies.
       Se sube el cuerpo eso mismo. En un golpe sin arma del SWF el torso
       va donde dice el SWF y gira sobre su centro (ver la rama sin arma):
       se desplaza lo suyo y la compensacion vale solo para lo demas. */
    if (A.cuerpoSWF) {
      aHueso(A.cuerpoSWF[0], 0, mirando, _t1);
      cu.position.x += _t1.x; cu.position.z += _t1.z; cu.position.y += A.cuerpoSWF[1];
      const resto = incl - inclMarcha - A.inclAcc;
      if (resto > 0) cu.position.y += Math.sin(resto) * 0.24;
    } else {
      const resto = incl - inclMarcha;
      if (resto > 0) cu.position.y += Math.sin(resto) * 0.24;
    }
    const ladeo = -apoyo * 0.026;
    /* ANDANDO DE FRENTE, EL TORSO GIRA.

       De perfil una caminata se lee por las piernas y poco mas: el
       torso puede ir practicamente rigido y nadie lo nota. De
       frente no. De frente lo que dice "esta caminando" es la
       ROTACION DE HOMBROS -el hombro del lado del pie adelantado
       se va hacia atras-, el balanceo lateral del peso y el ladeo
       del tronco. Sin eso, el muñeco cruza el vano como una figura
       de ajedrez que se desliza.

       Los tres van con 'frente', asi que en la pose de pelea valen
       cero y no tocan nada de lo que ya estaba calibrado:

         hombros   0,16 rad (9 grados) alternos con el paso
         peso      3 cm mas de vaiven lateral
         ladeo     0,045 rad mas

       Nueve grados de hombro es lo que hace una persona andando
       sin prisa. Con mas, el muñeco parece que nada. */
    const balOsc = -apoyo * frente;
    cu.position.x += balOsc * 0.030;
    /* La inclinacion hacia adelante tambien va sobre la Z del
       mundo: el tronco se echa hacia DONDE CAMINA, no hacia su
       frente propio. El giro del tronco en un golpe es del CUERPO, no
       del mundo: va con el hombro de la mano que pega. */
    ponGiro(cu, incl,
            ladeo + giroAcc * 0.12 + balOsc * 0.045,
            giroAcc * 0.55 - balOsc * 0.16, mirando);

    /* ---------------- LOS PIES ----------------
       LA BOTA APOYADA QUEDA CLAVADA EN EL SUELO. Al pisar se anota donde
       -su avance- y cuanto llevaba recorrido el muñeco; mientras apoya, su
       avance es ese menos lo que el muñeco avanzo desde entonces, asi que
       sobre el suelo no se mueve ni un milimetro. Despues despega y vuela
       hasta la pisada siguiente, medio recorrido por delante, con el arco
       del SWF (MARCHA_SWF.pie: sube hasta 5,5 cm al principio del vuelo y
       baja estirandose). El pie izquierdo va en la fase y el derecho medio
       ciclo detras.
       Antes la bota apoyada retrocedia despacio todo el ciclo y sobre el
       suelo iba al 70-79% de la velocidad del cuerpo: patinaba. Con DEX se
       levanta un 30% mas.
       Esprintando, las botas van 3 cm atrasadas: el bajo del torso baja
       por delante al inclinarse y la punta de una bota de 31 cm se metia
       debajo. */
    const subida = anda * (1 + 0.30 * e);
    const atras = (0.03 * g + 0.02 * e) * anda;
    const rec = A.vel * st / Math.max(0.05, cadencia(A.vel));   // lo que avanza el cuerpo en un apoyo
    const xDespega = M.pie[0][0], xPisa = M.pie[16][0];        // el vuelo de la tabla, de punta a punta
    if (!A.pies) A.pies = [0, 1].map(() => ({ apoya: true, a: 0, d: A.dist || 0, a0: 0, ult: 0 }));
    let alza = 0;
    for (let s = 0; s < 2; s++) {
      const id = s ? H.PIE_D : H.PIE_I, P = A.pies[s];
      const p = (A.fase + (s ? 0.5 : 0)) % 1;
      let alcance, alto = 0, u = -1;
      if (p < st) {
        // APOYO: clavada (y si el muñeco acelera de golpe, no se va mas atras de 0,6 m)
        if (!P.apoya) { P.apoya = true; P.a = P.ult; P.d = A.dist || 0; }
        alcance = Math.max(-0.60, P.a - ((A.dist || 0) - P.d));
      } else {
        // VUELO: de donde despego a la pisada siguiente, con la curva del SWF
        if (P.apoya) { P.apoya = false; P.a0 = P.ult; }
        u = (p - st) / (1 - st);
        enCiclo(M.pie, u * Q_VUELO, _pp);
        alcance = P.a0 + (rec / 2 - atras - P.a0) * (_pp[0] - xDespega) / (xPisa - xDespega);
        alto = _pp[1] * subida;
      }
      P.ult = alcance;
      alcance *= anda;          // despacio, el paso se achica hasta el reposo
      const vuelo = U.clamp(alto / 0.055, 0, 1);
      /* La patada la da SIEMPRE el mismo pie, el derecho del hueso:
         el muñeco se gira, no se refleja, y nadie cambia de pierna
         buena segun hacia donde mire. */
      const delante = s === 1;
      if (A.patA && delante) {
        alcance += A.patA; alto += A.patY;
      }
      if (!delante && (A.patA2 || A.patY2)) {
        alcance += A.patA2; alto += A.patY2;
      }
      /* EN EL AIRE no vale dejar el ciclo congelado donde estaba: si
         el salto empieza en mitad de una zancada, los pies se quedan
         abiertos de par en par todo el vuelo. Se recogen a una pose
         propia: la de delante sube y se adelanta, la de atras se
         queda colgando. */
      if (A.aire > 0.01) {
        alcance = U.lerp(alcance, delante ? 0.11 : -0.06, A.aire);
        alto = U.lerp(alto, delante ? 0.30 : 0.13, A.aire);
      }
      /* EN EL AIRE LOS PIES SE JUNTAN, ademas de acortar el paso: con
         la separacion lateral al 55% los centros quedan en 0,27 m, las
         dos botas dentro de los 0,564 m del bajo del cuerpo. Recogido,
         no esparrancado. */
      const sepAire = 1 - A.aire * 0.45;
      /* TALON Y PUNTA. Debajo del torso la bota no puede subir mas de 2 o
         3 cm, asi que el paso se lee por como rueda el pie: al despegar
         -el pie esta atras, fuera del torso- se levanta el TALON, y al ir
         a pisar se levanta un poco la PUNTA. El apoyo va PLANO, como los
         pies apoyados del SWF. El pie gira sobre su hueso, que esta
         arriba: se sube lo justo para que la punta o el talon no se metan
         en el suelo. (+ baja la punta, - la levanta) */
      const punta = u < 0 ? 0 : (u < 0.5 ? 0.30 : 0.12) * Math.sin(u * U.TAU) * anda;
      alto += Math.abs(Math.sin(punta)) * 0.19;
      colocaPie(hs, R, id, alcance, alto,
                (s ? SEP_PIE : -SEP_PIE) * sepAire * (1 - RECOGE_PIE * vuelo), mirando);

      /* ---- El giro de la bota ----
         1. La bota se esculpio mirando al +Z del modelo: se corrige la
            mayor parte del giro de vista para que la punta siga al paso,
            pero no todo, que un poco de tres cuartos hace que la bota se
            lea como un volumen y no como una tabla.
         2. El cabeceo tiene que ir sobre la Z del MUNDO (ponGiro). */
      const giroPie = mirando * 0.75 * (MEDIO_PI - VISTA);
      ponGiro(hs[id], punta, 0, giroPie, mirando);

      /* Y no entra en el torso (ver dentroTorso): se baja lo que entre,
         hasta el suelo; lo que no se pueda bajar lo pone el torso. */
      const pie = hs[id], suelo = R[id].y;
      for (let k = 0; k < 3; k++) {
        const h = dentroTorso(cu, pie);
        if (h <= 0.0005) break;
        const baja = Math.min(h / Math.max(0.5, Math.cos(incl)), pie.position.y - suelo);
        if (baja <= 0.0005) { alza = Math.max(alza, h); break; }
        pie.position.y -= baja;
      }
    }
    /* Lo que el torso tenga que subir: sube en el acto -si espera un
       cuadro, la bota ya esta dentro- y baja despacio, para que no
       tiemble al paso de cada bota. */
    A.alza = alza > (A.alza || 0) ? alza : U.damp(A.alza || 0, alza, 6, dt);
    if (A.alza > 0.0005) cu.position.y += A.alza;

    /* ---------------- LAS MANOS ----------------
       En guardia se balancean con el paso -poco: son una guardia, no
       dos brazos sueltos-. Con arma, van al agarre. Y si hay un golpe
       en marcha, manda el golpe.

       El vaiven es el de la mano de delante del SWF (run y dash, en la
       fase de los pies): un lazo de 7 cm adelante-atras y 6 de alto por
       ciclo, al doble porque en 3D y de lejos el del SWF no se ve. Cada
       mano lo hace medio ciclo corrida, contra el pie de su lado. */
    enCiclo(M.run.mano, faseT, _mr); enCiclo(M.dash.mano, faseT, _md);
    const vDa = U.lerp(_mr[0], _md[0], g) * 2, vDy = U.lerp(_mr[1], _md[1], g);
    enCiclo(M.run.mano, (faseT + 0.5) % 1, _mr); enCiclo(M.dash.mano, (faseT + 0.5) % 1, _md);
    const vIa = U.lerp(_mr[0], _md[0], g) * 2, vIy = U.lerp(_mr[1], _md[1], g);
    const osc = U.clamp(vDa / 0.08, -1, 1);          // para lo que solo quiere el sentido
    /* Las dos manos NO son gemelas. La de delante va un poco mas
       adelante y mas alta que la de atras, y cada una respira a su
       ritmo: dos puños clavados en la misma postura, moviendose a
       la vez, es lo que hace que un muñeco parezca de plastico. */
    const res1 = Math.sin(t * 1.7 + A.semilla) * (1 - anda);
    const res2 = Math.sin(t * 1.42 + A.semilla * 1.7 + 2.1) * (1 - anda);
    let dIa = GUARDIA.alcance - 0.05 + vIa * anda + res2 * 0.014;
    let dIy = GUARDIA.alto - 0.035, dIs = -GUARDIA.sep;
    let dDa = GUARDIA.alcance + vDa * anda + res1 * 0.016;
    let dDy = GUARDIA.alto, dDs = GUARDIA.sep;
    dIy += vIy * anda - anda * 0.05 + res2 * 0.012;
    dDy += vDy * anda - anda * 0.05 + res1 * 0.013;
    /* ESPRINTANDO SIN ARMA, LOS PUÑOS BOMBEAN. El dash del SWF lleva una
       mano por delante, a la altura de la guardia, y la otra detras, a la
       del centro del torso: medidas en el marco del torso, 0,20 m por
       delante y 0,18 por detras. Aqui cada mano va y viene entre las dos,
       contra el pie de su lado: con los dos puños clavados delante el
       esprint parecia un zombi con los brazos estirados. Con un arma en
       la mano manda el agarre, mas abajo. */
    const bombeo = g * anda * (est.agarre ? 0 : 1);
    if (bombeo > 0.01) {
      const b = Math.cos(A.fase * U.TAU);    // +1: la derecha delante (el pie izquierdo pisando delante)
      dDa = U.lerp(dDa, 0.02 + 0.19 * b, bombeo); dDy = U.lerp(dDy, 0.44 + 0.065 * b, bombeo);
      dIa = U.lerp(dIa, 0.02 - 0.19 * b, bombeo); dIy = U.lerp(dIy, 0.44 - 0.065 * b, bombeo);
    }

    /* El giro de la guardia, con vida propia: la muñeca acompaña al
       balanceo del paso y respira parada. Es poco -un cuarto de
       radian- pero es la diferencia entre una guardia y dos piedras
       colgando. */
    const gGuar = GIRO_GUARDIA + GIRO_ANDANDO * anda;
    if (!mD) gD = gGuar + osc * 0.20 * anda + res1 * 0.10;
    if (!mI) gI = gGuar + U.clamp(vIa / 0.08, -1, 1) * 0.20 * anda + res2 * 0.10;

    if (est.agarre) {
      const G = est.agarre;
      /* EL ARMA DE FUEGO VA EN LA MANO DERECHA -la -X del hueso-: la
         de delante mirando a la derecha, como en la postura de pistola
         del SWF (beretta_front), y la de detras mirando a la izquierda,
         porque el muñeco se gira y no se refleja. La mano no cambia
         nunca; lo que cambia es la cara que se ve (Weapons.caraManos).
         Las blancas van en la otra: sus golpes estan medidos asi. */
      const lado = A.armaDelante ? -1 : 1;
      dDa = G.alcance; dDy = G.alto; dDs = G.sep * lado;
      if (!manoAcc) { gD = G.giroGuardia || 0; gI = 0; }
      if (G.dos) { dIa = G.alcance2; dIy = G.alto2; dIs = G.sep2 * lado; }
      else { dIa = GUARDIA.alcance * 0.8; dIy = GUARDIA.alto - 0.06; dIs = -GUARDIA.sep * 0.92 * lado; }
      /* El retroceso empuja las DOS manos hacia atras: con un arma
         a dos manos, mover solo la de delante estira el fusil. Solo
         si el arma no trae su propia animacion del SWF, que va mas
         abajo y sin amortiguar. */
      if (!curvaArma) {
        dDa -= A.retro * 0.13; dDy -= A.retro * 0.04;
        dIa -= A.retro * 0.13; dIy -= A.retro * 0.04;
      }
    }
    if (mI) { dIa = mI[0]; dIy = mI[1]; dIs = mI[2]; }
    if (mD) { dDa = mD[0]; dDy = mD[1]; dDs = mD[2]; }

    /* ---------------- SALIENDO POR LA PUERTA ----------------

       Cruzando el vano el muñeco no va en guardia: va ANDANDO, de
       frente, con los brazos colgando.

       Y tiene que ser una pose aparte, no la guardia vista desde
       otro angulo. La guardia es asimetrica a proposito -una mano
       adelantada y mas alta que la otra, porque se mira de tres
       cuartos-, y de frente esa asimetria se lee como un brazo
       torcido: uno cruzado por delante del pecho y el otro
       colgando. Es lo que se veia.

       De frente las dos manos van IGUALES, a los lados del torso y
       a la altura de la cadera:

         alcance 0,03   nada adelantado: el brazo cae a plomo
         alto    0,33   la cadera, no el pecho
         sep     0,385  justo fuera de la silueta del torso

       Se mezcla con el cuadrado de lo que queda por salir, la
       misma curva que usa el giro del cuerpo en actor.js: dentro
       del hueco manda la pose frontal, y para cuando el muñeco
       pisa el plano de pelea ya esta en guardia. Las dos cosas
       giran a la vez y no se ve un cambio de pose, se ve a alguien
       que sale y se pone en guardia. */
    /* La mano libre sube a cubrirse durante el agache 'tactics'. */
    if (A.evade > 0 && !(est.agarre && est.agarre.dos)) { dIa += tac[3]; dIy += tac[4]; }
    if (sal > 0) {
      const m = frente;
      const balan = osc * 0.085 * anda;     // los brazos acompañan al paso
      dIa = U.lerp(dIa, 0.03, m);
      dDa = U.lerp(dDa, 0.03, m);
      dIy = U.lerp(dIy, 0.33 + balan, m);
      dDy = U.lerp(dDy, 0.33 - balan, m);
      /* Cada mano del lado que va a tener en guardia. Con un arma de
         fuego la guardia lleva la mano del arma al otro costado
         (sep * lado, lado = -1: ver el agarre, arriba); con las manos
         puestas siempre derecha a +0,385 e izquierda a -0,385, al
         terminar de salir la del arma cruzaba el cuerpo entero, y
         como las manos flotan se leia como que el arma CAMBIABA DE
         MANO. Asi no cruza nada: la mezcla solo acerca o separa. */
      const ladoS = est.agarre && A.armaDelante ? -1 : 1;
      dIs = U.lerp(dIs, -0.385 * ladoS, m);
      dDs = U.lerp(dDs, 0.385 * ladoS, m);
      /* Y las muñecas rectas: el giro de guardia tuerce el puño
         hacia el enemigo, y de frente eso se ve como una mano del
         reves. */
      gI = U.lerp(gI, 0, m);
      gD = U.lerp(gD, 0, m);
    }

    /* Las manos llegan RAPIDO. En Madness no hay arrastre: el puño
       ya esta donde tiene que estar. */
    /* Durante un golpe la mano NO se amortigua: se pone donde dice
       la via y punto. Con la amortiguacion de antes -46, unos 22
       milisegundos de retraso- el puño llegaba a su maximo 47 ms
       DESPUES del instante de impacto: el golpe conectaba con el
       brazo todavia a medio estirar. Medido. Fuera de los golpes si
       se amortigua, que es lo que hace que la guardia respire. */
    const k = A.accion ? 190 : 19;
    A.mIa = U.damp(A.mIa, dIa, k, dt);
    A.mIy = U.damp(A.mIy, dIy, k, dt);
    A.mIs = U.damp(A.mIs, dIs, k, dt);
    A.mDa = U.damp(A.mDa, dDa, k, dt);
    A.mDy = U.damp(A.mDy, dDy, k, dt);
    A.mDs = U.damp(A.mDs, dDs, k, dt);
    /* El giro del puño es un ANGULO, y fuera de un golpe da igual
       por cuantas vueltas se haya ido: -2pi y 0 son la misma mano.

       Importa porque las vias de arma ahora acaban DADA LA VUELTA
       ENTERA -el bate del video no desanda el swing, sigue girando
       hasta volver a la guardia por el otro lado-, asi que al
       terminar el golpe A.gD vale -6,28 y el objetivo es 0. Sin
       envolver, el amortiguado se come esa vuelta al reves y el
       arma pega un molinete al acabar cada golpe. Dentro del golpe
       NO se envuelve: ahi el camino largo es justo el que se
       quiere. */
    if (!A.accion) {
      A.gI += Math.round((gI - A.gI) / U.TAU) * U.TAU;
      A.gD += Math.round((gD - A.gD) / U.TAU) * U.TAU;
    }
    A.gI = U.damp(A.gI, gI, k, dt);
    A.gD = U.damp(A.gD, gD, k, dt);

    /* LA PATADA DEL SWF va DESPUES de amortiguar: en el original el
       arma salta de un cuadro al siguiente, y amortiguada se veia
       como un empujon blando. dx y dy son el desplazamiento del puño
       en el marco del brazo -que va girado con la punteria-, en px y
       con la Y hacia abajo. Solo en la mano del arma: las de las
       armas largas van pegadas a su malla y la otra mano de la
       pistola no dispara. */
    let kA = 0, kY = 0, kS = 0;
    if (curvaArma) {
      const p = est.apunta || 0, c = Math.cos(p), s = Math.sin(p);
      kA = Disparo.K * (curvaArma[1] * c + curvaArma[2] * s);
      kY = Disparo.K * (curvaArma[1] * s - curvaArma[2] * c);
      /* En el SWF el brazo del arma va SIEMPRE por delante de la
         cabeza: el Colt retrocede 26 px y pasa por delante de la cara.
         Aqui la cabeza es una bola y se lo comia, asi que el puño se
         abre hacia fuera lo mismo que se recoge -el codo que sale-. */
      kS = Math.max(0, -kA) * 0.8 * Math.sign(A.mDs || 1);
    }
    colocaMano(hs, R, Chars.MANOS_I, A.mIa, A.mIy, A.mIs, mirando);
    colocaMano(hs, R, Chars.MANOS_D, A.mDa + kA, A.mDy + kY, A.mDs + kS, mirando);

    /* ---------------- LA ORIENTACION DE LOS PUÑOS ----------------

       Aqui estaba el fallo mas gordo que quedaba: la mano solo se
       TRASLADABA. Se esculpio colgando -dedos abajo, nudillos al
       frente, que es la pose de la hoja de referencia- y se quedaba
       exactamente asi en todas las acciones. Un puñetazo se veia
       como una mano en reposo empujada hacia adelante.

       Ahora cada via declara TAMBIEN el giro del puño, y hay dos
       cosas moviendose:

       1. ALINEAR. La cara de los nudillos mira al +Z del modelo,
          que esta 35 grados fuera del eje de la pelea. Se gira en
          planta hasta ponerla de cara al enemigo, y se gira TANTO
          COMO valga el golpe: en reposo la mano se queda como en la
          hoja, estirada del todo mira al frente.

       2. CABECEAR. Sobre la Z del mundo, que es el eje sobre el que
          gira un brazo que pega de frente.

          El esculpido tiene la muñeca en su +Y y los NUDILLOS en
          su -Y, en el extremo de abajo: es un puño que cuelga, que
          es la pose de la hoja de referencia. Con la via en cero,
          los nudillos miran al suelo -correcto en reposo, absurdo
          pegando-.

          Girando g sobre la Z del mundo, el -Y del puño acaba
          mirando a (sen g, -cos g). De ahi salen los numeros de la
          columna, que no estan puestos a ojo:

            directo   nudillos al frente   -> g = 90 grados
            remate    nudillos al suelo    -> g = 32 grados
            armado    nudillos atras-abajo -> g = -26 grados

          Medido despues: en el impacto de golpeA el puño apunta al
          enemigo 0,999 sobre 1 y al suelo 0,05. Antes eran 0,85 y
          0,48 -treinta grados cabeza abajo-, y por eso se veia
          como una mano en reposo empujada hacia adelante.

       Con arma manda la punteria y la alineacion es total: si no,
       la pistola apunta 35 grados al fondo y la bala sale por otro
       lado que el cañon. */
    const pos = est.apunta || 0;
    const ALINEA = mirando * (MEDIO_PI - VISTA);
    /* Cuanto esta la mano metida en un golpe, medido DESDE LA
       GUARDIA y no desde cero. Midiendolo desde cero, la guardia -que
       ya lleva 0,78 de giro- daba f = 0,52 y las manos se pasaban el
       juego entero medio alineadas al eje de la pelea, que es
       exactamente lo que rompia el par. */
    const metida = (gm) => U.clamp((Math.abs(gm) - Math.abs(GIRO_GUARDIA)) /
                                   (1.50 - Math.abs(GIRO_GUARDIA)), 0, 1);
    if (est.agarre) {
      /* CON ARMA la mano se gira en planta hasta alinearse con el
         eje de la pelea. Esto es lo que endereza el arma: la malla
         cuelga del hueso y se esculpio mirando al +Z del modelo,
         asi que sin este giro la pistola apuntaba 35 grados al
         fondo y la bala salia por otro lado que el cañon.
         La punteria es un cabeceo sobre la Z del mundo.

         PERO SI HAY UN GOLPE DE ARMA EN CURSO, MANDA EL GOLPE.

         Aqui estaba el fallo que dejaba los swings en estocadas.
         Esta rama llamaba SIEMPRE con -pos, el angulo de punteria,
         asi que el barrido de muñeca que declara la via se
         calculaba, se amortiguaba en A.gD... y no llegaba nunca a
         los huesos. Medido: el arma barria 2-4 grados en pantalla
         durante todo el golpe -o sea nada- y lo unico que se movia
         era la mano, que TRASLADABA el bate en vez de girarlo.

         Un bate que no rota no es un bate: es una lanza. */
      /* LA MUÑECA DEL ARMA DE FUEGO.

         El eje sobre el que la mano envuelve lo que agarra no es el
         de punteria: esta a unos 45 grados de el -por eso el bate,
         que va inclinado esos mismos 45, queda bien cogido-. Un bate
         o un cuchillo son columnas que se pueden poner en ese eje;
         una pistola no, porque su empuñadura es perpendicular al
         cañon. Resultado: la mano salia envolviendo el CAÑON, con
         los nudillos mirando abajo y a un lado en vez de colgar
         rectos de la empuñadura.

         Asi que las armas de fuego declaran un giro de muñeca propio
         y la mano se lo aplica... PERO EL ARMA NO. El hueso del arma
         copia la orientacion de la mano, asi que se le deshace ese
         mismo giro por la izquierda: la mano gira, el arma se queda
         donde estaba y la punteria no se entera. Exacto, no
         aproximado. */
      const muñ = (est.agarre.muñeca || 0);
      /* La mano de delante de un arma larga agarra el guardamanos,
         que si es una columna en el eje de punteria: esa no lleva
         giro propio. */
      const muñI = est.agarre.dos ? (est.agarre.muñeca2 || 0) : muñ;
      /* Y el cabeceo de la patada se suma a la punteria: el cañon
         sube desde el puño, como en el Fire R. */
      const posK = pos + (curvaArma ? curvaArma[0] : 0);
      /* giroGuardia: el angulo del arma blanca en guardia, el del SWF
         (golpes.js). Va a la mano y al arma con ella, sin compensar. */
      const gA = manoAcc ? A.gD : (muñ - posK + (est.agarre.giroGuardia || 0));
      const gB = manoAcc ? A.gI : (muñI - posK);
      ponGiroMano(hs, Chars.MANOS_D, gA, 1, ALINEA, mirando);
      ponGiroMano(hs, Chars.MANOS_I, gB, 1, ALINEA, mirando);
      // se guarda YA con el signo del lado aplicado
      A.muñArma = manoAcc ? 0 : (muñ * -mirando);
    } else {
      /* El giro en planta va ANTES del cabeceo, asi que una vez el
         puño esta tumbado hacia el enemigo lo que hace es rodarlo
         sobre el eje del golpe: es lo que enseña la cara de los
         nudillos en vez del canto.

         Y no lleva nada de giro sobre el eje de la pelea. Lo
         llevaba, 0,42, y era lo que metia el puño hacia el fondo:
         mirando a la izquierda el golpe salia con 0,58 de
         componente en profundidad -medido- en vez de ir recto. */
      // en un golpe sin arma del SWF el puño no se alinea: gira en el plano, como el dibujo
      const fD = A.puñoSWF ? 0 : metida(A.gD), fI = A.puñoSWF ? 0 : metida(A.gI);
      /* El giro en planta va al REVES en cada mano cuando no hay
         golpe: es lo que hace que los dos pulgares se junten hacia
         adelante, como cuelgan las manos de verdad. */
      A.muñArma = 0;
      ponGiroMano(hs, Chars.MANOS_D, A.gD, fD,
                  ALINEA * fD + (1 - fD) * 0.14, mirando);
      ponGiroMano(hs, Chars.MANOS_I, A.gI, fI,
                  ALINEA * fI - (1 - fI) * 0.14, mirando);
    }

    if (est.agarre) {
      /* La mano que empuña va en AGARRE; la otra, tambien si el arma
         es de dos manos. */
      /* Un cuchillo se sujeta con el puño cerrado, no envolviendo:
         lo dice su ficha. */
      pD = est.agarre.poseReposo ? REPOSO : AGARRE;
      /* La mano de atras de un arma a dos manos no siempre envuelve:
         en un bate va cerrada en puño por debajo de la de delante,
         que es como se coge de verdad y lo que enseña la referencia.

         Y en un arma LARGA no envuelve ni cierra: va POR DEBAJO del
         guardamanos, con tres dedos asomando. Es la pose 'cañon',
         sprite 8 de la hoja, y es la que se ve en la referencia de
         Deimos con el fusil. Con la de envolver, el fusil parecia
         cogido por el cañon con el puño cerrado, que no es como se
         sostiene un arma larga ni como lo dibuja la serie. */
      pI = est.agarre.canon ? CANON
         : (est.agarre.dos && !est.agarre.reposoAtras) ? AGARRE : REPOSO;
    }
    if (est.manosAbiertas) { pI = PALMA; pD = PALMA; }
    /* EN EL SWF LAS MANOS NO CUELGAN DEL TRONCO. handShoot_front y
       handNone_back son piezas del personaje, hermanas de myBody: el
       tronco se inclina 26 grados en melee_dash2 y el arma ni se
       entera. Aqui las manos son hijas del cuerpo, asi que cada grado
       de inclinacion y de giro del tronco le llegaba al arma -medido:
       hasta 50 grados de mas en dash2, y el bate metido 1,3 m bajo el
       suelo-. Durante un golpe del SWF se les deshace el giro del
       tronco: posicion y orientacion quedan en el marco del muñeco,
       como en el original. */
    /* EL DASH_TURN DEL SWF, EN 3D. Esprintando, el cuerpo encara la
       carrera y las manos -con el arma, que cuelga de la mano- giran
       sobre el eje del tronco hasta encarar la mira. En el SWF es un
       espejo (xscale -1 de cabeza y manos); aqui es el angulo que haga
       falta, asi que tambien vale para una mira en diagonal. Con
       continuidad: la mira justo detras no puede saltar de +PI a -PI. */
    /* El amortiguado va sobre el rumbo ABSOLUTO del arma, no sobre el
       giro relativo al cuerpo. Relativo, cada grado que giraba el
       cuerpo se lo comia el retraso -esprintando con el blanco detras
       el arma llegaba a ir 100 grados por detras de la mira- y, al
       buscar la vuelta mas corta sin volver nunca a (-PI, PI], el
       giro se iba sumando vueltas enteras: medido, 12,6 rad, dos
       vueltas completas de brazos. Ahora el arma persigue una
       direccion del mundo, el giro sale de restarle el cuerpo y
       siempre queda en (-PI, PI]. Ojo al signo: el giro es local,
       sobre +Y, y un giro local positivo RESTA rumbo en el mundo
       (el rumbo es atan2(z, x)); de ahi el 'ru - g'. */
    {
      const ru = est.rumbo || 0, g = est.giroTiro || 0;
      if (A.yawArma === undefined || (!g && !A.giroTiro)) A.yawArma = ru;
      A.yawArma = U.angLerp(A.yawArma, ru - g, 1 - Math.exp(-18 * dt));
      A.giroTiro = U.angDiff(A.yawArma, ru);
      if (!g && Math.abs(A.giroTiro) < 1e-3) { A.giroTiro = 0; A.yawArma = ru; }
    }
    if (A.giroTiro) {
      _qdes.setFromAxisAngle(EJE_Y, A.giroTiro);
      for (const hh of [Chars.MANOS_D, Chars.MANOS_I]) {
        for (const id of hh) {
          hs[id].position.applyQuaternion(_qdes);
          hs[id].quaternion.premultiply(_qdes);
        }
      }
      /* Y el eje de la muñeca del arma de fuego con ellas: encararManos
         le deshace al arma ese giro sobre ese eje, y sin girarlo el
         arma se desenroscaba sobre otro y quedaba del reves -medido: la
         pistola seguia apuntando a la carrera con la mano ya detras-. */
      _ejeMano.applyQuaternion(_qdes);
    }
    if (manosSWF) {
      _qdes.copy(cu.quaternion).invert();
      for (const hh of [Chars.MANOS_D, Chars.MANOS_I]) {
        for (const id of hh) {
          hs[id].position.applyQuaternion(_qdes);
          hs[id].quaternion.premultiply(_qdes);
        }
      }
    }
    /* Si el arma trae sus manos -las del SWF, pegadas a ella- las del
       personaje se esconden: la derecha siempre, la izquierda si el
       arma va a dos manos. El hueso sigue moviendose igual, porque el
       arma cuelga de el. */
    const nm = A.nManos || 0;
    pI = reposoOReves(A, hs, Chars.MANOS_I, pI, -1);
    pD = reposoOReves(A, hs, Chars.MANOS_D, pD, 1);
    ponPose(A, hs, nm >= 2 ? -1 : pI, nm >= 1 ? -1 : pD);
    encararManos(A, hs, pI, pD);

    /* ---------------- LA CABEZA ----------------
       Mira a donde apunta, con retraso. Y en reposo se ladea sola
       un par de grados, distinto en cada personaje: sin eso una
       fila de grunts parece un escaparate de maniquies. */
    const ca = hs[H.CABEZA], rca = R[H.CABEZA];
    A.giroCab = U.damp(A.giroCab, est.miraCab || 0, 9, dt);
    A.incCab = U.damp(A.incCab, pos * 0.6, 9, dt);   // mira arriba y abajo con el cañon
    const cabeceo = -incl * 0.6 - A.incCab + A.dolor * 0.25;
    const ladeoCab = Math.sin(t * 1.3 + A.semilla * 2) * 0.035;
    /* La cabeza CONTRA el tronco: el cuerpo se va de lado y la
       mirada se queda clavada en quien dispara. El -ladeo*0.5 ya
       hacia media parte; el termino de la esquiva remata la otra
       media para que la oposicion se vea de verdad. */
    /* Y la cabeza se queda quieta mientras los hombros giran: es
       lo que hace todo el mundo al andar, y es lo que remata que
       la caminata de frente se lea como una caminata. Se le
       devuelve dos tercios del giro de hombros, no el entero: una
       cabeza perfectamente clavada parece atornillada. */
    ponGiro(ca, cabeceo, ladeoCab - ladeo * 0.5 + A.dolor * 0.3
                - balOsc * 0.030,
            A.giroCab + balOsc * 0.107 + A.giroTiro, mirando);
    // la cabeza se hunde entre los hombros (tactics del SWF)
    ca.position.set(rca.x, rca.y - A.dolor * 0.02 + tac[2], rca.z);
  };

  /* -------------------------------------------------------------
     Colocar una mano. Se pide en el eje de la pelea y se escribe
     en las DOS versiones del hueso -puño y mano abierta-, que
     viven en el mismo sitio.

     La posicion que se escribe es RELATIVA al hueso del cuerpo, que
     es el padre: por eso no hace falta sumar la pose de reposo, y
     por eso la mano acompaña al bamboleo del tronco sola.
     ------------------------------------------------------------- */
  function colocaMano(hs, R, huesos, alcance, alto, sep, mirando) {
    aHueso(alcance, sep, mirando, _t2);
    const p = hs[huesos[0]].position;
    p.set(_t2.x, alto, Z_MANO + _t2.z);
    for (let q = 1; q < huesos.length; q++) hs[huesos[q]].position.copy(p);
  }

  function colocaPie(hs, R, id, alcance, alto, sep, mirando) {
    aHuesoPaso(alcance, sep, mirando, _t1);
    // el pie parte de su sitio de reposo y se desplaza por el eje
    hs[id].position.set(_t1.x, R[id].y + alto, _t1.z);
  }

  /* -------------------------------------------------------------
     EL GIRO DE UNA MANO, Y POR QUE NO VALE EL DE UNA BOTA

     Las dos manos son la MISMA malla espejada -medido: cero error de
     posicion y cero normales invertidas en los 206 vertices-. Y aun
     asi se veian las dos "mirando al mismo lado".

     La culpa era del EJE. El cabeceo iba sobre la Z del mundo, que
     en el espacio del muñeco es (-mirando*senV, 0, cosV): tiene una
     componente lateral de 0,82. Y un giro sobre un eje con
     componente lateral NO SOBREVIVE al espejo -al reflejar, ese
     trozo del eje cambia de signo-, asi que aplicarle el mismo giro
     a las dos manos rompe la simetria izquierda/derecha. Cuanto mas
     giro, mas se parecen las dos a la misma mano.

     Un giro sobre la X del propio muñeco si sobrevive: al reflejar,
     el eje y el angulo cambian de signo a la vez y se cancelan. Por
     eso:

       en REPOSO  -> se cabecea sobre la X del muñeco, y el par sale
                     simetrico, una mano izquierda y una derecha
       PEGANDO    -> se cabecea sobre la Z del mundo, que es lo que
                     manda el puño a la cara del enemigo

     y entre medias se interpola el eje con 'f', que mide lo metida
     que esta la mano en el golpe. La bota no tiene este problema
     porque no hay bota izquierda y derecha: son la misma pieza.
     ------------------------------------------------------------- */
  function ponGiroMano(hs, huesos, adelante, f, giroY, mirando) {
    _ejeMano.set(1 - f + f * (-mirando * SEN_V), 0, f * COS_V).normalize();
    _q0.setFromAxisAngle(_ejeMano, adelante * (f > 0.5 ? -mirando : 1));
    _q2.setFromAxisAngle(EJE_Y, giroY);
    const q = hs[huesos[0]].quaternion;
    q.copy(_q0).multiply(_q2);
    for (let i = 1; i < huesos.length; i++) hs[huesos[i]].quaternion.copy(q);
  }

  /* -------------------------------------------------------------
     PONER EL DORSO DE CARA

     La mano es una LOSA: su dibujo esta en la cara, y de canto se
     queda en una raya. Medido en el juego, el coseno entre la cara
     de la mano y la camara daba 0,00-0,02 en los enemigos armados:
     estaban saliendo de canto casi siempre, y por eso se veian
     estrechas, aplastadas y partidas en tiras.

     No es culpa de la animacion -las vias estan medidas y apuntan a
     donde tienen que apuntar-: es que un cabeceo sobre un eje que no
     es el de la camara acaba girando la losa de lado. Con los tubos
     de antes no se notaba porque eran casi de revolucion.

     Asi que despues de colocar la mano se le añade UN SOLO grado de
     libertad: rodarla sobre el eje de los dedos -su Y local- hasta
     que el dorso mire a camara. No cambia a donde apunta la mano,
     solo la pronacion de la muñeca, que es justo el grado de
     libertad que tiene de verdad. Y es lo que hace el dibujo 2D:
     el dorso siempre de cara.

     El padre de las manos es el CUERPO, y el del cuerpo la RAIZ, asi
     que la orientacion de partida sale de multiplicar esas dos sin
     tener que recalcular matrices de mundo. */
  const _vc = new THREE.Vector3();
  const _vf = new THREE.Vector3();
  const _ve = new THREE.Vector3();   // eje del arma, en el mundo
  const _vx = new THREE.Vector3();   // normal de la cara del arma
  const _vp = new THREE.Vector3();   // la camara, quitada la parte del eje
  const _vn = new THREE.Vector3();
  const _qa = new THREE.Quaternion();
  const _qpi = new THREE.Quaternion();
  const _qdes = new THREE.Quaternion();
  const _qp = new THREE.Quaternion();
  const _qm = new THREE.Quaternion();
  const _qr = new THREE.Quaternion();
  const _ey = new THREE.Vector3();
  const _ez = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _cr = new THREE.Vector3();
  const EJE_Z = new THREE.Vector3(0, 0, 1);

  function rodarMano(hs, huesos, pose) {
    const h = hs[huesos[pose]];
    _qm.copy(_qp).multiply(h.quaternion);          // orientacion en el mundo
    _ey.set(0, 1, 0).applyQuaternion(_qm);         // eje de los dedos
    _ez.set(0, 0, 1).applyQuaternion(_qm);         // normal de la cara

    /* Se trabaja en el plano perpendicular al eje de los dedos: ahi
       dentro es donde se puede rodar. Si el eje de los dedos apunta
       casi a la camara no hay plano util -la mano se ve de punta- y
       rodarla no arregla nada, asi que se deja como esta. */
    const ky = _ey.z;
    _t.copy(EJE_Z).addScaledVector(_ey, -ky);
    if (_t.lengthSq() < 0.05) return;
    _t.normalize();
    const kz = _ez.dot(_ey);
    _ez.addScaledVector(_ey, -kz);
    if (_ez.lengthSq() < 1e-6) return;
    _ez.normalize();

    const ang = Math.atan2(_cr.crossVectors(_ez, _t).dot(_ey), _ez.dot(_t));
    _qr.setFromAxisAngle(EJE_Y, ang);
    const q = h.quaternion.multiply(_qr);
    for (let i = 0; i < huesos.length; i++) {
      if (i !== pose) hs[huesos[i]].quaternion.copy(q);
    }

  }

  function encararManos(A, hs, pI, pD) {
    /* EL ARMA COPIA LA MANO ANTES DE RODARLA.

       Su hueso no se escala nunca -por eso el bate se ve- y se queda
       con la orientacion que le da la animacion, sin el rodado
       cosmetico: la malla apunta a su +Z y rodar sobre la Y local le
       moveria el cañon justo en el plano en el que se apunta, o sea
       que la bala saldria por un lado y el cañon miraria a otro. */
    const ma = hs[Chars.MANOS_D[pD]], ar = hs[H.ARMA_D];
    ar.quaternion.copy(ma.quaternion);
    /* Y se le quita el giro de muñeca propio del arma de fuego: la
       mano lo lleva, el arma no. Va por la izquierda porque el eje
       esta en el marco del padre, que es donde lo monto
       ponGiroMano. */
    if (A.muñArma) {
      _qa.setFromAxisAngle(_ejeMano, -A.muñArma);
      ar.quaternion.premultiply(_qa);
    }
    /* Y va al CENTRO de la mano, no al pivote: el hueso pivota en la
       muñeca y el arma colgada de ahi pasaba por el borde de arriba
       del puño. Y se mete ademas POR DETRAS del plano de la mano,
       que es lo que hace que los dedos se vean por delante del
       mango en vez de quedar el puño partido en dos. Los dos
       desplazamientos van en el marco de la mano, asi que giran con
       ella. */
    /* La orientacion del padre de las manos, EN EL MUNDO. Le faltaba
       la del grupo, que lleva el giro del personaje -unos 55 grados-
       y es justo el que separa la Z del hueso de la Z de la camara.
       Sin ella, el enderezado de muñeca apuntaba 55 grados fuera. */
    _qp.copy(A.c.grupo.quaternion)
       .multiply(hs[H.RAIZ].quaternion)
       .multiply(hs[H.CUERPO].quaternion);
    _qpi.copy(_qp).invert();

    _vc.set(0, -Chars.MANO_CENTRO, 0).applyQuaternion(ma.quaternion);
    ar.position.copy(ma.position).add(_vc);
    /* Y AL FONDO, en Z DEL MUNDO, no del hueso: las manos son losas
       planas de cara a la camara, asi que el arma tiene que quedar
       por detras de LAS DOS para que se lean enteras y el pomo se
       vea. Empujandola por la Z del hueso se iba tambien de lado,
       porque el hueso esta girado con el personaje. */
    _vf.set(0, 0, -Chars.MANO_FONDO).applyQuaternion(_qpi);
    ar.position.add(_vf);

    /* ---------------- LA CARA DEL ARMA, DE FRENTE ----------------

       Un cuchillo es una CHAPA: su dibujo esta en la cara y de canto
       se queda en una raya. Y de canto salia: el muñeco esta girado
       55 grados sobre el eje de la pelea, asi que la cara de la hoja
       miraba ahi y lo que se veia era el filo. Medido con el cuchillo
       en la mano, la hoja daba 0,08 de coseno contra la camara: 85
       grados fuera. Por eso parecia un palito y no un cuchillo, que
       es el mismo problema que tenian las manos.

       El arreglo es el mismo que el de las manos y cuesta lo mismo:
       UN SOLO grado de libertad. Se rueda el arma sobre SU PROPIO
       EJE LARGO hasta que su cara mire a camara. Rodar sobre el eje
       largo no mueve la punta ni un milimetro -es el eje de
       revolucion del arma-, asi que la punteria y la caja de golpe
       quedan exactamente donde estaban; lo unico que cambia es que
       se ve la hoja y no su canto.

       El eje NO es la Z del hueso: cada malla lleva su inclinacion
       de reposo -un arma blanca se lleva en alto, no apuntando al
       enemigo-, asi que la Z del hueso no es el eje de la hoja.
       Rodando sobre ella lo que se hace es abanicar el arma, y
       medido eso dejaba la estocada del cuchillo 79 grados fuera de
       su propia direccion. El eje bueno lo calcula actor.js al
       equipar y viene en A.ejeArma. */
    if (A.ejeArma) {
      _qa.copy(_qp).multiply(ar.quaternion);         // el arma, en el mundo
      _ve.copy(A.ejeArma).applyQuaternion(_qa);      // su eje largo
      _vx.copy(A.caraArma).applyQuaternion(_qa);     // la normal de su cara
      _vp.set(0, 0, 1).addScaledVector(_ve, -_ve.z); // la camara, sin la parte del eje
      if (_vp.lengthSq() > 1e-4) {
        _vp.normalize();
        let co = _vx.dot(_vp);
        let se = _vn.crossVectors(_vx, _vp).dot(_ve);
        /* Se rueda LO MINIMO: a camara va la cara que ya esta mas cerca
           de mirarla, la +x o la -x. Forzando siempre la +x, mirando a un
           lado el giro era de casi media vuelta y el cuchillo quedaba dado
           vuelta, con la mano de cabeza. Una hoja es igual por las dos
           caras, y la mano que se enseña es la de la cara que mira a
           camara (Weapons.caraManos). */
        if (co < 0) { co = -co; se = -se; }
        ar.quaternion.multiply(_qa.setFromAxisAngle(A.ejeArma, Math.atan2(se, co)));
      }
    }
    /* Las manos del arma: la cara que se ve segun el angulo real. 'Fuera'
       es del cuerpo hacia el lado de la mano que empuña, en el mundo. */
    if (A.manosArma) {
      _qa.copy(_qp).multiply(ar.quaternion).multiply(A.manosArma.q);
      _vf.set(Math.sign(ma.position.x) || 1, 0, 0).applyQuaternion(_qp);
      Weapons.caraManos(A.manosArma.g, _qa, _vf);
    }
    rodarMano(hs, Chars.MANOS_D, pD);
    rodarMano(hs, Chars.MANOS_I, pI);
  }

  /* LA MANO DE REPOSO, POR FUERA O POR DENTRO. Una mano abierta al
     costado lleva el dorso hacia fuera del cuerpo: desde la camara se ve
     el dorso de la de cerca (REPOSO, dibujo A del SWF, los nudillos) y el
     lado de dentro de la de lejos (REVES, dibujo B, hand_back: los dedos y
     el pulgar), que es como pinta la serie la mano de delante y la de
     atras. 'Fuera' es del cuerpo hacia el lado en que esta la mano, en el
     mundo (lo mismo que Weapons.caraManos); la camara mira por -Z. Con
     0,08 de margen para que al girar de frente no parpadee. */
  const _vfu = new THREE.Vector3();
  const _qcu = new THREE.Quaternion();
  function reposoOReves(A, hs, ids, p, lado) {
    if (p !== REPOSO) return p;
    _qcu.copy(A.c.grupo.quaternion).multiply(hs[H.RAIZ].quaternion).multiply(hs[H.CUERPO].quaternion);
    _vfu.set(Math.sign(hs[ids[0]].position.x) || lado, 0, 0).applyQuaternion(_qcu);
    const k = lado > 0 ? 'revesD' : 'revesI';
    if (_vfu.z < -0.08) A[k] = true;
    else if (_vfu.z > 0.08) A[k] = false;
    return A[k] ? REVES : REPOSO;
  }

  /* El cambio de pose NO se interpola: en la serie una mano esta
     cerrada y al fotograma siguiente esta abierta. Un cambio
     progresivo se veria como un globo desinflandose. */
  function ponPose(A, hs, pI, pD) {
    if (pI !== A.poseI) {
      A.poseI = pI;
      for (let q = 0; q < Chars.POSES; q++) hs[Chars.MANOS_I[q]].scale.setScalar(q === pI ? 1 : 0);
    }
    if (pD !== A.poseD) {
      A.poseD = pD;
      for (let q = 0; q < Chars.POSES; q++) hs[Chars.MANOS_D[q]].scale.setScalar(q === pD ? 1 : 0);
    }
  }

  Anim.retroceso = function (A, f) { A.retro = Math.min(1.4, A.retro + (f || 1)); };
  Anim.encajar = function (A, f) { A.dolor = Math.min(1.6, A.dolor + (f || 1)); };

  global.Anim = Anim;
})(window);

