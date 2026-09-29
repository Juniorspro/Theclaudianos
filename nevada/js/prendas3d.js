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
    // o.azDe(t): el azimut de la columna t (0..1), para apretarlas donde el borde cambia rapido
    const azDe = o.azDe ? (i) => o.azDe(i / M) : (i) => a0 + (a1 - a0) * i / M;
    /* o.trazo (m): EL BORDE QUE APOYA LLEVA SU TRAZO PINTADO. De canto, el
       canto negro se ve de un pixel y se corta; las dos primeras filas (y las
       dos ultimas si es una vincha) encierran una franja negra de ese ancho
       sobre la propia pieza. */
    const W = o.trazo || 0;
    const tasa = (az, el) => dist(sobre(az, el - 0.5, dD(az, el), e), sobre(az, el + 0.5, dD(az, el), e));
    const filasEl = (az) => {
      const l = o.lo(az) - ext, h = abierto ? hiF(az) + ext : 90;
      // mas apretado cerca del borde de abajo (ahi se curva lo que importa)
      const reparto = (t) => (abierto ? t : Math.sin(t * Math.PI / 2));
      if (!W) return Array.from({ length: N + 1 }, (_, j) => l + (h - l) * reparto(j / N));
      const dl = W / tasa(az, l), dh = abierto ? W / tasa(az, h) : 0, eps = 0.02;
      const a = l + dl + eps, b = abierto ? h - dh - eps : 90, nIn = abierto ? N - 3 : N - 1, out = [l, l + dl];
      for (let k = 0; k < nIn; k++) out.push(a + (b - a) * reparto(k / (nIn - 1)));
      if (abierto) out.push(h - dh, h);
      return out;
    };
    const enTrazo = (j) => W > 0 && (j <= 1 || (abierto && j >= N - 1));
    const FE = []; for (let i = 0; i < cols; i++) FE.push(filasEl(azDe(i)));
    const P = [], A = [];
    for (let j = 0; j <= N; j++) {
      const fila = [], fa = [];
      for (let i = 0; i < cols; i++) {
        const az = azDe(i), el = FE[i][j];
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
      const k = silueta ? [0, 0, 0] : B._rgb(enTrazo(j) ? NEGRO : (o.color ? o.color(az, el) : o.hex), 1);
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
        // p[3]: cuanto de la tinta lleva ese punto (la cara de abajo de un ala la pierde hacia la cabeza)
        const gk = g * (p[3] === undefined ? 1 : p[3]);
        return [Math.max(0, p[0] + n[0] * gk / cs), p[1] + n[1] * gk / cs, p[2]];
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
        // un tramo sin tinta en sus dos puntas no lleva cascara (aun pegada, el empuje en pantalla la despega)
        if (perfil[k][3] === 0 && perfil[k + 1][3] === 0) continue;
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

  /* LAS GORRAS: el borde de la tela, en grados, delante (fr) y detras (at). */
  const bordeGorra = (fr, at) => (az) => lerp(at, fr, (1 + Math.cos(az * RAD)) / 2);

  /* LA VISERA, DE SU DIBUJO (SWAT Cap y Ballcap): una placa que sale de
     debajo del borde de delante de la gorra, hacia delante y apenas hacia
     abajo, y en su ultimo tramo SE DOBLA hacia abajo (el pico, mas oscuro).
     Es una lamina: la raiz (j = 0) queda metida bajo la gorra -apoya- y la
     punta y los costados son silueta, con la tinta en el plano de la placa
     (con la de siempre, bajo la visera quedaba una raya suelta y en las
     puntas unas cuñas negras). Por debajo, el mismo gris mas oscuro. */
  function visera2(B, o, g, silueta) {
    const c = C(), MI = 26, tp = o.pico, fr = 0.85;
    const ts = [0, 0.16, 0.32, 0.48, tp, tp + 0.004, tp + (1 - tp) * 0.35, tp + (1 - tp) * 0.7, 1];
    const cd = o.caida * RAD, cp = o.caidaPico * RAD, P = [];
    for (let i = 0; i <= MI; i++) {
      const u = i / MI, az = lerp(o.az0, o.az1, u), s = 2 * u - 1, f = Math.max(0, 1 - s * s);
      const L = o.largo * Math.pow(f, o.forma || 0.5), root = sobre(az, o.lo(az) + 2, o.d0(az) - 0.006), a = az * RAD;
      // hacia DELANTE, no hacia fuera: una visera sale derecha de la frente
      let dx = Math.sin(a) / c.rx * (1 - fr), dz = Math.cos(a) / c.rz * (1 - fr) + fr * 3;
      const Lh = Math.hypot(dx, dz); dx /= Lh; dz /= Lh;
      P.push(ts.map((t) => {
        const t1 = Math.min(t, tp), t2 = Math.max(0, t - tp);
        const fwd = L * (t1 * Math.cos(cd) + t2 * Math.cos(cp)), down = L * (t1 * Math.sin(cd) + t2 * Math.sin(cp)) + (o.curva || 0) * s * s * t * t;
        return [root[0] + dx * fwd, root[1] - down, root[2] + dz * fwd];
      }));
    }
    lamina(B, P, { gr: o.gr || 0.012, tintaN: 0.25, sinHundir: true, color: (i, j) => (ts[j] > tp + 0.001 ? o.hexPico : o.hex),
                   apoyo: (i, j) => (j === 0 ? 1 : 0), apoyoLado: () => 0 }, g, silueta);
  }

  /* UNA COPA POR COLUMNAS: lo que no sigue la cabeza a distancia fija (la
     gorra de tapa plana). Cada columna es un camino en el plano de su
     meridiano, del apoyo en la cabeza hacia arriba hasta el eje; la grilla
     es una lamina: el borde de abajo apoya (trazo pintado y canto hundido)
     y arriba todas se juntan. o.camino(az, m) -> {pts: [[rho, y], ...]};
     o.color(az, j, s, columna) -> gris. */
  function copa(B, o, g, silueta) {
    const cols = o.azs.map((az) => {
      const m = meridiano(az, o.D0), cam = o.camino(az, m), cm = camino(cam.pts.map(([r, y]) => enMeridiano(m, r, y)));
      // o.cortes(cam): filas de mas donde el color cambia de golpe (las mismas en cada columna)
      const S = filas(cm.L, o.N, o.W, 0).concat(o.cortes ? o.cortes(cam) : []).sort((a, b) => a - b);
      return Object.assign(cam, { az, m, cm, S, P: S.map((s) => cm.en(s)) });
    });
    lamina(B, cols.map((c2) => c2.P), { vuelta: true, gr: o.gr, apoyo: () => 1,
      color: (i, j) => (j <= 1 ? NEGRO : o.color(cols[i].az, j, cols[i].S[j], cols[i])) }, g, silueta);
    return cols;
  }

  /* SWAT CAP (hat1), DE SU DIBUJO: gorra de TAPA PLANA -apenas sobre la
     coronilla- con las paredes casi derechas que se cierran hacia arriba, un
     panel delantero mas claro (83) entre dos pliegues, la costura de la
     franja atras y la visera con el pico doblado. La tela, 49. */
  const LO_HAT1 = bordeGorra(15, 9), D0_HAT1 = 0.012;
  function caminoHat1(az, m) {
    const c = C(), yT = c.cy + c.ry + 0.014, RC = 0.035, PE = 4, RX = 0.228, RZ = 0.218;   // tapa de esquinas marcadas: el frente, una cara plana
    const f = Math.atan2(m.u[0], m.u[1]);
    const rk = 1 / Math.pow(Math.pow(Math.abs(Math.sin(f)) / RX, PE) + Math.pow(Math.abs(Math.cos(f)) / RZ, PE), 1 / PE);
    const e = LO_HAT1(az) * RAD, p0 = [m.A * Math.cos(e), m.cy + m.Bv * Math.sin(e)];
    const t0 = (yT - RC - p0[1]) / (yT - p0[1]), q0 = [lerp(p0[0], rk, t0), yT - RC], q2 = [rk - RC, yT], pts = [p0, q0];
    // la esquina redonda: de la pared a la tapa, tangente a las dos
    for (let k = 1; k <= 8; k++) { const t = k / 8, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), d = t * t; pts.push([a * q0[0] + b * rk + d * q2[0], a * q0[1] + b * yT + d * q2[1]]); }
    pts.push([0, yT]);
    return { pts, pared: Math.hypot(q0[0] - p0[0], q0[1] - p0[1]) };
  }
  MOD.hat1 = function (B, g, silueta) {
    // el panel ocupa TODA la cara de delante, de esquina a esquina (a ±36 salia una tira angosta y alta)
    const PANEL = 48, azs = [];
    for (let k = 0; k < 60; k++) azs.push(-180 + 6 * k);
    for (const s of [1, -1]) for (const d of [-1.1, -0.9, 0.9, 1.1]) azs.push(s * PANEL + d);
    azs.sort((a, b) => a - b);
    copa(B, { azs, camino: caminoHat1, D0: D0_HAT1, N: 22, W: 0.010, gr: 0.006, cortes: (cam) => [cam.pared - 0.0006, cam.pared + 0.0006],
      color: (az, j, s, col) => {
        if (s > col.pared) return sw(49);                            // la tapa y su esquina
        if (Math.abs(Math.abs(az) - PANEL) <= 0.95) return NEGRO;    // los pliegues del panel, del grueso del trazo
        return Math.abs(az) < PANEL ? sw(83) : sw(49);
      } }, g, silueta);
    /* ANCHA COMO EL FRENTE DE LA GORRA y casi plana; el pico, corto y poco
       caido. Con ±50 grados y el pico a 42 desde la mitad, de frente salia
       una repisa angosta y alta. */
    visera2(B, { az0: -66, az1: 66, lo: LO_HAT1, d0: () => D0_HAT1, largo: 0.2, caida: 4, pico: 0.66, caidaPico: 26,
                 curva: 0.008, forma: 0.22, gr: 0.01, hex: sw(66), hexPico: sw(51) }, g, silueta);
    if (silueta) return;
    /* LA ARISTA DE LA TAPA: la linea negra donde la pared dobla hacia la tapa
       plana. En el dibujo cierra el panel claro por arriba; sin ella, la
       esquina redonda lo fundia con la tapa y el borde salia borroso. */
    const col = (az) => { const m = meridiano(az, D0_HAT1), cam = caminoHat1(az, m); return { cam, cm: camino(cam.pts.map(([r, y]) => enMeridiano(m, r, y))) }; };
    const ar = [], an = [];
    for (let q = 0; q <= 120; q++) {
      const az = -180 + 3 * q, c0 = col(az), s0 = c0.cam.pared + 0.004, p = c0.cm.en(s0);
      const tu = sub(col(az + 0.5).cm.en(s0), col(az - 0.5).cm.en(s0)), tv = sub(c0.cm.en(s0 + 0.004), c0.cm.en(s0 - 0.004));
      let n = uni(cruz(tu, tv)); if (dot(n, normalCab(p)) < 0) n = n.map((v) => -v);
      ar.push(mas(p, n, 0.0045)); an.push(n);
    }
    trazo(B, ar, an, 0.012);
    // la costura de la franja, atras, 3,6 cm sobre el borde
    const pts = [], nrm = [];
    for (let q = 0; q <= 24; q++) {
      const azN = ((110 + 140 * q / 24 + 540) % 360) - 180, m = meridiano(azN, D0_HAT1);
      const p = camino(caminoHat1(azN, m).pts.map(([r, y]) => enMeridiano(m, r, y))).en(0.036), n = normalCab(p);
      pts.push(mas(p, n, 0.0045)); nrm.push(n);
    }
    trazo(B, pts, nrm, 0.007);
  };

  /* BALLCAP (hat4), DE SU DIBUJO: la copa redonda y alta (153; en su dibujo
     se levanta 6 cm sobre la cabeza) con sus costuras y el boton, el borde
     pintado, y la visera (102) con el pico doblado hacia abajo. */
  const LO_HAT4 = bordeGorra(25, 12);
  const dHat4 = (az, el) => 0.012 + 0.05 * suave(12, 86, el) * (0.72 + 0.28 * Math.cos(az * RAD * 0.5));
  MOD.hat4 = function (B, g, silueta) {
    casquete(B, { lo: LO_HAT4, d: dHat4, e: 0.95, hex: sw(153), M: 56, N: 16, trazo: 0.010 }, g, silueta);
    visera2(B, { az0: -66, az1: 66, lo: LO_HAT4, d0: (az) => dHat4(az, LO_HAT4(az)), largo: 0.23, caida: 4, pico: 0.64, caidaPico: 24,
                 curva: 0.02, forma: 0.28, gr: 0.01, hex: sw(102), hexPico: sw(90) }, g, silueta);
    const top = sobre(0, 90, dHat4(0, 90) - 0.004, 0.95);
    pieza(B, [[0, 0.018, sw(120)], [0.02, 0.013, sw(120)], [0.026, 0]], top, [0, 1, 0], sw(120), g * 0.4, silueta, 14);
    if (silueta) return;
    // las costuras: de la coronilla al borde, cada 60 grados
    const S = (az, el) => sobre(az, el, dHat4(az, el), 0.95);
    for (let k = 0; k < 6; k++) {
      const az = k * 60 - 180, pts = [], nrm = [];
      for (let q = 0; q <= 16; q++) {
        const el = lerp(85, LO_HAT4(az) + 3.5, q / 16), n = normalDe(S, az, el);
        pts.push(mas(S(az, el), n, 0.0015)); nrm.push(n);
      }
      trazo(B, pts, nrm, 0.004, sw(118));
    }
  };

  /* SWEATBAND (hat3), DE SU DIBUJO: una vincha de 60, de unos 7 cm, ALTA
     delante -en la frente, muy por encima de la cruz- y baja detras, con
     su trazo pintado arriba y abajo. (Estaba al reves.) */
  const LO_HAT3 = (az) => lerp(16, 47, (1 + Math.cos(az * RAD)) / 2), ANCHO_HAT3 = 10.5;
  MOD.hat3 = function (B, g, silueta) {
    casquete(B, { lo: LO_HAT3, hi: (az) => LO_HAT3(az) + ANCHO_HAT3, trazo: 0.009,
                  d: (az, el) => 0.005 + 0.008 * Math.sin(Math.PI * Math.max(0, Math.min(1, (el - LO_HAT3(az)) / ANCHO_HAT3))),
                  hex: sw(60), M: 64, N: 9 }, g, silueta);
  };

  /* LEON CAP (hat2), DE SU DIBUJO: gorro de lana (69) CAIDO hacia atras: el
     borde cruza la frente alto (30 grados) y baja por los costados hasta la
     nuca (-12); arriba y detras la lana se abomba y cuelga. El borde, un
     poco enrollado, con su trazo; los pliegues, pintados (51). Una sola
     pieza: el puño aparte dejaba dos rayas con una franja clara en medio. */
  const LO_HAT2 = (az) => lerp(-12, 30, Math.pow((1 + Math.cos(az * RAD)) / 2, 1.1));
  const dHat2 = (az, el) => {
    const t = el - LO_HAT2(az), atras = Math.max(0, -Math.cos(az * RAD));
    return 0.02 + 0.008 * Math.sin(Math.PI * Math.max(0, Math.min(1, t / 7))) + 0.018 * suave(15, 80, el) +
           0.085 * Math.pow(atras, 1.3) * Math.exp(-Math.pow((el - 42) / 30, 2)) * suave(0, 14, t);
  };
  MOD.hat2 = function (B, g, silueta) {
    casquete(B, { lo: LO_HAT2, d: dHat2, hex: sw(69), M: 56, N: 16, trazo: 0.010 }, g, silueta);
    if (silueta) return;
    const S = (az, el) => sobre(az, el, dHat2(az, el));
    const pliegues = [[[60, 40], [95, 30], [125, 18]], [[70, 56], [110, 45], [140, 30]], [[100, 66], [140, 52], [165, 36]]];
    for (const sg of [1, -1]) {
      for (const L of pliegues) {
        const pts = [], nrm = [];
        for (let q = 0; q <= 14; q++) {
          const t = q / 14, k = t < 0.5 ? 0 : 1, u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
          const az = sg * lerp(L[k][0], L[k + 1][0], u), el = lerp(L[k][1], L[k + 1][1], u), n = normalDe(S, az, el);
          pts.push(mas(S(az, el), n, 0.0015)); nrm.push(n);
        }
        trazo(B, pts, nrm, (t) => 0.0075 * Math.sin(Math.PI * (0.1 + 0.8 * t)), sw(51));
      }
    }
  };

  /* EL ALA: de r0 (la copa) a r1 (el borde), su cara de arriba a la altura
     y, el canto redondo (medio circulo de 'gr' de grueso) y la de abajo de
     vuelta hasta la cabeza, donde se hunde derecho (rIn). Con el canto
     afilado, la tinta se doblaba en la punta. Arriba y abajo van en cuatro
     tramos: con uno solo el alabeo (la vuelta hacia arriba) salia en cono.
     LA TINTA DE ABAJO SE PIERDE HACIA LA CABEZA: entera en el canto, 12%
     en la raiz. Con la cascara g por debajo de toda el ala, entre el ala
     levantada y la cabeza asomaba una cuña negra suelta, con una franja
     clara de cabeza entre ella y el ala (el Bowler de costado). */
  function ala(r0, r1, y, gr, hexA, hexC, hexB, rIn) {
    const rc = gr / 2, P = [];
    for (let k = 0; k < 4; k++) P.push([lerp(r0, r1 - rc, k / 4), y, hexA]);
    for (let k = 0; k <= 4; k++) {
      const a = Math.PI / 2 - Math.PI * k / 4;
      P.push([r1 - rc + rc * Math.cos(a), y - rc + rc * Math.sin(a), k < 4 ? hexC : hexB]);
    }
    const yB = (r) => y - gr + 0.0015 * (r1 - rc - r) / (r1 - rc - rIn);
    for (const [t, tk] of [[0.3, 0], [0.6, 0], [0.85, 0]]) { const r = lerp(r1 - rc, rIn, t); P.push([r, yB(r), hexB, tk]); }
    P.push([rIn, yB(rIn), hexB, 0], [rIn - 0.035, yB(rIn) - 0.02, hexB, 0]);
    return P;
  }
  /* LOS DE COPA: la copa CALZA en la cabeza: su base mide lo que la cabeza a
     la altura de apoyo mas 1,2 cm (mas angosta, la cabeza la atravesaba y
     asomaba en astillas claras). CADA UNO APOYA DONDE LO PONE SU DIBUJO: la
     altura sale del ancho de su copa (una copa ancha baja hasta la frente).
     Inclinados 2 grados hacia atras. */
  const INCL = -2, Y_COPA = { hat5: 1.60, hat6: 1.535, top: 1.585, fedora: 1.55, hat9: 1.555 };
  function ajuste(yA) {
    const BASE = radioA(yA - 0.022)[0] + 0.012;
    return { yA, BASE, poner: (perfil, o, B, g, silueta) => {
      const [rx, rz] = radioA(yA), oo = Object.assign({ x: 0, y: yA, z: C().cz, M: 44, incl: INCL, sx: 1, sz: rz / rx * 1.01 }, o);
      torno(B, perfil, oo, g, silueta);
      if (!silueta) juntaAla(B, perfil, oo);
    } };
  }
  /* LA JUNTA DEL ALA CON LA CABEZA, PINTADA: una franja negra sobre la
     cabeza desde donde entra la cara de abajo del ala hasta 1,1 cm mas
     abajo. La tinta del ala no sirve ahi: su cascara, g por debajo, llenaba
     el hueco entre el ala levantada y la cabeza (una cuña negra suelta), y
     sin cascara el empuje en pantalla la despegaba igual (un hilo claro
     entre el ala y la raya). La franja nace en la juntura: no deja hueco. */
  function juntaAla(B, perfil, o) {
    const c = C(), al = o.alabeo || (() => 0), ci = Math.cos(o.incl * RAD), si = Math.sin(o.incl * RAD);
    const mundo = (r, y, az) => {
      const a = az * RAD, lx = o.sx * r * Math.sin(a), ly = y + al(az, r, y), lz = o.sz * r * Math.cos(a);
      return [o.x + lx, o.y + ly * ci - lz * si, o.z + ly * si + lz * ci];
    };
    const q = (p) => Math.hypot(p[0] / c.rx, (p[1] - c.cy) / c.ry, (p[2] - c.cz) / c.rz);
    const pts = [], nrm = [];
    for (let k = 0; k <= 90; k++) {
      const az = k * 4;
      // desde la punta de adentro (hundida) hacia fuera: el primer tramo que sale de la cabeza
      let P = null;
      for (let m = perfil.length - 1; m > 0 && !P; m--) {
        const A = perfil[m], Z = perfil[m - 1], en = (t) => mundo(lerp(A[0], Z[0], t), lerp(A[1], Z[1], t), az);
        if (q(en(0)) >= 1 || q(en(1)) < 1) continue;
        let lo = 0, hi = 1;
        for (let it = 0; it < 24; it++) { const t = (lo + hi) / 2; if (q(en(t)) < 1) lo = t; else hi = t; }
        P = en(lo);
      }
      if (!P) continue;
      const azH = Math.atan2(P[0] / c.rx, (P[2] - c.cz) / c.rz) / RAD, p = sobre(azH, elDeY(P[1]) - 0.46, 0.0025);
      pts.push(p); nrm.push(normalCab(p));
    }
    trazo(B, pts, nrm, 0.016, NEGRO);
  }

  /* DESPERADO (hat5), DE SU DIBUJO: la copa corta, un cilindro de tapa plana
     (48), y el ala enorme y plana (48, el filo 80), el doble de ancha que la
     cabeza. */
  MOD.hat5 = function (B, g, silueta) {
    const f = ajuste(Y_COPA.hat5), R = f.BASE;
    f.poner([[0, 0.158, sw(48)], [R - 0.03, 0.158, sw(48)], [R - 0.008, 0.148, sw(48)], [R + 0.002, 0.12, sw(48)], [R + 0.002, 0.03, sw(48)]]
      .concat(ala(R + 0.003, 0.53, 0.012, 0.022, sw(48), sw(80), sw(40), R - 0.016)),
      { alabeo: (az, r) => 0.01 * Math.max(0, (r - R) / 0.25) * Math.cos(2 * az * RAD) }, B, g, silueta);
  };

  /* BOWLER (hat6), DE SU DIBUJO: la copa redonda y alta (58), la cinta clara
     (115) y el ala (51) doblada hacia arriba a los costados. Apoya baja: la
     copa es tan ancha como la cabeza. */
  MOD.hat6 = function (B, g, silueta) {
    const f = ajuste(Y_COPA.hat6), R = f.BASE, copa6 = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8 * Math.PI / 2; copa6.push([(R - 0.014) * Math.pow(Math.sin(t), 0.7), 0.125 + 0.175 * Math.pow(Math.cos(t), 0.9), sw(58)]); }
    f.poner(copa6.concat([[R - 0.006, 0.115, sw(115)], [R + 0.002, 0.036, sw(58)]])
      .concat(ala(R + 0.004, R + 0.125, 0.016, 0.022, sw(51), sw(66), sw(40), R - 0.016)),
      { alabeo: (az, r) => { const t = Math.max(0, (r - R) / 0.125); return 0.06 * Math.pow(t, 1.4) * Math.pow(Math.sin(az * RAD), 2) - 0.012 * t * Math.max(0, Math.cos(az * RAD)); } },
      B, g, silueta);
  };

  /* TOPHAT (top), DE SU DIBUJO: la copa alta y apenas acampanada (102) con
     la tapa clara (153), la cinta negra, y el ala clara (150; por debajo 80)
     con los costados levantados. */
  MOD.top = function (B, g, silueta) {
    const f = ajuste(Y_COPA.top), R = f.BASE;
    f.poner([[0, 0.46, sw(153)], [R + 0.004, 0.46, sw(153)], [R + 0.016, 0.448, sw(102)], [R - 0.003, 0.1, 0x0c0c0c], [R + 0.001, 0.028, sw(102)]]
      .concat(ala(R + 0.002, R + 0.1, 0.018, 0.022, sw(150), sw(110), sw(80), R - 0.016)),
      { alabeo: (az, r) => 0.035 * Math.max(0, (r - R) / 0.1) * Math.pow(Math.sin(az * RAD), 2) }, B, g, silueta);
  };

  /* FEDORA, DE SU DIBUJO: la copa (51) alta que se cierra hacia arriba, con
     el hundido de la tapa y el pellizco de delante, la cinta clara y ancha
     (153), y el ala baja delante y levantada atras. */
  MOD.fedora = function (B, g, silueta) {
    const f = ajuste(Y_COPA.fedora), R = f.BASE;
    f.poner([[0, 0.255, sw(51)], [0.07, 0.268, sw(51)], [R - 0.085, 0.3, sw(51)], [R - 0.05, 0.278, sw(51)], [R - 0.022, 0.2, sw(51)],
             [R - 0.006, 0.125, sw(153)], [R + 0.003, 0.036, sw(51)]]
      .concat(ala(R + 0.005, R + 0.15, 0.012, 0.02, sw(51), sw(72), sw(40), R - 0.016)), {
        sz: radioA(f.yA)[1] / radioA(f.yA)[0] * 1.03,
        alabeo: (az, r, y) => {
          const t = Math.max(0, (r - R - 0.005) / 0.145), c2 = Math.cos(az * RAD);
          // el ala: abajo delante, arriba atras y a los costados; la copa, pellizcada delante (suave: con un corte, salia una arista)
          return t * (-0.06 * Math.max(0, c2) + 0.05 * Math.max(0, -c2) + 0.02 * Math.pow(Math.sin(az * RAD), 2)) -
                 0.035 * Math.pow(Math.max(0, c2), 3) * suave(0.16, 0.24, y) * suave(0.1, 0.2, r);
        } }, B, g, silueta);
  };

  /* SOMBRERO (hat9), DE SU DIBUJO: la copa alta y en punta redondeada, de
     paja (204) con su trama (153); el ala enorme que sube en el filo como
     un plato, clara arriba (190) y oscura abajo (102), con la guarda roja en
     zigzag (255, 0, 0, filete oscuro) cerca del borde y el filo blanco. */
  MOD.hat9 = function (B, g, silueta) {
    const f = ajuste(Y_COPA.hat9), R = f.BASE, H = 0.4, s = radioA(f.yA)[1] / radioA(f.yA)[0] * 1.01;
    const copa9 = [];
    for (let i = 0; i <= 10; i++) { const y = H - (H - 0.03) * i / 10; copa9.push([R * Math.pow(Math.max(0, 1 - Math.pow(y / H, 1.8)), 0.55), y, sw(204)]); }
    copa9[0][0] = 0;
    const alabeo = (az, r) => 0.075 * Math.pow(Math.max(0, (r - 0.44) / 0.22), 2) - 0.012 * Math.max(0, (r - R) / 0.2) * Math.max(0, Math.cos(az * RAD));
    const radios = [R + 0.004, 0.36, 0.44, 0.5, 0.56, 0.61], gr = 0.024, rc = gr / 2, r1 = 0.66, y = 0.016;
    const ala9 = radios.map((r) => [r, y, sw(190)]);
    for (let k = 0; k <= 4; k++) { const a = Math.PI / 2 - Math.PI * k / 4; ala9.push([r1 - rc + rc * Math.cos(a), y - rc + rc * Math.sin(a), k < 4 ? sw(230) : sw(102)]); }
    // la cara de abajo, con la tinta que se pierde hacia la cabeza (ver ala())
    for (let k = radios.length - 1; k >= 1; k--) ala9.push([radios[k], y - gr, sw(102), Math.max(0, (radios[k] - radios[2]) / (radios[radios.length - 1] - radios[2]))]);
    ala9.push([R - 0.016, y - gr + 0.0015, sw(102), 0], [R - 0.051, y - gr - 0.02, sw(102), 0]);
    f.poner(copa9.concat(ala9), { alabeo }, B, g, silueta);
    if (silueta) return;
    // lo pintado: en el marco del sombrero (el mismo que el torno)
    B.push(); B.translate(0, f.yA, C().cz); B.rotateX(INCL * RAD);
    const enAla = (az, r, dy) => { const a = az * RAD; return [r * Math.sin(a), y + 0.004 + dy + alabeo(az, r), s * r * Math.cos(a)]; };
    const nAla = (az, r) => { const q0 = enAla(az, r - 0.01, 0), q1 = enAla(az, r + 0.01, 0), t = uni(sub(q1, q0)), l = [Math.cos(az * RAD), 0, -Math.sin(az * RAD)]; return uni(cruz(t, l)).map((v) => v * (cruz(t, l)[1] >= 0 ? 1 : -1)); };
    // el filo blanco
    { const pts = [], nrm = []; for (let k = 0; k <= 120; k++) { const az = k * 3; pts.push(enAla(az, 0.635, 0.001)); nrm.push(nAla(az, 0.635)); } trazo(B, pts, nrm, 0.014, swc(255, 255, 255)); }
    // la guarda: el zigzag con su filete oscuro debajo
    const zz = (t) => { const fz = (t * 20) % 1; return 0.47 + 0.11 * (fz < 0.5 ? fz * 2 : 2 - fz * 2); };
    for (const [w, hex, dy] of [[0.034, swc(64, 0, 0), 0.0006], [0.022, swc(255, 0, 0), 0.0014]]) {
      const pts = [], nrm = [];
      for (let k = 0; k <= 400; k++) { const t = k / 400, az = t * 360, r = zz(t); pts.push(enAla(az, r, dy)); nrm.push(nAla(az, r)); }
      trazo(B, pts, nrm, w, hex);
    }
    B.pop();
    // la trama de la paja en la copa: dos familias de rayas en diagonal
    B.push(); B.translate(0, f.yA, C().cz); B.rotateX(INCL * RAD);
    const enCopa = (az, yy, dr) => { const r = R * Math.pow(Math.max(0, 1 - Math.pow(yy / H, 1.8)), 0.55) + dr, a = az * RAD; return [r * Math.sin(a), yy, s * r * Math.cos(a)]; };
    for (const sg of [1, -1]) {
      for (let k = 0; k < 14; k++) {
        const pts = [], nrm = [];
        for (let q = 0; q <= 10; q++) {
          const t = q / 10, yy = lerp(0.06, 0.33, t), az = k * (360 / 14) + sg * 70 * t;
          const p = enCopa(az, yy, 0.0025), n = uni(sub(enCopa(az, yy, 0.02), enCopa(az, yy, 0)));
          pts.push(p); nrm.push(n);
        }
        trazo(B, pts, nrm, (t) => 0.0045 * Math.sin(Math.PI * (0.08 + 0.84 * t)), sw(150));
      }
    }
    B.pop();
  };

  /* HEADPHONES, DE SU DIBUJO (medido en la hoja del SWF a 22x): las copas
     son grandes -un tercio del alto de la cabeza- y van un poco por delante
     del costado (76 grados): de tres cuartos quedan en la mitad de atras y
     el arco sube hacia la frente. La cara de la copa clara (62, aqui 76 por
     la luz) con su arco negro en la mitad de abajo, el costado oscuro (40)
     de 6 cm, el yugo claro (204) de 14 cm y el arco ancho (51) de 8,4.
     EL ARCO Y EL YUGO VAN APOYADOS, como las correas: laminas sobre la
     cabeza con la franja negra de cada borde pintada y el canto metido en
     ella. Sueltos a 2-3 cm, bajo el arco asomaba la cabeza en rayitas, el
     yugo de canto era un palito claro con una tinta finita y tapaba la
     parte de abajo de la tinta de la copa (una medialuna clara entre los
     dos). El yugo pasa por detras del reborde de la copa. */
  const AUR = { az: 76, y: -0.015, W: 0.042, GR: 0.008, TOPE: 66, YW: 0.07, YGR: 0.01, FIN: 84 };
  const aurCopa = (s) => {
    const c = C(), p0 = sobre(s * AUR.az, elDeY(c.cy + AUR.y), 0), eje = normalCab(p0);
    const up = uni(sub([0, 1, 0], eje.map((v) => v * eje[1]))), lado = cruz(eje, up);
    return { p0, eje, up, lado };
  };
  MOD.headphones = function (B, g, silueta) {
    const c = C(), zB = aurCopa(1).p0[2];
    // el punto de la cabeza en el plano z = zB + w, a th grados de la coronilla, h por fuera (por su normal)
    const enPlano = (th, w, h) => {
      const z = zB + w, k = Math.sqrt(Math.max(0, 1 - Math.pow((z - c.cz) / c.rz, 2))), a = th * RAD;
      const p = [c.rx * k * Math.sin(a), c.cy + c.ry * k * Math.cos(a), z];
      return mas(p, normalCab(p), h);
    };
    /* EL ARCO, de yugo a yugo: termina dentro de la franja negra de arriba
       del yugo. Metido debajo, su tinta (adelantada 1 cm, como toda la de la
       ropa de la cabeza) atravesaba la cara del yugo en rayitas negras. */
    const thY = AUR.TOPE - 5, dth = 0.007 / (c.ry * RAD), thF = thY + dth / 2;   // el borde de arriba del yugo, su franja, el fin del arco
    const NB = 66, fB = filas(2 * AUR.W, 9, 0.007, 0.007), thB = (i) => -thF + 2 * thF * i / NB, PB = [];
    for (let i = 0; i <= NB; i++) PB.push(fB.map((w) => enPlano(thB(i), w - AUR.W, AUR.GR / 2)));
    // su tinta de fuera baja a un tercio en el ultimo centimetro: entera, asomaba sobre el yugo como una aleta
    lamina(B, PB, { gr: AUR.GR, dentro: 0.022, color: (i, j) => (j <= 1 || j >= 8 ? NEGRO : sw(51)),
                    tintaEn: (i) => 1 - 0.7 * suave(thY - 2, thF, Math.abs(thB(i))) }, g, silueta);
    /* el yugo apoya en la cabeza, 2 mm mas alto que el arco (una vaina):
       montado encima del arco, de frente su borde de arriba sobresalia como
       una solapa y su costado claro quedaba en una rendija */
    const hY = AUR.YGR / 2;
    for (const s of [1, -1]) {
      const cp = aurCopa(s);
      /* EL YUGO: del borde de arriba (donde termina el arco) hasta el
         contorno de la copa, con una franja negra en cada borde. NO PASA POR DEBAJO DE LA
         COPA: a su misma profundidad tapaba la parte de adentro de la tinta
         de la copa y entre copa y contorno quedaba una medialuna clara. Su
         borde de abajo sigue el redondo de la copa a 6 mm de ella, debajo de
         su contorno. */
      const fY = filas(2 * AUR.YW, 11, 0.007, 0.007), NY = 14, R0 = 0.131;
      const aEje = (q) => { const v = sub(q, cp.p0), t = dot(v, cp.eje); return Math.hypot(v[0] - cp.eje[0] * t, v[1] - cp.eje[1] * t, v[2] - cp.eje[2] * t); };
      const PY = [];
      for (let i = 0; i <= NY + 2; i++) PY.push([]);
      fY.forEach((w) => {
        // donde esa columna llega a R0 del eje de la copa
        let lo = thY, hi = AUR.FIN;
        for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (aEje(enPlano(s * m, w - AUR.YW, hY)) > R0) lo = m; else hi = m; }
        /* las esquinas de arriba, redondas (1,5 cm): vivas, de sesgo el empuje
           de la tinta en pantalla las sacaba como un pico */
        const RC = 0.015, u = Math.max(0, Math.abs(w - AUR.YW) - (AUR.YW - RC)) / RC;
        const thT = thY + (RC / (c.ry * RAD)) * (1 - Math.sqrt(Math.max(0, 1 - u * u)));
        const thE = lo, ths = [thT, thT + dth];
        for (let k = 0; k < NY - 3; k++) ths.push(lerp(thT + dth + 0.06, thE - dth - 0.06, k / (NY - 4)));
        ths.push(thE - dth, thE);
        ths.forEach((th, i) => PY[i].push(enPlano(s * th, w - AUR.YW, hY)));
      });
      PY.length = NY + 1;
      // su tinta de fuera, a la mitad: entera (1,6 cm sobre una placa de 1), de sesgo sobresalia de las esquinas como un pico
      lamina(B, PY, { gr: AUR.YGR, dentro: 0.024, tintaN: 0.5, color: (i, j) => (i <= 1 || i >= NY - 1 || j <= 1 || j >= 10 ? NEGRO : sw(204)) }, g, silueta);
      /* LAS COPAS: la cara apenas abombada, el reborde, y la almohadilla que
         se cierra hacia la cabeza y se mete en ella. Su tinta se pierde en la
         almohadilla (ver ala()): entera, bajaba 1,6 cm por fuera del costado
         y asomaba separada de la copa. */
      const cara = [[0, 0.092], [0.06, 0.09], [0.095, 0.084], [0.115, 0.074]];
      const perfilCopa = cara.map(([r, h]) => [r, h, sw(76)]).concat([[0.124, 0.064, sw(36)], [0.125, 0.052, sw(36)], [0.125, 0.04, sw(36)],
                [0.124, 0.032, sw(36), 0.5], [0.12, 0.018, sw(36), 0], [0.11, 0.0, sw(36), 0], [0.08, -0.012, sw(36), 0], [0, -0.012, undefined, 0]]);
      const base = mas(cp.p0, cp.eje, -0.03);
      pieza(B, perfilCopa, base, cp.eje, sw(36), g, silueta, 32);
      if (silueta) continue;
      // LA JUNTA: la linea de la copa donde apoya en la cabeza (sin ella el redondo se veia flotando)
      juntaPieza(B, perfilCopa, base, cp.eje);
      /* EL ARCO DE LA TAPA, como en el SWF: una n en la mitad de abajo de la
         cara, de lado a lado casi (3/4 del radio) */
      const alto = (r) => { for (let q = 1; q < cara.length; q++) if (r <= cara[q][0]) return lerp(cara[q - 1][1], cara[q][1], (r - cara[q - 1][0]) / (cara[q][0] - cara[q - 1][0])); return cara[cara.length - 1][1]; };
      const Rf = 0.112, pts = [], nrm = [];
      for (let q = 0; q <= 24; q++) {
        const t = 2 * q / 24 - 1, du = 0.16 * Rf - 0.5 * Rf * t * t, dl = s * 0.75 * Rf * t;
        const h = alto(Math.hypot(du, dl)) + 0.0015;
        pts.push([0, 1, 2].map((e) => base[e] + cp.eje[e] * h + cp.up[e] * du + cp.lado[e] * dl)); nrm.push(cp.eje);
      }
      trazo(B, pts, nrm, 0.01);
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

  /* LA JUNTA DE UNA PIEZA TORNEADA (pieza()) CON LA CABEZA, medida: por
     cada direccion alrededor del eje, donde su perfil entra en el ovalo; la
     franja negra (1,2 cm) nace en esa linea y va hacia fuera. Con
     angulos a ojo quedaba corrida y entre la pieza y la raya asomaba una
     medialuna de cabeza. */
  function juntaPieza(B, perfil, p, eje, ancho) {
    const c = C(), e = uni(eje), u = uni(Math.abs(e[1]) < 0.9 ? cruz(e, [0, 1, 0]) : cruz(e, [1, 0, 0])), v = cruz(e, u);
    const q = (x) => Math.hypot(x[0] / c.rx, (x[1] - c.cy) / c.ry, (x[2] - c.cz) / c.rz);
    const pts = [], nrm = [], W = ancho || 0.012;
    for (let k = 0; k <= 72; k++) {
      const fi = k / 72 * 2 * Math.PI, rad = [0, 1, 2].map((i) => u[i] * Math.cos(fi) + v[i] * Math.sin(fi));
      const en = (r, h) => [0, 1, 2].map((i) => p[i] + e[i] * h + rad[i] * r);
      let P = null;
      for (let m = 1; m < perfil.length && !P; m++) {
        const A = perfil[m - 1], Z = perfil[m], f = (t) => en(lerp(A[0], Z[0], t), lerp(A[1], Z[1], t));
        if (q(f(0)) < 1 || q(f(1)) >= 1) continue;
        let lo = 0, hi = 1;
        for (let it = 0; it < 24; it++) { const t = (lo + hi) / 2; if (q(f(t)) >= 1) lo = t; else hi = t; }
        P = f(lo);
      }
      if (!P) continue;
      /* corrida hacia fuera (lejos del eje) sobre la cabeza, W/2 + 0,5 mm, y
         2,5 mm por encima: con el borde de adentro 2 mm bajo la pieza, de
         atras asomaba a rayitas entre las caras de la almohadilla */
      const n = normalCab(P), t = uni(sub(rad, n.map((x) => x * dot(rad, n))));
      const Q = mas(P, t, W / 2 + 0.0005), s2 = 1 / q(Q), R = [Q[0] * s2, c.cy + (Q[1] - c.cy) * s2, c.cz + (Q[2] - c.cz) * s2], nR = normalCab(R);
      pts.push(mas(R, nR, 0.0025)); nrm.push(nR);
    }
    trazo(B, pts, nrm, W);
  }

  /* EL CASCO ABIERTO DE CARA (helmet1 y helmet3), DE SU DIBUJO: tapa la
     cabeza por arriba y por detras hasta la mandibula (-30 grados), con la
     visera de la frente (29) y el FRENTE DERECHO por delante de la oreja; el
     reborde acampanado y oscuro, con su trazo. Las columnas se aprietan
     donde el borde baja casi vertical (sin eso el frente salia dentado). */
  const azCasco = (() => {
    const L = [];
    for (let a = -180; a < -70; a += 8) L.push(a);
    for (let a = -70; a < -44; a += 1.25) L.push(a);
    for (let a = -44; a < 44; a += 4) L.push(a);
    for (let a = 44; a < 70; a += 1.25) L.push(a);
    for (let a = 70; a < 180; a += 8) L.push(a);
    return L;
  })();
  const loCasco = (az) => { const a = Math.abs(((az + 540) % 360) - 180); return lerp(29, -30, suave(50, 64, a)); };
  function casco(B, o, g, silueta) {
    const M = azCasco.length;
    const d = (az, el) => 0.034 + 0.008 * suave(50, 90, el) + 0.014 * (1 - suave(0, 7, el - loCasco(az)));
    casquete(B, { lo: loCasco, d, azDe: (t) => azCasco[Math.min(M - 1, Math.round(t * M))], M, N: 16, trazo: 0.012,
                  color: (az, el) => (el - loCasco(az) < 5 ? o.hexBorde : o.hex) }, g, silueta);
    return d;
  }
  MOD.helmet1 = function (B, g, silueta) {
    const d = casco(B, { hex: sw(106), hexBorde: sw(78) }, g, silueta);
    // el remache de cada costado: un disco claro con su trazo
    for (const s of [1, -1]) {
      const p = sobre(s * 104, 4, d(s * 104, 4) - 0.001), n = normalCab(p);
      pieza(B, [[0, 0.007, sw(153)], [0.02, 0.006, sw(153)], [0.024, 0.0]], p, n, sw(153), g * 0.45, silueta, 16);
    }
  };
  /* BLAST HELM (helmet3), DE SU DIBUJO: el mismo casco (110) con la pantalla
     de soldar levantada: una CAJA negra (34) grande delante de la frente,
     con sus cuatro tornillos, colgada de dos brazos (78) que bajan a una
     bisagra a cada lado, y la correa (68) con su hebilla hasta el borde. */
  MOD.helmet3 = function (B, g, silueta) {
    const d = casco(B, { hex: sw(110), hexBorde: sw(80) }, g, silueta);
    const Cc = [0, 1.69, 0.475], E0 = [1, 0, 0], E1 = uni([0, 0.8, -0.6]), E2 = cruz(E0, E1), H = [0.17, 0.1, 0.06];
    caja(B, Cc, [E0, E1, E2], H, sw(34), g, silueta);
    if (!silueta) {
      // los tornillos de la cara de delante
      for (const [u, v] of [[-0.125, 0.06], [0.125, 0.06], [-0.125, -0.06], [0.125, -0.06]]) {
        const p = mas(mas(mas(Cc, E0, u), E1, v), E2, H[2] + 0.0008);
        mancha(B, superLente(0.012, 0.016, 2.2, 12).map(([a, b]) => [a, b]), (a, b) => mas(mas(p, E0, a), E1, b), E2, sw(70));
        trazo(B, Array.from({ length: 13 }, (_, k) => { const a = k / 12 * 2 * Math.PI; return mas(mas(p, E0, 0.012 * Math.cos(a)), E1, 0.016 * Math.sin(a)); }),
              Array.from({ length: 13 }, () => E2), 0.004);
      }
    }
    for (const s of [1, -1]) {
      // el brazo: de la esquina de atras de la caja, por fuera del casco, a la bisagra
      const a0 = mas(mas(mas(Cc, E0, s * (H[0] - 0.03)), E1, -H[1] * 0.4), E2, -H[2]);
      const bis = sobre(s * 80, 14, d(s * 80, 14) + 0.006), cen = [a0];
      for (let k = 1; k <= 12; k++) { const t = k / 12, az = lerp(s * 40, s * 80, t), el = lerp(46, 14, Math.pow(t, 0.9)); cen.push(k === 12 ? bis : sobre(az, el, d(az, el) + 0.008)); }
      const an = cen.map((p, k) => {
        const n = normalCab(p), tg = uni(sub(cen[Math.min(12, k + 1)], cen[Math.max(0, k - 1)])), b2 = uni(cruz(n, tg));
        return [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([x, y]) => mas(mas(p, b2, x * 0.02), n, y * 0.005));
      });
      tubo3(B, an, () => sw(78), g, silueta, true);
      // la bisagra: un disco con su tornillo
      const nb = normalCab(bis);
      pieza(B, [[0, 0.012, sw(90)], [0.03, 0.01, sw(90)], [0.034, 0.0]], bis, nb, sw(90), g * 0.45, silueta, 16);
      // la correa: de la bisagra al borde, con su hebilla
      const P = [];
      for (let k = 0; k <= 10; k++) {
        const el = lerp(10, loCasco(s * 84) + 1, k / 10), az = s * lerp(80, 88, k / 10);
        const tasaA = dist(sobre(az - 0.5, el, d(az, el) + 0.004), sobre(az + 0.5, el, d(az, el) + 0.004));
        P.push(filas(0.036, 7, 0.005, 0.005).map((w) => sobre(az + (w - 0.018) / tasaA, el, d(az, el) + 0.004)));
      }
      lamina(B, P, { gr: 0.005, color: (i, j) => (j <= 1 || j >= 6 ? NEGRO : sw(68)) }, g, silueta);
      const ph = sobre(s * 82, 1, d(s * 82, 1) + 0.011), th = uni(sub(sobre(s * 82, -3, 0.05), sobre(s * 82, 5, 0.05)));
      hebilla(B, ph, th, normalCab(ph), 0.03, 0.05, 0.008, sw(150), sw(68), g, silueta);
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
     (Se probo dejar con luz plana la cabeza bajo el sombrero, para apagar
     el brillo de la frente bajo el ala: el muñeco gira y la luz no, asi que
     de espaldas a la luz esa franja salia mas clara que la nuca. Lo que lo
     arregla es que cada sombrero apoye donde lo pone su dibujo, mas abajo.)
     ============================================================= */
  const MARGEN = 6;
  const CUBRE = Acc.CUBRE = Acc.CUBRE || {};
  const desde = (lo) => (az, el) => el > lo(az) - MARGEN;
  const entre = (lo, hi) => (az, el) => el > lo(az) - MARGEN && el < hi(az) + MARGEN;
  CUBRE.hat1 = desde(LO_HAT1);
  CUBRE.hat4 = desde(LO_HAT4);
  CUBRE.hat2 = desde(LO_HAT2);
  CUBRE.hat3 = entre(LO_HAT3, (az) => LO_HAT3(az) + ANCHO_HAT3);
  // los de copa: desde el ala (inclinada hacia atras, un poco mas baja por detras)
  for (const id of ['hat5', 'hat6', 'top', 'fedora', 'hat9']) {
    const elA = elDeY(Y_COPA[id]);
    CUBRE[id] = (az, el) => el > elA - 4 - 4 * Math.max(0, -Math.cos(az * RAD)) - MARGEN;
  }
  CUBRE.helmet1 = CUBRE.helmet3 = desde(loCasco);
  /* los auriculares: las copas, los yugos y el arco. Las copas salen 6 cm
     de la cabeza y de costado tapan su contorno bastante mas alla de donde
     apoyan: con 20 grados, el contorno adelantado de la cabeza les pasaba
     por encima del borde de abajo (una colita negra suelta). Un punto del
     contorno a un angulo a del eje de la copa queda detras de ella si
     0,39 cos a + 0,125 sen a > 0,33: hasta unos 54 grados; con 55 (con 58
     el contorno de la cara salia fino y la punta de la cruz, suelta). El arco,
     a 2 cm de la cabeza en el plano de las copas, tapa una franja de 0,35
     a cada lado de ese plano (n_z = cos 76). */
  CUBRE.headphones = (az, el, n) => {
    const a = AUR.az * RAD, ny = AUR.y / C().ry, L = Math.hypot(1, ny);
    const eje = [Math.sign(n[0]) * Math.sin(a) / L, ny / L, Math.cos(a) / L], zB = Math.cos(a);
    return dot(n, eje) > Math.cos(55 * RAD) || (n[1] > -0.1 && Math.abs(n[2] - zB) < 0.35);
  };

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
       o.tintaEn(i, j) cuanto de la tinta de sus caras lleva ese punto (1)
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
      /* o.tintaN: una PLACA FINA SUELTA (visera, ala) lleva la tinta en su
         plano -el borde estirado g- y apenas por sus caras: hinchada g arriba
         y abajo, vista desde arriba su cara de abajo quedaba 1,6 cm por
         debajo del borde y salia como una raya suelta bajo la visera. */
      const gN = gE * (o.tintaN === undefined ? 1 : o.tintaN) * (o.tintaEn ? o.tintaEn(i, j) : 1);
      let q = mas(p, n, s * (gr / 2 + gN + (silueta && s < 0 && !o.sinHundir ? HUNDE * cerca(p) : 0))), nn = f;
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
