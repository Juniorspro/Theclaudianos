/* ================================================================ sonido
   LÍNEA CALIENTE, Buenos Aires 1989: darksynth ochentoso, todo de Web Audio, sin archivos.
   Tres buses (música, efectos, ambiente) → pasaaltos → compresor → recorte suave (nunca pasa de 0,95).
   La música es un secuenciador de semicorcheas que programa con anticipación contra currentTime:
   cada tema con su tonalidad y su tempo, frases de 8 compases que se contestan (A y B, 16 en total)
   y capas que entran con la intensidad. Bajo en sierra saturado con un pasabajos que se abre, caja
   con reverberación de compuerta de los 80, y la cinta de VHS: una línea de retardo que se mueve.
   Ninguna llamada de acá puede tirarle una excepción al juego: todo va envuelto. */
const SON = (() => {
  let C = null, N = null, RU = null, ONDA = null, IR_G = null, listo = false;
  let temaPed = null, temaAct, ambPed = null, ambAct, muertePed = false;        /* lo pedido antes de haber contexto */
  let kLento = 0, kLentoObj = 0, kAplic = -1, tLento = 0, inten = 0, intenObj = 0, kAhora = 0, tPaso = 0, tPasoAnt = 0, ultBlip = 0;
  let kMuerte = 0, kCinta = 0, cintaAplic = -1;
  const ERR = [], FALTAN = new Set();
  const err = e => { if(ERR.length < 30) ERR.push(String(e && e.stack || e)); };
  const tiene = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  const suv = t => t*t*(3 - 2*t);
  const mtof = m => 440*Math.pow(2, (m - 69)/12);
  const ya = () => C.currentTime;

  /* ------------------------------------------------------------ armado del máster */
  function ruidos(){
    const n = Math.floor(C.sampleRate*3), mk = () => C.createBuffer(1, n, C.sampleRate);
    const bl = mk(), ro = mk(), pa = mk(), a = bl.getChannelData(0), b = ro.getChannelData(0), c = pa.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, u = 0;
    for(let i = 0; i < n; i++){
      const w = Math.random()*2 - 1; a[i] = w*0.7;
      b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759; b2 = 0.96900*b2 + w*0.1538520;
      b3 = 0.86650*b3 + w*0.3104856; b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
      b[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w*0.5362)*0.1; b6 = w*0.115926;
      u = (u + 0.02*w)/1.02; c[i] = u*3.2;
    }
    const fz = Math.floor(C.sampleRate*0.02);                     /* que las puntas del bucle se toquen */
    for(const d of [a, b, c]) for(let i = 0; i < fz; i++){ const k = i/fz; d[n - fz + i] = d[n - fz + i]*(1 - k) + d[i]*k; }
    RU = {blanco:bl, rosa:ro, pardo:pa};
  }
  /* respuesta de impulso por código: ruido que se apaga y se oscurece, con reflexiones tempranas */
  function ir(dur, caida, brillo, pre){
    const sr = C.sampleRate, n = Math.floor(sr*dur), b = C.createBuffer(2, n, sr), p0 = Math.floor(sr*(pre || 0.012));
    for(let ch = 0; ch < 2; ch++){
      const d = b.getChannelData(ch); let lp = 0;
      for(let i = p0; i < n; i++){
        const x = (i - p0)/(n - p0), en = Math.pow(1 - x, caida)*Math.exp(-x*2.2);
        lp += lerp(brillo, 0.03, Math.sqrt(x))*((Math.random()*2 - 1) - lp);
        d[i] = lp*en*Math.min(1, (i - p0)/(sr*0.006));
      }
      for(let k = 0; k < 9; k++){ const i = Math.floor(sr*(0.006 + Math.random()*0.07)); if(i < n) d[i] += (Math.random() < 0.5 ? -1 : 1)*0.35*(1 - k/10); }
    }
    return b;
  }
  /* la compuerta de los 80: una sala enorme que a los 0,3 s se corta de golpe */
  function irCompuerta(dur){
    const sr = C.sampleRate, n = Math.floor(sr*(dur + 0.03)), b = C.createBuffer(2, n, sr), corte = Math.floor(sr*dur);
    for(let ch = 0; ch < 2; ch++){ const d = b.getChannelData(ch); let lp = 0;
      for(let i = 0; i < n; i++){ const x = i/corte;
        const en = (i < corte ? 0.6 + 0.4*Math.exp(-x*1.8) : Math.exp(-(i - corte)/(sr*0.004)))*Math.min(1, i/(sr*0.004));
        lp += 0.5*((Math.random()*2 - 1) - lp); d[i] = lp*en; } }
    return b;
  }
  /* lineal hasta 0,6 y después se dobla suave hasta 0,95: por acá no pasa un clip */
  function curvaRecorte(){
    const n = 4096, c = new Float32Array(n);
    for(let i = 0; i < n; i++){ const x = (i/(n - 1)*2 - 1)*2, a = Math.abs(x);
      c[i] = Math.sign(x)*(a < 0.6 ? a : 0.6 + 0.35*Math.tanh((a - 0.6)/0.35)); }
    return c;
  }
  /* saturación tipo pedal: tanh normalizado, con un pelo de pares para que suene a válvula */
  const CURVAS = {};
  function curvaSat(k){ const q = Math.max(0.5, Math.round(k*10)/10); if(CURVAS[q]) return CURVAS[q];
    const n = 1024, c = new Float32Array(n), nrm = Math.tanh(q);
    for(let i = 0; i < n; i++){ const x = i/(n - 1)*2 - 1; c[i] = (Math.tanh(q*(x + 0.08*x*x)))/nrm; }
    return CURVAS[q] = c; }
  function saturador(k, dest){ const w = C.createWaveShaper(); w.curve = curvaSat(k); w.oversample = '2x'; if(dest) w.connect(dest); return w; }
  function ondas(){
    const H = 48, re = new Float32Array(H), im = new Float32Array(H), r2 = new Float32Array(H), i2 = new Float32Array(H);
    for(let k = 1; k < H; k++) re[k] = 2/(k*Math.PI)*Math.sin(k*Math.PI*0.25);            /* pulso al 25% */
    /* lengüeta de fuelle: impares fuertes, pares que asoman y un hueco que la hace nasal */
    const L = [0, 1, 0.55, 0.78, 0.3, 0.52, 0.34, 0.2, 0.26, 0.12, 0.16, 0.1, 0.13, 0.06, 0.09, 0.05, 0.06];
    for(let k = 1; k < H; k++) i2[k] = (L[k] !== undefined ? L[k] : 0.5/k)*(k % 7 === 0 ? 0.3 : 1);
    ONDA = {pulso:C.createPeriodicWave(re, im), cana:C.createPeriodicWave(r2, i2)};
  }
  const G = (v, dest) => { const g = C.createGain(); g.gain.value = v === undefined ? 1 : v; if(dest) g.connect(dest); return g; };
  const F = (tipo, f, q, dest) => { const x = C.createBiquadFilter(); x.type = tipo; x.frequency.value = f; if(q !== undefined) x.Q.value = q; if(dest) x.connect(dest); return x; };
  function armar(){
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return false;
    try { C = new AC({latencyHint:'interactive'}); } catch(e){ C = new AC(); }
    ruidos(); ondas(); IR_G = irCompuerta(0.3);
    N = {};
    N.sal = G(1, C.destination);
    N.rec = C.createWaveShaper(); N.rec.curve = curvaRecorte(); N.rec.oversample = 'none'; N.rec.connect(N.sal);
    N.pre = G(0.5, N.rec);
    N.comp = C.createDynamicsCompressor();
    N.comp.threshold.value = -14; N.comp.knee.value = 10; N.comp.ratio.value = 4; N.comp.attack.value = 0.003; N.comp.release.value = 0.2;
    N.comp.connect(N.pre);
    N.hp = F('highpass', 28, 0.7, N.comp);
    N.mezcla = G(0.95, N.hp);
    /* música: bus → cinta (retardo que se mueve) → lento → muerte → oscurecido de la cinta → volumen */
    N.musV = G(0.55, N.mezcla); N.cLp = F('lowpass', 18000, 0.5, N.musV);
    N.muG = G(1, N.cLp); N.muF = F('lowpass', 18000, 0.6, N.muG);
    N.musF = F('lowpass', 18000, 0.5, N.muF);
    N.wow = C.createDelay(0.1); N.wow.delayTime.value = 0.016; N.wow.connect(N.musF);
    N.mus = G(1, N.wow);
    N.revM = C.createConvolver(); N.revM.buffer = ir(2.8, 1.5, 0.6, 0.02); N.revM.connect(N.wow);
    N.revMin = G(0.2, N.revM); N.mus.connect(N.revMin);
    /* wow (0,53 Hz), flutter (6,3 Hz) y una deriva lenta: la profundidad la pone cinta() */
    N.wowG = [];
    for(const [f, tipo] of [[0.53, 'sine'], [6.3, 'sine'], [0.17, 'triangle']]){ const o = C.createOscillator(); o.type = tipo; o.frequency.value = f;
      const g = G(0, N.wow.delayTime); o.connect(g); o.start(); N.wowG.push(g); }
    N.siseo = G(0, N.muF); { const s = C.createBufferSource(); s.buffer = RU.rosa; s.loop = true; s.connect(F('highpass', 2600, 0.5, N.siseo)); s.start(); }
    /* eco de corchea con puntillo, oscureciéndose en cada vuelta */
    N.eco = G(1); N.ecoD = C.createDelay(2); N.ecoD.delayTime.value = 0.36;
    N.ecoLp = F('lowpass', 2800, 0.6); N.ecoFb = G(0.36); N.ecoW = G(0.5, N.mus);
    N.eco.connect(N.ecoD); N.ecoD.connect(N.ecoLp); N.ecoLp.connect(N.ecoFb); N.ecoFb.connect(N.ecoD); N.ecoLp.connect(N.ecoW);
    /* efectos, con su cola y su compuerta propia (el sello, el título, el piso limpio) */
    N.fxV = G(1, N.mezcla); N.fx = G(1, N.fxV);
    N.revF = C.createConvolver(); N.revF.buffer = ir(1.8, 2.2, 0.7, 0.008); N.revF.connect(N.fxV); N.revFin = G(1, N.revF);
    N.gateF = C.createConvolver(); N.gateF.buffer = IR_G; N.gateF.connect(N.fxV); N.gateFin = G(0.8, N.gateF);
    /* ambiente */
    N.ambV = G(0.8, N.mezcla); N.ambF = F('lowpass', 18000, 0.5, N.ambV); N.amb = G(1, N.ambF);
    /* iOS: un buffer mudo destraba la salida */
    try { const s = C.createBufferSource(); s.buffer = C.createBuffer(1, 64, C.sampleRate); s.connect(C.destination); s.start(0); } catch(e){}
    listo = true;
    volumen(); aplicarCinta();
    setInterval(() => { if(listo && performance.now() - tPaso > 140) paso(0.05); }, 50);   /* por si el juego deja de llamar paso() */
    document.addEventListener('visibilitychange', () => { try {
      if(document.hidden){ if(C.state === 'running') C.suspend(); } else if(C.state !== 'closed') C.resume().catch(() => {}); } catch(e){} });
    return true;
  }

  /* ------------------------------------------------------------ piezas de síntesis */
  /* osciladores de la música: quedan anotados para que el lento y la muerte los bajen de tono */
  const OSC_M = [];
  let repAct = null;                                  /* el tema que está programando: sus osciladores se cortan al soltarlo */
  const detL = () => -kLento*190 - kMuerte*80;
  function oscM(tipo, f, t, fin, det){
    const o = C.createOscillator();
    if(ONDA[tipo]) o.setPeriodicWave(ONDA[tipo]); else o.type = tipo;
    o.frequency.setValueAtTime(f, t); o.detune.value = (det || 0) + detL();
    const rg = {o, d0:det || 0, fin}; OSC_M.push(rg); if(repAct) repAct.oscs.push(rg); o.start(t); o.stop(fin); return o;
  }
  function oscF(tipo, f, t, fin){ const o = C.createOscillator(); if(ONDA[tipo]) o.setPeriodicWave(ONDA[tipo]); else o.type = tipo;
    o.frequency.setValueAtTime(f, t); o.start(t); o.stop(fin); return o; }
  function fuente(col, t, fin, rate){ const s = C.createBufferSource(); s.buffer = RU[col || 'blanco']; s.loop = true;
    if(rate) s.playbackRate.value = rate; s.start(t, Math.random()*2.6); s.stop(fin); return s; }
  /* envolvente: ataque lineal y caída exponencial que llega a ~0 en d */
  function env(p, t, a, v, d){ p.setValueAtTime(0, t); p.linearRampToValueAtTime(v, t + a); p.setTargetAtTime(0, t + a, d/5); return t + a + d*1.45; }
  function adsr(p, t, a, dec, sus, fin, rel, v){ fin = Math.max(fin, t + a + 0.01);
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(v, t + a); p.setTargetAtTime(v*sus, t + a, dec); p.setTargetAtTime(0, fin, rel/4.5); return fin + rel*1.6; }
  /* ruido filtrado con envolvente. o: {t, d, a, v, f, f2, fd, q, tipo, col, rate, dest} */
  function RZ(o){
    const t = o.t, a = o.a || 0.002, g = C.createGain(), fl = C.createBiquadFilter();
    fl.type = o.tipo || 'bandpass'; fl.frequency.setValueAtTime(lim(o.f, 20, 20000), t); fl.Q.value = o.q === undefined ? 1 : o.q;
    if(o.f2) fl.frequency.exponentialRampToValueAtTime(lim(o.f2, 20, 20000), t + (o.fd || o.d));
    const fin = env(g.gain, t, a, o.v, o.d), s = fuente(o.col, t, fin + 0.02, o.rate);
    s.connect(fl); fl.connect(g); g.connect(o.dest); return fin - t;
  }
  /* tono con barrido. o: {t, f, f2, fd, tipo, a, d, v, lp, dest} */
  function TN(o){
    const t = o.t, a = o.a || 0.002, g = C.createGain(), fin = env(g.gain, t, a, o.v, o.d), s = oscF(o.tipo || 'sine', lim(o.f, 1, 20000), t, fin + 0.02);
    if(o.f2) s.frequency.exponentialRampToValueAtTime(lim(o.f2, 1, 20000), t + (o.fd || o.d));
    if(o.lp){ const l = F('lowpass', o.lp, 0.7); s.connect(l); l.connect(g); } else s.connect(g);
    g.connect(o.dest); return fin - t;
  }
  function panear(dest, x){ const p = C.createStereoPanner(); p.pan.value = lim(+x || 0, -1, 1); p.connect(dest); return p; }
  const whoosh = (t, d, f1, f2, v, dest) => RZ({t, a:d*0.55, d:d*0.6, v, f:f1, f2, fd:d, q:1.4, col:'rosa', dest});
  /* un pedazo de voz: sierra por tres formantes, con su curva de altura */
  const FORM = {a:[[800, 1], [1200, 0.6], [2500, 0.2]], e:[[500, 1], [1850, 0.55], [2500, 0.2]], i:[[320, 1], [2300, 0.5], [3000, 0.2]],
    o:[[500, 1], [850, 0.6], [2600, 0.12]], u:[[350, 1], [700, 0.45], [2400, 0.1]]};
  function vox(t, dest, o){
    const d = o.d, g = C.createGain(), mix = G(1), s = oscF('sawtooth', o.f, t, t + d + 0.25), q = o.q || 7;
    if(o.f2) s.frequency.linearRampToValueAtTime(o.f2, t + d*(o.pico || 0.3));
    if(o.f3) s.frequency.exponentialRampToValueAtTime(o.f3, t + d);
    if(o.vib){ const l = oscF('sine', o.vib, t, t + d + 0.25); l.connect(G(o.f*0.03, s.frequency)); }
    for(const [fr, a] of FORM[o.vocal || 'a']){ const bp = F('bandpass', fr*(o.fk || 1), q); mix.connect(bp); bp.connect(G(a*q*0.55, g)); }
    s.connect(mix);
    if(o.sucio) g.connect(saturador(o.sucio, dest)); else g.connect(dest);
    adsr(g.gain, t, o.a || 0.02, 0.1, 0.8, t + d - 0.05, 0.07, o.v);
    if(o.aire) RZ({t, a:0.01, d:d*0.7, v:o.aire, f:1600*(o.fk || 1), q:0.8, dest});
    return d;
  }

  /* ------------------------------------------------------------ instrumentos de la música */
  /* la cadena sucia de cada capa: saturador → pasabajos de parlante → la capa (una por tema, se tira con él) */
  function sucio(x, capa, k){ const r = x.r, key = capa + ':' + k;
    if(!r.sc[key]){ const g = G(0.3, r.cap[capa]), lp = F('lowpass', 4600, 0.8, g); r.sc[key] = saturador(k, lp); }
    return r.sc[key]; }
  function cadenaLofi(x){ const r = x.r; if(!r.sc.lofi){ const l = F('lowpass', 2300, 0.7, r.cap.base); l._gt = r.cap.base._gt; r.sc.lofi = l; } return r.sc.lofi; }
  /* bajo darksynth: dos sierras abiertas y un cuadrado abajo, pasabajos resonante con golpe; la saturación va en la cadena */
  function bajoD(dest, t, m, dur, v, o){ o = o || {};
    const f = mtof(m), fin = t + Math.max(dur, 0.04), stop = fin + 0.12, g = C.createGain(), lp = F('lowpass', 300, o.q || 5);
    const a = oscM('sawtooth', f, t, stop, -8), b = oscM('sawtooth', f, t, stop, 8), c = oscM('square', f*0.5, t, stop, 0), gc = G(0.45);
    a.connect(lp); b.connect(lp); c.connect(gc); gc.connect(lp); lp.connect(g); g.connect(dest);
    const abre = o.abre !== undefined ? o.abre : lerp(0.42, 1.4, kAhora), pico = lim((o.f || 1600)*abre, 150, 12000);
    lp.frequency.setValueAtTime(pico, t); lp.frequency.setTargetAtTime(Math.max(110, f*1.7), t + 0.004, o.cae || 0.06);
    adsr(g.gain, t, 0.003, 0.2, 0.75, fin, 0.04, v*0.6*(o.abre !== undefined ? 1 : lerp(0.55, 1, kAhora)));   /* con poca intensidad, más atrás */
  }
  function bajoS(dest, t, m, dur, v){
    const f = mtof(m), fin = t + Math.max(dur, 0.04), stop = fin + 0.15, g = C.createGain(), lp = F('lowpass', 650, 0.9);
    oscM('triangle', f, t, stop, 0).connect(lp); oscM('sine', f, t, stop, 0).connect(G(0.8, lp)); lp.connect(g); g.connect(dest);
    adsr(g.gain, t, 0.006, 0.25, 0.6, fin, 0.08, v*0.5);
  }
  /* bombo pesado: seno que cae de 250 a 50 Hz, parche de ruido y click; duro: pasado por el saturador */
  function bomboD(dest, t, v, o){ o = o || {};
    const f0 = o.f || 50, larga = o.larga || 0.42, g = C.createGain(), s = oscF('sine', f0*5, t, t + larga*1.6 + 0.05);
    s.frequency.exponentialRampToValueAtTime(f0*1.5, t + 0.028); s.frequency.exponentialRampToValueAtTime(f0, t + 0.11);
    env(g.gain, t, 0.0015, v*0.95, larga);
    if(o.duro) s.connect(saturador(2.2, g)); else s.connect(g);
    g.connect(dest);
    RZ({t, d:0.006, v:v*0.4, f:3800, tipo:'highpass', q:0.6, dest}); RZ({t, d:0.035, v:v*0.3, f:260, tipo:'lowpass', q:0.8, col:'rosa', dest});
  }
  /* caja de los 80: parche, bordonero y la compuerta que se corta seca */
  function cajaG(dest, t, v, o){ o = o || {};
    const out = G(1, dest), gs = o.gate === undefined ? 0.9 : o.gate; if(dest._gt && gs > 0) out.connect(G(gs, dest._gt));
    RZ({t, d:0.16, v:v*0.55, f:2000, q:0.6, dest:out}); RZ({t, d:0.09, v:v*0.3, f:6000, tipo:'highpass', q:0.5, dest:out});
    TN({t, f:250, f2:180, fd:0.05, d:0.09, v:v*0.45, tipo:'triangle', dest:out}); TN({t, f:340, f2:300, d:0.05, v:v*0.15, dest:out});
  }
  function palmas(dest, t, v){ const out = G(1, dest); if(dest._gt) out.connect(G(0.7, dest._gt));
    for(let i = 0; i < 3; i++) RZ({t:t + i*0.011, d:i < 2 ? 0.02 : 0.14, v:v*0.35, f:1250, q:1.2, dest:out}); }
  function hat(dest, t, v, abierto){ RZ({t, d:abierto ? 0.26 : 0.038, v:v*0.19, f:7600, tipo:'highpass', q:0.6, dest}); RZ({t, d:abierto ? 0.18 : 0.025, v:v*0.07, f:10500, q:2, dest}); }
  function metal(dest, t, v, f){ f = f || 520;
    const g = C.createGain(), bp = F('bandpass', f*2.3, 7), fin = env(g.gain, t, 0.001, v*0.5, 0.24);
    for(const r of [1, 1.483, 2.17]) oscF('square', f*r, t, fin).connect(bp);
    bp.connect(g); g.connect(dest);
    RZ({t, d:0.03, v:v*0.18, f:4200, q:1, dest});
  }
  function tom(dest, t, v, f){ TN({t, f:f*1.7, f2:f, fd:0.09, d:0.36, v:v*0.6, dest}); RZ({t, d:0.05, v:v*0.12, f:1100, tipo:'lowpass', dest}); }
  function platillo(dest, t, v){ RZ({t, d:1.9, v:v*0.13, f:5200, tipo:'highpass', q:0.4, dest}); RZ({t, d:1.2, v:v*0.06, f:8200, q:3, dest}); }
  /* güiro: ruido que se raspa, con las estrías de una sierra en el volumen */
  function guiro(dest, t, v, largo){
    const d = Math.max(0.03, largo || 0.06), fin = t + d, g = C.createGain(), am = G(0.5), bp = F('bandpass', 3800, 1.4), hp = F('highpass', 1800, 0.7);
    const s = fuente('blanco', t, fin + 0.06), l = oscF('sawtooth', d > 0.1 ? 34 : 52, t, fin + 0.06); l.connect(G(0.5, am.gain));
    s.connect(bp); bp.connect(hp); hp.connect(am); am.connect(g); g.connect(dest);
    adsr(g.gain, t, 0.006, 0.1, 0.9, fin, 0.02, v*0.34);
  }
  function cencerro(dest, t, v){ const g = C.createGain(), bp = F('bandpass', 900, 2.5, g); for(const f of [540, 800]) oscF('square', f*0.85, t, t + 0.4).connect(bp);
    g.connect(dest); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*0.22, t + 0.002); g.gain.setTargetAtTime(v*0.06, t + 0.002, 0.012); g.gain.setTargetAtTime(0, t + 0.03, 0.07); }
  /* colchón desafinado: dos sierras por nota, abiertas en direcciones contrarias y con una deriva lenta */
  function padD(dest, t, notas, dur, v, o){ o = o || {};
    const a = o.a || 0.5, rel = o.rel || 0.9, fin = t + dur, stop = fin + rel*1.7, fc = o.f || 1100, det = o.det || 15;
    const lp = F('lowpass', fc*0.5, 0.9), g = C.createGain(), der = oscF('sine', rv(0.08, 0.2), t, stop), dg = G(det*0.5); der.connect(dg);
    lp.frequency.setValueAtTime(fc*0.5, t); lp.frequency.linearRampToValueAtTime(fc, t + Math.max(a, dur*0.5));
    for(const m of notas){ const f = mtof(m); for(const d of [-det, det*0.8]){ const q = oscM('sawtooth', f, t, stop, d + rv(-3, 3)); q.connect(lp); dg.connect(q.detune); } }
    lp.connect(g);
    adsr(g.gain, t, a, 1, 0.85, fin, rel, v*0.1/Math.sqrt(notas.length));
    if(o.bombeo){ const b = G(1, dest); g.connect(b);                                   /* que respire con el bombo */
      for(let q = t; q < fin; q += o.bombeo){ b.gain.setValueAtTime(1, q); b.gain.linearRampToValueAtTime(0.22, q + 0.012); b.gain.linearRampToValueAtTime(1, q + o.bombeo*0.7); } }
    else g.connect(dest);
  }
  function pluck(dest, t, m, dur, v, o){ o = o || {};
    const f = mtof(m), g = C.createGain(), lp = F('lowpass', 3200, 3), fin = t + Math.max(dur, 0.03), stop = fin + 0.2;
    lp.frequency.setValueAtTime(o.f || 3400, t); lp.frequency.setTargetAtTime(500, t, 0.05);
    oscM('pulso', f, t, stop, 0).connect(lp); oscM('sawtooth', f, t, stop, 8).connect(lp);
    lp.connect(g); g.connect(dest); env(g.gain, t, 0.003, v*0.11, Math.min(dur + 0.08, 0.35));
    if(o.eco) g.connect(G(o.eco, N.eco));
  }
  /* el sinte chillón: sierras abiertas, un pulso una octava arriba, realce en 2,4 kHz y vibrato que entra tarde */
  function leadD(dest, t, m, dur, v, o){ o = o || {};
    const f = mtof(m), g = C.createGain(), fc = o.f || 3800, lp = F('lowpass', fc, 2.2), pk = F('peaking', 2400, 1.2), fin = t + Math.max(dur, 0.05), stop = fin + 0.3;
    pk.gain.value = 5;
    lp.frequency.setValueAtTime(fc*1.7, t); lp.frequency.setTargetAtTime(fc, t, 0.08);
    const a = oscM(o.cuad ? 'square' : 'sawtooth', f, t, stop, -10), b = oscM('sawtooth', f, t, stop, 10), c = oscM('pulso', f*2, t, stop, 3), gc = G(0.22);
    a.connect(lp); b.connect(lp); c.connect(gc); gc.connect(lp); lp.connect(pk); pk.connect(g); g.connect(dest);
    if(dur > 0.22){ const l = oscF('sine', 5.8, t, stop), lg = G(0); lg.gain.setValueAtTime(0, t + 0.12); lg.gain.linearRampToValueAtTime(18, t + 0.45);
      l.connect(lg); lg.connect(a.detune); lg.connect(b.detune); }
    g.connect(G(o.eco === undefined ? 0.36 : o.eco, N.eco));
    adsr(g.gain, t, 0.01, 0.25, 0.78, fin, 0.16, v*0.085);
  }
  /* acordeón muy procesado: tres lengüetas en musette, temblor de fuelle, saturado y recortado de graves */
  function acordeon(dest, t, m, dur, v, o){ o = o || {};
    const f = mtof(m), fin = t + Math.max(dur, 0.05), stop = fin + 0.25;
    const g = C.createGain(), trem = G(0.75), lp = F('lowpass', 2600, 0.8), fo = F('peaking', 1200, 1.4), hp = F('highpass', 260, 0.7);
    fo.gain.value = 7;
    for(const d of [-15, 0, 14]) oscM('cana', f, t, stop, d).connect(lp);
    lp.connect(fo); fo.connect(saturador(2.4, hp)); hp.connect(trem); trem.connect(g); g.connect(dest);
    const l = oscF('sine', 5.6, t, stop); l.connect(G(0.25, trem.gain));
    g.connect(G(o.eco === undefined ? 0.3 : o.eco, N.eco));
    adsr(g.gain, t, 0.03, 0.3, 0.8, fin, 0.1, v*0.11);
  }
  /* piano eléctrico por FM: la campanita al principio y el cuerpo que se apaga */
  function rhodes(dest, t, m, dur, v){
    const f = mtof(m), fin = t + Math.max(dur, 0.05), larga = lerp(2.6, 0.9, lim((m - 48)/40, 0, 1)), stop = Math.min(fin + 0.45, t + larga*1.8);
    const g = C.createGain(), c = oscM('sine', f, t, stop, 0), md = oscM('sine', f, t, stop, 0), mg = C.createGain();
    mg.gain.setValueAtTime(f*1.6, t); mg.gain.setTargetAtTime(f*0.22, t, 0.12); md.connect(mg); mg.connect(c.frequency);
    c.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*0.16, t + 0.004); g.gain.setTargetAtTime(0, t + 0.004, larga/4.5); g.gain.setTargetAtTime(0, fin, 0.07);
    const gt = G(0, dest), ti = oscM('sine', f*4.01, t, t + 0.3, 0); ti.connect(gt); env(gt.gain, t, 0.002, v*0.03, 0.12);
  }
  function rhodesAc(dest, t, notas, dur, v){ const k = 1/Math.sqrt(notas.length); notas.forEach((m, i) => rhodes(dest, t + i*0.008, m, dur, v*k)); }
  function stabD(dest, t, notas, dur, v){
    const g = C.createGain(), lp = F('lowpass', 5000, 1.5), fin = t + Math.max(dur, 0.04), stop = fin + 0.15;
    lp.frequency.setValueAtTime(5200, t); lp.frequency.setTargetAtTime(700, t, 0.06);
    for(const m of notas){ oscM('sawtooth', mtof(m), t, stop, -9).connect(lp); oscM('sawtooth', mtof(m), t, stop, 9).connect(lp); }
    lp.connect(g); g.connect(dest); adsr(g.gain, t, 0.003, 0.08, 0.5, fin, 0.06, v*0.12/Math.sqrt(notas.length));
    g.connect(G(0.2, N.eco));
  }
  /* coro sintetizado: sierras por un banco de formantes, con vibrato compartido */
  function coro(dest, t, notas, dur, v, vocal){
    const fin = t + dur, stop = fin + 1.6, g = C.createGain(), mix = G(1);
    const FO = vocal === 'o' ? [[450, 1], [800, 0.55], [2830, 0.12]] : [[730, 1], [1090, 0.5], [2440, 0.18]];
    for(const [fr, a] of FO){ const bp = F('bandpass', fr, 7); mix.connect(bp); bp.connect(G(a*5, g)); }
    const lfo = oscF('sine', 4.9, t, stop), lg = G(13); lfo.connect(lg);
    for(const m of notas) for(const d of [-11, 0, 12]){ const o = oscM('sawtooth', mtof(m), t, stop, d); o.connect(mix); lg.connect(o.detune); }
    g.connect(dest); adsr(g.gain, t, 0.4, 1, 0.9, fin, 1, v*0.05/Math.sqrt(notas.length));
  }
  function subida(dest, t, dur, v){ const g = C.createGain(), bp = F('bandpass', 300, 1.2), s = fuente('blanco', t, t + dur + 0.1);
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*0.12, t + dur*0.97); g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    s.connect(bp); bp.connect(g); g.connect(dest); }
  function latido(dest, t, v){ TN({t, f:62, f2:38, fd:0.07, d:0.16, v:v*0.9, lp:170, dest}); TN({t:t + 0.2, f:55, f2:36, fd:0.07, d:0.2, v:v*0.65, lp:150, dest}); }
  /* la lluvia en la ventana, un compás por vez con fundido contra el siguiente */
  function lluvia(dest, t, dur, v){
    const g = C.createGain(), hp = F('highpass', 2200, 0.5), bp = F('bandpass', 900, 0.6), s1 = fuente('blanco', t, t + dur + 0.7), s2 = fuente('rosa', t, t + dur + 0.7);
    s1.connect(hp); s2.connect(bp); hp.connect(G(0.35, g)); bp.connect(G(0.6, g)); g.connect(dest);
    adsr(g.gain, t, 0.45, 1, 1, t + dur, 0.45, v*0.1);
    for(let i = 0; i < 5; i++) TN({t:t + Math.random()*dur, f:rv(2200, 4500), f2:rv(1200, 1800), fd:0.03, d:0.05, v:rv(0.01, 0.03)*v, dest});   /* gotas en el vidrio */
  }
  function heladera(dest, t, dur, v){ const g = C.createGain(), lp = F('lowpass', 150, 1, g); oscF('sawtooth', 50, t, t + dur + 0.7).connect(lp);
    oscF('sine', 100, t, t + dur + 0.7).connect(G(0.5, g)); g.connect(dest); adsr(g.gain, t, 0.4, 1, 1, t + dur, 0.4, v*0.02); }

  /* ------------------------------------------------------------ notación */
  const NT = {C:0, D:2, E:4, F:5, G:7, A:9, B:11};
  function nota(s){ const m = /^([A-G])([#b]?)(-?\d)$/.exec(s); return 12*(+m[3] + 1) + NT[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); }
  /* 'A4.6 D5.2 -.4': nota y largo en semicorcheas; queda indexado por compás */
  function melodia(txt){ const por = []; let p = 0;
    for(const tk of txt.trim().split(/\s+/)){ const [n, d] = tk.split('.'), dur = +d;
      if(n !== '-'){ const b = Math.floor(p/16); (por[b] = por[b] || []).push([p % 16, nota(n), dur]); } p += dur; }
    por.largo = Math.ceil(p/16); por.pasos = p; return por; }
  const TIPOS = {'':[0, 4, 7], m:[0, 3, 7], '7':[0, 4, 7, 10], m7:[0, 3, 7, 10], maj7:[0, 4, 7, 11], dim:[0, 3, 6, 9], m6:[0, 3, 7, 9],
    '5':[0, 7, 12], sus:[0, 5, 7], m7b5:[0, 3, 6, 10]};
  function acorde(s){ const m = /^([A-G])([#b]?)(.*)$/.exec(s), r = NT[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return {r:(r + 12) % 12, iv:TIPOS[m[3]] || TIPOS['']}; }
  const raiz = (ac, oct) => 12*(oct + 1) + ac.r;
  /* las notas del acorde alrededor de un centro, de abajo para arriba */
  function voces(ac, centro){ return ac.iv.map(i => { let n = ac.r + i; while(n < centro - 6) n += 12; while(n >= centro + 6) n -= 12; return n; }).sort((a, b) => a - b); }
  /* la frase A y su respuesta B: 8 compases cada una */
  const melDe = (x, T) => T.M2 && x.v % 2 === 1 ? T.M2 : T.M;
  function tocarMel(x, mel, fn){
    if(!mel) return; const evs = mel[x.cb % mel.largo]; if(!evs) return;
    for(const e of evs) if(e[0] === x.s){ const dur = e[2]*x.sp;
      if(x.v % 4 === 2 && e[2] >= 4 && x.r.rnd() < 0.4){ fn(x.t, e[1] - 1, x.sp*0.45, 0.75); fn(x.t + x.sp*0.45, e[1], dur - x.sp*0.45, 1); }  /* apoyatura cromática de abajo */
      else fn(x.t, e[1], dur, 1); }
  }

  /* ------------------------------------------------------------ los temas */
  const TEMAS = {
    /* la menor, 96: un arpegio de seis que gira contra el compás de cuatro; el sinte chillón entra cada 8 compases */
    menu:{bpm:96, vol:1.25, intro:2, cinta:0.12,
      prog:'Am F C G Am F Dm E',
      mel:'E5.8 A5.4 C6.4 C6.6 A5.2 F5.8 G5.8 E5.4 G5.4 D6.12 B5.4 C6.6 B5.2 A5.8 A5.4 C6.4 F6.8 E6.6 D6.2 A5.8 G#5.16',
      toca(x){ const {s, t, ac, sp} = x, B = x.r.cap.base, r0 = raiz(ac, 1);
        if(s === 0){ padD(B, t, voces(ac, 57), sp*16, 0.8, {f:1300, a:1.1, rel:1.5}); bajoD(sucio(x, 'base', 2), t, r0, sp*15.5, 0.55, {abre:0.4, cae:0.5, f:700}); }
        const vs = voces(ac, 69), arp = [vs[0], vs[1], vs[2], vs[0] + 12, vs[2], vs[1]];
        pluck(B, t, arp[(x.c*16 + s) % 6] + (x.v % 2 && s >= 8 ? 12 : 0), sp*1.3, s % 4 === 0 ? 0.55 : 0.38, {eco:0.32, f:2800});
        if(x.intro) return;
        if(s === 0 || s === 8 || (s === 10 && x.c % 2)) bomboD(B, t, 0.62, {larga:0.5});
        if(s === 8) cajaG(B, t, 0.36);
        if(s % 4 === 2) hat(B, t, 0.16);
        if(x.cb === 7 && s === 0) subida(B, t, sp*16, 0.25);
        if(x.v % 2 === 1) tocarMel(x, this.M, (tt, m, d, k) => leadD(B, tt, m, d*0.95, 0.72*k, {eco:0.5, f:4200}));
      }},
    /* el contestador, 72: lo-fi con cinta gastada, lluvia en la ventana y la heladera que zumba */
    departamento:{bpm:72, vol:0.95, intro:1, cinta:0.5,
      prog:'Dm7 G7 Cmaj7 Am7 Dm7 E7 Am7 Am7',
      mel:'A5.6 C6.2 A5.4 F5.4 G5.8 -.8 E5.4 G5.4 B5.6 A5.2 G5.4 E5.12 F5.4 A5.4 C6.4 D6.4 B5.8 G#5.8 A5.16 -.16',
      toca(x){ const {s, t, ac, sp} = x, B = x.r.cap.base, r0 = raiz(ac, 1);
        if(s === 0){ lluvia(B, t, sp*16, 0.6); heladera(B, t, sp*16, 1); rhodesAc(B, t, voces(ac, 62), sp*7, 0.6); bajoS(B, t, r0, sp*6, 0.36); }
        if(s === 10){ rhodesAc(B, t, voces(ac, 64).slice(0, 3), sp*5, 0.34); bajoS(B, t, r0 + ac.iv[2], sp*4, 0.28); }
        if(x.r.rnd() < 0.3) RZ({t:t + x.r.rnd()*sp, d:0.004, v:0.03 + 0.05*x.r.rnd(), f:rv(2500, 7000), q:3, dest:B});   /* el polvo del disco */
        if(x.intro) return;
        const lf = cadenaLofi(x), sw = s % 4 === 2 ? sp*0.2 : 0;
        if(s === 0 || s === 7 || (s === 10 && x.c % 2)) bomboD(lf, t, 0.5, {f:55, larga:0.3});
        if(s === 8) cajaG(lf, t, 0.3, {gate:0.3});
        if(s % 2 === 0) hat(lf, t + sw, s % 4 ? 0.1 : 0.16);
        if(x.v % 2 === 1) tocarMel(x, this.M, (tt, m, d, k) => rhodes(B, tt, m, d, 0.42*k));
      }},
    /* outrun, 110, fa menor: bajo en corcheas que salta de octava, caja enorme en 2 y 4, colchón que respira */
    auto:{bpm:110, vol:1.05, intro:2, kMin:0.62, capas:{perc:0.2, lead:0.5, extra:0.85},
      prog:'Fm Db Ab Eb Fm Db Bbm C',
      mel:'C5.4 F5.4 Ab5.4 G5.2 F5.2 F5.6 Ab5.2 Db6.8 C6.6 Bb5.2 Ab5.4 Eb5.4 G5.12 Bb5.4 C6.4 Ab5.4 F5.4 Ab5.4 Db6.6 C6.2 Ab5.8 Bb5.4 Db6.4 F6.4 Db6.4 E6.12 G5.4',
      mel2:'F6.6 Eb6.2 C6.8 Db6.6 C6.2 Ab5.8 Eb6.6 Db6.2 C6.4 Ab5.4 Bb5.8 G5.8 Ab5.4 C6.4 F6.4 G6.4 Ab6.8 G6.4 F6.4 F6.4 Db6.4 Bb5.4 Db6.4 C6.8 E6.4 G6.4',
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 1);
        if(s % 4 === 0) bomboD(D.base, t, 0.8);
        if(s === 4 || s === 12) cajaG(D.base, t, 0.6, {gate:1.1});
        if(s % 2 === 0) bajoD(sucio(x, 'base', 2.2), t, r0 + (s % 4 === 2 ? 12 : 0), sp*1.7, 0.62, {f:1500});
        if(s === 0) padD(D.base, t, voces(ac, 60), sp*16, 0.8, {f:1800, a:0.3, bombeo:sp*4});
        { const vs = voces(ac, 72), i = [0, 1, 2, 1][s % 4]; pluck(D.base, t, vs[i % vs.length] + ((s >> 2) % 2 ? 12 : 0), sp*0.9, 0.32, {eco:0.3}); }
        if(x.on('perc')){ hat(D.perc, t, s % 4 === 2 ? 0.42 : 0.2, s % 4 === 2); if(s === 0 && x.cb % 4 === 0) platillo(D.perc, t, 0.6);
          if(x.cb === 7 && s >= 12) tom(D.perc, t, 0.5, [140, 115, 95, 80][s - 12]); }
        if(!x.intro && x.on('lead')) tocarMel(x, melDe(x, this), (tt, m, d, k) => leadD(D.lead, tt, m, d*0.93, 0.8*k));
        if(x.on('extra')){ if(s % 2 === 1){ const vs = voces(ac, 84); pluck(D.extra, t, vs[(s >> 1) % vs.length], sp*0.7, 0.3, {eco:0.4}); }
          if(x.cb === 7 && s === 0) subida(D.extra, t, sp*16, 0.5); }
      }},
    /* primer edificio, 124, mi menor: agresivo, bajo saturado en semicorcheas, bombo en negras */
    nivel1:{bpm:124, vol:1, intro:2, capas:{perc:0.25, lead:0.5, extra:0.78},
      prog:'Em C D B Em C Am B',
      mel:'E5.3 G5.3 B5.2 A5.2 G5.2 F#5.2 G5.2 E5.3 G5.3 C6.4 B5.2 G5.4 F#5.3 A5.3 D6.4 C6.2 A5.2 F#5.2 D#6.6 B5.2 F#5.4 A5.4 E6.3 D6.3 B5.2 G5.4 A5.2 B5.2 C6.3 B5.3 G5.2 E5.4 G5.4 A5.3 C6.3 E6.2 D6.4 C6.4 B5.8 D#6.4 F#6.4',
      mel2:'B5.2 B5.2 E6.4 D6.2 B5.2 G5.4 C6.2 C6.2 E6.4 G6.4 E6.4 D6.2 D6.2 F#6.4 A6.4 F#6.2 D6.2 D#6.8 C6.4 B5.4 G6.4 F#6.4 E6.4 B5.4 C6.4 E6.4 G6.6 E6.2 A6.4 G6.4 F#6.4 E6.4 D#6.12 B5.4',
      riff:[0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 0, 12, 0, 0, 7, 12],
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 1), rf = this.riff[s];
        if(s % 4 === 0) bomboD(D.base, t, s === 0 ? 0.95 : 0.85, {duro:1});
        if(s === 4 || s === 12) cajaG(D.base, t, 0.62);
        if(s % 2 === 0) hat(D.base, t, 0.22);
        bajoD(sucio(x, 'base', 3.2), t, r0 + rf, sp*0.85, rf ? 0.55 : 0.72, {f:1700});
        if(s === 0) padD(D.base, t, voces(ac, 59), sp*16, 0.62, {f:1400, a:0.2, bombeo:sp*4});
        if(s % 2 === 0){ const vs = voces(ac, 71), i = [0, 2, 1, 2, 0, 2, 1, 3][s/2]; pluck(D.base, t, vs[i % vs.length] + (x.v % 2 ? 12 : 0), sp*1.1, 0.34, {eco:0.28}); }
        if(x.on('perc')){ if(s % 2) hat(D.perc, t, 0.2); if(s % 4 === 2) hat(D.perc, t, 0.3, true); if(s === 12) palmas(D.perc, t, 0.5);
          if(s === 0 && x.cb % 4 === 0) platillo(D.perc, t, 0.7);
          if(x.cb === 7 && s >= 8 && s % 2 === 0) cajaG(D.perc, t, 0.25 + (s - 8)*0.05);
          if(x.cb === 7 && s === 0) subida(D.perc, t, sp*16, 0.35); }
        if(!x.intro && x.on('lead')) tocarMel(x, melDe(x, this), (tt, m, d, k) => leadD(D.lead, tt, m, d*0.92, 0.85*k));
        if(x.on('extra')){ if(s % 2 === 0) bajoD(sucio(x, 'extra', 4), t, r0 + 12 + (s % 8 === 6 ? 7 : 0), sp*0.8, 0.4, {f:2600});
          if(s === 0 || s === 6 || s === 12) stabD(D.extra, t, voces(ac, 64), sp*1.2, 0.4); }
      }},
    /* la bailanta, 128, re menor: cumbia pasada por darksynth. Güiro largo-corto-corto, bajo de tónica y quinta,
       teclado a contratiempo, y el acordeón muy procesado que contesta con el sinte */
    nivel2:{bpm:128, vol:1, intro:2, capas:{perc:0.22, lead:0.48, extra:0.78},
      prog:'Dm Bb Gm A Dm Bb C A',
      mel:'A5.2 A5.2 F5.2 A5.2 D6.4 C6.2 A5.2 Bb5.2 A5.2 G5.2 F5.2 D5.8 G5.2 Bb5.2 D6.2 Bb5.2 G5.4 F5.2 G5.2 A5.4 C#6.4 E6.4 C#6.4 F6.2 E6.2 D6.2 A5.2 F5.4 A5.4 D6.2 C6.2 Bb5.2 F5.2 D5.4 F5.4 E5.2 G5.2 C6.2 E6.2 G6.4 E6.4 C#6.8 A5.4 E5.4',
      mel2:'D6.4 F6.4 A6.4 F6.4 G6.4 F6.4 D6.8 Bb5.4 D6.4 G6.4 D6.4 E6.6 C#6.2 A5.8 A6.3 G6.3 F6.2 E6.4 D6.4 F6.3 D6.3 Bb5.2 D6.8 E6.3 G6.3 C6.2 E6.8 C#6.4 E6.4 A6.8',
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 1), q = s % 4, sb = sucio(x, 'base', 2.6);
        if(s === 0 || s === 8) bomboD(D.base, t, 0.88, {duro:1});
        if(s === 4 || s === 12) cajaG(D.base, t, 0.5, {gate:0.8});
        if(q === 0) guiro(D.base, t, 0.6, sp*1.6); else if(q >= 2) guiro(D.base, t, 0.42, sp*0.45);
        if(s === 0) bajoD(sb, t, r0, sp*3, 0.72, {f:1400}); if(s === 6) bajoD(sb, t, r0, sp*1.5, 0.5, {f:1200});
        if(s === 8) bajoD(sb, t, r0 + 7, sp*3, 0.66, {f:1400}); if(s === 14) bajoD(sb, t, r0 + 12, sp*1.5, 0.5, {f:1600});
        if(q === 2) stabD(D.base, t, voces(ac, 64), sp*1.1, 0.34);
        if(s === 0) padD(D.base, t, voces(ac, 57), sp*16, 0.5, {f:900, a:0.3, bombeo:sp*8});
        if(x.on('perc')){ if(q === 2) cencerro(D.perc, t, 0.4); if(s % 2) hat(D.perc, t, 0.18);
          if(x.cb % 2 === 1 && s >= 12) tom(D.perc, t, 0.45, [220, 190, 160, 130][s - 12]);                   /* los timbales */
          if(s === 0 && x.cb % 4 === 0) platillo(D.perc, t, 0.55); }
        if(!x.intro && x.on('lead')){ if(x.v % 2 === 0) tocarMel(x, this.M, (tt, m, d, k) => acordeon(D.lead, tt, m, d*0.9, 0.8*k, {eco:0.3}));
          else tocarMel(x, this.M2, (tt, m, d, k) => leadD(D.lead, tt, m, d*0.9, 0.8*k)); }
        if(x.on('extra')){ if(!x.intro && x.v % 2 === 1) tocarMel(x, this.M, (tt, m, d, k) => acordeon(D.extra, tt, m - 12, d*0.9, 0.5*k, {eco:0.2}));
          if(s === 0) coro(D.extra, t, voces(ac, 62), sp*16, 0.6, 'o'); if(s === 14) bajoD(sucio(x, 'extra', 4), t, r0 + 24, sp*1.5, 0.35, {f:2600}); }
      }},
    /* el depósito, 132, do menor frigio: industrial, yunques, prensa y bajo muy saturado */
    nivel3:{bpm:132, vol:0.95, intro:2, capas:{perc:0.25, lead:0.5, extra:0.78},
      prog:'Cm Cm Db Cm Cm Ab Bb Db',
      mel:'C5.2 C5.2 Eb5.2 C5.2 G5.4 F#5.2 G5.2 C6.4 Bb5.2 G5.2 Eb5.8 Db5.2 Db5.2 F5.2 Db5.2 Ab5.4 G5.2 Ab5.2 G5.12 -.4 Eb6.4 D6.2 C6.2 G5.4 Eb5.4 Ab5.4 C6.4 Eb6.4 C6.4 D6.4 F6.4 Bb5.8 Db6.8 C6.4 B5.4',
      mel2:'G6.2 G6.2 G6.2 F6.2 Eb6.4 D6.4 C6.8 G5.8 Ab6.2 Ab6.2 Ab6.2 G6.2 F6.4 Db6.4 C6.12 B5.4 C6.2 Eb6.2 G6.4 F6.2 Eb6.2 D6.4 C6.4 Eb6.4 Ab6.8 Bb6.4 A6.4 F6.8 Ab6.4 F6.4 Db6.4 C6.4',
      riff:[0, 0, 0, 12, 0, 0, 1, 0, 0, 0, 12, 0, 3, 0, 1, 0],
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 1), rf = this.riff[s];
        if(s % 4 === 0 || s === 14) bomboD(D.base, t, 0.95, {duro:1, f:44});
        if(s === 4 || s === 12){ cajaG(D.base, t, 0.55, {gate:0.9}); RZ({t, d:0.12, v:0.5, f:900, q:0.8, col:'rosa', dest:sucio(x, 'base', 6)}); }
        if(s % 4 === 2) metal(D.base, t, 0.34, [470, 520, 610, 430][(x.c + (s >> 2)) % 4]);
        bajoD(sucio(x, 'base', 4.5), t, r0 + rf, sp*0.8, rf ? 0.5 : 0.7, {f:1300, q:8});
        if(s === 0 && x.c % 2 === 0) padD(D.base, t, [raiz(ac, 2), raiz(ac, 2) + 7], sp*32, 0.6, {f:520, a:0.5, det:22});
        if(s === 0 && x.c % 2 === 0){ TN({t, f:70, f2:38, d:0.5, v:0.4, dest:D.base}); RZ({t, d:0.25, v:0.2, f:500, tipo:'lowpass', col:'pardo', dest:D.base}); metal(D.base, t + 0.01, 0.3, 190); }   /* la prensa */
        if(x.on('perc')){ if(s % 2 === 1) metal(D.perc, t, 0.14, 1400 + 400*x.r.rnd()); hat(D.perc, t, s % 2 ? 0.14 : 0.26);
          if(x.cb % 4 === 3 && s >= 12) tom(D.perc, t, 0.55, [90, 80, 70, 60][s - 12]); if(s === 0 && x.cb % 4 === 0) platillo(D.perc, t, 0.7);
          if(x.cb === 7 && s === 0) subida(D.perc, t, sp*16, 0.4); }
        if(!x.intro && x.on('lead')) tocarMel(x, melDe(x, this), (tt, m, d, k) => leadD(D.lead, tt, m, d*0.9, 0.8*k, {cuad:1, f:3400}));
        if(x.on('extra')){ if(s === 0) coro(D.extra, t, voces(ac, 55), sp*16, 0.7, 'o');
          if(s % 2 === 0) bajoD(sucio(x, 'extra', 5), t, r0 + 24, sp*0.6, 0.3, {f:3000}); if(s === 8 && x.cb % 2) metal(D.extra, t, 0.3, 260); }
      }},
    /* el jefe, 140, si menor: el más intenso. Doble bombo, coros, acordeón de contracanto y el sinte arriba */
    nivel4:{bpm:140, vol:0.92, intro:2, capas:{perc:0.2, lead:0.42, extra:0.72},
      prog:'Bm G Em F# Bm G C F#',
      mel:'F#5.3 F#5.3 F#5.2 B5.4 D6.4 D6.6 C#6.2 B5.4 G5.4 E5.3 G5.3 B5.2 E6.4 D6.4 C#6.8 A#5.4 F#5.4 B5.3 D6.3 F#6.2 E6.4 D6.4 G6.6 F#6.2 D6.4 B5.4 C6.3 E6.3 G6.2 E6.4 C6.4 A#5.8 C#6.4 F#6.4',
      mel2:'B6.4 A6.4 F#6.4 D6.4 G6.4 F#6.4 D6.4 B5.4 E6.4 G6.4 B6.4 G6.4 F#6.12 E6.2 C#6.2 D6.3 F#6.3 B6.2 A6.4 F#6.4 G6.3 B6.3 D7.2 B6.8 C7.6 B6.2 G6.8 F#6.4 A#6.4 C#7.8',
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 1), fuerte = x.cb >= 4;
        if(s % 4 === 0 || (fuerte && s % 2 === 0) || s === 14 || s === 15) bomboD(D.base, t, s % 4 === 0 ? 0.95 : 0.7, {duro:1, f:46});
        if(s === 4 || s === 12) cajaG(D.base, t, 0.66, {gate:1.2});
        bajoD(sucio(x, 'base', 3.8), t, r0 + (s % 4 === 3 ? 12 : 0), sp*0.85, s % 4 === 0 ? 0.75 : 0.52, {f:2000});
        if(s === 0){ coro(D.base, t, voces(ac, 59), sp*16, 0.9); padD(D.base, t, voces(ac, 62), sp*16, 0.45, {f:2000, a:0.1, bombeo:sp*2}); }
        { const vs = voces(ac, 74), i = [0, 1, 2, 3, 2, 1, 0, 1][s % 8]; pluck(D.base, t, vs[i % vs.length] + (s >= 8 ? 12 : 0), sp*0.8, 0.32, {eco:0.25}); }
        if(x.on('perc')){ hat(D.perc, t, s % 2 ? 0.2 : 0.32, s % 4 === 2); if(s === 0 && x.cb % 2 === 0) platillo(D.perc, t, 0.75);
          if(s === 12) palmas(D.perc, t, 0.5); if(x.cb === 7 && s >= 8) tom(D.perc, t, 0.5, [150, 140, 125, 115, 100, 90, 80, 70][s - 8]); }
        if(!x.intro && x.on('lead')) tocarMel(x, melDe(x, this), (tt, m, d, k) => leadD(D.lead, tt, m, d*0.92, 0.85*k, {f:4600}));
        if(!x.intro && x.on('extra')){ tocarMel(x, this.M, (tt, m, d, k) => acordeon(D.extra, tt, m - 12, d*0.9, 0.55*k, {eco:0.25}));
          if(s === 0) coro(D.extra, t, [raiz(ac, 4) + 12, raiz(ac, 4) + 19], sp*16, 0.7, 'o');
          if(s === 0 || s === 6 || s === 12) stabD(D.extra, t, voces(ac, 66), sp*1.1, 0.4); }
      }},
    /* el piso quedó limpio: colchón tenso, un latido, nada de batería */
    limpio:{bpm:80, vol:1.35, intro:0, cinta:0.1, prog:'Em Em C C Em Em F F',
      toca(x){ const {s, t, ac, sp, c} = x, B = x.r.cap.base;
        if(s === 0 && c % 2 === 0){ padD(B, t, voces(ac, 55), sp*32, 0.85, {f:700, a:2, rel:2, det:20});
          bajoD(sucio(x, 'base', 2), t, raiz(ac, 1), sp*30, 0.4, {abre:0.3, cae:1.4, f:500}); }
        if(s % 4 === 0) latido(B, t, s ? 0.5 : 0.75);
        if(s === 0 && c % 4 === 2){ const g = G(0, B); adsr(g.gain, t, sp*10, 1, 1, t + sp*14, 1.2, 0.012);            /* segunda menor arriba, que bate */
          oscM('sine', mtof(88), t, t + sp*16 + 2, 0).connect(g); oscM('sine', mtof(89), t, t + sp*16 + 2, 0).connect(g); }
        if(s === 0 && c % 2 === 1) pluck(B, t, raiz(ac, 5) + 7, sp*2, 0.3, {eco:0.6, f:2200});
        if(s === 8 && c % 2 === 1) RZ({t, a:sp*7, d:0.08, v:0.05, f:1800, q:0.7, col:'rosa', dest:B});
      }},
    /* la nota final, 100: groove relajado, piano eléctrico y bajo sincopado */
    puntaje:{bpm:100, vol:1.1, intro:1, kMin:0.6, capas:{perc:0.2, lead:0.45, extra:0.9},
      prog:'Am7 Dm7 G Cmaj7 Fmaj7 Dm7 E7 E7',
      mel:'E5.4 G5.2 A5.2 -.4 C6.4 A5.6 F5.2 D5.8 B5.4 D6.2 B5.2 G5.8 E6.6 D6.2 B5.4 G5.4 A5.4 C6.2 E6.2 -.4 C6.4 D6.6 C6.2 A5.8 G#5.4 B5.4 D6.4 B5.4 G#5.12 -.4',
      BJ:{0:[0, 3], 3:[12, 1], 6:[7, 2], 8:[0, 2], 11:[12, 1], 12:[0, 2], 14:[7, 2]},
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 1), sw = s % 2 ? sp*0.16 : 0, b = this.BJ[s];
        if(s === 0 || s === 10 || (s === 7 && x.c % 2)) bomboD(D.base, t, 0.7, {larga:0.35});
        if(s === 4 || s === 12) cajaG(D.base, t, 0.44, {gate:0.7});
        if(s % 2 === 0) hat(D.base, t, s % 4 ? 0.14 : 0.2);
        if(b) bajoD(sucio(x, 'base', 1.6), t, r0 + b[0], sp*b[1]*0.9, 0.58, {f:900, abre:0.9, q:3});
        if(s === 0 || s === 6) rhodesAc(D.base, t, voces(ac, 64), sp*5, 0.45);
        if(s === 0) padD(D.base, t, voces(ac, 60), sp*16, 0.35, {f:1100, a:0.6});
        if(x.on('perc')){ if(s % 2) hat(D.perc, t + sw, 0.12); if(s % 4 === 2) RZ({t:t + sw, d:0.05, v:0.05, f:6000, tipo:'highpass', dest:D.perc}); }
        if(!x.intro && x.on('lead')) tocarMel(x, this.M, (tt, m, d, k) => leadD(D.lead, tt, m, d*0.9, 0.55*k, {f:2600, eco:0.4}));
      }},
    /* créditos, 80: triste y lindo, re menor que se abre a fa */
    fin:{bpm:80, vol:1.2, intro:2, cinta:0.2,
      prog:'Dm Bb F C Dm Bb Gm A',
      mel:'A5.6 F5.2 D5.4 F5.4 D6.8 C6.4 Bb5.4 A5.6 C6.2 F6.8 E6.6 D6.2 C6.4 G5.4 F5.6 A5.2 D6.4 E6.4 F6.8 D6.4 Bb5.4 G5.6 Bb5.2 D6.4 C6.4 C#6.8 E6.4 A5.4',
      mel2:'D6.6 E6.2 F6.4 A6.4 G6.6 F6.2 D6.8 C6.6 D6.2 F6.4 C6.4 E6.12 C6.4 D6.4 F6.4 A6.8 Bb6.6 A6.2 F6.4 D6.4 Bb5.4 D6.4 G6.4 F6.4 E6.8 C#6.4 A5.4',
      toca(x){ const {s, t, ac, sp} = x, B = x.r.cap.base, r0 = raiz(ac, 1);
        if(s === 0){ padD(B, t, voces(ac, 60), sp*16, 0.75, {f:1500, a:1, rel:1.6}); bajoD(sucio(x, 'base', 1.5), t, r0, sp*15, 0.45, {abre:0.4, cae:0.8, f:600}); }
        if(s % 2 === 0){ const vs = voces(ac, 67), i = [0, 1, 2, 1, 3, 2, 1, 2][s/2]; rhodes(B, t, vs[i % vs.length] + (i === 3 ? 12 : 0), sp*3, 0.3); }
        if(x.intro) return;
        if(x.v >= 1){ if(s === 0) bomboD(B, t, 0.5, {larga:0.6}); if(s === 8) cajaG(B, t, 0.42, {gate:1.3}); if(s % 4 === 2) hat(B, t, 0.1); }
        tocarMel(x, melDe(x, this), (tt, m, d, k) => leadD(B, tt, m, d*0.95, 0.62*k, {eco:0.55, f:3000}));
      }}
  };
  for(const k in TEMAS){ const T = TEMAS[k]; if(T.prog) T.A = T.prog.split(' ').map(acorde); if(T.mel) T.M = melodia(T.mel); if(T.mel2) T.M2 = melodia(T.mel2); }

  /* ------------------------------------------------------------ secuenciador */
  const REPS = [], CAPAS = ['perc', 'lead', 'extra'], CAPA0 = {perc:0.3, lead:0.55, extra:0.8};
  const objCapa = (T, n) => suv(lim((Math.max(inten, T.kMin || 0) - (T.capas || CAPA0)[n])/0.2, 0, 1));
  let semilla = 7;
  function nuevoRep(nom, entra){
    const T = TEMAS[nom], now = ya();
    const r = {nom, T, paso:0, t:now + 0.08, vivo:true, muere:0, cap:{}, cv:{}, gs:{}, sc:{}, oscs:[], rnd:mulberry(semilla++*977 + 13)};
    r.bus = G(0, N.mus); r.bus.gain.setValueAtTime(0.0001, now); r.bus.gain.linearRampToValueAtTime(T.vol || 1, now + entra);
    r.gconv = C.createConvolver(); r.gconv.buffer = IR_G; r.gconv.connect(r.bus);              /* la compuerta es del tema: se va con él */
    r.kb = T.capas ? lerp(0.7, 1, Math.max(inten, T.kMin || 0)) : 1; r.cap.base = G(r.kb, r.bus); r.gs.base = G(r.kb, r.gconv); r.cap.base._gt = r.gs.base;
    for(const n of CAPAS){ r.cv[n] = T.capas ? objCapa(T, n) : 0; r.cap[n] = G(r.cv[n], r.bus); r.gs[n] = G(r.cv[n], r.gconv); r.cap[n]._gt = r.gs[n]; }
    r.on = n => r.cv[n] > 0.004 || objCapa(T, n) > 0.004;
    N.ecoD.delayTime.setTargetAtTime(60/T.bpm*0.75, now, 0.1);
    return r;
  }
  function soltar(r, fund){ const now = ya(), p = r.bus.gain;
    p.cancelScheduledValues(now); p.setValueAtTime(Math.max(p.value, 0.0001), now); p.linearRampToValueAtTime(0.0001, now + fund);
    r.vivo = false; r.muere = Math.min(r.muere || Infinity, now + fund + 0.2); }
  const durPaso = r => 60/r.T.bpm/4*(1 + 0.42*kLento);
  function bombear(){
    const now = ya(), hasta = now + 0.12;
    for(const r of REPS){
      if(!r.vivo && now > r.muere - 0.2) continue;
      if(r.t < now - 0.06) r.t = now + 0.02;                  /* se trabó el cuadro: no se programa en el pasado */
      kAhora = Math.max(inten, r.T.kMin || 0);
      let n = 0;
      while(r.t < hasta && n++ < 16){
        const T = r.T, s = r.paso % 16, c = Math.floor(r.paso/16), intro = c < T.intro, cb = intro ? c % T.A.length : (c - T.intro) % T.A.length;
        const sp = durPaso(r), x = {r, s, c, cb, v:intro ? 0 : Math.floor((c - T.intro)/T.A.length), intro, ac:T.A[cb], t:r.t, sp, on:r.on};
        repAct = r; try { T.toca(x); } catch(e){ err(e); } repAct = null;
        r.t += sp; r.paso++;
      }
    }
  }
  function musica(tema){
    const pedido = tiene(TEMAS, tema) ? tema : null;
    temaPed = pedido; if(!listo) return;
    try {
      if(pedido === temaAct) return; temaAct = pedido;
      for(const r of REPS) if(r.vivo) soltar(r, 1.2);
      if(pedido) REPS.push(nuevoRep(pedido, 1.2));
      aplicarCinta();
    } catch(e){ err(e); }
  }

  /* ------------------------------------------------------------ efectos */
  const FXM = {
    pina:{max:4, vol:0.7, rev:0.12}, bate:{max:3, vol:0.7, rev:0.15}, cano:{max:3, vol:0.6, rev:0.25}, cuchillo:{max:3, vol:0.62, rev:0.1},
    katana:{max:3, vol:0.6, rev:0.2}, golpe:{max:4, vol:0.66, rev:0.08}, derribo:{max:3, vol:0.62, rev:0.15}, pistola:{max:4, vol:0.6, rev:0.34},
    escopeta:{max:3, vol:0.7, rev:0.36}, uzi:{max:6, vol:0.46, rev:0.22}, fusil:{max:2, vol:0.68, rev:0.45}, silenciada:{max:4, vol:0.55, rev:0.12},
    sin_balas:{max:2, vol:0.45}, casquillo:{max:6, vol:0.4, rev:0.1}, puerta:{max:2, vol:0.62, rev:0.3}, puerta_golpe:{max:2, vol:0.66, rev:0.3},
    vidrio:{max:2, vol:0.5, rev:0.3}, perro:{max:2, vol:0.55, rev:0.25}, perro_muere:{max:2, vol:0.5, rev:0.2}, alerta:{max:3, vol:0.5, rev:0.2},
    grito:{max:2, vol:0.5, rev:0.25}, muere:{max:3, vol:0.6, rev:0.18}, jugador_muere:{max:1, vol:0.8, rev:0.45}, rematar:{max:2, vol:0.7, rev:0.1},
    agarrar:{max:2, vol:0.5, rev:0.05}, tirar:{max:3, vol:1.1, rev:0.1}, rebote:{max:3, vol:0.36, rev:0.3}, combo:{max:2, vol:0.5, rev:0.2, ui:1},
    piso_limpio:{max:1, vol:0.7, rev:0.4, ui:1}, sello:{max:1, vol:0.8, rev:0.3, ui:1}, puntos:{max:3, vol:0.4, ui:1}, telefono:{max:1, vol:1.2, rev:0.2, ui:1},
    contestador:{max:1, vol:0.6, rev:0.1, ui:1}, auto:{max:1, vol:0.65, rev:0.15}, boton:{max:2, vol:0.45, ui:1}, clic:{max:3, vol:0.45, ui:1},
    atras:{max:2, vol:0.35, ui:1}, desliza_menu:{max:2, vol:0.6, ui:1}, mascara:{max:1, vol:0.6, rev:0.25, ui:1}, titulo:{max:1, vol:0.8, rev:0.5, ui:1},
    pagina:{max:2, vol:0.8, ui:1},
    bonk:{max:4, vol:0.6, rev:0.1}, boing:{max:3, vol:0.5, rev:0.1}, pop:{max:3, vol:0.55, rev:0.15}, estrellitas:{max:2, vol:1, rev:0.2}, noqueado:{max:2, vol:0.6, rev:0.15}
  };
  /* otros nombres que el juego pueda usar */
  const ALIAS = {'piña':['pina'], 'caño':['cano'], disparo:['pistola'], tiro:['pistola'], subfusil:['uzi'], rifle:['fusil'], escopetazo:['escopeta'],
    ladrido:['perro'], muerte:['muere'], remate:['rematar'], golpe_puerta:['puerta_golpe'], portazo:['puerta']};
  /* un tiro: chasquido, cuerpo, soplido y golpe grave. lejos: pasado por un pasabajos */
  function tiro(t, k, d, o){ const lp = o.lejos ? F('lowpass', 2400, 0.6, d) : d, v = o.v || 1;
    RZ({t, d:0.012, v:0.9*v, f:3600*k, tipo:'highpass', q:0.7, dest:lp});
    RZ({t, d:o.cuerpo || 0.09, v:0.85*v, f:1400*k, f2:480*k, q:0.9, dest:lp});
    RZ({t, d:o.cola || 0.32, v:0.32*v, f:1000*k, f2:180, tipo:'lowpass', col:'rosa', dest:lp});
    TN({t, f:175*k, f2:46*k, fd:0.08, d:o.grave || 0.13, v:0.95*v, dest:lp});
  }
  const FX = {
    /* ---- a las piñas */
    pina(t, o, d){ const k = o.tono*rv(0.93, 1.07); whoosh(t, 0.05, 700*k, 1800*k, 0.25, d); const t1 = t + 0.045;
      TN({t:t1, f:150*k, f2:52, fd:0.07, d:0.14, v:0.95, dest:d}); RZ({t:t1, d:0.06, v:0.85, f:1100*k, tipo:'lowpass', q:0.9, col:'rosa', dest:d});
      RZ({t:t1, d:0.018, v:0.7, f:2600*k, q:1.2, dest:d}); RZ({t:t1 + 0.005, d:0.05, v:0.3, f:500*k, q:2.5, dest:d}); return 0.35; },
    bate(t, o, d){ const k = o.tono*rv(0.94, 1.06); whoosh(t, 0.11, 400*k, 1400*k, 0.45, d); const t1 = t + 0.1;
      RZ({t:t1, d:0.05, v:0.9, f:1250*k, q:2.2, dest:d}); TN({t:t1, f:420*k, f2:300*k, fd:0.04, d:0.06, v:0.5, tipo:'triangle', dest:d}); TN({t:t1, f:880*k, d:0.035, v:0.18, dest:d});
      TN({t:t1, f:120*k, f2:48, fd:0.08, d:0.14, v:0.85, dest:d}); RZ({t:t1, d:0.08, v:0.6, f:700, tipo:'lowpass', col:'rosa', dest:d}); return 0.45; },
    cano(t, o, d){ const k = o.tono*rv(0.95, 1.05); whoosh(t, 0.1, 350*k, 1200*k, 0.4, d); const t1 = t + 0.09;
      TN({t:t1, f:130*k, f2:50, fd:0.08, d:0.15, v:0.85, dest:d}); RZ({t:t1, d:0.03, v:0.8, f:3200*k, q:1.2, dest:d});
      [1, 2.76, 5.40, 8.93, 13.3].forEach((r, i) => TN({t:t1, f:310*k*r, d:0.8/(1 + i*0.7), v:0.16/(1 + i*0.5), tipo:i ? 'sine' : 'triangle', dest:d})); return 1.0; },
    cuchillo(t, o, d){ const k = o.tono*rv(0.94, 1.08); RZ({t, a:0.02, d:0.05, v:0.5, f:3000*k, f2:6500*k, fd:0.06, q:2, dest:d}); const t1 = t + 0.05;
      RZ({t:t1, d:0.09, v:0.75, f:1600*k, f2:420*k, fd:0.09, q:4, col:'rosa', dest:d}); RZ({t:t1, d:0.03, v:0.4, f:4200*k, q:2, dest:d});
      TN({t:t1, f:110*k, f2:55, d:0.1, v:0.6, dest:d}); RZ({t:t1 + 0.04, d:0.1, v:0.3, f:700*k, f2:300, q:5, col:'rosa', dest:d}); return 0.4; },
    katana(t, o, d){ const k = o.tono*rv(0.96, 1.05), p = C.createStereoPanner(); p.pan.setValueAtTime(-0.4, t); p.pan.linearRampToValueAtTime(0.4, t + 0.2); p.connect(d);
      RZ({t, a:0.08, d:0.1, v:0.6, f:1800*k, f2:7000*k, fd:0.15, q:1.6, dest:p});
      [3150, 4270, 6120].forEach((f, i) => TN({t:t + 0.02, a:0.02, f:f*k, d:0.5 - i*0.12, v:0.05, dest:p}));    /* el filo que canta */
      const t1 = t + 0.14; RZ({t:t1, d:0.07, v:0.8, f:2200*k, f2:600*k, fd:0.07, q:3, dest:d}); TN({t:t1, f:130*k, f2:55, d:0.12, v:0.7, dest:d});
      RZ({t:t1 + 0.02, d:0.14, v:0.3, f:900, f2:350, q:4, col:'rosa', dest:d}); return 0.8; },
    golpe(t, o, d){ const k = o.tono*rv(0.92, 1.08); TN({t, f:120*k, f2:48, fd:0.06, d:0.12, v:0.9, dest:d}); RZ({t, d:0.07, v:0.85, f:850*k, tipo:'lowpass', q:0.8, col:'rosa', dest:d});
      RZ({t:t + 0.008, d:0.1, v:0.35, f:650*k, f2:240*k, q:3, dest:d}); return 0.3; },
    derribo(t, o, d){ const k = o.tono*rv(0.92, 1.08); RZ({t, a:0.03, d:0.08, v:0.25, f:900, f2:400, q:0.8, col:'rosa', dest:d}); const t1 = t + 0.07;
      TN({t:t1, f:95*k, f2:40, fd:0.1, d:0.2, v:0.95, dest:d}); RZ({t:t1, d:0.14, v:0.8, f:520*k, tipo:'lowpass', col:'rosa', dest:d});
      RZ({t:t1 + 0.13, d:0.07, v:0.4, f:420*k, tipo:'lowpass', col:'rosa', dest:d}); TN({t:t1 + 0.13, f:80*k, f2:45, d:0.1, v:0.45, dest:d});
      RZ({t:t1 + 0.02, d:0.2, v:0.12, f:2400, q:0.7, dest:d}); return 0.6; },
    rematar(t, o, d){ const k = o.tono*rv(0.9, 1.1); TN({t, f:110*k, f2:38, fd:0.09, d:0.2, v:1, dest:d}); RZ({t, d:0.1, v:0.9, f:700*k, tipo:'lowpass', col:'rosa', dest:d});
      for(let i = 0; i < 7; i++) RZ({t:t + 0.004 + i*rv(0.006, 0.014), d:rv(0.006, 0.015), v:rv(0.25, 0.5), f:rv(1800, 4200), q:4, dest:d});   /* hueso que cruje */
      RZ({t:t + 0.03, d:0.18, v:0.55, f:1100*k, f2:280*k, fd:0.16, q:5, col:'rosa', dest:d}); RZ({t:t + 0.1, d:0.12, v:0.35, f:500, f2:200, q:6, col:'rosa', dest:d}); return 0.45; },
    /* ---- los fierros */
    pistola(t, o, d){ const k = o.tono; tiro(t, k, d, {}); TN({t:t + 0.05, f:3100*k, tipo:'square', d:0.012, v:0.05, dest:d}); return 0.6; },
    uzi(t, o, d){ const k = o.tono*rv(0.96, 1.06); tiro(t, k*1.15, d, {cuerpo:0.05, cola:0.14, grave:0.08, v:0.85});
      TN({t:t + 0.02, f:2400*k, tipo:'square', d:0.008, v:0.04, dest:d}); return 0.3; },
    escopeta(t, o, d){ const k = o.tono;
      RZ({t, d:0.02, v:1, f:2600*k, tipo:'highpass', q:0.5, dest:d}); RZ({t, d:0.26, v:0.9, f:3000*k, f2:300, tipo:'lowpass', q:0.8, col:'rosa', dest:d});
      RZ({t, d:0.12, v:0.6, f:900*k, q:0.6, dest:d}); TN({t, f:130*k, f2:34, fd:0.16, d:0.3, v:1, dest:d});
      RZ({t:t + 0.34, d:0.05, v:0.3, f:1800, q:2, dest:d}); TN({t:t + 0.34, f:420, tipo:'square', lp:1500, d:0.03, v:0.1, dest:d});      /* la corredera */
      RZ({t:t + 0.5, d:0.05, v:0.35, f:1400, q:2, dest:d}); TN({t:t + 0.5, f:320, tipo:'square', lp:1300, d:0.035, v:0.12, dest:d}); return 0.9; },
    fusil(t, o, d){ const k = o.tono;
      RZ({t, d:0.006, v:1, f:4200*k, tipo:'highpass', q:0.5, dest:d}); RZ({t, d:0.05, v:0.8, f:2200*k, q:0.7, dest:d});
      RZ({t, a:0.004, d:0.5, v:0.45, f:1400*k, f2:120, tipo:'lowpass', col:'rosa', dest:d}); TN({t, f:150*k, f2:38, fd:0.12, d:0.38, v:1, dest:d});
      RZ({t:t + 0.3, d:0.4, v:0.18, f:800, f2:150, tipo:'lowpass', col:'rosa', dest:F('lowpass', 900, 0.6, d)});   /* el eco de la calle */
      RZ({t:t + 0.55, d:0.02, v:0.25, f:2600, q:3, dest:d}); RZ({t:t + 0.7, d:0.025, v:0.28, f:1900, q:3, dest:d}); return 1.2; },
    silenciada(t, o, d){ const k = o.tono*rv(0.95, 1.05); RZ({t, d:0.05, v:0.8, f:1300*k, f2:600*k, q:1.1, col:'rosa', dest:d}); RZ({t, d:0.02, v:0.35, f:4200*k, tipo:'highpass', dest:d});
      TN({t, f:220*k, f2:90, d:0.05, v:0.35, dest:d}); RZ({t:t + 0.035, d:0.015, v:0.4, f:3000*k, q:3, dest:d}); TN({t:t + 0.035, f:1900*k, tipo:'square', lp:3000, d:0.01, v:0.06, dest:d}); return 0.25; },
    sin_balas(t, o, d){ const k = o.tono; RZ({t, d:0.006, v:0.7, f:2800*k, q:3, dest:d}); TN({t, f:1700*k, tipo:'square', lp:3500, d:0.012, v:0.12, dest:d});
      RZ({t:t + 0.05, d:0.008, v:0.4, f:2200*k, q:3, dest:d}); TN({t:t + 0.05, f:1300*k, tipo:'square', lp:3000, d:0.01, v:0.08, dest:d}); return 0.15; },
    casquillo(t, o, d){ const k = o.tono*rv(0.9, 1.12); let tt = t + 0.02, a = 1;
      for(let i = 0; i < 4; i++){ [1, 1.73, 2.61].forEach((r, j) => TN({t:tt, f:3100*k*r, d:0.07*a + 0.02, v:0.07*a/(1 + j), dest:d})); RZ({t:tt, d:0.006, v:0.15*a, f:6000, q:2, dest:d});
        tt += 0.09*a; a *= 0.6; } return 0.5; },
    rebote(t, o, d){ const k = o.tono*rv(0.9, 1.15), g = C.createGain(), s = oscF('sine', 2600*k, t, t + 0.5), l = oscF('sine', 38, t, t + 0.5), lg = G(90*k);
      s.frequency.exponentialRampToValueAtTime(1350*k, t + 0.4); l.connect(lg); lg.connect(s.frequency); env(g.gain, t, 0.004, 0.32, 0.36); s.connect(g); g.connect(d);
      RZ({t, d:0.015, v:0.6, f:3800*k, q:1.5, dest:d}); TN({t, f:4400*k, d:0.12, v:0.06, dest:d}); return 0.55; },
    agarrar(t, o, d){ const k = o.tono; RZ({t, a:0.01, d:0.05, v:0.3, f:1500, f2:2600, q:1, col:'rosa', dest:d}); RZ({t:t + 0.05, d:0.015, v:0.6, f:2600*k, q:2.5, dest:d});
      TN({t:t + 0.05, f:520*k, tipo:'square', lp:2200, d:0.03, v:0.12, dest:d}); RZ({t:t + 0.11, d:0.02, v:0.45, f:1800*k, q:3, dest:d}); TN({t:t + 0.11, f:340*k, tipo:'square', lp:1600, d:0.03, v:0.1, dest:d}); return 0.25; },
    tirar(t, o, d){ const k = o.tono, g = G(0.6, d), l = oscF('sine', 14, t, t + 0.5); l.connect(G(0.55, g.gain));                  /* el arma que gira en el aire */
      RZ({t, a:0.05, d:0.3, v:0.6, f:700*k, f2:2400*k, fd:0.3, q:1.6, col:'rosa', dest:g}); return 0.5; },
    /* ---- la casa */
    puerta(t, o, d){ const k = o.tono*rv(0.94, 1.06); RZ({t, a:0.03, d:0.06, v:0.3, f:500*k, f2:1200*k, q:1, col:'rosa', dest:d}); const t1 = t + 0.06;
      RZ({t:t1, d:0.1, v:0.9, f:700*k, q:1.1, dest:d}); TN({t:t1, f:160*k, f2:90*k, d:0.14, v:0.6, tipo:'triangle', dest:d}); TN({t:t1, f:85*k, f2:42, d:0.2, v:0.8, dest:d});
      for(let i = 0; i < 6; i++) RZ({t:t1 + 0.03 + Math.random()*0.18, d:rv(0.01, 0.03), v:rv(0.08, 0.22), f:rv(1400, 3200), q:3, dest:d});   /* el marco que tiembla */
      TN({t:t1 + 0.01, f:1850*k, d:0.12, v:0.05, dest:d}); return 0.6; },                                                                  /* el picaporte */
    puerta_golpe(t, o, d){ FX.puerta(t, o, d); FX.golpe(t + 0.07, {tono:o.tono*0.9}, d);
      vox(t + 0.09, d, {f:150*o.tono, f2:170*o.tono, f3:110*o.tono, vocal:'u', d:0.18, v:0.4, aire:0.05}); FX.derribo(t + 0.16, o, G(0.7, d)); return 1.0; },
    vidrio(t, o, d){ const k = o.tono; RZ({t, d:0.16, v:0.9, f:3200*k, tipo:'highpass', q:0.6, dest:d}); RZ({t, d:0.06, v:0.6, f:1500*k, q:1, dest:d});
      for(let i = 0; i < 26; i++){ const tt = t + Math.pow(Math.random(), 1.7)*0.75;                /* la cascada de pedacitos */
        TN({t:tt, f:rv(2600, 8200)*k, d:rv(0.03, 0.11), v:rv(0.04, 0.12)*(1 - (tt - t)*0.8), tipo:Math.random() < 0.5 ? 'sine' : 'triangle', dest:panear(d, rv(-0.5, 0.5))}); }
      return 1.0; },
    /* ---- gente y perros */
    perro(t, o, d){ const k = o.tono*rv(0.9, 1.12); let tt = t;
      for(let i = 0; i < 2; i++){ const g = G(0, d), s = oscF('sawtooth', 380*k, tt, tt + 0.25), mix = G(1);
        s.frequency.linearRampToValueAtTime(620*k, tt + 0.03); s.frequency.exponentialRampToValueAtTime(300*k, tt + 0.14);
        for(const [fr, a] of [[800, 1], [1500, 0.7], [2800, 0.25]]){ const bp = F('bandpass', fr*k, 4); mix.connect(bp); bp.connect(G(a*2.4, g)); }
        s.connect(saturador(2, mix)); adsr(g.gain, tt, 0.008, 0.05, 0.6, tt + 0.1, 0.05, 0.7);
        RZ({t:tt, d:0.1, v:0.25, f:1800*k, q:1, dest:d}); tt += rv(0.2, 0.26); }
      return tt - t + 0.2; },
    perro_muere(t, o, d){ const k = o.tono, g = G(0, d), s = oscF('sawtooth', 1100*k, t, t + 0.8), mix = G(1), l = oscF('sine', 9, t, t + 0.8);
      l.connect(G(40*k, s.frequency)); s.frequency.linearRampToValueAtTime(1300*k, t + 0.05); s.frequency.exponentialRampToValueAtTime(420*k, t + 0.55);
      for(const [fr, a] of [[1200, 1], [2400, 0.5]]){ const bp = F('bandpass', fr*k, 4); mix.connect(bp); bp.connect(G(a*2.4, g)); }
      s.connect(mix); adsr(g.gain, t, 0.01, 0.2, 0.7, t + 0.5, 0.1, 0.5); FX.derribo(t + 0.45, {tono:1.3*k}, G(0.5, d)); return 1.2; },
    alerta(t, o, d){ const k = o.tono*rv(0.92, 1.1);                                        /* «¡eh!» */
      vox(t, d, {f:180*k, f2:235*k, pico:0.25, f3:165*k, vocal:'e', d:0.2, v:0.6, aire:0.12, sucio:1.5});
      TN({t, f:mtof(88), d:0.12, v:0.03, tipo:'square', lp:5000, dest:d}); return 0.45; },
    grito(t, o, d){ const k = o.tono*rv(0.9, 1.12);
      vox(t, d, {f:240*k, f2:330*k, pico:0.2, f3:190*k, vocal:'a', d:0.6, v:0.55, aire:0.18, sucio:2.2, vib:7});
      vox(t + 0.02, d, {f:360*k, f2:500*k, pico:0.2, f3:280*k, vocal:'e', d:0.5, v:0.2, sucio:2}); return 0.8; },
    muere(t, o, d){ const k = o.tono*rv(0.9, 1.12); RZ({t, d:0.12, v:0.8, f:1400*k, f2:300*k, fd:0.12, q:3, col:'rosa', dest:d}); TN({t, f:100*k, f2:45, d:0.14, v:0.8, dest:d});
      RZ({t:t + 0.02, d:0.06, v:0.4, f:600, tipo:'lowpass', col:'rosa', dest:d});
      for(let i = 0; i < 5; i++) RZ({t:t + rv(0.04, 0.3), d:rv(0.02, 0.05), v:rv(0.12, 0.3), f:rv(500, 1800), q:5, col:'rosa', dest:d});   /* salpica */
      vox(t + 0.04, d, {f:150*k, f2:165*k, f3:95*k, vocal:'o', d:0.32, v:0.45, aire:0.05}); return 0.5; },
    jugador_muere(t, o, d){ FX.golpe(t, o, d); TN({t, f:70, f2:24, fd:1.2, d:1.6, v:0.9, dest:d}); RZ({t, a:0.02, d:1.2, v:0.5, f:900, f2:120, fd:1, tipo:'lowpass', col:'pardo', dest:d});
      /* un golpe de sinte grave que se desafina, y el pitido del oído */
      const g = G(0, d), lp = F('lowpass', 900, 3, g);
      for(const m of [28, 35, 40]) for(const dt of [-12, 12]){ const s = oscF('sawtooth', mtof(m), t, t + 3); s.detune.setValueAtTime(dt, t); s.detune.linearRampToValueAtTime(dt - 400, t + 2.6); s.connect(lp); }
      lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(140, t + 2.4); adsr(g.gain, t, 0.01, 0.6, 0.6, t + 1.8, 0.8, 0.12);
      TN({t:t + 0.05, a:0.1, f:3700, d:2.2, v:0.05, dest:d}); TN({t:t + 0.05, a:0.1, f:3740, d:1.8, v:0.03, dest:d}); return 3.2; },
    /* ---- el puntaje */
    combo(t, o, d){ const n = lim((+o.n | 0) || 2, 2, 10), sube = (n - 2)*2, k = o.tono;
      [0, 7, 12].forEach((iv, i) => { const f = mtof(69 + sube + iv)*k; TN({t:t + i*0.03, f, tipo:'sawtooth', lp:3800, d:0.18, v:0.1, dest:d}); TN({t:t + i*0.03, f:f*1.004, tipo:'square', lp:3000, d:0.14, v:0.05, dest:d}); });
      RZ({t, d:0.06, v:0.2, f:6000, tipo:'highpass', dest:d}); if(n >= 6) TN({t:t + 0.09, f:mtof(93 + sube)*k, d:0.4, v:0.05, dest:d}); return 0.5; },
    piso_limpio(t, o, d){ const k = o.tono, g = G(0, d), lp = F('lowpass', 400, 4, g);
      for(const m of [40, 47, 52, 55, 59, 64]) for(const dt of [-11, 11]){ const s = oscF('sawtooth', mtof(m)*k, t, t + 2.6); s.detune.value = dt; s.connect(lp); }
      lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(5200, t + 0.12); lp.frequency.exponentialRampToValueAtTime(600, t + 1.8);
      adsr(g.gain, t, 0.01, 0.5, 0.5, t + 1, 1, 0.07);
      bomboD(d, t, 0.9, {duro:1}); RZ({t, d:0.25, v:0.6, f:2000, q:0.6, dest:N.gateFin});                /* golpe con compuerta */
      RZ({t, a:0.6, d:0.5, v:0.3, f:500, f2:8000, fd:1, q:1.5, dest:d}); return 2.6; },
    sello(t, o, d){ const k = o.tono; RZ({t, a:0.01, d:0.03, v:0.2, f:1200, f2:500, q:1, col:'rosa', dest:d}); const t1 = t + 0.03;
      TN({t:t1, f:120*k, f2:42, fd:0.1, d:0.3, v:1, dest:d}); RZ({t:t1, d:0.09, v:0.9, f:900*k, tipo:'lowpass', q:1, col:'rosa', dest:d}); RZ({t:t1, d:0.02, v:0.5, f:2600, q:1, dest:d});
      RZ({t:t1, d:0.2, v:0.5, f:1400, q:0.6, dest:N.gateFin}); TN({t:t1, f:180, f2:90, d:0.15, v:0.5, dest:N.gateFin}); return 1.2; },
    puntos(t, o, d){ const f = 1760*o.tono*Math.pow(2, ((+o.n | 0) % 12)/24); TN({t, f, tipo:'square', lp:4000, d:0.025, v:0.12, dest:d}); return 0.08; },
    /* ---- el llamado */
    telefono(t, o, d){ const k = o.tono, g = G(0, d), bp = F('bandpass', 1900*k, 1.2, g), dur = 1.2;
      /* dos campanitas golpeadas por un martillo a 22 golpes por segundo */
      for(const [f0, fase] of [[1530, 0], [1290, 0.0225]]){ const gb = G(0, bp);
        for(const [r, a] of [[1, 1], [2.32, 0.45], [3.81, 0.2]]) oscF('sine', f0*k*r, t, t + dur + 0.4).connect(G(a, gb));
        for(let tt = t + fase; tt < t + dur; tt += 0.045){ gb.gain.setValueAtTime(0.09, tt); gb.gain.setTargetAtTime(0, tt + 0.002, 0.025); } }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.02); g.gain.setValueAtTime(1, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.25); return dur + 0.4; },
    contestador(t, o, d){ const k = o.tono, tel = F('bandpass', 1400, 0.8, d);
      /* el clac de la tecla, el motor que arranca, el siseo de la cinta y el bip */
      RZ({t, d:0.02, v:0.6, f:1800, q:2, dest:d}); TN({t, f:140, f2:80, d:0.05, v:0.35, dest:d}); RZ({t:t + 0.05, d:0.03, v:0.35, f:900, q:2, dest:d});
      const g = G(0, d), m = oscF('sawtooth', 30, t + 0.05, t + 1.9), lp = F('lowpass', 500, 2, g); m.frequency.exponentialRampToValueAtTime(95, t + 0.4); m.connect(lp);
      adsr(g.gain, t + 0.05, 0.1, 0.3, 0.4, t + 1.5, 0.3, 0.05);
      RZ({t:t + 0.15, a:0.2, d:1.5, v:0.06, f:5000, tipo:'highpass', q:0.5, dest:d});
      const gb = G(0, tel); oscF('sine', 1000*k, t + 0.9, t + 1.4).connect(gb); adsr(gb.gain, t + 0.9, 0.005, 0.1, 1, t + 1.3, 0.02, 0.35); return 1.9; },
    auto(t, o, d){ const k = o.tono;
      TN({t, f:90, f2:45, d:0.25, v:0.9, dest:d}); RZ({t, d:0.12, v:0.8, f:600, tipo:'lowpass', col:'rosa', dest:d}); RZ({t, d:0.04, v:0.5, f:2400, q:1.5, dest:d});   /* el portazo */
      TN({t:t + 0.01, f:520, d:0.2, v:0.06, dest:d});
      const t1 = t + 0.7, gs = G(0, d), am = G(0.5, F('bandpass', 700, 1.5, gs)), s = fuente('rosa', t1, t1 + 1.1), l = oscF('square', 11, t1, t1 + 1.1);   /* el burro de arranque */
      l.connect(G(0.5, am.gain)); s.connect(am); oscF('sawtooth', 90*k, t1, t1 + 0.95).connect(F('lowpass', 400, 1, G(0.2, gs)));
      adsr(gs.gain, t1, 0.02, 0.2, 1, t1 + 0.8, 0.05, 0.5);
      const t2 = t1 + 0.85, ge = G(0, d), lp = F('lowpass', 300, 1.5, ge), e1 = oscF('sawtooth', 28*k, t2, t2 + 2.3), e2 = oscF('square', 14*k, t2, t2 + 2.3);   /* y el motor que brama */
      e1.frequency.linearRampToValueAtTime(70*k, t2 + 0.35); e1.frequency.exponentialRampToValueAtTime(34*k, t2 + 1.4);
      e2.frequency.linearRampToValueAtTime(35*k, t2 + 0.35); e2.frequency.exponentialRampToValueAtTime(17*k, t2 + 1.4);
      e1.connect(lp); e2.connect(G(0.6, lp)); lp.frequency.setValueAtTime(300, t2); lp.frequency.linearRampToValueAtTime(1100, t2 + 0.35); lp.frequency.exponentialRampToValueAtTime(350, t2 + 1.4);
      adsr(ge.gain, t2, 0.05, 0.6, 0.6, t2 + 1.8, 0.4, 0.4); return t2 - t + 2.3; },
    /* ---- menús */
    boton(t, o, d){ const k = o.tono; RZ({t, d:0.008, v:0.3, f:4000, q:1, dest:d}); TN({t, f:660*k, tipo:'square', lp:2800, d:0.06, v:0.1, dest:d}); TN({t:t + 0.04, f:990*k, tipo:'square', lp:3200, d:0.09, v:0.09, dest:d}); return 0.2; },
    clic(t, o, d){ RZ({t, d:0.006, v:0.4, f:3500*o.tono, q:2, dest:d}); TN({t, f:1320*o.tono, tipo:'square', lp:3000, d:0.015, v:0.06, dest:d}); return 0.08; },
    atras(t, o, d){ const k = o.tono; TN({t, f:700*k, f2:350*k, fd:0.1, tipo:'square', lp:2200, d:0.1, v:0.1, dest:d}); RZ({t, d:0.01, v:0.25, f:2500, q:1, dest:d}); return 0.2; },
    desliza_menu(t, o, d){ RZ({t, a:0.02, d:0.07, v:0.7, f:1400*o.tono, f2:3400*o.tono, q:1.2, col:'rosa', dest:d});
      TN({t, f:220*o.tono, f2:330*o.tono, tipo:'sawtooth', lp:1500, d:0.06, v:0.05, dest:d}); return 0.15; },
    mascara(t, o, d){ const k = o.tono;                                                       /* la goma que se estira, el plástico que calza, el aliento adentro */
      const g = G(0, d), am = G(0.5), s = fuente('rosa', t, t + 0.5), bp = F('bandpass', 700*k, 4), l = oscF('sawtooth', 45, t, t + 0.5); l.connect(G(0.5, am.gain));
      bp.frequency.linearRampToValueAtTime(1500*k, t + 0.3); s.connect(bp); bp.connect(am); am.connect(g); adsr(g.gain, t, 0.05, 0.2, 0.8, t + 0.32, 0.05, 0.6);
      const t1 = t + 0.36; RZ({t:t1, d:0.02, v:0.6, f:1800*k, q:2, dest:d}); TN({t:t1, f:260*k, f2:180*k, d:0.05, v:0.25, tipo:'triangle', dest:d});
      RZ({t:t1 + 0.1, a:0.12, d:0.3, v:0.2, f:700, q:1.4, col:'rosa', dest:F('lowpass', 1200, 0.7, d)});
      const gs = G(0, d), lp = F('lowpass', 500, 2, gs); for(const m of [33, 40]) oscF('sawtooth', mtof(m), t1, t1 + 1.6).connect(lp);   /* y un golpe de sinte grave */
      adsr(gs.gain, t1, 0.05, 0.4, 0.5, t1 + 0.6, 0.6, 0.14); return 2; },
    titulo(t, o, d){ const k = o.tono, g = G(0, d), lp = F('lowpass', 150, 2);
      lp.frequency.setValueAtTime(140, t); lp.frequency.exponentialRampToValueAtTime(2400, t + 0.22); lp.frequency.exponentialRampToValueAtTime(500, t + 2.4);
      for(const m of [28, 40, 47, 52, 55, 59]) for(const dt of [-9, 9]){ const s = oscF('sawtooth', mtof(m)*k, t, t + 3.4); s.detune.value = dt; s.connect(lp); }
      lp.connect(saturador(2.2, g)); adsr(g.gain, t, 0.04, 0.8, 0.55, t + 1.6, 1.4, 0.2);
      bomboD(d, t, 1, {duro:1, larga:0.8}); RZ({t, d:0.3, v:0.7, f:1800, q:0.6, dest:N.gateFin}); TN({t, f:220, f2:170, d:0.12, v:0.5, tipo:'triangle', dest:N.gateFin});
      TN({t, f:80, f2:28, fd:1.2, d:1.6, v:0.8, dest:d}); RZ({t, d:0.4, v:0.5, f:1200, f2:200, tipo:'lowpass', col:'pardo', dest:d}); return 3.6; },
    pagina(t, o, d){ const g = G(0.6, d), l = oscF('square', 38, t, t + 0.35), lg = G(0.35); l.connect(F('lowpass', 160, 0.7, lg)); lg.connect(g.gain);
      RZ({t, a:0.03, d:0.22, v:0.5, f:3000*o.tono, f2:1800*o.tono, q:0.8, col:'rosa', dest:g}); RZ({t:t + 0.2, d:0.05, v:0.3, f:500, tipo:'lowpass', col:'rosa', dest:d}); return 0.4; },
    /* ---- la censura: todo suena a dibujito */
    bonk(t, o, d){ const k = o.tono*rv(0.95, 1.05); TN({t, f:900*k, f2:280*k, fd:0.08, d:0.12, v:0.5, tipo:'triangle', dest:d}); TN({t, f:1800*k, f2:560*k, fd:0.06, d:0.06, v:0.12, dest:d});
      RZ({t, d:0.02, v:0.4, f:1500*k, q:3, dest:d}); TN({t, f:620*k, d:0.07, v:0.2, dest:d}); return 0.3; },
    boing(t, o, d){ const k = o.tono, g = G(0, d), s = oscF('triangle', 220*k, t, t + 0.9), l = oscF('sine', 16, t, t + 0.9), lg = C.createGain();
      lg.gain.setValueAtTime(90*k, t); lg.gain.exponentialRampToValueAtTime(3, t + 0.8); l.connect(lg); lg.connect(s.frequency); s.frequency.linearRampToValueAtTime(330*k, t + 0.6);
      s.connect(g); env(g.gain, t, 0.005, 0.5, 0.7); return 0.9; },
    pop(t, o, d){ const k = o.tono*rv(0.95, 1.08); TN({t, f:500*k, f2:1400*k, fd:0.03, d:0.05, v:0.5, dest:d}); RZ({t, d:0.03, v:0.5, f:2000*k, q:1.5, dest:d});
      for(let i = 0; i < 12; i++) TN({t:t + 0.04 + Math.random()*0.5, f:rv(2500, 6000), d:rv(0.03, 0.09), v:rv(0.02, 0.05), tipo:'triangle', dest:panear(d, rv(-0.7, 0.7))});   /* el confeti */
      RZ({t:t + 0.02, d:0.4, v:0.08, f:8000, q:2, dest:d}); return 0.8; },
    estrellitas(t, o, d){ const k = o.tono, p = C.createStereoPanner(), l = oscF('sine', 1.6, t, t + 1.6); l.connect(p.pan); p.connect(d);
      [88, 91, 95, 100, 96, 91, 88, 95].forEach((m, i) => { TN({t:t + i*0.14, f:mtof(m)*k, d:0.3, v:0.08, dest:p}); TN({t:t + i*0.14, f:mtof(m)*k*2.01, d:0.15, v:0.02, dest:p}); }); return 1.6; },
    noqueado(t, o, d){ const k = o.tono, g = G(0, d), s = oscF('sine', 1900*k, t, t + 0.75), l = oscF('sine', 7, t, t + 0.75); l.connect(G(25, s.frequency));
      s.frequency.exponentialRampToValueAtTime(320*k, t + 0.6); s.connect(g); adsr(g.gain, t, 0.02, 0.2, 0.9, t + 0.6, 0.05, 0.2);                /* silbato de émbolo para abajo */
      RZ({t, a:0.02, d:0.5, v:0.05, f:2200, q:1, dest:d});
      const t1 = t + 0.62; TN({t:t1, f:130, f2:60, d:0.18, v:0.7, tipo:'triangle', dest:d}); FX.bonk(t1, {tono:0.7*k}, d); TN({t:t1 + 0.2, f:100, f2:70, d:0.1, v:0.35, dest:d}); return 1.2; }
  };
  /* voces vivas por nombre y en total: la más vieja se apaga para hacer lugar */
  const VIVAS = [];
  function apagar(v, now){ try { const p = v.g.gain; p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(0, now + 0.03); } catch(e){}
    v.fin = Math.min(v.fin, now + 0.06); v.robada = 1; }
  function salida(nom, meta, x, vol){
    const now = ya(), mias = VIVAS.filter(v => v.nom === nom && !v.robada);
    if(mias.length >= (meta.max || 3)) apagar(mias[0], now);
    const todas = VIVAS.filter(v => !v.robada); if(todas.length >= 30) apagar(todas[0], now);
    const juntas = mias.filter(v => now - v.t0 < 0.045).length;              /* la ráfaga pierde volumen */
    const g = G(vol/(1 + 0.6*juntas)), p = panear(N.fx, x); g.connect(p);
    const e = meta.rev ? G(meta.rev, N.revFin) : null; if(e) p.connect(e);
    const v = {nom, g, p, e, t0:now, fin:now + 10}; VIVAS.push(v); return v;
  }
  /* el gancho: un AudioBuffer ya hecho (o un dataURL que se decodifica una vez) le gana a la síntesis */
  const DECOD = new Set();
  function bufExt(nom){
    const B = window.SONIDOS_BUF, S = window.SONIDOS;
    if(B && tiene(B, nom) && B[nom] && typeof B[nom].getChannelData === 'function') return B[nom];
    if(S && tiene(S, nom) && S[nom]){
      if(typeof S[nom].getChannelData === 'function') return S[nom];
      if(typeof S[nom] === 'string' && !DECOD.has(nom) && window.fetch){ DECOD.add(nom);
        fetch(S[nom]).then(r => r.arrayBuffer()).then(ab => new Promise((ok, no) => C.decodeAudioData(ab, ok, no)))
          .then(b => { window.SONIDOS_BUF = window.SONIDOS_BUF || {}; window.SONIDOS_BUF[nom] = b; }).catch(() => {}); }
    }
    return null;
  }
  function fx(nom, opc){
    if(!listo) return;
    try {
      let o = opc && typeof opc === 'object' ? Object.assign({}, opc) : {};
      if(tiene(ALIAS, nom)){ const a = ALIAS[nom]; nom = a[0]; if(a[1]) o = Object.assign(o, a[1]); }
      if(!tiene(FX, nom)){ if(typeof nom === 'string' && FALTAN.size < 50) FALTAN.add(nom); return; }
      if(C.state !== 'running') return;
      const f = FX[nom], meta = FXM[nom] || {}, t = ya() + 0.006;
      const x = lim(+(o.x !== undefined ? o.x : o.pan) || 0, -1, 1);
      const tono = lim(+o.tono || 1, 0.2, 4)*(meta.ui ? 1 : lerp(1, 0.74, kLento)*rv(0.97, 1.03));   /* en cámara lenta todo suena más grave */
      const vol = (o.vol === undefined ? 1 : lim(+o.vol || 0, 0, 2))*(meta.vol || 0.5);
      if(vol <= 0) return;
      const v = salida(nom, meta, x, vol), ext = bufExt(nom);
      let dur;
      if(ext){ const s = C.createBufferSource(); s.buffer = ext; s.playbackRate.value = tono; s.connect(v.g); s.start(t); dur = ext.duration/tono; }
      else dur = f(t, {x, tono, n:o.n}, v.g) || 1;
      v.fin = t + dur + (meta.rev ? 2.2 : 0.3);
    } catch(e){ err(e); }
  }

  /* ------------------------------------------------------------ ambiente */
  let AMB = null;
  const VIEJOS = [];
  function ambiente(lugar){
    const pedido = tiene(ARMA, lugar) ? lugar : null;
    ambPed = pedido; if(!listo) return;
    try {
      if(pedido === ambAct) return; ambAct = pedido;
      const now = ya();
      if(AMB){ const A = AMB, p = A.g.gain; p.cancelScheduledValues(now); p.setValueAtTime(Math.max(p.value, 0.0001), now); p.linearRampToValueAtTime(0, now + 2);
        A.fin = now + 2.2; for(const r of A.reg) r.fin = now + 2.2; VIEJOS.push(A); AMB = null; }
      if(pedido){ AMB = {lugar:pedido, g:G(0, N.amb), nodos:[], loops:[], reg:[], ev:[], rit:[], fin:Infinity};
        AMB.g.gain.setValueAtTime(0.0001, now); AMB.g.gain.linearRampToValueAtTime(1, now + 2.5); ARMA[pedido](AMB); }
    } catch(e){ err(e); }
  }
  /* un bucle de ruido filtrado que no para; queda anotado para el lento y para apagarlo */
  function bucle(A, col, tipo, f, q, v, x, rate){
    const s = C.createBufferSource(); s.buffer = RU[col]; s.loop = true; s.playbackRate.value = (rate || 1)*lerp(1, 0.58, kLento); s.start(ya(), Math.random()*2.5);
    const fl = F(tipo, f, q), g = G(v); s.connect(fl); fl.connect(g); g.connect(panear(A.g, x || 0));
    A.nodos.push(s); A.loops.push({s, r:rate || 1}); return {s, fl, g};
  }
  function tonoFijo(A, tipo, f, v, dest){ const o = C.createOscillator(); o.type = tipo; o.frequency.value = f; const r = {o, d0:0, fin:Infinity};
    o.detune.value = detL(); OSC_M.push(r); A.reg.push(r); o.connect(G(v, dest || A.g)); o.start(); A.nodos.push(o); return o; }
  function lfo(A, f, prof, param, tipo){ const o = C.createOscillator(); o.type = tipo || 'sine'; o.frequency.value = f; o.connect(G(prof, param)); o.start(); A.nodos.push(o); return o; }
  const suceso = (A, a, b, fn, primero) => A.ev.push({a, b, fn, prox:ya() + (primero !== undefined ? primero : rv(a, b))});
  /* algo que late parejo (el bajo de la fiesta, el péndulo): se programa por adelantado y no depende del cuadro */
  const ritmo = (A, dt, fn, t0) => A.rit.push({dt, fn, n:0, prox:ya() + (t0 || 0.2)});
  function pasaAuto(dest, t, v, lpF, dur){
    dur = dur || rv(2.6, 4); const dir = Math.random() < 0.5 ? -1 : 1, p = C.createStereoPanner(), g = G(0, p), lp = F('lowpass', lpF || 1200, 0.7, g);
    p.pan.setValueAtTime(-dir*0.9, t); p.pan.linearRampToValueAtTime(dir*0.9, t + dur); p.connect(dest);
    fuente('rosa', t, t + dur + 0.1).connect(lp);
    const f0 = rv(55, 85), m = oscF('sawtooth', f0*1.06, t, t + dur + 0.1);                  /* el motor, con su Doppler */
    m.frequency.setValueAtTime(f0*1.06, t + dur*0.45); m.frequency.linearRampToValueAtTime(f0*0.94, t + dur*0.55); m.connect(F('lowpass', 300, 1, G(0.4, lp)));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + dur*0.5); g.gain.linearRampToValueAtTime(0, t + dur);
  }
  function colectivo(dest, t, v){
    const p = panear(dest, rv(-0.6, 0.6)), g = G(0, p), lp = F('lowpass', 220, 1.2, g), m = oscF('sawtooth', 42, t, t + 4.5);
    m.frequency.linearRampToValueAtTime(30, t + 3); m.connect(lp); adsr(g.gain, t, 0.8, 1, 1, t + 3.2, 0.8, v*0.6);
    const tf = t + 1.8, gq = G(0, p), q = oscF('sine', 2350, tf, tf + 1.6), l = oscF('sine', 6.5, tf, tf + 1.6); l.connect(G(30, q.frequency));   /* el freno que chilla */
    q.frequency.linearRampToValueAtTime(2150, tf + 1.2); q.connect(gq); adsr(gq.gain, tf, 0.15, 0.3, 0.8, tf + 1.1, 0.2, v*0.05);
    RZ({t:tf + 1.3, a:0.02, d:0.9, v:v*0.35, f:3500, tipo:'highpass', q:0.5, dest:p});                                                  /* y el pssss del aire */
  }
  function bocina(dest, t, v){ const g = G(0, F('lowpass', 900, 1, dest)), f = rv(330, 440);
    for(const r of [1, 1.26]) oscF('square', f*r, t, t + 0.7).connect(g); adsr(g.gain, t, 0.02, 0.1, 0.8, t + rv(0.2, 0.45), 0.05, v); }
  function gota(dest, t, v){ TN({t, f:rv(600, 1100), f2:rv(1600, 2600), fd:0.025, d:0.06, v, dest}); RZ({t:t + 0.01, d:0.02, v:v*0.5, f:5000, tipo:'highpass', dest}); }
  function crujido(dest, t, v){ const d = rv(0.8, 2), g = G(0, dest), bp = F('bandpass', rv(500, 900), 12, g), bp2 = F('bandpass', rv(1300, 1900), 10, G(0.5, g)), s = oscF('sawtooth', rv(14, 26), t, t + d + 0.1);
    s.frequency.linearRampToValueAtTime(rv(28, 50), t + d); bp.frequency.linearRampToValueAtTime(bp.frequency.value*rv(0.7, 1.3), t + d); s.connect(bp); s.connect(bp2);
    adsr(g.gain, t, d*0.3, 0.5, 0.9, t + d*0.8, d*0.2, v); }
  function trueno(dest, t, v){ const g = G(0, dest), s = fuente('pardo', t, t + 4.6), lp = F('lowpass', 380, 0.7, g); lp.frequency.exponentialRampToValueAtTime(110, t + 4);
    g.gain.setValueAtTime(0, t); let tt = t + 0.05, a = v;
    while(tt < t + 4.2){ g.gain.linearRampToValueAtTime(a*rv(0.35, 1), tt); tt += rv(0.08, 0.34); a *= 0.83; } g.gain.linearRampToValueAtTime(0, t + 4.4); s.connect(lp); }
  function campana(dest, t, v, f){ for(const [r, a, d] of [[1, 1, 3], [2, 0.5, 2], [2.4, 0.4, 1.6], [3, 0.25, 1.2], [4.2, 0.12, 0.7]]) TN({t, f:f*r, d, v:v*a, dest}); }
  const ARMA = {
    departamento(A){
      bucle(A, 'blanco', 'highpass', 2600, 0.5, 0.035, -0.5); bucle(A, 'blanco', 'highpass', 3000, 0.5, 0.03, 0.5, 0.91);     /* lluvia contra la ventana */
      bucle(A, 'rosa', 'bandpass', 1100, 0.6, 0.08, 0.2);
      const lej = bucle(A, 'pardo', 'lowpass', 260, 0.7, 0.2, 0); lfo(A, 0.06, 0.07, lej.g.gain);                              /* la ciudad lejos */
      const hel = F('lowpass', 150, 1, A.g); tonoFijo(A, 'sawtooth', 50, 0.035, hel); tonoFijo(A, 'sine', 100, 0.012);           /* la heladera */
      suceso(A, 0.1, 0.6, t => gota(panear(A.g, rv(-0.8, 0.8)), t, rv(0.01, 0.03)));
      suceso(A, 30, 60, t => { const p = panear(A.g, 0.5); RZ({t, d:0.02, v:0.2, f:2000, q:2, dest:p}); for(let i = 0; i < 8; i++) RZ({t:t + 0.05 + i*0.035, d:0.02, v:0.05, f:rv(300, 700), q:4, dest:p}); });
      suceso(A, 6, 14, t => pasaAuto(A.g, t, rv(0.1, 0.2), 500), rv(2, 5));
      suceso(A, 15, 35, t => bocina(panear(A.g, rv(-0.8, 0.8)), t, 0.006));
      suceso(A, 25, 50, t => colectivo(F('lowpass', 700, 0.7, A.g), t, 0.25), rv(8, 15));
    },
    calle(A){
      bucle(A, 'pardo', 'lowpass', 300, 0.7, 0.2, 0); const mur = bucle(A, 'rosa', 'bandpass', 700, 0.5, 0.04, 0.2); lfo(A, 0.08, 0.015, mur.g.gain);
      bucle(A, 'rosa', 'highpass', 3000, 0.5, 0.01, -0.3);
      suceso(A, 3, 9, t => pasaAuto(A.g, t, rv(0.25, 0.5), rv(900, 1800)), 1);
      suceso(A, 20, 40, t => colectivo(A.g, t, 0.5), rv(6, 12));
      suceso(A, 10, 25, t => { const p = panear(A.g, rv(-0.9, 0.9)); p.connect(G(0.5, N.revFin)); FX.perro(t, {tono:rv(0.85, 1.1)}, F('lowpass', 1400, 0.7, G(0.3, p))); }, rv(4, 8));
      suceso(A, 8, 20, t => bocina(panear(A.g, rv(-0.9, 0.9)), t, 0.012));
    },
    edificio(A){
      tonoFijo(A, 'sawtooth', 100, 0.014, F('bandpass', 100, 3, A.g)); tonoFijo(A, 'sine', 200, 0.005); tonoFijo(A, 'square', 100, 0.004, F('highpass', 2500, 0.7, A.g));   /* los tubos */
      const ven = bucle(A, 'rosa', 'bandpass', 380, 0.6, 0.16, 0); lfo(A, 0.09, 0.03, ven.g.gain); bucle(A, 'pardo', 'lowpass', 160, 0.7, 0.18, 0);   /* la ventilación */
      const rej = bucle(A, 'blanco', 'bandpass', 1500, 5, 0.012, 0.4); lfo(A, 7.5, 0.01, rej.g.gain, 'square');                                     /* la rejilla que vibra */
      suceso(A, 3, 9, t => { const p = panear(A.g, rv(-0.7, 0.7)), n = 2 + (Math.random()*5 | 0);                                                     /* un tubo que titila */
        for(let i = 0; i < n; i++) RZ({t:t + i*rv(0.03, 0.08), d:0.01, v:0.06, f:rv(2500, 5000), q:2, dest:p}); TN({t, f:100, tipo:'sawtooth', lp:600, d:n*0.06, v:0.03, dest:p}); });
      suceso(A, 25, 50, t => { const p = panear(A.g, rv(-0.8, 0.8)); p.connect(G(0.7, N.revFin)); TN({t, f:1318, d:1.2, v:0.02, dest:p}); TN({t:t + 0.3, f:1046, d:1.5, v:0.02, dest:p}); });   /* el ascensor */
      suceso(A, 12, 25, t => { const p = panear(A.g, rv(-0.8, 0.8)); p.connect(G(0.8, N.revFin)); TN({t, f:80, f2:45, d:0.2, v:0.12, lp:300, dest:p}); });                   /* una puerta lejos */
    },
    bailanta(A){
      const pared = F('lowpass', 170, 0.8, G(0.4, A.g)), medio = F('lowpass', 650, 0.7, G(0.25, A.g));       /* lo que pasa por la pared */
      const gente = bucle(A, 'rosa', 'bandpass', 520, 0.9, 0.13, 0.2); lfo(A, 0.2, 0.05, gente.g.gain); lfo(A, 0.07, 120, gente.fl.frequency);
      const gen2 = bucle(A, 'rosa', 'bandpass', 1200, 1.4, 0.04, -0.3); lfo(A, 0.33, 0.02, gen2.g.gain);
      const pulso = 60/128, BAJO = [45, 43, 41, 40];
      ritmo(A, pulso, (t, n) => { bomboD(pared, t, n % 2 ? 0.55 : 0.75, {f:52});
        TN({t:t + pulso*0.5, f:mtof(BAJO[(n >> 3) % 4] + (n % 2 ? 7 : 0)), tipo:'sawtooth', d:pulso*0.45, v:0.35, dest:pared});
        guiro(medio, t, 0.3, pulso*0.4); guiro(medio, t + pulso*0.5, 0.2, pulso*0.12); if(n % 2) cajaG(medio, t, 0.3, {gate:0}); });
      suceso(A, 6, 16, t => { const n = 3 + (Math.random()*4 | 0);                                                          /* la gente que grita «¡uuuh!» */
        for(let i = 0; i < n; i++) vox(t + rv(0, 0.3), medio, {f:rv(170, 330), f2:rv(220, 380), pico:0.4, vocal:Math.random() < 0.5 ? 'u' : 'o', d:rv(0.8, 1.4), v:0.25, a:0.15}); });
      suceso(A, 3, 8, t => { const p = panear(A.g, rv(-0.8, 0.8)), f = rv(2600, 3400); TN({t, f, d:0.25, v:0.015, dest:p}); TN({t:t + 0.02, f:f*1.37, d:0.2, v:0.01, dest:p}); });   /* vasos */
      suceso(A, 15, 30, t => { for(let i = 0; i < 4; i++) vox(t + i*0.16, medio, {f:rv(200, 260), vocal:'a', d:0.1, v:0.2, a:0.01}); });                                    /* alguien que se ríe */
    },
    deposito(A){
      bucle(A, 'pardo', 'lowpass', 140, 0.7, 0.22, 0);
      const vi = bucle(A, 'rosa', 'bandpass', 420, 1.5, 0.06, -0.3); lfo(A, 0.05, 150, vi.fl.frequency); lfo(A, 0.11, 0.03, vi.g.gain);   /* viento entre las chapas */
      const gt = panear(A.g, 0.6); gt.connect(G(0.8, N.revFin)); ritmo(A, 1.37, t => gota(gt, t, 0.05));                                  /* la gotera de siempre */
      suceso(A, 0.7, 2.5, t => { const p = panear(A.g, rv(-0.9, 0.9)); p.connect(G(0.8, N.revFin)); gota(p, t, rv(0.03, 0.08)); });
      suceso(A, 5, 12, t => { const p = panear(A.g, rv(-0.8, 0.8)); p.connect(G(0.5, N.revFin)); crujido(p, t, 0.5); }, rv(2, 4));
      suceso(A, 10, 22, t => { const p = panear(A.g, rv(-0.9, 0.9)); p.connect(G(1, N.revFin)); metal(p, t, 0.14, rv(150, 300)); });
    },
    mansion(A){
      bucle(A, 'blanco', 'highpass', 2800, 0.5, 0.035, -0.6); bucle(A, 'blanco', 'highpass', 3100, 0.5, 0.03, 0.6, 0.93);                   /* lluvia contra los ventanales */
      bucle(A, 'rosa', 'bandpass', 1300, 0.8, 0.06, 0); bucle(A, 'pardo', 'lowpass', 300, 0.7, 0.12, 0);
      const vi = bucle(A, 'rosa', 'bandpass', 600, 5, 0.03, 0.4); lfo(A, 0.04, 250, vi.fl.frequency); lfo(A, 0.09, 0.02, vi.g.gain);         /* el viento en la hendija */
      const rel = panear(A.g, -0.4); rel.connect(G(0.6, N.revFin));
      ritmo(A, 1.0, (t, n) => { RZ({t, d:0.015, v:0.2, f:n % 2 ? 2400 : 1900, q:6, dest:rel}); TN({t, f:n % 2 ? 1200 : 950, d:0.03, v:0.04, dest:rel}); });   /* tic, tac */
      suceso(A, 40, 80, t => { for(let i = 0; i < 4; i++) campana(rel, t + i*1.1, 0.03, 392); }, rv(15, 25));
      suceso(A, 30, 60, t => trueno(G(0.5, A.g), t, 0.5), rv(10, 20));
      suceso(A, 0.2, 0.8, t => gota(panear(A.g, rv(-0.9, 0.9)), t, rv(0.01, 0.025)));
    }
  };
  function pasoAmb(){
    const now = ya();
    if(AMB){
      for(const e of AMB.ev) if(now >= e.prox){ e.prox = now + rv(e.a, e.b); try { e.fn(now + 0.05); } catch(x){ err(x); } }
      for(const r of AMB.rit){ if(r.prox < now - 0.1) r.prox = now + 0.05; let k = 0;
        while(r.prox < now + 0.25 && k++ < 8){ try { r.fn(r.prox, r.n); } catch(x){ err(x); } r.n++; r.prox += r.dt; } }
    }
    for(let i = VIEJOS.length - 1; i >= 0; i--){ const A = VIEJOS[i];
      if(now > A.fin){ for(const n of A.nodos) try { n.stop(); n.disconnect(); } catch(e){} try { A.g.disconnect(); } catch(e){} VIEJOS.splice(i, 1); } }
  }

  /* ------------------------------------------------------------ voces de diálogo */
  const VOZ = {
    norma:{f:178, onda:'sawtooth', dur:0.075, v:0.55, esc:[0, 2, 3, 5, 7, -2], q:5, tel:1},                /* señora grave, por el contestador */
    jefe:{f:84, onda:'sawtooth', dur:0.1, v:0.45, esc:[0, 1, 3, 5, -2], q:6, sucio:2.5, cae:0.9},         /* grave, amenazante */
    pibe:{f:132, onda:'triangle', dur:0.045, v:1.1, esc:[0, 3, 5], q:4},                                 /* casi no habla */
    radio:{f:220, onda:'square', dur:0.05, v:0.8, esc:[0, 5, 7, 12], q:4, radio:1}
  };
  const VOCAL = {a:'a', á:'a', à:'a', â:'a', ã:'a', e:'e', é:'e', ê:'e', i:'i', í:'i', o:'o', ó:'o', ô:'o', õ:'o', u:'u', ú:'u', ü:'u'};
  let nBlips = 0;
  function voz(texto, tipo){
    if(!listo) return;
    try {
      const ch = [...String(texto === undefined || texto === null ? '' : texto)].pop() || '';
      if(!/[a-z0-9áéíóúñüçãõâêôà]/i.test(ch) || C.state !== 'running') return;
      const now = ya(); if(now - ultBlip < 1/18) return; ultBlip = now; nBlips++;
      const P = tiene(VOZ, tipo) ? VOZ[tipo] : VOZ.pibe, t = now + 0.005, lo = ch.toLowerCase(), vc = VOCAL[lo], cod = lo.charCodeAt(0);
      const semi = P.esc[(cod*7 + 3) % P.esc.length] + (vc ? 0 : -2), f = P.f*Math.pow(2, semi/12)*rv(0.985, 1.015);
      const dur = P.dur*(vc ? 1.3 : 0.75), g = G(0, N.fx), s = oscF(P.onda, f, t, t + dur + 0.12), mix = G(1);
      if(P.cae) s.frequency.exponentialRampToValueAtTime(f*P.cae, t + dur);
      let ult = G(1);
      for(const [fr, a] of FORM[vc || 'aeiou'[cod % 5]]){ const bp = F('bandpass', fr, P.q); mix.connect(bp); bp.connect(G(a*P.q*0.6, ult)); }
      s.connect(mix);
      if(P.tel){ const hp = F('highpass', 420, 0.7), lp = F('lowpass', 3000, 0.9); ult.connect(hp); hp.connect(lp); ult = saturador(1.8); lp.connect(ult);
        RZ({t, d:dur + 0.02, v:0.02, f:4000, tipo:'highpass', dest:g}); }                                   /* el siseo de la cinta del contestador */
      if(P.radio){ const bp = F('bandpass', 1600, 1.6); ult.connect(bp); ult = bp; RZ({t, d:dur + 0.03, v:0.1, f:3200, q:0.8, dest:g}); }
      if(P.sucio){ const w = saturador(P.sucio); ult.connect(w); ult = w; }
      ult.connect(g); env(g.gain, t, 0.008, P.v, dur);
      if(!vc) RZ({t, d:0.014, v:0.06, f:P.tel ? 2600 : 3800, q:1.5, dest:g});
    } catch(e){ err(e); }
  }

  /* ------------------------------------------------------------ lento, intensidad, cinta, muerte, volumen, paso */
  function aplicarLento(){
    if(Math.abs(kLento - kAplic) < 0.004) return; kAplic = kLento;
    const now = ya(), fc = 18000*Math.pow(500/18000, kLento), dl = detL();
    N.musF.frequency.setTargetAtTime(fc, now, 0.05); N.ambF.frequency.setTargetAtTime(fc*1.2, now, 0.05);
    N.revMin.gain.setTargetAtTime(lerp(0.2, 0.5, kLento), now, 0.1);
    for(const r of OSC_M) if(r.fin > now) try { r.o.detune.setTargetAtTime(r.d0 + dl, now, 0.06); } catch(e){}
    if(AMB) for(const l of AMB.loops) try { l.s.playbackRate.setTargetAtTime(l.r*lerp(1, 0.58, kLento), now, 0.06); } catch(e){}
  }
  function lento(k){
    kLentoObj = lim(+k || 0, 0, 1); if(!listo) return;
    try { const tn = performance.now(), dt = lim((tn - tLento)/1000, 0, 0.1); tLento = tn;
      kLento += (kLentoObj - kLento)*(1 - Math.exp(-dt*7)); if(Math.abs(kLento - kLentoObj) < 0.002) kLento = kLentoObj;
      aplicarLento(); } catch(e){ err(e); }
  }
  function intensidad(k){ intenObj = lim(+k || 0, 0, 1); }
  /* la cinta de VHS: wow, flutter, siseo y un poco de agudos menos. Algunos temas ya traen su piso */
  function aplicarCinta(){
    const T = tiene(TEMAS, temaAct) ? TEMAS[temaAct] : null, k = Math.max(kCinta, (T && T.cinta) || 0);
    if(Math.abs(k - cintaAplic) < 0.003) return; cintaAplic = k; const now = ya();
    N.wowG[0].gain.setTargetAtTime(0.0024*k, now, 0.3); N.wowG[1].gain.setTargetAtTime(0.00009*k, now, 0.3); N.wowG[2].gain.setTargetAtTime(0.0035*k, now, 0.3);
    N.siseo.gain.setTargetAtTime(0.03*k, now, 0.3); N.cLp.frequency.setTargetAtTime(lerp(18000, 6000, Math.sqrt(k)), now, 0.3);
  }
  function cinta(k){ kCinta = lim(+k || 0, 0, 1); if(!listo) return; try { aplicarCinta(); } catch(e){ err(e); } }
  /* el jugador murió: la música se hunde detrás de un pasabajos y se desafina como una cinta que frena */
  function filtroMuerte(on){
    muertePed = !!on; if(!listo) return;
    try { const now = ya(), k = muertePed ? 1 : 0; if(k === kMuerte) return; kMuerte = k;
      const fr = N.muF.frequency, gg = N.muG.gain; fr.cancelScheduledValues(now); gg.cancelScheduledValues(now); fr.setValueAtTime(fr.value, now); gg.setValueAtTime(gg.value, now);
      if(k){ fr.setTargetAtTime(420, now, 0.16); gg.setTargetAtTime(0.55, now, 0.25); } else { fr.setTargetAtTime(18000, now, 0.075); gg.setTargetAtTime(1, now, 0.075); }
      const dl = detL(), tc = k ? 0.35 : 0.075;
      for(const r of OSC_M) if(r.fin > now) try { r.o.detune.setTargetAtTime(r.d0 + dl, now, tc); } catch(e){}
    } catch(e){ err(e); }
  }
  function volumen(){
    if(!listo) return;
    try { const now = ya(), m = Math.pow(lim(+AJ.musica || 0, 0, 1), 1.6), e = Math.pow(lim(+AJ.efectos || 0, 0, 1), 1.4);
      N.musV.gain.setTargetAtTime(m*0.55, now, 0.02); N.fxV.gain.setTargetAtTime(e, now, 0.02); N.ambV.gain.setTargetAtTime(e*0.8, now, 0.02); } catch(e){ err(e); }
  }
  function paso(dt){
    if(!listo) return;
    try {
      const tn = performance.now(); tPaso = tn;
      const d = lim(tPasoAnt ? (tn - tPasoAnt)/1000 : (+dt || 0.016), 0, 0.25); tPasoAnt = tn;
      if(tn - tLento > 300 && kLento > 0){ kLentoObj = 0; kLento *= Math.exp(-d*7); if(kLento < 0.003) kLento = 0; aplicarLento(); }   /* nadie llama lento(): vuelve solo */
      if(C.state !== 'running') return;
      inten += (intenObj - inten)*(1 - Math.exp(-d*1.4));
      const now = ya();
      for(const r of REPS) if(r.vivo && r.T.capas){ const kb = lerp(0.7, 1, Math.max(inten, r.T.kMin || 0));          /* con poca intensidad la base va más atrás */
        if(Math.abs(kb - (r.kb || 1)) > 0.01){ r.kb = kb; r.cap.base.gain.setTargetAtTime(kb, now, 0.35); r.gs.base.gain.setTargetAtTime(kb, now, 0.35); } }
      for(const r of REPS) if(r.vivo && r.T.capas) for(const n of CAPAS){ const v = objCapa(r.T, n);
        if(Math.abs(v - r.cv[n]) > 0.01 || (v !== r.cv[n] && (v === 0 || v === 1))){ r.cv[n] = v; r.cap[n].gain.setTargetAtTime(v, now, 0.35); r.gs[n].gain.setTargetAtTime(v, now, 0.35); } }
      bombear(); pasoAmb(); aplicarCinta();
      for(let i = REPS.length - 1; i >= 0; i--){ const r = REPS[i];
        if(!r.vivo && now > r.muere){ for(const g of r.oscs) if(g.fin > now){ g.fin = now; try { g.o.stop(); } catch(e){} } try { r.bus.disconnect(); r.gconv.disconnect(); } catch(e){} REPS.splice(i, 1); }
        else if(r.oscs.length > 300) r.oscs = r.oscs.filter(g => g.fin > now); }
      for(let i = VIVAS.length - 1; i >= 0; i--){ const v = VIVAS[i]; if(now > v.fin){ try { v.g.disconnect(); v.p.disconnect(); if(v.e) v.e.disconnect(); } catch(e){} VIVAS.splice(i, 1); } }
      if(OSC_M.length > 60) for(let i = OSC_M.length - 1; i >= 0; i--) if(OSC_M[i].fin < now) OSC_M.splice(i, 1);
    } catch(e){ err(e); }
  }
  function arrancar(){
    try {
      if(!C){ if(!armar()) return; if(temaPed !== null) musica(temaPed); if(ambPed) ambiente(ambPed); if(muertePed) filtroMuerte(true); }
      if(C.state === 'suspended' || C.state === 'interrupted') C.resume().catch(() => {});
    } catch(e){ err(e); }
  }

  return {arrancar, fx:(n, o) => fx(n, o), musica, ambiente, lento, paso, volumen, intensidad, voz, filtroMuerte, cinta,
    /* para el banco */
    _N:() => N, _ctx:() => C, _salida:() => N && N.sal, _err:ERR, _faltan:FALTAN, _vivas:() => VIVAS.length, _reps:() => REPS.map(r => r.nom + (r.vivo ? '' : '·')),
    _lista:() => Object.keys(FX), _temas:() => Object.keys(TEMAS), _ambientes:() => Object.keys(ARMA),
    _mel:() => Object.keys(TEMAS).filter(k => TEMAS[k].M).map(k => [k, TEMAS[k].M.pasos, TEMAS[k].M2 ? TEMAS[k].M2.pasos : 0, TEMAS[k].A.length*16]),
    _vivos:() => { const n = ya(); return OSC_M.filter(r => r.fin > n).length; },
    _estado:() => ({kLento, inten, kMuerte, kCinta, tema:temaAct, amb:ambAct, osc:OSC_M.length, vivas:VIVAS.length, reps:REPS.length, cinta:cintaAplic, viejos:VIEJOS.length, blips:nBlips})};
})();
