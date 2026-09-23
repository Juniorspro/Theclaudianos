
/* ================================================================ render: 3D iluminado dibujado en pixel art
   La escena se dibuja en HDR a la resolución chica (≈216 filas). Encima: brillo, rayos de luz
   (dispersión radial desde la luz principal), gradación por capítulo, cámara lenta, viñetas,
   grano y fundidos. Todo a la misma grilla, así el 3D también es pixel art. */
const TX = 16;                                                 /* texeles por unidad de mundo: 1 texel = 1 píxel a z = 0 */
const renderer = new THREE.WebGLRenderer({canvas:cvGL, antialias:false, powerPreference:'high-performance', stencil:false});
renderer.setPixelRatio(1);
renderer.outputEncoding = THREE.LinearEncoding;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.info.autoReset = false;
const esc = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(38, W/H, 0.5, 500);
const CAMARA = {x:0, y:0, obj:{x:0, y:0}, sacude:0, zoom:1, sube:1.6, fijo:null};
const puedeFloat = renderer.capabilities.isWebGL2 || !!renderer.extensions.get('EXT_color_buffer_half_float');
const tipoRT = puedeFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
const rtOpc = t => ({type:t || tipoRT, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, depthBuffer:false, stencilBuffer:false});
const RT = {esc:new THREE.WebGLRenderTarget(4, 4, Object.assign(rtOpc(), {depthBuffer:true, minFilter:THREE.NearestFilter, magFilter:THREE.NearestFilter})),
  br:new THREE.WebGLRenderTarget(2, 2, rtOpc()), a:new THREE.WebGLRenderTarget(2, 2, rtOpc()), b:new THREE.WebGLRenderTarget(2, 2, rtOpc()),
  rayos:new THREE.WebGLRenderTarget(2, 2, rtOpc())};
function distanciaCamara(){ return (H/TX)/2/Math.tan(cam.fov*Math.PI/360); }
alMedir.push(() => {
  renderer.setSize(W, H, false);
  cam.aspect = W/H; cam.updateProjectionMatrix();
  RT.esc.setSize(W, H);
  const w2 = Math.max(2, W >> 1), h2 = Math.max(2, H >> 1);
  for(const k of ['br', 'a', 'b', 'rayos']) RT[k].setSize(w2, h2);
});

/* ---------- pasadas de pantalla ---------- */
const quadGeo = new THREE.PlaneBufferGeometry(2, 2), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
function pasada(frag, uniforms){
  const m = new THREE.ShaderMaterial({uniforms, depthTest:false, depthWrite:false,
    vertexShader:'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader:frag});
  const s = new THREE.Scene(), q = new THREE.Mesh(quadGeo, m); q.frustumCulled = false; s.add(q);
  return {m, u:m.uniforms, dibujar(dest){ renderer.setRenderTarget(dest || null); renderer.render(s, quadCam); }};
}
const P_BR = pasada(`uniform sampler2D t; uniform float umbral; varying vec2 vUv;
  void main(){ vec3 c = texture2D(t, vUv).rgb; float l = dot(c, vec3(.2126,.7152,.0722)); if(!(l < 1e4)){ c = vec3(0.); l = 0.; }
    gl_FragColor = vec4(min(c*max(0., l - umbral)/max(l, 1e-4), vec3(20.)), 1.); }`, {t:{value:null}, umbral:{value:0.9}});
const P_BLUR = pasada(`uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;
  void main(){ vec3 c = texture2D(t, vUv).rgb*.2270;
    c += (texture2D(t, vUv + dir*1.3846).rgb + texture2D(t, vUv - dir*1.3846).rgb)*.3162;
    c += (texture2D(t, vUv + dir*3.2308).rgb + texture2D(t, vUv - dir*3.2308).rgb)*.0703;
    gl_FragColor = vec4(c, 1.); }`, {t:{value:null}, dir:{value:new THREE.Vector2()}});
/* rayos de luz: el brillo se arrastra hacia la luz principal (dispersión en pantalla) */
const P_RAYOS = pasada(`uniform sampler2D t; uniform vec2 luz; uniform float dens, decae, peso; varying vec2 vUv;
  void main(){ vec2 d = (vUv - luz)*dens/40.; vec2 uv = vUv; float il = 1.; vec3 c = vec3(0.);
    for(int i = 0; i < 40; i++){ uv -= d; vec3 s = texture2D(t, clamp(uv, 0., 1.)).rgb; c += s*il*peso; il *= decae; }
    gl_FragColor = vec4(c, 1.); }`, {t:{value:null}, luz:{value:new THREE.Vector2(.5, .8)}, dens:{value:0.9}, decae:{value:0.955}, peso:{value:0.06}});
/* la composición final: ACES de three, gradación, cámara lenta, viñetas, grano, destellos y fundido */
const P_FIN = pasada(`uniform sampler2D t, tBr, tRay; uniform vec2 res; uniform float expo, kBr, kRay, lento, planeo, grano, tiempo, fundido, destello, herido, satur;
  uniform vec3 colRay, lift, gain; varying vec2 vUv;
  vec3 RRTAndODTFit(vec3 v){ vec3 a = v*(v + .0245786) - .000090537; vec3 b = v*(.983729*v + .4329510) + .238081; return a/b; }
  vec3 aces(vec3 c){ const mat3 i = mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777);
    const mat3 o = mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602); c = i*c; c = RRTAndODTFit(c); return clamp(o*c, 0., 1.); }
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
  vec3 aSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4)) - .055, step(.0031308, c)); }
  void main(){
    vec2 uv = vUv, dc = uv - .5; float r = length(dc*vec2(res.x/res.y, 1.));
    /* aberración que crece en cámara lenta, desde el centro */
    float ab = lento*.006*r;
    vec3 c = vec3(texture2D(t, uv + dc*ab).r, texture2D(t, uv).g, texture2D(t, uv - dc*ab).b);
    c += texture2D(tBr, uv).rgb*kBr + texture2D(tRay, uv).rgb*colRay*kRay;
    c = aces(c*expo);
    c = pow(max(c, 0.), vec3(1.)) * gain + lift*(1. - c);
    float l = dot(c, vec3(.2126,.7152,.0722));
    c = mix(vec3(l), c, satur*(1. - lento*.55));
    c = mix(c, c*c*(3. - 2.*c), lento*.5);
    c *= mix(1., smoothstep(1.05, .35, r), .55 + lento*.25);
    { float gr = dot(c, vec3(.299, .587, .114)); c = mix(c, vec3(gr)*vec3(.82, .95, 1.2), planeo*.6); c *= 1. - planeo*smoothstep(.45, 1.1, r)*.45; }
    c = mix(c, vec3(.9, .08, .06), herido*smoothstep(.35, 1., r)*.8);
    c += (h(floor(uv*res) + fract(tiempo)*91.7) - .5)*grano;
    c = mix(c, vec3(1.), destello);
    c *= 1. - fundido;
    gl_FragColor = vec4(aSRGB(clamp(c, 0., 1.)), 1.);
  }`, {t:{value:null}, tBr:{value:null}, tRay:{value:null}, res:{value:new THREE.Vector2(W, H)}, expo:{value:1.35}, kBr:{value:0.8}, kRay:{value:1.0},
  lento:{value:0}, planeo:{value:0}, grano:{value:0.035}, tiempo:{value:0}, fundido:{value:1}, destello:{value:0}, herido:{value:0}, satur:{value:1.05},
  colRay:{value:new THREE.Color(1, .9, .75)}, lift:{value:new THREE.Color(.02, .01, .04)}, gain:{value:new THREE.Color(1, 1, 1)}});
const POST = {rayos:true, brillo:true, luzPant:new THREE.Vector2(.5, .9), luzMundo:new THREE.Vector3(0, 30, -60), fuerzaRayos:1};

function dibujarTodo(t){
  renderer.info.reset();
  renderer.setRenderTarget(RT.esc); renderer.clear(); renderer.render(esc, cam);
  const bajo = AJ.calidad === 'baja';
  if(POST.brillo && !bajo){
    P_BR.u.t.value = RT.esc.texture; P_BR.dibujar(RT.br);
    const w2 = RT.a.width, h2 = RT.a.height;
    P_BLUR.u.t.value = RT.br.texture; P_BLUR.u.dir.value.set(1/w2, 0); P_BLUR.dibujar(RT.a);
    P_BLUR.u.t.value = RT.a.texture; P_BLUR.u.dir.value.set(0, 1/h2); P_BLUR.dibujar(RT.b);
    P_BLUR.u.t.value = RT.b.texture; P_BLUR.u.dir.value.set(2/w2, 0); P_BLUR.dibujar(RT.a);
    P_BLUR.u.t.value = RT.a.texture; P_BLUR.u.dir.value.set(0, 2/h2); P_BLUR.dibujar(RT.b);
    P_FIN.u.tBr.value = RT.b.texture; P_FIN.u.kBr.value = 0.75;
  } else { P_FIN.u.kBr.value = 0; P_FIN.u.tBr.value = RT.esc.texture; }
  if(POST.rayos && AJ.calidad === 'alta' && POST.fuerzaRayos > 0){
    const p = POST.luzMundo.clone().project(cam); POST.luzPant.set(p.x*.5 + .5, p.y*.5 + .5);
    P_RAYOS.u.t.value = RT.br.texture; P_RAYOS.u.luz.value.copy(POST.luzPant); P_RAYOS.dibujar(RT.rayos);
    P_FIN.u.tRay.value = RT.rayos.texture; P_FIN.u.kRay.value = POST.fuerzaRayos*(p.z < 1 ? 1 : 0);
  } else { P_FIN.u.kRay.value = 0; P_FIN.u.tRay.value = RT.esc.texture; }
  P_FIN.u.t.value = RT.esc.texture; P_FIN.u.res.value.set(W, H); P_FIN.u.tiempo.value = t;
  P_FIN.u.grano.value = bajo ? 0.008 : 0.014;
  P_FIN.dibujar(null);
}

/* ---------- la cámara: sigue, mira adelante, tiembla y se clava a la grilla de píxeles ---------- */
function moverCamara(dt, tReal){
  const c = CAMARA;
  if(c.fijo){ cam.position.set(c.fijo.x, c.fijo.y, c.fijo.z); cam.lookAt(c.fijo.lx, c.fijo.ly, c.fijo.lz); return; }
  const k = 1 - Math.exp(-dt*4.2);
  c.x += (c.obj.x - c.x)*k; c.y += (c.obj.y - c.y)*k;
  c.sacude = Math.max(0, c.sacude - tReal*2.8);
  const s = c.sacude*c.sacude*0.35, sx = (Math.random() - .5)*s, sy = (Math.random() - .5)*s;
  const D = distanciaCamara()/c.zoom, paso = 1/TX;
  const x = Math.round((c.x + sx)/paso)*paso, y = Math.round((c.y + sy)/paso)*paso;
  cam.position.set(x, y + c.sube, D);
  cam.lookAt(x, y + c.sube*0.35, 0);
}

/* ---------- texturas de pixel art ---------- */
function texPixel(canvas, repetir){
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.encoding = THREE.sRGBEncoding;
  if(repetir){ t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function texDatos(canvas, repetir){ const t = texPixel(canvas, repetir); t.encoding = THREE.LinearEncoding; return t; }
/* relieve de un sprite: la altura es la distancia al borde (hasta 3 texeles); el borde se inclina hacia afuera,
   así una luz de costado le dibuja el contorno aunque el plano mire a la cámara */
function normalDeSprite(src){
  const w = src.width, h = src.height, g = src.getContext('2d'), d = g.getImageData(0, 0, w, h).data;
  const a = new Float32Array(w*h); for(let i = 0; i < w*h; i++) a[i] = d[i*4 + 3] > 127 ? 1 : 0;
  const alt = new Float32Array(w*h);
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = y*w + x; if(!a[i]){ alt[i] = 0; continue; }
    let m = 3; for(let dy = -3; dy <= 3; dy++) for(let dx = -3; dx <= 3; dx++){ const X = x + dx, Y = y + dy;
      if(X < 0 || Y < 0 || X >= w || Y >= h || !a[Y*w + X]){ const dd = Math.max(Math.abs(dx), Math.abs(dy)); if(dd < m) m = dd; } }
    alt[i] = m/3; }
  const c = document.createElement('canvas'); c.width = w; c.height = h; const gc = c.getContext('2d'), o = gc.createImageData(w, h);
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : alt[y*w + x];
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = y*w + x;
    let nx = (A(x - 1, y) - A(x + 1, y))*1.6, ny = (A(x, y + 1) - A(x, y - 1))*1.6, nz = 1; const l = Math.hypot(nx, ny, nz);
    o.data[i*4] = (nx/l*.5 + .5)*255; o.data[i*4 + 1] = (ny/l*.5 + .5)*255; o.data[i*4 + 2] = (nz/l*.5 + .5)*255; o.data[i*4 + 3] = 255; }
  gc.putImageData(o, 0, 0); return c;
}
/* un sprite animado: un atlas de cuadros en fila; cada entidad tiene su propia copia de la textura (su propio offset) */
function hacerSprite(hoja, opc){
  opc = opc || {};
  const fw = hoja.fw, fh = hoja.fh, n = hoja.n;
  const map = hoja.tex.clone(); map.needsUpdate = true; map.repeat.set(1/n, 1);
  const nor = hoja.nor ? hoja.nor.clone() : null; if(nor){ nor.needsUpdate = true; nor.repeat.set(1/n, 1); }
  const emi = hoja.emi ? hoja.emi.clone() : null; if(emi){ emi.needsUpdate = true; emi.repeat.set(1/n, 1); }
  const mat = new THREE.MeshStandardMaterial({map, normalMap:nor, emissiveMap:emi, emissive:emi ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0),
    emissiveIntensity:opc.brillo || 2.2, alphaTest:0.5, side:THREE.DoubleSide, roughness:opc.rough || 0.78, metalness:0});
  if(nor) mat.normalScale.set(1, -1);
  const geo = new THREE.PlaneBufferGeometry(fw/TX, fh/TX);
  geo.translate(0, fh/TX/2 - (opc.pie || 0)/TX, 0);            /* el origen va en los pies */
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = false;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking, map, alphaTest:0.5});
  m.userData.hoja = hoja; m.userData.cuadro = -1;
  m.cuadro = i => { i = ((i % n) + n) % n; if(m.userData.cuadro === i) return; m.userData.cuadro = i; const o = i/n; map.offset.x = o; if(nor) nor.offset.x = o; if(emi) emi.offset.x = o; };
  m.cuadro(0);
  return m;
}
/* luces que se prenden y se apagan sin cambiar la cantidad (cambiar la cantidad recompila todos los materiales) */
const LUZ_HEROE = new THREE.PointLight(0xffe0c0, 0.9, 4.5, 1.2); esc.add(LUZ_HEROE);
const LUCES_FLASH = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight(0xffc070, 0, 9, 1.4); l.userData.t = 0; esc.add(l); return l; });
function flash(x, y, z, col, fuerza, dura, alcance){
  let l = LUCES_FLASH.find(q => q.userData.t <= 0) || LUCES_FLASH.reduce((a, b) => a.userData.t < b.userData.t ? a : b);
  l.position.set(x, y, z); l.color.set(col); l.intensity = fuerza; l.distance = alcance || 9; l.userData.t = dura; l.userData.dur = dura; l.userData.f = fuerza;
}
function pasoFlashes(dt){ for(const l of LUCES_FLASH){ if(l.userData.t > 0){ l.userData.t -= dt; l.intensity = Math.max(0, l.userData.f*l.userData.t/l.userData.dur); } else l.intensity = 0; } }
