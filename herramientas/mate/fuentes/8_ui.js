
/* ================================================================ cargar un nivel */
function cargarNivel(i){
  const def = NIVELES[i]; J.idx = i; J.nivel = def;
  for(const e of ENEM) esc.remove(e.malla, e.brazo); for(const o of OBJ) esc.remove(o.malla); if(MATEO){ esc.remove(MATEO.malla, MATEO.luz); }
  ENEM = []; BALAS = []; OBJ = []; J.textos = []; J.fin = null; J.cine = null;
  Object.assign(J, {puntos:0, mult:1, multT:0, muertes:0, tiros:0, aciertos:0, danio:0, reloj:0, killcam:0, vidrio:0, estilo:{}, pista:0});
  armarNivel(def);
  const A = NIVEL.alto; let ini = {x:2, y:3};
  NIVEL.vidrios = [];
  for(let f = 0; f < A; f++) for(let c = 0; c < NIVEL.ancho; c++){ const t = NIVEL.mapa[f][c], x = c + 0.5, y = A - 1 - f;
    if(t === 'P'){ ini = {x, y}; NIVEL.mapa[f][c] = '.'; }
    else if({m:'maton', e:'escopeta', p:'pesado', t:'tirador', J:'jefe'}[t]){ crearEnemigo({m:'maton', e:'escopeta', p:'pesado', t:'tirador', J:'jefe'}[t], x, y); NIVEL.mapa[f][c] = '.'; }
    else if(t === 'o' || t === 'c'){ const tipo = t === 'o' ? 'garrafa' : 'chapa', m = hacerSprite(HOJAS.obj[tipo], {pie:0});
      const yy = tipo === 'chapa' ? y + 0.6 : y; m.position.set(x, yy, 0.2); esc.add(m); OBJ.push({tipo, x, y:tipo === 'garrafa' ? y + 0.5 : yy + 0.45, malla:m, vivo:true, giro:0}); NIVEL.mapa[f][c] = '.'; }
    else if(t === 'D'){ const m = hacerSprite(HOJAS.obj.puerta, {pie:0}); m.position.set(x, y, -0.2); esc.add(m); OBJ.push({tipo:'puerta', x, y, malla:m, vivo:true});
      NIVEL.lamparas.push({x, y:y + 1.2, z:1, col:'#5ad87a', f:1.6}); }
    else if(t === 'V' && (f === 0 || NIVEL.mapa[f - 1][c] !== 'V')){ let y0 = y; while(NIVEL.mapa[A - 1 - (y0 - 1)] && NIVEL.mapa[A - 1 - (y0 - 1)][c] === 'V') y0--;
      const alto = y - y0 + 1, vid = new THREE.Mesh(new THREE.BoxBufferGeometry(0.12, alto, 2.4), new THREE.MeshStandardMaterial({color:new THREE.Color('#9ad0ff').convertSRGBToLinear(), transparent:true, opacity:0.32, roughness:0.05, metalness:0.2, emissive:new THREE.Color(0.02, 0.05, 0.08)}));
      vid.position.set(x, y0 + alto/2, -0.2); NIVEL.grupo.add(vid); NIVEL.vidrios.push({cx:c, y0, y1:y, malla:vid}); }
    else if(t === '^'){ const m = alambre(); m.position.set(x, y + 0.25, 0); NIVEL.grupo.add(m); }
  }
  crearHeroe(ini.x, ini.y);
  JEFE.e = null; if(def.jefe){ const je = ENEM.find(e => e.tipo === 'jefe'); if(je) iniciarJefe(je); }
  const m = hacerSprite(HOJAS.mateo, {pie:0, brillo:1.5}); m.castShadow = false; esc.add(m);
  const luz = new THREE.PointLight(0x9aff7a, 0.7, 4, 1.6); esc.add(luz);
  MATEO = {malla:m, luz, x:ini.x - 1, y:ini.y + 2, t:0, bocadillo:null};
  CAMARA.x = CAMARA.obj.x = ini.x + 3; CAMARA.y = CAMARA.obj.y = ini.y + 1.5;
  J.modo = 'juego'; J.fundir = 1; P_FIN.u.fundido.value = 1;
  SON.musica(def.jefe ? 'jefe' : def.cap); J.check = {x:ini.x, y:ini.y + 0.1}; J.caidas = 0;
}
function alambre(){
  const [c, g] = lienzo(16, 8); for(let x = 0; x < 16; x++){ const y = 4 + Math.round(Math.sin(x*0.8)*2); px(g, x, y, '#8a8a92'); if(x % 4 === 1){ px(g, x, y - 1, '#c8c8d0'); px(g, x, y + 1, '#c8c8d0'); px(g, x + 1, y - 2, '#5a5a62'); } }
  const t = texPixel(c); const m = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 0.5), new THREE.MeshStandardMaterial({map:t, alphaTest:0.5, side:THREE.DoubleSide, metalness:0.6, roughness:0.4}));
  return m;
}
function terminarNivel(){
  if(J.sim){ J.simFin = 1; return; }
  J.fin = {t:0}; SON.fx('puerta'); J.killcam = 0;
  const p = NIVEL.def.estrellas; J.fin.estrellas = J.puntos >= p[2] ? 3 : J.puntos >= p[1] ? 2 : J.puntos >= p[0] ? 1 : 0;
  setTimeout(() => pantallaResultado(), 900);
}

/* ================================================================ entrada: arrastrar para planear, tocar para tirar */
const DEDOS = new Map();
function aPx(ev){ const r = stage.getBoundingClientRect(); const [sx, sy] = aStage(ev.clientX, ev.clientY); return aLienzo(sx, sy); }
stage.addEventListener('pointerdown', ev => {
  SON.arrancar();
  const [x, y] = aPx(ev);
  if(J.cine){ avanzarCine(x, y); return; }
  if(uiActiva()){ uiDown(x, y); DEDOS.set(ev.pointerId, {tipo:'ui'}); return; }
  if(J.modo !== 'juego') return;
  if(Math.abs(x - W/2) < 14 && y < 20){ pausar(); return; }
  const b = blancoEn(x, y);
  if(b && !J.fin){ disparar(b); DEDOS.set(ev.pointerId, {tipo:'tiro', b, t:0}); return; }
  if(puedePlanear() && ![...DEDOS.values()].some(d => d.tipo === 'plan')){ DEDOS.set(ev.pointerId, {tipo:'plan', x0:x, y0:y, x, y}); J.planeo = DEDOS.get(ev.pointerId); SON.fx('planeo'); }
});
addEventListener('pointermove', ev => { const d = DEDOS.get(ev.pointerId); if(!d || d.tipo !== 'plan') return; const [x, y] = aPx(ev); d.x = x; d.y = y; });
function soltarDedo(ev, cancela){
  SON.arrancar();
  const d = DEDOS.get(ev.pointerId); if(!d) return; DEDOS.delete(ev.pointerId);
  if(d.tipo === 'ui'){ if(!cancela){ const [x, y] = aPx(ev); uiUp(x, y); } else UI.presion = null; return; }
  if(d.tipo === 'plan'){ J.planeo = null; if(!cancela && puedePlanear()) ejecutarPlaneo((d.x - d.x0)/TX, -(d.y - d.y0)/TX); }
}
addEventListener('pointerup', ev => soltarDedo(ev, false)); addEventListener('pointercancel', ev => soltarDedo(ev, true));
addEventListener('blur', () => { DEDOS.clear(); J.planeo = null; });
addEventListener('keydown', ev => { if(ev.code === 'Escape' && J.modo === 'juego') pausar(); });
document.addEventListener('visibilitychange', () => { if(document.hidden && J.modo === 'juego' && !J.pausa) pausar(); });
function pasoDedos(dtR){ for(const d of DEDOS.values()) if(d.tipo === 'tiro'){ d.t += dtR; const o = d.b.cosa; if(d.t > 0.16 && !o.muerto && o.vivo !== false && !(o.tetera && o.vida <= 0)){ d.t = 0; disparar(d.b); } } }

/* ================================================================ el lazo */
let ultimo = 0;
function lazo(ts){
  requestAnimationFrame(lazo);
  const dtR = Math.min(0.05, Math.max(0, (ts - (ultimo || ts))/1000)); ultimo = ts; J.tr += dtR;
  if(J.modo === 'juego' && !J.pausa && !J.cine){
    /* la cámara lenta: planeo, la última baja, el vidrio, el aire con enemigos a la vista */
    let obj = 1;
    const alertas = ENEM.some(e => !e.muerto && e.est === 'alerta' && enPantalla(e.x, e.y));
    if(HE.muerto) obj = 0.3; else if(J.planeo) obj = 0.12; else if(J.killcam > 0) obj = 0.12; else if(J.vidrio > 0) obj = 0.2;
    else if(alertas && (HE.est === 'aire' || HE.est === 'pared' || HE.est === 'desliza')) obj = 0.3;
    if(J.fin) obj = 0.35;
    J.tsObj = obj; J.ts += (obj - J.ts)*(1 - Math.exp(-dtR*(obj < J.ts ? 16 : 5)));
    J.killcam = Math.max(0, J.killcam - dtR); J.vidrio = Math.max(0, J.vidrio - dtR);
    let dt = dtR*J.ts; if(J.hitstop > 0){ J.hitstop -= dtR; dt = 0; }
    J.t += dt; J.reloj += dt;
    const pasos = Math.max(1, Math.ceil(dt/(1/120)));
    for(let i = 0; i < pasos; i++){ const d = dt/pasos; pasoHeroe(d); pasoEnemigos(d); pasoBalas(d); }
    PART.solidas.paso(dt); PART.brillos.paso(dt); pasoFlashes(dt); pasoDedos(dtR);
    J.multT -= dtR; if(J.multT <= 0) J.mult = 1;
    for(const t of J.textos){ t.t -= dtR; t.y += dtR*0.8; } J.textos = J.textos.filter(t => t.t > 0);
    pasoPistas(dtR);
    if(HE.vida === 1 && !HE.muerto){ J.latido = (J.latido || 0) - dtR; if(J.latido <= 0){ J.latido = 0.9; SON.fx('corazon'); } }
    /* el último lugar seguro, para reaparecer */
    if(HE.est === 'suelo' && !HE.muerto && !ENEM.some(e => !e.muerto && e.est === 'alerta') && celda(HE.x, HE.y - 0.5) !== '^'){ J.check = {x:HE.x, y:HE.y + 0.1}; }
    SON.intensidad(lim((alertas ? 0.5 : 0.15) + (J.mult - 1)*0.08 + (J.nivel.jefe ? 0.3 : 0), 0, 1));
    CAMARA.obj.x = lim(HE.x + HE.dir*1.6 + HE.vx*0.12, W/TX/2 - 1, NIVEL.ancho - W/TX/2 + 1); CAMARA.obj.y = Math.max(HE.y + 2, H/TX/2 - 1.2);
    CAMARA.zoom += ((J.ts < 0.5 ? 1.07 : 1) - CAMARA.zoom)*(1 - Math.exp(-dtR*3));
    P_FIN.u.lento.value = lim((1 - J.ts)*1.15, 0, 1); P_FIN.u.planeo.value += ((J.planeo ? 1 : 0) - P_FIN.u.planeo.value)*(1 - Math.exp(-dtR*10));
    SON.lento(lim((1 - J.ts)/0.88, 0, 1));
  }
  P_FIN.u.herido.value = Math.max(0, P_FIN.u.herido.value - dtR*2.2); P_FIN.u.destello.value = Math.max(0, P_FIN.u.destello.value - dtR*3);
  if(J.fundir !== undefined){ const obj = J.fundirA || 0; P_FIN.u.fundido.value += (obj - P_FIN.u.fundido.value)*(1 - Math.exp(-dtR*4)); }
  pasoMundo(dtR*(J.pausa ? 0 : J.ts), J.tr);
  if(J.cine) pasoCine(dtR);
  if((J.modo !== 'juego' || J.cine) && !J.pausa){ PART.solidas.paso(dtR); PART.brillos.paso(dtR); pasoFlashes(dtR); }
  if(J.modo === 'menu'){ CAMARA.obj.x = 15 + Math.sin(J.tr*0.06)*5; CAMARA.obj.y = 8.2 + Math.sin(J.tr*0.09)*0.6; HE.est = 'suelo'; HE.vx = 0; }
  moverCamara(dtR*J.ts, dtR);
  dibujarEntidades(J.pausa ? 0 : dtR*J.ts);
  try { dibujarTodo(J.tr); } catch(e){ if(!lazo.err){ lazo.err = e; console.error(e); } }
  dibujarHUD(dtR);
  SON.paso(dtR);
}

/* ================================================================ HUD en píxeles */
function corazon(g, x, y, lleno, col){ const f = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  for(let j = 0; j < f.length; j++) for(let i = 0; i < 7; i++) if(f[j][i] === '#'){ g.fillStyle = lleno ? (j < 2 && i < 3 ? '#ff8a8a' : col || '#e8283a') : '#3a2a3a'; g.fillRect(x + i, y + j, 1, 1); }
  g.fillStyle = K; }
function anillo(g, x, y, r, frac, col){ const n = Math.ceil(r*7); for(let i = 0; i < n; i++){ const a = -Math.PI/2 - (i/n)*Math.PI*2; if(i/n > frac) break;
  g.fillStyle = K; g.fillRect(Math.round(x + Math.cos(a)*r) + 1, Math.round(y + Math.sin(a)*r) + 1, 1, 1);
  g.fillStyle = col; g.fillRect(Math.round(x + Math.cos(a)*r), Math.round(y + Math.sin(a)*r), 1, 1); } }
function dibujarHUD(dtR){
  const g = cxHUD; g.clearRect(0, 0, W, H);
  if(J.cine){ dibujarCine(g, dtR); return; }
  if(J.modo === 'menu'){ dibujarMenu(g, dtR); return; }
  dibujarJuegoHUD(g, dtR);
  if(uiActiva()) dibujarMenu(g, dtR);
}
function dibujarJuegoHUD(g, dtR){
  /* el cartel del nivel al entrar: una franja que cruza con el número y el nombre */
  if(J.banner !== undefined && J.banner < 3 && J.nivel){ J.banner += dtR; const t = J.banner, k = t < 0.5 ? suave(t/0.5) : t > 2.4 ? 1 - suave((t - 2.4)/0.6) : 1;
    const h = 26, y = H - h - 14, x = Math.round(lerp(-W, 0, k));
    g.fillStyle = 'rgba(6,4,12,0.8)'; g.fillRect(x, y, W, h); g.fillStyle = '#b81c2c'; g.fillRect(x, y, W, 1); g.fillRect(x, y + h - 1, W, 1);
    texto(g, J.nivel.id, x + W/2, y + 3, 'oro'); texto(g, tr(J.nivel.nombre), x + W/2, y + 13, 'blanco'); }
  /* la trayectoria del planeo */
  if(J.planeo){ const d = J.planeo, tr = trayectoria((d.x - d.x0)/TX, -(d.y - d.y0)/TX);
    const n = tr.pts.length;
    tr.pts.forEach((p, i) => { const q = aPantalla(p.x, p.y), X = Math.round(q.x), Y = Math.round(q.y);
      if(p.fin){ anillo(g, q.x, q.y, 4, 1, '#0a0610'); anillo(g, q.x, q.y, 3, 1, '#ffffff'); return; }
      if(i % 2) return; const a = 1 - i/n*0.7, s2 = tr.desliza ? 1 : 2;
      g.fillStyle = 'rgba(10,6,16,' + a*0.8 + ')'; g.fillRect(X, Y + 1, s2 + 1, s2);
      g.fillStyle = 'rgba(255,255,255,' + a + ')'; g.fillRect(X, Y, s2, s2); });
    /* la cuerda: del apoyo al dedo */
    const L = Math.hypot(d.x - d.x0, d.y - d.y0);
    for(let i = 0; i < L; i += 3){ const X = Math.round(d.x0 + (d.x - d.x0)*i/L), Y = Math.round(d.y0 + (d.y - d.y0)*i/L); g.fillStyle = 'rgba(255,220,120,0.55)'; g.fillRect(X, Y, 1, 1); }
    anillo(g, d.x0, d.y0, 3, 1, 'rgba(255,255,255,0.6)'); g.fillStyle = '#ffd86a'; g.fillRect(Math.round(d.x) - 1, Math.round(d.y) - 1, 2, 2); }
  /* los enemigos: el círculo que se vacía, los corazones y el láser del tirador */
  for(const e of ENEM){ if(e.muerto || !enPantalla(e.x, e.y)) continue; const c = aPantalla(e.x, e.y + e.alto + 0.35);
    if(e.est === 'alerta'){ const col = e.T.rojo ? '#ff3a3a' : '#ffffff'; anillo(g, c.x, c.y - 4, 5, 1 - e.aviso, col);
      if(e.tipo === 'tirador' && e.cd <= 0){ const a = aPantalla(e.brazo.position.x, e.brazo.position.y), b = aPantalla(HE.x, HE.y + 1);
        const n = Math.hypot(b.x - a.x, b.y - a.y); for(let i = 0; i < n; i += 2){ g.fillStyle = 'rgba(255,40,40,' + (0.35 + e.aviso*0.5) + ')'; g.fillRect(Math.round(a.x + (b.x - a.x)*i/n), Math.round(a.y + (b.y - a.y)*i/n), 1, 1); } } }
    if(e.vida < e.T.vida || e.est === 'alerta') for(let i = 0; i < e.vida && i < 6; i++){ g.fillStyle = '#e8283a'; g.fillRect(Math.round(c.x - e.vida*2 + i*4), Math.round(c.y + 3), 3, 2); } }
  /* balas: el rastro en píxeles, brillante */
  for(const b of BALAS){ if(b.tetera){ const q = aPantalla(b.x, b.y); dibujarTetera(g, q.x, q.y, b.giro); continue; } const a = aPantalla(b.x, b.y), z = b.rastro[b.rastro.length - 1] ? aPantalla(b.rastro[b.rastro.length - 1].x, b.rastro[b.rastro.length - 1].y) : a;
    const n = Math.max(1, Math.hypot(a.x - z.x, a.y - z.y)); g.fillStyle = b.de === 'heroe' ? '#fff4b0' : '#ff7a4a';
    for(let i = 0; i <= n; i++) g.fillRect(Math.round(z.x + (a.x - z.x)*i/n), Math.round(z.y + (a.y - z.y)*i/n), 1, 1);
    if(b.de !== 'heroe'){ g.fillStyle = '#ffd0a0'; g.fillRect(Math.round(a.x) - 1, Math.round(a.y) - 1, 3, 3); } }
  /* textos que suben */
  for(const t of J.textos){ const p = aPantalla(t.x, t.y); g.globalAlpha = Math.min(1, t.t*2); texto(g, t.txt, Math.round(p.x), Math.round(p.y) - 6, t.grad); g.globalAlpha = 1; }
  /* Mateo habla */
  if(MATEO) dibujarBocadillo(g, MATEO, 0.7, '#9ad87a', dtR);
  if(JEFE.e && J.nivel && J.nivel.jefe) dibujarBocadillo(g, JEFE.e, JEFE.e.alto + 0.9, '#e8283a', dtR);
  dibujarBarraJefe(g);
  /* corazones, puntos y multiplicador */
  for(let i = 0; i < 3; i++) corazon(g, 6 + i*9, 6, i < HE.vida);
  texto(g, String(J.puntos), W - 6, 5, 'oro', {der:true});
  if(J.mult > 1){ texto(g, '×' + J.mult, W - 6, 16, J.mult >= 5 ? 'fuego' : 'blanco', {der:true}); g.fillStyle = '#f2c14e'; g.fillRect(W - 6 - Math.round(30*J.multT/4), 27, Math.round(30*J.multT/4), 1); }
  /* pausa */
  g.fillStyle = 'rgba(10,6,16,0.6)'; g.fillRect(W/2 - 7, 4, 14, 11); g.fillStyle = '#efe6d2'; g.fillRect(W/2 - 3, 6, 2, 7); g.fillRect(W/2 + 1, 6, 2, 7);
}
function dibujarBocadillo(g, o, alto, col, dtR){
  const b = o.bocadillo; if(!b || b.t <= 0) return; b.t -= dtR; b.n = Math.min(b.txt.length, (b.n || 0) + dtR*38);
  const p = aPantalla(o.x, o.y + alto), lineas = partir(b.txt.slice(0, Math.floor(b.n)), 30), w = Math.max(...lineas.map(l => l.length))*6 + 8, h = lineas.length*9 + 6;
  const x = Math.round(lim(p.x - w/2, 4, W - w - 4)), y = Math.round(lim(p.y - h - 6, 20, H - h - 22));
  g.fillStyle = 'rgba(10,6,16,0.84)'; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
  const px2 = Math.round(lim(p.x, x + 4, x + w - 5)); g.fillRect(px2, y + h, 3, 1); g.fillRect(px2 + 1, y + h + 1, 1, 1);
  lineas.forEach((l, i) => texto(g, l, x + 4, y + 2 + i*9, 'blanco', {izq:true}));
}
function partir(txt, n){ const pal = txt.split(' '), l = ['']; for(const p of pal){ if((l[l.length - 1] + ' ' + p).trim().length > n) l.push(p); else l[l.length - 1] = (l[l.length - 1] + ' ' + p).trim(); } return l; }
function pasoPistas(dtR){ const P2 = J.nivel.pistas || []; if(J.pista < P2.length && HE.x >= P2[J.pista].x){ MATEO.bocadillo = {txt:tr(P2[J.pista].txt), t:5.5, n:0}; SON.fx('mateo'); J.pista++; } }

/* ================================================================ sondas del banco */
window.__M = {J, HE, SON, HOJAS, cam, THREE, renderer, dibujarTodo, dibujarHUD, dibujarEntidades, pasoMundo, esc, PART, LUZ, POST, LUCES_NIVEL, LUCES_FLASH, NIVELref:() => NIVEL, MATEO:() => MATEO, get ENEM(){ return ENEM; }, get BALAS(){ return BALAS; }, get OBJ(){ return OBJ; }, NIVEL, CAMARA, medida:() => ({W, H, PX, DPR, SW, SH, GIRADO}),
  nivel:i => cargarNivel(i || 0), jugar:(i, c) => empezarNivel(i || 0, !!c), get UI(){ return UI; }, cine:n => arrancarCine(n), saltarCine:() => saltearCine(), get PROG(){ return PROG; }, planear:(dx, dy) => ejecutarPlaneo(dx, dy), trayectoria, blancoEn, disparar, aPantalla,
  info:() => ({llamadas:renderer.info.render.calls, tris:renderer.info.render.triangles, prog:renderer.info.programs.length, geos:renderer.info.memory.geometries}),
  anda(seg){ const n = Math.round(seg*60); for(let i = 0; i < n; i++){ const d = 1/60; pasoHeroe(d); pasoEnemigos(d); pasoBalas(d); } },
  falta:() => [...TR_FALTA], alcance, idioma:l => ponerIdioma(l), resultado:() => { J.fin = {estrellas:2, t:0}; pantallaResultado(); }, muerte:() => pantallaMuerte(), pausar};
/* sonda: todos los saltos posibles desde cada lugar pisable; dice si se llega a la puerta */
function alcance(maxNodos){
  const guard = ENEM, snap = {...HE}; ENEM = []; J.sim = true; const vistos = new Map(), cola = [], pisados = new Set(); let fin = false, pasos = 0;
  const clave = (x, y, e, l) => e + (Math.round(x*2)/2) + ',' + (Math.round(y*4)/4) + ',' + (l || 0);
  const meter = (x, y, e, l) => { const k = clave(x, y, e, l); if(vistos.has(k)) return; vistos.set(k, 1); cola.push({x, y, e, l}); if(e === 'suelo') pisados.add(Math.floor(x) + ',' + Math.round(y)); };
  meter(snap.x, snap.y, 'suelo');
  const tiros = []; for(const a of [15, 30, 45, 58, 70, 80, 88, 96, 108, 120, 135, 150, 165]) for(const v of [5, 8, 11, 14, 17]) tiros.push([Math.cos(a*Math.PI/180)*v, Math.sin(a*Math.PI/180)*v]);
  for(const v of [8, 12, 15]) tiros.push([v, 0], [-v, 0]);
  while(cola.length && vistos.size < (maxNodos || 4000)){ const n = cola.shift();
    for(const [vx, vy] of tiros){
      Object.assign(HE, {x:n.x, y:n.y, vx:0, vy:0, est:n.e, paredLado:n.l || 0, pared:n.e === 'pared' ? 2 : 0, invul:0, muerto:0, vida:3, giro:0, desliza:0});
      J.simHerido = 0; J.simFin = 0;
      if(!ejecutarPlaneo(-vx/4.2, -vy/4.2)) continue;
      for(let i = 0; i < 300; i++){ pasoHeroe(1/60); pasos++;
        if(J.simFin){ fin = true; break; } if(J.simHerido || HE.y < -3) break;
        if(HE.est === 'pared' && i > 2){ meter(HE.x, HE.y, 'pared', HE.paredLado); break; }
        if(HE.est === 'suelo' && Math.abs(HE.vx) < 0.2){ meter(HE.x, HE.y, 'suelo'); break; } } } }
  ENEM = guard; J.sim = false; Object.assign(HE, snap);
  const nodos = cola.concat([...vistos.keys()].map(k => { const [a, b] = k.replace(/^[a-z]+/, '').split(','); return {x:+a, y:+b}; }));
  const sueltos = ENEM.filter(e => !nodos.some(n => Math.hypot(n.x - e.x, n.y - e.y) < 20 && veLinea(n.x, n.y + 1.2, e.x, e.y + e.alto*0.6))).map(e => e.tipo + '@' + e.x + ',' + e.y);
  const filas = NIVEL.mapa.map((f, i) => f.map((c, x) => pisados.has(x + ',' + (NIVEL.alto - 1 - i)) && c === '.' ? '*' : c).join(''));
  return {fin, nodos:vistos.size, pasos, filas, sueltos};
}

