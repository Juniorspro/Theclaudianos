const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:892,height:412},deviceScaleFactor:1.5,hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
 const err=[]; pg.on('pageerror',e=>err.push(e.message)); pg.on('console',m=>{ if(m.type()==='error') err.push('console: '+m.text()); });
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html');
 await pg.waitForTimeout(250); await pg.screenshot({path:'/tmp/claude-0/b7/b/a_carga.png'});
 await pg.waitForFunction('window.__S && window.__S.listo',{timeout:60000});
 const foto=async (n)=>{ await pg.waitForTimeout(700); await pg.screenshot({path:'/tmp/claude-0/b7/b/a_'+n+'.png'}); };
 await foto('titulo'); if(process.argv[2]==='solo') { await b.close(); return; }
 const clic=sel=>pg.evaluate(s=>document.querySelector(s).click(), sel);
 await clic('#btJugar'); await foto('misiones');
 await clic('#listaMisiones > *:nth-child(1)'); await foto('equipo');
 await clic('#btEqVolver'); await clic('#btMisVolver');
 await clic('#btArmeria'); await foto('armeria');
 await clic('.tab[data-t="mejoras"]'); await foto('mejoras');
 await clic('#btArmVolver'); await clic('#btComo'); await foto('como'); await clic('#btComoVolver');
 const tapa = await pg.evaluate(()=>({tapa:FONDO.tapa, id:FONDO.id, as:__S.assets()}));
 console.log(JSON.stringify(tapa));
 await pg.evaluate(()=>{ __S.iniciar(0,'UNO'); __S.dios(true); let k=0; while(!__S.J.fin && k<60*200){ __S.anda(10); k+=10; } __S.bot(false); __S.anda(600); });
 await pg.waitForTimeout(4500); await foto('informe');
 console.log('errores', err.slice(0,8)); await b.close();})();
