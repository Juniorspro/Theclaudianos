const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:412,height:892},isMobile:true,hasTouch:true}); const pg=await ctx.newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await ctx.route('**/*', r=> r.request().url().startsWith('file:') ? r.continue() : (err.push('RED '+r.request().url()), r.abort()));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 const cdp=await ctx.newCDPSession(pg); const T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
 const centro=async id=>pg.evaluate(id=>{ const r=document.getElementById(id).getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]; },id);
 await pg.evaluate(()=>{ __V.iniciar(0,'UNO'); __V.dios(true); __V.J.bot=false; __V.J.aviones.forEach(a=>{ if(!a.jug) a.vivo=false; }); });
 await pg.waitForTimeout(800);
 const ang=()=>pg.evaluate(()=>{ const j=__V.J.jug, v=new THREE.Vector3(); cam.getWorldDirection(v); const F=adelante(j); const R=derechaDe(j), U=arribaDe(j); return {yaw:+MIRAR.yaw.toFixed(2), pit:+MIRAR.pit.toFixed(2), dF:+v.dot(F).toFixed(2), dR:+v.dot(R).toFixed(2), dU:+v.dot(U).toFixed(2), ojo:document.getElementById('ojo').classList.contains('ver')}; });
 const res={};
 // un dedo arrastra en la zona de mirar hacia la "derecha" del juego (= +y físico con la pantalla girada), ~13 cm de juego
 // punto de la zona libre de botones: arriba en el juego = x físico grande
 const [zx,zy]=await pg.evaluate(()=>{ const r=document.getElementById('zonaMirar').getBoundingClientRect(); return [r.left+r.width*0.62, r.top+r.height*0.25]; });
 const arrastra=async(dx,dy,id=1,extra=[])=>{ await T('touchStart',[...extra,{x:zx,y:zy,id}]); for(let k=1;k<=10;k++){ await T('touchMove',[...extra,{x:zx+dx*k/10,y:zy+dy*k/10,id}]); await pg.waitForTimeout(16); } };
 await arrastra(0,140); await pg.waitForTimeout(250); res.derecha=await ang(); await pg.screenshot({path:'/tmp/claude-0/av/b/mir_der.png'});
 await T('touchEnd',[]); await pg.waitForTimeout(400); res.recienSuelto=await ang(); await pg.waitForTimeout(2500); res.vuelve=await ang();
 await arrastra(0,285); await pg.waitForTimeout(250); res.atras=await ang(); await pg.screenshot({path:'/tmp/claude-0/av/b/mir_atras.png'}); await T('touchEnd',[]);
 // doble toque centra
 for(let i=0;i<2;i++){ await T('touchStart',[{x:zx,y:zy,id:4}]); await pg.waitForTimeout(40); await T('touchEnd',[]); await pg.waitForTimeout(120); } res.dobleToque=await ang();
 // arriba: en el juego y negativo = x físico mayor
 await arrastra(-0,0); await T('touchEnd',[]);
 await T('touchStart',[{x:zx-60,y:zy,id:5}]); for(let k=1;k<=10;k++){ await T('touchMove',[{x:zx-60+k*12,y:zy,id:5}]); await pg.waitForTimeout(16);} await pg.waitForTimeout(250); res.arriba=await ang(); await pg.screenshot({path:'/tmp/claude-0/av/b/mir_arriba.png'}); await T('touchEnd',[]);
 await pg.evaluate(()=>mirarCentrar());
 // stick + mirar a la vez con dos dedos
 const [sx,sy]=await centro('zonaStick'); await T('touchStart',[{x:sx,y:sy,id:1}]); await T('touchMove',[{x:sx,y:sy+50,id:1}]);
 await T('touchStart',[{x:sx,y:sy+50,id:1},{x:zx,y:zy,id:2}]); for(let k=1;k<=8;k++){ await T('touchMove',[{x:sx,y:sy+50,id:1},{x:zx,y:zy-k*12,id:2}]); await pg.waitForTimeout(16); }
 res.dosDedos=await pg.evaluate(()=>({stickX:+__V.IN.x.toFixed(2), yaw:+MIRAR.yaw.toFixed(2)})); await T('touchEnd',[]); await pg.waitForTimeout(100);
 // cabina
 await pg.evaluate(()=>{ __V.J.camModo=1; mirarCentrar(); }); await arrastra(0,140); await pg.waitForTimeout(300); res.cabina=await ang(); await pg.screenshot({path:'/tmp/claude-0/av/b/mir_cabina.png'}); await T('touchEnd',[]);
 // un botón encima de la zona sigue andando
 const [fx,fy]=await centro('bFuego'); await T('touchStart',[{x:fx,y:fy,id:7}]); await pg.waitForTimeout(100); res.fuegoEncima=await pg.evaluate(()=>__V.IN.fuego+' yaw '+MIRAR.yaw.toFixed(2)); await T('touchEnd',[]);
 console.log(JSON.stringify(res,null,1)); console.log('err',JSON.stringify(err)); await b.close(); })();
