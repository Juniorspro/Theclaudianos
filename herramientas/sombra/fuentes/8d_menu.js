/* ================================================================ menús: en la misma grilla de píxeles, encima de la torre viva */
function marco(g, x, y, w, h, fondo, borde){ g.fillStyle = fondo || 'rgba(10,4,20,0.86)'; g.fillRect(x, y, w, h);
  g.fillStyle = borde || '#ff3aa8'; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); }
function boton(g, id, x, y, w, h, label, opc){
  opc = opc || {}; x = Math.round(x); y = Math.round(y);
  const ap = UI.presion === id, apag = opc.apagado, dy = ap ? 1 : 0;
  UI.botones.push({id, x, y, w, h, fn:opc.fn, apagado:apag});
  g.fillStyle = K; g.fillRect(x - 1, y - 1, w + 2, h + 3);
  const base = apag ? '#241a30' : opc.principal ? '#b8283a' : opc.color || '#2a1a34';
  g.fillStyle = base; g.fillRect(x, y + dy, w, h);
  g.fillStyle = apag ? '#34283e' : opc.principal ? '#ff5a5a' : '#4a3452'; g.fillRect(x, y + dy, w, 1);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + dy + h - 2, w, 2);
  if(!ap){ g.fillStyle = '#05030a'; g.fillRect(x, y + h, w, 2); }
  if(opc.sel){ g.fillStyle = '#ffd040'; g.fillRect(x, y + dy, 2, h); g.fillRect(x + w - 2, y + dy, 2, h); }
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
function bandera(g, k, x, y){
  g.fillStyle = K; g.fillRect(x - 1, y - 1, 20, 14);
  if(k === 'es'){ rect(g, x, y, 18, 4, '#74acdf'); rect(g, x, y + 4, 18, 4, '#f4f4f4'); rect(g, x, y + 8, 18, 4, '#74acdf'); rect(g, x + 8, y + 5, 2, 2, '#f6b40e'); px(g, x + 7, y + 6, '#f6b40e'); px(g, x + 10, y + 5, '#f6b40e'); px(g, x + 9, y + 4, '#f6b40e'); px(g, x + 8, y + 7, '#f6b40e'); }
  else if(k === 'en'){ rect(g, x, y, 18, 12, '#1e3a8a'); for(let i = 0; i < 18; i++){ const j = Math.round(i*11/17); px(g, x + i, y + j, '#f4f4f4'); px(g, x + i, y + 11 - j, '#f4f4f4'); px(g, x + i, y + Math.min(11, j + 1), '#c8102e'); }
    rect(g, x + 7, y, 4, 12, '#f4f4f4'); rect(g, x, y + 4, 18, 4, '#f4f4f4'); rect(g, x + 8, y, 2, 12, '#c8102e'); rect(g, x, y + 5, 18, 2, '#c8102e'); }
  else { rect(g, x, y, 18, 12, '#009b3a'); for(let j = 0; j < 12; j++){ const w2 = Math.round(8*(1 - Math.abs(j - 5.5)/6)); rect(g, x + 9 - w2, y + j, w2*2, 1, '#fedf00'); } disco(g, x + 9, y + 6, 3, '#002776'); rect(g, x + 7, y + 6, 5, 1, '#f4f4f4'); }
}

const UI = {p:'idioma', t:0, botones:[], presion:null, res:null, mundo:0, tab:'ninjas', ver:0, cofre:null};
function uiActiva(){ return J.modo === 'menu' || J.modo === 'resultado' || J.pausa; }
function irA(p){ UI.p = p; UI.t = 0; UI.presion = null; SON.fx('desliza_menu'); }
function uiBoton(x, y){ return UI.botones.find(b => x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y - 3 && y <= b.y + b.h + 4); }
function uiDown(x, y){
  if(UI.p === 'titulo'){ irA('principal'); SON.fx('titulo'); return; }
  const b = uiBoton(x, y); UI.presion = b && !b.apagado ? b.id : null; if(UI.presion) SON.fx('clic');
}
function uiUp(x, y){ const b = uiBoton(x, y), id = UI.presion; UI.presion = null; if(b && b.id === id && b.fn){ SON.fx('boton'); vibrar(8); b.fn(); } }
/* temporizadores que corren con el juego y se descartan si cambió la carga */
const LUEGO = [];
function luego(seg, fn){ LUEGO.push({t:seg, fn, gen:J.gen}); }
function pasoLuego(dt){ for(let i = LUEGO.length - 1; i >= 0; i--){ const l = LUEGO[i]; l.t -= dt; if(l.t <= 0){ LUEGO.splice(i, 1); if(l.gen === J.gen) try { l.fn(); } catch(e){ console.error(e); } } } }

/* ---------- el logo: SOMBRA en letras gordas, con una luna atrás y un tajo que la cruza ---------- */
let _LOGO = null;
function logo(g, cx, y){
  if(!_LOGO){ const a = letrasGordas('SOMBRA', 4, ['#ffffff', '#f4e8f0', '#d8c8e0', '#a890b8'], 4, ['#3a1a4a', '#2a1036', '#1a0822']); _LOGO = a; }
  const c = _LOGO, x0 = Math.round(cx - c.width/2), t = J.tr;
  disco(g, cx + 34, y + 10, 18, 'rgba(232,56,74,0.9)');
  g.drawImage(c, x0, y + Math.round(Math.sin(t*1.6)*1.5));
  const k = (t*0.5) % 3; if(k < 0.25){ g.globalAlpha = 1 - k*4; linea(g, x0 - 6 + k*40, y + c.height + 2, x0 + c.width*k*4, y - 4, '#ffffff', 1); g.globalAlpha = 1; }
  texto(g, tr('EL SALTO DEL NINJA'), cx, y + c.height + 4, 'rojo');
}
function monedero(g){ const x = W - 8; texto(g, String(PROG.monedas), x - 8, 5, 'oro', {der:true}); disco(g, x - 3, 10, 3, '#8a5a08'); disco(g, x - 3, 10, 2, '#ffd040'); }
function estrellita(g, x, y, llena, e){ const E2 = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.']; e = e || 1;
  E2.forEach((f, j) => { for(let i = 0; i < 7; i++) if(f[i] === '#'){ g.fillStyle = llena ? (j < 3 && i < 4 ? '#fff4a0' : '#ffc830') : '#4a3a52'; g.fillRect(Math.round(x + i*e), Math.round(y + j*e), e, e); } }); }
const CAUSA = {pinchos:'TE CLAVASTE', tinta:'TE TRAGÓ LA TINTA', samurai:'TE CORTARON', bala:'TE DIERON', shuriken:'UNA ESTRELLA NINJA', cae:'TE CAÍSTE'};

const PANTALLAS = {
  idioma(g){
    g.fillStyle = 'rgba(10,4,14,0.6)'; g.fillRect(0, 0, W, H);
    texto(g, 'IDIOMA', W/2, Math.round(H*0.14), 'oro'); texto(g, 'LANGUAGE', W/2, Math.round(H*0.14) + 12, 'oro');
    const op = [['es', 'ESPAÑOL'], ['en', 'ENGLISH'], ['pt', 'PORTUGUÊS']], w = Math.min(150, W - 24), x = Math.round(W/2 - w/2);
    op.forEach(([k, nom], i) => { const y = Math.round(H*0.32) + i*44;
      boton(g, 'idi' + k, x, y, w, 30, '', {sel:IDIOMA === k, fn:() => { ponerIdioma(k); _LOGO = null; irA('titulo'); }});
      bandera(g, k, x + 10, y + 9); texto(g, nom, x + w/2 + 10, y + 9, IDIOMA === k ? 'oro' : 'blanco'); });
  },
  titulo(g){ logo(g, W/2, Math.round(H*0.16)); if(Math.floor(J.tr*2) % 2 === 0) texto(g, tr('TOCÁ PARA EMPEZAR'), W/2, Math.round(H*0.8), 'blanco'); },
  principal(g){
    logo(g, W/2, Math.round(H*0.1)); monedero(g);
    const w = 130, x = Math.round(W/2 - w/2); let y = Math.round(H*0.42);
    boton(g, 'des', x, y, w, 24, tr('DESAFÍOS'), {principal:true, fn:() => irA('desafios')}); y += 32;
    boton(g, 'inf', x, y, w, 24, tr('INFINITO'), {fn:() => { SON.fx('titulo'); empezarInfinito(); }}); texto(g, tr('RÉCORD {0}', PROG.record), W/2, y + 27, 'gris'); y += 44;
    boton(g, 'tie', x, y, w, 24, tr('TIENDA'), {fn:() => { UI.tab = 'ninjas'; UI.ver = Object.keys(NINJAS).indexOf(PROG.ninja); UI.cofre = null; irA('tienda'); SON.musica('tienda'); }}); y += 32;
    boton(g, 'opc', x, y, w, 24, tr('OPCIONES'), {fn:() => { UI.desde = 'principal'; irA('opciones'); }});
  },
  desafios(g){
    g.fillStyle = 'rgba(10,4,14,0.55)'; g.fillRect(0, 0, W, H); monedero(g);
    const M = MUNDOS[UI.mundo], tot = NIVELES.filter(n => n.mi === UI.mundo).reduce((s, n) => s + (PROG.niveles[n.id] || 0), 0);
    boton(g, 'mA', 6, 24, 22, 22, '◀', {fn:() => { UI.mundo = (UI.mundo + 2) % 3; }}); boton(g, 'mB', W - 28, 24, 22, 22, '▶', {fn:() => { UI.mundo = (UI.mundo + 1) % 3; }});
    texto(g, tr(M.nombre), W/2, 28, 'oro'); estrellita(g, W/2 - 20, 40, true); texto(g, tot + '/24', W/2 + 12, 40, 'blanco');
    const bw = 64, bh = 40, x0 = Math.round(W/2 - bw - 4);
    NIVELES.filter(n => n.mi === UI.mundo).forEach((n, i) => { const x = x0 + (i % 2)*(bw + 8), y = 60 + Math.floor(i/2)*(bh + 8), gi = NIVELES.indexOf(n), ab = gi <= PROG.abierto, e = PROG.niveles[n.id] || 0;
      boton(g, 'n' + gi, x, y, bw, bh, '', {apagado:!ab, fn:() => { J.pausa = false; SON.fx('titulo'); empezarNivel(gi); }});
      if(ab){ texto(g, String(n.n + 1), x + bw/2, y + 7, 'blanco'); for(let k = 0; k < 3; k++) estrellita(g, x + bw/2 - 19 + k*13, y + 22, k < e); }
      else { rect(g, x + bw/2 - 4, y + 14, 8, 7, '#6a5a72'); rect(g, x + bw/2 - 3, y + 10, 1, 4, '#6a5a72'); rect(g, x + bw/2 + 2, y + 10, 1, 4, '#6a5a72'); rect(g, x + bw/2 - 3, y + 10, 6, 1, '#6a5a72'); } });
    boton(g, 'vol', 8, H - 30, 70, 22, tr('VOLVER'), {fn:() => irA('principal')});
  },
  tienda(g){
    g.fillStyle = 'rgba(10,4,14,0.62)'; g.fillRect(0, 0, W, H); monedero(g);
    texto(g, tr('TIENDA'), 8, 5, 'blanco', {izq:true});
    const tabs = [['ninjas', 'NINJAS'], ['efectos', 'EFECTOS'], ['cofre', 'COFRE']], tw = Math.floor((W - 16)/3);
    tabs.forEach(([k, n], i) => boton(g, 't' + k, 8 + i*tw, 22, tw - 4, 20, tr(n), {sel:UI.tab === k, color:UI.tab === k ? '#4a2a5a' : undefined, fn:() => { UI.tab = k; UI.cofre = null;
      UI.ver = k === 'ninjas' ? Object.keys(NINJAS).indexOf(PROG.ninja) : Math.max(0, ['auto'].concat(Object.keys(EFECTOS)).indexOf(PROG.efecto)); }}));
    const cx = W/2, cy = 110;
    if(UI.tab === 'ninjas' || UI.tab === 'efectos'){
      const ninjas = UI.tab === 'ninjas', lista = ninjas ? Object.keys(NINJAS) : ['auto'].concat(Object.keys(EFECTOS)), k = lista[(UI.ver + lista.length) % lista.length];
      const tiene = ninjas ? PROG.ninjas.includes(k) : k === 'auto' || !EFECTOS[k].precio || PROG.efectos.includes(k), puesto = ninjas ? PROG.ninja === k : PROG.efecto === k;
      marco(g, 20, 50, W - 40, 110, 'rgba(20,10,26,0.8)', '#6a4a7c');
      if(ninjas){ const N = NINJAS[k], E = efecto(), [c, gc] = lienzo(40, 30);
        dibujarNinja(gc, 20, 16, ['pie', 'apunta', 'salto'][Math.floor(J.tr*0.7) % 3], 1, 0, {silueta:'#0a0610', acento:'#e8384a'}, {bufanda:[{x:19, y:13}, {x:16, y:12}, {x:14, y:13 + Math.sin(J.tr*6)}, {x:12, y:12 + Math.sin(J.tr*6 + 1)}, {x:10, y:13 + Math.sin(J.tr*6 + 2)}], colBuf:N.colBuf, accesorio:N.accesorio, colOjo:N.colOjo, colHoja:N.colHoja});
        g.drawImage(c, 0, 0, 40, 30, cx - 60, cy - 58, 120, 90);
        texto(g, N.nombre, cx, cy + 34, 'oro'); texto(g, tr(N.perk), cx, 176, 'blanco'); }
      else { const E = k === 'auto' ? null : EFECTOS[k];
        if(E){ const x0 = cx - 40, y0 = 58; for(let i = 0; i < 6; i++){ g.fillStyle = mezcla(E.cielo, i/5); g.fillRect(x0, y0 + i*9, 80, 9); } disco(g, cx + 14, y0 + 22, 9, E.sol); g.fillStyle = E.montes[0]; g.fillRect(x0, y0 + 40, 80, 14);
          g.fillStyle = E.torre; g.fillRect(x0, y0, 10, 54); g.fillRect(x0 + 70, y0, 10, 54); g.fillRect(x0 + 10, y0 + 30, 22, 5); g.fillStyle = E.luzBorde; g.fillRect(x0 + 10, y0 + 30, 22, 1);
          dibujarNinja(g, x0 + 22, y0 + 25, 'pie', 1, 0, E, {bufanda:[{x:x0 + 21, y:y0 + 22}, {x:x0 + 18, y:y0 + 21}, {x:x0 + 16, y:y0 + 22}], colBuf:'#e8384a'});
          for(let i = 0; i < 8; i++) px(g, x0 + (i*23 + Math.floor(J.tr*9)) % 80, y0 + (i*17 + Math.floor(J.tr*14)) % 54, E.colPart[i % 3]); }
        else { texto(g, tr('EL DEL MUNDO'), cx, 90, 'blanco'); texto(g, tr('CADA MUNDO CON SU LUZ'), cx, 104, 'gris'); }
        texto(g, E ? tr(E.nombre) : tr('AUTOMÁTICO'), cx, cy + 34, 'oro'); }
      boton(g, 'vA', 24, cy - 8, 20, 20, '◀', {fn:() => { UI.ver = (UI.ver - 1 + lista.length) % lista.length; SON.fx('clic'); }});
      boton(g, 'vB', W - 44, cy - 8, 20, 20, '▶', {fn:() => { UI.ver = (UI.ver + 1) % lista.length; SON.fx('clic'); }});
      const precio = ninjas ? NINJAS[k].precio : k === 'auto' ? 0 : EFECTOS[k].precio;
      if(puesto) boton(g, 'acc', W/2 - 55, 200, 110, 24, tr('PUESTO'), {apagado:true});
      else if(tiene) boton(g, 'acc', W/2 - 55, 200, 110, 24, tr('PONER'), {principal:true, fn:() => { if(ninjas) PROG.ninja = k; else PROG.efecto = k; guardarProg(); SON.fx('compra'); }});
      else boton(g, 'acc', W/2 - 55, 200, 110, 24, tr('COMPRAR {0}', precio), {principal:PROG.monedas >= precio, fn:() => {
        if(PROG.monedas < precio){ SON.fx('no_alcanza'); UI.aviso = {txt:tr('NO TE ALCANZA'), t:1.5}; return; }
        PROG.monedas -= precio; if(ninjas){ PROG.ninjas.push(k); PROG.ninja = k; } else { PROG.efectos.push(k); PROG.efecto = k; } guardarProg(); SON.fx('compra'); vibrar(30); }});
    } else {
      /* el cofre: 150 monedas por algo al azar */
      const abierto = UI.cofre && UI.t - UI.cofre.t0 > 0.6, sac = UI.cofre && !abierto ? Math.round(rv(-2, 2)) : 0, bx = cx - 26 + sac, by = 70;
      rect(g, bx, by + 16, 52, 30, '#6a3a1a'); rect(g, bx, by + 16, 52, 3, '#8a4a22'); for(let i = 0; i < 4; i++) rect(g, bx + 4 + i*13, by + 20, 1, 24, '#4a2a10');
      if(abierto){ rect(g, bx - 2, by + 2, 56, 10, '#6a3a1a'); g.globalAlpha = 0.6 + Math.sin(J.tr*6)*0.3; disco(g, cx, by + 16, 14, '#fff0a0'); g.globalAlpha = 1; }
      else { rect(g, bx - 2, by + 8, 56, 10, '#8a4a22'); rect(g, bx - 2, by + 8, 56, 2, '#a86a32'); }
      rect(g, bx + 22, by + 14, 8, 8, '#e8c040'); rect(g, bx + 25, by + 17, 2, 3, '#4a2a10');
      if(abierto) { texto(g, UI.cofre.txt, cx, 128, 'oro'); if(UI.cofre.sub) texto(g, UI.cofre.sub, cx, 140, 'blanco'); }
      else texto(g, tr('¿QUÉ HABRÁ ADENTRO?'), cx, 128, 'blanco');
      boton(g, 'cof', W/2 - 55, 200, 110, 24, tr('ABRIR {0}', 150), {principal:PROG.monedas >= 150, fn:() => abrirCofre()}); }
    if(UI.aviso && UI.aviso.t > 0){ UI.aviso.t -= 1/60; texto(g, UI.aviso.txt, W/2, 232, 'rojo'); }
    boton(g, 'vol', 8, H - 30, 70, 22, tr('VOLVER'), {fn:() => { irA('principal'); SON.musica('menu'); }});
  },
  opciones(g){
    g.fillStyle = 'rgba(10,4,14,0.7)'; g.fillRect(0, 0, W, H);
    texto(g, tr('OPCIONES'), W/2, 10, 'oro');
    const onoff = v => v ? tr('SÍ') : tr('NO'), nIdi = {es:'ESPAÑOL', en:'ENGLISH', pt:'PORTUGUÊS'}, ls = ['es', 'en', 'pt'];
    const filas = [
      [tr('IDIOMA'), nIdi[IDIOMA], d => { ponerIdioma(ls[(ls.indexOf(IDIOMA) + d + 3) % 3]); _LOGO = null; }],
      [tr('MÚSICA'), Math.round(AJ.musica*10) + '/10', d => { AJ.musica = lim(Math.round(AJ.musica*10 + d)/10, 0, 1); SON.volumen(); }],
      [tr('SONIDOS'), Math.round(AJ.efectos*10) + '/10', d => { AJ.efectos = lim(Math.round(AJ.efectos*10 + d)/10, 0, 1); SON.volumen(); SON.fx('moneda'); }],
      [tr('VIBRACIÓN'), onoff(AJ.vibrar), () => { AJ.vibrar = !AJ.vibrar; vibrar(30); }],
      [tr('EFECTOS VISUALES'), AJ.visual === 'alta' ? tr('ALTOS') : tr('BAJOS'), () => { AJ.visual = AJ.visual === 'alta' ? 'baja' : 'alta'; }]];
    filas.forEach(([nom, val, fn], i) => { const y = 34 + i*40; texto(g, nom, W/2, y, 'blanco');
      boton(g, 'o' + i + 'a', 14, y + 12, 22, 20, '◀', {fn:() => { fn(-1); guardar('sombra.ajustes', AJ); }}); texto(g, val, W/2, y + 16, 'oro');
      boton(g, 'o' + i + 'b', W - 36, y + 12, 22, 20, '▶', {fn:() => { fn(1); guardar('sombra.ajustes', AJ); }}); });
    boton(g, 'vol', 8, H - 30, 70, 22, tr('VOLVER'), {fn:() => irA(UI.desde || 'principal')});
  },
  pausa(g){
    g.fillStyle = 'rgba(10,4,14,0.7)'; g.fillRect(0, 0, W, H); texto(g, tr('PAUSA'), W/2, Math.round(H*0.22), 'oro');
    const w = 130, x = Math.round(W/2 - w/2); let y = Math.round(H*0.38);
    boton(g, 'seg', x, y, w, 24, tr('SEGUIR'), {principal:true, fn:() => { J.pausa = false; }}); y += 32;
    boton(g, 'rei', x, y, w, 24, tr('REINTENTAR'), {fn:() => { J.pausa = false; reintentar(); }}); y += 32;
    boton(g, 'opc', x, y, w, 24, tr('OPCIONES'), {fn:() => { UI.desde = 'pausa'; irA('opciones'); }}); y += 32;
    boton(g, 'sal', x, y, w, 24, tr('SALIR'), {fn:() => volverAlMenu()});
  },
  gana(g){
    const R2 = UI.res, t = UI.t; g.fillStyle = 'rgba(10,4,14,0.62)'; g.fillRect(0, 0, W, H);
    texto(g, tr('¡NIVEL SUPERADO!'), W/2, Math.round(H*0.12), 'oro');
    /* las tres estrellas se estampan de a una */
    for(let k = 0; k < 3; k++){ const tk = 0.4 + k*0.45, gana2 = k < R2.estrellas; if(t > tk && !R2['e' + k]){ R2['e' + k] = true; if(gana2){ SON.fx('estrella', {n:k + 1}); vibrar(20); } }
      const e = t > tk && gana2 ? Math.max(3, Math.round(lerp(6, 3, lim((t - tk)/0.15, 0, 1)))) : 3; estrellita(g, W/2 - 42 + k*30 - (e - 3)*3.5, Math.round(H*0.2) - (e - 3)*3.5, t > tk && gana2, e); }
    const y = Math.round(H*0.34);
    texto(g, tr('LLEGASTE AL TORII'), W/2, y, 'blanco');
    texto(g, tr('MONEDAS {0}/{1}', J.monedas, J.totMonedas), W/2, y + 14, R2.monOk ? 'oro' : 'gris');
    texto(g, tr('BAJAS {0}/{1}', J.bajas, J.totEnem), W/2, y + 28, R2.bajOk ? 'oro' : 'gris');
    texto(g, '+' + R2.mon, W/2 - 4, y + 46, 'oro'); disco(g, W/2 + 12 + String(R2.mon).length*3, y + 50, 3, '#ffd040');
    if(t > 1.6){ const w = 130, x = Math.round(W/2 - w/2); let yb = Math.round(H*0.56);
      if(J.idx + 1 < NIVELES.length) { boton(g, 'sig', x, yb, w, 24, tr('SIGUIENTE'), {principal:true, fn:() => empezarNivel(J.idx + 1)}); yb += 32; }
      boton(g, 'rep', x, yb, w, 24, tr('REPETIR'), {fn:() => empezarNivel(J.idx)}); yb += 32;
      boton(g, 'men', x, yb, w, 24, tr('MENÚ'), {fn:() => { volverAlMenu(); irA('desafios'); }}); }
  },
  muerte(g){
    const R2 = UI.res, t = UI.t; g.fillStyle = 'rgba(40,4,14,' + Math.min(0.62, t*1.5).toFixed(2) + ')'; g.fillRect(0, 0, W, H);
    texto(g, tr(CAUSA[NIN.causa] || 'TE CAÍSTE'), W/2, Math.round(H*0.18), 'rojo');
    if(J.infinito){ texto(g, tr('ALTURA {0} M', J.alturaMax), W/2, Math.round(H*0.28), 'blanco'); texto(g, tr('PUNTOS {0}', J.puntos), W/2, Math.round(H*0.28) + 14, 'oro');
      if(R2.record && Math.floor(t*3) % 2) texto(g, tr('¡NUEVO RÉCORD!'), W/2, Math.round(H*0.28) + 30, 'oro'); else if(!R2.record) texto(g, tr('RÉCORD {0}', PROG.record), W/2, Math.round(H*0.28) + 30, 'gris'); }
    else texto(g, tr('MONEDAS {0}/{1}', J.monedas, J.totMonedas), W/2, Math.round(H*0.28), 'gris');
    if(R2.mon) { texto(g, '+' + R2.mon, W/2 - 4, Math.round(H*0.28) + 46, 'oro'); disco(g, W/2 + 12 + String(R2.mon).length*3, Math.round(H*0.28) + 50, 3, '#ffd040'); }
    if(t > 0.5){ const w = 130, x = Math.round(W/2 - w/2); let yb = Math.round(H*0.52);
      boton(g, 'rei', x, yb, w, 26, tr('REINTENTAR'), {principal:true, fn:() => reintentar()}); yb += 34;
      boton(g, 'men', x, yb, w, 24, tr('MENÚ'), {fn:() => { const inf = J.infinito; volverAlMenu(); if(!inf) irA('desafios'); }}); }
  }
};
function dibujarUI(g){ const f = PANTALLAS[UI.p]; if(f) f(g); }
function abrirCofre(){
  if(PROG.monedas < 150){ SON.fx('no_alcanza'); UI.aviso = {txt:tr('NO TE ALCANZA'), t:1.5}; return; }
  PROG.monedas -= 150; SON.fx('cofre'); vibrar(40);
  const faltan = Object.keys(NINJAS).filter(k => !PROG.ninjas.includes(k)).map(k => ['n', k]).concat(Object.keys(EFECTOS).filter(k => EFECTOS[k].precio && !PROG.efectos.includes(k)).map(k => ['e', k]));
  if(faltan.length && Math.random() < 0.35){ const [t, k] = faltan[Math.floor(Math.random()*faltan.length)];
    if(t === 'n'){ PROG.ninjas.push(k); UI.cofre = {txt:tr('¡NINJA NUEVO!'), sub:NINJAS[k].nombre, t0:UI.t}; } else { PROG.efectos.push(k); UI.cofre = {txt:tr('¡EFECTO NUEVO!'), sub:tr(EFECTOS[k].nombre), t0:UI.t}; } }
  else { const m = [60, 90, 120, 180, 250, 400][Math.floor(Math.random()*Math.random()*6)]; PROG.monedas += m; UI.cofre = {txt:tr('+{0} MONEDAS', m), sub:null, t0:UI.t}; }
  guardarProg();
}
/* ---------- el flujo ---------- */
function volverAlMenu(){ J.modo = 'menu'; J.pausa = false; J.gen++; UI.p = 'principal'; UI.t = 0; SON.musica('menu'); SON.ambiente('templo'); SON.filtroMuerte(false); SON.lento(0); SON.cinta(0.3);
  POST.satur = 1.15; POST.vin = 0.3; J.ts = 1; prepararFondoMenu(); }
function reintentar(){ if(J.infinito) empezarInfinito(); else empezarNivel(J.idx); }
function pausar(){ if(J.modo !== 'juego' || NIN.est === 'muerto') return; J.pausa = !J.pausa; UI.p = 'pausa'; UI.t = 0; J.apunta = null; DEDO = null; SON.fx('boton'); }
/* ---------- el fondo del menú: una torre infinita con un ninja que salta solo ---------- */
function prepararFondoMenu(){ J.nivel = {id:'menu', mundo:'bambu', mi:0, n:0}; J.infinito = false; armarInfinito(); arrancarCorrida(0); J.modo = 'menu'; J.tinta = null; NIN.quieto = 0; }
function pasoFondoMenu(dt){
  for(const p of MAPA.plats){ const u = (Math.sin(J.tr*p.v*2 + p.f) + 1)/2, nx = lerp(p.xa, p.xb, u); p.dx = nx - p.x; p.x = nx; }
  J.t += dt; J.fundido = Math.max(0, J.fundido - dt*2); pasoNinja(dt); pasoParticulas(dt); pasoDesm(dt);
  for(const t of J.textos){ t.t -= dt; t.y -= dt*18; } J.textos = J.textos.filter(t => t.t > 0);
  if(NIN.est === 'aire'){ for(const e of ENEM){ if(e.muerto) continue; const cy = e.t === 'cometa' ? e.y - 6 : e.y - 5; if(Math.abs(NIN.x - e.x) < 6 && Math.abs(NIN.y - cy) < 9){ e.muerto = true; tinta(e.x, cy, 12, 1); J.tajo = {x:e.x, y:cy, a:Math.atan2(NIN.vy, NIN.vx), t:0.18}; } } }
  if(J.tajo){ J.tajo.t -= dt; if(J.tajo.t <= 0) J.tajo = null; }
  if(NIN.est === 'muerto' || NIN.y > CAM.y + H + 40){ prepararFondoMenu(); return; }
  while(MAPA.rMin > Math.floor((CAM.y - H)/CEL) - 10) tramoInfinito();
  /* el ninja del menú: cada tanto prueba saltos y se queda con uno que sube y lo deja pegado */
  if(NIN.est === 'pegado'){ NIN.quieto += dt; if(NIN.quieto > 0.9){ NIN.quieto = 0; let mejor = null;
    for(let i = 0; i < 40; i++){ const a = NIN.ny === 1 ? Math.PI*(0.1 + Math.random()*0.8) : -Math.PI*(0.08 + Math.random()*0.84), f = 0.55 + Math.random()*0.45, dx = -Math.cos(a)*V_MAX*f/5.6, dy = -Math.sin(a)*V_MAX*f/5.6, v = velTiro(dx, dy, NIN.nx, NIN.ny); if(!v) continue;
      const o = {x:NIN.x, y:NIN.y, vx:v.vx, vy:v.vy}; let r = null; for(let s = 0; s < 150; s++){ r = pasoCuerpo(o, 1/60, true); if(r) break; }
      if(r && r.pega && (!mejor || o.y < mejor.y + rv(-20, 20))) mejor = {dx, dy, y:o.y}; }
    if(mejor) saltar(mejor.dx, mejor.dy); } }
  CAM.objY = Math.min(NIN.y - H*0.55, CEL - H*0.86); CAM.y += (CAM.objY - CAM.y)*(1 - Math.exp(-dt*2));
}
