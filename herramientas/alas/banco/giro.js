const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader']});
 const pg=await (await b.newContext()).newPage();
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 const r=await pg.evaluate(()=>{ const out={};
  for(const av of ['tomcat','viper']) for(const [nom,x,y,turbo,freno] of [['vuelta',1,0,false,false],['vuelta+freno',1,0,false,true],['rizo',0,-1,false,false]]){
   __V.G.avion=av; __V.iniciar(0,'UNO'); __V.dios(true); __V.J.bot=false; __V.J.aviones.forEach(a=>{ if(!a.jug) a.vivo=false; });
   const j=__V.J.jug; for(let i=0;i<60;i++) pasar();
   __V.IN.x=x; __V.IN.y=y; __V.IN.freno=freno; let acc=0, prev=adelante(j).clone(), t=0, gmax=0, vmin=1e9;
   while(acc<Math.PI*2 && t<60){ pasar(); t+=1/60; const f=adelante(j).clone(); acc+=prev.angleTo(f); prev=f; gmax=Math.max(gmax,j.gF); vmin=Math.min(vmin,j.v); }
   __V.IN.x=0; __V.IN.y=0; __V.IN.freno=false; out[av+' '+nom]=[t.toFixed(1)+' s', 'G '+gmax.toFixed(1), Math.round(vmin*3.6)+' km/h', 'alt '+Math.round(j.pos.y-1600)];
  } return out; });
 console.log(JSON.stringify(r,null,1)); await b.close(); })();
