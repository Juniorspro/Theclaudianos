// pantallas.js: recorre cada pantalla en un idioma, saca captura y junta el texto a la vista
// node pantallas.js es|en|pt
const {chromium} = require('/tmp/ui/node_modules/playwright');
const L = process.argv[2] || 'es';
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:1, isMobile:true, hasTouch:true, locale:'es-AR'})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/ronin/r.html'); await p.waitForFunction(() => window.__R && __R.PJ.heroe && __R.PJ.heroe.listo, null, {timeout:60000});
  await p.evaluate(L => { __R.ponerIdioma(L); __R.AJ.vistoIdioma = true; __R.PROG.oro = 5000; __R.PROG.capitulo = 2; __R.PROG.cap_hecho = {1:true}; }, L);
  const textos = new Set(); const juntar = async () => (await p.evaluate(() => { const t = []; const w = document.createTreeWalker(document.getElementById('ui') || document.body, NodeFilter.SHOW_TEXT); while(w.nextNode()){ const s = w.currentNode.textContent.trim(); if(s) t.push(s); } return t; })).forEach(s => textos.add(s));
  const P = [['idioma', 'UI.idioma()'], ['titulo', 'UI.titulo()'], ['capitulos', 'UI.capitulos()'], ['yokai', 'UI.yokai()'], ['herreria', 'UI.herreria()'], ['dojo', 'UI.dojo()'], ['opciones', 'UI.opciones(false)'], ['como', 'UI.como()']];
  for(const [n, f] of P){ await p.evaluate(f => { const UI = __R.UI; eval(f); }, f); await p.waitForTimeout(n === 'titulo' ? 2500 : 900); await juntar(); await p.screenshot({path:`/tmp/ui/ronin/cap/p_${L}_${n}.png`}); }
  await p.evaluate(() => { __R.PROG.tutorial = false; __R.empezarCapitulo(1); }); await p.waitForFunction(() => __R.JUEGO.modo === 'pelea'); await p.waitForTimeout(1200); await juntar(); await p.screenshot({path:`/tmp/ui/ronin/cap/p_${L}_pelea.png`});
  await p.evaluate(() => { const E = __R.LUCHA.enemigo; __R.textoGrande ? 0 : 0; }); 
  await p.evaluate(() => __R.pausar()); await p.waitForTimeout(600); await juntar(); await p.screenshot({path:`/tmp/ui/ronin/cap/p_${L}_pausa.png`}); await p.evaluate(() => __R.pausar());
  await p.evaluate(() => { __R.LUCHA.fin = 'victoria'; __R.finDePelea(); }); await p.waitForTimeout(1200); await juntar(); await p.screenshot({path:`/tmp/ui/ronin/cap/p_${L}_bendicion.png`});
  await p.evaluate(() => { __R.JUEGO.etapa = 9; __R.LUCHA.fin = 'victoria'; __R.finDePelea(); }); await p.waitForTimeout(1200); await juntar(); await p.screenshot({path:`/tmp/ui/ronin/cap/p_${L}_resultado.png`});
  await p.evaluate(() => { __R.JUEGO.etapa = 3; __R.LUCHA.fin = 'derrota'; __R.LUCHA.bend = {}; __R.finDePelea(); }); await p.waitForTimeout(1200); await juntar(); await p.screenshot({path:`/tmp/ui/ronin/cap/p_${L}_derrota.png`});
  const falta = await p.evaluate(() => [...__R.TR_FALTA]);
  const es = /\b(de|del|que|la|el|los|las|un|una|para|con|tu|tus|más|sin|golpe|vida|etapa|capítulo)\b/i;
  const raros = L === 'es' ? [] : [...textos].filter(s => es.test(s) && !/[a-z]{3,}.*\b(the|of|and|you|your|a)\b/i.test(s));
  console.log(L, '· textos', textos.size, '· TR_FALTA', JSON.stringify(falta), '· con castellano:', JSON.stringify(raros.slice(0, 30)));
  console.log(errs.concat(await p.evaluate(() => __R.ERRORES.map(String))).join(' | ') || 'sin errores'); await b.close(); })();
