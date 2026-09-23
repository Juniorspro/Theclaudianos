import { chromium } from 'playwright-core';
import { usarCDN } from './cdn.mjs';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const ctx0=await nav.newContext();await usarCDN(ctx0);const pg=await ctx0.newPage();
const err=[];pg.on('pageerror',e=>err.push(e.message));
await pg.goto('file:///home/user/Theclaudianos/arrabal/index.html');
await pg.waitForFunction("window.__A&&__A.listo");
await pg.mouse.click(200,400);
await pg.waitForFunction("Object.keys(__A.Sonido.pistas).length>=6",null,{timeout:90000});   // por streaming tarda lo que tarde la red
const r=await pg.evaluate(()=>{const S=__A.Sonido;const ons={};for(const k in S.pistas){const d=S.pistas[k].getChannelData(0);let i=0;while(i<d.length&&Math.abs(d[i])<0.02)i++;ons[k]=(i/S.pistas[k].sampleRate).toFixed(4);}window.__ons=ons;const m=window.ARCHIVOS.musica;return {ons:window.__ons,ctx:!!S.ac,pistas:Object.keys(S.pistas).map(k=>k+' '+S.pistas[k].duration.toFixed(3)+'/'+m[k]),fuente:S.fuenteTema,ls:S.fuente&&[S.fuente.loopStart,S.fuente.loopEnd]};});
console.log(JSON.stringify(r,null,1),err);await nav.close();
