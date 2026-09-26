/* ================================================================ la pelea
   Como en el original: vida (rojo) y equilibrio (amarillo). Un golpe normal se avisa con un destello blanco y se
   DESVÍA apretando GUARDIA justo antes (si la tenés apretada de antes, lo bloqueás y perdés equilibrio). Un golpe
   imparable se avisa con 殺 en rojo: no se bloquea, se esquiva o se contesta con ATACAR justo antes del impacto:
   el CONTRAGOLPE RELÁMPAGO, que te lleva atravesando al enemigo. Sin equilibrio, cualquiera queda aturdido.
   Mundo en unidades de un escenario de 412 de alto; el piso está en y = 350. */
const PISO = 350, ARENA = {x0:40, x1:1180};
/* cada tipo: su personaje, alto en el mundo, vida, equilibrio, sus golpes y cómo pelea */
const TIPOS = {
  heroe:{pj:'heroe', alto:196, vida:300, post:100, vel:150},
  bandido:{pj:'e_bandido', nombre:'Bandido de la montaña', alto:192, vida:130, post:80, vel:95, dano:34, pesado:70, alc:112, alcP:125, p:{ataque:0.55, pesado:0.25, guardia:0.25, atras:0.1}, espera:[0.7, 1.5], oro:14},
  lancero:{pj:'e_lancero', nombre:'Lancero ashigaru', alto:192, vida:150, post:90, vel:85, dano:30, pesado:66, alc:170, alcP:185, p:{ataque:0.6, pesado:0.2, guardia:0.3, atras:0.2}, espera:[0.8, 1.6], oro:16},
  shinobi:{pj:'e_shinobi', nombre:'Shinobi', alto:176, vida:120, post:70, vel:170, dano:28, pesado:62, alc:105, alcP:118, rapido:1.35, p:{ataque:0.65, pesado:0.2, guardia:0.15, atras:0.35}, espera:[0.35, 0.9], oro:20},
  monje:{pj:'e_monje', nombre:'Monje guerrero', alto:204, vida:200, post:120, vel:80, dano:38, pesado:82, alc:165, alcP:180, p:{ataque:0.45, pesado:0.3, guardia:0.45, atras:0.1}, espera:[0.8, 1.7], oro:24},
  general:{pj:'j_general', nombre:'General Akagane', jefe:true, alto:250, vida:1100, post:260, vel:80, dano:46, pesado:96, alc:160, alcP:185, p:{ataque:0.45, pesado:0.3, especial:0.2, guardia:0.35, atras:0.05}, espera:[0.6, 1.3], oro:260, armadura:0.35},
  maestro:{pj:'j_maestro', nombre:'Kageyama, el maestro de la espada', jefe:true, alto:204, vida:1250, post:240, vel:120, dano:44, pesado:90, alc:150, alcP:170, rapido:1.2, p:{ataque:0.55, pesado:0.25, especial:0.2, guardia:0.5, atras:0.15}, espera:[0.35, 0.9], oro:420},
  oni:{pj:'j_oni', nombre:'Shuten, el oni', jefe:true, alto:286, vida:1700, post:320, vel:70, dano:58, pesado:120, alc:175, alcP:205, p:{ataque:0.4, pesado:0.35, especial:0.25, guardia:0.15, atras:0.05}, espera:[0.7, 1.4], oro:650, armadura:0.5},
  gashadokuro:{pj:'y_gashadokuro', nombre:'Gashadokuro', yokai:true, jefe:true, alto:250, vida:2600, post:400, vel:40, dano:62, pesado:130, alc:230, alcP:260, p:{ataque:0.5, pesado:0.45, guardia:0, atras:0}, espera:[0.8, 1.6], oro:900, armadura:0.6, fijo:true},
  oogama:{pj:'y_oogama', nombre:'Oogama', yokai:true, jefe:true, alto:230, vida:2200, post:360, vel:55, dano:56, pesado:118, alc:220, alcP:250, p:{ataque:0.55, pesado:0.4, guardia:0, atras:0}, espera:[0.7, 1.4], oro:800, armadura:0.55, fijo:true},
};
/* los golpes del héroe: el combo va rápido, rápido, fuerte; cada uno con su alcance, daño y equilibrio que saca */
const GOLPES = {tajo2:{alc:118, dano:1, post:14, fps:24, sig:'tajo3'}, tajo3:{alc:140, dano:1.1, post:16, fps:24, sig:'tajo'}, tajo:{alc:122, dano:1.55, post:26, fps:22, sig:null}};
const ESPADAS = {
  sarashi:{nombre:'Katana sin nombre', rango:0, dano:30, hab:'aniquilacion', precio:0},
  kaze:{nombre:'Filo del viento', rango:1, dano:36, hab:'concentracion', precio:600},
  shura:{nombre:'Espada de Shura', rango:2, dano:44, hab:'aniquilacion', precio:1600},
  tsukuyomi:{nombre:'Luna creciente', rango:3, dano:52, hab:'distorsion', precio:3400},
  muramasa:{nombre:'Muramasa maldita', rango:4, dano:64, hab:'aniquilacion', precio:7000},
};
const RANGOS = [['Común', '#8a8278'], ['Rara', '#3f7fc0'], ['Épica', '#8a4cc0'], ['Legendaria', '#d0a030'], ['Mítica', '#c8261e']];
const HABILIDADES = {aniquilacion:{nombre:'Aniquilación', kanji:'滅', txt:'Un torbellino de cuatro tajos imparables.'},
  concentracion:{nombre:'Concentración', kanji:'集', txt:'Tus próximos cinco ataques son contragolpes relámpago.'},
  distorsion:{nombre:'Distorsión del tiempo', kanji:'時', txt:'El enemigo se mueve a un tercio de su velocidad durante 6 segundos.'}};

/* ---------------------------------------------------------------- un luchador */
function luchador(tipoId, x, dir, extra){
  const T = TIPOS[tipoId], e = Object.assign({tipo:tipoId, T, pj:T.pj, x, dir, vida:T.vida, vidaMax:T.vida, post:T.post, postMax:T.post,
    estado:'quieto', t:0, anim:'quieto', animT:0, animVel:1, golpeo:false, ivul:0, aturdido:0, flash:0, vx:0, sinPostT:0, vivo:true, lento:1,
    espera:rv(0.5, 1.2), aviso:null, avisoT:0, hitDone:false, empuje:0, tint:null, escala:1}, extra || {});
  if(e.elite){ e.vida = e.vidaMax = Math.round(T.vida*2.1); e.post = e.postMax = Math.round(T.post*1.5); e.escala = 1.12; e.tint = '#a01010'; }
  return e;
}
function anima(e, nombre, vel, reinicio){ if(e.anim !== nombre || reinicio !== false){ e.anim = nombre; e.animT = 0; } e.animVel = vel || 1; }
function animDe(e){ const P = PJ[e.pj]; return P && P.anims[e.anim]; }
function duracion(e, nombre, fps){ const P = PJ[e.pj], A = P && P.anims[nombre]; if(!A) return 0.6; return A.cuadros.length/(fps || A.fps || 12); }
/* el cuadro que toca: loops dan la vuelta; el resto se queda en el último */
function cuadroDe(e){
  const A = animDe(e); if(!A || !A.cuadros.length) return null; const n = A.cuadros.length, f = Math.floor(e.animT*(e.fpsAnim || A.fps || 12)*(A.loop ? e.animVel || 1 : 1));
  return A.cuadros[A.loop ? ((f % n) + n) % n : lim(f, 0, n - 1)];
}
/* el instante del golpe dentro de la animación (en segundos, con su fps) */
function tGolpe(e, nombre, fps){ const P = PJ[e.pj], A = P && P.anims[nombre]; if(!A) return 0.3; const k = A.golpe !== null && A.golpe !== undefined ? A.golpe : Math.floor(A.cuadros.length*0.45); return (k + 0.5)/(fps || A.fps || 12); }

/* ---------------------------------------------------------------- la pelea en curso */
const LUCHA = {heroe:null, enemigo:null, fx:[], manchas:[], numeros:[], cam:0, camObj:0, sacudida:0, congelado:0, lento:0, lentoT:0,
  ki:0, conc:0, distorsion:0, fin:null, finT:0, texto:null, textoT:0, bend:{}, combo:0, comboT:0, stats:null, tutorial:null, dmgMult:1};
function nuevaPelea(tipoEnemigo, extra){
  const L = LUCHA, H = L.heroe || luchador('heroe', 380, 1);
  Object.assign(H, {x:ARENA.x0 + 300, dir:1, estado:'quieto', t:0, vivo:true, aturdido:0, flash:0, ivul:0, golpeo:false}); anima(H, 'quieto');
  H.post = H.postMax; L.heroe = H;
  const E = luchador(tipoEnemigo, H.x + 330, -1, extra); anima(E, 'quieto'); E.estado = 'entra'; E.t = 0; L.enemigo = E;
  L.fx = []; L.numeros = []; L.fin = null; L.finT = 0; L.congelado = 0; L.lento = 0; L.conc = 0; L.distorsion = 0; L.combo = 0;
  L.cam = L.camObj = (H.x + E.x)/2 - 446; L.stats = L.stats || {desvios:0, relampagos:0, golpes:0, recibido:0};
  SON.fx(TIPOS[tipoEnemigo].jefe ? 'jefe_aparece' : 'etapa'); SON.intensidad(0.3);
}
function heroeStats(){
  const B = LUCHA.bend, n = k => B[k] || 0, D = PROG.dojo, esp = ESPADAS[PROG.espada] || ESPADAS.sarashi, nv = PROG.espadas[PROG.espada] || 1;
  const vidaMax = Math.round((300 + D.vida*30)*(1 + 0.2*n('piel'))), postMax = Math.round((100 + D.postura*12)*(1 + 0.4*n('postura')));
  return {vidaMax, postMax, dano:esp.dano*(1 + (nv - 1)*0.12)*(1 + D.filo*0.07)*(1 + 0.2*n('filo')), hab:esp.hab, kiK:(1 + D.ki*0.08)*(1 + 0.5*n('ki')),
    ventana:n('halcon') ? 0.3 : 0.2, recibe:Math.pow(0.8, n('hierro')), cura:0.04*n('sed')};
}
/* ---------------------------------------------------------------- efectos: se anotan acá y los dibuja 4_render */
function fx(tipo, x, y, o){ LUCHA.fx.push(Object.assign({tipo, x, y, t:0}, o || {})); }
function numero(x, y, n, color){ LUCHA.numeros.push({x, y, n:Math.round(n), color:color || '#fff', t:0}); }
function sacudir(k){ if(AJ.sacudida) LUCHA.sacudida = Math.max(LUCHA.sacudida, k); }
function sangre(x, y, dir, cuanto){
  if(!AJ.sangre) return;
  for(let i = 0; i < cuanto; i++) LUCHA.fx.push({tipo:'gota', x, y, t:0, vx:dir*rv(60, 380), vy:rv(-320, -40), r:rv(1.5, 4.5), vida:rv(0.5, 1.1)});
  LUCHA.manchas.push({x:x + dir*rv(10, 70), w:rv(20, 60), h:rv(3, 7), a:0.75, rot:rv(-0.2, 0.2)}); if(LUCHA.manchas.length > 40) LUCHA.manchas.shift();
}
function textoGrande(txt, color, dur){ LUCHA.texto = {txt, color:color || '#fff'}; LUCHA.textoT = dur || 1.1; }
function pausaGolpe(s){ LUCHA.congelado = Math.max(LUCHA.congelado, s); }
function camaraLenta(s, k){ LUCHA.lentoT = Math.max(LUCHA.lentoT, s); LUCHA.lento = Math.max(LUCHA.lento, k || 0.75); }

/* ---------------------------------------------------------------- daño */
function danar(v, a, dano, post, o){
  o = o || {}; if(!v.vivo) return;
  const esH = v === LUCHA.heroe, st = esH ? heroeStats() : null;
  if(esH) dano *= st.recibe; else { dano *= LUCHA.dmgMult; if(v.aturdido > 0) dano *= 1.8; if(v.T.armadura && !o.imparable && v.estado === 'pesado') dano *= 1 - v.T.armadura*0.5; }
  v.vida = Math.max(0, v.vida - dano); v.post = Math.max(0, v.post - post); v.sinPostT = 0; v.flash = 0.12;
  const px = v.x - v.dir*20, py = PISO - v.T.alto*0.55*v.escala;
  numero(px, py - 30, dano, esH ? '#ff5a4a' : (v.aturdido > 0 || o.fuerte ? '#ffd24a' : '#fff'));
  sangre(px, py, -v.dir, esH ? 8 : o.fuerte ? 18 : 10); SON.fx('carne', {pan:panDe(px), vol:0.9}); if(AJ.sangre) SON.fx('sangre', {pan:panDe(px), vol:0.6});
  fx('corte', px, py, {dir:a ? a.dir : -v.dir, fuerte:!!o.fuerte, ang:o.ang !== undefined ? o.ang : rv(-0.6, 0.6)});
  if(esH){ LUCHA.stats.recibido += dano; $('rojo').style.opacity = 0.8; vibrar(40); sacudir(9); }
  else { const cura = st0().cura; if(cura) { const H = LUCHA.heroe; H.vida = Math.min(H.vidaMax, H.vida + dano*cura); } LUCHA.ki = Math.min(1, LUCHA.ki + 0.05*st0().kiK); sacudir(o.fuerte ? 10 : 5); }
  if(v.vida <= 0){ morir(v, a); return; }
  if(v.post <= 0 && v.aturdido <= 0){ aturdir(v, esH ? 1.1 : 2.2); return; }
  if(!o.sinReaccion && !(v.T.armadura && (v.estado === 'pesado' || v.estado === 'especial') && !o.imparable) && !(v.T.fijo && !o.fuerte)){
    ponerEstado(v, 'golpeado'); v.empuje = -v.dir*(esH ? 160 : 120); }
}
const st0 = () => heroeStats();
function aturdir(v, s){ v.aturdido = s; v.post = 0; ponerEstado(v, 'aturdido'); SON.fx(v === LUCHA.heroe ? 'guardia_rota' : 'aturdido', {pan:panDe(v.x)});
  fx('aturdido', v.x, PISO - v.T.alto*v.escala - 10, {vida:s}); if(v !== LUCHA.heroe){ textoGrande(tr('¡SIN EQUILIBRIO!'), '#ffd24a', 1.0); SON.intensidad(0.8); } }
function morir(v, a){
  v.vivo = false; ponerEstado(v, 'muerte'); v.aturdido = 0; sangre(v.x, PISO - v.T.alto*0.5, a ? a.dir : 1, 30);
  if(v === LUCHA.heroe){ SON.fx('muerte_heroe'); SON.musica(null); camaraLenta(2.2, 0.8); LUCHA.fin = 'derrota'; LUCHA.finT = 0; PROG.muertes++; guardarProg(); }
  else { SON.fx('muerte', {pan:panDe(v.x)}); camaraLenta(v.T.jefe ? 2.4 : 1.1, v.T.jefe ? 0.85 : 0.6); pausaGolpe(0.12); LUCHA.fin = 'victoria'; LUCHA.finT = 0; PROG.bajas++;
    if(v.T.jefe) textoGrande(tr('DERROTADO'), '#ff3a2a', 2.2); }
}
function panDe(x){ return lim(((x - LUCHA.cam)/892)*2 - 1, -1, 1); }

/* ---------------------------------------------------------------- estados */
function ponerEstado(e, s){
  e.estado = s; e.t = 0; e.golpeo = false; e.hitDone = false; e.fpsAnim = 0;
  const T = e.T;
  if(s === 'quieto'){ anima(e, 'quieto'); }
  else if(s === 'golpeado'){ anima(e, 'golpeado'); e.fpsAnim = 20; }
  else if(s === 'aturdido'){ anima(e, 'golpeado'); e.fpsAnim = 10; }
  else if(s === 'muerte'){ anima(e, 'muerte'); e.fpsAnim = 12; }
}
/* ================================================================ el héroe */
function pasoHeroe(H, E, dt){
  const st = heroeStats(); H.vidaMax = st.vidaMax; H.postMax = st.postMax; H.vida = Math.min(H.vida, H.vidaMax);
  H.t += dt; H.animT += dt; H.ivul = Math.max(0, H.ivul - dt); H.flash = Math.max(0, H.flash - dt);
  if(!H.vivo) return;
  /* el equilibrio vuelve solo si no te pegan */
  H.sinPostT += dt; if(H.sinPostT > 1.4 && H.estado !== 'guardia') H.post = Math.min(H.postMax, H.post + H.postMax*0.22*dt);
  if(H.empuje){ H.x += H.empuje*dt; H.empuje *= Math.pow(0.02, dt); if(Math.abs(H.empuje) < 4) H.empuje = 0; }
  const pedido = (k, ventana) => RELOJ.t - ENT[k] < (ventana || 0.28);
  const libre = ['quieto', 'caminar', 'guardia'].includes(H.estado);
  const encadenable = GOLPES[H.estado] && H.golpeo && H.t > tGolpe(H, H.estado, GOLPES[H.estado].fps) + 0.02;
  if(LUCHA.fin) { if(H.estado === 'caminar') ponerEstado(H, 'quieto'); }
  else if(H.estado === 'aturdido'){ H.aturdido -= dt; if(H.aturdido <= 0){ H.post = H.postMax*0.5; ponerEstado(H, 'quieto'); } }
  else if(pedido('habilidad', 0.2) && LUCHA.ki >= 1 && (libre || encadenable)){ ENT.habilidad = -9; usarHabilidad(H, E, st); }
  else if(pedido('esquive', 0.2) && (libre || encadenable || H.estado === 'golpeado' && H.t > 0.18)){ ENT.esquive = -9; ponerEstado(H, 'esquive'); anima(H, 'esquive'); H.fpsAnim = 26; H.ivul = 0.42; SON.fx('esquive'); }
  else if(pedido('ataque') && (libre || encadenable)){
    ENT.ataque = -9;
    /* ¿está por llegar un golpe imparable? atacar justo antes es el contragolpe relámpago */
    if(E.vivo && E.aviso === 'pesado' && E.tImpacto - E.t < 0.5 && E.tImpacto - E.t > 0.02 && Math.abs(E.x - H.x) < E.T.alcP + 60) relampago(H, E, false);
    else if(LUCHA.conc > 0 && E.vivo && Math.abs(E.x - H.x) < 260){ LUCHA.conc--; relampago(H, E, true); }
    else { const sig = encadenable ? GOLPES[H.estado].sig || 'tajo2' : 'tajo2'; ponerEstado(H, sig); anima(H, sig); H.fpsAnim = GOLPES[sig].fps; SON.fx(sig === 'tajo3' ? 'estocada' : sig, {pan:panDe(H.x)}); }
  }
  else if(libre){
    if(ENT.guardia){ if(H.estado !== 'guardia'){ ponerEstado(H, 'guardia'); anima(H, 'guardia'); H.fpsAnim = 26; } }
    else if(ENT.izq !== ENT.der){ const d = ENT.der ? 1 : -1; H.x += d*TIPOS.heroe.vel*dt; if(H.estado !== 'caminar'){ ponerEstado(H, 'caminar'); anima(H, 'caminar'); H.fpsAnim = 14; }
      H.animVel = d === H.dir ? 1 : -1; H.pasoT = (H.pasoT || 0) + dt; if(H.pasoT > 0.36){ H.pasoT = 0; SON.fx('paso', {vol:0.5, pan:panDe(H.x)}); } }
    else if(H.estado !== 'quieto') ponerEstado(H, 'quieto');
  }
  /* los golpes del combo: pegan en su cuadro */
  const G = GOLPES[H.estado];
  if(G){ if(!H.golpeo && H.t >= tGolpe(H, H.estado, G.fps)){ H.golpeo = true;
      if(E.vivo && Math.abs(E.x - H.x) < G.alc*1.0 && Math.sign(E.x - H.x) === H.dir){
        if(E.estado === 'guardiaE' || (E.estado === 'quieto' || E.estado === 'caminar') && !E.T.fijo && Math.random() < E.T.p.guardia*(E.aturdido > 0 ? 0 : 1)){
          bloqueaEnemigo(E, H, G); }
        else { danar(E, H, st.dano*G.dano*rv(0.92, 1.08), G.post, {fuerte:H.estado === 'tajo', ang:H.estado === 'tajo2' ? -0.7 : H.estado === 'tajo3' ? 0 : 0.8}); LUCHA.stats.golpes++; pausaGolpe(H.estado === 'tajo' ? 0.08 : 0.05); }
      } }
    if(H.t >= duracion(H, H.estado, G.fps)) ponerEstado(H, 'quieto'); }
  else if(H.estado === 'esquive'){ const k = H.t/0.3; if(k < 1) H.x -= H.dir*300*dt*(1 - k); if(H.t >= duracion(H, 'esquive', 26)) ponerEstado(H, 'quieto'); }
  else if(H.estado === 'desvio'){ if(H.t >= duracion(H, 'desvio', 26)*0.8) ponerEstado(H, 'quieto'); }
  else if(H.estado === 'golpeado'){ if(H.t >= 0.42) ponerEstado(H, 'quieto'); }
  else if(H.estado === 'guardia'){ /* se queda en la pose de guardia: el cuadro del 40% */
    const A = animDe(H); if(A){ const k = Math.floor(A.cuadros.length*0.4); if(H.animT*26 > k) H.animT = k/26; }
    if(!ENT.guardia) ponerEstado(H, 'quieto'); }
  else if(H.estado === 'relampago') pasoRelampago(H, E, dt);
  else if(H.estado === 'habilidad') pasoHabilidad(H, E, dt, st);
  H.x = lim(H.x, ARENA.x0, ARENA.x1);
  /* mirar siempre al enemigo (salvo en el contragolpe, que termina de espaldas y se da vuelta después) */
  if(H.estado !== 'relampago' && E.vivo && ['quieto', 'caminar', 'guardia'].includes(H.estado)) H.dir = E.x >= H.x ? 1 : -1;
}
function bloqueaEnemigo(E, H, G){
  E.post = Math.max(0, E.post - G.post*0.8); E.sinPostT = 0; ponerEstado(E, 'guardiaE'); E.guardiaT = 0.35;
  const x = (E.x + H.x)/2, y = PISO - E.T.alto*0.6*E.escala; fx('chispas', x, y, {n:10}); SON.fx('choque', {pan:panDe(x)}); pausaGolpe(0.04); sacudir(3);
  if(E.post <= 0) aturdir(E, 2.0);
}
/* ---------------------------------------------------------------- contragolpe relámpago */
function relampago(H, E, porConc){
  ponerEstado(H, 'relampago'); anima(H, 'relampago'); H.fpsAnim = 26; H.ivul = 0.9; H.rel = {x0:H.x, x1:E.x + H.dir*120, pego:false, porConc};
  E.aviso = null; if(!porConc){ LUCHA.stats.relampagos++; LUCHA.ki = Math.min(1, LUCHA.ki + 0.25*heroeStats().kiK); }
  camaraLenta(0.7, 0.8); SON.fx('relampago'); SON.lento(1); textoGrande(tr('¡CONTRAGOLPE RELÁMPAGO!'), '#f4f0e0', 1.1);
  if(!porConc) ponerEstado(E, 'sorprendido');
}
function pasoRelampago(H, E, dt){
  const R = H.rel, dur = duracion(H, 'relampago', 26), k0 = 0.22*dur, k1 = 0.55*dur;
  if(H.t > k0 && H.t < k1){ const k = (H.t - k0)/(k1 - k0); H.x = lerp(R.x0, R.x1, suave(k)); fx('estela', H.x, PISO - 90, {dir:H.dir, vida:0.35});
    if(!R.pego && Math.abs(H.x - E.x) < 30 && E.vivo){ R.pego = true; const st = heroeStats(), d = st.dano*(R.porConc ? 2.2 : 4.2) + (R.porConc ? 0 : E.vidaMax*(E.T.jefe ? 0.05 : 0.22));
      LUCHA.pendiente = {t:0.28, f:() => { if(E.vivo){ danar(E, H, d, R.porConc ? 40 : 70, {fuerte:true, imparable:true, ang:0}); fx('tajoLargo', E.x, PISO - E.T.alto*0.55, {dir:H.dir}); sacudir(14); pausaGolpe(0.1); } }}; } }
  if(H.t >= dur){ H.x = R.x1; ponerEstado(H, 'quieto'); H.dir = E.x >= H.x ? 1 : -1; SON.lento(0); if(E.vivo){ E.dir = H.x >= E.x ? 1 : -1; } }
}
/* ---------------------------------------------------------------- habilidades de la espada */
function usarHabilidad(H, E, st){
  LUCHA.ki = 0; const h = st.hab; SON.fx(h === 'aniquilacion' ? 'habilidad' : h === 'concentracion' ? 'concentracion' : 'distorsion');
  textoGrande(tr(HABILIDADES[h].nombre).toUpperCase(), '#ff3a2a', 1.3); fx('kanji', H.x, PISO - 260, {k:HABILIDADES[h].kanji, vida:1.2});
  if(h === 'aniquilacion'){ ponerEstado(H, 'habilidad'); anima(H, 'habilidad'); H.fpsAnim = 16; H.ivul = 1.5; H.golpesHab = 0; camaraLenta(0.4, 0.4); }
  else if(h === 'concentracion'){ LUCHA.conc = 5; }
  else if(h === 'distorsion'){ LUCHA.distorsion = 6; }
}
function pasoHabilidad(H, E, dt, st){
  const dur = duracion(H, 'habilidad', 16), marcas = [0.3, 0.45, 0.6, 0.75];
  while(H.golpesHab < 4 && H.t >= marcas[H.golpesHab]*dur){ H.golpesHab++;
    if(E.vivo && Math.abs(E.x - H.x) < 190) danar(E, H, st.dano*1.6, 22, {fuerte:true, imparable:true, sinReaccion:H.golpesHab < 4, ang:rv(-1, 1)});
    fx('tajoLargo', H.x + H.dir*80, PISO - 110 + rv(-30, 30), {dir:H.dir, rojo:true}); SON.fx('tajo2', {tono:1 + H.golpesHab*0.06}); }
  if(H.t >= dur) ponerEstado(H, 'quieto');
}

/* ================================================================ el enemigo */
function pasoEnemigo(E, H, dt){
  const T = E.T; let k = (T.rapido || 1)*(LUCHA.distorsion > 0 ? 0.33 : 1); if(E.aturdido > 0) k = 1;
  const d = dt*k; E.t += d; E.animT += d; E.flash = Math.max(0, E.flash - dt);
  if(E.empuje){ E.x += E.empuje*dt; E.empuje *= Math.pow(0.02, dt); if(Math.abs(E.empuje) < 4) E.empuje = 0; }
  if(!E.vivo){ return; }
  E.sinPostT += d; if(E.sinPostT > 1.6 && E.aturdido <= 0) E.post = Math.min(E.postMax, E.post + E.postMax*0.12*d);
  const dist = Math.abs(H.x - E.x), haciaH = H.x >= E.x ? 1 : -1;
  const puedeGirar = ['quieto', 'caminar', 'entra'].includes(E.estado); if(puedeGirar) E.dir = haciaH;
  switch(E.estado){
    case 'entra': anima(E, T.fijo ? 'quieto' : 'caminar', 1, false); E.fpsAnim = 12; if(E.t > 0.9 || T.fijo){ ponerEstado(E, 'quieto'); E.espera = rv(0.6, 1.0); } break;
    case 'quieto': case 'caminar': {
      if(!H.vivo || LUCHA.fin){ if(E.estado !== 'quieto') ponerEstado(E, 'quieto'); break; }
      E.espera -= d; const quiere = T.alc - 14;
      if(!T.fijo && dist > quiere + 20){ E.x += haciaH*T.vel*d; if(E.estado !== 'caminar'){ ponerEstado(E, 'caminar'); anima(E, 'caminar'); E.fpsAnim = 12; } }
      else if(!T.fijo && dist < 70){ E.x -= haciaH*T.vel*0.8*d; if(E.estado !== 'caminar'){ ponerEstado(E, 'caminar'); anima(E, 'caminar'); E.fpsAnim = 12; } E.animVel = -1; }
      else if(E.estado !== 'quieto') ponerEstado(E, 'quieto');
      /* reacciona al tajo del héroe: a veces se cubre antes de que llegue */
      if(GOLPES[H.estado] && !H.golpeo && dist < 170 && !T.fijo && Math.random() < T.p.guardia*d*4){ ponerEstado(E, 'guardiaE'); E.guardiaT = 0.55; break; }
      if(E.espera <= 0 && dist < T.alcP + 30){ elegirAtaque(E, H); }
      else if(E.espera <= 0 && T.fijo && dist >= T.alcP + 30){ E.espera = 0.3; }
      break; }
    case 'guardiaE': anima(E, 'quieto', 1, false); E.guardiaT -= d; if(E.guardiaT <= 0){ ponerEstado(E, 'quieto'); E.espera = rv(0.1, 0.4); } break;
    case 'ataque': case 'pesado': case 'especial': ataqueEnemigo(E, H, d); break;
    case 'sorprendido': if(E.t > 0.6){ ponerEstado(E, 'quieto'); E.espera = 0.4; } break;
    case 'golpeado': if(E.t > 0.45){ ponerEstado(E, 'quieto'); E.espera = rv(0.2, 0.6); if(Math.random() < T.p.atras && !T.fijo) E.empuje = -haciaH*260; } break;
    case 'aturdido': E.aturdido -= dt; const A = animDe(E); if(A && E.animT*10 > A.cuadros.length - 1) E.animT = (A.cuadros.length - 1)/10;
      if(E.aturdido <= 0){ E.post = E.postMax*0.6; ponerEstado(E, 'quieto'); E.espera = 0.3; } break;
  }
  E.x = lim(E.x, ARENA.x0 + 20, ARENA.x1 + 60);
  /* no se atraviesan (salvo el relámpago) */
  if(H.estado !== 'relampago' && H.vivo){ const min = 64 + (T.fijo ? 50 : 0); if(Math.abs(H.x - E.x) < min){ const s = H.x >= E.x ? 1 : -1, m = (min - Math.abs(H.x - E.x))/2; H.x += s*m; if(!T.fijo) E.x -= s*m; else H.x += s*m; } }
}
function elegirAtaque(E, H){
  const T = E.T, p = T.p, furia = E.vida < E.vidaMax*0.35; let r = Math.random()*(p.ataque + p.pesado + (p.especial || 0)), cual = 'ataque';
  if(r > p.ataque) cual = r > p.ataque + p.pesado && PJ[E.pj].anims.especial ? 'especial' : 'pesado';
  ponerEstado(E, cual); anima(E, cual); const A = animDe(E);
  E.fpsAnim = cual === 'ataque' ? 16 : 13; if(furia) E.fpsAnim *= 1.15;
  E.tImpacto = tGolpe(E, cual, E.fpsAnim); E.aviso = cual === 'ataque' ? 'ligero' : 'pesado'; E.avisoDado = false;
  E.espera = rv(T.espera[0], T.espera[1])*(furia ? 0.7 : 1);
}
function ataqueEnemigo(E, H, d){
  const T = E.T, dur = duracion(E, E.estado, E.fpsAnim), ti = E.tImpacto;
  /* el aviso: destello blanco 0,35 s antes del golpe normal; el kanji rojo desde que arranca el imparable */
  if(!E.avisoDado && (E.aviso === 'pesado' || E.t >= ti - 0.38)){ E.avisoDado = true;
    if(E.aviso === 'pesado'){ SON.fx('aviso_pesado', {pan:panDe(E.x)}); fx('kanjiAviso', E.x, PISO - T.alto*E.escala - 30, {vida:ti - E.t + 0.15, e:E}); }
    else { SON.fx('aviso_ligero', {pan:panDe(E.x)}); fx('destello', E.x + E.dir*T.alc*0.55, PISO - T.alto*0.62*E.escala, {vida:0.4}); } }
  if(!E.golpeo && E.t >= ti){ E.golpeo = true; const aviso = E.aviso; E.aviso = null;
    const dist = Math.abs(H.x - E.x), alc = aviso === 'pesado' ? T.alcP : T.alc, danoB = (aviso === 'pesado' ? T.pesado : T.dano)*(E.mult || 1)*(E.elite ? 1.25 : 1);
    SON.fx(E.pj === 'j_oni' ? 'garrote' : E.pj === 'e_lancero' ? 'lanza' : aviso === 'pesado' ? 'tajo_pesado' : 'tajo', {pan:panDe(E.x)});
    if(E.pj === 'y_oogama') SON.fx('lengua'); if(E.pj === 'y_gashadokuro') SON.fx('huesos');
    if(H.vivo && dist < alc + 10 && Math.sign(H.x - E.x) === E.dir && H.ivul <= 0){
      const st = heroeStats(), apretoHace = RELOJ.t - ENT.guardiaDesde;
      if(aviso === 'ligero' && H.estado === 'guardia' && apretoHace < st.ventana*1.5 + 0.05){ desvio(H, E); }
      else if(aviso === 'ligero' && H.estado === 'guardia'){
        H.post = Math.max(0, H.post - danoB*0.8); H.sinPostT = 0; const x = (H.x + E.x)/2; fx('chispas', x, PISO - 120, {n:8}); SON.fx('choque', {pan:panDe(x)}); sacudir(4); H.empuje = -H.dir*90;
        if(H.post <= 0){ aturdir(H, 1.1); danar(H, E, danoB*0.5, 0, {sinReaccion:true}); } }
      else { if(aviso === 'pesado' && H.estado === 'guardia'){ aturdir(H, 1.0); }
        danar(H, E, danoB*rv(0.9, 1.1), aviso === 'pesado' ? 45 : 25, {fuerte:aviso === 'pesado'}); if(aviso === 'pesado'){ pausaGolpe(0.1); sacudir(14); } }
    } }
  if(E.t >= dur){ ponerEstado(E, 'quieto'); }
}
function desvio(H, E){
  ponerEstado(H, 'desvio'); anima(H, 'desvio'); H.fpsAnim = 26; H.ivul = 0.25; LUCHA.stats.desvios++;
  E.post = Math.max(0, E.post - 32 - E.postMax*0.08); E.sinPostT = 0; LUCHA.ki = Math.min(1, LUCHA.ki + 0.15*heroeStats().kiK);
  const x = (H.x + E.x)/2, y = PISO - 128; fx('chispas', x, y, {n:22, oro:true}); fx('anillo', x, y, {vida:0.45}); SON.fx('desvio', {pan:panDe(x)}); pausaGolpe(0.09); sacudir(6); vibrar(20);
  textoGrande(tr('¡DESVÍO!'), '#f0e6c8', 0.7);
  if(E.post <= 0) aturdir(E, 2.4); else { ponerEstado(E, 'golpeado'); E.empuje = -E.dir*110; }
}

/* ================================================================ el paso de la pelea */
function pasoLucha(dtReal){
  const L = LUCHA, H = L.heroe, E = L.enemigo; if(!H || !E) return;
  $('rojo').style.opacity = Math.max(0, (+$('rojo').style.opacity || 0) - dtReal*1.6);
  if(L.congelado > 0){ L.congelado -= dtReal; return; }
  if(L.lentoT > 0){ L.lentoT -= dtReal; if(L.lentoT <= 0){ L.lento = 0; SON.lento(0); } }
  const esc = 1 - L.lento*0.8, dt = dtReal*esc; RELOJ.escala = esc;
  if(L.pendiente){ L.pendiente.t -= dt; if(L.pendiente.t <= 0){ const f = L.pendiente.f; L.pendiente = null; f(); } }
  if(L.distorsion > 0) L.distorsion -= dtReal;
  pasoHeroe(H, E, dt); pasoEnemigo(E, H, dt);
  /* los cuerpos no se atraviesan: el que empuja es el enemigo, el héroe apenas cede */
  { const sep = E.T.yokai ? 150 : E.T.jefe ? 84 : 74, d = E.x - H.x;
    if(E.vivo && H.vivo && H.estado !== 'esquive' && H.estado !== 'relampago' && Math.abs(d) < sep){ const falta = sep - Math.abs(d), s = d >= 0 ? 1 : -1; E.x += s*falta*0.8; H.x -= s*falta*0.2; H.x = lim(H.x, ARENA.x0, ARENA.x1); } }
  /* la cámara sigue el medio de la pelea */
  L.camObj = lim((H.x + E.x)/2 - 446, ARENA.x0 - 40, ARENA.x1 - 800); L.cam += (L.camObj - L.cam)*Math.min(1, dtReal*3);
  L.sacudida = Math.max(0, L.sacudida - dtReal*40);
  for(const f of L.fx) f.t += dt; L.fx = L.fx.filter(f => f.t < (f.vida || 0.5));
  for(const n of L.numeros) n.t += dtReal; L.numeros = L.numeros.filter(n => n.t < 1.1);
  if(L.textoT > 0) L.textoT -= dtReal;
  if(L.fin){ L.finT += dtReal; if(L.fin === 'victoria' && L.finT > 0.9 && H.estado === 'quieto' && H.vivo){ ponerEstado(H, 'victoria'); anima(H, 'victoria'); H.fpsAnim = 12; } }
  if(E.vivo) SON.intensidad(E.vida < E.vidaMax*0.35 ? 1 : 0.3 + 0.4*(1 - E.vida/E.vidaMax));
}
