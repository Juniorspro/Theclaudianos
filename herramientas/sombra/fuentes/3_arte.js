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

/* ================================================================ las capas de atrás, que se repiten para arriba (así la torre nunca queda vacía)
   lejos: nubes, pagodas y torii flotando (0,15 de la cámara); medio: bambú, pinos o murallas del castillo (0,45). */
const CAPAS = {k:null, lejos:null, medio:null};
const MEDIO_ALTO = 512, LEJOS_ALTO = 720;
function hornearCapas(E, mundo){
  const k = E.nombre + mundo; if(CAPAS.k === k) return; CAPAS.k = k;
  const r = mulberry(mundo.length*31 + 7), c1 = E.montes[1], c0 = E.montes[0];
  /* lejos */
  const [L, gl] = lienzo(ANCHO, LEJOS_ALTO);
  for(let i = 0; i < 9; i++){ const y = Math.floor(r()*LEJOS_ALTO), x = Math.floor(r()*ANCHO) - 30, w = 40 + Math.floor(r()*60); gl.fillStyle = 'rgba(255,255,255,0.13)';
    gl.fillRect(x, y, w, 4); gl.fillRect(x + 6, y - 3, w - 18, 3); gl.fillRect(x + 14, y - 5, w - 34, 2); gl.fillStyle = 'rgba(255,255,255,0.07)'; gl.fillRect(x + 4, y + 4, w - 6, 2); }
  for(let i = 0; i < 4; i++){ const y = 80 + i*170 + Math.floor(r()*60), x = 20 + Math.floor(r()*120), s = 0.6 + r()*0.5; gl.fillStyle = tono(c0, 0.95);
    if(i % 2 === 0){ /* una pagoda sobre una roca que flota */
      elipse(gl, x, y + 16*s, 14*s, 5*s, tono(c0, 0.9)); for(let p = 0; p < 4; p++){ const ww = (18 - p*3)*s, yy = y + 12*s - p*7*s; gl.fillStyle = tono(c0, 0.85); gl.fillRect(Math.round(x - ww), Math.round(yy), Math.round(ww*2), Math.max(1, Math.round(2*s))); gl.fillRect(Math.round(x - ww + 3*s), Math.round(yy - 4*s), Math.round(ww*2 - 6*s), Math.round(4*s)); }
      gl.fillRect(Math.round(x), Math.round(y - 20*s), 1, Math.round(6*s)); }
    else { /* un torii perdido entre nubes */ gl.fillStyle = tono(c0, 0.85); gl.fillRect(Math.round(x - 12*s), y, Math.round(24*s), 2); gl.fillRect(Math.round(x - 10*s), y + 4, Math.round(20*s), 1); gl.fillRect(Math.round(x - 8*s), y + 2, 2, Math.round(14*s)); gl.fillRect(Math.round(x + 7*s), y + 2, 2, Math.round(14*s)); } }
  CAPAS.lejos = L;
  /* medio */
  const base = mundo === 'bambu' ? mezcla([c1, E.torre], 0.45) : c1, [M, gm] = lienzo(ANCHO, MEDIO_ALTO), osc = tono(base, 0.8), cla = tono(base, 1.18);
  if(mundo === 'montana'){
    for(let i = 0; i < 7; i++){ const x = 8 + i*25 + Math.floor(r()*10); for(let yb = Math.floor(r()*100); yb < MEDIO_ALTO + 80; yb += 90 + Math.floor(r()*60)){ const hh = 40 + Math.floor(r()*30);
      gm.fillStyle = osc; gm.fillRect(x - 1, yb, 3, 12);
      for(let p = 0; p < 4; p++){ const w = 11 - p*2.5, y0 = yb - p*9; for(let k = 0; k < 10; k++){ gm.fillStyle = k < 2 ? '#dde6ff' : (k % 3 ? osc : c1); gm.fillRect(Math.round(x - w*k/10), y0 - 10 + k, Math.max(1, Math.round(w*2*k/10)), 1); } } } }
    for(let i = 0; i < 40; i++){ gm.fillStyle = 'rgba(255,255,255,0.5)'; gm.fillRect(Math.floor(r()*ANCHO), Math.floor(r()*MEDIO_ALTO), 1, 1); }
  } else if(mundo === 'castillo'){
    for(let yb = 40; yb < MEDIO_ALTO; yb += 128){ const x = 20 + Math.floor(r()*100), w = 40 + Math.floor(r()*30);
      for(let p = 0; p < 3; p++){ const ww = w - p*10, y0 = yb + p*26; gm.fillStyle = osc; gm.fillRect(x - ww/2, y0, ww, 22);
        gm.fillStyle = c1; for(let k = 0; k < 5; k++) gm.fillRect(x - ww/2 - 6 + k, y0 - 2 + (k > 2 ? 0 : 2 - k), ww + 12 - k*2, 1);
        for(let v = 0; v < ww/9 - 1; v++){ gm.fillStyle = (v + p) % 3 ? '#ff9a3a' : '#ffd070'; gm.fillRect(Math.round(x - ww/2 + 5 + v*9), y0 + 8, 3, 5); } } }
    for(let i = 0; i < 12; i++){ const x = Math.floor(r()*ANCHO), y = Math.floor(r()*MEDIO_ALTO); gm.fillStyle = osc; gm.fillRect(x, y, 1, 14); gm.fillStyle = E.acento; gm.fillRect(x + 1, y, 4, 6); }
  } else {
    /* bambú: cañas de distinto grueso, con nudos y hojas en diagonal */
    for(let i = 0; i < 9; i++){ const x = 4 + i*20 + Math.floor(r()*8), w = 2 + Math.floor(r()*3), col = i % 2 ? osc : base;
      gm.fillStyle = col; gm.fillRect(x, 0, w, MEDIO_ALTO); gm.fillStyle = cla; gm.fillRect(x, 0, 1, MEDIO_ALTO);
      for(let y = Math.floor(r()*20); y < MEDIO_ALTO; y += 22 + Math.floor(r()*10)){ gm.fillStyle = tono(col, 0.7); gm.fillRect(x - 1, y, w + 2, 1);
        if(r() < 0.28){ const lado = r() < 0.5 ? -1 : 1; for(let h = 0; h < 3; h++){ const hx = x + (lado > 0 ? w : 0), hy = y + h*3; for(let k = 0; k < 7 - h; k++){ gm.fillStyle = k < 2 ? cla : col; gm.fillRect(hx + lado*k, hy + Math.round(k*0.6) - 1, 1, 2); } } } } }
  }
  CAPAS.medio = M;
}

/* ================================================================ adornos de la torre (se hornean con los bloques) */
/* lo que crece arriba de cada piedra según el mundo */
function adornoArriba(g, x, y, h, mundo, E){
  if(mundo === 'montana'){ g.fillStyle = '#e8eeff'; g.fillRect(x, y, 8, 2); g.fillStyle = '#b8c8f0'; g.fillRect(x, y + 2, 8, 1); if(h & 1) g.fillRect(x + (h & 7), y + 3, 1, 1 + (h & 1)); if(h % 5 === 0){ g.fillStyle = '#ffffff'; g.fillRect(x + 2, y - 1, 3, 1); } return; }
  if(mundo === 'castillo'){ g.fillStyle = '#2a0a06'; g.fillRect(x, y, 8, 1); if(h % 3 === 0){ g.fillStyle = h & 4 ? '#ff8a2a' : '#ffc040'; g.fillRect(x + (h & 7), y, 1, 1); } return; }
  /* bambú: pasto y alguna flor */
  const pasto = ['#4a7a34', '#6a9a3a', '#8ab84a'];
  for(let i = 0; i < 3; i++){ const px2 = x + ((h >> i) + i*3) % 8, alto = 1 + ((h >> (i + 2)) & 1) + (i === 1 ? 1 : 0); g.fillStyle = pasto[i]; g.fillRect(px2, y - alto, 1, alto); }
  if(h % 11 === 0){ g.fillStyle = '#f4a8c8'; g.fillRect(x + 4, y - 3, 1, 1); }
}
/* lo que cuelga abajo */
function adornoAbajo(g, x, y, h, mundo){
  if(mundo === 'montana'){ if(h % 3) return; g.fillStyle = '#d8e4ff'; const l = 2 + (h & 3); for(let k = 0; k < l; k++) g.fillRect(x + 3, y + k, k < l - 1 ? 2 : 1, 1); return; }
  if(mundo === 'castillo'){ if(h % 4) return; g.fillStyle = '#3a2a2a'; for(let k = 0; k < 4 + (h & 3); k++) g.fillRect(x + 4, y + k, 1, 1); return; }
  if(h % 3) return; g.fillStyle = '#3a6a2a'; const l = 3 + (h & 7); for(let k = 0; k < l; k++) g.fillRect(x + 2 + ((k >> 2) & 1), y + k, 1, 1); g.fillStyle = '#6a9a3a'; g.fillRect(x + 3, y + l - 1, 2, 1);
}
/* un farol de piedra (tōrō) o, en el castillo, un banderín; devuelve lo que se anima por cuadro */
function adornoCosa(g, x, y, h, mundo, E){
  const osc = tono(E.torre, 1.35);
  if(mundo === 'castillo' && h % 2){ g.fillStyle = osc; g.fillRect(x + 1, y - 16, 1, 16); return {t:'bandera', x:x + 2, y:y - 16}; }
  if(mundo === 'montana' && h % 2){ /* un santuario chiquito con nieve */ g.fillStyle = osc; g.fillRect(x, y - 6, 7, 6); g.fillStyle = '#e8eeff'; g.fillRect(x - 1, y - 8, 9, 2); g.fillStyle = '#1a0a10'; g.fillRect(x + 2, y - 4, 3, 4); return {t:'luz', x:x + 3, y:y - 3, r:5}; }
  g.fillStyle = osc; g.fillRect(x + 2, y - 2, 3, 2); g.fillRect(x + 3, y - 5, 1, 3); g.fillRect(x + 1, y - 8, 5, 3); g.fillRect(x, y - 9, 7, 1); g.fillRect(x + 2, y - 10, 3, 1);
  g.fillStyle = '#ffd890'; g.fillRect(x + 2, y - 7, 3, 1);
  return {t:'luz', x:x + 3, y:y - 7, r:6};
}
