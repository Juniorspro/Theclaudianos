/* ================================================================ el mundo: pisos de celdas de 8 px
   Cada piso es una grilla: ' ' afuera, '#' pared, 'v' ventana (se rompe), y una letra por tipo de piso.
   Se hornea en capas: el piso, las manchas (sangre, casquillos) y lo alto (paredes y muebles). Las puertas
   giran sobre su bisagra: se empujan caminando y voltean a quien estén golpeando. */
const CEL = 8;
const TIPO_PISO = {a:'alfombra', A:'alfombraV', m:'madera', d:'damero', b:'banio', k:'cocina', c:'cemento', l:'baldosa', p:'pista', o:'marmol', s:'asfalto', e:'vereda', g:'pasto'};
const PISO = {def:null, w:0, h:0, mapa:null, capaSuelo:null, capaDeco:null, cxDeco:null, capaAlto:null, vidrios:[], puertas:[], muebles:[], rotos:new Set(), bloqueo:null, estilo:null};
const ESTILOS = {
  depto:   {pared:'#e8dcc8', paredS:'#a89c88', borde:'#2a1a2a', afuera:['#2a0a3a', '#6a1a5a', '#ff5a8a']},
  bailanta:{pared:'#3a2a5a', paredS:'#2a1a40', borde:'#ff3aa8', afuera:['#0a0a2a', '#1a2a6a', '#3ad8ff']},
  deposito:{pared:'#8a8478', paredS:'#5a564e', borde:'#1a1818', afuera:['#0a1a1a', '#1a3a3a', '#5ae8c8']},
  mansion: {pared:'#f0e8d8', paredS:'#b8a888', borde:'#3a1a0a', afuera:['#1a0a0a', '#4a1a1a', '#ffb84a']},
  sotano:  {pared:'#6a6468', paredS:'#4a444a', borde:'#0a0a0a', afuera:['#0a0a10', '#1a1a2a', '#8a4aff']}
};
function celdaEn(x, y){ const cx = Math.floor(x/CEL), cy = Math.floor(y/CEL); if(cx < 0 || cy < 0 || cx >= PISO.w || cy >= PISO.h) return ' '; return PISO.mapa[cy][cx]; }
function esSolido(c){ return c === '#' || c === ' ' || c === 'v'; }
function solidoEn(x, y){ const c = celdaEn(x, y); if(c === 'v') return !PISO.rotos.has(Math.floor(x/CEL) + ',' + Math.floor(y/CEL)); return c === '#' || c === ' '; }
function rectMueble(m){ const M = MUEBLES[m.k], w = m.rot ? M.h : M.w, h = m.rot ? M.w : M.h; return {x:m.x, y:m.y, w, h}; }

/* ---------- armar un piso ---------- */
function armarPiso(def, estilo){
  PISO.def = def; PISO.w = def.w; PISO.h = def.h; PISO.mapa = def.celdas.map(f => f.split('')); PISO.estilo = ESTILOS[estilo] || ESTILOS.depto; PISO.rotos = new Set();
  const Wp = def.w*CEL, Hp = def.h*CEL;
  /* el piso */
  const [cs, gs] = lienzo(Wp, Hp), pats = {};
  for(let y = 0; y < def.h; y++) for(let x = 0; x < def.w; x++){ const t = PISO.mapa[y][x], tp = TIPO_PISO[t]; if(!tp) continue;
    if(!pats[t]) pats[t] = gs.createPattern(patronPiso(tp, t.charCodeAt(0)), 'repeat'); gs.fillStyle = pats[t]; gs.fillRect(x*CEL, y*CEL, CEL, CEL);
    /* la sombra que tira la pared de arriba y la de la izquierda */
    if(esSolido(PISO.mapa[y - 1] ? PISO.mapa[y - 1][x] : ' ')){ gs.fillStyle = 'rgba(10,0,20,0.35)'; gs.fillRect(x*CEL, y*CEL, CEL, 3); }
    if(esSolido(PISO.mapa[y][x - 1] || ' ')){ gs.fillStyle = 'rgba(10,0,20,0.25)'; gs.fillRect(x*CEL, y*CEL, 2, CEL); } }
  PISO.capaSuelo = cs;
  /* las manchas */
  const [cd, gd] = lienzo(Wp, Hp); PISO.capaDeco = cd; PISO.cxDeco = gd;
  /* lo alto: paredes con su borde y los muebles */
  const [ca, ga] = lienzo(Wp, Hp), E = PISO.estilo;
  for(let y = 0; y < def.h; y++) for(let x = 0; x < def.w; x++){ if(PISO.mapa[y][x] !== '#') continue;
    ga.fillStyle = E.pared; ga.fillRect(x*CEL, y*CEL, CEL, CEL);
    const vec = (dx, dy) => { const f = PISO.mapa[y + dy]; const c = f ? f[x + dx] : ' '; return c !== '#' && c !== undefined; };
    ga.fillStyle = E.borde; if(vec(0, -1)) ga.fillRect(x*CEL, y*CEL, CEL, 1); if(vec(0, 1)) ga.fillRect(x*CEL, y*CEL + CEL - 1, CEL, 1); if(vec(-1, 0)) ga.fillRect(x*CEL, y*CEL, 1, CEL); if(vec(1, 0)) ga.fillRect(x*CEL + CEL - 1, y*CEL, 1, CEL);
    ga.fillStyle = E.paredS; if(vec(0, 1)) ga.fillRect(x*CEL, y*CEL + CEL - 3, CEL, 2); }
  PISO.muebles = (def.muebles || []).map(([k, x, y, rot], i) => ({k, x, y, rot:!!rot, img:hacerMueble(k, i*7 + 3)}));
  /* lo que no choca (alfombras, sillas) va en el piso, abajo de la gente; lo que choca, arriba */
  for(const m of PISO.muebles){ const r = rectMueble(m), gg = MUEBLES[m.k].choca ? ga : gs;
    if(m.rot){ gg.save(); gg.translate(r.x + r.w, r.y); gg.rotate(Math.PI/2); gg.drawImage(m.img, 0, 0); gg.restore(); } else gg.drawImage(m.img, r.x, r.y); }
  PISO.vidrios = []; for(let y = 0; y < def.h; y++) for(let x = 0; x < def.w; x++) if(PISO.mapa[y][x] === 'v') PISO.vidrios.push([x, y]);
  PISO.capaAlto = ca;
  /* las puertas: bisagra, largo y hacia dónde abren */
  PISO.puertas = (def.puertas || []).map(([x, y, dir]) => { const hx = x*CEL, hy = y*CEL, ang0 = dir === 'h' ? 0 : Math.PI/2;
    return {hx:dir === 'h' ? hx : hx + CEL/2, hy:dir === 'h' ? hy + CEL/2 : hy, largo:CEL*2, ang:ang0, ang0, vel:0, golpe:0}; });
  /* la grilla de caminos: sólidos y muebles que chocan */
  PISO.bloqueo = new Uint8Array(def.w*def.h);
  for(let y = 0; y < def.h; y++) for(let x = 0; x < def.w; x++) if(esSolido(PISO.mapa[y][x])) PISO.bloqueo[y*def.w + x] = 1;
  for(const m of PISO.muebles){ if(!MUEBLES[m.k].choca) continue; const r = rectMueble(m);
    for(let y = Math.floor((r.y + 2)/CEL); y <= Math.floor((r.y + r.h - 2)/CEL); y++) for(let x = Math.floor((r.x + 2)/CEL); x <= Math.floor((r.x + r.w - 2)/CEL); x++) if(x >= 0 && y >= 0 && x < def.w && y < def.h) PISO.bloqueo[y*def.w + x] = 1; }
}
/* ---------- choques ---------- */
function chocaCirculo(x, y, r){
  for(let cy = Math.floor((y - r)/CEL); cy <= Math.floor((y + r)/CEL); cy++) for(let cx = Math.floor((x - r)/CEL); cx <= Math.floor((x + r)/CEL); cx++){
    if(!solidoEn(cx*CEL + 1, cy*CEL + 1)) continue; const nx = lim(x, cx*CEL, cx*CEL + CEL), ny = lim(y, cy*CEL, cy*CEL + CEL); if((nx - x)*(nx - x) + (ny - y)*(ny - y) < r*r) return true; }
  for(const m of PISO.muebles){ if(!MUEBLES[m.k].choca) continue; const q = rectMueble(m); const nx = lim(x, q.x + 1, q.x + q.w - 1), ny = lim(y, q.y + 1, q.y + q.h - 1); if((nx - x)*(nx - x) + (ny - y)*(ny - y) < r*r) return true; }
  return false;
}
/* al chocar una esquina de frente (el marco de una puerta), se resbala hacia el lado que deja pasar */
function esquina(o, sx, sy, r){
  const m = Math.abs(sx + sy); if(m < 0.05) return;
  for(let d = 1; d <= 4; d++) for(const s of [1, -1]){ const ox = sy ? s*d : 0, oy = sx ? s*d : 0;
    if(!chocaCirculo(o.x + ox + sx, o.y + oy + sy, r) && !chocaCirculo(o.x + ox*0.25, o.y + oy*0.25, r)){ o.x += ox ? s*Math.min(m, 1) : 0; o.y += oy ? s*Math.min(m, 1) : 0; return; } }
}
/* mover un círculo con subpasos y deslizar contra lo que choca */
function moverCirculo(o, dx, dy, r){
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy)/3)); let golpe = false;
  for(let i = 0; i < n; i++){ const sx = dx/n, sy = dy/n;
    if(!chocaCirculo(o.x + sx, o.y, r)) o.x += sx; else { golpe = true; esquina(o, sx, 0, r); }
    if(!chocaCirculo(o.x, o.y + sy, r)) o.y += sy; else { golpe = true; esquina(o, 0, sy, r); } }
  return golpe;
}
/* ---------- puertas ---------- */
function puntaPuerta(p){ return {x:p.hx + Math.cos(p.ang)*p.largo, y:p.hy + Math.sin(p.ang)*p.largo}; }
function distSeg(px2, py2, ax, ay, bx, by){ const vx = bx - ax, vy = by - ay, t = lim(((px2 - ax)*vx + (py2 - ay)*vy)/(vx*vx + vy*vy || 1), 0, 1); return {d:Math.hypot(px2 - ax - vx*t, py2 - ay - vy*t), t}; }
/* un personaje que choca la puerta la empuja; la puerta que viene rápido voltea */
function empujarPuertas(o, r, dt, esJugador){
  for(const p of PISO.puertas){ const q = puntaPuerta(p), s = distSeg(o.x, o.y, p.hx, p.hy, q.x, q.y);
    if(s.d >= r || s.t < 0.08) continue;
    const lado = Math.sign((q.x - p.hx)*(o.y - p.hy) - (q.y - p.hy)*(o.x - p.hx)) || 1;          /* de qué lado de la hoja está */
    const v = Math.hypot(o.vx || 0, o.vy || 0); if(esJugador){ p.vel -= lado*(2 + v*0.06)*(0.4 + s.t); p.deJug = 0.6; } else if(!(p.deJug > 0)) p.vel -= lado*1.2*(0.4 + s.t);   /* los de la patota también abren, más despacio */
    /* sacar al personaje de la hoja */
    /* se lo saca desde el punto más cercano de la hoja: en la punta se resbala alrededor */
    const cx = p.hx + (q.x - p.hx)*s.t, cy = p.hy + (q.y - p.hy)*s.t, dd = s.d || 0.01;
    let nx = (o.x - cx)/dd, ny = (o.y - cy)/dd; if(s.d < 0.05){ nx = -(q.y - p.hy)/p.largo*lado; ny = (q.x - p.hx)/p.largo*lado; }
    const emp = r - s.d + 0.3, ox = o.x, oy = o.y; o.x += nx*emp; o.y += ny*emp; if(chocaCirculo(o.x, o.y, r - 0.5)){ o.x = ox; o.y = oy; }
    if(!esJugador && Math.abs(p.vel) > 5 && p.deJug > 0 && o.derribar) o.derribar(p); }
}
function pasoPuertas(dt){
  for(const p of PISO.puertas){ const ant = p.ang;
    p.ang += p.vel*dt; p.vel *= Math.exp(-dt*4);
    const d = p.ang - p.ang0; if(Math.abs(d) > 1.75){ p.ang = p.ang0 + Math.sign(d)*1.75; p.vel *= -0.35; if(Math.abs(p.vel) > 1.2) SON.fx('puerta', {vol:0.5}); }
    /* la hoja no atraviesa paredes: si la punta entra en un sólido, rebota */
    const qx = p.hx + Math.cos(p.ang)*(p.largo - 1.5), qy = p.hy + Math.sin(p.ang)*(p.largo - 1.5);    /* la punta cerrada toca el marco: se prueba un poco adentro */
    if(solidoEn(qx, qy) || chocaCirculo(qx, qy, 0.5)){ p.ang = ant; p.vel *= -0.3; }
    p.golpe = Math.max(0, p.golpe - dt); p.deJug = Math.max(0, (p.deJug || 0) - dt); }
}
/* ---------- vista y balas ---------- */
function segCruza(ax, ay, bx, by, cx, cy, dx, dy){ const d = (bx - ax)*(dy - cy) - (by - ay)*(dx - cx); if(!d) return false; const t = ((cx - ax)*(dy - cy) - (cy - ay)*(dx - cx))/d, u = ((cx - ax)*(by - ay) - (cy - ay)*(bx - ax))/d; return t > 0 && t < 1 && u > 0 && u < 1; }
/* ¿se ve de un punto al otro? las paredes y las puertas tapan, el vidrio no */
function seVe(x0, y0, x1, y1){
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d/3);
  for(let i = 1; i < n; i++){ const t = i/n, c = celdaEn(x0 + (x1 - x0)*t, y0 + (y1 - y0)*t); if(c === '#' || c === ' ') return false; }
  for(const p of PISO.puertas){ const q = puntaPuerta(p); if(segCruza(x0, y0, x1, y1, p.hx, p.hy, q.x, q.y)) return false; }
  return true;
}
/* ---------- caminos: un campo de distancias desde una celda (BFS en 8 direcciones) ---------- */
function campo(x, y){
  const w = PISO.w, h = PISO.h, d = new Int16Array(w*h).fill(-1), cola = new Int32Array(w*h); let a = 0, b = 0;
  const cx = lim(Math.floor(x/CEL), 0, w - 1), cy = lim(Math.floor(y/CEL), 0, h - 1); d[cy*w + cx] = 0; cola[b++] = cy*w + cx;
  while(a < b){ const i = cola[a++], ix = i % w, iy = (i - ix)/w, v = d[i];
    for(let k = 0; k < 8; k++){ const dx = [1, -1, 0, 0, 1, 1, -1, -1][k], dy = [0, 0, 1, -1, 1, -1, 1, -1][k], X = ix + dx, Y = iy + dy;
      if(X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y*w + X; if(d[j] >= 0 || PISO.bloqueo[j]) continue;
      if(dx && dy && (PISO.bloqueo[iy*w + X] || PISO.bloqueo[Y*w + ix])) continue;                         /* no cortar esquinas */
      d[j] = v + (dx && dy ? 3 : 2); cola[b++] = j; } }
  return d;
}
/* el próximo punto hacia donde bajar en un campo */
function pasoCampo(f, x, y){
  const w = PISO.w, cx = Math.floor(x/CEL), cy = Math.floor(y/CEL), i0 = cy*w + cx; let mejor = f[i0], bx = null, by = null;
  for(let k = 0; k < 8; k++){ const dx = [1, -1, 0, 0, 1, 1, -1, -1][k], dy = [0, 0, 1, -1, 1, -1, 1, -1][k], X = cx + dx, Y = cy + dy;
    if(X < 0 || Y < 0 || X >= w || Y >= PISO.h) continue; const v = f[Y*w + X]; if(v < 0) continue;
    if(dx && dy && (PISO.bloqueo[cy*w + X] || PISO.bloqueo[Y*w + cx])) continue;
    if(mejor < 0 || v < mejor){ mejor = v; bx = X*CEL + CEL/2; by = Y*CEL + CEL/2; } }
  return bx === null ? null : {x:bx, y:by, d:mejor};
}
/* ---------- las manchas: sangre que se pega al piso (o confeti, con censura) ---------- */
function mancha(x, y, r, col, a){ const g = PISO.cxDeco; if(!g) return; g.globalAlpha = a === undefined ? 1 : a; g.fillStyle = col;
  for(let yy = -r; yy <= r; yy++) for(let xx = -r; xx <= r; xx++) if(xx*xx + yy*yy <= r*r + rv(-r, r) && !solidoEn(x + xx, y + yy)) g.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
  g.globalAlpha = 1; }
function charco(x, y, dir, fuerza){
  if(AJ.censura) return;
  for(let i = 0; i < 6 + fuerza*4; i++){ const d = rv(0, 10 + fuerza*8), a = dir + rv(-0.5, 0.5); mancha(x + Math.cos(a)*d, y + Math.sin(a)*d, Math.round(rv(0.5, 2.2)), COL_SANGRE[i % 3]); }
  mancha(x, y, 4 + Math.round(fuerza), COL_SANGRE[1], 0.9);
}
