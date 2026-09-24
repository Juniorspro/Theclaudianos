const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await b.newPage({viewport:{width:892,height:412},deviceScaleFactor:1});
 const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:90000});
 const armas=(process.argv[2]||'p9,k5,r4,b12,m14,l96').split(','), mej = process.argv[3] !== 'sin';
 for(const a of armas) for(const z of [0,1]){
   await pg.evaluate(([a,z,mej])=>{ G.graficos='alta'; fijarCalidad(1); __S.G.armas[a]=1; G.mejoras[a] = mej ? {silen:1, mira:1, cargador:1, empu:1} : {}; __S.iniciar(0,'UNO'); __S.dios(true); __S.bot(false);
     const j=__S.J.jug; j.armas=[a,'p9']; j.ai=0; VM.id=null; armarVM(a); j.yaw=0; j.pitch=-0.05; IN.apuntarT = !!z; __S.anda(40); __S.dibujarYa(); }, [a,z,mej]);
   await pg.waitForTimeout(300); await pg.screenshot({path:`/tmp/claude-0/b7/b/vm2_${a}_${z}.png`});
 }
 console.log('errores', err.slice(0,5)); await b.close();})();
