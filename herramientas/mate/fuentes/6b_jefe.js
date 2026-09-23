/* ================================================================ LORD EARL GREY
   Tres fases. 1: abanico de balas y saltos entre plataformas. 2: además tira teteras que explotan al
   caer (y que se pueden reventar de un tiro en el aire: si le explota cerca, le duele) y llama refuerzos.
   3: furia, un anillo de balas y todo más rápido. Entre fase y fase se para, habla y no le entra nada. */
const JEFE = {e:null, fase:1, t:0, ciclo:0, pausa:0, frase:null, barra:0};
const PLAT_JEFE = [{x:5.5, y:9}, {x:23.5, y:9}, {x:14.5, y:13}, {x:6, y:4}, {x:14.5, y:4}, {x:23, y:4}];
function iniciarJefe(e){
  Object.assign(JEFE, {e, fase:1, t:0, ciclo:0, pausa:2.2, barra:0, frase:null}); e.dir = -1; e.est = 'alerta'; e.cd = 1.5;
  decir(e, tr('¿Un enmascarado con un mate? Qué vulgar.'), 3.2);
}
function decir(o, txt, t){ o.bocadillo = {txt, t:t || 3, n:0}; SON.fx(o === MATEO ? 'mateo' : 'risa_jefe'); }
function faseDe(e){ const k = e.vida/e.T.vida; return k > 0.66 ? 1 : k > 0.33 ? 2 : 3; }
function pasoJefe(e, dt){
  const J2 = JEFE; J2.t += dt; J2.barra += (e.vida/e.T.vida - J2.barra)*Math.min(1, dt*6);
  e.golpe = Math.max(0, (e.golpe || 0) - dt);
  if(!HE.muerto) e.dir = sig(HE.x - e.x) || e.dir;
  /* cambio de fase: se planta, habla, no le entra nada */
  const f = faseDe(e);
  if(f !== J2.fase){ J2.fase = f; J2.pausa = 2.4; e.invul = 2.4; e.aviso = 0; e.rafaga = 0; CAMARA.sacude = 1.6; SON.fx('risa_jefe'); SON.intensidad(f === 3 ? 1 : 0.7);
    decir(e, f === 2 ? tr('¡Suficiente! ¡Traigan las teteras!') : tr('¡Mi traje! ¡Esto es la GUERRA!'), 2.6);
    if(f === 2) for(const x of [3, 26.5]) { const m = crearEnemigo('maton', x, 16); m.est = 'alerta'; m.cd = 1.5; }
    if(f === 3) for(const x of [3, 26.5, 14.5]) { const m = crearEnemigo(x === 14.5 ? 'escopeta' : 'maton', x, 17); m.est = 'alerta'; m.cd = 1.8; } }
  e.invul = Math.max(0, (e.invul || 0) - dt);
  const r = moverCaja(e, dt, e.ancho/2, e.alto); e.vy -= GRAV*dt;
  if(r.piso){ e.vx *= Math.exp(-10*dt); if(e.saltando){ e.saltando = false; CAMARA.sacude = Math.max(CAMARA.sacude, 0.9); polvo(e.x, e.y, 14); SON.fx('aterriza', {tono:0.6}); } }
  if(J2.pausa > 0){ J2.pausa -= dt; return; }
  const rapido = f === 3 ? 1.45 : f === 2 ? 1.15 : 1;
  /* la ráfaga en curso */
  if(e.rafaga > 0){ e.tRaf = (e.tRaf || 0) - dt; if(e.tRaf <= 0){ enemigoTira(e); e.rafaga--; e.tRaf = 0.16/rapido; } return; }
  if(e.saltando) return;
  /* el aviso llena el círculo; al llenarse elige qué hace */
  e.aviso += dt*rapido/e.T.aviso;
  if(e.aviso < 1) return;
  e.aviso = 0; J2.ciclo++;
  const c = J2.ciclo;
  if(c % 3 === 0){ saltoJefe(e); return; }
  if(f >= 2 && c % 2 === 0){ tirarTetera(e); if(f === 3) setTimeout(() => { if(!e.muerto) tirarTetera(e); }, 380); return; }
  if(f === 3 && c % 4 === 1){ anilloDeBalas(e); return; }
  e.rafaga = f === 1 ? 1 : 2;
}
function saltoJefe(e){
  const op = PLAT_JEFE.filter(p => Math.abs(p.x - e.x) > 6 && Math.abs(p.x - HE.x) > 4);
  const p = elegir(op.length ? op : PLAT_JEFE), T = 1.05, dx = p.x - e.x, dy = p.y + 0.05 - e.y;
  e.vx = dx/T; e.vy = (dy + 0.5*GRAV*T*T)/T; e.saltando = true; e.y += 0.05; SON.fx('salto', {tono:0.55}); polvo(e.x, e.y, 10);
}
function tirarTetera(e){
  const boca = {x:e.x + e.dir*0.9, y:e.y + e.alto*0.8}, T = 1.0 + Math.random()*0.25, dx = HE.x - boca.x, dy = HE.y + 0.4 - boca.y;
  BALAS.push({x:boca.x, y:boca.y, vx:dx/T, vy:(dy + 0.5*18*T*T)/T, g:18, de:'enemigo', tetera:true, vida:4, rastro:[], giro:0});
  SON.fx('voltereta', {tono:0.7});
}
function anilloDeBalas(e){
  const n = 14, a0 = Math.random()*Math.PI*2, cx = e.x, cy = e.y + e.alto*0.6;
  for(let i = 0; i < n; i++){ const a = a0 + i*Math.PI*2/n; BALAS.push({x:cx + Math.cos(a)*0.8, y:cy + Math.sin(a)*0.8, vx:Math.cos(a)*8.5, vy:Math.sin(a)*8.5, de:'enemigo', vida:3, rastro:[]}); }
  flash(cx, cy, 1, '#ffb070', 10, 0.2, 12); SON.fx('escopeta', {tono:0.7}); CAMARA.sacude = Math.max(CAMARA.sacude, 0.8);
}
/* la tetera revienta: donde cae o donde le pegás */
function estallaTetera(b){
  flash(b.x, b.y, 1, '#ffb070', 14, 0.45, 12); SON.fx('explosion', {vol:0.8}); CAMARA.sacude = Math.max(CAMARA.sacude, 1.6); J.hitstop = 0.05;
  for(let i = 0; i < 30; i++){ const a = rv(0, Math.PI*2), v = rv(2, 10);
    PART.brillos.tirar(Object.assign({x:b.x, y:b.y, z:rv(-0.4, 0.4), vx:Math.cos(a)*v, vy:Math.sin(a)*v + 2, g:10, roce:2, vida:rv(0.25, 0.6), tam:rv(1, 3)}, rgb(['#ffe070', '#ff8a30', '#d8c8a0'][i % 3], 4)));
    PART.solidas.tirar(Object.assign({x:b.x, y:b.y, z:rv(-0.5, 0.5), vx:Math.cos(a)*v*0.3, vy:Math.sin(a)*v*0.3 + 1.5, g:-2, roce:1.2, vida:rv(0.8, 1.5), tam:rv(2, 4)}, rgb('#e8e0d0', 0.8))); }   /* el vapor del té */
  if(Math.hypot(HE.x - b.x, HE.y + 0.8 - b.y) < 2.3) herir(1, b.x, 'explosion');
  const e = JEFE.e; if(e && !e.muerto && b.reventada && Math.hypot(e.x - b.x, e.y + e.alto*0.5 - b.y) < 3.2 && !e.invul){ e.vida -= 3; e.golpe = 0.3; popup(e.x, e.y + e.alto + 0.8, tr('¡SU PROPIO TÉ!'), 'fuego'); J.puntos += 400*J.mult; J.estilo['¡SU PROPIO TÉ!'] = (J.estilo['¡SU PROPIO TÉ!'] || 0) + 1; if(e.vida <= 0) matar(e, {vx:e.x - b.x}, 'explosion'); }
  for(const o of ENEM) if(!o.muerto && o !== e && Math.hypot(o.x - b.x, o.y + 0.8 - b.y) < 2.6){ o.vida = 0; matar(o, {vx:o.x - b.x}, 'explosion'); }
}
function jefeMuere(e){
  J.killcam = 2.2; J.tsObj = 0.08; CAMARA.sacude = 2.5; P_FIN.u.destello.value = 0.6; SON.fx('explosion'); SON.musica(null);
  decir(e, tr('¡Nooo! ¡Mi hora del té!'), 3);
  for(const o of ENEM) if(!o.muerto && o !== e){ o.vida = 0; matar(o, {vx:o.x - e.x}); }
  for(const b of BALAS) if(b.de !== 'heroe') b.vida = 0;
  setTimeout(() => { if(J.modo === 'juego') arrancarCine('final'); }, 2600);
}
/* la barra del jefe y su nombre, arriba */
function dibujarBarraJefe(g){
  const e = JEFE.e; if(!e || !J.nivel || !J.nivel.jefe || e.muerto > 1.5) return;
  const w = Math.min(220, W - 120), x = Math.round(W/2 - w/2), y = H - 16;
  g.fillStyle = 'rgba(10,6,16,0.8)'; g.fillRect(x - 2, y - 2, w + 4, 8);
  g.fillStyle = '#4a1018'; g.fillRect(x, y, w, 4);
  g.fillStyle = e.invul > 0 ? '#e8e0d0' : '#e8283a'; g.fillRect(x, y, Math.round(w*Math.max(0, JEFE.barra)), 4);
  g.fillStyle = '#ff8a8a'; g.fillRect(x, y, Math.round(w*Math.max(0, JEFE.barra)), 1);
  for(const k of [1/3, 2/3]){ g.fillStyle = '#0a0610'; g.fillRect(x + Math.round(w*k), y, 1, 4); }
  texto(g, 'LORD EARL GREY', W/2, y - 13, 'oro');
}
/* la tetera en vuelo: pixel art de 7×6, gira */
const TETERA_SPR = ['..###..', '.#ooo#.', '#ooooo##', '#ooooo#.', '.#ooo#..', '..###...'];
function dibujarTetera(g, x, y, t){
  const flip = Math.floor(t*8) % 2;
  TETERA_SPR.forEach((f, j) => { for(let i = 0; i < f.length; i++){ const c = f[flip ? f.length - 1 - i : i]; if(c === '.') continue; g.fillStyle = c === '#' ? '#2a1a10' : j < 2 ? '#f0e0c0' : '#c8a878'; g.fillRect(Math.round(x - 4 + i), Math.round(y - 3 + j), 1, 1); } });
}
