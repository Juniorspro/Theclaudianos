const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:412,height:892},deviceScaleFactor:2.625,hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
 const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:30000});
 const cdp=await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate',{rate:+(process.argv[2]||6)});
 for(const m of [0,1,2,3,4]){
  await pg.evaluate(m=>{ __S.iniciar(m,'UNO'); __S.dios(true); __S.bot(true); }, m);
  await pg.waitForTimeout(8000);
  const r=await pg.evaluate(()=>new Promise(res=>{ let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<6000) requestAnimationFrame(f); else res({fps:+(n/((performance.now()-t0)/1000)).toFixed(1), cal:CALIDAD, llamadas:ren.info.render.calls, tri:ren.info.render.triangles}); }; requestAnimationFrame(f); }));
  console.log(m, JSON.stringify(r));
 }
 console.log('errores',err.slice(0,5)); await b.close();})();
