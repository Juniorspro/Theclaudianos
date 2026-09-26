/* partida simulada: node banco/partida.js <modo> <segundos> [sem] [mapa] → resumen de bajas, movimiento y errores */
const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{ const modo=process.argv[2]||'dm', seg=+(process.argv[3]||60), sem=process.argv[4]||'3', mapa=process.argv[5];
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
 await pg.goto('file://'+(process.env.HTML||'/home/user/Theclaudianos/juegos-pc/Contragolpe.html')+'?partida='+modo+'&sem='+sem+(mapa?'&mapa='+mapa:'')); await pg.waitForFunction('window.__C && window.__C.listo',{timeout:180000});
 await pg.evaluate(()=>{ __C.autopiloto(true); J.congelarDibujo=true; });
 const t0=Date.now(); const pos0=await pg.evaluate(()=>ACTORES.map(a=>a.c.pos.clone()));
 let mov=0;
 for(let s=0;s<seg;s+=10){ await pg.evaluate(()=>{ for(let i=0;i<600;i++) pasar(); }); }
 const r=await pg.evaluate(()=>{ const p=__C.partida(); p.feed=PARTIDA.feed.slice(0,4); p.granadas=GRANADAS.length; p.sueltas=SUELTAS.length; return p; });
 console.log(JSON.stringify({ms:Date.now()-t0, fase:r.fase, ronda:r.ronda, ganadas:r.ganadas, bomba:r.bomba, tiempo:r.tiempo}));
 for(const a of r.actores) console.log(a.jug?'*':' ', a.n.padEnd(8), a.b, a.vivo?'vivo':'muerto', 'k',a.k,'d',a.d,'$',a.$,a.arma, a.x, a.z);
 console.log('feed', JSON.stringify(r.feed)); console.log('err', JSON.stringify(err.slice(0,6))); await b.close(); })();
