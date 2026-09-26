// pelea contra los tres jefes: el pibe arranca parado en el piso de la arena; en cada lugar pegado prueba 90 saltos y elige
// el que pasa más rápido por el cuerpo del jefe (y, con el shogun, de arriba o por la espalda). Mide golpes, muertes y tiempo.
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + e.stack.split('\n')[1]));
  await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(500);
  /* con SONIDO=1 se prende el audio y se anota qué efectos y qué temas pide la pelea */
  if(process.env.SONIDO) await p.evaluate(() => { const S = __S.SON; S.arrancar(); const fx = S.fx, mu = S.musica; window.__LOG = {fx:{}, musica:[]};
    S.fx = (n, o) => { window.__LOG.fx[n] = (window.__LOG.fx[n] || 0) + 1; return fx(n, o); }; S.musica = m => { window.__LOG.musica.push(m); return mu(m); }; });
  const inv = process.argv[2] !== 'mortal';
  for(const i of [7, 15, 23]){ for(let corrida = 0; corrida < (inv ? 1 : 3); corrida++){
    const r = await p.evaluate(([i, inv]) => { const S = __S, N = S.NIN; S.empezarNivel(i); const A = S.J.arena; let t = 0, espera = 0, saltos = 0, muertes = 0, causas = {};
      const alPiso = () => { Object.assign(N, {x:20, y:A.pisoY - 48 - S.HH - 0.01, nx:0, ny:-1, est:'pegado', vx:0, vy:0, plat:null}); S.CAM.y = (A.techoY + A.pisoY)/2 - 200; };
      alPiso();
      for(let k = 0; k < 60*180 && S.J.modo === 'juego'; k++){ if(inv) N.invul = 1; const j0 = S.J.jefe, px0 = j0.x, py0 = j0.y; S.sim(1, 1/60); t += 1/60; const j = S.J.jefe; const jvx = (j.x - px0)*60, jvy = (j.y - py0)*60;
        if(N.est === 'muerto'){ muertes++; causas[N.causa] = (causas[N.causa] || 0) + 1; S.reintentar(); alPiso(); continue; }
        if(j.fuera && N.est === 'pegado'){ /* la reja se abrió: se sube al torii */ const a = S.alcance({x:N.x, y:N.y, nx:N.nx, ny:N.ny}, S.MAPA.meta.y, 2000, false);
          if(a.llega){ let e = a.final, q = e.q; const clave = q => Math.round(q.x/4) + ',' + Math.round(q.y/4) + ',' + q.nx + ',' + q.ny; while(clave(q) !== clave({x:N.x, y:N.y, nx:N.nx, ny:N.ny})){ const v = a.vistos.get(clave(q)); e = v; q = v.padre; }
            S.saltar(-Math.cos(e.a)*S.V_MAX*e.f/5.6, -Math.sin(e.a)*S.V_MAX*e.f/5.6); } continue; }
        if(N.est !== 'pegado' || !j.activo || j.intro > 0) continue; espera += 1/60; if(espera < 0.15) continue; espera = 0;
        let mejor = null;
        for(let n = 0; n < 90; n++){ const a = Math.random()*Math.PI*2, f = 0.4 + Math.random()*0.6, dx = -Math.cos(a)*S.V_MAX*f/5.6, dy = -Math.sin(a)*S.V_MAX*f/5.6, v = S.velTiro(dx, dy, N.nx, N.ny); if(!v) continue;
          const o = {x:N.x, y:N.y, vx:v.vx, vy:v.vy}; let tt = 0, pega = null;
          for(let s = 0; s < 300; s++){ const res = S.pasoCuerpo(o, 1/240, true); tt += 1/240; if(res && res.muere) break; if(res) { pega = res; break; }
            const jx = j.x + jvx*tt, jy = j.y + jvy*tt; if(Math.abs(o.x - jx) < j.D.hw + 2 && Math.abs(o.y - jy) < j.D.hh + 3){ const ok = j.tipo !== 'shogun' || (o.y < j.y - j.D.hh + 5 && o.vy > 0) || Math.sign(o.x - j.x) === -j.dir;
              if(ok && (!mejor || tt < mejor.tt)) mejor = {dx, dy, tt}; break; } } }
        if(!mejor){ for(let n = 0; n < 40 && !mejor; n++){ const a = Math.random()*Math.PI*2, f = 0.4 + Math.random()*0.5, dx = -Math.cos(a)*S.V_MAX*f/5.6, dy = -Math.sin(a)*S.V_MAX*f/5.6, v = S.velTiro(dx, dy, N.nx, N.ny); if(!v) continue;
          const o = {x:N.x, y:N.y, vx:v.vx, vy:v.vy}; for(let s = 0; s < 400; s++){ const res = S.pasoCuerpo(o, 1/240, true); if(res){ if(res.pega) mejor = {dx, dy}; break; } } } }
        if(mejor && S.saltar(mejor.dx, mejor.dy)) saltos++; }
      const j = S.J.jefe; return {nivel:S.NIVELES[i].id, jefe:j.tipo, gano:S.J.modo === 'resultado' && S.UI.p === 'gana', vida:j.hp + '/' + j.D.hp, cayo:j.fuera, t:Math.round(t), saltos, muertes, causas}; }, [i, inv]);
    console.log(JSON.stringify(r));
    if(process.env.SONIDO){ const L = await p.evaluate(() => { const L = window.__LOG, o = {fx:L.fx, musica:L.musica, faltan:[...__S.SON._faltan], err:__S.SON._err.length || 0}; window.__LOG = {fx:{}, musica:[]}; return o; }); console.log('  sonido', JSON.stringify(L)); } } }
  console.log(errs.slice(0, 5).join('\n') || 'sin errores'); await b.close(); })();
