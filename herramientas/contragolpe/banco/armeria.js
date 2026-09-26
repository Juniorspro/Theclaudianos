const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:640,height:360}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Contragolpe.html'); await pg.waitForFunction('window.__C && window.__C.listo',{timeout:120000});
 const ids=(process.argv[2]||'glock,usps,deagle,mac10,mp9,ak47,m4s,awp,cuchillo,cuchillo_t,he,flash,humo,c4').split(','); const vistas=(process.argv[3]||'lado,tres').split(',');
 let i=0; for(const id of ids) for(const v of vistas){ const r=await pg.evaluate(([id,v])=>{ try{ const r=__C.verArma(id,v); __C.dibujarYa(); return r; }catch(e){ return 'ERR '+e.message; } },[id,v]); if(typeof r==='string') err.push(id+': '+r); await pg.waitForTimeout(120); await pg.screenshot({path:`/tmp/claude-0/cs/arm_${String(i++).padStart(2,'0')}.png`}); }
 console.log('err',JSON.stringify(err.slice(0,10))); await b.close(); })();
