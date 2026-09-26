// Mide cuántos tiros entran: los tuyos contra el arquero rival, y los del rival contra tu arquero
// (quieto, o tirándose como lo haría un jugador atento). Uso: node equilibrio.mjs [dif]
import { chromium } from 'playwright-core';
import { usarCDN } from './cdn.mjs';
const dif=+(process.argv[2]||0.5);
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await nav.newContext({viewport:{width:412,height:892}});await usarCDN(ctx);
await ctx.addInitScript(()=>{try{localStorage.setItem('duelo.idioma','es');}catch(e){}});
const pg=await ctx.newPage();const err=[];pg.on('pageerror',e=>err.push(e.message));
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Duelo.html');
await pg.waitForFunction("window.__D&&__D.listo()",null,{timeout:90000});await pg.evaluate("__D.congelar(true)");
const r=await pg.evaluate((dif)=>{
  const out={mios:{},esquina:{},centro:{},curva:{},rivalQuieto:{},rivalAtento:{}};
  const sumar=(o,k)=>{o[k]=(o[k]||0)+1;};
  const hasta=(f,n)=>{let i=0;while(!f()&&i<(n||900)){__D.anda(1);i++;}};
  __D.jugar({dif:dif,turno:0});
  for(let k=0;k<60;k++){
    const P=()=>__D.partido();
    // forzar mi turno
    window.__D.reloj(80);
    hasta(()=>P().fase==='apunta'||P().fase==='carrera');
    if(P().fase==='apunta'){
      const tipo=k%3, tx=tipo===0?(Math.random()<0.5?-1:1)*(1.5+Math.random()*0.35):(Math.random()-0.5)*1.6, ty=tipo===0?1.3+Math.random()*0.5:0.3+Math.random()*1.2;
      const curva=k%4===0?(Math.random()<0.5?-0.3:0.3):0;
      __D.patear(tx,ty,0.85,curva);
      hasta(()=>P().res!==null,400);const res=P().res||'nada';sumar(out.mios,res);sumar(tipo===0?out.esquina:out.centro,res);if(curva)sumar(out.curva,res);
    } else {
      out.nr=(out.nr||0)+1;const atento=out.nr%2===0;
      hasta(()=>P().fase==='vuelo',400);
      if(atento){__D.anda(Math.round(0.25*60/0.45));__D.tirarseBien();}
      hasta(()=>P().res!==null,400);sumar(atento?out.rivalAtento:out.rivalQuieto,P().res||'nada');
    }
    hasta(()=>P().fase==='prep'||P().fase==='fin',900);
    if(P().fase==='fin')__D.jugar({dif:dif,turno:k%2});
  }
  return out;
},dif).catch(e=>({error:e.message}));
console.log('dif',dif,JSON.stringify(r),err.slice(0,3).join(' | '));
await nav.close();
