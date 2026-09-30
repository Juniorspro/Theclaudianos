// node calza.js nuestro.png hoja.png salida.png [recorte x0 y0 x1 y1 en fracciones de la hoja]
// Calza la cabeza de 'nuestro' sobre la de la hoja (ancho maximo en el 60% de arriba y coronilla) y
// saca: nuestro calzado | hoja | mezcla 50%. Imprime la escala y el desplazamiento.
const fs=require('fs'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const a=process.argv.slice(2); const [A,Bf,O]=a; const rc=a.length>=7?a.slice(3,7).map(Number):[0,0,1,1];
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
  const pg=await nav.newPage();
  const r=await pg.evaluate(async({A,B,rc,KF})=>{
    const load=(s)=>new Promise(r=>{const i=new Image(); i.onload=()=>r(i); i.src=s;});
    const ia=await load(A), ib=await load(B);
    const datos=(im)=>{ const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const g=c.getContext('2d'); g.drawImage(im,0,0); return g.getImageData(0,0,im.width,im.height); };
    const caja=(d)=>{
      const W=d.width,H=d.height,D=d.data, osc=(x,y)=>{const i=(y*W+x)*4; return D[i+3]>128&&D[i]<50&&D[i+1]<50&&D[i+2]<50;};
      let top=-1; for(let y=0;y<H&&top<0;y++) for(let x=0;x<W;x++) if(osc(x,y)){top=y;break;}
      // elipse por el 25% de arriba (ahi no hay anteojos): w^2 = 2*al*b*d - al*d^2, al = 4a^2/b^2
      const filas=[]; for(let y=top;y<H;y++){ let l=-1,rr=-1; for(let x=0;x<W;x++) if(osc(x,y)){ if(l<0) l=x; rr=x; } filas.push([y-top,l,rr]); }
      let b=H*0.5, a=0, cx=0;
      for(let pass=0;pass<4;pass++){
        let s11=0,s12=0,s22=0,t1=0,t2=0,sc=0,n=0;
        for(const [d,l,rr] of filas){ if(d<3||d>0.5*b*0.5*2*0.5*2*0.25*2) {} if(d<3||d>0.25*2*b) continue; if(l<0) continue; const w=rr-l, x1=d, x2=-d*d, yv=w*w; s11+=x1*x1; s12+=x1*x2; s22+=x2*x2; t1+=x1*yv; t2+=x2*yv; sc+=(l+rr)/2; n++; }
        const det=s11*s22-s12*s12, c1=(t1*s22-t2*s12)/det, c2=(s11*t2-s12*t1)/det; b=c1/(2*c2); a=Math.sqrt(c2)*b/2; cx=sc/n;
      }
      return {top,b,a,cx};
    };
    const da=datos(ia), db=datos(ib), ca=caja(da), cb=caja(db);
    const k=KF||cb.b/ca.b, dx=cb.cx-ca.cx*k, dy=cb.top-ca.top*k;
    const W=ib.width,H=ib.height, x0=Math.round(rc[0]*W), y0=Math.round(rc[1]*H), w=Math.round((rc[2]-rc[0])*W), h=Math.round((rc[3]-rc[1])*H);
    const cv=document.createElement('canvas'); cv.width=w*3+12; cv.height=h; const g=cv.getContext('2d'); g.fillStyle='#8a8a8a'; g.fillRect(0,0,cv.width,cv.height);
    g.save(); g.beginPath(); g.rect(0,0,w,h); g.clip(); g.setTransform(k,0,0,k,dx-x0,dy-y0); g.drawImage(ia,0,0); g.restore();
    g.drawImage(ib,x0,y0,w,h,w+6,0,w,h);
    g.save(); g.beginPath(); g.rect(2*w+12,0,w,h); g.clip(); g.drawImage(ib,x0,y0,w,h,2*w+12,0,w,h); g.globalAlpha=0.5; g.setTransform(k,0,0,k,dx-x0+2*w+12,dy-y0); g.drawImage(ia,0,0); g.restore();
    return {png:cv.toDataURL('image/png'), k, dx, dy, ca, cb};
  },{A:'data:image/png;base64,'+fs.readFileSync(A).toString('base64'),B:'data:image/png;base64,'+fs.readFileSync(Bf).toString('base64'),rc,KF:+(process.env.K||0)});
  fs.writeFileSync(O,Buffer.from(r.png.split(',')[1],'base64'));
  console.log('escala',r.k.toFixed(4),'dx',r.dx.toFixed(1),'dy',r.dy.toFixed(1),'nuestro',JSON.stringify(r.ca),'hoja',JSON.stringify(r.cb));
  await nav.close();
})();
