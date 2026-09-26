/* ================================================================ Larry, el mutante, como el del juego
   Un robloxiano deformado por el derrame (así lo describe la wiki del juego): la cabeza amarilla de Roblox con dos
   ojos negros grandes y la pupila blanca, la mandíbula partida al medio y dientes sólo adelante, el torso partido
   en dos que sólo sostiene la columna, remera gris oscura, pantalón gris claro y sangre por todos lados. Los brazos
   terminan en dos guadañas larguísimas: camina en cuatro patas apoyándolas y ataca con ellas.
   A escala del jugador (1 tacha = 0,33 m): parado mide 2,2 m, en cuatro patas lleva la cabeza a 1,5. */
const MON = {activo:false, estado:'fuera', x:0, y:0, z:20, yaw:Math.PI, piso:0, adentro:false, t:0, obj:null, camino:[], ci:0, vel:0, fase:0, anim:'quieto', animK:{},
  ultimo:null, cool:0, luzT:0, vistoT:0, ultVisto:null, oidoPos:null, entrada:null, placardVisto:null, forzar:null, mirarCamara:0, respT:0, visible:false, peekT:0, huyendo:false, pasoT:0, gritoT:0, adentroT:0, golpeT:0, apagar:0};
const MODELO = {raiz:null, partes:{}, ojos:[], mand:null, cab:null};

/* la cara plana (la tele de las 2 y lo que no es la cabeza): amarilla, dos ojos negros con la pupila blanca y la
   boca partida con los dientes de adelante */
function dibujarCara(g, cx, cy, s){
  const u = s/100; g.save(); g.translate(cx - 50*u, cy - 50*u); g.scale(u, u);
  g.fillStyle = '#f0c21c'; g.fillRect(0, 0, 100, 100);
  const sombra = g.createRadialGradient(50, 40, 20, 50, 50, 75); sombra.addColorStop(0, 'rgba(0,0,0,0)'); sombra.addColorStop(1, 'rgba(70,40,0,0.45)'); g.fillStyle = sombra; g.fillRect(0, 0, 100, 100);
  for(const x of [31, 69]){ g.fillStyle = '#050303'; g.beginPath(); g.ellipse(x, 38, 13, 14, 0, 0, 7); g.fill(); g.fillStyle = '#fbf6e8'; g.beginPath(); g.arc(x + 1, 39, 4.2, 0, 7); g.fill(); }
  g.fillStyle = '#2a0404'; g.beginPath(); g.moveTo(22, 62); g.lineTo(78, 62); g.lineTo(64, 96); g.lineTo(50, 74); g.lineTo(36, 96); g.closePath(); g.fill();
  g.fillStyle = '#eee6cc'; for(let i = 0; i < 7; i++){ const x = 26 + i*7.5; g.beginPath(); g.moveTo(x, 62); g.lineTo(x + 3.6, 71 + (i % 2)*3); g.lineTo(x + 7, 62); g.fill(); }
  g.strokeStyle = 'rgba(120,6,4,0.95)'; g.lineWidth = 3; for(const [x, l] of [[27, 22], [73, 16], [45, 30], [58, 24]]){ g.beginPath(); g.moveTo(x, 64); g.lineTo(x + (x % 3) - 1, 64 + l); g.stroke(); }
  g.strokeStyle = 'rgba(120,6,4,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(29, 52); g.lineTo(27, 60); g.moveTo(71, 52); g.lineTo(73, 58); g.stroke();
  g.restore();
}
/* salpicones y chorreados de sangre sobre un lienzo */
function sangrar(g, w, h, n, seed, k){ const r = mulberry(seed);
  for(let i = 0; i < n; i++){ const x = r()*w, y = r()*h, R = (4 + r()*18)*(w/128), c = r() < 0.5 ? '#7a0806' : '#5a0404';
    g.fillStyle = c; g.globalAlpha = (0.78 + r()*0.22)*k; g.beginPath(); for(let a = 0; a < 9; a++){ const an = a/9*Math.PI*2, rr = R*(0.55 + r()*0.7); a ? g.lineTo(x + Math.cos(an)*rr, y + Math.sin(an)*rr*0.8) : g.moveTo(x + Math.cos(an)*rr, y + Math.sin(an)*rr*0.8); } g.closePath(); g.fill();
    for(let d = 0; d < 1 + r()*3; d++){ const dx = x + (r() - 0.5)*R*1.4, L = R*(1 + r()*3); g.fillRect(dx, y, Math.max(1.5, R*0.14), L); g.beginPath(); g.arc(dx + R*0.07, y + L, R*0.12, 0, 7); g.fill(); }
    for(let d = 0; d < 5; d++){ g.beginPath(); g.arc(x + (r() - 0.5)*R*4, y + (r() - 0.5)*R*3, 1 + r()*R*0.15, 0, 7); g.fill(); } }
  g.globalAlpha = 1; }
function texTela(base, seed, sangre, raya){ const [c, g] = lienzo(128, 128), r = mulberry(seed); g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for(let y = 0; y < 128; y += 2){ g.fillStyle = 'rgba(0,0,0,' + (0.03 + r()*0.03) + ')'; g.fillRect(0, y, 128, 1); }
  if(raya){ g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 100, 128, 6); }
  sangrar(g, 128, 128, sangre, seed + 3, 1); ruido(g, 128, 128, 6, seed); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
/* la cabeza es de revolución (como la de Roblox): la textura da la vuelta y la cara queda en u = 0,5.
   En la pared del cilindro v va lineal con la altura: y = v/0,692·0,27 */
const CAB = {R:0.23, lado:0.27, vLado:0.692};
function texCabeza(){ const W = 512, H = 256, [c, g] = lienzo(W, H);
  const X = phi => 256 + phi/(Math.PI*2)*W, Y = y => (1 - y/CAB.lado*CAB.vLado)*H, SX = m => m/(Math.PI*2*CAB.R)*W, SY = m => m/CAB.lado*CAB.vLado*H;
  g.fillStyle = '#f2c41e'; g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(110,70,0,0.42)'); gr.addColorStop(0.32, 'rgba(110,70,0,0.05)'); gr.addColorStop(0.5, 'rgba(255,240,180,0.08)'); gr.addColorStop(0.68, 'rgba(110,70,0,0.05)'); gr.addColorStop(1, 'rgba(110,70,0,0.42)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  /* los ojos: dos círculos negros grandes y la pupila blanca redonda */
  for(const s of [-1, 1]){ const ex = X(s*0.4), ey = Y(0.172);
    g.fillStyle = 'rgba(90,40,0,0.5)'; g.beginPath(); g.ellipse(ex, ey + SY(0.003), SX(0.062), SY(0.064), 0, 0, 7); g.fill();
    g.fillStyle = '#000000'; g.beginPath(); g.ellipse(ex, ey, SX(0.057), SY(0.06), 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex + s*SX(0.006), ey + SY(0.006), SX(0.019), SY(0.019), 0, 0, 7); g.fill();
    /* lágrimas de sangre */
    g.fillStyle = 'rgba(120,6,4,0.9)'; g.fillRect(ex - SX(0.006) + s*SX(0.02), ey + SY(0.05), SX(0.009), SY(0.07 + (s > 0 ? 0.02 : 0))); }
  /* alrededor de la boca: la piel rota y la sangre que chorrea para abajo */
  g.fillStyle = 'rgba(90,4,2,0.9)'; g.fillRect(X(-0.7), Y(0.03), SX(0.32), SY(0.03));
  const r = mulberry(77); g.fillStyle = 'rgba(122,8,6,0.92)';
  for(let i = 0; i < 9; i++){ const x = X((r() - 0.5)*1.4); g.fillRect(x, Y(0.07), SX(0.008 + r()*0.008), SY(0.035 + r()*0.04)); }
  for(let i = 0; i < 9; i++){ const ph = (r() - 0.5)*2.6, yy = 0.02 + r()*0.22; if(Math.abs(ph) < 0.3 && yy > 0.1) continue; g.globalAlpha = 0.5 + r()*0.4; g.beginPath(); g.ellipse(X(ph), Y(yy), SX(0.01 + r()*0.03), SY(0.008 + r()*0.02), 0, 0, 7); g.fill(); }
  g.globalAlpha = 1; ruido(g, W, H, 5, 12); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; }

function construirMonstruo(){
  const raiz = new THREE.Group(), P = MODELO.partes;
  /* la piel brilla un pelo en lo oscuro con su propia textura de emisión: así lo negro (los ojos) sigue negro.
     Una emisión lisa de 0x1a1404 son 0,1 lineal: en pantalla, 89 sobre 255, y los ojos salían verde oliva */
  const tPiel = texTela('#f0c01c', 3, 7), tCab = texCabeza();
  const piel = new THREE.MeshPhongMaterial({map:tPiel, emissiveMap:tPiel, emissive:0x262626, shininess:24, specular:0x2a2000});
  const pielCab = new THREE.MeshPhongMaterial({map:tCab, emissiveMap:tCab, emissive:0x262626, shininess:30, specular:0x2a2200});
  const camisa = new THREE.MeshPhongMaterial({map:texTela('#3b3d42', 5, 16, true), shininess:8});
  const panta = new THREE.MeshPhongMaterial({map:texTela('#85878c', 9, 6), shininess:6});
  const carne = new THREE.MeshPhongMaterial({color:0x5a0806, shininess:70, specular:0x552222, side:THREE.DoubleSide});
  const hueso = new THREE.MeshPhongMaterial({color:0xd8cdb0, shininess:30, specular:0x333322});
  const guad = new THREE.MeshPhongMaterial({color:0x6e1410, shininess:90, specular:0x663333, emissive:0x080101});
  const filo = new THREE.MeshPhongMaterial({color:0xb8a898, shininess:120, specular:0x888888});
  const diente = new THREE.MeshPhongMaterial({color:0xefe7cc, shininess:60, specular:0x444433});
  const bocaM = new THREE.MeshPhongMaterial({color:0x260303, shininess:40, side:THREE.BackSide});
  const lenguaM = new THREE.MeshPhongMaterial({color:0xa4202a, shininess:80, specular:0x552222});
  const lista = [];
  const bx = (w, h, d, m, x, y, z, padre) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; padre.add(me); lista.push(me); return me; };
  const piv = (x, y, z, padre) => { const g = new THREE.Group(); g.position.set(x, y, z); padre.add(g); return g; };
  /* varias cajas del mismo material fundidas en una malla (menos llamadas de dibujo) */
  const fundir = (partes, m, padre) => { const gs = partes.map(([w, h, d, x, y, z, rx, ry, rz]) => { const g = new THREE.BoxGeometry(w, h, d); g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(1, 1, 1))); return g; });
    const me = new THREE.Mesh(juntarGeos(gs), m); me.castShadow = true; padre.add(me); lista.push(me); return me; };
  /* la cadera y las piernas: pantalón gris claro, piernas de Roblox partidas en rodilla */
  P.cadera = piv(0, 0.70, 0, raiz);
  bx(0.66, 0.30, 0.34, camisa, 0, 0.13, 0, P.cadera);
  fundir([[0.62, 0.025, 0.3, 0, 0.29, 0], [0.05, 0.12, 0.05, -0.2, 0.33, 0.05, 0.3], [0.04, 0.16, 0.04, 0.12, 0.34, -0.06, -0.2]], carne, P.cadera);   /* la carne rota de arriba */
  for(const s of [-1, 1]){ const k = s < 0 ? 'I' : 'D';
    const mu = P['muslo' + k] = piv(s*0.166, 0, 0, P.cadera); bx(0.32, 0.37, 0.32, panta, 0, -0.18, 0, mu);
    const pi = P['pierna' + k] = piv(0, -0.36, 0, mu); bx(0.315, 0.34, 0.315, panta, 0, -0.17, 0, pi);
    /* el talón y la punta del pie: marcas para apoyarlo en el piso */
    P['pies' + k] = [-0.15, 0.15].map(zz => { const o = new THREE.Object3D(); o.position.set(0, -0.34, zz); pi.add(o); return o; }); }
  /* la columna: cinco vértebras con sus apófisis, un cordón de carne atrás y jirones que cuelgan */
  P.columna = piv(0, 0.29, -0.04, P.cadera);
  const vert = []; for(let i = 0; i < 5; i++){ const y = 0.03 + i*0.066; vert.push([0.075, 0.048, 0.08, 0, y, 0], [0.16, 0.018, 0.03, 0, y, -0.04], [0.02, 0.02, 0.07, 0, y + 0.01, -0.07, 0.5]); }
  fundir(vert, hueso, P.columna);
  fundir([[0.035, 0.34, 0.035, 0, 0.17, 0.05], [0.025, 0.3, 0.025, 0.09, 0.2, 0.03, 0, 0, 0.2], [0.02, 0.26, 0.02, -0.1, 0.19, 0.02, 0, 0, -0.25]], carne, P.columna);
  /* el torso de arriba: la remera gris oscura manchada, la carne abierta abajo y dos costillas que asoman */
  P.torso = piv(0, 0.34, 0.03, P.columna);
  bx(0.66, 0.40, 0.34, camisa, 0, 0.20, 0, P.torso);
  fundir([[0.62, 0.025, 0.3, 0, 0.0, 0], [0.04, 0.2, 0.04, 0.22, -0.08, 0.06, 0.2, 0, 0.1], [0.03, 0.14, 0.03, -0.18, -0.05, 0.1, -0.2], [0.05, 0.1, 0.05, 0.05, -0.04, -0.1]], carne, P.torso);
  fundir([[0.02, 0.16, 0.02, 0.26, -0.02, 0.12, 0.9, 0, 0.3], [0.02, 0.14, 0.02, -0.25, -0.01, 0.12, 0.9, 0, -0.3], [0.02, 0.12, 0.02, 0.16, -0.03, 0.15, 1.0]], hueso, P.torso);
  /* la cabeza de Roblox: el cráneo de revolución con la cara, el paladar oscuro, los dientes de arriba */
  P.cuello = piv(0, 0.40, 0.02, P.torso); bx(0.2, 0.08, 0.2, piel, 0, 0.03, 0, P.cuello);
  P.cabeza = piv(0, 0.07, 0.01, P.cuello);
  const perfil = []; for(let i = 0; i <= 9; i++){ const y = i*0.03; perfil.push(new THREE.Vector2(CAB.R - (i === 0 ? 0.012 : 0), y)); }
  perfil.push(new THREE.Vector2(0.217, 0.293), new THREE.Vector2(0.185, 0.313), new THREE.Vector2(0.12, 0.326), new THREE.Vector2(0.0, 0.331));
  const gCab = new THREE.LatheGeometry(perfil, 28, Math.PI, Math.PI*2); gCab.translate(0, -0.15, 0);
  const cab = new THREE.Mesh(gCab, pielCab); cab.position.set(0, 0.15, 0); cab.castShadow = true; P.cabeza.add(cab); MODELO.cab = cab; lista.push(cab);
  const paladar = new THREE.Mesh(new THREE.CircleGeometry(CAB.R - 0.012, 20), new THREE.MeshPhongMaterial({color:0x2a0404, shininess:30})); paladar.rotation.x = Math.PI/2; paladar.position.y = 0.002; P.cabeza.add(paladar); lista.push(paladar);
  const dientes = (desde, hasta, n, rad, y, abajo, alto) => { const gs = []; for(let i = 0; i < n; i++){ const a = lerp(desde, hasta, n > 1 ? i/(n - 1) : 0.5), g = new THREE.ConeGeometry(0.017, alto*(0.8 + (i % 2)*0.3), 5);
      if(abajo) g.rotateX(Math.PI); g.translate(Math.sin(a)*rad, y + (abajo ? -1 : 1)*alto*0.45, Math.cos(a)*rad); gs.push(g); } return juntarGeos(gs); };
  const dArriba = new THREE.Mesh(dientes(-0.85, 0.85, 8, CAB.R - 0.03, 0.0, true, 0.065), diente); P.cabeza.add(dArriba); lista.push(dArriba);
  /* la mandíbula partida: dos mitades que se abren para los costados y para abajo, cada una con sus dientes de adelante */
  const perfilM = [new THREE.Vector2(0.0, -0.142), new THREE.Vector2(0.07, -0.14), new THREE.Vector2(0.14, -0.13), new THREE.Vector2(0.19, -0.11), new THREE.Vector2(0.212, -0.08), new THREE.Vector2(0.218, -0.04), new THREE.Vector2(0.218, 0.0)];
  const texM = texTela('#f0c01c', 21, 14);
  for(const s of [1, -1]){ const k = s > 0 ? 'I' : 'D', bis = piv(0, 0.0, -0.2, P.cabeza);
    const g = new THREE.LatheGeometry(perfilM, 12, s > 0 ? 0 : Math.PI, Math.PI); g.translate(0, 0, 0.2);
    const afuera = new THREE.Mesh(g, new THREE.MeshPhongMaterial({map:texM, emissiveMap:texM, emissive:0x262626, shininess:24, specular:0x2a2000})), adentro = new THREE.Mesh(g, bocaM);
    afuera.castShadow = true; bis.add(afuera); bis.add(adentro); lista.push(afuera, adentro);
    const dAbajo = new THREE.Mesh(dientes(s > 0 ? 0.08 : -0.08, s > 0 ? 0.8 : -0.8, 4, CAB.R - 0.035, 0.0, false, 0.06), diente); dAbajo.position.z = 0.2; bis.add(dAbajo); lista.push(dAbajo);
    P['mand' + k] = bis; }
  /* la lengua larga, en dos tramos, que sale cuando abre */
  P.lengua = piv(0, -0.02, 0.1, P.cabeza); const l1 = bx(0.07, 0.02, 0.2, lenguaM, 0, 0, 0.1, P.lengua);
  P.lengua2 = piv(0, 0, 0.2, P.lengua); bx(0.055, 0.018, 0.18, lenguaM, 0, 0, 0.09, P.lengua2);
  /* los ojos que brillan en lo oscuro: el puntito (la pupila) y un halo que va delante de la cara */
  const [hc, hg] = lienzo(64, 64), hgr = hg.createRadialGradient(32, 32, 0, 32, 32, 32); hgr.addColorStop(0, 'rgba(255,252,236,1)'); hgr.addColorStop(0.22, 'rgba(255,240,200,0.55)'); hgr.addColorStop(1, 'rgba(255,220,140,0)'); hg.fillStyle = hgr; hg.fillRect(0, 0, 64, 64);
  const halo = new THREE.SpriteMaterial({map:new THREE.CanvasTexture(hc), color:0xfff4dc, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false});
  for(const s of [-1, 1]){ const a = s*0.4, y = 0.172, o = new THREE.Sprite(halo); o.renderOrder = 10; o.scale.set(0.08, 0.08, 1); o.position.set(Math.sin(a + s*0.026)*(CAB.R + 0.05), y - 0.006, Math.cos(a + s*0.026)*(CAB.R + 0.05)); P.cabeza.add(o); MODELO.ojos.push(o);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({color:0xffffff, fog:false})); p.position.set(Math.sin(a + s*0.026)*(CAB.R + 0.001), y - 0.006, Math.cos(a + s*0.026)*(CAB.R + 0.001)); P.cabeza.add(p); }
  /* los brazos: el brazo amarillo de Roblox y, donde iría la mano, la guadaña: dos tramos de carne dura y la hoja curva */
  /* la hoja: una media luna con el filo para adelante, más ancha arriba y en punta abajo */
  const hoja = new THREE.Shape(); hoja.moveTo(-0.03, 0.02); hoja.quadraticCurveTo(0.16, -0.14, 0.1, -0.56); hoja.quadraticCurveTo(0.05, -0.26, -0.05, -0.04); hoja.lineTo(-0.03, 0.02);
  const gHoja = new THREE.ExtrudeGeometry(hoja, {depth:0.022, bevelEnabled:false}); gHoja.translate(0, 0, -0.011); gHoja.rotateY(-Math.PI/2);
  for(const s of [-1, 1]){ const k = s < 0 ? 'I' : 'D';
    const b = P['brazo' + k] = piv(s*0.495, 0.36, 0, P.torso); bx(0.32, 0.44, 0.32, piel, 0, -0.2, 0, b);
    fundir([[0.3, 0.03, 0.3, 0, -0.43, 0], [0.12, 0.08, 0.12, 0, -0.47, 0]], carne, b);
    const a = P['ante' + k] = piv(0, -0.44, 0, b);
    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.048, 0.56, 8).translate(0, -0.28, 0), guad); t1.castShadow = true; a.add(t1); lista.push(t1);
    const nudo = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 6), hueso); nudo.position.y = -0.56; a.add(nudo); lista.push(nudo);
    const gg = P['garra' + k] = piv(0, -0.56, 0, a);
    const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.03, 0.44, 8).translate(0, -0.22, 0), guad); t2.castShadow = true; gg.add(t2); lista.push(t2);
    const h = new THREE.Mesh(gHoja, filo); h.position.set(0, -0.42, 0.0); h.rotation.x = 0.25; h.castShadow = true; gg.add(h); lista.push(h);
    /* la punta de la hoja: la marca para apoyarla en el piso */
    const pu = P['punta' + k] = new THREE.Object3D(); pu.position.set(0, -0.56, 0.1); h.add(pu); P['hoja' + k] = h; }
  MODELO.mallas = lista; raiz.visible = false; MODELO.raiz = raiz; RND.esc.add(raiz);
  return raiz;
}
/* juntar geometrías sin índice (para fundir piezas chicas en una malla) */
function juntarGeos(gs){ const pos = [], nor = [], uv = [];
  for(const g0 of gs){ const g = g0.index ? g0.toNonIndexed() : g0; const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    for(let i = 0; i < P.count; i++){ pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeBoundingSphere(); return g; }

/* ================================================================ animación a mano: cada estado pide ángulos y se mezclan
   x positivo en la columna y el torso = se dobla hacia adelante; en brazos y piernas, x negativo = hacia adelante.
   En cuatro patas la cadera va 0,45 m atrás de la raíz, así la raíz queda en el medio del cuerpo largo. */
const _pu = new THREE.Vector3(), APOYA = new Set(['mira', 'quieto', 'camina', 'corre', 'asoma']);
const PIEZAS = ['columna', 'torso', 'cuello', 'cabeza', 'brazoI', 'brazoD', 'anteI', 'anteD', 'garraI', 'garraD', 'musloI', 'musloD', 'piernaI', 'piernaD', 'lengua', 'lengua2'];
function poseMonstruo(dt){
  const P = MODELO.partes, a = MON.anim, t = MON.fase, T = {};
  const pon = (k, x, y, z) => { T[k] = [x || 0, y || 0, z || 0]; };
  const s1 = Math.sin(t), s2 = Math.sin(t*2), ahora = performance.now()/1000;
  let cy = 0.70, cz = 0, jaw = 0.12 + Math.sin(ahora*3.8)*0.05; const ik = {};
  if(a === 'camina' || a === 'corre'){ const c = a === 'corre', sw = c ? 0.62 : 0.4;
    cy = (c ? 0.6 : 0.64) + Math.abs(s1)*0.03; cz = -0.45;
    pon('columna', (c ? 1.12 : 1.0) + s2*0.04, 0, s1*0.05); pon('torso', c ? 0.26 : 0.2, s1*0.08, 0);
    pon('cuello', c ? -1.0 : -0.95); pon('cabeza', (c ? -0.05 : -0.15) + s2*0.06, Math.sin(t*0.5)*(c ? 0.1 : 0.25), s1*0.06);
    pon('brazoI', -1.2 - s1*sw, 0, 0.12); pon('brazoD', -1.2 + s1*sw, 0, -0.12);
    pon('anteI', -0.6); pon('anteD', -0.6); pon('garraI', -0.55); pon('garraD', -0.55);
    /* la guadaña que va para adelante se levanta; la que empuja va apoyada en el piso */
    ik.I = Math.max(0, -Math.cos(t))*(c ? 0.4 : 0.28); ik.D = Math.max(0, Math.cos(t))*(c ? 0.4 : 0.28);
    pon('musloI', s1*sw*1.1); pon('musloD', -s1*sw*1.1); pon('piernaI', 0.25 + Math.max(0, -s1)*0.7); pon('piernaD', 0.25 + Math.max(0, s1)*0.7);
    if(c) jaw = 0.45 + s2*0.1; }
  else if(a === 'ventana'){ /* parado contra la ventana, las guadañas suben y bajan de a una: golpea el vidrio y arranca tablas */
    const g1 = Math.max(0, Math.sin(t*1.6))**3, g2 = Math.max(0, Math.sin(t*1.6 + Math.PI))**3;
    pon('columna', 0.3 + (g1 + g2)*0.08); pon('torso', 0.15); pon('cuello', -0.35); pon('cabeza', 0.05 + (g1 + g2)*0.1, Math.sin(t*0.7)*0.2, Math.sin(t*0.9)*0.15);
    pon('brazoI', -2.7 + g1*1.0, 0.15, 0.25); pon('brazoD', -2.7 + g2*1.0, -0.15, -0.25); pon('anteI', 1.0 - g1*1.2); pon('anteD', 1.0 - g2*1.2); pon('garraI', 0.5 - g1*0.6); pon('garraD', 0.5 - g2*0.6);
    pon('musloI', -0.15); pon('musloD', 0.1); pon('piernaI', 0.2); pon('piernaD', 0.15); jaw = 0.3 + (g1 + g2)*0.4; }
  else if(a === 'grita'){ /* se para en dos patas, arquea la espalda, abre las guadañas y la mandíbula entera */
    pon('columna', -0.25 + Math.sin(t*20)*0.03); pon('torso', -0.1); pon('cuello', 0.2); pon('cabeza', -0.55 + Math.sin(t*25)*0.05, 0, Math.sin(t*18)*0.08);
    pon('brazoI', -1.3, 0, 1.15); pon('brazoD', -1.3, 0, -1.15); pon('anteI', -0.4); pon('anteD', -0.4); pon('garraI', -0.5); pon('garraD', -0.5); jaw = 1; }
  else if(a === 'trepa'){ /* colgado de la pared: las guadañas clavadas arriba, las piernas empujando */
    pon('columna', 0.12); pon('torso', 0.05); pon('cuello', -0.1); pon('cabeza', 0.15, Math.sin(t)*0.2, 0);
    pon('brazoI', -2.8 + s1*0.35, 0, 0.25); pon('brazoD', -2.8 - s1*0.35, 0, -0.25); pon('anteI', 0.6); pon('anteD', 0.6); pon('garraI', 0.5); pon('garraD', 0.5);
    pon('musloI', -0.9 - s1*0.3); pon('musloD', -0.9 + s1*0.3); pon('piernaI', 1.2); pon('piernaD', 1.2); }
  else if(a === 'asoma'){ /* pegado al vidrio, inclinado, la cabeza que se ladea despacio y las guadañas apoyadas en la pared: así respira */
    const b = Math.sin(t*0.9); pon('columna', 0.55 + b*0.04); pon('torso', 0.22, Math.sin(t*0.35)*0.08); pon('cuello', -0.65); pon('cabeza', -0.1 + Math.sin(t*0.5)*0.05, Math.sin(t*0.3)*0.22, 0.32 + Math.sin(t*0.4)*0.12);
    pon('brazoI', -0.9, 0.2, 0.42); pon('brazoD', -0.95, -0.2, -0.42); pon('anteI', -0.4); pon('anteD', -0.4); pon('garraI', -0.5); pon('garraD', -0.5); ik.I = ik.D = 0;
    pon('musloI', -0.35); pon('musloD', -0.3); pon('piernaI', 0.6); pon('piernaD', 0.55); cy = 0.62; jaw = 0.15 + Math.max(0, b)*0.3; }
  else if(a === 'agarra'){ /* el susto: parado delante de la cara, las guadañas arriba a los dos lados, la boca abierta del todo */
    pon('columna', 0.12); pon('torso', 0.08); pon('cuello', -0.05); pon('cabeza', 0.1 + Math.sin(ahora*40)*0.04, Math.sin(ahora*33)*0.05, Math.sin(ahora*29)*0.06);
    pon('brazoI', -2.3, 0.3, 0.55); pon('brazoD', -2.3, -0.3, -0.55); pon('anteI', -0.9); pon('anteD', -0.9); pon('garraI', -0.6); pon('garraD', -0.6); jaw = 1; }
  else { /* 'mira' y quieto: medio parado, las guadañas clavadas adelante como bastones, la cabeza ladeada */
    const b = Math.sin(t*0.6); pon('columna', 0.38 + b*0.03); pon('torso', 0.12); pon('cuello', -0.35); pon('cabeza', 0.02, a === 'mira' ? 0 : Math.sin(t*0.4)*0.3, (a === 'mira' ? 0.38 : 0.1) + Math.sin(t*0.3)*0.1);
    pon('brazoI', -0.75, 0, 0.18); pon('brazoD', -0.75, 0, -0.18); pon('anteI', -0.35); pon('anteD', -0.35); pon('garraI', -0.4); pon('garraD', -0.4); ik.I = ik.D = 0;
    pon('musloI', -0.1); pon('musloD', 0.05); pon('piernaI', 0.15); pon('piernaD', 0.1); cy = 0.68; cz = -0.15; jaw = 0.18; }
  /* la lengua cuelga cuando abre */
  pon('lengua', 0.35 + jaw*0.7 + Math.sin(ahora*5)*0.08, Math.sin(ahora*3)*0.2); pon('lengua2', 0.5 + Math.sin(ahora*6 + 1)*0.25);
  const k = 1 - Math.exp(-dt*10);
  for(const nom of PIEZAS){ const o = P[nom]; if(!o) continue; const v = T[nom] || [0, 0, 0], conIk = (nom === 'anteI' && ik.I !== undefined) || (nom === 'anteD' && ik.D !== undefined);
    if(!conIk) o.rotation.x += (v[0] - o.rotation.x)*k; o.rotation.y += (v[1] - o.rotation.y)*k; o.rotation.z += (v[2] - o.rotation.z)*k; }
  P.cadera.position.y += (cy - P.cadera.position.y)*k; P.cadera.position.z += (cz - P.cadera.position.z)*k;
  /* parado o caminando, el pie más bajo apoya en el piso: con las piernas dobladas quedaban de 3 a 9 cm hundidas */
  if(APOYA.has(a) && MON.estado !== 'mata'){ let m = 99; for(const q of ['I', 'D']) for(const o of P['pies' + q]){ o.getWorldPosition(_pu); m = Math.min(m, _pu.y); }
    if(m < 90) P.cadera.position.y -= m - MODELO.raiz.position.y; }
  /* apoyar las guadañas: se corrige el codo hasta que la punta toca el piso (o queda a la altura pedida) */
  for(const q of ['I', 'D']) if(ik[q] !== undefined){ const an = P['ante' + q], pu = P['punta' + q], suelo = MODELO.raiz.position.y + ik[q];
    /* la altura de la punta contra el codo es una curva con fondo (cerca de 0,2 rad): pasado el fondo, cerrar el codo la vuelve a
       subir y un Newton se va para el lado malo. Se busca por bisección en el tramo de −2,2 a 0,2, donde es monótona */
    const f = t => { an.rotation.x = t; pu.getWorldPosition(_pu); return _pu.y - suelo; }; let lo = -2.2, hi = 0.2;
    if(f(hi) >= 0) an.rotation.x = hi; else if(f(lo) <= 0) an.rotation.x = lo;
    else { for(let i = 0; i < 12; i++){ const m = (lo + hi)/2; if(f(m) > 0) lo = m; else hi = m; } an.rotation.x = (lo + hi)/2; } }
  const ab = MODELO.abre = (MODELO.abre || 0) + (jaw - (MODELO.abre || 0))*k;
  P.mandI.rotation.set(ab*0.28, ab*0.55, 0); P.mandD.rotation.set(ab*0.28, -ab*0.55, 0);
  P.lengua.scale.setScalar(0.35 + ab*0.65);
  /* los ojos titilan un poco; mirando la cámara se prenden de golpe. De noche el halo crece: lo primero que se ve detrás
     del vidrio son los ojos (van después del vidrio para que no los apague) */
  const nk = lim(((RND.noche || 0) - 0.3)/0.6, 0, 1), brillo = 0.8 + Math.sin(ahora*11)*0.1 + (MON.mirarCamara > 0 ? 1.2 : 0), tam = 0.075 + nk*0.02;
  for(const o of MODELO.ojos){ o.visible = nk > 0.01; o.material.opacity = lim(brillo, 0, 1)*nk; o.scale.setScalar(tam*(MON.mirarCamara > 0 ? 1.8 : 1)); }
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
