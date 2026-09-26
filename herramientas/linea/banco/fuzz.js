const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, locale:process.argv[2] || 'es-AR'}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if(m.type() === 'error') errs.push(m.text()); }); const cdp = await ctx.newCDPSession(p);
  await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(700);
  let r = 12345; const rnd = () => (r = (r*16807) % 2147483647)/2147483647;
  const modos = {};
  for(let i = 0; i < (+process.argv[3] || 600); i++){
    const k = rnd();
    if(k < 0.04) await p.evaluate(c => { __L.AJ.visto = true; __L.J.cine = null; __L.empezarCap(c); }, Math.floor(rnd()*5));
    else if(k < 0.05) await p.evaluate(() => __L.AJ.censura = !__L.AJ.censura);
    else if(k < 0.06) await p.evaluate(() => { if(__L.J.modo === 'juego') { __L.JUG.invul = 0; } });
    else { const n = rnd() < 0.3 ? 2 : 1, pts = []; for(let j = 0; j < n; j++) pts.push({x:rnd()*412, y:rnd()*892, id:j + 1});
      await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:pts}); await p.waitForTimeout(20 + rnd()*80);
      if(rnd() < 0.6){ for(const q of pts){ q.x += (rnd() - 0.5)*120; q.y += (rnd() - 0.5)*120; } await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:pts}); await p.waitForTimeout(rnd()*400); }
      await cdp.send('Input.dispatchTouchEvent', {type:rnd() < 0.05 ? 'touchCancel' : 'touchEnd', touchPoints:[]}); }
    if(i % 50 === 0){ const s = await p.evaluate(() => ({m:__L.J.modo + ':' + __L.UI.p, nan:[__L.JUG.x, __L.JUG.y, __L.CAMARA.x, __L.J.puntos].some(v => !isFinite(v)) || __L.ENEM.some(e => !isFinite(e.x + e.y))}));
      modos[s.m] = (modos[s.m] || 0) + 1; if(s.nan) errs.push('NaN en ' + i); }
    await p.waitForTimeout(15); }
  console.log(JSON.stringify(modos), errs.slice(0, 10).join(' | ') || 'sin errores'); await b.close(); })();
