const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true})).newPage();
  await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(700);
  console.log(await p.evaluate(() => { const L = __L; L.empezarCap(3); L.JUG.invul = 99; const t0 = performance.now(); for(let i = 0; i < 600; i++) L.sim(1, 1/60); const tl = (performance.now() - t0)/600;
    return 'lógica ' + tl.toFixed(3) + ' ms/cuadro'; }));
  const fr = await p.evaluate(() => new Promise(r => { let n = 0, t0 = performance.now(); const f = () => { n++; if(n < 120) requestAnimationFrame(f); else r((performance.now() - t0)/n); }; requestAnimationFrame(f); }));
  console.log('cuadro completo (lógica+dibujo+revelado, sin GPU)', fr.toFixed(1), 'ms'); await b.close(); })();
