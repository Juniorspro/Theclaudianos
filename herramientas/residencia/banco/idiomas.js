// recorre todas las pantallas y textos en un idioma y junta lo que no se tradujo (TR_FALTA) y palabras castellanas a la vista
// node idiomas.js en|pt
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const L = process.argv[2] || 'en'; const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, locale:L === 'en' ? 'en-US' : 'pt-BR'})).newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if(m.type() === 'error') errs.push('CONS ' + m.text()); });
  await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(1500);
  const r = await p.evaluate(async L => { const R = __R, vistos = new Set(), espera = ms => new Promise(r => setTimeout(r, ms));
    const juntar = () => { const t = document.getElementById('stage').innerText || ''; for(const l of t.split('\n')) if(l.trim()) vistos.add(l.trim()); };
    R.ponerIdioma(L);
    R.menuIdioma(); juntar(); R.menuTitulo(); juntar(); R.menuDificultad(); juntar(); R.menuComo(); juntar(); R.menuOpciones(() => {}); juntar();
    R.nuevaPartida('normal'); document.getElementById('menu').innerHTML = ''; R.paso(1/30, 5); juntar();
    /* cada cosa con la mano: su etiqueta en varios estados */
    const ets = () => { for(const o of R.MUNDO.interactivos){ if(typeof o.et === 'function') vistos.add(o.et()); } };
    ets(); R.JUG.inv.tablas = 2; R.JUG.inv.bidon = 50; R.JUG.inv.llave = true; R.JUG.linterna.tiene = true; ets(); R.ELEC.hay = false; ets(); R.ELEC.hay = true; R.J.telSuena = 5; ets(); R.J.telSuena = 0; R.J.radioYa = true; ets();
    for(const o of R.MUNDO.interactivos) if(o.no) try { o.no(); if(R.J.pensamiento) vistos.add(R.J.pensamiento.txt); } catch(e){}
    for(const o of R.MUNDO.interactivos) if(o.hacer && !o.mantener && !/^p_|^cerrojo|^pl_|pc|radio|telefono|fusibles/.test(o.id)) try { o.hacer(); R.paso(1/30, 2); if(R.J.pensamiento) vistos.add(R.J.pensamiento.txt); juntar(); } catch(e){}
    /* la radio, el teléfono, la tele, las cámaras, el placard, los fusibles */
    R.J.cola = []; const rad = R.MUNDO.interactivos.find(o => o.id === 'radio'); R.J.radioYa = false; rad.hacer(); for(let i = 0; i < 30*40; i++){ R.paso(1/30); if(i % 15 === 0) juntar(); }
    R.J.telSuena = 12; R.J.telEvento = 'tarde'; R.MUNDO.interactivos.find(o => o.id === 'telefono').hacer(); for(let i = 0; i < 30*11; i++){ R.paso(1/30); if(i % 15 === 0) juntar(); }
    R.J.hora = 21.2; R.ELEC.tvOn = true; R.paso(1/30, 10); juntar();
    R.CAMS.forEach(c => c.instalada = true); R.abrirCamaras(); R.paso(1/30, 5); juntar(); R.cerrarCamaras(); R.JUG.en = 'libre';
    const q = Object.values(R.MUNDO.placards)[0]; R.entrarPlacard(q); R.paso(1/30, 3); juntar(); R.empezarQTE(); R.paso(1/30, 3); juntar(); R.QTE.estado = 'nada'; R.salirPlacard(); R.paso(1/30, 3);
    R.saltarFusibles(); R.paso(1/30, 3); juntar(); const fu = R.MUNDO.interactivos.find(o => o.id === 'fusibles'); fu.hacer(); R.paso(1/30, 3); juntar(); R.tocarCable(R.FUS.malo); R.paso(1/30, 3); juntar();
    R.J.hora = 23.95; R.J.corre = true; R.J.fase = 'prep'; for(let i = 0; i < 30*3; i++) R.paso(1/30); juntar(); R.pausar(true); juntar(); R.pausar(false);
    /* la noche entera por arriba (sucesos de cada hora) */
    for(const h of [25.05, 25.25, 25.55, 26.05, 26.55, 29.05]){ R.J.hora = h; for(let i = 0; i < 30*6; i++){ R.paso(1/30); if(R.J.modo !== 'juego') break; if(i % 20 === 0) juntar(); } if(R.J.modo !== 'juego') break; }
    /* las muertes y la victoria */
    for(const c of ['monstruo', 'afuera', 'aire', 'auto', 'placard']){ R.nuevaPartida('normal'); document.getElementById('menu').innerHTML = ''; R.J.hora = 25; R.J.retry = {}; R.morir(c); await espera(1100); juntar(); }
    R.nuevaPartida('normal'); document.getElementById('menu').innerHTML = ''; R.J.hora = 29.99; R.J.corre = true; R.J.fase = 'noche'; for(let i = 0; i < 30*12; i++) R.paso(1/30); await espera(300); juntar();
    const esp = /\b(el|los|las|del|que|con|una|para|está|estás|tenés|prendé|ventana|luz|puerta|noche|casa|tablas|linterna)\b/i;
    const sosp = [...vistos].filter(t => esp.test(t) && !/^[\d\s:APM·]+$/.test(t));
    return {vistos:vistos.size, falta:[...R.TR_FALTA], sosp:sosp.slice(0, 30), err:R.ERRORES.slice(0, 3), modo:R.J.modo, menu:document.getElementById('menu').innerText.slice(0, 80)}; }, L);
  console.log(JSON.stringify(r, null, 1)); console.log(errs.slice(0, 5).join('\n') || 'sin errores de consola'); await b.close(); })();
