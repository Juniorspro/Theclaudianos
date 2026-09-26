// Abre una página de herramienta en Chromium headless: archivos locales servidos en http://local/ (raíz = la carpeta
// de arriba: videos, pose/, clips/, GLB de Meshy; /repo/ = el repo) y la CDN por curl. La página guarda resultados con
// window.guardar(nombre, texto|base64, esB64). Vive en <scratchpad>/mocap/herr/ con node_modules de playwright-core
// al lado: copiar herramientas/duelo/modelos/mocap/* ahí antes de usar.
// Uso: node correr.mjs pagina.html '{"arg":1}'
import { chromium } from 'playwright-core';
import { execFile } from 'child_process';
import fs from 'fs'; import path from 'path';
const RAIZ=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const REPO='/home/user/Theclaudianos';
const cache=new Map();
const bajar=u=>{if(!cache.has(u))cache.set(u,new Promise((ok,mal)=>execFile('curl',['-sSfL',u],{encoding:'buffer',maxBuffer:256<<20},(e,o)=>e?mal(e):ok(o))));return cache.get(u);};
const tipo=u=>{const e=path.extname(u.split('?')[0]).toLowerCase();return {'.js':'application/javascript','.mjs':'application/javascript','.wasm':'application/wasm','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json','.html':'text/html','.task':'application/octet-stream','.bin':'application/octet-stream'}[e]||'application/octet-stream';};
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--js-flags=--max-old-space-size=4096']});
const ctx=await nav.newContext({viewport:{width:800,height:800}});
for(const pat of ['https://cdn.jsdelivr.net/**','https://storage.googleapis.com/**'])
  await ctx.route(pat,async r=>{const u=r.request().url();try{await r.fulfill({status:200,body:await bajar(u),headers:{'content-type':tipo(u),'access-control-allow-origin':'*'}});}catch(e){await r.fulfill({status:502,body:'curl'});}});
await ctx.route('http://local/**',async r=>{let p=decodeURIComponent(new URL(r.request().url()).pathname);
  const f=p.startsWith('/repo/')?path.join(REPO,p.slice(6)):path.join(RAIZ,p);
  if(!fs.existsSync(f)){await r.fulfill({status:404,body:'no'});return;}
  await r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':tipo(f),'access-control-allow-origin':'*'}});});
const pg=await ctx.newPage();
pg.on('console',m=>console.log('[pag]',m.text()));pg.on('pageerror',async e=>{console.log('[ERR]',e.message,e.stack||'');await nav.close();process.exit(1);});
await pg.exposeFunction('guardar',(n,t,b64)=>{const f=path.join(RAIZ,n);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b64?Buffer.from(t,'base64'):t);return f;});
const args=process.argv[3]||'{}';
await pg.goto('http://local/herr/'+process.argv[2]+'#'+encodeURIComponent(args));
await pg.waitForFunction('window.LISTO===true',null,{timeout:0});
await nav.close();
