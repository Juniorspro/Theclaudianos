// utilidades compartidas por las páginas de herramientas
export const ARGS=JSON.parse(decodeURIComponent(location.hash.slice(1)||'%7B%7D'));
export async function cargarGLB(THREE,GLTFLoader,url){return await new Promise((ok,mal)=>new GLTFLoader().load(url,ok,undefined,mal));}
export function mallaConPiel(g){let m=null;g.scene.traverse(o=>{if(o.isSkinnedMesh&&!m)m=o;});return m;}
export function mapaHuesos(sk){const h={};sk.bones.forEach(b=>h[b.name]=b);return h;}
