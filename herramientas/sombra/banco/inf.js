// el infinito: un bot que siempre busca 300 px más arriba; se mide hasta dónde llega, de qué muere y cuánto tarda cada tramo nuevo
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + e.stack.split('\n')[1]));
  await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(500);
  for(let corrida = 0; corrida < 4; corrida++){
    const r = await p.evaluate(() => { const S = __S, N = S.NIN; S.empezarInfinito(); let t = 0, espera = 0, plan = null, maxPaso = 0, sinCamino = 0;
      const clave = q => Math.round(q.x/4) + ',' + Math.round(q.y/4) + ',' + q.nx + ',' + q.ny;
      for(let k = 0; k < 60*300 && S.J.modo === 'juego'; k++){ const t0 = performance.now(); S.sim(1, 1/60); maxPaso = Math.max(maxPaso, performance.now() - t0); t += 1/60;
        if(N.est !== 'pegado') continue; espera += 1/60; const peligro = S.ENEM.some(e => !e.muerto && e.carga > 0.5 && Math.hypot(e.x - N.x, e.y - N.y) < 170); if(espera < 0.1 && !peligro) continue; espera = 0;
        let paso = null; if(plan && plan.length){ const sig = plan[0]; if(!sig.desde || Math.hypot(sig.desde.x - N.x, sig.desde.y - N.y) < 5) paso = plan.shift(); }
        if(!paso){ const raiz = {x:N.x, y:N.y, nx:N.nx, ny:N.ny}, a = S.alcance(raiz, N.y - 300, 1500, false); if(!a.llega){ sinCamino++; plan = null; continue; }
          plan = []; let q = a.final.q; plan.unshift({a:a.final.a, f:a.final.f, desde:q}); while(q && clave(q) !== clave(raiz)){ const v = a.vistos.get(clave(q)); q = v.padre; plan.unshift({a:v.a, f:v.f, desde:q}); } plan[0].desde = null; paso = plan.shift(); }
        S.saltar(-Math.cos(paso.a)*S.V_MAX*paso.f/5.6, -Math.sin(paso.a)*S.V_MAX*paso.f/5.6); }
      return {altura:S.J.alturaMax, puntos:S.J.puntos, t:Math.round(t), causa:N.causa, sinCamino, maxPasoMs:+maxPaso.toFixed(1), tramos:S.MAPA.rMin}; });
    console.log(JSON.stringify(r)); }
  console.log(errs.slice(0, 5).join('\n') || 'sin errores'); await b.close(); })();
