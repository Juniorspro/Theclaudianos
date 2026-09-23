const {chromium}=require('/tmp/ui/node_modules/playwright');
const O=process.env.SALIDA||'/tmp/ui/mate/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:412,height:892},hasTouch:true,isMobile:true,deviceScaleFactor:1,locale:'es-AR'});
 const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n')[1]));
 await p.goto('file:///tmp/ui/mate_b.html'); await p.waitForTimeout(1500);
 const W=ms=>p.waitForTimeout(ms);
 for(const l of process.argv.slice(2)){
   await p.evaluate(l=>__M.idioma(l), l);
   for(const s of ['titulo','principal','mapa','opciones']){ await p.evaluate(s=>{ __M.J.modo='menu'; __M.UI.p=s; }, s); await W(250); }
   for(const n of ['intro','cap2','cap3','jefe','final','creditos']){ await p.evaluate(n=>__M.cine(n), n);
     for(let k=0;k<40 && await p.evaluate(()=>!!__M.J.cine);k++){ await W(90); await p.evaluate(()=>{ const c=__M.J.cine; if(c){ c.t+=0.6; c.n=999; if(c.cred!==undefined) c.cred+=200; } }); } }
   for(let i=0;i<9;i++){ await p.evaluate(i=>{ __M.jugar(i,false); __M.saltarCine(); }, i); await W(150);
     const pistas=await p.evaluate(()=>__M.J.nivel.pistas.map(q=>q.x));
     for(const x of pistas){ await p.evaluate(x=>{ __M.HE.x=x+0.1; }, x); await W(260); await p.evaluate(()=>{ const b=__M.MATEO().bocadillo; if(b) b.n=999; }); await W(120); } }
   await p.evaluate(()=>__M.pausar()); await W(250); await p.evaluate(()=>{ __M.J.pausa=false; __M.resultado(); __M.UI.t=9; }); await W(300); await p.evaluate(()=>{ __M.muerte(); __M.UI.t=9; }); await W(300);
   console.log(l, 'FALTA', JSON.stringify(await p.evaluate(()=>__M.falta())));
 }
 console.log(errs.slice(0,10)); await b.close(); })();
