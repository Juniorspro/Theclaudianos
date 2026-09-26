// toques.js: dedos de verdad (CDP) en la pantalla parada con el juego girado: menú, capítulo y pelea
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true, locale:'es-AR'}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); const cdp = await ctx.newCDPSession(p);
  await p.goto('file:///tmp/ui/ronin/r.html'); await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:60000});
  /* del escenario (x, y) a la pantalla: girado 90° a la derecha, (x, y) → (W_pantalla − y, x) */
  const aPant = (x, y) => [412 - y, x];
  const T = (tipo, pts) => cdp.send('Input.dispatchTouchEvent', {type:tipo, touchPoints:pts.map(([x, y], i) => ({x, y, id:i + 1}))});
  const tocarEl = async sel => { const c = await p.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; }, sel); await T('touchStart', [c]); await p.waitForTimeout(60); await T('touchEnd', []); await p.waitForTimeout(700); };
  const modo = () => p.evaluate(() => __R.JUEGO.modo);
  await tocarEl('#l_es'); console.log('tras idioma:', await p.evaluate(() => !!document.querySelector('#m_hist')));
  await tocarEl('#m_hist'); console.log('capítulos abiertos:', await p.evaluate(() => !!document.querySelector('#c_1')));
  await p.evaluate(() => { __R.PROG.tutorial = true; }); await tocarEl('#c_1'); await p.waitForFunction(() => __R.JUEGO.modo === 'pelea', null, {timeout:20000}); await p.waitForTimeout(2600);
  const zonas = await p.evaluate(() => Object.fromEntries(__R.ENT.zonas.map(z => [z.id, [Math.round(z.x), Math.round(z.y)]])));
  const st = () => p.evaluate(() => { const H = __R.LUCHA.heroe; return {x:Math.round(H.x), est:H.estado, g:__R.LUCHA.stats.golpes}; });
  const a0 = await st(); await T('touchStart', [aPant(...zonas.der)]); await p.waitForTimeout(700); await T('touchEnd', []); const a1 = await st();
  console.log('▶ 0,7 s: de', a0.x, 'a', a1.x);
  await T('touchStart', [aPant(...zonas.izq)]); await p.waitForTimeout(400); await T('touchEnd', []); const a2 = await st(); console.log('◀ 0,4 s: a', a2.x);
  await T('touchStart', [aPant(...zonas.ataque)]); await p.waitForTimeout(50); await T('touchEnd', []); await p.waitForTimeout(80); console.log('ATACAR:', (await st()).est);
  await p.waitForTimeout(700); await T('touchStart', [aPant(...zonas.guardia)]); await p.waitForTimeout(300); console.log('GUARDIA apoyada:', (await st()).est); await T('touchEnd', []);
  await p.waitForTimeout(400); await T('touchStart', [aPant(...zonas.esquive)]); await p.waitForTimeout(40); await T('touchEnd', []); await p.waitForTimeout(60); console.log('ESQUIVE:', (await st()).est);
  /* dos dedos: caminar y atacar a la vez */
  await p.waitForTimeout(800); await T('touchStart', [aPant(...zonas.der)]); await p.waitForTimeout(200); await T('touchStart', [aPant(...zonas.der), aPant(...zonas.ataque)]); await p.waitForTimeout(60); console.log('dos dedos:', (await st()).est); await T('touchEnd', []);
  await p.waitForTimeout(300); await T('touchStart', [aPant(...zonas.pausa)]); await p.waitForTimeout(50); await T('touchEnd', []); await p.waitForTimeout(300); console.log('pausa:', await p.evaluate(() => __R.JUEGO.pausa));
  await tocarEl('#p_seg'); console.log('seguir:', await p.evaluate(() => __R.JUEGO.pausa));
  console.log(errs.concat(await p.evaluate(() => __R.ERRORES.map(String))).join(' | ') || 'sin errores'); await b.close(); })();
