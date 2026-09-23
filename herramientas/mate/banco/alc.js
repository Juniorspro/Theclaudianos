const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:412,height:892},hasTouch:true,isMobile:true,deviceScaleFactor:1,locale:'es-AR'});
 const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n')[1]));
 await p.goto('file:///tmp/ui/mate_b.html'); await p.waitForTimeout(1500);
 for(const i of process.argv.slice(2).map(Number)){
   const r=await p.evaluate(i=>{ __M.nivel(i); const t=performance.now(); const r=__M.alcance(6000); r.ms=Math.round(performance.now()-t); return r; }, i);
   console.log('NIVEL',i,'fin',r.fin,'nodos',r.nodos,'ms',r.ms,'sueltos',r.sueltos.join(' ')); console.log(r.filas.join('\n')); }
 console.log(errs.slice(0,8)); await b.close(); })();
