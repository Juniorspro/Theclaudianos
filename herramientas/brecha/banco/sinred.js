const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:412,height:892},deviceScaleFactor:2.625,hasTouch:true,isMobile:true,offline:true});
 await ctx.route('**/*', r=> r.request().url().startsWith('file:') ? r.continue() : (console.log('PEDIDO A LA RED', r.request().url()), r.abort()));
 const pg=await ctx.newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:30000});
 await pg.waitForTimeout(2500); await pg.screenshot({path:'/tmp/claude-0/b7/b/f_sinred.png'});
 console.log(JSON.stringify(await pg.evaluate(()=>{ __S.iniciar(1,'UNO'); __S.dios(true); return __S.anda(600); })));
 console.log('errores', err); await b.close();})();
