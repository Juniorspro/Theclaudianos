// Hoja de poses de todos los estados del futbolista (clips de mocap + capas). Uso: node poses.mjs → ps000..063.png
// Hoja de poses del sistema nuevo: cada estado/variante en 4 momentos
import { chromium } from 'playwright-core';
import { usarCDN } from './cdn.mjs';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await nav.newContext({viewport:{width:412,height:892}});await usarCDN(ctx);
await ctx.addInitScript(()=>{try{localStorage.setItem('duelo.idioma','es');}catch(e){}});
const pg=await ctx.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Duelo.html');
await pg.waitForFunction("window.__D&&__D.listo()",null,{timeout:90000});await pg.evaluate("__D.congelar(true)");
await pg.evaluate("__D.ir('arenas');__D.anda(5);document.getElementById('ui').style.display='none'");
const filas=[['quieto',0,0,0,[0.3,1.2,2.1,3]],['espera',0,0,0,[0.3,0.8,1.3,1.8]],['arquero',0,0,0,[0.3,0.9,1.5,2.1]],['patear',0,0,0,[0.05,0.3,0.45,0.9]],
 ['volada',-1.7,1.0,0,[0.1,0.25,0.45,0.9]],['volada',1.5,0.1,0,[0.1,0.25,0.5,1.4]],['volada',-1.4,0.5,0,[0.1,0.25,0.45,0.9]],['volada',0.2,0.9,0,[0.1,0.3,0.5,0.9]],
 ['festejar',0,0,0,[0.3,0.6,0.9,1.3]],['festejar',0,0,1,[0.3,0.8,1.2,1.8]],['festejar',0,0,2,[0.3,0.7,1.1,1.6]],['lamento',0,0,0,[0.4,1.2,2,3]],['lamento',0,0,1,[0.5,1.5,2.5,4]],
 ['correr',0,0,0,[0.1,0.2,0.3,0.4]],['caminar',0,0,0,[0.3,0.8,1.3,1.8]],['parado',0,0,0,[1,3,5,7]]];
let k=0;
for(const [a,dx,dy,vr,ts] of filas){
  for(const t of ts){
    await pg.evaluate(([a,dx,dy,vr,t])=>{__D.evalua(`(function(){var J=YO;EL.raiz.visible=false;J.raiz.visible=true;J.x=0;J.z=2;J.y=0;J.giro=Math.PI*0.82;J.anim='${a}';J.animPrev=null;J.dx=${dx};J.dy=${dy};J.p=0;J.te=0;J.t=0;
      J.repe=true;J.var=${vr};J.acelera=false;posarFutbolista(J,0);J.x0v=0;J.z0v=2;
      var n=Math.round(${t}*30);for(var i=0;i<n;i++){posarFutbolista(J,1/30);}
      /* el viaje de la estirada se muestra relativo: la cámara lo sigue */
      var C=R3.cam;C.position.set(J.x*0.6,1.05,J.z+5.6);C.lookAt(J.x*0.6,0.85,J.z);C.fov=34;C.updateProjectionMatrix();dibujar3D();})()`);},[a,dx,dy,vr,t]);
    await pg.screenshot({path:`ps${String(k++).padStart(3,'0')}.png`,clip:{x:86,y:230,width:240,height:430}});
  }
}
await nav.close();
