const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const p = await (await b.newContext({viewport:{width:892, height:412}, deviceScaleFactor:1})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(700);
  for(const c of [true, false]){
    await p.evaluate(c => { const L = __L; L.AJ.censura = c; L.AJ.balanceo = false; L.empezarCap(1); setInterval(() => L.JUG.invul = 9, 50);
      const es = L.ENEM.filter(e => !e.T.perro).slice(0, 3); const x0 = es[0].x, y0 = es[0].y;
      es.forEach((e, i) => { e.x = x0 + i*14 - 14; e.y = y0; }); L.matar(es[0], 'bala', 0); L.matar(es[1], 'remate', 1); es[2].derribado = 99; es[2].estado = 'alerta';
      L.JUG.x = x0; L.JUG.y = y0 + 22; L.CAMARA.x = x0; L.CAMARA.y = y0; L.CAMARA.lx = L.CAMARA.ly = 0; }, c);
    await p.waitForTimeout(700); await p.screenshot({path:'/tmp/ui/linea/cens_' + c + '.png', clip:{x:346, y:136, width:200, height:140}}); }
  console.log(errs.join(' | ') || 'sin errores'); await b.close(); })();
