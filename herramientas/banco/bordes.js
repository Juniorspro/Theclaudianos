// node bordes.js img.png h|v pos [desde hasta] -> tramos de color a lo largo de una fila (h) o columna (v)
// clases: N negro (<45), transparente '.', y el gris/color medio de cada tramo
const fs=require('fs'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const [f,dir,pos,a0,a1]=process.argv.slice(2);
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await nav.newPage();
  const out=await pg.evaluate(async({S,dir,pos,a0,a1})=>{
    const im=await new Promise(r=>{const i=new Image(); i.onload=()=>r(i); i.src=S;});
    const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const g=c.getContext('2d'); g.drawImage(im,0,0);
    const D=g.getImageData(0,0,im.width,im.height).data, W=im.width, H=im.height;
    const L=dir==='h'?W:H, i0=a0===undefined?0:+a0, i1=a1===undefined?L-1:+a1;
    const px=(t)=>{ const x=dir==='h'?t:+pos, y=dir==='h'?+pos:t, i=(y*W+x)*4; return [D[i],D[i+1],D[i+2],D[i+3]]; };
    const clase=(p)=>{ if(p[3]<128) return '.'; if(p[0]<45&&p[1]<45&&p[2]<45) return 'N'; const q=(v)=>Math.round(v/12)*12; return q(p[0])+','+q(p[1])+','+q(p[2]); };
    const runs=[]; let cur=null;
    for(let t=i0;t<=i1;t++){ const k=clase(px(t)); if(!cur||cur.k!==k){ if(cur) runs.push(cur); cur={k,a:t,b:t}; } else cur.b=t; }
    runs.push(cur);
    return runs.filter(r=>r.b-r.a>=1).map(r=>`${r.a}-${r.b}(${r.b-r.a+1}) ${r.k}`).join('\n');
  },{S:'data:image/png;base64,'+fs.readFileSync(f).toString('base64'),dir,pos,a0,a1});
  console.log(out); await nav.close();
})();
