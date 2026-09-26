/* el arma en el juego (con tinta y luz): node vmjuego.js '<json [[arma, clip, t], …]>' [x,y,z,yaw,pitch] → /tmp/claude-0/cs/vj_<i>.png */
const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:+(process.env.W||892),height:+(process.env.H||412)}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Contragolpe.html'); await pg.waitForFunction('window.__C && window.__C.listo',{timeout:120000});
 const lista=JSON.parse(process.argv[2]||'[["glock",null,0]]'), cam=(process.argv[3]||'-4,1.64,-2,2.6,-0.05').split(',').map(Number), estilo=process.env.E||'ct'; const fs=require('fs'); const out=[];
 await pg.evaluate(c=>{ const p=__C.J.jug; p.c.pos.set(c[0], c[1]-1.64, c[2]); p.yaw=c[3]; p.pitch=c[4]; __C.anda(3); }, cam);
 for(let i=0;i<lista.length;i++){ const [id,clip,t]=lista[i]; const r=await pg.evaluate(([id,clip,t,e])=>{ try{ return JSON.stringify(__C.vmEn(id,clip,t,e)); }catch(er){ return 'ERR '+er.message+' '+(er.stack||'').split('\n').slice(1,3).join(' '); } },[id,clip,t,estilo]);
   console.log(i, id, clip, t, r); const f=`/tmp/claude-0/cs/${process.env.P||'vj'}_${i}.png`; await pg.screenshot({path:f}); out.push(f); }
 fs.writeFileSync('/tmp/claude-0/cs/vm2_lista.txt', out.join('\n')); console.log('err',JSON.stringify(err.slice(0,5))); await b.close(); })();
