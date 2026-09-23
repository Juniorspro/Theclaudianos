/* ================================================================ sonido
   Todo sale de Web Audio, sin archivos: electro-tango noir. Tres buses (música, efectos, ambiente)
   → pasaaltos → compresor → recorte suave (nunca pasa de 0,95) → parlante. La música es un
   secuenciador de semicorcheas que programa con anticipación contra currentTime; cada tema tiene
   su tonalidad, su tempo, frases de 8 a 16 compases y capas que entran con la intensidad.
   Ninguna llamada de acá puede tirarle una excepción al juego: todo va envuelto. */
const SON = (() => {
  let C = null, N = null, RU = null, ONDA = null, listo = false;
  let temaPed = null, temaAct, ambPed = null, ambAct;              /* lo pedido antes de haber contexto */
  let kLento = 0, kLentoObj = 0, kAplic = -1, tLento = 0, inten = 0, intenObj = 0, tPaso = 0, tPasoAnt = 0, ultBlip = 0;
  const ERR = [], FALTAN = new Set();
  const err = e => { if(ERR.length < 30) ERR.push(String(e && e.stack || e)); };
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
    /* que las puntas del bucle se toquen: 20 ms de fundido contra el principio */
    const fz = Math.floor(C.sampleRate*0.02);
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
  /* lineal hasta 0,6 y después se dobla suave hasta 0,95: por acá no pasa un clip */
  function curvaRecorte(){
    const n = 4096, c = new Float32Array(n);
    for(let i = 0; i < n; i++){ const x = (i/(n - 1)*2 - 1)*2, a = Math.abs(x);
      c[i] = Math.sign(x)*(a < 0.6 ? a : 0.6 + 0.35*Math.tanh((a - 0.6)/0.35)); }
    return c;
  }
  function ondas(){
    const H = 48, re = new Float32Array(H), im = new Float32Array(H), r2 = new Float32Array(H), i2 = new Float32Array(H);
    for(let k = 1; k < H; k++) re[k] = 2/(k*Math.PI)*Math.sin(k*Math.PI*0.28);            /* pulso al 28% */
    /* lengüeta de bandoneón: impares fuertes, pares que asoman y un hueco que la hace nasal */
    const L = [0, 1, 0.55, 0.78, 0.3, 0.52, 0.34, 0.2, 0.26, 0.12, 0.16, 0.1, 0.13, 0.06, 0.09, 0.05, 0.06];
    for(let k = 1; k < H; k++) i2[k] = (L[k] !== undefined ? L[k] : 0.5/k)*(k % 7 === 0 ? 0.3 : 1);
    ONDA = {pulso:C.createPeriodicWave(re, im), cana:C.createPeriodicWave(r2, i2)};
  }
  const G = (v, dest) => { const g = C.createGain(); g.gain.value = v === undefined ? 1 : v; if(dest) g.connect(dest); return g; };
  const F = (tipo, f, q, dest) => { const x = C.createBiquadFilter(); x.type = tipo; x.frequency.value = f; if(q !== undefined) x.Q.value = q; if(dest) x.connect(dest); return x; };
  function armar(){
    const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return false;
    try { C = new AC({latencyHint:'interactive'}); } catch(e){ C = new AC(); }
    ruidos(); ondas();
    N = {};
    N.sal = G(1, C.destination);
    N.rec = C.createWaveShaper(); N.rec.curve = curvaRecorte(); N.rec.oversample = 'none'; N.rec.connect(N.sal);
    N.pre = G(0.5, N.rec);
    N.comp = C.createDynamicsCompressor();
    N.comp.threshold.value = -15; N.comp.knee.value = 10; N.comp.ratio.value = 4; N.comp.attack.value = 0.003; N.comp.release.value = 0.22;
    N.comp.connect(N.pre);
    N.hp = F('highpass', 26, 0.7, N.comp);
    N.mezcla = G(0.95, N.hp);
    /* música: bus → pasabajos del lento → volumen; la reverberación larga vuelve adentro del filtro */
    N.musV = G(0.7, N.mezcla); N.musF = F('lowpass', 18000, 0.5, N.musV);
    N.mus = G(1, N.musF);
    N.revM = C.createConvolver(); N.revM.buffer = ir(3.4, 1.6, 0.55, 0.02); N.revM.connect(N.musF);
    N.revMin = G(0.26, N.revM); N.mus.connect(N.revMin);
    /* eco de corchea con puntillo para los solos, oscureciéndose en cada vuelta */
    N.eco = G(1); N.ecoD = C.createDelay(2); N.ecoD.delayTime.value = 0.38;
    N.ecoLp = F('lowpass', 2400, 0.6); N.ecoFb = G(0.34); N.ecoW = G(0.55, N.mus);
    N.eco.connect(N.ecoD); N.ecoD.connect(N.ecoLp); N.ecoLp.connect(N.ecoFb); N.ecoFb.connect(N.ecoD); N.ecoLp.connect(N.ecoW);
    /* efectos, con su reverberación de cola */
    N.fxV = G(1, N.mezcla); N.fx = G(1, N.fxV);
    N.revF = C.createConvolver(); N.revF.buffer = ir(2.1, 2.2, 0.7, 0.008); N.revF.connect(N.fxV);
    N.revFin = G(1, N.revF);
    /* ambiente */
    N.ambV = G(0.8, N.mezcla); N.ambF = F('lowpass', 18000, 0.5, N.ambV); N.amb = G(1, N.ambF);
    /* iOS: un buffer mudo destraba la salida */
    try { const s = C.createBufferSource(); s.buffer = C.createBuffer(1, 64, C.sampleRate); s.connect(C.destination); s.start(0); } catch(e){}
    listo = true;
    volumen();
    setInterval(() => { if(listo && performance.now() - tPaso > 140) paso(0.05); }, 50);   /* por si el juego deja de llamar paso() */
    document.addEventListener('visibilitychange', () => { try {
      if(document.hidden){ if(C.state === 'running') C.suspend(); } else if(C.state !== 'closed') C.resume().catch(() => {}); } catch(e){} });
    return true;
  }

  /* ------------------------------------------------------------ piezas de síntesis */
  /* osciladores de la música y del ambiente: quedan anotados para que el lento los baje de tono */
  const OSC_M = [];
  let repAct = null;                                  /* el tema que está programando: sus osciladores se cortan al soltarlo */
  const detL = () => -kLento*190;
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
  function panear(dest, x){ const p = C.createStereoPanner(); p.pan.value = lim(x, -1, 1); p.connect(dest); return p; }

  /* ------------------------------------------------------------ instrumentos de la música */
  function bandoneon(dest, t, m, dur, v, o){
    o = o || {};
    const f = mtof(m), a = o.a || 0.035, rel = o.rel || 0.13, fin = t + Math.max(dur, 0.05), stop = fin + rel*1.7;
    const g = C.createGain(), lp = F('lowpass', 700 + v*500, 0.8), fo = F('peaking', 1150, 1.3), f2 = F('peaking', 2700, 2);
    fo.gain.value = 7; f2.gain.value = 3.5;
    /* el fuelle abre el filtro al entrar */
    lp.frequency.setValueAtTime(650 + v*500, t); lp.frequency.linearRampToValueAtTime(1500 + v*2800, t + a*2.2);
    lp.frequency.setTargetAtTime(1200 + v*1900, t + a*2.2, 0.35);
    const o1 = oscM('cana', f, t, stop, -7), o2 = oscM('cana', f, t, stop, 6);
    o1.connect(lp); o2.connect(lp); lp.connect(fo); fo.connect(f2); f2.connect(g); g.connect(dest);
    if(dur > 0.28){ const lfo = oscF('sine', rv(4.8, 5.6), t, stop), lg = G(0); lg.gain.setValueAtTime(0, t);          /* vibrato que entra tarde */
      lg.gain.linearRampToValueAtTime(o.vib || 10, t + Math.min(0.45, dur*0.8)); lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune); }
    if(o.eco) g.connect(G(o.eco, N.eco));
    adsr(g.gain, t, a, 0.3, 0.82, fin, rel, v*0.2);
  }
  function stab(dest, t, notas, dur, v){ const k = 1/Math.sqrt(notas.length); for(const m of notas) bandoneon(dest, t, m, dur, v*k, {a:0.01, rel:0.07}); }
  const PIANO = [[1, 1, 1, 'triangle'], [2.002, 0.4, 0.55], [3.007, 0.18, 0.35], [4.02, 0.08, 0.22], [5.04, 0.04, 0.15]];
  function piano(dest, t, m, dur, v){
    const f = mtof(m), br = lim((m - 36)/60, 0, 1), larga = lerp(3.4, 0.9, br), fin = t + Math.max(dur, 0.03);
    const stop = Math.min(t + larga*1.6, fin + 0.5), g = G(v*0.17, dest);
    for(const [k, a, l, tipo] of PIANO){ if(f*k > 9000) continue;
      const o = oscM(tipo || 'sine', f*k, t, stop, k === 1 ? 0 : 1.5), e = C.createGain();
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(a, t + 0.004); e.gain.setTargetAtTime(0, t + 0.004, larga*l/4.5);
      e.gain.setTargetAtTime(0, fin, 0.09); o.connect(e); e.connect(g); }
    RZ({t, d:0.012, v:v*0.05, f:Math.min(f*4, 7000), q:1.5, dest});                    /* el martillo */
  }
  function bajo(dest, t, m, dur, v, tipo){
    const f = mtof(m), fin = t + Math.max(dur, 0.04), stop = fin + 0.14, g = C.createGain(), syn = tipo === 'synth';
    const lp = F('lowpass', 800, syn ? 5 : 1.2);
    const o1 = oscM(tipo === 'tango' ? 'triangle' : 'sawtooth', f, t, stop, 0), o2 = oscM(syn ? 'square' : 'sine', f*(syn ? 0.5 : 1), t, stop, 0);
    const g2 = G(syn ? 0.35 : 0.8); o1.connect(lp); o2.connect(g2); g2.connect(lp);
    const f0 = syn ? 2600 : tipo === 'tango' ? 1300 : 500, f1 = syn ? 260 : 330;
    lp.frequency.setValueAtTime(f0*(0.6 + v*0.5), t); lp.frequency.setTargetAtTime(f1, t + 0.004, syn ? 0.05 : 0.08);
    lp.connect(g); g.connect(dest);
    adsr(g.gain, t, 0.004, tipo === 'tango' ? 0.12 : 0.2, tipo === 'tango' ? 0.35 : 0.6, fin, 0.07, v*0.42);
    if(tipo === 'tango') RZ({t, d:0.03, v:v*0.05, f:900, q:2, dest});                    /* el golpe del dedo */
  }
  function bombo(dest, t, v, o){ o = o || {};
    const f0 = o.f || 52, larga = o.larga || 0.34, g = C.createGain(), s = oscF('sine', f0*3.4, t, t + larga*1.6);
    s.frequency.exponentialRampToValueAtTime(f0, t + 0.075); env(g.gain, t, 0.002, v*0.95, larga); s.connect(g); g.connect(dest);
    RZ({t, d:0.007, v:v*0.28, f:3200, tipo:'highpass', q:0.5, dest});
  }
  function caja(dest, t, v, o){ o = o || {};
    RZ({t, d:o.larga || 0.18, v:v*0.5, f:1900, q:0.7, dest}); RZ({t, d:0.07, v:v*0.22, f:5200, tipo:'highpass', q:0.5, dest});
    TN({t, f:205, f2:165, d:0.08, v:v*0.32, tipo:'triangle', dest});
    if(o.rev) RZ({t, d:0.16, v:v*0.4, f:1800, q:0.6, dest:G(o.rev, N.revMin)});
  }
  function palmas(dest, t, v){ for(let i = 0; i < 3; i++) RZ({t:t + i*0.011, d:i < 2 ? 0.02 : 0.14, v:v*0.35, f:1250, q:1.2, dest}); }
  function hat(dest, t, v, abierto){ RZ({t, d:abierto ? 0.26 : 0.038, v:v*0.19, f:7600, tipo:'highpass', q:0.6, dest}); RZ({t, d:abierto ? 0.18 : 0.025, v:v*0.07, f:10500, q:2, dest}); }
  function escobilla(dest, t, v){ RZ({t, a:0.012, d:0.14, v:v*0.1, f:4200, f2:2400, q:0.6, col:'rosa', dest}); }
  function metal(dest, t, v, f){ f = f || 520;
    const g = C.createGain(), bp = F('bandpass', f*2.3, 7), fin = env(g.gain, t, 0.001, v*0.5, 0.24);
    for(const r of [1, 1.483, 2.17]) oscF('square', f*r, t, fin).connect(bp);
    bp.connect(g); g.connect(dest);
    RZ({t, d:0.03, v:v*0.18, f:4200, q:1, dest});
  }
  function tom(dest, t, v, f){ TN({t, f:f*1.7, f2:f, fd:0.09, d:0.36, v:v*0.6, dest}); RZ({t, d:0.05, v:v*0.12, f:1100, tipo:'lowpass', dest}); }
  function platillo(dest, t, v){ RZ({t, d:1.9, v:v*0.13, f:5200, tipo:'highpass', q:0.4, dest}); RZ({t, d:1.2, v:v*0.06, f:8200, q:3, dest}); }
  function pad(dest, t, notas, dur, v, o){
    o = o || {};
    const a = o.a || 0.5, rel = o.rel || 0.9, fin = t + dur, stop = fin + rel*1.7, fc = o.f || 1100;
    const lp = F('lowpass', fc*0.55, 0.7), g = C.createGain();
    lp.frequency.setValueAtTime(fc*0.55, t); lp.frequency.linearRampToValueAtTime(fc, t + Math.max(a, dur*0.6));
    for(const m of notas){ const f = mtof(m); oscM('sawtooth', f, t, stop, -9).connect(lp); oscM('sawtooth', f, t, stop, 10).connect(lp); }
    lp.connect(g);
    adsr(g.gain, t, a, 1, 0.85, fin, rel, v*0.11/Math.sqrt(notas.length));
    if(o.bombeo){ const b = G(1, dest); g.connect(b);                                   /* que respire con el bombo */
      for(let q = t; q < fin; q += o.bombeo){ b.gain.setValueAtTime(1, q); b.gain.linearRampToValueAtTime(0.25, q + 0.012); b.gain.linearRampToValueAtTime(1, q + o.bombeo*0.7); } }
    else g.connect(dest);
  }
  function pluck(dest, t, m, dur, v, o){ o = o || {};
    const f = mtof(m), g = C.createGain(), lp = F('lowpass', 3200, 3), fin = t + Math.max(dur, 0.03), stop = fin + 0.2;
    lp.frequency.setValueAtTime(o.f || 3400, t); lp.frequency.setTargetAtTime(500, t, 0.05);
    oscM('pulso', f, t, stop, 0).connect(lp); oscM('sawtooth', f, t, stop, 8).connect(lp);
    lp.connect(g); g.connect(dest); env(g.gain, t, 0.003, v*0.11, Math.min(dur + 0.08, 0.35));
    if(o.eco) g.connect(G(o.eco, N.eco));
  }
  function lead(dest, t, m, dur, v, o){ o = o || {};
    const f = mtof(m), g = C.createGain(), lp = F('lowpass', o.f || 3000, 1.2), fin = t + Math.max(dur, 0.05), stop = fin + 0.35;
    const a = oscM('sawtooth', f, t, stop, -8), b = oscM('sawtooth', f, t, stop, 8), c = oscM('square', f*0.5, t, stop, 0), gc = G(0.3);
    a.connect(lp); b.connect(lp); c.connect(gc); gc.connect(lp); lp.connect(g); g.connect(dest);
    if(dur > 0.25){ const l = oscF('sine', 5.4, t, stop), lg = G(0); lg.gain.setValueAtTime(0, t + 0.15); lg.gain.linearRampToValueAtTime(14, t + 0.5);
      l.connect(lg); lg.connect(a.detune); lg.connect(b.detune); }
    g.connect(G(o.eco === undefined ? 0.35 : o.eco, N.eco));
    adsr(g.gain, t, 0.015, 0.3, 0.75, fin, 0.2, v*0.09);
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
  function tocarMel(x, mel, fn){
    const evs = mel[x.cb % mel.largo]; if(!evs) return;
    for(const e of evs) if(e[0] === x.s){ const dur = e[2]*x.sp;
      if(x.v % 2 === 1 && e[2] >= 4 && x.r.rnd() < 0.45){ fn(x.t, e[1] - 1, x.sp*0.45, 0.75); fn(x.t + x.sp*0.45, e[1], dur - x.sp*0.45, 1); }  /* apoyatura cromática de abajo */
      else fn(x.t, e[1], dur, 1); }
  }

  /* ------------------------------------------------------------ los temas */
  const TEMAS = {
    /* re menor, 92: piano solo, entra el bandoneón y en la segunda vuelta contrabajo y escobilla */
    menu:{bpm:92, vol:1.5, intro:2,
      prog:'Dm Dm Gm A7 Bb Gm A7 Dm Gm C7 F Bb Edim A7 Dm A7',
      mel:'A4.6 D5.2 F5.4 E5.4 D5.8 C#5.2 D5.2 E5.4 F5.6 G5.2 A5.4 Bb5.4 A5.8 G5.4 E5.4 F5.6 D5.2 Bb4.4 D5.4 G5.6 F5.2 E5.4 D5.4 C#5.4 E5.4 A5.4 G5.4 F5.4 E5.2 D5.10 ' +
          'Bb5.6 A5.2 G5.4 D5.4 E5.6 F5.2 G5.4 Bb5.4 A5.12 G5.2 F5.2 D5.6 F5.2 Bb5.4 A5.4 G5.6 Bb5.2 G5.4 E5.4 C#5.6 E5.2 G5.4 F5.2 E5.2 D5.6 F5.2 A5.8 G5.4 F5.4 E5.4 C#5.4',
      toca(x){ const {s, t, ac, sp} = x, B = x.r.cap.base;
        if(s === 0) piano(B, t, raiz(ac, 2), sp*8, 0.6);
        if(s === 8) piano(B, t, raiz(ac, 2) + ac.iv[2], sp*8, 0.42);
        if(s % 2 === 0 && s % 8){ const vs = voces(ac, 64); piano(B, t, vs[(s/2 + x.c) % vs.length], sp*3, 0.26 + (s === 4 || s === 12 ? 0.07 : 0)); }
        if(s === 0) pad(B, t, voces(ac, 57), sp*16, 0.55, {f:850, a:0.9});
        if(!x.intro){
          tocarMel(x, this.M, (tt, m, d, k) => { bandoneon(B, tt, m, d*0.96, 0.72*k, {eco:0.16});
            if(x.v % 2 === 1 && d > sp*3) bandoneon(B, tt, m - 12, d*0.96, 0.36*k); });
          if(x.v >= 1){ if(s === 0 || s === 6 || s === 12) bajo(B, t, raiz(ac, 1) + (s === 12 ? ac.iv[2] : 0), sp*2.2, 0.5, 'tango');
            if(s === 4 || s === 12) escobilla(B, t, 0.6); if(s % 4 === 2) escobilla(B, t, 0.25); }
        } }},
    /* la menor, 118: tenso bajo la lluvia, 3-3-2 de bajo y bombo, bandoneón que entra con la acción */
    puerto:{bpm:118, vol:1, intro:2, capas:{perc:0.28, lead:0.5, extra:0.78},
      prog:'Am Am Dm E7 Am F E7 Am F G Am Am Dm E7 Am E7',
      mel:'E5.3 E5.3 E5.2 A5.4 G#5.2 A5.2 C6.6 B5.2 A5.4 E5.4 F5.3 F5.3 F5.2 D6.4 C6.2 A5.2 B5.8 G#5.4 E5.4 E5.3 E5.3 E5.2 A5.4 B5.2 C6.2 D6.6 C6.2 A5.4 F5.4 G#5.4 B5.4 D6.4 B5.4 A5.12 -.4 ' +
          'A5.3 A5.3 A5.2 C6.4 A5.4 B5.3 B5.3 B5.2 D6.4 B5.4 C6.6 E6.2 D6.4 C6.4 B5.4 A5.4 G#5.4 A5.4 F5.6 A5.2 D6.4 F6.4 E6.6 D6.2 B5.4 G#5.4 A5.6 C6.2 E6.8 D6.4 B5.4 G#5.4 E5.4',
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 1);
        if(s === 0 || s === 6 || s === 12) bombo(D.base, t, s ? 0.62 : 0.8);
        if(s === 8) caja(D.base, t, 0.4, {rev:0.4});
        if(s % 2 === 0) hat(D.base, t, s % 4 ? 0.3 : 0.55);
        if(s === 0 || s === 6 || s === 12) bajo(D.base, t, r0 + (s === 12 ? ac.iv[2] : 0) + (s === 6 && x.c % 2 ? 12 : 0), sp*(s === 12 ? 2 : 2.6), 0.75, 'synth');
        if(s === 0) pad(D.base, t, voces(ac, 55), sp*16, 0.5, {f:700, a:0.6});
        if(s % 2 === 0){ const vs = voces(ac, 69), i = [0, 1, 2, 1, 3, 2, 1, 2][s/2]; pluck(D.base, t, vs[i % vs.length] + (s === 14 ? 12 : 0), sp*1.5, 0.55, {eco:0.3}); }
        if(s === 0 || s === 8) stab(D.base, t, voces(ac, 62), sp*1.4, 0.36);
        if(x.on('perc')){ if(s % 2) hat(D.perc, t, 0.22); if(s === 3 || s === 11 || s === 15) caja(D.perc, t, 0.12);
          if(s === 4 || s === 12) stab(D.perc, t, voces(ac, 62), sp*1.2, 0.3); if(s === 14 && x.c % 4 === 3) caja(D.perc, t, 0.35); }
        if(!x.intro && x.on('lead')) tocarMel(x, this.M, (tt, m, d, k) => bandoneon(D.lead, tt, m, d*0.94, 0.78*k, {eco:0.22}));
        if(x.on('extra')){ if(s === 0 && x.cb % 4 === 0) platillo(D.extra, t, 0.7); if(s === 10) bombo(D.extra, t, 0.5);
          if(!x.intro) tocarMel(x, this.M, (tt, m, d, k) => lead(D.extra, tt, m - 12, d*0.9, 0.5*k, {f:1800})); }
      }},
    /* mi frigio, 126: fábrica, percusión de metal, prensa, vapor */
    fabrica:{bpm:126, vol:0.95, intro:2, capas:{perc:0.3, lead:0.52, extra:0.78},
      prog:'Em F Em Dm Em F G F',
      mel:'E5.2 F5.2 G5.4 F5.2 E5.2 B4.4 C5.2 D5.2 E5.4 F5.4 A5.4 G5.6 F5.2 E5.4 D5.4 F5.8 E5.4 D5.4 E5.2 F5.2 G5.4 B5.4 C6.4 A5.6 G5.2 F5.4 E5.4 D5.4 G5.4 B5.4 D6.4 C6.6 B5.2 A5.4 F5.4',
      riff:[0, 0, -1, 0, 1, -1, 0, -1, 0, 0, -1, 3, 1, -1, 0, -2],
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 1);
        if(s % 4 === 0) bombo(D.base, t, s === 0 ? 0.85 : 0.68, {f:48});
        if(s === 4 || s === 12) caja(D.base, t, 0.55, {larga:0.22, rev:0.3});
        if(s % 4 === 2) metal(D.base, t, 0.32 + (s === 14 ? 0.1 : 0), [640, 520, 700, 470][(x.c + (s >> 2)) % 4]);
        const rf = this.riff[s]; if(rf >= 0) bajo(D.base, t, r0 + [0, 1, 3, 7][rf] - (rf === 1 && ac.r !== 4 ? 1 : 0), sp*0.9, rf === 0 ? 0.72 : 0.6, 'synth');
        if(s === 0) pad(D.base, t, voces(ac, 55), sp*16, 0.45, {f:620, a:0.35});
        if(s === 0 || s === 6 || s === 12) stab(D.base, t, voces(ac, 64), sp*1.1, 0.34);
        if(x.c % 4 === 3 && s === 8) RZ({t, a:sp*6, d:sp*2, v:0.05, f:5000, tipo:'highpass', q:0.5, dest:D.base});   /* vapor */
        if(x.on('perc')){ hat(D.perc, t, s % 2 ? 0.2 : 0.35); if(s % 2 === 1 && x.r.rnd() < 0.4) metal(D.perc, t, 0.18, 900 + 300*x.r.rnd());
          if(s === 15 && x.c % 2) tom(D.perc, t, 0.5, 70); }
        if(!x.intro && x.on('lead')) tocarMel(x, this.M, (tt, m, d, k) => bandoneon(D.lead, tt, m, d*0.9, 0.78*k, {eco:0.2}));
        if(x.on('extra')){ if(s === 0 && x.cb % 4 === 0) platillo(D.extra, t, 0.6); if(s === 10 || s === 11) bombo(D.extra, t, 0.45, {f:48});
          if(s % 2 === 0){ const vs = voces(ac, 76); pluck(D.extra, t, vs[(s/2) % vs.length], sp, 0.45, {eco:0.25}); } }
      }},
    /* fa# menor, 132: synthwave de rascacielos, con el bandoneón de contracanto */
    torre:{bpm:132, vol:0.95, intro:2, capas:{perc:0.28, lead:0.5, extra:0.8},
      prog:'F#m D A E F#m D E C#',
      mel:'C#6.6 A5.2 F#5.4 C#6.4 D6.6 C#6.2 A5.4 F#5.4 E6.6 C#6.2 A5.4 E6.4 B5.8 G#5.4 E5.4 F#6.6 E6.2 C#6.4 A5.4 D6.4 F#6.4 E6.4 D6.4 E6.6 D6.2 C#6.4 B5.4 C#6.12 B5.2 G#5.2',
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 1);
        if(s % 4 === 0) bombo(D.base, t, 0.8, {f:50});
        if(s === 4 || s === 12){ caja(D.base, t, 0.5, {rev:0.7}); palmas(D.base, t, 0.4); }
        if(s % 2 === 0) bajo(D.base, t, r0 + (s % 4 === 2 ? 12 : 0), sp*1.6, 0.65, 'synth');
        if(s === 0) pad(D.base, t, voces(ac, 60), sp*16, 0.7, {f:1900, a:0.2, bombeo:sp*4});
        { const vs = voces(ac, 72), i = [0, 1, 2, 3, 2, 1][s % 6]; pluck(D.base, t, vs[i % vs.length] + (s >= 8 ? 12 : 0), sp*0.9, 0.4, {eco:0.32, f:2600}); }
        if(x.on('perc')){ hat(D.perc, t, s % 4 === 2 ? 0.45 : 0.22, s % 4 === 2); if(s === 0 && x.cb % 4 === 0) platillo(D.perc, t, 0.6); if(s === 14 && x.c % 2) tom(D.perc, t, 0.5, 90); }
        if(!x.intro && x.on('lead')) tocarMel(x, this.M, (tt, m, d, k) => lead(D.lead, tt, m, d*0.92, 0.85*k));
        if(!x.intro && x.on('extra')) tocarMel(x, this.M, (tt, m, d, k) => bandoneon(D.extra, tt, m - 12, d*0.92, 0.6*k, {eco:0.15}));
      }},
    /* do menor, 140: el jefe. Coro, bandoneón feroz, doble bombo, timbales */
    jefe:{bpm:140, vol:0.9, intro:2, capas:{perc:0.2, lead:0.4, extra:0.72},
      prog:'Cm Ab Fm G Cm Ab Bb G',
      mel:'G5.3 G5.3 G5.2 C6.4 Eb6.4 C6.6 Bb5.2 Ab5.4 C6.4 F6.6 Eb6.2 D6.4 C6.4 B5.8 D6.4 G5.4 G5.3 G5.3 G5.2 Eb6.4 G6.4 F6.6 Eb6.2 C6.4 Ab5.4 D6.4 F6.4 Bb6.4 Ab6.4 G6.6 F6.2 D6.4 B5.4',
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 1), g7 = ac.r === 7;
        if(s === 0 || s === 6 || s === 8 || s === 12) bombo(D.base, t, s === 0 ? 0.9 : 0.72, {f:46});
        if(s === 4 || s === 12) caja(D.base, t, 0.6, {rev:0.5});
        if(s % 2 === 0) hat(D.base, t, 0.3);
        bajo(D.base, t, r0 + (s % 8 === 7 ? 12 : 0), sp*0.85, [0, 6, 12].includes(s) ? 0.85 : 0.55, 'synth');
        if(s === 0) coro(D.base, t, voces(ac, g7 ? 62 : 60), sp*16, 0.9);
        if(s === 0 || s === 6 || s === 12) stab(D.base, t, voces(ac, 64).concat(g7 ? [71] : []), sp*1.3, 0.46);
        if(s === 0 && x.c % 2 === 0) tom(D.base, t, 0.7, 55);
        if(x.on('perc')){ if(s % 2) hat(D.perc, t, 0.24); if(s === 14 || s === 15) bombo(D.perc, t, 0.55, {f:46});
          if(x.c % 4 === 3 && s >= 12) tom(D.perc, t, 0.55, [110, 90, 75, 60][s - 12]);
          if(s === 0 && x.cb % 4 === 0) platillo(D.perc, t, 0.8); }
        if(!x.intro && x.on('lead')) tocarMel(x, this.M, (tt, m, d, k) => bandoneon(D.lead, tt, m, d*0.93, 0.85*k, {eco:0.2}));
        if(!x.intro && x.on('extra')){ tocarMel(x, this.M, (tt, m, d, k) => lead(D.extra, tt, m + 12, d*0.9, 0.55*k, {f:3600}));
          if(s === 0) coro(D.extra, t, [raiz(ac, 4) + 12], sp*16, 0.7, 'o'); if(s % 4 === 2) metal(D.extra, t, 0.2, 380); }
      }},
    /* dron de cinemática: re grave, latido, reloj y un bandoneón que aparece lejos */
    cine:{bpm:64, vol:1.2, intro:0, prog:'Dm Dm Bb A Dm Dm Gm A',
      toca(x){ const {s, t, ac, sp, c} = x, B = x.r.cap.base;
        if(s === 0 && c % 4 === 0) pad(B, t, [26, 33, 38], sp*64, 1.1, {f:420, a:2.5, rel:2.6});
        if(s === 0 && c % 4 === 2) pad(B, t, [raiz(ac, 2), raiz(ac, 2) + 7], sp*32, 0.8, {f:300, a:2, rel:2.4});
        if(s === 0 || s === 3){ const g = G(0, B); env(g.gain, t, 0.01, s ? 0.3 : 0.5, 0.5); oscM('sine', 48, t, t + 0.8, 0).connect(g); }   /* latido */
        if(s % 4 === 0) RZ({t, d:0.012, v:0.035, f:3800, q:4, dest:B});                                                                      /* el reloj */
        if(s === 0 && c % 2 === 1) piano(B, t, 38, sp*16, 0.5);
        if(s === 0 && c % 8 === 4) bandoneon(B, t, 69, sp*28, 0.45, {a:1.2, rel:1.4, eco:0.35});
        if(s === 0 && c % 8 === 6) bandoneon(B, t, 70, sp*28, 0.42, {a:1.2, rel:1.5, eco:0.35});
        if(s === 0 && c % 4 === 3){ const g = G(0, B); adsr(g.gain, t, sp*10, 1, 1, t + sp*14, 1.2, 0.012);                                  /* segunda menor arriba */
          oscM('sine', mtof(85), t, t + sp*16 + 2, 0).connect(g); oscM('sine', mtof(86), t, t + sp*16 + 2, 0).connect(g); }
      }},
    /* créditos: sol mayor, 84, emotivo */
    fin:{bpm:84, vol:1.1, intro:2,
      prog:'G D Em C G D C D Em C G D C D G G',
      mel:'D5.6 G5.2 B5.4 A5.4 A5.6 F#5.2 D5.8 E5.6 G5.2 B5.4 D6.4 C6.8 B5.4 A5.4 B5.6 A5.2 G5.4 D5.4 F#5.6 A5.2 D6.8 E6.6 D6.2 C6.4 B5.4 A5.12 -.4 ' +
          'B5.6 C6.2 B5.4 G5.4 E6.6 D6.2 C6.4 E6.4 D6.6 B5.2 G5.4 B5.4 A5.8 F#5.4 A5.4 G5.6 A5.2 B5.4 C6.4 D6.6 E6.2 F#6.4 A6.4 G6.10 D6.2 B5.4 G5.16',
      toca(x){ const {s, t, ac, sp} = x, B = x.r.cap.base;
        if(s === 0) piano(B, t, raiz(ac, 2), sp*16, 0.55);
        if(s % 2 === 0 && s){ const vs = voces(ac, 67); piano(B, t, vs[[0, 1, 2, 1, 0, 2, 1][s/2 - 1] % vs.length] + (s === 8 ? 12 : 0), sp*4, 0.28); }
        if(s === 0) pad(B, t, voces(ac, 60), sp*16, 0.6, {f:1300, a:1});
        if(!x.intro){ tocarMel(x, this.M, (tt, m, d, k) => { bandoneon(B, tt, m, d*0.96, 0.7*k, {eco:0.24}); if(x.v % 2) piano(B, tt, m + 12, d, 0.2*k); });
          if(s === 0 || s === 8) bajo(B, t, raiz(ac, 1) + (s ? ac.iv[2] : 0), sp*6, 0.45, 'tango');
          if(x.v >= 1){ if(s === 4 || s === 12) escobilla(B, t, 0.7); if(s === 0) bombo(B, t, 0.35, {f:55, larga:0.4}); } }
      }},
    /* los dos jingles: se programan enteros y no repiten */
    victoria:{bpm:150, vol:1, dur:3.6, jingle(r, t){ const B = r.cap.base, q = 60/150/4;
      [69, 74, 78, 81].forEach((m, i) => { bandoneon(B, t + i*q, m, q*0.9, 0.7, {a:0.01}); pluck(B, t + i*q, m + 12, q, 0.4, {eco:0.3}); });
      const t2 = t + 4*q; bandoneon(B, t2, 86, 2.2, 0.8, {eco:0.3, rel:0.5}); bandoneon(B, t2, 81, 2.2, 0.5, {rel:0.5}); lead(B, t2, 74, 2.1, 0.6);
      pad(B, t2, [62, 66, 69, 74], 2.3, 0.8, {f:2400, a:0.05, rel:1}); piano(B, t2, 38, 2.6, 0.6); piano(B, t2, 50, 2.6, 0.4);
      bombo(B, t2, 0.8); platillo(B, t2, 0.8); for(let i = 0; i < 6; i++) tom(B, t + i*q*0.5, 0.25 + i*0.06, 80);
      [98, 102, 105].forEach((m, i) => TN({t:t2 + 0.1 + i*0.09, f:mtof(m), d:0.9, v:0.05, dest:B})); }},
    muerte:{bpm:70, vol:1.1, dur:4.2, jingle(r, t){ const B = r.cap.base;
      [[69, 0, 0.45], [67, 0.45, 0.45], [65, 0.9, 0.45], [64, 1.35, 0.7]].forEach(([m, d, l]) => bandoneon(B, t + d, m, l*0.95, 0.65, {eco:0.3}));
      const t2 = t + 2.1; bandoneon(B, t2, 62, 1.9, 0.6, {rel:0.8, eco:0.3}); pad(B, t2, [50, 53, 57], 2.2, 0.8, {f:700, a:0.3, rel:1.4});
      piano(B, t2, 26, 2.2, 0.7); piano(B, t2, 38, 2.2, 0.4); bombo(B, t2, 0.6, {f:40, larga:0.8});
      const g = G(0, B); adsr(g.gain, t2 + 0.8, 0.3, 1, 1, t2 + 1.9, 0.8, 0.015); const o = oscM('sine', mtof(74), t2 + 0.8, t2 + 3.4, 0);
      o.frequency.exponentialRampToValueAtTime(mtof(71), t2 + 2.6); o.connect(g); }}
  };
  for(const k in TEMAS){ const T = TEMAS[k]; if(T.prog) T.A = T.prog.split(' ').map(acorde); if(T.mel) T.M = melodia(T.mel); }

  /* ------------------------------------------------------------ secuenciador */
  const REPS = [], CAPAS = ['perc', 'lead', 'extra'], CAPA0 = {perc:0.3, lead:0.55, extra:0.8};
  const objCapa = (T, n) => suave(lim((inten - (T.capas || CAPA0)[n])/0.2, 0, 1));
  let semilla = 7;
  function nuevoRep(nom, entra){
    const T = TEMAS[nom], now = ya();
    const r = {nom, T, paso:0, t:now + 0.08, vivo:true, muere:0, cap:{}, cv:{}, oscs:[], rnd:mulberry(semilla++*977 + 13)};
    r.bus = G(0, N.mus); r.bus.gain.setValueAtTime(0.0001, now); r.bus.gain.linearRampToValueAtTime(T.vol || 1, now + entra);
    r.cap.base = G(1, r.bus);
    for(const n of CAPAS){ r.cv[n] = T.capas ? objCapa(T, n) : 0; r.cap[n] = G(r.cv[n], r.bus); }
    r.on = n => r.cv[n] > 0.004 || objCapa(T, n) > 0.004;
    N.ecoD.delayTime.setTargetAtTime(60/T.bpm*0.75, now, 0.1);
    if(T.jingle){ repAct = r; try { T.jingle(r, r.t); } finally { repAct = null; } r.vivo = false; r.muere = r.t + T.dur + 2.5; }
    return r;
  }
  function soltar(r, fund){ const now = ya(), p = r.bus.gain;
    p.cancelScheduledValues(now); p.setValueAtTime(Math.max(p.value, 0.0001), now); p.linearRampToValueAtTime(0.0001, now + fund);
    r.vivo = false; r.muere = Math.min(r.muere || Infinity, now + fund + 0.2); }
  const durPaso = r => 60/r.T.bpm/4*(1 + 0.42*kLento);
  function bombear(){
    const now = ya(), hasta = now + 0.12;
    for(const r of REPS){
      if(r.T.jingle || (!r.vivo && now > r.muere - 0.2)) continue;
      if(r.t < now - 0.06) r.t = now + 0.02;                  /* se trabó el cuadro: no se programa en el pasado */
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
    temaPed = tema || null; if(!listo) return;
    try {
      if((tema || null) === temaAct) return; temaAct = tema || null;
      const corto = tema === 'victoria' || tema === 'muerte';
      for(const r of REPS) if(r.vivo || r.T.jingle) soltar(r, corto ? 0.35 : 1.5);
      if(tema && TEMAS[tema]) REPS.push(nuevoRep(tema, corto ? 0.02 : 1.5));
    } catch(e){ err(e); }
  }

  /* ------------------------------------------------------------ efectos */
  const FXM = {
    disparo:{max:4, vol:0.62, rev:0.34}, doble:{max:2, vol:0.58, rev:0.32}, escopeta:{max:3, vol:0.72, rev:0.36}, subfusil:{max:5, vol:0.5, rev:0.22},
    rifle:{max:2, vol:0.72, rev:0.5}, bala_enemiga:{max:4, vol:0.46, rev:0.32}, zumbido_bala:{max:3, vol:0.7, rev:0.08}, rebote:{max:3, vol:0.36, rev:0.3},
    carne:{max:4, vol:0.62, rev:0.08}, cabeza:{max:3, vol:0.62, rev:0.14}, muerte:{max:3, vol:0.55, rev:0.2}, vidrio:{max:2, vol:0.5, rev:0.3},
    explosion:{max:2, vol:0.95, rev:0.42}, madera:{max:3, vol:0.62, rev:0.2}, salto:{max:2, vol:0.62}, voltereta:{max:2, vol:0.8},
    aterriza:{max:2, vol:0.5}, desliza:{max:2, vol:0.7}, pared:{max:2, vol:0.42}, planeo:{max:1, vol:0.62, rev:0.3}, sale_lento:{max:1, vol:0.5, rev:0.25, ui:1},
    herido:{max:2, vol:0.6, rev:0.05}, corazon:{max:1, vol:0.75, ui:1}, alerta:{max:3, vol:0.4, rev:0.22}, mult:{max:2, vol:0.5, rev:0.15, ui:1},
    estilo:{max:2, vol:0.34, rev:0.25, ui:1}, estrella:{max:3, vol:0.4, rev:0.3, ui:1}, puerta:{max:1, vol:0.5, rev:0.35}, boton:{max:2, vol:0.45, ui:1},
    clic:{max:3, vol:0.3, ui:1}, atras:{max:2, vol:0.32, ui:1}, desliza_menu:{max:2, vol:0.7, ui:1}, mateo:{max:2, vol:0.46, rev:0.1},
    risa_jefe:{max:1, vol:0.62, rev:0.35}, recarga:{max:2, vol:0.46, rev:0.1}, caja:{max:3, vol:0.52, rev:0.15}, alambre:{max:2, vol:0.42, rev:0.25},
    puntos:{max:3, vol:0.2, ui:1}, titulo:{max:1, vol:0.8, rev:0.5, ui:1}, pagina:{max:2, vol:0.85, ui:1}, trueno:{max:2, vol:0.8, rev:0.4},
    helicoptero:{max:1, vol:0.6, rev:0.18}, chapa:{max:3, vol:0.45, rev:0.25}, ultima:{max:1, vol:0.7, rev:0.45}
  };
  /* los nombres que el juego ya usa: van al efecto nuevo con su variante */
  const ALIAS = {tiro:['disparo'], rebota:['rebote'], cae:['aterriza'], muere:['muerte', {heroe:1}], muere_enem:['muerte'],
    escopetazo:['escopeta', {lejos:1}], tiro_enem:['bala_enemiga']};
  /* un tiro: chasquido, cuerpo, soplido y golpe grave. lejos: pasado por un pasabajos */
  function tiro(t, k, d, o){ const lp = o.lejos ? F('lowpass', 2400, 0.6, d) : d, v = o.v || 1;
    RZ({t, d:0.012, v:0.9*v, f:3600*k, tipo:'highpass', q:0.7, dest:lp});
    RZ({t, d:o.cuerpo || 0.09, v:0.85*v, f:1400*k, f2:480*k, q:0.9, dest:lp});
    RZ({t, d:o.cola || 0.32, v:0.32*v, f:1000*k, f2:180, tipo:'lowpass', col:'rosa', dest:lp});
    TN({t, f:175*k, f2:46*k, fd:0.08, d:o.grave || 0.13, v:0.95*v, dest:lp});
  }
  const FX = {
    disparo(t, o, d){ const k = o.tono; tiro(t, k, d, {}); TN({t:t + 0.05, f:3100*k, tipo:'square', d:0.012, v:0.05, dest:d}); return 0.6; },
    doble(t, o, d){ const k = o.tono; tiro(t, k, panear(d, -0.35), {v:0.8}); tiro(t + 0.016, k*1.05, panear(d, 0.35), {v:0.8}); return 0.6; },
    subfusil(t, o, d){ const k = o.tono*rv(0.96, 1.06); tiro(t, k*1.15, d, {cuerpo:0.05, cola:0.14, grave:0.08, v:0.85});
      TN({t:t + 0.02, f:2400*k, tipo:'square', d:0.008, v:0.04, dest:d}); return 0.3; },
    escopeta(t, o, d){ const k = o.tono, lp = o.lejos ? F('lowpass', 2000, 0.6, d) : d;
      RZ({t, d:0.02, v:1, f:2600*k, tipo:'highpass', q:0.5, dest:lp}); RZ({t, d:0.26, v:0.9, f:3000*k, f2:300, tipo:'lowpass', q:0.8, col:'rosa', dest:lp});
      RZ({t, d:0.12, v:0.6, f:900*k, q:0.6, dest:lp}); TN({t, f:130*k, f2:34, fd:0.16, d:0.3, v:1, dest:lp});
      if(!o.lejos){ /* la corredera: atrás y adelante */
        RZ({t:t + 0.34, d:0.05, v:0.3, f:1800, q:2, dest:d}); TN({t:t + 0.34, f:420, tipo:'square', lp:1500, d:0.03, v:0.1, dest:d});
        RZ({t:t + 0.5, d:0.05, v:0.35, f:1400, q:2, dest:d}); TN({t:t + 0.5, f:320, tipo:'square', lp:1300, d:0.035, v:0.12, dest:d}); }
      return 0.9; },
    rifle(t, o, d){ const k = o.tono, lp = o.lejos ? F('lowpass', 3000, 0.6, d) : d;
      RZ({t, d:0.006, v:1, f:4200*k, tipo:'highpass', q:0.5, dest:lp}); RZ({t, d:0.05, v:0.8, f:2200*k, q:0.7, dest:lp});
      RZ({t, a:0.004, d:0.55, v:0.45, f:1400*k, f2:120, tipo:'lowpass', col:'rosa', dest:lp}); TN({t, f:150*k, f2:38, fd:0.12, d:0.38, v:1, dest:lp});
      RZ({t:t + 0.38, d:0.5, v:0.22, f:800, f2:150, tipo:'lowpass', col:'rosa', dest:F('lowpass', 900, 0.6, d)});   /* el eco del cerro */
      RZ({t:t + 0.62, d:0.02, v:0.25, f:2600, q:3, dest:d}); RZ({t:t + 0.8, d:0.025, v:0.28, f:1900, q:3, dest:d}); return 1.4; },   /* cerrojo */
    bala_enemiga(t, o, d){ tiro(t, o.tono*0.9, d, {lejos:1, v:0.85, cola:0.36}); return 0.6; },
    zumbido_bala(t, o, d){ const k = o.tono, p = C.createStereoPanner(), dir = (o.x || 0) >= 0 ? 1 : -1;
      p.pan.setValueAtTime(-dir*0.8, t); p.pan.linearRampToValueAtTime(dir*0.8, t + 0.2); p.connect(d);
      RZ({t, a:0.06, d:0.14, v:0.5, f:3400*k, f2:800*k, fd:0.2, q:4, dest:p}); TN({t, a:0.05, f:1300*k, f2:620*k, fd:0.2, d:0.14, v:0.08, dest:p}); return 0.3; },
    rebote(t, o, d){ const k = o.tono*rv(0.9, 1.15), g = C.createGain(), s = oscF('sine', 2600*k, t, t + 0.5), l = oscF('sine', 38, t, t + 0.5), lg = G(90*k);
      s.frequency.exponentialRampToValueAtTime(1350*k, t + 0.4); l.connect(lg); lg.connect(s.frequency); env(g.gain, t, 0.004, 0.32, 0.36); s.connect(g); g.connect(d);
      RZ({t, d:0.015, v:0.6, f:3800*k, q:1.5, dest:d}); TN({t, f:4400*k, d:0.12, v:0.06, dest:d}); return 0.55; },
    chapa(t, o, d){ const k = o.tono*rv(0.92, 1.08); RZ({t, d:0.02, v:0.7, f:3000*k, q:1, dest:d});
      [1, 2.76, 5.4, 8.9].forEach((r, i) => TN({t, f:420*k*r, d:0.5/(i + 1) + 0.1, v:0.2/(i + 1), dest:d})); return 0.7; },
    carne(t, o, d){ const k = o.tono*rv(0.92, 1.08);
      RZ({t, d:0.07, v:0.9, f:900*k, tipo:'lowpass', q:0.8, col:'rosa', dest:d}); TN({t, f:110*k, f2:48, fd:0.06, d:0.12, v:0.8, dest:d});
      RZ({t:t + 0.01, d:0.11, v:0.4, f:700*k, f2:260*k, q:3, dest:d}); return 0.25; },
    cabeza(t, o, d){ FX.carne(t, o, d);
      RZ({t, d:0.05, v:0.7, f:2400*o.tono, q:1.5, dest:d}); RZ({t:t + 0.02, d:0.04, v:0.4, f:3800*o.tono, q:2, dest:d});
      TN({t:t + 0.06, f:1568, d:0.35, v:0.14, dest:d}); TN({t:t + 0.12, f:2093, d:0.5, v:0.13, dest:d}); TN({t:t + 0.12, f:4186, d:0.2, v:0.03, dest:d}); return 0.7; },
    muerte(t, o, d){ const k = o.tono*(o.heroe ? 0.85 : rv(0.9, 1.15)), g = C.createGain(), s = oscF('sawtooth', 230*k, t, t + 0.7);
      const f1 = F('bandpass', 520, 5), f2 = F('bandpass', 950, 6), dur = o.heroe ? 0.55 : 0.36;
      s.frequency.linearRampToValueAtTime(260*k, t + 0.05); s.frequency.exponentialRampToValueAtTime(120*k, t + dur);
      s.connect(f1); s.connect(f2); f1.connect(g); f2.connect(g); g.connect(d); adsr(g.gain, t, 0.02, 0.2, 0.7, t + dur - 0.08, 0.12, 0.9);
      RZ({t, a:0.02, d:dur*0.8, v:0.08, f:1600, q:1, dest:d});                                 /* el aire del quejido */
      const tc = t + dur + 0.05; RZ({t:tc, d:0.14, v:0.8, f:500, tipo:'lowpass', col:'rosa', dest:d}); TN({t:tc, f:90, f2:45, d:0.18, v:0.7, dest:d});   /* y la caída */
      RZ({t:tc + 0.12, d:0.08, v:0.35, f:380, tipo:'lowpass', col:'rosa', dest:d});
      if(o.heroe) TN({t:tc, a:0.05, f:3700, d:1.4, v:0.05, dest:d}); return tc - t + 1.5; },
    vidrio(t, o, d){ const k = o.tono; RZ({t, d:0.16, v:0.9, f:3200*k, tipo:'highpass', q:0.6, dest:d}); RZ({t, d:0.06, v:0.6, f:1500*k, q:1, dest:d});
      for(let i = 0; i < 28; i++){ const tt = t + Math.pow(Math.random(), 1.7)*0.75;                /* la cascada de pedacitos */
        TN({t:tt, f:rv(2600, 8200)*k, d:rv(0.03, 0.11), v:rv(0.04, 0.12)*(1 - (tt - t)*0.8), tipo:Math.random() < 0.5 ? 'sine' : 'triangle', dest:panear(d, rv(-0.5, 0.5))}); }
      return 1.0; },
    explosion(t, o, d){ const k = o.tono;
      RZ({t, d:0.05, v:1, f:2000*k, tipo:'highpass', q:0.5, dest:d}); TN({t, f:95*k, f2:26, fd:0.9, d:1.3, v:1, dest:d});
      RZ({t, a:0.01, d:1.6, v:0.9, f:1400*k, f2:130, fd:1.2, tipo:'lowpass', q:0.8, col:'pardo', dest:d});
      RZ({t, d:0.6, v:0.5, f:700*k, f2:200, tipo:'lowpass', col:'rosa', dest:d});
      for(let i = 0; i < 12; i++) RZ({t:t + 0.06 + Math.random()*0.5, d:rv(0.02, 0.06), v:rv(0.15, 0.4), f:rv(400, 2600), q:2, dest:d});   /* crepitar */
      for(let i = 0; i < 10; i++){ const tt = t + 0.4 + Math.random()*1.3, p = panear(d, rv(-0.7, 0.7));                                 /* escombros que caen */
        RZ({t:tt, d:rv(0.03, 0.09), v:rv(0.06, 0.2), f:rv(600, 3000), q:3, dest:p}); if(Math.random() < 0.4) TN({t:tt, f:rv(90, 180), d:0.08, v:0.12, dest:p}); }
      return 2.2; },
    madera(t, o, d){ const k = o.tono*rv(0.92, 1.08); RZ({t, d:0.09, v:0.85, f:900*k, q:1.2, dest:d}); TN({t, f:190*k, f2:120*k, d:0.12, v:0.5, tipo:'triangle', dest:d});
      TN({t, f:110, f2:55, d:0.15, v:0.5, dest:d});
      for(let i = 0; i < 7; i++) RZ({t:t + 0.02 + Math.random()*0.22, d:rv(0.01, 0.035), v:rv(0.12, 0.35), f:rv(1200, 3600), q:3, dest:d});   /* astillas */
      return 0.5; },
    caja(t, o, d){ const k = o.tono*rv(0.9, 1.1); RZ({t, d:0.08, v:0.7, f:700*k, q:1.4, dest:d}); TN({t, f:230*k, f2:170*k, d:0.1, v:0.45, tipo:'triangle', dest:d});
      RZ({t:t + 0.06, d:0.04, v:0.2, f:1800, q:2, dest:d}); return 0.3; },
    salto(t, o, d){ const k = o.tono; RZ({t, a:0.02, d:0.12, v:0.5, f:700*k, f2:1700*k, q:1.2, col:'rosa', dest:d}); TN({t, f:140*k, f2:220*k, d:0.06, v:0.15, dest:d}); return 0.25; },
    voltereta(t, o, d){ const k = o.tono, p = C.createStereoPanner(); p.pan.setValueAtTime(-0.4, t); p.pan.linearRampToValueAtTime(0.4, t + 0.3); p.connect(d);
      RZ({t, a:0.14, d:0.2, v:0.6, f:400*k, f2:2200*k, fd:0.16, q:1.6, col:'rosa', dest:p}); RZ({t:t + 0.16, a:0.02, d:0.16, v:0.4, f:1800*k, f2:500*k, fd:0.16, q:1.4, col:'rosa', dest:p}); return 0.45; },
    aterriza(t, o, d){ const k = o.tono; RZ({t, d:0.1, v:0.8, f:420*k, tipo:'lowpass', col:'rosa', dest:d}); TN({t, f:95*k, f2:50, d:0.12, v:0.6, dest:d});
      RZ({t, d:0.07, v:0.25, f:2200*k, q:1.2, dest:d}); return 0.25; },
    desliza(t, o, d){ const k = o.tono, g = G(0.75, d), l = oscF('sine', 13, t, t + 0.8), lg = G(0.25); l.connect(lg); lg.connect(g.gain);
      RZ({t, a:0.03, d:0.6, v:0.55, f:1700*k, f2:900*k, q:1, col:'rosa', dest:g}); RZ({t, a:0.03, d:0.5, v:0.4, f:260*k, tipo:'lowpass', col:'pardo', dest:g}); return 0.85; },
    pared(t, o, d){ const k = o.tono; RZ({t, d:0.06, v:0.6, f:500*k, tipo:'lowpass', col:'rosa', dest:d}); RZ({t:t + 0.02, a:0.02, d:0.18, v:0.3, f:2400*k, f2:1300*k, q:1.4, dest:d});
      TN({t, f:130*k, f2:80, d:0.08, v:0.35, dest:d}); return 0.3; },
    planeo(t, o, d){ const k = o.tono; RZ({t, a:0.03, d:0.55, v:0.7, f:3400*k, f2:280*k, fd:0.5, q:1.3, col:'rosa', dest:d});
      TN({t, f:420*k, f2:38, fd:0.55, d:0.7, v:0.55, dest:d}); TN({t:t + 0.08, f:70, f2:32, d:0.9, v:0.8, dest:d});
      RZ({t:t + 0.06, d:0.9, v:0.3, f:300, tipo:'lowpass', col:'pardo', dest:d}); return 1.3; },
    sale_lento(t, o, d){ const k = o.tono; TN({t, a:0.15, f:60*k, f2:340*k, fd:0.3, d:0.12, v:0.45, dest:d});
      RZ({t, a:0.25, d:0.1, v:0.55, f:300*k, f2:3600*k, fd:0.3, q:1.3, col:'rosa', dest:d}); return 0.5; },
    herido(t, o, d){ const k = o.tono; RZ({t, d:0.12, v:0.9, f:600*k, tipo:'lowpass', col:'rosa', dest:d}); TN({t, f:120*k, f2:50, d:0.18, v:0.8, dest:d});
      RZ({t, d:0.05, v:0.35, f:2000*k, q:1, dest:d}); TN({t:t + 0.04, a:0.03, f:3800*k, d:1.3, v:0.07, dest:d}); TN({t:t + 0.04, a:0.03, f:3860*k, d:1.1, v:0.035, dest:d}); return 1.7; },
    corazon(t, o, d){ const k = o.tono; TN({t, f:70*k, f2:40, fd:0.08, d:0.16, v:0.9, lp:180, dest:d}); TN({t:t + 0.19, f:62*k, f2:38, fd:0.08, d:0.2, v:0.7, lp:160, dest:d}); return 0.5; },
    alerta(t, o, d){ const k = o.tono; for(const [f, dt] of [[1319, 0], [1976, 0.075]]){ TN({t:t + dt, f:f*k, tipo:'square', lp:4200, d:0.1, v:0.18, dest:d}); TN({t:t + dt, f:f*k*2, d:0.08, v:0.06, dest:d}); }
      RZ({t, d:0.04, v:0.15, f:5000, tipo:'highpass', dest:d}); return 0.4; },
    mult(t, o, d){ const n = lim((o.n | 0) || 2, 2, 12), f = 784*Math.pow(2, (n - 2)*2/12)*o.tono;
      TN({t, f, tipo:'square', lp:5000, d:0.08, v:0.12, dest:d}); TN({t:t + 0.05, f:f*1.5, tipo:'square', lp:5000, d:0.14, v:0.12, dest:d}); TN({t:t + 0.05, f:f*3, d:0.1, v:0.05, dest:d}); return 0.35; },
    estilo(t, o, d){ const k = o.tono; [72, 76, 79, 84, 88].forEach((m, i) => { TN({t:t + i*0.022, f:mtof(m)*k, tipo:'triangle', d:0.55, v:0.12, dest:d}); TN({t:t + i*0.022, f:mtof(m)*k*2, d:0.3, v:0.04, dest:d}); });
      RZ({t, d:0.4, v:0.08, f:9000, q:2, dest:d}); return 0.8; },
    estrella(t, o, d){ const n = lim((o.n | 0) || 1, 1, 3), m = [76, 79, 84][n - 1], k = o.tono;
      TN({t, f:mtof(m)*k, d:0.9, v:0.2, dest:d}); TN({t, f:mtof(m + 12)*k, d:0.5, v:0.07, tipo:'triangle', dest:d}); TN({t, f:mtof(m)*k*2.76, d:0.25, v:0.03, dest:d});
      RZ({t, d:0.25, v:0.08, f:8500, q:3, dest:d}); if(n === 3) [64, 67, 72].forEach((q, i) => TN({t:t + 0.08 + i*0.03, f:mtof(q)*k, d:1.1, v:0.09, tipo:'triangle', dest:d}));
      return 1.3; },
    puerta(t, o, d){ const k = o.tono; RZ({t, a:0.08, d:0.4, v:0.35, f:500, f2:1800, q:1, col:'rosa', dest:d}); TN({t, f:80, f2:50, d:0.2, v:0.4, dest:d});
      TN({t:t + 0.12, f:mtof(74)*k, d:0.6, v:0.14, tipo:'triangle', dest:d}); TN({t:t + 0.26, f:mtof(81)*k, d:0.9, v:0.14, tipo:'triangle', dest:d}); TN({t:t + 0.26, f:mtof(93)*k, d:0.5, v:0.04, dest:d}); return 1.3; },
    boton(t, o, d){ const k = o.tono; RZ({t, d:0.01, v:0.35, f:4000, q:1, dest:d}); TN({t, f:880*k, f2:1100*k, fd:0.04, d:0.07, v:0.2, tipo:'triangle', dest:d}); return 0.15; },
    clic(t, o, d){ RZ({t, d:0.008, v:0.4, f:3200*o.tono, q:2, dest:d}); TN({t, f:1500*o.tono, d:0.02, v:0.1, dest:d}); return 0.08; },
    atras(t, o, d){ const k = o.tono; TN({t, f:660*k, f2:420*k, fd:0.09, d:0.1, v:0.2, tipo:'triangle', dest:d}); RZ({t, d:0.01, v:0.25, f:2500, q:1, dest:d}); return 0.2; },
    desliza_menu(t, o, d){ RZ({t, a:0.02, d:0.07, v:0.8, f:1600*o.tono, f2:3200*o.tono, q:1.2, col:'rosa', dest:d}); return 0.15; },
    puntos(t, o, d){ const f = 1760*o.tono*Math.pow(2, ((o.n | 0) % 12)/24); TN({t, f, tipo:'square', lp:4000, d:0.025, v:0.12, dest:d}); return 0.08; },
    mateo(t, o, d){ const k = o.tono*rv(0.95, 1.08);                                 /* un «¡blup!» de bombilla y un «¡hm-hm!» agudo */
      TN({t, f:300*k, f2:900*k, fd:0.05, d:0.07, v:0.25, dest:d}); TN({t:t + 0.05, f:1150*k, f2:1500*k, fd:0.05, d:0.06, v:0.1, dest:d});
      for(const [dt, a, b] of [[0.1, 620, 760], [0.2, 740, 980]]){ const g = G(0, d), s = oscF('triangle', a*k, t + dt, t + dt + 0.2), f1 = F('bandpass', 1900*k, 2.5, g);
        s.frequency.linearRampToValueAtTime(b*k, t + dt + 0.08); s.connect(f1); env(g.gain, t + dt, 0.008, 0.55, 0.11); }
      return 0.5; },
    risa_jefe(t, o, d){ const k = o.tono; let tt = t;                                 /* «jo, jo, jo» pomposo */
      for(let i = 0; i < 5; i++){ const g = G(0, d), f0 = (125 - i*6)*k, s = oscF('sawtooth', f0*1.12, tt, tt + 0.3), f1 = F('bandpass', 450, 5, g), f2 = F('bandpass', 820, 6, G(0.6, g));
        s.frequency.exponentialRampToValueAtTime(f0*0.92, tt + 0.16); s.connect(f1); s.connect(f2);
        adsr(g.gain, tt, 0.015, 0.1, 0.7, tt + 0.13, 0.06, 1.1); RZ({t:tt, d:0.05, v:0.06, f:1400, q:1, dest:d}); tt += 0.19 - i*0.008; }
      return tt - t + 0.4; },
    recarga(t, o, d){ const k = o.tono; RZ({t, d:0.02, v:0.5, f:2600*k, q:2, dest:d}); TN({t, f:600*k, tipo:'square', lp:2000, d:0.02, v:0.1, dest:d});
      RZ({t:t + 0.22, d:0.035, v:0.7, f:1500*k, q:1.6, dest:d}); TN({t:t + 0.22, f:260*k, tipo:'square', lp:1400, d:0.04, v:0.14, dest:d});
      RZ({t:t + 0.4, a:0.03, d:0.06, v:0.4, f:1800*k, f2:3200*k, q:2, dest:d}); RZ({t:t + 0.5, d:0.02, v:0.6, f:3000*k, q:2, dest:d}); return 0.7; },
    alambre(t, o, d){ const k = o.tono*rv(0.95, 1.05); [1, 2.01, 3.03, 4.1, 5.3].forEach((r, i) => TN({t, f:190*k*r, d:1.1/(1 + i*0.4), v:0.12/(1 + i*0.6), tipo:i ? 'sine' : 'triangle', dest:d}));
      for(let i = 0; i < 9; i++) RZ({t:t + i*0.028 + Math.random()*0.01, d:0.02, v:0.2*(1 - i/10), f:rv(2500, 4500), q:5, dest:d}); return 1.2; },
    titulo(t, o, d){ const k = o.tono, g = G(0, d), lp = F('lowpass', 150, 2), ws = C.createWaveShaper(), cu = new Float32Array(256);
      for(let i = 0; i < 256; i++) cu[i] = Math.tanh((i/127.5 - 1)*2.2); ws.curve = cu;
      lp.frequency.setValueAtTime(140, t); lp.frequency.exponentialRampToValueAtTime(2200, t + 0.22); lp.frequency.exponentialRampToValueAtTime(500, t + 2.4);
      for(const m of [24, 36, 43, 48, 51, 55]) for(const dt of [-9, 9]){ const s = oscF('sawtooth', mtof(m)*k, t, t + 3.4); s.detune.value = dt; s.connect(lp); }
      lp.connect(ws); ws.connect(g); adsr(g.gain, t, 0.04, 0.8, 0.55, t + 1.6, 1.4, 0.22);
      TN({t, f:80, f2:28, fd:1.2, d:1.6, v:0.9, dest:d}); RZ({t, d:0.4, v:0.6, f:1200, f2:200, tipo:'lowpass', col:'pardo', dest:d});
      RZ({t, d:0.03, v:0.5, f:3000, tipo:'highpass', dest:d}); return 3.6; },
    pagina(t, o, d){ const g = G(0.6, d), l = oscF('square', 38, t, t + 0.35), lg = G(0.35); l.connect(F('lowpass', 160, 0.7, lg)); lg.connect(g.gain);
      RZ({t, a:0.03, d:0.22, v:0.5, f:3000*o.tono, f2:1800*o.tono, q:0.8, col:'rosa', dest:g}); RZ({t:t + 0.2, d:0.05, v:0.3, f:500, tipo:'lowpass', col:'rosa', dest:d}); return 0.4; },
    trueno(t, o, d){ const k = o.tono, cerca = (o.vol === undefined ? 1 : o.vol) > 0.6;
      if(cerca){ RZ({t, d:0.18, v:0.8, f:1500*k, tipo:'highpass', q:0.5, dest:d}); RZ({t:t + 0.03, d:0.3, v:0.6, f:3000*k, f2:500, tipo:'lowpass', dest:d}); }
      const g = G(0, d), s = fuente('pardo', t, t + 4.6), lp = F('lowpass', 420*k, 0.7, g); lp.frequency.setValueAtTime(420*k, t); lp.frequency.exponentialRampToValueAtTime(110, t + 4);
      g.gain.setValueAtTime(0, t); let tt = t + 0.05, a = 1;
      while(tt < t + 4.2){ g.gain.linearRampToValueAtTime(a*rv(0.35, 1), tt); tt += rv(0.08, 0.34); a *= 0.83; } g.gain.linearRampToValueAtTime(0, t + 4.4);
      s.connect(lp); TN({t, a:0.05, f:48, f2:30, d:2, v:0.35, dest:d}); return 4.6; },
    helicoptero(t, o, d){ const dur = 5, dir = (o.x || 0) < 0 ? -1 : 1, p = C.createStereoPanner(), g = G(0, p), chop = G(0.5, g), l = oscF('sawtooth', 12.6, t, t + dur), lg = G(0.5);
      p.pan.setValueAtTime(-dir*0.95, t); p.pan.linearRampToValueAtTime(dir*0.95, t + dur); p.connect(d);
      l.frequency.linearRampToValueAtTime(10.8, t + dur); l.connect(F('lowpass', 60, 0.7, lg)); lg.connect(chop.gain);           /* las palas, con Doppler */
      const s = fuente('rosa', t, t + dur), lp = F('lowpass', 900, 0.8, chop), r = oscF('sawtooth', 80, t, t + dur), rl = F('lowpass', 260, 1, G(0.3, chop));
      s.playbackRate.setValueAtTime(1.1, t); s.playbackRate.linearRampToValueAtTime(0.9, t + dur); r.frequency.linearRampToValueAtTime(68, t + dur);
      s.connect(lp); r.connect(rl);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + dur*0.5); g.gain.linearRampToValueAtTime(0, t + dur); return dur; },
    ultima(t, o, d){ TN({t, f:65, f2:30, d:1.4, v:0.9, dest:d}); RZ({t, a:0.02, d:1.2, v:0.4, f:600, f2:120, tipo:'lowpass', col:'pardo', dest:d});
      TN({t, f:mtof(62), d:1.6, v:0.06, tipo:'triangle', dest:d}); TN({t:t + 0.02, f:mtof(69), d:1.4, v:0.05, dest:d}); return 1.8; }
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
    if(B && B[nom] && typeof B[nom].getChannelData === 'function') return B[nom];
    if(S && S[nom]){
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
      if(ALIAS[nom]){ const a = ALIAS[nom]; nom = a[0]; if(a[1]) o = Object.assign(o, a[1]); }
      const f = FX[nom]; if(!f){ FALTAN.add(nom); return; }
      if(C.state !== 'running') return;
      const meta = FXM[nom] || {}, t = ya() + 0.006;
      const x = lim(+(o.x !== undefined ? o.x : o.pan) || 0, -1, 1);
      const tono = lim(+o.tono || 1, 0.2, 4)*(meta.ui ? 1 : lerp(1, 0.74, kLento)*rv(0.97, 1.03));   /* en cámara lenta todo suena más grave */
      const vol = (o.vol === undefined ? 1 : lim(+o.vol || 0, 0, 2))*(meta.vol || 0.5);
      if(vol <= 0) return;
      const v = salida(nom, meta, x, vol), ext = bufExt(nom);
      let dur;
      if(ext){ const s = C.createBufferSource(); s.buffer = ext; s.playbackRate.value = tono; s.connect(v.g); s.start(t); dur = ext.duration/tono; }
      else dur = f(t, {x, tono, n:o.n, lejos:o.lejos, heroe:o.heroe, vol:o.vol}, v.g) || 1;
      v.fin = t + dur + (meta.rev ? 2.2 : 0.3);
    } catch(e){ err(e); }
  }

  /* ------------------------------------------------------------ ambiente */
  let AMB = null;
  const VIEJOS = [];
  function ambiente(lugar){
    ambPed = lugar || null; if(!listo) return;
    try {
      if((lugar || null) === ambAct) return; ambAct = lugar || null;
      const now = ya();
      if(AMB){ const A = AMB, p = A.g.gain; p.cancelScheduledValues(now); p.setValueAtTime(Math.max(p.value, 0.0001), now); p.linearRampToValueAtTime(0, now + 2);
        A.fin = now + 2.2; for(const r of A.reg) r.fin = now + 2.2; VIEJOS.push(A); AMB = null; }
      if(lugar && ARMA[lugar]){ AMB = {lugar, g:G(0, N.amb), nodos:[], loops:[], reg:[], ev:[], fin:Infinity};
        AMB.g.gain.setValueAtTime(0.0001, now); AMB.g.gain.linearRampToValueAtTime(1, now + 2.5); ARMA[lugar](AMB); }
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
  const ARMA = {
    puerto(A){
      bucle(A, 'blanco', 'highpass', 1400, 0.5, 0.05, -0.6); bucle(A, 'blanco', 'highpass', 1600, 0.5, 0.05, 0.6, 0.93);   /* lluvia cerca */
      bucle(A, 'rosa', 'bandpass', 900, 0.5, 0.13, 0);                                                                   /* cuerpo de la lluvia */
      bucle(A, 'pardo', 'lowpass', 380, 0.7, 0.2, 0);                                                                    /* lluvia lejos */
      const ola = bucle(A, 'pardo', 'lowpass', 300, 0.8, 0.14, -0.2); lfo(A, 0.11, 0.1, ola.g.gain); lfo(A, 0.047, 0.06, ola.g.gain);   /* oleaje */
      const lam = bucle(A, 'rosa', 'bandpass', 520, 1.2, 0.035, 0.3); lfo(A, 0.23, 0.03, lam.g.gain, 'triangle'); lfo(A, 0.09, 180, lam.fl.frequency);
      suceso(A, 0.07, 0.45, t => TN({t, f:rv(1700, 4200), f2:rv(900, 1600), fd:0.04, d:rv(0.03, 0.07), v:rv(0.012, 0.035), dest:panear(A.g, rv(-0.9, 0.9))}));   /* gotas */
      suceso(A, 3, 7, t => RZ({t, a:0.03, d:rv(0.3, 0.6), v:0.12, f:rv(380, 620), f2:260, q:1.4, col:'rosa', dest:panear(A.g, rv(-0.5, 0.5))}));             /* chapoteo contra el muelle */
      suceso(A, 25, 50, t => { const p = panear(A.g, rv(-0.7, 0.7)), g = G(0, p), lp = F('lowpass', 420, 1, g); p.connect(G(0.6, N.revFin));              /* bocina de barco lejos */
        for(const [f, dt] of [[55, 0], [55.4, 6], [110.2, 0], [82.6, -4]]){ const o = oscF('sawtooth', f, t, t + 4.4); o.detune.value = dt + detL(); o.connect(lp); }
        adsr(g.gain, t, 0.5, 1, 0.9, t + 2.6, 1.2, 0.07); }, rv(6, 10));
      suceso(A, 12, 30, t => { const p = panear(A.g, rv(-0.8, 0.8)), n = 2 + (Math.random()*3 | 0), raro = rv(0.75, 1.3);                               /* gaviotas, algo desafinadas */
        for(let i = 0; i < n; i++){ const tt = t + i*rv(0.22, 0.4), g = G(0, p), s = oscF('sawtooth', 1300*raro, tt, tt + 0.5), bp = F('bandpass', 2200*raro, 3, g);
          s.frequency.linearRampToValueAtTime(1900*raro, tt + 0.06); s.frequency.exponentialRampToValueAtTime(1050*raro, tt + 0.3);
          s.connect(bp); env(g.gain, tt, 0.02, 0.05, 0.3); } });
      suceso(A, 35, 80, t => FX.trueno(t, {tono:0.8, vol:0.4}, G(0.35, A.g)), rv(14, 24));
    },
    fabrica(A){
      tonoFijo(A, 'sawtooth', 50, 0.05, F('lowpass', 230, 1, A.g)); tonoFijo(A, 'sine', 100, 0.03); tonoFijo(A, 'square', 150, 0.02, F('bandpass', 150, 4, A.g));   /* zumbido de las máquinas */
      const zum = bucle(A, 'rosa', 'bandpass', 700, 3, 0.05, -0.3); lfo(A, 0.4, 0.025, zum.g.gain);
      const rod = bucle(A, 'blanco', 'bandpass', 2400, 9, 0.012, 0.4); lfo(A, 0.13, 300, rod.fl.frequency);
      bucle(A, 'pardo', 'lowpass', 150, 0.7, 0.2, 0);
      A.prensa = 0;
      suceso(A, 1.75, 1.75, t => { if(A.prensa++ % 6 >= 4) return;                                          /* la prensa lejos, en tandas de cuatro */
        const p = panear(A.g, -0.45); p.connect(G(0.7, N.revFin));
        TN({t, f:62, f2:40, d:0.42, v:0.22, dest:p}); RZ({t, d:0.14, v:0.12, f:600, tipo:'lowpass', col:'rosa', dest:p}); metal(p, t + 0.02, 0.18, 330); }, 1);
      suceso(A, 5, 11, t => { const p = panear(A.g, rv(-0.8, 0.8)), d = rv(1, 2.4);                           /* vapor que silba */
        RZ({t, a:0.12, d, v:0.06, f:rv(3500, 5500), tipo:'highpass', q:0.6, dest:p}); if(Math.random() < 0.35) TN({t, a:0.1, f:rv(2600, 3200), d:d*0.8, v:0.01, dest:p}); });
      suceso(A, 9, 18, t => { const p = panear(A.g, rv(-0.7, 0.7)); for(let i = 0; i < 10; i++) metal(p, t + i*rv(0.05, 0.09), 0.05, rv(900, 1500)); });   /* cadena */
      suceso(A, 6, 14, t => { const p = panear(A.g, rv(-0.9, 0.9)); p.connect(G(0.8, N.revFin)); metal(p, t, 0.12, rv(200, 420)); });                    /* golpe metálico */
    },
    torre(A){
      const vi = bucle(A, 'rosa', 'bandpass', 520, 0.9, 0.3, 0); lfo(A, 0.05, 260, vi.fl.frequency); lfo(A, 0.13, 0.08, vi.g.gain); lfo(A, 0.031, 0.06, vi.g.gain);  /* viento con ráfagas */
      const sil = bucle(A, 'blanco', 'bandpass', 3000, 6, 0.012, 0.5); lfo(A, 0.07, 700, sil.fl.frequency);
      tonoFijo(A, 'sawtooth', 60, 0.018, F('bandpass', 120, 2, A.g)); tonoFijo(A, 'sine', 120, 0.008);                  /* neón */
      bucle(A, 'pardo', 'lowpass', 240, 0.7, 0.14, 0); bucle(A, 'rosa', 'bandpass', 1000, 0.3, 0.012, 0);                 /* ciudad lejos */
      suceso(A, 1, 5, t => { const n = Math.random() < 0.3 ? 4 : 1; for(let i = 0; i < n; i++) RZ({t:t + i*0.04, d:0.012, v:0.05, f:rv(3000, 6000), q:2, dest:A.g}); });  /* el neón que chisporrotea */
      suceso(A, 6, 15, t => { const g = G(0, F('lowpass', 900, 1, panear(A.g, rv(-0.9, 0.9)))), f = rv(330, 440);          /* bocina de auto lejos */
        for(const r of [1, 1.26]) oscF('square', f*r, t, t + 0.6).connect(g); adsr(g.gain, t, 0.02, 0.1, 0.8, t + rv(0.2, 0.45), 0.05, 0.012); });
      suceso(A, 25, 45, t => { const g = G(0, F('lowpass', 1400, 1, panear(A.g, rv(-0.8, 0.8)))), o = oscF('sine', 820, t, t + 6.4), l = oscF('sine', 0.35, t, t + 6.4);   /* sirena */
        l.connect(G(160, o.frequency)); o.connect(g); adsr(g.gain, t, 1.5, 1, 1, t + 4.5, 1.5, 0.014); }, rv(10, 18));
      suceso(A, 40, 70, t => FX.helicoptero(t, {x:Math.random() < 0.5 ? -1 : 1}, G(0.3, A.g)), rv(15, 25));
    }
  };
  function pasoAmb(){
    const now = ya();
    if(AMB) for(const e of AMB.ev) if(now >= e.prox){ e.prox = now + rv(e.a, e.b); try { e.fn(now + 0.05); } catch(x){ err(x); } }
    for(let i = VIEJOS.length - 1; i >= 0; i--){ const A = VIEJOS[i];
      if(now > A.fin){ for(const n of A.nodos) try { n.stop(); n.disconnect(); } catch(e){} try { A.g.disconnect(); } catch(e){} VIEJOS.splice(i, 1); } }
  }

  /* ------------------------------------------------------------ voces de diálogo */
  const VOZ = {
    heroe:{f:150, onda:'square', lp:1500, fo:900, dur:0.05, v:0.2, esc:[0, 3, 5, 7, 10]},
    mateo:{f:520, onda:'triangle', lp:5200, fo:1900, dur:0.055, v:0.3, esc:[0, 2, 4, 7, 9, 12], sube:1.2},
    jefe:{f:96, onda:'sawtooth', lp:1100, fo:520, dur:0.09, v:0.26, esc:[0, 2, 3, 5, 7], vib:1},
    maton:{f:116, onda:'sawtooth', lp:780, fo:640, dur:0.06, v:0.28, esc:[0, 1, 3, 5], sucio:1},
    radio:{f:310, onda:'square', lp:2600, fo:1700, dur:0.05, v:0.2, esc:[0, 5, 7, 12], radio:1}
  };
  let CURVA_SUCIA = null, nBlips = 0;
  function voz(texto, tipo){
    if(!listo) return;
    try {
      const ch = [...String(texto === undefined || texto === null ? '' : texto)].pop() || '';
      if(!/[a-z0-9áéíóúñüçãõâêôà]/i.test(ch) || C.state !== 'running') return;
      const now = ya(); if(now - ultBlip < 1/18) return; ultBlip = now; nBlips++;
      const P = VOZ[tipo] || VOZ.heroe, t = now + 0.005, lo = ch.toLowerCase(), voc = 'aeiouáéíóúãõâêôàü'.includes(lo);
      const semi = P.esc[(lo.charCodeAt(0)*7 + 3) % P.esc.length] + (voc ? 0 : -2), f = P.f*Math.pow(2, semi/12)*rv(0.985, 1.015);
      const dur = P.dur*(voc ? 1.35 : 0.8), g = G(0, N.fx), lp = F('lowpass', P.lp, 0.8), fo = F('peaking', P.fo, 1.5), s = oscF(P.onda, f, t, t + dur + 0.1);
      fo.gain.value = 8;
      if(P.sube) s.frequency.linearRampToValueAtTime(f*P.sube, t + dur);
      if(P.vib){ s.frequency.setValueAtTime(f*1.04, t); s.frequency.exponentialRampToValueAtTime(f*0.94, t + dur); }   /* el jefe cae al final de cada sílaba */
      s.connect(lp); lp.connect(fo);
      let ult = fo;
      if(P.radio){ const bp = F('bandpass', 1700, 2.2); fo.connect(bp); ult = bp; RZ({t, d:dur + 0.03, v:0.12, f:3000, q:1, dest:g}); }
      if(P.sucio){ if(!CURVA_SUCIA){ CURVA_SUCIA = new Float32Array(64); for(let i = 0; i < 64; i++) CURVA_SUCIA[i] = Math.tanh((i/31.5 - 1)*3); }
        const ws = C.createWaveShaper(); ws.curve = CURVA_SUCIA; ult.connect(ws); ult = ws; }
      ult.connect(g); env(g.gain, t, 0.006, P.v, dur);
      if(!voc) RZ({t, d:0.015, v:0.05, f:P.radio ? 2500 : 3500, q:1.5, dest:N.fx});
    } catch(e){ err(e); }
  }

  /* ------------------------------------------------------------ lento, intensidad, volumen, paso */
  function aplicarLento(){
    if(Math.abs(kLento - kAplic) < 0.004) return; kAplic = kLento;
    const now = ya(), fc = 18000*Math.pow(500/18000, kLento), dl = detL();
    N.musF.frequency.setTargetAtTime(fc, now, 0.05); N.ambF.frequency.setTargetAtTime(fc*1.2, now, 0.05);
    N.revMin.gain.setTargetAtTime(lerp(0.26, 0.5, kLento), now, 0.1);
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
  function volumen(){
    if(!listo) return;
    try { const now = ya(), m = Math.pow(lim(+AJ.musica || 0, 0, 1), 1.6), e = Math.pow(lim(+AJ.efectos || 0, 0, 1), 1.4);
      N.musV.gain.setTargetAtTime(m*0.7, now, 0.02); N.fxV.gain.setTargetAtTime(e, now, 0.02); N.ambV.gain.setTargetAtTime(e*0.8, now, 0.02); } catch(e){ err(e); }
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
      for(const r of REPS) if(r.vivo && r.T.capas) for(const n of CAPAS){ const v = objCapa(r.T, n);
        if(Math.abs(v - r.cv[n]) > 0.01 || (v !== r.cv[n] && (v === 0 || v === 1))){ r.cv[n] = v; r.cap[n].gain.setTargetAtTime(v, now, 0.35); } }
      bombear(); pasoAmb();
      for(let i = REPS.length - 1; i >= 0; i--){ const r = REPS[i];
        if(!r.vivo && now > r.muere){ for(const g of r.oscs) if(g.fin > now){ g.fin = now; try { g.o.stop(); } catch(e){} } try { r.bus.disconnect(); } catch(e){} REPS.splice(i, 1); }
        else if(r.oscs.length > 300) r.oscs = r.oscs.filter(g => g.fin > now); }
      for(let i = VIVAS.length - 1; i >= 0; i--){ const v = VIVAS[i]; if(now > v.fin){ try { v.g.disconnect(); v.p.disconnect(); if(v.e) v.e.disconnect(); } catch(e){} VIVAS.splice(i, 1); } }
      if(OSC_M.length > 60) for(let i = OSC_M.length - 1; i >= 0; i--) if(OSC_M[i].fin < now) OSC_M.splice(i, 1);
    } catch(e){ err(e); }
  }
  function arrancar(){
    try {
      if(!C){ if(!armar()) return; if(temaPed !== null) musica(temaPed); if(ambPed) ambiente(ambPed); }
      if(C.state === 'suspended' || C.state === 'interrupted') C.resume().catch(() => {});
    } catch(e){ err(e); }
  }

  return {arrancar, fx:(n, o) => fx(n, o), musica, ambiente, lento, paso, volumen, intensidad, voz,
    /* para el banco */
    _inst:() => ({piano, pad, bandoneon, bajo, pluck, lead, coro, bombo, caja, hat, metal, stab, mus:N.mus}), _ctx:() => C, _salida:() => N && N.sal, _err:ERR, _faltan:FALTAN, _vivas:() => VIVAS.length, _reps:() => REPS.map(r => r.nom + (r.vivo ? '' : '·')),
    _lista:() => Object.keys(FX), _temas:() => Object.keys(TEMAS), _mel:() => Object.keys(TEMAS).filter(k => TEMAS[k].M).map(k => [k, TEMAS[k].M.pasos, TEMAS[k].A.length*16]),
    _vivos:() => { const n = ya(); return OSC_M.filter(r => r.fin > n).length; }, _estado:() => ({kLento, inten, tema:temaAct, amb:ambAct, osc:OSC_M.length, vivas:VIVAS.length, blips:nBlips})};
})();
