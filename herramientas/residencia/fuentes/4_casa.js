/* ================================================================ la casa: todo sale de estas tablas
   x a la derecha, z hacia el fondo (el frente mira a la calle, en -z), y arriba. Metros.
   Planta baja de 0 a 3,0; losa de 3,0 a 3,2; planta alta de 3,2 a 6,0; techo a dos aguas arriba. */
const PISO1 = 3.2, TECHO0 = 3.0, TECHO1 = 6.0, GROSOR = 0.2;
const SALAS = [
  {id:'living',   piso:0, x0:-7, x1:-2, z0:-5,  z1:0,   suelo:'alfombra',      pared:'pared',          nombre:'LIVING'},
  {id:'hall',     piso:0, x0:-2, x1:2,  z0:-5,  z1:2.4, suelo:'maderaPiso',    pared:'pared',          nombre:'ENTRADA'},
  {id:'cocina',   piso:0, x0:2,  x1:7,  z0:-5,  z1:0,   suelo:'damero',        pared:'paredCocina',    nombre:'COCINA'},
  {id:'cuarto',   piso:0, x0:-7, x1:-2, z0:0,   z1:5,   suelo:'alfombraBeige', pared:'empapelado',     nombre:'DORMITORIO'},
  {id:'bano',     piso:0, x0:-2, x1:0.5, z0:2.4, z1:5,  suelo:'azulejo',       pared:'azulejoPared',   nombre:'BAÑO'},
  {id:'lavadero', piso:0, x0:0.5, x1:2, z0:2.4, z1:5,   suelo:'damero',        pared:'paredCocina',    nombre:'LAVADERO'},
  {id:'comedor',  piso:0, x0:2,  x1:7,  z0:0,   z1:5,   suelo:'maderaClara',   pared:'empapeladoRojo', nombre:'COMEDOR'},
  {id:'master',   piso:1, x0:-7, x1:-2, z0:-5,  z1:0,   suelo:'alfombraRoja',  pared:'pared',          nombre:'DORMITORIO GRANDE'},
  {id:'pasillo',  piso:1, x0:-2, x1:2,  z0:-5,  z1:5,   suelo:'maderaPiso',    pared:'pared',          nombre:'PASILLO DE ARRIBA'},
  {id:'nene',     piso:1, x0:2,  x1:7,  z0:-5,  z1:0,   suelo:'alfombraVerde', pared:'empapeladoNene', nombre:'CUARTO DEL NENE'},
  {id:'bano2',    piso:1, x0:-7, x1:-2, z0:0,   z1:5,   suelo:'azulejo',       pared:'azulejoPared',   nombre:'BAÑO DE ARRIBA'},
  {id:'deposito', piso:1, x0:2,  x1:7,  z0:0,   z1:5,   suelo:'maderaPiso',    pared:'paredVerde',     nombre:'DEPÓSITO'}
];
/* metros por repetición de cada textura de piso y de pared (la baldosa del baño mide 15 cm, la tacha 33) */
const ESC_TEX = {alfombra:0.66, alfombraRoja:0.66, alfombraVerde:0.66, alfombraBeige:0.66, damero:0.6, azulejo:0.6, maderaPiso:0.9, maderaClara:0.9,
  pared:2.5, paredCocina:2.5, paredVerde:2.5, empapelado:2.0, empapeladoRojo:1.3, empapeladoNene:1.3, azulejoPared:0.9, paredExt:2.5};
const SALA = Object.fromEntries(SALAS.map(s => [s.id, s]));
/* la escalera sube hacia el fondo por el costado derecho de la entrada */
const ESC = {x0:0.8, x1:2.0, z0:-3.2, z1:1.6};
const rampa = z => lim((z - ESC.z0)/(ESC.z1 - ESC.z0), 0, 1)*PISO1;
function salaEn(x, z, piso){ for(const s of SALAS) if(s.piso === piso && x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) return s; return null; }

/* las paredes: líneas con sus huecos. eje 'x': la pared corre en x (z fijo). t0,t1 a lo largo de la pared */
const VENTANAS = [
  {id:'v_living_f',  piso:0, eje:'x', f:-5, c:-4.5, w:1.5, sala:'living',  n:[0, -1]},
  {id:'v_living_s',  piso:0, eje:'z', f:-7, c:-2.5, w:1.5, sala:'living',  n:[-1, 0]},
  {id:'v_cocina_f',  piso:0, eje:'x', f:-5, c:4.5,  w:1.5, sala:'cocina',  n:[0, -1]},
  {id:'v_cocina_s',  piso:0, eje:'z', f:7,  c:-2.5, w:1.5, sala:'cocina',  n:[1, 0]},
  {id:'v_cuarto_b',  piso:0, eje:'x', f:5,  c:-4.5, w:1.5, sala:'cuarto',  n:[0, 1]},
  {id:'v_cuarto_s',  piso:0, eje:'z', f:-7, c:2.5,  w:1.5, sala:'cuarto',  n:[-1, 0]},
  {id:'v_comedor_b', piso:0, eje:'x', f:5,  c:4.5,  w:1.5, sala:'comedor', n:[0, 1]},
  {id:'v_comedor_s', piso:0, eje:'z', f:7,  c:2.5,  w:1.5, sala:'comedor', n:[1, 0]},
  {id:'v_bano_b',    piso:0, eje:'x', f:5,  c:-0.8, w:0.9, sala:'bano',    n:[0, 1], chica:true},
  {id:'v_master_f',  piso:1, eje:'x', f:-5, c:-4.5, w:1.5, sala:'master',  n:[0, -1]},
  {id:'v_nene_f',    piso:1, eje:'x', f:-5, c:4.5,  w:1.5, sala:'nene',    n:[0, -1]},
  {id:'v_bano2_s',   piso:1, eje:'z', f:-7, c:2.5,  w:1.2, sala:'bano2',   n:[-1, 0]},
  {id:'v_deposito_b',piso:1, eje:'x', f:5,  c:4.5,  w:1.5, sala:'deposito',n:[0, 1]}
];
const PUERTAS = [
  {id:'p_frente',   piso:0, eje:'x', f:-5, c:0.25, w:1.0, ext:true, sala:'hall', n:[0, -1]},
  {id:'p_fondo',    piso:0, eje:'x', f:5,  c:1.25, w:1.0, ext:true, sala:'lavadero', n:[0, 1]},
  {id:'p_cocina',   piso:0, eje:'z', f:2,  c:-4.1, w:1.0},
  {id:'p_cuarto',   piso:0, eje:'z', f:-2, c:1.4,  w:1.0},
  {id:'p_bano',     piso:0, eje:'x', f:2.4, c:-1.05, w:0.9},
  {id:'p_master',   piso:1, eje:'z', f:-2, c:-0.9, w:1.0},
  {id:'p_bano2',    piso:1, eje:'z', f:-2, c:2.2,  w:1.0},
  {id:'p_nene',     piso:1, eje:'z', f:2,  c:-4.2, w:1.0},
  {id:'p_deposito', piso:1, eje:'z', f:2,  c:3.2,  w:1.0}
];
const ARCOS = [
  {piso:0, eje:'z', f:-2, c:-2.4, w:1.3},       /* living ↔ entrada */
  {piso:0, eje:'x', f:0,  c:5.0,  w:1.2}        /* cocina ↔ comedor */
];
/* las líneas de pared (cada una va de a0 a a1 a lo largo de su eje) */
const PAREDES = [];
for(const p of [0, 1]){
  PAREDES.push({piso:p, eje:'x', f:-5, a0:-7.1, a1:7.1, ext:true}, {piso:p, eje:'x', f:5, a0:-7.1, a1:7.1, ext:true},
               {piso:p, eje:'z', f:-7, a0:-5, a1:5, ext:true}, {piso:p, eje:'z', f:7, a0:-5, a1:5, ext:true},
               {piso:p, eje:'z', f:-2, a0:-4.9, a1:4.9}, {piso:p, eje:'x', f:0, a0:-6.9, a1:-2.1});
}
PAREDES.push({piso:0, eje:'z', f:2, a0:-4.9, a1:4.9}, {piso:0, eje:'x', f:0, a0:2.1, a1:6.9}, {piso:0, eje:'x', f:2.4, a0:-1.9, a1:0.5}, {piso:0, eje:'z', f:0.5, a0:2.5, a1:4.9},
  {piso:1, eje:'z', f:2, a0:-4.9, a1:4.9}, {piso:1, eje:'x', f:0, a0:2.1, a1:6.9});

/* ================================================================ lo que se construye y se registra */
const MUNDO = {grupo:null, colisiones:[[], []], puertas:{}, ventanas:{}, luces:[], interactivos:[], placards:{}, camaras:[], raices:{}, dinamicos:[]};
const COL = MUNDO.colisiones;
function colision(piso, x0, x1, z0, z1, o){ const c = Object.assign({x0:Math.min(x0, x1), x1:Math.max(x0, x1), z0:Math.min(z0, z1), z1:Math.max(z0, z1)}, o || {}); COL[piso].push(c); return c; }
const alturaPiso = p => p ? PISO1 : 0, altoPiso = p => p ? TECHO1 - PISO1 : TECHO0;
function matPared(x, z, piso){ const s = salaEn(x, z, piso); return s ? s.pared : 'paredExt'; }

/* una pared hecha de dos medias paredes (una por lado, cada una con el material de su cuarto), con sus huecos */
function construirPared(L){
  const y0 = alturaPiso(L.piso), H = altoPiso(L.piso), huecos = [];
  /* sólo los huecos de este tramo de pared: dos paredes pueden compartir la línea (la de z = 0 va partida por el hall) */
  const mismo = (o, eje, f) => o.piso === L.piso && o.eje === eje && Math.abs(o.f - f) < 0.01 && o.c > L.a0 && o.c < L.a1;
  for(const v of VENTANAS) if(mismo(v, L.eje, L.f)) huecos.push({t0:v.c - v.w/2, t1:v.c + v.w/2, y0:v.chica ? 1.35 : 0.95, y1:v.chica ? 2.15 : 2.35, tipo:'v', ref:v});
  for(const d of PUERTAS) if(mismo(d, L.eje, L.f)) huecos.push({t0:d.c - d.w/2, t1:d.c + d.w/2, y0:0, y1:2.15, tipo:'p', ref:d});
  for(const a of ARCOS) if(mismo(a, L.eje, L.f)) huecos.push({t0:a.c - a.w/2, t1:a.c + a.w/2, y0:0, y1:2.3, tipo:'a'});
  huecos.sort((a, b) => a.t0 - b.t0);
  /* cada tramo: macizo entre huecos, y arriba/abajo de cada hueco */
  const tramos = []; let t = L.a0;
  for(const h of huecos){ if(h.t0 > t) tramos.push({t0:t, t1:h.t0, y0:0, y1:H}); if(h.y0 > 0) tramos.push({t0:h.t0, t1:h.t1, y0:0, y1:h.y0}); tramos.push({t0:h.t0, t1:h.t1, y0:h.y1, y1:H}); t = h.t1; }
  if(t < L.a1) tramos.push({t0:t, t1:L.a1, y0:0, y1:H});
  /* cada tramo se corta donde cambia el cuarto de cada lado (si no, el baño se queda con el empapelado del dormitorio) */
  const cortes = [...new Set(SALAS.filter(q => q.piso === L.piso).flatMap(q => L.eje === 'x' ? [q.x0, q.x1] : [q.z0, q.z1]))].sort((a, b) => a - b), piezas = [];
  for(const s0 of tramos){ let a = s0.t0; for(const c of cortes) if(c > a + 0.01 && c < s0.t1 - 0.01){ piezas.push({t0:a, t1:c, y0:s0.y0, y1:s0.y1}); a = c; } piezas.push({t0:a, t1:s0.t1, y0:s0.y0, y1:s0.y1}); }
  for(const s of piezas){ const largo = s.t1 - s.t0, alto = s.y1 - s.y0; if(largo < 0.01 || alto < 0.01) continue;
    const tm = (s.t0 + s.t1)/2, ym = y0 + (s.y0 + s.y1)/2;
    for(const lado of [-1, 1]){ const off = lado*GROSOR/4;
      const x = L.eje === 'x' ? tm : L.f + off, z = L.eje === 'x' ? L.f + off : tm;
      const px = L.eje === 'x' ? tm : L.f + lado*0.5, pz = L.eje === 'x' ? L.f + lado*0.5 : tm, mat = matPared(px, pz, L.piso);
      if(L.eje === 'x') caja(mat, x, ym, z, largo, alto, GROSOR/2, 0xffffff, {tex:ESC_TEX[mat] || 2.5}); else caja(mat, x, ym, z, GROSOR/2, alto, largo, 0xffffff, {tex:ESC_TEX[mat] || 2.5}); } }
  /* colisión: la pared entera menos las puertas y los arcos (las ventanas no se cruzan) */
  let c = L.a0; const pasos = huecos.filter(h => h.tipo !== 'v');
  for(const h of pasos){ if(h.t0 > c) colPared(L, c, h.t0); c = h.t1; }
  if(c < L.a1) colPared(L, c, L.a1);
  /* adentro: el zócalo de madera y la sombra del rincón en el piso (se cortan en las puertas), la moldura y la sombra del cielorraso */
  const T = (a, b, off) => L.eje === 'x' ? [a, L.f + off, b, L.f + off] : [L.f + off, a, L.f + off, b];
  for(const lado of [-1, 1]){ let c2 = L.a0; const cara = lado*GROSOR/2, nx = L.eje === 'x' ? 0 : lado, nz = L.eje === 'x' ? lado : 0;
    for(const h of pasos.concat([{t0:L.a1, t1:L.a1}])){ if(h.t0 > c2 + 0.05){ const px = L.eje === 'x' ? (c2 + h.t0)/2 : L.f + lado*0.5, pz = L.eje === 'x' ? L.f + lado*0.5 : (c2 + h.t0)/2, s = salaEn(px, pz, L.piso);
        if(s){ const off = lado*(GROSOR/2 + 0.015), l = h.t0 - c2, col = s.pared === 'azulejoPared' ? 0xd8d8d4 : 0x4a2c16;
          if(L.eje === 'x') caja('madera', (c2 + h.t0)/2, y0 + 0.07, L.f + off, l, 0.14, 0.03, col); else caja('madera', L.f + off, y0 + 0.07, (c2 + h.t0)/2, 0.03, 0.14, l, col);
          const [ax, az, bx, bz] = T(c2, h.t0, cara + lado*0.03); franja(ax, az, bx, bz, nx, nz, 0.34, y0 + 0.019); } }
      c2 = h.t1; }
    /* arriba, de punta a punta: la moldura blanca y la sombra que deja en el techo */
    const pm = L.eje === 'x' ? [(L.a0 + L.a1)/2, L.f + lado*0.5] : [L.f + lado*0.5, (L.a0 + L.a1)/2], sm = salaEn(pm[0], pm[1], L.piso);
    if(sm && !(L.piso === 0 && sm.id === 'hall' && L.eje === 'z' && L.f === 2)){ const off = lado*(GROSOR/2 + 0.02), l = L.a1 - L.a0, ym = y0 + H - 0.06;
      if(L.eje === 'x') caja('techo', (L.a0 + L.a1)/2, ym, L.f + off, l, 0.12, 0.05, 0xf4f0e6, {fuera:0}); else caja('techo', L.f + off, ym, (L.a0 + L.a1)/2, 0.05, 0.12, l, 0xf4f0e6, {fuera:0});
      const [ax, az, bx, bz] = T(L.a0, L.a1, cara + lado*0.045); franja(ax, az, bx, bz, nx, nz, 0.4, y0 + H - 0.004); } }
  return huecos;
}
function colPared(L, a, b){ const g = GROSOR/2 + 0.02; if(L.eje === 'x') colision(L.piso, a, b, L.f - g, L.f + g); else colision(L.piso, L.f - g, L.f + g, a, b); }

/* el marco escalonado de las ventanas, como en el juego: tablones marrones con el dintel en escalones */
function marcoVentana(v, h){
  const y0 = alturaPiso(v.piso), [nx, nz] = v.n, w = v.w, sy0 = y0 + h.y0, sy1 = y0 + h.y1, col = 0x7a3e1c;
  const P = (t, o) => v.eje === 'x' ? [v.c + t, v.f + nz*o] : [v.f + nx*o, v.c + t];
  for(const o of [0.13, -0.13]){                       /* afuera y adentro */
    const [ax, az] = P(0, o), ancho = w + 0.36;
    const cajaEje = (t, y, ww, hh, dd) => { const [x, z] = P(t, o); if(v.eje === 'x') caja('madera', x, y, z, ww, hh, dd, col, {tex:1}); else caja('madera', x, y, z, dd, hh, ww, col, {tex:1}); };
    cajaEje(0, sy0 - 0.08, ancho, 0.16, 0.08);                                     /* alféizar */
    cajaEje(-w/2 - 0.09, (sy0 + sy1)/2, 0.18, sy1 - sy0, 0.07); cajaEje(w/2 + 0.09, (sy0 + sy1)/2, 0.18, sy1 - sy0, 0.07);
    cajaEje(0, sy1 + 0.09, ancho, 0.18, 0.07);                                     /* dintel en escalones */
    cajaEje(0, sy1 + 0.27, w*0.7, 0.18, 0.07); cajaEje(0, sy1 + 0.43, w*0.36, 0.14, 0.07);
  }
  const [cx, cz] = P(0, 0); return {cx, cz, sy0, sy1};
}

function construirCasa(){
  const G = new THREE.Group(); MUNDO.grupo = G;
  /* los pisos de cada cuarto, las losas y los cielorrasos */
  for(const s of SALAS){ const y = alturaPiso(s.piso), w = s.x1 - s.x0, d = s.z1 - s.z0;
    caja(s.suelo, (s.x0 + s.x1)/2, y - 0.035, (s.z0 + s.z1)/2, w, 0.1, d, 0xffffff, {tex:ESC_TEX[s.suelo] || 0.9, fuera:0});
    const techo = s.piso ? TECHO1 : TECHO0;
    if(s.piso === 1 || !(s.id === 'hall')) caja('techo', (s.x0 + s.x1)/2, techo + 0.03, (s.z0 + s.z1)/2, w, 0.06, d, 0xffffff, {tex:3, fuera:0});
  }
  /* el cielorraso de la entrada tiene el hueco de la escalera */
  caja('techo', 0, TECHO0 + 0.03, (-5 + ESC.z0)/2, 4, 0.06, ESC.z0 + 5, 0xffffff, {tex:3, fuera:0});
  caja('techo', (-2 + ESC.x0)/2, TECHO0 + 0.03, (ESC.z0 + 2.4)/2, ESC.x0 + 2, 0.06, 2.4 - ESC.z0, 0xffffff, {tex:3, fuera:0});
  caja('techo', 1.4, TECHO0 + 0.03, (ESC.z1 + 2.4)/2, 1.2, 0.06, 2.4 - ESC.z1, 0xffffff, {tex:3, fuera:0});
  /* la losa entre pisos, con el hueco de la escalera */
  const losa = (x0, x1, z0, z1) => caja('techo', (x0 + x1)/2, TECHO0 + 0.12, (z0 + z1)/2, x1 - x0, 0.12, z1 - z0, 0xb8b0a0, {tex:3, fuera:0});
  losa(-7, ESC.x0, -5, 5); losa(ESC.x1, 7, -5, 5); losa(ESC.x0, ESC.x1, -5, ESC.z0); losa(ESC.x0, ESC.x1, ESC.z1, 5);
  /* la planta baja: losa de hormigón que asoma */
  caja('vereda', 0, -0.15, 0, 14.6, 0.3, 10.6, 0xb0aaa0, {tex:2});
  /* las paredes con sus huecos; las ventanas guardan el marco */
  for(const L of PAREDES){ const hs = construirPared(L); for(const h of hs) if(h.tipo === 'v') h.ref.hueco = h; }
  /* el techo a dos aguas y los hastiales */
  const alero = 0.5, cumbre = 2.5, largo = 14 + alero*2, ancho = 5 + alero, ang = Math.atan2(cumbre, 5), lad = Math.hypot(5 + alero, cumbre + alero*cumbre/5);
  for(const s of [-1, 1]) caja('tejas', 0, TECHO1 + cumbre/2 + 0.05 - 0.1, s*(5 + alero)/2, largo, 0.18, lad, 0xffffff, {rx:s*ang, tex:1.5, fuera:1});
  for(const sx of [-7, 7]) for(let i = 0; i < 10; i++){ const t = i/10, hz = 5*(1 - t) - 0.02; caja('paredExt', sx, TECHO1 + cumbre*t + cumbre/20, 0, GROSOR, cumbre/10, hz*2, 0xffffff, {tex:2.5, fuera:1}); }
  caja('techo', 0, TECHO1 + 0.08, 0, 14, 0.1, 10, 0xd0c8b8, {tex:3});
  /* las ventanas: marco, vidrio (se rompe) y tres tablas escondidas (se clavan de a una) */
  for(const v of VENTANAS){ const h = v.hueco, m = marcoVentana(v, h), y0 = alturaPiso(v.piso);
    const vid = new THREE.Mesh(new THREE.PlaneGeometry(v.w, h.y1 - h.y0), MAT.vidrio.clone()); vid.position.set(m.cx, y0 + (h.y0 + h.y1)/2, m.cz);
    vid.rotation.y = v.eje === 'x' ? 0 : Math.PI/2; vid.renderOrder = 5; G.add(vid);
    const tablas = [], r = mulberry(v.id.length*97 + v.c*13);
    for(let i = 0; i < 3; i++){ const tg = new THREE.Mesh(new THREE.BoxGeometry(v.w + 0.5, 0.26, 0.07), MAT.tabla); const ym = y0 + h.y0 + (h.y1 - h.y0)*(0.22 + i*0.3);
      const o = -0.2; tg.position.set(v.eje === 'x' ? v.c : v.f + v.n[0]*o, ym, v.eje === 'x' ? v.f + v.n[1]*o : v.c);
      tg.rotation.set(0, v.eje === 'x' ? 0 : Math.PI/2, (r() - 0.5)*0.5); tg.visible = false; G.add(tg); tablas.push(tg); }
    const adentro = [m.cx - v.n[0]*0.7, m.cz - v.n[1]*0.7], afuera = [m.cx + v.n[0]*1.0, m.cz + v.n[1]*1.0];
    MUNDO.ventanas[v.id] = Object.assign(v, {vidrio:true, mVidrio:vid, tablas:0, mTablas:tablas, hp:0, pos:[m.cx, y0 + (h.y0 + h.y1)/2, m.cz], adentro, afuera, sy0:m.sy0, sy1:m.sy1, rota:false, golpes:0});
  }
  /* las puertas: una hoja con bisagra; las de afuera tienen llave */
  for(const d of PUERTAS){ const y0 = alturaPiso(d.piso), piv = new THREE.Group(), hoja = new THREE.Group();
    const bx = d.eje === 'x' ? d.c - d.w/2 : d.f, bz = d.eje === 'x' ? d.f : d.c - d.w/2;
    piv.position.set(bx, y0, bz); piv.rotation.y = d.eje === 'x' ? 0 : -Math.PI/2; G.add(piv); piv.add(hoja);
    const mh = new THREE.Mesh(new THREE.BoxGeometry(d.w - 0.04, 2.12, 0.07), MAT.madera); conFuera(mh.geometry, d.ext ? 0.5 : 0); tintar(mh.geometry, d.ext ? 0x6e2e14 : 0x7a4a26);
    mh.position.set(d.w/2, 1.06, 0); hoja.add(mh);
    for(const [py, ph] of [[1.55, 0.6], [0.55, 0.7]]){ const pn = new THREE.Mesh(new THREE.BoxGeometry(d.w*0.62, ph, 0.09), MAT.madera); conFuera(pn.geometry, 0); tintar(pn.geometry, d.ext ? 0x5a2410 : 0x6a3e20); pn.position.set(d.w/2, py, 0); hoja.add(pn); }
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), MAT.metal); conFuera(pom.geometry, 0); tintar(pom.geometry, 0xd8b040); pom.position.set(d.w - 0.12, 1.02, 0); hoja.add(pom);
    const pom2 = pom.clone(); pom2.position.z = 0; hoja.add(pom2); pom.position.z = 0.07; pom2.position.z = -0.07;
    /* el marco de la puerta, escalonado arriba */
    const cajaE = (t, y, ww, hh, dd, o) => { const x = d.eje === 'x' ? d.c + t : d.f + o, z = d.eje === 'x' ? d.f + o : d.c + t; if(d.eje === 'x') caja('madera', x, y, z, ww, hh, dd, 0x6a3418, {tex:1}); else caja('madera', x, y, z, dd, hh, ww, 0x6a3418, {tex:1}); };
    for(const o of [0.12, -0.12]){ cajaE(-d.w/2 - 0.07, y0 + 1.1, 0.14, 2.2, 0.06, o); cajaE(d.w/2 + 0.07, y0 + 1.1, 0.14, 2.2, 0.06, o); cajaE(0, y0 + 2.22, d.w + 0.28, 0.14, 0.06, o); cajaE(0, y0 + 2.36, d.w*0.6, 0.14, 0.06, o); }
    const col = colision(d.piso, 0, 0, 0, 0, {puerta:d.id});
    MUNDO.puertas[d.id] = Object.assign(d, {piv, hoja, abierta:0, meta:0, llave:false, col, hp:1, rota:false, y0,
      centro:[d.eje === 'x' ? d.c : d.f, d.eje === 'x' ? d.f : d.c]});
    ajustarColPuerta(MUNDO.puertas[d.id]);
  }
  /* la escalera: 12 escalones, el costado cerrado abajo (ahí adentro está el placard) y la baranda arriba */
  const n = 12, dz = (ESC.z1 - ESC.z0)/n;
  for(let i = 0; i < n; i++){ const z = ESC.z0 + dz*(i + 0.5), h = PISO1*(i + 1)/n; caja('escalera', (ESC.x0 + ESC.x1)/2, h/2, z, ESC.x1 - ESC.x0, h, dz, 0xffffff, {tex:0.6, fuera:0}); }
  /* el costado de la escalera que da a la entrada va cerrado con pared (adentro está el placard), y el fondo también */
  for(let i = 0; i < n; i++){ const z = ESC.z0 + dz*(i + 0.5), h = PISO1*(i + 1)/n; caja('pared', ESC.x0 - 0.012, h/2, z, 0.02, h, dz, 0xffffff, {tex:2.5, fuera:0}); }
  caja('pared', (ESC.x0 + ESC.x1)/2, PISO1/2 - 0.1, ESC.z1 + 0.012, ESC.x1 - ESC.x0, PISO1 - 0.2, 0.02, 0xffffff, {tex:2.5, fuera:0});
  /* la baranda que sigue la pendiente del lado abierto */
  for(let i = 0; i <= 8; i++){ const z = lerp(ESC.z0 + 0.2, ESC.z1 - 0.1, i/8), h = rampa(z); caja('madera', ESC.x0 + 0.05, h + 0.47, z, 0.05, 0.94, 0.05, 0x5a3418, {fuera:0}); }
  { const L = Math.hypot(ESC.z1 - ESC.z0, PISO1), ang = Math.atan2(PISO1, ESC.z1 - ESC.z0); caja('madera', ESC.x0 + 0.05, PISO1/2 + 0.95, (ESC.z0 + ESC.z1)/2, 0.07, 0.07, L, 0x5a3418, {rx:-ang, fuera:0}); }
  colision(0, ESC.x0 - 0.1, ESC.x0 + 0.02, ESC.z0 + 0.2, ESC.z1, {escalon:true}); colision(0, ESC.x0, ESC.x1, ESC.z1 - 0.02, ESC.z1 + 0.1);
  for(const [x0, x1, z0, z1] of [[ESC.x0 - 0.06, ESC.x0 + 0.02, ESC.z0, ESC.z1], [ESC.x0, ESC.x1, ESC.z0 - 0.06, ESC.z0 + 0.02]]){
    caja('madera', (x0 + x1)/2, PISO1 + 0.95, (z0 + z1)/2, x1 - x0 + 0.04, 0.08, z1 - z0, 0x5a3418, {fuera:0});
    const largo = Math.max(x1 - x0, z1 - z0), nb = Math.round(largo/0.3); for(let i = 0; i <= nb; i++){ const t = i/nb; caja('madera', lerp(x0, x1, x1 - x0 > 0.2 ? t : 0.5), PISO1 + 0.47, lerp(z0, z1, z1 - z0 > 0.2 ? t : 0.5), 0.05, 0.94, 0.05, 0x5a3418, {fuera:0}); }
    colision(1, x0 - 0.05, x1 + 0.05, z0 - 0.05, z1 + 0.05); }
  /* baranda del lado de la escalera en la planta baja no hace falta: la cierra el costado */
  construirMuebles(); construirPatio(); construirFachada(); construirLuces();
  for(const k of Object.keys(BALDES)){ const m = mallaDe(k, MAT[k]); if(m){ m.name = 'casa_' + k; G.add(m); } }
  const mc = mallaCuadros(); if(mc) G.add(mc); for(const m of mallasCalcos()) G.add(m);
  return G;
}
function conFuera(g, v){ const n = g.attributes.position.count, a = new Float32Array(n).fill(v); g.setAttribute('aFuera', new THREE.BufferAttribute(a, 1)); return g; }
function tintar(g, color){ const c = new THREE.Color(color).convertSRGBToLinear(), n = g.attributes.position.count, a = new Float32Array(n*3); for(let i = 0; i < n; i++){ a[i*3] = c.r; a[i*3 + 1] = c.g; a[i*3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
/* la colisión de una puerta: cerrada tapa el hueco; abierta, la hoja queda contra la pared y no molesta */
function ajustarColPuerta(P){
  const c = P.col, g = 0.07;
  if(P.abierta > 0.35 || P.rota){ c.x0 = c.x1 = c.z0 = c.z1 = 9999; return; }
  if(P.eje === 'x'){ c.x0 = P.c - P.w/2; c.x1 = P.c + P.w/2; c.z0 = P.f - g; c.z1 = P.f + g; } else { c.x0 = P.f - g; c.x1 = P.f + g; c.z0 = P.c - P.w/2; c.z1 = P.c + P.w/2; }
}

/* ================================================================ muebles (con colisión) */
function mueble(piso, x, z, w, d, partes, sinCol){
  const y0 = alturaPiso(piso); let alto = 0;
  for(const p of partes){ const [mat, px, py, pz, pw, ph, pd, col, o] = p; caja(mat, x + px, y0 + py, z + pz, pw, ph, pd, col, Object.assign({fuera:0}, o || {})); alto = Math.max(alto, py + ph/2); }
  if(!sinCol){ colision(piso, x - w/2, x + w/2, z - d/2, z + d/2, {mueble:true, alto});
    /* la sombra difusa: más ancha cuanto más alto es el mueble (la lámpara del techo la abre) */
    const m = 0.07 + 0.07*Math.min(alto, 2); manchaSuelo(x - w/2 - m, x + w/2 + m, z - d/2 - m, z + d/2 + m, y0 + 0.036); }
}
/* un placard para esconderse: el mueble, la puerta de dos hojas y dónde queda la cabeza adentro */
function placard(id, piso, x, z, eje, lado, bajoEscalera){
  const y0 = alturaPiso(piso);
  if(!bajoEscalera){ const w = 1.3, d = 0.62;
    if(eje === 'x') mueble(piso, x, z, w, d, [['madera', 0, 1.05, 0, w, 2.1, d, 0x6a3a1c], ['madera', -w/4, 1.05, lado*(d/2 + 0.01), w/2 - 0.03, 1.95, 0.02, 0x5a2e14], ['madera', w/4, 1.05, lado*(d/2 + 0.01), w/2 - 0.03, 1.95, 0.02, 0x5a2e14], ['metal', -0.06, 1.05, lado*(d/2 + 0.03), 0.03, 0.2, 0.03, 0xd8b040], ['metal', 0.06, 1.05, lado*(d/2 + 0.03), 0.03, 0.2, 0.03, 0xd8b040]]);
    else mueble(piso, x, z, d, w, [['madera', 0, 1.05, 0, d, 2.1, w, 0x6a3a1c], ['madera', lado*(d/2 + 0.01), 1.05, -w/4, 0.02, 1.95, w/2 - 0.03, 0x5a2e14], ['madera', lado*(d/2 + 0.01), 1.05, w/4, 0.02, 1.95, w/2 - 0.03, 0x5a2e14], ['metal', lado*(d/2 + 0.03), 1.05, -0.06, 0.03, 0.2, 0.03, 0xd8b040], ['metal', lado*(d/2 + 0.03), 1.05, 0.06, 0.03, 0.2, 0.03, 0xd8b040]]);
  } else { caja('madera', ESC.x0 - 0.075, 0.75, z, 0.03, 1.4, 0.8, 0x5a2e14, {fuera:0}); caja('metal', ESC.x0 - 0.1, 0.75, z + 0.3, 0.03, 0.12, 0.03, 0xd8b040, {fuera:0}); }
  const frente = eje === 'x' ? [x, z + lado*0.95] : [x + lado*0.95, z], dentro = bajoEscalera ? [1.3, z] : [x, z];
  MUNDO.placards[id] = {id, piso, pos:[x, y0 + 1.0, z], frente, dentro, mira:eje === 'x' ? (lado > 0 ? 0 : Math.PI) : (lado > 0 ? -Math.PI/2 : Math.PI/2), sala:salaEn(frente[0], frente[1], piso).id, ocupado:false};
}

/* ================================================================ afuera: el terreno, la calle, el galpón, los árboles y la planta a lo lejos */
const GALPON = {x0:-10, x1:-6, z0:10, z1:14, alto:2.6, puerta:[-8, 10]};
const FUSIBLES = {x:2.6, y:1.35, z:5.16};
const ARBOLES = [[6.2, 13, 1.25], [-14, 4, 1], [-13, -8, 0.9], [13, -7, 1.1], [14, 6, 1], [11, 18, 1.2], [-3, 19, 1.1], [-15, 17, 1.3], [16, 15, 0.9], [4, 21, 1]];
const POSTE = {x:6.5, z:-14.4}, FAROL = {x:-6, z:-14.6};
function construirPatio(){
  /* el pasto en celdas de 20 m (el plano gigante de dos triángulos pierde precisión de profundidad) */
  for(let x = -60; x < 60; x += 20){ for(const z of [0, 20, 40]) caja('cesped', x + 10, -0.26, z + 10, 20, 0.5, 20, 0xffffff, {tex:1.2, fuera:1});
    caja('cesped', x + 10, -0.26, -5, 20, 0.5, 10, 0xffffff, {tex:1.2, fuera:1}); caja('cesped', x + 10, -0.26, -12.2, 20, 0.5, 4.4, 0xffffff, {tex:1.2, fuera:1});
    caja('cesped', x + 10, -0.26, -32.5, 20, 0.5, 15, 0xffffff, {tex:1.2, fuera:1}); }
  /* vereda, cordón y calle */
  caja('vereda', 0, -0.03, -15.2, 120, 0.1, 2.4, 0xffffff, {tex:1.2, fuera:1}); caja('vereda', 0, -0.06, -16.5, 120, 0.2, 0.2, 0x8a8680, {fuera:1});
  caja('asfalto', 0, -0.12, -20.8, 120, 0.1, 8.4, 0xffffff, {tex:0.5, fuera:1});
  for(let x = -58; x < 60; x += 6) caja('plastico', x, -0.06, -20.8, 3, 0.02, 0.18, 0xe8d040, {fuera:1});
  /* el camino de la entrada y el del galpón */
  caja('camino', 0.25, -0.02, -9.1, 1.6, 0.06, 7.8, 0xffffff, {tex:0.5, fuera:1});
  for(let i = 0; i < 7; i++){ const t = i/6; caja('camino', lerp(1.25, -7.9, t), -0.02, lerp(6.2, 9.4, t), 1.4, 0.06, 1.8, 0xffffff, {tex:0.5, fuera:1}); }
  /* el alambrado del terreno, bajo, de madera */
  const cerco = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L/2.2), ang = Math.atan2(x1 - x0, z1 - z0);
    colision(0, x0 - 0.1, x1 + 0.1, z0 - 0.1, z1 + 0.1, {cerco:true});
    for(let i = 0; i <= n; i++){ const t = i/n; caja('madera', lerp(x0, x1, t), 0.5, lerp(z0, z1, t), 0.14, 1.0, 0.14, 0x6a4a2a, {fuera:1}); }
    for(const y of [0.35, 0.8]) caja('madera', (x0 + x1)/2, y, (z0 + z1)/2, 0.06, 0.1, L, 0x7a5a32, {ry:ang, fuera:1}); };
  cerco(-17, -13.2, -1.2, -13.2); cerco(1.7, -13.2, 17, -13.2); cerco(-17, -13.2, -17, 23); cerco(17, -13.2, 17, 23); cerco(-17, 23, 17, 23);
  /* el galpón del generador: madera naranja por dentro, techo a un agua */
  const G = GALPON, H = G.alto;
  for(const [x0, x1, z0, z1] of [[G.x0, G.x1, G.z1, G.z1], [G.x0, G.x0, G.z0, G.z1], [G.x1, G.x1, G.z0, G.z1]]){
    const w = Math.max(0.15, x1 - x0), d = Math.max(0.15, z1 - z0); caja('galpon', (x0 + x1)/2, H/2, (z0 + z1)/2, w, H, d, 0xffffff, {tex:2, fuera:1}); colision(0, x0 - 0.1, x1 + 0.1, z0 - 0.1, z1 + 0.1); }
  caja('galpon', (G.x0 + G.puerta[0] - 0.6)/2, H/2, G.z0, G.puerta[0] - 0.6 - G.x0, H, 0.15, 0xffffff, {tex:2, fuera:1}); colision(0, G.x0, G.puerta[0] - 0.6, G.z0 - 0.1, G.z0 + 0.1);
  caja('galpon', (G.puerta[0] + 0.6 + G.x1)/2, H/2, G.z0, G.x1 - G.puerta[0] - 0.6, H, 0.15, 0xffffff, {tex:2, fuera:1}); colision(0, G.puerta[0] + 0.6, G.x1, G.z0 - 0.1, G.z0 + 0.1);
  caja('galpon', G.puerta[0], H - 0.25, G.z0, 1.2, 0.5, 0.15, 0xffffff, {tex:2, fuera:1});
  caja('tejas', (G.x0 + G.x1)/2, H + 0.25, (G.z0 + G.z1)/2, G.x1 - G.x0 + 0.6, 0.15, G.z1 - G.z0 + 0.6, 0xffffff, {rx:0.12, fuera:1});
  caja('madera', (G.x0 + G.x1)/2, 0.02, (G.z0 + G.z1)/2, G.x1 - G.x0, 0.05, G.z1 - G.z0, 0x8a5a2a, {tex:1, fuera:1});
  /* adentro: el generador rojo, el tambor de nafta, un estante; herramientas colgadas */
  mueble(0, -8.9, 13.0, 1.3, 0.9, [['plastico', 0, 0.45, 0, 1.2, 0.8, 0.8, 0xc8201c, {fuera:1}], ['metal', 0, 0.9, 0, 1.0, 0.1, 0.6, 0x3a3a3e, {fuera:1}], ['metal', -0.5, 0.5, -0.41, 0.2, 0.2, 0.02, 0x1a1a1a, {fuera:1}], ['metal', 0.35, 0.95, 0.1, 0.2, 0.1, 0.2, 0xd8d020, {fuera:1}], ['metal', 0, 0.05, 0, 1.3, 0.1, 0.9, 0x2a2a2a, {fuera:1}]]);
  mueble(0, -6.7, 13.3, 0.7, 0.7, [['metal', 0, 0.5, 0, 0.64, 1.0, 0.64, 0x2a50a0, {fuera:1}], ['metal', 0, 1.01, 0, 0.66, 0.03, 0.66, 0x1a3a80, {fuera:1}], ['metal', 0.1, 1.05, 0.1, 0.08, 0.06, 0.08, 0x111111, {fuera:1}]]);
  mueble(0, -9.6, 11.2, 0.5, 1.4, [['madera', 0, 1.0, 0, 0.45, 0.05, 1.4, 0x6a3a1c, {fuera:1}], ['madera', 0, 1.6, 0, 0.45, 0.05, 1.4, 0x6a3a1c, {fuera:1}], ['madera', 0, 0.8, -0.65, 0.45, 1.6, 0.05, 0x5a3014, {fuera:1}], ['madera', 0, 0.8, 0.65, 0.45, 1.6, 0.05, 0x5a3014, {fuera:1}]]);
  caja('metal', -9.9, 1.7, 12.6, 0.05, 1.0, 0.05, 0x6a6a6a, {rx:0.2, fuera:1}); caja('madera', -9.9, 1.1, 12.6, 0.05, 0.6, 0.12, 0x6a4a2a, {rx:0.2, fuera:1});
  caja('metal', -9.9, 1.5, 13.4, 0.05, 1.2, 0.05, 0x7a7a7a, {rx:-0.15, fuera:1});
  /* la caja de fusibles en la pared del fondo */
  caja('metal', FUSIBLES.x, FUSIBLES.y, FUSIBLES.z + 0.05, 0.6, 0.8, 0.14, 0x8a8a80, {fuera:1}); caja('metal', FUSIBLES.x, FUSIBLES.y + 0.5, FUSIBLES.z + 0.02, 0.1, 0.4, 0.06, 0x6a6a60, {fuera:1});
  for(let i = 0; i < 3; i++) caja('metal', FUSIBLES.x - 0.2 + i*0.2, FUSIBLES.y + 1.0, FUSIBLES.z + 0.01, 0.04, 0.8, 0.04, 0x2a2a2a, {fuera:1});
  /* el buzón, el farol, el poste de luz con sus cables */
  mueble(0, 2.4, -12.4, 0.4, 0.4, [['madera', 0, 0.55, 0, 0.1, 1.1, 0.1, 0x6a4a2a, {fuera:1}], ['metal', 0, 1.2, 0, 0.3, 0.3, 0.5, 0xe8e8e8, {fuera:1}], ['metal', 0.17, 1.35, -0.1, 0.02, 0.2, 0.1, 0xd82020, {fuera:1}]]);
  mueble(0, FAROL.x, FAROL.z, 0.3, 0.3, [['metal', 0, 2.5, 0, 0.14, 5.0, 0.14, 0x3a3a3e, {fuera:1}], ['metal', 0, 5.0, -0.5, 0.1, 0.1, 1.0, 0x3a3a3e, {fuera:1}], ['metal', 0, 4.9, -1.0, 0.45, 0.14, 0.3, 0x2a2a2e, {fuera:1}]]);
  mueble(0, POSTE.x, POSTE.z, 0.4, 0.4, [['madera', 0, 3.5, 0, 0.26, 7.0, 0.26, 0x5a4028, {fuera:1}], ['madera', 0, 6.5, 0, 0.14, 0.14, 2.2, 0x5a4028, {fuera:1}]]);
  for(const s of [-1, 1]) caja('metal', 0, 6.55, POSTE.z + s*0.9, 120, 0.03, 0.03, 0x111111, {fuera:1});
  for(let i = 0; i < 12; i++){ const t = i/11; caja('metal', lerp(POSTE.x, 6.9, t), lerp(6.4, 5.6, t) - Math.sin(t*Math.PI)*0.6, lerp(POSTE.z, -5.1, t), 0.03, 0.03, 0.9, 0x111111, {fuera:1}); }
  /* los árboles de bloques */
  for(const [x, z, s] of ARBOLES){ caja('madera', x, 1.4*s, z, 0.5*s, 2.8*s, 0.5*s, 0x5a3a1c, {fuera:1}); colision(0, x - 0.35*s, x + 0.35*s, z - 0.35*s, z + 0.35*s, {arbol:true});
    const r = mulberry(x*31 + z); for(let i = 0; i < 4; i++){ const w = (2.6 - i*0.5)*s; caja('plastico', x + (r() - 0.5)*0.3, (3.0 + i*0.85)*s, z + (r() - 0.5)*0.3, w, 0.9*s, w, i % 2 ? 0x2a6a2a : 0x2e7a30, {fuera:1}); } }
  /* arbustos del frente */
  for(const [x, z] of [[-2.9, -5.85], [-6.1, -5.85], [3.1, -5.85], [6.1, -5.85], [-7.8, 0], [7.8, 0]]) caja('plastico', x, 0.35, z, 1.2, 0.7, 0.7, 0x2a6a2a, {fuera:1});
  /* las casas de los vecinos, a oscuras */
  for(const [x, z, rot, rota] of [[-32, -2, 0, true], [32, -4, 0, false], [-30, -34, Math.PI, false], [20, -36, Math.PI, true]]){
    caja('paredExt', x, 3, z, 12, 6, 9, rota ? 0xb8b0a0 : 0xd8d0c0, {tex:2.5, fuera:1}); caja('tejas', x, 6.8, z, 13, 1.6, 10, 0xffffff, {fuera:1});
    for(const dx of [-3, 3]) for(const y of [1.6, 4.4]){ caja('plastico', x + dx, y, z + (rot ? 4.52 : -4.52), 1.3, 1.1, 0.05, rota && dx < 0 && y < 2 ? 0x050505 : 0x10141a, {fuera:1}); } }
  /* la planta química: galpones enormes, chimeneas, carteles; lejos, del otro lado del campo */
  const PX = 40, PZ = -95;
  for(const [dx, dz, w, h, d] of [[0, 0, 60, 16, 26], [-38, 8, 22, 26, 18], [30, 12, 20, 20, 16], [-8, 20, 40, 10, 16]]) caja('metal', PX + dx, h/2, PZ + dz, w, h, d, 0x4a4e52, {fuera:1});
  for(const [dx, dz, h] of [[-20, -4, 42], [-10, -4, 36], [18, -4, 48], [36, 6, 30]]){ caja('metal', PX + dx, h/2, PZ + dz, 3.2, h, 3.2, 0x5a5e62, {fuera:1}); caja('metal', PX + dx, h - 1, PZ + dz, 3.6, 1.2, 3.6, 0xa02020, {fuera:1}); }
  for(let i = 0; i < 14; i++) caja('plastico', PX - 26 + i*4, 9, PZ + 13.05, 2.2, 1.2, 0.1, 0x9aff6a, {fuera:1});
  /* el cartel de la planta */
  const [cv, g] = lienzo(512, 128); g.fillStyle = '#e8e8e0'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#1a3a8a'; g.font = 'bold 70px Trebuchet MS, Arial'; g.textAlign = 'center'; g.fillText('PLANTA BLOXIA', 256, 88);
  g.fillStyle = '#c82020'; g.fillRect(0, 108, 512, 20);
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.5), new THREE.MeshBasicMaterial({map:texDe(cv), color:0x888888, fog:true})); cartel.position.set(PX, 20, PZ + 13.3); MUNDO.grupo.add(cartel); MUNDO.cartel = cartel;
  MUNDO.planta = {x:PX, z:PZ};
}

/* ================================================================ las luces de cada cuarto: la lámpara del techo, la llave al lado de la puerta */
const LLAVES = {living:[-2.15, 1.2, -1.4], hall:[-1.85, 1.2, -4.75], cocina:[2.15, 1.2, -3.35], cuarto:[-2.15, 1.2, 2.1], bano:[-1.6, 1.2, 2.55], lavadero:[0.6, 1.2, 2.6], comedor:[4.3, 1.2, 0.15],
  master:[-2.15, 4.4, -1.6], pasillo:[-1.85, 4.4, -4.75], nene:[2.15, 4.4, -3.5], bano2:[-2.15, 4.4, 2.9], deposito:[2.15, 4.4, 2.5]};
function construirLuces(){
  for(const s of SALAS){ const techo = s.piso ? TECHO1 : TECHO0, y = techo - 0.12, cx = (s.x0 + s.x1)/2, cz = s.id === 'hall' ? -1.2 : s.id === 'pasillo' ? -0.2 : (s.z0 + s.z1)/2;
    cil('metal', cx, techo - 0.015, cz, 0.13, 0.03, 0xd8d0b8, {fuera:0});
    const k = LLAVES[s.id]; caja('plastico', k[0], k[1], k[2], 0.08, 0.14, 0.1, 0xf0ece0, {fuera:0});
    MUNDO.luces.push({id:s.id, sala:s.id, piso:s.piso, pos:[cx, y - 0.1, cz], bulbo:[cx, techo - 0.028, cz, 1], on:false, alcance:Math.max(s.x1 - s.x0, s.z1 - s.z0)*1.1 + 1.5, llave:k, parpadeo:0});
  }
  /* las luces de afuera: la de la puerta de entrada y la de atrás */
  MUNDO.luces.push({id:'porche', sala:'porche', piso:0, pos:[0.25, 2.5, -5.6], bulbo:[0.25, 2.42, -5.3, 0.5], on:false, alcance:7, llave:[-0.55, 1.2, -4.85], afuera:true, parpadeo:0, mult:0.5});
  MUNDO.luces.push({id:'fondo', sala:'fondo', piso:0, pos:[1.25, 2.5, 5.6], bulbo:[1.25, 2.42, 5.3, 0.5], on:false, alcance:7, llave:[0.55, 1.2, 4.85], afuera:true, parpadeo:0, mult:0.5});
  MUNDO.luces.push({id:'galpon', sala:'galpon', piso:0, pos:[-8, 2.3, 12], bulbo:[-8, 2.36, 12, 0.42], on:true, alcance:6, afuera:true, parpadeo:0, siempre:true});
  caja('metal', -8, 2.6, 12, 0.012, 0.5, 0.012, 0x1a1a1a, {fuera:1});
  /* la tele prendida alumbra el living de azul y titila (no es una lámpara: no tiene llave ni cuenta para los fusibles) */
  MUNDO.luces.push({id:'tele', sala:'tele', piso:0, pos:[TELE_POS.x, 1.05, TELE_POS.pantalla - 0.45], bulbo:[0, -9, 0, 0], on:false, alcance:4.6, tele:true, parpadeo:0, color:0x8aa8ff});
  caja('metal', 0.25, 2.55, -5.2, 0.25, 0.25, 0.2, 0x2a2a2e, {fuera:1}); caja('metal', 1.25, 2.55, 5.2, 0.25, 0.25, 0.2, 0x2a2a2e, {fuera:1});
  /* los plafones: una media esfera de vidrio instanciada que se prende de a una, con su halo */
  const n = MUNDO.luces.length, bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 16, 6, 0, Math.PI*2, Math.PI/2, Math.PI/2), new THREE.MeshBasicMaterial({color:0xffffff, fog:false}), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), hp = [], hc = [];
  MUNDO.luces.forEach((L, i) => { const [x, y, z, e] = L.bulbo; m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(e, e*0.5, e)); bm.setMatrixAt(i, m); bm.setColorAt(i, new THREE.Color(0x303030)); hp.push(x, y - 0.06*e, z); hc.push(0, 0, 0); });
  bm.instanceColor.needsUpdate = true; bm.frustumCulled = false; MUNDO.grupo.add(bm); MUNDO.bombitas = bm;
  const [cv, g] = lienzo(64, 64), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3));
  const halos = new THREE.Points(hg, new THREE.PointsMaterial({size:0.95, map:new THREE.CanvasTexture(cv), vertexColors:true, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:true}));
  halos.frustumCulled = false; halos.renderOrder = 8; MUNDO.grupo.add(halos); MUNDO.halos = halos;
}
