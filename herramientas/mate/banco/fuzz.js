const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:412,height:892},hasTouch:true,isMobile:true,deviceScaleFactor:1,locale:'es-AR'});
 const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n')[1])); p.on('console',m=>{ if(m.type()==='error') errs.push('CON '+m.text().slice(0,200)); });
 const cdp=await p.context().newCDPSession(p);
 await p.goto('file:///tmp/ui/mate_b.html'); await p.waitForTimeout(1500);
 const R=(a,b)=>a+Math.random()*(b-a); const pt=()=>({x:R(2,410),y:R(2,890)});
 let malos=[], n=+(process.argv[2]||400), modos={};
 for(let i=0;i<n;i++){
   const k=Math.random();
   if(k<0.35){ const a=pt(); await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]}); await p.waitForTimeout(R(20,120)); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); }
   else if(k<0.6){ const a=pt(), c={x:a.x+R(-120,120),y:a.y+R(-120,120)}; await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]}); for(let s=1;s<=4;s++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(c.x-a.x)*s/4,y:a.y+(c.y-a.y)*s/4,id:1}]}); await p.waitForTimeout(25);} await cdp.send('Input.dispatchTouchEvent',{type:Math.random()<0.15?'touchCancel':'touchEnd',touchPoints:[]}); }
   else if(k<0.72){ const a=pt(), c=pt(); await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1},{...c,id:2}]}); await p.waitForTimeout(R(40,300)); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); }
   else if(k<0.76){ await p.evaluate(i=>{ __M.jugar(i, Math.random()<0.3); }, Math.floor(R(0,9))); }
   else if(k<0.78){ await p.evaluate(()=>{ __M.J.pausa=false; __M.J.modo='menu'; __M.UI.p=['principal','mapa','opciones'][Math.floor(Math.random()*3)]; }); }
   else if(k<0.79){ await p.evaluate(()=>{ document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('blur')); }); }
   else await p.waitForTimeout(R(50,400));
   if(i%10===0){ const s=await p.evaluate(()=>{ const H=__M.HE; return {m:__M.J.modo, ui:__M.UI.p, c:!!__M.J.cine, x:H.x, y:H.y, vx:H.vx, vy:H.vy, pts:__M.J.puntos, v:H.vida, ts:__M.J.ts}; });
     modos[s.m+'/'+s.ui+(s.c?'/cine':'')]=(modos[s.m+'/'+s.ui+(s.c?'/cine':'')]||0)+1;
     for(const q of ['x','y','vx','vy','pts','ts']) if(!Number.isFinite(s[q])) malos.push(i+' '+q+'='+s[q]); if(s.pts<0) malos.push('pts<0'); }
 }
 console.log('modos', JSON.stringify(modos)); console.log('malos', malos.slice(0,10)); console.log('errores', errs.slice(0,10)); await b.close(); })();
