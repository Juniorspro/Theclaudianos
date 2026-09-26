/* variantes de agarre lado a lado: node vm3.js <arma> <vista> <estilo> '<json: [ajustes, ajustes, …]>' → /tmp/claude-0/cs/vm3.jpg */
const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:+(process.env.W||892),height:+(process.env.H||412)}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Contragolpe.html'); await pg.waitForFunction('window.__C && window.__C.listo',{timeout:120000});
 const id=process.argv[2]||'glock', vista=process.argv[3]||'fps', estilo=process.argv[4]||'ct', lista=JSON.parse(process.argv[5]||'[{}]'); const fs=require('fs'); const out=[];
 for(let i=0;i<lista.length;i++){ const r=await pg.evaluate(([id,v,e,aj])=>{ try{ return JSON.stringify(__C.verVM(id,e,v,null,aj)); }catch(er){ return 'ERR '+er.message+' '+(er.stack||'').split('\n')[1]; } },[id,vista,estilo,lista[i]]);
   console.log(i, r); const f=`/tmp/claude-0/cs/${process.env.P||'vm3'}_${i}.png`; await pg.screenshot({path:f}); out.push(f); }
 fs.writeFileSync('/tmp/claude-0/cs/vm2_lista.txt', out.join('\n')); console.log('err',JSON.stringify(err.slice(0,5))); await b.close(); })();
