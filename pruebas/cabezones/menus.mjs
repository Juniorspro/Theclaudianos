// Recorre todas las pantallas de CABEZONES y saca capturas. Uso: node menus.mjs [vertical]
import { chromium } from 'playwright-core';
const vert=process.argv[2]==='vertical';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await nav.newContext({viewport:vert?{width:412,height:892}:{width:892,height:412},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const pg=await ctx.newPage();
const err=[];pg.on('pageerror',e=>err.push('PAGEERROR '+e.message));pg.on('console',m=>{if(m.type()==='error')err.push(m.text().slice(0,160));});
pg.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:'))err.push('RED '+u);});
await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Cabezones.html');
await pg.waitForFunction("window.__H&&__H.listo",null,{timeout:20000});
await pg.waitForFunction("__H.imgs().length>=33",null,{timeout:20000});
const pre=vert?'v-':'h-';
const cap=async n=>{await pg.evaluate("__H.dibujarYa()");await pg.screenshot({path:pre+n+'.png'});};
const toca=async id=>{const ok=await pg.evaluate(i=>{__H.dibujarYa();return __H.tocar(i);},id);if(!ok)err.push('SIN BOTON '+id);await pg.evaluate("__H.anda(40)");};
await pg.evaluate("__H.borrar();__H.ir('portada');__H.anda(150)");await cap('01-portada');
await toca('empezar');await cap('02-menu');
await toca('vestuario');await pg.evaluate("__H.anda(40)");await cap('03-vestuario');
await toca('t-chatarra');await pg.evaluate("__H.anda(40)");await cap('04-vestuario-bloq');
await toca('volver');await toca('torneos');await pg.evaluate("__H.anda(30)");await cap('05-torneos');
await toca('c0');await pg.evaluate("__H.anda(80)");await cap('06-llave');
await toca('jugar');await pg.evaluate("__H.anda(20)");await cap('07-vs');
await pg.evaluate("__H.anda(160)");await cap('08-partido');
// un partido entero con la IA manejando al jugador
const fin=await pg.evaluate(()=>{__H.iaYo(0.8);const o=[];for(let i=0;i<200*60&&__H.pant()==='partido';i++){__H.anda(1);if(i%600===0)o.push(JSON.stringify(__H.partido()));}return {pant:__H.pant(),o};});
console.log('PARTIDO', fin.pant, fin.o.slice(-2).join('\n'));
await pg.evaluate("__H.anda(60)");await cap('09-resultado');
const r=await pg.evaluate(()=>({res:__H.J.res&&__H.J.res.res,goles:__H.J.res&&__H.J.res.goles,torneo:JSON.stringify(__H.torneo()&&__H.torneo().vivos),mon:__H.prog().monedas}));
console.log('RESULTADO',JSON.stringify(r));
const bs=await pg.evaluate("__H.dibujarYa(),__H.botones()");console.log('BOTONES',bs.join(','));
await toca(bs.includes('llave')?'llave':'menu');await pg.evaluate("__H.anda(80)");await cap('10-despues');
await pg.evaluate("__H.ir('menu');__H.anda(40)");await toca('cofre');await pg.evaluate("__H.anda(30)");await cap('11-cofre');
for(let i=0;i<3;i++){await pg.evaluate("__H.dibujarYa();__H.tocar('golpe');__H.anda(12)");}
await pg.evaluate("__H.anda(80)");await cap('12-cofre-abierto');
await pg.evaluate("__H.ir('ajustes');__H.anda(40)");await cap('13-ajustes');
await pg.evaluate("__H.ir('menu');__H.anda(30);__H.dibujarYa();__H.tocar('jugar');__H.anda(260);__H.J.pausa=true;__H.anda(2)");await cap('14-pausa');
const med=await pg.evaluate("__H.medidas()");console.log('MEDIDAS',JSON.stringify(med));
console.log('ERRORES',err.length?err.join('\n'):'ninguno');
await nav.close();
