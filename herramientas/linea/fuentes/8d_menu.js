/* ================================================================ menús
   Todo en la misma grilla de píxeles, encima de un fondo de neón que late. Los botones se registran al
   dibujarse y se eligen al soltar el dedo sobre el mismo botón. */
const PROG = Object.assign({abierto:0, caps:{}, mascara:'carpincho'}, leer('linea.progreso', {}));
if(typeof PROG.caps !== 'object' || !PROG.caps) PROG.caps = {}; PROG.abierto = lim(+PROG.abierto || 0, 0, 4);
function guardarProg(){ guardar('linea.progreso', PROG); }
const UI = {p:'idioma', t:0, botones:[], presion:null, res:null, elegir:null, desde:null};
const META_CAP = {
  prologo: {num:'PRÓLOGO', nombre:'LA PRUEBA', fecha:'3 DE MARZO DE 1989', lugar:'FLORESTA', col:'#ffd84a'},
  once:    {num:'CAPÍTULO 1', nombre:'TARIFA SOCIAL', fecha:'14 DE ABRIL DE 1989', lugar:'ONCE', col:'#ff5ad8'},
  bailanta:{num:'CAPÍTULO 2', nombre:'NOCHE DE CUMBIA', fecha:'20 DE MAYO DE 1989', lugar:'CONSTITUCIÓN', col:'#5ae8ff'},
  deposito:{num:'CAPÍTULO 3', nombre:'LA HIPER', fecha:'29 DE MAYO DE 1989', lugar:'DOCK SUD', col:'#5affa0'},
  mansion: {num:'CAPÍTULO 4', nombre:'EL PATRÓN', fecha:'9 DE JULIO DE 1989', lugar:'SAN ISIDRO', col:'#ff3a5a'}
};
const INFO_MASC = {carpincho:['CARPINCHO', 'EL DE SIEMPRE. SIN VENTAJAS'], condor:['CÓNDOR', 'CORRÉS MÁS RÁPIDO'], yaguarete:['YAGUARETÉ', 'LAS PIÑAS MATAN'],
  hornero:['HORNERO', 'LOS PORTAZOS MATAN'], mulita:['MULITA', 'AGUANTÁS UN TIRO'], vizcacha:['VIZCACHA', 'MÁS BALAS EN CADA ARMA']};
const mascaraAbierta = k => MASCARAS.indexOf(k) <= Object.keys(PROG.caps).length;
function uiActiva(){ return J.modo === 'menu' || J.modo === 'resultado' || J.pausa; }
function irA(p){ UI.p = p; UI.t = 0; UI.presion = null; SON.fx('desliza_menu'); }
/* temporizadores que corren con el juego y se descartan si cambió la carga */
const LUEGO = [];
function luego(seg, fn){ LUEGO.push({t:seg, fn, gen:J.gen}); }
function pasoLuego(dt){ for(let i = LUEGO.length - 1; i >= 0; i--){ const l = LUEGO[i]; l.t -= dt; if(l.t <= 0){ LUEGO.splice(i, 1); if(l.gen === J.gen) try { l.fn(); } catch(e){ console.error(e); } } } }

/* ---------- piezas ---------- */
function marco(g, x, y, w, h, fondo, borde){ g.fillStyle = fondo || 'rgba(10,4,20,0.86)'; g.fillRect(x, y, w, h);
  g.fillStyle = borde || '#ff3aa8'; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); }
function boton(g, id, x, y, w, h, label, opc){
  opc = opc || {}; x = Math.round(x); y = Math.round(y);
  const ap = UI.presion === id, apag = opc.apagado, dy = ap ? 1 : 0;
  UI.botones.push({id, x, y, w, h, fn:opc.fn, apagado:apag});
  g.fillStyle = K; g.fillRect(x - 1, y - 1, w + 2, h + 3);
  const base = apag ? '#241a30' : opc.principal ? '#c01a78' : opc.color || '#2a1a48';
  g.fillStyle = base; g.fillRect(x, y + dy, w, h);
  g.fillStyle = apag ? '#34283e' : opc.principal ? '#ff4aa8' : '#4a3278'; g.fillRect(x, y + dy, w, 1);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + dy + h - 2, w, 2);
  if(!ap){ g.fillStyle = '#05030a'; g.fillRect(x, y + h, w, 2); }
  if(opc.sel){ g.fillStyle = '#5ae8ff'; g.fillRect(x, y + dy, 2, h); g.fillRect(x + w - 2, y + dy, 2, h); }
  texto(g, label, x + w/2, y + dy + Math.round(h/2 - 6), apag ? 'gris' : opc.grad || 'blanco');
}
/* letras gordas: cada píxel de la fuente es un bloque, con degradé, canto en 3D y contorno */
function letrasGordas(str, B, cols, canto, colCanto){
  const f = lienzoTexto(str, 'blanco', {sinBorde:true}), d = f.getContext('2d').getImageData(0, 0, f.width, f.height).data, fw = f.width, fh = f.height;
  const on = (x, y) => x >= 0 && y >= 0 && x < fw && y < fh && d[(y*fw + x)*4 + 3] > 40;
  let y0 = fh, y1 = 0; for(let y = 0; y < fh; y++) for(let x = 0; x < fw; x++) if(on(x, y)){ y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const P2 = 2, E = canto, w = fw*B + P2*2, h = (y1 - y0 + 1)*B + P2*2 + E, [c, g] = lienzo(w, h), [m, gm] = lienzo(w, h);
  for(let y = y0; y <= y1; y++) for(let x = 0; x < fw; x++) if(on(x, y)) gm.fillRect(P2 + x*B, P2 + (y - y0)*B, B, B);
  const md = gm.getImageData(0, 0, w, h).data, M2 = (x, y) => x >= 0 && y >= 0 && x < w && y < h && md[(y*w + x)*4 + 3] > 0, hh = (y1 - y0 + 1)*B;
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
    if(M2(x, y)){ const k = lim((y - P2)/hh, 0, 0.999); g.fillStyle = !M2(x, y - 1) || !M2(x - 1, y) ? '#fff8ff' : !M2(x + 1, y) || !M2(x, y + 1) ? cols[cols.length - 1] : cols[Math.floor(k*cols.length)]; g.fillRect(x, y, 1, 1); continue; }
    let prof = 0; for(let e = 1; e <= E; e++) if(M2(x, y - e)){ prof = e; break; }
    if(prof){ g.fillStyle = colCanto[Math.min(colCanto.length - 1, prof - 1)]; g.fillRect(x, y, 1, 1); } }
  const cd = g.getImageData(0, 0, w, h).data, C2 = (x, y) => x >= 0 && y >= 0 && x < w && y < h && cd[(y*w + x)*4 + 3] > 0;
  g.fillStyle = K; for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(!C2(x, y) && (C2(x - 1, y) || C2(x + 1, y) || C2(x, y - 1) || C2(x, y + 1))) g.fillRect(x, y, 1, 1);
  return c;
}
let _LOGO = null;
function logo(g, cx, y, esc){
  if(!_LOGO){ const a = letrasGordas('LÍNEA', 4, ['#ffe8f8', '#ff9ad8', '#ff4ab0', '#e01888', '#a00868'], 5, ['#5a0a8a', '#3a0660', '#1a0230']),
      b = letrasGordas('CALIENTE', 3, ['#ffffc0', '#ffe060', '#ffb030', '#ff7020', '#d04010'], 4, ['#8a2a08', '#5a1404', '#300802']);
    const w = Math.max(a.width, b.width), [c, gc] = lienzo(w, a.height + b.height - 4); gc.drawImage(a, Math.round(w/2 - a.width/2), 0); gc.drawImage(b, Math.round(w/2 - b.width/2), a.height - 4); _LOGO = c; }
  const c = _LOGO, e = esc || 1, w = c.width*e, h = c.height*e, x0 = Math.round(cx - w/2), t = J.tr;
  /* ondula por columnas, como la tapa de un casete gastado */
  for(let i = 0; i < c.width; i += 2){ const dy = Math.round(Math.sin(t*2.4 + i*0.045)*3*e);
    g.drawImage(c, i, 0, 2, c.height, x0 + i*e, y + dy, 2*e, h); }
  return {x:x0, y, w, h};
}
function bandera(g, k, x, y){
  g.fillStyle = K; g.fillRect(x - 1, y - 1, 20, 14);
  if(k === 'es'){ rect(g, x, y, 18, 4, '#74acdf'); rect(g, x, y + 4, 18, 4, '#f4f4f4'); rect(g, x, y + 8, 18, 4, '#74acdf'); rect(g, x + 8, y + 5, 2, 2, '#f6b40e'); px(g, x + 7, y + 6, '#f6b40e'); px(g, x + 10, y + 5, '#f6b40e'); px(g, x + 9, y + 4, '#f6b40e'); px(g, x + 8, y + 7, '#f6b40e'); }
  else if(k === 'en'){ rect(g, x, y, 18, 12, '#1e3a8a'); for(let i = 0; i < 18; i++){ const j = Math.round(i*11/17); px(g, x + i, y + j, '#f4f4f4'); px(g, x + i, y + 11 - j, '#f4f4f4'); px(g, x + i, y + Math.min(11, j + 1), '#c8102e'); }
    rect(g, x + 7, y, 4, 12, '#f4f4f4'); rect(g, x, y + 4, 18, 4, '#f4f4f4'); rect(g, x + 8, y, 2, 12, '#c8102e'); rect(g, x, y + 5, 18, 2, '#c8102e'); }
  else { rect(g, x, y, 18, 12, '#009b3a'); for(let j = 0; j < 12; j++){ const w2 = Math.round(8*(1 - Math.abs(j - 5.5)/6)); rect(g, x + 9 - w2, y + j, w2*2, 1, '#fedf00'); } disco(g, x + 9, y + 6, 3, '#002776'); rect(g, x + 7, y + 6, 5, 1, '#f4f4f4'); }
}
/* el fondo del menú: un atardecer de neón que cambia de color, soles de rayas, la ciudad y el Obelisco */
function fondoMenu(g){
  const t = J.tr, k = 0.5 + Math.sin(t*0.4)*0.5;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, k > 0.5 ? '#1a0630' : '#061a30'); gr.addColorStop(0.55, `rgb(${Math.round(200 + 55*k)},${Math.round(40 + 60*(1 - k))},${Math.round(140 + 60*(1 - k))})`); gr.addColorStop(1, '#ffb84a');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* cuadros que giran desde el centro */
  g.save(); g.translate(W/2, H*0.45);
  for(let i = 0; i < 9; i++){ const s = ((t*22 + i*34) % 306), a = t*0.25 + i*0.12; g.save(); g.rotate(a); g.strokeStyle = i % 2 ? 'rgba(90,232,255,0.22)' : 'rgba(255,90,216,0.22)'; g.lineWidth = 2; g.strokeRect(-s/2, -s/2, s, s); g.restore(); }
  g.restore();
  const sy = Math.round(H*0.62); disco(g, W/2, sy, 44, '#ffe070');
  for(let i = 0; i < 7; i++){ g.fillStyle = 'rgba(232,40,120,0.9)'; g.fillRect(W/2 - 46, sy + 4 + i*6 - Math.floor(t*6) % 6, 92, 2 + (i >> 1)); }
  const base = Math.round(H*0.84); g.fillStyle = '#12061e';
  for(let x = 0; x < W; x += 8){ const hh = 12 + ((x*37) % 31) + ((x*13) % 13); g.fillRect(x, base - hh, 8, hh); }
  g.fillRect(0, base, W, H - base); const ox = Math.round(W*0.5); g.beginPath(); g.moveTo(ox - 5, base); g.lineTo(ox - 3, base - 80); g.lineTo(ox, base - 87); g.lineTo(ox + 3, base - 80); g.lineTo(ox + 5, base); g.fill();
  for(let y = base + 3; y < H; y += 4){ g.fillStyle = 'rgba(255,90,216,0.35)'; g.fillRect(0, y, W, 1); }
  for(let i = 0; i < 30; i++){ const x = (i*53) % W, y = base - 4 - (i*29) % 30; if(Math.sin(t + i) > 0.1) px(g, x, y, '#ffd84a'); }
  if(UI.p === 'titulo' || UI.p === 'principal') logo(g, W/2, Math.round(H*(UI.p === 'titulo' ? 0.16 : 0.06)), W > 420 ? 1 : 1);
}

/* ---------- las pantallas ---------- */
const PANTALLAS = {
  idioma(g){
    g.fillStyle = 'rgba(6,2,12,0.6)'; g.fillRect(0, 0, W, H);
    texto(g, 'IDIOMA · LANGUAGE · IDIOMA', W/2, Math.round(H*0.12), 'oro');
    const op = [['es', 'ESPAÑOL'], ['en', 'ENGLISH'], ['pt', 'PORTUGUÊS']], w = Math.min(170, W - 60), x = Math.round(W/2 - w/2);
    op.forEach(([k, nom], i) => { const y = Math.round(H*0.28) + i*Math.round(H*0.2);
      boton(g, 'idi' + k, x, y, w, 24, '', {sel:IDIOMA === k, fn:() => { ponerIdioma(k); _LOGO = null; irA(AJ.visto ? 'titulo' : 'censura'); }});
      bandera(g, k, x + 10, y + 6); texto(g, nom, x + w/2 + 8, y + 6, IDIOMA === k ? 'cian' : 'blanco'); });
  },
  censura(g){
    g.fillStyle = 'rgba(6,2,12,0.82)'; g.fillRect(0, 0, W, H);
    textoOnda(g, tr('ADVERTENCIA'), W/2, Math.round(H*0.1), 'rojo', 2, 1, J.tr*4);
    const l = [tr('ESTE JUEGO TIENE VIOLENCIA GRÁFICA Y SANGRE.'), tr('EL MODO CENSURA LA CAMBIA POR ESTRELLITAS,'), tr('CONFITE Y GOLPES DE DIBUJITO.'), tr('SE PUEDE CAMBIAR CUANDO QUIERAS EN OPCIONES.')];
    l.forEach((s, i) => texto(g, s, W/2, Math.round(H*0.3) + i*13, i === 3 ? 'gris' : 'blanco'));
    const w = Math.min(150, (W - 40)/2), y = Math.round(H*0.68);
    boton(g, 'sinc', W/2 - w - 6, y, w, 24, tr('SIN CENSURA'), {principal:true, fn:() => { AJ.censura = false; AJ.visto = true; guardar('linea.ajustes', AJ); irA('titulo'); }});
    boton(g, 'conc', W/2 + 6, y, w, 24, tr('CON CENSURA'), {color:'#1a4a68', fn:() => { AJ.censura = true; AJ.visto = true; guardar('linea.ajustes', AJ); irA('titulo'); }});
  },
  titulo(g){
    texto(g, tr('BUENOS AIRES · 1989'), W/2, Math.round(H*0.62), 'cian');
    if(Math.floor(J.tr*2) % 2 === 0) textoOnda(g, tr('TOCÁ PARA EMPEZAR'), W/2, Math.round(H*0.78), 'blanco', 1, 1.2, J.tr*5);
  },
  principal(g){
    const w = 150, x = Math.round(W/2 - w/2); let y = Math.round(H*0.44); const dy = 26;
    const sig = Math.min(PROG.abierto, CAPITULOS.length - 1), todo = Object.keys(PROG.caps).length >= CAPITULOS.length;
    boton(g, 'jugar', x, y, w, 21, todo ? tr('CAPÍTULOS') : sig ? tr('SEGUIR') : tr('JUGAR'), {principal:true, fn:() => todo ? irA('capitulos') : jugarCap(sig)}); y += dy;
    boton(g, 'caps', x, y, w, 21, tr('CAPÍTULOS'), {fn:() => irA('capitulos')}); y += dy;
    boton(g, 'masc', x, y, w, 21, tr('MÁSCARAS'), {fn:() => { UI.elegir = null; irA('mascaras'); }}); y += dy;
    boton(g, 'opc', x, y, w, 21, tr('OPCIONES'), {fn:() => { UI.desde = 'principal'; irA('opciones'); }});
    if(AJ.censura) texto(g, tr('MODO CENSURA'), W - 8, H - 14, 'cian', {der:true});
    /* la dificultad se cambia desde acá con un toque */
    boton(g, 'dif', W - 96, 6, 88, 18, AJ.dificultad === 'facil' ? tr('FÁCIL') : tr('NORMAL'), {color:AJ.dificultad === 'facil' ? '#1a6a48' : '#2a1a48', fn:() => { AJ.dificultad = AJ.dificultad === 'facil' ? 'normal' : 'facil'; guardar('linea.ajustes', AJ); }});
    texto(g, tr('DIFICULTAD'), W - 52, 27, 'gris');
    texto(g, 'BETA 0.9', 8, H - 14, 'gris', {izq:true});
  },
  capitulos(g){
    g.fillStyle = 'rgba(6,2,12,0.72)'; g.fillRect(0, 0, W, H);
    textoOnda(g, tr('CAPÍTULOS'), W/2, 8, 'rosa', 2, 1, J.tr*4);
    /* cada capítulo es un casete, con su nota escrita a mano */
    const n = CAPITULOS.length, cw = Math.min(84, Math.floor((W - 20)/n) - 6), gap = 6, x0 = Math.round(W/2 - (n*cw + (n - 1)*gap)/2), y = 40, ch = 108;
    CAPITULOS.forEach((c, i) => { const M = META_CAP[c.id], x = x0 + i*(cw + gap), ab = i <= PROG.abierto, r = PROG.caps[c.id];
      UI.botones.push({id:'cap' + i, x, y, w:cw, h:ch, apagado:!ab, fn:() => jugarCap(i)}); const ap = UI.presion === 'cap' + i ? 1 : 0;
      g.fillStyle = K; g.fillRect(x - 1, y - 1 + ap, cw + 2, ch + 2); g.fillStyle = ab ? '#1a1024' : '#141018'; g.fillRect(x, y + ap, cw, ch);
      g.fillStyle = ab ? M.col : '#3a3040'; g.fillRect(x, y + ap, cw, 4); g.fillRect(x, y + ap + ch - 4, cw, 4);
      /* la ventanita con los carretes */
      rect(g, x + 8, y + ap + 44, cw - 16, 18, '#0a0610'); disco(g, x + 18, y + ap + 53, 5, ab ? '#e8e0f0' : '#4a4050'); disco(g, x + cw - 18, y + ap + 53, 5, ab ? '#e8e0f0' : '#4a4050');
      disco(g, x + 18, y + ap + 53, 2, '#0a0610'); disco(g, x + cw - 18, y + ap + 53, 2, '#0a0610');
      texto(g, tr(M.num), x + cw/2, y + ap + 8, ab ? 'blanco' : 'gris');
      partir(tr(M.nombre), Math.floor((cw - 4)/6)).slice(0, 2).forEach((s, k) => texto(g, s, x + cw/2, y + ap + 20 + k*11, ab ? 'oro' : 'gris'));
      if(!ab) texto(g, '?', x + cw/2, y + ap + 72, 'gris');
      else if(r){ textoOnda(g, r.nota, x + cw/2, y + ap + 68, r.nota[0] === 'A' ? 'rosa' : 'cian', 2, 1, J.tr*3 + i); texto(g, String(r.puntos), x + cw/2, y + ap + 92, 'gris'); } });
    boton(g, 'volv', 8, H - 26, 70, 20, tr('VOLVER'), {fn:() => irA('principal')});
  },
  mascaras(g){
    g.fillStyle = 'rgba(6,2,12,0.75)'; g.fillRect(0, 0, W, H);
    textoOnda(g, tr('ELEGÍ TU MÁSCARA'), W/2, 8, 'rosa', 2, 1, J.tr*4);
    const cw = Math.min(70, Math.floor((W - 30)/6) - 4), x0 = Math.round(W/2 - (6*cw + 5*4)/2), y = 42;
    MASCARAS.forEach((k, i) => { const x = x0 + i*(cw + 4), ab = mascaraAbierta(k), sel = JUG.mascara === k;
      UI.botones.push({id:'m' + k, x, y, w:cw, h:70, apagado:!ab, fn:() => { JUG.mascara = k; PROG.mascara = k; guardarProg(); SON.fx('mascara'); }});
      g.fillStyle = K; g.fillRect(x - 1, y - 1, cw + 2, 72); g.fillStyle = sel ? '#3a1a5a' : '#1a1024'; g.fillRect(x, y, cw, 70);
      if(sel){ g.fillStyle = '#5ae8ff'; g.fillRect(x, y, cw, 1); g.fillRect(x, y + 69, cw, 1); g.fillRect(x, y, 1, 70); g.fillRect(x + cw - 1, y, 1, 70); }
      const im = ARTE.cabeza[k], e = 3, bob = sel ? Math.round(Math.sin(J.tr*4)*2) : 0;
      if(ab){ g.save(); g.translate(x + cw/2, y + 26 + bob); g.rotate(-Math.PI/2); g.drawImage(im, -7*e, -7*e, 14*e, 14*e); g.restore(); }
      else texto(g, '?', x + cw/2, y + 20, 'gris');
      texto(g, ab ? tr(INFO_MASC[k][0]) : '???', x + cw/2, y + 54, sel ? 'cian' : ab ? 'blanco' : 'gris'); });
    const I = INFO_MASC[JUG.mascara]; texto(g, tr(I[1]), W/2, y + 82, 'oro');
    if(UI.elegir !== null) boton(g, 'vamos', W/2 - 60, H - 34, 120, 24, tr('¡VAMOS!'), {principal:true, fn:() => { const i = UI.elegir; UI.elegir = null; empezarCap(i); }});
    else boton(g, 'volv', 8, H - 26, 70, 20, tr('VOLVER'), {fn:() => irA('principal')});
  },
  opciones(g){
    g.fillStyle = 'rgba(6,2,12,0.8)'; g.fillRect(0, 0, W, H);
    textoOnda(g, tr('OPCIONES'), W/2, 6, 'rosa', 2, 1, J.tr*4);
    const onoff = v => v ? tr('SÍ') : tr('NO'), nIdi = {es:'ESPAÑOL', en:'ENGLISH', pt:'PORTUGUÊS'}, dist = ['es', 'en', 'pt'];
    const filas = [
      [tr('IDIOMA'), nIdi[IDIOMA], d => { ponerIdioma(dist[(dist.indexOf(IDIOMA) + d + 3) % 3]); _LOGO = null; }],
      [tr('MÚSICA'), Math.round(AJ.musica*10) + '/10', d => { AJ.musica = lim(Math.round(AJ.musica*10 + d)/10, 0, 1); SON.volumen(); }],
      [tr('EFECTOS'), Math.round(AJ.efectos*10) + '/10', d => { AJ.efectos = lim(Math.round(AJ.efectos*10 + d)/10, 0, 1); SON.volumen(); SON.fx('pina'); }],
      [tr('DIFICULTAD'), AJ.dificultad === 'facil' ? tr('FÁCIL') : tr('NORMAL'), () => { AJ.dificultad = AJ.dificultad === 'facil' ? 'normal' : 'facil'; if(J.modo === 'juego' && !JUG.muerto) JUG.vida = Math.min(JUG.vida, vidaMax()); }],
      [tr('MODO CENSURA'), onoff(AJ.censura), () => { AJ.censura = !AJ.censura; }],
      [tr('BALANCEO DE CÁMARA'), onoff(AJ.balanceo), () => { AJ.balanceo = !AJ.balanceo; }],
      [tr('EFECTOS VISUALES'), AJ.visual === 'alta' ? tr('ALTOS') : tr('BAJOS'), () => { AJ.visual = AJ.visual === 'alta' ? 'baja' : 'alta'; }],
      [tr('VIBRACIÓN'), onoff(AJ.vibrar), () => { AJ.vibrar = !AJ.vibrar; vibrar(30); }]];
    const w = Math.min(300, W - 30), x = Math.round(W/2 - w/2), dy = Math.min(22, Math.floor((H - 70)/filas.length));
    filas.forEach(([nom, val, fn], i) => { const y = 30 + i*dy; g.fillStyle = i % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)'; g.fillRect(x, y - 2, w, dy - 2);
      texto(g, nom, x + 6, y + 2, 'blanco', {izq:true});
      boton(g, 'o' + i + 'a', x + w - 118, y, 18, dy - 6, '◀', {fn:() => { fn(-1); guardar('linea.ajustes', AJ); }});
      texto(g, val, x + w - 60, y + 2, 'cian');
      boton(g, 'o' + i + 'b', x + w - 20, y, 18, dy - 6, '▶', {fn:() => { fn(1); guardar('linea.ajustes', AJ); }}); });
    boton(g, 'volv', 8, H - 26, 70, 20, tr('VOLVER'), {fn:() => { irA(UI.desde || 'principal'); }});
  },
  pausa(g){
    g.fillStyle = 'rgba(6,2,12,0.7)'; g.fillRect(0, 0, W, H);
    textoOnda(g, tr('PAUSA'), W/2, Math.round(H*0.14), 'rosa', 3, 1.2, J.tr*4);
    const w = 160, x = Math.round(W/2 - w/2); let y = Math.round(H*0.42);
    boton(g, 'seg', x, y, w, 21, tr('SEGUIR'), {principal:true, fn:() => { J.pausa = false; }}); y += 26;
    boton(g, 'rein', x, y, w, 21, tr('REINTENTAR PISO'), {fn:() => { J.pausa = false; reintentar(); }}); y += 26;
    boton(g, 'opc', x, y, w, 21, tr('OPCIONES'), {fn:() => { UI.desde = 'pausa'; irA('opciones'); }}); y += 26;
    boton(g, 'sal', x, y, w, 21, tr('SALIR AL MENÚ'), {fn:() => volverAlMenu()});
  },
  resultado(g){
    const R2 = UI.res, t = UI.t; g.fillStyle = 'rgba(6,2,12,0.78)'; g.fillRect(0, 0, W, H);
    const M = META_CAP[J.cap.id]; textoOnda(g, tr(M.nombre), W/2, 6, 'rosa', 2, 1, J.tr*4); if(R2.facil) texto(g, tr('MODO FÁCIL'), W - 8, 8, 'verde', {der:true});
    const x = Math.round(W*0.12), w = Math.round(W*0.5);
    R2.filas.forEach(([nom, val, pts], i) => { const ti = 0.5 + i*0.45; if(t < ti) return; if(!R2.son[i]){ R2.son[i] = true; SON.fx('puntos', {n:i}); }
      const y = 34 + i*15; texto(g, nom, x, y, 'blanco', {izq:true}); texto(g, val, x + w - 60, y, 'cian', {der:true}); texto(g, pts, x + w, y, 'oro', {der:true}); });
    const tf = 0.5 + R2.filas.length*0.45 + 0.3;
    if(t > tf){ const y = 34 + R2.filas.length*15 + 4; g.fillStyle = '#ff5ad8'; g.fillRect(x, y, w, 1); texto(g, tr('TOTAL'), x, y + 5, 'rosa', {izq:true}); texto(g, String(R2.total), x + w, y + 5, 'rosa', {der:true}); }
    /* la nota: se estampa con un golpe */
    const tn = tf + 0.5;
    if(t > tn){ if(!R2.sello){ R2.sello = true; SON.fx('sello'); CAMARA.sacude = 1; POST.destello = 0.25; vibrar(40); }
      const k = lim((t - tn)/0.18, 0, 1), e = Math.round(lerp(9, 5, k)), cx = Math.round(W*0.8), cy = Math.round(H*0.42);
      g.save(); g.translate(cx, cy); g.rotate(-0.18); const c = lienzoTexto(R2.nota, R2.nota[0] === 'A' ? 'rosa' : R2.nota === 'B' ? 'cian' : 'oro');
      g.drawImage(c, -c.width*e/2, -c.height*e/2, c.width*e, c.height*e); g.restore();
      texto(g, tr('NOTA'), cx, cy - 44, 'gris'); if(R2.record) textoOnda(g, tr('¡RÉCORD!'), cx, cy + 36, 'oro', 1, 1.5, J.tr*6); }
    if(t > tn + 0.6) boton(g, 'cont', W/2 - 70, H - 30, 140, 22, tr('CONTINUAR'), {principal:true, fn:() => seguirTrasResultado()});
  }
};
function dibujarUI(g){ const f = PANTALLAS[UI.p]; if(f) f(g); }
function uiBoton(x, y){ return UI.botones.find(b => x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y - 3 && y <= b.y + b.h + 4); }
function uiDown(x, y){
  if(UI.p === 'titulo' && J.modo === 'menu'){ irA('principal'); SON.fx('titulo'); SON.musica('menu'); return; }
  const b = uiBoton(x, y); UI.presion = b && !b.apagado ? b.id : null; if(UI.presion) SON.fx('clic');
}
function uiUp(x, y){
  const b = uiBoton(x, y), id = UI.presion; UI.presion = null;
  if(b && b.id === id && b.fn){ SON.fx('boton'); vibrar(10); b.fn(); }
}

/* ---------- el flujo entre menú, cinemáticas y juego ---------- */
function volverAlMenu(){ J.modo = 'menu'; UI.p = 'principal'; UI.t = 0; J.pausa = false; J.cine = null; J.cap = null; J.gen++;
  SON.musica('menu'); SON.ambiente(null); SON.intensidad(0); SON.filtroMuerte(false); SON.cinta(0.25); POST.rojo = 0; }
function jugarCap(i){ J.pausa = false; empezarCine(CAPITULOS[i].id, () => { J.modo = 'menu'; UI.elegir = i; irA('mascaras'); SON.musica('menu'); SON.cinta(0.25); }); }
function empezarCap(i){
  const cap = CAPITULOS[i]; J.cap = cap; J.capIdx = i; ESTADOS_PISO.length = 0;
  if(!mascaraAbierta(JUG.mascara)) JUG.mascara = 'carpincho';
  Object.assign(J, {puntos:0, combo:0, comboT:0, maxCombo:0, bajas:0, reloj:0, capLimpio:false, limpio:false, pista:0, pisteo:{t:0, anda:0}, fin:null, aviso:null, avisoT:0, textos:[], hitstop:0});
  J.armasUsadas = new Set(); JUG.arma = null; JUG.balas = 0; J.armaEntrada = null; J.puntosEntrada = 0; J.desdeEntrada = undefined; J.salidaLista = true;
  cargarPiso(0); J.modo = 'juego'; J.pausa = false; J.fundido = 1; POST.rojo = 0;
  SON.musica(cap.musica); SON.ambiente(cap.ambiente); SON.cinta(0); SON.fx('auto');
  aviso(tr(META_CAP[cap.id].lugar), 2.5);
}
function reintentar(){ if(!J.cap) return; reiniciarPiso(); J.fundido = 0.7; POST.rojo = 0; SON.fx('pagina'); if(!J.limpio) SON.musica(J.cap.musica); }
function pausar(){ if(J.modo !== 'juego' || J.cine || JUG.muerto) return; J.pausa = !J.pausa; UI.p = 'pausa'; UI.t = 0; SON.fx(J.pausa ? 'boton' : 'clic'); }
/* la nota: puntos, combo, variedad y rapidez contra lo que vale el capítulo */
function terminarCapitulo(){
  if(J.modo !== 'juego') return;
  SON.fx('auto'); J.modo = 'resultado'; J.gen++;
  const total = J.cap.pisos.reduce((s, p) => s + p.enemigos.length, 0), limite = total*9;
  const bCombo = J.maxCombo*250, bVar = J.armasUsadas.size*400, bTiempo = Math.round(Math.max(0, limite - J.reloj)*25);
  const suma = J.puntos + bCombo + bVar + bTiempo, ref = total*1600, k = suma/ref;
  const nota = k >= 1.5 ? "A+" : k >= 1.2 ? "A" : k >= 0.95 ? "B" : k >= 0.7 ? "C" : "D";
  const mm = Math.floor(J.reloj/60), ss = String(Math.floor(J.reloj % 60)).padStart(2, '0');
  const ant = PROG.caps[J.cap.id], record = !ant || suma > ant.puntos;
  const orden = ['D', 'C', 'B', 'A', 'A+'];
  PROG.caps[J.cap.id] = {puntos:Math.max(suma, ant ? ant.puntos : 0), nota:ant && orden.indexOf(ant.nota) > orden.indexOf(nota) ? ant.nota : nota};
  PROG.abierto = Math.max(PROG.abierto, Math.min(CAPITULOS.length - 1, J.capIdx + 1)); guardarProg();
  UI.res = {filas:[[tr('BAJAS'), String(J.bajas), String(J.puntos)], [tr('COMBO MÁXIMO'), '×' + J.maxCombo, '+' + bCombo], [tr('ARMAS DISTINTAS'), String(J.armasUsadas.size), '+' + bVar], [tr('TIEMPO'), mm + ':' + ss, '+' + bTiempo]],
    total:suma, nota, record, son:[], sello:false, facil:AJ.dificultad === 'facil'};
  SON.musica('puntaje'); SON.ambiente(null); SON.intensidad(0); J.pausa = false; UI.p = 'resultado'; UI.t = 0;
}
function seguirTrasResultado(){
  const i = J.capIdx + 1;
  if(i >= CAPITULOS.length){ empezarCine('fin', () => volverAlMenu()); return; }
  jugarCap(i);
}
