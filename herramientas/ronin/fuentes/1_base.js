'use strict';
/* ================================================================ EL ÚLTIMO RŌNIN
   Duelos de samurái de lado, en tinta sumi-e. Las animaciones salieron de videos generados (Rezona): cada una viaja
   como un video chico con el alfa empaquetado al costado y se arma en cuadros al cargar. Se juega apaisado. */

/* ================================================================ utilidades */
const lim = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a)*t;
const suave = t => t*t*(3 - 2*t);
const rv = (a, b) => a + Math.random()*(b - a);
const ri = (a, b) => Math.floor(rv(a, b + 1));
const elegir = l => l[Math.floor(Math.random()*l.length)];
const barajar = l => { const a = l.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; }
function leer(k, def){ try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch(e){ return def; } }
function guardar(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
const $ = id => document.getElementById(id);
const ERRORES = [];
function anotarError(e){ if(ERRORES.length < 40) ERRORES.push(String(e && e.stack || e).slice(0, 300)); }
const esperar = ms => new Promise(r => setTimeout(r, ms));
const miles = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, IDIOMA === 'en' ? ',' : '.');

/* ================================================================ ajustes y progreso */
const AJ = Object.assign({idioma:null, musica:0.75, efectos:1, vibrar:true, sacudida:true, sangre:true, vistoIdioma:false}, leer('ronin.ajustes', {}));
if(!['es', 'en', 'pt'].includes(AJ.idioma)){ const l = (navigator.language || 'es').slice(0, 2).toLowerCase(); AJ.idioma = l === 'pt' ? 'pt' : l === 'en' ? 'en' : 'es'; }
AJ.musica = lim(+AJ.musica, 0, 1); AJ.efectos = lim(+AJ.efectos, 0, 1);
const guardarAj = () => guardar('ronin.ajustes', AJ);
const PROG_DEF = {oro:0, capitulo:1, mejor:{}, espadas:{sarashi:1}, espada:'sarashi', dojo:{vida:0, filo:0, postura:0, ki:0}, yokai:{}, tutorial:false, muertes:0, bajas:0};
const PROG = Object.assign({}, PROG_DEF, leer('ronin.progreso', {}));
for(const k of ['mejor', 'espadas', 'dojo', 'yokai']) PROG[k] = Object.assign({}, PROG_DEF[k], PROG[k] || {});
const guardarProg = () => guardar('ronin.progreso', PROG);
function vibrar(ms){ if(AJ.vibrar && navigator.vibrate) try { navigator.vibrate(ms); } catch(e){} }

/* ================================================================ idiomas: la frase en castellano es la clave */
let IDIOMA = AJ.idioma, DIC = null;
const TR_FALTA = new Set(), _TRAD = new Set();
function dic(){ if(DIC) return DIC; DIC = {en:{}, pt:{}}; for(const [es, en, pt] of FRASES){ DIC.en[es] = en; DIC.pt[es] = pt; _TRAD.add(en); _TRAD.add(pt); } return DIC; }
function tr(s, ...a){
  let t = s;
  if(IDIOMA !== 'es'){ const d = dic()[IDIOMA]; if(d[s] !== undefined) t = d[s]; else if(!_TRAD.has(s)) TR_FALTA.add(s); }
  return a.length ? String(t).replace(/\{(\d)\}/g, (m, i) => a[i]) : t;
}
function ponerIdioma(l){ AJ.idioma = IDIOMA = l; guardarAj(); document.documentElement.lang = l; document.title = tr('EL ÚLTIMO RŌNIN'); }
document.documentElement.lang = IDIOMA;

/* ================================================================ el escenario, girado 90° si la pantalla está parada
   (x, y) de la pantalla → (y, W − x) del escenario; se mide con visualViewport porque vh/vw mienten */
const stage = $('stage'), lienzo = $('lienzo'), g = lienzo.getContext('2d');
const MED = {w:892, h:412, girado:false, dpr:1, u:1};
function medida(){ const vv = window.visualViewport; return {w:Math.round(vv ? vv.width : innerWidth), h:Math.round(vv ? vv.height : innerHeight)}; }
function aLocal(px, py){ return MED.girado ? {x:py, y:MED.w - px} : {x:px, y:py}; }
function medir(){
  const m = medida(), vertical = m.h > m.w, w = vertical ? m.h : m.w, h = vertical ? m.w : m.h;
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  stage.style.transform = 'translate(-50%,-50%)' + (vertical ? ' rotate(90deg)' : '');
  MED.w = w; MED.h = h; MED.girado = vertical; MED.u = h/412;
  MED.dpr = Math.min(window.devicePixelRatio || 1, 2);
  lienzo.width = Math.round(w*MED.dpr); lienzo.height = Math.round(h*MED.dpr);
}
addEventListener('resize', medir); addEventListener('orientationchange', () => setTimeout(medir, 250));
if(window.visualViewport) visualViewport.addEventListener('resize', medir);
medir();

/* ================================================================ la entrada
   Los botones de la pelea se dibujan en el lienzo y se tocan por zona, con varios dedos a la vez.
   Izquierda: ◀ ▶. Derecha: ATACAR (grande), GUARDIA, ESQUIVAR y la HABILIDAD. En la compu: A/D, J, K, L, I. */
const ENT = {izq:false, der:false, guardia:false, ataque:0, esquive:0, habilidad:0, guardiaDesde:-9, dedos:new Map(), teclas:{}, zonas:[], activo:true, toque:null};
function zonaEn(x, y){ for(const z of ENT.zonas){ const dx = x - z.x, dy = y - z.y; if(dx*dx + dy*dy <= z.r*z.r*1.25) return z; } return null; }
function apretar(z, si){
  if(!z) return;
  if(z.id === 'izq') ENT.izq = si; else if(z.id === 'der') ENT.der = si;
  else if(z.id === 'guardia'){ if(si && !ENT.guardia) ENT.guardiaDesde = RELOJ.t; ENT.guardia = si; }
  else if(si && z.id === 'ataque') ENT.ataque = RELOJ.t; else if(si && z.id === 'esquive') ENT.esquive = RELOJ.t; else if(si && z.id === 'habilidad') ENT.habilidad = RELOJ.t;
  else if(si && z.id === 'pausa') pausar();
  if(si){ z.t = RELOJ.t; }
}
function recalcularDedos(){ let i = false, d = false, gu = false; for(const z of ENT.dedos.values()){ if(!z) continue; if(z.id === 'izq') i = true; if(z.id === 'der') d = true; if(z.id === 'guardia') gu = true; }
  ENT.izq = i; ENT.der = d; if(gu && !ENT.guardia) ENT.guardiaDesde = RELOJ.t; ENT.guardia = gu; }
lienzo.addEventListener('touchstart', e => { e.preventDefault(); SON.arrancar();
  for(const t of e.changedTouches){ const p = aLocal(t.clientX, t.clientY), z = zonaEn(p.x, p.y); ENT.dedos.set(t.identifier, z); if(z) apretar(z, true); else ENT.toque = {x:p.x, y:p.y, t:RELOJ.t}; }
  recalcularDedos(); }, {passive:false});
const soltar = e => { e.preventDefault(); for(const t of e.changedTouches){ ENT.dedos.delete(t.identifier); } recalcularDedos(); };
lienzo.addEventListener('touchend', soltar, {passive:false}); lienzo.addEventListener('touchcancel', soltar, {passive:false});
lienzo.addEventListener('touchmove', e => { e.preventDefault();
  /* deslizar de ◀ a ▶ cambia de lado sin levantar el dedo */
  for(const t of e.changedTouches){ const p = aLocal(t.clientX, t.clientY), z = zonaEn(p.x, p.y), ant = ENT.dedos.get(t.identifier);
    if(ant && (ant.id === 'izq' || ant.id === 'der') && z && (z.id === 'izq' || z.id === 'der')) ENT.dedos.set(t.identifier, z); }
  recalcularDedos(); }, {passive:false});
let _raton = null;
lienzo.addEventListener('mousedown', e => { SON.arrancar(); const p = aLocal(e.clientX, e.clientY), z = zonaEn(p.x, p.y); _raton = z; if(z) apretar(z, true); else ENT.toque = {x:p.x, y:p.y, t:RELOJ.t}; });
addEventListener('mouseup', () => { if(_raton && ['izq', 'der', 'guardia'].includes(_raton.id)) apretar(_raton, false); _raton = null; });
const TECLAS = {a:'izq', arrowleft:'izq', d:'der', arrowright:'der', k:'guardia', s:'guardia', j:'ataque', ' ':'ataque', l:'esquive', shift:'esquive', i:'habilidad', e:'habilidad'};
addEventListener('keydown', e => { const k = e.key.toLowerCase(); if(k === 'escape' || k === 'p'){ pausar(); return; } const id = TECLAS[k]; if(!id || ENT.teclas[k]) return; ENT.teclas[k] = true; SON.arrancar(); apretar({id}, true); });
addEventListener('keyup', e => { const k = e.key.toLowerCase(), id = TECLAS[k]; ENT.teclas[k] = false; if(id && ['izq', 'der', 'guardia'].includes(id)) apretar({id}, false); });
addEventListener('blur', () => { ENT.izq = ENT.der = ENT.guardia = false; ENT.dedos.clear(); ENT.teclas = {}; });
document.addEventListener('visibilitychange', () => { if(document.hidden && JUEGO.modo === 'pelea' && !JUEGO.pausa) pausar(); });

/* el reloj del juego: corre con la cámara lenta y se frena en la pausa y en el golpe congelado */
const RELOJ = {t:0, real:0, escala:1, congelado:0};
