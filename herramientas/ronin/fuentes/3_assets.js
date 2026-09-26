/* ================================================================ los personajes: de video a cuadros
   Cada animación es un video chico: la mitad izquierda es el color premultiplicado sobre negro y la derecha el alfa en
   gris. Se busca cuadro por cuadro (el video no tiene cuadros B, así cada búsqueda cae justo), se dibuja, se lee, se
   arma el RGBA y se recorta a lo que tiene tinta. Se decodifica recién cuando hace falta el personaje, y se tira
   cuando no (el héroe siempre está). DATOS lo escribe armar.sh. */
const PJ = {};                   /* pj → {meta, anims:{nombre:{fps, loop, golpe, avance, cuadros:[{c, ox, oy}]}}, listo} */
const FONDOS = {};
const tipoVideo = () => 'video/' + (DATOS.tipo || 'mp4');
function bytes(b64){ const s = atob(b64), u = new Uint8Array(s.length); for(let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
const unaVez = (o, ev, ms) => new Promise(r => { let h = null; const f = () => { clearTimeout(h); o.removeEventListener(ev, f); r(true); }; o.addEventListener(ev, f); h = setTimeout(() => { o.removeEventListener(ev, f); r(false); }, ms || 3000); });
async function clipACuadros(b64, meta){
  const url = URL.createObjectURL(new Blob([bytes(b64)], {type:tipoVideo()}));
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = url;
  const cuadros = [];
  try {
    if(v.readyState < 2) await unaVez(v, 'loadeddata', 5000);
    try { await v.play(); v.pause(); } catch(e){}                       /* iOS no pinta un video que nunca arrancó */
    const W2 = meta.w*2, H = meta.h, cv = document.createElement('canvas'); cv.width = W2; cv.height = H;
    const cx = cv.getContext('2d', {willReadFrequently:true});
    for(let k = 0; k < meta.n; k++){
      const t = (k + 0.5)/12;
      if(Math.abs(v.currentTime - t) > 0.001){ v.currentTime = t; await unaVez(v, 'seeked', 2500); }
      cx.clearRect(0, 0, W2, H); cx.drawImage(v, 0, 0, W2, H);
      const d = cx.getImageData(0, 0, W2, H).data, w = meta.w, im = new ImageData(w, H), o = im.data;
      let x0 = w, x1 = -1, y0 = H, y1 = -1;
      for(let y = 0; y < H; y++){ const fila = y*W2*4;
        for(let x = 0; x < w; x++){ const i = fila + x*4, a = d[fila + (x + w)*4]; if(a < 10) continue;
          const j = (y*w + x)*4, k2 = 255/a; o[j] = Math.min(255, d[i]*k2); o[j + 1] = Math.min(255, d[i + 1]*k2); o[j + 2] = Math.min(255, d[i + 2]*k2); o[j + 3] = a;
          if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; } }
      if(x1 < 0){ cuadros.push({c:null, ox:0, oy:0, w:0, h:0}); continue; }
      const c = document.createElement('canvas'); c.width = x1 - x0 + 1; c.height = y1 - y0 + 1;
      c.getContext('2d').putImageData(im, -x0, -y0);
      cuadros.push({c, ox:meta.ox + x0, oy:meta.oy + y0, w:c.width, h:c.height});
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
function soltarPJ(id){ if(id === 'heroe' || !PJ[id]) return; delete PJ[id]; }
function cargarFondos(){ return Promise.all(Object.keys(DATOS.fondos).map(k => new Promise(r => { const im = new Image(); im.onload = () => { FONDOS[k] = im; r(); }; im.onerror = () => r(); im.src = 'data:image/webp;base64,' + DATOS.fondos[k]; }))); }
