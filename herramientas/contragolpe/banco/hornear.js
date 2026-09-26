/* horneado sin conexión: node banco/hornear.js <mapa> [cielo,sol,reboteRayos] → herramientas/contragolpe/luz/<mapa>.png, <mapa>_sol.png y <mapa>.json
   Se hornea con el HTML armado (HTML=ruta para otro); después volver a correr armar.py para meterlos adentro. */
const {chromium}=require('/tmp/ui/node_modules/playwright'); const fs=require('fs'), path=require('path');
(async()=>{
 const id=process.argv[2], q=(process.argv[3]||'48,6,24').split(',').map(Number), html=process.env.HTML||'/home/user/Theclaudianos/juegos-pc/Contragolpe.html';
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:640,height:360}})).newPage(); pg.on('pageerror',e=>console.log('ERR',e.message));
 await pg.goto('file://'+html+'?mapa='+id+'&rapido=1'); await pg.waitForFunction('window.__C && window.__C.listo',{timeout:300000});
 const t0=Date.now(); const r=await pg.evaluate(q=>__C.hornear({cielo:q[0], sol:q[1], rebote:true, reboteRayos:q[2]}), q);
 const dir=path.join(__dirname,'..','luz'); fs.mkdirSync(dir,{recursive:true});
 const guarda=(u,f)=>fs.writeFileSync(path.join(dir,f), Buffer.from(u.split(',')[1],'base64'));
 guarda(r.luz, id+'.png'); guarda(r.sol, id+'_sol.png'); fs.writeFileSync(path.join(dir,id+'.json'), JSON.stringify({id, huella:r.huella, w:r.w, h:r.h}));
 console.log('horneado', id, r.w+'x'+r.h, ((Date.now()-t0)/1000).toFixed(1)+' s'); await b.close(); })();
