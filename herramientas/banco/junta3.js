// node junta3.js a.png b.png c.png out.png -> las tres lado a lado
const fs=require('fs'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const a=process.argv.slice(2), out=a.pop();
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await nav.newPage();
  const b64=await pg.evaluate(async(L)=>{
    const ims=await Promise.all(L.map(s=>new Promise(r=>{const i=new Image(); i.onload=()=>r(i); i.src=s;})));
    const W=ims.reduce((s,i)=>s+i.width+6,0), H=Math.max(...ims.map(i=>i.height));
    const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'); g.fillStyle='#f0f';g.fillRect(0,0,W,H);
    let x=0; for(const i of ims){ g.drawImage(i,x,0); x+=i.width+6; }
    return c.toDataURL('image/png').split(',')[1];
  }, a.map(f=>'data:image/png;base64,'+fs.readFileSync(f).toString('base64')));
  fs.writeFileSync(out, Buffer.from(b64,'base64')); await nav.close();
})();
