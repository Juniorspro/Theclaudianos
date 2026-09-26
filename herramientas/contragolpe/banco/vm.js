const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:640,height:360}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Contragolpe.html'); await pg.waitForFunction('window.__C && window.__C.listo',{timeout:120000});
 await pg.evaluate(()=>{ __C.J.modo='libre'; });
 const ids=(process.argv[2]||'glock,ak47').split(','), vistas=(process.argv[3]||'fps,lado,frente,abajo').split(','), estilo=process.argv[4]||'ct';
 let i=0; for(const id of ids) for(const v of vistas){ const r=await pg.evaluate(([id,v,e])=>{ try{ __C.verVM(id,e,v); return ''; }catch(er){ return 'ERR '+er.message+' '+(er.stack||'').split('\n')[1]; } },[id,v,estilo]); if(r) err.push(id+' '+v+': '+r);
   await pg.waitForTimeout(80); await pg.screenshot({path:`/tmp/claude-0/cs/vm_${String(i++).padStart(2,'0')}.png`}); }
 console.log('err',JSON.stringify(err.slice(0,10))); await b.close(); })();
