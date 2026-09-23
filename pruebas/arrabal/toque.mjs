import { chromium } from 'playwright-core';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const pg=await ctx.newPage();
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Arrabal.html');
await pg.waitForFunction("window.__A&&__A.listo");
const cdp=await ctx.newCDPSession(pg);
const T=(tipo,pts)=>cdp.send('Input.dispatchTouchEvent',{type:tipo,touchPoints:pts});
await pg.evaluate("__A.borrar();__A.pelea(1);__A.saltarIntro();__A.quieto(true);__A.anda(10)");
const v0=await pg.evaluate("__A.mundo().e.vida");
const t0=Date.now();await T('touchStart',[{x:120,y:700,id:1}]);await T('touchEnd',[]);const dur=Date.now()-t0;
await pg.evaluate("__A.anda(60)");
const r=await pg.evaluate("__A.mundo()");
console.log('toque de',dur,'ms → daño',v0-r.e.vida,'· combo',r.combo[0]);
for(let i=0;i<4;i++){await T('touchStart',[{x:120,y:700,id:2+i}]);await T('touchEnd',[]);await pg.evaluate("__A.anda(9)");}
await pg.evaluate("__A.anda(30)");
console.log('4 toques seguidos → combo',await pg.evaluate("__A.mundo().combo[0]"));
await nav.close();
