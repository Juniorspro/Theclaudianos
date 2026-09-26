// dedos de verdad sobre la pantalla girada: menús, palanca, mirada, dos dedos, botones
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:1, locale:'es-AR', isMobile:true, hasTouch:true}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('CONS ' + m.text()); });
  await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(2000); const cdp = await ctx.newCDPSession(p);
  const W = 412; const pant = (X, Y) => ({x:W - Y, y:X});   // escenario -> pantalla (girado 90°)
  const toque = async (tipo, pts) => cdp.send('Input.dispatchTouchEvent', {type:tipo, touchPoints:pts.map(([x, y, id]) => ({x, y, id, radiusX:5, radiusY:5, force:1}))});
  const tap = async (x, y) => { await toque('touchStart', [[x, y, 1]]); await p.waitForTimeout(60); await toque('touchEnd', []); await p.waitForTimeout(250); };
  const centro = async sel => p.evaluate(s => { const e = typeof s === 'string' && s.startsWith('#') ? document.querySelector(s) : [...document.querySelectorAll('#menu button')].find(b => b.textContent.includes(s)); if(!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }, sel);
  const tocarBoton = async sel => { const c = await centro(sel); if(!c) return 'NO ESTÁ ' + sel; await tap(c[0], c[1]); return 'ok'; };
  const est = () => p.evaluate(() => { const R = __R; return {modo:R.J.modo, x:+R.JUG.x.toFixed(2), z:+R.JUG.z.toFixed(2), yaw:+R.JUG.yaw.toFixed(3), pitch:+R.JUG.pitch.toFixed(3), pausa:R.J.pausa, menu:document.getElementById('menu').innerText.slice(0, 40).replace(/\n/g, ' '), pensado:document.getElementById('pensado').textContent}; });
  const out = [];
  out.push(['idioma', await tocarBoton('ESPAÑOL'), await est()]);
  out.push(['jugar', await tocarBoton('JUGAR'), await est()]);
  out.push(['normal', await tocarBoton('NORMAL'), await est()]);
  await p.waitForTimeout(600);
  /* la palanca: el dedo en el 20% izquierdo y arrastrado 60 px para adelante, 1,5 s */
  const a0 = await est(); let q = pant(180, 300); await toque('touchStart', [[q.x, q.y, 1]]);
  for(let i = 1; i <= 6; i++){ q = pant(180, 300 - i*10); await toque('touchMove', [[q.x, q.y, 1]]); await p.waitForTimeout(30); }
  await p.waitForTimeout(1500); await toque('touchEnd', []); const a1 = await est(); out.push(['palanca adelante', {dz:+(a1.z - a0.z).toFixed(2), dx:+(a1.x - a0.x).toFixed(2)}]);
  /* mirar: arrastrar 120 px a la derecha en la mitad derecha */
  q = pant(620, 200); await toque('touchStart', [[q.x, q.y, 2]]); for(let i = 1; i <= 8; i++){ q = pant(620 + i*15, 200); await toque('touchMove', [[q.x, q.y, 2]]); await p.waitForTimeout(20); }
  await toque('touchEnd', []); await p.waitForTimeout(100); const a2 = await est(); out.push(['mirar a la derecha', {dyaw:+(a2.yaw - a1.yaw).toFixed(3)}]);
  q = pant(620, 200); await toque('touchStart', [[q.x, q.y, 2]]); for(let i = 1; i <= 8; i++){ q = pant(620, 200 - i*10); await toque('touchMove', [[q.x, q.y, 2]]); await p.waitForTimeout(20); }
  await toque('touchEnd', []); await p.waitForTimeout(100); const a3 = await est(); out.push(['mirar arriba', {dpitch:+(a3.pitch - a2.pitch).toFixed(3)}]);
  /* dos dedos: caminar y mirar a la vez */
  const l = pant(180, 300), r = pant(620, 200); await toque('touchStart', [[l.x, l.y, 1]]); await toque('touchStart', [[l.x, l.y, 1], [r.x, r.y, 2]]);
  for(let i = 1; i <= 8; i++){ const l2 = pant(180, 300 - Math.min(6, i)*10), r2 = pant(620 - i*12, 200); await toque('touchMove', [[l2.x, l2.y, 1], [r2.x, r2.y, 2]]); await p.waitForTimeout(40); }
  await p.waitForTimeout(800); await toque('touchEnd', []); const a4 = await est(); out.push(['dos dedos', {movio:+Math.hypot(a4.x - a3.x, a4.z - a3.z).toFixed(2), dyaw:+(a4.yaw - a3.yaw).toFixed(3)}]);
  out.push(['linterna sin tener', await tocarBoton('#bLinterna'), (await est()).pensado]);
  out.push(['pausa', await tocarBoton('#bPausa'), (await est()).pausa]);
  out.push(['seguir', await tocarBoton('SEGUIR'), (await est()).pausa]);
  /* la mano: parado frente a la puerta y mirándola */
  await p.evaluate(() => { const R = __R; Object.assign(R.JUG, {x:0.25, z:-6.3, yaw:Math.PI, pitch:-0.1}); });
  await p.waitForTimeout(400); out.push(['mano en la puerta', await tocarBoton('#bAccion'), await p.evaluate(() => __R.MUNDO.puertas.p_frente.meta)]);
  const fin = await p.evaluate(() => ({err:__R.ERRORES.slice(0, 3), falta:[...__R.TR_FALTA]}));
  for(const o of out) console.log(JSON.stringify(o)); console.log(JSON.stringify(fin)); console.log(errs.slice(0, 5).join('\n') || 'sin errores de consola'); await b.close(); })();
