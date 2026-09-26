// capturas para mostrar: menú, tarde, radio, tablas, galpón, noche con el bicho en la ventana, cámaras, placard, susto, muerte, victoria
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2, locale:'es-AR', isMobile:true, hasTouch:true}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('CONS ' + m.text()); });
  await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(2500);
  const pasos = process.env.SOLO ? [] : [
    ['titulo', `R.menuTitulo();`],
    ['tarde', `R.nuevaPartida('normal'); document.getElementById('menu').innerHTML = ''; R.J.hora = 16.2; poner(0.25, 0, -13.5, Math.PI, 0.06); correr(1);`],
    ['radio', `poner(-5.2, 0, -1.2, Math.PI/2 - 0.2, -0.12); R.MUNDO.interactivos.find(o => o.id === 'radio').hacer(); correr(7);`],
    ['radio_fin', `for(let i = 0; i < 30*32; i++) R.paso(1/30); correr(0.2);`],
    ['tablas', `R.J.cola = []; R.J.hora = 17.5; R.JUG.inv.tablas = 3; poner(-4.2, 3.2, -2.2, 0.55, -0.35); correr(1);`],
    ['ventana', `R.J.hora = 19.1; const v = R.MUNDO.ventanas.v_cocina_f; R.JUG.inv.tablas = 3; for(let k = 0; k < 3; k++) R.clavarTabla(v); poner(4.5, 0, -2.3, 0, 0.05); correr(1);`],
    ['galpon', `R.J.hora = 19.3; poner(-5.6, 0, 7.6, 0.75, -0.02); correr(1);`],
    ['bicho', `R.J.hora = 25.2; R.J.corre = false; R.J.fase = 'noche'; R.MUNDO.ventanas.v_cocina_f.tablas = 0; const v = R.MUNDO.ventanas.v_living_f; v.tablas = 0; v.vidrio = true; v.mVidrio.visible = true;
      Object.assign(R.MON, {activo:true, estado:'respira', t:99, entrada:{tipo:'v', v}, x:v.afuera[0], z:v.afuera[1], y:0, piso:0, adentro:false, luzT:0, flashT:0, cool:0}); R.MODELO.raiz.visible = true;
      poner(-4.3, 0, -1.6, 0.05, 0.1); correr(4);`],
    ['bicho2', `R.JUG.linterna.tiene = true; R.JUG.linterna.on = true; R.JUG.linterna.bat = 100; R.MON.flashT = -99; correr(0.3); R.JUG.linterna.on = false; correr(0.05); R.JUG.linterna.on = true; correr(0.05);`],
    ['camaras', `Object.assign(R.MON, {activo:false, preview:30, x:-6, z:7.5, yaw:Math.PI*0.8, anim:'mira'}); R.CAMS.forEach(c => c.instalada = true); poner(-3.6, 3.2, 0.6, Math.PI, 0); R.abrirCamaras(); R.CAMV.i = 2; correr(1);`],
    ['placard', `R.cerrarCamaras(); R.JUG.en = 'libre'; const q = R.MUNDO.placards.placard_cuarto; R.entrarPlacard(q); Object.assign(R.MON, {activo:true, estado:'tira', t:99, placardVisto:q, x:q.frente[0] + (q.frente[0] - q.dentro[0])*1.4, z:q.frente[1] + (q.frente[1] - q.dentro[1])*1.4, y:0, piso:0, adentro:true, yaw:Math.atan2(q.dentro[0] - q.frente[0], q.dentro[1] - q.frente[1])}); R.MODELO.raiz.visible = true; R.empezarQTE(); correr(0.6);`],
    ['susto', `R.QTE.estado = 'nada'; R.salirPlacard(); R.JUG.en = 'libre'; poner(-4, 0, -2.2, 0, 0); correr(0.1); Object.assign(R.MON, {activo:true, estado:'persigue', x:-4, z:-3.4, adentro:true}); R.atrapar(); correr(0.35);`],
    ['muerte', `correr(1.6); await espera(700);`],
    ['victoria', `R.nuevaPartida('normal'); document.getElementById('menu').innerHTML = ''; R.J.hora = 29.99; R.J.corre = true; R.J.fase = 'noche'; poner(0.25, 0, -6.8, Math.PI, 0.1); correr(8); await espera(400);`]
  ];
  if(process.env.SOLO) pasos.push(...JSON.parse(process.env.SOLO));
  const pre = `const R = __R, espera = ms => new Promise(r => setTimeout(r, ms)); const poner = (x, y, z, yaw, pitch) => Object.assign(R.JUG, {x, y, z, piso:y > 1.6 ? 1 : 0, yaw, pitch, vx:0, vz:0}); const correr = s => { for(let i = 0; i < Math.round(s*30); i++){ R.paso(1/30); R.dibujar(1/30); } };`;
  for(const [n, c] of pasos){ let r; try { r = await p.evaluate(new Function('return (async () => {' + pre + c + ' return __R.J.modo + " " + __R.MON.estado; })()')); } catch(e){ r = 'EXC ' + e.message; }
    await p.screenshot({path:'/tmp/ui/res/e_' + n + '.png', timeout:240000}); console.log(n, r); }
  console.log(errs.slice(0, 5).join('\n') || 'sin errores de consola'); await b.close(); })();
