/* ================================================================ arranque y bucle */
function sonidoCuadro(dt){
  const c = RND.cam, f = new THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion);
  SON.oyente(c.position.x, c.position.y, c.position.z, f.x, f.y, f.z);
  const cerca = MON.activo && MON.estado !== 'lejos' ? Math.hypot(MON.x - JUG.x, MON.z - JUG.z) : 99, nocheK = RND.noche || 0;
  SON.ambiente({afuera:JUG.adentro ? 0 : 1, noche:nocheK, grillos:nocheK > 0.5 && cerca > 16 ? 1 : 0, viento:0.6 + nocheK*0.3, planta:0.3 + nocheK*0.5});
  const gen = [-8.9, 0.9, 12.8];
  if(GEN.andando) SON.bucle('gen', 'generador', {pos:gen, vol:1, tono:GEN.nafta < 15 ? 0.82 : 1, adentro:false, ocluido:JUG.adentro ? 0.8 : 0}); else SON.bucleParar('gen', 0.8);
  if(GEN.andando && JUG.adentro) SON.bucle('vent', 'ventilador', {vol:0.45}); else SON.bucleParar('vent', 0.6);
  if(ELEC.hay) SON.bucle('heladera', 'heladera', {pos:[6.5, 1, -0.55], vol:0.8, adentro:true, ocluido:JUG.adentro ? 0 : 0.7}); else SON.bucleParar('heladera', 0.4);
  if(ELEC.tvOn) SON.bucle('tele', 'tele_estatica', {pos:[-4.5, 1, -4.5], vol:0.7, adentro:true}); else SON.bucleParar('tele');
  if(CAMV.abierta) SON.bucle('pc', 'pc_zumbido', {vol:0.5}); else SON.bucleParar('pc');
  if(J.fase === 'radio' && !J.radioYa) SON.bucle('radioE', 'radio_estatica', {pos:[-6.4, 0.9, -1], vol:0.7, adentro:true, ocluido:JUG.adentro ? 0 : 0.7}); else SON.bucleParar('radioE', 0.2);
  if(!ELEC.hay && FUS.abierta === false && Math.hypot(JUG.x - FUSIBLES.x, JUG.z - FUSIBLES.z) < 8) SON.bucle('chispas', 'chispas', {pos:[FUSIBLES.x, FUSIBLES.y, FUSIBLES.z + 0.1], vol:0.8}); else SON.bucleParar('chispas');
  if(JUG.o2 < 40 && J.modo === 'juego') SON.bucle('jadeo', 'jadeo', {vol:lim((40 - JUG.o2)/30, 0.2, 1)}); else SON.bucleParar('jadeo');
  if(JUG.en === 'placard') SON.bucle('esc', 'respira_escondido', {vol:0.8}); else SON.bucleParar('esc');
  /* el miedo: cerca del bicho el corazón se acelera; persiguiendo, a mil */
  let miedo = 0; if(MON.activo){ miedo = lim(1 - cerca/16, 0, 1)*0.8; if(['persigue', 'caza', 'tira', 'mata'].includes(MON.estado)) miedo = 1; if(['respira', 'arranca'].includes(MON.estado) && cerca < 10) miedo = Math.max(miedo, 0.6); }
  SON.corazon(J.modo === 'juego' || J.modo === 'susto' ? miedo : 0); SON.tension(lim(miedo*0.8 + hNoche()*0.35, 0, 1));
  if(J.modo === 'juego' && noche() && J.fase !== 'fin'){ const quiere = ['persigue', 'caza'].includes(MON.estado) ? 'persecucion' : JUG.en === 'placard' ? 'escondido' : 'noche'; if(SONQ.m !== quiere){ SONQ.m = quiere; SON.musica(quiere); } }
}
const SONQ = {m:null};
function pasoCamaraJuego(dt){
  const c = RND.cam; J.temblor = Math.max(0, J.temblor - dt*1.5);
  if(CAMV.abierta && CAMV.cam){ c.position.copy(CAMV.cam.position); c.quaternion.copy(CAMV.cam.quaternion); c.fov = 72; c.updateProjectionMatrix(); return; }
  if(c.fov !== (MED.w/MED.h > 1.3 ? 66 : 74)){ c.fov = MED.w/MED.h > 1.3 ? 66 : 74; c.updateProjectionMatrix(); }
  if(JUG.en === 'placard'){ const q = JUG.placard, y = alturaPiso(q.piso) + 1.45; c.position.set(q.dentro[0], y, q.dentro[1]); c.rotation.order = 'YXZ';
    const yaw = Math.atan2(-(q.frente[0] - q.dentro[0]), -(q.frente[1] - q.dentro[1])); c.rotation.set(-0.05 + (Math.random() - 0.5)*J.temblor*0.03, yaw + (Math.random() - 0.5)*J.temblor*0.04, 0); return; }
  if(J.modo === 'susto'){ const h = cabezaMon(); const m = new THREE.Matrix4().lookAt(c.position, new THREE.Vector3(h[0], h[1] - 0.05, h[2]), new THREE.Vector3(0, 1, 0)); const q = new THREE.Quaternion().setFromRotationMatrix(m);
    c.quaternion.slerp(q, Math.min(1, dt*22)); c.position.x += (Math.random() - 0.5)*0.03; c.position.y += (Math.random() - 0.5)*0.03; return; }
  ponerCamara(dt, J.temblor);
}
let _ult = performance.now(), _fps = 60, _ms = 0;
function paso(dt){
  if(J.modo === 'menu'){ camaraMenu(dt); pasoMonstruo(dt); return; }
  if(J.pausa) return;
  if(J.modo === 'juego'){
    pasoJugador(dt); pasoInteraccion(dt); pasoReloj(dt); pasoGenerador(dt); pasoElectricidad(dt); pasoLinterna(dt); pasoCamaras(dt); pasoQTE(dt);
    pasoAutos(dt); pasoMonstruo(dt); pasoCola(dt); pasoPuertas(dt); pasoRestos(dt); pasoTele(dt);
    if(JUG.en === 'placard') J.stats.escondidoT = (J.stats.escondidoT || 0) + dt;
    if(J.hora >= 24 && JUG.adentro === false && MON.activo && Math.random() < dt*0.02) SON.fx('m_grito_lejos', {pos:[MON.x, 3, MON.z], vol:0.6});
  } else if(J.modo === 'susto'){ pasoMonstruo(dt); pasoCola(dt); }
  else if(J.modo === 'muerte' || J.modo === 'victoria'){ pasoCola(dt); }
  UI.paso(dt);
}
function dibujar(dt){
  const c = RND.cam;
  if(J.modo === 'juego' || J.modo === 'susto') pasoCamaraJuego(dt);
  aplicarHora(J.hora);
  repartirLuces(c.position.x, c.position.y - 1, c.position.z);
  if(J.modo !== 'menu') sonidoCuadro(dt); else { const f = new THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion); SON.oyente(c.position.x, c.position.y, c.position.z, f.x, f.y, f.z); SON.ambiente({afuera:1, noche:1, grillos:1, viento:0.7, planta:0.6}); }
  RND.rend.info.reset(); RND.rend.render(RND.esc, c);
  pasoGrano(dt);
}
function lazo(t){
  requestAnimationFrame(lazo);
  const dt = lim((t - _ult)/1000, 0, 0.05); _ult = t;
  try { const t0 = performance.now(); paso(dt); dibujar(dt); _ms = performance.now() - t0; _fps += ((dt > 0 ? 1/dt : 60) - _fps)*0.05; } catch(e){ anotarError(e); }
}
function iniciar(){
  armarMateriales(); iniciarRender();
  RND.esc.add(construirCasa()); construirPilaTablas(); construirTele(); construirAutos(); construirMonstruo(); construirCaminos(); construirGrilla(); registrarTodo(); iniciarUI();
  SON.volumen(AJ.musica, AJ.efectos); ponerIdioma(IDIOMA);
  /* compilar todo antes de mostrar: si no, el primer cuadro de cada material traba */
  try { RND.rend.compile(RND.esc, RND.cam); } catch(e){ anotarError(e); }
  $('carga').classList.add('oculto');
  if(AJ.vistoIdioma) menuTitulo(); else menuIdioma();
  const arrancarAudio = () => SON.arrancar(); addEventListener('touchend', arrancarAudio, {passive:true}); addEventListener('click', arrancarAudio);
  requestAnimationFrame(lazo);
}
/* las sondas del banco */
window.__R = {J, JUG, MON, MUNDO, ELEC, GEN, CAMS, CAMV, QTE, FUS, RND, ACC, DIFS, TR_FALTA, ERRORES, AJ, SON:() => SON, MODELO, AFUERA, GR, SALAS, ENT, UI, TIPS,
  nuevaPartida, reintentar, morir, activarMonstruo, pasoMonstruo, caminoAdentro, caminoAfuera, veGrilla, elegirEntrada, clavarTabla, saltarFusibles, abrirCamaras, cerrarCamaras, entrarPlacard, salirPlacard, empezarQTE, empujarQTE,
  menuTitulo, menuIdioma, menuDificultad, menuOpciones, menuComo, pausar, ponerIdioma, amanecer, elegirInteractivo, prepListo, tablasPuestas, aplicarHora, resolver, huir, atrapar, alturaPiso, PISO1, FUSIBLES, tocarCable, LUCES:() => MUNDO.luces,
  paso:(dt, n) => { for(let i = 0; i < (n || 1); i++) paso(dt); }, dibujar:(dt) => dibujar(dt || 0), est:() => ({llamadas:RND.rend.info.render.calls, tri:RND.rend.info.render.triangles, geo:RND.rend.info.memory.geometries, tex:RND.rend.info.memory.textures, fps:_fps, ms:_ms, prog:RND.rend.info.programs ? RND.rend.info.programs.length : 0})};
try { iniciar(); } catch(e){ anotarError(e); $('carga').textContent = 'ERROR: ' + e.message; }
