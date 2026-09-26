/* ajuste de agarre: node vm2.js <arma> <vistas> <estilo> '<json ajustes>' → /tmp/claude-0/cs/vm2.jpg (grilla 2×N) */
const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:+(process.env.W||640),height:+(process.env.H||400)}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Contragolpe.html'); await pg.waitForFunction('window.__C && window.__C.listo',{timeout:120000});
 const id=process.argv[2]||'glock', vistas=(process.argv[3]||'fps,lado,frente,abajo').split(','), estilo=process.argv[4]||'ct', aj=process.argv[5]?JSON.parse(process.argv[5]):null;
 const fs=require('fs'); let i=0; const archivos=[];
 for(const v of vistas){ const r=await pg.evaluate(([id,v,e,aj])=>{ try{ return JSON.stringify(__C.verVM(id,e,v,null,aj)); }catch(er){ return 'ERR '+er.message+' '+(er.stack||'').split('\n')[1]; } },[id,v,estilo,aj]); if(r && r.startsWith('ERR')) err.push(v+': '+r); else if(i===0) console.log('diag', r);
   await pg.waitForTimeout(60); const f=`/tmp/claude-0/cs/vm2_${i++}.png`; await pg.screenshot({path:f}); archivos.push(f); }
 fs.writeFileSync('/tmp/claude-0/cs/vm2_lista.txt', archivos.join('\n'));
 console.log('err',JSON.stringify(err.slice(0,10))); await b.close(); })();
