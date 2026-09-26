const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, locale:'es-AR'}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); const cdp = await ctx.newCDPSession(p);
  await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(800);
  const T = (tipo, pts) => cdp.send('Input.dispatchTouchEvent', {type:tipo, touchPoints:pts.map(([x, y], i) => ({x, y, id:i + 1}))});
  const st = () => p.evaluate(() => ({x:+__S.NIN.x.toFixed(1), y:+__S.NIN.y.toFixed(1), est:__S.NIN.est, dj:__S.NIN.dj, ts:+__S.J.ts.toFixed(2)}));
  await p.evaluate(() => __S.empezarNivel(1)); await p.waitForTimeout(1200);
  // tirar para atrás y abajo-izquierda: salta arriba-derecha
  await T('touchStart', [[206, 500]]); await p.waitForTimeout(80); await T('touchMove', [[180, 600]]); await p.waitForTimeout(700);
  const a = await st(); await p.screenshot({path:'/tmp/ui/sombra/d_apunta.png'});
  await T('touchEnd', []); await p.waitForTimeout(250); const b1 = await st(); await p.screenshot({path:'/tmp/ui/sombra/d_aire.png'});
  // doble salto en el aire
  await T('touchStart', [[206, 500]]); await p.waitForTimeout(60); await T('touchMove', [[240, 580]]); await p.waitForTimeout(400); const c = await st(); await p.screenshot({path:'/tmp/ui/sombra/d_aire_apunta.png'});
  await T('touchEnd', []); await p.waitForTimeout(100); const d = await st();
  await p.waitForTimeout(1500); const e = await st();
  console.log('apuntando', JSON.stringify(a), '\nsoltó', JSON.stringify(b1), '\napunta en el aire', JSON.stringify(c), '\ndoble', JSON.stringify(d), '\nfinal', JSON.stringify(e));
  // pausa
  await p.touchscreen.tap(400, 20); await p.waitForTimeout(200); console.log('pausa', await p.evaluate(() => __S.J.pausa));
  console.log(errs.join(' | ') || 'sin errores'); await b.close(); })();
