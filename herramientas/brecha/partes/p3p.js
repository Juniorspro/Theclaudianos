
/* ====================== revelado: HDR → bloom → tono de cine → pantalla ======================
   La escena se dibuja en coma flotante (half float) y el tono lo pone la última pasada: three sólo
   aplica tono y sRGB al dibujar en pantalla, y en un render target la exposición no mueve nada.
   Si la placa no puede dibujar en half float, se dibuja directo con ACES (se decide una vez al
   arrancar: cambiar de camino recompila todos los materiales). */
const POST = {ok:false, rt:null, msaa:0, mips:[], w:0, h:0, bloom:true, t:0, danio:0, cegado:0, lento:0, flash:0,
  grado:{lift:[0,0,0], gamma:[1,1,1], gain:[1,1,1], sat:1, contraste:1, frio:[0.9,1,1.08], calido:[1.08,1,0.9], viñeta:0.35, grano:0.035, expo:1}};
const QUAD = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), QESC = new THREE.Scene(), QCAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
QUAD.frustumCulled = false; QESC.add(QUAD);
const VERT_Q = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
/* bajada con 4 muestras en diagonal (filtro de caja de 4×4 al promediarse), con umbral suave en la primera */
const MAT_BAJA = new THREE.ShaderMaterial({uniforms:{t:{value:null}, px:{value:new THREE.Vector2()}, umbral:{value:1.25}, rodilla:{value:0.5}, primera:{value:0}},
  vertexShader:VERT_Q, depthTest:false, depthWrite:false,
  fragmentShader:`uniform sampler2D t; uniform vec2 px; uniform float umbral, rodilla, primera; varying vec2 vUv;
    void main(){ vec3 c = texture2D(t, vUv + px*vec2(-1.0,-1.0)).rgb + texture2D(t, vUv + px*vec2(1.0,-1.0)).rgb + texture2D(t, vUv + px*vec2(-1.0,1.0)).rgb + texture2D(t, vUv + px*vec2(1.0,1.0)).rgb; c *= 0.25;
      if(primera > 0.5){ float b = max(c.r, max(c.g, c.b)); float k = umbral*rodilla + 1e-4; float s = clamp(b - umbral + k, 0.0, 2.0*k); s = s*s/(4.0*k); c *= max(s, b - umbral)/max(b, 1e-4); c = min(c, vec3(40.0)); }
      gl_FragColor = vec4(c, 1.0); }`});
/* subida con carpa de 9 muestras, sumándose al nivel de arriba */
const MAT_SUBE = new THREE.ShaderMaterial({uniforms:{t:{value:null}, px:{value:new THREE.Vector2()}}, vertexShader:VERT_Q, depthTest:false, depthWrite:false,
  blending:THREE.AdditiveBlending, transparent:true,
  fragmentShader:`uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
    void main(){ vec3 c = texture2D(t, vUv).rgb*4.0;
      c += (texture2D(t, vUv + vec2(px.x,0.0)).rgb + texture2D(t, vUv - vec2(px.x,0.0)).rgb + texture2D(t, vUv + vec2(0.0,px.y)).rgb + texture2D(t, vUv - vec2(0.0,px.y)).rgb)*2.0;
      c += texture2D(t, vUv + px).rgb + texture2D(t, vUv - px).rgb + texture2D(t, vUv + vec2(px.x,-px.y)).rgb + texture2D(t, vUv + vec2(-px.x,px.y)).rgb;
      gl_FragColor = vec4(c/16.0, 1.0); }`});
const MAT_FINAL = new THREE.ShaderMaterial({
  uniforms:{tHdr:{value:null}, tBloom:{value:null}, bloomK:{value:0.45}, expo:{value:1}, tiempo:{value:0}, res:{value:new THREE.Vector2(1,1)},
    lift:{value:new THREE.Vector3()}, gam:{value:new THREE.Vector3(1,1,1)}, gain:{value:new THREE.Vector3(1,1,1)}, sat:{value:1}, contraste:{value:1},
    frio:{value:new THREE.Vector3(1,1,1)}, calido:{value:new THREE.Vector3(1,1,1)}, vineta:{value:0.35}, grano:{value:0.035}, aberr:{value:0.0012},
    danio:{value:0}, cegado:{value:0}, lento:{value:0}, usaBloom:{value:1}},
  vertexShader:VERT_Q, depthTest:false, depthWrite:false,
  fragmentShader:`uniform sampler2D tHdr, tBloom; uniform float bloomK, expo, tiempo, sat, contraste, vineta, grano, aberr, danio, cegado, lento, usaBloom; uniform vec2 res;
    uniform vec3 lift, gam, gain, frio, calido; varying vec2 vUv;
    vec3 aces(vec3 x){ const mat3 A = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
      const mat3 B = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
      vec3 v = A*x; vec3 a = v*(v + 0.0245786) - 0.000090537; vec3 b = v*(0.983729*v + 0.4329510) + 0.238081; return clamp(B*(a/b), 0.0, 1.0); }
    vec3 aSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
    float azar(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
    void main(){
      vec2 d = vUv - 0.5; float r2 = dot(d, d);
      /* aberración cromática sólo hacia los bordes, como una lente */
      vec2 off = d*aberr*(1.0 + r2*6.0);
      vec3 c = vec3(texture2D(tHdr, vUv + off).r, texture2D(tHdr, vUv).g, texture2D(tHdr, vUv - off).b);
      if(usaBloom > 0.5) c += texture2D(tBloom, vUv).rgb*bloomK;
      c *= expo*(1.0 + cegado*6.0)/0.6;   /* el /0,6 es el de three: así expo 1 da el mismo brillo que su ACES */
      c = aces(c);
      /* grado de color: tono partido (sombras frías, luces cálidas), lift/gamma/gain, contraste y saturación */
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c *= mix(frio, calido, smoothstep(0.08, 0.7, l));
      c = pow(max(c*gain + lift*(1.0 - c), 0.0), 1.0/gam);
      c = (c - 0.5)*contraste + 0.5;
      l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat*(1.0 - lento*0.55));
      c = mix(c, c*vec3(0.85, 0.95, 1.12), lento*0.6);
      /* daño: rojo desde los bordes */
      c = mix(c, vec3(0.55, 0.02, 0.01), clamp(danio*smoothstep(0.05, 0.42, r2*1.7), 0.0, 0.85));
      c *= 1.0 - vineta*smoothstep(0.1, 0.62, r2*1.6);
      c = clamp(c, 0.0, 1.0);
      c = aSRGB(c);
      c += (azar(vUv*res + fract(tiempo)*vec2(71.0, 113.0)) - 0.5)*grano;
      gl_FragColor = vec4(c, 1.0); }`});
function rtNuevo(w, h, tipo, conProf){ return new THREE.WebGLRenderTarget(w, h, {type:tipo, format:THREE.RGBAFormat, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, depthBuffer:!!conProf, stencilBuffer:false, generateMipmaps:false}); }
/* ¿se puede dibujar en half float? se prueba de verdad (hay placas que dicen que sí y no completan el framebuffer) */
function probarHDR(){
  try{
    const gl = ren.getContext(), w2 = ren.capabilities.isWebGL2;
    if(w2 ? !ren.extensions.get('EXT_color_buffer_float') && !ren.extensions.get('EXT_color_buffer_half_float') : !(ren.extensions.get('OES_texture_half_float') && ren.extensions.get('EXT_color_buffer_half_float'))) return false;
    const rt = rtNuevo(8, 8, THREE.HalfFloatType, true); ren.setRenderTarget(rt); ren.clear();
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; ren.setRenderTarget(null); rt.dispose(); return ok;
  }catch(e){ return false; }
}
POST.ok = probarHDR() && !/[?&]sinpost/.test(location.search);
if(!POST.ok){ ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 1.0; }
function postMedir(){
  if(!POST.ok) return;
  const s = ren.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(2, s.x), h = Math.max(2, s.y);
  const msaa = CALIDAD >= 0.85 && ren.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? 4 : 0;
  if(POST.rt && POST.w === w && POST.h === h && POST.msaa === msaa) return;
  if(POST.rt) POST.rt.dispose(); for(const m of POST.mips) m.dispose(); POST.mips = [];
  if(msaa){ POST.rt = new THREE.WebGLMultisampleRenderTarget(w, h, {type:THREE.HalfFloatType, format:THREE.RGBAFormat, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, depthBuffer:true, stencilBuffer:false}); POST.rt.samples = msaa; }
  else POST.rt = rtNuevo(w, h, THREE.HalfFloatType, true);
  POST.w = w; POST.h = h; POST.msaa = msaa;
  let mw = w, mh = h; for(let i=0;i<5;i++){ mw = Math.max(2, mw >> 1); mh = Math.max(2, mh >> 1); POST.mips.push(rtNuevo(mw, mh, THREE.HalfFloatType, false)); }
}
function pasadaQ(mat, destino){ QUAD.material = mat; ren.setRenderTarget(destino); ren.render(QESC, QCAM); }
function revelar(dibujarEscena){
  if(!POST.ok){ ren.setRenderTarget(null); dibujarEscena(); return; }
  postMedir();
  ren.setRenderTarget(POST.rt); dibujarEscena();
  const nb = CALIDAD >= 0.55 && POST.bloom ? (CALIDAD >= 0.8 ? 5 : 4) : 0;
  if(nb){
    let src = POST.rt.texture, w = POST.w, h = POST.h;
    for(let i=0;i<nb;i++){ const m = POST.mips[i]; MAT_BAJA.uniforms.t.value = src; MAT_BAJA.uniforms.px.value.set(1/w, 1/h); MAT_BAJA.uniforms.primera.value = i===0 ? 1 : 0;
      pasadaQ(MAT_BAJA, m); src = m.texture; w = m.width; h = m.height; }
    for(let i=nb-1;i>0;i--){ const m = POST.mips[i]; MAT_SUBE.uniforms.t.value = m.texture; MAT_SUBE.uniforms.px.value.set(1/m.width, 1/m.height);
      ren.autoClear = false; pasadaQ(MAT_SUBE, POST.mips[i-1]); }
  }
  const U = MAT_FINAL.uniforms, G2 = POST.grado;
  U.tHdr.value = POST.rt.texture; U.tBloom.value = POST.mips[0].texture; U.usaBloom.value = nb ? 1 : 0; U.tiempo.value = (POST.t += 0.0173);
  U.res.value.set(POST.w, POST.h); U.expo.value = G2.expo; U.lift.value.fromArray(G2.lift); U.gam.value.fromArray(G2.gamma); U.gain.value.fromArray(G2.gain);
  U.sat.value = G2.sat; U.contraste.value = G2.contraste; U.frio.value.fromArray(G2.frio); U.calido.value.fromArray(G2.calido); U.vineta.value = G2.viñeta; U.grano.value = G2.grano*(CALIDAD >= 0.55 ? 1 : 0);
  U.danio.value = POST.danio; U.cegado.value = POST.cegado; U.lento.value = POST.lento;
  pasadaQ(MAT_FINAL, null);
}

/* ====================== calidad mínima de verdad ======================
   Con la calidad en el piso (o GRÁFICOS: BAJOS) el PBR por píxel sigue siendo lo que más cuesta: los materiales pasan a
   Lambert (en r128 la luz va por vértice), con las mismas texturas de color y oclusión. El original queda guardado y vuelve
   si la calidad sube. Lo que aparece después (enemigos, vehículos) se abarata en la revisión de cada 30 cuadros. */
const BARATO = {on:false, mats:new Map(), t:0};
function matBarato(m){
  if(!m || !m.isMeshStandardMaterial) return m; let b = BARATO.mats.get(m); if(b) return b;
  b = new THREE.MeshLambertMaterial({color:m.color, map:m.map, emissive:m.emissive, emissiveMap:m.emissiveMap, emissiveIntensity:m.emissiveIntensity, aoMap:m.aoMap, aoMapIntensity:m.aoMapIntensity,
    transparent:m.transparent, opacity:m.opacity, side:m.side, vertexColors:m.vertexColors, skinning:m.skinning, alphaTest:m.alphaTest, depthWrite:m.depthWrite, fog:m.fog});
  if(m.userData && m.userData.niebla) parcheNiebla(b);
  BARATO.mats.set(m, b); return b;
}
function abaratar(raiz, on){
  raiz.traverse(o=>{ if(!o.isMesh) return;
    if(on){ if(o.userData.pbr) return; const mm = o.material, nuevo = Array.isArray(mm) ? mm.map(matBarato) : matBarato(mm); if(nuevo !== mm){ o.userData.pbr = mm; o.material = nuevo; } }
    else if(o.userData.pbr){ o.material = o.userData.pbr; delete o.userData.pbr; } });
}
function pasarBarato(){
  const quiere = CALIDAD <= 0.45;
  /* el arma en primera persona queda PBR: ocupa poco, es lo que más se mira y sin el entorno el metal sale negro */
  if(quiere !== BARATO.on){ BARATO.on = quiere; abaratar(escena, quiere); BARATO.t = 0; return; }
  if(BARATO.on && ++BARATO.t % 30 === 0) abaratar(escena, true);
}
