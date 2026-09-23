const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:60000});
 for(const m of [0,1]){ for(const c of [1, 0.4]){
   await pg.evaluate(([m,c])=>{ G.graficos = c===1 ? 'alta' : 'baja'; __S.iniciar(m,'UNO'); __S.dios(true); fijarCalidad(c); __S.anda(240); __S.bot(false); __S.dibujarYa(); __S.dibujarYa(); }, [m,c]);
   await pg.waitForTimeout(1200); await pg.screenshot({path:`/tmp/claude-0/b7/b/barato_${m}_${c}.png`}); } }
 console.log(JSON.stringify(await pg.evaluate(()=>({barato:BARATO.on, mats:BARATO.mats.size}))), 'errores', err); await b.close(); })();
