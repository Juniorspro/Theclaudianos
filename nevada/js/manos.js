/* =============================================================
   LAS MANOS 3D, CALCADAS DEL SWF

   Cada dibujo de mano del SWF (A..H: puño de frente y de dorso, mano
   abierta, las dos que empuñan y las de apoyo) se modela con el MISMO
   pipeline que las armas (tools/swf_modelos/modelar.py): piezas por
   zona de color soldadas por Voronoi, respaldo de tinta con la forma
   exacta del trazo y el dibujo proyectado encima. De frente cada mano
   es el sprite del SWF al pixel.

   Lo propio de una mano (ficha en modelar_manos.py):
     - bisel en LENTE: hacia dentro lo que cabe en cada vertice (su
       alcance, medido) y en profundidad hasta el medio del grueso:
       volumen redondo, no una tabla (G22, G25);
     - respaldo biselado igual que la pieza mas el trazo (G23);
     - un ARO: el trazo de fuera, plano, sobre la cara de delante y la
       de atras. De lado marca donde acaba la cara y empieza el
       costado: las lineas de profundidad (G26).

   Donde va cada mano lo dicen las matrices del SWF (manos.py): en el
   hueso de cada pose -ajustada a la pose del personaje- y pegada a
   cada arma con sus dos caras: la de fuera (el dorso, *_front del SWF)
   y la de dentro (los dedos y la palma, *_back); se enseña la que el
   angulo real pone a camara (Weapons.caraManos, M24). La mano libre
   enseña a camara los nudillos (M18).
   ============================================================= */
(function (global) {
  'use strict';

  const D = global.MANOS_SWF;
  const Manos = { datos: D };

  /* La piel de cada personaje, por su handType del SWF
     (CharacterGenerator): Grunt civ; Agent, Mk0 y Mk1 agent; Fatboy
     no tiene piel propia y usa civ; Hank la suya, el guante oscuro
     con las yemas blancas. */
  Manos.PIEL = { grunt: 'civ', agente: 'agent', agenteClasico: 'agent', agenteMk0: 'agent',
                 soldat: 'agent', hank: 'hank' };
  Manos.pielDe = (tipo) => Manos.PIEL[tipo] || Manos.PIEL[global.Chars && Chars.base ? Chars.base(tipo) : tipo] || 'civ';

  const _mats = Object.create(null);
  Manos.material = function (piel) {
    if (!_mats[piel]) {
      const tex = new THREE.TextureLoader().load(D.tex[piel] || D.tex.civ);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      _mats[piel] = Art.aplicarEscalonesMundo(new THREE.MeshBasicMaterial({ vertexColors: true, map: tex }));
    }
    return _mats[piel];
  };

  /* Cada dibujo de mano, modelado como las armas -piezas soldadas,
     respaldo de tinta con la forma exacta del trazo del SWF, el dibujo
     proyectado- por el MISMO extrusor (Weapons.construirModelo). Una
     geometria por dibujo, en su marco: (z, y) del dibujo y x el grueso. */
  const _mod = Object.create(null);
  function modelo(L, tinta) {
    const k = L + (tinta ? '#t' : '');
    if (!_mod[k]) _mod[k] = global.Weapons.construirModelo(D.mod[L], tinta);
    return _mod[k];
  }

  /* LA OTRA CARA DE UNA POSE DEL HUESO: el dibujo 'o' de la pose q (el B
     del reposo, hand_back) donde lo pone el SWF. manos.py guarda de cada
     mano la matriz del dibujo visible P y Q = inv(Mo) . Mv, la que lleva
     px del visible a px del otro; asi que la del otro es Mo = P . inv(Q)
     (matrices de Flash: a b c d tx ty). */
  const _reves = [];
  const mulM = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
                          m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
                          m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const invM = (m) => {
    const det = m[0] * m[3] - m[1] * m[2];
    const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
    return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
  };
  Manos.reves = function (q) {
    if (!_reves[q]) {
      const v = D.poses[q].d;
      _reves[q] = { g: v.o, o: v.g, P: mulM(v.P, invM(v.Q)), lado: v.lado, T: v.T };
    }
    return _reves[q];
  };

  /* Pone una mano en el constructor B.

       inst   {g, P, lado}: el dibujo, la matriz que lleva sus px del SWF
              al marco (metros) y hacia donde mira su cara en el eje de
              profundidad.
       marco  'hueso' -> (a, b) es (X, Y) y la profundidad Z
              'arma'  -> (a, b) es (Z, Y) y la profundidad X
       tinta  si se da, va el respaldo negro en vez del color.

     El marco del modelo es el del dibujo girado: (z, y) = K (y, x) en px
     del SWF, y la cara con el dibujo tal cual es la -x. */
  Manos.meter = function (B, inst, marco, tinta, hex) {
    if (tinta) {
      volcar(B, modelo(inst.g, true), inst, marco, hex || 0, 0);
    } else {
      volcar(B, modelo(inst.g, false), inst, marco, null, 0);
    }
    return B;
  };

  const _M = new Float64Array(9);
  function volcar(B, G, inst, marco, negro, infla) {
    const P = inst.P, K = D.K, s = -inst.lado;
    // columnas: lo que aporta x, y, z del modelo a (a, b, profundidad)
    let ax = 0, ay = P[0] / K, az = P[2] / K;
    let bx = 0, by = P[1] / K, bz = P[3] / K;
    const sd = inst.sd || 1;                              // estirado en el grueso: envolver la culata
    let dx = s * sd, dy = 0, dz = 0;
    // al marco final
    const M = _M;
    if (marco === 'arma') {        // (x, y, z) = (d, b, a)
      M[0] = dx; M[1] = dy; M[2] = dz; M[3] = bx; M[4] = by; M[5] = bz; M[6] = ax; M[7] = ay; M[8] = az;
    } else {                        // (x, y, z) = (a, b, d)
      M[0] = ax; M[1] = ay; M[2] = az; M[3] = bx; M[4] = by; M[5] = bz; M[6] = dx; M[7] = dy; M[8] = dz;
    }
    const tx = marco === 'arma' ? 0 : P[4], ty = P[5], tz = marco === 'arma' ? P[4] : 0;
    const det = M[0] * (M[4] * M[8] - M[5] * M[7]) - M[1] * (M[3] * M[8] - M[5] * M[6]) +
                M[2] * (M[3] * M[7] - M[4] * M[6]);

    const pos = G.attributes.position.array, nor = G.attributes.normal.array;
    const col = G.attributes.color.array, uvA = G.attributes.uv ? G.attributes.uv.array : null;
    const idx = G.index.array;
    const r = D.rect[inst.g];
    const base = new Int32Array(pos.length / 3).fill(-1);
    const neg = negro !== null ? B._rgb(negro, 1) : null;
    const emite = (i) => {
      if (base[i] < 0) {
        const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
        const nx = nor[i * 3], ny = nor[i * 3 + 1], nz = nor[i * 3 + 2];
        const X = M[0] * x + M[1] * y + M[2] * z + tx + (infla ? infla * (M[0] * nx + M[1] * ny + M[2] * nz) : 0);
        const Y = M[3] * x + M[4] * y + M[5] * z + ty + (infla ? infla * (M[3] * nx + M[4] * ny + M[5] * nz) : 0);
        const Z = M[6] * x + M[7] * y + M[8] * z + tz + (infla ? infla * (M[6] * nx + M[7] * ny + M[8] * nz) : 0);
        // la matriz es un giro o reflejo del SWF por el estirado sd en el
        // grueso: la normal va con la inversa traspuesta (la x entre sd^2
        // deja, tras la matriz, la parte del grueso dividida por sd)
        const nxs = nx / (sd * sd);
        let NX = M[0] * nxs + M[1] * ny + M[2] * nz;
        let NY = M[3] * nxs + M[4] * ny + M[5] * nz;
        let NZ = M[6] * nxs + M[7] * ny + M[8] * nz;
        const L = Math.hypot(NX, NY, NZ) || 1;
        NX /= L; NY /= L; NZ /= L;
        /* La luz, respecto de la cara que se ve: la mano de un lado y la
           del otro de un arma se iluminan igual (con la del marco del arma
           una salia un escalon mas oscura). Solo sirve con el constructor
           sin transformacion, que es como se usa. */
        const la = (ay * ny + az * nz), lb = (by * ny + bz * nz), ld = s * nx / sd;
        const lz = Math.hypot(la, lb, ld) || 1;
        const luz = U.luzDe(la / lz, lb / lz, (ld / lz) * inst.lado);
        const c = neg || [col[i * 3], col[i * 3 + 1], col[i * 3 + 2]];
        base[i] = B._vert(X, Y, Z, NX, NY, NZ, c[0], c[1], c[2], neg ? undefined : luz);
        if (B.uv && !neg) {
          const u = uvA ? uvA[i * 2] : 0, v = uvA ? uvA[i * 2 + 1] : 0;
          B.uv.push((r[0] + u * r[2]) / D.W, 1 - (r[1] + (1 - v) * r[3]) / D.H);
        }
      }
      B.idx.push(base[i]);
    };
    for (let f = 0; f < idx.length; f += 3) {
      if (det > 0) { emite(idx[f]); emite(idx[f + 1]); emite(idx[f + 2]); }
      else { emite(idx[f]); emite(idx[f + 2]); emite(idx[f + 1]); }
    }
  }

  global.Manos = Manos;
})(window);

