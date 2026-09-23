const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:412,height:892},deviceScaleFactor:1,hasTouch:true,isMobile:true,offline:true,locale:'es-AR'}); const pg=await ctx.newPage();
 const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:30000});
 const cdp=await ctx.newCDPSession(pg);
 const tap=async sel=>{ const c=await pg.evaluate(sel=>{ const e=document.querySelector(sel); const r=e.getBoundingClientRect(); const x=r.x+r.width/2,y=r.y+r.height/2, top=document.elementFromPoint(x,y); return [x,y,top===e||e.contains(top)]; },sel); await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:c[0],y:c[1],id:1}]}); await pg.waitForTimeout(50); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await pg.waitForTimeout(400); return c[2]; };
 const foto=async n=>{ await pg.screenshot({path:'/tmp/claude-0/b7/b/i_'+n+'.png'}); };
 await pg.waitForTimeout(1500); await foto('es_titulo');
 const sobra=[];
 for(const l of ['en','pt','es']){
   const ok=await tap(`#idiomas button[data-l="${l}"]`);
   const r=await pg.evaluate(()=>({tit:document.querySelector('#capaTitulo').innerText.replace(/\s+/g,' '), g:__S.G.idioma, guardado: JSON.parse(localStorage.getItem('brecha7.v1')).idioma}));
   console.log(l, ok, JSON.stringify(r));
   if(l!=='es'){ await foto(l+'_titulo');
     await pg.evaluate(()=>{ __S.G.abierto=5; __S.G.dinero=3000; }); await tap('#btJugar'); await foto(l+'_misiones');
     console.log('  misiones:', (await pg.evaluate(()=>document.querySelector('#capaMisiones').innerText)).replace(/\s+/g,' ').slice(0,400));
     await tap('#listaMisiones > *:nth-child(2)'); console.log('  equipo:', (await pg.evaluate(()=>document.querySelector('#capaEquipo').innerText)).replace(/\s+/g,' ').slice(0,300));
     await tap('#btEqVolver'); await tap('#btMisVolver'); await tap('#btArmeria'); await tap('.tab[data-t="mejoras"]'); await foto(l+'_armeria');
     console.log('  armería:', (await pg.evaluate(()=>document.querySelector('#capaArmeria').innerText)).replace(/\s+/g,' ').slice(0,300));
     await tap('#btArmVolver'); await tap('#btComo'); await foto(l+'_como'); console.log('  como:', (await pg.evaluate(()=>document.querySelector('#capaComo').innerText)).replace(/\s+/g,' ').slice(0,160)); await tap('#btComoVolver');
     // en juego
     await pg.evaluate(()=>{ __S.iniciar(1,'UNO'); __S.dios(true); let k=0; while(k<60*25){ __S.anda(10); k+=10; if(__S.J.etapas[__S.J.ei].tipo==='brecha') break; } __S.bot(false); __S.dibujarYa(); });
     await pg.waitForTimeout(300); await foto(l+'_juego');
     console.log('  hud objetivo:', await pg.evaluate(()=>T(__S.J.objetivo)), '| aviso:', await pg.evaluate(()=>document.getElementById('aviso').innerText.replace(/\s+/g,' ')));
     await tap('#bPausa'); console.log('  pausa:', (await pg.evaluate(()=>document.querySelector('#capaPausa').innerText)).replace(/\s+/g,' '));
     await pg.evaluate(()=>{ __S.bot(true); let k=0; while(!__S.J.fin && k<60*300){ __S.anda(10); k+=10; } }).catch(()=>{});
     await tap('#btSeguir'); await pg.evaluate(()=>{ let k=0; __S.bot(true); while(!__S.J.fin && k<60*300){ __S.anda(10); k+=10; } }); await pg.waitForTimeout(4000); await foto(l+'_informe');
     console.log('  informe:', (await pg.evaluate(()=>document.querySelector('#capaRes').innerText)).replace(/\s+/g,' ').slice(0,300));
     await tap('#btResMenu'); await tap('#btMisVolver');
   }
 }
 // quedan palabras en castellano en pantalla con idioma inglés?
 console.log('errores', err); await b.close();})();
