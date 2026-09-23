
/* ================================================================ utilidades */
const lim = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a)*t;
const sig = v => v < 0 ? -1 : 1;
const suave = t => t*t*(3 - 2*t);
const rv = (a, b) => a + Math.random()*(b - a);
function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; }
let rnd = mulberry(20260923);                                  /* el azar del mundo (con semilla para el banco) */
const R = (a, b) => a + rnd()*(b - a), RI = (a, b) => Math.floor(R(a, b + 1)), elegir = l => l[Math.floor(rnd()*l.length)];
function leer(k, def){ try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch(e){ return def; } }
function guardar(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
const K = '#0a0610';

/* ================================================================ ajustes */
const AJ = Object.assign({idioma:null, calidad:'alta', musica:0.8, efectos:1, vibrar:true, controles:'palancas'}, leer('mate.ajustes', {}));
if(!['palancas', 'arrastre'].includes(AJ.controles)) AJ.controles = 'palancas';
if(!['es', 'en', 'pt'].includes(AJ.idioma)){ const l = (navigator.language || 'es').slice(0, 2).toLowerCase(); AJ.idioma = l === 'pt' ? 'pt' : l === 'en' ? 'en' : 'es'; }
if(!['alta', 'media', 'baja'].includes(AJ.calidad)) AJ.calidad = 'alta';
AJ.musica = lim(+AJ.musica || 0, 0, 1); AJ.efectos = lim(+AJ.efectos || 0, 0, 1);
function vibrar(ms){ if(AJ.vibrar && navigator.vibrate) try { navigator.vibrate(ms); } catch(e){} }

/* ================================================================ idiomas
   tr(frase, …): la frase en castellano es la clave, {0} {1} para números y nombres. Lo exacto se
   traduce solo en lienzoTexto y el(); lo compuesto va con plantilla. FRASES está en idiomas.js. */
let IDIOMA = AJ.idioma, DIC = null;
const TR_FALTA = new Set(), _SAL = new Set(), _TRAD = new Set();
function dic(){ if(DIC) return DIC; DIC = {en:{}, pt:{}};
  for(const [es, en, pt] of FRASES){ DIC.en[es] = en; DIC.pt[es] = pt; _TRAD.add(en); _TRAD.add(pt);
    for(const q of [en, pt]) for(const w of q.toUpperCase().split(/[^A-ZÀ-Ü]+/)) if(w.length > 2) _PAL.add(w); } return DIC; }
/* un texto ya traducido que se escribe de a poco o partido en renglones no es una frase que falte */
const _PAL = new Set();
function yaTraducido(s){ const ws = s.toUpperCase().split(/[^A-ZÀ-Ü]+/).filter(w => w.length > 2); if(!ws.length) return true;
  return ws.every((w, i) => _PAL.has(w) || (i === ws.length - 1 && [..._PAL].some(p => p.startsWith(w)))); }
function tr(s, ...a){
  let t = s;
  if(IDIOMA !== 'es'){ const d = dic()[IDIOMA]; if(d[s] !== undefined) t = d[s]; else if(!_TRAD.has(s)) TR_FALTA.add(s); }
  const r = a.length ? String(t).replace(/\{(\d)\}/g, (m, i) => a[i]) : t;
  if(IDIOMA !== 'es'){ if(_SAL.size > 800) _SAL.clear(); _SAL.add(r); }
  return r;
}
function trAuto(s){
  if(IDIOMA === 'es' || typeof s !== 'string') return s;
  const d = dic()[IDIOMA]; if(d[s] !== undefined) return d[s];
  if(!_TRAD.has(s) && !_SAL.has(s) && !/[<\d]/.test(s) && /[a-záéíóúñ]{3,}/i.test(s) && !yaTraducido(s)) TR_FALTA.add(s);
  return s;
}
function ponerIdioma(l){ AJ.idioma = IDIOMA = l; guardar('mate.ajustes', AJ); document.documentElement.lang = l; CACHE_TXT.clear(); }
document.documentElement.lang = IDIOMA;


/* ================================================================ fuente de píxeles 5×7
   Mayúsculas, números y signos; las tildes, la Ñ y la Ü van como marca arriba de la letra. */
const FUENTE = {
A:'.###.#...##...#######...##...##...#', B:'####.#...##...#####.#...##...#####.', C:'.#####....#....#....#....#.....####',
D:'####.#...##...##...##...##...#####.', E:'######....#....####.#....#....#####', F:'######....#....####.#....#....#....',
G:'.#####....#....#.####...##...#.###.', H:'#...##...##...#######...##...##...#', I:'#####..#....#....#....#....#..#####',
J:'..###...#....#....#....#.#..#..##..', K:'#...##..#.#.#..##...#.#..#..#.#...#', L:'#....#....#....#....#....#....#####',
M:'#...###.###.#.##.#.##...##...##...#', N:'#...###..##.#.##..###...##...##...#', O:'.###.#...##...##...##...##...#.###.',
P:'####.#...##...#####.#....#....#....', Q:'.###.#...##...##...##.#.##..#..##.#', R:'####.#...##...#####.#.#..#..#.#...#',
S:'.#####....#.....###.....#....#####.', T:'#####..#....#....#....#....#....#..', U:'#...##...##...##...##...##...#.###.',
V:'#...##...##...##...##...#.#.#...#..', W:'#...##...##...##.#.##.#.###.###...#', X:'#...##...#.#.#...#...#.#.#...##...#',
Y:'#...##...#.#.#...#....#....#....#..', Z:'#####....#...#...#...#...#....#####',
'0':'.###.#...##..###.#.###..##...#.###.', '1':'..#...##....#....#....#....#...###.', '2':'.###.#...#....#...#...#...#...#####',
'3':'####.....#....#.###.....#....#####.', '4':'#...##...##...######....#....#....#', '5':'######....####.....#....##...#.###.',
'6':'.###.#....#....####.#...##...#.###.', '7':'#####....#...#...#...#....#....#...', '8':'.###.#...##...#.###.#...##...#.###.',
'9':'.###.#...##...#.####....#....#.###.',
'.':'................................#..', ',':'...........................#...#...', ':':'.......#...............#...........',
'!':'..#....#....#....#....#.........#..', '¡':'..#.........#....#....#....#....#..', '?':'.###.#...#....#...#...#.........#..',
'¿':'..#.........#...#...#....#...#.###.', '-':'...............###.................', '+':'.......#....#..#####..#....#.......',
'/':'....#....#...#...#...#...#....#....', "'":'..#....#...........................', '%':'##..###..#...#...#...#...#..###..##',
'(':'...#...#...#....#....#.....#.....#.', ')':'.#.....#.....#....#....#...#...#...', '·':'.................#.................', '$':'..#...#####.#...###...#.#####...#..', '◀':'...#...##..###.####..###...##....#.', '▶':'.#....##...###..####.###..##...#...',
'×':'.....#...#.#.#...#...#.#.#...#.....', '=':'..........#####.....#####..........', '#':'.#.#.#####.#.#..#.#.#####.#.#......',
' ':'...................................'
};
const MARCA = {'Á':['A','agudo'], 'É':['E','agudo'], 'Í':['I','agudo'], 'Ó':['O','agudo'], 'Ú':['U','agudo'], 'Ñ':['N','tilde'], 'Ü':['U','dieresis'],
  'Ã':['A','tilde'], 'Õ':['O','tilde'], 'Â':['A','circ'], 'Ê':['E','circ'], 'Ô':['O','circ'], 'À':['A','grave'], 'Ç':['C','cedilla', 1]};   /* 1: la marca va abajo */
const MARCAS = {agudo:['..#..','.#...'], tilde:['.#.#.','#.#..'], dieresis:['.....','.#.#.'], circ:['..#..','.#.#.'], grave:['.#...','..#..'], cedilla:['..#..','.##..']};
const GRAD = {
  oro:  ['#fff8d0','#ffe888','#ffd040','#f8b020','#e08c10','#c06a08','#8c4604'],
  blanco:['#ffffff','#f4f0ea','#e6e0d6','#d6cec2','#c4baae','#b0a496','#968a7c'],
  rojo: ['#ffd0b8','#ff9070','#ff5a3c','#e83424','#c01c14','#901008','#600804'],
  verde:['#e8ffc8','#b8f080','#88dc48','#58c028','#3a9c18','#267410','#185008'],
  azul: ['#d8f0ff','#98d0ff','#60a8f8','#3880e8','#2060c0','#144498','#0c2c68'],
  gris: ['#d8d4cc','#bcb6ac','#a09a90','#88827a','#706a64','#5a5550','#44403c'],
  violeta:['#f4e0ff','#e0b8ff','#c890f8','#a868e8','#8848c8','#6430a0','#401c70'],
  fuego:['#ffffc0','#ffee60','#ffc020','#ff8810','#f05808','#c83004','#881802']
};
const CACHE_TXT = new Map(), _AUD = new Set();      /* _AUD: los textos pixelados que se dibujaron (para la sonda de idiomas) */
/* 1 px de lienzo = 1 px de fuente: sombra abajo-derecha, contorno 3×3 y relleno con degradé por fila */
function lienzoTexto(str, grad, opc){
  str = String(trAuto(String(str))).toUpperCase(); grad = grad || 'blanco'; opc = opc || {};
  _AUD.add(str);
  const clave = str + '|' + grad + '|' + (opc.sinBorde ? 1 : 0);
  if(CACHE_TXT.has(clave)) return CACHE_TXT.get(clave);
  if(CACHE_TXT.size > 400) CACHE_TXT.clear();
  const chars = [...str], W = chars.length*6 + 3, H = 3 + 7 + 3;
  const mascara = new Uint8Array(W*H);
  chars.forEach((ch, i) => {
    let base = ch, marca = null, abajo = false;
    if(MARCA[ch]){ base = MARCA[ch][0]; marca = MARCAS[MARCA[ch][1]]; abajo = !!MARCA[ch][2]; }
    const g = FUENTE[base] || FUENTE['?'], x0 = 1 + i*6, y0 = 4;
    for(let y = 0; y < 7; y++) for(let x = 0; x < 5; x++) if(g[y*5 + x] === '#') mascara[(y0 + y)*W + x0 + x] = 1;
    if(marca) for(let y = 0; y < 2; y++) for(let x = 0; x < 5; x++) if(marca[y][x] === '#') mascara[((abajo ? y0 + 7 : y0 - 3) + y)*W + x0 + x] = 1;
  });
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), paleta = GRAD[grad] || GRAD.blanco;
  if(!opc.sinBorde){
    g.fillStyle = '#140c08';
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) if(mascara[y*W + x]){ g.fillRect(x - 1, y - 1, 3, 3); g.fillRect(x + 1, y + 1, 1, 1); g.fillRect(x, y + 2, 1, 1); g.fillRect(x + 1, y + 2, 1, 1); }
  }
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) if(mascara[y*W + x]){
    g.fillStyle = paleta[lim(y - 4, 0, 6)]; g.fillRect(x, y, 1, 1); }
  CACHE_TXT.set(clave, c);
  return c;
}
/* texto en el mundo o en el HUD, centrado o no */
function texto(ctx, str, x, y, grad, opc){
  const c = lienzoTexto(str, grad, opc), e = (opc && opc.esc) || 1;
  const ax = opc && opc.izq ? 0 : (opc && opc.der ? c.width*e : Math.floor(c.width*e/2));
  ctx.drawImage(c, Math.round(x - ax), Math.round(y), c.width*e, c.height*e);
  return c.width*e;
}
/* un texto en píxeles para los menús (DOM), a escala S */
function pixelTxt(str, grad, S){
  const c = lienzoTexto(str, grad), k = document.createElement('canvas');
  k.width = c.width; k.height = c.height; k.getContext('2d').drawImage(c, 0, 0);
  k.className = 'px'; k.style.width = c.width*(S || 3) + 'px'; k.style.height = c.height*(S || 3) + 'px';
  return k;
}


/* ================================================================ el escenario girado y la medida
   El juego se dibuja a ~216 filas y se agranda por un número ENTERO de píxeles reales (PX). */
const stage = document.getElementById('stage'), cvGL = document.getElementById('gl'), cvHUD = document.getElementById('hud');
const cxHUD = cvHUD.getContext('2d');
let GIRADO = false, PANT_W = 412, SW = 892, SH = 412, DPR = 1, PX = 5, W = 468, H = 216;
function girar(){
  const vv = window.visualViewport, w = Math.round(vv ? vv.width : innerWidth), h = Math.round(vv ? vv.height : innerHeight);
  GIRADO = h > w*1.15 && (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window); PANT_W = w; girar.ult = w + 'x' + h;
  SW = GIRADO ? h : w; SH = GIRADO ? w : h;
  stage.style.width = SW + 'px'; stage.style.height = SH + 'px';
  stage.style.transform = GIRADO ? 'translate(' + w + 'px,0) rotate(90deg)' : 'none';
}
/* un toque de la pantalla → coordenadas del escenario: girado 90° a la derecha, (x, y) → (y, W − x) */
const aStage = (x, y) => GIRADO ? [y, PANT_W - x] : [x, y];
/* del escenario (px CSS) al lienzo chico */
const aLienzo = (x, y) => [x*DPR/PX, y*DPR/PX];
const alMedir = [];
function medir(){
  girar();
  DPR = Math.min(devicePixelRatio || 1, 4);
  const dw = Math.round(SW*DPR), dh = Math.round(SH*DPR);
  PX = Math.max(1, Math.floor(dh/200));
  W = Math.ceil(dw/PX); H = Math.ceil(dh/PX);
  const cw = W*PX/DPR + 'px', ch = H*PX/DPR + 'px';
  for(const c of [cvGL, cvHUD]){ c.style.width = cw; c.style.height = ch; }
  if(cvHUD.width !== W || cvHUD.height !== H){ cvHUD.width = W; cvHUD.height = H; }
  cxHUD.imageSmoothingEnabled = false;
  for(const f of alMedir) f();
}
new ResizeObserver(() => medir()).observe(stage);
for(const ev of ['resize', 'orientationchange']) addEventListener(ev, () => medir());
if(window.visualViewport) visualViewport.addEventListener('resize', () => medir());

/* DOM chico */
function el(tag, cls, html){ const e = document.createElement(tag); if(cls) e.className = cls; if(html !== undefined) e.innerHTML = trAuto(html); return e; }
