<script>
/* ====================== render ======================
   El mundo va con luz horneada (mapa de luz: RGB = cielo, rebote y lámparas; A = cuánto sol le llega) y el sol en vivo sólo
   para lo que se mueve y para las sombras de los personajes. Todo se dibuja en coma flotante y la última pasada revela:
   contornos de tinta, trama en las sombras, resplandor, tono de cine y gradación. */
const cv3 = $('lienzo3d'), cvH = $('hud');
const ren = new THREE.WebGLRenderer({canvas:cv3, antialias:false, powerPreference:'high-performance', stencil:false, alpha:false});
ren.outputEncoding = THREE.sRGBEncoding;
ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFShadowMap; ren.shadowMap.autoUpdate = true;
const escena = new THREE.Scene();
const escVM = new THREE.Scene();                    /* el arma y las manos en primera persona */
const cam = new THREE.PerspectiveCamera(70, 2, 0.05, 600);
const camVM = new THREE.PerspectiveCamera(54, 2, 0.05, 600);   /* mismos cortes que la cámara del mundo: así la profundidad se compara */
escena.add(cam);
let DPR = Math.min(window.devicePixelRatio || 1, 2.5), CALIDAD = 0.8, RH = 1;
const hg = cvH.getContext('2d');
function medir(){
  const w = Math.max(2, cv3.clientWidth || innerWidth), h = Math.max(2, cv3.clientHeight || innerHeight);
  const pr = Math.max(0.5, DPR*lim(CALIDAD, 0.35, 1)*0.85);
  ren.setPixelRatio(pr); ren.setSize(w, h, false);
  cam.aspect = camVM.aspect = w/h; cam.updateProjectionMatrix(); camVM.updateProjectionMatrix();
  RH = Math.min(DPR, 2)*(CALIDAD >= 0.55 ? 1 : 0.8); cvH.width = Math.round(w*RH); cvH.height = Math.round(h*RH);
  if(typeof postMedir === 'function') postMedir();
}
addEventListener('resize', ()=> setTimeout(medir, 60));
/* calidad automática por el intervalo real entre cuadros (lo que cuesta es pintar píxeles, no el JS) */
const COSTO = {s:0, n:0, ult:0, desde:0};
const CALIDAD_FIJA = {altos:1, medios:0.7, bajos:0.45};
function fijarCalidad(c, aprendida){ CALIDAD = c; medir(); if(aprendida){ G.calAuto = +c.toFixed(2); guardar(); } }
function costoDeNuevo(){ COSTO.s = COSTO.n = 0; COSTO.ult = 0; COSTO.desde = performance.now() + 1200; }
function medirCosto(ts){
  if(ts < COSTO.desde){ COSTO.ult = ts; return; }
  if(COSTO.ult){ const d = ts - COSTO.ult; if(d < 1500){ COSTO.s += d; COSTO.n++; } } COSTO.ult = ts;
  const m = COSTO.n ? COSTO.s/COSTO.n : 0;
  if(COSTO.n >= 45 || (COSTO.n >= 8 && m > 50)){ COSTO.s = 0; COSTO.n = 0; if(G.graficos && G.graficos !== 'auto') return;
    if(m > 21 && CALIDAD > 0.4) fijarCalidad(Math.max(0.4, CALIDAD - (m > 60 ? 0.25 : m > 30 ? 0.15 : 0.08)), true);
    else if(m < 17.6 && CALIDAD < 1) fijarCalidad(Math.min(1, CALIDAD + 0.05), true); } }

/* ---------- luces: el sol en vivo (sombra sólo de lo que se mueve) y el cielo para personajes y armas ---------- */
const SOLDIR = V3(0.45, 0.78, 0.32).normalize();
const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024); sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.02;
const SC = sol.shadow.camera; SC.left = -22; SC.right = 22; SC.top = 22; SC.bottom = -22; SC.near = 1; SC.far = 140;
escena.add(sol); escena.add(sol.target);
/* el mundo no lleva luz de cielo en vivo (la tiene horneada): los personajes la reciben por su propio uniforme */
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6b5e4e, 0.9);
/* el arma en primera persona vive en su escena: su propio sol y cielo, con la luz del lugar donde está el jugador */
const solVM = new THREE.DirectionalLight(0xffffff, 2.2), hemiVM = new THREE.HemisphereLight(0xbfd8ff, 0x6b5e4e, 0.9);
escVM.add(solVM); escVM.add(solVM.target); escVM.add(hemiVM); escVM.add(camVM);
const lin = h=> new THREE.Color(h).convertSRGBToLinear();

/* ---------- cielo: panorama generado (si llegó) o degradé, con disco de sol ---------- */
const CIELO = {cenit:lin('#3f7fd4'), horiz:lin('#bcd6ec'), suelo:lin('#8a8070'), solCol:lin('#fff1d6'), tex:null, rot:0};
const U_CIELO = {tCielo:{value:null}, usaTex:{value:0}, rot:{value:0}, cenit:{value:new THREE.Color()}, horiz:{value:new THREE.Color()}, suelo:{value:new THREE.Color()}, solDir:{value:SOLDIR}, solCol:{value:new THREE.Color()}, expo:{value:1}};
const matCielo = new THREE.ShaderMaterial({uniforms:U_CIELO, side:THREE.BackSide, depthWrite:false, fog:false,
  vertexShader:`varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix*modelViewMatrix*vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader:`uniform sampler2D tCielo; uniform float usaTex, rot, expo; uniform vec3 cenit, horiz, suelo, solDir, solCol; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float y = d.y; vec3 c;
      if(usaTex > 0.5){ float u = atan(d.z, d.x)/6.2831853 + 0.5 + rot; float v = 0.5 - asin(clamp(y, -1.0, 1.0))/3.1415926;
        c = pow(texture2D(tCielo, vec2(u, clamp(v, 0.002, 0.998))).rgb, vec3(2.2))*1.25; }
      else { c = mix(horiz, cenit, pow(max(y, 0.0), 0.55)); c = mix(c, suelo, smoothstep(0.0, -0.12, y)); }
      float s = max(dot(d, solDir), 0.0);
      c += solCol*(pow(s, 900.0)*30.0 + pow(s, 60.0)*0.35 + pow(s, 6.0)*0.08);
      gl_FragColor = vec4(c*expo, 1.0); }`});
const cieloMalla = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), matCielo); cieloMalla.frustumCulled = false; cieloMalla.renderOrder = -10; escena.add(cieloMalla);
function ponerCielo(id, def){
  const m = manDe('cielo', id); def = def || {};
  CIELO.cenit.copy(lin(def.cenit || '#3f7fd4')); CIELO.horiz.copy(lin(def.horiz || '#bcd6ec')); CIELO.suelo.copy(lin(def.suelo || '#8a8070')); CIELO.solCol.copy(lin(def.sol || '#fff1d6'));
  let az = def.az === undefined ? 35 : def.az, el = def.elev === undefined ? 52 : def.elev;
  if(m){ if(m.cenit) CIELO.cenit.copy(lin(m.cenit)); if(m.horizonte){ const hz = typeof m.horizonte === 'string' ? m.horizonte : (m.horizonte.color || m.horizonte.color_opuesto); if(hz) CIELO.horiz.copy(lin(hz)); } }
  const a = az*GRAD, e = el*GRAD; SOLDIR.set(Math.sin(a)*Math.cos(e), Math.sin(e), -Math.cos(a)*Math.cos(e)).normalize();
  U_CIELO.cenit.value.copy(CIELO.cenit); U_CIELO.horiz.value.copy(CIELO.horiz); U_CIELO.suelo.value.copy(CIELO.suelo); U_CIELO.solCol.value.copy(CIELO.solCol);
  U_CIELO.usaTex.value = 0;
  if(m && ARCH['cielo/' + id]){ const azP = m.sol && m.sol.az !== undefined ? m.sol.az : az; const uSol = Math.atan2(SOLDIR.z, SOLDIR.x)/TAU + 0.5; U_CIELO.rot.value = azP/360 - uSol;
    decImagen('cielo/' + id, false).then(im=>{ if(!im) return; if(CIELO.tex) CIELO.tex.dispose(); const t = new THREE.Texture(im); t.flipY = false; t.wrapS = THREE.RepeatWrapping; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
      CIELO.tex = t; U_CIELO.tCielo.value = t; U_CIELO.usaTex.value = 1; }); }
  sol.color.copy(CIELO.solCol); solVM.color.copy(CIELO.solCol);
  hemi.color.copy(CIELO.cenit).lerp(new THREE.Color(1,1,1), 0.35); hemi.groundColor.copy(CIELO.suelo); hemiVM.color.copy(hemi.color); hemiVM.groundColor.copy(hemi.groundColor);
  escena.fog = new THREE.Fog(CIELO.horiz.clone().convertLinearToSRGB(), def.nieblaCerca || 70, def.nieblaLejos || 320);
}

/* ====================== revelado: HDR → tinta → resplandor → tono → pantalla ====================== */
const POST = {ok:false, rt:null, mips:[], w:0, h:0, t:0, danio:0, cegado:0, flashRes:0, muerto:0, vmRango:0.5,
  grado:{lift:[0,0,0], gamma:[1,1,1], gain:[1,1,1], sat:1.14, contraste:1.06, frio:[0.94,0.98,1.06], calido:[1.05,1,0.94], vineta:0.28, grano:0.03, expo:0.72}};
const QUAD = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), QESC = new THREE.Scene(), QCAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
QUAD.frustumCulled = false; QESC.add(QUAD);
const VERT_Q = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const MAT_BAJA = new THREE.ShaderMaterial({uniforms:{t:{value:null}, px:{value:new THREE.Vector2()}, umbral:{value:1.4}, rodilla:{value:0.5}, primera:{value:0}},
  vertexShader:VERT_Q, depthTest:false, depthWrite:false,
  fragmentShader:`uniform sampler2D t; uniform vec2 px; uniform float umbral, rodilla, primera; varying vec2 vUv;
    void main(){ vec3 c = texture2D(t, vUv + px*vec2(-1.0,-1.0)).rgb + texture2D(t, vUv + px*vec2(1.0,-1.0)).rgb + texture2D(t, vUv + px*vec2(-1.0,1.0)).rgb + texture2D(t, vUv + px*vec2(1.0,1.0)).rgb; c *= 0.25;
      if(primera > 0.5){ float b = max(c.r, max(c.g, c.b)); float k = umbral*rodilla + 1e-4; float s = clamp(b - umbral + k, 0.0, 2.0*k); s = s*s/(4.0*k); c *= max(s, b - umbral)/max(b, 1e-4); c = min(c, vec3(30.0)); }
      gl_FragColor = vec4(c, 1.0); }`});
const MAT_SUBE = new THREE.ShaderMaterial({uniforms:{t:{value:null}, px:{value:new THREE.Vector2()}}, vertexShader:VERT_Q, depthTest:false, depthWrite:false,
  blending:THREE.AdditiveBlending, transparent:true,
  fragmentShader:`uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
    void main(){ vec3 c = texture2D(t, vUv).rgb*4.0;
      c += (texture2D(t, vUv + vec2(px.x,0.0)).rgb + texture2D(t, vUv - vec2(px.x,0.0)).rgb + texture2D(t, vUv + vec2(0.0,px.y)).rgb + texture2D(t, vUv - vec2(0.0,px.y)).rgb)*2.0;
      c += texture2D(t, vUv + px).rgb + texture2D(t, vUv - px).rgb + texture2D(t, vUv + vec2(px.x,-px.y)).rgb + texture2D(t, vUv + vec2(-px.x,px.y)).rgb;
      gl_FragColor = vec4(c/16.0, 1.0); }`});
/* la trama de las sombras: líneas a 45° dibujadas a mano una vez (con temblor), repetida en pantalla */
function texTrama(){ const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, N, N);
  const r = mulberry(33); g.strokeStyle = '#000'; g.lineCap = 'round';
  /* líneas a 45° que empalman en los bordes (se dibujan corridas un lado para que la costura no se vea) */
  for(let k=-N;k<N*2;k+=8){ const ancho = 0.7 + r()*0.6, a = 0.45 + r()*0.5, tr = (r() - 0.5)*1.2;
    for(const dx of [-N, 0, N]){ g.lineWidth = ancho; g.globalAlpha = a; g.beginPath(); let x = k + dx, y = 0; g.moveTo(x, y); while(y < N){ y += 8; x += 8 + tr*0.3; g.lineTo(x, y); } g.stroke(); } }
  g.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; }
const MAT_FINAL = new THREE.ShaderMaterial({
  uniforms:{tHdr:{value:null}, tProf:{value:null}, tBloom:{value:null}, tTrama:{value:texTrama()}, bloomK:{value:0.35}, expo:{value:1}, tiempo:{value:0}, res:{value:new THREE.Vector2(1,1)},
    lift:{value:new THREE.Vector3()}, gam:{value:new THREE.Vector3(1,1,1)}, gain:{value:new THREE.Vector3(1,1,1)}, sat:{value:1}, contraste:{value:1},
    frio:{value:new THREE.Vector3(1,1,1)}, calido:{value:new THREE.Vector3(1,1,1)}, vineta:{value:0.3}, grano:{value:0.03},
    danio:{value:0}, cegado:{value:0}, muerto:{value:0}, usaBloom:{value:1}, tinta:{value:1}, grosor:{value:1}, cerca:{value:0.05}, lejos:{value:600}, vmRango:{value:0.5}},
  vertexShader:VERT_Q, depthTest:false, depthWrite:false,
  fragmentShader:`uniform sampler2D tHdr, tProf, tBloom, tTrama; uniform float bloomK, expo, tiempo, sat, contraste, vineta, grano, danio, cegado, muerto, usaBloom, tinta, grosor, cerca, lejos, vmRango; uniform vec2 res;
    uniform vec3 lift, gam, gain, frio, calido; varying vec2 vUv;
    vec3 aces(vec3 x){ const mat3 A = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
      const mat3 B = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
      vec3 v = A*x; vec3 a = v*(v + 0.0245786) - 0.000090537; vec3 b = v*(0.983729*v + 0.4329510) + 0.238081; return clamp(B*(a/b), 0.0, 1.0); }
    vec3 aSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
    float azar(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
    /* profundidad del búfer → metros; el arma en primera persona está comprimida en [0, vmRango] */
    float metros(float d){ float vm = step(d, vmRango - 1e-4); float dd = mix(d, d/vmRango, vm); float z = dd*2.0 - 1.0; return 2.0*cerca*lejos/(lejos + cerca - z*(lejos - cerca)); }
    float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
    void main(){
      vec2 d = vUv - 0.5; float r2 = dot(d, d);
      vec3 c = texture2D(tHdr, vUv).rgb;
      float zc = metros(texture2D(tProf, vUv).r);
      if(tinta > 0.5){
        vec2 p = grosor/res;
        /* 1/z es lineal en pantalla sobre un plano: su segunda diferencia marca pliegues y siluetas */
        float w0 = 1.0/zc;
        float wl = 1.0/metros(texture2D(tProf, vUv - vec2(p.x, 0.0)).r), wr = 1.0/metros(texture2D(tProf, vUv + vec2(p.x, 0.0)).r);
        float wd = 1.0/metros(texture2D(tProf, vUv - vec2(0.0, p.y)).r), wu = 1.0/metros(texture2D(tProf, vUv + vec2(0.0, p.y)).r);
        float wa = 1.0/metros(texture2D(tProf, vUv + p).r), wb = 1.0/metros(texture2D(tProf, vUv - p).r);
        float wc = 1.0/metros(texture2D(tProf, vUv + vec2(p.x, -p.y)).r), we = 1.0/metros(texture2D(tProf, vUv + vec2(-p.x, p.y)).r);
        float pl = abs(wl + wr - 2.0*w0) + abs(wd + wu - 2.0*w0) + 0.5*(abs(wa + wb - 2.0*w0) + abs(wc + we - 2.0*w0));
        float sil = max(max(abs(wl - w0), abs(wr - w0)), max(abs(wu - w0), abs(wd - w0)))/w0;
        float borde = max(smoothstep(0.012, 0.03, pl/w0), smoothstep(0.09, 0.22, sil));
        /* detalle: bordes de color (paneles, carteles, costuras) con línea más fina */
        vec3 cl = texture2D(tHdr, vUv - vec2(p.x, 0.0)).rgb, cr = texture2D(tHdr, vUv + vec2(p.x, 0.0)).rgb, cd = texture2D(tHdr, vUv - vec2(0.0, p.y)).rgb, cu = texture2D(tHdr, vUv + vec2(0.0, p.y)).rgb;
        float lc = log(lum(c) + 0.02); float gx = log(lum(cr) + 0.02) - log(lum(cl) + 0.02), gy = log(lum(cu) + 0.02) - log(lum(cd) + 0.02);
        float det = smoothstep(0.55, 1.1, length(vec2(gx, gy)))*0.55;
        float lejania = 1.0 - smoothstep(45.0, 140.0, zc);
        float tin = clamp(max(borde, det)*lejania, 0.0, 1.0);
        /* trama cruzada en lo oscuro */
        float l = lum(c*expo);
        float t1 = texture2D(tTrama, gl_FragCoord.xy/(96.0*grosor)).r, t2 = texture2D(tTrama, vec2(gl_FragCoord.x, -gl_FragCoord.y)/(88.0*grosor)).r;
        float tr = (1.0 - t1)*smoothstep(0.1, 0.02, l)*0.22 + (1.0 - t2)*smoothstep(0.035, 0.006, l)*0.2;
        c *= 1.0 - tr*lejania;
        c = mix(c, vec3(0.012, 0.01, 0.012), tin*0.92);
      }
      if(usaBloom > 0.5) c += texture2D(tBloom, vUv).rgb*bloomK;
      c *= expo/0.6;
      c = aces(c);
      float l = lum(c);
      c *= mix(frio, calido, smoothstep(0.08, 0.7, l));
      c = pow(max(c*gain + lift*(1.0 - c), 0.0), 1.0/gam);
      c = (c - 0.5)*contraste + 0.5;
      l = lum(c); c = mix(vec3(l), c, sat*(1.0 - muerto*0.85));
      c = mix(c, vec3(0.55, 0.02, 0.01), clamp(danio*smoothstep(0.05, 0.42, r2*1.7), 0.0, 0.8));
      c *= 1.0 - vineta*smoothstep(0.1, 0.62, r2*1.6);
      c = mix(c, vec3(1.0), clamp(cegado, 0.0, 1.0));
      c = clamp(c, 0.0, 1.0);
      c = aSRGB(c);
      c += (azar(vUv*res + fract(tiempo)*vec2(71.0, 113.0)) - 0.5)*grano;
      gl_FragColor = vec4(c, 1.0); }`});
function rtNuevo(w, h, tipo, conProf){ const rt = new THREE.WebGLRenderTarget(w, h, {type:tipo, format:THREE.RGBAFormat, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, depthBuffer:!!conProf, stencilBuffer:false, generateMipmaps:false});
  if(conProf){ rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.type = THREE.UnsignedIntType; rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter; }
  return rt; }
function probarHDR(){
  try{
    const gl = ren.getContext(), w2 = ren.capabilities.isWebGL2;
    if(w2 ? !ren.extensions.get('EXT_color_buffer_float') && !ren.extensions.get('EXT_color_buffer_half_float') : !(ren.extensions.get('OES_texture_half_float') && ren.extensions.get('EXT_color_buffer_half_float'))) return false;
    if(!w2 && !ren.extensions.get('WEBGL_depth_texture')) return false;
    const rt = rtNuevo(8, 8, THREE.HalfFloatType, true); ren.setRenderTarget(rt); ren.clear();
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; ren.setRenderTarget(null); rt.dispose(); return ok;
  }catch(e){ return false; }
}
POST.ok = probarHDR() && !/[?&]sinpost/.test(location.search);
if(!POST.ok){ ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 1.0; }
function postMedir(){
  if(!POST.ok) return;
  const s = ren.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(2, s.x), h = Math.max(2, s.y);
  if(POST.rt && POST.w === w && POST.h === h) return;
  if(POST.rt){ POST.rt.dispose(); POST.rt.depthTexture.dispose(); } for(const m of POST.mips) m.dispose(); POST.mips = [];
  POST.rt = rtNuevo(w, h, THREE.HalfFloatType, true); POST.w = w; POST.h = h;
  let mw = w, mh = h; for(let i=0;i<5;i++){ mw = Math.max(2, mw >> 1); mh = Math.max(2, mh >> 1); POST.mips.push(rtNuevo(mw, mh, THREE.HalfFloatType, false)); }
}
function pasadaQ(mat, destino){ QUAD.material = mat; ren.setRenderTarget(destino); ren.render(QESC, QCAM); }
/* mundo, y encima el arma con la profundidad comprimida en [0, vmRango]: siempre adelante y con sus propios contornos */
function dibujarEscenas(conVM){
  ren.autoClear = true; ren.render(escena, cam);
  if(conVM){ const gl = ren.getContext(); ren.autoClear = false; gl.depthRange(0, POST.vmRango); ren.shadowMap.autoUpdate = false; ren.render(escVM, camVM); ren.shadowMap.autoUpdate = true; gl.depthRange(0, 1); ren.autoClear = true; }
}
function revelar(conVM){
  if(!POST.ok){ ren.setRenderTarget(null); dibujarEscenas(conVM); return; }
  postMedir();
  ren.setRenderTarget(POST.rt); dibujarEscenas(conVM);
  const nb = CALIDAD >= 0.5 ? (CALIDAD >= 0.8 ? 5 : 4) : 0;
  if(nb){
    let src = POST.rt.texture, w = POST.w, h = POST.h;
    for(let i=0;i<nb;i++){ const m = POST.mips[i]; MAT_BAJA.uniforms.t.value = src; MAT_BAJA.uniforms.px.value.set(1/w, 1/h); MAT_BAJA.uniforms.primera.value = i===0 ? 1 : 0;
      pasadaQ(MAT_BAJA, m); src = m.texture; w = m.width; h = m.height; }
    for(let i=nb-1;i>0;i--){ const m = POST.mips[i]; MAT_SUBE.uniforms.t.value = m.texture; MAT_SUBE.uniforms.px.value.set(1/m.width, 1/m.height);
      ren.autoClear = false; pasadaQ(MAT_SUBE, POST.mips[i-1]); ren.autoClear = true; }
  }
  const U = MAT_FINAL.uniforms, G2 = POST.grado;
  U.tHdr.value = POST.rt.texture; U.tProf.value = POST.rt.depthTexture; U.tBloom.value = POST.mips[0].texture; U.usaBloom.value = nb ? 1 : 0; U.tiempo.value = (POST.t += 0.0173);
  U.res.value.set(POST.w, POST.h); U.expo.value = G2.expo; U.lift.value.fromArray(G2.lift); U.gam.value.fromArray(G2.gamma); U.gain.value.fromArray(G2.gain);
  U.sat.value = G2.sat; U.contraste.value = G2.contraste; U.frio.value.fromArray(G2.frio); U.calido.value.fromArray(G2.calido); U.vineta.value = G2.vineta; U.grano.value = G2.grano*(CALIDAD >= 0.55 ? 1 : 0);
  U.danio.value = POST.danio; U.cegado.value = POST.cegado; U.muerto.value = POST.muerto; U.tinta.value = G.estilo === 'tinta' ? 1 : 0;
  U.grosor.value = Math.max(1.2, POST.h/360); U.cerca.value = cam.near; U.lejos.value = cam.far; U.vmRango.value = POST.vmRango;
  pasadaQ(MAT_FINAL, null);
}
</script>
