import { chromium } from 'playwright-core';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const nav=await chromium.launch({executablePath:EXE,args:['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage']});
const pg=await (await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true})).newPage();
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Chicharra.html');
await pg.waitForFunction("window.__C && window.__C.listo");
await pg.evaluate("__C.nivel(3);__C.anda(30);__C.dibujarYa()");
await pg.screenshot({path:'cap-12-cartel.png'});
await nav.close();
