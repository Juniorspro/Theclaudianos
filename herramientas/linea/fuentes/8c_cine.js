/* ================================================================ cinemáticas
   Un guion es una lista de pasos: 'escena' (el fondo: el depto, el auto, el amanecer), 'narra' (texto
   al medio), 'msg' (el contestador, a máquina con voz), 'titulo' (el cartel del capítulo), 'fx', 'musica',
   'espera' y 'creditos'. El toque completa el texto o pasa; SALTEAR arriba a la derecha. */
const GUIONES = {
  prologo:[{k:'musica', m:'departamento'}, {k:'amb', a:'departamento'}, {k:'escena', e:'depto'},
    {k:'narra', txt:'BUENOS AIRES, MARZO DE 1989.'}, {k:'narra', txt:'LA INFLACIÓN VA POR EL 17% POR MES.'},
    {k:'fx', f:'telefono'}, {k:'espera', t:1.4}, {k:'fx', f:'contestador'}, {k:'espera', t:0.8},
    {k:'msg', q:'NORMA', v:'norma', txt:'Hola, querido, habla Norma, de la panadería La Espiga.'},
    {k:'msg', q:'NORMA', v:'norma', txt:'Te dejé un pedido de prueba en la calle Bacacay, en Floresta. Una casita, una pavada.'},
    {k:'msg', q:'NORMA', v:'norma', txt:'La máscara está en la puerta. Y no le cuentes a nadie. Besito.'},
    {k:'escena', e:'auto'}, {k:'musica', m:'auto'}, {k:'amb', a:'calle'}, {k:'fx', f:'auto'}, {k:'espera', t:2.2}, {k:'titulo', cap:0}],
  once:[{k:'musica', m:'departamento'}, {k:'amb', a:'departamento'}, {k:'escena', e:'depto'},
    {k:'fx', f:'telefono'}, {k:'espera', t:1.2}, {k:'fx', f:'contestador'}, {k:'espera', t:0.6},
    {k:'msg', q:'NORMA', v:'norma', txt:'Hola, habla Norma otra vez. Hay un pedido grande de facturas en Lavalle al 2200, en Once.'},
    {k:'msg', q:'NORMA', v:'norma', txt:'Dos pisos. Los muchachos de traje blanco no pagaron la cuenta. Ya sabés cómo se cobra.'},
    {k:'escena', e:'auto'}, {k:'musica', m:'auto'}, {k:'amb', a:'calle'}, {k:'fx', f:'auto'}, {k:'espera', t:2.2}, {k:'titulo', cap:1}],
  bailanta:[{k:'musica', m:'departamento'}, {k:'amb', a:'departamento'}, {k:'escena', e:'depto'},
    {k:'fx', f:'telefono'}, {k:'espera', t:1.2}, {k:'fx', f:'contestador'}, {k:'espera', t:0.6},
    {k:'msg', q:'NORMA', v:'norma', txt:'Querido, ¿me escuchás? Esta noche hay baile en el Tropical de Constitución.'},
    {k:'msg', q:'NORMA', v:'norma', txt:'Cumbia hasta las seis. Los de traje blanco festejan algo. Arruinales la fiesta.'},
    {k:'escena', e:'auto'}, {k:'musica', m:'auto'}, {k:'amb', a:'calle'}, {k:'fx', f:'auto'}, {k:'espera', t:2.2}, {k:'titulo', cap:2}],
  deposito:[{k:'musica', m:'departamento'}, {k:'amb', a:'departamento'}, {k:'escena', e:'depto'},
    {k:'msg', q:'RADIO', v:'radio', txt:'...y el dólar cerró hoy a doscientos australes. Los supermercados remarcan dos veces por día...'},
    {k:'fx', f:'telefono'}, {k:'espera', t:1.2}, {k:'fx', f:'contestador'}, {k:'espera', t:0.6},
    {k:'msg', q:'NORMA', v:'norma', txt:'Hay un envío en un depósito de Dock Sud. Contenedores, perros y guardias con fusiles.'},
    {k:'msg', q:'NORMA', v:'norma', txt:'Los dólares salen de ahí. Que no salga nada más.'},
    {k:'escena', e:'auto'}, {k:'musica', m:'auto'}, {k:'amb', a:'calle'}, {k:'fx', f:'auto'}, {k:'espera', t:2.2}, {k:'titulo', cap:3}],
  mansion:[{k:'musica', m:'departamento'}, {k:'amb', a:'departamento'}, {k:'escena', e:'depto'},
    {k:'fx', f:'telefono'}, {k:'espera', t:1.2}, {k:'fx', f:'contestador'}, {k:'espera', t:0.9},
    {k:'msg', q:'???', v:'jefe', txt:'Así que vos sos el de la máscara.'},
    {k:'msg', q:'???', v:'jefe', txt:'Norma no existe, pibe. Nunca existió. Vení a San Isidro y te cuento quién te llama.'},
    {k:'msg', q:'???', v:'jefe', txt:'Te espero en el sótano.'},
    {k:'escena', e:'auto'}, {k:'musica', m:'auto'}, {k:'amb', a:'calle'}, {k:'fx', f:'auto'}, {k:'espera', t:2.2}, {k:'titulo', cap:4}],
  fin:[{k:'musica', m:'fin'}, {k:'amb', a:null}, {k:'escena', e:'amanecer'},
    {k:'narra', txt:'EL PATRÓN CAYÓ. LA PATOTA SE DESBANDÓ.'}, {k:'narra', txt:'EL DÓLAR SIGUIÓ SUBIENDO.'},
    {k:'escena', e:'depto'}, {k:'amb', a:'departamento'}, {k:'fx', f:'telefono'}, {k:'espera', t:1.6}, {k:'fx', f:'contestador'}, {k:'espera', t:0.8},
    {k:'msg', q:'NORMA', v:'norma', txt:'Hola, querido. Habla Norma. Tengo otro pedido.'},
    {k:'narra', txt:'¿QUIÉN LLAMA?'}, {k:'creditos'}]
};
const CREDITOS = ['LÍNEA CALIENTE', '', 'UNA BETA HECHA EN PÍXELES', 'DIBUJO, CÓDIGO Y MÚSICA POR CÓDIGO', '', 'HOMENAJE A HOTLINE MIAMI', '', 'BUENOS AIRES · 1989', '', 'GRACIAS POR JUGAR'];
function empezarCine(id, alFinal){
  J.cine = {pasos:GUIONES[id], i:-1, t:0, esc:'depto', txt:null, n:0, fin:alFinal, id};
  J.modo = 'cine'; SON.cinta(0.6); siguientePaso();
}
function siguientePaso(){
  const C = J.cine; if(!C) return;
  C.i++; C.t = 0; C.txt = null; C.n = 0;
  if(C.i >= C.pasos.length){ terminarCine(); return; }
  const p = C.pasos[C.i];
  if(p.k === 'escena'){ C.esc = p.e; C.te = 0; SON.fx('pagina'); siguientePaso(); }
  else if(p.k === 'musica'){ SON.musica(p.m); siguientePaso(); }
  else if(p.k === 'amb'){ SON.ambiente(p.a); siguientePaso(); }
  else if(p.k === 'fx'){ SON.fx(p.f); siguientePaso(); }
  else if(p.k === 'titulo'){ SON.fx('titulo'); SON.musica(null); }
  else if(p.k === 'msg' || p.k === 'narra'){ C.txt = tr(p.txt); }
}
function terminarCine(){ const f = J.cine && J.cine.fin; J.cine = null; SON.cinta(0); if(f) f(); }
function saltearCine(){ const C = J.cine; if(!C) return; /* se saltea hasta el cartel del capítulo, que se ve igual */
  const k = C.pasos.findIndex((p, i) => i > C.i && (p.k === 'titulo' || p.k === 'creditos'));
  for(let i = C.i + 1; i < (k < 0 ? C.pasos.length : k); i++){ const p = C.pasos[i]; if(p.k === 'escena') C.esc = p.e; if(p.k === 'musica') SON.musica(p.m); if(p.k === 'amb') SON.ambiente(p.a); }
  if(k < 0){ terminarCine(); return; } C.i = k - 1; siguientePaso(); }
function avanzarCine(x, y){
  const C = J.cine; if(!C) return;
  if(x > W - 70 && y < 22){ SON.fx('clic'); saltearCine(); return; }
  const p = C.pasos[C.i]; if(!p) return;
  if((p.k === 'msg' || p.k === 'narra') && C.txt && C.n < C.txt.length){ C.n = C.txt.length; return; }
  if(p.k === 'creditos' && C.t < 3) return;
  if(p.k === 'titulo' && C.t < 1.6) return;
  if(p.k === 'msg' || p.k === 'narra' || p.k === 'titulo' || p.k === 'creditos'){ SON.fx('clic'); siguientePaso(); }
}
function pasoCine(dtR){
  const C = J.cine; C.t += dtR; C.te = (C.te || 0) + dtR;
  const p = C.pasos[C.i]; if(!p) return;
  if(p.k === 'espera' && C.t >= p.t) siguientePaso();
  else if((p.k === 'msg' || p.k === 'narra') && C.txt){ const antes = Math.floor(C.n); C.n = Math.min(C.txt.length, C.n + dtR*(p.k === 'narra' ? 24 : 32));
    for(let i = antes; i < Math.floor(C.n); i++) if(p.k === 'msg') SON.voz(C.txt[i], p.v); else if(C.txt[i] !== ' ') SON.fx('clic', {vol:0.25}); }
  else if(p.k === 'titulo' && C.t > 4.2) siguientePaso();
  else if(p.k === 'creditos' && C.t > 16) siguientePaso();
}

/* ---------- los fondos ---------- */
let _DEPTO = null;
function deptoFondo(){
  if(_DEPTO) return _DEPTO;
  const w = 220, h = 150, [c, g] = lienzo(w, h);
  const pm = g.createPattern(patronPiso('madera', 5), 'repeat'); g.fillStyle = pm; g.fillRect(8, 8, w - 16, h - 16);
  rect(g, 0, 0, w, 8, '#c8bca8'); rect(g, 0, h - 8, w, 8, '#c8bca8'); rect(g, 0, 0, 8, h, '#c8bca8'); rect(g, w - 8, 0, 8, h, '#c8bca8');
  rect(g, 0, 7, w, 1, '#2a1a2a'); rect(g, 0, h - 8, w, 1, '#2a1a2a'); rect(g, 7, 0, 1, h, '#2a1a2a'); rect(g, w - 8, 0, 1, h, '#2a1a2a');
  /* la ventana de arriba, con la calle de neón */
  rect(g, 120, 0, 56, 8, '#5ab8e8'); rect(g, 120, 3, 56, 1, '#e8f8ff');
  const al = g.createPattern(patronPiso('alfombra', 9), 'repeat'); g.fillStyle = al; g.fillRect(40, 60, 90, 56);
  g.drawImage(hacerMueble('cama', 4), 14, 14); g.drawImage(hacerMueble('sofa', 7), 58, 110); g.drawImage(hacerMueble('tele', 2), 78, 62);
  g.drawImage(hacerMueble('mesaR', 3), 170, 100); g.drawImage(hacerMueble('hela', 6), 196, 14); g.drawImage(hacerMueble('mesada', 8), 150, 14); g.drawImage(hacerMueble('planta', 1), 14, 124);
  /* cajas de pizza y latas */
  rect(g, 100, 88, 14, 14, '#e8d8b0'); rect(g, 101, 89, 12, 12, '#d8c090'); rect(g, 104, 92, 6, 1, '#a02a1a'); rect(g, 118, 94, 12, 12, '#e8d8b0');
  for(const [x, y] of [[48, 70], [134, 82], [160, 128]]){ rect(g, x, y, 3, 3, '#c8c8d0'); px(g, x + 1, y + 1, '#8a1a1a'); }
  _DEPTO = c; return c;
}
function dibujarCine(g, dtR){
  const C = J.cine, t = J.tr, e = C.esc;
  g.fillStyle = '#08020e'; g.fillRect(0, 0, W, H);
  if(e === 'depto'){
    const d = deptoFondo(), x0 = Math.round(W/2 - d.width/2 + Math.sin(C.te*0.2)*6), y0 = Math.round(H/2 - d.height/2 - 18 + Math.cos(C.te*0.17)*3);
    g.drawImage(d, x0, y0);
    /* la tele prende y apaga su luz azul, la lluvia entra de afuera y el contestador titila */
    const k = 0.5 + Math.sin(t*23)*0.2 + Math.sin(t*7.3)*0.3; g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(x0 + 85, y0 + 70, 2, x0 + 85, y0 + 70, 60); gr.addColorStop(0, 'rgba(90,150,255,' + (0.35*k).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(40,60,160,0)'); g.fillStyle = gr; g.fillRect(x0 + 25, y0 + 10, 120, 120);
    const gn = g.createRadialGradient(x0 + 148, y0, 2, x0 + 148, y0, 70); gn.addColorStop(0, 'rgba(255,60,160,0.35)'); gn.addColorStop(1, 'rgba(255,60,160,0)'); g.fillStyle = gn; g.fillRect(x0 + 78, y0, 140, 70);
    g.globalCompositeOperation = 'source-over';
    rect(g, x0 + 172, y0 + 104, 10, 6, '#2a2a30'); px(g, x0 + 180, y0 + 105, Math.floor(t*2.5) % 2 ? '#ff2a2a' : '#5a0a0a');
    /* el pibe en el sillón */
    persona(g, x0 + 76, y0 + 116, -Math.PI/2, -Math.PI/2, 'pibe', 'pelo', null, 0, 0, 1);
    g.fillStyle = 'rgba(200,230,255,0.25)'; for(let i = 0; i < 26; i++){ const x = (i*37 + t*40) % W, y = (i*53 + t*170) % H; g.fillRect(Math.round(x), Math.round(y), 1, 3); }
  } else if(e === 'auto'){
    /* la calle de noche corre para abajo, con faroles; el Falcon va al medio */
    g.fillStyle = '#16121e'; g.fillRect(0, 0, W, H); const cx = Math.round(W/2);
    g.fillStyle = '#26222e'; g.fillRect(cx - 60, 0, 120, H); g.fillStyle = '#3a3440'; g.fillRect(cx - 64, 0, 4, H); g.fillRect(cx + 60, 0, 4, H);
    const v = C.te*260;
    for(let y = -40 + (v % 40); y < H; y += 40){ g.fillStyle = '#e8c860'; g.fillRect(cx - 1, Math.round(y), 2, 18); }
    for(let y = -120 + (v % 120); y < H + 60; y += 120){ for(const s of [-1, 1]){ const fx = cx + s*84;
      g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(fx, y, 1, fx, y, 46); gr.addColorStop(0, 'rgba(255,190,90,0.4)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(fx - 46, y - 46, 92, 92); g.globalCompositeOperation = 'source-over';
      rect(g, fx - 2, y - 2, 4, 4, '#ffe8a0'); } }
    for(let i = 0; i < 6; i++){ const y = ((i*97 - v*0.95) % (H + 200) + H + 200) % (H + 200) - 100; rect(g, cx - 150 - (i % 2)*40, Math.round(y), 50, 70, i % 2 ? '#2a1a3a' : '#1a2a3a'); rect(g, cx + 100 + (i % 3)*20, Math.round(y + 40), 60, 80, i % 2 ? '#1a1a2a' : '#2a1a2a'); }
    g.save(); g.translate(cx + 22 + Math.round(Math.sin(C.te*1.3)*2), Math.round(H*0.62)); g.rotate(-Math.PI/2); g.drawImage(ARTE.auto, -20, -10); g.restore();
    g.globalCompositeOperation = 'lighter'; const gf = g.createLinearGradient(0, H*0.62 - 90, 0, H*0.62 - 18); gf.addColorStop(0, 'rgba(255,240,170,0)'); gf.addColorStop(1, 'rgba(255,240,170,0.3)'); g.fillStyle = gf;
    g.beginPath(); g.moveTo(cx + 14, H*0.62 - 18); g.lineTo(cx + 30, H*0.62 - 18); g.lineTo(cx + 52, H*0.62 - 90); g.lineTo(cx - 8, H*0.62 - 90); g.fill(); g.globalCompositeOperation = 'source-over';
  } else if(e === 'amanecer'){
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a0a4a'); gr.addColorStop(0.5, '#e8406a'); gr.addColorStop(0.8, '#ffb84a'); gr.addColorStop(1, '#ffe8a0'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const sy = Math.round(H*0.78 - Math.min(C.te, 12)*2); disco(g, W*0.62, sy, 26, '#fff0b0'); for(let i = 0; i < 6; i++){ g.fillStyle = 'rgba(232,64,106,0.8)'; g.fillRect(W*0.62 - 30, sy - 12 + i*6, 60, 2); }
    /* la ciudad, con el Obelisco en el medio */
    const base = Math.round(H*0.8); g.fillStyle = '#12061e';
    for(let x = 0; x < W; x += 9){ const hh = 20 + ((x*37) % 41) + ((x*13) % 17); g.fillRect(x, base - hh, 9, hh); }
    g.fillRect(0, base, W, H - base); const ox = Math.round(W*0.4); g.beginPath(); g.moveTo(ox - 5, base); g.lineTo(ox - 3, base - 96); g.lineTo(ox, base - 104); g.lineTo(ox + 3, base - 96); g.lineTo(ox + 5, base); g.fill();
    for(let i = 0; i < 40; i++){ const x = (i*53) % W, y = base - 8 - (i*29) % 50; if(Math.sin(t*0.7 + i) > 0.2) px(g, x, y, '#ffd84a'); }
  }
  /* el cartel del capítulo tapa todo */
  const p = C.pasos[C.i];
  if(p && p.k === 'titulo') cartelCapitulo(g, p.cap, C.t);
  if(p && p.k === 'creditos'){ g.fillStyle = 'rgba(8,2,14,0.8)'; g.fillRect(0, 0, W, H); }
}
function cartelCapitulo(g, i, t){
  const cap = CAPITULOS[i], M = META_CAP[cap.id];
  g.fillStyle = '#0a0412'; g.fillRect(0, 0, W, H);
  /* bandas de color que barren, como en la tele */
  for(let k = 0; k < 7; k++){ const y = Math.round(H*0.5 + Math.sin(t*1.3 + k*0.8)*H*0.45); g.fillStyle = ['#ff3aa8', '#5ae8ff', '#ffd84a', '#8a4aff'][k % 4]; g.globalAlpha = 0.18; g.fillRect(0, y, W, 2 + k % 3); }
  g.globalAlpha = lim(t*2, 0, 1)*lim((4.2 - t)*2, 0, 1);
  textoOnda(g, tr(M.num), W/2, Math.round(H*0.2), 'cian', 1, 1, t*4);
  const nom = tr(M.nombre), e = lienzoTexto(nom, 'rosa').width*3 > W - 20 ? 2 : 3;
  /* el nombre grande, corrido en rojo y azul */
  g.globalCompositeOperation = 'lighter'; const sep = Math.round(2 + Math.sin(t*9)*1.5);
  textoOnda(g, nom, W/2 - sep, Math.round(H*0.36), 'rojo', e, 1.6, t*3); textoOnda(g, nom, W/2 + sep, Math.round(H*0.36), 'azul', e, 1.6, t*3);
  g.globalCompositeOperation = 'source-over'; textoOnda(g, nom, W/2, Math.round(H*0.36), 'rosa', e, 1.6, t*3);
  texto(g, tr(M.fecha), W/2, Math.round(H*0.68), 'oro'); texto(g, tr(M.lugar), W/2, Math.round(H*0.68) + 12, 'blanco');
  g.globalAlpha = 1;
}
/* el HUD de la cinemática: la caja del contestador, la narración, SALTEAR, los créditos */
function hudCine(g){
  const C = J.cine, p = C.pasos[C.i]; if(!p) return;
  const t = J.tr;
  if(p.k !== 'titulo' && p.k !== 'creditos'){ g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(W - 66, 3, 62, 14); texto(g, tr('SALTEAR') + ' ▶', W - 35, 6, 'blanco'); }
  if(p.k === 'msg' && C.txt){ const bw = Math.min(W - 24, 420), bx = Math.round(W/2 - bw/2), by = H - 64;
    g.fillStyle = 'rgba(10,4,20,0.9)'; g.fillRect(bx, by, bw, 56); g.fillStyle = p.v === 'jefe' ? '#ff3a5a' : p.v === 'radio' ? '#ffd84a' : '#ff5ad8'; g.fillRect(bx, by, bw, 2); g.fillRect(bx, by + 54, bw, 2);
    const cab = p.v === 'radio' ? tr('RADIO · AM 790') : tr('CONTESTADOR · MENSAJE NUEVO');
    texto(g, cab, bx + 6, by + 5, 'gris', {izq:true}); texto(g, p.q === '???' ? '???' : tr(p.q), bx + bw - 6, by + 5, p.v === 'jefe' ? 'rojo' : 'rosa', {der:true});
    if(Math.floor(t*2) % 2) disco(g, bx + bw - 8 - lienzoTexto(p.q, 'rosa').width - 6, by + 8, 2, '#ff2a2a');
    const lineas = partir(C.txt.slice(0, Math.floor(C.n)), Math.floor((bw - 12)/6));
    lineas.slice(0, 3).forEach((l, i) => texto(g, l.toUpperCase(), bx + 6, by + 18 + i*11, 'blanco', {izq:true}));
    if(C.n >= C.txt.length && Math.floor(t*3) % 2) texto(g, '▶', bx + bw - 10, by + 42, 'rosa'); }
  if(p.k === 'narra' && C.txt){ const l = partir(C.txt.slice(0, Math.floor(C.n)), Math.floor((W - 30)/6)); g.fillStyle = 'rgba(8,2,14,0.55)'; g.fillRect(0, Math.round(H*0.42) - 6, W, 14*l.length + 10);
    l.forEach((s, i) => texto(g, s, W/2, Math.round(H*0.42) + i*14, 'oro')); }
  if(p.k === 'creditos'){ const y0 = H - C.t*22; CREDITOS.forEach((s, i) => { const y = Math.round(y0 + i*18); if(y > -10 && y < H) (i === 0 ? textoOnda(g, tr(s), W/2, y, 'rosa', 2, 1.4, t*4) : texto(g, tr(s), W/2, y, 'blanco')); });
    if(C.t > 3) texto(g, tr('TOCÁ PARA SEGUIR'), W/2, H - 12, 'gris'); }
}
function partir(s, n){ const out = []; let l = ''; for(const w of s.split(' ')){ if((l + ' ' + w).trim().length > n){ out.push(l.trim()); l = w; } else l += ' ' + w; } if(l.trim()) out.push(l.trim()); return out; }
