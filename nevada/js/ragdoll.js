/* =============================================================
   ragdoll.js -> Los cadaveres: ragdoll de CUERPOS RIGIDOS.

   Nada de poses ni de animacion: al morir, el muñeco pasa a un motor
   de fisica de verdad (cannon-es, vendor/cannon-es.min.js) y lo que se
   ve es lo que calcula el motor. Es el mismo esquema que un ragdoll de
   Unity, Unreal o Bullet:

     - CUERPOS RIGIDOS con masa, inercia y giro propio.
     - ARTICULACIONES cone-twist (rotula con limite de cono y de
       torsion): no llevan a ninguna pose, solo prohiben lo que el
       cuerpo no puede hacer.
     - COLISIONES con rozamiento entre todas las piezas: con el suelo,
       los bidones, las paredes, los otros cadaveres, las piezas del
       mismo cuerpo entre si y los vivos.
     - EL GOLPE es un impulso aplicado EN EL PUNTO donde pega: el giro
       y la caida salen solos de la fisica (un tiro alto en el pecho
       tumba hacia atras; uno en los pies, barre).

   =============================================================
   LAS PIEZAS DE ESTE MUÑECO
   =============================================================

   Un muñeco de Madness no tiene brazos, piernas ni cuello: un tronco
   con la cabeza encima, dos puños que flotan y dos botas que flotan.
   Cinco cuerpos rigidos, con las medidas de la malla (chars.js):

     tronco   caja de 0,26 x 0,435 x 0,235 de medio lado -el torso mide
              0,279 de medio ancho, de -0,098 a 0,85 sobre la pelvis y
              de -0,239 a 0,247 de fondo; la caja se queda 2 cm por
              dentro en ancho y 2,8 cm por arriba del bajo para no
              tocar puños y botas en reposo- mas una esfera de 0,35
              para la cabeza (ovoide de 0,333 x 0,392 x 0,327) en
              (0, 1,055, 0,152). Rigido: la cabeza no tiene cuello.
     puño     esfera de 0,10 (0,21 de ancho: 0,32 de la cabeza en el
              SWF). Colgado del hombro por una rotula a la distancia a
              la que estaba al morir: el "brazo" invisible. Cono de 75
              grados alrededor de su caida natural.
     bota     caja de 0,09 x 0,0775 x 0,1575 de medio lado (Chars.PIE:
              0,315 x 0,155 x 0,18). Rotula en el centro de su tapa de
              arriba, bajo el torso: gira sobre ese punto con un cono de
              70 grados y 30 de torsion. Con 35 las dos botas hacian de
              patas de mesa y un cadaver se quedo DE PIE junto a un
              bidon: un muerto no se sostiene, las rodillas se doblan.
              Lo que la bota no puede hacer -meterse en el torso- lo
              impide la colision con el, no el cono.

   Masas: tronco 40, puño 2,5, bota 3,5. Lo que pesa manda: el tronco
   arrastra a las piezas y las piezas apenas mueven el tronco.

   El presupuesto de dibujo no cambia: sigue siendo una malla con
   esqueleto; el motor solo mueve cinco huesos. En CPU, cinco cuerpos
   por cadaver y se duermen en cuanto paran.
   ============================================================= */
(function (global) {
  'use strict';

  const R = {};
  const C = global.CANNON;

  const GRAV = 21.0;          // la de siempre del juego: cae con peso
  const PASO = 1 / 60;
  /* Grupos de colision: lo fijo (suelo, paredes, bidones) y los vivos
     solo chocan con los cadaveres. Un vivo (cinematico) contra el suelo
     fijo seria un contacto entre dos masas infinitas: en el solver, una
     division por cero. */
  const G_FIJO = 1, G_CUERPO = 2, G_VIVO = 4;

  /* ---- medidas (unidades del modelo, respecto a la pelvis) ---- */
  const CAJA = { hx: 0.26, y0: -0.07, y1: 0.80, hz: 0.235, z: 0.004 };
  const CABEZA = { r: 0.35, y: 1.055, z: 0.152 };
  const PUNO_R = 0.10;
  const PIE = { hx: 0.09, hy: 0.0775, hz: 0.1575 };
  // el centro de la bota respecto a su hueso: de -0,171 a -0,016 en alto
  // y de -0,1355 a 0,1795 en largo (chars.js)
  const PIE_CENTRO = [0, -0.0935, 0.022];
  const HOMBRO = [0.17, 0.70, -0.02];
  const MASA = { tronco: 40, puno: 2.5, pie: 3.5 };
  const HOLGURA_PIE = 0.06;

  /* EL CENTRO DE MASAS DEL TRONCO. cannon gira cada cuerpo alrededor
     de su origen, asi que el origen tiene que ser el centro de masas:
     con el origen en la pelvis el tronco giraria como una puerta sobre
     su bisagra. Caja (34 kg, centro a 0,365) y cabeza (6 kg, a 1,055):
     y = (34 x 0,365 + 6 x 1,055) / 40 = 0,469; z = 6 x 0,152 / 40 = 0,023. */
  const CM = (() => {
    const yc = (CAJA.y0 + CAJA.y1) / 2;
    return [0, (34 * yc + 6 * CABEZA.y) / 40, (34 * CAJA.z + 6 * CABEZA.z) / 40];
  })();

  /* ---- el mundo ---- */
  let mundo = null, trastosDe = null, matCuerpo = null, matVivo = null;
  const ragdolls = [];       // los cadaveres en el motor, para dormir/despertar en bloque
  const vivos = [];          // un cilindro cinematico por personaje vivo

  function crearMundo() {
    mundo = new C.World({ gravity: new C.Vec3(0, -GRAV, 0), allowSleep: true });
    mundo.broadphase = new C.SAPBroadphase(mundo);
    /* 10 pasadas: con 14 el paso costaba 2 ms con diez cadaveres cayendo
       a la vez en un PC (unos 9 en el TCL 20SE); las penetraciones y el
       reposo medidos (tools/qa/ragdoll.js) no cambian con 10. */
    mundo.solver.iterations = 10;
    mundo.quatNormalizeFast = true;
    mundo.quatNormalizeSkip = 0;

    const matSuelo = new C.Material('suelo');
    matCuerpo = new C.Material('cuerpo');
    matVivo = new C.Material('vivo');
    /* Rozamientos: un cuerpo tumbado en el suelo se para, no patina
       (0,6); ropa contra ropa algo menos (0,5); y casi sin rebote: un
       cuerpo no bota. */
    mundo.addContactMaterial(new C.ContactMaterial(matSuelo, matCuerpo, { friction: 0.6, restitution: 0.05 }));
    mundo.addContactMaterial(new C.ContactMaterial(matCuerpo, matCuerpo, { friction: 0.5, restitution: 0.02 }));
    /* Contra el vivo que lo empuja, poco roce: el cadaver que choca
       descentrado resbala de costado y se aparta, en vez de ir pegado
       delante de el como una pala. */
    mundo.addContactMaterial(new C.ContactMaterial(matVivo, matCuerpo, { friction: 0.08, restitution: 0.0 }));

    const fijo = (forma, x, y, z, qx) => {
      const b = new C.Body({ mass: 0, material: matSuelo, type: C.Body.STATIC,
                             collisionFilterGroup: G_FIJO, collisionFilterMask: G_CUERPO });
      b.addShape(forma);
      b.position.set(x, y, z);
      if (qx) b.quaternion.setFromEuler(qx[0], qx[1], qx[2]);
      mundo.addBody(b);
      return b;
    };
    // suelo
    fijo(new C.Plane(), 0, 0, 0, [-Math.PI / 2, 0, 0]);
    // paredes: los extremos (donde acaba el suelo que se pisa, +0,35
    // como siempre), la del fondo y el tope de delante de la sala
    const lim = Arena.limite() + 0.35;
    fijo(new C.Plane(), -lim, 0, 0, [0, Math.PI / 2, 0]);
    fijo(new C.Plane(), lim, 0, 0, [0, -Math.PI / 2, 0]);
    fijo(new C.Plane(), 0, 0, Arena.FONDO, [0, 0, 0]);
    fijo(new C.Plane(), 0, 0, Arena.Z_FRENTE + 0.4, [0, Math.PI, 0]);
    // los bidones: cilindros de verdad, con su alto
    trastosDe = Arena.trastos;
    for (const t of Arena.trastos || []) {
      const h = t.h || 1.2;
      fijo(new C.Cylinder(t.r, t.r, h, 14), t.x, h / 2, t.z);
    }
  }
  function elMundo() {
    if (!mundo || trastosDe !== Arena.trastos) {
      crearMundo();
      ragdolls.length = 0; vivos.length = 0;
    }
    return mundo;
  }

  /* ---- ayudas ---- */
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qInv = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const aC = (v) => new C.Vec3(v.x, v.y, v.z);
  const aCq = (q) => new C.Quaternion(q.x, q.y, q.z, q.w);

  /* INERCIA DE LA PIEZA SEGUN SU PALANCA. Un puño es una esfera de
     0,10 con inercia 2/5 m r^2 = 0,01, colgada a 0,49 del hombro: para
     cumplir la rotula al solver le salia mas barato hacerla GIRAR que
     moverla, y los puños acababan girando a 20-37 rad/s (medido) sin
     parar ni dormirse. Es el error clasico de un ragdoll con piezas
     chicas en palanca larga, y se arregla como en los motores: la
     inercia de la pieza es la de una varilla de ese largo, m L^2 / 3
     (2,5 x 0,49^2 / 3 = 0,20). Para la bota, colgada de su tapa, dos
     veces la de su caja. */
  function inercia(b, I) {
    b.inertia.set(I, I, I);
    b.invInertia.set(1 / I, 1 / I, 1 / I);
    b.updateInertiaWorld(true);
  }

  function cuerpoRigido(masa, forma, pos, quat, extra) {
    const b = new C.Body({
      mass: masa, material: matCuerpo,
      collisionFilterGroup: G_CUERPO, collisionFilterMask: G_FIJO | G_CUERPO | G_VIVO,
      linearDamping: 0.04, angularDamping: 0.25,
      /* cannon compara v^2 + w^2 (m/s y rad/s mezclados) con el
         limite al cuadrado: con 0,15 un temblor de 0,5 rad/s en una
         bota apoyada no lo dejaba dormir nunca. 0,35 es medio radian
         por segundo, que en un cadaver quieto no se ve. */
      allowSleep: true, sleepSpeedLimit: 0.35, sleepTimeLimit: 0.5
    });
    if (forma) b.addShape(forma);
    if (extra) extra(b);
    b.position.copy(aC(pos));
    b.quaternion.copy(aCq(quat));
    mundo.addBody(b);
    return b;
  }

  /* =============================================================
     CREAR: el ragdoll nace EXACTAMENTE donde estaba el muñeco

     Cada cuerpo sale de la matriz de mundo de su hueso en ese
     fotograma -posicion y giro-, con la velocidad que llevaba el
     muñeco. Las articulaciones se atan en la pose que tenia al morir:
     nada salta ni se recoloca.
     ============================================================= */
  R.crear = function (A, golpe) {
    elMundo();
    const e = A.cuerpo.escala;
    const hs = A.cuerpo.huesos, H = Chars.H;
    A.grupo.updateMatrixWorld(true);

    /* LAS MANOS DEL CUERPO, A LA VISTA. Con un arma que trae sus
       propias manos dibujadas la animacion oculta las del cuerpo
       -escala 0 en las cinco poses- y las pinta el arma. Al morir el
       arma se suelta y el muerto ya no se anima: el cadaver se quedaba
       sin la mano derecha (y sin las dos con un arma a dos manos). */
    for (let q = 0; q < Chars.POSES; q++) {
      hs[Chars.MANOS_I[q]].scale.setScalar(q === 0 ? 1 : 0);
      hs[Chars.MANOS_D[q]].scale.setScalar(q === 0 ? 1 : 0);
    }
    if (A.anim) { A.anim.poseI = 0; A.anim.poseD = 0; }

    // --- tronco: del hueso del cuerpo (pivota en la pelvis) ---
    const cu = hs[H.CUERPO];
    cu.updateWorldMatrix(true, false);
    cu.matrixWorld.decompose(_v, _q, _s);
    const qT = _q.clone();
    const pCM = new THREE.Vector3(CM[0], CM[1], CM[2]).applyMatrix4(cu.matrixWorld);
    const tronco = cuerpoRigido(MASA.tronco, null, pCM, qT, (b) => {
      b.addShape(new C.Box(new C.Vec3(CAJA.hx * e, (CAJA.y1 - CAJA.y0) / 2 * e, CAJA.hz * e)),
                 new C.Vec3(0, ((CAJA.y0 + CAJA.y1) / 2 - CM[1]) * e, (CAJA.z - CM[2]) * e));
      b.addShape(new C.Sphere(CABEZA.r * e), new C.Vec3(0, (CABEZA.y - CM[1]) * e, (CABEZA.z - CM[2]) * e));
    });
    tronco.angularDamping = 0.2;

    const partes = [tronco], juntas = [];

    // --- puños: esfera colgada del hombro por su "brazo" invisible ---
    const pun = [];
    for (let s = 0; s < 2; s++) {
      const lado = s ? 1 : -1;
      const hu = hs[s ? H.MANO_D : H.MANO_I];
      hu.updateWorldMatrix(true, false);
      hu.matrixWorld.decompose(_v, _q, _s);
      const p = cuerpoRigido(MASA.puno, new C.Sphere(PUNO_R * e), _v, _q);
      p.angularDamping = 0.6;
      pun.push(p); partes.push(p);
      /* La rotula del hombro: en el tronco, el hombro; en el puño, el
         mismo punto del mundo visto desde el puño. Asi el "brazo" mide
         lo que medía al morir y no hay tiron. El cono se centra en la
         caida natural del reposo -del hombro al puño de la hoja de
         personaje, (0,195, -0,414, 0,17)- y deja 75 grados a cada lado. */
      const hom = new THREE.Vector3(lado * HOMBRO[0], HOMBRO[1], HOMBRO[2]).applyMatrix4(cu.matrixWorld);
      const pivA = new C.Vec3(); tronco.pointToLocalFrame(aC(hom), pivA);
      const pivB = new C.Vec3(); p.pointToLocalFrame(aC(hom), pivB);
      const eje = new THREE.Vector3(lado * 0.195, -0.414, 0.17).normalize();
      const ejeA = aC(eje);
      // el mismo eje, en el marco del puño: girado por (giro del puño)^-1 x (giro del tronco)
      _q2.copy(_q).invert().multiply(qT);
      const ejeB = aC(eje.clone().applyQuaternion(_q2));
      const brazo = pivB.length();
      inercia(p, Math.max(0.05, MASA.puno * brazo * brazo / 3));
      juntas.push(new C.ConeTwistConstraint(tronco, p, {
        pivotA: pivA, pivotB: pivB, axisA: ejeA, axisB: ejeB,
        angle: 1.31, twistAngle: 0.8, collideConnected: true
      }));
    }

    // --- botas: caja con su rotula en el centro de la tapa de arriba ---
    const pies = [];
    for (let s = 0; s < 2; s++) {
      const hu = hs[s ? H.PIE_D : H.PIE_I];
      hu.updateWorldMatrix(true, false);
      const cen = new THREE.Vector3(PIE_CENTRO[0], PIE_CENTRO[1], PIE_CENTRO[2]).applyMatrix4(hu.matrixWorld);
      hu.matrixWorld.decompose(_v, _q, _s);
      const b = cuerpoRigido(MASA.pie, new C.Box(new C.Vec3(PIE.hx * e, PIE.hy * e, PIE.hz * e)), cen, _q);
      b.angularDamping = 0.5;
      inercia(b, 2 * MASA.pie / 12 * (0.155 * 0.155 + 0.315 * 0.315) * e * e);
      pies.push(b); partes.push(b);
      /* La rotula: en la bota, el centro de su tapa de arriba; en el
         tronco, ese mismo punto 6 cm mas abajo. Pegada al bajo del
         torso, la bota rozaba la caja en cuanto cabeceaba y el cadaver
         temblaba sin dormirse nunca; en Madness la bota FLOTA suelta
         bajo el cuerpo, y al morir cae esos 6 cm: se afloja. Cabeceando,
         la punta sube 0,1575 x sen a: hasta 35 grados (9 cm) la holgura
         -6 mas los 2,8 que la caja queda por encima del bajo- la cubre,
         y mas alla la para la colision con el torso. */
      const tapa = new C.Vec3(0, PIE.hy * e, 0);
      const tapaMundo = new C.Vec3(); b.pointToWorldFrame(tapa, tapaMundo);
      const pivA = new C.Vec3(); tronco.pointToLocalFrame(tapaMundo, pivA);
      pivA.y -= HOLGURA_PIE * e;
      const abajoT = new C.Vec3(0, -1, 0);                // abajo del tronco
      // abajo del tronco visto desde la bota: la bota nace girada como estaba
      _q2.copy(_q).invert().multiply(qT);
      const abajoB = aC(new THREE.Vector3(0, -1, 0).applyQuaternion(_q2));
      juntas.push(new C.ConeTwistConstraint(tronco, b, {
        pivotA: pivA, pivotB: tapa, axisA: abajoT, axisB: abajoB,
        angle: 1.22, twistAngle: 0.52, collideConnected: true
      }));
    }
    for (const j of juntas) mundo.addConstraint(j);

    /* La velocidad con la que se llevaba el muñeco. */
    const vel = new C.Vec3(A.vx || 0, A.vy || 0, (A.vz || 0) * 0.5);
    for (const b of partes) b.velocity.copy(vel);

    const rag = {
      partes: partes, tronco: tronco, punos: pun, pies: pies, juntas: juntas,
      esc: e, dormido: false, tocado: false
    };
    tronco.addEventListener('collide', (ev) => {
      if (!rag.tocado && Math.abs(ev.contact.getImpactVelocityAlongNormal()) > 3) rag.tocado = true;
    });
    ragdolls.push(rag);
    if (golpe) R.impulso(rag, golpe);
    return rag;
  };

  /* -------------------------------------------------------------
     UN IMPULSO   golpe = { x, y, z, ix, iy, iz, radio, giro }

     (ix, iy, iz) es la velocidad que el golpe quiere dar al cuerpo, en
     m/s. Se aplica como IMPULSO -masa por velocidad- en el punto de
     impacto sobre la pieza mas cercana: el motor saca de ahi el
     empujon y el par. El 40% es lo que el cuerpo entero se lleva de
     media (el resto se lo come la pieza que recibe, que no va sola).
     'giro' era el par a mano del ragdoll de puntos; aqui el par ya lo
     da el punto de impacto, y solo queda un pellizco de el para que
     un golpe centrado en la pelvis no deje el cuerpo en equilibrio.
     ------------------------------------------------------------- */
  R.impulso = function (rag, golpe) {
    const pto = new C.Vec3(golpe.x, golpe.y, golpe.z === undefined ? rag.tronco.position.z : golpe.z);
    // la pieza mas cercana al punto (el tronco gana por tamaño)
    let mejor = rag.tronco, dmin = pto.distanceTo(rag.tronco.position) - 0.45 * rag.esc;
    for (const b of rag.partes) {
      if (b === rag.tronco) continue;
      const d = pto.distanceTo(b.position) - 0.12 * rag.esc;
      if (d < dmin) { dmin = d; mejor = b; }
    }
    let masa = 0; for (const b of rag.partes) masa += b.mass;
    const k = 0.40 * masa;
    const J = new C.Vec3((golpe.ix || 0) * k, (golpe.iy || 0) * k, (golpe.iz || 0) * k);
    if (mejor !== rag.tronco) {
      // la pieza recibe lo que su masa aguanta (4x su masa en m/s) y el resto pasa al tronco
      const tope = mejor.mass * 4;
      const f = Math.min(1, tope / (J.length() || 1));
      mejor.applyImpulse(J.scale(f), new C.Vec3());
      J.scale(1 - f, J);
      mejor = rag.tronco;
    }
    // el punto de aplicacion, respecto al centro del tronco y sin salirse de el
    const rel = pto.vsub(rag.tronco.position);
    const lim = 0.5 * rag.esc, lr = rel.length();
    if (lr > lim) rel.scale(lim / lr, rel);
    rag.tronco.applyImpulse(J, rel);
    if (golpe.giro) {
      // el pellizco de par: sobre el eje de profundidad, en el sentido del golpe
      rag.tronco.angularVelocity.z += -golpe.giro * 0.35;
    }
    despertar(rag);
  };

  function despertar(rag) {
    for (const b of rag.partes) b.wakeUp();
    rag.dormido = false;
  }
  R.despertar = despertar;

  /* =============================================================
     PASO DEL MOTOR: una vez por fotograma para todos los cadaveres, a
     paso fijo de 1/60 con hasta 3 subpasos (con el dt del fotograma
     un cadaver caeria distinto a 30 fps que a 60).

     LOS VIVOS SON SOLIDOS: un cilindro cinematico por personaje -su
     radio, de los pies a la cabeza, con su velocidad-. Un cinematico no
     se puede atravesar: lo que toca sale empujado con fisica de verdad
     (la bota que se pisa se va, el tronco gira detras). Con solo una
     patada al chocar, el jugador atravesaba los cadaveres.

     Y EMPUJAR UN CUERPO CUESTA: el cinematico tiene masa infinita y,
     sin mas, arrastro un cadaver 4,5 m como una pala (medido). Despues
     de cada paso se mira que toca cada vivo y se le frena el andar del
     fotograma siguiente: contra un tronco (40 kg) va al 55%, contra solo
     puños o botas al 90%. Y el cadaver, que casi siempre choca
     descentrado y con poco roce contra el vivo, resbala de costado y se
     aparta.
     ============================================================= */
  const FRENO_TRONCO = 0.55, FRENO_PIEZA = 0.90;

  R.paso = function (dt, actores) {
    if (!mundo || !ragdolls.length) {
      for (let i = 0; i < actores.length; i++) actores[i].frenoCadaver = 1;
      return;
    }
    let n = 0;
    for (let i = 0; i < actores.length; i++) {
      const A = actores[i];
      if (!A.vivo) continue;
      let v = vivos[n];
      if (!v) {
        /* allowSleep false: parado un segundo, cannon lo dormia; dos
           dormidos no chocan y el jugador atravesaba los cadaveres. */
        v = vivos[n] = new C.Body({ mass: 0, type: C.Body.KINEMATIC, material: matVivo, allowSleep: false,
                                    collisionFilterGroup: G_VIVO, collisionFilterMask: G_CUERPO });
        v.radio = 0; v.alto = 0;
        mundo.addBody(v);
      }
      const r = A.r * 0.85, h = A.alto;
      if (v.radio !== r || v.alto !== h) {
        v.shapes.length = 0; v.shapeOffsets.length = 0; v.shapeOrientations.length = 0;
        v.addShape(new C.Cylinder(r, r, h, 10));
        v.radio = r; v.alto = h;
      }
      v.actor = A;
      v.position.set(A.x, A.y + h / 2, A.z);
      v.velocity.set(A.vx || 0, A.vy || 0, A.vz || 0);
      n++;
    }
    // los que sobran (murieron o se fueron), lejos y quietos
    for (let i = n; i < vivos.length; i++) { vivos[i].actor = null; vivos[i].position.set(0, -50, 0); vivos[i].velocity.set(0, 0, 0); }

    mundo.step(PASO, Math.min(dt, 0.1), 3);

    // lo que toca cada vivo, para frenarle el andar
    for (let i = 0; i < actores.length; i++) actores[i].frenoCadaver = 1;
    for (const c of mundo.contacts) {
      const vb = c.bi.actor ? c.bi : (c.bj.actor ? c.bj : null);
      if (!vb) continue;
      const otro = vb === c.bi ? c.bj : c.bi;
      const f = otro.mass >= MASA.tronco ? FRENO_TRONCO : FRENO_PIEZA;
      if (f < vb.actor.frenoCadaver) vb.actor.frenoCadaver = f;
    }

    /* Dormir y despertar EN BLOQUE: cannon duerme cada cuerpo por su
       cuenta, y un tronco dormido con un puño despierto colgando se
       queda como un poste. Si una pieza se mueve, se despierta todo el
       cadaver; cuando todas estan dormidas, el cadaver esta dormido. */
    for (const rag of ragdolls) {
      let despiertas = 0;
      for (const b of rag.partes) if (b.sleepState !== C.Body.SLEEPING) despiertas++;
      if (despiertas && despiertas < rag.partes.length) {
        let mueve = false;
        for (const b of rag.partes) if (b.sleepState === C.Body.AWAKE && b.velocity.lengthSquared() > 0.12) mueve = true;
        if (mueve) despertar(rag);
      }
      rag.dormido = despiertas === 0;
    }
  };

  /* Lo que pedia el ragdoll de puntos una vez por cadaver: ya lo hace
     R.paso para todos. Se deja para no tocar a quien lo llama. */
  R.actualizar = function () {};

  /* Sacar un cadaver del motor (cuando se retira de la arena). */
  R.quitar = function (rag) {
    if (!rag || !mundo) return;
    for (const j of rag.juntas) mundo.removeConstraint(j);
    for (const b of rag.partes) mundo.removeBody(b);
    const k = ragdolls.indexOf(rag);
    if (k >= 0) ragdolls.splice(k, 1);
  };
  /* Vaciar el motor (partida nueva). */
  R.reiniciar = function () {
    if (!mundo) return;
    for (const rag of ragdolls.slice()) R.quitar(rag);
  };

  /* =============================================================
     ESCRIBIR EL RESULTADO EN EL MUÑECO

     El grupo va con el tronco: su origen es la pelvis, que esta a -CM
     del centro de masas girado. Cabeza en su sitio de siempre (va
     rigida). Puños y botas: posicion y giro de su cuerpo rigido,
     pasados al marco del grupo. Una sola llamada de dibujo, como el
     vivo.
     ============================================================= */
  R.aplicar = function (rag, A) {
    const e = rag.esc, hs = A.cuerpo.huesos, g = A.grupo, H = Chars.H;
    const T = rag.tronco;
    _q.set(T.quaternion.x, T.quaternion.y, T.quaternion.z, T.quaternion.w);
    _qInv.copy(_q).invert();
    _v.set(-CM[0] * e, -CM[1] * e, -CM[2] * e).applyQuaternion(_q);
    const px = T.position.x + _v.x, py = T.position.y + _v.y, pz = T.position.z + _v.z;
    g.position.set(px, py, pz);
    g.quaternion.copy(_q);

    hs[H.RAIZ].position.set(0, -0.260, 0);
    hs[H.RAIZ].quaternion.identity();
    hs[H.CUERPO].position.set(0, 0.260, 0);
    hs[H.CUERPO].quaternion.identity();
    // la cabeza, rigida: su hueso pivota en la base del craneo (0,385 por debajo y 0,056 por detras del centro)
    hs[H.CABEZA].position.set(0, CABEZA.y - 0.385, CABEZA.z - 0.056);
    hs[H.CABEZA].quaternion.identity();

    // puños: hijos del cuerpo, que esta en la pelvis
    const hm = [H.MANO_I, H.MANO_D];
    for (let s = 0; s < 2; s++) {
      const b = rag.punos[s], hu = hs[hm[s]];
      _v.set(b.position.x - px, b.position.y - py, b.position.z - pz).applyQuaternion(_qInv).divideScalar(e);
      hu.position.copy(_v);
      _q2.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      hu.quaternion.copy(_qInv).multiply(_q2);
    }
    // botas: hijas de la raiz (26 cm bajo la pelvis); el hueso esta a -PIE_CENTRO (girado) del centro de la caja
    const hp = [H.PIE_I, H.PIE_D];
    for (let s = 0; s < 2; s++) {
      const b = rag.pies[s], hu = hs[hp[s]];
      _q2.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      hu.quaternion.copy(_qInv).multiply(_q2);
      _v.set(b.position.x - px, b.position.y - py, b.position.z - pz).applyQuaternion(_qInv).divideScalar(e);
      _v2.set(PIE_CENTRO[0], PIE_CENTRO[1], PIE_CENTRO[2]).applyQuaternion(hu.quaternion);
      hu.position.set(_v.x - _v2.x, _v.y - _v2.y + 0.260, _v.z - _v2.z);
    }

    /* El arma va donde la mano derecha, y las otras poses de cada mano
       donde la primera (solo se ve una). */
    hs[H.ARMA_D].position.copy(hs[Chars.MANOS_D[0]].position);
    hs[H.ARMA_D].quaternion.copy(hs[Chars.MANOS_D[0]].quaternion);
    for (let q = 1; q < Chars.POSES; q++) {
      hs[Chars.MANOS_I[q]].position.copy(hs[Chars.MANOS_I[0]].position);
      hs[Chars.MANOS_D[q]].position.copy(hs[Chars.MANOS_D[0]].position);
      hs[Chars.MANOS_I[q]].quaternion.copy(hs[Chars.MANOS_I[0]].quaternion);
      hs[Chars.MANOS_D[q]].quaternion.copy(hs[Chars.MANOS_D[0]].quaternion);
    }
  };

  /* Que tan alto llega un cadaver (la separacion con los vivos deja
     saltar por encima), de las cajas de sus cuerpos. */
  R.franja = function (rag) {
    let lo = Infinity, hi = -Infinity;
    for (const b of rag.partes) {
      b.updateAABB();
      if (b.aabb.lowerBound.y < lo) lo = b.aabb.lowerBound.y;
      if (b.aabb.upperBound.y > hi) hi = b.aabb.upperBound.y;
    }
    return { y0: lo, y1: hi };
  };

  // la cabeza en el mundo
  const _cab = { x: 0, y: 0, z: 0 };
  R.cabeza = function (rag) {
    const T = rag.tronco, e = rag.esc;
    const w = new C.Vec3(); T.pointToWorldFrame(new C.Vec3(0, (CABEZA.y - CM[1]) * e, (CABEZA.z - CM[2]) * e), w);
    _cab.x = w.x; _cab.y = w.y; _cab.z = w.z;
    return _cab;
  };
  // entre la pelvis y la cabeza: el centro del cuerpo para sangre y objetivos
  R.centro = function (rag) {
    const T = rag.tronco, e = rag.esc;
    const w = new C.Vec3(); T.pointToWorldFrame(new C.Vec3(0, (0.53 - CM[1]) * e, 0), w);
    return { x: w.x, y: w.y, z: w.z };
  };

  /* Restos del ragdoll de puntos que otros llamaban: el motor ya hace
     el trabajo (los vivos empujan dentro del paso, los cadaveres
     chocan entre si solos). */
  R.empujar = function () {};
  R.mover = function () {};
  R.separar = function () {};
  R.tocar = function () {};

  // para el banco de pruebas (tools/qa/ragdoll.js)
  R._medidas = { CAJA: CAJA, CABEZA: CABEZA, PUNO_R: PUNO_R, PIE: PIE, CM: CM };
  R._mundo = () => mundo;

  global.Ragdolls = R;
})(window);

