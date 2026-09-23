
/* ================================================================ pixel art por código
   Un muñeco con esqueleto (cadera, rodillas, tobillos, cuello, cabeza) que se dibuja píxel a píxel,
   con contorno y luz de arriba a la izquierda. Los brazos van APARTE: cada uno apunta a su enemigo. */
function lienzo(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', {willReadFrequently:true}); g.imageSmoothingEnabled = false; return [c, g]; }
const P = {                                                    /* paleta: pocos colores, bien separados */
  K:'#0a0610', mascara:'#231c2e', mascaraL:'#3a3048', ojo:'#f4f0ea', bufanda:'#d8283a', bufandaL:'#ff5a5a',
  campera:'#80603f', camperaL:'#a8815a', camperaS:'#4e3826', panta:'#3a3646', pantaS:'#221f2a', bota:'#141018', botaL:'#3a3440',
  piel:'#d8a07a', pielS:'#a8704e', pielO:'#8a5a3e', metal:'#9aa4b4', metalS:'#4c5464', negro:'#18141c',
  traje:'#4a5a3c', trajeS:'#2e3a24', trajeL:'#6a7c52', cuero:'#6a3e24', cueroS:'#42240f', chaleco:'#5a5e66', casco:'#3e4450',
  tirador:'#1e1c24', tiradorL:'#34303e', boina:'#5a1a2a', te:'#e8d8a8', teS:'#b8a070', hilo:'#e8e0d0', laser:'#ff2a2a'
};
function px(g, x, y, c){ g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
function rect(g, x, y, w, h, c){ g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disco(g, cx, cy, r, c){ g.fillStyle = c; for(let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for(let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
  if((x + .5 - cx)**2 + (y + .5 - cy)**2 <= r*r) g.fillRect(x, y, 1, 1); }
function linea(g, x0, y0, x1, y1, gr, c){ const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)*2)); g.fillStyle = c;
  for(let i = 0; i <= n; i++){ const t = i/n, x = x0 + (x1 - x0)*t, y = y0 + (y1 - y0)*t;
    if(gr <= 1) g.fillRect(Math.round(x), Math.round(y), 1, 1); else disco(g, x, y, gr/2, c); } }
/* contorno de 1 píxel por fuera y volumen: luz arriba-izquierda, sombra abajo-derecha */
function acabar(c, x0, y0, w, h, opc){
  opc = opc || {};
  const g = c.getContext('2d'), im = g.getImageData(x0, y0, w, h), d = im.data;
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y*w + x)*4 + 3] > 127;
  const orig = new Uint8Array(w*h); for(let i = 0; i < w*h; i++) orig[i] = d[i*4 + 3] > 127 ? 1 : 0;
  const O = (x, y) => x >= 0 && y >= 0 && x < w && y < h && orig[y*w + x];
  const kc = [10, 6, 16];
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = (y*w + x)*4;
    if(orig[y*w + x]){
      if(opc.sombrear !== false){
        const luz = !O(x - 1, y) || !O(x, y - 1), som = !O(x + 1, y) || !O(x, y + 1);
        const k = luz && !som ? 1.22 : som && !luz ? 0.72 : 1;
        if(k !== 1) for(let j = 0; j < 3; j++) d[i + j] = Math.min(255, d[i + j]*k + (k > 1 ? 10 : 0));
      }
      continue; }
    if(O(x - 1, y) || O(x + 1, y) || O(x, y - 1) || O(x, y + 1)){ d[i] = kc[0]; d[i + 1] = kc[1]; d[i + 2] = kc[2]; d[i + 3] = 255; }
  }
  g.putImageData(im, x0, y0);
}
/* una hoja de cuadros en fila, con su relieve y su mapa de brillo */
function hacerHoja(fw, fh, cuadros, opc){
  opc = opc || {};
  const n = cuadros.length, [c, g] = lienzo(fw*n, fh);
  let emi = null, ge = null; if(opc.emisivo){ [emi, ge] = lienzo(fw*n, fh); ge.fillStyle = '#000'; ge.fillRect(0, 0, fw*n, fh); }
  cuadros.forEach((f, i) => { g.save(); g.translate(i*fw, 0); f(g, ge ? {g:ge, x:i*fw} : null); g.restore(); acabar(c, i*fw, 0, fw, fh, opc); });
  if(emi) cuadros.forEach((f, i) => { if(opc.emisivo) { ge.save(); ge.translate(i*fw, 0); opc.emisivo(ge, i); ge.restore(); } });
  const hoja = {c, fw, fh, n, tex:texPixel(c), nor:texDatos(normalDeSprite(c)), emi:emi ? texPixel(emi) : null};
  return hoja;
}

/* ---------- el muñeco ---------- */
/* pose: cadera (x, y), inclinación del torso, muslos y rodillas de las dos piernas, cabeza.
   Todo mira a la derecha; el sprite se espeja con la escala. */
function pose(o){ return Object.assign({cx:15, cy:19, torso:0, mI:0.15, rI:0.1, mD:-0.15, rD:0.1, cab:0, agacha:0, tam:1}, o); }
function dibujarHumano(g, p, e){
  const s = p.tam, T = 9*s, MUS = 5*s, PAN = 5*s;
  const cad = {x:p.cx, y:p.cy + p.agacha};
  const cue = {x:cad.x + Math.sin(p.torso)*T, y:cad.y - Math.cos(p.torso)*T};
  const pierna = (mus, rod, col, colS) => {
    const r = {x:cad.x + Math.sin(mus)*MUS, y:cad.y + Math.cos(mus)*MUS};
    const a = mus - rod, t = {x:r.x + Math.sin(a)*PAN, y:r.y + Math.cos(a)*PAN};
    linea(g, cad.x, cad.y, r.x, r.y, 3*s, col); linea(g, r.x, r.y, t.x, t.y, 3*s - (s > 1 ? 1 : 0), col);
    linea(g, r.x + 1, r.y, t.x + 1, t.y, 1, colS);
    rect(g, t.x - 1*s, t.y - 1, 4*s, 2*s, e.bota); px(g, t.x + 2*s, t.y - 1, e.botaL || e.bota);
    return t; };
  pierna(p.mI, p.rI, e.pantaS, e.pantaS);                      /* la de atrás, más oscura */
  /* torso */
  linea(g, cad.x, cad.y - 1, cue.x, cue.y + 1, 6*s, e.torso);
  linea(g, cad.x - 2*s, cad.y - 1, cue.x - 2*s, cue.y + 2, 1.5*s, e.torsoS);
  linea(g, cad.x + 2*s, cad.y - 2, cue.x + 1.5*s, cue.y + 2, 1, e.torsoL);
  if(e.cinto) rect(g, cad.x - 3*s, cad.y - 1, 6*s, 1, e.cinto);
  if(e.chaleco) linea(g, cad.x, cad.y - 3*s, cue.x, cue.y + 3*s, 5*s, e.chaleco);
  pierna(p.mD, p.rD, e.panta, e.pantaS);
  /* cabeza */
  const cab = {x:cue.x + Math.sin(p.torso)*3*s + p.cab, y:cue.y - 4*s};
  e.cabeza(g, cab.x, cab.y, s, p);
  if(e.extra) e.extra(g, cab, cue, cad, s, p);
  return {cad, cue, cab, hombro:{x:cue.x + (e.hombroX || 0), y:cue.y + 2*s}};
}
/* cabezas */
const CABEZAS = {
  heroe(g, x, y, s){ disco(g, x, y, 3.6, P.mascara); rect(g, x - 3, y - 4, 5, 2, P.mascara); px(g, x - 3, y - 4, P.mascaraL);
    rect(g, x - 1, y - 1, 4, 2, P.ojo); px(g, x + 3, y - 1, P.ojo);          /* la franja blanca de los ojos */
    px(g, x - 2, y - 3, P.mascaraL); px(g, x - 1, y - 3, P.mascaraL); },
  fedora(g, x, y, s){ disco(g, x, y, 3.3, P.piel); rect(g, x + 1, y, 3, 1, P.pielO); px(g, x + 2, y - 1, P.K); px(g, x + 3, y + 2, P.pielS);
    rect(g, x - 4, y - 3, 9, 1, '#2a2a30'); rect(g, x - 3, y - 6, 6, 3, '#34343c'); rect(g, x - 3, y - 4, 6, 1, '#6a1a1a'); },
  bandana(g, x, y, s){ disco(g, x, y, 3.3, P.pielS); rect(g, x - 3, y - 3, 7, 2, '#8a1a1a'); px(g, x - 4, y - 2, '#8a1a1a'); px(g, x - 5, y - 1, '#8a1a1a');
    rect(g, x + 1, y + 1, 3, 2, '#3a2a1a'); px(g, x + 2, y - 1, P.K); },
  casco(g, x, y, s){ disco(g, x, y, 3.6*s, P.pielS); disco(g, x - 0.5, y - 1.2*s, 3.8*s, P.casco); rect(g, x - 4*s, y - 1, 8*s, 1, '#22262e');
    rect(g, x + 1, y, 3*s, 2, '#101218'); px(g, x + 2, y, '#8a2020'); },
  boina(g, x, y, s){ disco(g, x, y, 3.2, P.piel); rect(g, x - 4, y - 3, 7, 2, P.boina); px(g, x + 3, y - 3, P.boina); px(g, x - 4, y - 4, P.boina);
    rect(g, x, y - 1, 4, 1, '#101016'); px(g, x + 2, y + 2, P.pielS); },
  jefe(g, x, y, s){ disco(g, x, y, 3.6*s, '#e0b490'); rect(g, x - 4.5*s, y - 4*s, 9*s, 1.5*s, '#141018'); rect(g, x - 3*s, y - 10*s, 6*s, 6*s, '#1c1822');
    rect(g, x - 3*s, y - 5.5*s, 6*s, 1*s, '#7a1a2a'); disco(g, x + 1.6*s, y - 0.4*s, 1.3*s, '#f2c14e'); disco(g, x + 1.6*s, y - 0.4*s, 0.7*s, '#101018');
    rect(g, x - 1*s, y + 1.6*s, 4*s, 1*s, '#c8c0b0'); rect(g, x - 1.5*s, y + 2.4*s, 5*s, 1*s, '#e8e0d0'); }
};
/* el sello del Cartel del Té: una bolsita colgando de la oreja */
function bolsita(g, cab){ linea(g, cab.x - 2, cab.y + 1, cab.x - 3, cab.y + 5, 1, P.hilo); rect(g, cab.x - 4, cab.y + 5, 3, 3, P.te); px(g, cab.x - 2, cab.y + 7, P.teS); }
const ESTILOS = {
  heroe:  {torso:P.campera, torsoS:P.camperaS, torsoL:P.camperaL, panta:P.panta, pantaS:P.pantaS, bota:P.bota, botaL:P.botaL, cabeza:CABEZAS.heroe, cinto:'#15121a'},
  maton:  {torso:P.traje, torsoS:P.trajeS, torsoL:P.trajeL, panta:'#2a2e24', pantaS:'#1a1e16', bota:'#1a1410', cabeza:CABEZAS.fedora, extra:bolsita},
  escopeta:{torso:P.cuero, torsoS:P.cueroS, torsoL:'#8a5a34', panta:'#3a3a48', pantaS:'#24242e', bota:'#1a1410', cabeza:CABEZAS.bandana, extra:bolsita},
  pesado: {torso:'#3e4a3a', torsoS:'#262e22', torsoL:'#5a6a52', panta:'#2a2e24', pantaS:'#1a1e16', bota:'#101010', cabeza:CABEZAS.casco, chaleco:P.chaleco, extra:bolsita},
  tirador:{torso:P.tirador, torsoS:'#100e14', torsoL:P.tiradorL, panta:'#1a1820', pantaS:'#0e0c12', bota:'#0a080c', cabeza:CABEZAS.boina, extra:bolsita},
  jefe:   {torso:'#6a5a44', torsoS:'#4a3e2e', torsoL:'#8a7a5c', panta:'#3a3228', pantaS:'#2a241c', bota:'#141010', cabeza:CABEZAS.jefe, chaleco:'#8a2a3a',
           extra(g, cab, cue, cad, s){ rect(g, cue.x - 1, cue.y + 2, 2, 6*s, '#e8e0d0'); px(g, cue.x, cue.y + 3, '#8a2a3a'); } }
};
/* poses del héroe */
const POSES = {
  quieto:[pose({}), pose({agacha:1, torso:0.03})],
  camina:[0, 1, 2, 3, 4, 5].map(i => { const a = i/6*Math.PI*2; return pose({mD:Math.sin(a)*0.6, mI:-Math.sin(a)*0.6, rD:0.3 + Math.max(0, -Math.cos(a))*0.5, rI:0.3 + Math.max(0, Math.cos(a))*0.5, agacha:Math.abs(Math.sin(a))*-1 + 0.5, torso:0.08}); }),
  salta:[pose({mD:-0.8, rD:1.4, mI:0.4, rI:0.6, torso:0.12, agacha:-1})],
  bolita:[pose({mD:-1.3, rD:2.4, mI:-1.1, rI:2.4, torso:0.5, agacha:-3})],
  cae:[pose({mD:0.3, rD:0.5, mI:-0.4, rI:0.9, torso:-0.05, agacha:-1})],
  aterriza:[pose({mD:-0.7, rD:1.5, mI:0.6, rI:1.2, torso:0.3, agacha:4})],
  desliza:[pose({cx:14, cy:26, mD:-1.45, rD:0.1, mI:-1.2, rI:0.9, torso:-1.05, agacha:0})],
  pared:[pose({mD:-0.5, rD:1.2, mI:0.3, rI:1.0, torso:-0.15})],
  herido:[pose({torso:-0.35, mD:0.4, mI:-0.3, rD:0.4, rI:0.3, cab:-1})],
  muerto:[pose({cx:14, cy:26, torso:-1.5, mD:-1.4, mI:-1.2, rD:-0.2, rI:0.3, agacha:1}), pose({cx:14, cy:28, torso:-1.57, mD:-1.55, mI:-1.45, rD:0, rI:0.1, agacha:1})]
};
const ANIM_HEROE = ['quieto', 'camina', 'salta', 'bolita', 'cae', 'aterriza', 'desliza', 'pared', 'herido', 'muerto'];
function hojaHumano(estilo, tam){
  tam = tam || 1; const fw = Math.round(32*tam), fh = Math.round(32*tam), lista = [], indice = {};
  for(const a of ANIM_HEROE){ indice[a] = lista.length; for(const p of POSES[a]) lista.push(p); }
  const e = ESTILOS[estilo], hoja = hacerHoja(fw, fh, lista.map(p0 => g => {
    const p = Object.assign({}, p0, {tam, cx:p0.cx*tam, cy:(p0.cy + 11)*tam - 11*tam + (fh - 32*tam > 0 ? 0 : 0)});
    p.cy = fh - (32 - p0.cy)*tam;                              /* los pies al piso del cuadro */
    dibujarHumano(g, p, e); }));
  hoja.indice = indice; hoja.hombros = lista.map(p0 => { const p = Object.assign({}, p0, {tam, cx:p0.cx*tam}); p.cy = fh - (32 - p0.cy)*tam;
    const [c2, g2] = lienzo(1, 1); return dibujarHumano(g2, p, e).hombro; });
  hoja.largo = a => POSES[a].length;
  return hoja;
}
/* ---------- brazos con arma: el pivote es el hombro ---------- */
const ARMAS_SPR = {
  pistola(g, x, y){ rect(g, x, y - 1, 5, 2, '#2a2830'); rect(g, x + 1, y + 1, 2, 2, '#1a181e'); px(g, x + 4, y - 1, '#6a6a76'); },
  escopeta(g, x, y){ rect(g, x - 2, y - 1, 10, 2, '#2a2426'); rect(g, x - 3, y, 3, 2, '#5a3a22'); px(g, x + 7, y - 1, '#7a7a86'); },
  subfusil(g, x, y){ rect(g, x - 1, y - 1, 8, 2, '#1e1e24'); rect(g, x + 2, y + 1, 2, 3, '#141418'); px(g, x + 6, y - 1, '#7a7a86'); },
  rifle(g, x, y){ rect(g, x - 3, y - 1, 13, 2, '#1c1a20'); rect(g, x + 2, y - 3, 4, 2, '#2c2a34'); px(g, x + 3, y - 3, '#8ad0ff'); rect(g, x - 4, y, 3, 2, '#3a2a1e'); },
  samovar(g, x, y){ rect(g, x - 2, y - 3, 12, 6, '#8a6a2a'); rect(g, x - 2, y - 3, 12, 1, '#d8b060'); rect(g, x + 10, y - 2, 4, 4, '#3a3a40');
    for(let i = 0; i < 3; i++) px(g, x + 13, y - 1 + i, '#9aa4b4'); rect(g, x + 2, y - 5, 4, 2, '#5a4a2a'); }
};
function hojaBrazo(color, colS, guante, arma, tam){
  tam = tam || 1; const fw = Math.round(22*tam), fh = Math.round(12*tam), ox = 3*tam, oy = fh/2;
  const hoja = hacerHoja(fw, fh, [g => {
    linea(g, ox, oy, ox + 4*tam, oy, 3*tam, color); linea(g, ox + 4*tam, oy, ox + 8*tam, oy, 2.4*tam, color);
    linea(g, ox, oy + 1, ox + 8*tam, oy + 1, 1, colS);
    disco(g, ox + 9*tam, oy, 1.6*tam, guante);
    ARMAS_SPR[arma](g, ox + 9*tam, oy - 0.5, tam);
  }]);
  hoja.pivote = {x:ox, y:oy}; hoja.boca = {x:ox + 9*tam + ({pistola:5, escopeta:8, subfusil:7, rifle:10, samovar:14})[arma]*1, y:oy - 1};
  return hoja;
}

/* ---------- Mateo: el mate que habla (y que capaz no existe) ---------- */
function hojaMateo(){
  const cuadro = (ojos, boca) => g => {
    disco(g, 9, 13, 6.2, '#8a5a2e'); disco(g, 8, 12, 5, '#a8703a'); rect(g, 4, 5, 10, 3, '#c8ccd4'); rect(g, 4, 5, 10, 1, '#eef0f4');   /* calabaza y virola */
    rect(g, 5, 4, 8, 2, '#5aa83a'); px(g, 6, 4, '#8ad85a'); px(g, 10, 3, '#8ad85a');                                                /* la yerba */
    linea(g, 11, 4, 14, -2 + 3, 1, '#d8dce4'); rect(g, 13, 0, 2, 2, '#eef0f4');                                                     /* la bombilla */
    if(ojos){ rect(g, 6, 10, 2, 3, '#fff8ec'); rect(g, 10, 10, 2, 3, '#fff8ec'); px(g, 7, 11, K); px(g, 11, 11, K); } else { rect(g, 6, 12, 2, 1, K); rect(g, 10, 12, 2, 1, K); }
    if(boca === 1){ rect(g, 8, 15, 3, 2, '#3a1010'); px(g, 9, 16, '#d85a5a'); } else if(boca === 2){ rect(g, 8, 15, 3, 1, '#3a1010'); } else { px(g, 8, 15, K); px(g, 9, 16, K); px(g, 10, 15, K); }
    px(g, 5, 14, '#d88a5a'); px(g, 13, 14, '#d88a5a');
  };
  return hacerHoja(20, 22, [cuadro(true, 0), cuadro(false, 0), cuadro(true, 1), cuadro(true, 2)],
    {emisivo:(g, i) => { rect(g, 6, 10, 2, 3, '#6a6050'); rect(g, 10, 10, 2, 3, '#6a6050'); }});
}

/* ---------- objetos ---------- */
function hojaObjetos(){
  const d = {};
  d.garrafa = hacerHoja(12, 16, [g => { rect(g, 2, 3, 8, 12, '#d8581a'); rect(g, 3, 3, 2, 12, '#ff8a3a'); rect(g, 4, 1, 4, 2, '#8a8a92'); rect(g, 3, 8, 6, 1, '#f2c14e'); rect(g, 2, 14, 8, 1, '#8a2a0a'); }],
    {emisivo:g => { rect(g, 3, 8, 6, 1, '#402000'); }});
  d.chapa = hacerHoja(10, 14, [g => { disco(g, 5, 7, 4.6, '#b8c0cc'); disco(g, 4, 6, 3, '#e0e6ee'); disco(g, 5, 7, 1.5, '#8a929e'); rect(g, 4, 0, 2, 3, '#4a4a52'); }]);
  d.puerta = hacerHoja(20, 34, [g => { rect(g, 1, 1, 18, 33, '#1a3a24'); rect(g, 3, 3, 14, 29, '#2e8a4a'); rect(g, 4, 4, 5, 12, '#5ad87a'); rect(g, 11, 4, 5, 12, '#5ad87a');
    rect(g, 4, 18, 5, 12, '#3aa85a'); rect(g, 11, 18, 5, 12, '#3aa85a'); rect(g, 14, 17, 2, 2, '#f2c14e'); }],
    {emisivo:g => { rect(g, 4, 4, 5, 12, '#2a8a4a'); rect(g, 11, 4, 5, 12, '#2a8a4a'); rect(g, 1, 1, 18, 1, '#5ad87a'); }});
  d.caja = hacerHoja(16, 16, [g => { rect(g, 0, 0, 16, 16, '#7a5a34'); rect(g, 1, 1, 14, 14, '#9a7444'); linea(g, 2, 2, 13, 13, 2, '#6a4a28'); rect(g, 0, 7, 16, 2, '#5a3e22');
    rect(g, 4, 10, 8, 3, '#e8d8a8'); px(g, 6, 11, '#8a2a1a'); px(g, 9, 11, '#8a2a1a'); }], {sombrear:false});
  return d;
}
