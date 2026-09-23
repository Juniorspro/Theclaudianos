/* ================================================================ menús
   Todo se dibuja en la misma grilla de píxeles que el juego, encima del puerto vivo. Los botones se
   registran al dibujarse y se eligen al soltar el dedo sobre el mismo botón. */
const PROG = Object.assign({abierto:0, niveles:{}, vistos:{}}, leer('mate.progreso', {}));
function guardarProg(){ guardar('mate.progreso', PROG); }
const UI = {p:'titulo', t:0, botones:[], presion:null, aviso:null, desde:null, res:null, tip:0};
const CAPS = [{id:'puerto', nombre:'EL PUERTO', grad:'azul', niveles:[0, 1, 2]}, {id:'fabrica', nombre:'LA FÁBRICA', grad:'fuego', niveles:[3, 4, 5]}, {id:'torre', nombre:'LA TORRE', grad:'violeta', niveles:[6, 7, 8]}];
const CINE_ANTES = {0:'intro', 3:'cap2', 6:'cap3', 8:'jefe'};
function uiActiva(){ return J.modo === 'menu' || J.modo === 'resultado' || J.modo === 'muerte' || J.pausa; }
function irA(p){ UI.p = p; UI.t = 0; UI.presion = null; SON.fx('desliza_menu'); }

/* ---------- piezas de dibujo ---------- */
const ESTRELLA = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'];
function estrella(g, x, y, llena, esc){ esc = esc || 1;
  ESTRELLA.forEach((f, j) => { for(let i = 0; i < 7; i++) if(f[i] === '#'){ g.fillStyle = llena ? (j < 3 && i < 4 ? '#fff0a0' : '#f2c14e') : '#3a2e4a'; g.fillRect(Math.round(x + i*esc), Math.round(y + j*esc), esc, esc); } }); }
function candado(g, x, y){ rect(g, x + 1, y, 5, 1, '#8a7e9e'); rect(g, x, y + 1, 1, 3, '#8a7e9e'); rect(g, x + 6, y + 1, 1, 3, '#8a7e9e'); rect(g, x - 1, y + 4, 9, 6, '#8a7e9e'); rect(g, x + 3, y + 6, 1, 2, '#1a1424'); }
function marco(g, x, y, w, h, fondo, borde){ g.fillStyle = fondo || 'rgba(10,6,16,0.86)'; g.fillRect(x, y, w, h);
  g.fillStyle = borde || '#3c2e52'; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); }
/* un botón: se registra para el toque; apretado baja un píxel */
function boton(g, id, x, y, w, h, label, opc){
  opc = opc || {}; x = Math.round(x); y = Math.round(y);
  const ap = UI.presion === id, apag = opc.apagado, dy = ap ? 1 : 0;
  UI.botones.push({id, x, y, w, h, fn:opc.fn, apagado:apag});
  g.fillStyle = K; g.fillRect(x - 1, y - 1, w + 2, h + 3);
  const base = apag ? '#2a2236' : opc.color || (opc.principal ? '#8a2432' : '#2e2244');
  g.fillStyle = base; g.fillRect(x, y + dy, w, h);
  g.fillStyle = apag ? '#3a3046' : opc.principal ? '#c83a4a' : '#4a3a66'; g.fillRect(x, y + dy, w, 1);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + dy + h - 2, w, 2);
  if(!ap){ g.fillStyle = '#05030a'; g.fillRect(x, y + h, w, 2); }
  if(opc.foco && !apag && Math.floor(J.tr*2.5) % 2){ g.fillStyle = '#f2c14e'; g.fillRect(x - 5, y + dy + h/2 - 2, 2, 5); g.fillRect(x - 3, y + dy + h/2 - 1, 1, 3); }
  texto(g, label, x + w/2, y + dy + Math.round(h/2 - 4), apag ? 'gris' : opc.grad || 'blanco');
}
/* el logo: MATE grande, AMARGO debajo, un brillo que lo cruza y la bufanda que flamea */
let _LOGO = null;
/* letras gordas: cada píxel de la fuente es un bloque, con degradé, brillo arriba, contorno y un canto en 3D */
function letrasGordas(str, B, cols, canto){
  const f = lienzoTexto(str, 'blanco', {sinBorde:true}), d = f.getContext('2d').getImageData(0, 0, f.width, f.height).data, fw = f.width, fh = f.height;
  const on = (x, y) => x >= 0 && y >= 0 && x < fw && y < fh && d[(y*fw + x)*4 + 3] > 40;
  let y0 = fh, y1 = 0; for(let y = 0; y < fh; y++) for(let x = 0; x < fw; x++) if(on(x, y)){ y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const P2 = 2, E = canto, w = fw*B + P2*2, h = (y1 - y0 + 1)*B + P2*2 + E, [c, g] = lienzo(w, h), [m, gm] = lienzo(w, h);
  for(let y = y0; y <= y1; y++) for(let x = 0; x < fw; x++) if(on(x, y)) gm.fillRect(P2 + x*B, P2 + (y - y0)*B, B, B);
  const md = gm.getImageData(0, 0, w, h).data, M2 = (x, y) => x >= 0 && y >= 0 && x < w && y < h && md[(y*w + x)*4 + 3] > 0;
  const hh = (y1 - y0 + 1)*B;
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
    if(M2(x, y)){ const k = lim((y - P2)/hh, 0, 0.999), col = cols[Math.floor(k*cols.length)];
      g.fillStyle = !M2(x, y - 1) || !M2(x - 1, y) ? '#fffbe8' : !M2(x + 1, y) || !M2(x, y + 1) ? cols[cols.length - 1] : col; g.fillRect(x, y, 1, 1); continue; }
    let prof = 0; for(let e = 1; e <= E; e++) if(M2(x, y - e)){ prof = e; break; }
    if(prof){ g.fillStyle = prof === 1 ? '#8a2a14' : prof < E ? '#5a1408' : '#3a0a06'; g.fillRect(x, y, 1, 1); } }
  /* contorno por fuera de todo */
  const cd = g.getImageData(0, 0, w, h).data, C2 = (x, y) => x >= 0 && y >= 0 && x < w && y < h && cd[(y*w + x)*4 + 3] > 0;
  g.fillStyle = K; for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(!C2(x, y) && (C2(x - 1, y) || C2(x + 1, y) || C2(x, y - 1) || C2(x, y + 1))) g.fillRect(x, y, 1, 1);
  return c;
}
function logo(g, cx, y, esc){
  if(!_LOGO || _LOGO.idioma !== IDIOMA){
    const a = letrasGordas('MATE', 4, ['#fff0a0', '#ffd84a', '#f8b020', '#e8901a', '#c86a10'], 4), b = letrasGordas('AMARGO', 2, ['#ffb0a0', '#ff6a4a', '#e8384a', '#b81c2c'], 2);
    const w = Math.max(a.width, b.width), [c, gc] = lienzo(w, a.height + b.height - 2); gc.drawImage(a, Math.round(w/2 - a.width/2), 0); gc.drawImage(b, Math.round(w/2 - b.width/2), a.height - 2);
    _LOGO = {c, idioma:IDIOMA, ha:a.height}; }
  const c = _LOGO.c, w = c.width*esc, h = c.height*esc, x = Math.round(cx - w/2);
  /* la bufanda: sale de abajo de AMARGO y flamea hacia la derecha */
  const L2 = Math.round(w*0.8), x0 = Math.round(cx - w*0.28), y0 = y + h - 2*esc;
  for(let i = 0; i < L2; i++){ const k = i/L2, yy = Math.round(y0 + Math.sin(i*0.06 - J.tr*3.6)*3*esc*k + k*k*4*esc), gr = Math.max(2, Math.round((3.2 - k*1.6)*esc));
    g.fillStyle = K; g.fillRect(x0 + i, yy - 1, 1, gr + 2); g.fillStyle = (i >> 2) % 3 === 0 ? '#e8384a' : '#b81c2c'; g.fillRect(x0 + i, yy, 1, gr); g.fillStyle = '#6a0a14'; g.fillRect(x0 + i, yy + gr - 1, 1, 1);
    if(i > L2 - 5*esc && i % 3 === 0){ g.fillStyle = '#b81c2c'; g.fillRect(x0 + i, yy + gr, 1, esc*2); } }
  g.drawImage(c, 0, 0, c.width, c.height, x, y, w, h);
  /* el brillo en diagonal, sólo sobre las letras */
  const [m, gm] = lienzo(c.width, c.height); gm.drawImage(c, 0, 0); gm.globalCompositeOperation = 'source-atop';
  const p = ((J.tr*0.45) % 2.4)*c.width*1.3 - c.width*0.3; gm.fillStyle = 'rgba(255,255,255,0.8)'; gm.beginPath(); gm.moveTo(p, 0); gm.lineTo(p + 5, 0); gm.lineTo(p - 7, c.height); gm.lineTo(p - 12, c.height); gm.closePath(); gm.fill();
  gm.globalCompositeOperation = 'destination-in'; gm.fillStyle = '#fff'; gm.fillRect(p - 14, 0, 22, c.height);
  g.globalAlpha = 0.55; g.drawImage(m, 0, 0, c.width, c.height, x, y, w, h); g.globalAlpha = 1;
  /* Mateo al costado */
  if(HOJAS.mateo){ const f = Math.sin(J.tr*1.7) > 0.95 ? 1 : 0, e2 = Math.max(1, esc); g.drawImage(HOJAS.mateo.c, f*HOJAS.mateo.fw, 0, HOJAS.mateo.fw, HOJAS.mateo.fh, x + w + 3, Math.round(y + 4*esc + Math.sin(J.tr*2.2)*2), HOJAS.mateo.fw*e2, HOJAS.mateo.fh*e2); }
  return {x, y, w, h};
}

/* ---------- las pantallas ---------- */
/* banderitas de 18×12 para elegir el idioma */
function bandera(g, k, x, y){
  g.fillStyle = K; g.fillRect(x - 1, y - 1, 20, 14);
  if(k === 'es'){ rect(g, x, y, 18, 4, '#74acdf'); rect(g, x, y + 4, 18, 4, '#f4f4f4'); rect(g, x, y + 8, 18, 4, '#74acdf'); rect(g, x + 8, y + 5, 2, 2, '#f6b40e'); px(g, x + 7, y + 6, '#f6b40e'); px(g, x + 10, y + 5, '#f6b40e'); px(g, x + 9, y + 4, '#f6b40e'); px(g, x + 8, y + 7, '#f6b40e'); }
  else if(k === 'en'){ rect(g, x, y, 18, 12, '#1e3a8a'); for(let i = 0; i < 18; i++){ const j = Math.round(i*11/17); px(g, x + i, y + j, '#f4f4f4'); px(g, x + i, y + 11 - j, '#f4f4f4'); px(g, x + i, y + Math.min(11, j + 1), '#c8102e'); }
    rect(g, x + 7, y, 4, 12, '#f4f4f4'); rect(g, x, y + 4, 18, 4, '#f4f4f4'); rect(g, x + 8, y, 2, 12, '#c8102e'); rect(g, x, y + 5, 18, 2, '#c8102e'); }
  else { rect(g, x, y, 18, 12, '#009b3a'); for(let j = 0; j < 12; j++){ const w2 = Math.round(8*(1 - Math.abs(j - 5.5)/6)); rect(g, x + 9 - w2, y + j, w2*2, 1, '#fedf00'); } disco(g, x + 9, y + 6, 3, '#002776'); rect(g, x + 7, y + 6, 5, 1, '#f4f4f4'); }
}
const PANTALLAS = {
  idioma(g){
    g.fillStyle = 'rgba(6,4,12,0.55)'; g.fillRect(0, 0, W, H);
    texto(g, 'IDIOMA · LANGUAGE · IDIOMA', W/2, Math.round(H*0.12), 'oro');
    const op = [['es', 'ESPAÑOL'], ['en', 'ENGLISH'], ['pt', 'PORTUGUÊS']], w = Math.min(170, W - 60), x = Math.round(W/2 - w/2);
    op.forEach(([k, nom], i) => { const y = Math.round(H*0.28) + i*Math.round(H*0.2), sel = IDIOMA === k;
      boton(g, 'id_' + k, x, y, w, 26, '', {principal:sel, foco:sel, fn:() => { ponerIdioma(k); _LOGO = null; SON.fx('titulo'); irA('titulo'); }});
      const dy = UI.presion === 'id_' + k ? 1 : 0; bandera(g, k, x + 10, y + 7 + dy); texto(g, nom, x + w/2 + 12, y + 9 + dy, sel ? 'oro' : 'blanco'); });
  },
  titulo(g){
    const esc = H > 300 ? 2 : 1, L = logo(g, W/2, Math.round(H*0.14), esc*2 > 2 ? esc : 2);
    texto(g, tr('UNA VENGANZA CON YERBA'), W/2, L.y + L.h + 10, 'gris');
    if(Math.floor(J.tr*1.6) % 2) texto(g, tr('TOCÁ PARA EMPEZAR'), W/2, H - 28, 'blanco');
    texto(g, 'v1.0', W - 6, H - 11, 'gris', {der:true});
  },
  principal(g){
    const L = logo(g, W*0.3, Math.round(H*0.14), 1);
    texto(g, tr('UNA VENGANZA CON YERBA'), W*0.3, L.y + L.h + 6, 'gris');
    const x = Math.round(W*0.62), w = Math.min(150, W - x - 14), n = PROG.abierto;
    let y = Math.round(H*0.2);
    boton(g, 'jugar', x, y, w, 18, n > 0 ? tr('CONTINUAR') : tr('JUGAR'), {principal:true, foco:true, fn:() => empezarNivel(Math.min(n, NIVELES.length - 1), true)}); y += 26;
    boton(g, 'caps', x, y, w, 16, tr('CAPÍTULOS'), {fn:() => irA('mapa')}); y += 23;
    boton(g, 'opc', x, y, w, 16, tr('OPCIONES'), {fn:() => { UI.desde = 'principal'; irA('opciones'); }}); y += 23;
    boton(g, 'cred', x, y, w, 16, tr('CRÉDITOS'), {fn:() => { J.modo = 'juego'; J.pausaJuego = true; arrancarCine('creditos', () => { J.pausaJuego = false; volverAlMenu(); }); }});
    const tot = Object.values(PROG.niveles).reduce((s, q) => s + (q.estrellas || 0), 0);
    estrella(g, 8, H - 16, true); texto(g, tot + '/' + NIVELES.length*3, 18, H - 16, 'oro', {izq:true});
  },
  mapa(g){
    marco(g, 6, 6, W - 12, H - 12, 'rgba(8,5,14,0.9)');
    texto(g, tr('CAPÍTULOS'), W/2, 12, 'oro');
    const cw = Math.floor((W - 30)/3);
    CAPS.forEach((cap, k) => { const x = 12 + k*(cw + 3);
      texto(g, (k + 1) + '. ' + tr(cap.nombre), x + cw/2, 28, cap.grad);
      cap.niveles.forEach((i, j) => { const d = NIVELES[i], y = 42 + j*48, abierto = i <= PROG.abierto, q = PROG.niveles[d.id] || {};
        boton(g, 'n' + i, x, y, cw, 40, '', {apagado:!abierto, color:abierto ? '#241a36' : '#16101e', fn:() => empezarNivel(i, !PROG.vistos[CINE_ANTES[i]])});
        const dy = UI.presion === 'n' + i ? 1 : 0;
        texto(g, d.id, x + 5, y + 4 + dy, abierto ? 'oro' : 'gris', {izq:true});
        if(abierto) for(let s = 0; s < 3; s++) estrella(g, x + cw - 34 + s*10, y + 4 + dy, (q.estrellas || 0) > s); else candado(g, x + cw - 14, y + 3);
        partir(tr(d.nombre), Math.max(6, Math.floor((cw - 10)/6))).slice(0, 2).forEach((l, k) => texto(g, l, x + 5, y + 15 + k*9 + dy, abierto ? 'blanco' : 'gris', {izq:true}));
        if(abierto && q.record) texto(g, String(q.record), x + cw - 5, y + 30 + dy, 'gris', {der:true}); }); });
    boton(g, 'volver', 12, H - 26, 80, 15, tr('VOLVER'), {fn:() => irA('principal')});
  },
  opciones(g){
    const w = Math.min(300, W - 30), x = Math.round(W/2 - w/2); marco(g, x - 8, 8, w + 16, H - 16, 'rgba(8,5,14,0.92)');
    texto(g, tr('OPCIONES'), W/2, 14, 'oro');
    const idiomas = [['es', 'ESPAÑOL'], ['en', 'ENGLISH'], ['pt', 'PORTUGUÊS']], cal = ['alta', 'media', 'baja'];
    const filas = [
      [tr('IDIOMA'), idiomas.find(q => q[0] === IDIOMA)[1], d => { const i = idiomas.findIndex(q => q[0] === IDIOMA); ponerIdioma(idiomas[(i + d + 3) % 3][0]); _LOGO = null; }],
      [tr('CALIDAD'), tr(AJ.calidad.toUpperCase()), d => { AJ.calidad = cal[(cal.indexOf(AJ.calidad) - d + 3) % 3]; aplicarCalidad(); }],
      [tr('MÚSICA'), AJ.musica, d => { AJ.musica = lim(Math.round(AJ.musica*10 + d)/10, 0, 1); SON.volumen(); }],
      [tr('EFECTOS'), AJ.efectos, d => { AJ.efectos = lim(Math.round(AJ.efectos*10 + d)/10, 0, 1); SON.volumen(); SON.fx('disparo'); }],
      [tr('CONTROLES'), AJ.controles === 'arrastre' ? tr('ARRASTRE') : tr('PALANCAS'), () => { AJ.controles = AJ.controles === 'arrastre' ? 'palancas' : 'arrastre'; DEDOS.clear(); CTRL.mx = CTRL.my = 0; CTRL.apunta = false; J.planeo = null; }],
      [tr('VIBRACIÓN'), AJ.vibrar ? tr('SÍ') : tr('NO'), () => { AJ.vibrar = !AJ.vibrar; vibrar(40); }]];
    filas.forEach((f, i) => { const y = 30 + i*Math.min(24, Math.floor((H - 70)/filas.length));
      texto(g, f[0], x, y + 4, 'gris', {izq:true});
      boton(g, 'm' + i, x + w - 132, y, 18, 15, '◀', {fn:() => { f[2](-1); guardar('mate.ajustes', AJ); }});
      boton(g, 'p' + i, x + w - 18, y, 18, 15, '▶', {fn:() => { f[2](1); guardar('mate.ajustes', AJ); }});
      if(typeof f[1] === 'number') for(let k = 0; k < 10; k++){ g.fillStyle = k < Math.round(f[1]*10) ? '#f2c14e' : '#3a2e4a'; g.fillRect(x + w - 104 + k*8, y + 4, 6, 7); }
      else texto(g, f[1], x + w - 66, y + 4, 'blanco'); });
    boton(g, 'volver', W/2 - 45, H - 30, 90, 16, tr('VOLVER'), {fn:() => { if(UI.desde === 'pausa'){ UI.p = 'pausa'; } else irA('principal'); }});
  },
  pausa(g){
    g.fillStyle = 'rgba(6,4,12,0.6)'; g.fillRect(0, 0, W, H);
    texto(g, tr('PAUSA'), W/2, Math.round(H*0.16), 'oro', {esc:2});
    const w = 150, x = Math.round(W/2 - w/2); let y = Math.round(H*0.34);
    boton(g, 'seguir', x, y, w, 17, tr('CONTINUAR'), {principal:true, foco:true, fn:() => { J.pausa = false; SON.fx('clic'); }}); y += 24;
    boton(g, 'reini', x, y, w, 15, tr('REINICIAR NIVEL'), {fn:() => { J.pausa = false; empezarNivel(J.idx, false); }}); y += 21;
    boton(g, 'opc', x, y, w, 15, tr('OPCIONES'), {fn:() => { UI.desde = 'pausa'; UI.p = 'opciones'; }}); y += 21;
    boton(g, 'salir', x, y, w, 15, tr('SALIR AL MENÚ'), {fn:() => { J.pausa = false; volverAlMenu(); }});
    texto(g, J.nivel.id + '  ' + tr(J.nivel.nombre), W/2, H - 18, 'gris');
  },
  resultado(g){
    const R = UI.res; if(!R) return; const t = UI.t;
    g.fillStyle = 'rgba(6,4,12,' + Math.min(0.72, t*1.5) + ')'; g.fillRect(0, 0, W, H);
    const w = Math.min(300, W - 30), x = Math.round(W/2 - w/2);
    texto(g, tr('¡NIVEL COMPLETO!'), W/2, 10, 'oro', {esc:2});
    texto(g, R.id + '  ' + tr(R.nombre), W/2, 33, 'gris');
    const filas = [[tr('BAJAS'), R.bajas + '/' + R.total], [tr('PRECISIÓN'), R.prec + '%'], [tr('TIEMPO'), R.tiempo], [tr('MUERTES'), String(R.caidas)], [tr('ESTILO'), R.estilo]];
    filas.forEach((f, i) => { if(t < 0.4 + i*0.22) return; const y = 46 + i*12; texto(g, f[0], x + 10, y, 'gris', {izq:true}); texto(g, f[1], x + w - 10, y, 'blanco', {der:true}); });
    const tp = 0.4 + filas.length*0.22, k = lim((t - tp)/1.3, 0, 1), pts = Math.round(R.puntos*suave(k));
    if(t > tp){ texto(g, tr('PUNTAJE'), x + 10, 110, 'oro', {izq:true}); texto(g, String(pts), x + w - 10, 108, 'oro', {der:true, esc:2});
      if(k < 1 && Math.floor(t*20) !== Math.floor((t - 1/60)*20)) SON.fx('puntos'); }
    for(let s = 0; s < 3; s++){ const ts = tp + 1.35 + s*0.35, on = t > ts && R.estrellas > s, e = on ? Math.max(2, Math.round(4 - (t - ts)*8)) : 2;
      if(on && !R['s' + s]){ R['s' + s] = 1; SON.fx('estrella', {n:s + 1}); vibrar(15); }
      estrella(g, W/2 - 34 + s*26 - (e - 2)*3.5, 132 - (e - 2)*3.5, on, e); }
    if(R.nuevo && t > tp + 2.4 && Math.floor(t*3) % 2) texto(g, tr('¡NUEVO RÉCORD!'), W/2, 152, 'fuego');
    if(t > tp + 1.6){ const y = H - 30, bw = 88;
      const sig2 = J.idx + 1 < NIVELES.length;
      boton(g, 'sig', W/2 + 50 - bw/2 + 20, y, bw, 17, sig2 ? tr('SIGUIENTE') : tr('FINAL'), {principal:true, foco:true, fn:() => sig2 ? empezarNivel(J.idx + 1, !PROG.vistos[CINE_ANTES[J.idx + 1]]) : volverAlMenu()});
      boton(g, 'rep', W/2 - 50 - bw/2 - 20, y, bw, 17, tr('REPETIR'), {fn:() => empezarNivel(J.idx, false)});
      boton(g, 'menu', W/2 - 22, y + 1, 44, 15, tr('MENÚ'), {fn:volverAlMenu}); }
  },
  muerte(g){
    const t = UI.t; g.fillStyle = 'rgba(40,0,8,' + Math.min(0.55, t) + ')'; g.fillRect(0, 0, W, H);
    const k = suave(Math.min(1, t*2)); texto(g, tr('TE BAJARON'), W/2, Math.round(lerp(-20, H*0.2, k)), 'rojo', {esc:W > 420 ? 3 : 2});
    if(t > 0.5){ const tips = ['Tocá a un enemigo en el aire: todo va en cámara lenta.', 'El círculo que se vacía avisa cuándo te van a tirar.', 'Dos dedos, dos enemigos: cada brazo apunta por su lado.', 'Deslizarte te hace más chico: las balas pasan por arriba.', 'Una bala contra la chapa busca sola al enemigo más cercano.', 'Las garrafas no perdonan. A nadie.'];
      partir(tr(PAL() && TIPS_PAL[tips[UI.tip % tips.length]] || tips[UI.tip % tips.length]), 44).forEach((l, i) => texto(g, l, W/2, Math.round(H*0.48) + i*9, 'blanco')); }
    if(t > 0.8){ const y = H - 34, bw = 110;
      boton(g, 'reint', W/2 - bw - 6, y, bw, 18, tr('REINTENTAR'), {principal:true, foco:true, fn:revivir});
      boton(g, 'reini', W/2 + 6, y, bw, 18, tr('REINICIAR NIVEL'), {fn:() => empezarNivel(J.idx, false)}); }
  }
};
function dibujarMenu(g, dtR){
  UI.t += dtR; UI.botones = [];
  const f = PANTALLAS[J.pausa && UI.p !== 'opciones' ? 'pausa' : UI.p]; if(f) f(g);
}
/* ---------- toques en los menús ---------- */
function uiBoton(x, y){ return UI.botones.find(b => x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y - 3 && y <= b.y + b.h + 4); }
function uiDown(x, y){
  if(UI.p === 'titulo' && J.modo === 'menu'){ irA('principal'); SON.fx('titulo'); return; }
  /* en la pantalla de idioma se elige con los botones */
  const b = uiBoton(x, y); UI.presion = b && !b.apagado ? b.id : null; if(UI.presion) SON.fx('clic');
}
function uiUp(x, y){
  const b = uiBoton(x, y), id = UI.presion; UI.presion = null;
  if(b && b.id === id && b.fn){ SON.fx('boton'); vibrar(10); b.fn(); }
}
/* ---------- el flujo entre menú y juego ---------- */
function volverAlMenu(){
  cargarNivel(0); J.modo = 'menu'; UI.p = 'principal'; UI.t = 0; J.pausa = false; J.fundirA = 0;
  SON.musica('menu'); SON.ambiente('puerto'); SON.intensidad(0);
  HE.x = 7.5; HE.dir = 1; MATEO.x = 6; CAMARA.x = CAMARA.obj.x = 15; CAMARA.y = CAMARA.obj.y = 7;
}
function empezarNivel(i, conCine){
  J.pausa = false; cargarNivel(i); J.fundirA = 0; P_FIN.u.fundido.value = 1;
  SON.ambiente(NIVELES[i].cap);
  const cine = CINE_ANTES[i];
  J.banner = NIVELES[i].jefe ? 99 : 0;
  if(cine && (conCine || cine === 'jefe')){ PROG.vistos[cine] = 1; guardarProg(); arrancarCine(cine, () => { SON.musica(NIVELES[i].jefe ? 'jefe' : NIVELES[i].cap); J.banner = NIVELES[i].jefe ? 99 : 0; }); }
}
function pantallaResultado(){
  const d = J.nivel, prev = PROG.niveles[d.id] || {};
  const est = J.fin ? J.fin.estrellas : 0, total = ENEM.length, bajas = ENEM.filter(e => e.muerto).length;
  const tops = Object.entries(J.estilo).sort((a, b) => b[1] - a[1]).slice(0, 2).map(q => tr(q[0]).replace(/[¡!]/g, '') + ' ×' + q[1]).join('  ');
  const s = Math.floor(J.reloj), tiempo = Math.floor(s/60) + ':' + String(s % 60).padStart(2, '0');
  UI.res = {id:d.id, nombre:d.nombre, puntos:J.puntos, estrellas:est, bajas, total, prec:J.tiros ? Math.round(100*J.aciertos/J.tiros) : 100, tiempo, caidas:J.caidas || 0, estilo:tops || '-', nuevo:J.puntos > (prev.record || 0)};
  PROG.niveles[d.id] = {estrellas:Math.max(prev.estrellas || 0, est), record:Math.max(prev.record || 0, J.puntos)};
  PROG.abierto = Math.max(PROG.abierto, Math.min(NIVELES.length - 1, J.idx + 1)); guardarProg();
  J.modo = 'resultado'; UI.p = 'resultado'; UI.t = 0; SON.musica('victoria'); SON.intensidad(0);
}
const TIPS_PAL = {'Tocá a un enemigo en el aire: todo va en cámara lenta.':'Apuntá en el aire con la palanca derecha: todo va en cámara lenta.',
  'Dos dedos, dos enemigos: cada brazo apunta por su lado.':'La mira se engancha sola al enemigo más cercano a donde apuntás.',
  'Deslizarte te hace más chico: las balas pasan por arriba.':'Corré y bajá la palanca: deslizándote, las balas pasan por arriba.'};
function pantallaMuerte(){ J.modo = 'muerte'; UI.p = 'muerte'; UI.t = 0; UI.tip++; }
/* reaparece en el último lugar seguro: lo que ya cayó queda caído */
function revivir(){
  const c = J.check || {x:HE.x, y:HE.y + 2};
  Object.assign(HE, {x:c.x, y:c.y, vx:0, vy:0, est:'aire', vida:3, muerto:0, invul:2, giro:0});
  HE.malla.rotation.z = 0;
  for(const e of ENEM) if(!e.muerto && e.tipo !== 'jefe'){ e.est = 'ronda'; e.aviso = 0; e.rafaga = 0; e.cd = 1; }
  BALAS = BALAS.filter(b => b.de === 'heroe');
  J.puntos = Math.max(0, J.puntos - 250); J.mult = 1; J.caidas = (J.caidas || 0) + 1;
  J.modo = 'juego'; J.tsObj = 1; SON.musica(J.nivel.jefe ? 'jefe' : J.nivel.cap); SON.fx('recarga');
}
function pausar(){ if(J.modo !== 'juego' || J.cine || HE.muerto) return; J.pausa = !J.pausa; UI.p = 'pausa'; UI.t = 0; SON.fx(J.pausa ? 'boton' : 'clic'); }
/* la calidad: sombras, brillo y rayos */
function aplicarCalidad(){
  const q = AJ.calidad;
  POST.brillo = q !== 'baja';
  LUZ.sol.castShadow = q !== 'baja';
  const tam = q === 'alta' ? 1024 : 512;
  if(LUZ.sol.shadow.mapSize.x !== tam){ LUZ.sol.shadow.mapSize.set(tam, tam); if(LUZ.sol.shadow.map){ LUZ.sol.shadow.map.dispose(); LUZ.sol.shadow.map = null; } }
}
GUIONES.creditos = [{musica:'fin'}, {creditos:true}];
