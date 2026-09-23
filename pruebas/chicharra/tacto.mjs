import { chromium } from 'playwright-core';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const nav=await chromium.launch({executablePath:EXE,args:['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-dev-shm-usage']});
const ctx=await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const pg=await ctx.newPage();
const err=[];pg.on('pageerror',e=>err.push(e.message));
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Chicharra.html');
await pg.waitForFunction("window.__C && window.__C.listo");
const cdp=await ctx.newCDPSession(pg);
const toque=(tipo,pts)=>cdp.send('Input.dispatchTouchEvent',{type:tipo,touchPoints:pts});
await pg.evaluate("__C.nivel(1);__C.invencible(true);__C.anda(10);__C.dibujarYa()");
const antes=await pg.evaluate("__C.mundo()");
// un dedo arrastra la nave a la izquierda-arriba
await toque('touchStart',[{x:206,y:760,id:1}]);
for(let i=0;i<10;i++){
  await toque('touchMove',[{x:206-i*12,y:760-i*9,id:1}]);
  await pg.evaluate("__C.anda(4)");
}
const dur=await pg.evaluate("__C.mundo()");
console.log('ARRASTRE: x',antes.x.toFixed(0),'->',dur.x.toFixed(0),' y',antes.y.toFixed(0),'->',dur.y.toFixed(0));
// segundo dedo: la bomba, sin soltar el primero
const bomba=await pg.evaluate("__C.donde('bomba')");
await toque('touchStart',[{x:86,y:760,id:1},{x:bomba.x,y:bomba.y,id:2}]);
await pg.evaluate("__C.anda(4)");
const post=await pg.evaluate("__C.mundo()");
console.log('BOMBA con 2 dedos: bombas',dur.bombas,'->',post.bombas,' sigue arrastrando:',
  await pg.evaluate("__C.J.estado")==='juego');
await toque('touchEnd',[]);
// el joystick del original no existe: se comprueba que la nave sigue al dedo tras soltar y volver
await toque('touchStart',[{x:330,y:820,id:3}]);
for(let i=0;i<8;i++){await toque('touchMove',[{x:330,y:820-i*10,id:3}]);await pg.evaluate("__C.anda(4)");}
const fin=await pg.evaluate("__C.mundo()");
console.log('SEGUNDO ARRASTRE: x',post.x.toFixed(0),'->',fin.x.toFixed(0));
await pg.screenshot({path:'cap-9-tacto.png'});
console.log('ERRORES:',err.length?err:'ninguno');
await nav.close();
