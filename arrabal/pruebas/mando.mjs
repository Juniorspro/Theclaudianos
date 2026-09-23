// el mando apaisado: botones, palito y dos dedos. Correr con 412x892 (teléfono parado: el juego se gira) y con 892x412
import { chromium } from 'playwright-core';
import { usarCDN } from './cdn.mjs';
const [W,H]=(process.argv[2]||'412x892').split('x').map(Number);
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage']});
const ctx=await nav.newContext({viewport:{width:W,height:H},deviceScaleFactor:2,hasTouch:true,isMobile:true});
await usarCDN(ctx);
await ctx.addInitScript(()=>{try{localStorage.setItem('arrabal.idioma','es');}catch(e){}});   // sin la pantalla de idioma del primer inicio
const pg=await ctx.newPage();const err=[];pg.on('pageerror',e=>err.push(e.message));
const cdp=await ctx.newCDPSession(pg);
const T=async(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map((p,i)=>({x:p.x,y:p.y,id:p.id??i}))});
await pg.goto('file:///home/user/Theclaudianos/arrabal/index.html');
await pg.waitForFunction("window.__A&&__A.listo");await pg.waitForFunction("__A.imgs().length>=20");await pg.waitForTimeout(500);
await pg.evaluate("__A.borrar();__A.anda(300);__A.ir('menu');__A.anda(80);__A.dibujarYa()");
await pg.screenshot({path:'R-menu.png'});
const b=await pg.evaluate("__A.donde('arcade')");await pg.touchscreen.tap(b.x,b.y);await pg.evaluate("__A.anda(30)");
console.log('MENÚ: toque en ARCADE →',await pg.evaluate("__A.estado()"));
await pg.evaluate("__A.borrar();__A.darTodo();__A.Prog.equipo=['ka1'];__A.pelea(1);__A.saltarIntro();__A.quieto(true);__A.anda(40)");
const bs=await pg.evaluate("__A.mando()");const pos=id=>bs.find(q=>q.id===id);
const v=async(x,y)=>pg.evaluate(([x,y])=>__A.aVentana(x,y),[x,y]);
// 1) GOLPE: apoyar, 3 cuadros, soltar
let g1=pos('golpe'), pv=await v(g1.x,g1.y);
const v0=await pg.evaluate("__A.mundo().e.vida");
await T('touchStart',[pv]);await pg.evaluate("__A.anda(3)");await T('touchEnd',[]);await pg.evaluate("__A.anda(40)");
console.log('GOLPE → jugador',await pg.evaluate("__A.mundo2().j.est+' '+__A.mundo2().j.movNom"),'· vida rival',v0,'→',await pg.evaluate("__A.mundo().e.vida"));
// 2) palito: apoyar a la izquierda y correr el dedo a la derecha: camina
const base=await v(150,300), der=await v(210,300);
const x0=await pg.evaluate("__A.mundo2().j.x");
await T('touchStart',[base]);await pg.evaluate("__A.anda(2)");await T('touchMove',[der]);await pg.evaluate("__A.anda(30)");
const m2=await pg.evaluate("(function(){var q=__A.mundo2();return q.j.est+' dx '+q.dx.toFixed(2)+' x '+Math.round(q.j.x);})()");
await pg.evaluate("__A.dibujarYa()");await pg.screenshot({path:'R-pelea.png'});
await T('touchEnd',[]);await pg.evaluate("__A.anda(10)");
console.log('PALITO a la derecha →',m2,'(antes x',Math.round(x0)+')');
// 3) palito arriba: salta
const arr=await v(150,240);
await T('touchStart',[base]);await pg.evaluate("__A.anda(2)");await T('touchMove',[arr]);await pg.evaluate("__A.anda(6)");
console.log('PALITO arriba →',await pg.evaluate("__A.mundo2().j.est"));await T('touchEnd',[]);await pg.evaluate("__A.anda(60)");
// 4) CUBRIR sostenido
let c=pos('bloqueo'), pc=await v(c.x,c.y);
await T('touchStart',[pc]);await pg.evaluate("__A.anda(6)");
console.log('CUBRIR →',await pg.evaluate("__A.mundo2().j.est"));await T('touchEnd',[]);await pg.evaluate("__A.anda(10)");
// 5) dos dedos: palito + golpe a la vez
g1=pos('golpe');pv=await v(g1.x,g1.y);
await T('touchStart',[{...base,id:1}]);await pg.evaluate("__A.anda(2)");await T('touchMove',[{...der,id:1}]);await pg.evaluate("__A.anda(4)");
await T('touchStart',[{...der,id:1},{...pv,id:2}]);await pg.evaluate("__A.anda(3)");
console.log('PALITO + GOLPE →',await pg.evaluate("__A.mundo2().j.est+' '+(__A.mundo2().j.movNom||'')"));
await T('touchEnd',[]);
console.log(err.length?err:'sin errores');await nav.close();
