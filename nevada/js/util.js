/* =============================================================
   util.js -> Matematicas, azar reproducible y construccion de
   mallas.

   Todo el juego dibuja con UN SOLO tipo de material: basico con
   color por vertice. En Madness no hay luces: los personajes son
   siluetas planas recortadas, y el volumen lo da el dibujo, no el
   sombreado. Asi que la sombra de cada cara se hornea en el color
   del vertice cuando se construye la malla y el motor no calcula
   iluminacion ni una sola vez. En un Adreno 610 eso es la
   diferencia entre 60 y 35 fotogramas.
   ============================================================= */
(function (global) {
  'use strict';

  const U = {};

  /* ---------------- Matematicas ---------------- */
  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smoothstep = (t) => t * t * (3 - 2 * t);
  U.sign = (v) => (v < 0 ? -1 : 1);

  // Interpolacion independiente de los fotogramas por segundo:
  // con lerp(a,b,0.2) por fotograma, a 30 fps se llega a la mitad
  // de velocidad que a 60. Esto no.
  U.damp = (cur, target, rate, dt) =>
    target + (cur - target) * Math.exp(-rate * dt);

  // Acercarse a un valor a velocidad constante, sin pasarse
  U.approach = (cur, target, step) => {
    const d = target - cur;
    if (Math.abs(d) <= step) return target;
    return cur + Math.sign(d) * step;
  };

  // Diferencia de angulos por el camino corto
  U.angDiff = (a, b) => {
    let d = (b - a) % U.TAU;
    if (d > Math.PI) d -= U.TAU;
    if (d < -Math.PI) d += U.TAU;
    return d;
  };

  U.angLerp = (a, b, t) => a + U.angDiff(a, b) * t;

  /* ---------------- Azar reproducible ----------------
     Un generador propio (xorshift) en vez de Math.random: el mismo
     numero de semilla da siempre la misma arena, asi que un fallo
     se puede repetir tantas veces como haga falta. */
  U.makeRNG = (seed) => {
    let s = (seed >>> 0) || 0x9e3779b9;
    const rng = () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
    rng.range = (a, b) => a + rng() * (b - a);
    rng.int = (a, b) => Math.floor(a + rng() * (b - a + 1));
    rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
    rng.chance = (p) => rng() < p;
    rng.sign = () => (rng() < 0.5 ? -1 : 1);
    return rng;
  };

  U.rng = U.makeRNG(0x4d41444e);   // "MADN"

  /* =============================================================
     CONSTRUCTOR DE MALLAS

     Acumula cajas, cilindros y esferas achatadas en un unico
     buffer con posicion, normal y color. Una llamada a build()
     devuelve una BufferGeometry lista: cientos de piezas, un solo
     draw call.

     Con skin(i) activado, cada vertice que se anada a partir de
     ese momento queda atado al hueso i con peso 1. Es lo que
     permite que un personaje entero -cabeza, torso, brazos,
     manos, piernas- sea UNA malla animada por huesos en vez de
     catorce objetos colgando unos de otros.
     ============================================================= */
  const _c = new THREE.Color();

  /* =============================================================
     LA LUZ HORNEADA

     El juego dibuja con material basico: la tarjeta no calcula ni
     una sola luz. Pero un muñeco sin volumen parece un recorte de
     carton, y Madness -pese a ser plano- SI tiene volumen: el
     render de referencia esta iluminado desde arriba a la
     izquierda y un poco de frente, con la coronilla clara y una
     media luna de sombra bajo el menton.

     Asi que la luz se calcula UNA VEZ, al construir la malla, y se
     guarda en el color de cada vertice. Volumen de verdad, coste
     cero en cada fotograma. La contrapartida es que la sombra no
     gira con el personaje; en un juego de camara fija y estetica
     de dibujo, eso no se nota (y de hecho ayuda: la cara siempre
     se lee igual de bien mire a donde mire).
     ============================================================= */
  /* LA LUZ DE LA SALA: arriba, a la derecha y algo de frente, en
     coordenadas DEL MUNDO. Los decorados se construyen en el mundo, asi
     que el horneado de abajo ya les da esta luz tal cual; los cuerpos
     la usan en el shader con sus normales deformadas y giradas (ver
     Art.aplicarEscalonesMundo), asi que un personaje y el barril que
     tiene al lado se sombrean del mismo lado. De frente a camara sale
     la media luna de abajo a la izquierda de la hoja de turnaround. */
  const LUZ = (() => {
    const x = 0.44, y = 0.74, z = 0.51;
    const l = Math.hypot(x, y, z);
    return { x: x / l, y: y / l, z: z / l };
  })();
  U.LUZ = LUZ;

  /* Devuelve CUANTA luz recibe la cara, de 0 a 1. No un factor de
     color: el escalonado lo hace el material, ya en pantalla, para
     que el borde entre luz y sombra sea una curva limpia y no el
     canto de un triangulo. */
  U.luzDe = (nx, ny, nz) => {
    const d = nx * LUZ.x + ny * LUZ.y + nz * LUZ.z;
    return 0.5 + 0.5 * d;
  };
  /* Lo que se pinta plano -tinta, calcomanias- entra en el escalon del
     medio, ni iluminado ni en sombra. Va marcado con un valor NEGATIVO,
     que ninguna cara iluminada puede dar: el material de los cuerpos
     calcula su luz en el mundo y necesita saber que vertices no llevan
     luz, y un 0,70 a secas se confundia con una cara que da ese valor.
     Los dos materiales lo leen como 0,70 (ver Art.aplicarEscalones). */
  U.LUZ_PLANA = -1;

  class MeshBuilder {
    constructor(opts) {
      opts = opts || {};
      this.pos = [];
      this.nor = [];
      this.col = [];
      this.luz = [];
      this.idx = [];
      this.uv = opts.uv ? [] : null;      // coordenadas de textura, si las hay
      this.skinIdx = opts.skinned ? [] : null;
      this.skinWgt = opts.skinned ? [] : null;
      this.bone = 0;
      this.n = 0;
      // transformacion en curso (desplazamiento y giro en Y/X/Z)
      this._m = new THREE.Matrix4();
      this._stack = [];
      this._useM = false;
      this._v = new THREE.Vector3();
    }

    /* --- Hueso al que se atan los siguientes vertices --- */
    skin(boneIndex) { this.bone = boneIndex; return this; }

    /* --- Pila de transformaciones --- */
    push() { this._stack.push(this._m.clone()); return this; }
    pop() {
      this._m = this._stack.pop() || new THREE.Matrix4();
      this._useM = this._stack.length > 0 || !this._isIdentity();
      return this;
    }
    _isIdentity() {
      const e = this._m.elements;
      return e[0] === 1 && e[5] === 1 && e[10] === 1 &&
             e[12] === 0 && e[13] === 0 && e[14] === 0;
    }
    translate(x, y, z) {
      this._m.multiply(new THREE.Matrix4().makeTranslation(x, y, z));
      this._useM = true; return this;
    }
    rotateX(a) { this._m.multiply(new THREE.Matrix4().makeRotationX(a)); this._useM = true; return this; }
    rotateY(a) { this._m.multiply(new THREE.Matrix4().makeRotationY(a)); this._useM = true; return this; }
    rotateZ(a) { this._m.multiply(new THREE.Matrix4().makeRotationZ(a)); this._useM = true; return this; }

    _vert(x, y, z, nx, ny, nz, r, g, b, luz) {
      if (this._useM) {
        this._v.set(x, y, z).applyMatrix4(this._m);
        x = this._v.x; y = this._v.y; z = this._v.z;
        this._v.set(nx, ny, nz).transformDirection(this._m);
        nx = this._v.x; ny = this._v.y; nz = this._v.z;
      }
      this.pos.push(x, y, z);
      this.nor.push(nx, ny, nz);
      this.col.push(r, g, b);
      this.luz.push(luz === undefined ? U.luzDe(nx, ny, nz) : luz);
      if (this.skinIdx) {
        this.skinIdx.push(this.bone, 0, 0, 0);
        this.skinWgt.push(1, 0, 0, 0);
      }
      return this.n++;
    }

    _rgb(hex, mul) {
      _c.setHex(hex);
      if (mul !== 1) { _c.r *= mul; _c.g *= mul; _c.b *= mul; }
      return [_c.r, _c.g, _c.b];
    }

    addQuad(p0, p1, p2, p3, hex, mul, sinLuz) {
      mul = mul === undefined ? 1 : mul;
      const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
      const bx = p3[0] - p0[0], by = p3[1] - p0[1], bz = p3[2] - p0[2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const L = sinLuz ? U.LUZ_PLANA : U.luzDe(nx, ny, nz);
      const c = this._rgb(hex, mul);
      const a = this._vert(p0[0], p0[1], p0[2], nx, ny, nz, c[0], c[1], c[2], L);
      const b = this._vert(p1[0], p1[1], p1[2], nx, ny, nz, c[0], c[1], c[2], L);
      const d = this._vert(p2[0], p2[1], p2[2], nx, ny, nz, c[0], c[1], c[2], L);
      const e = this._vert(p3[0], p3[1], p3[2], nx, ny, nz, c[0], c[1], c[2], L);
      this.idx.push(a, b, d, a, d, e);
      return this;
    }

    addTri(p0, p1, p2, hex, mul, sinLuz) {
      mul = mul === undefined ? 1 : mul;
      const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
      const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const L = sinLuz ? U.LUZ_PLANA : U.luzDe(nx, ny, nz);
      const c = this._rgb(hex, mul);
      const a = this._vert(p0[0], p0[1], p0[2], nx, ny, nz, c[0], c[1], c[2], L);
      const b = this._vert(p1[0], p1[1], p1[2], nx, ny, nz, c[0], c[1], c[2], L);
      const d = this._vert(p2[0], p2[1], p2[2], nx, ny, nz, c[0], c[1], c[2], L);
      this.idx.push(a, b, d);
      return this;
    }

    /* Caja centrada en (x,y,z).
       opts.shade multiplica el color base; opts.faces permite
       ahorrar caras que nunca se ven (las de dentro del cuerpo).
       opts.top/side/bottom dan tonos distintos por cara: es el
       "dibujo" que sustituye a la iluminacion. */
    /* Caja centrada en (x,y,z). El tono de cada cara lo pone la
       luz horneada; opts.shade multiplica el color base y
       opts.luz=false lo deja plano (calcomanias, la cruz de la
       cara, los visores: cosas dibujadas, no modeladas).
       opts.skip ahorra caras que nunca se ven. */
    addBox(w, h, d, x, y, z, hex, opts) {
      opts = opts || {};
      const s = opts.shade === undefined ? 1 : opts.shade;
      const sl = opts.luz === false;
      const skip = opts.skip || '';
      const hw = w * 0.5, hh = h * 0.5, hd = d * 0.5;
      const X0 = x - hw, X1 = x + hw;
      const Y0 = y - hh, Y1 = y + hh;
      const Z0 = z - hd, Z1 = z + hd;
      if (skip.indexOf('F') < 0) this.addQuad([X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1], hex, s, sl);
      if (skip.indexOf('B') < 0) this.addQuad([X1, Y0, Z0], [X0, Y0, Z0], [X0, Y1, Z0], [X1, Y1, Z0], hex, s, sl);
      if (skip.indexOf('R') < 0) this.addQuad([X1, Y0, Z1], [X1, Y0, Z0], [X1, Y1, Z0], [X1, Y1, Z1], hex, s, sl);
      if (skip.indexOf('L') < 0) this.addQuad([X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0], hex, s, sl);
      if (skip.indexOf('U') < 0) this.addQuad([X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0], [X0, Y1, Z0], hex, s, sl);
      if (skip.indexOf('D') < 0) this.addQuad([X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, Z1], [X0, Y0, Z1], hex, s, sl);
      return this;
    }

    /* Tubo de seccion variable: el torso.

       En Madness el cuerpo no es una caja ni una capsula, es una
       campana: hombros caidos y redondeados, costados casi rectos
       y el bajo del peto ensanchando un poco. Se describe con una
       lista de secciones [y, medioAncho, medioFondo, z, tono] y el
       constructor las cose. La z de cada seccion es lo que permite
       que el tubo se incline o se jorobe: el torso de un grunt no
       es una columna recta, echa la espalda hacia atras segun
       sube. Cada anillo es un rectangulo
       redondeado (superelipse), que es lo que da la silueta
       mullida del dibujo sin gastar triangulos en una curva.  */
    addTubo(secs, hex, opts) {
      opts = opts || {};
      const N = opts.lados || 8;
      const s = opts.shade === undefined ? 1 : opts.shade;
      const pot = 2 / (opts.redondez || 3.2);
      const anillos = [];

      // direcciones del anillo, calculadas una sola vez
      const dx = [], dz = [];
      for (let i = 0; i < N; i++) {
        const th = (i / N) * U.TAU + Math.PI / N;
        const c = Math.cos(th), sn = Math.sin(th);
        dx.push(Math.sign(c) * Math.pow(Math.abs(c), pot));
        dz.push(Math.sign(sn) * Math.pow(Math.abs(sn), pot));
      }

      for (let r = 0; r < secs.length; r++) {
        const y = secs[r][0], hw = secs[r][1], hd = secs[r][2];
        const zc = secs[r][3] === undefined ? 0 : secs[r][3];
        const sh = secs[r][4] === undefined ? 1 : secs[r][4];
        const fila = [];
        for (let i = 0; i < N; i++) {
          // secs[r][5]: el color de esa fila (un corte de color: la fila repetida)
          const c = this._rgb(secs[r][5] === undefined ? hex : secs[r][5], s * sh);
          fila.push(this._vert(dx[i] * hw, y, zc + dz[i] * hd,
                               dx[i], 0, dz[i], c[0], c[1], c[2]));
        }
        anillos.push(fila);
      }

      const i0 = this.idx.length;
      for (let r = 0; r < anillos.length - 1; r++) {
        const A = anillos[r], B = anillos[r + 1];
        for (let i = 0; i < N; i++) {
          const j = (i + 1) % N;
          this.idx.push(A[i], B[i], B[j]);
          this.idx.push(A[i], B[j], A[j]);
        }
      }
      this._normalesSuaves(anillos, i0);

      if (opts.tapas !== false) {
        const ab = secs[0], ar = secs[secs.length - 1];
        const cb = opts.tapaBaja !== undefined ? this._rgb(opts.tapaBaja, 1) : this._rgb(hex, s);
        const ct = this._rgb(ar[5] === undefined ? hex : ar[5], s);
        const vB = this._vert(0, ab[0], ab[3] || 0, 0, -1, 0, cb[0], cb[1], cb[2]);
        const vT = this._vert(0, ar[0], ar[3] || 0, 0, 1, 0, ct[0], ct[1], ct[2]);
        const A0 = anillos[0], AN = anillos[anillos.length - 1];
        /* Las tapas miran HACIA FUERA: la de abajo al suelo y la de
           arriba al techo. Estaban las dos al reves -comprobado con el
           producto vectorial: la de arriba daba la normal hacia abajo-,
           asi que la tarjeta las descartaba por cara trasera y quedaba
           un AGUJERO por el que se veia el negro de la tinta de dentro:
           el hoyo negro en la cupula del torso al mirar al suelo, y el
           bajo del peto hueco. */
        for (let i = 0; i < N; i++) {
          const j = (i + 1) % N;
          this.idx.push(vB, A0[i], A0[j]);
          this.idx.push(vT, AN[j], AN[i]);
        }
      }
      return this;
    }

    /* LAS NORMALES DEL TUBO, SACADAS DE SU FORMA.

       Cada anillo llevaba la normal HORIZONTAL, la misma en el bajo que
       en la cupula de la espalda, que casi mira al techo. Con la luz
       horneada no se notaba; con la luz de la sala, la cupula quedaba
       sombreada como un costado y, al inclinarse el muñeco, la tapa de
       arriba -un abanico con la normal hacia arriba en el centro-
       enseñaba sus triangulos: el triangulo oscuro sobre el torso.

       Aqui cada vertice se queda con la media de las caras que lo
       tocan, pesada por area. Los anillos repetidos a la misma altura
       -un corte de color- dan caras de area cero y no cuentan. */
    _normalesSuaves(anillos, i0) {
      const P = this.pos, Nn = this.nor, I = this.idx;
      const acc = new Map();
      for (const fila of anillos) for (const v of fila) acc.set(v, [0, 0, 0]);
      for (let f = i0; f < I.length; f += 3) {
        const a = I[f], b = I[f + 1], c = I[f + 2];
        const ax = P[b * 3] - P[a * 3], ay = P[b * 3 + 1] - P[a * 3 + 1], az = P[b * 3 + 2] - P[a * 3 + 2];
        const bx = P[c * 3] - P[a * 3], by = P[c * 3 + 1] - P[a * 3 + 1], bz = P[c * 3 + 2] - P[a * 3 + 2];
        const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        for (const v of [a, b, c]) {
          const q = acc.get(v);
          if (q) { q[0] += nx; q[1] += ny; q[2] += nz; }
        }
      }
      /* Un anillo repetido -el corte de color- tiene dos copias de cada
         vertice en el mismo sitio, cada una con solo las caras de su
         lado. Se suman por posicion para que el corte no parta la luz. */
      const clave = (v) => P[v * 3].toFixed(4) + ',' + P[v * 3 + 1].toFixed(4) + ',' + P[v * 3 + 2].toFixed(4);
      const porSitio = new Map();
      for (const [v, q] of acc) {
        const k = clave(v), t = porSitio.get(k);
        if (t) { t[0] += q[0]; t[1] += q[1]; t[2] += q[2]; } else porSitio.set(k, q.slice());
      }
      for (const v of acc.keys()) {
        const q = porSitio.get(clave(v));
        const l = Math.hypot(q[0], q[1], q[2]);
        if (l < 1e-12) continue;
        Nn[v * 3] = q[0] / l; Nn[v * 3 + 1] = q[1] / l; Nn[v * 3 + 2] = q[2] / l;
        if (this.luz[v] >= 0) this.luz[v] = U.luzDe(q[0] / l, q[1] / l, q[2] / l);
      }
    }

    /* -------------------------------------------------------------
       BARRIDO DE UN PERFIL LIBRE

       addTubo solo sabe hacer secciones simetricas -una superelipse
       con dos radios-. Sirve para un brazo o una bota, pero no para
       una mano: la mano tiene un PULGAR, o sea un bulto en un solo
       costado, y eso no es una superelipse.

       Y el apaño de montarla con varias piezas solapadas es lo que
       destrozaba el contorno. La tinta de este juego es un casco
       hinchado dibujado por dentro; si la mano son cuatro piezas,
       son CUATRO cascos, y donde una pieza se mete en otra el casco
       negro de la primera aparece por delante de la superficie de
       color de la segunda. El resultado eran cuñas negras dentro de
       la silueta y una linea exterior dentada.

       Con esto se barre un perfil punto a punto, asi que cualquier
       pieza -por rara que sea- sale como UNA SOLA superficie
       cerrada: un casco, una linea, y por dentro no puede entrar
       nada negro porque no hay junta por donde entre.

       anillos: [ [ [x,y,z,hex?], ... M puntos ], ... N anillos ]
       Todos los anillos con los MISMOS M puntos, en sentido
       antihorario visto desde el final del barrido.
       ------------------------------------------------------------- */
    addAro(anillos, hex, opts) {
      opts = opts || {};
      const s = opts.shade === undefined ? 1 : opts.shade;
      const sl = opts.luz === false;
      const N = anillos.length, M = anillos[0].length;

      /* Normales suaves: en cada vertice se cruza la tangente a lo
         largo del anillo con la tangente a lo largo del barrido. Sin
         esto, el sombreado por escalones marca cada faceta y la
         pieza parece tallada a machetazos. */
      const nor = [];
      for (let r = 0; r < N; r++) {
        nor.push([]);
        const A = anillos[r];
        const P = anillos[r > 0 ? r - 1 : 0], Q = anillos[r < N - 1 ? r + 1 : N - 1];
        for (let i = 0; i < M; i++) {
          const a1 = A[(i + 1) % M], a0 = A[(i - 1 + M) % M];
          const tx = a1[0] - a0[0], ty = a1[1] - a0[1], tz = a1[2] - a0[2];
          const ux = Q[i][0] - P[i][0], uy = Q[i][1] - P[i][1], uz = Q[i][2] - P[i][2];
          let nx = ty * uz - tz * uy, ny = tz * ux - tx * uz, nz = tx * uy - ty * ux;
          const L = Math.hypot(nx, ny, nz);
          if (L < 1e-9) { nx = a1[0] - a0[0]; ny = 0; nz = a1[2] - a0[2]; }
          const L2 = Math.hypot(nx, ny, nz) || 1;
          nor[r].push([nx / L2, ny / L2, nz / L2]);
        }
      }

      const idx = [];
      for (let r = 0; r < N; r++) {
        idx.push([]);
        for (let i = 0; i < M; i++) {
          const p = anillos[r][i], n = nor[r][i];
          const c = this._rgb(p[3] === undefined ? hex : p[3], s);
          idx[r].push(this._vert(p[0], p[1], p[2], n[0], n[1], n[2],
                                 c[0], c[1], c[2], sl ? U.LUZ_PLANA : undefined));
        }
      }
      /* Con los anillos en sentido antihorario visto desde el final
         del barrido, ESTE es el orden que deja las caras mirando
         hacia afuera. Al reves, la malla se dibuja del reves: la
         pasada de color se descarta entera por cara trasera y la
         pieza sale como una mancha negra -solo se ve el contorno,
         que dibuja por dentro-. */
      for (let r = 0; r < N - 1; r++) {
        const A = idx[r], B = idx[r + 1];
        for (let i = 0; i < M; i++) {
          const j = (i + 1) % M;
          this.idx.push(A[i], B[j], B[i]);
          this.idx.push(A[i], A[j], B[j]);
        }
      }

      if (opts.tapas !== false) {
        for (const extremo of [0, N - 1]) {
          const A = anillos[extremo];
          let cx = 0, cy = 0, cz = 0;
          for (let i = 0; i < M; i++) { cx += A[i][0]; cy += A[i][1]; cz += A[i][2]; }
          cx /= M; cy /= M; cz /= M;
          const fin = extremo === N - 1;
          const otro = anillos[fin ? N - 2 : 1];
          let ox = 0, oy = 0, oz = 0;
          for (let i = 0; i < M; i++) { ox += otro[i][0]; oy += otro[i][1]; oz += otro[i][2]; }
          let nx = cx - ox / M, ny = cy - oy / M, nz = cz - oz / M;
          const L = Math.hypot(nx, ny, nz) || 1;
          nx /= L; ny /= L; nz /= L;
          const c = this._rgb(A[0][3] === undefined ? hex : A[0][3], s);
          const cv = this._vert(cx, cy, cz, nx, ny, nz, c[0], c[1], c[2],
                                sl ? U.LUZ_PLANA : undefined);
          const anillo = idx[extremo];
          for (let i = 0; i < M; i++) {
            const j = (i + 1) % M;
            if (fin) this.idx.push(cv, anillo[i], anillo[j]);
            else this.idx.push(cv, anillo[j], anillo[i]);
          }
        }
      }
      return this;
    }

    /* Elipsoide de pocos gajos: la cabeza. seg x rings controla el
       coste; con 10 x 6 son 120 triangulos y la silueta ya es
       limpia a la distancia de camara del juego. */
    addEllipsoid(rx, ry, rz, x, y, z, hex, opts) {
      opts = opts || {};
      const seg = opts.seg || 10, rings = opts.rings || 6;
      const s = opts.shade === undefined ? 1 : opts.shade;
      const grid = [];
      for (let r = 0; r <= rings; r++) {
        const v = r / rings, phi = v * Math.PI;
        const row = [];
        for (let i = 0; i <= seg; i++) {
          const u = i / seg, th = u * U.TAU;
          const sx = Math.sin(phi) * Math.cos(th);
          const sy = Math.cos(phi);
          const sz = Math.sin(phi) * Math.sin(th);
          const mul = s;
          const c = this._rgb(hex, mul);
          row.push(this._vert(x + sx * rx, y + sy * ry, z + sz * rz,
                              sx, sy, sz, c[0], c[1], c[2]));
        }
        grid.push(row);
      }
      for (let r = 0; r < rings; r++) {
        for (let i = 0; i < seg; i++) {
          const a = grid[r][i], b = grid[r][i + 1];
          const c = grid[r + 1][i], d = grid[r + 1][i + 1];
          if (r !== 0) this.idx.push(a, b, c);
          if (r !== rings - 1) this.idx.push(b, d, c);
        }
      }
      return this;
    }

    /* Cilindro en pie (eje Y). Brazos, canones, barriles. */
    addCyl(rTop, rBot, h, seg, x, y, z, hex, opts) {
      opts = opts || {};
      const s = opts.shade === undefined ? 1 : opts.shade;
      const caps = opts.caps === undefined ? true : opts.caps;
      const hh = h * 0.5;
      const top = [], bot = [];
      for (let i = 0; i <= seg; i++) {
        const th = (i / seg) * U.TAU;
        const cx = Math.cos(th), cz = Math.sin(th);
        const mul = s;
        const c = this._rgb(hex, mul);
        top.push(this._vert(x + cx * rTop, y + hh, z + cz * rTop, cx, 0, cz, c[0], c[1], c[2]));
        bot.push(this._vert(x + cx * rBot, y - hh, z + cz * rBot, cx, 0, cz, c[0], c[1], c[2]));
      }
      for (let i = 0; i < seg; i++) {
        this.idx.push(top[i], bot[i + 1], bot[i]);
        this.idx.push(top[i], top[i + 1], bot[i + 1]);
      }
      if (caps) {
        const ct = this._rgb(hex, s), cb = this._rgb(hex, s);
        const cT = this._vert(x, y + hh, z, 0, 1, 0, ct[0], ct[1], ct[2]);
        const cB = this._vert(x, y - hh, z, 0, -1, 0, cb[0], cb[1], cb[2]);
        for (let i = 0; i < seg; i++) {
          this.idx.push(cT, top[i + 1], top[i]);
          this.idx.push(cB, bot[i], bot[i + 1]);
        }
      }
      return this;
    }

    /* Une otra malla ya construida aplicando la transformacion en
       curso. Sirve para montar un arma dentro del cuerpo. */
    merge(other) {
      const base = this.n;
      for (let i = 0; i < other.n; i++) {
        this._vert(other.pos[i * 3], other.pos[i * 3 + 1], other.pos[i * 3 + 2],
                   other.nor[i * 3], other.nor[i * 3 + 1], other.nor[i * 3 + 2],
                   other.col[i * 3], other.col[i * 3 + 1], other.col[i * 3 + 2]);
      }
      for (let i = 0; i < other.idx.length; i++) this.idx.push(base + other.idx[i]);
      return this;
    }

    count() { return this.idx.length / 3; }

    build() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.setAttribute('aLuz', new THREE.Float32BufferAttribute(this.luz, 1));
      if (this.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      if (this.skinIdx) {
        g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.skinIdx, 4));
        g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.skinWgt, 4));
      }
      g.setIndex(this.idx.length > 65535
        ? new THREE.Uint32BufferAttribute(this.idx, 1)
        : new THREE.Uint16BufferAttribute(this.idx, 1));
      g.computeBoundingSphere();
      return g;
    }
  }

  U.MeshBuilder = MeshBuilder;
  U.builder = (opts) => new MeshBuilder(opts);

  /* =============================================================
     DEPOSITOS DE OBJETOS

     Nada se crea durante la partida. Casquillos, salpicaduras,
     numeros de dano y trozos de cuerpo salen de un deposito de
     tamano fijo; cuando se agota se reutiliza el mas viejo. El
     recolector de basura del movil no llega a despertarse, y eso
     evita los tirones de 40 ms que arruinan una pelea.
     ============================================================= */
  U.Pool = class Pool {
    constructor(size, make) {
      this.items = new Array(size);
      for (let i = 0; i < size; i++) {
        this.items[i] = make(i);
        this.items[i].alive = false;
      }
      this.size = size;
      this.cursor = 0;
    }
    take() {
      // primero uno libre
      for (let k = 0; k < this.size; k++) {
        const i = (this.cursor + k) % this.size;
        if (!this.items[i].alive) {
          this.cursor = (i + 1) % this.size;
          this.items[i].alive = true;
          return this.items[i];
        }
      }
      // todos ocupados: se roba el mas antiguo
      const it = this.items[this.cursor];
      this.cursor = (this.cursor + 1) % this.size;
      it.alive = true;
      return it;
    }
    forEach(fn) {
      for (let i = 0; i < this.size; i++) if (this.items[i].alive) fn(this.items[i], i);
    }
    clear(fn) {
      for (let i = 0; i < this.size; i++) {
        if (this.items[i].alive && fn) fn(this.items[i]);
        this.items[i].alive = false;
      }
    }
  };

  /* Almacenamiento que no revienta si el navegador lo tiene cerrado
     (modo incognito, permisos restringidos en Android) */
  U.store = {
    get(key, def) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; }
      catch (e) { return false; }
    }
  };

  global.U = U;
})(window);

