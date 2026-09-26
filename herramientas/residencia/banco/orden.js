// ¿está todo ordenado? muebles contra paredes y entre sí, el barrido de cada puerta, el paso de cada puerta,
// lo que hay delante de cada ventana, dónde se para uno para clavar tablas, y cada llave de luz
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, locale:'es-AR'})).newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const R = __R, M = R.MUNDO, out = {muebleMuro:[], muebleMueble:[], barrido:[], paso:[], ventanaAlto:[], ventanaParado:[], llaves:[]};
    R.nuevaPartida('normal'); document.getElementById('menu').innerHTML = '';
    const inter = (a, b, m) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > (m || 0) && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > (m || 0);
    const f2 = v => +v.toFixed(2), nom = c => '[' + [c.x0, c.x1, c.z0, c.z1].map(f2).join(',') + ']';
    for(const piso of [0, 1]){ const C = M.colisiones[piso], mu = C.filter(c => c.mueble), muros = C.filter(c => !c.mueble && !c.puerta && !c.escalon && !c.cerco && !c.arbol && c.x1 < 9000);
      /* un mueble puede apoyarse en la pared (hasta 4 cm adentro), no meterse */
      for(const m of mu) for(const w of muros) if(inter(m, w, 0.04)) out.muebleMuro.push([piso, nom(m), nom(w)]);
      for(let i = 0; i < mu.length; i++) for(let j = i + 1; j < mu.length; j++) if(inter(mu[i], mu[j], 0.01)) out.muebleMueble.push([piso, nom(mu[i]), nom(mu[j])]);
    }
    /* el barrido de cada puerta: la hoja de 0 a abierta, muestreada, contra los muebles de su piso */
    const v = new THREE.Vector3();
    for(const id in M.puertas){ const P = M.puertas[id], mu = M.colisiones[P.piso].filter(c => c.mueble); let choca = null;
      for(let k = 0; k <= 12 && !choca; k++){ P.hoja.rotation.y = -k/12*1.55*(P.lado || 1); P.hoja.updateMatrixWorld(true);
        for(let t = 0.1; t <= 1.0001 && !choca; t += 0.15){ v.set(P.w*t - 0.02, 1.0, 0); P.hoja.localToWorld(v);
          for(const m of mu) if(v.x > m.x0 && v.x < m.x1 && v.z > m.z0 && v.z < m.z1){ choca = [id, k/12, nom(m)]; break; } } }
      P.hoja.rotation.y = -P.abierta*1.55*(P.lado || 1); P.hoja.updateMatrixWorld(true); if(choca) out.barrido.push(choca);
      /* el paso: medio metro de cada lado del vano, del ancho de la puerta, libre de muebles */
      const g = 0.6, c = P.eje === 'x' ? {x0:P.c - P.w/2 + 0.05, x1:P.c + P.w/2 - 0.05, z0:P.f - g, z1:P.f + g} : {x0:P.f - g, x1:P.f + g, z0:P.c - P.w/2 + 0.05, z1:P.c + P.w/2 - 0.05};
      for(const m of mu) if(inter(c, m, 0.005)) out.paso.push([id, nom(m)]); }
    /* delante de cada ventana (adentro, 0,9 m) nada más alto que el alféizar; y un lugar libre para clavar a menos de 0,6 m del de la ventana */
    for(const id in M.ventanas){ const V = M.ventanas[id], mu = M.colisiones[V.piso].filter(c => c.mueble), [nx, nz] = V.n, sy0 = V.sy0 - R.alturaPiso(V.piso);
      const a = V.eje === 'x' ? {x0:V.c - V.w/2, x1:V.c + V.w/2, z0:Math.min(V.f, V.f - nz*0.9), z1:Math.max(V.f, V.f - nz*0.9)} : {x0:Math.min(V.f, V.f - nx*0.9), x1:Math.max(V.f, V.f - nx*0.9), z0:V.c - V.w/2, z1:V.c + V.w/2};
      for(const m of mu) if(inter(a, m, 0.01) && (m.alto || 0) > sy0 + 0.01) out.ventanaAlto.push([id, nom(m), f2(m.alto || 0), f2(sy0)]);
      let mejor = 9; for(let dx = -0.6; dx <= 0.6; dx += 0.05) for(let dz = -0.6; dz <= 0.6; dz += 0.05){ const x = V.adentro[0] + dx, z = V.adentro[1] + dz, [rx, rz] = R.resolver(x, z, V.piso, 0.3);
        if(Math.hypot(rx - x, rz - z) < 0.005) mejor = Math.min(mejor, Math.hypot(dx, dz)); }
      if(mejor > 0.35) out.ventanaParado.push([id, f2(mejor)]); }
    /* cada llave de luz: un lugar libre a menos de 1,2 m */
    for(const L of M.luces){ if(!L.llave) continue; const piso = L.llave[1] > 3 ? 1 : 0; let mejor = 9;
      for(let dx = -1.2; dx <= 1.2; dx += 0.05) for(let dz = -1.2; dz <= 1.2; dz += 0.05){ const x = L.llave[0] + dx, z = L.llave[2] + dz, [rx, rz] = R.resolver(x, z, piso, 0.3);
        if(Math.hypot(rx - x, rz - z) < 0.005) mejor = Math.min(mejor, Math.hypot(dx, dz)); }
      if(mejor > 0.75) out.llaves.push([L.id, f2(mejor)]); }
    out.n = {muebles:[0, 1].map(pi => M.colisiones[pi].filter(c => c.mueble).length)}; out.err = R.ERRORES.slice(0, 3); return out; });
  for(const k in r) console.log(k, JSON.stringify(r[k])); console.log(errs.slice(0, 3).join('\n') || 'sin errores de consola'); await b.close(); })();
