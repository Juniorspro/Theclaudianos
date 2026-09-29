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
  // un gris del SWF (0-255) pasado al juego; y un color, igual
  const sw = (v) => { const g = Math.round(v * 0.77); return (g << 16) | (g << 8) | g; };
  const swc = (r, g, b) => (Math.round(r * 0.77) << 16) | (Math.round(g * 0.77) << 8) | Math.round(b * 0.77);
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

  global.Prendas3D = { casquete, torno, visera, pieza, sobre, sw, swc };
})(window);
