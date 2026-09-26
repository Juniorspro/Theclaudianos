const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412},deviceScaleFactor:1})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' '))); pg.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') err.push(m.type()+': '+m.text().slice(0,300)); });
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000}).catch(e=>err.push('NO LISTO'));
 await pg.waitForTimeout(1500); await pg.screenshot({path:'/tmp/claude-0/av/b/t_titulo.png'});
 console.log(JSON.stringify(await pg.evaluate(()=>__V.assets())));
 console.log(JSON.stringify(await pg.evaluate(()=>{ __V.iniciar(0,'UNO'); __V.dios(true); return __V.anda(600); })));
 await pg.evaluate(()=>{ __V.bot(false); __V.dibujarYa(); }); await pg.waitForTimeout(800); await pg.screenshot({path:'/tmp/claude-0/av/b/t_juego.png'});
 console.log('errores', JSON.stringify(err.slice(0,12))); await b.close(); })();
