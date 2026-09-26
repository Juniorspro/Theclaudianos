// un bot que juega: va al enemigo más cercano por el campo de distancias, levanta armas, tira, remata, sube y vuelve al auto
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:892, height:412}, locale:'es-AR'})).newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(800);
  const inv = process.argv[2] !== 'mortal', caps = (process.argv[3] || '0,1,2,3,4').split(',').map(Number);
  for(const c of caps){
    const r = await p.evaluate(([c, inv]) => {
      const L = __L; L.AJ.visto = true; L.empezarCap(c);
      let muertes = 0, t = 0, trabado = 0, ult = [0, 0], log = [];
      window.__BOT = (C) => { const J = L.J, P = L.JUG; C.mx = C.my = 0; C.apunta = false; C.tira = false;
        if(P.muerto){ return; } if(inv) P.invul = 1;
        const vivos = L.ENEM.filter(e => !e.muerto), def = L.PISO.def;
        const ir = (x, y) => { window._obj = [Math.round(x/8), Math.round(y/8)]; const f = L.campo(x, y), q = L.pasoCampo(f, P.x, P.y); if(q){ C.mx = q.x - P.x; C.my = q.y - P.y; const n = Math.hypot(C.mx, C.my) || 1; C.mx /= n; C.my /= n; } else { C.mx = x - P.x; C.my = y - P.y; const n = Math.hypot(C.mx, C.my) || 1; C.mx /= n; C.my /= n; } };
        const a = L.accionDisponible(); if(a && a.k === 'rematar'){ L.hacerAccion(); return; }
        const gordo = L.ENEM.some(e => !e.muerto && (e.T.gordo || e.T.jefe)), sirve = k => !L.ARMAS[k].melee || L.ARMAS[k].corta;
        if(!P.arma || (L.ARMAS[P.arma].balas && P.balas === 0) || (gordo && !sirve(P.arma))){ const it = L.ITEMS.filter(i => !i.vuela && (!L.ARMAS[i.k].balas || i.balas > 0) && (!gordo || sirve(i.k))).sort((u, v) => Math.hypot(u.x - P.x, u.y - P.y) - Math.hypot(v.x - P.x, v.y - P.y))[0];
          if(a && a.k === 'agarrar' && (!P.arma || P.balas === 0 || (gordo && !sirve(P.arma) && sirve(a.it.k)))){ L.hacerAccion(); return; }
          if(it && Math.hypot(it.x - P.x, it.y - P.y) < (gordo && P.arma && !sirve(P.arma) || P.arma && P.balas === 0 && L.ARMAS[P.arma].balas ? 900 : 90)){ ir(it.x, it.y); return; } }
        if(vivos.length){ const fJ = L.campo(P.x, P.y), w = L.PISO.w; let e = null, md = 1e9;
          const puede = q => sirve(P.arma || 'bate') && P.arma || !(q.T.gordo || q.T.jefe);
          for(const q of vivos.filter(puede).length ? vivos.filter(puede) : vivos){ const d = fJ[Math.floor(q.y/8)*w + Math.floor(q.x/8)]; if(d >= 0 && d < md){ md = d; e = q; } }
          if(!e) e = vivos[0];
          const d = Math.hypot(e.x - P.x, e.y - P.y), ve = L.seVe(P.x, P.y, e.x, e.y), A = P.arma && L.ARMAS[P.arma];
          if(A && !A.melee && P.balas === 0 && ve && d < 110){ C.apunta = true; C.ax = e.x - P.x; C.ay = e.y - P.y; P.ang = Math.atan2(C.ay, C.ax); L.hacerAccion(); return; }
          if(ve && (A && !A.melee ? d < 190 && P.balas > 0 : d < 22)){ C.apunta = true; C.ax = e.x - P.x; C.ay = e.y - P.y; C.tira = true; if(A && !A.melee) return; }
          ir(e.x, e.y); return; }
        const obj = J.capLimpio ? (def.auto || def.baja) : def.sube; if(obj) ir(obj[0]*8 + 4, obj[1]*8 + 4); };
      const pisos = []; L.AJ.balanceo = false;
      for(let i = 0; i < 60*60*8 && L.J.modo === 'juego'; i++){ L.sim(1, 1/60); t += 1/60;
        if(L.JUG.muerto){ muertes++; L.reintentar(); }
        if(i % 120 === 0){ const dd = Math.hypot(L.JUG.x - ult[0], L.JUG.y - ult[1]); trabado = dd < 3 ? trabado + 2 : 0; ult = [L.JUG.x, L.JUG.y]; if(trabado > 20){ log.push(JSON.stringify(L.PISO.puertas.map(d => [d.hx, d.hy, +d.ang.toFixed(2)])) + ' arma ' + L.JUG.arma + ' items ' + JSON.stringify(L.ITEMS.map(i => [i.k, Math.round(i.x), Math.round(i.y)])) + ' ' + 'trabado en ' + L.J.pisoIdx + ' ' + Math.round(L.JUG.x/8) + ',' + Math.round(L.JUG.y/8) + ' obj ' + JSON.stringify(window._obj) + ' C ' + L.CTRL.mx.toFixed(2) + ',' + L.CTRL.my.toFixed(2) + ' vel ' + L.JUG.vx.toFixed(1) + ',' + L.JUG.vy.toFixed(1) + ' enem ' + JSON.stringify(L.ENEM.filter(e => !e.muerto).map(e => [e.t, Math.round(e.x), Math.round(e.y), e.estado, +e.derribado.toFixed(1)])) + ' celdas ' + L.ENEM.filter(e => !e.muerto).map(e => L.PISO.mapa[Math.floor(e.y/8)][Math.floor(e.x/8)] + (L.chocaCirculo(e.x, e.y, 3.8) ? 'X' : '') + (L.seVe(L.JUG.x, L.JUG.y, e.x, e.y) ? 'V' : '')).join('') + ' jug ' + Math.round(L.JUG.x) + ',' + Math.round(L.JUG.y) + ' vivos ' + L.ENEM.filter(e => !e.muerto).length); break; } }
        if(!pisos.includes(L.J.pisoIdx)) pisos.push(L.J.pisoIdx); }
      window.__BOT = null;
      return {c, modo:L.J.modo, t:Math.round(t), muertes, pts:L.J.puntos, bajas:L.J.bajas, nota:L.UI.res && L.UI.res.nota, total:L.UI.res && L.UI.res.total, pisos, log, combo:L.J.maxCombo};
    }, [c, inv]);
    console.log(JSON.stringify(r)); if(r.log.length){ await p.evaluate(() => { __L.J.pausa = false; }); await p.waitForTimeout(300); await p.screenshot({path:'/tmp/ui/linea/trabado' + c + '.png'}); }
  }
  console.log(errs.slice(0, 10).join('\n') || 'sin errores');
  await b.close();
})();
