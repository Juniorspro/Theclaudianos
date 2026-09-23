
/* ====================== convoy: vehículos enemigos ====================== */
const VEL_CONVOY = 22;
function posMundo(e){ return e.padre ? e.pos.clone().add(e.padre.position) : e.pos; }
function crearVehiculo(tipo){
  const col = tipo==='rpg' ? '#5a4a3a' : elegir(['#3a3e44','#5a2a24','#2a3a2a','#6a6e72']);
  const g = tipo==='moto' ? moto() : camioneta(col); dinamico(g);
  const lado = elegir([1, 1, -1]);
  const v = {g, tipo, vivo:true, hp: tipo==='moto' ? 90 : 320, rel: rf(55, 75), relObj: tipo==='moto' ? rf(-6, 10) : rf(-10, 8), x: lado > 0 ? rf(2, 8) : -4, xObj: lado > 0 ? rf(2.2, 8) : -4, ocup:[], t:0, giro:0};
  if(lado < 0) v.relObj = rf(10, 16);
  v.g.position.set(v.x, 0, J.camionZ + v.rel);
  /* los asientos los pone el modelo (el generado mira a −z, hacia donde viaja); con las cajas, los de siempre */
  const as = g.userData.asientos;
  if(tipo==='moto'){ const piloto = crearEnemigo('tirador', as ? as.chofer.clone() : V3(0, 0.55, 0.1), {padre:g, estado:'conduce', agache:0.55, piso:0}); piloto.conduce = true; v.ocup.push(piloto);
    const tira = crearEnemigo('tirador', as ? as.caja[0].clone() : V3(0, 0.62, -0.5), {padre:g, estado:'apuntar', avisoT:1.4, agache:0.5, piso:0}); v.ocup.push(tira); }
  else { const chofer = crearEnemigo('tirador', as ? as.chofer.clone() : V3(0.45, 0.3, 1.25), {padre:g, estado:'conduce', agache:0.8, piso:0}); chofer.conduce = true; v.ocup.push(chofer); v.chofer = chofer;
    const n = tipo==='rpg' ? 1 : ri(1,2);
    for(let k=0;k<n;k++) v.ocup.push(crearEnemigo(tipo==='rpg' ? 'rpg' : 'tirador', as ? as.caja[k].clone() : V3(k ? 0.5 : -0.5, 1.05, -1.1 - k*0.5), {padre:g, estado:'apuntar', avisoT:rf(1.2, 2.2), piso:0})); }
  J.vehiculos.push(v); sfx('motor', 1); return v;
}
function cajasVeh(v){
  const p = v.g.position;
  if(v.heli) return [{x0:p.x - 1.2, x1:p.x + 1.2, y0:p.y - 1.1, y1:p.y + 1.1, z0:p.z - 2.5, z1:p.z + 2.5}, {x0:p.x - 0.3, x1:p.x + 0.3, y0:p.y + 0.2, y1:p.y + 0.8, z0:p.z - 8, z1:p.z - 2.5}];
  if(v.tipo==='moto') return [{x0:p.x - 0.2, x1:p.x + 0.2, y0:0.3, y1:0.8, z0:p.z - 0.8, z1:p.z + 0.8}];
  return [{x0:p.x - 1.05, x1:p.x + 1.05, y0:0.45, y1:1.45, z0:p.z - 2.7, z1:p.z + 2.7}];
}
function pegarVehiculo(v, dmg, p, d){
  chispas(p, 5); v.hp -= dmg*(v.heli ? 1 : 0.55); J.stats.aciertos++; J.marcas.push({t:0.15, tipo:'placa'}); sfx('placa', 0.5);
  if(v.hp <= 0) destruirVehiculo(v);
}
function destruirVehiculo(v){
  if(!v.vivo) return; v.vivo = false; explosionFX(v.g.position.clone().add(V3(0,1,0))); texto(v.heli ? '¡HELICÓPTERO ABAJO!' : '+250 VEHÍCULO', '#ffb43a'); J.stats.bajas += v.heli ? 0 : 0;
  for(const e of (v.ocup || [v.gunner].filter(Boolean))) if(e.vivo){ e.velMundo = V3(vr(-3,3), vr(4,7), VEL_CONVOY*0.3); morirEnemigo(e, V3(vr(-4,4), 8, vr(-2,2)), e.pts.pec, false); }
  v.giro = vr(-2,2); for(const k of v.g.children) k.material = mat('#2a2a2a');
}
function pasarConvoy(et, dt){
  const j = J.jug; et.t += dt;
  J.camionZ -= VEL_CONVOY*dt; J.camion.position.z = J.camionZ;
  if(J.escolta){ J.escolta.position.z = J.camionZ - 17 + Math.sin(et.t*0.3)*1.5; J.escolta.position.x = -4 + Math.sin(et.t*0.21)*0.4; }
  j.pos.set(-4 + 0.55, 2.15, J.camionZ + (J.camion.userData.glb ? 1.35 : -0.6));   /* parado en la caja (con el modelo generado, la caja va atrás) */
  bucleSfx('motor', 0.3, 0, 0.9 + Math.sin(et.t*0.4)*0.04);
  /* la ruta: tramos nuevos adelante, se sueltan los de atrás */
  let ult = RUTA.tramos[RUTA.tramos.length - 1];
  while(ult.z - RUTA.largo > J.camionZ - 420){ ult = tramoRuta(ult.z - RUTA.largo, J.tema); RUTA.tramos.push(ult); }
  while(RUTA.tramos.length && RUTA.tramos[0].z - RUTA.largo > J.camionZ + 150){ const tr = RUTA.tramos.shift(); escena.remove(tr.malla); for(const m of tr.malla.children){ m.geometry.dispose(); const k = MUNDO.mallas.indexOf(m); if(k >= 0) MUNDO.mallas.splice(k, 1); } { const k = MUNDO.grupos.indexOf(tr.malla); if(k >= 0) MUNDO.grupos.splice(k, 1); }
    for(let i=MUNDO.cajas.length-1;i>=0;i--) if(MUNDO.cajas[i].z0 > J.camionZ + 150) MUNDO.cajas.splice(i,1); }
  /* olas del plan */
  for(const o of et.olas){ if(o.hecha || et.t < o.t) continue; o.hecha = true;
    if(o.ev==='motos') for(let k=0;k<o.n;k++) crearVehiculo('moto');
    else if(o.ev==='camioneta') crearVehiculo('camioneta');
    else if(o.ev==='rpg') crearVehiculo('rpg');
    else if(o.ev==='puente'){ const tr = RUTA.tramos.find(t=> t.puente && t.puente.z < J.camionZ - 90 && !t.usado);
      if(tr){ tr.usado = true; for(let k=0;k<3;k++){ const e = crearEnemigo('tirador', V3(rf(-9, 9), tr.puente.y, tr.puente.z + 3.2), {estado:'apuntar', avisoT:rf(1.8, 2.8), piso:tr.puente.y, puente:tr.puente}); e.rumbo = 0; } aviso('¡PUENTE!', '#ffb43a', 'arriba'); } }
    else if(o.ev==='heli') crearHeli();
  }
  /* los del puente que ya quedaron atrás no cuentan */
  for(const e of J.enemigos) if(e.puente && e.vivo && e.pos.z > J.camionZ + 25){ e.vivo = false; e.cuerpo.g.visible = false; }
  for(const v of J.vehiculos){ v.t += dt;
    if(v.vivo){ v.rel = lerp(v.rel, v.relObj + Math.sin(v.t*0.4)*3, 0.012); v.x = lerp(v.x, v.xObj + (v.tipo==='moto' ? Math.sin(v.t*1.3)*1.2 : Math.sin(v.t*0.5)*0.6), 0.02);
      if(v.chofer && !v.chofer.vivo){ v.sinChofer = (v.sinChofer||0) + dt; v.xObj += dt*3; if(v.sinChofer > 1.4) destruirVehiculo(v); }
      if(v.tipo==='moto' && v.ocup[0] && !v.ocup[0].vivo) destruirVehiculo(v);
      if(v.ocup.every(e=> !e.vivo || e.conduce) && v.t > 3){ v.relObj = 90; }
      if(v.rel > 85 && v.t > 6){ v.vivo = false; v.fuera = true; for(const e of v.ocup) if(e.vivo){ e.vivo = false; e.cuerpo.g.visible = false; } } }
    else { v.rel += dt*14; v.g.rotation.z += v.giro*dt; v.g.rotation.x += dt*0.6; v.g.position.y = Math.max(-0.6, v.g.position.y - dt*0.5); }
    v.g.position.set(v.x, v.g.position.y, J.camionZ + v.rel); }
  for(let i=J.vehiculos.length-1;i>=0;i--) if(J.vehiculos[i].rel > 160){ escena.remove(J.vehiculos[i].g); J.vehiculos.splice(i,1); }
  if(J.heli) pasarHeli(J.heli, dt);
  /* el compañero te pasa cargadores cada 30 s */
  et.recT = (et.recT||30) - dt; if(et.recT <= 0){ et.recT = 30; reponer(); }
  if(J.heli && J.heli.caido > 2.5) avanzarEtapa();
}
function crearHeli(){
  const g = helicoptero(); dinamico(g); const h = {g, heli:true, vivo:true, hp:1100*(0.8 + J.mis.dif*0.2), rel:-60, x:26, y:14, t:0, caido:0, cohT:6};
  g.position.set(h.x, h.y, J.camionZ + h.rel); h.gunner = crearEnemigo('tirador', V3(-1.3, -1.1, 0.4), {padre:g, estado:'apuntar', avisoT:2, piso:0});
  J.heli = h; aviso('¡HELICÓPTERO!', '#ff6a4a', 'bajalo'); sfx('aviso');
}
function pasarHeli(h, dt){
  h.t += dt; const g = h.g, u = g.userData; u.rotor.rotation.y += dt*28; u.cola.rotation.x += dt*30;
  bucleSfx('rotor', h.vivo ? lim(1.2 - Math.hypot(h.x, h.y, h.rel)/60, 0.25, 0.9) : 0.2, lim((h.x + 4)/20, -1, 1), h.vivo ? 1 : 0.7);
  if(h.vivo){ const ph = h.t*0.25; h.x = lerp(h.x, 18 + Math.sin(ph)*8, 0.02); h.y = lerp(h.y, 10 + Math.sin(ph*1.7)*3, 0.02); h.rel = lerp(h.rel, -6 + Math.sin(ph*0.8)*16, 0.015);
    g.rotation.set(Math.sin(ph)*0.08, -Math.PI/2 + Math.sin(ph*0.7)*0.3, Math.sin(ph*1.3)*0.1);
    if(!h.gunner.vivo){ h.nuevoT = (h.nuevoT||5) - dt; if(h.nuevoT <= 0){ h.nuevoT = 5; h.gunner = crearEnemigo('tirador', V3(-1.3, -1.1, 0.4), {padre:g, estado:'apuntar', avisoT:2.2, piso:0}); } }
    h.cohT -= dt; if(h.cohT <= 0){ h.cohT = rf(5, 8); lanzarCohete(g.position.clone().add(V3(-1.5, -1.2, 0)), {}); } }
  else { h.caido += dt; h.y -= dt*6; g.rotation.y += dt*4; if(h.caido > 1.2 && !h.bum){ h.bum = true; explosionFX(g.position.clone()); } }
  g.position.set(h.x, Math.max(0.5, h.y), J.camionZ + h.rel);
}

/* ====================== puerto: blancos ====================== */
function poblarPuesto(i){
  /* cada blanco sale de candidatos (techos, calles, ventanas, barcos) y sólo si se lo ve desde el puesto */
  const D = J.puertoD, n = [5, 6, 7][i], ojo = J.jug.pos.clone();
  J.viento = Math.round(rf(-7, 7)*10)/10; J.alerta = 0;
  const visible = p=>{ for(const dy of [1.6, 1.0]){ const q = p.clone().add(V3(0, dy, 0)), d = q.clone().sub(ojo), L = d.length(); d.normalize(); const w = rayoMundo(ojo, d, L); if(w && w.t < L - 0.4) return false; } return true; };
  let hechos = 0;
  for(let intento=0; intento<400 && hechos<n; intento++){ const r = rnd(); let pos, o;
    if(r < 0.35 && D.techos.length){ const t = elegir(D.techos); pos = V3(t.x + rf(-0.6,0.6), t.y, t.z + rf(-1,1)); o = {estado: rnd() < 0.4 ? 'guardia' : 'patrulla', ruta:{x0:t.x - 1, x1:t.x + 1, z:t.z, y:t.y}}; }
    else if(r < 0.5 && D.ventanas.length){ const w = elegir(D.ventanas); pos = V3(w.x, w.y - 0.95, w.z); o = {estado:'guardia'}; }
    else { const ru = elegir(D.rutas); pos = V3(rf(ru.x0, ru.x1), ru.y, ru.z + rf(-1,1)); o = {estado:'patrulla', ruta:{x0:pos.x - rf(4,9), x1:pos.x + rf(4,9), z:pos.z, y:ru.y}}; }
    const d = pos.distanceTo(ojo); if(d < 50 || d > 190 || !visible(pos)) continue;
    const ang = angDif(J.jug.base, Math.atan2(-(pos.x - ojo.x), -(pos.z - ojo.z))); if(Math.abs(ang) > 1.1) continue;
    if(o.ruta && o.estado==='patrulla' && !(visible(V3(o.ruta.x0, pos.y, pos.z)) && visible(V3(o.ruta.x1, pos.y, pos.z)))) continue;
    const tipo = rnd() < 0.25 ? 'franco' : 'tirador';
    const e = crearEnemigo(tipo, pos, Object.assign(o, {piso:pos.y, sentido:elegir([-1,1])})); e.rumbo = rf(0, TAU); e.lejos = true; hechos++; }
}
function pasarGuardia(e, dt){
  /* patrullan o miran; si se alertan, apuntan al jugador */
  if(J.alerta > 0 || e.alertado){
    /* alertados: el que patrullaba corre a la punta de su ruta (que se vio visible al crearlo) y recién ahí apunta */
    if(e.estado==='patrulla' && e.ruta){ e.estado = 'corre'; e.destX = Math.abs(e.pos.x - e.ruta.x0) < Math.abs(e.pos.x - e.ruta.x1) ? e.ruta.x0 : e.ruta.x1; }
    if(e.estado==='corre'){ const dx = e.destX - e.pos.x; e.moviendo = Math.abs(dx) > 0.15; e.rumbo = dx > 0 ? Math.PI/2 : -Math.PI/2; e.fase += dt*7; e.pos.x += sig(dx)*Math.min(Math.abs(dx), 3.2*dt);
      if(!e.moviendo){ e.estado = 'apuntar'; e.avisoT = e.def.aviso*1.5/J.mis.dif; } return true; }
    if(e.estado==='guardia'){ e.estado = 'apuntar'; e.avisoT = e.def.aviso*(e.tipo==='franco' ? 1 : 2)/J.mis.dif; e.moviendo = false; } return false; }
  if(e.estado==='patrulla'){ const ru = e.ruta; e.pos.x += e.sentido*(ru.x1 - ru.x0 < 3 ? 0.5 : 1.3)*dt; if(e.pos.x > ru.x1 || e.pos.x < ru.x0) e.sentido *= -1; e.rumbo = e.sentido > 0 ? Math.PI/2 : -Math.PI/2; e.moviendo = true; e.fase += dt*4; e.apunta = 0.2; return true; }
  if(e.estado==='guardia'){ e.rumbo += Math.sin(J.tt*0.5 + e.id)*0.01; e.moviendo = false; e.apunta = 0.3; return true; }
  return false;
}
function autoVIP(){
  const v = crearVehiculo('camioneta'); v.vip = true; v.rel = 0; v.g.position.set(-140, 0, -60); v.g.rotation.y = v.g.userData.glb ? -Math.PI/2 : Math.PI/2; v.x = -140; J.vip = v;
  /* el objetivo se escapa en un sedán (si está el modelo): se cambia la carrocería, los ocupantes siguen iguales */
  const sed = vehGLB('veh_sedan', null, 4.7); if(sed && v.g.userData.glb){ const c = v.g.userData.cab; v.g.remove(c); v.g.add(sed.children[0]); v.g.userData.cab = v.g.children[v.g.children.length - 1]; } aviso('¡EL OBJETIVO ESCAPA!', '#ff6a4a', 'bajá al chofer'); sfx('aviso');
  for(const e of v.ocup) if(!e.conduce){ e.vivo = false; e.cuerpo.g.visible = false; } v.chofer.vip = true;
}

/* cargadores: al entrar a un combate (en silencio) y cada tanto en el convoy */
function reponer(callado){ const j = J.jug; let dio = false; for(const id of j.armas){ const A = ARMAS[id]; if(j.res[id] < A.res*0.6){ j.res[id] = Math.round(A.res*0.6); dio = true; } } if(dio && !callado && !J.demo){ aviso('¡CARGADORES!', '#5ad07a'); sfx('recargaB'); } }
/* ====================== etapas del riel ====================== */
function avanzarEtapa(){ J.ei++; J.et = null; }
function pasarEtapa(dt){
  const et = J.etapas[J.ei], j = J.jug; if(!et || J.fin) return;
  const nueva = J.et !== et; J.et = et;
  switch(et.tipo){
    case 'mover': { if(nueva && et.msj && !J.demo) aviso(et.msj, '#fff', J.mis.lugar);
      _v.subVectors(et.a, j.pos); const d = _v.length(), vel = (et.vel||3.2)*dt; j.caminando = d > 0.05;
      if(j.caminando && !J.demo){ j.pasoT = (j.pasoT||0) - dt; if(j.pasoT <= 0){ j.pasoT = 0.36; sfx('paso', 0.3, (j.pie = !j.pie) ? -0.15 : 0.15); } }
      if(d > vel) j.pos.addScaledVector(_v, vel/d); else { j.pos.copy(et.a); avanzarEtapa(); }
      J.objetivo = 'AVANZANDO'; break; }
    case 'combate': case 'jefe': case 'captor': {
      const c = et.c; j.caminando = false;
      if(nueva){ reponer(true); et.ola = 0; et.pausa = 0.6; et.lanzada = false; if(!J.demo && Math.random() < 0.6) setTimeout0(0.9, ()=> voz('contacto'));
        if(et.tipo==='captor'){ /* el captor se para donde se lo ve desde la cubierta */
          const ojo = V3(c.cubierta.x, 1.62, c.cubierta.z); let pos = null;
          for(let k=0;k<30 && !pos;k++){ const q = V3(lim(c.cubierta.x + rf(-3.5,3.5), c.cx - c.W/2 + 1.5, c.cx + c.W/2 - 1.5), 0, c.z0 - rf(7.5, 11)); let ok = true;
            for(const dy of [1.7, 1.3, 1.0]){ const p = q.clone().add(V3(0, dy, 0)), d = p.clone().sub(ojo), L = d.length(); d.normalize(); const w = rayoMundo(ojo, d, L); if(w && w.t < L - 0.5){ ok = false; break; } }
            if(ok) pos = q; }
          capturar(c, pos || V3(c.cubierta.x, 0, c.z0 - 8)); aviso('¡TOMARON UN REHÉN!', '#ff6a4a', 'a la cabeza'); }
        if(et.tipo==='jefe'){ const e = crearEnemigo('coloso', V3(0, 0, c.z1 + 5), {cuarto:c, estado:'apuntar', avisoT:2.5}); J.jefe = e; aviso('EL COLOSO', '#ff6a4a', 'rompé las placas'); sfx('aviso'); } }
      const quedan = J.enemigos.filter(e=> e.vivo && e.cuarto===c).length;
      if(!et.lanzada){ et.pausa -= dt; if(et.pausa <= 0){ et.lanzada = true; if(et.tipo!=='jefe' || et.ola===0) lanzarOla(c, et.ola); } }
      else if(quedan===0 && !(J.jefe && J.jefe.vivo)){ et.ola++;
        if(et.tipo!=='jefe' && et.ola < (c.plan.olas||1)){ et.lanzada = false; et.pausa = 1.2; if(!J.demo) aviso('OLEADA ' + (et.ola+1), '#ffb43a'); }
        else { if(!J.demo) aviso('DESPEJADO', '#5ad07a'); for(const cv of J.civiles) if(cv.vivo && !cv.salvado){ cv.salvado = true; J.stats.rehenes++; } avanzarEtapa(); } }
      J.objetivo = et.tipo==='jefe' ? 'DERRIBÁ A EL COLOSO' : (et.tipo==='captor' ? 'SALVÁ AL REHÉN' : 'LIMPIÁ LA ZONA'); J.hostiles = quedan; break; }
    case 'apariciones': { const c = et.c; j.caminando = false;
      if(nueva){ et.n = ri(2, 3); et.t = 0; et.salieron = 0; }
      et.t += dt;
      if(et.salieron < et.n && et.t > 0.4 + et.salieron*rf(0.5, 1.1)){ et.salieron++; const lugares = c.laterales.length ? c.laterales : [{x:c.xSal, z:c.z1 + 0.5, s:0}];
        const l = elegir(lugares), x = l.s ? c.cx + l.s*(c.W/2 - 0.35) : l.x, e = crearEnemigo(rnd() < 0.25 && J.mis.dif > 1.1 ? 'escudo' : 'tirador', V3(x, 0, l.z), {cuarto:c, estado:'apuntar', avisoT:1.1/J.mis.dif}); e.rumbo = mirarA(e, j.pos); }
      if(et.salieron >= et.n && J.enemigos.filter(e=> e.vivo && e.cuarto===c).length===0) avanzarEtapa();
      J.objetivo = 'EMBOSCADA'; break; }
    case 'brecha': { const c = et.c; j.caminando = false;
      if(nueva){ reponer(true); et.fase = 'espera'; poblarBrecha(c); if(!J.demo) aviso('BRECHA', '#ffb43a', 'tocá el botón para entrar'); }
      if(et.fase==='espera'){ $('bBrecha').style.display = J.demo ? 'none' : 'flex'; J.objetivo = 'PREPARÁ LA BRECHA';
        if(IN.brecha || J.bot){ et.fase = 'adentro'; $('bBrecha').style.display = 'none'; patearPuerta(c); et.t = 0; } }
      else { et.t += dt; const dest = V3(c.xEnt, 1.62, c.z0 - 1.2); if(et.t < 0.9) j.pos.lerp(dest, 0.12);
        const quedan = J.enemigos.filter(e=> e.vivo && e.cuarto===c).length; J.hostiles = quedan; J.objetivo = 'LIMPIÁ EL CUARTO';
        if(quedan===0 && et.t > 0.6){ for(const cv of J.civiles) if(cv.vivo && !cv.salvado){ cv.salvado = true; J.stats.rehenes++; } if(!J.demo) aviso(c.plan.rehenes ? 'REHENES A SALVO' : 'DESPEJADO', '#5ad07a'); J.lento = 0; avanzarEtapa(); } }
      break; }
    case 'franco': { j.caminando = false;
      if(nueva){ reponer(et.i===0); j.pos.set(et.p.x, et.p.y, et.p.z); j.base = et.p.mira; j.yaw = 0; j.pitch = -0.12; poblarPuesto(et.i); et.vip = false; J.fundido = 1; if(!J.demo) aviso('PUESTO ' + (et.i+1), '#fff', 'viento ' + Math.abs(J.viento) + ' m/s'); }
      const quedan = vivos().length; J.hostiles = quedan;
      if(quedan===0 && et.i===2 && !et.vip){ et.vip = true; autoVIP(); }
      if(J.vip && J.vip.vivo && J.vip.chofer.vivo){ const v = J.vip;
        /* frena unos segundos en la barrera del medio: ahí está el tiro limpio */
        if(v.x > -18 && v.x < -12 && (v.barrera||0) < 3){ v.barrera = (v.barrera||0) + dt; } else v.x += dt*7;
        v.g.position.x = v.x; if(v.x > 140) terminar(false, 'EL OBJETIVO ESCAPÓ'); }
      if(quedan===0 && (et.i < 2 || (et.vip && (!J.vip || !J.vip.chofer.vivo)))){ et.fin = (et.fin||0) + dt; if(et.fin > 1.2) avanzarEtapa(); }
      J.objetivo = et.vip ? 'EL OBJETIVO: EL CHOFER' : 'NEUTRALIZÁ LOS BLANCOS'; break; }
    case 'convoy': pasarConvoy(et, dt); J.objetivo = J.heli ? 'DERRIBÁ EL HELICÓPTERO' : 'PROTEGÉ EL CONVOY'; J.hostiles = vivos().filter(e=> !e.conduce).length; break;
    case 'fin': terminar(true); break;
  }
}
function patearPuerta(c){
  sfx('patada'); J.lento = 3.0; sfx('lento'); J.sacudon = 0.4; voz('brecha', true);
  const pu = c.puerta; if(pu){ pu.userData.vel = V3(vr(-1,1), 2, -7); pu.userData.giro = vr(-3,3); c.puertaVuela = pu; }
  const i = MUNDO.cajas.indexOf(c.cajaPuerta); if(i >= 0) MUNDO.cajas.splice(i, 1);
  for(let k=0;k<14;k++) particula(V3(c.xEnt + vr(-0.8,0.8), vr(0.2,2.2), c.z0), V3(vr(-2,2), vr(0,2), vr(-5,-1)), '#8a6a48', vr(0.4,0.9), 1);
}

/* ====================== jugador ====================== */
function rangoYaw(){ return J.mis.tipo==='convoy' ? 2.6 : (J.mis.tipo==='franco' ? 1.3 : 1.35); }
function pasarJugador(dt){
  const j = J.jug, id = armaJ(), A = ARMAS[id], I = J.bot ? pensarBot() : IN;
  if(j.muerto) return;
  /* mira */
  const zf = 1 + (A.zoom*(tieneMej(id,'mira') ? 1.2 : 1) - 1)*j.zoom, sens = (G.sens||1)*0.0042/zf;
  let dx = I.dx, dy = I.dy;
  /* ayuda de mira: sobre un blanco, la mira se frena un poco */
  if(!J.bot && J.sobreBlanco) { dx *= tieneMej(id,'mira') ? 0.5 : 0.65; dy *= tieneMej(id,'mira') ? 0.5 : 0.65; }
  j.yaw -= dx*sens; j.pitch -= dy*sens; IN.dx = IN.dy = 0;
  const rY = rangoYaw();
  j.yaw = lim(j.yaw, -rY, rY); j.pitch = lim(j.pitch, -0.75, 0.6);
  j.retP *= Math.pow(0.0015, dt); j.retY *= Math.pow(0.002, dt);
  /* cubierta, zoom, aire */
  j.cubierto = !!I.cubrir; j.cubT = lim(j.cubT + (j.cubierto ? 6 : -7)*dt, 0, 1);
  j.zoom = lim(j.zoom + ((I.apuntar || IN.apuntarT) && j.cubT < 0.5 && j.recarga <= 0 ? 8 : -9)*dt, 0, 1);
  if(I.aire && j.zoom > 0.5 && j.aireCd <= 0){ j.aire += dt; if(j.aire > 4){ j.aireCd = 3; j.aire = 0; } } else { if(j.aire > 0){ j.aireCd = Math.max(j.aireCd, 1); } j.aire = 0; j.aireCd -= dt; }
  /* armas */
  j.cadT -= dt;
  if(j.recarga > 0){ j.recarga -= dt; if(j.recarga <= 0) terminarRecarga(); }
  if(I.recargar) empezarRecarga();
  if(I.arma && J.mis.tipo!=='franco') cambiarArma();
  if(I.granada) tirarCegadora();
  const tira = A.auto ? I.fuego : (I.fuegoP || (J.bot && I.fuego));
  if(tira){ if(A.porBala && j.recarga > 0 && j.carg[id] > 0){ j.recarga = 0; } dispararJugador(); }
  /* vida: se recupera a cubierto */
  j.sinDano += dt; if(j.cubT > 0.6 && j.sinDano > 2) j.hp = Math.min(j.hpMax, j.hp + 9*dt);
  IN.fuegoP = IN.recargar = IN.arma = IN.granada = false;
}
const VM_POSE = {pistola:{x:0.12, y:-0.13, z:-0.3, za:-0.26, s:1.0}, fusil:{x:0.17, y:-0.19, z:-0.38, za:-0.3, s:0.8}, franco:{x:0.18, y:-0.2, z:-0.4, za:-0.3, s:0.78}};
function ubicarCamara(dt){
  const j = J.jug, id = armaJ(), A = ARMAS[id], t = J.tt;
  const zf = 1 + (A.zoom*(tieneMej(id,'mira') ? 1.2 : 1) - 1)*j.zoom;
  cam.fov = 62/zf; cam.updateProjectionMatrix();
  let cy = j.pos.y, cz = j.pos.z, cxx = j.pos.x; const c = j.cubT*j.cubT*(3 - 2*j.cubT);
  const enBrecha = J.et && J.et.tipo==='brecha';
  if(enBrecha){ cxx += c*1.1*(J.et.c.xEnt > 0 ? -1 : 1); cz += c*1.4; cy -= c*0.2; }
  else if(J.mis.tipo==='franco'){ cy -= c*1.3; }
  else { cy -= c*0.74; cz += c*0.28; }
  if(j.caminando){ j.bob += dt*9; cy += Math.sin(j.bob)*0.035; cxx += Math.cos(j.bob*0.5)*0.02; }
  let sw = 0, swp = 0;
  if(j.zoom > 0.5 && A.clase==='francotirador'){ const k = j.aire > 0 ? 0.12 : (j.aireCd > 0 ? 1.8 : 1); sw = (Math.sin(t*0.9)*0.0045 + Math.sin(t*2.3)*0.002)*k; swp = (Math.sin(t*1.3)*0.0035 + Math.cos(t*2.9)*0.0015)*k; }
  const sac = J.sacudon||0; if(sac > 0){ J.sacudon = Math.max(0, sac - dt); }
  cam.position.set(cxx + vr(-1,1)*sac*0.05, cy + vr(-1,1)*sac*0.05, cz);
  J.sw = sw; J.swp = swp;
  cam.rotation.order = 'YXZ'; cam.rotation.set(j.pitch + j.retP + swp, j.base + j.yaw + j.retY + sw, 0);
  /* luces que siguen: la clave de costado y la lámpara */
  cam.updateMatrixWorld(); luzSigue();
  lampara.position.set(cam.position.x, cam.position.y + 1.2, cam.position.z - 2.5);
  fogonazo.intensity *= 0.6;
  /* el arma en la mano */
  const vm = VM.g; VM.patada *= Math.pow(0.0005, dt); VM.cambio = Math.max(0, (VM.cambio||0) - dt*3);
  const rec = j.recarga > 0 ? Math.sin((1 - j.recarga/j.recargaTot)*Math.PI) : 0, ads = j.zoom;
  /* dónde va el arma según la clase (la pistola, más cerca y más grande, como en todo shooter) */
  const PZ = A.clase==='pistola' ? VM_POSE.pistola : (A.clase==='francotirador' ? VM_POSE.franco : VM_POSE.fusil), es = PZ.s;
  vm.scale.setScalar(es);
  const ax = -VM.mira.x*es, ay = -VM.mira.y*es - 0.004;   /* apuntando, la mira del modelo queda en el centro de la pantalla */
  vm.position.set(lerp(PZ.x, ax, ads), lerp(PZ.y, ay, ads) - c*0.25 - rec*0.06 - VM.cambio*0.3 + (j.caminando ? Math.abs(Math.sin(j.bob))*0.012 : 0), lerp(PZ.z, PZ.za, ads) + VM.patada*0.07);
  vm.rotation.set(VM.patada*0.16 - rec*0.7 + c*0.5, rec*0.4, rec*0.5);
  vm.visible = !(ads > 0.85 && A.clase==='francotirador');
  if(VM.flT > 0){ VM.flT -= dt; VM.fl.position.set(0, VM.bocaY, VM.boca - 0.03); VM.fl.rotation.z = vr(0,3); VM.fl.scale.setScalar(vr(0.8, 1.25)); VM.luzF.position.copy(VM.fl.position).applyMatrix4(VM.arma.matrixWorld); VM.luzF.intensity = 3.5; if(VM.flT <= 0){ VM.fl.visible = false; VM.luzF.intensity = 0; } }
  $('mira').classList.toggle('ver', ads > 0.85 && A.clase==='francotirador');
}

/* ====================== piloto automático (banco y portada) ====================== */
const BOT = {obj:null, cub:0, t:0, err:V3(0,0,0), I:{}};
/* ¿algún civil cruza la línea de tiro? rayos contra el cuerpo entero (brazos arriba incluidos), con un margen por la dispersión */
function civEnLinea(o, d, L, marg){
  const der = V3(0,1,0).cross(d).normalize(), arr = d.clone().cross(der).normalize();
  for(const c of J.civiles){ if(!c.vivo || !c.pts) continue; if(c.pts.pec.distanceTo(o) > L + 1) continue;
    for(const [a, b] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){ const dd = d.clone().addScaledVector(der, a*marg).addScaledVector(arr, b*marg).normalize();
      if(rayoCuerpo(o, dd, c, L)) return true; } }
  return false;
}
function blancosBot(){
  const L = []; const cp = cam.position;
  for(const e of J.enemigos){ if(!e.vivo || !e.pts || e.espera > 0 || !e.cuerpo.g.visible || e.conduce && !e.vip && !(J.vehiculos.find(v=> v.chofer===e && v.vivo))) continue;
    for(const k of ['cab','pec']){ const p = e.pts[k]; const d = p.clone().sub(cp), L2 = d.length(); d.normalize();
      const w = rayoMundo(cp, d, L2); if(w && w.t < L2 - 0.2) continue;
      if(civEnLinea(cp, d, L2, e.def.captor && k==='cab' ? 0.004 : 0.018)) continue;
      if(e.escudoCaja && k==='pec' && rayoEscudo(cp, d, e.escudoCaja, L2) !== null) continue;
      L.push({e, p, k, d:L2, prio:(e.estado==='apuntar' || e.estado==='disparar' ? 2 : 0) + (e.def.captor ? 5 : 0) + (k==='cab' ? 0.5 : 0) - L2*0.02}); break; } }
  if(J.heli && J.heli.vivo) L.push({heli:true, p:J.heli.g.position.clone(), d:J.heli.g.position.distanceTo(cp), prio:-1});
  return L.sort((a,b)=> b.prio - a.prio);
}
function pensarBot(){
  const j = J.jug, I = BOT.I; for(const k in I) I[k] = false; I.dx = 0; I.dy = 0;
  const id = armaJ(), A = ARMAS[id], et = J.etapas[J.ei];
  BOT.t -= DT;
  if(et && et.tipo==='brecha' && et.fase==='espera') I.brecha = true;
  const peligro = J.enemigos.some(e=> e.vivo && (e.estado==='disparar' || (e.estado==='apuntar' && e.avisoT < 0.35)) && !e.lejos);
  if(BOT.cub > 0){ BOT.cub -= DT; I.cubrir = true; if(j.carg[id] < cargadorMax(id)*0.6) I.recargar = true; return I; }
  if(peligro && j.hp < j.hpMax*0.45 && Math.random() < 0.08){ BOT.cub = rf(1.0, 1.8); return I; }
  if(j.carg[id]===0 && j.res[id] > 0){ I.recargar = true; if(j.recarga > 0){ I.cubrir = true; } return I; }
  if(j.carg[id]===0 && j.res[id]===0 && J.mis.tipo!=='franco'){ I.arma = true; return I; }
  const L = blancosBot(); const b = L[0];
  if(vivos().filter(e=> !e.lejos && e.estado!=='muerto').length >= 4 && j.granadas > 0 && Math.random() < 0.01) I.granada = true;
  if(!b){ const y = -j.yaw*0.05, p = -j.pitch*0.05; j.yaw += y; j.pitch += p; return I; }
  /* apunta al blanco (con el francotirador compensa caída y viento) */
  let p = b.p.clone(); if(b.heli) p.y += 0.5;
  if(A.bala){ const t = b.d/A.bala; p.y += 0.5*9.8*t*t; p.x -= 0.5*J.viento*3.5*t*t; if(b.e && b.e.moviendo && b.e.estado==='patrulla') p.x += b.e.sentido*1.3*t; if(J.vip && b.e === J.vip.chofer && !(J.vip.x > -18 && J.vip.x < -12 && (J.vip.barrera||0) < 3)) p.x += 7*t; }
  if(BOT.obj !== b.e){ BOT.obj = b.e; BOT.err.set(vr(-0.03,0.03), vr(-0.03,0.03), 0); }
  BOT.err.multiplyScalar(0.9);
  const d = p.sub(cam.position).normalize();
  const yawObj = Math.atan2(-d.x, -d.z) - j.base, pitObj = Math.asin(lim(d.y, -1, 1));
  const ey = angDif(j.yaw + j.retY + (J.sw||0), yawObj) + BOT.err.x, ep = pitObj - (j.pitch + j.retP + (J.swp||0)) + BOT.err.y;
  const kk = A.bala && Math.abs(ey) < 0.03 && Math.abs(ep) < 0.03 ? 1 : 0.25; j.yaw += ey*kk; j.pitch += ep*kk; const ry = Math.abs(ey*(1 - kk)), rp = Math.abs(ep*(1 - kk));
  const tol = A.bala ? 0.05/Math.max(1, b.d) : Math.max(0.004, (b.k==='cab' ? 0.1 : 0.2)/Math.max(1, b.d));
  if(A.bala && j.zoom > 0.5){ I.aire = true; }
  /* con un civil cerca de la línea: con mira y de a un tiro, con el retroceso asentado */
  const dl = d.clone(), cuidado = J.civiles.some(c=> c.vivo && c.pts && ['cab','pec','pel'].some(k=> c.pts[k].clone().sub(cam.position).normalize().angleTo(dl) < 0.15));
  if(A.zoom > 2.5 || b.d > 25 || cuidado) I.apuntar = true;
  const k2 = A.bala ? 1 : 2;
  const ex = A.bala ? ry : Math.abs(ey), epp = A.bala ? rp : Math.abs(ep);
  if(ex < tol*k2 && epp < tol*k2 && (!I.apuntar || j.zoom > 0.9) && (!cuidado || (j.retP < 0.004 && ex < tol && epp < tol))){ I.fuego = true; if(cuidado) BOT.pausa = 0.25; if(A.clase==='francotirador') I.aire = true; }
  if(BOT.pausa > 0){ BOT.pausa -= DT; if(I.fuego && cuidado && j.cadT > -0.2) I.fuego = false; }
  return I;
}

/* ====================== fin ====================== */
function terminar(gano, motivo){
  if(J.fin) return; J.fin = {gano, motivo:motivo||'', t: gano ? 1.6 : 2.2, hecho:false};
  if(!J.demo){ if(gano){ cortina(true); aviso('MISIÓN CUMPLIDA', '#5ad07a'); } else { cortina(false); aviso('MISIÓN FALLIDA', '#ff6a4a', motivo); J.lento = 1.2; } }
}
