const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' '))); pg.on('console',m=>{ if(m.type()==='error') err.push('console: '+m.text().slice(0,300)); });
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Contragolpe.html'); await pg.waitForFunction('window.__C && window.__C.listo',{timeout:120000}).catch(e=>err.push('NO LISTO'));
 console.log(JSON.stringify(await pg.evaluate(()=>({ms:__C.msMapa, caras:__C.CARAS.lista.length, atlas:[__C.CARAS.atlasW,__C.CARAS.atlasH], cajas:__C.MUNDO.n, post:true}))));
 const tomas=(process.argv[2]||'').split(';').filter(Boolean).map(s=>s.split(',').map(Number));
 const def=[[0,1.63,-14,0,0],[-6,1.63,-2,0.3,-0.05],[14,6,14,0.8,-0.35],[-4,1.63,9,Math.PI*0.95,-0.1]];
 let i=0; for(const [x,y,z,yaw,pitch] of (tomas.length?tomas:def)){ await pg.evaluate(([x,y,z,yaw,pitch])=>{ __C.camara(x,y,z,yaw,pitch); __C.dibujarYa(); },[x,y,z,yaw,pitch]); await pg.waitForTimeout(250); await pg.screenshot({path:`/tmp/claude-0/cs/b_${i++}.png`}); }
 console.log('err',JSON.stringify(err.slice(0,8))); await b.close(); })();
