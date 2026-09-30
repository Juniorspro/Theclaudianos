/* =============================================================
   accesorios.js -> Los cosmeticos de la cabeza: gafas, mascaras,
   anteojos. Cada uno es un OBJETO propio, no un dibujo pegado a una
   cabeza: se modela solo, con su volumen, su canto y su tinta, y se le
   pone a quien lo lleve -un enemigo hoy, el jugador el dia que haya
   tienda-.

   LOS NOMBRES SON LOS DEL SWF (MasksAll, 7358, y el catalogo de
   armaduras de ItemGenerator):

     agent1_mask     'Agent Shades'   las gafas rojas del agente
     agent1_mask_b   'Agent Shades'   las negras del agente clasico
     agent2_mask     'ATP Mask'       el casco con antiparras
     agent3_mask     'OBSV Goggles'   la mira monocular de lente amarillo

   DE DONDE SALEN LAS MEDIDAS
   Cada mascara se renderizo con Ruffle sobre su cabeza ('Parts - Head',
   2708: agent 1645, agent2 1688, agent3 1738) y sobre la cabeza lisa
   del civ a la misma escala, para registrarlas. Las cabezas del SWF
   estan dibujadas de TRES CUARTOS: el trazo vertical de la cruz -la
   linea media de la cara- cae al 83% del ancho del ovalo, o sea que la
   cara esta girada unos 41 grados. Un punto del dibujo a una distancia
   normalizada x (-1 a 1) del centro del ovalo esta en el azimut
   asin(x) - 41. Asi se pasa cada detalle a la cabeza 3D.

   COMO SE CONSTRUYEN
   Todo en coordenadas del modelo del personaje, alrededor de la cabeza
   de Chars.CARA. Tres herramientas:

     cascara     una pieza que envuelve la cabeza: la misma forma a dos
                 distancias, cosida por el canto. Con 'paso' grande sale
                 FACETADA -placas planas-, que es el casco del SWF.
     losaCurva   una pieza plana -un visor, una barbillera- extruida y
                 DOBLADA alrededor de la cabeza, como una lamina que la
                 abraza: plana de frente, curva vista desde arriba.
     tubo        piezas cilindricas (lentes, perillas).

   Para la tinta se construye lo mismo hinchado 'g' metros y en negro.
   ============================================================= */
(function (global) {
  'use strict';

  const Acc = {};

  const cab = () => {
    const K = global.Chars.CARA;
    return { rx: K.rx, ry: K.ry, rz: K.rz, cy: K.y, cz: global.Chars.CABEZA_Z,
             cruzY: global.Chars.ALTO_CRUZ, cruzX: 0.014 };
  };
  const RAD = Math.PI / 180;

  /* La linea media de la cara -el trazo vertical de la cruz-, en azimut,
     y la altura del trazo horizontal, en elevacion. Todo se centra ahi,
     no en el centro del ovalo: la cruz va corrida 1,4 cm (ver trazoEnCara
     en chars.js) y unas gafas centradas en el ovalo quedaban torcidas. */
  function centroCruz() {
    const c = cab();
    const el = Math.asin((c.cruzY - c.cy) / c.ry) / RAD;
    const az = Math.asin(c.cruzX / (c.rx * Math.cos(el * RAD))) / RAD;
    return [az, el];
  }

  /* Un punto del ovalo escalado por (kx, ky, kz) mas g metros, en (az, el).
     'e' < 1 lo hace mas cuadrado (superelipsoide): los cascos. */
  function punto(az, el, k, g, e) {
    if (typeof k === 'function') k = k(el);      // un grueso que cambia con la altura
    const c = cab(), a = az * RAD, t = el * RAD;
    const pw = (v) => Math.sign(v) * Math.pow(Math.abs(v), e || 1);
    const ce = Math.cos(t);
    const nx = pw(ce) * pw(Math.sin(a)), ny = pw(Math.sin(t)), nz = pw(ce) * pw(Math.cos(a));
    return [(c.rx * k[0] + g) * nx, c.cy + (c.ry * k[1] + g) * ny, c.cz + (c.rz * k[2] + g) * nz];
  }

  function densificar(poly, paso) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / paso));
      for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return out;
  }
  const areaDe = (P) => {
    let a = 0;
    for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return a / 2;
  };
  // recorta un poligono antihorario por el semiplano a*x + b*y <= d
  function cortar(pol, a, b, d) {
    const out = [];
    for (let i = 0; i < pol.length; i++) {
      const p = pol[i], q = pol[(i + 1) % pol.length];
      const fp = a * p[0] + b * p[1] - d, fq = a * q[0] + b * q[1] - d;
      if (fp <= 0) out.push(p);
      if ((fp < 0) !== (fq < 0) && fp !== fq) {
        const t = fp / (fp - fq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    return out;
  }
  /* Parte un poligono en trozos de una rejilla 'paso' x 'paso', lo
     bastante chicos para seguir la curva: ninguna cara cruza la cabeza
     por dentro. (Triangulando a pelo salian triangulos de 200 grados
     cuyos lados eran cuerdas que atravesaban la cabeza.) */
  function trozos(poly, paso) {
    const P = areaDe(poly) > 0 ? poly : poly.slice().reverse();
    let xa = Infinity, xb = -Infinity, ya = Infinity, yb = -Infinity;
    for (const q of P) { xa = Math.min(xa, q[0]); xb = Math.max(xb, q[0]); ya = Math.min(ya, q[1]); yb = Math.max(yb, q[1]); }
    const out = [];
    for (let x0 = xa; x0 < xb - 1e-9; x0 += paso) {
      for (let y0 = ya; y0 < yb - 1e-9; y0 += paso) {
        let pz = cortar(P, 1, 0, Math.min(xb, x0 + paso));
        pz = cortar(pz, -1, 0, -x0);
        pz = cortar(pz, 0, 1, Math.min(yb, y0 + paso));
        pz = cortar(pz, 0, -1, -y0);
        if (pz.length >= 3 && Math.abs(areaDe(pz)) > 1e-9) out.push(pz);
      }
    }
    return out;
  }
  // el poligono agrandado 'd' por la bisectriz (marcos, tinta)
  function hinchar(poly, d) {
    const n = poly.length, out = [], s = areaDe(poly) > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const a = poly[(i - 1 + n) % n], b = poly[i], c = poly[(i + 1) % n];
      let x1 = b[0] - a[0], y1 = b[1] - a[1], x2 = c[0] - b[0], y2 = c[1] - b[1];
      const l1 = Math.hypot(x1, y1) || 1, l2 = Math.hypot(x2, y2) || 1;
      x1 /= l1; y1 /= l1; x2 /= l2; y2 /= l2;
      let bx = s * (y1 + y2), by = -s * (x1 + x2);
      const lb = Math.hypot(bx, by) || 1; bx /= lb; by /= lb;
      const k = Math.min(2.5, 1 / Math.max(0.4, bx * s * y2 - by * s * x2));
      out.push([b[0] + bx * d * k, b[1] + by * d * k]);
    }
    return out;
  }

  /* Emite un poligono 3D (casi plano, convexo) con normal plana,
     orientado para que mire hacia 'fuera'. */
  function cara(B, pts, c, fuera, plano) {
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]);
    }
    const L = Math.hypot(nx, ny, nz);
    if (L < 1e-12) return;
    nx /= L; ny /= L; nz /= L;
    let lista = pts;
    if (nx * fuera[0] + ny * fuera[1] + nz * fuera[2] < 0) { lista = pts.slice().reverse(); nx = -nx; ny = -ny; nz = -nz; }
    const ids = lista.map((p) => B._vert(p[0], p[1], p[2], nx, ny, nz, c[0], c[1], c[2], plano));
    for (let t = 1; t < ids.length - 1; t++) B.idx.push(ids[0], ids[t], ids[t + 1]);
  }

  /* CASCARA: 'poly' en (az, el) grados, entre la superficie escalada
     kIn y kOut ([kx, ky, kz] cada una). o.paso: tamaño de la faceta
     (grados); o.cuadrado: exponente de superelipsoide (<1 mas cuadrado). */
  function cascara(B, poly, kIn, kOut, hex, g, o) {
    o = o || {};
    const paso = o.paso || 4, e = o.cuadrado || 1;
    const c = B._rgb(hex, 1), plano = o.luz === false ? U.LUZ_PLANA : undefined;
    const cy = cab().cy, cz = cab().cz;
    for (const pz of trozos(poly, paso)) {
      const fuera = pz.map((q) => punto(q[0], q[1], kOut, g, e));
      // la cara de dentro de la tinta va HACIA DENTRO: hinchada hacia
      // fuera, en piezas finas quedaba delante del cristal y lo tapaba
      const dentro = pz.map((q) => punto(q[0], q[1], kIn, -g, e));
      const m = fuera.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / fuera.length);
      const rad = [m[0], m[1] - cy, m[2] - cz];
      cara(B, fuera, c, rad, plano);
      cara(B, dentro, c, [-rad[0], -rad[1], -rad[2]], plano);
    }
    // el canto
    const P = densificar(poly, Math.min(paso, 6)), s = areaDe(P) > 0 ? 1 : -1;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const q = [punto(a[0], a[1], kIn, -g, e), punto(b[0], b[1], kIn, -g, e),
                 punto(b[0], b[1], kOut, g, e), punto(a[0], a[1], kOut, g, e)];
      const mm = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const ex = s * (b[1] - a[1]), ey = -s * (b[0] - a[0]), L = Math.hypot(ex, ey) || 1;
      const p0 = punto(mm[0], mm[1], kOut, g, e), p1 = punto(mm[0] + ex / L, mm[1] + ey / L, kOut, g, e);
      cara(B, q, c, [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], plano);
    }
  }

  /* LOSA CURVA: un contorno plano (x, y) en metros -x a lo ancho, y
     hacia arriba, centrado en (x0, y0) respecto al centro de la cabeza-
     extruido entre las distancias d0 y d1 del eje vertical de la cabeza
     y DOBLADO alrededor de ese eje con radio R: x se vuelve arco. De
     frente se ve el contorno tal cual; desde arriba, una lamina que
     abraza la cabeza. */
  function losaCurva(B, poly, o, hex, g) {
    const c = B._rgb(hex, 1), plano = o.luz === false ? U.LUZ_PLANA : undefined;
    const base = g > 0 ? hinchar(poly, g) : poly;
    const R = o.R, cz = cab().cz, cy = cab().cy;
    const map = (x, y, d) => {
      const th = (x + (o.x0 || 0)) / R;
      return [d * Math.sin(th), cy + (o.y0 || 0) + y, cz + d * Math.cos(th)];
    };
    const d0 = o.d0 - g, d1 = o.d1 + g;
    for (const pz of trozos(base, 0.03)) {
      const fr = pz.map((q) => map(q[0], q[1], d1));
      const at = pz.map((q) => map(q[0], q[1], d0));
      const mx = fr.reduce((a, p) => a + p[0], 0) / fr.length, mz = fr.reduce((a, p) => a + p[2], 0) / fr.length - cz;
      cara(B, fr, c, [mx, 0, mz], plano);
      cara(B, at, c, [-mx, 0, -mz], plano);
    }
    const P = densificar(base, 0.02), s = areaDe(P) > 0 ? 1 : -1;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const q = [map(a[0], a[1], d0), map(b[0], b[1], d0), map(b[0], b[1], d1), map(a[0], a[1], d1)];
      const ex = s * (b[1] - a[1]), ey = -s * (b[0] - a[0]), L = Math.hypot(ex, ey) || 1;
      const mm = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const p0 = map(mm[0], mm[1], d1), p1 = map(mm[0] + ex / L * 0.01, mm[1] + ey / L * 0.01, d1);
      cara(B, q, c, [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], plano);
    }
  }

  /* Un tubo recto con el eje horizontal en el azimut 'az' (grados), de
     la distancia d0 a d1 del eje de la cabeza, a la altura y (respecto
     al centro de la cabeza). */
  function tubo(B, az, y, d0, d1, r, hex, g, lados) {
    const a = az * RAD, c = cab();
    B.push();
    B.translate(Math.sin(a) * d0, c.cy + y, c.cz + Math.cos(a) * d0);
    B.rotateY(a); B.rotateX(Math.PI / 2);
    B.addTubo([[-g, r + g, r + g, 0], [d1 - d0 + g, r + g, r + g, 0]], hex, { lados: lados || 16, redondez: 2 });
    B.pop();
  }

  const rect = (a0, a1, e0, e1) => [[a0, e0], [a1, e0], [a1, e1], [a0, e1]];
  const espejoAz = (poly, eje) => poly.map((q) => [2 * eje - q[0], q[1]]).reverse();

  const MODELOS = {};

  /* AGENT SHADES (agent1_mask / agent1_mask_b): en prendas3d.js, con los
     demas anteojos (medidas de su hoja de tres cuartos). */

  // el poligono P recortado al convexo C (los dos en az, el)
  function recortar(P, C) {
    const s = areaDe(C) > 0 ? 1 : -1;
    let out = P;
    for (let i = 0; i < C.length && out.length; i++) {
      const a = C[i], b = C[(i + 1) % C.length];
      // lado de fuera: a la derecha del borde (antihorario)
      const nx = s * (b[1] - a[1]), ny = -s * (b[0] - a[0]);
      out = cortar(out, nx, ny, nx * a[0] + ny * a[1]);
    }
    return out;
  }
  // una cara sobre la cabeza con color por vertice (el degradé del cristal)
  function cristalDegrade(B, poly, colorDe, k) {
    const cy = cab().cy, cz = cab().cz;
    for (const pz of trozos(poly, 1.2)) {
      const P = pz.map((q) => punto(q[0], q[1], [k, k, k], 0, 1));
      const m = P.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / P.length);
      const n = [m[0], m[1] - cy, m[2] - cz], L = Math.hypot(n[0], n[1], n[2]) || 1;
      let ids = pz.map((q, i) => { const c = colorDe(q[0], q[1]); return B._vert(P[i][0], P[i][1], P[i][2], n[0] / L, n[1] / L, n[2] / L, c[0], c[1], c[2], U.LUZ_PLANA); });
      // orientado hacia fuera
      const u = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], w = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
      const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) ids = ids.reverse();
      for (let t = 1; t < ids.length - 1; t++) B.idx.push(ids[0], ids[t], ids[t + 1]);
    }
  }

  /* =============================================================
     HERRAMIENTAS DE PIEZAS RIGIDAS (placas, cajas, bandas)
     ============================================================= */

  /* LOFT: secciones horizontales [{y, poly: [[x, z], ...]}] con el mismo
     numero de puntos, cosidas en caras planas y tapadas arriba y abajo.
     Sale FACETADO a proposito: son las placas del SWF. */
  function loft(B, secs, hex, g, plano) {
    const c = B._rgb(hex, 1);
    const S = secs.map((sc, i) => ({
      y: sc.y + (i === 0 ? -g : i === secs.length - 1 ? g : 0),
      p: g > 0 ? hincharXZ(sc.poly, g) : sc.poly
    }));
    const n = S[0].p.length;
    for (let k = 0; k < S.length - 1; k++) {
      const A = S[k], Bs = S[k + 1];
      const cx = A.p.reduce((a, q) => a + q[0], 0) / n, cz = A.p.reduce((a, q) => a + q[1], 0) / n;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const q = [[A.p[i][0], A.y, A.p[i][1]], [A.p[j][0], A.y, A.p[j][1]],
                   [Bs.p[j][0], Bs.y, Bs.p[j][1]], [Bs.p[i][0], Bs.y, Bs.p[i][1]]];
        const mx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4 - cx, mz = (q[0][2] + q[1][2] + q[2][2] + q[3][2]) / 4 - cz;
        cara(B, [q[0], q[1], q[2]], c, [mx, 0, mz], plano);
        cara(B, [q[0], q[2], q[3]], c, [mx, 0, mz], plano);
      }
    }
    for (const [sc, dir] of [[S[0], -1], [S[S.length - 1], 1]]) {
      const v2 = sc.p.map((q) => new THREE.Vector2(q[0], q[1]));
      for (const t of THREE.ShapeUtils.triangulateShape(v2, [])) {
        cara(B, t.map((ix) => [sc.p[ix][0], sc.y, sc.p[ix][1]]), c, [0, dir, 0], plano);
      }
    }
  }
  function hincharXZ(poly, d) { return hinchar(poly, d); }

  /* PRISMA: un contorno 2D (u, v) extruido entre a0 y a1 por el eje que
     falta. eje 'z': (x, y) = (u, v); eje 'x': (z, y) = (u, v). */
  function prisma(B, poly, eje, a0, a1, hex, g, plano) {
    const c = B._rgb(hex, 1);
    const P = g > 0 ? hinchar(poly, g) : poly;
    const A0 = a0 - g, A1 = a1 + g;
    const m = eje === 'z' ? (u, v, a) => [u, v, a] : (u, v, a) => [a, v, u];
    const fr = eje === 'z' ? [0, 0, 1] : [1, 0, 0];
    const v2 = P.map((q) => new THREE.Vector2(q[0], q[1]));
    for (const t of THREE.ShapeUtils.triangulateShape(v2, [])) {
      cara(B, t.map((ix) => m(P[ix][0], P[ix][1], A1)), c, fr, plano);
      cara(B, t.map((ix) => m(P[ix][0], P[ix][1], A0)), c, fr.map((v) => -v), plano);
    }
    const s = areaDe(P) > 0 ? 1 : -1;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const nu = s * (b[1] - a[1]), nv = -s * (b[0] - a[0]);
      const q = [m(a[0], a[1], A0), m(b[0], b[1], A0), m(b[0], b[1], A1), m(a[0], a[1], A1)];
      const f = eje === 'z' ? [nu, nv, 0] : [0, nv, nu];
      cara(B, [q[0], q[1], q[2]], c, f, plano);
      cara(B, [q[0], q[2], q[3]], c, f, plano);
    }
  }

  /* BANDA: una pieza de seccion rectangular que recorre un camino
     horizontal. 'camino' devuelve para t de 0 a 1 {x, z, nx, nz} (punto
     y normal hacia fuera); 'alto(t)' su medio alto; dentro/fuera, la
     distancia a lo largo de la normal; y, la altura del centro. */
  function banda(B, camino, N, y, alto, dentro, fuera, hex, g) {
    const anillos = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = camino(t), h = alto(t) + g;
      const q = (d, dy) => [p.x + p.nx * d, y + dy, p.z + p.nz * d];
      anillos.push([q(dentro - g, -h), q(fuera + g, -h), q(fuera + g, h), q(dentro - g, h)]);
    }
    barrido(B, anillos, hex);
  }
  /* BARRIDO: anillos 3D (secciones convexas, mismo numero de puntos)
     cosidos en caras planas, con tapas. Cada cara se orienta sola hacia
     fuera de su seccion: no depende del sentido del camino. */
  function barrido(B, anillos, hex, plano) {
    const c = B._rgb(hex, 1), n = anillos[0].length;
    const cen = (R) => R.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n, a[2] + p[2] / n], [0, 0, 0]);
    const C = anillos.map(cen);
    for (let r = 0; r < anillos.length - 1; r++) {
      const A = anillos[r], Bn = anillos[r + 1], m0 = [(C[r][0] + C[r + 1][0]) / 2, (C[r][1] + C[r + 1][1]) / 2, (C[r][2] + C[r + 1][2]) / 2];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const q = [A[i], A[j], Bn[j], Bn[i]];
        const f = [0, 1, 2].map((e) => (q[0][e] + q[1][e] + q[2][e] + q[3][e]) / 4 - m0[e]);
        cara(B, [q[0], q[1], q[2]], c, f, plano);
        cara(B, [q[0], q[2], q[3]], c, f, plano);
      }
    }
    const L = anillos.length - 1;
    cara(B, anillos[0], c, [0, 1, 2].map((e) => C[0][e] - C[1][e]), plano);
    cara(B, anillos[L], c, [0, 1, 2].map((e) => C[L][e] - C[L - 1][e]), plano);
  }
  /* BARRIDO PARA LA TINTA: como barrido, pero con los vertices de cada
     anillo compartidos y la normal que sale del centro de su anillo. El
     grosor en pantalla empuja por la normal: con caras planas cada arista
     abria una grieta finisima y el contorno salia con hilos claros. */
  function barridoTinta(B, anillos) {
    const c = B._rgb(0x000000, 1), n = anillos[0].length;
    const cen = (R) => R.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n, a[2] + p[2] / n], [0, 0, 0]);
    const C = anillos.map(cen);
    const ids = anillos.map((R, r) => R.map((p) => {
      let nx = p[0] - C[r][0], ny = p[1] - C[r][1], nz = p[2] - C[r][2];
      const L = Math.hypot(nx, ny, nz) || 1;
      return B._vert(p[0], p[1], p[2], nx / L, ny / L, nz / L, c[0], c[1], c[2]);
    }));
    const tri = (i0, i1, i2, P0, P1, P2, f) => {
      const ux = P1[0] - P0[0], uy = P1[1] - P0[1], uz = P1[2] - P0[2];
      const vx = P2[0] - P0[0], vy = P2[1] - P0[1], vz = P2[2] - P0[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * f[0] + ny * f[1] + nz * f[2] >= 0) B.idx.push(i0, i1, i2); else B.idx.push(i0, i2, i1);
    };
    for (let r = 0; r < anillos.length - 1; r++) {
      const A = anillos[r], Bn = anillos[r + 1];
      const m0 = [0, 1, 2].map((e) => (C[r][e] + C[r + 1][e]) / 2);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, q = [A[i], A[j], Bn[j], Bn[i]];
        const k = [ids[r][i], ids[r][j], ids[r + 1][j], ids[r + 1][i]];
        const f = [0, 1, 2].map((e) => (q[0][e] + q[1][e] + q[2][e] + q[3][e]) / 4 - m0[e]);
        tri(k[0], k[1], k[2], q[0], q[1], q[2], f);
        tri(k[0], k[2], k[3], q[0], q[2], q[3], f);
      }
    }
    const L = anillos.length - 1;
    for (const [r, o] of [[0, 1], [L, L - 1]]) {
      const f = [0, 1, 2].map((e) => C[r][e] - C[o][e]);
      for (let t = 1; t < n - 1; t++) tri(ids[r][0], ids[r][t], ids[r][t + 1], anillos[r][0], anillos[r][t], anillos[r][t + 1], f);
    }
  }
  // un camino sobre el ovalo de la cabeza, de azimut a0 a a1, a 'off' de su superficie
  function caminoOvalo(a0, a1, off, y) {
    const C = cab();
    const k = Math.sqrt(Math.max(0.05, 1 - Math.pow((y - C.cy) / C.ry, 2)));
    const rx = C.rx * k + off, rz = C.rz * k + off;
    return (t) => {
      const a = (a0 + (a1 - a0) * t) * RAD;
      let nx = Math.sin(a) / rx, nz = Math.cos(a) / rz;
      const L = Math.hypot(nx, nz); nx /= L; nz /= L;
      return { x: rx * Math.sin(a), z: C.cz + rz * Math.cos(a), nx: nx, nz: nz };
    };
  }
  // un camino por una polilinea (x, z), con la normal hacia fuera (a la izquierda del avance)
  function caminoPoli(P) {
    const L = [0];
    for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = L[L.length - 1];
    return (t) => {
      const s = t * tot;
      let i = 0;
      while (i < P.length - 2 && L[i + 1] < s) i++;
      const u = (s - L[i]) / (L[i + 1] - L[i] || 1);
      const a = P[i], b = P[i + 1];
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      return { x: a[0] + dx * u, z: a[1] + dz * u, nx: dz / l, nz: -dx / l };
    };
  }

  function contornoHueso(W, H, cintura) {
    const P = [], n = 40;
    const h = (t) => H * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 7)), 1 / 7) *
                     (1 - cintura * Math.exp(-Math.pow(t / 0.28, 2)));
    for (let i = 0; i <= n; i++) { const t = -1 + 2 * i / n; P.push([W * t, -h(t)]); }
    for (let i = n; i >= 0; i--) { const t = -1 + 2 * i / n; P.push([W * t, h(t)]); }
    return P;
  }

  /* =============================================================
     ATP MASK (agent2_mask): DE SU HOJA DE VUELTAS

     Esta mascara esta hecha de placas, trazos, un visor con forma de
     cerradura y rieles; modelarla pieza por pieza quedaba siempre en una
     caja. Asi que sale de sus propios dibujos (tools/accesorios/atp.py
     sobre la hoja de vueltas), como un casco de verdad:

       · LA TROMPA, delante: del ancho de la placa gris del dibujo de
         frente, curvada hacia atras en las orillas. Lleva el dibujo de
         frente tal cual, con el visor, que da la vuelta con ella: de
         costado se ve el lobulo donde esta, un solo visor.
       · EL CUERPO, detras: mas ancho, el del marco oscuro, que asoma a los
         lados de la trompa. Su frente lleva el dibujo de frente (el marco,
         los rieles de los lados) y sus costados, el de su costado de la
         hoja: las placas, el borde escalonado y los rieles.
       · Cada cara lleva UN solo dibujo. Nada se mezcla: de frente se ve
         exacto y de perfil, el costado de la hoja.
       · LA SOLAPA de la nuca, aparte: una placa en C que rodea el cogote
         por detras, como en la ultima vista de la hoja.

     La nuca queda al aire, como en el SWF.
     ============================================================= */
  const ATP_ZF = 0.519;                 // el frente de la mascara (la cara esta en 0,479)
  const ATP_NF = 24;                    // tramos del frente
  /* LA SECCION, VISTA DESDE ARRIBA. Las vistas de la hoja cuadran asi:
     de frente, el visor acaba donde empieza el marco oscuro de los lados;
     de perfil, el lobulo del visor se ve entero. O sea que la mascara
     tiene una TROMPA delante, del ancho de la placa gris (q[5]), que se
     curva hacia atras en las orillas y lleva el visor dando la vuelta; y
     detras un CUERPO mas ancho, el del marco oscuro, que asoma a los lados.
       · la trompa: una D. Casi plana en el medio y cada vez mas curva en
         las orillas (u^2,66, con u de -1 a 1): el lobulo del visor, a 0,16
         del centro, queda 0,05 por detras del frente y el fin del marco, a
         0,29, 0,25 por detras; asi cae donde lo pone la vista de perfil.
       · el cuerpo: su frente, desde el fin de la trompa hasta la silueta,
         y sus costados rectos hasta el fondo, con las esquinas de detras
         achaflanadas.
     Arriba y abajo, donde no hay placa, la trompa ocupa todo el ancho.
     Nunca por dentro de la cabeza: donde la curva se metiera en el ovalo,
     se aparta 2 cm de el.
     Puntos: 0..NF la trompa (de +x a -x); NF, NF+1 el frente del cuerpo y
     su costado por -x; el fondo; NF+5, NF+6 el costado y el frente del
     cuerpo por +x, de vuelta al 0. */
  function seccionesATP(g) {
    const T = global.ACCESORIOS_TEX.agent2_mask, C = cab();
    const out = [], NF = ATP_NF;
    for (let r = 0; r < T.perfil.length; r++) {
      const q = T.perfil[r];
      const y = q[0] + (r === 0 ? g : r === T.perfil.length - 1 ? -g : 0);
      const xc = (q[1] + q[2]) / 2, ancho = (q[2] - q[1]) / 2;
      const zf = ATP_ZF - q[3] + g, zb = ATP_ZF - q[4] - g;
      const fondo = zf - zb;
      const kh = 1 - Math.pow((y - C.cy) / C.ry, 2);
      const zCabeza = (x) => {
        const v = kh - Math.pow(x / C.rx, 2);
        return v > 0 ? C.cz + C.rz * Math.sqrt(v) + 0.02 + g : -Infinity;
      };
      /* el cuerpo acaba antes del contorno del dibujo (el contorno lo pone
         la tinta del modelo): si no, su arranque quedaba como un trazo mas
         en la esquina del cuerpo */
      const hw = ancho * (q[5] < ancho - 1e-4 ? 0.94 : 0.965) + g;
      /* la trompa acaba justo en el borde de la placa: el trazo que la
         separa del marco queda una sola vez, en el pliegue con el cuerpo
         (antes caia a la vez en su orilla y en el frente del cuerpo) */
      const hs = (q[5] >= ancho - 1e-4 ? ancho * 0.965 : Math.min(q[5], ancho * 0.965)) + g;
      const hc = Math.max(hw, hs + 0.002);          // el cuerpo (nunca mas angosto que la trompa)
      const P = [];
      for (let i = 0; i <= NF; i++) {
        const u = 1 - 2 * i / NF;                       // +1 .. -1
        const x = xc + hs * u;
        const drop = Math.min(fondo * 0.9, 0.27 * Math.pow(Math.abs(u), 2.66));
        P.push([x, Math.max(zf - drop, zCabeza(x))]);
      }
      const zc = Math.min(P[0][1], P[NF][1]);        // donde acaba la trompa
      const ch = Math.min(0.03, hc * 0.2);
      P.push([xc - hc, zc], [xc - hc, zb + ch], [xc - hc + ch, zb],
             [xc + hc - ch, zb], [xc + hc, zb + ch], [xc + hc, zc]);
      const fila = P.map((p) => [p[0], y, Math.max(p[1], zb)]);
      // para el dibujo de los costados: donde acaba la trompa y donde el marco en la hoja
      fila.meta = { zf: ATP_ZF - q[3], zc, zb: ATP_ZF - q[4], trompa: trompaATP(r) };
      out.push(fila);
    }
    /* El reajuste del dibujo de costado cambia con la fila (donde acaba la
       trompa, el fondo): fila a fila, a saltos, corria cada renglon del
       dibujo distinto y las lineas del marco salian en zigzag, como
       rayadas. Suavizado entre filas vecinas (gaussiana de +-4), el
       dibujo se estira de corrido. */
    const crudo = out.map((f) => Object.assign({}, f.meta));
    for (let r = 0; r < out.length; r++) {
      const m = {};
      for (const k of ['zf', 'zc', 'zb', 'trompa']) {
        let s2 = 0, w2 = 0;
        for (let d = -4; d <= 4; d++) {
          const j = r + d;
          if (j < 0 || j >= out.length) continue;
          const w = Math.exp(-d * d / 8);
          s2 += crudo[j][k] * w; w2 += w;
        }
        m[k] = s2 / w2;
      }
      out[r].meta = m;
    }
    return out;
  }
  /* Lo que la hoja de costado pone de placa delante del marco, fila a
     fila (q[6], medido en los dos costados), con una mediana de tres filas
     para que un trazo suelto no la mueva. */
  function trompaATP(r) {
    const P = global.ACCESORIOS_TEX.agent2_mask.perfil;
    const v = [P[Math.max(0, r - 1)][6], P[r][6], P[Math.min(P.length - 1, r + 1)][6]].sort((a, b) => a - b);
    return v[1];
  }
  /* Que dibujo lleva cada cara de la seccion (la cara i va del punto i al
     i+1). La trompa entera y el frente del cuerpo, la vista de frente: el
     visor sale de un solo dibujo y da la vuelta con la curva de la trompa,
     asi que de costado se ve donde esta, sin otro visor al lado. Los
     costados del cuerpo, la vista de su costado (sus placas, el marco
     escalonado y los rieles). El fondo, liso. Cada cara lleva UN dibujo:
     nada se mezcla. */
  function caraATP(i, n) {
    const NF = ATP_NF;
    if (i < NF || i === NF || i === NF + 6) return 'frente';
    if (i === NF + 1 || i === NF + 5) return n[0] > 0 ? 'izq' : 'der';
    return null;
  }
  // de un punto del modelo a (u, v) en el atlas, por la vista 'vista'
  function uvATP(p, vista, meta) {
    const T = global.ACCESORIOS_TEX.agent2_mask, V = T.vistas[vista];
    const fila = (T.tope - p[1]) / T.alto * V.h;
    let col;
    /* EL COSTADO DEL CUERPO, AJUSTADO AL PLIEGUE. La hoja de costado pone
       el borde entre la placa y el marco mas atras de donde puede acabar
       la trompa (ahi ya esta la cabeza). Para que ese borde sea uno solo
       -el del pliegue, que ya pinta el dibujo de frente- el costado se
       reparte: empieza justo detras de ese trazo, en el marco, y lo de
       detras llega igual hasta el fondo. */
    let fondo = ATP_ZF - p[2];
    if (meta && vista !== 'frente') {
      const d = meta.zf - p[2], dc = meta.zf - meta.zc, dt = meta.zf - meta.zb;
      // el costado arranca pasado ese trazo (1,4 cm): ya en el marco oscuro,
      // que sigue sin corte al del frente del cuerpo
      const t = Math.min(meta.trompa + 0.03, dt * 0.9);
      const d2 = dt - dc > 1e-3 ? t + (d - dc) * (dt - t) / (dt - dc) : d;
      fondo = ATP_ZF - meta.zf + d2;
    }
    /* +x sale a la derecha de la pantalla de frente. La vista 'der' de la
       hoja (mira a la derecha, con el lobulo del visor) es el costado -x;
       la 'izq', el +x. */
    if (vista === 'frente') col = T.cx + p[0] / V.esc;
    else if (vista === 'izq') col = T.fi0 + fondo / V.esc;
    else col = T.fd0 - fondo / V.esc;
    col = U.clamp(col, 0.5, V.w - 0.5);
    return [(V.ax + col * T.ESC) / T.W, 1 - (U.clamp(fila, 0.5, V.h - 0.5) * T.ESC) / T.H];
  }
  /* LA CONCHA CON DIBUJO. Las caras del frente, con la vista de frente;
     las de los costados, con la de su costado; detras, arriba y abajo, el
     gris liso de la placa con la luz de la sala. El dibujo va sin luz (los
     tonos ya vienen dibujados). Sin dibujo (tex falso), la tinta. */
  function conchaATP(B, g, tex) {
    const S = seccionesATP(g), M = S[0].length, NF = ATP_NF;
    const c = B._rgb(0x000000, 1);
    // la normal horizontal de cada cara (plana: la arista queda viva)
    // (la seccion no es convexa: el sentido de giro dice cual es el lado de fuera)
    const giro = S.map((R) => Math.sign(R.reduce((s2, p, i) => {
      const q = R[(i + 1) % M]; return s2 + p[0] * q[2] - q[0] * p[2];
    }, 0)) || 1);
    const nCara = (R, i) => {
      const a = R[i], b = R[(i + 1) % M], sg = -giro[S.indexOf(R)];
      let nx = -(b[2] - a[2]) * sg, nz = (b[0] - a[0]) * sg;
      const L = Math.hypot(nx, nz) || 1;
      return [nx / L, 0, nz / L];
    };
    const vert = (p, n, vista, hexLiso, meta) => {
      if (!vista) {
        const c2 = B._rgb(hexLiso, 1);
        const k = B._vert(p[0], p[1], p[2], n[0], n[1], n[2], c2[0], c2[1], c2[2]);
        B.uv.push(0, 0); B.solido.push(1);
        return k;
      }
      const k = B._vert(p[0], p[1], p[2], n[0], n[1], n[2], 1, 1, 1, U.LUZ_PLANA);
      const uv = uvATP(p, vista, meta);
      B.uv.push(uv[0], uv[1]); B.solido.push(0);
      return k;
    };
    for (let r = 0; r < S.length - 1; r++) {
      for (let i = 0; i < M; i++) {
        const j = (i + 1) % M;
        const q = [[r, i], [r, j], [r + 1, j], [r + 1, i]];
        const P = q.map(([a, b]) => S[a][b]);
        const fu = nCara(S[r], i);
        if (!tex) { cara(B, [P[0], P[1], P[2]], c, fu); cara(B, [P[0], P[2], P[3]], c, fu); continue; }
        const vista = caraATP(i, fu);
        /* ABIERTA POR DETRAS: el fondo de la concha quedaba por dentro de la
           cabeza y la nuca lo atravesaba (de espaldas se veia la cabeza
           recortada dentro de la mascara). Como un casco: sin fondo; por
           dentro se ve oscura. */
        if (vista === null) continue;
        // en el frente, la normal de cada punto es la suave (la placa es curva)
        const ids = q.map(([a, b]) => {
          const n = i < NF && b > 0 && b < NF
            ? nCara(S[a], b - 1).map((v, k) => v + nCara(S[a], b)[k]) : fu;
          const L = Math.hypot(n[0], n[2]) || 1;
          return vert(S[a][b], [n[0] / L, 0, n[2] / L], vista, 0x585858, S[a].meta);
        });
        const ax = P[1][0] - P[0][0], ay = P[1][1] - P[0][1], az = P[1][2] - P[0][2];
        const bx = P[3][0] - P[0][0], by = P[3][1] - P[0][1], bz = P[3][2] - P[0][2];
        const al = (ay * bz - az * by) * fu[0] + (ax * by - ay * bx) * fu[2] >= 0;
        if (al) B.idx.push(ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]);
        else B.idx.push(ids[0], ids[2], ids[1], ids[0], ids[3], ids[2]);
      }
    }
    for (const [R, dir] of [[S[0], 1], [S[S.length - 1], -1]]) {
      if (!tex) { cara(B, R, c, [0, dir, 0]); continue; }
      const v2 = R.map((p) => new THREE.Vector2(p[0], p[2]));
      const ids = R.map((p) => vert(p, [0, dir, 0], null, dir > 0 ? 0x404040 : 0xcccccc));
      for (const t of THREE.ShapeUtils.triangulateShape(v2, [])) {
        const a = R[t[0]], b = R[t[1]], d = R[t[2]];
        const ny = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]);
        if (ny * dir >= 0) B.idx.push(ids[t[0]], ids[t[1]], ids[t[2]]);
        else B.idx.push(ids[t[0]], ids[t[2]], ids[t[1]]);
      }
    }
  }
  /* LA TINTA DE LA CONCHA, CON VERTICES COMPARTIDOS Y NORMALES SUAVES:
     el grosor en pantalla empuja cada vertice por su normal, y con caras
     planas cada arista abria una grieta finisima (puntitos claros en el
     borde). Cada punto de cada seccion es un vertice, con la normal que
     sale del centro de su seccion (y, en la primera y la ultima, tambien
     hacia arriba o abajo). */
  function tintaATP(B, g) {
    const S = seccionesATP(g), M = S[0].length, c = B._rgb(0x000000, 1), n = S.length;
    const ids = S.map((R, r) => {
      const cx = R.reduce((a, p) => a + p[0], 0) / M, cz = R.reduce((a, p) => a + p[2], 0) / M;
      const ey = r === 0 ? 1 : r === n - 1 ? -1 : 0;
      return R.map((p) => {
        let nx = p[0] - cx, nz = p[2] - cz;
        const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
        const L2 = Math.hypot(nx, ey, nz);
        return B._vert(p[0], p[1], p[2], nx / L2, ey / L2, nz / L2, c[0], c[1], c[2]);
      });
    });
    const tri = (i0, i1, i2, P0, P1, P2, f) => {
      const ux = P1[0] - P0[0], uy = P1[1] - P0[1], uz = P1[2] - P0[2];
      const vx = P2[0] - P0[0], vy = P2[1] - P0[1], vz = P2[2] - P0[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * f[0] + ny * f[1] + nz * f[2] >= 0) B.idx.push(i0, i1, i2); else B.idx.push(i0, i2, i1);
    };
    for (let r = 0; r < n - 1; r++) {
      const cx = S[r].reduce((a, p) => a + p[0], 0) / M, cz = S[r].reduce((a, p) => a + p[2], 0) / M;
      for (let i = 0; i < M; i++) {
        const j = (i + 1) % M, q = [S[r][i], S[r][j], S[r + 1][j], S[r + 1][i]];
        const k = [ids[r][i], ids[r][j], ids[r + 1][j], ids[r + 1][i]];
        const f = [(q[0][0] + q[1][0]) / 2 - cx, 0, (q[0][2] + q[1][2]) / 2 - cz];
        tri(k[0], k[1], k[2], q[0], q[1], q[2], f);
        tri(k[0], k[2], k[3], q[0], q[2], q[3], f);
      }
    }
    for (const [r, dir] of [[0, 1], [n - 1, -1]]) {
      const R = S[r], v2 = R.map((p) => new THREE.Vector2(p[0], p[2]));
      for (const t of THREE.ShapeUtils.triangulateShape(v2, [])) {
        tri(ids[r][t[0]], ids[r][t[1]], ids[r][t[2]], R[t[0]], R[t[1]], R[t[2]], [0, dir, 0]);
      }
    }
  }
  /* LA SOLAPA DE LA NUCA: sale de los bordes de detras de la concha
     -a los lados, donde acaba la mascara- y rodea la nuca PEGADA a ella,
     siguiendo el ovalo de la cabeza a 1,5 cm, con el borde de abajo un
     poco abierto. Del gris del dibujo y plana, como la concha. Antes era
     un aro suelto a 5 cm de la cabeza y se veia flotando. */
  function solapaATP(B, g, hex) {
    const C = cab(), N = 28, an = [];
    const aIni = 98, aFin = 262;                 // de un borde de la concha al otro, por detras
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = (aIni + (aFin - aIni) * u) * RAD;
      const back = Math.sin(u * Math.PI);
      const yTop = 1.29 - 0.01 * back, yBot = 1.09 + 0.04 * back;
      // el ovalo de la cabeza a esa altura, mas 1,5 cm
      const r = (y, extra) => {
        const k = Math.sqrt(Math.max(0.1, 1 - Math.pow((y - C.cy) / C.ry, 2)));
        return [C.rx * k + 0.015 + extra, C.rz * k + 0.015 + extra];
      };
      const q = (y, d) => { const R = r(y, d); return [Math.sin(a) * R[0], y, C.cz + Math.cos(a) * R[1]]; };
      an.push([q(yBot - g, 0.03 - g), q(yBot - g, 0.062 + g), q(yTop + g, 0.032 + g), q(yTop + g, -g)]);
    }
    if (g > 0) barridoTinta(B, an);            // la tinta, sin grietas (ver barridoTinta)
    else barrido(B, an, hex, U.LUZ_PLANA);
  }


  MODELOS.agent2_mask = function (B, g, silueta) {
    if (!global.ACCESORIOS_TEX) return;
    if (silueta) {                             // la tinta de la concha
      /* va adelantada como la concha (ver Acc.ADELANTO): asi su contorno
         tambien pasa por delante del de la cabeza, donde se apoya en ella */
      const n0 = B.n;
      tintaATP(B, g);
      (B.adelante = B.adelante || []).push([n0, B.n]);
    }
    solapaATP(B, silueta ? g : 0, silueta ? 0x000000 : 0x3c3c3c);
  };
  // la parte con dibujo: va en su propia malla, con el atlas
  const TEXTURAS = { agent2_mask: (Bt) => conchaATP(Bt, 0, true) };
  Acc.conTextura = (id) => !!(TEXTURAS[id] && global.ACCESORIOS_TEX && global.ACCESORIOS_TEX[id]);
  /* Construye la parte con dibujo y devuelve su geometria (con las
     caras lisas marcadas). Bt: un constructor
     con uv y, si va en un personaje, con el hueso de la cabeza puesto. */
  /* LAS QUE VAN EN LA MALLA APARTE ENTERAS, sin dibujo: las gafas OBSV
     rodean la cabeza a pocos centimetros, y la tinta del ovalo (adelantada
     0,15 m) las atravesaba a manchones negros. En la malla aparte llevan
     el mismo adelanto que la ATP (Acc.ADELANTO), con su luz de la sala. */
  const APARTE = { agent3_mask: true };
  Acc.enMallaAparte = (id) => !!APARTE[id];
  Acc.conMalla = (id) => Acc.conTextura(id) || Acc.enMallaAparte(id);
  Acc.construirTex = function (Bt, id) {
    Bt.solido = [];
    if (Acc.conTextura(id)) TEXTURAS[id](Bt);
    if (Acc.enMallaAparte(id) && MODELOS[id]) {
      MODELOS[id](Bt, 0, false);
      while (Bt.uv.length < Bt.n * 2) Bt.uv.push(0, 0);
      while (Bt.solido.length < Bt.n) Bt.solido.push(1);
    }
    const geo = Bt.build();
    geo.setAttribute('aSolido', new THREE.Float32BufferAttribute(Bt.solido, 1));
    return geo;
  };
  /* La textura de cada mascara con dibujo se carga AL ARRANCAR: sale de
     un data URI, que el navegador decodifica aparte, y si se pedia al crear
     el primer enemigo con esa mascara, ese enemigo salia un momento sin
     dibujo (transparente). */
  const _tex = Object.create(null);
  function texturaDe(id) {
    if (!_tex[id]) {
      const t = new THREE.TextureLoader().load(global.ACCESORIOS_TEX[id].atlas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      _tex[id] = t;
    }
    return _tex[id];
  }
  if (global.ACCESORIOS_TEX) for (const id in global.ACCESORIOS_TEX) texturaDe(id);
  // las que no llevan dibujo: todo es color del vertice (aSolido = 1)
  let _blanca = null;
  const blanca = () => _blanca || (_blanca = Object.assign(new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1), { needsUpdate: true }));
  Acc.ADELANTO = 0.18;                  // m hacia la camara (ver Acc.material)
  const _matTex = Object.create(null);
  Acc.material = function (id) {
    if (!_matTex[id]) {
      const tex = global.ACCESORIOS_TEX && global.ACCESORIOS_TEX[id] ? texturaDe(id) : blanca();
      // transparente: el cristal del visor deja ver la cara (su opacidad viene en el atlas)
      /* por las dos caras: la mascara va abierta por detras y, por dentro,
         se ve oscura (ver el fragmento) */
      const m = Art.aplicarEscalonesMundo(new THREE.MeshBasicMaterial({
        vertexColors: true, map: tex, transparent: true, side: THREE.DoubleSide }));
      const base = m.onBeforeCompile;
      m.onBeforeCompile = (sh) => {
        base(sh);
        // el dibujo sin luz; las caras lisas (aSolido), con su color y la luz de la sala
        /* LA MASCARA TAPA EL CONTORNO DE LA CABEZA. La tinta del ovalo va
           adelantada 0,15 m en profundidad (asi gana al torso) y, de perfil,
           las placas de la mascara quedan a menos que eso por delante de
           ese contorno: se veia la linea de la cabeza a traves de ellas.
           La mascara se adelanta un poco mas (Acc.ADELANTO): el contorno de
           la cabeza solo se ve donde la mascara no lo cubre. Solo de frente
           y de costado (vistaCapa): de espaldas la nuca va delante. */
        sh.vertexShader = 'attribute float aSolido;\nvarying float vSolido;\n' + Art.VISTA_GLSL +
          sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n\tvSolido = aSolido;')
            .replace('#include <project_vertex>', '#include <project_vertex>\n' +
              '\t{ vec4 pz = projectionMatrix * vec4(mvPosition.xy, mvPosition.z + ' + Acc.ADELANTO.toFixed(3) + ' * vistaCapa(), 1.0);\n' +
              '\t  gl_Position.z = pz.z / pz.w * gl_Position.w; }');
        sh.fragmentShader = 'varying float vSolido;\n' +
          sh.fragmentShader.replace('#include <map_fragment>',
            'vec4 dib = texture2D(map, vMapUv);\n' +
            '\tdiffuseColor.rgb = mix(dib.rgb, diffuseColor.rgb * vColor, vSolido);\n' +
            '\tdiffuseColor.a *= mix(dib.a, 1.0, vSolido);\n' +
            // por dentro: el interior del casco, oscuro y opaco
            '\tif (!gl_FrontFacing) diffuseColor = vec4(vec3(0.13), 1.0);')
          // el color del vertice ya va dentro de la mezcla: que no vuelva a multiplicar
            .replace('#include <color_fragment>', '');
      };
      m.customProgramCacheKey = () => 'madness-accesorio-caras-vidrio-adelante-abierta';
      _matTex[id] = m;
    }
    return _matTex[id];
  };

  /* =============================================================
     OBSV GOGGLES (agent3_mask), DE SU HOJA DE VUELTAS

     Un ARO rigido que rodea toda la cabeza a la altura de los ojos
     (centrado en la cruz). En la hoja, de costado, el cuerpo y la varilla
     se ven como tiras rectas: es el aro visto de canto; de frente, sus
     puntas son los extremos; y de espaldas la varilla se junta con el
     cuerpo casi en el centro de la nuca.

     EL RECORRIDO: un ovalo redondeado (superelipse) alrededor de la
     cabeza: frente casi plano -ahi van las piezas de delante- y costados
     y nuca curvos, siguiendo la cabeza a unos centimetros. Todas las
     piezas se barren por el, con su seccion. Medido en la vista de frente
     de la hoja (x: a la derecha de quien lo mira de frente):

       · la CAJA del lente (gris 0x44), de -0,336 a -0,066, 0,218 de alto,
         con un panel mas claro en L; delante, en x -0,165, la MIRA: un
         cilindro negro de radio 0,118 que sale 0,10 hacia delante, con el
         canto redondeado, y en su boca un aro oscuro y el LENTE amarillo
       · el SOPORTE (gris 0x5f), octogonal, con su perno negro
       · la ABRAZADERA (oscura 0x2e), una U que abraza una barra clara
       · la VARILLA (gris 0x5f), fina, con un COLLARIN oscuro: sale de la
         abrazadera, rodea el lado derecho y llega a la nuca
       · el CUERPO (0x51): sale de la caja del lente, rodea el lado
         izquierdo y la nuca hasta juntarse con la varilla; su seccion es
         un pentagono con la arista hacia fuera, y lleva una ranura.
     ============================================================= */
  const OBSV = { A: 0.375, zc: 0.145, Bz: 0.37, p: 3.2 };
  // el recorrido: punto y normal hacia fuera para el angulo th (0 = delante, + hacia +x)
  function obsvPunto(th) {
    const { A, zc, Bz, p } = OBSV, s = Math.sin(th), c = Math.cos(th);
    const x = A * Math.sign(s) * Math.pow(Math.abs(s), 2 / p);
    const z = zc + Bz * Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
    let nx = Math.sign(x) * Math.pow(Math.abs(x / A), p - 1) / A;
    let nz = Math.sign(z - zc) * Math.pow(Math.abs((z - zc) / Bz), p - 1) / Bz;
    const L = Math.hypot(nx, nz) || 1;
    return { x, z, nx: nx / L, nz: nz / L };
  }
  // el angulo del recorrido que cae en 'x' visto de frente (por delante)
  const obsvTh = (x) => Math.sign(x) * Math.asin(Math.min(1, Math.pow(Math.abs(x) / OBSV.A, OBSV.p / 2)));
  const obsvCamino = (th0, th1) => (t) => obsvPunto(th0 + (th1 - th0) * t);
  const obsvN = (th0, th1) => Math.max(2, Math.ceil(Math.abs(th1 - th0) / (4 * RAD)));

  /* LA TINTA DE LAS OBSV: UN SOLO CASCO para todo el aro. Con un casco
     por pieza, donde se juntaban dos cada contorno acababa por su cuenta y
     quedaban cortes y escalones sueltos. Aqui se da la vuelta entera, con
     la seccion de la pieza que toca en cada tramo (un pentagono: dentro,
     fuera y la arista; en las piezas rectas la arista cae en el medio), y
     en cada cambio de pieza un escalon dentro de la misma malla: el
     contorno es una sola linea cerrada. La mira no lleva casco (ver abajo). */
  function tintaOBSV(B, g, Y) {
    const th = obsvTh, J = Math.asin(Math.pow(0.08 / OBSV.A, OBSV.p / 2));
    // [desde, hasta, dentro, fuera, arista, medio alto(u: 0..1 dentro del tramo)]
    const recta = (d, f, h) => [d, f, f, typeof h === 'function' ? h : () => h];     // sin arista
    const tramos = [
      [-Math.PI + J, th(-0.336), -0.03, 0.022, 0.04, () => 0.085],                 // el cuerpo
      [th(-0.336), th(-0.066), ...recta(-0.035, 0.035, 0.109)],                   // la caja
      [th(-0.066), th(0.034), ...recta(-0.03, 0.035, (u) => 0.09 - Math.max(0, 0.026 - (1 - u) * 0.1))],   // el soporte
      [th(0.034), th(0.128), ...recta(-0.037, 0.035, 0.0675)],                     // la abrazadera
      [th(0.128), th(0.212), ...recta(-0.024, 0.024, 0.038)],                     // la varilla
      [th(0.212), th(0.247), ...recta(-0.03, 0.03, 0.044)],                       // el collarin
      [th(0.247), Math.PI + J, ...recta(-0.024, 0.024, 0.038)]                    // la varilla, hasta la nuca
    ];
    const anillos = [], ths = [];
    for (const [t0, t1, d, f, a, h] of tramos) {
      const n = obsvN(t0, t1);
      for (let i = 0; i <= n; i++) {
        const u = i / n, t = t0 + (t1 - t0) * u, q = obsvPunto(t), hh = h(u) + g;
        const pt = (r, dy) => [q.x + q.nx * r, Y + dy, q.z + q.nz * r];
        anillos.push([pt(d - g, -hh), pt(f + g, -hh), pt(a + g, 0), pt(f + g, hh), pt(d - g, hh)]);
        ths.push(t);
      }
    }
    anillos.push(anillos[0]); ths.push(ths[0] + 2 * Math.PI);      // el aro se cierra en la nuca
    /* Se cose a mano: en los ESCALONES (dos anillos en el mismo punto del
       recorrido) la cara no tiene "fuera" por su centro; mira a lo largo del
       recorrido, hacia el lado de la pieza mas chica. Mal orientada, la
       tinta (que solo pinta sus caras de detras) la perdia y quedaban
       huecos claros en el contorno. */
    /* VERTICES COMPARTIDOS Y NORMALES SUAVES. El grosor de la tinta en
       pantalla empuja cada vertice por su normal: con caras planas, en cada
       arista las dos caras se empujaban hacia lados distintos y se abria una
       grieta finisima (hilos claros en el contorno). Aqui cada vertice es
       uno solo, con la normal que sale del eje del aro hacia el. */
    const c = B._rgb(0x000000, 1), nV = anillos[0].length;
    const cen = (R) => R.reduce((a, p) => [a[0] + p[0] / nV, a[1] + p[1] / nV, a[2] + p[2] / nV], [0, 0, 0]);
    const tam = (R) => { const m = cen(R); return R.reduce((a, p) => a + Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2]), 0); };
    const ids = anillos.map((R, r) => {
      if (r === anillos.length - 1) return null;                 // el ultimo es el primero
      const m = cen(R);
      return R.map((p) => {
        let nx = p[0] - m[0], ny = p[1] - m[1], nz = p[2] - m[2];
        const L = Math.hypot(nx, ny, nz) || 1;
        return B._vert(p[0], p[1], p[2], nx / L, ny / L, nz / L, c[0], c[1], c[2]);
      });
    });
    ids[ids.length - 1] = ids[0];
    const tri = (i0, i1, i2, P0, P1, P2, f) => {
      const ux = P1[0] - P0[0], uy = P1[1] - P0[1], uz = P1[2] - P0[2];
      const vx = P2[0] - P0[0], vy = P2[1] - P0[1], vz = P2[2] - P0[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * f[0] + ny * f[1] + nz * f[2] >= 0) B.idx.push(i0, i1, i2); else B.idx.push(i0, i2, i1);
    };
    for (let r = 0; r < anillos.length - 1; r++) {
      const A = anillos[r], Bn = anillos[r + 1], cA = cen(A), cB = cen(Bn);
      let fuera = null;
      if (Math.abs(ths[r + 1] - ths[r]) < 1e-7) {
        const p0 = obsvPunto(ths[r] - 1e-3), p1 = obsvPunto(ths[r] + 1e-3);
        const s2 = tam(A) > tam(Bn) ? 1 : -1;
        fuera = [(p1.x - p0.x) * s2, 0, (p1.z - p0.z) * s2];
      }
      const m0 = [(cA[0] + cB[0]) / 2, (cA[1] + cB[1]) / 2, (cA[2] + cB[2]) / 2];
      for (let i = 0; i < nV; i++) {
        const j = (i + 1) % nV, q = [A[i], A[j], Bn[j], Bn[i]];
        const k4 = [ids[r][i], ids[r][j], ids[r + 1][j], ids[r + 1][i]];
        const f = fuera || [0, 1, 2].map((e) => (q[0][e] + q[1][e] + q[2][e] + q[3][e]) / 4 - m0[e]);
        tri(k4[0], k4[1], k4[2], q[0], q[1], q[2], f);
        tri(k4[0], k4[2], k4[3], q[0], q[2], q[3], f);
      }
    }
  }

  MODELOS.agent3_mask = function (B, g, silueta) {
    const n0 = B.n;                     // (su tinta va adelantada entera, ver Acc.ADELANTO)
    /* LA TINTA, FINA: el cuerpo se hincha 1,6 cm para su contorno, y en
       piezas de 7 cm como estas eso duplicaba el trazo y cada pieza lo
       engordaba distinto (no casaban). Un centimetro: el resto del grosor
       lo pone el empuje en pantalla, igual que en todo el personaje. Las
       juntas entre pieza y pieza, que la silueta no dibuja, van aparte
       (ver 'junta'), del mismo grueso que en la hoja. */
    if (silueta) g = Math.min(g, 0.01);
    const k = (cc) => (silueta ? 0x000000 : cc);
    const Y = cab().cruzY;
    if (silueta) { tintaOBSV(B, g, Y); (B.adelante = B.adelante || []).push([n0, B.n]); return; }
    // una pieza del aro, de x0 a x1 (vista de frente), entre 'dentro' y 'fuera' del recorrido
    const tramo = (x0, x1, alto, dentro, fuera, hex) => {
      const t0 = obsvTh(x0), t1 = obsvTh(x1);
      banda(B, obsvCamino(t0, t1), obsvN(t0, t1), Y, typeof alto === 'function' ? alto : () => alto, dentro, fuera, k(hex), g);
    };
    const frente = (x) => { const q = obsvPunto(obsvTh(x)); return q.z + q.nz * 0.035; };   // la cara de delante
    const circulo = (r, n) => Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI * i / n; return [Math.cos(a) * r, Math.sin(a) * r]; });

    // DELANTE: la caja del lente, el soporte (octogonal: achaflanado en las puntas), la abrazadera
    tramo(-0.336, -0.066, 0.109, -0.035, 0.035, 0x444444);
    tramo(-0.066, 0.034, (t) => 0.09 - Math.max(0, 0.026 - (1 - t) * 0.1), -0.03, 0.035, 0x5f5f5f);   // chaflan a la derecha
    tramo(0.034, 0.128, 0.0675, -0.037, 0.035, 0x2e2e2e);
    if (!silueta) {
      /* la L de la caja: arriba a la izquierda, un panel mas claro (82)
         enmarcado por una linea que baja del borde de arriba hasta la mitad
         y sigue hasta la mira (pegados a su cara curva) */
      const sobre = (x0, x1, y0, y1, d, hex) => { const t0 = obsvTh(x0), t1 = obsvTh(x1);
        banda(B, obsvCamino(t0, t1), obsvN(t0, t1), Y + (y0 + y1) / 2, () => (y1 - y0) / 2, 0.03, d, hex, 0); };
      sobre(-0.309, -0.2, 0.0, 0.109, 0.037, 0x525252);
      sobre(-0.316, -0.309, -0.004, 0.109, 0.0375, 0x111111);
      sobre(-0.316, -0.25, -0.004, 0.003, 0.0375, 0x111111);
      /* LAS JUNTAS: la linea negra entre dos piezas vecinas, en x, del alto
         de la mas baja y apoyada en su cara de delante ('cara': lo que esa
         pieza sale del recorrido): no sobresale, de costado no flota. */
      const junta = (x, alto, cara) => { const t0 = obsvTh(x - 0.0045), t1 = obsvTh(x + 0.0045);
        banda(B, obsvCamino(t0, t1), 2, Y, () => alto / 2, cara - 0.012, cara + 0.0015, 0x0a0a0a, 0); };
      junta(-0.336, 0.17, 0.035);            // cuerpo | caja
      junta(-0.066, 0.18, 0.035);            // caja | soporte
      junta(0.034, 0.135, 0.035);            // soporte | abrazadera
      junta(0.128, 0.076, 0.024);            // abrazadera | varilla
      junta(0.212, 0.076, 0.024); junta(0.247, 0.076, 0.024);   // el collarin
      const zs = frente(-0.016);
      prisma(B, circulo(0.017, 8).map(([u, v]) => [-0.016 + u, Y + v]), 'z', zs, zs + 0.006, 0x141414, 0);       // el perno
      prisma(B, circulo(0.007, 8).map(([u, v]) => [-0.016 + u, Y + v]), 'z', zs + 0.006, zs + 0.008, 0x3a3a3a, 0);
      // dentro de la abrazadera (una U oscura) entra una barra clara que sale del soporte
      const za = frente(0.08);
      prisma(B, [[0.030, Y - 0.034], [0.104, Y - 0.034], [0.104, Y + 0.034], [0.030, Y + 0.034]], 'z', za - 0.004, za + 0.003, 0x5f5f5f, 0);
    }
    // LA VARILLA: de la abrazadera, por el lado derecho, hasta la nuca (junto al cuerpo)
    const thJ = Math.asin(Math.pow(0.08 / OBSV.A, OBSV.p / 2));        // la junta, en x -0,08 por detras
    const tV = obsvTh(0.128), tV1 = Math.PI + thJ;
    banda(B, obsvCamino(tV, tV1), obsvN(tV, tV1), Y, () => 0.038, -0.024, 0.024, k(0x5f5f5f), g);
    tramo(0.212, 0.247, 0.044, -0.03, 0.03, 0x2e2e2e);                                  // el collarin
    // EL CUERPO: de la caja del lente, por el lado izquierdo y la nuca, hasta la varilla
    const tC0 = obsvTh(-0.336), tC1 = -Math.PI + thJ;
    const nC = obsvN(tC0, tC1), anillos = [];
    for (let i = 0; i <= nC; i++) {
      const q = obsvCamino(tC0, tC1)(i / nC);
      const pt = (d, dy) => [q.x + q.nx * d, Y + dy, q.z + q.nz * d];
      const h = 0.085 + g;
      anillos.push([pt(-0.03 - g, -h), pt(0.022 + g, -h), pt(0.04 + g, 0), pt(0.022 + g, h), pt(-0.03 - g, h)]);
    }
    barrido(B, anillos, k(0x515151));
    if (!silueta) banda(B, obsvCamino(tC0, tC1), nC, Y, () => 0.006, 0.036, 0.043, 0x2e2e2e, 0);   // la ranura
    // LA MIRA: el cilindro negro, del frente de la caja hacia delante, con el canto redondeado
    /* un poco mas alto que la caja, como en la hoja (195 px contra 185).
       Sobresale 0,10 y va 1,2 cm por encima del centro de la caja: la
       camara del juego mira 19 grados desde arriba, y mas largo -o
       centrado del todo- su boca caia en pantalla por debajo de la caja,
       con el cilindro asomando encima del lente, y parecia caido. */
    const xL = -0.165, yL = Y + 0.012, n = 48, z0 = frente(xL) - 0.02;
    const aro = (z, r) => circulo(r, n).map(([u, v]) => [xL + u, yL + v, z]);
    /* SIN TINTA POR SILUETA: el cilindro es casi negro, y su casco de
       tinta se cortaba de canto en trazos sueltos que ensuciaban la caja y
       el soporte. Su borde es parte de la pieza: el canto redondeado de la
       boca va en negro, y de frente es el trazo de la hoja. */
    if (!silueta) {
      const R = 0.118, L = 0.10;
      barrido(B, [aro(z0, R), aro(z0 + L - 0.015, R)], 0x1b1b1b);
      barrido(B, [aro(z0 + L - 0.015, R), aro(z0 + L - 0.005, R - 0.007), aro(z0 + L, R - 0.016)], 0x070707);
      barrido(B, [aro(z0 + L - 0.001, 0.102), aro(z0 + L + 0.002, 0.102)], 0x2a2a2a);       // el aro oscuro
      barrido(B, [aro(z0 + L + 0.002, 0.087), aro(z0 + L + 0.004, 0.087)], 0x0a0a0a);       // su trazo
      barrido(B, [aro(z0 + L + 0.004, 0.081), aro(z0 + L + 0.006, 0.081)], 0xffcc33);       // el lente
    }
    if (silueta) (B.adelante = B.adelante || []).push([n0, B.n]);
  };

  Acc.MODELOS = MODELOS;
  // las herramientas, para las pruebas y para prendas3d.js
  Acc._h = { banda, barrido, barridoTinta, caminoPoli, caminoOvalo, loft, prisma, cara,
             cascara, losaCurva, tubo, punto, hinchar, centroCruz, cab, recortar, cristalDegrade, densificar };
  Acc.NOMBRES = {
    agent1_mask: 'Agent Shades', agent1_mask_b: 'Agent Shades',
    agent2_mask: 'ATP Mask', agent3_mask: 'OBSV Goggles'
  };

  /* Pone el accesorio 'id' en el constructor B, en coordenadas del
     modelo del personaje (con el hueso ya elegido: la cabeza). */
  Acc.construir = function (B, id, g, silueta, F) {
    const m = MODELOS[id];
    if (m) m(B, g || 0, !!silueta, F || {});
    return B;
  };

  global.Accesorios = Acc;
})(window);

