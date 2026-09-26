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
  g.fillStyle = tono(base, 1.1); g.fillRect(x0, y0, s, s*0.035); g.fillRect(x0, y0, s*0.035, s);
  g.fillStyle = tono(base, 0.76); g.fillRect(x0, y0 + s*0.965, s, s*0.035); g.fillRect(x0 + s*0.965, y0, s*0.035, s);
  const c = s/2, r = s*0.29;
  g.fillStyle = 'rgba(0,0,0,0.24)'; g.beginPath(); g.arc(x0 + c + s*0.03, y0 + c + s*0.045, r, 0, 7); g.fill();
  const gr = g.createRadialGradient(x0 + c - r*0.45, y0 + c - r*0.45, r*0.08, x0 + c, y0 + c, r);
  gr.addColorStop(0, tono(base, 1.3)); gr.addColorStop(0.55, tono(base, 1.05)); gr.addColorStop(1, tono(base, 0.88));
  g.fillStyle = gr; g.beginPath(); g.arc(x0 + c, y0 + c, r, 0, 7); g.fill();
  g.strokeStyle = tono(base, 0.7); g.lineWidth = s*0.022; g.beginPath(); g.arc(x0 + c, y0 + c, r*0.98, 0.1, 1.9); g.stroke();
  g.strokeStyle = tono(base, 1.25); g.lineWidth = s*0.015; g.beginPath(); g.arc(x0 + c, y0 + c, r*0.96, 3.3, 4.8); g.stroke();
}
function texTachas(base, n, seed, amp){ const s = 128, [c, g] = lienzo(s*n, s*n);
  for(let y = 0; y < n; y++) for(let x = 0; x < n; x++) pintarTachas(g, s, x*s, y*s, tono(base, 0.97 + 0.06*mulberry(seed + x*31 + y*7)()));
  ruido(g, s*n, s*n, amp === undefined ? 4 : amp, seed); return texDe(c); }
/* pintura lisa: casi nada de mugre, apenas manchas grandes y suaves */
function manchas(g, w, h, n, seed, a){ const r = mulberry(seed); for(let i = 0; i < n; i++){ const x = r()*w, y = r()*h, R = 20 + r()*70, gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, 'rgba(60,40,20,' + (a*(0.5 + r())) + ')'); gr.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gr; g.fillRect(x - R, y - R, R*2, R*2); } }
function texPared(base, seed){ const [c, g] = lienzo(256, 256); g.fillStyle = base; g.fillRect(0, 0, 256, 256); manchas(g, 256, 256, 14, seed, 0.025); ruido(g, 256, 256, 3, seed); return texDe(c); }
/* empapelado de dormitorio: rayas o un dibujito que se repite */
function texEmpapelado(base, tipo, seed){ const [c, g] = lienzo(256, 256); g.fillStyle = base; g.fillRect(0, 0, 256, 256); const osc = tono(base, 0.86), cla = tono(base, 1.08);
  if(tipo === 'rayas'){ for(let x = 0; x < 256; x += 32){ g.fillStyle = osc; g.fillRect(x + 12, 0, 12, 256); g.fillStyle = cla; g.fillRect(x + 25, 0, 2, 256); } }
  else { for(let y = 0; y < 256; y += 64) for(let x = 0; x < 256; x += 64){ const ox = (y/64) % 2 ? 32 : 0; g.fillStyle = osc; g.save(); g.translate(x + ox + 16, y + 20); g.rotate(Math.PI/4); g.fillRect(-6, -6, 12, 12); g.restore();
      g.beginPath(); g.arc(x + ox + 16, y + 44, 3, 0, 7); g.fill(); g.fillStyle = cla; g.beginPath(); g.arc(x + ox + 48, y + 36, 2, 0, 7); g.fill(); } }
  manchas(g, 256, 256, 8, seed, 0.02); ruido(g, 256, 256, 3, seed); return texDe(c); }
/* piso de tablas: cuatro filas con las juntas corridas, veta y un tono por tabla */
function texMaderaPiso(base, seed){ const [c, g] = lienzo(256, 256), r = mulberry(seed); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for(let f = 0; f < 4; f++){ const y0 = f*64; let x = -r()*120;
    while(x < 256){ const L = 110 + r()*90, t = tono(base, 0.84 + r()*0.3); g.fillStyle = t; g.fillRect(x, y0, L, 64);
      for(let i = 0; i < 9; i++){ const yy = y0 + 4 + r()*56; g.strokeStyle = 'rgba(40,20,5,' + (0.05 + r()*0.1) + ')'; g.lineWidth = 0.6 + r()*1.4; g.beginPath(); g.moveTo(x, yy); for(let k = 0; k <= 8; k++) g.lineTo(x + L*k/8, yy + Math.sin(k*0.8 + i*1.7 + x*0.01)*1.6); g.stroke(); }
      if(r() < 0.5){ g.fillStyle = 'rgba(50,25,8,0.25)'; g.beginPath(); g.ellipse(x + L*(0.2 + r()*0.6), y0 + 32 + (r() - 0.5)*30, 3 + r()*4, 2 + r()*2, 0, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, y0, 2, 64); x += L; }
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, y0, 256, 2); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(0, y0 + 2, 256, 1); }
  ruido(g, 256, 256, 5, seed); return texDe(c); }
/* madera de mueble: veta fina y larga */
function texMadera(base, seed, tablas){ const [c, g] = lienzo(256, 256), r = mulberry(seed); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for(let i = 0; i < 70; i++){ const y = r()*256; g.strokeStyle = 'rgba(30,14,4,' + (0.04 + r()*0.08) + ')'; g.lineWidth = 0.6 + r()*1.6; g.beginPath(); g.moveTo(0, y);
    for(let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x*0.04 + i)*1.8); g.stroke(); }
  if(tablas) for(let y = 0; y < 256; y += 256/tablas){ g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, 256, 2); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, y + 2, 256, 1); }
  ruido(g, 256, 256, 5, seed); return texDe(c); }
/* la tabla de barricada: madera con tachas cuadradas encima, como las del juego */
function texTabla(){ const [c, g] = lienzo(256, 64); g.fillStyle = '#7a4a26'; g.fillRect(0, 0, 256, 64);
  for(let x = 0; x < 256; x += 32){ g.fillStyle = '#8c5a30'; g.fillRect(x + 6, 14, 20, 36); g.fillStyle = '#9e6a3a'; g.fillRect(x + 6, 14, 20, 3); g.fillStyle = '#5e3818'; g.fillRect(x + 6, 47, 20, 3); }
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, 256, 2); g.fillRect(0, 62, 256, 2); ruido(g, 256, 64, 10, 3); const t = texDe(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; }
function texDamero(){ const [c, g] = lienzo(256, 256); for(let y = 0; y < 2; y++) for(let x = 0; x < 2; x++){ const o = (x + y) % 2, gr = g.createLinearGradient(x*128, y*128, x*128 + 128, y*128 + 128);
    gr.addColorStop(0, o ? '#26262a' : '#f0eee8'); gr.addColorStop(1, o ? '#18181c' : '#dddad2'); g.fillStyle = gr; g.fillRect(x*128, y*128, 128, 128); }
  g.fillStyle = 'rgba(0,0,0,0.3)'; for(let i = 0; i <= 256; i += 128){ g.fillRect(i - 1.5, 0, 3, 256); g.fillRect(0, i - 1.5, 256, 3); } ruido(g, 256, 256, 4, 5); return texDe(c); }
/* azulejos blancos con la junta gris (baños y la pared de la cocina) */
function texAzulejo(base, n, seed){ const S = 256, [c, g] = lienzo(S, S), t = S/n; g.fillStyle = '#b8b4ac'; g.fillRect(0, 0, S, S); const r = mulberry(seed);
  for(let y = 0; y < n; y++) for(let x = 0; x < n; x++){ const gr = g.createLinearGradient(x*t, y*t, x*t + t, y*t + t), b = tono(base, 0.96 + r()*0.06);
    gr.addColorStop(0, tono(b, 1.06)); gr.addColorStop(1, tono(b, 0.94)); g.fillStyle = gr; g.fillRect(x*t + 2, y*t + 2, t - 4, t - 4);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x*t + 4, y*t + 4, t*0.35, 2); }
  ruido(g, S, S, 3, seed); return texDe(c); }
/* el siding de afuera: tablas horizontales con la sombra del canto */
function texSiding(base){ const [c, g] = lienzo(256, 256); for(let y = 0; y < 256; y += 32){ const gr = g.createLinearGradient(0, y, 0, y + 32);
    gr.addColorStop(0, tono(base, 1.07)); gr.addColorStop(0.85, tono(base, 0.95)); gr.addColorStop(1, tono(base, 0.8)); g.fillStyle = gr; g.fillRect(0, y, 256, 32);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + 30, 256, 2); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, y, 256, 1); }
  manchas(g, 256, 256, 10, 8, 0.03); ruido(g, 256, 256, 3, 8); return texDe(c); }
function texTejas(){ const [c, g] = lienzo(256, 256), r = mulberry(23); g.fillStyle = '#26221f'; g.fillRect(0, 0, 256, 256);
  for(let y = 0; y < 256; y += 32) for(let x = (y/32) % 2 ? -16 : 0; x < 256; x += 32){ const t = tono('#4a3a30', 0.8 + r()*0.4); g.fillStyle = t; g.fillRect(x + 1, y + 1, 30, 29);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 1, y + 1, 30, 3); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x + 1, y + 26, 30, 4); }
  ruido(g, 256, 256, 6, 23); return texDe(c); }
function texLadrillo(){ const [c, g] = lienzo(256, 256), r = mulberry(31); g.fillStyle = '#8a8076'; g.fillRect(0, 0, 256, 256);
  for(let y = 0; y < 256; y += 32) for(let x = (y/32) % 2 ? -32 : 0; x < 256; x += 64){ g.fillStyle = tono('#8e3e2a', 0.8 + r()*0.35); g.fillRect(x + 2, y + 2, 60, 28); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 2, y + 25, 60, 5); }
  ruido(g, 256, 256, 8, 31); return texDe(c); }
function texTelaMueble(base, seed){ const [c, g] = lienzo(128, 128); g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for(let i = 0; i < 128; i += 2){ g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(i, 0, 1, 128); g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(0, i, 128, 1); } ruido(g, 128, 128, 5, seed); return texDe(c); }
function texAsfalto(){ const [c, g] = lienzo(256, 256); g.fillStyle = '#38383c'; g.fillRect(0, 0, 256, 256); for(let y = 0; y < 2; y++) for(let x = 0; x < 2; x++) pintarTachas(g, 128, x*128, y*128, '#3a3a3e');
  ruido(g, 256, 256, 10, 11); return texDe(c); }
function texVereda(){ const [c, g] = lienzo(256, 256); g.fillStyle = '#a09c94'; g.fillRect(0, 0, 256, 256); manchas(g, 256, 256, 8, 13, 0.05);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, 256, 3); g.fillRect(0, 0, 3, 256); ruido(g, 256, 256, 8, 13); return texDe(c); }
function texCamino(){ const [c, g] = lienzo(256, 256); for(let y = 0; y < 2; y++) for(let x = 0; x < 2; x++) pintarTachas(g, 128, x*128, y*128, '#86664a'); ruido(g, 256, 256, 6, 17); return texDe(c); }
/* los calcos de sombra: una franja que se apaga (al pie de las paredes) y un rectángulo difuso (debajo de los muebles) */
function texFranja(){ const [c, g] = lienzo(64, 8), gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 8); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; }
function texMancha(){ const S = 64, [c, g] = lienzo(S, S), d = g.createImageData(S, S);
  for(let y = 0; y < S; y++) for(let x = 0; x < S; x++){ const f = v => { const e = Math.min(v, S - 1 - v)/(S*0.32); return Math.min(1, e*e*(3 - 2*Math.min(1, e))); }, a = f(x)*f(y); const i = (y*S + x)*4; d.data[i] = d.data[i + 1] = d.data[i + 2] = 0; d.data[i + 3] = a*255; }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; }

/* ================================================================ materiales
   Adentro de la casa la luz de afuera (sol, luna, cielo) llega apagada: cada vértice sabe si su cara mira
   afuera (atributo aFuera) y el shader escala sol, luna y cielo por uAdentro en las caras de adentro. Sin
   esto, sin sombras, la bodega del Alien se iluminaba por el techo; acá el living tendría sol a través de la pared. */
const U_ADENTRO = {value:0.22};
/* muro: además, la sombra de los rincones (oclusión falsa): la pared se apaga cerca del piso y cerca del techo de cada planta */
function parcheAdentro(mat, muro){
  mat.onBeforeCompile = sh => {
    sh.uniforms.uAdentro = U_ADENTRO;
    sh.vertexShader = 'attribute float aFuera;\nvarying float vFuera;\nvarying float vY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFuera = aFuera; vY = position.y;');
    sh.fragmentShader = 'uniform float uAdentro;\nvarying float vFuera;\nvarying float vY;\n' + sh.fragmentShader
      .replace('#include <lights_fragment_begin>', 'float kFuera = mix( uAdentro, 1.0, vFuera );\n' + THREE.ShaderChunk.lights_fragment_begin
        .replace('vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );', 'vec3 irradiance = kFuera * getAmbientLightIrradiance( ambientLightColor );')
        .replace('getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );', 'getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );\n\t\tdirectLight.color *= kFuera;')
        .replace('irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );', 'irradiance += kFuera * getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );'))
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + (muro ? 'float yl = vY > 3.1 ? vY - 3.2 : vY; float hh = vY > 3.1 ? 2.8 : 3.0;\nfloat aoM = 1.0 - 0.36*exp(-max(yl, 0.0)/0.2) - 0.26*exp(-max(hh - yl, 0.0)/0.24);\naoM = mix(aoM, 1.0, vFuera); reflectedLight.indirectDiffuse *= aoM; reflectedLight.directDiffuse *= mix(1.0, aoM, 0.75);' : ''));
  };
  mat.customProgramCacheKey = () => muro ? 'adentro-muro' : 'adentro1';
  return mat;
}
const TEX = {};
const MAT = {};
/* las paredes llevan la sombra de los rincones */
const MUROS = new Set(['pared', 'paredCocina', 'paredVerde', 'empapelado', 'empapeladoRojo', 'empapeladoNene', 'azulejoPared']);
function armarMateriales(){
  TEX.alfombra = texTachas('#2c4a9a', 2, 3); TEX.alfombraRoja = texTachas('#7e1a22', 2, 5); TEX.alfombraVerde = texTachas('#2e6a3a', 2, 9); TEX.alfombraBeige = texTachas('#a8906c', 2, 13);
  TEX.cesped = texTachas('#3f8a3a', 2, 21, 7); TEX.escalera = texTachas('#2a4488', 1, 4);
  TEX.pared = texPared('#e0d0ac', 2); TEX.paredCocina = texPared('#cfe0d8', 6); TEX.paredVerde = texPared('#9aa88c', 4); TEX.techo = texPared('#f2eee6', 10);
  TEX.empapelado = texEmpapelado('#b8c4a4', 'rayas', 3); TEX.empapeladoRojo = texEmpapelado('#c8a88a', 'dibujo', 5); TEX.empapeladoNene = texEmpapelado('#a8c4dc', 'dibujo', 7);
  TEX.azulejoPared = texAzulejo('#eeeeea', 6, 4); TEX.azulejo = texAzulejo('#dce6ec', 4, 9);
  TEX.paredExt = texSiding('#e6dcc6'); TEX.ladrillo = texLadrillo();
  TEX.madera = texMadera('#6e4424', 3, 0); TEX.maderaClara = texMaderaPiso('#a8743e', 5); TEX.maderaPiso = texMaderaPiso('#7a4e2a', 7); TEX.galpon = texMadera('#b86a32', 9, 6);
  TEX.tela = texTelaMueble('#ffffff', 3);
  TEX.tabla = texTabla(); TEX.damero = texDamero(); TEX.tejas = texTejas(); TEX.asfalto = texAsfalto(); TEX.vereda = texVereda(); TEX.camino = texCamino();
  TEX.franja = texFranja(); TEX.mancha = texMancha();
  const ph = (k, map, o) => parcheAdentro(new THREE.MeshPhongMaterial(Object.assign({map, vertexColors:true, shininess:6, specular:0x0c0c0c}, o || {})), MUROS.has(k));
  for(const k of ['alfombra', 'alfombraRoja', 'alfombraVerde', 'alfombraBeige', 'cesped', 'escalera', 'pared', 'paredCocina', 'paredVerde', 'techo', 'empapelado', 'empapeladoRojo', 'empapeladoNene', 'paredExt', 'ladrillo', 'galpon', 'tela', 'tejas', 'asfalto', 'vereda', 'camino'])
    MAT[k] = ph(k, TEX[k]);
  MAT.madera = ph('madera', TEX.madera, {shininess:22, specular:0x1a1510}); MAT.maderaClara = ph('maderaClara', TEX.maderaClara, {shininess:18, specular:0x181410}); MAT.maderaPiso = ph('maderaPiso', TEX.maderaPiso, {shininess:14});
  MAT.azulejoPared = ph('azulejoPared', TEX.azulejoPared, {shininess:60, specular:0x333333}); MAT.azulejo = ph('azulejo', TEX.azulejo, {shininess:50, specular:0x2a2a2a});
  MAT.damero = ph('damero', TEX.damero, {shininess:40, specular:0x282828});
  MAT.plastico = ph('plastico', null, {shininess:22, specular:0x1c1c1c}); MAT.metal = ph('metal', null, {shininess:70, specular:0x555555});
  MAT.tabla = new THREE.MeshPhongMaterial({map:TEX.tabla, shininess:6});
  MAT.vidrio = new THREE.MeshPhongMaterial({color:0x223040, transparent:true, opacity:0.35, shininess:90, specular:0x888888, depthWrite:false, side:THREE.DoubleSide});
}
/* ================================================================ calcos de sombra: cuadriláteros negros con alfa pegados al piso y al techo */
const CALCOS = {franja:{pos:[], uv:[]}, mancha:{pos:[], uv:[]}};
function calco(tipo, a, b, c, d){ const C = CALCOS[tipo], P = [a, b, c, d], U = [[0, 0], [1, 0], [1, 1], [0, 1]]; for(const k of [0, 1, 2, 0, 2, 3]){ C.pos.push(P[k][0], P[k][1], P[k][2]); C.uv.push(U[k][0], U[k][1]); } }
/* franja al pie de una pared: desde la línea (x0,z0)-(x1,z1) hacia adentro (nx,nz), de ancho w, a la altura y */
function franja(x0, z0, x1, z1, nx, nz, w, y){ calco('franja', [x0, y, z0], [x0 + nx*w, y, z0 + nz*w], [x1 + nx*w, y, z1 + nz*w], [x1, y, z1]); }
function manchaSuelo(x0, x1, z0, z1, y){ calco('mancha', [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]); }
function mallasCalcos(){ const out = [];
  for(const [k, op] of [['franja', 0.42], ['mancha', 0.55]]){ const C = CALCOS[k]; if(!C.pos.length) continue; const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(C.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(C.uv, 2)); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({map:TEX[k], transparent:true, opacity:op, depthWrite:false, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-4}));
    m.renderOrder = 2; m.matrixAutoUpdate = false; m.name = 'calco_' + k; out.push(m); C.pos = []; C.uv = []; }
  return out; }

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
