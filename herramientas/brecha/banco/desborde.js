const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 for(const [w,h] of [[412,892],[412,742],[360,740],[412,640],[892,412]]){
 const pg=await (await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true})).newPage();
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:60000}); await pg.waitForTimeout(800);
 const r = await pg.evaluate(()=>{ const out = {}; for(const id of ['capaTitulo','capaMisiones','capaEquipo','capaArmeria','capaComo','capaRes']){ __S.mostrar(id); const c = document.getElementById(id); out[id] = c.scrollHeight - c.clientHeight; } __S.mostrar('capaTitulo'); return out; });
 console.log(w+'x'+h, JSON.stringify(r)); await pg.close(); }
 await b.close(); })();
