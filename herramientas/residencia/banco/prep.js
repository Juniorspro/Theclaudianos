// la preparación con la mano de verdad: parado cerca de cada cosa, mirándola, tocando o manteniendo el botón
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, locale:process.argv[2] || 'es-AR'})).newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('CONS ' + m.text()); });
  await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(1500);
  const res = await p.evaluate(() => { const R = __R, out = [];
    R.nuevaPartida('normal'); document.getElementById('menu').innerHTML = '';
    const obj = id => R.MUNDO.interactivos.find(o => o.id === id);
    /* un lugar libre cerca, en el mismo piso, desde donde se lo elige mirándolo */
    function pararse(o){ const piso = o.piso !== undefined ? o.piso : (o.pos[1] > 3 ? 1 : 0);
      for(const r of [0.9, 1.2, 0.7, 1.5, 0.5]) for(let a = 0; a < 24; a++){ const an = a/24*Math.PI*2, x = o.pos[0] + Math.cos(an)*r, z = o.pos[2] + Math.sin(an)*r;
        const [rx, rz] = R.resolver(x, z, piso, 0.3); if(Math.hypot(rx - x, rz - z) > 0.01) continue;
        const y = R.alturaPiso(piso); Object.assign(R.JUG, {x, z, y, piso, vx:0, vz:0});
        const dx = o.pos[0] - x, dy = o.pos[1] - (y + 1.55), dz = o.pos[2] - z; R.JUG.yaw = Math.atan2(-dx, -dz); R.JUG.pitch = Math.atan2(dy, Math.hypot(dx, dz));
        R.paso(1/60, 2); R.dibujar(0); if(Math.hypot(R.JUG.x - x, R.JUG.z - z) > 0.05) continue; if(R.elegirInteractivo() === o) return true; }
      return false; }
    function usar(id, veces, cond){ const o = obj(id); if(!o) return out.push([id, 'NO EXISTE']);
      let ok = pararse(o); if(!ok) return out.push([id, 'no se elige', R.JUG.x.toFixed(2), R.JUG.z.toFixed(2)]);
      const et = typeof o.et === 'function' ? o.et() : o.et;
      for(let v = 0; v < (veces || 1); v++){ if(o.mantener){ R.ACC.apretado = true; for(let i = 0; i < 60*(o.mantener + 0.5) && R.ACC.apretado; i++) R.paso(1/60); R.ACC.apretado = false; R.paso(1/60, 3); }
        else { R.ACC.flanco = true; R.paso(1/60, 2); } }
      out.push([id, et, cond ? (cond() ? 'OK' : 'FALLA') : '-']); }
    usar('p_p_frente', 1, () => R.MUNDO.puertas.p_frente.meta === 1);
    Object.assign(R.JUG, {x:0.25, z:-3.6, y:0, piso:0}); R.paso(1/60, 3); out.push(['entrar', R.J.obj, R.J.fase === 'radio' ? 'OK' : 'FALLA']);
    usar('radio', 1, () => R.J.radioYa); let t = 0; while(!R.J.corre && t < 90){ R.paso(1/30); t += 1/30; } out.push(['radio termina', t.toFixed(1) + ' s', R.J.corre && R.J.fase === 'prep' ? 'OK' : 'FALLA']);
    usar('comoda', 1, () => R.JUG.linterna.tiene); usar('pila_cocina', 1, () => R.JUG.linterna.repuestos > 0); usar('llave', 1, () => R.JUG.inv.llave); usar('heladera', 1, () => R.JUG.inv.gaseosas > 0);
    usar('tablas', 3, () => R.JUG.inv.tablas === 3); usar('v_v_master_f', 3, () => R.MUNDO.ventanas.v_master_f.tablas === 3);
    usar('tablas', 3, () => R.JUG.inv.tablas === 3); usar('v_v_living_f', 3, () => R.MUNDO.ventanas.v_living_f.tablas === 3);
    for(const c of ['cam_c1', 'cam_c2', 'cam_c3']) usar(c, 1, () => R.CAMS.find(k => 'cam_' + k.id === c).instalada);
    const n0 = R.GEN.nafta; usar('bidon', 1, () => R.JUG.inv.bidon >= 0); usar('generador', 3, () => R.GEN.nafta > n0 + 20); usar('tambor', 1, () => R.JUG.inv.bidon === 1); usar('generador', 3, () => R.GEN.nafta > n0 + 50); out.push(['nafta', n0.toFixed(0) + ' → ' + R.GEN.nafta.toFixed(0), R.JUG.inv.bidon]);
    usar('luz_living', 1, () => R.LUCES().find(l => l.id === 'living').on); usar('luz_living', 1, () => !R.LUCES().find(l => l.id === 'living').on);
    usar('tele', 1, () => R.ELEC.tvOn); usar('tele', 1, () => !R.ELEC.tvOn);
    usar('pc', 1, () => R.CAMV.abierta); R.cerrarCamaras(); R.JUG.en = 'libre';
    usar('pl_placard_cuarto', 1, () => R.JUG.en === 'placard'); R.salirPlacard(); out.push(['salir del placard', R.JUG.en, R.JUG.en === 'libre' ? 'OK' : 'FALLA']);
    R.J.telSuena = 12; R.J.telEvento = 'tarde'; usar('telefono', 1, () => R.J.telSuena <= 0);
    R.saltarFusibles(); usar('fusibles', 1, () => R.JUG.en === 'fusibles'); if(R.JUG.en === 'fusibles'){ R.tocarCable(R.FUS.malo); } out.push(['cable', R.ELEC.hay ? 'luz' : 'sin luz', R.ELEC.hay && R.JUG.en === 'libre' ? 'OK' : 'FALLA']);
    usar('p_p_frente', 1, () => R.MUNDO.puertas.p_frente.meta === 0); usar('cerrojo_p_frente', 1, () => R.MUNDO.puertas.p_frente.llave);
    out.push(['lista', R.J.lista.join(','), R.prepListo() ? 'OK' : 'FALLA']);
    return {out, err:R.ERRORES.slice(0, 4), falta:[...R.TR_FALTA]}; });
  for(const r of res.out) console.log(JSON.stringify(r)); console.log('errores', JSON.stringify(res.err), 'falta', JSON.stringify(res.falta));
  console.log(errs.slice(0, 5).join('\n') || 'sin errores de consola'); await b.close(); })();
