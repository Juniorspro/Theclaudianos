#!/usr/bin/env node
/* ZOOM DE LA ROPA DE LA CABEZA: cada prenda puesta en un grunt quieto, desde varias vistas, con la
   cabeza recortada y ampliada (render a 1000 px, DPR 2 como el celular). Para mirar de cerca trazos,
   siluetas y deformaciones; con modo 'sin' esconde toda la tinta (para compararla con difpng.js).

     node herramientas/banco/zoom_prendas.js ids cat prefijo "az:el,..." [x0 y0 x1 y1] [D] [modo] [y0]
       ids   lista separada por comas ('-' = sin prenda); cat: hat | mask | mouth
       vistas por defecto 0:10,35:10,70:10,110:10,160:10,-60:30; recorte en fracciones del cuadro
     TW=600 (ancho de cada vista en la hoja); S=1000 (lado del render, antes de recortar); FOV=30 (con 10 y D x3, casi sin perspectiva, como la hoja);
     SINMANOS=1 esconde las manos (para mirar el torso); CANVAS=1 dibuja al canvas del juego y no a una textura: los cristales translucidos se mezclan como en
     la pantalla (en una textura sRGB la mezcla es lineal y salen mas claros) */
const fs=require('fs'); let pw; try{pw=require('playwright')}catch(e){pw=require('/opt/node22/lib/node_modules/playwright')}
(async()=>{
  const a=process.argv; const ids=a[2].split(','), cat=a[3], pre=a[4];
  const vistas=(a[5]||'0:10,35:10,70:10,110:10,160:10,-60:30').split(',').map(s=>s.split(':').map(Number));
  const R=a[6]?[+a[6],+a[7],+a[8],+a[9]]:[0.15,0.10,0.85,0.90]; const D=+(a[10]||2.3); const modo=a[11]||''; const Y0=+(a[12]||1.33); const TW0=+(process.env.TW||600); const S0=+(process.env.S||1000); const FOV0=+(process.env.FOV||30); const CV0=!!process.env.CANVAS; const SM0=!!process.env.SINMANOS;
  const nav=await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const pg=await nav.newPage({viewport:{width:412,height:892},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  pg.on('pageerror',e=>console.log('ERR',e.message));
  pg.on('console',m=>{ if(m.type()==='error') console.log('CERR',m.text().slice(0,200)); });
  await pg.goto('file://'+process.cwd()+'/juegos-pc/ArenaNevada.html',{waitUntil:'load'});
  await pg.waitForFunction('window.Game && Game.ren && window.Prendas');
  await pg.evaluate(()=>{ __ir('nueva'); });
  await pg.waitForFunction('Game.enMarcha && Game.tiempo > 0.5',null,{polling:250});
  if(process.env.PRE) await pg.evaluate(process.env.PRE);   // PRE: codigo a correr en la pagina antes de vestir (depurar)
  for(const id of ids){
    const out=await pg.evaluate(async({id,cat,vistas,R,D,modo,Y0,TW0,S0,FOV0,CV0,SM0})=>{
      Game.pausa=true; const at={}; if(id!=='-') at[cat]=id;
      const t=Actor.crear({tipo:Chars.vestido('grunt',at),arma:'puños',x:0,z:0,mirando:1}); t.sinTope=true; t.guion=true; t.rumbo=t.rumboObj=Math.PI/2;
      for(let i=0;i<40;i++) Actor.actualizar(t,1/60,i/60);
      const esc=new THREE.Scene(); esc.add(t.grupo);
      // SINMANOS=1: sin manos (tapan el pecho): sus huesos a escala casi nula, color y tinta
      if(SM0 && t.cuerpo && t.cuerpo.piel){ const bs=t.cuerpo.piel.skeleton.bones; for(const i of Chars.MANOS_I.concat(Chars.MANOS_D)) if(bs[i]) bs[i].scale.setScalar(1e-4); }
      if(modo){ t.grupo.traverse(o=>{ if(o.isMesh && o.material && o.material.side===THREE.BackSide) o.visible=false; }); }
      const S=S0, ren=Game.ren, rt=new THREE.WebGLRenderTarget(S,S,{depthBuffer:true,colorSpace:THREE.SRGBColorSpace});
      const y0=Y0, TW=TW0;
      const w=(R[2]-R[0])*S, h=(R[3]-R[1])*S, k=TW/w, TH=Math.round(h*k);
      const cols=Math.ceil(vistas.length/2), filas=vistas.length>cols?2:1;
      const c2=document.createElement('canvas'); c2.width=TW*cols; c2.height=TH*filas; const g2=c2.getContext('2d'); g2.imageSmoothingEnabled=false;
      const c1=document.createElement('canvas'); c1.width=S; c1.height=S; const g1=c1.getContext('2d');
      for(const [n,[az,el]] of vistas.entries()){
        const A=az*Math.PI/180,E=el*Math.PI/180,cam=new THREE.PerspectiveCamera(FOV0,1,0.05,60);
        cam.position.set(Math.sin(A)*Math.cos(E)*D,y0+Math.sin(E)*D,Math.cos(A)*Math.cos(E)*D); cam.lookAt(0,y0,0);
        if(CV0){
          // al canvas: se lee con toDataURL en la misma tarea, antes de que se borre
          const tam=new THREE.Vector2(); ren.getSize(tam); const pr=ren.getPixelRatio(); ren.setPixelRatio(1); ren.setSize(S,S,false);
          ren.setRenderTarget(null); ren.setClearColor(0x8a8a8a,1); ren.clear(true,true,false); ren.render(esc,cam);
          const url=ren.domElement.toDataURL('image/png'); ren.setPixelRatio(pr); ren.setSize(tam.x,tam.y,false);
          const im0=new Image(); await new Promise(r=>{im0.onload=r; im0.src=url;}); g1.drawImage(im0,0,0);
        } else {
          ren.setRenderTarget(rt); ren.setClearColor(0x8a8a8a,1); ren.clear(true,true,false); ren.render(esc,cam);
          const buf=new Uint8Array(S*S*4); ren.readRenderTargetPixels(rt,0,0,S,S,buf);
          const img=g1.createImageData(S,S);
          for(let y=0;y<S;y++) img.data.set(buf.subarray((S-1-y)*S*4,(S-y)*S*4),y*S*4); g1.putImageData(img,0,0);
        }
        const cx=(n%cols)*TW, cy=Math.floor(n/cols)*TH;
        g2.drawImage(c1,R[0]*S,R[1]*S,w,h,cx,cy,TW,TH);
        g2.fillStyle='#ff0'; g2.font='16px monospace'; g2.fillText(az+'/'+el,cx+6,cy+18);
        g2.strokeStyle='#333'; g2.strokeRect(cx+0.5,cy+0.5,TW-1,TH-1);
      }
      ren.setRenderTarget(null); rt.dispose(); esc.remove(t.grupo);
      return c2.toDataURL('image/png');
    },{id,cat,vistas,R,D,modo,Y0,TW0,S0,FOV0,CV0,SM0});
    const f=pre+'_'+id+'.png'; fs.writeFileSync(f, Buffer.from(out.split(',')[1],'base64')); console.log(f);
  }
  await nav.close();
})();
