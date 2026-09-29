/* =============================================================
   ropa.js -> Las prendas del torso: los trajes. Como los accesorios
   de la cabeza (accesorios.js), cada prenda es un objeto propio con
   el nombre del SWF, y se le pone al torso de quien la lleve -un
   enemigo hoy, el jugador el dia que haya tienda-. Los blindajes y
   el resto de la ropa iran aqui tambien.

     agent    el traje negro: camisa en V, corbata, abertura y botones
     agent2   el mismo con el ARNES (collar, X, pasadores, bolso)
     agent3   el mismo con la BANDOLERA y su hebilla de marco

   Todo en 3D, medido en las hojas de vueltas de cada torso.
   ============================================================= */
(function (global) {
  'use strict';

  const Ropa = {};
  const Chars = global.Chars;

  /* =============================================================
     LA SUPERFICIE EXACTA DEL TORSO

     El torso es un tubo de 12 lados (addTubo, redondez 3) con las filas
     de cuerpo(). Todo lo que va encima se apoya en SUS caras, no en una
     curva ideal:
       · entre vertice y vertice la cara es plana, y una pieza rigida
         apoyada con la normal suavizada entraba por un lado en el torso
         (el boton comido por la mitad);
       · el torso se inclina hacia atras al subir, y una placa vertical
         se hundia un centimetro por debajo de su centro;
       · una correa ancha de cuatro puntos cruzaba una arista con una
         cuerda que se metia hasta un centimetro (la bandolera deforme).
     Asi que las piezas que se pegan a la tela siguen las caras punto a
     punto (cada centimetro), y las rigidas se apoyan en el plano
     tangente de verdad, que en un cuerpo convexo nunca lo corta.

     Coordenadas sobre la tela: psi, el angulo desde delante (+ hacia
     +x, la izquierda del muñeco), e y, la altura; en metros a lo
     ancho, s = psi * radio(y).
     ============================================================= */
  const LADOS = 12, POT = 2 / 3, PASO = 0.012;
  function filasTorso(A) {
    return [[0.162, 0.258 * A, 0.232 * A, 0.006], [0.190, 0.271 * A, 0.236 * A, 0.004], [0.467, 0.264 * A, 0.230 * A, 0.000]]
      .concat(Chars.PERFIL_ALTO.map((q) => [q[0], q[1] * A, q[2] * A, q[3]]));
  }
  function filaEn(F, y) {
    let i = 0;
    while (i < F.length - 2 && F[i + 1][0] < y) i++;
    const a = F[i], b = F[i + 1], t = U.clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
    return [y, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
  }
  // las esquinas del dodecagono (como addTubo)
  const DIR = Array.from({ length: LADOS }, (_, i) => {
    const th = (i / LADOS) * U.TAU + Math.PI / LADOS, c = Math.cos(th), sn = Math.sin(th);
    return [Math.sign(c) * Math.pow(Math.abs(c), POT), Math.sign(sn) * Math.pow(Math.abs(sn), POT)];
  });
  /* El punto de la cara del torso en (psi, y), 'd' por fuera de ella:
     [x, y, z, nx, nz] (nx, nz: la direccion de salida, suave). */
  function sup(F, psi, y, d) {
    const q = filaEn(F, y);
    let th = Math.PI / 2 - psi;
    th = ((th - Math.PI / LADOS) % U.TAU + U.TAU) % U.TAU;
    const paso = U.TAU / LADOS, i = Math.min(LADOS - 1, Math.floor(th / paso)), f = th / paso - i;
    const a = DIR[i], b = DIR[(i + 1) % LADOS];
    const dx = a[0] + (b[0] - a[0]) * f, dz = a[1] + (b[1] - a[1]) * f;
    let nx = dx / q[1], nz = dz / q[2];
    const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
    return [dx * q[1] + nx * d, y, q[3] + dz * q[2] + nz * d, nx, nz];
  }
  // el radio medio (perimetro / 2 pi) del torso a una altura
  function radio(F, y) {
    const q = filaEn(F, y);
    let per = 0;
    for (let k = 0; k < LADOS; k++) {
      const a = DIR[k], b = DIR[(k + 1) % LADOS];
      per += Math.hypot((b[0] - a[0]) * q[1], (b[1] - a[1]) * q[2]);
    }
    return per / U.TAU;
  }
  /* LA METRICA DE VERDAD: cuantos metros de tela hay por radian en
     (psi, y). El dodecagono superelipsoidal tiene caras planas delante,
     detras y a los costados -donde un radian mide ~1,5 veces el radio
     medio- y esquinas apretadas entre ellas. Pasando metros a angulo con
     el radio medio, todo lo pegado salia ensanchado de frente (el nudo
     aplastado, los botones ovalados) y la bandolera cambiaba de ancho al
     rodear el cuerpo. */
  function metrica(F, psi, y) {
    const e = 0.004, a = sup(F, psi - e, y, 0), b = sup(F, psi + e, y, 0);
    return Math.hypot(b[0] - a[0], b[2] - a[2]) / (2 * e);
  }
  // el angulo al avanzar u metros por la tela, a lo ancho, desde psi
  function avanzar(F, psi, y, u) {
    const n = Math.max(1, Math.ceil(Math.abs(u) / 0.006)), du = u / n;
    for (let i = 0; i < n; i++) psi += du / metrica(F, psi + du / (2 * metrica(F, psi, y)), y);
    return psi;
  }
  /* La normal suave, con la inclinacion del torso al subir (como las
     normales del tubo): la ropa pegada se sombrea igual que la tela. */
  function normal(F, psi, y) {
    const e = 0.003, P = sup(F, psi, y, 0), a = sup(F, psi, y - e, 0), b = sup(F, psi, y + e, 0);
    const dr = ((b[0] - a[0]) * P[3] + (b[2] - a[2]) * P[4]) / (2 * e);
    const L = Math.hypot(P[3], dr, P[4]);
    return [P[3] / L, -dr / L, P[4] / L];
  }

  // vectores
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const uni = (a) => { const L = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };
  const suave = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* EL PLANO TANGENTE DE VERDAD en (psi, y): el origen en la cara, U a
     lo ancho (+psi), V hacia arriba por la tela y n hacia fuera. En una
     arista, el plano medio entre las dos caras: tambien la toca sin
     cortarla. */
  function marco(F, psi, y) {
    const r = radio(F, y), e = 0.004, P = sup(F, psi, y, 0);
    const Uu = uni(sub3(sup(F, psi + e / r, y, 0), sup(F, psi - e / r, y, 0)));
    let n = uni(cruz(Uu, sub3(sup(F, psi, y + e, 0), sup(F, psi, y - e, 0))));
    if (n[0] * P[3] + n[2] * P[4] < 0) n = [-n[0], -n[1], -n[2]];
    return { P: [P[0], P[1], P[2]], U: Uu, V: uni(cruz(n, Uu)), n };
  }

  /* =============================================================
     EMISION: vertices con su normal, y triangulos orientados hacia
     donde mira esa normal (el material es de una cara).
     ============================================================= */
  const vert = (B, p, n, c) => ({ i: B._vert(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2]), p, n });
  function tri(B, a, b, c, n) {
    const k = cruz(sub3(b.p, a.p), sub3(c.p, a.p));
    if (dot3(k, n) >= 0) B.idx.push(a.i, b.i, c.i); else B.idx.push(a.i, c.i, b.i);
  }
  function quad(B, a, b, c, d, n) { tri(B, a, b, c, n); tri(B, a, c, d, n); }
  const H3 = () => global.Accesorios._h;
  const NEGRO = 0x0a0a0a;
  /* las bandas del arnes: gris 64 contra el 51 del traje en la hoja; con
     la luz de la sala, a 54 contra 39 se leen igual que alli */
  const BANDA = 0x363636;

  /* =============================================================
     UNA CORREA 3D pegada a la tela. Dos maneras de darla:
       o.tramo(t) -> [psi, yBajo, yAlto]: a lo ancho, en vertical (las
         bandas del arnes: la hoja da sus bordes de arriba y de abajo)
       o.camino(t) -> [psi, y] y o.ancho: a lo ancho, perpendicular (la
         bandolera, las cintas finas)
     Su cara de fuera, a o.grueso de la tela (numero o funcion de t),
     con un BORDE NEGRO a cada lado; los cantos, negros y hasta dentro
     del torso: es el trazo del SWF, pero con volumen. Cada punto -a lo
     largo y a lo ancho, cada centimetro- se apoya en la cara real. La
     tinta, un casco continuo con vertices compartidos (sin grietas).
     ============================================================= */
  function correa(B, F, g, silueta, o) {
    if (silueta && o.sinTinta) return;
    const grueso = typeof o.grueso === 'function' ? o.grueso : () => o.grueso;
    /* o.redondo: seccion abombada (una venda, no una cinta plana): en los
       bordes queda a esa fraccion del grueso, y en el medio a todo */
    const rd = o.redondo, alto = rd ? (t, e) => grueso(t) * (rd + (1 - rd) * Math.sqrt(Math.max(0, 1 - e * e))) : (t) => grueso(t);
    let lado, medio;
    if (o.tramo) {
      lado = (t, e) => { const q = o.tramo(t); return [q[0], q[1] + (q[2] - q[1]) * (e + 1) / 2]; };
      medio = (t) => { const q = o.tramo(t); return (q[2] - q[1]) / 2; };
    } else {
      /* a lo ancho en metros LOCALES de cada estacion: con s = psi *
         radio(y) absoluto, lejos de delante un poco de diferencia de
         radio entre dos alturas torcia la correa, y en la costura del
         lazo (psi = -pi contra +pi) abria un escalon */
      const cam = (t) => o.camino(o.entera ? t : U.clamp(t, 0, 1));
      medio = typeof o.ancho === 'function' ? (t) => o.ancho(t) / 2 : () => o.ancho / 2;
      lado = (t, e) => {
        const C = cam(t), a = cam(t - 0.002), b = cam(t + 0.002), r = metrica(F, C[0], C[1]);
        let tx = (b[0] - a[0]) * r, ty = b[1] - a[1];
        const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
        const h = medio(t), y2 = C[1] - tx * e * h;
        return [avanzar(F, C[0], y2, ty * e * h), y2];
      };
    }
    let N = o.N;
    if (!N) {
      let L = 0, prev = null;
      for (let k = 0; k <= 96; k++) {
        const [ps, y] = lado(k / 96, 0);
        if (prev) L += Math.hypot((ps - prev[0]) * metrica(F, ps, y), y - prev[1]);
        prev = [ps, y];
      }
      N = Math.max(4, Math.ceil(L / PASO));
    }
    const P = (t, e, d) => { const [ps, y] = lado(t, e); return { p: sup(F, ps, y, d).slice(0, 3), n: normal(F, ps, y) }; };
    let hMax = 0;
    for (let i = 0; i <= 8; i++) hMax = Math.max(hMax, medio(i / 8));
    const nIn = Math.max(1, Math.ceil(2 * hMax / PASO));
    const bd = o.borde === undefined ? 0.009 : o.borde;
    // o.bordes = [el del lado -1, el del lado +1] (en un tramo: abajo, arriba)
    const [bdA, bdB] = o.bordes || [bd, bd];
    // las muestras a lo ancho de la estacion t, de -1 a 1
    const anchoDe = (t) => {
      const bA = bdA > 0 ? Math.min(bdA / medio(t), 0.35) : 0, bB = bdB > 0 ? Math.min(bdB / medio(t), 0.35) : 0, es = [];
      if (bA > 0) es.push(-1);
      for (let k = 0; k <= nIn; k++) es.push(-1 + bA + (2 - bA - bB) * k / nIn);
      if (bB > 0) es.push(1);
      return es;
    };
    const D0 = -0.003;

    if (silueta) {
      const an = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, ge = g / medio(t), es = [-1 - ge].concat(anchoDe(t), [1 + ge]);
        const arriba = es.map((e) => P(t, e, grueso(t) + g).p);
        const abajo = es.slice().reverse().map((e) => P(t, e, D0 - g).p);
        an.push(arriba.concat(abajo));
      }
      H3().barridoTinta(B, an);
      return;
    }

    const negro = B._rgb(NEGRO, 1), color = B._rgb(o.hex, 1);
    // la cara de fuera, por franjas de color (negro | color | negro)
    const i0 = bdA > 0 ? 1 : 0, franjas = [];
    if (bdA > 0) franjas.push([0, 1, negro]);
    franjas.push([i0, i0 + nIn, color]);
    if (bdB > 0) franjas.push([i0 + nIn, i0 + nIn + 1, negro]);
    for (const [j0, j1, c] of franjas) {
      let prev = null;
      for (let i = 0; i <= N; i++) {
        const t = i / N, es = anchoDe(t), fila = [];
        for (let j = j0; j <= j1; j++) {
          const e = es[j], q = P(t, e, alto(t, e));
          if (rd) {
            // la normal de la cara abombada, de sus vecinos a lo ancho y a lo largo
            const ea = Math.max(-1, e - 0.05), eb = Math.min(1, e + 0.05), dt = 0.5 / N;
            const A1 = P(t, ea, alto(t, ea)).p, B1 = P(t, eb, alto(t, eb)).p;
            const A2 = P(Math.max(0, t - dt), e, alto(Math.max(0, t - dt), e)).p, B2 = P(Math.min(1, t + dt), e, alto(Math.min(1, t + dt), e)).p;
            let n = uni(cruz(sub3(B1, A1), sub3(B2, A2)));
            if (dot3(n, q.n) < 0) n = [-n[0], -n[1], -n[2]];
            q.n = n;
          }
          fila.push(vert(B, q.p, q.n, c));
        }
        if (prev) for (let j = 0; j < fila.length - 1; j++) quad(B, prev[j], fila[j], fila[j + 1], prev[j + 1], prev[j].n);
        prev = fila;
      }
    }
    // los cantos: negros, desde dentro del torso
    for (const e of [-1, 1]) {
      let prev = null;
      for (let i = 0; i <= N; i++) {
        const t = i / N, a = P(t, e, D0), b = P(t, e, alto(t, e)), m = P(t, 0, alto(t, 0));
        const fuera = uni(sub3(b.p, m.p));
        const par = [vert(B, a.p, fuera, negro), vert(B, b.p, fuera, negro)];
        if (prev) quad(B, prev[0], par[0], par[1], prev[1], fuera);
        prev = par;
      }
    }
    if (!o.entera) {
      for (const [t, t2] of [[0, 1 / N], [1, 1 - 1 / N]]) {
        const es = anchoDe(t), fuera = uni(sub3(P(t, 0, alto(t, 0)).p, P(t2, 0, alto(t2, 0)).p));
        let prev = null;
        for (const e of es) {
          const par = [vert(B, P(t, e, D0).p, fuera, negro), vert(B, P(t, e, alto(t, e)).p, fuera, negro)];
          if (prev) quad(B, prev[0], par[0], par[1], prev[1], fuera);
          prev = par;
        }
      }
    }
  }

  /* =============================================================
     UNA PIEZA PLANA: un poligono (u, v) en metros -u a lo ancho (+psi),
     v hacia arriba-, en estrella desde su centro, girado 'giro' (du, dv:
     corrido en su propio plano, antes de girar). o.d = [d0, d1]: de que
     altura a que altura sobre la tela. o.borde: el filo negro de su
     cara (el trazo del dibujo); los cantos, negros.
       o.pegada: sigue la tela punto a punto (camisa, lineas, botones)
       si no, rigida en el plano tangente (placas, hebillas, remaches)
     o.tinta: con casco de contorno (las que asoman de la silueta).
     ============================================================= */
  function area2(poly) {
    let a = 0;
    for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return a / 2;
  }
  // el poligono (antihorario) corrido 'd' hacia dentro (d < 0: hacia fuera)
  function encoger(poly, d) {
    const n = poly.length, lineas = [];
    for (let i = 0; i < n; i++) {
      const p = poly[i], q = poly[(i + 1) % n];
      let dx = q[0] - p[0], dy = q[1] - p[1];
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      lineas.push([p[0] - dy * d, p[1] + dx * d, dx, dy]);      // la normal de dentro: (-dy, dx)
    }
    return lineas.map((l, i) => {
      const k = lineas[(i + n - 1) % n];
      const den = k[2] * l[3] - k[3] * l[2];
      if (Math.abs(den) < 1e-9) return [l[0], l[1]];
      const s = ((l[0] - k[0]) * l[3] - (l[1] - k[1]) * l[2]) / den;
      return [k[0] + k[2] * s, k[1] + k[3] * s];
    });
  }
  // cada lado partido en tramos de 'paso' como mucho (las mismas cuentas
  // para dos poligonos paralelos: los anillos casan punto a punto)
  function cuentas(poly, paso) {
    return poly.map((p, i) => { const q = poly[(i + 1) % poly.length]; return Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / paso)); });
  }
  function densificar(poly, ks) {
    const out = [];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      for (let m = 0; m < ks[i]; m++) out.push([p[0] + (q[0] - p[0]) * m / ks[i], p[1] + (q[1] - p[1]) * m / ks[i]]);
    });
    return out;
  }
  function aplicarPlano(F, o) {
    const giro = o.giro || 0, cg = Math.cos(giro), sg = Math.sin(giro);
    const rot = (u, v) => { u += o.du || 0; v += o.dv || 0; return [u * cg - v * sg, u * sg + v * cg]; };
    if (o.pegada) {
      return (u, v, h) => {
        const [a, b] = rot(u, v), y = o.y + b, ps = avanzar(F, o.psi, y, a);
        return { p: sup(F, ps, y, h).slice(0, 3), n: normal(F, ps, y) };
      };
    }
    const K = marco(F, o.psi, o.y);
    return (u, v, h) => {
      const [a, b] = rot(u, v);
      return { p: [0, 1, 2].map((k) => K.P[k] + K.U[k] * a + K.V[k] * b + K.n[k] * h), n: K.n };
    };
  }
  function pieza(B, F, g, silueta, o) {
    if (silueta && !o.tinta) return;
    let poly = o.poly || [[-o.w / 2, -o.h / 2], [o.w / 2, -o.h / 2], [o.w / 2, o.h / 2], [-o.w / 2, o.h / 2]];
    if (area2(poly) < 0) poly = poly.slice().reverse();
    const M = aplicarPlano(F, o), d0 = o.d[0], d1 = o.d[1], paso = o.pegada ? PASO : 1e9;
    if (silueta) {
      const fuera = encoger(poly, -g), P = densificar(fuera, cuentas(fuera, paso));
      H3().barridoTinta(B, [P.map((q) => M(q[0], q[1], d0 - g).p), P.map((q) => M(q[0], q[1], d1 + g).p)]);
      return;
    }
    const negro = B._rgb(NEGRO, 1), color = B._rgb(o.hex, 1), bd = o.borde || 0;
    const ks = cuentas(poly, paso), ext = densificar(poly, ks);
    const int = bd > 0 ? densificar(encoger(poly, bd), ks) : ext;
    const n = ext.length;
    // el filo negro de la cara
    if (bd > 0) {
      const A = ext.map((q) => { const m = M(q[0], q[1], d1); return vert(B, m.p, m.n, negro); });
      const I = int.map((q) => { const m = M(q[0], q[1], d1); return vert(B, m.p, m.n, negro); });
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; quad(B, A[i], A[j], I[j], I[i], A[i].n); }
    }
    // la cara: abanico desde el centro, subdividido si va pegada
    const c = int.reduce((a, q) => [a[0] + q[0] / n, a[1] + q[1] / n], [0, 0]);
    let R = 0;
    for (const q of int) R = Math.max(R, Math.hypot(q[0] - c[0], q[1] - c[1]));
    const L = o.pegada ? Math.max(1, Math.ceil(R / PASO)) : 1;
    for (let i = 0; i < n; i++) {
      const a = int[i], b = int[(i + 1) % n], G = [];
      for (let k = 0; k <= L; k++) {
        const fila = [];
        for (let m = 0; m <= k; m++) {
          const u = c[0] + (a[0] - c[0]) * k / L + (b[0] - a[0]) * m / L, v = c[1] + (a[1] - c[1]) * k / L + (b[1] - a[1]) * m / L;
          const q = M(u, v, d1);
          fila.push(vert(B, q.p, q.n, color));
        }
        G.push(fila);
      }
      for (let k = 0; k < L; k++) {
        for (let m = 0; m <= k; m++) {
          tri(B, G[k][m], G[k + 1][m], G[k + 1][m + 1], G[k + 1][m].n);
          if (m < k) tri(B, G[k][m], G[k + 1][m + 1], G[k][m + 1], G[k][m].n);
        }
      }
    }
    // los cantos
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, e = ext[i], f = ext[j];
      let dx = f[0] - e[0], dy = f[1] - e[1];
      const Lh = Math.hypot(dx, dy) || 1; dx /= Lh; dy /= Lh;
      const mu = (e[0] + f[0]) / 2, mv = (e[1] + f[1]) / 2;
      const fuera = uni(sub3(M(mu + dy * 0.01, mv - dx * 0.01, d1).p, M(mu, mv, d1).p));
      const q = [M(e[0], e[1], d0), M(f[0], f[1], d0), M(f[0], f[1], d1), M(e[0], e[1], d1)].map((m) => vert(B, m.p, fuera, negro));
      quad(B, q[0], q[1], q[2], q[3], fuera);
    }
  }

  /* UN ARO (la argolla): corona de radios r y ri, rigida en el plano
     tangente. */
  function aro(B, F, g, silueta, o) {
    if (silueta) return;
    const M = aplicarPlano(F, o), d0 = o.d[0], d1 = o.d[1], c = B._rgb(o.hex, 1), K = 24;
    const pt = (r, k, h) => { const a = k / K * U.TAU; return M(Math.cos(a) * r, Math.sin(a) * r, h); };
    for (let k = 0; k < K; k++) {
      for (const [r1, h1, r2, h2] of [[o.r, d1, o.ri, d1], [o.r, d0, o.r, d1], [o.ri, d1, o.ri, d0]]) {
        const q = [pt(r1, k, h1), pt(r1, k + 1, h1), pt(r2, k + 1, h2), pt(r2, k, h2)];
        let n = q[0].n;
        if (r1 === r2) { const dir = uni(sub3(q[0].p, pt(0, k, h1).p)); n = r1 === o.r ? dir : [-dir[0], -dir[1], -dir[2]]; }
        const v = q.map((m) => vert(B, m.p, n, c));
        quad(B, v[0], v[1], v[2], v[3], n);
      }
    }
  }

  /* =============================================================
     UNA ALMOHADA: un bulto pegado a la tela (el bolso, su tapa, el nudo
     de la corbata). Planta de superelipse (o.a x o.b, medios lados en
     metros; o.p: 2 redonda, 6 casi rectangular), alta o.alto, con el
     canto redondeado en o.m y el filo negro de o.borde. Por anillos
     desde el borde hacia dentro: el ultimo se cierra en una linea, y
     todo sigue la tela.
     ============================================================= */
  function almohada(B, F, g, silueta, o) {
    if (silueta && !o.tinta) return;
    const H = o.alto, m = o.m || 0.02, bd = o.borde || 0, pe = 2 / (o.p || 6), base = o.base || 0;
    const K = Math.max(28, Math.ceil(3.6 * (o.a + o.b) / PASO));
    const dirs = Array.from({ length: K }, (_, k) => {
      const a = k / K * U.TAU, c = Math.cos(a), s = Math.sin(a);
      return [Math.sign(c) * Math.pow(Math.abs(c), pe), Math.sign(s) * Math.pow(Math.abs(s), pe)];
    });
    const M = (u, v, h) => { const y = o.y + v, ps = avanzar(F, o.psi, y, u); return { p: sup(F, ps, y, h).slice(0, 3), n: normal(F, ps, y) }; };
    const anillo = (e) => dirs.map((q) => [q[0] * Math.max(0, o.a - e), q[1] * Math.max(0, o.b - e)]);
    if (silueta) {
      const A = anillo(-g);
      H3().barridoTinta(B, [A.map((q) => M(q[0], q[1], base - 0.003 - g).p), A.map((q) => M(q[0], q[1], base + H + g).p)]);
      return;
    }
    const alto = (e) => base + H * Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(e / m, 1), 2)));
    const pend = (e) => {
      if (e >= m) return 0;
      const x = 1 - e / m;
      return H * x / (m * Math.sqrt(Math.max(1e-6, 1 - x * x)));
    };
    const bmin = Math.min(o.a, o.b);
    let es = [0, 0.08 * m, 0.2 * m, 0.38 * m, 0.6 * m, 0.82 * m, m];
    for (let e = m + PASO; e < bmin; e += PASO) es.push(e);
    es.push(bmin);
    if (bd > 0) es.push(bd);
    es = Array.from(new Set(es.filter((e) => e <= bmin).map((e) => +e.toFixed(5)))).sort((a, b) => a - b);
    const negro = B._rgb(NEGRO, 1), color = B._rgb(o.hex, 1);
    const fila = (e, c) => anillo(e).map((q, k) => {
      const h = alto(e), mm = M(q[0], q[1], h);
      // en el canto redondeado la normal se tuerce hacia fuera
      const fuera = uni(sub3(M(q[0] + dirs[k][0] * 0.003, q[1] + dirs[k][1] * 0.003, h).p, mm.p));
      const ph = Math.atan(pend(e)), n = uni([0, 1, 2].map((i) => mm.n[i] * Math.cos(ph) + fuera[i] * Math.sin(ph)));
      return vert(B, mm.p, n, c);
    });
    const unir = (A, Bf) => { for (let i = 0; i < K; i++) { const j = (i + 1) % K; quad(B, A[i], A[j], Bf[j], Bf[i], Bf[i].n); } };
    let prev = null;
    for (const e of es) {
      if (bd > 0 && Math.abs(e - bd) < 1e-6 && prev) {
        unir(prev, fila(e, negro));
        prev = fila(e, color);
        continue;
      }
      const act = fila(e, bd > 0 && e < bd ? negro : color);
      if (prev) unir(prev, act);
      prev = act;
    }
  }
  const circ = (r, n) => Array.from({ length: n || 12 }, (_, i) => { const a = i / (n || 12) * U.TAU; return [Math.cos(a) * r, Math.sin(a) * r]; });

  /* =============================================================
     EL TRAJE, DE LAS HOJAS DE VUELTAS DE CADA TORSO
     (alturas: la hoja va de 1,11 -lo alto de la cupula- a 0,162 -el
     bajo-; anchos, en proporcion al del torso)
     ============================================================= */
  function traje(B, F2, g, silueta, A) {
    const F = filasTorso(A);
    const pz = (o) => pieza(B, F, g, silueta, o);
    const co = (o) => correa(B, F, g, silueta, o);
    const al = (o) => almohada(B, F, g, silueta, o);
    const ar = (o) => aro(B, F, g, silueta, o);
    const arnes = F2.traje === 'agente2';

    /* LA CORBATA (el arnes la tapa): UNA pieza negra: el nudo -un bulto
       redondo que de costado asoma de la silueta, como en la hoja- en el
       fondo de la V del cuello, y la pala, que sale de el y baja sobre el
       saco hasta donde empieza su abertura. */
    if (!arnes) {
      pz({ psi: 0, y: 0.89, pegada: true, poly: [[-0.016, 0.0], [0.016, 0.0], [0.027, -0.075], [0.0, -0.115], [-0.027, -0.075]], d: [0, 0.006], hex: NEGRO });
      /* el nudo: una bola rigida (pegada a la tela, la cupula del torso
         la aplastaba), 10 cm de ancho, que de costado asoma 6 cm */
      if (!silueta) {
        const K = marco(F, 0, 0.905), c = [0, 1, 2].map((k) => K.P[k] + K.n[k] * 0.018);
        B.addEllipsoid(0.05, 0.05, 0.04, c[0], c[1], c[2], NEGRO, { seg: 16, rings: 10 });
      }
    }
    /* EL CUELLO (sus hojas de vueltas, mirado de cerca): la piel acaba en
       una V que baja hasta el nudo -0,925 delante, 1,025 en los costados y
       1,045 por detras, sobre la joroba-; las solapas del saco hacen otra
       V, mas baja y mas empinada -0,81 bajo el nudo-, que se junta con la
       de la piel casi en el costado. Entre las
       dos asoma el cuello BLANCO de la camisa: dos cuñas a cada lado del
       nudo, con su trazo negro arriba y abajo. La piel va en el tubo desde
       0,915 (Ropa.corte); encima, la tela del saco hasta la V de la piel,
       y encima de ella el cuello de la camisa. */
    if (!arnes) {
      const xs = (ps) => Math.pow(Math.abs(Math.sin(ps)), 2 / 3);        // el ancho que se ve de frente, 0 a 1
      // medidas de frente: la piel 0,943 / 0,97 / 1,01 y la solapa 0,858 / 0,914 / 0,98 a 0,14 / 0,4 / 0,64-0,73 del ancho
      const vPiel = (ps) => Math.cos(ps) >= 0 ? 0.925 + 0.10 * xs(ps) : 1.025 + 0.02 * Math.pow(Math.abs(Math.cos(ps)), 2 / 3);
      const XJ = 0.98, vSolapa = (ps) => 0.81 + 0.21 * xs(ps);
      co({ entera: true, tramo: (t) => { const ps = t * U.TAU; return [ps, Ropa.corte('agent') - 0.007, vPiel(ps > Math.PI ? ps - U.TAU : ps)]; },
           grueso: 0.0012, bordes: [0, 0.007], hex: F2.tela, sinTinta: true });
      const psE = Math.asin(Math.pow(XJ, 1.5));
      co({ tramo: (t) => { const ps = -psE + 2 * psE * t; return [ps, Math.min(vSolapa(ps), vPiel(ps) - 0.0005), vPiel(ps)]; },
           grueso: 0.0026, bordes: [0.007, 0.007], hex: F2.camisa, sinTinta: true, N: 60 });
    }
    /* La abertura del saco y los dos botones a su derecha (en el arnes,
       mas abajo: bajo la placa del pecho). */
    const ya = arnes ? [0.52, 0.69] : [0.635, 0.785], yb = arnes ? [0.665, 0.595] : [0.775, 0.705];
    pz({ psi: 0, y: (ya[0] + ya[1]) / 2, pegada: true, w: 0.009, h: ya[1] - ya[0], d: [-0.001, 0.0015], hex: NEGRO });
    for (const y of yb) pz({ psi: avanzar(F, 0, y, -0.035), y, pegada: true, poly: circ(0.012, 12), d: [-0.001, 0.004], hex: NEGRO });

    if (arnes) {
      /* EL ARNES (su hoja de vueltas; gris 64 contra el 51 del traje):
         · el COLLAR: una banda ancha (de 11,5 a 17 cm) que rodea los
           hombros, en V delante hasta la placa; gruesa: por debajo pasan
           las correas bajas.
         · las dos CORREAS BAJAS (13 cm): salen de debajo de la placa, por
           su esquina de abajo, bajan por cada costado y se juntan detras
           en la hebilla. Con el collar, que baja al reves, hacen la X de
           los costados. La izquierda (+x) va mas alta por el costado
           (0,72) que la derecha (0,60).
         · sobre la derecha, el PASADOR envuelto (gris 151) con su N, y
           el aro fino detras
         · la PLACA negra del pecho, con la muesca arriba y dos remaches
         · la HEBILLA de la espalda: placa de cinco lados con argolla y la
           punta en triangulo debajo
         · la CORREITA gris (126) con su hebilla, de la placa al BOLSO de
           la cadera izquierda, con su tapa y la costura en L */
      /* el collar (17 cm de alto): en los costados a 0,88 de centro, detras
         a 0,86, y delante baja en V hasta la placa (0,78): su borde de
         abajo cae de 0,80 a 0,69 junto a ella. De costado baja en
         diagonal hacia delante, y la correa baja al reves: la X. Su
         costura, bajo la placa. */
      const cuello = (ps) => Math.cos(ps) > 0 ? 0.78 + 0.10 * Math.pow(Math.abs(Math.sin(ps)), 2 / 3) : 0.86 + 0.02 * Math.abs(Math.sin(ps));   // de frente, V recta (x ~ |sen|^2/3)
      const anchoC = () => 0.085;
      const psC = (t) => t * U.TAU;
      co({ entera: true, tramo: (t) => { const ps = psC(t), c = cuello(ps), h = anchoC(ps); return [ps, c - h, c + h]; }, grueso: 0.03, hex: BANDA });
      /* Las dos (13 cm, de traves) salen de debajo de la placa y del borde
         del collar, que baja hasta ella, y SUBEN hacia ella en diagonal: la
         derecha, de 0,60 de centro en el costado a 0,725 junto a la placa
         -su borde de abajo sube de 0,535 a 0,66, y el de arriba se mete
         bajo el collar-; la izquierda, 0,735 y 0,70. Detras, las dos
         bajan hacia el centro y se JUNTAN en la hebilla (0,55), afinandose
         al entrar bajo ella: la V de la hoja de espaldas, cerrada arriba
         por el collar. */
      const yR = (ps) => Math.cos(ps) > 0 ? 0.60 + 0.145 * (1 - Math.abs(Math.sin(ps))) : 0.55 + 0.05 * Math.abs(Math.sin(ps));
      const yL = (ps) => 0.67125 + 0.0925 * Math.cos(ps) - 0.02875 * Math.cos(2 * ps);
      const P0 = 0.12, P1 = Math.PI - 0.05;
      const anchoB = (ps) => 0.13 - 0.045 * suave(Math.PI - 0.5, Math.PI - 0.12, Math.abs(ps));
      const psR = (t) => -(P0 + (P1 - P0) * t), psL = (t) => P0 + (P1 - P0) * t;
      co({ camino: (t) => [psR(t), yR(psR(t))], ancho: (t) => anchoB(psR(t)), grueso: 0.013, hex: BANDA });
      co({ camino: (t) => [psL(t), yL(psL(t))], ancho: (t) => anchoB(psL(t)), grueso: 0.0128, hex: BANDA });
      /* EL VENDAJE sobre la correa derecha (gris 151 de la hoja): UNA
         funda abombada, mas ancha que la correa (18 cm), que la envuelve desde
         debajo de la placa hasta los 37 grados, con los cortes de traves
         a la correa: arriba se mete bajo el borde del collar. Encima, la N
         de la hoja: dos cortes de traves entre vuelta y vuelta unidos por la
         diagonal; y en su extremo un aro angosto partido en dos tiras. */
      const MV = 0.09, GV = 0.03, RV = 0.5;                      // medio ancho (18 cm, mas que la correa), grueso y abombado
      // el punto de la funda a 'e' (de -1 a 1) de traves de la correa, en psi
      const deTraves = (ps, e, h) => {
        const y = yR(ps), d = 0.004, m = metrica(F, ps, y);
        let tx = -2 * d * m, ty = yR(ps - d) - yR(ps + d);        // a lo largo, como la funda: hacia atras (psi baja)
        const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
        const y2 = y - tx * e * h;
        return [avanzar(F, ps, y2, ty * e * h), y2];
      };
      const funda = (a, b, h, gr) => co({ camino: (t) => { const ps = a + (b - a) * t; return [ps, yR(ps)]; }, ancho: 2 * h, grueso: gr, redondo: RV, hex: 0x7a7a7a, borde: 0.0045 });
      funda(-0.07, -0.64, MV, GV);
      funda(-0.675, -0.79, MV + 0.004, GV + 0.003);
      if (!silueta) {
        // los trazos siguen la cara abombada
        const trazo = (pa, ea, pb, eb) => {
          co({ camino: (t) => deTraves(pa + (pb - pa) * t, ea + (eb - ea) * t, MV), ancho: 0.0065, borde: 0, hex: NEGRO, sinTinta: true, N: 12,
               grueso: (t) => { const e = ea + (eb - ea) * t; return GV * (RV + (1 - RV) * Math.sqrt(Math.max(0, 1 - e * e))) + 0.0012; } });
        };
        // la N: dos cortes de traves entre vuelta y vuelta, y la diagonal
        trazo(-0.27, -0.97, -0.27, 0.97);
        trazo(-0.50, -0.97, -0.50, 0.97);
        trazo(-0.50, -0.97, -0.27, 0.97);
        // el aro, en dos tiras
        trazo(-0.733, -1.0, -0.733, 1.0);
      }
      // la placa del pecho, con la muesca arriba y dos remaches
      pz({ psi: 0, y: 0.795, d: [0.02, 0.05], hex: 0x151515, borde: 0.008, tinta: true,
           poly: [[-0.058, -0.094], [0.058, -0.094], [0.065, -0.085], [0.065, 0.097], [0.022, 0.097], [0.0, 0.084], [-0.022, 0.097], [-0.065, 0.097], [-0.065, -0.085]] });
      for (const y of [0.812, 0.736]) pz({ psi: 0, y: 0.795, du: -0.008, dv: y - 0.795, d: [0.045, 0.056], hex: 0x5a5a5a, borde: 0.004, poly: circ(0.0125, 14) });
      // la hebilla de la espalda
      pz({ psi: Math.PI, y: 0.555, d: [0.004, 0.026], hex: 0x131313, borde: 0.008, tinta: true,
           poly: [[-0.107, 0], [-0.09, -0.035], [0.09, -0.035], [0.107, 0], [0, 0.067]] });
      pz({ psi: Math.PI, y: 0.522, d: [0.002, 0.018], hex: 0x202020, borde: 0.008, tinta: true, poly: [[-0.07, 0], [0, -0.099], [0.07, 0]] });
      ar({ psi: Math.PI, y: 0.563, r: 0.027, ri: 0.016, d: [0.02, 0.031], hex: NEGRO });
      // la correita al bolso, con su hebillita
      const c0 = [0.22, 0.712], c1 = [0.86, 0.535];
      co({ camino: (t) => [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t], ancho: 0.026, borde: 0.005, hex: 0x606060,
           grueso: (t) => 0.004 + 0.012 * (1 - suave(0.1, 0.2, t)) + 0.061 * suave(0.88, 0.97, t) });
      const tb = 0.12, pb = c0[0] + (c1[0] - c0[0]) * tb, ybk = c0[1] + (c1[1] - c0[1]) * tb;
      const giro = Math.atan2(c1[1] - c0[1], (c1[0] - c0[0]) * metrica(F, pb, ybk));
      pz({ psi: pb, y: ybk, giro, w: 0.036, h: 0.034, d: [0.006, 0.022], hex: 0x8a8a8a, borde: 0.004 });
      pz({ psi: pb, y: ybk, giro, w: 0.02, h: 0.014, d: [0.021, 0.0225], hex: 0x2a2a2a });
      // el bolso: el cuerpo, la tapa encima, la costura en L y la lengueta de la correita
      const psB = 1.4, aB = 0.155;
      al({ psi: psB, y: 0.375, a: aB, b: 0.125, p: 6, alto: 0.05, m: 0.02, borde: 0.009, hex: 0x2a2a2a, tinta: true });
      al({ psi: psB, y: 0.5025, a: aB + 0.004, b: 0.0525, p: 6, alto: 0.062, m: 0.012, borde: 0.01, hex: BANDA, tinta: true });
      const psU = (u) => avanzar(F, psB, 0.38, u);
      for (const [u, y0, y1, u1, yh] of [[-aB + 0.086, 0.44, 0.318, aB - 0.046, 0.31], [-aB + 0.102, 0.44, 0.334, aB - 0.056, 0.326]]) {
        pz({ psi: psU(u), y: (y0 + y1) / 2, pegada: true, w: 0.006, h: y0 - y1 + 0.004, d: [0.048, 0.0515], hex: NEGRO });
        pz({ psi: psU((u + u1) / 2), y: yh + 0.004, pegada: true, w: u1 - u, h: 0.006, d: [0.048, 0.0515], hex: NEGRO });
      }
      const gl = Math.atan2(c1[1] - c0[1], (c1[0] - c0[0]) * metrica(F, c1[0], 0.53));
      pz({ psi: c1[0] + 0.01, y: c1[1] - 0.012, pegada: true, giro: gl + Math.PI / 2, d: [0.058, 0.068], hex: 0x2a2a2a, borde: 0.006,
           poly: [[-0.02, 0.018], [-0.03, -0.02], [0.03, -0.02], [0.02, 0.018]] });
    }

    if (F2.traje === 'agente3') {
      /* LA BANDOLERA (su hoja de vueltas, gris 39): 6,5 cm de ancho, por
         encima del hombro derecho (-x: lo mas alto, 0,95, un poco por
         delante del costado, con la hebilla) a la cadera izquierda (+x:
         lo mas bajo, 0,50, un poco por detras, donde se despega un poco
         del cuerpo); por delante y por detras cuelga mas alta que una
         elipse (0,81): lo que pesa, a la cadera.
         Su HEBILLA, en lo alto del hombro: un marco rectangular gris de
         cuatro barras (8,5 cm a lo largo, 9 de traves: mas ancho que la
         correa, que pasa por dentro), y el OJAL un poco mas adelante. */
      const yb2 = (ps) => 0.7675 - 0.235 * Math.sin(ps - 0.26) + 0.0425 * Math.cos(2 * ps - 0.52) - 0.0547 * Math.cos(ps) -
                          0.04 * Math.exp(-Math.pow(ps / 0.7, 2));      // delante pasa bajo el nudo, sobre la corbata
      const pH = -1.25, psT = (t) => pH + t * U.TAU;       // la costura del lazo, bajo la hebilla
      co({ entera: true, camino: (t) => [psT(t), yb2(psT(t))], ancho: 0.065, borde: 0.008, hex: 0x1e1e1e,
           grueso: (t) => { const da = ((psT(t) - 1.83) % U.TAU + U.TAU + Math.PI) % U.TAU - Math.PI; return 0.013 + 0.012 * Math.exp(-Math.pow(da / 0.45, 2)); } });
      const yH = yb2(pH);
      const giro = Math.atan2(yb2(pH + 0.01) - yb2(pH - 0.01), 0.02 * metrica(F, pH, yH));
      const barra = (w, h, du, dv) => pz({ psi: pH, y: yH, giro, du, dv, w, h, d: [0.008, 0.024], hex: 0x757575, borde: 0.003, tinta: true });
      barra(0.085, 0.011, 0, 0.0395); barra(0.085, 0.011, 0, -0.0395);
      barra(0.011, 0.09, 0.037, 0); barra(0.011, 0.09, -0.037, 0);
      const pO = avanzar(F, pH, yH, 0.05), yO = yb2(pO);
      pz({ psi: pO, y: yO, giro, d: [0.01, 0.0175], hex: 0x757575, borde: 0.004, poly: circ(0.016, 16).map(([u, v]) => [u, v * 0.66]) });
      pz({ psi: pO, y: yO, giro, d: [0.0175, 0.019], hex: NEGRO, poly: circ(0.008, 12).map(([u, v]) => [u, v * 0.5]) });
    }
  }

  /* LAS PRENDAS: la tela (color del torso) y lo que lleva encima. El
     traje del SWF mide 51 de gris contra los 153 del civ; aqui el peto
     del grunt va a 118, asi que el traje va a 118 x 51/153 = 39. Lo de
     encima, en la misma proporcion (x 0,765). La camisa, BLANCA: en la
     hoja 255 contra los 204 de la piel (x 1,25 del tono de la cabeza). */
  const TELA_AGENTE = 0x272727, CAMISA = 0xf5f5f5;
  const MODELOS = {
    agent:  { nombre: 'Traje de agente', tela: TELA_AGENTE, detalle: 'agente', camisa: CAMISA },
    agent2: { nombre: 'Traje de agente Mk1', tela: TELA_AGENTE, detalle: 'agente2', camisa: CAMISA },
    agent3: { nombre: 'Traje de agente Mk0', tela: TELA_AGENTE, detalle: 'agente3', camisa: CAMISA }
  };
  Ropa.MODELOS = MODELOS;
  Ropa.tela = (id) => (MODELOS[id] ? MODELOS[id].tela : 0x767673);
  /* La ropa va ADELANTADA como la tinta del torso (0,12 m, con la misma
     rampa): si no, esa tinta -que se adelanta para ir por encima de lo
     que tiene detras- le pasaba por delante donde la ropa llega a la
     silueta, y cruzaba el collar, el bolso o la hebilla con una raya. Su
     propia tinta no se adelanta (ver chars.js). */
  Ropa.ADELANTO = 0.12;
  /* Hasta donde sube la tela: por encima asoma la piel (chars.js). El
     saco, desde 0,915 (encima, su cuello tapa hasta donde llega); el arnes,
     por debajo del borde del collar y de la placa. */
  Ropa.corte = (id) => (id === 'agent2' ? 0.885 : 0.915);
  /* Pone la prenda 'id' en B, con el hueso del torso ya elegido. A es
     el ancho del torso de quien la lleva. */
  Ropa.construir = function (B, id, g, silueta, A) {
    const m = MODELOS[id];
    if (!m) return B;
    traje(B, { traje: m.detalle, camisa: m.camisa, tela: m.tela }, g || 0, !!silueta, A);
    return B;
  };

  /* El plano tangente del torso (marco) en coordenadas del personaje, para
     lo que se cuelga de el sin ser ropa (las armas enfundadas, actor.js).
     k: el ancho de la ficha (F.ancho, el soldat es mas corpulento). */
  Ropa.marcoTorso = function (k, psi, y) {
    return marco(filasTorso(Chars.ANCHO_TORSO * (k || 1)), psi, y);
  };

  global.Ropa = Ropa;
})(window);

