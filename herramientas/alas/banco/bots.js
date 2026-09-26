const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n')[1]));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 const dios=process.argv[2]==='dios'; const sems=['UNO','DOS','TRES']; let ok=0, tot=0;
 for(const s of sems) for(let n=0;n<5;n++){
  const r=await pg.evaluate(([n,s,dios])=>{ __V.iniciar(n,s); __V.dios(dios); let e; for(let k=0;k<60;k++){ e=__V.anda(600); if(e.fin || e.modo!=='juego') break; } return {...e, fin:__V.J.fin, st:__V.J.stats}; },[n,s,dios]);
  tot++; const gano = r.fin && (r.fin.gano||r.fin==='gano'||r.fin.ok); if(gano) ok++;
  console.log(s,n,JSON.stringify({gano:r.fin&&r.fin.gano,mot:r.fin&&r.fin.motivo,t:r.t,hp:r.hp,bajas:r.bajas,ene:r.enemigos,st:r.st}));
 }
 console.log('TOTAL',ok+'/'+tot,'err',JSON.stringify(err.slice(0,5))); await b.close(); })();
