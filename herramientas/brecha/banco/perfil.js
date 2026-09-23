const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:412,height:892},deviceScaleFactor:2.625,hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
 const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:60000});
 await pg.evaluate(()=>{ __S.iniciar(+(new URLSearchParams(location.search).get('m')||0),'UNO'); __S.dios(true); __S.anda(300); });
 const medirMs = ()=> pg.evaluate(()=>new Promise(res=>{ let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<4000) requestAnimationFrame(f); else res(+(1000*(performance.now()-t0)/1000/n).toFixed(0)); }; requestAnimationFrame(f); }));
 const casos = [
  ['cal0.4 sin post', ()=>{ CALIDAD=0.4; POST.ok=false; ren.shadowMap.enabled=false; sol.castShadow=false; medir(); }],
  ['+ basico', ()=>{ escena.overrideMaterial = new THREE.MeshBasicMaterial({color:0x888888}); }],
  ['+ basico sin VM', ()=>{ window.__vmv = vmEscena.visible; vmEscena.visible = false; }],
  ['lambert', ()=>{ escena.overrideMaterial = new THREE.MeshLambertMaterial({color:0x888888}); }],
  ['standard liso', ()=>{ escena.overrideMaterial = new THREE.MeshStandardMaterial({color:0x888888, roughness:0.7}); }],
  ['sin override', ()=>{ escena.overrideMaterial = null; }],
  ['sin override sin luces extra', ()=>{ lampara.intensity = 0; lampara.visible=false; fogonazo.visible=false; escena.traverse(o=>{ if(o.isSpotLight||o.isPointLight) o.visible=false; }); }],
 ];
 for(const [n, f] of casos){ await pg.evaluate(f); await pg.waitForTimeout(300); const ms = await medirMs(); const i = await pg.evaluate(()=>{ ren.info.autoReset=false; ren.info.reset(); dibujar(); const r={px:ren.domElement.width+'x'+ren.domElement.height, calls:ren.info.render.calls, tris:ren.info.render.triangles, luces:0}; escena.traverse(o=>{ if(o.isLight && o.visible) r.luces++; }); ren.info.autoReset=true; return r; }); console.log(n.padEnd(22), ms+' ms/cuadro', JSON.stringify(i)); }
 console.log('errores', err); await b.close(); })();
