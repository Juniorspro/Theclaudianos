/* ================================================================ render
   Una escena, una cámara que es la cabeza. Luces: cielo (hemisferio), sol/luna, un grupo fijo de 4 puntuales
   que se reparten entre los cuartos prendidos más cercanos (cambiar cuántas luces hay recompila todos los
   materiales: nunca se agregan ni se sacan), la linterna y el farol de la calle. */
const RND = {esc:null, cam:null, rend:null, pool:[], hemi:null, sol:null, linterna:null, farol:null, cielo:null, estrellas:null, luna:null, dpr:1, sombras:false};
const CAL = {alta:{dpr:2, sombra:true, antialias:true, niebla:1}, media:{dpr:1.35, sombra:false, antialias:true, niebla:1}, baja:{dpr:1, sombra:false, antialias:false, niebla:1}};
function iniciarRender(){
  const c = CAL[AJ.calidad] || CAL.media;
  const rend = new THREE.WebGLRenderer({canvas:$('lienzo'), antialias:c.antialias, powerPreference:'high-performance', stencil:false});
  rend.outputEncoding = THREE.sRGBEncoding; rend.toneMapping = THREE.ACESFilmicToneMapping; rend.toneMappingExposure = 1.0;
  rend.shadowMap.enabled = true; rend.shadowMap.type = THREE.PCFSoftShadowMap; rend.shadowMap.autoUpdate = true; rend.info.autoReset = false;
  const esc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(70, 2, 0.05, 520);
  esc.fog = new THREE.FogExp2(0x0a0c12, 0.03); esc.add(cam);
  RND.esc = esc; RND.cam = cam; RND.rend = rend;
  /* cielo y sol/luna */
  RND.hemi = new THREE.HemisphereLight(0xbcd4ff, 0x3a3a2a, 0.9); esc.add(RND.hemi);
  RND.sol = new THREE.DirectionalLight(0xffd8a8, 1.0); RND.sol.position.set(-60, 30, 20); esc.add(RND.sol); esc.add(RND.sol.target);
  for(let i = 0; i < 4; i++){ const L = new THREE.PointLight(0xffc88a, 0, 8, 1.6); L.position.set(0, -50, 0); esc.add(L); RND.pool.push(L); }
  /* la linterna sale del pecho, apenas debajo de los ojos, y apunta adonde mirás */
  const lin = new THREE.SpotLight(0xfff0d0, 0, 26, 0.42, 0.45, 1.2); lin.position.set(0.12, -0.12, 0.05); cam.add(lin);
  const blanco = new THREE.Object3D(); blanco.position.set(0, -0.05, -5); cam.add(blanco); lin.target = blanco; RND.linterna = lin;
  lin.castShadow = c.sombra; lin.shadow.mapSize.set(512, 512); lin.shadow.bias = -0.0015; lin.shadow.camera.near = 0.2; lin.shadow.camera.far = 24;
  const far = new THREE.SpotLight(0xffb260, 0, 18, 0.75, 0.6, 1.5); far.position.set(FAROL.x, 4.85, FAROL.z - 1.0); far.target.position.set(FAROL.x, 0, FAROL.z - 1.5); esc.add(far); esc.add(far.target); RND.farol = far;
  armarCielo(esc);
  MED.cb.push((w, h) => ajustarTamano(w, h)); medir();
}
function ajustarTamano(w, h){ const c = CAL[AJ.calidad] || CAL.media; RND.dpr = Math.min(c.dpr, window.devicePixelRatio || 1);
  RND.rend.setPixelRatio(RND.dpr); RND.rend.setSize(w, h, false); RND.cam.aspect = w/h;
  RND.cam.fov = w/h > 1.3 ? 66 : 74; RND.cam.updateProjectionMatrix(); }
function aplicarCalidad(){ const c = CAL[AJ.calidad] || CAL.media; RND.linterna.castShadow = c.sombra; ajustarTamano(MED.w, MED.h);
  RND.esc.traverse(o => { if(o.material && o.material.needsUpdate !== undefined){ const ms = Array.isArray(o.material) ? o.material : [o.material]; for(const m of ms) m.needsUpdate = true; } }); }

/* el cielo: un degradé en una esfera, con el sol (de tarde) y el resplandor verde de la planta en el horizonte */
function armarCielo(esc){
  const U = {uArriba:{value:new THREE.Color(0x4a86d8)}, uHorizonte:{value:new THREE.Color(0xf0c890)}, uAbajo:{value:new THREE.Color(0x2a2a20)}, uSol:{value:new THREE.Vector3(-0.8, 0.3, 0.2).normalize()},
    uColSol:{value:new THREE.Color(0xfff0c0)}, uTamSol:{value:1}, uPlanta:{value:new THREE.Vector3(0.39, 0.0, -0.92).normalize()}, uColPlanta:{value:new THREE.Color(0x3aff6a)}, uKPlanta:{value:0}};
  const mat = new THREE.ShaderMaterial({uniforms:U, side:THREE.BackSide, depthWrite:false, fog:false,
    vertexShader:'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); gl_Position.z = gl_Position.w*0.9999; }',
    fragmentShader:`uniform vec3 uArriba, uHorizonte, uAbajo, uSol, uColSol, uPlanta, uColPlanta; uniform float uTamSol, uKPlanta; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = d.y;
        vec3 c = h > 0.0 ? mix(uHorizonte, uArriba, pow(clamp(h*1.6, 0.0, 1.0), 0.6)) : mix(uHorizonte, uAbajo, clamp(-h*6.0, 0.0, 1.0));
        float s = max(dot(d, uSol), 0.0); c += uColSol*(pow(s, 900.0)*6.0*uTamSol + pow(s, 12.0)*0.35*uTamSol);
        float p = max(dot(normalize(vec3(d.x, 0.0, d.z)), uPlanta), 0.0); c += uColPlanta*uKPlanta*pow(p, 6.0)*exp(-max(h, 0.0)*9.0)*0.5;
        /* los colores ya están en sRGB, igual que la niebla: sin tono ni codificación el horizonte empalma con el suelo lejano */
        gl_FragColor = vec4(c, 1.0);
      }`});
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), mat); cielo.frustumCulled = false; cielo.renderOrder = -10; esc.add(cielo); RND.cielo = cielo; RND.U_CIELO = U;
  /* estrellas y luna */
  const n = 700, pos = new Float32Array(n*3), r = mulberry(99);
  for(let i = 0; i < n; i++){ const a = r()*Math.PI*2, y = 0.08 + r()*0.92, rr = Math.sqrt(1 - y*y); pos[i*3] = Math.cos(a)*rr*420; pos[i*3 + 1] = y*420; pos[i*3 + 2] = Math.sin(a)*rr*420; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const [cv, gg] = lienzo(32, 32), gr = gg.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 32, 32);
  const est = new THREE.Points(g, new THREE.PointsMaterial({size:2.2, sizeAttenuation:false, map:new THREE.CanvasTexture(cv), transparent:true, opacity:0, depthWrite:false, fog:false}));
  est.frustumCulled = false; esc.add(est); RND.estrellas = est;
  const [lc, lg] = lienzo(128, 128), lgr = lg.createRadialGradient(64, 64, 10, 64, 64, 64); lgr.addColorStop(0, 'rgba(235,240,255,1)'); lgr.addColorStop(0.42, 'rgba(220,228,255,1)'); lgr.addColorStop(0.46, 'rgba(160,180,255,0.35)'); lgr.addColorStop(1, 'rgba(120,140,220,0)');
  lg.fillStyle = lgr; lg.fillRect(0, 0, 128, 128); lg.fillStyle = 'rgba(160,165,190,0.5)'; for(const [x, y, rr] of [[52, 50, 9], [74, 70, 7], [60, 78, 5]]){ lg.beginPath(); lg.arc(x, y, rr, 0, 7); lg.fill(); }
  const luna = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(lc), transparent:true, opacity:0, depthWrite:false, fog:false})); luna.scale.set(34, 34, 1); luna.position.set(160, 190, 260); esc.add(luna); RND.luna = luna;
}

/* la hora del día manda: cielo, niebla, sol, luna, estrellas y cuánto llega de afuera a los cuartos
   h va de 16 (4 PM) a 30 (6 AM). noche = 0 de día, 1 de noche cerrada */
const CIELO = [
  {h:16,   ar:0x4a86d8, ho:0xf4d8a8, ab:0x3a3a2a, sol:1.15, hemi:0.85, niebla:0x9ab0c8, dn:0.006, adentro:0.62, noche:0},
  {h:18.2, ar:0x5a6aa8, ho:0xf09a5a, ab:0x2a2420, sol:0.9,  hemi:0.62, niebla:0xc8906a, dn:0.009, adentro:0.55, noche:0.15},
  {h:19.3, ar:0x2a2a58, ho:0xa04a4a, ab:0x14121a, sol:0.2,  hemi:0.28, niebla:0x3a2a3a, dn:0.016, adentro:0.36, noche:0.55},
  {h:20.3, ar:0x0a0e20, ho:0x1a1a2a, ab:0x050608, sol:0.0,  hemi:0.1,  niebla:0x0c0e16, dn:0.028, adentro:0.2, noche:0.9},
  {h:21.5, ar:0x04060e, ho:0x0e1016, ab:0x020304, sol:0.0,  hemi:0.06, niebla:0x07080c, dn:0.034, adentro:0.12, noche:1},
  {h:28.5, ar:0x04060e, ho:0x0e1016, ab:0x020304, sol:0.0,  hemi:0.06, niebla:0x07080c, dn:0.034, adentro:0.12, noche:1},
  {h:29.5, ar:0x1a2a50, ho:0x5a4a6a, ab:0x0a0a10, sol:0.05, hemi:0.2,  niebla:0x2a2a3a, dn:0.02,  adentro:0.3, noche:0.6},
  {h:30.2, ar:0x5a8ad0, ho:0xf8b878, ab:0x2a2a20, sol:0.8,  hemi:0.6,  niebla:0xd0a080, dn:0.01,  adentro:0.55, noche:0.1}
];
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function mezclaHex(a, b, t){ return _c1.set(a).lerp(_c2.set(b), t).clone(); }
function aplicarHora(h){
  let i = 0; while(i < CIELO.length - 2 && h > CIELO[i + 1].h) i++;
  const A = CIELO[i], B = CIELO[i + 1], t = lim((h - A.h)/(B.h - A.h), 0, 1), L = (k) => lerp(A[k], B[k], t);
  const U = RND.U_CIELO; U.uArriba.value.copy(mezclaHex(A.ar, B.ar, t)); U.uHorizonte.value.copy(mezclaHex(A.ho, B.ho, t)); U.uAbajo.value.copy(mezclaHex(A.ab, B.ab, t));
  const noche = L('noche'); RND.noche = noche;
  /* el sol baja por el oeste; a la mañana sale por el este */
  const ds = h < 24 ? lim((h - 16)/4.5, 0, 1) : 1 - lim((h - 29)/1.3, 0, 1), este = h >= 24;
  const alt = lerp(0.42, -0.08, ds), az = este ? 0.9 : -0.85;
  U.uSol.value.set(az, alt, este ? -0.2 : 0.25).normalize(); U.uTamSol.value = lim(1 - noche*1.3, 0, 1); U.uKPlanta.value = lerp(0.1, 1, noche);
  RND.sol.position.copy(U.uSol.value).multiplyScalar(80); RND.sol.intensity = L('sol'); RND.sol.color.set(ds > 0.6 ? 0xff9a5a : 0xffe0b8);
  if(noche > 0.8){ RND.sol.intensity = 0.1*(noche - 0.8)/0.2; RND.sol.color.set(0x8aa0d8); RND.sol.position.set(160, 190, 260); }
  RND.hemi.intensity = L('hemi')*AJ.brillo; RND.hemi.color.copy(mezclaHex(0xbcd4ff, 0x4a5a8a, noche)); RND.hemi.groundColor.copy(mezclaHex(0x5a5040, 0x10121a, noche));
  RND.esc.fog.color.copy(mezclaHex(A.niebla, B.niebla, t)); RND.esc.fog.density = L('dn');
  U_ADENTRO.value = L('adentro');
  RND.estrellas.material.opacity = lim((noche - 0.5)*2, 0, 1)*0.9; RND.luna.material.opacity = lim((noche - 0.4)*2, 0, 1);
  RND.farol.intensity = noche > 0.6 && !(J && J.farolRoto) ? 2.2*(J && J.farolTitila ? (Math.random() < 0.5 ? 0.05 : 1) : 1) : 0;
  RND.rend.toneMappingExposure = AJ.brillo*(1 + noche*0.25);
}

/* el grupo de luces: los 4 cuartos prendidos más cercanos al jugador (y adentro, el cuarto donde estás primero) */
function repartirLuces(px, py, pz){
  const L = MUNDO.luces, cand = [];
  for(const l of L){ const on = l.on && (l.siempre || ELEC.hay) && l.parpadeo <= 0; if(!on) continue;
    const d = Math.hypot(l.pos[0] - px, (l.pos[1] - py)*1.6, l.pos[2] - pz); cand.push([d, l]); }
  cand.sort((a, b) => a[0] - b[0]);
  for(let i = 0; i < RND.pool.length; i++){ const P = RND.pool[i], c = cand[i];
    if(c){ const l = c[1]; P.position.set(l.pos[0], l.pos[1], l.pos[2]); P.distance = l.alcance; P.intensity = (l.afuera ? 1.6 : 1.25)*(ELEC.titila ? (Math.random() < 0.35 ? 0.1 : 1) : 1)*(l.mult || 1); }
    else { P.intensity = 0; P.position.set(0, -60, 0); } }
  /* el susto: una luz pegada a la cara para que se vea entera aunque el cuarto esté a oscuras */
  if(J && J.modo === 'susto'){ const P = RND.pool[0], c = RND.cam; P.position.set(c.position.x, c.position.y + 0.25, c.position.z); P.distance = 4; P.intensity = 1.3 + Math.random()*0.9; }
  /* las bombitas se ven prendidas aunque no les toque una luz del grupo */
  const bm = MUNDO.bombitas; let cambio = false;
  L.forEach((l, i) => { const on = l.on && (l.siempre || ELEC.hay) && l.parpadeo <= 0, k = on ? 1 : 0; if(l._k !== k){ l._k = k; bm.setColorAt(i, new THREE.Color(on ? 0xfff0c8 : 0x2a2a2a)); cambio = true; } });
  if(cambio) bm.instanceColor.needsUpdate = true;
}

/* el grano de película y la viñeta van por encima, en un lienzo chiquito */
const GRANO = {g:null, t:0, k:1};
function pasoGrano(dt){ GRANO.t += dt; if(GRANO.t < 1/24) return; GRANO.t = 0; const c = $('grano'), g = GRANO.g || (GRANO.g = c.getContext('2d')), w = c.width, h = c.height;
  const d = g.createImageData(w, h), a = d.data; for(let i = 0; i < a.length; i += 4){ const v = Math.random()*255; a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] = 255; } g.putImageData(d, 0, 0);
  c.style.opacity = (0.05 + 0.07*GRANO.k).toFixed(3); }
