// acciones_cap.js: una captura por acción nueva, en su cuadro más elocuente, dentro de la pelea
const {chromium} = require('/tmp/ui/node_modules/playwright');
const TOMAS = [['bandido', 'aldea', 'H', 'chiburi', 0.35], ['bandido', 'aldea', 'E', 'burla', 0.5], ['general', 'bambu', 'E', 'guardia', 0.3], ['oni', 'luna', 'E', 'aturdido', 0.5],
  ['monje', 'templo', 'H', 'remate', 0.35], ['shinobi', 'templo', 'H', 'bloqueo', 0.4], ['lancero', 'bambu', 'H', 'levantarse', 0.35], ['gashadokuro', 'yokai', 'E', 'rugido', 0.5]];
(async () => { const b = await chromium.launch({executablePath:process.env.CHROME || '/tmp/gc/x/opt/google/chrome/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2, isMobile:true, hasTouch:true, locale:'es-AR'})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'file:///home/user/Theclaudianos/juegos-pc/Ronin.html'); await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:120000});
  let i = 0; for(const [t, l, quien, anim, k] of TOMAS){
    await p.evaluate(async ([t, l]) => { __R.PROG.tutorial = true; await __R.arrancarPelea(t, {mult:1}, l, '', true); __R.UI.cerrar(); }, [t, l]); await p.waitForTimeout(400);
    await p.evaluate(([quien, anim, k]) => { const R = __R, L = R.LUCHA; R.JUEGO.pausa = true; document.querySelectorAll('.consejo,.cartel').forEach(n => n.remove());
      const H = L.heroe, E = L.enemigo; R.ponerEstado(H, 'quieto'); R.ponerEstado(E, 'quieto'); E.x = H.x + 200 + (E.T.cuerpo || 0); L.cam = L.camObj = (H.x + E.x)/2 - 446;
      const e = quien === 'H' ? H : E, A = R.PJ[e.pj].anims[anim]; e.anim = anim; e.fpsAnim = 0; e.animT = k*A.cuadros.length/((A.fps || 12)*(A.k || 1)); R.dibujarPelea(0); }, [quien, anim, k]);
    await p.screenshot({path:`/tmp/ui/ronin/cap/n_${i++}_${anim}.png`}); }
  console.log(errs.concat(await p.evaluate(() => __R.ERRORES.map(String))).join(' | ') || 'sin errores'); await b.close(); })();
