/* ================================================================ el juego
   Se arrastra para atrás y se suelta para saltar; mientras se apunta el tiempo se frena. Se pega a cualquier
   piedra, se muere en los pinchos, y a los enemigos se los mata atravesándolos: cada baja devuelve el doble salto. */
const J = {modo:'menu', t:0, tr:0, ts:1, tsObj:1, pausa:false, nivel:null, idx:0, infinito:false, reloj:0, puntos:0, monedas:0, bajas:0, combo:0,
  hitstop:0, textos:[], gen:0, fin:null, tinta:null, altura:0, alturaMax:0, apunta:null, sacude:0, fundido:0, muerto:0};
const NIN = {x:0, y:0, vx:0, vy:0, est:'pegado', nx:0, ny:-1, plat:null, dj:1, giro:0, tAire:0, dir:1, bufanda:[], vidas:0, invul:0, ultimo:null, estela:[]};
let ENEM = [], BALAS = [], MONEDAS = [], PARTS = [], MANCHAS = [];
/* los ninjas de la tienda y lo que tiene cada uno */
const NINJAS = {
  kage:{nombre:'KAGE', precio:0, perk:'EL DE SIEMPRE', colBuf:'#e8384a'},
  hana:{nombre:'HANA', precio:600, perk:'MÁS MONEDAS', colBuf:'#ff8ac0', monedas:1.5},
  kaze:{nombre:'KAZE', precio:900, perk:'CÁMARA MÁS LENTA', colBuf:'#5ae0ff', lento:0.55, accesorio:'sombrero'},
  tetsu:{nombre:'TETSU', precio:1200, perk:'UNA VIDA EXTRA', colBuf:'#c8c8d0', vidas:1, colOjo:'#ffd060'},
  neko:{nombre:'NEKO', precio:1500, perk:'IMÁN DE MONEDAS', colBuf:'#ffd060', iman:true, accesorio:'orejas'},
  ryu:{nombre:'RYU', precio:2000, perk:'TRIPLE SALTO', colBuf:'#5aff9a', saltos:2, colHoja:'#5aff9a'},
  oni:{nombre:'ONI', precio:2500, perk:'BAJAS VALEN DOBLE', colBuf:'#ff3a3a', bajas:2, accesorio:'cuernos', colOjo:'#ff3a3a'}
};
const PROG = Object.assign({monedas:0, ninjas:['kage'], efectos:['auto'], ninja:'kage', efecto:'auto', niveles:{}, record:0, abierto:0}, leer('sombra.progreso', {}));
function guardarProg(){ guardar('sombra.progreso', PROG); }
const NJ = () => NINJAS[PROG.ninja] || NINJAS.kage;
/* el efecto que se ve: el del mundo, o el que se puso el jugador */
/* el mundo que se ve: el del nivel; en el infinito cambia cada 150 m (bambú, montaña, castillo, y vuelta) */
function mundoActual(){ if(!J.nivel) return 'bambu'; if(J.nivel.mundo === 'infinito') return ['bambu', 'montana', 'castillo'][Math.floor(J.alturaMax/150) % 3]; return J.nivel.mundo === 'menu' ? 'bambu' : J.nivel.mundo; }
function efecto(){ if(PROG.efecto !== 'auto' && EFECTOS[PROG.efecto]) return EFECTOS[PROG.efecto]; const m = mundoActual(); return EFECTOS[{bambu:'atardecer', montana:'noche', castillo:'fuego', infinito:'atardecer'}[m] || 'atardecer']; }

/* ================================================================ los niveles: 3 mundos × 8, generados con semilla y verificados */
const MUNDOS = [{id:'bambu', nombre:'BOSQUE DE BAMBÚ', musica:'bambu', amb:'bambu'}, {id:'montana', nombre:'LA MONTAÑA', musica:'montana', amb:'montana'}, {id:'castillo', nombre:'EL CASTILLO', musica:'castillo', amb:'castillo'}];
const NIVELES = [];
MUNDOS.forEach((m, mi) => { for(let i = 0; i < 8; i++) NIVELES.push({id:m.id + '-' + (i + 1), mundo:m.id, mi, n:i, semilla:1000 + mi*97 + i*13, tramos:3 + Math.floor(i/2) + mi, d:Math.min(1, mi*0.3 + i*0.07), tinta:mi === 2 && i > 1 ? 12 + i*1.5 : mi === 1 && i > 4 ? 8 : 0}); });
/* armar un nivel: tramos de la mezcla del mundo con descansos, arriba el torii. Si la búsqueda no llega, otra semilla. */
function armarNivel(def){
  for(let intento = 0; intento < 12; intento++){
    const semilla = (def.semillaBuena || def.semilla) + intento*7919, r = mulberry(semilla), o = {gente:[], plats:[]};
    nuevoMapa(); let base = 0;
    const mezcla = MEZCLAS[def.mundo] || MEZCLAS.bambu;
    for(let k = 0; k < def.tramos; k++){ abrirFilas(base - 40); const tipo = k === 0 ? 'repisas' : mezcla[Math.floor(r()*mezcla.length)];
      base -= TRAMOS[tipo](base, r, def.d, o); abrirFilas(base - 6); base -= descanso(base, r); }
    /* el último nivel de cada mundo termina con el jefe */
    let A = null; if(def.n === 7 && JEFE_DE[def.mundo]){ abrirFilas(base - 40); A = arena(base); base -= A.h; }
    abrirFilas(base - 14);
    /* el techo con el torii: se gana al pasar por debajo */
    rect2(1, base - 11, COLS - 2, base - 12, T_PIEDRA); MAPA.meta = {y:(base - 4)*CEL, r:base - 4};
    const desde = {x:ANCHO/2, y:CEL - HH - 0.01, nx:0, ny:-1};
    const a = alcance(desde, MAPA.meta.y, 2500, true);
    if(a.llega){ def.semillaBuena = semilla; const P = poblar(o, a, r); ENEM = P.enem; MONEDAS = P.mon; MAPA.plats = P.plats; BALAS = []; PARTS = []; MANCHAS = [];
      J.totMonedas = MONEDAS.length; J.totEnem = ENEM.length; J.jefe = null; J.arena = A; J.marcas = [];
      if(A){ for(let c = A.reja.c0; c <= A.reja.c1; c++){ poner(c, A.reja.r0, T_REJA); poner(c, A.reja.r1, T_REJA); } J.jefe = crearJefe(JEFE_DE[def.mundo], A); J.totEnem++; }
      return true; }
  }
  console.warn('nivel sin camino', def.id); return false;
}
/* las monedas van donde el ninja de verdad pasa: sobre los arcos del camino que encontró la búsqueda */
function poblar(o, a, r){
  const ENEM = [], MONEDAS = [];
  const clave = q => Math.round(q.x/4) + ',' + Math.round(q.y/4) + ',' + q.nx + ',' + q.ny;
  const arcos = []; if(a.final) arcos.push(a.final.camino);
  let q = a.final ? a.final.q : null; while(q){ const v = a.vistos.get(clave(q)); if(!v || !v.padre) break; if(v.camino) arcos.push(v.camino); q = v.padre; }
  for(const cam of arcos){ if(!cam) continue; for(let i = 1; i < cam.length - 1 && i < 9; i += 2){ const [x, y] = cam[i]; if(tile(Math.floor(x/CEL), Math.floor(y/CEL)) === T_AIRE && !MONEDAS.some(m => Math.hypot(m.x - x, m.y - y) < 9)) MONEDAS.push({x, y, t:r()*6}); } }
  /* la gente: parada sobre piedra, con lugar arriba, lejos del arranque */
  for(const g of o.gente){ const x = g.c*CEL + CEL/2;
    if(g.t === 'cometa'){ ENEM.push(crearEnemigo('cometa', x, g.r*CEL, r)); continue; }
    if(tile(g.c, g.r) !== T_AIRE || tile(g.c, g.r - 1) !== T_AIRE || tile(g.c, g.r + 1) !== T_PIEDRA) continue;
    if(g.r > -6) continue;
    ENEM.push(crearEnemigo(g.t, x, (g.r + 1)*CEL, r)); }
  const plats = o.plats.map(p => ({x:p.c0*CEL, y:p.r*CEL, w:p.w*CEL, h:5, xa:p.c0*CEL, xb:(p.c1 - p.w)*CEL + CEL, v:p.v, f:p.f, dx:0}));
  return {enem:ENEM, mon:MONEDAS, plats};
}
function crearEnemigo(t, x, y, r){ return {t, x, y, x0:x, dir:r() < 0.5 ? -1 : 1, carga:0, cd:0.6 + r(), apunta:0, corta:0, fase:r()*6, muerto:false, vx:t === 'cometa' ? (r() < 0.5 ? -26 : 26) : 0}; }

/* ================================================================ el infinito: se va generando de a tramos, verificados desde lo que ya se alcanzó */
const INF = {base:0, desde:null, r:null, n:0};
function armarInfinito(){
  nuevoMapa(); ENEM = []; MONEDAS = []; BALAS = []; PARTS = []; MANCHAS = []; MAPA.meta = null; J.jefe = null; J.arena = null; J.marcas = [];
  INF.base = 0; INF.n = 0; INF.r = mulberry(Math.floor(Math.random()*1e9)); INF.desde = {x:ANCHO/2, y:CEL - HH - 0.01, nx:0, ny:-1};
  for(let i = 0; i < 3; i++) tramoInfinito();
}
function tramoInfinito(){
  const r = INF.r, d = Math.min(1, INF.n*0.06), mezcla = MEZCLAS.infinito;
  for(let intento = 0; intento < 6; intento++){
    const o = {gente:[], plats:[]}, base0 = INF.base; let base = base0;
    abrirFilas(base - 40); const tipo = INF.n === 0 ? 'repisas' : intento >= 3 ? 'repisas' : mezcla[Math.floor(r()*mezcla.length)];
    base -= TRAMOS[tipo](base, r, intento >= 3 ? d*0.3 : d, o); abrirFilas(base - 6); base -= descanso(base, r); abrirFilas(base - 20);
    const a = alcance(INF.desde, (base + 1)*CEL, 700, true);
    if(a.llega || intento === 5){
      const P = poblar(o, a, r); ENEM = ENEM.concat(P.enem); MONEDAS = MONEDAS.concat(P.mon); MAPA.plats = MAPA.plats.concat(P.plats);
      /* el próximo tramo arranca desde el lugar más alto al que se llegó */
      let mejor = INF.desde; for(const v of a.vistos.values()) if(v.q.y < mejor.y) mejor = v.q; INF.desde = mejor;
      INF.base = base; INF.n++; return; }
    /* no se llega: se borran esas filas y se prueba otro tramo */
    for(let rr = base0 - 1; rr >= base - 20; rr--){ const i = idx(0, rr); MAPA.cel.fill(0, i, i + COLS); MAPA.cel[i] = MAPA.cel[i + COLS - 1] = T_PIEDRA; }
  }
}

/* ================================================================ empezar, morir, ganar */
function empezarNivel(i){
  const def = NIVELES[i]; J.nivel = def; J.idx = i; J.infinito = false; J.gen++;
  armarNivel(def); arrancarCorrida(def.tinta);
  SON.musica(MUNDOS[def.mi].musica); SON.ambiente(MUNDOS[def.mi].amb); SON.cinta(0);
}
function empezarInfinito(){ J.nivel = {id:'infinito', mundo:'infinito', mi:0, n:0}; J.infinito = true; J.gen++; armarInfinito(); arrancarCorrida(1); SON.musica('infinito'); SON.ambiente('bambu'); SON.cinta(0); }
function arrancarCorrida(tinta){
  const N = NJ();
  Object.assign(NIN, {x:ANCHO/2, y:CEL - HH - 0.01, vx:0, vy:0, est:'pegado', nx:0, ny:-1, plat:null, dj:N.saltos || 1, giro:0, tAire:0, dir:1, vidas:N.vidas || 0, invul:0, estela:[]});
  NIN.bufanda = []; for(let i = 0; i < 6; i++) NIN.bufanda.push({x:NIN.x, y:NIN.y, px:NIN.x, py:NIN.y});
  NIN.ultimo = {x:NIN.x, y:NIN.y, nx:0, ny:-1};
  Object.assign(J, {modo:'juego', t:0, reloj:0, puntos:0, monedas:0, bajas:0, combo:0, hitstop:0, textos:[], fin:null, pausa:false, apunta:null, ts:1, tsObj:1, muerto:0, altura:0, alturaMax:0, fundido:1});
  J.tinta = tinta ? {y:(MAPA.piso + 3)*CEL, v:tinta, t:0} : null; J.mundoInf = null; J.cartel = null;
  CAM.y = Math.min(NIN.y - H*0.6, CEL - H*0.86); CAM.objY = CAM.y;
}
function morir(causa){
  if(NIN.est === 'muerto' || NIN.invul > 0) return;
  if(NIN.vidas > 0){ NIN.vidas--; sfx('vida'); vibrar(40); const u = NIN.ultimo; Object.assign(NIN, {x:u.x, y:u.y, nx:u.nx, ny:u.ny, vx:0, vy:0, est:'pegado', plat:null, invul:1.6, dj:NJ().saltos || 1});
    if(J.tinta && J.tinta.y < NIN.y + 60) J.tinta.y = NIN.y + 60; aviso(tr('¡UNA VIDA MENOS!')); return; }
  NIN.est = 'muerto'; NIN.causa = causa; J.muerto = 0.001; J.apunta = null; sfx('muerte'); SON.filtroMuerte(true); vibrar(90); J.sacude = 1.5;
  tinta(NIN.x, NIN.y, 26, 1.4); J.hitstop = 0.12;
  luego(1.1, () => terminarCorrida(false));
}
function ganar(){
  if(J.fin) return; J.fin = {gana:true}; NIN.est = 'meta'; sfx('meta'); SON.musica('victoria'); vibrar(30);
  luego(1.4, () => terminarCorrida(true));
}
/* al terminar: monedas a la billetera, estrellas, récord */
function terminarCorrida(gano){
  const N = NJ(), mon = Math.round(J.monedas*(N.monedas || 1));
  PROG.monedas += mon; const res = {gano, mon, puntos:J.puntos, altura:J.altura, bajas:J.bajas};
  if(J.infinito){ res.record = J.puntos > PROG.record; if(res.record){ PROG.record = J.puntos; } }
  else if(gano){ const est = 1 + (J.monedas >= J.totMonedas ? 1 : 0) + (J.bajas >= J.totEnem ? 1 : 0), ant = PROG.niveles[J.nivel.id] || 0;
    res.estrellas = est; res.ant = ant; res.monOk = J.monedas >= J.totMonedas; res.bajOk = J.bajas >= J.totEnem; PROG.niveles[J.nivel.id] = Math.max(ant, est); PROG.abierto = Math.max(PROG.abierto, J.idx + 1); }
  guardarProg(); UI.res = res; J.modo = 'resultado'; SON.lento(0); UI.p = gano ? 'gana' : 'muerte'; UI.t = 0; SON.filtroMuerte(false); if(!gano) SON.musica(null);
}

/* ================================================================ saltar */
function puedeSaltar(){ return NIN.est === 'pegado' || (NIN.est === 'aire' && NIN.dj > 0); }
function saltar(dx, dy){
  if(!puedeSaltar()) return false;
  const pegado = NIN.est === 'pegado', v = velTiro(dx, dy, pegado ? NIN.nx : undefined, pegado ? NIN.ny : undefined); if(!v) return false;
  if(!pegado){ NIN.dj--; sfx('doble_salto', {x:pan(NIN.x)}); polvo(NIN.x, NIN.y + 3, 6, '#ffffff'); }
  else { sfx('salto', {x:pan(NIN.x)}); polvo(NIN.x - NIN.nx*3, NIN.y - NIN.ny*3, 5, null); NIN.dj = NJ().saltos || 1; }
  NIN.x += (NIN.nx || 0)*0.3; NIN.y += (NIN.ny || 0)*0.3;
  NIN.vx = v.vx; NIN.vy = v.vy; NIN.est = 'aire'; NIN.plat = null; NIN.tAire = 0; NIN.dir = v.vx >= 0 ? 1 : -1; NIN.giro = 0;
  if(NIN.desm){ NIN.desm = null; }
  return true;
}
/* ================================================================ el paso de todo */
function pasoJuego(dt, dtR){
  J.t += dt; J.reloj += dt; NIN.invul = Math.max(0, NIN.invul - dt);
  /* las plataformas que van y vienen */
  for(const p of MAPA.plats){ const u = (Math.sin(J.t*p.v*2 + p.f) + 1)/2, nx = lerp(p.xa, p.xb, u); p.dx = nx - p.x; p.x = nx; }
  pasoNinja(dt);
  pasoEnemigos(dt);
  pasoJefe(dt);
  pasoBalas(dt);
  pasoMonedas(dt);
  pasoDesm(dt);
  /* la tinta que sube */
  if(J.tinta && NIN.est !== 'meta'){ const T = J.tinta; T.t += dt; const v = J.infinito ? Math.min(55, 6 + T.t*0.45) : T.v;
    T.y -= v*dt; if(T.y > NIN.y + H*0.9) T.y = NIN.y + H*0.9;                                  /* nunca queda demasiado lejos */
    if(NIN.est !== 'muerto' && NIN.y + HH > T.y) morir('tinta');
    const cerca = J.jefe && J.jefe.activo && !J.jefe.fuera ? 0 : lim(1 - (T.y - NIN.y)/140, 0, 1);          /* en la arena la tinta espera callada */ if(cerca > 0.5 && Math.random() < dt*3) sfx('tinta', {vol:cerca*0.5}); J.sacude = Math.max(J.sacude, cerca*0.35); }
  /* la altura y los puntos del infinito */
  J.altura = Math.max(0, Math.round(-NIN.y/CEL)); if(J.altura > J.alturaMax){ J.puntos += (J.altura - J.alturaMax)*10; J.alturaMax = J.altura; }
  if(J.infinito){ while(MAPA.rMin > Math.floor((CAM.y - H)/CEL) - 10) tramoInfinito();
    const abajo = (J.tinta ? J.tinta.y : CAM.y + H*2) + 120; ENEM = ENEM.filter(e => e.y < abajo); MONEDAS = MONEDAS.filter(m => m.y < abajo); MAPA.plats = MAPA.plats.filter(p => p.y < abajo); MANCHAS = MANCHAS.filter(m => m.y < abajo); }
  if(J.infinito){ const m = mundoActual(); if(m !== J.mundoInf){ if(J.mundoInf){ J.fundido = 0.6; J.cartel = {txt:MUNDOS.find(q => q.id === m).nombre, t:2.2}; SON.ambiente(m); sfx('titulo', {vol:0.5}); } J.mundoInf = m; } }
  if(J.cartel){ J.cartel.t -= dtR; if(J.cartel.t <= 0) J.cartel = null; }
  if(MAPA.meta && NIN.est !== 'muerto' && NIN.y < MAPA.meta.y && !(J.jefe && !J.jefe.fuera)) ganar();
  for(const t of J.textos){ t.t -= dtR; t.y -= dtR*18; } J.textos = J.textos.filter(t => t.t > 0);
  pasoParticulas(dt);
}
function pasoNinja(dt){
  const N = NIN;
  if(N.est === 'muerto' || N.est === 'meta'){ if(N.est === 'meta'){ N.vy = Math.max(-80, N.vy - 400*dt); N.y += N.vy*dt; } pasoBufanda(dt); return; }
  if(N.est === 'pegado'){
    if(N.plat){ N.x += N.plat.dx; if(!MAPA.plats.includes(N.plat)) soltar(); }
    /* si se fue lo que lo sostenía (desmoronado), cae */
    if(!N.plat){ const h = tocaCaja(N.x - N.nx*0.6, N.y - N.ny*0.6, false); if(!h) soltar(); else if(h.pincho) morir('pinchos'); }
  } else {
    N.tAire += dt; N.giro += dt*(N.tAire < 0.42 ? 16 : 0)*N.dir; if(N.tAire >= 0.42) N.giro *= Math.exp(-dt*12);
    const sub = Math.max(1, Math.ceil(dt/(1/240)));
    for(let i = 0; i < sub; i++){ const res = pasoCuerpo(N, dt/sub, true);
      if(res && res.muere){ morir(res.muere); return; }
      if(res && res.pega){ pegar(res); break; } }
    if(N.y > (MAPA.piso + 2)*CEL) morir('cae');
    if(!J.infinito && N.y > CAM.y + H + 30 && N.tAire > 1) morir('cae');
    if(J.infinito && N.y > CAM.y + H + 20) morir('cae');
  }
  pasoBufanda(dt);
  /* la estela en cámara lenta */
  if(J.ts < 0.6 && N.est === 'aire'){ N.estela.push({x:N.x, y:N.y, giro:N.giro, dir:N.dir, t:0.35}); if(N.estela.length > 10) N.estela.shift(); }
  for(const e of N.estela) e.t -= dt*3; N.estela = N.estela.filter(e => e.t > 0);
}
function pegar(res){
  const N = NIN; N.est = 'pegado'; N.nx = res.nx; N.ny = res.ny; N.vx = N.vy = 0; N.plat = res.h && res.h.plat || null; N.giro = 0; N.dj = NJ().saltos || 1;
  if(N.nx) N.dir = N.nx; sfx('pegar', {x:pan(N.x)}); polvo(N.x - N.nx*3, N.y - N.ny*4, 4, null);
  if(J.combo > 1) aviso(tr('COMBO ×{0}', J.combo)); J.combo = 0;
  if(res.h && res.h.t === T_DESM){ const k = res.h.c + ',' + res.h.r; if(!MAPA.desm.has(k)) MAPA.desm.set(k, {c:res.h.c, r:res.h.r, t:0.45}); }
  N.ultimo = {x:N.x, y:N.y, nx:N.nx, ny:N.ny};
}
function soltar(){ NIN.est = 'aire'; NIN.plat = null; NIN.vx = 0; NIN.vy = 20; NIN.tAire = 0.5; }
/* la bufanda: una cadena que cuelga del cuello y se queda atrás */
function pasoBufanda(dt){
  const b = NIN.bufanda; if(!b.length) return; b[0].x = NIN.x - NIN.dir*1; b[0].y = NIN.y - 3;
  for(let i = 1; i < b.length; i++){ const p = b[i], vx = (p.x - p.px)*0.9, vy = (p.y - p.py)*0.9; p.px = p.x; p.py = p.y; p.x += vx - NIN.dir*dt*20 + Math.sin(J.tr*8 + i)*0.08; p.y += vy + dt*40*(NIN.est === 'aire' ? 0.2 : 1);
    const q = b[i - 1], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1, L = 1.8; p.x = q.x + dx/d*L; p.y = q.y + dy/d*L; }
}
function pasoDesm(dt){ for(const [k, q] of MAPA.desm){ q.t -= dt; if(q.t <= 0){ MAPA.desm.delete(k); poner(q.c, q.r, T_AIRE); sfx('desmorona', {x:pan(q.c*CEL)});
  for(let i = 0; i < 6; i++) PARTS.push({x:q.c*CEL + rv(0, 8), y:q.r*CEL + rv(0, 8), vx:rv(-20, 20), vy:rv(-20, 10), vida:rv(0.6, 1.1), col:efecto().torre, tam:2, g:1}); } } }

/* ================================================================ los enemigos */
function hayVista(x0, y0, x1, y1){ const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d/4); for(let i = 1; i < n; i++){ const t = i/n, t2 = tile(Math.floor((x0 + (x1 - x0)*t)/CEL), Math.floor((y0 + (y1 - y0)*t)/CEL)); if(t2 === T_PIEDRA || t2 === T_DESM) return false; } return true; }
function pasoEnemigos(dt){
  const N = NIN, vivo = N.est !== 'muerto' && N.est !== 'meta';
  for(const e of ENEM){ if(e.muerto) continue;
    /* ¿lo atravesó el ninja? */
    const bx = e.t === 'samurai' ? 5 : e.t === 'cometa' ? 7 : 4, by = e.t === 'samurai' ? 12 : 9, cy = e.t === 'cometa' ? e.y - 6 : e.y - by/2;
    if(vivo && N.est === 'aire' && Math.abs(N.x - e.x) < bx + HW && Math.abs(N.y - cy) < by/2 + HH){ matar(e); continue; }
    const dx = N.x - e.x, dy = N.y - (e.y - 6), d = Math.hypot(dx, dy);
    if(e.t === 'tirador'){ e.cd -= dt; e.dir = dx >= 0 ? 1 : -1;
      const ve = vivo && d < 150 && hayVista(e.x, e.y - 4, N.x, N.y);
      if(ve && e.cd <= 0){ if(e.carga === 0) sfx('laser_carga', {x:pan(e.x), vol:0.6}); e.carga += dt;
        if(e.carga < 0.8) e.apunta = Math.atan2(N.y - (e.y - 3), N.x - e.x);                      /* los últimos 0,25 s la mira queda fija: se puede esquivar */
        if(e.carga >= 1.05){ e.carga = 0; e.cd = 1.5; sfx('disparo', {x:pan(e.x)}); BALAS.push({x:e.x + Math.cos(e.apunta)*6, y:e.y - 3 + Math.sin(e.apunta)*6, vx:Math.cos(e.apunta)*280, vy:Math.sin(e.apunta)*280, t:'bala', vida:1.4});
          /* fogonazo y humo en la boca del arcabuz */
          const bx = e.x + (e.dir || 1) + Math.cos(e.apunta)*8, by = e.y - 5 + Math.sin(e.apunta)*8; PARTS.push({x:bx - 1, y:by - 1, vx:0, vy:0, vida:0.07, col:'#fff4b0', tam:3});
          for(let i = 0; i < 4; i++) PARTS.push({x:bx, y:by, vx:Math.cos(e.apunta)*rv(10, 40) + rv(-8, 8), vy:Math.sin(e.apunta)*rv(10, 40) - rv(8, 20), vida:rv(0.35, 0.7), col:i % 2 ? '#c8c0d0' : '#9a90a8', tam:2}); } }
      else if(!ve) e.carga = Math.max(0, e.carga - dt*2); }
    else if(e.t === 'samurai'){
      if(e.corta > 0){ e.corta -= dt; continue; }
      const cerca = vivo && N.est === 'pegado' && Math.abs(dx) < 16 && Math.abs(N.y - (e.y - 6)) < 10;
      if(e.carga > 0){ e.carga -= dt; if(e.carga <= 0){ e.corta = 0.3; sfx('corte', {x:pan(e.x), vol:0.6}); if(vivo && Math.abs(N.x - e.x) < 18 && Math.abs(N.y - (e.y - 6)) < 11) morir('samurai'); } continue; }
      if(cerca){ e.carga = 0.42; e.dir = dx >= 0 ? 1 : -1; sfx('samurai', {x:pan(e.x)}); continue; }
      /* camina por su repisa hasta el borde */
      const nx = e.x + e.dir*14*dt, cAde = Math.floor((nx + e.dir*4)/CEL), rPie = Math.floor(e.y/CEL), rCab = Math.floor((e.y - 4)/CEL);
      if(tile(cAde, rPie) !== T_PIEDRA || tile(cAde, rCab) !== T_AIRE) e.dir *= -1; else e.x = nx; }
    else if(e.t === 'shuriken'){ e.cd -= dt; e.dir = dx >= 0 ? 1 : -1; if(e.carga > 0){ e.carga -= dt; if(e.carga <= 0){ const a = Math.atan2(dy, dx);
        for(const k of [-0.22, 0, 0.22]) BALAS.push({x:e.x, y:e.y - 5, vx:Math.cos(a + k)*135, vy:Math.sin(a + k)*135, t:'shuriken', vida:2, giro:0}); sfx('shuriken', {x:pan(e.x)}); e.cd = 3; } }
      else if(vivo && e.cd <= 0 && d < 160 && hayVista(e.x, e.y - 5, N.x, N.y)) e.carga = 0.35; }
    else if(e.t === 'cometa'){ e.x += e.vx*dt; if(e.x < 20 || e.x > ANCHO - 20) e.vx *= -1; e.dir = e.vx > 0 ? 1 : -1; e.y += Math.sin(J.t*1.3 + e.fase)*6*dt; }
  }
}
function matar(e){
  e.muerto = true; J.bajas++; J.combo++; const N = NJ(), p = Math.round(100*J.combo*(N.bajas || 1)); J.puntos += p;
  NIN.dj = Math.max(NIN.dj, N.saltos || 1);                                                          /* cada baja devuelve el doble salto */
  J.textos.push({x:e.x, y:e.y - 16, txt:'+' + p, t:1, grad:'oro'}); if(J.combo > 1) sfx('combo', {n:Math.min(10, J.combo)});
  sfx('corte', {x:pan(e.x)}); J.hitstop = 0.06; J.sacude = Math.max(J.sacude, 0.6); vibrar(20); POST.aber = Math.max(POST.aber, 2);
  tinta(e.x, e.y - 5, 18, 1); J.tajo = {x:e.x, y:e.y - 5, a:Math.atan2(NIN.vy, NIN.vx), t:0.18};
  /* las dos mitades del que cayó */
  const img = fotoEnemigo(e, efecto()), ac = Math.cos(J.tajo.a), as = Math.sin(J.tajo.a);
  for(const s of [-1, 1]) PARTS.push({x:e.x, y:e.y - 5, vx:NIN.vx*0.15 - as*s*38, vy:-70 + ac*s*30 + rv(-15, 15), vida:1.3, img, mitad:s, a:0, va:s*rv(3, 7)*(NIN.vx >= 0 ? 1 : -1), g:1});
}
function pasoBalas(dt){
  for(const b of BALAS){ if(b.clavada){ b.vida -= dt; continue; } b.vida -= dt; if(b.grav) b.vy += 420*dt; b.x += b.vx*dt; b.y += b.vy*dt; if(b.giro !== undefined) b.giro += dt*20;
    const t = tile(Math.floor(b.x/CEL), Math.floor(b.y/CEL)); if(t === T_PIEDRA || t === T_DESM || t === T_REJA){ if(b.t === 'hielo' || b.t === 'fuego'){ b.vida = 0; sfx(b.t === 'hielo' ? 'hielo_rompe' : 'fuego', {x:pan(b.x), vol:b.t === 'hielo' ? 0.6 : 0.3}); for(let i = 0; i < 5; i++) PARTS.push({x:b.x, y:b.y - 2, vx:rv(-40, 40), vy:rv(-60, -10), vida:0.4, col:b.t === 'hielo' ? '#e8f4ff' : '#ffb040', tam:1, g:1}); continue; } if(b.t === 'shuriken'){ b.clavada = true; b.vida = 1.2; sfx('shuriken_clava', {x:pan(b.x), vol:0.4}); } else { b.vida = 0; polvo(b.x, b.y, 3, '#ffe0a0'); } continue; }
    if(NIN.est !== 'muerto' && NIN.est !== 'meta' && Math.abs(b.x - NIN.x) < HW + (b.w || 1.5) && Math.abs(b.y - NIN.y) < HH + (b.h || 1.5)){ b.vida = 0; morir(b.t === 'bala' || b.t === 'shuriken' ? b.t : 'jefe'); } }
  BALAS = BALAS.filter(b => b.vida > 0);
}
function pasoMonedas(dt){
  const iman = NJ().iman;
  for(const m of MONEDAS){ if(m.tomada) continue; m.t += dt; const dx = NIN.x - m.x, dy = NIN.y - m.y, d = Math.hypot(dx, dy);
    if(iman && d < 44 && NIN.est !== 'muerto'){ m.x += dx/d*140*dt; m.y += dy/d*140*dt; }
    if(d < 7 && NIN.est !== 'muerto'){ m.tomada = true; J.monedas++; J.puntos += 10; sfx('moneda', {x:pan(m.x), tono:1 + (J.monedas % 8)*0.04}); for(let i = 0; i < 4; i++) PARTS.push({x:m.x, y:m.y, vx:rv(-40, 40), vy:rv(-50, 10), vida:0.3, col:'#ffe060', tam:1}); } }
  MONEDAS = MONEDAS.filter(m => !m.tomada);
}
/* ================================================================ partículas y manchas */
function polvo(x, y, n, col){ for(let i = 0; i < n; i++) PARTS.push({x, y, vx:rv(-30, 30), vy:rv(-30, 5), vida:rv(0.2, 0.4), col:col || efecto().borde, tam:1}); }
/* la «sangre» es tinta: salpica y queda pegada en la piedra */
function tinta(x, y, n, f){ for(let i = 0; i < n; i++){ const a = rv(0, 6.28), v = rv(30, 150)*f; PARTS.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 30, vida:rv(0.4, 0.9), col:i % 3 ? '#1a0610' : '#8a1020', tam:rv(1, 2.5), g:1, mancha:true}); } }
function pasoParticulas(dt){
  for(let i = PARTS.length - 1; i >= 0; i--){ const p = PARTS[i]; p.vida -= dt; if(p.va) p.a += p.va*dt; if(p.g) p.vy += 380*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vx *= Math.exp(-dt*1.5);
    if(p.mancha){ const t = tile(Math.floor(p.x/CEL), Math.floor(p.y/CEL)); if(t === T_PIEDRA || t === T_DESM){ if(MANCHAS.length > 260) MANCHAS.shift(); MANCHAS.push({x:Math.round(p.x), y:Math.round(p.y), r:Math.round(p.tam), col:p.col}); PARTS.splice(i, 1); continue; } }
    if(p.vida <= 0) PARTS.splice(i, 1); }
  if(PARTS.length > 500) PARTS.splice(0, PARTS.length - 500);
}
function aviso(txt){ J.textos.push({x:NIN.x, y:NIN.y - 14, txt, t:1.1, grad:'blanco'}); }
/* en el menú el ninja salta solo y no tiene que sonar */
function sfx(n, o){ if(J.modo !== 'menu') SON.fx(n, o); }
function pan(x){ return lim((x - ANCHO/2)/(ANCHO/2), -1, 1)*0.7; }
