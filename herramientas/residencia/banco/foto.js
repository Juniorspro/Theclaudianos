// pasos de código con captura después de cada uno: node foto.js prefijo '["código", ...]' [idioma]
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const ctx = await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:1, locale:process.argv[4] || 'es-AR', isMobile:true, hasTouch:true}); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('CONS ' + m.text()); });
  await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(2000);
  const pasos = JSON.parse(process.argv[3]);
  for(let i = 0; i < pasos.length; i++){ let r; try { r = await p.evaluate(new Function('return (async () => {' + pasos[i] + '})()')); } catch(e){ r = 'EXC ' + e.message; }
    await p.screenshot({path:'/tmp/ui/res/' + process.argv[2] + '_' + i + '.png', timeout:90000}); console.log(i, typeof r === 'string' ? r : JSON.stringify(r)); }
  console.log(errs.slice(0, 8).join('\n') || 'sin errores de consola'); await b.close(); })();
