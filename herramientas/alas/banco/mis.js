const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412},deviceScaleFactor:1})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 await pg.waitForTimeout(1000); await pg.screenshot({path:'/tmp/claude-0/av/b/m_titulo.png'});
 const ns=(process.argv[2]||'0,1,2,3,4').split(',').map(Number);
 for(const n of ns){
  await pg.evaluate(n=>{ __V.iniciar(n,'UNO'); __V.dios(true); __V.anda(90); },n);
  await pg.waitForTimeout(2500); await pg.evaluate(()=>__V.dibujarYa());
  await pg.screenshot({path:`/tmp/claude-0/av/b/m_${n}.png`});
  console.log(n, JSON.stringify(await pg.evaluate(()=>__V.est())));
 }
 console.log('errores', JSON.stringify(err.slice(0,12))); await b.close(); })();
