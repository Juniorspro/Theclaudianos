// duelos medidos: un enemigo carga contra el pibe quieto; el pibe pega (con 0,2 s de reflejo humano) cuando lo tiene al alcance.
// ¿quién pega primero? Y con armas de fuego: cuánto tarda la patota en tirar desde que te ve.
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:892, height:412}})).newPage(); p.on('pageerror', e => console.log('PE', e.message));
  await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(600);
  const dif = process.argv[2] || 'normal';
  console.log(dif, await p.evaluate(dif => { const L = __L, out = []; L.AJ.dificultad = dif;
    const duelo = (armaE, armaJ, reflejo, n) => { let gana = 0, pierde = 0;
      for(let k = 0; k < n; k++){ L.empezarCap(1); L.J.fundido = 0;
        L.JUG.x = L.PISO.def.inicio[0]*8 + 4; L.JUG.y = L.PISO.def.inicio[1]*8 + 4; L.JUG.arma = armaJ; L.JUG.balas = 0; L.JUG.ang = 0;
        for(const e of L.ENEM) e.muerto = true;
        const e = L.ENEM.find(q => !q.T.perro && !q.T.gordo) || L.ENEM[0]; e.muerto = false; e.x = L.JUG.x + 60 + k % 5*4; e.y = L.JUG.y + (k % 3 - 1)*3; e.arma = armaE; e.ang = 3.14; e.estado = 'quieto';
        let t0 = null, vivo = true;
        window.__BOT = C => { C.mx = C.my = 0; C.apunta = false; C.tira = false; const d = Math.hypot(e.x - L.JUG.x, e.y - L.JUG.y), alc = armaJ ? 24 : 19;
          if(d < alc && t0 === null) t0 = L.J.t; if(t0 !== null && L.J.t - t0 >= reflejo){ C.apunta = true; C.ax = e.x - L.JUG.x; C.ay = e.y - L.JUG.y; C.tira = true; } };
        for(let i = 0; i < 60*5; i++){ L.sim(1, 1/60); if(L.JUG.muerto){ pierde++; break; } if(e.muerto || e.derribado > 0){ gana++; break; } } }
      window.__BOT = null; return gana + '/' + n + ' (pierde ' + pierde + ')'; };
    out.push('piña vs piña, reflejo 0,20 s: gana ' + duelo(null, null, 0.2, 30));
    out.push('piña vs bate, reflejo 0,20 s: gana ' + duelo('bate', null, 0.2, 30));
    out.push('bate vs bate, reflejo 0,25 s: gana ' + duelo('bate', 'bate', 0.25, 30));
    out.push('bate vs cuchillo, reflejo 0,30 s: gana ' + duelo('cuchillo', 'bate', 0.3, 30));
    out.push('piña vs piña, reflejo lento 0,45 s: gana ' + duelo(null, null, 0.45, 30));
    out.push('bate vs bate, reflejo lento 0,45 s: gana ' + duelo('bate', 'bate', 0.45, 30));
    // armas de fuego: cuánto tarda en tirar desde que te ve (enemigo a 110 px mirándote)
    const ts = [];
    for(let k = 0; k < 20; k++){ L.empezarCap(1); L.JUG.x = L.PISO.def.inicio[0]*8 + 4; L.JUG.y = L.PISO.def.inicio[1]*8 + 4; L.JUG.invul = 99;
      for(const e of L.ENEM) e.muerto = true; const e = L.ENEM.find(q => !q.T.perro) || L.ENEM[0]; e.muerto = false; e.x = L.JUG.x + 90 + k*2; e.y = L.JUG.y; e.arma = 'pistola'; e.balas = 9; e.ang = 3.14; e.estado = 'quieto'; e.cd = 0;
      window.__BOT = C => { C.mx = C.my = 0; C.apunta = false; C.tira = false; };
      let t = 0; for(; t < 3 && !L.BALAS.some(q => q.de === 'ene'); t += 1/60) L.sim(1, 1/60); ts.push(t); }
    window.__BOT = null; ts.sort((a, b) => a - b);
    out.push('pistola a 90-130 px: primer tiro a los ' + ts[0].toFixed(2) + ' / ' + ts[10].toFixed(2) + ' / ' + ts[19].toFixed(2) + ' s (mín / mediana / máx)');
    return '\n' + out.join('\n'); }, dif));
  await b.close(); })();
