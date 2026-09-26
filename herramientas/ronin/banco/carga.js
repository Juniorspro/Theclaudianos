// carga.js: abre el juego girado, mide la carga de los clips, entra a la primera pelea y saca capturas
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, locale:'es-AR'}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('consola: ' + m.text()); });
  const t0 = Date.now(); await p.goto('file:///tmp/ui/ronin/r.html');
  await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:60000}).catch(e => errs.push('no cargó el héroe'));
  console.log('carga del héroe', Date.now() - t0, 'ms');
  const info = await p.evaluate(() => ({med:__R.MED, anims:Object.fromEntries(Object.entries(__R.PJ.heroe.anims || {}).map(([k, a]) => [k, a.cuadros ? a.cuadros.length : a.length])), err:__R.ERRORES.slice(0, 5), modo:__R.JUEGO.modo}));
  console.log(JSON.stringify(info));
  await p.waitForTimeout(1500); await p.screenshot({path:'/tmp/ui/ronin/cap/1_idioma.png'});
  await p.evaluate(() => { __R.ponerIdioma('es'); __R.AJ.vistoIdioma = true; __R.UI.titulo(); }); await p.waitForTimeout(2500); await p.screenshot({path:'/tmp/ui/ronin/cap/2_titulo.png'});
  await p.evaluate(() => __R.empezarCapitulo(1)); await p.waitForFunction(() => __R.JUEGO.modo === 'pelea', null, {timeout:30000}).catch(e => errs.push('no arrancó la pelea'));
  await p.waitForTimeout(1800); await p.screenshot({path:'/tmp/ui/ronin/cap/3_pelea.png'});
  await p.evaluate(() => { __R.LUCHA.tutorial = null; }); 
  for(let i = 0; i < 40; i++){ await p.evaluate(() => { const L = __R.LUCHA, H = L.heroe, E = L.enemigo; const d = E.x - H.x;
      __R.apretar('der', Math.abs(d) > 150); if(Math.abs(d) <= 150){ __R.apretar('ataque', true); setTimeout(() => __R.apretar('ataque', false), 60); } });
    await p.waitForTimeout(150); if(i === 12) await p.screenshot({path:'/tmp/ui/ronin/cap/4_combo.png'}); }
  const st = await p.evaluate(() => { const L = __R.LUCHA; return {h:[Math.round(L.heroe.vida), L.heroe.estado], e:[Math.round(L.enemigo.vida), L.enemigo.estado], fin:L.fin, stats:L.stats, fps:__R.est().fps, err:__R.ERRORES.slice(0, 5)}; });
  console.log(JSON.stringify(st)); await p.screenshot({path:'/tmp/ui/ronin/cap/5_despues.png'});
  console.log(errs.join(' | ') || 'sin errores'); await b.close(); })();
