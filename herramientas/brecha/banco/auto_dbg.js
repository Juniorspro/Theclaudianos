const {chromium}=require('/tmp/ui/node_modules/playwright');
const dios = process.argv[2]==='dios', sems=(process.argv[3]||'UNO').split(','), mis=(process.argv[4]||'0,1,2,3,4').split(',').map(Number);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await b.newPage({viewport:{width:892,height:412}});
 const err=[]; pg.on('pageerror',e=>err.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' ')));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:30000});
 let ok=0;
 for(const sem of sems) for(const m of mis){
   const r = await pg.evaluate(([m,sem,dios])=>{ __S.iniciar(m,sem); __S.dios(dios); const J=__S.J; let k=0, ult='', trabado=0, pos=null;
     while(k < 60*600 && J.modo==='juego'){ __S.anda(60); k+=60; const e=__S.est(); const clave=e.etapa+e.bajas; if(clave===ult) trabado++; else { trabado=0; ult=clave; } if(trabado > 60){ pos = e; const cp = cam.position; window.__dump = {cam:[cp.x,cp.y,cp.z].map(v=>+v.toFixed(1)), cub:+J.jug.cubT.toFixed(2), vivos:J.enemigos.filter(q=>q.vivo).map(q=>{ const c = q.pts ? q.pts.cab : q.pos; const d = c.clone().sub(cp), L = d.length(); d.normalize(); const w = rayoMundo(cp, d, L); return {t:q.tipo, est:q.estado, pos:[q.pos.x,q.pos.y,q.pos.z].map(v=>+v.toFixed(1)), padre:!!q.padre, vis:q.cuerpo.g.visible, tapa: w ? +w.t.toFixed(1) : null, L:+L.toFixed(1), cuarto:q.cuarto ? q.cuarto.i : null, vip:!!q.vip, cabW:[c.x,c.y,c.z].map(v=>+v.toFixed(1))}; }), blancos:blancosBot().length, vip: J.vip ? {x:+J.vip.x.toFixed(1)} : null}; break; } }
     const e=__S.est(); return Object.assign({m, sem, gano: J.fin ? J.fin.gano : null, motivo: J.fin ? J.fin.motivo : (pos ? 'TRABADO en '+pos.tipo : ''), seg:Math.round(k/60), acc: e.disparos ? Math.round(e.aciertos/e.disparos*100) : 0}, {etapa:e.etapa, hp:e.hp, bajas:e.bajas, cabezas:e.cabezas, rehenes:e.rehenes, vivos:e.vivos}); }, [m,sem,dios]);
   if(r.gano) ok++; console.log(JSON.stringify(r)); const dmp = await pg.evaluate(()=>{ const d = window.__dump; window.__dump = null; return d; }); if(dmp) console.log('  DUMP', JSON.stringify(dmp)); const ej = await pg.evaluate(()=>{ const d = window.__dbgEj; window.__dbgEj = null; return d; }); if(ej) console.log("  EJEC", JSON.stringify(ej)); const cv = await pg.evaluate(()=>{ const d = window.__dbgCiv; window.__dbgCiv = null; return d; }); if(cv) console.log("  CIV", JSON.stringify(cv));
 }
 console.log('ganó', ok, 'de', sems.length*mis.length, dios?'(dios)':'', 'errores', err.slice(0,5)); await b.close();})();
