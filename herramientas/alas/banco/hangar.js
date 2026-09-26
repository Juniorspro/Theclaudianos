const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const pg=await (await b.newContext({viewport:{width:892,height:412}})).newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 await pg.click('#btHangar'); await pg.waitForTimeout(2500); await pg.screenshot({path:'/tmp/claude-0/av/b/hangar.png'});
 console.log(await pg.evaluate(()=>{ const v=VITRINA; const p=v.pos.clone().project(cam); return JSON.stringify({modo:__V.J.modo, vis:v.g.visible, pos:v.pos, gpos:v.g.position, cam:cam.position, dist:cam.position.distanceTo(v.pos), proj:[p.x,p.y,p.z], hijos:v.g.children.length}); }));
 console.log('err',JSON.stringify(err)); await b.close(); })();
