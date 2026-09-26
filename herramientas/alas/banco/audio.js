const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--autoplay-policy=no-user-gesture-required']});
 const pg=await (await b.newContext({viewport:{width:892,height:412}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 await pg.mouse.click(400,200); await pg.waitForTimeout(4000);
 await pg.evaluate(()=>audioIni()); await pg.waitForTimeout(5000); const r=await pg.evaluate(async()=>{ const a=__V.assets(); const ids=Object.keys(SONIDOS).sort();
   __V.iniciar(0,'UNO'); __V.J.bot=true; const n0=VOZ.n; voz('fox',true); tonoCabina('alarma'); await new Promise(r=>setTimeout(r,600)); tonoCabina(null); ['misil','boom','impacto','pasada','bengala','boton'].forEach(k=>sfx(k,0.5));
   for(let i=0;i<300;i++) pasar(); return {a, ids:ids.length, faltan:['motor_jet','posquemador','viento','alarma_misil','mus_menu','mus_combate','mus_victoria','radio_fox2_es','radio_cola_pt','radio_abatido_en'].filter(k=>!SONIDOS[k]), voz:VOZ.n-n0, musica:!!MUS.fuente, bucles:Object.keys(BUCLES), ac:AC&&AC.state}; });
 console.log(JSON.stringify(r)); console.log('err',JSON.stringify(err)); await b.close(); })();
