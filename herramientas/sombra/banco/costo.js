// cuánto cuesta dibujar un personaje nuevo
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}})).newPage(); await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const {lienzo, dibujarNinja, dibujarEnemigo} = __S.arte, E = __S.EFECTOS.noche, [c, g] = lienzo(200, 400), out = {};
    const med = (k, fn) => { for(let i = 0; i < 200; i++) fn(i); const t0 = performance.now(); for(let i = 0; i < 2000; i++) fn(i); out[k] = +((performance.now() - t0)/2000).toFixed(4) + ' ms'; };
    med('ninja', i => dibujarNinja(g, 100, 100, 'salto', 1, i*0.01, E, {bufanda:[{x:99, y:97}, {x:96, y:97}, {x:93, y:98}, {x:90, y:98}, {x:87, y:99}, {x:84, y:99}], colBuf:'#e8384a'}));
    for(const t of ['tirador', 'samurai', 'shuriken', 'cometa']) med(t, i => dibujarEnemigo(g, {t, x:100, y:100, dir:1, fase:0, carga:i % 2 ? 0.3 : 0, apunta:0.3}, E, i*0.01));
    return out; });
  console.log(r); await b.close(); })();
