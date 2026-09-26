const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 for(const cpu of [1,6]){ const ctx=await b.newContext({viewport:{width:892,height:412}}); const pg=await ctx.newPage();
  await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
  const cdp=await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  const fila=[];
  for(const mi of [0,2,4]){ await pg.evaluate(mi=>{ __V.iniciar(mi,'UNO'); __V.dios(true); window.__n=0; if(!window.__raf){ window.__raf=1; const f=()=>{ window.__n++; requestAnimationFrame(f); }; requestAnimationFrame(f); } },mi);
   await pg.waitForTimeout(9000); const a=await pg.evaluate(()=>[window.__n, CALIDAD]); await pg.waitForTimeout(6000); const c=await pg.evaluate(()=>[window.__n, CALIDAD]);
   fila.push('m'+(mi+1)+' '+((c[0]-a[0])/6).toFixed(1)+' fps q'+c[1].toFixed(2)); }
  console.log('CPUx'+cpu, fila.join(' | ')); await ctx.close(); }
 await b.close(); })();
