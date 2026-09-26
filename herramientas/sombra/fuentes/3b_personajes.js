/* ================================================================ los personajes: sprites dibujados píxel por píxel
   Cada cuadro es una grilla de letras (una letra = un color de la paleta del efecto). Se pintan en una lámina de 48×48
   centrada en el personaje, se giran ahí mismo (vecino más cercano, sin mezclar colores), y después se les pone la luz
   de borde: el píxel que tiene aire arriba o a la izquierda (de donde viene la luz) se aclara hacia el color de la luz.
   Así la silueta sigue siendo silueta pero se lee contra la torre oscura, y cada efecto la tiñe con su propia luz. */
const COD = {'.':0, K:1, M:2, S:3, E:4, R:5, r:6, H:7, h:8, G:9, g:10, W:11, w:12, A:13, O:14, N:15, P:16, p:17, X:18, Y:19, T:20};
const LAM = {n:48, c:24, idx:new Uint8Array(48*48), cv:null, g:null, img:null, x0:48, y0:48, x1:-1, y1:-1};
function lamLimpiar(){ LAM.idx.fill(0); LAM.x0 = LAM.y0 = LAM.n; LAM.x1 = LAM.y1 = -1; }
function lamPx(x, y, i){ x = Math.round(x) + LAM.c; y = Math.round(y) + LAM.c; if(x < 0 || y < 0 || x >= LAM.n || y >= LAM.n) return;
  LAM.idx[y*LAM.n + x] = i; if(x < LAM.x0) LAM.x0 = x; if(x > LAM.x1) LAM.x1 = x; if(y < LAM.y0) LAM.y0 = y; if(y > LAM.y1) LAM.y1 = y; }
function lamLinea(x0, y0, x1, y1, i, i2){ const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for(let k = 0; k <= n; k++) lamPx(x0 + (x1 - x0)*k/n, y0 + (y1 - y0)*k/n, i2 !== undefined && k === n ? i2 : i); }
/* un cuadro: filas de letras, con el ancla (el punto x,y del personaje) en la columna ax y la fila ay */
const cuadro = (ax, ay, filas) => ({ax, ay, filas, w:filas[0].length, h:filas.length});
function lamSpr(f, dx, dy, dir, giro){
  if(!giro){ for(let r = 0; r < f.h; r++){ const fila = f.filas[r]; for(let c = 0; c < f.w; c++){ const ch = fila[c]; if(ch !== '.') lamPx(dx + (c - f.ax)*dir, dy + r - f.ay, COD[ch]); } } return; }
  /* girado: para cada píxel de la lámina se busca de qué letra del cuadro viene */
  const co = Math.cos(giro), si = Math.sin(giro), R = Math.ceil(Math.hypot(f.w, f.h)/2) + 2;
  for(let y = -R; y <= R; y++) for(let x = -R; x <= R; x++){ const u = (x*co + y*si)*dir, v = -x*si + y*co, c = Math.round(u + f.ax), r = Math.round(v + f.ay);
    if(r < 0 || r >= f.h || c < 0 || c >= f.w) continue; const ch = f.filas[r][c]; if(ch !== '.') lamPx(dx + x, dy + y, COD[ch]); } }

/* la paleta sale del efecto (y del ninja elegido): se arma una vez y se guarda */
const PALETAS = new Map();
function mezclaRGB(a, b, k){ return [a[0] + (b[0] - a[0])*k, a[1] + (b[1] - a[1])*k, a[2] + (b[2] - a[2])*k].map(Math.round); }
function paleta(E, x){
  const k = (E.silueta || '') + (E.luzBorde || '') + (E.acento || '') + (x && (x.colBuf + x.colOjo + x.colHoja) || '');
  let P = PALETAS.get(k); if(P) return P;
  const sil = hexRGB(E.silueta || '#0a0610'), luz = hexRGB(E.luzBorde || '#8a6aa0'), luzB = mezclaRGB(luz, [255, 255, 255], 0.25), H = c => hexRGB(c);
  const buf = H(x && x.colBuf || '#e8384a');
  P = []; P[1] = sil; P[2] = mezclaRGB(sil, luz, 0.3); P[3] = mezclaRGB(H('#d8a080'), sil, 0.35); P[4] = H(x && x.colOjo || '#ffffff');
  P[5] = buf; P[6] = mezclaRGB(buf, sil, 0.5); P[7] = H(x && x.colHoja || '#dfe6f2'); P[8] = mezclaRGB(P[7], sil, 0.45); P[9] = H('#f0b830'); P[10] = H('#8a5210');
  P[11] = mezclaRGB(H('#8a5a2a'), sil, 0.35); P[12] = [255, 255, 255]; P[13] = H(E.acento || '#e8384a'); P[14] = H('#ffd0a0'); P[15] = mezclaRGB(H('#a02a2a'), sil, 0.35);
  P[16] = H('#f4e6c8'); P[17] = H('#cdb690'); P[18] = H('#ff3a3a'); P[19] = H('#ffd860'); P[20] = x && x.colHoja ? H(x.colHoja) : mezclaRGB(sil, luz, 0.55);
  /* la luz de borde, fuerte (aire arriba) y suave (aire a la izquierda), sólo para lo que es cuerpo o madera */
  P.rim = []; P.rim2 = []; for(const i of [1, 2, 11, 15, 6]){ P.rim[i] = mezclaRGB(P[i], luzB, i === 1 ? 0.62 : 0.5); P.rim2[i] = mezclaRGB(P[i], luzB, 0.3); }
  P.contorno = luzB; PALETAS.set(k, P); return P; }

/* pasar la lámina al lienzo del juego: colores, luz de borde y listo */
function lamVolcar(g, x, y, P, plano){
  if(!LAM.cv){ const [c, gc] = lienzo(LAM.n, LAM.n); LAM.cv = c; LAM.g = gc; LAM.img = gc.createImageData(LAM.n, LAM.n); }
  if(LAM.x1 < 0) return; const n = LAM.n, d = LAM.img.data, I = LAM.idx; d.fill(0);
  const pl = plano ? hexRGB(plano) : null, cc = P.contorno, X0 = Math.max(0, LAM.x0 - 1), X1 = Math.min(n - 1, LAM.x1 + 1), Y0 = Math.max(0, LAM.y0 - 1), Y1 = Math.min(n - 1, LAM.y1 + 1);
  for(let yy = Y0; yy <= Y1; yy++) for(let xx = X0; xx <= X1; xx++){ const i = yy*n + xx, v = I[i], o = i*4;
    /* el aire pegado a la figura lleva un contorno tenue de luz: la despega de la torre oscura sin comerse el cielo claro */
    if(!v){ if(pl) continue; if((xx > 0 && I[i - 1]) || (xx < n - 1 && I[i + 1]) || (yy > 0 && I[i - n]) || (yy < n - 1 && I[i + n])){ d[o] = cc[0]; d[o + 1] = cc[1]; d[o + 2] = cc[2]; d[o + 3] = 70; } continue; }
    let c = pl || P[v];
    if(!pl && P.rim[v]){ if(yy === 0 || !I[i - n]) c = P.rim[v]; else if(xx === 0 || !I[i - 1]) c = P.rim2[v]; }
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
  LAM.x0 = X0; LAM.x1 = X1; LAM.y0 = Y0; LAM.y1 = Y1;
  LAM.g.putImageData(LAM.img, 0, 0, LAM.x0, LAM.y0, LAM.x1 - LAM.x0 + 1, LAM.y1 - LAM.y0 + 1);
  g.drawImage(LAM.cv, LAM.x0, LAM.y0, LAM.x1 - LAM.x0 + 1, LAM.y1 - LAM.y0 + 1, Math.round(x) - LAM.c + LAM.x0, Math.round(y) - LAM.c + LAM.y0, LAM.x1 - LAM.x0 + 1, LAM.y1 - LAM.y0 + 1); }

/* ================================================================ el ninja (mirando a la derecha, con el piso abajo)
   K cuerpo · M pliegue con luz · S piel · E ojo · r faja · T empuñadura · G tsuba */
const CUADROS_NINJA = {
  pie: cuadro(5, 8, [
    '............',
    '.....KKK....',
    '...TKKKKK...',
    '...TKKSES...',
    '....GKKKK...',
    '...KKKKKK...',
    '..MKKKKKKK..',
    '..MKKKKK.K..',
    '...KrrrK....',
    '..KKKKKKK...',
    '..KKK..KKK..',
    '.KKM....KKM.']),
  apunta: cuadro(5, 8, [
    '............',
    '............',
    '..T...KKK...',
    '...T.KKKKK..',
    '....GKKSES..',
    '..MKKKKKKK..',
    '..MKKKKKKKK.',
    '...KKKKK..K.',
    '...KrrrKK...',
    '.KKKKKKKKK..',
    '.KKK...KKK..',
    'KKM.....KKM.']),
  salto: cuadro(5, 8, [
    '............',
    '.......KKK..',
    '......KKKKK.',
    '....T.KKSES.',
    '.....GKKKKK.',
    '....KKKKKK.K',
    '...MKKKKKKK.',
    '..KKrrrKK...',
    '.KKKKKK.....',
    'KKK..KK.....',
    'KM....KK....',
    '......KM....']),
  cae: cuadro(5, 8, [
    '..K.....K...',
    '..K.KKK.K...',
    '..MKKKKKK...',
    '...TKKSES...',
    '....GKKKK...',
    '...KKKKKK...',
    '...KKKKKK...',
    '...KrrrK....',
    '...KKKKKK...',
    '..KKK..KK...',
    '..KK....KK..',
    '..KM....KM..']),
  bola: cuadro(5, 2, [
    '....KKK.....',
    '..TKKKKK....',
    '...KKKSES...',
    '..KKKKKKKK..',
    '..MKKrrKKK..',
    '..MKKKKKKK..',
    '...KKKKKK...',
    '....KMKK....']),
  pared: cuadro(4, 8, [
    '.K..........',
    '.K..KKK.....',
    '.KKKKKKK....',
    '..TKKKSES...',
    '...GKKKKK...',
    '..KKKKKK....',
    '.KKKKKKMK...',
    '.KKKKKK..K..',
    '.KKrrrK.....',
    '.KKKKKKK....',
    '.KK...KK....',
    '.KM...KKM...']),
  techo: cuadro(5, 0, [
    '..K...K.....',
    '..K...K.....',
    '..MKKKK.....',
    '...KKKKK....',
    '...KKSES....',
    '..TKKKKK....',
    '...GKKKK....',
    '...KrrKK....',
    '...KKKKK....',
    '...KK.KK....',
    '...KK..KK...',
    '...KM...KM..'])
};
/* dónde está la coronilla en cada cuadro (para el sombrero, las orejas y los cuernos) */
for(const [k, u, v] of [['pie', 1, -7], ['apunta', 2, -6], ['salto', 3, -7], ['cae', 0, -7], ['bola', 0, -2], ['pared', 1, -7], ['techo', 0, 3]]) CUADROS_NINJA[k].cab = [u, v];
/* respirar: la cabeza baja un píxel cada tanto */
CUADROS_NINJA.pie2 = cuadro(5, 8, ['............'].concat(CUADROS_NINJA.pie.filas.slice(0, 4), CUADROS_NINJA.pie.filas.slice(5))); CUADROS_NINJA.pie2.cab = [1, -6];

function dibujarNinja(g, x, y, pose, dir, giro, E, extra){
  const tr = typeof J !== 'undefined' ? J.tr : 0, P = paleta(E, extra); lamLimpiar();
  let f = CUADROS_NINJA[pose] || CUADROS_NINJA.salto; if(pose === 'pie' && (tr*0.8) % 1 > 0.55) f = CUADROS_NINJA.pie2;
  /* la bufanda va atrás de todo: dos píxeles de ancho cerca del cuello, con la sombra abajo, y se afina hasta el fleco */
  const b = extra && extra.bufanda; if(b && b.length > 1){ for(let i = b.length - 1; i >= 1; i--){ const ax = b[i - 1].x - x, ay = b[i - 1].y - y, bx = b[i].x - x, by = b[i].y - y;
      lamLinea(ax, ay, bx, by, i === b.length - 1 ? 6 : 5); if(i < 3) lamLinea(ax, ay + 1, bx, by + 1, 6); } }
  lamSpr(f, 0, 0, dir, giro);
  /* parpadea cada tanto */
  if((tr*0.37) % 1 < 0.04){ for(let i = 0; i < LAM.idx.length; i++) if(LAM.idx[i] === 4) LAM.idx[i] = 3; }
  /* lo que se pone cada ninja */
  const ac = extra && extra.accesorio, co = Math.cos(giro), si = Math.sin(giro), T = (u, v) => [(u*dir)*co - v*si, (u*dir)*si + v*co];
  const [cu, cv] = f.cab, px2 = (u, v, i) => { const [a, bb] = T(cu + u, cv + v); lamPx(a, bb, i); };
  if(ac === 'sombrero'){ for(let u = -4; u <= 4; u++) px2(u, 0, 11); for(let u = -2; u <= 2; u++) px2(u, -1, 11); px2(0, -2, 11); }
  if(ac === 'orejas'){ px2(-1, -2, 1); px2(1, -2, 1); px2(-1, -1, 5); px2(1, -1, 5); }
  if(ac === 'cuernos'){ px2(-2, 0, 18); px2(-3, -1, 18); px2(2, 0, 18); px2(3, -1, 18); }
  lamVolcar(g, x, y, P, extra && extra.plano); }

/* ================================================================ la patota (mirando a la derecha, los pies en la piedra: y es la superficie)
   O ojo (se pone rojo cuando van a atacar) · N menpo · G oro · A el color del efecto */
const CUADROS_ENEM = {
  tirador: cuadro(5, 11, [
    '............',
    '.....KK.....',
    '....KGGK....',
    '.KKKKKKKKKK.',
    '...KKKOK....',
    '...KKKKK....',
    '..MKKKKK....',
    '..MKKKKKK...',
    '...KKMKK....',
    '...KKKKKKK..',
    '..KKK...KK..']),
  samurai: cuadro(5, 13, [
    '..G.....G..',
    '..GG...GG..',
    '...GGGGG...',
    '...KKKKK...',
    '.KKKKKKKKK.',
    '..KKKNOK...',
    '..KKKNNK...',
    '.MMKKKKKMM.',
    '.MKKKKKKKM.',
    '..KMKMKMK..',
    '..KKKKKKK..',
    '..KK...KK..',
    '.KKM...KKM.']),
  samurai2: cuadro(5, 13, [
    '..G.....G..',
    '..GG...GG..',
    '...GGGGG...',
    '...KKKKK...',
    '.KKKKKKKKK.',
    '..KKKNOK...',
    '..KKKNNK...',
    '.MMKKKKKMM.',
    '.MKKKKKKKM.',
    '..KMKMKMK..',
    '..KKKKKKK..',
    '...KK.KK...',
    '...KMKKM...']),
  shuriken: cuadro(5, 12, [
    '....KK......',
    '...KKKK.....',
    '...KAAAA....',
    '...KKSES....',
    '...KKKKK....',
    '....KKK.....',
    '...KKKKK....',
    '..MKKKKK....',
    '...KAAK.....',
    '...KKKKK....',
    '..KK..KK....',
    '.KM....KM...']),
  colgado: cuadro(2, 9, [
    'K...K',
    'K...K',
    'MKKKK',
    '.KOK.',
    '.KKK.',
    'KKKKK',
    '.KKK.',
    '.K.K.',
    'KK.KK'])
};

function dibujarEnemigo(g, e, E, t, solo){
  const x = e.x, y = e.y, d = e.dir || 1, P = paleta(E, null); lamLimpiar();
  if(e.t === 'tirador'){
    const cargando = e.carga > 0; P[14] = cargando ? P[18] : hexRGB('#ffd0a0');
    lamSpr(CUADROS_ENEM.tirador, 0, 0, d, 0);
    /* el arcabuz: culata de madera, caño y la mecha que se prende */
    const a = e.apunta !== undefined && (cargando || e.apunta) ? e.apunta : (d > 0 ? 0 : Math.PI), ca = Math.cos(a), sa = Math.sin(a), ox = d*1, oy = -5;
    lamLinea(ox - ca*3, oy - sa*3, ox, oy, 11); lamLinea(ox + ca, oy + sa, ox + ca*7, oy + sa*7, 8, 1);
    lamPx(ox + ca*2 - sa, oy + sa*2 + ca, 1);
    if(cargando && Math.floor(t*16) % 2) lamPx(ox - sa*1.4, oy + ca*1.4 - 1, 19);
  }
  else if(e.t === 'samurai'){
    const lev = e.carga > 0, ataca = e.corta > 0; P[14] = lev || ataca ? P[18] : hexRGB('#ffd0a0');
    const paso = Math.floor(e.x/3) % 2 && !lev && !ataca; lamSpr(paso ? CUADROS_ENEM.samurai2 : CUADROS_ENEM.samurai, 0, 0, d, 0);
    /* la katana: empuñadura, tsuba de oro y la hoja con un brillo que la recorre */
    const ang = lev ? -1.75 : ataca ? 2.2 : 0.55, hx = lev ? -d*1 : ataca ? d*4 : d*3, hy = lev ? -14 : -6, ux = Math.sin(ang)*d, uy = -Math.cos(ang);
    lamLinea(hx - ux*2, hy - uy*2, hx, hy, 1); lamPx(hx + ux, hy + uy, 9);
    lamLinea(hx + ux*2, hy + uy*2, hx + ux*10, hy + uy*10, 7); const k = 2 + ((t*9) % 8); lamPx(hx + ux*k, hy + uy*k, 12);
    /* el tajo: un arco blanco delante */
    if(ataca) for(let q = 0.2; q <= 2.5; q += 0.09){ const rr = 9; lamPx(hx + Math.sin(q)*d*rr, hy - Math.cos(q)*rr, 12); }
  }
  else if(e.t === 'shuriken'){
    const cargando = e.carga > 0; lamSpr(CUADROS_ENEM.shuriken, 0, 0, d, 0);
    /* la cola del pelo con su cinta, que se hamaca */
    const o = Math.sin(t*4 + (e.fase || 0));
    lamPx(-d*2, -11, 13); lamPx(-d*3, -11, 1); lamPx(-d*4, -10, 1); lamPx(-d*4 - d*Math.round(o*0.6), -9, 1); lamPx(-d*5 - d*Math.round(o), -8, 1); lamPx(-d*5 - d*Math.round(o*1.3), -7, 1);
    /* el brazo: atrás con la estrella lista, o adelante */
    if(cargando){ lamLinea(d*1, -6, -d*2, -9, 1); const q = t*20; lamPx(-d*3, -10, 12); lamPx(-d*3 + Math.round(Math.cos(q)*1.4), -10 + Math.round(Math.sin(q)*1.4), 7); }
    else { lamLinea(d*1, -6, d*4, -5, 1); lamPx(d*5, -5, 8); }
  }
  else if(e.t === 'cometa'){
    const o = Math.sin(t*3 + (e.fase || 0))*1.5, ky = -17;
    /* la cometa: papel con la sombra de un lado, el sol pintado del color del efecto, varillas y borde */
    for(let v = -6; v <= 6; v++){ const w = 6 - Math.abs(v); for(let u = -w; u <= w; u++) lamPx(u, ky + v, u*d > 0 ? 17 : 16); }
    for(let v = -2; v <= 2; v++) for(let u = -2; u <= 2; u++) if(u*u + v*v <= 5) lamPx(u, ky + v, 13);
    for(let v = -6; v <= 6; v++){ const w = 6 - Math.abs(v); lamPx(-w, ky + v, 1); lamPx(w, ky + v, 1); }
    lamLinea(0, ky - 6, 0, ky + 6, 11); lamLinea(-6, ky, 6, ky, 11);
    for(let i = 0; i < 6; i++) lamPx(-d*(1 + i), ky + 7 + i + Math.sin(t*6 + i)*1.2, i % 2 ? 13 : 1);
    /* el que va colgado */
    lamLinea(0, ky + 6, o, -10, 1); lamLinea(o - 2, -10, o + 2, -10, 11);
    lamSpr(CUADROS_ENEM.colgado, Math.round(o), 0, d, 0);
    P[14] = hexRGB('#ffd0a0');
  }
  if(solo) return P;
  lamVolcar(g, x, y, P); }

/* la foto de un enemigo para partirlo en dos al morir */
function fotoEnemigo(e, E){ const P = dibujarEnemigo(null, e, E, typeof J !== 'undefined' ? J.tr : 0, true); const [c, gc] = lienzo(LAM.n, LAM.n);
  lamVolcar(gc, LAM.c, LAM.c, P); return c; }

/* la misma luz de borde para lo que se dibuja con trazos (los jefes): se pinta aparte, se miran los píxeles opacos y oscuros
   que tienen aire arriba o a la izquierda, y se aclaran; el aire pegado lleva el contorno tenue */
const LUZ = {cv:null, g:null, n:0};
function conLuz(g, cx, cy, n, fn, P){
  if(LUZ.n !== n){ const [c, gc] = lienzo(n, n); LUZ.cv = c; LUZ.g = gc; LUZ.n = n; }
  const q = LUZ.g, X = Math.round(cx), Y = Math.round(cy), h = n >> 1; q.clearRect(0, 0, n, n); q.save(); q.translate(h - X, h - Y); fn(q); q.restore(); q.globalAlpha = 1;
  const img = q.getImageData(0, 0, n, n), d = img.data, a = new Uint8Array(n*n); for(let i = 0; i < n*n; i++) a[i] = d[i*4 + 3] > 200 ? 1 : 0;
  const luz = P.contorno, cc = P.contorno;
  for(let y = 0; y < n; y++) for(let x = 0; x < n; x++){ const i = y*n + x, o = i*4;
    if(a[i]){ const L = d[o]*0.3 + d[o + 1]*0.59 + d[o + 2]*0.11; if(L > 70) continue; const k = (y === 0 || !a[i - n]) ? 0.55 : (x === 0 || !a[i - 1]) ? 0.28 : 0; if(!k) continue;
      d[o] += (luz[0] - d[o])*k; d[o + 1] += (luz[1] - d[o + 1])*k; d[o + 2] += (luz[2] - d[o + 2])*k; }
    else if(d[o + 3] < 20 && ((x > 0 && a[i - 1]) || (x < n - 1 && a[i + 1]) || (y > 0 && a[i - n]) || (y < n - 1 && a[i + n]))){ d[o] = cc[0]; d[o + 1] = cc[1]; d[o + 2] = cc[2]; d[o + 3] = 70; } }
  q.putImageData(img, 0, 0); g.drawImage(LUZ.cv, X - h, Y - h); }
