// recorre todas las pantallas, cinemáticas, HUD y resultado en inglés y portugués y junta lo que quedó sin traducir
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  for(const l of ['en', 'pt']){
    const p = await (await b.newContext({viewport:{width:892, height:412}})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///tmp/ui/linea_b.html'); await p.waitForTimeout(500);
    await p.evaluate(l => { __L.ponerIdioma(l); __L._AUD.clear(); __L.TR_FALTA.clear(); }, l);
    const pant = ['idioma', 'censura', 'titulo', 'principal', 'capitulos', 'mascaras', 'opciones'];
    for(const s of pant){ await p.evaluate(s => { __L.J.modo = 'menu'; __L.irA(s); }, s); await p.waitForTimeout(120); }
    for(const id of ['prologo', 'once', 'bailanta', 'deposito', 'mansion', 'fin']){
      await p.evaluate(id => { __L.J.cine = null; const G = id; window.__cid = id; }, id);
      await p.evaluate(id => { const L = __L; L.jugarCap; }, id);
      // cinemática: paso a paso, completando el texto
      await p.evaluate(id => { const L = __L; const cap = L.CAPITULOS.findIndex(c => c.id === id); if(cap >= 0) L.jugarCap(cap); else { L.J.capIdx = 4; L.J.cap = L.CAPITULOS[4]; } }, id);
      for(let k = 0; k < 30; k++){ await p.waitForTimeout(90); await p.mouse.click(446, 206); await p.waitForTimeout(90); await p.mouse.click(446, 206); if(await p.evaluate(() => !__L.J.cine)) break; }
    }
    // juego con tutorial, aviso, combo, muerte, pausa, resultado
    await p.evaluate(() => { const L = __L; L.empezarCap(0); }); await p.waitForTimeout(300);
    for(let k = 0; k < 6; k++){ await p.evaluate(() => { __L.J.pista = (__L.J.pista || 0); __L.J.pisteo.t = 99; }); await p.waitForTimeout(150); }
    await p.evaluate(() => { const L = __L; L.JUG.arma = 'pistola'; L.JUG.balas = 0; L.J.combo = 3; L.J.comboT = 3; L.J.aviso = null; }); await p.waitForTimeout(200);
    await p.evaluate(() => { const L = __L; L.matar(L.ENEM[0], 'bala', 0); L.matar(L.ENEM[1], 'remate', 0); L.matar(L.ENEM[2], 'puerta', 0); L.matar(L.ENEM[3], 'corte', 0); L.matar(L.ENEM[4], 'tirada', 0); }); await p.waitForTimeout(300);
    await p.evaluate(() => { __L.J.pausa = true; __L.UI.p = 'pausa'; }); await p.waitForTimeout(150);
    await p.evaluate(() => { __L.J.pausa = false; __L.JUG.muerto = true; __L.J.muerto = 1; }); await p.waitForTimeout(300);
    await p.evaluate(() => { __L.JUG.muerto = false; __L.J.capLimpio = true; __L.terminarCapitulo(); __L.UI.t = 9; }); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({falta:[...__L.TR_FALTA], vistos:__L.textoLibre()}));
    const esp = r.vistos.filter(s => /\b(DE|EL|LA|LOS|QUE|CON|POR|PARA|TOCÁ|PISO|BALAS|SUBÍ|VOLVÉ)\b/.test(s) && !/BUENOS AIRES|DOCK SUD|SAN ISIDRO|LA ESPIGA|CONSTITUCIÓN|LÍNEA CALIENTE|\d DE \w+ DE|MARÇO DE|DE MAIO|DE JULHO|DE ABRIL|DE MARZO/.test(s));
    console.log(l, 'vistos', r.vistos.length, 'faltan', r.falta.length, JSON.stringify(r.falta.slice(0, 30)), 'castellano', JSON.stringify(esp.slice(0, 20)), errs.join(' | '));
    await p.close(); }
  await b.close(); })();
