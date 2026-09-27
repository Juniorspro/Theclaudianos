// acciones.js: cada acción nueva aparece cuando tiene que aparecer (entrada, provocación, bloqueo, aturdido, remate, levantarse, rugido)
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, isMobile:true, hasTouch:true, locale:'es-AR'})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/ronin/r.html'); await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:60000});
  const pelea = (t, l) => p.evaluate(async ([t, l]) => { __R.PROG.tutorial = true; __R.LUCHA.heroe = null; __R.LUCHA.bend = {}; await __R.arrancarPelea(t, {mult:1}, l, '', true); __R.UI.cerrar(); __R.JUEGO.pausa = true; }, [t, l]);
  const pasos = n => p.evaluate(n => { for(let i = 0; i < n; i++){ __R.RELOJ.t += 1/60; __R.pasoLucha(1/60); } }, n);
  const st = () => p.evaluate(() => { const L = __R.LUCHA; return {h:L.heroe.estado + '/' + L.heroe.anim, e:L.enemigo.estado + '/' + L.enemigo.anim, ev:Math.round(L.enemigo.vida)}; });
  const R = {};
  for(const t of ['bandido', 'general', 'oni', 'gashadokuro']){
    await pelea(t, 'aldea'); const a = await st(); await pasos(20); const b1 = await st();
    R[t] = {arranque:a, '0,33 s':b1};
    /* aturdir al enemigo y rematarlo */
    const r = await p.evaluate(() => { const R = __R, L = R.LUCHA, H = L.heroe, E = L.enemigo; for(let i = 0; i < 200; i++){ R.RELOJ.t += 1/60; R.pasoLucha(1/60); } 
      R.ponerEstado(H, 'quieto'); E.x = H.x + 150 + (E.T.cuerpo || 0); E.aviso = null; E.post = 0; E.aturdido = 2; R.ponerEstado(E, 'aturdido'); const antes = E.vida, anim = E.anim;
      R.ENT.ataque = R.RELOJ.t; for(let i = 0; i < 40; i++){ R.RELOJ.t += 1/60; R.pasoLucha(1/60); if(H.estado === 'remate' && H.golpeo) break; }
      return {aturdidoAnim:anim, heroe:H.estado, daño:Math.round(antes - E.vida)}; });
    R[t].remate = r;
  }
  /* bloqueo: guardia sostenida contra un golpe normal */
  await pelea('bandido', 'aldea'); R.bloqueo = await p.evaluate(() => { const R = __R, L = R.LUCHA, H = L.heroe, E = L.enemigo; for(let i = 0; i < 90; i++){ R.RELOJ.t += 1/60; R.pasoLucha(1/60); }
    R.ponerEstado(H, 'guardia'); R.ENT.guardia = true; R.ENT.guardiaDesde = R.RELOJ.t - 2; E.x = H.x + 130; R.ponerEstado(E, 'quieto'); E.espera = 0; E.T.p.guardia = 0;
    let visto = null; for(let i = 0; i < 180 && !visto; i++){ R.RELOJ.t += 1/60; R.pasoLucha(1/60); if(H.estado === 'bloqueo') visto = H.anim; } R.ENT.guardia = false; return visto; });
  /* levantarse con el pergamino */
  await pelea('bandido', 'aldea'); R.levantarse = await p.evaluate(() => { const R = __R, L = R.LUCHA, H = L.heroe; L.bend.resu = 1; L.resucito = false; H.vida = 1;
    R.ponerEstado(H, 'quieto'); L.enemigo.x = H.x + 130; for(let i = 0; i < 600 && !L.fin; i++){ R.RELOJ.t += 1/60; R.pasoLucha(1/60); } L.finT = 9; R.finDePelea(); return H.estado + '/' + H.anim + ' vida ' + Math.round(H.vida); });
  console.log(JSON.stringify(R, null, 1)); console.log(errs.concat(await p.evaluate(() => __R.ERRORES.map(String))).join(' | ') || 'sin errores'); await b.close(); })();
