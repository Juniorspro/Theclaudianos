// fuzz.js: toques, dedos sostenidos, dos dedos, cancelaciones y giros al azar por menús y peleas; busca errores y estados imposibles
const {chromium} = require('/tmp/ui/node_modules/playwright');
const N = +(process.argv[2] || 500), L = process.argv[3] || 'es';
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2, isMobile:true, hasTouch:true, locale:'es-AR'}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); const cdp = await ctx.newCDPSession(p);
  await p.goto('file:///tmp/ui/ronin/r.html'); await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:60000});
  await p.evaluate(L => { __R.ponerIdioma(L); __R.PROG.oro = 3000; }, L);
  const T = (tipo, pts) => cdp.send('Input.dispatchTouchEvent', {type:tipo, touchPoints:pts.map(([x, y], i) => ({x, y, id:i + 1}))}).catch(() => {});
  const r = n => Math.floor(Math.random()*n); let raros = [];
  for(let i = 0; i < N; i++){ const k = Math.random(), a = [r(412), r(892)], b2 = [r(412), r(892)];
    if(k < 0.45){ await T('touchStart', [a]); await p.waitForTimeout(20 + r(120)); await T('touchEnd', []); }
    else if(k < 0.6){ await T('touchStart', [a]); await p.waitForTimeout(300 + r(900)); await T('touchEnd', []); }
    else if(k < 0.7){ await T('touchStart', [a]); await T('touchStart', [a, b2]); await p.waitForTimeout(100 + r(400)); await T('touchEnd', []); }
    else if(k < 0.74){ await T('touchStart', [a]); await T('touchCancel', []); }
    else if(k < 0.76){ await p.setViewportSize(Math.random() < 0.5 ? {width:892, height:412} : {width:412, height:892}); }
    else if(k < 0.8){ const btns = await p.$$('#ui button'); if(btns.length) await btns[r(btns.length)].tap().catch(() => {}); }
    else if(k < 0.83 && (await p.evaluate(() => __R.JUEGO.modo)) === 'menu'){ await p.evaluate(() => { __R.PROG.tutorial = Math.random() < 0.5; __R.empezarCapitulo(1 + Math.floor(Math.random()*3)); }); }
    else await p.waitForTimeout(r(300));
    if(i % 25 === 0){ const e = await p.evaluate(() => { const L = __R.LUCHA, H = L.heroe, E = L.enemigo, m = []; if(H){ for(const [k, v] of Object.entries({hx:H.x, hv:H.vida, hp:H.post})) if(!isFinite(v)) m.push(k + '=' + v); if(H.vida > H.vidaMax + 1) m.push('vida>max'); }
        if(E){ for(const [k, v] of Object.entries({ex:E.x, ev:E.vida})) if(!isFinite(v)) m.push(k + '=' + v); } if(__R.PROG.oro < 0 || !isFinite(__R.PROG.oro)) m.push('oro=' + __R.PROG.oro); return m; }); raros = raros.concat(e); } }
  const est = await p.evaluate(() => ({modo:__R.JUEGO.modo, oro:__R.PROG.oro, err:__R.ERRORES.map(String).slice(0, 5)}));
  console.log(L, N, 'acciones · estados raros', JSON.stringify([...new Set(raros)]), '·', JSON.stringify(est)); console.log(errs.join(' | ') || 'sin errores de página'); await b.close(); })();
