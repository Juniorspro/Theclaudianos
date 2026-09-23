const {chromium}=require('/tmp/ui/node_modules/playwright');
const O=process.env.SALIDA||'/tmp/ui/mate/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:412,height:892},hasTouch:true,isMobile:true,deviceScaleFactor:2.625,locale:'es-AR'});
 const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n')[1])); p.on('console',m=>{ if(m.type()==='error') errs.push('CON '+m.text().slice(0,300)); });
 await p.goto('file:///tmp/ui/mate_b.html'); await p.waitForTimeout(3000);
 console.log(JSON.stringify(await p.evaluate(()=>window.__M ? {m:__M.medida(), info:__M.info(), H:{x:__M.HE.x, y:__M.HE.y, est:__M.HE.est}, enem:__M.ENEM.length} : 'sin __M')));
 await p.screenshot({path:O+'c1.png'});
 const n = process.argv[2]; if(n){ await p.evaluate(n); await p.waitForTimeout(+process.argv[3] || 1500); await p.screenshot({path:O+'c2.png'}); console.log(JSON.stringify(await p.evaluate(()=>({H:{x:__M.HE.x, y:__M.HE.y, est:__M.HE.est, vida:__M.HE.vida}, info:__M.info()})))); }
 console.log(errs.slice(0,10)); await b.close(); })();
