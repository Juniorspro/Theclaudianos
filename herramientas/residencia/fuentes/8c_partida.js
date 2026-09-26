/* ================================================================ la partida: empezar, las horas, los sustos guionados, morir, amanecer */
function nuevaPartida(dif){
  J.dif = DIFS[dif] || DIFS.normal; AJ.dificultad = dif; guardarAj();
  Object.assign(J, {modo:'juego', hora:16, corre:false, fase:'llegada', eventos:{}, obj:'', lista:[], temblor:0, susto:0, muerto:null, gano:false, cola:[], radioYa:false, telSuena:0, caraTele:0, retry:null, farolRoto:false, farolTitila:false,
    stats:{tablas:0, echado:0, nafta:0, escondido:0}, t:0});
  Object.assign(JUG, {x:0.25, y:0, z:-15.2, piso:0, yaw:Math.PI, pitch:0.02, vx:0, vz:0, fase:0, energia:100, o2:100, en:'libre', placard:null, gaseosaT:0, ruido:0,
    linterna:{tiene:false, on:false, bat:100, repuestos:0, falla:0}, inv:{tablas:0, martillo:false, bidon:-1, llave:false, gaseosas:0}});
  GEN.nafta = J.dif.nafta; QTE.estado = 'nada'; ELEC.hay = true; ELEC.sobre = 0; ELEC.tvOn = false; ELEC.saltos = 0;
  for(const L of MUNDO.luces) if(!L.siempre) L.on = false;
  for(const id in MUNDO.ventanas){ const v = MUNDO.ventanas[id]; v.tablas = 0; v.vidrio = true; v.rota = false; v.vaho = 0; v.mVidrio.visible = true; mostrarTablas(v); }
  for(const id in MUNDO.puertas){ const p = MUNDO.puertas[id]; p.rota = false; p.hp = 1; p.llave = false; const abierta = !p.ext && !['p_bano', 'p_bano2'].includes(id) ? 1 : 0; p.meta = p.abierta = abierta; p.hoja.rotation.y = -abierta*1.55*(p.lado || 1); ajustarColPuerta(p); }
  for(const c of CAMS) c.instalada = false; for(const o of MUNDO.interactivos) if(o.reponer) o.reponer();
  J.pilaTablas = J.dif.tablas; actualizarPilaTablas();
  for(const r of RESTOS) RND.esc.remove(r.m); RESTOS.length = 0;
  Object.assign(MON, {activo:false, estado:'fuera', preview:0, adentro:false, forzar:null, x:0, y:0, z:40}); MODELO.raiz.visible = false;
  objetivo('Entrá a tu casa'); SON.musica(null); SONQ.m = null; ENT.activo = true; UI.hud(true); UI.barraCambio = true;
  pensar(tr('Por fin en casa. ¿Qué es ese olor?'), 3.5); PROG.intentos++; guardarProg();
}
/* reintentar: la noche vuelve a las 12 con lo que tenías a las 12 */
function foto12(){ J.retry = {tablas:Object.fromEntries(Object.values(MUNDO.ventanas).map(v => [v.id, v.tablas])), nafta:GEN.nafta, inv:JSON.parse(JSON.stringify(JUG.inv)), lin:JSON.parse(JSON.stringify(JUG.linterna)),
  cams:CAMS.map(c => c.instalada), pila:J.pilaTablas, pos:[JUG.x, JUG.z, JUG.piso, JUG.yaw], puertas:Object.fromEntries(Object.values(MUNDO.puertas).map(p => [p.id, [p.meta, p.llave]]))}; }
function reintentar(){
  const R = J.retry; if(!R) return nuevaPartida(AJ.dificultad);
  Object.assign(J, {modo:'juego', hora:24, corre:true, fase:'noche', muerto:null, temblor:0, cola:[], telSuena:0}); J.eventos = {medianoche:true, autos:true, llamada1:true, noticia:true, preview:true, cruce:true, radio23:true};
  for(const id in MUNDO.ventanas){ const v = MUNDO.ventanas[id]; v.tablas = R.tablas[id]; v.vidrio = true; v.rota = false; v.mVidrio.visible = true; mostrarTablas(v); }
  for(const id in MUNDO.puertas){ const p = MUNDO.puertas[id]; p.rota = false; p.hp = 1; p.meta = p.abierta = R.puertas[id][0]; p.llave = R.puertas[id][1]; p.hoja.rotation.y = -p.abierta*1.55*(p.lado || 1); ajustarColPuerta(p); }
  QTE.estado = 'nada'; GEN.nafta = R.nafta; JUG.inv = JSON.parse(JSON.stringify(R.inv)); JUG.linterna = JSON.parse(JSON.stringify(R.lin)); JUG.linterna.on = false; CAMS.forEach((c, i) => c.instalada = R.cams[i]); J.pilaTablas = R.pila; actualizarPilaTablas();
  Object.assign(JUG, {x:R.pos[0], z:R.pos[1], piso:R.pos[2], y:alturaPiso(R.pos[2]), yaw:R.pos[3], pitch:0, vx:0, vz:0, o2:100, energia:100, en:'libre', placard:null});
  ELEC.hay = true; ELEC.sobre = 0; for(const L of MUNDO.luces) if(!L.siempre) L.on = false;
  for(const r of RESTOS) RND.esc.remove(r.m); RESTOS.length = 0;
  activarMonstruo(); objetivo('Sobreviví la noche'); SON.musica('noche'); SONQ.m = 'noche'; SON.amortiguar(0); ENT.activo = true; UI.hud(true); UI.cerrarTodo(); UI.barraCambio = true;
}

/* ================================================================ el reloj y lo que pasa a cada hora */
function pasoReloj(dt){
  /* llegar: al entrar a la casa la radio del living hace ruido y te llama */
  if(J.fase === 'llegada' && JUG.adentro){ J.fase = 'radio'; objetivo('Escuchá la radio'); SON.fx('objetivo'); pensar(tr('La radio del living está haciendo ruido...'), 3.5); }
  if(!J.corre || J.fase === 'fin') return;
  const seg = J.hora < 24 ? J.dif.segPrep : J.dif.segNoche, antes = J.hora; J.hora += dt/seg;
  if(Math.floor(J.hora) !== Math.floor(antes) && J.hora < 30) SON.fx(Math.floor(J.hora) === 24 ? 'medianoche' : 'hora');
  const E = J.eventos, h = J.hora;
  const una = (k, cond, fn) => { if(!E[k] && cond){ E[k] = true; fn(); } };
  una('llamada1', h >= 19, () => { J.telSuena = 12; J.telEvento = 'tarde'; });
  una('farol', h >= 20, () => {});
  una('noticia', h >= 21, () => { if(JUG.adentro && JUG.sala && JUG.sala.id === 'living' && ELEC.tvOn) pensar(tr('¿Un derrame? ¿Acá al lado?'), 3); });
  una('preview', h >= 22, () => { MON.preview = 26; ponerMon(0, 0, 19.5); MON.yaw = Math.PI; MON.anim = 'mira'; MODELO.raiz.visible = true; });
  una('grito1', h >= 22.6, () => SON.fx('m_grito_lejos', {pos:[MUNDO.planta.x*0.4, 5, MUNDO.planta.z*0.4], vol:1.2}));
  una('radio23', h >= 23, () => { if(Math.hypot(JUG.x + 6.4, JUG.z + 1) < 14) decir(RADIO_NOCHE[23], 'radio'); });
  una('cruce', h >= 23.3, () => { MON.preview = 9; ponerMon(-24, 0, -19.5); MON.cruza = true; });
  una('titila', h >= 23.6, () => { ELEC.titilaT = 1.2; SON.fx('chispa', {vol:0.4}); });
  una('medianoche', h >= 24, () => { J.fase = 'noche'; objetivo('Sobreviví la noche'); foto12(); activarMonstruo(); SON.musica('noche'); UI.aviso(tr('12 AM'), 3); if(!prepListo()) pensar(tr('No llegué a prepararme... ya es tarde.'), 4); });
  una('toc', h >= 25, () => { if(MON.estado === 'merodea' || MON.estado === 'lejos'){ SON.fx('toc_toc', {pos:[0.25, 1.2, -5.2], adentro:JUG.adentro}); if(JUG.adentro) pensar(tr('¿Quién golpea a esta hora?'), 3); } });
  una('radio25', h >= 25.2, () => { if(Math.hypot(JUG.x + 6.4, JUG.z + 1) < 14) decir(RADIO_NOCHE[25], 'radio'); });
  una('llamada2', h >= 25.5, () => { J.telSuena = 12; J.telEvento = 'noche'; });
  una('pasos1', h >= 25.8, () => pasosArriba());
  una('caraTele', h >= 26, () => { ELEC.tvOn = ELEC.hay; J.caraTele = 0.35; SON.fx('tele_on', {pos:[TELE_POS.x, 1, TELE_POS.pantalla]}); if(JUG.sala && JUG.sala.id === 'living') SON.fx('susto_corto', {vol:0.7}); });
  una('corte', h >= 26.5, () => { saltarFusibles(); if(Math.hypot(JUG.x + 6.4, JUG.z + 1) < 14) decir(RADIO_NOCHE[26.5], 'radio'); });
  una('pasos2', h >= 27.4, () => pasosArriba());
  una('radio29', h >= 29, () => decir(RADIO_NOCHE[29], 'radio'));
  if(h >= 30 && J.fase !== 'fin') amanecer();
  /* el teléfono suena un rato y se corta */
  if(J.telSuena > 0){ J.telSuena -= dt; J.telT = (J.telT || 0) - dt; if(J.telT <= 0){ J.telT = 3; SON.fx('telefono_suena', {pos:[2.18, 1.5, -1.6], vol:1, adentro:true, ocluido:JUG.adentro ? 0 : 0.8}); } }
  if(ELEC.titilaT > 0){ ELEC.titilaT -= dt; ELEC.titila = true; }
}
/* pasos pesados en el piso de arriba mientras estás abajo (y el bicho está afuera): no hay nadie */
function pasosArriba(){ if(JUG.piso !== 0 || !JUG.adentro || MON.adentro) return; let t = 0; for(let i = 0; i < 5; i++){ const x = JUG.x + (i - 2)*0.7, z = JUG.z + rv(-0.5, 0.5); J.cola.push({t:t += rv(0.5, 0.75), fin:() => SON.fx('m_paso', {pos:[x, PISO1 + 0.1, z], adentro:true, vol:0.8})}); } }

/* ================================================================ esconderse en el placard y aguantar la puerta */
const QTE = {estado:'nada', t:0, dur:5, pos:0.5, vel:0, fuera:0, fuerzaT:0, fuerza:0};
function entrarPlacard(q){ if(JUG.en !== 'libre') return; JUG.en = 'placard'; JUG.placard = q; q.ocupado = true; SON.fx('placard_abre', {adentro:true}); SON.fx('placard_cierra', {adentro:true});
  JUG.vx = JUG.vz = 0; UI.placard(true); SON.amortiguar(0.55); }
function salirPlacard(){ if(JUG.en !== 'placard' || QTE.estado === 'activo') return; const q = JUG.placard; q.ocupado = false; JUG.en = 'libre'; JUG.placard = null;
  JUG.x = q.frente[0]; JUG.z = q.frente[1]; JUG.yaw = q.mira + Math.PI; SON.fx('placard_abre', {adentro:true}); UI.placard(false); SON.amortiguar(0); QTE.estado = 'nada'; }
function empezarQTE(){ const h = hNoche(); Object.assign(QTE, {estado:'activo', t:0, dur:lerp(4.2, 6.2, h)*(J.dif === DIFS.facil ? 0.8 : J.dif === DIFS.pesadilla ? 1.15 : 1), pos:0.5, vel:0, fuera:0, fuerzaT:0, fuerza:0});
  UI.qte(true); SON.fx('golpe_seco'); vibrar(60); }
function empujarQTE(s){ if(QTE.estado !== 'activo') return; QTE.pos = lim(QTE.pos + s*0.06, 0, 1); QTE.vel *= 0.4; SON.fx('placard_cierra', {vol:0.35, tono:rv(0.9, 1.2)}); }
/* el bicho tira de la puerta para un lado y cambia de lado cada tanto (más fuerte a la madrugada); cada toque corre la marca
   un poco hacia el otro lado y frena el tirón. Medido con qte.js: una persona rápida gana 100/97/87% (a las 12, a las 3 y a
   las 6), una normal 100/95/75% y una lenta 98/87/47%. */
function pasoQTE(dt){ if(QTE.estado !== 'activo') return; const h = hNoche(), kd = J.dif === DIFS.facil ? 0.8 : J.dif === DIFS.pesadilla ? 1.15 : 1; QTE.t += dt; QTE.fuerzaT -= dt;
  if(QTE.fuerzaT <= 0){ QTE.fuerzaT = rv(0.5, 1.1); QTE.fuerza = (Math.random() < 0.5 ? -1 : 1)*rv(0.7, 1.2)*0.34*(1 + h*0.6)*kd; if(Math.random() < 0.6) SON.fx('puerta_golpe', {vol:0.55, tono:rv(0.85, 1.1), adentro:true}); J.temblor = Math.max(J.temblor, 0.35); }
  QTE.vel += (QTE.fuerza - QTE.vel)*Math.min(1, dt*4); QTE.pos = lim(QTE.pos + QTE.vel*dt, 0, 1);
  const fuera = Math.abs(QTE.pos - 0.5) > 0.2; if(fuera) QTE.fuera += dt; else QTE.fuera = Math.max(0, QTE.fuera - dt*0.6);
  if(QTE.fuera > 1.0 || QTE.pos <= 0.03 || QTE.pos >= 0.97){ QTE.estado = 'perdido'; UI.qte(false); }
  else if(QTE.t >= QTE.dur){ QTE.estado = 'ganado'; UI.qte(false); J.stats.escondido++; }
}

/* ================================================================ la caja de fusibles: cuatro cables, uno echa chispas */
const FUS = {abierta:false, malo:0};
function abrirFusibles(){ FUS.abierta = true; FUS.malo = ELEC.malo; JUG.en = 'fusibles'; UI.fusibles(true); SON.fx('llave'); }
function tocarCable(i){ if(!FUS.abierta) return; if(i === FUS.malo){ ELEC.hay = true; SON.fx('fusible_ok'); FUS.abierta = false; JUG.en = 'libre'; UI.fusibles(false); pensar(tr('Volvió la luz.'), 2.5); }
  else { SON.fx('choque'); vibrar(120); JUG.energia = Math.max(0, JUG.energia - 45); J.temblor = 0.6; UI.destello(0.5, '#ffffff'); FUS.malo = (FUS.malo + 1 + Math.floor(Math.random()*3)) % 4; ELEC.malo = FUS.malo; UI.fusibles(true); } }
function cerrarFusibles(){ FUS.abierta = false; if(JUG.en === 'fusibles') JUG.en = 'libre'; UI.fusibles(false); }

/* ================================================================ morir y amanecer */
const TIPS = {monstruo:'Si entra, escondete en un placard y aguantá la puerta en el centro.', afuera:'Afuera es peligroso. Salí justo después de echarlo de una ventana.',
  aire:'No dejes que el generador se quede sin nafta: sin él no hay aire.', auto:'A las 9 pasan los patrulleros. No te quedes en la calle.', luz:'Usá las luces de la casa para asustarlo de las ventanas.',
  placard:'Cuando tire de la puerta, tocá ◀ ▶ para que la marca no salga del centro.'};
function morir(causa){
  if(J.modo === 'muerte') return; J.modo = 'muerte'; J.muerto = causa; ENT.activo = false; soltarTodo(); PROG.muertes++; guardarProg();
  SON.amortiguar(1); SON.musica('muerte'); SON.bucleParar('m_resp'); SON.corazon(0); UI.cerrarTodo(); UI.hud(false);
  if(causa === 'aire') SON.fx('tos'); if(causa === 'auto'){ SON.fx('bocina'); SON.fx('golpe_seco'); }
  MODELO.raiz.visible = false; UI.muerte(causa);
}
function amanecer(){ J.fase = 'fin'; J.gano = true; SON.musica('amanecer'); SON.corazon(0); SON.bucleParar('m_resp'); UI.aviso(tr('6 AM'), 3);
  if(MON.activo){ SON.fx('m_grito_lejos', {pos:[MON.x, 3, MON.z], vol:1.4}); if(MON.adentro){ MON.adentro = false; ponerMon(0, 0, 20); } huir(false); MON.cool = 999; }
  if(QTE.estado === 'activo'){ QTE.estado = 'ganado'; UI.qte(false); }
  decir('...SALE EL SOL. SE TERMINÓ. SI ESTÁN ESCUCHANDO ESTO, SOBREVIVIERON.', 'radio');
  PROG.ganadas[AJ.dificultad] = (PROG.ganadas[AJ.dificultad] || 0) + 1; guardarProg();
  J.cola.push({t:7, fin:() => { J.modo = 'victoria'; ENT.activo = false; soltarTodo(); UI.cerrarTodo(); UI.hud(false); SON.musica('victoria'); UI.victoria(); }});
}
