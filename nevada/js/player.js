/* =============================================================
   player.js -> El que lleva el jugador.

   Hank es un actor mas: las mismas piernas, el mismo cilindro, el
   mismo sistema de armas. Lo que cambia es de donde vienen las
   intenciones y tres cosas que los enemigos no tienen: la
   ESQUIVA, la CADENA DE TRES y el BULLET TIME.

   LA CADENA es lo que hace que pegar se sienta bien. Tres golpes
   encadenados: dos directos rapidos y un remate lento que manda
   al suelo. La ventana para encadenar se abre EN EL IMPACTO, no
   cuando acaba la animacion; si se espera al final, el combo se
   siente pegajoso y el jugador cree que el juego no le escucha.

   LA ESQUIVA da medio segundo de invulnerabilidad y mueve seis
   metros. Es la respuesta a la escopeta y al soldat: en un juego
   donde el enemigo dispara sin fallar, tiene que haber un boton
   que diga "eso no me ha dado".

   EL BULLET TIME es el del SWF: una barra de 400 cuadros que empieza
   vacia, se carga +20 por cada baja propia (+10 si ya estaba activo),
   se prende y se apaga con el mismo boton y se gasta a 1 cuadro por
   tic (13,3 s llena). Frena a todos, tambien al jugador: ver
   Game.paso.
   ============================================================= */
(function (global) {
  'use strict';

  const Player = {};

  Player.crear = function (opts) {
    /* EL JUGADOR ES EL 'Player' DEL SWF, EN NIVEL 1.

       Usa la ficha del grunt para el ASPECTO. Lo que aguanta y como
       pelea es lo del personaje del jugador del original (t178349:
       'Player', nivel 1, especial, applyStats todo a 0) al empezar la
       partida, que es el nivel mas bajo del juego:

         vida        6 + 1 + 10 (especial) = 17
         barra TAC   ninguna: la formula del original solo da barra
                     desde nivel 5
         STR, END    0: modDmg 1 y modArmor 1
         habilidades 0: sin perks, golpes 'chump' con arma blanca y con
                     los puños (golpes.js)
         bullet time barra de 400 cuadros, vacia al empezar

       Antes era un principal inventado (nivel 12, TAC 5, 100 de vida):
       ni sus golpes ni su barra salian del SWF. */
    const a = Actor.crear({
      tipo: 'grunt', jugador: true, bando: 'jugador',
      x: opts.x || 0, z: 0, arma: opts.arma || 'puños',
      nivel: 1, especial: true,
      str: 0, end: 0, tac: 0, awr: 0, dex: 0, melee: 0, unarmed: 0
    });

    a.cadena = 0;          // en que golpe de la cadena va
    a.ventana = 0;         // tiempo que queda para encadenar
    a.esquiva = 0;         // lo que dura la esquiva en curso
    a.slowMo = 0;          // barra de bullet time, en cuadros del SWF (mySlowMo)
    a.bulletTime = false;  // slowMoActive
    a.pendiente = false;   // hay un impacto de melee sin resolver
    a.apuntando = false;
    a.bajas = 0;
    a.combo = 0;
    a.tCombo = 0;
    return a;
  };


  /* =============================================================
     ORDENES
     ============================================================= */
  Player.atacar = function (a, objetivos, flanco) {
    // derribado (knockback) o aturdido por un golpe corriendo: sin accion, como en el SWF
    if (!a.vivo || a.aturdido > 0 || a.esquiva > 0 || Actor.fuera(a) || a.man || a.irA) return;
    const f = a.arma.ficha;

    if (f.tipo === 'fuego') { Player.disparar(a, objetivos); return; }
    /* Un golpe por pulsacion (ver game.js). Sin 'flanco' -quien llame
       sin el- se toma como pulsacion nueva. */
    /* Mantenido (mouseHold del SWF): en cuanto acaba un golpe sale el
       siguiente, y el combo sigue porque no pasan los 4 cuadros de
       meleeComboTimer. Un toque corto acaba antes que el golpe y no
       repite. */
    if (flanco === false && (!Golpes.usa(f) || Anim.ocupado(a.anim))) return;

    /* ARMA BLANCA: los golpes del SWF (golpes.js). Pulsado a mitad de un
       golpe, se guarda y sale al acabar: el combo del SWF. */
    if (Golpes.usa(f)) {
      if (Anim.ocupado(a.anim)) { a.golpeEnCola = true; return; }
      if (Golpes.lanzar(a)) { a.pendiente = true; a.golpeEnCola = false; }
      return;
    }
    // melee: encadenar solo si la ventana esta abierta
    if (Anim.ocupado(a.anim) && a.ventana <= 0) return;
    /* Con arma se lanzan SUS golpes, no puñetazos. Antes se tiraba
       siempre golpeA/B/C, asi que con un bate en la mano el muñeco
       pegaba puñetazos y el arma iba de acompañante. */
    const golpes = f.golpes || ['golpeA', 'golpeB', 'golpeC'];
    Anim.lanzar(a.anim, golpes[a.cadena % golpes.length]);
    Sonido.tocar('silbido', { x: a.x, cam: Game.camX });
    a.pendiente = true;
    a.cadena = (a.cadena + 1) % 3;
    a.ventana = 0;
  };

  const _boca = new THREE.Vector3();
  Player.disparar = function (a, objetivos) {
    const arma = a.arma, f = arma.ficha;
    /* La SPAS recarga cartucho a cartucho y el gatillo corta la
       recarga al acabar el que esta metiendo: el mouseHold del SWF. */
    if (arma.recargando > 0 && f.unoAUno) arma.cortar = true;
    if (arma.espera > 0 || arma.recargando > 0 || Actor.fuera(a) || Anim.ocupado(a.anim)) return;
    /* PISTOL WHIP (checkWhipRange, 119777..120500, y el ataque 49817..50282):
       con perkMeleePistolWhip (Melee 10), un disparo con un enemigo delante
       a menos de myUnarmed.myRange x 0,8 (95 x 0,8 = 76 px, 1,25 m) se
       cambia por un culatazo: melee_pistol, o melee_rifle con un arma de dos
       manos. El golpe es el de la mano libre del sprite ('unarmed', cuadro 9
       de 26): 2,5 (unarmed_brawl) x modDmg/3, y como todo puñetazo puede
       tirarlo al suelo (Actor.efectosGolpe: 1 de 23, 1 de 7 con Knockdown 1,
       1 de 3 con Knockdown 2).
       El SWF ademas pide aimTimer == -1: no estar manteniendo la punteria
       (el boton de apuntar). Aqui no hay ese boton: en el movil el dedo
       lleva la mira todo el rato (Mira.tManual) y con esa condicion el
       culatazo no salia nunca. Asi que basta con tener al enemigo encima. */
    if (Progreso.perk(a, 'perkMeleePistolWhip') && Player.aTiroDeCulata(a, objetivos)) {
      const n = f.agarre && f.agarre.dos ? 'swf_melee_rifle' : 'swf_melee_pistol';
      Golpes.danoConArma(a);                          // la culata pega lo de 'unarmed_brawl': 2,5
      if (Anim.lanzar(a.anim, n)) {
        a.pendiente = true;
        Sonido.tocar('silbido', { x: a.x, cam: Game.camX });
        return;
      }
    }
    if (arma.cargador <= 0) { Sonido.tocar('vacio', {x:a.x, cam:Game.camX}); Player.recargar(a); return; }
    arma.cargador--;
    /* myROF - rofAdjust: los perks de cadencia (Progreso.kROF). */
    arma.espera = f.cadencia * Progreso.kROF(a, f);
    a.desdeTiro = 0;                                  // rofTimer = 0: el smgAimTimer sigue bajando
    /* LA BALA NACE EN LA BOCA DE LA MALLA -la punta del cañon que se
       ve, con la patada y todo- y va A LA MIRA. Antes salia de una
       boca calculada aparte, y con el arma levantada por la patada o
       con el brazo a medio girar el fogonazo y la bala aparecian
       fuera del cañon. */
    const pb = Disparo.boca(a, _boca) || Weapons.puntoBoca(a, a.apunta || 0);
    const ox = pb.x, oy = pb.y, oz = pb.z;
    /* LA BALA VA A LA MIRA, NO A DONDE ESTE EL BRAZO.

       Antes, con la mira pegada o detras, mandaba el rumbo del arma
       -el del cuerpo mas el giro animado de los brazos-, y ese giro
       va amortiguado: esprintando con el blanco detras llegaba tarde
       y la bala salia hasta 178 grados desviada (medido, ver
       tools/swf_disparo/tactil_detras.js). En el SWF la bala sale del
       myShootPoint hacia el punto de mira, y punto: la animacion
       dibuja, no decide.

         - con un blanco enganchado, de la boca a su centro -la mira
           esta al alcance del arma y no a la distancia del blanco, y
           desde una boca desplazada del pecho la linea boca-mira se
           abriria de el-;
         - si no, de la boca a la mira;
         - y si la mira queda detras de la boca -arma larga, mira
           pegada-, la direccion de la punteria sin mas. */
    let rumbo = Mira.yaw, pico = Mira.pico;
    if (Mira.tiro) {
      const bl = Mira.fijado && Mira.blanco;
      const tx = bl ? bl.x : Mira.x, ty = bl ? bl.y : Mira.y, tz = bl ? (bl.z || 0) : Mira.z;
      const dx = tx - ox, dy = ty - oy, dz = tz - oz;
      const delante = dx * Math.cos(Mira.yaw) + dz * Math.sin(Mira.yaw);
      if (delante > 0.35) { rumbo = Math.atan2(dz, dx); pico = Math.atan2(dy, Math.hypot(dx, dz)); }
    } else {
      rumbo = Actor.rumboTiro(a); pico = a.apunta;
    }
    /* Un disparo APUNTADO A MANO atraviesa la TAC del que lo
       reciba; el que sale del enganche automatico, no. Es la misma
       llave que el aimTimer del original y hace que mover la mira
       con el dedo tenga premio. */
    Combat.disparar(ox, oy, oz, rumbo, pico, arma, objetivos, a,
                    Mira.tManual > 0);
    Sonido.tocar(Sonido.arma(f), { x: a.x, cam: Game.camX });
    Anim.retroceso(a.anim, f.retro);
  };

  /* ¿Hay un enemigo vivo delante, a menos de 76 px (95 x 0,8, el
     myRange de 'Unarmed' por 0,8) del cuerpo? En planta, como el resto
     de los alcances; 'delante' es el lado hacia el que apunta. */
  Player.aTiroDeCulata = function (a, objetivos) {
    const R = 95 * 0.8 * Weapons.PX, fx = Math.cos(a.rumbo), fz = Math.sin(a.rumbo);
    for (const o of objetivos) {
      if (!o.vivo || o.actor === a || o.actor.bando === a.bando || o.actor.esquiva > 0) continue;
      const dx = o.x - a.x, dz = (o.z || 0) - (a.z || 0);
      if (dx * fx + dz * fz > 0 && Math.hypot(dx, dz) - o.r < R) return true;
    }
    return false;
  };

  Player.recargar = function (a) {
    const arma = a.arma, f = arma.ficha;
    if (f.tipo !== 'fuego' || arma.recargando > 0) return;
    /* Sin cargadores de repuesto no hay recarga; con el cargador
       lleno tampoco tiene sentido tirarlo. */
    if (arma.cargador >= f.cargador || arma.cargas <= 0) return;
    /* Dura lo que el Reload R del SWF, y el cargador entra -y suena-
       en su cuadro de reloadMe, no al empezar (disparo.js). */
    Disparo.recargar(a);
  };

  /* LA ESQUIVA DEL SWF (MadnessCharacter, el boton de guardia sin arma
     blanca y sin cobertura al lado). Ver Anim.esquivaSWF.

     - Cuesta 6 de TAC (myTactics - 6, sin bajar de 0): sin barra se
       puede esquivar igual.
     - La variante sale de la destreza (applyStats): DEX >= 25 perkDodge3
       -> flip, >= 15 perkDodge2 -> max, y si no -o con un arma pesada,
       amHeavy- clumsy: se tira al suelo. El jugador de nivel 1 tiene
       DEX 0: clumsy.
     - 'Front' si va hacia donde mira (la mira fija el rumbo) y 'Back' si
       va al reves. Sin tocar el stick se tira hacia atras.
     - Sale a mySpeed x 1,2 en la direccion del stick, y si eso da menos
       de 6 px por cuadro, a 5,5 (el jugador especial: 4,8 x 1,2 = 5,76
       -> 5,5). Desde el cuadro 'freno' la velocidad se multiplica por
       0,89 cada cuadro y se para por debajo de 1. 'empuje' (applySpeed)
       la pone a v px por cuadro hacia donde mira: es el empujon con el
       que se levanta.
     - Invulnerable (amDodging) desde que empieza hasta el cuadro 'libre'.
     Todo en px del SWF por cuadro de 30 fps, a metros con K y la escala
     del muñeco: 1 px/cuadro = 0,0164 x 30 m/s (K, la de las piezas). */
  const PX_S = Weapons.PX * 30;
  Player.esquivar = function (a) {
    if (!a.vivo || a.esquiva > 0 || a.aturdido > 0 || Anim.ocupado(a.anim)) return;
    const fx = Math.cos(a.rumbo), fz = Math.sin(a.rumbo);
    let ex = a.mover, ez = a.moverZ || 0;
    const mag = Math.hypot(ex, ez);
    if (mag > 0.15) { ex /= mag; ez /= mag; } else { ex = -fx; ez = -fz; }
    /* La variante, por perk como en el bytecode (34905..34986):
       perkDodge3 (DEX 25) flip, perkDodge2 (DEX 15) max, si no clumsy. */
    const tipo = a.arma.ficha.pesada ? 'clumsy'
      : Progreso.perk(a, 'perkDodge3') ? 'flip' : Progreso.perk(a, 'perkDodge2') ? 'max' : 'clumsy';
    const nombre = tipo + (ex * fx + ez * fz >= 0 ? 'Front' : 'Back');
    if (!Anim.esquivaSWF(a.anim, nombre, fx, fz)) return;
    const g = ESQUIVAS_SWF[nombre];
    a.esqG = g; a.esqCuadro = 0;
    a.esquiva = g.cuadros / 30;
    const libre = g.eventos.find((e) => e[1] === 'libre');
    a.invulnerable = (libre ? libre[0] : g.cuadros) / 30;
    a.tac = Math.max(0, (a.tac || 0) - 6);
    /* mySpeed x 1,2, y si da menos de 6 px por cuadro, 5,5. El mySpeed
       del jugador es 4,8 x modSpeed (resetStats): con DEX 0 da 5,76 ->
       5,5; desde DEX 2 (modSpeed 1,044) sale a 4,8 x modSpeed x 1,2. */
    const v0 = 4.8 * (a.modSpeed || 1) * 1.2;
    const v = v0 < 6 ? 5.5 : v0;                   // px por cuadro
    a.esqVx = ex * v; a.esqVz = ez * v;
    a.esqFreno = false;
    a.pendiente = false; a.golpeEnCola = false;
  };

  /* EL myGameSpeed DEL JUGADOR (determineGameSpeed, 125142..126351).
     El del mundo es 1, y 0 en bullet time; encima, lo que suman los
     perks segun lo que este haciendo:
       - en bullet time dando un golpe (myStatus 'melee...' o
         'unarmed...'): +1 con perkBulletTime2;
       - golpe SIN ARMA: +1 siempre con perkUnarmedSpeed3; si no, +1
         en los ultimos 8 cuadros del golpe con perkUnarmedSpeed2, o en
         los ultimos 4 con perkUnarmedSpeed1, si se mantiene el ataque
         (mouseHold: aqui, el golpe pedido en cola);
       - en bullet time sin golpear (idle, run, dash, dodge): +1 con
         perkBulletTime1 o perkBulletTime4.
     Las animaciones avanzan gs + 1 cuadros por tic (el normal son 2), y
     el desplazamiento va por slowmoSpeedMod = 0,4 + 0,6 x gs, +0,3 en
     bullet time con perkBulletTime4. Y +1 cambiando de arma ('swap') con perkReload1. */
  const PK = (a, n) => Progreso.perk(a, n);
  Player.gs = function (a) {
    let gs = a.bulletTime ? 0 : 1;
    // cambiando de arma con perkReload1: +1 (125166..125235)
    if (a.man && a.man.nombre === 'swap' && PK(a, 'perkReload1')) gs++;
    const acc = (a.anim && a.anim.accion) || '';
    const golpe = /^swf_(melee|unarmed)/.test(acc);
    if (a.bulletTime && golpe && PK(a, 'perkBulletTime2')) gs++;
    if (a.arma && a.arma.id === 'puños' && /^swf_unarmed/.test(acc)) {
      const g = Anim.ACCIONES[acc], filas = g && g.swf ? g.swf.filas.length : 0;
      const quedan = filas - a.anim.t * 30;
      if (PK(a, 'perkUnarmedSpeed3')) gs++;
      else if (PK(a, 'perkUnarmedSpeed2') && quedan <= 8 && a.golpeEnCola) gs++;
      else if (PK(a, 'perkUnarmedSpeed1') && quedan <= 4 && a.golpeEnCola) gs++;
    }
    if (a.bulletTime && !golpe && !(a.aturdido > 0) && (PK(a, 'perkBulletTime1') || PK(a, 'perkBulletTime4'))) gs++;
    return gs;
  };
  Player.kMov = function (a, gs) {
    const mod = 0.4 + 0.6 * gs + (a.bulletTime && PK(a, 'perkBulletTime4') ? 0.3 : 0);
    return mod / ((gs + 1) / 2);
  };

  Player.SLOWMO_MAX = 400;    // mySlowMoMax (applyStats)
  /* toggleSlowmo: el mismo boton prende y apaga. Solo se prende con
     barra y quieto, andando, bloqueando o en carrera; no a mitad de un
     golpe, rodando ni aturdido (el original lo mira en myStatus). */
  Player.bulletTime = function (a) {
    if (a.bulletTime) { a.bulletTime = false; return false; }
    if (a.slowMo <= 0 || !a.vivo || a.aturdido > 0 || a.esquiva > 0 || Anim.ocupado(a.anim)) return false;
    a.bulletTime = true;
    return true;
  };

  /* =============================================================
     PASO
     ============================================================= */
  Player.actualizar = function (a, dt, t, objetivos, entrada) {
    if (!a.vivo) { Actor.actualizar(a, dt, t); return; }

    /* SALIENDO POR LA PUERTA NO SE JUEGA.

       La entrada se descarta entera mientras el jugador cruza el
       vano. Antes no: se le podia mandar de lado con el stick con
       medio cuerpo todavia dentro de la puerta, y la entrada -que
       dura medio segundo- se quedaba a medias, con el muñeco
       andando de frente y de costado a la vez.

       Tampoco se le limpian los temporizadores aqui: la entrada no
       es una animacion suya, es un sitio del que tiene que salir, y
       de moverlo se encarga Actor.actualizar. */
    if (Actor.enVano(a)) {
      a.mover = 0; a.moverZ = 0; a.corriendo = false; a.apuntando = false;
      a.forzarVx = null; a.vx = 0; a.vz = 0;
      Actor.actualizar(a, dt, t);
      return;
    }

    a.ventana = Math.max(0, a.ventana - dt);
    a.tCombo = Math.max(0, a.tCombo - dt);
    if (a.tCombo <= 0 && a.combo > 0) a.combo = 0;

    /* La esquiva manda sobre todo lo demas mientras dura */
    if (a.esquiva > 0) {
      a.esquiva -= dt;
      /* Los eventos del sprite, cuadro a cuadro (Player.esquivar). */
      const g = a.esqG, fin = (g.cuadros / 30 - Math.max(0, a.esquiva)) * 30;
      for (const e of g.eventos) {
        if (e[0] <= a.esqCuadro || e[0] > fin) continue;
        if (e[1] === 'freno') a.esqFreno = e[2];
        else if (e[1] === 'empuje') {
          // applySpeed: solo la componente hacia donde mira (mySpeedRight)
          const fx = Math.cos(a.rumbo), fz = Math.sin(a.rumbo), v = e[2];
          const p = a.esqVx * fx + a.esqVz * fz;
          a.esqVx += (v - p) * fx; a.esqVz += (v - p) * fz;
        } else if (e[1] === 'suelo') Sonido.tocar('caida', { x: a.x, cam: Game.camX });
      }
      a.esqCuadro = fin;
      if (a.esqFreno) {
        const k = Math.pow(0.89, dt * 30);
        a.esqVx *= k; a.esqVz *= k;
        if (Math.hypot(a.esqVx, a.esqVz) < 1) { a.esqVx = 0; a.esqVz = 0; }
      }
      a.forzarVx = a.esqVx * PX_S;
      a.forzarVz = a.esqVz * PX_S;
      a.mover = 0; a.moverZ = 0;
      a.apuntando = false;
      a.rumboObj = a.rumbo;              // el rumbo no se mueve mientras esquiva
    } else if (a.irA) {
      /* attractToMC: va solo hasta el arma, sin hacer caso a los mandos
         (targetLock) */
      a.forzarVx = null; a.forzarVz = null; a.apuntando = false;
      Actor.pasoIrA(a, dt);
    } else if (a.man) {
      /* recoger, cambiar o lanzar: sin control, el rumbo quieto */
      a.forzarVx = null; a.forzarVz = null;
      a.mover = 0; a.moverZ = 0; a.corriendo = false; a.apuntando = false;
      a.rumboObj = a.rumbo;
    } else if (Actor.fuera(a)) {
      /* Derribado o en stun_dash: la velocidad la pone Actor (pasoFuera) y
         el cuerpo no gira hacia la mira mientras esta en el suelo. */
      a.mover = 0; a.moverZ = 0; a.corriendo = false;
      a.apuntando = false;
      a.rumboObj = a.rumbo;
    } else {
      a.forzarVx = null; a.forzarVz = null;
      a.mover = entrada.mover;
      a.moverZ = entrada.moverZ || 0;
      a.corriendo = entrada.correr;
      /* cruzando una puerta (guion) no se apunta: se anda hacia donde
         se va, no de espaldas mirando a la mira */
      a.apuntando = a.arma.ficha.tipo === 'fuego' && !a.guion;
      if (entrada.salto) a.salto = Actor.SALTO_COLCHON;
    }

    /* ---------------- APUNTAR ----------------

       Todo esto lo lleva ahora mira.js. Aqui habia un bucle cerrado
       -el lado salia del angulo y el angulo salia del lado- y un
       acumulador de elevacion que no volvia nunca a cero, que es lo
       que dejaba las armas de fuego apuntando al cielo para siempre.

       Con una mira en el mundo no hay nada que acumular: el lado
       sale de a que lado del cuerpo esta la mira, y el angulo, de la
       boca del arma a la mira. */
    if (a.apuntando) Mira.apuntar(a);

    /* ESPRINTANDO SE MIRA A DONDE SE CORRE, Y SE DISPARA A LA MIRA.

       Es el 'dash' de MadnessCharacter: el cuerpo encara la carrera
       -myFacing sale de la velocidad- y el arma sigue a la mira; si
       la mira queda detras, 'dash_turn' gira la cabeza y las dos manos
       hacia atras sin girar el cuerpo, y se sigue disparando (el SWF
       deja disparar en idle, run, backtrack, dash, cover y tactics).
       Andando no: con la mira detras es 'backtrack', de espaldas y
       encarando al blanco, que es lo que ya hace apuntar.

       En 3D el giro no es un espejo sino un angulo: el de la mira
       respecto del cuerpo, que el animador aplica a manos, arma y
       cabeza (ver 'giroTiro' en anim.js). */
    a.tiroGirado = false;
    if (a.apuntando && a.corriendo) {
      const mx = entrada.mover || 0, mz = entrada.moverZ || 0;
      if (Math.hypot(mx, mz) > 0.3) {
        a.rumboObj = Math.atan2(mz, mx);
        a.tiroGirado = true;
        a.yawTiro = Mira.yaw;
      }
    }

    /* =============================================================
       CON ARMA BLANCA, MIRARLE A LA CARA

       Con un arma de fuego el cuerpo ya se orienta solo: 'apuntando'
       lo lleva al eje de la pelea, que es por donde va la bala. Con
       un bate no hay bala ni linea de punteria, asi que lo unico
       que le dice al jugador a quien va a alcanzar es hacia donde
       esta MIRANDO su muñeco. Si el cuerpo va siempre a donde
       apunta el stick, el golpe sale hacia un lado y el enemigo
       esta en otro.

       Pero tampoco puede mirarle siempre, porque entonces se acabo
       el rumbo libre: correr por la habitacion quedaria como
       arrastrar los pies sin despegar la vista del enemigo. Asi que
       manda el enganche solo cuando de verdad importa:

         - mientras dura el golpe, que es cuando hay que acertar;
         - y estando quieto, que es cuando el jugador esta
           midiendo la distancia y quiere ver a quien encara.

       Corriendo manda el paso, que es lo que se ve en el video: el
       cuerpo va con la carrera y se planta encarando al llegar. */
    const bl = Mira.blanco;
    /* Esquivando NO: el rumbo se queda quieto toda la esquiva (el eje de
       la caida se fija al empezar). Con un blanco fijado, esto lo giraba
       hacia el mientras estaba tumbado y el muñeco se retorcia: la cabeza
       acababa mirando a camara y las manos fuera de sitio. */
    if (!a.apuntando && !(a.esquiva > 0) && !Actor.fuera(a) && bl && bl.vivo && bl.actor !== a) {
      const quieto = Math.hypot(a.vx, a.vz || 0) < 1.2;
      if (quieto || a.pendiente || Anim.ocupado(a.anim))
        a.rumboObj = Math.atan2((bl.z || 0) - (a.z || 0), bl.x - a.x);
    }

    /* El impacto del melee cae en el instante marcado por la
       accion, no al final: eso es lo que hace que el golpe se
       sienta conectado con el boton. */
    const imp = a.pendiente && Anim.tocaImpacto(a.anim, dt);
    if (imp) {
      if (imp.ultimo) a.pendiente = false;
      Player.melee(a, objetivos, imp);
      a.ventana = 0.34;        // aqui se abre la ventana de cadena
    }
    // el golpe pedido a mitad del anterior sale al acabar este
    if (a.golpeEnCola && !Anim.ocupado(a.anim) && Golpes.usa(a.arma.ficha)) {
      a.golpeEnCola = false;
      if (Golpes.lanzar(a)) a.pendiente = true;
    }

    Actor.actualizar(a, dt, t);
  };

  const HUESO_SIN_ARMA = { manoD: 1, manoI: 1, pie: 1 };
  // el arma de los puñetazos de la mano libre: el daño va con fuerza/3
  const PUNOS = { id: 'puños', get ficha() { return Weapons.CAT['puños']; } };
  Player.melee = function (a, objetivos, imp) {
    /* En los combos del SWF hay golpes con la MANO LIBRE (checkMeleeHit
       'unarmed'): pegan desde esa mano y con lo de un puñetazo. */
    const libre = imp && imp.tipo === 'unarmed';
    const swf = !!(imp && imp.t !== undefined);
    /* Y los golpes sin arma del SWF pegan con la mano o el pie que
       marca el golpe (manoD, manoI, pie), con el daño de su estilo. */
    const aMano = !!(imp && HUESO_SIN_ARMA[imp.tipo]);
    const f = libre ? Weapons.CAT['puños'] : a.arma.ficha;
    /* DONDE GOLPEA, de verdad.

       Estaba puesto a ojo -un punto fijo delante del cuerpo, a media
       altura-, asi que la zona de impacto no tenia nada que ver con
       donde estaba el arma: un machacon de arriba abajo pegaba a la
       misma altura que un reves. Ahora, si hay arma, se pregunta
       donde ha quedado su PUNTA en este fotograma y la caja se pone
       ahi. */
    const pt = libre || aMano ? Actor.puntoGolpe(a, imp.tipo) : Actor.puntaArma(a);
    const av = f.alcance * 0.72;
    const px = pt ? pt.x : a.x + Math.cos(a.rumbo) * av;
    const py = pt ? pt.y : a.y + a.alto * 0.55;
    const pz = pt ? pt.z : (a.z || 0) + Math.sin(a.rumbo) * av;
    let toco = false;
    for (let i = 0; i < objetivos.length; i++) {
      const o = objetivos[i];
      if (!o.vivo || o.actor === a || o.actor.bando === a.bando) continue;
    /* EL ALCANCE ES UN DISCO, NO UNA CALLE.

       Estaba en dos trozos: se descartaba a quien tuviera mas de
       0,85 m de diferencia en z -"la misma calle"- y luego se
       median cajas por x. Eso valia cuando todo el mundo miraba a
       izquierda o derecha, pero ahora el cuerpo gira libre y el
       arma tambien: un bate que llega a 1,5 m apuntando al fondo
       cae fuera de la calle y no tocaba a nadie, asi que el que
       tenias justo delante era inmune y el enemigo se quedaba
       dando mandobles al aire.

       Ahora se mide donde de verdad cae la punta del arma -que ya
       viene en las tres coordenadas del mundo, con el giro del
       cuerpo incluido- y se comprueba la distancia EN PLANTA a un
       disco. Un radio es lo mismo en todas las direcciones, que es
       exactamente lo que se quiere de un arma que puede apuntar a
       cualquier sitio. La altura sigue aparte: por arriba y por
       abajo un golpe no llega igual que de lado. */
      if (((pt && Actor.barrePuno(a, pt, o)) || (!aMano && Math.hypot(o.x - px, (o.z || 0) - pz) < f.alcance * 0.60 + o.r)) &&
          Math.abs(o.y - py) < a.alto * 0.75) {
        // con los golpes del SWF el daño es el del arma en cada golpe
        const remate = !swf && a.cadena === 0;   // el tercero ya rodo el contador
        const dano = (libre || aMano ? (a.danoPuno || f.dano) : f.dano) * (remate ? 1.9 : 1);
        /* El empujon sale por donde entro el golpe, tambien en
           profundidad: un mandoble de cara tiene que tirar al
           enemigo al fondo, no de lado. */
        const emp = f.empuje * (remate ? 2.2 : 1);
        const info = { arma: libre ? PUNOS : a.arma, enRango: true, sello: ++Actor.sello };
        const murio = o.golpear(dano, Math.cos(a.rumbo) * emp,
                                remate ? 3.4 : f.empuje * 0.3, px, py, a,
                                info, Math.sin(a.rumbo) * emp);
        Combat.impactoMelee(px, py, pz + 0.25, Math.cos(a.rumbo), dano, f.corta,
                            Math.sin(a.rumbo), info.bloqueado);
        Sonido.tocar(f.corta ? 'corte' : (f.sinMalla ? 'puno' : 'romo'),
                     { x: px, cam: Game.camX, vol: remate ? 1.15 : 1 });
        Actor.efectosGolpe(o.actor, a, f, info, murio);     // stun-dash y derribo
        // damageMelee (85924): el arma blanca se gasta con cada golpe que ENTRA
        if (!libre && !aMano && !info.bloqueado) Actor.desgastar(a, info.arma);
        a.combo++; a.tCombo = 2.2;
        if (murio) a.bajas++;
        toco = true;
        // un golpe alcanza a varios: en Madness se reparte
        if (!f.corta && !remate) break;
      }
    }
  };

  /* togglePickup (MadnessCharacter 32453..32809). Con la ranura vacia,
     el arma resaltada (Game.pickupJugador) o la mas cercana de la caja
     del jugador: va hasta ella y la recoge (Actor.irARecoger). Con algo
     en la mano, la lanza hacia la mira (hacia myAimX; sin mira, hacia
     donde mira). */
  /* COGER y TIRAR van en botones propios (en el SWF son el mismo,
     togglePickup: mano vacia recoge, mano llena lanza). COGER con algo en
     la mano y un arma resaltada deja la suya en el suelo (dropGun) y coge
     la otra: cambiar de arma del suelo sin tener que tirarla antes. */
  Player.recoger = function (a, sueltas) {
    if (!a.vivo || a.man || a.irA || Actor.fuera(a) || a.esquiva > 0 || Anim.ocupado(a.anim)) return false;
    const s = (Game.pickupJugador && Game.pickupJugador.alive) ? Game.pickupJugador
                                                                 : Actor.pickupCercano(a, sueltas, true);
    if (!s) return false;
    if (a.armas[a.ranura]) Actor.soltarArma(a);
    return Actor.irARecoger(a, s);
  };
  Player.tirar = function (a) {
    if (!a.vivo || a.man || a.irA || Actor.fuera(a) || a.esquiva > 0 || !a.armas[a.ranura]) return false;
    Actor.guardia(a, false);
    if (Anim.ocupado(a.anim)) return false;
    const r = Mira.viva ? Math.atan2((Mira.z || 0) - (a.z || 0), Mira.x - a.x) : a.rumbo;
    return Actor.lanzar(a, r);
  };

  global.Player = Player;
})(window);

