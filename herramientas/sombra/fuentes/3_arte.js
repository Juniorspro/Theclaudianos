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


/* ================================================================ los efectos: cada uno es una paleta entera
   (cielo, sol, montes, torre, siluetas, acento, partículas). El mundo trae el suyo; el jugador puede ponerse otro. */
const EFECTOS = {
  atardecer:{nombre:'ATARDECER', cielo:['#fbe4cc', '#f4c2a6', '#e79f95'], sol:'#fff3e0', montes:['#d7968f', '#b87887'], torre:'#3d2748', borde:'#6b4a7c', luzBorde:'#8a6aa0',
    silueta:'#1b0f22', acento:'#e8384a', part:'sakura', colPart:['#f7a8c4', '#e87aa6', '#fcd4e2'], tint:[1.02, 0.98, 0.98], precio:0},
  noche:    {nombre:'NOCHE', cielo:['#0e1630', '#1c2c56', '#40507e'], sol:'#e8f0ff', luna:true, montes:['#26345e', '#1a2446'], torre:'#0c1022', borde:'#2a3868', luzBorde:'#4a60a0',
    silueta:'#05060e', acento:'#5ae0ff', part:'nieve', colPart:['#ffffff', '#c8d8ff', '#e8f0ff'], tint:[0.95, 1, 1.06], precio:0},
  fuego:    {nombre:'FUEGO', cielo:['#2a0a0e', '#6a1a14', '#e8582a'], sol:'#ffd080', montes:['#4a1410', '#2a0a0a'], torre:'#1a0808', borde:'#5a1a12', luzBorde:'#c8401a',
    silueta:'#0a0404', acento:'#ffb030', part:'brasas', colPart:['#ffd060', '#ff8a2a', '#ff4a1a'], tint:[1.08, 0.98, 0.92], precio:0},
  sakura:   {nombre:'SAKURA', cielo:['#fff0f6', '#ffd0e4', '#f7a6c8'], sol:'#ffffff', montes:['#f09ac0', '#d878a8'], torre:'#5a2448', borde:'#9a4a7a', luzBorde:'#d880b0',
    silueta:'#2a0a20', acento:'#ffffff', part:'sakura', colPart:['#ffffff', '#ffc8e0', '#ff90c0'], tint:[1.04, 0.98, 1.02], precio:400},
  tinta:    {nombre:'TINTA', cielo:['#f4efe2', '#e8e2d2', '#d4cdbb'], sol:'#c8201a', montes:['#b8b2a2', '#948e80'], torre:'#1a1816', borde:'#3a3834', luzBorde:'#5a5650',
    silueta:'#0a0a0a', acento:'#c8201a', part:'tinta', colPart:['#1a1816', '#3a3834', '#5a5650'], tint:[1, 1, 1], precio:700},
  neon:     {nombre:'NEÓN', cielo:['#12042a', '#3a0a5a', '#ff3aa8'], sol:'#ffe060', rayas:true, montes:['#5a1a8a', '#2a0a4a'], torre:'#0a0418', borde:'#3a1a6a', luzBorde:'#5ae8ff',
    silueta:'#000000', acento:'#5ae8ff', part:'chispas', colPart:['#5ae8ff', '#ff5ad8', '#ffe060'], tint:[1.02, 0.96, 1.08], precio:1000},
  otono:    {nombre:'OTOÑO', cielo:['#fce8c0', '#f4c48a', '#e0905a'], sol:'#fff8e0', montes:['#c87a4a', '#a05a3a'], torre:'#3a1e14', borde:'#6a3a22', luzBorde:'#a0602a',
    silueta:'#1a0c06', acento:'#ffcc30', part:'hojas', colPart:['#e86a1a', '#c84a10', '#f0a030'], tint:[1.04, 1, 0.94], precio:1400}
};

/* ================================================================ el fondo: se hornea una vez por efecto y alto de pantalla */
const FONDO = {k:null, cielo:null, montes:[]};
function hornearFondo(E, w, h){
  const k = E.nombre + w + 'x' + h; if(FONDO.k === k) return; FONDO.k = k;
  const [c, g] = lienzo(w, h);
  /* el cielo en bandas de 6 px con trama en el borde (degradé de pixel art, no liso) */
  const bandas = 14;
  for(let i = 0; i < bandas; i++){ const t = i/(bandas - 1), col = mezcla(E.cielo, t), y0 = Math.round(h*i/bandas), y1 = Math.round(h*(i + 1)/bandas);
    g.fillStyle = col; g.fillRect(0, y0, w, y1 - y0);
    if(i < bandas - 1){ g.fillStyle = mezcla(E.cielo, (i + 1)/(bandas - 1)); for(let x = 0; x < w; x += 2) g.fillRect(x + (y1 % 2), y1 - 1, 1, 1); } }
  FONDO.cielo = c;
  /* los montes: dos cordones que se repiten a lo ancho, con nieve o faroles según el efecto */
  FONDO.montes = [0, 1].map(k2 => { const alto = Math.round(h*(k2 ? 0.34 : 0.46)), [m, gm] = lienzo(w*2, alto), r = mulberry(k2*77 + 5);
    gm.fillStyle = E.montes[k2];
    const picos = []; for(let x = -40; x < w*2 + 40; x += 30 + r()*50) picos.push([x, alto*(0.15 + r()*0.45)*(k2 ? 1.1 : 0.8)]);
    for(let x = 0; x < w*2; x++){ let y = alto; for(const [px2, py] of picos){ const d = Math.abs(x - px2), yy = py + d*(k2 ? 1.1 : 0.75); if(yy < y) y = yy; } gm.fillRect(x, Math.round(y), 1, alto - Math.round(y));
      if(E.part === 'nieve' && !k2){ gm.fillStyle = '#c8d4f0'; for(const [px2, py] of picos){ const d = Math.abs(x - px2); if(d < 8 && Math.round(py + d*0.75) === Math.round(y)) gm.fillRect(x, Math.round(y), 1, 3); } gm.fillStyle = E.montes[k2]; } }
    /* un torii y una pagoda chiquitos en el cordón de adelante */
    if(k2){ gm.fillStyle = tono(E.montes[1], 0.8); const tx = Math.round(w*0.6), ty = Math.round(alto*0.45);
      gm.fillRect(tx, ty, 18, 2); gm.fillRect(tx + 1, ty + 4, 16, 1); gm.fillRect(tx + 3, ty + 2, 2, 12); gm.fillRect(tx + 13, ty + 2, 2, 12);
      const px3 = Math.round(w*1.4), py3 = Math.round(alto*0.35); for(let i = 0; i < 4; i++){ gm.fillRect(px3 - 8 + i*2, py3 + i*6, 16 - i*4 + 8, 2); gm.fillRect(px3 - 3 + i, py3 + i*6 + 2, 6 - i*2 + 6, 4); } }
    return m; });
}
function mezcla(cols, t){ const n = cols.length - 1, i = Math.min(n - 1, Math.floor(t*n)), k = t*n - i, a = hexRGB(cols[i]), b = hexRGB(cols[i + 1]);
  return 'rgb(' + a.map((v, j) => Math.round(v + (b[j] - v)*k)).join(',') + ')'; }

/* ================================================================ el ninja: silueta hecha de huesos, dibujada cada cuadro
   Las poses están mirando a la derecha con el piso abajo; se giran según la superficie y se espejan con dir. */
const POSES = {
  pie:   {cab:[0, -5], cad:[0, 0], mA:[3, -2], mB:[-2, -1], pA:[2, 3], pB:[-2, 3]},                 /* agachado en el piso, listo */
  pared: {cab:[1, -4], cad:[0, 1], mA:[-3, -5], mB:[-3, 1], pA:[-3, 3], pB:[1, 4]},                 /* pegado a la pared (la pared a la izquierda) */
  techo: {cab:[0, 1], cad:[0, 5], mA:[-2, -4], mB:[2, -4], pA:[-2, 8], pB:[2, 7]},                   /* colgado del techo */
  salto: {cab:[1, -5], cad:[0, 1], mA:[4, -6], mB:[-3, 0], pA:[1, 5], pB:[-3, 4]},
  bola:  {cab:[1, -2], cad:[-1, 1], mA:[2, 1], mB:[1, 2], pA:[1, 3], pB:[-2, 2]},                   /* hecho bolita en la voltereta */
  apunta:{cab:[0, -4], cad:[0, 1], mA:[5, -3], mB:[-4, -2], pA:[3, 4], pB:[-3, 4]}
};
function dibujarNinja(g, x, y, pose, dir, giro, E, extra){
  const P = POSES[pose] || POSES.salto, c = Math.cos(giro), s = Math.sin(giro), col = E.silueta;
  const T = p => [x + (p[0]*dir*c - p[1]*s), y + (p[0]*dir*s + p[1]*c)];
  const cab = T(P.cab), cad = T(P.cad), mA = T(P.mA), mB = T(P.mB), pA = T(P.pA), pB = T(P.pB), hom = T([P.cab[0]*0.6 + P.cad[0]*0.4, P.cab[1]*0.6 + P.cad[1]*0.4 + 1]);
  /* la bufanda va atrás de todo */
  if(extra && extra.bufanda) { const b = extra.bufanda; for(let i = 1; i < b.length; i++) linea(g, b[i - 1].x, b[i - 1].y, b[i].x, b[i].y, E.acento === '#ffffff' ? '#e8384a' : extra.colBuf || '#e8384a', i < 3 ? 2 : 1); }
  linea(g, cad[0], cad[1], pA[0], pA[1], col, 2); linea(g, cad[0], cad[1], pB[0], pB[1], col, 2);
  linea(g, hom[0], hom[1], cad[0], cad[1], col, 3);
  linea(g, hom[0], hom[1], mA[0], mA[1], col, 1); linea(g, hom[0], hom[1], mB[0], mB[1], col, 1);
  disco(g, cab[0], cab[1], 2.3, col);
  /* la katana a la espalda y el ojo */
  const esp = T([-2, -3]), esp2 = T([-6, 2]); linea(g, esp[0], esp[1], esp2[0], esp2[1], extra && extra.colHoja || tono(col, 2.2), 1);
  const ojo = T([1.6, -0.4 + P.cab[1]]); px(g, ojo[0], ojo[1], extra && extra.colOjo || '#ffffff');
  if(extra && extra.accesorio === 'orejas'){ const o1 = T([P.cab[0] - 1, P.cab[1] - 3]), o2 = T([P.cab[0] + 1.5, P.cab[1] - 3]); px(g, o1[0], o1[1], col); px(g, o2[0], o2[1], col); }
  if(extra && extra.accesorio === 'cuernos'){ const o1 = T([P.cab[0] - 1.5, P.cab[1] - 3]), o2 = T([P.cab[0] + 2, P.cab[1] - 3]); px(g, o1[0], o1[1], '#e8384a'); px(g, o2[0], o2[1], '#e8384a'); }
  if(extra && extra.accesorio === 'sombrero'){ const a = T([P.cab[0] - 4, P.cab[1] - 1.5]), b = T([P.cab[0] + 4, P.cab[1] - 1.5]), cc = T([P.cab[0], P.cab[1] - 4]); linea(g, a[0], a[1], cc[0], cc[1], col, 1); linea(g, cc[0], cc[1], b[0], b[1], col, 1); linea(g, a[0], a[1], b[0], b[1], col, 1); }
}

/* ================================================================ la patota del castillo, también en silueta */
function dibujarEnemigo(g, e, E, t){
  const x = Math.round(e.x), y = Math.round(e.y), col = E.silueta, d = e.dir || 1;
  if(e.t === 'tirador'){                                                       /* rodilla en tierra, arco o arcabuz */
    disco(g, x, y - 6, 2, col); rect(g, x - 2, y - 4, 4, 5, col); rect(g, x - 3, y + 1, 3, 2, col); rect(g, x + 1, y + 1, 2, 3, col);
    const a = e.apunta || 0; linea(g, x, y - 3, x + Math.cos(a)*7, y - 3 + Math.sin(a)*7, col, 2);
    px(g, x + d, y - 7, e.carga > 0 ? '#ff3a3a' : '#ffd0a0'); }
  else if(e.t === 'samurai'){                                                  /* más grande, kabuto con cuernos y katana */
    const ataca = e.corta > 0, lev = e.carga > 0;
    disco(g, x, y - 9, 2.5, col); rect(g, x - 4, y - 11, 1, 2, col); rect(g, x + 3, y - 11, 1, 2, col); rect(g, x - 3, y - 7, 6, 7, col);
    rect(g, x - 4, y - 6, 8, 2, col); rect(g, x - 3, y, 2, 4, col); rect(g, x + 1, y, 2, 4, col);
    const ang = lev ? -2.2*d : ataca ? 0.4*d : -0.6*d, hx = x + d*3, hy = y - 5; linea(g, hx, hy, hx + Math.sin(ang)*9*d, hy - Math.cos(ang)*9, '#e8ecf4', 1);
    px(g, x + d, y - 9, lev ? '#ff3a3a' : '#ffd0a0'); }
  else if(e.t === 'shuriken'){                                                 /* la kunoichi que tira estrellas */
    disco(g, x, y - 6, 2, col); rect(g, x - 2, y - 4, 4, 5, col); linea(g, x, y + 1, x - 2, y + 4, col, 2); linea(g, x, y + 1, x + 2, y + 4, col, 2);
    rect(g, x - 3, y - 7, 2, 1, E.acento); const m = e.carga > 0 ? -1 : 1; linea(g, x, y - 3, x + d*4, y - 3 - m*3, col, 1); px(g, x + d, y - 7, '#ffd0a0'); }
  else if(e.t === 'cometa'){                                                   /* una cometa con un tipo colgado */
    const bx = x, by = y - 10, o = Math.sin(t*3 + e.fase)*1.5;
    g.fillStyle = E.acento; g.beginPath(); g.moveTo(bx, by - 7); g.lineTo(bx + 6, by); g.lineTo(bx, by + 7); g.lineTo(bx - 6, by); g.fill();
    g.fillStyle = col; g.fillRect(bx - 6, by, 12, 1); g.fillRect(bx, by - 7, 1, 14);
    for(let i = 0; i < 5; i++) px(g, bx - 2 - i*2, by + 7 + Math.sin(t*6 + i)*1.5, col);
    linea(g, bx, by + 6, x + o, y - 3, col, 1); disco(g, x + o, y - 3, 1.8, col); rect(g, x + o - 1, y - 1, 3, 4, col); }
}
