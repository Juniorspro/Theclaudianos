// Pantalla de idioma al primer inicio, globo en la portada y el menú, y capturas en cada idioma.
import { chromium } from 'playwright-core';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const vert=process.argv[2]==='vertical';
const ctx=await nav.newContext({viewport:vert?{width:412,height:892}:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true,locale:'es-AR'});
const pg=await ctx.newPage();const err=[];pg.on('pageerror',e=>err.push(e.message));
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Chicharra.html');
await pg.waitForFunction("window.__C&&__C.listo");
const cdp=await ctx.newCDPSession(pg);
const toque=async(p)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
await pg.evaluate("for(let i=0;i<45;i++){__C.anda(1);__C.dibujarYa();}");
const abierto=await pg.evaluate("Idioma.abierto&&Idioma.primera");
await pg.screenshot({path:'chi'+'-idioma.png'});
// tocar "ENGLISH" con un toque real: el rectángulo en unidades de diseño -> ventana
const vw=await pg.evaluate("(()=>{var r=Idioma.rects.find(x=>x.id==='en');return __C.aVentana(r.x+r.w/2,r.y+r.h/2);})()");
await toque(vw);await pg.evaluate("__C.anda(5)");
const idi=await pg.evaluate("Idioma.actual");const guardado=await pg.evaluate("localStorage.getItem('chicharra.idioma')");
const pantAntes=await pg.evaluate("__C.estado()");
await pg.evaluate("__C.anda(60);__C.dibujarYa()");await pg.screenshot({path:'chi'+'-portada-en.png'});
// el globo de la portada vuelve a abrir la pantalla
const gb=await pg.evaluate("__C.aVentana(Idioma.boton.x,Idioma.boton.y)");
await toque(gb);await pg.evaluate("__C.anda(20);__C.dibujarYa()");const reabre=await pg.evaluate("Idioma.abierto&&__C.estado()==='portada'");
const rp=await pg.evaluate("(()=>{var r=Idioma.rects.find(x=>x.id==='pt');return __C.aVentana(r.x+r.w/2,r.y+r.h/2);})()");
await toque(rp);await pg.evaluate("__C.anda(5)");
for(const l of ['pt','fr','en']){await pg.evaluate(l=>{Idioma.elegir(l);},l);
  for(const p of ['portada','tienda','niveles','ajustes']){await pg.evaluate(p=>{__C.ir(p);__C.anda(60);__C.dibujarYa();},p);await pg.screenshot({path:'chi'+'-'+l+'-'+p+'.png'});}}
console.log('primera vez abierta',abierto,'| eligió',idi,'guardado',guardado,'| sigue en',pantAntes,'| globo reabre',reabre,'| después',await pg.evaluate("Idioma.actual"),err.join(';')||'sin errores');
await nav.close();
