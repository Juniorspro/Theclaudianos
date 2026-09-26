const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412}})).newPage();
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 const r=await pg.evaluate(([n,dios])=>{ __V.iniciar(n,'UNO'); __V.dios(dios); const M={}; const o=window.explotarMisil; window.explotarMisil=(m,i,B)=>{ const k=(m.de.jug?'J':'E')+(B?(B.def?'avion':'bengala'):(m.engañado?'bengala-perdio':m.vida<=0?'vence':'suelo/perdio')); M[k]=(M[k]||0)+1; if(B&&B.def&&m.de.jug){ (M.d=M.d||[]).push([Math.round(B.pos.distanceTo(m.p)), Math.round(B.hp)]); } return o(m,i,B); };
   let e; for(let k=0;k<20;k++){ e=__V.anda(600); if(e.fin||e.modo!=='juego') break; } return {e, M, st:__V.J.stats, barcos:__V.x.BLANCOS_SUP.map(s=>[s.vivo,Math.round(s.hp),Math.round(s.pos.distanceTo(__V.J.jug.pos))])}; },[+process.argv[2]||0, process.argv[3]==='dios']);
 console.log(JSON.stringify(r)); await b.close(); })();
