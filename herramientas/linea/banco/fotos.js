// capturas de cada pantalla (celular parado 412×892, se enderezan después)
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, locale:'es-AR'})).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(900);
  const sh = async n => { await p.screenshot({path:'/tmp/ui/linea/f_' + n + '.png'}); };
  const ev = (f, a) => p.evaluate(f, a);
  await sh('01idioma'); await ev(() => __L.irA('censura')); await p.waitForTimeout(300); await sh('02censura');
  await ev(() => { __L.AJ.visto = true; __L.irA('titulo'); }); await p.waitForTimeout(300); await sh('03titulo');
  await ev(() => { __L.PROG.abierto = 4; __L.PROG.caps = {prologo:{puntos:18200, nota:'A'}, once:{puntos:51300, nota:'B'}}; __L.irA('capitulos'); }); await p.waitForTimeout(300); await sh('04capitulos');
  await ev(() => { __L.UI.elegir = 1; __L.irA('mascaras'); }); await p.waitForTimeout(300); await sh('05mascaras');
  await ev(() => __L.irA('opciones')); await p.waitForTimeout(300); await sh('06opciones');
  await ev(() => __L.jugarCap(1)); await p.waitForTimeout(1500); await sh('07depto');
  for(let k = 0; k < 3; k++){ await ev(() => { const C = __L.J.cine; C.n = 999; }); await p.waitForTimeout(100); await p.touchscreen.tap(200, 450); await p.waitForTimeout(200); }
  await p.waitForTimeout(900); await sh('08mensaje');
  await ev(() => { const C = __L.J.cine; const i = C.pasos.findIndex(q => q.k === 'escena' && q.e === 'auto'); C.i = i - 1; }); await p.touchscreen.tap(200, 450); await p.waitForTimeout(1500); await sh('09auto');
  await p.waitForTimeout(2800); await sh('10cartel');
  // pelea: se empieza el cap 2, se apura con el bot del juego un rato
  await ev(() => { __L.J.cine = null; __L.empezarCap(2); __L.AJ.balanceo = true; }); await p.waitForTimeout(600);
  await ev(() => { const L = __L; L.JUG.arma = 'escopeta'; L.JUG.balas = 6; const P = L.JUG; for(const e of L.ENEM.slice(0, 4)){ L.matar(e, 'bala', Math.random()*6); } L.JUG.x = L.ENEM[0].x - 40; L.JUG.y = L.ENEM[0].y; }); await p.waitForTimeout(300);
  await ev(() => { const L = __L; L.CAMARA.x = L.JUG.x; L.CAMARA.y = L.JUG.y; }); await p.waitForTimeout(900); await sh('11pelea');
  await ev(() => { __L.AJ.censura = true; const L = __L; for(const e of L.ENEM.slice(4, 8)) L.matar(e, 'pina', 1); L.JUG.x = L.ENEM[5].x - 20; L.JUG.y = L.ENEM[5].y; L.CAMARA.x = L.JUG.x; L.CAMARA.y = L.JUG.y; }); await p.waitForTimeout(700); await sh('12censura');
  await ev(() => { __L.AJ.censura = false; __L.J.capLimpio = true; __L.terminarCapitulo(); }); await p.waitForTimeout(4500); await sh('13resultado');
  console.log(errs.join('\n') || 'sin errores'); await b.close(); })();
