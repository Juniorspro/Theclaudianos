const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const [w,h]=(process.argv[2]||'412x892').split('x').map(Number);
 const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true}); const pg=await ctx.newPage();
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 for(const capa of ['capaTitulo','capaMisiones','capaHangar','capaComo','capaAjustes']){
  await pg.evaluate(c=>{ if(c==='capaHangar') __V.entrarHangar(); else { if(c==='capaMisiones') __V.armarMisiones(); __V.mostrar(c); } },capa); await pg.waitForTimeout(1600);
  const r=await pg.evaluate(c=>{ const p=document.getElementById('pantalla').getBoundingClientRect(); return [...document.getElementById(c).querySelectorAll('button')].filter(e=>e.offsetParent).map(e=>{ const r=e.getBoundingClientRect(); const x=r.left+r.width/2,y=r.top+r.height/2; const top=document.elementFromPoint(x,y); const fuera=r.left<p.left-1||r.top<p.top-1||r.right>p.right+1||r.bottom>p.bottom+1; return (e.id||e.textContent.slice(0,10))+(fuera?' FUERA':'')+(!top||!e.contains(top)?' TAPADO('+(top?(top.id||top.className||top.tagName):'-')+')':''); }).filter(s=>/FUERA|TAPADO/.test(s)); },capa);
  console.log(capa, JSON.stringify(r)); await pg.screenshot({path:`/tmp/claude-0/av/b/menu_${capa}.png`});
 }
 await b.close(); })();
