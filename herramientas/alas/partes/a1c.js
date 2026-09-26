
/* ====================== assets generados (Rezona), adentro del archivo ======================
   Todo arranca con lo dibujado por código y lo generado lo pisa cuando decodifica: un base64 roto
   cuesta una pieza, no la pantalla. Sin fetch ni blob: URL (el visor de la app los bloquea en
   silencio): imágenes con createImageBitmap sobre un Blob, modelos con GLTFLoader.parse y sonidos
   con decodeAudioData. window.ARCH trae los datos y window.MAN lo medido de cada uno. */
const ARCH = window.ARCH || {}, MAN = window.MAN || {tex:[], cielo:[], arte:[], mod:[], pj:[], aud:[]};
const ASSET = {pend:0, ok:0, fallas:[], img:{}, glb:{}, aud:{}, t0:performance.now()};
const manDe = (lista, id)=> (MAN[lista]||[]).find(m=> m.id===id) || null;
function b64Bytes(d){ const i = d.indexOf(','), s = atob(d.slice(i + 1)), n = s.length, u = new Uint8Array(n); for(let k=0;k<n;k++) u[k] = s.charCodeAt(k); return u; }
const mimeDe = d => d.slice(5, d.indexOf(';'));
function porImg(d){ return new Promise((ok, mal)=>{ const im = new Image(); im.onload = ()=> ok(im); im.onerror = mal; im.src = d; }); }
/* voltear = las texturas que se repiten (convención de three: la fila de arriba en v=1); las de un GLB van sin voltear */
function decImagen(id, voltear){
  if(ASSET.img[id]) return ASSET.img[id];
  const d = ARCH[id]; if(!d) return Promise.resolve(null);
  ASSET.pend++;
  const listo = im=> { ASSET.ok++; im.__volteada = !!voltear && !(im instanceof HTMLImageElement); return im; };
  const falla = ()=> { ASSET.fallas.push(id); return null; };
  let p;
  if(window.createImageBitmap){
    try{ const b = new Blob([b64Bytes(d)], {type:mimeDe(d)});
      p = createImageBitmap(b, voltear ? {imageOrientation:'flipY'} : {}).then(listo, ()=> porImg(d).then(listo, falla)); }
    catch(e){ p = porImg(d).then(listo, falla); }
  } else p = porImg(d).then(listo, falla);
  return ASSET.img[id] = p;
}
/* textura que existe desde ya (del color medio del asset) y se completa cuando decodifica */
const TEXS = {};
function texAsset(id, o){
  o = o || {}; const k = id + (o.srgb ? ':s' : ':l'); if(TEXS[k]) return TEXS[k];
  const c = document.createElement('canvas'); c.width = c.height = 4; const g = c.getContext('2d'); g.fillStyle = o.color || (o.srgb ? '#808080' : (o.normal ? '#8080ff' : '#ffffff')); g.fillRect(0, 0, 4, 4);
  const t = new THREE.CanvasTexture(c); t.encoding = o.srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
  if(o.repetir !== false){ t.wrapS = t.wrapT = o.espejo ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping; }
  t.anisotropy = Math.min(4, ren.capabilities.getMaxAnisotropy()); t.flipY = o.voltear !== false;
  if(o.sinMips){ t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  const voltear = o.voltear !== false;
  decImagen(id, voltear).then(im=>{ if(!im) return; t.image = im; t.flipY = voltear && !im.__volteada; t.needsUpdate = true; t.__asset = id; });
  return TEXS[k] = t;
}
const GLB_LISTO = {};
function decGLB(id){
  if(ASSET.glb[id]) return ASSET.glb[id];
  const d = ARCH[id]; if(!d) return Promise.resolve(null);
  ASSET.pend++;
  return ASSET.glb[id] = new Promise(ok=>{
    try{ const u = b64Bytes(d); new THREE.GLTFLoader().parse(u.buffer, '', g=>{ ASSET.ok++; GLB_LISTO[id] = g; ok(g); }, ()=>{ ASSET.fallas.push(id); ok(null); }); }
    catch(e){ ASSET.fallas.push(id); ok(null); }
  });
}
/* audio: se decodifica recién con el contexto (primer toque); hasta entonces suena lo sintetizado */
const SONIDOS = {};
function decAudios(){
  if(!AC || decAudios.hecho) return; decAudios.hecho = true;
  for(const m of (MAN.aud||[])){ const d = ARCH['aud/' + m.id]; if(!d) continue; ASSET.pend++;
    try{ const u = b64Bytes(d); AC.decodeAudioData(u.buffer, b=>{ SONIDOS[m.id] = b; ASSET.ok++; alLlegarSonido(m.id); }, ()=> ASSET.fallas.push('aud/' + m.id)); }
    catch(e){ ASSET.fallas.push('aud/' + m.id); } }
}
function alLlegarSonido(id){ if(id.startsWith('mus_') && MUS.pista === id.slice(4)) MUS.cambio = true; }
/* lo que falta para arrancar: imágenes y modelos (el audio no traba la carga) */
async function precargar(avance){
  const tareas = [];
  /* sólo la geometría: las imágenes se decodifican cuando algo las usa (todas juntas son cientos de MB en un teléfono) */
  for(const k in ARCH) if(k.startsWith('glb/')) tareas.push(decGLB(k));
  let hechas = 0; const n = tareas.length || 1;
  await Promise.all(tareas.map(p=> Promise.resolve(p).then(()=>{ hechas++; if(avance) avance(hechas/n); })));
}

/* al cambiar de tema se sueltan las texturas del mundo que no se usan (GPU y memoria del bitmap) */
function soltarTexturas(prefijo, quedan){
  for(const k in TEXS){ const t = TEXS[k], id = k.slice(0, k.lastIndexOf(':')); if(!id.startsWith(prefijo) || quedan.has(id)) continue;
    t.dispose(); if(t.image && t.image.close) t.image.close(); delete TEXS[k]; delete ASSET.img[id]; }
}
/* cuando los modelos decodificaron, cada sistema toma los suyos (armas, utilería, vehículos, personajes) */
const AL_LLEGAR = [];
function alLlegarModelos(){ for(const f of AL_LLEGAR){ try{ f(); }catch(e){ ASSET.fallas.push('uso: ' + e.message); } } }
