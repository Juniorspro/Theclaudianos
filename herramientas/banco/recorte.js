// node recorte.js x0 y0 w h escala out.png a.png b.png ... -> el mismo recorte de cada una, ampliado, lado a lado (con su nombre)
const fs=require('fs'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const a=process.argv.slice(2); const [x0,y0,w,h,k]=a.slice(0,5).map(Number); const out=a[5], L=a.slice(6);
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await nav.newPage();
  const b64=await pg.evaluate(async({L,x0,y0,w,h,k,nombres})=>{
    const ims=await Promise.all(L.map(s=>new Promise(r=>{const i=new Image(); i.onload=()=>r(i); i.src=s;})));
    const W=ims.length*(w*k+6), H=h*k;
    const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'); g.imageSmoothingEnabled=false; g.fillStyle='#f0f'; g.fillRect(0,0,W,H);
    ims.forEach((im,n)=>{ const x=n*(w*k+6); g.drawImage(im,x0,y0,w,h,x,0,w*k,h*k); g.fillStyle='#ff0'; g.font='14px monospace'; g.fillText(nombres[n],x+4,H-6); });
    return c.toDataURL('image/png').split(',')[1];
  },{L:L.map(f=>'data:image/png;base64,'+fs.readFileSync(f).toString('base64')),x0,y0,w,h,k,nombres:L.map(f=>f.split('/').pop().replace('.png',''))});
  fs.writeFileSync(out, Buffer.from(b64,'base64')); await nav.close();
})();
