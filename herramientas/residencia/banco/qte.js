// el placard sin navegador: la misma cuenta que pasoQTE contra una persona con atraso, tope de toques y dudas
// node qte.js [deriva] [toque] [zona]
const [deriva, toque, zona] = [+(process.argv[2] || 0.26), +(process.argv[3] || 0.055), +(process.argv[4] || 0.2)];
const lim = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a)*t, rv = (a, b) => a + Math.random()*(b - a);
function una(h, atraso, dudas){ const dt = 1/60, Q = {t:0, dur:lerp(4.2, 6.2, h), pos:0.5, vel:0, fuera:0, fuerzaT:0, fuerza:0}, hq = [], hv = []; let tq = 0;
  for(;;){ Q.t += dt; Q.fuerzaT -= dt;
    /* el bicho tira para un lado, cambia de lado cada tanto, y más fuerte a la madrugada */
    if(Q.fuerzaT <= 0){ Q.fuerzaT = rv(0.5, 1.1); Q.fuerza = (Math.random() < 0.5 ? -1 : 1)*rv(0.7, 1.2)*deriva*(1 + h*0.6); }
    Q.vel += (Q.fuerza - Q.vel)*Math.min(1, dt*4); Q.pos = lim(Q.pos + Q.vel*dt, 0, 1);
    const fuera = Math.abs(Q.pos - 0.5) > zona; if(fuera) Q.fuera += dt; else Q.fuera = Math.max(0, Q.fuera - dt*0.6);
    if(Q.fuera > 1.0 || Q.pos <= 0.03 || Q.pos >= 0.97) return 0; if(Q.t >= Q.dur) return 1;
    hq.push(Q.pos); hv.push(Q.vel); const k = hq.length - 1 - Math.round(atraso/dt); tq -= dt;
    if(k > 2 && tq <= 0){ const pd = hq[k], vd = hv[k], pr = pd + vd*0.2; if(Math.abs(pr - 0.5) > 0.05 && Math.random() > dudas){ const s = Math.sign(0.5 - pr)*(Math.random() < 0.05 ? -1 : 1); Q.pos = lim(Q.pos + s*toque, 0, 1); Q.vel *= 0.4; tq = 1/5; } } } }
for(const [atraso, dudas] of [[0.2, 0.1], [0.3, 0.15], [0.45, 0.25]]){ const f = []; for(const h of [0, 0.5, 1]){ let g = 0; for(let i = 0; i < 3000; i++) g += una(h, atraso, dudas); f.push((g/30).toFixed(0) + '%'); } console.log('atraso', atraso, 'dudas', dudas, 'h 0 / 0,5 / 1 →', f.join(' / ')); }
