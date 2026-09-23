import { chromium } from 'playwright-core';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage']});
const ctx=await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const pg=await ctx.newPage();
const err=[];pg.on('pageerror',e=>err.push('PAGEERROR '+e.message));
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Arrabal.html');
await pg.waitForFunction("window.__A&&__A.listo");
const cap=async n=>{await pg.evaluate("__A.dibujarYa()");await pg.screenshot({path:'ar-'+n+'.png'});};
// la cadena de cuatro con el rival quieto, cada luchador
for(const inicio of ['mo1','ba1','ch1']){
  const r=await pg.evaluate((id)=>{__A.borrar();__A.darTodo();__A.Prog.equipo=[id];__A.pelea(1);__A.saltarIntro();__A.quieto(true);__A.anda(10);
    __A.gesto({tipo:'toca'});__A.anda(40);
    for(let i=0;i<3;i++){__A.gesto({tipo:'toca'});__A.anda(10);}
    __A.anda(30);const m=__A.mundo();return id+': combo '+m.combo[0]+' · vida rival '+m.e.vida+'/'+m.e.max;},inicio);
  console.log('CADENA',r);
}
// cadena + lanzar + aéreos + azote
const air=await pg.evaluate(()=>{__A.borrar();__A.darTodo();__A.Prog.equipo=['mo1'];__A.pelea(1);__A.saltarIntro();__A.quieto(true);__A.anda(10);
  __A.gesto({tipo:'toca'});__A.anda(40);__A.gesto({tipo:'toca'});__A.anda(10);
  __A.gesto({tipo:'desliza',dir:'arr'});__A.anda(16);const a=__A.mundo();
  const alto=[];for(let i=0;i<3;i++){__A.gesto({tipo:'toca'});__A.anda(12);alto.push(__A.mundo().e.est);}
  __A.gesto({tipo:'desliza',dir:'aba'});__A.anda(30);
  return {lanzado:a.e.est+'@y'+a.e.y,persigue:a.j.est,aire:alto,combo:__A.mundo().combo[0]};});
console.log('AÉREO',JSON.stringify(air));
await cap('11-aereo');
// especiales de los seis y súper
for(const id of ['mo1','ba1','ch1','ma1','pa1','co1','ka1','xi1','bu1','lo1','to1','va1']){
  const r=await pg.evaluate((id)=>{__A.borrar();__A.darTodo();__A.Prog.equipo=[id];__A.pelea(1);__A.saltarIntro();__A.quieto(true);__A.anda(10);
    const v0=__A.mundo().e.vida;__A.orden('esp0');__A.anda(70);const v1=__A.mundo().e.vida;__A.anda(60);
    __A.orden('esp1');__A.anda(80);const v2=__A.mundo().e.vida;__A.anda(60);
    __A.medidor(3);__A.orden('super');__A.anda(40);const cine=__A.mundo().j.est;__A.anda(150);const v3=__A.mundo().e.vida;
    return id+': esp1 -'+(v0-v1)+' · esp2 -'+(v1-v2)+' · súper -'+(v2-v3)+' ('+cine+')';},id);
  console.log('ESPECIALES',r);
}
await pg.evaluate("__A.borrar();__A.darTodo();__A.Prog.equipo=['pa1'];__A.pelea(1);__A.saltarIntro();__A.quieto(true);__A.anda(10);__A.medidor(3);__A.orden('super');__A.anda(30)");await cap('12-super-cine');
await pg.evaluate("__A.anda(50)");await cap('13-super-golpe');
// peleas enteras con el bot: una de cada barrio, con presupuesto largo
for(const [n,eq,niv] of [[2,['mo1','ch1','ba1'],4],[5,['mo1','ch1','ba1'],10],[7,['mo2','ch2','ba2'],15],[10,['mo2','ma2','pa2'],23],[12,['mo3','ba3','pa2'],26],[15,['ch3','pa3','mo3'],33]]){
  const r=await pg.evaluate(async([n,eq,niv])=>{__A.borrar();__A.darTodo();__A.nivelar(niv);__A.Prog.equipo=eq;__A.quieto(false);__A.pelea(n);__A.bot(true);let c=0;
    while(c<16000&&__A.estado()==='pelea'){__A.anda(20);c+=20;}
    const R=__A.J.res;return 'pelea '+n+' (nivel '+niv+'): '+(__A.estado()==='resultado'?(R.gano?'GANA '+R.estrellas+'★ combo '+R.combo:'pierde'):'sin terminar')+' @'+c;},[n,eq,niv]);
  console.log(r);
}
console.log('ERRORES:',err.length?err.slice(0,6):'ninguno');
await nav.close();
