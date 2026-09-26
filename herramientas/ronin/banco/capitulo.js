// capitulo.js: juega capítulos enteros como una persona (mismo jugador que bot.js) eligiendo bendiciones al azar
// REFLEJO=0.25 FALLA=0.2 N=4 node capitulo.js 1 2 3
const {chromium} = require('/tmp/ui/node_modules/playwright');
const REF = +(process.env.REFLEJO || 0.25), FALLA = +(process.env.FALLA || 0.2), N = +(process.env.N || 4), caps = process.argv.slice(2).map(Number);
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, isMobile:true, hasTouch:true, locale:'es-AR'})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/ronin/r.html'); await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:60000});
  const pelear = () => p.evaluate(([REF, FALLA]) => { const R = __R, L = R.LUCHA, dt = 1/60; let t = 0, reaccion = null, suelta = [], ultimo = null;
    const z = id => ({id}), tocar = (id, dur) => { R.apretar(z(id), true); suelta.push([R.RELOJ.t + (dur || 0.07), id]); };
    while(!L.fin && t < 200){ t += dt; R.RELOJ.t += dt; R.RELOJ.real += dt;
      for(const s of suelta.filter(s => s[0] <= R.RELOJ.t)) R.apretar(z(s[1]), false); suelta = suelta.filter(s => s[0] > R.RELOJ.t);
      const H = L.heroe, E = L.enemigo, d = E.x - H.x;
      if(E.aviso && E.avisoDado && ultimo !== L.stats.avisos){ ultimo = L.stats.avisos; reaccion = Math.random() < FALLA ? null : {cuando:R.RELOJ.t + REF*(0.8 + Math.random()*0.5), tipo:E.aviso}; }
      if(reaccion && R.RELOJ.t >= reaccion.cuando){ if(reaccion.tipo === 'ligero') tocar('guardia', 0.25); else tocar(Math.random() < 0.6 ? 'ataque' : 'esquive'); reaccion = null; }
      else if(!E.aviso && H.estado !== 'guardia'){
        if(Math.abs(d) > 125 + (E.T.cuerpo || 0)){ R.apretar(z(d > 0 ? 'der' : 'izq'), true); R.apretar(z(d > 0 ? 'izq' : 'der'), false); }
        else { R.apretar(z('der'), false); R.apretar(z('izq'), false); if(L.ki >= 1) tocar('habilidad'); else if(Math.random() < 0.12) tocar('ataque'); } }
      else { R.apretar(z('der'), false); R.apretar(z('izq'), false); }
      R.pasoLucha(dt);
      if(L.fin === 'derrota' && L.bend.resu && !L.resucito){ L.finT = 9; R.finDePelea(); } }
    for(const s of suelta) R.apretar(z(s[1]), false);
    return {gana:L.fin === 'victoria', t:+t.toFixed(1), vida:Math.round(L.heroe.vida), vmax:Math.round(L.heroe.vidaMax)}; }, [REF, FALLA]);
  for(const c of caps){ const llegadas = [], tiempos = [];
    for(let i = 0; i < N; i++){
      await p.evaluate(c => { const R = __R; R.PROG.tutorial = true; R.JUEGO.cap = R.CAPITULOS[c - 1]; R.JUEGO.etapa = 0; R.LUCHA.bend = {}; R.LUCHA.ki = 0; R.LUCHA.heroe = null; R.LUCHA.stats = {desvios:0, relampagos:0, golpes:0, recibido:0}; }, c);
      let e = 0, tt = 0;
      for(; e < 10; e++){
        await p.evaluate(async ([c, e]) => { const R = __R, C = R.CAPITULOS[c - 1], def = C.etapas[e], tipo = typeof def === 'string' ? def : def.t;
          await R.arrancarPelea(tipo, {elite:typeof def === 'object' && def.elite, mult:C.mult}, C.lugares[0], '', e === 0); R.JUEGO.pausa = true; R.UI.cerrar(); }, [c, e]);
        const r = await pelear(); tt += r.t; if(!r.gana) break;
        await p.evaluate(() => { const R = __R, B = R.LUCHA.bend, pos = R.BENDICIONES.filter(b => (B[b.id] || 0) < b.max); const b = pos[Math.floor(Math.random()*pos.length)]; B[b.id] = (B[b.id] || 0) + 1; if(b.id === 'te') R.LUCHA.heroe.vida = R.heroeStats().vidaMax; });
      }
      llegadas.push(e); tiempos.push(Math.round(tt)); }
    console.log('capítulo', c, '· llega a la etapa', llegadas.map(e => e >= 10 ? 'FIN' : e + 1).join(' '), '· minutos', tiempos.map(t => (t/60).toFixed(1)).join(' '));
  }
  console.log(errs.join(' | ') || 'sin errores'); await b.close(); })();
