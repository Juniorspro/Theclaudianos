import { chromium } from 'playwright-core';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const ctx=await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const pg=await ctx.newPage();const err=[];pg.on('pageerror',e=>err.push(e.message));
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Arrabal.html');
await pg.waitForFunction("window.__A&&__A.listo");
const cdp=await ctx.newCDPSession(pg);
const T=(tipo,pts)=>cdp.send('Input.dispatchTouchEvent',{type:tipo,touchPoints:pts});
const m=()=>pg.evaluate("__A.mundo()");
await pg.evaluate("__A.borrar();__A.pelea(1);__A.saltarIntro();__A.quieto(true);__A.anda(10);__A.dibujarYa()");
// 1) un toque corto en la zona de gestos: se acerca y pega
const v0=(await m()).e.vida;
await T('touchStart',[{x:120,y:700,id:1}]);await pg.evaluate("__A.anda(2)");await T('touchEnd',[]);
await pg.evaluate("__A.anda(50)");
console.log('TOQUE → daño al rival:',v0-(await m()).e.vida,'· estado jugador:',(await m()).j.est);
// 2) deslizar hacia arriba (sobre la pelea misma): salta
await T('touchStart',[{x:200,y:420,id:2}]);
for(let i=1;i<=5;i++){await T('touchMove',[{x:200,y:420-i*10,id:2}]);}
await pg.evaluate("__A.anda(3)");const s=await m();await T('touchEnd',[]);
console.log('DESLIZAR ↑ → jugador:',s.j.est,'y',s.j.y);
await pg.evaluate("__A.anda(60)");
// 3) mantener el dedo quieto: se cubre; al soltar, vuelve a la guardia
await T('touchStart',[{x:120,y:700,id:3}]);await pg.waitForTimeout(260);await pg.evaluate("__A.anda(4)");
const c=await m();await T('touchEnd',[]);await pg.evaluate("__A.anda(4)");const c2=await m();
console.log('MANTENER → jugador:',c.j.est,'· al soltar:',c2.j.est);
// 4) especial con un segundo dedo mientras el primero se cubre
await pg.evaluate("__A.dibujarYa()");
const b=await pg.evaluate("__A.donde('esp0')");
await T('touchStart',[{x:120,y:700,id:4}]);await pg.waitForTimeout(220);await pg.evaluate("__A.anda(3)");
await T('touchStart',[{x:120,y:700,id:4},{x:b.x,y:b.y,id:5}]);await pg.evaluate("__A.anda(3)");
const e=await m();await T('touchEnd',[]);
console.log('ESPECIAL con 2do dedo → jugador:',e.j.est,'(el dedo del botón no cuenta como gesto)');
// 5) un toque en el botón de pausa
await pg.evaluate("__A.anda(60);__A.dibujarYa()");
const p=await pg.evaluate("__A.donde('pausa')");
await pg.touchscreen.tap(p.x,p.y);await pg.evaluate("__A.anda(3)");
console.log('PAUSA →',await pg.evaluate("__A.estado()"));
// 6) menú: tocar HISTORIA lleva al mapa (la portada ahora es la atracción)
await pg.evaluate("__A.ir('menu');__A.anda(100);__A.dibujarYa()");
const q=await pg.evaluate("__A.donde('mapa')");await pg.touchscreen.tap(q.x,q.y);await pg.evaluate("__A.anda(3)");
console.log('MENÚ → HISTORIA →',await pg.evaluate("__A.estado()"));
// capturas del súper
await pg.evaluate("__A.borrar();__A.darTodo();__A.Prog.equipo=['ch3'];__A.pelea(4);__A.saltarIntro();__A.quieto(true);__A.anda(20);__A.medidor(3);__A.orden('super');__A.anda(35);__A.dibujarYa()");
await pg.screenshot({path:'ar-12-super-cine.png'});
await pg.evaluate("__A.anda(70);__A.dibujarYa()");await pg.screenshot({path:'ar-13-super-golpe.png'});
await pg.evaluate("__A.borrar();__A.darTodo();__A.Prog.equipo=['pa2'];__A.pelea(11);__A.saltarIntro();__A.quieto(true);__A.anda(20);__A.orden('esp1');__A.anda(26);__A.dibujarYa()");
await pg.screenshot({path:'ar-14-peces.png'});
console.log('ERRORES:',err.length?err:'ninguno');
await nav.close();
