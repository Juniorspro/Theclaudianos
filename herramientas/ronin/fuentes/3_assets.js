/* ================================================================ los personajes: de video a cuadros
   Cada animación es un video chico: la mitad izquierda es el color premultiplicado sobre negro y la derecha el alfa en
   gris. Se busca cuadro por cuadro (el video no tiene cuadros B, así cada búsqueda cae justo), se dibuja, se lee, se
   arma el RGBA y se recorta a lo que tiene tinta. Se decodifica recién cuando hace falta el personaje, y se tira
   cuando no (el héroe siempre está). DATOS lo escribe armar.sh. */
const PJ = {};
let MODO_JS = false, MODO_WC = true;   /* el banco lo prende para comparar con el camino de JavaScript */                   /* pj → {meta, anims:{nombre:{fps, loop, golpe, avance, cuadros:[{c, ox, oy}]}}, listo} */
const FONDOS = {};
const tipoVideo = () => 'video/' + (DATOS.tipo || 'mp4');
function bytes(b64){ const s = atob(b64), u = new Uint8Array(s.length); for(let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
const unaVez = (o, ev, ms) => new Promise(r => { let h = null; const f = () => { clearTimeout(h); o.removeEventListener(ev, f); r(true); }; o.addEventListener(ev, f); h = setTimeout(() => { o.removeEventListener(ev, f); r(false); }, ms || 3000); });
/* el desarmado en la GPU: un sombreador toma el color de la mitad izquierda y el alfa de la derecha, despremultiplica, y
   cada cuadro sale como ImageBitmap recortado a la caja que calculó el horneado. En un celular es varias veces más rápido
   que recorrer los píxeles en JavaScript. Si no hay WebGL (o falla), queda el camino de siempre. */
let _gl = null;
function glDec(){
  if(_gl !== null) return _gl;
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl', {premultipliedAlpha:false, preserveDrawingBuffer:true, alpha:true, antialias:false, depth:false});
    if(!gl) return _gl = false;
    const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if(!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 v; void main(){ v = p*0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }'));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, 'precision mediump float; uniform sampler2D t; varying vec2 v; void main(){ vec3 c = texture2D(t, vec2(v.x*0.5, v.y)).rgb; float a = texture2D(t, vec2(0.5 + v.x*0.5, v.y)).r; gl_FragColor = a < 0.035 ? vec4(0.0) : vec4(min(c/a, vec3(1.0)), a); }'));
    gl.linkProgram(p); if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('programa');
    gl.useProgram(p); const bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    for(const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    return _gl = {c, gl};
  } catch(e){ anotarError(e); return _gl = false; }
}
let _turnoGL = Promise.resolve();
function cuadroGPU(v, meta, k){ const r = _turnoGL.then(() => cuadroGPU1(v, meta, k)); _turnoGL = r.catch(() => {}); return r; }
async function cuadroGPU1(v, meta, k){
  const G = glDec(), {gl, c} = G, cj = meta.cajas[k];
  if(c.width !== meta.w || c.height !== meta.h){ c.width = meta.w; c.height = meta.h; gl.viewport(0, 0, meta.w, meta.h); }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  if(!cj || cj[2] <= 0) return {c:null, ox:0, oy:0, w:0, h:0};
  return {c:await createImageBitmap(c, cj[0], cj[1], cj[2], cj[3]), ox:meta.ox + cj[0], oy:meta.oy + cj[1], w:cj[2], h:cj[3]};
}
/* ---------------------------------------------------------------- WebCodecs: el video se decodifica de corrido
   Buscar cuadro por cuadro en un <video> obliga al navegador a volver a decodificar desde el cuadro clave: en un celular
   eran 10 s para el héroe. Con WebCodecs se leen las muestras del MP4 y el decodificador del teléfono las pasa todas
   seguidas. Este lector alcanza para los MP4 que escribe procesar.py (una pista, avc1 o vp09). */
function mp4Muestras(u8){
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), tag = p => String.fromCharCode(u8[p], u8[p + 1], u8[p + 2], u8[p + 3]);
  const cajas = (ini, fin) => { const out = []; let p = ini; while(p + 8 <= fin){ let tam = dv.getUint32(p), cab = 8; if(tam === 1){ tam = Number(dv.getBigUint64(p + 8)); cab = 16; } else if(tam === 0) tam = fin - p;
      if(tam < 8) break; out.push({tipo:tag(p + 4), ini:p + cab, fin:p + tam}); p += tam; } return out; };
  const hijo = (c, t) => { const h = cajas(c ? c.ini : 0, c ? c.fin : u8.length).find(x => x.tipo === t); if(!h) throw new Error('mp4 sin ' + t); return h; };
  const stbl = hijo(hijo(hijo(hijo(hijo(null, 'moov'), 'trak'), 'mdia'), 'minf'), 'stbl'), sub = cajas(stbl.ini, stbl.fin), de = t => sub.find(x => x.tipo === t);
  const stsd = de('stsd'), ent = stsd.ini + 8, fmt = tag(ent + 4), hijos = cajas(ent + 8 + 78, ent + dv.getUint32(ent));
  let codec, desc = null;
  if(fmt === 'avc1' || fmt === 'avc3'){ const c = hijos.find(x => x.tipo === 'avcC'); desc = u8.slice(c.ini, c.fin); codec = 'avc1.' + [1, 2, 3].map(i => desc[i].toString(16).padStart(2, '0')).join(''); }
  else if(fmt === 'vp09'){ const c = hijos.find(x => x.tipo === 'vpcC'), d2 = n => String(n).padStart(2, '0'); codec = `vp09.${d2(u8[c.ini + 4])}.${d2(u8[c.ini + 5] || 10)}.${d2(u8[c.ini + 6] >> 4 || 8)}`; }
  else throw new Error('códec ' + fmt);
  const stsz = de('stsz'), fijo = dv.getUint32(stsz.ini + 4), n = dv.getUint32(stsz.ini + 8), tams = [];
  for(let i = 0; i < n; i++) tams.push(fijo || dv.getUint32(stsz.ini + 12 + i*4));
  const offs = [], stco = de('stco'), co64 = de('co64');
  if(stco){ for(let i = 0, m = dv.getUint32(stco.ini + 4); i < m; i++) offs.push(dv.getUint32(stco.ini + 8 + i*4)); }
  else { for(let i = 0, m = dv.getUint32(co64.ini + 4); i < m; i++) offs.push(Number(dv.getBigUint64(co64.ini + 8 + i*8))); }
  const stsc = de('stsc'), tab = []; for(let i = 0, m = dv.getUint32(stsc.ini + 4); i < m; i++) tab.push([dv.getUint32(stsc.ini + 8 + i*12), dv.getUint32(stsc.ini + 12 + i*12)]);
  const stss = de('stss'), claves = new Set(); if(stss) for(let i = 0, m = dv.getUint32(stss.ini + 4); i < m; i++) claves.add(dv.getUint32(stss.ini + 8 + i*4) - 1);
  const muestras = []; let s = 0;
  for(let c = 0; c < offs.length && s < n; c++){ let por = tab[0][1]; for(const [pc, spc] of tab) if(c + 1 >= pc) por = spc;
    let o = offs[c]; for(let k = 0; k < por && s < n; k++, s++){ muestras.push({d:u8.subarray(o, o + tams[s]), clave:stss ? claves.has(s) : s === 0}); o += tams[s]; } }
  return {codec, desc, muestras};
}
let _wcTex = null;
/* el mismo cuadro por CPU: dibujar el VideoFrame en un lienzo 2D y despremultiplicar en JavaScript */
let _cpuCv = null; const INV = new Float32Array(256).map((_, a) => a ? 255/a : 0);
async function cuadroCPU(f, meta, i){
  const W2 = meta.w*2, H = meta.h; if(!_cpuCv) _cpuCv = document.createElement('canvas'); const cv = _cpuCv; if(cv.width !== W2 || cv.height !== H){ cv.width = W2; cv.height = H; }
  const cx = cv.getContext('2d', {willReadFrequently:true}); cx.clearRect(0, 0, W2, H); cx.drawImage(f, 0, 0, W2, H);
  const cj = meta.cajas[i]; if(!cj || cj[2] <= 0) return {c:null, ox:0, oy:0, w:0, h:0};
  const [x0, y0, w, h] = cj, d = cx.getImageData(x0, y0, w, h).data, dA = cx.getImageData(meta.w + x0, y0, w, h).data, im = new ImageData(w, h), o = im.data;
  for(let j = 0, n = w*h*4; j < n; j += 4){ const a = dA[j]; if(a < 9) continue; const k2 = INV[a];   /* ImageData ya recorta a 255 */
    o[j] = d[j]*k2; o[j + 1] = d[j + 1]*k2; o[j + 2] = d[j + 2]*k2; o[j + 3] = a; }
  return {c:await createImageBitmap(im), ox:meta.ox + x0, oy:meta.oy + y0, w, h};
}
/* qué camino es más rápido en este teléfono: se miden los primeros cuadros de cada uno y se queda el mejor */
const CAMINO = {gpu:[], cpu:[], elegido:null};
function elegirCamino(){ if(CAMINO.elegido) return CAMINO.elegido; const m = a => a.reduce((s, x) => s + x, 0)/a.length;
  if(CAMINO.gpu.length >= 6 && CAMINO.cpu.length >= 6) CAMINO.elegido = m(CAMINO.gpu) <= m(CAMINO.cpu) ? 'gpu' : 'cpu';
  return CAMINO.elegido || (CAMINO.gpu.length < 6 ? 'gpu' : 'cpu'); }   /* si texImage2D no acepta un VideoFrame, se pasa por un ImageBitmap */
async function clipWC(u8, meta){
  const M = mp4Muestras(u8), cfg = {codec:M.codec, optimizeForLatency:true}; if(M.desc) cfg.description = M.desc;
  const sop = await VideoDecoder.isConfigSupported(cfg); if(!sop.supported) throw new Error('no decodifica ' + M.codec);
  const cuadros = [], G = glDec(), {gl, c} = G; let cadena = Promise.resolve(), k = 0, fallo = null;
  const uno = async (f, i) => { const via = elegirCamino(), t0 = performance.now(); try {
      if(via === 'cpu'){ cuadros[i] = await cuadroCPU(f, meta, i); if(!CAMINO.elegido) CAMINO.cpu.push(performance.now() - t0); return; }
      if(c.width !== meta.w || c.height !== meta.h){ c.width = meta.w; c.height = meta.h; gl.viewport(0, 0, meta.w, meta.h); }
      let src = f; if(_wcTex === false){ src = await createImageBitmap(f); }
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); if(_wcTex === null) _wcTex = true; }
      catch(e){ if(_wcTex !== null) throw e; _wcTex = false; src = await createImageBitmap(f); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); }
      if(src !== f && src.close) src.close();
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const cj = meta.cajas[i]; cuadros[i] = !cj || cj[2] <= 0 ? {c:null, ox:0, oy:0, w:0, h:0} : {c:await createImageBitmap(c, cj[0], cj[1], cj[2], cj[3]), ox:meta.ox + cj[0], oy:meta.oy + cj[1], w:cj[2], h:cj[3]};
      if(!CAMINO.elegido) CAMINO.gpu.push(performance.now() - t0);
    } finally { f.close(); } };
  const dec = new VideoDecoder({output:f => { const i = k++; if(i >= meta.n){ f.close(); return; } const antes = _turnoGL, r = antes.then(() => uno(f, i)); cadena = _turnoGL = r.catch(e => { fallo = e; }); },
    error:e => { fallo = e; }});
  dec.configure(cfg);
  M.muestras.forEach((m, i) => dec.decode(new EncodedVideoChunk({type:m.clave ? 'key' : 'delta', timestamp:Math.round(i*1e6/12), data:m.d})));
  await dec.flush(); await cadena; try { dec.close(); } catch(e){}
  if(fallo) throw fallo;
  if(cuadros.length < meta.n || cuadros.some(q => !q)) throw new Error('faltan cuadros ' + cuadros.length + '/' + meta.n);
  return cuadros;
}
async function clipACuadros(b64, meta){
  if(window.VideoDecoder && window.EncodedVideoChunk && meta.cajas && window.createImageBitmap && !MODO_JS && MODO_WC && glDec()){
    try { return await clipWC(bytes(b64), meta); } catch(e){ anotarError(e); MODO_WC = false; }   /* si falla una vez, el resto va por <video> */
  }
  const url = URL.createObjectURL(new Blob([bytes(b64)], {type:tipoVideo()}));
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = url;
  const cuadros = [];
  try {
    if(v.readyState < 2) await unaVez(v, 'loadeddata', 5000);
    try { await v.play(); v.pause(); } catch(e){}                       /* iOS no pinta un video que nunca arrancó */
    let usarGPU = !!(meta.cajas && window.createImageBitmap && glDec() && !MODO_JS);
    const W2 = meta.w*2, H = meta.h, cv = document.createElement('canvas'); cv.width = W2; cv.height = H;
    const cx = cv.getContext('2d', {willReadFrequently:true});
    for(let k = 0; k < meta.n; k++){
      const t = (k + 0.5)/12;
      if(Math.abs(v.currentTime - t) > 0.001){ v.currentTime = t; await unaVez(v, 'seeked', 2500); }
      if(usarGPU){ try { cuadros.push(await cuadroGPU(v, meta, k)); continue; } catch(e){ anotarError(e); usarGPU = false; } }
      cx.clearRect(0, 0, W2, H); cx.drawImage(v, 0, 0, W2, H);
      const d = cx.getImageData(0, 0, W2, H).data, w = meta.w, im = new ImageData(w, H), o = im.data;
      let x0 = w, x1 = -1, y0 = H, y1 = -1;
      for(let y = 0; y < H; y++){ const fila = y*W2*4;
        for(let x = 0; x < w; x++){ const i = fila + x*4, a = d[fila + (x + w)*4]; if(a < 10) continue;
          const j = (y*w + x)*4, k2 = 255/a; o[j] = Math.min(255, d[i]*k2); o[j + 1] = Math.min(255, d[i + 1]*k2); o[j + 2] = Math.min(255, d[i + 2]*k2); o[j + 3] = a;
          if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; } }
      if(x1 < 0){ cuadros.push({c:null, ox:0, oy:0, w:0, h:0}); continue; }
      /* ImageBitmap directo de los píxeles: no cuenta en el tope de memoria de lienzos de iOS y se dibuja más rápido */
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1; let c = null;
      if(window.createImageBitmap) try { c = await createImageBitmap(im, x0, y0, cw, ch); } catch(e){ c = null; }
      if(!c){ c = document.createElement('canvas'); c.width = cw; c.height = ch; c.getContext('2d').putImageData(im, -x0, -y0); }
      cuadros.push({c, ox:meta.ox + x0, oy:meta.oy + y0, w:cw, h:ch});
    }
  } catch(e){ anotarError(e); }
  v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url);
  return cuadros;
}
/* cargar un personaje (una vez); `avance` va de 0 a 1 para la barra de tinta */
async function cargarPJ(id, avance){
  if(PJ[id] && PJ[id].listo) return PJ[id];
  if(PJ[id] && PJ[id].promesa) return PJ[id].promesa;
  const D = DATOS.pj[id]; if(!D) throw new Error('personaje sin datos: ' + id);
  const P = PJ[id] = {id, meta:D.meta, anims:{}, listo:false};
  /* tres videos a la vez: cada búsqueda espera al decodificador, y con varios en paralelo no queda ocioso */
  P.promesa = (async () => { const nombres = Object.keys(D.meta.anims), cola = nombres.slice(); let i = 0;
    const obrero = async () => { while(cola.length){ const n = cola.shift(), m = D.meta.anims[n];
      P.anims[n] = Object.assign({}, m, {cuadros:await clipACuadros(D.clips[n], m)}); i++; if(avance) avance(i/nombres.length); } };
    await Promise.all([obrero(), obrero(), obrero()]);
    P.listo = true; return P; })();
  return P.promesa;
}
function soltarPJ(id){ if(id === 'heroe' || !PJ[id]) return; const P = PJ[id]; delete PJ[id];
  if(P.promesa) P.promesa.then(() => { for(const a of Object.values(P.anims)) for(const q of a.cuadros) if(q.c && q.c.close) q.c.close(); }).catch(() => {}); }
function cargarFondos(){ return Promise.all(Object.keys(DATOS.fondos).map(k => new Promise(r => { const im = new Image(); im.onload = () => { FONDOS[k] = im; r(); }; im.onerror = () => r(); im.src = 'data:image/webp;base64,' + DATOS.fondos[k]; }))); }
