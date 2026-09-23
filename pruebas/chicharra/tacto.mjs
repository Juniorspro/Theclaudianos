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
const m=()=>pg.evaluate("__C.mundo()");
// RELATIVO: el dedo apoya lejos de la nave; la nave copia el movimiento, no salta al dedo
await pg.evaluate("__C.borrar();__C.nivel(1);__C.invencible(true);__C.anda(10);__C.dibujarYa()");
const a=await m();
await toque('touchStart',[{x:330,y:820,id:1}]);await pg.evaluate("__C.anda(2)");
const trasApoyar=await m();
for(let i=1;i<=10;i++){await toque('touchMove',[{x:330-i*12,y:820-i*6,id:1}]);await pg.evaluate("__C.anda(2)");}
const b=await m();
console.log('RELATIVO: al apoyar x',a.x.toFixed(0),'->',trasApoyar.x.toFixed(0),'(no salta) · dedo -120,-60 → nave',
  (b.x-a.x).toFixed(0),(b.y-a.y).toFixed(0));
// segundo dedo en la bomba: la bomba sale y la nave no salta
await pg.evaluate("__C.dibujarYa()");
const bomba=await pg.evaluate("__C.donde('bomba')");
await toque('touchStart',[{x:210,y:760,id:1},{x:bomba.x,y:bomba.y,id:2}]);await pg.evaluate("__C.anda(3)");
const c=await m();
console.log('BOMBA con 2 dedos: bombas',b.bombas,'->',c.bombas,'· la nave se movió',Math.hypot(c.x-b.x,c.y-b.y).toFixed(1),'(debe ser ~0)');
await toque('touchEnd',[]);await pg.evaluate("__C.anda(2)");
// BAJO EL DEDO: la nave va al dedo
await pg.evaluate("__C.Prog.aj.control='dedo'");
await toque('touchStart',[{x:100,y:700,id:3}]);await pg.evaluate("__C.anda(40)");
const d=await m();
console.log('BAJO EL DEDO: nave en',d.x.toFixed(0),d.y.toFixed(0),'(dedo en 100,700 → nave ~100,642)');
await toque('touchEnd',[]);
// menú: deslizar la vitrina con un dedo de verdad cambia de nave
await pg.evaluate("__C.Prog.aj.control='relativo';__C.ir('portada');__C.anda(100);__C.dibujarYa()");
const n0=await pg.evaluate("__C.J.iNave");
await toque('touchStart',[{x:300,y:350,id:5}]);
for(let i=1;i<=8;i++){await toque('touchMove',[{x:300-i*20,y:352,id:5}]);await pg.evaluate("__C.anda(1)");}
await toque('touchEnd',[]);await pg.evaluate("__C.anda(3)");
console.log('VITRINA deslizada con el dedo: nave',n0,'->',await pg.evaluate("__C.J.iNave"));
// y un toque corto sobre MEJORAS abre la tienda (al soltar)
await pg.evaluate("__C.ir('portada');__C.anda(100);__C.dibujarYa()");
const t=await pg.evaluate("__C.donde('tienda')");
await pg.touchscreen.tap(t.x,t.y);await pg.evaluate("__C.anda(3)");
console.log('TOQUE EN MEJORAS →',await pg.evaluate("__C.estado()"));
console.log('ERRORES:',err.length?err:'ninguno');
await nav.close();
