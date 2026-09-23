const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:892,height:412},hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
 const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' '))); pg.on('console',m=>{ if(m.type()==='error') err.push('console: '+m.text()); });
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:60000});
 await pg.evaluate(()=>{ window.__toc = {}; const t0 = window.tocar; window.tocar = function(buf, vol){ const k = Object.keys(BANCO).find(k=> BANCO[k] && BANCO[k].includes && BANCO[k].includes(buf)) || '?'; __toc[k] = (__toc[k]||0) + 1; return t0.apply(this, arguments); }; });
 await pg.evaluate(()=> document.querySelector('#btSonido').click()); await pg.evaluate(()=> document.querySelector('#btSonido').click());
 await pg.waitForTimeout(2500);
 const r = await pg.evaluate(()=>{ const out = {estado:AC && AC.state, sr:AC && AC.sampleRate, ms:BANCO.__ms, n:0, malas:[], stats:{}};
   for(const k in BANCO){ if(k==='__ms') continue; for(const bf of BANCO[k]){ out.n++; const d = bf.getChannelData(0); let p = 0, s = 0, nan = 0; for(let i=0;i<d.length;i++){ const v = d[i]; if(!isFinite(v)) nan++; p = Math.max(p, Math.abs(v)); s += v*v; }
     const rms = Math.sqrt(s/d.length); out.stats[k] = [+bf.duration.toFixed(2), +p.toFixed(2), +(20*Math.log10(rms+1e-9)).toFixed(1)]; if(nan || p < 0.05 || p > 1.01) out.malas.push(k + ' nan' + nan + ' pico' + p.toFixed(2)); } }
   return out; });
 console.log(JSON.stringify({estado:r.estado, sr:r.sr, ms:r.ms, n:r.n, malas:r.malas}));
 console.log(Object.entries(r.stats).map(([k,v])=> k+':'+v.join('/')).join('  '));
 // partida con bot: 20 s de juego real, contando lo que suena
 await pg.evaluate(()=>{ __S.iniciar(0,'UNO'); __S.dios(true); });
 for(let k=0;k<8;k++){ await pg.waitForTimeout(1000); await pg.evaluate(()=> __S.anda(120)); }
 const s = await pg.evaluate(()=>({toc:__toc, voces:VOCES_ACT, bucles:Object.keys(BUCLES), musica:{modo:MUS.modo, i:MUS.i, pista:MUS.pista}, amb:J.ambiente, revOk:!!(rev && rev.buffer), est:__S.est()}));
 console.log(JSON.stringify(s));
 // convoy: bucles de motor y rotor
 await pg.evaluate(()=>{ __S.iniciar(3,'UNO'); __S.dios(true); });
 for(let k=0;k<6;k++){ await pg.waitForTimeout(700); await pg.evaluate(()=> __S.anda(90)); }
 console.log(JSON.stringify(await pg.evaluate(()=>({bucles:Object.keys(BUCLES), amb:J.ambiente, musica:MUS.modo, heli:!!J.heli}))));
 console.log('errores', err.slice(0,8)); await b.close();})();
