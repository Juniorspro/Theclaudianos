
/* ====================== HUD ====================== */
const HUDV = {hp:1, ras:1};
function aPantalla(p){ const v = p.clone().project(cam); return v.z < 1 ? {x:(v.x*0.5 + 0.5)*ANCHO, y:(-v.y*0.5 + 0.5)*ALTO, ok:Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2} : null; }
function textoH(t, x, y, px, col, al, peso){ t = T(t); hx.font = (peso||'bold') + ' ' + px + "px 'Arial Narrow','Roboto Condensed',Arial,sans-serif"; hx.textAlign = al||'left'; hx.fillStyle = 'rgba(0,0,0,0.55)'; hx.fillText(t, x + 1, y + 1); hx.fillStyle = col; hx.fillText(t, x, y); }
function barraH(x, y, w, h, f, col, ras){ hx.fillStyle = 'rgba(0,0,0,0.5)'; hx.fillRect(x - 1, y - 1, w + 2, h + 2); if(ras !== undefined){ hx.fillStyle = '#e8eaec'; hx.fillRect(x, y, w*lim(ras,0,1), h); } hx.fillStyle = col; hx.fillRect(x, y, w*lim(f,0,1), h); }
function texto(t, col){ J.textos.push({t, col, v:1.1}); }
const VOZ_AVISO = {'BRECHA':'posicion', 'DESPEJADO':'despejado', '¡TOMARON UN REHÉN!':'tomaron', 'EL COLOSO':'coloso', '¡HELICÓPTERO!':'helicoptero', 'MISIÓN CUMPLIDA':'cumplida', 'MISIÓN FALLIDA':'fallida'};
function aviso(t, col, sub){ const a = $('aviso'); a.innerHTML = T(t) + (sub ? '<small>' + T(sub) + '</small>' : ''); a.style.color = col||'#fff'; a.style.opacity = 1; clearTimeout(aviso.t); aviso.t = setTimeout(()=> a.style.opacity = 0, 1800);
  const vk = VOZ_AVISO[t] || (/^OLEADA/.test(t) ? 'contacto' : null); if(vk) voz(vk, vk === 'cumplida' || vk === 'fallida'); }
function hud(){
  hx.setTransform(RH, 0, 0, RH, 0, 0); hx.clearRect(0, 0, ANCHO, ALTO);
  if(J.modo!=='juego' && J.modo!=='pausa') return;
  const j = J.jug, id = armaJ(), A = ARMAS[id], W = ANCHO, H = ALTO, cxm = W/2, cym = H/2;
  const escopa = j.zoom > 0.85 && A.clase==='francotirador';
  /* velos baratos: franjas en los bordes, nunca un rectángulo de pantalla entera por cuadro */
  const borde = (col, a, b)=>{ hx.fillStyle = col; hx.globalAlpha = a; hx.fillRect(0, 0, W, b); hx.fillRect(0, H - b, W, b); hx.fillRect(0, 0, b, H); hx.fillRect(W - b, 0, b, H); hx.globalAlpha = 1; };
  /* con revelado HDR, cámara lenta, poca vida y cegadora van en el shader final (y la cegadora encandila de verdad) */
  if(!POST.ok){ if(J.lento > 0) borde('#9aa2aa', 0.28, 26);
    if(j.hp < j.hpMax*0.3) borde('#b8201a', 0.25 + 0.15*Math.sin(J.tt*6), 22);
    if(J.flashT > 0){ hx.fillStyle = '#fff'; hx.globalAlpha = Math.min(1, J.flashT*2); hx.fillRect(0, 0, W, H); hx.globalAlpha = 1; } }
  if(J.fundido > 0){ hx.fillStyle = '#000'; hx.globalAlpha = J.fundido; hx.fillRect(0, 0, W, H); hx.globalAlpha = 1; }
  /* mira */
  if(!escopa && j.cubT < 0.5){
    const px = ALTO/(2*Math.tan(cam.fov*Math.PI/360)), gap = 5 + A.disp*(j.zoom > 0.5 ? 0.45 : 1)*(j.caminando ? 1.6 : 1)*px + j.retP*px*0.6;
    hx.strokeStyle = J.sobreBlanco ? '#ff5a3a' : '#e8eaec'; hx.lineWidth = 2; hx.beginPath();
    hx.moveTo(cxm - gap - 8, cym); hx.lineTo(cxm - gap, cym); hx.moveTo(cxm + gap, cym); hx.lineTo(cxm + gap + 8, cym); hx.moveTo(cxm, cym - gap - 8); hx.lineTo(cxm, cym - gap); hx.moveTo(cxm, cym + gap); hx.lineTo(cxm, cym + gap + 8); hx.stroke();
    hx.fillStyle = hx.strokeStyle; hx.fillRect(cxm - 1, cym - 1, 2, 2); }
  if(escopa){ hx.strokeStyle = '#ff3a2a'; hx.lineWidth = 1; for(let k=1;k<=4;k++){ hx.beginPath(); hx.moveTo(cxm - 6, cym + k*H*0.04); hx.lineTo(cxm + 6, cym + k*H*0.04); hx.stroke(); textoH(k*50 + '', cxm + 9, cym + k*H*0.04 + 3, 8, '#ff3a2a', 'left', 'normal'); }
    if(J.rango) textoH('DIST ' + Math.round(J.rango) + ' m', cxm + H*0.12, cym - H*0.1, 12, '#e8eaec');
    const ai = j.aireCd > 0 ? 0 : 1 - j.aire/4; barraH(cxm - 50, cym + H*0.3, 100, 4, ai, j.aire > 0 ? '#8ac8ff' : '#5a636b'); textoH('AIRE', cxm, cym + H*0.3 - 4, 9, '#9aa2aa', 'center'); }
  /* marcas de impacto */
  for(let i=J.marcas.length-1;i>=0;i--){ const m = J.marcas[i]; if(m.t <= 0) continue;
    const s = m.tipo==='baja' ? 11 : 8, col = m.tipo==='baja' ? '#ff3a2a' : (m.tipo==='placa' ? '#8ac8ff' : (m.tipo==='cabeza' ? '#ffb43a' : '#ffffff'));
    hx.strokeStyle = col; hx.lineWidth = 2; hx.beginPath(); hx.moveTo(cxm - s, cym - s); hx.lineTo(cxm - s*0.4, cym - s*0.4); hx.moveTo(cxm + s, cym - s); hx.lineTo(cxm + s*0.4, cym - s*0.4); hx.moveTo(cxm - s, cym + s); hx.lineTo(cxm - s*0.4, cym + s*0.4); hx.moveTo(cxm + s, cym + s); hx.lineTo(cxm + s*0.4, cym + s*0.4); hx.stroke();
    if(m.cabeza) textoH('CABEZA', cxm, cym - 22, 11, '#ffb43a', 'center'); }
  /* textos que suben */
  let ty = cym + 34; for(let i=J.textos.length-1;i>=0;i--){ const t = J.textos[i]; if(t.v <= 0) continue; hx.globalAlpha = Math.min(1, t.v*2); textoH(t.t, cxm + 26, ty + (1.1 - t.v)*-14, 12, t.col); hx.globalAlpha = 1; ty += 14; }
  /* recarga */
  if(j.recarga > 0){ hx.strokeStyle = '#e8eaec'; hx.lineWidth = 3; hx.beginPath(); hx.arc(cxm, cym, 18, -Math.PI/2, -Math.PI/2 + TAU*(1 - j.recarga/j.recargaTot)); hx.stroke(); textoH('RECARGANDO', cxm, cym + 36, 10, '#e8eaec', 'center'); }
  /* daño: arcos que marcan de dónde vino */
  for(let i=J.danos.length-1;i>=0;i--){ const d = J.danos[i]; if(d.t <= 0) continue;
    const a = angDif(cam.rotation.y + Math.PI, d.ang) ; hx.strokeStyle = 'rgba(214,40,30,' + d.t*0.9 + ')'; hx.lineWidth = 6; hx.beginPath(); hx.arc(cxm, cym, H*0.28, -Math.PI/2 - a - 0.3, -Math.PI/2 - a + 0.3); hx.stroke(); }
  /* amenazas fuera de cuadro: los que te apuntan */
  for(const e of J.enemigos){ if(!e.vivo || !e.laser || !e.pts) continue; const s = aPantalla(e.pts.cab); if(s && s.ok) continue;
    const d = e.pts.cab.clone().sub(cam.position); const a = Math.atan2(d.x, -d.z) - cam.rotation.y*-1; const aa = angDif(0, Math.atan2(-d.x, -d.z) - cam.rotation.y);
    const r = H*0.36, x = cxm - Math.sin(aa)*r*1.6, y = cym - Math.cos(aa)*r*0.2; hx.fillStyle = '#ff3a2a'; hx.beginPath(); hx.moveTo(lim(x, 20, W - 20), lim(y, 30, H - 30) - 7); hx.lineTo(lim(x, 20, W - 20) + 6, lim(y, 30, H - 30) + 5); hx.lineTo(lim(x, 20, W - 20) - 6, lim(y, 30, H - 30) + 5); hx.fill(); }
  /* captores: la cuenta regresiva arriba de la cabeza */
  for(const e of J.enemigos){ if(!e.vivo || !e.def.captor || !e.pts || !isFinite(e.cuenta) || !e.rehen || !e.rehen.vivo) continue; const s = aPantalla(e.pts.cab.clone().add(V3(0,0.4,0))); if(!s) continue;
    const f = lim(e.cuenta/(8.5), 0, 1); hx.strokeStyle = '#ff3a2a'; hx.lineWidth = 3; hx.beginPath(); hx.arc(s.x, s.y, 13, -Math.PI/2, -Math.PI/2 + TAU*f); hx.stroke(); textoH(Math.ceil(e.cuenta) + '', s.x, s.y + 4, 12, '#ff3a2a', 'center'); }
  /* vida (arriba a la izquierda) */
  const f = j.hp/j.hpMax; HUDV.ras = HUDV.ras > f ? HUDV.ras - 0.004 : f;
  textoH('VIDA', 16, 22, 10, '#9aa2aa'); barraH(16, 27, 170, 8, f, f > 0.3 ? '#e8eaec' : '#ff3a2a', HUDV.ras); textoH(Math.ceil(j.hp) + '', 192, 35, 13, '#e8eaec');
  let ix = 16; for(let k=0;k<j.botiquin;k++){ hx.fillStyle = '#5ad07a'; hx.fillRect(ix, 42, 10, 10); hx.fillStyle = '#101214'; hx.fillRect(ix + 4, 43, 2, 8); hx.fillRect(ix + 1, 46, 8, 2); ix += 14; }
  if(j.cubT > 0.6) textoH('A CUBIERTO', 16, 64, 11, '#8ac8ff');
  /* objetivo, hostiles, reloj */
  const obj = J.objetivo + (J.hostiles ? '  ·  ' + J.hostiles + (J.hostiles===1 ? ' HOSTIL' : ' HOSTILES') : '');
  textoH(obj, cxm, 22, 12, '#e8eaec', 'center');
  if(J.mis.tiempo){ const s = Math.max(0, J.reloj), mm = Math.floor(s/60), ss = Math.floor(s%60); textoH(mm + ':' + String(ss).padStart(2,'0'), cxm, 40, 15, s < 30 ? '#ff3a2a' : '#ffb43a', 'center'); }
  if(J.mis.tipo==='franco'){ const v = J.viento; textoH('VIENTO ' + (v < 0 ? '◀ ' : '') + Math.abs(v).toFixed(1) + ' m/s' + (v > 0 ? ' ▶' : ''), cxm, 40, 12, '#8ac8ff', 'center'); if(J.alerta > 0) textoH('¡ALARMA!', cxm, 56, 12, '#ff3a2a', 'center'); }
  if(J.jefe && J.jefe.vivo){ const e = J.jefe; barraH(cxm - 120, 50, 240, 7, e.hp/e.hpMax, '#d63a2a'); textoH('EL COLOSO', cxm, 47, 10, '#ff6a4a', 'center');
    let px = cxm - 120; for(const k in e.placas){ hx.fillStyle = e.placas[k] > 0 ? '#8a939b' : '#2a3036'; hx.fillRect(px, 60, 36, 4); px += 40; } }
  if(J.heli && J.heli.vivo){ barraH(cxm - 120, 50, 240, 7, J.heli.hp/(1500*(0.8 + J.mis.dif*0.2)), '#d63a2a'); textoH('HELICÓPTERO', cxm, 47, 10, '#ff6a4a', 'center'); }
  /* munición (arriba a la derecha, al lado de la pausa) */
  const bal = j.carg[id], res = j.res[id];
  textoH(bal + '', W - 112, 34, 26, bal === 0 ? '#ff3a2a' : '#e8eaec', 'right'); textoH('/ ' + (res===Infinity ? '∞' : res), W - 108, 34, 13, '#9aa2aa', 'left');
  textoH(A.nom + (tieneMej(id,'silen') ? ' · SIL' : ''), W - 112, 50, 10, '#9aa2aa', 'right');
  const mx = cargadorMax(id); if(mx <= 40){ const w = Math.min(2, 90/mx); for(let k=0;k<mx;k++){ hx.fillStyle = k < bal ? '#e8eaec' : '#3a4148'; hx.fillRect(W - 112 - (mx - k)*(w + 1.2), 56, w, 7); } }
  /* botones que cambian */
  $('granN').textContent = j.granadas; $('bGranada').classList.toggle('off', j.granadas <= 0);
  $('armaNom').textContent = ARMAS[j.armas[(j.ai + 1) % j.armas.length]].nom; $('bArma').classList.toggle('off', J.mis.tipo==='franco');
  $('bAire').style.display = A.clase==='francotirador' ? 'flex' : 'none';
  $('bCubrir').classList.toggle('si', j.cubT > 0.5);
}
/* lo que hay bajo la mira (para la ayuda y el telémetro) */
function bajoMira(){
  const o = cam.position, d = V3(0,0,-1).applyQuaternion(cam.quaternion); let t = 400, sobre = false;
  const w = rayoMundo(o, d, 400); if(w) t = w.t;
  for(const e of J.enemigos){ if(!e.vivo || !e.pts || !e.cuerpo.g.visible) continue; const h = rayoCuerpo(o, d, e, t); if(h){ t = h.t; sobre = true; } }
  for(const v of J.vehiculos) if(v.vivo) for(const b of cajasVeh(v)){ const h = rayoCaja(o, d, b, t); if(h){ t = h.t; sobre = true; } }
  if(J.heli && J.heli.vivo) for(const b of cajasVeh(J.heli)){ const h = rayoCaja(o, d, b, t); if(h){ t = h.t; sobre = true; } }
  J.sobreBlanco = sobre; J.rango = t < 399 ? t : 0;
}

/* ====================== menús ====================== */
const CAPAS_UI = ['capaTitulo','capaMisiones','capaEquipo','capaArmeria','capaComo','capaPausa','capaRes'];
function mostrar(id){ for(const c of CAPAS_UI) $(c).classList.toggle('ver', c===id); $('mandos').classList.toggle('ver', !id && J.modo==='juego');
  if(id){ soltarTodo(); $('bBrecha').style.display = 'none'; $('mira').classList.remove('ver'); } $('dinero').textContent = '$ ' + G.dinero; fondoArte(id); if(id){ $(id).scrollTop = 0; requestAnimationFrame(marcarDeslizables); } }
/* ====================== desplazar los menús con el dedo ======================
   Con la pantalla girada por CSS, el desplazamiento nativo va para el lado que no es y a los tirones: se hace a mano, en las
   coordenadas del juego, con inercia al soltar. Si el dedo se movió, el toque no cuenta como botón. */
const DESL = {el:null, y:0, s:0, v:0, t:0, movio:false, raf:0, sinClic:0};
function capaQueDesliza(n){ while(n && n.classList){ if(n.classList.contains('capa')) return n.scrollHeight > n.clientHeight + 2 ? n : null; n = n.parentNode; } return null; }
function marcarDeslizables(){ document.querySelectorAll('.capa').forEach(c=> c.classList.toggle('desliza', c.scrollHeight > c.clientHeight + 2 && c.scrollTop + c.clientHeight < c.scrollHeight - 4)); }
function inercia(){ cancelAnimationFrame(DESL.raf); let ult = performance.now();
  const f = ahora=>{ const dt = Math.min(40, ahora - ult); ult = ahora; if(!DESL.el) return; DESL.el.scrollTop += DESL.v*dt; DESL.v *= Math.pow(0.9955, dt); marcarDeslizables();
    const tope = DESL.el.scrollTop <= 0 || DESL.el.scrollTop >= DESL.el.scrollHeight - DESL.el.clientHeight - 1;
    if(Math.abs(DESL.v) > 0.02 && !tope) DESL.raf = requestAnimationFrame(f); };
  DESL.raf = requestAnimationFrame(f); }
document.addEventListener('touchstart', ev=>{ const c = capaQueDesliza(ev.target); cancelAnimationFrame(DESL.raf); DESL.el = c; if(!c || ev.touches.length > 1) return;
  const t = ev.touches[0]; DESL.y = aLocalD(t.clientX, t.clientY)[1]; DESL.s = c.scrollTop; DESL.v = 0; DESL.t = performance.now(); DESL.y0 = DESL.y; DESL.movio = false; }, {passive:true, capture:true});
document.addEventListener('touchmove', ev=>{ const c = DESL.el; if(!c) return; const t = ev.touches[0], y = aLocalD(t.clientX, t.clientY)[1], ahora = performance.now();
  if(Math.abs(y - DESL.y0) > 9) DESL.movio = true; if(!DESL.movio) return;
  const dt = Math.max(1, ahora - DESL.t); DESL.v = lerp(DESL.v, (DESL.y - y)/dt, 0.6); DESL.t = ahora;
  c.scrollTop += DESL.y - y; DESL.y = y; marcarDeslizables(); }, {passive:true, capture:true});
document.addEventListener('touchend', ev=>{ if(!DESL.el) return; if(DESL.movio){ DESL.sinClic = performance.now() + 400; if(performance.now() - DESL.t > 90) DESL.v = 0; inercia(); } }, {passive:true, capture:true});
/* un arrastre no es un toque */
document.addEventListener('click', ev=>{ if(performance.now() < DESL.sinClic && capaQueDesliza(ev.target)){ ev.preventDefault(); ev.stopPropagation(); } }, true);
document.querySelectorAll('.capa').forEach(c=> c.addEventListener('scroll', marcarDeslizables, {passive:true}));
function boton(id, fn){ $(id).addEventListener('click', ev=>{ ev.preventDefault(); audioIni(); sfx('boton'); fn(); pantallaHorizontal(); }); }
function iniciarDemo(){ J.demo = true; J.bot = true; J.dios = true; const op = [0, 1, 4].filter(i=> i < G.abierto + 1); iniciarMision(op.length ? elegirR(op) : 0, 'DEMO' + Math.floor(Math.random()*9999)); J.modo = 'menu'; MUS.on = true; }
const elegirR = a => a[Math.floor(Math.random()*a.length)];
function aMenu(){ iniciarDemo(); mostrar('capaTitulo'); }
function jugar(mi){ J.demo = false; J.bot = false; J.dios = false; iniciarMision(mi); J.modo = 'juego'; HUDV.ras = 1; mostrar(null); acum = 0; MUS.on = true; }
function pausar(){ if(J.modo!=='juego') return; J.modo = 'pausa'; mostrar('capaPausa'); if(document.pointerLockElement) document.exitPointerLock(); }
function seguir(){ J.modo = 'juego'; mostrar(null); acum = 0; ultimo = 0; }
let misionElegida = 0;
boton('btJugar', ()=>{ armarMisiones(); mostrar('capaMisiones'); });
boton('btMisVolver', ()=> mostrar('capaTitulo'));
boton('btArmeria', ()=>{ armarArmeria(ARM.tab); mostrar('capaArmeria'); });
boton('btArmVolver', ()=> mostrar(ARM.volver||'capaTitulo'));
boton('btComo', ()=> mostrar('capaComo')); boton('btComoVolver', ()=> mostrar('capaTitulo'));
boton('btSonido', ()=>{ G.sonido = !G.sonido; guardar(); if(amo) amo.gain.value = G.sonido ? 0.9 : 0; textoSonido(); });
function textoSonido(){ $('btSonido').textContent = T('SONIDO') + ': ' + T(G.sonido ? 'SÍ' : 'NO'); $('btGraf').textContent = T('GRÁFICOS') + ': ' + T(({auto:'AUTO', alta:'ALTOS', media:'MEDIOS', baja:'BAJOS'})[G.graficos||'auto']); }
const GRAF = ['auto','alta','media','baja'];
boton('btGraf', ()=>{ G.graficos = GRAF[(GRAF.indexOf(G.graficos||'auto') + 1) % GRAF.length]; guardar(); if(G.graficos !== 'auto') fijarCalidad(CALIDAD_FIJA[G.graficos]); costoDeNuevo(); textoSonido(); });
if(G.graficos && G.graficos !== 'auto') fijarCalidad(CALIDAD_FIJA[G.graficos]);
else if(G.calAuto) fijarCalidad(Math.max(0.4, Math.min(1, G.calAuto)));   /* lo que aprendió la vez anterior */
textoSonido();
document.querySelectorAll('#idiomas button').forEach(b=> b.addEventListener('click', ev=>{ ev.preventDefault(); audioIni(); sfx('boton'); G.idioma = b.dataset.l; guardar(); aplicarIdioma(); textoSonido(); pantallaHorizontal(); }));
aplicarIdioma();
boton('btEqIr', ()=> jugar(misionElegida)); boton('btEqVolver', ()=> mostrar('capaMisiones'));
boton('btSeguir', seguir); boton('btReiniciar', ()=> jugar(J.mi)); boton('btSalir', aMenu);
boton('btResSig', ()=>{ misionElegida = Math.min(4, J.mi + 1); armarEquipo(); mostrar('capaEquipo'); });
boton('btResOtra', ()=> jugar(J.mi));
boton('btResArm', ()=>{ iniciarDemo(); ARM.volver = 'capaMisiones'; armarArmeria(ARM.tab); mostrar('capaArmeria'); });
boton('btResMenu', ()=>{ iniciarDemo(); armarMisiones(); mostrar('capaMisiones'); });
document.querySelectorAll('.tab').forEach(t=> t.addEventListener('click', ev=>{ ev.preventDefault(); sfx('boton'); armarArmeria(t.dataset.t); }));

/* íconos por piezas: la misma lista que arma el arma 3D, vista de costado */
function iconoArma(c, id){
  const g = c.getContext('2d'), A = ARMAS[id], W = c.width, H = c.height; g.clearRect(0, 0, W, H);
  const ic = iconoModelo(id, W, H);
  if(ic){ g.drawImage(ic, 0, 0); if(!G.armas[id] && A.precio){ g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(16,18,20,0.6)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; } return; }
  let z0 = 1e9, z1 = -1e9, y0 = 1e9, y1 = -1e9; for(const [, , y, z, , h, d] of A.piezas){ z0 = Math.min(z0, z - d/2); z1 = Math.max(z1, z + d/2); y0 = Math.min(y0, y - h/2); y1 = Math.max(y1, y + h/2); }
  const s = Math.min(W*0.86/(z1 - z0), H*0.8/(y1 - y0)), ox = W/2 + (z0 + z1)/2*s, oy = H/2 + (y0 + y1)/2*s;
  for(const [, , y, z, , h, d, col] of A.piezas){ g.fillStyle = col === '#15171a' || col === '#1c1f23' ? '#e8eaec' : (col==='#2a2e33' ? '#c9ced3' : '#9aa2aa'); g.fillRect(ox - (z + d/2)*s, oy - (y + h/2)*s, d*s, h*s); }
  if(!G.armas[id] && A.precio) { g.fillStyle = 'rgba(16,18,20,0.55)'; g.fillRect(0, 0, W, H); }
}
function miniatura(c, i){
  const g = c.getContext('2d'), W = c.width, H = c.height, t = TEMAS[MISIONES[i].tema], r = mulberry(i*77 + 5);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, t.cielo); gr.addColorStop(1, t.pared2); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = t.piso; g.fillRect(0, H*0.72, W, H*0.28);
  for(let k=0;k<6;k++){ g.fillStyle = k%2 ? t.pared : t.pared2; const x = r()*W, w = 20 + r()*60, h = 20 + r()*H*0.4; g.fillRect(x, H*0.72 - h, w, h); }
  g.fillStyle = t.acento; g.fillRect(0, H*0.72, W, 3);
  /* siluetas de enemigos */
  for(let k=0;k<3;k++){ const x = W*(0.3 + k*0.22) + r()*20, y = H*0.72, s = H*0.28*(0.8 + r()*0.4); g.fillStyle = '#1c1f23';
    g.fillRect(x - s*0.1, y - s*0.95, s*0.2, s*0.5); g.fillRect(x - s*0.09, y - s*0.45, s*0.07, s*0.45); g.fillRect(x + s*0.02, y - s*0.45, s*0.07, s*0.45);
    g.beginPath(); g.arc(x, y - s*1.05, s*0.1, 0, TAU); g.fill(); g.fillRect(x - s*0.05, y - s*0.8, s*0.45, s*0.06); }
  /* retícula */
  g.strokeStyle = 'rgba(255,58,42,0.8)'; g.lineWidth = 2; const mx = W*0.52, my = H*0.42; g.beginPath(); g.arc(mx, my, 12, 0, TAU); g.moveTo(mx - 18, my); g.lineTo(mx - 6, my); g.moveTo(mx + 6, my); g.lineTo(mx + 18, my); g.moveTo(mx, my - 18); g.lineTo(mx, my - 6); g.moveTo(mx, my + 6); g.lineTo(mx, my + 18); g.stroke();
}
function armarMisiones(){
  const L = $('listaMisiones'); L.innerHTML = '';
  MISIONES.forEach((m, i)=>{ const ab = i < G.abierto, d = document.createElement('div'); d.className = 'carpeta' + (ab ? '' : ' cerrada'); d.style.animationDelay = (i*0.06) + 's';
    const c = document.createElement('canvas'); c.width = 316; c.height = 160; miniatura(c, i); miniaturaArte(c, i);
    const t = document.createElement('div'); t.className = 't'; const e = G.estrellas[i]||0;
    t.innerHTML = (i+1) + '. ' + T(m.nom) + '<small>' + T(m.lugar) + '</small><div class="est">' + '★'.repeat(e) + '☆'.repeat(3-e) + '  ' + (G.rangos[i]||'') + '</div><small>' + (ab ? T(m.txt) : T('CLASIFICADO · cumplí la anterior')) + '</small>';
    const s = document.createElement('div'); s.className = 'sello'; s.textContent = T(!ab ? 'CLASIFICADO' : (e ? 'CUMPLIDA' : 'ACTIVA')); s.style.color = s.style.borderColor = !ab ? '#5a636b' : (e ? '#5ad07a' : '#ffb43a');
    d.append(c, t, s); d.addEventListener('click', ()=>{ audioIni(); if(!ab){ sfx('vacio'); return; } sfx('boton'); pantallaHorizontal(); misionElegida = i; armarEquipo(); mostrar('capaEquipo'); }); L.append(d); });
}
function barrasArma(id){ const A = ARMAS[id], f = (v, m)=> '<i><b style="width:' + Math.round(lim(v/m, 0.05, 1)*100) + '%"></b></i>';
  return '<div class="barras"><span>' + T('DAÑO') + '</span>' + f(A.dmg*(A.perd||1), 180) + '<span>' + T('CADENCIA') + '</span>' + f(1/A.cad, 14) + '<span>' + T('PRECISIÓN') + '</span>' + f(0.06 - A.disp, 0.06) + '<span>' + T('CARGADOR') + '</span>' + f(A.carg, 40) + '</div>'; }
function fila(L, icono, nom, txt, botones, extra){ const d = document.createElement('div'); d.className = 'item';
  const c = document.createElement('canvas'); c.width = 184; c.height = 92; icono(c);
  const t = document.createElement('div'); t.className = 'd'; t.innerHTML = T(nom) + '<small>' + T(txt) + '</small>' + (extra||'');
  const bs = document.createElement('div'); bs.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:5px';
  for(const b of botones){ const x = document.createElement('button'); x.className = 'boton chico ' + (b.cls||''); x.textContent = T(b.txt); if(b.no) x.style.opacity = 0.4;
    x.addEventListener('click', ev=>{ ev.preventDefault(); audioIni(); if(b.no){ sfx('vacio'); return; } b.fn(); sfx(b.sfx||'moneda'); guardar(); b.rehacer(); }); bs.append(x); }
  t.append(bs); d.append(c, t); L.append(d); }
function armarEquipo(){
  const m = MISIONES[misionElegida]; $('eqMision').textContent = (misionElegida+1) + '. ' + T(m.nom) + ' · ' + T(m.lugar); const L = $('listaEquipo'); L.innerHTML = '';
  const rehacer = armarEquipo;
  if(m.tipo==='franco') fila(L, c=> iconoArma(c, 'l96'), 'L96 · ASIGNADO', 'La operación es de francotirador: se sale con el L96 y la pistola.', [], barrasArma('l96'));
  else for(const id of ORDEN_ARMAS) if(G.armas[id] && ARMAS[id].clase==='primaria') fila(L, c=> iconoArma(c, id), ARMAS[id].nom, ARMAS[id].txt, [G.primaria===id ? {txt:'EN MANO', cls:'verde', fn(){}, rehacer, sfx:'boton'} : {txt:'LLEVAR', cls:'gris', fn(){ G.primaria = id; }, rehacer, sfx:'recargaB'}], barrasArma(id));
  const eq = G.equipo; fila(L, c=>{ const g = c.getContext('2d'); g.fillStyle = '#c9ced3'; g.fillRect(70, 18, 44, 56); g.fillStyle = '#2a3036'; g.fillRect(80, 28, 24, 12); }, 'EQUIPO',
    'Chaleco ' + eq.chaleco + ' · casco ' + eq.casco + ' · botiquín ' + eq.botiquin + ' · cegadoras ' + eq.granadas + '. Vida: ' + (100 + 30*eq.chaleco) + '.', [{txt:'ARMERÍA', cls:'oro', fn(){ ARM.volver = 'capaEquipo'; armarArmeria('armas'); mostrar('capaArmeria'); }, rehacer(){}, sfx:'boton'}]);
}
const ARM = {tab:'armas', volver:'capaTitulo'};
function armarArmeria(tab){
  ARM.tab = tab; document.querySelectorAll('.tab').forEach(t=> t.classList.toggle('ya', t.dataset.t===tab)); $('armTit').textContent = '$ ' + G.dinero;
  const L = $('listaArmeria'); L.innerHTML = ''; const rehacer = ()=> armarArmeria(ARM.tab);
  if(tab==='armas') for(const id of ORDEN_ARMAS){ const A = ARMAS[id], tiene = G.armas[id];
    fila(L, c=> iconoArma(c, id), A.nom, A.txt, tiene ? [{txt: G.primaria===id || G.secundaria===id ? 'EN USO' : 'COMPRADA', cls:'verde', fn(){}, rehacer, sfx:'boton'}]
      : [{txt:'COMPRAR $' + A.precio, no:G.dinero < A.precio, fn(){ G.dinero -= A.precio; G.armas[id] = 1; if(A.clase==='primaria') G.primaria = id; }, rehacer}], barrasArma(id)); }
  else if(tab==='mejoras') for(const id of ORDEN_ARMAS.concat(['l96'])){ if(!G.armas[id] && id!=='l96') continue; const bots = [];
    for(const k in MEJORAS){ const M = MEJORAS[k]; if(tieneMej(id, k)) bots.push({txt:'✓ ' + M.nom, cls:'verde', fn(){}, rehacer, sfx:'boton'});
      else bots.push({txt:M.nom + ' $' + M.precio, cls:'gris', no:G.dinero < M.precio, fn(){ G.dinero -= M.precio; (G.mejoras[id] = G.mejoras[id] || {})[k] = 1; }, rehacer}); }
    fila(L, c=> iconoArma(c, id), ARMAS[id].nom, Object.keys(MEJORAS).map(k=> MEJORAS[k].nom.toLowerCase() + ': ' + MEJORAS[k].txt).join(' · '), bots); }
  else for(const k in EQUIPO){ const E = EQUIPO[k], nv = G.equipo[k]; const p = E.precio[nv];
    fila(L, c=>{ const g = c.getContext('2d'); g.fillStyle = '#c9ced3'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.fillText({chaleco:'▣', casco:'◓', botiquin:'✚', granadas:'◉'}[k], 92, 62); }, E.nom + '  ' + '●'.repeat(nv) + '○'.repeat(E.max - nv), E.txt,
      nv >= E.max ? [{txt:'AL MÁXIMO', cls:'verde', fn(){}, rehacer, sfx:'boton'}] : [{txt:'MEJORAR $' + p, cls:'oro', no:G.dinero < p, fn(){ G.dinero -= p; G.equipo[k]++; }, rehacer}]); }
}
/* ---------- informe ---------- */
const MEDALLAS = [['SIN RASGUÑOS', s=> s.gano && s.recibido < 1], ['PRECISIÓN', s=> s.gano && s.acc >= 0.8], ['TIRADOR', s=> s.gano && s.bajas > 0 && s.cabezas/s.bajas >= 0.6], ['SALVADOR', s=> s.gano && s.rehenesTot > 0 && s.rehenes === s.rehenesTot],
  ['FANTASMA', s=> s.gano && s.franco && !s.alarma], ['RELÁMPAGO', s=> s.gano && s.t < s.par]];
function mostrarResultado(){
  const s = J.stats, gano = J.fin.gano, mi = J.mi, m = J.mis;
  s.gano = gano; s.acc = s.disparos ? s.aciertos/s.disparos : 0; s.franco = m.tipo==='franco'; s.par = [200, 260, 240, 170, 300][mi];
  const est = gano ? 1 + (s.acc >= 0.55 ? 1 : 0) + (s.recibido < J.jug.hpMax*0.5 ? 1 : 0) : 0;
  const rango = !gano ? 'D' : (est===3 ? (s.bajas && s.cabezas/s.bajas >= 0.5 ? 'S' : 'A') : (est===2 ? 'B' : 'C'));
  const plata = gano ? m.pago + s.bajas*20 + s.cabezas*15 + s.rehenes*100 : s.bajas*10;
  G.dinero += plata;
  if(gano){ G.estrellas[mi] = Math.max(G.estrellas[mi]||0, est); const o = 'SABCD'; if(!G.rangos[mi] || o.indexOf(rango) < o.indexOf(G.rangos[mi])) G.rangos[mi] = rango; G.abierto = Math.max(G.abierto, Math.min(5, mi + 2)); }
  const med = $('medallas'); med.innerHTML = '';
  for(const [nom, cond] of MEDALLAS){ const si = cond(s); if(si) (G.medallas[m.id] = G.medallas[m.id] || {})[nom] = 1; const ya = G.medallas[m.id] && G.medallas[m.id][nom];
    const d = document.createElement('div'); d.className = 'medalla' + (si || ya ? ' si' : ''); const c = document.createElement('canvas'); c.width = c.height = 60; const g = c.getContext('2d');
    g.strokeStyle = si || ya ? '#ffb43a' : '#3a4148'; g.lineWidth = 5; g.beginPath(); for(let k=0;k<6;k++){ const a = k/6*TAU - Math.PI/2; g.lineTo(30 + Math.cos(a)*24, 30 + Math.sin(a)*24); } g.closePath(); g.stroke(); g.fillStyle = g.strokeStyle; g.font = 'bold 20px Arial'; g.textAlign = 'center'; g.fillText('7', 30, 38);
    d.append(c); d.append(T(nom)); med.append(d); }
  guardar();
  const mm = Math.floor(s.t/60), ss = Math.floor(s.t%60);
  $('resTit').textContent = T(gano ? 'MISIÓN CUMPLIDA' : 'MISIÓN FALLIDA'); $('resTit').style.color = gano ? '#5ad07a' : '#ff6a4a'; $('resSub').textContent = T(gano ? m.nom + ' · INFORME' : J.fin.motivo);
  $('rango').textContent = rango; $('resEst').textContent = '★'.repeat(est) + '☆'.repeat(3 - est);
  $('resumen').innerHTML = ['TIEMPO', mm + ':' + String(ss).padStart(2,'0'), 'BAJAS', s.bajas, 'A LA CABEZA', s.cabezas, 'PRECISIÓN', Math.round(s.acc*100) + ' %', 'REHENES', s.rehenesTot ? s.rehenes + ' / ' + s.rehenesTot : '—', 'DAÑO RECIBIDO', Math.round(s.recibido), 'PAGA', '$ ' + plata]
    .map((v, k)=> k%2 ? '<b>' + v + '</b>' : '<span>' + T(v) + '</span>').join('');
  $('btResSig').style.display = gano && mi < 4 ? '' : 'none';
  J.modo = 'res'; mostrar('capaRes'); if(document.pointerLockElement) document.exitPointerLock();
}

/* ====================== mandos ====================== */
const girada = ()=> matchMedia('(orientation: portrait)').matches;
function aLocalD(dx, dy){ return girada() ? [dy, -dx] : [dx, dy]; }
const BOTONES = {bFuego:'fuego', bApuntar:'apuntar', bRecargar:'recargar', bArma:'arma', bCubrir:'cubrir', bGranada:'granada', bAire:'aire', bBrecha:'brecha'};
const DEDOS = {};
function apretar(k, v){
  if(k==='fuego'){ if(v && !IN.fuego) IN.fuegoP = true; IN.fuego = v; return; }
  if(k==='apuntar'){ if(v) IN.apuntarT = !IN.apuntarT; return; }
  if(k==='cubrir' || k==='aire'){ IN[k] = v; if(k==='cubrir' && v) IN.apuntarT = false; return; }
  if(v) IN[k] = true;
}
for(const id in BOTONES){ const el = $(id), k = BOTONES[id];
  el.addEventListener('touchstart', ev=>{ ev.preventDefault(); ev.stopPropagation(); audioIni(); el.classList.add('apretado'); apretar(k, true); for(const t of ev.changedTouches) DEDOS[t.identifier] = {x:t.clientX, y:t.clientY, boton:k}; }, {passive:false});
  const suelta = ev=>{ ev.preventDefault(); el.classList.remove('apretado'); apretar(k, false); for(const t of ev.changedTouches) delete DEDOS[t.identifier]; if(ev.type==='touchend') pantallaHorizontal(); };
  el.addEventListener('touchend', suelta, {passive:false}); el.addEventListener('touchcancel', suelta, {passive:false});
  el.addEventListener('mousedown', ev=>{ ev.preventDefault(); ev.stopPropagation(); audioIni(); el.classList.add('apretado'); apretar(k, true); });
  el.addEventListener('mouseup', ev=>{ el.classList.remove('apretado'); apretar(k, false); });
}
$('bPausa').addEventListener('touchstart', ev=>{ ev.preventDefault(); ev.stopPropagation(); pausar(); }, {passive:false});
$('bPausa').addEventListener('mousedown', ev=>{ ev.preventDefault(); ev.stopPropagation(); pausar(); });
/* apuntar: cualquier dedo que no esté en un botón (y el de FUEGO también arrastra la mira) */
const pant = $('pantalla');
pant.addEventListener('touchstart', ev=>{ if(J.modo!=='juego') return; ev.preventDefault(); audioIni(); for(const t of ev.changedTouches) if(!DEDOS[t.identifier]) DEDOS[t.identifier] = {x:t.clientX, y:t.clientY}; }, {passive:false});
pant.addEventListener('touchmove', ev=>{ if(J.modo!=='juego') return; ev.preventDefault();
  for(const t of ev.changedTouches){ const d = DEDOS[t.identifier]; if(!d) continue; if(d.boton && d.boton!=='fuego') continue; const [lx, ly] = aLocalD(t.clientX - d.x, t.clientY - d.y); IN.dx += lx*1.6; IN.dy += ly*1.6; d.x = t.clientX; d.y = t.clientY; } }, {passive:false});
pant.addEventListener('touchend', ev=>{ for(const t of ev.changedTouches) delete DEDOS[t.identifier]; pantallaHorizontal(); });
pant.addEventListener('touchcancel', ev=>{ for(const t of ev.changedTouches) delete DEDOS[t.identifier]; });
/* PC: mouse con el puntero capturado */
cv3.addEventListener('mousedown', ev=>{ if(J.modo!=='juego') return; audioIni(); if(!document.pointerLockElement && cv3.requestPointerLock){ try{ cv3.requestPointerLock(); }catch(e){} } if(ev.button===0) apretar('fuego', true); if(ev.button===2) IN.apuntar = true; });
addEventListener('mouseup', ev=>{ if(ev.button===0) apretar('fuego', false); if(ev.button===2) IN.apuntar = false; });
addEventListener('contextmenu', ev=> ev.preventDefault());
addEventListener('mousemove', ev=>{ if(document.pointerLockElement === cv3 && J.modo==='juego'){ IN.dx += ev.movementX; IN.dy += ev.movementY; } });
const TECLAS = {Space:'cubrir', KeyR:'recargar', KeyQ:'arma', KeyG:'granada', KeyE:'brecha', ShiftLeft:'aire', KeyZ:'apuntar', KeyF:'fuego'};
addEventListener('keydown', ev=>{ if(ev.code==='KeyP' || ev.code==='Escape'){ if(J.modo==='juego') pausar(); else if(J.modo==='pausa') seguir(); return; }
  if(J.modo==='juego'){ if(ev.code==='ArrowLeft') IN.dx -= 30; if(ev.code==='ArrowRight') IN.dx += 30; if(ev.code==='ArrowUp') IN.dy -= 30; if(ev.code==='ArrowDown') IN.dy += 30; }
  const k = TECLAS[ev.code]; if(!k) return; ev.preventDefault(); if(ev.repeat) return; audioIni(); apretar(k, true); });
addEventListener('keyup', ev=>{ const k = TECLAS[ev.code]; if(k) apretar(k, false); });
function soltarTodo(){ IN.fuego = IN.cubrir = IN.aire = IN.apuntar = false; IN.apuntarT = false; for(const id in BOTONES) $(id).classList.remove('apretado'); for(const k in DEDOS) delete DEDOS[k]; }
document.addEventListener('visibilitychange', ()=>{ if(document.hidden){ soltarTodo(); if(J.modo==='juego') pausar(); } });
let bloqueoFallo = false;
async function pantallaHorizontal(){
  if(bloqueoFallo || !document.fullscreenEnabled || !(screen.orientation && screen.orientation.lock) || document.fullscreenElement) return;
  let entre = false;
  try{ await document.documentElement.requestFullscreen({navigationUI:'hide'}); entre = true; await screen.orientation.lock('landscape'); }
  catch(e){ bloqueoFallo = true; if(entre && document.fullscreenElement){ try{ await document.exitFullscreen(); }catch(_){} } }
}
document.addEventListener('fullscreenchange', ()=> setTimeout(medir, 60));

/* ====================== el paso ====================== */
function pasar(){
  J.t++;
  const juega = J.modo==='juego' || J.modo==='menu';
  J.escala = J.lento > 0 ? 0.3 : 1; if(J.lento > 0) J.lento -= DT;
  const gdt = DT*J.escala; J.tt += gdt;
  if(juega && J.jug){ pasarJugador(DT); pasarEtapa(gdt); IN.brecha = false; }
  if(J.jug) ubicarCamara(DT);
  for(const e of J.enemigos){ pasarEnemigo(e, gdt); if(e.vivo) aMundo3(e, poseSoldado(e, J.tt)); if(e.pts && e.cuerpo.g.visible) vestir(e); }
  for(const c of J.civiles){ if(c.vivo){ if(c.rehenDe && c.rehenDe.vivo){ c.pos.copy(c.rehenDe.pos).add(V3(Math.sin(c.rehenDe.rumbo)*0.38 - Math.cos(c.rehenDe.rumbo)*0.36, 0, Math.cos(c.rehenDe.rumbo)*0.38 + Math.sin(c.rehenDe.rumbo)*0.36)); c.rumbo = c.rehenDe.rumbo; c.agache = 0.45; }
      aMundo3(c, poseSoldado(c, J.tt)); } else if(c.trapo) pasarTrapo(c); if(c.pts) vestir(c); }
  pasarBalas(gdt); pasarCohetes(gdt); pasarGranadas(gdt); pasarFX(gdt);
  for(let i=DIFERIDOS.length-1;i>=0;i--){ DIFERIDOS[i].t -= gdt; if(DIFERIDOS[i].t <= 0){ const f = DIFERIDOS[i].fn; DIFERIDOS.splice(i,1); f(); } }
  for(const c of J.cuartos) if(c.puertaVuela){ const p = c.puertaVuela, u = p.userData; u.vel.y -= 9.8*gdt; p.position.addScaledVector(u.vel, gdt); p.rotation.x += u.giro*gdt; if(p.position.y < 0.1){ p.position.y = 0.1; u.vel.set(0,0,0); u.giro = 0; p.rotation.x = -Math.PI/2; c.puertaVuela = null; } }
  for(const L of [J.marcas, J.danos]) for(let i=L.length-1;i>=0;i--){ const o = L[i]; o.t -= DT*(L===J.danos ? 0.8 : 1); if(o.t <= 0) L.splice(i,1); }
  /* en los textos flotantes «t» es el texto y el reloj es «v» (restarle a t lo volvía NaN y no se borraban nunca) */
  for(let i=J.textos.length-1;i>=0;i--){ const o = J.textos[i]; o.v -= DT; if(o.v <= 0) J.textos.splice(i,1); }
  if(J.textos.length > 6) J.textos.splice(0, J.textos.length - 6);
  if(J.flashT > 0) J.flashT -= DT; if(J.fundido > 0) J.fundido = Math.max(0, J.fundido - DT*1.2);
  if(J.mis.tiempo && juega && !J.fin && !J.demo){ J.reloj -= DT; if(J.reloj <= 0) terminar(false, 'SE ACABÓ EL TIEMPO'); }
  J.tension = lerp(J.tension, Math.min(1, vivos().filter(e=> !e.lejos).length/5 + (J.jefe && J.jefe.vivo || J.heli ? 0.6 : 0)), 0.02);
  if(J.stats && !J.fin) J.stats.t += DT;
  if(juega && J.jug && !J.fin && J.jug.hp < 30 && !J.demo){ J.latT = (J.latT||0) - DT; if(J.latT <= 0){ J.latT = 0.9; sfx('latido', 0.8); } }
  if(J.fin){ J.fin.t -= DT; if(J.fin.t <= 0 && !J.fin.hecho){ J.fin.hecho = true; if(J.demo) iniciarDemo(); else if(J.modo==='juego') mostrarResultado(); } }
}
function dibujar(){
  moverAgua(performance.now()/1000); pasarBarato();
  const las = []; for(const e of J.enemigos){ if(e.vivo && e.laser && e.boca && e.cuerpo.g.visible){ const d = cam.position.clone().sub(e.boca); las.push([e.boca, e.boca.clone().addScaledVector(d, 0.94)]); } }
  dibujarLaseres(las); bajoMira();
  if(POST.ok){ const j = J.jug, juega = J.modo==='juego' || J.modo==='pausa'; let golpe = 0; for(const d of J.danos) golpe = Math.max(golpe, d.t);
    const poca = juega && j && j.hp < j.hpMax*0.3 ? 0.4 + 0.2*Math.sin(J.tt*6) : 0;
    POST.danio = lerp(POST.danio, juega ? Math.max(golpe*0.75, poca) : 0, 0.3);
    POST.cegado = juega && J.flashT > 0 ? Math.min(1, J.flashT*1.4) : 0; POST.lento = lerp(POST.lento, J.lento > 0 ? 1 : 0, 0.12); }
  revelar(()=>{ ren.clear(); ren.render(escena, cam); ren.clearDepth(); if(VM.g.visible && (J.modo==='juego' || J.modo==='pausa')) ren.render(vmEscena, vmCam); });
  hud();
}
let ultimo = 0, acum = 0;
function bucle(ts){
  requestAnimationFrame(bucle);
  if(!ultimo) ultimo = ts; const dt = Math.min(100, ts - ultimo); ultimo = ts;
  if(J.modo==='pausa'){ COSTO.ult = 0; return; }
  if(FONDO.tapa){ acum = 0; COSTO.ult = 0; return; }   /* el arte del menú tapa la escena: no se dibuja lo que no se ve */
  acum += dt; let pasos = 0;
  while(acum >= 1000/60 && pasos < 4){ acum -= 1000/60; pasos++; pasar(); }
  if(!pasos) return;
  if(J.t % 20 === 0 && cv3.width !== Math.round(cv3.clientWidth*R)) medir();
  dibujar(); medirCosto(ts);
}

/* ====================== sondas para el banco ====================== */
window.__S = {
  J, G, MISIONES, IN,
  iniciar(mi, sem){ J.demo = false; J.dios = false; iniciarMision(mi, sem||'BANCO'); J.modo = 'juego'; J.bot = true; mostrar(null); },
  anda(n){ for(let i=0;i<n;i++){ if(J.modo!=='juego' && J.modo!=='menu') break; pasar(); } return this.est(); },
  bot(v){ J.bot = v; }, dios(v){ J.dios = v; },
  est(){ const j = J.jug; return {modo:J.modo, mi:J.mi, etapa:J.ei + '/' + J.etapas.length, tipo:J.etapas[J.ei] ? J.etapas[J.ei].tipo : '', hp: j ? Math.round(j.hp) : 0, vivos:vivos().length, bajas:J.stats ? J.stats.bajas : 0, cabezas:J.stats ? J.stats.cabezas : 0,
    disparos:J.stats ? J.stats.disparos : 0, aciertos:J.stats ? J.stats.aciertos : 0, rehenes:J.stats ? J.stats.rehenes + '/' + J.stats.rehenesTot : '', t:J.stats ? +J.stats.t.toFixed(1) : 0, fin:J.fin, calidad:CALIDAD, llamadas:ren.info.render.calls, tris:ren.info.render.triangles}; },
  dibujarYa(){ dibujar(); }, medir, mostrar, aMenu, armarMisiones, armarArmeria, armarEquipo, listo:false,
  assets(){ return {ok:ASSET.ok, pend:ASSET.pend, fallas:ASSET.fallas.slice(), ms:ASSET.ms, sonidos:Object.keys(SONIDOS).length, banco:Object.keys(BANCO).filter(k=> k !== '__ms').length, bancoMs:BANCO.__ms, post:POST.ok, msaa:POST.msaa, calidad:CALIDAD}; },
};

/* ====================== arranque ====================== */
/* primero se decodifican los assets (imágenes y modelos; el audio espera al primer toque): con un tope, para no quedar trabados */
medir(); iniFX(); iniVM();
(async ()=>{
  const c = $('carga'), pinta = cargaConArte();
  if(Object.keys(ARCH).length) await Promise.race([precargar(pinta), new Promise(ok=> setTimeout(ok, 15000))]);
  ASSET.ms = Math.round(performance.now() - ASSET.t0);
  alLlegarModelos();
  aMenu(); c.style.display = 'none'; window.__S.listo = true;
  requestAnimationFrame(bucle);
})();
</script>
</body></html>
