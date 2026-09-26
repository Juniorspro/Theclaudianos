const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, locale:'es-AR'})).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(900);
  await p.evaluate(() => { __L.AJ.visto = true; __L.jugarCap(0); });
  let k = 0, pasos = [];
  for(let i = 0; i < 60; i++){ await p.waitForTimeout(700); const s = await p.evaluate(() => __L.J.cine ? __L.J.cine.pasos[__L.J.cine.i].k + ':' + __L.J.cine.esc : 'fin:' + __L.J.modo + ':' + __L.UI.p);
    pasos.push(s); if(['narra:depto', 'msg:depto', 'titulo:auto'].includes(s) && !pasos.slice(0, -1).includes(s)){ await p.waitForTimeout(1500); await p.screenshot({path:'/tmp/ui/linea/c_' + (k++) + '.png'}); }
    if(s.startsWith('fin')) break; await p.touchscreen.tap(206, 446); }
  console.log(pasos.join(' '), errs.join(' | ') || 'sin errores'); await b.close(); })();
