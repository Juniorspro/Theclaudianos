import { chromium } from 'playwright-core';
const JUEGO='file:///home/user/Theclaudianos/juegos-pc/Chicharra.html';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const nav=await chromium.launch({executablePath:EXE,args:['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-dev-shm-usage']});
const ctx=await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const pg=await ctx.newPage();
const errores=[];
pg.on('console',m=>{if(m.type()==='error')errores.push(m.text().slice(0,200));});
pg.on('pageerror',e=>errores.push('PAGEERROR: '+e.message));
pg.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:'))errores.push('RED: '+u);});
await pg.goto(JUEGO);
await pg.waitForFunction("window.__C && window.__C.listo",null,{timeout:20000});
await pg.waitForFunction("__C.assets().listos>=__C.assets().total",null,{timeout:20000});
console.log('ASSETS:',JSON.stringify(await pg.evaluate("__C.assets()")));
const cap=async n=>{await pg.evaluate("__C.dibujarYa()");await pg.screenshot({path:'cap-'+n+'.png'});};
await pg.evaluate("__C.borrar();__C.ir('portada');__C.anda(110)");
await cap('01-hangar');
// deslizar la vitrina cambia de nave; la bloqueada ofrece desbloquear
const nv=await pg.evaluate(()=>{const a=__C.J.iNave;__C.deslizar(206,340,-120,0);__C.anda(30);__C.dibujarYa();
  return {antes:a,despues:__C.J.iNave,botones:__C.botones()};});
console.log('DESLIZAR NAVE:',nv.antes,'->',nv.despues,' desbloquear:',nv.botones.includes('desbloquear'));
await cap('02-hangar-bloqueada');
for(const [e,n] of [['niveles','03-niveles'],['ajustes','04-ajustes'],['tienda','05-tienda']]){
  await pg.evaluate(`__C.monedas(3000);__C.ir('${e}');__C.anda(70)`);await cap(n);
}
// ajustes de verdad: tocar el botón cambia el valor guardado
const aj=await pg.evaluate(()=>{__C.ir('ajustes');__C.anda(40);__C.dibujarYa();const a=__C.Prog.aj.control;
  __C.tocar('control');const b=__C.Prog.aj.control;__C.tocar('control');return [a,b,__C.Prog.aj.control];});
console.log('AJUSTE CONTROL:',aj.join(' -> '));
// completabilidad: el bot juega dos niveles de cada zona, con las tres naves
const res=[];
for(const [nvl,nave] of [[1,'halcon'],[2,'brasa'],[3,'jade'],[4,'halcon'],[5,'brasa'],[6,'jade']]){
  res.push(await pg.evaluate(async([nvl,nave])=>{
    __C.borrar();__C.nave(nave);__C.nivel(nvl);__C.bot(true);
    let c=0;while(c<12000&&__C.estado()==='juego'){__C.anda(10);c+=10;}
    const R=__C.J.resumen||{};
    return nvl+':'+nave+'='+(R.gano?'GANA '+R.rango:'pierde')+'@'+c;
  },[nvl,nave]));
}
console.log('COMPLETABILIDAD:',res.join(' | '));
// los tres jefes en pelea
for(const nvl of [1,2,3]){
  await pg.evaluate(`__C.nivel(${nvl});__C.invencible(true);__C.bot(true);__C.jefeYa();let c=0;while(!(__C.mundo().jefe)&&c<900){__C.anda(10);c+=10;}__C.anda(260+600)`);
  const j=await pg.evaluate("__C.mundo().jefe");
  console.log('JEFE',nvl,JSON.stringify(j));
  await cap('06-jefe'+nvl);
}
await pg.evaluate("__C.nivel(2);__C.bot(true);__C.anda(700)");await cap('07-juego');
// rendimiento, con calentamiento
const med=await pg.evaluate(()=>{__C.nivel(3);__C.bot(true);__C.anda(600);
  for(let i=0;i<200;i++){__C.anda(1);__C.dibujarYa();}
  const t0=performance.now();for(let i=0;i<300;i++){__C.anda(1);__C.dibujarYa();}
  return {msPorCuadro:+((performance.now()-t0)/300).toFixed(3),...__C.medidas()};});
console.log('MEDIDAS:',JSON.stringify(med));
// fin de nivel ganado, con el sello del rango ya caído
await pg.evaluate("__C.nivel(1);__C.invencible(true);__C.jefeYa();let c=0;while(!(__C.mundo().jefe)&&c<900){__C.anda(10);c+=10;}__C.anda(260);__C.matarJefe();__C.anda(300)");
console.log('ESTADO TRAS EL JEFE:',await pg.evaluate("__C.estado()"));
await pg.evaluate("__C.anda(150)");await cap('08-fin');
// pausa por toque real
await pg.evaluate("__C.nivel(1);__C.anda(20);__C.dibujarYa()");
const pos=await pg.evaluate("__C.donde('pausa')");
await pg.touchscreen.tap(pos.x,pos.y);await pg.evaluate("__C.anda(4)");
console.log('TRAS TOCAR PAUSA:',await pg.evaluate("__C.estado()"));
await pg.evaluate("__C.anda(40)");await cap('09-pausa');
// el salto al hiperespacio
await pg.evaluate("__C.ir('portada');__C.anda(90);__C.dibujarYa();__C.tocar('jugar');__C.anda(60)");await cap('10-salto');
await pg.evaluate("__C.anda(40)");
console.log('TRAS EL SALTO:',await pg.evaluate("__C.estado()"));
console.log('ERRORES:',errores.length?errores.slice(0,8):'ninguno');
await nav.close();
