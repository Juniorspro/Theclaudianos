// Precisión del tiro con toques reales (CDP): se desliza desde la pelota hasta un punto del arco en pantalla y se
// mide dónde cruza la pelota el plano del arco (sin arquero). Recto y con curva. Uso: node precision.mjs
import { chromium } from 'playwright-core';
import { usarCDN } from './cdn.mjs';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:1,hasTouch:true,isMobile:true});await usarCDN(ctx);
await ctx.addInitScript(()=>{try{localStorage.setItem('duelo.idioma','es');}catch(e){}});
const pg=await ctx.newPage();const err=[];pg.on('pageerror',e=>err.push(e.message));
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Duelo.html');
await pg.waitForFunction("window.__D&&__D.listo()",null,{timeout:90000});
const cdp=await ctx.newCDPSession(pg);await pg.evaluate("__D.congelar(true)");
const tq=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
const ev=s=>pg.evaluate(s);const espera=ms=>new Promise(r=>setTimeout(r,ms));
const hasta=async(f,n)=>ev(`(()=>{let i=0;while(!(${f})&&i<${n||900}){__D.anda(1);i++;}return i;})()`);
const W=await ev(`__D.evalua("JSON.stringify({w:ARCO_W,h:ARCO_H})")`).then(JSON.parse);
const blancos=process.env.POCOS?[[-0.42,0.2],[0.4,0.85]]:[[-0.42,0.2],[0.42,0.2],[-0.4,0.85],[0.4,0.85],[0,0.5],[-0.2,0.35],[0.25,0.7]];
const errores=[];
for(const curva of [0,1]){
  for(const [fx,fy] of blancos){
    await ev("__D.jugar({dif:0.5,turno:0})");const nh=await hasta("__D.partido().fase==='apunta'");console.log('apunta tras',nh);await ev("__D.anda(30)");
    const tx=fx*W.w, ty=fy*W.h;
    const sc=await ev(`__D.evalua("(function(){var a=aPantalla(new THREE.Vector3(${tx},${ty},P.zArco)),b=aPantalla(B.p);return JSON.stringify({x:a.x,y:a.y,bx:b.x,by:b.y});})()")`).then(JSON.parse);
    const N=12;await tq('touchStart',{x:sc.bx,y:sc.by+6});
    for(let i=1;i<=N;i++){await espera(12);const u=i/N, panza=curva?Math.sin(u*Math.PI)*42:0;
      await tq('touchMove',{x:sc.bx+(sc.x-sc.bx)*u+panza,y:sc.by+6+(sc.y-sc.by-6)*u});await ev("__D.anda(1)");}
    await tq('touchEnd');await ev("__D.anda(1)");
    /* sin arquero: se lo lleva lejos cada cuadro hasta que la pelota cruce el plano del arco */
    const cruce=await ev(`__D.evalua("(function(){var n=0,prev=B.p.clone();while(n<400){EL.x=40;EL.volando=false;Bucle.pasar(CUADRO);n++;if(B.vuela&&B.p.z<=P.zArco){var f=(P.zArco-prev.z)/(B.p.z-prev.z||1e-9);return JSON.stringify({x:prev.x+(B.p.x-prev.x)*f,y:prev.y+(B.p.y-prev.y)*f,t:n});}prev.copy(B.p);}return JSON.stringify(null);})()")`).then(JSON.parse);
    if(!cruce){console.log('sin cruce',fx,fy);continue;}
    const e=Math.hypot(cruce.x-tx,cruce.y-ty);errores.push(e);
    console.log((curva?'curva':'recto').padEnd(5),'objetivo',tx.toFixed(2),ty.toFixed(2),'→ llegó',cruce.x.toFixed(2),cruce.y.toFixed(2),'error',e.toFixed(2),'m');
  }
}
errores.sort((a,b)=>a-b);
console.log('ERROR medio',(errores.reduce((a,b)=>a+b,0)/errores.length).toFixed(2),'m | mediana',errores[Math.floor(errores.length/2)].toFixed(2),'| peor',errores[errores.length-1].toFixed(2),'| errores JS',err.join(';')||'ninguno');
await nav.close();
