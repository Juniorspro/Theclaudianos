// el botón GOLPEAR con dedos de verdad en la pantalla girada: piña al que está cerca, tiro al que está lejos, sin tocar la palanca derecha
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, locale:'es-AR'}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); const cdp = await ctx.newCDPSession(p);
  await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(800);
  const aPant = ([lx, ly]) => p.evaluate(([lx, ly]) => { const r = document.getElementById('gl'); const k = parseFloat(r.style.width)/r.width; return [innerWidth - ly*k, lx*k]; }, [lx, ly]);
  const toque = (tipo, pts) => cdp.send('Input.dispatchTouchEvent', {type:tipo, touchPoints:pts.map(([x, y], i) => ({x, y, id:i + 1}))});
  const G = await aPant(await p.evaluate(() => { const g = window.__L.centroGolpe(); return [g.x, g.y]; }));
  const prueba = async (arma, dist, dir, ms) => {
    await p.evaluate(([arma, dist, dir]) => { const L = __L; L.AJ.visto = true; L.empezarCap(1); L.JUG.invul = 99;
      L.JUG.x = L.PISO.def.inicio[0]*8 + 4; L.JUG.y = L.PISO.def.inicio[1]*8 + 4; L.JUG.ang = dir === 0 ? 3.14 : 0; L.JUG.arma = arma; L.JUG.balas = arma ? 9 : 0;
      const e = L.ENEM.find(e => !e.T.perro && !e.T.gordo); e.x = L.JUG.x + Math.cos(dir)*dist; e.y = L.JUG.y + Math.sin(dir)*dist; e.estado = 'quieto'; e.arma = null; e.ang = dir + 3.14; window._e = e; }, [arma, dist, dir]);
    await p.waitForTimeout(150); await toque('touchStart', [G]); await p.waitForTimeout(ms); await toque('touchEnd', []); await p.waitForTimeout(150);
    return p.evaluate(() => ({caido:_e.derribado > 0, muerto:_e.muerto, ang:+__L.JUG.ang.toFixed(2), balas:__L.JUG.balas, golpeT:__L.CTRL.golpe}));
  };
  console.log('piña, enemigo al costado (no adelante):', JSON.stringify(await prueba(null, 10, 1.57, 120)));
  console.log('bate, enemigo atrás:', JSON.stringify(await prueba('bate', 12, 3.14, 120)));
  console.log('pistola, mirando al revés y enemigo a 90 px:', JSON.stringify(await prueba('pistola', 90, 0, 400)));
  console.log('nadie cerca, piña al aire:', JSON.stringify(await p.evaluate(() => { const L = __L; const e = window._e; e.muerto = true; return 1; }) && await prueba(null, 300, 0, 120)));
  console.log(errs.join(' | ') || 'sin errores'); await b.close(); })();
