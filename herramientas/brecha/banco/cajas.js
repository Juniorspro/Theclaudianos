const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:640,height:300}})).newPage();
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Brecha.html'); await pg.waitForFunction('window.__S && window.__S.listo',{timeout:90000});
 const r = await pg.evaluate(([x,z])=>{ __S.iniciar(4,'UNO'); const c = __S.J.cuartos.find(c=> z <= c.z0 && z >= c.z1);
   return {cuarto: c ? {cx:c.cx, W:c.W, z0:c.z0, z1:c.z1, tipo:c.plan.tipo, aparece:c.aparece, puestos:c.puestos.map(p=>[+p.x.toFixed(1),+p.z.toFixed(1),p.alto])} : null,
     cajas: MUNDO.cajas.filter(b=> Math.max(b.x0 - x, x - b.x1, 0) < 3 && Math.max(b.z0 - z, z - b.z1, 0) < 3).map(b=>({t:b.tipo, m:b.mat, x:[+b.x0.toFixed(2),+b.x1.toFixed(2)], y:[+b.y0.toFixed(1),+b.y1.toFixed(1)], z:[+b.z0.toFixed(2),+b.z1.toFixed(2)]}))}; }, [11.8, -87]);
 console.log(JSON.stringify(r, null, 0)); await b.close(); })();
