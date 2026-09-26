/* ================================================================ el dibujo de la pelea
   Todo en el lienzo 2D: el fondo pintado (paralaje y clima por lugar), las manchas de sangre en el piso, las sombras,
   los dos luchadores (espejados cuando miran a la izquierda), la tinta de los golpes, los números, el HUD y los botones. */
const LUGARES = {
  aldea:{fondo:'f_aldea', clima:'brasas', tinte:'rgba(255,120,40,0.06)'},
  bambu:{fondo:'f_bambu', clima:'hojas', tinte:'rgba(0,0,0,0)'},
  templo:{fondo:'f_templo', clima:'nieve', tinte:'rgba(180,200,230,0.05)'},
  luna:{fondo:'f_luna', clima:'petalos', tinte:'rgba(160,0,0,0.07)'},
  yokai:{fondo:'f_yokai', clima:'fuegos', tinte:'rgba(40,120,160,0.08)'},
};
let LUGAR = 'bambu';
const CLIMA = [];
function climaPaso(dt, W, H){
  const L = LUGARES[LUGAR], tipo = L.clima, n = tipo === 'nieve' ? 70 : tipo === 'brasas' ? 55 : 30;
  while(CLIMA.length < n) CLIMA.push(nuevaParticula(tipo, W, H, true));
  for(let i = 0; i < CLIMA.length; i++){ const p = CLIMA[i]; p.t += dt; p.x += p.vx*dt; p.y += p.vy*dt; p.a += p.va*dt;
    if(p.tipo !== tipo || p.y > H + 20 || p.y < -30 || p.x < -40 || p.x > W + 40) CLIMA[i] = nuevaParticula(tipo, W, H, false); }
}
function nuevaParticula(tipo, W, H, cualquiera){
  const u = MED.u, p = {tipo, t:0, x:rv(-20, W + 20), y:cualquiera ? rv(0, H) : -10, vx:0, vy:0, a:rv(0, 6), va:rv(-2, 2), r:1};
  if(tipo === 'nieve'){ p.vx = rv(-18, -4)*u; p.vy = rv(22, 50)*u; p.r = rv(0.8, 2.4)*u; }
  else if(tipo === 'brasas'){ p.y = cualquiera ? rv(0, H) : H + 10; p.vx = rv(-10, 25)*u; p.vy = -rv(20, 70)*u; p.r = rv(0.8, 2)*u; }
  else if(tipo === 'hojas'){ p.vx = rv(-50, -15)*u; p.vy = rv(15, 40)*u; p.r = rv(2, 4)*u; }
  else if(tipo === 'petalos'){ p.vx = rv(-45, -10)*u; p.vy = rv(8, 30)*u; p.r = rv(1.5, 3.2)*u; }
  else { p.y = cualquiera ? rv(H*0.3, H) : H + 10; p.vx = rv(-8, 8)*u; p.vy = -rv(6, 18)*u; p.r = rv(2, 5)*u; }
  return p;
}
function climaDibujar(W, H){
  for(const p of CLIMA){
    if(p.tipo === 'nieve'){ g.fillStyle = 'rgba(245,248,255,0.85)'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
    else if(p.tipo === 'brasas'){ const k = 0.5 + 0.5*Math.sin(p.t*9 + p.a); g.fillStyle = `rgba(255,${140 + 80*k|0},60,${0.5 + 0.4*k})`; g.fillRect(p.x, p.y, p.r*1.4, p.r*1.4); }
    else if(p.tipo === 'hojas' || p.tipo === 'petalos'){ g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.tipo === 'hojas' ? 'rgba(30,34,26,0.8)' : 'rgba(190,30,30,0.85)';
      g.beginPath(); g.ellipse(0, 0, p.r*1.8, p.r*0.6, 0, 0, 7); g.fill(); g.restore(); }
    else { const k = 0.5 + 0.5*Math.sin(p.t*2 + p.a); const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*3); gr.addColorStop(0, `rgba(120,220,255,${0.5*k})`); gr.addColorStop(1, 'rgba(120,220,255,0)'); g.fillStyle = gr; g.fillRect(p.x - p.r*3, p.y - p.r*3, p.r*6, p.r*6); }
  }
}
/* el fondo tapa el alto y se corre con la cámara a un tercio */
function dibujarFondo(W, H, cam){
  const im = FONDOS[LUGARES[LUGAR].fondo]; g.fillStyle = '#16110d'; g.fillRect(0, 0, W, H);
  if(im){ const s = Math.max(H/im.height, W/im.width)*1.06, w = im.width*s, x = -lim(cam*MED.u*0.3, 0, Math.max(0, w - W)); g.drawImage(im, x, H - im.height*s, w, im.height*s); }
  const t = LUGARES[LUGAR].tinte; g.fillStyle = t; g.fillRect(0, 0, W, H);
  /* la niebla baja que pasa */
  const gr = g.createLinearGradient(0, H*0.62, 0, H); gr.addColorStop(0, 'rgba(230,220,200,0)'); gr.addColorStop(1, LUGAR === 'yokai' ? 'rgba(20,50,60,0.35)' : 'rgba(40,30,22,0.35)'); g.fillStyle = gr; g.fillRect(0, H*0.62, W, H*0.38);
}

/* ---------------------------------------------------------------- un luchador */
let _blanco = null;
function dibujarLuchador(e, cam){
  const q = cuadroDe(e), P = PJ[e.pj]; if(!q || !q.c || !P) return;
  const u = MED.u, s = e.T.alto*e.escala/P.meta.alto*u, x = (e.x - cam)*u, y = PISO*u;
  /* la sombra: más chica si salta o cae */
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y + 2*u, e.T.alto*0.26*e.escala*u, 7*u, 0, 0, 7); g.fill();
  g.save(); g.translate(x, y); if(e.dir < 0) g.scale(-1, 1);
  if(e.tint){ g.shadowColor = e.tint; g.shadowBlur = 16*u; }
  if(e.aturdido > 0 && Math.floor(RELOJ.real*8) % 2) g.globalAlpha = 0.85;
  g.drawImage(q.c, q.ox*s, q.oy*s, q.w*s, q.h*s);
  g.shadowBlur = 0;
  if(e.flash > 0){ /* el golpe: un destello blanco con la forma del cuerpo */
    if(!_blanco){ _blanco = document.createElement('canvas'); }
    const b = _blanco; if(b.width < q.w || b.height < q.h){ b.width = Math.max(b.width, q.w); b.height = Math.max(b.height, q.h); }
    const bx = b.getContext('2d'); bx.clearRect(0, 0, b.width, b.height); bx.globalCompositeOperation = 'source-over'; bx.drawImage(q.c, 0, 0);
    bx.globalCompositeOperation = 'source-atop'; bx.fillStyle = e === LUCHA.heroe ? '#ff4a3a' : '#fff'; bx.fillRect(0, 0, q.w, q.h);
    g.globalAlpha = lim(e.flash/0.12, 0, 1)*0.75; g.drawImage(b, 0, 0, q.w, q.h, q.ox*s, q.oy*s, q.w*s, q.h*s); }
  g.restore();
}

/* ---------------------------------------------------------------- la tinta de los golpes */
function dibujarFx(cam){
  const u = MED.u, L = LUCHA;
  for(const f of L.fx){ const x = (f.x - cam)*u, y = f.y*u, k = f.t/(f.vida || 0.5);
    if(f.tipo === 'gota'){ const t = f.t, px = x + f.vx*t*u, py = y + (f.vy*t + 700*t*t)*u; if(py > PISO*u + 4*u) continue;
      g.fillStyle = `rgba(120,6,8,${1 - k*0.4})`; g.beginPath(); g.arc(px, py, f.r*u, 0, 7); g.fill(); }
    else if(f.tipo === 'corte'){ const L2 = 120*u*(f.fuerte ? 1.5 : 1); g.save(); g.translate(x, y); g.rotate(f.ang); g.globalAlpha = 1 - k;
      g.strokeStyle = '#fff6e6'; g.lineWidth = (f.fuerte ? 6 : 3.5)*u*(1 - k); g.lineCap = 'round'; g.beginPath(); g.moveTo(-L2/2*(0.3 + k), 0); g.lineTo(L2/2*(0.3 + k), 0); g.stroke();
      g.strokeStyle = 'rgba(180,10,10,0.9)'; g.lineWidth = 1.6*u; g.beginPath(); g.moveTo(-L2/2*(0.3 + k), 2*u); g.lineTo(L2/2*(0.3 + k), 2*u); g.stroke(); g.restore(); }
    else if(f.tipo === 'tajoLargo'){ g.save(); g.translate(x, y); g.scale(f.dir, 1); g.globalAlpha = (1 - k)*0.95;
      const gr = g.createLinearGradient(-160*u, 0, 160*u, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, f.rojo ? 'rgba(200,20,20,0.95)' : 'rgba(255,250,235,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-170*u, 8*u); g.quadraticCurveTo(0, -30*u*(1 - k), 170*u, -4*u); g.quadraticCurveTo(0, -10*u, -170*u, 8*u); g.fill(); g.restore(); }
    else if(f.tipo === 'chispas'){ for(let i = 0; i < f.n; i++){ const a = i*2.39996 + f.x*0.01, v = (90 + (i*37 % 60))*u, px = x + Math.cos(a)*v*f.t*2, py = y + Math.sin(a)*v*f.t*2 + 300*f.t*f.t*u;
        g.strokeStyle = f.oro ? `rgba(255,${210 - (i % 3)*30},90,${1 - k})` : `rgba(255,240,200,${1 - k})`; g.lineWidth = 1.6*u; g.beginPath(); g.moveTo(px, py); g.lineTo(px - Math.cos(a)*6*u, py - Math.sin(a)*6*u); g.stroke(); } }
    else if(f.tipo === 'anillo'){ g.strokeStyle = `rgba(255,236,190,${1 - k})`; g.lineWidth = 3*u*(1 - k); g.beginPath(); g.arc(x, y, (10 + 70*k)*u, 0, 7); g.stroke(); }
    else if(f.tipo === 'destello'){ const r = (18 + 10*Math.sin(k*3.14))*u; g.save(); g.translate(x, y); g.globalAlpha = Math.sin(k*3.14); g.fillStyle = '#fff';
      g.beginPath(); for(let i = 0; i < 8; i++){ const a = i*Math.PI/4, rr = i % 2 ? r*0.18 : r; g.lineTo(Math.cos(a)*rr, Math.sin(a)*rr); } g.fill(); g.restore(); }
    else if(f.tipo === 'kanjiAviso'){ const e = f.e, xx = ((e ? e.x : f.x) - cam)*u, pul = 1 + 0.12*Math.sin(f.t*22);
      g.save(); g.translate(xx, y); g.scale(pul, pul); g.font = `900 ${42*u}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = '#ff2010'; g.shadowBlur = 18*u; g.fillStyle = '#e8141a'; g.fillText('殺', 0, 0); g.shadowBlur = 0; g.lineWidth = 1.5*u; g.strokeStyle = '#3a0000'; g.strokeText('殺', 0, 0); g.restore(); }
    else if(f.tipo === 'aturdido'){ g.save(); g.translate(x, y); g.globalAlpha = Math.min(1, (1 - k)*3);
      for(let i = 0; i < 3; i++){ const a = f.t*4 + i*2.09; g.fillStyle = '#ffd24a'; g.font = `900 ${14*u}px serif`; g.textAlign = 'center'; g.fillText('✦', Math.cos(a)*26*u, Math.sin(a)*8*u); } g.restore(); }
    else if(f.tipo === 'estela'){ g.fillStyle = `rgba(250,244,230,${0.45*(1 - k)})`; g.fillRect(x - f.dir*110*u, y - 2*u, 110*u*f.dir, 3*u); g.fillStyle = `rgba(180,10,10,${0.4*(1 - k)})`; g.fillRect(x - f.dir*80*u, y + 20*u, 80*u*f.dir, 2*u); }
    else if(f.tipo === 'kanji'){ g.save(); g.globalAlpha = Math.sin(Math.min(1, k)*3.14)*0.9; g.font = `900 ${110*u}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#1a0806'; g.fillText(f.k, x + 4*u, y + 4*u); g.fillStyle = '#c8161a'; g.fillText(f.k, x, y); g.restore(); }
  }
}
function dibujarManchas(cam){ const u = MED.u; for(const m of LUCHA.manchas){ g.save(); g.translate((m.x - cam)*u, (PISO + 3)*u); g.rotate(m.rot); g.fillStyle = `rgba(90,4,6,${m.a})`;
  g.beginPath(); g.ellipse(0, 0, m.w*u/2, m.h*u/2, 0, 0, 7); g.fill(); g.restore(); } }
function dibujarNumeros(cam){ const u = MED.u;
  for(const n of LUCHA.numeros){ const k = n.t/1.1, x = (n.x - cam)*u, y = (n.y - 40*k)*u, esc = 1 + Math.max(0, 0.4 - n.t)*1.5;
    g.save(); g.translate(x, y); g.scale(esc, esc); g.globalAlpha = 1 - Math.max(0, k - 0.6)/0.4; g.font = `900 ${22*u}px Georgia, serif`; g.textAlign = 'center';
    g.lineWidth = 4*u; g.strokeStyle = '#140806'; g.strokeText(miles(n.n), 0, 0); g.fillStyle = n.color; g.fillText(miles(n.n), 0, 0); g.restore(); } }

/* ---------------------------------------------------------------- el HUD */
function barra(x, y, w, h, k, col, fondo){ g.fillStyle = fondo || 'rgba(0,0,0,0.55)'; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = col; g.fillRect(x, y, w*lim(k, 0, 1), h); }
function textoContorno(t, x, y, tam, col, al){ g.font = `900 ${tam}px Georgia, serif`; g.textAlign = al || 'left'; g.lineWidth = tam*0.18; g.strokeStyle = 'rgba(10,6,4,0.9)'; g.strokeText(t, x, y); g.fillStyle = col || '#f4ead6'; g.fillText(t, x, y); }
function dibujarHUD(W, H){
  const u = MED.u, L = LUCHA, Hh = L.heroe, E = L.enemigo;
  /* el héroe arriba a la izquierda */
  textoContorno(tr('RŌNIN'), 18*u, 26*u, 14*u, '#f4ead6');
  barra(18*u, 32*u, 220*u, 10*u, Hh.vida/Hh.vidaMax, '#c8201c'); textoContorno(miles(Hh.vida), 242*u, 41*u, 11*u, '#f4ead6');
  barra(18*u, 45*u, 160*u, 5*u, Hh.post/Hh.postMax, '#e6b830');
  /* el enemigo: si es jefe, su nombre al medio arriba */
  if(E){ const jefe = E.T.jefe, bw = jefe ? 360*u : 200*u, bx = jefe ? W/2 - bw/2 : W - bw - 62*u, by = jefe ? 48*u : 32*u;
    textoContorno(jefe ? '~ ' + tr(E.T.nombre) + ' ~' : tr(E.T.nombre) + (E.elite ? ' · ' + tr('élite') : ''), jefe ? W/2 : W - 62*u, by - 7*u, (jefe ? 13 : 12)*u, jefe ? '#ff5a4a' : '#f4ead6', jefe ? 'center' : 'right');
    barra(bx, by, bw, (jefe ? 9 : 8)*u, E.vida/E.vidaMax, '#c8201c'); barra(bx + bw*0.15, by + 12*u, bw*0.7, 4*u, E.post/E.postMax, '#e6b830'); }
  /* la etapa */
  if(JUEGO.etiqueta) textoContorno(JUEGO.etiqueta, W/2, 22*u, 11*u, 'rgba(244,234,214,0.9)', 'center');
  /* el texto grande del momento */
  if(L.texto && L.textoT > 0){ const k = L.textoT, a = Math.min(1, k*3), esc = 1 + Math.max(0, k - (k > 1 ? 1 : 0.7))*0.6;
    g.save(); g.globalAlpha = a; g.translate(W/2, H*0.32); g.scale(esc, esc); textoContorno(L.texto.txt, 0, 0, 30*u, L.texto.color, 'center'); g.restore(); }
  if(L.distorsion > 0){ g.fillStyle = `rgba(40,60,140,${0.12 + 0.05*Math.sin(RELOJ.real*3)})`; g.fillRect(0, 0, W, H); }
  if(L.conc > 0) textoContorno(tr('CONCENTRACIÓN') + ' ×' + L.conc, 18*u, 66*u, 11*u, '#ff5a4a');
  dibujarBotones(W, H);
}
/* ---------------------------------------------------------------- los botones, dibujados en tinta */
function dibujarBotones(W, H){
  const u = MED.u, r1 = 46*u, r2 = 33*u, r3 = 27*u, ab = H - 64*u;
  ENT.zonas = [{id:'izq', x:66*u, y:ab, r:r1}, {id:'der', x:176*u, y:ab, r:r1},
    {id:'ataque', x:W - 72*u, y:ab, r:r1*1.05}, {id:'guardia', x:W - 180*u, y:ab + 10*u, r:r2*1.15}, {id:'esquive', x:W - 158*u, y:ab - 88*u, r:r3},
    {id:'habilidad', x:W - 72*u, y:ab - 104*u, r:r2}, {id:'pausa', x:W - 34*u, y:26*u, r:18*u}];
  for(const z of ENT.zonas){ const vivo = RELOJ.t - (z.t || -9) < 0.15 || (z.id === 'izq' && ENT.izq) || (z.id === 'der' && ENT.der) || (z.id === 'guardia' && ENT.guardia);
    g.save(); g.translate(z.x, z.y);
    g.fillStyle = vivo ? 'rgba(160,20,20,0.55)' : 'rgba(12,8,6,0.42)'; g.beginPath(); g.arc(0, 0, z.r, 0, 7); g.fill();
    g.strokeStyle = vivo ? 'rgba(255,220,200,0.9)' : 'rgba(240,228,206,0.55)'; g.lineWidth = 2*u; g.beginPath(); g.arc(0, 0, z.r - 2*u, 0.2, 6.1); g.stroke();
    g.fillStyle = '#f0e6d2'; g.strokeStyle = '#f0e6d2';
    if(z.id === 'izq' || z.id === 'der'){ const s = z.id === 'izq' ? -1 : 1; g.beginPath(); g.moveTo(s*16*u, 0); g.lineTo(-s*8*u, -16*u); g.lineTo(-s*8*u, 16*u); g.fill(); }
    else if(z.id === 'ataque'){ g.rotate(-0.7); g.fillRect(-2*u, -30*u, 4*u, 40*u); g.fillRect(-9*u, 9*u, 18*u, 3*u); g.fillStyle = '#8a1a14'; g.fillRect(-3*u, 12*u, 6*u, 14*u); }
    else if(z.id === 'guardia'){ /* el tomoe */ for(let i = 0; i < 3; i++){ g.rotate(2.094); g.beginPath(); g.arc(0, -8*u, 6*u, 0, 7); g.fill(); g.beginPath(); g.moveTo(6*u, -8*u); g.quadraticCurveTo(12*u, 8*u, -4*u, 12*u); g.lineWidth = 3*u; g.stroke(); } }
    else if(z.id === 'esquive'){ g.lineWidth = 3*u; g.beginPath(); g.arc(0, 0, 11*u, 3.6, 8.2); g.stroke(); g.beginPath(); g.moveTo(-14*u, 4*u); g.lineTo(-8*u, -3*u); g.lineTo(-4*u, 6*u); g.fill(); }
    else if(z.id === 'habilidad'){ const k = LUCHA.ki, h = heroeStats().hab; g.strokeStyle = k >= 1 ? '#ff3a2a' : '#e6b830'; g.lineWidth = 4*u; g.beginPath(); g.arc(0, 0, z.r + 3*u, -Math.PI/2, -Math.PI/2 + k*6.283); g.stroke();
      g.font = `900 ${24*u}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = k >= 1 ? (Math.floor(RELOJ.real*4) % 2 ? '#ff3a2a' : '#fff') : 'rgba(240,230,210,0.5)'; g.fillText(HABILIDADES[h].kanji, 0, 1*u); }
    else if(z.id === 'pausa'){ g.fillRect(-6*u, -8*u, 4*u, 16*u); g.fillRect(2*u, -8*u, 4*u, 16*u); }
    g.restore(); }
}

/* ---------------------------------------------------------------- el cuadro entero */
function dibujarPelea(dt){
  const W = MED.w, H = MED.h, L = LUCHA; g.setTransform(MED.dpr, 0, 0, MED.dpr, 0, 0);
  const sx = L.sacudida ? rv(-1, 1)*L.sacudida*0.6*MED.u : 0, sy = L.sacudida ? rv(-1, 1)*L.sacudida*0.4*MED.u : 0;
  g.save(); g.translate(sx, sy);
  dibujarFondo(W, H, L.cam); climaPaso(dt, W, H); climaDibujar(W, H); dibujarManchas(L.cam);
  const orden = [L.enemigo, L.heroe].filter(Boolean); if(L.heroe && L.heroe.estado === 'relampago') orden.reverse();
  for(const e of orden) dibujarLuchador(e, L.cam);
  dibujarFx(L.cam); dibujarNumeros(L.cam);
  g.restore();
  if(L.lento > 0.2){ g.fillStyle = `rgba(20,10,6,${0.25*L.lento})`; g.fillRect(0, 0, W, H); }
  dibujarHUD(W, H);
}
