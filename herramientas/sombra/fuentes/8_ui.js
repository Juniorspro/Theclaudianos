/* ================================================================ entrada: se apoya el dedo en cualquier lado, se tira para atrás y se suelta */
const CAM = {y:0, objY:0};
function aPx(ev){ const [sx, sy] = aStage(ev.clientX, ev.clientY); return aLienzo(sx, sy); }
let DEDO = null;
stage.addEventListener('pointerdown', ev => {
  SON.arrancar(); const [x, y] = aPx(ev);
  if(uiActiva()){ uiDown(x, y); DEDO = {id:ev.pointerId, ui:true}; return; }
  if(J.modo !== 'juego') return;
  if(x > W - 30 && y < 22){ pausar(); return; }
  if(DEDO || !puedeSaltar() || J.fin) return;
  DEDO = {id:ev.pointerId, x0:x, y0:y, x, y}; J.apunta = DEDO; SON.fx('lento_entra', {vol:0.4});
});
addEventListener('pointermove', ev => { if(!DEDO || DEDO.id !== ev.pointerId || DEDO.ui) return; const [x, y] = aPx(ev); DEDO.x = x; DEDO.y = y; });
function soltarDedo(ev, cancela){
  SON.arrancar(); if(!DEDO || DEDO.id !== ev.pointerId) return; const d = DEDO; DEDO = null;
  if(d.ui){ if(!cancela){ const [x, y] = aPx(ev); uiUp(x, y); } else UI.presion = null; return; }
  J.apunta = null; if(cancela || J.modo !== 'juego' || J.pausa) return;
  if(!saltar(d.x - d.x0, d.y - d.y0)) SON.fx('lento_sale', {vol:0.3});
}
addEventListener('pointerup', ev => soltarDedo(ev, false)); addEventListener('pointercancel', ev => soltarDedo(ev, true));
addEventListener('blur', () => { DEDO = null; J.apunta = null; });
addEventListener('keydown', ev => { if(ev.code === 'Escape' && J.modo === 'juego') pausar(); });
document.addEventListener('visibilitychange', () => { if(document.hidden && J.modo === 'juego' && !J.pausa && NIN.est !== 'muerto') pausar(); });

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
  POST.destello = Math.max(0, POST.destello - dtR*2.5); POST.aber = Math.max(0.1, POST.aber - dtR*5); J.sacude = Math.max(0, J.sacude - dtR*3);
  if(J.modo === 'menu'){ pasoFondoMenu(dtR); return; }
  if(J.modo !== 'juego' || J.pausa) return;
  /* la cámara lenta: apuntando se frena el tiempo, en el aire mucho más */
  const lento = NJ().lento || 1;
  J.tsObj = NIN.est === 'muerto' ? 0.3 : J.apunta && puedeSaltar() ? (NIN.est === 'aire' ? 0.1 : 0.3)*lento : 1;
  J.ts += (J.tsObj - J.ts)*(1 - Math.exp(-dtR*(J.tsObj < J.ts ? 18 : 7)));
  SON.lento(lim((1 - J.ts)*1.2, 0, 1));
  POST.satur = lerp(1.15, 0.55, lim((1 - J.ts)*1.3, 0, 1)); POST.vin = lerp(0.3, 0.62, lim(1 - J.ts, 0, 1)); POST.aber = Math.max(POST.aber, (1 - J.ts)*0.8);
  let dt = dtR*J.ts; if(J.hitstop > 0){ J.hitstop -= dtR; dt = 0; }
  if(J.muerto) J.muerto += dtR;
  J.fundido = Math.max(0, J.fundido - dtR*2.5); if(J.tajo){ J.tajo.t -= dtR; if(J.tajo.t <= 0) J.tajo = null; }
  pasoJuego(dt, dtR);
  /* la cámara: el ninja un poco abajo del medio, así se ve más para arriba */
  CAM.objY = Math.min(NIN.y - H*0.6, CEL - H*0.86); const k = NIN.est === 'aire' ? 5 : 3.2; CAM.y += (CAM.objY - CAM.y)*(1 - Math.exp(-dtR*k));
  SON.intensidad(J.infinito ? lim(J.alturaMax/600, 0.15, 1) : lim(0.35 + J.combo*0.1, 0, 1));
}

/* ================================================================ dibujar */
const BLOQUES = new Map(), FB = 16;                                      /* la torre se hornea de a 16 filas */
function bloque(b, E){
  let c = BLOQUES.get(b);
  if(c && c.ver === MAPA.ver && c.ef === E.nombre && c.gen === MAPA.gen) return c.cv;
  if(!c){ if(BLOQUES.size > 60) BLOQUES.clear(); const [cv] = lienzo(ANCHO, FB*CEL); c = {cv}; BLOQUES.set(b, c); }
  c.ver = MAPA.ver; c.ef = E.nombre; c.gen = MAPA.gen;
  const g = c.cv.getContext('2d'); g.clearRect(0, 0, ANCHO, FB*CEL);
  for(let k = 0; k < FB; k++){ const r = b*FB + k; for(let cc = 0; cc < COLS; cc++){ const t = tile(cc, r); if(t === T_AIRE) continue; pintarTile(g, cc*CEL, k*CEL, cc, r, t, E); } }
  return c.cv;
}
const dura = t => t === T_PIEDRA || t === T_DESM;
function pintarTile(g, x, y, c, r, t, E){
  const h = (c*73 + r*151) & 255;
  if(t === T_PINCHO){ /* los pinchos miran para el lado contrario a la piedra que los sostiene */
    const ab = dura(tile(c, r + 1)), ar = dura(tile(c, r - 1)), iz = dura(tile(c - 1, r)), de = dura(tile(c + 1, r));
    const dir = ab ? 'u' : ar ? 'd' : iz ? 'r' : de ? 'l' : 'u';
    g.fillStyle = E.torre; if(dir === 'u') g.fillRect(x, y + 6, 8, 2); else if(dir === 'd') g.fillRect(x, y, 8, 2); else if(dir === 'r') g.fillRect(x, y, 2, 8); else g.fillRect(x + 6, y, 2, 8);
    for(let i = 0; i < 2; i++) for(let k = 0; k < 4; k++){ const w = 4 - k;
      if(dir === 'u'){ g.fillStyle = k ? '#f0e4e8' : '#b098a8'; g.fillRect(x + i*4 + (4 - w)/2, y + 6 - k*1.5 - 1.5, w, 1.5); }
      else if(dir === 'd'){ g.fillStyle = k ? '#f0e4e8' : '#b098a8'; g.fillRect(x + i*4 + (4 - w)/2, y + 2 + k*1.5, w, 1.5); }
      else if(dir === 'r'){ g.fillStyle = k ? '#f0e4e8' : '#b098a8'; g.fillRect(x + 2 + k*1.5, y + i*4 + (4 - w)/2, 1.5, w); }
      else { g.fillStyle = k ? '#f0e4e8' : '#b098a8'; g.fillRect(x + 6 - k*1.5 - 1.5, y + i*4 + (4 - w)/2, 1.5, w); } }
    return; }
  g.fillStyle = E.torre; g.fillRect(x, y, 8, 8);
  if(h < 40){ g.fillStyle = tono(E.torre, 1.18); g.fillRect(x + (h & 7), y + ((h >> 3) & 7), 1, 1); }
  const arriba = !dura(tile(c, r - 1)) && tile(c, r - 1) !== T_PINCHO, izq = !dura(tile(c - 1, r)), der = !dura(tile(c + 1, r)), abajo = !dura(tile(c, r + 1));
  if(arriba){ g.fillStyle = E.luzBorde; g.fillRect(x, y, 8, 1); g.fillStyle = E.borde; g.fillRect(x, y + 1, 8, 1); }
  if(izq){ g.fillStyle = E.borde; g.fillRect(x, y, 1, 8); }
  if(der){ g.fillStyle = tono(E.torre, 0.7); g.fillRect(x + 7, y, 1, 8); }
  if(abajo){ g.fillStyle = tono(E.torre, 0.6); g.fillRect(x, y + 7, 8, 1); }
  if(t === T_DESM){ g.fillStyle = E.luzBorde; g.fillRect(x + 2, y + 2, 1, 1); g.fillRect(x + 3, y + 3, 1, 2); g.fillRect(x + 5, y + 4, 1, 1); g.fillRect(x + 4, y + 5, 2, 1); }
}
function dibujar(dtR){
  const g = cxM; g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  const E = efecto(); hornearFondo(E, W, H);
  if(J.modo === 'menu') dibujarMundo(g, E, true); else dibujarMundo(g, E, false);
  POST.tint = E.tint;
  revelar(J.tr);
  const h = cxHUD; h.setTransform(1, 0, 0, 1, 0, 0); h.clearRect(0, 0, W, H); h.imageSmoothingEnabled = false; UI.botones = [];
  if(J.modo === 'juego') dibujarHUD(h, E);
  if(uiActiva()) dibujarUI(h);
}
function dibujarMundo(g, E, menu){
  const OX = Math.floor((W - ANCHO)/2), s = J.sacude, sx = s ? Math.round(rv(-1, 1)*s*2) : 0, sy = s ? Math.round(rv(-1, 1)*s*2) : 0, cy = Math.round(CAM.y) + sy;
  /* el cielo, el sol, los montes que se hunden a medida que se sube, nubes y cañas */
  g.drawImage(FONDO.cielo, 0, 0);
  const sube = Math.max(0, -CAM.y - 0);
  const solY = Math.round(H*0.34 + sube*0.03); g.fillStyle = E.sol; g.beginPath(); g.arc(W/2 + 30, solY, 26, 0, 6.283); g.fill();
  if(E.luna){ g.fillStyle = E.cielo[0]; g.beginPath(); g.arc(W/2 + 38, solY - 5, 22, 0, 6.283); g.fill(); }
  else if(!E.rayas) for(let i = 0; i < 4; i++){ g.fillStyle = E.cielo[2]; g.fillRect(W/2 + 4, solY + 6 + i*5, 54, 1 + (i >> 1)); }
  else for(let i = 0; i < 6; i++){ g.fillStyle = E.cielo[1]; g.fillRect(W/2 + 4, solY + 2 + i*4, 54, 1 + (i >> 1)); }
  for(let k = 0; k < 2; k++){ const m = FONDO.montes[k], y = Math.round(H - m.height + sube*(k ? 0.12 : 0.06)), x = -Math.round((J.tr*(k ? 3 : 1.5)) % W); if(y < H) { g.drawImage(m, x, y); g.drawImage(m, x + m.width, y); } }
  /* nubes que pasan mientras se sube (dan la sensación de altura) */
  g.fillStyle = 'rgba(255,255,255,0.18)'; for(let i = 0; i < 7; i++){ const yy = ((i*97 - CAM.y*0.25) % (H + 60) + H + 60) % (H + 60) - 30, xx = ((i*53 + J.tr*(4 + i)) % (W + 80)) - 40; g.fillRect(Math.round(xx), Math.round(yy), 34 + i*5, 3); g.fillRect(Math.round(xx) + 8, Math.round(yy) - 2, 18, 2); }
  /* cañas de bambú atrás, más lentas que la torre */
  g.fillStyle = tono(E.montes[1], 0.85); g.globalAlpha = 0.2;
  for(let i = 0; i < 9; i++){ const x = OX + 10 + i*19 + (i % 2)*5, off = ((-CAM.y*0.5) % 26 + 26) % 26; g.fillRect(x, 0, 3, H); for(let y = -26 + off + i*3; y < H; y += 26) g.fillRect(x - 1, Math.round(y), 5, 1); }
  g.globalAlpha = 1;
  /* los costados de afuera de la torre (en pantallas más anchas) */
  if(OX > 0){ g.fillStyle = E.torre; g.fillRect(0, 0, OX, H); g.fillRect(OX + ANCHO, 0, W - OX - ANCHO, H); }
  g.save(); g.translate(OX + sx, -cy);
  /* la torre */
  const b0 = Math.floor(cy/CEL/FB) - 1, b1 = Math.floor((cy + H)/CEL/FB) + 1;
  for(let b = b0; b <= b1; b++){ g.drawImage(bloque(b, E), 0, b*FB*CEL); }
  /* piedras que tiemblan antes de caerse */
  for(const q of MAPA.desm.values()){ g.fillStyle = E.torre; g.fillRect(q.c*CEL + Math.round(rv(-1, 1)), q.r*CEL, 8, 8); g.fillStyle = E.luzBorde; g.fillRect(q.c*CEL + 2, q.r*CEL + 3, 4, 1); }
  /* las manchas de tinta pegadas */
  for(const m of MANCHAS){ g.fillStyle = m.col; g.fillRect(m.x - (m.r >> 1), m.y - (m.r >> 1), m.r, m.r); }
  /* el torii de la meta */
  if(MAPA.meta){ const y = MAPA.meta.y, c = E.acento === '#ffffff' ? '#e8384a' : '#c8283a';
    g.fillStyle = c; g.fillRect(40, y - 26, 96, 5); g.fillRect(34, y - 29, 108, 3); g.fillRect(46, y - 16, 84, 3); g.fillRect(52, y - 21, 5, 28); g.fillRect(119, y - 21, 5, 28);
    g.fillStyle = tono(c, 0.6); g.fillRect(52, y - 21, 2, 28); g.fillRect(119, y - 21, 2, 28);
    const k = 0.4 + Math.sin(J.tr*3)*0.2; g.fillStyle = 'rgba(255,240,180,' + k.toFixed(2) + ')'; g.fillRect(57, y - 13, 62, 20); }
  /* plataformas que van y vienen */
  for(const p of MAPA.plats){ g.fillStyle = tono(E.torre, 1.1); g.fillRect(Math.round(p.x), p.y, p.w, p.h); g.fillStyle = E.luzBorde; g.fillRect(Math.round(p.x), p.y, p.w, 1);
    g.fillStyle = E.borde; for(let x = 3; x < p.w; x += 6) g.fillRect(Math.round(p.x) + x, p.y + 2, 1, 2); }
  /* monedas que giran */
  /* las monedas: redondas, con agujero cuadrado como las de antes, girando */
  for(const m of MONEDAS){ const k = Math.abs(Math.cos(m.t*3)), w = Math.max(0.6, k*3), x = Math.round(m.x), y = Math.round(m.y + Math.sin(m.t*3)*1.2);
    g.fillStyle = '#7a4a06'; g.fillRect(Math.round(x - w) - 1, y - 2, Math.round(w*2) + 2, 5); g.fillRect(Math.round(x - w), y - 3, Math.round(w*2), 7);
    g.fillStyle = '#ffc830'; g.fillRect(Math.round(x - w) + 0, y - 2, Math.max(1, Math.round(w*2)), 5); if(w > 1.5){ g.fillStyle = '#fff4a0'; g.fillRect(Math.round(x - w), y - 2, 1, 2); g.fillStyle = '#7a4a06'; g.fillRect(x, y, 1, 1); } }
  /* enemigos, láseres y lo que tiran */
  for(const e of ENEM){ if(e.muerto) continue; if(e.t === 'tirador' && e.carga > 0){ const k = lim(e.carga/1.05, 0, 1), L = 170;
      g.globalAlpha = 0.25 + k*0.65; linea(g, e.x, e.y - 3, e.x + Math.cos(e.apunta)*L, e.y - 3 + Math.sin(e.apunta)*L, k > 0.76 ? '#ffffff' : '#ff2a3a', 1); g.globalAlpha = 1; }
    dibujarEnemigo(g, e, E, J.tr);
    if(e.carga > 0 && e.t !== 'tirador' && Math.floor(J.tr*14) % 2) texto(g, '!', e.x, e.y - 24, 'rojo'); }
  for(const b of BALAS){ if(b.t === 'shuriken'){ const a = b.giro || 0; for(let i = 0; i < 4; i++){ const q = a + i*1.5708; px(g, b.x + Math.cos(q)*2, b.y + Math.sin(q)*2, '#e8e8f0'); } px(g, b.x, b.y, E.silueta); }
    else { linea(g, b.x - b.vx*0.012, b.y - b.vy*0.012, b.x, b.y, '#fff0a0', 1); } }
  /* el ninja, con su estela y su bufanda */
  const N = NJ(), ex = {bufanda:NIN.bufanda, colBuf:N.colBuf, accesorio:N.accesorio, colOjo:N.colOjo, colHoja:N.colHoja};
  if(NIN.est !== 'muerto'){
    for(const e of NIN.estela){ g.globalAlpha = e.t*0.9; dibujarNinja(g, e.x, e.y, 'bola', e.dir, e.giro, {silueta:N.colBuf, acento:E.acento}, null); } g.globalAlpha = 1;
    if(!(NIN.invul > 0 && Math.floor(J.tr*12) % 2)){
      const pose = NIN.est === 'aire' ? (NIN.tAire < 0.42 ? 'bola' : 'salto') : J.apunta ? 'apunta' : NIN.ny === -1 ? 'pie' : NIN.ny === 1 ? 'techo' : 'pared';
      /* pegado a una pared: la figura se para derecha y mira para afuera */
      const giro = NIN.est === 'aire' ? NIN.giro : 0, dir = NIN.est === 'pegado' && NIN.nx ? NIN.nx : NIN.dir;
      dibujarNinja(g, NIN.x, NIN.y, pose, dir, giro, E, ex);
      /* los saltos que le quedan en el aire, como puntitos arriba de la cabeza */
      if(NIN.est === 'aire') for(let i = 0; i < NIN.dj; i++) px(g, NIN.x - 1 + i*3, NIN.y - 9, '#ffffff'); } }
  /* el tajo cuando mata */
  if(J.tajo){ const t = J.tajo, L = 12*(1 + (0.18 - t.t)*6); g.globalAlpha = t.t/0.18; linea(g, t.x - Math.cos(t.a)*L, t.y - Math.sin(t.a)*L, t.x + Math.cos(t.a)*L, t.y + Math.sin(t.a)*L, '#ffffff', 2); g.globalAlpha = 1; }
  /* partículas */
  for(const p of PARTS){ g.fillStyle = p.col; const s2 = Math.max(1, Math.round(p.tam)); g.fillRect(Math.round(p.x), Math.round(p.y), s2, s2); }
  /* la trayectoria mientras se apunta */
  if(J.apunta && J.modo === 'juego') trayectoria(g);
  /* la tinta que sube */
  if(J.tinta){ const T = J.tinta, y0 = Math.round(T.y);
    if(y0 < cy + H + 10){ g.fillStyle = '#12061a'; g.fillRect(-OX, y0 + 3, W, cy + H - y0 + 4);
      for(let x = -OX; x < W - OX; x++){ const o = Math.round(Math.sin(x*0.18 + J.tr*4)*1.6 + Math.sin(x*0.07 - J.tr*2.3)*1.5); g.fillStyle = '#12061a'; g.fillRect(x, y0 + o, 1, 4); g.fillStyle = '#5a2a6a'; g.fillRect(x, y0 + o, 1, 1); }
      for(let i = 0; i < 8; i++){ const bx = ((i*41 + Math.floor(J.tr*20)) % ANCHO), by = y0 + 6 + ((i*13 + J.tr*30) % 20); px(g, bx, by, '#3a1a4a'); } } }
  g.restore();
  /* pétalos, nieve o brasas por delante de todo */
  particulasAire(g, E, dtParticulas());
  if(J.fundido > 0){ g.fillStyle = 'rgba(10,4,14,' + J.fundido.toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
}
let _uT = 0; function dtParticulas(){ const d = J.tr - _uT; _uT = J.tr; return Math.min(0.05, d)*(J.modo === 'juego' ? J.ts : 1); }
const AIRE = [];
function particulasAire(g, E, dt){
  const n = E.part === 'nieve' ? 60 : 34; while(AIRE.length < n) AIRE.push({x:Math.random()*W, y:Math.random()*H, v:rv(0.6, 1.4), f:Math.random()*6});
  if(AIRE.length > n) AIRE.length = n;
  const dy0 = (AIRE._cy === undefined ? 0 : CAM.y - AIRE._cy); AIRE._cy = CAM.y;
  for(const p of AIRE){ const tipo = E.part;
    if(tipo === 'brasas'){ p.y -= 22*p.v*dt; p.x += Math.sin(J.tr*2 + p.f)*8*dt; } else { p.y += (tipo === 'nieve' ? 16 : 12)*p.v*dt; p.x += (Math.sin(J.tr*1.3 + p.f)*10 + (tipo === 'hojas' ? 6 : 3))*dt; }
    p.y -= dy0*0.9;                                                                                    /* se mueven con la cámara, un pelo más lento que la torre */
    if(p.y > H + 4) { p.y = -4; p.x = Math.random()*W; } if(p.y < -6){ p.y = H + 3; p.x = Math.random()*W; } if(p.x > W + 4) p.x = -4; if(p.x < -4) p.x = W + 4;
    const c = E.colPart[Math.floor(p.f*10) % E.colPart.length]; g.fillStyle = c;
    if(tipo === 'sakura' || tipo === 'hojas'){ const k = Math.sin(J.tr*3 + p.f) > 0; g.fillRect(Math.round(p.x), Math.round(p.y), k ? 2 : 1, k ? 1 : 2); }
    else if(tipo === 'tinta'){ g.globalAlpha = 0.5; g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); g.globalAlpha = 1; }
    else g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
}
/* la trayectoria: la misma física, un segundo para adelante */
function trayectoria(g){
  const d = J.apunta, pegado = NIN.est === 'pegado', v = velTiro(d.x - d.x0, d.y - d.y0, pegado ? NIN.nx : undefined, pegado ? NIN.ny : undefined);
  if(!v || !puedeSaltar()) return;
  const o = {x:NIN.x, y:NIN.y, vx:v.vx, vy:v.vy}; let fin = null;
  for(let s = 0; s < 70; s++){ const r = pasoCuerpo(o, 1/60, true); if(r){ fin = r; break; }
    if(s % 4 === 1){ const a = 1 - s/85, x = Math.round(o.x), y = Math.round(o.y); g.globalAlpha = a; g.fillStyle = '#1a0a20'; g.fillRect(x - 1, y - 1, 3, 3); px(g, x, y, NIN.est === 'aire' ? '#9ae8ff' : '#ffffff'); g.globalAlpha = 1; } }
  if(fin && fin.muere){ const x = Math.round(o.x), y = Math.round(o.y); for(let i = -2; i <= 2; i++){ px(g, x + i, y + i, '#ff3a3a'); px(g, x + i, y - i, '#ff3a3a'); } }
  else if(fin && fin.pega){ g.fillStyle = '#ffffff'; g.fillRect(Math.round(o.x) - 2, Math.round(o.y) - 2, 1, 1); g.fillRect(Math.round(o.x) + 2, Math.round(o.y) - 2, 1, 1); g.fillRect(Math.round(o.x) - 2, Math.round(o.y) + 2, 1, 1); g.fillRect(Math.round(o.x) + 2, Math.round(o.y) + 2, 1, 1); }
}

/* ================================================================ el HUD */
function dibujarHUD(g, E){
  const t = J.tr;
  if(J.infinito){ texto(g, J.alturaMax + tr('M'), 6, 5, 'blanco', {izq:true}); texto(g, String(J.puntos), 6, 17, 'oro', {izq:true}); }
  else { texto(g, J.nivel.id.toUpperCase().replace('BAMBU', tr('BAMBÚ')).replace('MONTANA', tr('MONTAÑA')).replace('CASTILLO', tr('CASTILLO')), 6, 5, 'blanco', {izq:true});
    texto(g, J.bajas + '/' + J.totEnem, 6, 17, J.bajas >= J.totEnem ? 'verde' : 'gris', {izq:true}); }
  /* monedas */
  const ms = J.infinito ? String(J.monedas) : J.monedas + '/' + J.totMonedas; texto(g, ms, W - 8, 17, J.monedas >= J.totMonedas && !J.infinito ? 'verde' : 'oro', {der:true}); disco(g, W - 12 - lienzoTexto(ms, 'oro').width, 22, 3, '#8a5a08'); disco(g, W - 12 - lienzoTexto(ms, 'oro').width, 22, 2, '#ffd040');
  /* pausa */
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(W - 20, 2, 16, 13); g.fillStyle = '#ffffff'; g.fillRect(W - 15, 5, 2, 7); g.fillRect(W - 10, 5, 2, 7);
  if(NJ().vidas) for(let i = 0; i < NIN.vidas; i++) disco(g, 8 + i*7, 32, 2, '#ff5a6a');
  /* el dedo: dónde apoyaste y cuánto tiraste */
  if(J.apunta){ const d = J.apunta, v = velTiro(d.x - d.x0, d.y - d.y0), k = v ? Math.hypot(v.vx, v.vy)/V_MAX : 0;
    anillo(g, d.x0, d.y0, 7, 'rgba(255,255,255,0.6)'); linea(g, d.x0, d.y0, d.x, d.y, 'rgba(255,255,255,0.45)', 1); disco(g, d.x, d.y, 2.5, k > 0.98 ? '#ffd040' : '#ffffff');
    const bw = 40; g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(W/2 - bw/2, H - 14, bw, 4); g.fillStyle = k > 0.98 ? '#ffd040' : '#ffffff'; g.fillRect(W/2 - bw/2, H - 14, Math.round(bw*k), 4); }
  /* la tinta cerca: el borde de abajo se pone morado */
  if(J.tinta){ const k = lim(1 - (J.tinta.y - NIN.y)/140, 0, 1); if(k > 0){ const gr = g.createLinearGradient(0, H, 0, H - 60); gr.addColorStop(0, 'rgba(90,20,110,' + (k*0.6).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(90,20,110,0)'); g.fillStyle = gr; g.fillRect(0, H - 60, W, 60); } }
  for(const tx of J.textos){ g.globalAlpha = lim(tx.t*3, 0, 1); const sy = Math.round(tx.y - CAM.y), sx = Math.round(tx.x + (W - ANCHO)/2); texto(g, tx.txt, sx, sy, tx.grad); g.globalAlpha = 1; }
  /* el cartel del nivel al arrancar */
  if(J.reloj < 1.8 && !J.pausa){ const a = lim((1.8 - J.reloj)*2, 0, 1)*lim(J.reloj*4, 0, 1); g.globalAlpha = a;
    const t1 = J.infinito ? tr('INFINITO') : tr(MUNDOS[J.nivel.mi].nombre), t2 = J.infinito ? tr('LA TINTA SUBE') : String(J.nivel.n + 1);
    g.fillStyle = 'rgba(10,4,14,0.55)'; g.fillRect(0, Math.round(H*0.36), W, 34); texto(g, t1, W/2, Math.round(H*0.36) + 5, 'blanco'); texto(g, t2, W/2, Math.round(H*0.36) + 18, J.infinito ? 'rojo' : 'oro'); g.globalAlpha = 1; }
  /* el primer nivel explica */
  if(J.nivel && J.nivel.id === 'bambu-1' && J.reloj < 9 && NIN.est === 'pegado' && !J.apunta && !J.pausa){ const a = lim((9 - J.reloj), 0, 1);
    g.globalAlpha = a; texto(g, tr('TIRÁ PARA ATRÁS'), W/2, Math.round(H*0.2), 'blanco'); texto(g, tr('Y SOLTÁ PARA SALTAR'), W/2, Math.round(H*0.2) + 12, 'blanco');
    const k = (t*0.8) % 1, x0 = W/2, y0 = Math.round(H*0.2) + 40; disco(g, x0 - k*18, y0 + k*18, 3, '#ffffff'); anillo(g, x0, y0, 6, 'rgba(255,255,255,0.6)'); g.globalAlpha = 1; }
  if(J.nivel && J.nivel.id === 'bambu-1' && NIN.est === 'aire' && NIN.dj > 0 && J.reloj < 20){ texto(g, tr('EN EL AIRE: OTRO SALTO'), W/2, Math.round(H*0.2), 'cian'); }
}
function anillo(g, x, y, r, col){ g.fillStyle = col; for(let a = 0; a < 6.283; a += 1/r) g.fillRect(Math.round(x + Math.cos(a)*r), Math.round(y + Math.sin(a)*r), 1, 1); }
