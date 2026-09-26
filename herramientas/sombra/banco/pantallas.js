// todas las pantallas, en el idioma pedido, y lo que quedó sin traducir
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const l = process.argv[2] || 'es', fotos = process.argv[3] === 'fotos';
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:2.625, isMobile:true, hasTouch:true})).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' ' + e.stack.split('\n')[1]));
  await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(700);
  await p.evaluate(l => { __S.ponerIdioma(l); __S._AUD.clear(); __S.TR_FALTA.clear(); __S.PROG.monedas = 2500; __S.PROG.abierto = 9; __S.PROG.niveles = {'bambu-1':3, 'bambu-2':2, 'bambu-3':1}; }, l);
  const sh = async n => { await p.waitForTimeout(350); if(fotos) await p.screenshot({path:'/tmp/ui/sombra/p_' + n + '.png'}); };
  await sh('idioma');
  for(const s of ['titulo', 'principal', 'desafios', 'opciones']){ await p.evaluate(s => { __S.J.modo = 'menu'; __S.irA(s); }, s); await sh(s); }
  await p.evaluate(() => { __S.UI.mundo = 2; }); await sh('desafios3');
  for(const tab of ['ninjas', 'efectos', 'cofre']){ await p.evaluate(tab => { __S.irA('tienda'); __S.UI.tab = tab; __S.UI.ver = 3; }, tab); await sh('tienda_' + tab); }
  await p.evaluate(() => __S.abrirCofre()); await p.waitForTimeout(800); await sh('cofre_abierto');
  await p.evaluate(() => { __S.PROG.monedas = 10; __S.irA('tienda'); __S.UI.tab = 'ninjas'; __S.UI.ver = 6; }); await sh('tienda_cara');
  await p.evaluate(() => __S.empezarNivel(0)); await sh('juego_tutorial');
  await p.evaluate(() => { __S.J.pausa = true; __S.UI.p = 'pausa'; }); await sh('pausa');
  await p.evaluate(() => { __S.J.pausa = false; __S.NIN.est = 'muerto'; __S.NIN.causa = 'tinta'; __S.J.monedas = 7; }); await p.evaluate(() => __S.SON && 0);
  await p.evaluate(() => { const S = __S; S.J.gen++; /* muerte */ }); await p.evaluate(() => { __S.J.modo = 'resultado'; __S.UI.p = 'muerte'; __S.UI.res = {gano:false, mon:7}; __S.UI.t = 0; }); await p.waitForTimeout(700); await sh('muerte');
  await p.evaluate(() => { __S.J.modo = 'resultado'; __S.UI.p = 'gana'; __S.UI.res = {gano:true, mon:34, estrellas:2, monOk:true, bajOk:false}; __S.UI.t = 0; }); await p.waitForTimeout(2200); await sh('gana');
  await p.evaluate(() => __S.empezarInfinito()); await p.waitForTimeout(500); await p.evaluate(() => { __S.J.modo = 'resultado'; __S.UI.p = 'muerte'; __S.NIN.causa = 'shuriken'; __S.UI.res = {gano:false, mon:12, record:true}; __S.J.puntos = 3480; __S.J.alturaMax = 210; __S.UI.t = 0; }); await p.waitForTimeout(700); await sh('muerte_inf');
  for(const i of [8, 16]){ await p.evaluate(i => __S.empezarNivel(i), i); await p.waitForTimeout(300); await sh('nivel' + i); }
  for(const ef of ['sakura', 'tinta', 'neon', 'otono']){ await p.evaluate(ef => { __S.PROG.efecto = ef; __S.empezarNivel(3); }, ef); await p.waitForTimeout(300); await sh('ef_' + ef); }
  await p.evaluate(() => { __S.PROG.efecto = 'auto'; });
  const r = await p.evaluate(() => ({falta:[...__S.TR_FALTA], vistos:__S.textos()}));
  const esp = l === 'en' ? r.vistos.filter(s => /\b(DE|EL|LA|LOS|QUE|CON|POR|PARA|TOCÁ|MONEDAS|NIVEL|SALTO|TIENDA)\b/.test(s)) : [];
  console.log(l, 'vistos', r.vistos.length, 'faltan', JSON.stringify(r.falta), 'castellano', JSON.stringify(esp), errs.join(' | ') || 'sin errores');
  await b.close(); })();
