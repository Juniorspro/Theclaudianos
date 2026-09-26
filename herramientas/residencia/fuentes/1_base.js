'use strict';
/* ================================================================ NO LO DEJES ENTRAR
   Una noche en una casa de bloques al lado de una planta química. Hasta las 12 te preparás;
   de 12 a 6 algo da vueltas afuera y quiere entrar. Primera persona, se juega apaisado. */

/* ================================================================ utilidades */
const lim = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a)*t;
const suave = t => t*t*(3 - 2*t);
const rv = (a, b) => a + Math.random()*(b - a);
const ri = (a, b) => Math.floor(rv(a, b + 1));
const elegir = l => l[Math.floor(Math.random()*l.length)];
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const angDif = (a, b) => { let d = (b - a) % (Math.PI*2); if(d > Math.PI) d -= Math.PI*2; if(d < -Math.PI) d += Math.PI*2; return d; };
function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; }
function leer(k, def){ try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch(e){ return def; } }
function guardar(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
const $ = id => document.getElementById(id);
const ERRORES = [];
function anotarError(e){ if(ERRORES.length < 40) ERRORES.push(String(e && e.stack || e).slice(0, 300)); }

/* ================================================================ ajustes */
const AJ = Object.assign({idioma:null, calidad:'media', sens:1, brillo:1, musica:0.8, efectos:1, vibrar:true, subs:true, dificultad:'normal', vistoIdioma:false}, leer('residencia.ajustes', {}));
if(!['es', 'en', 'pt'].includes(AJ.idioma)){ const l = (navigator.language || 'es').slice(0, 2).toLowerCase(); AJ.idioma = l === 'pt' ? 'pt' : l === 'en' ? 'en' : 'es'; }
if(!['alta', 'media', 'baja'].includes(AJ.calidad)) AJ.calidad = 'media';
if(!['facil', 'normal', 'pesadilla'].includes(AJ.dificultad)) AJ.dificultad = 'normal';
AJ.sens = lim(+AJ.sens || 1, 0.4, 2.2); AJ.brillo = lim(+AJ.brillo || 1, 0.6, 1.6); AJ.musica = lim(+AJ.musica, 0, 1); AJ.efectos = lim(+AJ.efectos, 0, 1);
const guardarAj = () => guardar('residencia.ajustes', AJ);
const PROG = Object.assign({ganadas:{}, intentos:0, muertes:0}, leer('residencia.progreso', {}));
const guardarProg = () => guardar('residencia.progreso', PROG);
function vibrar(ms){ if(AJ.vibrar && navigator.vibrate) try { navigator.vibrate(ms); } catch(e){} }

/* ================================================================ idiomas
   tr(frase, …): la frase en castellano es la clave; {0} {1} para números y nombres. FRASES está en 9_idiomas.js. */
let IDIOMA = AJ.idioma, DIC = null;
const TR_FALTA = new Set(), _TRAD = new Set();
function dic(){ if(DIC) return DIC; DIC = {en:{}, pt:{}}; for(const [es, en, pt] of FRASES){ DIC.en[es] = en; DIC.pt[es] = pt; _TRAD.add(en); _TRAD.add(pt); } return DIC; }
function tr(s, ...a){
  let t = s;
  if(IDIOMA !== 'es'){ const d = dic()[IDIOMA]; if(d[s] !== undefined) t = d[s]; else if(!_TRAD.has(s)) TR_FALTA.add(s); }
  return a.length ? String(t).replace(/\{(\d)\}/g, (m, i) => a[i]) : t;
}
function ponerIdioma(l){ AJ.idioma = IDIOMA = l; guardarAj(); document.documentElement.lang = l; document.title = tr('NO LO DEJES ENTRAR'); }
document.documentElement.lang = IDIOMA;

/* ================================================================ el escenario: girado 90° si la pantalla está parada
   (x, y) de la pantalla -> (y, W - x) del escenario. vh/vw mienten en el celular: se mide con visualViewport. */
const stage = $('stage');
const MED = {w:800, h:400, girado:false, cb:[]};
function medida(){ const vv = window.visualViewport; return {w:Math.round(vv ? vv.width : innerWidth), h:Math.round(vv ? vv.height : innerHeight)}; }
function aLocal(px, py){ const m = medida(); return m.h > m.w ? {x:py, y:m.w - px} : {x:px, y:py}; }
function medir(){
  const m = medida(), vertical = m.h > m.w, w = vertical ? m.h : m.w, h = vertical ? m.w : m.h;
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  stage.style.transform = 'translate(-50%,-50%) rotate(' + (vertical ? 90 : 0) + 'deg)';
  MED.w = w; MED.h = h; MED.girado = vertical;
  for(const f of MED.cb) try { f(w, h); } catch(e){ anotarError(e); }
}
addEventListener('resize', medir);
addEventListener('orientationchange', () => setTimeout(medir, 250));
if(window.visualViewport) visualViewport.addEventListener('resize', medir);

/* ================================================================ la entrada
   Izquierda: palanca que nace donde apoyás el dedo. Derecha: arrastrar mira. Los botones son del DOM y se
   tocan en touchstart (no en click: con dos dedos a la vez el click no llega). */
const ENT = {mx:0, my:0, dx:0, dy:0, correr:false, teclas:{}, dedoMover:null, dedoMirar:null, ox:0, oy:0, lx:0, ly:0, activo:false, raton:false, cb:{}};
const NO_ARMA = '.bot,.ranura,.boton,.camFlecha,#camCerrar,.qteB,#menu .panel,#salirPlacard';
function toque(t){ const p = aLocal(t.clientX, t.clientY); return p; }
function empezarToque(e){
  if(!ENT.activo) return;
  for(const t of e.changedTouches){
    const tg = t.target && t.target.closest ? t.target.closest(NO_ARMA) : null; if(tg) continue;
    const p = toque(t);
    if(p.x < MED.w*0.42 && ENT.dedoMover === null){ ENT.dedoMover = t.identifier; ENT.ox = p.x; ENT.oy = p.y; ENT.mx = ENT.my = 0; mostrarPalanca(p.x, p.y, 0, 0); }
    else if(ENT.dedoMirar === null){ ENT.dedoMirar = t.identifier; ENT.lx = p.x; ENT.ly = p.y; }
  }
  e.preventDefault();
}
function moverToque(e){
  for(const t of e.changedTouches){ const p = toque(t);
    if(t.identifier === ENT.dedoMover){ const R = Math.max(40, MED.h*0.13), dx = p.x - ENT.ox, dy = p.y - ENT.oy, d = Math.hypot(dx, dy), k = d > R ? R/d : 1;
      ENT.mx = dx*k/R; ENT.my = dy*k/R; mostrarPalanca(ENT.ox, ENT.oy, dx*k, dy*k); }
    else if(t.identifier === ENT.dedoMirar){ ENT.dx += p.x - ENT.lx; ENT.dy += p.y - ENT.ly; ENT.lx = p.x; ENT.ly = p.y; } }
  e.preventDefault();
}
function soltarToque(e){
  for(const t of e.changedTouches){
    if(t.identifier === ENT.dedoMover){ ENT.dedoMover = null; ENT.mx = ENT.my = 0; $('palanca').classList.remove('viva'); }
    if(t.identifier === ENT.dedoMirar) ENT.dedoMirar = null; }
}
function soltarTodo(){ ENT.dedoMover = ENT.dedoMirar = null; ENT.mx = ENT.my = 0; ENT.correr = false; ENT.teclas = {}; $('palanca').classList.remove('viva'); for(const b of document.querySelectorAll('.apretado')) b.classList.remove('apretado'); }
function mostrarPalanca(x, y, dx, dy){ const p = $('palanca'); p.classList.add('viva'); p.style.left = x + 'px'; p.style.top = y + 'px'; $('palancaB').style.transform = 'translate(' + dx*0.55 + 'px,' + dy*0.55 + 'px)'; }
stage.addEventListener('touchstart', empezarToque, {passive:false});
stage.addEventListener('touchmove', moverToque, {passive:false});
stage.addEventListener('touchend', soltarToque); stage.addEventListener('touchcancel', soltarToque);
addEventListener('blur', soltarTodo);
document.addEventListener('visibilitychange', () => { if(document.hidden){ soltarTodo(); if(ENT.cb.oculto) ENT.cb.oculto(); }
  /* con la pestaña escondida no suena nada, ni la música del menú */
  try { const c = SON._ctx && SON._ctx(); if(c) document.hidden ? c.suspend() : c.resume(); } catch(e){} });

/* un botón que responde al apoyar (y al soltar, si hace falta); con ratón también */
let _ultTouch = 0;
function tocar(el, abajo, arriba){
  if(typeof el === 'string') el = $(el); if(!el) return;
  el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); _ultTouch = performance.now(); el.classList.add('apretado'); try { abajo && abajo(e); } catch(x){ anotarError(x); } }, {passive:false});
  const fin = e => { el.classList.remove('apretado'); try { arriba && arriba(e); } catch(x){ anotarError(x); } };
  el.addEventListener('touchend', e => { e.preventDefault(); fin(e); }); el.addEventListener('touchcancel', fin);
  el.addEventListener('mousedown', e => { if(performance.now() - _ultTouch < 700) return; e.stopPropagation(); el.classList.add('apretado'); try { abajo && abajo(e); } catch(x){ anotarError(x); } });
  el.addEventListener('mouseup', e => { if(performance.now() - _ultTouch < 700) return; fin(e); });
  el.addEventListener('mouseleave', () => el.classList.remove('apretado'));
}

/* teclado y ratón para la compu */
addEventListener('keydown', e => { if(e.repeat) return; ENT.teclas[e.code] = true; if(ENT.cb.tecla) ENT.cb.tecla(e.code); });
addEventListener('keyup', e => { ENT.teclas[e.code] = false; });
$('lienzo').addEventListener('mousedown', () => { if(ENT.activo && !('ontouchstart' in window) && document.pointerLockElement !== $('lienzo')) { try { $('lienzo').requestPointerLock(); } catch(e){} } });
addEventListener('mousemove', e => { if(document.pointerLockElement === $('lienzo')){ ENT.dx += e.movementX; ENT.dy += e.movementY; ENT.raton = true; } });
function ejeTeclado(){
  const T = ENT.teclas; let x = 0, y = 0;
  if(T.KeyW || T.ArrowUp) y -= 1; if(T.KeyS || T.ArrowDown) y += 1; if(T.KeyA || T.ArrowLeft) x -= 1; if(T.KeyD || T.ArrowRight) x += 1;
  return {x, y, correr:!!(T.ShiftLeft || T.ShiftRight)};
}
