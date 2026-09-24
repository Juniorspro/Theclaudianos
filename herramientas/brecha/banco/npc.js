const {chromium}=require('/tmp/ui/node_modules/playwright');
const url = process.argv[2] || 'file:///home/user/Theclaudianos/juegos-pc/Brecha.html';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:640,height:300}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto(url); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:90000});
 let tot = {disp:0, bloq:0, atraves:0, muestras:0, adentro:0};
 for(const sem of ['UNO','DOS']) for(const m of [0,1,4]){
  const r = await pg.evaluate(([m,sem])=>{
    const st = {disp:0, bloq:0, atraves:0, muestras:0, adentro:0};
    const libre = (e, cp)=>{ const ps = e.pts ? [e.pts.cab, e.pts.pec] : []; for(const q of ps){ const d = q.clone().sub(cp), L = d.length(); d.normalize(); const w = rayoMundo(cp, d, L); if(!w || w.t >= L - 0.25) return true; } return !ps.length; };
    const d0 = window.dispararEnemigo; window.dispararEnemigo = function(e, dist){ const j = __S.J.jug, cp = camPos(), l = libre(e, cp), hp = j.hp; const r = d0.apply(this, arguments); st.disp++; if(!l){ st.bloq++; if(j.hp < hp) st.atraves++; } return r; };
    __S.iniciar(m, sem); __S.dios(false); const j = __S.J.jug; j.hp = j.hpMax = 1e9; let k = 0;
    while(k < 60*200 && __S.J.modo==='juego' && !__S.J.fin){ __S.anda(30); k += 30; j.hp = 1e9;
      for(const e of __S.J.enemigos){ if(!e.vivo || e.padre || e.espera > 0 || e.estado==='conduce') continue; st.muestras++;
        for(const bx of MUNDO.cajas){ if(bx.tipo==='puerta' || !(bx.y0 < e.pos.y + 1.6 && bx.y1 > e.pos.y + 0.2)) continue; const cx = Math.max(bx.x0, Math.min(bx.x1, e.pos.x)), cz = Math.max(bx.z0, Math.min(bx.z1, e.pos.z));
          if(Math.hypot(e.pos.x - cx, e.pos.z - cz) < 0.12){ st.adentro++; break; } } } }
    window.dispararEnemigo = d0; st.fin = __S.J.fin ? __S.J.fin.gano : null; st.seg = Math.round(k/60); return st; }, [m, sem]);
  console.log(sem, m, JSON.stringify(r)); for(const k in tot) tot[k] += r[k]; }
 console.log('TOTAL', JSON.stringify(tot), 'errores', err.slice(0,3)); await b.close(); })();
