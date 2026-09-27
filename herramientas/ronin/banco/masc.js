// masc.js: el maestro mira al héroe, y cada mascota se ve en la pelea y da su ventaja medida
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:1, isMobile:true, hasTouch:true, locale:'es-AR'})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/ronin/r.html'); await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:60000});
  const pelea = (t, m, nv) => p.evaluate(async ([t, m, nv]) => { const R = __R; R.PROG.mascotas = {}; if(m){ R.PROG.mascotas[m] = nv; R.PROG.mascota = m; await R.cargarPJ(R.MASCOTAS[m].pj); } else R.PROG.mascota = null;
    R.PROG.tutorial = true; R.LUCHA.heroe = null; R.LUCHA.bend = {}; await R.arrancarPelea(t, {mult:1}, 'templo', '', true); R.UI.cerrar(); R.JUEGO.pausa = true;
    for(let i = 0; i < 90; i++){ R.RELOJ.t += 1/60; R.pasoLucha(1/60); } }, [t, m, nv]);
  const out = {};
  /* 1. el maestro: en qué lado tiene la cara (masa de la cabeza) contra dónde está el héroe, en cada animación */
  await pelea('maestro', null, 0); await p.waitForTimeout(1500);
  out.maestro = await p.evaluate(() => { const R = __R, P = R.PJ.j_maestro, r = {};
    for(const a in P.anims){ const q = P.anims[a].cuadros[0]; r[a] = P.anims[a].cuadros.length; }
    const L = R.LUCHA; return {anims:r, dirE:L.enemigo.dir, heroeALaIzq:L.heroe.x < L.enemigo.x}; });
  for(const [n, an] of [['quieto', 'quieto'], ['ataque', 'ataque'], ['burla', 'burla']]){
    await p.evaluate(an => { const R = __R, L = R.LUCHA, E = L.enemigo; E.x = L.heroe.x + 230; if(an !== 'quieto'){ R.ponerEstado(E, an === 'burla' ? 'burla' : 'ataque'); } E.anim = an; E.animT = an === 'quieto' ? 0 : 0.35; E.fpsAnim = 14; R.dibujarPelea(0); document.querySelectorAll('.consejo,.cartel').forEach(n => n.remove()); }, an);
    await p.screenshot({path:`/tmp/ui/ronin/cap/mm_${n}.png`}); }
  /* 2. cada mascota en la pelea */
  for(const m of ['gato', 'shiba', 'cuervo', 'halcon', 'panda']){
    await pelea('bandido', m, 3); await p.waitForTimeout(1500);
    const d = await p.evaluate(() => { const R = __R, L = R.LUCHA, M = L.mascota, H = L.heroe; R.dibujarPelea(0); document.querySelectorAll('.consejo,.cartel').forEach(n => n.remove());
      return M && {x:Math.round(M.x - H.x), dir:M.dir, anim:M.anim, yOff:Math.round(M.yOff), cuadros:R.PJ[M.pj] && R.PJ[M.pj].anims.quieto.cuadros.length}; });
    await p.screenshot({path:`/tmp/ui/ronin/cap/mp_${m}.png`});
    await p.evaluate(() => { const R = __R; R.LUCHA.heroe.estado = 'desvio'; })
    out[m] = d; }
  /* 3. las ventajas medidas */
  const med = await p.evaluate(async () => { const R = __R, r = {};
    const pon = async (m, nv) => { R.PROG.mascotas = {}; if(m){ R.PROG.mascotas[m] = nv; R.PROG.mascota = m; } else R.PROG.mascota = null; };
    for(const [m, nv] of [[null, 0], ['panda', 1], ['panda', 5], ['gato', 5], ['halcon', 5], ['shiba', 5], ['cuervo', 5]]){ await pon(m, nv); const s = R.heroeStats();
      r[(m || 'nada') + nv] = {vida:s.vidaMax, post:s.postMax, recup:s.recup, crit:s.critico, esq:s.esquiveSolo, oro:R.ventaja('cuervo')}; }
    return r; });
  out.stats = med;
  /* críticos contados: 300 tajos contra un bandido quieto, con y sin halcón nivel 5 */
  for(const m of [null, 'halcon']){
    await pelea('bandido', m, 5);
    out['crit_' + (m || 'nada')] = await p.evaluate(() => { const R = __R, L = R.LUCHA, H = L.heroe, E = L.enemigo; const T = E.T; T.p.guardia = 0; let dan = [];
      for(let k = 0; k < 300; k++){ E.vida = E.vidaMax = 99999; E.aturdido = 0; E.estado = 'quieto'; E.x = H.x + 120; H.dir = 1; R.ponerEstado(H, 'tajo'); H.golpeo = false; const v0 = E.vida;
        for(let i = 0; i < 60 && !H.golpeo; i++){ R.RELOJ.t += 1/60; R.pasoLucha(1/60); E.estado = 'quieto'; E.x = H.x + 120; } dan.push(v0 - E.vida); R.ponerEstado(H, 'quieto'); }
      const s = dan.filter(x => x > 0).sort((a, b) => a - b), med = s[s.length >> 2]; return {golpes:s.length, criticos:s.filter(x => x > med*1.45).length}; }); }
  /* esquives solos: 200 ataques normales con el héroe quieto, con y sin shiba nivel 5 */
  for(const m of [null, 'shiba']){
    await pelea('bandido', m, 5);
    out['esq_' + (m || 'nada')] = await p.evaluate(() => { const R = __R, L = R.LUCHA, H = L.heroe, E = L.enemigo; let esq = 0, dano = 0;
      for(let k = 0; k < 200; k++){ H.vida = H.vidaMax; H.ivul = 0; H.post = H.postMax; R.ponerEstado(H, 'quieto'); const g = Math.min(E.T.alc*0.7, 120); E.x = H.x + g; E.dir = -1; H.dir = 1; E.T.p.ataque = 1; E.T.p.pesado = 0; E.T.p.especial = 0; R.elegirAtaque(E, H);
        for(let i = 0; i < 120 && !E.golpeo; i++){ R.RELOJ.t += 1/60; R.pasoLucha(1/60); H.x = E.x - g; }
        for(let i = 0; i < 3; i++){ R.RELOJ.t += 1/60; R.pasoLucha(1/60); } if(H.estado === 'esquive') esq++; else if(H.vida < H.vidaMax) dano++; R.ponerEstado(E, 'quieto'); }
      return {esquiva:esq, recibe:dano}; }); }
  /* 4. la mascota en el título */
  await p.evaluate(async () => { const R = __R; R.PROG.mascotas = {gato:1, panda:2}; R.PROG.mascota = 'panda'; await R.cargarPJ('m_panda'); R.JUEGO.pausa = false; R.UI.titulo(); });
  await p.waitForTimeout(2500); await p.screenshot({path:'/tmp/ui/ronin/cap/mt_titulo.png'});
  console.log(JSON.stringify(out, null, 0));
  console.log(errs.concat(await p.evaluate(() => __R.ERRORES.map(String))).join(' | ') || 'sin errores'); await b.close(); })();
