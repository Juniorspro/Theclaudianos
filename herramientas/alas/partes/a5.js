
/* ====================== el paso ====================== */
let VITRINA = null;
function pasar(){
  J.t++; J.tt += DT; const dt = DT;
  if(J.modo === 'juego' || J.modo === 'menu'){
    if(J.modo === 'juego' && J.stats && !J.fin) J.stats.t += dt;
    for(const a of J.aviones){ if(!a.vivo){ if(a.cayendo) pasarCaida(a, dt); continue; }
      if(a.jug){ if(J.bot || J.demo) botJugador(a, dt); else mandosJugador(a); fijar(a, dt, 0.42, 3300, 1.1); a.gSost = a.gF > 7.5 ? (a.gSost||0) + dt : Math.max(0, (a.gSost||0) - dt*2); } else ia(a, dt);
      volar(a, dt); const disparaba = a.disparando; dispararCanon(a, dt); if(a.jug && a.disparando && !disparaba) J.stats && J.stats.disparos++;
      a.misT -= dt; a.benT -= dt; efectosAvion(a, dt);
      /* los misiles del jugador se recargan de a uno */
      if(a.jug && a.misiles < a.misMax){ a.recargaT += dt; if(a.recargaT >= 12){ a.recargaT = 0; a.misiles++; if(!J.bot) sfx('boton', 0.4); } } else if(a.jug) a.recargaT = 0;
      const piso = Math.max(0, alturaTerreno(a.pos.x, a.pos.z)); if(a.pos.y < piso + 2){ if(J.dios && a.jug){ a.pos.y = piso + 2; a.q.setFromAxisAngle(_EJEY, Math.atan2(-adelante(a).x, -adelante(a).z)); } else { a.hp = 0; derribar(a, null); a.cayendo = false; a.muerto = true; explosion(a.pos, 1.6); if(piso <= 0) salpicon(a.pos, 1.5); escena.remove(a.g); } } }
    for(const a of J.aviones) if(!a.vivo) for(const c of a.cintas) pasarCinta(c, a.pos, 0, 0.3);
    pasarBalas(dt); pasarMisiles(dt); pasarBengalas(dt); pasarBarcos(dt);
    if(J.modo === 'juego') pasarMision(dt); else pasarDemo(dt);
    J.tension = lerp(J.tension, Math.min(1, J.aviones.filter(a=> a.vivo && a.equipo === 'rojo' && J.jug && a.pos.distanceTo(J.jug.pos) < 3000).length/3 + (MISILES.some(m=> m.blanco === J.jug) ? 0.5 : 0)), 0.02);
    if(J.fin){ J.fin.t -= dt; if(J.fin.t <= 0 && !J.fin.hecho){ J.fin.hecho = true; if(J.modo === 'juego') mostrarResultado(); } }
  }
  if(J.modo === 'hangar' && VITRINA){ const a = VITRINA; a.q.setFromEuler(new THREE.Euler(Math.sin(J.tt*0.5)*0.04, 0, Math.sin(J.tt*0.35)*0.12)); a.g.quaternion.copy(a.q); a.g.position.copy(a.pos); a.turbo = 0.35 + 0.25*Math.sin(J.tt*0.9); efectosAvion(a, dt, true); }
  HUMO.pasar(dt); FUEGO.pasar(dt); pasarFlash(dt);
  J.marca = Math.max(0, J.marca - dt); J.golpe = Math.max(0, J.golpe - dt*0.8); J.alarmaMisil = Math.max(0, J.alarmaMisil - dt);
  for(const t of J.textos) t.v -= dt; J.textos = J.textos.filter(t=> t.v > 0); for(const k of J.killfeed) k.t -= dt; J.killfeed = J.killfeed.filter(k=> k.t > 0);
  /* la cámara va con el paso (si fuera con el cuadro, a pocos cuadros por segundo se queda atrás) */
  const jc = J.jug;
  if(J.modo === 'juego' || J.modo === 'res'){ if(jc) camaraJuego(jc, dt); }
  else if(J.modo === 'hangar') camaraHangar(VITRINA, dt); else if(jc) camaraCine(jc.vivo ? jc : (J.aviones.find(a=> a.vivo) || jc), dt);
  sonidoVuelo();
}
/* posquemador, estelas de ala, humo de daño y paso cerca de la cámara */
function efectosAvion(a, dt, quieto){
  const f = a.turbo, fz = quieto ? 0.4 + f*0.5 : 0.25 + a.acel*0.35 + f*0.9;
  for(const l of a.llamas){ l.scale.set(1, 1, fz*(0.9 + Math.random()*0.18)); l.visible = fz > 0.2; } MAT_LLAMA.uniforms.t.value = J.tt; MAT_LLAMA.uniforms.fuerza.value = 1;
  const gA = quieto ? 0 : lim((a.gF - 3.2)/3.5, 0, 0.55) + (a.pos.y > 4200 ? 0.25 : 0);
  a.M.puntas.forEach((p, i)=> pasarCinta(a.cintas[i], mundoDe(a, p), gA, a.def.largo*0.022));
  if(a.hp < a.hpMax*0.5 && !quieto && Math.random() < 0.5){ const cola = mundoDe(a, V3(0, 0, a.def.largo*0.5)); HUMO.emitir(cola, a.vel.clone().multiplyScalar(0.1), 3.5, 2, 12, a.hp < a.hpMax*0.25 ? [0.1,0.1,0.1] : [0.35,0.35,0.36], 0.7); if(a.hp < a.hpMax*0.25) FUEGO.emitir(cola, null, 0.15, 3, 1.5, [1,0.5,0.2], 1); }
  if(!a.jug && !quieto){ const d = a.pos.distanceTo(cam.position); if(d < 140 && !a.paso){ a.paso = true; sfx('pasada', lim(1.3 - d/140, 0.2, 1)); } if(d > 400) a.paso = false; }
}
function sonidoVuelo(){
  if(!AC) return; const j = (J.modo === 'hangar' ? VITRINA : J.jug);
  if(!j || (!j.vivo && J.modo !== 'hangar') || J.modo === 'pausa'){ tonoCabina(null); return; }
  const cab = J.camModo === 1 && J.modo === 'juego' ? 0.55 : 1;
  bucleSfx('motor', (0.22 + j.acel*0.28)*cab*(J.modo === 'hangar' ? 0.4 : 1), 0, 0.75 + j.acel*0.3 + j.turbo*0.15);
  bucleSfx('posq', j.turbo*0.55*cab, 0, 0.9 + j.turbo*0.2);
  if(J.modo !== 'hangar'){ bucleSfx('viento', lim(j.v/j.def.vmax, 0, 1)*0.25 + lim((j.gF - 2)/6, 0, 1)*0.3, 0, 0.8 + j.v/j.def.vmax*0.5); bucleSfx('canon', j.disparando ? 0.7 : 0, 0, 1); }
  if(J.modo !== 'juego'){ tonoCabina(null); return; }
  const viene = MISILES.some(m=> m.blanco === j);
  tonoCabina(viene ? 'alarma' : (j.fijado && j.fijoT >= 1) ? 'fijado' : j.fijado ? 'busca' : null);
}
/* la portada: un duelo de verdad con los pilotos automáticos */
function iniciarDemo(){
  const mi = [0, 1, 4][Math.floor(Math.random()*3)]; J.demo = true; iniciarMision(mi, 'DEMO' + Math.floor(Math.random()*9999)); J.modo = 'menu';
  const j = J.jug; j.ia = {pericia:0.8}; lanzarOla(); J.demoT = 60; MUS.on = true;
}
function pasarDemo(dt){ J.demoT -= dt; const vivos = J.aviones.filter(a=> a.vivo && a.equipo === 'rojo').length;
  if(!J.jug.vivo || J.demoT <= 0){ if(!J.jug.vivo && J.demoT > 6) J.demoT = 6; if(J.demoT <= 0) iniciarDemo(); }
  else if(vivos === 0){ J.olaT = (J.olaT||2) - dt; if(J.olaT <= 0){ J.olaT = 2; J.ola = -1; lanzarOla(); } } }

/* ====================== dibujo ====================== */
function dibujar(){
  const j = J.jug;
  cam.updateMatrixWorld(); cieloMalla.position.copy(cam.position); agua.position.set(cam.position.x, 0, cam.position.z);
  U_AGUA.tiempo.value = J.tt; U_AGUA.camPos.value.copy(cam.position); U_NUBE.camPos.value.copy(cam.position); ordenarNubes(false);
  NIEBLA_U.fogSolVista.value.copy(SOLDIR).transformDirection(cam.matrixWorldInverse);
  sol.position.copy(cam.position).addScaledVector(SOLDIR, 5000); sol.target.position.copy(cam.position);
  const dentro = enNube(cam.position); $('nube').style.opacity = (dentro*0.9).toFixed(2);
  /* el sol en pantalla para el destello (se apaga si lo tapa una nube o si está detrás) */
  const sp = _t1.copy(cam.position).addScaledVector(SOLDIR, 10000).project(cam), visto = sp.z < 1 && Math.abs(sp.x) < 1.3 && Math.abs(sp.y) < 1.3;
  POST.solUV.set(sp.x*0.5 + 0.5, sp.y*0.5 + 0.5); POST.solVis = lerp(POST.solVis, visto ? (1 - dentro)*(1 - CIELO.tormenta*0.85)*lim(1.3 - Math.max(Math.abs(sp.x), Math.abs(sp.y)), 0, 1)*0.9 : 0, 0.15);
  POST.danio = J.modo === 'juego' ? Math.max(J.golpe*0.7, j && j.vivo ? lim(1 - j.hp/j.hpMax - 0.55, 0, 0.4) : 0) : 0;
  /* el apagón sólo si se sostienen muchos G un rato: con los giros rápidos, si no, tapaba cada vuelta */
  POST.apagon = lerp(POST.apagon, J.modo === 'juego' && j && j.vivo ? lim(((j.gSost||0) - 2.5)/2.5, 0, 0.7) : 0, 0.03);
  HUMO.mat.uniforms.fogColor.value.copy(U_AGUA.fogColor.value); HUMO.mat.uniforms.fogNear.value = FUEGO.mat.uniforms.fogNear.value = U_AGUA.fogNear.value; HUMO.mat.uniforms.fogFar.value = FUEGO.mat.uniforms.fogFar.value = U_AGUA.fogFar.value;
  HUMO.mat.uniforms.luz.value.copy(CIELO.solCol).convertSRGBToLinear().multiplyScalar(0.8);
  pasarBarato();
  revelar(()=> ren.render(escena, cam));
  dibujarHUD(); dibujarMG();
}
let ultimo = 0, acum = 0;
function bucle(ts){
  requestAnimationFrame(bucle);
  if(!ultimo) ultimo = ts; const dt = Math.min(100, ts - ultimo); ultimo = ts;
  if(J.modo === 'pausa'){ COSTO.ult = 0; return; }
  acum += dt; let pasos = 0; while(acum >= 1000/60 && pasos < 4){ acum -= 1000/60; pasos++; pasar(); }
  if(!pasos) return;
  if(J.t % 20 === 0 && cv3.width !== Math.round(cv3.clientWidth*R)) medir();
  dibujar(); medirCosto(ts);
}

/* ====================== motion graphics sobre los menús ====================== */
const mg = cvM.getContext('2d');
const MG = {t:0, tipeo:0};
function dibujarMG(){
  const W = cvM.width, H = cvM.height, s = RH, visible = (J.modo === 'menu' && $('capaTitulo').classList.contains('ver')) || J.modo === 'hangar'; cvM.classList.toggle('ver', visible); if(!visible) return;
  mg.clearRect(0, 0, W, H); MG.t += DT; const t = MG.t, C = 'rgba(95,212,255,', dib = (a)=> mg.strokeStyle = C + a + ')';
  mg.lineWidth = 1.2*s; mg.font = 'bold ' + 10*s + 'px Bahnschrift, "Roboto Condensed", "Arial Narrow", Arial';
  /* esquinas y reglas */
  dib(0.5); const m = 14*s, e = 26*s; mg.beginPath(); for(const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]){ mg.moveTo(x + dx*e, y); mg.lineTo(x, y); mg.lineTo(x, y + dy*e); } mg.stroke();
  dib(0.25); mg.beginPath(); for(let k=0;k<40;k++){ const x = W*0.35 + k*(W*0.6/40), h = (k % 5 ? 4 : 9)*s; mg.moveTo(x, H - m); mg.lineTo(x, H - m - h); } mg.stroke();
  const j = J.modo === 'hangar' ? VITRINA : J.jug;
  if(J.modo === 'menu' && j && j.vivo){
    /* recuadro de seguimiento sobre el avión que vuela atrás del menú */
    const p = detras(j.pos) ? null : proyectar(j.pos); if(p){ const px = p.x/cvH.width*W, py = p.y/cvH.height*H, r = (44 + Math.sin(t*3)*3)*s;
      dib(0.9); mg.beginPath(); for(const [sx, sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ mg.moveTo(px + sx*r, py + sy*(r - 12*s)); mg.lineTo(px + sx*r, py + sy*r); mg.lineTo(px + sx*(r - 12*s), py + sy*r); } mg.stroke();
      mg.beginPath(); mg.moveTo(px + r, py - r); mg.lineTo(px + r + 30*s, py - r - 22*s); mg.lineTo(px + r + 150*s, py - r - 22*s); mg.stroke();
      mg.fillStyle = '#eaf4ff'; mg.fillText(T(j.def.nom), px + r + 34*s, py - r - 27*s); mg.fillStyle = C + '0.9)';
      mg.fillText('ALT ' + Math.round(j.pos.y) + ' M · ' + Math.round(j.v*3.6) + ' KM/H · G ' + j.gF.toFixed(1), px + r + 34*s, py - r - 10*s); }
    /* telemetría que corre */
    mg.fillStyle = C + '0.55)'; for(let k=0;k<7;k++){ const v = (Math.sin(t*1.7 + k*1.9)*0.5 + 0.5), y = H*0.62 + k*13*s; mg.fillText(['RDR','IFF','ECM','FCS','NAV','EGT','HYD'][k] + ' ' + (v*100).toFixed(1).padStart(5, '0'), W - 120*s, y); mg.fillRect(W - 58*s, y - 6*s, 40*s*v, 3*s); }
    /* radar que barre */
    const rx = W - 70*s, ry = H*0.36, rr = 44*s; dib(0.45); mg.beginPath(); mg.arc(rx, ry, rr, 0, TAU); mg.arc(rx, ry, rr*0.55, 0, TAU); mg.stroke();
    const a = t*1.8; const gr = mg.createConicGradient ? mg.createConicGradient(a - 0.8, rx, ry) : null;
    if(gr){ gr.addColorStop(0, 'rgba(95,212,255,0)'); gr.addColorStop(0.13, 'rgba(95,212,255,0.35)'); gr.addColorStop(0.131, 'rgba(95,212,255,0)'); mg.fillStyle = gr; mg.beginPath(); mg.arc(rx, ry, rr, 0, TAU); mg.fill(); }
    for(const x of J.aviones){ if(!x.vivo || x === j) continue; const dx = (x.pos.x - j.pos.x)/6000*rr, dz = (x.pos.z - j.pos.z)/6000*rr; if(Math.hypot(dx, dz) > rr) continue; mg.fillStyle = x.equipo === 'rojo' ? '#ff4a3d' : '#5fd4ff'; mg.fillRect(rx + dx - 2*s, ry + dz - 2*s, 4*s, 4*s); }
    /* tipeo de sistema */
    MG.tipeo += DT*14; const frase = T('SISTEMAS EN LÍNEA · ESCUADRÓN LISTO'), n = Math.min(frase.length, Math.floor(MG.tipeo % (frase.length + 40)));
    mg.fillStyle = C + '0.85)'; mg.fillText(frase.slice(0, n) + (Math.floor(t*3) % 2 ? '▌' : ''), W*0.41, H - 26*s);   /* a la derecha de los idiomas: debajo quedaba tapado */
  }
  if(J.modo === 'hangar' && j){
    /* fichas técnicas con líneas que salen de las piezas del avión */
    const L = j.def.largo, puntos = [[V3(0, 0, -L*0.48), T('RADAR · NARIZ')], [mundoLocal(j, j.M.puntas[0]), T('ALA · ') + (j.def.alabeo*57).toFixed(0) + '°/S'], [mundoLocal(j, j.M.toberas[0]), T('MOTOR · ') + Math.round(j.def.vmax*3.6) + ' KM/H']];
    puntos.forEach(([p, et], i)=>{ const q = proyectar(p.clone().applyQuaternion(j.q).add(j.pos)); if(!q) return; const x = q.x/cvH.width*W, y = q.y/cvH.height*H, k = lim((t - 0.3 - i*0.25)*2.5, 0, 1); if(k <= 0) return;
      const ex = x + (i % 2 ? -1 : 1)*90*s, ey = y - (60 + i*16)*s; dib(0.85); mg.beginPath(); mg.arc(x, y, 4*s, 0, TAU); mg.moveTo(x, y); mg.lineTo(lerp(x, ex, k), lerp(y, ey, k)); if(k >= 1) mg.lineTo(ex + (i % 2 ? -1 : 1)*110*s, ey); mg.stroke();
      if(k >= 1){ mg.fillStyle = '#eaf4ff'; mg.textAlign = i % 2 ? 'right' : 'left'; mg.fillText(et, ex + (i % 2 ? -1 : 1)*4*s, ey - 5*s); mg.textAlign = 'left'; } });
  }
}
function mundoLocal(a, p){ return p.clone(); }

/* ====================== menús ====================== */
const CAPAS = ['capaTitulo','capaMisiones','capaHangar','capaComo','capaAjustes','capaPausa','capaRes'];
function mostrar(id){
  $('barrido').classList.remove('va'); void $('barrido').offsetWidth; if(id) $('barrido').classList.add('va');
  for(const c of CAPAS) $(c).classList.toggle('ver', c === id); $('mandos').classList.toggle('ver', !id && J.modo === 'juego');
  if(id){ $(id).scrollTop = 0; IN.fuego = IN.turbo = IN.freno = false; IN.x = IN.y = 0; } $('dinero').textContent = '$ ' + G.dinero;
  if(id === 'capaMisiones'){ cancelAnimationFrame(MAPA.raf); MAPA.t = 0; animarMapa(); }
  sfx('deslizar', 0.5); requestAnimationFrame(marcarDeslizables);
}
function boton(id, fn){ $(id).addEventListener('click', ev=>{ ev.preventDefault(); audioIni(); sfx('boton'); fn(); pantallaHorizontal(); }); }
function aMenu(){ salirHangar(); if(J.modo !== 'menu') iniciarDemo(); MG.t = 0; mostrar('capaTitulo'); }
function jugar(mi){ salirHangar(); J.demo = false; J.bot = false; J.dios = false; iniciarMision(mi); J.modo = 'juego'; mostrar(null); acum = 0; MUS.on = true; lanzarOla();
  aviso(MISIONES[mi].nom, '#5fd4ff', MISIONES[mi].lugar); }
function pausar(){ if(J.modo !== 'juego') return; J.modo = 'pausa'; mostrar('capaPausa'); tonoCabina(null); }
function seguir(){ J.modo = 'juego'; mostrar(null); acum = 0; ultimo = 0; }
let misionElegida = 0;
boton('btJugar', ()=>{ misionElegida = Math.min(G.abierto - 1, 4); armarMisiones(); mostrar('capaMisiones'); });
boton('btMisVolver', ()=> mostrar('capaTitulo'));
boton('btDespegar', ()=>{ if(misionElegida < G.abierto) jugar(misionElegida); else sfx('boton'); });
boton('btHangar', entrarHangar); boton('btHanVolver', aMenu);
boton('btComo', ()=> mostrar('capaComo')); boton('btComoVolver', ()=> mostrar('capaTitulo'));
boton('btAjustes', ()=>{ textosAjustes(); mostrar('capaAjustes'); }); boton('btAjVolver', ()=> mostrar('capaTitulo'));
boton('btSonido', ()=>{ G.sonido = !G.sonido; guardar(); if(amo) amo.gain.value = G.sonido ? 0.9 : 0; textosAjustes(); });
const GRAF = ['auto','alta','media','baja'];
boton('btGraf', ()=>{ G.graficos = GRAF[(GRAF.indexOf(G.graficos||'auto') + 1) % GRAF.length]; guardar(); if(G.graficos !== 'auto') fijarCalidad(CALIDAD_FIJA[G.graficos]); costoDeNuevo(); textosAjustes(); });
boton('btInvertir', ()=>{ G.invertir = !G.invertir; guardar(); textosAjustes(); });
boton('btAsist', ()=>{ G.asistencia = !G.asistencia; guardar(); textosAjustes(); });
function textosAjustes(){ $('btSonido').textContent = T('SONIDO') + ': ' + T(G.sonido ? 'SÍ' : 'NO'); $('btGraf').textContent = T('GRÁFICOS') + ': ' + T(({auto:'AUTO', alta:'ALTOS', media:'MEDIOS', baja:'BAJOS'})[G.graficos||'auto']);
  $('btInvertir').textContent = T('MANDO') + ': ' + T(G.invertir ? 'ARRIBA = BAJAR' : 'ARRIBA = SUBIR'); $('btAsist').textContent = T('ASISTENCIA') + ': ' + T(G.asistencia ? 'SÍ' : 'NO'); }
boton('btSeguir', seguir); boton('btReiniciar', ()=> jugar(J.mi)); boton('btSalir', aMenu);
boton('btResSig', ()=>{ misionElegida = Math.min(4, J.mi + 1); iniciarDemo(); armarMisiones(); mostrar('capaMisiones'); });
boton('btResOtra', ()=> jugar(J.mi)); boton('btResHan', entrarHangar); boton('btResMenu', ()=>{ iniciarDemo(); armarMisiones(); mostrar('capaMisiones'); });
document.querySelectorAll('#idiomas button').forEach(b=> b.addEventListener('click', ev=>{ ev.preventDefault(); audioIni(); sfx('boton'); G.idioma = b.dataset.l; guardar(); aplicarIdioma(); textosAjustes(); pantallaHorizontal(); }));

/* ---------- misiones: el archipiélago con rutas que se dibujan ---------- */
const PINES = [[0.18, 0.62], [0.36, 0.3], [0.55, 0.66], [0.72, 0.38], [0.88, 0.7]];
const MAPA = {im:null, t:0, raf:0};
function armarMisiones(){
  const cont = $('mapaMis'); cont.querySelectorAll('.pin').forEach(p=> p.remove());
  PINES.forEach(([x, y], i)=>{ const p = document.createElement('div'); p.className = 'pin' + (i >= G.abierto ? ' cerrada' : '') + (G.estrellas[i] ? ' ya' : '') + (i === misionElegida ? ' sel' : '');
    p.style.left = (x*100) + '%'; p.style.top = (y*100) + '%'; p.textContent = i >= G.abierto ? '🔒' : (i + 1); p.addEventListener('click', ev=>{ ev.preventDefault(); sfx('boton'); misionElegida = i; armarMisiones(); }); cont.appendChild(p); });
  fichaMision(); if(!MAPA.im && ARCH['arte/arte_mapa']) decImagen('arte/arte_mapa', false).then(im=>{ MAPA.im = im; }); cancelAnimationFrame(MAPA.raf); MAPA.t = 0; animarMapa();
}
function animarMapa(){ const c = $('lienzoMapa'); if(!$('capaMisiones').classList.contains('ver')) return; MAPA.raf = requestAnimationFrame(animarMapa); MAPA.t += 1/60;
  const W = c.width = c.clientWidth*RH, H = c.height = c.clientHeight*RH, g = c.getContext('2d'), s = RH, t = MAPA.t;
  if(MAPA.im){ const k = Math.max(W/MAPA.im.width, H/MAPA.im.height); g.drawImage(MAPA.im, (W - MAPA.im.width*k)/2, (H - MAPA.im.height*k)/2, MAPA.im.width*k, MAPA.im.height*k); g.fillStyle = 'rgba(4,14,26,0.35)'; g.fillRect(0, 0, W, H); }
  else { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0d3b63'); gr.addColorStop(1, '#082741'); g.fillStyle = gr; g.fillRect(0, 0, W, H); const r = mulberry(5);
    for(let k=0;k<14;k++){ const x = r()*W, y = r()*H, rad = (16 + r()*50)*s; g.fillStyle = 'rgba(40,160,170,0.35)'; g.beginPath(); g.ellipse(x, y, rad*1.5, rad, r()*3, 0, TAU); g.fill(); g.fillStyle = '#4f7a3a'; g.beginPath(); g.ellipse(x, y, rad, rad*0.65, r()*3, 0, TAU); g.fill(); } }
  /* grilla y rutas */
  g.strokeStyle = 'rgba(95,212,255,0.12)'; g.lineWidth = 1; for(let x=0;x<W;x+=40*s){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for(let y=0;y<H;y+=40*s){ g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.setLineDash([8*s, 6*s]); g.lineDashOffset = -t*30*s; g.lineWidth = 2*s;
  for(let i=0;i<PINES.length - 1;i++){ const [x0, y0] = PINES[i], [x1, y1] = PINES[i+1], k = lim(t*1.6 - i*0.35, 0, 1); if(k <= 0) continue; g.strokeStyle = i + 1 < G.abierto ? 'rgba(255,196,77,0.85)' : 'rgba(95,212,255,0.45)';
    g.beginPath(); g.moveTo(x0*W, y0*H); g.quadraticCurveTo((x0 + x1)/2*W, Math.min(y0, y1)*H - 30*s, lerp(x0, x1, k)*W, lerp(y0, y1, k)*H + (k < 1 ? -Math.sin(k*Math.PI)*15*s : 0)); g.stroke(); }
  g.setLineDash([]);
  /* barrido de radar desde la misión elegida */
  const [px, py] = PINES[misionElegida], rad = ((t*0.8) % 1)*120*s; g.strokeStyle = 'rgba(95,212,255,' + (1 - (t*0.8) % 1)*0.8 + ')'; g.lineWidth = 2*s; g.beginPath(); g.arc(px*W, py*H, rad, 0, TAU); g.stroke();
  /* un avión que viaja por la ruta */
  const u = (t*0.12) % 1, seg = Math.min(PINES.length - 2, Math.floor(u*(PINES.length - 1))), f = u*(PINES.length - 1) - seg, [a0, b0] = PINES[seg], [a1, b1] = PINES[seg + 1];
  const ax = lerp(a0, a1, f)*W, ay = lerp(b0, b1, f)*H, ang = Math.atan2((b1 - b0)*H, (a1 - a0)*W); g.save(); g.translate(ax, ay); g.rotate(ang); g.fillStyle = '#eaf4ff';
  g.beginPath(); g.moveTo(9*s, 0); g.lineTo(-6*s, -7*s); g.lineTo(-3*s, 0); g.lineTo(-6*s, 7*s); g.closePath(); g.fill(); g.restore();
}
function fichaMision(){
  const m = MISIONES[misionElegida], ab = misionElegida < G.abierto, e = G.estrellas[misionElegida]||0, f = $('fichaMis');
  f.innerHTML = ''; const c = document.createElement('canvas'); c.width = 420; c.height = 236; f.appendChild(c); miniatura(c, misionElegida);
  const t = document.createElement('div'); t.className = 't';
  t.innerHTML = '<b>' + (misionElegida + 1) + '. ' + T(m.nom) + '</b>' + T(m.lugar) + '  <span class="est">' + '★'.repeat(e) + '☆'.repeat(3 - e) + ' ' + (G.rangos[misionElegida]||'') + '</span><small>' + (ab ? T(m.txt) : T('BLOQUEADA · cumplí la anterior')) + '</small><small style="color:#ffc44d">' + T('RECOMPENSA') + ' $ ' + m.recompensa + '</small>';
  f.appendChild(t); $('btDespegar').style.opacity = ab ? 1 : 0.4;
}
function miniatura(c, i){ const g = c.getContext('2d'), W = c.width, H = c.height, id = 'arte_m' + (i + 1);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, i === 4 ? '#3a4552' : '#3d8ad6'); gr.addColorStop(0.62, i === 4 ? '#8e99a4' : '#bfe0f7'); gr.addColorStop(0.63, '#0b3c63'); gr.addColorStop(1, '#082741'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if(ARCH['arte/' + id]) decImagen('arte/' + id, false).then(im=>{ if(!im) return; const k = Math.max(W/im.width, H/im.height); g.drawImage(im, (W - im.width*k)/2, (H - im.height*k)/2, im.width*k, im.height*k); }); }

/* ---------- hangar: el avión girando en el cielo, con sus fichas ---------- */
function entrarHangar(){
  HANGAR.i = Math.max(0, ORDEN_AV.indexOf(G.avion)); J.modoAntes = J.modo; J.modo = 'hangar'; for(const a of J.aviones) a.g.visible = false; for(const m of MISILES) m.g.visible = false;
  ponerVitrina(); armarHangar(); MG.t = 0; mostrar('capaHangar'); }
function salirHangar(){ if(VITRINA){ soltarAvion(VITRINA); VITRINA = null; } if(J.modo === 'hangar'){ J.modo = 'menu'; for(const a of J.aviones) if(a.vivo) a.g.visible = true; for(const m of MISILES) m.g.visible = true; } }
function ponerVitrina(){ if(VITRINA) soltarAvion(VITRINA); const id = ORDEN_AV[HANGAR.i], d = statsDe(id); VITRINA = crearAvion(d, 'azul', V3(0, 2400, -18000), 0); VITRINA.acel = 0.5; MG.t = 0; }
function armarHangar(){
  const id = ORDEN_AV[HANGAR.i], A = AVIONES[id], d = statsDe(id), tiene = !!G.aviones[id], f = $('ficha'), maxs = {vmax:460, giro:1.7, alabeo:4.5, hp:220, misiles:10};
  const barra = (et, v, mx, base)=> '<div class="barra">' + T(et) + '<i><u style="width:' + Math.round(100*base/mx) + '%"></u><b style="width:0%" data-w="' + Math.round(100*v/mx) + '%"></b></i><span>' + (Number.isInteger(v) ? v : v.toFixed(1)) + '</span></div>';
  f.innerHTML = '<b>' + T(A.nom) + '</b><small>' + T(A.txt) + '</small>' + barra('VELOCIDAD', Math.round(d.vmax*3.6), maxs.vmax*3.6, Math.round(A.vmax*3.6)) + barra('GIRO', d.giro, maxs.giro, A.giro) + barra('ALABEO', d.alabeo, maxs.alabeo, A.alabeo) + barra('BLINDAJE', d.hp, maxs.hp, A.hp) + barra('MISILES', d.misiles, maxs.misiles, A.misiles);
  requestAnimationFrame(()=> f.querySelectorAll('b[data-w]').forEach(b=> b.style.width = b.dataset.w));
  $('hanDinero').textContent = '$ ' + G.dinero;
  const bt = $('btElegir'); bt.textContent = tiene ? (G.avion === id ? T('EN USO') : T('ELEGIR')) : T('COMPRAR') + ' $' + A.precio; bt.style.opacity = !tiene && G.dinero < A.precio ? 0.45 : 1;
  const M = $('mejoras'); M.innerHTML = ''; M.style.visibility = tiene ? 'visible' : 'hidden';
  for(const k in MEJORAS){ const n = nivelMej(id, k), mj = MEJORAS[k], x = document.createElement('div'); x.className = 'mej';
    x.innerHTML = '<b>' + T(mj.nom) + ' <span class="n">' + '▰'.repeat(n) + '▱'.repeat(3 - n) + '</span></b>' + T(mj.txt) + '<br>' + (n < 3 ? '<button class="boton chico oro">$ ' + mj.precio[n] + '</button>' : '<span class="n">' + T('AL MÁXIMO') + '</span>');
    const b = x.querySelector('button'); if(b) b.addEventListener('click', ev=>{ ev.preventDefault(); if(G.dinero < mj.precio[n]){ sfx('boton'); return; } G.dinero -= mj.precio[n]; (G.mejoras[id] = G.mejoras[id] || {})[k] = n + 1; guardar(); sfx('moneda'); ponerVitrina(); armarHangar(); });
    M.appendChild(x); }
}
boton('btAnt', ()=>{ HANGAR.i = (HANGAR.i + ORDEN_AV.length - 1) % ORDEN_AV.length; ponerVitrina(); armarHangar(); });
boton('btSig', ()=>{ HANGAR.i = (HANGAR.i + 1) % ORDEN_AV.length; ponerVitrina(); armarHangar(); });
boton('btElegir', ()=>{ const id = ORDEN_AV[HANGAR.i], A = AVIONES[id]; if(!G.aviones[id]){ if(G.dinero < A.precio) return; G.dinero -= A.precio; G.aviones[id] = 1; sfx('moneda'); } G.avion = id; guardar(); armarHangar(); });
/* girar el avión arrastrando el dedo en el hangar */
$('capaHangar').addEventListener('touchstart', ev=>{ if(ev.target.closest('button,.panel')) return; HANGAR.arrastre = aLocal(ev.touches[0].clientX, ev.touches[0].clientY)[0]; }, {passive:true});
$('capaHangar').addEventListener('touchmove', ev=>{ if(HANGAR.arrastre === false) return; const x = aLocal(ev.touches[0].clientX, ev.touches[0].clientY)[0]; HANGAR.ang -= (x - HANGAR.arrastre)*0.01; HANGAR.arrastre = x; }, {passive:true});
$('capaHangar').addEventListener('touchend', ()=> HANGAR.arrastre = false, {passive:true});

/* ---------- informe: números que cuentan, estrellas que caen y el sello del rango ---------- */
function mostrarResultado(){
  const gano = J.fin.gano, st = J.stats, mi = J.mi, m = MISIONES[mi], j = J.jug, pres = st.disparos ? st.aciertos/Math.max(1, st.disparos*18) : 0;
  let est = 0; if(gano){ est = 1; if(j.hp > j.hpMax*0.5) est++; if(st.t < 240 + mi*60 || st.bajas >= 6) est++; }
  const paga = gano ? m.recompensa + Math.round(st.puntos*0.5) : Math.round(st.puntos*0.25);
  const rango = !gano ? 'D' : est === 3 ? 'S' : est === 2 ? 'A' : 'B';
  G.dinero += paga; if(gano){ G.estrellas[mi] = Math.max(G.estrellas[mi], est); G.rangos[mi] = G.rangos[mi] && 'SABD'.indexOf(G.rangos[mi]) < 'SABD'.indexOf(rango) ? G.rangos[mi] : rango; G.abierto = Math.max(G.abierto, Math.min(5, mi + 2)); }
  guardar(); J.modo = 'res';
  $('resTit').textContent = T(gano ? 'MISIÓN CUMPLIDA' : 'MISIÓN FALLIDA'); $('resTit').style.color = gano ? '#6dffa8' : '#ff4a3d';
  $('resSub').textContent = T(m.nom) + ' · ' + T('INFORME'); $('rango').textContent = rango;
  $('resEst').innerHTML = [0,1,2].map(k=> '<i style="animation-delay:' + (0.9 + k*0.22) + 's">' + (k < est ? '★' : '☆') + '</i>').join('');
  const filas = [['TIEMPO', Math.floor(st.t/60) + ':' + String(Math.floor(st.t%60)).padStart(2,'0')], ['DERRIBOS', st.bajas], ['MISILES', st.misiles], ['PUNTOS', st.puntos], ['PAGA', '$ ' + paga]];
  $('resumen').innerHTML = filas.map((f, k)=> '<div style="animation-delay:' + (0.2 + k*0.1) + 's"><span>' + T(f[0]) + '</span><b data-v="' + f[1] + '">' + f[1] + '</b></div>').join('');
  contar(); $('btResSig').style.display = gano && mi < 4 ? '' : 'none'; mostrar('capaRes');
}
function contar(){ const els = [...$('resumen').querySelectorAll('b')]; const t0 = performance.now();
  const f = ()=>{ const k = lim((performance.now() - t0 - 500)/900, 0, 1); for(const b of els){ const v = b.dataset.v, n = parseFloat(String(v).replace(/[^0-9.]/g, '')); if(isNaN(n) || /:/.test(v)) continue; b.textContent = String(v).replace(/[0-9.]+/, Math.round(n*suave(k))); } if(k < 1) requestAnimationFrame(f); }; f(); }

/* ---------- desplazar los menús con el dedo (con la pantalla girada el nativo va para el lado que no es) ---------- */
const DESL = {el:null, y:0, v:0, t:0, movio:false, raf:0, sinClic:0};
function capaQueDesliza(n){ while(n && n.classList){ if(n.classList.contains('capa')) return n.scrollHeight > n.clientHeight + 2 ? n : null; n = n.parentNode; } return null; }
function marcarDeslizables(){ document.querySelectorAll('.capa').forEach(c=> c.classList.toggle('desliza', c.scrollHeight > c.clientHeight + 2 && c.scrollTop + c.clientHeight < c.scrollHeight - 4)); }
function inercia(){ cancelAnimationFrame(DESL.raf); let ult = performance.now();
  const f = ahora=>{ const dt = Math.min(40, ahora - ult); ult = ahora; if(!DESL.el) return; DESL.el.scrollTop += DESL.v*dt; DESL.v *= Math.pow(0.9955, dt); marcarDeslizables();
    const tope = DESL.el.scrollTop <= 0 || DESL.el.scrollTop >= DESL.el.scrollHeight - DESL.el.clientHeight - 1; if(Math.abs(DESL.v) > 0.02 && !tope) DESL.raf = requestAnimationFrame(f); };
  DESL.raf = requestAnimationFrame(f); }
document.addEventListener('touchstart', ev=>{ const c = capaQueDesliza(ev.target); cancelAnimationFrame(DESL.raf); DESL.el = c; if(!c || ev.touches.length > 1) return;
  const t = ev.touches[0]; DESL.y = DESL.y0 = aLocalD(t.clientX, t.clientY)[1]; DESL.v = 0; DESL.t = performance.now(); DESL.movio = false; }, {passive:true, capture:true});
document.addEventListener('touchmove', ev=>{ const c = DESL.el; if(!c) return; const t = ev.touches[0], y = aLocalD(t.clientX, t.clientY)[1], ahora = performance.now();
  if(Math.abs(y - DESL.y0) > 9) DESL.movio = true; if(!DESL.movio) return; const dt = Math.max(1, ahora - DESL.t); DESL.v = lerp(DESL.v, (DESL.y - y)/dt, 0.6); DESL.t = ahora;
  c.scrollTop += DESL.y - y; DESL.y = y; marcarDeslizables(); }, {passive:true, capture:true});
document.addEventListener('touchend', ()=>{ if(!DESL.el) return; if(DESL.movio){ DESL.sinClic = performance.now() + 400; if(performance.now() - DESL.t > 90) DESL.v = 0; inercia(); } }, {passive:true, capture:true});
document.addEventListener('click', ev=>{ if(performance.now() < DESL.sinClic && capaQueDesliza(ev.target)){ ev.preventDefault(); ev.stopPropagation(); } }, true);
addEventListener('contextmenu', ev=> ev.preventDefault());

/* ====================== sondas para el banco ====================== */
window.__V = {J, G, IN, MISIONES, x:{ISLAS, agua, cam, escena, U_AGUA, POST, MUNDO, BLANCOS_SUP},
  iniciar(mi, sem){ salirHangar(); J.demo = false; J.dios = false; iniciarMision(mi, sem||'BANCO'); J.modo = 'juego'; J.bot = true; mostrar(null); lanzarOla(); },
  anda(n){ for(let i=0;i<n;i++){ if(J.modo !== 'juego' && J.modo !== 'menu') break; pasar(); } return this.est(); },
  bot(v){ J.bot = v; }, dios(v){ J.dios = v; }, dibujarYa(){ dibujar(); }, mostrar, aMenu, entrarHangar, armarMisiones, listo:false,
  est(){ const j = J.jug; return {modo:J.modo, mi:J.mi, ola:J.ola, hp:j ? Math.round(j.hp) : 0, v:j ? Math.round(j.v*3.6) : 0, alt:j ? Math.round(j.pos.y) : 0, g:j ? +j.gF.toFixed(1) : 0,
    enemigos:J.aviones.filter(a=> a.vivo && a.equipo === 'rojo').length, bajas:J.stats ? J.stats.bajas : 0, misiles:MISILES.length, fin:J.fin, t:J.stats ? +J.stats.t.toFixed(1) : 0, calidad:CALIDAD}; },
  assets(){ return {ok:ASSET.ok, pend:ASSET.pend, fallas:ASSET.fallas.slice(), ms:ASSET.ms, sonidos:Object.keys(SONIDOS).length, banco:Object.keys(BANCO).filter(k=> k !== '__ms').length, post:POST.ok, modelos:Object.keys(MODELOS)}; },
};

/* ====================== arranque ====================== */
(async ()=>{
  medir(); aplicarIdioma(); textosAjustes();
  if(G.graficos && G.graficos !== 'auto') fijarCalidad(CALIDAD_FIJA[G.graficos]); else if(G.calAuto) fijarCalidad(Math.max(0.4, Math.min(1, G.calAuto)));
  const cg = $('carga'), barra = cg.querySelector('.barra2 i'), txt = cg.querySelector('.txt'), base = txt.textContent;
  const pinta = f=>{ barra.style.width = Math.round(f*100) + '%'; txt.textContent = base + ' ' + Math.round(f*100) + ' %'; };
  if(Object.keys(ARCH).length) await Promise.race([precargar(pinta), new Promise(ok=> setTimeout(ok, 15000))]);
  ASSET.ms = Math.round(performance.now() - ASSET.t0);
  alLlegarModelos(); aguaNormalGenerada(); atlasNubesGenerado();
  iniciarDemo(); mostrar('capaTitulo'); cg.style.transition = 'opacity .6s'; cg.style.opacity = 0; setTimeout(()=> cg.style.display = 'none', 650); window.__V.listo = true;
  requestAnimationFrame(bucle);
})();
</script>
</body></html>
