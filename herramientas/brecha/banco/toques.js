const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:412,height:892},deviceScaleFactor:2.625,hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
 const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:30000});
 const cdp=await ctx.newCDPSession(pg); let idT=1;
 const T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
 const centro=async id=>pg.evaluate(id=>{const r=document.getElementById(id).getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2];},id);
 const tap=async id=>{const [x,y]=await centro(id); await T('touchStart',[{x,y,id:1}]); await pg.waitForTimeout(120); await T('touchEnd',[]); await pg.waitForTimeout(200);};
 const S=()=>pg.evaluate(()=>{const J=__S.J,j=J.jug; return {modo:J.modo,yaw:+j.yaw.toFixed(3),pitch:+j.pitch.toFixed(3),cub:+j.cubT.toFixed(2),disp:J.stats.disparos,rec:+j.recarga.toFixed(2),arma:armaJ(),gran:j.granadas,fase:J.etapas[J.ei].fase||'',et:J.etapas[J.ei].tipo};});
 const R={};
 await pg.evaluate(()=>{ __S.iniciar(1,'UNO'); __S.dios(true); __S.bot(false); });
 await pg.waitForTimeout(800);
 let a=await S(); // arrastre de mira en zona libre
 await T('touchStart',[{x:200,y:300,id:2}]); for(let k=1;k<=10;k++){ await T('touchMove',[{x:200+k*6,y:300+k*8,id:2}]); await pg.waitForTimeout(16);} await T('touchEnd',[]); await pg.waitForTimeout(200);
 let c=await S(); R.mira = (c.yaw!==a.yaw || c.pitch!==a.pitch) ? 'ok '+a.yaw+'→'+c.yaw+' / '+a.pitch+'→'+c.pitch : 'NO';
 a=await S(); await tap('bFuego'); await tap('bFuego'); c=await S(); R.fuego = c.disp>a.disp ? 'ok '+a.disp+'→'+c.disp : 'NO';
 // fuego mantenido + arrastre con el mismo dedo
 a=await S(); { const [x,y]=await centro('bFuego'); await T('touchStart',[{x,y,id:3}]); for(let k=1;k<=12;k++){ await T('touchMove',[{x:x-k*4,y:y+k*3,id:3}]); await pg.waitForTimeout(30);} await T('touchEnd',[]); } await pg.waitForTimeout(200);
 c=await S(); R.fuegoArrastra = (c.disp>a.disp && c.yaw!==a.yaw) ? 'ok disp '+a.disp+'→'+c.disp+' yaw '+a.yaw+'→'+c.yaw : 'NO '+JSON.stringify([a,c]);
 // cubrir mantenido + otro dedo apuntando a la vez
 { const [x,y]=await centro('bCubrir'); await T('touchStart',[{x,y,id:4}]); await pg.waitForFunction(()=> __S.J.jug.cubT > 0.8, null, {timeout:4000}).catch(()=>{}); const m=await S(); await T('touchStart',[{x,y,id:4},{x:220,y:400,id:5}]); await T('touchMove',[{x,y,id:4},{x:260,y:430,id:5}]); await pg.waitForTimeout(60); const m2=await S(); await T('touchEnd',[{x:260,y:430,id:5}]); await T('touchEnd',[]); await pg.waitForFunction(()=> __S.J.jug.cubT < 0.3, null, {timeout:4000}).catch(()=>{}); const f=await S(); R.cubrir = m.cub>0.8 && f.cub<0.3 ? 'ok '+m.cub+' → '+f.cub+(m2.yaw!==m.yaw?' (con 2º dedo apuntando)':'') : 'NO '+m.cub+' '+f.cub; }
 await tap('bRecargar'); c=await S(); R.recargar = c.rec>0 ? 'ok '+c.rec : 'NO';
 await pg.waitForTimeout(2500);
 a=await S(); await tap('bArma'); await pg.waitForTimeout(400); c=await S(); R.arma = a.arma!==c.arma ? 'ok '+a.arma+'→'+c.arma : 'NO';
 a=await S(); await tap('bApuntar'); await pg.waitForTimeout(300); c=await pg.evaluate(()=>+__S.J.jug.zoom.toFixed(2)); R.apuntar = c>0.3 ? 'ok zoom '+c : 'NO '+c; await tap('bApuntar');
 a=await S(); await tap('bGranada'); await pg.waitForTimeout(300); c=await S(); R.granada = c.gran<a.gran ? 'ok '+a.gran+'→'+c.gran : 'NO '+a.gran;
 await tap('bPausa'); c=await S(); R.pausa = c.modo==='pausa'?'ok':'NO '+c.modo; await tap('btSeguir'); c=await S(); R.seguir = c.modo==='juego'?'ok':'NO '+c.modo;
 // brecha: llegar con el bot hasta la etapa anterior
 await pg.evaluate(()=>{ const J=__S.J; __S.bot(true); let k=0; while(k<60*120){ __S.anda(1); k++; const n=J.etapas[J.ei+1]; if(n && n.tipo==='brecha' && J.etapas[J.ei].tipo!=='brecha' && __S.J.enemigos.filter(e=>e.vivo).length===0) break; } __S.bot(false); k=0; while(k<60*30 && !(J.etapas[J.ei].tipo==='brecha' && J.etapas[J.ei].fase==='espera')){ __S.anda(1); k++; } });
 a=await S(); await pg.waitForTimeout(300); const vis=await pg.evaluate(()=>getComputedStyle(document.getElementById('bBrecha')).display); await tap('bBrecha'); await pg.waitForTimeout(300); c=await S();
 R.brecha = a.fase==='espera' && c.fase!=='espera' ? 'ok '+a.fase+'→'+c.fase+' (botón '+vis+')' : 'NO '+a.et+' '+a.fase+'→'+c.fase+' '+vis;
 console.log(JSON.stringify(R,null,1)); console.log('errores',err.slice(0,5)); await b.close();})();
