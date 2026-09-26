// Hornea en un GLB los clips retargeteados (JSON: pistas locales por hueso + posición local de la cadera) y
// devuelve aparte el «viaje» horizontal de la cadera de los clips que se desplazan (estiradas, levantarse,
// atrapar), que se le saca a la pista para que el juego lo maneje (y lo escale hasta la pelota).
// Uso: node hornear_clips.mjs base.glb carpeta_clips salida.glb viajes.json
// (necesita @gltf-transform/core, /extensions, /functions y sharp)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { resample, prune, dedup, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'fs'; import path from 'path';
const [basePath,carpeta,sal,salViajes]=process.argv.slice(2);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(basePath), R=doc.getRoot(), buf=R.listBuffers()[0];
R.listAnimations().forEach(a=>a.dispose());
const nodos=new Map(R.listNodes().map(n=>[n.getName(),n]));
const hips=nodos.get('Hips'), rest=hips.getTranslation();
// qué clips viajan (el viaje sale de la pista) y cuáles se centran (se les saca el promedio horizontal)
const VIAJAN=/^(estirada_|vuelo_|atrapa|levantarse)/;
const CENTRAR=/^(quieto|parado|listo|carrera|sprint|caminar|arquero_)/;
const viajes={};
for(const f of fs.readdirSync(carpeta).filter(f=>f.endsWith('.json')).sort()){
  const c=JSON.parse(fs.readFileSync(path.join(carpeta,f),'utf8'));const nom=f.replace('.json','');
  const n=c.n, fps=c.fps, t=new Float32Array(n);for(let i=0;i<n;i++)t[i]=i/fps;
  const a=doc.createAnimation(nom);
  const inp=doc.createAccessor().setType('SCALAR').setArray(t).setBuffer(buf);
  for(const [hueso,arr] of Object.entries(c.pistas)){
    const nodo=nodos.get(hueso);if(!nodo)continue;
    // pistas constantes (huesos auxiliares): se omiten
    let var_=0;for(let i=4;i<arr.length;i++)var_=Math.max(var_,Math.abs(arr[i]-arr[i%4]));
    if(var_<1e-4&&hueso!=='Hips')continue;
    // continuidad del cuaternión (evita el salto de signo al interpolar)
    const q=Float32Array.from(arr);for(let i=4;i<q.length;i+=4){const d=q[i]*q[i-4]+q[i+1]*q[i-3]+q[i+2]*q[i-2]+q[i+3]*q[i-1];if(d<0)for(let k=0;k<4;k++)q[i+k]=-q[i+k];}
    const out=doc.createAccessor().setType('VEC4').setArray(q).setBuffer(buf);
    const s=doc.createAnimationSampler().setInput(inp).setOutput(out).setInterpolation('LINEAR');
    a.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nodo).setTargetPath('rotation').setSampler(s));
  }
  // cadera
  const p=Float32Array.from(c.pos);
  if(VIAJAN.test(nom)){
    // viaje = desplazamiento horizontal respecto del primer cuadro (en metros, en el marco del modelo: x izquierda, z adelante)
    const esc=hips.getParentNode?1:1;
    const v=[];
    if(/^(estirada_|vuelo_)/.test(nom)){for(let i=0;i<n;i++)v.push([+c.raiz[i][0].toFixed(4),0]);
      /* el video del «vuelo» tenía la cámara siguiendo al arquero: no hay viaje medido; se pone uno suave
         (paso lateral y salto: 1,3 m entre el 18 % y el 62 % del clip) */
      if(v.every(q=>Math.abs(q[0])<1e-3)){const D=/izq/.test(nom)?1.3:-1.3;
        for(let i=0;i<n;i++){const u=Math.min(1,Math.max(0,(i/(n-1)-0.18)/0.44));v[i][0]=+(D*u*u*(3-2*u)).toFixed(4);}}}
    else{for(let i=0;i<n;i++)v.push([+c.raiz[i][0].toFixed(4)-c.raiz[0][0],+(c.raiz[i][2]-c.raiz[0][2]).toFixed(4)]);
      for(let i=0;i<n;i++){p[i*3]=rest[0]+(p[i*3]-p[0]);p[i*3+2]=rest[2]+(p[i*3+2]-p[2]);}
      // lo que se va en viaje sale de la pista (en unidades locales de la cadera)
      const k=(p[3*(n-1)]-p[0])/(v[n-1][0]||1e-9);
      for(let i=0;i<n;i++){p[i*3]=rest[0];p[i*3+2]=rest[2];}
    }
    viajes[nom]={fps,x:v.map(q=>q[0]),z:v.map(q=>q[1])};
  } else if(CENTRAR.test(nom)){
    let mx=0,mz=0;for(let i=0;i<n;i++){mx+=p[i*3];mz+=p[i*3+2];}mx/=n;mz/=n;
    for(let i=0;i<n;i++){p[i*3]+=rest[0]-mx;p[i*3+2]+=rest[2]-mz;}
  }
  const outP=doc.createAccessor().setType('VEC3').setArray(p).setBuffer(buf);
  const sP=doc.createAnimationSampler().setInput(inp).setOutput(outP).setInterpolation('LINEAR');
  a.addSampler(sP).addChannel(doc.createAnimationChannel().setTargetNode(hips).setTargetPath('translation').setSampler(sP));
}
for(const m of R.listMaterials()){m.setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(0.72);m.setEmissiveTexture(null).setEmissiveFactor([0,0,0]);}
await doc.transform(resample({tolerance:2e-4}),dedup(),prune(),
  textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:84}));
await io.write(sal,doc);
fs.writeFileSync(salViajes,JSON.stringify(viajes));
console.log('listo',sal,fs.statSync(sal).size,'bytes;',R.listAnimations().length,'clips; viajes',Object.keys(viajes).join(','));
