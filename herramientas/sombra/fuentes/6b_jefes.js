/* ================================================================ los jefes: el último nivel de cada mundo termina en una arena cerrada
   Se entra por un hueco del piso que se cierra con reja; arriba otra reja tapa el torii hasta que el jefe cae.
   Al jefe se lo golpea como a todos: atravesándolo de un salto. Cada golpe lo deja un rato sin que se lo pueda tocar. */
const JEFES = {
  tengu: {nombre:'EL GRAN TENGU', hp:5, hw:9, hh:8, col:'#e8384a'},
  yuki:  {nombre:'YUKI-ONNA', hp:6, hw:6, hh:10, col:'#9ae8ff'},
  shogun:{nombre:'EL SHOGUN', hp:7, hw:8, hh:13, col:'#ffc830'}
};
const JEFE_DE = {bambu:'tengu', montana:'yuki', castillo:'shogun'};
/* la arena: 23 filas de alto adentro, repisas a los costados y una isla en el medio */
function arena(base){
  const piso = base - 1, techo = piso - 24;
  for(let c = 1; c < COLS - 1; c++) if(c < 9 || c > 12) poner(c, piso, T_PIEDRA);
  rect2(1, piso - 6, 4, piso - 6, T_PIEDRA); rect2(COLS - 5, piso - 6, COLS - 2, piso - 6, T_PIEDRA);
  rect2(9, piso - 11, 12, piso - 11, T_PIEDRA);
  rect2(1, piso - 15, 3, piso - 15, T_PIEDRA); rect2(COLS - 4, piso - 15, COLS - 2, piso - 15, T_PIEDRA);
  rect2(1, piso - 20, 5, piso - 20, T_PIEDRA); rect2(COLS - 6, piso - 20, COLS - 2, piso - 20, T_PIEDRA);
  for(let c = 1; c < COLS - 1; c++) if(c < 9 || c > 12){ poner(c, techo, T_PIEDRA); poner(c, techo - 1, T_PIEDRA); }
  MAPA.deco.push({t:'cuerda', y:(techo + 3)*CEL, f:1});
  return {h:26, pisoY:piso*CEL, techoY:(techo + 1)*CEL, hueco:{c0:9, c1:12, r:piso}, reja:{c0:9, c1:12, r0:techo - 1, r1:techo}};
}
function crearJefe(tipo, A){
  const D = JEFES[tipo], medio = (A.techoY + A.pisoY)/2;
  const j = {tipo, D, hp:D.hp, x:ANCHO/2, y:tipo === 'shogun' ? A.pisoY - D.hh : medio - 30, y0:0, est:'dormido', tt:0, t:0, inv:0, dir:1, alfa:1, activo:false, intro:0, muere:0, fuera:false, ciclo:0, vx:0, vy:0, peligroso:false, pista:false};
  j.y0 = j.y; if(tipo !== 'shogun') j.y = A.techoY - 30;                                    /* los que vuelan bajan del techo en la presentación */
  return j;
}
function activarJefe(j){
  const A = J.arena; j.activo = true; j.intro = 2.4; j.est = 'intro';
  for(let c = A.hueco.c0; c <= A.hueco.c1; c++) poner(c, A.hueco.r, T_REJA);                  /* se cierra por abajo */
  sfx('titulo'); J.sacude = 1; vibrar(60);
}
const ANCLAS = A => [[34, A.techoY + 30], [ANCHO - 34, A.techoY + 30], [40, (A.techoY + A.pisoY)/2], [ANCHO - 40, (A.techoY + A.pisoY)/2], [ANCHO/2, A.techoY + 26]];
function pasoJefe(dt){
  const j = J.jefe; if(!j || j.fuera) return; const A = J.arena, N = NIN;
  if(!j.activo){ if(N.y < A.pisoY - 14 && N.est !== 'muerto' && N.est !== 'meta') activarJefe(j); else return; }
  j.t += dt; j.inv = Math.max(0, j.inv - dt);
  if(J.tinta && J.tinta.y < A.pisoY + 50) J.tinta.y = A.pisoY + 50;                           /* la tinta espera afuera */
  if(j.intro > 0){ j.intro -= dt; if(j.tipo !== 'shogun') j.y += (j.y0 - j.y)*(1 - Math.exp(-dt*3)); if(j.intro <= 0){ j.est = j.tipo === 'shogun' ? 'camina' : j.tipo === 'yuki' ? 'flota' : 'vuela'; j.tt = 1.2; j.obj = ANCLAS(A)[0]; } return; }
  if(j.muere > 0){ j.muere -= dt; J.sacude = Math.max(J.sacude, 0.8); if(Math.random() < dt*14) tinta(j.x + rv(-10, 10), j.y + rv(-10, 10), 6, 1);
    if(j.muere <= 0) jefeCae(j); return; }
  if(N.est === 'muerto') return;
  IA_JEFE[j.tipo](j, dt, A, N);
  /* el contacto: en el aire se lo golpea (si se puede); pegado, si viene atacando, mata */
  const toca = Math.abs(N.x - j.x) < j.D.hw + HW && Math.abs(N.y - j.y) < j.D.hh + HH;
  if(toca && N.est === 'aire'){ if(j.inv <= 0 && vulnerable(j, N)) golpearJefe(j); else if(!j.rebote || j.t - j.rebote > 0.3) rebotaJefe(j); }
  else if(toca && N.est === 'pegado' && j.peligroso) morir('jefe');
}
function vulnerable(j, N){
  if(j.tipo === 'yuki') return j.alfa > 0.8;
  if(j.tipo === 'shogun') return (N.y < j.y - j.D.hh + 5 && N.vy > 0) || Math.sign(N.x - j.x) === -j.dir;      /* de arriba o por la espalda */
  return true;
}
function golpearJefe(j){
  j.hp--; j.inv = 1.2; J.hitstop = 0.1; J.sacude = 1.3; POST.aber = 3; vibrar(50); tinta(j.x, j.y, 22, 1.3);
  NIN.vy = -220; NIN.vx = Math.sign(NIN.x - j.x || 1)*120; NIN.dj = Math.max(NIN.dj, NJ().saltos || 1); NIN.tAire = 0.5;
  const p = 500*(NJ().bajas || 1); J.puntos += p; J.textos.push({x:j.x, y:j.y - 20, txt:'+' + p, t:1.1, grad:'oro'});
  sfx('corte'); sfx('combo', {n:Math.min(10, j.D.hp - j.hp + 2)}); J.tajo = {x:j.x, y:j.y, a:Math.atan2(NIN.vy, NIN.vx), t:0.18};
  if(j.tipo === 'yuki'){ j.est = 'se_va'; j.tt = 0.5; }
  if(j.hp <= 0){ j.muere = 1.8; j.peligroso = false; sfx('muerte'); BALAS = []; J.marcas = []; }
}
function rebotaJefe(j){ j.rebote = j.t; NIN.vx = Math.sign(NIN.x - j.x || 1)*150; NIN.vy = -150; NIN.tAire = 0.5; sfx('pegar'); polvo(NIN.x, NIN.y, 6, '#ffe0a0');
  if(j.tipo === 'shogun'){ J.textos.push({x:j.x, y:j.y - 26, txt:tr('¡CLANG!'), t:0.8, grad:'blanco'}); if(!j.pista){ j.pista = true; J.textos.push({x:ANCHO/2, y:j.y - 42, txt:tr('¡DE ARRIBA O POR LA ESPALDA!'), t:2.4, grad:'oro'}); } } }
function jefeCae(j){
  const A = J.arena; j.fuera = true; J.bajas++; sfx('meta'); J.sacude = 1.5; POST.destello = 0.4;
  for(let c = A.reja.c0; c <= A.reja.c1; c++){ poner(c, A.reja.r0, T_AIRE); poner(c, A.reja.r1, T_AIRE); }
  for(let i = 0; i < 12; i++){ const a = i/12*6.283; MONEDAS.push({x:lim(j.x + Math.cos(a)*22, 14, ANCHO - 14), y:lim(j.y + Math.sin(a)*18, A.techoY + 8, A.pisoY - 8), t:i}); } J.totMonedas += 12;
  J.textos.push({x:ANCHO/2, y:A.techoY + 30, txt:tr('¡LA REJA SE ABRIÓ!'), t:2.5, grad:'oro'});
}
/* ---------- cada jefe piensa a su manera ---------- */
const IA_JEFE = {
  /* el tengu vuela entre anclas, carga y tira un abanico de plumas; herido, apunta y se tira en picada */
  tengu(j, dt, A, N){ j.peligroso = j.est === 'picada';
    if(j.est === 'vuela'){ const [ox, oy] = j.obj, dx = ox - j.x, dy = oy - j.y, d = Math.hypot(dx, dy); j.dir = N.x >= j.x ? 1 : -1;
      if(d > 3){ const v = Math.min(d, 72*dt); j.x += dx/d*v; j.y += dy/d*v; } else { j.est = 'carga'; j.tt = 1.0; } }
    else if(j.est === 'carga'){ j.tt -= dt; j.dir = N.x >= j.x ? 1 : -1; if(j.tt <= 0){ j.ciclo++;
      if(j.hp <= 3 && j.ciclo % 2 === 0){ j.est = 'apunta'; j.tt = 0.65; sfx('laser_carga', {vol:0.6}); }
      else { const a = Math.atan2(N.y - j.y, N.x - j.x), n = j.hp <= 3 ? 2 : 1; for(let k = -n; k <= n; k++) BALAS.push({x:j.x, y:j.y, vx:Math.cos(a + k*0.26)*100, vy:Math.sin(a + k*0.26)*100, t:'pluma', vida:2.6, w:2, h:2});
        sfx('shuriken'); j.est = 'vuela'; const an = ANCLAS(A); j.obj = an[(j.ciclo*3 + 1) % an.length]; } } }
    else if(j.est === 'apunta'){ j.tt -= dt; if(j.tt > 0.2) j.ang = Math.atan2(N.y - j.y, N.x - j.x); if(j.tt <= 0){ j.est = 'picada'; j.tt = 1.1; j.vx = Math.cos(j.ang)*235; j.vy = Math.sin(j.ang)*235; } }
    else if(j.est === 'picada'){ j.tt -= dt; j.x += j.vx*dt; j.y += j.vy*dt;
      if(j.tt <= 0 || j.x < 14 || j.x > ANCHO - 14 || j.y < A.techoY + 8 || j.y > A.pisoY - 8){ j.x = lim(j.x, 14, ANCHO - 14); j.y = lim(j.y, A.techoY + 8, A.pisoY - 8); J.sacude = 0.6; j.est = 'vuela'; const an = ANCLAS(A); j.obj = an[j.ciclo % an.length]; } } },
  /* yuki-onna flota arriba, hace caer carámbanos donde estás y, herida, sopla esquirlas; cuando la golpean se desvanece y aparece en otro lado */
  yuki(j, dt, A, N){ j.peligroso = false;
    if(j.est === 'se_va'){ j.tt -= dt; j.alfa = Math.max(0, j.tt/0.5); if(j.tt <= 0){ const an = ANCLAS(A), p = an[Math.floor(Math.random()*an.length)]; j.x = p[0]; j.y = p[1]; j.est = 'vuelve'; j.tt = 0.5; } return; }
    if(j.est === 'vuelve'){ j.tt -= dt; j.alfa = 1 - Math.max(0, j.tt/0.5); if(j.tt <= 0){ j.est = 'flota'; j.tt = 1.2; } return; }
    j.alfa = 1; j.dir = N.x >= j.x ? 1 : -1; j.x += Math.sin(j.t*0.9)*22*dt; j.y += Math.sin(j.t*1.7)*10*dt; j.x = lim(j.x, 20, ANCHO - 20);
    if(j.est === 'flota'){ j.tt -= dt; if(j.tt <= 0){ j.ciclo++; j.est = 'hielo'; j.tt = 0.85; J.marcas = []; const xs = [N.x]; for(let i = 0; i < 3 + (j.hp <= 3 ? 2 : 0); i++) xs.push(16 + Math.random()*(ANCHO - 32));
      for(const x of xs) J.marcas.push({x, y:A.techoY, t:0.85, tipo:'hielo'}); sfx('laser_carga', {vol:0.5}); } }
    else if(j.est === 'hielo'){ j.tt -= dt; if(j.tt <= 0){ for(const m of J.marcas) BALAS.push({x:m.x, y:A.techoY + 3, vx:0, vy:20, t:'hielo', vida:2, w:1.5, h:4, grav:true}); J.marcas = []; sfx('desmorona');
      if(j.hp <= 4){ j.est = 'aliento'; j.tt = 0.5; } else { j.est = 'flota'; j.tt = 1.3; } } }
    else if(j.est === 'aliento'){ j.tt -= dt; if(j.tt <= 0){ const a = Math.atan2(N.y - j.y, N.x - j.x); for(let k = -3; k <= 3; k++) BALAS.push({x:j.x, y:j.y, vx:Math.cos(a + k*0.14)*115, vy:Math.sin(a + k*0.14)*115, t:'esquirla', vida:2.2, w:1.5, h:1.5});
      sfx('shuriken'); j.est = 'flota'; j.tt = 1.4; } } },
  /* el shogun camina por el piso mirándote, corta de lado a lado a tu altura, salta y hace temblar el piso, y hace llover fuego */
  shogun(j, dt, A, N){
    if(j.est === 'salto'){ j.vy += 700*dt; j.y += j.vy*dt; j.x += j.vx*dt; j.x = lim(j.x, 18, ANCHO - 18); j.peligroso = j.vy > 0;
      if(j.y >= A.pisoY - j.D.hh){ j.y = A.pisoY - j.D.hh; j.est = 'camina'; j.tt = 1.4; j.peligroso = false; J.sacude = 1.2; sfx('desmorona');
        for(const s of [-1, 1]) BALAS.push({x:j.x + s*10, y:A.pisoY - 4, vx:s*190, vy:0, t:'ola', vida:1.2, w:4, h:3.5}); }
      return; }
    j.peligroso = false;
    if(j.est === 'camina'){ j.dir = N.x >= j.x ? 1 : -1; j.tt -= dt; if(Math.abs(N.x - j.x) > 12) j.x += j.dir*22*dt; j.x = lim(j.x, 18, ANCHO - 18);
      if(N.est === 'pegado' && Math.abs(N.x - j.x) < 14 && Math.abs(N.y - j.y) < 16) j.peligroso = true;
      if(j.tt <= 0){ j.ciclo++; const r = j.ciclo % 3;
        if(r === 1 && j.hp <= 5){ j.est = 'salto'; j.vy = -340; j.vx = (N.x - j.x)*0.9; sfx('samurai'); }
        else if(r === 2 && j.hp <= 3){ j.est = 'fuego'; j.tt = 0.7; J.marcas = []; for(let i = 0; i < 6; i++) J.marcas.push({x:16 + i*(ANCHO - 32)/5 + rv(-6, 6), y:A.techoY, t:0.7, tipo:'fuego'}); sfx('laser_carga', {vol:0.5}); }
        else { j.est = 'tajo'; j.tt = 0.8; j.yTajo = lim(N.y, A.techoY + 8, A.pisoY - 5); J.marcas = [{x:0, y:j.yTajo, t:0.8, tipo:'tajo'}]; sfx('samurai'); } } }
    else if(j.est === 'tajo'){ j.tt -= dt; if(j.tt <= 0){ for(const s of [-1, 1]) BALAS.push({x:j.x + s*8, y:j.yTajo, vx:s*255, vy:0, t:'onda', vida:1.1, w:6, h:2.5}); J.marcas = []; sfx('corte'); j.est = 'camina'; j.tt = 1.6; } }
    else if(j.est === 'fuego'){ j.tt -= dt; if(j.tt <= 0){ for(const m of J.marcas) BALAS.push({x:m.x, y:A.techoY + 3, vx:0, vy:30, t:'fuego', vida:2, w:2.5, h:2.5, grav:true}); J.marcas = []; j.est = 'camina'; j.tt = 1.4; } } }
};

/* ================================================================ dibujar a los jefes */
/* la mira del tengu antes de tirarse en picada (va aparte: sale del cuadro del jefe) */
function dibujarMiraJefe(g, j){ if(!j || j.fuera || j.tipo !== 'tengu' || j.est !== 'apunta') return; const x = Math.round(j.x), y = Math.round(j.y);
  g.globalAlpha = 0.4 + (0.65 - j.tt)*0.9; linea(g, x, y, x + Math.cos(j.ang)*200, y + Math.sin(j.ang)*200, j.tt < 0.2 ? '#ffffff' : '#ff3a3a', 1); g.globalAlpha = 1; }
function dibujarJefe(g, j, E){
  if(!j || j.fuera || !j.activo && j.tipo !== 'shogun' && j.est === 'dormido' && false) return;
  const x = Math.round(j.x), y = Math.round(j.y), t = J.tr, col = E.silueta, d = j.dir, parpa = j.inv > 0 && Math.floor(t*16) % 2;
  if(j.muere > 0){ g.globalAlpha = lim(j.muere/1.8, 0, 1); }
  if(j.tipo === 'tengu'){
    const aleteo = Math.sin(t*(j.est === 'picada' ? 22 : 9)), carga = j.est === 'carga' || j.est === 'apunta';
    /* las alas: cuatro plumas grandes por lado que suben y bajan */
    for(const s of [-1, 1]) for(let k = 0; k < 4; k++){ const a = -Math.PI/2 + s*(0.9 + k*0.28) + aleteo*0.35*s, L = 15 - k*1.5;
      linea(g, x + s*3, y - 3, x + s*3 + Math.cos(a)*L, y - 3 + Math.sin(a)*L, k === 0 ? tono(col, 1.6) : col, 2); }
    elipse(g, x, y + 1, 6, 7, col); elipse(g, x - 1, y, 4, 5, tono(col, 1.5));
    for(let k = 0; k < 3; k++) linea(g, x - 2 + k*2, y + 7, x - 3 + k*3, y + 12, col, 1);                /* la cola */
    disco(g, x + d*2, y - 8, 4, col);
    linea(g, x + d*4, y - 8, x + d*10, y - 8 + (carga ? -1 : 1), '#c8283a', 2);                         /* la nariz larga del tengu */
    px(g, x + d*3, y - 10, carga ? '#ff3a3a' : '#ffffff'); px(g, x + d*1, y - 10, carga ? '#ff3a3a' : '#ffffff');
    rect(g, x - 3, y - 13, 6, 2, col); rect(g, x - 1, y - 15, 2, 2, col);                                /* el tokin */
    const fx2 = x - d*6, fy = y + 2; g.fillStyle = '#5a8a3a'; for(let k = 0; k < 4; k++) g.fillRect(fx2 - d*k - 1, fy - 2 + k, 3, 1);   /* el abanico de hoja */
    }
  else if(j.tipo === 'yuki'){
    g.globalAlpha = (j.muere > 0 ? lim(j.muere/1.8, 0, 1) : 1)*j.alfa;
    for(let k = 0; k < 7; k++){ const o = Math.sin(t*2 + k*0.7)*3; linea(g, x - d*1, y - 9, x - d*(4 + k) + o, y + 4 + k*2, '#0a0a14', 1); }     /* el pelo larguísimo */
    for(let k = 0; k < 12; k++){ const w = 2 + k*0.45; g.fillStyle = k < 9 ? (k % 3 ? '#e8f0ff' : '#c8d8f8') : 'rgba(200,220,255,0.5)'; g.fillRect(Math.round(x - w), y - 5 + k, Math.round(w*2), 1); }
    for(let k = 0; k < 4; k++) px(g, x + Math.round(Math.sin(t*3 + k)*6), y + 8 + k*2, 'rgba(230,240,255,0.6)');   /* se deshace en niebla */
    elipse(g, x, y - 9, 3, 3.5, '#f4f8ff'); rect(g, x - 3, y - 12, 6, 2, '#0a0a14');
    px(g, x - 1 + d, y - 9, '#5ae0ff'); px(g, x + 1 + d, y - 9, '#5ae0ff'); rect(g, x + d, y - 7, 1, 1, '#8a2a3a');
    for(let k = 0; k < 5; k++){ const a = t*1.5 + k*1.256; px(g, x + Math.cos(a)*12, y + Math.sin(a)*8, '#ffffff'); }
    if(j.est === 'aliento'){ g.globalAlpha = 0.5; disco(g, x + d*5, y - 6, 3, '#c8f0ff'); } }
  else if(j.tipo === 'shogun'){
    const lev = j.est === 'tajo', sal = j.est === 'salto';
    rect(g, x - 6, y + 6, 4, 7, col); rect(g, x + 2, y + 6, 4, 7, col);                                  /* piernas */
    for(let k = 0; k < 3; k++){ rect(g, x - 8 + k, y + 1 + k*2, 16 - k*2, 2, k % 2 ? '#6a1418' : '#8a2020'); }           /* kusazuri */
    rect(g, x - 6, y - 8, 12, 10, '#4a0e12'); for(let k = 0; k < 4; k++) rect(g, x - 6, y - 7 + k*2, 12, 1, k % 2 ? '#c8a040' : '#8a1a1a');  /* coraza con cordones */
    for(const s of [-1, 1]) for(let k = 0; k < 3; k++) rect(g, x + s*7 - (s < 0 ? 4 : 0), y - 8 + k*3, 4, 3, k % 2 ? '#8a2020' : '#5a1216');    /* hombreras */
    disco(g, x, y - 12, 4, col); rect(g, x - 5, y - 15, 10, 3, '#2a0a0a'); rect(g, x - 6, y - 13, 12, 1, '#2a0a0a');       /* kabuto */
    rect(g, x - 1, y - 20, 2, 5, '#ffc830'); rect(g, x - 5, y - 21, 3, 2, '#ffc830'); rect(g, x + 2, y - 21, 3, 2, '#ffc830');   /* la medialuna */
    rect(g, x - 3 + d, y - 11, 6, 3, '#c8283a'); px(g, x - 1 + d*2, y - 12, '#ffe060'); px(g, x + 1 + d*2, y - 12, '#ffe060');  /* menpo */
    /* la katana: atrás mientras camina, arriba al cargar el tajo, al frente al saltar */
    const ang = lev ? -2.3*d : sal ? 0.5*d : -0.4*d, hx = x + d*7, hy = y - 4; linea(g, hx, hy, hx + Math.sin(ang)*16*d, hy - Math.cos(ang)*16, '#e8ecf4', 1);
    if(Math.sign(NIN.x - x) === -d){ g.globalAlpha = 0.4 + Math.sin(t*8)*0.2; rect(g, x - d*6 - 1, y - 6, 2, 6, '#ffe060'); g.globalAlpha = 1; } }   /* la espalda brilla: por ahí se le pega */
  if(parpa){ g.globalAlpha = 0.6; disco(g, x, y, j.D.hw + 2, '#ffffff'); }
  g.globalAlpha = 1;
}
/* los avisos de los ataques: carámbanos y fuego que van a caer, el tajo de lado a lado */
function dibujarMarcas(g){ if(!J.marcas) return;
  for(const m of J.marcas){ m.t -= 1/60; const k = Math.floor(J.tr*12) % 2;
    if(m.tipo === 'tajo'){ g.globalAlpha = 0.35 + k*0.3; g.fillStyle = '#ff3a3a'; g.fillRect(8, Math.round(m.y), ANCHO - 16, 1); g.globalAlpha = 1; }
    else { g.fillStyle = m.tipo === 'hielo' ? '#c8f0ff' : '#ff8a2a'; g.globalAlpha = 0.5 + k*0.4; g.fillRect(Math.round(m.x) - 2, Math.round(m.y), 5, 2); g.fillRect(Math.round(m.x), Math.round(m.y) + 2, 1, 3); g.globalAlpha = 1; } } }
