// el ninja atraviesa a un samurái: se mide que muere y se captura cómo vuelan las dos mitades
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, locale:'es-AR'})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const S = __S; for(let i = 8; i < 24; i++){ S.empezarNivel(i); const e = S.ENEM.find(e => e.t === 'samurai'); if(!e) continue;
      S.NIN.x = e.x - 14; S.NIN.y = e.y - 6; S.NIN.est = 'aire'; S.NIN.vx = 180; S.NIN.vy = -20; S.NIN.tAire = 1; S.sim(8, 1/60);
      const partes = S.J.bajas; return {nivel:i, muerto:e.muerto, bajas:S.J.bajas, x:e.x, y:e.y}; } });
  await p.evaluate(() => __S.sim(10, 1/60)); await p.waitForTimeout(200); await p.screenshot({path:'/tmp/ui/sombra/tajo.png'});
  console.log(r, errs.length ? errs : 'sin errores'); await b.close(); })();
