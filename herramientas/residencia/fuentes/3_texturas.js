/* ================================================================ texturas de bloques, todas pintadas por código
   Las superficies de Roblox: tachas (studs) en pisos y pasto, paredes lisas, madera con veta, baldosas.
   La UV de todo lo fundido sale del mundo (proyección de caja): la textura mide lo mismo en cualquier pieza. */
function lienzo(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function hex(c){ const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function tono(c, k){ const [r, g, b] = hex(c), f = v => Math.round(lim(v*k, 0, 255)).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }
function ruido(g, w, h, amp, seed){ const r = mulberry(seed || 7), d = g.getImageData(0, 0, w, h), a = d.data;
  for(let i = 0; i < a.length; i += 4){ const n = (r() - 0.5)*amp; a[i] = lim(a[i] + n, 0, 255); a[i + 1] = lim(a[i + 1] + n, 0, 255); a[i + 2] = lim(a[i + 2] + n, 0, 255); }
  g.putImageData(d, 0, 0); }
function texDe(c, rep){ const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  if(rep) t.repeat.set(rep, rep); return t; }

/* tachas: la baldosa cuadrada con bisel y la tacha redonda en el medio, como la alfombra azul del original */
function pintarTachas(g, s, x0, y0, base){
  g.fillStyle = base; g.fillRect(x0, y0, s, s);
  g.fillStyle = tono(base, 1.14); g.fillRect(x0, y0, s, 2); g.fillRect(x0, y0, 2, s);
  g.fillStyle = tono(base, 0.72); g.fillRect(x0, y0 + s - 2, s, 2); g.fillRect(x0 + s - 2, y0, 2, s);
  const c = s/2, r = s*0.3;
  g.fillStyle = tono(base, 0.8); g.beginPath(); g.arc(x0 + c + 1.5, y0 + c + 1.5, r, 0, 7); g.fill();
  g.fillStyle = tono(base, 1.06); g.beginPath(); g.arc(x0 + c, y0 + c, r, 0, 7); g.fill();
  g.fillStyle = tono(base, 1.22); g.beginPath(); g.arc(x0 + c - r*0.35, y0 + c - r*0.35, r*0.35, 0, 7); g.fill();
}
function texTachas(base, n, seed){ const s = 64, [c, g] = lienzo(s*n, s*n);
  for(let y = 0; y < n; y++) for(let x = 0; x < n; x++) pintarTachas(g, s, x*s, y*s, tono(base, 0.96 + 0.08*mulberry(seed + x*31 + y*7)()));
  ruido(g, s*n, s*n, 10, seed); return texDe(c); }
/* pared lisa con un poco de mugre y el zócalo lo pone la geometría */
function texPared(base, seed){ const [c, g] = lienzo(256, 256); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  const r = mulberry(seed); for(let i = 0; i < 40; i++){ g.fillStyle = 'rgba(0,0,0,' + (r()*0.04) + ')'; g.beginPath(); g.arc(r()*256, r()*256, 10 + r()*40, 0, 7); g.fill(); }
  ruido(g, 256, 256, 8, seed); return texDe(c); }
function texMadera(base, seed, tablas){ const [c, g] = lienzo(256, 256), r = mulberry(seed); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for(let i = 0; i < 90; i++){ const y = r()*256; g.strokeStyle = 'rgba(0,0,0,' + (0.04 + r()*0.08) + ')'; g.lineWidth = 1 + r()*2; g.beginPath(); g.moveTo(0, y);
    for(let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x*0.05 + i)*2); g.stroke(); }
  if(tablas) for(let y = 0; y < 256; y += 256/tablas){ g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, 256, 2); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, y + 2, 256, 1); }
  ruido(g, 256, 256, 12, seed); return texDe(c); }
/* la tabla de barricada: madera con tachas cuadradas encima, como las del juego */
function texTabla(){ const [c, g] = lienzo(256, 64); g.fillStyle = '#7a4a26'; g.fillRect(0, 0, 256, 64);
  for(let x = 0; x < 256; x += 32){ g.fillStyle = '#8c5a30'; g.fillRect(x + 6, 14, 20, 36); g.fillStyle = '#9e6a3a'; g.fillRect(x + 6, 14, 20, 3); g.fillStyle = '#5e3818'; g.fillRect(x + 6, 47, 20, 3); }
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 62, 256, 2); ruido(g, 256, 64, 14, 3); const t = texDe(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; }
function texDamero(){ const [c, g] = lienzo(128, 128); for(let y = 0; y < 2; y++) for(let x = 0; x < 2; x++){ g.fillStyle = (x + y) % 2 ? '#1c1c1e' : '#e8e6e0'; g.fillRect(x*64, y*64, 64, 64); }
  g.fillStyle = 'rgba(0,0,0,0.25)'; for(let i = 0; i <= 128; i += 64){ g.fillRect(i - 1, 0, 2, 128); g.fillRect(0, i - 1, 128, 2); } ruido(g, 128, 128, 10, 5); return texDe(c); }
function texTejas(){ const [c, g] = lienzo(128, 128); g.fillStyle = '#5a2e1c'; g.fillRect(0, 0, 128, 128);
  for(let y = 0; y < 128; y += 16) for(let x = (y/16) % 2 ? -8 : 0; x < 128; x += 16){ g.fillStyle = tono('#6e3a22', 0.9 + Math.random()*0.2); g.fillRect(x + 1, y + 1, 14, 14); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 1, y + 13, 14, 2); }
  return texDe(c); }
function texAsfalto(){ const [c, g] = lienzo(128, 128); g.fillStyle = '#3a3a3e'; g.fillRect(0, 0, 128, 128); for(let y = 0; y < 2; y++) for(let x = 0; x < 2; x++) pintarTachas(g, 64, x*64, y*64, '#3c3c40');
  ruido(g, 128, 128, 18, 11); return texDe(c); }
function texVereda(){ const [c, g] = lienzo(128, 128); g.fillStyle = '#9a9690'; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 128, 2); g.fillRect(0, 0, 2, 128); ruido(g, 128, 128, 16, 13); return texDe(c); }
function texCamino(){ const [c, g] = lienzo(128, 128); for(let y = 0; y < 2; y++) for(let x = 0; x < 2; x++) pintarTachas(g, 64, x*64, y*64, '#7a5a34'); ruido(g, 128, 128, 14, 17); return texDe(c); }

/* ================================================================ materiales
   Adentro de la casa la luz de afuera (sol, luna, cielo) llega apagada: cada vértice sabe si su cara mira
   afuera (atributo aFuera) y el shader escala sol, luna y cielo por uAdentro en las caras de adentro. Sin
   esto, sin sombras, la bodega del Alien se iluminaba por el techo; acá el living tendría sol a través de la pared. */
const U_ADENTRO = {value:0.22};
function parcheAdentro(mat){
  mat.onBeforeCompile = sh => {
    sh.uniforms.uAdentro = U_ADENTRO;
    sh.vertexShader = 'attribute float aFuera;\nvarying float vFuera;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFuera = aFuera;');
    sh.fragmentShader = 'uniform float uAdentro;\nvarying float vFuera;\n' + sh.fragmentShader
      .replace('#include <lights_fragment_begin>', 'float kFuera = mix( uAdentro, 1.0, vFuera );\n' + THREE.ShaderChunk.lights_fragment_begin
        .replace('vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );', 'vec3 irradiance = kFuera * getAmbientLightIrradiance( ambientLightColor );')
        .replace('getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );', 'getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );\n\t\tdirectLight.color *= kFuera;')
        .replace('irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );', 'irradiance += kFuera * getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );'));
  };
  mat.customProgramCacheKey = () => 'adentro1';
  return mat;
}
const TEX = {};
const MAT = {};
function armarMateriales(){
  TEX.alfombra = texTachas('#2c4a9a', 2, 3); TEX.alfombraRoja = texTachas('#8e1c1c', 2, 5); TEX.alfombraVerde = texTachas('#2e6a3a', 2, 9);
  TEX.cesped = texTachas('#3f8a3a', 2, 21); TEX.escalera = texTachas('#2a4488', 1, 4);
  TEX.pared = texPared('#d9ccaa', 2); TEX.paredVerde = texPared('#9fb08a', 4); TEX.paredCeleste = texPared('#a9c0c8', 6); TEX.paredExt = texPared('#e8e2d4', 8);
  TEX.madera = texMadera('#6e4424', 3, 0); TEX.maderaClara = texMadera('#9a6a3a', 5, 4); TEX.galpon = texMadera('#b86a32', 9, 6);
  TEX.tabla = texTabla(); TEX.damero = texDamero(); TEX.tejas = texTejas(); TEX.asfalto = texAsfalto(); TEX.vereda = texVereda(); TEX.camino = texCamino();
  const ph = (map, o) => parcheAdentro(new THREE.MeshPhongMaterial(Object.assign({map, vertexColors:true, shininess:6, specular:0x0c0c0c}, o || {})));
  MAT.alfombra = ph(TEX.alfombra); MAT.alfombraRoja = ph(TEX.alfombraRoja); MAT.alfombraVerde = ph(TEX.alfombraVerde);
  MAT.cesped = ph(TEX.cesped); MAT.escalera = ph(TEX.escalera);
  MAT.pared = ph(TEX.pared); MAT.paredVerde = ph(TEX.paredVerde); MAT.paredCeleste = ph(TEX.paredCeleste); MAT.paredExt = ph(TEX.paredExt);
  MAT.madera = ph(TEX.madera, {shininess:14}); MAT.maderaClara = ph(TEX.maderaClara, {shininess:10}); MAT.galpon = ph(TEX.galpon);
  MAT.damero = ph(TEX.damero, {shininess:30, specular:0x222222}); MAT.tejas = ph(TEX.tejas); MAT.asfalto = ph(TEX.asfalto); MAT.vereda = ph(TEX.vereda); MAT.camino = ph(TEX.camino);
  MAT.plastico = ph(null, {shininess:18, specular:0x1a1a1a}); MAT.metal = ph(null, {shininess:60, specular:0x444444});
  MAT.tabla = new THREE.MeshPhongMaterial({map:TEX.tabla, shininess:6});
  MAT.vidrio = new THREE.MeshPhongMaterial({color:0x223040, transparent:true, opacity:0.35, shininess:90, specular:0x888888, depthWrite:false, side:THREE.DoubleSide});
}

/* ================================================================ geometría fundida
   Se juntan cajas por material en un «balde»; cada caja lleva color por vértice, UV del mundo y si mira afuera. */
const CASA_CAJA = {x0:-7.15, x1:7.15, z0:-5.15, z1:5.15, y0:-0.1, y1:6.3};
const adentroDeCasa = (x, y, z) => x > CASA_CAJA.x0 && x < CASA_CAJA.x1 && z > CASA_CAJA.z0 && z < CASA_CAJA.z1 && y > CASA_CAJA.y0 && y < CASA_CAJA.y1;
function balde(){ return {pos:[], nor:[], uv:[], col:[], fue:[]}; }
const BALDES = {};
function bal(nombre){ return BALDES[nombre] || (BALDES[nombre] = balde()); }
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m3 = new THREE.Matrix3();
/* una caja de ancho w, alto h, fondo d con centro en (x,y,z), girada ry (y opcionalmente rx, rz); tex: metros por repetición */
function caja(nombre, x, y, z, w, h, d, color, o){
  o = o || {}; const g = new THREE.BoxGeometry(w, h, d), m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); agregar(nombre, g, m, color, o); g.dispose(); }
function agregar(nombre, g, m, color, o){
  o = o || {}; const B = bal(nombre), P = g.attributes.position, N = g.attributes.normal, I = g.index, c = new THREE.Color(color === undefined ? 0xffffff : color).convertSRGBToLinear(), esc = o.tex || 1;
  _m3.getNormalMatrix(m);
  const idx = I ? I.array : [...Array(P.count).keys()];
  for(let k = 0; k < idx.length; k++){ const i = idx[k];
    _v.fromBufferAttribute(P, i).applyMatrix4(m); _n.fromBufferAttribute(N, i).applyMatrix3(_m3).normalize();
    B.pos.push(_v.x, _v.y, _v.z); B.nor.push(_n.x, _n.y, _n.z);
    const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
    let u, w; if(ay >= ax && ay >= az){ u = _v.x; w = _v.z; } else if(ax >= az){ u = _v.z; w = _v.y; } else { u = _v.x; w = _v.y; }
    B.uv.push(u/esc + (o.du || 0), w/esc + (o.dv || 0));
    B.col.push(c.r, c.g, c.b);
  }
  /* si la cara mira afuera: se prueba un punto un poco más allá del centro de cada triángulo */
  for(let k = 0; k < idx.length; k += 3){ const b = B.pos.length/3 - idx.length + k, p = B.pos, nn = B.nor;
    const cx = (p[b*3] + p[b*3 + 3] + p[b*3 + 6])/3 + nn[b*3]*0.25, cy = (p[b*3 + 1] + p[b*3 + 4] + p[b*3 + 7])/3 + nn[b*3 + 1]*0.25, cz = (p[b*3 + 2] + p[b*3 + 5] + p[b*3 + 8])/3 + nn[b*3 + 2]*0.25;
    const f = o.fuera !== undefined ? o.fuera : (adentroDeCasa(cx, cy, cz) ? 0 : 1); B.fue.push(f, f, f); }
}
function mallaDe(nombre, mat){
  const B = BALDES[nombre]; if(!B || !B.pos.length) return null; const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3)); g.setAttribute('aFuera', new THREE.Float32BufferAttribute(B.fue, 1));
  g.computeBoundingSphere(); g.computeBoundingBox(); delete BALDES[nombre];
  const me = new THREE.Mesh(g, mat); me.matrixAutoUpdate = false; me.updateMatrix(); return me; }
