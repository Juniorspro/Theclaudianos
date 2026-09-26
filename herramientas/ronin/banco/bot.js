// bot.js: pelea cada tipo de enemigo con un jugador que reacciona como una persona, en tiempo simulado.
// REFLEJO=0.22 FALLA=0.15 node bot.js [tipo…]   (FALLA = probabilidad de no reaccionar a un aviso)
const {chromium} = require('/tmp/ui/node_modules/playwright');
const REF = +(process.env.REFLEJO || 0.22), FALLA = +(process.env.FALLA || 0.15), N = +(process.env.N || 6);
const tipos = process.argv.slice(2).length ? process.argv.slice(2) : ['bandido', 'lancero', 'shinobi', 'monje', 'general', 'maestro', 'oni', 'gashadokuro', 'oogama'];
const MULT = {bandido:1, lancero:1, shinobi:1.4, monje:1.4, general:1, maestro:1.4, oni:1.85, gashadokuro:1, oogama:1.2};
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, isMobile:true, hasTouch:true, locale:'es-AR'})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/ronin/r.html'); await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:60000});
  for(const tipo of tipos){ const res = [];
    for(let i = 0; i < N; i++){
      await p.evaluate(async ([tipo, m]) => { __R.PROG.tutorial = true; __R.JUEGO.cap = null; __R.LUCHA.bend = {}; __R.LUCHA.ki = 0; __R.LUCHA.stats = {desvios:0, relampagos:0, golpes:0, recibido:0}; __R.LUCHA.heroe = null;
        await __R.arrancarPelea(tipo, {mult:m}, 'aldea', 'banco', true); __R.JUEGO.pausa = true; __R.UI.cerrar(); }, [tipo, MULT[tipo]]);
      res.push(await p.evaluate(([REF, FALLA]) => { const R = __R, L = R.LUCHA, dt = 1/60; let t = 0, reaccion = null, suelta = [], ultimoAviso = null;
        const z = id => ({id}), tocar = (id, dur) => { R.apretar(z(id), true); suelta.push([R.RELOJ.t + (dur || 0.07), id]); };
        while(!L.fin && t < 150){ t += dt; R.RELOJ.t += dt; R.RELOJ.real += dt;
          for(const s of suelta.filter(s => s[0] <= R.RELOJ.t)) R.apretar(z(s[1]), false); suelta = suelta.filter(s => s[0] > R.RELOJ.t);
          const H = L.heroe, E = L.enemigo, d = E.x - H.x;
          /* un aviso nuevo: se decide si se reacciona y cuándo */
          if(E.aviso && E.avisoDado && ultimoAviso !== E.tImpacto + E.aviso){ ultimoAviso = E.tImpacto + E.aviso; reaccion = Math.random() < FALLA ? null : {cuando:R.RELOJ.t + REF*(0.8 + Math.random()*0.5), tipo:E.aviso}; }
          if(reaccion && R.RELOJ.t >= reaccion.cuando){ if(reaccion.tipo === 'ligero') tocar('guardia', 0.25); else tocar(Math.random() < 0.6 ? 'ataque' : 'esquive'); reaccion = null; }
          else if(!E.aviso && H.estado !== 'guardia'){
            if(Math.abs(d) > 125){ R.apretar(z('der'), true); } else { R.apretar(z('der'), false); if(L.ki >= 1) tocar('habilidad'); else if(Math.random() < 0.12) tocar('ataque'); }
          } else R.apretar(z('der'), false);
          R.pasoLucha(dt); }
        return {gana:L.fin === 'victoria', t:+t.toFixed(1), vida:Math.round(L.heroe.vida), eVida:Math.round(L.enemigo.vida), des:L.stats.desvios, rel:L.stats.relampagos, gol:L.stats.golpes}; }, [REF, FALLA]));
    }
    const g = res.filter(r => r.gana), med = a => a.sort((x, y) => x - y)[a.length >> 1];
    console.log(tipo.padEnd(12), 'gana', g.length + '/' + N, '· dura', med(res.map(r => r.t)), 's · vida que queda', med(g.map(r => r.vida)) ?? '-', '· desvíos', med(res.map(r => r.des)), '· relámpagos', med(res.map(r => r.rel)), '· golpes', med(res.map(r => r.gol)), res.some(r => r.t >= 150) ? '· ¡SIN FIN!' : '');
  }
  const er = await p.evaluate(() => __R.ERRORES.slice(0, 5)); console.log(errs.concat(er).join(' | ') || 'sin errores'); await b.close(); })();
