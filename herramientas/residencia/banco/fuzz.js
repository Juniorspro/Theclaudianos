// toques al azar sobre todo (palanca, mirada, botones, menús) saltando de hora; busca errores, NaN y estados imposibles
// node fuzz.js acciones [idioma]
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:1, locale:process.argv[3] || 'es-AR', isMobile:true, hasTouch:true}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('CONS ' + m.text()); });
  await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(2000); const cdp = await ctx.newCDPSession(p);
  const N = +(process.argv[2] || 300), rnd = (a, b) => a + Math.random()*(b - a); let malos = [];
  const toque = (tipo, pts) => cdp.send('Input.dispatchTouchEvent', {type:tipo, touchPoints:pts.map(([x, y, id]) => ({x, y, id}))});
  for(let i = 0; i < N; i++){ const r = Math.random();
    try {
      if(r < 0.35){ const x = rnd(5, 407), y = rnd(5, 887); await toque('touchStart', [[x, y, 1]]); await p.waitForTimeout(rnd(20, 120)); await toque('touchEnd', []); }
      else if(r < 0.6){ let x = rnd(20, 390), y = rnd(20, 870); await toque('touchStart', [[x, y, 1]]); for(let k = 0; k < 5; k++){ x += rnd(-40, 40); y += rnd(-40, 40); await toque('touchMove', [[x, y, 1]]); await p.waitForTimeout(25); } await toque('touchEnd', []); }
      else if(r < 0.72){ await toque('touchStart', [[rnd(250, 400), rnd(50, 350), 1], [rnd(20, 200), rnd(500, 850), 2]]); await p.waitForTimeout(rnd(80, 400)); await toque(Math.random() < 0.2 ? 'touchCancel' : 'touchEnd', []); }
      else if(r < 0.85){ const bs = await p.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(e => { const q = e.getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; }));
        if(bs.length){ const [x, y] = bs[Math.floor(Math.random()*bs.length)]; await toque('touchStart', [[x, y, 1]]); await p.waitForTimeout(rnd(30, 900)); await toque('touchEnd', []); } }
      else if(r < 0.93){ await p.evaluate(() => { const R = __R; if(R.J.modo === 'juego'){ R.J.hora = Math.min(29.9, R.J.hora + Math.random()*2.5); R.J.corre = true; if(R.J.fase === 'radio' || R.J.fase === 'llegada') R.J.fase = 'prep'; } else if(R.J.modo === 'menu' && Math.random() < 0.5){ R.nuevaPartida(['facil', 'normal', 'pesadilla'][Math.floor(Math.random()*3)]); document.getElementById('menu').innerHTML = ''; } }); }
      else { await p.evaluate(() => { const R = __R; if(R.J.modo !== 'juego') return; const a = Object.values(R.MUNDO.interactivos), o = a[Math.floor(Math.random()*a.length)]; Object.assign(R.JUG, {x:o.pos[0] + (Math.random() - 0.5), z:o.pos[2] + (Math.random() - 0.5), piso:o.piso || 0, y:R.alturaPiso(o.piso || 0)}); }); }
      await p.waitForTimeout(rnd(10, 90));
      if(i % 20 === 0){ const s = await p.evaluate(() => { const R = __R, J = R.JUG, M = R.MON, f = [J.x, J.z, J.y, J.yaw, J.pitch, M.x, M.z, M.y, R.J.hora, R.GEN.nafta, J.o2, J.energia]; return {nan:f.some(v => !Number.isFinite(v)), modo:R.J.modo, en:J.en, est:M.estado, hora:R.J.hora, err:R.ERRORES.length, o2:J.o2, fps:R.est().fps}; });
        if(s.nan || !['menu', 'juego', 'susto', 'muerte', 'victoria'].includes(s.modo)) malos.push([i, s]); if(i % 100 === 0) console.log(i, JSON.stringify(s)); }
    } catch(e){ malos.push([i, 'EXC ' + e.message]); } }
  const fin = await p.evaluate(() => ({err:__R.ERRORES.slice(0, 5), falta:[...__R.TR_FALTA], son:__R.SON()._err ? __R.SON()._err.slice(0, 5) : null, faltanSon:__R.SON()._faltan ? [...__R.SON()._faltan] : null}));
  console.log('malos', JSON.stringify(malos.slice(0, 5))); console.log(JSON.stringify(fin)); console.log(errs.slice(0, 5).join('\n') || 'sin errores de consola'); await b.close(); })();
