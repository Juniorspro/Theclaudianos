const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 let i=0; for(const [mi,idx,dx,dy,dz] of [[2,0,260,60,260],[2,0,-120,25,-200],[3,0,90,25,120],[3,1,-60,12,90]]){
  await pg.evaluate(mi=>{ __V.iniciar(mi,'UNO'); __V.G.graficos='x'; fijarCalidad(1); __V.anda(3); __V.J.modo='pausa'; },mi); await pg.waitForTimeout(2200);
  await pg.evaluate(([idx,dx,dy,dz])=>{ const X=__V.x, s=X.BLANCOS_SUP[idx]; X.cam.position.set(s.pos.x+dx, dy, s.pos.z+dz); X.cam.lookAt(s.pos.x, 8, s.pos.z); X.cam.updateMatrixWorld(); __V.dibujarYa(); },[idx,dx,dy,dz]);
  await pg.waitForTimeout(300); await pg.evaluate(()=>__V.dibujarYa()); await pg.screenshot({path:`/tmp/claude-0/av/b/barco_${i++}.png`}); }
 console.log('err',JSON.stringify(err)); await b.close(); })();
