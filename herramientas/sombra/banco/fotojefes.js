const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, locale:'es-AR'})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(700);
  for(const [i, n] of [[7, 'tengu'], [15, 'yuki'], [23, 'shogun']]){
    await p.evaluate(i => { const S = __S, N = S.NIN; S.empezarNivel(i); const A = S.J.arena; Object.assign(N, {x:20, y:A.pisoY - 52.01, nx:0, ny:-1, est:'pegado'}); S.J.fundido = 0; S.J.reloj = 5; setInterval(() => N.invul = 2, 30); }, i);
    await p.waitForTimeout(1200); await p.screenshot({path:'/tmp/ui/sombra/j_' + n + '_intro.png'});
    await p.waitForTimeout(4200); await p.screenshot({path:'/tmp/ui/sombra/j_' + n + '.png'}); }
  console.log(errs.join(' | ') || 'sin errores'); await b.close(); })();
