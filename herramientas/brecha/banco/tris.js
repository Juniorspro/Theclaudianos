const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:60000});
 for(const m of [2]){
 const r = await pg.evaluate((m)=>{ __S.iniciar(m,'UNO'); __S.dios(true); __S.anda(300); const tri = g=> g.index ? g.index.count/3 : g.attributes.position.count/3;
   const cat = {mundo:0, pj:0, props:0, veh:0, otros:0, nMundo:0}; 
   escena.traverse(o=>{ if(!o.isMesh || !o.visible) return; let n = tri(o.geometry)*(o.isInstancedMesh ? o.count : 1);
     let p = o, k = 'otros'; while(p){ if(MUNDO.grupos.includes(p)){ k = o.isInstancedMesh ? 'props' : 'mundo'; break; } if(p.userData && p.userData.glb){ k='veh'; break; } if(o.isSkinnedMesh){ k='pj'; break; } p = p.parent; }
     cat[k] += n; if(k==='mundo') cat.nMundo++; if(k==='otros' && n > 500) (cat.lista = cat.lista || []).push((o.name||o.geometry.type||'?') + ':' + Math.round(n) + (o.parent && o.parent.name ? '<' + o.parent.name : '') + (o.material && o.material.type ? '/' + o.material.type : '')); });
   for(const k in cat) if(typeof cat[k]==='number') cat[k] = Math.round(cat[k]); if(cat.lista) cat.lista = cat.lista.slice(0, 12); return cat; }, m);
 console.log(m, JSON.stringify(r)); }
 console.log('errores', err); await b.close(); })();
