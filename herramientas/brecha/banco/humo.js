const {chromium}=require('/tmp/ui/node_modules/playwright');
process.chdir('/tmp/claude-0/b7');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await b.newPage({viewport:{width:412,height:892},deviceScaleFactor:2.625,hasTouch:true});
 const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' '))); pg.on('console',m=>{if(m.type()==='error')err.push('console: '+m.text())});
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); 
 try{ await pg.waitForFunction('window.__S && window.__S.listo',{timeout:30000}); }catch(e){ console.log('no cargó', err); await b.close(); return; }
 await pg.waitForTimeout(4000); await pg.screenshot({path:'b/titulo.png'});
 console.log(JSON.stringify(await pg.evaluate(()=>__S.est())));
 console.log('errores', err.slice(0,8));
 await b.close();})();
