
/* ====================== sonido ======================
   Lo generado con Rezona si llegó (SONIDOS); si no, muestras sintetizadas por capas al abrir el audio (BANCO).
   La turbina, el posquemador, el viento y el cañón son bucles que se mezclan con el acelerador y la velocidad. */
let AC=null, amo, mus, efx, comp, rev=null, revG=null, radioB=null, musEco=null;
const BANCO = {}, BUCLES = {};
let VOCES_ACT = 0;
function audioIni(){
  if(AC){ if(AC.state==='suspended') AC.resume(); return; }
  try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
  amo = AC.createGain(); amo.gain.value = G.sonido ? 0.9 : 0; amo.connect(AC.destination);
  comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.2; comp.connect(amo);
  mus = AC.createGain(); mus.gain.value = 0.2; mus.connect(comp);
  efx = AC.createGain(); efx.gain.value = 0.85; efx.connect(comp);
  rev = AC.createConvolver(); revG = AC.createGain(); revG.gain.value = 0.5; rev.connect(revG); revG.connect(comp);
  musEco = AC.createDelay(1.5); const fb = AC.createGain(); fb.gain.value = 0.32; const ef = AC.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 2400;
  musEco.connect(ef); ef.connect(fb); fb.connect(musEco); ef.connect(mus);
  radioB = AC.createBiquadFilter(); radioB.type = 'bandpass'; radioB.frequency.value = 1500; radioB.Q.value = 0.8;
  const sat = AC.createWaveShaper(), cur = new Float32Array(256); for(let i=0;i<256;i++){ const x = i/128 - 1; cur[i] = Math.tanh(x*3)/Math.tanh(3); } sat.curve = cur;
  const rg = AC.createGain(); rg.gain.value = 1.1; radioB.connect(sat); sat.connect(rg); rg.connect(comp);
  try{ rev.buffer = respuesta({dur:3.2, dec:0.8, brillo:0.2, difuso:0.3, temprano:[[0.25,0.35],[0.6,0.2]]}, 91); }catch(e){}
  hornearBanco(); if(typeof decAudios === 'function') decAudios(); vozDesbloquear();
}
function tono(f, dur, tipo, vol, t, dest, f2){
  if(!AC) return; t = t||AC.currentTime; const o = AC.createOscillator(), g = AC.createGain();
  o.type = tipo||'square'; o.frequency.setValueAtTime(f, t); if(f2) o.frequency.exponentialRampToValueAtTime(Math.max(20,f2), t+dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t+dur); o.connect(g); g.connect(dest||efx); o.start(t); o.stop(t+dur+0.03);
}
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
function cerrarBucle(out){ /* sin clic en la costura: el principio se funde con lo que sigue al final */
  const n = out.length, f = Math.round(n*0.04); for(let i=0;i<f;i++){ const a = i/f; out[i] = out[i]*a + out[n - f + i]*(1 - a); }
  const c = new Float32Array(n - f); c.set(out.subarray(0, n - f)); return cerrar(c, 1.2, 0.8);
}
function respuesta(o, seed){
  const sr = AC.sampleRate, n = Math.round(o.dur*sr), b = AC.createBuffer(2, n, sr);
  for(let c=0;c<2;c++){ const d = b.getChannelData(c), r = rnd32(seed + c*999); let lp = 0;
    for(let i=0;i<n;i++){ const t = i/sr, k = Math.exp(-t/o.dec)*(o.difuso===undefined ? 1 : o.difuso); const a = Math.min(1, o.brillo*Math.exp(-t/(o.dec*1.5)) + 0.02); lp += (r()*k - lp)*a; d[i] = lp*Math.min(1, t/0.004); }
    for(const [tt, g] of o.temprano){ const i = Math.round((tt*(c ? 1.07 : 1))*sr); if(i < n) for(let k=0;k<Math.round(0.003*sr) && i + k < n;k++) d[i + k] += g*r()*Math.exp(-k/sr/0.0008)*3; } }
  return b;
}

const SINTE = {
  /* bucles de un segundo con ciclos enteros: se cosen solos */
  motor(r){ const sr = AC.sampleRate, n = sr, out = new Float32Array(n), x = filtrar(ruidoArr(n, r), 'lp', 320, 0.7), m = filtrar(ruidoArr(n, r), 'bp', 900, 0.8);
    for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*0.9 + m[i]*0.35 + (Math.sin(2*Math.PI*2200*t) + 0.5*Math.sin(2*Math.PI*4400*t + 1) + 0.25*Math.sin(2*Math.PI*3300*t))*0.05 + Math.sin(2*Math.PI*57*t)*0.18; }
    return cerrarBucle(out); },
  posq(r){ const sr = AC.sampleRate, n = sr, out = new Float32Array(n), x = filtrar(ruidoArr(n, r), 'lp', 700, 0.6), g = filtrar(ruidoArr(n, r), 'lp', 90, 0.9);
    for(let i=0;i<n;i++){ const t = i/sr, crep = 1 + 0.35*Math.sin(2*Math.PI*17*t)*Math.sin(2*Math.PI*3*t); out[i] = x[i]*crep*1.1 + g[i]*1.6; }
    for(let k=0;k<90;k++) rafaga(out, Math.floor(Math.abs(r())*(n - 800)), 0.006, 0.25, 1500 + Math.abs(r())*2500, 1.2, r);
    return cerrarBucle(out); },
  viento(r){ const sr = AC.sampleRate, n = sr, out = new Float32Array(n), a = filtrar(ruidoArr(n, r), 'bp', 600, 0.5), b = filtrar(ruidoArr(n, r), 'hp', 3000, 0.7);
    for(let i=0;i<n;i++){ const t = i/sr; out[i] = a[i]*(0.8 + 0.2*Math.sin(2*Math.PI*2*t)) + b[i]*0.25; } return cerrarBucle(out); },
  /* cañón rotativo: 50 disparos por segundo, un segundo exacto */
  canon(r){ const sr = AC.sampleRate, n = sr, out = new Float32Array(n), per = Math.round(sr/50);
    for(let k=0;k<50;k++){ const i0 = k*per; rafaga(out, i0, 0.012, 0.9, 1400 + Math.abs(r())*400, 0.9, r); let fs = 0;
      for(let i=0;i<per && i0 + i < n;i++){ const t = i/sr; fs += 2*Math.PI*(90 + 60*Math.exp(-t/0.004))/sr; out[i0 + i] += Math.sin(fs)*Math.exp(-t/0.012)*0.7; } }
    const lp = filtrar(out, 'lp', 3200, 0.7); return cerrarBucle(lp); },
  misil(r){ const sr = AC.sampleRate, n = Math.round(2.2*sr), x = filtrar(ruidoArr(n, r), 'bp', t=> 400 + 1800*Math.exp(-t/0.9), 0.8), out = new Float32Array(n);
    for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*Math.min(1, t/0.02)*Math.exp(-t/1.1)*1.5; } rafaga(out, 0, 0.05, 1.2, 700, 0.7, r); metal(out, 0, 180, 0.4, 0.05, [[1,1]]); return cerrar(out, 2, 0.9); },
  boom(r){ const sr = AC.sampleRate, n = Math.round(2.4*sr), ns = ruidoArr(n, r), x = filtrar(ns, 'lp', t=> 90 + 2800*Math.exp(-t/0.15), 0.8), out = new Float32Array(n); let fs = 0;
    for(let i=0;i<n;i++){ const t = i/sr, ata = Math.min(1, t/0.003); fs += 2*Math.PI*(24 + 45*Math.exp(-t/0.15))/sr; out[i] = (x[i]*Math.exp(-t/0.5)*1.6 + Math.sin(fs)*Math.exp(-t/0.6)*1.1)*ata; }
    for(let k=0;k<30;k++){ const t0 = 0.08 + Math.pow(Math.abs(r()), 1.4)*1.6; rafaga(out, Math.round(t0*sr), 0.008 + Math.abs(r())*0.012, 0.22*(1 - t0/1.8), 1200 + Math.abs(r())*3000, 1.2, r); }
    return cerrar(out, 3, 0.95); },
  impacto(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.25*sr)); rafaga(out, 0, 0.006, 0.9, 4000, 0.9, r);
    metal(out, 0, 1500 + Math.abs(r())*900, 0.5, 0.05, [[1,1],[2.76,0.5],[5.4,0.25]]); return cerrar(out, 1.4, 0.7); },
  bengala(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(1.2*sr)); for(let k=0;k<6;k++){ const i0 = Math.round(k*0.09*sr); rafaga(out, i0, 0.03, 0.8, 900, 0.8, r); rafaga(out, i0, 0.25, 0.25, 3000, 0.6, r); }
    return cerrar(out, 1.6, 0.75); },
  pasada(r){ const sr = AC.sampleRate, n = Math.round(1.8*sr), x = filtrar(ruidoArr(n, r), 'bp', t=> 2600*Math.exp(-t/0.5) + 300, 0.7), out = new Float32Array(n);
    for(let i=0;i<n;i++){ const t = i/sr, e = Math.exp(-Math.pow((t - 0.7)/0.35, 2)); out[i] = x[i]*e*1.4; } return cerrar(out, 1.6, 0.85); },
  trueno(r){ const sr = AC.sampleRate, n = Math.round(3.5*sr), x = filtrar(ruidoArr(n, r), 'lp', t=> 60 + 900*Math.exp(-t/0.3), 0.7), out = new Float32Array(n);
    for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*Math.min(1, t/0.02)*Math.exp(-t/1.2)*(1 + 0.6*Math.sin(2*Math.PI*1.3*t)); } return cerrar(out, 2, 0.9); },
  boton(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.06*sr)); rafaga(out, 0, 0.003, 0.8, 3600, 1.4, r); metal(out, 0, 1900, 0.3, 0.008, [[1,1],[2.3,0.3]]); return cerrar(out, 1.1, 0.7); },
  deslizar(r){ const sr = AC.sampleRate, n = Math.round(0.35*sr), x = filtrar(ruidoArr(n, r), 'bp', t=> 400 + 5000*t/0.35, 1.5), out = new Float32Array(n);
    for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*Math.sin(Math.PI*t/0.35); } return cerrar(out, 1.3, 0.55); },
  moneda(r){ const sr = AC.sampleRate, out = new Float32Array(Math.round(0.5*sr)); rafaga(out, 0, 0.01, 0.9, 900, 0.9, r); metal(out, Math.round(0.06*sr), 2640, 0.35, 0.12, [[1,1],[1.5,0.6],[2.76,0.3]]); return cerrar(out, 1.2, 0.75); },
  radio(r){ const sr = AC.sampleRate, n = Math.round(0.16*sr), x = filtrar(ruidoArr(n, r), 'bp', 2200, 1.5), out = new Float32Array(n);
    for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*(t < 0.1 ? 0.7 : Math.exp(-(t - 0.1)/0.01)); } metal(out, Math.round(0.11*sr), 1200, 0.3, 0.02, [[1,1]]); return cerrar(out, 2, 0.6); },
  aviso(r){ const sr = AC.sampleRate, n = Math.round(0.26*sr), out = new Float32Array(n); for(const [t0, f] of [[0, 880],[0.12, 1320]]){ const i0 = Math.round(t0*sr);
      for(let i=i0;i<Math.min(n, i0 + 0.1*sr);i++){ const t = (i - i0)/sr; out[i] += (Math.sin(2*Math.PI*f*t) + 0.3*Math.sin(2*Math.PI*f*3*t))*Math.min(1, t/0.004)*Math.exp(-t/0.06); } } return cerrar(out, 1.2, 0.6); },
  bombo(r){ const sr = AC.sampleRate, n = Math.round(0.45*sr), out = new Float32Array(n); let fs = 0; for(let i=0;i<n;i++){ const t = i/sr; fs += 2*Math.PI*(44 + 110*Math.exp(-t/0.035))/sr; out[i] = Math.sin(fs)*Math.exp(-t/0.16); }
    rafaga(out, 0, 0.004, 0.5, 3000, 1, r); return cerrar(out, 2.2, 0.95); },
  caja(r){ const sr = AC.sampleRate, n = Math.round(0.25*sr), x = filtrar(ruidoArr(n, r), 'bp', 2400, 0.6), out = new Float32Array(n); let fs = 0;
    for(let i=0;i<n;i++){ const t = i/sr; fs += 2*Math.PI*(185 + 60*Math.exp(-t/0.01))/sr; out[i] = x[i]*Math.exp(-t/0.07)*1.3 + Math.sin(fs)*Math.exp(-t/0.05)*0.7; } return cerrar(out, 2, 0.85); },
  hat(r){ const sr = AC.sampleRate, n = Math.round(0.05*sr), x = filtrar(ruidoArr(n, r), 'hp', 7500, 0.8), out = new Float32Array(n); for(let i=0;i<n;i++) out[i] = x[i]*Math.exp(-i/sr/0.012); return cerrar(out, 1.2, 0.6); },
  tom(r){ const sr = AC.sampleRate, n = Math.round(0.6*sr), out = new Float32Array(n); let fs = 0; for(let i=0;i<n;i++){ const t = i/sr; fs += 2*Math.PI*(72 + 60*Math.exp(-t/0.06))/sr; out[i] = Math.sin(fs)*Math.exp(-t/0.22); }
    rafaga(out, 0, 0.01, 0.5, 900, 0.8, r); return cerrar(out, 1.8, 0.9); },
  platillo(r){ const sr = AC.sampleRate, n = Math.round(1.6*sr), x = filtrar(ruidoArr(n, r), 'hp', 4200, 0.6), out = new Float32Array(n); for(let i=0;i<n;i++) out[i] = x[i]*Math.exp(-i/sr/0.5)*Math.min(1, i/sr/0.004); return cerrar(out, 1.3, 0.6); },
  subida(r){ const sr = AC.sampleRate, n = Math.round(2*sr), x = filtrar(ruidoArr(n, r), 'bp', t=> 300 + 5000*Math.pow(t/2, 2), 2), out = new Float32Array(n); for(let i=0;i<n;i++){ const t = i/sr; out[i] = x[i]*Math.pow(t/2, 1.5); } return cerrar(out, 1.3, 0.6); },
};
function hornearBanco(){
  const tareas = []; for(const k in SINTE) for(let v=0;v<(k==='impacto' ? 3 : 1);v++) tareas.push([k, ()=> SINTE[k](rnd32(5000 + v*131 + k.length*7))]);
  const t0 = performance.now(); let i = 0;
  const uno = ()=>{ const fin = performance.now() + 8;
    while(i < tareas.length && performance.now() < fin){ const [k, f] = tareas[i++];
      try{ const a = f(), b = AC.createBuffer(1, a.length, AC.sampleRate); b.getChannelData(0).set(a); (BANCO[k] = BANCO[k] || []).push(b); }catch(e){ ASSET.fallas.push('sonido ' + k + ': ' + e.message); } }
    if(i < tareas.length) setTimeout(uno, 0); else BANCO.__ms = Math.round(performance.now() - t0); };
  setTimeout(uno, 0);
}
function tocar(buf, vol, pan, rate, envio, corte){
  if(VOCES_ACT > 28 && vol < 0.5) return null;
  const s = AC.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate||1;
  let n = s; if(corte){ const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = corte; s.connect(f); n = f; }
  const g = AC.createGain(); g.gain.value = vol; n.connect(g); let fin = g;
  if(pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = lim(pan,-1,1); g.connect(p); fin = p; }
  fin.connect(efx); if(envio && rev){ const e = AC.createGain(); e.gain.value = envio; fin.connect(e); e.connect(rev); }
  VOCES_ACT++; s.onended = ()=> VOCES_ACT--; s.start(); return s;
}
const REZ_DE = {misil:'misil_lanza', boom:'explosion_aire', impacto:'impacto_metal', pasada:'paso_jet', bengala:'bengalas'};
/* el cañón de Rezona es una ráfaga suelta de 1,2 s: como bucle se oiría el corte; el bucle queda sintetizado */
const REZ_BUCLE = {motor:'motor_jet', posq:'posquemador', viento:'viento'};
const ENVIO = {misil:0.3, boom:0.6, impacto:0.1, pasada:0.3, bengala:0.2, trueno:0.7};
const ultSfx = {};
function sfx(n, vol, pan, rate){
  if(!AC || !G.sonido) return; vol = (vol===undefined ? 1 : vol)*(J.demo ? 0.25 : 1); const t = AC.currentTime;
  if(ultSfx[n] && t - ultSfx[n] < 0.03) return; ultSfx[n] = t;
  const rz = REZ_DE[n] && SONIDOS[REZ_DE[n]]; if(rz){ tocar(rz, vol, pan, (rate||1)*(1 + (Math.random() - 0.5)*0.06), ENVIO[n]); return; }
  const b = BANCO[n]; if(b && b.length){ tocar(b[Math.floor(Math.random()*b.length)], vol, pan, (rate||1)*(1 + (Math.random() - 0.5)*0.06), ENVIO[n]); return; }
  tono(900, 0.04, 'square', 0.05*vol, t);
}
/* bucles que se actualizan cada cuadro; si dejan de pedirse, se apagan solos */
function bucleSfx(n, vol, pan, rate){
  if(!AC) return; const b = SONIDOS[REZ_BUCLE[n]] ? [SONIDOS[REZ_BUCLE[n]]] : BANCO[n]; if(!b) return; let L = BUCLES[n]; const t = AC.currentTime;
  vol *= (G.sonido ? 1 : 0)*(J.demo ? 0.3 : 1);
  if(!L){ const s = AC.createBufferSource(); s.buffer = b[0]; s.loop = true; const g = AC.createGain(); g.gain.value = 0.0001; s.connect(g); let fin = g;
    let p = null; if(AC.createStereoPanner){ p = AC.createStereoPanner(); g.connect(p); fin = p; } fin.connect(efx); s.start(); L = BUCLES[n] = {s, g, p}; }
  L.ult = t; L.g.gain.setTargetAtTime(Math.max(0.0001, vol), t, 0.06); if(L.p) L.p.pan.setTargetAtTime(lim(pan||0, -1, 1), t, 0.1); L.s.playbackRate.setTargetAtTime(rate||1, t, 0.1);
}
function vigilarBucles(){ if(!AC) return; const t = AC.currentTime;
  for(const n in BUCLES){ const L = BUCLES[n]; if(t - L.ult > 0.3){ L.g.gain.setTargetAtTime(0.0001, t, 0.08); try{ L.s.stop(t + 0.5); }catch(e){} delete BUCLES[n]; } } }
/* tonos de cabina: buscando (gruñido intermitente), fijado (continuo), alarma de misil (pitidos rápidos) */
const CABINA = {osc:null, g:null, modo:null};
function tonoCabina(modo){
  if(!AC) return; if(CABINA.modo === modo) return; CABINA.modo = modo; const t = AC.currentTime;
  if(CABINA.osc){ const o = CABINA.osc, g = CABINA.g; g.gain.setTargetAtTime(0.0001, t, 0.02); setTimeout(()=>{ try{ o.stop(); }catch(e){} }, 200); CABINA.osc = null; }
  if(!modo || !G.sonido || J.demo) return;
  /* la alarma de misil de Rezona viene como bucle cosido */
  if(modo === 'alarma' && SONIDOS.alarma_misil){ const b = AC.createBufferSource(), g = AC.createGain(); b.buffer = SONIDOS.alarma_misil; b.loop = true; g.gain.value = 0.0001; g.gain.setTargetAtTime(0.8, t, 0.02);
    b.connect(g); g.connect(efx); b.start(); CABINA.osc = {stop(){ b.stop(); }}; CABINA.g = g; return; }
  const o = AC.createOscillator(), g = AC.createGain(), lfo = AC.createOscillator(), lg = AC.createGain(); o.type = modo === 'alarma' ? 'square' : 'sine';
  o.frequency.value = modo === 'busca' ? 980 : modo === 'fijado' ? 1650 : 1320; g.gain.value = 0;
  lfo.type = 'square'; lfo.frequency.value = modo === 'busca' ? 4 : modo === 'alarma' ? 9 : 0.01; lg.gain.value = modo === 'fijado' ? 0 : 0.045;
  const base = AC.createConstantSource ? AC.createConstantSource() : null;
  lfo.connect(lg); lg.connect(g.gain); if(base){ base.offset.value = modo === 'fijado' ? 0.07 : 0.045; base.connect(g.gain); base.start(); }
  o.connect(g); g.connect(efx); o.start(); lfo.start(); CABINA.osc = {stop(){ o.stop(); lfo.stop(); if(base) base.stop(); }}; CABINA.g = g;
}
/* ---------- música por capas ---------- */
const MUS = {t:0, i:0, on:false, pista:null, cambio:false, modo:null, fuente:null, fg:null};
const nota = m => 440*Math.pow(2, (m - 69)/12);
function golpeM(nombre, t, vol, rate){ const b = BANCO[nombre]; if(!b) return; const s = AC.createBufferSource(); s.buffer = b[0]; if(rate) s.playbackRate.value = rate; const g = AC.createGain(); g.gain.value = vol; s.connect(g); g.connect(mus); s.start(t); }
function colchon(fs, t, dur, vol, corte){ const g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = corte; lp.Q.value = 0.5;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.6, dur*0.35)); g.gain.setValueAtTime(vol, t + dur*0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for(const f of fs) for(const d of [-9, 8]){ const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); }
  lp.connect(g); g.connect(mus); }
function bajoM(f, t, dur, vol, corte){ const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.Q.value = 5;
  lp.frequency.setValueAtTime(corte*2.2, t); lp.frequency.exponentialRampToValueAtTime(Math.max(60, corte*0.45), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); lp.connect(g); g.connect(mus); o.start(t); o.stop(t + dur + 0.05); }
function pulso(f, t, dur, vol){ const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(mus); g.connect(musEco); o.start(t); o.stop(t + dur + 0.05); }
/* heroica: re menor con subidas a si bemol y do */
const PROG = {menu:[[38,[0,3,7,10]],[34,[0,4,7,11]],[41,[0,4,7]],[36,[0,4,7,10]]], combate:[[38,[0,3,7]],[38,[0,3,7]],[34,[0,4,7]],[36,[0,4,7]]]};
const OSTINATO = [0,0,12,0, 0,0,10,0, 0,0,7,0, 0,3,0,5];
const modoMusica = ()=> (J.demo || J.modo !== 'juego') ? 'menu' : 'combate';
function pasoMusica(){
  if(!AC || !G.sonido || !MUS.on) return; vigilarBucles();
  if(J.modo==='pausa'){ MUS.t = AC.currentTime + 0.1; return; }
  const modo = modoMusica(), rz = SONIDOS['mus_' + modo];
  if(MUS.pista !== modo || MUS.cambio){ MUS.cambio = false; MUS.pista = modo; const t = AC.currentTime;
    if(MUS.fuente){ const f = MUS.fuente; MUS.fg.gain.setTargetAtTime(0.0001, t, 0.5); setTimeout(()=>{ try{ f.stop(); }catch(e){} }, 2500); MUS.fuente = MUS.fg = null; }
    if(rz){ const s = AC.createBufferSource(); s.buffer = rz; s.loop = true; const g = AC.createGain(); g.gain.value = 0.0001; s.connect(g); g.connect(mus); s.start(); g.gain.setTargetAtTime(1.6, t, 0.6); MUS.fuente = s; MUS.fg = g; } }
  if(MUS.fuente || !BANCO.bombo) return;
  const ten = J.demo ? 0.25 : (J.tension||0), bpm = modo === 'menu' ? 92 : 118 + ten*14, paso = 60/bpm/4;
  if(MUS.t < AC.currentTime - 0.3) MUS.t = AC.currentTime + 0.05;
  while(MUS.t < AC.currentTime + 0.25){
    const i = MUS.i, s = i%16, c = Math.floor(i/16)%4, t = MUS.t, [raiz, ac] = PROG[modo][c], R = nota(raiz);
    if(s === 0 && MUS.modo !== modo){ MUS.modo = modo; golpeM('platillo', t, 0.35); }
    if(modo === 'menu'){
      if(s === 0) colchon(ac.map(k=> nota(raiz + 24 + k)), t, paso*16.5, 0.06, 1400);
      if(s % 2 === 0) bajoM(R, t, paso*1.8, s % 8 === 6 ? 0.1 : 0.14, 420);
      if(s === 0 || s === 10) golpeM('bombo', t, 0.55); if(s === 4 || s === 12) golpeM('caja', t, 0.18);
      if(s % 2 === 0) golpeM('hat', t, 0.08);
      if(c >= 2) pulso(nota(raiz + 36 + ac[(s*3) % ac.length]), t, paso*1.2, 0.028);
      if(c === 3 && s === 12) golpeM('subida', t, 0.12, 2);
    } else {
      const capa = ten < 0.3 ? 0 : ten < 0.65 ? 1 : 2;
      bajoM(nota(raiz + OSTINATO[s]), t, paso*0.9, 0.07 + capa*0.03, 380 + capa*420);
      if(s % 2 === 0) golpeM('hat', t, s % 4 === 2 ? 0.15 : 0.08);
      if(s === 0 || (capa >= 1 && (s === 7 || s === 10)) || (capa === 2 && s === 14)) golpeM('bombo', t, 0.6);
      if(capa >= 1 && (s === 4 || s === 12)) golpeM('caja', t, 0.35);
      if(capa === 2 && (s === 0 || s === 3)) colchon(ac.map(k=> nota(raiz + 24 + k)), t, paso*1.6, 0.05, 2600);
      if(capa === 2 && c === 3 && s >= 12) golpeM('tom', t, 0.3, 1.3 - (s - 12)*0.12);
      if(s === 0 && c === 0) colchon(ac.map(k=> nota(raiz + 12 + k)), t, paso*64, 0.035, 900);
    }
    MUS.t += paso; MUS.i++;
  }
}
setInterval(pasoMusica, 40);
function cortina(gano){
  if(!AC || !G.sonido) return; const rz = SONIDOS[gano ? 'mus_victoria' : 'mus_derrota'], t = AC.currentTime + 0.05;
  if(rz){ const s = AC.createBufferSource(); s.buffer = rz; const g = AC.createGain(); g.gain.value = 1.4; s.connect(g); g.connect(mus); s.start(t); return; }
  if(gano){ [[50,[0,4,7]],[55,[0,4,7]],[57,[0,4,7]],[62,[0,4,7,12]]].forEach(([r, ac], k)=>{ colchon(ac.map(x=> nota(r + x)), t + k*0.34, k === 3 ? 1.8 : 0.36, 0.1, 2800); golpeM('tom', t + k*0.34, 0.5, 0.8); }); golpeM('platillo', t + 1.02, 0.5); }
  else { [[50,[0,3,7]],[46,[0,4,7]],[43,[0,3,7]]].forEach(([r, ac], k)=> colchon(ac.map(x=> nota(r + x)), t + k*0.45, k === 2 ? 2 : 0.46, 0.09, 900)); golpeM('bombo', t + 0.9, 0.7, 0.7); }
}
/* ---------- voces de radio: lo de Rezona o la voz del sistema (sólo si es local) ---------- */
const FRASES = {
  es:{misil:'¡Misil, misil!', fox:'¡Fox dos!', abatido:'¡Blanco abatido!', cola:'¡Tenés uno en la cola!', cumplida:'Misión cumplida. Volvé a casa.', fallida:'Misión fallida.',
    bengalas:'¡Bengalas!', caido:'¡Perdimos a uno!', oleada:'Más contactos en el radar.', portaaviones:'¡El portaaviones está bajo ataque!', as:'Ahí viene el as. Cuidado.'},
  en:{misil:'Missile, missile!', fox:'Fox two!', abatido:'Splash one!', cola:'Bandit on your six!', cumplida:'Mission complete. Come on home.', fallida:'Mission failed.',
    bengalas:'Flares!', caido:'We lost one!', oleada:'More contacts on radar.', portaaviones:'The carrier is under attack!', as:'Here comes the ace. Watch out.'},
  pt:{misil:'Míssil, míssil!', fox:'Fox dois!', abatido:'Alvo abatido!', cola:'Tem um na sua cauda!', cumplida:'Missão cumprida. Volte para casa.', fallida:'Missão fracassada.',
    bengalas:'Flares!', caido:'Perdemos um!', oleada:'Mais contatos no radar.', portaaviones:'O porta-aviões está sob ataque!', as:'Lá vem o ás. Cuidado.'},
};
const VOZ = {ult:-9, n:0};
function vozLocal(lang){ const ss = window.speechSynthesis; if(!ss || !window.SpeechSynthesisUtterance) return null; const vs = ss.getVoices ? ss.getVoices() : [];
  return vs.find(v=> v.localService && v.lang && v.lang.toLowerCase().startsWith(lang)) || null; }
function vozDesbloquear(){ try{ const ss = window.speechSynthesis; if(ss && window.SpeechSynthesisUtterance){ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; ss.speak(u); } }catch(e){} }
function voz(k, fuerza){
  if(!AC || !G.sonido || J.demo) return; const t = AC.currentTime; if(!fuerza && t - VOZ.ult < 2.6) return;
  const L = G.idioma || 'es', rz = SONIDOS['radio_' + (k === 'fox' ? 'fox2' : k) + '_' + L];
  if(rz){ VOZ.ult = t; sfx('radio', 0.5); const s = AC.createBufferSource(); s.buffer = rz; s.connect(radioB); s.start(AC.currentTime + 0.1); VOZ.n++; return; }
  const v = vozLocal(L), txt = (FRASES[L]||FRASES.es)[k]; if(!v || !txt) return;
  try{ const ss = window.speechSynthesis; ss.cancel(); const u = new SpeechSynthesisUtterance(txt); u.voice = v; u.lang = v.lang; u.rate = 1.12; u.pitch = 0.85; u.volume = 0.85; sfx('radio', 0.6); ss.speak(u); VOZ.ult = t; VOZ.n++; }catch(e){}
}
