const {chromium}=require('/tmp/ui/node_modules/playwright');
const O=process.env.SALIDA||'/tmp/ui/mate/';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:412,height:892},hasTouch:true,isMobile:true,deviceScaleFactor:1,locale:'es-AR'});
 const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n')[1]));
 await p.goto('file:///tmp/ui/mate_b.html'); await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>{ __M.jugar(8,false); while(__M.J.cine){ __M.J.cine.t=99; __M.J.cine.n=999; __M.avanzar ? 0:0; break; } return 1; });
 for(let k=0;k<20 && await p.evaluate(()=>!!__M.J.cine);k++){ await p.evaluate(()=>{ const c=__M.J.cine; if(c){ c.t=9; c.n=999; } }); await p.waitForTimeout(200); }
 // simulación acelerada: 1/60 s por paso, 120 s de pelea, el héroe no muere, tira cada 1,2 s al jefe o a la tetera
 const out=await p.evaluate(()=>{ const ev={saltos:0, teteras:0, reventadas:0, anillos:0, golpes:0, fases:[], minions:0}; const J=__M.J, H=__M.HE; let tt=0, prevSalto=false, prevVida=3;
   const jefe=__M.ENEM.find(e=>e.tipo==='jefe'); let nb=0;
   for(let i=0;i<60*140 && !jefe.muerto;i++){ __M.anda(1/60); tt+=1/60; if(H.vida<prevVida){ ev.golpes++; } H.vida=3; H.invul=0; prevVida=3; H.muerto=0;
     if(jefe.saltando && !prevSalto) ev.saltos++; prevSalto=jefe.saltando;
     const tets=__M.BALAS.filter(b=>b.tetera); if(tets.length>nb) ev.teteras+=tets.length-nb; nb=tets.length;
     if(__M.BALAS.filter(b=>b.de!=='heroe'&&!b.tetera).length>=12) ev.anillos++;
     const f=jefe.vida>20?1:jefe.vida>10?2:3; if(!ev.fases.includes(f)) ev.fases.push(f);
     if(Math.floor(tt/1.2)!==Math.floor((tt-1/60)/1.2)){ const t=tets[0]; if(t && Math.random()<0.5){ __M.disparar({cosa:t, cabeza:false}); ev.reventadas++; } else __M.disparar({cosa:jefe, cabeza:Math.random()<0.3}); }
   }
   ev.tiempo=tt.toFixed(1); ev.vida=jefe.vida; ev.minions=__M.ENEM.length-1; return ev; });
 console.log(JSON.stringify(out)); console.log(errs.slice(0,10)); await b.close(); })();
