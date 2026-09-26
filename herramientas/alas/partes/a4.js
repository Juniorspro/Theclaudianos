
/* ====================== estado ====================== */
const J = {modo:'carga', demo:false, bot:false, dios:false, t:0, tt:0, aviones:[], jug:null, mi:0, mis:null, fin:null, stats:null, ola:0, olaT:0, textos:[], killfeed:[], marca:0, golpe:0, sacudon:0,
  alarmaMisil:0, camModo:0, tension:0, cieloId:null, relT:8, lluvia:0};
const IN = {x:0, y:0, fuego:false, misilP:false, turbo:false, freno:false, bengalaP:false};

/* ====================== mandos ====================== */
const girada = ()=> matchMedia('(orientation: portrait)').matches;
function aLocal(sx, sy){ const r = $('pantalla').getBoundingClientRect(); return girada() ? [sy - r.top, r.right - sx] : [sx - r.left, sy - r.top]; }
function aLocalD(dx, dy){ return girada() ? [dy, -dx] : [dx, dy]; }
const STICK = {id:null, x0:0, y0:0, R:62};
$('zonaStick').addEventListener('touchstart', ev=>{ ev.preventDefault(); audioIni(); const t = ev.changedTouches[0]; if(STICK.id !== null) return; STICK.id = t.identifier;
  const [x, y] = aLocal(t.clientX, t.clientY); STICK.x0 = x; STICK.y0 = y; const s = $('stick'); s.style.left = x + 'px'; s.style.top = y + 'px'; s.classList.add('activo'); $('perilla').style.transform = ''; }, {passive:false});
$('zonaStick').addEventListener('touchmove', ev=>{ ev.preventDefault(); for(const t of ev.changedTouches){ if(t.identifier !== STICK.id) continue; const [x, y] = aLocal(t.clientX, t.clientY);
  let dx = x - STICK.x0, dy = y - STICK.y0; const L = Math.hypot(dx, dy); if(L > STICK.R){ dx *= STICK.R/L; dy *= STICK.R/L; }
  IN.x = dx/STICK.R; IN.y = dy/STICK.R; $('perilla').style.transform = `translate(${dx}px,${dy}px)`; } }, {passive:false});
const sueltaStick = ev=>{ for(const t of ev.changedTouches) if(t.identifier === STICK.id){ STICK.id = null; IN.x = IN.y = 0; $('perilla').style.transform = ''; $('stick').classList.remove('activo'); } };
$('zonaStick').addEventListener('touchend', sueltaStick); $('zonaStick').addEventListener('touchcancel', sueltaStick);
/* cámara libre: arrastrar la mitad derecha mira para cualquier lado (alrededor del avión, o la cabeza en la cabina); al soltar vuelve
   sola atrás del avión, y el doble toque la centra de una */
const MIRAR = {id:null, x:0, y:0, yaw:0, pit:0, suelto:9, raton:false, toque:0, movio:0};
function mirarMover(dx, dy){ MIRAR.yaw -= dx*0.011; MIRAR.yaw = ((MIRAR.yaw + Math.PI*3) % TAU) - Math.PI; MIRAR.pit = lim(MIRAR.pit - dy*0.009, -1.3, 1.3); MIRAR.suelto = 0; MIRAR.movio += Math.abs(dx) + Math.abs(dy); }
function mirarCentrar(){ MIRAR.yaw = MIRAR.pit = 0; MIRAR.suelto = 9; }
$('zonaMirar').addEventListener('touchstart', ev=>{ ev.preventDefault(); audioIni(); const t = ev.changedTouches[0]; if(MIRAR.id !== null) return; MIRAR.id = t.identifier;
  [MIRAR.x, MIRAR.y] = aLocal(t.clientX, t.clientY); MIRAR.movio = 0; }, {passive:false});
$('zonaMirar').addEventListener('touchmove', ev=>{ ev.preventDefault(); for(const t of ev.changedTouches){ if(t.identifier !== MIRAR.id) continue; const [x, y] = aLocal(t.clientX, t.clientY);
  mirarMover(x - MIRAR.x, y - MIRAR.y); MIRAR.x = x; MIRAR.y = y; } }, {passive:false});
const sueltaMirar = ev=>{ for(const t of ev.changedTouches) if(t.identifier === MIRAR.id){ MIRAR.id = null; MIRAR.suelto = 0;
  if(MIRAR.movio < 8){ const ahora = performance.now(); if(ahora - MIRAR.toque < 330) mirarCentrar(); MIRAR.toque = ahora; } } if(ev.type === 'touchend') pantallaHorizontal(); };
$('zonaMirar').addEventListener('touchend', sueltaMirar); $('zonaMirar').addEventListener('touchcancel', sueltaMirar);
$('zonaMirar').addEventListener('mousedown', ev=>{ ev.preventDefault(); MIRAR.raton = true; MIRAR.x = ev.clientX; MIRAR.y = ev.clientY; MIRAR.movio = 0; });
addEventListener('mousemove', ev=>{ if(!MIRAR.raton) return; const [dx, dy] = aLocalD(ev.clientX - MIRAR.x, ev.clientY - MIRAR.y); mirarMover(dx, dy); MIRAR.x = ev.clientX; MIRAR.y = ev.clientY; });
addEventListener('mouseup', ()=>{ if(MIRAR.raton){ MIRAR.raton = false; MIRAR.suelto = 0; } });
$('zonaMirar').addEventListener('dblclick', mirarCentrar);
const BOTONES = {bFuego:'fuego', bMisil:'misil', bTurbo:'turbo', bFreno:'freno', bBengala:'bengala', bCamara:'camara'};
function apretar(k, v){
  if(k === 'misil'){ if(v) IN.misilP = true; return; } if(k === 'bengala'){ if(v) IN.bengalaP = true; return; }
  if(k === 'camara'){ if(v) J.camModo = (J.camModo + 1) % 2; return; } IN[k] = v; }
for(const id in BOTONES){ const el = $(id), k = BOTONES[id];
  el.addEventListener('touchstart', ev=>{ ev.preventDefault(); ev.stopPropagation(); audioIni(); el.classList.add('apretado'); apretar(k, true); }, {passive:false});
  const suelta = ev=>{ ev.preventDefault(); el.classList.remove('apretado'); apretar(k, false); if(ev.type === 'touchend') pantallaHorizontal(); };
  el.addEventListener('touchend', suelta, {passive:false}); el.addEventListener('touchcancel', suelta, {passive:false});
  el.addEventListener('mousedown', ev=>{ ev.preventDefault(); audioIni(); el.classList.add('apretado'); apretar(k, true); });
  el.addEventListener('mouseup', ev=>{ el.classList.remove('apretado'); apretar(k, false); }); }
$('bPausa').addEventListener('touchstart', ev=>{ ev.preventDefault(); ev.stopPropagation(); pausar(); }, {passive:false});
$('bPausa').addEventListener('mousedown', ev=>{ ev.preventDefault(); pausar(); });
const TECLAS = {};
addEventListener('keydown', ev=>{ if(ev.repeat) return; TECLAS[ev.code] = true; audioIni();
  if(ev.code === 'Space') IN.fuego = true; if(ev.code === 'KeyM' || ev.code === 'Enter') IN.misilP = true; if(ev.code === 'KeyF') IN.bengalaP = true;
  if(ev.code === 'ShiftLeft') IN.turbo = true; if(ev.code === 'KeyB' || ev.code === 'ControlLeft') IN.freno = true; if(ev.code === 'KeyC') J.camModo = (J.camModo + 1) % 2; if(ev.code === 'KeyP' || ev.code === 'Escape') pausar(); });
addEventListener('keyup', ev=>{ TECLAS[ev.code] = false; if(ev.code === 'Space') IN.fuego = false; if(ev.code === 'ShiftLeft') IN.turbo = false; if(ev.code === 'KeyB' || ev.code === 'ControlLeft') IN.freno = false; });
function teclado(){ const k = TECLAS; let x = 0, y = 0; if(k.ArrowLeft || k.KeyA) x -= 1; if(k.ArrowRight || k.KeyD) x += 1; if(k.ArrowUp || k.KeyW) y -= 1; if(k.ArrowDown || k.KeyS) y += 1; return [x, y]; }
let bloqueoFallo = false;
async function pantallaHorizontal(){
  if(bloqueoFallo || !document.fullscreenEnabled || !(screen.orientation && screen.orientation.lock) || document.fullscreenElement) return;
  let entre = false;
  try{ await document.documentElement.requestFullscreen({navigationUI:'hide'}); entre = true; await screen.orientation.lock('landscape'); }
  catch(e){ bloqueoFallo = true; if(entre && document.fullscreenElement){ try{ await document.exitFullscreen(); }catch(_){} } }
}
document.addEventListener('fullscreenchange', ()=> setTimeout(medir, 60));
/* del mando al avión: con asistencia, el mando es «adónde quiero ir» (inclina y tira solo) y suelto, nivela */
function banqueo(a){ const R = derechaDe(a), U = arribaDe(a); return Math.atan2(-R.y, U.y); }
function mandosJugador(a){
  const [kx, ky] = teclado(); let sx = lim(IN.x + kx, -1, 1), sy = lim(IN.y + ky, -1, 1);
  if(Math.abs(sx) < 0.08) sx = 0; if(Math.abs(sy) < 0.08) sy = 0;
  const arriba = G.invertir ? sy : -sy, c = a.ctrl, F = adelante(a).clone(), U = arribaDe(a);
  if(G.asistencia){ const b = banqueo(a), vertical = Math.abs(F.y) > 0.72, invertido = U.y < 0 && Math.abs(arriba) > 0.25;
    if(vertical || invertido){ c.alabeo = sx; c.cabeceo = arriba; }
    else { /* más inclinado si la nariz sube, menos si baja: la vuelta queda plana (con 72° fijos subía 600 m por vuelta) */
      const obj = sx*lim(1.3 + F.y*5, 1.05, 1.5); c.alabeo = lim((obj - b)*2.6, -1, 1);
      /* tira más cuanto más inclinado (antes tiraba con cos(inclinación): a 70° casi nada, y una vuelta tardaba 22 s); sólo si ya inclinó hacia ese lado */
      const incl = sx*b > 0 ? lim(Math.abs(b)/0.9, 0, 1) : 0; c.cabeceo = lim(arriba + Math.abs(sx)*incl, -1, 1); }
    c.guinada = sx*0.3; }
  else { c.alabeo = sx; c.cabeceo = arriba; c.guinada = 0; }
  c.turbo = IN.turbo; c.freno = IN.freno; c.acel = IN.freno ? 0.2 : (IN.turbo ? 1 : 0.78); c.fuego = IN.fuego;
  if(IN.misilP){ IN.misilP = false; if(a.misiles > 0){ lanzarMisil(a, a.fijado && a.fijoT >= 1 ? a.fijado : null); J.stats.misiles++; } else sfx('boton', 0.5); }
  if(IN.bengalaP){ IN.bengalaP = false; tirarBengalas(a); }
}
/* fijar blanco: el más cercano al centro dentro del cono, sostenido un rato */
function fijar(a, dt, cono, alcance, tiempo){
  const F = adelante(a).clone(); let mejor = null, mv = 1e9;
  for(const x of AVIONES_VIVOS()){ if(x.equipo === a.equipo) continue; const d = _t2.subVectors(x.pos, a.pos), L = d.length(); if(L > alcance || L < 150) continue;
    const ang = F.angleTo(d); if(ang > cono) continue; const v = ang*2 + L/alcance; if(v < mv){ mv = v; mejor = x; } }
  /* sin aviones en el cono, también se fijan los barcos */
  if(!mejor) for(const x of BLANCOS_SUP){ if(!x.vivo || x.equipo === a.equipo) continue; const d = _t2.subVectors(x.pos, a.pos), L = d.length(); if(L > alcance*1.2 || L < 200) continue;
    const ang = F.angleTo(d); if(ang > cono) continue; const v = ang*2 + L/alcance; if(v < mv){ mv = v; mejor = x; } }
  if(mejor && mejor === a.fijado) a.fijoT = Math.min(1, a.fijoT + dt/(tiempo*(mejor.def && mejor.def.furtivo ? 1.8 : 1)));
  else { a.fijado = mejor; a.fijoT = 0; }
  return a.fijado;
}

/* ====================== cámara ====================== */
const _qMir = new THREE.Quaternion(), _qMir2 = new THREE.Quaternion(), _eMir = new THREE.Euler();
const CAM = {p:V3(0, 1500, 60), mira:V3(0, 1500, 0), up:V3(0,1,0), fov:62, cineT:0, cineK:0};
function camaraJuego(a, dt){
  const L = a.def.largo*(a.def.escala||1), F = adelante(a).clone(), U = arribaDe(a);
  /* cámara libre: al soltar espera un poco y vuelve sola */
  if(MIRAR.id === null && !MIRAR.raton){ MIRAR.suelto += dt; if(MIRAR.suelto > 0.9){ const k = Math.exp(-dt*3.2); MIRAR.yaw *= k; MIRAR.pit *= k; } }
  const mira = lim((Math.abs(MIRAR.yaw) + Math.abs(MIRAR.pit))/0.5, 0, 1); $('ojo').classList.toggle('ver', mira > 0.3 && J.modo === 'juego');
  const qL = _qMir.setFromEuler(_eMir.set(MIRAR.pit, MIRAR.yaw, 0, 'YXZ')), qW = _qMir2.copy(a.q).multiply(qL);
  if(J.camModo === 1){ const p = mundoDe(a, V3(0, L*0.07, -L*0.28)); cam.position.copy(p); cam.quaternion.copy(qW); a.g.visible = false; cam.fov = lerp(cam.fov, 70 + a.turbo*6, 0.1); }
  else { a.g.visible = true;
    const off = V3(0, L*0.34, L*1.25 + 7 + a.v*0.012).applyQuaternion(qW), des = _t1.copy(a.pos).add(off);
    const k = Math.max(1 - Math.exp(-dt*(9 + a.v*0.01)), mira*0.45); CAM.p.lerp(des, k);
    /* mirando para otro lado, la cámara apunta al avión (si no, al punto de adelante como siempre) */
    const alc = a.pos.clone().addScaledVector(F, 60*(1 - mira)).addScaledVector(U, L*0.18*(1 - mira*0.5));
    CAM.mira.lerp(alc, 1 - Math.exp(-dt*14)); CAM.up.lerp(V3(0,1,0).lerp(U, 0.8), 1 - Math.exp(-dt*6)).normalize();
    cam.position.copy(CAM.p); cam.up.copy(CAM.up); cam.lookAt(CAM.mira);
    cam.fov = lerp(cam.fov, 60 + a.turbo*9 + lim((a.v - 200)/200, 0, 1)*6, 0.06); }
  if(J.sacudon > 0){ const s = J.sacudon*0.6; cam.position.add(V3(vr(-s,s), vr(-s,s), vr(-s,s))); J.sacudon = Math.max(0, J.sacudon - dt*2.2); }
  if(a.disparando){ cam.position.add(V3(vr(-0.05,0.05), vr(-0.05,0.05), 0).applyQuaternion(a.q)); }
  cam.updateProjectionMatrix();
}
/* cámara de película para la portada: se corta cada tanto a otro ángulo del duelo */
function camaraCine(a, dt){
  if(!a) return; CAM.cineT -= dt; const L = a.def.largo;
  if(CAM.cineT <= 0){ CAM.cineT = vr(5, 8); CAM.cineK = (CAM.cineK + 1 + Math.floor(Math.random()*3)) % 5; CAM.salto = true; }
  const F = adelante(a).clone(), U = arribaDe(a), R = derechaDe(a); let des;
  switch(CAM.cineK){
    case 0: des = a.pos.clone().addScaledVector(R, L*1.4).addScaledVector(U, L*0.25).addScaledVector(F, -L*0.3); break;
    case 1: des = a.pos.clone().addScaledVector(F, L*2.2).addScaledVector(U, L*0.2).addScaledVector(R, -L*0.6); break;
    case 2: des = a.pos.clone().addScaledVector(F, -L*1.6).addScaledVector(U, L*0.45); break;
    case 3: des = a.pos.clone().addScaledVector(R, -L*2.2).addScaledVector(U, -L*0.35).addScaledVector(F, L*0.8); break;
    default: des = a.pos.clone().add(V3(Math.sin(J.tt*0.2)*L*3, L*0.8, Math.cos(J.tt*0.2)*L*3)); }
  if(CAM.salto){ CAM.p.copy(des); CAM.salto = false; } else CAM.p.lerp(des, 1 - Math.exp(-dt*6));
  cam.position.copy(CAM.p); cam.up.set(0,1,0); cam.lookAt(a.pos); cam.fov = lerp(cam.fov, CAM.cineK === 1 ? 48 : 58, 0.05); cam.updateProjectionMatrix(); a.g.visible = true;
}
function camaraHangar(a, dt){
  if(!a) return; HANGAR.ang += dt*(HANGAR.arrastre ? 0 : 0.18); const L = a.def.largo, r = L*1.62;
  CAM.p.set(a.pos.x + Math.sin(HANGAR.ang)*r, a.pos.y + L*0.28 + Math.sin(HANGAR.ang*0.6)*L*0.1, a.pos.z + Math.cos(HANGAR.ang)*r);
  cam.position.copy(CAM.p); cam.up.set(0,1,0); cam.lookAt(a.pos.x, a.pos.y - L*0.2, a.pos.z); cam.fov = 44;   /* mirar por debajo sube el avión sobre la ficha */ cam.updateProjectionMatrix(); a.g.visible = true;
}
const HANGAR = {ang:0.6, arrastre:false, i:0};

/* ====================== pilotos de la IA ======================
   Persiguen con puntería adelantada, se separan si se pasan, rompen el giro si les muerden la cola o viene un misil,
   tiran bengalas según la pericia y nunca se meten en el agua ni en la montaña. */
function ia(a, dt){
  const I = a.ia, c = a.ctrl, p = I.pericia; I.t = (I.t||0) - dt; I.misT = (I.misT||rf(4, 8)) - dt; I.benT = (I.benT||0) - dt;
  /* blanco */
  if(!I.blanco || !I.blanco.vivo || I.t <= 0){ I.t = rf(2, 4); I.blanco = elegirBlanco(a); }
  const B = I.blanco, F = adelante(a).clone();
  let D = null, quiereTurbo = false, freno = false;
  /* amenaza: un misil que me busca o alguien pegado a mi cola */
  const misil = MISILES.find(m=> m.blanco === a && m.p.distanceTo(a.pos) < 2500);
  const cola = AVIONES_VIVOS().find(x=> x.equipo !== a.equipo && x.pos.distanceTo(a.pos) < 900 && adelante(x).clone().angleTo(_t2.subVectors(a.pos, x.pos)) < 0.35);
  if(misil && I.benT <= 0 && Math.random() < 0.35 + p*0.5){ tirarBengalas(a); I.benT = rf(3, 6) - p*2; }
  /* esquivar va en rachas: un rato quiebra y después descansa (si quiebra siempre, nadie le consigue nunca una solución de tiro) */
  I.rachaT = (I.rachaT||0) - dt; if(cola && I.rachaT < -rf(2.5, 5.5) + p*2){ I.rachaT = rf(1.2, 2.2) + p*1.5; }
  if(a.def.bombardero && BOMBA.blanco && BOMBA.blanco.vivo){ const s = BOMBA.blanco, dh = Math.hypot(s.pos.x - a.pos.x, s.pos.z - a.pos.z);
    D = V3(s.pos.x - a.pos.x, 900 - a.pos.y, s.pos.z - a.pos.z).normalize(); if(dh < 500){ I.bombardea = true; } if(I.bombardea && dh > 2200) I.bombardea = false;
    if(I.bombardea && dh < 700){ s.hp -= 9*dt; if(Math.random() < 0.08) explosion(s.pos.clone().add(V3(vr(-60,60), 12, vr(-120,120))), 0.6); if(s.hp <= 0 && s.vivo){ s.vivo = false; explosion(s.pos, 2.4); } } }
  else if(misil || (cola && I.rachaT > 0)){ I.evade = (I.evade||0) + dt; const R = derechaDe(a), s = Math.sin(I.evade*1.3 + a.id) > 0 ? 1 : -1;
    D = F.clone().addScaledVector(R, s*1.6).addScaledVector(V3(0,1,0), Math.sin(I.evade*0.7)*0.8).normalize(); quiereTurbo = true; }
  else if(B){ I.evade = 0; const rel = _t2.subVectors(B.pos, a.pos), dist = rel.length(), bv = B.vel || V3(0,0,0);
    const tl = lim(dist/1050, 0, 2.5)*(0.6 + p*0.4), punto = B.pos.clone().addScaledVector(bv, tl);
    D = punto.sub(a.pos).normalize();
    /* se pasó: se separa y vuelve */
    const frente = F.dot(rel.clone().normalize()); if(dist < 180 && frente < 0.2){ I.separa = 2.5; } if(I.separa > 0){ I.separa -= dt; D = F.clone().add(V3(0, 0.25, 0)).normalize(); quiereTurbo = true; }
    if(dist > 2500) quiereTurbo = true; if(dist < 350 && frente > 0.8 && (B.v||0) < a.v - 20) freno = true;
    /* círculo sin salida (los dos girando a fondo, el blanco nunca en la nariz): el que sabe frena, achica el radio y corta por dentro */
    const offN = F.angleTo(rel); I.circ = offN > 0.55 && dist < 2200 ? (I.circ||0) + dt : Math.max(0, (I.circ||0) - dt*2);
    if(p > 0.6 && I.circ > 4 && !(I.separa > 0)){ freno = a.v > a.def.vmin*2.6; quiereTurbo = false; if(I.circ > 14) I.circ = 0; }
    /* cañón y misiles */
    const ang = F.angleTo(rel), cono = 0.07 - p*0.035; c.fuego = dist < 950 && ang < cono && B.vivo;
    if(a.misiles > 0 && I.misT <= 0 && dist > 700 && dist < 3200 && ang < 0.35){ I.fijo = (I.fijo||0) + dt; if(I.fijo > 2.8 - p*1.6*(B.def && B.def.furtivo ? 0.5 : 1)){ lanzarMisil(a, B); I.misT = rf(9, 16) - p*5; I.fijo = 0; } }
    else I.fijo = 0; }
  else D = V3(-a.pos.x, 1400 - a.pos.y, -a.pos.z).normalize();
  /* terreno, techo y borde del mapa */
  const h = Math.max(0, alturaTerreno(a.pos.x + a.vel.x*2.5, a.pos.z + a.vel.z*2.5)), hb = Math.max(0, alturaTerreno(a.pos.x, a.pos.z)), alt = a.pos.y - Math.max(h, hb);
  if(alt < 260 || (a.vel.y < 0 && alt + a.vel.y*3 < 150)) D = D.clone().lerp(V3(0,1,0), lim((300 - alt)/220, 0.3, 1)).normalize();
  if(a.pos.y > 5500) D.y = Math.min(D.y, -0.2);
  if(Math.hypot(a.pos.x, a.pos.z) > 17000) D.lerp(V3(-a.pos.x, 0, -a.pos.z).normalize(), 0.6);
  volarHacia(a, D, p);
  c.turbo = quiereTurbo; c.freno = freno; c.acel = freno ? 0.3 : quiereTurbo ? 1 : 0.8;
  if(!B) c.fuego = false;
}
function elegirBlanco(a){ let mejor = null, md = 1e9; for(const x of AVIONES_VIVOS()){ if(x.equipo === a.equipo) continue; const d = x.pos.distanceTo(a.pos)*(x.jug ? 0.8 : 1); if(d < md){ md = d; mejor = x; } } return mejor; }
function volarHacia(a, D, p){
  const c = a.ctrl, qi = a.q.clone().invert(), dl = D.clone().applyQuaternion(qi), th = Math.acos(lim(-dl.z, -1, 1)), be = Math.atan2(dl.x, dl.y);
  const lejos = th > 0.12;
  c.alabeo = lim(be*2.3, -1, 1)*(lejos ? 1 : 0.25);
  c.cabeceo = lejos ? lim(th*2.4, 0, 1)*lim(Math.cos(be)*1.6, -0.25, 1) : lim(dl.y*6, -0.4, 0.6);
  c.guinada = lim(dl.x*3, -1, 1)*(lejos ? 0.3 : 1);
  if(!lejos){ const U = arribaDe(a); if(Math.abs(U.y) < 0.9 && Math.abs(be) < 0.3) c.alabeo += lim(-banqueo(a)*0.8, -0.4, 0.4); }
  c.cabeceo *= 0.75 + p*0.3;
}
/* el piloto automático del jugador (banco de pruebas y portada) */
function botJugador(a, dt){ if(!a.ia) a.ia = {pericia:0.85};
  /* sin aviones enemigos: pasadas contra el barco más cercano (picada, cañón, misil, y salir para arriba) */
  const barcos = BLANCOS_SUP.filter(s=> s.vivo && s.equipo !== a.equipo);
  if(barcos.length && !AVIONES_VIVOS().some(x=> x.equipo !== a.equipo)){ const c = a.ctrl, I = a.ia; let s = barcos[0], md = 1e9; for(const b of barcos){ const d = b.pos.distanceTo(a.pos); if(d < md){ md = d; s = b; } }
    const rel = _t2.copy(s.pos).add(V3(0, 12, 0)).sub(a.pos), dist = rel.length(), F = adelante(a).clone(), ang = F.angleTo(rel); let D = rel.clone().normalize();
    I.salida = (I.salida||0) - dt; if(dist < 650 || a.pos.y < 140) I.salida = 3.5;
    if(I.salida > 0) D = F.clone().setY(0).normalize().add(V3(0, 0.8, 0)).normalize();
    else if(dist > 3500) D.y = lim((700 - a.pos.y)/1500, -0.3, 0.4);
    volarHacia(a, D, 0.85); c.turbo = dist > 4000; c.freno = false; c.acel = 0.8; c.fuego = dist < 1500 && ang < 0.06;
    if(a.fijado === s && a.fijoT >= 1 && dist < 3500 && Math.random() < 0.03) lanzarMisil(a, s); return; }
  ia(a, dt); if(a.fijado && a.fijoT >= 1 && a.misiles > 0 && Math.random() < 0.02){ lanzarMisil(a, a.fijado); } }
const BOMBA = {blanco:null};

/* ====================== misiones ====================== */
function iniciarMision(mi, sem){
  costoDeNuevo(); const mis = MISIONES[mi]; J.mi = mi; J.mis = mis; J.semilla = sem || (mis.id + '-' + (G.jugadas++));
  for(const a of J.aviones) soltarAvion(a); for(const m of MISILES) escena.remove(m.g); J.aviones = []; MISILES.length = 0; BALAS.length = 0; BENGALAS.length = 0; BLANCOS_SUP.length = 0; HUMO.limpiar(); FUEGO.limpiar();
  armarMundo(mis, J.semilla); ponerCielo(mis.cielo, mis.sol);
  J.fin = null; J.ola = -1; J.olaT = 1.5; J.textos = []; J.killfeed = []; J.t = 0; J.tt = 0; J.golpe = 0; J.sacudon = 0; J.alarmaMisil = 0; J.relT = 8; J.tension = 0;
  J.stats = {t:0, bajas:0, disparos:0, aciertos:0, misiles:0, puntos:0, recibido:0};
  const d = statsDe(G.avion); d.id = G.avion;
  J.jug = crearAvion(d, 'azul', V3(0, 1600, 3200), 0, {jug:true}); J.aviones.push(J.jug);
  for(let k=0;k<(mis.aliados||0);k++){ const x = crearAvion(ENEMIGOS.aliado, 'azul', V3(60 + k*50, 1580, 3260 + k*40), 0, {ia:{pericia:0.7}}); J.aviones.push(x); }
  BOMBA.blanco = null;
  if(mis.portaaviones){ BOMBA.blanco = crearBarco('porta', V3(0, 0, 1200), 0.3, 'azul'); }
  for(let k=0;k<(mis.barcos||0);k++){ let p = null; for(let t=0;t<60;t++){ const q = V3(rf(-9000, 9000), 0, rf(-12000, -2000)); if(alturaTerreno(q.x, q.z) < -40 && alturaTerreno(q.x + 200, q.z) < -40){ p = q; break; } } crearBarco('destructor', p || V3(k*800, 0, -6000), rf(0, TAU), 'rojo'); }
  J.cam = null; mirarCentrar(); cam.fov = 62; CAM.p.copy(J.jug.pos).add(V3(0, 8, 40)); CAM.mira.copy(J.jug.pos);
}
function lanzarOla(){
  const L = J.mis.olas[J.ola + 1]; if(!L) return false; J.ola++;
  const j = J.jug, base = j ? j.pos : V3(0, 1500, 0), F = j ? adelante(j).clone() : V3(0,0,-1); F.y = 0; F.normalize();
  L.forEach(([tipo, per], k)=>{ const ang = rf(-0.9, 0.9), d = rf(4500, 6500), dir = F.clone().applyAxisAngle(_EJEY, ang), p = base.clone().addScaledVector(dir, d);
    p.y = lim(base.y + rf(-300, 600), 900, 3000); if(J.mis.portaaviones && tipo === 'bombardero'){ p.set(Math.cos(k*1.3)*9000, 1100, -8000 + Math.sin(k)*2000); }
    const e = crearAvion(ENEMIGOS[tipo], 'rojo', p, Math.atan2(dir.x, dir.z), {ia:{pericia:per}}); J.aviones.push(e); });
  if(J.ola > 0) aviso(J.mis.olas[J.ola].some(e=> e[0] === 'as') ? 'EL AS' : 'OLEADA ' + (J.ola + 1), '#ff4a3d', J.mis.olas[J.ola].some(e=> e[0] === 'as') ? 'jet negro a la vista' : 'más contactos en el radar');
  voz(J.mis.olas[J.ola].some(e=> e[0] === 'as') ? 'as' : 'oleada');
  return true;
}
function pasarMision(dt){
  if(J.fin) return; const quedan = J.aviones.filter(a=> a.vivo && a.equipo === 'rojo').length;
  if(quedan === 0){ J.olaT -= dt; if(J.olaT <= 0){ J.olaT = 3; if(!lanzarOla() && barcosHundidos()){ terminar(true); } } }
  if(J.mis.portaaviones && BOMBA.blanco && !BOMBA.blanco.vivo) terminar(false, 'HUNDIERON EL PORTAAVIONES');
  if(J.mis.portaaviones && BOMBA.blanco && BOMBA.blanco.hp < BOMBA.blanco.hpMax*0.7 && !J.avisoPorta){ J.avisoPorta = true; voz('portaaviones', true); }
  /* tormenta: relámpagos y trueno */
  if(J.mis.tormenta){ J.relT -= dt; if(J.relT <= 0){ J.relT = vr(5, 12); J.rel = 1; setTimeout(()=> sfx('trueno', 0.8), 400 + Math.random()*1200); } }
  J.rel = Math.max(0, (J.rel||0) - dt*3); U_CIELO.relampago.value = J.rel > 0.6 ? 2.5 : J.rel > 0.4 ? 0 : J.rel*1.5;
}
const barcosHundidos = ()=> BLANCOS_SUP.filter(s=> s.equipo === 'rojo').every(s=> !s.vivo);
function objetivoTexto(){
  const m = J.mis, r = J.aviones.filter(a=> a.vivo && a.equipo === 'rojo').length;
  if(m.barcos){ const b = BLANCOS_SUP.filter(s=> s.equipo === 'rojo' && s.vivo).length; if(b) return T('HUNDÍ LOS DESTRUCTORES') + ' · ' + b; }
  if(m.portaaviones) return T('DEFENDÉ EL PORTAAVIONES') + ' · ' + Math.round(100*BOMBA.blanco.hp/BOMBA.blanco.hpMax) + '%';
  return T('DERRIBÁ A LOS ENEMIGOS') + ' · ' + r;
}
function terminar(gano, motivo){
  if(J.fin) return; J.fin = {gano, motivo:motivo||'', t:gano ? 3 : 2.6, hecho:false};
  if(!J.demo){ cortina(gano); voz(gano ? 'cumplida' : 'fallida', true); aviso(gano ? 'MISIÓN CUMPLIDA' : 'MISIÓN FALLIDA', gano ? '#6dffa8' : '#ff4a3d', motivo); }
}

/* ====================== HUD ====================== */
const hg = cvH.getContext('2d');
const VERDE = '#6dffa8', ROJO = '#ff4a3d', AZUL = '#5fd4ff';
function proyectar(p, out){ const v = _t1.copy(p).project(cam); if(v.z > 1) return null; out = out || {}; out.x = (v.x*0.5 + 0.5)*cvH.width; out.y = (-v.y*0.5 + 0.5)*cvH.height; out.z = v.z; return out; }
function detras(p){ const v = _t2.copy(p).applyMatrix4(cam.matrixWorldInverse); return v.z > 0; }
function textoH(t, x, y, tam, col, al){ hg.font = 'bold ' + tam + 'px Bahnschrift, "Roboto Condensed", "Arial Narrow", Arial'; hg.textAlign = al || 'left'; hg.fillStyle = col; hg.fillText(t, x, y); }
function dibujarHUD(){
  const W = cvH.width, H = cvH.height, s = RH, j = J.jug; hg.clearRect(0, 0, W, H); if(!j || J.modo !== 'juego') return;
  hg.lineWidth = 1.6*s; hg.strokeStyle = VERDE; hg.fillStyle = VERDE; hg.shadowColor = 'rgba(0,0,0,0.6)'; hg.shadowBlur = 3*s;
  const cx = W/2, cy = H/2, F = adelante(j).clone(), U = arribaDe(j);
  /* escalera de cabeceo: el horizonte y cada 10 grados, girada con el banqueo */
  /* mirando para otro lado no tiene sentido (se dibujaría flotando): se esconde con la mira y el vector de vuelo */
  if(j.vivo && Math.abs(MIRAR.yaw) + Math.abs(MIRAR.pit) < 0.2){ const b = banqueo(j), pitch = Math.asin(lim(F.y, -1, 1)), pxGrado = H/(cam.fov)*1.0;
    hg.save(); hg.translate(cx, cy); hg.rotate(-b); hg.globalAlpha = 0.55;
    for(let g=-40; g<=40; g+=10){ const y = (pitch*180/Math.PI - g)*pxGrado; if(Math.abs(y) > H*0.42) continue; const w = g === 0 ? W*0.2 : W*0.06;
      hg.beginPath(); if(g < 0) hg.setLineDash([6*s, 4*s]); hg.moveTo(-w, y); hg.lineTo(-w*0.35, y); hg.moveTo(w*0.35, y); hg.lineTo(w, y); hg.stroke(); hg.setLineDash([]);
      if(g) textoH(Math.abs(g) + '', w + 4*s, y + 4*s, 10*s, VERDE); }
    hg.restore(); hg.globalAlpha = 1;
    /* mira del cañón y vector de trayectoria */
    const bo = proyectar(j.pos.clone().addScaledVector(F, 1000)); if(bo){ hg.beginPath(); hg.moveTo(bo.x - 10*s, bo.y); hg.lineTo(bo.x - 4*s, bo.y); hg.moveTo(bo.x + 4*s, bo.y); hg.lineTo(bo.x + 10*s, bo.y); hg.moveTo(bo.x, bo.y - 10*s); hg.lineTo(bo.x, bo.y - 4*s); hg.stroke(); }
    const fv = proyectar(j.pos.clone().addScaledVector(j.vel.clone().normalize(), 1000)); if(fv){ hg.beginPath(); hg.arc(fv.x, fv.y, 6*s, 0, TAU); hg.moveTo(fv.x - 16*s, fv.y); hg.lineTo(fv.x - 6*s, fv.y); hg.moveTo(fv.x + 6*s, fv.y); hg.lineTo(fv.x + 16*s, fv.y); hg.moveTo(fv.x, fv.y - 6*s); hg.lineTo(fv.x, fv.y - 12*s); hg.stroke(); } }
  /* blancos: recuadro, distancia, vida, flecha si está afuera y el punto adonde tirar */
  for(const x of J.aviones){ if(!x.vivo || x === j) continue; const col = x.equipo === 'rojo' ? ROJO : AZUL, d = x.pos.distanceTo(j.pos);
    const p = detras(x.pos) ? null : proyectar(x.pos);
    if(p && p.x > 0 && p.x < W && p.y > 0 && p.y < H){ const r = lim(900/d, 0.7, 3)*16*s; hg.strokeStyle = col; hg.fillStyle = col;
      const fij = j.fijado === x; hg.lineWidth = (fij ? 2.4 : 1.4)*s;
      if(fij && j.fijoT >= 1){ hg.beginPath(); hg.moveTo(p.x, p.y - r*1.3); hg.lineTo(p.x + r*1.3, p.y); hg.lineTo(p.x, p.y + r*1.3); hg.lineTo(p.x - r*1.3, p.y); hg.closePath(); hg.stroke(); textoH(T('FIJADO'), p.x, p.y - r*1.5, 11*s, ROJO, 'center'); }
      else { const e = r*0.4; hg.beginPath(); for(const [sx, sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ hg.moveTo(p.x + sx*r, p.y + sy*(r - e)); hg.lineTo(p.x + sx*r, p.y + sy*r); hg.lineTo(p.x + sx*(r - e), p.y + sy*r); } hg.stroke();
        if(fij){ hg.beginPath(); hg.arc(p.x, p.y, r*1.5*(1 - j.fijoT) + r*0.9, 0, TAU); hg.stroke(); } }
      textoH((d/1000).toFixed(1) + ' km', p.x + r + 4*s, p.y + 4*s, 10*s, col);
      if(x.equipo === 'rojo'){ hg.fillStyle = 'rgba(0,0,0,0.4)'; hg.fillRect(p.x - r, p.y + r + 4*s, r*2, 3*s); hg.fillStyle = col; hg.fillRect(p.x - r, p.y + r + 4*s, r*2*x.hp/x.hpMax, 3*s); }
      /* punto de tiro: dónde va a estar cuando llegue la bala */
      if(x.equipo === 'rojo' && d < 1400 && (j.fijado === x || d < 900)){ const t = d/1050, q = proyectar(x.pos.clone().addScaledVector(x.vel, t).addScaledVector(j.vel, -t*0)); if(q){ hg.lineWidth = 1.6*s; hg.beginPath(); hg.arc(q.x, q.y, 9*s, 0, TAU); hg.moveTo(q.x + 2*s, q.y); hg.arc(q.x, q.y, 2*s, 0, TAU); hg.stroke(); } } }
    else if(x.equipo === 'rojo'){ const v = _t2.copy(x.pos).applyMatrix4(cam.matrixWorldInverse); let a = Math.atan2(-v.y, v.x); const ex = cx + Math.cos(a)*(W*0.42), ey = cy + Math.sin(a)*(H*0.38);
      hg.fillStyle = col; hg.save(); hg.translate(ex, ey); hg.rotate(a); hg.beginPath(); hg.moveTo(12*s, 0); hg.lineTo(-6*s, -8*s); hg.lineTo(-6*s, 8*s); hg.closePath(); hg.fill(); hg.restore(); textoH((d/1000).toFixed(1), ex, ey + 20*s, 9*s, col, 'center'); } }
  for(const sb of BLANCOS_SUP){ if(!sb.vivo || detras(sb.pos)) continue; const p = proyectar(sb.pos); if(!p) continue; const col = sb.equipo === 'rojo' ? ROJO : AZUL; hg.strokeStyle = col; hg.lineWidth = (j.fijado === sb ? 2.6 : 1.4)*s; hg.lineWidth = 1.4*s; hg.strokeRect(p.x - 14*s, p.y - 8*s, 28*s, 16*s); textoH(Math.round(100*sb.hp/sb.hpMax) + '%', p.x, p.y - 12*s, 9*s, col, 'center'); }
  hg.strokeStyle = VERDE; hg.fillStyle = VERDE; hg.lineWidth = 1.6*s;
  /* cintas de velocidad y altura */
  const kmh = Math.round(j.v*3.6), alt = Math.round(j.pos.y);
  const cinta = (x, val, paso, et, der)=>{ const h2 = H*0.34, y0 = cy; hg.globalAlpha = 0.85; hg.beginPath(); hg.moveTo(x, y0 - h2); hg.lineTo(x, y0 + h2); hg.stroke();
    for(let k=-6;k<=6;k++){ const v = Math.round(val/paso)*paso + k*paso, y = y0 - (v - val)/paso*h2/6; if(Math.abs(y - y0) > h2) continue; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x + (der ? -8 : 8)*s, y); hg.stroke();
      if(v % (paso*2) === 0) textoH(v + '', x + (der ? -12 : 12)*s, y + 4*s, 10*s, VERDE, der ? 'right' : 'left'); }
    hg.globalAlpha = 1; hg.fillStyle = 'rgba(0,20,10,0.55)'; const bw = 58*s; hg.fillRect(der ? x - bw - 8*s : x + 8*s, y0 - 10*s, bw, 20*s); hg.strokeRect(der ? x - bw - 8*s : x + 8*s, y0 - 10*s, bw, 20*s);
    textoH(Math.round(val) + '', der ? x - 8*s - bw/2 : x + 8*s + bw/2, y0 + 5*s, 13*s, VERDE, 'center'); textoH(et, x + (der ? -8 - 29 : 8 + 29)*s, y0 - h2 - 6*s, 10*s, VERDE, 'center'); hg.fillStyle = VERDE; };
  cinta(W*0.2, kmh, 50, 'KM/H', false); cinta(W*0.8, alt, 100, 'M', true);
  textoH('G ' + j.gF.toFixed(1), W*0.2 + 10*s, cy + H*0.34 + 16*s, 11*s, j.gF > 7 ? ROJO : VERDE);
  if(j.turbo > 0.3) textoH(T('POSQUEMADOR'), W*0.2 + 10*s, cy + H*0.34 + 30*s, 10*s, '#ffc44d');
  /* vida, cañón, misiles, bengalas */
  const bx = 14*s, by = 14*s; textoH(T('ESTRUCTURA'), bx, by + 8*s, 9*s, VERDE); hg.fillStyle = 'rgba(0,0,0,0.45)'; hg.fillRect(bx, by + 12*s, 150*s, 6*s);
  const fr = j.hp/j.hpMax; hg.fillStyle = fr > 0.5 ? VERDE : fr > 0.25 ? '#ffc44d' : ROJO; hg.fillRect(bx, by + 12*s, 150*s*fr, 6*s);
  textoH(T('CAÑÓN'), bx, by + 32*s, 9*s, VERDE); hg.fillStyle = 'rgba(0,0,0,0.45)'; hg.fillRect(bx + 44*s, by + 25*s, 106*s, 5*s); hg.fillStyle = j.calor > 0.85 ? ROJO : '#ffc44d'; hg.fillRect(bx + 44*s, by + 25*s, 106*s*j.calor, 5*s);
  for(let k=0;k<j.def.misiles;k++){ hg.fillStyle = k < j.misiles ? VERDE : 'rgba(109,255,168,0.2)'; hg.fillRect(bx + k*9*s, by + 40*s, 5*s, 14*s); }
  textoH(T('BENGALAS') + ' ' + j.bengalas, bx + j.def.misiles*9*s + 6*s, by + 52*s, 9*s, VERDE);
  /* objetivo y radar */
  textoH(objetivoTexto(), cx, 22*s, 12*s, VERDE, 'center');
  const rr = 50*s, rx = W - rr - 16*s, ry = rr + 60*s; hg.fillStyle = 'rgba(0,20,10,0.45)'; hg.beginPath(); hg.arc(rx, ry, rr, 0, TAU); hg.fill(); hg.strokeStyle = 'rgba(109,255,168,0.6)'; hg.stroke();
  hg.beginPath(); hg.arc(rx, ry, rr*0.5, 0, TAU); hg.stroke(); const barr = J.tt*2.2; hg.strokeStyle = 'rgba(109,255,168,0.35)'; hg.beginPath(); hg.moveTo(rx, ry); hg.lineTo(rx + Math.cos(barr)*rr, ry + Math.sin(barr)*rr); hg.stroke();
  const rumbo = Math.atan2(F.x, -F.z), esc = rr/6000;
  const punto = (p, col, t)=>{ const dx = p.x - j.pos.x, dz = p.z - j.pos.z, x = dx*Math.cos(-rumbo) - dz*Math.sin(-rumbo), z = dx*Math.sin(-rumbo) + dz*Math.cos(-rumbo), L = Math.hypot(x, z)*esc;
    const k = L > rr - 3*s ? (rr - 3*s)/L : 1; hg.fillStyle = col; hg.fillRect(rx + x*esc*k - t, ry + z*esc*k - t, t*2, t*2); };
  for(const x of J.aviones) if(x.vivo && x !== j) punto(x.pos, x.equipo === 'rojo' ? ROJO : AZUL, 2.6*s);
  for(const m of MISILES) punto(m.p, '#fff', 1.5*s); for(const sb of BLANCOS_SUP) if(sb.vivo) punto(sb.pos, sb.equipo === 'rojo' ? ROJO : AZUL, 4*s);
  hg.fillStyle = VERDE; hg.beginPath(); hg.moveTo(rx, ry - 6*s); hg.lineTo(rx - 4*s, ry + 4*s); hg.lineTo(rx + 4*s, ry + 4*s); hg.closePath(); hg.fill();
  /* avisos */
  const viene = MISILES.filter(m=> m.blanco === j);
  if(viene.length && Math.floor(J.tt*6) % 2 === 0){ textoH(T('¡MISIL!'), cx, H*0.3, 24*s, ROJO, 'center'); for(const m of viene){ const v = _t2.copy(m.p).applyMatrix4(cam.matrixWorldInverse), a = Math.atan2(-v.y, v.x);
      hg.strokeStyle = ROJO; hg.lineWidth = 3*s; hg.beginPath(); hg.arc(cx, cy, H*0.2, a - 0.25, a + 0.25); hg.stroke(); } }
  const sobre = j.pos.y - Math.max(0, alturaTerreno(j.pos.x, j.pos.z));
  if(sobre < 180 && j.vel.y < -5 && Math.floor(J.tt*4) % 2 === 0) textoH(T('¡SUBÍ!'), cx, H*0.7, 22*s, ROJO, 'center');
  if(j.v < j.def.vmin*1.08) textoH(T('PÉRDIDA'), cx, H*0.76, 16*s, '#ffc44d', 'center');
  if(J.marca > 0){ hg.strokeStyle = '#fff'; hg.lineWidth = 2*s; const m = 10*s; hg.beginPath(); hg.moveTo(cx - m, cy - m); hg.lineTo(cx - m*0.4, cy - m*0.4); hg.moveTo(cx + m, cy - m); hg.lineTo(cx + m*0.4, cy - m*0.4);
    hg.moveTo(cx - m, cy + m); hg.lineTo(cx - m*0.4, cy + m*0.4); hg.moveTo(cx + m, cy + m); hg.lineTo(cx + m*0.4, cy + m*0.4); hg.stroke(); }
  J.killfeed.forEach((k, i)=> textoH('✕ ' + T(k.txt), W - 16*s, H*0.5 + i*16*s, 11*s, 'rgba(109,255,168,' + Math.min(1, k.t) + ')', 'right'));
  J.textos.forEach((t, i)=> textoH(t.t, cx, H*0.62 - i*18*s - (1.6 - t.v)*14*s, 14*s, t.c, 'center'));
  hg.shadowBlur = 0;
}
function texto(t, c){ J.textos.unshift({t, c, v:1.6}); if(J.textos.length > 4) J.textos.pop(); }
function aviso(t, col, sub){ const a = $('aviso'); a.innerHTML = T(t) + (sub ? '<small>' + T(sub) + '</small>' : ''); a.style.color = col||'#fff'; a.style.opacity = 1; clearTimeout(aviso.t); aviso.t = setTimeout(()=> a.style.opacity = 0, 2200); }
