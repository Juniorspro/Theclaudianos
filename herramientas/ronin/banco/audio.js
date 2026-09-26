// el sonido de EL ÚLTIMO RŌNIN medido a la salida, sin juego: cada efecto solo (pico y RMS), cada tema con poca y mucha
// intensidad, cada ambiente, el paneo, el lento, el volumen y llamadas con basura. Uso: node herramientas/ronin/banco/audio.js
const fs = require('fs'), path = require('path'), os = require('os');
const {chromium} = require('/tmp/ui/node_modules/playwright');
const SRC = path.join(__dirname, '..', 'fuentes', '2_audio.js');
(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  try { new Function(src); console.log('sintaxis: bien (' + src.length + ' bytes)'); } catch(e){ console.log('sintaxis: MAL', e.message); process.exit(1); }
  const pag = path.join(os.tmpdir(), 'ronin_audio.html');
  fs.writeFileSync(pag, '<!doctype html><meta charset="utf-8"><body><script>(() => {\n' + src + '\nwindow.SON = SON;\n})();</script>');
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
  const p = await (await b.newContext()).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if(m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + pag); await p.waitForTimeout(300);
  const r = await p.evaluate(async () => {
    const S = window.SON, espera = ms => new Promise(r => setTimeout(r, ms));
    /* lo que se pide antes de arrancar tiene que quedar guardado y no romper */
    S.musica('menu'); S.ambiente('bambu'); S.fx('tajo'); S.intensidad(0.3);
    S.arrancar(); await espera(500); S.musica(null); S.ambiente(null); await espera(2600);
    const C = S._ctx(), an = C.createAnalyser(); an.fftSize = 2048; S._salida().connect(an);
    const sp = C.createChannelSplitter(2), aL = C.createAnalyser(), aR = C.createAnalyser(); aL.fftSize = aR.fftSize = 2048; S._salida().connect(sp); sp.connect(aL, 0); sp.connect(aR, 1);
    const buf = new Float32Array(an.fftSize), bl = new Float32Array(2048), br = new Float32Array(2048);
    async function medir(ms, env){ let pk = 0, sum = 0, n = 0; const t0 = performance.now(), cur = [];
      do { an.getFloatTimeDomainData(buf); let pb = 0; for(const v of buf){ const a = Math.abs(v); if(a > pk) pk = a; if(a > pb) pb = a; sum += v*v; n++; }
        if(env) cur.push([Math.round(performance.now() - t0), +pb.toFixed(3)]); await espera(20); } while(performance.now() - t0 < ms);
      return {pico:+pk.toFixed(3), rms:+Math.sqrt(sum/n).toFixed(4), env:cur}; }
    const out = {estado0:C.state, fx:{}, temas:{}, amb:{}};
    const LARGO = {relampago:4200, muerte_heroe:3600, jefe_aparece:4000, titulo:4000, habilidad:2600, victoria:3000, derrota:3000, desbloqueo:3000, ki_listo:2600,
      desvio:2600, muerte:2200, aturdido:2000, concentracion:2000, mejora:2600, elegir:2000, rugido_oni:1800, grito_yokai:2000, compra:1600, huesos:1300, sapo:1400};
    for(const n of S._lista()){ S.fx(n, {}); const m = await medir(LARGO[n] || 1100, n === 'relampago'); out.fx[n] = [m.pico, m.rms];
      if(n === 'relampago'){ const e = m.env, pico = e.reduce((a, q) => q[1] > a[1] ? q : a, [0, 0]), prim = e.find(q => q[1] > 0.02);
        out.relampagoForma = {primeraSenal_ms:prim && prim[0], picoMayor_ms:pico[0], picoMayor:pico[1], a1s:(e.find(q => q[0] > 1000) || [])[1], a2_5s:(e.find(q => q[0] > 2500) || [])[1]}; }
      await espera(900); }
    /* el paneo: aviso_ligero a la izquierda y a la derecha */
    for(const x of [-1, 1]){ S.fx('aviso_ligero', {pan:x}); let L = 0, R = 0; const t0 = performance.now();
      while(performance.now() - t0 < 300){ aL.getFloatTimeDomainData(bl); aR.getFloatTimeDomainData(br); for(let i = 0; i < 2048; i++){ L = Math.max(L, Math.abs(bl[i])); R = Math.max(R, Math.abs(br[i])); } await espera(20); }
      out['pan' + x] = {izq:+L.toFixed(3), der:+R.toFixed(3)}; await espera(600); }
    /* tono y vol */
    S.fx('aviso_ligero', {vol:0.3}); out.vol03 = (await medir(400)).pico; await espera(500);
    /* los temas, a 0,3 y a 1 */
    for(const t of S._temas()){ S.intensidad(0.3); S.musica(t); await espera(2600); const a = await medir(5000);
      S.intensidad(1); await espera(3600); const z = await medir(5000);
      out.temas[t] = {'0.3':[a.pico, a.rms], '1':[z.pico, z.rms], reps:S._reps().join(',')}; S.musica(null); await espera(2200); }
    S.intensidad(0.3);
    /* los ambientes */
    for(const a of S._ambientes()){ S.ambiente(a); await espera(3000); const m = await medir(6000); out.amb[a] = [m.pico, m.rms]; }
    S.ambiente(null); await espera(2600);
    /* el lento: la música baja un tono y se cierra el pasabajos */
    S.musica('batalla'); await espera(1500); S.lento(1); await espera(600);
    const N = S._N(); out.lento = {k:+S._estado().kLento.toFixed(2), pasabajosMusica:Math.round(N.musF.frequency.value), pasabajosFx:Math.round(N.fxF.frequency.value)};
    S.lento(0); await espera(600); out.lento.vuelve = Math.round(N.musF.frequency.value); S.musica(null); await espera(2000);
    /* el volumen en cero calla los efectos */
    S.volumen(0, 0); await espera(100); S.fx('desvio'); out.volCero = (await medir(800)).pico; S.volumen(0.8, 1); await espera(1500);
    /* basura: nada tiene que tirar */
    let tiro = null;
    try { S.fx(); S.fx(null); S.fx(42, 'x'); S.fx('tajo', {vol:'mucho', tono:NaN, pan:Infinity}); S.fx('tajo', {vol:99, tono:-3});
      S.musica(); S.musica({}); S.musica('nada'); S.ambiente(7); S.lento('x'); S.lento(-5); S.intensidad(undefined); S.volumen(NaN, 'a'); S.arrancar(); S.arrancar(); }
    catch(e){ tiro = e.message; }
    out.basuraTiro = tiro; await espera(800);
    out.faltanAntes = [...S._faltan].filter(n => n !== 'nada');   /* 'nada' es un tema, no un efecto: no cuenta */
    S.fx('no_existe'); out.faltanDespues = [...S._faltan];
    out.err = S._err.slice(); out.estado = S._estado(); out.mel = S._mel(); out.estado1 = C.state;
    return out; });
  const fx = r.fx, nfx = Object.keys(fx);
  console.log('contexto:', r.estado0, '→', r.estado1);
  console.log('\nEFECTOS (' + nfx.length + ') pico / rms');
  for(const n of nfx) console.log('  ' + n.padEnd(14) + String(fx[n][0]).padEnd(7) + fx[n][1] + (fx[n][0] <= 0.02 ? '  <-- SIN SEÑAL' : '') + (fx[n][0] > 0.95 ? '  <-- PASA 0,95' : ''));
  const pk = nfx.map(n => fx[n][0]);
  console.log('  sin señal (<=0,02):', nfx.filter(n => fx[n][0] <= 0.02).join(', ') || 'ninguno', '| máximo:', Math.max(...pk), '| mínimo:', Math.min(...pk));
  console.log('  relámpago:', JSON.stringify(r.relampagoForma));
  console.log('  paneo -1:', JSON.stringify(r['pan-1']), ' +1:', JSON.stringify(r.pan1), '| vol 0,3 aviso:', r.vol03, '| volumen en cero:', r.volCero);
  console.log('\nTEMAS pico / rms a intensidad 0,3 y 1');
  for(const t in r.temas){ const q = r.temas[t]; console.log('  ' + t.padEnd(18) + '0,3: ' + q['0.3'].join(' / ').padEnd(16) + ' 1: ' + q['1'].join(' / ')); }
  console.log('  melodías [tema, pasos M, pasos M2, largo prog]:', JSON.stringify(r.mel));
  console.log('\nAMBIENTES pico / rms'); for(const a in r.amb) console.log('  ' + a.padEnd(8) + r.amb[a].join(' / '));
  console.log('\nlento:', JSON.stringify(r.lento));
  console.log('basura tiró:', r.basuraTiro, '| _faltan después de todo:', JSON.stringify(r.faltanAntes), '| con uno inventado:', JSON.stringify(r.faltanDespues));
  console.log('_err:', r.err.length ? r.err : 'vacío', '| estado:', JSON.stringify(r.estado));
  const todo = [...pk, ...Object.values(r.temas).flatMap(q => [q['0.3'][0], q['1'][0]]), ...Object.values(r.amb).map(a => a[0])];
  console.log('pico más alto de todo:', Math.max(...todo), Math.max(...todo) <= 0.95 ? '(no pasa 0,95)' : '(PASA 0,95)');
  console.log('página:', errs.join(' | ') || 'sin errores');
  await b.close();
})();
