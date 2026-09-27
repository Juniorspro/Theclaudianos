// gpu.js: el desarmado en la GPU da los mismos cuadros que el de JavaScript, y cuánto tarda cada uno (CPU ×4 como un celular)
const {chromium} = require('/tmp/ui/node_modules/playwright');
const EXE = process.env.CHROME || '/tmp/gc/x/opt/google/chrome/chrome', URL = process.env.URL || 'file:///home/user/Theclaudianos/juegos-pc/Ronin.html';
(async () => { const b = await chromium.launch({executablePath:EXE, args:['--no-sandbox']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, isMobile:true, hasTouch:true}); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:120000});
  const lleno = `(P) => { const out = {}; for(const [n, a] of Object.entries(P.anims)){ out[n] = a.cuadros.map(q => { const c = document.createElement('canvas'); c.width = P.meta.anims[n].w; c.height = P.meta.anims[n].h;
      if(q.c) c.getContext('2d').drawImage(q.c, q.ox - P.meta.anims[n].ox, q.oy - P.meta.anims[n].oy); return c; }); } return out; }`;
  await cdp.send('Emulation.setCPUThrottlingRate', {rate:4});
  const r = await p.evaluate(async ([lleno, CAM]) => { const f = eval(lleno), R = __R, res = {};
    for(const id of ['e_bandido', 'j_oni']){
      R.modoJS(false); if(CAM) R.camino(CAM); let t = performance.now(); const G = await R.cargarPJ(id); res[id + ' GPU'] = Math.round(performance.now() - t) + ' ms'; const cg = f(G); R.PJ[id] = undefined; delete R.PJ[id];
      R.modoJS(true); t = performance.now(); const J = await R.cargarPJ(id); res[id + ' JS'] = Math.round(performance.now() - t) + ' ms'; const cj = f(J); delete R.PJ[id]; R.modoJS(false);
      let peor = 0, suma = 0, n = 0, vacios = 0;
      for(const k of Object.keys(cg)) for(let i = 0; i < cg[k].length; i++){ const a = cg[k][i].getContext('2d').getImageData(0, 0, cg[k][i].width, cg[k][i].height).data, bb = cj[k][i].getContext('2d').getImageData(0, 0, cg[k][i].width, cg[k][i].height).data;
        let d = 0, cnt = 0, op = 0; for(let j = 0; j < a.length; j += 4){ if(a[j + 3] > 0 || bb[j + 3] > 0){ cnt++; d += Math.abs(a[j + 3] - bb[j + 3]) + (a[j + 3] > 60 && bb[j + 3] > 60 ? (Math.abs(a[j] - bb[j]) + Math.abs(a[j + 1] - bb[j + 1]) + Math.abs(a[j + 2] - bb[j + 2]))/3 : 0); } if(a[j + 3] > 128) op++; }
        const m = cnt ? d/cnt : 0; peor = Math.max(peor, m); suma += m; n++; if(!op) vacios++; }
      res[id + ' diferencia'] = `media ${(suma/n).toFixed(2)} · peor ${peor.toFixed(2)} (de 255) · cuadros vacíos en GPU ${vacios}`; }
    return res; }, [lleno, process.env.CAMINO || '']);
  console.log(JSON.stringify(r, null, 1)); console.log(errs.concat(await p.evaluate(() => __R.ERRORES.map(String))).join(' | ') || 'sin errores'); await b.close(); })();
