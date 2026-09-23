import { chromium } from 'playwright-core';
import { usarCDN } from './cdn.mjs';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage']});
const ctx=await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true});
await usarCDN(ctx);
await ctx.addInitScript(()=>{try{localStorage.setItem('arrabal.idioma','es');}catch(e){}});   // sin la pantalla de idioma del primer inicio
const pg=await ctx.newPage();
const err=[];pg.on('pageerror',e=>err.push('PAGEERROR '+e.message));pg.on('console',m=>{if(m.type()==='error')err.push(m.text().slice(0,160));});
pg.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:')&&!u.startsWith('https://cdn.jsdelivr.net/'))err.push('RED '+u);});
await pg.goto('file:///home/user/Theclaudianos/arrabal/index.html');
await pg.waitForFunction("window.__A&&__A.listo");await pg.waitForFunction("__A.imgs().length>=10");
const cap=async n=>{await pg.evaluate("__A.dibujarYa()");await pg.screenshot({path:'ac-'+n+'.png'});};
await pg.evaluate("__A.borrar();__A.anda(400)");
console.log('ATRACCIÓN: estado',await pg.evaluate("__A.estado()"),'· demo',JSON.stringify(await pg.evaluate("__A.ronda()")));
await cap('01-atraccion');
// tocar en cualquier lado → menú
await pg.touchscreen.tap(206,600);await pg.evaluate("__A.anda(60)");
console.log('TOQUE →',await pg.evaluate("__A.estado()"));await cap('02-menu');
await pg.evaluate("__A.dibujarYa()");const b=await pg.evaluate("__A.donde('arcade')");await pg.touchscreen.tap(b.x,b.y);await pg.evaluate("__A.anda(40)");
console.log('ARCADE →',await pg.evaluate("__A.estado()"));await cap('03-selec');
// la grilla es de 12 (4 × 3): un toque en la celda 10 marca al Toro
{const c=await pg.evaluate("__A.donde('sel:10')");await pg.touchscreen.tap(c.x,c.y);await pg.evaluate("__A.anda(10)");
 console.log("TOQUE EN LA CELDA 10 → sel",await pg.evaluate("__A.J.sel"));await cap('03b-selec-toro');}
// la cuenta regresiva elige sola
await pg.evaluate("__A.anda(1260)");
console.log('TIEMPO DE ELECCIÓN AGOTADO →',await pg.evaluate("__A.estado()"),JSON.stringify(await pg.evaluate("__A.arc()")));
await pg.evaluate("__A.anda(40)");await cap('04-vs');
await pg.evaluate("__A.anda(160)");
console.log('VS →',await pg.evaluate("__A.estado()"),JSON.stringify(await pg.evaluate("__A.ronda()")));
await pg.evaluate("__A.anda(20)");await cap('05-ronda1');
// rondas: el rival cae (vida 1 + un golpe) y aparece la cuenta de bonos
const r=await pg.evaluate(()=>{__A.anda(130);__A.matarRival();__A.bot(true);let c=0;while(!__A.ronda().entre&&c<3000){__A.anda(5);c+=5;}
  __A.anda(70);return __A.ronda();});
console.log('FIN DE RONDA:',JSON.stringify(r));
await cap('06-bonus');
// la escalera entera con el bot
const esc=await pg.evaluate(async()=>{const o=[];let c=0;
  while(c<120000){__A.anda(20);c+=20;const e=__A.estado();
    if(e==='vs'){}
    if(e==='continuar'||e==='campeon'||e==='iniciales'||e==='gameover'||e==='ranking'){o.push(e);break;}
    const a=__A.arc();if(a&&o[o.length-1]!==a.i+'/'+a.de){o.push(a.i+'/'+a.de);}}
  return {pasos:o,final:__A.estado(),arc:__A.arc(),cuadros:c};});
console.log('ESCALERA:',JSON.stringify(esc));
await cap('07-fin-escalera');
// continuar, iniciales y récords
await pg.evaluate("__A.J.arc.puntos=250000;__A.ir('continuar');__A.J.tCont=3;__A.anda(20)");await cap('08-continuar');
await pg.evaluate("__A.anda(200)");
console.log('CONTINUAR agotado →',await pg.evaluate("__A.estado()"));await cap('09-iniciales');
await pg.evaluate(()=>{__A.dibujarYa();__A.tocar('ini:up:0');__A.tocar('ini:up:0');__A.dibujarYa();__A.tocar('ini:up:1');__A.dibujarYa();__A.tocar('iniListo');__A.anda(60);});
console.log('RÉCORDS:',JSON.stringify(await pg.evaluate("__A.Prog.ranking.map(r=>r.ini+' '+r.pts)")));
await cap('10-ranking');
// el modo historia sigue igual
const h=await pg.evaluate(async()=>{__A.darTodo();__A.nivelar(4);__A.Prog.equipo=['mo1','ch1','ba1'];__A.bot(true);__A.pelea(2);let c=0;
  while(c<16000&&__A.estado()==='pelea'){__A.anda(20);c+=20;}return __A.estado()+(__A.J.res?(__A.J.res.gano?' gana':' pierde'):'');});
console.log('HISTORIA pelea 2:',h);
console.log('ERRORES:',err.length?err.slice(0,8):'ninguno');
await nav.close();
