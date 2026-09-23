
/* ================================================================ el mundo: niveles de texto → 3D iluminado
   Cada letra es una baldosa de 1 unidad. '#' sólido · '=' tablón que se cruza desde abajo · 'B' pared que
   vuela con una explosión · 'V' vidrio · '^' alambre de púas · 'o' garrafa · 'c' chapa de rebote ·
   'x' cajón · 'P' arranque · 'D' puerta verde · 'l' lámpara de techo · 'n' neón · 'm' 'e' 'p' 't' enemigos · 'J' jefe */
const PROF = {atras:-2.6, adelante:1.4};                         /* hondo de los bloques: el jugador anda en z = 0 */

/* ---------- texturas de baldosa (32×32 = 2 unidades) ---------- */
function texBaldosa(tipo, semilla){
  const r = mulberry(semilla || 7), [c, g] = lienzo(32, 32), T = (x, y, w, h, col) => rect(g, x, y, w, h, col);
  const var3 = (base, k) => { const n = parseInt(base.slice(1), 16), f = v => Math.round(lim(v*k, 0, 255)).toString(16).padStart(2, '0');
    return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255); };
  if(tipo === 'ladrillo' || tipo === 'ladrilloR'){
    const base = tipo === 'ladrillo' ? '#5a4a4e' : '#7a3a2a';
    T(0, 0, 32, 32, var3(base, 0.55));
    for(let f = 0; f < 8; f++) for(let i = -1; i < 4; i++){ const x = i*10 + (f % 2)*5, y = f*4; const k = 0.85 + r()*0.3;
      T(x + 1, y + 1, 9, 3, var3(base, k)); T(x + 1, y + 1, 9, 1, var3(base, k*1.15)); if(r() < 0.15) T(x + 2 + r()*6, y + 2, 2, 1, var3(base, k*0.7)); }
  } else if(tipo === 'hormigon'){
    for(let y = 0; y < 32; y++) for(let x = 0; x < 32; x++){ const k = 0.9 + r()*0.18; px(g, x, y, var3('#5c5a64', k)); }
    for(let i = 0; i < 3; i++){ let x = r()*32, y = r()*32; for(let j = 0; j < 9; j++){ px(g, x, y, '#3a3842'); x += r() < .5 ? 1 : 0; y += 1; } }
    T(0, 0, 32, 1, '#6e6c78'); T(0, 16, 32, 1, '#4a4852');
  } else if(tipo === 'madera'){
    for(let f = 0; f < 4; f++){ const k = 0.8 + r()*0.3; T(0, f*8, 32, 8, var3('#6a4a30', k)); T(0, f*8, 32, 1, var3('#6a4a30', k*1.3)); T(0, f*8 + 7, 32, 1, '#2a1a10');
      for(let i = 0; i < 6; i++) T(r()*32, f*8 + 2 + r()*4, 4 + r()*6, 1, var3('#6a4a30', k*0.8)); px(g, 4 + f*7, f*8 + 4, '#2a1a10'); }
  } else if(tipo === 'chapa'){
    for(let x = 0; x < 32; x++){ const k = (x % 4 < 2 ? 1.1 : 0.8); for(let y = 0; y < 32; y++) px(g, x, y, var3('#4a6a7a', k*(0.92 + r()*0.12))); }
    for(let i = 0; i < 14; i++) T(r()*32, r()*32, 1 + r()*3, 1 + r()*2, '#8a4a2a');
    for(let x = 2; x < 32; x += 8) px(g, x, 2, '#c8d0d8');
  } else if(tipo === 'cinta'){                                     /* goma con listones: se corre la textura y la cinta avanza */
    T(0, 0, 32, 32, '#26242c'); for(let i = 0; i < 32; i += 8){ T(i, 0, 2, 32, '#4a4652'); T(i + 2, 0, 1, 32, '#141218'); } T(0, 0, 32, 1, '#6a6672');
  } else if(tipo === 'rejilla'){
    T(0, 0, 32, 32, '#1a1c22'); for(let i = 0; i < 32; i += 4){ T(i, 0, 1, 32, '#4a4e58'); T(0, i, 32, 1, '#4a4e58'); } T(0, 0, 32, 2, '#6a6e78');
  } else if(tipo === 'azulejo'){
    for(let f = 0; f < 4; f++) for(let i = 0; i < 4; i++){ const k = 0.85 + r()*0.3; T(i*8, f*8, 8, 8, var3('#6a8a7a', k)); T(i*8, f*8, 8, 1, var3('#6a8a7a', k*1.2)); T(i*8, f*8 + 7, 8, 1, '#2a3a32'); T(i*8 + 7, f*8, 1, 8, '#2a3a32'); }
  } else if(tipo === 'marmol'){
    for(let y = 0; y < 32; y++) for(let x = 0; x < 32; x++) px(g, x, y, var3('#2a2634', 0.9 + r()*0.12));
    let x = 0, y = r()*32; for(let i = 0; i < 40; i++){ px(g, x, y, '#6a6078'); x++; y += r() < .5 ? 1 : -1; if(y < 0) y += 32; if(y > 31) y -= 32; }
    T(0, 0, 32, 1, '#4a4458'); T(0, 0, 1, 32, '#3a3446');
  } else if(tipo === 'contenedor'){
    const col = semilla % 3 === 0 ? '#8a2a22' : semilla % 3 === 1 ? '#2a5a7a' : '#3a6a3a';
    for(let x = 0; x < 32; x++){ const k = (x % 3 === 0 ? 0.7 : 1); T(x, 0, 1, 32, var3(col, k*(0.9 + r()*0.15))); }
    T(0, 0, 32, 2, var3(col, 1.3)); T(0, 30, 32, 2, var3(col, 0.5)); for(let i = 0; i < 8; i++) T(r()*32, r()*32, 2, 1, '#6a3a1a');
  }
  return c;
}
/* relieve desde la luminancia (lo oscuro es hondo), dando la vuelta para que se repita */
function normalDeLuma(src, fuerza){
  const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data, L = new Float32Array(w*h);
  for(let i = 0; i < w*h; i++) L[i] = (d[i*4]*.3 + d[i*4 + 1]*.59 + d[i*4 + 2]*.11)/255;
  const [c, g] = lienzo(w, h), o = g.createImageData(w, h), A = (x, y) => L[((y + h) % h)*w + ((x + w) % w)];
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const nx = (A(x - 1, y) - A(x + 1, y))*(fuerza || 3), ny = (A(x, y + 1) - A(x, y - 1))*(fuerza || 3), l = Math.hypot(nx, ny, 1), i = (y*w + x)*4;
    o.data[i] = (nx/l*.5 + .5)*255; o.data[i + 1] = (ny/l*.5 + .5)*255; o.data[i + 2] = (1/l*.5 + .5)*255; o.data[i + 3] = 255; }
  g.putImageData(o, 0, 0); return c;
}
const _MAT = new Map();
function matBaldosa(tipo, opc){
  opc = opc || {}; const clave = tipo + JSON.stringify(opc); if(_MAT.has(clave)) return _MAT.get(clave);
  const c = texBaldosa(tipo, opc.semilla), map = texPixel(c, true), nor = texDatos(normalDeLuma(c, opc.relieve), true);
  const m = new THREE.MeshStandardMaterial({map, normalMap:nor, roughness:opc.rough === undefined ? 0.82 : opc.rough, metalness:opc.metal || 0,
    color:new THREE.Color(opc.tinte || '#ffffff').convertSRGBToLinear()});
  _MAT.set(clave, m); return m;
}
/* ---------- geometría fundida: cajas con UV del mundo (2 unidades por textura) ---------- */
function Geo(){ this.p = []; this.n = []; this.u = []; this.i = []; }
Geo.prototype.cara = function(v, nor, uv){ const b = this.p.length/3;
  for(let k = 0; k < 4; k++){ this.p.push(...v[k]); this.n.push(...nor); this.u.push(...uv[k]); }
  this.i.push(b, b + 1, b + 2, b, b + 2, b + 3); };
Geo.prototype.caja = function(x0, y0, z0, x1, y1, z1, caras){
  const s = 0.5, C = caras || {};
  if(C.frente !== false) this.cara([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], [[x0*s, y0*s], [x1*s, y0*s], [x1*s, y1*s], [x0*s, y1*s]]);
  if(C.arriba !== false) this.cara([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], [[x0*s, z1*s], [x1*s, z1*s], [x1*s, z0*s], [x0*s, z0*s]]);
  if(C.abajo) this.cara([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], [[x0*s, z0*s], [x1*s, z0*s], [x1*s, z1*s], [x0*s, z1*s]]);
  if(C.izq !== false) this.cara([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], [[z0*s, y0*s], [z1*s, y0*s], [z1*s, y1*s], [z0*s, y1*s]]);
  if(C.der !== false) this.cara([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], [[z1*s, y0*s], [z0*s, y0*s], [z0*s, y1*s], [z1*s, y1*s]]);
  if(C.atras) this.cara([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], [[x1*s, y0*s], [x0*s, y0*s], [x0*s, y1*s], [x1*s, y1*s]]);
};
Geo.prototype.malla = function(mat, sombra){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setIndex(this.p.length/3 > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, mat); m.castShadow = sombra !== false; m.receiveShadow = true; return m;
};

/* ---------- partículas de píxel: cuadraditos del tamaño exacto de un píxel (o dos) ---------- */
function sistemaParticulas(n, aditivo){
  const pos = new Float32Array(n*3), col = new Float32Array(n*3), tam = new Float32Array(n);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
  const m = new THREE.ShaderMaterial({transparent:!!aditivo, depthWrite:!aditivo, blending:aditivo ? THREE.AdditiveBlending : THREE.NormalBlending, fog:false,
    vertexShader:'attribute float tam; attribute vec3 color; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position, 1.); gl_Position = projectionMatrix*mv; gl_PointSize = tam; }',
    fragmentShader:'varying vec3 vC; void main(){ gl_FragColor = vec4(vC, 1.); }'});
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; esc.add(pts);
  const vivas = []; for(let i = 0; i < n; i++) vivas.push({v:0});
  return {pts, pos, col, tam, g, vivas, n, sig:0,
    tirar(o){ const i = this.sig; this.sig = (this.sig + 1) % n; const p = this.vivas[i];
      Object.assign(p, {x:o.x, y:o.y, z:o.z || 0, vx:o.vx || 0, vy:o.vy || 0, vz:o.vz || 0, g:o.g === undefined ? 18 : o.g, roce:o.roce || 0, v:o.vida || 1, vida:o.vida || 1,
        r:o.r, gg:o.gg, b:o.b, t:o.tam || 1, pega:o.pega, apaga:o.apaga !== false, piso:o.piso, quieta:false}); },
    paso(dt){ for(let i = 0; i < n; i++){ const p = this.vivas[i];
      if(p.v <= 0){ this.tam[i] = 0; continue; }
      p.v -= dt;
      if(!p.quieta){ p.vy -= p.g*dt; const f = Math.exp(-p.roce*dt); p.vx *= f; p.vy *= f; p.vz *= f;
        const nx = p.x + p.vx*dt, ny = p.y + p.vy*dt;
        if(p.pega && solidoEn(nx, ny)){ p.quieta = true; p.v = Math.max(p.v, 6); }        /* la sangre queda pegada donde choca */
        else { p.x = nx; p.y = ny; p.z += p.vz*dt; } }
      const k = p.apaga ? Math.max(0, p.v/p.vida) : 1;
      this.pos[i*3] = p.x; this.pos[i*3 + 1] = p.y; this.pos[i*3 + 2] = p.z;
      this.col[i*3] = p.r*k; this.col[i*3 + 1] = p.gg*k; this.col[i*3 + 2] = p.b*k;
      this.tam[i] = p.t*(renderer.getPixelRatio()); }
      this.g.attributes.position.needsUpdate = this.g.attributes.color.needsUpdate = this.g.attributes.tam.needsUpdate = true; }
  };
}
const PART = {solidas:null, brillos:null};
function rgb(hex, k){ const c = new THREE.Color(hex).convertSRGBToLinear(); k = k || 1; return {r:c.r*k, gg:c.g*k, b:c.b*k}; }

/* ---------- el nivel ---------- */
const NIVEL = {mapa:null, ancho:0, alto:0, grupo:null, luces:[], cosas:[], lluvia:null, conos:[], cap:null};
function celda(x, y){ const f = NIVEL.alto - 1 - Math.floor(y), c = Math.floor(x); if(f < 0 || c < 0 || c >= NIVEL.ancho) return f < 0 ? '.' : '#'; if(f >= NIVEL.alto) return '.'; return NIVEL.mapa[f][c] || '.'; }
const SOLIDOS = new Set(['#', 'B', 'x', '<', '>', 'v']);
function solidoEn(x, y){ return SOLIDOS.has(celda(x, y)); }
