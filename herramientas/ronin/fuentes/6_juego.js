/* ================================================================ la campaña
   Como en el original: cada capítulo son 10 etapas seguidas, con una élite a mitad de camino y el jefe al final.
   Entre etapa y etapa se elige una bendición de tres. Si caés, el capítulo vuelve a empezar pero el oro queda.
   Las batallas de yokai son aparte y se abren al terminar los capítulos. */
const CAPITULOS = [
  {id:1, nombre:'La aldea en llamas', lugares:['aldea', 'bambu'], mult:1,
    etapas:['bandido', 'lancero', 'bandido', 'lancero', {t:'bandido', elite:true}, 'lancero', 'bandido', 'lancero', {t:'lancero', elite:true}, 'general']},
  {id:2, nombre:'El templo nevado', lugares:['templo'], mult:1.4,
    etapas:['shinobi', 'monje', 'shinobi', 'monje', {t:'monje', elite:true}, 'shinobi', 'bandido', 'monje', {t:'shinobi', elite:true}, 'maestro']},
  {id:3, nombre:'La luna de sangre', lugares:['luna'], mult:1.85,
    etapas:['lancero', 'shinobi', 'monje', 'bandido', {t:'shinobi', elite:true}, 'monje', 'lancero', {t:'monje', elite:true}, {t:'bandido', elite:true}, 'oni']},
];
const YOKAI = [{id:'gashadokuro', nombre:'Gashadokuro', txt:'El esqueleto gigante hecho de los que murieron de hambre.', abre:1, mult:1, premio:900},
               {id:'oogama', nombre:'Oogama', txt:'El sapo del pantano que se traga a los viajeros.', abre:2, mult:1.2, premio:1200}];
const BENDICIONES = [
  {id:'filo', kanji:'刃', nombre:'Filo afilado', txt:'Tu espada hace un 20% más de daño.', max:3},
  {id:'hierro', kanji:'鉄', nombre:'Piel de hierro', txt:'Recibís un 20% menos de daño.', max:2},
  {id:'halcon', kanji:'鷹', nombre:'Ojo de halcón', txt:'La ventana para desviar es más amplia.', max:1},
  {id:'sed', kanji:'血', nombre:'Sed de sangre', txt:'Curás un 4% del daño que hacés.', max:2},
  {id:'ki', kanji:'気', nombre:'Espíritu ardiente', txt:'La habilidad se carga un 50% más rápido.', max:2},
  {id:'postura', kanji:'根', nombre:'Raíz de roble', txt:'Tu equilibrio aguanta un 40% más.', max:1},
  {id:'piel', kanji:'龍', nombre:'Aliento de dragón', txt:'Tu vida máxima sube un 20%.', max:2},
  {id:'resu', kanji:'魂', nombre:'Pergamino de resurrección', txt:'Si caés, te levantás una vez con media vida.', max:1},
  {id:'te', kanji:'茶', nombre:'Té verde', txt:'Recuperás toda la vida ahora.', max:9},
  {id:'oro', kanji:'金', nombre:'Bolsa de ryo', txt:'Ganás un 50% más de oro en este capítulo.', max:1},
];
const JUEGO = {modo:'carga', pausa:false, cap:null, etapa:0, yokai:null, oroRun:0, etiqueta:'', sig:null};

function empezarCapitulo(n){
  const C = CAPITULOS[n - 1]; JUEGO.cap = C; JUEGO.yokai = null; JUEGO.etapa = 0; JUEGO.oroRun = 0;
  LUCHA.bend = {}; LUCHA.ki = 0; LUCHA.stats = {desvios:0, relampagos:0, golpes:0, recibido:0}; LUCHA.heroe = null; LUCHA.manchas = [];
  siguienteEtapa(true);
}
function empezarYokai(id){
  const Y = YOKAI.find(y => y.id === id); JUEGO.yokai = Y; JUEGO.cap = null; JUEGO.etapa = 0; JUEGO.oroRun = 0;
  LUCHA.bend = {}; LUCHA.ki = 0.5; LUCHA.stats = {desvios:0, relampagos:0, golpes:0, recibido:0}; LUCHA.heroe = null; LUCHA.manchas = [];
  arrancarPelea(id, {mult:Y.mult}, 'yokai', '~ ' + tr('Batalla de yokai') + ' ~');
}
function siguienteEtapa(primera){
  const C = JUEGO.cap, def = C.etapas[JUEGO.etapa], tipo = typeof def === 'string' ? def : def.t, elite = typeof def === 'object' && def.elite;
  const lugar = TIPOS[tipo].jefe ? C.lugares[C.lugares.length - 1] : C.lugares[JUEGO.etapa % C.lugares.length];
  arrancarPelea(tipo, {elite, mult:C.mult}, lugar, tr('Capítulo {0}', C.id) + ' · ' + tr('Etapa {0}/10', JUEGO.etapa + 1), primera);
}
async function arrancarPelea(tipo, extra, lugar, etiqueta, primera){
  JUEGO.modo = 'cargando'; UI.velo(true, tr('Afilando la hoja…'));
  try { await cargarPJ(TIPOS[tipo].pj, k => UI.progreso(k)); } catch(e){ anotarError(e); }
  for(const id in PJ) if(id !== 'heroe' && id !== TIPOS[tipo].pj) soltarPJ(id);
  LUGAR = lugar; JUEGO.etiqueta = etiqueta; CLIMA.length = 0;
  const conservar = LUCHA.heroe && !primera ? {vida:LUCHA.heroe.vida} : null;
  nuevaPelea(tipo, extra);
  const E = LUCHA.enemigo; if(extra && extra.mult){ E.mult = extra.mult; E.vida = E.vidaMax = Math.round(E.vidaMax*extra.mult); E.post = E.postMax = Math.round(E.postMax*(0.8 + extra.mult*0.2)); }
  const H = LUCHA.heroe, st = heroeStats(); H.vidaMax = st.vidaMax; H.postMax = st.postMax; H.post = st.postMax;
  H.vida = conservar ? Math.min(st.vidaMax, conservar.vida + st.vidaMax*0.3) : st.vidaMax;
  LUCHA.tutorial = !PROG.tutorial && JUEGO.cap && JUEGO.cap.id === 1 && JUEGO.etapa === 0 ? {paso:0} : null;
  SON.musica(TIPOS[tipo].yokai ? 'yokai' : TIPOS[tipo].jefe ? 'jefe' : 'batalla'); SON.ambiente(lugar);
  UI.velo(false); UI.cerrar(); JUEGO.modo = 'pelea'; JUEGO.pausa = false; UI.cartelEtapa(etiqueta, TIPOS[tipo]);
}
/* el tutorial de la primera pelea: frena el tiempo en el primer aviso de cada tipo y explica qué hacer */
function pasoTutorial(){
  const T = LUCHA.tutorial, E = LUCHA.enemigo, H = LUCHA.heroe; if(!T || !E) return;
  if(T.paso === 0 && LUCHA.stats.golpes >= 1) T.paso = 1;
  if(E.aviso === 'ligero' && E.avisoDado && !T.vioLigero){ T.vioLigero = true; camaraLenta(0.9, 0.85); UI.consejo(tr('¡Destello blanco! Tocá GUARDIA justo antes del golpe para desviarlo.')); }
  if(E.aviso === 'pesado' && E.avisoDado && !T.vioPesado){ T.vioPesado = true; camaraLenta(1.1, 0.85); UI.consejo(tr('¡殺 en rojo! Ese golpe no se bloquea: tocá ATACAR justo antes del impacto.')); }
  if(T.paso === 0 && !T.dijo0){ T.dijo0 = true; UI.consejo(tr('Acercate con ▶ y tocá ATACAR. Tres toques seguidos hacen un combo.')); }
}
/* terminó una pelea: se decide qué sigue */
function finDePelea(){
  const L = LUCHA, E = L.enemigo, H = L.heroe;
  if(L.fin === 'victoria'){
    const oro = Math.round(E.T.oro*(E.elite ? 2 : 1)*(E.mult || 1)*(L.bend.oro ? 1.5 : 1)*rv(0.9, 1.1)); JUEGO.oroRun += oro; PROG.oro += oro;
    if(LUCHA.tutorial && !PROG.tutorial){ PROG.tutorial = true; }
    if(JUEGO.yokai){ const Y = JUEGO.yokai; PROG.oro += Y.premio; JUEGO.oroRun += Y.premio; PROG.yokai[Y.id] = (PROG.yokai[Y.id] || 0) + 1; guardarProg(); SON.musica('victoria_capitulo'); UI.resultado('yokai', oro + Y.premio); return; }
    const C = JUEGO.cap; JUEGO.etapa++;
    PROG.mejor[C.id] = Math.max(PROG.mejor[C.id] || 0, JUEGO.etapa); guardarProg();
    if(JUEGO.etapa >= 10){ PROG.capitulo = Math.max(PROG.capitulo, Math.min(3, C.id + 1)); PROG.cap_hecho = Object.assign({}, PROG.cap_hecho, {[C.id]:true}); guardarProg();
      SON.musica('victoria_capitulo'); UI.resultado('capitulo', oro); return; }
    UI.bendicion(oro, cartas());
  } else {
    if(L.bend.resu && !L.resucito){ L.resucito = true; H.vivo = true; H.vida = H.vidaMax*0.5; ponerEstado(H, 'quieto'); L.fin = null; textoGrande(tr('¡RESURRECCIÓN!'), '#ffd24a', 1.4); SON.fx('ki_listo'); SON.musica(E.T.jefe ? 'jefe' : 'batalla'); return 'sigue'; }
    guardarProg(); SON.musica('derrota'); UI.derrota();
  }
}
function cartas(){ const B = LUCHA.bend, pos = BENDICIONES.filter(b => (B[b.id] || 0) < b.max); return barajar(pos).slice(0, 3); }
function tomarBendicion(id){ const B = LUCHA.bend; B[id] = (B[id] || 0) + 1; if(id === 'te' && LUCHA.heroe) LUCHA.heroe.vida = heroeStats().vidaMax; SON.fx('elegir'); siguienteEtapa(false); }
/* herrería y dojo */
const precioMejora = id => { const E = ESPADAS[id], nv = PROG.espadas[id] || 0; return Math.round(120*(E.rango + 1)*nv*(1 + nv*0.25)); };
const precioDojo = k => Math.round(110*Math.pow(1.45, PROG.dojo[k] || 0));
function comprarEspada(id){ const E = ESPADAS[id]; if(PROG.espadas[id]) { PROG.espada = id; guardarProg(); SON.fx('menu_ok'); return true; }
  if(PROG.oro < E.precio){ SON.fx('menu_atras'); return false; } PROG.oro -= E.precio; PROG.espadas[id] = 1; PROG.espada = id; guardarProg(); SON.fx('compra'); return true; }
function mejorarEspada(id){ const nv = PROG.espadas[id] || 0, p = precioMejora(id); if(!nv || nv >= 10 || PROG.oro < p){ SON.fx('menu_atras'); return false; }
  PROG.oro -= p; PROG.espadas[id] = nv + 1; guardarProg(); SON.fx('mejora'); return true; }
function entrenar(k){ const nv = PROG.dojo[k] || 0, p = precioDojo(k); if(nv >= 10 || PROG.oro < p){ SON.fx('menu_atras'); return false; } PROG.oro -= p; PROG.dojo[k] = nv + 1; guardarProg(); SON.fx('mejora'); return true; }
function pausar(){ if(JUEGO.modo !== 'pelea') return; JUEGO.pausa = !JUEGO.pausa; if(JUEGO.pausa) UI.pausa(); else UI.cerrar(); SON.fx('menu_mover'); }
