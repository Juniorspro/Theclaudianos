const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:640,height:300}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:90000});
 const r = await pg.evaluate(()=>{ __S.iniciar(4,'UNO'); __S.dios(true); const out=[]; let k=0, ult='';
   while(k < 60*200 && !__S.J.fin){ __S.anda(60); k+=60; const e0=__S.est(); const cl=e0.etapa+'/'+e0.bajas; if(k % 1200 === 0 || (k > 60*60 && cl===ult && k % 600 === 0)){ const cp=camPos();
      out.push({s:k/60, etapa:e0.etapa, tipo:e0.tipo, bajas:e0.bajas, cam:[+cp.x.toFixed(1),+cp.y.toFixed(1),+cp.z.toFixed(1)], en:__S.J.enemigos.filter(e=>e.vivo && e.espera<=0).map(e=>{ const d=e.pts.cab.clone().sub(cp), L=d.length(); d.normalize(); const w=rayoMundo(cp,d,L);
        return {t:e.def.id||e.tipo, est:e.estado, p:[+e.pos.x.toFixed(1),+e.pos.z.toFixed(1)], dest:e.destino?[+e.destino.x.toFixed(1),+e.destino.z.toFixed(1)]:null, tapa: w && w.t < L-0.25 ? (w.caja.tipo+':'+(w.caja.mat||'')+' '+(+(w.caja.y1-w.caja.y0).toFixed(1))+'m') : null, oc:+(e.oculto||0).toFixed(1), bl:e.bloqueado||0, cuarto:!!e.cuarto}; })}); } ult=cl; }
   return out; });
 for(const o of r) console.log(JSON.stringify(o)); console.log('errores', err); await b.close(); })();
