/* ================================================================ la torre
   22 columnas de 8 px (176 de ancho), las filas crecen hacia arriba (y negativa). Se guarda en un anillo de 2048
   filas: en el infinito lo que quedó muy abajo se pisa con lo nuevo de arriba. 0 aire, 1 piedra, 2 pinchos,
   3 piedra que se desmorona. Las dos columnas de afuera son pared, salvo que se diga otra cosa. */
const CEL = 8, COLS = 22, ANCHO = COLS*CEL, ANILLO = 2048;
const T_AIRE = 0, T_PIEDRA = 1, T_PINCHO = 2, T_DESM = 3, T_REJA = 4;
const MAPA = {cel:new Uint8Array(COLS*ANILLO), rMin:0, rMax:0, piso:4, meta:null, plats:[], desm:new Map(), gen:0, ver:0, deco:[]};
const idx = (c, r) => (((r % ANILLO) + ANILLO) % ANILLO)*COLS + c;
function tile(c, r){ if(c < 0 || c >= COLS) return T_PIEDRA; if(r > MAPA.piso) return T_PIEDRA; if(r < MAPA.rMin) return (c === 0 || c === COLS - 1) ? T_PIEDRA : T_AIRE; return MAPA.cel[idx(c, r)]; }
function poner(c, r, v){ if(c < 0 || c >= COLS || r < MAPA.rMin || r > MAPA.piso) return; MAPA.cel[idx(c, r)] = v; MAPA.ver++; }
/* abrir filas nuevas arriba (con las paredes de afuera puestas) */
function abrirFilas(hasta){ while(MAPA.rMin > hasta){ MAPA.rMin--; const i = idx(0, MAPA.rMin); MAPA.cel.fill(0, i, i + COLS); MAPA.cel[i] = MAPA.cel[i + COLS - 1] = T_PIEDRA; } MAPA.ver++; }
function nuevoMapa(){ MAPA.cel.fill(0); MAPA.rMin = MAPA.piso + 1; MAPA.plats = []; MAPA.deco = []; MAPA.desm.clear(); MAPA.meta = null; MAPA.ver++; MAPA.gen++;
  abrirFilas(0); for(let r = 1; r <= MAPA.piso; r++) for(let c = 0; c < COLS; c++) MAPA.cel[idx(c, r)] = T_PIEDRA; }
const rect2 = (c0, r0, c1, r1, v) => { for(let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) for(let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) poner(c, r, v); };

/* ================================================================ los tramos: cada uno arma unas filas y deja gente, monedas y máquinas
   base = la fila de más abajo del tramo; k filas hacia arriba = base - k. d = dificultad 0..1. */
const TRAMOS = {
  /* repisas que salen de una pared y de la otra, como en la foto */
  repisas(base, r, d, o){ const h = 26; let k = 3, lado = r() < 0.5 ? 0 : 1;
    while(k < h - 3){ const largo = 4 + Math.floor(r()*4), rr = base - k, c0 = lado ? COLS - 1 - largo : 1;
      rect2(c0, rr, c0 + largo - 1, rr - (r() < 0.3 ? 1 : 0), T_PIEDRA);
      if(d > 0.35 && r() < d*0.6){ const cp = lado ? c0 : c0 + largo - 1; poner(cp, rr, T_PINCHO); }                 /* la punta con pinchos */
      if(r() < 0.3 + d*0.5) o.gente.push({t:r() < 0.5 + d*0.2 ? 'tirador' : 'samurai', c:lado ? c0 + 1 : c0 + largo - 2, r:rr - 1});
      if(d > 0.5 && r() < 0.4){ rect2(lado ? 0 : COLS - 1, rr - 2, lado ? 0 : COLS - 1, rr - 4, T_PINCHO); }      /* pared de enfrente pinchuda */
      lado = 1 - lado; k += 5 + Math.floor(r()*3); }
    return h; },
  /* islas sueltas en el medio */
  islas(base, r, d, o){ const h = 24; let k = 3;
    while(k < h - 3){ const w = 2 + Math.floor(r()*3), c0 = 2 + Math.floor(r()*(COLS - 4 - w)), rr = base - k;
      rect2(c0, rr, c0 + w - 1, rr - 1, T_PIEDRA); if(d > 0.3 && r() < d*0.5) poner(c0 + (r() < 0.5 ? 0 : w - 1), rr - 1, T_PINCHO);
      if(r() < 0.2 + d*0.4 && w >= 3) o.gente.push({t:'tirador', c:c0 + 1, r:rr - 2});
      k += 4 + Math.floor(r()*3); }
    if(d > 0.3) o.gente.push({t:'cometa', c:6 + Math.floor(r()*10), r:base - 12});
    return h; },
  /* una columna en el medio, con pinchos de un lado y del otro a tramos */
  columna(base, r, d, o){ const h = 22, c0 = 9 + Math.floor(r()*2);
    rect2(c0, base - 4, c0 + 2, base - 17, T_PIEDRA);
    for(let k = 4; k <= 17; k += 4){ if(r() < 0.35 + d*0.4){ const lado = r() < 0.5 ? c0 - 1 : c0 + 3; rect2(lado, base - k, lado, base - k - 1, T_PINCHO); } }
    rect2(1, base - 2, 3, base - 2, T_PIEDRA); rect2(COLS - 4, base - 2, COLS - 2, base - 2, T_PIEDRA);
    rect2(c0 - 1, base - 18, c0 + 3, base - 18, T_PIEDRA);
    if(r() < 0.3 + d*0.5) o.gente.push({t:'samurai', c:c0 + 1, r:base - 19});
    if(d > 0.25) o.gente.push({t:'shuriken', c:r() < 0.5 ? 1 : COLS - 2, r:base - 3});
    return h; },
  /* el pasillo se angosta: paredes de adentro con huecos y pinchos atrás */
  embudo(base, r, d, o){ const h = 22, ci = 5 + Math.floor(r()*2), cd = COLS - 1 - ci;
    for(let k = 3; k < h - 3; k++){ const rr = base - k; if(k % 7 !== 0){ poner(ci, rr, T_PIEDRA); poner(cd, rr, T_PIEDRA); } }
    rect2(1, base - 10, ci - 1, base - 10, T_PIEDRA); rect2(cd + 1, base - 14, COLS - 2, base - 14, T_PIEDRA);
    if(d > 0.2){ rect2(0, base - 4, 0, base - 8, T_PINCHO); rect2(COLS - 1, base - 12, COLS - 1, base - 17, T_PINCHO); }
    if(r() < 0.4 + d*0.4) o.gente.push({t:'tirador', c:2 + Math.floor(r()*2), r:base - 11});
    return h; },
  /* las paredes de afuera llenas de pinchos, con piedritas para ir saltando */
  pinchera(base, r, d, o){ const h = 24;
    rect2(0, base - 3, 0, base - 20, T_PINCHO); rect2(COLS - 1, base - 3, COLS - 1, base - 20, T_PINCHO);
    let k = 4, x = 4 + Math.floor(r()*4);
    while(k < 21){ rect2(x, base - k, x + 2, base - k, T_PIEDRA); x = x < 11 ? 12 + Math.floor(r()*5) : 3 + Math.floor(r()*5); k += 4 + Math.floor(r()*2); }
    if(d > 0.4) o.gente.push({t:'cometa', c:10, r:base - 10});
    return h; },
  /* plataformas que van y vienen, y piedras firmes en las puntas */
  movil(base, r, d, o){ const h = 24;
    rect2(1, base - 4, 3, base - 4, T_PIEDRA); rect2(COLS - 4, base - 10, COLS - 2, base - 10, T_PIEDRA); rect2(1, base - 16, 3, base - 16, T_PIEDRA); rect2(COLS - 4, base - 21, COLS - 2, base - 21, T_PIEDRA);
    rect2(9, base - 13, 12, base - 13, T_PIEDRA);
    o.plats.push({r:base - 7, c0:4, c1:COLS - 8, w:4, v:0.35 + d*0.35, f:r()*6}); o.plats.push({r:base - 18, c0:4, c1:COLS - 8, w:4, v:0.4 + d*0.4, f:r()*6});
    if(d > 0.3) o.gente.push({t:'shuriken', c:COLS - 3, r:base - 11});
    return h; },
  /* repisas que se desmoronan a los 0,45 s de pisarlas */
  desmorona(base, r, d, o){ const h = 24; let k = 3, lado = r() < 0.5 ? 0 : 1;
    while(k < h - 3){ const largo = 3 + Math.floor(r()*3), c0 = lado ? COLS - 1 - largo : 1 + Math.floor(r()*3); rect2(c0, base - k, c0 + largo - 1, base - k, T_DESM);
      lado = 1 - lado; k += 5 + Math.floor(r()*2); }
    rect2(8, base - 12, 13, base - 12, T_DESM);
    return h; }
};
/* qué tramos salen según el mundo y cuánto se avanzó */
const MEZCLAS = {bambu:['repisas', 'islas', 'repisas', 'columna', 'desmorona', 'islas'], montana:['repisas', 'embudo', 'columna', 'desmorona', 'movil', 'islas', 'pinchera'],
  castillo:['pinchera', 'embudo', 'movil', 'columna', 'repisas', 'desmorona', 'islas'], infinito:['repisas', 'islas', 'columna', 'embudo', 'desmorona', 'movil', 'pinchera']};
/* un descanso ancho entre tramos: una repisa que cruza casi toda la torre con un hueco */
function descanso(base, r){ const hueco = 3 + Math.floor(r()*14); for(let c = 1; c < COLS - 1; c++) if(c < hueco || c > hueco + 3) poner(c, base - 1, T_PIEDRA);
  /* una cuerda con papeles y faroles que cruza la torre un poco más arriba (sin tocar el azar del nivel) */
  const h = ((base*2654435761) >>> 0) % 1000; if(h < 800) MAPA.deco.push({t:'cuerda', y:(base - 7)*CEL + 2, f:h*0.006}); return 3; }

/* ================================================================ la física del ninja (la misma para jugar y para verificar) */
const G = 560, V_MAX = 345, V_CAIDA = 430, HW = 2.8, HH = 4;
/* ¿qué toca una caja? devuelve pincho, o la piedra (con su rectángulo) que la frena */
function tocaCaja(x, y, conPlats){
  const c0 = Math.floor((x - HW)/CEL), c1 = Math.floor((x + HW - 0.001)/CEL), r0 = Math.floor((y - HH)/CEL), r1 = Math.floor((y + HH - 0.001)/CEL);
  let dura = null;
  for(let r = r0; r <= r1; r++) for(let c = c0; c <= c1; c++){ const t = tile(c, r); if(t === T_AIRE) continue;
    if(t === T_PINCHO){ /* los pinchos perdonan un píxel y medio de cada lado */
      if(x + HW > c*CEL + 1.5 && x - HW < c*CEL + CEL - 1.5 && y + HH > r*CEL + 1.5 && y - HH < r*CEL + CEL - 1.5) return {pincho:true}; continue; }
    if(!dura) dura = {x:c*CEL, y:r*CEL, w:CEL, h:CEL, c, r, t}; }
  if(!dura && conPlats) for(const p of MAPA.plats){ if(x + HW > p.x && x - HW < p.x + p.w && y + HH > p.y && y - HH < p.y + p.h) return {x:p.x, y:p.y, w:p.w, h:p.h, plat:p}; }
  return dura;
}
/* un paso: mueve por ejes y, si choca, se pega del lado del choque */
function pasoCuerpo(o, dt, conPlats){
  o.vy = Math.min(V_CAIDA, o.vy + G*dt);
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(o.vx), Math.abs(o.vy))*dt/2.5)), sx = o.vx*dt/n, sy = o.vy*dt/n;
  for(let i = 0; i < n; i++){
    let h = tocaCaja(o.x + sx, o.y, conPlats);
    if(h){ if(h.pincho) return {muere:'pinchos'}; o.x = sx > 0 ? h.x - HW - 0.01 : h.x + h.w + HW + 0.01; return {pega:true, nx:sx > 0 ? -1 : 1, ny:0, h}; }
    o.x += sx;
    h = tocaCaja(o.x, o.y + sy, conPlats);
    if(h){ if(h.pincho) return {muere:'pinchos'}; o.y = sy > 0 ? h.y - HH - 0.01 : h.y + h.h + HH + 0.01; return {pega:true, nx:0, ny:sy > 0 ? -1 : 1, h}; }
    o.y += sy; }
  return null;
}
/* el tiro: la velocidad sale del arrastre (tirar para atrás), topada; no se puede tirar contra la superficie */
function velTiro(dx, dy, nx, ny){
  let vx = -dx*5.6, vy = -dy*5.6; const v = Math.hypot(vx, vy); if(v < 40) return null;
  if(v > V_MAX){ vx *= V_MAX/v; vy *= V_MAX/v; }
  if(nx !== undefined && (nx || ny) && (vx*nx + vy*ny)/Math.hypot(vx, vy) < -0.05) return null;
  return {vx, vy};
}

/* ================================================================ la búsqueda: desde el arranque, probando saltos de verdad, ¿se llega arriba?
   Nodos = lugares donde el ninja queda pegado. Sin doble salto (es margen) y sin plataformas móviles (son ayuda). */
function alcance(desde, metaY, maxNodos, conCaminos){
  /* primero lo más alto (búsqueda golosa hacia arriba): en una torre larga a lo ancho se agotan los nodos antes de subir */
  const vistos = new Map(), cola = [], dirs = [];
  const meter = q => { cola.push(q); let i = cola.length - 1; while(i > 0){ const p = (i - 1) >> 1; if(cola[p].y <= cola[i].y) break; [cola[p], cola[i]] = [cola[i], cola[p]]; i = p; } };
  const sacar = () => { const top = cola[0], ult = cola.pop(); if(cola.length){ cola[0] = ult; let i = 0; for(;;){ const l = i*2 + 1, r2 = l + 1; let m = i;
    if(l < cola.length && cola[l].y < cola[m].y) m = l; if(r2 < cola.length && cola[r2].y < cola[m].y) m = r2; if(m === i) break; [cola[m], cola[i]] = [cola[i], cola[m]]; i = m; } } return top; };
  meter(desde);
  for(let i = 0; i < 28; i++) dirs.push(i/28*Math.PI*2);
  const clave = q => Math.round(q.x/4) + ',' + Math.round(q.y/4) + ',' + q.nx + ',' + q.ny;
  vistos.set(clave(desde), {q:desde, padre:null, camino:null});
  let llega = null, masAlto = desde.y, nodos = 0;
  while(cola.length && nodos < (maxNodos || 900)){
    const q = sacar(); nodos++;
    for(const a of dirs) for(const f of [0.5, 0.75, 1]){
      let vx = Math.cos(a)*V_MAX*f, vy = Math.sin(a)*V_MAX*f;
      if((q.nx || q.ny) && (vx*q.nx + vy*q.ny)/Math.hypot(vx, vy) < -0.05) continue;
      const o = {x:q.x + q.nx*0.02, y:q.y + q.ny*0.02, vx, vy}, pts = conCaminos ? [] : null; let res = null;
      for(let s = 0; s < 600; s++){ res = pasoCuerpo(o, 1/240, false); if(pts && s % 20 === 8) pts.push([o.x, o.y]);   /* el mismo paso que el juego */
        if(o.y < metaY){ res = {meta:true}; break; } if(res) break; if(o.y > (MAPA.piso + 1)*CEL) { res = {muere:'cae'}; break; } }
      if(!res || res.muere) continue;
      if(res.meta){ llega = {q, camino:pts, a, f}; break; }
      const nq = {x:o.x, y:o.y, nx:res.nx, ny:res.ny}, k = clave(nq);
      if(!vistos.has(k)){ vistos.set(k, {q:nq, padre:q, camino:pts, a, f}); meter(nq); if(nq.y < masAlto) masAlto = nq.y; }
    }
    if(llega) break;
  }
  return {llega:!!llega, final:llega, vistos, masAlto, nodos};
}
