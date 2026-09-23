const {chromium}=require('/tmp/ui/node_modules/playwright');
const O=process.env.SALIDA||'/tmp/ui/mate/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:412,height:892},hasTouch:true,isMobile:true,deviceScaleFactor:2.625,locale:'es-AR'});
 const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n')[1])); p.on('console',m=>{ if(m.type()==='error') errs.push('CON '+m.text().slice(0,200)); });
 const cdp=await p.context().newCDPSession(p);
 await p.goto('file:///tmp/ui/mate_b.html'); await p.waitForTimeout(1500);
 const m=await p.evaluate(()=>__M.medida());
 const pg=(x,y)=>{ const sx=x*m.SW/m.W, sy=y*m.SH/m.H; return m.GIRADO?{x:412-sy,y:sx}:{x:sx,y:sy}; };
 const act={}; const send=t=>cdp.send('Input.dispatchTouchEvent',{type:t,touchPoints:Object.entries(act).map(([id,q])=>({...pg(q[0],q[1]),id:+id}))});
 const pon=async(id,x,y)=>{ act[id]=[x,y]; await send('touchStart'); }, mueve=async(id,x,y)=>{ act[id]=[x,y]; await send('touchMove'); }, saca=async id=>{ delete act[id]; await send('touchEnd'); };
 const st=()=>p.evaluate(()=>{ const H=__M.HE; return {x:+H.x.toFixed(2),y:+H.y.toFixed(2),vx:+H.vx.toFixed(1),vy:+H.vy.toFixed(1),est:H.est,dir:H.dir,ts:+__M.J.ts.toFixed(2),pts:__M.J.puntos,apunta:__M.CTRL.apunta,blanco:__M.CTRL.blanco&&__M.CTRL.blanco.cosa.tipo,tiros:__M.J.tiros,vivos:__M.ENEM.filter(e=>!e.muerto).length}; });
 await p.evaluate(()=>{ __M.jugar(0,false); __M.saltarCine(); }); await p.waitForTimeout(800);
 const W=m.W, H=m.H;
 console.log('0', JSON.stringify(await st()));
 // izquierda: palanca a la derecha 1,2 s
 await pon(1, 60, H-50); await mueve(1, 70, H-50); await mueve(1, 85, H-50); await p.waitForTimeout(1200); console.log('camina', JSON.stringify(await st()));
 // salto sin soltar la derecha: palanca arriba-derecha
 await mueve(1, 80, H-72); await p.waitForTimeout(250); await p.screenshot({path:O+'k1.png'}); console.log('salta', JSON.stringify(await st()));
 await mueve(1, 85, H-50); await p.waitForTimeout(700); await saca(1); await p.waitForTimeout(400); console.log('cae', JSON.stringify(await st()));
 // mueve hasta cerca del primer matón y apunta con la derecha hacia él
 await p.evaluate(()=>{ __M.HE.x=22; __M.HE.y=4; }); await p.waitForTimeout(600);
 await pon(2, W-60, H-50); await mueve(2, W-50, H-52); await mueve(2, W-40, H-53); await p.waitForTimeout(150); await p.screenshot({path:O+'k2.png'}); await p.waitForTimeout(1200); console.log('apunta', JSON.stringify(await st()));
 // salto en el aire apuntando: cámara lenta
 await pon(1, 60, H-50); await mueve(1, 60, H-75); await p.waitForTimeout(300); console.log('aire+apunta', JSON.stringify(await st())); await p.screenshot({path:O+'k3.png'});
 await saca(1); await saca(2); await p.waitForTimeout(1500); console.log('fin', JSON.stringify(await st()));
 console.log(errs.slice(0,8)); await b.close(); })();
