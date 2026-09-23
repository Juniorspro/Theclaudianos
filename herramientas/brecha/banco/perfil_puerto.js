const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:412,height:892},deviceScaleFactor:2.625,hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
 const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:60000});
 await pg.evaluate(()=>{ G.graficos='baja'; __S.iniciar(2,'UNO'); __S.dios(true); fijarCalidad(0.4); __S.anda(200); });
 const ms = ()=> pg.evaluate(()=>new Promise(res=>{ let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<4000) requestAnimationFrame(f); else res(Math.round((performance.now()-t0)/n)); }; requestAnimationFrame(f); }));
 const info = ()=> pg.evaluate(()=>{ ren.info.autoReset=false; ren.info.reset(); dibujar(); const r={calls:ren.info.render.calls, tris:ren.info.render.triangles}; ren.info.autoReset=true; return r; });
 const casos = [
  ['puerto bajo', ()=>{}],
  ['sin utileria', ()=>{ escena.traverse(o=>{ if(o.isInstancedMesh){ o.userData.v0 = o.visible; o.visible = false; } }); }],
  ['sin agua', ()=>{ if(MUNDO.agua) MUNDO.agua.visible = false; }],
  ['sin personajes', ()=>{ escena.traverse(o=>{ if(o.isSkinnedMesh) o.visible = false; }); }],
  ['sin cielo', ()=>{ window.__bg = escena.background; escena.background = null; }],
  ['sin VM', ()=>{ vmEscena.visible = false; }],
 ];
 for(const [n, f] of casos){ await pg.evaluate(f); await pg.waitForTimeout(200); console.log(n.padEnd(18), await ms(), 'ms/cuadro', JSON.stringify(await info())); }
 console.log('errores', err); await b.close(); })();
