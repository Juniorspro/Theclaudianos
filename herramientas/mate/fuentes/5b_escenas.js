
function puesto(m, p, r){ m.position.set(p[0], p[1], p[2]); if(r) m.rotation.set(r[0], r[1], r[2]); return m; }
/* ================================================================ capítulos: cielo, niebla, luz, fondo */
const CAPITULOS = {
  puerto:{cielo:['#05040c', '#161232', '#3a2448'], niebla:'#140f26', dens:0.022, amb:['#5a6ab0', '#20142a', 1.2], luna:{col:'#a8c0ff', f:2.6, pos:[-30, 38, -90]},
    rayos:'#aac4ff', fuerzaRayos:1.1, lluvia:true, suelo:'hormigon', pared:'ladrillo', tablon:'madera', lift:'#050212', gain:'#e8f0ff', satur:1.0},
  fabrica:{cielo:['#1a0c08', '#6a2a14', '#e8904a'], niebla:'#3a1e14', dens:0.03, amb:['#ffb070', '#2a1410', 1.1], luna:{col:'#ffb070', f:3.0, pos:[40, 26, -70]},
    rayos:'#ffc080', fuerzaRayos:0.7, lluvia:false, suelo:'chapa', pared:'hormigon', tablon:'rejilla', lift:'#100402', gain:'#fff0e0', satur:1.08},
  torre:{cielo:['#020208', '#0c0a24', '#4a1a4a'], niebla:'#120a22', dens:0.018, amb:['#6a4aaa', '#0a0612', 1.1], luna:{col:'#d08aff', f:2.3, pos:[20, 44, -110]},
    rayos:'#e0a0ff', fuerzaRayos:0.9, lluvia:true, suelo:'marmol', pared:'marmol', tablon:'rejilla', lift:'#06020e', gain:'#f4e8ff', satur:1.1}
};
const LUZ = {hemi:new THREE.HemisphereLight(0xffffff, 0x000000, 0.5), sol:new THREE.DirectionalLight(0xffffff, 1)};
LUZ.sol.castShadow = true; LUZ.sol.shadow.mapSize.set(1024, 1024); LUZ.sol.shadow.bias = -0.0008; LUZ.sol.shadow.normalBias = 0.02;
Object.assign(LUZ.sol.shadow.camera, {left:-18, right:18, top:14, bottom:-10, near:1, far:160});
esc.add(LUZ.hemi, LUZ.sol, LUZ.sol.target);
/* luces de lámpara y neón: una cantidad FIJA, se reparten entre las que el nivel pide cerca de la cámara */
const LUCES_NIVEL = [0, 1, 2, 3, 4, 5].map(() => { const l = new THREE.PointLight(0xffffff, 0, 9, 1.3); esc.add(l); return l; });

/* ---------- el cielo: degradé con estrellas y luna brillante (la luna alimenta los rayos) ---------- */
function hacerCielo(C){
  const [c, g] = lienzo(4, 128), gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, C.cielo[0]); gr.addColorStop(0.55, C.cielo[1]); gr.addColorStop(1, C.cielo[2]); g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  const m = new THREE.Mesh(new THREE.PlaneBufferGeometry(900, 300), new THREE.MeshBasicMaterial({map:t, fog:false, depthWrite:false}));
  m.position.set(0, 60, -200); m.renderOrder = -10;
  const grupo = new THREE.Group(); grupo.add(m);
  /* estrellas */
  const n = 260, pos = new Float32Array(n*3); for(let i = 0; i < n; i++){ pos[i*3] = rv(-420, 420); pos[i*3 + 1] = rv(10, 200); pos[i*3 + 2] = -190; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const est = new THREE.Points(sg, new THREE.PointsMaterial({color:new THREE.Color(1.6, 1.6, 2.0), size:1, sizeAttenuation:false, fog:false}));
  grupo.add(est);
  /* la luna (o el sol de la tarde): un disco de luz de verdad, más de 1 para que brille y tire rayos */
  const [lc, lg] = lienzo(64, 64), rg = lg.createRadialGradient(32, 32, 4, 32, 32, 32);
  rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.28, '#ffffff'); rg.addColorStop(0.36, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  lg.fillStyle = rg; lg.fillRect(0, 0, 64, 64);
  const lt = new THREE.CanvasTexture(lc);
  const luna = new THREE.Mesh(new THREE.PlaneBufferGeometry(40, 40), new THREE.MeshBasicMaterial({map:lt, transparent:true, fog:false, depthWrite:false, blending:THREE.AdditiveBlending,
    color:new THREE.Color(C.luna.col).convertSRGBToLinear().multiplyScalar(6)}));
  luna.position.set(C.luna.pos[0]*1.8, C.luna.pos[1]*1.9, -185); grupo.add(luna);
  grupo.userData.luna = luna;
  return grupo;
}
/* ---------- conos de luz volumétrica (aditivos, se apagan hacia abajo y en los bordes) ---------- */
const MAT_CONO = col => new THREE.ShaderMaterial({transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, fog:false,
  uniforms:{col:{value:new THREE.Color(col).convertSRGBToLinear()}, t:{value:0}, f:{value:1}},
  vertexShader:'varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position, 1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader:`uniform vec3 col; uniform float t, f; varying vec2 vUv; varying vec3 vN, vV;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
    void main(){ float borde = pow(abs(dot(vN, vV)), 1.6); float caida = pow(vUv.y, 1.4);
      float polvo = .75 + .25*h(floor(vec2(vUv.x*40., vUv.y*30. + t*2.)));
      gl_FragColor = vec4(col*borde*caida*polvo*.55*f, 1.); }`});
function cono(x, y, z, alto, radio, col){
  const g = new THREE.ConeBufferGeometry(radio, alto, 20, 1, true); g.translate(0, -alto/2, 0);
  const m = new THREE.Mesh(g, MAT_CONO(col)); m.position.set(x, y, z); m.renderOrder = 5; NIVEL.conos.push(m); return m;
}
/* ---------- carteles de neón: texto en píxeles, emisivo de verdad ---------- */
function neon(texto, col, x, y, z, esc2){
  const c = lienzoTexto(texto, 'blanco', {sinBorde:true}), [k, g] = lienzo(c.width + 4, c.height + 2);
  g.drawImage(c, 2, 0);
  const t = texPixel(k), cc = new THREE.Color(col).convertSRGBToLinear();
  const m = new THREE.Mesh(new THREE.PlaneBufferGeometry(k.width/TX*(esc2 || 1), k.height/TX*(esc2 || 1)),
    new THREE.MeshBasicMaterial({map:t, transparent:true, color:cc.clone().multiplyScalar(3.2), fog:false, depthWrite:false}));
  m.position.set(x, y, z); m.userData.neon = {base:3.2, t:rv(0, 9)};
  return m;
}

/* ---------- fondo por capítulo ---------- */
function ventanas(w, h, col, dens, semilla){           /* una fachada con ventanas prendidas (emisivo) */
  const r = mulberry(semilla || 3), [c, g] = lienzo(w, h); g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  for(let y = 2; y < h - 2; y += 4) for(let x = 2; x < w - 2; x += 3) if(r() < dens){ g.fillStyle = r() < .8 ? col : '#8ad0ff'; g.fillRect(x, y, 2, 2); }
  const t = texPixel(c); return t;
}
function edificio(gr, x, z, w, h, colF, colV, dens, semilla){
  const mat = new THREE.MeshStandardMaterial({color:new THREE.Color(colF).convertSRGBToLinear(), roughness:0.9,
    emissive:new THREE.Color(1, 1, 1), emissiveMap:ventanas(Math.round(w*2), Math.round(h*2), colV, dens, semilla), emissiveIntensity:1.6});
  const m = new THREE.Mesh(new THREE.BoxBufferGeometry(w, h, w*0.8), mat); m.position.set(x, h/2 - 2, z); gr.add(m); return m;
}
function fondoPuerto(gr, largo){
  /* el mar: oscuro, liso, con el brillo de la luna */
  const agua = new THREE.Mesh(new THREE.PlaneBufferGeometry(900, 260), new THREE.MeshStandardMaterial({color:new THREE.Color('#0a1226').convertSRGBToLinear(), roughness:0.12, metalness:0.7}));
  agua.rotation.x = -Math.PI/2; agua.position.set(largo/2, -1.2, -120); gr.add(agua);
  const [rc, rg] = lienzo(8, 64); for(let y = 0; y < 64; y++){ const k = y/64; rg.fillStyle = 'rgba(160,190,255,' + (k*0.9) + ')'; for(let x = 0; x < 8; x++) if(Math.random() < 0.55) rg.fillRect(x, y, 1, 1); }
  const refl = new THREE.Mesh(new THREE.PlaneBufferGeometry(10, 140), new THREE.MeshBasicMaterial({map:texPixel(rc), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false,
    color:new THREE.Color(1.4, 1.5, 2.2)}));
  /* el reflejo de la luna en el mar se leía como una mancha entre los contenedores: afuera */
  /* contenedores apilados, grúas con balizas, el barco y la ciudad */
  const r = mulberry(11);
  for(let i = 0; i < 26; i++){ const x = -10 + i*(largo + 20)/26 + r()*3, z = -9 - r()*14, pisos = 1 + Math.floor(r()*3);
    for(let p = 0; p < pisos; p++){ const m = new THREE.Mesh(new THREE.BoxBufferGeometry(6, 2.6, 2.4), matBaldosa('contenedor', {semilla:i*3 + p, relieve:2, rough:1}));
      m.position.set(x, -0.2 + p*2.6 + 1.3, z); m.receiveShadow = m.castShadow = true; gr.add(m); } }
  const matG = new THREE.MeshStandardMaterial({color:new THREE.Color('#3e3a56').convertSRGBToLinear(), roughness:0.8});
  for(let i = 0; i < 4; i++){ const x = i*largo/3.2 + 8, z = -34 - i*6, g2 = new THREE.Group();
    g2.add(puesto(new THREE.Mesh(new THREE.BoxBufferGeometry(1.2, 30, 1.2), matG), [0, 13, 0]));
    g2.add(puesto(new THREE.Mesh(new THREE.BoxBufferGeometry(34, 1.4, 1.2), matG), [8, 27, 0]));
    for(let k = 0; k < 8; k++) g2.add(puesto(new THREE.Mesh(new THREE.BoxBufferGeometry(0.3, 3.2, 0.3), matG), [-6 + k*4, 25, 0], [0, 0, k % 2 ? 0.6 : -0.6]));
    const baliza = new THREE.Mesh(new THREE.SphereBufferGeometry(0.4, 6, 4), new THREE.MeshBasicMaterial({color:new THREE.Color(6, 0.4, 0.3), fog:false}));
    baliza.position.set(25, 28, 0); baliza.userData.baliza = i*0.7; g2.add(baliza);
    g2.position.set(x, 0, z); gr.add(g2); }
  for(let i = 0; i < 18; i++) edificio(gr, -40 + i*((largo + 80)/18) + r()*5, -150 - r()*20, 8 + r()*10, 18 + r()*40, '#0e0c18', '#ffcf7a', 0.25, i + 20);
  /* el faro con su haz que gira (un cono ancho, aditivo) */
  const faro = new THREE.Group(); faro.position.set(largo*0.7, 0, -70);
  faro.add(puesto(new THREE.Mesh(new THREE.CylinderBufferGeometry(1.4, 2.2, 22, 8), new THREE.MeshStandardMaterial({color:new THREE.Color('#d8d0c8').convertSRGBToLinear(), roughness:0.7})), [0, 10, 0]));
  const haz = new THREE.Mesh((() => { const g = new THREE.ConeBufferGeometry(7, 64, 20, 1, true); g.translate(0, -32, 0); g.rotateZ(Math.PI/2); return g; })(), MAT_CONO('#fff0c0'));
  haz.position.set(0, 21.5, 0); haz.material.uniforms.f.value = 0.5; faro.add(haz); faro.userData.haz = haz; gr.add(faro); gr.userData.faro = faro;
}
function fondoFabrica(gr, largo){
  /* la pared del fondo con ventanales altos: por ahí entra el atardecer en rayos */
  const r = mulberry(21), matP = matBaldosa('ladrilloR', {relieve:3, tinte:'#9a7a70'});
  const geo = new Geo();
  /* el ventanal: el atardecer con chimeneas recortadas */
  const [cv, gv] = lienzo(16, 44); for(let y = 0; y < 44; y++){ const k = y/44; gv.fillStyle = k < 0.35 ? '#ffe0a0' : k < 0.6 ? '#ffb060' : k < 0.8 ? '#ff7a30' : '#c84a20'; gv.fillRect(0, y, 16, 1); }
  gv.fillStyle = '#3a1410'; gv.fillRect(0, 36, 16, 8); gv.fillRect(2, 28, 3, 8); gv.fillRect(10, 31, 4, 5); gv.fillRect(6, 33, 5, 3);
  const matV = new THREE.MeshBasicMaterial({map:texPixel(cv), color:new THREE.Color(2.2, 2.0, 1.8)});
  for(let x = -12; x < largo + 12; x += 7){ geo.caja(x, -2, -12, x + 4.5, 26, -11.2, {izq:true, der:true}); geo.caja(x + 4.5, -2, -12, x + 7, 6, -11.2); geo.caja(x + 4.5, 17, -12, x + 7, 26, -11.2); }
  gr.add(geo.malla(matP));
  for(let x = -12; x < largo + 12; x += 7){
    const vid = new THREE.Mesh(new THREE.PlaneBufferGeometry(2.5, 11), matV);
    vid.position.set(x + 5.75, 11.5, -11.9); gr.add(vid);
    for(let k = 1; k < 4; k++) gr.add(puesto(new THREE.Mesh(new THREE.BoxBufferGeometry(2.5, 0.2, 0.1), new THREE.MeshStandardMaterial({color:0x111111})), [x + 5.75, 6 + k*2.75, -11.8]));
    const c = cono(x + 5.75, 16, -10.5, 14, 1.6, '#ffb060'); c.rotation.z = -0.55; c.material.uniforms.f.value = 0.22; gr.add(c);
  }
  /* máquinas, tanques y cadenas colgando */
  const matM = new THREE.MeshStandardMaterial({color:new THREE.Color('#5a5048').convertSRGBToLinear(), roughness:0.5, metalness:0.6});
  for(let i = 0; i < 12; i++){ const x = i*largo/11, m = new THREE.Mesh(new THREE.CylinderBufferGeometry(1.4, 1.4, 5 + r()*4, 12), matM); m.position.set(x + 2, 1.5, -6.5); m.castShadow = true; gr.add(m); }
  for(let i = 0; i < 20; i++){ const m = new THREE.Mesh(new THREE.BoxBufferGeometry(0.08, 6, 0.08), new THREE.MeshStandardMaterial({color:0x222222, metalness:0.8})); m.position.set(r()*largo, 14, -3 - r()*2); gr.add(m); }
}
function fondoTorre(gr, largo){
  const r = mulberry(31);
  /* adentro de la torre: un muro cortina de vidrio con parantes, la ciudad se ve apagada del otro lado */
  if(!NIVEL.def.jefe){ const [c, g] = lienzo(32, 32); g.fillStyle = 'rgba(40,24,70,0.42)'; g.fillRect(0, 0, 32, 32); g.fillStyle = 'rgba(120,90,180,0.10)'; g.fillRect(2, 2, 12, 28);
    g.fillStyle = '#14101e'; g.fillRect(0, 0, 32, 2); g.fillRect(0, 0, 2, 32); g.fillRect(15, 0, 2, 32); g.fillStyle = '#2a2240'; g.fillRect(0, 2, 32, 1);
    const t = texPixel(c, true); t.repeat.set((largo + 20)/4, NIVEL.alto/4);
    const vid = new THREE.Mesh(new THREE.PlaneBufferGeometry(largo + 20, NIVEL.alto), new THREE.MeshBasicMaterial({map:t, transparent:true, depthWrite:false}));
    vid.position.set(largo/2, NIVEL.alto/2, -3.3); gr.add(vid); }
  for(let i = 0; i < 26; i++) edificio(gr, -40 + i*((largo + 80)/26) + r()*4, -40 - r()*60, 6 + r()*9, 30 + r()*70, '#0a0816', r() < .5 ? '#ff5ad8' : '#5ad8ff', 0.3, i + 50);
  for(let i = 0; i < 14; i++) edificio(gr, -40 + i*((largo + 80)/14), -150 - r()*30, 12 + r()*12, 60 + r()*80, '#07060e', '#ffcf7a', 0.2, i + 90);
  for(let i = 0; i < 8; i++){ const n = neon(['MATE', 'TÉ', 'BAR', 'HOTEL', 'EARL GREY', 'CLUB', '24H', 'SAKE'][i], ['#ff4ad8', '#4ad8ff', '#ffd84a', '#4aff8a'][i % 4], i*largo/7 + r()*4, 12 + r()*14, -20 - r()*16, 3.5);
    gr.add(n); }
}

/* ---------- armar un nivel ---------- */
function armarNivel(def){
  if(NIVEL.grupo){ esc.remove(NIVEL.grupo); NIVEL.grupo.traverse(o => { if(o.geometry) o.geometry.dispose(); }); }
  const C = CAPITULOS[def.cap]; NIVEL.cap = C; NIVEL.def = def; NIVEL.conos = []; NIVEL.lamparas = []; NIVEL.neones = [];
  NIVEL.mapa = def.mapa.map(f => f.split('')); NIVEL.alto = NIVEL.mapa.length; NIVEL.ancho = Math.max(...def.mapa.map(f => f.length));
  NIVEL.mapa.forEach(f => { while(f.length < NIVEL.ancho) f.push('.'); });
  const gr = new THREE.Group(); NIVEL.grupo = gr; esc.add(gr);
  esc.fog = new THREE.FogExp2(new THREE.Color(C.niebla).convertSRGBToLinear(), C.dens);
  esc.background = new THREE.Color(C.cielo[0]).convertSRGBToLinear();
  LUZ.hemi.color.set(C.amb[0]).convertSRGBToLinear(); LUZ.hemi.groundColor.set(C.amb[1]).convertSRGBToLinear(); LUZ.hemi.intensity = C.amb[2];
  LUZ.sol.color.set(C.luna.col).convertSRGBToLinear(); LUZ.sol.intensity = C.luna.f;
  POST.luzMundo.set(C.luna.pos[0]*1.8, C.luna.pos[1]*1.9, -185); POST.fuerzaRayos = C.fuerzaRayos; P_FIN.u.colRay.value.set(C.rayos).convertSRGBToLinear();
  P_FIN.u.lift.value.set(C.lift).convertSRGBToLinear(); P_FIN.u.gain.value.set(C.gain); P_FIN.u.satur.value = C.satur;
  gr.add(hacerCielo(C));
  ({puerto:fondoPuerto, fabrica:fondoFabrica, torre:fondoTorre})[def.cap](gr, NIVEL.ancho);
  /* bloques: se funden por tipo, fila por fila y de corrido */
  const mats = {'#':matBaldosa(C.pared, {relieve:3}), '=':matBaldosa(C.tablon, {relieve:2}), 'B':matBaldosa('madera', {relieve:3, tinte:'#c8b098'}), 'x':matBaldosa('madera', {relieve:3, semilla:5})};
  const suelo = matBaldosa(C.suelo, {relieve:2});
  const geos = {'#':new Geo(), '=':new Geo(), 'x':new Geo(), '<':new Geo(), '>':new Geo(), 'v':new Geo(), base:new Geo(), piso:new Geo()};
  mats['<'] = matBaldosa('cinta', {relieve:2, rough:0.6}); mats['>'] = mats['<'].clone(); mats['>'].map = mats['<'].map.clone(); mats['>'].map.needsUpdate = true;
  mats.v = matBaldosa('rejilla', {relieve:3, metal:0.4, rough:0.5}); mats.base = matBaldosa('chapa', {relieve:2, metal:0.3, rough:0.6}); NIVEL.madera = {}; NIVEL.cintas = [mats['<'].map, mats['>'].map]; NIVEL.vapores = [];
  const A = NIVEL.alto;
  for(let f = 0; f < A; f++){ const y0 = A - 1 - f;
    for(let c = 0; c < NIVEL.ancho;){ const t = NIVEL.mapa[f][c];
      if(t === 'B'){ const m = new THREE.Mesh(new THREE.BoxBufferGeometry(1, 1, 2.4), mats.B); m.position.set(c + 0.5, y0 + 0.5, -0.2); m.castShadow = m.receiveShadow = true; gr.add(m); NIVEL.madera[c + ',' + y0] = m; c++; continue; }
      if(t === 'v') NIVEL.vapores.push({x:c + 0.5, y:y0 + 1});
      if(t === '#' || t === 'x' || t === '=' || t === '<' || t === '>' || t === 'v'){ let c1 = c; while(c1 + 1 < NIVEL.ancho && NIVEL.mapa[f][c1 + 1] === t) c1++;
        const arriba = f === 0 ? ['.'] : NIVEL.mapa[f - 1].slice(c, c1 + 1);
        const tapa = t === '#' && arriba.some(q => q !== '#');
        if(t === '=') geos['='].caja(c, y0 + 0.72, -1.2, c1 + 1, y0 + 1, 1.0, {abajo:true});
        else if(t === 'x') geos.x.caja(c + 0.05, y0, -0.9, c1 + 0.95, y0 + 0.95, 0.9);
        else if(t === '<' || t === '>'){ geos[t].caja(c, y0 + 0.62, -1.3, c1 + 1, y0 + 1, 1.1); geos.base.caja(c + 0.1, y0, -1.1, c1 + 0.9, y0 + 0.62, 0.9); }
        else if(t === 'v') geos.v.caja(c, y0, -1.2, c1 + 1, y0 + 1, 1.0);
        else geos[t].caja(c, y0, PROF.atras, c1 + 1, y0 + 1, PROF.adelante, {arriba:!tapa});
        if(tapa) geos.piso.caja(c, y0 + 0.999, PROF.atras, c1 + 1, y0 + 1.001, PROF.adelante, {frente:false, izq:false, der:false});   /* el piso lleva su textura */
        c = c1 + 1; } else c++; }
  }
  for(const k in geos) if(geos[k].p.length) gr.add(geos[k].malla(k === 'piso' ? suelo : mats[k]));
  if(def.cap !== 'torre'){ const agua = def.cap === 'puerto';
    const liq = new THREE.Mesh(new THREE.PlaneBufferGeometry(NIVEL.ancho + 80, 9), new THREE.MeshStandardMaterial({color:new THREE.Color(agua ? '#0c1a34' : '#5a2208').convertSRGBToLinear(),
      emissive:new THREE.Color(agua ? '#03070f' : '#ff6a1a').convertSRGBToLinear(), emissiveIntensity:agua ? 1 : 0.55, roughness:0.12, metalness:0.5}));
    liq.rotation.x = -Math.PI/2; liq.position.set(NIVEL.ancho/2, 0.55, -1.5); liq.receiveShadow = true; gr.add(liq); NIVEL.liquido = {m:liq, agua}; } else NIVEL.liquido = null;
  /* lámparas, neones y cosas */
  NIVEL.cosas = [];
  for(let f = 0; f < A; f++) for(let c = 0; c < NIVEL.ancho; c++){ const t = NIVEL.mapa[f][c], x = c + 0.5, y = A - 1 - f;
    if(t === 'l'){ NIVEL.lamparas.push({x, y:y + 0.8, z:0.3, col:def.cap === 'fabrica' ? '#ffb060' : '#ffd8a0', f:2.6});
      const m = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.15, 0.5, 0.35, 8, 1, true), new THREE.MeshStandardMaterial({color:0x222226, side:THREE.DoubleSide}));
      m.position.set(x, y + 0.85, 0.3); gr.add(m);
      const b = new THREE.Mesh(new THREE.SphereBufferGeometry(0.14, 6, 4), new THREE.MeshBasicMaterial({color:new THREE.Color(8, 6, 4), fog:false})); b.position.set(x, y + 0.72, 0.3); gr.add(b);
      let yy = y; while(yy > y - 9 && !solidoEn(x, yy - 0.5)) yy--; const al = y + 0.75 - yy; gr.add(cono(x, y + 0.75, 0.3, al, al*0.36, def.cap === 'fabrica' ? '#ffa050' : '#ffe0b0'));
      NIVEL.mapa[f][c] = '.'; }
    else if(t === 'n'){ const txt = (def.neones && def.neones.shift()) || 'MATE', col = ['#ff4ad8', '#4ad8ff', '#ffd84a'][c % 3];
      const n = neon(txt, col, x, y + 0.3, -2.55, 1); gr.add(n); NIVEL.neones.push(n); NIVEL.lamparas.push({x, y:y + 0.3, z:-1.8, col, f:1.8, neon:n}); NIVEL.mapa[f][c] = '.'; }
  }
  /* la lluvia: segmentos de un píxel que caen dentro de una caja que sigue a la cámara */
  if(C.lluvia && !(def.cap === 'torre' && !def.jefe)){ const n = AJ.calidad === 'baja' ? 160 : 420, pos = new Float32Array(n*6), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:new THREE.Color(0.55, 0.62, 0.95), transparent:true, opacity:0.32, fog:false}));
    l.frustumCulled = false; gr.add(l); NIVEL.lluvia = {l, pos, n, gotas:[...Array(n)].map(() => ({x:rv(-18, 18), y:rv(-10, 14), z:rv(-6, 4)}))}; } else NIVEL.lluvia = null;
  return gr;
}
/* cada cuadro: luces del nivel a las lámparas más cercanas, lluvia, neones que titilan, faro, balizas */
function pasoMundo(dt, t){
  const cx = CAMARA.x, cy = CAMARA.y;
  const cerca = NIVEL.lamparas.slice().sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx)).slice(0, LUCES_NIVEL.length);
  LUCES_NIVEL.forEach((l, i) => { const q = cerca[i]; if(!q){ l.intensity = 0; return; }
    let f = q.f; if(q.neon){ const nn = q.neon.userData.neon; const parpa = Math.sin(t*23 + nn.t) > 0.97 || (Math.sin(t*1.3 + nn.t) > 0.985) ? 0.25 : 1; f *= parpa; q.neon.material.color.setScalar(0).add(new THREE.Color(q.col).convertSRGBToLinear().multiplyScalar(nn.base*parpa)); }
    l.position.set(q.x, q.y, q.z); l.color.set(q.col).convertSRGBToLinear(); l.intensity = f; l.distance = 9; });
  for(const c of NIVEL.conos) c.material.uniforms.t.value = t;
  if(NIVEL.cintas){ NIVEL.cintas[0].offset.x = (t*V_CINTA/2) % 1; NIVEL.cintas[1].offset.x = 1 - (t*V_CINTA/2) % 1; }
  if(NIVEL.vapores && PART.solidas) for(const v of NIVEL.vapores) if(Math.abs(v.x - cx) < 20 && Math.random() < dt*40)
    PART.solidas.tirar(Object.assign({x:v.x + rv(-0.4, 0.4), y:v.y, z:rv(-0.6, 0.6), vx:rv(-0.4, 0.4), vy:rv(7, 11), g:-1, roce:1.4, vida:rv(0.5, 0.9), tam:rv(2, 4), apaga:true}, rgb('#c8c4d0', 0.9)));
  if(NIVEL.lluvia){ const L = NIVEL.lluvia, v = 26*dt;
    L.gotas.forEach((d, i) => { d.y -= v; d.x -= v*0.18; if(d.y < -10){ d.y += 24; d.x = rv(-18, 18); if(Math.random() < 0.07) salpicar(cx + d.x, cy); }
      const X = cx + d.x, Y = cy + d.y; L.pos.set([X, Y, d.z, X + 0.07, Y + 0.38, d.z], i*6); });
    L.l.geometry.attributes.position.needsUpdate = true; }
  const G = NIVEL.grupo.userData;
  NIVEL.grupo.traverse(o => { if(o.userData.baliza !== undefined) o.visible = Math.sin(t*3 + o.userData.baliza*5) > 0.6; });
  const faro = NIVEL.grupo.children.find(o => o.userData && o.userData.haz); if(faro) faro.userData.haz.rotation.y = Math.PI/2 + Math.sin(t*0.45)*1.35;
  /* la sombra sigue a la cámara */
  LUZ.sol.position.set(cx + NIVEL.cap.luna.pos[0]*0.5, cy + 40, 30); LUZ.sol.target.position.set(cx, cy, 0);
}
function salpicar(x, y){ let yy = Math.floor(y + 8); while(yy > y - 10 && !solidoEn(x, yy - 0.5)) yy--; if(!solidoEn(x, yy - 0.5)) return;
  PART.solidas && PART.solidas.tirar(Object.assign({x, y:yy + 0.02, z:rv(-1, 1), vx:rv(-1, 1), vy:rv(1.5, 3), g:20, vida:0.18, tam:1}, rgb('#6a78b0', 0.9))); }
