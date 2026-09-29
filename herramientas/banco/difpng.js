#!/usr/bin/env node
/* DIFERENCIA ENTRE DOS PNG del mismo tamaño (con tinta y sin tinta, antes y despues): rojo donde el
   primero es mas oscuro (tinta de mas), verde donde es mas claro; el resto, apagado.
     node herramientas/banco/difpng.js a.png b.png salida.png */
const fs=require('fs'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const [a,b,o]=process.argv.slice(2);
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await nav.newPage();
  const r=await pg.evaluate(async({A,B})=>{
    const load=(s)=>new Promise(r=>{const i=new Image(); i.onload=()=>r(i); i.src=s;});
    const ia=await load(A), ib=await load(B), W=ia.width, H=ia.height;
    const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
    g.drawImage(ia,0,0); const da=g.getImageData(0,0,W,H).data;
    g.drawImage(ib,0,0); const db=g.getImageData(0,0,W,H).data;
    const out=g.createImageData(W,H); let n=0;
    for(let i=0;i<W*H*4;i+=4){
      const sa=da[i]+da[i+1]+da[i+2], sb=db[i]+db[i+1]+db[i+2];
      if(sa===sb){ out.data[i]=da[i]/3; out.data[i+1]=da[i+1]/3; out.data[i+2]=da[i+2]/3; }
      else if(sa<sb){ out.data[i]=255; n++; } else { out.data[i+1]=255; }
      out.data[i+3]=255;
    }
    g.putImageData(out,0,0); return {png:c.toDataURL('image/png'), n};
  },{A:'data:image/png;base64,'+fs.readFileSync(a).toString('base64'),B:'data:image/png;base64,'+fs.readFileSync(b).toString('base64')});
  fs.writeFileSync(o,Buffer.from(r.png.split(',')[1],'base64')); console.log('pixeles con tinta de mas:',r.n); await nav.close();
})();
