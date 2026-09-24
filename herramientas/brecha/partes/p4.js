
/* ====================== estado ====================== */
const J = {modo:'menu', demo:false, bot:false, dios:false, mi:0, mis:null, tema:TEMAS[0], t:0, tt:0, lento:0, escala:1, afuera:false, tension:0,
  enemigos:[], civiles:[], cohetes:[], balas:[], granadas:[], etapas:[], ei:0, et:null, cuartos:[], jug:null, stats:null, fin:null, vehiculos:[], heli:null,
  textos:[], marcas:[], danos:[], flashT:0, alerta:0, viento:0, puertoD:null, reloj:0, mensaje:'', objetivo:'', seed:''};
let idE = 0;
const IN = {fuego:false, fuegoP:false, apuntar:false, apuntarT:false, cubrir:false, recargar:false, arma:false, granada:false, brecha:false, aire:false, dx:0, dy:0};

/* ====================== jugador ====================== */
function crearJugador(){
  const eq = G.equipo, hpMax = 100 + 30*eq.chaleco, prim = J.mis.tipo==='franco' ? 'l96' : G.primaria, sec = G.secundaria;
  const j = {hp:hpMax, hpMax, pos:V3(0,1.62,0), base:0, yaw:0, pitch:0, retY:0, retP:0, cubT:0, cubierto:false, zoom:0, armas:[prim, sec], ai:0, carg:{}, res:{},
    recarga:0, cadT:0, granadas:eq.granadas, botiquin:eq.botiquin, aire:0, aireCd:0, sinDano:0, caminando:false, bob:0, muerto:false, mira:{x:0, y:0}};
  for(const id of j.armas){ const A = ARMAS[id], c = Math.round(A.carg*(tieneMej(id,'carg') ? 1.4 : 1)); j.carg[id] = c; j.res[id] = A.res; }
  return j;
}
const armaJ = ()=> J.jug.armas[J.jug.ai];
function cargadorMax(id){ return Math.round(ARMAS[id].carg*(tieneMej(id,'carg') ? 1.4 : 1)); }

/* ====================== armar la misión ====================== */
function iniciarMision(mi, sem){
  costoDeNuevo();
  const mis = MISIONES[mi]; J.mi = mi; J.mis = mis; J.tema = TEMAS[mis.tema]; J.seed = sem || ('' + (Date.now()%1000000));
  rnd = mulberry(semilla32(J.seed + '#' + mis.id));
  for(const e of J.enemigos.concat(J.civiles)) if(e.cuerpo) escena.remove(e.cuerpo.g);
  for(const v of J.vehiculos) escena.remove(v.g); if(J.heli) escena.remove(J.heli.g);
  for(const c of J.cohetes) escena.remove(c.m);
  for(const tr of RUTA.tramos){ escena.remove(tr.malla); } RUTA.tramos = [];
  limpiarMundo(); limpiarFX();
  J.vip = null; J.jefe = null; J.escolta = null; J.enemigos = []; J.civiles = []; J.cohetes = []; J.balas = []; J.granadas = []; J.vehiculos = []; J.heli = null; J.etapas = []; J.ei = 0; J.et = null;
  J.textos = []; J.marcas = []; J.danos = []; J.fin = null; J.lento = 0; J.escala = 1; J.flashT = 0; J.alerta = 0; J.t = 0; J.tt = 0; J.tension = 0; J.reloj = mis.tiempo; idE = 0;
  J.stats = {disparos:0, aciertos:0, cabezas:0, bajas:0, rehenes:0, rehenesTot:0, recibido:0, t:0, alarma:false};
  aplicarTema(J.tema); J.afuera = mis.tipo==='franco' || mis.tipo==='convoy'; ambienteAudio(mis.id);
  J.jug = crearJugador(); armarVM(armaJ());
  if(mis.tipo==='franco') armarPuerto(); else if(mis.tipo==='convoy') armarConvoy(); else armarInterior();
  /* adentro, el techo taparía la clave: sin sombras (y más barato); afuera, con sombras */
  sol.castShadow = J.afuera && ren.shadowMap.enabled && CALIDAD >= 0.75; for(const m of MUNDO.mallas) m.receiveShadow = J.afuera;
  J.modo = J.demo ? 'menu' : 'juego';
}
/* --- interiores: una etapa por cuarto --- */
function armarInterior(){
  const cs = J.cuartos = generarInterior(J.mis, J.tema);
  const j = J.jug; j.pos.set(cs[0].xEnt, 1.62, cs[0].z0 + 2); j.base = 0;
  for(let i=0;i<cs.length;i++){ const c = cs[i], p = c.plan;
    if(p.ev==='brecha'){ J.etapas.push({tipo:'mover', a:V3(c.xEnt, 1.62, c.z0 + 1.1)}); J.etapas.push({tipo:'brecha', c}); J.etapas.push({tipo:'mover', a:V3(c.xSal, 1.62, c.z1 + 1.2), vel:2.6}); }
    else if(p.ev==='apariciones'){ J.etapas.push({tipo:'mover', a:V3(c.xEnt, 1.62, c.z0 - 1)}); J.etapas.push({tipo:'apariciones', c}); J.etapas.push({tipo:'mover', a:V3(c.xSal, 1.62, c.z1 + 1.2)}); }
    else if(p.ev==='nada'){ J.etapas.push({tipo:'mover', a:V3(c.xSal, 1.62, c.z1 + 1.2), msj:J.mis.nom}); }
    else { J.etapas.push({tipo:'mover', a:V3(c.cubierta.x, 1.62, c.cubierta.z)}); J.etapas.push({tipo:p.ev, c}); J.etapas.push({tipo:'mover', a:V3(c.xSal, 1.62, c.z1 + 1.2)}); }
  }
  J.etapas.push({tipo:'fin'});
  /* los cuartos de brecha ya tienen gente adentro: se crean al llegar, para no pagar el dibujo antes */
}
/* --- puerto: tres puestos de francotirador --- */
function armarPuerto(){
  J.puertoD = generarPuerto(J.tema); const P = J.puertoD.puestos;
  for(let i=0;i<P.length;i++) J.etapas.push({tipo:'franco', i, p:P[i]});
  J.etapas.push({tipo:'fin'});
  const j = J.jug; j.pos.set(P[0].x, P[0].y, P[0].z); j.base = P[0].mira;
}
/* --- convoy: la camioneta propia avanza y la ruta se recicla --- */
function armarConvoy(){
  J.camion = camioneta('#e8e8e8', true); J.camion.position.set(-4, 0, 0); dinamico(J.camion); J.camionZ = 0;
  /* la escolta: una SUV propia adelante (sólo decorado; al convoy se lo cuida a él) */
  J.escolta = vehGLB('veh_suv', '#2a2d31', 5.0); if(J.escolta){ J.escolta.position.set(-4, 0, -17); dinamico(J.escolta); }
  for(let k=0;k<5;k++) RUTA.tramos.push(tramoRuta(60 - k*RUTA.largo, J.tema));
  J.etapas.push({tipo:'convoy', t:0, olas:planConvoy()}); J.etapas.push({tipo:'fin'});
  J.jug.base = -Math.PI/2; J.jug.pos.set(-4, 2.15, 1.2);
}
function planConvoy(){ const L = [];
  L.push({t:4, ev:'motos', n:2}); L.push({t:16, ev:'camioneta'}); L.push({t:30, ev:'puente'}); L.push({t:40, ev:'camioneta'}); L.push({t:44, ev:'motos', n:1});
  L.push({t:60, ev:'rpg'}); L.push({t:74, ev:'camioneta'}); L.push({t:78, ev:'motos', n:2}); L.push({t:92, ev:'puente'}); L.push({t:100, ev:'rpg'}); L.push({t:118, ev:'heli'});
  for(const o of L) o.t += rf(-1.5, 1.5); return L; }

/* ====================== enemigos ====================== */
function crearEnemigo(tipo, pos, o){
  const def = ENEMIGOS[tipo], dif = J.mis.dif;
  const e = Object.assign({id:++idE, tipo, def, hp:def.hp*(0.85 + dif*0.15), pos:pos.clone(), rumbo:Math.PI, estado:'llegar', t:0, agache:0, apunta:0, fase:Math.random()*6, moviendo:false, vivo:true, esc:def.jefe ? 1.45 : 1,
    retro:0, fl:null, destino:null, placas:def.placas ? Object.assign({}, def.placas) : null, disparos:0, avisoT:0, aturdido:0, reaccion:rf(0.3, 0.8), piso:pos.y}, o||{});
  if(e.placas) for(const k in e.placas) e.placas[k] *= (0.85 + dif*0.15);
  e.hpMax = e.hp; e.cuerpo = crearCuerpo(def, false, tipo); escena.add(e.cuerpo.g); J.enemigos.push(e); return e;
}
function crearCivil(pos, o){
  const e = Object.assign({id:++idE, tipo:'civil', def:{}, hp:1, pos:pos.clone(), rumbo:0, estado:'quieto', agache:1, apunta:0, fase:0, vivo:true, esc:1, levanta:true, civil:true, piso:pos.y}, o||{});
  e.cuerpo = crearCuerpo({}, true, 'civil'); escena.add(e.cuerpo.g); J.civiles.push(e); J.stats.rehenesTot++; return e;
}
const vivos = ()=> J.enemigos.filter(e=> e.vivo);
const mirarA = (e, p)=> Math.atan2(p.x - e.pos.x, p.z - e.pos.z);
function camPos(){ return cam.position; }
/* oleadas de un cuarto: cada enemigo sale de una puerta o hueco y va a un puesto libre */
function tiposPara(c, ola){ const m = J.mis, p = c.plan, L = [];
  const n = Math.min(7, Math.round((2 + ola + (p.tipo==='nave' ? 1 : 0))*(0.8 + m.dif*0.25)));
  for(let k=0;k<n;k++){ let t = 'tirador'; const r = rnd();
    if(p.pesado && k===0 && ola===(p.olas||1)-1) t = 'pesado'; else if(p.escudo && k===1) t = 'escudo';
    else if(r < 0.18 + m.dif*0.05) t = 'escopeta'; else if(r < 0.26 + m.dif*0.05 && m.dif > 1.1) t = 'rpg';
    L.push(t); }
  return L; }
function lanzarOla(c, ola){
  const tipos = tiposPara(c, ola); let dem = 0;
  for(const tipo of tipos){
    const libres = c.puestos.filter(q=> !q.ocupado); const pu = libres.length ? elegir(libres) : null;
    const ap = elegir(c.aparece); const ini = acomodar(V3(ap.x, 0, ap.z));
    const e = crearEnemigo(tipo, ini, {cuarto:c, espera:dem});
    if(pu){ pu.ocupado = e; e.puesto = pu; e.destino = acomodar(V3(pu.x, 0, pu.z)); } else e.destino = acomodar(V3(rf(-c.W/2 + 1.5, c.W/2 - 1.5), 0, rf(c.z1 + 2, c.z1 + c.L*0.5)));
    if(tipo==='escopeta') e.avanza = true;
    dem += rf(0.3, 0.9);
  }
}
/* gente adentro de un cuarto de brecha: enemigos parados, rehenes arrodillados, a veces un captor */
function poblarBrecha(c){
  const p = c.plan, n = Math.round((2 + (p.final ? 2 : 1))*(0.85 + J.mis.dif*0.2)), j = J.jug;
  const zona = ()=>{ let q; for(let k=0;k<12;k++){ q = V3(rf(-c.W/2 + 1.2, c.W/2 - 1.2), 0, rf(c.z1 + 1.5, c.z0 - 3.5)); if(Math.hypot(q.x - (c.xEnt||0), q.z - (c.z0 - 1.2)) > 3.4) break; } return q; };
  for(let k=0;k<(p.rehenes||0);k++){ const pos = zona(); crearCivil(pos, {rumbo:mirarA({pos}, j.pos) + rf(-0.6,0.6)}); }
  if(p.captor || p.vip){ capturar(c, zona()); }
  for(let k=0;k<n;k++){ const pos = zona(); const tipo = rnd() < 0.2 ? 'escopeta' : (p.final && k===0 && J.mis.dif > 1.1 ? 'pesado' : 'tirador');
    const e = crearEnemigo(tipo, pos, {cuarto:c, estado:'sorpresa', reaccion:rf(0.55, 1.2)/J.mis.dif}); e.rumbo = mirarA(e, j.pos) + rf(-1.4, 1.4); }
}
function capturar(c, pos){
  const j = J.jug, rumbo = mirarA({pos}, j.pos);
  const civ = crearCivil(pos, {rumbo, agache:0, levanta:false});
  const e = crearEnemigo('captor', pos.clone().add(V3(-Math.sin(rumbo)*0.38 + Math.cos(rumbo)*0.12, 0, -Math.cos(rumbo)*0.38 - Math.sin(rumbo)*0.12)), {cuarto:c, estado:'captor', rumbo, cuenta:6.5 + 2/J.mis.dif});
  civ.rehenDe = e; e.rehen = civ; return e;
}

/* ====================== pasar enemigos ====================== */
const _v = V3(0,0,0);
/* ====================== que los enemigos no atraviesen las cosas ======================
   Las cajas sólidas del mundo (paredes, cubiertas, utilería) son el obstáculo: los destinos se acomodan donde entra un
   cuerpo, al caminar se rodea la primera caja que corta el camino por la esquina que menos alarga, y lo que igual quede
   metido se empuja para afuera. */
const CUERPO_R = 0.3;
const cajaCuerpo = (b, y)=> b.y0 < y + 1.6 && b.y1 > y + 0.2;   /* la puerta cerrada de una brecha también frena */
function libreEn(x, z, r, y){ r = r || CUERPO_R; y = y || 0;
  for(const b of MUNDO.cajas){ if(!cajaCuerpo(b, y)) continue; const cx = lim(x, b.x0, b.x1), cz = lim(z, b.z0, b.z1); if((x - cx)*(x - cx) + (z - cz)*(z - cz) < r*r) return false; }
  return true; }
function acomodar(p, r){ if(!p || libreEn(p.x, p.z, r, p.y)) return p;
  for(let rad = 0.3; rad <= 3; rad += 0.3) for(let k=0;k<12;k++){ const a = (k + rad)/12*TAU, x = p.x + Math.cos(a)*rad, z = p.z + Math.sin(a)*rad; if(libreEn(x, z, r, p.y)) return V3(x, p.y||0, z); }
  return p; }
/* dónde corta el segmento a la caja agrandada en r (0..1), o null */
function cortaCaja(ax, az, bx, bz, b, r){
  const dx = bx - ax, dz = bz - az; let t0 = 0, t1 = 1;
  for(const [o, d, lo, hi] of [[ax, dx, b.x0 - r, b.x1 + r], [az, dz, b.z0 - r, b.z1 + r]]){
    if(Math.abs(d) < 1e-9){ if(o <= lo || o >= hi) return null; continue; }
    let ta = (lo - o)/d, tb = (hi - o)/d; if(ta > tb){ const q = ta; ta = tb; tb = q; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if(t0 >= t1) return null; }
  return t0; }
function rodear(p, dest, r, y){
  let caja = null, tm = 2;
  for(const b of MUNDO.cajas){ if(!cajaCuerpo(b, y)) continue; const t = cortaCaja(p.x, p.z, dest.x, dest.z, b, r); if(t !== null && t < tm){ tm = t; caja = b; } }
  if(!caja) return dest;
  const m = r + 0.18; let el = null, costo = 1e9, cerca = null, dc = 1e9;
  for(const [x, z] of [[caja.x0 - m, caja.z0 - m], [caja.x1 + m, caja.z0 - m], [caja.x0 - m, caja.z1 + m], [caja.x1 + m, caja.z1 + m]]){
    const a = Math.hypot(x - p.x, z - p.z), c = a + Math.hypot(dest.x - x, dest.z - z);
    if(a < dc && a > 0.05){ dc = a; cerca = [x, z]; }
    if(a > 0.05 && cortaCaja(p.x, p.z, x, z, caja, r*0.9) === null && c < costo){ costo = c; el = [x, z]; } }
  const q = el || cerca; return q ? V3(q[0], 0, q[1]) : dest; }
function sacarDeCajas(p, r, y){
  for(const b of MUNDO.cajas){ if(!cajaCuerpo(b, y)) continue; const cx = lim(p.x, b.x0, b.x1), cz = lim(p.z, b.z0, b.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx*dx + dz*dz;
    if(d2 >= r*r) continue;
    if(d2 > 1e-8){ const d = Math.sqrt(d2), k = (r - d)/d; p.x += dx*k; p.z += dz*k; }
    else { const op = [[b.x0 - r - p.x, 0], [b.x1 + r - p.x, 0], [0, b.z0 - r - p.z], [0, b.z1 + r - p.z]].sort((u, v)=> Math.abs(u[0] + u[1]) - Math.abs(v[0] + v[1]))[0]; p.x += op[0]; p.z += op[1]; } } }
/* ¿el enemigo te tiene a tiro? la misma prueba que usa la vista: cabeza o pecho sin nada en el medio */
function lineaLibre(e, cp){
  const ps = e.pts ? [e.pts.cab, e.pts.pec] : [e.boca || e.pos.clone().add(V3(0, 1.4, 0))];
  for(const q of ps){ const d = q.clone().sub(cp), L = d.length(); d.normalize(); const w = rayoMundo(cp, d, L); if(!w || w.t >= L - 0.25) return true; }
  return false; }
function pasarEnemigo(e, dt){
  const def = e.def, j = J.jug, cp = camPos();
  if(!e.vivo){ if(e.trapo) pasarTrapo(e); return; }
  e.t += dt; if(e.fl){ e.fl.t -= dt*4; if(e.fl.t <= 0) e.fl = null; } e.retro *= 0.8;
  if(e.aturdido > 0){ e.aturdido -= dt; e.apunta = lerp(e.apunta, 0, 0.1); e.agache = lerp(e.agache, 0.2, 0.05); e.fase += dt*2; e.rumbo += Math.sin(e.t*3)*0.02; e.laser = false; return; }
  if(e.espera > 0){ e.espera -= dt; e.cuerpo.g.visible = false; return; } e.cuerpo.g.visible = true;
  if(e.estado==='conduce'){ e.agache = 0.8; e.apunta = 0; e.moviendo = false; return; }
  if(J.mis.tipo==='franco' && pasarGuardia(e, dt)) return;
  const wp = posMundo(e), aJug = Math.atan2(cp.x - wp.x, cp.z - wp.z), dist = Math.hypot(cp.x - wp.x, cp.z - wp.z);
  e.pitch = Math.atan2(cp.y - (wp.y + 1.4), dist);
  switch(e.estado){
    case 'sorpresa': e.reaccion -= dt; e.agache = 0; if(e.reaccion <= 0){ e.estado = 'apuntar'; e.avisoT = def.aviso*0.7/J.mis.dif; } e.rumbo = e.rumbo + angDif(e.rumbo, aJug)*0.04; break;
    case 'captor': e.rumbo = aJug; e.apunta = 0.3; e.cuenta -= dt; if(e.cuenta <= 0 && e.rehen && e.rehen.vivo){ ejecutar(e); } break;
    case 'llegar': {
      _v.subVectors(e.destino, e.pos); _v.y = 0; const d = _v.length(); e.moviendo = d > 0.2;
      if(e.moviendo && !e.padre){ const meta = rodear(e.pos, e.destino, CUERPO_R, e.pos.y); _v.set(meta.x - e.pos.x, 0, meta.z - e.pos.z); }
      if(e.moviendo){ const dm = Math.max(1e-6, _v.length()), v = def.vel*(e.avanza ? 1.1 : 1)*dt; e.pos.addScaledVector(_v, Math.min(1, v/dm));
        /* si en 3 s no se acercó medio metro, se queda donde está (y no camina contra la pared para siempre) */
        if(d < (e.dAnt === undefined ? 1e9 : e.dAnt) - 0.5){ e.dAnt = d; e.trabaT = 0; } else if((e.trabaT = (e.trabaT||0) + dt) > 3){ e.trabaT = 0; e.dAnt = undefined; e.destino = acomodar(V3(e.pos.x, 0, e.pos.z)); } e.rumbo = e.rumbo + angDif(e.rumbo, Math.atan2(_v.x, _v.z))*0.2; e.fase += dt*def.vel*3.2; e.agache = lerp(e.agache, 0, 0.1); e.apunta = lerp(e.apunta, 0.4, 0.1);
        /* el escopetero que avanza tira apenas te tiene a tiro */
        if(e.avanza && dist < 9 && e.t > 1.2){ e.estado = 'apuntar'; e.avisoT = def.aviso/J.mis.dif; e.moviendo = false; } }
      else { e.trabaT = 0; e.dAnt = undefined; e.estado = e.puesto && e.puesto.alto < 2 ? 'cubierto' : 'apuntar'; e.t = 0; e.espT = rf(0.4, 1.4); e.avisoT = def.aviso/J.mis.dif; }
      break; }
    case 'cubierto': e.moviendo = false; e.rumbo = e.rumbo + angDif(e.rumbo, aJug)*0.15; e.agache = lerp(e.agache, 1, 0.15); e.apunta = lerp(e.apunta, 0.2, 0.1);
      if(e.t > e.espT){ e.estado = 'apuntar'; e.t = 0; e.avisoT = def.aviso/J.mis.dif*(0.8 + Math.random()*0.4); } break;
    case 'apuntar': e.moviendo = false; e.rumbo = e.rumbo + angDif(e.rumbo, aJug)*0.2; e.agache = lerp(e.agache, 0, 0.18); e.apunta = lerp(e.apunta, 1, 0.2);
      e.avisoT -= dt; e.laser = e.apunta > 0.7;
      /* sin línea de tiro (pared, cajón, la puerta todavía cerrada) no dispara: sigue apuntando y espera */
      if(e.avisoT <= 0){ if(!lineaLibre(e, cp)){ e.avisoT = 0.3; e.laser = false; } else { e.estado = 'disparar'; e.t = 0; e.disparos = 0; e.laser = false; if(def.jefe) sfx('minigun', 0.8); } } break;
    case 'disparar': e.rumbo = e.rumbo + angDif(e.rumbo, aJug)*0.2; e.apunta = 1;
      if(e.t >= def.cadR){ e.t = 0; dispararEnemigo(e, dist); e.disparos++;
        if(e.disparos >= def.rafaga){ if(e.avanza && dist > 3.5){ e.estado = 'llegar'; e.destino = acomodar(V3(cp.x, 0, cp.z).lerp(e.pos, 0.55)); e.t = 0; }
          else { e.estado = e.puesto && e.puesto.alto < 2 ? 'cubierto' : 'apuntar'; e.t = 0; e.espT = rf(0.8, 2.2)/J.mis.dif; e.avisoT = def.aviso/J.mis.dif*(0.9 + Math.random()*0.5); } } }
      break;
  }
  /* si pasa mucho sin que se lo vea (quedó detrás de algo), se muda a un lugar a la vista */
  if(!e.lejos && !e.padre && e.estado!=='captor' && J.t % 30 === (e.id % 30)){
    let visto = false;
    if(e.pts) for(const k of ['cab','pec']){ const d = e.pts[k].clone().sub(cp), L = d.length(); d.normalize(); const w = rayoMundo(cp, d, L); if((!w || w.t >= L - 0.2) && !civEnLinea(cp, d, L, 0.012) && Math.abs(angDif(Math.atan2(-d.x, -d.z) - J.jug.base, 0)) < rangoYaw() - 0.04){ visto = true; break; } }
    e.oculto = visto ? 0 : (e.oculto||0) + 0.5;
    const encerrado = e.cuarto && e.cuarto.cajaPuerta && MUNDO.cajas.includes(e.cuarto.cajaPuerta);
    if(e.oculto > 6 && e.cuarto && !encerrado){ e.oculto = 0; if(e.puesto) e.puesto.ocupado = null; e.puesto = null; const c = e.cuarto;
      let mejor = null; for(let k=0;k<16 && !mejor;k++){ const q = V3(lim(cp.x + vr(-4, 4), c.cx - c.W/2 + 1, c.cx + c.W/2 - 1), 0, lim(cp.z - vr(5, 11), c.z1 + 1, c.z0 - 4.5));
        const cab = q.clone().add(V3(0, 1.65, 0)), d = cab.clone().sub(cp), L = d.length(); d.normalize(); const w = rayoMundo(cp, d, L); if((!w || w.t > L - 0.3) && libreEn(q.x, q.z)) mejor = q; }
      e.destino = acomodar(mejor || V3(cp.x, 0, cp.z - 6)); e.estado = 'llegar'; e.t = 0; e.avanza = false; } }
  /* los que no tienen cubierta baja se corren de costado (columna) cuando esperan */
  if(e.puesto && e.puesto.alto >= 2 && e.estado==='apuntar' && e.avisoT > def.aviso*0.6) e.moviendo = false;
  if(e.jefe || def.jefe) pasarColoso(e, dt, dist);
  if(!e.padre) sacarDeCajas(e.pos, def.jefe ? 0.55 : CUERPO_R, e.pos.y);
}
function dispararEnemigo(e, dist){
  const def = e.def, j = J.jug, cp = camPos(), dif = J.mis.dif;
  e.retro = 0.06; const boca = e.boca ? e.boca.clone() : e.pos.clone().add(V3(0,1.4,0));
  fogonazoEnemigo(boca); const pan = lim(Math.sin(angDif(camYaw(), Math.atan2(-(boca.x - cp.x), -(boca.z - cp.z)))), -1, 1);
  if(def.cohete){ lanzarCohete(boca, e); return; }
  sfx('enemigo', lim(1.2 - dist/40, 0.25, 1), pan);
  const cubierto = j.cubT > 0.6;
  let prob = def.prec*(0.7 + dif*0.3)*lim(1.2 - dist/(def.corto ? 14 : (def.laser ? 500 : 55)), 0.12, 1)*(j.caminando ? 0.75 : 1)*(J.lento > 0 ? 0.3 : 1);
  if(def.corto && dist > 13) prob *= 0.3;
  const pega = !cubierto && Math.random() < prob;
  const dest = cp.clone().add(V3(vr(-0.6,0.6), vr(-0.5,0.3), vr(-0.6,0.6)));
  /* con algo en el medio (pared, cajón, puerta) la bala pega ahí: nunca a través; y si pasa seguido, se muda a donde te vea */
  if(!cubierto && !lineaLibre(e, cp)){ const dd = dest.clone().sub(boca), L = dd.length(); dd.normalize(); const h = rayoMundo(boca, dd, L);
    if(h){ const p = boca.clone().addScaledVector(dd, h.t); chispas(p, 3); agujero(p, h.n); trazo(boca, p, '#ffcf8a', 0.06); }
    e.bloqueado = (e.bloqueado||0) + 1; if(e.bloqueado >= 3){ e.bloqueado = 0; e.oculto = 7; } return; }
  e.bloqueado = 0;
  if(cubierto){ /* pega en la cubierta de adelante */ const h = rayoMundo(boca, dest.clone().sub(boca).normalize(), boca.distanceTo(dest)); if(h){ const p = boca.clone().addScaledVector(dest.clone().sub(boca).normalize(), h.t); chispas(p, 3); agujero(p, h.n); trazo(boca, p, '#ffcf8a'); } return; }
  trazo(boca, pega ? cp.clone().add(V3(0,-0.3,0)) : dest, '#ffcf8a', 0.06);
  if(pega) danarJugador(def.dmg*(def.corto && dist < 6 ? 1.6 : 1)*(0.75 + dif*0.25), boca);
  else if(Math.random() < 0.5) sfx('zumbido', 0.6, pan);
}
function danarJugador(d, desde){
  const j = J.jug; if(J.dios || J.demo || j.muerto) return;
  d *= 1 - 0.12*G.equipo.casco; j.hp -= d; j.sinDano = 0; J.stats.recibido += d; sfx('duele', 0.7);
  J.danos.push({ang:Math.atan2(desde.x - cam.position.x, desde.z - cam.position.z), t:1});
  if(j.hp <= 0){ if(j.botiquin > 0){ j.botiquin--; j.hp = 50; aviso('BOTIQUÍN', '#5ad07a', 'usaste uno'); } else { j.hp = 0; j.muerto = true; terminar(false, 'TE ABATIERON'); } }
}
function ejecutar(e){ const c = e.rehen; if(!c || !c.vivo) return;
 e.retro = 0.1; fogonazoEnemigo(e.boca || e.pos); sfx('pistola', 0.9); matarCivil(c, V3(0,0,0), c.pts.cab); terminar(false, 'EJECUTARON AL REHÉN'); }
function matarCivil(c, imp, p){ if(!c.vivo) return; c.vivo = false; c.estado = 'muerto'; hacerTrapo(c, imp, p); sangre(p || c.pts.pec, imp.clone().normalize(), 12); }

/* ====================== golpe a un enemigo ====================== */
function pegarEnemigo(e, dmg, parte, p, dir){
  const def = e.def; let d = dmg, cabeza = parte==='cabeza';
  const pl = e.placas;
  /* placas: el pecho y el casco (y en el Coloso, brazos y piernas) absorben hasta romperse */
  const plaza = cabeza ? 'casco' : (parte==='torso' ? 'pecho' : parte);
  if(pl && pl[plaza] > 0){ pl[plaza] -= d; chispas(p, 6, '#fff2c0'); sfx('placa', 0.7); J.marcas.push({t:0.25, tipo:'placa'});
    if(pl[plaza] <= 0){ sfx('rompe'); texto(plaza==='casco' ? 'CASCO ROTO' : 'PLACA ROTA', '#ffb43a'); for(let i=0;i<8;i++) particula(p, V3(vr(-2,2), vr(1,4), vr(-2,2)), '#6a7076', 1.2, 1); } return; }
  if(cabeza) d *= def.jefe ? 2.2 : 4; else if(parte!=='torso') d *= 0.62;
  e.hp -= d; e.fl = {t:1, dx:dir.x*0.5, dz:-0.8, cab:cabeza}; sangre(p, dir, cabeza ? 10 : 5);
  if(e.estado==='sorpresa') e.reaccion = Math.min(e.reaccion, 0.2);
  if(e.estado==='cubierto' || e.estado==='llegar') { e.t += 0.3; }
  J.stats.aciertos++; if(cabeza) J.stats.cabezas++; sfx('carne', 0.5);
  if(e.hp <= 0) morirEnemigo(e, dir.clone().multiplyScalar(cabeza ? 7 : 5), p, cabeza);
  else { J.marcas.push({t:0.2, tipo:cabeza ? 'cabeza' : 'marca'}); sfx('marca', 0.8); }
}
function morirEnemigo(e, imp, p, cabeza){
  if(!e.vivo) return; e.vivo = false; e.estado = 'muerto'; e.laser = false; J.stats.bajas++;
  if(e.padre){ /* desde un vehículo: el cuerpo pasa al mundo */ e.piso = 0; }
  if(e.puesto) e.puesto.ocupado = null;
  hacerTrapo(e, imp, p); J.marcas.push({t:0.35, tipo:'baja', cabeza}); sfx(cabeza ? 'cabeza' : 'baja', 0.9);
  texto(cabeza ? '+150 CABEZA' : '+100 BAJA', cabeza ? '#ffb43a' : '#e8eaec');
  /* mancha en el piso donde cae */
  const pz = e.pts.pec; if(!e.padre && Math.random() < 0.8) setTimeout0(0.5, ()=> mancha(V3(pz.x, (e.piso||0) + 0.01, pz.z), 'y+', vr(0.5,1.1)));
  if(e.rehen && e.rehen.vivo){ /* el rehén se salva */ e.rehen.rehenDe = null; e.rehen.levanta = true; e.rehen.agache = 1; }
  if(e.def.jefe){ J.lento = 2.2; sfx('lento'); }
}
const DIFERIDOS = []; function setTimeout0(t, fn){ DIFERIDOS.push({t, fn}); }

/* ====================== El Coloso ====================== */
function pasarColoso(e, dt, dist){
  e.faseJ = e.hp < e.hpMax*0.5 ? 2 : 1;
  if(e.estado==='cubierto') e.estado = 'apuntar';
  if(e.estado==='apuntar' && e.t > 0.05 && !e.camina){ e.camina = true; e.destino = acomodar(V3(rf(-7,7), 0, lerp(e.cuarto.z1 + 4, e.cuarto.z0 - 10, rnd())), 0.7); }
  if(e.camina && e.estado==='apuntar'){ _v.subVectors(e.destino, e.pos); _v.y = 0; const d = _v.length(); if(d > 0.3){ e.pos.addScaledVector(_v, Math.min(1, e.def.vel*dt/d)); e.moviendo = true; e.fase += dt*3; } else { e.moviendo = false; } }
  if(e.estado==='disparar') e.camina = false;
  /* granadas en la segunda fase */
  e.granT = (e.granT||6) - dt; if(e.faseJ===2 && e.granT <= 0){ e.granT = rf(5, 8); lanzarGranadaEnemiga(e); }
  /* refuerzos */
  e.refT = (e.refT||14) - dt; if(e.refT <= 0){ e.refT = 22; if(vivos().length < 4) lanzarOla(e.cuarto, 0); }
}
function lanzarGranadaEnemiga(e){ const cp = camPos(); const p = e.pts.maI.clone(); const dest = V3(cp.x + vr(-1,1), 0, cp.z + vr(-1.5, 0.5)); const T = 1.3;
  J.granadas.push({p, v:V3((dest.x - p.x)/T, (0 - p.y)/T + 4.9*T, (dest.z - p.z)/T), t:T + 0.6, enemiga:true}); sfx('aviso'); }

/* ====================== cohetes ====================== */
function lanzarCohete(boca, e){
  const cp = camPos(); const d = cp.clone().sub(boca).normalize(); const m = new THREE.Mesh(CAJA, mat('#4a5a3a')); m.scale.set(0.12, 0.12, 0.5); m.position.copy(boca); m.lookAt(cp); escena.add(m);
  J.cohetes.push({p:boca.clone(), v:d.multiplyScalar(26), m, t:6, vivo:true}); sfx('cohete', 0.9);
}
function pasarCohetes(dt){
  const cp = camPos();
  for(let i=J.cohetes.length-1;i>=0;i--){ const c = J.cohetes[i]; c.t -= dt;
    if(J.camion) c.v.z += 0; c.p.addScaledVector(c.v, dt); c.m.position.copy(c.p); particula(c.p, V3(vr(-0.3,0.3), vr(0,0.5), vr(-0.3,0.3)), '#9a9a9a', 0.6, -0.05);
    const d = c.p.distanceTo(cp);
    if(d < 1.2 || c.t <= 0 || !c.vivo){ escena.remove(c.m); J.cohetes.splice(i,1); explosionFX(c.p);
      if(c.vivo && d < 2.5) danarJugador(J.jug.cubT > 0.6 ? 12 : 38, c.p); } }
}
function explosionFX(p){ sfx('boom'); for(let i=0;i<30;i++) particula(p, V3(vr(-6,6), vr(0,7), vr(-6,6)), i%3 ? '#ffb43a' : '#fff0b0', vr(0.2,0.6), 0.5); for(let i=0;i<14;i++) particula(p, V3(vr(-1.5,1.5), vr(0.5,2.5), vr(-1.5,1.5)), '#5a5a5a', vr(0.8,1.6), -0.05);
  fogonazo.position.copy(p); fogonazo.intensity = 6; J.sacudon = 0.5; }

/* ====================== granadas (cegadoras propias, de fragmentación del Coloso) ====================== */
function tirarCegadora(){
  const j = J.jug; if(j.granadas <= 0 || j.cubT > 0.5) return; j.granadas--;
  const d = V3(0,0,-1).applyEuler(cam.rotation); const p = cam.position.clone().addScaledVector(d, 0.5);
  J.granadas.push({p, v:d.multiplyScalar(13).add(V3(0, 3.5, 0)), t:1.1, propia:true}); sfx('recargaA', 0.5); voz('granada', true);
}
function pasarGranadas(dt){
  for(let i=J.granadas.length-1;i>=0;i--){ const g = J.granadas[i]; g.t -= dt; g.v.y -= 9.8*dt; g.p.addScaledVector(g.v, dt); if(g.p.y < 0.1){ g.p.y = 0.1; g.v.multiplyScalar(0.4); g.v.y = Math.abs(g.v.y)*0.3; }
    if(!g.m){ g.m = new THREE.Mesh(CAJA, mat(g.propia ? '#2a4a2a' : '#3a3a2a')); g.m.scale.set(0.09, 0.12, 0.09); escena.add(g.m); } g.m.position.copy(g.p);
    if(g.t <= 0){ escena.remove(g.m); J.granadas.splice(i,1);
      if(g.propia){ sfx('cegadora'); fogonazo.position.copy(g.p); fogonazo.intensity = 12;
        for(const e of vivos()){ const d = e.pos.distanceTo(g.p); if(d < 12 && !e.def.jefe){ e.aturdido = 3.2 - d*0.1; e.laser = false; if(e.estado==='disparar' || e.estado==='apuntar') e.estado = e.puesto && e.puesto.alto < 2 ? 'cubierto' : 'apuntar'; } else if(e.def.jefe && d < 12) e.aturdido = 1; }
        if(g.p.distanceTo(cam.position) < 8) J.flashT = Math.max(J.flashT, 0.5); }
      else { explosionFX(g.p); if(g.p.distanceTo(cam.position) < 4.5) danarJugador(J.jug.cubT > 0.6 ? 6 : 30, g.p); } } }
}

/* ====================== disparar ====================== */
const camYaw = ()=> cam.rotation.y;
function dispararJugador(){
  const j = J.jug, id = armaJ(), A = ARMAS[id];
  if(j.recarga > 0 || j.cadT > 0 || j.cubT > 0.5) return;
  if(j.carg[id] <= 0){ sfx('vacio'); j.cadT = 0.25; if(j.res[id] > 0) empezarRecarga(); return; }
  j.carg[id]--; j.cadT = A.cad; J.stats.disparos++;
  const silen = tieneMej(id,'silen'), empu = tieneMej(id,'empu') ? 0.65 : 1;
  sfx(silen ? 'silen' : A.sfx);
  if(!silen && J.mis.tipo==='franco'){ J.alerta = 1; J.stats.alarma = true; }
  VM.patada = 1; VM.fl.visible = !silen; VM.flT = 0.04; casquillo(); if(Math.random() < 0.45) setTimeout0(vr(0.3, 0.45), ()=> sfx('casquillo', 0.22)); fogonazo.position.copy(cam.position); fogonazo.intensity = silen ? 0 : 2.2;
  const disp = A.disp*empu*(j.zoom > 0.5 ? 0.45 : 1)*(j.caminando ? 1.6 : 1)*(1 + (j.retP||0)*6);
  const o = cam.position.clone(), dmg = A.dmg*(silen ? 0.92 : 1);
  for(let k=0;k<(A.perd||1);k++){
    const d = V3(vr(-disp, disp), vr(-disp, disp), -1).normalize().applyQuaternion(cam.quaternion);
    if(A.bala) J.balas.push({p:o.clone(), v:d.clone().multiplyScalar(A.bala), t:1.6, dmg, largo:0});
    else impactoRayo(o, d, dmg/(A.perd > 1 ? 1 : 1), k===0);
  }
  j.retP += A.ret*empu*(0.8 + Math.random()*0.4); j.retY += vr(-1,1)*A.ret*empu*0.4;
  if(A.clase==='francotirador'){ setTimeout0(0.4, ()=> sfx('cerrojo')); }
  if(j.carg[id] <= 0 && j.res[id] > 0 && !J.bot) setTimeout0(0.25, ()=> empezarRecarga());
}
function impactoRayo(o, d, dmg, traza){
  let mejor = rayoMundo(o, d, 250), quien = null, parte = null, esCivil = false, escudo = false;
  let tmax = mejor ? mejor.t : 250;
  for(const e of J.enemigos){ if(!e.vivo || !e.pts || !e.cuerpo.g.visible) continue;
    if(e.escudoCaja){ const t = rayoEscudo(o, d, e.escudoCaja, tmax); if(t !== null){ tmax = t; quien = e; escudo = true; mejor = null; } }
    const h = rayoCuerpo(o, d, e, tmax); if(h){ tmax = h.t; quien = e; parte = h.parte; escudo = false; mejor = null; } }
  for(const c of J.civiles){ if(!c.vivo || !c.pts) continue; const h = rayoCuerpo(o, d, c, tmax); if(h){ tmax = h.t; quien = c; parte = h.parte; esCivil = true; escudo = false; mejor = null; } }
  /* vehículos y helicóptero */
  let veh = null; for(const v of J.vehiculos.concat(J.heli ? [J.heli] : [])){ if(!v.vivo) continue; for(const b of cajasVeh(v)){ const h = rayoCaja(o, d, b, tmax); if(h){ tmax = h.t; veh = v; quien = null; mejor = null; } } }
  for(const c of J.cohetes){ const t = rayoCapsula(o, d, c.p, c.p.clone().addScaledVector(c.v, 0.02), 0.4); if(t !== null && t < tmax){ c.vivo = false; texto('¡COHETE!', '#ffb43a'); J.marcas.push({t:0.3, tipo:'baja'}); return; } }
  const p = o.clone().addScaledVector(d, tmax);
  if(traza) trazo(cam.position.clone().add(V3(0.12,-0.12,0).applyQuaternion(cam.quaternion)), p, '#fff2c8', 0.05);
  if(esCivil){
    matarCivil(quien, d.clone().multiplyScalar(5), p); terminar(false, 'LE DISTE A UN REHÉN'); return; }
  if(quien){ if(escudo){ chispas(p, 6, '#c8e0ff'); sfx('placa', 0.6); J.marcas.push({t:0.15, tipo:'placa'}); return; } pegarEnemigo(quien, dmg, parte, p, d); return; }
  if(veh){ pegarVehiculo(veh, dmg, p, d); return; }
  if(mejor){ chispas(p, 4); agujero(p, mejor.n); sonidoImpacto(p, mejor.caja); if(mejor.caja.tipo==='puerta') {} }
}
function pasarBalas(dt){
  /* balas de francotirador: caen y las corre el viento */
  for(let i=J.balas.length-1;i>=0;i--){ const b = J.balas[i]; b.t -= dt; const a = b.p.clone();
    b.v.y -= 9.8*dt; b.v.x += J.viento*3.5*dt; b.p.addScaledVector(b.v, dt); const seg = b.p.clone().sub(a), L = seg.length(); seg.normalize();
    let tmax = L, quien = null, parte = null, civ = false; const w = rayoMundo(a, seg, L); if(w) tmax = w.t;
    for(const e of J.enemigos){ if(!e.vivo || !e.pts) continue; const pp = e.pts.pel; if(Math.abs(pp.x - a.x) > L + 3 || Math.abs(pp.z - a.z) > L + 3) continue; const h = rayoCuerpo(a, seg, e, tmax); if(h){ tmax = h.t; quien = e; parte = h.parte; } }
    for(const c of J.civiles){ if(!c.vivo || !c.pts) continue; const h = rayoCuerpo(a, seg, c, tmax); if(h){ tmax = h.t; quien = c; parte = h.parte; civ = true; } }
    let veh = null; for(const v of J.vehiculos) if(v.vivo) for(const bb of cajasVeh(v)){ const h = rayoCaja(a, seg, bb, tmax); if(h){ tmax = h.t; veh = v; quien = null; } }
    const p = a.clone().addScaledVector(seg, tmax);
    if(quien || w || veh || b.t <= 0){ J.balas.splice(i,1); if(!b.traza) trazo(cam.position.clone().add(V3(0,-0.1,0)), p, '#fff2c8', 0.12);
      if(civ){ matarCivil(quien, seg.clone().multiplyScalar(6), p); terminar(false, 'LE DISTE A UN CIVIL'); }
      else if(quien){ pegarEnemigo(quien, b.dmg, parte, p, seg); if(!quien.vivo && J.mis.tipo==='franco') alertarCerca(quien); }
      else if(veh) pegarVehiculo(veh, b.dmg, p, seg);
      else if(w){ chispas(p, 4); agujero(p, w.n); sonidoImpacto(p, w.caja); if(J.mis.tipo==='franco' && Math.random() < 0.5) alertarCerca({pos:p}); } } }
}
/* con silenciador sólo se enteran los que están cerca del caído o del impacto */
function alertarCerca(q){ for(const e of vivos()) if(e.pos.distanceTo(q.pos) < 16){ e.alertado = true; } }
function empezarRecarga(){ const j = J.jug, id = armaJ(), A = ARMAS[id]; if(j.recarga > 0 || j.res[id] <= 0 || j.carg[id] >= cargadorMax(id)) return;
  j.recarga = A.rec*(j.cubT > 0.5 ? 0.75 : 1); j.recargaTot = j.recarga; sfx('recargaA'); if(j.carg[id] === 0 && Math.random() < 0.4) voz('recargando'); }
function terminarRecarga(){ const j = J.jug, id = armaJ(), A = ARMAS[id];
  if(A.porBala){ if(j.res[id] > 0 && j.carg[id] < cargadorMax(id)){ j.carg[id]++; j.res[id]--; sfx('recargaA', 0.6); if(j.carg[id] < cargadorMax(id) && j.res[id] > 0){ j.recarga = A.rec; j.recargaTot = A.rec; return; } } sfx('recargaB'); return; }
  const f = Math.min(cargadorMax(id) - j.carg[id], j.res[id]); j.carg[id] += f; j.res[id] -= f; sfx('recargaB'); }
function cambiarArma(){ const j = J.jug; if(J.mis.tipo==='franco' && false) return; j.ai = (j.ai + 1) % j.armas.length; j.recarga = 0; j.cadT = 0.35; armarVM(armaJ()); VM.cambio = 1; sfx('recargaA', 0.6); }
