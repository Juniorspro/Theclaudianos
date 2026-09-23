const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:412,height:892},deviceScaleFactor:2.625,hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
 const err=[]; pg.on('pageerror',e=>err.push(e.message)); pg.on('console',m=>{ if(m.type()==='error') err.push('console: '+m.text()); });
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:30000});
 const cdp=await ctx.newCDPSession(pg);
 const T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
 const tapSel=async sel=>{ const c=await pg.evaluate(sel=>{ const e=document.querySelector(sel); if(!e) return null; const r=e.getBoundingClientRect(); const x=r.x+r.width/2, y=r.y+r.height/2; const top=document.elementFromPoint(x,y); return [x,y, top===e||e.contains(top) ? 'ok' : 'TAPADO por '+(top?top.id||top.className||top.tagName:'nada')]; },sel); if(!c) return 'NO EXISTE'; await T('touchStart',[{x:c[0],y:c[1],id:1}]); await pg.waitForTimeout(60); await T('touchEnd',[]); await pg.waitForTimeout(500); return c[2]; };
 const est=()=>pg.evaluate(()=>({modo:__S.J.modo, capa:[...document.querySelectorAll('.capa')].filter(c=>getComputedStyle(c).display!=='none').map(c=>c.id).join(',')}));
 const log=async (n,r)=>console.log(n.padEnd(22), r, JSON.stringify(await est()));
 await log('inicio','');
 await log('OPERACIONES', await tapSel('#btJugar'));
 await log('misión 1', await tapSel('#listaMisiones > *:nth-child(1)'));
 await log('IR', await tapSel('#btEqIr'));
 await pg.waitForTimeout(1500);
 await log('pausa', await tapSel('#bPausa'));
 await log('seguir', await tapSel('#btSeguir'));
 await log('pausa2', await tapSel('#bPausa'));
 await log('reiniciar', await tapSel('#btReiniciar'));
 await log('pausa3', await tapSel('#bPausa'));
 await log('abortar', await tapSel('#btSalir'));
 await log('ARMERÍA', await tapSel('#btArmeria'));
 await log('tab mejoras', await tapSel('.tab[data-t="mejoras"]'));
 await log('tab equipo', await tapSel('.tab[data-t="equipo"]'));
 const volver = await pg.evaluate(()=>[...document.querySelectorAll('#capaArmeria button')].map(b=>b.id).filter(Boolean)); console.log('botones armería', volver);
 for(const id of volver.filter(i=>/Volver|Menu/i.test(i))) await log(id, await tapSel('#'+id));
 await log('INSTRUCCIÓN', await tapSel('#btComo'));
 const bc = await pg.evaluate(()=>[...document.querySelectorAll('#capaComo button')].map(b=>b.id)); for(const id of bc) await log(id, await tapSel('#'+id));
 await log('SONIDO', await tapSel('#btSonido'));
 // terminar una misión y probar el informe
 await pg.evaluate(()=>{ __S.iniciar(0,'UNO'); __S.dios(true); let k=0; while(!__S.J.fin && k<60*200){ __S.anda(10); k+=10; } __S.bot(false); __S.anda(600); });
 await pg.waitForTimeout(4000);
 await log('fin misión','');
 const br = await pg.evaluate(()=>[...document.querySelectorAll('#capaRes button')].map(b=>b.id)); console.log('botones informe', br);
 await log('siguiente', await tapSel('#btResSig'));
 await pg.waitForTimeout(800);
 // cambios de tamaño del visor
 for(const [w,h] of [[412,742],[412,915],[742,412],[892,412],[412,892]]){ await pg.setViewportSize({width:w,height:h}); await pg.waitForTimeout(400);
   console.log('visor',w,h, JSON.stringify(await pg.evaluate(()=>{ const p=document.getElementById('pantalla').getBoundingClientRect(), c=document.querySelector('canvas').getBoundingClientRect(); return {pant:[p.width,p.height].map(Math.round), lienzo:[c.width,c.height].map(Math.round), ancho:ANCHO, alto:ALTO}; }))); }
 console.log('errores', err.slice(0,8)); await b.close();})();
