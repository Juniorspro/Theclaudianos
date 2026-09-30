// node pix.js img.png x,y x,y ... -> el color de cada punto
const fs=require('fs'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const [img,...pts]=process.argv.slice(2);
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await nav.newPage();
  const r=await pg.evaluate(async({A,P})=>{
    const i=await new Promise(r=>{const im=new Image(); im.onload=()=>r(im); im.src=A;});
    const c=document.createElement('canvas'); c.width=i.width; c.height=i.height; const g=c.getContext('2d'); g.drawImage(i,0,0);
    return P.map(p=>{const [x,y]=p.split(',').map(Number); const d=g.getImageData(x,y,1,1).data; return p+': '+d[0]+','+d[1]+','+d[2];});
  },{A:'data:image/png;base64,'+fs.readFileSync(img).toString('base64'),P:pts});
  console.log(r.join('\n')); await nav.close();
})();
