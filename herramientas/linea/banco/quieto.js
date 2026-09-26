// el pibe quieto en el arranque de cada piso: ¿lo matan sin moverse? ¿quién lo ve?
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:892, height:412}})).newPage(); p.on('pageerror', e => console.log('PE', e.message));
  await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(600);
  console.log(await p.evaluate(() => { const L = __L, out = [];
    for(let c = 0; c < 5; c++) for(let piso = 0; piso < L.CAPITULOS[c].pisos.length; piso++){
      L.empezarCap(c); if(piso) { L.J.limpio = true; L.cargarPiso(piso, 'sube'); }
      window.__BOT = C => { C.mx = C.my = 0; C.apunta = false; C.tira = false; };
      let t = 0; for(; t < 8 && !L.JUG.muerto; t += 1/60) L.sim(1, 1/60);
      const ven = L.ENEM.filter(e => e.estado === 'alerta').map(e => e.t + ':' + (e.arma || '-') + '@' + Math.round(Math.hypot(e.x - L.JUG.x, e.y - L.JUG.y)));
      out.push(c + '/' + piso + (L.JUG.muerto ? ' MUERE a ' + t.toFixed(1) + 's' : ' vive') + ' alerta ' + ven.join(' ')); }
    window.__BOT = null; return out.join('\n'); }));
  await b.close(); })();
