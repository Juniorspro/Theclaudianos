// una noche entera con un jugador que reacciona: prende la luz del cuarto que atacan, se esconde si entra
// node noche.js escenario reaccion repeticiones [dificultad]
//   escenario: luz (prende la luz), tablas (tablas en todo + luz), placard (sólo se esconde), quieto (no hace nada)
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, locale:'es-AR'})).newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('CONS ' + m.text()); });
  await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(1500);
  const [esc, reac, rep, dif] = [process.argv[2] || 'luz', +(process.argv[3] || 2.5), +(process.argv[4] || 5), process.argv[5] || 'normal'];
  const res = await p.evaluate(([esc, reac, rep, dif]) => { const R = __R, out = [];
    for(let n = 0; n < rep; n++){
      R.nuevaPartida(dif); document.getElementById('menu').innerHTML = ''; R.J.hora = 23.9; R.J.corre = true; R.J.fase = 'prep';
      Object.assign(R.JUG, {x:0, z:-1, y:0, piso:0, yaw:0, pitch:0}); R.GEN.nafta = 60; R.GEN.andando = true;
      for(const id in R.MUNDO.puertas){ const q = R.MUNDO.puertas[id]; if(q.ext){ q.meta = q.abierta = 0; q.llave = true; } }
      if(esc === 'tablas') for(const id in R.MUNDO.ventanas){ const v = R.MUNDO.ventanas[id]; v.tablas = 3; }
      const S = {ataques:0, echado:0, entradas:0, placard:0, qte:0, qtePerdido:0, recargas:0, muerte:null, gano:false, t:0, fusibles:0};
      let ataque = null, tAt = 0, luz = null, luzOff = 0, escondido = 0, antes = '', hq = [], tq = 0;
      for(let i = 0; i < 30*520; i++){ const dt = 1/30, M = R.MON; R.paso(dt); S.t += dt;
        if(R.J.modo !== 'juego'){ if(R.J.modo === 'susto' || R.J.modo === 'muerte') S.muerte = [R.J.muerto, +R.J.hora.toFixed(2), M.estado]; break; }
        if(R.J.fase === 'fin' || R.J.gano){ S.gano = true; break; }
        if(R.GEN.nafta < 25){ R.GEN.nafta += 35; S.recargas++; } if(!R.GEN.andando && R.GEN.nafta > 0) R.GEN.andando = true;
        if(!R.ELEC.hay){ S.fusibles++; R.ELEC.hay = true; R.ELEC.sobre = 0; }
        if(M.estado !== antes){ S.hist = (S.hist || []).concat([[M.estado, +R.J.hora.toFixed(2), R.JUG.en]]).slice(-6); if(M.estado === 'respira') S.ataques++; if(M.estado === 'huye') S.echado++; if(M.estado === 'entrando' || M.estado === 'entraPuerta') S.entradas++; antes = M.estado; }
        /* la luz del cuarto que atacan, con la demora de reacción */
        const atacando = ['respira', 'rompe', 'arranca'].includes(M.estado) && M.entrada && M.entrada.tipo === 'v';
        if((esc === 'luz' || esc === 'tablas') && atacando){ const v = M.entrada.v; if(ataque !== v.id){ ataque = v.id; tAt = 0; } tAt += dt;
          if(tAt > reac && !luz){ luz = R.MUNDO.luces.find(l => l.sala === v.sala); if(luz) luz.on = true; } }
        else { if(!atacando) ataque = null; if(luz && !atacando){ luzOff += dt; if(luzOff > 5){ luz.on = false; luz = null; luzOff = 0; } } }
        /* adentro: al placard más cercano (dos segundos después de que entra) */
        if(esc !== 'quieto' && M.adentro && R.JUG.en === 'libre'){ escondido += dt; if(escondido > 2){ let q = null, md = 1e9; for(const id in R.MUNDO.placards){ const o = R.MUNDO.placards[id]; if(o.piso !== 0) continue; const d = Math.hypot(o.frente[0] - R.JUG.x, o.frente[1] - R.JUG.z); if(d < md){ md = d; q = o; } }
          if(q){ R.JUG.x = q.frente[0]; R.JUG.z = q.frente[1]; R.entrarPlacard(q); S.placard++; } } }
        /* el placard como lo juega una persona: ve la marca con 0,3 s de atraso, toca a lo sumo 5 veces por segundo, duda y a veces se equivoca */
        if(R.QTE.estado === 'activo'){ hq.push([R.QTE.pos, R.QTE.vel]); const k = hq.length - 1 - 9; tq -= dt;
          if(k > 0 && tq <= 0){ const [pd, vd] = hq[k], pr = pd + vd*0.2; if(Math.abs(pr - 0.5) > 0.05 && Math.random() > 0.15){ R.empujarQTE(Math.sign(0.5 - pr)*(Math.random() < 0.05 ? -1 : 1)); tq = 1/5; } } }
        else hq.length = 0;
        if(R.QTE.estado === 'ganado'){ S.qte++; R.QTE.estado = 'nada'; } if(R.QTE.estado === 'perdido' && !S._qp){ S._qp = 1; S.qtePerdido++; S.qpInfo = [M.estado, +R.J.hora.toFixed(2), R.JUG.en, R.J.modo]; } if(R.QTE.estado !== 'perdido') S._qp = 0;
        if(R.JUG.en === 'placard' && !M.adentro && M.estado !== 'tira'){ R.salirPlacard(); escondido = 0; Object.assign(R.JUG, {x:0, z:-1}); }
      }
      S.hora = +R.J.hora.toFixed(2); S.t = +S.t.toFixed(0); S.err = R.ERRORES.slice(0, 3); out.push(S); }
    return out; }, [esc, reac, rep, dif]);
  for(const r of res) console.log(JSON.stringify(r));
  const g = res.filter(r => r.gano).length; console.log(esc, 'reacción', reac, dif, '→ sobrevive', g, 'de', res.length);
  console.log(errs.slice(0, 5).join('\n') || 'sin errores de consola'); await b.close(); })();
