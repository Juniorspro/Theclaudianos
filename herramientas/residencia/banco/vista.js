// abre el juego, junta errores y saca capturas (derechas) de lugares y horas
const {chromium} = require('/tmp/ui/node_modules/playwright');
const fs = require('fs');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:1, locale:'es-AR', isMobile:true, hasTouch:true}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('CONS ' + m.text()); });
  await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(2500);
  const pref = process.argv[2] || 'v';
  const foto = async n => { await p.screenshot({path:'/tmp/ui/res/' + pref + '_' + n + '.png'}); };
  await foto('menu');
  const tomas = JSON.parse(process.argv[3] || '[]');
  const info = await p.evaluate(() => ({err:__R.ERRORES.slice(0, 5), est:__R.est()}));
  console.log('menu', JSON.stringify(info));
  for(const [n, x, y, z, yaw, pitch, hora, extra] of tomas){
    const r = await p.evaluate(([x, y, z, yaw, pitch, hora, extra]) => { const R = __R; if(R.J.modo !== 'juego'){ R.nuevaPartida('normal'); document.getElementById('menu').innerHTML = ''; }
      R.J.hora = hora; R.J.corre = false; Object.assign(R.JUG, {x, z, piso:y > 1.6 ? 1 : 0, y, yaw, pitch, vx:0, vz:0});
      if(extra){ try { eval(extra); } catch(e){ return 'extra: ' + e.message; } }
      R.paso(1/60, 3); R.dibujar(1/60); return JSON.stringify(R.est()) + ' ' + R.ERRORES.slice(0, 3).join(' | '); }, [x, y, z, yaw, pitch, hora, extra || '']);
    await foto(n); console.log(n, r); }
  console.log(errs.slice(0, 8).join('\n') || 'sin errores de consola'); await b.close();
  // enderezar las capturas (el escenario está girado)
})();
