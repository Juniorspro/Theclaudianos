
/* ====================== menús con el arte generado ======================
   Un solo lienzo de fondo (#fondoMenu) debajo de las capas: el arte se dibuja ahí (nunca como url(data:)
   de CSS, que el visor puede bloquear) y se decodifica recién cuando se muestra. Mientras tapa la pantalla,
   la escena 3D de atrás no se dibuja. Si no llegó, queda la demo de siempre. */
function dibujarCubre(c, im, lado){
  const g = c.getContext('2d'), W = c.width, H = c.height, k = Math.max(W/im.width, H/im.height), w = im.width*k, h = im.height*k;
  g.drawImage(im, (W - w)*(lado === 'derecha' ? 1 : 0.5), (H - h)/2, w, h);
}
function veloIzq(c, a0, a1){ const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, c.width, 0);
  gr.addColorStop(0, 'rgba(8,10,12,' + a0 + ')'); gr.addColorStop(0.45, 'rgba(8,10,12,' + a1 + ')'); gr.addColorStop(1, 'rgba(8,10,12,0)'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  const gv = g.createLinearGradient(0, c.height*0.6, 0, c.height); gv.addColorStop(0, 'rgba(8,10,12,0)'); gv.addColorStop(1, 'rgba(8,10,12,0.55)'); g.fillStyle = gv; g.fillRect(0, 0, c.width, c.height); }
const FONDO_CAPA = {capaTitulo:'arte_portada', capaMisiones:'arte_portada', capaArmeria:'arte_armeria', capaComo:'arte_deposito'};
const FONDO = {id:null, tapa:false};
function arteDeCapa(idCapa){
  if(idCapa === 'capaEquipo' || idCapa === 'capaRes'){ const m = MISIONES[idCapa === 'capaEquipo' ? misionElegida : J.mi]; return m ? 'arte_' + m.id : null; }
  return FONDO_CAPA[idCapa] || null;
}
function fondoArte(idCapa){
  const c = $('fondoMenu'), id = idCapa ? arteDeCapa(idCapa) : null, hay = id && ARCH['arte/' + id];
  $('capaTitulo').classList.toggle('conArte', !!hay && idCapa === 'capaTitulo');
  if(!hay){ c.classList.remove('ver'); FONDO.tapa = false; FONDO.id = null; return; }
  const k = Math.min(2, window.devicePixelRatio || 1), W = Math.min(1600, Math.round(c.clientWidth*k || 892)), H = Math.round(W*(c.clientHeight || 412)/(c.clientWidth || 892));
  const clave = id + ':' + idCapa + ':' + W + 'x' + H;
  c.classList.add('ver'); c.classList.toggle('lento', idCapa === 'capaTitulo');
  if(FONDO.id === clave){ FONDO.tapa = true; return; }
  FONDO.id = clave;
  decImagen('arte/' + id, false).then(im=>{ if(!im || FONDO.id !== clave) return;
    c.width = W; c.height = H; dibujarCubre(c, im, idCapa === 'capaTitulo' ? 'derecha' : 0);
    if(idCapa === 'capaTitulo') veloIzq(c, 0.82, 0.35); FONDO.tapa = true; });
}
/* la carga: la portada detrás del avance, con barra */
function cargaConArte(){
  const cg = $('carga'), base = cg.textContent; cg.textContent = '';
  const tx = document.createElement('div'); tx.className = 'txt'; tx.textContent = base; const bar = document.createElement('div'); bar.className = 'barra'; bar.appendChild(document.createElement('i'));
  if(ARCH['arte/arte_portada']){ const c = document.createElement('canvas'); c.width = 960; c.height = 444; cg.appendChild(c);
    decImagen('arte/arte_portada', false).then(im=>{ if(im){ dibujarCubre(c, im, 'derecha'); veloIzq(c, 0.85, 0.4); } }); }
  cg.appendChild(tx); cg.appendChild(bar);
  return f=>{ tx.textContent = base + ' ' + Math.round(f*100) + ' %'; bar.firstChild.style.width = Math.round(f*100) + '%'; };
}
/* miniaturas de las operaciones: el arte de cada una (lo dibujado queda si no llegó) */
function miniaturaArte(c, i){
  const m = MISIONES[i], id = 'arte_' + m.id; if(!ARCH['arte/' + id]) return;
  decImagen('arte/' + id, false).then(im=>{ if(!im) return; const g = c.getContext('2d'); dibujarCubre(c, im, 0);
    const gr = g.createLinearGradient(0, c.height*0.5, 0, c.height); gr.addColorStop(0, 'rgba(10,12,14,0)'); gr.addColorStop(1, 'rgba(10,12,14,0.7)'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); });
}
/* íconos de armas: el modelo generado de costado, dibujado una vez a un render target y pasado a un lienzo */
const ICONOS = {};
function iconoModelo(id, W, H){
  const k = id + ':' + W + 'x' + H; if(ICONOS[k]) return ICONOS[k]; const idm = 'arma_' + id; if(!MODELOS[idm]) return null;
  const esc = new THREE.Scene(); esc.add(new THREE.HemisphereLight(0xdde6ff, 0x2a2c30, 1.4)); const d = new THREE.DirectionalLight(0xfff4e8, 2.4); d.position.set(1, 1.6, 0.4); esc.add(d);
  const d2 = new THREE.DirectionalLight(0x9ab8ff, 1.1); d2.position.set(-1, 0.4, -0.8); esc.add(d2); const d3 = new THREE.DirectionalLight(0xffffff, 0.8); d3.position.set(1, -0.6, 0.2); esc.add(d3);
  esc.environment = escena.environment;
  const m = mallaModelo(idm, false); esc.add(m); const b = MODELOS[idm].caja, L = b.max.z - b.min.z, Hh = b.max.y - b.min.y, cz = (b.max.z + b.min.z)/2, cy = (b.max.y + b.min.y)/2;
  const asp = W/H, mh = Math.max(Hh*1.15, L*1.1/asp)/2, mw = mh*asp;
  const oc = new THREE.OrthographicCamera(-mw, mw, mh, -mh, 0.01, 10); oc.position.set(3, cy, cz); oc.lookAt(0, cy, cz);
  const S = 2, rt = new THREE.WebGLRenderTarget(W*S, H*S), px = new Uint8Array(W*S*H*S*4);
  const antes = ren.getRenderTarget(), clr = ren.getClearColor(new THREE.Color()), ca = ren.getClearAlpha();
  ren.setRenderTarget(rt); ren.setClearColor(0x000000, 0); ren.clear(); ren.render(esc, oc); ren.readRenderTargetPixels(rt, 0, 0, W*S, H*S, px);
  ren.setRenderTarget(antes); ren.setClearColor(clr, ca); rt.dispose();
  /* el render target guarda lineal: se pasa a sRGB y se promedia 2×2 (supermuestreo) */
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H), a = img.data;
  const sr = v=> v <= 0.0031308 ? v*12.92 : 1.055*Math.pow(v, 1/2.4) - 0.055;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ let r=0, gg=0, bb=0, al=0;
    for(let j=0;j<S;j++) for(let i=0;i<S;i++){ const o = (((H - 1 - y)*S + (S - 1 - j))*W*S + x*S + i)*4; r += px[o]; gg += px[o+1]; bb += px[o+2]; al += px[o+3]; }
    const n = S*S, o2 = (y*W + x)*4, f = al ? n*255/al : 0; a[o2] = Math.min(255, sr(Math.min(1, r/n/255*f))*255); a[o2+1] = Math.min(255, sr(Math.min(1, gg/n/255*f))*255); a[o2+2] = Math.min(255, sr(Math.min(1, bb/n/255*f))*255); a[o2+3] = al/n; }
  g.putImageData(img, 0, 0); return ICONOS[k] = c;
}
