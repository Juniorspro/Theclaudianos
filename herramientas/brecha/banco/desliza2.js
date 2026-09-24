const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 for(const [w,h] of [[412,892],[892,412]]){
 const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,hasTouch:true,isMobile:true}); const pg=await ctx.newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:90000});
 const cdp=await ctx.newCDPSession(pg); const T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
 await pg.evaluate(()=>{ __S.G.dinero = 9000; __S.armarArmeria('mejoras'); __S.mostrar('capaArmeria'); }); await pg.waitForTimeout(400);
 const info = ()=> pg.evaluate(()=>{ const c = document.getElementById('capaArmeria'); return {st:Math.round(c.scrollTop), max:c.scrollHeight - c.clientHeight, dinero:__S.G.dinero}; });
 const i0 = await info();
 // arrastre "hacia arriba" en coordenadas del juego = contenido baja. Con la pantalla girada, arriba del juego = +x físico
 const g = w < h, cx = w/2, cy = h/2, paso = (k)=> g ? {x:cx + k, y:cy} : {x:cx, y:cy - k};
 await T('touchStart',[{...paso(0), id:1}]); for(let k=1;k<=5;k++){ await T('touchMove',[{...paso(k*14), id:1}]); await pg.waitForTimeout(12); } await T('touchEnd',[]);
 const i1 = await info(); await pg.waitForTimeout(700); const i2 = await info();
 // arrastrar empezando sobre un botón de compra no compra
 const bt = await pg.evaluate(()=>{ const x = [...document.querySelectorAll('#listaArmeria button')].find(b=>{ const r=b.getBoundingClientRect(); return r.width && r.top > 0 && r.bottom < innerHeight && r.left > 0 && r.right < innerWidth; }); const r = x.getBoundingClientRect(); return {x:r.x + r.width/2, y:r.y + r.height/2, t:x.textContent}; });
 const d0 = (await info()).dinero; await T('touchStart',[{x:bt.x, y:bt.y, id:2}]); for(let k=1;k<=6;k++){ await T('touchMove',[{x:bt.x + (g ? -k*15 : 0), y:bt.y + (g ? 0 : k*15), id:2}]); await pg.waitForTimeout(16); } await T('touchEnd',[]); await pg.waitForTimeout(500);
 const d1 = (await info()).dinero;
 // un toque quieto sí compra
 await pg.waitForTimeout(600); const bt2 = await pg.evaluate(()=>{ const x = [...document.querySelectorAll('#listaArmeria button')].find(b=>{ const r=b.getBoundingClientRect(); return r.width && r.top > 0 && r.bottom < innerHeight && r.left > 0 && r.right < innerWidth && /\$/.test(b.textContent); }); const r = x.getBoundingClientRect(); return {x:r.x + r.width/2, y:r.y + r.height/2}; });
 await T('touchStart',[{x:bt2.x, y:bt2.y, id:3}]); await T('touchEnd',[]); await pg.waitForTimeout(500); const d2 = (await info()).dinero;
 console.log(w+'x'+h, 'antes', JSON.stringify(i0), 'al soltar', i1.st, 'con inercia', i2.st, '| arrastre sobre botón: dinero', d0, '→', d1, '| toque:', d1, '→', d2, 'errores', err.slice(0,2));
 await ctx.close(); }
 await b.close(); })();
