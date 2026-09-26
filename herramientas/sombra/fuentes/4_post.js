/* ================================================================ el lienzo del mundo y el revelado
   El mundo se dibuja en 2D a baja resolución (MUNDO) y pasa por un revelado en WebGL: aberración que
   late con los golpes, brillo barato, saturación de neón, viñeta, grano, destello y rojo al morir.
   Si no hay WebGL se copia tal cual. */
const MUNDO = document.createElement('canvas'), cxM = MUNDO.getContext('2d');
const POST = {ok:false, gl:null, aber:0, brillo:1, satur:1.15, vin:0.35, grano:0.035, destello:0, rojo:0, onda:0, tint:[1, 1, 1], lift:[0.02, 0, 0.04]};
let cx2dGL = null;
function iniciarPost(){
  try {
    const gl = cvGL.getContext('webgl', {antialias:false, alpha:false, premultipliedAlpha:false, preserveDrawingBuffer:false, depth:false});
    if(!gl) throw 0;
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, 'attribute vec2 a; varying vec2 v; void main(){ v = a*.5 + .5; v.y = 1. - v.y; gl_Position = vec4(a, 0., 1.); }'));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, `precision mediump float; varying vec2 v; uniform sampler2D t; uniform vec2 res; uniform float tiempo, aber, brillo, satur, vin, grano, destello, rojo, onda;
      uniform vec3 tint, lift;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)))*43758.5453); }
      void main(){
        vec2 uv = v; uv.x += sin(uv.y*16. + tiempo*2.6)*onda*.006; uv.y += sin(uv.x*11. + tiempo*1.9)*onda*.004;
        vec2 dc = uv - .5; float r = length(dc*vec2(res.x/res.y, 1.)); vec2 px = 1./res;
        float ab = aber*(1.2 + r*3.);
        vec3 c = vec3(texture2D(t, uv + vec2(ab, 0.)*px).r, texture2D(t, uv).g, texture2D(t, uv - vec2(ab, 0.)*px).b);
        vec3 b = vec3(0.);
        for(int i = 0; i < 8; i++){ float a = float(i)*.785; vec3 s = texture2D(t, uv + vec2(cos(a), sin(a))*px*2.5).rgb; b += max(s - .6, 0.); }
        c += b*brillo*.22;
        float l = dot(c, vec3(.299, .587, .114)); c = mix(vec3(l), c, satur); c = c*tint + lift*(1. - c);
        c = mix(c, vec3(l*1.1, l*.12, l*.2), rojo*.7);
        c += destello;
        c *= 1. - vin*smoothstep(.4, 1.15, r);
        c += (h(floor(uv*res) + fract(tiempo)*91.7) - .5)*grano;
        gl_FragColor = vec4(c, 1.); }`));
    gl.linkProgram(p); if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw gl.getProgramInfoLog(p);
    gl.useProgram(p);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const la = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    for(const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const U = {}; for(const k of ['res', 'tiempo', 'aber', 'brillo', 'satur', 'vin', 'grano', 'destello', 'rojo', 'onda', 'tint', 'lift']) U[k] = gl.getUniformLocation(p, k);
    Object.assign(POST, {ok:true, gl, U});
  } catch(e){ POST.ok = false; console.warn('sin WebGL: revelado apagado', e); }
}
function revelar(t){
  if(!POST.ok || AJ.visual === 'baja'){ if(!cx2dGL){ if(POST.ok){ /* con WebGL tomado no se puede pedir 2D: se dibuja igual sin efectos */ revelarGL(t, true); return; } cx2dGL = cvGL.getContext('2d'); }
    if(cx2dGL){ cx2dGL.imageSmoothingEnabled = false; cx2dGL.drawImage(MUNDO, 0, 0); } return; }
  revelarGL(t, false);
}
function revelarGL(t, plano){
  const gl = POST.gl, U = POST.U;
  gl.viewport(0, 0, cvGL.width, cvGL.height);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, MUNDO);
  gl.uniform2f(U.res, MUNDO.width, MUNDO.height); gl.uniform1f(U.tiempo, t);
  gl.uniform1f(U.aber, plano ? 0 : POST.aber); gl.uniform1f(U.brillo, plano ? 0 : POST.brillo); gl.uniform1f(U.satur, plano ? 1 : POST.satur);
  gl.uniform1f(U.vin, plano ? 0 : POST.vin); gl.uniform1f(U.grano, plano ? 0 : POST.grano); gl.uniform1f(U.destello, POST.destello); gl.uniform1f(U.rojo, POST.rojo);
  gl.uniform1f(U.onda, plano ? 0 : POST.onda); gl.uniform3fv(U.tint, POST.tint); gl.uniform3fv(U.lift, plano ? [0, 0, 0] : POST.lift);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
alMedir.push(() => { if(MUNDO.width !== W || MUNDO.height !== H){ MUNDO.width = W; MUNDO.height = H; } cxM.imageSmoothingEnabled = false;
  if(cvGL.width !== W || cvGL.height !== H){ cvGL.width = W; cvGL.height = H; } if(cx2dGL) cx2dGL.imageSmoothingEnabled = false; });
