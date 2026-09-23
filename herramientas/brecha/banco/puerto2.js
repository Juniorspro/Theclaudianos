const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412},deviceScaleFactor:1.5})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:60000});
 await pg.evaluate(()=>{ G.graficos='alta'; __S.iniciar(2,'UNO'); __S.dios(true); fijarCalidad(1); __S.anda(200); __S.bot(false); });
 const vistas = [['a', 0, -0.1], ['b', 0.5, -0.18], ['c', -0.45, -0.12], ['d', 0.15, -0.35]];
 for(const [n, yaw, pitch] of vistas){ await pg.evaluate(([yaw,pitch])=>{ const j=__S.J.jug; j.yaw = yaw; j.pitch = pitch; j.base = 0; __S.anda(2); __S.dibujarYa(); }, [yaw,pitch]); await pg.waitForTimeout(700); await pg.screenshot({path:'/tmp/claude-0/b7/b/pu_'+n+'.png'}); }
 console.log('errores', err); await b.close(); })();
