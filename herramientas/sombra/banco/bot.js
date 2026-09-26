// un bot que juega cada nivel: en cada lugar donde queda pegado busca el camino al torii y da el primer salto de ese camino
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + e.stack.split('\n')[1]));
  await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(500);
  const inv = process.argv[2] !== 'mortal', lista = (process.argv[3] || '0-23').split('-').map(Number);
  for(let i = lista[0]; i <= lista[1]; i++){ if(i % 8 === 7) continue;   /* los niveles con jefe los prueba jefes.js */
    const r = await p.evaluate(([i, inv]) => { const S = __S, N = S.NIN; S.empezarNivel(i); let saltos = 0, muertes = 0, t = 0, espera = 0, fallos = 0; const hist = []; let plan = null; const causas = {};
      const clave = q => Math.round(q.x/4) + ',' + Math.round(q.y/4) + ',' + q.nx + ',' + q.ny;
      for(let k = 0; k < 60*240 && S.J.modo === 'juego'; k++){ if(inv) N.invul = 1; S.sim(1, 1/60); t += 1/60;
        if(N.est === 'muerto'){ muertes++; causas[N.causa] = (causas[N.causa] || 0) + 1; S.reintentar(); plan = null; continue; }
        if(N.est === 'pegado'){ espera += 1/60; const peligro = S.ENEM.some(e => !e.muerto && e.carga > 0.5 && Math.hypot(e.x - N.x, e.y - N.y) < 170); if(espera < 0.1 && !peligro) continue; espera = 0;
          /* se sigue el plan entero; se vuelve a planear sólo si cayó en otro lado */
          let paso = null;
          if(plan && plan.length){ const sig = plan[0]; if(!sig.desde || Math.hypot(sig.desde.x - N.x, sig.desde.y - N.y) < 5) paso = plan.shift(); }
          if(!paso){ const raiz = {x:N.x, y:N.y, nx:N.nx, ny:N.ny}, a = S.alcance(raiz, S.MAPA.meta.y, 3000, false); if(!a.llega) { return {i, fallo:'sin camino desde ' + Math.round(N.x) + ',' + Math.round(N.y), t}; }
            plan = []; let e = a.final, q = a.final.q; plan.unshift({a:e.a, f:e.f, desde:q});
            while(q && clave(q) !== clave(raiz)){ const v = a.vistos.get(clave(q)); q = v.padre; plan.unshift({a:v.a, f:v.f, desde:q}); }
            plan[0].desde = null; paso = plan.shift(); }
          const dx = -Math.cos(paso.a)*S.V_MAX*paso.f/5.6, dy = -Math.sin(paso.a)*S.V_MAX*paso.f/5.6; const ok = S.saltar(dx, dy); if(ok) saltos++; else fallos = (fallos || 0) + 1; hist.push(Math.round(N.x) + ',' + Math.round(N.y) + (ok ? '' : '!')); if(hist.length > 8) hist.shift(); } }
      return {i, id:S.NIVELES[i].id, gano:S.J.modo === 'resultado' && S.UI.p === 'gana', t:Math.round(t), saltos, muertes, mon:S.J.monedas + '/' + S.J.totMonedas, bajas:S.J.bajas + '/' + S.J.totEnem, fallos, causas, hist:S.J.modo === 'resultado' ? '' : hist.join(' ') + ' est ' + N.est + ' plat ' + !!N.plat + ' N ' + JSON.stringify({x:N.x, y:N.y, vx:N.vx, vy:N.vy, tA:N.tAire, est:N.est, cam:S.CAM.y, tinta:S.J.tinta && S.J.tinta.y, muerto:S.J.muerto, fin:S.J.fin, modo:S.J.modo})}; }, [i, inv]);
    console.log(JSON.stringify(r)); }
  console.log(errs.slice(0, 5).join('\n') || 'sin errores'); await b.close(); })();
