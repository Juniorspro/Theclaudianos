import { chromium } from 'playwright-core';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage']});
const ctx=await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true});
await ctx.addInitScript(()=>{try{localStorage.setItem('arrabal.idioma','es');}catch(e){}});   // sin la pantalla de idioma del primer inicio
const pg=await ctx.newPage();
const err=[];pg.on('pageerror',e=>err.push('PAGEERROR '+e.message));pg.on('console',m=>{if(m.type()==='error')err.push(m.text().slice(0,160));});
pg.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:'))err.push('RED '+u);});
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Arrabal.html');
await pg.waitForFunction("window.__A&&__A.listo",null,{timeout:20000});
await pg.waitForFunction("__A.imgs().length>=10",null,{timeout:20000});
const cap=async n=>{await pg.evaluate("__A.dibujarYa()");await pg.screenshot({path:'ar-'+n+'.png'});};
await pg.evaluate("__A.borrar();__A.ir('portada');__A.anda(100)");await cap('01-portada');
await pg.evaluate("__A.ir('mapa');__A.anda(60)");await cap('02-mapa');
await pg.evaluate("__A.J.pelea=null;__A.ir('equipo');__A.anda(60)");
await pg.evaluate("__A.J.pelea=null;");
await pg.evaluate("__A.tocar && 0");
await pg.evaluate(()=>{__A.ir('mapa');__A.anda(40);__A.dibujarYa();__A.tocar('pelea:1');__A.anda(50);});await cap('03-equipo');
await pg.evaluate("__A.darTodo();__A.ir('coleccion');__A.anda(60)");await cap('04-coleccion');
await pg.evaluate(()=>{__A.anda(2);__A.dibujarYa();__A.tocar('carta:ch3');__A.anda(60);});await cap('05-detalle');
await pg.evaluate(()=>{__A.dibujarYa();__A.tocar('arbol');__A.anda(60);});await cap('06-arbol');
await pg.evaluate(()=>{__A.ir('relicario');__A.anda(50);__A.dibujarYa();__A.tocar('abrir');__A.anda(40);});await cap('07-cofre-abre');
await pg.evaluate("__A.anda(90)");await cap('08-cofre-carta');
// cadena del jugador con el rival quieto
await pg.evaluate("__A.borrar();__A.pelea(1);__A.saltarIntro();__A.quieto(true);__A.anda(20)");
const cad=await pg.evaluate(()=>{const o=[];
  __A.gesto({tipo:'toca'});__A.anda(3);           /* lejos: se acerca solo y pega */
  for(let i=0;i<30;i++){__A.anda(4);o.push(__A.mundo().j.est);}
  for(let i=0;i<3;i++){__A.gesto({tipo:'toca'});__A.anda(10);}
  __A.gesto({tipo:'desliza',dir:'arr'});__A.anda(14);
  const alz=__A.mundo();
  for(let i=0;i<3;i++){__A.gesto({tipo:'toca'});__A.anda(11);}
  return {ests:[...new Set(o)],alzada:{je:alz.j.est,ee:alz.e.est,ey:alz.e.y},combo:__A.mundo().combo,vidaE:__A.mundo().e.vida,maxE:__A.mundo().e.max};});
console.log('CADENA:',JSON.stringify(cad));
await cap('09-aereo');
// especial y súper
await pg.evaluate("__A.anda(80);__A.orden('esp0');__A.anda(16)");await cap('10-especial');
await pg.evaluate("__A.J.pelea&&0;");
const sup=await pg.evaluate(()=>{__A.anda(60);const m=__A.mundo();window.__A.J&&0;
  return m;});
await pg.evaluate(()=>{const J=__A.J;});
await pg.evaluate("(function(){var m=__A.mundo();})()");
await pg.evaluate(()=>{ /* medidor lleno a mano para ver el súper */ });
console.log('ERRORES:',err.length?err.slice(0,8):'ninguno');
await nav.close();
