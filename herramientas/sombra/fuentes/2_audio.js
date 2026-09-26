/* ================================================================ sonido
   SOMBRA: lo-fi japonés, todo de Web Audio, sin archivos.
   Tres buses (música, efectos, ambiente) → pasaaltos → compresor → recorte suave (nunca pasa de 0,95).
   Los instrumentos: koto de cuerda pulsada (Karplus-Strong horneado una vez por nota), shakuhachi
   (soplido afinado con vibrato que entra tarde), taikos, shime, kotsuzumi, hyoshigi, rin, gong,
   bajo redondo, colchón de viento y una batería lo-fi con swing pasada por un reductor de bits.
   La música es un secuenciador de semicorcheas que programa con anticipación contra currentTime:
   escalas in, hirajōshi y yo, frases de 8 compases que se contestan (16 en total) y capas por
   intensidad. La cámara lenta baja un tono todo lo que suena, cierra un pasabajos y frena el tempo.
   Ninguna llamada de acá puede tirarle una excepción al juego: todo va envuelto. */
const SON = (() => {
  let C = null, N = null, RU = null, ONDA = null, listo = false;
  let temaPed = null, temaAct, ambPed = null, ambAct, muertePed = false;        /* lo pedido antes de haber contexto */
  let kLento = 0, kLentoObj = 0, kAplic = -1, tLento = 0, inten = 0, intenObj = 0, kAhora = 0, tPaso = 0, tPasoAnt = 0;
  let kMuerte = 0, kCinta = 0, cintaAplic = -1;
  const ERR = [], FALTAN = new Set();
  const err = e => { if(ERR.length < 30) ERR.push(String(e && e.stack || e)); };
  const tiene = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  const suv = t => t*t*(3 - 2*t);
  const mtof = m => 440*Math.pow(2, (m - 69)/12);
  const ya = () => C.currentTime;

  /* ------------------------------------------------------------ armado del máster */
  function ruidos(){
    const sr = C.sampleRate, n = Math.floor(sr*3), mk = k => C.createBuffer(1, k || n, sr);
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
    /* el crepitar del vinilo: chasquidos sueltos de largo y fuerza distintos, y cada tanto un pop */
    const nc = Math.floor(sr*4), cr = mk(nc), e = cr.getChannelData(0);
    for(let i = 0; i < nc; i++) if(Math.random() < 0.0004){
      const pop = Math.random() < 0.06, amp = (pop ? 1 : Math.pow(Math.random(), 2.2)*0.7)*(Math.random() < 0.5 ? -1 : 1), L = pop ? 40 : 2 + Math.floor(Math.random()*14);
      for(let j = 0; j < L && i + j < nc; j++) e[i + j] += amp*Math.exp(-j/(L*0.3))*(j % 2 ? -0.55 : 1);
    }
    RU = {blanco:bl, rosa:ro, pardo:pa, crepita:cr};
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
  /* el reductor de bits de la batería: una escalera de 24 escalones */
  let CRUSH = null;
  function curvaCrush(){ if(CRUSH) return CRUSH; const n = 2048, c = new Float32Array(n);
    for(let i = 0; i < n; i++){ const x = i/(n - 1)*2 - 1; c[i] = Math.round(x*12)/12; } return CRUSH = c; }
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
    /* música: bus → cinta (retardo que se mueve) → lento → muerte → oscurecido de la cinta → volumen */
    N.musV = G(0.55, N.mezcla); N.cLp = F('lowpass', 18000, 0.5, N.musV);
    N.muG = G(1, N.cLp); N.muF = F('lowpass', 18000, 0.6, N.muG);
    N.musF = F('lowpass', 18000, 0.6, N.muF);
    N.wow = C.createDelay(0.1); N.wow.delayTime.value = 0.018; N.wow.connect(N.musF);
    N.mus = G(1, N.wow);
    /* la sala: la reverberación larga de la música, con envíos propios de cada instrumento */
    N.revM = C.createConvolver(); N.revM.buffer = ir(3.4, 1.4, 0.5, 0.03); N.revM.connect(N.wow);
    N.revMin = G(0.1, N.revM); N.mus.connect(N.revMin); N.sala = G(1, N.revM);
    /* wow (0,55 Hz), flutter (7 Hz) y una deriva lenta: la profundidad la pone cinta() */
    N.wowG = [];
    for(const [f, tipo] of [[0.55, 'sine'], [7, 'sine'], [0.15, 'triangle']]){ const o = C.createOscillator(); o.type = tipo; o.frequency.value = f;
      const g = G(0, N.wow.delayTime); o.connect(g); o.start(); N.wowG.push(g); }
    N.siseo = G(0, N.muF); { const s = C.createBufferSource(); s.buffer = RU.rosa; s.loop = true; s.connect(F('highpass', 3000, 0.5, N.siseo)); s.start(); }
    N.crep = G(0, N.muF); { const s = C.createBufferSource(); s.buffer = RU.crepita; s.loop = true; s.connect(F('highpass', 700, 0.6, F('lowpass', 7000, 0.6, N.crep))); s.start(); }
    /* eco de corchea con puntillo, oscureciéndose en cada vuelta */
    N.eco = G(1); N.ecoD = C.createDelay(2); N.ecoD.delayTime.value = 0.49;
    N.ecoLp = F('lowpass', 2600, 0.6); N.ecoFb = G(0.34); N.ecoW = G(0.45, N.mus);
    N.eco.connect(N.ecoD); N.ecoD.connect(N.ecoLp); N.ecoLp.connect(N.ecoFb); N.ecoFb.connect(N.ecoD); N.ecoLp.connect(N.ecoW);
    /* efectos, con su cola; en cámara lenta se oscurecen un poco */
    N.fxV = G(1, N.mezcla); N.fxF = F('lowpass', 20000, 0.5, N.fxV); N.fx = G(1, N.fxF);
    N.revF = C.createConvolver(); N.revF.buffer = ir(2.2, 2, 0.6, 0.01); N.revF.connect(N.fxF); N.revFin = G(1, N.revF);
    /* ambiente */
    N.ambV = G(0.8, N.mezcla); N.ambF = F('lowpass', 18000, 0.5, N.ambV); N.amb = G(1, N.ambF);
    /* iOS: un buffer mudo destraba la salida */
    try { const s = C.createBufferSource(); s.buffer = C.createBuffer(1, 64, C.sampleRate); s.connect(C.destination); s.start(0); } catch(e){}
    listo = true;
    volumen(); aplicarCinta(); kAplic = -1; aplicarLento();
    setInterval(() => { if(listo && performance.now() - tPaso > 140) paso(0.05); }, 50);   /* por si el juego deja de llamar paso() */
    document.addEventListener('visibilitychange', () => { try {
      if(document.hidden){ if(C.state === 'running') C.suspend(); } else if(C.state !== 'closed') C.resume().catch(() => {}); } catch(e){} });
    return true;
  }

  /* ------------------------------------------------------------ piezas de síntesis */
  /* lo que suena en la música queda anotado para que el lento y la muerte lo bajen de tono */
  const OSC_M = [];
  let repAct = null;                                  /* el tema que está programando: lo suyo se corta al soltarlo */
  const detL = () => -kLento*200 - kMuerte*80;
  function reg(nodo, p, d0, fin){ if(!p) return; try { p.value = d0 + detL(); } catch(e){}
    const rg = {o:nodo, p, d0, fin}; OSC_M.push(rg); if(repAct) repAct.oscs.push(rg); }
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
  /* shakuhachi: el tubo, el soplido afinado adentro y el aire que se escapa; entra de abajo y el vibrato llega tarde */
  function shaku(dest, t, m, dur, v, o){ o = o || {};
    const f = mtof(m), fin = t + Math.max(dur, 0.1), stop = fin + 0.45, g = C.createGain(), lp = F('lowpass', o.f || 3200, 0.7);
    const f0 = f*Math.pow(2, (o.desde ? o.desde : -0.8)/12), sube = o.desde ? 0.13 : 0.07;
    const a = C.createOscillator(); a.setPeriodicWave(ONDA.fue);
    a.frequency.setValueAtTime(f0, t); a.frequency.exponentialRampToValueAtTime(f, t + sube);
    if(dur > 1.1) a.frequency.setTargetAtTime(f*0.988, fin - 0.1, 0.1);                                  /* el meri del final: cae un pelo */
    reg(a, a.detune, 0, stop); a.start(t); a.stop(stop); a.connect(lp);
    const ns = fuente('rosa', t, stop), bp = F('bandpass', f0, 14); bp.frequency.exponentialRampToValueAtTime(f, t + sube);
    ns.connect(bp); bp.connect(G(3.2, lp)); reg(ns, bp.detune, 0, stop);
    const aire = fuente('blanco', t, stop), ab = F('bandpass', 2600, 0.7), ga = G(0); aire.connect(ab); ab.connect(ga); ga.connect(g);
    ga.gain.setValueAtTime(0, t); ga.gain.linearRampToValueAtTime(v*0.05, t + 0.025); ga.gain.setTargetAtTime(v*0.01, t + 0.04, 0.08); ga.gain.setTargetAtTime(0, fin, 0.07);
    lp.connect(g); g.connect(dest);
    if(dur > 0.45){ const l = oscF('sine', rv(4.6, 5.3), t, stop), lg = G(0); lg.gain.setValueAtTime(0, t + 0.28); lg.gain.linearRampToValueAtTime(o.vib || 20, t + Math.min(0.95, dur));
      l.connect(lg); lg.connect(a.detune); lg.connect(bp.detune); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v*0.12, t + 0.06); g.gain.linearRampToValueAtTime(v*0.14, t + Math.max(0.07, Math.min(dur*0.6, 0.8)));
    g.gain.setTargetAtTime(0, fin, 0.09);
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
  function bombo(dest, t, v, o){ o = o || {}; const f0 = o.f || 52, larga = o.larga || 0.32, g = C.createGain(), s = oscF('sine', f0*3, t, t + larga*1.6 + 0.05);
    s.frequency.exponentialRampToValueAtTime(f0*1.3, t + 0.025); s.frequency.exponentialRampToValueAtTime(f0, t + 0.09);
    env(g.gain, t, 0.002, v*0.9, larga); s.connect(g); g.connect(dest);
    RZ({t, d:0.012, v:v*0.2, f:1800, tipo:'lowpass', q:0.7, dest}); }
  function caja(dest, t, v, o){ o = o || {}; const out = G(1, dest);
    RZ({t, d:o.d || 0.15, v:v*0.5, f:1700, q:0.7, col:'rosa', dest:out}); RZ({t, d:0.06, v:v*0.2, f:5200, tipo:'highpass', q:0.5, dest:out});
    TN({t, f:210, f2:170, fd:0.04, d:0.08, v:v*0.4, tipo:'triangle', dest:out}); envio(out, dest, 0, o.sala === undefined ? 0.16 : o.sala); }
  function rim(dest, t, v){ RZ({t, d:0.02, v:v*0.5, f:1900, q:5, dest}); TN({t, f:1050, d:0.025, v:v*0.2, tipo:'triangle', dest}); }
  function hat(dest, t, v, abierto){ RZ({t, d:abierto ? 0.22 : 0.03, v:v*0.17, f:6800, tipo:'highpass', q:0.6, dest}); RZ({t, d:abierto ? 0.14 : 0.02, v:v*0.06, f:9800, q:1.8, dest}); }
  function shaker(dest, t, v){ RZ({t, a:0.012, d:0.05, v:v*0.13, f:5600, q:1.1, dest}); }
  function soplo(dest, t, dur, v, f1, f2){ const out = G(1, dest); RZ({t, a:dur*0.5, d:dur*0.6, v, f:f1, f2, fd:dur, q:1.2, col:'rosa', dest:out}); envio(out, dest, 0, 0.5); }

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
     ton y esc: la tónica y la escala (in [0,1,5,7,8], hirajōshi [0,2,3,7,8], yo [0,2,5,7,9]). */
  const TEMAS = {
    /* re yo, 78: koto que arpegia despacio, shakuhachi que contesta, el rin cada dos compases y cinta gastada */
    menu:{bpm:78, vol:1.25, intro:1, cinta:0.22, swing:0.12, ton:2, esc:[0, 2, 5, 7, 9],
      prog:'Gmaj9 Em9 Bm7 Asus Gmaj9 Em9 Asus Dadd9',
      mel:'A4.8 B4.4 D5.4 E5.12 D5.4 B4.6 A4.2 G4.8 A4.16 D5.8 E5.4 G5.4 A5.10 G5.2 E5.4 D5.6 E5.2 B4.8 A4.16',
      mel2:'-.4 G5.4 A5.8 B5.8 A5.4 G5.4 E5.12 G5.4 D5.16 -.4 B4.4 D5.4 E5.4 G5.6 E5.2 D5.8 B4.6 D5.2 A4.8 D5.16',
      toca(x){ const {s, t, ac, sp} = x, B = x.r.cap.base;
        if(s === 0){ padV(B, t, voces(ac, 62), sp*16, 0.8, {a:1.6, rel:2, f:1300, aire:0.5}); bajo(B, t, raiz(ac, 2), sp*15, 0.42, {f:650}); }
        if(s === 0 && x.cb % 2 === 0){ const vs = voces(ac, 86); rin(B, t + 0.01, vs[vs.length - 1], 0.4); }
        if(s % 2 === 0 && !(x.intro && s > 6)){ const vs = voces(ac, 67), P = [0, 1, 2, 3, 4, 3, 2, 1], i = P[(s >> 1) % 8] % vs.length;
          if(s === 0 || x.r.rnd() > 0.15) koto(B, t + (x.r.rnd() - 0.5)*0.012, vs[i] + (x.v % 2 && s >= 8 ? 12 : 0), sp*3, lerp(0.3, 0.44, x.r.rnd()) + (s % 8 === 0 ? 0.08 : 0), {b:0.42, eco:0.16}); }
        if(x.intro) return;
        if(x.v >= 1){ const L = lofi(x, 'base'); if(s === 0 || s === 10) bombo(L, t, 0.32, {larga:0.26}); if(s % 4 === 2) shaker(B, t, 0.14);
          if(s === 12 && x.cb % 2) rim(L, t, 0.16); }
        const q = x.v % 4;
        if(q === 1 || q === 3) tocarMel(x, q === 1 ? this.M2 : this.M, (tt, m, d, k, orn) => shaku(B, tt, m, d*0.96, 0.8*k, {desde:orn}));
        else tocarMel(x, this.M, (tt, m, d, k) => koto(B, tt, m + (q === 2 ? 12 : 0), d, 0.5*k, {b:0.6, eco:0.3}));
      }},
    /* la hirajōshi, 92: lo-fi con swing, koto arpegiado en corcheas, bajo que camina y el shakuhachi que se turna con el koto */
    bambu:{bpm:92, vol:1, intro:1, kMin:0.3, swing:0.2, ton:9, esc:[0, 2, 3, 7, 8], capas:{perc:0.1, lead:0.2, extra:0.45, taiko:0.7},
      prog:'Am9 Fmaj7 Dm9 Esus Am9 Fmaj7 Bm7b5 E7b9',
      mel:'E5.3 F5.3 E5.2 C5.4 B4.4 A4.6 B4.2 C5.8 F5.4 E5.4 C5.3 B4.3 A4.2 B4.12 -.4 E5.3 F5.3 A5.2 B5.4 A5.4 F5.6 E5.2 C5.8 B4.3 C5.3 E5.2 F5.4 B4.4 E5.12 -.4',
      mel2:'A5.2 B5.2 C6.4 B5.2 A5.2 E5.4 F5.2 E5.2 C5.4 A4.8 F5.2 A5.2 C6.4 A5.2 F5.2 E5.4 B5.6 A5.2 E5.8 C6.3 B5.3 A5.2 E5.4 C5.4 F5.4 A5.4 C6.4 E6.4 F6.3 E6.3 C6.2 B5.4 A5.4 B5.4 F5.4 E5.8',
      BJ:{0:[0, 5], 7:[7, 2], 10:[0, 3], 14:[12, 2]},
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, L = lofi(x, 'base'), r0 = raiz(ac, 2), b = this.BJ[s];
        if(s === 0) padV(D.base, t, voces(ac, 60), sp*16, 0.7, {a:0.9, rel:1.4, f:1500});
        if(b) bajo(D.base, t + x.sw(s), r0 + b[0], sp*b[1]*0.92, s ? 0.48 : 0.6);
        if(s % 2 === 0){ const vs = voces(ac, 69), P = [0, 2, 1, 3, 2, 4, 3, 1], i = P[s >> 1] % vs.length;
          koto(D.base, t, vs[i] + (x.v % 2 && s >= 8 ? 12 : 0), sp*2.5, (s % 4 === 0 ? 0.4 : 0.3) + 0.06*x.r.rnd(), {b:0.5, eco:0.12}); }
        if(x.intro) return;
        if(s === 0 || s === 10 || (s === 7 && x.cb % 2)) bombo(L, t + x.sw(s), 0.72);
        if(s === 4 || s === 12) caja(L, t, 0.6);
        if(x.on('perc')){ if(s !== 14) hat(D.perc, t + x.sw(s), s % 2 ? 0.14 + 0.08*x.r.rnd() : 0.28); else hat(D.perc, t, 0.28, true);
          if(s % 4 === 2) shaker(D.perc, t, 0.2); if((s === 7 || s === 15) && x.r.rnd() < 0.4) rim(D.perc, t + x.sw(s), 0.14); }
        if(x.on('lead')){ if(x.v % 2) tocarMel(x, this.M2, (tt, m, d, k) => koto(D.lead, tt, m, d, 0.55*k, {b:0.7, eco:0.3}));
          else tocarMel(x, this.M, (tt, m, d, k, orn) => shaku(D.lead, tt, m, d*0.95, 0.85*k, {desde:orn})); }
        if(x.on('extra')){ if(s === 0 && x.cb % 2 === 0){ const vs = voces(ac, 88); rin(D.extra, t, vs[vs.length - 1], 0.3); }
          if((s === 6 || s === 14) && x.cb % 2 === 1) tsuzumi(D.extra, t, 0.4, s === 6 ? 1 : 1.2);
          if(s % 2 === 1 && x.v % 2 === 0 && x.r.rnd() < 0.45){ const vs = voces(ac, 81); koto(D.extra, t + x.sw(s), vs[(s >> 1) % vs.length], sp*1.5, 0.2, {b:0.8, eco:0.3}); }
          if(x.cb === 7 && s >= 12) taiko(D.extra, t, 0.35 + (s - 12)*0.08, {f:95, larga:0.35}); }
        if(x.on('taiko')){ if(s === 0 || s === 8) taiko(D.taiko, t, 0.6, {f:62}); if(s % 4 === 2) shime(D.taiko, t, 0.3); }
      }},
    /* mi in, 88: frío y abierto. Batería a medio tiempo, campanitas que caen, viento en el colchón y mucha sala */
    montana:{bpm:88, vol:1.05, intro:1, kMin:0.3, swing:0.14, ton:4, esc:[0, 1, 5, 7, 8], capas:{perc:0.1, lead:0.2, extra:0.45, taiko:0.75},
      prog:'Em9 Cmaj7 Am9 Bsus Em9 Cmaj7 Fmaj7 Bsus',
      mel:'B4.8 C5.4 E5.4 F5.12 E5.4 C5.8 B4.4 A4.4 B4.16 E5.8 F5.4 A5.4 B5.12 A5.4 F5.8 E5.4 C5.4 B4.16',
      mel2:'-.8 B5.4 C6.4 E6.8 C6.8 A5.8 B5.4 C6.4 B5.16 -.8 E6.4 F6.4 E6.8 C6.8 A5.8 F5.8 B5.16',
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, L = lofi(x, 'base'), r0 = raiz(ac, 2);
        if(s === 0){ padV(D.base, t, voces(ac, 59), sp*16, 0.85, {a:1.8, rel:2.4, f:1000, aire:1.1, sala:0.5}); bajo(D.base, t, r0, sp*11, 0.5, {f:600}); }
        if(s === 11) bajo(D.base, t, r0 + 7, sp*4.5, 0.3, {f:600});
        if(x.cb % 2 === 0 && (s === 0 || s === 3 || s === 6)){ const vs = voces(ac, 84), i = [0, 2, 4][s/3] % vs.length; rin(D.base, t, vs[i] + (s === 6 ? 12 : 0), 0.24, {largo:1.3, sala:0.7}); }
        if((s === 2 || s === 9 || s === 13) && x.r.rnd() < 0.55){ const vs = voces(ac, 76); koto(D.base, t + x.sw(s), vs[Math.floor(x.r.rnd()*vs.length)] + 12, sp*3, 0.24, {b:0.35, eco:0.35, sala:0.5}); }
        if(x.intro) return;
        if(s === 0 || (s === 11 && x.cb % 2)) bombo(L, t, 0.62, {larga:0.4});
        if(s === 8) caja(L, t, 0.5, {sala:0.5, d:0.2});
        if(x.on('perc')){ if(s % 2 === 0) hat(D.perc, t, s % 4 ? 0.16 : 0.22); if(s % 4 === 3 && x.r.rnd() < 0.5) shaker(D.perc, t + x.sw(s), 0.14); }
        if(x.on('lead')){ if(x.v % 2) tocarMel(x, this.M2, (tt, m, d, k) => koto(D.lead, tt, m, d, 0.46*k, {b:0.55, eco:0.35, sala:0.5}));
          else tocarMel(x, this.M, (tt, m, d, k, orn) => shaku(D.lead, tt, m, d*0.95, 0.85*k, {desde:orn, sala:0.7, eco:0.3})); }
        if(x.on('extra')){ if(s === 0 && x.cb % 4 === 0) soplo(D.extra, t, sp*14, 0.07, 700, 1700);
          if(s === 4 && x.cb % 2) tsuzumi(D.extra, t, 0.3, 0.9);
          if(s === 14 && x.r.rnd() < 0.4){ const vs = voces(ac, 91); rin(D.extra, t, vs[vs.length - 1], 0.16, {largo:0.8}); } }
        if(x.on('taiko')){ if(s === 0 || s === 8) taiko(D.taiko, t, 0.45, {f:55, larga:0.9, sala:0.6}); }
      }},
    /* do in, 112: el castillo en llamas. Taikos, shime en corcheas, bajo que empuja y el koto que no para */
    castillo:{bpm:112, vol:0.95, intro:1, kMin:0.3, swing:0, ton:0, esc:[0, 1, 5, 7, 8], capas:{perc:0.05, lead:0.15, extra:0.4, taiko:0.65},
      prog:'Csus Cm Dbmaj7 Cm Fm Abmaj7 Db G7sus',
      mel:'G5.4 Ab5.4 G5.2 F5.2 C5.4 Db5.6 C5.2 G4.8 Ab4.4 C5.4 Db5.4 F5.4 G5.12 -.4 C6.4 Db6.4 C6.2 Ab5.2 G5.4 F5.6 G5.2 Ab5.8 G5.3 F5.3 Db5.2 C5.4 Db5.4 C5.12 -.4',
      mel2:'C6.2 G5.2 Ab5.2 G5.2 C6.2 Db6.2 C6.2 G5.2 F5.2 G5.2 Ab5.2 C6.2 Db6.4 C6.4 F6.2 Db6.2 C6.2 Ab5.2 F5.2 Ab5.2 C6.2 Db6.2 C6.4 G5.4 Ab5.4 G5.4 C6.2 C6.2 Db6.2 C6.2 Ab5.2 G5.2 F5.2 G5.2 Ab5.4 C6.4 F6.4 Ab5.4 G5.2 Ab5.2 G5.2 F5.2 Db5.2 F5.2 G5.2 Db6.2 C6.8 G5.8',
      RIFF:[0, 0, 12, 0, 7, 0, 12, 7],
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, L = lofi(x, 'base'), r0 = raiz(ac, 2);
        if(s === 0 || s === 6 || s === 8) taiko(D.base, t, s === 0 ? 0.85 : 0.58, {f:58, larga:0.6});
        if(s % 2 === 0) shime(D.base, t, s % 4 === 0 ? 0.34 : 0.2);
        if(s % 2 === 0) bajo(D.base, t, r0 + this.RIFF[s >> 1], sp*1.6, s % 4 === 0 ? 0.6 : 0.44, {f:1300});
        if(s === 0) padV(D.base, t, voces(ac, 57), sp*16, 0.62, {a:0.4, rel:0.8, f:900});
        if(s === 0 || s === 10) rasgueo(D.base, t, voces(ac, 64), 0.5, 0.016, {b:0.65});
        if(x.intro) return;
        if(s === 0 || s === 8 || s === 11) bombo(L, t, 0.72, {f:50});
        if(s === 4 || s === 12) caja(L, t, 0.68, {d:0.18});
        if(x.on('perc')){ hat(D.perc, t, s % 4 === 2 ? 0.3 : 0.16); if(s % 2) shime(D.perc, t, 0.1 + 0.05*x.r.rnd());
          if(s === 6 || s === 14) tsuzumi(D.perc, t, 0.42, s === 6 ? 1.1 : 0.95); }
        if(x.on('lead')){ if(x.v % 2) tocarMel(x, this.M2, (tt, m, d, k) => koto(D.lead, tt, m, d, 0.55*k, {b:0.75, eco:0.2, apaga:1}));
          else tocarMel(x, this.M, (tt, m, d, k, orn) => shaku(D.lead, tt, m, d*0.94, 0.9*k, {desde:orn, f:3600})); }
        if(x.on('extra')){ if((x.cb === 3 || x.cb === 7) && s >= 12) taiko(D.extra, t, 0.4 + (s - 12)*0.1, {f:85, larga:0.3});
          if(s === 0 && x.cb % 4 === 0) hyoshigi(D.extra, t, 0.5);
          if(s === 0 && x.cb === 0 && x.v >= 1) gong(D.extra, t, 0.55, 82);
          if(x.v % 2 && s % 2 === 0){ const vs = voces(ac, 79); koto(D.extra, t, vs[(s >> 1) % vs.length], sp*1.2, 0.2, {b:0.8, apaga:1}); } }
        if(x.on('taiko')){ if(s === 2 || s === 10 || s === 14) taiko(D.taiko, t, 0.55, {f:72, larga:0.4}); if(s === 0) taiko(D.taiko, t, 0.9, {f:44, larga:1});
          if(x.cb % 2 === 1 && s >= 8) taiko(D.taiko, t, 0.3 + (s - 8)*0.04, {f:95, larga:0.25}); }
      }},
    /* sol hirajōshi, 104: el infinito. Arranca con koto y colchón; con la intensidad entran la batería, la melodía, el shime y al final los taikos */
    infinito:{bpm:104, vol:1, intro:1, swing:0.16, ton:7, esc:[0, 2, 3, 7, 8], capas:{perc:0.15, lead:0.35, extra:0.6, taiko:0.82},
      prog:'Gm9 Ebmaj7 Cm9 D7sus Gm9 Ebmaj7 Bbmaj7 D7b9',
      mel:'D5.4 Eb5.4 D5.2 Bb4.2 A4.4 G4.6 A4.2 Bb4.8 Eb5.4 D5.4 Bb4.4 G4.4 A4.12 -.4 D5.3 Eb5.3 G5.2 A5.4 G5.4 Eb5.6 D5.2 Bb4.8 A4.3 Bb4.3 D5.2 Eb5.4 D5.4 D5.12 -.4',
      mel2:'G5.2 A5.2 Bb5.4 A5.2 G5.2 D5.4 Eb5.2 D5.2 Bb4.4 G4.8 Eb5.2 G5.2 Bb5.4 G5.2 Eb5.2 D5.4 A5.6 G5.2 D5.8 Bb5.3 A5.3 G5.2 D5.4 Bb4.4 Eb5.4 G5.4 Bb5.4 D6.4 Eb6.3 D6.3 Bb5.2 A5.4 G5.4 A5.4 Eb5.4 D5.8',
      toca(x){ const {s, t, ac, sp} = x, D = x.r.cap, r0 = raiz(ac, 2);
        if(s === 0) padV(D.base, t, voces(ac, 60), sp*16, 0.72, {a:0.8, rel:1.4, f:lerp(900, 1700, kAhora), aire:0.4});
        if(s === 0 || s === 10) bajo(D.base, t, r0 + (s ? 7 : 0), sp*(s ? 5 : 9), 0.46, {f:700});
        if(s % 2 === 0){ const vs = voces(ac, 67), P = [0, 1, 2, 3, 4, 3, 2, 1], i = P[s >> 1] % vs.length;
          if(s % 4 === 0 || x.r.rnd() < 0.75) koto(D.base, t, vs[i] + (s >= 8 && x.c % 2 ? 12 : 0), sp*2.5, 0.3 + 0.08*x.r.rnd(), {b:0.5, eco:0.15}); }
        if(s === 0 && x.cb % 4 === 0){ const vs = voces(ac, 86); rin(D.base, t, vs[vs.length - 1], 0.3); }
        if(x.intro) return;
        if(x.on('perc')){ const L = lofi(x, 'perc'); if(s === 0 || s === 10 || (s === 7 && x.cb % 2)) bombo(L, t + x.sw(s), 0.7); if(s === 4 || s === 12) caja(L, t, 0.58);
          if(s !== 14) hat(D.perc, t + x.sw(s), s % 2 ? 0.13 : 0.24); else hat(D.perc, t, 0.26, true); }
        if(x.on('lead')){ if(x.v % 2) tocarMel(x, this.M2, (tt, m, d, k) => koto(D.lead, tt, m, d, 0.55*k, {b:0.7, eco:0.28}));
          else tocarMel(x, this.M, (tt, m, d, k, orn) => shaku(D.lead, tt, m, d*0.95, 0.85*k, {desde:orn})); }
        if(x.on('extra')){ if(s % 2 === 1) bajo(D.extra, t, r0 + (s % 8 === 7 ? 12 : 0), sp*0.8, 0.3, {f:1400});
          if(s % 2 === 0) shime(D.extra, t, s % 4 ? 0.14 : 0.24); if(s === 6 || s === 14) tsuzumi(D.extra, t, 0.36, s === 6 ? 1 : 1.15); }
        if(x.on('taiko')){ if(s === 0 || s === 3 || s === 8 || s === 11) taiko(D.taiko, t, s % 8 === 0 ? 0.85 : 0.55, {f:s % 8 ? 70 : 50, larga:0.55});
          if(s % 2 === 1) shime(D.taiko, t, 0.12); if(s === 0 && x.cb % 4 === 0) hyoshigi(D.taiko, t, 0.45);
          if(x.cb === 7 && s >= 8) taiko(D.taiko, t, 0.3 + (s - 8)*0.05, {f:92, larga:0.25});
          if(s === 0 && x.cb === 0) gong(D.taiko, t, 0.4, 98); }
      }},
    /* do yo, 96: la tienda. Bajo que rebota, koto picado a contratiempo, mokugyo y una melodía que juega */
    tienda:{bpm:96, vol:1.05, intro:1, swing:0.22, ton:0, esc:[0, 2, 5, 7, 9],
      prog:'Cadd9 Am7 Dm7 G7sus Cadd9 Am7 Fmaj7 G6',
      mel:'G5.2 A5.2 C6.2 -.2 A5.2 G5.2 -.4 D5.2 F5.2 G5.4 -.8 A5.2 G5.2 F5.2 D5.2 C5.4 D5.4 G5.8 -.8 C6.2 D6.2 C6.2 A5.2 G5.4 A5.4 C6.2 -.2 A5.2 -.2 G5.8 F5.2 G5.2 A5.2 C6.2 D6.4 C6.4 G5.8 -.8',
      mel2:'-.8 C6.2 D6.2 F6.4 D6.4 C6.4 A5.8 -.8 F5.2 G5.2 A5.4 G5.4 D5.4 G5.8 -.8 A5.2 C6.2 D6.4 C6.4 A5.4 G5.8 -.8 A5.2 G5.2 F5.4 G5.16',
      BJ:{0:[0, 1.5], 3:[12, 1], 6:[7, 1.5], 8:[0, 1.5], 11:[12, 1], 14:[7, 1]},
      toca(x){ const {s, t, ac, sp} = x, B = x.r.cap.base, L = lofi(x, 'base'), r0 = raiz(ac, 2), b = this.BJ[s];
        if(b) bajo(B, t + x.sw(s), r0 + b[0], sp*b[1], 0.55, {f:1400});
        if(s === 0) padV(B, t, voces(ac, 62), sp*16, 0.45, {a:0.5, rel:0.8, f:1600});
        if(s % 4 === 2) rasgueo(B, t, voces(ac, 67).slice(0, 3), 0.42, 0.012, {b:0.7, apaga:1});
        if(x.intro) return;
        if(s === 0 || s === 8 || (s === 11 && x.cb % 2)) bombo(L, t + x.sw(s), 0.62, {larga:0.26});
        if(s === 4 || s === 12) rim(L, t, 0.4);
        if(s % 2 === 0 || x.r.rnd() < 0.3) shaker(B, t + x.sw(s), s % 4 === 2 ? 0.2 : 0.12);
        if(s === 15 && x.r.rnd() < 0.5) mokugyo(B, t + x.sw(s), 0.4, [820, 700, 980][x.cb % 3]);
        if(s === 0 && x.cb % 4 === 0){ const vs = voces(ac, 88); rin(B, t, vs[vs.length - 1], 0.28, {largo:0.7}); }
        if(x.v % 2 === 0) tocarMel(x, this.M, (tt, m, d, k) => koto(B, tt, m, d, 0.56*k, {b:0.8, eco:0.22, apaga:d < x.sp*3 ? 1 : 0}));
        else { tocarMel(x, this.M2, (tt, m, d, k, orn) => shaku(B, tt, m, d*0.85, 0.7*k, {desde:orn}));
          tocarMel(x, this.M, (tt, m, d, k) => { if(d <= x.sp*2) koto(B, tt, m - 12, d, 0.3*k, {b:0.6, apaga:1}); }); }
      }},
    /* re yo, 100: la fanfarria del torii y después un bucle suave */
    victoria:{bpm:100, vol:1.1, intro:2, cinta:0.1, swing:0, ton:2, esc:[0, 2, 5, 7, 9],
      prog:'Gmaj9 Dadd9 Gmaj9 Asus',
      toca(x){ const {s, t, ac, sp, c} = x, B = x.r.cap.base;
        if(c === 0){
          if(s === 0) [0, 0.3, 0.5, 0.62, 0.72, 0.8, 0.86, 0.91].forEach((q, i) => taiko(B, t + q*sp*8, 0.3 + i*0.06, {f:78, larga:0.3}));
          if(s === 8){ taiko(B, t, 1, {f:48, larga:1.1}); [62, 64, 67, 69, 71, 74, 76, 79, 81, 83, 86].forEach((m, i) => koto(B, t + i*0.035, m, 1.2, 0.42, {b:0.75})); }
          if(s === 12) shaku(B, t, 81, sp*4, 0.9, {desde:-2});
        }
        if(c === 1 && s === 0){ gong(B, t, 0.6, 73.4); [86, 90, 93].forEach((m, i) => rin(B, t + i*0.12, m, 0.4));
          shaku(B, t, 86, sp*14, 0.85, {desde:-3, vib:26}); padV(B, t, voces(TEMAS.victoria.A[1], 62), sp*16, 0.7, {a:0.6, rel:2}); bajo(B, t, 38, sp*14, 0.5); }
        if(c < 2) return;
        if(s === 0){ padV(B, t, voces(ac, 62), sp*16, 0.55, {a:1.5, rel:2, f:1100, aire:0.4}); bajo(B, t, raiz(ac, 2), sp*14, 0.34, {f:600}); }
        if(s % 2 === 0 && x.r.rnd() < 0.55){ const vs = voces(ac, 69); koto(B, t, vs[(s >> 1) % vs.length] + (s >= 8 ? 12 : 0), sp*3, 0.3, {b:0.5, eco:0.25}); }
        if(s === 0 && x.cb % 2 === 0){ const vs = voces(ac, 88); rin(B, t, vs[vs.length - 1], 0.26); }
      }}
  };
  for(const k in TEMAS){ const T = TEMAS[k]; if(T.prog) T.A = T.prog.split(' ').map(acorde); if(T.mel) T.M = melodia(T.mel); if(T.mel2) T.M2 = melodia(T.mel2); }

  /* ------------------------------------------------------------ secuenciador */
  const REPS = [], CAPAS = ['perc', 'lead', 'extra', 'taiko'], CAPA0 = {perc:0.2, lead:0.45, extra:0.7, taiko:0.85};
  const objCapa = (T, n) => T.capas ? suv(lim((Math.max(inten, T.kMin || 0) - (T.capas || CAPA0)[n])/0.2, 0, 1)) : 0;
  let semilla = 7;
  /* la batería lo-fi de cada capa: pasabajos de parlante y un poco del reductor de bits por arriba */
  function lofi(x, capa){ const r = x.r, key = 'lofi:' + capa; if(r.sc[key]) return r.sc[key];
    const cap = r.cap[capa], ent = G(1), cr = C.createWaveShaper(); cr.curve = curvaCrush();
    ent.connect(F('lowpass', 5200, 0.7, cap)); ent.connect(cr); cr.connect(F('highpass', 1400, 0.7, G(0.1, cap)));
    ent._eco = cap._eco; ent._sala = cap._sala; return r.sc[key] = ent; }
  function nuevoRep(nom, entra){
    const T = TEMAS[nom], now = ya(), vol = T.vol || 1;
    const r = {nom, T, paso:0, t:now + 0.08, vivo:true, muere:0, cap:{}, cv:{}, sc:{}, oscs:[], rnd:mulberry(semilla++*977 + 13)};
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
    const now = ya(), hasta = now + 0.12;
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
    salto:{max:3, vol:0.55, rev:0.05}, doble_salto:{max:3, vol:0.55, rev:0.12}, pegar:{max:3, vol:0.62, rev:0.06}, corte:{max:4, vol:0.62, rev:0.2},
    combo:{max:3, vol:0.55, rev:0.3, ui:1}, moneda:{max:5, vol:0.6, rev:0.15, ui:1}, monedas:{max:2, vol:0.5, rev:0.15, ui:1},
    laser_carga:{max:3, vol:0.42, rev:0.1}, disparo:{max:4, vol:0.6, rev:0.3}, shuriken:{max:4, vol:0.8, rev:0.08}, shuriken_clava:{max:4, vol:0.58, rev:0.12},
    samurai:{max:2, vol:0.6, rev:0.2}, muerte:{max:1, vol:0.6, rev:0.4}, pinchos:{max:2, vol:0.6, rev:0.12}, desmorona:{max:3, vol:0.58, rev:0.2},
    plataforma:{max:2, vol:0.5, rev:0.1}, cometa:{max:3, vol:0.5, rev:0.1}, tinta:{max:2, vol:0.62, rev:0.15}, meta:{max:1, vol:0.75, rev:0.5, ui:1},
    estrella:{max:3, vol:0.6, rev:0.35, ui:1}, cofre:{max:1, vol:0.62, rev:0.3, ui:1}, compra:{max:2, vol:0.58, rev:0.2, ui:1}, no_alcanza:{max:2, vol:0.55, rev:0.1, ui:1},
    boton:{max:3, vol:0.5, rev:0.06, ui:1}, clic:{max:4, vol:0.45, ui:1}, atras:{max:2, vol:0.45, ui:1}, desliza_menu:{max:2, vol:0.5, ui:1},
    titulo:{max:1, vol:0.7, rev:0.5, ui:1}, lento_entra:{max:2, vol:0.5, rev:0.2, ui:1}, lento_sale:{max:2, vol:0.45, rev:0.15, ui:1},
    vida:{max:1, vol:0.68, rev:0.35, ui:1}, record:{max:1, vol:0.65, rev:0.4, ui:1}
  };
  /* otros nombres que el juego pueda usar */
  const ALIAS = {doble:['doble_salto'], pared:['pegar'], matar:['corte'], mata:['corte'], tajo:['corte'], laser:['laser_carga'], tiro:['disparo'],
    clava:['shuriken_clava'], morir:['muerte'], pincho:['pinchos'], estrellas:['estrella'], gong:['meta'], torii:['meta'], nuevo_record:['record']};
  const YO = [0, 2, 5, 7, 9];
  const kotoFx = (d, t, m, dur, v, o) => koto(d, t, m, dur, v, Object.assign({fx:1}, o || {}));
  const semi = k => 12*Math.log2(k);
  const FX = {
    /* ---- el ninja */
    salto(t, o, d){ const k = o.tono*rv(0.94, 1.06); whoosh(t, 0.17, 420*k, 1500*k, 1.5, d);
      RZ({t:t + 0.015, a:0.03, d:0.1, v:0.45, f:280*k, tipo:'lowpass', col:'rosa', dest:d}); RZ({t, d:0.012, v:0.12, f:1200*k, q:2, dest:d}); return 0.35; },
    doble_salto(t, o, d){ const k = o.tono*rv(0.95, 1.05); whoosh(t, 0.15, 800*k, 2800*k, 1.3, d); whoosh(t + 0.06, 0.1, 1500*k, 3600*k, 0.55, d);
      for(const [f, q, v] of [[2637, 0.03, 0.08], [3520, 0.08, 0.06], [2637*2.76, 0.03, 0.015]]) TN({t:t + q, f:f*k, d:0.25, v, dest:d}); return 0.45; },
    pegar(t, o, d){ const k = o.tono*rv(0.92, 1.08); TN({t, f:170*k, f2:80*k, fd:0.05, d:0.09, v:0.8, dest:d}); RZ({t, d:0.035, v:0.6, f:900*k, tipo:'lowpass', q:0.8, col:'rosa', dest:d});
      RZ({t:t + 0.003, d:0.05, v:0.35, f:480*k, q:4, dest:d}); RZ({t, d:0.012, v:0.22, f:3000*k, q:1, dest:d}); return 0.25; },
    corte(t, o, d){ const k = o.tono*rv(0.95, 1.05), p = C.createStereoPanner(); p.pan.setValueAtTime(-0.5, t); p.pan.linearRampToValueAtTime(0.5, t + 0.12); p.connect(d);
      RZ({t, a:0.03, d:0.05, v:0.7, f:1400*k, f2:6500*k, fd:0.08, q:1.8, dest:p});
      [2960, 4180, 5790, 7950].forEach((f, i) => TN({t:t + 0.03, a:0.003, f:f*k*rv(0.98, 1.02), d:0.45 - i*0.08, v:0.07 - i*0.012, dest:p}));   /* el filo que canta */
      const t1 = t + 0.05; TN({t:t1, f:140*k, f2:55, fd:0.08, d:0.12, v:0.75, dest:d}); RZ({t:t1, d:0.06, v:0.6, f:1100*k, f2:350, q:1.5, col:'rosa', dest:d});
      RZ({t:t1, d:0.12, v:0.22, f:2400*k, f2:900*k, q:3, dest:d}); return 0.65; },
    muerte(t, o, d){ const k = o.tono;
      TN({t, f:130*k, f2:45, fd:0.1, d:0.25, v:0.85, dest:d}); RZ({t, d:0.12, v:0.65, f:700, tipo:'lowpass', col:'rosa', dest:d}); taiko(d, t, 0.55, {f:52, larga:0.8});
      FX.corte(t + 0.03, {tono:0.85*k}, d);
      const g = G(0, d), lp = F('lowpass', 1800, 0.7, g), a = oscF('triangle', 520*k, t + 0.12, t + 2), b = oscF('sine', 522*k, t + 0.12, t + 2), l = oscF('sine', 5, t + 0.12, t + 2), lg = G(0);
      lp.frequency.setValueAtTime(1800, t + 0.12); lp.frequency.exponentialRampToValueAtTime(260, t + 1.7);
      a.frequency.exponentialRampToValueAtTime(55*k, t + 1.7); b.frequency.exponentialRampToValueAtTime(52*k, t + 1.7);
      lg.gain.setValueAtTime(0, t + 0.12); lg.gain.linearRampToValueAtTime(60, t + 1.5); l.connect(lg); lg.connect(a.detune); lg.connect(b.detune);   /* se desafina al caer */
      a.connect(lp); b.connect(G(0.6, lp)); adsr(g.gain, t + 0.12, 0.05, 0.4, 0.8, t + 1.5, 0.3, 0.24); return 2.3; },
    pinchos(t, o, d){ const k = o.tono*rv(0.95, 1.05), g = G(0, d), bp = F('bandpass', 3200*k, 5, g);
      for(const r of [1, 1.41, 1.93]) oscF('square', 820*k*r, t, t + 0.2).connect(bp); env(g.gain, t, 0.001, 0.22, 0.12);
      TN({t, f:160*k, f2:60, fd:0.08, d:0.12, v:0.7, dest:d}); RZ({t, d:0.08, v:0.5, f:900, tipo:'lowpass', col:'rosa', dest:d});
      RZ({t:t + 0.02, d:0.15, v:0.2, f:1800*k, f2:700, q:3, col:'rosa', dest:d}); return 0.45; },
    vida(t, o, d){ const k = o.tono;
      for(let i = 0; i < 10; i++) TN({t:t + Math.random()*0.22, f:rv(2500, 6000)*k, d:rv(0.05, 0.2), v:rv(0.02, 0.05), dest:panear(d, rv(-0.7, 0.7))});   /* el amuleto que se parte */
      TN({t, f:110*k, f2:60, fd:0.1, d:0.2, v:0.55, dest:d}); RZ({t, d:0.03, v:0.3, f:4000, tipo:'highpass', dest:d});
      [93, 88, 86].forEach((m, i) => rin(d, t + 0.1 + i*0.15, m + semi(k), 0.6, {fx:1, largo:0.45}));
      RZ({t:t + 0.5, a:0.3, d:0.1, v:0.25, f:400*k, f2:2200*k, fd:0.35, q:1.4, col:'rosa', dest:d}); return 2.2; },
    /* ---- los enemigos */
    laser_carga(t, o, d){ const k = o.tono, g = G(0, d), lp = F('lowpass', 3000, 0.8, g), tr = G(0.6), a = oscF('sine', 300*k, t, t + 1.12), b = oscF('triangle', 301.5*k, t, t + 1.12);
      a.frequency.exponentialRampToValueAtTime(1400*k, t + 1); b.frequency.exponentialRampToValueAtTime(1403*k, t + 1);
      const l = oscF('sine', 6, t, t + 1.12); l.frequency.linearRampToValueAtTime(26, t + 1); l.connect(G(0.4, tr.gain));
      a.connect(tr); b.connect(G(0.5, tr)); tr.connect(lp);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.28, t + 0.92); g.gain.setTargetAtTime(0, t + 1, 0.02);
      RZ({t, a:0.9, d:0.1, v:0.04, f:2000, f2:5000, fd:1, q:2, dest:d}); return 1.2; },
    disparo(t, o, d){ const k = o.tono*rv(0.95, 1.05);
      RZ({t, d:0.012, v:0.85, f:3600*k, tipo:'highpass', q:0.7, dest:d}); RZ({t, d:0.08, v:0.8, f:1400*k, f2:480*k, q:0.9, dest:d});
      RZ({t, d:0.22, v:0.28, f:1000*k, f2:180, tipo:'lowpass', col:'rosa', dest:d}); TN({t, f:175*k, f2:46*k, fd:0.08, d:0.12, v:0.9, dest:d}); return 0.5; },
    shuriken(t, o, d){ const k = o.tono*rv(0.95, 1.05), x = o.x || 0, p = C.createStereoPanner(), g = G(0, p), am = G(0.5), bp = F('bandpass', 3000*k, 5);
      p.pan.setValueAtTime(lim(x - 0.6, -1, 1), t); p.pan.linearRampToValueAtTime(lim(x + 0.6, -1, 1), t + 0.5); p.connect(d);
      const s = fuente('blanco', t, t + 0.56), l = oscF('sine', 22*k, t, t + 0.56), w = oscF('sine', 2600*k, t, t + 0.56);
      l.connect(G(0.5, am.gain)); l.connect(G(500*k, bp.frequency)); w.frequency.setValueAtTime(2700*k, t + 0.2); w.frequency.linearRampToValueAtTime(2400*k, t + 0.5);   /* gira y pasa */
      s.connect(bp); bp.connect(am); w.connect(G(0.05, am)); am.connect(g); adsr(g.gain, t, 0.05, 0.3, 0.9, t + 0.42, 0.08, 0.5); return 0.6; },
    shuriken_clava(t, o, d){ const k = o.tono*rv(0.94, 1.06); TN({t, f:500*k, f2:170*k, fd:0.04, d:0.07, v:0.6, dest:d}); RZ({t, d:0.04, v:0.55, f:1300*k, q:2.5, col:'rosa', dest:d});
      RZ({t, d:0.01, v:0.3, f:4000*k, tipo:'highpass', dest:d});
      const g = G(0, d), s = oscF('triangle', 1250*k, t, t + 0.5), vb = oscF('sine', 28, t, t + 0.5); vb.connect(G(60*k, s.frequency)); s.connect(g); env(g.gain, t + 0.005, 0.002, 0.12, 0.35); return 0.55; },
    samurai(t, o, d){ const k = o.tono*rv(0.95, 1.05);
      RZ({t, a:0.02, d:0.05, v:0.12, f:1800, q:0.7, dest:d});                                                   /* la h */
      vox(t + 0.04, d, {vocal:'a', f:185*k, f2:240*k, pico:0.5, d:0.17, v:0.5, sucio:1.4, q:6, aire:0.05});
      vox(t + 0.18, d, {vocal:'i', f:235*k, f3:150*k, d:0.16, v:0.42, sucio:1.4, q:6});
      const t2 = t + 0.36; RZ({t:t2, a:0.05, d:0.25, v:0.3, f:2500*k, f2:6500*k, fd:0.3, q:7, dest:d});             /* el desenvaine */
      [3150, 4420, 6230].forEach((f, i) => TN({t:t2 + 0.28, a:0.003, f:f*k, d:0.7 - i*0.15, v:0.05, dest:d})); TN({t:t2 + 0.28, f:900*k, d:0.03, v:0.12, tipo:'triangle', dest:d}); return 1.3; },
    /* ---- el mundo */
    desmorona(t, o, d){ const k = o.tono*rv(0.92, 1.08); RZ({t, d:0.03, v:0.55, f:2500*k, tipo:'highpass', dest:d}); TN({t, f:180*k, f2:70, fd:0.1, d:0.15, v:0.5, dest:d});
      for(let i = 0; i < 16; i++){ const tt = t + 0.04 + Math.pow(Math.random(), 1.4)*0.85, vv = rv(0.15, 0.45)*(1 - (tt - t)/1.1);
        RZ({t:tt, d:rv(0.02, 0.07), v:vv, f:rv(350, 1600)*k, q:rv(1.5, 4), col:'rosa', dest:panear(d, rv(-0.4, 0.4))}); }
      RZ({t, a:0.05, d:0.7, v:0.35, f:220*k, tipo:'lowpass', col:'pardo', dest:d}); return 1.2; },
    plataforma(t, o, d){ const k = o.tono; for(let i = 0; i < 8; i++) RZ({t:t + i*0.035, d:0.012, v:0.3*(i % 2 ? 0.7 : 1), f:2800*k, q:6, dest:d});   /* el trinquete */
      const g = G(0, d), lp = F('lowpass', 320, 1.5, g), s = oscF('sawtooth', 55*k, t, t + 0.56); s.frequency.linearRampToValueAtTime(75*k, t + 0.45); s.connect(lp);
      adsr(g.gain, t, 0.05, 0.2, 0.8, t + 0.4, 0.1, 0.25);
      TN({t:t + 0.42, f:120*k, f2:70, d:0.1, v:0.5, dest:d}); RZ({t:t + 0.42, d:0.05, v:0.35, f:800, tipo:'lowpass', col:'rosa', dest:d}); return 0.7; },
    cometa(t, o, d){ const k = o.tono*rv(0.93, 1.07), x = o.x || 0, p = C.createStereoPanner(), g = G(0, p), am = G(0.4), bp = F('bandpass', 1700*k, 0.9);
      p.pan.setValueAtTime(lim(x - 0.3, -1, 1), t); p.pan.linearRampToValueAtTime(lim(x + 0.3, -1, 1), t + 0.6); p.connect(d);
      const s = fuente('rosa', t, t + 0.75), l = oscF('triangle', 16, t, t + 0.75); l.frequency.linearRampToValueAtTime(11, t + 0.6); l.connect(G(0.6, am.gain));
      s.connect(bp); bp.connect(am); am.connect(g); adsr(g.gain, t, 0.08, 0.3, 0.8, t + 0.5, 0.15, 1.4);
      RZ({t, a:0.15, d:0.3, v:0.4, f:500, f2:300, q:0.8, col:'rosa', dest:d}); return 0.8; },
    tinta(t, o, d){ const k = o.tono*rv(0.9, 1.1); RZ({t, a:0.2, d:0.6, v:0.35, f:140, tipo:'lowpass', col:'pardo', dest:d});
      for(let i = 0, tt = t; i < 7; i++, tt += rv(0.06, 0.13)){ const f = rv(90, 210)*k, g = G(0, panear(d, rv(-0.4, 0.4))), s = oscF('sine', f, tt, tt + 0.13);
        s.frequency.exponentialRampToValueAtTime(f*1.8, tt + 0.06); s.connect(g); env(g.gain, tt, 0.004, 0.3, 0.06);
        RZ({t:tt, d:0.03, v:0.08, f:f*3, q:3, col:'rosa', dest:d}); }
      return 1.3; },
    /* ---- lo que se gana */
    combo(t, o, d){ const n = lim(Math.round(+o.n || 2), 2, 10), g = n - 2, m = 74 + 12*Math.floor(g/5) + YO[g % 5];
      rin(d, t, m, 1, {fx:1, largo:0.7}); kotoFx(d, t, m - 12, 0.6, 0.5, {b:0.8});
      if(n >= 6) rin(d, t + 0.07, m + 7, 0.45, {fx:1, largo:0.5}); return 2.4; },
    moneda(t, o, d){ const k = o.tono; TN({t, f:1975*k, d:0.06, v:0.18, tipo:'triangle', dest:d}); TN({t:t + 0.055, f:2637*k, d:0.4, v:0.2, dest:d});
      TN({t:t + 0.055, f:2637*2.76*k, d:0.12, v:0.025, dest:d}); RZ({t, d:0.005, v:0.14, f:6000, tipo:'highpass', dest:d}); return 0.55; },
    monedas(t, o, d){ const n = lim(Math.round(+o.n || 5), 2, 12), k = o.tono; let tt = t;
      for(let i = 0; i < n; i++, tt += rv(0.035, 0.07)){ const p = panear(d, rv(-0.5, 0.5)), f = mtof(88 + YO[Math.floor(Math.random()*5)] + (Math.random() < 0.3 ? 12 : 0))*k;
        TN({t:tt, f:f*0.75, d:0.04, v:0.1, tipo:'triangle', dest:p}); TN({t:tt + 0.035, f, d:0.3, v:0.14, dest:p}); RZ({t:tt, d:0.004, v:0.09, f:6000, tipo:'highpass', dest:p}); }
      return tt - t + 0.5; },
    estrella(t, o, d){ const n = lim(Math.round(+o.n || 1), 1, 3), m = [79, 83, 86][n - 1];
      rin(d, t, m + 12, 0.8, {fx:1}); kotoFx(d, t, m, 1, 0.6, {b:0.8}); taiko(d, t, 0.25 + 0.12*n, {f:80, larga:0.3});
      for(let i = 0; i < 4 + n*2; i++) TN({t:t + 0.03 + i*0.035, f:mtof(m + 24 + YO[i % 5]), d:0.12, v:0.03, dest:panear(d, rv(-0.5, 0.5))}); return 2.3; },
    meta(t, o, d){ gong(d, t, 0.85, 110, {fx:1});
      [86, 88, 91, 93, 95, 98].forEach((m, i) => rin(d, t + 0.25 + i*0.09, m, 0.35, {fx:1, largo:0.6})); return 4.5; },
    record(t, o, d){ [74, 76, 79, 81, 83, 86, 88, 91].forEach((m, i) => kotoFx(d, t + i*0.06, m, 1, 0.5, {b:0.8}));
      const t1 = t + 0.5; [86, 91, 95].forEach((m, i) => rin(d, t1 + i*0.03, m, 0.55, {fx:1})); taiko(d, t1, 0.7, {f:60, larga:0.7});
      for(let i = 0; i < 10; i++) TN({t:t1 + 0.05 + i*0.04, f:mtof(98 + YO[i % 5]), d:0.1, v:0.025, dest:panear(d, rv(-0.6, 0.6))}); return 3.2; },
    cofre(t, o, d){ TN({t, f:900, d:0.03, v:0.2, tipo:'triangle', dest:d}); RZ({t, d:0.02, v:0.3, f:2000, q:6, dest:d});        /* el pestillo */
      const t1 = t + 0.06, g = G(0, d), bp = F('bandpass', 700, 10, g), s = oscF('sawtooth', 22, t1, t1 + 0.45); s.frequency.linearRampToValueAtTime(38, t1 + 0.35);   /* la tapa que cruje */
      bp.frequency.linearRampToValueAtTime(900, t1 + 0.35); s.connect(bp); adsr(g.gain, t1, 0.08, 0.2, 0.9, t1 + 0.3, 0.08, 0.35);
      const t2 = t + 0.42; [74, 79, 83, 86].forEach((m, i) => kotoFx(d, t2 + i*0.05, m, 1, 0.45, {b:0.75}));
      [91, 95, 98, 100, 103].forEach((m, i) => TN({t:t2 + 0.2 + i*0.06, f:mtof(m), d:0.3, v:0.035, dest:panear(d, rv(-0.5, 0.5))})); return 2.4; },
    compra(t, o, d){ FX.moneda(t, o, d); kotoFx(d, t + 0.08, 79, 0.6, 0.5, {b:0.75}); kotoFx(d, t + 0.16, 86, 0.8, 0.5, {b:0.75}); rin(d, t + 0.16, 98, 0.3, {fx:1, largo:0.5}); return 1.6; },
    no_alcanza(t, o, d){ kotoFx(d, t, 57, 0.15, 0.6, {apaga:1, b:0.3}); kotoFx(d, t + 0.13, 56, 0.25, 0.6, {apaga:1, b:0.3});
      TN({t:t + 0.13, f:140, f2:90, d:0.08, v:0.35, dest:d}); return 0.6; },
    /* ---- los menús */
    boton(t, o, d){ mokugyo(d, t, 0.6, 820*o.tono); kotoFx(d, t, 81 + semi(o.tono), 0.3, 0.3, {b:0.7}); return 0.6; },
    clic(t, o, d){ RZ({t, d:0.01, v:1.4, f:3200*o.tono, q:5, dest:d}); TN({t, f:1900*o.tono, d:0.025, v:0.16, tipo:'triangle', dest:d}); return 0.1; },
    atras(t, o, d){ RZ({t, d:0.012, v:1.6, f:2600, q:5, dest:d}); RZ({t:t + 0.06, d:0.014, v:1.4, f:1800, q:5, dest:d});
      RZ({t, a:0.03, d:0.09, v:0.6, f:1500, f2:600, q:1, col:'rosa', dest:d}); return 0.3; },
    desliza_menu(t, o, d){ const k = o.tono;                                                            /* el fusuma que se corre */
      RZ({t, a:0.08, d:0.2, v:0.9, f:900*k, f2:1500*k, fd:0.25, q:0.9, col:'rosa', dest:d}); RZ({t, a:0.05, d:0.2, v:0.4, f:200, tipo:'lowpass', col:'pardo', dest:d});
      RZ({t:t + 0.26, d:0.02, v:0.25, f:700, q:4, dest:d}); return 0.45; },
    titulo(t, o, d){ taiko(d, t, 0.5, {f:70, larga:0.25}); taiko(d, t + 0.18, 1, {f:46, larga:1.4}); gong(d, t + 0.2, 0.8, 98, {fx:1});
      RZ({t:t + 0.18, a:0.01, d:1, v:0.25, f:120, tipo:'lowpass', col:'pardo', dest:d}); return 5; },
    lento_entra(t, o, d){ RZ({t, a:0.06, d:0.3, v:0.7, f:2600, f2:320, fd:0.4, q:2.2, col:'rosa', dest:d}); TN({t, a:0.03, f:520, f2:120, fd:0.4, d:0.35, v:0.12, dest:d}); return 0.6; },
    lento_sale(t, o, d){ RZ({t, a:0.12, d:0.08, v:0.6, f:350, f2:2600, fd:0.2, q:2, col:'rosa', dest:d}); TN({t, a:0.1, f:140, f2:520, fd:0.22, d:0.08, v:0.1, dest:d}); return 0.4; }
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
    if(!listo) return;
    try {
      let o = opc && typeof opc === 'object' ? Object.assign({}, opc) : {};
      if(tiene(ALIAS, nom)){ const a = ALIAS[nom]; nom = a[0]; if(a[1]) o = Object.assign(o, a[1]); }
      if(!tiene(FX, nom)){ if(typeof nom === 'string' && FALTAN.size < 50) FALTAN.add(nom); return; }
      if(C.state !== 'running') return;
      const f = FX[nom], meta = FXM[nom] || {}, t = ya() + 0.006;
      const x = lim(+(o.x !== undefined ? o.x : o.pan) || 0, -1, 1);
      const tono = lim(+o.tono || 1, 0.25, 4)*(meta.ui ? 1 : lerp(1, 0.78, kLento)*rv(0.97, 1.03));   /* en cámara lenta todo suena más grave */
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
  /* el shishi-odoshi: el agua que llena la caña y el golpe contra la piedra */
  function shishi(A, t){ const p = conSala(panear(A.g, 0.45), 0.6); RZ({t, a:1.2, d:0.2, v:0.02, f:800, f2:1500, fd:1.3, q:3, dest:p});
    const t1 = t + 1.4; for(const [q, k] of [[0, 1], [0.16, 0.4]]){ TN({t:t1 + q, f:540, f2:480, d:0.14, v:0.05*k, tipo:'triangle', dest:p}); TN({t:t1 + q, f:1260, d:0.06, v:0.02*k, dest:p}); RZ({t:t1 + q, d:0.03, v:0.05*k, f:900, q:8, dest:p}); } }
  const ARMA = {
    bambu(A){
      const vi = bucle(A, 'rosa', 'bandpass', 420, 0.6, 0.07, 0); lfo(A, 0.07, 0.035, vi.g.gain); lfo(A, 0.045, 140, vi.fl.frequency);   /* el viento entre las cañas */
      const ho = bucle(A, 'blanco', 'highpass', 3800, 0.5, 0.014, 0.3, 0.9); lfo(A, 0.13, 0.01, ho.g.gain);                            /* las hojas */
      bucle(A, 'pardo', 'lowpass', 180, 0.7, 0.08, 0);
      suceso(A, 2.5, 7, t => canas(A, t), 1.5);
      suceso(A, 6, 14, t => crujido(F('lowpass', 1400, 0.7, panear(A.g, rv(-0.8, 0.8))), t, 0.02), 4);
      suceso(A, 3, 9, t => pajaro(A, t), 2);
      suceso(A, 18, 36, t => uguisu(A, t), rv(8, 14));
    },
    montana(A){
      const vi = bucle(A, 'blanco', 'bandpass', 950, 3.5, 0.035, -0.2); lfo(A, 0.05, 380, vi.fl.frequency); lfo(A, 0.09, 0.02, vi.g.gain);   /* el silbido del viento helado */
      const vb = bucle(A, 'rosa', 'bandpass', 520, 0.8, 0.07, 0.3); lfo(A, 0.06, 0.04, vb.g.gain);
      bucle(A, 'pardo', 'lowpass', 160, 0.7, 0.16, 0);
      suceso(A, 6, 14, t => RZ({t, a:rv(1, 2), d:rv(1.5, 3), v:rv(0.03, 0.06), f:rv(600, 900), f2:rv(1300, 1900), fd:2.5, q:1.2, col:'rosa', dest:panear(A.g, rv(-0.8, 0.8))}), 3);   /* ráfaga */
      suceso(A, 0.12, 0.45, t => RZ({t, d:0.004, v:rv(0.003, 0.009), f:rv(5000, 9000), q:4, dest:panear(A.g, rv(-0.9, 0.9))}));             /* la nieve que pega */
      suceso(A, 15, 35, t => cuervo(A, t), rv(6, 12));
    },
    castillo(A){
      const fu = bucle(A, 'pardo', 'lowpass', 240, 0.7, 0.22, 0); lfo(A, 0.3, 0.07, fu.g.gain); lfo(A, 0.13, 60, fu.fl.frequency);    /* el fuego que ruge */
      const ll = bucle(A, 'rosa', 'bandpass', 1100, 0.7, 0.03, 0.2); lfo(A, 0.7, 0.012, ll.g.gain);
      suceso(A, 0.04, 0.22, t => RZ({t, d:rv(0.003, 0.012), v:rv(0.015, 0.07), f:rv(1400, 5200), q:rv(1, 3), dest:panear(A.g, rv(-0.8, 0.8))}));   /* crepita */
      suceso(A, 1.5, 4, t => { const p = panear(A.g, rv(-0.7, 0.7)); for(let i = 0; i < 6; i++) RZ({t:t + i*rv(0.01, 0.05), d:0.006, v:rv(0.03, 0.09), f:rv(1800, 4000), q:2, dest:p}); });
      suceso(A, 5, 12, t => crujido(F('lowpass', 1100, 0.7, panear(A.g, rv(-0.8, 0.8))), t, 0.025), 3);
      suceso(A, 10, 24, t => grito(A, t), rv(5, 9));
      suceso(A, 28, 55, t => { const p = conSala(A.g, 0.6); TN({t, f:70, f2:40, d:0.5, v:0.12, lp:300, dest:p}); RZ({t, a:0.02, d:0.6, v:0.1, f:300, tipo:'lowpass', col:'pardo', dest:p}); }, rv(12, 20));   /* una viga que cae lejos */
    },
    templo(A){
      const ag = bucle(A, 'blanco', 'bandpass', 1900, 0.8, 0.026, -0.35); lfo(A, 3.1, 0.006, ag.g.gain); lfo(A, 0.23, 260, ag.fl.frequency);
      const ag2 = bucle(A, 'rosa', 'bandpass', 620, 0.9, 0.04, -0.3); lfo(A, 4.7, 0.01, ag2.g.gain);                                     /* la fuente */
      bucle(A, 'rosa', 'lowpass', 380, 0.7, 0.05, 0.2);                                                                                  /* el aire del patio */
      suceso(A, 0.12, 0.5, t => gota(panear(A.g, rv(-0.6, 0)), t, rv(0.006, 0.018)));
      suceso(A, 22, 42, t => bonsho(A, t), 4);
      suceso(A, 26, 48, t => shishi(A, t), rv(10, 16));
      suceso(A, 7, 16, t => pajaro(A, t), 5);
    }
  };
  function pasoAmb(){
    const now = ya();
    if(AMB) for(const e of AMB.ev) if(now >= e.prox){ e.prox = now + rv(e.a, e.b); try { e.fn(now + 0.05); } catch(x){ err(x); } }
    for(let i = VIEJOS.length - 1; i >= 0; i--){ const A = VIEJOS[i];
      if(now > A.fin){ for(const n of A.nodos) try { n.stop(); n.disconnect(); } catch(e){} try { A.g.disconnect(); } catch(e){} VIEJOS.splice(i, 1); } }
  }

  /* ------------------------------------------------------------ lento, intensidad, cinta, muerte, volumen, paso */
  function aplicarLento(){
    if(Math.abs(kLento - kAplic) < 0.004) return; kAplic = kLento;
    const now = ya(), fc = 18000*Math.pow(850/18000, kLento), dl = detL();
    N.musF.frequency.setTargetAtTime(fc, now, 0.03); N.ambF.frequency.setTargetAtTime(Math.min(fc*1.3, 20000), now, 0.03);
    N.fxF.frequency.setTargetAtTime(20000*Math.pow(0.3, kLento), now, 0.03);
    N.revMin.gain.setTargetAtTime(lerp(0.1, 0.35, kLento), now, 0.06);
    for(const r of OSC_M) if(r.fin > now) try { r.p.setTargetAtTime(r.d0 + dl, now, 0.03); } catch(e){}
    if(AMB) for(const l of AMB.loops) try { l.s.playbackRate.setTargetAtTime(l.r*lerp(1, 0.6, kLento), now, 0.04); } catch(e){}
  }
  /* se sigue al objetivo por tiempo real: da lo mismo que lo llamen el juego, paso() o los dos */
  function avanzarLento(){
    const tn = performance.now(), dt = tLento ? lim((tn - tLento)/1000, 0, 0.1) : 0.016; tLento = tn;
    kLento += (kLentoObj - kLento)*(1 - Math.exp(-dt*18)); if(Math.abs(kLento - kLentoObj) < 0.003) kLento = kLentoObj;
    aplicarLento();
  }
  function lento(k){ kLentoObj = lim(+k || 0, 0, 1); if(!listo) return; try { avanzarLento(); } catch(e){ err(e); } }
  function intensidad(k){ intenObj = lim(+k || 0, 0, 1); }
  /* la cinta y el vinilo: wow, flutter, siseo, crepitar y un poco de agudos menos. Algunos temas ya traen su piso */
  function aplicarCinta(){
    const T = tiene(TEMAS, temaAct) ? TEMAS[temaAct] : null, k = Math.max(kCinta, (T && T.cinta) || 0);
    if(Math.abs(k - cintaAplic) < 0.003) return; cintaAplic = k; const now = ya();
    N.wowG[0].gain.setTargetAtTime(0.0022*k, now, 0.3); N.wowG[1].gain.setTargetAtTime(0.00008*k, now, 0.3); N.wowG[2].gain.setTargetAtTime(0.003*k, now, 0.3);
    N.siseo.gain.setTargetAtTime(0.022*k, now, 0.3); N.crep.gain.setTargetAtTime(0.09*k, now, 0.3); N.cLp.frequency.setTargetAtTime(lerp(18000, 5200, Math.sqrt(k)), now, 0.3);
  }
  function cinta(k){ kCinta = lim(+k || 0, 0, 1); if(!listo) return; try { aplicarCinta(); } catch(e){ err(e); } }
  /* el ninja murió: la música se hunde detrás de un pasabajos y se desafina como una cinta que frena */
  function filtroMuerte(on){
    muertePed = !!on; if(!listo) return;
    try { const now = ya(), k = muertePed ? 1 : 0; if(k === kMuerte) return; kMuerte = k;
      const fr = N.muF.frequency, gg = N.muG.gain; fr.cancelScheduledValues(now); gg.cancelScheduledValues(now); fr.setValueAtTime(fr.value, now); gg.setValueAtTime(gg.value, now);
      if(k){ fr.setTargetAtTime(420, now, 0.16); gg.setTargetAtTime(0.55, now, 0.25); } else { fr.setTargetAtTime(18000, now, 0.075); gg.setTargetAtTime(1, now, 0.075); }
      const dl = detL(), tc = k ? 0.35 : 0.075;
      for(const r of OSC_M) if(r.fin > now) try { r.p.setTargetAtTime(r.d0 + dl, now, tc); } catch(e){}
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
      if(kLento !== kLentoObj) avanzarLento();
      if(C.state !== 'running') return;
      inten += (intenObj - inten)*(1 - Math.exp(-d*1.4));
      const now = ya();
      for(const r of REPS) if(r.vivo && r.T.capas){ const kb = lerp(0.75, 1, Math.max(inten, r.T.kMin || 0));          /* con poca intensidad la base va más atrás */
        if(Math.abs(kb - r.kb) > 0.01){ r.kb = kb; capaA(r.cap.base, kb, now); }
        for(const n of CAPAS){ const v = objCapa(r.T, n);
          if(Math.abs(v - r.cv[n]) > 0.01 || (v !== r.cv[n] && (v === 0 || v === 1))){ r.cv[n] = v; capaA(r.cap[n], v, now); } } }
      bombear(); pasoAmb(); aplicarCinta();
      for(let i = REPS.length - 1; i >= 0; i--){ const r = REPS[i];
        if(!r.vivo && now > r.muere){ for(const g of r.oscs) if(g.fin > now){ g.fin = now; try { g.o.stop(); } catch(e){} } try { r.bus.disconnect(); r.eco.disconnect(); r.sala.disconnect(); } catch(e){} REPS.splice(i, 1); }
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

  return {arrancar, fx:(n, o) => fx(n, o), musica, ambiente, lento, paso, volumen, intensidad, filtroMuerte, cinta,
    /* para el banco */
    _N:() => N, _ctx:() => C, _salida:() => N && N.sal, _err:ERR, _faltan:FALTAN, _vivas:() => VIVAS.length, _reps:() => REPS.map(r => r.nom + (r.vivo ? '' : '·')),
    _lista:() => Object.keys(FX), _temas:() => Object.keys(TEMAS), _ambientes:() => Object.keys(ARMA),
    _mel:() => Object.keys(TEMAS).filter(k => TEMAS[k].M).map(k => [k, TEMAS[k].M.pasos, TEMAS[k].M2 ? TEMAS[k].M2.pasos : 0, TEMAS[k].A.length*16]),
    _vivos:() => { const n = ya(); return OSC_M.filter(r => r.fin > n).length; }, _ks:() => KS.size,
    /* una nota de shakuhachi y una de koto por el camino de la música, para medir la altura */
    _nota:(m, d, cual) => { if(!listo) return; try { const t = ya() + 0.02; if(cual === 'koto') koto(N.mus, t, m, d, 0.8); else shaku(N.mus, t, m, d, 0.9, {eco:0, sala:0, vib:0.001}); } catch(e){ err(e); } },
    _estado:() => ({kLento, inten, kMuerte, kCinta, tema:temaAct, amb:ambAct, osc:OSC_M.length, vivas:VIVAS.length, reps:REPS.length, cinta:cintaAplic, viejos:VIEJOS.length, ks:KS.size})};
})();
