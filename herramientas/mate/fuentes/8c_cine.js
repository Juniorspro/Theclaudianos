/* ================================================================ cinemáticas
   Un guion es una lista de pasos. Cada paso dura lo suyo o espera un toque; el toque completa el texto
   que se está escribiendo o pasa al siguiente. Viñetas ilustradas por código con paneo lento, retratos que
   mueven la boca, carteles de capítulo, el del jefe, y los créditos. «SALTEAR» arriba a la derecha. */
const VW = 300, VH = 164;
const [VIN_C, VIN_G] = lienzo(VW, VH);
function bandas(g, cols, y0, y1, x0, x1){             /* degradé en bandas con trama 2×2 en cada borde */
  x0 = x0 || 0; x1 = x1 === undefined ? VW : x1; const n = cols.length, h = (y1 - y0)/n;
  for(let i = 0; i < n; i++){ const a = Math.round(y0 + i*h), b = Math.round(y0 + (i + 1)*h); rect(g, x0, a, x1 - x0, b - a, cols[i]);
    if(i + 1 < n){ g.fillStyle = cols[i + 1]; for(let x = x0; x < x1; x += 2) for(let y = b - 2; y < b; y++) if((x + y) % 4 === 0) g.fillRect(x + (y & 1), y, 1, 1); } }
}
function estrellas(g, n, y1, t, sem){ const r = mulberry(sem || 3); for(let i = 0; i < n; i++){ const x = r()*VW, y = r()*y1, f = r(); if(Math.sin(t*2 + i) > 0.7 && f > 0.6) continue; px(g, x, y, f > 0.85 ? '#ffffff' : '#8a86b0'); } }
function edificios(g, sem, y0, hMin, hMax, col, ventana, prob, t){
  const r = mulberry(sem); let x = -4;
  while(x < VW){ const w = 10 + Math.floor(r()*18), h = hMin + Math.floor(r()*(hMax - hMin)); rect(g, x, y0 - h, w, h, col);
    if(r() < 0.3) rect(g, x + w/2 - 1, y0 - h - 5, 1, 5, col);
    for(let yy = y0 - h + 3; yy < y0 - 2; yy += 4) for(let xx = x + 2; xx < x + w - 2; xx += 3){ const q = r(); if(q < prob){ const tt = Math.sin(t*0.7 + xx*3.1 + yy) > 0.97; px(g, xx, yy, tt ? col : ventana); } }
    x += w + (r() < 0.3 ? 2 : 0); }
}
function lluviaV(g, t, n, col){ for(let i = 0; i < n; i++){ const x = (i*37.7 + t*40) % (VW + 20) - 10, y = (i*53.1 + t*190) % (VH + 10) - 10; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), 1, 3); } }
function brillo(g, x, y, r, col, a){ g.globalAlpha = a; for(let k = r; k > 0; k -= 2){ disco(g, x, y, k, col); } g.globalAlpha = 1; }
/* un sprite de una hoja, agrandado y opcionalmente oscurecido (silueta con borde de luz) */
function spriteV(g, hoja, cuadro, x, y, esc, opc){
  opc = opc || {}; const fw = hoja.fw, fh = hoja.fh, [c2, g2] = lienzo(fw, fh);
  g2.drawImage(hoja.c, cuadro*fw, 0, fw, fh, 0, 0, fw, fh);
  if(opc.sombra){ g2.globalCompositeOperation = 'source-atop'; g2.fillStyle = opc.sombra; g2.fillRect(0, 0, fw, fh); }
  g.save(); g.imageSmoothingEnabled = false; if(opc.flip){ g.translate(Math.round(x + fw*esc), 0); g.scale(-1, 1); x = 0; }
  g.drawImage(c2, 0, 0, fw, fh, Math.round(x), Math.round(y), fw*esc, fh*esc); g.restore();
}
const VINETAS = {
  ciudad(g, t){
    bandas(g, ['#07061a', '#0e0a28', '#171036', '#221544', '#301a4e', '#40205a'], 0, 128); estrellas(g, 70, 90, t, 5);
    brillo(g, 64, 34, 30, '#6a78c8', 0.08); disco(g, 64, 34, 13, '#dfe6ff'); disco(g, 60, 31, 3, '#c4cced'); disco(g, 68, 38, 2, '#c4cced'); disco(g, 66, 28, 1.5, '#c4cced');
    edificios(g, 11, 128, 20, 58, '#1c1636', '#5a4c7e', 0.25, t);
    /* la Torre Bergamota */
    const tx = 196; rect(g, tx, 22, 30, 108, '#120e24'); rect(g, tx + 4, 12, 22, 10, '#120e24'); rect(g, tx + 13, 0, 3, 12, '#120e24');
    for(let y = 26; y < 126; y += 5) for(let x = tx + 3; x < tx + 28; x += 4) if(((x*7 + y*3) % 5) < 2) px(g, x, y, Math.sin(t + x + y) > 0.9 ? '#120e24' : '#ffcf7a');
    if(Math.sin(t*4) > 0) { px(g, tx + 14, 0, '#ff3a3a'); brillo(g, tx + 14, 0, 5, '#ff3a3a', 0.25); }
    brillo(g, tx + 15, 17, 16, '#ff4ad8', 0.07 + Math.sin(t*9)*0.02); texto(g, 'EARL GREY', tx + 15, 14, 'violeta');
    edificios(g, 23, 132, 14, 44, '#0c0a18', '#e8b860', 0.35, t + 3);
    /* grúas y el agua */
    rect(g, 18, 70, 2, 62, '#0a0814'); rect(g, 6, 70, 56, 2, '#0a0814'); for(let i = 0; i < 8; i++) linea(g, 8 + i*6, 72, 11 + i*6, 76, 1, '#0a0814');
    bandas(g, ['#0a0c20', '#080a1a', '#06070f'], 132, VH);
    const r = mulberry(8); for(let i = 0; i < 40; i++){ const x = r()*VW, y = 134 + r()*28, w = 2 + r()*8, on = Math.sin(t*3 + i*1.7) > -0.3;
      if(on) rect(g, x + Math.sin(t*2 + i)*2, y, w, 1, i % 3 ? '#c8a860' : '#8a90d8'); }
    rect(g, 56, 134 + Math.sin(t*2)*1, 16, 1, '#dfe6ff'); rect(g, 60, 140, 9, 1, '#9aa8e0');
    lluviaV(g, t, 70, 'rgba(160,170,230,0.45)');
  },
  jefe(g, t){
    rect(g, 0, 0, VW, VH, '#2a171c'); for(let x = 0; x < VW; x += 8) rect(g, x, 0, 3, VH, '#301b21');
    /* el ventanal con la ciudad y la lluvia en el vidrio */
    const x0 = 140, y0 = 12, w = 146, h = 112; g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    bandas(g, ['#0a0820', '#141034', '#221646', '#2e1c52'], y0, y0 + h, x0, x0 + w); edificios(g, 31, y0 + h, 16, 64, '#0e0a1e', '#d8a860', 0.3, t);
    for(let i = 0; i < 26; i++){ const x = x0 + (i*29.3) % w, y = y0 + ((i*41.7 + t*(8 + i % 5*3)) % (h + 10)) - 5; rect(g, x, y, 1, 2, 'rgba(200,210,255,0.55)'); rect(g, x, y - 5, 1, 5, 'rgba(200,210,255,0.18)'); }
    g.restore(); rect(g, x0 - 4, y0 - 4, w + 8, 4, '#120a0e'); rect(g, x0 - 4, y0 + h, w + 8, 5, '#120a0e'); rect(g, x0 - 4, y0, 4, h, '#120a0e'); rect(g, x0 + w, y0, 4, h, '#120a0e'); rect(g, x0 + w/2 - 1, y0, 3, h, '#120a0e');
    if(Math.sin(t*0.9) > 0.985){ g.globalAlpha = 0.5; rect(g, x0, y0, w, h, '#e8ecff'); g.globalAlpha = 1; }           /* un relámpago */
    /* el sillón, Earl Grey de espaldas a la ciudad, y el té */
    rect(g, 150, 70, 46, 60, '#4a121a'); rect(g, 146, 64, 54, 12, '#5a1a22'); rect(g, 150, 70, 46, 2, '#7a2a32');
    spriteV(g, HOJAS.jefe, 0, 152, 26, 2, {sombra:'rgba(12,6,10,0.78)', flip:true});
    if(Math.sin(t*1.3) > 0.6) { px(g, 178, 45, '#ffffff'); brillo(g, 178, 45, 4, '#ffffff', 0.3); }       /* el monóculo */
    rect(g, 92, 104, 34, 4, '#3a2216'); rect(g, 106, 108, 6, 28, '#2a180e'); rect(g, 102, 96, 12, 8, '#e8e0d0'); rect(g, 114, 98, 3, 4, '#e8e0d0'); rect(g, 100, 103, 16, 2, '#c8c0b0');
    for(let i = 0; i < 12; i++){ const y = 94 - i*2 - (t*8 % 2), x = 107 + Math.sin(t*2 + i*0.7)*2.5; g.globalAlpha = 1 - i/12; px(g, x, y, '#d8d0c8'); } g.globalAlpha = 1;
    /* la lámpara */
    brillo(g, 40, 60, 40, '#ffb060', 0.06); rect(g, 30, 44, 20, 12, '#c89050'); rect(g, 39, 56, 2, 70, '#2a180e'); rect(g, 30, 126, 20, 3, '#2a180e');
    rect(g, 0, 132, VW, VH - 132, '#1a0e10'); for(let x = 0; x < VW; x += 12) rect(g, x, 132, 1, VH - 132, '#221216');
  },
  redada(g, t){
    bandas(g, ['#0a0818', '#120e24', '#1a1430'], 0, 60); edificios(g, 44, 60, 8, 30, '#100c1c', '#6a5a8a', 0.2, t);
    rect(g, 20, 30, 260, 106, '#3a2a24'); rect(g, 20, 30, 260, 3, '#5a4234');
    for(let y = 36; y < 130; y += 6) for(let x = 22 + (y % 12 ? 0 : 6); x < 278; x += 12) rect(g, x, y, 11, 5, '#43312a');
    rect(g, 60, 36, 180, 20, '#1a3a1e'); rect(g, 60, 36, 180, 2, '#2a5a2e'); texto(g, 'ALMACÉN DON YERBA', 150, 42, 'oro');
    rect(g, 40, 64, 100, 60, '#0a0a12'); rect(g, 160, 64, 100, 60, '#0a0a12');
    for(let s = 0; s < 3; s++){ rect(g, 44, 78 + s*16, 92, 2, '#5a4030'); for(let i = 0; i < 9; i++) if((i + s) % 4) rect(g, 48 + i*10, 70 + s*16, 7, 8, ['#3a8a3a', '#2a6a2a', '#caa050'][(i + s) % 3]); }
    for(let i = 0; i < 7; i++){ linea(g, 170 + i*12, 64, 160 + i*14 + (i % 2)*8, 124, 1, 'rgba(200,220,255,0.5)'); }                    /* vidriera rota */
    rect(g, 0, 124, VW, VH - 124, '#16121e'); rect(g, 0, 124, VW, 2, '#2a2436');
    spriteV(g, HOJAS.maton, HOJAS.maton.indice.camina + Math.floor(t*6) % 4, 196, 72, 2);
    spriteV(g, HOJAS.escopeta, HOJAS.escopeta.indice.quieto, 118, 72, 2, {flip:true});
    const r = mulberry(4); for(let i = 0; i < 40; i++){ const k = (t*0.5 + r()) % 1, x = 150 + (r() - 0.5)*140*k, y = 80 + k*k*50 - r()*30*k; px(g, x, y, r() < 0.5 ? '#6ac850' : '#3a8a2a'); }
    for(let i = 0; i < 3; i++){ const k = (t*0.35 + i/3) % 1; rect(g, 160 + (i - 1)*40*k, 60 + k*60 - Math.sin(k*3.14)*30, 8, 9, '#3a8a3a'); }
    brillo(g, 150, 60, 50, '#ff4a2a', 0.05 + Math.max(0, Math.sin(t*6))*0.05);
  },
  heroe(g, t){
    rect(g, 0, 0, VW, VH, '#0e0a14'); for(let x = 0; x < VW; x += 16) rect(g, x, 0, 1, VH, '#130e1a');
    /* la ventana con la luna: los rayos entran en diagonal hasta la mesa */
    rect(g, 214, 18, 56, 60, '#1a2046'); disco(g, 250, 36, 7, '#dfe6ff'); rect(g, 240, 18, 3, 60, '#08060c'); rect(g, 214, 46, 56, 3, '#08060c');
    rect(g, 210, 14, 64, 4, '#08060c'); rect(g, 210, 78, 64, 4, '#08060c'); rect(g, 210, 18, 4, 60, '#08060c'); rect(g, 270, 18, 4, 60, '#08060c');
    g.globalAlpha = 0.09 + Math.sin(t*0.8)*0.02; g.fillStyle = '#b8c8ff'; g.beginPath(); g.moveTo(214, 22); g.lineTo(270, 22); g.lineTo(170, 150); g.lineTo(96, 150); g.closePath(); g.fill();
    g.globalAlpha = 0.06; g.beginPath(); g.moveTo(214, 50); g.lineTo(270, 50); g.lineTo(190, 150); g.lineTo(130, 150); g.closePath(); g.fill(); g.globalAlpha = 1;
    const r = mulberry(12); for(let i = 0; i < 30; i++){ const k = r(), x = 110 + k*110 + Math.sin(t*0.5 + i)*6, y = 40 + r()*100 + Math.cos(t*0.4 + i)*5; if(x > 96 + (y - 22)*0.6 && x < 270 - (y - 22)*0.78) px(g, x, y, 'rgba(220,230,255,0.6)'); }
    rect(g, 104, 112, 96, 5, '#3a2418'); rect(g, 104, 112, 96, 1, '#5a3a24'); rect(g, 110, 117, 5, 40, '#2a180e'); rect(g, 190, 117, 5, 40, '#2a180e');
    const abre = t > 2.2, cuadro = !abre ? 1 : (Math.sin(t*2.6) > 0.96 ? 1 : (t > 3.5 && Math.floor(t*6) % 2 ? 2 : 0));
    spriteV(g, HOJAS.mateo, cuadro, 140, 84, 2);
    if(abre) brillo(g, 154, 96, 12, '#9aff7a', 0.08);
    spriteV(g, HOJAS.heroe, HOJAS.heroe.indice.quieto, 40, 70, 3, {sombra:'rgba(8,6,12,0.55)'});
    for(let i = 0; i < 11; i++){ const y = 99 + i*1.1 + Math.sin(t*3 + i*0.6)*i*0.25, x = 84 - i*3; rect(g, x, y, 4, 3, i % 3 ? '#b81c2c' : '#e8384a'); }    /* la bufanda */
    rect(g, 0, 150, VW, VH - 150, '#0a0810');
  },
  fabrica(g, t){
    bandas(g, ['#1a0c14', '#3a1418', '#6a2418', '#a2401c', '#d06a28', '#f0a048'], 0, 118);
    disco(g, 220, 118, 26, '#ffd070'); brillo(g, 220, 112, 44, '#ffb050', 0.06); rect(g, 190, 108, 60, 2, '#f0a048'); rect(g, 196, 113, 48, 1, '#f0a048');
    edificios(g, 7, 120, 10, 36, '#3a1a1a', '#ff9a50', 0.12, t);
    rect(g, 30, 60, 200, 64, '#1a0c0e'); rect(g, 30, 60, 200, 3, '#2a1416');
    for(const [x, h] of [[50, 58], [80, 72], [190, 64]]){ rect(g, x, 60 - h, 10, h, '#1a0c0e'); rect(g, x - 1, 60 - h, 12, 3, '#2a1416');
      for(let i = 0; i < 7; i++){ const k = (t*0.18 + i/7) % 1; g.globalAlpha = 0.55*(1 - k); disco(g, x + 5 + k*30 + Math.sin(k*6)*3, 60 - h - k*50, 3 + k*9, '#5a3a3a'); } g.globalAlpha = 1; }
    for(let x = 40; x < 222; x += 14) for(let y = 70; y < 116; y += 12) rect(g, x, y, 8, 6, Math.sin(t*1.1 + x + y) > 0.5 ? '#ffb060' : '#6a3a1e');
    rect(g, 70, 64, 120, 12, '#0a0406'); texto(g, 'BERGAMOTA TEA CO.', 130, 67, Math.sin(t*11) > -0.9 ? 'fuego' : 'gris');
    rect(g, 0, 124, VW, VH - 124, '#140a0c'); for(let x = 0; x < VW; x += 6) rect(g, x, 118, 1, 8, '#0a0406'); rect(g, 0, 118, VW, 1, '#0a0406'); rect(g, 0, 122, VW, 1, '#0a0406');
  },
  torre(g, t){
    bandas(g, ['#04030c', '#0a0822', '#120c30', '#1c1040'], 0, VH); estrellas(g, 30, 60, t, 9);
    /* la torre vista desde abajo: las líneas se juntan arriba */
    g.fillStyle = '#0c0a1e'; g.beginPath(); g.moveTo(60, VH); g.lineTo(130, 0); g.lineTo(170, 0); g.lineTo(240, VH); g.closePath(); g.fill();
    for(let k = 0; k < 26; k++){ const f = k/26, y = VH - Math.pow(f, 0.7)*VH, a = 60 + f*70, b = 240 - f*70;
      for(let x = a + 3; x < b - 3; x += 5 - f*3) if(((x*13 + k*7) % 9) < 3) px(g, x, y, Math.sin(t*0.6 + k + x) > 0.95 ? '#0c0a1e' : '#ffcf7a'); }
    rect(g, 128, 0, 44, 6, '#1a0c2a'); texto(g, 'EARL GREY', 150, 0, 'violeta'); brillo(g, 150, 3, 20, '#ff4ad8', 0.08);
    const a = Math.sin(t*0.6)*0.7; g.globalAlpha = 0.1; g.fillStyle = '#e8f0ff'; g.beginPath(); g.moveTo(250, 20); g.lineTo(250 + Math.sin(a - 0.2)*-220, 20 + Math.cos(a - 0.2)*200); g.lineTo(250 + Math.sin(a + 0.2)*-220, 20 + Math.cos(a + 0.2)*200); g.closePath(); g.fill(); g.globalAlpha = 1;
    rect(g, 244, 17, 12, 4, '#1a1a24'); rect(g, 238, 15, 24, 1, '#3a3a44'); if(Math.sin(t*6) > 0) px(g, 256, 19, '#ff3a3a');
    edificios(g, 71, VH, 20, 60, '#06050e', '#8a6ab0', 0.18, t);
    lluviaV(g, t, 60, 'rgba(180,160,240,0.4)');
  },
  amanecer(g, t){
    bandas(g, ['#3a6ab8', '#5a82c4', '#8a9ac8', '#c89ab0', '#f0a890', '#ffc890'], 0, 120);
    const sy = 118 - Math.min(1, t/8)*22; brillo(g, 200, sy, 60, '#ffd8a0', 0.07); disco(g, 200, sy, 16, '#fff0c8');
    for(let i = 0; i < 5; i++){ const x = (i*67 + t*9) % (VW + 40) - 20, y = 30 + i*9 + Math.sin(t + i)*3, a = Math.floor(t*4 + i) % 2; px(g, x, y, '#2a2040'); px(g, x - 1, y - a, '#2a2040'); px(g, x + 1, y - a, '#2a2040'); px(g, x - 2, y - 1 + a, '#2a2040'); px(g, x + 2, y - 1 + a, '#2a2040'); }
    edificios(g, 17, 122, 14, 50, '#6a4a7a', '#ffd8a0', 0.08, t); edificios(g, 29, 128, 10, 36, '#4a3060', '#ffc890', 0.1, t + 2);
    rect(g, 0, 128, VW, VH - 128, '#1e1426'); rect(g, 0, 128, VW, 3, '#3a2a40');
    spriteV(g, HOJAS.heroe, HOJAS.heroe.indice.quieto, 110, 70, 2, {sombra:'rgba(30,18,40,0.8)'});
    for(let i = 0; i < 9; i++){ const y = 90 + i*0.9 + Math.sin(t*2.4 + i*0.6)*i*0.25, x = 139 - i*2.5; rect(g, x, y, 3, 2, i % 3 ? '#b81c2c' : '#e8384a'); }
    spriteV(g, HOJAS.mateo, Math.floor(t*1.5) % 5 === 0 ? 1 : 0, 150, 112, 1);
  }
};

/* ---------- retratos de 34×34: la boca se mueve mientras hablan ---------- */
const _RET = new Map();
function retrato(quien, boca){
  const k = quien + boca; if(_RET.has(k)) return _RET.get(k);
  const [c, g] = lienzo(34, 34);
  if(quien === 'heroe'){
    bandas(g, ['#2a2436', '#221c2e', '#1a1624'], 0, 34, 0, 34);
    rect(g, 7, 25, 20, 9, P.campera); rect(g, 7, 25, 20, 1, P.camperaL);
    disco(g, 17, 14, 9, '#1a1622'); rect(g, 8, 14, 18, 8, '#1a1622'); disco(g, 15, 11, 5, '#2a2436');
    rect(g, 10, 13, 5, 2, '#f4f0ea'); rect(g, 19, 13, 5, 2, '#f4f0ea'); px(g, 10, 12, '#f4f0ea'); px(g, 23, 12, '#f4f0ea');
    rect(g, 6, 22, 22, 5, '#c81c2c'); rect(g, 6, 22, 22, 1, '#ff5a5a'); rect(g, 22, 26, 5, 7, '#b0101e'); rect(g, 24, 27, 1, 5, '#e8384a');
  } else if(quien === 'mateo'){
    bandas(g, ['#1a3a1e', '#15301a', '#102614'], 0, 34, 0, 34);
    disco(g, 17, 20, 11, '#8a5a34'); disco(g, 15, 18, 8, '#a2703e'); rect(g, 7, 7, 20, 3, '#c8c0b0'); rect(g, 8, 5, 18, 3, '#3a8a2a'); rect(g, 10, 4, 14, 2, '#5ac84a');
    rect(g, 22, 0, 2, 7, '#d8dce4'); rect(g, 21, 0, 4, 1, '#f4f4f8');
    rect(g, 10, 15, 5, 6, '#f4f0ea'); rect(g, 19, 15, 5, 6, '#f4f0ea'); rect(g, 12, 17, 2, 3, '#1a1010'); rect(g, 21, 17, 2, 3, '#1a1010'); px(g, 12, 17, '#ffffff'); px(g, 21, 17, '#ffffff');
    if(boca) { rect(g, 14, 24, 6, 4, '#3a1010'); rect(g, 15, 26, 4, 2, '#c84a4a'); } else rect(g, 14, 25, 6, 1, '#3a1a10');
    px(g, 9, 23, '#c87a5a'); px(g, 24, 23, '#c87a5a');
  } else if(quien === 'jefe'){
    bandas(g, ['#3a141c', '#2e1016', '#220c10'], 0, 34, 0, 34);
    rect(g, 6, 27, 22, 7, '#2a2230'); rect(g, 14, 27, 6, 7, '#e8e0d0'); rect(g, 15, 28, 4, 5, '#a01a2a');
    disco(g, 17, 17, 8, '#e8c0a0'); rect(g, 10, 18, 14, 7, '#e8c0a0'); disco(g, 15, 15, 4, '#f4d4b8');
    rect(g, 8, 1, 18, 9, '#141018'); rect(g, 5, 9, 24, 2, '#141018'); rect(g, 8, 7, 18, 2, '#8a2a3a');
    rect(g, 11, 14, 3, 2, '#2a1a1a'); rect(g, 20, 14, 3, 2, '#2a1a1a'); disco(g, 21, 15, 3, '#e8e0c0'); disco(g, 21, 15, 2, '#c8d8e8'); px(g, 20, 14, '#ffffff'); linea(g, 24, 16, 26, 26, 1, '#e8d080');
    rect(g, 10, 20, 14, 3, '#b0aab0'); rect(g, 8, 21, 3, 2, '#b0aab0'); rect(g, 23, 21, 3, 2, '#b0aab0');
    if(boca) rect(g, 14, 23, 6, 2, '#5a1a1a'); else rect(g, 14, 24, 6, 1, '#8a4a3a');
  } else if(quien === 'radio'){
    bandas(g, ['#2a2430', '#221e28', '#1a1620'], 0, 34, 0, 34);
    rect(g, 5, 8, 24, 20, '#4a3a2a'); rect(g, 5, 8, 24, 1, '#6a5a44'); for(let y = 11; y < 25; y += 2) rect(g, 8, y, 12, 1, boca && y % 4 ? '#8a7a64' : '#2a2018');
    disco(g, 24, 14, 2, '#c8b090'); disco(g, 24, 22, 2, '#c8b090'); rect(g, 8, 3, 1, 5, '#8a8a92');
  } else {
    bandas(g, ['#242a20', '#1e241a', '#181c14'], 0, 34, 0, 34);
    rect(g, 7, 26, 20, 8, P.traje); disco(g, 17, 17, 8, '#d8a07a'); rect(g, 10, 18, 14, 6, '#d8a07a');
    rect(g, 6, 8, 22, 3, '#1c1822'); rect(g, 10, 3, 14, 6, '#1c1822'); rect(g, 10, 7, 14, 1, '#6a2a2a');
    rect(g, 11, 14, 3, 1, '#1a1010'); rect(g, 20, 14, 3, 1, '#1a1010'); for(let i = 0; i < 9; i++) px(g, 11 + i*1.5, 22 + (i % 2), '#8a6a54');
    if(boca) rect(g, 14, 21, 5, 2, '#4a1a1a'); else rect(g, 14, 21, 5, 1, '#6a3a2a'); rect(g, 20, 21, 6, 1, '#e8e0d0'); px(g, 26, 21, '#ff6a2a');
  }
  const res = lienzo(36, 36); res[1].fillStyle = K; res[1].fillRect(0, 0, 36, 36); res[1].drawImage(c, 1, 1); _RET.set(k, res[0]); return res[0];
}
const NOMBRES = {heroe:'EL CEBADOR', mateo:'MATEO', jefe:'LORD EARL GREY', maton:'MATÓN', radio:'RADIO'};
const COL_NOMBRE = {heroe:'rojo', mateo:'verde', jefe:'violeta', maton:'gris', radio:'oro'};

/* ---------- los guiones ---------- */
const GUIONES = {
  intro:[{musica:'cine'}, {barras:1},
    {vineta:'ciudad', txt:'Puerto Yerba. Una ciudad que se despierta con mate.', dur:5.5},
    {vineta:'jefe', txt:'Hasta que llegó Lord Earl Grey, el barón del té, con un plan: prohibir el mate.', dur:6},
    {vineta:'redada', txt:'Sus matones cerraron cada almacén de la costa. La yerba desapareció.', dur:5.5},
    {vineta:'heroe', dur:3.4},
    {vineta:'heroe', habla:'mateo', txt:'Che... ¿me escuchás? Soy yo, Mateo. Tu mate.'},
    {vineta:'heroe', habla:'heroe', txt:'...'},
    {vineta:'heroe', habla:'mateo', txt:'Earl Grey se llevó toda la yerba de la ciudad. Toda.'},
    {vineta:'heroe', habla:'mateo', txt:'Vamos a buscarla. Vos poné la puntería, yo pongo el sabor.'},
    {titulo:'CAPÍTULO 1', sub:'EL PUERTO', frase:'La yerba entra por el muelle.', dur:3.6}],
  cap2:[{musica:'cine'}, {barras:1},
    {vineta:'fabrica', txt:'La Fábrica Bergamota. Ahí convierten la yerba confiscada en... té.', dur:5.5},
    {vineta:'fabrica', habla:'mateo', txt:'Qué asco. Vamos a apagarles las calderas.'},
    {titulo:'CAPÍTULO 2', sub:'LA FÁBRICA', frase:'Vapor, cintas y teteras.', dur:3.6}],
  cap3:[{musica:'cine'}, {barras:1},
    {vineta:'torre', txt:'La Torre Bergamota. Ochenta pisos de té, y arriba de todo, él.', dur:5.5},
    {vineta:'torre', habla:'radio', txt:'Enmascarado... Subí si te animás. Te espera el té de las cinco.'},
    {vineta:'torre', habla:'mateo', txt:'Ese tipo me cae peor que el agua hervida.'},
    {titulo:'CAPÍTULO 3', sub:'LA TORRE', frase:'Arriba de todo espera el té.', dur:3.6}],
  jefe:[{musica:'cine'}, {barras:1}, {cam:{x:18, y:8.5}, dur:2},
    {cartel:'LORD EARL GREY', sub:'BARÓN DEL TÉ', dur:2.8},
    {habla:'jefe', txt:'Así que vos sos el que anda rompiendo mis vidrios.'},
    {habla:'mateo', txt:'¡Y tus teteras! ¡Devolvé la yerba!'},
    {habla:'jefe', txt:'Nadie se resiste al té de las cinco. Nadie.'},
    {cam:'heroe', dur:0.9}, {barras:0}, {musica:'jefe'}],
  final:[{fundir:1, dur:1.2}, {musica:'fin'}, {barras:1}, {fundir:0, dur:0.2},
    {vineta:'amanecer', txt:'Esa mañana, Puerto Yerba volvió a oler a yerba.', dur:6},
    {vineta:'amanecer', habla:'mateo', txt:'¿Lo escuchás? Toda la ciudad está poniendo la pava.'},
    {vineta:'amanecer', habla:'heroe', txt:'...'},
    {vineta:'amanecer', habla:'mateo', txt:'Che... ¿y si nos tomamos unos amargos?'},
    {titulo:'FIN', sub:'MATE AMARGO', frase:'Gracias por jugar.', dur:4},
    {creditos:true}]
};
const CREDITOS = [['MATE AMARGO', 'oro', 2], ['', ''], ['UNA VENGANZA CON YERBA', 'blanco'], ['', ''], ['IDEA Y DIRECCIÓN', 'gris'], ['JUNIORS', 'blanco'], ['', ''],
  ['PROGRAMACIÓN, PIXEL ART, LUZ', 'gris'], ['CLAUDE', 'blanco'], ['', ''], ['MÚSICA Y SONIDO', 'gris'], ['SINTETIZADOS EN EL NAVEGADOR', 'blanco'], ['', ''],
  ['HOMENAJE A', 'gris'], ['MY FRIEND PEDRO', 'blanco'], ['', ''], ['HECHO EN THECLAUDIANOS', 'verde'], ['', ''], ['', ''], ['GRACIAS POR JUGAR', 'oro']];

function arrancarCine(nombre, alTerminar){
  const g = GUIONES[nombre]; if(!g) { if(alTerminar) alTerminar(); return; }
  J.cine = {nombre, guion:g, i:-1, t:0, n:0, barras:J.cine ? J.cine.barras : 0, barrasObj:0, alTerminar, vin:null, vinT:0, fundir:0, fundirObj:0};
  J.planeo = null; DEDOS.clear(); siguientePaso();
}
function siguientePaso(){
  const c = J.cine; if(!c) return;
  c.i++; c.t = 0; c.n = 0;
  if(c.i >= c.guion.length){ terminarCine(); return; }
  const p = c.guion[c.i];
  if(p.musica !== undefined){ SON.musica(p.musica); siguientePaso(); return; }
  if(p.barras !== undefined){ c.barrasObj = p.barras; siguientePaso(); return; }
  if(p.fundir !== undefined){ c.fundirObj = p.fundir; if(!p.dur) { siguientePaso(); return; } }
  if(p.vineta && p.vineta !== c.vin){ c.vin = p.vineta; c.vinT = 0; SON.fx('pagina'); }
  if(!p.vineta && !p.habla && !p.fundir) c.vin = null;
  if(p.cam){ if(p.cam === 'heroe'){ CAMARA.obj.x = lim(HE.x + 1.6, W/TX/2 - 1, NIVEL.ancho - W/TX/2 + 1); CAMARA.obj.y = Math.max(HE.y + 2, H/TX/2 - 1.2); } else { CAMARA.obj.x = p.cam.x; CAMARA.obj.y = p.cam.y; } }
  if(p.cartel) { SON.fx('titulo'); CAMARA.sacude = 1.2; }
  if(p.titulo) SON.fx('titulo');
  if(p.creditos) c.cred = 0;
}
function terminarCine(){
  const c = J.cine; J.cine = null; if(!c) return; c.barrasObj = 0; J.barras = c.barras;
  if(c.alTerminar) c.alTerminar();
}
function saltearCine(){ const c = J.cine; if(!c) return; SON.fx('atras');
  /* los pasos de música y barras que faltan igual se aplican */
  for(let i = c.i + 1; i < c.guion.length; i++){ const p = c.guion[i]; if(p.musica !== undefined) SON.musica(p.musica); if(p.cam === 'heroe'){ CAMARA.obj.x = lim(HE.x + 1.6, W/TX/2 - 1, NIVEL.ancho - W/TX/2 + 1); } }
  terminarCine(); }
function largoTexto(p){ return p.txt ? tr(p.txt).length : 0; }
function avanzarCine(x, y){
  const c = J.cine; if(!c) return;
  if(x !== undefined && x > W - 70 && y < 22){ saltearCine(); return; }
  const p = c.guion[c.i]; if(!p) return;
  if(p.creditos){ c.cred += 40; return; }
  if(p.txt && c.n < largoTexto(p)){ c.n = largoTexto(p); return; }
  if(c.t < 0.25) return;
  SON.fx('clic'); siguientePaso();
}
function pasoCine(dtR){
  const c = J.cine; if(!c) return;
  c.t += dtR; c.vinT += dtR;
  c.barras += (c.barrasObj - c.barras)*(1 - Math.exp(-dtR*5));
  c.fundir += (c.fundirObj - c.fundir)*(1 - Math.exp(-dtR*6)); J.fundirA = c.fundir;
  const p = c.guion[c.i]; if(!p) return;
  if(p.txt){ const L = largoTexto(p), antes = Math.floor(c.n); c.n = Math.min(L, c.n + dtR*32); const txt = tr(p.txt);
    for(let i = antes; i < Math.floor(c.n); i++) SON.voz(txt[i], p.habla || 'radio'); }
  const espera = p.dur !== undefined ? p.dur : p.txt ? 2.4 + largoTexto(p)*0.055 : 1;
  if(p.creditos){ c.cred += dtR*14; if(c.cred > CREDITOS.length*12 + H + 30) siguientePaso(); return; }
  if(c.t > espera && (!p.txt || c.n >= largoTexto(p))) siguientePaso();
}
/* ---------- dibujo ---------- */
function dibujarCine(g, dtR){
  const c = J.cine; if(!c) return;
  const p = c.guion[c.i] || {};
  /* la viñeta: panel con marco, paneo lento y fundido al entrar */
  if(c.vin){ g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H);
    VIN_G.clearRect(0, 0, VW, VH); try { VINETAS[c.vin](VIN_G, c.vinT); } catch(e){ if(!pasoCine.err){ pasoCine.err = 1; console.error(e); } }
    const esc = Math.max(1, Math.floor(Math.min((W - 16)/VW, (H - 44)/VH))), w = VW*esc, h = VH*esc, x = Math.round(W/2 - w/2), y = Math.round((H - 30)/2 - h/2) + 2;
    const pan = Math.round(Math.sin(c.vinT*0.12)*3), zoom = Math.min(1, c.vinT*3);
    g.imageSmoothingEnabled = false; g.globalAlpha = zoom;
    g.drawImage(VIN_C, 4 + pan, 3, VW - 8, VH - 6, x, y, w, h);
    g.globalAlpha = 1; g.fillStyle = '#efe6d2'; g.fillRect(x - 2, y - 2, w + 4, 1); g.fillRect(x - 2, y + h + 1, w + 4, 1); g.fillRect(x - 2, y - 2, 1, h + 4); g.fillRect(x + w + 1, y - 2, 1, h + 4);
    g.fillStyle = K; g.fillRect(x - 1, y - 1, w + 2, 1); g.fillRect(x - 1, y + h, w + 2, 1); g.fillRect(x - 1, y - 1, 1, h + 2); g.fillRect(x + w, y - 1, 1, h + 2);
    /* narración: debajo del panel, en una línea o dos */
    if(p.txt && !p.habla){ const txt = tr(p.txt).slice(0, Math.floor(c.n)), ls = partir(txt, Math.floor((W - 30)/6)); ls.forEach((l, i) => texto(g, l, W/2, y + h + 6 + i*9, 'blanco')); }
  }
  /* las barras de cine */
  const bh = Math.round(c.barras*18); if(bh > 0){ g.fillStyle = '#000'; g.fillRect(0, 0, W, bh); g.fillRect(0, H - bh, W, bh); }
  /* el diálogo con retrato */
  if(p.habla){ const quien = p.habla, txt = tr(p.txt), vis = txt.slice(0, Math.floor(c.n)), habla = c.n < txt.length && Math.floor(c.t*10) % 2;
    const bw = Math.min(W - 24, 360), bx = Math.round(W/2 - bw/2), by = H - 62;
    g.fillStyle = 'rgba(8,5,14,0.92)'; g.fillRect(bx, by, bw, 50); g.fillStyle = '#efe6d2'; g.fillRect(bx, by, bw, 1); g.fillRect(bx, by + 49, bw, 1); g.fillRect(bx, by, 1, 50); g.fillRect(bx + bw - 1, by, 1, 50);
    g.drawImage(retrato(quien, habla ? 1 : 0), bx + 7, by + 7);
    texto(g, tr(NOMBRES[quien] || ''), bx + 50, by + 5, COL_NOMBRE[quien] || 'blanco', {izq:true});
    partir(vis, Math.floor((bw - 60)/6)).forEach((l, i) => texto(g, l, bx + 50, by + 17 + i*9, 'blanco', {izq:true}));
    if(c.n >= txt.length && Math.floor(J.tr*3) % 2){ g.fillStyle = '#f2c14e'; g.fillRect(bx + bw - 12, by + 41, 5, 1); g.fillRect(bx + bw - 11, by + 42, 3, 1); g.fillRect(bx + bw - 10, by + 43, 1, 1); } }
  /* cartel de capítulo: negro, letras grandes y la bufanda que cruza */
  if(p.titulo){ const k = Math.min(1, c.t*1.6), out = p.dur ? lim((p.dur - c.t)*2, 0, 1) : 1; g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H);
    g.globalAlpha = out; texto(g, tr(p.titulo), W/2, H/2 - 34, 'oro');
    const sub = tr(p.sub), e = W > 360 ? 3 : 2; texto(g, sub, W/2, H/2 - 18, 'blanco', {esc:e});
    const lw = Math.round((sub.length*6*e + 20)*suave(k)); for(let i = 0; i < lw; i++){ const yy = H/2 + 6*e - 8 + Math.round(Math.sin(i*0.12 + J.tr*5)*1.5); g.fillStyle = i % 7 < 2 ? '#e8384a' : '#b81c2c'; g.fillRect(W/2 - lw/2 + i, yy, 1, 3); }
    if(p.frase) texto(g, tr(p.frase), W/2, H/2 + 6*e + 4, 'gris'); g.globalAlpha = 1; }
  /* cartel del jefe: entra de costado con un tajo rojo */
  if(p.cartel){ const k = suave(Math.min(1, c.t*2.2)), x = Math.round(lerp(-200, W*0.34, k)), y = Math.round(H*0.62);
    g.fillStyle = 'rgba(160,16,30,0.9)'; g.beginPath(); g.moveTo(0, y - 4); g.lineTo(x + 220, y - 12); g.lineTo(x + 230, y + 22); g.lineTo(0, y + 26); g.closePath(); g.fill();
    g.fillStyle = K; g.fillRect(0, y + 26, Math.round(x + 230), 2);
    texto(g, tr(p.cartel), x + 6, y - 2, 'blanco', {izq:true, esc:2}); texto(g, tr(p.sub), x + 8, y + 15, 'oro', {izq:true}); }
  /* créditos */
  if(p.creditos){ g.fillStyle = '#05030a'; g.fillRect(0, 0, W, H);
    CREDITOS.forEach((q, i) => { const y = Math.round(H + 10 + i*12 - c.cred); if(y > -20 && y < H + 10 && q[0]) texto(g, tr(q[0]), W/2, y, q[1] || 'blanco', {esc:q[2] || 1}); }); }
  /* saltear */
  if(c.nombre !== 'final' || !p.creditos) texto(g, tr('SALTEAR') + ' ▶▶', W - 8, 6, 'gris', {der:true});
}
