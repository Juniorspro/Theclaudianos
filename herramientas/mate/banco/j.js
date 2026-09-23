const {chromium}=require('/tmp/ui/node_modules/playwright');
const O=process.env.SALIDA||'/tmp/ui/mate/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});
 const p=await b.newPage({viewport:{width:412,height:892},hasTouch:true,isMobile:true,deviceScaleFactor:2.625,locale:'es-AR'});
 const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n')[1])); p.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') errs.push('CON '+m.text().slice(0,300)); });
 const cdp=await p.context().newCDPSession(p);
 await p.goto('file:///tmp/ui/mate_b.html'); await p.waitForTimeout(2500);
 const m=await p.evaluate(()=>__M.medida());
 const pg=(x,y)=>{ const sx=x*m.SW/m.W, sy=y*m.SH/m.H; return m.GIRADO?{x:412-sy,y:sx}:{x:sx,y:sy}; };
 const T=async(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map((q,i)=>({...pg(q[0],q[1]),id:q[2]||0}))});
 const st=()=>p.evaluate(()=>({modo:__M.J.modo,ui:__M.UI.p,cine:__M.J.cine&&(__M.J.cine.nombre+':'+__M.J.cine.i),x:+__M.HE.x.toFixed(2),y:+__M.HE.y.toFixed(2),vx:+__M.HE.vx.toFixed(2),vy:+__M.HE.vy.toFixed(2),est:__M.HE.est,vida:__M.HE.vida,J:{esc:__M.J.escala&&+__M.J.escala.toFixed(2),pts:__M.J.puntos,mult:__M.J.mult},en:__M.ENEM.map(e=>[e.tipo,+e.x.toFixed(1),+e.y.toFixed(1),e.est,e.vida,!!e.muerto])}));
 const cap=async n=>{ await p.screenshot({path:O+n+'.png'}); };
 const pasos=JSON.parse(process.argv[2]||'[]');
 for(const s of pasos){
   if(s.ev) console.log('ev', JSON.stringify(await p.evaluate(s.ev)));
   if(s.arr){ const [x0,y0,x1,y1]=s.arr; await T('touchStart',[[x0,y0]]); for(let k=1;k<=6;k++){ await T('touchMove',[[x0+(x1-x0)*k/6,y0+(y1-y0)*k/6]]); await p.waitForTimeout(40);} if(s.capPlan) await cap(s.capPlan); await T('touchEnd',[]); }
   if(s.tapE!==undefined){ const q=await p.evaluate(i=>{const e=__M.ENEM[i]; return __M.aPantalla(e.x,e.y+(s=>1.0)());},s.tapE); console.log('tapE',JSON.stringify(q)); await T('touchStart',[[q.x,q.y]]); await p.waitForTimeout(s.hold||60); await T('touchEnd',[]); }
   if(s.boton){ const b=await p.evaluate(id=>{const b=__M.UI.botones.find(q=>q.id===id); return b?{x:b.x+b.w/2,y:b.y+b.h/2}:null;},s.boton); console.log('boton',s.boton,JSON.stringify(b)); if(b){ await T('touchStart',[[b.x,b.y]]); await p.waitForTimeout(70); await T('touchEnd',[]); } }
   if(s.tap){ await T('touchStart',[[s.tap[0],s.tap[1]]]); await p.waitForTimeout(s.hold||60); await T('touchEnd',[]); }
   if(s.w) await p.waitForTimeout(s.w);
   if(s.cap) await cap(s.cap);
   if(s.st) console.log(s.st, JSON.stringify(await st()));
 }
 console.log(errs.slice(0,12)); await b.close(); })();
