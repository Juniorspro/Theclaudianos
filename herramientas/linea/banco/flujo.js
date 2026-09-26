// el camino entero con toques de verdad: idioma → censura → título → JUGAR → cinemática → máscara → juego
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, locale:'es-AR'})).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(800);
  const pant = (lx, ly) => p.evaluate(([lx, ly]) => { const r = document.getElementById('gl'); const k = parseFloat(r.style.width)/r.width; return [innerWidth - ly*k, lx*k]; }, [lx, ly]);
  const tocar = async id => { const bt = await p.evaluate(id => { const b = __L.UI.botones.find(b => b.id === id); return b && [b.x + b.w/2, b.y + b.h/2]; }, id); if(!bt) return 'no hay ' + id; const [x, y] = await pant(...bt); await p.touchscreen.tap(x, y); await p.waitForTimeout(350); return 'ok'; };
  const est = () => p.evaluate(() => __L.J.modo + ':' + __L.UI.p + (__L.J.cine ? ':cine' : ''));
  const log = [];
  log.push(await tocar('idien'), await est()); log.push(await tocar('idies'), await est());
  log.push(await tocar('conc'), await est(), 'censura=' + await p.evaluate(() => __L.AJ.censura));
  await p.touchscreen.tap(200, 400); await p.waitForTimeout(400); log.push(await est());
  log.push(await tocar('jugar'), await est());
  for(let i = 0; i < 40 && (await est()).includes('cine'); i++){ await p.touchscreen.tap(200, 450); await p.waitForTimeout(500); }
  log.push(await est());
  log.push(await tocar('mcondor'), 'máscara=' + await p.evaluate(() => __L.JUG.mascara));
  log.push(await tocar('mcarpincho'), 'máscara=' + await p.evaluate(() => __L.JUG.mascara));
  log.push(await tocar('vamos'), await est(), 'enemigos=' + await p.evaluate(() => __L.ENEM.length));
  console.log(log.join(' | ')); console.log(errs.join(' | ') || 'sin errores'); await b.close(); })();
