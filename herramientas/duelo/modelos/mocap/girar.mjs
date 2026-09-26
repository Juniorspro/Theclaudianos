// Gira la malla para que mire a +Z (norma glTF) horneando la rotación en POSITION/NORMAL. Uso: node girar.mjs entrada.glb salida.glb grados
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
const [,,ent,sal,gr]=process.argv;const t=(+gr)*Math.PI/180, c=Math.cos(t), s=Math.sin(t);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);const d=await io.read(ent);
const hechos=new Set();
for(const m of d.getRoot().listMeshes())for(const p of m.listPrimitives())for(const sem of ['POSITION','NORMAL']){
  const a=p.getAttribute(sem);if(!a||hechos.has(a))continue;hechos.add(a);
  const v=a.getArray();for(let i=0;i<v.length;i+=3){const x=v[i],z=v[i+2];v[i]=c*x+s*z;v[i+2]=-s*x+c*z;}a.setArray(v);
}
for(const n of d.getRoot().listNodes())if(n.getMesh())console.log('nodo malla',n.getName(),n.getTranslation(),n.getRotation(),n.getScale());
await io.write(sal,d);console.log('ok',sal);
