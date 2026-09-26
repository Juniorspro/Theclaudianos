// dedos de verdad (CDP) en la pantalla girada: palanca izquierda camina, derecha apunta y tira, botón agarra
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, locale:'es-AR'}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); const cdp = await ctx.newCDPSession(p);
  await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(800);
  await p.evaluate(() => { __L.AJ.visto = true; __L.empezarCap(1); setInterval(() => __L.JUG.invul = 9, 50); }); await p.waitForTimeout(500);
  // del lienzo chico a la pantalla del celular
  const pan = await p.evaluate(() => ({PX:Math.round(innerHeight*devicePixelRatio/ Math.ceil(innerWidth*devicePixelRatio/ 1) ), dpr:devicePixelRatio}));
  const conv = await p.evaluate(() => { const k = (x, y) => { const s = document.getElementById('gl').getBoundingClientRect(); return null; }; return 1; });
  const aPant = async (lx, ly) => p.evaluate(([lx, ly]) => { const r = document.getElementById('gl'); const cssW = parseFloat(r.style.width), W = r.width; const sx = lx*cssW/W, sy = ly*cssW/W; return [innerWidth - sy, sx]; }, [lx, ly]);
  const toque = (tipo, pts) => cdp.send('Input.dispatchTouchEvent', {type:tipo, touchPoints:pts.map(([x, y], i) => ({x, y, id:i + 1}))});
  const est = () => p.evaluate(() => ({x:+__L.JUG.x.toFixed(1), y:+__L.JUG.y.toFixed(1), ang:+__L.JUG.ang.toFixed(2), arma:__L.JUG.arma, balas:__L.JUG.balas, bajas:__L.J.bajas, apunta:__L.CTRL.apunta}));
  const cm = await p.evaluate(() => __L.centroPalo('mov')), cp = await p.evaluate(() => __L.centroPalo('palo')), ca = await p.evaluate(() => __L.centroAccion());
  const M = await aPant(cm.x, cm.y), Mup = await aPant(cm.x + 20, cm.y), Pc = await aPant(cp.x, cp.y);
  // 1) palanca izquierda a la derecha 1 s
  let a = await est(); await toque('touchStart', [M]); await p.waitForTimeout(60); await toque('touchMove', [Mup]); await p.waitForTimeout(1000); await toque('touchEnd', []); let d = await est();
  console.log('camina derecha: dx', (d.x - a.x).toFixed(1), 'dy', (d.y - a.y).toFixed(1));
  // 2) palanca izquierda arriba
  a = await est(); const Mu = await aPant(cm.x, cm.y - 20); await toque('touchStart', [M]); await p.waitForTimeout(60); await toque('touchMove', [Mu]); await p.waitForTimeout(700); await toque('touchEnd', []); d = await est();
  console.log('camina arriba: dx', (d.x - a.x).toFixed(1), 'dy', (d.y - a.y).toFixed(1));
  // 3) arma en la mano y un enemigo delante: la derecha apunta hacia él y tira
  await p.evaluate(() => { const L = __L, e = L.ENEM.find(e => !e.muerto && !e.T.perro); L.JUG.arma = 'pistola'; L.JUG.balas = 9; L.JUG.x = L.PISO.def.inicio[0]*8 + 4; L.JUG.y = L.PISO.def.inicio[1]*8 + 4; e.x = L.JUG.x + 60; e.y = L.JUG.y - 6; window._ve = L.seVe(L.JUG.x, L.JUG.y, e.x, e.y); e.estado = 'quieto'; e.ang = 0; e.arma = null; L.PISO.def && 0; window._e = e; });
  const Pr = await aPant(cp.x + 22, cp.y); await toque('touchStart', [Pc]); await p.waitForTimeout(60); await toque('touchMove', [Pr]); await p.waitForTimeout(500); await toque('touchEnd', []); d = await est();
  console.log('apunta y tira: ang', d.ang, 'balas', d.balas, 'muerto', await p.evaluate(() => _e.muerto), 'bajas', d.bajas, 've', await p.evaluate(() => _ve));
  // 4) dos dedos: caminar y apuntar a la vez
  a = await est(); await toque('touchStart', [M, Pc]); await p.waitForTimeout(60); await toque('touchMove', [Mup, await aPant(cp.x, cp.y - 10)]); await p.waitForTimeout(600); d = await est(); await toque('touchEnd', []);
  console.log('dos dedos: dx', (d.x - a.x).toFixed(1), 'apunta', d.apunta, 'ang', d.ang);
  // 5) botón: tirar el arma
  const A = await aPant(ca.x, ca.y); await toque('touchStart', [A]); await p.waitForTimeout(80); await toque('touchEnd', []); d = await est();
  console.log('botón tira el arma: arma', d.arma, 'items', await p.evaluate(() => __L.ITEMS.length));
  // 6) botón: agarrarla de nuevo
  await p.waitForTimeout(1200); await p.evaluate(() => { const L = __L, it = L.ITEMS[L.ITEMS.length - 1]; L.JUG.x = it.x; L.JUG.y = it.y; }); console.log('acción antes', await p.evaluate(() => { const a = __L.accionDisponible(); return (a && a.k) + ' ' + JSON.stringify(__L.ITEMS.map(i => [i.k, Math.round(i.x - __L.JUG.x), Math.round(i.y - __L.JUG.y), i.vuela])); }));
  await toque('touchStart', [A]); await p.waitForTimeout(80); await toque('touchEnd', []); d = await est(); console.log('botón agarra: arma', d.arma, 'balas', d.balas);
  // 7) pausa arriba al medio
  const Pz = await aPant(await p.evaluate(() => innerHeight*0 + document.getElementById('gl').width/2), 8); await toque('touchStart', [Pz]); await toque('touchEnd', []); await p.waitForTimeout(100);
  console.log('pausa', await p.evaluate(() => __L.J.pausa));
  console.log(errs.join(' | ') || 'sin errores'); await b.close(); })();
