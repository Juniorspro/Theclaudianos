// Hoja de poses del futbolista (12 animaciones de cerca). Uso: node poses.mjs → pose00..11.png
import { chromium } from 'playwright-core';
import { usarCDN } from './cdn.mjs';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await nav.newContext({viewport:{width:412,height:892}});await usarCDN(ctx);
await ctx.addInitScript(()=>{try{localStorage.setItem('duelo.idioma','es');}catch(e){}});const pg=await ctx.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Duelo.html');
await pg.waitForFunction("window.__D&&__D.listo()",null,{timeout:90000});await pg.evaluate("__D.congelar(true)");
await pg.evaluate("__D.ir('arenas');__D.anda(5);document.getElementById('ui').style.display='none'");
const L=[['quieto',0],['arquero',0],['patear',0.3],['patear',0.55],['patear',0.8],['volada',0.2],['volada',0.6],['festejar',0.3],['lamento',0.8],['correr',0.3],['malabares',0.2],['caminar',0.3]];
let i=0;
for(const [a,p] of L){
  await pg.evaluate(([a,p])=>{const Y=__D.yo();Y.anim=a;Y.x=0;Y.z=2;Y.y=0;Y.giro=Math.PI*0.75;Y.acelera=a==='correr';Y.dx=a==='volada'?-2:0;Y.dy=0.5;
    for(let k=0;k<25;k++){Y.p=p;__D.posar(Y,1/30);} Y.p=p;
    const C=__D.cam();C.position.set(0,1.0,7.5);C.lookAt(0,0.9,2);C.fov=30;C.updateProjectionMatrix();__D.render();},[a,p]);
  await pg.screenshot({path:`pose${String(i++).padStart(2,'0')}.png`,clip:{x:76,y:170,width:260,height:560}});
}
await nav.close();
