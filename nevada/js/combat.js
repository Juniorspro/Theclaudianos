/* =============================================================
   combat.js -> Balas, sangre y todo lo que salpica.

   TODO SALE DE UN DEPOSITO. Ni una sola bala, chispa o gota se
   crea durante la partida: al arrancar se reservan los maximos y
   luego se reciclan. El recolector de basura del movil no llega a
   despertarse, y eso evita los tirones de 40 ms que arruinan una
   pelea justo cuando mas importa.

   Las trazadoras y las manchas van en InstancedMesh: mil gotas de
   sangre pegadas a la pared son UNA llamada de dibujo. En un
   Adreno 610 esa es toda la diferencia entre una arena que se
   mancha de verdad y una que tiene que limpiarse cada oleada.

   Y el tiro es HITSCAN: la bala acierta o falla en el mismo
   fotograma en que se dispara, y lo que se ve volando es solo la
   estela. En un plano de pelea de cuarenta metros nadie nota la
   diferencia, y a cambio no hay que integrar proyectiles ni
   perseguir colisiones entre fotogramas.
   ============================================================= */
(function (global) {
  'use strict';

  const Combat = {};
  const C = Art.C;

  const MAX_TRAZOS = 48;
  const MAX_BALAS = 120;
  const G_BALA = 9.81;          // la caida de verdad, en m/s^2
  const MAX_GOTAS = 160;
  const MAX_MANCHAS = 90;
  const MAX_CHISPAS = 48, MAX_DESTELLOS = 8;

  const _v = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _s = new THREE.Vector3(1, 1, 1);
  const _eje = new THREE.Vector3();
  const EJE_X = new THREE.Vector3(1, 0, 0);
  const EJE_Z = new THREE.Vector3(0, 0, 1);
  const _q2 = new THREE.Quaternion();
  const OCULTO = new THREE.Matrix4().makeScale(0, 0, 0);

  Combat.init = function (escena) {
    Combat.escena = escena;
    Combat.sacudida = 0;
    Combat.congelar = 0;
    Combat.rng = U.makeRNG(0xb10ad);

    /* ---------------- Trazadoras ----------------
       Una raya fina y clara que va del cañon al impacto y se apaga
       en dos fotogramas. En la serie el disparo se ve, no se
       adivina. */
    const gTraz = new THREE.BoxGeometry(1, 1, 1);
    const mTraz = new THREE.MeshBasicMaterial({
      color: 0xfff2c8, transparent: true, opacity: 0.9, depthWrite: false
    });
    Combat.trazos = new THREE.InstancedMesh(gTraz, mTraz, MAX_TRAZOS);
    Combat.trazos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    Combat.trazos.frustumCulled = false;
    escena.add(Combat.trazos);
    Combat.poolTraz = new U.Pool(MAX_TRAZOS, () => ({ t: 0 }));

    /* ---------------- Balas ----------------
       Cada tiro es un objeto que vuela. Se dibuja con la misma
       malla instanciada que las trazadoras -un trazo corto, el que
       recorre en el fotograma- asi que no cuesta ni una llamada de
       dibujo mas. */
    Combat.balas = [];
    for (let k = 0; k < MAX_BALAS; k++) {
      Combat.balas.push({
        viva: false, x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0,
        vx: 0, vy: 0, vz: 0, dano: 0, empuje: 0, recorrido: 0,
        alcance: 0, restantes: 1, vida: 0, ficha: null,
        quien: null, victimas: null, info: null
      });
    }

    /* ---------------- Gotas ----------------
       Sangre en el aire. Vuelan con gravedad y al tocar el suelo o
       la pared dejan una mancha. */
    const gGota = new THREE.BoxGeometry(1, 1, 1);
    const mGota = new THREE.MeshBasicMaterial({ color: C.sangre });
    Combat.gotas = new THREE.InstancedMesh(gGota, mGota, MAX_GOTAS);
    Combat.gotas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    Combat.gotas.frustumCulled = false;
    escena.add(Combat.gotas);
    Combat.poolGotas = new U.Pool(MAX_GOTAS, () => ({
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, tam: 0.05
    }));

    /* ---------------- Manchas ----------------
       Lo que queda. No se borran nunca: al final de una oleada la
       arena tiene que dar asco, porque eso es la mitad del juego. */
    const gMan = new THREE.PlaneGeometry(1, 1);
    const mMan = new THREE.MeshBasicMaterial({
      map: Art.texSalpicadura(), color: C.sangreOsc,
      transparent: true, depthWrite: false
    });
    Combat.manchas = new THREE.InstancedMesh(gMan, mMan, MAX_MANCHAS);
    Combat.manchas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    Combat.manchas.frustumCulled = false;
    Combat.manchas.renderOrder = -3;
    escena.add(Combat.manchas);
    Combat.nMancha = 0;
    for (let i = 0; i < MAX_MANCHAS; i++) Combat.manchas.setMatrixAt(i, OCULTO);

    /* ---------------- Chispas de verdad ----------------
       Las de antes salian de las gotas de sangre y eran rojas. Estas son
       rayas amarillas aditivas en su propia malla instanciada (una sola
       llamada de dibujo para todas) y un destello en cruz en el punto de
       contacto. */
    const mChis = new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 1,
                                                blending: THREE.AdditiveBlending, depthWrite: false });
    Combat.rayas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mChis, MAX_CHISPAS);
    Combat.rayas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    Combat.rayas.frustumCulled = false;
    escena.add(Combat.rayas);
    Combat.poolChispas = new U.Pool(MAX_CHISPAS, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, t0: 1 }));
    const mDest = new THREE.MeshBasicMaterial({ map: texDestello(), color: 0xfff1b0, transparent: true,
                                                blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
    Combat.destellos = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mDest, MAX_DESTELLOS);
    Combat.destellos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    Combat.destellos.frustumCulled = false;
    Combat.destellos.renderOrder = 10;     // el destello, siempre encima: dura dos cuadros
    escena.add(Combat.destellos);
    Combat.poolDestellos = new U.Pool(MAX_DESTELLOS, () => ({ x: 0, y: 0, z: 0, t: 0, t0: 1, tam: 0.5, giro: 0 }));
    for (let i = 0; i < MAX_CHISPAS; i++) Combat.rayas.setMatrixAt(i, OCULTO);
    for (let i = 0; i < MAX_DESTELLOS; i++) Combat.destellos.setMatrixAt(i, OCULTO);

    return Combat;
  };

  /* El destello: una estrella de cuatro puntas con centro blanco, en un
     lienzo de 64 px (una vez, al arrancar). */
  function texDestello() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,230,140,.8)'); r.addColorStop(1, 'rgba(255,160,40,0)');
    g.fillStyle = r;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, l = i % 2 ? 9 : 31;
      g.lineTo(32 + Math.cos(a) * l, 32 + Math.sin(a) * l);
    }
    g.closePath(); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* EL CHISPAZO DE UNA PARADA (blockBullet / makeSparks, MadnessCharacter
     88050..89190): randomNumber(2, 5) chispas, cada una a 2..7 px/cuadro de
     lado (hacia donde vino el golpe: dx, dz) y 5..15 hacia arriba, con la
     gravedad de las particulas del SWF (2,8 px/cuadro²). A m/s: x30 x la
     escala de los personajes (0,214/13,06 m/px). Y un destello en el punto:
     el SWF lo marca cambiando la mano por 'Melee - Block2..6'; en 3D, a
     esta distancia, eso no se lee y el destello si. fuerte = el parry (el
     desarme de perkMeleeDisarm): el doble y mas grande. */
  const PXS = 30 * 0.214 / 13.06, G_CHIS = 2.8 * 900 * 0.214 / 13.06;
  Combat.chispazo = function (x, y, z, dx, dz, fuerte) {
    const L = Math.hypot(dx || 0, dz || 0) || 1, ux = (dx || 1) / L, uz = (dz || 0) / L;
    const n = (2 + Math.floor(Combat.rng() * 4)) * (fuerte ? 2 : 1);
    for (let i = 0; i < n; i++) {
      const c = Combat.poolChispas.take();
      const lado = (2 + Combat.rng() * 5) * PXS, arriba = (5 + Combat.rng() * 10) * PXS;
      const ab = (Combat.rng() - 0.5) * 1.6;          // abanico a los lados del golpe
      c.x = x; c.y = y; c.z = z;
      c.vx = (ux * Math.cos(ab) - uz * Math.sin(ab)) * lado;
      c.vz = (uz * Math.cos(ab) + ux * Math.sin(ab)) * lado;
      c.vy = arriba;
      c.t = c.t0 = 0.22 + Combat.rng() * 0.18;
    }
    const d = Combat.poolDestellos.take();
    d.x = x; d.y = y; d.z = z; d.t = d.t0 = fuerte ? 0.16 : 0.11; d.tam = fuerte ? 1.2 : 0.8; d.giro = Combat.rng() * Math.PI;
  };

  /* =============================================================
     DISPARAR
     origen y direccion en el mundo. victimas es la lista de
     objetivos: cada uno con {x, y, z, r, alto, vivo, golpear()}.
     ============================================================= */
  /* =============================================================
     DISPARAR EN LA HABITACION, NO POR UN CARRIL

     Esto era un trazado plano en X-Y -eje horizontal y altura- y la
     profundidad se arreglaba con un parche: se descartaba a quien
     no estuviera dentro de una "calle" de 0,75 m alrededor del
     tirador. Era honesto mientras el juego fuera un pasillo, pero
     con la arena convertida en habitacion y el cuerpo girando libre
     se rompe por los dos lados a la vez: el muñeco apunta en
     diagonal y la bala sale por la X, y de paso mata a quien
     comparte columna a cuatro metros.

     Ahora el disparo lleva DOS angulos, que es lo que hace falta y
     lo que ya se tenia sin usar:

       rumbo  hacia donde mira en planta, el mismo que gira el cuerpo
       pico   cuanto sube o baja, que es lo que antes era 'ang'

     y la direccion de la bala es la de un vector de verdad:

       dx = cos(pico) * cos(rumbo)
       dy = sen(pico)
       dz = cos(pico) * sen(rumbo)

     Con rumbo 0 sale (cos pico, sen pico, 0), o sea EXACTAMENTE el
     trazado viejo: el sistema anterior es el caso particular de
     este con el cuerpo mirando a la derecha, asi que no hay ni un
     numero de punteria que se mueva en la pelea de siempre.

     La dispersion va repartida: entera en el rumbo y la mitad en el
     pico. Un arma abre mas de lado que de alto -es el retroceso
     lateral y el pulso- y darle la misma apertura vertical hace que
     la escopeta tire perdigones al techo.
     ============================================================= */
  Combat.disparar = function (ox, oy, oz, rumbo, pico, arma, victimas, quien, apuntado, sinFuego, certero) {
    const f = arma.ficha;
    /* Los perks del que dispara (progreso.js): +1/+1 perdigon en
       escopeta y la dispersion quieto / el smgAimTimer. */
    const n = Progreso.perdigones(quien, f);
    /* 'certero': el disparo que cierra la mira de un enemigo (aimTimer
       en 0, ai.js). En el SWF el impacto se resuelve contra targetEnemy
       sin tirada: aqui, sin dispersion, directo al pecho. */
    const disp = certero ? 0 : f.disp * Progreso.kDisp(quien, f);

    /* Lo que la TAC del que lo reciba necesita saber: con que arma,
       si el tiro es de cerca, si iba apuntado, y un sello para que
       los perdigones de este gatillazo cuenten como UN disparo.
       Ver la explicacion larga en actor.js. El sello se saca aqui y
       viaja CON las balas: ahora los ocho perdigones de un
       escopetazo pueden llegar en fotogramas distintos, y sin un
       sello compartido cada uno mordería la barra por su cuenta. */
    const info = {
      arma: arma, apuntado: !!apuntado, enRango: true,
      sello: ++Actor.sello
    };
    const vel = f.vel || 110;

    for (let k = 0; k < n; k++) {
      /* Una bala suelta, al azar dentro de su dispersion, como el
         bulletRotation del SWF. Los perdigones, en ABANICO: cada uno
         en su franja de la apertura y al azar solo dentro de ella, y
         muy poco en vertical. Todos al azar se amontonaban a un lado
         un tiro y al otro el siguiente, y el disparo no se leia. */
      const ru = n > 1 ? rumbo + (((k + Combat.rng()) / n) * 2 - 1) * disp
                       : rumbo + (Combat.rng() - 0.5) * disp * 2;
      const pi = pico + (Combat.rng() - 0.5) * disp * (n > 1 ? 0.45 : 1);
      const cp = Math.cos(pi);
      const b = tomarBala();
      b.viva = true;
      b.x = b.px = ox; b.y = b.py = oy; b.z = b.pz = oz;
      b.vx = cp * Math.cos(ru) * vel;
      b.vy = Math.sin(pi) * vel;
      b.vz = cp * Math.sin(ru) * vel;
      b.dano = f.dano; b.empuje = f.empuje;
      b.alcance = f.alcance; b.recorrido = 0;
      b.restantes = (f.atraviesa || 0) + 1;
      b.vida = Math.min(2.5, f.alcance / vel + 0.2);
      b.ficha = f; b.quien = quien; b.victimas = victimas; b.info = info;
      /* Cuanto hay de rayo entre el tirador y la boca, medido sobre el
         propio rayo: desde ahi busca blancos el primer tramo. */
      b.atras = 0;
      if (quien && quien.x !== undefined) {
        const sh = (ox - quien.x) * Math.cos(ru) + (oz - (quien.z || 0)) * Math.sin(ru);
        if (sh > 0) b.atras = Math.min(2.5, sh / Math.max(0.3, cp));
      }
      /* "De cerca" es el myRange del arma: el original separa el
         ALCANCE -lo que vuela el plomo- del myRange -la distancia a
         la que trabaja bien-, y con este decide la media de daño, la
         TAC y la tirada de fuera de rango. myRange + modRange + los
         perks de rango, en px del SWF, a metros con Weapons.PX
         (Progreso.rangoPx). Antes era la mitad del vuelo -16 m con la
         Beretta, dos pantallas-: ningun tiro quedaba nunca fuera de
         rango y ni el AWR ni los perks de rango se notaban. */
      b.bueno = f.rangoSWF ? Progreso.rangoPx(quien, f) * Weapons.PX : f.alcance * 0.5;
    }

    /* El fogonazo, la vaina y la patada los pone el arma, con su
       animacion del SWF (disparo.js): salen de la boca y de la
       ventana de la malla que se ve, no de este punto. */
    if (quien && quien.anim && !sinFuego) Disparo.fuego(quien);   // sinFuego: la bala devuelta (perkBlock2)
    Combat.sacudida = Math.min(1.2, Combat.sacudida + (f.retro || 0.4) * 0.35);
    return true;
  };

  /* Un hueco del deposito. Si no queda ninguno se reutiliza la bala
     mas vieja: perder un trazo se ve menos que dejar de disparar. */
  function tomarBala() {
    let viejo = null;
    for (let k = 0; k < MAX_BALAS; k++) {
      const b = Combat.balas[k];
      if (!b.viva) return b;
      if (!viejo || b.vida < viejo.vida) viejo = b;
    }
    return viejo;
  }

  /* =============================================================
     EL VUELO

     Se integra con Euler y se comprueba el SEGMENTO que la bala ha
     recorrido en el fotograma, no el punto donde ha acabado. Es la
     diferencia entre un tiro que funciona y uno que atraviesa
     cuerpos: a 160 m/s la bala avanza 2,7 m por fotograma, o sea
     ocho veces el ancho de un personaje. Comprobando solo el punto
     final, el 88% de los impactos no existirian.

     Los blancos se ordenan por cercania para que una bala que
     atraviesa se coma primero al de delante.
     ============================================================= */
  const _tocados = [];
  Combat.pasoBalas = function (dt) {
    for (let k = 0; k < MAX_BALAS; k++) {
      const b = Combat.balas[k];
      if (!b.viva) continue;
      b.px = b.x; b.py = b.y; b.pz = b.z;
      b.vy -= G_BALA * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      const sx = b.x - b.px, sy = b.y - b.py, sz = b.z - b.pz;
      const paso = Math.hypot(sx, sy, sz);
      b.recorrido += paso;
      b.vida -= dt;
      if (paso < 1e-6) { if (b.vida <= 0) b.viva = false; continue; }
      const dx = sx / paso, dy = sy / paso, dz = sz / paso;

      /* El primer tramo se barre DESDE EL TIRADOR, no desde la boca:
         el cañon de una escopeta sale casi dos metros por delante de
         la mano, y un enemigo pegado quedaba entre el cuerpo y la
         boca, donde ningun perdigon lo buscaba -medido: 0 de 8 a dos
         metros-. Solo para los blancos; la pared se sigue buscando
         desde la boca y la trazadora sale de ella. */
      const a = b.atras || 0;
      b.atras = 0;
      const x0 = b.px - dx * a, y0 = b.py - dy * a, z0 = b.pz - dz * a, L = paso + a;
      _tocados.length = 0;
      const V = b.victimas;
      for (let i = 0; V && i < V.length; i++) {
        const v = V[i];
        if (!v.vivo || v === b.quien) continue;
        if (b.quien && v.actor && v.actor.bando === b.quien.bando) continue;
        const t = cortaCilindro(x0, y0, z0, dx, dy, dz,
                                v.x, v.y, v.z || 0, v.r, v.alto);
        if (t > 0 && t < L) _tocados.push({ t: t, v: v });
      }
      _tocados.sort((p, q) => p.t - q.t);

      let fin = paso, muere = false;
      for (let i = 0; i < _tocados.length && b.restantes > 0; i++) {
        const h = _tocados[i];
        fin = h.t - a; b.restantes--;
        const hx = x0 + dx * h.t, hy = y0 + dy * h.t, hz = z0 + dz * h.t;
        const dist = b.recorrido - paso + h.t - a;
        /* EL RANGO, COMO LO ESCRIBE EL SWF, A PROPOSITO. En el original la
           distancia con que se compara (r9, 74810) es un 'new Number()'
           que nadie reescribe -vale 0- y estas reglas nunca se cumplen;
           aqui se aplican tal como estan escritas: pasado el myRange el
           daño va x0,5 (inRangeGood, 61570), la TAC x0,9 (hitTactics) y un
           tiro no apuntado puede irse a la TAC aunque no haya barra
           (Progreso.desvia, 82252..82431). Decision de diseño. */
        b.info.enRango = dist <= b.bueno;
        b.info.excesoPx = (dist - b.bueno) / Weapons.PX;       // para Progreso.desvia
        b.info.cabeza = hy - (h.v.actor ? h.v.actor.y : 0) >= Actor.cabezaBaja(h.v.actor);
        h.v.golpear(b.dano, dx * b.empuje, dy * b.empuje * 0.4 + 1.0, hx, hy,
                    b.quien, b.info, dz * b.empuje);
        // si la TAC lo paro, esquivo: ni sangre (el agache ya se ve)
        if (!b.info.bloqueado) Combat.sangre(hx, hy, hz, dx, dy, dz, b.dano > 10 ? 12 : 7);
        if (b.restantes <= 0) { muere = true; break; }
      }

      if (!muere) {
        // ¿se estrella contra el decorado en este tramo?
        const d = chocaEscenario(b.px, b.py, b.pz, dx, dy, dz, paso);
        if (d < paso) {
          fin = d; muere = true;
          Combat.chispas(b.px + dx * d, b.py + dy * d, b.pz + dz * d);
          /* Una bala que no da a nadie tiene que sonar a algo: sin
             esto, fallar es silencio y no se sabe si el arma
             disparo. */
          Sonido.tocar('metal', { x: b.px + dx * d, cam: Game.camX, vol: 0.35 });
        }
      }
      if (b.recorrido >= b.alcance || b.vida <= 0) muere = true;
      if (muere) {
        b.viva = false;
        b.x = b.px + dx * fin; b.y = b.py + dy * fin; b.z = b.pz + dz * fin;
      }
    }
  };

  /* -------------------------------------------------------------
     CORTE DE LA BALA CONTRA EL CILINDRO DE UN PERSONAJE

     Un personaje es un cilindro VERTICAL: un circulo en el suelo de
     radio r y una altura. Asi que el corte se resuelve en dos
     cuentas independientes, que es lo que lo hace barato:

       1. En PLANTA, un rayo contra un circulo. El rayo se
          normaliza a su sombra en el suelo -de ahi 'hl', que es
          cos(pico)- para que la distancia que sale sea de verdad
          la del rayo y no la de su sombra. Sin esa division, un
          tiro inclinado hacia abajo mediria de menos y las balas
          atravesarian a la gente.
       2. Y a esa distancia, si la ALTURA cae dentro del cuerpo.

     Un tiro perfectamente vertical no tiene planta -hl = 0- y se
     descarta: en este juego nadie dispara al techo, y dividir por
     cero ahi era un NaN que se propagaba a todo el trazado.
     ------------------------------------------------------------- */
  function cortaCilindro(ox, oy, oz, dx, dy, dz, cx, cy, cz, r, alto) {
    const hl = Math.hypot(dx, dz);
    if (hl < 1e-6) return -1;
    const ux = dx / hl, uz = dz / hl;
    const px = cx - ox, pz = cz - oz;
    const proy = px * ux + pz * uz;
    if (proy < 0) return -1;
    const perp = Math.abs(px * uz - pz * ux);
    if (perp > r) return -1;
    const dentro = Math.sqrt(r * r - perp * perp);
    const sombra = proy - dentro;
    if (sombra <= 0) return -1;
    const t = sombra / hl;
    // ¿el rayo pasa a la altura del cuerpo?
    const yImp = oy + dy * t;
    if (yImp < cy - alto * 0.5 || yImp > cy + alto * 0.5) return -1;
    return t;
  }

  /* Donde se estrella una bala que no da a nadie. Son cuatro planos
     -el suelo, las dos paredes de los extremos y la del fondo- y se
     coge el mas cercano. Hacia la camara no hay pared, asi que
     manda el alcance del arma. */
  function chocaEscenario(ox, oy, oz, dx, dy, dz, max) {
    let d = max;
    if (dy < -0.001) d = Math.min(d, (0.02 - oy) / dy);       // el suelo
    const lim = Arena.limite() + 1.2;
    if (dx > 0.001) d = Math.min(d, (Arena.CX + lim - ox) / dx);
    if (dx < -0.001) d = Math.min(d, (Arena.CX - lim - ox) / dx);
    if (dz < -0.001) d = Math.min(d, (Arena.FONDO + 0.1 - oz) / dz);
    return Math.max(0.1, d);
  }

  /* =============================================================
     EFECTOS
     ============================================================= */
  /* La trazadora de punta a punta ya no existe: la estela la pinta
     la propia bala, fotograma a fotograma, en Combat.actualizar.
     Se deja la funcion sin efecto por si algo la llama. */
  Combat.trazo = function () {};

  /* La salpicadura sale POR DONDE ENTRO el golpe, en las tres
     coordenadas. Antes la z era solo ruido, asi que un tiro hacia
     el fondo salpicaba hacia los lados. */
  Combat.sangre = function (x, y, z, dx, dy, dz, n) {
    /* SANGRE: NO en los ajustes es ninguna gota (y sin gotas no hay
       charcos: los pone la gota al caer). En calidad baja, la mitad
       (Game.CALIDADES.sangre): son instancias que se mueven cada cuadro. */
    if (!Game.sangreOn) return;
    n = Math.max(1, Math.round(n * (Game.CALIDADES[Game.calidad].sangre || 1)));
    const ez = dz === undefined ? 0 : dz;
    for (let i = 0; i < n; i++) {
      const g = Combat.poolGotas.take();
      g.x = x; g.y = y; g.z = z + (Combat.rng() - 0.5) * 0.2;
      const disp = 3.2 + Combat.rng() * 4.5;
      g.vx = dx * disp * (0.4 + Combat.rng()) + (Combat.rng() - 0.5) * 3;
      g.vy = dy * disp * 0.3 + 1.4 + Combat.rng() * 4.2;
      g.vz = ez * disp * (0.4 + Combat.rng()) + (Combat.rng() - 0.5) * 2.4;
      g.t = 1.2 + Combat.rng() * 0.6;
      g.tam = 0.035 + Combat.rng() * 0.055;
    }
  };

  /* chispas sueltas (una bala contra la pared, un arma que se agrieta):
     tres rayas, sin destello */
  Combat.chispas = function (x, y, z) {
    for (let i = 0; i < 3; i++) {
      const c = Combat.poolChispas.take();
      c.x = x; c.y = y; c.z = z;
      c.vx = (Combat.rng() - 0.5) * 5; c.vy = Combat.rng() * 4; c.vz = (Combat.rng() - 0.5) * 3;
      c.t = c.t0 = 0.18;
    }
  };

  /* Una mancha permanente. Cuando se acaban las plazas se
     sobreescribe la mas antigua: la arena no se limpia sola, pero
     tampoco crece sin freno. */
  Combat.mancha = function (x, y, z, plana) {
    if (!Game.sangreOn) return;
    const i = Combat.nMancha % MAX_MANCHAS;
    Combat.nMancha++;
    const s = 0.35 + Combat.rng() * 0.75;
    _e.set(plana ? -Math.PI / 2 : 0, 0, Combat.rng() * U.TAU);
    _q.setFromEuler(_e);
    _s.set(s, s, 1);
    _v.set(x, plana ? 0.013 + (i % 7) * 0.0012 : y, z);
    _m.compose(_v, _q, _s);
    Combat.manchas.setMatrixAt(i, _m);
    Combat.manchas.instanceMatrix.needsUpdate = true;
  };

  /* El chorro de una muerte: mucha sangre de golpe y una mancha
     grande justo debajo. */
  Combat.matanza = function (x, y, z, dx, dz) {
    Combat.sangre(x, y, z, dx, 0.3, dz || 0, 26);
    for (let i = 0; i < 4; i++) {
      Combat.mancha(x + (Combat.rng() - 0.5) * 1.4, 0, z + (Combat.rng() - 0.5) * 1.2, true);
    }
    Combat.sacudida = Math.min(1.6, Combat.sacudida + 0.5);
    Combat.congelar = Math.max(Combat.congelar, 0.055);
  };

  /* Impacto de melee: menos sangre, mas sacudida. El golpe que se
     siente no es el que salpica mas, es el que para la imagen. */
  Combat.impactoMelee = function (x, y, z, dx, dano, corta, dz, bloqueado) {
    if (!bloqueado) Combat.sangre(x, y, z, dx, 0.4, dz || 0, corta ? 14 : 6);
    Combat.sacudida = Math.min(1.4, Combat.sacudida + 0.28);
    Combat.congelar = Math.max(Combat.congelar, corta ? 0.05 : 0.035);
  };

  /* =============================================================
     ACTUALIZAR
     ============================================================= */
  Combat.actualizar = function (dt) {
    Combat.sacudida = Math.max(0, Combat.sacudida - dt * 3.4);

    /* --- las balas, y su estela ---
       El trazo es lo que la bala ha recorrido EN ESTE FOTOGRAMA, no
       una raya de punta a punta: lo que se ve es un destello corto
       que avanza, que es lo que se ve de verdad de una trazadora.

       Y la caja se orienta en las tres dimensiones. Estaba con un
       Euler de solo Z, que era una raya dentro del plano de la
       pantalla; desde que la bala puede irse al fondo o venir hacia
       la camara, eso la dejaba de canto. */
    Combat.pasoBalas(dt);
    let i = 0;
    for (let k = 0; k < MAX_BALAS && i < MAX_TRAZOS; k++) {
      const b = Combat.balas[k];
      if (!b.viva) continue;
      const dx = b.x - b.px, dy = b.y - b.py, dz = b.z - b.pz;
      const largo = Math.hypot(dx, dy, dz);
      if (largo < 1e-4) continue;
      _v.set(b.px + dx * 0.5, b.py + dy * 0.5, b.pz + dz * 0.5);
      _eje.set(dx / largo, dy / largo, dz / largo);
      _q.setFromUnitVectors(EJE_X, _eje);
      _s.set(Math.min(largo, 1.6), 0.035, 0.035);
      _m.compose(_v, _q, _s);
      Combat.trazos.setMatrixAt(i++, _m);
    }
    for (let k = i; k < MAX_TRAZOS; k++) Combat.trazos.setMatrixAt(k, OCULTO);
    Combat.trazos.instanceMatrix.needsUpdate = true;

    /* --- gotas --- */
    i = 0;
    Combat.poolGotas.forEach((g) => {
      g.t -= dt;
      g.vy -= 22 * dt;
      g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
      if (g.y <= 0.02 && !g.chispa) {
        Combat.mancha(g.x, 0, g.z, true);
        g.alive = false; return;
      }
      if (g.z <= Arena.FONDO + 0.3 && !g.chispa) {
        Combat.mancha(g.x, g.y, Arena.FONDO + 0.30, false);
        g.alive = false; return;
      }
      if (g.t <= 0 || g.y < -1) { g.alive = false; g.chispa = false; return; }
      _v.set(g.x, g.y, g.z);
      // la gota se estira en la direccion en que vuela: sin eso
      // parecen confeti
      const v = Math.hypot(g.vx, g.vy);
      _e.set(0, 0, Math.atan2(g.vy, g.vx));
      _q.setFromEuler(_e);
      _s.set(g.tam * (1 + v * 0.05), g.tam, g.tam);
      _m.compose(_v, _q, _s);
      Combat.gotas.setMatrixAt(i++, _m);
    });
    for (let k = i; k < MAX_GOTAS; k++) Combat.gotas.setMatrixAt(k, OCULTO);
    Combat.gotas.instanceMatrix.needsUpdate = true;

    /* --- chispas y destellos --- */
    i = 0;
    Combat.poolChispas.forEach((c) => {
      c.t -= dt;
      if (c.t <= 0 || c.y < 0) { c.alive = false; return; }
      c.vy -= G_CHIS * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      const v = Math.hypot(c.vx, c.vy, c.vz) || 1;
      _v.set(c.x, c.y, c.z);
      _eje.set(c.vx / v, c.vy / v, c.vz / v);
      _q.setFromUnitVectors(EJE_X, _eje);
      const k = c.t / c.t0;
      _s.set(0.07 + v * 0.03, 0.03 * k + 0.01, 0.03 * k + 0.01);
      _m.compose(_v, _q, _s);
      Combat.rayas.setMatrixAt(i++, _m);
    });
    for (let k = i; k < MAX_CHISPAS; k++) Combat.rayas.setMatrixAt(k, OCULTO);
    Combat.rayas.instanceMatrix.needsUpdate = true;
    i = 0;
    const cam = global.Game && Game.cam;
    Combat.poolDestellos.forEach((d) => {
      d.t -= dt;
      if (d.t <= 0) { d.alive = false; return; }
      const k = d.t / d.t0, e = d.tam * (0.5 + (1 - k) * 0.8) * k;
      _v.set(d.x, d.y, d.z);
      if (cam) _q.copy(cam.quaternion); else _q.identity();
      _q2.setFromAxisAngle(EJE_Z, d.giro);
      _q.multiply(_q2);
      _s.set(e, e, e);
      _m.compose(_v, _q, _s);
      Combat.destellos.setMatrixAt(i++, _m);
    });
    for (let k = i; k < MAX_DESTELLOS; k++) Combat.destellos.setMatrixAt(k, OCULTO);
    Combat.destellos.instanceMatrix.needsUpdate = true;
  };

  /* Al quitar la sangre en los ajustes, lo que ya habia tambien se va:
     las gotas en el aire y los charcos. */
  Combat.limpiarSangre = function () {
    if (!Combat.poolGotas) return;
    Combat.poolGotas.forEach((g) => { if (!g.chispa) g.alive = false; });
    Combat.limpiarManchas();
  };

  Combat.limpiarManchas = function () {
    for (let i = 0; i < MAX_MANCHAS; i++) Combat.manchas.setMatrixAt(i, OCULTO);
    Combat.manchas.instanceMatrix.needsUpdate = true;
    Combat.nMancha = 0;
  };

  global.Combat = Combat;
})(window);

