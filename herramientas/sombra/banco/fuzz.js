const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, locale:process.argv[2] || 'es-AR'}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' ' + e.stack.split('\n')[1])); p.on('console', m => { if(m.type() === 'error') errs.push(m.text()); }); const cdp = await ctx.newCDPSession(p);
  await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(700);
  let r = 4242; const rnd = () => (r = (r*16807) % 2147483647)/2147483647; const modos = {};
  for(let i = 0; i < (+process.argv[3] || 500); i++){ const k = rnd();
    if(k < 0.03) await p.evaluate(n => __S.empezarNivel(n), Math.floor(rnd()*24));
    else if(k < 0.05) await p.evaluate(() => __S.empezarInfinito());
    else if(k < 0.06) await p.evaluate(() => __S.volverAlMenu());
    else { const n = rnd() < 0.2 ? 2 : 1, pts = []; for(let j = 0; j < n; j++) pts.push({x:rnd()*412, y:rnd()*892, id:j + 1});
      await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:pts}); await p.waitForTimeout(20 + rnd()*60);
      if(rnd() < 0.7){ for(const q of pts){ q.x += (rnd() - 0.5)*200; q.y += (rnd() - 0.5)*200; } await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:pts}); await p.waitForTimeout(rnd()*500); }
      await cdp.send('Input.dispatchTouchEvent', {type:rnd() < 0.05 ? 'touchCancel' : 'touchEnd', touchPoints:[]}); }
    if(i % 40 === 0){ const s = await p.evaluate(() => ({m:__S.J.modo + ':' + __S.UI.p, nan:[__S.NIN.x, __S.NIN.y, __S.CAM.y, __S.J.puntos, __S.PROG.monedas].some(v => !isFinite(v)), neg:__S.PROG.monedas < 0}));
      modos[s.m] = (modos[s.m] || 0) + 1; if(s.nan) errs.push('NaN en ' + i); if(s.neg) errs.push('monedas negativas en ' + i); }
    await p.waitForTimeout(10); }
  console.log(JSON.stringify(modos), errs.slice(0, 8).join(' | ') || 'sin errores'); await b.close(); })();
