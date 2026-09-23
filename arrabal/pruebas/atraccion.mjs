import { chromium } from 'playwright-core';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const pg=await (await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true})).newPage();
const err=[];pg.on('pageerror',e=>err.push(e.message));
await pg.goto('file:///home/user/Theclaudianos/arrabal/index.html');
await pg.waitForFunction("window.__A&&__A.listo");await pg.waitForFunction("__A.imgs().length>=10");
await pg.evaluate("__A.anda(500);__A.dibujarYa()");await pg.screenshot({path:'ac-01b-atraccion.png'});
// la demo nunca se traba: 2 minutos de juego seguidos, pasando de una pelea a otra
const d=await pg.evaluate(()=>{const vistos=new Set();for(let i=0;i<7200;i+=30){__A.anda(30);const r=__A.ronda();if(r)vistos.add(r.ronda+':'+r.vic.join('-'));}
  return {estado:__A.estado(),rondasVistas:vistos.size};});
console.log('DEMO 2 min:',JSON.stringify(d),'· errores:',err.length?err:'ninguno');
await nav.close();
