/* ================================================================ sonido
   EL ÚLTIMO RŌNIN: todo de Web Audio, sin archivos.
   Tres buses (música, efectos, ambiente) → pasaaltos → compresor → recorte suave (nunca pasa de 0,95).
   Los instrumentos: koto de cuerda pulsada (Karplus-Strong horneado una vez por nota), shakuhachi
   (soplido afinado con vibrato que entra tarde), taikos, shime, kotsuzumi, hyoshigi, rin, gong, horagai,
   bajo redondo y colchón de viento. El acero de la katana es su propia campana: parciales que baten.
   La música es un secuenciador de semicorcheas que programa con anticipación contra currentTime:
   escalas in, hirajōshi y yo, frases de 8 compases que se contestan y capas por intensidad.
   La cámara lenta baja un tono todo lo que suena, cierra un pasabajos y frena el tempo.
   Ninguna llamada de acá puede tirarle una excepción al juego: todo va envuelto y los errores van a _err. */
const SON = (() => {
  /* lo de todos los días, propio: así el archivo anda solo (en el juego tapa, sin pisar, a los de 1_base) */
  const lim = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a)*t;
  const rv = (a, b) => a + Math.random()*(b - a);
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
  let C = null, N = null, RU = null, ONDA = null, listo = false;
  let temaPed = null, temaAct = null, ambPed = null, ambAct = null;                /* lo pedido antes de haber contexto */
  let kLento = 0, kLentoObj = 0, kAplic = -1, tLento = 0, inten = 0, intenObj = 0, kAhora = 0, tAnt = 0;
  const AJ = {musica:0.8, efectos:1};
  const ERR = [], FALTAN = new Set();
  const err = e => { if(ERR.length < 30) ERR.push(String(e && e.stack || e)); };
  const tiene = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  const suv = t => t*t*(3 - 2*t);
  const mtof = m => 440*Math.pow(2, (m - 69)/12);
  const ya = () => C.currentTime;

  /* ------------------------------------------------------------ armado del máster */
  function ruidos(){
    const sr = C.sampleRate, n = Math.floor(sr*3), mk = () => C.createBuffer(1, n, sr);
    const bl = mk(), ro = mk(), pa = mk(), a = bl.getChannelData(0), b = ro.getChannelData(0), c = pa.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, u = 0;
    for(let i = 0; i < n; i++){
      const w = Math.random()*2 - 1; a[i] = w*0.7;
      b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759; b2 = 0.96900*b2 + w*0.1538520;
      b3 = 0.86650*b3 + w*0.3104856; b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
      b[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w*0.5362)*0.1; b6 = w*0.115926;
      u = (u + 0.02*w)/1.02; c[i] = u*3.2;
    }
    const fz = Math.floor(sr*0.02);                                /* que las puntas del bucle se toquen */
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
        d[i] = lp*en*Math.min(1, (i - p0)/(sr*0.008));
      }
      for(let k = 0; k < 9; k++){ const i = Math.floor(sr*(0.008 + Math.random()*0.08)); if(i < n) d[i] += (Math.random() < 0.5 ? -1 : 1)*0.3*(1 - k/10); }
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
  const CURVAS = {};
  function curvaSat(k){ const q = Math.max(0.5, Math.round(k*10)/10); if(CURVAS[q]) return CURVAS[q];
    const n = 1024, c = new Float32Array(n), nrm = Math.tanh(q);
    for(let i = 0; i < n; i++){ const x = i/(n - 1)*2 - 1; c[i] = (Math.tanh(q*(x + 0.06*x*x)))/nrm; }
    return CURVAS[q] = c; }
  function saturador(k, dest){ const w = C.createWaveShaper(); w.curve = curvaSat(k); w.oversample = '2x'; if(dest) w.connect(dest); return w; }
  function ondas(){
    /* el tubo del shakuhachi: casi todo fundamental, pares que asoman y la tercera un poco hueca */
    const H = 12, re = new Float32Array(H), im = new Float32Array(H), A = [0, 1, 0.3, 0.14, 0.09, 0.045, 0.03, 0.015, 0.01, 0.006, 0.004, 0.002];
    for(let k = 1; k < H; k++) im[k] = A[k];
    ONDA = {fue:C.createPeriodicWave(re, im)};
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
    N.comp.threshold.value = -16; N.comp.knee.value = 12; N.comp.ratio.value = 3.5; N.comp.attack.value = 0.004; N.comp.release.value = 0.25;
    N.comp.connect(N.pre);
    N.hp = F('highpass', 30, 0.7, N.comp);
    N.mezcla = G(0.95, N.hp);
    /* música: bus → pasabajos del lento → volumen */
    N.musV = G(0.45, N.mezcla); N.musF = F('lowpass', 18000, 0.6, N.musV);
    N.mus = G(1, N.musF);
    /* la sala: la reverberación larga de la música, con envíos propios de cada instrumento */
    N.revM = C.createConvolver(); N.revM.buffer = ir(3.6, 1.4, 0.5, 0.03); N.revM.connect(N.musF);
    N.revMin = G(0.1, N.revM); N.mus.connect(N.revMin); N.sala = G(1, N.revM);
    /* eco de corchea con puntillo, oscureciéndose en cada vuelta */
    N.eco = G(1); N.ecoD = C.createDelay(2); N.ecoD.delayTime.value = 0.49;
    N.ecoLp = F('lowpass', 2600, 0.6); N.ecoFb = G(0.34); N.ecoW = G(0.45, N.mus);
    N.eco.connect(N.ecoD); N.ecoD.connect(N.ecoLp); N.ecoLp.connect(N.ecoFb); N.ecoFb.connect(N.ecoD); N.ecoLp.connect(N.ecoW);
    /* efectos, con su cola; en cámara lenta se oscurecen un poco */
    N.fxV = G(1, N.mezcla); N.fxF = F('lowpass', 20000, 0.5, N.fxV); N.fx = G(1, N.fxF);
    N.revF = C.createConvolver(); N.revF.buffer = ir(2.4, 2, 0.6, 0.01); N.revF.connect(N.fxF); N.revFin = G(1, N.revF);
    /* ambiente */
    N.ambV = G(0.8, N.mezcla); N.ambF = F('lowpass', 18000, 0.5, N.ambV); N.amb = G(1, N.ambF);
    /* iOS: un buffer mudo destraba la salida */
    try { const s = C.createBufferSource(); s.buffer = C.createBuffer(1, 64, C.sampleRate); s.connect(C.destination); s.start(0); } catch(e){}
    listo = true;
    volumen(); kAplic = -1; aplicarLento();
    setInterval(tick, 25);                                          /* el secuenciador anda solo: el juego no tiene que llamar a nadie */
    try { document.addEventListener('visibilitychange', () => { try {
      if(document.hidden){ if(C.state === 'running') C.suspend(); } else if(C.state !== 'closed') C.resume().catch(() => {}); } catch(e){} }); } catch(e){}
    return true;
  }

  /* ------------------------------------------------------------ piezas de síntesis */
  /* lo que suena en la música queda anotado para que el lento lo baje de tono */
  const OSC_M = [];
  let repAct = null;                                  /* el tema que está programando: lo suyo se corta al soltarlo */
  const detL = () => -kLento*200;
  function reg(nodo, p, d0, fin){ if(!p) return; try { p.value = d0 + detL(); } catch(e){}
    const rg = {o:nodo, p, d0, fin}; OSC_M.push(rg); if(repAct) repAct.oscs.push(rg); }
  const noReg = () => {};
  function oscM(tipo, f, t, fin, det){
    const o = C.createOscillator();
    if(ONDA[tipo]) o.setPeriodicWave(ONDA[tipo]); else o.type = tipo;
    o.frequency.setValueAtTime(f, t); reg(o, o.detune, det || 0, fin); o.start(t); o.stop(fin); return o;
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
  /* un paneo que viaja: la hoja que cruza de un lado al otro */
  function barrido(dest, t, x0, x1, dur){ const p = C.createStereoPanner(); p.pan.setValueAtTime(lim(x0, -1, 1), t); p.pan.linearRampToValueAtTime(lim(x1, -1, 1), t + dur); p.connect(dest); return p; }
  const whoosh = (t, d, f1, f2, v, dest) => RZ({t, a:d*0.55, d:d*0.6, v, f:f1, f2, fd:d, q:1.4, col:'rosa', dest});
  /* los envíos al eco y a la sala viajan con la capa (el destino los trae colgados) */
  function envio(g, dest, e, s){ if(e && dest && dest._eco) g.connect(G(e, dest._eco)); if(s && dest && dest._sala) g.connect(G(s, dest._sala)); }
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

  /* ------------------------------------------------------------ la cuerda del koto (Karplus-Strong)
     Una vez por nota: ruido con pasabajos, peinado por la posición de la uña (cerca del puente suena
     nasal), y el bucle de retardo con su promedio que se come los agudos de a poco. La afinación exacta
     la pone la velocidad de reproducción, porque el largo del retardo es entero. */
  const KS = new Map();
  function ks(m){
    m = Math.round(lim(m, 24, 108)); let K = KS.get(m); if(K) return K;
    const sr = C.sampleRate, f = mtof(m), Nn = Math.max(4, Math.round(sr/f - 0.5)), fr = sr/(Nn + 0.5);
    const t60 = lim(3.8 - (m - 45)*0.06, 0.8, 3.8), dur = Math.min(t60*0.85 + 0.15, 3.4), n = Math.floor(sr*dur);
    const b = C.createBuffer(1, n, sr), y = b.getChannelData(0), rr = mulberry(m*7919 + 3);
    const ro = Math.min(0.99995, Math.pow(10, -3/(t60*fr))/Math.cos(Math.PI*fr/sr));
    const e = new Float32Array(Nn), P = Math.max(1, Math.floor(Nn*0.13)); let lp = 0, dc = 0;
    for(let i = 0; i < Nn; i++){ lp += 0.6*((rr()*2 - 1) - lp); e[i] = lp; }
    for(let i = 0; i < Nn; i++){ y[i] = e[i] - 0.85*e[(i - P + Nn) % Nn]; dc += y[i]; }
    dc /= Nn; for(let i = 0; i < Nn; i++) y[i] -= dc;
    for(let i = Nn; i < n; i++) y[i] = ro*0.5*(y[i - Nn] + y[i - Nn - 1 >= 0 ? i - Nn - 1 : 0]);
    let pk = 0; for(let i = 0; i < Math.min(n, Nn*6); i++) pk = Math.max(pk, Math.abs(y[i]));
    const k = pk > 0 ? 0.8/pk : 1, fz = Math.floor(sr*0.04);
    for(let i = 0; i < n; i++) y[i] *= k*(i > n - fz ? (n - i)/fz : 1);
    K = {b, rate:f/fr, dur}; KS.set(m, K); return K;
  }
  /* o: {b brillo 0..1, bend semitonos de arranque, apaga (se apaga con la mano al terminar), eco, sala, fx} */
  function koto(dest, t, m, dur, v, o){ o = o || {};
    const mr = Math.round(m), K = ks(mr); if(!K) return;
    const s = C.createBufferSource(), g = C.createGain(), br = o.b === undefined ? 0.55 : o.b, lp = F('lowpass', lerp(1500, 7500, br), 0.6), cu = F('peaking', 1150, 1.1);
    cu.gain.value = 3.5; s.buffer = K.b;
    const rate = K.rate*Math.pow(2, (m - mr)/12);
    s.playbackRate.setValueAtTime(rate*Math.pow(2, (o.bend || 0.1)/12), t); s.playbackRate.setTargetAtTime(rate, t + 0.004, o.bend ? 0.06 : 0.014);   /* el tirón de la cuerda */
    s.connect(lp); lp.connect(cu); cu.connect(g); g.connect(dest);
    const larga = K.dur/rate, apaga = o.apaga ? t + Math.max(dur, 0.05) : 0, stop = apaga ? Math.min(t + larga, apaga + 0.4) : t + larga;
    g.gain.setValueAtTime(v*0.5, t); if(apaga) g.gain.setTargetAtTime(0, apaga, 0.06);
    if(!o.fx) reg(s, s.detune, rv(-3, 3), stop);
    s.start(t); s.stop(stop + 0.02);
    RZ({t, d:0.007, v:v*0.05, f:4600, tipo:'highpass', q:0.7, dest});                                      /* la uña (tsume) */
    envio(g, dest, o.eco, o.sala === undefined ? 0.22 : o.sala);
  }
  /* rasgueo: las notas de abajo para arriba, apenas separadas */
  function rasgueo(dest, t, notas, v, gap, o){ const k = 1/Math.sqrt(notas.length); notas.forEach((m, i) => koto(dest, t + i*gap, m, 1, v*k*(1 - i*0.04), o)); }
  /* shakuhachi: el tubo, el soplido afinado adentro y el aire que se escapa; entra de abajo y el vibrato llega tarde.
     o.cae: semitonos que se cae al final (el aliento que se va); o.fx: no lo toca el lento */
  function shaku(dest, t, m, dur, v, o){ o = o || {};
    const R = o.fx ? noReg : reg;
    const f = mtof(m), fin = t + Math.max(dur, 0.1), stop = fin + 0.45, g = C.createGain(), lp = F('lowpass', o.f || 3200, 0.7);
    const f0 = f*Math.pow(2, (o.desde ? o.desde : -0.8)/12), sube = o.desde ? 0.13 : 0.07;
    const a = C.createOscillator(); a.setPeriodicWave(ONDA.fue);
    a.frequency.setValueAtTime(f0, t); a.frequency.exponentialRampToValueAtTime(f, t + sube);
    const ns = fuente('rosa', t, stop), bp = F('bandpass', f0, 14); bp.frequency.exponentialRampToValueAtTime(f, t + sube);
    if(o.cae){ const fc = f*Math.pow(2, -o.cae/12); a.frequency.setTargetAtTime(fc, t + dur*0.45, dur*0.22); bp.frequency.setTargetAtTime(fc, t + dur*0.45, dur*0.22);
      lp.frequency.setTargetAtTime(700, t + dur*0.4, dur*0.25); }
    else if(dur > 1.1) a.frequency.setTargetAtTime(f*0.988, fin - 0.1, 0.1);                            /* el meri del final: cae un pelo */
    R(a, a.detune, 0, stop); a.start(t); a.stop(stop); a.connect(lp);
    ns.connect(bp); bp.connect(G(3.2, lp)); R(ns, bp.detune, 0, stop);
    const aire = fuente('blanco', t, stop), ab = F('bandpass', 2600, 0.7), ga = G(0); aire.connect(ab); ab.connect(ga); ga.connect(g);
    ga.gain.setValueAtTime(0, t); ga.gain.linearRampToValueAtTime(v*0.05, t + 0.025); ga.gain.setTargetAtTime(v*0.01, t + 0.04, 0.08); ga.gain.setTargetAtTime(0, fin, 0.07);
    lp.connect(g); g.connect(dest);
    if(dur > 0.45){ const l = oscF('sine', rv(4.6, 5.3), t, stop), lg = G(0); lg.gain.setValueAtTime(0, t + 0.28); lg.gain.linearRampToValueAtTime(o.vib || 20, t + Math.min(0.95, dur));
      l.connect(lg); lg.connect(a.detune); lg.connect(bp.detune); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*0.12, t + 0.06); g.gain.linearRampToValueAtTime(v*0.14, t + Math.max(0.07, Math.min(dur*0.6, 0.8)));
    g.gain.setTargetAtTime(0, fin, o.cae ? 0.25 : 0.09);
    envio(g, dest, o.eco === undefined ? 0.22 : o.eco, o.sala === undefined ? 0.45 : o.sala);
  }
  /* rin: el cuenco de templo. Parciales inarmónicos, el fundamental batiendo contra sí mismo */
  function rin(dest, t, m, v, o){ o = o || {}; const f = mtof(m), L = o.largo || 1, mix = G(1, dest);
    for(const [r, a, d] of [[1, 1, 3.4], [2.76, 0.4, 1.9], [5.4, 0.18, 1.0], [8.93, 0.07, 0.5]]){
      if(f*r > C.sampleRate*0.45) continue; const g = G(0, mix), fin = t + d*L*1.6 + 0.05;
      for(const bat of r === 1 ? [-0.8, 0.8] : [0]){ const q = C.createOscillator(); q.frequency.value = f*r + bat; if(!o.fx) reg(q, q.detune, 0, fin); q.start(t); q.stop(fin); q.connect(g); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*a*(r === 1 ? 0.06 : 0.09), t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, d*L/4.5);
    }
    RZ({t, d:0.004, v:v*0.05, f:5200, q:2, dest:mix});
    envio(mix, dest, o.eco, o.sala === undefined ? 0.5 : o.sala);
  }
  /* gong: parciales graves que florecen, suben un pelo y se asientan */
  function gong(dest, t, v, f, o){ o = o || {}; const mix = G(1, dest);
    [[1, 1, 5.5], [1.52, 0.6, 4.2], [2.03, 0.45, 3.4], [2.64, 0.32, 2.6], [3.3, 0.2, 2], [4.2, 0.13, 1.5], [5.9, 0.07, 1]].forEach(([r, a, d], i) => {
      const g = G(0, mix), fin = t + d*1.6, q = C.createOscillator(), fr = f*r; q.frequency.setValueAtTime(fr*0.985, t);
      q.frequency.linearRampToValueAtTime(fr*1.012, t + 0.3); q.frequency.exponentialRampToValueAtTime(fr, t + 1.6);
      if(!o.fx) reg(q, q.detune, 0, fin); q.start(t); q.stop(fin); q.connect(g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*a*0.07, t + 0.01 + i*0.05); g.gain.setTargetAtTime(0, t + 0.01 + i*0.05, d/4.5); });
    TN({t, f:f*0.9, f2:f*0.7, d:0.25, v:v*0.18, lp:300, dest:mix});
    RZ({t, a:0.35, d:1.8, v:v*0.03, f:2200, q:0.8, dest:mix});
    envio(mix, dest, 0, o.sala === undefined ? 0.6 : o.sala);
  }
  /* bajo redondo: seno y triángulo con un pasabajos que da el golpe y se cierra */
  function bajo(dest, t, m, dur, v, o){ o = o || {};
    const f = mtof(m), fin = t + Math.max(dur, 0.05), stop = fin + 0.25, g = C.createGain(), lp = F('lowpass', 900, 0.8);
    oscM('sine', f, t, stop, 0).connect(lp); oscM('triangle', f, t, stop, 4).connect(G(0.55, lp));
    lp.frequency.setValueAtTime(o.f || 1100, t); lp.frequency.setTargetAtTime(Math.max(160, f*2.6), t + 0.005, 0.08);
    lp.connect(saturador(1.3, g)); g.connect(dest);
    adsr(g.gain, t, 0.006, 0.3, 0.72, fin, 0.09, v*0.34);
  }
  /* colchón de viento: triángulos abiertos, una sierra finita y, si se pide, aire afinado arriba */
  function padV(dest, t, notas, dur, v, o){ o = o || {};
    const a = o.a || 1, rel = o.rel || 1.4, fin = t + dur, stop = fin + rel*1.7, fc = o.f || 1100;
    const lp = F('lowpass', fc*0.45, 0.7), g = C.createGain();
    lp.frequency.setValueAtTime(fc*0.45, t); lp.frequency.linearRampToValueAtTime(fc, t + Math.max(a, dur*0.5)); lp.frequency.linearRampToValueAtTime(fc*0.7, fin + rel);
    for(const m of notas){ const f = mtof(m);
      oscM('triangle', f, t, stop, -7 + rv(-2, 2)).connect(lp); oscM('triangle', f, t, stop, 7 + rv(-2, 2)).connect(lp); oscM('sawtooth', f, t, stop, rv(-4, 4)).connect(G(0.16, lp)); }
    lp.connect(g);
    if(o.aire){ const ns = fuente('rosa', t, stop), bp = F('bandpass', mtof(notas[notas.length - 1])*2, 6); ns.connect(bp); bp.connect(G(o.aire*2.2, g)); reg(ns, bp.detune, 0, stop); }
    g.connect(dest); adsr(g.gain, t, a, 1, 0.9, fin, rel, v*0.1/Math.sqrt(notas.length));
    envio(g, dest, 0, o.sala === undefined ? 0.3 : o.sala);
  }
  /* horagai: la caracola de guerra. Una sierra por la vocal «o», que entra de abajo, tiembla y se quiebra al final */
  function horagai(dest, t, m, dur, v){ const f = mtof(m), out = G(1, dest);
    vox(t, out, {vocal:'o', f:f*0.94, f2:f, pico:0.15, f3:f*0.97, d:dur, v:v*0.55, sucio:1.3, q:5, vib:5.2, aire:0.05, fk:0.8});
    vox(t + 0.02, out, {vocal:'o', f:f*0.5*0.94, f2:f*0.5, pico:0.2, d:dur*0.9, v:v*0.3, sucio:1.1, q:5, fk:0.7}); envio(out, dest, 0.2, 0.6); }
  /* ---- la percusión */
  function taiko(dest, t, v, o){ o = o || {};
    const f0 = o.f || 60, larga = o.larga || 0.6, g = C.createGain(), s = oscF('sine', f0*2.2, t, t + larga*1.6 + 0.05), mix = G(1, dest);
    s.frequency.exponentialRampToValueAtTime(f0*1.15, t + 0.03); s.frequency.exponentialRampToValueAtTime(f0, t + 0.25);
    env(g.gain, t, 0.002, v*0.9, larga); s.connect(g); g.connect(mix);
    TN({t, f:f0*3.7, f2:f0*2.4, fd:0.05, d:larga*0.35, v:v*0.18, dest:mix});                                  /* el parche que canta arriba */
    RZ({t, d:0.03, v:v*0.3, f:850, q:0.9, col:'rosa', dest:mix}); RZ({t, d:0.012, v:v*0.14, f:2600, q:1, dest:mix});   /* el bachi */
    RZ({t, a:0.004, d:larga*0.5, v:v*0.35, f:170, tipo:'lowpass', q:0.7, col:'pardo', dest:mix});
    envio(mix, dest, 0, o.sala === undefined ? 0.3 : o.sala);
  }
  function shime(dest, t, v){ TN({t, f:540, f2:400, fd:0.03, d:0.08, v:v*0.35, tipo:'triangle', dest}); RZ({t, d:0.04, v:v*0.32, f:2300, q:1.5, dest});
    RZ({t, d:0.01, v:v*0.18, f:5200, tipo:'highpass', dest}); }
  /* kotsuzumi: el «pon» que sube cuando se aprietan las cuerdas y vuelve */
  function tsuzumi(dest, t, v, k){ k = k || 1; const f = 300*k, g = G(0, dest), s = oscF('sine', f*0.9, t, t + 0.6);
    s.frequency.linearRampToValueAtTime(f*1.12, t + 0.025); s.frequency.setTargetAtTime(f*0.97, t + 0.03, 0.12); s.connect(g);
    env(g.gain, t, 0.002, v*0.4, 0.36); TN({t, f:f*2.45, d:0.1, v:v*0.08, dest}); RZ({t, d:0.02, v:v*0.25, f:1400, q:2.5, dest}); }
  function hyoshigi(dest, t, v){ const mix = G(1, dest); RZ({t, d:0.05, v:v*0.5, f:2200, q:12, dest:mix}); TN({t, f:1850, d:0.05, v:v*0.18, tipo:'triangle', dest:mix});
    TN({t, f:2950, d:0.03, v:v*0.08, dest:mix}); envio(mix, dest, 0, 0.6); }
  function mokugyo(dest, t, v, f){ f = f || 700; TN({t, f, f2:f*0.94, d:0.09, v:v*0.35, tipo:'triangle', dest}); RZ({t, d:0.04, v:v*0.3, f, q:8, dest}); RZ({t, d:0.006, v:v*0.12, f:3500, tipo:'highpass', dest}); }
  function soplo(dest, t, dur, v, f1, f2){ const out = G(1, dest); RZ({t, a:dur*0.5, d:dur*0.6, v, f:f1, f2, fd:dur, q:1.2, col:'rosa', dest:out}); envio(out, dest, 0, 0.5); }
  /* la respiración de algo grande: toma el aire y lo suelta, por la vocal del que respira */
  function respira(dest, t, dur, v){ const out = G(1, dest);
    RZ({t, a:dur*0.38, d:dur*0.12, v, f:420, f2:1150, fd:dur*0.4, q:1.6, col:'rosa', dest:out});
    RZ({t:t + dur*0.5, a:dur*0.08, d:dur*0.4, v:v*1.2, f:1000, f2:320, fd:dur*0.45, q:1.3, col:'rosa', dest:out});
    RZ({t:t + dur*0.5, a:dur*0.1, d:dur*0.3, v:v*0.5, f:180, tipo:'lowpass', col:'pardo', dest:out}); envio(out, dest, 0, 0.6); }

  /* ------------------------------------------------------------ notación */
  const NT = {C:0, D:2, E:4, F:5, G:7, A:9, B:11};
  function nota(s){ const m = /^([A-G])([#b]?)(-?\d)$/.exec(s); return 12*(+m[3] + 1) + NT[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); }
  /* 'A4.6 D5.2 -.4': nota y largo en semicorcheas; queda indexado por compás */
  function melodia(txt){ const por = []; let p = 0;
    for(const tk of txt.trim().split(/\s+/)){ const [n, d] = tk.split('.'), dur = +d;
      if(n !== '-'){ const b = Math.floor(p/16); (por[b] = por[b] || []).push([p % 16, nota(n), dur]); } p += dur; }
    por.largo = Math.ceil(p/16); por.pasos = p; return por; }
  const TIPOS = {'':[0, 4, 7], m:[0, 3, 7], '7':[0, 4, 7, 10], m7:[0, 3, 7, 10], maj7:[0, 4, 7, 11], m9:[0, 3, 7, 10, 14], maj9:[0, 4, 7, 11, 14],
    add9:[0, 4, 7, 14], sus:[0, 5, 7], sus2:[0, 2, 7], '6':[0, 4, 7, 9], '5':[0, 7, 12], m7b5:[0, 3, 6, 10], '7sus':[0, 5, 7, 10], '7b9':[0, 4, 7, 10, 13]};
  function acorde(s){ const m = /^([A-G])([#b]?)(.*)$/.exec(s), r = NT[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return {r:(r + 12) % 12, iv:TIPOS[m[3]] || TIPOS['']}; }
  const raiz = (ac, oct) => 12*(oct + 1) + ac.r;
  /* las notas del acorde alrededor de un centro, de abajo para arriba, sin repetir */
  function voces(ac, centro){ const l = ac.iv.map(i => { let n = ac.r + i; while(n < centro - 6) n += 12; while(n >= centro + 6) n -= 12; return n; });
    return [...new Set(l)].sort((a, b) => a - b); }
  /* la nota de la escala vecina (d = +1 arriba, -1 abajo) */
  function vecino(T, m, d){ for(let k = 1; k < 13; k++){ const q = m + d*k, pc = ((q - T.ton) % 12 + 12) % 12; if(T.esc.includes(pc)) return q; } return m + d*2; }
  /* la frase: con variaciones en las vueltas de a dos (una nota se adorna desde la de arriba, alguna salta de octava) */
  function tocarMel(x, mel, fn){
    if(!mel) return; const evs = mel[x.cb % mel.largo]; if(!evs) return;
    for(const e of evs) if(e[0] === x.s){ const dur = e[2]*x.sp, vr = x.v % 4 >= 2; let m = e[1], orn = 0;
      if(vr && e[2] >= 4 && x.r.rnd() < 0.35) orn = vecino(x.r.T, m, 1) - m;
      if(vr && e[2] <= 2 && x.r.rnd() < 0.1) m += 12;
      fn(x.t + x.sw(e[0]), m, dur, 1, orn); }
  }

  /* ------------------------------------------------------------ los temas
     ton y esc: la tónica y la escala (in [0,1,5,7,8], hirajōshi [0,2,3,7,8], yo [0,2,5,7,9]).
     Las melodías miden 8 compases (128 semicorcheas) para caer justas sobre la progresión. */
  const TEMAS = {
    /* re hirajōshi, 64: el menú. Koto que arpegia despacio, shakuhachi que canta y se calla, viento y el rin cada dos compases.
       La cuarta vuelta de cada cuatro queda sin melodía: respira, así no cansa */
    menu:{bpm:64, vol:1.25, intro:1, swing:0.08, ton:2, esc:[0, 2, 3, 7, 8],
      prog:'Dm9 Bbmaj7 Gm9 A7sus Dm9 Bbmaj7 Fmaj7 Asus',
      mel:'A4.8 Bb4.4 A4.4 F4.12 E4.4 D4.16 -.8 E4.4 F4.4 A4.12 Bb4.4 A4.8 F4.8 E4.16 -.16',
      mel2:'D5.8 E5.4 F5.4 A5.16 Bb5.8 A5.4 F5.4 E5.16 F5.8 E5.4 D5.4 Bb4.12 A4.4 D5.16 -.16',
      toca(x){ const {s, t, ac, sp} = x, B = x.r.cap.base;
        if(s === 0){ padV(B, t, voces(ac, 62), sp*16, 0.75, {a:2, rel:2.4, f:1100, aire:0.9}); bajo(B, t, raiz(ac, 2), sp*14, 0.36, {f:500}); }
        if(s === 0 && x.cb % 4 === 0) soplo(B, t, sp*12, 0.05, 500, 1400);
        if(s === 0 && x.cb % 2 === 1){ const vs = voces(ac, 86); rin(B, t + 0.01, vs[vs.length - 1], 0.3, {largo:1.3}); }
        if(s % 4 === 0 && !(x.intro && s > 8)){ const vs = voces(ac, 64), P = [0, 2, 1, 3], i = P[(s >> 2) % 4] % vs.length;
          if(s === 0 || x.r.rnd() > 0.2) koto(B, t + (x.r.rnd() - 0.5)*0.015, vs[i] + (x.v % 2 && s >= 8 ? 12 : 0), sp*5, lerp(0.3, 0.4, x.r.rnd()), {b:0.4, eco:0.2}); }
        if(x.intro) return;
        const q = x.v % 4;
        if(q === 0 || q === 2) tocarMel(x, q === 0 ? this.M : this.M2, (tt, m, d, k, orn) => shaku(B, tt, m, d*0.96, 0.8*k, {desde:orn, vib:22}));
        else if(q === 1) tocarMel(x, this.M, (tt, m, d, k) => koto(B, tt, m + 12, d, 0.42*k, {b:0.55, eco:0.3}));
        else if(s === 8 && x.cb % 2 === 0) tsuzumi(B, t, 0.25, 0.9);
      }},
    /* mi in, 104: la batalla. Taikos que empujan, koto en ostinato de corcheas y bajo; con la intensidad entran
       el shime y el hyoshigi, la melodía (shakuhachi y koto que se turnan), el koto a contratiempo y los o-daiko */
    batalla:{bpm:104, vol:1, intro:1, kMin:0.3, swing:0, ton:4, esc:[0, 1, 5, 7, 8], capas:{perc:0.1, lead:0.3, extra:0.55, taiko:0.78},
      prog:'Em Fmaj7 Em Am Fmaj7 Cmaj7 Esus E7b9',
      mel:'B4.4 C5.4 B4.2 A4.2 E4.4 F4.6 E4.2 A4.8 B4.4 C5.4 E5.4 F5.4 E5.12 -.4 E5.4 F5.2 E5.2 C5.4 B4.4 A4.6 B4.2 C5.8 B4.4 A4.4 F4.4 E4.4 E4.12 -.4',
      mel2:'E5.2 F5.2 A5.2 B5.2 C6.4 B5.4 A5.2 F5.2 E5.4 B4.8 C5.2 E5.2 F5.2 A5.2 B5.4 C6.4 E6.8 B5.8 C6.4 B5.2 A5.2 F5.4 E5.4 F5.2 A5.2 B5.4 A5.8 F5.4 E5.4 C5.4 B4.4 E5.16',
      OST:[0, 1, 2, 1, 3, 2, 1, 2],
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 2);
        if(s === 0 || s === 6 || s === 8) taiko(D.base, t, s === 0 ? 0.85 : 0.55, {f:56, larga:0.6});
        if(s === 12 && x.cb % 2) taiko(D.base, t, 0.42, {f:64, larga:0.4});
        if(s % 2 === 0){ const vs = voces(ac, 64), i = this.OST[s >> 1] % vs.length; koto(D.base, t, vs[i] + (s === 14 ? 12 : 0), sp*1.8, s % 4 === 0 ? 0.34 : 0.26, {b:0.55, apaga:1}); }
        if(s === 0 || s === 10) bajo(D.base, t, r0 + (s ? 7 : 0), sp*(s ? 5 : 9), 0.5, {f:800});
        if(s === 0) padV(D.base, t, voces(ac, 57), sp*16, 0.5, {a:0.5, rel:1, f:900});
        if(x.intro){ if(s >= 12) taiko(D.base, t, 0.25 + (s - 12)*0.1, {f:88, larga:0.2}); return; }
        if(x.on('perc')){ if(s % 2 === 0) shime(D.perc, t, s % 4 === 0 ? 0.3 : 0.16); else if(x.r.rnd() < 0.35) shime(D.perc, t, 0.1);
          if(s === 0 && x.cb % 2 === 0) hyoshigi(D.perc, t, 0.45); if(s === 14) tsuzumi(D.perc, t, 0.4, 1.1); }
        if(x.on('lead')){ if(x.v % 2 === 0) tocarMel(x, this.M, (tt, m, d, k, orn) => shaku(D.lead, tt, m, d*0.94, 0.88*k, {desde:orn, f:3600}));
          else tocarMel(x, this.M2, (tt, m, d, k) => koto(D.lead, tt, m, d, 0.5*k, {b:0.72, eco:0.22})); }
        if(x.on('extra')){ if(s % 2 === 1){ const vs = voces(ac, 76); koto(D.extra, t, vs[(s >> 1) % vs.length], sp*0.9, 0.15 + 0.05*x.r.rnd(), {b:0.85, apaga:1}); }
          if(s === 0 && x.cb % 4 === 0) gong(D.extra, t, 0.4, 82); if(s === 4 || s === 12) tsuzumi(D.extra, t, 0.3, s === 4 ? 1 : 0.9); }
        if(x.on('taiko')){ if(s === 2 || s === 3 || s === 10 || s === 11) taiko(D.taiko, t, 0.42, {f:70, larga:0.35});
          if(x.cb % 2 === 1 && s >= 8) taiko(D.taiko, t, 0.26 + (s - 8)*0.05, {f:96, larga:0.2}); if(s === 0) taiko(D.taiko, t, 0.85, {f:42, larga:1.1}); }
      }},
    /* do in, 132: el jefe. Más rápido y más oscuro: shime en semicorcheas, o-daiko, un riff con la segunda bemol,
       rasgueos secos, la caracola de guerra y un racimo disonante arriba cuando al jefe le queda poco */
    jefe:{bpm:132, vol:0.85, intro:1, kMin:0.3, swing:0, ton:0, esc:[0, 1, 5, 7, 8], capas:{perc:0.1, lead:0.28, extra:0.5, taiko:0.72},
      prog:'Cm Db C5 Abmaj7 Fm Db G5 G7b9',
      mel:'C6.4 Db6.2 C6.2 G5.4 Ab5.4 G5.2 F5.2 Db5.4 C5.8 G5.4 Ab5.4 C6.4 Db6.4 C6.12 -.4 F6.4 Db6.4 C6.4 Ab5.4 G5.2 Ab5.2 G5.2 F5.2 Db5.8 C5.4 Db5.4 F5.4 G5.4 C5.16',
      RIFF:[0, 0, 1, 0, 12, 0, 1, 7],
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 2);
        if(s === 0 || s === 3 || s === 6 || s === 10 || s === 12) taiko(D.base, t, s === 0 ? 0.95 : 0.58, {f:s === 0 ? 44 : 60, larga:0.6});
        shime(D.base, t, s % 4 === 0 ? 0.3 : s % 2 ? 0.1 : 0.18);
        if(s % 2 === 0) bajo(D.base, t, r0 + this.RIFF[s >> 1], sp*1.7, s % 4 === 0 ? 0.62 : 0.46, {f:1500});
        if(s === 0) padV(D.base, t, voces(ac, 52), sp*16, 0.55, {a:0.3, rel:0.6, f:700});
        if(s === 0 || s === 8) rasgueo(D.base, t, voces(ac, 60), 0.42, 0.012, {b:0.6, apaga:1});
        if(x.intro){ if(s >= 8) taiko(D.base, t, 0.28 + (s - 8)*0.07, {f:92, larga:0.2}); return; }
        if(x.on('perc')){ if(s % 4 === 2) hyoshigi(D.perc, t, 0.3); if(s === 7 || s === 15) tsuzumi(D.perc, t, 0.45, s === 7 ? 1.15 : 0.9); }
        if(x.on('lead')){
          if(x.v % 2 === 0) tocarMel(x, this.M, (tt, m, d, k, orn) => shaku(D.lead, tt, m, d*0.92, 0.9*k, {desde:orn || -2, f:4000}));
          else if(x.cb % 2 === 0){ if(s === 0) horagai(D.lead, t, raiz(ac, 3) + 7, sp*12, 0.75); }
          else tocarMel(x, this.M, (tt, m, d, k) => koto(D.lead, tt, m - 12, d, 0.5*k, {b:0.75, apaga:1})); }
        if(x.on('extra')){ if(s === 0) padV(D.extra, t, [r0 + 24, r0 + 25, r0 + 30], sp*16, 0.45, {a:1.5, rel:1.2, f:2200});          /* el racimo que raspa */
          if(s % 2 === 1){ const vs = voces(ac, 74); koto(D.extra, t, vs[(s >> 1) % vs.length] + (s % 8 >= 4 ? 12 : 0), sp*0.8, 0.17, {b:0.85, apaga:1}); } }
        if(x.on('taiko')){ if(s % 2 === 1) taiko(D.taiko, t, 0.34, {f:74, larga:0.28}); if(x.cb % 2 === 1 && s >= 8) taiko(D.taiko, t, 0.32 + (s - 8)*0.08, {f:100, larga:0.18});
          if(s === 0 && x.cb === 0) gong(D.taiko, t, 0.6, 58); if(s === 0) taiko(D.taiko, t, 0.85, {f:36, larga:1.2}); }
      }},
    /* si in, 58: los yokai. Inquietante: un latido grave, algo enorme que respira, el gong, rines desafinados.
       Con la intensidad entran los kotsuzumi sueltos, la flauta de vibrato ancho, el racimo de tritono y los golpes de abajo */
    yokai:{bpm:58, vol:1.2, intro:1, kMin:0.3, swing:0, ton:11, esc:[0, 1, 5, 7, 8], capas:{perc:0.15, lead:0.35, extra:0.55, taiko:0.75},
      prog:'Bsus2 C Bm Gmaj7 Em9 Cmaj7 F#m7b5 B5',
      mel:'F#5.12 G5.4 F#5.8 C5.8 B4.16 -.16 E5.8 F#5.4 G5.4 C6.12 B5.4 F#5.16 -.16',
      mel2:'B5.8 C6.8 B5.4 G5.4 F#5.8 E5.16 -.16 C5.8 E5.8 F#5.4 G5.4 B5.8 C6.16 -.16',
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 1);
        if(s === 0){ padV(D.base, t, voces(ac, 55), sp*16, 0.7, {a:2.5, rel:3, f:700, aire:1.3, sala:0.7}); bajo(D.base, t, r0 + 12, sp*14, 0.3, {f:260}); }
        if(s === 0 || s === 3) taiko(D.base, t, s ? 0.32 : 0.5, {f:36, larga:0.9, sala:0.5});                           /* el latido */
        if(s === 4) respira(D.base, t, sp*10, 0.07);
        if(s === 0 && x.cb % 4 === 0) gong(D.base, t, 0.5, 49);
        if((s === 6 || s === 11) && x.r.rnd() < 0.6){ const vs = voces(ac, 84); rin(D.base, t, vs[Math.floor(x.r.rnd()*vs.length)] + (x.r.rnd() - 0.5)*0.9, 0.22, {largo:1.4, sala:0.8}); }
        if(x.intro) return;
        if(x.on('perc')){ if(s % 4 === 2 && x.r.rnd() < 0.5) tsuzumi(D.perc, t, 0.3, 0.8 + x.r.rnd()*0.3); if(s === 14 && x.r.rnd() < 0.4) hyoshigi(D.perc, t, 0.2); }
        if(x.on('lead')) tocarMel(x, x.v % 2 ? this.M2 : this.M, (tt, m, d, k, orn) => shaku(D.lead, tt, m, d*0.95, 0.75*k, {desde:orn || -3, vib:42, sala:0.85, eco:0.4}));
        if(x.on('extra')){ if(s === 0) padV(D.extra, t, [r0 + 36, r0 + 37, r0 + 42], sp*16, 0.45, {a:3, rel:2, f:2400, sala:0.8});
          if(s % 2 === 1 && x.r.rnd() < 0.3) rin(D.extra, t, 94 + x.r.rnd()*9, 0.08, {largo:0.6, sala:0.8}); }
        if(x.on('taiko')){ if(s === 8 || s === 11) taiko(D.taiko, t, 0.55, {f:32, larga:1.3, sala:0.6}); if(s === 0 && x.cb % 2 === 1) gong(D.taiko, t, 0.45, 41); }
      }},
    /* re yo, 100: se ganó el capítulo. Redoble que acelera, el koto que sube de un tirón, la flauta arriba, gong y rines;
       después un bucle suave para la pantalla de resultado */
    victoria_capitulo:{bpm:100, vol:1.1, intro:2, swing:0, ton:2, esc:[0, 2, 5, 7, 9],
      prog:'Gmaj9 Dadd9 Gmaj9 Asus',
      toca(x){ const {s, t, ac, sp, c} = x, B = x.r.cap.base;
        if(c === 0){
          if(s === 0) [0, 0.3, 0.5, 0.62, 0.72, 0.8, 0.86, 0.91].forEach((q, i) => taiko(B, t + q*sp*8, 0.3 + i*0.06, {f:78, larga:0.3}));
          if(s === 8){ taiko(B, t, 1, {f:48, larga:1.1}); [62, 64, 67, 69, 71, 74, 76, 79, 81, 83, 86].forEach((m, i) => koto(B, t + i*0.035, m, 1.2, 0.42, {b:0.75})); }
          if(s === 12) shaku(B, t, 81, sp*4, 0.9, {desde:-2});
        }
        if(c === 1 && s === 0){ gong(B, t, 0.6, 73.4); [86, 90, 93].forEach((m, i) => rin(B, t + i*0.12, m, 0.4));
          shaku(B, t, 86, sp*14, 0.85, {desde:-3, vib:26}); padV(B, t, voces(TEMAS.victoria_capitulo.A[1], 62), sp*16, 0.7, {a:0.6, rel:2}); bajo(B, t, 38, sp*14, 0.5); }
        if(c < 2) return;
        if(s === 0){ padV(B, t, voces(ac, 62), sp*16, 0.55, {a:1.5, rel:2, f:1100, aire:0.4}); bajo(B, t, raiz(ac, 2), sp*14, 0.34, {f:600}); }
        if(s % 2 === 0 && x.r.rnd() < 0.55){ const vs = voces(ac, 69); koto(B, t, vs[(s >> 1) % vs.length] + (s >= 8 ? 12 : 0), sp*3, 0.3, {b:0.5, eco:0.25}); }
        if(s === 0 && x.cb % 2 === 0){ const vs = voces(ac, 88); rin(B, t, vs[vs.length - 1], 0.26); }
      }},
    /* la in, 56: la derrota. Gong grave, taiko lento y la flauta que baja; después queda el viento y un rin cada tanto */
    derrota:{bpm:56, vol:1.15, intro:2, swing:0, ton:9, esc:[0, 1, 5, 7, 8],
      prog:'Am Fmaj7 Dm9 Esus',
      LINEA:[[2, 76, 5], [8, 74, 3], [11, 70, 3], [14, 69, 12]],
      toca(x){ const {s, t, ac, sp, c} = x, B = x.r.cap.base;
        if(c === 0){
          if(s === 0){ gong(B, t, 0.7, 55); taiko(B, t, 0.8, {f:40, larga:1.4}); padV(B, t, voces(ac, 57), sp*32, 0.6, {a:2, rel:3, f:650}); bajo(B, t, 33, sp*28, 0.4, {f:300}); }
          if(s === 8) taiko(B, t, 0.45, {f:44, larga:1});
          for(const [q, m, d] of this.LINEA) if(s === q) shaku(B, t, m, sp*d, 0.8, {desde:-1, vib:30, sala:0.7});
        }
        if(c === 1){ if(s === 0) [57, 53, 50].forEach((m, i) => koto(B, t + i*sp*3, m, sp*3, 0.34, {b:0.3, sala:0.5}));
          if(s === 8){ taiko(B, t, 0.5, {f:38, larga:1.2}); rin(B, t, 81, 0.25, {largo:1.4}); } }
        if(c < 2) return;
        if(s === 0){ padV(B, t, voces(ac, 57), sp*16, 0.5, {a:2, rel:2, f:700, aire:0.6}); bajo(B, t, raiz(ac, 2), sp*14, 0.28, {f:400}); }
        if(s === 0 && x.cb % 2 === 0){ const vs = voces(ac, 81); rin(B, t, vs[vs.length - 1], 0.2, {largo:1.2}); }
        if(s === 8 && x.r.rnd() < 0.5){ const vs = voces(ac, 57); koto(B, t, vs[Math.floor(x.r.rnd()*vs.length)], sp*6, 0.26, {b:0.3, sala:0.5}); }
        if(s === 0 && x.cb === 3) soplo(B, t, sp*14, 0.05, 400, 1100);
      }}
  };
  try { for(const k in TEMAS){ const T = TEMAS[k]; if(T.prog) T.A = T.prog.split(' ').map(acorde); if(T.mel) T.M = melodia(T.mel); if(T.mel2) T.M2 = melodia(T.mel2); } } catch(e){ err(e); }

  /* ------------------------------------------------------------ secuenciador */
  const REPS = [], CAPAS = ['perc', 'lead', 'extra', 'taiko'];
  const objCapa = (T, n) => T.capas ? suv(lim((Math.max(inten, T.kMin || 0) - T.capas[n])/0.2, 0, 1)) : 0;
  let semilla = 7;
  function nuevoRep(nom, entra){
    const T = TEMAS[nom], now = ya(), vol = T.vol || 1;
    const r = {nom, T, paso:0, t:now + 0.08, vivo:true, muere:0, cap:{}, cv:{}, oscs:[], rnd:mulberry(semilla++*977 + 13)};
    r.bus = G(0, N.mus); r.eco = G(0, N.eco); r.sala = G(0, N.sala);                        /* los envíos también se funden con el tema */
    for(const g of [r.bus, r.eco, r.sala]){ g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(vol, now + entra); }
    const capa = v => { const g = G(v, r.bus); g._eco = G(v, r.eco); g._sala = G(v, r.sala); return g; };
    r.kb = T.capas ? lerp(0.75, 1, Math.max(inten, T.kMin || 0)) : 1; r.cap.base = capa(r.kb);
    for(const n of CAPAS){ r.cv[n] = objCapa(T, n); r.cap[n] = capa(r.cv[n]); }
    r.on = n => !!T.capas && (r.cv[n] > 0.004 || objCapa(T, n) > 0.004);
    N.ecoD.delayTime.setTargetAtTime(60/T.bpm*0.75, now, 0.1);
    return r;
  }
  function capaA(g, v, now){ for(const p of [g.gain, g._eco.gain, g._sala.gain]) p.setTargetAtTime(v, now, 0.35); }
  function soltar(r, fund){ const now = ya();
    for(const g of [r.bus, r.eco, r.sala]){ const p = g.gain; p.cancelScheduledValues(now); p.setValueAtTime(Math.max(p.value, 0.0001), now); p.linearRampToValueAtTime(0.0001, now + fund); }
    r.vivo = false; r.muere = Math.min(r.muere || Infinity, now + fund + 0.2); }
  const durPaso = r => 60/r.T.bpm/4*(1 + 0.3*kLento);
  function bombear(){
    const now = ya(), hasta = now + 0.15;
    for(const r of REPS){
      if(!r.vivo && now > r.muere - 0.2) continue;
      if(r.t < now - 0.06) r.t = now + 0.02;                  /* se trabó el cuadro: no se programa en el pasado */
      kAhora = Math.max(inten, r.T.kMin || 0);
      let n = 0;
      while(r.t < hasta && n++ < 16){
        const T = r.T, s = r.paso % 16, c = Math.floor(r.paso/16), intro = c < T.intro, cb = intro ? c % T.A.length : (c - T.intro) % T.A.length;
        const sp = durPaso(r), sw16 = sp*(T.swing || 0);
        const x = {r, s, c, cb, v:intro ? 0 : Math.floor((c - T.intro)/T.A.length), intro, ac:T.A[cb], t:r.t, sp, on:r.on, sw:q => q % 2 ? sw16 : 0};
        repAct = r; try { T.toca(x); } catch(e){ err(e); } repAct = null;
        r.t += sp; r.paso++;
      }
    }
  }
  function musica(tema){
    try {
      const pedido = tiene(TEMAS, tema) ? tema : null;
      temaPed = pedido; if(!listo) return;
      if(pedido === temaAct) return; temaAct = pedido;
      for(const r of REPS) if(r.vivo) soltar(r, 1.2);
      if(pedido) REPS.push(nuevoRep(pedido, 1.2));
    } catch(e){ err(e); }
  }

  /* ------------------------------------------------------------ piezas de los efectos */
  const YO = [0, 2, 5, 7, 9];
  const kotoFx = (d, t, m, dur, v, o) => koto(d, t, m, dur, v, Object.assign({fx:1}, o || {}));
  const semi = k => 12*Math.log2(k);
  /* el metal que suena solo: parciales inarmónicos que baten */
  const metal = (t, d, f0, v, largo) => [[1, 1], [2.76, 0.55], [5.4, 0.3], [8.93, 0.16], [13.3, 0.08]].forEach(([r, a], i) => {
    if(f0*r > C.sampleRate*0.45) return;
    for(const bat of [-1.5, 1.5]) TN({t, a:0.001, f:f0*r + bat*r, d:(largo || 0.8)*(1 - i*0.15), v:v*a*0.5, tipo:i ? 'sine' : 'triangle', dest:d}); });
  /* el acero de la katana: una campana de hoja, más armónica que el metal suelto, que canta y tarda en irse */
  function acero(t, d, f0, v, largo){ const mix = G(1, d);
    [[1, 1, 1], [2.02, 0.45, 0.75], [2.76, 0.5, 0.6], [3.98, 0.22, 0.45], [5.4, 0.2, 0.3], [6.8, 0.08, 0.2]].forEach(([r, a, dd]) => {
      const f = f0*r; if(f > C.sampleRate*0.45) return; const g = G(0, mix), L = largo*dd, fin = t + L*1.6 + 0.05;
      for(const b of [-0.7, 0.7]) oscF('sine', f + b*r, t, fin).connect(g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*a*0.5, t + 0.0015); g.gain.setTargetAtTime(0, t + 0.0015, L/4.5); }); }
  /* chispas: puntitos agudos y sueltos por todo el panorama, y el chisporroteo */
  function chispas(t, d, n, v, dur){ for(let i = 0; i < n; i++){ const tt = t + Math.pow(Math.random(), 1.8)*dur;
      TN({t:tt, a:0.0008, f:rv(3500, 9500), d:rv(0.015, 0.06), v:v*rv(0.4, 1), dest:panear(d, rv(-0.8, 0.8))}); }
    RZ({t, d:dur*0.5, v:v*2, f:7000, tipo:'highpass', q:0.5, dest:d}); }
  /* una campanita que se desafina mientras suena: cada mitad del batido cae distinto */
  function campanita(t, d, f, v, cae, largo){
    for(const [r, a, dd] of [[1, 1, 1], [2.76, 0.35, 0.6], [5.4, 0.15, 0.35]]){ if(f*r > C.sampleRate*0.45) continue;
      const g = G(0, d), L = largo*dd, fin = t + L*1.6 + 0.05;
      for(const b of [-1, 1]){ const q = oscF('sine', f*r + b*1.2*r, t, fin); q.detune.setValueAtTime(0, t); q.detune.linearRampToValueAtTime(-cae*(b > 0 ? 1.3 : 1), t + L); q.connect(g); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*a*0.5, t + 0.002); g.gain.setTargetAtTime(0, t + 0.002, L/4.5); } }
  const trueno = (t, d, v, f) => { TN({t, f:(f || 90)*1.4, f2:(f || 90)*0.4, fd:0.35, d:0.5, v, dest:d}); RZ({t, a:0.01, d:1.1, v:v*0.8, f:240, f2:90, fd:1, tipo:'lowpass', col:'pardo', dest:d}); };

  /* ------------------------------------------------------------ efectos */
  const FXM = {
    tajo:{max:4, vol:0.78, rev:0.08}, tajo2:{max:4, vol:0.78, rev:0.08}, estocada:{max:3, vol:0.85, rev:0.06}, tajo_pesado:{max:2, vol:0.65, rev:0.12},
    carne:{max:4, vol:0.65, rev:0.05}, sangre:{max:4, vol:0.65, rev:0.05}, choque:{max:3, vol:0.6, rev:0.25}, desvio:{max:2, vol:0.75, rev:0.45},
    guardia_rota:{max:2, vol:0.7, rev:0.3}, aturdido:{max:1, vol:0.8, rev:0.4}, relampago:{max:1, vol:0.8, rev:0.5},
    aviso_ligero:{max:2, vol:0.55, rev:0.3}, aviso_pesado:{max:1, vol:0.75, rev:0.4}, esquive:{max:3, vol:0.5, rev:0.05}, paso:{max:3, vol:0.4, rev:0.03},
    golpeado:{max:2, vol:0.7, rev:0.1}, muerte:{max:2, vol:0.65, rev:0.25}, muerte_heroe:{max:1, vol:0.8, rev:0.6},
    habilidad:{max:1, vol:0.7, rev:0.3}, ki_listo:{max:1, vol:0.95, rev:0.5, ui:1}, concentracion:{max:1, vol:0.6, rev:0.5}, distorsion:{max:1, vol:0.6, rev:0.3},
    lanza:{max:3, vol:0.85, rev:0.08}, garrote:{max:2, vol:0.7, rev:0.12}, rugido_oni:{max:1, vol:0.7, rev:0.4}, huesos:{max:2, vol:0.6, rev:0.3},
    grito_yokai:{max:1, vol:0.6, rev:0.6}, sapo:{max:2, vol:0.75, rev:0.35}, lengua:{max:2, vol:0.6, rev:0.12},
    jefe_aparece:{max:1, vol:0.8, rev:0.6}, etapa:{max:1, vol:0.7, rev:0.5}, victoria:{max:1, vol:0.7, rev:0.45, ui:1}, derrota:{max:1, vol:0.7, rev:0.5, ui:1},
    carta:{max:3, vol:0.55, rev:0.1, ui:1}, elegir:{max:1, vol:0.6, rev:0.35, ui:1}, moneda:{max:5, vol:0.6, rev:0.15, ui:1}, compra:{max:2, vol:0.58, rev:0.2, ui:1},
    mejora:{max:1, vol:0.85, rev:0.35, ui:1}, desbloqueo:{max:1, vol:0.9, rev:0.45, ui:1}, menu_mover:{max:4, vol:0.4, ui:1}, menu_ok:{max:3, vol:0.5, rev:0.06, ui:1},
    menu_atras:{max:2, vol:0.45, ui:1}, titulo:{max:1, vol:0.75, rev:0.5, ui:1}, pincel:{max:3, vol:0.85, rev:0.15, ui:1}
  };
  const FX = {
    /* ---- la katana del héroe */
    tajo(t, o, d){ const k = o.tono*rv(0.94, 1.06), p = barrido(d, t, -0.35, 0.35, 0.14);
      RZ({t, a:0.05, d:0.07, v:1.1, f:900*k, f2:5200*k, fd:0.12, q:1.6, dest:p});                           /* la hoja partiendo el aire */
      RZ({t:t + 0.02, a:0.03, d:0.08, v:0.5, f:2600*k, f2:8000*k, fd:0.1, q:3, dest:p});                    /* el filo que silba */
      RZ({t, a:0.06, d:0.1, v:0.35, f:500*k, f2:900*k, q:0.8, col:'rosa', dest:d});                         /* el cuerpo del aire */
      [3700, 5210].forEach((f, i) => TN({t:t + 0.06, a:0.004, f:f*k, d:0.25 - i*0.08, v:0.025, dest:p})); return 0.45; },
    tajo2(t, o, d){ const k = o.tono*rv(0.94, 1.06), p = barrido(d, t, 0.35, -0.35, 0.16);                /* el revés: baja y cruza al otro lado */
      RZ({t, a:0.04, d:0.09, v:1.1, f:4800*k, f2:1300*k, fd:0.15, q:1.5, dest:p});
      RZ({t:t + 0.01, a:0.05, d:0.06, v:0.4, f:7000*k, f2:3000*k, fd:0.12, q:4, dest:p});
      RZ({t, a:0.05, d:0.12, v:0.35, f:700*k, f2:400*k, q:0.8, col:'rosa', dest:d});
      TN({t:t + 0.07, a:0.003, f:4400*k, d:0.2, v:0.022, dest:p}); return 0.45; },
    estocada(t, o, d){ const k = o.tono*rv(0.95, 1.05);
      RZ({t, a:0.03, d:0.04, v:1.2, f:700*k, f2:3400*k, fd:0.07, q:2.2, dest:d});                           /* el empuje */
      RZ({t:t + 0.06, d:0.012, v:0.35, f:5000*k, tipo:'highpass', q:0.7, dest:d});                          /* la punta que llega */
      TN({t:t + 0.06, f:2900*k, f2:2500*k, d:0.12, v:0.03, dest:d}); RZ({t, a:0.02, d:0.06, v:0.3, f:350, tipo:'lowpass', col:'rosa', dest:d}); return 0.3; },
    tajo_pesado(t, o, d){ const k = o.tono*rv(0.95, 1.05), p = barrido(d, t, -0.5, 0.5, 0.38);
      RZ({t, a:0.18, d:0.2, v:1.2, f:260*k, f2:1900*k, fd:0.34, q:1.2, col:'rosa', dest:p});
      RZ({t:t + 0.1, a:0.1, d:0.16, v:0.45, f:1200*k, f2:3800*k, fd:0.25, q:2.5, dest:p});
      TN({t:t + 0.05, a:0.1, f:95*k, f2:55*k, fd:0.35, d:0.3, v:0.35, dest:d});                             /* el peso del brazo */
      TN({t:t + 0.26, a:0.004, f:2600*k, d:0.35, v:0.025, dest:p}); return 0.8; },
    /* ---- lo que corta y lo que choca */
    carne(t, o, d){ const k = o.tono*rv(0.92, 1.08);
      TN({t, f:160*k, f2:55, fd:0.06, d:0.12, v:0.9, dest:d}); RZ({t, d:0.05, v:0.8, f:900*k, tipo:'lowpass', q:0.8, col:'rosa', dest:d});
      const g = G(0, d), bp = F('bandpass', 900*k, 3.5, g), s = fuente('rosa', t, t + 0.35), l = oscF('square', rv(34, 42), t, t + 0.35);   /* lo húmedo: un chapoteo que tiembla */
      bp.frequency.setValueAtTime(900*k, t); bp.frequency.exponentialRampToValueAtTime(260*k, t + 0.18); s.connect(bp); l.connect(G(0.35, g.gain)); env(g.gain, t + 0.005, 0.004, 0.9, 0.14);
      RZ({t:t + 0.004, d:0.02, v:0.35, f:2200*k, q:1.2, dest:d}); return 0.4; },
    sangre(t, o, d){ const k = o.tono*rv(0.9, 1.1);
      RZ({t, a:0.01, d:0.18, v:0.5, f:1800*k, f2:700*k, q:0.9, col:'rosa', dest:d});                         /* el chorro */
      for(let i = 0, tt = t + 0.02; i < 7; i++, tt += rv(0.02, 0.06)){ const p = panear(d, rv(-0.5, 0.5)), f = rv(500, 1100)*k;   /* las gotas que caen */
        TN({t:tt, f, f2:f*0.5, fd:0.04, d:0.05, v:rv(0.1, 0.22), dest:p}); RZ({t:tt, d:0.025, v:rv(0.15, 0.35), f:rv(900, 2200), q:2.5, col:'rosa', dest:p}); }
      return 0.7; },
    choque(t, o, d){ const k = o.tono*rv(0.95, 1.05);
      metal(t, d, 860*k, 0.22, 0.6); metal(t, d, 1310*k, 0.1, 0.4);
      RZ({t, d:0.02, v:0.9, f:3500, tipo:'highpass', dest:d}); TN({t, f:240*k, f2:110, fd:0.05, d:0.08, v:0.5, dest:d});
      chispas(t, d, 14, 0.05, 0.18); return 1; },
    /* el desvío perfecto: el golpe seco, la hoja que canta como campana de acero, un brillo que abre el panorama y las chispas */
    desvio(t, o, d){ const k = o.tono*rv(0.98, 1.02), f0 = 1180*k;
      RZ({t, d:0.015, v:1, f:4500, tipo:'highpass', q:0.7, dest:d}); TN({t, f:320*k, f2:160*k, fd:0.04, d:0.07, v:0.45, dest:d});
      acero(t, d, f0, 0.16, 2.2);
      acero(t + 0.004, panear(d, -0.6), f0*1.5, 0.05, 1.4); acero(t + 0.008, panear(d, 0.6), f0*2.005, 0.04, 1.2);
      chispas(t, d, 18, 0.06, 0.25);
      const g = G(0, d), s = oscF('sine', f0*1.98, t, t + 1.8), l = oscF('sine', 5.5, t, t + 1.8);           /* el brillo que se asienta arriba */
      s.frequency.exponentialRampToValueAtTime(f0*2, t + 0.3); l.connect(G(6, s.frequency)); s.connect(g); env(g.gain, t, 0.01, 0.04, 1.2);
      return 2.6; },
    guardia_rota(t, o, d){ const k = o.tono*rv(0.96, 1.04), sat = saturador(3, d);
      metal(t, sat, 185*k, 0.3, 0.9); metal(t, sat, 197*k, 0.25, 0.8);                                     /* dos metales que no se ponen de acuerdo */
      TN({t, f:120*k, f2:45, fd:0.15, d:0.3, v:0.9, dest:d}); RZ({t, d:0.12, v:0.7, f:900, f2:200, q:0.8, tipo:'lowpass', col:'rosa', dest:d});
      RZ({t:t + 0.02, d:0.25, v:0.35, f:1800*k, f2:600*k, q:2, dest:sat});
      const g = G(0, d), bp = F('bandpass', 420*k, 4, g), s = oscF('sawtooth', 92*k, t, t + 1), l = oscF('sine', 9, t, t + 1);   /* la chapa que queda temblando */
      s.frequency.linearRampToValueAtTime(70*k, t + 0.8); l.connect(G(12, s.frequency)); s.connect(bp); env(g.gain, t, 0.005, 0.25, 0.7);
      return 1.3; },
    aturdido(t, o, d){ const k = o.tono;
      [[0, 2637], [0.14, 3136], [0.28, 2349], [0.42, 2794], [0.6, 2093]].forEach(([q, f], i) => campanita(t + q, panear(d, Math.sin(i*1.4)*0.7), f*k, 0.09, 80 + i*60, 0.9));
      const g = G(0, d), s = oscF('sine', 420*k, t, t + 1.5), l = oscF('sine', 6, t, t + 1.5);                /* la cabeza que da vueltas */
      s.frequency.exponentialRampToValueAtTime(300*k, t + 1.3); l.connect(G(18, s.frequency)); s.connect(g); adsr(g.gain, t, 0.1, 0.3, 0.7, t + 1, 0.3, 0.05);
      return 1.9; },
    /* el contragolpe relámpago: la toma de aire, la hoja que cruza la pantalla y, 0,35 s después, el corte seco que queda sonando */
    relampago(t, o, d){ const k = o.tono;
      RZ({t, a:0.24, d:0.08, v:0.5, f:500*k, f2:1500*k, fd:0.3, q:1.1, col:'rosa', dest:d});
      RZ({t, a:0.22, d:0.06, v:0.18, f:3000*k, f2:5000*k, fd:0.3, q:1, dest:d});
      const t1 = t + 0.3, p = barrido(d, t1, -1, 1, 0.2);
      RZ({t:t1, a:0.08, d:0.07, v:1.1, f:1200*k, f2:7000*k, fd:0.16, q:2, dest:p});
      const g = G(0, p), s = oscF('sine', 3400*k, t1, t1 + 0.35); s.frequency.exponentialRampToValueAtTime(1700*k, t1 + 0.2); s.connect(g); env(g.gain, t1, 0.05, 0.07, 0.12);
      const t2 = t1 + 0.35;
      RZ({t:t2, d:0.01, v:1.2, f:5000, tipo:'highpass', q:0.7, dest:d}); RZ({t:t2, d:0.05, v:0.8, f:2500*k, f2:900*k, q:1.5, col:'rosa', dest:d});
      TN({t:t2, f:150*k, f2:45, fd:0.1, d:0.25, v:0.9, dest:d}); taiko(d, t2, 0.6, {f:42, larga:1.2, sala:0});
      acero(t2, d, 1480*k, 0.13, 3.2); acero(t2 + 0.005, panear(d, -0.5), 2217*k, 0.04, 2);
      return 4.2; },
    /* ---- los avisos del enemigo */
    aviso_ligero(t, o, d){ const k = o.tono;
      TN({t, a:0.001, f:3520*k, d:0.16, v:0.22, tipo:'triangle', dest:d}); TN({t, f:3520*2.76*k, d:0.06, v:0.04, dest:d});
      TN({t, f:5274*k, d:0.1, v:0.06, dest:d}); RZ({t, d:0.006, v:0.3, f:7000, tipo:'highpass', dest:d}); return 0.3; },
    aviso_pesado(t, o, d){ const k = o.tono;
      taiko(d, t, 1, {f:38, larga:1.2, sala:0});
      const g = G(0, d), lp = F('lowpass', 250, 1.4, g);                                                    /* la disonancia: la segunda bemol y el tritono */
      for(const f of [110, 116.5, 155.6]){ const a = oscF('sawtooth', f*k, t, t + 1.05); a.frequency.exponentialRampToValueAtTime(f*k*0.97, t + 0.9); a.connect(lp); }
      lp.frequency.setValueAtTime(250, t); lp.frequency.exponentialRampToValueAtTime(1600, t + 0.35); lp.frequency.exponentialRampToValueAtTime(300, t + 0.85);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.12); g.gain.setTargetAtTime(0, t + 0.5, 0.12);
      metal(t + 0.02, d, 233*k, 0.05, 0.7); RZ({t, a:0.25, d:0.4, v:0.3, f:3000*k, f2:800*k, q:5, dest:d});
      return 1; },
    /* ---- el cuerpo */
    esquive(t, o, d){ const k = o.tono*rv(0.92, 1.08), g = G(0, d), bp = F('bandpass', 1800*k, 0.9, g), s = fuente('blanco', t, t + 0.35), l = oscF('sine', rv(28, 40), t, t + 0.35);
      s.connect(bp); l.connect(G(0.2, g.gain)); env(g.gain, t, 0.04, 0.45, 0.16);                          /* la tela que roza */
      RZ({t, a:0.06, d:0.12, v:0.7, f:300*k, f2:900*k, q:1, col:'rosa', dest:d}); return 0.35; },
    paso(t, o, d){ const k = o.tono*rv(0.9, 1.1);
      TN({t, f:70*k, f2:42, fd:0.06, d:0.1, v:0.45, dest:d}); RZ({t, d:0.05, v:0.4, f:380*k, tipo:'lowpass', q:0.7, col:'rosa', dest:d});
      const n = 2 + Math.floor(Math.random()*3);                                                           /* la tierra y las piedritas: nunca iguales */
      for(let i = 0; i < n; i++) RZ({t:t + rv(0, 0.04), d:rv(0.006, 0.02), v:rv(0.05, 0.14), f:rv(1800, 4200), q:rv(1, 3), dest:d});
      return 0.25; },
    golpeado(t, o, d){ const k = o.tono*rv(0.94, 1.06);
      TN({t, f:115*k, f2:45, fd:0.1, d:0.2, v:1, dest:d}); RZ({t, d:0.08, v:0.8, f:600*k, tipo:'lowpass', q:0.7, col:'rosa', dest:d});
      RZ({t, d:0.02, v:0.3, f:1500*k, q:1, dest:d});
      vox(t + 0.03, d, {vocal:'u', f:140*k, f2:165*k, pico:0.3, f3:110*k, d:0.16, v:0.35, sucio:1.6, q:6}); return 0.45; },
    muerte(t, o, d){ const k = o.tono*rv(0.95, 1.05);
      vox(t, d, {vocal:'a', f:170*k, f2:190*k, pico:0.2, f3:95*k, d:0.45, v:0.35, sucio:1.8, q:6, aire:0.05});   /* el último aire */
      const t1 = t + 0.35; TN({t:t1, f:85*k, f2:36, fd:0.1, d:0.25, v:0.95, dest:d}); RZ({t:t1, d:0.14, v:0.7, f:420, tipo:'lowpass', col:'pardo', dest:d});
      RZ({t:t1, a:0.01, d:0.2, v:0.35, f:900, q:0.8, col:'rosa', dest:d}); TN({t:t1 + 0.14, f:70*k, f2:40, d:0.12, v:0.4, dest:d});
      metal(t1 + 0.22, d, 1350*k, 0.07, 0.9); metal(t1 + 0.34, d, 1420*k, 0.04, 0.7);                       /* la hoja que cae y rebota */
      return 2; },
    muerte_heroe(t, o, d){ const k = o.tono;
      gong(d, t, 1, 55*k, {fx:1, sala:0}); taiko(d, t, 1, {f:36, larga:1.6, sala:0});
      RZ({t, a:0.3, d:1.5, v:0.5, f:180, tipo:'lowpass', col:'pardo', dest:d});
      shaku(d, t + 0.35, 69 + semi(k), 2.2, 0.9, {fx:1, desde:-1.5, vib:30, cae:5});
      return 3.4; },
    /* ---- el ki */
    habilidad(t, o, d){ const k = o.tono;
      const g = G(0, d), lp = F('lowpass', 300, 2, g), a = oscF('sawtooth', 110*k, t, t + 0.8), b = oscF('sine', 220*k, t, t + 0.8);   /* la carga que sube */
      a.frequency.exponentialRampToValueAtTime(440*k, t + 0.7); b.frequency.exponentialRampToValueAtTime(880*k, t + 0.7); a.connect(lp); b.connect(G(0.8, lp));
      lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(4000, t + 0.7);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 0.68); g.gain.setTargetAtTime(0, t + 0.7, 0.03);
      RZ({t, a:0.65, d:0.06, v:0.5, f:600*k, f2:4000*k, fd:0.7, q:1.4, col:'rosa', dest:d});
      rin(d, t + 0.68, 93 + semi(k), 0.4, {fx:1, largo:0.5, sala:0});
      [0, 0.14, 0.28, 0.44].forEach((q, i) => { const tt = t + 0.75 + q; (i % 2 ? FX.tajo2 : FX.tajo)(tt, {tono:k*(1 + i*0.06)}, panear(d, i % 2 ? 0.5 : -0.5)); if(i === 3) FX.carne(tt + 0.05, {tono:k}, d); });
      taiko(d, t + 1.25, 0.8, {f:44, larga:0.8, sala:0}); return 2.4; },
    ki_listo(t, o, d){ const k = o.tono; [86, 90, 93].forEach((m, i) => rin(d, t + i*0.05, m + semi(k), 0.55, {fx:1, largo:0.9, sala:0}));
      kotoFx(d, t + 0.15, 98 + semi(k), 1, 0.3, {b:0.85}); return 2.8; },
    concentracion(t, o, d){ const k = o.tono;
      RZ({t, a:0.4, d:0.2, v:0.45, f:400*k, f2:1100*k, fd:0.5, q:1.2, col:'rosa', dest:d});                /* el aire adentro */
      const g = G(0, d), s = oscF('sine', 110*k, t, t + 1.7), s2 = oscF('sine', 165*k, t, t + 1.7); s.connect(g); s2.connect(G(0.5, g)); adsr(g.gain, t, 0.5, 0.4, 0.7, t + 1, 0.4, 0.16);
      tsuzumi(d, t + 0.45, 0.7, 0.9); rin(d, t + 0.45, 81 + semi(k), 0.3, {fx:1, largo:1, sala:0}); return 2; },
    distorsion(t, o, d){ const k = o.tono;
      RZ({t, a:0.03, d:0.7, v:0.8, f:4000*k, f2:180*k, fd:0.8, q:1.8, col:'rosa', dest:d});
      const g = G(0, d), lp = F('lowpass', 2400, 1, g), a = oscF('sawtooth', 880*k, t, t + 1.2), b = oscF('sine', 440*k, t, t + 1.2);   /* el tiempo que se estira */
      a.frequency.exponentialRampToValueAtTime(70*k, t + 0.9); b.frequency.exponentialRampToValueAtTime(40*k, t + 0.9);
      lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.9); a.connect(lp); b.connect(lp); adsr(g.gain, t, 0.02, 0.4, 0.7, t + 0.8, 0.2, 0.18);
      TN({t:t + 0.6, f:60*k, f2:35, d:0.5, v:0.4, dest:d}); return 1.3; },
    /* ---- las armas de los otros */
    lanza(t, o, d){ const k = o.tono*rv(0.95, 1.05);
      RZ({t, a:0.08, d:0.1, v:1.1, f:400*k, f2:2200*k, fd:0.16, q:1.5, col:'rosa', dest:d});
      for(let i = 0; i < 3; i++){ const tt = t + 0.02 + i*0.035; TN({t:tt, f:rv(280, 380)*k, d:0.04, v:0.12, tipo:'triangle', dest:d}); RZ({t:tt, d:0.015, v:0.15, f:900*k, q:6, dest:d}); }   /* el asta */
      RZ({t:t + 0.15, d:0.012, v:0.4, f:5200*k, tipo:'highpass', dest:d}); TN({t:t + 0.15, f:2400*k, d:0.12, v:0.03, dest:d}); return 0.45; },
    garrote(t, o, d){ const k = o.tono*rv(0.95, 1.05), p = barrido(d, t, -0.3, 0.3, 0.55);
      RZ({t, a:0.3, d:0.28, v:1.4, f:120*k, f2:650*k, fd:0.5, q:1.1, col:'rosa', dest:p});
      const g = G(0, p), bp = F('bandpass', 350*k, 1.2, g), s = fuente('rosa', t, t + 0.85), l = oscF('triangle', 14, t, t + 0.85);   /* el kanabo que gira */
      l.frequency.linearRampToValueAtTime(22, t + 0.5); s.connect(bp); l.connect(G(0.3, g.gain)); adsr(g.gain, t, 0.3, 0.2, 0.8, t + 0.5, 0.15, 0.5);
      TN({t, a:0.25, f:48*k, f2:32*k, fd:0.5, d:0.35, v:0.5, dest:d}); return 0.9; },
    /* ---- los monstruos */
    rugido_oni(t, o, d){ const k = o.tono*rv(0.94, 1.06);
      vox(t, d, {vocal:'a', f:88*k, f2:118*k, pico:0.35, f3:66*k, d:1.2, v:0.55, sucio:3, q:5, vib:7, aire:0.08, fk:0.8});
      vox(t + 0.03, d, {vocal:'o', f:60*k, f2:78*k, pico:0.4, f3:46*k, d:1.1, v:0.45, sucio:2.6, q:5, fk:0.7});
      const g = G(0, d), lp = F('lowpass', 700, 1, g), s = fuente('rosa', t, t + 1.5), l = oscF('square', 31, t, t + 1.5);           /* la garganta que raspa */
      s.connect(lp); l.connect(G(0.4, g.gain)); adsr(g.gain, t, 0.1, 0.5, 0.8, t + 1, 0.3, 0.5); return 1.6; },
    huesos(t, o, d){ const k = o.tono*rv(0.94, 1.06);
      TN({t, f:90*k, f2:50, d:0.15, v:0.35, dest:d});
      for(let i = 0; i < 26; i++){ const tt = t + Math.pow(Math.random(), 1.3)*0.8, f = rv(700, 1900)*k, p = panear(d, rv(-0.6, 0.6));
        TN({t:tt, a:0.001, f, f2:f*0.85, d:rv(0.02, 0.05), v:rv(0.06, 0.18), tipo:'triangle', dest:p}); RZ({t:tt, d:0.012, v:rv(0.1, 0.3), f:f*1.6, q:7, dest:p}); }
      const g = G(0, d), bp = F('bandpass', 520*k, 10, g), s = oscF('sawtooth', 18, t, t + 0.9); s.frequency.linearRampToValueAtTime(34, t + 0.8); s.connect(bp);   /* las junturas que crujen */
      adsr(g.gain, t, 0.15, 0.3, 0.8, t + 0.6, 0.2, 0.3); return 1.1; },
    grito_yokai(t, o, d){ const k = o.tono*rv(0.95, 1.05);
      const rm = G(0, d), mo = oscF('sine', 173*k, t, t + 1.8); mo.frequency.linearRampToValueAtTime(260*k, t + 1.4); mo.connect(rm.gain);   /* una voz multiplicada por otra cosa: no es de nadie */
      vox(t, rm, {vocal:'i', f:620*k, f2:1350*k, pico:0.25, f3:480*k, d:1.4, v:0.6, sucio:2, q:8, vib:11, aire:0.1});
      vox(t, d, {vocal:'a', f:880*k, f2:1500*k, pico:0.2, f3:600*k, d:1.3, v:0.25, q:9, vib:13});
      RZ({t, a:0.1, d:1, v:0.35, f:2500*k, f2:900*k, q:2, col:'rosa', dest:d}); return 1.9; },
    sapo(t, o, d){ const k = o.tono*rv(0.95, 1.05);
      for(const [q, f] of [[0, 52], [0.55, 46]]){ const tt = t + q, g = G(0, d), bp1 = F('bandpass', 320*k, 3, g), bp2 = F('bandpass', 720*k, 4, G(0.6, g));
        const s = oscF('sawtooth', f*k, tt, tt + 0.6), am = G(0.5), l = oscF('square', 17, tt, tt + 0.6);        /* la garganta que se infla y golpea */
        s.frequency.linearRampToValueAtTime(f*1.12*k, tt + 0.12); s.frequency.exponentialRampToValueAtTime(f*0.8*k, tt + 0.45);
        l.connect(G(0.5, am.gain)); s.connect(am); am.connect(bp1); am.connect(bp2); adsr(g.gain, tt, 0.03, 0.2, 0.8, tt + 0.4, 0.1, 1.6);
        TN({t:tt, a:0.03, f:f*0.95*k, d:0.35, v:0.35, dest:d}); }
      return 1.3; },
    lengua(t, o, d){ const k = o.tono*rv(0.94, 1.06);
      RZ({t, a:0.03, d:0.04, v:1, f:500*k, f2:3500*k, fd:0.07, q:1.5, dest:d});                             /* el latigazo */
      RZ({t:t + 0.07, d:0.008, v:0.9, f:3000, tipo:'highpass', dest:d});
      FX.carne(t + 0.08, {tono:k*1.2}, d);
      RZ({t:t + 0.25, a:0.1, d:0.12, v:0.5, f:350*k, f2:1400*k, fd:0.2, q:5, col:'rosa', dest:d});          /* y vuelve a la boca */
      return 0.6; },
    /* ---- la pelea */
    jefe_aparece(t, o, d){ const k = o.tono;
      hyoshigi(d, t, 0.6); hyoshigi(d, t + 0.14, 0.5);
      [0.3, 0.62, 0.86, 1.04, 1.18, 1.29, 1.38, 1.45, 1.51, 1.56].forEach((q, i) => taiko(d, t + q, 0.3 + i*0.06, {f:66 + i*3, larga:0.25, sala:0}));
      const g = G(0, d), lp = F('lowpass', 180, 1.2, g), a = oscF('sawtooth', 55*k, t, t + 3.2), b = oscF('sawtooth', 55.6*k, t, t + 3.2);    /* el zumbido que crece */
      a.connect(lp); b.connect(lp); lp.frequency.setValueAtTime(180, t); lp.frequency.exponentialRampToValueAtTime(1100, t + 1.6); lp.frequency.exponentialRampToValueAtTime(200, t + 3);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 1.6); g.gain.setTargetAtTime(0, t + 1.7, 0.5);
      const t1 = t + 1.65; taiko(d, t1, 1, {f:38, larga:1.4, sala:0}); gong(d, t1 + 0.02, 1, 58*k, {fx:1, sala:0}); trueno(t1, d, 0.6, 70);
      return 3.8; },
    etapa(t, o, d){ hyoshigi(d, t, 0.7); hyoshigi(d, t + 0.16, 0.6); taiko(d, t + 0.45, 0.8, {f:52, larga:0.6, sala:0}); taiko(d, t + 0.8, 1, {f:44, larga:0.9, sala:0}); return 2; },
    victoria(t, o, d){ const k = o.tono;
      taiko(d, t, 0.6, {f:60, larga:0.4, sala:0}); [62, 67, 69, 74, 76, 79].forEach((m, i) => kotoFx(d, t + i*0.055, m + semi(k), 1.2, 0.45, {b:0.75}));
      shaku(d, t + 0.38, 81 + semi(k), 1.2, 0.85, {fx:1, desde:-2, vib:24});
      taiko(d, t + 0.38, 0.9, {f:46, larga:0.9, sala:0}); rin(d, t + 0.4, 93 + semi(k), 0.4, {fx:1, largo:0.8, sala:0});
      kotoFx(d, t + 1.5, 74 + semi(k), 1, 0.4, {b:0.7}); kotoFx(d, t + 1.5, 86 + semi(k), 1, 0.35, {b:0.8}); return 2.8; },
    derrota(t, o, d){ const k = o.tono;
      [65, 64, 62, 58, 57].forEach((m, i) => kotoFx(d, t + i*0.22, m + semi(k), 0.4, 0.5, {b:0.35, apaga:i < 4 ? 1 : 0}));
      taiko(d, t + 0.9, 0.6, {f:40, larga:1.2, sala:0}); gong(d, t + 0.9, 0.45, 55*k, {fx:1, sala:0}); return 2.8; },
    /* ---- las cartas, la tienda y los menús */
    carta(t, o, d){ const k = o.tono*rv(0.95, 1.05);
      RZ({t, a:0.005, d:0.04, v:0.8, f:2600*k, q:1, dest:d}); RZ({t:t + 0.05, a:0.03, d:0.08, v:0.6, f:1800*k, f2:3600*k, q:1.2, col:'rosa', dest:d});
      RZ({t:t + 0.12, d:0.015, v:0.5, f:1400*k, q:3, dest:d}); TN({t:t + 0.12, f:mtof(86)*k, d:0.25, v:0.04, dest:d}); return 0.45; },
    elegir(t, o, d){ const k = o.tono; kotoFx(d, t, 79 + semi(k), 0.8, 0.5, {b:0.75}); kotoFx(d, t + 0.07, 86 + semi(k), 1, 0.5, {b:0.8});
      rin(d, t + 0.07, 91 + semi(k), 0.45, {fx:1, largo:0.7, sala:0}); taiko(d, t, 0.35, {f:80, larga:0.3, sala:0}); return 2; },
    moneda(t, o, d){ const k = o.tono; TN({t, f:1975*k, d:0.06, v:0.18, tipo:'triangle', dest:d}); TN({t:t + 0.055, f:2637*k, d:0.4, v:0.2, dest:d});
      TN({t:t + 0.055, f:2637*2.76*k, d:0.12, v:0.025, dest:d}); RZ({t, d:0.005, v:0.14, f:6000, tipo:'highpass', dest:d}); return 0.55; },
    compra(t, o, d){ FX.moneda(t, o, d); kotoFx(d, t + 0.08, 79, 0.6, 0.5, {b:0.75}); kotoFx(d, t + 0.16, 86, 0.8, 0.5, {b:0.75}); rin(d, t + 0.16, 98, 0.3, {fx:1, largo:0.5, sala:0}); return 1.6; },
    mejora(t, o, d){ const k = o.tono;
      RZ({t, a:0.05, d:0.25, v:0.5, f:3000*k, f2:7000*k, fd:0.3, q:6, dest:d}); RZ({t:t + 0.3, a:0.04, d:0.2, v:0.45, f:3400*k, f2:7600*k, fd:0.25, q:6, dest:d});   /* la piedra de afilar */
      [74, 79, 81, 86, 91].forEach((m, i) => kotoFx(d, t + 0.55 + i*0.06, m + semi(k), 1, 0.42, {b:0.8}));
      acero(t + 0.85, d, 1480*k, 0.07, 1.4); return 2.4; },
    desbloqueo(t, o, d){ const k = o.tono; gong(d, t, 0.6, 82*k, {fx:1, sala:0});
      [74, 76, 79, 81, 83, 86, 88, 91].forEach((m, i) => kotoFx(d, t + 0.1 + i*0.045, m + semi(k), 1, 0.42, {b:0.8}));
      [86, 90, 93].forEach((m, i) => rin(d, t + 0.55 + i*0.04, m + semi(k), 0.4, {fx:1, sala:0})); return 3; },
    menu_mover(t, o, d){ RZ({t, d:0.012, v:1.1, f:2400*o.tono, q:5, dest:d}); TN({t, f:1400*o.tono, d:0.03, v:0.12, tipo:'triangle', dest:d}); return 0.1; },
    menu_ok(t, o, d){ mokugyo(d, t, 0.6, 820*o.tono); kotoFx(d, t, 81 + semi(o.tono), 0.3, 0.3, {b:0.7}); return 0.6; },
    menu_atras(t, o, d){ RZ({t, d:0.012, v:1.6, f:2600*o.tono, q:5, dest:d}); RZ({t:t + 0.06, d:0.014, v:1.4, f:1800*o.tono, q:5, dest:d});
      RZ({t, a:0.03, d:0.09, v:0.6, f:1500, f2:600, q:1, col:'rosa', dest:d}); return 0.3; },
    pincel(t, o, d){ const k = o.tono*rv(0.93, 1.07);
      RZ({t, d:0.012, v:0.35, f:900*k, q:2, col:'rosa', dest:d});                                            /* el pincel que apoya */
      RZ({t:t + 0.01, a:0.08, d:0.3, v:0.55, f:1700*k, f2:700*k, fd:0.38, q:0.8, col:'rosa', dest:d});      /* el trazo */
      const g = G(0, d), bp = F('bandpass', 4200*k, 1.5, g), s = fuente('blanco', t, t + 0.55), l = oscF('sawtooth', rv(45, 70), t, t + 0.55);   /* las cerdas sobre el papel */
      s.connect(bp); l.connect(G(0.06, g.gain)); adsr(g.gain, t, 0.06, 0.2, 0.6, t + 0.32, 0.08, 0.08);
      return 0.55; },
    titulo(t, o, d){ FX.pincel(t, o, d); FX.pincel(t + 0.18, {tono:o.tono*0.85}, d);
      taiko(d, t + 0.4, 0.5, {f:70, larga:0.25, sala:0}); taiko(d, t + 0.55, 1, {f:44, larga:1.4, sala:0}); gong(d, t + 0.57, 0.8, 73.4, {fx:1, sala:0});
      RZ({t:t + 0.55, a:0.01, d:1, v:0.25, f:120, tipo:'lowpass', col:'pardo', dest:d}); return 5; }
  };
  /* voces vivas por nombre y en total: la más vieja se apaga para hacer lugar */
  const VIVAS = [];
  function apagar(v, now){ try { const p = v.g.gain; p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(0, now + 0.03); } catch(e){}
    v.fin = Math.min(v.fin, now + 0.06); v.robada = 1; }
  function salida(nom, meta, x, vol){
    const now = ya(), mias = VIVAS.filter(v => v.nom === nom && !v.robada);
    if(mias.length >= (meta.max || 3)) apagar(mias[0], now);
    const todas = VIVAS.filter(v => !v.robada); if(todas.length >= 28) apagar(todas[0], now);
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
    try {
      if(!tiene(FX, nom)){ if(typeof nom === 'string' && FALTAN.size < 50) FALTAN.add(nom); return; }
      if(!listo || C.state !== 'running') return;
      const o = opc && typeof opc === 'object' ? opc : {};
      const f = FX[nom], meta = FXM[nom] || {}, t = ya() + 0.006;
      const x = lim(+(o.pan !== undefined ? o.pan : o.x) || 0, -1, 1);
      const tono = lim(+o.tono || 1, 0.25, 4)*(meta.ui ? 1 : lerp(1, 0.78, kLento)*rv(0.97, 1.03));   /* en cámara lenta todo suena más grave */
      const vol = (o.vol === undefined ? 1 : lim(+o.vol || 0, 0, 1.5))*(meta.vol || 0.5);
      if(vol <= 0) return;
      const v = salida(nom, meta, x, vol), ext = bufExt(nom);
      let dur;
      if(ext){ const s = C.createBufferSource(); s.buffer = ext; s.playbackRate.value = tono; s.connect(v.g); s.start(t); dur = ext.duration/tono; }
      else dur = f(t, {x, tono, n:o.n}, v.g) || 1;
      v.fin = t + dur + (meta.rev ? 2.4 : 0.3);
    } catch(e){ err(e); }
  }

  /* ------------------------------------------------------------ ambiente */
  let AMB = null;
  const VIEJOS = [];
  function ambiente(lugar){
    try {
      const pedido = tiene(ARMA, lugar) ? lugar : null;
      ambPed = pedido; if(!listo) return;
      if(pedido === ambAct) return; ambAct = pedido;
      const now = ya();
      if(AMB){ const A = AMB, p = A.g.gain; p.cancelScheduledValues(now); p.setValueAtTime(Math.max(p.value, 0.0001), now); p.linearRampToValueAtTime(0, now + 2);
        A.fin = now + 2.2; VIEJOS.push(A); AMB = null; }
      if(pedido){ AMB = {lugar:pedido, g:G(0, N.amb), nodos:[], loops:[], ev:[], fin:Infinity};
        AMB.g.gain.setValueAtTime(0.0001, now); AMB.g.gain.linearRampToValueAtTime(1, now + 2.5); ARMA[pedido](AMB); }
    } catch(e){ err(e); }
  }
  /* un bucle de ruido filtrado que no para; queda anotado para el lento y para apagarlo */
  function bucle(A, col, tipo, f, q, v, x, rate){
    const s = C.createBufferSource(); s.buffer = RU[col]; s.loop = true; s.playbackRate.value = (rate || 1)*lerp(1, 0.6, kLento); s.start(ya(), Math.random()*2.5);
    const fl = F(tipo, f, q), g = G(v); s.connect(fl); fl.connect(g); g.connect(panear(A.g, x || 0));
    A.nodos.push(s); A.loops.push({s, r:rate || 1}); return {s, fl, g};
  }
  function lfo(A, f, prof, param, tipo){ const o = C.createOscillator(); o.type = tipo || 'sine'; o.frequency.value = f; o.connect(G(prof, param)); o.start(); A.nodos.push(o); return o; }
  const suceso = (A, a, b, fn, primero) => A.ev.push({a, b, fn, prox:ya() + (primero !== undefined ? primero : rv(a, b))});
  const conSala = (dest, v) => { const g = G(1, dest); g.connect(G(v, N.revFin)); return g; };
  function gota(dest, t, v){ TN({t, f:rv(600, 1100), f2:rv(1600, 2600), fd:0.025, d:0.06, v, dest}); RZ({t:t + 0.01, d:0.02, v:v*0.5, f:5000, tipo:'highpass', dest}); }
  function crujido(dest, t, v){ const d = rv(0.8, 2), g = G(0, dest), bp = F('bandpass', rv(500, 900), 12, g), bp2 = F('bandpass', rv(1300, 1900), 10, G(0.5, g)), s = oscF('sawtooth', rv(14, 26), t, t + d + 0.1);
    s.frequency.linearRampToValueAtTime(rv(28, 50), t + d); bp.frequency.linearRampToValueAtTime(bp.frequency.value*rv(0.7, 1.3), t + d); s.connect(bp); s.connect(bp2);
    adsr(g.gain, t, d*0.3, 0.5, 0.9, t + d*0.8, d*0.2, v); }
  /* las cañas que se golpean entre sí: kon, kon */
  function canas(A, t){ const p = conSala(panear(A.g, rv(-0.9, 0.9)), 0.4), n = 2 + Math.floor(Math.random()*3), f0 = rv(380, 720);
    for(let i = 0, tt = t; i < n; i++, tt += rv(0.09, 0.3)){ TN({t:tt, f:f0*rv(0.95, 1.08), f2:f0*0.92, d:0.14, v:rv(0.012, 0.03), tipo:'triangle', dest:p}); RZ({t:tt, d:0.03, v:rv(0.01, 0.02), f:f0*2.1, q:9, dest:p}); } }
  function pajaro(A, t){ const p = panear(F('lowpass', 5000, 0.7, A.g), rv(-0.9, 0.9)), n = 2 + Math.floor(Math.random()*4);
    for(let i = 0, tt = t; i < n; i++, tt += rv(0.09, 0.16)){ const f = rv(3200, 4600); TN({t:tt, f, f2:f*rv(0.75, 1.25), fd:0.05, d:0.06, v:rv(0.004, 0.01), dest:p}); } }
  /* el uguisu: una nota larga y el «ho-ke-kyo» */
  function uguisu(A, t){ const p = conSala(panear(A.g, rv(-0.7, 0.7)), 0.5), g = G(0, p), s = oscF('sine', 1350, t, t + 0.8);
    s.frequency.linearRampToValueAtTime(1420, t + 0.55); s.connect(g); adsr(g.gain, t, 0.08, 0.3, 0.9, t + 0.55, 0.06, 0.012);
    TN({t:t + 0.75, f:2300, f2:2000, d:0.1, v:0.01, dest:p}); TN({t:t + 0.92, f:2600, f2:2150, d:0.12, v:0.011, dest:p}); TN({t:t + 1.1, f:2200, f2:1900, d:0.24, v:0.01, dest:p}); }
  function cuervo(A, t){ const p = conSala(panear(F('lowpass', 2600, 0.7, A.g), rv(-0.8, 0.8)), 0.5), n = 2 + Math.floor(Math.random()*2);
    for(let i = 0, tt = t; i < n; i++, tt += rv(0.32, 0.45)) vox(tt, p, {vocal:'a', f:rv(480, 560), f2:rv(560, 620), pico:0.2, f3:rv(380, 440), d:0.22, v:0.03, sucio:3, q:5, fk:1.15}); }
  function grito(A, t){ const p = conSala(panear(F('lowpass', 900, 0.7, A.g), rv(-0.9, 0.9)), 0.8);
    vox(t, p, {vocal:Math.random() < 0.5 ? 'a' : 'o', f:rv(170, 260), f2:rv(260, 340), pico:0.35, f3:rv(140, 200), d:rv(0.4, 0.75), v:0.012, sucio:1.6, q:5, vib:rv(5, 7)}); }
  /* la campana grande del templo, lejos: parciales graves que baten y tardan en irse */
  function bonsho(A, t){ const p = conSala(F('lowpass', 1400, 0.7, A.g), 0.6), f = 68;
    for(const [r, a, d] of [[1, 1, 9], [2, 0.5, 6], [2.74, 0.4, 5], [3.4, 0.25, 4], [4.2, 0.15, 3], [5.4, 0.1, 2]]){
      const g = G(0, p), fin = t + d*1.5; for(const b of [-0.35, 0.35]){ const q = oscF('sine', f*r + b, t, fin); q.connect(g); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03*a, t + 0.006); g.gain.setTargetAtTime(0, t + 0.006, d/4.5); }
    TN({t, f:70, f2:55, d:0.3, v:0.04, dest:p}); }
  /* un grillo: tandas de pulsitos agudos, cada especie con su altura */
  function grillo(A, t){ const p = panear(F('lowpass', 7000, 0.7, A.g), rv(-0.9, 0.9)), f = rv(3900, 4800), n = 2 + Math.floor(Math.random()*4), v = rv(0.004, 0.009);
    for(let i = 0, tt = t; i < n; i++, tt += rv(0.14, 0.24)) for(let j = 0; j < 5; j++) TN({t:tt + j*0.021, a:0.003, f:f*rv(0.99, 1.01), d:0.012, v, dest:p}); }
  /* el búho: «ho, hooo», grave y redondo */
  function buho(A, t){ const p = conSala(panear(F('lowpass', 1200, 0.7, A.g), rv(-0.8, 0.8)), 0.6);
    for(const [q, d, f] of [[0, 0.22, 390], [0.42, 0.55, 370]]){ const g = G(0, p), s = oscF('sine', f, t + q, t + q + d + 0.2); s.frequency.linearRampToValueAtTime(f*0.95, t + q + d);
      s.connect(g); adsr(g.gain, t + q, 0.05, 0.2, 0.8, t + q + d, 0.1, 0.02); } }
  /* los susurros: sílabas de aire por formantes, sin voz, de acá y de allá */
  function susurro(A, t){ const p = conSala(panear(F('lowpass', 3800, 0.7, A.g), rv(-0.9, 0.9)), 0.7), n = 3 + Math.floor(Math.random()*4), vs = Object.keys(FORM);
    for(let i = 0, tt = t; i < n; i++, tt += rv(0.1, 0.24)){ const vo = FORM[vs[Math.floor(Math.random()*vs.length)]], d = rv(0.08, 0.2);
      for(const [fr, a] of vo) RZ({t:tt, a:d*0.3, d:d*0.7, v:0.022*a, f:fr*rv(0.9, 1.15), q:6, dest:p});
      if(Math.random() < 0.4) RZ({t:tt, a:0.01, d:0.06, v:0.012, f:5200, q:2, dest:p}); } }      /* una «s» */
  /* algo que gime lejos, adentro de la niebla */
  function gemido(A, t){ const p = conSala(panear(F('lowpass', 700, 0.7, A.g), rv(-0.9, 0.9)), 0.9);
    vox(t, p, {vocal:Math.random() < 0.5 ? 'o' : 'u', f:rv(90, 140), f2:rv(130, 180), pico:0.4, f3:rv(70, 100), d:rv(1.4, 2.4), v:0.016, sucio:1.4, q:6, vib:rv(3, 5)}); }
  const ARMA = {
    /* la aldea: el fuego que crepita y el viento que lo aviva */
    aldea(A){
      const fu = bucle(A, 'pardo', 'lowpass', 260, 0.7, 0.16, 0); lfo(A, 0.3, 0.05, fu.g.gain); lfo(A, 0.13, 60, fu.fl.frequency);   /* el fuego que ruge bajito */
      const ll = bucle(A, 'rosa', 'bandpass', 900, 0.7, 0.022, 0.25); lfo(A, 0.8, 0.01, ll.g.gain);                                  /* las llamas */
      const vi = bucle(A, 'rosa', 'bandpass', 480, 0.6, 0.05, -0.2); lfo(A, 0.06, 0.03, vi.g.gain); lfo(A, 0.04, 150, vi.fl.frequency);   /* el viento */
      suceso(A, 0.06, 0.3, t => RZ({t, d:rv(0.003, 0.012), v:rv(0.012, 0.06), f:rv(1400, 5200), q:rv(1, 3), dest:panear(A.g, rv(-0.8, 0.8))}));   /* crepita */
      suceso(A, 2, 5, t => { const p = panear(A.g, rv(-0.7, 0.7)); for(let i = 0; i < 6; i++) RZ({t:t + i*rv(0.01, 0.05), d:0.006, v:rv(0.03, 0.08), f:rv(1800, 4000), q:2, dest:p}); });
      suceso(A, 6, 14, t => crujido(F('lowpass', 1100, 0.7, panear(A.g, rv(-0.8, 0.8))), t, 0.022), 3);                         /* la madera que se queja */
      suceso(A, 25, 50, t => { const p = conSala(A.g, 0.6); TN({t, f:70, f2:40, d:0.5, v:0.1, lp:300, dest:p}); RZ({t, a:0.02, d:0.6, v:0.09, f:300, tipo:'lowpass', col:'pardo', dest:p}); }, rv(12, 20));   /* una viga que cae lejos */
      suceso(A, 15, 30, t => cuervo(A, t), rv(6, 12));
      suceso(A, 20, 40, t => grito(A, t), rv(10, 18));
    },
    /* el bambú: el viento entre las cañas, las hojas, el kon-kon, los pájaros y el uguisu */
    bambu(A){
      const vi = bucle(A, 'rosa', 'bandpass', 420, 0.6, 0.07, 0); lfo(A, 0.07, 0.035, vi.g.gain); lfo(A, 0.045, 140, vi.fl.frequency);
      const ho = bucle(A, 'blanco', 'highpass', 3800, 0.5, 0.014, 0.3, 0.9); lfo(A, 0.13, 0.01, ho.g.gain);
      bucle(A, 'pardo', 'lowpass', 180, 0.7, 0.08, 0);
      suceso(A, 2.5, 7, t => canas(A, t), 1.5);
      suceso(A, 6, 14, t => crujido(F('lowpass', 1400, 0.7, panear(A.g, rv(-0.8, 0.8))), t, 0.02), 4);
      suceso(A, 3, 9, t => pajaro(A, t), 2);
      suceso(A, 18, 36, t => uguisu(A, t), rv(8, 14));
    },
    /* el templo de la montaña: viento helado que silba, la nieve que pega y la campana grande, lejos */
    templo(A){
      const vi = bucle(A, 'blanco', 'bandpass', 950, 3.5, 0.035, -0.2); lfo(A, 0.05, 380, vi.fl.frequency); lfo(A, 0.09, 0.02, vi.g.gain);
      const vb = bucle(A, 'rosa', 'bandpass', 520, 0.8, 0.07, 0.3); lfo(A, 0.06, 0.04, vb.g.gain);
      bucle(A, 'pardo', 'lowpass', 160, 0.7, 0.16, 0);
      suceso(A, 6, 14, t => RZ({t, a:rv(1, 2), d:rv(1.5, 3), v:rv(0.03, 0.06), f:rv(600, 900), f2:rv(1300, 1900), fd:2.5, q:1.2, col:'rosa', dest:panear(A.g, rv(-0.8, 0.8))}), 3);   /* ráfaga */
      suceso(A, 0.12, 0.45, t => RZ({t, d:0.004, v:rv(0.003, 0.009), f:rv(5000, 9000), q:4, dest:panear(A.g, rv(-0.9, 0.9))}));             /* la nieve que pega */
      suceso(A, 22, 42, t => bonsho(A, t), 4);
      suceso(A, 25, 45, t => cuervo(A, t), rv(10, 18));
    },
    /* el campo bajo la luna: pasto seco, grillos, viento y el búho */
    luna(A){
      const pa = bucle(A, 'blanco', 'highpass', 4800, 0.5, 0.012, 0.2); lfo(A, 0.11, 0.008, pa.g.gain);                         /* el pasto seco que se mece */
      const vi = bucle(A, 'rosa', 'bandpass', 350, 0.7, 0.05, -0.2); lfo(A, 0.05, 0.03, vi.g.gain); lfo(A, 0.03, 90, vi.fl.frequency);
      bucle(A, 'pardo', 'lowpass', 150, 0.7, 0.06, 0);
      { const o = C.createOscillator(); o.frequency.value = 4450; const g1 = G(0.5), g2 = G(0.5), sal = G(0.0035, panear(A.g, 0.45));   /* un colchón de grillos lejos */
        o.connect(g1); g1.connect(g2); g2.connect(sal); o.start(); A.nodos.push(o); lfo(A, 24, 0.5, g1.gain, 'square'); lfo(A, 0.55, 0.5, g2.gain); }
      suceso(A, 0.5, 2, t => grillo(A, t), 0.3);
      suceso(A, 4, 10, t => RZ({t, a:rv(0.3, 0.7), d:rv(0.5, 1.2), v:rv(0.01, 0.025), f:rv(3000, 5500), q:0.8, dest:panear(A.g, rv(-0.9, 0.9))}), 2);   /* algo que pasa por el pasto */
      suceso(A, 18, 40, t => buho(A, t), rv(6, 12));
    },
    /* la niebla de los yokai: un fondo grave que no se va, susurros, agua que gotea y algo que gime */
    yokai(A){
      bucle(A, 'pardo', 'lowpass', 140, 0.7, 0.18, 0);
      const ni = bucle(A, 'rosa', 'bandpass', 300, 1, 0.045, 0); lfo(A, 0.035, 120, ni.fl.frequency); lfo(A, 0.07, 0.025, ni.g.gain);   /* la niebla que se mueve */
      const al = bucle(A, 'blanco', 'bandpass', 2500, 0.5, 0.008, -0.3); lfo(A, 0.09, 0.005, al.g.gain);
      const ag = bucle(A, 'rosa', 'lowpass', 500, 0.7, 0.03, 0.4); lfo(A, 0.23, 0.02, ag.g.gain);                               /* el agua que lame la orilla */
      suceso(A, 4, 10, t => susurro(A, t), 2.5);
      suceso(A, 0.8, 3, t => gota(conSala(panear(A.g, rv(-0.7, 0.7)), 0.6), t, rv(0.008, 0.02)));
      suceso(A, 20, 45, t => gemido(A, t), rv(8, 15));
      suceso(A, 30, 60, t => { const p = conSala(A.g, 0.8); gong(p, t, 0.12, rv(38, 46), {fx:1, sala:0}); }, rv(15, 25));    /* un gong que nadie tocó */
    }
  };
  function pasoAmb(){
    const now = ya();
    if(AMB) for(const e of AMB.ev) if(now >= e.prox){ e.prox = now + rv(e.a, e.b); try { e.fn(now + 0.05); } catch(x){ err(x); } }
    for(let i = VIEJOS.length - 1; i >= 0; i--){ const A = VIEJOS[i];
      if(now > A.fin){ for(const n of A.nodos) try { n.stop(); n.disconnect(); } catch(e){} try { A.g.disconnect(); } catch(e){} VIEJOS.splice(i, 1); } }
  }

  /* ------------------------------------------------------------ lento, intensidad, volumen y el pulso propio */
  function aplicarLento(){
    if(Math.abs(kLento - kAplic) < 0.004) return; kAplic = kLento;
    const now = ya(), fc = 18000*Math.pow(850/18000, kLento), dl = detL();
    N.musF.frequency.setTargetAtTime(fc, now, 0.03); N.ambF.frequency.setTargetAtTime(Math.min(fc*1.3, 20000), now, 0.03);
    N.fxF.frequency.setTargetAtTime(20000*Math.pow(0.3, kLento), now, 0.03);
    N.revMin.gain.setTargetAtTime(lerp(0.1, 0.35, kLento), now, 0.06);
    for(const r of OSC_M) if(r.fin > now) try { r.p.setTargetAtTime(r.d0 + dl, now, 0.03); } catch(e){}
    if(AMB) for(const l of AMB.loops) try { l.s.playbackRate.setTargetAtTime(l.r*lerp(1, 0.6, kLento), now, 0.04); } catch(e){}
  }
  /* se sigue al objetivo por tiempo real */
  function avanzarLento(){
    const tn = performance.now(), dt = tLento ? lim((tn - tLento)/1000, 0, 0.1) : 0.016; tLento = tn;
    kLento += (kLentoObj - kLento)*(1 - Math.exp(-dt*18)); if(Math.abs(kLento - kLentoObj) < 0.003) kLento = kLentoObj;
    aplicarLento();
  }
  function lento(k){ try { kLentoObj = lim(+k || 0, 0, 1); if(!listo) return; avanzarLento(); } catch(e){ err(e); } }
  function intensidad(k){ try { intenObj = lim(+k || 0, 0, 1); } catch(e){ err(e); } }
  function volumen(m, e){
    try {
      if(m !== undefined && isFinite(+m)) AJ.musica = lim(+m, 0, 1);
      if(e !== undefined && isFinite(+e)) AJ.efectos = lim(+e, 0, 1);
      if(!listo) return;
      const now = ya(), mm = Math.pow(AJ.musica, 1.6), ee = Math.pow(AJ.efectos, 1.4);
      N.musV.gain.setTargetAtTime(mm*0.55, now, 0.02); N.fxV.gain.setTargetAtTime(ee, now, 0.02); N.ambV.gain.setTargetAtTime(ee*0.8, now, 0.02);
    } catch(x){ err(x); }
  }
  /* el pulso: lo llama un setInterval propio, así la música no depende del cuadro del juego */
  function tick(){
    if(!listo) return;
    try {
      const tn = performance.now(), d = lim(tAnt ? (tn - tAnt)/1000 : 0.025, 0, 0.25); tAnt = tn;
      if(kLento !== kLentoObj) avanzarLento();
      if(C.state !== 'running') return;
      inten += (intenObj - inten)*(1 - Math.exp(-d*1.4));
      const now = ya();
      for(const r of REPS) if(r.vivo && r.T.capas){ const kb = lerp(0.75, 1, Math.max(inten, r.T.kMin || 0));          /* con poca intensidad la base va más atrás */
        if(Math.abs(kb - r.kb) > 0.01){ r.kb = kb; capaA(r.cap.base, kb, now); }
        for(const n of CAPAS){ const v = objCapa(r.T, n);
          if(Math.abs(v - r.cv[n]) > 0.01 || (v !== r.cv[n] && (v === 0 || v === 1))){ r.cv[n] = v; capaA(r.cap[n], v, now); } } }
      bombear(); pasoAmb();
      for(let i = REPS.length - 1; i >= 0; i--){ const r = REPS[i];
        if(!r.vivo && now > r.muere){ for(const g of r.oscs) if(g.fin > now){ g.fin = now; try { g.o.stop(); } catch(e){} } try { r.bus.disconnect(); r.eco.disconnect(); r.sala.disconnect(); } catch(e){} REPS.splice(i, 1); }
        else if(r.oscs.length > 300) r.oscs = r.oscs.filter(g => g.fin > now); }
      for(let i = VIVAS.length - 1; i >= 0; i--){ const v = VIVAS[i]; if(now > v.fin){ try { v.g.disconnect(); v.p.disconnect(); if(v.e) v.e.disconnect(); } catch(e){} VIVAS.splice(i, 1); } }
      if(OSC_M.length > 60) for(let i = OSC_M.length - 1; i >= 0; i--) if(OSC_M[i].fin < now) OSC_M.splice(i, 1);
    } catch(e){ err(e); }
  }
  function arrancar(){
    try {
      if(!C){ if(!armar()) return; const tp = temaPed, ap = ambPed; temaPed = null; ambPed = null; if(tp) musica(tp); if(ap) ambiente(ap); }
      if(C.state === 'suspended' || C.state === 'interrupted') C.resume().catch(() => {});
    } catch(e){ err(e); }
  }

  return {arrancar, fx:(n, o) => fx(n, o), musica, ambiente, lento, volumen, intensidad,
    /* para el banco */
    _err:ERR, _faltan:FALTAN, _lista:() => Object.keys(FX), _temas:() => Object.keys(TEMAS), _ambientes:() => Object.keys(ARMA),
    _ctx:() => C, _salida:() => N && N.sal, _N:() => N, _vivas:() => VIVAS.length, _reps:() => REPS.map(r => r.nom + (r.vivo ? '' : '·')),
    _mel:() => Object.keys(TEMAS).filter(k => TEMAS[k].M).map(k => [k, TEMAS[k].M.pasos, TEMAS[k].M2 ? TEMAS[k].M2.pasos : 0, TEMAS[k].A.length*16]),
    _estado:() => ({kLento, inten, tema:temaAct, amb:ambAct, osc:OSC_M.length, vivas:VIVAS.length, reps:REPS.length, viejos:VIEJOS.length, ks:KS.size})};
})();
