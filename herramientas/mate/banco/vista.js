const {chromium}=require('/tmp/ui/node_modules/playwright');
const O=process.env.SALIDA||'/tmp/ui/mate/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:412,height:892},hasTouch:true,isMobile:true,deviceScaleFactor:2.625,locale:'es-AR'});
 const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n')[1])); p.on('console',m=>{ if(m.type()==='error') errs.push('CON '+m.text().slice(0,200)); });
 await p.goto('file:///tmp/ui/mate_b.html'); await p.waitForTimeout(1500);
 const tomas=JSON.parse(process.argv[2]); let i=0;
 for(const [n,x,y] of tomas){ await p.evaluate(([n,x,y])=>{ if(__M.J.idx!==n || __M.J.modo!=='juego') __M.jugar(n,false); __M.saltarCine(); __M.HE.x=x; __M.HE.y=y; __M.HE.vx=0; __M.HE.vy=0; __M.HE.invul=99; __M.CAMARA.x=x+1.6; __M.CAMARA.y=y+2; }, [n,x,y]); await p.waitForTimeout(1600); await p.screenshot({path:O+'v'+(i++)+'.png'}); }
 console.log(errs.slice(0,10)); await b.close(); })();
