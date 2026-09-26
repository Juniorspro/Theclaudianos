// Toques reales (CDP): deslizar desde la pelota para patear, arrastrar el arquero y tirarse.
import { chromium } from 'playwright-core';
import { usarCDN } from './cdn.mjs';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true});await usarCDN(ctx);
await ctx.addInitScript(()=>{try{localStorage.setItem('duelo.idioma','es');}catch(e){}});
const pg=await ctx.newPage();const err=[];pg.on('pageerror',e=>err.push(e.message));
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Duelo.html');
await pg.waitForFunction("window.__D&&__D.listo()",null,{timeout:90000});
const cdp=await ctx.newCDPSession(pg);await pg.evaluate("__D.congelar(true)");   // el tiempo lo maneja la prueba
const tq=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
const ev=s=>pg.evaluate(s);const espera=ms=>new Promise(r=>setTimeout(r,ms));
const hasta=async(f,n)=>ev(`(()=>{let i=0;while(!(${f})&&i<${n||900}){__D.anda(1);i++;}return i;})()`);
// 1) patear deslizando con curva
await ev("__D.jugar({dif:0.3,turno:0})");await hasta("__D.partido().fase==='apunta'");
const b=await ev("__D.pelotaEnPantalla()");
await tq('touchStart',{x:b.x,y:b.y+10});
for(let i=1;i<=10;i++){await espera(14);await tq('touchMove',{x:b.x+Math.sin(i/10*Math.PI)*35+i*2,y:b.y+10-i*26});await ev("__D.anda(1)");}
await tq('touchEnd');await ev("__D.anda(2)");
const f1=await ev("__D.partido().fase");await hasta("__D.partido().res!==null",300);const r1=await ev("__D.partido()");
// 2) atajar: arrastrar a la derecha y tirarse a la izquierda
await ev("__D.jugar({dif:0.5,turno:1})");await hasta("__D.partido().fase==='carrera'");
await tq('touchStart',{x:206,y:600});for(let i=1;i<=6;i++){await espera(20);await tq('touchMove',{x:206+i*25,y:600});await ev("__D.anda(2)");}
const x1=await ev("__D.partido().arq.x");
await hasta("__D.partido().fase==='vuelo'",400);for(let i=1;i<=4;i++){await espera(12);await tq('touchMove',{x:356-i*45,y:600-i*10});}
await tq('touchEnd');await ev("__D.anda(1)");
const vol=await ev("__D.partido().arq.vol");
console.log('deslizar → fase',f1,'resultado',r1.res,'| arrastrar → arquero x',x1,'| tirarse',vol,err.join(';')||'sin errores');
console.log(f1==='pateando'||f1==='vuelo'?'':'FALLA patear', x1>0.5?'':'FALLA arrastrar', vol?'':'FALLA tirarse');
await nav.close();
