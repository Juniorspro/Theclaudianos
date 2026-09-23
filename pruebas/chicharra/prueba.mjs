import { chromium } from 'playwright-core';
const JUEGO='file:///home/user/Theclaudianos/juegos-pc/Chicharra.html';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const nav=await chromium.launch({executablePath:EXE,args:['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--disable-dev-shm-usage']});
const ctx=await nav.newContext({viewport:{width:412,height:892},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const pg=await ctx.newPage();
const errores=[];
pg.on('console',m=>{if(m.type()==='error')errores.push(m.text());});
pg.on('pageerror',e=>errores.push('PAGEERROR: '+e.message));
pg.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:'))errores.push('RED: '+u);});
await pg.goto(JUEGO);
await pg.waitForFunction("window.__C && window.__C.listo",null,{timeout:15000});
const cap=async n=>pg.screenshot({path:'cap-'+n+'.png'});

await pg.evaluate("__C.anda(120)");
await cap('1-portada');

// completabilidad: el bot juega niveles enteros, hasta matar al jefe
const res=[];
for(const nv of [1,2,3,4,6,8]){
  const r=await pg.evaluate(async(nv)=>{
    __C.borrar();__C.nivel(nv);__C.bot(true);
    let cuadros=0;
    while(cuadros<10000 && __C.estado()==='juego'){__C.anda(10);cuadros+=10;}
    const m=__C.mundo();
    return {nivel:nv,cuadros,estado:__C.estado(),
      gano:__C.J.resumen?__C.J.resumen.gano:null,
      puntos:m?m.puntos:0,vidas:m?m.vidas:null,rango:__C.J.resumen?__C.J.resumen.rango:null};
  },nv);
  res.push(r);
}
console.log('COMPLETABILIDAD:',JSON.stringify(res,null,0));

// capturas de juego y jefe
await pg.evaluate("__C.nivel(2);__C.bot(true);__C.anda(420)");
await cap('2-juego');
await pg.evaluate("__C.anda(600)");
await cap('3-juego2');
await pg.evaluate("__C.invencible(true);__C.jefeYa();__C.anda(260)");
console.log('jefe:',JSON.stringify((await pg.evaluate("__C.mundo()")).jefe));
await cap('4-jefe');
await pg.evaluate("__C.anda(900)");
const j2=(await pg.evaluate("__C.mundo()"));
console.log('jefe luego:',JSON.stringify(j2&&j2.jefe));
await cap('5-jefe2');

// rendimiento, con calentamiento
const med=await pg.evaluate(()=>{
  __C.bot(true);
  for(let i=0;i<200;i++){__C.anda(1);__C.dibujarYa();}
  const t0=performance.now();
  for(let i=0;i<300;i++){__C.anda(1);__C.dibujarYa();}
  return {msPorCuadro:+((performance.now()-t0)/300).toFixed(3), ...__C.medidas()};
});
console.log('MEDIDAS:',JSON.stringify(med));
// la sonda de partículas no puede decir siempre 0: se comprueba con una explosión
const fx=await pg.evaluate(()=>{__C.nivel(1);__C.bot(true);__C.anda(300);
  const a=__C.medidas().part;__C.anda(60);return {part:a,part2:__C.medidas().part};});
console.log('PARTICULAS:',JSON.stringify(fx));

// tienda: comprar de verdad tocando el botón
const t1=await pg.evaluate(()=>{
  __C.monedas(99999);__C.J.estado='tienda';__C.dibujarYa();
  const antes=__C.Prog.mej.poder||0;
  __C.tocar('comprar:poder');__C.dibujarYa();
  return {antes,despues:__C.Prog.mej.poder||0,monedas:__C.Prog.monedas};
});
console.log('TIENDA:',JSON.stringify(t1));
await cap('6-tienda');

// fin de nivel
await pg.evaluate("__C.nivel(2);__C.invencible(true);__C.jefeYa();__C.anda(150);__C.matarJefe();__C.anda(400)");
console.log('estado tras matar al jefe:',await pg.evaluate("__C.estado()"),
  JSON.stringify(await pg.evaluate("__C.J.resumen")));
await cap('7-fin');

// pausa y portada por toque real
await pg.evaluate("__C.nivel(1);__C.anda(30)");
await pg.evaluate('__C.dibujarYa()');const pos=await pg.evaluate("__C.donde('pausa')");
await pg.touchscreen.tap(pos.x,pos.y);
await pg.evaluate("__C.anda(6)");
console.log('tras tocar pausa:',await pg.evaluate("__C.estado()"));
await cap('8-pausa');

console.log('ERRORES:',errores.length?errores.slice(0,6):'ninguno');
await nav.close();
// cartel de nivel
await pg.evaluate("__C.nivel(3);__C.anda(20);__C.dibujarYa()");
await pg.screenshot({path:'cap-12-cartel.png'});
