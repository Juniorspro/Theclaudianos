const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=swiftshader']});
 for(const L of ['en','pt']){
 const ctx=await b.newContext({viewport:{width:892,height:412}}); const pg=await ctx.newPage(); const err=[]; pg.on('pageerror',e=>err.push(e.message));
 await pg.addInitScript(()=>{ window.__TXT=new Set(); const o=CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText=function(t,...r){ window.__TXT.add(String(t)); return o.call(this,t,...r); }; });
 await pg.goto('file:///home/user/Theclaudianos/juegos-pc/Alas.html'); await pg.waitForFunction('window.__V && window.__V.listo',{timeout:90000});
 await pg.evaluate(L=>{ document.querySelector('#idiomas [data-l="'+L+'"]').click(); },L); await pg.waitForTimeout(500);
 const textos=new Set();
 const junta=async()=>{ for(const t of await pg.evaluate(()=>[...document.querySelectorAll('.capa.ver, #mandos.ver')].map(c=>c.innerText).join('\n').split('\n'))) if(t.trim()) textos.add(t.trim()); };
 for(const c of ['capaTitulo','capaMisiones','capaComo','capaAjustes']){ await pg.evaluate(c=>{ if(c==='capaMisiones') __V.armarMisiones(); __V.mostrar(c); },c); await pg.waitForTimeout(700); await junta(); }
 await pg.evaluate(()=>__V.entrarHangar()); await pg.waitForTimeout(700); await junta();
 for(const mi of [0,2,3,4]){ await pg.evaluate(mi=>{ __V.aMenu(); __V.iniciar(mi,'UNO'); __V.dios(true); for(let k=0;k<8;k++){ __V.anda(120); __V.dibujarYa(); } },mi); await pg.waitForTimeout(300); await junta(); }
 await pg.evaluate(()=>{ __V.J.fin=null; terminar(true); for(let i=0;i<300;i++) pasar(); }); await pg.waitForTimeout(3500); await junta();
 const canv=await pg.evaluate(()=>[...window.__TXT]);
 const ES=/\b(DE|DEL|LOS|LAS|MISIÓN|MISIONES|VOLVER|AJUSTES|SONIDO|OLEADA|DERRIBA\w*|ENEMIGO\w*|ELEGIR|MEJORA\w*|VELOCIDAD|BLINDAJE|CAÑÓN|BENGALAS?|FRENO|FIJADO|DESPEGAR|HANGAR\b(?!)|PAUSA|SEGUIR|SALIR|CUMPLIDA|FALLIDA|ALTURA|CÓMO|GRÁFICOS|DINERO|RECOMPENSA|BLOQUEADA|CUMPL\w+|DEFENDÉ|HUNDÍ|DESTRUCTORES|PORTAAVIONES|AVIÓN|TORMENTA|ALCANCE|PULLÁ|SUBÍ|ALERTA|TENÉS|COLA)\b/i;
 const malos=[...textos,...canv].filter(t=>ES.test(t) && !/^(ALAS|EL AS)$/.test(t));
 console.log(L, 'textos', textos.size, 'canvas', canv.length, 'RESTOS:', JSON.stringify(malos.slice(0,40)), 'err', JSON.stringify(err));
 await ctx.close(); }
 await b.close(); })();
