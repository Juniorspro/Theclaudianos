
/* ====================== render ======================
   Profundidad logarítmica: se ve de 1 m a 40 km sin que el mar y las islas se peleen a lo lejos. */
const cv3 = $('lienzo3d'), cvH = $('hud'), cvM = $('mg');
const ren = new THREE.WebGLRenderer({canvas:cv3, antialias:false, powerPreference:'high-performance', logarithmicDepthBuffer:true});
ren.outputEncoding = THREE.sRGBEncoding; ren.physicallyCorrectLights = false;
const escena = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, 2, 0.8, 42000); escena.add(cam);
let ANCHO = 892, ALTO = 412, R = 1, CALIDAD = (matchMedia && matchMedia('(pointer: coarse)').matches) ? 0.8 : 1, RH = 1;
function medir(){
  const w = cv3.clientWidth, h = cv3.clientHeight; if(!w || !h) return; ANCHO = w; ALTO = h;
  R = Math.min(window.devicePixelRatio||1, 1.5)*CALIDAD; RH = Math.max(1, Math.min(window.devicePixelRatio||1, 2)*Math.min(1, CALIDAD*1.25 - 0.1));
  ren.setPixelRatio(R); ren.setSize(w, h, false);
  for(const c of [cvH, cvM]){ c.width = Math.round(w*RH); c.height = Math.round(h*RH); }
  cam.aspect = w/h; cam.updateProjectionMatrix();
}
window.addEventListener('resize', medir); if(window.ResizeObserver) new ResizeObserver(medir).observe(cv3);
/* calidad automática por el intervalo real entre cuadros (cuenta los cuadros lentos: en un aparato lento es cuando más hace falta) */
const COSTO = {n:0, s:0, ult:0, desde:0};
const CALIDAD_FIJA = {alta:1, media:0.7, baja:0.45};
function costoDeNuevo(){ COSTO.ult = 0; COSTO.n = 0; COSTO.s = 0; COSTO.desde = performance.now() + 1200; }
function fijarCalidad(c, aprendida){ CALIDAD = c; medir(); if(aprendida){ G.calAuto = +c.toFixed(2); guardar(); } }
function medirCosto(ts){
  if(ts < COSTO.desde){ COSTO.ult = ts; return; }
  if(COSTO.ult){ const d = ts - COSTO.ult; if(d < 1500){ COSTO.s += d; COSTO.n++; } } COSTO.ult = ts;
  const m = COSTO.n ? COSTO.s/COSTO.n : 0;
  if(COSTO.n >= 40 || (COSTO.n >= 8 && m > 45)){ COSTO.s = 0; COSTO.n = 0; if(G.graficos && G.graficos !== 'auto') return;
    if(m > 21 && CALIDAD > 0.4) fijarCalidad(Math.max(0.4, CALIDAD - (m > 60 ? 0.3 : m > 30 ? 0.2 : 0.1)), true);
    else if(m < 17.5 && CALIDAD < 1) fijarCalidad(Math.min(1, CALIDAD + 0.05), true); } }

/* ====================== luz y cielo ====================== */
const sol = new THREE.DirectionalLight(0xfff2dc, 2.6); escena.add(sol); escena.add(sol.target);
const hemi = new THREE.HemisphereLight(0xbfdcff, 0x1d3a52, 0.75); escena.add(hemi);
const SOLDIR = V3(0.3, 0.6, -0.7).normalize();
const CIELO = {cenit:new THREE.Color('#2f7fd6'), horiz:new THREE.Color('#bfe0f7'), bruma:new THREE.Color('#cfe6f6'), solCol:new THREE.Color('#fff2d6'), rot:0, tex:null, tormenta:0};
const lin = h=> new THREE.Color(h).convertSRGBToLinear();
/* cielo: el panorama generado (girado para que su sol coincida con la luz) o un degradé; siempre con el disco del sol y la bruma del horizonte */
const U_CIELO = {tCielo:{value:null}, usaTex:{value:0}, rot:{value:0}, cenit:{value:new THREE.Color()}, horiz:{value:new THREE.Color()}, bruma:{value:new THREE.Color()}, solDir:{value:SOLDIR}, solCol:{value:new THREE.Color()}, tormenta:{value:0}, relampago:{value:0}};
const GLSL_CIELO = `
  uniform sampler2D tCielo; uniform float usaTex, rot, tormenta, relampago; uniform vec3 cenit, horiz, bruma, solDir, solCol;
  vec3 colorCielo(vec3 d, float conSol){
    float y = d.y; vec3 c;
    if(usaTex > 0.5){ float u = atan(d.z, d.x)/6.2831853 + 0.5 + rot; float v = 0.5 - asin(clamp(y, -1.0, 1.0))/3.1415927;
      c = texture2D(tCielo, vec2(fract(u), clamp(v, 0.002, 0.5))).rgb; c = pow(c, vec3(2.2)); }
    else { c = mix(horiz, cenit, pow(clamp(y, 0.0, 1.0), 0.55)); }
    c = mix(c, bruma, (1.0 - smoothstep(-0.02, 0.18, y))*0.85);
    float s = max(dot(d, solDir), 0.0);
    c += solCol*(pow(s, 1400.0)*16.0*conSol + pow(s, 90.0)*0.22 + pow(s, 8.0)*0.07)*(1.0 - tormenta*0.8);
    c += vec3(0.8, 0.85, 1.0)*relampago;
    return c; }`;
const matCielo = new THREE.ShaderMaterial({uniforms:U_CIELO, side:THREE.BackSide, depthWrite:false, fog:false,
  vertexShader:`varying vec3 vD; #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vD = normalize(position); vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_Position = projectionMatrix*mv; gl_Position.z = gl_Position.w*0.9999;
    #include <logdepthbuf_vertex>
    }`.replace('#include <common>', '\n#include <common>\n'),
  fragmentShader:`varying vec3 vD;
    #include <logdepthbuf_pars_fragment>
    ${GLSL_CIELO}
    void main(){
    #include <logdepthbuf_fragment>
    gl_FragColor = vec4(colorCielo(normalize(vD), 1.0), 1.0); }`});
const cieloMalla = new THREE.Mesh(new THREE.SphereGeometry(30000, 48, 24), matCielo); cieloMalla.renderOrder = -10; cieloMalla.frustumCulled = false; escena.add(cieloMalla);
/* niebla del color de la bruma, teñida hacia el sol (perspectiva aérea) */
escena.fog = new THREE.Fog(0xcfe6f6, 900, 26000);
const NIEBLA_U = {fogSolVista:{value:V3(0,0,-1)}, fogColorSol:{value:new THREE.Color(1,0.9,0.75)}, fogSolK:{value:0.5}};
function parcheNiebla(m){
  if(m.userData.niebla) return m; m.userData.niebla = true;
  const previo = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r)=>{ if(previo) previo.call(m, sh, r); Object.assign(sh.uniforms, NIEBLA_U);
    sh.vertexShader = sh.vertexShader.replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>\n#ifdef USE_FOG\nvarying vec3 vNieblaP;\n#endif').replace('#include <fog_vertex>', '#include <fog_vertex>\n#ifdef USE_FOG\nvNieblaP = mvPosition.xyz;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\n#ifdef USE_FOG\nvarying vec3 vNieblaP; uniform vec3 fogSolVista; uniform vec3 fogColorSol; uniform float fogSolK;\n#endif')
      .replace('#include <fog_fragment>', `#ifdef USE_FOG
        float fogFactor = 1.0 - exp(-pow(max(fogDepth - fogNear, 0.0)/(fogFar - fogNear)*2.2, 1.6));
        float haciaSol = pow(max(dot(normalize(vNieblaP), fogSolVista), 0.0), 6.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(fogColor, fogColorSol, haciaSol*fogSolK), fogFactor);
      #endif`); };
  const k0 = m.customProgramCacheKey ? m.customProgramCacheKey.call(m) : ''; m.customProgramCacheKey = ()=> k0 + '|niebla2';
  return m;
}
/* entorno para los reflejos del metal: el mismo cielo, a un cubo, una vez por misión */
const pmrem = new THREE.PMREMGenerator(ren); let ENV = null;
function armarEntorno(){
  /* (fromScene en este camino daba basura; fromEquirectangular sobre un lienzo anda siempre) */
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const hex = col=> '#' + col.getHexString();
  if(CIELO.img){ const off = (((-U_CIELO.rot.value) % 1) + 1) % 1*W; g.drawImage(CIELO.img, -off, 0, W, H); g.drawImage(CIELO.img, W - off, 0, W, H); }
  else { const gr = g.createLinearGradient(0, 0, 0, H/2); gr.addColorStop(0, hex(CIELO.cenit)); gr.addColorStop(0.85, hex(CIELO.horiz)); gr.addColorStop(1, hex(CIELO.bruma)); g.fillStyle = gr; g.fillRect(0, 0, W, H/2);
    const u = Math.atan2(SOLDIR.z, SOLDIR.x)/TAU + 0.5, v = 0.5 - Math.asin(SOLDIR.y)/Math.PI, sg = g.createRadialGradient(u*W, v*H, 1, u*W, v*H, 40); sg.addColorStop(0, 'rgba(255,250,235,1)'); sg.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = sg; g.fillRect(0, 0, W, H/2); }
  const mar = g.createLinearGradient(0, H/2, 0, H); mar.addColorStop(0, hex(CIELO.bruma)); mar.addColorStop(0.08, '#1d4a66'); mar.addColorStop(1, '#06202e'); g.fillStyle = mar; g.fillRect(0, H/2, W, H/2);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
  const rt = pmrem.fromEquirectangular(t); t.dispose(); if(ENV) ENV.dispose(); ENV = rt; escena.environment = rt.texture;
}
function ponerCielo(id, solDef){
  const man = manDe('cielo', id); const t = TEMA_CIELO[id] || TEMA_CIELO.cielo_dia;
  CIELO.cenit.set(t.cenit); CIELO.horiz.set(t.horiz); CIELO.bruma.set(t.bruma); CIELO.solCol.set(t.sol); CIELO.tormenta = t.tormenta||0;
  let az = solDef[0], el = solDef[1];
  if(man){ if(man.cenit) CIELO.cenit.set(man.cenit); if(man.horizonte){ const hz = typeof man.horizonte === 'string' ? man.horizonte : (man.horizonte.color_opuesto || man.horizonte.color); if(hz) CIELO.horiz.set(hz); }
    if(man.bruma_opuesta) CIELO.bruma.set(man.bruma_opuesta); if(man.sol && man.sol.elev !== undefined){ el = man.sol.elev; } }
  el = lim(el, 4, 75);
  const a = az*Math.PI/180, e = el*Math.PI/180; SOLDIR.set(Math.sin(a)*Math.cos(e), Math.sin(e), -Math.cos(a)*Math.cos(e)).normalize();
  U_CIELO.cenit.value.copy(CIELO.cenit).convertSRGBToLinear(); U_CIELO.horiz.value.copy(CIELO.horiz).convertSRGBToLinear(); U_CIELO.bruma.value.copy(CIELO.bruma).convertSRGBToLinear();
  U_CIELO.solCol.value.copy(CIELO.solCol).convertSRGBToLinear(); U_CIELO.tormenta.value = CIELO.tormenta;
  /* el panorama se gira para que su sol pintado caiga donde está la luz */
  U_CIELO.usaTex.value = 0; CIELO.img = null;
  if(man && ARCH['cielo/' + id]){ const azP = man.sol && man.sol.az !== undefined ? man.sol.az : az;
    /* u = atan(z,x)/2π + 0,5 + rot: la dirección del sol del juego tiene que caer en la columna del sol del panorama */
    const uSol = Math.atan2(SOLDIR.z, SOLDIR.x)/TAU + 0.5; U_CIELO.rot.value = azP/360 - uSol;
    decImagen('cielo/' + id, false).then(im=>{ if(!im || J.cieloId !== id) return; if(CIELO.tex) CIELO.tex.dispose(); const tx = new THREE.Texture(im); tx.flipY = false; tx.encoding = THREE.LinearEncoding; tx.needsUpdate = true;
      tx.wrapS = THREE.RepeatWrapping; tx.generateMipmaps = false; tx.minFilter = THREE.LinearFilter; CIELO.tex = tx; CIELO.img = im; U_CIELO.tCielo.value = tx; U_CIELO.usaTex.value = 1; armarEntorno(); }); }
  J.cieloId = id;
  sol.color.copy(CIELO.solCol); sol.intensity = t.solI; hemi.color.copy(CIELO.cenit).lerp(new THREE.Color(1,1,1), 0.4); hemi.groundColor.set(t.suelo); hemi.intensity = t.hemiI;
  escena.fog.color.copy(CIELO.bruma); escena.fog.near = t.niebla[0]; escena.fog.far = t.niebla[1];
  NIEBLA_U.fogColorSol.value.copy(CIELO.solCol).lerp(CIELO.bruma, 0.35); NIEBLA_U.fogSolK.value = t.solK;
  Object.assign(POST.grado, t.grado); POST.solCol.set(...lin(t.sol).toArray());
  U_AGUA.profundo.value.copy(lin(t.mar)); U_AGUA.somero.value.copy(lin(t.somero)); U_AGUA.fogColor.value.copy(CIELO.bruma).convertSRGBToLinear(); U_AGUA.fogNear.value = t.niebla[0]; U_AGUA.fogFar.value = t.niebla[1];
  U_NUBE.fogNear.value = t.niebla[0]; U_NUBE.fogFar.value = t.niebla[1];
  armarEntorno();
}
const TEMA_CIELO = {
  cielo_dia:{cenit:'#2a78d8', horiz:'#b9dcf6', bruma:'#cde5f5', sol:'#fff3dc', solI:2.7, hemiI:0.8, suelo:'#24506a', niebla:[1500, 30000], solK:0.35, mar:'#0b3c63', somero:'#1fa3b8',
    grado:{lift:[0.0,0.004,0.012], gamma:[1,1,1], gain:[1.02,1.01,1.0], sat:1.08, contraste:1.06, frio:[0.95,0.99,1.06], calido:[1.05,1.0,0.94], viñeta:0.28, grano:0.02, expo:0.95}},
  cielo_tarde:{cenit:'#3d5f9e', horiz:'#f2b27a', bruma:'#f0c49a', sol:'#ffc285', solI:2.3, hemiI:0.6, suelo:'#3a3a4a', niebla:[1200, 26000], solK:0.75, mar:'#152f52', somero:'#2a8c9a',
    grado:{lift:[0.01,0.005,0.012], gamma:[1,1,1], gain:[1.06,1.0,0.93], sat:1.1, contraste:1.08, frio:[0.9,0.96,1.1], calido:[1.12,1.0,0.86], viñeta:0.34, grano:0.025, expo:0.95}},
  cielo_tormenta:{cenit:'#44505e', horiz:'#8e99a4', bruma:'#8f9aa5', sol:'#d8dde6', solI:1.2, hemiI:0.75, suelo:'#2a3036', niebla:[600, 14000], solK:0.15, mar:'#1a2a36', somero:'#3a6a70', tormenta:1,
    grado:{lift:[0.01,0.012,0.018], gamma:[1,1,1], gain:[0.98,1.0,1.02], sat:0.82, contraste:1.12, frio:[0.92,1.0,1.08], calido:[1.04,1.0,0.95], viñeta:0.42, grano:0.035, expo:1.05}},
};

/* ====================== mar ======================
   Un plano grande que sigue a la cámara (anclado a la grilla de las olas para que no «nade»). Olas con dos capas del mapa de
   normales, reflejo del mismo cielo con Fresnel, brillo del sol, color somero cerca de las islas y espuma en la costa. */
const U_AGUA = Object.assign({tNorm:{value:null}, tCosta:{value:null}, costaCaja:{value:new THREE.Vector4(-20000,-20000,40000,40000)}, tiempo:{value:0}, profundo:{value:new THREE.Color()}, somero:{value:new THREE.Color()},
  camPos:{value:V3(0,0,0)}, fogColor:{value:new THREE.Color()}, fogNear:{value:1000}, fogFar:{value:30000}, olasK:{value:1}}, U_CIELO);
const matAgua = new THREE.ShaderMaterial({uniforms:U_AGUA,
  vertexShader:`varying vec3 vP;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w;
    #include <logdepthbuf_vertex>
    }`,
  fragmentShader:`varying vec3 vP; uniform sampler2D tNorm, tCosta; uniform vec4 costaCaja; uniform float tiempo, olasK, fogNear, fogFar; uniform vec3 profundo, somero, camPos, fogColor;
    #include <logdepthbuf_pars_fragment>
    ${GLSL_CIELO}
    vec3 onda(vec2 p){ vec3 a = texture2D(tNorm, p*0.0061 + vec2(tiempo*0.011, tiempo*0.006)).xyz*2.0 - 1.0; vec3 b = texture2D(tNorm, p*0.0213 - vec2(tiempo*0.018, -tiempo*0.012)).xyz*2.0 - 1.0;
      vec3 c = texture2D(tNorm, p*0.0009 + vec2(tiempo*0.002, 0.0)).xyz*2.0 - 1.0; return normalize(vec3((a.xy + b.xy*0.6 + c.xy*0.8)*olasK, 1.0)); }
    void main(){
      #include <logdepthbuf_fragment>
      vec3 V = camPos - vP; float dist = length(V); V /= dist;
      vec3 nt = onda(vP.xz); float lejos = smoothstep(2000.0, 16000.0, dist); nt = normalize(mix(nt, vec3(0.0, 0.0, 1.0), lejos*0.75));
      vec3 N = normalize(vec3(nt.x, nt.z, nt.y));
      vec2 cu = (vP.xz - costaCaja.xy)/costaCaja.zw; vec2 cst = texture2D(tCosta, cu).rg; if(cu.x < 0.0 || cu.y < 0.0 || cu.x > 1.0 || cu.y > 1.0) cst = vec2(0.0); float costa = cst.r;
      float fres = 0.02 + 0.98*pow(1.0 - max(dot(N, V), 0.0), 5.0);
      vec3 Rf = reflect(-V, N); Rf.y = abs(Rf.y);
      vec3 refl = colorCielo(Rf, 0.0);
      vec3 cuerpo = mix(profundo, somero, smoothstep(0.15, 0.85, costa));
      cuerpo *= 0.55 + 0.45*max(solDir.y, 0.0);
      vec3 c = mix(cuerpo, refl, fres);
      vec3 H = normalize(solDir + V); float spec = pow(max(dot(N, H), 0.0), mix(900.0, 160.0, lejos));
      c += solCol*spec*(6.0 + 20.0*lejos)*(1.0 - tormenta*0.85);
      /* espuma en la rompiente */
      float olaR = texture2D(tNorm, vP.xz*0.013 + tiempo*0.02).r; float esp = smoothstep(0.35, 0.8, cst.g)*(0.55 + 0.45*sin(tiempo*1.3 + vP.x*0.02 + vP.z*0.017 + olaR*3.0))*smoothstep(0.3, 0.7, olaR + cst.g*0.4);
      c = mix(c, vec3(0.9, 0.95, 1.0), esp*0.6*(1.0 - lejos));
      float f = 1.0 - exp(-pow(max(dist - fogNear, 0.0)/(fogFar - fogNear)*2.2, 1.6));
      c = mix(c, fogColor, f);
      gl_FragColor = vec4(c, 1.0); }`});
const agua = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000, 1, 1).rotateX(-Math.PI/2), matAgua); agua.frustumCulled = false; agua.renderOrder = -5; escena.add(agua);
/* normales de olas de respaldo (senos de frecuencia entera: se repite sin costura) */
function texOlas(){ const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
  const OL = [[3,1,1,0.3],[1,4,0.8,1.7],[5,-2,0.5,2.3],[-4,6,0.35,0.9],[9,3,0.22,4.1],[-7,-9,0.16,5.2],[13,-5,0.12,1.1],[4,15,0.1,3.3],[21,8,0.06,0.4],[-17,19,0.05,2.8]], h = new Float32Array(N*N);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ let v = 0; for(const [kx, ky, a, f] of OL) v += a*Math.sin(2*Math.PI*(kx*x + ky*y)/N + f); h[y*N + x] = v; }
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const dx = h[y*N + (x+1)%N] - h[y*N + (x+N-1)%N], dy = h[((y+1)%N)*N + x] - h[((y+N-1)%N)*N + x];
    let nx = -dx*3, ny = -dy*3, nz = 1; const l = Math.hypot(nx, ny, nz); const o = (y*N + x)*4; d[o] = (nx/l*0.5 + 0.5)*255; d[o+1] = (ny/l*0.5 + 0.5)*255; d[o+2] = (nz/l*0.5 + 0.5)*255; d[o+3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
U_AGUA.tNorm.value = texOlas();
function aguaNormalGenerada(){ if(!ARCH['tex/agua_normal/normal'] && !ARCH['tex/agua_normal/albedo']) return; const id = ARCH['tex/agua_normal/normal'] ? 'tex/agua_normal/normal' : 'tex/agua_normal/albedo';
  decImagen(id, false).then(im=>{ if(!im) return; const t = new THREE.Texture(im); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.flipY = false; t.needsUpdate = true; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = Math.min(8, ren.capabilities.getMaxAnisotropy()); U_AGUA.tNorm.value = t; }); }

/* ====================== islas ======================
   Cada isla es una función de altura (la misma para la malla, el choque y la IA): meseta radial con ruido fractal, crestas y playa.
   Los materiales se mezclan por pesos por vértice (arena, pasto, selva, roca, nieve) con las texturas generadas en metros del mundo. */
const ISLAS = [];
function ruido2(seed){ const P = new Uint8Array(512), r = mulberry(seed); for(let i=0;i<256;i++) P[i] = i; for(let i=255;i>0;i--){ const j = Math.floor(r()*(i+1)); const t = P[i]; P[i] = P[j]; P[j] = t; } for(let i=0;i<256;i++) P[i+256] = P[i];
  const G2 = new Float32Array(512); for(let i=0;i<512;i++) G2[i] = r()*2 - 1;
  return (x, y)=>{ const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf*xf*(3 - 2*xf), v = yf*yf*(3 - 2*yf);
    const a = G2[P[(xi & 255) + P[yi & 255]]], b = G2[P[((xi+1) & 255) + P[yi & 255]]], c = G2[P[(xi & 255) + P[(yi+1) & 255]]], d = G2[P[((xi+1) & 255) + P[(yi+1) & 255]]];
    return a + (b - a)*u + (c - a)*v + (a - b - c + d)*u*v; }; }
let RUIDO = ruido2(7);
function fbm(x, y, o){ let s = 0, a = 0.5, f = 1; for(let i=0;i<o;i++){ s += RUIDO(x*f, y*f)*a; f *= 2.03; a *= 0.5; } return s; }
function alturaIsla(I, x, z){
  const dx = (x - I.x)/I.r, dz = (z - I.z)/I.r, dx2 = dx*I.ca - dz*I.sa, dz2 = (dx*I.sa + dz*I.ca)*I.alarg, d = Math.hypot(dx2, dz2);
  if(d > 1.25) return -60;
  const borde = fbm(x*0.0009 + I.sx, z*0.0009 + I.sz, 3)*0.35, base = 1 - d + borde;
  if(base <= -0.1) return -60;
  const cresta = 1 - Math.abs(fbm(x*0.0016 + I.sz, z*0.0016 + I.sx, 4))*1.8;
  const m = Math.max(0, base); let h = I.h*Math.pow(m, I.forma)*(0.55 + 0.45*cresta) + fbm(x*0.006, z*0.006, 3)*I.h*0.06*m;
  if(base < 0) return -6 - 54*Math.min(1, -base*10);        /* talud bajo el agua */
  return h + 14*smoothDiente(base) - 6;                      /* playa: rampa suave cerca del borde */
}
function smoothDiente(b){ return lim(b*12, 0, 1); }
function alturaTerreno(x, z){ let h = -60; for(const I of ISLAS){ if(Math.abs(x - I.x) > I.r*1.4 || Math.abs(z - I.z) > I.r*1.4) continue; h = Math.max(h, alturaIsla(I, x, z)); } return h; }
const TEX_ISLA = ['arena_playa','pasto_isla','selva','roca_montana','nieve_cumbre'];
const COL_ISLA = ['#d9c79a','#5f8a3a','#2f5a28','#7a7468','#f2f4f6'];
let MAT_ISLA = null;
function matIsla(){
  if(MAT_ISLA) return MAT_ISLA;
  const m = new THREE.MeshStandardMaterial({vertexColors:true, roughness:0.92, metalness:0, envMapIntensity:0.35});
  const texs = TEX_ISLA.map(id=> ARCH['tex/' + id + '/albedo'] ? texAsset('tex/' + id + '/albedo', {srgb:true, color:COL_ISLA[TEX_ISLA.indexOf(id)]}) : null);
  const metros = TEX_ISLA.map(id=>{ const mm = manDe('tex', id); return (mm && mm.metros) || (id==='selva' ? 60 : 40); });
  const hay = texs.every(Boolean);
  m.onBeforeCompile = sh=>{
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 peso; attribute float pesoN; varying vec4 vPeso; varying float vPesoN; varying vec3 vMundo;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPeso = peso; vPesoN = pesoN; vMundo = (modelMatrix*vec4(position, 1.0)).xyz;');
    if(!hay) return;
    TEX_ISLA.forEach((id, i)=>{ sh.uniforms['tI' + i] = {value:texs[i]}; sh.uniforms['mI' + i] = {value:1/metros[i]}; });
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vPeso; varying float vPesoN; varying vec3 vMundo; uniform sampler2D tI0, tI1, tI2, tI3, tI4; uniform float mI0, mI1, mI2, mI3, mI4;\n' +
      'vec3 mues(sampler2D t, float k){ vec2 p = vMundo.xz*k; return mix(texture2D(t, p).rgb, texture2D(t, p*0.137 + 0.31).rgb, 0.45); }')
      .replace('#include <color_fragment>', `vec3 mez = mues(tI0, mI0)*vPeso.x + mues(tI1, mI1)*vPeso.y + mues(tI2, mI2)*vPeso.z + mues(tI3, mI3)*vPeso.w + mues(tI4, mI4)*vPesoN;
        mez = max(mix(vec3(dot(mez, vec3(0.3, 0.59, 0.11))), mez, 1.3), 0.0);
        diffuseColor.rgb *= mez*vColor;`);
  };
  m.customProgramCacheKey = ()=> 'isla' + (hay ? 1 : 0); m.userData.propio = true;
  return MAT_ISLA = parcheNiebla(m);
}
function armarIsla(I){
  const N = I.r > 1800 ? 150 : 110, L = I.r*2.7, geo = new THREE.PlaneGeometry(L, L, N, N).rotateX(-Math.PI/2), P = geo.attributes.position, n = P.count;
  const peso = new Float32Array(n*4), pesoN = new Float32Array(n), col = new Float32Array(n*3);
  const cs = COL_ISLA.map(h=> lin(h)), conTex = TEX_ISLA.every(id=> ARCH['tex/' + id + '/albedo']);
  for(let i=0;i<n;i++){ const x = P.getX(i) + I.x, z = P.getZ(i) + I.z, h = alturaIsla(I, x, z); P.setXYZ(i, x, h, z); }
  geo.computeVertexNormals(); const Nn = geo.attributes.normal;
  for(let i=0;i<n;i++){ const h = P.getY(i), ny = Nn.getY(i), pend = 1 - ny, hn = h/Math.max(1, I.h), ru = fbm(P.getX(i)*0.004, P.getZ(i)*0.004, 2);
    let a = 1 - smoothDiente((h - 6)/14 + 0.5*ru*0.3), pa = 0, se = 0, ro = 0, ni = 0;
    if(a < 1){ const resto = 1 - a; ro = lim((pend - 0.28)*4 + (hn - 0.55)*2.2, 0, 1)*resto; ni = I.h > 700 ? lim((hn - 0.72)*6 - pend*2, 0, 1)*resto : 0; const v = Math.max(0, resto - ro - ni);
      se = v*lim(0.55 + ru*1.2 - hn*0.8, 0, 1); pa = v - se; }
    if(h < 0){ a = 1; pa = se = ro = ni = 0; }
    const s = a + pa + se + ro + ni || 1; peso[i*4] = a/s; peso[i*4+1] = pa/s; peso[i*4+2] = se/s; peso[i*4+3] = ro/s; pesoN[i] = ni/s;
    const c = new THREE.Color(0,0,0); [a, pa, se, ro, ni].forEach((w, k)=> c.add(cs[k].clone().multiplyScalar(w/s)));
    /* oclusión barata: los valles y lo bajo, más oscuros */
    const oc = 0.75 + 0.25*lim(ny*1.2, 0, 1); if(conTex){ col[i*3] = col[i*3+1] = col[i*3+2] = oc; } else { col[i*3] = c.r*oc; col[i*3+1] = c.g*oc; col[i*3+2] = c.b*oc; } }
  geo.setAttribute('peso', new THREE.BufferAttribute(peso, 4)); geo.setAttribute('pesoN', new THREE.BufferAttribute(pesoN, 1)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, matIsla()); m.frustumCulled = true; geo.computeBoundingSphere(); escena.add(m); I.malla = m; MUNDO.objs.push(m);
}
/* mapa de costa para el agua: distancia a la tierra (1 = costa) sobre una caja que cubre el archipiélago */
function armarCosta(){
  /* la caja abraza a las islas: con 1024 texeles quedan de 20–40 m y la rompiente deja de verse en escalones */
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for(const I of ISLAS){ x0 = Math.min(x0, I.x - I.r*1.5); z0 = Math.min(z0, I.z - I.r*1.5); x1 = Math.max(x1, I.x + I.r*1.5); z1 = Math.max(z1, I.z + I.r*1.5); }
  if(!ISLAS.length){ x0 = z0 = -100; x1 = z1 = 100; } const lado = Math.max(x1 - x0, z1 - z0);
  const N = 1024, cj = U_AGUA.costaCaja.value.set(x0, z0, lado, lado), c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const wx = cj.x + (x + 0.5)/N*cj.z, wz = cj.y + (y + 0.5)/N*cj.w, h = alturaTerreno(wx, wz), o = (y*N + x)*4;
    d[o] = (h > 0 ? 1 : lim(1 + h/60, 0, 1)*0.95)*255;            /* bajío: sube hacia la costa */
    d[o+1] = (h > 0 ? 1 : Math.exp(h/9))*255;                        /* espuma: sólo pegada a la orilla */
    d[o+2] = 0; d[o+3] = 255; }
  g.putImageData(im, 0, 0);
  const c2 = document.createElement('canvas'); c2.width = c2.height = N; const g2 = c2.getContext('2d');
  g2.filter = 'blur(5px)'; g2.drawImage(c, 0, 0); g2.filter = 'none'; g2.globalCompositeOperation = 'lighten'; g2.drawImage(c, 0, 0);
  const t = new THREE.CanvasTexture(c2); t.flipY = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4;
  if(U_AGUA.tCosta.value) U_AGUA.tCosta.value.dispose(); U_AGUA.tCosta.value = t; }

/* ====================== nubes ======================
   Cúmulos armados con varios planos que miran siempre a la cámara, en una sola malla instanciada; se ordenan de atrás para adelante
   cada tanto, se funden de cerca (no hay un plano que te pegue en la cara) y adentro de una nube la pantalla se blanquea. */
const NUBES = {malla:null, lista:[], grupos:[], atlas:null, orden:0};
function atlasNubesRespaldo(){ const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d'); const r = mulberry(99);
  for(let k=0;k<8;k++){ const ox = (k%4)*256, oy = Math.floor(k/4)*256;
    for(let i=0;i<34;i++){ const x = ox + 128 + (r() - 0.5)*150, y = oy + 150 + (r() - 0.5)*70 - Math.abs(r()*40), rad = 22 + r()*48;
      const gr = g.createRadialGradient(x - rad*0.3, y - rad*0.35, rad*0.1, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(236,242,250,0.75)'); gr.addColorStop(1, 'rgba(190,205,225,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
function atlasNubesGenerado(){ const L = (MAN.nubes||[]).filter(m=> ARCH['nubes/' + m.id]).slice(0, 8); if(L.length < 4) return;
  Promise.all(L.map(m=> decImagen('nubes/' + m.id, false))).then(ims=>{ const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    ims.forEach((im, k)=>{ if(!im) return; const ox = (k%4)*256, oy = Math.floor(k/4)*256, s = Math.min(250/im.width, 250/im.height), w = im.width*s, h = im.height*s; g.drawImage(im, ox + (256 - w)/2, oy + 256 - h - 3, w, h); });
    for(let k=ims.length;k<8;k++){ g.drawImage(c, (k%ims.length%4)*256, Math.floor((k%ims.length)/4)*256, 256, 256, (k%4)*256, Math.floor(k/4)*256, 256, 256); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; if(NUBES.atlas) NUBES.atlas.dispose(); NUBES.atlas = t; U_NUBE.tAtlas.value = t; }); }
const U_NUBE = {tAtlas:{value:null}, solCol:{value:new THREE.Color()}, sombra:{value:new THREE.Color()}, fogColor:{value:new THREE.Color()}, fogNear:{value:1000}, fogFar:{value:30000}, camPos:{value:V3(0,0,0)}, luz:{value:1}};
const matNube = new THREE.ShaderMaterial({uniforms:U_NUBE, transparent:true, depthWrite:false,
  vertexShader:`attribute vec3 centro; attribute vec3 datos; varying vec2 vUv; varying float vA; varying float vDist; varying float vAlto; uniform vec3 camPos;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vec3 der = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0])), arr = normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]));
      float s = datos.x, ang = datos.z; vec2 q = vec2(position.x*cos(ang) - position.y*sin(ang), position.x*sin(ang) + position.y*cos(ang));
      vec3 w = centro + (der*q.x + arr*q.y)*s; float k = floor(datos.y + 0.5);
      vUv = vec2((uv.x + mod(k, 4.0))*0.25, (uv.y + 1.0 - floor(k/4.0))*0.5);
      vDist = length(w - camPos); vA = smoothstep(s*0.4, s*1.6, vDist); vAlto = position.y;
      gl_Position = projectionMatrix*viewMatrix*vec4(w, 1.0);
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader:`uniform sampler2D tAtlas; uniform vec3 solCol, sombra, fogColor; uniform float fogNear, fogFar, luz; varying vec2 vUv; varying float vA; varying float vDist; varying float vAlto;
    #include <logdepthbuf_pars_fragment>
    void main(){
      #include <logdepthbuf_fragment>
      vec4 t = texture2D(tAtlas, vUv); if(t.a < 0.01) discard;
      /* el sprite trae el volumen en el brillo: lo claro mira al sol, lo gris es la sombra azulada del cielo (multiplicar el gris por el sol cálido lo hacía marrón) */
      float L = dot(t.rgb, vec3(0.3, 0.59, 0.11)), sol = smoothstep(0.3, 0.92, L);
      vec3 c = mix(sombra*1.15, solCol*1.45, sol)*mix(0.82, 1.0, smoothstep(-0.6, 0.5, vAlto))*luz;
      float f = 1.0 - exp(-pow(max(vDist - fogNear, 0.0)/(fogFar - fogNear)*2.2, 1.6));
      c = mix(c, fogColor, f*0.85);
      gl_FragColor = vec4(c, t.a*vA); }`});
function armarNubes(n, alto, tormenta){
  if(NUBES.malla){ escena.remove(NUBES.malla); NUBES.malla.geometry.dispose(); }
  if(!U_NUBE.tAtlas.value) U_NUBE.tAtlas.value = NUBES.atlas = atlasNubesRespaldo();
  const L = []; NUBES.grupos = [];
  for(let g=0; g<n; g++){ const cx = rf(-16000, 16000), cz = rf(-16000, 16000), cy = alto + rf(-250, 700)*(tormenta ? 0.6 : 1), R0 = rf(350, 1100)*(tormenta ? 1.4 : 1), m = ri(5, 11);
    NUBES.grupos.push({x:cx, y:cy + R0*0.3, z:cz, rx:R0*1.1, ry:R0*0.55});
    for(let k=0;k<m;k++){ const a = rnd()*TAU, d = Math.sqrt(rnd())*R0; L.push({x:cx + Math.cos(a)*d, y:cy + rnd()*R0*0.55 + (k===0 ? R0*0.25 : 0), z:cz + Math.sin(a)*d*0.8, s:rf(0.55, 1.1)*R0, t:ri(0, 7), r:rf(-0.25, 0.25)}); } }
  const base = new THREE.PlaneGeometry(1, 1), geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const ce = new Float32Array(L.length*3), da = new Float32Array(L.length*3); geo.setAttribute('centro', new THREE.InstancedBufferAttribute(ce, 3)); geo.setAttribute('datos', new THREE.InstancedBufferAttribute(da, 3));
  geo.instanceCount = L.length; const m = new THREE.Mesh(geo, matNube); m.frustumCulled = false; m.renderOrder = 5; escena.add(m); NUBES.malla = m; NUBES.lista = L; ordenarNubes(true);
  U_NUBE.solCol.value.copy(CIELO.solCol).convertSRGBToLinear().multiplyScalar(tormenta ? 0.75 : 1.08); U_NUBE.sombra.value.copy(CIELO.horiz).convertSRGBToLinear().multiplyScalar(tormenta ? 0.35 : 0.62);
  U_NUBE.fogColor.value.copy(CIELO.bruma).convertSRGBToLinear();
}
function ordenarNubes(ya){ if(!NUBES.malla || (!ya && ++NUBES.orden % 12)) return; const c = cam.position, L = NUBES.lista;
  for(const p of L) p.d = (p.x - c.x)*(p.x - c.x) + (p.y - c.y)*(p.y - c.y) + (p.z - c.z)*(p.z - c.z); L.sort((a, b)=> b.d - a.d);
  const ce = NUBES.malla.geometry.attributes.centro, da = NUBES.malla.geometry.attributes.datos;
  L.forEach((p, i)=>{ ce.array[i*3] = p.x; ce.array[i*3+1] = p.y; ce.array[i*3+2] = p.z; da.array[i*3] = p.s; da.array[i*3+1] = p.t; da.array[i*3+2] = p.r; }); ce.needsUpdate = true; da.needsUpdate = true; }
/* ¿qué tan adentro de una nube está un punto? 0 afuera, 1 en el medio */
function enNube(p){ let m = 0; for(const g of NUBES.grupos){ const dx = (p.x - g.x)/g.rx, dy = (p.y - g.y)/g.ry, dz = (p.z - g.z)/g.rx, d = dx*dx + dy*dy + dz*dz; if(d < 1) m = Math.max(m, 1 - d); } return m; }

/* ====================== mundo de cada misión ====================== */
const MUNDO = {objs:[]};
function limpiarMundo(){ for(const o of MUNDO.objs){ escena.remove(o); if(o.geometry) o.geometry.dispose(); } MUNDO.objs = []; ISLAS.length = 0; }
function armarMundo(mis, sem){
  limpiarMundo(); rnd = mulberry(semilla32(sem)); RUIDO = ruido2(semilla32(sem + 'r'));
  const n = mis.islas, mont = !!mis.montanoso;
  for(let k=0;k<n;k++){ let I = null;
    for(let t=0;t<40;t++){ const a = rnd()*TAU, d = k===0 ? rf(2500, 4500) : rf(3000, 15000), r = rf(700, mont ? 2600 : 1900);
      const c = {x:Math.cos(a)*d, z:Math.sin(a)*d, r, h:rf(mont ? 500 : 150, mont ? 1500 : 700), forma:rf(0.9, 1.7), ca:0, sa:0, alarg:rf(0.8, 1.5), sx:rf(0, 99), sz:rf(0, 99)};
      if(ISLAS.every(o=> Math.hypot(o.x - c.x, o.z - c.z) > (o.r + c.r)*1.15)){ I = c; break; } }
    if(!I) continue; const ang = rnd()*TAU; I.ca = Math.cos(ang); I.sa = Math.sin(ang); ISLAS.push(I); }
  for(const I of ISLAS) armarIsla(I);
  armarCosta();
  armarNubes(mis.tormenta ? 90 : 70, mis.tormenta ? 1300 : 1700, mis.tormenta);
}
