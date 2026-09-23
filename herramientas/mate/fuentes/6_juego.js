
/* ================================================================ la jugabilidad
   Como en Ripe for Revenge: no se camina. Se ARRASTRA para planear el salto (o el deslizamiento si es
   horizontal), el tiempo se frena mientras se planea, y en el aire se toca a cada enemigo para dispararle.
   Cada brazo apunta por su lado, así se le tira a dos a la vez. Los enemigos avisan con un círculo que
   se vacía; cuando se vacía, tiran. */
const J = {modo:'menu', t:0, tr:0, ts:1, tsObj:1, nivel:null, idx:0, puntos:0, mult:1, multT:0, muertes:0, tiros:0, aciertos:0, danio:0,
  cine:null, pausa:false, textos:[], planeo:null, fin:null, killcam:0, hitstop:0, vidrio:0, reloj:0, estilo:{}};
const GRAV = 30, TIPOS = {
  maton:   {vida:1, aviso:1.9, cd:1.5, rango:11, bala:13, tiros:1, abre:0, hoja:'maton', brazo:[P.traje, P.trajeS, P.piel, 'pistola'], puntos:100},
  escopeta:{vida:2, aviso:1.7, cd:1.7, rango:8.5, bala:12, tiros:3, abre:0.22, hoja:'escopeta', brazo:[P.cuero, P.cueroS, P.pielS, 'escopeta'], puntos:180},
  pesado:  {vida:3, aviso:2.1, cd:1.1, rango:11, bala:14, tiros:1, abre:0.05, rafaga:3, hoja:'pesado', tam:1.25, brazo:['#3e4a3a', '#262e22', '#222', 'subfusil'], puntos:300},
  tirador: {vida:1, aviso:1.1, cd:1.9, rango:24, bala:30, tiros:1, abre:0, rojo:true, hoja:'tirador', brazo:[P.tirador, '#100e14', P.piel, 'rifle'], puntos:250},
  jefe:    {vida:30, aviso:1.4, cd:0.9, rango:30, bala:15, tiros:5, abre:0.35, hoja:'jefe', tam:1.6, brazo:['#6a5a44', '#4a3e2e', '#e0b490', 'samovar'], puntos:5000}
};
const HOJAS = {};
function prepararHojas(){
  HOJAS.heroe = hojaHumano('heroe');
  HOJAS.brazoH = hojaBrazo(P.campera, P.camperaS, P.mascara, 'pistola'); HOJAS.brazoH2 = hojaBrazo(P.camperaS, '#101018', '#16121c', 'pistola');
  for(const k in TIPOS){ const T = TIPOS[k]; HOJAS[k] = hojaHumano(T.hoja, T.tam); HOJAS['brazo_' + k] = hojaBrazo(...T.brazo, T.tam); }
  HOJAS.mateo = hojaMateo(); HOJAS.obj = hojaObjetos();
}

/* ---------- entidades ---------- */
const HE = {x:0, y:0, vx:0, vy:0, est:'suelo', dir:1, vida:3, invul:0, pared:0, paredLado:0, desliza:0, anim:0, giro:0, malla:null, brazos:[], bufanda:null,
  obj:[null, null], proxBrazo:0, retro:[0, 0], enAire:0, bajas:0, pisoAnt:true};
let ENEM = [], BALAS = [], OBJ = [], MATEO = null;
const ANCHO = 0.55, ALTO = 1.7, ALTO_DESL = 0.7;
function crearHeroe(x, y){
  if(HE.malla){ esc.remove(HE.malla, ...HE.brazos, HE.bufanda.malla); }
  Object.assign(HE, {x, y, vx:0, vy:0, est:'suelo', dir:1, vida:3, invul:0, pared:0, desliza:0, anim:0, giro:0, obj:[null, null], enAire:0, bajas:0, muerto:0});
  HE.malla = hacerSprite(HOJAS.heroe, {pie:1}); esc.add(HE.malla);
  HE.brazos = [hacerBrazo(HOJAS.brazoH2), hacerBrazo(HOJAS.brazoH)]; esc.add(...HE.brazos);
  HE.bufanda = crearBufanda(); esc.add(HE.bufanda.malla);
  /* la estela de la cámara lenta: copias del sprite que se apagan */
  if(HE.fantasmas) esc.remove(...HE.fantasmas);
  HE.fantasmas = [0, 1, 2, 3].map(i => { const m = new THREE.Mesh(HE.malla.geometry, new THREE.MeshBasicMaterial({map:HE.malla.material.map, transparent:true, opacity:0, depthWrite:false, alphaTest:0.05, blending:THREE.AdditiveBlending, fog:false, color:i % 2 ? new THREE.Color(2.6, 0.5, 0.8) : new THREE.Color(0.5, 1.8, 2.6)})); m.renderOrder = 3; m.visible = false; esc.add(m); return m; });
  HE.rastro = []; HE.rastroT = 0;
}
function hacerBrazo(hoja){
  const m = hacerSprite(hoja); m.geometry.dispose();
  const g = new THREE.PlaneBufferGeometry(hoja.fw/TX, hoja.fh/TX); g.translate(hoja.fw/TX/2 - hoja.pivote.x/TX, 0, 0);    /* gira desde el hombro */
  m.geometry = g; m.userData.boca = hoja.boca; m.userData.pivote = hoja.pivote; m.userData.largo = (hoja.boca.x - hoja.pivote.x)/TX; return m;
}
/* la bufanda roja: una cadena de verlet que el viento y el movimiento arrastran */
function crearBufanda(){
  const n = 7, pts = [...Array(n)].map(() => ({x:0, y:0, px:0, py:0})), pos = new Float32Array(n*2*3), idx = [];
  for(let i = 0; i < n - 1; i++){ const a = i*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n*2*3).map((v, i) => i % 3 === 2 ? 1 : 0), 3));
  const col = new THREE.Color(P.bufanda).convertSRGBToLinear();
  const malla = new THREE.Mesh(g, new THREE.MeshStandardMaterial({color:col, roughness:0.7, side:THREE.DoubleSide, emissive:col.clone().multiplyScalar(0.15)}));
  malla.frustumCulled = false; malla.castShadow = true;
  return {pts, pos, malla, g, iniciada:false};
}
function pasoBufanda(dt, ancla){
  const B = HE.bufanda, pts = B.pts, L = 0.2;
  if(!B.iniciada){ pts.forEach((p, i) => { p.x = p.px = ancla.x - i*L*HE.dir; p.y = p.py = ancla.y; }); B.iniciada = true; }
  pts[0].x = ancla.x; pts[0].y = ancla.y;
  const viento = -HE.dir*2 - HE.vx*0.5 + Math.sin(J.tr*3)*1.2;
  for(let i = 1; i < pts.length; i++){ const p = pts[i], vx = (p.x - p.px)*0.92, vy = (p.y - p.py)*0.92; p.px = p.x; p.py = p.y;
    p.x += vx + viento*dt*dt*6; p.y += vy - 6*dt*dt*6 + Math.sin(J.tr*8 + i)*0.004; }
  for(let k = 0; k < 3; k++) for(let i = 1; i < pts.length; i++){ const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4, e = (d - L)/d;
    if(i === 1){ b.x -= dx*e; b.y -= dy*e; } else { a.x += dx*e*0.5; a.y += dy*e*0.5; b.x -= dx*e*0.5; b.y -= dy*e*0.5; } }
  pts.forEach((p, i) => { const w = 0.09*(1 - i/pts.length) + 0.05; B.pos.set([p.x, p.y + w, 0.05, p.x, p.y - w, 0.05], i*6); });
  B.g.attributes.position.needsUpdate = true;
}
function crearEnemigo(tipo, x, y){
  const T = TIPOS[tipo], e = {tipo, T, x, y, vx:0, vy:0, dir:-1, vida:T.vida, est:'ronda', aviso:0, cd:rv(0.2, 0.8), visto:0, perdido:0, anim:rv(0, 9), muerto:0,
    ronda:{x0:x - 3, x1:x + 3, pausa:rv(0.5, 2)}, rafaga:0, alto:ALTO*(T.tam || 1), ancho:ANCHO*(T.tam || 1)};
  e.malla = hacerSprite(HOJAS[tipo], {pie:1}); e.brazo = hacerBrazo(HOJAS['brazo_' + tipo]); esc.add(e.malla, e.brazo);
  /* los límites de la ronda: hasta el borde del piso o la pared */
  let a = x, b = x; while(a > x - 6 && !solidoEn(a - 0.6, y + 0.5) && solidoEn(a - 0.6, y - 0.2)) a -= 0.25; while(b < x + 6 && !solidoEn(b + 0.6, y + 0.5) && solidoEn(b + 0.6, y - 0.2)) b += 0.25;
  e.ronda.x0 = a; e.ronda.x1 = b;
  ENEM.push(e); return e;
}

/* ---------- colisiones contra las baldosas ---------- */
function choca(x, y, w, h, caer){                   /* ¿la caja toca algo sólido? (w, h: medio ancho y alto; x, y: pies) */
  for(let yy = Math.floor(y); yy <= Math.floor(y + h - 0.001); yy++) for(let xx = Math.floor(x - w); xx <= Math.floor(x + w - 0.001); xx++){
    if(SOLIDOS.has(celda(xx + 0.5, yy + 0.5))) return true; }
  return false;
}
function tablonDebajo(x, yAnt, yNue, w){             /* el tablón sólo frena cayendo desde arriba */
  const top = Math.floor(yAnt);
  if(yNue > top || yAnt < top - 0.001) return null;
  for(let xx = Math.floor(x - w); xx <= Math.floor(x + w - 0.001); xx++) if(celda(xx + 0.5, top - 0.5) === '=') return top;
  return null;
}
function moverCaja(o, dt, w, h){
  let golpeX = 0, piso = false, techo = false;
  const nx = o.x + o.vx*dt;
  if(!choca(nx, o.y, w, h)) o.x = nx; else { golpeX = sig(o.vx); const paso = 0.02*sig(o.vx); while(!choca(o.x + paso, o.y, w, h)) o.x += paso; o.vx = 0; }
  const ny = o.y + o.vy*dt;
  if(o.vy <= 0){ const tb = tablonDebajo(o.x, o.y, ny, w); if(tb !== null){ o.y = tb; o.vy = 0; piso = true; } }
  if(!piso){ if(!choca(o.x, ny, w, h)) o.y = ny; else { if(o.vy < 0) piso = true; else techo = true;
    const paso = 0.02*sig(o.vy); while(!choca(o.x, o.y + paso, w, h)) o.y += paso; o.vy = 0; } }
  if(!piso && o.vy <= 0 && (choca(o.x, o.y - 0.03, w, h) || tablonDebajo(o.x, o.y, o.y - 0.03, w) !== null)) piso = true;
  return {golpeX, piso, techo};
}
/* la cinta lleva lo que tiene encima; el vapor empuja para arriba hasta 6 baldosas */
const V_CINTA = 3.6;
function cinta(o, dt, w, h){ const t = celda(o.x, o.y - 0.1); if(t !== '<' && t !== '>') return; const q = {x:o.x, y:o.y, vx:(t === '>' ? 1 : -1)*V_CINTA, vy:0}; moverCaja(q, dt, w, h); o.x = q.x; }
function vapor(o, dt){
  for(const dx of [-0.2, 0.2]){ const cx = Math.floor(o.x + dx); let y = Math.floor(o.y + 0.01);
    for(let k = 0; k <= 6; k++, y--){ const t = celda(cx + 0.5, y - 0.5); if(t === 'v'){ o.vy = Math.min(13.5, Math.max(o.vy, 0) + 70*dt); return true; } if(SOLIDOS.has(t)) break; } }
  return false;
}
/* línea de vista por baldosas (el vidrio no tapa) */
function veLinea(x0, y0, x1, y1){ const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d*3);
  for(let i = 1; i < n; i++){ const t = i/n, c = celda(x0 + (x1 - x0)*t, y0 + (y1 - y0)*t); if(c !== 'x' && SOLIDOS.has(c)) return false; } return true; }

/* ---------- el héroe: planeo, salto, deslizamiento, pared ---------- */
function puedePlanear(){ return !HE.muerto && (HE.est === 'suelo' || HE.est === 'pared' || (HE.est === 'desliza' && Math.abs(HE.vx) < 3)); }
function vDePlaneo(dx, dy){                          /* el arrastre va al revés: tirás para atrás, salta para adelante */
  let vx = -dx*4.2, vy = -dy*4.2; const m = Math.hypot(vx, vy), max = 17; if(m > max){ vx *= max/m; vy *= max/m; }
  return {vx, vy, m:Math.min(m, max)};
}
function esDeslizar(v){ return HE.est !== 'pared' && Math.abs(v.vy) < Math.abs(v.vx)*0.32; }
function ejecutarPlaneo(dx, dy){
  const v = vDePlaneo(dx, dy); if(v.m < 2.2) return false;
  if(esDeslizar(v)){ HE.est = 'desliza'; HE.vx = sig(v.vx)*lim(v.m*1.05, 7, 15); HE.vy = 0; HE.dir = sig(v.vx); HE.desliza = 1; SON.fx('desliza'); }
  else { HE.vx = v.vx; HE.vy = Math.max(v.vy, 3.5); if(HE.est === 'pared' && sig(HE.vx) === HE.paredLado) HE.vx = -HE.paredLado*Math.max(4, Math.abs(HE.vx)*0.6);
    HE.est = 'aire'; HE.dir = sig(HE.vx) || HE.dir; HE.giro = 0; HE.enAire = 0; HE.bajas = 0; SON.fx('salto'); polvo(HE.x, HE.y, 6); }
  return true;
}
/* la trayectoria que se dibuja mientras se planea */
function trayectoria(dx, dy){
  const v = vDePlaneo(dx, dy), o = {x:HE.x, y:HE.y, vx:v.vx, vy:Math.max(v.vy, 3.5)}, pts = [];
  if(v.m < 2.2) return {pts, ok:false};
  if(esDeslizar(v)){ o.vx = sig(v.vx)*lim(v.m*1.05, 7, 15); o.vy = 0; for(let i = 0; i < 60; i++){ o.vx *= 0.955; const r = moverCaja(o, 1/60, ANCHO/2, ALTO_DESL); if(r.golpeX || Math.abs(o.vx) < 1) break; if(i % 3 === 0) pts.push({x:o.x, y:o.y + 0.3}); }
    return {pts, ok:true, desliza:true}; }
  if(HE.est === 'pared' && sig(o.vx) === HE.paredLado) o.vx = -HE.paredLado*Math.max(4, Math.abs(o.vx)*0.6);
  for(let i = 0; i < 150; i++){ o.vy -= GRAV/60; const r = moverCaja(o, 1/60, ANCHO/2, ALTO); if(i % 3 === 0) pts.push({x:o.x, y:o.y + ALTO/2}); if(r.piso || r.golpeX) { pts.push({x:o.x, y:o.y + ALTO/2, fin:true}); break; } }
  return {pts, ok:true};
}
function pasoHeroe(dt){
  if(HE.muerto){ HE.muerto += dt; HE.vy -= GRAV*dt; moverCaja(HE, dt, ANCHO/2, 0.6); HE.vx *= Math.exp(-3*dt); return; }
  HE.invul = Math.max(0, HE.invul - dt);
  const altoAhora = HE.est === 'desliza' ? ALTO_DESL : ALTO;
  if(HE.est === 'suelo'){ HE.vx *= Math.exp(-14*dt); }
  else if(HE.est === 'desliza'){ HE.vx *= Math.exp(-2.1*dt); if(Math.abs(HE.vx) < 1.2 && !choca(HE.x, HE.y, ANCHO/2, ALTO)){ HE.est = 'suelo'; HE.vx = 0; } }
  else if(HE.est === 'pared'){ HE.pared -= dt; HE.vy = Math.max(HE.vy - 6*dt, -1.1); if(HE.pared <= 0 || !choca(HE.x + HE.paredLado*0.05, HE.y, ANCHO/2, ALTO)){ HE.est = 'aire'; HE.vx = -HE.paredLado*1.5; } }
  if(HE.est === 'aire' || HE.est === 'desliza') HE.vy -= GRAV*dt;
  if(HE.est === 'aire'){ HE.enAire += dt; const gira = Math.abs(HE.vx) > 6 && HE.vy > -2; if(gira && !HE.giro && !J.sim) SON.fx('voltereta'); HE.giro += dt*(gira ? 11 : 0)*HE.dir; }
  const r = moverCaja(HE, dt, ANCHO/2, altoAhora);
  if(HE.est === 'suelo' || HE.est === 'desliza') cinta(HE, dt, ANCHO/2, altoAhora);
  if(vapor(HE, dt) && HE.est !== 'aire'){ HE.est = 'aire'; HE.enAire = 0; HE.giro = 0; HE.bajas = 0; }
  if(HE.est === 'aire'){
    if(r.piso){ HE.est = 'suelo'; HE.giro = 0; HE.anim = 0; SON.fx('aterriza'); polvo(HE.x, HE.y, 8); HE.aterriza = 0.18; HE.bajas = 0; }
    else if(r.golpeX && HE.vy < 8){ HE.est = 'pared'; HE.paredLado = r.golpeX; HE.pared = 2.0; HE.vy = Math.max(HE.vy, -0.5); HE.vx = 0; HE.dir = -r.golpeX; HE.giro = 0; SON.fx('pared'); }
  } else if(HE.est === 'suelo' || HE.est === 'desliza'){ if(!r.piso){ HE.est = 'aire'; HE.enAire = 0; } }
  /* peligros: alambre de púas, vidrios, la puerta */
  const t0 = celda(HE.x, HE.y + 0.3), t1 = celda(HE.x, HE.y + 1.2);
  if((t0 === '^' || t1 === '^') && !HE.invul){ if(!J.sim) SON.fx('alambre'); herir(1, 0, 'alambre'); }
  for(const dy of [0.3, 1.0, 1.5]){ const cx = Math.floor(HE.x + HE.vx*0.02), cy = Math.floor(HE.y + dy); if(celda(cx + 0.5, cy + 0.5) === 'V') romperVidrio(cx, cy); }
  if(celda(HE.x, HE.y + 0.8) === 'D' && !J.fin) terminarNivel();
  if(HE.y < (NIVEL.liquido ? 0.3 : -4) && !HE.muerto){
    if(NIVEL.liquido && !J.sim){ const col = NIVEL.liquido.agua ? '#8ab0ff' : '#ffb060'; SON.fx('carne', {tono:0.5});
      for(let i = 0; i < 26; i++) PART.solidas.tirar(Object.assign({x:HE.x + rv(-0.4, 0.4), y:0.6, z:rv(-0.5, 0.5), vx:rv(-3, 3), vy:rv(4, 10), g:26, vida:rv(0.5, 1), tam:rv(1, 2.5)}, rgb(col, 1.4))); }
    HE.invul = 0; herir(3, HE.x, 'caida'); HE.vy = 0; HE.vx = 0; }
}
function herir(n, desdeX, causa){
  if(J.sim){ J.simHerido = 1; return; }
  if(HE.invul > 0 || HE.muerto || J.fin) return;
  HE.vida -= n; HE.invul = 1.1; J.danio++; J.mult = 1; J.multT = 0; CAMARA.sacude = Math.max(CAMARA.sacude, 1.1); vibrar(60);
  P_FIN.u.herido.value = 1; SON.fx('herido'); sangre(HE.x, HE.y + 1.1, sig(HE.x - desdeX), 14);
  if(causa === 'alambre'){ HE.vy = 9; HE.est = 'aire'; }
  if(HE.vida <= 0){ HE.muerto = 0.001; HE.est = 'aire'; HE.vy = 6; HE.vx = sig(HE.x - desdeX)*4; SON.fx('herido', {tono:0.7}); SON.musica('muerte'); J.tsObj = 0.25; setTimeout(() => { if(J.modo === 'juego') pantallaMuerte(); }, 1600); }
}

/* ---------- disparos ---------- */
function blancoEn(sx, sy){                          /* el blanco más cerca de un toque (en píxeles del lienzo) */
  let mejor = null, md = 22;
  const probar = (x, y, alto, cosa) => { const a = aPantalla(x, y + alto*0.55), b = aPantalla(x, y + alto); const d = Math.hypot(a.x - sx, a.y - sy) - alto*TX*0.25;
    if(d < md){ md = d; mejor = {cosa, cabeza:Math.abs(b.y - sy) < 5 && Math.abs(b.x - sx) < 5}; } };
  for(const e of ENEM) if(!e.muerto && enPantalla(e.x, e.y)) probar(e.x, e.y, e.alto, e);
  for(const o of OBJ) if(o.vivo && o.tipo !== 'puerta' && enPantalla(o.x, o.y)) probar(o.x, o.y - 0.4, 0.9, o);
  for(const b of BALAS) if(b.tetera && b.vida > 0) probar(b.x, b.y - 0.4, 0.8, b);
  return mejor;
}
const _v = new THREE.Vector3();
function aPantalla(x, y, z){ _v.set(x, y, z || 0).project(cam); return {x:(_v.x*.5 + .5)*W, y:(-_v.y*.5 + .5)*H, z:_v.z}; }
function enPantalla(x, y){ const p = aPantalla(x, y); return p.x > -10 && p.x < W + 10 && p.y > -10 && p.y < H + 10; }
function disparar(b){
  if(HE.muerto || J.fin || J.cine) return;
  const c = b.cosa, i = HE.proxBrazo; HE.proxBrazo ^= 1;
  HE.obj[i] = c; if(HE.obj[i ^ 1] === null || (HE.obj[i ^ 1].muerto || HE.obj[i ^ 1].vivo === false)) HE.obj[i ^ 1] = c;
  const br = HE.brazos[i], boca = bocaDe(br);
  const tx = c.x, ty = c.y + (c.alto ? (b.cabeza ? c.alto*0.9 : c.alto*0.6) : 0.1);
  const a = Math.atan2(ty - boca.y, tx - boca.x) + rv(-0.012, 0.012);
  BALAS.push({x:boca.x, y:boca.y, vx:Math.cos(a)*75, vy:Math.sin(a)*75, de:'heroe', vida:0.6, cabeza:b.cabeza, rebote:0, rastro:[]});
  J.tiros++; HE.retro[i] = 1; SON.fx('disparo'); vibrar(8);
  flash(boca.x, boca.y, 0.6, '#ffc070', 5, 0.06, 7);
  PART.brillos.tirar(Object.assign({x:boca.x, y:boca.y, z:0.2, vx:Math.cos(a)*6, vy:Math.sin(a)*6, g:0, vida:0.05, tam:3}, rgb('#fff0a0', 6)));
  PART.solidas.tirar(Object.assign({x:boca.x - Math.cos(a)*0.3, y:boca.y, z:0.1, vx:-HE.dir*rv(1, 3), vy:rv(3, 5), g:26, vida:1.2, tam:1, apaga:false}, rgb('#e8b840', 1.3)));    /* la vaina */
  if(HE.est === 'aire') HE.vx -= Math.cos(a)*0.25;
}
function bocaDe(br){ const L = br.userData.largo, a = br.rotation.z, s = br.scale.x; return {x:br.position.x + Math.cos(a)*L*s, y:br.position.y + Math.sin(a)*L*s}; }
function pasoBalas(dt){
  for(let i = BALAS.length - 1; i >= 0; i--){ const b = BALAS[i];
    b.vida -= dt; const n = Math.ceil(Math.hypot(b.vx, b.vy)*dt/0.25); let muere = b.vida <= 0;
    for(let k = 0; k < n && !muere; k++){
      if(b.g) b.vy -= b.g*dt/n;
      b.x += b.vx*dt/n; b.y += b.vy*dt/n;
      if(b.tetera){ b.giro += dt/n; if(SOLIDOS.has(celda(b.x, b.y - 0.2)) || celda(b.x, b.y - 0.2) === '='){ estallaTetera(b); muere = true; break; } }
      const t = celda(b.x, b.y);
      if(SOLIDOS.has(t)){ muere = true; chispas(b.x - b.vx*0.004, b.y - b.vy*0.004, 5); SON.fx('rebote', {vol:0.4}); break; }
      if(t === 'V'){ romperVidrio(Math.floor(b.x), Math.floor(b.y)); }
      if(b.de === 'heroe'){
        for(const q of BALAS) if(q.tetera && q.vida > 0 && Math.hypot(q.x - b.x, q.y - b.y) < 0.5){ q.reventada = true; estallaTetera(q); q.vida = 0; muere = true; popup(q.x, q.y + 1, tr('¡PUM!'), 'fuego'); }
        for(const e of ENEM){ if(e.muerto || muere) continue; if(Math.abs(b.x - e.x) < e.ancho/2 + 0.05 && b.y > e.y && b.y < e.y + e.alto){ pegarEnemigo(e, b); muere = true; break; } }
        for(const o of OBJ){ if(!o.vivo || muere) continue; if(Math.abs(b.x - o.x) < 0.4 && Math.abs(b.y - (o.y - 0.4)) < 0.55){ if(o.tipo === 'garrafa'){ explotar(o); muere = true; }
          else if(o.tipo === 'chapa' && b.rebote < 3){ rebotar(b, o); } } }
      } else {
        if(!b.zumbo && !HE.muerto && Math.hypot(b.x - HE.x, b.y - HE.y - 1) < 1.3){ b.zumbo = true; SON.fx('zumbido_bala', {x:lim((b.x - CAMARA.x)/12, -1, 1)}); }
        if(!HE.muerto && !b.tetera && Math.abs(b.x - HE.x) < ANCHO/2 + 0.05 && b.y > HE.y && b.y < HE.y + (HE.est === 'desliza' ? ALTO_DESL : ALTO)){ muere = true; herir(1, b.x - b.vx, 'bala'); }
      }
    }
    b.rastro.unshift({x:b.x, y:b.y}); if(b.rastro.length > 3) b.rastro.pop();
    if(muere) BALAS.splice(i, 1);
  }
}
/* la chapa: la bala rebota hacia el enemigo vivo más cercano que se vea desde ahí */
function rebotar(b, o){
  let mejor = null, md = 1e9; for(const e of ENEM){ if(e.muerto) continue; const d = Math.hypot(e.x - o.x, e.y - o.y); if(d < md && d < 20 && veLinea(o.x, o.y - 0.4, e.x, e.y + 1)){ md = d; mejor = e; } }
  const a = mejor ? Math.atan2(mejor.y + mejor.alto*0.6 - b.y, mejor.x - b.x) : Math.atan2(b.vy, -b.vx);
  const v = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a)*v; b.vy = Math.sin(a)*v; b.rebote++; b.carambola = true; b.vida = 0.6;
  chispas(b.x, b.y, 8); SON.fx('rebote', {tono:1.3}); o.giro = 1; flash(b.x, b.y, 0.5, '#ffffff', 4, 0.08, 5);
}
function pegarEnemigo(e, b){
  if(e.invul > 0){ chispas(b.x, b.y, 6); SON.fx('rebote', {vol:0.5}); return; }
  const dmg = b.cabeza ? 2 : 1; e.vida -= dmg; J.aciertos++;
  sangre(b.x, b.y, sig(b.vx), b.cabeza ? 18 : 10); SON.fx(b.cabeza ? 'cabeza' : 'carne', {x:lim((e.x - CAMARA.x)/12, -1, 1)});
  e.vx += sig(b.vx)*(e.tipo === 'jefe' ? 0.3 : 1.5); e.golpe = 0.15;
  if(e.est === 'ronda'){ e.est = 'alerta'; e.visto = 1; }
  if(e.vida <= 0) matar(e, b);
}
function matar(e, b, causa){
  e.muerto = 0.001; e.vy = 5; e.vx = sig(b ? b.vx : e.x - HE.x)*5; e.est = 'muerto'; J.muertes++;
  sangre(e.x, e.y + e.alto*0.7, sig(e.vx), 24); SON.fx('muerte', {x:(e.x - CAMARA.x)/12});
  CAMARA.sacude = Math.max(CAMARA.sacude, 0.6); J.hitstop = 0.05; vibrar(20);
  /* estilo: en el aire, contra la pared, deslizando, a la cabeza, de rebote, explosión, varios en un salto */
  const bonos = [];
  if(HE.est === 'aire'){ HE.bajas++; bonos.push(['¡AÉREO!', 50]); if(HE.bajas === 2) bonos.push(['¡DOBLETE!', 150]); if(HE.bajas >= 3) bonos.push(['¡TRIPLETE!', 300]); }
  if(HE.est === 'pared') bonos.push(['¡DESDE LA PARED!', 80]);
  if(HE.est === 'desliza') bonos.push(['¡DESLIZANDO!', 80]);
  if(b && b.cabeza) bonos.push(['¡A LA CABEZA!', 100]);
  if(b && b.carambola) bonos.push(['¡CARAMBOLA!', 200]);
  if(causa === 'explosion') bonos.push(['¡KABOOM!', 150]);
  J.mult = Math.min(8, J.mult + 1); J.multT = 4; if(J.mult > 1) SON.fx('mult', {n:J.mult}); if(bonos.length) setTimeout(() => SON.fx('estilo'), 90);
  const base = e.T.puntos + bonos.reduce((s, q) => s + q[1], 0), pts = base*J.mult;
  J.puntos += pts;
  popup(e.x, e.y + e.alto + 0.4, '+' + pts, 'oro');
  bonos.forEach((q, i) => popup(e.x, e.y + e.alto + 1 + i*0.7, tr(q[0]), i ? 'fuego' : 'blanco'));
  for(const q of bonos) J.estilo[q[0]] = (J.estilo[q[0]] || 0) + 1;
  /* la última baja de la sala: cámara lentísima */
  if(!ENEM.some(o => !o.muerto && Math.abs(o.x - e.x) < 16)){ J.killcam = 0.7; SON.fx('planeo'); }
  if(e.tipo === 'jefe') jefeMuere(e);
}
function explotar(o){
  if(!o.vivo) return; o.vivo = false; o.malla.visible = false;
  SON.fx('explosion'); CAMARA.sacude = 2.2; J.hitstop = 0.08; vibrar(120); P_FIN.u.destello.value = 0.35;
  flash(o.x, o.y, 1.2, '#ff8a30', 16, 0.5, 14);
  for(let i = 0; i < 40; i++){ const a = rv(0, Math.PI*2), v = rv(3, 13);
    PART.brillos.tirar(Object.assign({x:o.x, y:o.y - 0.3, z:rv(-0.5, 0.5), vx:Math.cos(a)*v, vy:Math.sin(a)*v + 3, g:8, roce:2, vida:rv(0.3, 0.8), tam:rv(1, 3)}, rgb(['#ffe070', '#ff8a30', '#ff4a20'][i % 3], 5)));
    PART.solidas.tirar(Object.assign({x:o.x, y:o.y - 0.3, z:rv(-0.6, 0.6), vx:Math.cos(a)*v*0.4, vy:Math.sin(a)*v*0.4 + 2, g:-1.5, roce:1.5, vida:rv(0.8, 1.6), tam:rv(2, 4)}, rgb('#3a3440', 1))); }
  for(const e of ENEM){ if(e.muerto) continue; if(Math.hypot(e.x - o.x, e.y + 0.8 - o.y) < 3){ e.vida = 0; matar(e, {vx:e.x - o.x}, 'explosion'); } }
  if(Math.hypot(HE.x - o.x, HE.y + 0.8 - o.y) < 2.4) herir(1, o.x, 'explosion');
  for(const q of OBJ) if(q.vivo && q.tipo === 'garrafa' && Math.hypot(q.x - o.x, q.y - o.y) < 3) setTimeout(() => explotar(q), 120);
  /* las paredes de madera vuelan */
  for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++){ const cx = Math.floor(o.x) + dx, cy = Math.floor(o.y) + dy; if(celda(cx + 0.5, cy + 0.5) === 'B') romperPared(cx, cy); }
}
function romperPared(cx, cy){
  const f = NIVEL.alto - 1 - cy; NIVEL.mapa[f][cx] = '.'; const mm = NIVEL.madera[cx + ',' + cy]; if(mm) mm.visible = false; SON.fx('madera');
  for(let i = 0; i < 10; i++) PART.solidas.tirar(Object.assign({x:cx + rv(0, 1), y:cy + rv(0, 1), z:rv(-1, 1), vx:rv(-6, 6), vy:rv(2, 9), g:26, vida:rv(0.8, 1.6), tam:2, apaga:false}, rgb('#7a5a34', 1)));
}
function romperVidrio(cx, cy){
  if(J.sim) return;
  let y0 = cy, y1 = cy; while(celda(cx + 0.5, y0 - 0.5) === 'V') y0--; while(celda(cx + 0.5, y1 + 1.5) === 'V') y1++;
  for(let y = y0; y <= y1; y++){ NIVEL.mapa[NIVEL.alto - 1 - y][cx] = '.';
    for(let i = 0; i < 9; i++) PART.solidas.tirar(Object.assign({x:cx + 0.5 + rv(-0.1, 0.1), y:y + rv(0, 1), z:rv(-0.4, 0.4), vx:rv(-5, 5) + HE.vx*0.5, vy:rv(-1, 5), g:24, vida:rv(0.8, 1.5), tam:rv(1, 2), apaga:false}, rgb('#b8e0ff', 1.6))); }
  NIVEL.sucio = true; if(NIVEL.vidrios) for(const v of NIVEL.vidrios) if(v.cx === cx && v.y0 <= cy && v.y1 >= cy){ v.malla.visible = false; }
  SON.fx('vidrio'); J.vidrio = 0.45; popup(cx + 0.5, cy + 2, tr('¡CRASH!'), 'azul'); J.estilo['¡CRASH!'] = (J.estilo['¡CRASH!'] || 0) + 1; J.puntos += 50*J.mult;
}

/* ---------- enemigos ---------- */
function pasoEnemigos(dt){
  const vivos = ENEM.filter(e => !e.muerto);
  for(const e of ENEM){
    e.anim += dt;
    if(e.muerto){ e.muerto += dt; e.vy -= GRAV*dt; const r = moverCaja(e, dt, e.ancho/2, 0.5); if(r.piso) e.vx *= Math.exp(-6*dt); continue; }
    if(e.tipo === 'jefe'){ pasoJefe(e, dt); continue; }
    e.golpe = Math.max(0, (e.golpe || 0) - dt);
    const ojo = {x:e.x, y:e.y + e.alto*0.85}, blanco = {x:HE.x, y:HE.y + 1.1}, d = Math.hypot(blanco.x - ojo.x, blanco.y - ojo.y);
    const delante = sig(blanco.x - e.x) === e.dir || d < 3, ve = !HE.muerto && d < e.T.rango && (delante || e.est === 'alerta') && veLinea(ojo.x, ojo.y, blanco.x, blanco.y);
    if(ve){ if(e.est === 'ronda'){ e.est = 'alerta'; SON.fx('alerta', {x:(e.x - CAMARA.x)/12}); } e.perdido = 0; e.dir = sig(blanco.x - e.x); }
    else if(e.est === 'alerta'){ e.perdido += dt; if(e.perdido > 3){ e.est = 'ronda'; e.aviso = 0; } }
    if(e.est === 'ronda'){
      if(e.ronda.pausa > 0){ e.ronda.pausa -= dt; e.vx = 0; }
      else { e.vx = e.dir*1.3; if((e.dir < 0 && e.x <= e.ronda.x0) || (e.dir > 0 && e.x >= e.ronda.x1)){ e.dir *= -1; e.ronda.pausa = rv(0.8, 2.4); } }
    } else {
      e.vx *= Math.exp(-8*dt);
      if(ve){ if(e.cd > 0) e.cd -= dt; else { e.aviso += dt/e.T.aviso; if(e.aviso >= 1){ e.aviso = 0; e.cd = e.T.cd; e.rafaga = e.T.rafaga || 1; } } }
      if(e.rafaga > 0){ e.tRaf = (e.tRaf || 0) - dt; if(e.tRaf <= 0){ enemigoTira(e); e.rafaga--; e.tRaf = 0.11; } }
    }
    e.vy -= GRAV*dt; const re = moverCaja(e, dt, e.ancho/2, e.alto); if(re.piso) cinta(e, dt, e.ancho/2, e.alto);
  }
  return vivos.length;
}
function enemigoTira(e){
  const br = e.brazo, boca = bocaDe(br), a0 = Math.atan2(HE.y + 1.0 - boca.y, HE.x - boca.x);
  for(let i = 0; i < e.T.tiros; i++){ const a = a0 + (e.T.tiros > 1 ? (i/(e.T.tiros - 1) - 0.5)*e.T.abre*2 : rv(-e.T.abre, e.T.abre));
    BALAS.push({x:boca.x, y:boca.y, vx:Math.cos(a)*e.T.bala, vy:Math.sin(a)*e.T.bala, de:'enemigo', vida:2.2, rastro:[]}); }
  flash(boca.x, boca.y, 0.6, '#ff9a50', 4, 0.07, 6); SON.fx(e.tipo === 'escopeta' ? 'escopeta' : e.tipo === 'tirador' ? 'rifle' : e.tipo === 'pesado' ? 'subfusil' : 'bala_enemiga', {x:(e.x - CAMARA.x)/12});
  PART.brillos.tirar(Object.assign({x:boca.x, y:boca.y, z:0.2, g:0, vida:0.05, tam:3}, rgb('#ffb060', 6)));
}

/* ---------- partículas con intención ---------- */
function sangre(x, y, dir, n){ for(let i = 0; i < n; i++) PART.solidas.tirar(Object.assign({x, y, z:rv(-0.3, 0.3), vx:dir*rv(1, 7) + rv(-1.5, 1.5), vy:rv(-1, 5), g:22, vida:rv(0.6, 1.4), tam:rv(1, 2.2), pega:true, apaga:false}, rgb(Math.random() < .5 ? '#b0101a' : '#7a0a12', 1.1))); }
function chispas(x, y, n){ for(let i = 0; i < n; i++) PART.brillos.tirar(Object.assign({x, y, z:0.1, vx:rv(-6, 6), vy:rv(-2, 7), g:24, vida:rv(0.1, 0.35), tam:1}, rgb('#ffd070', 5))); }
function polvo(x, y, n){ if(J.sim) return; for(let i = 0; i < n; i++) PART.solidas.tirar(Object.assign({x:x + rv(-0.3, 0.3), y:y + 0.05, z:rv(-0.3, 0.3), vx:rv(-2.5, 2.5), vy:rv(0.2, 1.5), g:2, roce:3, vida:rv(0.3, 0.6), tam:rv(1, 2)}, rgb('#8a8290', 0.7))); }
function popup(x, y, txt, grad){ J.textos.push({x, y, txt, grad:grad || 'blanco', t:1.4}); }

/* ---------- dibujar entidades (sprites, brazos que apuntan, parpadeo al ser herido) ---------- */
function acomodarHumano(m, brazos, o, hoja, anim, estado, dir, objetivos){
  const idx = hoja.indice, L = a => hoja.largo(a);
  let cuadro;
  if(o.muerto) cuadro = idx.muerto + (o.muerto > 0.25 ? 1 : 0);
  else if(estado === 'desliza') cuadro = idx.desliza;
  else if(estado === 'pared') cuadro = idx.pared;
  else if(estado === 'aire') cuadro = Math.abs(o.giro || 0) > 0.3 ? idx.bolita : o.vy > 2 ? idx.salta : idx.cae;
  else if(o.aterriza > 0) cuadro = idx.aterriza;
  else if(Math.abs(o.vx) > 0.3) cuadro = idx.camina + Math.floor(anim*9) % L('camina');
  else cuadro = idx.quieto + (Math.floor(anim*1.6) % 2);
  if(o.golpe > 0) cuadro = idx.herido;
  m.cuadro(cuadro);
  m.position.set(o.x, o.y, 0); m.scale.x = dir;
  m.rotation.z = estado === 'aire' && !o.muerto ? -(o.giro || 0) : 0;
  if(m.rotation.z){ const r = m.rotation.z, hc = (hoja.fh/2 - 1)/TX; m.position.x += Math.sin(r)*hc; m.position.y += hc - Math.cos(r)*hc; }   /* gira sobre el centro, no sobre los pies */
  const hom = hoja.hombros[cuadro], s = 1/TX;
  const hx = o.x + (hom.x - hoja.fw/2)*s*dir, hy = o.y + (hoja.fh - hom.y)*s - 1/TX;
  brazos.forEach((b, i) => {
    const vis = !o.muerto && estado !== 'desliza' || (estado === 'desliza' && i === 1);
    b.visible = vis && !(o.muerto);
    const ob = objetivos ? objetivos[i] : null;
    let a = dir > 0 ? -0.35 : Math.PI + 0.35;
    if(ob && !(ob.muerto) && ob.vivo !== false){ a = Math.atan2(ob.y + (ob.alto ? ob.alto*0.6 : -0.4) - hy, ob.x - hx); }
    const r = (o.retro ? o.retro[i] : 0)*0.2;
    b.position.set(hx + (i ? 0.02 : -0.06)*dir, hy + (i ? 0 : 0.03), i ? 0.02 : -0.02);
    const mira = Math.cos(a) >= 0 ? 1 : -1;
    b.scale.set(1, mira, 1); b.rotation.z = a + r*mira*-1;
  });
  const parpadea = o.invul > 0 && Math.floor(J.tr*20) % 2 === 0; m.visible = !parpadea || o.muerto;
}
function dibujarEntidades(dt){
  if(HE.malla){
    const ob = HE.obj.map(o => o && !o.muerto && o.vivo !== false && enPantalla(o.x, o.y) ? o : null);
    acomodarHumano(HE.malla, HE.brazos, HE, HOJAS.heroe, HE.anim += dt, HE.est, HE.dir, ob);
    HE.aterriza = Math.max(0, (HE.aterriza || 0) - dt);
    HE.retro = HE.retro.map(r => Math.max(0, r - dt*8));
    const hom = HOJAS.heroe.hombros[HE.malla.userData.cuadro];
    HE.rastroT += dt;
    if(J.ts < 0.6 && HE.est === 'aire' && !HE.muerto){ if(HE.rastroT > 0.06){ HE.rastroT = 0; HE.rastro.unshift({x:HE.malla.position.x, y:HE.malla.position.y, r:HE.malla.rotation.z, s:HE.malla.scale.x}); if(HE.rastro.length > 4) HE.rastro.pop(); } }
    else if(HE.rastroT > 0.05){ HE.rastroT = 0; HE.rastro.pop(); }
    HE.fantasmas.forEach((f, i) => { const q = HE.rastro[i]; f.visible = !!q; if(!q) return; f.position.set(q.x, q.y, -0.05 - i*0.01); f.rotation.z = q.r; f.scale.x = q.s; f.material.opacity = 0.5*(1 - i/4); });
    LUZ_HEROE.position.set(HE.x + HE.dir*0.4, HE.y + 1.4, 1.6); LUZ_HEROE.intensity = HE.muerto ? 0 : 0.9;
    pasoBufanda(dt, {x:HE.x + (hom.x - HOJAS.heroe.fw/2 - 1)/TX*HE.dir, y:HE.y + (HOJAS.heroe.fh - hom.y + 3)/TX});
  }
  for(const e of ENEM){ acomodarHumano(e.malla, [e.brazo], e, HOJAS[e.tipo], e.anim, e.muerto ? 'muerto' : Math.abs(e.vx) > 0.3 ? 'camina' : 'suelo', e.dir, e.est === 'alerta' ? [HE.muerto ? null : {x:HE.x, y:HE.y, alto:1.7}] : null);
    if(e.muerto > 6){ e.malla.visible = false; } }
  for(const o of OBJ){ if(o.giro > 0){ o.giro -= dt*2; o.malla.rotation.y = o.giro*Math.PI*4; } }
  if(MATEO){ const m = MATEO; m.t += dt; const ox = HE.x - HE.dir*1.3, oy = HE.y + 2.2 + Math.sin(m.t*2.2)*0.18;
    m.x += (ox - m.x)*(1 - Math.exp(-dt*3)); m.y += (oy - m.y)*(1 - Math.exp(-dt*3));
    m.malla.position.set(m.x, m.y, 0.4); m.malla.scale.x = HE.dir;
    const habla = m.bocadillo && m.bocadillo.t > 0 && Math.floor(m.t*8) % 2 === 0; m.malla.cuadro(habla ? 2 : Math.sin(m.t*1.7) > 0.97 ? 1 : 0);
    m.luz.position.set(m.x, m.y, 0.8); m.luz.intensity = 0.7 + Math.sin(m.t*3)*0.15; }
}
