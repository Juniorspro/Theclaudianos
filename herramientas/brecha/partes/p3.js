if(!window.THREE){ document.getElementById("carga").textContent = T("NO SE PUDO CARGAR EL MOTOR 3D"); throw new Error("sin three"); }

/* ====================== escena ====================== */
const cv3 = $('lienzo3d'), cvH = $('hud'), hx = cvH.getContext('2d');
/* en un teléfono se arranca sin multimuestreo (0,8) y se sube sola si sobra */
let ANCHO = 892, ALTO = 412, R = 1, CALIDAD = (matchMedia && matchMedia('(pointer: coarse)').matches) ? 0.8 : 1, RH = 1;
const ren = new THREE.WebGLRenderer({canvas:cv3, antialias:false, powerPreference:'high-performance'});
ren.outputEncoding = THREE.sRGBEncoding; ren.autoClear = false;
ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFShadowMap;
const escena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(62, 2, 0.05, 600);
const vmEscena = new THREE.Scene(), vmCam = new THREE.PerspectiveCamera(52, 2, 0.01, 5);
escena.add(cam);
const colL = h => new THREE.Color(h).convertSRGBToLinear();
function medir(){
  const w = cv3.clientWidth, h = cv3.clientHeight; if(!w || !h) return;
  ANCHO = w; ALTO = h;
  R = Math.min(window.devicePixelRatio||1, 1.5)*CALIDAD; RH = Math.max(1, Math.min(window.devicePixelRatio||1, 2)*Math.min(1, CALIDAD*1.25 - 0.15));
  ren.setPixelRatio(R); ren.setSize(w, h, false);
  cvH.width = Math.round(w*RH); cvH.height = Math.round(h*RH);
  cam.aspect = w/h; cam.updateProjectionMatrix(); vmCam.aspect = w/h; vmCam.updateProjectionMatrix();
}
window.addEventListener('resize', medir);
if(window.ResizeObserver) new ResizeObserver(medir).observe(cv3);
/* calidad que se adapta al intervalo real entre cuadros (el costo es pintar píxeles) */
/* (antes se tiraban los cuadros de más de 100 ms: en un aparato lento de verdad no se medía nada y la calidad no bajaba nunca.
   Ahora cuentan hasta 1,5 s; se saltean los primeros cuadros de cada misión (compilar shaders) y se vuelve a empezar tras una pausa) */
const COSTO = {n:0, s:0, ult:0, desde:0};
const CALIDAD_FIJA = {alta:1, media:0.7, baja:0.45};
function costoDeNuevo(){ COSTO.ult = 0; COSTO.n = 0; COSTO.s = 0; COSTO.desde = performance.now() + 1200; }
function fijarCalidad(c, aprendida){ CALIDAD = c; ren.shadowMap.enabled = sol.castShadow = CALIDAD >= 0.75; medir(); if(aprendida && typeof G !== 'undefined'){ G.calAuto = +c.toFixed(2); guardar(); } }
function medirCosto(ts){
  if(ts < COSTO.desde){ COSTO.ult = ts; return; }
  if(COSTO.ult){ const d = ts - COSTO.ult; if(d < 1500){ COSTO.s += d; COSTO.n++; } } COSTO.ult = ts;
  const m = COSTO.n ? COSTO.s/COSTO.n : 0;
  if(COSTO.n >= 40 || (COSTO.n >= 8 && m > 45)){ COSTO.s = 0; COSTO.n = 0; if(G.graficos && G.graficos !== 'auto') return;
    if(m > 21 && CALIDAD > 0.4) fijarCalidad(Math.max(0.4, CALIDAD - (m > 60 ? 0.3 : m > 30 ? 0.2 : 0.1)), true);
    else if(m < 17.5 && CALIDAD < 1) fijarCalidad(Math.min(1, CALIDAD + 0.05), true); } }

/* luces: el sol manda afuera (la clave de costado adentro), el hemisferio sólo rellena la sombra, la lámpara sigue
   al jugador, dos luces «de techo» se mudan a los tubos más cercanos y el fogonazo es del disparo */
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); escena.add(hemi);
const sol = new THREE.DirectionalLight(0xffffff, 1); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
sol.shadow.camera.left = -34; sol.shadow.camera.right = 34; sol.shadow.camera.top = 34; sol.shadow.camera.bottom = -34; sol.shadow.camera.near = 1; sol.shadow.camera.far = 160;
sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.05;
escena.add(sol); escena.add(sol.target);
const lampara = new THREE.PointLight(0xffe0b0, 0, 14, 1.2); escena.add(lampara);
const fogonazo = new THREE.PointLight(0xffc070, 0, 9, 1.3); escena.add(fogonazo);
const techoL = [new THREE.PointLight(0xfff4e0, 0, 9, 1.25), new THREE.PointLight(0xfff4e0, 0, 9, 1.25)]; for(const l of techoL) escena.add(l);
const SOLDIR = V3pre(0.5, 0.6, 0.6).normalize();
function V3pre(x, y, z){ return new THREE.Vector3(x, y, z); }
/* niebla con color de sol: hacia el sol la bruma se dora (el horizonte deja de verse como donde termina el mundo) */
const NIEBLA_U = {fogSolVista:{value:V3pre(0, 0, -1)}, fogColorSol:{value:new THREE.Color(1, 0.8, 0.6)}, fogSolK:{value:0}};
function parcheNiebla(m){
  if(m.userData.niebla) return m; m.userData.niebla = true;
  const previo = m.onBeforeCompile, clave = m.customProgramCacheKey.call(m);
  m.onBeforeCompile = (sh, r)=>{ if(previo) previo.call(m, sh, r);
    Object.assign(sh.uniforms, NIEBLA_U);
    sh.vertexShader = sh.vertexShader.replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>\n#ifdef USE_FOG\nvarying vec3 vNieblaP;\n#endif').replace('#include <fog_vertex>', '#include <fog_vertex>\n#ifdef USE_FOG\nvNieblaP = mvPosition.xyz;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\n#ifdef USE_FOG\nvarying vec3 vNieblaP; uniform vec3 fogSolVista; uniform vec3 fogColorSol; uniform float fogSolK;\n#endif')
      .replace('#include <fog_fragment>', `#ifdef USE_FOG
        float fogFactor = smoothstep(fogNear, fogFar, fogDepth);
        float haciaSol = pow(max(dot(normalize(vNieblaP), fogSolVista), 0.0), 6.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(fogColor, fogColorSol, haciaSol*fogSolK), fogFactor);
      #endif`);
  };
  m.customProgramCacheKey = ()=> clave + '|niebla';
  return m;
}

/* ====================== materiales PBR ====================== */
const MATS = {};
function mat(hex, o){ const k = hex + (o ? JSON.stringify(o) : ''); if(MATS[k]) return MATS[k];
  o = Object.assign({}, o||{}); const em = o.emissive, ei = o.emisivo; delete o.emissive; delete o.emisivo;
  const m = new THREE.MeshStandardMaterial(Object.assign({color:colL(hex), roughness:0.72, metalness:0.05, envMapIntensity:0.6}, o));
  if(em){ m.emissive = colL(em); m.emissiveIntensity = ei !== undefined ? ei : 1; }
  return MATS[k] = parcheNiebla(m); }
const CAJA = new THREE.BoxGeometry(1, 1, 1);
/* cada clave de la obra → qué textura por tema y por tipo de cuarto */
const JUEGOS = [
  {'*':{piso:'hormigon_piso', pared:'hormigon_pared', pared2:'hormigon_pared', techo:'placas_techo', acento:'metal_pintado', marco:'metal_pintado', zocalo:'metal_pintado', columna:'hormigon_pared', barricada:'madera_tablas', carton:'carton', madera:'madera_tablas', metal:'metal_pintado', alfombra:'alfombra'},
   nave:{pared:'chapa', techo:'chapa'}, oficina:{pared:'yeso'}},
  {'*':{piso:'marmol', pared:'yeso', pared2:'madera_noble', techo:'yeso', acento:'alfombra', marco:'madera_noble', zocalo:'madera_noble', columna:'marmol', barricada:'madera_noble', madera:'madera_noble', metal:'metal_pintado', carton:'carton', alfombra:'alfombra'},
   pasillo:{piso:'alfombra'}, oficina:{pared:'madera_noble', piso:'alfombra', techo:'placas_techo'}},
  {'*':{piso:'losa_muelle', pared:'chapa', pared2:'metal_pintado', techo:'chapa', acento:'metal_pintado', contenedor:'chapa', metal:'metal_pintado', asfalto:'asfalto', hormigon:'hormigon_pared'}},
  {'*':{piso:'asfalto', suelo:'tierra_pasto', pared:'hormigon_pared', pared2:'hormigon_pared', metal:'metal_pintado', cerro:'tierra_pasto', hormigon:'hormigon_pared'}},
  {'*':{piso:'chapa_diamante', pared:'hormigon_verde', pared2:'azulejo', techo:'hormigon_pared', acento:'metal_pintado', marco:'metal_pintado', zocalo:'metal_pintado', columna:'hormigon_verde', barricada:'metal_pintado', metal:'metal_pintado', carton:'carton', madera:'madera_tablas'},
   lab:{pared:'azulejo', piso:'azulejo'}, arena:{piso:'hormigon_piso'}},
];
/* metros que cubre cada foto y cuánto la tiñe el color de la obra (las de color propio casi nada) */
const TEXDEF = {hormigon_pared:[2.5,1], hormigon_piso:[3,0.9], chapa:[2,1], carton:[1,0.25], madera_tablas:[1.5,0.3], marmol:[1.2,0.12], alfombra:[1.5,0.12], yeso:[2,0.7],
  madera_noble:[1.5,0.2], asfalto:[3,0.6], losa_muelle:[4,0.6], chapa_diamante:[1.2,0.5], azulejo:[1.2,0.3], hormigon_verde:[2.5,0.35], placas_techo:[1.2,0.25],
  ladrillo:[2,0.2], metal_pintado:[2,1], tierra_pasto:[3,0.55], bolsas_arena:[0.6,0.3]};
let CLAVE_HEX = {}, TEMA_I = 0;
function claveDe(hex){ return CLAVE_HEX[hex] || 'liso'; }
function texInfo(id){ const m = manDe('tex', id), d = TEXDEF[id] || [2, 1];
  return {id, hay:!!ARCH['tex/' + id + '/albedo'], metros:(m && m.metros) || d[0], tk:d[1], medio:m && m.color_medio ? m.color_medio : null,
    normalK:m && m.normalScale ? m.normalScale : 1, rug:m && m.rugosidad ? m.rugosidad : [0.7, 0.9], metal:m && m.metal !== undefined ? m.metal : 0}; }
function defMat(clave, tipo){ const J0 = JUEGOS[TEMA_I] || JUEGOS[0], tt = (J0[tipo] && J0[tipo][clave]) || (J0['*'] && J0['*'][clave]);
  return tt ? texInfo(tt) : null; }
const MATW = {};
function matMundo(clave, tipo){
  const d = defMat(clave, tipo), k = TEMA_I + '|' + (d && d.hay ? d.id : 'liso:' + clave); if(MATW[k]) return MATW[k];
  let m;
  if(d && d.hay){
    const orm = texAsset('tex/' + d.id + '/orm', {color:'rgb(255,' + Math.round((d.rug[0] + d.rug[1])*127) + ',' + Math.round(d.metal*255) + ')'});
    m = new THREE.MeshStandardMaterial({vertexColors:true, map:texAsset('tex/' + d.id + '/albedo', {srgb:true, color:d.medio || '#808080'}), normalMap:texAsset('tex/' + d.id + '/normal', {normal:true}),
      roughnessMap:orm, metalnessMap:orm, aoMap:orm, aoMapIntensity:0.9, roughness:1, metalness:1, envMapIntensity:(d.metal > 0.3 ? 2.2 : 1)*((AMB.L && AMB.L.envK) || 0.3)});
    m.normalScale.set(d.normalK, d.normalK);
  } else m = new THREE.MeshStandardMaterial({vertexColors:true, roughness:0.85, metalness:0.02, envMapIntensity:(AMB.L && AMB.L.envK) || 0.3});
  return MATW[k] = parcheNiebla(m);
}
/* el tinte por vértice lleva el color de diseño a la foto: foto × tinte = color pedido (en lineal), con fuerza tk */
const _tc = new THREE.Color(), _tm = new THREE.Color();
function tinteDe(hex, d){ _tc.copy(colL(hex)); if(!d || !d.hay) return [_tc.r, _tc.g, _tc.b];
  _tm.copy(colL(d.medio || '#808080')); const f = (a, b)=> lerp(1, lim(a/Math.max(b, 0.02), 0, 2.5), d.tk);
  return [f(_tc.r, _tm.r), f(_tc.g, _tm.g), f(_tc.b, _tm.b)]; }

/* ====================== constructor: cajas fundidas por cuarto y por material ======================
   cada cara se parte en celdas (para hornear oclusión por vértice), las UV van en metros de mundo y
   cada caja sólida también queda como caja de choque (para balas y cubiertas) */
const MUNDO = {cajas:[], mallas:[], grupos:[], dinamicos:[]};
const CARAS = [[[1,0,0],[0,0,1]],[[-1,0,0],[0,0,-1]],[[0,1,0],[1,0,0]],[[0,-1,0],[1,0,0]],[[0,0,1],[-1,0,0]],[[0,0,-1],[1,0,0]]];
class Obra {
  constructor(tipo, o){ o = o || {}; this.tipo = tipo || '*'; this.celda = o.celda || 1.25; this.ao = o.ao !== false; this.g = {}; this.caj = []; }
  caja(x, y, z, w, h, d, hex, solida, ry, clave){
    clave = clave || claveDe(hex);
    const G = this.g[clave] || (this.g[clave] = {p:[], n:[], c:[], u:[]}), D = defMat(clave, this.tipo), tn = tinteDe(hex, D), met = D && D.hay ? D.metros : 1;
    const hw = w/2, hh = h/2, hd = d/2, cr = Math.cos(ry||0), sr = Math.sin(ry||0);
    const rot = (a, e)=> [a*cr + e*sr, -a*sr + e*cr];
    for(const [nn, ut] of CARAS){
      /* ejes de la cara en coordenadas de la caja: u (tangente), v (arriba en las paredes) */
      const vt = nn[1] ? [0,0,1] : [0,1,0];
      const ext = v3=> Math.abs(v3[0])*w + Math.abs(v3[1])*h + Math.abs(v3[2])*d;
      const lu = ext(ut), lv = ext(vt), su = Math.min(24, Math.max(1, Math.ceil(lu/this.celda))), sv = Math.min(24, Math.max(1, Math.ceil(lv/this.celda)));
      const [nx, nz] = rot(nn[0], nn[2]), [ux, uz] = rot(ut[0], ut[2]), [vx, vz] = rot(vt[0], vt[2]);
      const cx0 = nn[0]*hw, cy0 = nn[1]*hh, cz0 = nn[2]*hd;
      /* un poco de oscuro en las caras de abajo y de los costados: se leen los bordes */
      const k = nn[1] > 0 ? 1.0 : (nn[1] < 0 ? 0.6 : (Math.abs(nn[0]) ? 0.88 : 0.94));
      const P = (i, j)=>{ const a = (i/su - 0.5)*lu, b = (j/sv - 0.5)*lv;
        const lx = cx0 + ut[0]*a + vt[0]*b, ly = cy0 + ut[1]*a + vt[1]*b, lz = cz0 + ut[2]*a + vt[2]*b, [rx, rz] = rot(lx, lz);
        const X = x + rx, Y = y + ly, Z = z + rz;
        return [X, Y, Z, (X*ux + Y*ut[1] + Z*uz)/met, (X*vx + Y*vt[1] + Z*vz)/met]; };
      for(let i=0;i<su;i++) for(let j=0;j<sv;j++){
        const q = [P(i,j), P(i+1,j), P(i+1,j+1), P(i,j+1)];
        /* el orden de los vértices define la cara de adelante: se decide con el producto cruz contra la normal */
        const e1 = [q[1][0]-q[0][0], q[1][1]-q[0][1], q[1][2]-q[0][2]], e2 = [q[2][0]-q[0][0], q[2][1]-q[0][1], q[2][2]-q[0][2]];
        const cz = (e1[1]*e2[2] - e1[2]*e2[1])*nx + (e1[2]*e2[0] - e1[0]*e2[2])*nn[1] + (e1[0]*e2[1] - e1[1]*e2[0])*nz;
        const orden = cz > 0 ? [0,1,2,0,2,3] : [0,2,1,0,3,2];
        for(const o of orden){ const v = q[o]; G.p.push(v[0], v[1], v[2]); G.n.push(nx, nn[1], nz); G.c.push(tn[0]*k, tn[1]*k, tn[2]*k); G.u.push(v[3], v[4]); }
      }
    }
    /* caja envolvente (para la oclusión y el choque) */
    const ex = Math.abs(hw*cr) + Math.abs(hd*sr), ez = Math.abs(hw*sr) + Math.abs(hd*cr);
    const b = {x0:x-ex, x1:x+ex, y0:y-hh, y1:y+hh, z0:z-ez, z1:z+ez};
    this.caj.push(b);
    if(solida) MUNDO.cajas.push(Object.assign({tipo:solida===true ? 'muro' : solida, mat:(D && D.id) || clave}, b));
    return this;
  }
  /* domo (cerros): media esfera aplastada con UV planas en metros, así la tierra empalma con el piso */
  domo(x, y, z, rx, h, rz, hex, clave){
    clave = clave || claveDe(hex); const G = this.g[clave] || (this.g[clave] = {p:[], n:[], c:[], u:[]}), D = defMat(clave, this.tipo), tn = tinteDe(hex, D), met = D && D.hay ? D.metros : 1;
    const NA = 14, NB = 6, P = (i, j)=>{ const a = i/NA*Math.PI*2, b = j/NB*Math.PI/2, cx = Math.cos(a)*Math.cos(b), cz = Math.sin(a)*Math.cos(b), cy = Math.sin(b);
      const X = x + cx*rx, Y = y + cy*h, Z = z + cz*rz; const nx = cx/rx, ny = cy/h, nz = cz/rz, l = Math.hypot(nx, ny, nz); return [X, Y, Z, nx/l, ny/l, nz/l, X/met, Z/met]; };
    for(let i=0;i<NA;i++) for(let j=0;j<NB;j++){ const q = [P(i,j), P(i+1,j), P(i+1,j+1), P(i,j+1)];
      for(const o of [0,2,1,0,3,2]){ const v = q[o]; G.p.push(v[0], v[1], v[2]); G.n.push(v[3], v[4], v[5]); const k = 0.7 + 0.3*(v[1] - y)/h; G.c.push(tn[0]*k, tn[1]*k, tn[2]*k); G.u.push(v[6], v[7]); } }
    return this;
  }
  /* sólo choque (lo que se ve lo pone un modelo): cuenta para la oclusión y, si es sólida, para las balas */
  choque(x, y, z, w, h, d, solida, ry){
    const cr = Math.cos(ry||0), sr = Math.sin(ry||0), ex = Math.abs(w/2*cr) + Math.abs(d/2*sr), ez = Math.abs(w/2*sr) + Math.abs(d/2*cr);
    const b = {x0:x-ex, x1:x+ex, y0:y-h/2, y1:y+h/2, z0:z-ez, z1:z+ez}; this.caj.push(b);
    if(solida) MUNDO.cajas.push(Object.assign({tipo:solida===true ? 'muro' : solida}, b));
    return this;
  }
  /* oclusión por vértice: cuánto de cada caja cercana queda DELANTE de la cara (así los vecinos en el mismo plano no cuentan) */
  hornearAO(G){
    const p = G.p, n = G.n, c = G.c, R = 0.75, cs = this.caj;
    for(let i=0;i<p.length;i+=3){
      const X = p[i], Y = p[i+1], Z = p[i+2], nx = n[i], ny = n[i+1], nz = n[i+2]; let occ = 0;
      for(const b of cs){
        if(X < b.x0 - R || X > b.x1 + R || Y < b.y0 - R || Y > b.y1 + R || Z < b.z0 - R || Z > b.z1 + R) continue;
        /* recorte al semiespacio de adelante (sólo caras alineadas: las giradas no se recortan) */
        let x0 = b.x0, x1 = b.x1, y0 = b.y0, y1 = b.y1, z0 = b.z0, z1 = b.z1; const e = 0.004;
        if(nx > 0.9) x0 = Math.max(x0, X + e); else if(nx < -0.9) x1 = Math.min(x1, X - e);
        else if(ny > 0.9) y0 = Math.max(y0, Y + e); else if(ny < -0.9) y1 = Math.min(y1, Y - e);
        else if(nz > 0.9) z0 = Math.max(z0, Z + e); else if(nz < -0.9) z1 = Math.min(z1, Z - e); else continue;
        if(x0 >= x1 || y0 >= y1 || z0 >= z1) continue;
        const dx = Math.max(x0 - X, 0, X - x1), dy = Math.max(y0 - Y, 0, Y - y1), dz = Math.max(z0 - Z, 0, Z - z1), dd = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if(dd >= R) continue;
        const grueso = Math.min(1, (Math.abs(nx)*(x1 - x0) + Math.abs(ny)*(y1 - y0) + Math.abs(nz)*(z1 - z0))/0.5);
        const f = 1 - dd/R; occ += f*f*grueso;
      }
      const ao = Math.max(0.42, 1 - 0.55*Math.min(1.1, occ));
      c[i] *= ao; c[i+1] *= ao; c[i+2] *= ao;
    }
  }
  /* afuera no se hornea: oscuro abajo y claro arriba en lo vertical (el cielo se ve menos cerca del piso) */
  hornearAire(G){ const p = G.p, n = G.n, c = G.c;
    for(let i=0;i<p.length;i+=3){ if(Math.abs(n[i+1]) > 0.5) continue; const ao = 0.62 + 0.38*lim(p[i+1]/2.2, 0, 1); c[i] *= ao; c[i+1] *= ao; c[i+2] *= ao; } }
  malla(sombras){
    const grupo = new THREE.Group();
    for(const clave in this.g){ const G = this.g[clave]; if(!G.p.length) continue;
      if(this.ao) this.hornearAO(G); else this.hornearAire(G);
      const g = new THREE.BufferGeometry(), uv = new THREE.Float32BufferAttribute(G.u, 2);
      g.setAttribute('position', new THREE.Float32BufferAttribute(G.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(G.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(G.c, 3)); g.setAttribute('uv', uv); g.setAttribute('uv2', uv);
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, matMundo(clave, this.tipo)); m.receiveShadow = true; m.castShadow = !!sombras; m.userData.clave = clave;
      grupo.add(m); MUNDO.mallas.push(m); }
    escena.add(grupo); MUNDO.grupos.push(grupo); this.g = {};
    return grupo;
  }
}

/* ====================== ambiente por tema: cielo, reflejos, niebla, luces y grado de color ====================== */
/* sol (sólo afuera manda), relleno, lámpara del jugador, luces de techo, exposición y grado */
const LUZ_TEMA = [
  {solI:0.55, sol:'#bcd0ff', hemiI:0.32, amb:'#8a98b0', suelo:'#3a3430', lamparaI:0.7, lampara:'#ffd9a8', techoI:1.25, techo:'#e8f0ff', tubo:3.6, expo:0.82, envK:0.16,
   grado:{lift:[0.012,0.018,0.026], gamma:[1,1,1.02], gain:[1.02,1,0.97], sat:0.88, contraste:1.06, frio:[0.9,0.98,1.1], calido:[1.08,1,0.9], viñeta:0.42, grano:0.04}},
  {solI:0.45, sol:'#ffd6a0', hemiI:0.3, amb:'#6a5a70', suelo:'#2a201a', lamparaI:0.85, lampara:'#ffcf96', techoI:1.5, techo:'#ffd9a8', tubo:3.4, expo:0.85, envK:0.16,
   grado:{lift:[0.02,0.01,0.018], gamma:[1.02,1,0.98], gain:[1.06,0.99,0.92], sat:0.95, contraste:1.1, frio:[0.88,0.95,1.12], calido:[1.12,1,0.86], viñeta:0.5, grano:0.045}},
  {solI:3.2, sol:'#ffb070', hemiI:0.42, amb:'#7a88b8', suelo:'#3a3028', lamparaI:0, lampara:'#ffc08a', techoI:0, techo:'#fff', tubo:4, expo:0.9, exterior:true, envK:0.35,
   grado:{lift:[0.01,0.012,0.03], gamma:[1,1,1], gain:[1.05,1,0.95], sat:1.05, contraste:1.08, frio:[0.86,0.97,1.14], calido:[1.12,1,0.84], viñeta:0.38, grano:0.035}},
  {solI:2.6, sol:'#fff0d8', hemiI:0.38, amb:'#a8c0e0', suelo:'#6a5a44', lamparaI:0, lampara:'#fff4dc', techoI:0, techo:'#fff', tubo:4, expo:0.8, exterior:true, envK:0.3,
   grado:{lift:[0.006,0.008,0.014], gamma:[1,1,1], gain:[1.03,1.01,0.97], sat:1.02, contraste:1.07, frio:[0.94,0.99,1.07], calido:[1.06,1,0.93], viñeta:0.3, grano:0.03}},
  {solI:0.4, sol:'#a8ffd0', hemiI:0.3, amb:'#4a6a5a', suelo:'#1a201a', lamparaI:0.8, lampara:'#d8ffe6', techoI:1.4, techo:'#c8ffe0', tubo:3.2, expo:0.9, envK:0.16,
   grado:{lift:[0.006,0.02,0.012], gamma:[0.98,1.02,0.99], gain:[0.96,1.04,0.98], sat:0.82, contraste:1.14, frio:[0.9,1.04,1.02], calido:[1.04,1.02,0.9], viñeta:0.5, grano:0.05}},
];
const PMREM = new THREE.PMREMGenerator(ren);
const AMB = {env:null, cielo:null, luces:[]};
/* entorno de respaldo (o de interior) dibujado: cielo, horizonte y piso; adentro, tubos de luz en el techo */
function envDibujado(t, L, man){
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  const hz = man ? (typeof man.horizonte === 'object' ? man.horizonte.color_opuesto : man.horizonte) : null;
  if(L.exterior){ gr.addColorStop(0, man ? man.cenit : '#4a6a9a'); gr.addColorStop(0.47, hz || t.cielo); gr.addColorStop(0.53, man ? man.bruma_opuesta : t.cielo); gr.addColorStop(1, t.suelo); }
  else { gr.addColorStop(0, t.techo); gr.addColorStop(0.35, t.pared); gr.addColorStop(0.6, t.pared2); gr.addColorStop(1, t.piso); }
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  if(!L.exterior){ g.fillStyle = L.techo; for(let k=0;k<8;k++){ g.fillRect(k*32 + 6, 10, 18, 5); g.fillRect(k*32 + 20, 26, 12, 4); } }
  const tx = new THREE.CanvasTexture(c); tx.mapping = THREE.EquirectangularReflectionMapping; tx.encoding = THREE.sRGBEncoding; return tx;
}
function ponerEntorno(tx){ const rt = PMREM.fromEquirectangular(tx); if(AMB.env) AMB.env.dispose(); AMB.env = rt; escena.environment = rt.texture; vmEscena.environment = rt.texture; }
/* la dirección del sol pintado: u=az/360 → ángulo de three (atan(z,x)) */
function dirDeCielo(az, elev){ const phi = (az/360 - 0.5)*Math.PI*2, e = elev*Math.PI/180; return V3pre(Math.cos(phi)*Math.cos(e), Math.sin(e), Math.sin(phi)*Math.cos(e)).normalize(); }
function aplicarTema(t){
  const antes = TEMA_I;
  TEMA_I = Math.max(0, TEMAS.indexOf(t)); const L = LUZ_TEMA[TEMA_I] || LUZ_TEMA[0];
  /* lo del tema anterior se suelta: materiales del mundo y sus fotos (las del tema nuevo se piden al armar el nivel) */
  if(antes !== TEMA_I){ for(const k in MATW) if(!k.startsWith(TEMA_I + '|')){ MATW[k].dispose(); delete MATW[k]; }
    const usa = new Set(); for(const tipo in JUEGOS[TEMA_I]) for(const c in JUEGOS[TEMA_I][tipo]) for(const s of ['albedo','normal','orm']) usa.add('tex/' + JUEGOS[TEMA_I][tipo][c] + '/' + s);
    soltarTexturas('tex/', usa); soltarTexturas('cielo/', new Set(TEMA_I===2 ? ['cielo/cielo_puerto'] : (TEMA_I===3 ? ['cielo/cielo_autopista'] : []))); }
  CLAVE_HEX = {}; for(const [hex, k] of [[t.suelo,'suelo'],[t.techo,'techo'],[t.acento,'acento'],[t.piso,'piso'],[t.pared2,'pared2'],[t.pared,'pared']]) CLAVE_HEX[hex] = k;
  const idCielo = TEMA_I===2 ? 'cielo_puerto' : (TEMA_I===3 ? 'cielo_autopista' : null), man = idCielo ? manDe('cielo', idCielo) : null;
  /* niebla del color de la bruma medida en el panorama (si no coincide, el horizonte es donde termina el mundo) */
  const colNiebla = man ? (man.bruma_opuesta || t.cielo) : t.cielo;
  escena.fog = new THREE.Fog(colL(colNiebla), t.niebla[0], t.niebla[1]);
  NIEBLA_U.fogColorSol.value.copy(colL(man ? (man.bruma_sol || colNiebla) : colNiebla)); NIEBLA_U.fogSolK.value = man ? 0.9 : 0;
  if(man && ARCH['cielo/' + idCielo]){ const tx = texAsset('cielo/' + idCielo, {srgb:true, repetir:false, sinMips:true, color:man.bruma_opuesta || t.cielo}); tx.mapping = THREE.EquirectangularReflectionMapping;
    escena.background = tx; SOLDIR.copy(dirDeCielo(man.sol.az, Math.max(8, man.sol.elev)));
    ponerEntorno(envDibujado(t, L, man));
    /* r128 pasa el panorama a cubo UNA vez (la primera que lo dibuja, con el marcador de 4×4): al llegar la foto hay que soltarla para que lo rehaga */
    decImagen('cielo/' + idCielo, true).then(im=>{ if(!im || TEMA_I !== TEMAS.indexOf(J.tema)) return; setTimeout(()=>{ tx.dispose(); escena.background = tx; ponerEntorno(tx); }, 0); });
  } else {
    escena.background = colL(t.cielo);
    SOLDIR.set(L.exterior ? 0.45 : 0.55, L.exterior ? 0.62 : 0.8, 0.64).normalize();
    ponerEntorno(envDibujado(t, L, null));
  }
  hemi.color = colL(L.amb); hemi.groundColor = colL(L.suelo); hemi.intensity = L.hemiI;
  sol.color = colL(L.sol); sol.intensity = L.solI;
  lampara.color = colL(L.lampara); lampara.intensity = L.lamparaI;
  for(const l of techoL){ l.color = colL(L.techo); l.intensity = 0; }
  AMB.L = L; AMB.luces = [];
  Object.assign(POST.grado, L.grado, {expo:L.expo});
  /* afuera el sol deja muchas caras por encima de 1,25: el umbral del resplandor sube, o todo lo soleado brilla como neón */
  MAT_BAJA.uniforms.umbral.value = L.umbral || (L.exterior ? 2.3 : 1.25);
  for(const k in MATW){ const m = MATW[k]; m.envMapIntensity = (m.metalness > 0.3 && m.metalnessMap ? 2.2 : 1)*(L.envK || 0.3); }
  /* el arma en la mano recibe la luz del lugar (si no, brilla igual en un búnker que al sol) */
  if(VM.luzH){ VM.luzH.color = colL(L.amb); VM.luzH.groundColor = colL(L.suelo); VM.luzH.intensity = 0.35 + L.hemiI*0.9; VM.luzD.color = colL(L.exterior ? L.sol : L.lampara); VM.luzD.intensity = L.exterior ? 0.6 + L.solI*0.35 : 0.9; VM.luzC.intensity = L.exterior ? 0.25 : 0.4; }
  if(!POST.ok) ren.toneMappingExposure = L.expo;
}
/* cada cuadro: el sol sigue a la cámara de a un texel (si no, los bordes de sombra titilan) y las luces de techo van a los tubos más cercanos */
const _lx = V3pre(0,0,0), _ly = V3pre(0,0,0), _sc = V3pre(0,0,0), _fw2 = V3pre(0,0,0);
function luzSigue(){
  const cp = cam.position; cam.getWorldDirection(_fw2);
  _sc.copy(cp).addScaledVector(_fw2, 14); _sc.y = 0;
  const texel = (sol.shadow.camera.right - sol.shadow.camera.left)/sol.shadow.mapSize.x;
  _lx.crossVectors(ARRIBA, SOLDIR).normalize(); _ly.crossVectors(SOLDIR, _lx);
  const u = Math.round(_sc.dot(_lx)/texel)*texel, v = Math.round(_sc.dot(_ly)/texel)*texel, w = _sc.dot(SOLDIR);
  sol.target.position.set(0,0,0).addScaledVector(_lx, u).addScaledVector(_ly, v).addScaledVector(SOLDIR, w);
  sol.position.copy(sol.target.position).addScaledVector(SOLDIR, 90);
  NIEBLA_U.fogSolVista.value.copy(SOLDIR).transformDirection(cam.matrixWorldInverse);
  const L = AMB.L; if(!L || !L.techoI || !AMB.luces.length) return;
  const orden = AMB.luces.map(p=> [p, p.distanceToSquared(cp) - Math.max(0, _fw2.dot(_sc.subVectors(p, cp)))*6]).sort((a,b)=> a[1] - b[1]);
  for(let i=0;i<techoL.length;i++){ const o = orden[i]; if(!o){ techoL[i].intensity = 0; continue; } techoL[i].position.copy(o[0]).add(_ly.set(0, -0.35, 0)); techoL[i].intensity = L.techoI*(J.cegado ? 0.3 : 1); }
}

/* una pared a lo largo de x o de z con huecos (puertas, ventanas) */
function pared(O, eje, fijo, a0, a1, y0, y1, grosor, hex, huecos){
  huecos = (huecos||[]).slice().sort((p,q)=> p.a0 - q.a0);
  let a = a0; const pone = (u0, u1, v0, v1)=>{ if(u1 - u0 < 0.01 || v1 - v0 < 0.01) return; const cu = (u0+u1)/2, cv = (v0+v1)/2;
    if(eje==='x') O.caja(cu, cv, fijo, u1-u0, v1-v0, grosor, hex, true); else O.caja(fijo, cv, cu, grosor, v1-v0, u1-u0, hex, true); };
  for(const h of huecos){ pone(a, h.a0, y0, y1); pone(h.a0, h.a1, y0, h.y0); pone(h.a0, h.a1, h.y1, y1); a = h.a1; }
  pone(a, a1, y0, y1);
}
function limpiarMundo(){
  for(const g of MUNDO.grupos) escena.remove(g);
  for(const m of MUNDO.mallas){ m.geometry.dispose(); }
  for(const o of MUNDO.dinamicos){ escena.remove(o); }
  MUNDO.cajas = []; MUNDO.mallas = []; MUNDO.grupos = []; MUNDO.dinamicos = []; AMB.luces = []; MUNDO.agua = null;
}
const dinamico = o => { escena.add(o); MUNDO.dinamicos.push(o); return o; };

/* ====================== utilería ====================== */
function pila(O, x, z, t, rot){ const n = ri(1,3), s = rf(0.9,1.2), col = elegir(['#b0885a','#9a7a52','#8a8f7a','#7a6a52']);
  /* modelos: cajones de madera, o un pallet con cajas si la pila es alta (el azar visual no toca la semilla del nivel) */
  const pallet = n >= 2 && hayModelo('prop_pallet') && Math.random() < 0.5;
  if(pallet) ponerProp('prop_pallet', x, 0, z, rot, s*1.05, n*s*0.95, s*1.05);
  for(let i=0;i<n;i++){ const ss = s*(i ? rf(0.75,0.95) : 1), px = x + rf(-0.1,0.1), py = ss/2 + i*s*0.95, pz = z + rf(-0.1,0.1), pr = rot + rf(-0.2,0.2)*(i?1:0);
    if(pallet) O.choque(px, py, pz, ss, ss*0.95, ss, 'cubierta', pr);
    else if(ponerProp('prop_caja', px, py - ss*0.475, pz, pr, ss, ss*0.95, ss)) O.choque(px, py, pz, ss, ss*0.95, ss, 'cubierta', pr);
    else O.caja(px, py, pz, ss, ss*0.95, ss, col, 'cubierta', pr, 'carton'); }
  return n*s*0.95; }
function barril(O, x, z, rojo){ if(ponerProp('prop_barril', x, 0, z, Math.random()*6.3, 0.64, 1.0, 0.64)){ O.choque(x, 0.5, z, 0.62, 1.0, 0.62, 'cubierta'); return; }
  O.caja(x, 0.5, z, 0.62, 1.0, 0.62, rojo ? '#b8382a' : '#4a6a8a', 'cubierta', 0, 'metal'); O.caja(x, 1.0, z, 0.66, 0.05, 0.66, '#2a2e33', false, 0, 'metal'); }
function barricada(O, x, z, w, t, rot){ if(ponerProp('prop_bolsas', x, 0, z, (rot||0) + (Math.random() < 0.5 ? Math.PI : 0), w + 0.1, 1.18, 0.62)){ O.choque(x, 0.58, z, w, 1.16, 0.4, 'cubierta', rot||0); return; }
  O.caja(x, 0.58, z, w, 1.16, 0.4, t.pared2, 'cubierta', rot||0, 'barricada'); O.caja(x, 1.18, z, w + 0.1, 0.06, 0.46, t.acento, false, rot||0, 'metal'); }
function mesa(O, x, z, t, larga){ const w = larga ? 2.2 : 1.4;
  if(ponerProp('prop_escritorio', x, 0, z, Math.random() < 0.5 ? 0 : Math.PI, w, 0.8, 0.85)){ O.choque(x, 0.76, z, w, 0.08, 0.8, 'cubierta'); O.choque(x, 0.38, z, w - 0.1, 0.72, 0.1, 'cubierta'); return; }
  O.caja(x, 0.76, z, w, 0.08, 0.8, '#6a4a34', 'cubierta', 0, 'madera'); O.caja(x, 0.38, z, w - 0.1, 0.72, 0.1, '#4a3424', 'cubierta', 0, 'madera'); }
function columna(O, x, z, alto, t){ O.caja(x, alto/2, z, 0.7, alto, 0.7, t.pared2, 'cubierta', 0, 'columna'); O.caja(x, 0.1, z, 0.84, 0.2, 0.84, t.piso, false, 0, 'zocalo'); O.caja(x, alto - 0.12, z, 0.84, 0.24, 0.84, t.techo, false, 0, 'zocalo'); }

/* decoración contra las paredes (autoelevador en la nave, racks en el búnker): fuera del paso y sin tocar la semilla */
function decorar(O, c, t){
  const p = c.plan, W = c.W, cx = c.cx, A = Math.random;
  if(p.tipo==='nave' && hayModelo('prop_autoelevador') && A() < 0.8){ const s = A() < 0.5 ? -1 : 1, z = lerp(c.z1 + 3, c.z0 - 7, A());
    ponerProp('prop_autoelevador', cx + s*(W/2 - 1.6), 0, z, s > 0 ? Math.PI/2 : -Math.PI/2); O.choque(cx + s*(W/2 - 1.6), 1.1, z, 1.3, 2.2, 2.4, false); }
  if((p.tipo==='lab' || p.tipo==='hall') && TEMAS.indexOf(t)===4 && hayModelo('prop_rack')){ for(let k=0;k<4;k++){ const s = A() < 0.5 ? -1 : 1, z = lerp(c.z1 + 2, c.z0 - 3, A());
    ponerProp('prop_rack', cx + s*(W/2 - 0.45), 0, z, s > 0 ? -Math.PI/2 : Math.PI/2, 0.7, 2.0, 1.0); } }
}
/* ====================== niveles interiores: cuartos en fila hacia −z ======================
   cada cuarto trae su evento: combate (con cubierta para el jugador), brecha, apariciones, captor o jefe */
function planInterior(mis){
  const T = mis.tipo;
  if(T==='asalto') return [
    {tipo:'pasillo', ev:'nada', msj:'ENTRADA'}, {tipo:'nave', ev:'combate', olas:2}, {tipo:'pasillo', ev:'apariciones'},
    {tipo:'nave', ev:'combate', olas:2}, {tipo:'oficina', ev:'brecha', rehenes:1}, {tipo:'nave', ev:'combate', olas:3, pesado:true}, {tipo:'oficina', ev:'brecha', rehenes:2, final:true}];
  if(T==='rehenes') return [
    {tipo:'hall', ev:'combate', olas:2}, {tipo:'salon', ev:'brecha', rehenes:2}, {tipo:'pasillo', ev:'apariciones'},
    {tipo:'salon', ev:'captor'}, {tipo:'hall', ev:'combate', olas:2, escudo:true}, {tipo:'salon', ev:'brecha', rehenes:3, captor:true}, {tipo:'oficina', ev:'brecha', rehenes:1, final:true, vip:true}];
  return [ /* búnker */
    {tipo:'hall', ev:'combate', olas:2, escudo:true}, {tipo:'pasillo', ev:'apariciones'}, {tipo:'lab', ev:'combate', olas:3, pesado:true, escudo:true},
    {tipo:'lab', ev:'brecha', rehenes:2, captor:true}, {tipo:'pasillo', ev:'apariciones'}, {tipo:'arena', ev:'jefe'}];
}
function generarInterior(mis, t){
  const plan = planInterior(mis), cuartos = [];
  let z = 0, xPuerta = 0;
  for(let i=0;i<plan.length;i++){
    const p = plan[i], O = new Obra(p.tipo);
    const W = p.tipo==='pasillo' ? rf(3.2,3.8) : (p.tipo==='nave' ? rf(13,17) : (p.tipo==='arena' ? 22 : rf(9,12)));
    const L = p.tipo==='pasillo' ? rf(10,15) : (p.tipo==='nave' ? rf(18,24) : (p.tipo==='arena' ? 26 : rf(11,14)));
    const H = p.tipo==='nave' ? 6.5 : (p.tipo==='arena' ? 8 : (p.tipo==='hall' ? 5 : 3.4));
    /* los pasillos se centran en la puerta por la que se entra (si no, la cámara queda metida en la pared) */
    const cx = p.tipo==='pasillo' ? xPuerta : 0;
    const z0 = z, z1 = z - L, xSal = p.tipo==='pasillo' ? cx : lim(rf(-W/4, W/4), -W/2 + 1.4, W/2 - 1.4);
    const c = {i, plan:p, W, L, H, z0, z1, cx, xEnt:xPuerta, xSal, puestos:[], aparece:[], O};
    /* piso, techo y paredes (la de adelante la puso el cuarto anterior) */
    O.caja(cx, -0.1, (z0+z1)/2, W + 0.6, 0.2, L, t.piso, true); O.caja(cx, H + 0.1, (z0+z1)/2, W + 0.6, 0.2, L, t.techo, true);
    const ventanas = [];
    if(p.tipo!=='pasillo' && p.tipo!=='lab' && p.tipo!=='arena') for(let k=0;k<ri(1,3);k++){ const a = rf(z1 + 2, z0 - 3.5); ventanas.push({a0:a, a1:a + rf(1.4,2.2), y0:H*0.45, y1:H*0.8}); }
    const lados = p.tipo==='pasillo' ? [0,1].map(()=> rnd() < 0.8 ? [{a0: rf(z1 + 2, z0 - 3), a1:0, y0:0, y1:2.3}] : []) : [[],[]];
    for(const l of lados) for(const h of l) h.a1 = h.a0 + 1.3;
    c.laterales = [];
    for(const [s, hs] of [[-1, lados[0].concat(ventanas.filter((_,k)=> k%2===0))], [1, lados[1].concat(ventanas.filter((_,k)=> k%2===1))]]){
      pared(O, 'z', cx + s*(W/2 + 0.15), z1, z0, 0, H, 0.3, t.pared, hs);
      for(const h of hs) if(h.y0 === 0){ c.laterales.push({x:cx + s*(W/2 + 1.2), z:(h.a0+h.a1)/2, s}); O.caja(cx + s*(W/2 + 1.3), H/2, (h.a0+h.a1)/2, 2, H, 1.9, t.pared2, true); O.caja(cx + s*(W/2 + 1.3), -0.1, (h.a0+h.a1)/2, 2.2, 0.2, 2, t.piso); }
      for(const h of hs) if(h.y0 > 0){ const lz = (h.a0+h.a1)/2; const vid = new THREE.Mesh(CAJA, mat(t.noche ? '#2a3a5a' : '#dff0ff', {emissive: t.noche ? '#101830' : '#9ab8d0'}));
        vid.scale.set(0.05, h.y1 - h.y0, h.a1 - h.a0); vid.position.set(cx + s*(W/2 + 0.2), (h.y0+h.y1)/2, lz); dinamico(vid); }
    }
    const puertaFondo = {a0:xSal - 0.8, a1:xSal + 0.8, y0:0, y1:2.4};
    const ultimo = i === plan.length - 1;
    pared(O, 'x', z1, cx - W/2 - 0.3, cx + W/2 + 0.3, 0, H, 0.3, t.pared, ultimo ? [] : [puertaFondo]);
    /* la pared de entrada: la primera, o si este cuarto es más ancho que el anterior, los costados que sobran */
    if(i===0) pared(O, 'x', z0, cx - W/2 - 0.3, cx + W/2 + 0.3, 0, H, 0.3, t.pared, [{a0:xPuerta - 0.8, a1:xPuerta + 0.8, y0:0, y1:2.4}]);
    else { const a = cuartos[i-1]; pared(O, 'x', z0, cx - W/2 - 0.3, cx + W/2 + 0.3, 0, H, 0.3, t.pared, [{a0:a.cx - a.W/2 - 0.3, a1:a.cx + a.W/2 + 0.3, y0:0, y1:Math.min(H, a.H)}]); }
    /* marco de la puerta de salida y zócalos: los bordes son lo que se lee */
    if(!ultimo){ O.caja(xSal - 0.85, 1.2, z1, 0.1, 2.5, 0.4, t.acento, false, 0, 'marco'); O.caja(xSal + 0.85, 1.2, z1, 0.1, 2.5, 0.4, t.acento, false, 0, 'marco'); O.caja(xSal, 2.45, z1, 1.8, 0.1, 0.4, t.acento, false, 0, 'marco'); }
    for(const s of [-1,1]) O.caja(cx + s*(W/2), 0.08, (z0+z1)/2, 0.06, 0.16, L, t.pared2, false, 0, 'zocalo');
    /* luces del techo (planos emisivos: no suman luces al shader) */
    for(let lz = z0 - 2.5; lz > z1 + 1; lz -= p.tipo==='pasillo' ? 3.5 : 5){ const tubo = new THREE.Mesh(CAJA, mat('#ffffff', {emissive:AMB.L.techo, emisivo:AMB.L.tubo})); tubo.scale.set(p.tipo==='pasillo' ? 0.2 : 1.4, 0.05, p.tipo==='pasillo' ? 1.2 : 0.2); tubo.position.set(cx, H - 0.03, lz); dinamico(tubo); AMB.luces.push(tubo.position.clone()); }
    /* cubierta del jugador (si hay combate): barricada a 3,5 m de la entrada */
    const xc = lim(xPuerta + rf(-1.5, 1.5), -W/2 + 1.5, W/2 - 1.5);
    if(p.ev==='combate' || p.ev==='jefe' || p.ev==='captor'){ c.cubierta = {x:xc, z:z0 - 3.4}; barricada(O, xc, z0 - 4.1, 2.2, t); }
    /* utilería por tipo, dejando libre el eje de paso (entrada → cubierta → salida) */
    const libre = (x, zz, r)=> Math.abs(x - lerp(xPuerta, xSal, (z0 - zz)/L)) > r && !(c.cubierta && Math.hypot(x - c.cubierta.x, zz - c.cubierta.z) < 2.6) && zz < z0 - 2 && zz > z1 + 1.5;
    const nProps = p.tipo==='pasillo' ? 0 : (p.tipo==='nave' ? ri(7,10) : (p.tipo==='arena' ? 9 : ri(4,6)));
    for(let k=0, intentos=0; k<nProps && intentos < 80; intentos++){
      const x = rf(-W/2 + 1.2, W/2 - 1.2), zz = rf(z1 + 1.5, z0 - 6.5); if(!libre(x, zz, 1.6)) continue;
      if(c.puestos.some(q=> Math.hypot(q.px - x, q.pz - zz) < 2.4)) continue;
      let alto = 1.1;
      if(p.tipo==='nave') alto = rnd() < 0.6 ? pila(O, x, zz, t, rf(0,1)) : (barril(O, x, zz, rnd()<0.3), 1.0);
      else if(p.tipo==='salon' || p.tipo==='oficina') { if(rnd() < 0.5) mesa(O, x, zz, t, rnd()<0.5); else { columna(O, x, zz, H, t); alto = H; } }
      else if(p.tipo==='hall') { if(rnd() < 0.5) columna(O, x, zz, H, t), alto = H; else barricada(O, x, zz, rf(1.6,2.4), t); }
      else if(p.tipo==='lab') { { const lw = rf(1.4,2); if(ponerProp('prop_mesa_lab', x, 0, zz, Math.random() < 0.5 ? 0 : Math.PI, lw, 1.0, 0.9)) O.choque(x, 0.5, zz, lw, 1.0, 0.9, 'cubierta'); else O.caja(x, 0.5, zz, lw, 1.0, 0.9, '#9aa4a0', 'cubierta', 0, 'metal'); } const tq = new THREE.Mesh(CAJA, mat('#3a7a52', {emissive:'#1a6a3a', transparent:true, opacity:0.75})); tq.scale.set(0.5, 0.7, 0.5); tq.position.set(x, 1.35, zz); dinamico(tq); alto = 1.0; }
      else { if(rnd() < 0.55) columna(O, x, zz, H, t), alto = H; else barricada(O, x, zz, 2.4, t); }
      /* el puesto del enemigo es detrás (del lado lejano) */
      /* detrás de lo bajo se agachan; al lado de lo alto (columna) se asoman de costado */
      if(alto < 2) c.puestos.push({px:x, pz:zz, x:x + rf(-0.2,0.2), z:zz - 0.95, alto, ocupado:null});
      else { const s = x > lerp(xPuerta, xSal, 0.5) ? -1 : 1; c.puestos.push({px:x, pz:zz, x:x + s*0.85, z:zz - 0.35, alto, ocupado:null}); }
      k++;
    }
    /* racks de nave: estanterías largas contra las paredes */
    if(p.tipo==='nave') for(const s of [-1,1]) if(rnd() < 0.7){ const zr = rf(z1 + 4, z0 - 8); for(let k=0;k<3;k++) O.caja(s*(W/2 - 0.7), 0.9 + k*1.6, zr, 1.0, 0.08, 5, '#d8a23a', false, 0, 'metal');
      for(const dz of [-2.4, 0, 2.4]) O.caja(s*(W/2 - 0.7), 2.4, zr + dz, 0.1, 4.8, 0.1, '#3a5a8a', false, 0, 'metal');
      for(let k=0;k<5;k++) O.caja(s*(W/2 - 0.7), 1.3 + ri(0,2)*1.6, zr + rf(-2,2), 0.8, 0.7, 0.8, '#b0885a', false, 0, 'carton'); }
    if(p.tipo==='salon' || p.tipo==='hall'){ O.caja(0, 0.005, (z0+z1)/2, W*0.55, 0.02, L*0.7, t.acento, false, 0, 'alfombra');
      for(let k=0;k<3;k++){ const s = elegir([-1,1]); O.caja(s*(W/2 - 0.02), H*0.5, rf(z1+2, z0-2), 0.04, 1.1, 1.5, elegir(['#6a8a5a','#8a5a3a','#3a4a6a','#9a8a4a']), false, 0, 'cuadro'); } }
    if(p.tipo==='pasillo') for(let lz = z0 - 1; lz > z1 + 1; lz -= rf(1,2.2)) if(rnd() < 0.5){ const s = elegir([-1,1]); if(!ponerProp('prop_archivero', cx + s*(W/2 - 0.3), 0, lz, s > 0 ? -Math.PI/2 : Math.PI/2)) O.caja(cx + s*(W/2 - 0.25), 0.95, lz, 0.45, 1.9, 0.5, t.noche ? '#5a6a62' : '#6a7a8a', false, 0, 'metal'); }
    /* puestos de aparición: la puerta del fondo y los huecos laterales */
    c.aparece.push({x:xSal, z:z1 - 1.2, tipo:'puerta'});
    for(const l of c.laterales) c.aparece.push({x:l.x, z:l.z, tipo:'lado', s:l.s});
    /* puerta cerrada para las brechas (se abre a patadas) */
    if(p.ev==='brecha'){ const pu = new THREE.Mesh(CAJA, mat('#6a5038')); pu.scale.set(1.6, 2.4, 0.08); pu.position.set(xPuerta, 1.2, z0); pu.castShadow = true; dinamico(pu); c.puerta = pu;
      MUNDO.cajas.push(c.cajaPuerta = {x0:xPuerta - 0.8, x1:xPuerta + 0.8, y0:0, y1:2.4, z0:z0 - 0.05, z1:z0 + 0.05, tipo:'puerta'}); }
    decorar(O, c, t);
    c.malla = O.malla(true); armarUtileria(c.malla);
    cuartos.push(c);
    z = z1; xPuerta = xSal;
  }
  return cuartos;
}

/* ====================== puerto (francotirador) ====================== */
/* agua: casi espejo (refleja el cielo del entorno, con Fresnel del propio BRDF) y olas de un mapa de normales
   que se repite sin costura (senos con frecuencias enteras) y se corre con el tiempo */
let TEX_OLAS = null;
function texOlas(){
  if(TEX_OLAS) return TEX_OLAS; const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
  const OL = [[3,1,1,0.3],[1,4,0.8,1.7],[5,-2,0.5,2.3],[-4,6,0.35,0.9],[9,3,0.22,4.1],[-7,-9,0.16,5.2],[13,-5,0.12,1.1],[4,15,0.1,3.3]], h = new Float32Array(N*N);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ let v = 0; for(const [kx, ky, a, f] of OL) v += a*Math.sin(2*Math.PI*(kx*x + ky*y)/N + f); h[y*N + x] = v; }
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const dx = h[y*N + (x + 1)%N] - h[y*N + (x + N - 1)%N], dy = h[((y + 1)%N)*N + x] - h[((y + N - 1)%N)*N + x], k = 6;
    let nx = -dx*k, ny = -dy*k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l; const o = (y*N + x)*4;
    d[o] = (nx*0.5 + 0.5)*255; d[o+1] = (ny*0.5 + 0.5)*255; d[o+2] = (nz*0.5 + 0.5)*255; d[o+3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(70, 40); t.anisotropy = Math.min(8, ren.capabilities.getMaxAnisotropy());
  return TEX_OLAS = t;
}
function matAgua(){ const m = new THREE.MeshStandardMaterial({color:new THREE.Color('#16303c').convertSRGBToLinear(), roughness:0.14, metalness:0, normalMap:texOlas(), envMapIntensity:1.25});
  m.normalScale.set(0.55, 0.55); return parcheNiebla(m); }
function moverAgua(t){ if(!MUNDO.agua || !TEX_OLAS) return; TEX_OLAS.offset.set((t*0.011) % 1, (t*0.007) % 1); }
/* el buque generado: quilla a −3,7 y las pilas de contenedores de la cubierta llegan a 8,1 m (medido en el GLB, |z| < 4):
   la patrulla camina por arriba, entre la superestructura (popa, −X) y la proa */
const BARCO_CUBIERTA = -3.7 + 8.1;
function generarPuerto(t){
  const O = new Obra('*', {celda:8, ao:false}), rutas = [], ventanas = [], techos = [];
  O.caja(0, -0.1, -150, 300, 0.2, 300, t.piso, true);                              /* muelle */
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(900, 500), matAgua()); mar.rotation.x = -Math.PI/2; mar.position.set(0, -1.2, -420); mar.receiveShadow = true; dinamico(mar); MUNDO.agua = mar;
  O.caja(0, -0.7, -300.5, 300, 1.2, 1, '#5a5e62', true, 0, 'hormigon');
  /* pilas de contenedores en calles: cerca de los puestos, el modelo generado (1.172 triángulos, no se simplifica más: son piezas
     sueltas); lejos, la caja con chapa teñida de siempre, que a 80 m se lee igual */
  const cercaDePuesto = (x, z)=> [[-6, 10], [40, -20], [-50, -30]].some(([px, pz])=> Math.hypot(x - px, z - pz) < 50);
  const COLS = ['#b8482a','#2a6a8a','#d8a23a','#4a7a4a','#8a8f94','#a83a4a','#3a4a7a'];
  for(let gx = -110; gx <= 110; gx += 22) for(let gz = -40; gz >= -270; gz -= 18){
    if(rnd() < 0.25) continue; const n = ri(1,3), largo = elegir([6.1, 12.2]), ry = rnd() < 0.8 ? 0 : Math.PI/2;
    for(let k=0;k<n;k++){ const cx = gx + rf(-2,2), cz = gz + rf(-2,2), alto = ri(1,3); for(let h=0; h<alto; h++){ const col = elegir(COLS);
        if(hayModelo('prop_contenedor') && cercaDePuesto(cx + k*2.5, cz)){ O.choque(cx + k*2.5, 1.3 + h*2.6, cz, 2.44, 2.59, largo, true, ry); ponerProp('prop_contenedor', cx + k*2.5, 0.005 + h*2.6, cz, ry, 2.44, 2.59, largo, col); }
        else O.caja(cx + k*2.5, 1.3 + h*2.6, cz, 2.44, 2.59, largo, col, true, ry, 'contenedor'); }
      techos.push({x:cx + k*2.5, z:cz, y:alto*2.6, largo, ry}); }
  }
  /* galpones con ventanas (hay blancos adentro) */
  for(let k=0;k<3;k++){ const gx = rf(-90, 90), gz = rf(-120, -230), w = 30, d = 16, h = 11;
    O.caja(gx, h/2, gz, w, h, d, t.pared, true); O.caja(gx, h + 0.4, gz, w + 1, 0.8, d + 1, t.pared2, false, 0, 'metal');
    for(let v=0; v<4; v++){ const vx = gx - w/2 + 4 + v*7.3; O.caja(vx, 7.5, gz + d/2 + 0.02, 2.2, 1.6, 0.1, '#1a2026'); ventanas.push({x:vx, y:6.8, z:gz + d/2 - 0.5}); } }
  /* grúas de pórtico */
  for(let k=0;k<4;k++){ const gx = -90 + k*60, gz = -285; if(ponerProp('prop_grua', gx, 0, gz + 6 - 4.33, 0, 0, 36, 0)) continue;   /* el pórtico del modelo está 4,33 m hacia +Z del centro de su caja */ for(const s of [-1,1]){ O.caja(gx + s*8, 17, gz, 1, 34, 1, '#d8a23a', false, 0, 'metal'); O.caja(gx + s*8, 17, gz + 12, 1, 34, 1, '#d8a23a', false, 0, 'metal'); }
    O.caja(gx, 34, gz + 6, 18, 1.6, 1.6, '#d8a23a', false, 0, 'metal'); O.caja(gx, 34, gz - 14, 1.6, 1.6, 42, '#d8a23a', false, 0, 'metal'); }
  /* barcos */
  for(let k=0;k<2;k++){ const bx = -60 + k*120, bz = -330; if(ponerProp('prop_barco', bx, -3.7, bz, 0, 60, 0, 0)){ rutas.push({tipo:'cubierta', x0:bx - 15, x1:bx + 20, z:bz, y:BARCO_CUBIERTA}); continue; }   /* 2,5 m de calado */
    O.caja(bx, 3, bz, 60, 8, 16, '#3a3e44', false, 0, 'metal'); O.caja(bx + 18, 12, bz, 12, 10, 12, t.pared, false, 0, 'metal');
    for(let c=0;c<14;c++) O.caja(bx - 24 + (c%7)*6.2, 8.3 + Math.floor(c/7)*2.6, bz + rf(-4,4), 6, 2.5, 2.4, elegir(COLS), false, 0, 'contenedor'); rutas.push({tipo:'cubierta', x0:bx - 25, x1:bx + 10, z:bz, y:7}); }
  /* la ruta del auto que escapa */
  O.caja(0, 0.02, -60, 300, 0.04, 8, '#3a3a3e', false, 0, 'asfalto'); for(let x=-140; x<140; x+=8) O.caja(x, 0.05, -60, 3, 0.02, 0.2, '#e8e8e8');
  O.caja(-15, 1.1, -64.5, 0.3, 2.2, 0.3, '#e8e8e8', false, 0, 'metal'); O.caja(-15, 2.1, -62, 0.15, 0.15, 5, '#d63a2a', false, 0, 'metal'); O.caja(-15, 1.3, -66, 2.4, 2.6, 2.4, '#8a8f94', true, 0, 'metal');
  /* calles entre contenedores por donde patrullan */
  for(let k=0;k<10;k++){ const z = -50 - k*22; rutas.push({tipo:'calle', x0:-100, x1:100, z:z + 9, y:0}); }
  /* la grúa del jugador: tres puestos */
  const puestos = [{x:-6, y:26, z:10, mira:-0.1}, {x:40, y:30, z:-20, mira:-0.45}, {x:-50, y:28, z:-30, mira:0.35}];
  for(const p of puestos){ O.caja(p.x, p.y - 1.75, p.z + 0.3, 4, 0.3, 2.6, '#d8a23a', false, 0, 'metal'); O.caja(p.x, (p.y - 1.9)/2, p.z + 0.9, 0.8, p.y - 1.9, 0.8, '#d8a23a', false, 0, 'metal'); O.caja(p.x, p.y - 1.35, p.z - 0.95, 4, 0.5, 0.12, '#d8a23a', false, 0, 'metal'); }
  armarUtileria(O.malla(false));
  return {puestos, rutas, ventanas, techos};
}

/* ====================== autopista (convoy): tramos que se reciclan ====================== */
const RUTA = {tramos:[], largo:120};
function tramoRuta(z, t){
  const O = new Obra('*', {celda:10, ao:false}), L = RUTA.largo;
  O.caja(0, -0.1, z - L/2, 26, 0.2, L, t.piso, true);
  O.caja(0, -0.25, z - L/2, 300, 0.2, L, t.suelo);
  for(const s of [-1,1]){ if(hayModelo('prop_jersey')){ O.choque(s*13.4, 0.45, z - L/2, 0.3, 0.9, L, true); for(let k=1; k<L; k+=2.05) ponerProp('prop_jersey', s*13.4, 0, z - k, Math.PI/2, 2.05, 0.9, 0.6); } else O.caja(s*13.4, 0.45, z - L/2, 0.3, 0.9, L, '#9aa0a6', true, 0, 'hormigon'); }
  for(let k=0; k<L; k+=10) O.caja(0, 0.01, z - k - 2, 0.2, 0.02, 4, '#e8e8e8');
  for(const s of [-1,1]) for(let k=0; k<L; k+=10) O.caja(s*6.5, 0.01, z - k - 2, 0.15, 0.02, 3, '#e8d24a');
  /* cerros, carteles y postes a los costados */
  for(let k=0;k<6;k++){ const s = elegir([-1,1]), x = s*rf(30, 140), h = rf(4, 22), cz = z - rf(0, L), w = rf(20, 60), d = rf(20, 50), col = elegir(['#b89a70','#a88a60','#c8ac80']); O.domo(x, -0.4, cz, w*0.6, h, d*0.6, col, 'cerro'); }
  if(rnd() < 0.5){ const s = elegir([-1,1]), bz = z - rf(10, L-10); O.caja(s*20, 5, bz, 0.4, 10, 0.4, '#5a5e62', false, 0, 'metal'); O.caja(s*20, 10, bz, 12, 4, 0.3, elegir(['#d8482a','#2a6a8a','#e8e8e8'])); }
  for(let k=0; k<L; k+=30){ O.caja(15.5, 4, z - k, 0.2, 8, 0.2, '#6a6e72', false, 0, 'metal'); O.caja(14.3, 8, z - k, 2.4, 0.15, 0.15, '#6a6e72', false, 0, 'metal'); }
  let puente = null;
  if(rnd() < 0.4){ const pz = z - L/2; O.caja(0, 7.6, pz, 34, 1.2, 8, '#8a8f94', false, 0, 'hormigon'); O.caja(0, 8.7, pz + 3.8, 34, 1, 0.3, '#9aa0a6', false, 0, 'hormigon'); O.caja(0, 8.7, pz - 3.8, 34, 1, 0.3, '#9aa0a6', false, 0, 'hormigon');
    for(const s of [-1,1]) O.caja(s*15.5, 3.5, pz, 2, 7, 6, '#7a7f84', false, 0, 'hormigon'); puente = {z:pz, y:8.2}; }
  const malla = O.malla(false); armarUtileria(malla);
  return {z, malla, puente};
}

/* ====================== soldados: esqueleto de puntos + piezas encima ======================
   vivos, los puntos salen de una pose (IK de dos huesos en 3D); muertos, los mueve un muñeco de trapo */
const J3 = ['pel','pec','cue','cab','hoI','coI','maI','hoD','coD','maD','caI','roI','piI','caD','roD','piD'];
const HUESO3 = [['pel','pec',0.19,0.26,'torso'],['pec','cue',0.17,0.24,'torso'],['hoI','coI',0.065,0.065,'brazo'],['coI','maI',0.058,0.058,'brazo'],['hoD','coD',0.065,0.065,'brazo'],['coD','maD',0.058,0.058,'brazo'],
  ['caI','roI',0.085,0.085,'pierna'],['roI','piI',0.075,0.075,'pierna'],['caD','roD',0.085,0.085,'pierna'],['roD','piD',0.075,0.075,'pierna']];
const V3 = (x,y,z)=> new THREE.Vector3(x,y,z);
const _a = V3(0,0,0), _b = V3(0,0,0), _c = V3(0,0,0), _q = new THREE.Quaternion(), ARRIBA = V3(0,1,0);
function ik3(raiz, obj, l1, l2, polo, sal){
  _a.subVectors(obj, raiz); let d = _a.length(); const m = l1 + l2 - 1e-3; if(d > m){ _a.multiplyScalar(m/d); d = m; }
  const cosA = lim((l1*l1 + d*d - l2*l2)/(2*l1*d), -1, 1), sinA = Math.sqrt(1 - cosA*cosA);
  const eje = _a.clone().normalize(), p = polo.clone().sub(eje.clone().multiplyScalar(polo.dot(eje))).normalize();
  sal.copy(raiz).addScaledVector(eje, cosA*l1).addScaledVector(p, sinA*l1);
  return raiz.clone().add(_a);
}
function crearCuerpo(def, civil, tipo){
  /* si llegó el personaje generado, ése; si no, el muñeco de cajas de siempre */
  const C = typeof cuerpoGLB === 'function' ? cuerpoGLB(tipo, civil) : null; if(C) return C;
  const g = new THREE.Group(), piezas = {};
  const piel = civil ? '#e8e6e2' : def.color, ropa = civil ? '#f2f2f2' : def.color, oscuro = civil ? '#5a6a7a' : def.color;
  const pone = (k, col, cast)=>{ const m = new THREE.Mesh(CAJA, mat(col)); m.castShadow = cast !== false; g.add(m); piezas[k] = m; return m; };
  for(const [a,b,,,tipo] of HUESO3) pone(a+b, tipo==='pierna' ? oscuro : (tipo==='torso' ? ropa : piel));
  pone('cab', civil ? '#e8d8c8' : '#1c1e22'); if(!civil) pone('visor', '#3a4046');
  pone('botaI', '#15171a'); pone('botaD', '#15171a');
  if(!civil){ pone('chaleco', def.vest); pone('arma', '#15171a'); pone('arma2', '#2a2e33');
    if(def.placas && def.placas.casco) pone('casco', '#50565c');
    if(def.escudo){ const e = pone('escudo', '#3a4a5a'); e.material = mat('#4a5e72', {transparent:true, opacity:0.82}); pone('visera', '#9ab8d0'); }
    if(def.cohete) pone('tubo', '#4a5a3a');
    if(def.jefe){ for(const k of ['pl_pecho','pl_brazoI','pl_brazoD','pl_piernaI','pl_piernaD']) pone(k, '#6a7076'); pone('tanque', '#8a3a2a'); }
  } else { pone('pelo', elegir(['#2a1e16','#6a4a2a','#1a1a1a','#8a7a6a'])); }
  return {g, piezas};
}
/* coloca una pieza de caja entre dos puntos */
function entre(m, a, b, ancho, prof){ _b.subVectors(b, a); const l = _b.length() || 1e-3; m.position.copy(a).addScaledVector(_b, 0.5); _q.setFromUnitVectors(ARRIBA, _b.divideScalar(l)); m.quaternion.copy(_q); m.scale.set(ancho*2, l + ancho, prof*2); }
