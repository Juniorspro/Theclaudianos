
/* ====================== sonido ======================
   Tres fuentes, en este orden: lo generado con Rezona (SONIDOS, si llegó y decodificó), muestras
   sintetizadas por capas al abrir el audio (BANCO: estampido, cuerpo, golpe grave y mecánica, como se
   arma un disparo de verdad) y, mientras el banco se hornea, los tonos de siempre. Todo lo que suena en
   el mundo manda una parte a una reverb por convolución con la respuesta del lugar. */
let AC=null, amo, mus, efx, comp, rev=null, revG=null, radioB=null, musEco=null, ruido=null;
const BANCO = {}, BUCLES = {};
let VOCES_ACT = 0;
function audioIni(){
  if(AC){ if(AC.state==='suspended') AC.resume(); return; }
  try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
  amo = AC.createGain(); amo.gain.value = G.sonido ? 0.9 : 0; amo.connect(AC.destination);
  comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.18; comp.connect(amo);
  mus = AC.createGain(); mus.gain.value = 0.2; mus.connect(comp);
  efx = AC.createGain(); efx.gain.value = 0.85; efx.connect(comp);
  rev = AC.createConvolver(); revG = AC.createGain(); revG.gain.value = 0.4; rev.connect(revG); revG.connect(comp);
  /* eco de la música (corchea con puntillo) */
  musEco = AC.createDelay(1.5); const fb = AC.createGain(); fb.gain.value = 0.32; const ef = AC.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 2400;
  musEco.connect(ef); ef.connect(fb); fb.connect(musEco); ef.connect(mus);
  /* la radio: banda de teléfono y un poco de saturación */
  radioB = AC.createBiquadFilter(); radioB.type = 'bandpass'; radioB.frequency.value = 1500; radioB.Q.value = 0.8;
  const sat = AC.createWaveShaper(), cur = new Float32Array(256); for(let i=0;i<256;i++){ const x = i/128 - 1; cur[i] = Math.tanh(x*3)/Math.tanh(3); } sat.curve = cur;
  const rg = AC.createGain(); rg.gain.value = 1.1; radioB.connect(sat); sat.connect(rg); rg.connect(comp);
  ruido = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = ruido.getChannelData(0); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  ambienteAudio(J.ambiente || 'galpon');
  hornearBanco();
  if(typeof decAudios === 'function') decAudios();
  vozDesbloquear();
}
function tono(f, dur, tipo, vol, t, dest, f2){
  if(!AC) return; t = t||AC.currentTime; const o = AC.createOscillator(), g = AC.createGain();
  o.type = tipo||'square'; o.frequency.setValueAtTime(f, t); if(f2) o.frequency.exponentialRampToValueAtTime(Math.max(20,f2), t+dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t+dur); o.connect(g); g.connect(dest||efx); o.start(t); o.stop(t+dur+0.03);
}
function soplo(dur, vol, f0, f1, t, tipo, q, dest, pan){
  if(!AC) return; t = t||AC.currentTime; const s = AC.createBufferSource(); s.buffer = ruido;
  const fl = AC.createBiquadFilter(); fl.type = tipo||'bandpass'; fl.frequency.setValueAtTime(f0, t); if(f1) fl.frequency.exponentialRampToValueAtTime(f1, t+dur); fl.Q.value = q||1;
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t+dur);
  let fin = g; if(pan !== undefined && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = lim(pan,-1,1); g.connect(p); fin = p; }
  s.connect(fl); fl.connect(g); fin.connect(dest||efx); s.start(t, Math.random()*0.5); s.stop(t+dur+0.03);
}

/* ---------- síntesis de muestras (una vez, de a una por tarea para no trabar el toque) ---------- */
function rnd32(seed){ let s = (seed >>> 0) || 1; return ()=>{ s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0)/4294967296)*2 - 1; }; }
/* biquad (RBJ) sobre un arreglo; la frecuencia puede ser una función del tiempo (se recalcula cada 32 muestras) */
function filtrar(x, tipo, f, q){
  const sr = AC.sampleRate, n = x.length, y = new Float32Array(n); let x1=0, x2=0, y1=0, y2=0, b0=1, b1=0, b2=0, a1=0, a2=0;
  const coef = fr=>{ const w = 2*Math.PI*Math.max(20, Math.min(fr, sr*0.45))/sr, cs = Math.cos(w), sn = Math.sin(w), al = sn/(2*(q||0.707)), A0 = 1 + al;
    if(tipo==='lp'){ b0 = (1-cs)/2/A0; b1 = (1-cs)/A0; b2 = b0; } else if(tipo==='hp'){ b0 = (1+cs)/2/A0; b1 = -(1+cs)/A0; b2 = b0; } else { b0 = al/A0; b1 = 0; b2 = -al/A0; }
    a1 = -2*cs/A0; a2 = (1-al)/A0; };
  const vari = typeof f === 'function'; if(!vari) coef(f);
  for(let i=0;i<n;i++){ if(vari && (i & 31) === 0) coef(f(i/sr)); const v = x[i], o = b0*v + b1*x1 + b2*x2 - a1*y1 - a2*y2; x2 = x1; x1 = v; y2 = y1; y1 = o; y[i] = o; }
  return y;
}
const ruidoArr = (n, r)=>{ const a = new Float32Array(n); for(let i=0;i<n;i++) a[i] = r(); return a; };
/* resonancia metálica: senos amortiguados con parciales inarmónicos */
function metal(out, i0, f, amp, dec, parc){
  const sr = AC.sampleRate; parc = parc || [[1,1],[1.51,0.6],[2.23,0.35]];
  for(const [m, a] of parc){ const w = 2*Math.PI*f*m/sr, dd = dec/Math.sqrt(m); for(let i=i0, k=0; i<out.length && k < sr*dd*6; i++, k++) out[i] += amp*a*Math.sin(w*k)*Math.exp(-k/sr/dd); }
}
function rafaga(out, i0, dur, amp, f, q, r){ const sr = AC.sampleRate, n = Math.round(dur*sr), x = filtrar(ruidoArr(n, r), 'bp', f, q||1.2);
  for(let k=0;k<n && i0 + k < out.length;k++) out[i0 + k] += amp*x[k]*Math.exp(-k/n*5); }
function cerrar(out, sat, vol){
  const sr = AC.sampleRate, k = sat||1.5, tk = Math.tanh(k); let pico = 0;
  for(let i=0;i<out.length;i++){ out[i] = Math.tanh(out[i]*k)/tk; pico = Math.max(pico, Math.abs(out[i])); }
  const fn = Math.min(out.length, Math.round(0.015*sr)); for(let i=0;i<fn;i++) out[out.length - 1 - i] *= i/fn;
  const g = (vol||0.9)/(pico||1); for(let i=0;i<out.length;i++) out[i] *= g; return out;
}
function sDisparo(o, seed){
  const sr = AC.sampleRate, n = Math.round(o.dur*sr), r = rnd32(seed), ns = ruidoArr(n, r), out = new Float32Array(n);
  const cuerpo = filtrar(ns, 'lp', t=> o.f1 + (o.f0 - o.f1)*Math.exp(-t/o.barrido), 0.9), crack = filtrar(ns, 'hp', o.crackF||2600, 0.7);
  let fase = 0;
  for(let i=0;i<n;i++){ const t = i/sr, ata = Math.min(1, t/0.0004);
    let v = cuerpo[i]*Math.exp(-t/o.dec)*ata*o.cuerpo + crack[i]*Math.exp(-t/0.0022)*o.crack;
    const ft = o.g1 + (o.g0 - o.g1)*Math.exp(-t/0.02); fase += 2*Math.PI*ft/sr; v += Math.sin(fase)*Math.exp(-t/o.gdec)*o.golpe*ata;
    if(o.cola) v += cuerpo[i]*o.cola*Math.exp(-t/(o.dec*4))*(1 - Math.exp(-t/0.01));
    out[i] = v; }
  for(const [t0, f, a] of (o.mec||[])) { const i0 = Math.round((t0 + Math.abs(r())*0.004)*sr); metal(out, i0, f*(1 + r()*0.04), a, 0.012); rafaga(out, i0, 0.004, a*1.4, f*1.3, 1, r); }
  return cerrar(out, o.sat, 0.92);
}
const ARMAS_SON = {
  pistola: {dur:0.3, f0:7000, f1:380, barrido:0.02, dec:0.045, cuerpo:1, crack:0.85, crackF:3000, g0:190, g1:72, gdec:0.05, golpe:0.6, mec:[[0.034, 3300, 0.12]], sat:2.2, cola:0.12},
  subfusil: {dur:0.22, f0:7500, f1:520, barrido:0.015, dec:0.03, cuerpo:0.9, crack:0.75, g0:210, g1:95, gdec:0.035, golpe:0.45, mec:[[0.024, 3900, 0.08]], sat:2, cola:0.1},
  fusil: {dur:0.38, f0:8200, f1:300, barrido:0.026, dec:0.06, cuerpo:1, crack:1, crackF:2800, g0:165, g1:55, gdec:0.07, golpe:0.85, mec:[[0.04, 2600, 0.1]], sat:2.6, cola:0.14},
  escopeta: {dur:0.55, f0:5200, f1:160, barrido:0.045, dec:0.11, cuerpo:1.25, crack:0.6, g0:125, g1:40, gdec:0.12, golpe:1.25, sat:3, cola:0.18},
  tirador: {dur:0.48, f0:8200, f1:250, barrido:0.032, dec:0.08, cuerpo:1.1, crack:1.1, g0:145, g1:45, gdec:0.09, golpe:1, mec:[[0.05, 2400, 0.1]], sat:2.8, cola:0.16},
  franco: {dur:0.85, f0:9000, f1:180, barrido:0.04, dec:0.13, cuerpo:1.2, crack:1.35, g0:112, g1:34, gdec:0.15, golpe:1.35, sat:3, cola:0.22},
  silen: {dur:0.2, f0:1900, f1:260, barrido:0.02, dec:0.03, cuerpo:0.7, crack:0.08, g0:230, g1:105, gdec:0.03, golpe:0.35, mec:[[0.012, 3600, 0.35],[0.03, 2900, 0.22]], sat:1.5},
  enemigo: {dur:0.4, f0:5200, f1:260, barrido:0.03, dec:0.06, cuerpo:1, crack:0.5, g0:150, g1:55, gdec:0.07, golpe:0.6, sat:2.2, cola:0.2},
};
/* cada muestra: una función que devuelve el arreglo (se llama con AC listo) */
const SINTE = {
  impacto(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.22*sr)); rafaga(out, 0, 0.02, 1, 2400, 0.9, r); metal(out, 0, 180, 0.3, 0.02, [[1,1]]);
    for(let k=0;k<6;k++) rafaga(out, Math.round((0.02 + Math.abs(r())*0.14)*sr), 0.004, 0.35*(1 - k/7), 3000 + Math.abs(r())*3000, 1.5, r); return cerrar(out, 1.6, 0.8); },
  metalico(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.4*sr)), f = 1800 + Math.abs(r())*900; rafaga(out, 0, 0.005, 0.8, 5000, 1, r);
    metal(out, 0, f, 0.5, 0.09, [[1,1],[2.76,0.5],[5.4,0.25],[8.93,0.12]]); return cerrar(out, 1.3, 0.7); },
  carne(r){ const sr = AC.sampleRate, n = Math.round(0.14*sr), x = filtrar(ruidoArr(n, r), 'lp', 520, 0.8), out = new Float32Array(n); let fs = 0;
    for(let i=0;i<n;i++){ const t = i/sr; fs += 2*Math.PI*(60 + 50*Math.exp(-t/0.02))/sr; out[i] = x[i]*Math.exp(-t/0.035)*1.6 + Math.sin(fs)*Math.exp(-t/0.05)*0.8; } return cerrar(out, 1.8, 0.8); },
  placa(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.6*sr)); rafaga(out, 0, 0.006, 1, 4200, 0.8, r);
    metal(out, 0, 820 + Math.abs(r())*160, 0.7, 0.18, [[1,1],[2.32,0.7],[3.87,0.45],[5.21,0.3],[7.1,0.15]]); return cerrar(out, 1.6, 0.85); },
  vidrio(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.7*sr)); rafaga(out, 0, 0.03, 0.9, 5200, 0.6, r);
    for(let k=0;k<34;k++){ const t0 = Math.pow(Math.abs(r()), 1.8)*0.5; metal(out, Math.round(t0*sr), 3000 + Math.abs(r())*6000, 0.18*(1 - t0*1.2), 0.02 + Math.abs(r())*0.03, [[1,1],[2.4,0.4]]); }
    const h = filtrar(ruidoArr(out.length, r), 'hp', 5000, 0.7); for(let i=0;i<out.length;i++) out[i] += h[i]*0.25*Math.exp(-i/sr/0.12); return cerrar(out, 1.4, 0.8); },
  casquillo(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.35*sr)); [[0,1],[0.075,0.6],[0.12,0.35],[0.16,0.2]].forEach(([t, a])=>
    metal(out, Math.round((t + Math.abs(r())*0.01)*sr), 4300 + Math.abs(r())*2500, 0.3*a, 0.03, [[1,1],[2.7,0.5],[5.1,0.2]])); return cerrar(out, 1.2, 0.7); },
  clic(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.06*sr)); rafaga(out, 0, 0.003, 1, 3400, 1.2, r); metal(out, 0, 2400 + Math.abs(r())*800, 0.35, 0.008); return cerrar(out, 1.2, 0.8); },
  recargaA(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.32*sr)); rafaga(out, 0, 0.004, 1, 2600, 1.2, r); metal(out, 0, 2100, 0.3, 0.01);
    rafaga(out, Math.round(0.03*sr), 0.07, 0.25, 1300, 0.7, r); rafaga(out, Math.round(0.12*sr), 0.004, 0.8, 2000, 1.2, r); metal(out, Math.round(0.12*sr), 1650, 0.25, 0.012); return cerrar(out, 1.4, 0.75); },
  recargaB(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.45*sr)); rafaga(out, 0, 0.012, 1, 900, 0.8, r); metal(out, 0, 620, 0.3, 0.02, [[1,1],[2.1,0.4]]);
    [[0.2, 1],[0.27, 0.8]].forEach(([t, a])=>{ const i = Math.round(t*sr); rafaga(out, i, 0.004, a, 3000, 1.2, r); metal(out, i, 2900, 0.3*a, 0.02, [[1,1],[1.51,0.6],[2.9,0.3]]); }); return cerrar(out, 1.4, 0.8); },
  cerrojo(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.55*sr)); [[0, 0.7, 2300],[0.15, 1, 1900],[0.31, 0.9, 2100],[0.39, 0.7, 2600]].forEach(([t, a, f])=>{ const i = Math.round(t*sr);
      rafaga(out, i, 0.004, a, f*1.3, 1.2, r); metal(out, i, f, 0.3*a, 0.014); }); rafaga(out, Math.round(0.05*sr), 0.09, 0.22, 1500, 0.7, r); rafaga(out, Math.round(0.2*sr), 0.1, 0.2, 1700, 0.7, r); return cerrar(out, 1.4, 0.8); },
  vacio(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.05*sr)); rafaga(out, 0, 0.003, 1, 4200, 1.5, r); metal(out, 0, 3600, 0.25, 0.006); return cerrar(out, 1.2, 0.6); },
  boom(r){ const sr = AC.sampleRate, n = Math.round(2*sr), ns = ruidoArr(n, r), x = filtrar(ns, 'lp', t=> 110 + 3200*Math.exp(-t/0.12), 0.8), out = new Float32Array(n); let fs = 0;
    for(let i=0;i<n;i++){ const t = i/sr, ata = Math.min(1, t/0.002); fs += 2*Math.PI*(26 + 50*Math.exp(-t/0.12))/sr; out[i] = (x[i]*Math.exp(-t/0.42)*1.6 + Math.sin(fs)*Math.exp(-t/0.5)*1.1)*ata; }
    for(let k=0;k<26;k++){ const t0 = 0.08 + Math.pow(Math.abs(r()), 1.5)*1.3; rafaga(out, Math.round(t0*sr), 0.006 + Math.abs(r())*0.01, 0.25*(1 - t0/1.5), 1500 + Math.abs(r())*3000, 1.2, r); }
    return cerrar(out, 3, 0.95); },
  estampido(r){ const sr = AC.sampleRate, n = Math.round(0.7*sr), ns = ruidoArr(n, r), x = filtrar(ns, 'lp', t=> 350 + 7000*Math.exp(-t/0.05), 0.8), c = filtrar(ns, 'hp', 3000, 0.7), out = new Float32Array(n);
    for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*Math.exp(-t/0.09)*1.5 + c[i]*Math.exp(-t/0.004)*1.4; } return cerrar(out, 3, 0.95); },
  cohete(r){ const sr = AC.sampleRate, n = Math.round(1.6*sr), x = filtrar(ruidoArr(n, r), 'bp', t=> 500 + 2200*Math.min(1, t/0.35)*Math.exp(-Math.max(0, t - 0.35)/0.6), 0.9), out = new Float32Array(n);
    for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*Math.min(1, t/0.03)*Math.exp(-t/0.7)*1.4; } rafaga(out, 0, 0.03, 1.2, 800, 0.7, r); return cerrar(out, 2, 0.85); },
  patada(r){ const sr = AC.sampleRate, n = Math.round(0.9*sr), out = new Float32Array(n), lp = filtrar(ruidoArr(n, r), 'lp', 900, 0.7); let fs = 0;
    for(let i=0;i<Math.round(0.4*sr);i++){ const t = i/sr; fs += 2*Math.PI*(45 + 40*Math.exp(-t/0.03))/sr; out[i] += Math.sin(fs)*Math.exp(-t/0.12)*1.2 + lp[i]*Math.exp(-t/0.06)*1.1; }
    for(let k=0;k<6;k++) rafaga(out, Math.round((0.008 + Math.abs(r())*0.06)*sr), 0.012, 0.7, 900 + Math.abs(r())*1100, 2, r);
    const i2 = Math.round(0.16*sr); fs = 0; for(let i=i2;i<n;i++){ const t = (i - i2)/sr; fs += 2*Math.PI*55/sr; out[i] += Math.sin(fs)*Math.exp(-t/0.15)*0.8 + lp[i]*Math.exp(-t/0.1)*0.9; }
    return cerrar(out, 2.4, 0.95); },
  zumbido(r){ const sr = AC.sampleRate, n = Math.round(0.16*sr), x = filtrar(ruidoArr(n, r), 'bp', t=> 5200 - 3600*t/0.16, 3), out = new Float32Array(n);
    for(let i=0;i<n;i++){ const t = i/sr, e = Math.sin(Math.PI*Math.min(1, t/0.16)); out[i] = x[i]*e*e*1.5; } rafaga(out, 0, 0.002, 0.8, 6000, 1, r); return cerrar(out, 1.4, 0.7); },
  lento(r){ const sr = AC.sampleRate, n = Math.round(1.4*sr), x = filtrar(ruidoArr(n, r), 'lp', t=> 140 + 3000*Math.exp(-t/0.25), 1.2), out = new Float32Array(n); let fs = 0;
    for(let i=0;i<n;i++){ const t = i/sr; fs += 2*Math.PI*(30 + 40*Math.exp(-t/0.3))/sr; out[i] = x[i]*Math.exp(-t/0.45)*1.2 + Math.sin(fs)*Math.exp(-t/0.7)*0.9; } return cerrar(out, 2, 0.85); },
  rapido(r){ const sr = AC.sampleRate, n = Math.round(0.55*sr), x = filtrar(ruidoArr(n, r), 'bp', t=> 250 + 3000*t/0.55, 1.2), out = new Float32Array(n);
    for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*Math.sin(Math.PI*t/0.55); } return cerrar(out, 1.4, 0.6); },
  latido(r){ const sr = AC.sampleRate, n = Math.round(0.5*sr), out = new Float32Array(n); for(const [t0, a] of [[0, 1],[0.2, 0.7]]){ let fs = 0; const i0 = Math.round(t0*sr);
      for(let i=i0;i<n;i++){ const t = (i - i0)/sr; fs += 2*Math.PI*(40 + 30*Math.exp(-t/0.03))/sr; out[i] += a*Math.sin(fs)*Math.exp(-t/0.07); } } return cerrar(out, 1.6, 0.9); },
  duele(r){ const sr = AC.sampleRate, n = Math.round(0.3*sr), x = filtrar(ruidoArr(n, r), 'lp', 700, 0.8), out = new Float32Array(n); let fs = 0;
    for(let i=0;i<n;i++){ const t = i/sr; fs += 2*Math.PI*(70 + 60*Math.exp(-t/0.04))/sr; out[i] = x[i]*Math.exp(-t/0.06) + Math.sin(fs)*Math.exp(-t/0.1)*0.9; } return cerrar(out, 2, 0.85); },
  baja(r){ const sr = AC.sampleRate, n = Math.round(0.3*sr), out = new Float32Array(n); let fs = 0; for(let i=0;i<n;i++){ const t = i/sr; fs += 2*Math.PI*(60 + 120*Math.exp(-t/0.03))/sr; out[i] = Math.sin(fs)*Math.exp(-t/0.08); }
    rafaga(out, 0, 0.02, 0.5, 700, 0.8, r); return cerrar(out, 1.8, 0.8); },
  marca(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.07*sr)); rafaga(out, 0, 0.003, 0.7, 5000, 1.5, r); metal(out, 0, 2700, 0.4, 0.012, [[1,1],[2.02,0.3]]); return cerrar(out, 1.1, 0.7); },
  cabeza(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.3*sr)); rafaga(out, 0, 0.003, 0.6, 6000, 1.5, r); metal(out, 0, 1760, 0.5, 0.06, [[1,1],[2,0.5],[3,0.3],[4.2,0.15]]); return cerrar(out, 1.1, 0.8); },
  boton(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.05*sr)); rafaga(out, 0, 0.003, 0.8, 3600, 1.4, r); metal(out, 0, 1900, 0.3, 0.008, [[1,1],[2.3,0.3]]); return cerrar(out, 1.1, 0.7); },
  moneda(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.5*sr)); rafaga(out, 0, 0.01, 0.9, 900, 0.9, r); metal(out, 0, 600, 0.3, 0.02);
    metal(out, Math.round(0.06*sr), 2640, 0.35, 0.12, [[1,1],[1.5,0.6],[2.76,0.3]]); return cerrar(out, 1.2, 0.75); },
  radio(r){ const sr = AC.sampleRate, n = Math.round(0.16*sr), x = filtrar(ruidoArr(n, r), 'bp', 2200, 1.5), out = new Float32Array(n);
    for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*(t < 0.1 ? 0.7 : Math.exp(-(t - 0.1)/0.01)); } metal(out, Math.round(0.11*sr), 1200, 0.3, 0.02, [[1,1]]); return cerrar(out, 2, 0.6); },
  aviso(r){ const sr = AC.sampleRate, n = Math.round(0.26*sr), out = new Float32Array(n); for(const [t0, f] of [[0, 880],[0.12, 660]]){ const i0 = Math.round(t0*sr);
      for(let i=i0;i<Math.min(n, i0 + 0.1*sr);i++){ const t = (i - i0)/sr; out[i] += (Math.sin(2*Math.PI*f*t) + 0.3*Math.sin(2*Math.PI*f*3*t))*Math.min(1, t/0.004)*Math.exp(-t/0.06); } } return cerrar(out, 1.2, 0.6); },
  giro(r){ const sr = AC.sampleRate, n = Math.round(1.3*sr), out = new Float32Array(n), x = filtrar(ruidoArr(n, r), 'bp', t=> 300 + 1400*Math.min(1, t/1.1), 2); let fs = 0;
    for(let i=0;i<n;i++){ const t = i/sr, f = 60 + 260*Math.min(1, t/1.1); fs += 2*Math.PI*f/sr; out[i] = (Math.sin(fs) + 0.5*Math.sin(fs*2) + 0.25*Math.sin(fs*3))*0.4*Math.min(1, t/0.2) + x[i]*0.5; } return cerrar(out, 1.6, 0.7); },
  paso(r){ const sr = AC.sampleRate, n = Math.round(0.12*sr), x = filtrar(ruidoArr(n, r), 'lp', 1400, 0.8), out = new Float32Array(n); for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*Math.exp(-t/0.025)*(1 + 0.5*Math.sin(2*Math.PI*90*t)); }
    rafaga(out, Math.round(0.012*sr), 0.02, 0.2, 3000, 1, r); return cerrar(out, 1.4, 0.6); },
  /* bucles: un número entero de ciclos en un segundo, así se cosen solos */
  rotor(r){ const sr = AC.sampleRate, n = sr, out = new Float32Array(n), x = filtrar(ruidoArr(n, r), 'lp', 260, 0.8), h = filtrar(ruidoArr(n, r), 'bp', 1800, 1);
    for(let i=0;i<n;i++){ const t = i/sr, p = (t*11) % 1, golpe = Math.exp(-p/0.18); out[i] = x[i]*(0.35 + golpe*1.4) + h[i]*0.12 + Math.sin(2*Math.PI*1150*t)*0.03 + Math.sin(2*Math.PI*44*t)*golpe*0.4; }
    return cerrarBucle(out); },
  motor(r){ const sr = AC.sampleRate, n = sr, out = new Float32Array(n), x = filtrar(ruidoArr(n, r), 'lp', 500, 0.8);
    for(let i=0;i<n;i++){ const t = i/sr, w = 2*Math.PI*45*t; out[i] = (Math.sin(w) + 0.6*Math.sin(2*w) + 0.45*Math.sin(3*w + 0.5) + 0.25*Math.sin(4*w) + 0.15*Math.sin(6*w))*0.35*(1 + 0.25*Math.sin(2*Math.PI*6*t)) + x[i]*0.35; }
    return cerrarBucle(out); },
  /* batería de la música */
  bombo(r){ const sr = AC.sampleRate, n = Math.round(0.45*sr), out = new Float32Array(n); let fs = 0; for(let i=0;i<n;i++){ const t = i/sr; fs += 2*Math.PI*(44 + 110*Math.exp(-t/0.035))/sr; out[i] = Math.sin(fs)*Math.exp(-t/0.16); }
    rafaga(out, 0, 0.004, 0.5, 3000, 1, r); return cerrar(out, 2.2, 0.95); },
  caja(r){ const sr = AC.sampleRate, n = Math.round(0.25*sr), x = filtrar(ruidoArr(n, r), 'bp', 2400, 0.6), out = new Float32Array(n); let fs = 0;
    for(let i=0;i<n;i++){ const t = i/sr; fs += 2*Math.PI*(185 + 60*Math.exp(-t/0.01))/sr; out[i] = x[i]*Math.exp(-t/0.07)*1.3 + Math.sin(fs)*Math.exp(-t/0.05)*0.7; } return cerrar(out, 2, 0.85); },
  palmas(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.25*sr)); [0, 0.011, 0.022].forEach(t=> rafaga(out, Math.round(t*sr), 0.012, 0.9, 1400, 1.2, r)); rafaga(out, Math.round(0.03*sr), 0.15, 0.6, 1200, 0.9, r); return cerrar(out, 1.6, 0.8); },
  hat(r){ const sr = AC.sampleRate, n = Math.round(0.05*sr), x = filtrar(ruidoArr(n, r), 'hp', 7500, 0.8), out = new Float32Array(n); for(let i=0;i<n;i++) out[i] = x[i]*Math.exp(-i/sr/0.012); return cerrar(out, 1.2, 0.6); },
  hatA(r){ const sr = AC.sampleRate, n = Math.round(0.3*sr), x = filtrar(ruidoArr(n, r), 'hp', 6500, 0.8), out = new Float32Array(n); for(let i=0;i<n;i++) out[i] = x[i]*Math.exp(-i/sr/0.08); return cerrar(out, 1.2, 0.55); },
  tom(r){ const sr = AC.sampleRate, n = Math.round(0.6*sr), out = new Float32Array(n); let fs = 0; for(let i=0;i<n;i++){ const t = i/sr; fs += 2*Math.PI*(72 + 60*Math.exp(-t/0.06))/sr; out[i] = Math.sin(fs)*Math.exp(-t/0.22); }
    rafaga(out, 0, 0.01, 0.5, 900, 0.8, r); return cerrar(out, 1.8, 0.9); },
  platillo(r){ const sr = AC.sampleRate, n = Math.round(1.6*sr), x = filtrar(ruidoArr(n, r), 'hp', 4200, 0.6), out = new Float32Array(n); for(let i=0;i<n;i++) out[i] = x[i]*Math.exp(-i/sr/0.5)*Math.min(1, i/sr/0.004); return cerrar(out, 1.3, 0.6); },
  subida(r){ const sr = AC.sampleRate, n = Math.round(2*sr), x = filtrar(ruidoArr(n, r), 'bp', t=> 300 + 5000*Math.pow(t/2, 2), 2), out = new Float32Array(n); for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*Math.pow(t/2, 1.5); } return cerrar(out, 1.3, 0.6); },
  toc(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.06*sr)); rafaga(out, 0, 0.004, 1, 1800, 2.5, r); metal(out, 0, 1100, 0.3, 0.01, [[1,1],[2.4,0.3]]); return cerrar(out, 1.2, 0.7); },
};
function cerrarBucle(out){ /* sin clic en la costura: el principio se funde con lo que sigue al final */
  const n = out.length, f = Math.round(n*0.04); for(let i=0;i<f;i++){ const a = i/f; out[i] = out[i]*a + out[n - f + i]*(1 - a); }
  const c = new Float32Array(n - f); c.set(out.subarray(0, n - f)); return cerrar(c, 1.2, 0.8);
}
const VARIANTES = {impacto:3, carne:2, metalico:2, casquillo:2, clic:2, paso:4, placa:2, marca:1};
function hornearBanco(){
  const tareas = [];
  for(const k in ARMAS_SON) for(let v=0;v<(k==='franco' || k==='escopeta' ? 2 : 3);v++) tareas.push([k, ()=> sDisparo(ARMAS_SON[k], 1000 + v*77 + k.length*13)]);
  for(const k in SINTE) for(let v=0;v<(VARIANTES[k]||1);v++) tareas.push([k, ()=> SINTE[k](rnd32(5000 + v*131 + k.length*7))]);
  const t0 = performance.now(); let i = 0;
  const uno = ()=>{ const fin = performance.now() + 8; /* de a 8 ms por tarea: el cuadro sigue */
    while(i < tareas.length && performance.now() < fin){ const [k, f] = tareas[i++];
      try{ const a = f(), b = AC.createBuffer(1, a.length, AC.sampleRate); b.getChannelData(0).set(a); (BANCO[k] = BANCO[k] || []).push(b); }catch(e){ ASSET.fallas.push('sonido ' + k + ': ' + e.message); } }
    if(i < tareas.length) setTimeout(uno, 0); else BANCO.__ms = Math.round(performance.now() - t0); };
  setTimeout(uno, 0);
}

/* ---------- reverb: la respuesta de cada lugar ---------- */
function respuesta(o, seed){
  const sr = AC.sampleRate, n = Math.round(o.dur*sr), b = AC.createBuffer(2, n, sr);
  for(let c=0;c<2;c++){ const d = b.getChannelData(c), r = rnd32(seed + c*999); let lp = 0;
    for(let i=0;i<n;i++){ const t = i/sr, k = Math.exp(-t/o.dec)*(o.difuso===undefined ? 1 : o.difuso); const a = Math.min(1, o.brillo*Math.exp(-t/(o.dec*1.5)) + 0.02); lp += (r()*k - lp)*a; d[i] = lp*Math.min(1, t/0.004); }
    for(const [tt, g] of o.temprano){ const i = Math.round((tt*(c ? 1.07 : 1))*sr); if(i < n) for(let k=0;k<Math.round(0.003*sr) && i + k < n;k++) d[i + k] += g*r()*Math.exp(-k/sr/0.0008)*3; } }
  return b;
}
const LUGARES = {
  cuarto: {dur:1.1, dec:0.22, brillo:0.5, temprano:[[0.007,0.5],[0.013,0.35],[0.021,0.3],[0.034,0.2]], envio:0.3},
  galpon: {dur:2.4, dec:0.55, brillo:0.32, temprano:[[0.018,0.45],[0.037,0.3],[0.061,0.25],[0.09,0.18],[0.14,0.1]], envio:0.5},
  bunker: {dur:1.7, dec:0.36, brillo:0.6, temprano:[[0.006,0.6],[0.012,0.5],[0.019,0.4],[0.027,0.3],[0.04,0.25],[0.06,0.15]], envio:0.45},
  puerto: {dur:2.8, dec:0.5, brillo:0.22, difuso:0.35, temprano:[[0.12,0.7],[0.23,0.5],[0.41,0.4],[0.66,0.28],[0.95,0.15]], envio:0.55},
  ruta: {dur:1.9, dec:0.3, brillo:0.25, difuso:0.25, temprano:[[0.19,0.55],[0.44,0.35],[0.8,0.18]], envio:0.4},
};
const LUGAR_DE = {deposito:'galpon', embajada:'cuarto', puerto:'puerto', autopista:'ruta', bunker:'bunker'};
function ambienteAudio(id){
  const k = LUGARES[id] ? id : (LUGAR_DE[id] || 'galpon'); J.ambiente = k; if(!AC || !rev || ambienteAudio.k === k) return; ambienteAudio.k = k;
  try{ rev.buffer = respuesta(LUGARES[k], 77); revG.gain.setTargetAtTime(1, AC.currentTime, 0.1); }catch(e){}
}

/* ---------- reproducir ---------- */
function tocar(buf, vol, pan, rate, envio, corte, t){
  if(VOCES_ACT > 28 && vol < 0.5) return null;
  const s = AC.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate||1;
  let n = s; if(corte){ const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = corte; s.connect(f); n = f; }
  const g = AC.createGain(); g.gain.value = vol; n.connect(g); let fin = g;
  if(pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = lim(pan,-1,1); g.connect(p); fin = p; }
  fin.connect(efx); if(envio && rev && rev.buffer){ const e = AC.createGain(); e.gain.value = envio; fin.connect(e); e.connect(rev); }
  VOCES_ACT++; s.onended = ()=> VOCES_ACT--; s.start(t||0); return s;
}
/* lo de Rezona, si llegó: nombre del juego → id del asset */
const REZ_DE = {pistola:'disp_p9', subfusil:'disp_k5', fusil:'disp_r4', escopeta:'disp_b12', tirador:'disp_m14', franco:'disp_l96', silen:'disp_silenciado', enemigo:'disp_enemigo',
  minigun:'minigun', recargaA:'recarga_mag', recargaB:'recarga_pistola', cerrojo:'cerrojo', vacio:'vacio', casquillo:'casquillos', impacto:'impacto_hormigon', metalico:'impacto_metal',
  carne:'impacto_cuerpo', placa:'impacto_placa', zumbido:'zumbido', rompe:'vidrio', patada:'patada_puerta', cegadora:'cegadora', boom:'explosion', cohete:'cohete', lento:'camara_lenta',
  marca:'marca', cabeza:'cabeza', boton:'ui_click', moneda:'ui_compra', latido:'corazon'};
const ENVIO = {pistola:0.45, subfusil:0.4, fusil:0.5, escopeta:0.55, tirador:0.55, franco:0.7, silen:0.15, enemigo:0.7, impacto:0.35, metalico:0.35, placa:0.3, rompe:0.35, patada:0.5, boom:0.6,
  estampido:0.6, cegadora:0.6, cohete:0.5, casquillo:0.2, paso:0.15, carne:0.15, recargaA:0.12, recargaB:0.12, cerrojo:0.15};
const NOMBRE_BANCO = {rompe:'vidrio', cegadora:'estampido', minigun:'giro'};
const ultSfx = {};
function sfx(n, vol, pan){
  if(!AC || !G.sonido) return; vol = (vol===undefined ? 1 : vol)*(J.demo ? 0.18 : 1); const t = AC.currentTime;
  if(ultSfx[n] && t - ultSfx[n] < 0.025) return; ultSfx[n] = t;
  const lento = J.lento > 0 ? 0.62 : 1, envio = (ENVIO[n]||0)*(J.demo ? 0.3 : 1);
  if(n === 'cegadora'){ const s = AC.createOscillator(), g = AC.createGain(); s.frequency.value = 3900; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14*vol, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    s.connect(g); g.connect(efx); s.start(t); s.stop(t + 3.3); }
  /* 1. lo generado */
  const rz = REZ_DE[n] && SONIDOS[REZ_DE[n]];
  if(rz){ tocar(rz, vol*0.9, pan, lento*(1 + (Math.random() - 0.5)*0.08), envio, n==='enemigo' ? 5200 : 0); return; }
  /* 2. el banco */
  const b = BANCO[NOMBRE_BANCO[n] || n];
  if(b && b.length){ const buf = b[Math.floor(Math.random()*b.length)], jit = 1 + (Math.random() - 0.5)*0.07;
    if(n === 'enemigo'){ const lejos = 1 - lim(vol, 0, 1); tocar(buf, 0.55*vol + 0.1, pan, jit*lento, envio, 5200 - lejos*3800); return; }
    tocar(buf, vol*(n==='franco' ? 1.1 : 1), pan, jit*lento, envio); return; }
  /* 3. lo de siempre */
  sfxViejo(n, vol, pan, t, lento);
}
function sfxViejo(n, vol, pan, t, lento){
  switch(n){
    case 'pistola': soplo(0.12, 0.8*vol, 3200*lento, 300, t, 'lowpass'); tono(160*lento, 0.08, 'square', 0.25*vol, t, efx, 60); break;
    case 'subfusil': soplo(0.07, 0.6*vol, 3600*lento, 500, t, 'lowpass'); tono(190*lento, 0.05, 'square', 0.18*vol, t, efx, 80); break;
    case 'fusil': soplo(0.11, 0.85*vol, 3000*lento, 250, t, 'lowpass'); tono(110*lento, 0.09, 'sawtooth', 0.25*vol, t, efx, 45); break;
    case 'escopeta': soplo(0.32, 1.1*vol, 2400*lento, 120, t, 'lowpass'); tono(70*lento, 0.25, 'sawtooth', 0.4*vol, t, efx, 32); break;
    case 'tirador': soplo(0.2, 1.0*vol, 3400*lento, 200, t, 'lowpass'); tono(90*lento, 0.16, 'sawtooth', 0.35*vol, t, efx, 40); break;
    case 'franco': soplo(0.35, 1.2*vol, 4200, 150, t, 'lowpass'); tono(60, 0.3, 'sawtooth', 0.45*vol, t, efx, 28); break;
    case 'silen': soplo(0.07, 0.35*vol, 1400*lento, 300, t, 'bandpass', 1.4); break;
    case 'enemigo': soplo(0.09, 0.4*vol, 2200, 300, t, 'lowpass', 1, efx, pan); break;
    case 'zumbido': soplo(0.08, 0.22*vol, 3000, 6000, t, 'highpass', 1, efx, pan); break;
    case 'boom': soplo(1.2, 1.3*vol, 900, 40, t, 'lowpass'); tono(48, 0.9, 'sine', 0.8*vol, t, efx, 26); break;
    case 'patada': soplo(0.25, 1.2*vol, 600, 60, t, 'lowpass'); tono(55, 0.3, 'sine', 0.8*vol, t, efx, 30); break;
    case 'minigun': tono(90, 0.6, 'sawtooth', 0.12*vol, t, efx, 260); break;
    default: tono(1100, 0.03, 'square', 0.06*vol, t);
  }
}
/* motores y rotor: una fuente en bucle que se actualiza; si deja de pedirse, se apaga sola */
function bucleSfx(n, vol, pan, rate){
  if(!AC || !G.sonido) return; const b = BANCO[n]; if(!b) return; let L = BUCLES[n]; const t = AC.currentTime; vol *= J.demo ? 0.2 : 1;
  if(!L){ const s = AC.createBufferSource(); s.buffer = b[0]; s.loop = true; const g = AC.createGain(); g.gain.value = 0.0001; s.connect(g); let fin = g;
    let p = null; if(AC.createStereoPanner){ p = AC.createStereoPanner(); g.connect(p); fin = p; } fin.connect(efx); s.start(); L = BUCLES[n] = {s, g, p}; }
  L.ult = t; L.g.gain.setTargetAtTime(vol, t, 0.08); if(L.p) L.p.pan.setTargetAtTime(lim(pan||0, -1, 1), t, 0.1); L.s.playbackRate.setTargetAtTime(rate||1, t, 0.15);
}
function vigilarBucles(){ if(!AC) return; const t = AC.currentTime;
  for(const n in BUCLES){ const L = BUCLES[n]; if(t - L.ult > 0.3 || !G.sonido){ L.g.gain.setTargetAtTime(0.0001, t, 0.1); try{ L.s.stop(t + 0.6); }catch(e){} delete BUCLES[n]; } } }
/* impacto en el mundo: suena donde pegó (más bajo y apagado de lejos) */
function sonidoImpacto(p, caja){
  if(!AC || J.demo) return; const cp = cam.position, d = cp.distanceTo(p); if(d > 70) return;
  const k = caja && caja.mat ? String(caja.mat) : '', met = /metal|chapa|conten|auto|veh|reja|acero/.test(k);
  const v = lim(1.1 - d/45, 0.12, 0.9); if(Math.random() < (d < 12 ? 1 : 0.6)) sfx(met ? 'metalico' : 'impacto', v*(met ? 0.7 : 1), lim((p.x - cp.x)/12, -0.8, 0.8));
}

/* ---------- música: capas que entran con la tensión ----------
   Se genera por pasos de semicorchea con un poco de adelanto. Si llegó la pista de Rezona del modo, suena ésa
   (en bucle, fundida) y el secuenciador se calla. */
const MUS = {t:0, i:0, on:false, pista:null, cambio:false, modo:null, fuente:null, fg:null, compas:0};
const nota = m => 440*Math.pow(2, (m - 69)/12);
function golpeM(nombre, t, vol, rate, dest){ const b = BANCO[nombre]; if(!b) return; const s = AC.createBufferSource(); s.buffer = b[0]; if(rate) s.playbackRate.value = rate; const g = AC.createGain(); g.gain.value = vol; s.connect(g); g.connect(dest||mus); s.start(t); }
function colchon(fs, t, dur, vol, corte){ const g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = corte; lp.Q.value = 0.5;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.6, dur*0.35)); g.gain.setValueAtTime(vol, t + dur*0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for(const f of fs) for(const d of [-9, 8]){ const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
  lp.connect(g); g.connect(mus); }
function bajoM(f, t, dur, vol, corte){ const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.Q.value = 5;
  lp.frequency.setValueAtTime(corte*2.2, t); lp.frequency.exponentialRampToValueAtTime(Math.max(60, corte*0.45), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); lp.connect(g); g.connect(mus); o.start(t); o.stop(t + dur + 0.05);
  const s = AC.createOscillator(), gs = AC.createGain(); s.frequency.value = f/2; gs.gain.setValueAtTime(vol*0.6, t); gs.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(gs); gs.connect(mus); s.start(t); s.stop(t + dur + 0.05); }
function pulso(f, t, dur, vol, tipo, eco){ const o = AC.createOscillator(), g = AC.createGain(); o.type = tipo||'triangle'; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(mus); if(eco) g.connect(musEco); o.start(t); o.stop(t + dur + 0.05); }
function campana(f, t, vol){ const c = AC.createOscillator(), m = AC.createOscillator(), mg = AC.createGain(), g = AC.createGain(); c.frequency.value = f; m.frequency.value = f*3.5; mg.gain.setValueAtTime(f*2, t); mg.gain.exponentialRampToValueAtTime(1, t + 1.5);
  m.connect(mg); mg.connect(c.frequency); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4); c.connect(g); g.connect(mus); g.connect(musEco); c.start(t); m.start(t); c.stop(t + 2.5); m.stop(t + 2.5); }
/* acordes (en semitonos sobre la raíz) de cada compás, de a cuatro */
const PROG = {menu:[[38,[0,3,7,10]],[34,[0,4,7,11]],[41,[0,4,7]],[36,[0,4,7,10]]], sigilo:[[38,[0,7,15]],[38,[0,7,15]],[34,[0,7,16]],[36,[0,7,14]]], combate:[[38,[0,3,7]],[38,[0,3,7]],[34,[0,4,7]],[36,[0,4,7]]]};
const OSTINATO = [0,0,12,0, 0,0,10,0, 0,0,7,0, 0,3,0,5];
function modoMusica(){ if(J.demo || J.modo === 'menu' || J.modo === 'res') return 'menu'; return J.mis && J.mis.tipo === 'franco' ? 'sigilo' : 'combate'; }
function pasoMusica(){
  if(!AC || !G.sonido || !MUS.on) return;
  vigilarBucles();
  if(J.modo==='pausa'){ MUS.t = AC.currentTime + 0.1; if(MUS.fg) MUS.fg.gain.setTargetAtTime(0.25, AC.currentTime, 0.2); return; }
  const modo = modoMusica();
  /* la pista de Rezona, si llegó */
  const rz = SONIDOS['mus_' + modo];
  if(MUS.pista !== modo || MUS.cambio){ MUS.cambio = false; MUS.pista = modo; const t = AC.currentTime;
    if(MUS.fuente){ const f = MUS.fuente, g = MUS.fg; g.gain.setTargetAtTime(0.0001, t, 0.5); setTimeout(()=>{ try{ f.stop(); }catch(e){} }, 2500); MUS.fuente = MUS.fg = null; }
    if(rz){ const s = AC.createBufferSource(); s.buffer = rz; s.loop = true; const g = AC.createGain(); g.gain.value = 0.0001; s.connect(g); g.connect(mus); s.start(); g.gain.setTargetAtTime(1.6, t, 0.6); MUS.fuente = s; MUS.fg = g; } }
  if(MUS.fg) MUS.fg.gain.setTargetAtTime(1.6, AC.currentTime, 0.3);
  if(MUS.fuente) return;
  if(!BANCO.bombo) return;
  const ten = J.demo ? 0.2 : (J.tension||0), bpm = modo === 'menu' ? 86 : modo === 'sigilo' ? 72 : 108 + ten*18, paso = 60/bpm/4;
  if(MUS.t < AC.currentTime - 0.3) MUS.t = AC.currentTime + 0.05;
  while(MUS.t < AC.currentTime + 0.25){
    const i = MUS.i, s = i%16, c = Math.floor(i/16)%4, t = MUS.t, [raiz, ac] = PROG[modo][c], R = nota(raiz);
    if(s === 0 && MUS.modo !== modo){ MUS.modo = modo; golpeM('platillo', t, 0.35); }
    if(modo === 'menu'){
      if(s === 0) colchon(ac.map(k=> nota(raiz + 24 + k)), t, paso*16.5, 0.06, 1100);
      if(s % 2 === 0) bajoM(R, t, paso*1.8, s % 8 === 6 ? 0.1 : 0.14, 380);
      if(s === 0 || s === 10) golpeM('bombo', t, 0.55);
      if(s === 8) golpeM('toc', t, 0.25);
      if(s % 4 === 2) golpeM('hat', t, 0.12);
      if(c >= 2) pulso(nota(raiz + 36 + ac[(s*3) % ac.length]), t, paso*1.2, 0.028, 'triangle', true);
      if(c === 3 && s === 12) golpeM('subida', t, 0.12, 2);
    } else if(modo === 'sigilo'){
      if(s === 0 && c % 2 === 0) colchon([nota(raiz + 12), nota(raiz + 19), nota(raiz + 24 + ac[2] - 12)], t, paso*33, 0.05, 700);
      if(s === 0 || s === 3) golpeM('bombo', t, s ? 0.3 : 0.45, 0.9);
      if(s % 4 === 0) golpeM('toc', t, 0.1);
      if(s === 10 && (c === 1 || c === 3)) campana(nota(raiz + 48 + ac[c % ac.length]), t, 0.05);
      if(ten > 0.4 && s % 2 === 0) bajoM(R, t, paso*1.5, 0.06 + ten*0.05, 300);
    } else {
      const capa = ten < 0.25 ? 0 : ten < 0.6 ? 1 : 2;
      bajoM(nota(raiz + OSTINATO[s]), t, paso*0.9, 0.07 + capa*0.03, 350 + capa*420);
      if(s % 2 === 0) golpeM('hat', t, s % 4 === 2 ? 0.16 : 0.09);
      if(capa >= 1 && s % 2 === 1) golpeM('hat', t, 0.05);
      if(s === 0 || (capa >= 1 && (s === 7 || s === 10)) || (capa === 2 && s === 14)) golpeM('bombo', t, 0.6);
      if(capa >= 1 && (s === 4 || s === 12)){ golpeM('caja', t, 0.35); if(capa === 2) golpeM('palmas', t, 0.2); }
      if(capa === 2 && (s === 0 || s === 3) ) colchon(ac.map(k=> nota(raiz + 24 + k)), t, paso*1.6, 0.05, 2400);
      if(capa === 2 && c === 3 && s >= 12) golpeM('tom', t, 0.3, 1.3 - (s - 12)*0.12);
      if(s === 0 && c === 0) colchon(ac.map(k=> nota(raiz + 12 + k)), t, paso*64, 0.035, 800);
    }
    MUS.t += paso; MUS.i++;
  }
}
setInterval(pasoMusica, 40);
/* cortinas de fin: lo de Rezona si llegó; si no, bronces y timbales sintetizados */
function cortina(gano){
  if(!AC || !G.sonido) return; const rz = SONIDOS[gano ? 'jingle_victoria' : 'jingle_derrota'], t = AC.currentTime + 0.05;
  if(rz){ const s = AC.createBufferSource(); s.buffer = rz; const g = AC.createGain(); g.gain.value = 1.4; s.connect(g); g.connect(mus); s.start(t); return; }
  if(gano){ [[50,[0,4,7]],[55,[0,4,7]],[57,[0,4,7]],[62,[0,4,7,12]]].forEach(([r, ac], k)=>{ colchon(ac.map(x=> nota(r + x)), t + k*0.34, k === 3 ? 1.8 : 0.36, 0.1, 2600); golpeM('tom', t + k*0.34, 0.5, 0.8); });
    golpeM('platillo', t + 1.02, 0.5); }
  else { [[50,[0,3,7]],[46,[0,4,7]],[43,[0,3,7]]].forEach(([r, ac], k)=>{ colchon(ac.map(x=> nota(r + x)), t + k*0.45, k === 2 ? 2 : 0.46, 0.09, 900); }); golpeM('bombo', t + 0.9, 0.7, 0.7); golpeM('tom', t + 0.9, 0.5, 0.6); }
}

/* ---------- voces de radio ----------
   Lo de Rezona (v_<frase>_<idioma>) por la radio; si no llegó, la voz del sistema en el idioma elegido (sólo
   si es local: sin red no hay otra). Nunca más de una a la vez y con un respiro entre frases. */
const FRASES = {
  es:{posicion:'En posición.', brecha:'¡Brecha, brecha!', despejado:'¡Despejado!', contacto:'¡Contacto!', tomaron:'¡Tomaron un rehén!', coloso:'¡Blindado pesado!', helicoptero:'¡Helicóptero!',
    granada:'¡Cegadora!', recargando:'¡Recargando!', avanzamos:'Avanzamos.', cumplida:'Objetivo cumplido. Buen trabajo.', fallida:'Misión fallida.'},
  en:{posicion:'In position.', brecha:'Breach, breach!', despejado:'Clear!', contacto:'Contact!', tomaron:'They took a hostage!', coloso:'Heavy armor!', helicoptero:'Helicopter!',
    granada:'Flashbang out!', recargando:'Reloading!', avanzamos:'Moving up.', cumplida:'Objective complete. Good work.', fallida:'Mission failed.'},
  pt:{posicion:'Em posição.', brecha:'Brecha, brecha!', despejado:'Limpo!', contacto:'Contato!', tomaron:'Pegaram um refém!', coloso:'Blindado pesado!', helicoptero:'Helicóptero!',
    granada:'Granada de luz!', recargando:'Recarregando!', avanzamos:'Avançando.', cumplida:'Objetivo cumprido. Bom trabalho.', fallida:'Missão fracassada.'},
};
const VOZ = {ult:-9, n:0};
function vozLocal(lang){ const ss = window.speechSynthesis; if(!ss || !window.SpeechSynthesisUtterance) return null;
  const vs = ss.getVoices ? ss.getVoices() : []; return vs.find(v=> v.localService && v.lang && v.lang.toLowerCase().startsWith(lang)) || null; }
function vozDesbloquear(){ try{ const ss = window.speechSynthesis; if(ss && window.SpeechSynthesisUtterance){ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; ss.speak(u); } }catch(e){} }
function voz(k, fuerza){
  if(!AC || !G.sonido || J.demo) return; const t = AC.currentTime; if(!fuerza && t - VOZ.ult < 2.4) return;
  const L = G.idioma || 'es', rz = SONIDOS['v_' + k + '_' + L];
  if(rz){ VOZ.ult = t; tocarRadio(rz); VOZ.n++; return; }
  const v = vozLocal(L), txt = (FRASES[L]||FRASES.es)[k]; if(!v || !txt) return;
  try{ const ss = window.speechSynthesis; ss.cancel(); const u = new SpeechSynthesisUtterance(txt); u.voice = v; u.lang = v.lang; u.rate = 1.12; u.pitch = 0.82; u.volume = 0.85;
    sfx('radio', 0.6); ss.speak(u); VOZ.ult = t; VOZ.n++; }catch(e){}
}
function tocarRadio(buf){ sfx('radio', 0.5); const s = AC.createBufferSource(); s.buffer = buf; const g = AC.createGain(); g.gain.value = 1; s.connect(g); g.connect(radioB); s.start(AC.currentTime + 0.1); }
