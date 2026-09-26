// Animaciones en juego: contacto de la patada cuadro a cuadro (punta vs pelota), guantes y estirada propia. Uso: node animaciones.mjs
import { chromium } from 'playwright-core';
import { usarCDN } from './cdn.mjs';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:1});await usarCDN(ctx);
await ctx.addInitScript(()=>{try{localStorage.setItem('duelo.idioma','es');}catch(e){}});
const pg=await ctx.newPage();const err=[];pg.on('pageerror',e=>err.push(e.message));
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Duelo.html');
await pg.waitForFunction("window.__D&&__D.listo()",null,{timeout:90000});await pg.evaluate("__D.congelar(true)");
const ev=s=>pg.evaluate(s);
const camara=(p,m,fov)=>ev(`(()=>{const C=__D.cam();C.position.set(${p});C.lookAt(${m});C.fov=${fov};C.updateProjectionMatrix();document.getElementById('ui').style.opacity=0;__D.render();})()`);
const foto=async(n,clip)=>{await pg.screenshot({path:n+'.png',clip:clip||{x:0,y:0,width:412,height:892}});};
await ev("__D.jugar({dif:0.5,turno:0});__D.anda(200)");
const info=await ev(`(()=>{const Y=__D.yo();return {x:Y.x,z:Y.z,g:Y.giro,b:__D.partido().b}})()`);
const bx=info.b[0],bz=info.b[2];
// B) guantes del rival (cámara cerca)
await camara(`0.6,1.2,-9.6`,`0,0.9,-11.55`,40);await foto('guantes',{x:56,y:200,width:300,height:500});
// A) patada cuadro a cuadro
await ev("__D.patear(1.5,1.4,0.9,0.2)");
const filas=[];let k=0;
for(let i=0;i<34;i++){await ev("__D.anda(1)");
  const st=await ev(`(()=>{const Y=__D.yo(),P=__D.partido();const t=Y.h.RightToeBase.getWorldPosition(Y.raiz.position.clone());const f=Y.h.RightFoot.getWorldPosition(Y.raiz.position.clone());return {v:P.v,toe:[t.x,t.y,t.z].map(v=>+v.toFixed(3)),tob:+f.y.toFixed(3),c:Y.contacto}})()`);
  filas.push(st);
  if(i>=10&&i<=24&&i%2===0){await camara(`${bx+2.8},0.8,${bz-0.3}`,`${bx},0.55,${bz-0.3}`,40);await foto('pk'+String(k++).padStart(2,'0'),{x:40,y:260,width:330,height:400});}
}
const ic=filas.findIndex(f=>f.c);console.log('contacto en cuadro',ic,'pelota',JSON.stringify([bx,0.11,bz]),'punta',JSON.stringify(filas[ic]),'antes',JSON.stringify(filas[ic-1]));
// C) mi estirada
await ev("(()=>{let n=0;while(!(__D.partido().turno===1&&__D.partido().fase==='vuelo')&&n<2500){__D.anda(1);n++;}})()");
await ev("__D.tirarse(1.7,1.0)");
for(let i=0;i<12;i++){await ev("__D.anda(5)");await ev("document.getElementById('ui').style.opacity=0;__D.dibujarYa()");await foto('yo'+String(i).padStart(2,'0'),{x:0,y:430,width:412,height:420});}
console.log('mi arquero',JSON.stringify(await ev(`(()=>{const Y=__D.yo();return {anim:Y.anim,clip:Y.clip,x:+Y.x.toFixed(2),p:+Y.p.toFixed(2),k:Y.kViaje}})()`)));
console.log('ERRORES',err.length?err.join('\n'):'ninguno');
await nav.close();
