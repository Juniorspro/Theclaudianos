/* ================================================================ el mutante
   Un muñeco de bloques que alguna vez fue un vecino: cabeza amarilla, la boca abierta hasta las orejas, los ojos
   que brillan en lo oscuro, el torso lleno de sangre y los brazos el doble de largos. Afuera da vueltas; elige
   la ventana más débil y más oscura, respira del otro lado del vidrio, lo rompe y arranca las tablas. La luz del
   cuarto lo espanta. Si entra, te busca: si te ve, grita y corre. */
const MON = {activo:false, estado:'fuera', x:0, y:0, z:20, yaw:Math.PI, piso:0, adentro:false, t:0, obj:null, camino:[], ci:0, vel:0, fase:0, anim:'quieto', animK:{},
  ultimo:null, cool:0, luzT:0, vistoT:0, ultVisto:null, oidoPos:null, entrada:null, placardVisto:null, forzar:null, mirarCamara:0, respT:0, visible:false, peekT:0, huyendo:false, pasoT:0, gritoT:0, adentroT:0, golpeT:0, apagar:0};
const MODELO = {raiz:null, partes:{}, ojos:[], mand:null};

/* la cara: se pinta en un lienzo para la cabeza y sirve también para la tele */
function dibujarCara(g, cx, cy, s){
  const u = s/100;
  g.save(); g.translate(cx - 50*u, cy - 50*u); g.scale(u, u);
  g.fillStyle = '#e3b618'; g.fillRect(0, 0, 100, 100);
  g.fillStyle = 'rgba(80,50,0,0.25)'; for(const [x, y, r] of [[18, 20, 14], [80, 70, 18], [30, 85, 12], [70, 15, 10]]){ g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  /* los ojos: cuencas negras hundidas */
  g.fillStyle = '#120806'; g.beginPath(); g.ellipse(30, 36, 13, 15, 0.15, 0, 7); g.fill(); g.beginPath(); g.ellipse(70, 34, 12, 16, -0.1, 0, 7); g.fill();
  g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(31, 38, 3.2, 0, 7); g.fill(); g.beginPath(); g.arc(69, 36, 3.2, 0, 7); g.fill();
  /* lágrimas de sangre */
  g.strokeStyle = '#6a0a08'; g.lineWidth = 3; g.beginPath(); g.moveTo(28, 50); g.lineTo(26, 70); g.moveTo(72, 49); g.lineTo(75, 64); g.stroke();
  /* la boca rota, hasta los costados, con dientes */
  g.fillStyle = '#1a0202'; g.beginPath(); g.moveTo(8, 62); g.quadraticCurveTo(50, 50, 92, 60); g.lineTo(88, 74); g.quadraticCurveTo(50, 98, 12, 76); g.closePath(); g.fill();
  g.fillStyle = '#5a0606'; g.beginPath(); g.ellipse(50, 80, 18, 7, 0, 0, 7); g.fill();
  g.fillStyle = '#efe6c8';
  for(let i = 0; i < 11; i++){ const x = 12 + i*7.4, y = 60 - Math.sin(i/10*Math.PI)*6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3.6, y + 9 + (i % 3)*2); g.lineTo(x + 7, y); g.fill(); }
  for(let i = 0; i < 10; i++){ const x = 16 + i*7.2, y = 78 + Math.sin(i/9*Math.PI)*8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3.5, y - 8 - (i % 2)*2); g.lineTo(x + 7, y); g.fill(); }
  g.fillStyle = 'rgba(120,8,6,0.85)'; for(const [x, w, l] of [[20, 4, 14], [44, 5, 20], [63, 4, 12], [80, 3, 16]]) g.fillRect(x, 84, w, l);
  g.restore();
}
function texCuerpo(base, sangre, seed){ const [c, g] = lienzo(64, 64), r = mulberry(seed); g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  for(let i = 0; i < 14; i++){ g.fillStyle = sangre; g.globalAlpha = 0.4 + r()*0.5; g.beginPath(); g.ellipse(r()*64, r()*64, 3 + r()*10, 2 + r()*8, r()*3, 0, 7); g.fill(); }
  g.globalAlpha = 1; ruido(g, 64, 64, 22, seed); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
function construirMonstruo(){
  const raiz = new THREE.Group(), P = MODELO.partes;
  /* un pelo de emisión: de noche se adivina la silueta amarilla aunque no le dé ninguna luz */
  const piel = new THREE.MeshPhongMaterial({map:texCuerpo('#d8ac14', '#7a0c0a', 3), shininess:20, specular:0x221a00, emissive:0x1c1604});
  const torsoM = new THREE.MeshPhongMaterial({map:texCuerpo('#5a0c0c', '#2a0202', 5), shininess:40, specular:0x331010});
  const pantal = new THREE.MeshPhongMaterial({map:texCuerpo('#2e4226', '#4a0808', 9), shininess:8});
  const garra = new THREE.MeshPhongMaterial({color:0x1a1210, shininess:60});
  const [fc, fg] = lienzo(128, 128); dibujarCara(fg, 64, 64, 128); const ft = new THREE.CanvasTexture(fc); ft.encoding = THREE.sRGBEncoding;
  const cara = new THREE.MeshPhongMaterial({map:ft, shininess:20});
  const bx = (w, h, d, m, x, y, z, padre) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; padre.add(me); return me; };
  const piv = (x, y, z, padre) => { const g = new THREE.Group(); g.position.set(x, y, z); padre.add(g); return g; };
  P.cadera = piv(0, 1.0, 0, raiz);
  P.torso = piv(0, 0, 0, P.cadera); bx(0.95, 1.05, 0.55, torsoM, 0, 0.55, 0, P.torso);
  for(let i = 0; i < 4; i++) bx(0.9, 0.05, 0.08, piel, 0, 0.35 + i*0.13, 0.28, P.torso);                         /* las costillas asoman */
  P.cuello = piv(0, 1.1, 0.05, P.torso); bx(0.3, 0.25, 0.3, piel, 0, 0.08, 0, P.cuello);
  P.cabeza = piv(0, 0.2, 0, P.cuello);
  const cabM = [piel, piel, piel, piel, cara, piel]; const cab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.95, 0.95), cabM); cab.position.set(0, 0.42, 0.05); cab.castShadow = true; P.cabeza.add(cab); MODELO.cab = cab;
  P.mand = piv(0, 0.08, 0.1, P.cabeza); const mnd = bx(0.9, 0.22, 0.8, piel, 0, -0.1, 0.12, P.mand);
  for(let i = 0; i < 7; i++) bx(0.07, 0.12, 0.04, new THREE.MeshPhongMaterial({color:0xe8e0c0}), -0.36 + i*0.12, 0.05, 0.5, P.mand);
  /* los ojos que brillan: dos puntitos y un halo que sólo se ve en lo oscuro */
  const [hc, hg] = lienzo(64, 64), hgr = hg.createRadialGradient(32, 32, 0, 32, 32, 32); hgr.addColorStop(0, 'rgba(255,250,200,1)'); hgr.addColorStop(0.25, 'rgba(255,230,120,0.6)'); hgr.addColorStop(1, 'rgba(255,200,60,0)'); hg.fillStyle = hgr; hg.fillRect(0, 0, 64, 64);
  const halo = new THREE.SpriteMaterial({map:new THREE.CanvasTexture(hc), color:0xfff0b0, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false});
  for(const x of [-0.2, 0.19]){ const o = new THREE.Sprite(halo); o.renderOrder = 10; o.scale.set(0.34, 0.34, 1); o.position.set(x, 0.49, 0.66); P.cabeza.add(o); MODELO.ojos.push(o);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({color:0xfffbe0, fog:false})); p.position.set(x, 0.49, 0.53); P.cabeza.add(p); }
  /* brazos larguísimos */
  for(const s of [-1, 1]){ const k = s < 0 ? 'I' : 'D';
    const h = P['hombro' + k] = piv(s*0.58, 0.95, 0, P.torso); bx(0.3, 0.3, 0.3, torsoM, 0, 0, 0, h);
    const b = P['brazo' + k] = piv(0, -0.05, 0, h); bx(0.24, 0.9, 0.24, piel, 0, -0.45, 0, b);
    const a = P['ante' + k] = piv(0, -0.9, 0, b); bx(0.22, 0.95, 0.22, piel, 0, -0.47, 0, a);
    const m = P['mano' + k] = piv(0, -0.95, 0, a); bx(0.3, 0.26, 0.34, piel, 0, -0.12, 0.04, m);
    for(let i = 0; i < 4; i++){ const gg = bx(0.05, 0.32, 0.05, garra, -0.11 + i*0.075, -0.36, 0.12, m); gg.rotation.x = 0.35; }
    const mu = P['muslo' + k] = piv(s*0.26, 0, 0, P.cadera); bx(0.34, 0.6, 0.36, pantal, 0, -0.3, 0, mu);
    const pi = P['pierna' + k] = piv(0, -0.58, 0, mu); bx(0.3, 0.44, 0.32, pantal, 0, -0.2, 0, pi); bx(0.34, 0.12, 0.5, piel, 0, -0.44, 0.08, pi);
  }
  P.cadera.position.y = 1.0; raiz.visible = false; MODELO.raiz = raiz; RND.esc.add(raiz);
  /* una luz roja tenue que lo sigue cuando está pegado a una ventana: se ve la cara del otro lado */
  return raiz;
}

/* ================================================================ animación a mano: cada estado pide ángulos y se mezclan */
function poseMonstruo(dt){
  const P = MODELO.partes, a = MON.anim, t = MON.fase, T = {};
  const pon = (k, x, y, z) => { T[k] = [x || 0, y || 0, z || 0]; };
  const s1 = Math.sin(t), s2 = Math.sin(t*2);
  let caderaY = 1.0, jaw = 0.12 + Math.sin(performance.now()/260)*0.04;
  if(a === 'camina'){ pon('torso', 0.38 + s2*0.03, s1*0.08, 0); pon('cuello', -0.25); pon('cabeza', 0.1 + s2*0.05, Math.sin(t*0.5)*0.2, s1*0.08);
    pon('brazoI', -0.2 + s1*0.45, 0, 0.12); pon('brazoD', -0.2 - s1*0.45, 0, -0.12); pon('anteI', -0.35); pon('anteD', -0.35);
    pon('musloI', -s1*0.55); pon('musloD', s1*0.55); pon('piernaI', Math.max(0, s1)*0.8); pon('piernaD', Math.max(0, -s1)*0.8); caderaY = 1.0 + Math.abs(s1)*0.05; }
  else if(a === 'corre'){ pon('torso', 1.15 + s2*0.08, 0, 0); pon('cuello', -0.9); pon('cabeza', -0.1 + s2*0.1, 0, 0);
    pon('brazoI', -1.6 + s1*0.9, 0, 0.1); pon('brazoD', -1.6 - s1*0.9, 0, -0.1); pon('anteI', -0.2); pon('anteD', -0.2);
    pon('musloI', -s1*0.9 - 0.3); pon('musloD', s1*0.9 - 0.3); pon('piernaI', 0.6 + s1*0.5); pon('piernaD', 0.6 - s1*0.5); caderaY = 0.85 + Math.abs(s2)*0.12; jaw = 0.4; }
  else if(a === 'ventana'){ const tir = Math.max(0, Math.sin(t*1.6))**4; pon('torso', 0.25 + tir*0.2, s1*0.1, 0); pon('cuello', -0.1); pon('cabeza', 0.15 + tir*0.2, Math.sin(t*0.7)*0.25, Math.sin(t*0.9)*0.15);
    pon('brazoI', -1.45 - tir*0.3 + Math.sin(t*3)*0.12, 0.25, 0.25); pon('brazoD', -1.5 - tir*0.3 + Math.sin(t*3 + 1.3)*0.12, -0.25, -0.25); pon('anteI', -0.4 - tir*0.5); pon('anteD', -0.35 - tir*0.5);
    pon('musloI', 0.1); pon('musloD', -0.15); jaw = 0.25 + tir*0.35; }
  else if(a === 'grita'){ pon('torso', -0.15 + Math.sin(t*20)*0.03, 0, 0); pon('cuello', 0.3); pon('cabeza', -0.55 + Math.sin(t*25)*0.05, 0, Math.sin(t*18)*0.08);
    pon('brazoI', -0.3, 0, 0.9); pon('brazoD', -0.3, 0, -0.9); pon('anteI', -0.5); pon('anteD', -0.5); jaw = 0.75; }
  else if(a === 'trepa'){ pon('torso', -0.1, 0, 0); pon('cuello', 0.1); pon('cabeza', 0.2, Math.sin(t)*0.2, 0);
    pon('brazoI', -2.6 + s1*0.35, 0, 0.2); pon('brazoD', -2.6 - s1*0.35, 0, -0.2); pon('anteI', -0.3); pon('anteD', -0.3); pon('musloI', -0.9 - s1*0.3); pon('musloD', -0.9 + s1*0.3); pon('piernaI', 1.2); pon('piernaD', 1.2); }
  else if(a === 'asoma'){ /* agachado contra el vidrio, la cabeza que se ladea despacio: así respira */
    const b = Math.sin(t*0.9); pon('torso', 0.8 + b*0.05, Math.sin(t*0.35)*0.08, 0); pon('cuello', -0.5); pon('cabeza', -0.25 + Math.sin(t*0.5)*0.05, Math.sin(t*0.3)*0.22, 0.3 + Math.sin(t*0.4)*0.12);
    pon('brazoI', -1.15, 0.3, 0.35); pon('brazoD', -1.2, -0.3, -0.35); pon('anteI', -0.7); pon('anteD', -0.65); pon('musloI', -0.75); pon('musloD', -0.7); pon('piernaI', 1.2); pon('piernaD', 1.15); caderaY = 0.72; jaw = 0.2 + Math.max(0, b)*0.25; }
  else if(a === 'mira'){ pon('torso', 0.3 + Math.sin(t*0.6)*0.02, 0, 0); pon('cuello', -0.15); pon('cabeza', 0.05, 0, 0.35 + Math.sin(t*0.3)*0.1);
    pon('brazoI', 0.05, 0, 0.08); pon('brazoD', 0.05, 0, -0.08); pon('anteI', -0.15); pon('anteD', -0.15); jaw = 0.18; }
  else if(a === 'agarra'){ pon('torso', 0.2, 0, 0); pon('cuello', -0.1); pon('cabeza', 0.1, 0, 0); pon('brazoI', -1.6, 0.4, 0.3); pon('brazoD', -1.6, -0.4, -0.3); pon('anteI', -0.8); pon('anteD', -0.8); jaw = 0.8; }
  else { pon('torso', 0.32 + Math.sin(t*0.8)*0.03, 0, 0); pon('cuello', -0.2); pon('cabeza', 0.1, Math.sin(t*0.4)*0.3, Math.sin(t*0.5)*0.08); pon('brazoI', 0, 0, 0.1); pon('brazoD', 0, 0, -0.1); pon('anteI', -0.25); pon('anteD', -0.25); }
  const k = 1 - Math.exp(-dt*10);
  for(const nom of ['torso', 'cuello', 'cabeza', 'brazoI', 'brazoD', 'anteI', 'anteD', 'musloI', 'musloD', 'piernaI', 'piernaD']){ const o = P[nom], v = T[nom] || [0, 0, 0];
    o.rotation.x += (v[0] - o.rotation.x)*k; o.rotation.y += (v[1] - o.rotation.y)*k; o.rotation.z += (v[2] - o.rotation.z)*k; }
  P.mand.rotation.x += (jaw - P.mand.rotation.x)*k; P.cadera.position.y += (caderaY - P.cadera.position.y)*k;
  /* los ojos titilan un poco; mirando la cámara se prenden de golpe */
  const brillo = 0.85 + Math.sin(performance.now()/90)*0.1 + (MON.mirarCamara > 0 ? 1.2 : 0);
  /* de noche el halo crece: lo primero que se ve detrás del vidrio son los ojos (van después del vidrio para que no los apague) */
  const tam = 0.34 + (RND.noche || 0)*0.14;
  for(const o of MODELO.ojos){ o.material.opacity = lim(brillo, 0, 1); o.scale.setScalar(tam*(MON.mirarCamara > 0 ? 1.8 : 1)); }
}

/* ================================================================ caminos: afuera un grafo alrededor de la casa; adentro una grilla por piso */
const AFUERA = {nodos:[], ady:[]};
function nodoA(x, z, tipo){ AFUERA.nodos.push({x, z, tipo}); AFUERA.ady.push([]); return AFUERA.nodos.length - 1; }
function unirA(a, b){ if(a === b || AFUERA.ady[a].includes(b)) return; AFUERA.ady[a].push(b); AFUERA.ady[b].push(a); }
const cruzaCaja = (ax, az, bx, bz, c) => { for(let i = 1; i < 12; i++){ const t = i/12, x = lerp(ax, bx, t), z = lerp(az, bz, t); if(x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true; } return false; };
const CAJA_CASA = {x0:-7.4, x1:7.4, z0:-5.4, z1:5.4}, CAJA_GALPON = {x0:GALPON.x0 - 0.4, x1:GALPON.x1 + 0.4, z0:GALPON.z0 - 0.4, z1:GALPON.z1 + 0.4};
function libreAfuera(ax, az, bx, bz){ return !cruzaCaja(ax, az, bx, bz, CAJA_CASA) && !cruzaCaja(ax, az, bx, bz, CAJA_GALPON); }
function construirCaminos(){
  /* el anillo alrededor de la casa */
  const anillo = [[-9.6, -7.6], [-4.5, -7.6], [0.25, -7.8], [4.5, -7.6], [9.6, -7.6], [9.6, -2.5], [9.6, 2.5], [9.6, 7.6], [4.5, 7.6], [1.25, 7.8], [-2.5, 7.6], [-9.6, 7.6], [-9.6, 2.5], [-9.6, -2.5]];
  const ia = anillo.map(([x, z]) => nodoA(x, z, 'anillo')); ia.forEach((a, i) => unirA(a, ia[(i + 1) % ia.length]));
  /* lejos: la arboleda del fondo, los costados, la vereda */
  const lejos = [[-13, 19], [0, 20], [12, 19], [-15, -3], [15.5, 1], [-12, -11.5], [11, -11.5], [-4, -12], [4, -12], [-12.5, 13], [-3.5, 12.5], [14, 12]];
  for(const [x, z] of lejos){ const n = nodoA(x, z, 'lejos'); let mejor = [], d;
    AFUERA.nodos.forEach((o, i) => { if(o.tipo !== 'anillo') return; d = Math.hypot(o.x - x, o.z - z); if(libreAfuera(x, z, o.x, o.z)) mejor.push([d, i]); });
    mejor.sort((a, b) => a[0] - b[0]); for(const [, i] of mejor.slice(0, 2)) unirA(n, i); }
  AFUERA.nodos.forEach((a, i) => AFUERA.nodos.forEach((b, j) => { if(i < j && a.tipo === 'lejos' && b.tipo === 'lejos' && Math.hypot(a.x - b.x, a.z - b.z) < 16 && libreAfuera(a.x, a.z, b.x, b.z)) unirA(i, j); }));
  /* cada ventana y cada puerta de afuera: su punto de llegada */
  for(const id in MUNDO.ventanas){ const v = MUNDO.ventanas[id]; v.nodo = nodoA(v.afuera[0], v.afuera[1], 'entrada'); unirMasCercanos(v.nodo); }
  for(const id in MUNDO.puertas){ const p = MUNDO.puertas[id]; if(!p.ext) continue; p.afuera = [p.centro[0] + p.n[0]*1.1, p.centro[1] + p.n[1]*1.1]; p.adentro = [p.centro[0] - p.n[0]*0.9, p.centro[1] - p.n[1]*0.9]; p.nodo = nodoA(p.afuera[0], p.afuera[1], 'entrada'); unirMasCercanos(p.nodo); }
}
function unirMasCercanos(n){ const o = AFUERA.nodos[n], c = []; AFUERA.nodos.forEach((b, i) => { if(b.tipo === 'anillo' && libreAfuera(o.x, o.z, b.x, b.z)) c.push([Math.hypot(b.x - o.x, b.z - o.z), i]); }); c.sort((a, b) => a[0] - b[0]); for(const [, i] of c.slice(0, 2)) unirA(n, i); }
function nodoMasCercano(x, z, filtro){ let m = -1, md = 1e9; AFUERA.nodos.forEach((o, i) => { if(filtro && !filtro(o)) return; const d = Math.hypot(o.x - x, o.z - z); if(d < md && libreAfuera(x, z, o.x, o.z)){ md = d; m = i; } }); if(m < 0) AFUERA.nodos.forEach((o, i) => { const d = Math.hypot(o.x - x, o.z - z); if(d < md){ md = d; m = i; } }); return m; }
function caminoAfuera(desde, hasta){
  const N = AFUERA.nodos.length, dist = new Array(N).fill(1e9), prev = new Array(N).fill(-1), hecho = new Array(N).fill(false); dist[desde] = 0;
  for(;;){ let u = -1, du = 1e9; for(let i = 0; i < N; i++) if(!hecho[i] && dist[i] < du){ du = dist[i]; u = i; } if(u < 0 || u === hasta) break; hecho[u] = true;
    for(const v of AFUERA.ady[u]){ const w = du + Math.hypot(AFUERA.nodos[u].x - AFUERA.nodos[v].x, AFUERA.nodos[u].z - AFUERA.nodos[v].z); if(w < dist[v]){ dist[v] = w; prev[v] = u; } } }
  const c = []; for(let u = hasta; u >= 0; u = prev[u]){ c.push([AFUERA.nodos[u].x, AFUERA.nodos[u].z]); if(u === desde) break; } return c.reverse();
}
/* la grilla de adentro: 0,25 m por celda; bloqueado lo que está a menos de 0,35 de una caja (las puertas no: las abre) */
const GR = {x0:-7, z0:-5, c:0.25, nx:56, nz:40, bloq:[null, null], puerta:[null, null]};
function construirGrilla(){
  for(const p of [0, 1]){ const B = new Uint8Array(GR.nx*GR.nz), D = new Array(GR.nx*GR.nz).fill(null);
    for(let i = 0; i < GR.nx; i++) for(let j = 0; j < GR.nz; j++){ const x = GR.x0 + (i + 0.5)*GR.c, z = GR.z0 + (j + 0.5)*GR.c; let b = 0;
      for(const c of COL[p]){ if(c.puerta){ const P = MUNDO.puertas[c.puerta]; const px0 = P.eje === 'x' ? P.c - P.w/2 : P.f - 0.1, px1 = P.eje === 'x' ? P.c + P.w/2 : P.f + 0.1, pz0 = P.eje === 'x' ? P.f - 0.1 : P.c - P.w/2, pz1 = P.eje === 'x' ? P.f + 0.1 : P.c + P.w/2;
          if(x > px0 && x < px1 && z > pz0 && z < pz1) D[i + j*GR.nx] = c.puerta; continue; }
        if(c.x1 > 9000) continue; if(x > c.x0 - 0.3 && x < c.x1 + 0.3 && z > c.z0 - 0.3 && z < c.z1 + 0.3){ b = 1; break; } }
      if(x > ESC.x0 - 0.05 && x < ESC.x1 + 0.05 && z > ESC.z0 - 0.1 && z < ESC.z1 + 0.05) b = 1;          /* la escalera en los dos pisos (se usa aparte) */
      if(D[i + j*GR.nx]) b = 0; B[i + j*GR.nx] = b; }
    GR.bloq[p] = B; GR.puerta[p] = D; }
}
const celda = (x, z) => [lim(Math.floor((x - GR.x0)/GR.c), 0, GR.nx - 1), lim(Math.floor((z - GR.z0)/GR.c), 0, GR.nz - 1)];
const centroCelda = (i, j) => [GR.x0 + (i + 0.5)*GR.c, GR.z0 + (j + 0.5)*GR.c];
function libreCelda(p, i, j){ return i >= 0 && j >= 0 && i < GR.nx && j < GR.nz && !GR.bloq[p][i + j*GR.nx]; }
function celdaLibreCerca(p, x, z){ const [i0, j0] = celda(x, z); if(libreCelda(p, i0, j0)) return [i0, j0];
  for(let r = 1; r < 8; r++) for(let di = -r; di <= r; di++) for(let dj = -r; dj <= r; dj++) if(libreCelda(p, i0 + di, j0 + dj)) return [i0 + di, j0 + dj]; return [i0, j0]; }
function aEstrella(p, ax, az, bx, bz){
  const [si, sj] = celdaLibreCerca(p, ax, az), [ti, tj] = celdaLibreCerca(p, bx, bz), N = GR.nx*GR.nz, g = new Float32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), cerrado = new Uint8Array(N);
  const h = (i, j) => { const dx = Math.abs(i - ti), dz = Math.abs(j - tj); return (dx + dz) + (1.414 - 2)*Math.min(dx, dz); };
  const abierta = [[h(si, sj), si + sj*GR.nx]]; g[si + sj*GR.nx] = 0; let it = 0;
  while(abierta.length && it++ < 6000){ let bi = 0; for(let k = 1; k < abierta.length; k++) if(abierta[k][0] < abierta[bi][0]) bi = k; const [, u] = abierta.splice(bi, 1)[0];
    if(cerrado[u]) continue; cerrado[u] = 1; const ui = u % GR.nx, uj = (u/GR.nx) | 0; if(ui === ti && uj === tj) break;
    for(let di = -1; di <= 1; di++) for(let dj = -1; dj <= 1; dj++){ if(!di && !dj) continue; const vi = ui + di, vj = uj + dj; if(!libreCelda(p, vi, vj)) continue;
      if(di && dj && (!libreCelda(p, ui + di, uj) || !libreCelda(p, ui, uj + dj))) continue;
      const v = vi + vj*GR.nx, w = g[u] + (di && dj ? 1.414 : 1); if(w < g[v]){ g[v] = w; prev[v] = u; abierta.push([w + h(vi, vj), v]); } } }
  const t = ti + tj*GR.nx; if(prev[t] < 0 && t !== si + sj*GR.nx) return null;
  const c = []; for(let u = t; u >= 0; u = prev[u]){ const [x, z] = centroCelda(u % GR.nx, (u/GR.nx) | 0); c.push([x, z]); if(u === si + sj*GR.nx) break; } c.reverse();
  /* se estira el camino: se saltean los puntos que se ven de a dos */
  const s = [c[0]]; let k = 0; while(k < c.length - 1){ let m = c.length - 1; while(m > k + 1 && !veGrilla(p, c[k][0], c[k][1], c[m][0], c[m][1], true)) m--; s.push(c[m]); k = m; } return s;
}
/* ¿se ve de un punto a otro en la grilla? con puertaLibre, las puertas no tapan (para caminar); sin, las cerradas tapan (para ver) */
function veGrilla(p, ax, az, bx, bz, puertaLibre){ const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d/0.12);
  for(let i = 1; i < n; i++){ const t = i/n, [ci, cj] = celda(lerp(ax, bx, t), lerp(az, bz, t)), k = ci + cj*GR.nx;
    if(GR.bloq[p][k]) return false; const pu = GR.puerta[p][k]; if(pu && !puertaLibre){ const P = MUNDO.puertas[pu]; if(P.abierta < 0.4 && !P.rota) return false; } }
  return true; }
/* un camino de adentro que puede cambiar de piso por la escalera */
const ESC_ABAJO = [1.4, -3.75], ESC_ARRIBA = [1.4, 2.05];
function caminoAdentro(p0, ax, az, p1, bx, bz){
  if(p0 === p1){ const c = aEstrella(p0, ax, az, bx, bz); return c ? c.map(q => [q[0], q[1], p0]) : null; }
  const a = p0 === 0 ? ESC_ABAJO : ESC_ARRIBA, b = p0 === 0 ? ESC_ARRIBA : ESC_ABAJO;
  const c1 = aEstrella(p0, ax, az, a[0], a[1]), c2 = aEstrella(p1, b[0], b[1], bx, bz); if(!c1 || !c2) return null;
  return c1.map(q => [q[0], q[1], p0]).concat([[1.4, p0 === 0 ? -3.0 : 1.2, 'esc'], [1.4, p0 === 0 ? 1.2 : -3.0, 'esc']], c2.map(q => [q[0], q[1], p1]));
}
