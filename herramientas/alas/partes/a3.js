
/* ====================== modelos generados ======================
   Cada GLB llega sin imágenes, en metros, con la nariz hacia −z: se funde en una geometría y se le arma un material PBR. */
const MODELOS = {};
function aFlotante(g){
  for(const k of Object.keys(g.attributes)){ const a = g.attributes[k]; if(a.array instanceof Float32Array && !a.normalized) continue;
    const n = a.count, s = a.itemSize, d = new Float32Array(n*s), arr = a.array, st = a.isInterleavedBufferAttribute ? a.data.stride : s, of = a.isInterleavedBufferAttribute ? a.offset : 0;
    const div = !a.normalized ? 1 : (arr instanceof Int16Array ? 32767 : arr instanceof Uint16Array ? 65535 : arr instanceof Int8Array ? 127 : arr instanceof Uint8Array ? 255 : 1);
    const src = a.isInterleavedBufferAttribute ? a.data.array : arr;
    for(let i=0;i<n;i++) for(let c=0;c<s;c++){ const v = src[i*st + of + c]/div; d[i*s + c] = a.normalized ? Math.max(v, -1) : v; }
    g.setAttribute(k, new THREE.BufferAttribute(d, s)); }
  return g;
}
function fundirGeo(root){
  root.updateMatrixWorld(true); const partes = [];
  root.traverse(o=>{ if(!o.isMesh) return; let g = aFlotante(o.geometry.clone()); g.applyMatrix4(o.matrixWorld); if(g.index) g = g.toNonIndexed(); partes.push(g); });
  if(!partes.length) return null; if(partes.length === 1) return partes[0];
  const out = new THREE.BufferGeometry();
  for(const [k, n] of [['position',3],['normal',3],['uv',2]]){ if(!partes.every(g=> g.attributes[k])) continue;
    const total = partes.reduce((s, g)=> s + g.attributes[k].array.length, 0), a = new Float32Array(total); let o = 0;
    for(const g of partes){ a.set(g.attributes[k].array, o); o += g.attributes[k].array.length; } out.setAttribute(k, new THREE.BufferAttribute(a, n)); }
  return out;
}
function matModelo(id, man, o){
  const pre = 'mod/' + id + '/', tx = (k, op)=> ARCH[pre + k] ? texAsset(pre + k, Object.assign({voltear:false, repetir:false}, op)) : null;
  const mapa = tx('color', {srgb:true}), nrm = tx('normal', {normal:true}), mr = tx('mr', {});
  const m = new THREE.MeshStandardMaterial(Object.assign({map:mapa, normalMap:nrm, roughnessMap:mr, metalnessMap:mr, roughness:mr ? 1 : 0.55, metalness:mr ? 1 : 0.35, envMapIntensity:1}, o||{}));
  if(nrm) m.normalScale.set(1, -1);
  return parcheNiebla(m);
}
function prepararModelos(){
  for(const man of (MAN.mod||[])){ const g = GLB_LISTO['glb/' + man.id]; if(!g) continue; const geo = fundirGeo(g.scene); if(!geo) continue;
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    MODELOS[man.id] = {geo, man, caja:geo.boundingBox.clone(), get mat(){ return this._mat || (this._mat = matModelo(this.man.id, this.man)); }}; }
}
AL_LLEGAR.push(prepararModelos);

/* ====================== avión de respaldo, por código ======================
   Fuselaje torneado, alas en flecha, derivas y toberas: se lee a jet a cualquier distancia hasta que llega el modelo. */
const CACHE_JET = {};
function jetPorCodigo(def){
  const k = def.modelo + def.color; if(CACHE_JET[k]) return CACHE_JET[k];
  const L = def.largo, g = new THREE.Group(), mc = parcheNiebla(new THREE.MeshStandardMaterial({color:lin(def.color), roughness:0.5, metalness:0.35, envMapIntensity:1}));
  const mo = parcheNiebla(new THREE.MeshStandardMaterial({color:lin('#2a2e33'), roughness:0.6, metalness:0.5})), mv = parcheNiebla(new THREE.MeshStandardMaterial({color:lin('#1a2a3a'), roughness:0.08, metalness:0.9, envMapIntensity:1.6}));
  const pts = []; const perfil = [[0,0],[0.06,0.35],[0.16,0.75],[0.3,0.95],[0.55,1],[0.8,0.92],[0.95,0.8],[1,0.62]];
  for(const [t, r] of perfil) pts.push(new THREE.Vector2(r*L*0.055, (t - 0.5)*L));
  const fus = new THREE.Mesh(new THREE.LatheGeometry(pts, 14).rotateX(-Math.PI/2), mc); g.add(fus);
  const ala = s=>{ const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s*L*0.36, L*0.2); sh.lineTo(s*L*0.36, L*0.27); sh.lineTo(0, L*0.3); sh.lineTo(0, 0);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, {depth:L*0.012, bevelEnabled:false}).rotateX(Math.PI/2), mc); m.position.set(0, -L*0.01, -L*0.02); return m; };
  g.add(ala(1), ala(-1));
  const cola = s=>{ const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s*L*0.16, L*0.1); sh.lineTo(s*L*0.16, L*0.14); sh.lineTo(0, L*0.14);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, {depth:L*0.01, bevelEnabled:false}).rotateX(Math.PI/2), mc); m.position.set(0, 0, L*0.33); return m; };
  g.add(cola(1), cola(-1));
  const deriva = x=>{ const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(-L*0.13, L*0.17); sh.lineTo(-L*0.2, L*0.17); sh.lineTo(-L*0.16, 0);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, {depth:L*0.008, bevelEnabled:false}).rotateY(-Math.PI/2), mc); m.position.set(x, L*0.03, L*0.47); m.rotation.z = x ? -Math.sign(x)*0.2 : 0; return m; };
  if(def.largo >= 17) g.add(deriva(L*0.05), deriva(-L*0.05)); else g.add(deriva(0));
  const cab = new THREE.Mesh(new THREE.SphereGeometry(L*0.04, 12, 8, 0, TAU, 0, Math.PI/2), mv); cab.scale.set(1, 0.9, 2.6); cab.position.set(0, L*0.045, -L*0.25); g.add(cab);
  for(const s of def.largo >= 17 ? [-1, 1] : [0]){ const t = new THREE.Mesh(new THREE.CylinderGeometry(L*0.03, L*0.034, L*0.06, 12, 1, true).rotateX(Math.PI/2), mo); t.position.set(s*L*0.035, 0, L*0.5); g.add(t); }
  const geos = []; g.updateMatrixWorld(true);
  return CACHE_JET[k] = {g, toberas:(def.largo >= 17 ? [-1, 1] : [0]).map(s=> V3(s*L*0.035, 0, L*0.53)), puntas:[V3(L*0.36, -L*0.01, L*0.1), V3(-L*0.36, -L*0.01, L*0.1)], canon:V3(L*0.03, 0.2, -L*0.4)};
}
/* malla del avión: el modelo generado escalado a su largo, o el de respaldo; y sus puntos (toberas, puntas de ala, cañón) */
function mallaAvion(def){
  const M = MODELOS[def.modelo], esc = def.escala || 1;
  if(M){ const b = M.caja, largo = b.max.z - b.min.z, k = def.largo*esc/largo, m = new THREE.Mesh(M.geo, M.mat), g = new THREE.Group(); m.scale.setScalar(k);
    const c = b.getCenter(V3(0,0,0)); m.position.copy(c).multiplyScalar(-k); g.add(m); const P = M.man.puntos || {};
    const pp = (p, d)=> p ? V3(p[0], p[1], p[2]).sub(c).multiplyScalar(k) : d;
    const tob = (P.toberas && P.toberas.length ? P.toberas : null), pun = P.puntas_ala;
    return {g, glb:true, toberas:tob ? tob.map(p=> pp(p)) : [V3(0, 0, (b.max.z - c.z)*k*0.98)], puntas:pun ? pun.map(p=> pp(p)) : [V3((b.max.x - c.x)*k*0.95, 0, (b.max.z - c.z)*k*0.3), V3((b.min.x - c.x)*k*0.95, 0, (b.max.z - c.z)*k*0.3)],
      canon:pp(P.canon, V3(0.6, 0, (b.min.z - c.z)*k*0.8)), rieles:(P.rieles||[]).map(p=> pp(p))}; }
  const J0 = jetPorCodigo(def), g = J0.g.clone(); if(esc !== 1) g.scale.setScalar(esc);
  return {g, glb:false, toberas:J0.toberas.map(v=> v.clone().multiplyScalar(esc)), puntas:J0.puntas.map(v=> v.clone().multiplyScalar(esc)), canon:J0.canon.clone().multiplyScalar(esc), rieles:[]};
}

/* ====================== partículas: humo (normal) y fuego (aditivo), una malla instanciada cada una ====================== */
function texPuff(caliente){ const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  if(caliente){ gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
  else { gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); if(!caliente){ g.globalCompositeOperation = 'destination-out'; for(let i=0;i<40;i++){ g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.arc(8 + Math.random()*48, 8 + Math.random()*48, 3 + Math.random()*7, 0, TAU); g.fill(); } }
  return new THREE.CanvasTexture(c); }
function sistemaParticulas(max, aditivo){
  const base = new THREE.PlaneGeometry(1, 1), geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const P = new Float32Array(max*3), D = new Float32Array(max*4), C = new Float32Array(max*3);
  geo.setAttribute('pc', new THREE.InstancedBufferAttribute(P, 3)); geo.setAttribute('pd', new THREE.InstancedBufferAttribute(D, 4)); geo.setAttribute('pk', new THREE.InstancedBufferAttribute(C, 3));
  geo.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({uniforms:{t:{value:texPuff(aditivo)}, fogColor:{value:new THREE.Color()}, fogNear:{value:1000}, fogFar:{value:30000}, luz:{value:new THREE.Color(1,1,1)}},
    transparent:true, depthWrite:false, blending:aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader:`attribute vec3 pc; attribute vec4 pd; attribute vec3 pk; varying vec2 vUv; varying float vA; varying vec3 vK; varying float vD;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){ vec3 der = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), arr = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        float c = cos(pd.z), s = sin(pd.z); vec2 q = vec2(position.x*c - position.y*s, position.x*s + position.y*c);
        vec3 w = pc + (der*q.x + arr*q.y)*pd.x; vUv = uv; vA = pd.y; vK = pk; vec4 mv = viewMatrix*vec4(w, 1.0); vD = -mv.z; gl_Position = projectionMatrix*mv;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader:`uniform sampler2D t; uniform vec3 fogColor, luz; uniform float fogNear, fogFar; varying vec2 vUv; varying float vA; varying vec3 vK; varying float vD;
      #include <logdepthbuf_pars_fragment>
      void main(){
        #include <logdepthbuf_fragment>
        vec4 m = texture2D(t, vUv); float f = 1.0 - exp(-pow(max(vD - fogNear, 0.0)/(fogFar - fogNear)*2.2, 1.6));
        ${aditivo ? 'gl_FragColor = vec4(vK*m.a*vA*(1.0 - f), 1.0);' : 'vec3 c = mix(vK*luz, fogColor, f); gl_FragColor = vec4(c, m.a*vA);'} }`});
  const malla = new THREE.Mesh(geo, mat); malla.frustumCulled = false; malla.renderOrder = aditivo ? 7 : 6; escena.add(malla);
  const L = []; return {malla, L, max, P, D, C, mat,
    emitir(p, v, vida, t0, t1, col, a0, crece){ if(L.length >= max) L.shift(); L.push({p:p.clone(), v:v ? v.clone() : V3(0,0,0), vida, e:0, t0, t1, col, a0:a0 === undefined ? 1 : a0, rot:Math.random()*TAU, rv:vr(-0.6, 0.6), crece}); },
    pasar(dt){ let n = 0; for(let i=L.length-1;i>=0;i--){ const q = L[i]; q.e += dt; if(q.e >= q.vida){ L.splice(i, 1); continue; } q.p.addScaledVector(q.v, dt); q.v.multiplyScalar(1 - 0.6*dt); if(q.crece) q.v.y += q.crece*dt; q.rot += q.rv*dt; }
      for(const q of L){ const k = q.e/q.vida, s = lerp(q.t0, q.t1, Math.sqrt(k)), a = q.a0*(k < 0.1 ? k/0.1 : 1 - (k - 0.1)/0.9);
        P[n*3] = q.p.x; P[n*3+1] = q.p.y; P[n*3+2] = q.p.z; D[n*4] = s; D[n*4+1] = a; D[n*4+2] = q.rot; C[n*3] = q.col[0]; C[n*3+1] = q.col[1]; C[n*3+2] = q.col[2]; n++; }
      geo.instanceCount = n; geo.attributes.pc.needsUpdate = geo.attributes.pd.needsUpdate = geo.attributes.pk.needsUpdate = true; },
    limpiar(){ L.length = 0; geo.instanceCount = 0; }};
}
const HUMO = sistemaParticulas(2200, false), FUEGO = sistemaParticulas(1400, true);
/* trazadoras: segmentos aditivos */
const TRAZOS = (()=>{ const max = 400, geo = new THREE.BufferGeometry(), p = new Float32Array(max*6), c = new Float32Array(max*6);
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); geo.setDrawRange(0, 0);
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({vertexColors:true, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false})); m.frustumCulled = false; m.renderOrder = 8; escena.add(m);
  return {m, geo, p, c, max}; })();

/* ====================== estelas de las puntas de ala: cintas que miran a la cámara ====================== */
function cinta(n){ const geo = new THREE.BufferGeometry(), p = new Float32Array(n*2*3), a = new Float32Array(n*2), idx = [];
  for(let i=0;i<n-1;i++){ const k = i*2; idx.push(k, k+1, k+2, k+1, k+3, k+2); }
  geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(p, 3)); geo.setAttribute('alfa', new THREE.BufferAttribute(a, 1));
  const m = new THREE.Mesh(geo, MAT_CINTA); m.frustumCulled = false; m.renderOrder = 6; escena.add(m); return {m, geo, p, a, n, pts:[], alfas:[]}; }
const MAT_CINTA = new THREE.ShaderMaterial({transparent:true, depthWrite:false, side:THREE.DoubleSide, uniforms:{col:{value:new THREE.Color(1,1,1)}},
  vertexShader:`attribute float alfa; varying float vA;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vA = alfa; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0);
    #include <logdepthbuf_vertex>
    }`,
  fragmentShader:`uniform vec3 col; varying float vA;
    #include <logdepthbuf_pars_fragment>
    void main(){
    #include <logdepthbuf_fragment>
    gl_FragColor = vec4(col, vA); }`});
function pasarCinta(C, punto, alfa, ancho){
  C.pts.unshift(punto.clone()); C.alfas.unshift(alfa); if(C.pts.length > C.n){ C.pts.pop(); C.alfas.pop(); }
  const cp = cam.position, n = C.pts.length; let k = 0;
  for(let i=0;i<C.n;i++){ const q = C.pts[Math.min(i, n - 1)], q2 = C.pts[Math.min(i + 1, n - 1)] || q, dir = _t1.subVectors(q2, q), v = _t2.subVectors(cp, q), s = _t3.crossVectors(dir, v).normalize().multiplyScalar(ancho*(1 - i/C.n*0.5));
    C.p[k] = q.x + s.x; C.p[k+1] = q.y + s.y; C.p[k+2] = q.z + s.z; C.p[k+3] = q.x - s.x; C.p[k+4] = q.y - s.y; C.p[k+5] = q.z - s.z; k += 6;
    const a = (i < n ? C.alfas[i] : 0)*(1 - i/C.n); C.a[i*2] = C.a[i*2+1] = a; }
  C.geo.attributes.position.needsUpdate = true; C.geo.attributes.alfa.needsUpdate = true; }
const _t1 = V3(0,0,0), _t2 = V3(0,0,0), _t3 = V3(0,0,0), _q1 = new THREE.Quaternion(), _EJEX = V3(1,0,0), _EJEY = V3(0,1,0), _EJEZ = V3(0,0,1);

/* ====================== llama del posquemador ====================== */
const MAT_LLAMA = new THREE.ShaderMaterial({transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, uniforms:{t:{value:0}, fuerza:{value:1}},
  vertexShader:`varying vec2 vUv;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0);
    #include <logdepthbuf_vertex>
    }`,
  fragmentShader:`uniform float t, fuerza; varying vec2 vUv;
    #include <logdepthbuf_pars_fragment>
    void main(){
      #include <logdepthbuf_fragment>
      float x = vUv.y, a = pow(1.0 - x, 1.6)*fuerza; float diam = 0.5 + 0.5*sin(x*38.0 - t*60.0);   /* diamantes de choque */
      vec3 c = mix(vec3(1.0, 0.45, 0.15), vec3(0.55, 0.75, 1.0), smoothstep(0.55, 0.0, x)) * (1.4 + diam*0.9*step(0.1, x)*(1.0 - x));
      gl_FragColor = vec4(c*a*2.2, 1.0); }`});
function llama(r, L){ const g = new THREE.CylinderGeometry(r*0.25, r, L, 14, 1, true).rotateX(Math.PI/2).translate(0, 0, L/2); return new THREE.Mesh(g, MAT_LLAMA); }

/* ====================== aviones ====================== */
let idAv = 0;
function crearAvion(def, equipo, pos, rumbo, o){
  const M = mallaAvion(def), g = new THREE.Group(); g.add(M.g); escena.add(g);
  const q = new THREE.Quaternion().setFromAxisAngle(_EJEY, rumbo||0);
  const a = Object.assign({id:idAv++, def, equipo, g, M, pos:pos.clone(), q, v:def.vmax*0.6, vel:V3(0,0,-1).applyQuaternion(q).multiplyScalar(def.vmax*0.6), caida:0,
    acel:0.7, turbo:0, freno:0, hp:def.hp, hpMax:def.hp, vivo:true, cayendo:false, misiles:def.misiles, misMax:def.misiles, recargaT:0, bengalas:def.bengalas, calor:0, cadT:0, misT:0, benT:0, gF:1, pr:0, rr:0,
    ctrl:{cabeceo:0, alabeo:0, guinada:0, acel:0.7, turbo:0, freno:0, fuego:false, misil:false, bengala:false}, fijado:null, fijoT:0, humo:0, llamas:[], cintas:[], pierna:0, ultGolpe:-9}, o||{});
  for(const t of M.toberas){ const f = llama(def.largo*0.034, def.largo*0.35); f.position.copy(t); g.add(f); a.llamas.push(f); }
  a.cintas = M.puntas.map(()=> cinta(34));
  return a;
}
function soltarAvion(a){ escena.remove(a.g); for(const c of a.cintas){ escena.remove(c.m); c.geo.dispose(); } }
const adelante = a=> _t1.set(0,0,-1).applyQuaternion(a.q), arribaDe = a=> V3(0,1,0).applyQuaternion(a.q), derechaDe = a=> V3(1,0,0).applyQuaternion(a.q);
/* vuelo: velocidades de giro limitadas por la G, empuje contra arrastre, la gravedad a lo largo de la trayectoria y pérdida por debajo de la mínima */
function volar(a, dt){
  const d = a.def, c = a.ctrl;
  a.acel = lerp(a.acel, c.acel, dt*1.5); a.turbo = lerp(a.turbo, c.turbo ? 1 : 0, dt*(c.turbo ? 2.5 : 3.5)); a.freno = lerp(a.freno, c.freno ? 1 : 0, dt*4);
  const F = V3(0,0,-1).applyQuaternion(a.q), v = a.v;
  const eff = lim((v - d.vmin*0.7)/(d.vmin*1.6), 0.18, 1);
  const gLim = d.gmax*GRAV/Math.max(v, 40);
  let pr = c.cabeceo*d.giro*eff*(1 - a.freno*0.1); pr = lim(pr, -gLim*0.45, gLim);
  const rr = c.alabeo*d.alabeo*(0.35 + 0.65*eff), yr = c.guinada*d.guinada*eff;
  a.pr = lerp(a.pr, pr, dt*7); a.rr = lerp(a.rr, rr, dt*9);
  _q1.setFromAxisAngle(_EJEX, a.pr*dt); a.q.multiply(_q1); _q1.setFromAxisAngle(_EJEZ, -a.rr*dt); a.q.multiply(_q1); _q1.setFromAxisAngle(_EJEY, -yr*dt); a.q.multiply(_q1);
  /* pérdida: la nariz se cae */
  const lift = lim(Math.pow(v/(d.vmin*1.25), 2), 0, 1);
  if(v < d.vmin){ const k = 1 - v/d.vmin; _q1.setFromAxisAngle(_EJEX, -0.6*k*dt*(F.y > -0.7 ? 1 : 0)); a.q.multiply(_q1); }
  a.q.normalize();
  const F2 = V3(0,0,-1).applyQuaternion(a.q);
  a.gF = 1 + v*Math.abs(a.pr)/GRAV;
  const kd = d.empuje/Math.pow(d.vmax*0.82, 2);
  const empuje = d.empuje*(0.22 + 0.78*a.acel) + a.turbo*d.empuje*0.62;
  const arrastre = kd*v*v*(1 + a.freno*2.2) + 1.35*Math.max(0, a.gF - 1);
  a.v = lim(v + (empuje - arrastre - GRAV*F2.y*0.9)*dt, 20, d.vmax*1.12);
  a.caida = lift < 1 ? a.caida - GRAV*(1 - lift)*dt : a.caida*Math.pow(0.2, dt);
  a.vel.copy(F2).multiplyScalar(a.v); a.vel.y += a.caida;
  a.pos.addScaledVector(a.vel, dt);
  a.g.position.copy(a.pos); a.g.quaternion.copy(a.q);
}
/* ====================== armas ====================== */
const BALAS = [], MISILES = [], BENGALAS = [];
function mundoDe(a, p){ return p.clone().applyQuaternion(a.q).add(a.pos); }
function dispararCanon(a, dt){
  a.cadT -= dt; a.calor = Math.max(0, a.calor - dt*(a.ctrl.fuego ? 0.05 : 0.45));
  /* sin gatillo el contador no se sigue adeudando: si no, al apretar salían de golpe todas las balas acumuladas */
  if(!a.ctrl.fuego || a.calor >= 1 || !a.vivo){ a.disparando = false; a.cadT = Math.max(a.cadT, 0); return; }
  a.disparando = true;
  while(a.cadT <= 0){ a.cadT += a.def.cad; a.calor += a.def.cad*0.2;
    let F = V3(0,0,-1).applyQuaternion(a.q); const dis = (a.jug ? 0.0022 : 0.009 + (1 - (a.ia ? a.ia.pericia : 1))*0.012);
    /* ayuda de puntería del jugador (como en los juegos de celular): cerca del blanco fijado, la ráfaga se corre sola al punto de adelanto */
    if(a.jug && a.fijado && a.fijado.vivo){ const B = a.fijado, rel = _t1.subVectors(B.pos, a.pos), L = rel.length(); if(L < 1300){
      const pl = B.pos.clone().addScaledVector(B.vel || V3(0,0,0), L/1050).sub(a.pos).normalize(), ang = F.angleTo(pl); if(ang < 0.1) F = F.lerp(pl, 0.85).normalize(); } }
    const d = F.clone().add(V3(vr(-dis, dis), vr(-dis, dis), vr(-dis, dis))).normalize();
    const o = mundoDe(a, a.M.canon); BALAS.push({p:o, v:d.multiplyScalar(1050).add(a.vel), vida:1.4, de:a, n:(a.nBal = (a.nBal||0) + 1)}); }
}
function pasarBalas(dt){
  let nT = 0; const T = TRAZOS;
  for(let i=BALAS.length-1;i>=0;i--){ const b = BALAS[i]; b.vida -= dt; const a0 = b.p.clone(); b.p.addScaledVector(b.v, dt); b.v.y -= GRAV*dt;
    let pego = false;
    for(const x of AVIONES_VIVOS()){ if(x === b.de || x.equipo === b.de.equipo) continue; const r = x.def.largo*(x.def.escala||1)*0.42;
      if(_t1.subVectors(x.pos, a0).lengthSq() > (b.v.length()*dt + r + 20)**2) continue;
      if(segmentoEsfera(a0, b.p, x.pos, r)){ danar(x, b.de.def.dmg, b.de, b.p); pego = true; break; } }
    if(!pego) for(const s of BLANCOS_SUP) if(s.vivo && segmentoEsfera(a0, b.p, s.pos, s.radio)){ danarSup(s, b.de.def.dmg*0.8, b.de, b.p); pego = true; break; }
    const h = alturaTerreno(b.p.x, b.p.z);
    if(!pego && b.p.y < Math.max(0, h)){ pego = true; if(h <= 0 && Math.random() < 0.3) salpicon(b.p, 0.25); else if(h > 0 && Math.random() < 0.25) HUMO.emitir(b.p, V3(0, 4, 0), 1.2, 3, 9, [0.55,0.5,0.42], 0.6); }
    if(pego || b.vida <= 0){ BALAS.splice(i, 1); continue; }
    if(b.n % 2 === 0 && nT < T.max){ const col = b.de.equipo === 'azul' ? [1.0, 0.85, 0.45] : [1.0, 0.4, 0.25], t2 = b.p.clone().addScaledVector(b.v, -0.018);
      T.p.set([b.p.x, b.p.y, b.p.z, t2.x, t2.y, t2.z], nT*6); T.c.set([col[0]*3, col[1]*3, col[2]*3, 0, 0, 0], nT*6); nT++; } }
  T.geo.setDrawRange(0, nT*2); T.geo.attributes.position.needsUpdate = true; T.geo.attributes.color.needsUpdate = true;
}
function segmentoEsfera(a, b, c, r){ const ab = _t2.subVectors(b, a), ac = _t3.subVectors(c, a), L2 = ab.lengthSq(); const t = L2 > 0 ? lim(ac.dot(ab)/L2, 0, 1) : 0;
  const px = a.x + ab.x*t - c.x, py = a.y + ab.y*t - c.y, pz = a.z + ab.z*t - c.z; return px*px + py*py + pz*pz < r*r; }
/* misiles: guía por navegación proporcional con giro limitado; espoleta de proximidad */
function lanzarMisil(a, blanco){
  if(a.misiles <= 0 || a.misT > 0 || !a.vivo) return false; a.misiles--; a.misT = 0.7;
  const R = a.M.rieles && a.M.rieles.length ? a.M.rieles[a.misiles % a.M.rieles.length] : V3((a.misiles % 2 ? 1 : -1)*a.def.largo*0.2, -0.9, 0);
  const p = mundoDe(a, R), F = V3(0,0,-1).applyQuaternion(a.q);
  const m = {p, v:a.vel.clone().add(V3(0,-8,0).applyQuaternion(a.q)), dir:F.clone(), vel:a.v, blanco, de:a, vida:7.5, t:0, g:mallaMisil(), estela:0, busca:(a.jug ? (a.def.buscador||1) : 0.85 + (a.ia ? a.ia.pericia*0.25 : 0))};
  escena.add(m.g); MISILES.push(m); sfx('misil', a.jug ? 1 : lim(1.3 - distCam(a.pos)/3000, 0.1, 0.8)); if(a.jug) voz('fox');
  if(blanco && blanco.jug){ J.alarmaMisil = 3; voz('misil', true); }
  return true;
}
let MALLA_MISIL = null;
function mallaMisil(){ const M = MODELOS.misil;
  if(M){ const b = M.caja, k = 3.4/(b.max.z - b.min.z), m = new THREE.Mesh(M.geo, M.mat), g = new THREE.Group(); m.scale.setScalar(k); m.position.copy(b.getCenter(V3(0,0,0))).multiplyScalar(-k); g.add(m); return g; }
  if(!MALLA_MISIL){ const g = new THREE.Group(), mb = parcheNiebla(new THREE.MeshStandardMaterial({color:lin('#e8eaec'), roughness:0.4, metalness:0.2})), c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 8).rotateX(Math.PI/2), mb); g.add(c);
    const n = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8).rotateX(-Math.PI/2), mb); n.position.z = -1.7; g.add(n);
    for(let k=0;k<4;k++){ const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.4), mb); f.position.set(0, 0, 1.3); f.rotation.z = k*Math.PI/2; f.translateY(0.15); g.add(f); } MALLA_MISIL = g; }
  return MALLA_MISIL.clone(); }
function pasarMisiles(dt){
  for(let i=MISILES.length-1;i>=0;i--){ const m = MISILES[i]; m.t += dt; m.vida -= dt;
    m.vel = Math.min(780, m.vel + (m.t < 2.5 ? 260 : -30)*dt);
    let B = m.blanco;
    /* las bengalas: si el blanco las tiró hace poco y hay una en el cono, puede irse detrás de ella */
    if(B && B.vivo !== undefined && B.benT > 0 && !m.engañado){ const nuevas = BENGALAS.filter(f=> f.de === B && !f.probado.has(m));
      /* una sola tirada por salva: si cada bengala tiraba su dado, seis juntas engañaban al 96 % ; las del jugador sirven más que las del enemigo */
      if(nuevas.length){ nuevas.forEach(f=> f.probado.add(m)); if(Math.random() < (B.jug ? 0.78 : 0.42)/m.busca){ m.blanco = B = nuevas[Math.floor(Math.random()*nuevas.length)]; m.engañado = true; } } }
    if(B && (B.vivo === false || B.muerta)) B = m.blanco = null;
    if(B){ const bp = B.pos, bv = B.vel || V3(0,0,0), rel = _t1.subVectors(bp, m.p), dist = rel.length(), tgo = dist/Math.max(200, m.vel), punto = _t2.copy(bp).addScaledVector(bv, tgo*0.9);
      const quiero = _t3.subVectors(punto, m.p).normalize(), ang = m.dir.angleTo(quiero);
      if(ang > 1.1){ m.blanco = null; }   /* se le fue del cono del buscador */
      else { const giro = Math.min(1, (m.t < 0.35 ? 0 : 2.6*m.busca)*dt/Math.max(ang, 1e-4)); m.dir.lerp(quiero, giro).normalize(); }
      /* espoleta de proximidad: la distancia mínima DENTRO del cuadro (a 1000 m/s de acercamiento se hacen 17 m por cuadro y saltaba el radio) */
      const vrx = bv.x - m.dir.x*m.vel, vry = bv.y - m.dir.y*m.vel, vrz = bv.z - m.dir.z*m.vel, vv = vrx*vrx + vry*vry + vrz*vrz;
      const tc = vv > 1 ? lim(-(rel.x*vrx + rel.y*vry + rel.z*vrz)/vv, 0, dt) : 0, dmin = Math.hypot(rel.x + vrx*tc, rel.y + vry*tc, rel.z + vrz*tc);
      if(dmin < 18 + (B.def ? B.def.largo*0.3 : B.radio ? B.radio*0.4 : 0)){ m.p.addScaledVector(m.dir, m.vel*tc); explotarMisil(m, i, B); continue; } }
    m.p.addScaledVector(m.dir, m.vel*dt); m.p.y -= (m.t < 0.4 ? 6 : 0)*dt;
    m.g.position.copy(m.p); m.g.lookAt(_t1.copy(m.p).sub(m.dir));
    /* estela: humo blanco que se abre y queda */
    m.estela -= dt; if(m.estela <= 0 && m.t > 0.12){ m.estela = 0.022; const cola = m.p.clone().addScaledVector(m.dir, -1.8);
      HUMO.emitir(cola, V3(vr(-1,1), vr(-1,1), vr(-1,1)), 5.5, 1.2, 9, [0.92,0.93,0.95], 0.7); FUEGO.emitir(cola, null, 0.06, 1.6, 0.8, [1.0, 0.7, 0.35], 1); }
    const h = alturaTerreno(m.p.x, m.p.z); if(m.p.y < Math.max(0, h) || m.vida <= 0){ explotarMisil(m, i, null); continue; } }
}
function explotarMisil(m, i, B){
  escena.remove(m.g); MISILES.splice(i, 1); explosion(m.p, 0.8);
  for(const x of AVIONES_VIVOS()){ if(x.equipo === m.de.equipo && x !== B) continue; const d = x.pos.distanceTo(m.p); if(d < 34) danar(x, (m.de.jug ? 130 : 60)*(1 - 0.6*d/34), m.de, m.p, true); }
  for(const s of BLANCOS_SUP) if(s.vivo && s.pos.distanceTo(m.p) < s.radio + 20) danarSup(s, m.de.jug ? 140 : 60, m.de, m.p);
}
function tirarBengalas(a){ if(a.bengalas <= 0 || a.benT > 0 || !a.vivo) return; a.bengalas--; a.benT = 3.2; sfx('bengala', a.jug ? 1 : 0.3);
  for(let k=0;k<6;k++){ const v = a.vel.clone().multiplyScalar(0.55).add(V3(vr(-30,30), vr(-50,-10), vr(-30,30)).applyQuaternion(a.q));
    BENGALAS.push({pos:mundoDe(a, V3(0, -1, a.def.largo*0.3)), vel:v, vida:3.2, de:a, probado:new Set()}); }
  if(a.jug) voz('bengalas');
}
function pasarBengalas(dt){ for(let i=BENGALAS.length-1;i>=0;i--){ const f = BENGALAS[i]; f.vida -= dt; f.vel.multiplyScalar(1 - 1.2*dt); f.vel.y -= 9*dt; f.pos.addScaledVector(f.vel, dt);
    FUEGO.emitir(f.pos, null, 0.18, 5, 2, [1.0, 0.85, 0.55], 1); if(Math.random() < 0.5) HUMO.emitir(f.pos, V3(0, 2, 0), 3, 1.5, 7, [0.9,0.9,0.92], 0.35);
    if(f.vida <= 0){ f.muerta = true; BENGALAS.splice(i, 1); } } }
/* ====================== daño, caída y explosiones ====================== */
function danar(x, d, de, p, esMisil){
  if(!x.vivo) return; if(x.jug && (J.dios || J.demo)) d = 0;
  x.hp -= d; x.ultGolpe = J.tt; if(!esMisil && Math.random() < 0.35) FUEGO.emitir(p, null, 0.08, 1.5, 0.5, [1,0.8,0.5], 1);
  if(de && de.jug){ J.marca = 0.22; J.stats.aciertos++; if(!esMisil && Math.random() < 0.3) sfx('impacto', 0.35); }
  if(x.jug){ J.golpe = Math.min(1, J.golpe + d/40); sfx('impacto', 0.8); J.sacudon = Math.min(1.2, J.sacudon + d/30); }
  if(x.hp <= 0) derribar(x, de);
}
function derribar(x, de){
  x.vivo = false; x.cayendo = true; x.giroCaida = vr(-2.5, 2.5); explosion(x.pos, 1.3); x.hp = 0;
  if(de && de.jug){ J.stats.bajas++; const pts = x.def.jefe ? 1500 : x.def.bombardero ? 300 : 200; J.stats.puntos += pts; texto('+' + pts + ' ' + T('DERRIBADO'), '#6dffa8'); voz('abatido'); J.killfeed.unshift({t:3, txt:x.def.nom}); }
  if(x.equipo === 'azul' && !x.jug){ voz('caido'); }
  if(x.jug) terminar(false, 'TE DERRIBARON');
}
function pasarCaida(x, dt){
  _q1.setFromAxisAngle(_EJEZ, x.giroCaida*dt); x.q.multiply(_q1); _q1.setFromAxisAngle(_EJEX, -0.35*dt); x.q.multiply(_q1);
  x.vel.y -= GRAV*dt; x.vel.multiplyScalar(1 - 0.05*dt); x.pos.addScaledVector(x.vel, dt); x.g.position.copy(x.pos); x.g.quaternion.copy(x.q);
  FUEGO.emitir(x.pos, V3(vr(-5,5), vr(-5,5), vr(-5,5)), 0.35, 5, 9, [1.0, 0.55, 0.2], 1); HUMO.emitir(x.pos, V3(vr(-3,3), 4, vr(-3,3)), 7, 6, 28, [0.12,0.12,0.13], 0.8);
  if(x.pos.y < Math.max(0, alturaTerreno(x.pos.x, x.pos.z))){ x.cayendo = false; x.muerto = true; explosion(x.pos, 1.6); if(x.pos.y < 2) salpicon(x.pos, 1.5); escena.remove(x.g); for(const c of x.cintas) c.m.visible = false; }
}
function explosion(p, k){
  const cp = cam.position, d = cp.distanceTo(p);
  sfx('boom', lim(1.4 - d/2500, 0.08, 1)*k, 0);
  for(let i=0;i<Math.round(24*k);i++) FUEGO.emitir(p, V3(vr(-1,1), vr(-1,1), vr(-1,1)).normalize().multiplyScalar(vr(10, 45)*k), vr(0.4, 1.0), 4*k, vr(14, 26)*k, i%3 ? [1.0,0.55,0.18] : [1.0,0.9,0.6], 1);
  for(let i=0;i<Math.round(18*k);i++) HUMO.emitir(p, V3(vr(-1,1), vr(-0.5,1), vr(-1,1)).normalize().multiplyScalar(vr(6, 22)*k), vr(3, 6), 8*k, vr(26, 46)*k, [0.16,0.15,0.15], 0.85, 2);
  for(let i=0;i<Math.round(10*k);i++) FUEGO.emitir(p, V3(vr(-1,1), vr(-0.2,1), vr(-1,1)).normalize().multiplyScalar(vr(60, 140)), vr(0.8, 1.6), 1.6, 0.6, [1,0.75,0.4], 1);
  FLASH.p.copy(p); FLASH.t = 0.25*k; J.sacudon = Math.min(1.5, J.sacudon + lim(1.2 - d/1200, 0, 1)*k);
}
function salpicon(p, k){ for(let i=0;i<Math.round(14*k);i++) HUMO.emitir(V3(p.x, 0.5, p.z), V3(vr(-4,4)*k, vr(12, 34)*k, vr(-4,4)*k), vr(1.5, 3), 3*k, 14*k, [0.95,0.97,1.0], 0.9, -14); }
const FLASH = {luz:new THREE.PointLight(0xffb070, 0, 900, 1.6), p:V3(0,0,0), t:0}; escena.add(FLASH.luz);
function pasarFlash(dt){ FLASH.t = Math.max(0, FLASH.t - dt); FLASH.luz.position.copy(FLASH.p); FLASH.luz.intensity = FLASH.t*40; }
const distCam = p=> cam.position.distanceTo(p);

/* ====================== blancos de superficie: portaaviones y destructores ====================== */
const BLANCOS_SUP = [];
function crearBarco(tipo, pos, rumbo, equipo){
  const id = tipo === 'porta' ? 'portaaviones' : 'destructor', M = MODELOS[id], largo = tipo === 'porta' ? 300 : 150, g = new THREE.Group();
  if(M){ const b = M.caja, k = largo/(b.max.z - b.min.z), m = new THREE.Mesh(M.geo, M.mat); m.scale.setScalar(k); const c = b.getCenter(V3(0,0,0)); m.position.set(-c.x*k, tipo === 'porta' ? -2.5 : -7.5, -c.z*k);   /* la franja roja del casco va bajo el agua: en el destructor llega a 11 m sobre la quilla */ g.add(m); }
  else { const mc = parcheNiebla(new THREE.MeshStandardMaterial({color:lin(tipo === 'porta' ? '#6f757c' : '#5f666e'), roughness:0.7, metalness:0.3}));
    const casco = new THREE.Mesh(new THREE.BoxGeometry(largo*0.16, 14, largo), mc); casco.position.y = 3; g.add(casco);
    const isla = new THREE.Mesh(new THREE.BoxGeometry(8, 22, 26), mc); isla.position.set(largo*0.06, 18, largo*0.05); g.add(isla);
    if(tipo === 'porta'){ const cub = new THREE.Mesh(new THREE.BoxGeometry(largo*0.26, 1, largo*1.02), parcheNiebla(new THREE.MeshStandardMaterial({color:lin('#3a3e44'), roughness:0.85}))); cub.position.y = 10.5; g.add(cub); }
    else for(const z of [-40, 40]){ const tr = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 4, 10), mc); tr.position.set(0, 12, z); g.add(tr); } }
  g.position.copy(pos); g.rotation.y = rumbo||0; escena.add(g); MUNDO.objs.push(g);
  const s = {tipo, g, pos:V3(pos.x, 10, pos.z), radio:tipo === 'porta' ? 140 : 70, hp:tipo === 'porta' ? 1400 : 420, hpMax:tipo === 'porta' ? 1400 : 420, vivo:true, equipo, flakT:rf(0.5, 2), estela:0};
  BLANCOS_SUP.push(s); return s;
}
function danarSup(s, d, de, p){ if(!s.vivo || (de && de.equipo === s.equipo)) return; s.hp -= d; if(de && de.jug) J.marca = 0.22;
  if(s.hp <= 0){ s.vivo = false; explosion(s.pos.clone().add(V3(0, 12, 0)), 2.2); if(de && de.jug){ J.stats.puntos += 600; texto('+600 ' + T('HUNDIDO'), '#6dffa8'); voz('abatido'); } } }
function pasarBarcos(dt){
  const j = J.jug;
  for(const s of BLANCOS_SUP){ s.g.position.y = Math.sin(J.tt*0.4 + s.pos.x)*0.4;
    if(!s.vivo){ s.g.position.y -= 0.8*dt*60*0.02; if(Math.random() < 0.4) HUMO.emitir(s.pos.clone().add(V3(vr(-20,20), 16, vr(-40,40))), V3(0, 9, 0), 9, 16, 60, [0.1,0.1,0.11], 0.8); continue; }
    s.estela -= dt; if(s.estela <= 0){ s.estela = 0.3; }
    if(s.hp < s.hpMax*0.5 && Math.random() < 0.3) HUMO.emitir(s.pos.clone().add(V3(vr(-10,10), 14, vr(-30,30))), V3(0, 7, 0), 6, 10, 38, [0.2,0.2,0.2], 0.6);
    /* artillería antiaérea de los destructores enemigos: estalla cerca, y volando bajo casi no te encuentra */
    if(s.equipo === 'rojo' && j && j.vivo){ const d = j.pos.distanceTo(s.pos); s.flakT -= dt;
      if(d < 4200 && s.flakT <= 0){ s.flakT = rf(0.35, 0.8); const bajo = j.pos.y < 180 ? 0.15 : 1, err = (40 + d*0.03)/bajo;
        const p = j.pos.clone().addScaledVector(j.vel, rf(0.3, 1.2)).add(V3(vr(-err, err), vr(-err*0.6, err*0.6), vr(-err, err)));
        HUMO.emitir(p, null, 2.5, 6, 20, [0.08,0.08,0.08], 0.95); FUEGO.emitir(p, null, 0.12, 8, 3, [1,0.7,0.4], 1); sfx('boom', lim(0.6 - p.distanceTo(cam.position)/2500, 0.05, 0.4), 0, 1.8);
        const dd = p.distanceTo(j.pos); if(dd < 32) danar(j, (32 - dd)*0.5, null, p); } } }
}
function AVIONES_VIVOS(){ return J.aviones.filter(a=> a.vivo); }
