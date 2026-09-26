/* ================================================================ arte por código, visto desde arriba
   Todo mira a +x. Los personajes van por partes (piernas, torso según el arma, cabeza o máscara) que se
   giran por separado al dibujar: las piernas hacia donde caminás, el torso hacia donde apuntás. Girados sin
   suavizado a baja resolución dan el serrucho de los juegos de los ochenta, que es lo que queremos. */
function lienzo(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', {willReadFrequently:true}); g.imageSmoothingEnabled = false; return [c, g]; }
function px(g, x, y, c){ g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
function rect(g, x, y, w, h, c){ g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disco(g, cx, cy, r, c){ g.fillStyle = c; for(let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for(let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if((x - cx)*(x - cx) + (y - cy)*(y - cy) <= r*r) g.fillRect(x, y, 1, 1); }
function elipse(g, cx, cy, rx, ry, c){ g.fillStyle = c; for(let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for(let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++){ const a = (x - cx)/rx, b = (y - cy)/ry; if(a*a + b*b <= 1) g.fillRect(x, y, 1, 1); } }
function linea(g, x0, y0, x1, y1, c, grosor){ const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)*1.5)); g.fillStyle = c; const gr = grosor || 1;
  for(let i = 0; i <= n; i++){ const t = i/n; g.fillRect(Math.round(x0 + (x1 - x0)*t - (gr - 1)/2), Math.round(y0 + (y1 - y0)*t - (gr - 1)/2), gr, gr); } }
/* contorno oscuro de un píxel alrededor de lo pintado: los personajes se leen sobre cualquier piso */
function contorno(c, col){ const g = c.getContext('2d'), w = c.width, h = c.height, d = g.getImageData(0, 0, w, h), a = d.data, o = new Uint8ClampedArray(a);
  const [r0, g0, b0] = hexRGB(col || '#0a0610');
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = (y*w + x)*4; if(a[i + 3] > 40) continue;
    let v = false; for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const X = x + dx, Y = y + dy; if(X >= 0 && Y >= 0 && X < w && Y < h && a[(Y*w + X)*4 + 3] > 40){ v = true; break; } }
    if(v){ o[i] = r0; o[i + 1] = g0; o[i + 2] = b0; o[i + 3] = 255; } }
  g.putImageData(new ImageData(o, w, h), 0, 0); return c; }
function hexRGB(h){ const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function tono(h, k){ const [r, g, b] = hexRGB(h), f = v => Math.round(lim(v*k, 0, 255)).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }

/* ---------- personas ---------- */
const PIEL = ['#e8b894', '#c8906a', '#a06a48', '#f0c8a8'];
const ROPA = {
  pibe:    {torso:'#6a1426', torsoL:'#8a2436', manga:'#e8dcc0', mangaS:'#b8ac90', piel:PIEL[0]},     /* la campera de egresados */
  patota:  {torso:'#e8e4dc', torsoL:'#ffffff', manga:'#dcd8d0', mangaS:'#b0aca4', piel:PIEL[1], camisa:'#1a1a22'},
  guardia: {torso:'#2a2a36', torsoL:'#3e3e4e', manga:'#22222c', mangaS:'#14141a', piel:PIEL[2], camisa:'#c8c8d0'},
  gordo:   {torso:'#e8e4dc', torsoL:'#ffffff', manga:'#dcd8d0', mangaS:'#b0aca4', piel:PIEL[3], camisa:'#a01828', ancho:1.35},
  jefe:    {torso:'#8a1a2a', torsoL:'#b82a3a', manga:'#7a1422', mangaS:'#5a0e18', piel:PIEL[1], camisa:'#f0e0a0', ancho:1.15},
  fiesta:  {torso:'#3a8ad8', torsoL:'#5aaaf0', manga:'#2a6ab0', mangaS:'#1a4a80', piel:PIEL[0], camisa:'#ffd84a'}
};
/* las piernas: dos zapatos que se turnan; el cuadro 0 es quieto */
function hacerPiernas(ropa){
  const cuadros = [];
  for(let i = 0; i < 5; i++){ const [c, g] = lienzo(20, 20), f = i === 0 ? 0 : Math.sin((i - 1)/4*Math.PI*2)*3.2;
    const zap = ropa === 'perro' ? null : '#1a1418', pant = ropa && ROPA[ropa] && ROPA[ropa].pant || '#2a2432';
    for(const [lado, s] of [[-1, 1], [1, -1]]){ const dx = f*s; rect(g, 9 + dx - 1, 10 + lado*2.5 - 1, 3, 2, pant); elipse(g, 10 + dx + 1, 10 + lado*2.5, 2, 1.2, zap); px(g, 11 + dx + 1, 10 + lado*2.5 - 1, '#4a4450'); }
    contorno(c); cuadros.push(c); }
  return cuadros;
}
/* el torso según cómo tenga las manos: 'puno', 'golpe' (brazo estirado), 'uno' (algo en la derecha), 'dos' (arma larga) */
function hacerTorso(ropa, pose){
  const R2 = ROPA[ropa], a = R2.ancho || 1, [c, g] = lienzo(24, 24), cx = 11, cy = 12;
  const manoD = pose === 'golpe' ? [cx + 9, cy + 1.5] : pose === 'dos' ? [cx + 7, cy + 1] : pose === 'uno' ? [cx + 6, cy + 3.5] : [cx + 4, cy + 4];
  const manoI = pose === 'dos' ? [cx + 4, cy - 0.5] : pose === 'uno' ? [cx + 2, cy - 5] : [cx + 4, cy - 4];
  /* los brazos, del hombro a la mano */
  linea(g, cx, cy + 5*a, manoD[0], manoD[1], R2.manga, 3); linea(g, cx, cy - 5*a, manoI[0], manoI[1], R2.manga, 3);
  linea(g, cx, cy + 5.5*a, manoD[0], manoD[1] + 1, R2.mangaS, 1); linea(g, cx, cy - 5.5*a, manoI[0], manoI[1] + 1, R2.mangaS, 1);
  disco(g, manoD[0], manoD[1], 1.4, R2.piel); disco(g, manoI[0], manoI[1], 1.4, R2.piel);
  /* los hombros */
  elipse(g, cx, cy, 3.6*a, 6.2*a, R2.torso); elipse(g, cx - 0.6, cy - 1, 2.6*a, 5*a, R2.torsoL); elipse(g, cx - 1.2, cy - 1.5, 1.6*a, 3.5*a, R2.torso);
  for(let y = -6; y <= 6; y++) px(g, cx - 3.2*a, cy + y*a, tono(R2.torso, 0.7));
  if(R2.camisa) { rect(g, cx + 2*a, cy - 1, 1.5, 2, R2.camisa); }
  if(ropa === 'pibe'){ px(g, cx - 2, cy - 1, '#e8dcc0'); px(g, cx - 2, cy + 1, '#e8dcc0'); px(g, cx - 3, cy, '#e8dcc0'); }   /* el 89 de la espalda, apenas */
  contorno(c); return c;
}
/* cabezas: pelo de los enemigos y máscaras de animales del pibe (vistas desde arriba, mirando a +x) */
const MASCARAS = ['carpincho', 'condor', 'yaguarete', 'hornero', 'mulita', 'vizcacha'];
function hacerCabeza(tipo){
  const [c, g] = lienzo(14, 14), cx = 7, cy = 7;
  if(tipo === 'carpincho'){ elipse(g, cx, cy, 4, 3.6, '#8a5a34'); elipse(g, cx - 0.5, cy - 0.5, 3, 2.5, '#a2703e'); elipse(g, cx + 3.2, cy, 1.8, 2.4, '#6a4424'); px(g, cx + 4.5, cy - 1, '#1a1010'); px(g, cx + 4.5, cy + 1, '#1a1010');
    px(g, cx + 1.5, cy - 2.5, '#101010'); px(g, cx + 1.5, cy + 2.5, '#101010'); rect(g, cx - 3, cy - 4, 2, 1, '#5a3a20'); rect(g, cx - 3, cy + 3, 2, 1, '#5a3a20'); }
  else if(tipo === 'condor'){ disco(g, cx, cy, 5, '#f4f0ea'); disco(g, cx + 0.5, cy, 3.5, '#2a2a30'); elipse(g, cx + 4, cy, 2, 1, '#d8c890'); px(g, cx + 5.5, cy, '#8a7a50'); rect(g, cx - 1, cy - 1, 2, 2, '#5a2a2a');
    px(g, cx + 2, cy - 2, '#ff3a3a'); px(g, cx + 2, cy + 2, '#ff3a3a'); }
  else if(tipo === 'yaguarete'){ elipse(g, cx, cy, 4, 3.8, '#e8a030'); elipse(g, cx + 3, cy, 1.6, 2, '#f4e0b0'); for(const [x, y] of [[-2, -2], [0, 2], [-3, 1], [1, -2.5], [-1, 0]]) px(g, cx + x, cy + y, '#1a1008');
    rect(g, cx - 2, cy - 4.5, 2, 1, '#c8801a'); rect(g, cx - 2, cy + 3.5, 2, 1, '#c8801a'); px(g, cx + 2, cy - 1.5, '#40c040'); px(g, cx + 2, cy + 1.5, '#40c040'); px(g, cx + 4.5, cy, '#e87a90'); }
  else if(tipo === 'hornero'){ elipse(g, cx, cy, 3.8, 3.4, '#b86a30'); elipse(g, cx - 1, cy, 2.5, 2.2, '#d88a48'); linea(g, cx + 3, cy, cx + 6, cy, '#3a2818', 1); px(g, cx + 1.5, cy - 2, '#ffffff'); px(g, cx + 1.5, cy + 2, '#ffffff'); px(g, cx + 2, cy - 2, '#101010'); px(g, cx + 2, cy + 2, '#101010'); }
  else if(tipo === 'mulita'){ elipse(g, cx, cy, 4, 3.4, '#8a8478'); for(let x = -3; x <= 2; x += 2) rect(g, cx + x, cy - 3, 1, 6, '#5a564e'); elipse(g, cx + 4, cy, 2, 1, '#c8b8a0'); px(g, cx + 5.5, cy, '#e8a0a0'); }
  else if(tipo === 'vizcacha'){ elipse(g, cx, cy, 3.8, 3.4, '#9a9488'); rect(g, cx - 1, cy - 3, 5, 1, '#1a1a1a'); rect(g, cx - 1, cy + 2, 5, 1, '#1a1a1a'); rect(g, cx, cy - 1, 4, 2, '#f4f0ea');
    rect(g, cx - 4, cy - 5, 3, 2, '#7a7468'); rect(g, cx - 4, cy + 3, 3, 2, '#7a7468'); px(g, cx + 3.5, cy, '#3a2a2a'); }
  else { const piel = tipo === 'gordo' ? PIEL[3] : PIEL[1], pelo = tipo === 'rubio' ? '#e8c860' : tipo === 'pelado' ? piel : tipo === 'perro' ? '#6a4a2a' : '#1a1418';
    disco(g, cx, cy, 3.5, piel); elipse(g, cx - 1, cy, 3.2, 3.4, pelo); if(tipo !== 'pelado'){ rect(g, cx - 3, cy - 1, 1, 2, tono(pelo, 1.4)); }
    px(g, cx + 3.2, cy - 1.5, piel); px(g, cx + 3.2, cy + 1.5, piel); if(tipo === 'jefe'){ rect(g, cx - 3, cy - 3.5, 6, 7, '#101010'); rect(g, cx + 1, cy - 4, 2, 8, '#101010'); rect(g, cx - 2, cy - 1, 2, 2, '#b8a060'); } }
  contorno(c); return c;
}
/* armas: en la mano y en el piso son la misma. El agarre en el origen del lienzo + (2, h/2), el caño hacia +x */
const ARMAS = {
  bate:    {melee:true, alcance:15, cad:0.42, arco:1.9, largo:14, sonido:'bate', nombre:'BATE'},
  cano:    {melee:true, alcance:14, cad:0.45, arco:1.8, largo:13, sonido:'cano', nombre:'CAÑO'},
  cuchillo:{melee:true, alcance:11, cad:0.28, arco:1.0, largo:7, sonido:'cuchillo', nombre:'CUCHILLO', corta:true},
  katana:  {melee:true, alcance:18, cad:0.38, arco:2.2, largo:17, sonido:'katana', nombre:'KATANA', corta:true},
  pistola: {balas:9, cad:0.3, dispersion:0.03, perd:1, largo:7, sonido:'pistola', ruido:260, nombre:'PISTOLA'},
  silenciada:{balas:12, cad:0.34, dispersion:0.03, perd:1, largo:9, sonido:'silenciada', ruido:40, nombre:'SILENCIADA'},
  uzi:     {balas:30, cad:0.08, dispersion:0.12, perd:1, largo:9, sonido:'uzi', ruido:280, nombre:'UZI', auto:true},
  escopeta:{balas:6, cad:0.75, dispersion:0.3, perd:7, largo:13, sonido:'escopeta', ruido:320, nombre:'ESCOPETA'},
  fusil:   {balas:24, cad:0.13, dispersion:0.05, perd:1, largo:15, sonido:'fusil', ruido:320, nombre:'FUSIL', auto:true}
};
function hacerArma(k){
  const A = ARMAS[k], [c, g] = lienzo(A.largo + 4, 8), y = 4;
  if(k === 'bate'){ for(let x = 2; x < 16; x++) rect(g, x, y - (x > 7 ? 1 : 0), 1, x > 7 ? 2 + (x > 12 ? 1 : 0) : 1, x < 5 ? '#3a2410' : x % 3 ? '#c89048' : '#a87030'); }
  else if(k === 'cano'){ rect(g, 2, y - 1, 13, 2, '#8a8e98'); rect(g, 2, y - 1, 13, 1, '#c8ccd8'); rect(g, 13, y - 2, 2, 4, '#6a6e78'); }
  else if(k === 'cuchillo'){ rect(g, 2, y, 3, 1, '#2a1a10'); rect(g, 5, y - 1, 4, 2, '#d8dce8'); px(g, 9, y, '#ffffff'); }
  else if(k === 'katana'){ rect(g, 2, y, 4, 1, '#2a1a2a'); rect(g, 6, y - 1, 1, 3, '#d8b040'); rect(g, 7, y, 12, 1, '#e8ecf4'); rect(g, 7, y + 1, 11, 1, '#9aa0b0'); }
  else if(k === 'pistola' || k === 'silenciada'){ rect(g, 2, y, 6, 2, '#2a2a30'); rect(g, 2, y + 1, 2, 2, '#1a1a1e'); if(k === 'silenciada') rect(g, 8, y, 4, 2, '#4a4a54'); }
  else if(k === 'uzi'){ rect(g, 2, y - 1, 8, 3, '#2a2a30'); rect(g, 4, y + 2, 2, 2, '#1a1a1e'); rect(g, 10, y, 2, 1, '#4a4a54'); }
  else if(k === 'escopeta'){ rect(g, 2, y, 5, 2, '#6a3a1a'); rect(g, 7, y, 9, 2, '#3a3a42'); rect(g, 7, y, 9, 1, '#5a5a66'); }
  else if(k === 'fusil'){ rect(g, 2, y, 5, 2, '#5a3a1a'); rect(g, 7, y - 1, 7, 3, '#2a2a30'); rect(g, 14, y, 5, 1, '#3a3a44'); rect(g, 9, y + 2, 2, 2, '#1a1a1e'); }
  contorno(c); return c;
}
/* el perro: cuerpo largo, cabeza adelante, cola; cuatro cuadros de corrida */
function hacerPerro(){
  const cuadros = [];
  for(let i = 0; i < 4; i++){ const [c, g] = lienzo(24, 16), f = Math.sin(i/4*Math.PI*2)*2;
    for(const [x, y, s] of [[6, 4, 1], [6, 12, -1], [15, 4, -1], [15, 12, 1]]) rect(g, x + f*s, y + (y < 8 ? -1 : 0), 3, 2, '#3a2818');
    elipse(g, 11, 8, 6, 3.4, '#6a4a2a'); elipse(g, 10, 7, 4, 2, '#8a6a42'); elipse(g, 18, 8, 3, 2.6, '#6a4a2a'); rect(g, 20, 7, 3, 2, '#4a3220'); px(g, 22, 7, '#101010');
    rect(g, 16, 5, 2, 1, '#3a2818'); rect(g, 16, 10, 2, 1, '#3a2818'); linea(g, 5, 8, 2, 8 + f, '#6a4a2a', 1);
    contorno(c); cuadros.push(c); }
  return cuadros;
}
/* un cuerpo tirado: se arma una vez por muerto, con los brazos y piernas como cayeron */
function hacerCadaver(ropa, cabeza, tipo, semilla){
  const r = mulberry(semilla), R2 = ropa === 'perro' ? null : ROPA[ropa], [c, g] = lienzo(32, 26), cx = 15, cy = 13;
  if(ropa === 'perro'){ elipse(g, cx, cy, 7, 3.6, '#6a4a2a'); elipse(g, cx + 7, cy + 1, 3, 2.6, '#6a4a2a'); for(let i = 0; i < 4; i++) linea(g, cx - 4 + i*3, cy + 2, cx - 5 + i*3 + r()*3, cy + 6 + r()*2, '#3a2818', 2); contorno(c); return c; }
  const a = R2.ancho || 1, pier = (lado) => { const ang = lado*(0.3 + r()*0.6); linea(g, cx - 3, cy + lado*2, cx - 3 - Math.cos(ang)*8, cy + lado*2 + Math.sin(ang)*6, '#2a2432', 3); };
  pier(-1); pier(1);
  for(const lado of [-1, 1]){ const ang = lado*(0.5 + r()*1.8), x1 = cx + 1 + Math.cos(ang)*8, y1 = cy + lado*4*a + Math.sin(ang)*6*lado; linea(g, cx + 1, cy + lado*4*a, x1, y1, R2.manga, 3); disco(g, x1, y1, 1.3, R2.piel); }
  elipse(g, cx, cy, 4.5*a, 6*a, R2.torso); elipse(g, cx - 1, cy - 1, 3*a, 4.5*a, R2.torsoL);
  if(tipo !== 'corte') { const h = hacerCabeza(cabeza); g.drawImage(h, cx + 3 - 7, cy - 7 + (r() - 0.5)*2); }
  if(tipo === 'corte'){ g.clearRect(cx - 1, 0, 2, 26); }                                                          /* partido al medio */
  contorno(c); return c;
}
/* ---------- pisos: patrones de 16×16 que se repiten ---------- */
function patronPiso(tipo, sem){
  const r = mulberry(sem || 5), [c, g] = lienzo(16, 16);
  const T = (x, y, w, h, col) => rect(g, x, y, w, h, col);
  if(tipo === 'alfombra'){ T(0, 0, 16, 16, '#8a1a3a'); for(let i = 0; i < 40; i++) px(g, r()*16, r()*16, r() < .5 ? '#9a2448' : '#7a1432'); T(0, 0, 16, 1, '#a02a50'); }
  else if(tipo === 'alfombraV'){ T(0, 0, 16, 16, '#1a5a5a'); for(let i = 0; i < 40; i++) px(g, r()*16, r()*16, r() < .5 ? '#226a6a' : '#144a4a'); }
  else if(tipo === 'madera'){ for(let y = 0; y < 16; y += 4){ const k = 0.9 + r()*0.2; T(0, y, 16, 4, tono('#8a5a30', k)); T(0, y + 3, 16, 1, '#5a3418'); T((y*5) % 16, y, 1, 3, '#5a3418'); } }
  else if(tipo === 'damero'){ for(let y = 0; y < 16; y += 8) for(let x = 0; x < 16; x += 8) T(x, y, 8, 8, (x + y) % 16 ? '#e8e4dc' : '#1a1a22'); }
  else if(tipo === 'banio'){ for(let y = 0; y < 16; y += 4) for(let x = 0; x < 16; x += 4){ T(x, y, 4, 4, '#6ab8d8'); T(x, y, 4, 1, '#8ad0e8'); T(x + 3, y, 1, 4, '#3a88a8'); } }
  else if(tipo === 'cocina'){ for(let y = 0; y < 16; y += 8) for(let x = 0; x < 16; x += 8) T(x, y, 8, 8, (x + y) % 16 ? '#f0d048' : '#f4f0e0'); }
  else if(tipo === 'cemento'){ T(0, 0, 16, 16, '#5a5a62'); for(let i = 0; i < 50; i++) px(g, r()*16, r()*16, r() < .5 ? '#66666e' : '#4e4e56'); T(0, 15, 16, 1, '#4a4a52'); }
  else if(tipo === 'baldosa'){ for(let y = 0; y < 16; y += 8) for(let x = 0; x < 16; x += 8){ T(x, y, 8, 8, '#a8646a'); T(x, y, 8, 1, '#c07a80'); T(x + 7, y, 1, 8, '#7a4046'); } }
  else if(tipo === 'pista'){ for(let y = 0; y < 16; y += 8) for(let x = 0; x < 16; x += 8) T(x, y, 8, 8, ['#ff3aa8', '#3ad8ff', '#ffd84a', '#a84aff'][((x + y)/8 + (sem || 0)) % 4]); }
  else if(tipo === 'marmol'){ T(0, 0, 16, 16, '#e0dce8'); for(let i = 0; i < 6; i++) linea(g, r()*16, r()*16, r()*16, r()*16, '#b8b4c8', 1); T(0, 0, 16, 1, '#f4f0fa'); }
  else if(tipo === 'asfalto'){ T(0, 0, 16, 16, '#2a2630'); for(let i = 0; i < 30; i++) px(g, r()*16, r()*16, r() < .5 ? '#34303c' : '#221e28'); }
  else if(tipo === 'vereda'){ for(let y = 0; y < 16; y += 8) for(let x = 0; x < 16; x += 8){ T(x, y, 8, 8, '#8a8290'); T(x, y, 8, 1, '#a09aa8'); T(x + 7, y, 1, 8, '#6a6470'); } }
  else if(tipo === 'pasto'){ T(0, 0, 16, 16, '#1e5a2a'); for(let i = 0; i < 40; i++) px(g, r()*16, r()*16, r() < .5 ? '#2a6a34' : '#164a22'); }
  else { T(0, 0, 16, 16, '#3a2a4a'); }
  return c;
}
/* ---------- muebles: cada uno con su tamaño en píxeles y si choca ---------- */
const MUEBLES = {
  sillon:  {w:24, h:12, choca:true},  sofa:  {w:36, h:12, choca:true},   mesa:  {w:20, h:14, choca:true},  mesaR: {w:16, h:16, choca:true},
  cama:    {w:20, h:30, choca:true},  escr:  {w:26, h:12, choca:true},   inod:  {w:8, h:10, choca:true},   banera:{w:26, h:12, choca:true},
  mesada:  {w:32, h:10, choca:true},  hela:  {w:12, h:12, choca:true},   planta:{w:10, h:10, choca:true},  tele:  {w:14, h:8, choca:true},
  pool:    {w:34, h:20, choca:true},  barra: {w:40, h:10, choca:true},   cajon: {w:12, h:12, choca:true},  tacho: {w:10, h:10, choca:true},
  estante: {w:32, h:8, choca:true},   silla: {w:7, h:7, choca:false},    alfom: {w:30, h:20, choca:false}, parlante:{w:12, h:12, choca:true}
};
function hacerMueble(k, sem){
  const M = MUEBLES[k], r = mulberry(sem || 3), [c, g] = lienzo(M.w, M.h), w = M.w, h = M.h, T = (x, y, a, b, col) => rect(g, x, y, a, b, col);
  if(k === 'sillon' || k === 'sofa'){ const col = ['#c8b890', '#6a3a8a', '#3a6a5a'][Math.floor(r()*3)]; T(0, 0, w, h, tono(col, 0.7)); T(2, 3, w - 4, h - 4, col); T(2, 3, w - 4, 1, tono(col, 1.2));
    for(let x = 2 + (w - 4)/(k === 'sofa' ? 3 : 2); x < w - 3; x += (w - 4)/(k === 'sofa' ? 3 : 2)) T(x, 3, 1, h - 4, tono(col, 0.8)); }
  else if(k === 'mesa' || k === 'mesaR'){ const col = k === 'mesa' ? '#7aa8b8' : '#8a5a30'; T(0, 0, w, h, tono(col, 0.7)); T(1, 1, w - 2, h - 2, col); T(1, 1, w - 2, 1, tono(col, 1.3)); if(k === 'mesa'){ for(let i = 0; i < 4; i++) linea(g, 3 + i*4, 3, 5 + i*4, h - 3, tono(col, 1.2), 1); } else { disco(g, w/2, h/2, 3, '#e8e4dc'); } }
  else if(k === 'cama'){ T(0, 0, w, h, '#4a3020'); T(1, 1, w - 2, h - 2, '#e8e0f0'); T(2, 2, w - 4, 7, '#f4f0fa'); T(1, 10, w - 2, h - 11, '#8a3a6a'); for(let y = 12; y < h - 2; y += 3) T(2, y, w - 4, 1, '#9a4a7a'); }
  else if(k === 'escr'){ T(0, 0, w, h, '#5a3a20'); T(1, 1, w - 2, h - 2, '#7a5030'); T(4, 2, 8, 6, '#2a2a30'); T(5, 3, 6, 4, '#3ad8a0'); T(15, 3, 6, 3, '#e8e4dc'); }
  else if(k === 'inod'){ T(1, 0, 6, 3, '#e8e8f0'); elipse(g, 4, 6, 3, 3.5, '#f4f4fa'); elipse(g, 4, 6.5, 1.8, 2.2, '#8ad0e8'); }
  else if(k === 'banera'){ T(0, 0, w, h, '#e8e8f0'); T(2, 2, w - 4, h - 4, '#8ad0e8'); T(2, 2, w - 4, 1, '#b0e0f0'); px(g, 3, 5, '#c8c8d0'); }
  else if(k === 'mesada'){ T(0, 0, w, h, '#c8c0b0'); T(0, 0, w, 2, '#e8e0d0'); disco(g, 7, 5, 2.5, '#2a2a30'); disco(g, 14, 5, 2.5, '#2a2a30'); T(20, 2, 9, 6, '#8a8e98'); T(21, 3, 7, 4, '#a8c8d8'); }
  else if(k === 'hela'){ T(0, 0, w, h, '#e8e8f0'); T(0, 0, w, 2, '#ffffff'); T(1, 6, w - 2, 1, '#b8b8c8'); }
  else if(k === 'planta'){ disco(g, 5, 5, 3.5, '#6a3a1a'); for(let i = 0; i < 7; i++){ const a = i/7*Math.PI*2; linea(g, 5, 5, 5 + Math.cos(a)*4.5, 5 + Math.sin(a)*4.5, i % 2 ? '#2a8a3a' : '#3aaa4a', 2); } }
  else if(k === 'tele'){ T(0, 0, w, h, '#2a2a30'); T(1, 1, w - 2, h - 3, '#3a3a44'); T(2, 6, w - 4, 1, '#6ae8ff'); }
  else if(k === 'pool'){ T(0, 0, w, h, '#5a3418'); T(2, 2, w - 4, h - 4, '#1a7a3a'); for(const [x, y] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3], [w/2, 2], [w/2, h - 3]]) px(g, x, y, '#0a0a0a'); disco(g, 10, 9, 1, '#f4f0ea'); disco(g, 24, 10, 1, '#e83a3a'); disco(g, 26, 8, 1, '#3a8ae8'); }
  else if(k === 'barra'){ T(0, 0, w, h, '#3a1a2a'); T(0, 0, w, 3, '#8a2a5a'); for(let x = 3; x < w - 2; x += 6){ T(x, 5, 2, 3, ['#40e8a0', '#e8c040', '#e84040'][x % 3]); } }
  else if(k === 'cajon'){ T(0, 0, w, h, '#8a6a3a'); T(1, 1, w - 2, h - 2, '#a8844a'); linea(g, 1, 1, w - 2, h - 2, '#6a4a22', 1); linea(g, w - 2, 1, 1, h - 2, '#6a4a22', 1); }
  else if(k === 'tacho'){ disco(g, 5, 5, 4.5, '#3a5a8a'); disco(g, 5, 5, 3.5, '#4a6aa0'); disco(g, 4, 4, 1, '#8aaad8'); }
  else if(k === 'estante'){ T(0, 0, w, h, '#4a2e18'); for(let x = 1; x < w - 2; x += 3) T(x, 1, 2, h - 2, ['#c83a3a', '#3a8ac8', '#e8c040', '#40a060'][Math.floor(r()*4)]); }
  else if(k === 'silla'){ T(0, 0, w, h, '#5a3418'); T(1, 1, w - 2, h - 2, '#7a4a28'); }
  else if(k === 'alfom'){ T(0, 0, w, h, '#a8843a'); T(2, 2, w - 4, h - 4, '#8a2a3a'); T(4, 4, w - 8, h - 8, '#c8a040'); T(6, 6, w - 12, h - 12, '#8a2a3a'); return c; }
  else if(k === 'parlante'){ T(0, 0, w, h, '#1a1a1e'); disco(g, w/2, h/2, 4, '#3a3a44'); disco(g, w/2, h/2, 1.5, '#5a5a66'); }
  contorno(c); return c;
}
/* el auto: un Falcon de arriba, bordó, con el techo y los vidrios */
function hacerAuto(){
  const [c, g] = lienzo(40, 20); rect(g, 1, 2, 38, 16, '#5a1020'); rect(g, 2, 3, 36, 14, '#8a1a30'); rect(g, 2, 3, 36, 2, '#b02a44');
  rect(g, 12, 4, 16, 12, '#6a1424'); rect(g, 10, 4, 3, 12, '#3a5a7a'); rect(g, 27, 4, 3, 12, '#2a4a6a'); rect(g, 13, 5, 14, 10, '#7a1a2a');
  rect(g, 37, 4, 2, 3, '#fff0a0'); rect(g, 37, 13, 2, 3, '#fff0a0'); rect(g, 1, 4, 1, 3, '#ff3030'); rect(g, 1, 13, 1, 3, '#ff3030');
  for(const [x, y] of [[6, 1], [30, 1], [6, 17], [30, 17]]) rect(g, x, y, 5, 2, '#141418');
  contorno(c); return c;
}
/* ---------- la sangre y la censura ---------- */
const COL_SANGRE = ['#a0101a', '#7a0a12', '#c01a24'];
const COL_CENSURA = ['#ff5ad8', '#5ad8ff', '#ffd84a', '#8aff5a'];
/* todas las hojas de dibujos, una sola vez */
const ARTE = {};
function prepararArte(){
  ARTE.piernas = {}; for(const k of ['pibe', 'patota', 'guardia', 'gordo', 'jefe', 'fiesta']) ARTE.piernas[k] = hacerPiernas(k);
  ARTE.torso = {}; for(const k in ROPA){ ARTE.torso[k] = {}; for(const p of ['puno', 'golpe', 'uno', 'dos']) ARTE.torso[k][p] = hacerTorso(k, p); }
  ARTE.cabeza = {}; for(const k of MASCARAS.concat(['pelo', 'rubio', 'pelado', 'gordo', 'jefe'])) ARTE.cabeza[k] = hacerCabeza(k);
  ARTE.arma = {}; for(const k in ARMAS) ARTE.arma[k] = hacerArma(k);
  ARTE.perro = hacerPerro(); ARTE.auto = hacerAuto();
}
