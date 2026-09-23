// Pantalla de idioma al primer inicio, globo en la portada y el menú, y capturas en cada idioma.
import { chromium } from 'playwright-core';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const vert=process.argv[2]==='vertical';
const ctx=await nav.newContext({viewport:vert?{width:412,height:892}:{width:892,height:412},deviceScaleFactor:1,hasTouch:true,isMobile:true,locale:'es-AR'});
const pg=await ctx.newPage();
await ctx.addInitScript(()=>{});const err=[];pg.on('pageerror',e=>err.push(e.message));
await pg.goto('file:///home/user/Theclaudianos/arrabal/index.html');
await pg.waitForFunction("window.__A&&__A.listo",null,{timeout:60000});
const cdp=await ctx.newCDPSession(pg);
const toque=async(p)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
await pg.evaluate("for(let i=0;i<45;i++){__A.anda(1);__A.dibujarYa();}");
const abierto=await pg.evaluate("Idioma.abierto&&Idioma.primera");
await pg.screenshot({path:'arr-'+(vert?'v':'h')+'-idioma.png'});
// tocar "ENGLISH" con un toque real: el rectángulo en unidades de diseño -> ventana
const vw=await pg.evaluate("(()=>{var r=Idioma.rects.find(x=>x.id==='en');return __A.aVentana2(r.x+r.w/2,r.y+r.h/2);})()");
await toque(vw);await pg.evaluate("__A.anda(5)");
const idi=await pg.evaluate("Idioma.actual");const guardado=await pg.evaluate("localStorage.getItem('arrabal.idioma')");
const pantAntes=await pg.evaluate("__A.estado()");
await pg.evaluate("__A.anda(60);__A.dibujarYa()");await pg.screenshot({path:'arr-'+(vert?'v':'h')+'-portada-en.png'});
// el globo de la portada vuelve a abrir la pantalla
const gb=await pg.evaluate("__A.aVentana2(Idioma.boton.x,Idioma.boton.y)");
await toque(gb);await pg.evaluate("__A.anda(20);__A.dibujarYa()");const reabre=await pg.evaluate("Idioma.abierto&&__A.estado()==='portada'");
const rp=await pg.evaluate("(()=>{var r=Idioma.rects.find(x=>x.id==='pt');return __A.aVentana2(r.x+r.w/2,r.y+r.h/2);})()");
await toque(rp);await pg.evaluate("__A.anda(5)");
for(const l of ['pt','fr','en']){await pg.evaluate(l=>{Idioma.elegir(l);},l);
  for(const p of ['menu','coleccion','mapa']){await pg.evaluate(p=>{__A.ir(p);__A.anda(60);__A.dibujarYa();},p);await pg.screenshot({path:'arr-'+(vert?'v':'h')+'-'+l+'-'+p+'.png'});}}
console.log('primera vez abierta',abierto,'| eligió',idi,'guardado',guardado,'| sigue en',pantAntes,'| globo reabre',reabre,'| después',await pg.evaluate("Idioma.actual"),err.join(';')||'sin errores');
await nav.close();
