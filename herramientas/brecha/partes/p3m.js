
/* ====================== modelos generados: armas, utilería y vehículos ======================
   Cada GLB llega sin imágenes (las texturas van aparte, en webp) y en metros reales: se funde en una
   sola geometría y se le arma un material PBR entero, nuevo (sacarle texturas de a una no alcanza).
   Si un modelo no llegó, cada sistema sigue con lo suyo dibujado por código. */
const MODELOS = {};
/* lo cuantizado (KHR_mesh_quantization: enteros normalizados y la escala en el nodo) se pasa a coma flotante
   ANTES de hornear la matriz: si no, todo lo que pasa de 1 se recorta sin aviso */
function aFlotante(g){
  for(const k of Object.keys(g.attributes)){ const a = g.attributes[k]; if(a.array instanceof Float32Array && !a.normalized) continue;
    const n = a.count, s = a.itemSize, d = new Float32Array(n*s), arr = a.array, st = a.isInterleavedBufferAttribute ? a.data.stride : s, of = a.isInterleavedBufferAttribute ? a.offset : 0;
    const div = !a.normalized ? 1 : (arr instanceof Int16Array ? 32767 : arr instanceof Uint16Array ? 65535 : arr instanceof Int8Array ? 127 : arr instanceof Uint8Array ? 255 : 1);
    const src = a.isInterleavedBufferAttribute ? a.data.array : arr;
    for(let i=0;i<n;i++) for(let c=0;c<s;c++){ const v = src[i*st + of + c]/div; d[i*s + c] = a.normalized ? Math.max(v, -1) : v; }
    g.setAttribute(k, new THREE.BufferAttribute(d, s)); }
  return g;
}
function fundirGeo(root){
  root.updateMatrixWorld(true); const partes = [];
  root.traverse(o=>{ if(!o.isMesh || o.isSkinnedMesh) return; let g = aFlotante(o.geometry.clone()); g.applyMatrix4(o.matrixWorld); if(g.index) g = g.toNonIndexed(); partes.push(g); });
  if(!partes.length) return null; if(partes.length === 1) return partes[0];
  const out = new THREE.BufferGeometry();
  for(const [k, n] of [['position',3],['normal',3],['uv',2]]){ if(!partes.every(g=> g.attributes[k])) continue;
    const total = partes.reduce((s, g)=> s + g.attributes[k].array.length, 0), a = new Float32Array(total); let o = 0;
    for(const g of partes){ a.set(g.attributes[k].array, o); o += g.attributes[k].array.length; } out.setAttribute(k, new THREE.BufferAttribute(a, n)); }
  return out;
}
function matModelo(cat, id, man, o){
  const pre = cat + '/' + id + '/', tx = (k, op)=> ARCH[pre + k] ? texAsset(pre + k, Object.assign({voltear:false, repetir:false}, op)) : null;
  const mapa = tx('color', {srgb:true}), nrm = tx('normal', {normal:true}), mr = tx('mr', {});
  const m = new THREE.MeshStandardMaterial(Object.assign({map:mapa, normalMap:nrm, roughnessMap:mr, metalnessMap:mr,
    roughness:mr ? (man && man.rugosidad !== undefined ? Math.max(0.35, man.rugosidad) : 1) : 0.6, metalness:mr ? (man && man.metal !== undefined ? man.metal : 1) : 0.3, envMapIntensity:0.9}, o||{}));
  if(nrm) m.normalScale.set(1, -1);   /* convención glTF sin tangentes (lo mismo que hace el GLTFLoader) */
  return parcheNiebla(m);
}
function prepararModelos(){
  for(const man of (MAN.mod||[])){
    const g = GLB_LISTO['glb/' + man.id]; if(!g) continue;
    const geo = fundirGeo(g.scene); if(!geo) continue;
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    /* el material (y la decodificación de sus texturas) recién la primera vez que se usa */
    /* una versión simplificada (_lod) comparte el material (y las texturas) del modelo entero */
    MODELOS[man.id] = {geo, man, caja:geo.boundingBox.clone(), get mat(){ const b = this.man.base && MODELOS[this.man.base]; return b ? b.mat : (this._mat || (this._mat = matModelo('mod', this.man.id, this.man))); }};
  }
}
AL_LLEGAR.push(prepararModelos);
const hayModelo = id => !!MODELOS[id];
const lodDe = id => MODELOS[id + '_lod'] ? id + '_lod' : id;
function mallaModelo(id, sombras){ const M = MODELOS[id]; if(!M) return null; const m = new THREE.Mesh(M.geo, M.mat); m.castShadow = sombras !== false; m.receiveShadow = true; return m; }
/* puntos de agarre del arma (medidos por el que la procesó; si no vinieron, estimados de la caja) */
function puntosArma(id){
  const M = MODELOS[id]; if(!M) return null; const b = M.caja, P = (M.man && M.man.puntos) || {}, L = b.max.z - b.min.z, H = b.max.y - b.min.y;
  const v = (p, d)=> p ? V3(p[0], p[1], p[2]) : d;
  const corta = L < 0.3;
  return {boca:v(P.boca, V3(0, b.max.y - H*(corta ? 0.25 : 0.32), b.min.z)),
    empunadura:v(P.empunadura, V3(0, b.min.y + H*(corta ? 0.3 : 0.28), b.min.z + L*(corta ? 0.72 : 0.6))),
    guardamano:v(P.guardamano, V3(0, b.min.y + H*0.5, b.min.z + L*(corta ? 0.62 : 0.3))),
    mira:v(P.mira, V3(0, b.max.y - H*0.04, b.min.z + L*(corta ? 0.8 : 0.55)))};
}

/* ====================== utilería instanciada ======================
   el choque sigue siendo la caja de siempre; lo que se ve es el modelo, escalado a esa caja */
const UTIL = {};
function ponerProp(id, x, y, z, ry, w, h, d, col){ if(!MODELOS[id]) return false; (UTIL[id] = UTIL[id] || []).push({x, y, z, ry, w, h, d, col}); return true; }
const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pv = V3(0,0,0), _ps = V3(1,1,1), _EJEY = V3(0,1,0), _pc = new THREE.Color();
function armarUtileria(padre){
  for(const id in UTIL){ const L = UTIL[id]; if(!L.length) continue; const M = MODELOS[id], b = M.caja, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
    const im = new THREE.InstancedMesh(M.geo, M.mat, L.length); im.castShadow = true; im.receiveShadow = true;
    L.forEach((p, i)=>{ /* escala a la caja pedida (si no se pidió un lado, se conserva la proporción) */
      const k = p.h ? p.h/sy : 1, ex = p.w ? p.w/sx : k, ez = p.d ? p.d/sz : k;
      _ps.set(ex, k, ez); _pq.setFromAxisAngle(_EJEY, p.ry||0);
      _pv.set(-(b.min.x + b.max.x)/2*ex, -b.min.y*k, -(b.min.z + b.max.z)/2*ez).applyQuaternion(_pq).add(V3(p.x, p.y||0, p.z));
      _pm.compose(_pv, _pq, _ps); im.setMatrixAt(i, _pm);
      if(p.col && im.setColorAt) im.setColorAt(i, _pc.set(p.col).convertSRGBToLinear()); else if(L.some(q=> q.col) && im.setColorAt) im.setColorAt(i, _pc.setRGB(1, 1, 1)); });
    im.instanceMatrix.needsUpdate = true; if(im.instanceColor) im.instanceColor.needsUpdate = true; im.frustumCulled = false;   /* en r128 la esfera de recorte es la de la geometría en el origen */
    if(padre) padre.add(im); else dinamico(im);
    UTIL[id] = []; }
}
