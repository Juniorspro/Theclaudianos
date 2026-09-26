const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:412,height:892},deviceScaleFactor:1,isMobile:true,hasTouch:true}); const pg=await ctx.newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 if(process.argv[2]==='offline'){ await ctx.route('**/*', r=> r.request().url().startsWith('file:') ? r.continue() : (err.push('RED '+r.request().url()), r.abort())); }
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 const cdp=await ctx.newCDPSession(pg); const T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
 const centro=async id=>pg.evaluate(id=>{ const r=document.getElementById(id).getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2, r.width, r.height]; },id);
 const tap=async id=>{ const [x,y]=await centro(id); await T('touchStart',[{x,y,id:9}]); await pg.waitForTimeout(60); await T('touchEnd',[]); await pg.waitForTimeout(350); };
 const res={}; const est=()=>pg.evaluate(()=>({modo:__V.J.modo, capa:[...document.querySelectorAll('.capa')].filter(c=>getComputedStyle(c).display!=='none').map(c=>c.id)}));
 // menús
 await tap('btJugar'); res.misiones=(await est()).capa.join(); await tap('btDespegar'); await pg.waitForTimeout(1500); res.despegar=(await est()).modo;
 await pg.evaluate(()=>{ __V.J.bot=false; window.__AP=[]; const o=window.apretar; window.apretar=(k,v)=>{ window.__AP.push(k+':'+v); o(k,v); }; });
 // stick: "derecha" del juego = +y físico con la pantalla girada
 const [sx,sy]=await centro('zonaStick'); await T('touchStart',[{x:sx,y:sy,id:1}]); for(let k=1;k<=6;k++){ await T('touchMove',[{x:sx,y:sy+k*10,id:1}]); await pg.waitForTimeout(16); }
 res.stickDer=await pg.evaluate(()=>__V.IN.x.toFixed(2));
 for(let k=1;k<=6;k++){ await T('touchMove',[{x:sx+k*10,y:sy,id:1}]); await pg.waitForTimeout(16); }
 res.stickY=await pg.evaluate(()=>__V.IN.y.toFixed(2));
 // segundo dedo: fuego con el stick apretado
 const [fx,fy]=await centro('bFuego'); await T('touchStart',[{x:sx+60,y:sy,id:1},{x:fx,y:fy,id:2}]); await pg.waitForTimeout(300);
 res.fuegoConStick=await pg.evaluate(()=>__V.IN.fuego+' x='+__V.IN.x.toFixed(2)+' y='+__V.IN.y.toFixed(2));
 await T('touchEnd',[]); await pg.waitForTimeout(100); res.suelta=await pg.evaluate(()=>__V.IN.fuego+' '+__V.IN.x);
 for(const id of ['bMisil','bTurbo','bFreno','bBengala','bCamara']){ const [x,y]=await centro(id); await T('touchStart',[{x,y,id:3}]); await pg.waitForTimeout(80); await T('touchEnd',[]); await pg.waitForTimeout(150); }
 res.apretados=await pg.evaluate(()=>[...new Set(window.__AP)].join(' ')); res.cam=await pg.evaluate(()=>__V.J.camModo);
 // tapados: cada botón tiene que ser lo que está arriba en su centro
 res.tapados=await pg.evaluate(()=>['bFuego','bMisil','bTurbo','bFreno','bBengala','bCamara','bPausa'].filter(id=>{ const r=document.getElementById(id).getBoundingClientRect(); const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return !e || !document.getElementById(id).contains(e); }));
 await tap('bPausa'); res.pausa=(await est()).modo; await tap('btSeguir'); res.seguir=(await est()).modo;
 await tap('bPausa'); await tap('btSalir'); res.salir=JSON.stringify(await est());
 await tap('btHangar'); res.hangar=(await est()).modo; await tap('btSig'); res.sig=await pg.evaluate(()=>document.getElementById('ficha').textContent.slice(0,30)); await tap('btHanVolver');
 await tap('btComo'); res.como=(await est()).capa.join(); await tap('btComoVolver').catch(()=>{});
 console.log(JSON.stringify(res,null,1)); console.log('err',JSON.stringify(err)); await b.close(); })();
