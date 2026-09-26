// Junta en un solo GLB el modelo con esqueleto de Rezona y las animaciones que llegaron en archivos
// separados (Rezona devuelve UNA animación por pedido de esqueleto; los esqueletos son idénticos,
// así que los clips se enganchan por nombre de hueso). Achica texturas a WebP y limpia claves.
// Uso: node juntar.mjs salida.glb base.glb nombre:otro.glb [nombre:otro.glb ...]
// (necesita @gltf-transform/core, /extensions, /functions y sharp)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { resample, prune, dedup, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [sal,basePath,...otros]=process.argv.slice(2);
const doc=await io.read(basePath), R=doc.getRoot(), buf=R.listBuffers()[0];
const nodos=new Map(R.listNodes().map(n=>[n.getName(),n]));
R.listAnimations().forEach(a=>a.setName(a.getName()||'idle'));
for(const par of otros){
  const [nom,ruta]=par.split(':');const d2=await io.read(ruta);
  for(const a2 of d2.getRoot().listAnimations()){
    const a=doc.createAnimation(nom);
    for(const ch of a2.listChannels()){
      const destino=nodos.get(ch.getTargetNode().getName());if(!destino)continue;
      const s2=ch.getSampler(), i2=s2.getInput(), o2=s2.getOutput();
      const inp=doc.createAccessor().setType(i2.getType()).setArray(i2.getArray().slice()).setBuffer(buf);
      const out=doc.createAccessor().setType(o2.getType()).setArray(o2.getArray().slice()).setBuffer(buf);
      const s=doc.createAnimationSampler().setInput(inp).setOutput(out).setInterpolation(s2.getInterpolation());
      a.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(destino).setTargetPath(ch.getTargetPath()).setSampler(s));
    }
  }
}
/* el material: sin mapa de metal/rugosidad (una rugosidad pareja alcanza), color y normales a WebP */
for(const m of R.listMaterials()){m.setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(0.72);m.setEmissiveTexture(null).setEmissiveFactor([0,0,0]);}
await doc.transform(resample(),dedup(),prune(),
  textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:82}));
await io.write(sal,doc);
console.log('listo',sal,R.listAnimations().map(a=>a.getName()).join(','));
