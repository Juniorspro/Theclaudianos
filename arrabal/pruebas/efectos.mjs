import { chromium } from 'playwright-core';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const pg=await nav.newPage();
const err=[];pg.on('pageerror',e=>err.push(e.message));
await pg.goto('file:///home/user/Theclaudianos/arrabal/index.html');
await pg.waitForFunction("window.__A&&__A.listo");
await pg.mouse.click(200,400);
await pg.waitForFunction("__A.Sonido.sfx",{timeout:15000});
const r=await pg.evaluate(()=>{
  const S=__A.Sonido, M=window.ARCHIVOS.sfxMapa, cuenta={}, fallo={};
  const orig=S.muestra.bind(S);
  S.muestra=function(n,v){const ok=orig(n,v);(ok?cuenta:fallo)[n]=((ok?cuenta:fallo)[n]||0)+1;return ok;};
  const info={dur:S.sfx.duration.toFixed(3),largo:M._largo,corre:(S.sfx.duration-M._largo>0.005)};
  const peleas=[['mo1',['toca','toca','toca','esp0','esp1']],['ch1',['toca','toca','esp0']],['to1',['esp1','toca']],['lo1',['esp0','toca']],['co1',['toca','toca']]];
  for(const [id,ords] of peleas){__A.borrar();__A.darTodo();__A.Prog.equipo=[id];__A.pelea(1);__A.saltarIntro();__A.quieto(true);__A.anda(60);
    for(const o of ords){if(o==='toca')__A.gesto({tipo:'toca'});else __A.orden(o);__A.anda(50);}
    __A.medidor(3);__A.orden('super');__A.anda(200);}
  return {info,cuenta,fallo};});
console.log(JSON.stringify(r,null,1),err);await nav.close();
