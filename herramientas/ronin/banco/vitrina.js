// vitrina.js: cada enemigo en su pelea, quieto y en el cuadro del golpe, en la pantalla girada; arma una hoja
const {chromium} = require('/tmp/ui/node_modules/playwright');
const tipos = ['bandido', 'lancero', 'shinobi', 'monje', 'general', 'maestro', 'oni', 'gashadokuro', 'oogama'];
const LUG = {bandido:'aldea', lancero:'bambu', shinobi:'templo', monje:'templo', general:'bambu', maestro:'templo', oni:'luna', gashadokuro:'yokai', oogama:'yokai'};
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:1, isMobile:true, hasTouch:true, locale:'es-AR'})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/ronin/r.html'); await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:60000});
  for(const t of tipos){
    await p.evaluate(async ([t, l]) => { __R.PROG.tutorial = true; await __R.arrancarPelea(t, {mult:1}, l, '', true); __R.UI.cerrar(); }, [t, LUG[t]]);
    await p.waitForTimeout(1500);
    await p.evaluate(() => { const R = __R, L = R.LUCHA; R.JUEGO.pausa = true; for(let i = 0; i < 90; i++){ R.RELOJ.t += 1/60; R.pasoLucha(1/60); } L.enemigo.x = L.heroe.x + 190 + (L.enemigo.T.cuerpo || 0); R.dibujarPelea(0); document.querySelectorAll('.consejo,.cartel').forEach(n => n.remove()); });
    await p.screenshot({path:`/tmp/ui/ronin/cap/v_${t}_a.png`});
    await p.evaluate(() => { const R = __R, L = R.LUCHA, E = L.enemigo; R.ponerEstado(E, 'pesado'); E.animT = 0; E.fpsAnim = 13; const A = R.PJ[E.pj].anims.pesado; E.animT = (A.golpe + 0.5)/13; E.aviso = null; R.ponerEstado(L.heroe, 'guardia'); R.dibujarPelea(0); });
    await p.screenshot({path:`/tmp/ui/ronin/cap/v_${t}_b.png`});
  }
  console.log(errs.join(' | ') || 'sin errores'); await b.close(); })();
