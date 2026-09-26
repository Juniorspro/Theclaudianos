/* ================================================================ el jugador: la cámara es la cabeza
   Camina a 3 m/s, corre a 5,2 mientras dura la energía. Choca contra cajas (paredes, muebles, puertas cerradas)
   como un círculo de 0,3 m. En la escalera la altura sigue la rampa. */
const OJOS = 1.55, RADIO_J = 0.3;
const JUG = {x:0.25, y:0, z:-11.5, piso:0, yaw:0, pitch:0, vx:0, vz:0, fase:0, paso:0, energia:100, energiaT:0, gaseosaT:0, o2:100, en:'libre', placard:null,
  linterna:{tiene:false, on:false, bat:100, repuestos:0, falla:0}, inv:{tablas:0, martillo:false, bidon:-1, llave:false, gaseosas:0}, mano:null, ultPos:[0, 0], quieto:0, corriendo:false, ruido:0, adentro:false, sala:null};
function colisionesDe(piso){ return COL[piso]; }
/* empuja el círculo afuera de cada caja; dos pasadas alcanzan para las esquinas */
function resolver(x, z, piso, r){
  const L = colisionesDe(piso);
  for(let it = 0; it < 2; it++) for(const c of L){
    if(x < c.x0 - r || x > c.x1 + r || z < c.z0 - r || z > c.z1 + r) continue;
    const cx = lim(x, c.x0, c.x1), cz = lim(z, c.z0, c.z1), dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
    if(d > 1e-6 && d < r){ x = cx + dx/d*r; z = cz + dz/d*r; }
    else if(d <= 1e-6){ /* el centro quedó adentro: sale por el lado más corto */
      const e = [x - c.x0 + r, c.x1 - x + r, z - c.z0 + r, c.z1 - z + r], m = Math.min(...e);
      if(m === e[0]) x = c.x0 - r; else if(m === e[1]) x = c.x1 + r; else if(m === e[2]) z = c.z0 - r; else z = c.z1 + r; }
  }
  return [x, z];
}
const enEscalera = (x, z) => x > ESC.x0 && x < ESC.x1 && z > ESC.z0 - 0.05 && z < ESC.z1 + 0.05;
function alturaSuelo(x, z, piso){ if(enEscalera(x, z) && (piso === 0 || z < ESC.z1)) return rampa(z); return piso ? PISO1 : 0; }
function superficie(){
  const x = JUG.x, z = JUG.z;
  if(enEscalera(x, z)) return 'paso_escalera';
  const s = salaEn(x, z, JUG.piso);
  if(s) return s.suelo.startsWith('alfombra') ? 'paso_alfombra' : 'paso_madera';
  if(x > GALPON.x0 && x < GALPON.x1 && z > GALPON.z0 && z < GALPON.z1) return 'paso_madera';
  if(z < -14 || (Math.abs(x - 0.25) < 0.9 && z < -5 && z > -13)) return 'paso_asfalto';
  return 'paso_pasto';
}
function pasoJugador(dt){
  const J2 = JUG; if(J2.en !== 'libre') return;
  /* mirar */
  const k = 0.0042*AJ.sens*(ENT.raton ? 0.55 : 1);
  J2.yaw -= ENT.dx*k; J2.pitch = lim(J2.pitch - ENT.dy*k, -1.35, 1.35); ENT.dx = ENT.dy = 0;
  /* caminar: la palanca (o las teclas) en el plano de la mirada */
  const tk = ejeTeclado(); let mx = ENT.mx + tk.x, my = ENT.my + tk.y; const m = Math.hypot(mx, my); if(m > 1){ mx /= m; my /= m; }
  const mag = Math.hypot(mx, my), quiereCorrer = (ENT.correr || tk.correr) && mag > 0.3 && my < 0.2;
  J2.gaseosaT = Math.max(0, J2.gaseosaT - dt);
  const puede = J2.energia > 1 && quiereCorrer; J2.corriendo = puede;
  if(puede){ J2.energia = Math.max(0, J2.energia - dt*(J2.gaseosaT > 0 ? 8 : 17)); J2.energiaT = 1.1; }
  else { J2.energiaT -= dt; if(J2.energiaT <= 0) J2.energia = Math.min(100, J2.energia + dt*(J2.gaseosaT > 0 ? 22 : 12)); }
  const falta = J2.o2 < 30 ? lerp(0.55, 1, J2.o2/30) : 1, vel = (puede ? 5.2 : 3.0)*falta*(mag < 0.12 ? 0 : mag);
  const sy = Math.sin(J2.yaw), cy = Math.cos(J2.yaw), fx = -sy, fz = -cy, rx = cy, rz = -sy;
  const dvx = (rx*mx - fx*my)*vel/(mag || 1), dvz = (rz*mx - fz*my)*vel/(mag || 1);
  const ac = 1 - Math.exp(-dt*12); J2.vx += (dvx - J2.vx)*ac; J2.vz += (dvz - J2.vz)*ac;
  /* moverse en pasitos para no atravesar nada */
  const n = Math.max(1, Math.ceil(Math.hypot(J2.vx, J2.vz)*dt/0.12));
  for(let i = 0; i < n; i++){ let nx = J2.x + J2.vx*dt/n, nz = J2.z + J2.vz*dt/n;
    const pisoCol = J2.y > 1.6 ? 1 : 0; [nx, nz] = resolver(nx, nz, pisoCol, RADIO_J); J2.x = nx; J2.z = nz; }
  /* la escalera: la altura sigue la rampa y el piso cambia arriba y abajo */
  if(enEscalera(J2.x, J2.z)){ J2.y = rampa(J2.z); J2.piso = J2.y > 1.6 ? 1 : 0; }
  else J2.y = J2.piso ? PISO1 : 0;
  /* el cabeceo y los pasos */
  const rapidez = Math.hypot(J2.vx, J2.vz);
  if(rapidez > 0.4){ const antes = Math.sin(J2.fase); J2.fase += dt*rapidez*(puede ? 2.6 : 2.9); if(antes > 0 && Math.sin(J2.fase) <= 0 || antes < 0 && Math.sin(J2.fase) >= 0){ SON.fx(superficie(), {vol:puede ? 0.9 : 0.55, adentro:J2.adentro}); J2.ruido = puede ? 9 : 3.5; } }
  else J2.fase += (Math.round(J2.fase/Math.PI)*Math.PI - J2.fase)*Math.min(1, dt*6);
  J2.ruido = Math.max(0, J2.ruido - dt*12);
  J2.adentro = adentroDeCasa(J2.x, J2.y + 1, J2.z); J2.sala = salaEn(J2.x, J2.z, J2.piso);
  J2.quieto = rapidez < 0.2 ? J2.quieto + dt : 0;
}
/* la cabeza: posición y giro de la cámara (con el cabeceo del paso, el pulso y el temblor) */
function ponerCamara(dt, temblor){
  const c = RND.cam, J2 = JUG, rap = Math.hypot(J2.vx, J2.vz), bob = Math.sin(J2.fase)*0.035*lim(rap/3, 0, 1.4), lado = Math.cos(J2.fase*0.5)*0.018*lim(rap/3, 0, 1.4);
  const t = performance.now()/1000, pulso = 0.004 + (1 - J2.o2/100)*0.02, tm = temblor || 0;
  c.position.set(J2.x + Math.cos(J2.yaw)*lado, J2.y + OJOS + bob, J2.z - Math.sin(J2.yaw)*lado);
  c.rotation.order = 'YXZ'; c.rotation.y = J2.yaw + Math.sin(t*0.9)*pulso*0.5 + (Math.random() - 0.5)*tm*0.05; c.rotation.x = J2.pitch + Math.sin(t*1.3)*pulso*0.4 + (Math.random() - 0.5)*tm*0.05;
  c.rotation.z = lado*0.3 + (Math.random() - 0.5)*tm*0.03;
}

/* ================================================================ interactuar
   Se elige lo que está más cerca del centro de la mirada (por ángulo), no por rayo: con el dedo, un rayo a un
   interruptor de 10 cm no pega nunca. */
const ACC = {obj:null, apretado:false, prog:0, flanco:false, caja:null};
function registrar(o){ o.r = o.r || 1.9; MUNDO.interactivos.push(o); return o; }
function elegirInteractivo(){
  const c = RND.cam, J2 = JUG; if(J2.en !== 'libre') return null;
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion); let mejor = null, mv = 1e9;
  for(const o of MUNDO.interactivos){ if(o.oculto && o.oculto()) continue;
    const dx = o.pos[0] - c.position.x, dy = o.pos[1] - c.position.y, dz = o.pos[2] - c.position.z, d = Math.hypot(dx, dy, dz); if(d > o.r || d < 0.05) continue;
    if(o.piso !== undefined && o.piso !== J2.piso && !enEscalera(J2.x, J2.z)) continue;
    const cosA = (dx*dir.x + dy*dir.y + dz*dir.z)/d, ang = Math.acos(lim(cosA, -1, 1)), tope = o.ang || 0.5; if(ang > tope) continue;
    if(!visible(c.position, o.pos, o)) continue;
    const v = ang + d*0.08; if(v < mv){ mv = v; mejor = o; } }
  return mejor;
}
/* ¿hay una pared entre la cabeza y el objeto? se muestrea el segmento contra las cajas del piso */
function visible(a, b, o){
  const piso = JUG.piso, L = colisionesDe(piso), n = 8;
  for(let i = 1; i < n; i++){ const t = i/n, x = lerp(a.x, b[0], t), z = lerp(a.z, b[2], t);
    for(const c of L){ if(c.puerta && o && o.puerta === c.puerta) continue; if(o && o.ignorar && o.ignorar(c)) continue;
      /* el mueble sobre el que está (la mesa de la radio, el tambor, el escritorio) no tapa lo que tiene encima */
      if(o && b[0] > c.x0 - 0.35 && b[0] < c.x1 + 0.35 && b[2] > c.z0 - 0.35 && b[2] < c.z1 + 0.35) continue;
      if(x > c.x0 + 0.02 && x < c.x1 - 0.02 && z > c.z0 + 0.02 && z < c.z1 - 0.02) return false; } }
  return true;
}
function pasoInteraccion(dt){
  const o = elegirInteractivo(); if(o !== ACC.obj){ ACC.obj = o; ACC.prog = 0; }
  const b = $('bAccion'), et = $('bAccionT'), puede = o && (!o.ok || o.ok());
  b.classList.toggle('apagado', !o); et.textContent = o ? (typeof o.et === 'function' ? o.et() : tr(o.et)) : ''; $('mira').classList.toggle('activa', !!o);
  if(!ACC.caja){ const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)); ACC.caja = new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.8, depthTest:true, fog:false})); RND.esc.add(ACC.caja); }
  ACC.caja.visible = !!o;
  if(o){ const s = o.sel || [0.4, 0.4, 0.4], p = o.selPos || o.pos; ACC.caja.position.set(p[0], p[1], p[2]); ACC.caja.scale.set(s[0] + 0.04, s[1] + 0.04, s[2] + 0.04); ACC.caja.rotation.y = o.selRot || 0;
    ACC.caja.material.color.set(puede ? 0xffffff : 0xff6a5a); }
  /* mantener apretado para lo que lleva tiempo (clavar, cargar, instalar); tocar para lo demás */
  if(o && puede){
    if(o.mantener){ if(ACC.apretado){ ACC.prog += dt/o.mantener; if(o.durante) o.durante(ACC.prog, dt); if(ACC.prog >= 1){ ACC.prog = 0; o.hacer(); if(!o.repetir) ACC.apretado = false; } } else ACC.prog = Math.max(0, ACC.prog - dt*3); }
    else if(ACC.flanco){ o.hacer(); }
  } else if(o && ACC.flanco && o.no) o.no();
  ACC.flanco = false;
  aro(ACC.prog);
}
function aro(p){ const b = $('bAccion'); b.style.background = p > 0.01 ? 'conic-gradient(rgba(255,255,255,0.75) ' + (p*360).toFixed(0) + 'deg, rgba(25,25,30,0.45) 0deg)' : ''; }
