/* =============================================================
   prendas3d.js -> LA ROPA NUEVA DE LA CABEZA, EN 3D: sombreros,
   anteojos y lo que va en la boca. Como las mascaras de accesorios.js,
   cada prenda es un objeto propio con el nombre del SWF (HatsAll 7363,
   MasksAll 7358, MouthsAll 7318) y se le pone a quien la lleve: el
   jugador desde la tienda, los enemigos segun equipLoadout (prendas.js).

   NO SON DIBUJOS PEGADOS. Del SWF sale la referencia -cada prenda sobre
   la cabeza del civ ('Parts - Head', 2708, con myHat / myMask / myMouth
   en su cuadro): donde apoya, cuanto baja, cuanto sale la visera, sus
   grises-, y el objeto se arma con volumen:

     casquete  lo que sigue la cabeza a unos milimetros: gorras, cascos,
               vinchas, pañuelos. Una malla sobre el ovalo entre dos
               lineas de elevacion, con su canto.
     torno     lo que se gira alrededor de un eje: galeras, bombines,
               alas. Un perfil (radio, altura) dado vuelta, con planta
               eliptica, inclinado y con el ala alabeada si hace falta.
     visera    la de las gorras: sale del borde del casquete hacia
               delante, afinando a los costados.
     lente     anteojos rigidos delante de los ojos (no pintados sobre
               la cara), con su marco, su puente y sus patillas.

   LOS GRISES son los del SWF pasados al juego como el resto del muñeco:
   x 0,77 (el peto del civ: 153 -> 118). Coordenadas del modelo del
   personaje: la cabeza es el ovalo de Chars.CARA con centro en
   (0, CARA.y, CABEZA_Z), la cara mira a +z y +x es su izquierda.
   ============================================================= */
(function (global) {
  'use strict';

  const Acc = global.Accesorios, MOD = Acc.MODELOS, Hh = Acc._h;
  const RAD = Math.PI / 180;
  const C = () => { const K = Chars.CARA; return { rx: K.rx, ry: K.ry, rz: K.rz, cy: K.y, cz: Chars.CABEZA_Z }; };
  /* un gris del SWF (0-255) pasado al juego, como el resto del muñeco: los
     oscuros x 0,77 (el peto del civ: 153 -> 118) y los claros subiendo
     hasta el blanco de la camisa (255 -> 245): la piel, 204, cae en 182
     (la del juego es 184). Con x 0,77 parejo el barbijo (224) salia mas
     oscuro que la cara, al reves que en el SWF. */
  const gris = (v) => Math.round(v <= 153 ? v * 0.77 : 118 + (v - 153) * 1.245);
  const sw = (v) => { const g = gris(v); return (g << 16) | (g << 8) | g; };
  const swc = (r, g, b) => (gris(r) << 16) | (gris(g) << 8) | gris(b);
  const NEGRO = 0x0a0a0a;

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const uni = (a) => { const L = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };
  const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  // un triangulo con la cara hacia 'f'
  function tri(B, i0, i1, i2, P0, P1, P2, f) {
    const n = cruz(sub(P1, P0), sub(P2, P0));
    if (dot(n, f) >= 0) B.idx.push(i0, i1, i2); else B.idx.push(i0, i2, i1);
  }

  /* LA CABEZA: el punto del ovalo en (az, el) -grados: az 0 delante y +
     hacia +x, el 0 en el ecuador-, 'd' metros por fuera (sumados a cada
     radio). e < 1 lo hace mas cuadrado (superelipsoide). */
  function sobre(az, el, d, e) {
    const c = C(), a = az * RAD, t = el * RAD;
    const p = (v) => Math.sign(v) * Math.pow(Math.abs(v), e || 1);
    const ce = Math.cos(t);
    return [(c.rx + d) * p(ce) * p(Math.sin(a)), c.cy + (c.ry + d) * p(Math.sin(t)), c.cz + (c.rz + d) * p(ce) * p(Math.cos(a))];
  }
  // el radio de la cabeza a la altura y (en x y en z)
  const radioA = (y) => { const c = C(), k = Math.sqrt(Math.max(0, 1 - Math.pow((y - c.cy) / c.ry, 2))); return [c.rx * k, c.rz * k]; };
  const elDeY = (y) => Math.asin(Math.max(-1, Math.min(1, (y - C().cy) / C().ry))) / RAD;
  const centro = () => [0, C().cy, C().cz];

  /* =============================================================
     CASQUETE: lo que sigue la cabeza.
       o.lo(az), o.hi(az)   de que elevacion a cual (grados); sin hi, hasta
                            la coronilla
       o.a0, o.a1           de que azimut a cual; sin ellos, la vuelta
       o.d(az, el) o o.d    a cuanto de la cabeza (m)
       o.color(az, el)      el gris de cada punto (o o.hex)
       o.e                  superelipsoide (< 1: mas cuadrado)
     Su canto -negro, como el trazo del SWF- baja hasta 1,2 cm dentro de
     la cabeza. La tinta: la misma pieza g mas afuera, g mas larga por los
     bordes, con los vertices compartidos (sin grietas).
     ============================================================= */
  function casquete(B, o, g, silueta) {
    const c = C(), vuelta = o.a0 === undefined;
    const a0 = vuelta ? -180 : o.a0, a1 = vuelta ? 180 : o.a1;
    const M = o.M || 40, N = o.N || 12, e = o.e || 1;
    const dD = typeof o.d === 'function' ? o.d : () => (o.d === undefined ? 0.012 : o.d);
    /* LA TINTA NO SE ESTIRA POR LOS BORDES: los bordes de un casquete
       apoyan en la cabeza, no son silueta. Estirada 1,6 cm, su canto caia
       corrido del borde de la pieza y quedaba una raya suelta, con una
       franja clara entre las dos (la vincha, arriba y abajo). Solo se
       infla hacia fuera: su canto coincide con el de la pieza y se suma
       al trazo negro del borde. */
    const gE = silueta ? g : 0, ext = 0;
    const hiF = o.hi || (() => 90), abierto = !!o.hi;
    const cols = vuelta ? M : M + 1;
    const azDe = (i) => a0 + (a1 - a0) * i / M;
    const P = [], A = [];
    for (let j = 0; j <= N; j++) {
      const fila = [], fa = [];
      for (let i = 0; i < cols; i++) {
        const az = azDe(i);
        const l = o.lo(az) - ext, h = abierto ? hiF(az) + ext : 90;
        // mas apretado cerca del borde de abajo (ahi se curva lo que importa)
        const t = j / N, el = l + (h - l) * (abierto ? t : Math.sin(t * Math.PI / 2));
        fila.push(sobre(az, el, dD(az, el) + gE, e)); fa.push([az, el]);
      }
      P.push(fila); A.push(fa);
    }
    const O = centro();
    const nor = (j, i) => {
      const iL = vuelta ? (i - 1 + cols) % cols : Math.max(0, i - 1), iR = vuelta ? (i + 1) % cols : Math.min(cols - 1, i + 1);
      const jD = Math.max(0, j - 1), jU = Math.min(N, j + 1);
      let n = cruz(sub(P[j][iR], P[j][iL]), sub(P[jU][i], P[jD][i]));
      const L = Math.hypot(n[0], n[1], n[2]);
      if (L < 1e-9) n = sub(P[j][i], O);
      n = uni(n);
      if (dot(n, sub(P[j][i], O)) < 0) n = [-n[0], -n[1], -n[2]];
      return n;
    };
    const ids = P.map((fila, j) => fila.map((p, i) => {
      const n = nor(j, i), [az, el] = A[j][i];
      const k = silueta ? [0, 0, 0] : B._rgb(o.color ? o.color(az, el) : o.hex, 1);
      return B._vert(p[0], p[1], p[2], n[0], n[1], n[2], k[0], k[1], k[2]);
    }));
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < (vuelta ? cols : cols - 1); i++) {
        const i2 = (i + 1) % cols;
        const f = sub(P[j][i], O);
        tri(B, ids[j][i], ids[j][i2], ids[j + 1][i2], P[j][i], P[j][i2], P[j + 1][i2], f);
        tri(B, ids[j][i], ids[j + 1][i2], ids[j + 1][i], P[j][i], P[j + 1][i2], P[j + 1][i], f);
      }
    }
    // los cantos: del borde de fuera a dentro de la cabeza
    const dIn = (o.dentro === undefined ? -0.012 : o.dentro) - gE;
    const kc = silueta ? [0, 0, 0] : B._rgb(o.canto === undefined ? NEGRO : o.canto, 1);
    const canto = (bordes, fuera) => {
      let prev = null;
      for (const [j, i] of bordes) {
        const [az, el] = A[j][i], pf = P[j][i], pi = sobre(az, el, dIn, e);
        const n = fuera(j, i);
        const par = silueta ? [ids[j][i], B._vert(pi[0], pi[1], pi[2], n[0], n[1], n[2], 0, 0, 0)]
          : [B._vert(pf[0], pf[1], pf[2], n[0], n[1], n[2], kc[0], kc[1], kc[2]), B._vert(pi[0], pi[1], pi[2], n[0], n[1], n[2], kc[0], kc[1], kc[2])];
        if (prev) {
          tri(B, prev[2][0], par[0], par[1], prev[0], pf, pi, n);
          tri(B, prev[2][0], par[1], prev[2][1], prev[0], pi, prev[1], n);
        }
        prev = [pf, pi, par];
      }
    };
    const abajo = (j, i) => { const u = sub(P[0][i], P[1][i]); return uni(u); };
    const arriba = (j, i) => { const u = sub(P[N][i], P[N - 1][i]); return uni(u); };
    const filaDe = (j) => { const L = []; for (let i = 0; i < cols; i++) L.push([j, i]); if (vuelta) L.push([j, 0]); return L; };
    canto(filaDe(0), abajo);
    if (abierto) canto(filaDe(N), arriba);
    if (!vuelta) {
      const lado = (i, s) => (j) => { const q = sub(P[j][i], P[j][i - s]); return uni(q); };
      const colDe = (i) => { const L = []; for (let j = 0; j <= N; j++) L.push([j, i]); return L; };
      canto(colDe(0), (j) => lado(0, -1)(j));
      canto(colDe(cols - 1), (j) => lado(cols - 1, 1)(j));
    }
  }

  /* =============================================================
     TORNO: un perfil girado alrededor de un eje vertical.
       perfil [[r, y, hex], ...]: r desde el eje e y hacia arriba, en el
         marco del sombrero; hex pinta el tramo que SALE de ese punto. Se
         recorre de la coronilla hacia fuera y abajo, asi la normal de la
         izquierda del recorrido mira hacia fuera.
       o.x, o.y, o.z   donde va el pie del eje
       o.sx, o.sz      la planta eliptica (el radio por sx en x, por sz en z)
       o.incl, o.ladeo grados hacia delante (giro en x) y de costado (en z)
       o.alabeo(az, r, y) -> dy: el ala que sube o baja segun el lado
       o.M             lados
     Los tramos del perfil van con aristas vivas (el canto del ala, la
     esquina de la copa); alrededor del eje, suave. La tinta: el perfil
     corrido g hacia fuera, con los vertices compartidos.
     ============================================================= */
  function torno(B, perfil, o, g, silueta) {
    const M = o.M || 36, sx = o.sx || 1, sz = o.sz || 1;
    let pf = perfil;
    if (silueta) {
      // el perfil corrido g por la normal de cada punto (promedio de sus dos tramos)
      const nT = (a, b) => { const dr = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dr, dy) || 1; return [-dy / L, dr / L]; };
      pf = perfil.map((p, k) => {
        const na = k > 0 ? nT(perfil[k - 1], p) : null, nb = k < perfil.length - 1 ? nT(p, perfil[k + 1]) : null;
        let n = na && nb ? [na[0] + nb[0], na[1] + nb[1]] : (na || nb);
        const L = Math.hypot(n[0], n[1]) || 1; n = [n[0] / L, n[1] / L];
        /* el inglete, corto: en la punta de un ala fina (una vuelta de casi
           180 grados) uno largo sacaba el vertice 5 cm y la cascara negra se
           doblaba por encima del ala, pintandola entera */
        const cs = na && nb ? Math.max(0.8, (n[0] * na[0] + n[1] * na[1])) : 1;
        return [Math.max(0, p[0] + n[0] * g / cs), p[1] + n[1] * g / cs, p[2]];
      });
    }
    const al = o.alabeo || (() => 0);
    const loc = (r, y, az) => { const a = az * RAD; return [sx * r * Math.sin(a), y + al(az, r, y), sz * r * Math.cos(a)]; };
    B.push();
    B.translate(o.x || 0, o.y || 0, o.z || 0);
    if (o.giro) B.rotateY(o.giro * RAD);
    if (o.incl) B.rotateX(o.incl * RAD);
    if (o.ladeo) B.rotateZ(-o.ladeo * RAD);
    const azs = []; for (let j = 0; j < M; j++) azs.push(360 * j / M);
    const nPerfil = (a, b, az) => {
      // la normal de fuera del tramo a->b en 3D (la izquierda del recorrido)
      const dr = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dr, dy) || 1, nr = -dy / L, ny = dr / L, s = Math.sin(az * RAD), c2 = Math.cos(az * RAD);
      return uni([nr * s / sx, ny, nr * c2 / sz]);
    };
    if (silueta) {
      // vertices compartidos: uno por punto del perfil y lado
      const ids = pf.map((p, k) => azs.map((az, j) => {
        const a = pf[Math.max(0, k - 1)], b = pf[Math.min(pf.length - 1, k + 1)];
        let n = nPerfil(a, b, az);
        if (p[0] < 1e-6) n = [0, Math.sign(n[1]) || 1, 0];
        const q = loc(p[0], p[1], az);
        return { i: B._vert(q[0], q[1], q[2], n[0], n[1], n[2], 0, 0, 0), q, n };
      }));
      for (let k = 0; k < pf.length - 1; k++) {
        for (let j = 0; j < M; j++) {
          const j2 = (j + 1) % M, a = ids[k][j], b = ids[k][j2], cc = ids[k + 1][j2], d = ids[k + 1][j];
          const f = nPerfil(pf[k], pf[k + 1], azs[j] + 180 / M);
          tri(B, a.i, b.i, cc.i, a.q, b.q, cc.q, f);
          tri(B, a.i, cc.i, d.i, a.q, cc.q, d.q, f);
        }
      }
      B.pop();
      return;
    }
    /* LAS CURVAS, SUAVES: donde dos tramos del perfil siguen casi la misma
       direccion (menos de 35 grados), la normal del punto es una sola. Con
       aristas vivas en todos, una cupula de ocho tramos salia en bandas y los
       escalones de la luz la dibujaban dentada. Las esquinas de verdad (el
       canto del ala, la tapa de la copa) siguen vivas. */
    const suaveEn = pf.map((p, k) => {
      if (k === 0 || k === pf.length - 1) return false;
      const a = pf[k - 1], b = pf[k + 1], d1 = [p[0] - a[0], p[1] - a[1]], d2 = [b[0] - p[0], b[1] - p[1]];
      return (d1[0] * d2[0] + d1[1] * d2[1]) / ((Math.hypot(d1[0], d1[1]) * Math.hypot(d2[0], d2[1])) || 1) > Math.cos(35 * RAD);
    });
    for (let k = 0; k < pf.length - 1; k++) {
      const p0 = pf[k], p1 = pf[k + 1], hex = p0[2] === undefined ? o.hex : p0[2];
      const kc = B._rgb(hex, 1), luz = o.plano && o.plano(k) ? U.LUZ_PLANA : undefined;
      const f0 = [], f1 = [];
      for (let j = 0; j < M; j++) {
        const az = azs[j];
        // la normal de la cara, de sus dos direcciones (alrededor y a lo largo)
        const q0 = loc(p0[0], p0[1], az), q1 = loc(p1[0], p1[1], az);
        const e = 0.5, t0 = sub(loc(p0[0], p0[1], az + e), loc(p0[0], p0[1], az - e)), t1 = sub(loc(p1[0], p1[1], az + e), loc(p1[0], p1[1], az - e));
        const nf = nPerfil(p0, p1, az), a = sub(q1, q0);
        // en una curva (la cupula de una copa) la direccion a lo largo es la del punto, no la del tramo
        const lq = (m) => loc(pf[m][0], pf[m][1], az);
        const a0 = suaveEn[k] ? sub(lq(k + 1), lq(k - 1)) : a, a1 = suaveEn[k + 1] ? sub(lq(k + 2), lq(k)) : a;
        let n0 = p0[0] > 1e-6 ? uni(cruz(t0, a0)) : nf, n1 = p1[0] > 1e-6 ? uni(cruz(t1, a1)) : nf;
        if (dot(n0, nf) < 0) n0 = [-n0[0], -n0[1], -n0[2]];
        if (dot(n1, nf) < 0) n1 = [-n1[0], -n1[1], -n1[2]];
        f0.push({ i: B._vert(q0[0], q0[1], q0[2], n0[0], n0[1], n0[2], kc[0], kc[1], kc[2], luz), q: q0 });
        f1.push({ i: B._vert(q1[0], q1[1], q1[2], n1[0], n1[1], n1[2], kc[0], kc[1], kc[2], luz), q: q1 });
      }
      for (let j = 0; j < M; j++) {
        const j2 = (j + 1) % M, f = nPerfil(p0, p1, azs[j] + 180 / M);
        tri(B, f0[j].i, f0[j2].i, f1[j2].i, f0[j].q, f0[j2].q, f1[j2].q, f);
        tri(B, f0[j].i, f1[j2].i, f1[j].i, f0[j].q, f1[j2].q, f1[j].q, f);
      }
    }
    B.pop();
  }

  /* =============================================================
     VISERA: la de las gorras. Sale del borde de delante del casquete
     (o.lo, o.d: los del casquete) entre az0 y az1, 'largo' hacia delante
     en el medio y afinando a los costados; baja 'caida' grados; las
     puntas se curvan 'curva' metros hacia abajo. Arriba hex, abajo
     hexAbajo, el canto negro.
     ============================================================= */
  function visera(B, o, g, silueta) {
    const c = C(), NU = 16, NV = 5, gr = o.grueso || 0.014;
    const gE = silueta ? g : 0;
    const dD = typeof o.d === 'function' ? o.d : () => (o.d === undefined ? 0.012 : o.d);
    const fr = o.frente === undefined ? 0.85 : o.frente;
    /* NACE DEBAJO DEL CASQUETE, no en su canto: 2,5 grados mas arriba y
       1,2 cm por dentro. Arrancando en el canto, el grueso de la visera
       quedaba a la vista como un escalon suelto en cada punta. */
    const pt = (u, v, arriba) => {
      const az = lerp(o.az0, o.az1, u), el = o.lo(az) + 2.5 * (1 - v), b = sobre(az, el, dD(az, el) - 0.012, o.e);
      const a = az * RAD;
      /* hacia DELANTE, no hacia fuera: una visera sale derecha de la frente
         (radial, a los costados salia de canto hacia las orejas) */
      let dx = Math.sin(a) / c.rx * (1 - fr), dz = Math.cos(a) / c.rz * (1 - fr) + fr * 3;
      const L = Math.hypot(dx, dz); dx /= L; dz /= L;
      /* la tinta se afina con la visera: en las puntas, que se meten bajo
         la gorra, no hay silueta que rodear (con el grueso entero quedaba
         una cuña negra suelta en cada punta) */
      const s = 2 * u - 1, f = Math.max(0, 1 - s * s), largo = o.largo * Math.pow(f, o.punta || 0.5) + gE * Math.sqrt(f);
      const cd = (o.caida || 0) * RAD, r = largo * v;
      // el grueso tambien se va a cero en las puntas: ahi entra bajo el canto
      const tk = Math.min(1, 3 * f), gEf = gE * Math.sqrt(f);
      const y = b[1] - Math.sin(cd) * r - (o.curva || 0) * s * s * v * v + (arriba ? gEf : -gr * tk - gEf);
      return [b[0] + dx * Math.cos(cd) * r, y, b[2] + dz * Math.cos(cd) * r];
    };
    const kA = silueta ? [0, 0, 0] : B._rgb(o.hex, 1), kB = silueta ? [0, 0, 0] : B._rgb(o.hexAbajo === undefined ? o.hex : o.hexAbajo, 1);
    const kN = silueta ? [0, 0, 0] : B._rgb(NEGRO, 1);
    const cara = (arriba, k) => {
      const G = [];
      for (let j = 0; j <= NV; j++) {
        const fila = [];
        for (let i = 0; i <= NU; i++) {
          const u = i / NU, v = j / NV, p = pt(u, v, arriba);
          const n = uni(cruz(sub(pt(Math.min(1, u + 0.02), v, arriba), pt(Math.max(0, u - 0.02), v, arriba)),
                             sub(pt(u, Math.min(1, v + 0.05), arriba), pt(u, Math.max(0, v - 0.05), arriba))));
          const nn = (n[1] >= 0) === arriba ? n : [-n[0], -n[1], -n[2]];
          fila.push({ i: B._vert(p[0], p[1], p[2], nn[0], nn[1], nn[2], k[0], k[1], k[2]), p, n: nn });
        }
        G.push(fila);
      }
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
        const a = G[j][i], b = G[j][i + 1], cc = G[j + 1][i + 1], d = G[j + 1][i];
        tri(B, a.i, b.i, cc.i, a.p, b.p, cc.p, a.n); tri(B, a.i, cc.i, d.i, a.p, cc.p, d.p, a.n);
      }
      return G;
    };
    const T = cara(true, kA), Bo = cara(false, kB);
    // el canto de fuera (v = 1)
    for (let i = 0; i < NU; i++) {
      const u0 = i / NU, u1 = (i + 1) / NU;
      const q = [pt(u0, 1, true), pt(u1, 1, true), pt(u1, 1, false), pt(u0, 1, false)];
      const m = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2, (q[0][2] + q[1][2]) / 2];
      const f = sub(m, pt((u0 + u1) / 2, 0.8, true));
      if (silueta) {
        const a = T[NV][i], b = T[NV][i + 1], cc = Bo[NV][i + 1], d = Bo[NV][i];
        tri(B, a.i, b.i, cc.i, a.p, b.p, cc.p, f); tri(B, a.i, cc.i, d.i, a.p, cc.p, d.p, f);
      } else {
        const n = uni(f), v = q.map((p) => B._vert(p[0], p[1], p[2], n[0], n[1], n[2], kN[0], kN[1], kN[2]));
        tri(B, v[0], v[1], v[2], q[0], q[1], q[2], f); tri(B, v[0], v[2], v[3], q[0], q[2], q[3], f);
      }
    }
  }

  /* Una pieza de revolucion chica en cualquier eje (botones, perillas,
     copas de auriculares): un perfil (r, t) a lo largo de 'eje' desde p. */
  function pieza(B, perfil, p, eje, hex, g, silueta, M) {
    const e = uni(eje), ang = Math.acos(Math.max(-1, Math.min(1, e[1])));
    B.push();
    B.translate(p[0], p[1], p[2]);
    // el eje del torno (y) se lleva a 'e'
    const ax = uni([e[2], 0, -e[0]]);
    if (Math.hypot(e[0], e[2]) > 1e-6) B._m.multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(ax[0], ax[1], ax[2]), ang));
    else if (e[1] < 0) B.rotateX(Math.PI);
    B._useM = true;
    torno(B, perfil, { M: M || 18, hex }, g, silueta);
    B.pop();
  }

  /* =============================================================
     LOS SOMBREROS (HatsAll, 7363; puestos en 'Parts - Head' con myHat)
     ============================================================= */

  /* Las gorras: el casquete hasta la linea de la frente -mas baja atras-,
     el de la SWAT (hat1) con la copa cuadrada y la visera recta; la de
     beisbol (hat4) redonda, clara, con la visera curva y el boton. */
  const bordeGorra = (fr, at) => (az) => lerp(at, fr, (1 + Math.cos(az * RAD)) / 2);
  function gorra(o) {
    return function (B, g, silueta) {
      const lo = bordeGorra(o.frente, o.atras);
      const d = (az, el) => 0.012 + o.copa * suave(10, 80, el) * (0.6 + 0.4 * Math.cos(az * RAD * 0.5));
      casquete(B, { lo, d, e: o.e, color: o.color, hex: o.hex, M: 44, N: 14 }, g, silueta);
      visera(B, { az0: -o.ancho, az1: o.ancho, lo, d, e: o.e, largo: o.largo, caida: o.caida, curva: o.curva, punta: o.punta,
                  hex: o.hexVisera, hexAbajo: o.hexAbajo, grueso: 0.016 }, g, silueta);
      if (!silueta && o.boton) {
        const p = sobre(0, 90, d(0, 90) - 0.004, o.e);
        pieza(B, [[0, 0.018], [0.02, 0.012], [0.024, 0]], p, [0, 1, 0], o.boton, 0, false, 12);
      }
    };
  }
  // SWAT Cap: 49 la tela, 83 el panel de arriba, 44/60 la visera (hat1)
  MOD.hat1 = gorra({ frente: 21, atras: 5, copa: 0.03, e: 0.72, ancho: 52, largo: 0.2, caida: 6, curva: 0.012, punta: 0.6,
                     color: (az, el) => (el > 66 ? sw(83) : sw(49)), hexVisera: sw(60), hexAbajo: sw(44) });
  // Ballcap: 153 la copa, 102 la visera, 87 abajo (hat4)
  MOD.hat4 = gorra({ frente: 20, atras: 4, copa: 0.022, e: 0.95, ancho: 54, largo: 0.22, caida: 9, curva: 0.045, punta: 0.5,
                     color: () => sw(153), hexVisera: sw(102), hexAbajo: sw(87), boton: sw(120) });

  /* Sweatband (hat3): una vincha de 60, abombada, que cruza la frente por
     encima de los ojos y sube hacia la nuca. */
  MOD.hat3 = function (B, g, silueta) {
    const lo = (az) => lerp(46, 22, (1 + Math.cos(az * RAD)) / 2), hi = (az) => lo(az) + 17;
    casquete(B, { lo, hi, d: (az, el) => 0.006 + 0.014 * Math.sin(Math.PI * Math.max(0, Math.min(1, (el - lo(az)) / 17))),
                  hex: sw(60), M: 48, N: 6 }, g, silueta);
  };

  /* Leon Cap (hat2): gorro de lana de 69, caido hacia atras -un bulto que
     cuelga sobre la nuca- con el puño de abajo mas oscuro (51). */
  MOD.hat2 = function (B, g, silueta) {
    const lo = bordeGorra(24, 0);
    // lo caido: un bulto detras, entre la coronilla y la nuca, que la lana hace colgar
    const bulto = (az, el) => {
      const atras = Math.max(0, -Math.cos(az * RAD)), costado = Math.pow(Math.abs(Math.sin(az * RAD)), 2);
      return 0.13 * Math.pow(atras, 1.2) * Math.exp(-Math.pow((el - 38) / 28, 2)) * (1 - 0.35 * costado);
    };
    /* el cuerpo arranca 1 grado DEBAJO del puño (que es mas grueso): su canto
       queda tapado y el borde que se ve es uno solo, el del puño. Con los
       dos cantos a la vista salian dos rayas y una franja clara entre ellas. */
    casquete(B, { lo: (az) => lo(az) + 5, d: (az, el) => 0.018 + (bulto(az, el) + 0.012 * suave(40, 90, el)) * suave(lo(az) + 6, lo(az) + 14, el),
                  hex: sw(69), M: 44, N: 14 }, g, silueta);
    // el puño: una banda mas gruesa y oscura
    casquete(B, { lo, hi: (az) => lo(az) + 6, d: () => 0.028, hex: sw(51), M: 44, N: 3 }, g, silueta);
  };

  /* EL ALA: de r0 (la copa) a r1 (el borde), su cara de arriba a la altura
     y, el canto redondo (medio circulo de 'gr' de grueso) y la de abajo de
     vuelta hasta dentro de la cabeza (rIn). Con el canto afilado, la tinta
     se doblaba en la punta. */
  function ala(r0, r1, y, gr, hexA, hexC, hexB, rIn) {
    const P = [[r0, y, hexA]], rc = gr / 2;
    for (let k = 0; k <= 4; k++) {
      const a = Math.PI / 2 - Math.PI * k / 4;
      P.push([r1 - rc + rc * Math.cos(a), y - rc + rc * Math.sin(a), k < 4 ? hexC : hexB]);
    }
    P[0][2] = hexA; P[1][2] = hexC;
    P.push([rIn, y - gr + 0.002]);
    return P;
  }
  /* LOS DE COPA: la copa CALZA en la cabeza. Su base mide lo que la cabeza
     a esa altura mas 1,2 cm: mas angosta, la cabeza la atravesaba y asomaba
     en astillas claras sobre el ala (sobre todo detras, con el sombrero
     inclinado). Los perfiles se dibujan para una base de 0,232 y se escalan
     a la de verdad (K); apoyan a 1,62 m, casi derechos (2 grados atras). */
  const yApoyo = 1.62, INCL = -2;
  const BASE = radioA(yApoyo - 0.022)[0] + 0.012, K = BASE / 0.232;
  const esc = (P) => P.map((p) => [p[0] * K, p[1], p[2]]);
  function sombreroSobre(perfil, o, B, g, silueta) {
    const [rx, rz] = radioA(yApoyo);
    torno(B, perfil, Object.assign({ x: 0, y: yApoyo, z: C().cz, M: 40, incl: INCL, sx: 1, sz: rz / rx * 1.01 }, o), g, silueta);
  }
  // el ala de un sombrero de copa: la de ala(), escalada, y su cara de abajo hasta dentro de la cabeza
  const alaK = (r0, r1, y, gr, a, c2, b) => ala(r0 * K, r1 * K, y, gr, a, c2, b, BASE - 0.06);

  /* Desperado (hat5): copa baja de tapa plana (48) con su cinta (60) y el
     ala ancha y plana (48 arriba, con el filo mas claro, 95). */
  MOD.hat5 = function (B, g, silueta) {
    sombreroSobre(esc([
      [0, 0.155, sw(48)], [0.205, 0.155, sw(48)], [0.215, 0.14, sw(48)], [0.228, 0.05, sw(60)]
    ]).concat(alaK(0.232, 0.47, 0.012, 0.024, sw(48), sw(95), sw(40))),
    { alabeo: (az, r) => 0.012 * Math.max(0, (r - 0.25 * K) / 0.2) * Math.cos(2 * az * RAD) }, B, g, silueta);
  };

  /* Bowler (hat6): la copa redonda (108), la cinta oscura (46) y el ala
     corta curvada hacia arriba a los costados (51). */
  MOD.hat6 = function (B, g, silueta) {
    const copa = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8 * Math.PI / 2; copa.push([0.232 * Math.sin(t) * (1 + 0.04 * Math.sin(2 * t)), 0.03 + 0.2 * Math.cos(t), sw(108)]); }
    sombreroSobre(esc(copa.concat([[0.236, 0.052, sw(46)]])).concat(alaK(0.238, 0.34, 0.016, 0.022, sw(51), sw(62), sw(40))),
      { alabeo: (az, r) => 0.028 * Math.max(0, (r - 0.24 * K) / 0.1) * Math.pow(Math.sin(az * RAD), 2) }, B, g, silueta);
  };

  /* Tophat (top): la copa alta y apenas acampanada (102), la cinta negra,
     y el ala (72) con los costados levantados. */
  MOD.top = function (B, g, silueta) {
    sombreroSobre(esc([
      [0, 0.42, sw(102)], [0.235, 0.42, sw(102)], [0.244, 0.405, sw(102)], [0.232, 0.1, 0x0c0c0c]
    ]).concat(alaK(0.232, 0.37, 0.018, 0.022, sw(72), sw(90), sw(55))),
    { alabeo: (az, r) => 0.035 * Math.max(0, (r - 0.23 * K) / 0.13) * Math.pow(Math.sin(az * RAD), 2) }, B, g, silueta);
  };

  /* Fedora: la copa (51) con el hundido de arriba y los pellizcos de
     delante, la cinta clara (153), y el ala (51) baja delante y alta
     atras. */
  MOD.fedora = function (B, g, silueta) {
    sombreroSobre(esc([
      [0, 0.18, sw(62)], [0.1, 0.215, sw(51)], [0.19, 0.225, sw(51)], [0.232, 0.18, sw(51)], [0.238, 0.085, sw(153)],
      [0.24, 0.035, sw(51)]
    ]).concat(alaK(0.244, 0.41, 0.012, 0.02, sw(51), sw(72), sw(40))), { sz: radioA(yApoyo)[1] / radioA(yApoyo)[0] * 1.03,
         alabeo: (az, r, y) => {
           const ala = Math.max(0, (r - 0.245 * K) / 0.16), c2 = Math.cos(az * RAD);
           // el ala: abajo delante, arriba atras y a los costados; la copa, pellizcada delante
           return ala * (-0.05 * Math.max(0, c2) + 0.04 * Math.max(0, -c2) + 0.02 * Math.pow(Math.sin(az * RAD), 2)) -
                  (y > 0.15 && r > 0.12 ? 0.03 * Math.pow(Math.max(0, c2), 3) * (r - 0.12) / 0.12 : 0);
         } }, B, g, silueta);
  };

  /* Sombrero (hat9): la copa alta y redondeada, de paja (174 / 204), el
     ala enorme con el filo alzado, y la guarda roja en zigzag (255, 0, 0)
     cerca del borde. */
  MOD.hat9 = function (B, g, silueta) {
    const s = radioA(yApoyo)[1] / radioA(yApoyo)[0] * 1.01;
    // la copa: su ultimo punto ES el pie de la cinta (sin repetirlo: un tramo de largo cero le daba vuelta la tinta)
    const copa = [];
    for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI / 2; copa.push([0.2 * Math.pow(Math.sin(t), 0.8) + 0.032 * Math.sin(t), 0.06 + 0.3 * Math.cos(t), sw(204)]); }
    /* EL ALA SE LEVANTA EN EL FILO, suave (3 cm en los ultimos 22): mas
       empinado, del lado de la camara su cara de arriba quedaba de espaldas
       y se veia la tinta de adentro. Y la cara de abajo sigue la MISMA curva
       que la de arriba, tramo por tramo: recta, en el rulo el ala quedaba
       gruesa como una rueda. */
    const alabeo = (az, r) => 0.03 * Math.pow(Math.max(0, (r - 0.45) / 0.22), 2) - 0.015 * Math.max(0, (r - 0.24) / 0.2) * Math.max(0, Math.cos(az * RAD));
    const radios = [0.235 * K, 0.35, 0.45, 0.52, 0.58, 0.63], gr = 0.024, rc = gr / 2, r1 = 0.655 * K, y = 0.016;
    const ala2 = radios.map((r) => [r, y, sw(174)]);
    for (let k = 0; k <= 4; k++) {
      const a = Math.PI / 2 - Math.PI * k / 4;
      ala2.push([r1 - rc + rc * Math.cos(a), y - rc + rc * Math.sin(a), k < 4 ? sw(204) : sw(145)]);
    }
    for (let k = radios.length - 1; k >= 1; k--) ala2.push([radios[k], y - gr, sw(145)]);
    ala2.push([BASE - 0.06, y - gr + 0.002]);
    sombreroSobre(esc(copa.concat([[0.232, 0.06, swc(170, 0, 0)]])).concat(ala2), { alabeo }, B, g, silueta);
    if (silueta) return;
    // la guarda: una cinta roja en zigzag sobre el ala
    B.push(); B.translate(0, yApoyo, C().cz); B.rotateX(INCL * RAD);
    const kr = B._rgb(swc(255, 0, 0), 1), N = 120, zA = 0.44, zB = 0.57, w = 0.022;
    const zz = (t) => { const f = (t * 18) % 1; return zA + (zB - zA) * (f < 0.5 ? f * 2 : 2 - f * 2); };
    // 4 mm sobre la cara de arriba del ala (y = 0,016 mas su alabeo)
    const P = (t, dr) => { const a = t * 2 * Math.PI, r = zz(t) + dr; return [r * Math.sin(a), 0.023 + alabeo(t * 360, r), s * r * Math.cos(a)]; };
    let prev = null;
    for (let i = 0; i <= N * 4; i++) {
      const t = i / (N * 4), a = P(t, -w), b = P(t, w);
      const pa = { i: B._vert(a[0], a[1], a[2], 0, 1, 0, kr[0], kr[1], kr[2]), p: a }, pb = { i: B._vert(b[0], b[1], b[2], 0, 1, 0, kr[0], kr[1], kr[2]), p: b };
      if (prev) { tri(B, prev[0].i, pa.i, pb.i, prev[0].p, pa.p, pb.p, [0, 1, 0]); tri(B, prev[0].i, pb.i, prev[1].i, prev[0].p, pb.p, prev[1].p, [0, 1, 0]); }
      prev = [pa, pb];
    }
    B.pop();
  };

  /* Headphones: el arco por encima de la cabeza (51) y las dos copas en
     las orejas (40, con la almohadilla 62 contra la cabeza). */
  MOD.headphones = function (B, g, silueta) {
    const c = C(), yC = c.cy + 0.01, zc = c.cz - 0.02;
    /* EL ARCO: una curva de verdad (60 tramos), el ovalo de la cabeza 3 cm
       por fuera en el plano de las copas, de ecuador a ecuador pasando por la
       coronilla: baja VERTICAL y entra por arriba en el centro de cada copa.
       Su seccion, un rectangulo de cantos redondos; la tinta, la misma
       seccion g mas grande en cada anillo. Hecho de pocos tramos rectos y
       entrando en angulo, su contorno salia quebrado y con un escalon suelto
       sobre la copa. */
    /* Va a 2,2 cm de la cabeza: a 3, su tinta llegaba a 2 mm de la tapa de
       la copa por dentro y la atravesaba en rayitas negras. Termina a 84
       grados, adentro de la copa; y su tinta se afina hasta el tamaño del
       arco justo donde entra (76 grados): entera, formaba un collar con dos
       puntitas sobre el borde de la copa. */
    const N = 60, d = 0.022, W = 0.022, T = 0.008, TOPE = 84;
    const X = c.rx + d, Y = c.ry + d, esq = [];
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * 2 * Math.PI, cs = Math.cos(a), sn = Math.sin(a);
      esq.push([Math.sign(cs) * Math.pow(Math.abs(cs), 0.4), Math.sign(sn) * Math.pow(Math.abs(sn), 0.4)]);   // un rectangulo redondeado
    }
    const anillos = [];
    for (let i = 0; i <= N; i++) {
      const thG = -TOPE + 2 * TOPE * i / N, th = thG * RAD, s = Math.sin(th), co = Math.cos(th);
      const gE = silueta ? g * (1 - suave(73, 77.5, Math.abs(thG))) : 0;
      const p = [X * s, c.cy + Y * co, zc];
      const n = uni([s / X, co / Y, 0]);        // hacia fuera del arco
      anillos.push(esq.map(([u, v]) => { const r = u * (T + gE), z = v * (W + gE); return [p[0] + n[0] * r, p[1] + n[1] * r, p[2] + z]; }));
    }
    if (silueta) Hh.barridoTinta(B, anillos); else Hh.barrido(B, anillos, sw(51));
    /* LAS COPAS: almohadillas redondeadas, encastradas 3 cm en la cabeza.
       Con la tapa de atras en su superficie, la cabeza se curva y entre el
       borde de la copa y ella quedaba una medialuna clara. Y el costado se
       cierra hacia la cabeza (la almohadilla, 62): un cilindro recto metido
       en la cabeza curva dejaba su borde de abajo corriendo rasante sobre
       ella, y su tinta acababa en una colita negra en punta. */
    for (const s of [1, -1]) {
      const x0 = s * (c.rx - 0.03);
      pieza(B, [[0, 0.077, sw(40)], [0.05, 0.074, sw(40)], [0.074, 0.064, sw(40)], [0.087, 0.047, sw(40)], [0.088, 0.034, sw(62)],
                [0.08, 0.016, sw(62)], [0.066, 0.004, sw(62)], [0.05, 0.0, sw(62)], [0, 0.0]],
            [x0, yC, zc], [s, 0, 0], sw(40), g, silueta, 28);
      /* LA JUNTA: la linea de la copa donde apoya en la cabeza. La silueta
         solo sale donde la copa se recorta contra el fondo; contra la cabeza,
         la almohadilla se juntaba sin trazo y el redondo se veia incompleto,
         flotando. En el SWF la copa lleva su linea entera. La almohadilla
         entra en la cabeza a 8,1-8,6 cm del eje: 14,4 grados vista desde el
         centro de la cabeza. */
      if (!silueta) junta(B, [s * c.rx, yC - c.cy, zc - c.cz], 13.6, 16.6);
    }
  };

  /* UNA JUNTA: un anillo negro pintado sobre la cabeza, entre los angulos
     b0 y b1 (grados) alrededor de la direccion 'eje' (desde el centro de la
     cabeza), 2,5 mm por encima de ella. Es el trazo del SWF donde una pieza
     apoya en la cabeza y no hay silueta que lo dibuje. */
  function junta(B, eje, b0, b1, hex) {
    const cc = C(), e = uni(eje), K2 = 56;
    const u = uni(Math.abs(e[1]) < 0.9 ? cruz(e, [0, 1, 0]) : cruz(e, [1, 0, 0])), v = cruz(e, u);
    const k = B._rgb(hex === undefined ? NEGRO : hex, 1);
    const punto = (fi, b) => {
      const sb = Math.sin(b * RAD), cb = Math.cos(b * RAD);
      const d = [0, 1, 2].map((i) => e[i] * cb + (u[i] * Math.cos(fi) + v[i] * Math.sin(fi)) * sb);
      const s2 = 1 / Math.sqrt(Math.pow(d[0] / cc.rx, 2) + Math.pow(d[1] / cc.ry, 2) + Math.pow(d[2] / cc.rz, 2));
      const p = [d[0] * s2, cc.cy + d[1] * s2, cc.cz + d[2] * s2];
      const n = uni([p[0] / (cc.rx * cc.rx), (p[1] - cc.cy) / (cc.ry * cc.ry), (p[2] - cc.cz) / (cc.rz * cc.rz)]);
      return { p: [p[0] + n[0] * 0.0025, p[1] + n[1] * 0.0025, p[2] + n[2] * 0.0025], n };
    };
    let prev = null;
    for (let i = 0; i <= K2; i++) {
      const fi = i / K2 * 2 * Math.PI, a = punto(fi, b0), b = punto(fi, b1);
      const par = [a, b].map((q) => ({ i: B._vert(q.p[0], q.p[1], q.p[2], q.n[0], q.n[1], q.n[2], k[0], k[1], k[2], U.LUZ_PLANA), p: q.p, n: q.n }));
      if (prev) {
        tri(B, prev[0].i, par[0].i, par[1].i, prev[0].p, par[0].p, par[1].p, prev[0].n);
        tri(B, prev[0].i, par[1].i, prev[1].i, prev[0].p, par[1].p, prev[1].p, prev[0].n);
      }
      prev = par;
    }
  }

  /* Soldier Helm (helmet1): el casco de 87, grueso, hasta la frente por
     delante y hasta la mitad de la oreja por detras, con el reborde
     acampanado (78) y un remache al costado (102). */
  MOD.helmet1 = function (B, g, silueta) {
    const lo = (az) => lerp(8, 30, Math.pow((1 + Math.cos(az * RAD)) / 2, 1.4));
    casquete(B, { lo, d: (az, el) => 0.03 + 0.012 * suave(60, 90, el) + 0.018 * (1 - suave(0, 12, el - lo(az))),
                  color: (az, el) => (el - lo(az) < 5 ? sw(78) : sw(87)), M: 48, N: 14 }, g, silueta);
    if (silueta) return;
    for (const s of [1, -1]) {
      const p = sobre(s * 100, 20, 0.045);
      pieza(B, [[0, 0.01], [0.016, 0.006], [0.018, 0]], p, uni(sub(p, [0, C().cy, C().cz])), sw(102), 0, false, 10);
    }
  };

  /* Blast Helm (helmet3): el casco (102/69) con la pantalla de soldar
     levantada encima de la frente -una caja negra remachada- y la
     correa de los costados (78). */
  MOD.helmet3 = function (B, g, silueta) {
    const lo = (az) => lerp(4, 24, Math.pow((1 + Math.cos(az * RAD)) / 2, 1.2));
    casquete(B, { lo, d: (az, el) => 0.032 + 0.01 * suave(60, 90, el), color: (az, el) => (el - lo(az) < 4 ? sw(69) : sw(102)), M: 48, N: 14 }, g, silueta);
    /* la pantalla levantada: una placa negra gruesa que sigue el casco por
       delante y arriba (subida, como se lleva sin soldar), de canto a canto
       entre las bisagras */
    casquete(B, { a0: -38, a1: 38, lo: () => 34, hi: () => 64, d: () => 0.078, dentro: 0.036, hex: sw(34), canto: sw(22), M: 16, N: 6 }, g, silueta);
    if (silueta) return;
    // sus remaches y las bisagras a los costados
    for (const [az, el] of [[-28, 40], [28, 40], [-28, 58], [28, 58]]) {
      const p = sobre(az, el, 0.078);
      pieza(B, [[0, 0.008], [0.011, 0.004], [0.012, 0]], p, uni(sub(p, centro())), sw(92), 0, false, 8);
    }
    for (const s of [1, -1]) {
      const p = sobre(s * 42, 42, 0.05);
      pieza(B, [[0, 0.03], [0.03, 0.02], [0.032, 0]], p, uni(sub(p, centro())), sw(78), 0, false, 12);
    }
  };

  Object.assign(Acc.NOMBRES, {
    hat1: 'SWAT Cap', hat2: 'Leon Cap', hat3: 'Sweatband', hat4: 'Ballcap', hat5: 'Desperado', hat6: 'Bowler',
    headphones: 'Headphones', top: 'Tophat', fedora: 'Fedora', hat9: 'Sombrero', helmet1: 'Soldier Helm', helmet3: 'Blast Helm'
  });

  /* =============================================================
     LO QUE TAPA CADA PRENDA: (az, el, n) -> si ese punto del ovalo queda
     debajo, con un margen de 6 grados. Ahi el contorno de la cabeza no se
     adelanta (chars.js, geoDe): la prenda lo cubre con su profundidad de
     verdad y el trazo del ovalo no la cruza.
     ============================================================= */
  const MARGEN = 6;
  const CUBRE = Acc.CUBRE = Acc.CUBRE || {};
  const desde = (lo) => (az, el) => el > lo(az) - MARGEN;
  const entre = (lo, hi) => (az, el) => el > lo(az) - MARGEN && el < hi(az) + MARGEN;
  CUBRE.hat1 = desde(bordeGorra(21, 5));
  CUBRE.hat4 = desde(bordeGorra(20, 4));
  CUBRE.hat2 = desde(bordeGorra(24, 0));
  CUBRE.hat3 = entre((az) => lerp(46, 22, (1 + Math.cos(az * RAD)) / 2), (az) => lerp(46, 22, (1 + Math.cos(az * RAD)) / 2) + 17);
  // los de copa: desde el ala (inclinada hacia atras, un poco mas baja por detras)
  for (const id of ['hat5', 'hat6', 'top', 'fedora', 'hat9']) CUBRE[id] = (az, el) => el > elDeY(yApoyo) - 4 - 4 * Math.max(0, -Math.cos(az * RAD)) - MARGEN;
  CUBRE.helmet1 = desde((az) => lerp(8, 30, Math.pow((1 + Math.cos(az * RAD)) / 2, 1.4)));
  CUBRE.helmet3 = desde((az) => lerp(4, 24, Math.pow((1 + Math.cos(az * RAD)) / 2, 1.2)));
  /* los auriculares: las copas y el arco. Las copas salen 5,6 cm de la
     cabeza y de costado tapan su contorno bastante mas alla de donde apoyan:
     con 20 grados, el contorno adelantado de la cabeza les pasaba por encima
     del borde de abajo y se cortaba de golpe (una colita negra suelta). */
  /* La cuenta: un punto del contorno a un angulo a del eje de la copa queda
     detras de ella si 0,378 cos a + 0,088 sen a > 0,33 (la tapa a 37,8 cm
     del centro, radio 8,8, la cabeza 33): hasta unos 45 grados. Con 50 de
     margen; el arco, a 2,2 cm de la cabeza y 4,4 de ancho, tapa una franja
     de |n_z| < 0,35 de costado. */
  CUBRE.headphones = (az, el, n) => Math.abs(n[0]) > Math.cos(50 * RAD) || (n[1] > -0.1 && Math.abs(n[2]) < 0.35);

  /* =============================================================
     LOS ANTEOJOS (MasksAll, 7358; puestos en 'Parts - Head' con myMask)

     RIGIDOS, DELANTE DE LA CARA: cada lente es una placa plana con su
     marco, parada a 2 cm de la cabeza en el azimut de su ojo y girada con
     ella; un puente las une por encima de la linea de la cruz y las
     patillas vuelven por los costados hasta donde irian las orejas. Asi,
     de perfil, se ve la lente de canto y la patilla, como en el SWF.
     El marco es la placa entera por detras (negra, o del color que toque) y
     el cristal va encima, apenas mas chico: el filo del marco queda
     alrededor sin agujeros ni tapas raras.
     ============================================================= */
  const OJO = 17;                          // azimut de cada lente desde la linea de la cruz
  function caminoLado(a0, a1, off0, off1, y) {
    const c = C(), k = Math.sqrt(Math.max(0.05, 1 - Math.pow((y - c.cy) / c.ry, 2)));
    return (t) => {
      const a = (a0 + (a1 - a0) * t) * RAD, off = off0 + (off1 - off0) * suave(0, 0.35, t);
      const rx = c.rx * k + off, rz = c.rz * k + off;
      let nx = Math.sin(a) / rx, nz = Math.cos(a) / rz;
      const L = Math.hypot(nx, nz); nx /= L; nz /= L;
      return { x: rx * Math.sin(a), z: c.cz + rz * Math.cos(a), nx, nz };
    };
  }
  /* o: poly (u, v en metros; u hacia fuera de la cara), marco (ancho del
     filo), hexMarco, hexCristal (o cristal(lado) -> hex), reflejo [u0, u1,
     sesgo], d (a cuanto de la cabeza), gr (grueso), puente [v0, v1],
     patilla (alto), sube (grados sobre la cruz) */
  function anteojos(o) {
    return function (B, g, silueta) {
      const [a0, e0] = Hh.centroCruz(), el = e0 + (o.sube || 1), d = o.d || 0.02, gr = o.gr || 0.012;
      const hexM = silueta ? 0x000000 : o.hexMarco;
      const bordes = [];
      for (const lado of [1, -1]) {
        const az = a0 + lado * (o.ojo || OJO), p = sobre(az, el, d);
        const P = lado > 0 ? o.poly : o.poly.map(([u, v]) => [-u, v]).reverse();
        B.push(); B.translate(p[0], p[1], p[2]); B.rotateY(az * RAD);
        // el marco: la placa entera, del filo hacia fuera
        Hh.prisma(B, Hh.hinchar(P, o.marco), 'z', -gr, 0, hexM, silueta ? g : 0, silueta ? undefined : U.LUZ_PLANA);
        if (!silueta) {
          const hexC = o.cristal ? o.cristal(lado) : o.hexCristal;
          Hh.prisma(B, P, 'z', -0.004, 0.002, hexC, 0, U.LUZ_PLANA);
          if (o.reflejo) {
            const [r0, r1, sg] = o.reflejo, vv = P.map((q) => q[1]), v0 = Math.min(...vv), v1 = Math.max(...vv);
            let R = [[r0 * lado + sg * v0, v0], [r1 * lado + sg * v0, v0], [r1 * lado + sg * v1, v1], [r0 * lado + sg * v1, v1]];
            if (lado < 0) R = R.reverse();
            R = Hh.recortar(R, P);
            if (R.length >= 3) Hh.prisma(B, R, 'z', 0.002, 0.0035, o.hexReflejo || 0x8a8a8a, 0, U.LUZ_PLANA);
          }
        }
        B.pop();
        // los cantos de la lente, en el mundo: el de dentro (puente) y el de fuera (patilla)
        const uu = P.map((q) => q[0]), uIn = lado > 0 ? Math.min(...uu) : Math.max(...uu), uOut = lado > 0 ? Math.max(...uu) : Math.min(...uu);
        const aa = az * RAD, mundo = (u) => [p[0] + Math.cos(aa) * u, p[2] - Math.sin(aa) * u];
        bordes.push({ lado, az, adentro: mundo(uIn - lado * o.marco * 0.5), afuera: mundo(uOut + lado * o.marco * 0.5), p });
      }
      // el puente, entre los cantos de dentro, a la altura o.puente
      const [pb0, pb1] = o.puente || [0.012, 0.024];
      const ia = bordes[0].adentro, ib = bordes[1].adentro, pc = sobre(a0, el, d);
      B.push(); B.translate(0, pc[1], (ia[1] + ib[1]) / 2 - gr * 0.5);
      Hh.prisma(B, [[ib[0], pb0], [ia[0], pb0], [ia[0], pb1], [ib[0], pb1]], 'z', -gr * 0.5, gr * 0.5, hexM, silueta ? g : 0);
      B.pop();
      // las patillas: del canto de fuera, por el costado, hasta la oreja
      const y = sobre(0, el, 0)[1] + (o.yPatilla || 0.012), h = (o.patilla || 0.009) / 2;
      for (const b of bordes) {
        const azF = Math.atan2(b.afuera[0], b.afuera[1] - C().cz) / RAD;
        Hh.banda(B, caminoLado(azF, b.lado * 104, d - 0.004, 0.008, y), 18, y, () => h, -0.004, 0.006, hexM, silueta ? g * 0.7 : 0);
      }
    };
  }
  // una lente de superelipse: medio ancho w, medio alto h, exponente p (2 redonda, mas: cuadrada)
  const superLente = (w, h, p, n) => Array.from({ length: n || 28 }, (_, i) => {
    const a = i / (n || 28) * 2 * Math.PI, c2 = Math.cos(a), s2 = Math.sin(a);
    return [w * Math.sign(c2) * Math.pow(Math.abs(c2), 2 / p), h * Math.sign(s2) * Math.pow(Math.abs(s2), 2 / p)];
  });

  // Radio-Shades (shades1): pasta negra ancha (25), el cristal oscuro (58) con su reflejo
  MOD.shades1 = anteojos({ poly: [[-0.052, 0.030], [0.058, 0.036], [0.060, 0.004], [0.046, -0.030], [-0.040, -0.030], [-0.054, -0.006]].map(([u, v]) => [u * 1.12, v * 1.12]),
                           marco: 0.012, hexMarco: sw(25), hexCristal: sw(58), reflejo: [0.004, 0.022, 0.5], hexReflejo: sw(90), gr: 0.014 });
  // Coolguys (shades12): cuadrados, todo negro
  MOD.shades12 = anteojos({ poly: superLente(0.056, 0.04, 7), marco: 0.01, hexMarco: 0x0c0c0c, hexCristal: 0x141414, reflejo: [-0.01, 0.008, 0.6], hexReflejo: sw(70) });
  // State Troopers (shades3): aviador, la gota caida hacia fuera, filo fino
  MOD.shades3 = anteojos({ poly: superLente(0.056, 0.047, 2.4).map(([u, v]) => [u + (v < 0 ? 0.013 * (-v / 0.047) : 0), v * (v < 0 ? 1.12 : 0.85)]),
                           marco: 0.005, hexMarco: 0x0a0a0a, hexCristal: 0x121212, reflejo: [-0.012, 0.004, 0.55], hexReflejo: sw(80), gr: 0.008, puente: [0.02, 0.028] });
  // Professionals (shades5): redondos y chicos, cristal gris oscuro (47)
  MOD.shades5 = anteojos({ poly: superLente(0.04, 0.04, 2), ojo: 15.5, marco: 0.005, hexMarco: 0x0a0a0a, hexCristal: sw(47), gr: 0.008, puente: [0.008, 0.014] });
  // 3-D (shades8): marco blanco grueso, rojo a la izquierda y azul a la derecha
  MOD.shades8 = anteojos({ poly: superLente(0.056, 0.034, 8), marco: 0.013, hexMarco: sw(235), cristal: (lado) => (lado > 0 ? swc(255, 0, 0) : swc(0, 60, 255)), gr: 0.012 });

  /* Dr. Horrible (goggles1): antiparras de soldador. Dos copas cilindricas
     (72) que salen de los ojos, con su aro (94) y el vidrio claro (128), el
     puente, y la correa que da la vuelta a la cabeza (94). */
  MOD.goggles1 = function (B, g, silueta) {
    const [a0, e0] = Hh.centroCruz(), el = e0 + 1;
    for (const lado of [1, -1]) {
      const az = a0 + lado * 16, p = sobre(az, el, -0.012), n = uni(sub(sobre(az, el, 0.1), sobre(az, el, 0)));
      pieza(B, [[0, 0.075, sw(128)], [0.04, 0.075, sw(94)], [0.056, 0.073, sw(94)], [0.058, 0.06, sw(72)], [0.056, 0.0, sw(72)], [0, 0]], p, n, sw(72), g, silueta, 24);
      if (!silueta) pieza(B, [[0.033, 0.0765, 0x0a0a0a], [0.041, 0.0765]], p, n, 0x0a0a0a, 0, false, 24);   // el aro negro del vidrio
    }
    const pc = sobre(a0, el, 0.03);
    if (!silueta) pieza(B, [[0, 0.03, sw(72)], [0.012, 0.03, sw(72)], [0.012, -0.03, sw(72)], [0, -0.03]], pc, [1, 0, 0], sw(72), 0, false, 10);
    casquete(B, { lo: () => el - 2.6, hi: () => el + 2.6, d: () => 0.007, hex: sw(94), M: 48, N: 2 }, g, silueta);
  };

  /* Paintball Mask (paintball1): el visor rojo (153, 0, 0) de lado a lado,
     curvo, en su marco oscuro (59), los enganches a los costados (82) y la
     correa. */
  function visorPaintball(B, g, silueta) {
    const c = C(), [a0, e0] = Hh.centroCruz(), y0 = sobre(0, e0 + 1, 0)[1] - c.cy;
    const R = c.rz + 0.03;
    const marco = Hh.hinchar(superLente(0.175, 0.056, 6, 40), 0.014), vidrio = superLente(0.175, 0.056, 6, 40);
    Hh.losaCurva(B, marco, { R, d0: c.rz - 0.01, d1: c.rz + 0.036, y0, x0: a0 * RAD * R, luz: true }, silueta ? 0x000000 : sw(59), silueta ? g : 0);
    if (!silueta) Hh.losaCurva(B, vidrio, { R, d0: c.rz + 0.03, d1: c.rz + 0.042, y0, x0: a0 * RAD * R, luz: false }, swc(153, 0, 0), 0);
    for (const lado of [1, -1]) {
      const p = sobre(a0 + lado * 36, e0 + 1, 0.02);
      pieza(B, [[0, 0.03, sw(82)], [0.022, 0.028, sw(82)], [0.024, 0.0, sw(82)], [0, 0]], p, uni(sub(p, centro())), sw(82), g, silueta, 12);
    }
    casquete(B, { lo: () => e0 - 2, hi: () => e0 + 4, d: () => 0.008, hex: sw(59), M: 48, N: 2 }, g, silueta);
  }
  MOD.paintball1 = visorPaintball;

  /* =============================================================
     HERRAMIENTAS DE LO QUE VA EN LA CARA
     ============================================================= */
  // un punto de la cabeza por su direccion (vector unitario del ovalo: la misma cuenta que sobre())
  const enCab = (d, off) => { const c = C(); return [(c.rx + off) * d[0], c.cy + (c.ry + off) * d[1], c.cz + (c.rz + off) * d[2]]; };
  const dirDe = (az, el) => { const a = az * RAD, e = el * RAD; return [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)]; };
  const normalCab = (p) => { const c = C(); return uni([p[0] / (c.rx * c.rx), (p[1] - c.cy) / (c.ry * c.ry), (p[2] - c.cz) / (c.rz * c.rz)]); };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const mas = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  /* LA TINTA QUE QUEDA DENTRO DE LA CABEZA SE HUNDE MAS. La cabeza es una
     malla de 16 x 12: entre vertice y vertice sus caras quedan hasta 1 cm
     por dentro del ovalo, y la tinta de las prendas se adelanta 1 cm (ver
     Chars.geoDe). La cara de dentro de una tela pegada (1,25 cm dentro del
     ovalo) asomaba por el medio de cada cara de la cabeza -y, vista desde
     arriba, por encima del borde-: el trazo salia punteado. Donde algo
     toca la cabeza su tinta de dentro baja HUNDE mas (queda a 2,8 cm). */
  const HUNDE = 0.016;
  const cerca = (p) => { const c = C(), q = Math.hypot(p[0] / c.rx, (p[1] - c.cy) / c.ry, (p[2] - c.cz) / c.rz); return 1 - suave(0.012, 0.035, (q - 1) * 0.33); };
  // la normal (hacia fuera de la cabeza) de una superficie dada como (az, el) -> punto
  const normalDe = (f, az, el) => {
    const n = uni(cruz(sub(f(az + 0.3, el), f(az - 0.3, el)), sub(f(az, el + 0.3), f(az, el - 0.3))));
    return dot(n, normalCab(f(az, el))) < 0 ? [-n[0], -n[1], -n[2]] : n;
  };
  // un camino 3D: su largo y el punto a la distancia s del comienzo
  function camino(P) {
    const L = [0];
    for (let i = 1; i < P.length; i++) L.push(L[i - 1] + dist(P[i], P[i - 1]));
    const T = L[L.length - 1];
    return { L: T, en: (s) => {
      s = Math.max(0, Math.min(T, s));
      let i = 0;
      while (i < P.length - 2 && L[i + 1] < s) i++;
      const u = (s - L[i]) / ((L[i + 1] - L[i]) || 1);
      return [0, 1, 2].map((e) => P[i][e] + (P[i + 1][e] - P[i][e]) * u);
    } };
  }
  /* las N + 1 filas de una tela a lo largo de un camino de largo L: las dos
     primeras y las dos ultimas encierran la FRANJA NEGRA de cada borde (wA,
     wB; con 0 la franja no mide nada) y el resto va parejo. */
  function filas(L, N, wA, wB) {
    const e = 0.0004, a = wA + e, b = L - wB - e, n = N - 3, s = [0, wA];
    for (let k = 0; k < n; k++) s.push(lerp(a, b, k / (n - 1)));
    s.push(L - wB, L);
    return s;
  }

  /* =============================================================
     LAMINA: una tela o una goma con grueso, de una grilla P[i][j] (i a lo
     largo, cerrada si o.vuelta; j de un borde al otro).
       o.gr            el grueso (m)
       o.color(i, j)   el gris de fuera (dentro, el mismo mas oscuro)
       o.apoyo(i, j)   en las filas de borde (j = 0 y j = N): 1 si ese borde
                       APOYA en la cabeza, 0 si queda suelto, y en medio;
                       o.apoyoLado(i, j), lo mismo en los costados
     UN BORDE QUE APOYA NO ES SILUETA: el casco de la tinta no asoma por el
     (su cara de atras queda dentro de la cabeza) y el canto de la tela, de
     canto, se hace una raya de un pixel que se corta a trozos. Asi estaba
     el borde de arriba de los pañuelos: punteado. Ahi el trazo lo PINTA la
     franja negra de la propia grilla (ver filas) y el canto baja 1,2 cm
     dentro de la cabeza: entre la tela y su raya no queda piel. Donde el
     borde queda SUELTO la tinta se estira g por delante y dibuja la
     silueta. El paso de uno a otro es gradual: sin escalones en la linea.
     La normal de cada vertice sale de la grilla saltando las filas
     pegadas (las franjas pueden medir cero).
     ============================================================= */
  function lamina(B, P, o, g, silueta) {
    const M = P.length, N = P[0].length - 1, vuelta = !!o.vuelta, gr = o.gr || 0.006, gE = silueta ? g : 0;
    const hondo = o.dentro === undefined ? 0.012 : o.dentro;
    const I = (i) => (vuelta ? ((i % M) + M) % M : Math.max(0, Math.min(M - 1, i)));
    const at = (i, j) => P[I(i)][Math.max(0, Math.min(N, j))];
    const vecJ = (i, j, s) => { let k = j + s; while (k > 0 && k < N && dist(at(i, k), at(i, j)) < 1e-4) k += s; return Math.max(0, Math.min(N, k)); };
    const tanI = (i, j) => sub(vuelta || i < M - 1 ? at(i + 1, j) : at(i, j), vuelta || i > 0 ? at(i - 1, j) : at(i, j));
    const tanJ = (i, j) => sub(at(i, vecJ(i, j, 1)), at(i, vecJ(i, j, -1)));
    const NR = P.map((col, i) => col.map((p, j) => {
      let n = cruz(tanI(i, j), tanJ(i, j));
      n = Math.hypot(n[0], n[1], n[2]) < 1e-12 ? normalCab(p) : uni(n);
      return dot(n, normalCab(p)) < 0 ? [-n[0], -n[1], -n[2]] : n;
    }));
    const apoyo = (i, j) => (o.apoyo ? o.apoyo(i, j) : 1);
    const apoyoL = (i, j) => (o.apoyoLado ? o.apoyoLado(i, j) : 1);
    // hacia fuera del borde, a lo largo de la tela
    const dirB = (i, j) => (j === 0 ? uni(sub(at(i, 0), at(i, vecJ(i, 0, 1)))) : uni(sub(at(i, N), at(i, vecJ(i, N, -1)))));
    const dirL = (i, j) => (i === 0 ? uni(sub(at(0, j), at(1, j))) : uni(sub(at(M - 1, j), at(M - 2, j))));
    const cara = (s) => P.map((col, i) => col.map((p, j) => {
      const n = NR[i][j], f = s > 0 ? n : [-n[0], -n[1], -n[2]];
      let q = mas(p, n, s * (gr / 2 + gE + (silueta && s < 0 ? HUNDE * cerca(p) : 0))), nn = f;
      if (silueta) {
        let e = [0, 0, 0];
        if (j === 0 || j === N) e = mas(e, dirB(i, j), gE * (1 - apoyo(i, j)));
        if (!vuelta && (i === 0 || i === M - 1)) e = mas(e, dirL(i, j), gE * (1 - apoyoL(i, j)));
        if (Math.hypot(e[0], e[1], e[2]) > 1e-9) { q = mas(q, e, 1); nn = uni(mas(f, e, 1 / gE)); }
      }
      const k = silueta ? [0, 0, 0] : B._rgb(o.color(i, j), s > 0 ? 1 : 0.78);
      return { i: B._vert(q[0], q[1], q[2], nn[0], nn[1], nn[2], k[0], k[1], k[2]), q, n: nn, f };
    }));
    const F = cara(1), D = cara(-1), nc = vuelta ? M : M - 1;
    /* o.adelanta(i, j): la cara de FUERA de la tinta se adelanta como el
       contorno del ovalo (Chars.geoDe) -para lo que envuelve la cabeza
       entera: contra el torso, sin adelanto, su tinta salia partida-. La de
       dentro nunca: adelantada pintaria de negro toda la prenda. */
    if (silueta && o.adelanta) {
      const L = B.adelantoOvalo = B.adelantoOvalo || [];
      F.forEach((col, i) => col.forEach((v, j) => { if (o.adelanta(i, j)) L.push(v.i); }));
    }
    for (let i = 0; i < nc; i++) {
      const i2 = (i + 1) % M;
      for (let j = 0; j < N; j++) {
        for (const G of [F, D]) {
          const a = G[i][j], b = G[i2][j], c2 = G[i2][j + 1], d = G[i][j + 1];
          tri(B, a.i, b.i, c2.i, a.q, b.q, c2.q, a.f); tri(B, a.i, c2.i, d.i, a.q, c2.q, d.q, a.f);
        }
      }
    }
    // los cantos: de la cara de fuera a la de dentro y, donde apoya, hasta dentro de la cabeza
    const kc = silueta ? null : B._rgb(o.canto === undefined ? NEGRO : o.canto, 1);
    const hundir = (q, a) => (a > 0 ? mas(q, normalCab(q), -a * (hondo + gE)) : q);
    const canto = (L) => {
      let prev = null;
      for (const [f, d, a, fu] of L) {
        const h = hundir(d.q, a);
        const t = silueta ? [f, d, a > 0 ? { i: B._vert(h[0], h[1], h[2], d.n[0], d.n[1], d.n[2], 0, 0, 0), q: h } : d]
          : [f.q, d.q, h].map((q) => ({ i: B._vert(q[0], q[1], q[2], fu[0], fu[1], fu[2], kc[0], kc[1], kc[2]), q }));
        if (prev) {
          for (const [x, y] of [[0, 1], [1, 2]]) {
            tri(B, prev[x].i, t[x].i, t[y].i, prev[x].q, t[x].q, t[y].q, fu);
            tri(B, prev[x].i, t[y].i, prev[y].i, prev[x].q, t[y].q, prev[y].q, fu);
          }
        }
        prev = t;
      }
    };
    const fila = (j) => { const L = []; for (let t = 0; t <= nc; t++) { const i = t % M; L.push([F[i][j], D[i][j], apoyo(i, j), dirB(i, j)]); } return L; };
    if (!o.sinCanto0) canto(fila(0));
    canto(fila(N));
    if (!vuelta) {
      for (const i of [0, M - 1]) {
        const L = [];
        for (let j = 0; j <= N; j++) L.push([F[i][j], D[i][j], apoyoL(i, j), dirL(i, j)]);
        canto(L);
      }
    }
  }

  /* UN TRAZO PINTADO sobre una superficie (los pliegues, las costuras, la
     cresta de una placa): una cinta plana de 'ancho' -o ancho(t), t de 0 a
     1- por los puntos, con las puntas redondas, negra y sin luz. Los puntos
     ya van por encima de la superficie; nrm, su normal en cada uno. */
  function trazo(B, pts, nrm, ancho, hex) {
    const n = pts.length;
    if (n < 2) return;
    const k = B._rgb(hex === undefined ? NEGRO : hex, 1);
    const w = typeof ancho === 'function' ? ancho : () => ancho;
    const T = (i) => uni(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
    const V = (q, nn) => ({ i: B._vert(q[0], q[1], q[2], nn[0], nn[1], nn[2], k[0], k[1], k[2], U.LUZ_PLANA), q });
    let prev = null;
    for (let i = 0; i < n; i++) {
      const nn = nrm[i], lado = uni(cruz(nn, T(i))), hw = w(i / (n - 1)) / 2;
      const par = [V(mas(pts[i], lado, hw), nn), V(mas(pts[i], lado, -hw), nn)];
      if (prev) {
        tri(B, prev[0].i, par[0].i, par[1].i, prev[0].q, par[0].q, par[1].q, nn);
        tri(B, prev[0].i, par[1].i, prev[1].i, prev[0].q, par[1].q, prev[1].q, nn);
      }
      prev = par;
    }
    for (const [i, sg] of [[0, -1], [n - 1, 1]]) {
      const nn = nrm[i], t = T(i).map((v) => v * sg), lado = uni(cruz(nn, t)), hw = w(i / (n - 1)) / 2;
      if (hw < 1e-5) continue;
      const cen = V(pts[i], nn);
      let ant = null;
      for (let s2 = 0; s2 <= 8; s2++) {
        const an = Math.PI * s2 / 8, d = [0, 1, 2].map((e) => lado[e] * Math.cos(an) + t[e] * Math.sin(an));
        const v = V(mas(pts[i], d, hw), nn);
        if (ant) tri(B, cen.i, ant.i, v.i, cen.q, ant.q, v.q, nn);
        ant = v;
      }
    }
  }
  // una mancha pintada: un poligono 2D llevado a 3D por 'donde(u, v)', mirando a 'n'
  function mancha(B, poly, donde, n, hex) {
    const k = B._rgb(hex === undefined ? NEGRO : hex, 1);
    const v2 = poly.map((q) => new THREE.Vector2(q[0], q[1]));
    const ids = poly.map((q) => { const p = donde(q[0], q[1]); return { i: B._vert(p[0], p[1], p[2], n[0], n[1], n[2], k[0], k[1], k[2], U.LUZ_PLANA), q: p }; });
    for (const t of THREE.ShapeUtils.triangulateShape(v2, [])) tri(B, ids[t[0]].i, ids[t[1]].i, ids[t[2]].i, ids[t[0]].q, ids[t[1]].q, ids[t[2]].q, n);
  }

  /* UN TUBO: anillos 3D (secciones convexas, todas con los mismos puntos)
     cosidos con vertices compartidos. La normal de cada punto es la de sus
     dos aristas en el anillo, y la tinta es el mismo anillo corrido g por
     esa normal (a inglete), con las tapas estiradas g: sale pareja por
     todos lados y no se abre en las aristas (con caras planas cada arista
     abria una grieta, y de frente se veia una raya doble). */
  function tubo3(B, anillos, color, g, silueta, sobreCab) {
    const R = anillos.length, n = anillos[0].length;
    const cen = anillos.map((A) => A.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n, s[2] + p[2] / n], [0, 0, 0]));
    const eje = (r) => uni(sub(cen[Math.min(R - 1, r + 1)], cen[Math.max(0, r - 1)]));
    const ids = anillos.map((A, r) => {
      const ax = eje(r);
      const nA = A.map((p, k) => {
        const q = A[(k + 1) % n], e = sub(q, p);
        if (Math.hypot(e[0], e[1], e[2]) < 1e-9) return null;
        let m = uni(cruz(e, ax));
        if (dot(m, sub([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], cen[r])) < 0) m = [-m[0], -m[1], -m[2]];
        return m;
      });
      return A.map((p, k) => {
        const a = nA[(k - 1 + n) % n], b = nA[k];
        let nn = null, mit = 1, q = p;
        if (a && b) { nn = uni([a[0] + b[0], a[1] + b[1], a[2] + b[2]]); mit = Math.max(0.5, dot(nn, a)); } else nn = a || b;
        if (!nn) {
          // un anillo de un solo punto (la punta): la tinta sigue de largo
          nn = r === 0 ? ax.map((v) => -v) : ax;
          if (silueta) q = mas(p, nn, g);
        } else if (silueta) {
          let off = nn.map((v) => v * g / mit);
          if (sobreCab) {
            /* PEGADO A LA CABEZA la tinta no se estira a lo largo de ella: su
               cara de abajo quedaba 1,6 cm por debajo de la correa, vista desde
               arriba (la dibuja el material, que pinta las caras de atras), y
               entre las dos asomaba una tira de piel. Solo sale hacia fuera; y
               la de dentro se hunde (ver HUNDE). */
            const nh = normalCab(p), k = cerca(p), rad = dot(off, nh);
            off = mas(nh.map((v) => v * rad), mas(off, nh, -rad), 1 - k);
            if (rad < 0) off = mas(off, nh, -HUNDE * k);
          }
          q = mas(p, off, 1);
          if (r === 0) q = mas(q, ax, -g);
          if (r === R - 1) q = mas(q, ax, g);
        }
        const c = silueta ? [0, 0, 0] : B._rgb(color(r, k), 1);
        return { i: B._vert(q[0], q[1], q[2], nn[0], nn[1], nn[2], c[0], c[1], c[2]), q };
      });
    });
    for (let r = 0; r < R - 1; r++) {
      const m0 = [0, 1, 2].map((e) => (cen[r][e] + cen[r + 1][e]) / 2);
      for (let k = 0; k < n; k++) {
        const k2 = (k + 1) % n, a = ids[r][k], b = ids[r][k2], c2 = ids[r + 1][k2], d = ids[r + 1][k];
        const f = sub([0, 1, 2].map((e) => (a.q[e] + b.q[e] + c2.q[e] + d.q[e]) / 4), m0);
        tri(B, a.i, b.i, c2.i, a.q, b.q, c2.q, f); tri(B, a.i, c2.i, d.i, a.q, c2.q, d.q, f);
      }
    }
    for (const [r, s] of [[0, -1], [R - 1, 1]]) {
      const f = eje(r).map((v) => v * s), A = ids[r];
      for (let k = 1; k < n - 1; k++) tri(B, A[0].i, A[k].i, A[k + 1].i, A[0].q, A[k].q, A[k + 1].q, f);
    }
  }

  /* UNA CAJA orientada (centro c, ejes E unitarios, medios h): las piezas
     de metal chicas (hebillas, pasadores). El color, de caras planas; la
     tinta, con los ocho vertices compartidos y la normal de cada esquina,
     sin grietas en las aristas. */
  function caja(B, c, E, h, hex, g, silueta, sobreCab) {
    /* apoyada en la cabeza no se estira a lo largo de ella: con g entero,
       desde arriba se veia su cara de abajo suelta (una raya negra separada)
       y el marco de cuatro barras salia como un peine negro. */
    /* Y PAREJA: las piezas chicas apoyadas (hebillas, pasadores) llevan una
       tinta fina e igual por los tres lados. Con 1,6 cm hacia fuera y poco a
       los costados, la tinta de cada barra era una chimenea negra que de
       costado asomaba como un cuerno. */
    if (sobreCab) g = Math.min(g, 0.0045);
    const P = (s, gg) => [0, 1, 2].map((e) => c[e] + E[0][e] * s[0] * (h[0] + gg) + E[1][e] * s[1] * (h[1] + gg) + E[2][e] * s[2] * (h[2] + gg));
    const esq = (ax, sg, a, b) => { const s = [0, 0, 0], o1 = (ax + 1) % 3, o2 = (ax + 2) % 3; s[ax] = sg; s[o1] = a; s[o2] = b; return s; };
    const k = silueta ? [0, 0, 0] : B._rgb(hex, 1), memo = {};
    const vTinta = (s) => {
      const key = s.join(',');
      if (!memo[key]) {
        const q = P(s, g), n = uni([0, 1, 2].map((e) => E[0][e] * s[0] + E[1][e] * s[1] + E[2][e] * s[2]));
        memo[key] = { i: B._vert(q[0], q[1], q[2], n[0], n[1], n[2], 0, 0, 0), q };
      }
      return memo[key];
    };
    for (let ax = 0; ax < 3; ax++) {
      for (const sg of [1, -1]) {
        const f = E[ax].map((v) => v * sg);
        const S = [esq(ax, sg, -1, -1), esq(ax, sg, 1, -1), esq(ax, sg, 1, 1), esq(ax, sg, -1, 1)];
        const V = silueta ? S.map(vTinta) : S.map((s) => { const q = P(s, 0); return { i: B._vert(q[0], q[1], q[2], f[0], f[1], f[2], k[0], k[1], k[2]), q }; });
        tri(B, V[0].i, V[1].i, V[2].i, V[0].q, V[1].q, V[2].q, f);
        tri(B, V[0].i, V[2].i, V[3].i, V[0].q, V[2].q, V[3].q, f);
      }
    }
  }
  /* una hebilla montada sobre una correa: un bloque de metal con la ranura
     pintada (por ella se ve la correa). Maciza y no de cuatro barras: a este
     tamaño las barras eran de milimetros y su tinta se las comia. */
  function hebilla(B, p, t, n, largo, ancho, alto, hex, hexRanura, g, silueta) {
    const b = uni(cruz(n, t));
    caja(B, p, [t, b, n], [largo / 2, ancho / 2, alto / 2], hex, g, silueta, true);
    if (!silueta) {
      const top = mas(p, n, alto / 2 + 0.0006);
      mancha(B, [[-largo * 0.3, -ancho * 0.36], [largo * 0.3, -ancho * 0.36], [largo * 0.3, ancho * 0.36], [-largo * 0.3, ancho * 0.36]],
             (u, v) => mas(mas(top, t, u), b, v), n, hexRanura);
    }
  }

  /* =============================================================
     IRON SLAB (tricky), DE SU DIBUJO: una PLACA de hierro gris (102)
     DOBLADA AL MEDIO en V, con la cresta vertical delante (cada mitad
     vuelve 18 grados hacia atras: de tres cuartos una mitad sale clara y
     la otra oscura, como en el SWF), de 4 cm de grueso, 50 cm de ancho y
     desde encima de los ojos hasta debajo del menton. Dos ojos ovalados
     negros, uno a cada lado de la cresta, seis agujeros en dos columnas
     junto a ella, y cada cara con su trazo por el borde. La correa (69)
     sale de los costados de la placa derecha hasta TOCAR la cabeza -la
     tangente- y la rodea por la nuca, con su hebilla detras de la oreja.
     ============================================================= */
  const TRICKY = { W: 0.38, T: 0.04, BETA: 30, ARRIBA: 0.25, LADO: -0.13, WB: 0.151, ZB: -0.468, ABAJO: -0.49, vCorrea: 0.04, alto: 0.05, grueso: 0.008 };
  const trickyBase = () => {
    const c = C(), [a0, e0] = Hh.centroCruz(), yE = sobre(0, e0, 0)[1];
    return { c, a0, e0, yE, zF: c.cz + c.rz + 0.111 };
  };
  MOD.tricky = function (B, g, silueta) {
    const { yE, zF } = trickyBase(), { W, T, ARRIBA: A, LADO: VL, WB, ZB, ABAJO: Z } = TRICKY, be = TRICKY.BETA * RAD, cb = Math.cos(be), sb = Math.sin(be);
    const mundo = (u, v, w) => (Math.abs(u) < 1e-9 ? [0, yE + v, zF + w / cb]
      : [u * cb + w * Math.sign(u) * sb, yE + v, zF - Math.abs(u) * sb + w * cb]);
    const nCara = (s) => [s * sb, 0, cb];
    // el contorno (u a lo largo de la cara desde la cresta, v desde los ojos), con la cresta arriba y abajo
    /* de frente, un ESCUDO: ancha como la cabeza arriba, los costados
       derechos hasta la mitad y de ahi se cierra hacia un fondo angosto,
       con la cresta un poco mas abajo en el medio */
    const contorno = [[0, A], [W, A], [W, VL], [WB, ZB], [0, Z], [-WB, ZB], [-W, VL], [-W, A]];
    const gE = silueta ? g : 0;
    const P2 = gE > 0 ? Hh.hinchar(contorno, gE) : contorno;
    const w0 = gE, w1 = -T - gE, iZ = 4;
    const mitades = [P2.slice(0, iZ + 1), P2.slice(iZ).concat([P2[0]])];
    const k = silueta ? [0, 0, 0] : B._rgb(sw(102), 1);
    if (silueta) {
      // vertices compartidos: uno por punto del contorno, delante y detras; la normal, desde el medio de la placa
      const V = (idx, w) => {
        const q = mundo(P2[idx][0], P2[idx][1], w), m = mundo(contorno[idx][0], contorno[idx][1], -T / 2), n = uni(sub(q, m));
        return { i: B._vert(q[0], q[1], q[2], n[0], n[1], n[2], 0, 0, 0), q };
      };
      const Fr = P2.map((p, i) => V(i, w0)), At = P2.map((p, i) => V(i, w1));
      mitades.forEach((mit, s) => {
        const base = s === 0 ? 0 : iZ, idx = (j) => (s === 0 ? j : (base + j) % P2.length);
        const nf = nCara(s === 0 ? 1 : -1);
        for (const t of THREE.ShapeUtils.triangulateShape(mit.map((q) => new THREE.Vector2(q[0], q[1])), [])) {
          const [a, b, d] = t.map(idx);
          tri(B, Fr[a].i, Fr[b].i, Fr[d].i, Fr[a].q, Fr[b].q, Fr[d].q, nf);
          tri(B, At[a].i, At[b].i, At[d].i, At[a].q, At[b].q, At[d].q, nf.map((v) => -v));
        }
      });
      for (let i = 0; i < P2.length; i++) {
        const j = (i + 1) % P2.length, a = Fr[i], b = Fr[j], cc = At[j], d = At[i];
        const mid = [0, 1, 2].map((e) => (a.q[e] + b.q[e] + cc.q[e] + d.q[e]) / 4), f = sub(mid, mundo(0, (A + Z) / 2, -T / 2));
        tri(B, a.i, b.i, cc.i, a.q, b.q, cc.q, f); tri(B, a.i, cc.i, d.i, a.q, cc.q, d.q, f);
      }
    } else {
      // caras planas: cada mitad con su luz, la tapa de arriba mas clara
      const V = (p, w, n) => { const q = mundo(p[0], p[1], w); return { i: B._vert(q[0], q[1], q[2], n[0], n[1], n[2], k[0], k[1], k[2]), q }; };
      mitades.forEach((mit, s) => {
        const sg = s === 0 ? 1 : -1, nf = nCara(sg), nb = nf.map((v) => -v);
        const F = mit.map((p) => V(p, 0, nf)), Bk = mit.map((p) => V(p, -T, nb));
        for (const t of THREE.ShapeUtils.triangulateShape(mit.map((q) => new THREE.Vector2(q[0], q[1])), [])) {
          tri(B, F[t[0]].i, F[t[1]].i, F[t[2]].i, F[t[0]].q, F[t[1]].q, F[t[2]].q, nf);
          tri(B, Bk[t[0]].i, Bk[t[1]].i, Bk[t[2]].i, Bk[t[0]].q, Bk[t[1]].q, Bk[t[2]].q, nb);
        }
      });
      for (let i = 0; i < contorno.length; i++) {
        const p = contorno[i], q = contorno[(i + 1) % contorno.length];
        const um = (p[0] + q[0]) / 2, sg = um >= 0 ? 1 : -1;
        const e2 = [q[0] - p[0], q[1] - p[1]], L = Math.hypot(e2[0], e2[1]), n2 = [-e2[1] / L, e2[0] / L];   // el contorno va en sentido horario
        // la normal del canto: la del contorno llevada a la mitad que le toca
        const eu = [cb, 0, -sg * sb], f = uni([eu[0] * n2[0], n2[1], eu[2] * n2[0]]);
        const Q = [V(p, 0, f), V(q, 0, f), V(q, -T, f), V(p, -T, f)];
        tri(B, Q[0].i, Q[1].i, Q[2].i, Q[0].q, Q[1].q, Q[2].q, f); tri(B, Q[0].i, Q[2].i, Q[3].i, Q[0].q, Q[2].q, Q[3].q, f);
      }
      // lo pintado de delante: el trazo del borde, la cresta, los ojos y los agujeros
      const ENC = 0.0015, BW = 0.007;
      const sobreCara = (u, v) => mundo(u, v, ENC);
      const nEn = (u) => (Math.abs(u) < 1e-6 ? [0, 0, 1] : nCara(Math.sign(u)));
      const borde = Hh.hinchar(contorno, -BW / 2), pb = [], nb2 = [];
      for (let i = 0; i <= borde.length; i++) {
        const p = borde[i % borde.length], q = borde[(i + 1) % borde.length];
        for (let s2 = 0; s2 < 6; s2++) {
          const t = s2 / 6, u = lerp(p[0], q[0], t), v = lerp(p[1], q[1], t);
          if (i === borde.length && s2 > 0) break;
          pb.push(sobreCara(u, v)); nb2.push(nEn(u));
        }
      }
      trazo(B, pb, nb2, BW);
      /* los ojos: grandes y rasgados, mas finos hacia fuera y con la punta de
         fuera caida; los agujeros, dos columnas junto a la cresta. La cresta
         no se pinta: la marca la luz (las mitades caen en escalones
         distintos). */
      const ojo = Array.from({ length: 30 }, (_, i) => {
        const t = i / 30 * 2 * Math.PI, x = Math.cos(t), y = Math.sin(t) * (1 - 0.32 * Math.max(0, x));
        return [x * 0.077, y * 0.044];
      });
      for (const s of [1, -1]) {
        const ca = Math.cos(-10 * RAD), sa = Math.sin(-10 * RAD);
        mancha(B, ojo.map(([x, y]) => [s * (0.19 + x * ca - y * sa), -0.024 + x * sa + y * ca]), sobreCara, nCara(s));
        for (const v of [-0.229, -0.311, -0.392]) mancha(B, superLente(0.016, 0.016, 2, 16).map(([u, vv]) => [s * 0.084 + u, v + vv]), sobreCara, nCara(s));
      }
    }
    // la correa
    tubo3(B, correaTricky(), (r, kk) => (kk === 2 || kk === 3 ? sw(69) : NEGRO), g, silueta, true);
    const hb = correaTricky.hebilla();
    hebilla(B, hb.p, hb.t, hb.n, 0.032, TRICKY.alto + 0.014, 0.008, sw(160), sw(69), g, silueta);
  };
  /* EL CAMINO DE LA CORREA, en el plano de su altura: del costado de la
     placa derecho a la tangente de la cabeza, alrededor de la nuca y otra
     vez derecho a la placa. Cada anillo es la seccion (alto por grueso) con
     puntos de mas en la cara de fuera: la franja negra de arriba y la de
     abajo quedan pintadas (el borde de una correa pegada no es silueta). */
  function correaTricky() {
    const { c, yE, zF } = trickyBase(), { W, T, alto, grueso, vCorrea } = TRICKY, be = TRICKY.BETA * RAD;
    const y = yE + vCorrea, k = Math.sqrt(Math.max(0, 1 - Math.pow((y - c.cy) / c.ry, 2)));
    const off = 0.003 + grueso / 2, rx = c.rx * k + off, rz = c.rz * k + off;
    const E = (t) => [rx * Math.sin(t), c.cz + rz * Math.cos(t)];
    // donde engancha: dentro del costado de la placa, a medio grueso
    // 3,5 cm dentro del costado: la correa sale por detras de la placa y su tinta no asoma por el borde
    const u = W - 0.035, xa = u * Math.cos(be) - (T / 2) * Math.sin(be), za = zF - u * Math.sin(be) - (T / 2) * Math.cos(be);
    const uu = xa / rx, vv = (za - c.cz) / rz, R = Math.hypot(uu, vv), t0 = Math.atan2(uu, vv) + Math.acos(Math.min(1, 1 / R));
    const pts = [];
    const recta = (a, b, n) => { for (let i = 0; i < n; i++) pts.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]); };
    recta([xa, za], E(t0), 4);
    const n = Math.ceil((2 * Math.PI - 2 * t0) / (5 * RAD));
    for (let i = 0; i < n; i++) pts.push(E(lerp(t0, 2 * Math.PI - t0, i / n)));
    recta(E(2 * Math.PI - t0), [-xa, za], 4);
    pts.push([-xa, za]);
    const bw = 0.006, e = 0.0004, h = alto / 2, gg = grueso / 2;
    const perfil = [[gg, h], [gg, h - bw], [gg, h - bw - e], [gg, -h + bw + e], [gg, -h + bw], [gg, -h], [-gg, -h], [-gg, h]];
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz) || 1;
      let nx = tz / L, nz = -tx / L;
      if (nx * p[0] + nz * (p[1] - c.cz) < 0) { nx = -nx; nz = -nz; }
      return perfil.map(([r, v]) => [p[0] + nx * r, y + v, p[1] + nz * r]);
    });
  }
  correaTricky.hebilla = () => {
    const { c, yE } = trickyBase(), { alto, grueso, vCorrea } = TRICKY;
    const y = yE + vCorrea, k = Math.sqrt(Math.max(0, 1 - Math.pow((y - c.cy) / c.ry, 2)));
    const off = 0.003 + grueso + 0.004, t = -118 * RAD;
    const p = [(c.rx * k + off) * Math.sin(t), y, c.cz + (c.rz * k + off) * Math.cos(t)];
    const tg = uni([c.rx * Math.cos(t), 0, -c.rz * Math.sin(t)]);
    return { p, t: tg, n: uni([Math.sin(t) / c.rx, 0, Math.cos(t) / c.rz]) };
  };

  /* =============================================================
     LO DE LA BOCA (MouthsAll, 7318; en 'Parts - Head' con myMouth)

     LOS PAÑUELOS, DE SU DIBUJO (mouth3 negro 54, en pico; mouth6 gris 75,
     mas bajo, abombado y redondo abajo). Atras son una TIRA sobre la nuca,
     con el nudo, sus dos puntas y los pliegues que se juntan en el. Delante
     cuelgan como una cortina: cada columna del paño es lo que haria una
     tela tirante con peso -baja pegada a la cabeza hasta la TANGENTE que
     llega a su punto de abajo y de ahi sigue derecha-, asi que se despega
     sin quiebre (sin la arruga que doblaba la tinta sobre si misma y la
     llenaba de astillas). Donde el borde de abajo apoya (la tira de la
     nuca) lleva su franja negra; donde cuelga, la silueta. Atras va algo
     mas alto que en el dibujo: mas abajo lo tapa el torso.
     ============================================================= */
  const meridiano = (az, d) => {
    const c = C(), a = az * RAD, ex = (c.rx + d) * Math.sin(a), ez = (c.rz + d) * Math.cos(a), A = Math.hypot(ex, ez);
    return { A, Bv: c.ry + d, u: [ex / A, ez / A], cy: c.cy, cz: c.cz };
  };
  const enMeridiano = (m, r, y) => [m.u[0] * r, y, m.cz + m.u[1] * r];
  function panuelo(o) {
    const D0 = 0.0065, GR = 0.006, W = 0.011, M = 72, N = 22;
    const fb = (az) => (1 - Math.cos(az * RAD)) / 2;
    const elT = (az) => lerp(o.arribaF, o.arribaA, Math.pow(fb(az), o.curvaArriba || 1));
    const elB = (az) => lerp(o.abajoL, o.abajoA, suave(o.azH, 180, Math.abs(az)));
    const forma = o.pico ? (u) => Math.pow(u, 1.5) : (u) => Math.pow(Math.sin(u * Math.PI / 2), 1.6);
    const columna = (az) => {
      const m = meridiano(az, D0), eT = elT(az) * RAD, A = m.A, Bv = m.Bv;
      const aE = (e) => enMeridiano(m, A * Math.cos(e), m.cy + Bv * Math.sin(e));
      const out = [];
      let apoyo = 1, eB = null, rB = 0, yB = 0, w = 0;
      if (Math.abs(az) >= o.azH) eB = elB(az) * RAD;
      else {
        const u = 1 - Math.abs(az) / o.azH, yL = m.cy + Bv * Math.sin(o.abajoL * RAD);
        yB = lerp(yL, o.yPunta, forma(u));
        w = suave(0, o.cuelga, u);
        const rH = A * Math.sqrt(Math.max(0, 1 - Math.pow((yB - m.cy) / Bv, 2)));
        rB = lerp(rH, o.kappa * A * Math.cos(eT), w);
        if (Math.hypot(rB / A, (yB - m.cy) / Bv) <= 1) eB = Math.asin(Math.max(-1, Math.min(1, (yB - m.cy) / Bv)));
      }
      if (eB !== null) {
        const n = Math.max(8, Math.ceil((eT - eB) / RAD));
        for (let k = 0; k <= n; k++) out.push(aE(lerp(eT, eB, k / n)));
      } else {
        const uu = rB / A, vv = (yB - m.cy) / Bv, r = Math.hypot(uu, vv);
        const e1 = Math.min(eT, Math.atan2(vv, uu) + Math.acos(1 / r));
        const n = Math.max(1, Math.ceil((eT - e1) / RAD));
        for (let k = 0; k <= n; k++) out.push(aE(lerp(eT, e1, k / n)));
        const r1 = A * Math.cos(e1), y1 = m.cy + Bv * Math.sin(e1), nS = 30;
        for (let k = 1; k <= nS; k++) {
          const t = k / nS, b = (o.bulto || 0) * w * Math.pow(Math.sin(Math.PI * t), 2);
          out.push(enMeridiano(m, lerp(r1, rB, t) + b, lerp(y1, yB, t)));
        }
        apoyo = 1 - suave(0.0015, 0.012, (r - 1) * Math.min(A, Bv));
      }
      return { pts: out, apoyo };
    };
    const f = function (B, g, silueta) {
      const cols = [];
      for (let i = 0; i < M; i++) {
        const az = -180 + 360 * i / M, col = columna(az), cm = camino(col.pts);
        cols.push({ P: filas(cm.L, N, W, W * col.apoyo).map((s) => cm.en(s)), apoyo: col.apoyo });
      }
      lamina(B, cols.map((c2) => c2.P), { vuelta: true, gr: GR, color: (i, j) => (j <= 1 || j >= N - 1 ? NEGRO : o.hex),
                                            apoyo: (i, j) => (j === 0 ? 1 : cols[i].apoyo) }, g, silueta);
      // el nudo de la nuca, en el medio de la tira
      const eK = (elT(180) + elB(180)) / 2, pn = sobre(180, eK, D0 + GR / 2 + 0.012), gg = silueta ? g : 0;
      B.push(); B.translate(pn[0], pn[1], pn[2]);
      B.addEllipsoid(0.046 + gg, 0.036 + gg, 0.026 + gg, 0, 0, 0, silueta ? 0x000000 : o.hex, { seg: 16, rings: 10 });
      B.pop();
      // las dos puntas: cintas con volumen que salen del nudo hacia atras y caen
      for (const s of [1, -1]) {
        const dir = uni([s * o.cola[0], o.cola[1], o.cola[2]]), L = o.cola[3], an = [];
        for (let r = 0; r <= 10; r++) {
          const t = r / 10, c0 = mas(mas(pn, dir, L * t), [0, 1, 0], -0.03 * t * t);
          const tg = uni(mas(dir, [0, 1, 0], -0.06 * t / L)), up = [0, 1, 0];
          const Wd = uni(sub(up, tg.map((v) => v * dot(up, tg)))), Hd = cruz(tg, Wd);
          const hw = 0.016 * (1 + 0.3 * Math.sin(Math.PI * t)) * Math.pow(1 - t, 0.55), ht = 0.0055 * (1 - 0.5 * t) * Math.pow(1 - t, 0.3);
          const A = [];
          for (let k = 0; k < 10; k++) { const a = 2 * Math.PI * k / 10; A.push(mas(mas(c0, Wd, hw * Math.cos(a)), Hd, ht * Math.sin(a))); }
          an.push(A);
        }
        tubo3(B, an, () => o.hex, g, silueta);
      }
      // los pliegues de la tira, que se juntan en el nudo
      if (!silueta) {
        for (const s of [1, -1]) {
          for (const [fr, largo] of [[0.25, 36], [0.55, 50], [0.8, 40]]) {
            const pts = [], nrm = [];
            for (let k = 0; k <= 14; k++) {
              const t = k / 14, az = 180 - s * (8 + largo * t), azN = ((az + 540) % 360) - 180;
              const p = sobre(azN, lerp(eK, lerp(elT(azN), elB(azN), fr), Math.pow(t, 0.7)), D0 + GR / 2 + 0.0015);
              pts.push(p); nrm.push(normalCab(p));
            }
            trazo(B, pts, nrm, (t) => lerp(0.008, 0.0035, t));
          }
        }
      }
    };
    f.elT = elT;
    return f;
  }
  MOD.mouth3 = panuelo({ hex: sw(54), pico: true, arribaF: -9, arribaA: -18, abajoA: -34, abajoL: -36, azH: 105,
                         yPunta: 0.83, cuelga: 0.5, kappa: 0.97, bulto: 0, cola: [0.55, -0.32, -0.77, 0.12] });
  MOD.mouth6 = panuelo({ hex: sw(75), pico: false, arribaF: -3, arribaA: -20, curvaArriba: 0.8, abajoA: -33, abajoL: -38, azH: 112,
                         yPunta: 0.9, cuelga: 0.55, kappa: 0.92, bulto: 0.02, cola: [0.55, -0.22, -0.8, 0.11] });

  /* SKIMASK (mask1), DE SU DIBUJO: el pasamontañas negro (26) tapa TODA la
     cabeza, con una ventana redondeada para la cara alrededor de la cruz
     (de lado a lado de la cara, ±46 grados, y de debajo de la cruz a la
     frente, ±25). El borde de la ventana va ENROLLADO: su trazo negro
     encima del rollo y, por fuera, una tira gris (58) antes del negro. Se
     arma en coordenadas polares desde el centro de la ventana: el borde
     sale liso, sin los dientes de una grilla. Fino (4 mm): encima entran
     gorras y anteojos. */
  const VENTANA = { el: 12, A: 46, H: 25, p: 3.4 };
  const rhoVentana = (fi) => 1 / Math.pow(Math.pow(Math.abs(Math.cos(fi)) / VENTANA.A, VENTANA.p) + Math.pow(Math.abs(Math.sin(fi)) / VENTANA.H, VENTANA.p), 1 / VENTANA.p);
  function baseVentana() {
    const [a0] = Hh.centroCruz(), cv = dirDe(a0, VENTANA.el);
    const u = uni([cv[2], 0, -cv[0]]), v = cruz(cv, u);
    return { cv, u, v };
  }
  MOD.mask1 = function (B, g, silueta) {
    const { cv, u, v } = baseVentana(), M = 72, N = 22, WS = 2.0, WR = 1.4, e = 0.05;
    const cols = [], lejos = [];
    for (let i = 0; i < M; i++) {
      const fi = i / M * 2 * Math.PI, r0 = rhoVentana(fi);
      const rhos = [0, WS, WS + e, WS + WR, WS + WR + e].map((x) => r0 + x), a = r0 + WS + WR + 1.3, nR = N + 1 - rhos.length;
      for (let k = 0; k < nR; k++) rhos.push(a + (180 - a) * Math.pow(k / (nR - 1), 1.5));
      lejos.push(rhos.map((rho) => rho > r0 + 40));
      cols.push(rhos.map((rho) => {
        const R = rho * RAD, dr = rho - r0;
        const d = [0, 1, 2].map((q) => cv[q] * Math.cos(R) + (u[q] * Math.cos(fi) + v[q] * Math.sin(fi)) * Math.sin(R));
        return enCab(uni(d), 0.0045 + 0.0075 * Math.exp(-Math.pow((dr - 2.4) / 2.2, 2)));
      }));
    }
    lamina(B, cols, { vuelta: true, gr: 0.004, color: (i, j) => (j <= 1 ? NEGRO : j <= 3 ? sw(58) : sw(26)), adelanta: (i, j) => lejos[i][j] }, g, silueta);
  };

  /* SARS GUARD (mouth10), DE SU DIBUJO: el barbijo blanco (224) abombado
     sobre boca y barbilla (2,8 cm en el medio), mas ancho en las mejillas
     que en la nariz y bajo el menton, con los bordes pegados a la cara y
     su trazo pintado alrededor, tres pliegues negros de punta redonda y dos
     elasticos finos que salen de sus esquinas hacia la nuca. */
  const SARS = { lo: -56, dHi: -9 };
  const sarsAN = (el, lo, hi) => { const t = Math.max(0, Math.min(1, (el - lo) / (hi - lo))); return 30 + 8 * Math.pow(Math.sin(Math.PI * t), 0.8) + 4 * t; };
  MOD.mouth10 = function (B, g, silueta) {
    const [a0, e0] = Hh.centroCruz(), lo = SARS.lo, hi = e0 + SARS.dHi, W = 0.011, GR = 0.004, M = 30, N = 18;
    const AN = (el) => sarsAN(el, lo, hi);
    const bulto = (az, el) => Math.pow(Math.cos(Math.PI / 2 * Math.min(1, Math.abs(az - a0) / AN(el))), 1.3) *
                              Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, (el - lo) / (hi - lo)))), 0.7);
    const S = (az, el) => sobre(az, el, 0.004 + 0.024 * bulto(az, el));
    const tasa = (az, el, eje) => (eje ? dist(S(az + 0.5, el), S(az - 0.5, el)) : dist(S(az, el + 0.5), S(az, el - 0.5)));
    const els = filas(hi - lo, N, W / tasa(a0, hi, 0), W / tasa(a0, lo, 0)).map((s) => hi - s);
    const P = [];
    for (let i = 0; i <= M; i++) {
      P.push(els.map((el) => {
        const an = AN(el), dA = W / tasa(a0 + an, el, 1), azs = filas(2 * an, M, dA, dA);
        return S(a0 - an + azs[i], el);
      }));
    }
    lamina(B, P, { gr: GR, color: (i, j) => (j <= 1 || j >= N - 1 || i <= 1 || i >= M - 1 ? NEGRO : sw(224)) }, g, silueta);
    if (!silueta) {
      for (const t of [0.3, 0.52, 0.74]) {
        const el = lerp(hi, lo, t), an = AN(el) - 6, pts = [], nrm = [];
        for (let k = 0; k <= 20; k++) {
          const az = a0 - an + 2 * an * k / 20, n = normalDe(S, az, el);
          pts.push(mas(S(az, el), n, GR / 2 + 0.0015)); nrm.push(n);
        }
        trazo(B, pts, nrm, 0.0105);
      }
    }
    // los elasticos, de las esquinas a la nuca
    for (const el of [hi - 1.2, lo + 3.5]) {
      const an = AN(el) - 1;
      casquete(B, { a0: a0 + an, a1: a0 + 360 - an, lo: () => el - 0.8, hi: () => el + 0.8, d: () => 0.004, hex: 0x1a1a1a, M: 40, N: 1 }, g * 0.5, silueta);
    }
  };

  /* BREATHER (mouth1), DE SU DIBUJO: la goma oscura (48) abombada sobre boca
     y nariz, con su trazo por el borde, los dos filtros redondos (85, con el
     centro 27) y dos CORREAS anchas (85) con su trazo en los bordes, que
     salen de debajo de la goma y van a la nuca, cada una con su hebilla
     (160) y un pasador. La de abajo sube hacia la nuca: mas abajo la tapa
     el torso. */
  const RESP = { dC: -33, AW: 31, AH: 21, PE: 2.6 };
  const respCorreas = () => {
    const [a0, e0] = Hh.centroCruz(), eC = e0 + RESP.dC, fb = (az) => (1 - Math.cos((az - a0) * RAD)) / 2;
    return [{ el: (az) => lerp(eC + 12, -12, fb(az)), ancho: 0.032 }, { el: (az) => lerp(eC - 12, -32, fb(az)), ancho: 0.03 }];
  };
  MOD.mouth1 = function (B, g, silueta) {
    const [a0, e0] = Hh.centroCruz(), eC = e0 + RESP.dC, { AW, AH, PE } = RESP, W = 0.011, M = 48, N = 16;
    const Rs = (fi) => 1 / Math.pow(Math.pow(Math.abs(Math.cos(fi)), PE) + Math.pow(Math.abs(Math.sin(fi)), PE), 1 / PE);
    const dD = (rho) => 0.0055 + 0.034 * Math.pow(Math.max(0, 1 - rho * rho), 0.55);
    const azEl = (fi, rho) => { const k = Rs(fi) * rho; return [a0 + AW * k * Math.cos(fi), eC + AH * k * Math.sin(fi)]; };
    const S = (fi, rho) => { const [az, el] = azEl(fi, rho); return sobre(az, el, dD(rho)); };
    const cols = [];
    for (let i = 0; i < M; i++) {
      const fi = i / M * 2 * Math.PI, tasa = dist(S(fi, 1), S(fi, 0.98)) / 0.02, b = W / tasa, e = 0.0004 / tasa, n = N - 2, rh = [];
      for (let k = 0; k <= n; k++) rh.push((1 - b - e) * Math.sin(k / n * Math.PI / 2));
      rh.push(1 - b, 1);
      cols.push(rh.map((r) => S(fi, r)));
    }
    lamina(B, cols, { vuelta: true, gr: 0.005, sinCanto0: true, color: (i, j) => (j >= N - 1 ? NEGRO : sw(48)) }, g, silueta);
    // los filtros, a los costados de la boca
    for (const s of [1, -1]) {
      const az = a0 + s * 19, el = eC + 3, u = (az - a0) / AW, v = (el - eC) / AH, fi = Math.atan2(v, u), rho = Math.hypot(u, v) / Rs(fi);
      const p = S(fi, rho), n0 = uni(cruz(sub(S(fi + 0.02, rho), S(fi - 0.02, rho)), sub(S(fi, rho + 0.02), S(fi, rho - 0.02))));
      const n = dot(n0, normalCab(p)) < 0 ? n0.map((x) => -x) : n0, ax = uni(mas(n, [s, 0, 0], 0.3));
      pieza(B, [[0, 0.03, sw(85)], [0.043, 0.03, sw(85)], [0.049, 0.024, sw(85)], [0.049, -0.012, sw(48)], [0, -0.012]], p, ax, sw(85), g, silueta, 26);
      if (!silueta) {
        pieza(B, [[0, 0.0305, sw(27)], [0.029, 0.0305]], p, ax, sw(27), 0, false, 26);
        pieza(B, [[0.027, 0.031, NEGRO], [0.034, 0.031]], p, ax, NEGRO, 0, false, 26);
      }
    }
    // las correas: de debajo de la goma, alrededor de la nuca
    for (const cr of respCorreas()) {
      const az0 = a0 + 24, az1 = a0 + 336, MI = 64, P = [];
      for (let i = 0; i < MI; i++) {
        const az = lerp(az0, az1, i / (MI - 1)), e = cr.el(az);
        const tasa = dist(sobre(az, e + 0.5, 0.0035), sobre(az, e - 0.5, 0.0035));
        P.push(filas(cr.ancho, 7, 0.0055, 0.0055).map((s) => sobre(az, e + (cr.ancho / 2 - s) / tasa, 0.0035)));
      }
      lamina(B, P, { gr: 0.004, color: (i, j) => (j <= 1 || j >= 6 ? NEGRO : sw(85)) }, g, silueta);
      // la hebilla y el pasador, a cada lado
      for (const s of [1, -1]) {
        for (const [dAz, esH] of [[60, true], [104, false]]) {
          const az = a0 + s * dAz, e = cr.el(az), p = sobre(az, e, 0.0095), n = normalCab(p);
          const t = uni(sub(sobre(az + 1, cr.el(az + 1), 0.0095), sobre(az - 1, cr.el(az - 1), 0.0095)));
          if (esH) hebilla(B, p, t, n, 0.03, cr.ancho + 0.012, 0.007, sw(160), sw(85), g, silueta);
          else caja(B, p, [t, uni(cruz(n, t)), n], [0.005, cr.ancho / 2 + 0.003, 0.0035], sw(85), g, silueta, true);
        }
      }
    }
  };

  Object.assign(Acc.NOMBRES, {
    shades1: 'Radio-Shades', shades12: 'Coolguys', shades3: 'State Troopers', shades5: 'Professionals', shades8: '3-D',
    goggles1: 'Dr. Horrible', paintball1: 'Paintball Mask', tricky: 'Iron Slab',
    mouth3: 'Bandana 1', mouth6: 'Bandana 2', mask1: 'Skimask', mouth10: 'SARS Guard', mouth1: 'Breather'
  });

  // lo que tapan: los anteojos, la franja de los ojos; lo de la boca, de la cruz para abajo
  const ojos = (az, el) => Math.abs(el - 2) < 16 && Math.cos(az * RAD) > -0.2;
  for (const id of ['shades1', 'shades12', 'shades3', 'shades5', 'shades8', 'goggles1', 'paintball1']) CUBRE[id] = ojos;
  // la plancha: su frente (de costado tapa el perfil de la cara) y la correa
  CUBRE.tricky = (az, el) => (Math.cos(az * RAD) > 0.35 && el < 48) || Math.abs(el - elDeY(trickyBase().yE + TRICKY.vCorrea)) < 7;
  // los pañuelos: de su borde de arriba para abajo
  for (const id of ['mouth3', 'mouth6']) CUBRE[id] = (az, el) => el < MOD[id].elT(az) + MARGEN;
  // el pasamontañas: todo menos la ventana
  /* el pasamontañas: solo alrededor de la ventana. En el resto es negro
     liso, y el contorno adelantado del ovalo no se nota encima; tapandolo
     entero, contra el torso la tinta del pasamontañas (sin adelanto) salia
     partida en hilos con el gris del torso entre medio. */
  CUBRE.mask1 = (az, el, n) => {
    const { cv, u, v } = baseVentana(), rho = Math.acos(Math.max(-1, Math.min(1, dot(n, cv)))) / RAD, r0 = rhoVentana(Math.atan2(dot(n, v), dot(n, u)));
    return rho > r0 - 4 && rho < r0 + 30;
  };
  CUBRE.mouth10 = (az, el) => (Math.cos(az * RAD) > 0.7 && el < 0 && el > -64) || Math.abs(el + 9) < 4 || Math.abs(el + 52) < 4;
  CUBRE.mouth1 = (az, el) => {
    const eC = Hh.centroCruz()[1] + RESP.dC;
    return (Math.cos(az * RAD) > 0.75 && Math.abs(el - eC) < RESP.AH + 5) || respCorreas().some((cr) => Math.abs(el - cr.el(az)) < 6);
  };

  global.Prendas3D = { casquete, torno, visera, pieza, sobre, sw, swc };
})(window);
