/* ================================================================ la jugabilidad
   Todo se muere de un golpe. Piñas que voltean, bates y caños que matan, cuchillos, katanas, armas de fuego
   con balas contadas que se pueden tirar por la cabeza, puertas que voltean, perros, gordos que sólo caen a
   tiros o a cuchillo. Los enemigos ven en un cono, oyen los tiros y corren por un campo de distancias. */
const J = {modo:'menu', t:0, tr:0, ts:1, pausa:false, cap:null, capIdx:0, pisoIdx:0, puntos:0, combo:0, comboT:0, maxCombo:0, bajas:0, armasUsadas:new Set(),
  reloj:0, limpio:false, fin:null, muerto:0, textos:[], hitstop:0, sacude:0, gen:0, aviso:null, avisoT:0};
const JUG = {x:0, y:0, vx:0, vy:0, ang:0, angMov:0, arma:null, balas:0, cd:0, golpeT:0, anim:0, muerto:false, mascara:'carpincho', vida:1, remate:null, invul:0, moviendo:false};
let ENEM = [], ITEMS = [], BALAS = [], CUERPOS = [], PARTS = [], RUIDOS = [];
const ESTADOS_PISO = [];
const R_JUG = 3.8, R_ENEM = 3.8;               /* cabe en una celda: los caminos van por el centro de las celdas */
const PERKS = {carpincho:{}, condor:{vel:1.25}, yaguarete:{pinaMata:true}, hornero:{puertaMata:true}, mulita:{vida:2}, vizcacha:{balas:1.5}};
const TIPOS = {
  patota: {vel:92, ronda:36, ropa:'patota', cabeza:'pelo', vida:1, puntos:400},
  guardia:{vel:96, ronda:38, ropa:'guardia', cabeza:'pelado', vida:1, puntos:400},
  fiesta: {vel:92, ronda:36, ropa:'fiesta', cabeza:'rubio', vida:1, puntos:400},
  gordo:  {vel:62, ronda:28, ropa:'gordo', cabeza:'gordo', vida:2, puntos:700, gordo:true},
  jefe:   {vel:88, ronda:30, ropa:'jefe', cabeza:'jefe', vida:6, puntos:3000, jefe:true},
  perro:  {vel:150, ronda:50, ropa:'perro', vida:1, puntos:300, perro:true}
};
/* lo que suena, con la censura puesta suena a dibujito */
/* la dificultad: en fácil la patota tarda más en reaccionar y en pegar, ve menos, tira más lento y torcido, y el pibe aguanta un golpe */
function DIF(){ return AJ.dificultad === 'facil' ? {reac:1.8, carga:1.7, bala:300, disp:2.2, vista:160, cono:0.85, vida:1} : {reac:1, carga:1, bala:430, disp:1.3, vista:210, cono:1.05, vida:0}; }
function vidaMax(){ return (PERKS[JUG.mascara].vida || 1) + DIF().vida; }
function fx(nom, o){ if(AJ.censura){ nom = {golpe:'bonk', muere:'pop', rematar:'boing', derribo:'noqueado', grito:'estrellitas', perro_muere:'pop', jugador_muere:'noqueado'}[nom] || nom; } SON.fx(nom, o); }
function pan(x){ return lim((x - JUG.x)/200, -1, 1); }

/* ---------- armar el piso con su gente ---------- */
function cargarPiso(i, desde){
  const cap = J.cap, def = cap.pisos[i]; J.pisoIdx = i; J.gen++;
  if(ESTADOS_PISO[i]){ const E = ESTADOS_PISO[i]; Object.assign(PISO, E.piso); ENEM = E.enem; ITEMS = E.items; CUERPOS = E.cuerpos; }
  else { armarPiso(def, (cap.estiloPisos && cap.estiloPisos[i]) || cap.estilo); ENEM = (def.enemigos || []).map(crearEnemigo); ITEMS = (def.armas || []).map(([k, x, y]) => ({k, x:x*CEL + 4, y:y*CEL + 4, ang:rv(0, 6.28), balas:ARMAS[k].balas || 0, vx:0, vy:0})); CUERPOS = []; }
  BALAS = []; PARTS = []; RUIDOS = []; J.textos = [];
  const p = desde === 'baja' ? def.llegaBaja || def.inicio : desde === 'sube' ? def.llegaSube || def.inicio : def.inicio;
  Object.assign(JUG, {x:p[0]*CEL + 4, y:p[1]*CEL + 4, vx:0, vy:0, muerto:false, remate:null, invul:0.6, golpeT:0, cd:0});
  JUG.vida = vidaMax();
  J.limpio = ENEM.every(e => e.muerto); J.muerto = 0; SON.filtroMuerte(false);
  CAMARA.x = JUG.x; CAMARA.y = JUG.y; J.campoT = 0;
}
function guardarPiso(){ ESTADOS_PISO[J.pisoIdx] = {piso:{...PISO}, enem:ENEM, items:ITEMS, cuerpos:CUERPOS}; }
function reiniciarPiso(){ delete ESTADOS_PISO[J.pisoIdx]; const armaAntes = J.armaEntrada; JUG.arma = armaAntes ? armaAntes.k : null; JUG.balas = armaAntes ? armaAntes.balas : 0;
  J.puntos = J.puntosEntrada; J.combo = 0; cargarPiso(J.pisoIdx, J.desdeEntrada); }
function crearEnemigo(d){
  const T = TIPOS[d.t];
  const e = {t:d.t, T, x:d.x*CEL + 4, y:d.y*CEL + 4, ang:(d.dir || 0)*Math.PI/180, arma:T.perro ? null : d.arma || null, balas:d.arma && ARMAS[d.arma] ? ARMAS[d.arma].balas*3 : 0,
    estado:d.ruta ? 'ronda' : 'quieto', ruta:d.ruta ? d.ruta.map(([x, y]) => ({x:x*CEL + 4, y:y*CEL + 4})) : null, ri:0, vida:T.vida, cd:rv(0.3, 0.8), reac:0, derribado:0, muerto:false,
    anim:rv(0, 9), vista:0, giroT:rv(2, 5), ang0:(d.dir || 0)*Math.PI/180, busca:null, golpeT:0, perdido:0};
  e.derribar = p => derribar(e, p);
  return e;
}
/* ---------- el jugador ---------- */
function pasoJugador(dt){
  if(JUG.muerto){ return; }
  JUG.invul = Math.max(0, JUG.invul - dt); JUG.cd -= dt; JUG.golpeT = Math.max(0, JUG.golpeT - dt);
  if(JUG.remate){ const r = JUG.remate; r.t -= dt; JUG.x += (r.e.x - JUG.x)*Math.min(1, dt*10); JUG.y += (r.e.y - JUG.y)*Math.min(1, dt*10);
    if(Math.floor(r.t*8) !== Math.floor((r.t + dt)*8)){ CAMARA.sacude = Math.max(CAMARA.sacude, 0.8); if(!AJ.censura){ sangre(r.e.x, r.e.y, rv(0, 6.28), 6); } fx('golpe', {x:0}); }
    if(r.t <= 0){ JUG.remate = null; matar(r.e, 'remate', rv(0, 6.28)); } return; }
  const vel = 112*(PERKS[JUG.mascara].vel || 1), mx = CTRL.mx, my = CTRL.my, n = Math.hypot(mx, my);
  JUG.moviendo = n > 0.15;
  const ox = JUG.x, oy = JUG.y;
  if(JUG.moviendo){ const k = Math.min(1, n); JUG.vx = mx/n*vel*k; JUG.vy = my/n*vel*k; JUG.angMov = Math.atan2(my, mx); JUG.anim += dt*k*9; }
  else { JUG.vx *= Math.exp(-dt*20); JUG.vy *= Math.exp(-dt*20); }
  moverCirculo(JUG, JUG.vx*dt, JUG.vy*dt, R_JUG);
  empujarPuertas(JUG, R_JUG, dt, true);
  if(chocaCirculo(JUG.x, JUG.y, R_JUG - 1)){ JUG.x = ox; JUG.y = oy; }
  if(chocaCirculo(JUG.x, JUG.y, R_JUG - 0.6)) desatascar(JUG, R_JUG);                  /* la puerta nunca lo mete en la pared */
  romperVidriosCerca(JUG.x, JUG.y, R_JUG + 2, Math.hypot(JUG.vx, JUG.vy) > 60);
  /* hacia dónde mira: la palanca derecha, o hacia donde camina */
  if(CTRL.apunta){ const b = blancoDir(CTRL.ax, CTRL.ay); J.blanco = b; const a = b ? Math.atan2(b.y - JUG.y, b.x - JUG.x) : Math.atan2(CTRL.ay, CTRL.ax); JUG.ang = a; }
  else { J.blanco = null; if(JUG.moviendo) JUG.ang = JUG.angMov; }
  if(CTRL.tira && JUG.cd <= 0) atacar();
  /* la escalera y el auto */
  const def = J.cap.pisos[J.pisoIdx], en = q => q && Math.hypot(JUG.x - (q[0]*CEL + 4), JUG.y - (q[1]*CEL + 4)) < 10;
  if(J.limpio && en(def.sube) && J.pisoIdx + 1 < J.cap.pisos.length){ cambiarPiso(J.pisoIdx + 1, 'sube'); return; }
  if(en(def.baja) && J.pisoIdx > 0 && J.salidaLista){ cambiarPiso(J.pisoIdx - 1, 'baja'); return; }
  if(!en(def.baja)) J.salidaLista = true;
  if(def.auto && J.capLimpio && en(def.auto)) terminarCapitulo();
}
function cambiarPiso(i, desde){ guardarPiso(); J.salidaLista = false; fx('puerta'); J.fundido = 1;
  cargarPiso(i, desde); J.armaEntrada = JUG.arma ? {k:JUG.arma, balas:JUG.balas} : null; J.puntosEntrada = J.puntos; J.desdeEntrada = desde;
  if(!J.limpio) SON.musica(J.cap.musica); }
/* ---------- apuntar: la mira se engancha al enemigo más cercano a donde apunta la palanca ---------- */
function blancoDir(ax, ay){
  const a0 = Math.atan2(ay, ax); let mejor = null, md = 0.5;
  for(const e of ENEM){ if(e.muerto) continue; const d = Math.hypot(e.x - JUG.x, e.y - JUG.y); if(d > 230) continue;
    let da = Math.abs(Math.atan2(e.y - JUG.y, e.x - JUG.x) - a0) % 6.2832; if(da > Math.PI) da = 6.2832 - da;
    const s = da + d*0.0015; if(s < md && seVe(JUG.x, JUG.y, e.x, e.y)){ md = s; mejor = e; } }
  return mejor;
}
/* ---------- atacar ---------- */
function atacar(){
  const A = JUG.arma ? ARMAS[JUG.arma] : null;
  if(!A || A.melee){ JUG.cd = A ? A.cad : 0.32; JUG.golpeT = 0.2; JUG.lado = -(JUG.lado || 1); fx(A ? A.sonido : 'pina', {x:0});
    const alc = (A ? A.alcance : 11) + R_ENEM + 4, arco = A ? A.arco*0.5 : 0.7;
    const vict = ENEM.filter(e => !e.muerto && Math.hypot(e.x - JUG.x, e.y - JUG.y) < alc + (e.t === 'perro' ? 3 : 0)).filter(e => { let da = Math.abs(Math.atan2(e.y - JUG.y, e.x - JUG.x) - JUG.ang) % 6.2832; if(da > Math.PI) da = 6.2832 - da; return da < arco + 0.35 || Math.hypot(e.x - JUG.x, e.y - JUG.y) < R_ENEM*2 + 2; })
      .filter(e => seVe(JUG.x, JUG.y, e.x, e.y));
    if(vict[0]){ const v = vict[0], dd = Math.hypot(v.x - JUG.x, v.y - JUG.y); if(dd > R_ENEM + R_JUG + 1) moverCirculo(JUG, (v.x - JUG.x)/dd*Math.min(6, dd - R_ENEM - R_JUG), (v.y - JUG.y)/dd*Math.min(6, dd - R_ENEM - R_JUG), R_JUG); }
    for(const e of vict.slice(0, A && A.corta ? 3 : 1)){
      const dir = Math.atan2(e.y - JUG.y, e.x - JUG.x);
      if(e.derribado > 0 && !A){ continue; }
      if(!A){ if(PERKS[JUG.mascara].pinaMata || e.T.perro) matar(e, 'pina', dir); else if(e.T.gordo || e.T.jefe){ empujar(e, dir, 60); fx('golpe', {x:pan(e.x)}); } else derribar(e, null, dir); }
      else if(A.corta){ e.vida -= 1; if(e.vida <= 0) matar(e, JUG.arma === 'katana' ? 'corte' : 'cuchillo', dir); else { empujar(e, dir, 50); sangre(e.x, e.y, dir, 6); fx('golpe', {x:pan(e.x)}); } }
      else { if(e.T.gordo || e.T.jefe){ empujar(e, dir, 70); fx('golpe', {x:pan(e.x)}); } else matar(e, 'golpe', dir); }
      J.armasUsadas.add(JUG.arma || 'puno'); }
    return; }
  if(JUG.balas <= 0){ JUG.cd = 0.25; fx('sin_balas'); aviso(tr('SIN BALAS: TIRALA'), 1); return; }
  JUG.cd = A.cad; JUG.balas--; J.armasUsadas.add(JUG.arma);
  const bx = JUG.x + Math.cos(JUG.ang)*9, by = JUG.y + Math.sin(JUG.ang)*9;
  for(let i = 0; i < A.perd; i++){ const a = JUG.ang + rv(-A.dispersion, A.dispersion); BALAS.push({x:JUG.x, y:JUG.y, px:JUG.x, py:JUG.y, vx:Math.cos(a)*620, vy:Math.sin(a)*620, de:'jug', vida:0.6}); }
  fx(A.sonido, {x:0}); CAMARA.sacude = Math.max(CAMARA.sacude, A.perd > 1 ? 1.2 : 0.35); POST.aber = Math.max(POST.aber, A.perd > 1 ? 1.4 : 0.5); vibrar(10);
  fogonazo(bx, by, JUG.ang);
  PARTS.push({x:JUG.x, y:JUG.y, vx:Math.cos(JUG.ang + 1.6)*60 + rv(-20, 20), vy:Math.sin(JUG.ang + 1.6)*60 + rv(-20, 20), vida:0.5, col:'#e8c040', tam:1, casq:true});
  ruido(JUG.x, JUG.y, A.ruido); luego(0.22, () => fx('casquillo', {x:0, vol:0.4}));
}
/* un tiro se oye: los que estén cerca van a ver */
function ruido(x, y, r){ if(r < 60) return; let f = null;
  for(const e of ENEM){ if(e.muerto || e.derribado > 0 || e.estado === 'alerta') continue; if(Math.hypot(e.x - x, e.y - y) > r) continue; if(!f) f = campo(x, y); e.estado = 'busca'; e.busca = {x, y, f, t:0}; } }
/* tirar el arma que tenés en la mano: voltea a quien le pegue */
function tirarArma(){
  if(!JUG.arma) return; const k = JUG.arma;
  ITEMS.push({k, x:JUG.x + Math.cos(JUG.ang)*6, y:JUG.y + Math.sin(JUG.ang)*6, ang:JUG.ang, balas:JUG.balas, vx:Math.cos(JUG.ang)*360, vy:Math.sin(JUG.ang)*360, vuela:0.9, giro:14});
  JUG.arma = null; JUG.balas = 0; fx('tirar'); JUG.cd = 0.2;
}
function agarrar(it){
  if(JUG.arma) ITEMS.push({k:JUG.arma, x:JUG.x, y:JUG.y, ang:JUG.ang + 2, balas:JUG.balas, vx:0, vy:0});
  JUG.arma = it.k; JUG.balas = Math.round(it.balas*(it.recogida ? 1 : PERKS[JUG.mascara].balas || 1)); it.recogida = true; ITEMS.splice(ITEMS.indexOf(it), 1); fx('agarrar'); JUG.cd = 0.15;
  aviso(tr(ARMAS[JUG.arma].nombre), 0.9);
}
/* el botón de acción: rematar, agarrar o tirar, según lo que tengas cerca */
function accionDisponible(){
  if(JUG.muerto || JUG.remate) return null;
  const caido = ENEM.find(e => !e.muerto && e.derribado > 0 && Math.hypot(e.x - JUG.x, e.y - JUG.y) < 15);
  if(caido) return {k:'rematar', e:caido};
  let it = null, md = 16; for(const q of ITEMS){ const d = Math.hypot(q.x - JUG.x, q.y - JUG.y); if(!q.vuela && d < md){ md = d; it = q; } }
  if(it) return {k:'agarrar', it};
  if(JUG.arma) return {k:'tirar'};
  return null;
}
function hacerAccion(){ const a = accionDisponible(); if(!a) return;
  if(a.k === 'rematar'){ JUG.remate = {e:a.e, t:AJ.censura ? 0.35 : 0.55}; a.e.rematado = true; JUG.ang = Math.atan2(a.e.y - JUG.y, a.e.x - JUG.x); fx('rematar'); }
  else if(a.k === 'agarrar') agarrar(a.it); else tirarArma(); }
/* ---------- enemigos ---------- */
function derribar(e, puerta, dir){
  if(e.muerto || e.derribado > 0) return;
  if(puerta && PERKS[JUG.mascara].puertaMata){ matar(e, 'puerta', Math.atan2(e.y - puerta.hy, e.x - puerta.hx)); return; }
  if(e.T.perro){ matar(e, puerta ? 'puerta' : 'pina', dir || 0); return; }
  if(e.T.jefe){ empujar(e, dir || 0, 40); return; }
  e.derribado = 2.8; e.estado = 'alerta'; e.reac = 0; e.carga = 0; fx(puerta ? 'puerta_golpe' : 'derribo', {x:pan(e.x)}); CAMARA.sacude = Math.max(CAMARA.sacude, 0.6);
  if(e.arma){ ITEMS.push({k:e.arma, x:e.x, y:e.y, ang:rv(0, 6.28), balas:Math.min(e.balas, ARMAS[e.arma].balas || 0), vx:Math.cos(dir || 0)*80, vy:Math.sin(dir || 0)*80, vuela:0.25}); e.arma = null; }
  if(puerta){ puntos(e, 300, tr('¡PORTAZO!')); }
  e.caeAng = (dir || 0);
}
function empujar(e, dir, f){ moverCirculo(e, Math.cos(dir)*f*0.12, Math.sin(dir)*f*0.12, R_ENEM); }
function matar(e, como, dir){
  if(e.muerto) return;
  if(e.T.jefe && como !== 'remate' && --e.vida > 0){ empujar(e, dir, 60); sangre(e.x, e.y, dir, 10); fx('golpe', {x:pan(e.x)}); CAMARA.sacude = 1; e.estado = 'alerta'; if(e.vida <= 2) e.derribado = 2.2; return; }
  e.muerto = true; e.derribado = 0; J.bajas++;
  const pts = {remate:800, puerta:600, pina:500, golpe:500, corte:600, cuchillo:550, bala:350, tirada:500}[como] || 400;
  if(e.arma){ ITEMS.push({k:e.arma, x:e.x, y:e.y, ang:rv(0, 6.28), balas:Math.min(e.balas, ARMAS[e.arma].balas || 0), vx:Math.cos(dir)*60, vy:Math.sin(dir)*60, vuela:0.2}); e.arma = null; }
  const tipo = como === 'corte' ? 'corte' : 'golpe';
  const img = hacerCadaver(e.T.perro ? 'perro' : e.T.ropa, e.T.cabeza || 'pelo', AJ.censura ? 'golpe' : tipo, Math.floor(e.x*7 + e.y*3));
  CUERPOS.push({x:e.x + Math.cos(dir)*4, y:e.y + Math.sin(dir)*4, ang:dir, img, t:0, cens:AJ.censura});
  if(AJ.censura){ confeti(e.x, e.y, 18); } else { charco(e.x + Math.cos(dir)*4, e.y + Math.sin(dir)*4, dir, como === 'bala' ? 1 : como === 'remate' ? 2.5 : 1.5); sangre(e.x, e.y, dir, 16); }
  fx(e.T.perro ? 'perro_muere' : 'muere', {x:pan(e.x)}); if(!e.T.perro && Math.random() < 0.4) fx('grito', {x:pan(e.x), vol:0.6});
  CAMARA.sacude = Math.max(CAMARA.sacude, 1.1); J.hitstop = como === 'remate' ? 0.08 : 0.04; POST.aber = Math.max(POST.aber, 2.2); vibrar(25);
  /* el combo */
  J.combo = J.comboT > 0 ? J.combo + 1 : 1; J.comboT = 3.2; J.maxCombo = Math.max(J.maxCombo, J.combo); if(J.combo > 1) fx('combo', {n:Math.min(10, J.combo)});
  const nombre = AJ.censura ? {remate:tr('¡ATADO!'), puerta:tr('¡PORTAZO!'), corte:tr('¡NOCAUT!'), bala:tr('¡NOCAUT!')}[como] || tr('¡NOCAUT!') : {remate:tr('¡REMATE!'), puerta:tr('¡PORTAZO!'), corte:tr('¡TAJO!'), tirada:tr('¡AL VUELO!')}[como];
  puntos(e, e.T.puntos + pts, nombre);
  if(ENEM.every(q => q.muerto)) pisoLimpio();
}
function puntos(e, base, txt){ const p = Math.round(base*(1 + 0.5*lim(J.combo - 1, 0, 6))); J.puntos += p;
  J.textos.push({x:e.x, y:e.y - 8, txt:'+' + p + tr('PTS'), t:1.3, grad:'rosa'}); if(txt) J.textos.push({x:e.x, y:e.y - 18, txt, t:1.3, grad:'cian'}); }
function pisoLimpio(){
  J.limpio = true; fx('piso_limpio'); CAMARA.sacude = 1.4;
  const ultimo = J.pisoIdx === J.cap.pisos.length - 1;
  if(ultimo || J.cap.pisos.slice(J.pisoIdx + 1).every((_, k) => ESTADOS_PISO[J.pisoIdx + 1 + k] && ESTADOS_PISO[J.pisoIdx + 1 + k].enem.every(q => q.muerto))){ J.capLimpio = true; SON.musica('limpio'); aviso(tr('¡PISO LIMPIO! VOLVÉ AL AUTO'), 3.5); }
  else aviso(tr('¡PISO LIMPIO! SUBÍ'), 3);
}
/* el campo de distancias hacia el jugador, compartido por todos los que lo persiguen */
let CAMPO_J = null;
function pasoEnemigos(dt){
  J.campoT = (J.campoT || 0) - dt; if(J.campoT <= 0){ CAMPO_J = campo(JUG.x, JUG.y); J.campoT = 0.2; }
  for(const e of ENEM){
    if(e.muerto) continue;
    e.anim += dt; e.golpeT = Math.max(0, e.golpeT - dt); e.cd -= dt;
    if(e.derribado > 0){ e.derribado -= dt; if(e.derribado <= 0 && !e.rematado){ e.estado = 'alerta'; e.reac = 0.2; } continue; }
    const dx = JUG.x - e.x, dy = JUG.y - e.y, d = Math.hypot(dx, dy), aJ = Math.atan2(dy, dx);
    let da = Math.abs(aJ - e.ang) % 6.2832; if(da > Math.PI) da = 6.2832 - da;
    const D = DIF(), ve = !JUG.muerto && d < D.vista && (da < D.cono || d < 30 || e.estado === 'alerta') && seVe(e.x, e.y, JUG.x, JUG.y);
    /* como en el original: el que te ve de lejos, de costado o de espaldas tarda más en reaccionar */
    if(ve){ if(e.estado !== 'alerta'){ e.estado = 'alerta'; e.reac = 0; e.reacNec = D.reac*(e.T.jefe ? 0.6 : 1)*(0.3 + d/210*0.35 + (da > 0.6 ? 0.2 : 0) + rv(0, 0.15)); fx(e.T.perro ? 'perro' : 'alerta', {x:pan(e.x), vol:0.7}); } e.perdido = 0; e.reac += dt; e.visto = {x:JUG.x, y:JUG.y}; }
    else if(e.estado === 'alerta'){ e.perdido += dt; }
    const vel = e.estado === 'alerta' ? e.T.vel : e.T.ronda;
    let obj = null;
    if(e.estado === 'alerta'){
      const A = e.arma && ARMAS[e.arma], armado = A && !A.melee;
      if(armado && ve){ girarHacia(e, aJ, dt*9);
        if(e.reac > (e.reacNec || 0.5) && e.cd <= 0 && Math.abs(angDif(e.ang, aJ)) < 0.25){ dispararEnemigo(e, A); }
        if(d > 70) obj = pasoCampo(CAMPO_J, e.x, e.y); }
      else { obj = ve && d < 40 ? {x:JUG.x, y:JUG.y} : pasoCampo(CAMPO_J, e.x, e.y); if(ve) girarHacia(e, aJ, dt*10);
        /* como en el original: llegar no es pegar. Se para, levanta (la carga se ve) y recién ahí baja el golpe;
           su alcance es más corto que el del pibe, así el que reacciona a tiempo pega primero */
        const alc = (A ? A.alcance*0.85 : 8) + R_JUG + (e.T.perro ? 2 : 0);
        if(e.carga > 0){ obj = null; e.carga -= dt;
          if(e.carga <= 0){ e.carga = 0; e.cd = (A ? A.cad : 0.5) + 0.35; e.golpeT = 0.2; fx(A ? A.sonido : e.T.perro ? 'perro' : 'pina', {x:pan(e.x)});
            if(d < alc + 3 && Math.abs(angDif(e.ang, aJ)) < 0.8) golpearJugador(aJ); } }
        else if(ve && d < alc + 2 && e.cd <= 0 && e.reac > 0.12*D.reac){ e.carga = e.cargaT = (e.T.perro ? 0.22 : A ? 0.34 : 0.3)*D.carga; obj = null; } }
      if(!ve && e.perdido > 7){ e.estado = 'busca'; e.busca = {x:e.visto ? e.visto.x : e.x, y:e.visto ? e.visto.y : e.y, f:campo(e.visto ? e.visto.x : e.x, e.visto ? e.visto.y : e.y), t:0}; } }
    else if(e.estado === 'busca' && e.busca){ const b = e.busca; obj = pasoCampo(b.f, e.x, e.y); if(!obj || Math.hypot(b.x - e.x, b.y - e.y) < 12){ b.t += dt; obj = null; e.ang += dt*1.4; if(b.t > 3){ e.estado = 'quieto'; e.ang0 = e.ang; } } }
    else if(e.estado === 'ronda' && e.ruta){ const q = e.ruta[e.ri]; if(Math.hypot(q.x - e.x, q.y - e.y) < 6){ e.ri = (e.ri + 1) % e.ruta.length; } obj = q; }
    else { e.giroT -= dt; if(e.giroT <= 0){ e.giroT = rv(2.5, 6); e.angObj = e.ang0 + rv(-1.2, 1.2); } if(e.angObj !== undefined) girarHacia(e, e.angObj, dt*2); }
    if(obj){ const ox = obj.x - e.x, oy = obj.y - e.y, n = Math.hypot(ox, oy) || 1, pa = Math.atan2(oy, ox);
      if(!(e.estado === 'alerta' && ve)) girarHacia(e, pa, dt*8);
      moverCirculo(e, ox/n*vel*dt, oy/n*vel*dt, R_ENEM); e.moviendo = true; } else e.moviendo = false;
    empujarPuertas(e, R_ENEM, dt, false); romperVidriosCerca(e.x, e.y, R_ENEM + 2, e.estado === 'alerta');
    if(chocaCirculo(e.x, e.y, R_ENEM - 0.6)) desatascar(e, R_ENEM);
  }
  /* que no se encimen, ni entre ellos ni con el pibe */
  if(!JUG.muerto) for(const e of ENEM){ if(e.muerto || e.derribado > 0) continue; const dx = e.x - JUG.x, dy = e.y - JUG.y, d = Math.hypot(dx, dy) || 0.01, m = R_ENEM + R_JUG;
    if(d < m){ const k = (m - d)/2, ux = d > 0.02 ? dx/d : Math.cos(e.ang + 3.14), uy = d > 0.02 ? dy/d : Math.sin(e.ang + 3.14); moverCirculo(e, ux*k, uy*k, R_ENEM); moverCirculo(JUG, -ux*k, -uy*k, R_JUG); } }
  for(let i = 0; i < ENEM.length; i++) for(let k = i + 1; k < ENEM.length; k++){ const a = ENEM[i], b = ENEM[k]; if(a.muerto || b.muerto) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if(d < R_ENEM*2 && d > 0.01){ const e2 = (R_ENEM*2 - d)/2; moverCirculo(a, -dx/d*e2, -dy/d*e2, R_ENEM); moverCirculo(b, dx/d*e2, dy/d*e2, R_ENEM); } }
}
/* si algo lo dejó metido en la pared (un portazo, un empujón), vuelve a la celda libre más cercana */
function desatascar(o, r){ const cx = Math.floor(o.x/CEL), cy = Math.floor(o.y/CEL);
  for(let d = 0; d <= 3; d++) for(let y = cy - d; y <= cy + d; y++) for(let x = cx - d; x <= cx + d; x++){ if(Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== d) continue;
    const px2 = x*CEL + CEL/2, py2 = y*CEL + CEL/2; if(!chocaCirculo(px2, py2, r)){ o.x = px2; o.y = py2; return; } } }
function angDif(a, b){ let d = (b - a) % 6.2832; if(d > Math.PI) d -= 6.2832; if(d < -Math.PI) d += 6.2832; return d; }
function girarHacia(e, a, k){ e.ang += angDif(e.ang, a)*Math.min(1, k); }
function dispararEnemigo(e, A){
  if(e.balas <= 0){ e.arma = null; return; }
  e.cd = A.cad*(A.auto ? 1.6 : 2.2) + rv(0.05, 0.25); e.balas--;
  for(let i = 0; i < A.perd; i++){ const D = DIF(), a = e.ang + rv(-A.dispersion, A.dispersion)*D.disp; BALAS.push({x:e.x, y:e.y, px:e.x, py:e.y, vx:Math.cos(a)*D.bala, vy:Math.sin(a)*D.bala, de:'ene', vida:0.8}); }
  fx(A.sonido, {x:pan(e.x), vol:0.8}); fogonazo(e.x + Math.cos(e.ang)*9, e.y + Math.sin(e.ang)*9, e.ang);
}
function golpearJugador(dir){ if(JUG.invul > 0 || JUG.muerto || J.fin) return;
  if(--JUG.vida > 0){ JUG.invul = 1.2; CAMARA.sacude = 1.6; POST.destello = 0.3; fx('golpe'); aviso(JUG.mascara === 'mulita' ? tr('¡LA MULITA AGUANTÓ!') : tr('¡AGUANTASTE!'), 1.5); return; }
  morirJugador(dir); }
function morirJugador(dir){
  JUG.muerto = true; J.muerto = 0.001; J.combo = 0; fx('jugador_muere'); SON.filtroMuerte(true); CAMARA.sacude = 2; POST.aber = 3; vibrar(80);
  if(!AJ.censura){ charco(JUG.x, JUG.y, dir, 2); sangre(JUG.x, JUG.y, dir, 20); } else confeti(JUG.x, JUG.y, 20);
  JUG.cuerpo = hacerCadaver('pibe', JUG.mascara, 'golpe', 7); JUG.cuerpoAng = dir;
}
/* ---------- balas, armas que vuelan, vidrios ---------- */
function pasoBalas(dt){
  for(let i = BALAS.length - 1; i >= 0; i--){ const b = BALAS[i]; b.vida -= dt; b.px = b.x; b.py = b.y; let muere = b.vida <= 0;
    const n = Math.ceil(Math.hypot(b.vx, b.vy)*dt/3);
    for(let k = 0; k < n && !muere; k++){ b.x += b.vx*dt/n; b.y += b.vy*dt/n;
      const c = celdaEn(b.x, b.y);
      if(c === 'v' && !PISO.rotos.has(Math.floor(b.x/CEL) + ',' + Math.floor(b.y/CEL))){ romperVidrio(Math.floor(b.x/CEL), Math.floor(b.y/CEL)); }
      else if(c === '#' || c === ' '){ muere = true; chispas(b.x - b.vx*0.004, b.y - b.vy*0.004, 4); fx('rebote', {x:pan(b.x), vol:0.3}); break; }
      for(const p of PISO.puertas){ const q = puntaPuerta(p); if(distSeg(b.x, b.y, p.hx, p.hy, q.x, q.y).d < 1.2){ muere = true; chispas(b.x, b.y, 3); break; } }
      if(muere) break;
      if(b.de === 'jug'){ for(const e of ENEM){ if(e.muerto || e.derribado > 0) continue; if(Math.hypot(e.x - b.x, e.y - b.y) < R_ENEM + 2.2){ muere = true; const dir = Math.atan2(b.vy, b.vx); if(e.derribado > 0 || !e.T.gordo || --e.vida <= 0) matar(e, 'bala', dir); else { sangre(e.x, e.y, dir, 6); empujar(e, dir, 50); } break; } } }
      else if(!JUG.muerto && Math.hypot(JUG.x - b.x, JUG.y - b.y) < R_JUG){ muere = true; golpearJugador(Math.atan2(b.vy, b.vx)); } }
    if(muere) BALAS.splice(i, 1); }
  /* las armas tiradas vuelan, giran, voltean y caen */
  for(const it of ITEMS){ if(!it.vuela) continue; it.vuela -= dt; const ox = it.x, oy = it.y;
    const choco = moverCirculo(it, it.vx*dt, it.vy*dt, 2); it.ang += (it.giro || 6)*dt;
    if(it.giro){ for(const e of ENEM){ if(e.muerto || e.derribado > 0) continue; if(Math.hypot(e.x - it.x, e.y - it.y) < R_ENEM + 3){ const dir = Math.atan2(it.vy, it.vx);
      if(it.k === 'cuchillo' || it.k === 'katana') matar(e, 'tirada', dir); else derribar(e, null, dir); it.vx *= -0.2; it.vy *= -0.2; it.vuela = Math.min(it.vuela, 0.15); it.giro = 0; break; } } }
    if(choco){ it.vx *= -0.3; it.vy *= -0.3; it.giro = 0; if(Math.hypot(it.vx, it.vy) > 40) fx('rebote', {x:pan(it.x), vol:0.4}); }
    it.vx *= Math.exp(-dt*3); it.vy *= Math.exp(-dt*3); if(it.vuela <= 0){ it.vuela = 0; it.giro = 0; } }
}
function romperVidrio(cx, cy){ const k = cx + ',' + cy; if(PISO.rotos.has(k)) return;
  /* la ventana entera de al lado también */
  const pend = [[cx, cy]]; while(pend.length){ const [x, y] = pend.pop(); const kk = x + ',' + y; if(PISO.rotos.has(kk) || !PISO.mapa[y] || PISO.mapa[y][x] !== 'v') continue; PISO.rotos.add(kk); PISO.bloqueo[y*PISO.w + x] = 0;
    for(let i = 0; i < 5; i++) PARTS.push({x:x*CEL + rv(0, 8), y:y*CEL + rv(0, 8), vx:rv(-90, 90), vy:rv(-90, 90), vida:rv(0.3, 0.7), col:'#b8f0ff', tam:1, piso:true});
    pend.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  fx('vidrio'); ruido(cx*CEL, cy*CEL, 140);
}
function romperVidriosCerca(x, y, r, fuerte){ if(!fuerte) return; for(let cy = Math.floor((y - r)/CEL); cy <= Math.floor((y + r)/CEL); cy++) for(let cx = Math.floor((x - r)/CEL); cx <= Math.floor((x + r)/CEL); cx++) if(PISO.mapa[cy] && PISO.mapa[cy][cx] === 'v') romperVidrio(cx, cy); }
/* ---------- partículas ---------- */
function sangre(x, y, dir, n){ if(AJ.censura){ estrellas(x, y, Math.ceil(n/4)); return; } for(let i = 0; i < n; i++){ const a = dir + rv(-0.7, 0.7), v = rv(40, 180); PARTS.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, vida:rv(0.2, 0.5), col:COL_SANGRE[i % 3], tam:rv(1, 2), mancha:true}); } }
function confeti(x, y, n){ for(let i = 0; i < n; i++){ const a = rv(0, 6.28), v = rv(30, 140); PARTS.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, vida:rv(0.4, 0.9), col:COL_CENSURA[i % 4], tam:1}); } }
function estrellas(x, y, n){ for(let i = 0; i < n; i++){ const a = rv(0, 6.28); PARTS.push({x, y, vx:Math.cos(a)*50, vy:Math.sin(a)*50, vida:0.5, col:'#ffd84a', tam:2}); } }
function chispas(x, y, n){ for(let i = 0; i < n; i++){ const a = rv(0, 6.28), v = rv(40, 120); PARTS.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, vida:rv(0.08, 0.2), col:'#fff0a0', tam:1}); } }
function fogonazo(x, y, a){ for(let i = 0; i < 5; i++){ const b = a + rv(-0.4, 0.4), v = rv(60, 160); PARTS.push({x, y, vx:Math.cos(b)*v, vy:Math.sin(b)*v, vida:0.06, col:i ? '#ffd060' : '#ffffff', tam:2, luz:true}); } J.luz = {x, y, t:0.06}; }
function pasoParticulas(dt){
  for(let i = PARTS.length - 1; i >= 0; i--){ const p = PARTS[i]; p.vida -= dt; const f = Math.exp(-dt*(p.casq ? 6 : 5)); p.vx *= f; p.vy *= f; p.x += p.vx*dt; p.y += p.vy*dt;
    if(p.vida <= 0){ if(p.mancha) mancha(p.x, p.y, Math.round(p.tam), p.col); if(p.piso && PISO.cxDeco){ PISO.cxDeco.fillStyle = '#c8f4ff'; PISO.cxDeco.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      if(p.casq){ const g = PISO.cxDeco; if(g){ g.fillStyle = '#c8a030'; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); } } PARTS.splice(i, 1); } }
  for(const t of J.textos){ t.t -= dt; t.y -= dt*14; } J.textos = J.textos.filter(t => t.t > 0);
}
function aviso(txt, t){ J.aviso = txt; J.avisoT = t || 2; }
