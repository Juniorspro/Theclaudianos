/* =============================================================
   ai.js -> Lo que piensan los que quieren matarte.

   Un enemigo de Madness no busca cobertura ni flanquea: va a por
   ti. Lo que cambia entre un grunt y un soldat no es la tactica,
   es el ATREVIMIENTO -a que distancia se planta- y la PACIENCIA
   -cuanto tarda en decidirse-. Con esos dos numeros y un arma,
   todo el bestiario se comporta distinto sin escribir una IA por
   faccion.

   PENSAR CUESTA, MOVERSE NO
   El movimiento se integra cada fotograma, pero la DECISION
   -acercarse, pegar, disparar, retroceder- solo se reevalua cada
   0,22 s, y ademas repartida entre enemigos para que no piensen
   todos en el mismo fotograma. Con veinte enemigos en pantalla
   eso son tres decisiones por fotograma en vez de veinte.

   Y hay un cupo de agresores: por muchos que haya, solo unos
   pocos atacan a la vez. Los demas rondan. Sin ese cupo, veinte
   enemigos rodean al jugador y lo matan en medio segundo sin que
   pueda hacer nada, que es injusto y ademas se ve fatal: en la
   serie los malos se turnan.
   ============================================================= */
(function (global) {
  'use strict';

  const AI = {};

  /* Caracter por faccion.
     osadia   a que distancia se planta a disparar
     empuje   cuanto le gusta el cuerpo a cuerpo
     melee    segundos entre golpes de cuerpo a cuerpo
     tiro     segundos entre disparos (o entre rafagas)
     puntería dispersion extra que se le suma al arma        */
  /* =============================================================
     EL CARACTER SALE DEL NIVEL, Y EL NIVEL SALE DEL SWF

     Esto estaba puesto a mano y por eso un grunt pegaba casi tan
     rapido como un elite: reflejo 0,34 contra 0,30, un 13% de
     diferencia. En el original la diferencia es de otro orden, y
     no es un numero suelto: sale de traitCombatSkill, que es la
     habilidad de combate del personaje.

     Desensamblado de __Packages.MadnessData, la tabla de unidades
     de la arena es esta:

       unidad              vida  vel  combatSkill
       civ / Grunt            8    5     1
       agent / Agent         12    6     3
       agent2 / Agent Mk1    18    6     5
       agent3 / Agent Mk0    25    6     9
       (Hank, el jugador)    80    6     8

     y en __Packages.MadnessAI esa habilidad decide DOS cosas, las
     dos con la misma forma -una tirada aleatoria por fotograma que
     tiene que salir cero-:

       cuerpo a cuerpo   randomNumber(0, (20 - skill) * 2)
       disparo           randomNumber(0, (15 - skill) * 9)

     O sea que la espera media en fotogramas es (20-skill)*2 y
     (15-skill)*9. A los 24 fotogramas por segundo del original:

       tipo     melee    disparo
       grunt    1,58 s   5,25 s
       agente   1,42 s   4,50 s
       soldat   1,25 s   3,75 s
       atp      0,92 s   2,25 s

     Un grunt tarda vez y media mas que un elite en soltar un golpe
     y mas del doble en decidirse a disparar. Eso es lo que hace
     que la oleada 1 sea la oleada 1.

     Y la punteria tambien: el error de apuntado esta recortado a
     (11 - combatSkill) * 3 GRADOS, que da 30 grados para un grunt
     y 6 para un elite. Aqui va en radianes porque es lo que usa
     Combat.disparar. ============================================= */
  const G = Math.PI / 180;
  AI.CARACTER = {
    /*            skill 1 */
    grunt:  { osadia: 5.5, empuje: 0.75, melee: 1.58, tiro: 5.25, punteria: 30 * G, vel: 0.83 },
    /*            skill 3 */
    agente: { osadia: 8.5, empuje: 0.35, melee: 1.42, tiro: 4.50, punteria: 24 * G, vel: 1.00 },
    /* agent_classic: la misma ficha que agent en el SWF */
    agenteClasico: { osadia: 8.5, empuje: 0.35, melee: 1.42, tiro: 4.50, punteria: 24 * G, vel: 1.00 },
    /*            skill 5 */
    soldat: { osadia: 7.0, empuje: 0.45, melee: 1.25, tiro: 3.75, punteria: 18 * G, vel: 1.00 },
    /*            skill 9 */
    agenteMk0: { osadia: 9.0, empuje: 0.35, melee: 0.92, tiro: 2.25, punteria: 6 * G, vel: 1.00 }
  };

  AI.MAX_AGRESORES = 3;

  /* EL LEAD DEL JUGADOR (MadnessAI.getModdedSkill, t178415 19765..20113):
     a los del equipo contrario al jugador se les resta floor(LEAD / 5)
     de cada rasgo -combatSkill incluido- y se recorta a 1..10. Es lo que
     la ficha llama Fearmonger ("decrease to the morale and reaction-time
     of opponents"). La tabla de arriba es la de cada skill; con otro
     skill se rehace con sus mismas cuentas: melee (20 - s) x 2 / 24,
     tiro (15 - s) x 9 / 24, punteria (11 - s) x 3 grados. Team Bonus
     (el mismo + LEAD/5 a los aliados) y el '+1 squadmate' no tienen a
     quien aplicarse: en esta Arena se pelea solo. */
  AI.SKILL = { grunt: 1, agente: 3, agenteClasico: 3, soldat: 5, agenteMk0: 9 };
  AI.caracter = function (tipo) {
    const base = AI.CARACTER[tipo] || AI.CARACTER.grunt;
    const s0 = AI.SKILL[tipo] || 1;
    const F = global.Progreso && Progreso.ficha;
    const lead = F ? F.statLEAD || 0 : 0;
    const s = Math.max(1, Math.min(10, s0 - Math.floor(lead / 5)));
    if (s === s0) return base;
    return Object.assign({}, base, {
      melee: (20 - s) * 2 / 24, tiro: (15 - s) * 9 / 24, punteria: (11 - s) * 3 * G
    });
  };

  AI.crear = function (actor) {
    const c = AI.caracter(actor.tipo);
    return {
      a: actor, c: c,
      apunta: -1,                 // aimTimer: -1 sin mira, >0 apuntando, 0 dispara
      pensar: U.rng() * 0.22,     // desfase inicial: no piensan a la vez
      intencion: 'acercarse',
      agresor: false,
      rondaLado: U.rng() < 0.5 ? 1 : -1,
      espera: 0,
      cadena: 0,                  // en que golpe de la cadena va
      finCadena: 0
    };
  };

  /* =============================================================
     PENSAR
     ============================================================= */
  function decidir(B, jug, huecos) {
    const a = B.a, c = B.c;
    /* LA DISTANCIA ES EN PLANTA, no en una linea.

       Era Math.abs(jug.x - a.x), que valia mientras todo el mundo
       estuviera clavado en la misma z. Ahora la arena es una
       habitacion: dos que estan en la misma x pueden tener cuatro
       metros de por medio, y con la distancia vieja el enemigo
       creia estar encima y se ponia a dar puñetazos al aire. */
    const d = jug.x - a.x;
    const dz = jug.z - a.z;
    const dist = Math.hypot(d, dz);
    const arma = a.arma.ficha;
    const cuerpoACuerpo = arma.tipo === 'melee';

    /* EL PICO, contra la distancia EN PLANTA.

       Era contra 'd', la diferencia de x, y con eso un enemigo
       justo delante o detras del jugador -misma x, cuatro metros de
       profundidad- apuntaba casi en vertical. El rumbo lo pone la
       maniobra; aqui solo se decide cuanto sube el cañon. */
    a.apunta = a.arma.ficha.tipo === 'fuego'
      ? Weapons.pico(a, jug.x, Actor.cruz(jug), jug.z || 0)
      : Math.atan2(Actor.cruz(jug) - (a.y + Chars.ALTO_PECHO * a.cuerpo.escala),
                   Math.max(0.3, dist));

    // el cupo de agresores: si no queda hueco, este ronda
    if (!B.agresor && huecos.n < AI.MAX_AGRESORES && dist < 12) {
      B.agresor = true; huecos.n++;
    }

    if (cuerpoACuerpo) {
      /* DONDE SE PARA A PEGAR, como en el SWF: a (myRange - 40 px) x
         azar(0,5..1) del blanco, sorteado de nuevo en cada golpe
         (B.distPegar). En el SWF es de centro a centro de dos torsos de 34
         px de ancho (la caja de 5300): en 3D se toma como el HUECO entre
         los dos cuerpos -esa distancia menos 34 px-, sin bajar de 5 cm
         para que no se metan uno en el otro. Antes se acercaba hasta el
         82 % del alcance y se quedaba pegado. */
      if (!B.distPegar) {
        const r = arma.rango || arma.alcance;
        const hueco = (r - 40 * Weapons.PX) * (0.5 + 0.5 * U.rng()) - 34 * Weapons.PX;
        // y nunca tan cerca que las cabezas se toquen (Golpes.distMinima)
        B.distPegar = Math.max(a.r + jug.r + Math.max(0.05, hueco), Golpes.distMinima * a.cuerpo.escala);
      }
      if (dist > B.distPegar + 0.15) {
        B.intencion = B.agresor ? 'acercarse' : 'rondar';
      } else {
        B.intencion = 'pegar';
      }
      return;
    }

    // con arma de fuego: plantarse a media distancia y tirar
    if (arma.cargador !== undefined && a.arma.cargador <= 0 && a.arma.recargando <= 0) {
      B.intencion = a.arma.cargas > 0 ? 'recargar' : 'tirarArma';
      return;
    }
    if (dist < 1.6) B.intencion = 'apartarse';
    else if (dist > c.osadia * 1.25) B.intencion = 'acercarse';
    else B.intencion = B.agresor ? 'disparar' : 'rondar';
  }

  /* =============================================================
     ACTUAR
     ============================================================= */
  /* EL ARMA DEL SUELO, COMO EN MadnessAI (t178415).

     traitDistracted de cada unidad (MadnessDataFile, 12492..14929): civ
     (el grunt) 8, agent 7, agent_classic 5, agent2 (soldat) 4, agent3
     (Mk0) 3; con el LEAD del jugador se le resta floor(LEAD/5) como a los
     demas rasgos (getModdedSkill, ver AI.caracter). */
  const DISTRAIDO = { grunt: 8, agente: 7, agenteClasico: 5, soldat: 4, agenteMk0: 3 };
  function distraido(a) {
    const F = global.Progreso && Progreso.ficha;
    const lead = F ? F.statLEAD || 0 : 0;
    return Math.max(1, Math.min(10, (DISTRAIDO[a.tipo] || 8) - Math.floor(lead / 5)));
  }
  // una tirada 'randomNumber(0, n) == 0' por cuadro, repartida en dt
  const tirada = (n, dt) => n <= 0 || Math.random() < 1 - Math.pow(1 - 1 / (n + 1), dt * 30);
  function manejoArmas(B, dt) {
    const a = B.a, o = a.armas[a.ranura];
    /* SIN BALAS NI CARGADORES (14616..14916): con randomNumber(0,
       traitDistracted x 4) == 0 la suelta (dropGun) y sigue a puños. */
    if (o) {
      if (Weapons.vacia(o) && !(a.arma.recargando > 0) && tirada(distraido(a) * 4, dt)) {
        Actor.soltarArma(a);
        B.intencion = 'acercarse';
      }
      return false;
    }
    /* A POR UN ARMA DEL SUELO (16500..17039): con la mano vacia (y la otra
       ranura vacia o sin nada que disparar), de nivel 5 para arriba y si
       sale randomNumber(0, traitDistracted x 3 - nivel) <= 0, busca la
       mas cercana en su caja (+-255 x +-235 px) y, si tiene balas o
       cargadores -las blancas siempre-, va a por ella. En la Arena eso
       son el soldat (agent2, nivel 5-7) y el Mk0 (agent3, 9-11): los
       grunts y los agentes no recogen nada. */
    const otra = a.armas[1 - a.ranura];
    if ((a.nivel || 0) < 5 || (otra && !Weapons.vacia(otra))) return false;
    if (!tirada(distraido(a) * 3 - (a.nivel || 0), dt)) return false;
    const s = Actor.pickupCercano(a, Game.sueltas.items, false);
    if (!s || Weapons.vacia(s.obj)) return false;
    Actor.irARecoger(a, s);
    return true;
  }

  /* LA GUARDIA DE LA IA (MadnessAI 9560..10684). La decision de subirla o
     bajarla no se toma cada cuadro: sale una tirada, randomNumber(0,
     (15 - skill) x 9) == 0 si el jugador pega con arma blanca o a puños,
     o randomNumber(0, (11 - skill) x 4) == 0 si lleva de fuego (y en sus
     primeros 15 cuadros de vida, siempre); mientras no sale, se queda
     como estaba. Cuando sale, la sube si lleva arma blanca, su skill
     (con el LEAD del jugador) pasa de 1 y el jugador le tiene a tiro de
     su arma, delante y mirandole; si no, la baja. Contra armas de fuego
     solo tendria sentido con perkBlock1, que las fichas de la Arena no
     llevan: no la sube. Los grunts (skill 1) nunca bloquean. */
  function guardiaIA(B, jug, dt) {
    const a = B.a, fa = a.arma.ficha;
    const s = Math.max(1, Math.min(10, (AI.SKILL[a.tipo] || 1) -
                       Math.floor(((global.Progreso && Progreso.ficha && Progreso.ficha.statLEAD) || 0) / 5)));
    const fj = jug.arma && jug.arma.ficha, blancaJ = !fj || fj.tipo === 'melee';
    a.vidaT = (a.vidaT || 0) + dt;
    if (a.vidaT * 30 >= 15 && !tirada(blancaJ ? (15 - s) * 9 : (11 - s) * 4, dt)) return;
    let sube = false;
    if (jug.vivo && fa.tipo === 'melee' && a.arma.id !== 'puños' && s > 1 && blancaJ) {
      const dx = a.x - jug.x, dz = (a.z || 0) - (jug.z || 0);
      const alcance = (fj && fj.rango) || 95 * Weapons.PX;
      const delante = dx * Math.cos(jug.rumbo) + dz * Math.sin(jug.rumbo);
      sube = Math.abs(dz) < 40 * Weapons.PX + 0.3 && delante > 0 && delante < alcance + a.r;
    }
    Actor.guardia(a, sube);
  }

  AI.actualizar = function (B, dt, jug, huecos, objetivos) {
    const a = B.a;
    if (!a.vivo) { if (B.agresor) { B.agresor = false; huecos.n--; } return; }

    /* Mientras cruza el vano no piensa. Lo unico que hace un grunt
       al salir de la puerta es salir de la puerta: si se le deja
       decidir ya, se pone a disparar desde dentro del hueco o se
       va de lado antes de haber salido. */
    if (Actor.enVano(a)) {
      a.mover = 0; a.moverZ = 0; a.corriendo = false;
      a.apuntando = false; a.vx = 0; a.vz = 0;
      return;
    }

    /* Derribado o aturdido por un golpe corriendo: ni piensa ni dispara
       hasta levantarse (el SWF no le deja accion en 'knockback' ni en
       'stun_dash'). */
    if (Actor.fuera(a)) { a.apuntando = false; return; }
    /* Recogiendo o lanzando (Actor.maniobra): sin accion. Yendo a por un
       arma (attractToMC): solo andar hasta ella. */
    if (a.man) { a.mover = 0; a.moverZ = 0; a.corriendo = false; a.apuntando = false; return; }
    if (a.irA) { a.apuntando = false; Actor.pasoIrA(a, dt); return; }
    if (manejoArmas(B, dt)) return;
    guardiaIA(B, jug, dt);

    B.pensar -= dt;
    if (B.pensar <= 0) {
      B.pensar = 0.22;
      decidir(B, jug, huecos);
    }

    B.espera = Math.max(0, B.espera - dt);
    const d = jug.x - a.x;
    const dz = jug.z - a.z;
    const dir = d >= 0 ? 1 : -1;
    const dist = Math.hypot(d, dz);
    /* El vector unitario hacia el jugador, y el perpendicular para
       rondar. Con esto, 'acercarse' es ir HACIA EL, no ir hacia su
       columna: antes un enemigo que salia de una puerta del fondo
       se pegaba a la pared y andaba de lado hasta ponerse a su
       altura, porque la unica direccion que conocia era la x. */
    const inv = dist > 0.001 ? 1 / dist : 0;
    let ux = inv ? d * inv : dir, uz = inv ? dz * inv : 0;
    /* RODEAR LOS BIDONES.

       El vector de arriba apunta al jugador en linea recta, y si hay
       un bidon en medio el enemigo se empotraba contra el: le
       empujaba el trasto, el volvia a empujar, y se quedaba
       temblando contra la chapa. Arena.rodear devuelve CUANTO hay
       que torcer el rumbo para pasarlo rozando, y aqui se gira el
       vector ese angulo. Torcer el rumbo avanza; sumar una
       perpendicular no -ver la nota larga en arena.js-. */
    const rod = Arena.rodear(a.x, a.z || 0, ux, uz, a.r, 1.7);
    if (rod) {
      const cs = Math.cos(rod), sn = Math.sin(rod);
      const nx = ux * cs - uz * sn;
      uz = ux * sn + uz * cs; ux = nx;
    }
    const c = B.c;

    a.corriendo = false;
    a.mover = 0;
    a.moverZ = 0;
    a.apuntando = a.arma.ficha.tipo === 'fuego';

    switch (B.intencion) {
      case 'acercarse': {
        /* Con arma blanca frena AL LLEGAR a su distancia de golpe
           (B.distPegar), sin esperar a la proxima decision: decide cada
           0,22 s y a paso de carrera se pasaba medio metro y acababa
           pegado al jugador. Los ultimos 0,5 m van frenando. */
        let k = 1;
        if (B.distPegar && a.arma.ficha.tipo === 'melee') {
          k = U.clamp((dist - B.distPegar) / 0.5, 0, 1);
          if (k <= 0) B.intencion = 'pegar';
        }
        a.mover = ux * c.vel * k;
        a.moverZ = uz * c.vel * k;
        a.corriendo = dist > 7;
        break;
      }

      case 'rondar': {
        /* Rondando se mira al jugador, no al lado por el que se
           camina. Un enemigo que gira en corro alrededor de ti
           mirando hacia donde pisa te da la espalda media vuelta;
           lo que hace cualquiera es rodearte SIN quitarte la vista
           de encima, y ahora el cuerpo puede hacerlo porque el
           rumbo es libre. */
        a.rumboObj = Math.atan2(dz, d);
        /* Rondar no es pasear: es mantenerse a tiro sin meterse.
           Los que rondan van y vienen alrededor de su distancia
           comoda, y eso hace que la arena PAREZCA llena de gente
           sin que todos se echen encima. */
        const comoda = c.osadia * 0.9;
        if (dist > comoda + 1.4) {
          a.mover = ux * c.vel * 0.6; a.moverZ = uz * c.vel * 0.6;
        } else if (dist < comoda - 1.4) {
          a.mover = -ux * c.vel * 0.6; a.moverZ = -uz * c.vel * 0.6;
        } else {
          /* Rondar es girar ALREDEDOR de el, no ir y venir por una
             raya: el paso va por la perpendicular. Es lo que hace
             que seis enemigos se repartan en corro en vez de
             ponerse en fila. */
          a.mover = -uz * B.rondaLado * 0.42;
          a.moverZ = ux * B.rondaLado * 0.42;
        }
        if (U.rng() < dt * 0.6) B.rondaLado *= -1;
        break;
      }

      case 'apartarse':
        a.mover = -ux * c.vel * 0.85;
        a.moverZ = -uz * c.vel * 0.85;
        break;

      case 'pegar':
        /* MIRARLE A EL, NO "A LA IZQUIERDA".

           Era 'a.mirando = dir' y punto: el enemigo se ponia de
           perfil al lado en el que estuvieras y pegaba por la X.
           Con la arena en dos dimensiones eso es pegarle al aire
           cuando el jugador esta en diagonal. El rumbo apunta al
           sitio donde esta de verdad, y como el animador escribe el
           alcance sobre ese mismo eje, el puño sale hacia el. El
           lado ya lo saca solo del rumbo, con histeresis, que es
           mas estable que el signo de la resta. */
        a.rumboObj = Math.atan2(dz, d);
        // demasiado encima: se retira hasta su distancia de golpe
        if (B.distPegar && dist < B.distPegar - 0.2 && !Anim.ocupado(a.anim)) {
          a.mover = -ux * c.vel * 0.5; a.moverZ = -uz * c.vel * 0.5;
        }
        // para pegar baja la guardia (el golpe cambia myStatus)
        if (B.espera <= 0 && a.bloqueando) Actor.guardia(a, false);
        if (B.espera <= 0 && !Anim.ocupado(a.anim)) {
          /* La cadena de tres. Si el tercero conecta, el enemigo
             se para un momento mas: en la serie, despues de un
             remate siempre hay una pausa, y esa pausa es la
             ventana del jugador para responder. */
          /* Los enemigos con arma tambien usan SUS golpes. */
          if (Golpes.usa(a.arma.ficha)) {
            // los golpes del SWF, con su nivel y su combo (golpes.js)
            if (Golpes.lanzar(a)) B.pendiente = true;
          } else {
            const golpes = a.arma.ficha.golpes || ['golpeA', 'golpeB', 'manotazo'];
            Anim.lanzar(a.anim, golpes[B.cadena % golpes.length]);
            B.pendiente = true;
          }
          B.cadena++;
          B.distPegar = 0;          // la proxima vez, otra distancia
          /* La espera entre golpes es la del original, y la del
             remate de la cadena vez y media: despues de un tercer
             golpe siempre hay pausa, y esa pausa es la ventana del
             jugador para responder. */
          B.espera = c.melee * (B.cadena % 3 === 0 ? 1.5 : 1);
          if (B.cadena % 3 === 0) B.cadena = 0;
        }
        break;

      case 'disparar':
        /* Desde que la bala viaja en el plano, esto es obligatorio:
           el rumbo del cuerpo ES la direccion del tiro. Con solo
           'mirando = dir' el enemigo disparaba por la X mientras el
           jugador estaba en diagonal, y no acertaba jamas. */
        a.rumboObj = Math.atan2(dz, d);
        a.mirando = dir;
        /* apuntando (aimTimer >= 0) no dispara: el tiro lo suelta
           AI.pasoMira al cerrarse la mira */
        if (B.apunta >= 0) break;
        if (B.espera <= 0) {
          /* LA TIRADA DE LA MIRA ES POR GATILLAZO, no por fotograma: en el
             SWF breakdownAttack la hace con mouseHold, y la IA solo pone
             mouseHold en el cuadro en que aprieta el gatillo (t178415
             14417..14427; se borra al empezar cada tick, 2140). Si sale,
             ese disparo no se hace: empieza a apuntar. */
          if (AI.intentarMira(B, jug)) { B.espera = c.tiro * 0.5; break; }
          AI.disparar(B, objetivos);
          /* Rafaga: el arma automatica sigue su cadencia y la
             espera del original solo cuenta entre rafagas. */
          B.espera = a.arma.ficha.auto ? c.tiro * 0.22 : c.tiro * 0.5;
        }
        break;

      case 'recargar':
        if (a.arma.recargando <= 0) Disparo.recargar(a);
        a.mover = -ux * 0.4; a.moverZ = -uz * 0.4;
        break;

      case 'tirarArma':
        /* sin balas y sin cargadores: la sigue llevando hasta que la
           suelta (manejoArmas, la tirada de dropGun) */
        a.mover = 0; a.moverZ = 0;
        break;
    }

    // el golpe conecta en el instante marcado por la accion
    const imp = B.pendiente && Anim.tocaImpacto(a.anim, dt);
    if (imp) {
      if (imp.ultimo) B.pendiente = false;
      AI.melee(B, objetivos, imp);
    }
  };

  AI.melee = function (B, objetivos, imp) {
    const a = B.a;
    // los puñetazos de la mano libre de los combos del SWF: ver Player.melee
    const libre = imp && imp.tipo === 'unarmed';
    const aMano = !!(imp && (imp.tipo === 'manoD' || imp.tipo === 'manoI' || imp.tipo === 'pie'));
    const f = libre ? Weapons.CAT['puños'] : a.arma.ficha;
    const dano = libre || aMano ? (a.danoPuno || f.dano) : f.dano;
    /* La zona de impacto sale de la PUNTA del arma, igual que la del
       jugador: ver Actor.puntaArma(). */
    const pt = libre || aMano ? Actor.puntoGolpe(a, imp.tipo) : Actor.puntaArma(a);
    const av = f.alcance * 0.75;
    const px = pt ? pt.x : a.x + Math.cos(a.rumbo) * av;
    const py = pt ? pt.y : a.y + a.alto * 0.55;
    const pz = pt ? pt.z : (a.z || 0) + Math.sin(a.rumbo) * av;
    for (let i = 0; i < objetivos.length; i++) {
      const o = objetivos[i];
      if (!o.vivo || o.actor === a) continue;
      if (o.actor.bando === a.bando) continue;
      /* El disco de alcance: ver la nota de Player.melee. */
      if (((pt && Actor.barrePuno(a, pt, o)) || (!aMano && Math.hypot(o.x - px, (o.z || 0) - pz) < f.alcance * 0.62 + o.r)) &&
          Math.abs(o.y - py) < a.alto * 0.7) {
        const info = { arma: libre ? { id: 'puños', ficha: f } : a.arma, enRango: true, sello: ++Actor.sello };
        const murio = o.golpear(dano, Math.cos(a.rumbo) * f.empuje, f.empuje * 0.25, px, py, a,
                                info, Math.sin(a.rumbo) * f.empuje);
        Actor.efectosGolpe(o.actor, a, f, info, murio);   // el derribo, tambien al jugador
        if (!libre && !aMano && !info.bloqueado) Actor.desgastar(a, info.arma);   // damageMelee
        Combat.impactoMelee(px, py, pz + 0.2, Math.cos(a.rumbo), dano, f.corta,
                            Math.sin(a.rumbo), info.bloqueado);
        Sonido.tocar(f.corta ? 'corte' : (f.sinMalla ? 'puno' : 'romo'),
                     { x: px, cam: Game.camX, vol: 0.85 });
        return;
      }
    }
  };

  const _boca = new THREE.Vector3();
  AI.disparar = function (B, objetivos, blanco) {
    const a = B.a, arma = a.arma, f = arma.ficha;
    if (arma.espera > 0 || arma.recargando > 0 || arma.cargador <= 0) return false;
    arma.cargador--;
    arma.espera = f.cadencia;
    // la bala nace en la boca de la malla que se ve (disparo.js)
    const pb = Disparo.boca(a, _boca) || Weapons.puntoBoca(a, a.apunta || 0);
    const ox = pb.x, oy = pb.y, oz = pb.z;
    if (blanco) {
      /* EL TIRO DE LA MIRA (aimTimer en 0): al pecho del jugador, sin
         error de punteria ni dispersion, y 'apuntado', que la TAC no
         para (82278 y 85374: la barra solo cuenta con aimTimer == -1). */
      const tx = blanco.x - ox, tz = (blanco.z || 0) - oz;
      const ty = (blanco.y || 0) + Chars.ALTO_PECHO * ((blanco.cuerpo && blanco.cuerpo.escala) || 1) - oy;
      Combat.disparar(ox, oy, oz, Math.atan2(tz, tx), Math.atan2(ty, Math.hypot(tx, tz)),
                      arma, objetivos, a, true, false, true);
      Sonido.tocar(Sonido.arma(f), { x: a.x, cam: Game.camX, vol: 0.9 });
      Anim.retroceso(a.anim, f.retro * 0.8);
      return true;
    }
    /* La mala punteria del enemigo se suma a la del arma, y ahora en
       las dos: el error de pico es la mitad del de rumbo, igual que
       la dispersion del arma. Todo el error en el pico dejaba a los
       enemigos tirando al suelo y al techo. */
    const err = (U.rng() - 0.5) * B.c.punteria * 2;
    Combat.disparar(ox, oy, oz, a.rumbo + err, a.apunta + err * 0.5,
                    arma, objetivos, a);
    Sonido.tocar(Sonido.arma(f), { x: a.x, cam: Game.camX, vol: 0.8 });
    Anim.retroceso(a.anim, f.retro * 0.8);
    return true;
  };

  /* =============================================================
     LA MIRA DE LOS ENEMIGOS (aimTimer, MadnessCharacter 46513..47705)

     Un enemigo con arma de fuego que tiene al jugador de blanco, sin
     recargar y con balas, tira en CADA GATILLAZO (el cuadro en que la IA
     pone mouseHold)

       randomNumber(0, (11 - traitCombatSkill) x |10 - myROF / 3|) == 0

     y si sale, y el jugador esta a menos de myRange x 2 (47025..47161),
     EMPIEZA A APUNTAR: aimTimer = 60 + 220 / (myLevel x 3) cuadros
     -4,4 s un grunt de nivel 1, 2,2 s uno de nivel 10-, sale la mira
     sobre el jugador (createAimReticle) y el que apunta destella en rojo
     (aimFlash). Solo uno a la vez: MadnessCharacter.aimingSprite. Mientras
     cuenta NO dispara (49138..49168); en 0 suelta UN tiro que la TAC no
     para (hitTactics solo con aimTimer == -1: 82278, 85374). Si el que
     apunta deja de estar parado, corriendo o esquivando (le pegan, lo
     tiran, recarga, se queda sin balas) la mira se cancela (47581..47704).
     Es lo que obliga a esquivar: la TAC no te salva de ese tiro.
     ============================================================= */
  AI.apuntador = null;
  AI.PX = 0.214 / 13.06;           // m por px del SWF (Weapons.PX)
  function skillDe(a) {
    const s0 = AI.SKILL[a.tipo] || 1, F = global.Progreso && Progreso.ficha;
    return Math.max(1, Math.min(10, s0 - Math.floor(((F && F.statLEAD) || 0) / 5)));
  }
  function puedeApuntar(a) {
    const ar = a.arma, f = ar && ar.ficha;
    return a.vivo && f && f.tipo === 'fuego' && ar.cargador > 0 && !(ar.recargando > 0) &&
           !a.man && !Actor.fuera(a) && !(a.aturdido > 0) && !a.anim.accion && (a.nivel || 0) > 0;
  }
  /* La tirada, en cada gatillazo del caso 'disparar'. true si apunta. */
  AI.intentarMira = function (B, jug) {
    const a = B.a;
    if (AI.apuntador || !jug || !jug.vivo || !puedeApuntar(a)) return false;
    const f = a.arma.ficha;
    const dPx = Math.hypot(jug.x - a.x, (jug.z || 0) - (a.z || 0)) / AI.PX;
    if (!(dPx < (f.rangoSWF || 110) * 2)) return false;
    const x = (11 - skillDe(a)) * Math.abs(10 - (f.rof || 18) / 3);
    /* randomNumber(0, x) == 0: uno de cada floor(x) + 1 gatillazos (un
       grunt con Beretta, ROF 18: x = 10 x 4 = 40, uno de cada 41) */
    if (U.rng() >= 1 / (Math.floor(x) + 1)) return false;
    B.apunta = B.apunta0 = 60 + 220 / (Math.max(1, a.nivel) * 3);
    B.destello = -15;
    AI.apuntador = B;
    Reticula.empezar(B, jug);
    return true;
  };
  function soltarMira(B) {
    B.apunta = -1;
    if (AI.apuntador === B) AI.apuntador = null;
    Reticula.acabar();
  }
  AI.soltarMira = soltarMira;
  /* Cada fotograma, una vez (game.js): la cuenta, el destello y el tiro. */
  AI.pasoMira = function (dt, jug, objetivos) {
    const B = AI.apuntador;
    if (B) {
      const a = B.a;
      if (!puedeApuntar(a) || !jug || !jug.vivo || Game.cerebros.indexOf(B) < 0) soltarMira(B);
      else {
        B.apunta = Math.max(0, B.apunta - dt * 30);
        if (B.apunta <= 0) {
          a.rumboObj = Math.atan2((jug.z || 0) - (a.z || 0), jug.x - a.x);
          if (AI.disparar(B, objetivos, jug)) soltarMira(B);
        }
      }
    }
    destellar(dt);
    Reticula.paso(dt, jug);
  };

  /* aimFlash (127005) + el paso de MadnessCharacter (25160..25635): el
     que apunta suma rojo a todo su dibujo -tinta incluida-, rb =
     290 - r5 x 40 sobre 255, en CUATRO pulsos de 20 cuadros: r5 sube de
     0 a 4 tres veces (aimFlashTimer de -15 a 0) y de 1 a 5 una cuarta;
     en el 6 se quita. Los materiales de los muñecos son compartidos:
     durante el destello el que apunta lleva unas copias con el rojo
     sumado al final del sombreado, y como solo apunta uno a la vez
     (aimingSprite) basta un uniforme para todos. */
  const U_ROJO = { value: 0 };
  const _rojos = new Map();
  function rojoDe(m) {
    let r = _rojos.get(m);
    if (!r) {
      r = m.clone();
      const antes = m.onBeforeCompile, clave = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
      r.onBeforeCompile = (sh, ren) => {
        if (antes) antes.call(m, sh, ren);
        sh.uniforms.uRojo = U_ROJO;
        const k = sh.fragmentShader.lastIndexOf('}');
        sh.fragmentShader = 'uniform float uRojo;\n' + sh.fragmentShader.slice(0, k) +
          '\tgl_FragColor.r = min( 1.0, gl_FragColor.r + uRojo );\n}' + sh.fragmentShader.slice(k + 1);
      };
      r.customProgramCacheKey = () => clave + '-rojo';
      _rojos.set(m, r);
    }
    return r;
  }
  let _tintado = null;
  function tintar(a, on) {
    if (on && _tintado !== a) {
      if (_tintado) tintar(_tintado, false);
      a.grupo.traverse((o) => {
        if (!o.isMesh || o.userData.matOrig) return;
        o.userData.matOrig = o.material;
        o.material = rojoDe(o.material);
      });
      _tintado = a;
    } else if (!on && _tintado === a) {
      a.grupo.traverse((o) => {
        if (o.isMesh && o.userData.matOrig) { o.material = o.userData.matOrig; o.userData.matOrig = null; }
      });
      _tintado = null;
    }
  }
  function destellar(dt) {
    const B = AI.apuntador;
    if (!B || B.destello === undefined || B.destello > 5) {
      if (_tintado) tintar(_tintado, false);
      return;
    }
    B.destello += dt * 30;
    const t = Math.floor(B.destello);
    if (t > 5) { tintar(B.a, false); return; }
    const r5 = t <= -11 ? t + 15 : t <= -6 ? t + 10 : t <= 0 ? t + 5 : t;
    U_ROJO.value = Math.max(0, 290 - r5 * 40) / 255;
    tintar(B.a, true);
  }
  AI.tintar = tintar;

  /* =============================================================
     LA RETICULA (aim_reticle 7945; createAimReticle, MadnessWorld
     24681..25838), con los dibujos del SWF (js/reticula_swf.js).

     Sobre el blanco, 40 px por encima de sus pies, siempre de cara a la
     camara. Los dos corchetes nacen a +-350 px y se cierran a
     bracketSpeed = 300 / aimTimer px por cuadro -llegan a +-50 justo al
     disparo- mientras el conjunto aparece a bracketSpeed % por cuadro.
     En la segunda mitad gira a rotSpeed = (aimStart/2) / aimTimer x 4,7
     grados por cuadro -cada vez mas rapido- y el aro aparece a ese
     mismo paso. Al acabar, rotSpeed = 30, los corchetes se abren al
     triple, el giro frena x0,7 y se apaga 10 % por cuadro.
     ============================================================= */
  const Reticula = AI.reticula = { g: null, on: false };
  function planoSWF(d, escala) {
    const tex = new THREE.TextureLoader().load(d.png);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(d.w * AI.PX * escala, d.h * AI.PX * escala);
    /* el origen del simbolo al (0, 0) del plano: ox, oy desde la esquina
       de arriba a la izquierda del dibujo (y hacia abajo) */
    geo.translate((d.w / 2 - d.ox) * AI.PX * escala, -(d.h / 2 - d.oy) * AI.PX * escala, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
    m.renderOrder = 95; m.frustumCulled = false;
    return m;
  }
  Reticula.crear = function (escena) {
    const D = global.RETICULA_SWF;
    if (!D || Reticula.g) return;
    const g = new THREE.Group(), giro = new THREE.Group();
    const c1 = planoSWF(D.corchete, 1), c2 = planoSWF(D.corchete, 1), aro = planoSWF(D.aro, 1);
    /* bracket1 (0, 1, -1, 0): girado 90 grados, arriba; bracket2
       (0, -1, 1, 0): -90, abajo. Flash va con la Y hacia abajo: su +90
       es nuestro -90. */
    c1.rotation.z = -Math.PI / 2; c2.rotation.z = Math.PI / 2;
    giro.add(c1, c2, aro); g.add(giro);
    g.visible = false;
    escena.add(g);
    Object.assign(Reticula, { g: g, giro: giro, c1: c1, c2: c2, aro: aro });
  };
  Reticula.empezar = function (B, jug) {
    if (!Reticula.g) Reticula.crear(Game.escena);
    if (!Reticula.g) return;
    Object.assign(Reticula, { on: true, fuera: false, B: B, blanco: jug, t0: B.apunta0,
      sep: 350, alfa: 0, aroA: 0, rot: 0, vrot: 0, vel: 300 / B.apunta0 });
    Reticula.g.visible = true;
  };
  Reticula.acabar = function () {
    if (!Reticula.on) return;
    Reticula.fuera = true; Reticula.vrot = 30;
  };
  const _qcam = new THREE.Quaternion();
  Reticula.paso = function (dt, jug) {
    const R = Reticula;
    if (!R.g || !R.on) return;
    const k = dt * 30;
    if (!R.fuera) {
      const B = R.B;
      R.alfa = Math.min(100, R.alfa + R.vel * k);
      R.sep = Math.max(50, R.sep - R.vel * k);
      if (B.apunta < R.t0 / 2) {
        R.vrot = (R.t0 / 2) / Math.max(1, B.apunta) * 4.7;
        R.rot += R.vrot * k;
        R.aroA = Math.min(100, R.aroA + R.vrot * k);
      }
    } else {
      R.sep += R.vel * 3 * k;
      R.vrot *= Math.pow(0.7, k);
      R.rot += R.vrot * k;
      R.alfa -= 10 * k;
      if (R.alfa <= 0) { R.on = false; R.g.visible = false; return; }
    }
    const b = R.blanco || jug;
    if (b) R.g.position.set(b.x, (b.y || 0) + 40 * AI.PX * ((b.cuerpo && b.cuerpo.escala) || 1), b.z || 0);
    if (Game.cam) R.g.quaternion.copy(Game.cam.quaternion);
    R.giro.rotation.z = -R.rot * Math.PI / 180;          // _rotation de Flash: a favor del reloj
    R.c1.position.y = R.sep * AI.PX; R.c2.position.y = -R.sep * AI.PX;
    R.c1.material.opacity = R.c2.material.opacity = Math.max(0, R.alfa) / 100;
    R.aro.material.opacity = Math.max(0, R.alfa) / 100 * R.aroA / 100;
  };

  global.AI = AI;
})(window);

