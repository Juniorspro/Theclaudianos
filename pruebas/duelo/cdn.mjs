// Para el banco en el contenedor: el Chromium headless no confía en el certificado del proxy de
// salida, así que los pedidos a jsDelivr (three.js) se bajan con curl, que verifica con el CA del
// entorno, y se le entregan a la página. En un teléfono no hace falta.
import { execFile } from 'child_process';
const cache=new Map();
function bajar(url){
  if(!cache.has(url))cache.set(url,new Promise((ok,mal)=>execFile('curl',['-sSfL',url],{encoding:'buffer',maxBuffer:64<<20},(e,out)=>e?mal(e):ok(out))));
  return cache.get(url);
}
export async function usarCDN(ctx){
  await ctx.route('https://cdn.jsdelivr.net/**',async route=>{
    const u=route.request().url();
    try{const body=await bajar(u);
      const tipo=u.endsWith('.js')?'application/javascript':u.endsWith('.avif')?'image/avif':u.endsWith('.webp')?'image/webp':u.endsWith('.mp3')?'audio/mpeg':'application/octet-stream';
      await route.fulfill({status:200,body,headers:{'content-type':tipo,'access-control-allow-origin':'*'}});
    }catch(e){await route.fulfill({status:502,body:'curl falló'});}
  });
}
