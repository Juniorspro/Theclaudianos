const {chromium}=require('/tmp/ui/node_modules/playwright');
const O=process.env.SALIDA||'/tmp/ui/mate/';
(async()=>{const [vw,vh,dpr,lang]=[+(process.argv[2]||412),+(process.argv[3]||892),+(process.argv[4]||2.625),process.argv[5]||'en'];
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:vw,height:vh},hasTouch:true,isMobile:true,deviceScaleFactor:dpr,locale:'es-AR'});
 const errs=[]; p.on('pageerror',e=>errs.push('PAGE '+e.message+' '+(e.stack||'').split('\n')[1]));
 await p.goto('file:///tmp/ui/mate_b.html'); await p.waitForTimeout(1500);
 await p.evaluate(l=>__M.idioma(l), lang);
 const pasos=[()=>{__M.J.modo='menu'; __M.UI.p='principal';}, ()=>{__M.UI.p='mapa'; __M.PROG.abierto=4; __M.PROG.niveles['1-1']={estrellas:3,record:7340}; __M.PROG.niveles['1-2']={estrellas:1,record:3900};}, ()=>{__M.UI.p='opciones'; __M.UI.desde='principal';},
   ()=>{ __M.jugar(1,false); __M.saltarCine(); }, ()=>{ __M.pausar(); }, ()=>{ __M.J.pausa=false; __M.J.puntos=8450; __M.J.tiros=20; __M.J.aciertos=17; __M.J.estilo={'¡AÉREO!':4,'¡A LA CABEZA!':2}; __M.resultado(); __M.UI.t=0; }, ()=>{ __M.muerte(); __M.UI.t=0; }];
 const esperas=[500,500,500,900,500,4200,1500];
 for(let i=0;i<pasos.length;i++){ await p.evaluate('('+pasos[i].toString()+')()'); await p.waitForTimeout(esperas[i]); await p.screenshot({path:O+'p'+i+'.png'}); }
 console.log(JSON.stringify(await p.evaluate(()=>__M.medida())), errs.slice(0,6)); await b.close(); })();
