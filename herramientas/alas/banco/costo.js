const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412}})).newPage();
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 console.log(await pg.evaluate(()=>{ __V.iniciar(2,'UNO'); __V.dios(true); __V.J.modo='juego'; for(let i=0;i<600;i++) pasar(); let t=performance.now(); for(let i=0;i<600;i++) pasar(); const tp=(performance.now()-t)/600;
   const gl=ren.getContext(); t=performance.now(); for(let i=0;i<20;i++){ dibujar(); gl.finish(); } const td=(performance.now()-t)/20;
   ren.info.autoReset=false; ren.info.reset(); dibujar(); const inf=[ren.info.render.calls, ren.info.render.triangles]; ren.info.autoReset=true;
   return JSON.stringify({pasar_ms:tp.toFixed(2), dibujar_ms:td.toFixed(1), llamadas:inf[0], tris:inf[1], calidad:CALIDAD, lienzo:[cv3.width,cv3.height]}); }));
 await b.close(); })();
