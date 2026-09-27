// fps30.js: cuántos cuadros distintos por segundo muestra cada animación a la velocidad del juego
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, isMobile:true, hasTouch:true})).newPage();
  await p.goto('file:///tmp/ui/ronin/r.html'); await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:60000});
  const FJ = {quieto:0, caminar:14, tajo:22, tajo2:24, tajo3:24, guardia:26, desvio:26, esquive:26, golpeado:20, muerte:12, habilidad:16, victoria:12, relampago:26, chiburi:16, aturdido:0, bloqueo:22, remate:20, levantarse:14,
    ataque:16, pesado:13, especial:13, burla:14, rugido:14};
  const r = await p.evaluate(async FJ => { const out = {}; for(const id of ['heroe', 'j_oni', 'y_oogama']){ const P = await __R.cargarPJ(id), e = __R.luchador(id === 'heroe' ? 'heroe' : id === 'j_oni' ? 'oni' : 'oogama', 0, 1), fila = [];
      for(const [n, A] of Object.entries(P.anims)){ e.anim = n; e.fpsAnim = FJ[n] || 0; e.animVel = 1; let prev = null, cambios = 0, t = 0; const dur = Math.min(1, A.loop ? 1 : A.cuadros.length/((e.fpsAnim || A.fps)*(A.k || 1)));
        for(t = 0; t < dur; t += 1/120){ e.animT = t; const q = __R.cuadroDe(e); if(q !== prev) cambios++; prev = q; }
        fila.push(`${n} ${Math.round(cambios/dur)}`); } out[id] = fila.join(' · '); } return out; }, FJ);
  for(const [k, v] of Object.entries(r)) console.log(k, '→', v); await b.close(); })();
