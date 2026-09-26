// los sonidos y los temas de los jefes, medidos a la salida: pico y RMS de cada efecto solo, y cada tema con poca y mucha intensidad
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
  const p = await (await b.newContext({viewport:{width:412, height:892}})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if(m.type() === 'error') errs.push(m.text()); });
  await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(500);
  const r = await p.evaluate(async () => { const S = __S.SON; S.arrancar(); await new Promise(r => setTimeout(r, 400)); S.musica(null); S.ambiente(null);
    const C = S._ctx(), an = C.createAnalyser(); an.fftSize = 2048; S._salida().connect(an); const buf = new Float32Array(an.fftSize), esp = new Float32Array(an.frequencyBinCount);
    const espera = ms => new Promise(r => setTimeout(r, ms));
    async function medir(ms){ let pk = 0, sum = 0, n = 0, bandas = [0, 0, 0]; const t0 = performance.now();
      do { an.getFloatTimeDomainData(buf); for(const v of buf){ pk = Math.max(pk, Math.abs(v)); sum += v*v; n++; }
        an.getFloatFrequencyData(esp); const hz = C.sampleRate/an.fftSize; esp.forEach((db, i) => { const e = Math.pow(10, db/10), f = i*hz; bandas[f < 250 ? 0 : f < 2500 ? 1 : 2] += e; }); await espera(30); } while(performance.now() - t0 < ms);
      const tot = bandas[0] + bandas[1] + bandas[2] || 1; return {pico:+pk.toFixed(3), rms:+Math.sqrt(sum/n).toFixed(4), graves:Math.round(bandas[0]/tot*100), medios:Math.round(bandas[1]/tot*100), agudos:Math.round(bandas[2]/tot*100)}; }
    const out = {fx:{}, temas:{}};
    for(const [n, o] of [['jefe_aparece', {n:0}], ['jefe_aparece', {n:1}], ['jefe_aparece', {n:2}], ['reja', {}], ['reja', {n:1}], ['jefe_golpe', {n:0}], ['jefe_golpe', {n:1}], ['jefe_golpe', {n:2}], ['clang', {}],
      ['jefe_muere', {n:0}], ['jefe_muere', {n:1}], ['jefe_muere', {n:2}], ['aleteo', {}], ['graznido', {}], ['plumas', {}], ['picada', {}], ['hielo_marca', {}], ['carambano', {}], ['hielo_rompe', {}],
      ['susurro', {}], ['aliento', {}], ['kiai', {}], ['paso', {}], ['onda', {}], ['aterriza', {}], ['fuego_carga', {}], ['fuego', {}]]){
      S.fx(n, o); const m = await medir(n === 'jefe_aparece' || n === 'jefe_muere' ? 2600 : 900); out.fx[n + (o.n !== undefined ? o.n : '')] = m.pico + ' / ' + m.rms; await espera(900); }
    for(const t of ['jefe_tengu', 'jefe_yuki', 'jefe_shogun', 'bambu']){ S.musica(t); for(const k of [0.35, 1]){ S.intensidad(k); for(let i = 0; i < 120; i++){ S.paso(0.016); await espera(16); } const m = await medir(0); let acc = []; 
        for(let i = 0; i < 160; i++){ S.paso(0.016); if(i % 4 === 0) acc.push(await medir(0)); await espera(16); }
        const pr = key => acc.reduce((a, q) => a + q[key], 0)/acc.length; out.temas[t + '@' + k] = {rms:+Math.sqrt(acc.reduce((a, q) => a + q.rms*q.rms, 0)/acc.length).toFixed(4), pico:Math.max(...acc.map(q => q.pico)), graves:Math.round(pr('graves')), medios:Math.round(pr('medios')), agudos:Math.round(pr('agudos'))}; } S.musica(null); await espera(1500); }
    out.faltan = [...S._faltan]; out.err = S._err.length || S._err.size || 0; out.temasLista = S._temas(); return out; });
  console.log(JSON.stringify(r, null, 1)); console.log(errs.join(' | ') || 'sin errores'); await b.close(); })();
