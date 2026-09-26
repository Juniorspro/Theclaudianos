// dónde está parado cada enemigo: la piedra de abajo y el aire de arriba
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}})).newPage(); await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const S = __S, out = {};
    for(let i = 0; i < S.NIVELES.length; i++){ S.empezarNivel(i); for(const e of S.ENEM){ if(e.t === 'cometa') continue;
      const c = Math.floor(e.x/8), k = e.t + ' abajo:' + S.tile(c, Math.floor(e.y/8)) + ' arriba:' + S.tile(c, Math.floor((e.y - 1)/8)) + ' frac:' + (e.y % 8);
      out[k] = (out[k] || 0) + 1; } } return out; });
  console.log(r); await b.close(); })();
