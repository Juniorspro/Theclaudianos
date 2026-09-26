/* ================================================================ sonido
   NO LO DEJES ENTRAR — todo el sonido del juego, sintetizado con Web Audio: sin archivos y sin red.
   Cómo está armado:
   · Los efectos sueltos y los bucles se HORNEAN en JS, muestra por muestra, casi todos a media
     frecuencia (el parlante de un celular no da más), de a uno por tic apenas arranca, o la primera
     vez que se piden: ruido filtrado, modos resonantes (madera, metal,
     vidrio, campanas), trenes de impulsos por resonadores (crujidos, bisagras, uñas) y una sierra
     por tres formantes (respiraciones, gruñidos, gritos). Cada uno se normaliza a su pico, así los
     niveles no dependen de la suerte, y después cada disparo es UNA sola fuente.
   · Los bucles se hornean circulares: lo que se pasa del final entra por el principio y los
     filtros corren dos vueltas, así no hay costura.
   · Buses música / efectos / ambiente / voces → pasabajos del placard → compresor → recorte suave
     (nunca pasa de 0,95) → destino. El susto va por fuera del compresor: tiene que pegar.
   · Dos salas por convolución hechas por código: la casa chica (1,2 s) y afuera (larga y oscura).
   Ninguna llamada de acá le tira una excepción al juego: todo va envuelto y anota en ERR. */
const SON = (() => {
  const ERR = [], FALTAN = new Set();
  const err = e => { try { if(ERR.length < 50) ERR.push(String(e && e.stack || e)); } catch(_){} };
  const lim = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a)*k;
  const azar = (a, b) => a + Math.random()*(b - a);
  const elegir = l => l[Math.floor(Math.random()*l.length)];
  const suv = k => { k = lim(k, 0, 1); return k*k*(3 - 2*k); };
  const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
  const mtof = m => 440*Math.pow(2, (m - 69)/12);
  const TAU = Math.PI*2;
  const ahora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())/1000;

  let C = null, sinAudio = false, SR = 44100, M = null, RU = null, reloj = 0;
  let vivas = 0, descartados = 0;                 /* fuentes vivas (las que suenan o están por sonar) */
  const TOPE = 40;                                 /* nunca más de esto sonando a la vez */
  const VOCES = [];                                /* efectos sueltos vivos, del más viejo al más nuevo */
  const BUC = new Map();                           /* bucles por id */
  const bPed = new Map();                          /* bucles pedidos antes de haber contexto */
  const BUF = {};                                  /* lo horneado: nombre → [variantes] */
  let volMus = 1, volFx = 1, pausado = false, kAmort = 0, kTension = 0, kCorazon = 0;
  let musPed = null, hayMusPed = false;
  const OY = {x: 0, y: 1.6, z: 0, dx: 0, dy: 0, dz: -1, vx: 0, vy: 0, vz: 0, t: 0};
  const AMB = {afuera: 0, noche: 0, grillos: 0, viento: 0, planta: 0, lluvia: 0};
  let ambPedido = false;

  /* ------------------------------------------------------------ el taller: se hornea en JS */
  let ENV = false;               /* horneando un bucle: lo que se pasa del final entra por el principio */
  const fz = (f, dur) => Math.max(1, Math.round(f*dur))/dur;   /* frecuencia que cierra justo en el bucle */
  /* ruido de colores, cada uno con su propio estado: b blanco, r rosa, p pardo */
  function fuenteRuido(color){
    if(color === 'r'){
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      return () => { const w = Math.random()*2 - 1;
        b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759; b2 = 0.969*b2 + w*0.153852;
        b3 = 0.8665*b3 + w*0.3104856; b4 = 0.55*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.016898;
        const y = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w*0.5362)*0.11; b6 = w*0.115926; return y; };
    }
    if(color === 'p'){ let u = 0; return () => { u = (u + 0.02*(Math.random()*2 - 1))/1.02; return u*3.5; }; }
    return () => Math.random()*2 - 1;
  }
  /* biquad de los de siempre (RBJ): lp, hp, bp (pico a 0 dB) y pk */
  function BQ(tipo, f, q, gdb){
    const o = {b0: 1, b1: 0, b2: 0, a1: 0, a2: 0, x1: 0, x2: 0, y1: 0, y2: 0, q: q || 0.707};
    o.set = (fr, qq) => {
      if(qq) o.q = qq;
      const w = TAU*lim(fr, 12, SR*0.46)/SR, cs = Math.cos(w), al = Math.sin(w)/(2*o.q);
      let b0, b1, b2, a0 = 1 + al, a1 = -2*cs, a2 = 1 - al;
      if(tipo === 'lp'){ b0 = (1 - cs)/2; b1 = 1 - cs; b2 = b0; }
      else if(tipo === 'hp'){ b0 = (1 + cs)/2; b1 = -(1 + cs); b2 = b0; }
      else if(tipo === 'bp'){ b0 = al; b1 = 0; b2 = -al; }
      else { const A = Math.pow(10, (gdb || 0)/40); b0 = 1 + al*A; b1 = -2*cs; b2 = 1 - al*A; a0 = 1 + al/A; a2 = 1 - al/A; }
      o.b0 = b0/a0; o.b1 = b1/a0; o.b2 = b2/a0; o.a1 = a1/a0; o.a2 = a2/a0; return o;
    };
    o.p = x => { const y = o.b0*x + o.b1*o.x1 + o.b2*o.x2 - o.a1*o.y1 - o.a2*o.y2;
      o.x2 = o.x1; o.x1 = x; o.y2 = o.y1; o.y1 = (y > -1e-15 && y < 1e-15) ? 0 : y; return y; };
    return o.set(f);
  }
  /* filtro sobre todo el lienzo; en un bucle corre dos vueltas para que el final empalme con el principio */
  function filt(d, tipo, f, q, gdb){
    const b = BQ(tipo, f, q, gdb);
    if(ENV) for(let i = 0; i < d.length; i++) b.p(d[i]);
    for(let i = 0; i < d.length; i++) d[i] = b.p(d[i]);
  }
  /* saturación suave (tanh), con cuánto se empuja */
  function sat(d, k){ const n = Math.tanh(k); for(let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i]*k)/n; }
  /* dónde escribir la muestra j: afuera del lienzo se corta, o da la vuelta si es un bucle */
  const blep = (t, dt) => { if(t < dt){ t /= dt; return t + t - t*t - 1; } if(t > 1 - dt){ t = (t - 1)/dt; return t*t + t + t + 1; } return 0; };
  const envAD = (t, a, tau) => t < a ? t/a : Math.exp(-(t - a)/tau);

  /* ruido filtrado: {c color, t tipo, f, f1 (barrido exp.), fm(t,k), q, t2/f2/q2 segundo filtro, a, tau, env(t,k), amp} */
  /* la envolvente se evalúa cada 4 muestras y se interpola: sale mucho más barato que llamarla siempre */
  function envol(o, dur, m, n, a0){
    const a = num(o.a, a0), tau = num(o.tau, dur*0.3), f = o.env;
    return {E: f ? (i => { if(i > m) i = m; return f(i/SR, i/m); }) : (i => envAD(i/SR, a, tau)), fin: (ENV && m >= n) ? 0 : 0.004*SR};
  }
  function ruido(d, t0, dur, o){
    const n = d.length, i0 = Math.round(t0*SR), m = Math.ceil(dur*SR), rn = fuenteRuido(o.c || 'b');
    const bq = o.t ? BQ(o.t, o.f, o.q) : null, bq2 = o.t2 ? BQ(o.t2, o.f2, o.q2) : null, barre = bq && (o.f1 || o.fm);
    /* el ruido blanco se empareja por el ancho de banda: amp 1 da más o menos lo mismo pase por donde pase */
    const nrm = (o.c && o.c !== 'b') ? 1 : !o.t ? 0.52 : o.t === 'bp' ? 0.52/Math.sqrt(2*lim(o.f, 20, SR/2)/((o.q || 0.707)*SR))
      : o.t === 'lp' ? 0.52/Math.sqrt(2*lim(o.f, 20, SR/2)/SR) : 0.52/Math.sqrt(Math.max(0.05, 1 - 2*o.f/SR));
    const amp = num(o.amp, 1)*Math.min(nrm, 12), {E, fin} = envol(o, dur, m, n, 0.003);
    let e0 = 0, e1 = E(0);
    for(let i = 0; i < m; i++){
      const r = i & 3;
      if(r === 0){ e0 = e1; e1 = E(i + 4);
        if(barre && (i & 15) === 0){ const t = i/SR, k = i/m; bq.set(o.fm ? o.fm(t, k) : o.f*Math.pow(o.f1/o.f, k)); } }
      let x = rn(); if(bq) x = bq.p(x); if(bq2) x = bq2.p(x);
      let e = e0 + (e1 - e0)*r*0.25; if(fin && m - i < fin) e *= (m - i)/fin;
      let j = i0 + i; if(j >= n){ if(!ENV) break; j %= n; } d[j] += x*e*amp;
    }
  }
  /* tono: {f, f1, fm(t,k), w: s seno / w sierra / q cuadrada / t triángulo, a, tau, env, amp, vib:[hz, prof], jit, t/ff/q filtro} */
  function tono(d, t0, dur, o){
    const n = d.length, i0 = Math.round(t0*SR), m = Math.ceil(dur*SR), w = o.w || 's';
    const amp = num(o.amp, 1), {E, fin} = envol(o, dur, m, n, 0.002);
    const bq = o.t ? BQ(o.t, o.ff, o.q) : null;
    let ph = num(o.fase, Math.random()), jf = 0, jo = 0, f = o.f, e0 = 0, e1 = E(0);
    for(let i = 0; i < m; i++){
      const r = i & 3;
      if(r === 0){ e0 = e1; e1 = E(i + 4);
        if((i & 7) === 0){ const t = i/SR, k = i/m;
          f = o.fm ? o.fm(t, k) : (o.f1 ? o.f*Math.pow(o.f1/o.f, k) : o.f);
          if(o.vib) f *= 1 + o.vib[1]*Math.sin(TAU*o.vib[0]*t);
          if(o.jit){ if((i & 255) === 0) jo = Math.random()*2 - 1; jf += (jo - jf)*0.08; f *= 1 + o.jit*jf; } } }
      const dt = f/SR; ph += dt; if(ph >= 1) ph -= Math.floor(ph);
      let x;
      if(w === 's') x = Math.sin(TAU*ph);
      else if(w === 'w') x = 2*ph - 1 - blep(ph, dt);
      else if(w === 'q'){ x = (ph < 0.5 ? 1 : -1) + blep(ph, dt) - blep((ph + 0.5) % 1, dt); }
      else x = 1 - 4*Math.abs(ph - 0.5);
      if(bq) x = bq.p(x);
      let e = e0 + (e1 - e0)*r*0.25; if(fin && m - i < fin) e *= (m - i)/fin;
      let j = i0 + i; if(j >= n){ if(!ENV) break; j %= n; } d[j] += x*e*amp;
    }
  }
  /* golpe grave: un seno que cae de f0 a f1 (bombo, pisada, embestida) */
  function thump(d, t0, f0, f1, tau, amp){
    tono(d, t0, tau*7, {f: f0, fm: t => f1 + (f0 - f1)*Math.exp(-t/(tau*0.6)), a: 0.0015, tau, amp, fase: 0});
  }
  /* resonadores de dos polos excitados por lo que haya en ex (impulsos): modos = [[f, a, tau], ...] */
  function resonar(d, i0, ex, modos, amp, largo){
    const n = d.length, m = largo || ex.length;
    for(const md of modos){
      const f = md[0]; if(f >= SR*0.45 || f < 10) continue;
      const w = TAU*f/SR, r = Math.exp(-1/(md[2]*SR)), c = 2*r*Math.cos(w), r2 = r*r, g = md[1]*amp*r*Math.sin(w);
      let y1 = 0, y2 = 0, xa = 0;
      for(let i = 0; i < m; i++){
        const y = g*xa + c*y1 - r2*y2; y2 = y1; y1 = y; xa = i < ex.length ? ex[i] : 0;
        let j = i0 + i; if(j >= n){ if(!ENV) break; j %= n; } d[j] += y;
      }
    }
  }
  /* un golpe con modos (una sola excitación): madera, metal, vidrio, campanas */
  function modal(d, t0, modos, amp, dur){
    let tmax = 0; for(const md of modos) tmax = Math.max(tmax, md[2]);
    const m = Math.ceil(Math.min(dur || 99, tmax*7)*SR), ex = new Float32Array(1); ex[0] = 1;
    resonar(d, Math.round(t0*SR), ex, modos, amp, m);
  }
  const MADERA = [[1, 1, 0.05], [2.31, 0.95, 0.034], [3.9, 0.75, 0.022], [6.1, 0.55, 0.014], [8.7, 0.38, 0.009], [12.4, 0.22, 0.006]];
  const METAL = [[1, 1, 1], [2.76, 0.6, 0.6], [5.4, 0.4, 0.3], [8.93, 0.25, 0.16], [13.34, 0.12, 0.08]];
  /* madera: esc sube o baja el cuerpo (1 ≈ 110 Hz), largo estira la cola */
  function madera(d, t0, esc, amp, largo){
    const L = largo || 1, b = 110*esc;
    modal(d, t0, MADERA.map(([r, a, t]) => [b*r*azar(0.97, 1.03), a, t*L]), amp);
    /* el golpe de la tabla en los medios: lo que sí da el parlante de un celular */
    const se = Math.sqrt(esc);
    modal(d, t0, [[azar(380, 520)*se, 0.6, 0.03*L], [azar(900, 1200)*se, 0.35, 0.015*L]], amp);
    ruido(d, t0, 0.03, {t: 'bp', f: Math.min(6000, 1600*se), q: 0.9, a: 0.0004, tau: 0.006, amp: amp*0.6});
    thump(d, t0, 90*esc, 55*esc, 0.02*L, amp*0.25);
  }
  function metal(d, t0, f, amp, largo){
    const L = largo || 1;
    modal(d, t0, METAL.map(([r, a, t]) => [f*r*azar(0.99, 1.01), a, t*0.3*L]), amp);
    ruido(d, t0, 0.02, {t: 'hp', f: 2500, q: 0.7, a: 0.0003, tau: 0.003, amp: amp*0.35});
  }
  function vidrio(d, t0, f, amp, tau){
    const T = tau || 0.06;
    modal(d, t0, [[f, 1, T], [f*1.52, 0.6, T*0.7], [f*2.33, 0.4, T*0.45], [f*3.61, 0.2, T*0.3]], amp);
  }
  /* clic: plástico, llaves de luz, botones */
  function clic(d, t0, amp, f){
    const F = f || 3000;
    ruido(d, t0, 0.012, {t: 'bp', f: F, q: 1.4, a: 0.0002, tau: 0.0022, amp});
    modal(d, t0, [[F*0.55, 0.5, 0.007], [F*1.31, 0.35, 0.004]], amp*0.45);
    thump(d, t0, 190, 120, 0.005, amp*0.22);
  }
  /* tren de impulsos (tasa por segundo que puede variar) por un banco de resonadores:
     crujidos de madera, bisagras, uñas, chispas. {tasa(t,k), res:[[f,q,g]], fres(t,k) multiplica las f, env(t,k), amp, jit} */
  function crujido(d, t0, dur, o){
    const n = d.length, i0 = Math.round(t0*SR), m = Math.ceil(dur*SR), ex = new Float32Array(m), jit = num(o.jit, 0.15);
    let tn = 0;
    while(tn < dur){ const k = tn/dur, i = Math.floor(tn*SR); if(i >= m) break;
      ex[i] += (0.55 + 0.45*Math.random())*(o.env ? o.env(tn, k) : 1)*(o.bip && Math.random() < 0.5 ? -1 : 1);
      tn += (1/Math.max(0.5, o.tasa(tn, k)))*(1 + jit*(Math.random()*2 - 1)); }
    const bqs = o.res.map(r => [BQ('bp', r[0], r[1]), r[2]*2*r[1]/Math.sin(TAU*lim(r[0], 20, SR*0.45)/SR)*0.5, r[0]]), amp = num(o.amp, 1);
    const nb = bqs.length, F = bqs.map(b => b[0]), Gs = bqs.map(b => b[1]);
    for(let i = 0; i < m; i++){
      if(o.fres && (i & 31) === 0){ const mul = o.fres(i/SR, i/m); for(let q = 0; q < nb; q++) F[q].set(bqs[q][2]*mul); }
      const x = ex[i]; let y = 0; for(let q = 0; q < nb; q++) y += F[q].p(x)*Gs[q];
      let j = i0 + i; if(j >= n){ if(!ENV) break; j %= n; } d[j] += y*amp;
    }
  }
  /* la garganta: sierra (o ruido) por tres formantes. {f0(t,k), mez(t,k) 0 sierra…1 ruido, voc(t,k)|[F1,F2,F3],
     q:[..], gf:[..], env(t,k), amp, jit, sub (subarmónico), rugo:[hz, prof] aspereza de amplitud, c color del ruido} */
  function garganta(d, t0, dur, o){
    const n = d.length, i0 = Math.round(t0*SR), m = Math.ceil(dur*SR), rn = fuenteRuido(o.c || 'b');
    const Q = o.q || [5, 7, 9], G = o.gf || [1, 0.55, 0.3];
    const bq = [BQ('bp', 500, Q[0]), BQ('bp', 1500, Q[1]), BQ('bp', 2500, Q[2])];
    const amp = num(o.amp, 1)*5, jit = o.jit || 0, sub = o.sub || 0, fin = (ENV && m >= n) ? 0 : 0.006*SR;
    let ph = Math.random(), ph2 = 0, jf = 0, jo = 0, f0 = 100, mez = 0, rph = Math.random(), e0 = 0, e1 = o.env ? o.env(0, 0) : 1, ru0 = 1, ru1 = 1;
    for(let i = 0; i < m; i++){
      if((i & 31) === 0){
        const t = i/SR, k = i/m;
        const F = typeof o.voc === 'function' ? o.voc(t, k) : o.voc;
        bq[0].set(F[0]); bq[1].set(F[1]); bq[2].set(F[2]);
        if((i & 511) === 0) jo = Math.random()*2 - 1; jf += (jo - jf)*0.2;
        f0 = Math.max(20, (typeof o.f0 === 'function' ? o.f0(t, k) : o.f0 || 100)*(1 + jit*jf));
        mez = o.mez === undefined ? 0 : (typeof o.mez === 'function' ? o.mez(t, k) : o.mez);
      }
      const dt = f0/SR; ph += dt; if(ph >= 1){ ph -= 1; ph2 = 1 - ph2; }
      let s = 2*ph - 1 - blep(ph, dt);
      if(sub) s += sub*(ph2 ? 0.6 : -0.6);
      const x = s*(1 - mez) + rn()*mez*1.4;
      const y = bq[0].p(x)*G[0] + bq[1].p(x)*G[1] + bq[2].p(x)*G[2];
      const r = i & 3;
      if(r === 0){ e0 = e1; const i4 = Math.min(i + 4, m); e1 = o.env ? o.env(i4/SR, i4/m) : 1;
        if(o.rugo){ rph += o.rugo[0]*(0.8 + 0.4*Math.random())*4/SR; ru0 = ru1; ru1 = 1 - o.rugo[1]*(0.5 + 0.5*Math.sin(TAU*rph)); } }
      let e = (e0 + (e1 - e0)*r*0.25)*(ru0 + (ru1 - ru0)*r*0.25); if(fin && m - i < fin) e *= (m - i)/fin;
      let j = i0 + i; if(j >= n){ if(!ENV) break; j %= n; } d[j] += y*e*amp;
    }
  }
  /* una capa continua de bucle (ruido filtrado, un tono con filtro): se hornea con x de más y la cola se funde
     sobre la cabeza; lin para lo que es periódico (no suma energía), raíz para el ruido */
  function capaCirc(d, fn, lin){
    const n = d.length, x = Math.min(Math.round(0.08*SR), n >> 2), tm = new Float32Array(n + x), era = ENV;
    ENV = false; try { fn(tm, n/SR); } finally { ENV = era; }
    for(let i = 0; i < n; i++){ let v = tm[i];
      if(i < x){ const k = i/x; v = lin ? v*k + tm[n + i]*(1 - k) : v*Math.sqrt(k) + tm[n + i]*Math.sqrt(1 - k); }
      d[i] += v; }
  }
  const VOC = {a: [800, 1200, 2600], e: [480, 1850, 2550], i: [290, 2250, 3000], o: [540, 880, 2450], u: [330, 760, 2300]};
  const mezV = (A, B, k) => [lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k)];
  /* forma de campana para envolventes: sube y baja en [0,1] */
  const campana = (k, p) => Math.pow(Math.max(0, Math.sin(Math.PI*lim(k, 0, 1))), p || 1);

  /* ------------------------------------------------------------ del lienzo al AudioBuffer */
  function hornear(def, nombre){
    /* casi todo se hornea a media frecuencia (la mitad de memoria y de trabajo): lo brillante va entero */
    const sr0 = SR, srB = def.alta ? C.sampleRate : Math.round(C.sampleRate/2);
    const dur = typeof def.dur === 'function' ? def.dur() : def.dur;
    SR = srB;
    const n = Math.max(128, Math.round(dur*SR)), chs = def.st ? 2 : 1, datos = [];
    ENV = !!def.bucle;
    try { for(let c = 0; c < chs; c++){ const d = new Float32Array(n); def.f(d, dur, c); datos.push(d); } }
    finally { ENV = false; SR = sr0; }
    let malos = 0;
    for(const d of datos) for(let i = 0; i < n; i++){ const v = d[i]; if(v !== v || v === Infinity || v === -Infinity){ d[i] = 0; malos++; } }
    if(malos) err('NaN horneando ' + nombre + ': ' + malos);
    const R = 1 - TAU*20/srB;                       /* sin continua: pasaaltos de un polo a 20 Hz */
    for(const d of datos){ let x1 = 0, y1 = 0; for(let v = 0; v < (def.bucle ? 2 : 1); v++) for(let i = 0; i < n; i++){ const x = d[i], y = x - x1 + R*y1; x1 = x; y1 = y; if(v === (def.bucle ? 1 : 0)) d[i] = y; } }
    let p = 0;
    for(const d of datos) for(let i = 0; i < n; i++){ const v = d[i], a = v < 0 ? -v : v; if(a > p) p = a; }
    const g = p > 1e-9 ? def.pico/p : 0, b = C.createBuffer(chs, n, srB);
    for(let c = 0; c < chs; c++){
      const d = datos[c];
      if(!def.bucle){ const f = Math.min(n, Math.round(0.004*SR)); for(let i = 0; i < f; i++) d[n - 1 - i] *= i/f; }
      for(let i = 0; i < n; i++) d[i] *= g;
      if(b.copyToChannel) b.copyToChannel(d, c); else b.getChannelData(c).set(d);
    }
    return b;
  }
  const ultVar = {}, msPor = {};
  function buffer(nombre){
    const def = FX[nombre] || BUCLES[nombre]; if(!def) return null;
    const l = BUF[nombre] || (BUF[nombre] = []), nv = def.var || 1;
    if(l.length < nv && (l.length === 0 || Math.random() < 0.7)){ l.push(hornear(def, nombre)); ultVar[nombre] = l.length - 1; return l[l.length - 1]; }
    if(l.length === 1) return l[0];
    let i = Math.floor(Math.random()*l.length); if(i === ultVar[nombre]) i = (i + 1) % l.length;
    ultVar[nombre] = i; return l[i];
  }

  /* ------------------------------------------------------------ armado del máster */
  function ruidos(){
    const n = Math.floor(SR*4), x = Math.floor(SR*0.05), out = {};
    for(const [k, c] of [['blanco', 'b'], ['rosa', 'r'], ['pardo', 'p']]){
      const d = new Float32Array(n + x), rn = fuenteRuido(c);
      for(let i = 0; i < n + x; i++) d[i] = rn()*(c === 'b' ? 0.6 : 1);
      /* la cola se funde sobre la cabeza: el final empalma con el principio */
      for(let i = 0; i < x; i++){ const k2 = i/x; d[i] = d[i]*Math.sqrt(k2) + d[n + i]*Math.sqrt(1 - k2); }
      const b = C.createBuffer(1, n, SR); b.getChannelData(0).set(d.subarray(0, n)); out[k] = b;
    }
    return out;
  }
  /* respuesta de sala por código: ruido que se apaga y se oscurece, con reflexiones tempranas */
  function ir(dur, t60, br0, br1, pre, ecos){
    const n = Math.floor(SR*dur), b = C.createBuffer(2, n, SR), p0 = Math.floor(SR*pre);
    for(let ch = 0; ch < 2; ch++){
      const d = b.getChannelData(ch); let l1 = 0, l2 = 0;
      for(let i = p0; i < n; i++){
        const t = (i - p0)/SR, x = (i - p0)/(n - p0), a = lerp(br0, br1, Math.sqrt(x));
        l1 += a*((Math.random()*2 - 1) - l1); l2 += a*(l1 - l2);
        d[i] = l2*Math.exp(-6.9*t/t60)*Math.min(1, t/0.01)*(1 - x);
      }
      for(const [te, g] of ecos){ const i = p0 + Math.floor(SR*te*(ch ? 1.06 : 0.95)); if(i < n) d[i] += g*(Math.random() < 0.5 ? -1 : 1); }
    }
    return b;
  }
  /* recorte suave: lineal hasta 0,6 y después se dobla hasta 0,95; entra a la mitad (el pre) así llega hasta 2 */
  function curvaRecorte(){
    const n = 4096, c = new Float32Array(n);
    for(let i = 0; i < n; i++){ const v = (i/(n - 1))*2 - 1, x = Math.abs(v)*2;
      const y = x <= 0.6 ? x : 0.6 + 0.35*Math.tanh((x - 0.6)/0.35); c[i] = v < 0 ? -y : y; }
    return c;
  }
  const G = v => { const n = C.createGain(); n.gain.value = v; return n; };
  function armarMaster(){
    M = {bus: {}, env: {}};
    M.mezcla = G(1);                                       /* acá se hunde todo cuando pega el susto */
    M.lp = C.createBiquadFilter(); M.lp.type = 'lowpass'; M.lp.frequency.value = 20000; M.lp.Q.value = 0.6;
    M.comp = C.createDynamicsCompressor();
    const cp = M.comp; cp.threshold.value = -8; cp.knee.value = 6; cp.ratio.value = 4; cp.attack.value = 0.004; cp.release.value = 0.25;
    M.pre = G(0.5); M.clip = C.createWaveShaper(); M.clip.curve = curvaRecorte(); M.clip.oversample = 'none';
    M.salida = G(1);
    M.duck = G(1);                                         /* el susto aplasta todo lo demás un momento */
    M.mezcla.connect(M.duck); M.duck.connect(M.lp); M.lp.connect(M.comp); M.comp.connect(M.pre); M.pre.connect(M.clip); M.clip.connect(M.salida);
    M.salida.connect(C.destination);
    for(const k of ['mus', 'fx', 'amb', 'voz']){ M.bus[k] = G(1); M.bus[k].connect(M.mezcla); }
    M.bus.ui = G(1); M.bus.ui.connect(M.comp);             /* los botones no se tapan en el placard */
    M.bus.cuerpo = G(1); M.bus.cuerpo.connect(M.comp);     /* tu corazón y tu respiración: adentro tuyo */
    M.bus.golpe = G(1); M.bus.golpe.connect(M.pre);        /* el susto: por fuera del compresor */
    M.rev = {};
    for(const [k, b] of [['sala', ir(1.4, 1.2, 0.55, 0.12, 0.004, [[0.007, 0.5], [0.013, 0.35], [0.021, 0.3], [0.034, 0.2], [0.047, 0.15]])],
                         ['afuera', ir(3.8, 3.2, 0.24, 0.035, 0.025, [[0.09, 0.22], [0.19, 0.18], [0.37, 0.11], [0.61, 0.07]])]]){
      const cv = C.createConvolver(); cv.buffer = b; const ret = G(k === 'sala' ? 0.8 : 1.0);
      cv.connect(ret); ret.connect(M.mezcla); M.rev[k] = cv;
    }
    for(const q of ['fx', 'mus']){ M.env[q] = {};
      for(const k of ['sala', 'afuera']){ const e = G(1); e.connect(M.rev[k]); M.env[q][k] = e; } }
  }
  /* los niveles de los buses: volumen elegido × pausa */
  function aplicarBuses(tau){
    if(!M) return;
    const t = C.currentTime, T = tau === undefined ? 0.12 : tau, p = pausado ? 0 : 1;
    const mus = volMus*(pausado && MUS.nombre !== 'menu' ? 0.3 : 1), fx = volFx*p;
    const pon = (prm, v) => { prm.cancelScheduledValues(t); prm.setTargetAtTime(v, t, T); };
    pon(M.bus.mus.gain, mus); pon(M.env.mus.sala.gain, mus); pon(M.env.mus.afuera.gain, mus);
    for(const k of ['fx', 'amb', 'voz', 'cuerpo', 'golpe']) pon(M.bus[k].gain, k === 'cuerpo' ? fx*cuerpoAmort() : fx);
    pon(M.env.fx.sala.gain, fx); pon(M.env.fx.afuera.gain, fx); pon(M.bus.ui.gain, volFx);
  }
  const cuerpoAmort = () => kAmort > 0.9 ? Math.max(0, (1 - kAmort)*10) : 1;
  const frecOcl = k => 20000*Math.pow(600/20000, lim(k, 0, 1));
  /* cambiar un parámetro de a poco, sin llenar la línea de tiempo si no cambió */
  function suave(prm, v, tau){
    if(!isFinite(v)) return;
    if(prm._u !== undefined && Math.abs(prm._u - v) < 1e-4*(1 + Math.abs(v))) return;
    prm._u = v; prm.setTargetAtTime(v, C.currentTime, tau);
  }

  /* ------------------------------------------------------------ fuentes, voces y el oído */
  const VIVAS = new Set();                          /* para el banco: qué está sonando */
  function arrancarFuente(s, t, off, alTerminar, et){
    s._viva = true; vivas++; s._et = et || 'otro'; VIVAS.add(s);
    s.onended = () => { VIVAS.delete(s); if(s._viva){ s._viva = false; vivas--; } try { s.disconnect(); } catch(_){} if(alTerminar) try { alTerminar(); } catch(e){ err(e); } };
    if(off) s.start(t, off); else s.start(t);
  }
  function pararFuente(s, t){ try { s.stop(t); } catch(_){} if(s._viva){ s._viva = false; vivas--; VIVAS.delete(s); } }
  function panner(pos){
    const p = C.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.5; p.rolloffFactor = 1.2; p.maxDistance = 45;
    ponerPos(p, pos, true); return p;
  }
  function ponerPos(p, pos, ya){
    const x = num(pos[0], 0), y = num(pos[1], 0), z = num(pos[2], 0);
    if(p.positionX){
      if(ya){ p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; }
      else { suave(p.positionX, x, 0.03); suave(p.positionY, y, 0.03); suave(p.positionZ, z, 0.03); }
    } else p.setPosition(x, y, z);
  }
  const dist = pos => { const dx = num(pos[0], 0) - OY.x, dy = num(pos[1], 0) - OY.y, dz = num(pos[2], 0) - OY.z; return Math.sqrt(dx*dx + dy*dy + dz*dz); };
  const gDist = pos => { const d = lim(dist(pos), 1.5, 45); return 1.5/(1.5 + 1.2*(d - 1.5)); };
  function matar(v, f){
    if(v.muere) return; v.muere = true;
    const t = C.currentTime;
    try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + f); } catch(_){}
    pararFuente(v.s, t + f + 0.01);
  }
  function liberar(v){
    const i = VOCES.indexOf(v); if(i >= 0) VOCES.splice(i, 1);
    for(const n of v.nodos) try { n.disconnect(); } catch(_){}
  }
  function hacerLugar(){
    if(vivas < TOPE - 1) return true;
    const v = VOCES.find(x => !x.muere); if(v){ matar(v, 0.03); return true; }
    return vivas < TOPE;
  }
  /* un efecto suelto: una fuente → ganancia → (pasabajos si está tapado) → paneo 3D → bus, y un envío a la sala */
  function lanzar(nombre, o){
    const def = FX[nombre], t = C.currentTime;
    const tope = def.tope || 3; let cuantas = 0, vieja = null;
    for(const v of VOCES) if(v.nombre === nombre && !v.muere){ cuantas++; if(!vieja) vieja = v; }
    if(cuantas >= tope && vieja) matar(vieja, 0.04);
    if(!hacerLugar()){ descartados++; return null; }
    const b = buffer(nombre); if(!b) return null;
    const s = C.createBufferSource(); s.buffer = b;
    const vr = def.vr === undefined ? 0.03 : def.vr;
    s.playbackRate.value = lim(num(o.tono, 1), 0.25, 4)*(1 + vr*(Math.random()*2 - 1));
    const seco = def.seco === undefined ? 1 : Math.max(0.05, def.seco);
    const g = G(lim(num(o.vol, 1), 0, 2)*seco*(1 + 0.07*(def.vv === undefined ? 1 : def.vv)*(Math.random()*2 - 1)));
    s.connect(g); let cab = g; const nodos = [s, g];
    const ocl = lim(num(o.ocluido, 0), 0, 1);
    if(ocl > 0.01){ const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = frecOcl(ocl); lp.Q.value = 0.5;
      g.gain.value *= 1 - 0.3*ocl; cab.connect(lp); cab = lp; nodos.push(lp); }
    const pos = Array.isArray(o.pos) && o.pos.length >= 3 ? o.pos : null;
    const destino = def.golpe ? M.bus.golpe : def.ui ? M.bus.ui : def.cuerpo ? M.bus.cuerpo
      : o._bus === 'afuera' ? AMBN.lp : o._bus === 'amb' ? M.bus.amb : M.bus.fx;
    if(pos){ const p = panner(pos); cab.connect(p); p.connect(destino); nodos.push(p); } else cab.connect(destino);
    const adentro = def.lugar ? def.lugar === 'sala' : (o.adentro === undefined ? AMB.afuera < 0.5 : !!o.adentro);
    const rv = num(def.rev, 0.15)*(pos ? 0.4 + 0.6*gDist(pos) : 1)*num(o._rev, 1);
    if(rv > 0.004 && !def.ui){ const e = G(rv/seco); cab.connect(e); e.connect(M.env.fx[adentro ? 'sala' : 'afuera']); nodos.push(e); }
    const v = {nombre, s, g, nodos, fin: t + b.duration/s.playbackRate.value + 0.3, muere: false};
    VOCES.push(v);
    arrancarFuente(s, t + (def.retraso || 0), 0, () => liberar(v), 'fx:' + nombre);
    if(def.golpe){ const dp = M.duck.gain; dp.cancelScheduledValues(t); dp.setTargetAtTime(0.3, t, 0.01); dp.setTargetAtTime(1, t + 1.3, 0.6); }
    return v;
  }
  function fx(nombre, o){
    if(typeof nombre !== 'string' || !FX[nombre]){ FALTAN.add(String(nombre)); return; }
    if(!C || !M || sinAudio) return;
    if(pausado && !FX[nombre].ui) return;
    lanzar(nombre, o && typeof o === 'object' ? o : {});
  }

  /* ------------------------------------------------------------ bucles */
  function crearBucle(id, nombre, def, o){
    if(!hacerLugar()){ descartados++; return null; }
    const b = buffer(nombre); if(!b) return null;
    const t = C.currentTime, s = C.createBufferSource(); s.buffer = b; s.loop = true;
    const g = G(0), lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.value = frecOcl(num(o.ocluido, 0));
    s.connect(g); g.connect(lp);
    const pos = Array.isArray(o.pos) && o.pos.length >= 3 ? o.pos.slice(0, 3) : null;
    const destino = def.cuerpo ? M.bus.cuerpo : M.bus.fx;
    let p = null; if(pos){ p = panner(pos); lp.connect(p); p.connect(destino); } else lp.connect(destino);
    const e = G(0); lp.connect(e);
    const B = {id, nombre, def, s, g, lp, p, e, pos, tPos: ahora(), v: [0, 0, 0], dop: 1, adentro: null, nodos: [s, g, lp, e]};
    if(p) B.nodos.push(p);
    arrancarFuente(s, t, Math.random()*b.duration*0.95, () => { for(const n of B.nodos) try { n.disconnect(); } catch(_){} }, 'bucle:' + nombre);
    return B;
  }
  function actualizarBucle(B, o){
    const vol = lim(num(o.vol, 1), 0, 2), tono = lim(num(o.tono, 1), 0.25, 3), ocl = lim(num(o.ocluido, 0), 0, 1);
    let gd = 1;
    if(B.p && Array.isArray(o.pos) && o.pos.length >= 3){
      const now = ahora(), dt = now - B.tPos, np = [num(o.pos[0], 0), num(o.pos[1], 0), num(o.pos[2], 0)];
      if(B.def.doppler && dt > 0.004){
        if(dt < 0.6) for(let i = 0; i < 3; i++) B.v[i] = lerp(B.v[i], lim((np[i] - B.pos[i])/dt, -60, 60), 0.35);
        const ux = OY.x - np[0], uy = OY.y - np[1], uz = OY.z - np[2], L = Math.sqrt(ux*ux + uy*uy + uz*uz) || 1;
        const vs = (B.v[0]*ux + B.v[1]*uy + B.v[2]*uz)/L, vl = -(OY.vx*ux + OY.vy*uy + OY.vz*uz)/L;
        B.dop = lerp(B.dop, lim((343 + vl)/(343 - vs), 0.75, 1.33), 0.5);
      }
      B.tPos = now; B.pos = np; ponerPos(B.p, np); gd = gDist(np);
    }
    let r = tono*(B.def.doppler ? B.dop : 1);
    if(B.def.falla && tono < 0.97){                      /* el motor que se está quedando: tironea y se ahoga de a ratos */
      r *= 1 + (1 - tono)*0.35*(Math.random()*2 - 1);
      if(B.hueco > 0) B.hueco--; else if(Math.random() < (0.97 - tono)*0.12) B.hueco = 2 + Math.floor(Math.random()*6);
    } else B.hueco = 0;
    const gv = vol*(1 - 0.3*ocl)*(B.hueco > 0 ? 0.15 : 1);
    suave(B.g.gain, gv, B.def.falla && tono < 0.97 ? 0.02 : 0.06); suave(B.s.playbackRate, r, 0.05); suave(B.lp.frequency, frecOcl(ocl), 0.05);
    const adentro = B.def.lugar ? B.def.lugar === 'sala' : (o.adentro === undefined ? AMB.afuera < 0.5 : !!o.adentro);
    if(adentro !== B.adentro){ try { B.e.disconnect(); } catch(_){} B.e.connect(M.env.fx[adentro ? 'sala' : 'afuera']); B.adentro = adentro; }
    suave(B.e.gain, num(B.def.rev, 0.12)*(B.p ? 0.4 + 0.6*gd : 1)*vol, 0.1);
  }
  function bucle(id, nombre, o){
    id = String(id); o = o && typeof o === 'object' ? o : {};
    if(typeof nombre !== 'string' || !BUCLES[nombre]){ FALTAN.add(String(nombre)); return; }
    if(!C || !M){ bPed.set(id, [nombre, o]); return; }
    let B = BUC.get(id);
    if(B && (B.nombre !== nombre || (!B.p && Array.isArray(o.pos) && o.pos.length >= 3))){ bucleParar(id, 0.15); B = null; }   /* otro sonido, o ahora tiene lugar en el mundo */
    if(!B){ B = crearBucle(id, nombre, BUCLES[nombre], o); if(!B) return; BUC.set(id, B); }
    actualizarBucle(B, o);
  }
  function bucleParar(id, fundido){
    id = String(id); bPed.delete(id);
    const B = BUC.get(id); if(!B || !C) return;
    BUC.delete(id);
    const f = Math.max(0.01, num(fundido, 0.3)), t = C.currentTime, gp = B.g.gain;
    gp.cancelScheduledValues(t); gp.setValueAtTime(gp.value, t); gp.linearRampToValueAtTime(0, t + f);
    pararFuente(B.s, t + f + 0.02);
  }

  /* ================================================================ efectos sueltos
     dur: largo del lienzo (s) · pico: a cuánto se normaliza · var: variantes que se hornean
     vr: variación de velocidad al azar · rev: envío a la sala · tope: copias a la vez
     golpe: va por fuera del compresor · ui: suena en pausa · lugar: fuerza sala o afuera · seco: nivel directo */
  const FX = {};
  const D = (nombre, dur, pico, f, x) => { FX[nombre] = Object.assign({dur, pico, f}, x || {}); };

  /* ---- las pisadas: talón y punta, cada una distinta */
  D('paso_madera', 0.34, 0.2, d => {
    const e = azar(0.85, 1.15), t1 = azar(0.035, 0.07);
    madera(d, 0, e, 1, 0.8); madera(d, t1, e*azar(1.1, 1.4), 0.45, 0.6);
    ruido(d, 0, 0.05, {t: 'bp', f: azar(900, 1400), q: 1, a: 0.001, tau: 0.01, amp: 0.2});
    ruido(d, 0, 0.02, {t: 'bp', f: azar(1800, 2600), q: 1.2, a: 0.0003, tau: 0.004, amp: 0.5});
    if(Math.random() < 0.35) crujido(d, azar(0.03, 0.08), azar(0.12, 0.22), {tasa: (t, k) => 70 + 160*k,
      res: [[azar(450, 800), 18, 1], [azar(1300, 2100), 22, 0.45]], env: (t, k) => campana(k), amp: 0.35});
  }, {var: 6, vr: 0.05, rev: 0.12, tope: 4});
  D('paso_alfombra', 0.25, 0.1, d => {
    thump(d, 0, azar(65, 80), 45, 0.035, 0.6);
    ruido(d, 0.004, 0.08, {t: 'lp', f: azar(350, 550), a: 0.004, tau: 0.025, amp: 0.8});
    ruido(d, 0.002, 0.06, {t: 'bp', f: azar(400, 600), q: 1, a: 0.003, tau: 0.02, amp: 0.45});
    ruido(d, 0.01, 0.1, {t: 'bp', f: azar(2000, 3200), q: 0.8, a: 0.01, tau: 0.03, amp: 0.12});
    thump(d, azar(0.04, 0.07), 70, 50, 0.025, 0.4);
  }, {var: 5, vr: 0.05, rev: 0.06, tope: 4});
  D('paso_pasto', 0.32, 0.14, d => {
    crujido(d, 0, azar(0.12, 0.18), {tasa: (t, k) => 500*(1 - k) + 80, res: [[azar(2600, 3600), 2.5, 1], [azar(5000, 6500), 2.5, 0.6]], env: (t, k) => Math.pow(1 - k, 1.5), amp: 0.6, jit: 0.6});
    ruido(d, 0, 0.25, {t: 'bp', f: azar(2800, 4200), q: 0.7, a: 0.012, tau: 0.06, amp: 0.45});
    thump(d, 0.005, 75, 50, 0.03, 0.6);
    ruido(d, 0.06, 0.2, {t: 'bp', f: 3500, q: 0.9, a: 0.02, tau: 0.05, amp: 0.25});
  }, {alta: true, var: 6, vr: 0.06, rev: 0.05, tope: 4});
  D('paso_asfalto', 0.28, 0.16, d => {
    thump(d, 0, azar(85, 100), 60, 0.018, 0.7);
    ruido(d, 0, 0.05, {t: 'bp', f: azar(2000, 3000), q: 1.1, a: 0.0006, tau: 0.012, amp: 0.8});
    crujido(d, 0.004, 0.05, {tasa: () => 900, res: [[azar(3500, 4800), 3, 1]], env: (t, k) => 1 - k, amp: 0.3, jit: 0.7});
    const t1 = azar(0.05, 0.08);
    thump(d, t1, 110, 75, 0.012, 0.35); ruido(d, t1, 0.08, {t: 'bp', f: azar(2500, 3500), q: 1, a: 0.004, tau: 0.02, amp: 0.45});
  }, {alta: true, var: 6, vr: 0.05, rev: 0.1, tope: 4});
  D('paso_escalera', 0.45, 0.22, d => {
    const e = azar(0.6, 0.75);
    madera(d, 0, e, 1, 1.4);
    modal(d, 0.002, [[azar(115, 135), 0.6, 0.09], [azar(250, 280), 0.6, 0.06], [azar(480, 560), 0.4, 0.04]], 0.8);
    madera(d, azar(0.04, 0.07), e*1.3, 0.35, 0.8);
    if(Math.random() < 0.6) crujido(d, azar(0.02, 0.1), azar(0.18, 0.3), {tasa: (t, k) => 50 + 120*k,
      res: [[azar(350, 600), 16, 1], [azar(900, 1400), 20, 0.5]], env: (t, k) => campana(k, 0.7), amp: 0.5});
  }, {var: 6, vr: 0.05, rev: 0.14, tope: 4});

  /* ---- el cuerpo del jugador */
  D('respira_cansado', 2.5, 0.28, d => {
    const aire = (t0, du, F, a, voz) => garganta(d, t0, du, {f0: 125, mez: voz ? 0.9 : 1, voc: F, q: [3, 4, 6], env: (t, k) => campana(k, 0.8)*(0.7 + 0.3*k), amp: a});
    aire(0.0, 0.42, [700, 1350, 2700], 0.55); aire(0.5, 0.6, [620, 1150, 2450], 1, 1);
    aire(1.2, 0.4, [720, 1400, 2750], 0.5); aire(1.65, 0.7, [600, 1100, 2400], 0.9, 1);
  }, {var: 1, rev: 0.1, tope: 1, cuerpo: true});
  D('tos', 1.0, 0.36, d => {
    [[0, 1], [0.3, 0.8], [0.56, 0.6]].forEach(([t0, a]) => {
      ruido(d, t0, 0.012, {t: 'hp', f: 1200, a: 0.0005, tau: 0.004, amp: a*0.6});
      garganta(d, t0, 0.24, {f0: (t, k) => 210 - 70*k, mez: (t, k) => 0.45 + 0.4*k, voc: (t, k) => mezV([650, 1250, 2600], [450, 1100, 2400], k),
        q: [4, 5, 7], jit: 0.08, env: (t, k) => envAD(t, 0.006, 0.06), amp: a, rugo: [70, 0.3]});
    });
  }, {var: 3, rev: 0.12, tope: 2, cuerpo: true});
  D('linterna_on', 0.12, 0.24, d => { clic(d, 0, 1, 3600); clic(d, 0.028, 0.6, 2900); }, {var: 2, rev: 0.05});
  D('linterna_off', 0.12, 0.22, d => { clic(d, 0, 0.8, 2600); clic(d, 0.022, 0.7, 3300); }, {var: 2, rev: 0.05});
  D('bateria', 0.5, 0.25, d => {
    ruido(d, 0, 0.14, {t: 'bp', f: 2200, q: 1.2, env: (t, k) => campana(k, 0.6), amp: 0.25});
    clic(d, 0.15, 1, 3000);
    tono(d, 0.152, 0.1, {f: 900, f1: 700, a: 0.001, tau: 0.03, amp: 0.08, vib: [45, 0.05]});
    clic(d, 0.36, 0.8, 2300);
  }, {rev: 0.05});
  D('gaseosa', 2.0, 0.3, d => {
    clic(d, 0, 0.8, 2600); metal(d, 0.001, 3100, 0.12, 0.3);
    ruido(d, 0.012, 0.6, {t: 'hp', f: 2600, a: 0.004, tau: 0.16, amp: 0.8});
    crujido(d, 0.05, 0.9, {tasa: (t, k) => 160*(1 - k) + 25, res: [[5200, 1.5, 1], [8200, 1.5, 0.6]], env: (t, k) => Math.pow(1 - k, 2), amp: 0.08, jit: 0.8});
    [1.02, 1.42].forEach((t0, i) => {
      tono(d, t0, 0.1, {f: 170, fm: t => 170 - 900*t, a: 0.004, tau: 0.03, amp: 0.55 - i*0.1});
      ruido(d, t0 + 0.01, 0.08, {t: 'bp', f: 650, q: 3, a: 0.004, tau: 0.03, amp: 0.3});
      clic(d, t0 - 0.03, 0.2, 1200);
    });
    garganta(d, 1.62, 0.32, {f0: 110, mez: 1, voc: VOC.a, env: (t, k) => campana(k), amp: 0.3});
  }, {alta: true, rev: 0.08, tope: 1});
  D('agarrar', 0.3, 0.2, d => {
    ruido(d, 0, 0.14, {t: 'bp', f: 2500, q: 0.8, env: (t, k) => campana(k, 0.7), amp: 0.4});
    thump(d, 0.06, 150, 90, 0.02, 0.55); madera(d, 0.062, 2.2, 0.25, 0.5);
  }, {var: 3, rev: 0.06});
  D('tablas_agarrar', 0.6, 0.38, d => {
    [[0, 1], [0.07, 0.6], [0.16, 0.8], [0.25, 0.4]].forEach(([t0, a]) => madera(d, t0 + azar(0, 0.02), azar(2.1, 3.1), a, 1.6));
    ruido(d, 0, 0.35, {t: 'bp', f: 1200, q: 1, env: (t, k) => campana(k, 0.5), amp: 0.15});
  }, {var: 3, rev: 0.14});
  /* el martillo: el hierro contra la cabeza del clavo y la madera que recibe */
  D('martillo', 0.55, 0.5, d => {
    const f = azar(1950, 2250);
    modal(d, 0, [[f, 1, 0.05], [f*1.6, 0.7, 0.035], [f*2.5, 0.5, 0.02], [f*3.55, 0.3, 0.012]], 1.4);
    madera(d, 0, azar(0.85, 1), 1, 1.2); thump(d, 0, 115, 70, 0.045, 0.4);
    ruido(d, 0, 0.02, {t: 'bp', f: 3200, q: 1, a: 0.0003, tau: 0.005, amp: 0.6});
    modal(d, 0.003, [[azar(360, 400), 0.3, 0.08], [azar(740, 800), 0.2, 0.06]], 1);
  }, {var: 4, rev: 0.2, tope: 3});
  D('clavo_final', 0.7, 0.55, d => {
    modal(d, 0, [[1500, 0.6, 0.02], [2900, 0.3, 0.012], [4400, 0.2, 0.008]], 1.6);
    madera(d, 0, 0.78, 1.3, 1.6); thump(d, 0, 95, 55, 0.07, 0.6);
    modal(d, 0.004, [[300, 0.35, 0.12], [610, 0.2, 0.08]], 1);
    ruido(d, 0, 0.03, {t: 'lp', f: 2500, a: 0.0004, tau: 0.008, amp: 0.7});
  }, {var: 2, rev: 0.22, tope: 2});
  D('tabla_cae', 1.0, 0.45, d => {
    madera(d, 0, azar(1.4, 1.7), 1, 1.8); ruido(d, 0, 0.03, {t: 'hp', f: 1000, a: 0.0004, tau: 0.006, amp: 0.4});
    madera(d, 0.17, azar(1.6, 1.9), 0.5, 1.4); madera(d, 0.29, azar(1.7, 2.1), 0.25, 1);
    [0.37, 0.43, 0.47, 0.5, 0.52].forEach((t0, i) => madera(d, t0, azar(2.4, 3.2), 0.16*(1 - i*0.15), 0.6));
  }, {var: 3, rev: 0.18});
  /* la llave inglesa: el golpe de hierro, dos vueltas a la tuerca que chilla y el tintineo */
  D('llave', 1.2, 0.35, d => {
    metal(d, 0, azar(850, 1000), 1, 1.4); metal(d, 0.14, azar(1100, 1300), 0.35, 0.8);
    [0.32, 0.58].forEach(t0 => crujido(d, t0, 0.13, {tasa: (t, k) => 700 + 500*k, res: [[2400, 30, 1], [4800, 30, 0.4]], env: (t, k) => campana(k), amp: 0.25}));
    metal(d, 0.82, 2600, 0.15, 0.5);
  }, {var: 2, rev: 0.15});

  /* ---- electricidad */
  D('chispa', 0.45, 0.4, d => {
    crujido(d, 0, 0.4, {tasa: (t, k) => 1600*(1 - k) + 200, res: [[3000, 1, 1], [7000, 1, 0.7]], env: (t, k) => Math.exp(-k*4), amp: 0.6, jit: 0.9, bip: true});
    tono(d, 0, 0.3, {f: 120, w: 'q', t: 'hp', ff: 700, q: 0.7, jit: 0.08, a: 0.002, tau: 0.08, amp: 0.3});
    ruido(d, 0, 0.02, {t: 'hp', f: 1000, a: 0.0003, tau: 0.004, amp: 1});
  }, {alta: true, var: 3, rev: 0.12, tope: 3});
  D('choque', 0.75, 0.6, d => {
    tono(d, 0, 0.7, {f: 110, w: 'q', t: 'bp', ff: 1800, q: 0.7, jit: 0.05, a: 0.002, tau: 0.2, amp: 1});
    tono(d, 0, 0.3, {f: 2400, f1: 300, w: 'w', a: 0.002, tau: 0.12, amp: 0.4});
    crujido(d, 0, 0.35, {tasa: () => 2500, res: [[4000, 1, 1]], env: (t, k) => Math.exp(-k*3), amp: 0.3, jit: 0.9, bip: true});
    thump(d, 0.01, 80, 50, 0.08, 0.6); sat(d, 2.5);
  }, {var: 2, rev: 0.12, tope: 2});
  /* salta el fusible: golpe seco, el zumbido de la casa que se apaga y el silencio */
  D('fusible_salta', 1.5, 0.55, d => {
    thump(d, 0, 120, 60, 0.05, 1); clic(d, 0, 1.2, 1600);
    ruido(d, 0, 0.03, {t: 'hp', f: 800, a: 0.0003, tau: 0.008, amp: 0.8});
    crujido(d, 0, 0.12, {tasa: () => 1500, res: [[3500, 1, 1]], env: (t, k) => 1 - k, amp: 0.25, jit: 0.9, bip: true});
    tono(d, 0.01, 1.4, {f: 100, fm: (t, k) => 100 - 45*k, w: 'w', t: 'lp', ff: 1600, q: 0.7, env: (t, k) => 0.6*Math.exp(-t/0.35), amp: 1});
    tono(d, 0.01, 1.4, {f: 50, fm: (t, k) => 50 - 22*k, env: (t, k) => 0.15*Math.exp(-t/0.45), amp: 1});
  }, {rev: 0.2, tope: 1});
  D('fusible_ok', 1.1, 0.4, d => {
    clic(d, 0, 1, 1800); thump(d, 0, 140, 100, 0.02, 0.6);
    tono(d, 0.03, 1.0, {f: 60, fm: (t, k) => 60 + 40*suv(k*2.5), w: 'w', t: 'lp', ff: 1500, q: 0.7, env: (t, k) => 0.35*suv(k*3)*(1 - k), amp: 1});
    [0.25, 0.33, 0.45].forEach(t0 => tono(d, t0, 0.06, {f: 100, w: 'q', t: 'bp', ff: 1200, q: 0.8, a: 0.002, tau: 0.02, amp: 0.2}));
  }, {rev: 0.18, tope: 1});
  D('interruptor', 0.12, 0.22, d => { clic(d, 0, 1, 3200); clic(d, 0.009, 0.55, 2400); thump(d, 0, 200, 150, 0.008, 0.4); }, {var: 3, rev: 0.08});

  /* ---- puertas, placard y cerrojo */
  function bisagra(d, t0, dur, f, amp){
    crujido(d, t0, dur, {tasa: (t, k) => 170 + 430*Math.pow(Math.sin(Math.PI*k), 0.7)*(0.8 + 0.2*Math.sin(TAU*2.3*t)),
      res: [[f, 25, 1], [f*azar(2.1, 2.3), 30, 0.6], [f*azar(3.4, 3.7), 35, 0.3]], env: (t, k) => campana(k, 0.5)*(0.7 + 0.3*Math.sin(TAU*3*t)), amp, jit: 0.25});
  }
  D('puerta_abre', 1.35, 0.35, d => {
    clic(d, 0, 0.7, 1500); metal(d, 0.002, 2600, 0.2, 0.3);
    bisagra(d, 0.12, 1.1, azar(900, 1300), 0.6);
    ruido(d, 0.1, 1.1, {t: 'lp', f: 420, env: (t, k) => campana(k), amp: 0.2});
  }, {var: 3, rev: 0.2});
  D('puerta_cierra', 0.75, 0.45, d => {
    ruido(d, 0, 0.14, {t: 'lp', f: 500, env: (t, k) => k*k, amp: 0.25});
    madera(d, 0.12, 0.55, 1, 1.5); thump(d, 0.12, 90, 55, 0.06, 1);
    clic(d, 0.125, 0.8, 2000); metal(d, 0.126, 1800, 0.35, 0.5);
    madera(d, 0.2, 1.8, 0.15, 0.5);
  }, {var: 3, rev: 0.22});
  D('puerta_llave', 0.9, 0.35, d => {
    ruido(d, 0, 0.14, {t: 'bp', f: 3500, q: 2, env: (t, k) => campana(k), amp: 0.3});
    crujido(d, 0, 0.15, {tasa: () => 60, res: [[4200, 20, 1]], env: () => 1, amp: 0.25});
    clic(d, 0.35, 0.7, 2200); modal(d, 0.35, [[1400, 0.6, 0.04], [2900, 0.4, 0.03]], 1);
    ruido(d, 0.4, 0.14, {t: 'bp', f: 1600, q: 3, env: (t, k) => campana(k), amp: 0.3});
    thump(d, 0.55, 160, 110, 0.03, 0.6); modal(d, 0.55, [[900, 0.8, 0.06], [2100, 0.4, 0.04]], 0.8);
  }, {var: 2, rev: 0.18});
  D('placard_abre', 0.95, 0.3, d => {
    clic(d, 0, 0.5, 1400); thump(d, 0, 130, 90, 0.02, 0.4);
    crujido(d, 0.06, 0.7, {tasa: (t, k) => 120 + 180*Math.sin(Math.PI*k), res: [[azar(650, 800), 20, 1], [azar(1500, 1700), 25, 0.5]], env: (t, k) => campana(k, 0.6), amp: 0.5});
    ruido(d, 0.05, 0.7, {t: 'lp', f: 600, env: (t, k) => campana(k), amp: 0.2});
  }, {var: 2, rev: 0.12});
  D('placard_cierra', 0.55, 0.35, d => {
    ruido(d, 0, 0.12, {t: 'lp', f: 600, env: (t, k) => k, amp: 0.2});
    madera(d, 0.1, 1.1, 0.8, 1); thump(d, 0.1, 120, 80, 0.03, 0.6); clic(d, 0.105, 0.5, 1800);
  }, {var: 2, rev: 0.12});

  /* ---- el combustible y el generador */
  D('bidon_agarrar', 0.75, 0.3, d => {
    modal(d, 0, [[210, 1, 0.05], [470, 0.6, 0.04], [960, 0.3, 0.02]], 1); thump(d, 0, 90, 70, 0.04, 0.5);
    ruido(d, 0.05, 0.5, {t: 'bp', f: 500, fm: t => 450 + 280*Math.sin(TAU*5*t), q: 3, env: (t, k) => envAD(t, 0.05, 0.15), amp: 0.5});
    ruido(d, 0.3, 0.35, {t: 'bp', f: 600, fm: t => 500 + 200*Math.sin(TAU*6*t), q: 3, env: (t, k) => envAD(t, 0.04, 0.1), amp: 0.25});
  }, {var: 2, rev: 0.1});
  D('combustible', 1.6, 0.35, d => {
    let t = 0.03;
    while(t < 1.45){ const f0 = azar(160, 320), a = azar(0.5, 1);
      tono(d, t, 0.08, {f: f0, fm: tt => f0*(1 + 24*tt), a: 0.003, tau: 0.022, amp: a});
      thump(d, t, 95, 70, 0.02, a*0.25); t += azar(0.12, 0.21); }
    ruido(d, 0, 1.6, {t: 'bp', f: 1200, q: 1, env: (tt, k) => Math.min(1, tt*20)*(0.8 + 0.2*Math.sin(TAU*7*tt))*(k > 0.9 ? (1 - k)*10 : 1), amp: 0.18});
    ruido(d, 0, 1.6, {t: 'bp', f: 350, q: 4, env: (tt, k) => Math.min(1, tt*10)*(k > 0.9 ? (1 - k)*10 : 1), amp: 0.12});
  }, {var: 2, rev: 0.12, tope: 1});
  /* un tiempo del motor: la explosión, el escape y el taqueo de válvulas */
  function pulsoMotor(d, t0, amp, br){
    thump(d, t0, 85, 52, 0.012, amp);
    ruido(d, t0, 0.04, {t: 'lp', f: 900, a: 0.0006, tau: 0.01, amp: amp*0.5});
    ruido(d, t0 + 0.003, 0.02, {t: 'bp', f: 2200, q: 1.5, a: 0.0004, tau: 0.004, amp: amp*0.4*(br || 1)});
    ruido(d, t0, 0.03, {t: 'bp', f: 700, q: 1.2, a: 0.0005, tau: 0.008, amp: amp*0.9});
    ruido(d, t0 + 0.006, 0.03, {t: 'bp', f: 1900, q: 2, a: 0.0005, tau: 0.01, amp: amp*0.3});
    clic(d, t0 + 0.012, amp*0.1, 3000);
  }
  D('generador_arranca', 3.0, 0.5, d => {
    ruido(d, 0, 0.36, {t: 'bp', f: 500, f1: 2500, q: 2, env: (t, k) => campana(k, 0.6), amp: 0.5});
    crujido(d, 0, 0.35, {tasa: () => 90, res: [[2500, 10, 1]], env: (t, k) => campana(k), amp: 0.2});
    [0.42, 0.55, 0.61, 0.8].forEach((t0, i) => pulsoMotor(d, t0, [0.7, 0.4, 0.9, 0.6][i], 1));
    let t = 0.92;
    while(t < 2.95){ const k = (t - 0.92)/0.8, hz = lerp(12, 30, suv(k)), a = t < 2.6 ? 0.55 + 0.35*suv(k) : 0.9*(2.95 - t)/0.35;
      pulsoMotor(d, t + azar(-0.002, 0.002), a*azar(0.85, 1), 1); t += 1/hz; }
    ruido(d, 0.92, 2.05, {c: 'p', t: 'lp', f: 180, env: (tt, k) => suv(tt*2)*(1 - suv((k - 0.8)*5)), amp: 0.5});
  }, {rev: 0.2, tope: 1});
  D('generador_tose', 1.6, 0.45, d => {
    let t = 0;
    while(t < 1.5){ const k = t/1.5, hz = 26 - 14*Math.sin(Math.PI*k*1.3)*Math.sin(TAU*1.7*k), falla = Math.random() < 0.3;
      if(!falla) pulsoMotor(d, t, azar(0.4, 0.95), 1.3); t += 1/Math.max(8, hz)*(falla ? 1.8 : 1); }
    ruido(d, 1.0, 0.1, {t: 'hp', f: 600, a: 0.0005, tau: 0.02, amp: 1.2}); thump(d, 1.0, 110, 50, 0.04, 1);
  }, {var: 2, rev: 0.2, tope: 1});
  D('generador_para', 2.3, 0.45, d => {
    let t = 0, hz = 28;
    while(t < 1.8){ const k = t/1.8; pulsoMotor(d, t, (1 - k*0.7)*azar(0.8, 1), 1); hz = 28*Math.pow(1 - k, 1.4) + 3.5; t += 1/hz; }
    thump(d, 1.85, 90, 50, 0.05, 0.6); metal(d, 1.86, 620, 0.25, 1.2);
    ruido(d, 0, 1.9, {c: 'p', t: 'lp', f: 160, env: (tt, k) => (1 - k)*(1 - k), amp: 0.45});
  }, {rev: 0.2, tope: 1});

  /* ---- aparatos de la casa */
  D('radio_on', 0.9, 0.3, d => {
    clic(d, 0, 0.9, 2600);
    ruido(d, 0.03, 0.85, {t: 'bp', f: 1800, q: 0.6, env: (t, k) => Math.min(1, t/0.15)*Math.exp(-t/0.6), amp: 0.6});
    crujido(d, 0.03, 0.8, {tasa: () => 40, res: [[3000, 2, 1]], env: (t, k) => 1 - k, amp: 0.35, jit: 0.9, bip: true});
    tono(d, 0.08, 0.55, {f: 2400, f1: 900, env: (t, k) => campana(k), amp: 0.08});
  }, {rev: 0.1, tope: 1});
  D('tele_on', 1.1, 0.35, d => {
    thump(d, 0, 120, 80, 0.03, 0.8); clic(d, 0, 0.6, 1500);
    tono(d, 0.01, 0.9, {f: 60, w: 'w', t: 'lp', ff: 400, q: 0.8, a: 0.02, tau: 0.25, amp: 0.5, vib: [8, 0.1]});
    tono(d, 0.05, 1.05, {f: 15625, a: 0.1, tau: 2, amp: 0.025});
    ruido(d, 0.2, 0.9, {t: 'hp', f: 1200, env: (t, k) => Math.min(1, t/0.2)*(1 - k), amp: 0.35});
  }, {alta: true, rev: 0.1, tope: 1});
  /* el teléfono viejo: dos campanas y el badajo que las golpea veinte veces por segundo */
  const CAMP_A = [[1180, 1, 0.6], [2480, 0.5, 0.35], [3900, 0.3, 0.2], [5430, 0.15, 0.12]];
  const CAMP_B = CAMP_A.map(([f, a, t]) => [f*1.12, a, t]);
  D('telefono_suena', 2.1, 0.45, d => {
    const n = Math.round(1.0*SR), exA = new Float32Array(n), exB = new Float32Array(n);
    for(let h = 0; h < 20; h++){ const i = Math.round(h*0.05*SR) + Math.floor(Math.random()*40); (h % 2 ? exB : exA)[i] += azar(0.8, 1); }
    resonar(d, 0, exA, CAMP_A, 0.5, d.length); resonar(d, 0, exB, CAMP_B, 0.5, d.length);
    tono(d, 0, 1.0, {f: 20, w: 'q', t: 'bp', ff: 300, q: 1, env: () => 1, amp: 0.02});
  }, {rev: 0.2, tope: 2});
  D('telefono_cuelga', 0.6, 0.35, d => {
    thump(d, 0, 150, 90, 0.03, 1); modal(d, 0, [[700, 0.5, 0.03], [1500, 0.3, 0.02]], 1);
    modal(d, 0.005, CAMP_A.map(([f, a, t]) => [f, a, t*0.5]), 0.12); clic(d, 0.05, 0.6, 2400);
  }, {rev: 0.15});
  D('pc_on', 2.0, 0.3, d => {
    clic(d, 0, 1, 1800); thump(d, 0, 120, 90, 0.02, 0.5);
    ruido(d, 0.05, 1.9, {t: 'bp', f: 200, f1: 900, q: 1.2, env: (t, k) => suv(k*1.5)*0.9, amp: 0.3});
    tono(d, 0.05, 1.9, {f: 50, f1: 120, w: 'w', t: 'lp', ff: 600, q: 0.7, env: (t, k) => suv(k*2), amp: 0.1});
    tono(d, 1.2, 0.2, {f: 1000, w: 'q', t: 'lp', ff: 4000, q: 0.7, env: (t, k) => k < 0.9 ? 1 : (1 - k)*10, amp: 0.4});
  }, {rev: 0.1, tope: 1});
  D('camara_cambio', 0.35, 0.3, d => {
    clic(d, 0, 0.7, 2800);
    const i0 = d.length; ruido(d, 0.004, 0.3, {t: 'hp', f: 700, a: 0.002, tau: 0.09, amp: 1});
    for(let i = 0, h = 0; i < i0; i++){ if(i % 6 === 0) h = Math.round(d[i]*12)/12; d[i] = h; }
    tono(d, 0.02, 0.03, {f: 1400, w: 'q', a: 0.001, tau: 0.02, amp: 0.1});
  }, {alta: true, var: 2, rev: 0.05, tope: 2});
  D('camara_instalar', 0.3, 0.25, d => {
    clic(d, 0, 0.5, 2500);
    tono(d, 0.05, 0.07, {f: 1800, env: (t, k) => k < 0.85 ? 1 : (1 - k)*6.6, amp: 0.5});
    tono(d, 0.14, 0.08, {f: 2400, env: (t, k) => k < 0.85 ? 1 : (1 - k)*6.6, amp: 0.5});
  }, {rev: 0.08});
  /* el reloj: una varilla de gong con martillo de fieltro; a las doce, la campana grave */
  D('hora', 3.0, 0.3, d => {
    modal(d, 0, [[392, 1, 1.6], [392*2.76, 0.35, 0.6], [392*5.4, 0.12, 0.25], [392.8, 0.5, 1.4]], 1);
    ruido(d, 0, 0.02, {t: 'lp', f: 1500, a: 0.001, tau: 0.004, amp: 0.3});
  }, {rev: 0.3});
  D('medianoche', 6.5, 0.55, d => {
    const f = 116.5;
    modal(d, 0, [[f*0.5, 0.35, 5], [f*0.502, 0.18, 4.6], [f, 1, 4], [f*1.19, 0.7, 3], [f*1.5, 0.5, 2.5], [f*2, 1, 2.2], [f*2.66, 0.7, 1.4], [f*3.01, 0.6, 1.1], [f*4.2, 0.45, 0.7], [f*5.4, 0.3, 0.45], [f*6.8, 0.18, 0.3]], 1);
    ruido(d, 0, 0.05, {t: 'lp', f: 2000, a: 0.001, tau: 0.01, amp: 0.4});
  }, {rev: 0.4, tope: 1});
  D('objetivo', 0.9, 0.2, d => {
    tono(d, 0, 0.8, {f: 659.3, a: 0.01, tau: 0.25, amp: 0.8}); tono(d, 0, 0.8, {f: 1318.5, a: 0.01, tau: 0.12, amp: 0.15});
    tono(d, 0.12, 0.75, {f: 987.8, a: 0.01, tau: 0.25, amp: 0.7});
  }, {rev: 0.25, tope: 1});
  D('boton', 0.08, 0.2, d => { clic(d, 0, 0.8, 3000); tono(d, 0, 0.06, {f: 1200, a: 0.001, tau: 0.012, amp: 0.2}); }, {ui: true, tope: 2});
  D('boton_atras', 0.1, 0.18, d => { clic(d, 0, 0.8, 1800); tono(d, 0, 0.08, {f: 700, a: 0.001, tau: 0.015, amp: 0.25}); }, {ui: true, tope: 2});
  D('bocina', 0.7, 0.45, d => {
    const env = (t, k) => Math.min(1, t/0.01)*(k < 0.85 ? 1 : (1 - k)/0.15);
    tono(d, 0, 0.62, {f: 415, w: 'q', t: 'bp', ff: 1500, q: 0.8, env, amp: 0.6});
    tono(d, 0, 0.62, {f: 522, w: 'q', t: 'bp', ff: 1500, q: 0.8, env, amp: 0.5}); sat(d, 1.5);
  }, {rev: 0.35, lugar: 'afuera', tope: 1});
  /* un auto que pasa: motor y cubiertas, con el efecto Doppler al cruzar */
  function autoPasa(d, dur, tc, lp){
    const dop = t => 1 + 0.06*Math.tanh(-(t - tc)/0.4), env = t => 1/(1 + Math.pow((t - tc)/0.7, 2));
    tono(d, 0, dur, {f: 38, fm: t => 38*dop(t), w: 'w', t: 'lp', ff: lp*1.5, q: 0.7, env, amp: 0.6});
    tono(d, 0, dur, {f: 76, fm: t => 76*dop(t), w: 'w', t: 'lp', ff: lp*1.5, q: 0.7, env, amp: 0.3});
    ruido(d, 0, dur, {t: 'bp', f: 700, fm: t => 700*dop(t), q: 0.6, env, amp: 1.0});
    ruido(d, 0, dur, {c: 'r', t: 'lp', f: lp*1.5, env: t => env(t)*0.5, amp: 0.4});
  }
  D('auto_pasa', 4.5, 0.35, d => autoPasa(d, 4.5, 2.2, 900), {rev: 0.3, lugar: 'afuera', tope: 2});

  /* ---- el bicho. La respiración es lo que te dice por dónde va a entrar: tiene que dar asco */
  function respiracion(d, t0, dur, a){
    const ti = dur*0.4, tp = dur*0.06, te = dur*0.52, t1 = t0 + ti + tp;
    /* inhala: el aire que entra por una garganta mojada */
    garganta(d, t0, ti, {f0: (t, k) => 50 + 12*k, mez: 0.82, voc: (t, k) => mezV([460, 900, 2250], [600, 1200, 2600], k),
      q: [4, 5, 7], jit: 0.2, sub: 0.4, env: (t, k) => k < 0.8 ? suv(k/0.8) : (1 - k)/0.2, amp: 0.6*a, rugo: [26, 0.35]});
    crujido(d, t0 + ti*0.2, ti*0.8, {tasa: () => 30, res: [[azar(250, 400), 12, 1], [azar(700, 950), 10, 0.5]], env: (t, k) => campana(k), amp: 0.3*a, jit: 0.7});
    /* exhala: el gruñido que sale con el aire, y el pecho que retumba */
    garganta(d, t1, te, {f0: (t, k) => 44 - 8*k, mez: 0.5, voc: (t, k) => mezV([500, 860, 2200], [420, 760, 2100], k),
      q: [4, 6, 8], jit: 0.3, sub: 0.7, env: (t, k) => Math.min(1, k/0.08)*Math.pow(1 - k, 1.2), amp: a, rugo: [31, 0.45]});
    crujido(d, t1, te*0.9, {tasa: () => 34, res: [[azar(280, 380), 10, 1], [azar(1000, 1300), 8, 0.4]], env: (t, k) => 1 - k, amp: 0.3*a, jit: 0.7});
    ruido(d, t1, te, {t: 'lp', f: 300, env: (t, k) => Math.min(1, k/0.1)*(1 - k), amp: 0.3*a});
  }
  D('m_respira', 2.6, 0.8, d => { respiracion(d, 0, 2.5, 1); sat(d, 1.5); }, {var: 2, vr: 0.04, rev: 0.25, tope: 2});
  D('m_grunido', 1.3, 0.7, d => {
    garganta(d, 0, 1.25, {f0: (t, k) => 60 + 22*Math.sin(Math.PI*k), mez: 0.25, voc: (t, k) => mezV([460, 850, 2150], [520, 950, 2300], campana(k)),
      q: [4, 6, 8], jit: 0.3, sub: 0.8, env: (t, k) => Math.min(1, k/0.08)*(k > 0.6 ? (1 - k)/0.4 : 1), amp: 1, rugo: [30, 0.5]});
    ruido(d, 0, 1.25, {t: 'lp', f: 250, env: (t, k) => campana(k), amp: 0.3});
    sat(d, 2);
  }, {var: 3, rev: 0.22, tope: 2});
  /* el grito: dos gargantas desafinadas entre sí que suben de golpe, un rugido abajo, y todo saturado */
  function grito(d, t0, dur, o){
    const f0 = o.f || 330, fmax = o.fmax || 720;
    const alto = (t, k) => (f0 + (fmax - f0)*suv(k/0.22))*(k > 0.7 ? 1 - 0.35*(k - 0.7)/0.3 : 1);
    const env = (t, k) => Math.min(1, k/0.03)*(k > 0.72 ? Math.pow((1 - k)/0.28, 1.5) : 1);
    const voc = (t, k) => mezV([820, 1250, 2700], [960, 1480, 2950], suv(k*2));
    garganta(d, t0, dur, {f0: alto, mez: 0.22, voc, q: [3.5, 4.5, 6], jit: 0.12, env, amp: 1, rugo: [55, 0.3], sub: o.sub || 0});
    garganta(d, t0 + 0.01, dur, {f0: (t, k) => alto(t, k)*1.07, mez: 0.3, voc: (t, k) => voc(t, k).map(v => v*1.08), q: [3, 4, 5], jit: 0.18, env, amp: 0.7, rugo: [41, 0.35]});
    garganta(d, t0, dur, {f0: (t, k) => 95 + 20*k, mez: 0.4, voc: [620, 1050, 2450], q: [4, 5, 6], jit: 0.25, sub: 0.8, env, amp: 0.5});
    ruido(d, t0, dur, {t: 'bp', f: 3200, q: 0.8, env, amp: 0.25});
  }
  D('m_grito', 1.6, 0.85, d => { grito(d, 0, 1.55, {}); sat(d, 2.2); }, {var: 2, vr: 0.04, rev: 0.3, tope: 2});
  D('m_grito_lejos', 3.4, 0.4, d => {
    grito(d, 0, 1.6, {f: 300, fmax: 650}); sat(d, 2);
    const e1 = Math.round(0.29*SR), e2 = Math.round(0.63*SR);            /* el eco del barrio, dos rebotes */
    for(let i = d.length - 1; i >= e1; i--){ d[i] += d[i - e1]*0.35; if(i >= e2) d[i] += d[i - e2]*0.18; }
    filt(d, 'lp', 1700, 0.7); filt(d, 'hp', 180, 0.7);
  }, {var: 1, rev: 0.9, lugar: 'afuera', seco: 0.45, tope: 2});
  D('m_paso', 0.55, 0.6, d => {
    thump(d, 0, azar(65, 75), 36, 0.07, 0.8); madera(d, 0.002, azar(0.55, 0.65), 1, 1.3);
    modal(d, 0.003, [[azar(620, 900), 0.4, 0.035]], 1);
    ruido(d, 0, 0.12, {t: 'lp', f: 350, a: 0.002, tau: 0.04, amp: 0.8});
    if(Math.random() < 0.7) clic(d, azar(0.015, 0.03), 0.3, 3500);
    ruido(d, 0.002, 0.08, {t: 'bp', f: azar(250, 380), q: 1.2, a: 0.002, tau: 0.03, amp: 1.2});
    if(Math.random() < 0.5) crujido(d, 0.03, 0.25, {tasa: (t, k) => 40 + 80*k, res: [[azar(350, 500), 15, 1], [azar(900, 1100), 18, 0.4]], env: (t, k) => campana(k), amp: 0.3});
  }, {var: 5, vr: 0.05, rev: 0.15, tope: 4});
  D('m_paso_pasto', 0.5, 0.45, d => {
    thump(d, 0, azar(55, 65), 38, 0.06, 0.8);
    crujido(d, 0.003, 0.16, {tasa: (t, k) => 600*(1 - k) + 100, res: [[3200, 2, 1], [6000, 2, 0.5]], env: (t, k) => 1 - k, amp: 0.9, jit: 0.6});
    ruido(d, 0, 0.3, {t: 'bp', f: 2500, q: 0.7, a: 0.01, tau: 0.08, amp: 0.7});
    ruido(d, 0, 0.1, {t: 'bp', f: 350, q: 1, a: 0.002, tau: 0.03, amp: 0.4});
    ruido(d, 0, 0.1, {t: 'lp', f: 400, a: 0.002, tau: 0.03, amp: 0.6});
  }, {var: 5, vr: 0.05, rev: 0.08, tope: 4});
  D('m_corre', 0.55, 0.6, d => {
    [0, 0.085 + azar(0, 0.02), 0.19 + azar(0, 0.03)].forEach(t0 => { const a = azar(0.7, 1);
      thump(d, t0, 75, 45, 0.04, a); madera(d, t0, 0.7, a*0.45, 0.8); ruido(d, t0, 0.06, {t: 'lp', f: 500, a: 0.001, tau: 0.02, amp: a*0.6});
      ruido(d, t0 + 0.005, 0.05, {t: 'bp', f: 3000, q: 2, a: 0.002, tau: 0.015, amp: a*0.25}); });
    garganta(d, 0.26, 0.22, {f0: 70, mez: 0.8, voc: [500, 900, 2300], jit: 0.2, env: (t, k) => campana(k), amp: 0.25});
  }, {var: 4, vr: 0.04, rev: 0.12, tope: 3});
  /* el vidrio: el estallido, el cuerpo del estallido y cuarenta pedazos que caen */
  function vidrioRompe(d, t0, a){
    ruido(d, t0, 0.05, {t: 'hp', f: 1500, a: 0.0003, tau: 0.02, amp: 1.2*a});
    thump(d, t0, 150, 60, 0.03, 0.6*a);
    ruido(d, t0, 0.5, {t: 'bp', f: 5000, q: 0.5, a: 0.001, tau: 0.18, amp: 0.6*a});
    for(let i = 0; i < 42; i++){ const tt = 0.005 + Math.pow(Math.random(), 1.8)*1.3;
      vidrio(d, t0 + tt, azar(2200, 6500), a*azar(0.2, 0.7)*(1 - 0.6*tt/1.3), azar(0.02, 0.09)); }
    for(let i = 0; i < 7; i++) clic(d, t0 + azar(0.3, 1.2), a*azar(0.1, 0.3), azar(3500, 5500));
  }
  D('vidrio_rompe', 1.6, 0.8, d => vidrioRompe(d, 0, 1), {alta: true, var: 2, rev: 0.3, tope: 2});
  D('tabla_golpe', 0.65, 0.7, d => {
    madera(d, 0, azar(0.7, 0.8), 1.3, 2); thump(d, 0, 100, 60, 0.05, 0.6);
    ruido(d, 0, 0.06, {t: 'bp', f: azar(450, 600), q: 1.2, a: 0.0006, tau: 0.02, amp: 1});
    ruido(d, 0, 0.05, {t: 'lp', f: 800, a: 0.0005, tau: 0.02, amp: 0.8});
    modal(d, 0.01, [[2300, 0.4, 0.05], [3700, 0.25, 0.03]], 1); modal(d, 0.002, [[azar(600, 750), 0.5, 0.05]], 1);
    if(Math.random() < 0.5) crujido(d, 0.1, 0.25, {tasa: (t, k) => 60 + 150*k, res: [[600, 20, 1], [1500, 20, 0.4]], env: (t, k) => campana(k), amp: 0.25});
    ruido(d, 0.01, 0.3, {t: 'hp', f: 3000, a: 0.005, tau: 0.08, amp: 0.1});
  }, {var: 3, rev: 0.2, tope: 3});
  /* la tabla que se arranca: la madera que se tensa, el clavo que chilla, el astillazo y lo que cae */
  D('tabla_arranca', 1.4, 0.7, d => {
    crujido(d, 0, 0.55, {tasa: (t, k) => 60 + 340*k*k, res: [[500, 12, 1], [1100, 15, 0.6], [2500, 15, 0.3]], env: (t, k) => 0.3 + 0.7*k, amp: 0.5});
    tono(d, 0.32, 0.42, {f: 1400, f1: 2600, jit: 0.08, vib: [30, 0.02], env: (t, k) => campana(k), amp: 0.12});
    crujido(d, 0.32, 0.4, {tasa: () => 1200, res: [[2800, 40, 1]], env: (t, k) => campana(k), amp: 0.15});
    ruido(d, 0.5, 0.06, {t: 'hp', f: 800, a: 0.0005, tau: 0.015, amp: 1.1}); madera(d, 0.5, 0.9, 0.8, 1.2);
    crujido(d, 0.5, 0.45, {tasa: (t, k) => 3000*(1 - k) + 300, res: [[1800, 3, 1], [3500, 3, 0.6], [900, 4, 0.5]], env: (t, k) => Math.exp(-k*3.5), amp: 0.7, jit: 0.8, bip: true});
    madera(d, 1.0, 1.5, 0.5, 1.2); madera(d, 1.12, 2.8, 0.15, 0.6); madera(d, 1.2, 3.4, 0.1, 0.5);
  }, {var: 2, rev: 0.22, tope: 2});
  D('m_rasguna', 1.6, 0.5, d => {
    [0, 0.48, 1.0].forEach(t0 => { const du = azar(0.28, 0.4);
      crujido(d, t0, du, {tasa: (t, k) => 300 + 400*k, res: [[azar(1800, 2600), 6, 1], [azar(3500, 4500), 5, 0.7], [900, 5, 0.4]], env: (t, k) => campana(k, 0.6), amp: 0.5, jit: 0.4, bip: true});
      ruido(d, t0, du, {t: 'bp', f: 2000, f1: 3500, q: 1.5, env: (t, k) => campana(k, 0.8), amp: 0.35});
      crujido(d, t0, du, {tasa: () => 90, res: [[500, 12, 1]], env: (t, k) => campana(k), amp: 0.15}); });
  }, {var: 2, rev: 0.2, tope: 2});
  D('m_toca_vidrio', 1.6, 0.45, d => {
    [0, 0.38, 0.76, 1.25].forEach((t0, i) => { const a = i === 3 ? 0.4 : 1;
      vidrio(d, t0, azar(2600, 3000), 0.6*a, 0.05); ruido(d, t0, 0.01, {t: 'hp', f: 4000, a: 0.0002, tau: 0.002, amp: 0.6*a});
      modal(d, t0, [[180, 0.3, 0.06], [420, 0.2, 0.04]], a); });
  }, {alta: true, var: 2, rev: 0.2, tope: 2});
  D('m_trepa', 2.3, 0.55, d => {
    [0, 0.45, 0.8, 1.3, 1.72].forEach(t0 => { const a = azar(0.6, 1);
      madera(d, t0, azar(0.7, 0.9), 0.7*a, 1.2); thump(d, t0, 90, 60, 0.05, 0.6*a);
      ruido(d, t0 + 0.05, 0.28, {t: 'bp', f: 1400, q: 1, env: (t, k) => campana(k), amp: 0.35*a});
      crujido(d, t0 + 0.05, 0.25, {tasa: () => 200, res: [[2200, 5, 1]], env: (t, k) => campana(k), amp: 0.2*a, jit: 0.5}); });
    metal(d, 1.31, 620, 0.3, 2);
    garganta(d, 0.9, 0.5, {f0: 58, mez: 0.6, voc: [480, 850, 2200], jit: 0.3, sub: 0.6, env: (t, k) => campana(k), amp: 0.3, rugo: [30, 0.4]});
  }, {var: 1, rev: 0.2, tope: 1});
  D('m_entra', 2.1, 0.85, d => {
    vidrioRompe(d, 0, 0.8);
    crujido(d, 0.04, 0.35, {tasa: (t, k) => 2500*(1 - k) + 300, res: [[1800, 3, 1], [3500, 3, 0.6], [900, 4, 0.5]], env: (t, k) => Math.exp(-k*3), amp: 0.6, jit: 0.8, bip: true});
    madera(d, 0.05, 0.9, 0.7, 1.2);
    thump(d, 0.45, 60, 32, 0.1, 1.3); madera(d, 0.45, 0.5, 1, 1.5); ruido(d, 0.45, 0.2, {t: 'lp', f: 400, a: 0.001, tau: 0.06, amp: 0.8});
    for(let i = 0; i < 6; i++) madera(d, 0.5 + azar(0.05, 0.5), azar(2.5, 4), azar(0.05, 0.15), 0.5);
    garganta(d, 0.7, 0.9, {f0: (t, k) => 55 + 15*Math.sin(Math.PI*k), mez: 0.35, voc: [470, 840, 2200], jit: 0.3, sub: 0.8, env: (t, k) => campana(k, 0.7), amp: 0.45, rugo: [30, 0.5]});
  }, {alta: true, var: 1, rev: 0.25, tope: 1});
  D('m_olfatea', 1.3, 0.45, d => {
    [[0, 1], [0.16, 0.8], [0.3, 0.9], [0.55, 1.1]].forEach(([t0, a], i) =>
      garganta(d, t0, i === 3 ? 0.18 : 0.1, {f0: 100, mez: 1, voc: [1100, 2600, 3800], q: [5, 7, 9], env: t => envAD(t, 0.02, 0.05), amp: 0.8*a}));
    crujido(d, 0, 0.75, {tasa: () => 80, res: [[500, 6, 1]], env: (t, k) => 1 - k, amp: 0.1, jit: 0.8});
    garganta(d, 0.9, 0.25, {f0: 90, mez: 0.95, voc: [600, 1300, 2600], env: t => envAD(t, 0.01, 0.06), amp: 0.6});
  }, {var: 2, rev: 0.15, tope: 2});
  /* el susurro: ruido por formantes que cambian al azar, dos bocas un poco corridas */
  D('m_susurro', 2.3, 0.35, d => {
    let t = 0.05; const vs = ['a', 'e', 'i', 'o', 'u'];
    while(t < 2.0){ const du = azar(0.12, 0.24), A = VOC[elegir(vs)], B = VOC[elegir(vs)];
      if(Math.random() < 0.35) ruido(d, t, 0.08, {t: 'hp', f: 4500, a: 0.01, tau: 0.03, amp: 0.35});
      garganta(d, t + 0.02, du, {f0: 100, mez: 1, voc: (tt, k) => mezV(A, B, k), q: [5, 6, 7], env: (tt, k) => campana(k, 0.6), amp: azar(0.6, 1)});
      garganta(d, t + 0.05, du, {f0: 100, mez: 1, voc: (tt, k) => mezV(A, B, k).map(v => v*0.82), q: [5, 6, 7], env: (tt, k) => campana(k, 0.6), amp: 0.35});
      t += du + azar(0.02, 0.12); }
  }, {var: 2, rev: 0.3, tope: 1});
  D('toc_toc', 2.2, 0.6, d => {
    [0, 0.75, 1.5].forEach((t0, i) => { const a = 0.9 + i*0.1;
      madera(d, t0, 0.8, a, 1.4); clic(d, t0, 0.8*a, 1200); thump(d, t0, 120, 80, 0.03, 0.6*a);
      modal(d, t0, [[180, 0.5, 0.08], [360, 0.45, 0.06], [620, 0.35, 0.04], [1100, 0.2, 0.02]], a); });
  }, {rev: 0.3, tope: 1});
  D('puerta_golpe', 1.0, 0.8, d => {
    thump(d, 0, 70, 35, 0.1, 1.4); madera(d, 0, 0.5, 1.2, 1.8);
    ruido(d, 0, 0.04, {t: 'hp', f: 1000, a: 0.0004, tau: 0.01, amp: 0.6});
    [0.02, 0.06, 0.1, 0.15].forEach((t0, i) => modal(d, t0, [[1900, 0.8, 0.04], [2800, 0.6, 0.03]], 1 - i*0.2));
    crujido(d, 0.1, 0.3, {tasa: (t, k) => 80 + 200*k, res: [[700, 20, 1], [1600, 20, 0.4]], env: (t, k) => campana(k), amp: 0.2});
    ruido(d, 0.02, 0.4, {t: 'hp', f: 2500, a: 0.01, tau: 0.1, amp: 0.1});
  }, {var: 3, rev: 0.25, tope: 2});
  D('puerta_rompe', 2.2, 0.85, d => {
    thump(d, 0, 70, 32, 0.12, 1.5); madera(d, 0, 0.5, 1.3, 1.8);
    ruido(d, 0, 0.06, {t: 'hp', f: 900, a: 0.0004, tau: 0.015, amp: 1});
    crujido(d, 0.02, 0.5, {tasa: (t, k) => 3000*(1 - k) + 200, res: [[1600, 3, 1], [3200, 3, 0.6], [800, 4, 0.5]], env: (t, k) => Math.exp(-k*3), amp: 1.4, jit: 0.8, bip: true});
    thump(d, 0.7, 55, 30, 0.12, 1.2); madera(d, 0.7, 0.45, 1, 1.6); ruido(d, 0.7, 0.3, {t: 'lp', f: 600, a: 0.001, tau: 0.08, amp: 1});
    for(let i = 0; i < 8; i++) madera(d, 0.8 + azar(0, 0.8), azar(3, 5), azar(0.05, 0.14), 0.5);
    metal(d, 0.9, 1400, 0.2, 1);
  }, {var: 1, rev: 0.25, tope: 1});

  /* ---- los sustos */
  D('susto', 2.1, 1.0, d => {
    thump(d, 0, 95, 28, 0.35, 1.6);
    ruido(d, 0, 0.5, {t: 'lp', f: 6000, a: 0.0008, tau: 0.12, amp: 1});
    ruido(d, 0, 1.5, {c: 'p', t: 'lp', f: 200, a: 0.002, tau: 0.3, amp: 0.8});
    grito(d, 0.005, 1.95, {f: 480, fmax: 900, sub: 0.5});
    [1480, 1568, 1661, 2217].forEach(f => tono(d, 0, 1.6, {f, w: 'w', t: 'bp', ff: 2500, q: 0.8, jit: 0.02, a: 0.005, tau: 0.6, amp: 0.25}));
    ruido(d, 0, 1.2, {t: 'bp', f: 3500, q: 0.5, a: 0.002, tau: 0.6, amp: 0.5});
    sat(d, 3.2);
  }, {golpe: true, tope: 1, rev: 0.25, vr: 0.01, vv: 0});
  D('susto_corto', 1.1, 0.8, d => {
    [987.8, 1046.5, 1108.7, 1318.5, 1396.9].forEach(f => tono(d, 0, 1.05, {f, w: 'w', t: 'bp', ff: 2400, q: 0.9, jit: 0.015, vib: [9, 0.01], a: 0.004, tau: 0.35, amp: 0.3}));
    ruido(d, 0, 0.8, {t: 'bp', f: 2500, q: 1, a: 0.004, tau: 0.25, amp: 0.3});
    thump(d, 0, 80, 40, 0.15, 0.8); sat(d, 2);
  }, {tope: 2, rev: 0.3, vr: 0.02});
  D('golpe_seco', 2.6, 0.8, d => {
    [36.7, 55, 77.8, 116.5, 155.6, 233.1].forEach((f, i) => tono(d, 0, 2.5, {f, w: 'w', t: 'lp', ff: 900, q: 0.7, a: 0.003, tau: 0.7, amp: 0.4 - i*0.04}));
    thump(d, 0, 70, 30, 0.25, 1.2);
    ruido(d, 0, 0.3, {t: 'lp', f: 1500, a: 0.001, tau: 0.08, amp: 0.5});
    ruido(d, 0, 2.5, {c: 'p', t: 'lp', f: 150, a: 0.005, tau: 0.6, amp: 0.5});
    sat(d, 1.8);
  }, {tope: 2, rev: 0.3, vr: 0.01});
  /* el corazón: lub y dub */
  const lub = (d, t0, a) => { thump(d, t0, 58, 36, 0.09, a); thump(d, t0, 180, 110, 0.03, a*0.35); ruido(d, t0, 0.15, {t: 'lp', f: 180, a: 0.003, tau: 0.05, amp: a*0.4}); ruido(d, t0, 0.08, {t: 'bp', f: 320, q: 1.4, a: 0.003, tau: 0.02, amp: a*0.6}); };
  const dub = (d, t0, a) => { thump(d, t0, 70, 44, 0.07, a); thump(d, t0, 210, 130, 0.025, a*0.3); ruido(d, t0, 0.12, {t: 'lp', f: 220, a: 0.003, tau: 0.04, amp: a*0.3}); ruido(d, t0, 0.07, {t: 'bp', f: 380, q: 1.4, a: 0.003, tau: 0.018, amp: a*0.5}); };
  D('latido_fuerte', 0.9, 0.85, d => { lub(d, 0, 1.3); dub(d, 0.3, 1); sat(d, 1.3); }, {tope: 2, rev: 0.05, vr: 0.02, cuerpo: true});
  D('_lub', 0.5, 0.6, d => lub(d, 0, 1), {var: 2, cuerpo: true, rev: 0, tope: 3});
  D('_dub', 0.4, 0.45, d => dub(d, 0, 1), {var: 2, cuerpo: true, rev: 0, tope: 3});

  /* ---- lo que pasa alrededor (los tira el ambiente) */
  D('_perro', 2.2, 0.3, d => {
    let t = 0.05; const n = 2 + Math.floor(Math.random()*3), f = azar(380, 520);
    for(let i = 0; i < n; i++){
      garganta(d, t, 0.17, {f0: (tt, k) => f*(1.1 - 0.25*k), mez: 0.3, voc: (tt, k) => mezV([950, 1550, 2700], [700, 1250, 2500], k), q: [4, 5, 6], jit: 0.1, env: tt => envAD(tt, 0.012, 0.05), amp: 1, rugo: [60, 0.3]});
      t += azar(0.25, 0.5); }
    filt(d, 'lp', 2200, 0.7);
    const e = Math.round(0.33*SR); for(let i = d.length - 1; i >= e; i--) d[i] += d[i - e]*0.3;
  }, {var: 2, rev: 0.6, lugar: 'afuera', tope: 2});
  D('_buho', 2.0, 0.28, d => {
    [[0, 0.3], [0.55, 0.18], [0.78, 0.2], [1.02, 0.45]].forEach(([t0, du]) => {
      tono(d, t0, du, {f: 390, fm: (t, k) => 390*(1 + 0.04*Math.sin(Math.PI*k) - 0.06*k*k), env: (t, k) => campana(k, 0.8), amp: 0.8});
      garganta(d, t0, du, {f0: 390, mez: 1, voc: [390, 800, 2000], env: (t, k) => campana(k), amp: 0.08}); });
    filt(d, 'lp', 1800, 0.7);
  }, {var: 2, rev: 0.6, lugar: 'afuera', tope: 1});
  D('_pajaro', 0.9, 0.2, d => {
    let t = 0; const n = 2 + Math.floor(Math.random()*4), base = azar(2500, 4200), sube = Math.random() < 0.5;
    for(let i = 0; i < n; i++){ const du = azar(0.05, 0.12), f0 = base*azar(0.9, 1.15);
      tono(d, t, du, {f: f0, fm: sube ? (tt, k) => f0*(1 + 0.5*k) : (tt, k) => f0*(1.3 - 0.4*k), vib: [azar(30, 60), 0.04], env: (tt, k) => campana(k, 0.7), amp: 0.7});
      t += du + azar(0.02, 0.1); }
  }, {var: 3, rev: 0.4, lugar: 'afuera', tope: 3});
  D('_auto_lejos', 5.0, 0.25, d => autoPasa(d, 5.0, 2.5, 600), {var: 1, rev: 0.5, lugar: 'afuera', tope: 1});
  D('_alarma', 5.5, 0.25, d => {
    for(let i = 0; i < 7; i++){ const f = i % 2 ? 650 : 520;
      tono(d, i*0.75, 0.7, {f, w: 't', env: (t, k) => campana(k, 0.3), amp: 0.7}); tono(d, i*0.75, 0.7, {f: f*2, env: (t, k) => campana(k, 0.3), amp: 0.2}); }
    filt(d, 'lp', 1500, 0.7);
  }, {rev: 0.8, lugar: 'afuera', seco: 0.5, tope: 1});
  /* la casa que se asienta: un crujido largo, un golpe de madera, o el caño que hace tic */
  D('_crujido', 1.3, 0.25, d => {
    const r = Math.random();
    if(r < 0.5) crujido(d, 0, azar(0.5, 1.2), {tasa: (t, k) => 40 + 110*Math.sin(Math.PI*k), res: [[azar(300, 700), 20, 1], [azar(900, 1600), 25, 0.5]], env: (t, k) => campana(k, 0.6), amp: 1});
    else if(r < 0.8){ madera(d, 0, azar(0.8, 1.3), 0.7, 1.2); crujido(d, 0.02, 0.2, {tasa: () => 90, res: [[500, 18, 1]], env: (t, k) => 1 - k, amp: 0.3}); }
    else { modal(d, 0, [[azar(1100, 1400), 0.3, 0.05]], 1); modal(d, azar(0.3, 0.6), [[azar(1100, 1400), 0.25, 0.05]], 1); }
  }, {var: 4, rev: 0.3, lugar: 'sala', tope: 2});

  /* ---- los instrumentos de la música (una nota horneada, después se afina con la velocidad) */
  D('_caja', 2.6, 0.5, d => {
    const f = 523.25;
    modal(d, 0, [[f, 1, 1.1], [f*3.01, 0.08, 0.3], [f*5.4, 0.18, 0.12], [f*8.9, 0.06, 0.05]], 1);
    ruido(d, 0, 0.01, {t: 'hp', f: 3000, a: 0.0002, tau: 0.002, amp: 0.3});
  }, {rev: 0});
  D('_piano', 4.0, 0.5, d => {
    const f = 261.63, B = 0.0004;
    for(let n = 1; n <= 8; n++){ const fn = n*f*Math.sqrt(1 + B*n*n), a = (1/Math.pow(n, 1.1))*(1 + 0.3*Math.cos(n*1.7)), tau = 2.4/(1 + 0.4*n);
      modal(d, 0, [[fn, a, tau], [fn*1.0007, a*0.5, tau*1.2]], 1, 4); }
    ruido(d, 0, 0.02, {t: 'lp', f: 2500, a: 0.0005, tau: 0.004, amp: 0.15});
  }, {rev: 0});
  D('_bombo', 0.6, 0.7, d => { thump(d, 0, 110, 42, 0.2, 1); thump(d, 0, 190, 120, 0.03, 0.35); ruido(d, 0, 0.02, {t: 'bp', f: 3000, q: 1, a: 0.0002, tau: 0.004, amp: 0.35}); ruido(d, 0, 0.12, {t: 'lp', f: 200, a: 0.001, tau: 0.05, amp: 0.4}); });
  D('_tom', 0.5, 0.55, d => { thump(d, 0, 190, 105, 0.14, 1); ruido(d, 0, 0.15, {t: 'bp', f: 450, q: 1, a: 0.001, tau: 0.05, amp: 0.6}); modal(d, 0, [[300, 0.3, 0.08], [520, 0.15, 0.05]], 1); });
  D('_hierro', 1.0, 0.35, d => { modal(d, 0, [[320, 1, 0.25], [883, 0.6, 0.15], [1728, 0.4, 0.08], [2858, 0.25, 0.05]], 1); ruido(d, 0, 0.04, {t: 'hp', f: 3000, a: 0.0003, tau: 0.01, amp: 0.4}); });
  D('_redo', 0.35, 0.45, d => { ruido(d, 0, 0.3, {t: 'bp', f: 2500, q: 0.6, a: 0.001, tau: 0.08, amp: 0.8}); thump(d, 0, 190, 150, 0.04, 0.6); });
  D('_boom', 3.0, 0.8, d => { thump(d, 0, 60, 25, 0.6, 1.3); ruido(d, 0, 0.4, {t: 'lp', f: 800, a: 0.001, tau: 0.1, amp: 0.6}); ruido(d, 0, 3, {c: 'p', t: 'lp', f: 120, a: 0.01, tau: 1.2, amp: 0.6}); });

  /* ================================================================ bucles (circulares, sin costura)
     falla: con tono < 1 el motor tartamudea · doppler: la velocidad entre llamadas corre la altura
     cuerpo: es tu propio cuerpo (no se tapa en el placard) */
  const BUCLES = {};
  const DB = (nombre, dur, pico, f, x) => { BUCLES[nombre] = Object.assign({dur, pico, f, bucle: true}, x || {}); };
  const cont = () => 1;
  DB('generador', 2.0, 0.45, (d, dur) => {
    const N = 60;                                                    /* 30 explosiones por segundo */
    for(let i = 0; i < N; i++) pulsoMotor(d, i*dur/N + azar(-0.0015, 0.0015), (i % 4 === 0 ? 1 : 0.82)*azar(0.9, 1), i % 2 ? 1 : 1.4);
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {c: 'p', t: 'lp', f: 180, env: t => 0.7 + 0.3*Math.sin(TAU*30*t), amp: 0.5}));
    capaCirc(d, tm => tono(tm, 0, dur + 0.08, {f: fz(120, dur), w: 'w', t: 'bp', ff: 400, q: 2, env: cont, amp: 0.08, fase: 0}), true);
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {t: 'bp', f: 3000, q: 2, env: t => Math.pow(0.5 + 0.5*Math.sin(TAU*60*t), 6), amp: 0.12}));
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {t: 'bp', f: 800, q: 1, env: t => Math.pow(0.5 + 0.5*Math.sin(TAU*30*t), 3), amp: 0.3}));
  }, {rev: 0.2, falla: true});
  DB('ventilador', 2.0, 0.3, (d, dur) => {
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {c: 'r', t: 'lp', f: 1600, env: t => 1 + 0.15*Math.sin(TAU*12*t), amp: 0.9}));
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {t: 'bp', f: 900, q: 0.8, env: t => 0.6 + 0.4*Math.sin(TAU*48*t), amp: 0.25}));
    tono(d, 0, dur, {f: fz(48, dur), env: cont, amp: 0.12, fase: 0}); tono(d, 0, dur, {f: fz(96, dur), env: cont, amp: 0.05, fase: 0});
    tono(d, 0, dur, {f: fz(100, dur), env: cont, amp: 0.04, fase: 0});
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {t: 'bp', f: 1800, q: 3, env: t => 0.6 + 0.4*Math.sin(TAU*48*t), amp: 0.1}));
  }, {rev: 0.1});
  DB('heladera', 2.0, 0.22, (d, dur) => {
    [[50, 0.35], [100, 0.3], [150, 0.12], [200, 0.07], [250, 0.03]].forEach(([f, a]) =>
      tono(d, 0, dur, {f: fz(f, dur), env: t => 1 + 0.05*Math.sin(TAU*t*1.5), amp: a, fase: Math.random()}));
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {c: 'p', t: 'lp', f: 120, env: cont, amp: 0.3}));
    capaCirc(d, tm => tono(tm, 0, dur + 0.08, {f: fz(100, dur), w: 'w', t: 'bp', ff: 420, q: 1.5, env: cont, amp: 0.1, fase: 0}), true);
    tono(d, 0, dur, {f: fz(6250, dur), env: cont, amp: 0.008, fase: 0});
  }, {rev: 0.08});
  DB('tele_estatica', 2.0, 0.3, (d, dur) => {
    capaCirc(d, tm => { ruido(tm, 0, dur + 0.08, {t: 'hp', f: 900, t2: 'lp', f2: 8000, q2: 0.7, env: cont, amp: 0.6}); ruido(tm, 0, dur + 0.08, {t: 'bp', f: 3000, q: 0.6, env: cont, amp: 0.35}); });
    tono(d, 0, dur, {f: fz(60, dur), w: 'w', env: cont, amp: 0.05, fase: 0});
    tono(d, 0, dur, {f: fz(15625, dur), env: cont, amp: 0.02, fase: 0});
  }, {alta: true, rev: 0.1});
  DB('radio_estatica', 3.0, 0.3, (d, dur) => {
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {t: 'bp', f: 1500, q: 0.5, env: t => 0.75 + 0.25*Math.sin(TAU*t*2/3), amp: 0.6}));
    crujido(d, 0, dur, {tasa: () => 25, res: [[2500, 1.5, 1]], env: cont, amp: 0.4, jit: 0.9, bip: true});
    tono(d, 0, dur, {f: fz(1100, dur), env: t => 0.5 + 0.5*Math.sin(TAU*t/3), amp: 0.05, fase: 0});
  }, {rev: 0.1});
  /* la sirena del patrullero: sube y baja cada 3 s; el Doppler se lo pone la velocidad */
  DB('sirena', 6.0, 0.4, d => {
    const fm = t => 700 + 750*(0.5 - 0.5*Math.cos(TAU*t/3));
    tono(d, 0, 6.0, {f: 700, fm, w: 'w', env: cont, amp: 0.5, fase: 0});
    tono(d, 0, 6.0, {f: 1400, fm: t => fm(t)*2, env: cont, amp: 0.15, fase: 0});
    filt(d, 'bp', 1400, 0.6); sat(d, 1.5);
  }, {rev: 0.4, lugar: 'afuera', doppler: true});
  DB('m_respira_bucle', 5.2, 0.7, d => { respiracion(d, 0, 2.5, 1); respiracion(d, 2.6, 2.5, azar(0.85, 1)); sat(d, 1.5); }, {rev: 0.2});
  DB('lluvia_ventana', 3.0, 0.22, (d, dur) => {
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {c: 'r', t: 'hp', f: 500, env: cont, amp: 0.3}));
    for(let i = 0; i < 150; i++){ const f = azar(2500, 6000); modal(d, Math.random()*dur, [[f, 1, 0.012], [f*1.52, 0.5, 0.008]], azar(0.05, 0.3)); }
  }, {st: true, rev: 0.1, previo: false});
  /* tu respiración cuando falta el aire: corta, rápida, con un silbido en el pecho */
  DB('jadeo', 2.4, 0.35, d => {
    for(let i = 0; i < 4; i++){ const t0 = i*0.6 + azar(0, 0.03);
      garganta(d, t0, 0.25, {f0: 140, mez: 1, voc: [800, 1500, 2800], q: [3, 4, 6], env: (t, k) => campana(k, 0.8), amp: 0.6});
      tono(d, t0 + 0.03, 0.2, {f: azar(900, 1100), jit: 0.05, env: (t, k) => campana(k), amp: 0.04});
      garganta(d, t0 + 0.27, 0.3, {f0: 150, mez: 0.85, voc: [650, 1200, 2500], q: [3, 4, 6], env: t => envAD(t, 0.03, 0.1), amp: 0.8}); }
  }, {cuerpo: true, rev: 0.05});
  /* en el placard: por la nariz, contenida, temblando */
  DB('respira_escondido', 4.8, 0.22, d => {
    for(let i = 0; i < 2; i++){ const t0 = i*2.4;
      garganta(d, t0, 0.95, {f0: 110, mez: 1, voc: [300, 1100, 2500], q: [6, 8, 10], env: (t, k) => campana(k, 0.7)*(0.6 + 0.4*Math.sin(TAU*7*t + i)), amp: 0.5});
      garganta(d, t0 + 1.05, 1.2, {f0: 110, mez: 0.97, voc: [280, 900, 2300], q: [6, 8, 10], env: (t, k) => campana(k, 0.6)*(0.5 + 0.5*Math.abs(Math.sin(TAU*4.5*t + i))), amp: 0.6}); }
  }, {cuerpo: true, rev: 0.04});
  DB('chispas', 3.0, 0.35, (d, dur) => {
    for(let i = 0; i < 9; i++){ const t0 = Math.random()*dur, du = azar(0.05, 0.22), r = azar(800, 2000);
      crujido(d, t0, du, {tasa: () => r, res: [[3000, 1, 1], [6500, 1, 0.6]], env: (t, k) => Math.exp(-k*2.5), amp: 0.6, jit: 0.9, bip: true});
      tono(d, t0, du, {f: 100, w: 'q', t: 'bp', ff: 2000, q: 0.7, a: 0.002, tau: du*0.5, amp: 0.25}); }
    for(let i = 0; i < 3; i++) ruido(d, Math.random()*dur, 0.02, {t: 'hp', f: 1000, a: 0.0003, tau: 0.004, amp: 0.8});
  }, {alta: true, rev: 0.12});
  DB('pc_zumbido', 3.0, 0.2, (d, dur) => {
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {c: 'r', t: 'lp', f: 1400, env: cont, amp: 0.6}));
    tono(d, 0, dur, {f: fz(60, dur), env: cont, amp: 0.1, fase: 0}); tono(d, 0, dur, {f: fz(120, dur), env: cont, amp: 0.06, fase: 0});
    for(let i = 0; i < 3; i++){ const t0 = azar(0, dur); for(let j = 0; j < 3; j++) clic(d, t0 + j*azar(0.02, 0.05), 0.15, 2500); }
    tono(d, 0, dur, {f: fz(15625, dur), env: cont, amp: 0.012, fase: 0});
  }, {alta: true, rev: 0.08});

  /* ---- los lechos del ambiente (también circulares) */
  D('_grillos', 4.0, 0.3, (d, dur, c) => {
    const n = 3 + c;
    for(let g = 0; g < n; g++){
      const fc = fz(azar(4200, 5300), dur), nch = Math.max(4, Math.round(dur/azar(0.45, 0.9))), P = dur/nch;
      const pul = 3 + Math.floor(Math.random()*2), a = azar(0.35, 1), off = Math.random()*P;
      for(let h = 0; h < nch; h++){ if(Math.random() < 0.12) continue;
        for(let p = 0; p < pul; p++) tono(d, off + h*P + p*0.03, 0.02, {f: fc, env: (t, k) => Math.pow(Math.sin(Math.PI*k), 2), amp: a*azar(0.8, 1), fase: 0}); }
    }
    tono(d, 0, dur, {f: fz(6200, dur), env: t => 0.12*Math.pow(0.5 + 0.5*Math.sin(TAU*fz(45, dur)*t), 3)*(0.6 + 0.4*Math.sin(TAU*t*2/dur)), amp: 1, fase: 0});
  }, {st: true, bucle: true});
  D('_planta', 4.0, 0.35, (d, dur) => {
    capaCirc(d, tm => tono(tm, 0, dur + 0.08, {f: fz(47, dur), w: 'w', t: 'lp', ff: 250, q: 0.8, env: t => 0.8 + 0.2*Math.sin(TAU*t/dur), amp: 0.6, fase: 0}), true);
    tono(d, 0, dur, {f: fz(94.25, dur), env: cont, amp: 0.3, fase: 0}); tono(d, 0, dur, {f: fz(141, dur), env: cont, amp: 0.12, fase: 0});
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {c: 'p', t: 'lp', f: 90, env: cont, amp: 0.5}));
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {t: 'bp', f: 520, q: 1.5, env: t => 0.8 + 0.2*Math.sin(TAU*t*2/dur), amp: 0.15}));
    tono(d, 0, dur, {f: fz(376, dur), env: cont, amp: 0.04, fase: 0});
    for(let i = 0; i < 4; i++) modal(d, i + azar(0, 0.3), [[210*azar(0.95, 1.05), 0.2, 0.3], [560, 0.08, 0.15]], 1);
  }, {bucle: true});
  D('_lluvia', 3.0, 0.3, (d, dur) => {
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {c: 'r', t: 'lp', f: 5000, env: cont, amp: 0.5}));
    filt(d, 'hp', 300, 0.7);
    for(let i = 0; i < 220; i++){ const f = azar(2000, 7000); modal(d, Math.random()*dur, [[f, 1, 0.006], [f*0.55, 0.5, 0.008]], azar(0.02, 0.12)); }
  }, {st: true, bucle: true, previo: false});
  D('_vinilo', 3.0, 0.25, (d, dur) => {
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {t: 'bp', f: 5000, q: 0.5, env: cont, amp: 0.05}));
    for(let i = 0; i < 70; i++){ const j = Math.floor(Math.random()*d.length); d[j] += Math.pow(Math.random(), 3)*(Math.random() < 0.5 ? -1 : 1); }
    for(let i = 0; i < 2; i++){ const j = Math.floor(Math.random()*d.length); d[j] += 1; }
    filt(d, 'hp', 900, 0.7);
    capaCirc(d, tm => ruido(tm, 0, dur + 0.08, {c: 'p', t: 'lp', f: 60, env: cont, amp: 0.1}));
  }, {st: true, bucle: true});

  /* ================================================================ el ambiente
     Los lechos de afuera pasan por un pasabajos que se cierra cuando estás adentro (las paredes).
     El silbido del viento en las ventanas va aparte: ése se oye justamente adentro.
     Los grillos se callan en 0,4 s cuando el juego los baja: ese silencio tiene que notarse. */
  const AMBN = {lp: null, g: null, lechos: {}, viento: null, prox: {}, racha: 0.5, rachaObj: 0.6, tRacha: 0};
  function armarAmbiente(){
    AMBN.lp = C.createBiquadFilter(); AMBN.lp.type = 'lowpass'; AMBN.lp.frequency.value = 16000; AMBN.lp.Q.value = 0.5;
    AMBN.g = G(1); AMBN.lp.connect(AMBN.g); AMBN.g.connect(M.bus.amb);
    const t = C.currentTime;
    for(const k of ['perro', 'buho', 'pajaro', 'auto', 'alarma', 'crujido']) AMBN.prox[k] = t + azar(3, 12);
    AMBN.prox.alarma = t + azar(45, 100);
  }
  function lechoNivel(nombre, buf, destino, v, tauSube, tauBaja, dt){
    let L = AMBN.lechos[nombre];
    if(v > 0.001 && !L){
      if(!hacerLugar()) return;
      const b = buffer(buf); if(!b) return;
      const s = C.createBufferSource(); s.buffer = b; s.loop = true;
      const g = G(0); s.connect(g); g.connect(destino);
      arrancarFuente(s, C.currentTime, Math.random()*b.duration*0.9, () => { try { g.disconnect(); } catch(_){} }, 'lecho:' + nombre);
      L = AMBN.lechos[nombre] = {s, g, cero: 0};
    }
    if(!L) return;
    const prm = L.g.gain, u = prm._u === undefined ? 0 : prm._u;
    if(Math.abs(u - v) > 1e-4){ prm.setTargetAtTime(v, C.currentTime, v < u ? tauBaja : tauSube); prm._u = v; }
    if(v <= 0.001){ L.cero += dt; if(L.cero > 4){ pararFuente(L.s, C.currentTime + 0.05); delete AMBN.lechos[nombre]; } }
    else L.cero = 0;
  }
  function armarViento(){
    if(!hacerLugar()) return;
    const s = C.createBufferSource(); s.buffer = RU.rosa; s.loop = true;
    const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.7;
    const g = G(0); s.connect(bp); bp.connect(g); g.connect(AMBN.lp);
    const bp2 = C.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 1200; bp2.Q.value = 12;
    const g2 = G(0); s.connect(bp2); bp2.connect(g2); g2.connect(M.bus.amb);
    const V = {s, bp, g, bp2, g2, cero: 0};
    arrancarFuente(s, C.currentTime, Math.random()*3, () => { for(const n of [bp, g, bp2, g2]) try { n.disconnect(); } catch(_){} }, 'lecho:viento');
    AMBN.viento = V;
  }
  /* se llama en cada ambiente() y en cada tic: pone los niveles; los sucesos van sólo en el tic */
  function aplicarAmbiente(dt){
    if(!C || !M || !AMBN.lp || !ambPedido) return;
    const af = lim(AMB.afuera, 0, 1), no = lim(AMB.noche, 0, 1);
    suave(AMBN.lp.frequency, 700*Math.pow(16000/700, Math.pow(af, 1.3)), 0.12);
    suave(AMBN.g.gain, lerp(0.4, 1, af), 0.12);
    const gri = lim(AMB.grillos, 0, 1)*suv((no - 0.15)/0.55);
    lechoNivel('grillos', '_grillos', AMBN.lp, 0.5*gri, 0.7, 0.1, dt);
    lechoNivel('planta', '_planta', AMBN.lp, 0.3*lim(AMB.planta, 0, 1), 1.2, 0.5, dt);
    lechoNivel('lluvia', '_lluvia', AMBN.lp, 0.5*lim(AMB.lluvia, 0, 1), 1.0, 0.5, dt);
    const vi = lim(AMB.viento, 0, 1) + 0.2*(1 - no)*(1 - lim(AMB.viento, 0, 1));
    if(vi > 0.001 && !AMBN.viento) armarViento();
    const V = AMBN.viento;
    if(V){
      const r = AMBN.racha;
      suave(V.g.gain, vi*(0.25 + 0.75*r)*0.5, 0.25);
      suave(V.bp.frequency, 250 + 550*r, 0.4);
      suave(V.g2.gain, vi*(1 - af)*r*r*0.9, 0.3);
      suave(V.bp2.frequency, 900 + 700*r, 0.5);
      if(vi <= 0.001){ V.cero += dt; if(V.cero > 4){ pararFuente(V.s, C.currentTime + 0.05); AMBN.viento = null; } } else V.cero = 0;
    }
  }
  function lanzarAmb(nombre, o){ if(FX[nombre]) lanzar(nombre, Object.assign({_bus: 'afuera', adentro: false}, o)); }
  function sucesos(t, dt){
    const P = AMBN.prox, no = lim(AMB.noche, 0, 1), af = lim(AMB.afuera, 0, 1);
    /* las ráfagas: un paseo al azar lento */
    if(t >= AMBN.tRacha){ AMBN.rachaObj = azar(0.2, 1); AMBN.tRacha = t + azar(2, 6); }
    AMBN.racha += (AMBN.rachaObj - AMBN.racha)*Math.min(1, dt*0.5);
    const lejos = (dmin, dmax, alto) => { const a = Math.random()*TAU, r = azar(dmin, dmax); return [OY.x + Math.cos(a)*r, OY.y + (alto || 0), OY.z + Math.sin(a)*r]; };
    if(t >= P.perro){ if(Math.random() < 0.3 + 0.5*no) lanzarAmb('_perro', {pos: lejos(14, 22), vol: 1.6}); P.perro = t + azar(18, 50); }
    if(t >= P.buho){ if(no > 0.6) lanzarAmb('_buho', {pos: lejos(10, 18, 4), vol: 1.4}); P.buho = t + azar(35, 90); }
    if(t >= P.pajaro){ if(no < 0.4) lanzarAmb('_pajaro', {pos: lejos(6, 14, 3), vol: 1.2*(1 - no/0.4)}); P.pajaro = t + azar(1.5, 5); }
    if(t >= P.auto){ if(no < 0.5) lanzarAmb('_auto_lejos', {pos: lejos(16, 24), vol: 1.6}); P.auto = t + azar(20, 55); }
    if(t >= P.alarma){ if(AMB.planta > 0.2) lanzarAmb('_alarma', {pos: lejos(20, 30), vol: 1.0*lim(AMB.planta, 0, 1)}); P.alarma = t + azar(80, 180); }
    if(t >= P.crujido){
      if(af < 0.5 && no > 0.5){ const a = Math.random()*TAU, r = azar(2, 6);
        lanzar('_crujido', {pos: [OY.x + Math.cos(a)*r, OY.y + azar(-0.5, 2.5), OY.z + Math.sin(a)*r], vol: azar(0.6, 1.1), ocluido: azar(0, 0.4), adentro: true, _bus: 'amb'}); }
      P.crujido = t + azar(8, 24);
    }
  }
  function ambiente(o){
    if(!o || typeof o !== 'object') return;
    for(const k of ['afuera', 'noche', 'grillos', 'viento', 'planta', 'lluvia']) if(typeof o[k] === 'number' && isFinite(o[k])) AMB[k] = lim(o[k], 0, 1);
    ambPedido = true;
    if(C && M) aplicarAmbiente(0);
  }

  /* ================================================================ la música
     Cada tema arma sus nodos fijos (drones, colchones) y programa notas con anticipación contra
     currentTime. Entre temas hay un fundido cruzado de ~2 s. De noche no hay melodía: drones graves,
     disonancias y latidos. */
  const MUS = {nombre: null, act: null, viejas: []};
  const CUNA = [[76, 2, 57], [72, 1], [69, 2, 53], [71, 1], [72, 1, 60], [74, 1], [76, 1], [71, 3, 52],
                [72, 2, 57], [69, 1], [68, 2, 52], [69, 1], [71, 1, 50], [72, 1], [71, 1], [69, 3, 57]];
  const VICT = [[72, 1], [76, 1], [79, 2], [77, 1], [76, 1], [74, 2], [72, 1], [74, 1], [76, 1], [79, 1], [77, 2], [76, 2], [74, 1], [72, 1], [71, 1], [74, 1], [72, 4]];
  function instancia(nombre){
    const T = TEMAS[nombre], g = G(0), rv = G(1);
    g.connect(M.bus.mus); rv.connect(M.env.mus.afuera);
    const I = {nombre, T, g, rv, fijas: [], notas: [], nodos: [g, rv], sig: C.currentTime + 0.05};
    I.gan = v => { const n = G(v); I.nodos.push(n); return n; };
    I.filtro = (tipo, f, q) => { const n = C.createBiquadFilter(); n.type = tipo; n.frequency.value = f; n.Q.value = q || 0.7; I.nodos.push(n); return n; };
    I.osc = (tipo, f, dest) => { const o = C.createOscillator(); o.type = tipo; o.frequency.value = f; o.connect(dest);
      arrancarFuente(o, C.currentTime, 0, null, 'mus:' + nombre); I.fijas.push(o); return o; };
    I.bucleBuf = (b, dest) => { const bb = typeof b === 'string' ? buffer(b) : b; if(!bb) return null;
      const s = C.createBufferSource(); s.buffer = bb; s.loop = true; s.connect(dest);
      arrancarFuente(s, C.currentTime, Math.random()*bb.duration*0.9, null, 'mus:' + nombre); I.fijas.push(s); return s; };
    /* una nota horneada, afinada con la velocidad; si no hay lugar, la música cede antes que los efectos */
    I.nota = (buf, t, midi, base, vol, dest, largo) => {
      if(vivas >= TOPE - 6) return null;
      const b = buffer(buf); if(!b) return null;
      const s = C.createBufferSource(); s.buffer = b; s.playbackRate.value = Math.pow(2, (midi - base)/12);
      const g2 = G(vol), t1 = Math.max(t, C.currentTime); s.connect(g2); g2.connect(dest);
      arrancarFuente(s, t1, 0, () => { try { g2.disconnect(); } catch(_){} }, 'nota:' + nombre);
      if(largo && largo < b.duration/s.playbackRate.value){          /* las notas graves no se quedan sonando 9 s */
        g2.gain.setValueAtTime(vol, t1 + largo - 0.5); g2.gain.linearRampToValueAtTime(0, t1 + largo); pararFuente2(s, t1 + largo + 0.02); }
      I.notas.push(s); if(I.notas.length > 48) I.notas = I.notas.filter(x => x._viva);
      return s;
    };
    /* un acorde de colchón: triángulos que entran y salen despacio */
    I.acorde = (t, dur, notas, vol, dest) => {
      for(const n of notas){ if(vivas >= TOPE - 6) break;
        const o = C.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(n); o.detune.value = azar(-6, 6);
        const g2 = G(0); o.connect(g2); g2.connect(dest);
        g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(vol, t + 2.5); g2.gain.setValueAtTime(vol, t + dur - 3); g2.gain.linearRampToValueAtTime(0, t + dur);
        arrancarFuente(o, t, 0, () => { try { g2.disconnect(); } catch(_){} }, 'nota:' + nombre); pararFuente2(o, t + dur + 0.05); }
    };
    /* una ola de ruido que sube y se corta de golpe */
    I.ola = (t, dur, vol) => {
      if(vivas >= TOPE - 6) return;
      const s = C.createBufferSource(); s.buffer = RU.rosa; const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      const g2 = G(0); s.connect(bp); bp.connect(g2); g2.connect(I.g); g2.connect(I.rv);
      bp.frequency.setValueAtTime(200, t); bp.frequency.exponentialRampToValueAtTime(1300, t + dur);
      g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(vol, t + dur*0.95); g2.gain.linearRampToValueAtTime(0, t + dur);
      arrancarFuente(s, t, Math.random()*2, () => { try { bp.disconnect(); g2.disconnect(); } catch(_){} }, 'nota:' + nombre); pararFuente2(s, t + dur + 0.02);
    };
    try { T.crear(I); } catch(e){ err(e); }
    return I;
  }
  /* parar sin descontar ya (la fuente sigue viva hasta que termina de verdad) */
  function pararFuente2(s, t){ try { s.stop(t); } catch(_){} }
  function cerrarInstancia(I, f){
    const t = C.currentTime;
    I.g.gain.cancelScheduledValues(t); I.g.gain.setValueAtTime(I.g.gain.value, t); I.g.gain.linearRampToValueAtTime(0, t + f);
    I.muere = t + f + 0.1; MUS.viejas.push(I);
  }
  function musica(nombre){
    if(nombre !== null && nombre !== undefined && (typeof nombre !== 'string' || !TEMAS[nombre])){ FALTAN.add(String(nombre)); return; }
    const n = nombre || null;
    if(!C || !M){ musPed = n; hayMusPed = true; return; }
    if(n === MUS.nombre) return;
    if(MUS.act){ cerrarInstancia(MUS.act, n === 'muerte' ? 0.5 : 2); MUS.act = null; }
    MUS.nombre = n;
    if(n){ const I = instancia(n), t = C.currentTime, ent = TEMAS[n].entra || 2;
      I.g.gain.setValueAtTime(0, t); I.g.gain.linearRampToValueAtTime(TEMAS[n].vol || 1, t + ent); MUS.act = I; }
    aplicarBuses();
  }
  function musicaTick(t){
    for(const I of [MUS.act].concat(MUS.viejas)){ if(!I) continue;
      if(I.sig < t - 0.25) I.sig = t + 0.05;               /* si el reloj se atrasó (pestaña dormida), no se tiran todas las notas juntas */
      const hasta = I.muere ? Math.min(t + 0.3, I.muere - 0.05) : t + 0.3;
      try { if(I.T.paso) I.T.paso(I, hasta); if(I.T.tick) I.T.tick(I, t); } catch(e){ err(e); } }
    for(let i = MUS.viejas.length - 1; i >= 0; i--){ const I = MUS.viejas[i];
      if(t >= I.muere){ for(const s of I.fijas) pararFuente(s, t); for(const s of I.notas) if(s._viva) pararFuente(s, t); setTimeout(() => { for(const n of I.nodos) try { n.disconnect(); } catch(_){} }, 300); MUS.viejas.splice(i, 1); } }
  }
  const TEMAS = {
    /* la cajita de música: una canción de cuna desafinada que se va quedando sin cuerda */
    menu: {vol: 0.55, crear(I){
      const lp = I.filtro('lowpass', 300); lp.connect(I.g);
      const d = I.gan(0.05); d.connect(lp); I.osc('sine', 55, d); I.osc('sine', 55.35, d);
      const d2 = I.gan(0.02); d2.connect(lp); I.osc('triangle', 82.41, d2);
      const vi = I.gan(0.3); vi.connect(I.g); I.bucleBuf('_vinilo', vi);
      I.cg = I.gan(0.5); I.cg.connect(I.g); const e = I.gan(0.5); I.cg.connect(e); e.connect(I.rv);
      I.i = 0; I.vuelta = 0; I.sig = C.currentTime + 0.8;
    }, paso(I, hasta){
      const beat = 60/64;
      while(I.sig < hasta){
        const [m, b, bajo] = CUNA[I.i], fin = I.vuelta % 3 === 2 && I.i >= CUNA.length - 5;
        let st = 1, des = azar(-35, 35);
        if(fin){ const k = I.i - (CUNA.length - 5); st = 1 + k*0.22; des -= 15 + k*12; }
        I.nota('_caja', I.sig, m + des/100, 72, azar(0.7, 0.9), I.cg);
        if(bajo) I.nota('_caja', I.sig + 0.012, bajo + azar(-20, 20)/100, 72, 0.5, I.cg, 3.2);
        I.sig += b*beat*st*azar(0.97, 1.05);
        if(++I.i >= CUNA.length){ I.i = 0; I.vuelta++; I.sig += fin ? 2.5 : 0.6; }
      }
    }},
    /* la tarde: casi nada, un piano lejos, cada tanto */
    tarde: {vol: 1, crear(I){
      I.pg = I.gan(0.45); I.pg.connect(I.g); const e = I.gan(1.5); I.pg.connect(e); e.connect(I.rv);
      const a = I.gan(0.01); const lp = I.filtro('lowpass', 400); a.connect(lp); lp.connect(I.g); I.osc('sine', 110, a); I.osc('sine', 164.81, a);
      I.sig = C.currentTime + 1.5;
    }, paso(I, hasta){
      while(I.sig < hasta){
        const m = elegir([57, 60, 64, 67, 69, 71, 74, 76]);
        I.nota('_piano', I.sig, m, 60, azar(0.35, 0.6), I.pg);
        if(Math.random() < 0.35) I.nota('_piano', I.sig + azar(0.04, 0.12), m - elegir([3, 4, 5, 7]), 60, azar(0.2, 0.35), I.pg);
        I.sig += azar(3.5, 8);
      }
    }},
    /* la noche: un drone oscuro que respira; la disonancia entra con la tensión */
    noche: {vol: 1, crear(I){
      I.lp = I.filtro('lowpass', 180, 1.2); I.lp.connect(I.g);
      I.gd = I.gan(0.14); I.gd.connect(I.lp); I.osc('sawtooth', 36.71, I.gd); I.osc('sawtooth', 36.93, I.gd);
      I.gs = I.gan(0.06); I.gs.connect(I.g); I.osc('sine', 73.42, I.gs);
      I.gdis = I.gan(0); const lp2 = I.filtro('lowpass', 420, 0.8); I.gdis.connect(lp2); lp2.connect(I.g); const e = I.gan(0.6); lp2.connect(e); e.connect(I.rv);
      I.osc('sawtooth', 77.78, I.gdis); I.osc('sawtooth', 51.91, I.gdis);
      /* el aliento: ruido en los medios que respira con el drone (lo que el parlante del celular sí da) */
      I.ga = I.gan(0); const bpa = I.filtro('bandpass', 420, 1.6); bpa.connect(I.ga); I.ga.connect(I.g); const ea = I.gan(0.7); I.ga.connect(ea); ea.connect(I.rv); I.bucleBuf(RU.rosa, bpa);
      I.sig = C.currentTime + azar(12, 25);
    }, tick(I, t){
      const r = 0.5 + 0.5*Math.sin(TAU*t/9), k = kTension;
      suave(I.ga.gain, (0.05 + 0.08*k)*Math.pow(r, 2), 0.4);
      suave(I.gd.gain, (0.12 + 0.12*k)*(0.7 + 0.3*r), 0.3);
      suave(I.lp.frequency, 130 + 110*(0.5 + 0.5*Math.sin(TAU*t/13)) + 300*k, 0.4);
      suave(I.gdis.gain, 0.09*Math.pow(k, 1.2), 0.5);
    }, paso(I, hasta){
      if(I.sig < hasta){ I.ola(I.sig, azar(3, 5), 0.04 + 0.05*kTension); I.sig += azar(18, 40); }
    }},
    /* la persecución: tambores graves a 150, cuerdas disonantes que suben y ruido que crece */
    persecucion: {vol: 0.7, entra: 0.8, crear(I){
      I.bpm = 150; I.k = 0;
      I.gb = I.gan(0); const lpb = I.filtro('lowpass', 220, 1); I.gb.connect(lpb); lpb.connect(I.g); I.osc('sawtooth', 36.71, I.gb);
      I.gs = I.gan(0); const bps = I.filtro('bandpass', 1800, 0.8); I.gs.connect(bps); bps.connect(I.g); const e = I.gan(0.4); bps.connect(e); e.connect(I.rv);
      I.cuerdas = [293.66, 311.13, 329.63].map(f => I.osc('sawtooth', f, I.gs));
      I.gn = I.gan(0); I.hpn = I.filtro('highpass', 400, 0.7); I.hpn.connect(I.gn); I.gn.connect(I.g); I.bucleBuf(RU.rosa, I.hpn);
      I.dg = I.gan(0.9); I.dg.connect(I.g); const e2 = I.gan(0.2); I.dg.connect(e2); e2.connect(I.rv);
      I.sig = C.currentTime + 0.05;
    }, paso(I, hasta){
      const B = [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0], B2 = [1,0,0,1, 0,0,1,0, 1,0,1,0, 1,1,1,1];
      const T = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,1], H = [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,1];
      while(I.sig < hasta){
        const t = I.sig, s = I.k % 16, c = Math.floor(I.k/16) % 4, st = 60/(I.bpm + 12*kTension)/4;
        if((c === 3 ? B2 : B)[s]) I.nota('_bombo', t, azar(-0.2, 0.2), 0, azar(0.8, 1), I.dg);
        if(T[s]) I.nota('_tom', t, azar(-0.3, 0.3), 0, 0.6, I.dg);
        if(s === 4 || s === 12) I.nota('_redo', t, 0, 0, 0.5, I.dg);
        if(H[s] && c % 2) I.nota('_hierro', t, azar(-1, 1), 0, 0.3, I.dg);
        if(s % 2 === 0){ const gp = I.gb.gain; gp.setValueAtTime(0.2, t); gp.setTargetAtTime(0.05, t + 0.03, 0.04); }
        const gs = I.gs.gain; gs.setValueAtTime(0.022 + 0.02*kTension, t); gs.setTargetAtTime(0.008, t + st*0.5, 0.02);
        if(s === 0 && c === 0){ const T4 = st*64;
          I.cuerdas.forEach((o, i) => { const f = [293.66, 311.13, 329.63][i]; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f*1.335, t + T4); });
          I.hpn.frequency.setValueAtTime(400, t); I.hpn.frequency.exponentialRampToValueAtTime(3500, t + T4);
          I.gn.gain.setValueAtTime(0.002, t); I.gn.gain.linearRampToValueAtTime(0.06, t + T4 - 0.03); I.gn.gain.linearRampToValueAtTime(0, t + T4); }
        I.sig += st; I.k++;
      }
    }},
    /* escondido: casi silencio; el zumbido del oído y el drone muy abajo */
    escondido: {vol: 1, crear(I){
      I.gt = I.gan(0.005); I.gt.connect(I.g); I.osc('sine', 7350, I.gt);
      const gd = I.gan(0.018), lp = I.filtro('lowpass', 120); gd.connect(lp); lp.connect(I.g); I.osc('sine', 41.2, gd); I.osc('sine', 61.74, gd);
    }, tick(I, t){ suave(I.gt.gain, 0.0045 + 0.0025*Math.sin(TAU*t/5.3) + 0.001*Math.sin(TAU*t/1.7), 0.3); }},
    /* el amanecer: acordes que alivian, lentos */
    amanecer: {vol: 1, crear(I){
      I.pad = I.gan(1); const lp = I.filtro('lowpass', 1600, 0.5); I.pad.connect(lp); lp.connect(I.g); const e = I.gan(0.5); lp.connect(e); e.connect(I.rv);
      I.pg = I.gan(0.35); I.pg.connect(I.g); const e2 = I.gan(0.8); I.pg.connect(e2); e2.connect(I.rv);
      I.ac = 0; I.sig = C.currentTime + 0.1;
    }, paso(I, hasta){
      const AC = [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]];
      while(I.sig < hasta){ const notas = AC[I.ac % 4];
        I.acorde(I.sig, 11, notas, 0.03, I.pad);
        if(I.ac % 2 === 1) I.nota('_piano', I.sig + 1.5, notas[notas.length - 1] + 12, 60, 0.3, I.pg);
        I.sig += 8; I.ac++; }
    }},
    /* la muerte: un golpe y un drone que se hunde */
    muerte: {vol: 1, entra: 0.2, crear(I){
      const t = C.currentTime;
      I.nota('_boom', t + 0.02, 0, 0, 1, I.g);
      const lp = I.filtro('lowpass', 800, 0.9), gd = I.gan(0.2); gd.connect(lp); lp.connect(I.g); const e = I.gan(0.5); lp.connect(e); e.connect(I.rv);
      [55, 55.4].forEach(f => { const o = I.osc('sawtooth', f, gd); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f/2, t + 9); });
      lp.frequency.setValueAtTime(800, t); lp.frequency.exponentialRampToValueAtTime(90, t + 8);
      gd.gain.setValueAtTime(0.2, t); gd.gain.linearRampToValueAtTime(0.07, t + 10);
    }},
    /* la victoria: la misma cajita, pero afinada, con un colchón que brilla */
    victoria: {vol: 0.8, crear(I){
      I.cg = I.gan(0.5); I.cg.connect(I.g); const e = I.gan(0.5); I.cg.connect(e); e.connect(I.rv);
      I.pad = I.gan(0.03); const lp = I.filtro('lowpass', 1200, 0.5); I.pad.connect(lp); lp.connect(I.g);
      I.po = [48, 55, 64].map(n => I.osc('triangle', mtof(n), I.pad));
      I.i = 0; I.cuenta = 0; I.ac = -1; I.sig = C.currentTime + 0.5;
    }, paso(I, hasta){
      const beat = 60/76, AV = [[48, 55, 64], [53, 57, 65], [55, 59, 62]];
      while(I.sig < hasta){
        const [m, b] = VICT[I.i];
        const ac = Math.floor(I.cuenta/8) % 3;
        if(ac !== I.ac){ I.ac = ac; AV[ac].forEach((n, j) => I.po[j].frequency.setTargetAtTime(mtof(n), I.sig, 0.3)); }
        I.nota('_caja', I.sig, m, 72, 0.75, I.cg);
        I.cuenta += b; I.sig += b*beat;
        if(++I.i >= VICT.length){ I.i = 0; I.cuenta = 0; I.sig += beat; }
      }
    }}
  };
  /* la capa de tensión: un racimo agudo y disonante con ruido; existe sólo mientras haga falta */
  const TEN = {n: null, cero: 0};
  function tensionTick(t, dt){
    const k = kTension;
    if(k > 0.02 && !TEN.n && hacerLugar()){
      const gt = G(0), bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.2;
      gt.connect(M.bus.mus); bp.connect(gt); const e = G(0.3); gt.connect(e); e.connect(M.env.mus.afuera);
      const os = [587.33, 622.25, 830.61].map(f => { const o = C.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(bp); arrancarFuente(o, t, 0, null, 'tension'); return o; });
      const gn = G(0), bp2 = C.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 900; bp2.Q.value = 0.8;
      const s = C.createBufferSource(); s.buffer = RU.rosa; s.loop = true; s.connect(bp2); bp2.connect(gn); gn.connect(M.bus.mus);
      arrancarFuente(s, t, Math.random()*3, null, 'tension');
      TEN.n = {gt, bp, e, os, gn, bp2, s}; TEN.cero = 0;
    }
    const N = TEN.n; if(!N) return;
    suave(N.gt.gain, 0.03*Math.pow(k, 1.5)*(0.7 + 0.3*Math.sin(TAU*t*0.23)), 0.3);
    suave(N.gn.gain, 0.05*k*k, 0.3);
    suave(N.bp.frequency, 900 + 1400*k + 300*Math.sin(TAU*t*0.11), 0.5);
    suave(N.bp2.frequency, 500 + 1500*k, 0.5);
    if(Math.random() < 0.05) N.os.forEach(o => suave(o.detune, azar(-18, 18), 0.6));
    if(k <= 0.02){ TEN.cero += dt; if(TEN.cero > 3){
      for(const o of N.os) pararFuente(o, t + 0.05); pararFuente(N.s, t + 0.05);
      setTimeout(() => { for(const x of [N.gt, N.bp, N.e, N.gn, N.bp2]) try { x.disconnect(); } catch(_){} }, 300); TEN.n = null; } }
    else TEN.cero = 0;
  }

  /* ================================================================ la voz: balbucea siguiendo el texto
     Una sierra (o ruido, para el susurro) por tres formantes que cambian vocal por vocal, un chorro de
     ruido para las consonantes y después el aparato: la banda angosta de la radio con estática y
     cortes, el teléfono con su zumbido y su respiración, la tele con eco. */
  const VOZ = {n: null};
  const VOC_VOZ = {a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010], o: [570, 840, 2410], u: [300, 870, 2240]};
  const DIG = {'0': 'eo', '1': 'uo', '2': 'o', '3': 'e', '4': 'ua', '5': 'io', '6': 'ei', '7': 'ie', '8': 'o', '9': 'ue'};
  function silabear(texto, tipo){
    let s = String(texto == null ? '' : texto).toLowerCase();
    if(s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const base = {radio: 0.15, tele: 0.16, telefono: 0.3, susurro: 0.19}[tipo] || 0.17;
    const sil = []; let t = 0.1, cons = '', frase = [];
    const cierra = preg => { const n = frase.length; frase.forEach((x, i) => { x.pf = n > 1 ? i/(n - 1) : 0; }); if(n){ frase[n - 1].fin = true; if(preg) frase[n - 1].preg = true; } frase = []; };
    const poner = (v, v2, c, extra) => { const d = base*azar(0.8, 1.25)*extra, x = {t, d, v, v2, c, ac: Math.random() < 0.28}; sil.push(x); frase.push(x); t += d; };
    for(let i = 0; i < s.length; i++){
      const ch = s[i];
      if(DIG[ch]){ for(const v of DIG[ch]) poner(v, null, 'p', 1); t += base*0.3; continue; }
      if('aeiou'.includes(ch) || (ch === 'y' && !'aeiou'.includes(s[i + 1] || ''))){
        const v = ch === 'y' ? 'i' : ch; let v2 = null;
        while(i + 1 < s.length && 'aeiou'.includes(s[i + 1])){ v2 = s[i + 1]; i++; }
        const c = /[szfjx]|ch|sh/.test(cons) ? 'f' : /[ptkcqbdg]/.test(cons) ? 'p' : cons ? 'n' : '';
        poner(v, v2, c, (cons.length > 1 ? 1.15 : 1)*(v2 ? 1.2 : 1)); cons = '';
      } else if(ch === ' ' || ch === '\n' || ch === '\t'){ t += base*0.3; cons = ''; }
      else if(',;:-'.includes(ch)){ t += base*1.6; cons = ''; }
      else if('.!?…'.includes(ch)){ cierra(ch === '?'); t += base*2.6; cons = ''; }
      else if(/[a-zñ]/.test(ch)) cons += ch;
    }
    cierra(false);
    return {sil, total: sil.length ? t + 0.2 : 0};
  }
  function curvaSat(k){ const n = 1024, c = new Float32Array(n), d = Math.tanh(k); for(let i = 0; i < n; i++){ const x = i/(n - 1)*2 - 1; c[i] = Math.tanh(k*x)/d; } return c; }
  function voz(texto, tipo){
    tipo = ['radio', 'telefono', 'tele', 'susurro'].includes(tipo) ? tipo : 'radio';
    const P = silabear(texto, tipo);
    if(!C || !M || !P.sil.length) return P.total;
    callarVoz(0.04);
    if(vivas >= TOPE - 4) hacerLugar();
    const t0 = C.currentTime + 0.06, fin = t0 + P.total, sus = tipo === 'susurro', tel = tipo === 'telefono';
    const nodos = [], fuentes = [], nuevo = n => { nodos.push(n); return n; };
    let src;
    if(sus){ src = C.createBufferSource(); src.buffer = RU.blanco; src.loop = true; }
    else { src = C.createOscillator(); src.type = 'sawtooth'; }
    fuentes.push(src);
    const fs = [0, 1, 2].map(j => { const f = nuevo(C.createBiquadFilter()); f.type = 'bandpass'; f.Q.value = sus ? [5, 6, 8][j] : [7, 9, 11][j]; f.frequency.value = VOC_VOZ.a[j]; return f; });
    const gSil = nuevo(G(0));
    [1, 0.55, 0.28].forEach((v, j) => { const g = nuevo(G(v*(sus ? 2.2 : 3.2))); src.connect(fs[j]); fs[j].connect(g); g.connect(gSil); });
    const rs = C.createBufferSource(); rs.buffer = RU.blanco; rs.loop = true; fuentes.push(rs);
    const hp = nuevo(C.createBiquadFilter()); hp.type = 'highpass'; hp.frequency.value = 2800; const gC = nuevo(G(0));
    rs.connect(hp); hp.connect(gC);
    const mez = nuevo(G(1)); gSil.connect(mez); gC.connect(mez);
    const B = {radio: [380, 2900], telefono: [330, 3200], tele: [160, 5200], susurro: [220, 7000]}[tipo];
    const bh = nuevo(C.createBiquadFilter()), bl = nuevo(C.createBiquadFilter());
    bh.type = 'highpass'; bh.frequency.value = B[0]; bh.Q.value = 0.8; bl.type = 'lowpass'; bl.frequency.value = B[1]; bl.Q.value = 0.9;
    mez.connect(bh); bh.connect(bl);
    const gT = nuevo(G(0)); let cola = bl;
    if(tipo === 'radio' || tel){ const ws = nuevo(C.createWaveShaper()); ws.curve = curvaSat(tipo === 'radio' ? 2.2 : 1.6); bl.connect(ws); cola = ws; }
    cola.connect(gT); gT.connect(M.bus.voz);
    if(tipo === 'tele'){ const dl = nuevo(C.createDelay(0.5)), fb = nuevo(G(0.28)), lpE = nuevo(C.createBiquadFilter());
      dl.delayTime.value = 0.13; lpE.type = 'lowpass'; lpE.frequency.value = 2500; cola.connect(dl); dl.connect(lpE); lpE.connect(fb); fb.connect(dl); lpE.connect(gT); }
    const gp = gT.gain, VV = 0.6; gp.setValueAtTime(0, t0 - 0.05); gp.linearRampToValueAtTime(VV, t0);
    if(!sus){ const ns = C.createBufferSource(); ns.buffer = tipo === 'radio' ? RU.rosa : RU.blanco; ns.loop = true; fuentes.push(ns);
      const nb = nuevo(C.createBiquadFilter()); nb.type = 'bandpass'; nb.frequency.value = tipo === 'radio' ? 1800 : 2500; nb.Q.value = 0.6;
      const ng = nuevo(G(tipo === 'radio' ? 0.06 : tipo === 'tele' ? 0.015 : 0.012)); ns.connect(nb); nb.connect(ng); ng.connect(gT);
      if(tipo === 'radio'){
        for(let x = t0; x < fin; x += azar(0.3, 1.2)){ ng.gain.setValueAtTime(azar(0.15, 0.35), x); ng.gain.setTargetAtTime(0.06, x + 0.02, 0.03); }
        for(let x = t0 + azar(0.8, 2); x < fin - 0.4; x += azar(1.5, 4)){
          gp.setValueAtTime(VV, x); gp.linearRampToValueAtTime(0.08, x + 0.03); gp.setValueAtTime(0.08, x + azar(0.05, 0.15)); gp.linearRampToValueAtTime(VV, x + 0.2); }
      }
      if(tel){ const hum = C.createOscillator(); hum.type = 'sine'; hum.frequency.value = 100; const hg = nuevo(G(0.015)); hum.connect(hg); hg.connect(gT); fuentes.push(hum);
        /* alguien que respira del otro lado, en los silencios */
        const rr = C.createBufferSource(); rr.buffer = RU.rosa; rr.loop = true; fuentes.push(rr);
        const rb = nuevo(C.createBiquadFilter()); rb.type = 'bandpass'; rb.frequency.value = 1100; rb.Q.value = 1.2; const rg = nuevo(G(0));
        rr.connect(rb); rb.connect(rg); rg.connect(mez);
        for(let i = 0; i < P.sil.length; i++){ const x = P.sil[i], sig = P.sil[i + 1], hueco = (sig ? sig.t : P.total) - (x.t + x.d);
          if(hueco > 0.45){ const a = t0 + x.t + x.d + 0.08; rg.gain.setValueAtTime(0, a); rg.gain.linearRampToValueAtTime(0.5, a + hueco*0.45); rg.gain.linearRampToValueAtTime(0, a + hueco*0.8); } }
      }
    }
    gp.setValueAtTime(VV, fin - 0.12); gp.linearRampToValueAtTime(0, fin);
    /* la altura: el locutor grave que baja al final de la frase, el del teléfono ronco y lento */
    const f0b = {radio: 104, tele: 112, telefono: 76}[tipo] || 100, esc = tel ? 0.9 : 1;
    if(!sus) src.frequency.setValueAtTime(f0b, t0);
    for(const x of P.sil){
      const ts = t0 + x.t, dc = x.c ? 0.05 : 0, F = VOC_VOZ[x.v], F2 = x.v2 ? VOC_VOZ[x.v2] : null;
      if(!sus){ const f = f0b*(1 + (x.ac ? 0.14 : 0) - 0.18*(x.pf || 0))*(x.preg ? 1.3 : 1)*azar(0.97, 1.03);
        src.frequency.setTargetAtTime(f, ts, 0.03);
        if(tel) for(let q = ts + 0.05; q < ts + x.d; q += 0.06) src.frequency.setTargetAtTime(f*azar(0.95, 1.05), q, 0.02); }
      for(let j = 0; j < 3; j++){
        if(x.c === 'n') fs[j].frequency.setTargetAtTime([260, 1300, 2500][j]*esc, ts, 0.01);
        fs[j].frequency.setTargetAtTime(F[j]*esc, ts + dc, 0.025);
        if(F2) fs[j].frequency.setTargetAtTime(F2[j]*esc, ts + dc + x.d*0.5, 0.04);
      }
      const pk = x.ac ? 1 : 0.75, gs = gSil.gain, gc = gC.gain, cf = sus ? 0.6 : 0.35;
      if(x.c === 'p'){ gs.setTargetAtTime(0, ts, 0.005); gc.setTargetAtTime(cf*1.4, ts + 0.03, 0.003); gc.setTargetAtTime(0, ts + 0.045, 0.008); gs.setTargetAtTime(pk, ts + 0.05, 0.012); }
      else if(x.c === 'f'){ gc.setTargetAtTime(cf, ts, 0.01); gc.setTargetAtTime(0, ts + 0.07, 0.015); gs.setTargetAtTime(pk, ts + 0.06, 0.015); }
      else if(x.c === 'n'){ gs.setTargetAtTime(pk*0.4, ts, 0.01); gs.setTargetAtTime(pk, ts + 0.045, 0.015); }
      else gs.setTargetAtTime(pk, ts, 0.015);
      gs.setTargetAtTime(0.02, ts + x.d*0.78, 0.025);
    }
    for(const f of fuentes) arrancarFuente(f, t0 - 0.05, 0, null, 'voz');
    for(const f of fuentes) pararFuente2(f, fin + 0.05);
    VOZ.n = {fuentes, nodos, gT, fin: fin + 0.1};
    return P.total;
  }
  function cerrarVoz(){ const V = VOZ.n; if(!V) return; VOZ.n = null; setTimeout(() => { for(const n of V.nodos) try { n.disconnect(); } catch(_){} }, 400); }
  function callarVoz(f){
    const V = VOZ.n; if(!V || !C) return;
    const t = C.currentTime, F = num(f, 0.06), gp = V.gT.gain;
    gp.cancelScheduledValues(t); gp.setValueAtTime(gp.value, t); gp.linearRampToValueAtTime(0, t + F);
    for(const s of V.fuentes) pararFuente(s, t + F + 0.02);
    cerrarVoz();
  }

  /* ================================================================ el corazón */
  const COR = {prox: 0};
  function corazonTick(t){
    const k = kCorazon;
    if(k <= 0.02){ COR.prox = 0; return; }
    if(COR.prox < t) COR.prox = t + 0.05;
    while(COR.prox < t + 0.2){
      const T = COR.prox, v = (0.25 + 0.75*Math.pow(k, 0.8))*0.9;
      [['_lub', 0, 1], ['_dub', lerp(0.28, 0.16, k), 0.7]].forEach(([nom, dt, a]) => {
        if(vivas >= TOPE - 2) return;
        const b = buffer(nom); if(!b) return;
        const s = C.createBufferSource(); s.buffer = b; s.playbackRate.value = 1 + 0.08*k;
        const g = G(v*a); s.connect(g); g.connect(M.bus.cuerpo);
        arrancarFuente(s, T + dt, 0, () => { try { g.disconnect(); } catch(_){} }, 'corazon');
      });
      COR.prox += 60/lerp(62, 150, k)*azar(0.97, 1.03);
    }
  }

  /* ================================================================ el reloj interno */
  let tAnt = 0, msHorno = 0, tics = 0, hornoN = 0;
  const COLA = [];
  function tick(){
    try {
      if(!C || !M) return;
      if(COLA.length && (++tics % (hornoN < ORDEN.length ? 1 : 3)) === 0){ const n = COLA.shift(), def = FX[n] || BUCLES[n]; hornoN++;   /* de a uno por tic, variantes incluidas; lo básico primero */
        try { const l = BUF[n] || (BUF[n] = []); if(def && l.length < (l.length ? def.var || 1 : 1)){ const q = ahora(); l.push(hornear(def, n)); const ms = (ahora() - q)*1000; msHorno = Math.max(msHorno, ms); msPor[n] = Math.max(msPor[n] || 0, +ms.toFixed(1)); } } catch(e){ err(e); } }
      const t = C.currentTime, dt = lim(t - tAnt, 0, 0.5); tAnt = t;
      if(C.state !== 'running') return;
      musicaTick(t);
      tensionTick(t, dt);
      if(!pausado){ corazonTick(t); if(ambPedido) sucesos(t, dt); }
      aplicarAmbiente(dt);
      for(let i = VOCES.length - 1; i >= 0; i--){ const v = VOCES[i];
        if(t > v.fin + 2){ if(v.s._viva){ v.s._viva = false; vivas--; } liberar(v); } }
      if(VOZ.n && t > VOZ.n.fin + 1) cerrarVoz();
    } catch(e){ err(e); }
  }
  function aplicarAmortiguar(){
    if(!M) return;
    const t = C.currentTime, k = kAmort;
    M.lp.frequency.cancelScheduledValues(t); M.lp.frequency.setTargetAtTime(20000*Math.pow(300/20000, Math.pow(k, 0.8)), t, 0.08);
    M.lp.Q.value = 0.6 + 0.5*k;
    aplicarBuses(0.08);
  }
  function oyenteAplicar(){
    const L = C.listener, fx0 = OY.dx, fy = OY.dy, fz0 = OY.dz;
    let rx = -fz0, rz = fx0, rl = Math.hypot(rx, rz); if(rl < 1e-4){ rx = 1; rz = 0; rl = 1; } rx /= rl; rz /= rl;
    const ux = -rz*fy, uy = rz*fx0 - rx*fz0, uz = rx*fy;
    if(L.positionX){ L.positionX.value = OY.x; L.positionY.value = OY.y; L.positionZ.value = OY.z;
      L.forwardX.value = fx0; L.forwardY.value = fy; L.forwardZ.value = fz0; L.upX.value = ux; L.upY.value = uy; L.upZ.value = uz; }
    else { L.setPosition(OY.x, OY.y, OY.z); L.setOrientation(fx0, fy, fz0, ux, uy, uz); }
  }
  function oyente(x, y, z, dx, dy, dz){
    x = num(x, OY.x); y = num(y, OY.y); z = num(z, OY.z);
    const now = ahora(), dt = now - OY.t;
    if(dt > 0.004 && dt < 0.5){ OY.vx = lerp(OY.vx, lim((x - OY.x)/dt, -30, 30), 0.3); OY.vy = lerp(OY.vy, lim((y - OY.y)/dt, -30, 30), 0.3); OY.vz = lerp(OY.vz, lim((z - OY.z)/dt, -30, 30), 0.3); }
    OY.t = now; OY.x = x; OY.y = y; OY.z = z;
    dx = num(dx, 0); dy = num(dy, 0); dz = num(dz, 0);
    const L = Math.sqrt(dx*dx + dy*dy + dz*dz); if(L > 1e-6){ OY.dx = dx/L; OY.dy = dy/L; OY.dz = dz/L; }
    if(C) oyenteAplicar();
  }
  const ORDEN = ['_lub', '_dub', 'paso_madera', 'paso_alfombra', 'paso_escalera', 'paso_pasto', 'paso_asfalto', 'interruptor', 'boton', 'boton_atras',
    'linterna_on', 'linterna_off', 'agarrar', 'martillo', 'm_respira', 'm_paso', 'm_paso_pasto', 'tabla_golpe', 'vidrio_rompe', 'm_grito', 'susto'];
  function arrancar(){
    if(sinAudio) return false;
    if(!C){
      const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
      if(!AC){ sinAudio = true; return false; }
      try { C = new AC({latencyHint: 'interactive'}); } catch(e){ try { C = new AC(); } catch(e2){ err(e2); sinAudio = true; return false; } }
      SR = C.sampleRate;
      RU = ruidos(); armarMaster(); armarAmbiente();
      aplicarBuses(0); aplicarAmortiguar(); oyenteAplicar();
      const todos = Object.entries(FX).concat(Object.entries(BUCLES)).filter(([n, d]) => d.previo !== false);
      for(const n of ORDEN.concat(todos.map(x => x[0]))) if(!COLA.includes(n)) COLA.push(n);
      for(const [n, def] of todos) for(let v = 1; v < (def.var || 1); v++) COLA.push(n);
      tAnt = C.currentTime;
      reloj = setInterval(tick, 50);
      if(hayMusPed){ hayMusPed = false; musica(musPed); }
      const ped = [...bPed]; bPed.clear(); for(const [id, [nom, o]] of ped) bucle(id, nom, o);
      if(ambPedido) aplicarAmbiente(0);
    }
    if(C.state === 'suspended' || C.state === 'interrupted'){ const p = C.resume(); if(p && p.catch) p.catch(e => err(e)); }
    return true;
  }
  function volumen(m, e){ volMus = lim(num(m, volMus), 0, 1); volFx = lim(num(e, volFx), 0, 1); aplicarBuses(); }
  function pausa(b){ pausado = !!b; aplicarBuses(0.1); if(pausado) COR.prox = 0; }

  /* ================================================================ lo que ve el juego */
  const seguro = (fn, def) => function(){ try { return fn.apply(null, arguments); } catch(e){ err(e); return def; } };
  return {
    arrancar: seguro(arrancar, false),
    oyente: seguro(oyente),
    fx: seguro((n, o) => { fx(n, o); }),
    bucle: seguro(bucle),
    bucleParar: seguro(bucleParar),
    ambiente: seguro(ambiente),
    musica: seguro(musica),
    tension: seguro(k => { kTension = lim(num(k, 0), 0, 1); }),
    corazon: seguro(k => { kCorazon = lim(num(k, 0), 0, 1); }),
    amortiguar: seguro(k => { const v = lim(num(k, 0), 0, 1); if(Math.abs(v - kAmort) > 0.001){ kAmort = v; aplicarAmortiguar(); } }),
    voz: seguro(voz, 0),
    callarVoz: seguro(callarVoz),
    volumen: seguro(volumen),
    pausa: seguro(pausa),
    _err: ERR, _faltan: FALTAN,
    _salida: () => M ? M.salida : null,
    _ctx: () => C,
    _horneado: n => (C && (FX[n] || BUCLES[n])) ? buffer(n) : null,
    _msHorno: () => Object.entries(msPor).sort((x, y) => y[1] - x[1]),
    _memoria: () => Object.entries(BUF).map(([n, l]) => [n, l.length, +(l.reduce((a, x) => a + x.length*x.numberOfChannels*4, 0)/1048576).toFixed(2), l[0] ? l[0].sampleRate : 0]).sort((x, y) => y[2] - x[2]),
    _lista: todos => Object.keys(FX).filter(n => todos || n[0] !== '_'),
    _bucles: () => Object.keys(BUCLES),
    _musicas: () => Object.keys(TEMAS),
    _estado: () => ({voces: vivas, sueltos: VOCES.filter(v => !v.muere).length, fuentes: [...VIVAS].reduce((o, s) => { o[s._et] = (o[s._et] || 0) + 1; return o; }, {}), bucles: [...BUC.keys()], doppler: [...BUC.values()].filter(B => B.def.doppler).map(B => [B.id, +B.dop.toFixed(3)]), musica: MUS.nombre, tension: kTension, corazon: kCorazon,
      amortiguar: kAmort, pausa: pausado, ctx: C ? C.state : 'sin contexto', horneados: Object.keys(BUF).length, pendientes: COLA.length,
      descartados, msHorno: +msHorno.toFixed(1), memoriaMB: +(Object.values(BUF).reduce((a, l) => a + l.reduce((b, x) => b + x.length*x.numberOfChannels*4, 0), 0)/1048576).toFixed(1), lechos: Object.keys(AMBN.lechos).concat(AMBN.viento ? ['viento'] : []), tensionViva: !!TEN.n, voz: !!VOZ.n, sinAudio})
  };
})();
