/* ================================================================ lo que piensa el mutante
   Afuera: merodea → elige una entrada → se acerca → respira del otro lado del vidrio → rompe → arranca tablas → entra.
   La luz del cuarto (o la linterna en la cara) lo hace gritar y huir. Adentro: busca, escucha, persigue; al placard lo
   olfatea y tira de la puerta. Si pasa un rato sin encontrarte, se va por donde vino. */
const hNoche = () => lim((J.hora - 24)/6, 0, 1);
const luzEnSala = id => { const L = MUNDO.luces.find(l => l.sala === id); return !!(L && L.on && ELEC.hay); };
function ponerMon(x, y, z){ MON.x = x; MON.y = y; MON.z = z; }
function activarMonstruo(){ MON.activo = true; MON.adentro = false; MON.piso = 0; ponerMon(0, 0, 20); MON.estado = 'merodea'; MON.t = rv(10, 16); MON.camino = []; MON.cool = 0; MODELO.raiz.visible = true; }
function estado(e, t){ MON.estado = e; MON.t = t === undefined ? 0 : t; MON.camino = []; MON.ci = 0; MON.luzT = 0; MON.flashT = 0; }
/* caminar por una lista de puntos; devuelve true al llegar */
function seguir(dt, vel){
  const C = MON.camino; if(!C || MON.ci >= C.length) return true;
  let resto = vel*dt;
  while(resto > 0 && MON.ci < C.length){ const q = C[MON.ci], dx = q[0] - MON.x, dz = q[1] - MON.z, d = Math.hypot(dx, dz);
    if(q[2] === 'esc'){ MON.enEsc = true; } else if(q[2] !== undefined){ MON.piso = q[2]; MON.enEsc = false; }
    if(d <= resto){ MON.x = q[0]; MON.z = q[1]; resto -= d; MON.ci++; }
    else { MON.x += dx/d*resto; MON.z += dz/d*resto; resto = 0; girarHacia(dx, dz, dt, 8); }
    abrirPuertasCerca(); }
  if(MON.adentro){ MON.y = enEscalera(MON.x, MON.z) ? rampa(MON.z) : alturaPiso(MON.piso); if(enEscalera(MON.x, MON.z)) MON.piso = MON.y > 1.6 ? 1 : 0; }
  return MON.ci >= C.length;
}
function girarHacia(dx, dz, dt, k){ const obj = Math.atan2(dx, dz); MON.yaw += angDif(MON.yaw, obj)*Math.min(1, dt*(k || 6)); }
function abrirPuertasCerca(){ if(!MON.adentro && !MON.entrando) return; for(const id in MUNDO.puertas){ const P = MUNDO.puertas[id];
  if(P.piso !== MON.piso || P.meta > 0.5 || P.rota) continue; if(Math.hypot(P.centro[0] - MON.x, P.centro[1] - MON.z) < 1.2 && !(P.ext && P.llave)){ moverPuerta(P, 1, true); } } }
function irAfuera(x, z){ const a = nodoMasCercano(MON.x, MON.z), b = nodoMasCercano(x, z); const c = caminoAfuera(a, b); c.unshift([MON.x, MON.z]); c.push([x, z]); MON.camino = c; MON.ci = 0; }
function irAdentro(x, z, piso){ const c = caminoAdentro(MON.piso, MON.x, MON.z, piso, x, z); MON.camino = c || []; MON.ci = 0; return !!c; }
const distJug = () => Math.hypot(JUG.x - MON.x, JUG.z - MON.z);
const _cab = new THREE.Vector3();
const cabezaMon = () => { if(MODELO.raiz && MODELO.raiz.visible && MODELO.cab){ MODELO.cab.getWorldPosition(_cab); return [_cab.x, _cab.y, _cab.z]; }
  return [MON.x + Math.sin(MON.yaw)*0.3, MON.y + (MON.estado === 'trepa' || MON.trepado ? 2.0 : 2.15), MON.z + Math.cos(MON.yaw)*0.3]; };

/* elegir por dónde entrar: lo débil, lo oscuro, lo que está cerca; tarde a la noche, cerca tuyo */
function elegirEntrada(){
  if(MON.forzar){ const v = MUNDO.ventanas[MON.forzar]; MON.forzar = null; if(v && !v.rota) return {tipo:'v', v}; }
  const h = hNoche(), op = [];
  for(const id in MUNDO.ventanas){ const v = MUNDO.ventanas[id]; if(v.rota && v.tablas === 0) continue;
    let w = 1 + (3 - v.tablas)*1.3 + (v.vidrio ? 0 : 0.6); if(luzEnSala(v.sala)) w *= 0.12; if(v.piso) w *= 0.55; if(v.chica) w *= 0.7;
    w /= 1 + Math.hypot(v.afuera[0] - MON.x, v.afuera[1] - MON.z)/18; if(MON.ultimo === id) w *= 0.3;
    if(h > 0.4) w *= 1 + 1.2/(1 + Math.hypot(v.pos[0] - JUG.x, v.pos[2] - JUG.z)/5);
    op.push([w, {tipo:'v', v}]); }
  for(const id in MUNDO.puertas){ const p = MUNDO.puertas[id]; if(!p.ext || p.rota) continue;
    let w = p.llave ? 0.35 : (p.meta > 0.5 ? 4 : 2.2); const lz = id === 'p_frente' ? 'porche' : 'fondo'; if(luzEnSala(lz)) w *= 0.2; if(MON.ultimo === id) w *= 0.4; op.push([w, {tipo:'p', p}]); }
  let s = op.reduce((a, o) => a + o[0], 0), r = Math.random()*s; for(const [w, o] of op){ r -= w; if(r <= 0) return o; } return op[0][1];
}
function huir(grito){ if(grito !== false){ SON.fx('m_grito', {pos:cabezaMon(), adentro:false}); J.stats.echado++; } SON.bucleParar('m_resp');
  MON.trepado = false; const lejos = AFUERA.nodos.map((o, i) => [o, i]).filter(([o]) => o.tipo === 'lejos'); const [, i] = elegir(lejos);
  irAfuera(AFUERA.nodos[i].x, AFUERA.nodos[i].z); MON.estado = 'huye'; MON.t = 0; MON.cool = rv(16, 28)*(1 - hNoche()*0.4)*(J.dif === DIFS.facil ? 1.3 : 1); }
function linternaEnCara(){ const L = JUG.linterna; if(!L.on || L.bat <= 0) return false; const c = RND.cam.position, h = cabezaMon(), dx = h[0] - c.x, dy = h[1] - c.y, dz = h[2] - c.z, d = Math.hypot(dx, dy, dz);
  if(d > 8.5) return false; const f = new THREE.Vector3(0, 0, -1).applyQuaternion(RND.cam.quaternion); return (f.x*dx + f.y*dy + f.z*dz)/d > Math.cos(0.17); }
/* ¿te ve? adentro, por la grilla y con cono; afuera, sin la casa en el medio */
function veAlJugador(){
  if(JUG.en === 'placard' || J.modo !== 'juego') return false; const d = distJug();
  if(MON.adentro){ if(!JUG.adentro) return false; const mismo = JUG.piso === MON.piso || enEscalera(JUG.x, JUG.z) || enEscalera(MON.x, MON.z); if(!mismo) return false;
    let alc = J.dif.ve; if((JUG.linterna.on && JUG.linterna.bat > 0) || (JUG.sala && luzEnSala(JUG.sala.id))) alc *= 1.6; if(d > alc) return false;
    const cono = Math.abs(angDif(MON.yaw, Math.atan2(JUG.x - MON.x, JUG.z - MON.z))) < 1.05 || d < 2.2; if(!cono) return false;
    return veGrilla(MON.piso, MON.x, MON.z, JUG.x, JUG.z, false); }
  if(JUG.adentro) return false; return d < 24 && libreAfuera(MON.x, MON.z, JUG.x, JUG.z);
}
function atrapar(){ if(J.modo !== 'juego') return; MON.estado = 'mata'; MON.t = 1.5; MON.frente = null; UI.hud(false); MON.anim = 'agarra'; J.modo = 'susto'; SON.fx('susto'); SON.bucleParar('m_resp'); vibrar([90, 40, 160]);
  UI.cerrarTodo(); J.muerto = MON.adentro ? 'monstruo' : 'afuera'; }

function pasoMonstruo(dt){
  const R = MODELO.raiz; if(!MON.activo){ R.visible = MON.preview > 0;
    if(MON.preview > 0){ MON.preview -= dt;
      /* el cruce: galopa por la calle de enfrente, de una punta a la otra, y no mira */
      if(MON.cruza){ MON.x += 4.8*dt; MON.yaw = Math.PI/2; MON.anim = 'corre'; const antes = Math.sin(MON.fase); MON.fase += dt*4.8*2.4; if(antes < 0 && Math.sin(MON.fase) >= 0) SON.fx('m_corre', {pos:[MON.x, 0.4, MON.z], vol:0.7}); if(MON.preview <= 0) MON.cruza = false; } }
    poseMonstruo(dt); if(R.visible){ R.position.set(MON.x, MON.y, MON.z); R.rotation.y = MON.yaw; } return; }
  MON.t -= dt; MON.cool -= dt; MON.mirarCamara = Math.max(0, MON.mirarCamara - dt); const d = distJug(), h = hNoche();
  let vel = 0, anim = 'quieto';
  switch(MON.estado){
    case 'merodea': {
      if(!MON.camino.length || MON.ci >= MON.camino.length){ if(MON.espera > 0) MON.espera -= dt; else { const cand = AFUERA.nodos.filter(o => o.tipo !== 'entrada'); const o = elegir(cand); irAfuera(o.x, o.z); MON.espera = rv(1, 3.5); } }
      else { vel = 1.7; anim = 'camina'; if(seguir(dt, vel)) MON.espera = rv(1.5, 4); }
      if(veAlJugador()){ SON.fx('m_grito', {pos:cabezaMon()}); estado('caza', 0); break; }
      if(MON.t <= 0 || MON.forzar){ const e = elegirEntrada(); MON.entrada = e; MON.ultimo = e.tipo === 'v' ? e.v.id : e.p.id; const q = e.tipo === 'v' ? e.v.afuera : e.p.afuera; irAfuera(q[0], q[1]); MON.estado = 'acercarse'; }
      /* a veces se asoma a la ventana donde estás, nada más para mirarte */
      else if(JUG.adentro && Math.random() < dt*0.035 && MON.peekT <= 0){ const v = ventanaCercaDelJugador(); if(v){ MON.peek = v; irAfuera(v.afuera[0], v.afuera[1]); MON.estado = 'asoma'; MON.t = 14; MON.peekT = 40; } }
      MON.peekT -= dt; break; }
    case 'acercarse': {
      vel = 2.7; anim = 'camina'; if(veAlJugador() && !JUG.adentro){ SON.fx('m_grito', {pos:cabezaMon()}); estado('caza'); break; }
      if(seguir(dt, vel)){ const e = MON.entrada;
        if(e.tipo === 'v'){ const v = e.v; MON.yaw = Math.atan2(-v.n[0], -v.n[1]); if(v.piso){ MON.estado = 'trepa'; MON.t = 2.2; SON.fx('m_trepa', {pos:[MON.x, 2, MON.z]}); } else { MON.estado = 'respira'; MON.t = lerp(J.dif.respira[0], J.dif.respira[1], h)*rv(0.9, 1.1); } }
        else { const p = e.p; MON.yaw = Math.atan2(-p.n[0], -p.n[1]); if(p.meta > 0.5 && !p.rota){ MON.estado = 'entraPuerta'; MON.t = 1.0; } else if(p.llave){ MON.estado = 'golpea'; MON.t = 0.5; } else { moverPuerta(p, 1, true); MON.estado = 'entraPuerta'; MON.t = 1.2; } } }
      break; }
    case 'trepa': { const v = MON.entrada.v, meta = v.sy0 - 1.75; anim = 'trepa'; MON.fase += dt*3;
      MON.x += (v.pos[0] + v.n[0]*0.45 - MON.x)*Math.min(1, dt*3); MON.z += (v.pos[2] + v.n[1]*0.45 - MON.z)*Math.min(1, dt*3); MON.y = lerp(MON.y, meta, Math.min(1, dt*1.4));
      if(MON.t <= 0){ MON.trepado = true; MON.estado = 'respira'; MON.t = lerp(J.dif.respira[0], J.dif.respira[1], h)*rv(0.9, 1.1); } break; }
    case 'respira': case 'rompe': case 'arranca': {
      const v = MON.entrada.v; anim = MON.estado === 'respira' ? 'asoma' : 'ventana';
      /* la cara va en el vidrio: se mide dónde quedó la cabeza respecto de la raíz y se corre la raíz para que el centro de la
         cabeza quede a 0,6 m del vidrio y a la altura del medio de la ventana (abajo se agacha; arriba ya está trepado) */
      let dn = 0.62, dy = MON.y; if(MODELO.cab && !v.piso){ const hw = new THREE.Vector3(); MODELO.cab.getWorldPosition(hw); hw.sub(MODELO.raiz.position);
        dn = lim(0.6 - (hw.x*v.n[0] + hw.z*v.n[1]), 0.45, 1.6); dy = lim(v.pos[1] + 0.05 - hw.y, -0.7, 0); }
      MON.x += (v.pos[0] + v.n[0]*dn - MON.x)*Math.min(1, dt*4); MON.z += (v.pos[2] + v.n[1]*dn - MON.z)*Math.min(1, dt*4); MON.y += (dy - MON.y)*Math.min(1, dt*3);
      MON.yaw += angDif(MON.yaw, Math.atan2(-v.n[0], -v.n[1]))*Math.min(1, dt*6);
      SON.bucle('m_resp', 'm_respira_bucle', {pos:[v.pos[0] + v.n[0]*0.4, v.pos[1], v.pos[2] + v.n[1]*0.4], vol:1, adentro:false, ocluido:v.vidrio && v.tablas ? 0.3 : 0});
      /* la luz del cuarto lo espanta; la linterna en la cara también */
      if(luzEnSala(v.sala)){ MON.luzT += dt; if(MON.luzT > 0.6){ huir(); break; } } else MON.luzT = Math.max(0, MON.luzT - dt);
      if(linternaEnCara()){ MON.flashT += dt; JUG.linterna.bat = Math.max(0, JUG.linterna.bat - dt*1.5); if(MON.flashT > 1.0){ huir(); break; } } else MON.flashT = Math.max(0, MON.flashT - dt*0.5);
      if(MON.estado === 'respira'){ if(MON.t <= 0){ if(v.vidrio){ v.vidrio = false; v.mVidrio.visible = false; SON.fx('vidrio_rompe', {pos:v.pos, adentro:true}); if(d < 7) J.temblor = Math.max(J.temblor, 0.5); vidrios(v); }
          MON.estado = 'arranca'; MON.t = lerp(J.dif.tablaSeg[0], J.dif.tablaSeg[1], h)*rv(0.85, 1.15); MON.golpeT = 0.3; } }
      else { MON.fase += dt*2.5; MON.golpeT -= dt;
        if(v.tablas > 0){ if(MON.golpeT <= 0){ MON.golpeT = rv(0.6, 1.1); SON.fx('tabla_golpe', {pos:v.pos, adentro:true}); const m = v.mTablas[v.tablas - 1]; m.userData.sac = 0.25; if(d < 6) J.temblor = Math.max(J.temblor, 0.25); }
          if(MON.t <= 0){ v.tablas--; mostrarTablas(v); SON.fx('tabla_arranca', {pos:v.pos, adentro:true}); tablaQueCae(v); MON.t = lerp(J.dif.tablaSeg[0], J.dif.tablaSeg[1], h)*rv(0.85, 1.15); } }
        else if(MON.t <= 0 || MON.t > 1.4){ MON.t = Math.min(MON.t, 1.3); if(MON.t <= 0){ SON.bucleParar('m_resp'); v.rota = true; MON.estado = 'entrando'; MON.t = 1.8; MON.desde = [MON.x, MON.y, MON.z]; SON.fx('m_entra', {pos:v.pos, adentro:true}); } } }
      break; }
    case 'golpea': { const p = MON.entrada.p; anim = 'ventana'; MON.fase += dt*2;
      const lz = p.id === 'p_frente' ? 'porche' : 'fondo'; if(luzEnSala(lz)){ MON.luzT += dt; if(MON.luzT > 0.8){ huir(); break; } }
      if(!p.llave){ moverPuerta(p, 1, true); MON.estado = 'entraPuerta'; MON.t = 1.2; break; }
      if(MON.t <= 0){ MON.t = rv(0.8, 1.2); p.hp -= 1/11; SON.fx('puerta_golpe', {pos:[p.centro[0], 1.2, p.centro[1]]}); if(d < 8) J.temblor = Math.max(J.temblor, 0.35);
        if(p.hp <= 0){ p.rota = true; p.llave = false; moverPuerta(p, 1, false); SON.fx('puerta_rompe', {pos:[p.centro[0], 1.2, p.centro[1]]}); MON.estado = 'entraPuerta'; MON.t = 1.0; } } break; }
    case 'entraPuerta': { const p = MON.entrada.p; anim = 'camina'; vel = 2.2; MON.entrando = true;
      if(!MON.camino.length){ MON.camino = [[p.centro[0], p.centro[1]], [p.adentro[0], p.adentro[1]]]; MON.ci = 0; }
      if(seguir(dt, vel)){ MON.entrando = false; MON.adentro = true; MON.piso = 0; MON.y = 0; MON.adentroT = J.dif.adentroSeg; MON.salida = {tipo:'p', p}; estado('busca'); SON.fx('m_grunido', {pos:cabezaMon(), adentro:true}); } break; }
    case 'entrando': { const v = MON.entrada.v, k = 1 - Math.max(0, MON.t)/1.8; anim = 'trepa'; MON.fase += dt*4;
      MON.x = lerp(MON.desde[0], v.adentro[0], k); MON.z = lerp(MON.desde[2], v.adentro[1], k); MON.y = lerp(MON.desde[1], alturaPiso(v.piso), k) + Math.sin(k*Math.PI)*0.6;
      if(MON.t <= 0){ MON.adentro = true; MON.trepado = false; MON.piso = v.piso; MON.y = alturaPiso(v.piso); MON.adentroT = J.dif.adentroSeg; MON.salida = {tipo:'v', v}; estado('busca'); } break; }
    case 'busca': case 'investiga': {
      MON.adentroT -= dt; vel = MON.estado === 'investiga' ? 2.6 : 1.9; anim = 'camina';
      if(veAlJugador()){ SON.fx('m_grito', {pos:cabezaMon(), adentro:true}); MON.vistoT = 0; estado('persigue'); break; }
      if(JUG.ruido > 0 && d < JUG.ruido*1.25 && (JUG.piso === MON.piso || d < 5)){ MON.oidoPos = [JUG.x, JUG.z, JUG.piso]; if(irAdentro(JUG.x, JUG.z, JUG.piso)) MON.estado = 'investiga'; JUG.ruido = 0; }
      if(MON.adentroT <= 0){ salirDeLaCasa(); break; }
      if(!MON.camino.length || MON.ci >= MON.camino.length){
        /* al llegar: si hay un placard en este cuarto, a veces lo olfatea */
        const q = placardEnSala(); if(q && Math.random() < lerp(0.35, 0.6, h) && MON.olfT <= 0){ MON.olfT = lerp(14, 8, h); MON.placardVisto = q; irAdentro(q.frente[0], q.frente[1], q.piso); MON.estado = 'haciaPlacard'; break; }
        MON.estado = 'busca'; const s = Math.random() < 0.45 && JUG.adentro ? JUG.sala : elegir(SALAS.filter(o => Math.random() < 0.7 ? o.piso === MON.piso : true));
        if(s){ const cx = (s.x0 + s.x1)/2 + rv(-1, 1), cz = (s.z0 + s.z1)/2 + rv(-1, 1); irAdentro(cx, cz, s.piso); } }
      else seguir(dt, vel);
      MON.olfT = (MON.olfT || 0) - dt; break; }
    case 'persigue': {
      vel = J.dif.corre*(1 + h*0.08); anim = 'corre'; MON.repT = (MON.repT || 0) - dt;
      if(veAlJugador()){ MON.vistoT = 0; MON.ultVisto = [JUG.x, JUG.z, JUG.piso]; } else MON.vistoT += dt;
      if(JUG.en === 'placard'){ if(MON.vistoT < 2.2){ MON.placardVisto = JUG.placard; irAdentro(JUG.placard.frente[0], JUG.placard.frente[1], JUG.placard.piso); MON.estado = 'haciaPlacard'; break; } }
      if(MON.vistoT > 3.5){ const u = MON.ultVisto || [JUG.x, JUG.z, JUG.piso]; irAdentro(u[0], u[1], u[2]); MON.estado = 'investiga'; break; }
      if(MON.repT <= 0){ MON.repT = 0.35; const u = MON.vistoT < 0.5 ? [JUG.x, JUG.z, JUG.piso] : (MON.ultVisto || [JUG.x, JUG.z, JUG.piso]); irAdentro(u[0], u[1], u[2]); }
      seguir(dt, vel); if(d < 1.05 && Math.abs(JUG.y - MON.y) < 1.2) atrapar(); break; }
    case 'haciaPlacard': { vel = 2.4; anim = 'camina'; const q = MON.placardVisto;
      if(seguir(dt, vel)){ MON.yaw = Math.atan2(q.dentro[0] - q.frente[0], q.dentro[1] - q.frente[1]); MON.estado = 'olfatea'; MON.t = 1.8; SON.fx('m_olfatea', {pos:cabezaMon(), adentro:true}); } break; }
    case 'olfatea': { anim = 'mira'; const q = MON.placardVisto;
      if(MON.t <= 0){ if(JUG.en === 'placard' && JUG.placard === q){ MON.estado = 'tira'; MON.t = 0; empezarQTE(); } else estado('busca'); } break; }
    case 'tira': { anim = 'ventana'; MON.fase += dt*3; if(Math.random() < dt*1.5) SON.fx('puerta_golpe', {pos:[JUG.x, JUG.y + 1, JUG.z], vol:0.7}); J.temblor = Math.max(J.temblor, 0.3);
      if(QTE.estado === 'ganado'){ SON.fx('m_grunido', {pos:cabezaMon(), adentro:true}); salirDeLaCasa(); }
      else if(QTE.estado === 'perdido'){ atrapar(); } break; }
    case 'seVa': { vel = 2.4; anim = 'camina';
      if(seguir(dt, vel)){ const s = MON.salida; MON.adentro = false; MON.piso = 0; MON.y = 0;
        if(s && s.tipo === 'v'){ ponerMon(s.v.afuera[0], 0, s.v.afuera[1]); } else if(s && s.tipo === 'p'){ ponerMon(s.p.afuera[0], 0, s.p.afuera[1]); }
        huir(false); } break; }
    case 'huye': { vel = 5.8; anim = 'corre'; MON.y += (0 - MON.y)*Math.min(1, dt*5); if(seguir(dt, vel)){ MON.y = 0; MON.estado = 'lejos'; } break; }
    case 'lejos': { anim = 'quieto'; if(MON.cool <= 0){ estado('merodea', lerp(J.dif.vagar[0], J.dif.vagar[1], h)*rv(0.7, 1.2)); } break; }
    case 'asoma': { const v = MON.peek; anim = 'camina'; vel = 1.6;
      if(MON.ci < MON.camino.length){ seguir(dt, vel); }
      else { anim = 'mira'; MON.yaw += angDif(MON.yaw, Math.atan2(-v.n[0], -v.n[1]))*Math.min(1, dt*4); MON.x += (v.pos[0] + v.n[0]*0.7 - MON.x)*Math.min(1, dt*3); MON.z += (v.pos[2] + v.n[1]*0.7 - MON.z)*Math.min(1, dt*3);
        if(!MON.visto && jugadorMira(cabezaMon(), 0.35, 11)){ MON.visto = true; SON.fx('susto_corto'); J.temblor = 0.4; }
        if(luzEnSala(v.sala) || linternaEnCara() || MON.t <= 0){ MON.visto = false; estado('merodea', Math.max(4, MON.t)); } }
      if(MON.t <= -2){ MON.visto = false; estado('merodea', 6); } break; }
    case 'caza': { vel = 6.0; anim = 'corre'; MON.repT = (MON.repT || 0) - dt;
      if(JUG.adentro){ const p = puertaMasCercana(); MON.entrada = {tipo:'p', p}; irAfuera(p.afuera[0], p.afuera[1]); MON.estado = 'acercarse'; break; }
      if(MON.repT <= 0){ MON.repT = 0.4; if(libreAfuera(MON.x, MON.z, JUG.x, JUG.z)){ MON.camino = [[JUG.x, JUG.z]]; MON.ci = 0; } else irAfuera(JUG.x, JUG.z); }
      seguir(dt, vel); if(d < 1.2) atrapar(); if(!veAlJugador()){ MON.vistoT += dt; if(MON.vistoT > 6){ MON.vistoT = 0; estado('merodea', 8); } } else MON.vistoT = 0; break; }
    case 'mata': { anim = 'agarra'; const c = RND.cam; if(!MON.frente){ const f = new THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion); f.y = 0; f.normalize(); MON.frente = [f.x, f.z]; }
      /* la cara se pone delante de los ojos: se mide dónde quedó la cabeza respecto de la raíz y se corre la raíz */
      /* se tira encima: aparece a 1,9 m y en un cuarto de segundo tiene la cara entera delante de los ojos (1,05 m al centro de la cabeza) */
      const f = MON.frente, dd = 1.05 + 0.85*lim((MON.t - 1.25)/0.25, 0, 1), hw = new THREE.Vector3(); MODELO.cab.getWorldPosition(hw); hw.sub(MODELO.raiz.position);
      MON.yaw = Math.atan2(-f[0], -f[1]); MON.x = c.position.x + f[0]*dd - hw.x; MON.z = c.position.z + f[1]*dd - hw.z; MON.y = c.position.y - hw.y; J.temblor = 1.2;
      if(MON.t <= 0){ morir(J.muerto || 'monstruo'); } break; }
  }
  /* pasos, cuerpo, respiración y el ritmo del corazón */
  const antes = Math.sin(MON.fase); if(vel > 0) MON.fase += dt*vel*(anim === 'corre' ? 2.4 : 2.9);
  if(vel > 0 && ((antes > 0) !== (Math.sin(MON.fase) > 0))){ const pos = [MON.x, MON.y + 0.2, MON.z]; SON.fx(anim === 'corre' ? 'm_corre' : MON.adentro ? 'm_paso' : 'm_paso_pasto', {pos, adentro:MON.adentro, ocluido:MON.adentro === JUG.adentro ? 0 : 0.6, vol:anim === 'corre' ? 1 : 0.85}); }
  if(MON.estado !== 'respira' && MON.estado !== 'rompe' && MON.estado !== 'arranca') SON.bucleParar('m_resp');
  if(Math.random() < dt*0.08 && MON.estado !== 'mata') SON.fx(Math.random() < 0.5 ? 'm_grunido' : 'm_respira', {pos:cabezaMon(), adentro:MON.adentro, ocluido:MON.adentro === JUG.adentro ? 0 : 0.6, vol:0.7});
  MON.anim = anim; poseMonstruo(dt);
  R.visible = MON.estado !== 'lejos' || d < 30; R.position.set(MON.x, MON.y, MON.z); R.rotation.y = MON.yaw;
  /* el vaho: el vidrio donde respira se empaña de a poco y tarda en aclarar */
  const resp = ['respira', 'rompe', 'arranca'].includes(MON.estado) && MON.entrada && MON.entrada.tipo === 'v' ? MON.entrada.v : null;
  for(const id in MUNDO.ventanas){ const v = MUNDO.ventanas[id]; v.vaho = lim((v.vaho || 0) + (v === resp ? dt*0.3 : -dt*0.06), 0, 1);
    if(v._vh !== v.vaho){ v._vh = v.vaho; const m = v.mVidrio.material; m.opacity = 0.35 + v.vaho*0.2; m.color.setRGB(0.13 + v.vaho*0.24, 0.19 + v.vaho*0.22, 0.25 + v.vaho*0.2); } }
  for(const id in MUNDO.ventanas){ const v = MUNDO.ventanas[id]; for(const m of v.mTablas){ if(m.userData.sac > 0){ m.userData.sac -= dt; m.position.y += (Math.random() - 0.5)*0.02; m.rotation.z += (Math.random() - 0.5)*0.03; } } }
}
function salirDeLaCasa(){ const s = MON.salida; let x, z, p = 0;
  if(s && s.tipo === 'v'){ x = s.v.adentro[0]; z = s.v.adentro[1]; p = s.v.piso; } else if(s && s.tipo === 'p'){ x = s.p.adentro[0]; z = s.p.adentro[1]; } else { const f = MUNDO.puertas.p_frente; MON.salida = {tipo:'p', p:f}; x = f.adentro[0]; z = f.adentro[1]; }
  irAdentro(x, z, p); MON.estado = 'seVa'; MON.t = 0; }
function placardEnSala(){ for(const id in MUNDO.placards){ const q = MUNDO.placards[id]; if(q.piso === MON.piso && Math.hypot(q.frente[0] - MON.x, q.frente[1] - MON.z) < 4.5) return q; } return null; }
function ventanaCercaDelJugador(){ let m = null, md = 6; for(const id in MUNDO.ventanas){ const v = MUNDO.ventanas[id]; if(v.piso !== JUG.piso || v.piso === 1 || luzEnSala(v.sala)) continue; const dd = Math.hypot(v.pos[0] - JUG.x, v.pos[2] - JUG.z); if(dd < md){ md = dd; m = v; } } return m; }
function puertaMasCercana(){ let m = null, md = 1e9; for(const id in MUNDO.puertas){ const p = MUNDO.puertas[id]; if(!p.ext) continue; const dd = Math.hypot(p.centro[0] - JUG.x, p.centro[1] - JUG.z); if(dd < md){ md = dd; m = p; } } return m; }
function jugadorMira(p, ang, dmax){ const c = RND.cam.position, dx = p[0] - c.x, dy = p[1] - c.y, dz = p[2] - c.z, d = Math.hypot(dx, dy, dz); if(d > dmax) return false;
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(RND.cam.quaternion); return (f.x*dx + f.y*dy + f.z*dz)/d > Math.cos(ang); }
/* los pedazos: vidrios que caen y la tabla que queda tirada adentro */
const RESTOS = [];
function vidrios(v){ for(let i = 0; i < 14; i++){ const m = new THREE.Mesh(new THREE.PlaneGeometry(rv(0.06, 0.18), rv(0.06, 0.2)), MAT.vidrio); m.position.set(v.pos[0] + (Math.random() - 0.5)*v.w*(v.eje === 'x' ? 1 : 0.1), v.pos[1] + (Math.random() - 0.5)*0.6, v.pos[2] + (Math.random() - 0.5)*v.w*(v.eje === 'z' ? 1 : 0.1));
  RND.esc.add(m); RESTOS.push({m, vx:-v.n[0]*rv(0.5, 2), vy:rv(0, 1.5), vz:-v.n[1]*rv(0.5, 2), piso:alturaPiso(v.piso) + 0.01, gira:rv(-8, 8)}); } }
function tablaQueCae(v){ const m = new THREE.Mesh(new THREE.BoxGeometry(v.w + 0.5, 0.26, 0.07), MAT.tabla); const o = v.mTablas[v.tablas]; m.position.copy(o.position); m.rotation.copy(o.rotation); RND.esc.add(m);
  RESTOS.push({m, vx:-v.n[0]*rv(1, 2.4), vy:rv(0.5, 1.5), vz:-v.n[1]*rv(1, 2.4), piso:alturaPiso(v.piso) + 0.04, gira:rv(-3, 3), tabla:true}); }
function pasoRestos(dt){ for(const r of RESTOS){ if(r.quieto) continue; r.vy -= 9.8*dt; r.m.position.x += r.vx*dt; r.m.position.y += r.vy*dt; r.m.position.z += r.vz*dt; r.m.rotation.x += r.gira*dt;
    if(r.m.position.y <= r.piso){ r.m.position.y = r.piso; if(Math.abs(r.vy) > 1.5 && r.tabla){ SON.fx('tabla_cae', {pos:[r.m.position.x, r.piso, r.m.position.z], adentro:true}); } r.vy *= -0.25; r.vx *= 0.5; r.vz *= 0.5; r.gira *= 0.4;
      if(Math.abs(r.vy) < 0.3){ r.quieto = true; r.m.rotation.x = r.tabla ? Math.PI/2 : -Math.PI/2; } } } }
