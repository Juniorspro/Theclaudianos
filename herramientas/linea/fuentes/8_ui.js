/* ================================================================ entrada: dos palancas fijas y el botón de acción
   La izquierda camina, la derecha apunta (la mira se engancha al más cercano a donde apuntás) y pasada la
   raya de afuera pega o tira. El botón de arriba de la derecha remata, agarra o tira el arma. */
const CTRL = {mx:0, my:0, apunta:false, ax:1, ay:0, tira:false, toque:null, tec:{}};
const CAMARA = {x:0, y:0, sacude:0, lx:0, ly:0, bal:0};
const DEDOS = new Map();
const R_PALO = 24, U_TIRO = 0.55;
function centroPalo(k){ const m = R_PALO + 9; return k === 'mov' ? {x:m + 6, y:H - m} : {x:W - m - 6, y:H - m}; }
function centroAccion(){ const c = centroPalo('palo'); return {x:c.x - 4, y:c.y - R_PALO - 24, r:12}; }
function aPx(ev){ const [sx, sy] = aStage(ev.clientX, ev.clientY); return aLienzo(sx, sy); }
/* de la pantalla chica al mundo (deshace la cámara y el balanceo) */
function aMundo(x, y){ const dx = x - W/2, dy = y - H/2, c = Math.cos(-CAMARA.bal), s = Math.sin(-CAMARA.bal); return {x:CAMARA.vx + dx*c - dy*s, y:CAMARA.vy + dx*s + dy*c}; }
stage.addEventListener('pointerdown', ev => {
  SON.arrancar();
  const [x, y] = aPx(ev);
  if(J.cine){ avanzarCine(x, y); return; }
  if(uiActiva()){ uiDown(x, y); DEDOS.set(ev.pointerId, {tipo:'ui'}); return; }
  if(J.modo !== 'juego') return;
  if(Math.abs(x - W/2) < 16 && y < 22){ pausar(); return; }
  if(JUG.muerto){ if(J.muerto > 0.45) reintentar(); return; }
  const a = centroAccion(); if(Math.hypot(x - a.x, y - a.y) < a.r + 5){ hacerAccion(); DEDOS.set(ev.pointerId, {tipo:'acc'}); return; }
  const tiene = t => [...DEDOS.values()].some(d => d.tipo === t);
  for(const k of ['mov', 'palo']){ const c = centroPalo(k); if(!tiene(k) && Math.hypot(x - c.x, y - c.y) < R_PALO*2.3){ DEDOS.set(ev.pointerId, {tipo:k, x, y}); return; } }
  /* tocar a alguien lejos de las palancas: se le pega o se le tira una vez */
  const w = aMundo(x, y); let mejor = null, md = 18;
  for(const e of ENEM){ if(e.muerto) continue; const d = Math.hypot(e.x - w.x, e.y - w.y); if(d < md){ md = d; mejor = e; } }
  if(mejor) CTRL.toque = {e:mejor, t:0.22};
});
addEventListener('pointermove', ev => { const d = DEDOS.get(ev.pointerId); if(!d || (d.tipo !== 'mov' && d.tipo !== 'palo')) return; const [x, y] = aPx(ev); d.x = x; d.y = y; });
function soltarDedo(ev, cancela){
  SON.arrancar();
  const d = DEDOS.get(ev.pointerId); if(!d) return; DEDOS.delete(ev.pointerId);
  if(d.tipo === 'ui'){ if(!cancela){ const [x, y] = aPx(ev); uiUp(x, y); } else UI.presion = null; }
}
addEventListener('pointerup', ev => soltarDedo(ev, false)); addEventListener('pointercancel', ev => soltarDedo(ev, true));
addEventListener('blur', () => { DEDOS.clear(); CTRL.tec = {}; });
/* teclado, para la compu: WASD camina, flechas apuntan y pegan, E o espacio es la acción, R reintenta */
addEventListener('keydown', ev => { CTRL.tec[ev.code] = true;
  if(ev.code === 'Escape' && J.modo === 'juego' && !J.cine) pausar();
  if(J.modo === 'juego' && !J.pausa && !J.cine){ if((ev.code === 'KeyE' || ev.code === 'Space') && !ev.repeat) hacerAccion(); if(ev.code === 'KeyR' && JUG.muerto) reintentar(); } });
addEventListener('keyup', ev => { CTRL.tec[ev.code] = false; });
document.addEventListener('visibilitychange', () => { if(document.hidden && J.modo === 'juego' && !J.pausa && !J.cine && !JUG.muerto) pausar(); });
function pasoPalancas(dtR){
  let mov = false, palo = false; CTRL.tira = false;
  for(const d of DEDOS.values()){ if(d.tipo !== 'mov' && d.tipo !== 'palo') continue;
    const c = centroPalo(d.tipo); let dx = (d.x - c.x)/R_PALO, dy = (d.y - c.y)/R_PALO; const n = Math.hypot(dx, dy); if(n > 1){ dx /= n; dy /= n; }
    d.dx = dx; d.dy = dy;
    if(d.tipo === 'mov'){ mov = true; CTRL.mx = dx; CTRL.my = dy; }
    else { palo = true; const act = Math.hypot(dx, dy) > 0.22; CTRL.apunta = act; if(act){ CTRL.ax = dx; CTRL.ay = dy; CTRL.tira = Math.hypot(dx, dy) > U_TIRO; } } }
  const T = CTRL.tec, kx = (T.KeyD ? 1 : 0) - (T.KeyA ? 1 : 0), ky = (T.KeyS ? 1 : 0) - (T.KeyW ? 1 : 0);
  if(kx || ky){ mov = true; CTRL.mx = kx; CTRL.my = ky; }
  const ax = (T.ArrowRight ? 1 : 0) - (T.ArrowLeft ? 1 : 0), ay = (T.ArrowDown ? 1 : 0) - (T.ArrowUp ? 1 : 0);
  if(ax || ay){ palo = true; CTRL.apunta = true; CTRL.ax = ax; CTRL.ay = ay; CTRL.tira = true; }
  if(CTRL.toque){ const q = CTRL.toque; q.t -= dtR; if(q.t <= 0 || q.e.muerto) CTRL.toque = null;
    else { palo = true; CTRL.apunta = true; CTRL.ax = q.e.x - JUG.x; CTRL.ay = q.e.y - JUG.y; CTRL.tira = true; } }
  if(!mov){ CTRL.mx = CTRL.my = 0; } if(!palo){ CTRL.apunta = false; }
  if(window.__BOT) window.__BOT(CTRL, dtR);
}

/* ================================================================ el lazo */
let ultimo = 0;
function lazo(ts){
  requestAnimationFrame(lazo);
  const dtR = Math.min(0.05, Math.max(0, (ts - (ultimo || ts))/1000)); ultimo = ts; J.tr += dtR;
  try { paso(dtR); } catch(e){ console.error(e); }
  try { dibujar(dtR); } catch(e){ console.error(e); }
  try { SON.paso(dtR); } catch(e){}
}
function paso(dtR){
  UI.t += dtR; pasoLuego(dtR);
  POST.destello = Math.max(0, POST.destello - dtR*2.5); POST.aber = Math.max(0.15, POST.aber - dtR*5);
  if(J.cine){ pasoCine(dtR); return; }
  if(J.modo !== 'juego' || J.pausa) return;
  pasoPalancas(dtR);
  let dt = dtR; if(J.hitstop > 0){ J.hitstop -= dtR; dt = 0; }
  J.t += dt; if(!J.capLimpio && !JUG.muerto) J.reloj += dt;
  const pasos = Math.max(1, Math.ceil(dt/(1/120)));
  for(let i = 0; i < pasos; i++){ const d = dt/pasos; pasoJugador(d); if(J.modo !== 'juego') return; pasoEnemigos(d); pasoBalas(d); pasoPuertas(d); }
  pasoParticulas(dt);
  for(const c of CUERPOS) c.t += dt;
  J.comboT -= dt; if(J.comboT <= 0 && J.combo){ J.combo = 0; }
  J.avisoT = Math.max(0, J.avisoT - dtR); if(J.luz){ J.luz.t -= dtR; if(J.luz.t <= 0) J.luz = null; }
  J.fundido = Math.max(0, (J.fundido || 0) - dtR*2.2);
  if(JUG.muerto){ J.muerto += dtR; POST.rojo = Math.min(0.55, J.muerto*1.5); } else POST.rojo = Math.max(0, POST.rojo - dtR*2);
  const alertas = ENEM.filter(e => !e.muerto && e.estado === 'alerta').length;
  SON.intensidad(J.capLimpio ? 0 : lim(0.25 + alertas*0.18 + Math.min(J.combo, 6)*0.06, 0, 1));
  pasoPistas(dtR);
  /* la cámara: sigue al pibe y se asoma hacia donde apunta; con el dedo en la derecha se asoma más */
  const asoma = CTRL.apunta ? 62 : JUG.moviendo ? 26 : 0, dirA = CTRL.apunta ? Math.atan2(CTRL.ay, CTRL.ax) : JUG.angMov;
  const lx = Math.cos(dirA)*asoma, ly = Math.sin(dirA)*asoma*0.8, kk = 1 - Math.exp(-dtR*4);
  CAMARA.lx += (lx - CAMARA.lx)*kk; CAMARA.ly += (ly - CAMARA.ly)*kk;
  CAMARA.x += (JUG.x + CAMARA.lx - CAMARA.x)*(1 - Math.exp(-dtR*7)); CAMARA.y += (JUG.y + CAMARA.ly - CAMARA.y)*(1 - Math.exp(-dtR*7));
  CAMARA.sacude = Math.max(0, CAMARA.sacude - dtR*4);
}

/* ================================================================ dibujar el mundo (en el lienzo chico) */
let SOMBRA = null, SILUETA = new Map();
function silueta(img, col){ let s = SILUETA.get(img); if(s) return s; const [c, g] = lienzo(img.width, img.height); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); SILUETA.set(img, c); return c; }
const q64 = a => Math.round(a/(Math.PI/32))*(Math.PI/32);                /* 64 giros: menos titileo en los píxeles */
function dibujar(dtR){
  const g = cxM; g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  if(J.cine){ dibujarCine(g, dtR); }
  else if(J.modo === 'menu'){ fondoMenu(g); }
  else if(PISO.def){ dibujarPiso(g); }
  revelar(J.tr);
  const h = cxHUD; h.setTransform(1, 0, 0, 1, 0, 0); h.clearRect(0, 0, W, H); h.imageSmoothingEnabled = false;
  UI.botones = [];
  if(J.cine){ hudCine(h); return; }
  if(J.modo === 'juego'){ dibujarHUD(h); }
  if(uiActiva()) dibujarUI(h);
}
/* afuera: el cielo del estilo, con bandas que caminan en diagonal como un cartel de neón */
function fondoAfuera(g, E, t){
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, E.afuera[0]); gr.addColorStop(0.65, E.afuera[1]); gr.addColorStop(1, E.afuera[2]);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.07; g.fillStyle = '#ffffff';
  for(let i = -2; i < 14; i++){ const x = ((i*46 + t*18) % (W + 120)) - 60; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 16 - H*0.5, H); g.lineTo(x - H*0.5, H); g.fill(); }
  g.globalAlpha = 1;
}
function dibujarPiso(g){
  const E = PISO.estilo, t = J.tr;
  fondoAfuera(g, E, t);
  /* la cámara: sacudón, balanceo lento (el mareo de los 80) y clavada al píxel */
  const s = CAMARA.sacude, sx = s ? rv(-1, 1)*s*2.2 : 0, sy = s ? rv(-1, 1)*s*2.2 : 0;
  CAMARA.bal = AJ.balanceo && J.modo === 'juego' ? Math.sin(t*0.35)*0.035 + Math.sin(t*0.13)*0.02 : 0;
  CAMARA.vx = Math.round(CAMARA.x + sx); CAMARA.vy = Math.round(CAMARA.y + sy);
  g.translate(Math.round(W/2), Math.round(H/2)); if(CAMARA.bal) g.rotate(CAMARA.bal); g.translate(-CAMARA.vx, -CAMARA.vy);
  g.drawImage(PISO.capaSuelo, 0, 0); g.drawImage(PISO.capaDeco, 0, 0);
  const def = PISO.def;
  /* escaleras y auto */
  if(def.baja) escalera(g, def.baja, false, false);
  if(def.sube) escalera(g, def.sube, true, J.limpio);
  if(def.auto){ const [ax, ay] = def.auto; g.drawImage(ARTE.auto, ax*CEL + 4 - 20, ay*CEL + 4 - 10);
    if(J.capLimpio && Math.floor(t*3) % 2){ g.fillStyle = 'rgba(255,240,160,0.22)'; g.fillRect(ax*CEL + 4 + 18, ay*CEL + 4 - 8, 26, 16); } }
  /* los cuerpos */
  for(const c of CUERPOS){ g.save(); g.translate(Math.round(c.x), Math.round(c.y)); g.rotate(q64(c.ang)); g.drawImage(c.img, -15, -13); g.restore();
    if(c.cens) estrellitas(g, c.x, c.y - 2, t + c.x); }
  /* las armas en el piso: titilan si las podés agarrar */
  for(const it of ITEMS){ const im = ARTE.arma[it.k]; g.save(); g.translate(Math.round(it.x), Math.round(it.y)); g.rotate(q64(it.ang));
    if(!it.vuela && Math.hypot(it.x - JUG.x, it.y - JUG.y) < 60){ g.globalAlpha = 0.45 + Math.sin(t*9)*0.35; const s2 = silueta(im, '#ffffff'); for(const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(s2, -im.width/2 + ox, -im.height/2 + oy); g.globalAlpha = 1; }
    g.drawImage(im, -Math.round(im.width/2), -Math.round(im.height/2)); g.restore(); }
  /* la gente: sombra, piernas, torso, arma y cabeza */
  if(!SOMBRA){ const [c, gs] = lienzo(16, 14); elipse(gs, 8, 7, 7, 6, 'rgba(0,0,0,0.32)'); SOMBRA = c; }
  for(const e of ENEM){ if(e.muerto) continue; g.drawImage(SOMBRA, Math.round(e.x) - 6, Math.round(e.y) - 5);
    if(e.derribado > 0){ if(!e.imgCaido) e.imgCaido = hacerCadaver(e.T.ropa, e.T.cabeza || 'pelo', 'golpe', Math.floor(e.x*3 + e.y));
      g.save(); g.translate(Math.round(e.x), Math.round(e.y)); g.rotate(q64(e.caeAng || 0)); g.drawImage(e.imgCaido, -15, -13); g.restore(); estrellitas(g, e.x, e.y - 3, t*1.4 + e.x); continue; }
    if(e.T.perro){ const fr = e.moviendo ? Math.floor(e.anim*12) % 4 : 0; g.save(); g.translate(Math.round(e.x), Math.round(e.y)); g.rotate(q64(e.ang)); g.drawImage(ARTE.perro[fr], -12, -8); g.restore(); continue; }
    persona(g, e.x, e.y, e.ang, e.ang, e.T.ropa, e.T.cabeza, e.arma, e.moviendo ? 1 + Math.floor(e.anim*8) % 4 : 0, e.golpeT, e.lado || 1);
    /* el aviso de que te vio: un signo que late arriba */
    if(e.estado === 'alerta' && e.reac < 0.5 && !JUG.muerto){ texto(g, '!', e.x, e.y - 20, 'rojo'); } }
  if(!JUG.muerto){ g.drawImage(SOMBRA, Math.round(JUG.x) - 6, Math.round(JUG.y) - 5);
    if(JUG.invul <= 0 || Math.floor(t*14) % 2) persona(g, JUG.x, JUG.y, JUG.moviendo ? JUG.angMov : JUG.ang, JUG.ang, 'pibe', JUG.mascara, JUG.arma, JUG.moviendo ? 1 + Math.floor(JUG.anim) % 4 : 0, JUG.golpeT, JUG.lado || 1); }
  else if(JUG.cuerpo){ g.save(); g.translate(Math.round(JUG.x), Math.round(JUG.y)); g.rotate(q64(JUG.cuerpoAng || 0)); g.drawImage(JUG.cuerpo, -15, -13); g.restore(); if(AJ.censura) estrellitas(g, JUG.x, JUG.y - 3, t*1.4); }
  /* balas */
  for(const b of BALAS){ linea(g, b.px, b.py, b.x, b.y, b.de === 'jug' ? '#fff6b0' : '#ffa050', 1); px(g, b.x, b.y, '#ffffff'); }
  /* partículas */
  for(const p of PARTS){ g.fillStyle = p.col; const s2 = Math.max(1, Math.round(p.tam)); g.fillRect(Math.round(p.x), Math.round(p.y), s2, s2); }
  /* lo alto: paredes y muebles */
  g.drawImage(PISO.capaAlto, 0, 0);
  /* vidrios sanos */
  for(const [x, y] of PISO.vidrios){ if(PISO.rotos.has(x + ',' + y)) continue; g.fillStyle = 'rgba(150,225,255,0.55)'; g.fillRect(x*CEL, y*CEL, CEL, CEL);
    g.fillStyle = 'rgba(255,255,255,0.7)'; const hz = PISO.mapa[y][x - 1] === 'v' || PISO.mapa[y][x + 1] === 'v' || PISO.mapa[y][x - 1] === '#' && PISO.mapa[y][x + 1] === '#';
    if(hz) g.fillRect(x*CEL, y*CEL + 3, CEL, 1); else g.fillRect(x*CEL + 3, y*CEL, 1, CEL);
    if((x + y + Math.floor(t*0.7)) % 7 === 0){ g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x*CEL + 1, y*CEL + 1, 2, 2); } }
  /* las puertas */
  for(const p of PISO.puertas){ const q = puntaPuerta(p); linea(g, p.hx, p.hy, q.x, q.y, '#1a0e0a', 3); linea(g, p.hx, p.hy, q.x, q.y, Math.abs(p.vel) > 5 ? '#ffd890' : '#b07a44', 1); px(g, p.hx, p.hy, '#e8d8a0'); }
  /* el fogonazo alumbra */
  if(J.luz){ g.globalCompositeOperation = 'lighter'; const r = 46, gr = g.createRadialGradient(J.luz.x, J.luz.y, 0, J.luz.x, J.luz.y, r);
    gr.addColorStop(0, 'rgba(255,220,140,' + (J.luz.t*6).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gr; g.fillRect(J.luz.x - r, J.luz.y - r, r*2, r*2); g.globalCompositeOperation = 'source-over'; }
  /* los carteles de puntos */
  for(const tx of J.textos){ const k = lim(tx.t/0.3, 0, 1); g.globalAlpha = k; textoOnda(g, tx.txt, tx.x, tx.y, tx.grad, 1, 1.2, t*8); g.globalAlpha = 1; }
  g.setTransform(1, 0, 0, 1, 0, 0);
  if(J.fundido > 0){ g.fillStyle = 'rgba(8,2,14,' + J.fundido.toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
}
function persona(g, x, y, angP, ang, ropa, cabeza, arma, fr, golpeT, lado){
  const X = Math.round(x), Y = Math.round(y), A = arma && ARMAS[arma];
  g.save(); g.translate(X, Y); g.rotate(q64(angP)); g.drawImage(ARTE.piernas[ropa][fr], -10, -10); g.restore();
  g.save(); g.translate(X, Y); g.rotate(q64(ang));
  const pose = !A ? (golpeT > 0 ? 'golpe' : 'puno') : (arma === 'escopeta' || arma === 'fusil') ? 'dos' : 'uno';
  if(pose === 'golpe' && lado < 0) g.scale(1, -1);
  g.drawImage(ARTE.torso[ropa][pose], -11, -12);
  if(A){ const im = ARTE.arma[arma], hx = pose === 'dos' ? 7 : 6, hy = pose === 'dos' ? 1 : 3.5;
    let ga = 0; if(A.melee) ga = golpeT > 0 ? lerp(-1.5, 1.2, 1 - golpeT/0.2)*lado : -0.6;
    g.save(); g.translate(hx, hy); g.rotate(ga); g.drawImage(im, -2, -4); g.restore(); }
  g.drawImage(ARTE.cabeza[cabeza] || ARTE.cabeza.pelo, -7, -7);
  g.restore();
}
function estrellitas(g, x, y, t){ for(let i = 0; i < 3; i++){ const a = t*3 + i*2.09, sx = Math.round(x + Math.cos(a)*6), sy = Math.round(y + Math.sin(a)*2.5);
  g.fillStyle = '#ffe04a'; g.fillRect(sx, sy, 1, 1); g.fillRect(sx - 1, sy, 3, 1); g.fillRect(sx, sy - 1, 1, 3); } }
function escalera(g, q, sube, lista){
  const x = q[0]*CEL + 4, y = q[1]*CEL + 4;
  g.fillStyle = K; g.fillRect(x - 8, y - 8, 16, 16);
  for(let i = 0; i < 5; i++){ g.fillStyle = sube ? (i % 2 ? '#6a5a7a' : '#8a7a9a') : (i % 2 ? '#3a3040' : '#4a4050'); g.fillRect(x - 7, y - 7 + i*3, 14, 3); }
  if(lista){ const k = 0.5 + Math.sin(J.tr*6)*0.5; g.fillStyle = 'rgba(90,255,220,' + (0.25 + k*0.35).toFixed(2) + ')'; g.fillRect(x - 8, y - 8, 16, 16); }
}
/* un texto que ondula letra por letra (los carteles de los 80) */
function textoOnda(g, str, x, y, grad, esc, amp, fase){
  const c = lienzoTexto(str, grad), e = esc || 1, w = c.width*e, x0 = Math.round(x - w/2);
  for(let i = 0; i < c.width; i += 6){ const dy = Math.round(Math.sin(fase + i*0.09)*(amp || 1)*e);
    g.drawImage(c, i, 0, Math.min(6, c.width - i), c.height, x0 + i*e, Math.round(y) + dy, Math.min(6, c.width - i)*e, c.height*e); }
  return w;
}

/* ================================================================ el HUD */
function dibujarHUD(g){
  const t = J.tr;
  /* puntos arriba a la izquierda, grandes y ondulando */
  const sp = String(J.puntos) + tr('PTS');
  textoOnda(g, sp, 8 + lienzoTexto(sp, 'rosa').width, 6, 'rosa', 2, 1, t*3);
  if(J.combo > 1){ const cs = tr('{0}× COMBO', J.combo); textoOnda(g, cs, 8 + lienzoTexto(cs, 'cian').width/2, 26, 'cian', 1, 1.5, t*6);
    g.fillStyle = K; g.fillRect(8, 38, 52, 3); g.fillStyle = '#5ae8ff'; g.fillRect(8, 38, Math.round(52*lim(J.comboT/3.2, 0, 1)), 3); }
  /* el arma y las balas arriba a la derecha */
  const A = JUG.arma && ARMAS[JUG.arma], nom = A ? tr(A.nombre) : tr('MANOS');
  texto(g, nom, W - 8, 6, 'blanco', {der:true});
  if(A && !A.melee) texto(g, tr('{0} BALAS', JUG.balas), W - 8, 16, JUG.balas ? 'oro' : 'rojo', {der:true});
  /* el Patrón: nombre y lo que le queda */
  const jefe = ENEM.find(e => e.T.jefe && !e.muerto);
  if(jefe && (jefe.estado === 'alerta' || jefe.vida < jefe.T.vida)){ texto(g, tr('EL PATRÓN'), W/2, 20, 'rojo');
    for(let i = 0; i < jefe.T.vida; i++){ const x = Math.round(W/2 - jefe.T.vida*5 + i*10); rect(g, x, 32, 8, 4, K); rect(g, x + 1, 33, 6, 2, i < jefe.vida ? '#ff3a5a' : '#3a1a24'); } }
  /* pausa */
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(W/2 - 9, 3, 18, 14); g.fillStyle = '#f0e6ff'; g.fillRect(W/2 - 4, 6, 3, 8); g.fillRect(W/2 + 1, 6, 3, 8);
  /* cuántos quedan, y la flecha a la escalera o al auto */
  const vivos = ENEM.filter(e => !e.muerto);
  if(!J.limpio && vivos.length <= 2) for(const e of vivos) flechaBorde(g, e.x, e.y, '#ff3a5a', false);
  if(J.limpio){ const def = PISO.def, obj = J.capLimpio ? (def.auto || def.baja) : (def.sube || def.baja);
    if(obj) flechaBorde(g, obj[0]*CEL + 4, obj[1]*CEL + 4, J.capLimpio ? '#ffd84a' : '#5affdc', true); }
  /* el aviso */
  if(J.avisoT > 0 && J.aviso){ g.globalAlpha = lim(J.avisoT*3, 0, 1); textoOnda(g, J.aviso, W/2, Math.round(H*0.2), 'oro', 2, 1.5, t*5); g.globalAlpha = 1; }
  pintarPista(g);
  /* las palancas y el botón */
  if(!JUG.muerto) palancas(g);
  /* muerto */
  if(JUG.muerto){ const k = lim(J.muerto*2, 0, 1); g.globalAlpha = k;
    textoOnda(g, tr('ESTÁS MUERTO'), W/2, Math.round(H*0.34), 'rojo', 3, 1.4, t*4);
    if(J.muerto > 0.45 && Math.floor(t*2) % 2 === 0) textoOnda(g, tr('TOCÁ PARA REINTENTAR'), W/2, Math.round(H*0.34) + 34, 'blanco', 1, 1, t*4);
    g.globalAlpha = 1; }
}
function flechaBorde(g, wx, wy, col, grande){
  /* del mundo a la pantalla */
  const dx = wx - CAMARA.vx, dy = wy - CAMARA.vy, c = Math.cos(CAMARA.bal), s = Math.sin(CAMARA.bal);
  let sx = W/2 + dx*c - dy*s, sy = H/2 + dx*s + dy*c; const m = 14, dentro = sx > m && sx < W - m && sy > m + 20 && sy < H - m;
  if(dentro){ if(!grande) return; const b = Math.round(Math.sin(J.tr*7)*2); triangulo(g, sx, sy - 14 + b, Math.PI/2, col, 6); return; }
  const a = Math.atan2(sy - H/2, sx - W/2); sx = lim(sx, m, W - m); sy = lim(sy, m + 20, H - m);
  triangulo(g, sx, sy, a, col, grande ? 6 : 4);
}
function triangulo(g, x, y, a, col, r){ g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(a);
  g.fillStyle = K; g.beginPath(); g.moveTo(r + 2, 0); g.lineTo(-r - 1, -r - 1); g.lineTo(-r*0.4, 0); g.lineTo(-r - 1, r + 1); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.moveTo(r, 0); g.lineTo(-r + 1, -r + 1); g.lineTo(-r*0.4 + 1, 0); g.lineTo(-r + 1, r - 1); g.closePath(); g.fill(); g.restore(); }
function anillo(g, x, y, r, col){ g.fillStyle = col; for(let a = 0; a < 6.283; a += 1/r){ g.fillRect(Math.round(x + Math.cos(a)*r), Math.round(y + Math.sin(a)*r), 1, 1); } }
function palancas(g){
  for(const k of ['mov', 'palo']){ const c = centroPalo(k), d = [...DEDOS.values()].find(q => q.tipo === k);
    g.globalAlpha = d ? 0.9 : 0.55;
    g.fillStyle = 'rgba(10,4,20,0.45)'; g.beginPath(); g.arc(c.x, c.y, R_PALO, 0, 6.283); g.fill();
    anillo(g, c.x, c.y, R_PALO, k === 'mov' ? '#5ae8ff' : '#ff5ad8');
    if(k === 'palo'){ g.globalAlpha *= 0.5; anillo(g, c.x, c.y, Math.round(R_PALO*U_TIRO), '#ff5ad8'); g.globalAlpha = d ? 0.9 : 0.55; }
    const kx = c.x + (d && d.dx ? d.dx*R_PALO*0.8 : 0), ky = c.y + (d && d.dy ? d.dy*R_PALO*0.8 : 0);
    disco(g, kx, ky, 9, K); disco(g, kx, ky, 8, k === 'mov' ? '#2a8aa8' : '#a82a88'); disco(g, kx - 2, ky - 2, 4, k === 'mov' ? '#6ae0ff' : '#ff7ae0');
    if(k === 'palo'){ rect(g, kx - 1, ky - 5, 2, 3, '#ffffff'); rect(g, kx - 1, ky + 3, 2, 3, '#ffffff'); rect(g, kx - 5, ky - 1, 3, 2, '#ffffff'); rect(g, kx + 3, ky - 1, 3, 2, '#ffffff'); }
    g.globalAlpha = 1; }
  const a = centroAccion(), acc = accionDisponible(), lab = acc ? {rematar:tr(AJ.censura ? 'ATAR' : 'REMATAR'), agarrar:tr('AGARRAR'), tirar:tr('TIRAR')}[acc.k] : '';
  g.globalAlpha = acc ? 0.95 : 0.35;
  disco(g, a.x, a.y, a.r + 1, K); disco(g, a.x, a.y, a.r, acc && acc.k === 'rematar' ? '#c81a4a' : '#3a2a5a'); disco(g, a.x - 2, a.y - 3, a.r - 5, acc && acc.k === 'rematar' ? '#ff4a7a' : '#5a4a8a');
  if(acc && acc.k === 'rematar' && Math.floor(J.tr*6) % 2) anillo(g, a.x, a.y, a.r + 3, '#ff5a8a');
  g.globalAlpha = 1;
  if(lab) texto(g, lab, a.x, a.y - a.r - 12, acc.k === 'rematar' ? 'rosa' : 'blanco');
}

/* ================================================================ el tutorial del prólogo: se cumple haciendo la cosa */
const PISTAS = [
  {txt:'PALANCA IZQUIERDA: CAMINÁ', hecho:() => J.pisteo.anda > 40},
  {txt:'DERECHA: APUNTÁ. HASTA EL FONDO: PIÑA', hecho:() => J.pisteo.pego},
  {txt:'LA PIÑA VOLTEA. ¡REMATALO CON EL BOTÓN!', hecho:() => J.pisteo.remate || J.bajas >= 2},
  {txt:'AGARRÁ UN ARMA DEL PISO CON EL BOTÓN', hecho:() => !!JUG.arma},
  {txt:'ABRÍ LAS PUERTAS DE GOLPE: VOLTEAN', hecho:() => J.bajas >= 3},
  {txt:'LIMPIÁ LA CASA Y VOLVÉ AL AUTO', hecho:() => J.capLimpio}
];
function pasoPistas(dtR){
  if(!J.cap || !J.cap.tutorial || J.pista >= PISTAS.length) return;
  const P2 = J.pisteo; P2.t += dtR; P2.anda += Math.hypot(JUG.vx, JUG.vy)*dtR; if(JUG.golpeT > 0 || JUG.cd > 0.1) P2.pego = true; if(JUG.remate) P2.remate = true;
  if(PISTAS[J.pista].hecho() || P2.t > 16){ J.pista++; P2.t = 0; if(J.pista < PISTAS.length) SON.fx('pagina'); }
}
function pintarPista(g){
  if(!J.cap || !J.cap.tutorial || J.pista >= PISTAS.length) return;
  const s = tr(PISTAS[J.pista].txt), w = lienzoTexto(s, 'blanco').width + 14, x = Math.round(W/2 - w/2), y = 22;
  g.fillStyle = 'rgba(10,4,20,0.78)'; g.fillRect(x, y, w, 15); g.fillStyle = '#ff5ad8'; g.fillRect(x, y, 2, 15); g.fillRect(x + w - 2, y, 2, 15);
  texto(g, s, W/2, y + 2, 'blanco');
}
