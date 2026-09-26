/* ================================================================ la noche: reloj, generador, aire, luz, cámaras, radio, tele, teléfono
   J es el estado de la partida. La hora va de 16 (4 PM) a 30 (6 AM); arranca parada hasta que escuchás la radio. */
const DIFS = {
  facil:     {segPrep:46, segNoche:64, tablas:18, nafta:35, consumo:0.42, tablaSeg:[8.5, 5.5], respira:[7.0, 5.0], vagar:[34, 15], ve:9,  corre:3.9, adentroSeg:38, reintentar:true,  pilas:3},
  normal:    {segPrep:40, segNoche:72, tablas:15, nafta:20, consumo:0.52, tablaSeg:[7.0, 4.2], respira:[5.5, 3.6], vagar:[28, 10], ve:11, corre:4.5, adentroSeg:50, reintentar:true,  pilas:2},
  pesadilla: {segPrep:34, segNoche:80, tablas:12, nafta:10, consumo:0.62, tablaSeg:[5.6, 3.3], respira:[4.2, 2.8], vagar:[20, 7],  ve:13, corre:5.0, adentroSeg:62, reintentar:false, pilas:1}
};
const J = {modo:'menu', hora:16, corre:false, fase:'llegada', t:0, dif:DIFS.normal, eventos:{}, obj:'', lista:[], temblor:0, susto:0, muerto:null, gano:false,
  stats:{tablas:0, echado:0, nafta:0, escondido:0, fotos:0}, pausa:false, subT:0, farolRoto:false, farolTitila:false, radioYa:false, pensamiento:null, telSuena:0, telEvento:null, retry:null, noche:1};
const ELEC = {hay:true, carga:0, sobre:0, titila:false, malo:0, saltos:0, tvOn:false, pcOn:false};
const GEN = {nafta:20, andando:true};
const CAMS = [
  {id:'c1', nombre:'CÁMARA 1', pos:[6.2, 5.2, -13.9], mira:[0, 1.2, -4], base:[6.1, 1.2, -13.8], instalada:false},
  {id:'c2', nombre:'CÁMARA 2', pos:[5.7, 4.2, 12.4], mira:[-1, 1, 5], base:[5.6, 1.2, 12.2], instalada:false},
  {id:'c3', nombre:'CÁMARA 3', pos:[-5.9, 2.5, 9.9], mira:[-7, 0.8, -2], base:[-5.6, 1.2, 9.6], instalada:false}
];
const CAMV = {abierta:false, i:0, cam:null, perdida:0, senal:1};
const hora12 = h => { const hh = Math.floor(h) % 24, ap = hh >= 12 ? 'PM' : 'AM', v = hh % 12 === 0 ? 12 : hh % 12; return v + ' ' + ap; };
const noche = () => J.hora >= 24;
const TELE = {cv:null, g:null, tex:null, malla:null, modo:'apagada', t:0};

function pensar(txt, seg){ J.pensamiento = {txt, t:seg || 3}; }
function objetivo(o, lista){ J.obj = o; J.lista = lista || []; UI.objCambio = true; }

/* ================================================================ lo que se agarra, se prende y se usa */
function registrarTodo(){
  const P = MUNDO.puertas, V = MUNDO.ventanas;
  /* la radio del living */
  registrar({id:'radio', pos:RADIO_POS, sel:[0.5, 0.3, 0.3], piso:0, et:() => !J.radioYa ? tr('PRENDER LA RADIO') : prepListo() && J.hora < 23 ? tr('ADELANTAR LA NOCHE') : tr('ESCUCHAR LA RADIO'),
    hacer:() => { if(!J.radioYa) empezarRadio(); else if(prepListo() && J.hora < 23){ J.hora = 23.4; SON.fx('radio_on'); pensar(tr('Mejor que esté todo listo...'), 3); } else repetirRadio(); }});
  /* la tele */
  registrar({id:'tele', pos:[TELE_POS.x, TELE_POS.y, TELE_POS.pantalla], sel:[1.1, 0.7, 0.3], piso:0, et:() => ELEC.tvOn ? tr('APAGAR LA TELE') : tr('PRENDER LA TELE'), ok:() => ELEC.hay, no:() => pensar(tr('No hay luz.')),
    hacer:() => { ELEC.tvOn = !ELEC.tvOn; SON.fx(ELEC.tvOn ? 'tele_on' : 'interruptor', {pos:[TELE_POS.x, 1, TELE_POS.pantalla]}); }});
  /* el teléfono de la cocina */
  registrar({id:'telefono', pos:[2.18, 1.5, -1.6], sel:[0.12, 0.35, 0.3], piso:0, et:() => J.telSuena > 0 ? tr('ATENDER') : tr('TELÉFONO'), ok:() => J.telSuena > 0,
    hacer:() => atenderTelefono()});
  /* la linterna en la cómoda del dormitorio */
  registrar({id:'comoda', pos:[-4.3, 0.62, 0.62], sel:[0.85, 0.5, 0.1], piso:0, et:() => JUG.linterna.tiene ? tr('CAJÓN VACÍO') : tr('BUSCAR EN EL CAJÓN'), ok:() => !JUG.linterna.tiene,
    hacer:() => { JUG.linterna.tiene = true; JUG.linterna.bat = 100; SON.fx('agarrar'); pensar(tr('Una linterna. Con esto me arreglo.'), 3); UI.barraCambio = true; }});
  /* pilas: el cajón de la cocina y el estante del galpón */
  const pila = (id, pos, sel, et) => { let hay = true; registrar({id, pos, sel, piso:0, et:() => hay ? tr(et) : tr('NO HAY NADA'), ok:() => hay,
    hacer:() => { hay = false; JUG.linterna.repuestos++; SON.fx('bateria'); pensar(tr('Pilas. Me van a hacer falta.'), 2.5); UI.barraCambio = true; }, reponer:() => { hay = true; }}); };
  pila('pila_cocina', [3.3, 0.72, -4.24], [0.9, 0.3, 0.1], 'BUSCAR EN EL CAJÓN'); pila('pila_galpon', [-9.55, 1.1, 11.2], [0.4, 0.2, 0.4], 'AGARRAR PILAS');
  /* la heladera: dos gaseosas */
  let gaseosas = 2; registrar({id:'heladera', pos:[6.1, 1.2, -0.55], sel:[0.1, 1.8, 0.8], piso:0, et:() => gaseosas ? tr('ABRIR LA HELADERA') : tr('HELADERA VACÍA'), ok:() => gaseosas > 0,
    hacer:() => { JUG.inv.gaseosas += gaseosas; gaseosas = 0; SON.fx('agarrar'); pensar(tr('Gaseosas. Para correr.'), 2.5); UI.barraCambio = true; }, reponer:() => { gaseosas = 2; }});
  /* la llave inglesa en el lavadero */
  registrar({id:'llave', pos:[0.75, 0.97, 3.25], sel:[0.35, 0.1, 0.5], piso:0, et:() => JUG.inv.llave ? tr('NO HAY NADA') : tr('AGARRAR LA LLAVE INGLESA'), ok:() => !JUG.inv.llave,
    hacer:() => { JUG.inv.llave = true; SON.fx('llave'); pensar(tr('Para la caja de fusibles.'), 2.5); UI.barraCambio = true; }});
  /* la pila de tablas y el martillo, arriba */
  J.pilaTablas = J.dif.tablas;
  registrar({id:'tablas', pos:[-3.4, PISO1 + 0.3, -3.6], sel:[1.3, 0.5, 0.7], piso:1, et:() => J.pilaTablas > 0 ? tr('AGARRAR TABLAS ({0})', J.pilaTablas) : tr('NO QUEDAN TABLAS'),
    ok:() => J.pilaTablas > 0 && JUG.inv.tablas < 3, no:() => pensar(JUG.inv.tablas >= 3 ? tr('No puedo llevar más de tres.') : tr('No quedan tablas.')),
    hacer:() => { const n = Math.min(3 - JUG.inv.tablas, J.pilaTablas); J.pilaTablas -= n; JUG.inv.tablas += n; JUG.inv.martillo = true; SON.fx('tablas_agarrar'); actualizarPilaTablas(); UI.barraCambio = true; }});
  /* las ventanas: se clavan de a una tabla */
  for(const id in V){ const v = V[id], y = v.pos[1];
    registrar({id:'v_' + id, pos:[v.adentro[0], y, v.adentro[1]], selPos:[v.pos[0] - v.n[0]*0.2, y, v.pos[2] - v.n[1]*0.2], sel:v.eje === 'x' ? [v.w + 0.4, v.sy1 - v.sy0 + 0.2, 0.12] : [0.12, v.sy1 - v.sy0 + 0.2, v.w + 0.4], piso:v.piso, r:2.2, ang:0.7, mantener:0.95, repetir:true,
      et:() => v.tablas >= 3 ? tr('TIENE 3 TABLAS') : JUG.inv.tablas ? tr('CLAVAR UNA TABLA ({0}/3)', v.tablas) : tr('NECESITÁS TABLAS ({0}/3)', v.tablas),
      ok:() => v.tablas < 3 && JUG.inv.tablas > 0, no:() => { if(v.tablas < 3) pensar(tr('Las tablas están arriba, en el dormitorio.'), 3); },
      durante:(p, dt) => { const k = Math.floor(p*3); if(k !== J._golpeK){ J._golpeK = k; SON.fx('martillo', {pos:v.pos, adentro:true}); JUG.ruido = 12; } },
      hacer:() => { clavarTabla(v); J._golpeK = -1; }}); }
  /* las llaves de luz */
  for(const L of MUNDO.luces){ if(!L.llave) continue;
    registrar({id:'luz_' + L.id, pos:L.llave, sel:[0.14, 0.18, 0.14], piso:L.piso, r:1.7, ang:0.6, et:() => !ELEC.hay ? tr('NO HAY LUZ') : L.on ? tr('APAGAR LA LUZ') : tr('PRENDER LA LUZ'),
      hacer:() => { SON.fx('interruptor', {pos:L.llave, adentro:true}); if(!ELEC.hay){ pensar(tr('Saltaron los fusibles. La caja está atrás de la casa.'), 3.5); return; } L.on = !L.on; }}); }
  /* las puertas: abrir y cerrar; las de afuera también con llave (el cerrojo va aparte, del lado de adentro) */
  for(const id in P){ const p = P[id], y = p.y0 + 1.1;
    registrar({id:'p_' + id, puerta:id, pos:[p.centro[0], y, p.centro[1]], sel:p.eje === 'x' ? [p.w, 2.1, 0.12] : [0.12, 2.1, p.w], selPos:[p.centro[0], p.y0 + 1.06, p.centro[1]], piso:p.piso, r:2.0, ang:0.6,
      et:() => p.rota ? tr('ROTA') : p.meta > 0.5 ? tr('CERRAR') : p.llave ? tr('SACAR LA LLAVE') : tr('ABRIR'), ok:() => !p.rota,
      hacer:() => { if(p.llave){ p.llave = false; SON.fx('puerta_llave', {pos:[p.centro[0], y, p.centro[1]]}); return; } moverPuerta(p, p.meta > 0.5 ? 0 : 1, true); }});
    if(p.ext){ const lx = p.centro[0] - p.n[0]*0.25 + (p.eje === 'x' ? p.w*0.62 : 0), lz = p.centro[1] - p.n[1]*0.25 + (p.eje === 'z' ? p.w*0.62 : 0);
      registrar({id:'cerrojo_' + id, puerta:id, pos:[lx, y, lz], sel:[0.18, 0.25, 0.18], piso:0, r:1.8, ang:0.45, oculto:() => !JUG.adentro,
        et:() => p.llave ? tr('SACAR LA LLAVE') : p.meta > 0.5 ? tr('CERRÁ LA PUERTA PRIMERO') : tr('CERRAR CON LLAVE'), ok:() => p.meta < 0.5 && !p.rota,
        hacer:() => { p.llave = !p.llave; SON.fx('puerta_llave', {pos:[lx, y, lz]}); }}); } }
  /* los placards */
  for(const id in MUNDO.placards){ const q = MUNDO.placards[id];
    registrar({id:'pl_' + id, pos:[q.frente[0] + (q.dentro[0] - q.frente[0])*0.55, q.pos[1], q.frente[1] + (q.dentro[1] - q.frente[1])*0.55], sel:[0.7, 1.9, 0.7], piso:q.piso, r:2.0, ang:0.6, et:() => tr('ESCONDERSE'),
      hacer:() => entrarPlacard(q)}); }
  /* la compu de las cámaras */
  registrar({id:'pc', pos:[-3.6, PISO1 + 1.0, -0.45], sel:[0.65, 0.5, 0.35], piso:1, et:() => ELEC.hay ? tr('VER LAS CÁMARAS') : tr('NO HAY LUZ'), ok:() => ELEC.hay, no:() => pensar(tr('Sin luz no anda la compu.')),
    hacer:() => abrirCamaras()});
  /* las cámaras de afuera, para instalar */
  for(const c of CAMS) registrar({id:'cam_' + c.id, pos:c.base, sel:[0.5, 0.5, 0.5], piso:0, r:2.3, ang:0.8, mantener:1.3, oculto:() => c.instalada, et:() => tr('INSTALAR {0}', tr(c.nombre)),
    durante:(p) => { if(Math.random() < 0.05) SON.fx('martillo', {pos:c.base, vol:0.5}); }, hacer:() => { c.instalada = true; SON.fx('camara_instalar', {pos:c.pos}); pensar(tr('Listo. Se ve desde la compu de arriba.'), 3); }});
  /* el generador, el tambor de nafta y el bidón */
  registrar({id:'generador', pos:[-8.9, 0.95, 12.5], sel:[1.3, 1.0, 0.9], piso:0, r:2.4, ang:0.8, mantener:1.7, et:() => JUG.inv.bidon > 0 ? tr('CARGAR NAFTA ({0}/100)', Math.round(GEN.nafta)) : tr('GENERADOR {0}/100', Math.round(GEN.nafta)),
    ok:() => JUG.inv.bidon > 0 && GEN.nafta < 99.5, no:() => pensar(JUG.inv.bidon === 0 ? tr('El bidón está vacío. El tambor está al lado.') : JUG.inv.bidon < 0 ? tr('Necesito el bidón de nafta.') : tr('Está lleno.')),
    durante:(p, dt) => { if(!J._glug){ J._glug = true; SON.fx('combustible', {pos:[-8.9, 0.9, 12.5]}); } },
    hacer:() => { J._glug = false; const antes = GEN.nafta; GEN.nafta = Math.min(100, GEN.nafta + 34); J.stats.nafta += GEN.nafta - antes; JUG.inv.bidon = 0; if(antes <= 0.01){ SON.fx('generador_arranca', {pos:[-8.9, 0.9, 12.5]}); } UI.barraCambio = true; }});
  registrar({id:'tambor', pos:[-6.7, 1.05, 13.3], sel:[0.7, 1.0, 0.7], piso:0, r:2.2, ang:0.8, mantener:0.9, et:() => JUG.inv.bidon < 0 ? tr('TAMBOR DE NAFTA') : JUG.inv.bidon ? tr('EL BIDÓN ESTÁ LLENO') : tr('LLENAR EL BIDÓN'),
    ok:() => JUG.inv.bidon === 0, no:() => { if(JUG.inv.bidon < 0) pensar(tr('Me falta el bidón.')); },
    hacer:() => { JUG.inv.bidon = 1; SON.fx('combustible', {pos:[-6.7, 1, 13.3], tono:1.3, vol:0.7}); UI.barraCambio = true; }});
  registrar({id:'bidon', pos:[-7.2, 0.25, 10.8], sel:[0.35, 0.4, 0.2], piso:0, r:2.0, ang:0.8, oculto:() => JUG.inv.bidon >= 0, et:() => tr('AGARRAR EL BIDÓN'),
    hacer:() => { JUG.inv.bidon = 1; SON.fx('bidon_agarrar'); pensar(tr('Lleno. El generador está acá al lado.'), 2.5); UI.barraCambio = true; }});
  /* la caja de fusibles */
  registrar({id:'fusibles', pos:[FUSIBLES.x, FUSIBLES.y, FUSIBLES.z + 0.2], sel:[0.65, 0.85, 0.2], piso:0, r:2.0, ang:0.7, et:() => ELEC.hay ? tr('LOS FUSIBLES ANDAN') : JUG.inv.llave ? tr('ARREGLAR LOS FUSIBLES') : tr('NECESITÁS LA LLAVE INGLESA'),
    ok:() => !ELEC.hay && JUG.inv.llave, no:() => { if(!ELEC.hay) pensar(tr('Necesito la llave inglesa. Creo que está en el lavadero.'), 3.5); }, hacer:() => abrirFusibles()});
}
function prepListo(){ return JUG.linterna.tiene && tablasPuestas() >= 1 && CAMS.some(c => c.instalada) && GEN.nafta >= 60; }
const tablasPuestas = () => Object.values(MUNDO.ventanas).reduce((a, v) => a + v.tablas, 0);
function clavarTabla(v){ if(v.tablas >= 3 || JUG.inv.tablas <= 0) return; JUG.inv.tablas--; v.tablas++; v.hp = 1; J.stats.tablas++; SON.fx('clavo_final', {pos:v.pos, adentro:true});
  mostrarTablas(v); UI.barraCambio = true; if(!JUG.inv.tablas) JUG.inv.martillo = J.pilaTablas > 0 || JUG.inv.martillo; }
function mostrarTablas(v){ v.mTablas.forEach((m, i) => { m.visible = i < v.tablas; }); }
/* la pila de tablas se achica de verdad */
function actualizarPilaTablas(){ if(!MUNDO.pilaTablas) return; MUNDO.pilaTablas.forEach((m, i) => { m.visible = i < J.pilaTablas; }); }
function construirPilaTablas(){ MUNDO.pilaTablas = []; const r = mulberry(5);
  for(let i = 0; i < 18; i++){ const m = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 0.24), MAT.tabla); m.position.set(-3.4 + (r() - 0.5)*0.08, PISO1 + 0.04 + Math.floor(i/3)*0.065, -3.6 + (i % 3 - 1)*0.25); m.rotation.y = (r() - 0.5)*0.12; MUNDO.grupo.add(m); MUNDO.pilaTablas.push(m); }
  actualizarPilaTablas(); }
/* las puertas se mueven a su meta; la colisión cambia recién cuando pasa la mitad */
function moverPuerta(p, meta, conSonido){ p.meta = meta; if(conSonido) SON.fx(meta > 0.5 ? 'puerta_abre' : 'puerta_cierra', {pos:[p.centro[0], p.y0 + 1.1, p.centro[1]], adentro:true}); if(meta < 0.5) JUG.ruido = Math.max(JUG.ruido, 7); }
function pasoPuertas(dt){ for(const id in MUNDO.puertas){ const p = MUNDO.puertas[id]; const antes = p.abierta; p.abierta += lim(p.meta - p.abierta, -dt*2.6, dt*2.6);
  if(antes !== p.abierta){ p.hoja.rotation.y = -p.abierta*1.55*(p.lado || 1); ajustarColPuerta(p); } } }

/* ================================================================ el generador y el aire */
function pasoGenerador(dt){
  const antes = GEN.nafta;
  if(J.corre && J.hora >= 20 && J.fase !== 'fin'){ const k = J.hora >= 24 ? 1 : 0.35; GEN.nafta = Math.max(0, GEN.nafta - dt*J.dif.consumo*k); }
  if(antes > 0 && GEN.nafta <= 0){ SON.fx('generador_para', {pos:[-8.9, 0.9, 12.5]}); pensar(tr('Se apagó el generador... no hay aire.'), 3.5); }
  if(antes > 15 && GEN.nafta <= 15) SON.fx('generador_tose', {pos:[-8.9, 0.9, 12.5]});
  GEN.andando = GEN.nafta > 0;
  /* el aire: sin generador se acaba; afuera de noche también, pero despacio (la niebla de la planta) */
  const J2 = JUG; let d = 0;
  if(!GEN.andando) d -= 2.3; if(!J2.adentro && noche()) d -= 0.4; if(GEN.andando && J2.adentro) d += 9;
  if(J2.en === 'placard' && GEN.andando) d += 9;
  if(J.fase === 'fin' || !J.corre && J.hora < 20) d = Math.max(d, 5);
  J2.o2 = lim(J2.o2 + d*dt, 0, 100);
  if(J2.o2 <= 0 && J.modo === 'juego') morir('aire');
  if(J2.o2 < 35 && Math.random() < dt*0.35) SON.fx('tos', {vol:0.8});
}

/* ================================================================ la luz de la casa: muchas prendidas a la vez hacen saltar los fusibles */
function pasoElectricidad(dt){
  let carga = 0; for(const L of MUNDO.luces) if(L.on && !L.siempre) carga++;
  if(ELEC.tvOn) carga++; if(CAMV.abierta) carga++;
  ELEC.carga = carga; ELEC.titila = false;
  if(ELEC.hay){ if(carga > 4){ ELEC.sobre += dt; ELEC.titila = Math.random() < 0.3; if(ELEC.sobre > 2.2) saltarFusibles(); } else ELEC.sobre = Math.max(0, ELEC.sobre - dt*2); }
  if(!ELEC.hay){ ELEC.tvOn = false; if(CAMV.abierta) cerrarCamaras(); }
  if(MON.adentro && MON.estado !== 'fuera') ELEC.titila = ELEC.titila || Math.random() < 0.18;
  for(const L of MUNDO.luces) L.parpadeo = Math.max(0, L.parpadeo - dt);
}
function saltarFusibles(){ if(!ELEC.hay) return; ELEC.hay = false; ELEC.sobre = 0; ELEC.saltos++; ELEC.malo = Math.floor(Math.random()*4);
  for(const L of MUNDO.luces) if(!L.siempre) L.on = false; SON.fx('fusible_salta'); vibrar(80); J.temblor = Math.max(J.temblor, 0.4);
  pensar(tr('Saltaron los fusibles. La caja está atrás de la casa.'), 4); }

/* ================================================================ las cámaras de seguridad */
function abrirCamaras(){ if(!CAMS.some(c => c.instalada)){ pensar(tr('No instalé ninguna cámara todavía.'), 3); return; }
  CAMV.abierta = true; JUG.en = 'pc'; CAMV.i = CAMS.findIndex(c => c.instalada); if(!CAMV.cam) CAMV.cam = new THREE.PerspectiveCamera(72, 16/9, 0.1, 200);
  SON.fx('pc_on'); SON.fx('camara_cambio'); UI.camaras(true); }
function cerrarCamaras(){ if(!CAMV.abierta) return; CAMV.abierta = false; JUG.en = 'libre'; UI.camaras(false); SON.fx('boton_atras'); }
function cambiarCamara(d){ for(let k = 1; k <= CAMS.length; k++){ const i = (CAMV.i + d*k + CAMS.length*3) % CAMS.length; if(CAMS[i].instalada){ CAMV.i = i; break; } } SON.fx('camara_cambio'); CAMV.perdida = 0; }
function pasoCamaras(dt){ if(!CAMV.abierta) return; const c = CAMS[CAMV.i], cc = CAMV.cam, t = performance.now()/1000;
  cc.position.set(c.pos[0], c.pos[1], c.pos[2]); cc.lookAt(c.mira[0] + Math.sin(t*0.3)*1.2, c.mira[1], c.mira[2]); cc.aspect = MED.w/MED.h; cc.updateProjectionMatrix();
  /* el bicho cerca de la cámara ensucia la señal; si mira a la cámara, la corta */
  const d = MON.activo ? Math.hypot(MON.x - c.pos[0], MON.z - c.pos[2]) : 99;
  CAMV.senal = lim(d/14, 0.15, 1); CAMV.perdida = Math.max(0, CAMV.perdida - dt);
  if(d < 6 && MON.estado !== 'fuera' && Math.random() < dt*0.25 && CAMV.perdida <= 0){ CAMV.perdida = 2.2; SON.fx('susto_corto', {vol:0.6}); MON.mirarCamara = 1.5; }
  GRANO.k = 2 + (1 - CAMV.senal)*4; }

/* ================================================================ la radio, la tele y el teléfono */
const RADIO = [
  ['ATENCIÓN, VECINOS DEL BARRIO BLOXIA. ESTO ES UN AVISO DE EMERGENCIA.', 0],
  ['ESTA TARDE HUBO UN DERRAME QUÍMICO EN LA PLANTA. NO SABEMOS QUÉ SALIÓ DE AHÍ.', 0],
  ['ANTES DE LAS DOCE, TAPEN LAS VENTANAS CON TABLAS. INSTALEN LAS CÁMARAS DE AFUERA.', 0],
  ['MANTENGAN EL GENERADOR CARGADO: SIN ÉL, EL AIRE DE LA CASA SE VUELVE IRRESPIRABLE.', 0],
  ['SI ALGO QUIERE ENTRAR, PRENDAN LA LUZ DE ESE CUARTO. NO LE GUSTA LA LUZ.', 0],
  ['Y SI ENTRA... ESCÓNDANSE. NO LO DEJEN ENTRAR.', 0]
];
const RADIO_NOCHE = {23:'ÚLTIMO AVISO: TOQUE DE QUEDA. QUE NADIE SALGA A LA CALLE.', 25:'...REPETIMOS: NO SALGAN. NO ABRAN LA PUERTA, AUNQUE ESCUCHEN UNA VOZ CONOCIDA...',
  26.5:'...SE REPORTAN CORTES DE LUZ EN TODO EL BARRIO...', 29:'...FALTA POCO PARA EL AMANECER. LOS EQUIPOS LLEGAN CON EL SOL. AGUANTEN...'};
function empezarRadio(){ J.radioYa = true; SON.fx('radio_on', {pos:RADIO_POS}); let t = 0.8; J.cola = [];
  for(const [txt] of RADIO){ J.cola.push({t, txt, tipo:'radio'}); t += Math.max(3.2, txt.length*0.075) + 0.4; }
  J.cola.push({t, fin:() => { J.corre = true; objetivoPrep(); SON.musica('tarde'); SON.fx('objetivo'); }}); }
function repetirRadio(){ SON.fx('radio_on', {pos:RADIO_POS}); J.cola = [{t:0.6, txt:RADIO[2][0], tipo:'radio'}, {t:4.8, txt:RADIO[4][0], tipo:'radio'}]; }
function objetivoPrep(){ J.fase = 'prep'; objetivo('Preparate para la noche', ['linterna', 'tabla', 'camara', 'generador']); }
function atenderTelefono(){ if(J.telSuena <= 0) return; J.telSuena = 0; SON.bucleParar('telefono'); SON.fx('telefono_cuelga', {pos:[2.18, 1.5, -1.6], tono:1.3});
  const ev = J.telEvento; J.cola = J.cola || [];
  if(ev === 'tarde') J.cola.push({t:0.8, txt:'¿HOLA? ...', tipo:'telefono'}, {t:3.4, txt:'(RESPIRA)', tipo:'susurro'}, {t:6.4, txt:'...TE VI ENTRAR.', tipo:'telefono'}, {t:9.5, fin:() => SON.fx('telefono_cuelga', {pos:[2.18, 1.5, -1.6]})});
  else J.cola.push({t:0.8, txt:'(RESPIRA)', tipo:'susurro'}, {t:3.6, txt:'...ABRIME LA VENTANA...', tipo:'telefono'}, {t:6.5, fin:() => { SON.fx('telefono_cuelga', {pos:[2.18, 1.5, -1.6]}); if(noche()) MON.forzar = 'v_cocina_s'; }});
}
function pasoCola(dt){ if(!J.cola) return; for(const e of J.cola){ e.t -= dt; if(e.t <= 0 && !e.hecho){ e.hecho = true; if(e.fin) e.fin(); else decir(e.txt, e.tipo); } } J.cola = J.cola.filter(e => !e.hecho); }
function decir(txt, tipo){ const s = tr(txt), dur = SON.voz(s, tipo) || Math.max(2.5, s.length*0.07); UI.subtitulo(s, dur + 0.8, tipo); }
/* la pantalla de la tele: nieve, el noticiero de las 9 y, a las 2, la cara */
function construirTele(){ const [cv, g] = lienzo(128, 96); TELE.cv = cv; TELE.g = g; TELE.tex = new THREE.CanvasTexture(cv); TELE.tex.encoding = THREE.sRGBEncoding;
  /* la tele está contra la pared del fondo del living y mira al frente (−z) */
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.62), new THREE.MeshBasicMaterial({map:TELE.tex, color:0x222222, fog:false})); m.position.set(TELE_POS.x, TELE_POS.y, TELE_POS.pantalla); m.rotation.y = Math.PI; MUNDO.grupo.add(m); TELE.malla = m;
  const marco = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.78, 0.36), MAT.plastico); conFuera(marco.geometry, 0); tintar(marco.geometry, 0x2a2a2e); marco.position.set(TELE_POS.x, TELE_POS.y, TELE_POS.z); MUNDO.grupo.add(marco);
  const b = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), new THREE.MeshBasicMaterial({color:0xd82020})); b.position.set(TELE_POS.x - 0.44, TELE_POS.y - 0.33, TELE_POS.pantalla - 0.001); b.rotation.y = Math.PI; MUNDO.grupo.add(b); TELE.led = b; }
function pasoTele(dt){ if(!TELE.g) return; TELE.t += dt; if(TELE.t < 1/15) return; TELE.t = 0; const g = TELE.g, w = 128, h = 96, m = TELE.malla.material;
  let modo = ELEC.tvOn ? 'nieve' : 'apagada'; if(ELEC.tvOn && J.hora >= 21 && J.hora < 22.3) modo = 'noticia'; if(J.caraTele > 0){ modo = 'cara'; J.caraTele -= 1/15; }
  if(modo === 'apagada'){ m.color.set(0x111111); g.fillStyle = '#050608'; g.fillRect(0, 0, w, h); TELE.tex.needsUpdate = true; return; }
  m.color.set(0xffffff);
  if(modo === 'nieve'){ const d = g.createImageData(w, h); for(let i = 0; i < d.data.length; i += 4){ const v = Math.random()*200; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }
  else if(modo === 'noticia'){ g.fillStyle = '#10204a'; g.fillRect(0, 0, w, h); g.fillStyle = '#c81c1c'; g.fillRect(0, 60, w, 20); g.fillStyle = '#fff'; g.font = 'bold 11px Arial'; g.fillText(tr('ÚLTIMO MOMENTO'), 4, 74);
    g.font = 'bold 8px Arial'; g.fillText(tr('DERRAME EN PLANTA BLOXIA'), 4, 90); g.fillStyle = '#9aff6a'; g.fillRect(40, 14, 48, 36); g.fillStyle = '#2a2a2a'; g.fillRect(46, 22, 12, 28); g.fillRect(64, 18, 10, 32); }
  else { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); dibujarCara(g, 64, 48, 70); }
  TELE.tex.needsUpdate = true; }

/* ================================================================ la calle: los patrulleros de las 9 */
const AUTOS = [];
function construirAutos(){ for(let i = 0; i < 2; i++){ const G = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 1.9), new THREE.MeshPhongMaterial({color:0xe8e8ec, shininess:40})); cuerpo.position.y = 0.75; G.add(cuerpo);
    const techo = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 1.7), new THREE.MeshPhongMaterial({color:0x1a1a2a, shininess:60})); techo.position.set(-0.2, 1.55, 0); G.add(techo);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), new THREE.MeshBasicMaterial({color:0xff2020})); r.position.set(-0.2, 2.0, -0.35); G.add(r);
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), new THREE.MeshBasicMaterial({color:0x2040ff})); a.position.set(-0.2, 2.0, 0.35); G.add(a);
    for(const [x, z] of [[-1.4, -0.95], [1.4, -0.95], [-1.4, 0.95], [1.4, 0.95]]){ const ru = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12), new THREE.MeshPhongMaterial({color:0x111111})); ru.rotation.x = Math.PI/2; ru.position.set(x, 0.4, z); G.add(ru); }
    const faro = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 1.6), new THREE.MeshBasicMaterial({color:0xfff8e0})); faro.position.set(2.12, 0.8, 0); G.add(faro);
    G.visible = false; RND.esc.add(G); AUTOS.push({G, r, a, x:-80, activo:false, v:22, t:0}); } }
function pasoAutos(dt){ if(!J.corre) return;
  if(!J.eventos.autos && J.hora >= 21.05){ J.eventos.autos = true; AUTOS.forEach((A, i) => { A.activo = true; A.x = -75 - i*14; A.G.visible = true; }); }
  for(const A of AUTOS){ if(!A.activo) continue; A.x += A.v*dt; A.t += dt; A.G.position.set(A.x, 0, -19.5); const on = Math.floor(A.t*6) % 2; A.r.material.color.set(on ? 0xff2020 : 0x300000); A.a.material.color.set(on ? 0x100020 : 0x2040ff);
    SON.bucle('sirena' + AUTOS.indexOf(A), 'sirena', {pos:[A.x, 1.2, -19.5], vol:1});
    if(Math.abs(JUG.x - A.x) < 2.4 && JUG.z < -17.4 && JUG.z > -21.6 && J.modo === 'juego') morir('auto');
    if(A.x > 85){ A.activo = false; A.G.visible = false; SON.bucleParar('sirena' + AUTOS.indexOf(A)); } } }
