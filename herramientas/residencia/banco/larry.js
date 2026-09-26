// hoja de modelo de Larry: cada pose de frente y de costado, de día en el pasto del fondo
// node larry.js [prefijo] [hora]
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:1, locale:'es-AR', isMobile:true, hasTouch:true}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('CONS ' + m.text()); });
  await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(2000);
  const pref = process.argv[2] || 'L', hora = +(process.argv[3] || 16.3);
  const tomas = JSON.parse(process.argv[4] || 'null') || [['mira', 'mira', Math.PI, 0], ['mira_c', 'mira', Math.PI/2, 0], ['camina_c', 'camina', Math.PI/2, 1.2], ['corre_c', 'corre', Math.PI/2, 0.6], ['camina', 'camina', Math.PI - 0.5, 2.4],
    ['ventana', 'ventana', Math.PI - 0.4, 1.0], ['asoma_c', 'asoma', Math.PI/2, 0.5], ['grita', 'grita', Math.PI - 0.3, 0], ['agarra', 'agarra', Math.PI, 0], ['trepa_c', 'trepa', Math.PI/2, 0.8]];
  for(const [n, anim, yaw, fase] of tomas){
    const r = await p.evaluate(([anim, yaw, fase, hora, CAMZ, CAMP]) => { const R = __R; if(R.J.modo !== 'juego'){ R.nuevaPartida('normal'); document.getElementById('menu').innerHTML = ''; }
      R.J.hora = hora; R.J.corre = false; Object.assign(R.JUG, {x:9, z:+(CAMZ), y:0, piso:0, yaw:Math.PI, pitch:+(CAMP), vx:0, vz:0});
      Object.assign(R.MON, {activo:false, preview:99, x:9, y:0, z:18.4, yaw:yaw, anim, fase, cruza:false}); R.MODELO.raiz.visible = true;
      R.dibujar(1/60); for(let i = 0; i < 40; i++){ R.paso(1/60); R.MON.fase = fase; } R.dibujar(1/60);
      const b = new THREE.Box3().setFromObject(R.MODELO.raiz), h = R.MODELO.cab.getWorldPosition(new THREE.Vector3());
      /* lo más bajo de verdad: los vértices en el mundo (la caja de setFromObject se agranda al girar y exagera) */
      const mi = k => { const o = R.MODELO.partes[k]; if(!o) return null; let m = 99; const v = new THREE.Vector3(); o.updateMatrixWorld(true);
        o.traverse(q => { if(!q.isMesh) return; const P = q.geometry.attributes.position; for(let i = 0; i < P.count; i++){ v.fromBufferAttribute(P, i).applyMatrix4(q.matrixWorld); if(v.y < m) m = v.y; } }); return +m.toFixed(2); };
      let tope = -99; { const v = new THREE.Vector3(); R.MODELO.raiz.updateMatrixWorld(true); R.MODELO.raiz.traverse(q => { if(!q.isMesh || q.isSprite) return; const A = q.geometry.attributes.position; for(let i = 0; i < A.count; i++){ v.fromBufferAttribute(A, i).applyMatrix4(q.matrixWorld); if(v.y > tope) tope = v.y; } }); }
      return {tope:+tope.toFixed(2), punta:[mi('garraI'), mi('garraD')], pies:[mi('piernaI'), mi('piernaD')], alto:+(b.max.y - b.min.y).toFixed(2), piso:+b.min.y.toFixed(2), largo:+(b.max.z - b.min.z).toFixed(2), ancho:+(b.max.x - b.min.x).toFixed(2), cabeza:+h.y.toFixed(2), llamadas:R.est().llamadas}; }, [anim, yaw, fase, hora, +(process.env.CAMZ || 15.9), +(process.env.CAMP || -0.1)]);
    await p.screenshot({path:'/tmp/ui/res/' + pref + '_' + n + '.png', timeout:120000}); console.log(n, JSON.stringify(r)); }
  console.log(errs.slice(0, 5).join('\n') || 'sin errores de consola'); await b.close(); })();
