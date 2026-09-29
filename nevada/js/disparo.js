/* =============================================================
   disparo.js -> Lo que hace un arma de fuego al disparar y al
   recargar, sacado del SWF cuadro a cuadro.

   Todo sale de js/disparo_swf.js (tools/swf_disparo):

   1. LA PATADA. Cada arma tiene su "<arma> - Fire R": el arma sube
      y retrocede con una curva propia -la Beretta 0,56 rad y 6,5 px
      de corredera, el Colt 1,15 rad, la MP5 casi nada-. Aqui se
      guarda el reloj y el animador la lee (Disparo.curva).

   2. EL FOGONAZO. myBlast, con su sprite y su matriz en el marco
      del arma, desde su primer cuadro y al doble de rapido. Va pegado
      a la BOCA DE LA MALLA -la de verdad, no una cuenta aparte-: de
      perfil en el plano del costado del arma, rodado sobre el cañon
      hacia la camara, y de frente un estallido redondo de cara a la
      camara (pintarFrente).

   3. LAS VAINAS. La de cada calibre (casing_pistol, _rifle,
      _shotgun, _revolver: myCasing de ItemGenerator), con la fisica
      de MadnessParticle:
         xSpeed  -3..-6 px/cuadro hacia atras
         ySpeed -15..-25 px/cuadro hacia arriba
         giro   +-90 grados/cuadro       gravedad 2,8 px/cuadro2
         rebote 0,7: con |ySpeed| >= 8 rebota, si no rueda
      Y salen CUANDO las suelta el arma: las de la pistola, el
      subfusil y el fusil al disparar (ejectShell va en el disparo
      salvo en escopetas y revolveres); las de las escopetas en el
      cuadro de la bomba del Fire R (16 la SPAS, 18 la 97k); las de
      los revolveres al abrir el tambor en el Reload R (cuadro 23).
      Salen de la VENTANA DE EXPULSION, medida sobre el dibujo del
      arma del SWF, y hacia la derecha del arma, que es por donde
      escupe una de verdad.

   4. LOS CARGADORES. ejectClip del Reload R: el cargador vacio cae
      del pozo del arma (4284, el fotograma de cada una) con rebote
      0,6, sin impulso -ySpeed 0, xSpeed +-1-.

   5. LA RECARGA. Dura lo que el Reload R -cuadros/30-, el cargador
      entra en el cuadro de reloadMe y ahi suena S_Gun_Reload. La
      SPAS-12 es singleBulletClip: mete UN cartucho por vuelta de 26
      cuadros y sigue mientras no se apriete el gatillo.

   Las medidas del SWF van en px; K pasa a metros con la misma
   regla que las mallas (tools/swf_modelos: la mano del SWF).
   ============================================================= */
(function (global) {
  'use strict';

  const D = global.DISPARO_SWF;
  const MOD = global.MODELOS_SWF;
  const Disparo = {};

  const K = 0.214 / 13.06;       // m por px del SWF (tools/swf_modelos)
  const FPS = 30;                // el SWF va a 30 cuadros por segundo
  const V = K * FPS;             // px/cuadro -> m/s
  const G = 2.8 * K * FPS * FPS; // gravedad de MadnessParticle, m/s2
  const REBOTE_MIN = 8 * V;      // por debajo, la pieza rueda

  /* Donde escupe cada arma, en px del marco del arma del SWF -el del
     dibujo, el mismo de myShootPoint-. Medido sobre el dibujo:
       ventana  la ventana de expulsion (las escopetas y el AR la
                llevan dibujada, un ovalo en el cajon; la Beretta,
                el hueco de la corredera; los revolveres, el tambor)
       pozo     solo la Beretta, que lleva el cargador dentro de la
                culata y no como pieza: el origen del sprite de 4284 y
                su giro -la culata va inclinada 20 grados-. Los demas
                lo sacan de la caja de su pieza (ver cargador()). */
  const ARMAS = {
    pistola:    { vaina: 'casing_pistol',   sale: 'fuego',   ventana: [19, 1.5],
                  cargador: 'clip_beretta', pozo: [6, 12.5, 20] },
    magnum:     { vaina: 'casing_revolver', sale: 'recarga', ventana: [18, 5.5] },
    revolver:   { vaina: 'casing_revolver', sale: 'recarga', ventana: [18, 5.5] },
    subfusil:   { vaina: 'casing_pistol',   sale: 'fuego',   ventana: [42, 5],
                  cargador: 'clip_mp5' },
    escopeta:   { vaina: 'casing_shotgun',  sale: 'bomba',   ventana: [30.5, 5.8], unoAUno: true },
    escopeta97: { vaina: 'casing_shotgun',  sale: 'bomba',   ventana: [31.5, 3.8],
                  cargador: 'clip_97k' },
    fusil:      { vaina: 'casing_rifle',    sale: 'fuego',   ventana: [43, 7.5],
                  cargador: 'clip_ar15' }
  };
  Disparo.ARMAS = ARMAS;

  /* La recarga del SWF: lo que dura el Reload R. */
  if (D) {
    for (const id in ARMAS) {
      const f = global.Weapons && Weapons.CAT[id], d = D.armas[id];
      if (!f || !d) continue;
      f.recarga = d.recarga.cuadros / FPS;
      if (ARMAS[id].unoAUno) f.unoAUno = true;
    }
  }

  /* ---------------- ENTRE CUADRO Y CUADRO ----------------
     El SWF va a 30 cuadros y casi todo esta animado "de a dos": cada
     pose se sostiene dos cuadros, o sea 15 poses por segundo, y aqui se
     leia el cuadro que tocaba sin mas. En una pantalla de 60 Hz eso es
     una pose cada cuatro imagenes: la patada, la corredera y la mano de
     la recarga iban a saltos.

     Ahora las poses del SWF son CLAVES y entre clave y clave se pasa
     con una cubica monotona (Fritsch-Butland): suave, sin pasarse nunca
     de la pose del SWF -ni de un extremo ni de una pose sostenida-, y
     por las mismas poses en los mismos instantes. Las claves son el
     primer cuadro de cada tramo igual; un tramo de mas de dos cuadros
     es una pose SOSTENIDA de verdad y lleva clave tambien en su ultimo
     cuadro, para que se quede quieta y no se arrastre hacia la
     siguiente. Lo que no es un numero -una letra de mano, el sprite
     del cuerpo- o un cuadro vacio no se mezcla: va por cuadros. */
  const _claves = new WeakMap();
  function claves(L) {
    let C = _claves.get(L);
    if (C) return C;
    C = [];
    const txt = L.map((x) => JSON.stringify(x));
    let s = 0;
    while (s < L.length) {
      let e = s + 1;
      while (e < L.length && txt[e] === txt[s]) e++;
      C.push(s);
      if (e - s > 2) C.push(e - 1);
      s = e;
    }
    if (C[C.length - 1] !== L.length - 1) C.push(L.length - 1);
    _claves.set(L, C);
    return C;
  }
  function pendiente(a, b, ta, tb) { return (b - a) / (tb - ta); }
  /* Dos poses se mezclan si tienen la misma forma y los mismos textos
     (el mismo dibujo de mano, el mismo sprite). */
  function mezclable(a, b) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || a.length !== b.length) return false;
    for (let k = 0; k < a.length; k++) if (typeof a[k] !== 'number' && a[k] !== b[k]) return false;
    return true;
  }
  /* El valor de la lista L en el cuadro f (con decimales). Devuelve el
     cuadro tal cual si no hay nada que mezclar, o 'out' mezclado. */
  function muestra(L, f, out) {
    const n = L.length;
    if (f <= 0) return L[0];
    if (f >= n - 1) return L[n - 1];
    const C = claves(L);
    let j = 0;
    while (j < C.length - 2 && C[j + 1] <= f) j++;
    const t1 = C[j], t2 = C[j + 1], a = L[t1], b = L[t2];
    if (!mezclable(a, b)) return L[Math.floor(f)];
    const t0 = j > 0 ? C[j - 1] : null, t3 = j + 2 < C.length ? C[j + 2] : null;
    const p0 = t0 !== null && mezclable(L[t0], a) ? L[t0] : null;
    const p3 = t3 !== null && mezclable(L[t3], b) ? L[t3] : null;
    const h = t2 - t1, u = (f - t1) / h;
    const u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    out.length = a.length;
    for (let k = 0; k < a.length; k++) {
      const va = a[k], vb = b[k];
      if (typeof va !== 'number' || typeof vb !== 'number') { out[k] = va; continue; }
      const d = pendiente(va, vb, t1, t2);
      let m1 = d, m2 = d;
      if (p0 && typeof p0[k] === 'number') {
        const d0 = pendiente(p0[k], va, t0, t1);
        m1 = d0 * d > 0 ? 2 * d0 * d / (d0 + d) : 0;
      }
      if (p3 && typeof p3[k] === 'number') {
        const d3 = pendiente(vb, p3[k], t2, t3);
        m2 = d3 * d > 0 ? 2 * d3 * d / (d3 + d) : 0;
      }
      out[k] = h00 * va + h10 * h * m1 + h01 * vb + h11 * h * m2;
    }
    return out;
  }
  /* La mano de delante: [letra, matriz, letra, matriz]. Se aplana una
     vez a [letra, letra, 6 numeros, 6 numeros] y se mezcla solo entre
     poses del mismo dibujo (muestra no mezcla textos distintos). */
  const _planas = new WeakMap();
  const _plana = [];
  function muestraMano(L, f, out) {
    let P = _planas.get(L);
    if (!P) {
      P = L.map((x) => x ? [x[0], x[2]].concat(x[1], x[3]) : null);
      _planas.set(L, P);
    }
    const v = muestra(P, f, _plana);
    if (!v) return null;
    out[0] = v[0]; out[2] = v[1];
    const m1 = out[1] || (out[1] = []), m2 = out[3] || (out[3] = []);
    for (let k = 0; k < 6; k++) { m1[k] = v[2 + k]; m2[k] = v[8 + k]; }
    return out;
  }

  /* Del marco del arma del SWF al de la malla: se ancla en la boca,
     que esta medida en los dos -myShootPoint y la punta del cañon
     del modelo-. La malla mira a +Z con la Y arriba; el SWF, a +X
     con la Y abajo. */
  function aMalla(id, X, Y, out) {
    const o = D.armas[id].marco;
    return out.set(0, o[1] - Y * K, o[0] + X * K);
  }
  Disparo.aMalla = aMalla;

  /* ---------------- Las piezas que se mueven ----------------
     Cada pieza -corredera, tambor, bomba, cargador- es su propio modelo,
     hecho desde SU sprite del SWF, y el cuerpo trae lo que ellas tapan
     (tools/swf_modelos/partes.py). La mano de delante (mano2) va aparte
     porque en el SWF la lleva myHand2: es la que bombea y la que trae el
     cargador nuevo. Todo con los datos de leer.py: por cuadro, el giro y
     el desplazamiento de la pieza respecto a su reposo en el modelo, en
     el marco del arma pegado a su cuerpo. */
  Disparo.partes = function (id) {
    const d = D && D.armas[id], M = MOD[id];
    if (!d || !d.piezas || !M) return null;
    const r = Object.keys(d.piezas).filter((n) => n === 'mano2' || (M.partes && M.partes[n]));
    return r.length ? r : null;
  };
  /* Que mano del arma es la de delante: la de los DIBUJOS que el SWF usa
     para myHand2 en reposo -cara de fuera en el Fire R, de dentro en el
     Fire L: G y H-. Por distancia no: cada cara esta colocada con su
     matriz y la de dentro queda a 9 px de la de fuera. */
  Disparo.parteDeMano = function (id, inst) {
    const d = D && D.armas[id];
    if (!d || !d.manos2 || !MOD[id]) return null;
    const r = d.manos2.fuego[0];
    return (r && (inst.g === r[0] || inst.g === r[2])) ? 'mano2' : null;
  };
  const _pm = new THREE.Vector3();

  /* Un cambio del SWF [giro, tx, ty] -en el marco del arma: X al frente, Y
     abajo, giro a favor del reloj- puesto en un grupo de la malla, que va
     con Z al frente e Y arriba. El marco del SWF pasa a la malla con
     (z, y) = (bz + (X - bfx) K, by - (Y - bfy) K): el giro es sobre la X
     de la malla con el mismo angulo, y lo demas sale de conjugar. */
  function ponCambio(g, id, c) {
    const bz = D.armas[id].marco[0], by = D.armas[id].marco[1];
    const co = Math.cos(c[0]), si = Math.sin(c[0]);
    g.rotation.set(c[0], 0, 0);
    g.position.set(0, -K * c[2] + by - (-si * bz + co * by), K * c[1] + bz - (co * bz + si * by));
  }
  /* Un punto del marco del arma movido por el cambio c. */
  function mover(c, X, Y) {
    const co = Math.cos(c[0]), si = Math.sin(c[0]);
    return [co * X - si * Y + c[1], si * X + co * Y + c[2]];
  }

  /* EL TAMBOR. En el SWF, que es de perfil, baja 5,5 px: es el tambor
     saliendo de lado, visto de canto. En 3D sale como el de un Colt de
     verdad: gira 90 grados hacia la izquierda del arma (+X de la malla)
     sobre un eje paralelo al cañon, por debajo, a la distancia que baja
     en el SWF. Visto de lado, baja exactamente lo que baja en el SWF. */
  function ponTambor(g, id, P, c) {
    if (P.baja === undefined) {
      P.baja = 0;
      for (const x of P.recarga) if (x) P.baja = Math.max(P.baja, x[2]);
    }
    const r = P.baja;
    const cz = aMalla(id, (P.caja[0] + P.caja[1]) / 2, (P.caja[2] + P.caja[3]) / 2, _pm);
    const py = cz.y - r * K;
    const f = U.clamp(c[2] / r, 0, 1);
    const fi = Math.acos(1 - f);
    // giro sobre el pivote (0, py): p' = Rz (p - pivote) + pivote
    g.rotation.set(0, 0, -fi);
    g.position.set(-py * Math.sin(fi), py - py * Math.cos(fi), 0);
  }

  const _cam2 = new THREE.Vector3();
  const CERO = [0, 0, 0], _bufP = [], _bufMano = [], _bufS = [];
  Disparo.piezas = function (A) {
    const m = A.mallaArma;
    if (!m || !m.userData.partes || !D) return;
    const id = A.arma.id, d = D.armas[id], acc = A.anim.accArma;
    const rec = acc && acc.d === d.recarga;
    const i = acc ? acc.t * FPS : -1;       // cuadro con decimales
    for (const n in m.userData.partes) {
      const g = m.userData.partes[n], P = d.piezas[n];
      let c = CERO;
      if (acc && P) c = muestra(rec ? P.recarga : P.fuego, i, _bufP);
      g.visible = !!c;
      if (!c) continue;
      if (n === 'tambor') ponTambor(g, id, P, c);
      else ponCambio(g, id, c);
    }
    const mp = m.userData.manosParte;
    if (mp) for (const x of mp) x.g.visible = x.cara.visible && x.g.parent.visible;
    manoConPose(A, m, d, acc ? (rec ? 'recarga' : 'fuego') : null, i);
    sueltas(A, m, rec ? d.recarga.sueltas : null, i);
  };

  /* LA MANO DE DELANTE, CON LA POSE DEL SWF.

     En el SWF esa mano cambia de dibujo segun lo que hace: agarra el
     guardamanos (G), va a por el cargador o el cartucho (D) y lo sujeta
     (B; el AR-15 y la 97k lo llevan con G girada). Y cada animacion esta
     dos veces, "R" con la cara de fuera de la mano y "L", mismos cuadros,
     con la de dentro (H, C, A): son las dos caras de UNA mano 3D, las que
     ya estan modeladas (A..H de tools/swf_modelos, cada una el sprite del
     SWF). Aqui cada dibujo se construye una vez, en su cara y a los dos
     lados del arma, y se coloca cada cuadro con SU matriz del SWF; a
     camara va la cara que toca por el angulo real (Weapons.caraManos
     decide, igual que con las manos que empuñan).

     El grueso: la que agarra el guardamanos (G, H) lo envuelve como la
     del arma en reposo; las demas, a su grueso o al del cargador que
     sujetan mas 1,6 cm por lado, lo que sea mas.

     DE QUE LADO DEL ARMA VA. La mano ABIERTA que va a por el cargador o
     el cartucho (D por fuera, C por dentro) no agarra nada: en el SWF
     va DETRAS del arma y del cargador en la vista R (capa 1, debajo del
     cuerpo en la 5) y DELANTE en la L, o sea por el costado izquierdo del
     arma. Asi en el MP5, la SPAS y la 97k; el AR-15 la pinta delante en
     las dos vistas, que en 3D no puede ser, y va igual que las demas.
     Centrada, como antes, tapaba el cargador por los dos lados. Cuando
     agarra (G/H, B/A) va centrada y envolviendo lo que coge. */
  const GROSOR_MANO = { A: 0.095, B: 0.095, C: 0.062, D: 0.062, E: 0.100, F: 0.100, G: 0.078, H: 0.078 };
  const SUJETA = 0.064 + 2 * 0.016;
  const _M4 = new THREE.Matrix4();
  function manoConPose(A, m, d, anim, i) {
    const poses = m.userData.poses || (m.userData.poses = {});
    for (const k in poses) poses[k].visible = false;
    const g2 = m.userData.partes && m.userData.partes.mano2;
    const manos = m.userData.manos;
    if (!d.manos2 || !manos || !m.userData.piel) return;
    if (!anim) { if (g2) g2.visible = true; return; }
    const e = muestraMano(d.manos2[anim], i, _bufMano);
    if (g2) g2.visible = false;              // la de reposo no, va la de la pose
    if (!e) return;
    const id = A.arma.id, o = d.marco;
    for (const lado of [-1, 1]) {
      for (const cara of ['fuera', 'dentro']) {
        if (!manos[lado + cara] || !manos[lado + cara].visible) continue;
        const letra = cara === 'fuera' ? e[0] : e[2], M = cara === 'fuera' ? e[1] : e[3];
        const abierta = e[0] === 'D' || e[2] === 'C';
        const ox = abierta ? grosorArma(id) / 2 + GROSOR_MANO[letra] / 2 + 0.008 : 0;
        const k = letra + lado + cara;
        let g = poses[k];
        if (!g) g = poses[k] = grupoPose(m, id, letra, lado, cara, o);
        /* La matriz del SWF (px del dibujo -> marco del arma) en la malla:
           T = Marco * M * Marco^-1, con Marco (X, Y) -> (z, y) = (o0 + K X,
           o1 - K Y). Sobre (z, y); la x -el grueso- no se toca. */
        const a = M[0], b = -M[1], c = -M[2], dd = M[3];
        const ez = o[0] + K * M[4] - (a * o[0] + c * o[1]);
        const ey = o[1] - K * M[5] - (b * o[0] + dd * o[1]);
        _M4.set(1, 0, 0, ox,
                0, dd, b, ey,
                0, c, a, ez,
                0, 0, 0, 1);
        g.matrix.copy(_M4);
        g.matrixWorldNeedsUpdate = true;
        g.visible = true;
      }
    }
  }
  /* El grueso del cuerpo del arma: el de su pieza mas gruesa. */
  const _grosor = {};
  function grosorArma(id) {
    if (_grosor[id] === undefined) {
      let T = 0;
      for (const p of MOD[id].p) T = Math.max(T, p.T || 0);
      _grosor[id] = T;
    }
    return _grosor[id];
  }
  function grupoPose(m, id, letra, lado, cara, o) {
    // la abierta va por el costado, a su grueso; la que agarra, envolviendo
    let sd = (letra === 'D' || letra === 'C') ? 1 : Math.max(1, SUJETA / GROSOR_MANO[letra]);
    if (letra === 'G' || letra === 'H') {
      for (const inst of (Manos.datos.armas[id] || [])) if (inst.g === letra && inst.sd) { sd = inst.sd; break; }
    }
    // el dibujo en su sitio con la matriz identidad: px -> (z, y) = Marco
    const inst = { g: letra, P: [K, 0, 0, -K, o[0], o[1]], lado: lado, cara: cara, sd: sd };
    const Bc = U.builder({ uv: true }); Manos.meter(Bc, inst, 'arma', false);
    const Bt = U.builder({}); Manos.meter(Bt, inst, 'arma', true, 0x000000);
    const g = new THREE.Group();
    g.matrixAutoUpdate = false;
    const c = new THREE.Mesh(Bc.build(), Manos.material(m.userData.piel));
    c.frustumCulled = false;
    const l = new THREE.Mesh(Bt.build(), Art.mats.contorno);
    l.renderOrder = 2; l.frustumCulled = false;
    g.add(c); g.add(l);
    m.add(g);
    return g;
  }

  /* LO QUE LA MANO METE: el cartucho de la SPAS (4152) en su Reload R.
     Un cuadrado con el dibujo del SWF en el costado del arma, a los dos
     lados, con su matriz de cada cuadro. */
  function sueltas(A, m, S, i) {
    const U_ = m.userData.sueltas || (m.userData.sueltas = {});
    for (const k in U_) U_[k].visible = false;
    if (!S) return;
    const id = A.arma.id;
    for (const sid in S) {
      const mat = muestra(S[sid], i, _bufS);
      if (!mat) continue;
      const p = D.piezas['suelta_' + sid];
      if (!p) continue;
      let g = U_[sid];
      if (!g) {
        g = new THREE.Group();
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
        const uv = new Float32Array(8);
        for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) {
          uv[(j * 2 + k) * 2] = (p.uv[0] + k * p.uv[2]) / D.atlas.an;
          uv[(j * 2 + k) * 2 + 1] = (p.uv[1] + j * p.uv[3]) / D.atlas.al;
        }
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setIndex([0, 2, 1, 1, 2, 3]);
        for (const lado of [-1, 1]) {
          const q = new THREE.Mesh(geo, matPieza);
          q.position.x = lado * 0.07;
          q.frustumCulled = false;
          g.add(q);
        }
        m.add(g);
        U_[sid] = g;
      }
      const pos = g.children[0].geometry.attributes.position.array;
      const xs = [p.swf[0], p.swf[0] + p.swf[2]], ys = [p.swf[1], p.swf[1] + p.swf[3]];
      let k = 0;
      for (let j = 0; j < 2; j++) for (let q = 0; q < 2; q++) {
        const X = mat[0] * xs[q] + mat[2] * ys[j] + mat[4], Y = mat[1] * xs[q] + mat[3] * ys[j] + mat[5];
        aMalla(id, X, Y, _pm);
        pos[k * 3] = 0; pos[k * 3 + 1] = _pm.y; pos[k * 3 + 2] = _pm.z;
        k++;
      }
      g.children[0].geometry.attributes.position.needsUpdate = true;
      g.visible = true;
    }
  }

  /* ---------------- Recursos ---------------- */
  let escena = null, camara = null, tex = null, matFog = null, matPieza = null;
  const FOG = [];               // fogonazos vivos o libres
  const MAX_FOG = 10;
  const VEL_FOG = 2;             // el myBlast, al doble: cada dibujo una vez a 60 Hz
  const PIEZAS = {};            // una InstancedMesh por sprite de pieza
  const MAX_PIEZAS = 48;        // por tipo
  const VIDA = 14;              // lo que dura una vaina en el suelo
  const eventos = [];           // lo que un arma tiene pendiente

  function uvDe(nombre) {
    const p = D.piezas[nombre];
    return p ? p : null;
  }

  Disparo.init = function (esc, cam) {
    if (!D) return;
    escena = esc; camara = cam;
    tex = new THREE.TextureLoader().load(D.atlas.src);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    matFog = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    matPieza = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide
    });
    for (let i = 0; i < MAX_FOG; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(8), 2));
      g.setIndex([0, 2, 1, 1, 2, 3]);
      // cada fogonazo con su material: se desvanece por su cuenta
      const m = new THREE.Mesh(g, matFog.clone());
      m.frustumCulled = false;
      m.renderOrder = 6;
      const gF = new THREE.BufferGeometry();
      gF.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
      gF.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(8), 2));
      gF.setIndex([0, 2, 1, 1, 2, 3]);
      const fr = new THREE.Mesh(gF, matFog.clone());
      fr.frustumCulled = false;
      fr.renderOrder = 6;
      const ancla = new THREE.Group();
      ancla.add(m); ancla.add(fr);
      ancla.visible = false;
      FOG.push({ ancla: ancla, malla: m, frente: fr, vivo: false, t: 0, d: null, id: '',
                 cuadro: -1, cuadroF: -1, giro: 0, lado: 0 });
    }
    /* Las vainas y los cargadores: un cuadrado por sprite, a su tamaño
       del SWF y con el pivote en el origen del sprite, que es sobre el
       que gira en el original. */
    for (const n in ARMAS) {
      const a = ARMAS[n];
      for (const nombre of [a.vaina, a.cargador]) {
        if (!nombre || PIEZAS[nombre] || !uvDe(nombre)) continue;
        const p = uvDe(nombre);
        const x0 = p.swf[0] * K, y0 = -p.swf[1] * K;
        const x1 = (p.swf[0] + p.swf[2]) * K, y1 = -(p.swf[1] + p.swf[3]) * K;
        const u0 = p.uv[0] / D.atlas.an, v0 = p.uv[1] / D.atlas.al;
        const u1 = (p.uv[0] + p.uv[2]) / D.atlas.an, v1 = (p.uv[1] + p.uv[3]) / D.atlas.al;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
          x0, y0, 0, x1, y0, 0, x0, y1, 0, x1, y1, 0]), 3));
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
          u0, v0, u1, v0, u0, v1, u1, v1]), 2));
        g.setIndex([0, 2, 1, 1, 2, 3]);
        const im = new THREE.InstancedMesh(g, matPieza, MAX_PIEZAS);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        im.frustumCulled = false;
        im.count = 0;
        escena.add(im);
        const pool = new U.Pool(MAX_PIEZAS, () => ({
          x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, vr: 0, rebote: 0.7,
          rueda: false, t: 0, esc: 1
        }));
        PIEZAS[nombre] = { im: im, pool: pool };
      }
    }
  };

  /* ---------------- Utilidades de mundo ---------------- */
  const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _d = new THREE.Vector3();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const _e = new THREE.Euler(), _qz = new THREE.Quaternion(), _z = new THREE.Vector3(0, 0, 1);
  const _qA = new THREE.Quaternion();

  function malla(A) {
    const m = A && A.mallaArma;
    if (!m || !A.arma || !ARMAS[A.arma.id] || !MOD[A.arma.id]) return null;
    return m;
  }

  /* Un punto del marco del arma del SWF, en el mundo, AHORA. */
  function puntoMundo(A, X, Y, out, parte) {
    const m = malla(A);
    if (!m) return null;
    // en una pieza que se mueve, el punto va con ella
    const g = (parte && m.userData.partes && m.userData.partes[parte]) || m;
    g.updateWorldMatrix(true, false);
    return g.localToWorld(aMalla(A.arma.id, X, Y, out));
  }

  /* LA BOCA DE VERDAD: la punta del cañon de la malla que se ve. De
     aqui salen el fogonazo y la bala. */
  Disparo.boca = function (A, out) {
    const m = malla(A);
    if (!m) return null;
    // myShootPoint del Fire R, en la malla con el marco exacto
    const bf = D.armas[A.arma.id].fuego.boca;
    m.updateWorldMatrix(true, false);
    return m.localToWorld(aMalla(A.arma.id, bf[0], bf[1], out || new THREE.Vector3()));
  };

  /* ---------------- Disparo ---------------- */
  Disparo.fuego = function (A) {
    if (!D || !A || !A.arma) return;
    const id = A.arma.id, d = D.armas[id], a = ARMAS[id];
    if (!d) return;
    /* LA PATADA Y EL FOGONAZO, CON LA BALA. En el Fire R el arma no se
       mueve hasta el tercer o cuarto cuadro y el myBlast sale en el
       segundo, pero la bala sale en el instante del gatillo: el tiro se
       veia llegar una decima tarde. Se entra en la animacion por el
       cuadro de antes de que empiece a moverse, y el fogonazo por su
       primer cuadro. */
    const o = arranque(d.fuego);
    empezar(A.anim, d.fuego, o / FPS);
    // las del revolver se quedan en el tambor hasta recargar
    A.arma.gastadas = (A.arma.gastadas || 0) + 1;
    const m = malla(A);
    if (!m) return;
    fogonazo(A, id, d.fuego, m);
    /* Los eventos del Fire R: la vaina de la escopeta sale al bombear,
       y la bomba suena en su cuadro. */
    for (const ev of d.fuego.eventos) {
      if (ev[1] === 'ejectShell' && a.sale === 'bomba') programar(A, ev[0] - o, 'vaina');
      if (ev[1] === 'shotguncock') programar(A, ev[0] - o, 'bombeo');
    }
    if (a.sale === 'fuego') vaina(A, 1);
  };

  function programar(A, cuadro, que) {
    eventos.push({ A: A, arma: A.arma, t: Math.max(0, (cuadro - 1) / FPS), que: que });
  }
  /* El cuadro por el que se entra en el Fire R: el de antes del primero
     en que el arma se mueve. */
  function arranque(f) {
    if (f._arranque === undefined) {
      let k = 0;
      while (k < f.curva.length && f.curva[k] &&
             Math.abs(f.curva[k][0]) < 1e-3 && Math.abs(f.curva[k][1]) < 0.05 &&
             Math.abs(f.curva[k][2]) < 0.05) k++;
      f._arranque = k >= f.curva.length ? 0 : Math.max(0, k - 1);
    }
    return f._arranque;
  }

  /* EL FOGONAZO. Se cuelga del grupo del actor -el marco del Fire R,
     que es el del brazo- y no del arma: en el SWF el myBlast se
     queda donde se puso mientras el arma sube con la patada. */
  function fogonazo(A, id, f, m) {
    let F = null;
    for (const x of FOG) if (!x.vivo) { F = x; break; }
    if (!F) { F = FOG[0]; for (const x of FOG) if (x.t > F.t) F = x; }
    if (F.ancla.parent) F.ancla.parent.remove(F.ancla);
    const bm = aMalla(id, f.boca[0], f.boca[1], new THREE.Vector3());
    A.grupo.updateWorldMatrix(true, false);
    m.updateWorldMatrix(true, false);
    _m.copy(A.grupo.matrixWorld).invert().multiply(m.matrixWorld);
    _m.multiply(new THREE.Matrix4().makeTranslation(0, bm.y, bm.z));
    _m.decompose(F.ancla.position, F.ancla.quaternion, F.ancla.scale);
    A.grupo.add(F.ancla);
    // desde el primer cuadro del myBlast: sale con la bala
    F.vivo = true; F.t = 0; F.d = f; F.id = id; F.cuadro = -1; F.cuadroF = -1;
    F.giro = Math.random() * Math.PI * 2;
    F.ancla.visible = true;
    F.malla.visible = false; F.frente.visible = false;
  }

  /* El cuadro del fogonazo: el sprite del myBlast en su fotograma, con
     la matriz que lleva en el Fire R, pasado al marco de la boca. */
  function pintarFog(F, n) {
    const b = F.d.blast;
    const p = D.piezas['blast_' + b.sprite + '_' + String(n).padStart(2, '0')];
    if (!p) { F.malla.visible = false; return; }
    const r = b.rel, bf = F.d.boca;
    const pos = F.malla.geometry.attributes.position.array;
    const uv = F.malla.geometry.attributes.uv.array;
    const xs = [p.swf[0], p.swf[0] + p.swf[2]], ys = [p.swf[1], p.swf[1] + p.swf[3]];
    let k = 0;
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        const sx = xs[i], sy = ys[j];
        const X = r[0] * sx + r[2] * sy + r[4], Y = r[1] * sx + r[3] * sy + r[5];
        pos[k * 3] = 0;
        pos[k * 3 + 1] = -(Y - bf[1]) * K;
        pos[k * 3 + 2] = (X - bf[0]) * K;
        uv[k * 2] = (p.uv[0] + i * p.uv[2]) / D.atlas.an;
        uv[k * 2 + 1] = (p.uv[1] + j * p.uv[3]) / D.atlas.al;
        k++;
      }
    }
    F.malla.geometry.attributes.position.needsUpdate = true;
    F.malla.geometry.attributes.uv.needsUpdate = true;
    F.malla.geometry.computeBoundingSphere();
    F.malla.visible = true;
  }

  /* EL FOGONAZO DE FRENTE. El myBlast es un dibujo de PERFIL: el SWF
     solo se ve de lado. Puesto en el costado del arma y rodado hacia la
     camara vale mientras el cañon cruza la pantalla, pero con el arma
     apuntando a la camara ese plano se ve de canto -una raya, o nada- y
     el rodado se vuelve loco -la direccion hacia la camara casi no
     tiene componente de lado y el angulo salta de un cuadro a otro-.

     De frente, un fogonazo es un estallido redondo alrededor de la
     boca. Se pinta con el myBlast redondo del SWF, el 4929 del Colt y
     las escopetas, en un cuadrado de cara a la camara, girado al azar
     en cada tiro para que no salgan dos iguales, y del tamaño del
     fogonazo del arma. Los dos se reparten segun lo de punta que se
     vea el cañon (ver actualizar). */
  const FRENTE = 4929;
  function pintarFrente(F, n) {
    const p = D.piezas['blast_' + FRENTE + '_' + String(n).padStart(2, '0')];
    if (!p) { F.frente.visible = false; return false; }
    const p0 = D.piezas['blast_' + F.d.blast.sprite + '_01'];
    // el diametro: el alto del fogonazo de perfil del arma
    const R = (p0 ? Math.max(p0.swf[3], p0.swf[2] * 0.7) : 44) * 0.5;   // px
    const e = R / 24;                         // el 4929 mide ~48 px de alto
    const cx = p.swf[0] + p.swf[2] * 0.5, cy = p.swf[1] + p.swf[3] * 0.5;
    const pos = F.frente.geometry.attributes.position.array;
    const uv = F.frente.geometry.attributes.uv.array;
    const xs = [p.swf[0], p.swf[0] + p.swf[2]], ys = [p.swf[1], p.swf[1] + p.swf[3]];
    let k = 0;
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        pos[k * 3] = (xs[i] - cx) * K * e;
        pos[k * 3 + 1] = -(ys[j] - cy) * K * e;
        pos[k * 3 + 2] = 0;
        uv[k * 2] = (p.uv[0] + i * p.uv[2]) / D.atlas.an;
        uv[k * 2 + 1] = (p.uv[1] + j * p.uv[3]) / D.atlas.al;
        k++;
      }
    }
    F.frente.geometry.attributes.position.needsUpdate = true;
    F.frente.geometry.attributes.uv.needsUpdate = true;
    F.frente.geometry.computeBoundingSphere();
    return true;
  }

  /* ---------------- Vainas y cargadores ---------------- */
  function soltar(nombre, pos, vel, rot, vr, rebote, esc) {
    const P = PIEZAS[nombre];
    if (!P) return;
    const c = P.pool.take();
    c.x = pos.x; c.y = pos.y; c.z = pos.z;
    c.vx = vel.x; c.vy = vel.y; c.vz = vel.z;
    c.rot = rot; c.vr = vr; c.rebote = rebote;
    c.rueda = false; c.t = VIDA; c.esc = esc;
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  const RAD = Math.PI / 180;

  /* ejectShell: la vaina sale de la ventana hacia atras y arriba con
     los numeros de MadnessParticle, y hacia la derecha del arma
     -el -X de la malla-, que en el SWF no existe porque es plano. */
  function vaina(A, n) {
    const a = ARMAS[A.arma.id], m = malla(A);
    if (!m || !puntoMundo(A, a.ventana[0], a.ventana[1], _w)) return;
    const e = A.cuerpo.escala;
    _d.set(-1, 0, 0).transformDirection(m.matrixWorld);
    const rt = Actor.rumboTiro(A), dx = Math.cos(rt), dz = Math.sin(rt);
    for (let i = 0; i < n; i++) {
      const atras = rnd(3, 6) * V * e, arriba = rnd(15, 25) * V * e, lado = rnd(0.6, 1.4) * e;
      _v.set(-dx * atras + _d.x * lado, arriba, -dz * atras + _d.z * lado);
      _s.set(_w.x, _w.y, _w.z);
      soltar(a.vaina, _s, _v, -(A.apunta || 0), rnd(-90, 90) * RAD * FPS, 0.7, e);
    }
  }

  /* Las del revolver no saltan: el tambor se abre y caen. */
  function vainasTambor(A) {
    const a = ARMAS[A.arma.id], P = D.armas[A.arma.id].piezas.tambor;
    const n = Math.max(1, A.arma.gastadas || 0);
    A.arma.gastadas = 0;
    /* Del tambor, ya abierto: el centro de su caja del SWF, llevado por la
       pieza a donde este. */
    const X = P ? (P.caja[0] + P.caja[1]) / 2 : a.ventana[0], Y = P ? (P.caja[2] + P.caja[3]) / 2 : a.ventana[1];
    if (!puntoMundo(A, X, Y, _w, P ? 'tambor' : null)) return;
    const e = A.cuerpo.escala;
    for (let i = 0; i < n; i++) {
      _s.set(_w.x + rnd(-0.04, 0.04) * e, _w.y + rnd(-0.04, 0.04) * e, _w.z + rnd(-0.04, 0.04) * e);
      _v.set(rnd(-1, 1) * V * e, rnd(-3, 0) * V * e, rnd(-1, 1) * V * e);
      soltar(a.vaina, _s, _v, rnd(-5, 5) * RAD, rnd(-20, 20) * RAD * FPS, 0.7, e);
    }
  }

  /* ejectClip: el cargador vacio cae del pozo. MadnessParticle con
     ySpeed 0, xSpeed +-1, giro +-5 grados y +-4 por cuadro, rebote 0,6. */
  function cargador(A, cuadro) {
    const a = ARMAS[A.arma.id], d = D.armas[A.arma.id];
    if (!a.cargador) return;
    /* Donde: si el arma tiene el cargador como pieza, el sprite de 4284
       se pone con su caja sobre la de la pieza -miden lo mismo: el del
       MP5 8 x 24,75 px contra 7,75 x 24,6- y alli donde la pieza se
       quedo al irse. Si no -la Beretta lo lleva dentro de la culata-,
       en el pozo medido sobre el dibujo. */
    const pz = a.pozo || [0, 0, 0];
    let X = pz[0], Y = pz[1], giro = pz[2];
    const P = d.piezas && d.piezas.cargador, r = D.piezas[a.cargador];
    if (P && r) {
      X = P.caja[0] - r.swf[0]; Y = P.caja[2] - r.swf[1]; giro = 0;
      for (let i = Math.min(cuadro - 2, P.recarga.length - 1); i >= 0; i--) {
        const c = P.recarga[i];
        if (c) { [X, Y] = mover(c, X, Y); giro = c[0] / RAD; break; }
      }
    }
    if (!puntoMundo(A, X, Y, _w)) return;
    const e = A.cuerpo.escala;
    const rt = Actor.rumboTiro(A), dx = Math.cos(rt), dz = Math.sin(rt);
    const h = rnd(-1, 1) * V * e;
    _v.set(dx * h, 0, dz * h);
    _s.set(_w.x, _w.y, _w.z);
    /* El giro del sprite es el del arma en pantalla mas el de la
       culata: el cargador sale en la linea del pozo. En pantalla y
       contra reloj; el SWF gira a favor (su Y va hacia abajo), y
       mirando a la izquierda todo va al reves. */
    const lado = Math.cos(rt) >= 0 ? 1 : -1;
    soltar(a.cargador, _s, _v, lado * ((A.apunta || 0) - giro * RAD) + rnd(-5, 5) * RAD,
           rnd(-4, 4) * RAD * FPS, 0.6, e);
  }

  /* ---------------- Recarga ---------------- */
  /* Empezar a recargar: el reloj es el del Reload R. */
  Disparo.recargar = function (A) {
    const arma = A.arma, f = arma.ficha;
    arma.recargando = f.recarga;
    arma.cortar = false;
    const d = D && D.armas[arma.id];
    if (d) empezar(A.anim, d.recarga, 0);
  };

  /* Lo que pasa entre 'antes' y 'ahora' -segundos de recarga-: los
     eventos del Reload R en su cuadro. */
  Disparo.recargando = function (A, antes, ahora) {
    const arma = A.arma, d = D && D.armas[arma.id];
    if (!d) return;
    for (const ev of d.recarga.eventos) {
      /* Un pelo antes del cuadro: asi cae en el mismo paso en que
         Disparo.piezas ya lo da por ido, sin un fotograma sin nada. */
      const t = (ev[0] - 1) / FPS - 1e-6;
      if (t < antes || t >= ahora) continue;
      if (ev[1] === 'ejectClip') cargador(A, ev[0]);
      else if (ev[1] === 'ejectShell') vainasTambor(A);
      else if (ev[1] === 'reloadMe') meter(A);
    }
  };

  /* reloadMe: el cargador lleno entra, se gasta uno y suena. */
  function meter(A) {
    const arma = A.arma;
    if (arma.cargas <= 0 || arma.cargador >= arma.ficha.cargador) return;
    arma.cargas--;
    arma.cargador = arma.ficha.cargador;
    arma.metido = true;
    Sonido.tocar('recargar', { x: A.x, cam: Game.camX });
  }

  /* Se acaba el Reload R. La SPAS mete aqui su cartucho y, si no se
     ha apretado el gatillo y cabe otro, vuelve a empezar. Un arma sin
     reloadMe en los datos carga aqui, por si acaso. */
  Disparo.finRecarga = function (A) {
    const arma = A.arma, f = arma.ficha;
    if (f.unoAUno) {
      if (arma.cargas > 0 && arma.cargador < f.cargador) { arma.cargas--; arma.cargador++; }
      if (!arma.cortar && arma.cargas > 0 && arma.cargador < f.cargador) {
        Disparo.recargar(A);
        return;
      }
    } else if (!arma.metido) {
      meter(A);
    }
    arma.metido = false;
    arma.cortar = false;
    arma.recargando = 0;
  };

  /* ---------------- La patada, para el animador ----------------
     [angulo (rad, + cañon arriba), dx, dy (px del puño, Y abajo)] del
     instante que toca, o null. Entre cuadros del SWF, interpolado (ver
     'muestra').

     Y sin saltos al empezar ni al acabar. Una animacion que empieza
     encima de otra -la rafaga del fusil, un tiro a mitad de la patada
     del anterior- arrancaba de su primer cuadro, y la que acaba lejos
     de cero -el Fire R del fusil termina con el cañon 14 grados abajo-
     volvia a la guardia de golpe. Ahora la diferencia entre donde
     estaba el arma y donde empieza lo nuevo se guarda como ARRASTRE y
     se desvanece en unas centesimas: el arma nunca se teletransporta. */
  const ARRASTRE = 0.06;          // s: lo que tarda en irse la diferencia
  const _cv = [], _cv0 = [], _res = [0, 0, 0, 0];
  function empezar(anim, d, t0) {
    const antes = anim._ult;
    anim.accArma = { d: d, t: t0 };
    const ini = muestra(d.curva, t0 * FPS, _cv0) || CERO;
    anim.arrastre = antes
      ? [antes[0] - (ini[0] || 0), antes[1] - (ini[1] || 0), antes[2] - (ini[2] || 0)]
      : null;
  }
  Disparo.curva = function (anim) {
    const c = anim.accArma, r = anim.arrastre;
    let v = null;
    if (c && c.t * FPS < c.d.curva.length) v = muestra(c.d.curva, c.t * FPS, _cv);
    if (!v && !r) { anim._ult = null; return null; }
    for (let k = 0; k < 3; k++) _res[k] = (v ? v[k] || 0 : 0) + (r ? r[k] : 0);
    _res[3] = v ? v[3] : 0;
    const u = anim._ult || (anim._ult = [0, 0, 0]);
    u[0] = _res[0]; u[1] = _res[1]; u[2] = _res[2];
    return _res;
  };
  Disparo.avanzar = function (anim, dt) {
    const r = anim.arrastre;
    if (r) {
      const k = Math.exp(-dt / ARRASTRE);
      r[0] *= k; r[1] *= k; r[2] *= k;
      if (Math.abs(r[0]) < 1e-3 && Math.abs(r[1]) < 0.05 && Math.abs(r[2]) < 0.05) anim.arrastre = null;
    }
    const c = anim.accArma;
    if (!c) return;
    c.t += dt;
    if (c.t * FPS >= c.d.curva.length) {
      anim.accArma = null;
      // lo que quedaba se desvanece en vez de volver de golpe
      if (anim._ult) anim.arrastre = [anim._ult[0], anim._ult[1], anim._ult[2]];
    }
  };
  Disparo.K = K;

  /* ---------------- Paso ---------------- */
  const _cam = new THREE.Vector3();
  Disparo.actualizar = function (dt) {
    if (!D || !escena) return;
    /* Eventos pendientes: solo si el actor sigue vivo y con la misma
       arma en la mano. */
    for (let i = eventos.length - 1; i >= 0; i--) {
      const ev = eventos[i];
      ev.t -= dt;
      if (ev.t > 0) continue;
      eventos.splice(i, 1);
      const A = ev.A;
      if (!A.vivo || A.arma !== ev.arma) continue;
      if (ev.que === 'vaina') vaina(A, 1);
      else if (ev.que === 'bombeo') Sonido.tocar('bombeo', { x: A.x, cam: Game.camX });
    }

    /* FOGONAZOS.

       Rapidos: el myBlast del SWF son cuatro o cinco dibujos, cada uno
       sostenido dos cuadros a 30, o sea un tercio de segundo de
       fogonazo que se veia lento y a saltos. Aqui cada DIBUJO sale una
       vez, a 60 imagenes por segundo -el doble de rapido, los mismos
       dibujos en el mismo orden-: dura lo que un fogonazo, 0,13-0,17 s.

       De perfil, el dibujo del SWF en el costado del arma, rodado sobre
       el cañon hacia la camara. De frente, el estallido redondo de cara
       a la camara (pintarFrente). Se reparten por lo de punta que se
       vea el cañon: |cos| entre el cañon y la linea a la camara. */
    camara.getWorldPosition(_cam);
    for (const F of FOG) {
      if (!F.vivo) continue;
      F.t += dt;
      const b = F.d.blast;
      const n = b.hasta - b.desde + 1;         // cuadros del myBlast
      const f = F.t * FPS * VEL_FOG;           // cuadro del myBlast, desde 0
      if (f >= n) {
        F.vivo = false; F.ancla.visible = false;
        if (F.ancla.parent) F.ancla.parent.remove(F.ancla);
        continue;
      }
      const fr = Math.floor(f) + 1;
      if (fr !== F.cuadro) { F.cuadro = fr; pintarFog(F, fr); F.ladoOk = F.malla.visible; }
      // el redondo recorre sus once cuadros en el mismo tiempo
      const frF = Math.min(10, Math.floor(f / n * 10) + 1);
      if (frF !== F.cuadroF) { F.cuadroF = frF; F.frenteOk = pintarFrente(F, frF); }
      const vivo = f / n;

      F.ancla.updateWorldMatrix(true, false);
      _v.copy(_cam);
      F.ancla.worldToLocal(_v);
      const L = _v.length() || 1;
      const punta = Math.abs(_v.z) / L;        // 1 = cañon hacia la camara
      const wF = U.clamp((punta - 0.62) / 0.3, 0, 1);
      const suave = wF * wF * (3 - 2 * wF);
      /* Sin transparencias: blanco sobre gris a medias se ve gris sucio,
         y el SWF no tiene grises. Se reparten por TAMAÑO -el redondo
         crece segun se pone de punta el cañon- y el de perfil se quita
         antes de verse de canto. El final lo hacen los dibujos, que se
         ahuecan hasta quedar en un anillo. */
      const lat = Math.hypot(_v.x, _v.y);
      if (lat > 1e-4) {
        const ang = _v.x >= 0 ? Math.atan2(_v.y, _v.x) : Math.atan2(-_v.y, -_v.x);
        F.malla.rotation.z = ang;
      }
      F.malla.visible = !!F.ladoOk && punta < 0.86;
      F.frente.visible = !!F.frenteOk && suave > 0.03;
      if (F.frente.visible) {
        F.ancla.getWorldQuaternion(_qA).invert();
        F.frente.quaternion.copy(_qA).multiply(camara.quaternion);
        _qz.setFromAxisAngle(_z, F.giro);
        F.frente.quaternion.multiply(_qz);
        const cr = (0.9 + 0.25 * vivo) * (0.35 + 0.65 * suave);
        F.frente.scale.set(cr, cr, cr);
        // un pelo por delante de la boca, hacia la camara
        F.frente.position.set(0, 0, 0.02);
      }
    }

    /* Vainas y cargadores: MadnessParticle en metros. */
    const q = camara.quaternion;
    for (const nombre in PIEZAS) {
      const P = PIEZAS[nombre];
      let n = 0;
      P.pool.forEach((c) => {
        c.t -= dt;
        if (c.t <= 0) { c.alive = false; return; }
        const b = c.rebote, fr = dt * FPS;
        if (!c.rueda) {
          c.vy -= G * c.esc * dt;
          c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
          c.rot += c.vr * dt;
          if (c.y <= 0) {
            c.y = 0;
            if (-c.vy >= REBOTE_MIN * c.esc) {
              c.vy = -c.vy * b;
              c.vx *= (1 + b) / 2; c.vz *= (1 + b) / 2;
              c.vr *= -b;
            } else {
              c.vy = 0; c.rueda = true;
            }
          }
        } else {
          /* Rodando: xSpeed = (xSpeed + xSpeed*rebote)/2 cada cuadro, y
             acaba tumbada. */
          const k = Math.pow((1 + b) / 2, fr);
          c.vx *= k; c.vz *= k;
          c.x += c.vx * dt; c.z += c.vz * dt;
          const tumbada = Math.round((c.rot - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
          c.rot += (tumbada - c.rot) * Math.min(1, dt * 12);
        }
        /* Contra la pared del fondo no pasan. */
        if (c.z < Arena.FONDO + 0.04) { c.z = Arena.FONDO + 0.04; c.vz = Math.abs(c.vz) * b; }
        _qz.setFromAxisAngle(_z, c.rot);
        _q.copy(q).multiply(_qz);
        const s = c.esc * Math.min(1, c.t / 0.35);
        _s.set(s, s, s);
        /* El sprite se apoya en el suelo con su borde, no con el centro. */
        _v.set(c.x, c.y + 0.012 * c.esc, c.z);
        _m.compose(_v, _q, _s);
        P.im.setMatrixAt(n++, _m);
      });
      P.im.count = n;
      P.im.instanceMatrix.needsUpdate = true;
    }
  };

  Disparo.limpiar = function () {
    eventos.length = 0;
    for (const F of FOG) {
      F.vivo = false; F.ancla.visible = false;
      if (F.ancla.parent) F.ancla.parent.remove(F.ancla);
    }
    for (const nombre in PIEZAS) {
      PIEZAS[nombre].pool.forEach((c) => { c.alive = false; });
      PIEZAS[nombre].im.count = 0;
    }
  };

  global.Disparo = Disparo;
})(window);

