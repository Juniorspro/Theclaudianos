// evalúa código en el juego (después de cargar) y muestra el resultado: node sonda.js 'código' [idioma]
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:1, locale:process.argv[3] || 'es-AR', isMobile:true, hasTouch:true}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('CONS ' + m.text()); });
  await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(2000);
  try { const r = await p.evaluate(new Function('return (async () => {' + process.argv[2] + '})()')); console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 0)); } catch(e){ console.log('EXC', e.message); }
  console.log(errs.slice(0, 8).join('\n') || 'sin errores de consola'); await b.close(); })();
