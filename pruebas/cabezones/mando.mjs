// Toques reales (CDP) sobre el mando del partido, parado y apaisado: dos dedos a la vez.
import { chromium } from 'playwright-core';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
let mal=0;
for(const vp of [{width:412,height:892},{width:892,height:412}]){
  const ctx=await nav.newContext({viewport:vp,deviceScaleFactor:2,hasTouch:true,isMobile:true});
await ctx.addInitScript(()=>{try{localStorage.setItem('cabezones.idioma','es');}catch(e){}});   // sin la pantalla de idioma del primer inicio
  const pg=await ctx.newPage();const err=[];pg.on('pageerror',e=>err.push(e.message));
  await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Cabezones.html');
  await pg.waitForFunction("window.__H&&__H.listo");
  const cdp=await ctx.newCDPSession(pg);
  const toque=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map((p,i)=>({x:p.x,y:p.y,id:p.id??i}))});
  await pg.evaluate("__H.jugar({dif:0});__H.anda(150);__H.dibujarYa()");
  const z=await pg.evaluate("({der:__H.zona('der'),patea:__H.zona('patea'),salta:__H.zona('salta'),izq:__H.zona('izq')})");
  const x0=await pg.evaluate("__H.partido().yo.x");
  await toque('touchStart',[{...z.der,id:1}]);await toque('touchStart',[{...z.der,id:1},{...z.patea,id:2}]);
  const a=await pg.evaluate("__H.anda(30),{m:__H.mandoAhora(),p:__H.partido()}");
  await toque('touchMove',[{...z.izq,id:1},{...z.patea,id:2}]);           // desliza de ▶ a ◀ sin levantar
  const b=await pg.evaluate("__H.anda(30),{m:__H.mandoAhora(),p:__H.partido()}");
  await toque('touchEnd',[]);
  await pg.evaluate("(()=>{let n=0;while(__H.partido().estado!=='juego'&&n<600){__H.anda(1);n++;}})()");   // si hubo gol, espera el saque
  await toque('touchStart',[{...z.salta,id:3}]);const c=await pg.evaluate("__H.anda(8),__H.partido().yo");await toque('touchEnd',[]);
  const ok1=a.m.der&&a.m.patea&&a.p.yo.x>x0+30, ok2=b.m.izq&&!b.m.der&&b.p.yo.x<a.p.yo.x, ok3=!c.suelo;
  // la pausa, con un toque de verdad
  await pg.evaluate("__H.anda(60),__H.dibujarYa()");const pz=await pg.evaluate("__H.donde('pausa')");
  await toque('touchStart',[{...pz,id:4}]);await pg.evaluate("__H.anda(2)");await toque('touchEnd',[]);
  const ok4=await pg.evaluate("__H.anda(2),__H.J.pausa");
  console.log(vp.width+'x'+vp.height,'correr+patear',ok1,'deslizar',ok2,'salto',ok3,'pausa',ok4,'x',x0,a.p.yo.x,b.p.yo.x,err.join(';'));
  if(!(ok1&&ok2&&ok3&&ok4)||err.length)mal++;
  await ctx.close();
}
console.log(mal?'FALLA':'TODO BIEN');await nav.close();
