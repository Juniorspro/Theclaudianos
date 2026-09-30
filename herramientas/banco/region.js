// node region.js img.png r,g,b tol x0 x1 y0 y1 paso -> por fila: minX maxX de los pixeles de ese color
// (con 'N' en vez de r,g,b: negros)
const fs=require('fs'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const [f,col,tol,x0,x1,y0,y1,paso]=process.argv.slice(2);
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await nav.newPage();
  const out=await pg.evaluate(async({S,col,tol,x0,x1,y0,y1,paso})=>{
    const im=await new Promise(r=>{const i=new Image(); i.onload=()=>r(i); i.src=S;});
    const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const g=c.getContext('2d'); g.drawImage(im,0,0);
    const D=g.getImageData(0,0,im.width,im.height).data, W=im.width;
    const K=col==='N'?null:col.split(',').map(Number);
    const es=(x,y)=>{ const i=(y*W+x)*4; if(D[i+3]<128) return false; if(!K) return D[i]<45&&D[i+1]<45&&D[i+2]<45; return Math.abs(D[i]-K[0])<=tol&&Math.abs(D[i+1]-K[1])<=tol&&Math.abs(D[i+2]-K[2])<=tol; };
    const L=[];
    for(let y=+y0;y<=+y1;y+=+paso){ const R=[]; let a=-1; for(let x=+x0;x<=+x1+1;x++){ const e=x<=+x1&&es(x,y); if(e&&a<0) a=x; if(!e&&a>=0){ if(x-a>=4) R.push([a,x-1]); a=-1; } } if(R.length){ const lo=Math.min(...R.map(r=>r[0])), hi=Math.max(...R.map(r=>r[1])); L.push(y+':'+lo+'-'+hi); } }
    return L.join(' ');
  },{S:'data:image/png;base64,'+fs.readFileSync(f).toString('base64'),col,tol:+tol,x0,x1,y0,y1,paso});
  console.log(out); await nav.close();
})();
