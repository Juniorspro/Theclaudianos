#!/usr/bin/env python3
"""Mete el monstruo riggeado en el Bosque. El titere de cilindros NO se borra: se apaga cuando
el GLB llega, y si no llega el juego se ve como antes."""
import io
ARCH = "juegos-pc/Bosque.html"
SHA_NUEVO = "d1936655883fb42c41872c7dc833ce1698c9f693"

s = io.open(ARCH, encoding="utf-8").read()
orig = s

def cambiar(a, b):
    global s
    assert s.count(a) == 1, "ancla %r aparece %d veces" % (a[:60], s.count(a))
    s = s.replace(a, b)

# el SHA del CDN: los assets nuevos viven en un commit nuevo
import re
viejo = re.search(r"const CDN_IA='[^']*'", s).group(0)
cambiar(viejo, "const CDN_IA='https://cdn.jsdelivr.net/gh/Juniorspro/Theclaudianos@%s/assets/'" % SHA_NUEVO)

# GLTFLoader clasico (examples/js existe hasta r147). Si no carga, THREE.GLTFLoader queda
# indefinido y el juego sigue con el titere: un asset que no llega cuesta una pieza, no la pantalla.
cambiar('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'
        '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>')

BLOQUE = r"""
/* ================= el monstruo riggeado (Rezona) =================
   Reemplaza al titere de cilindros negros: 25 huesos (los 16 de torsion colapsados, porque 41
   no compilan el shader en WebGL1), tres clips y la piel humeda del modelo. El titere no se
   borra, se apaga: si el GLB no llega, el juego se ve exactamente como antes. */
function vestirMonstruo(){
  if(!THREE.GLTFLoader){TEX_IA.monstruo='sin GLTFLoader';return;}
  TEX_IA.monstruo='pidiendo';
  new THREE.GLTFLoader().load(CDN_IA+'monstruo.glb',g=>{
    try{
      const m=g.scene,caja=new THREE.Box3().setFromObject(m),t=new THREE.Vector3();
      caja.getSize(t);
      const k=2.90/Math.max(t.y,1e-3);          // el titere medía 2,90 de alto en local
      m.scale.setScalar(k);
      m.position.y=-caja.min.y*k;               // los pies al piso del grupo, no el centro
      m.traverse(o=>{
        if(!o.isMesh&&!o.isSkinnedMesh)return;
        o.frustumCulled=false;                  // el centro de una piel no es el del objeto
        o.castShadow=true;o.receiveShadow=false;
        const mt=o.material;if(!mt)return;
        if(mt.color)mt.color.multiplyScalar(.46);   // piel humeda a oscuras, no muñeco alumbrado
        if(mt.emissive)mt.emissive.setHex(0x08070a);
        mt.roughness=Math.min(1,(mt.roughness===undefined?.9:mt.roughness)*.78);
        mt.fog=true;
      });
      for(const o of PRESENCIA.cuerpo)o.visible=false;
      PRESENCIA.grupo.add(m);
      PRESENCIA.modelo=m;
      const mez=new THREE.AnimationMixer(m),acc={};
      const dame=n=>{const c=g.animations.find(a=>a.name===n);return c?mez.clipAction(c):null;};
      acc.quieto=dame('preset:idle');acc.camina=dame('preset:walk');acc.corre=dame('preset:run');
      for(const kk in acc)if(acc[kk]){acc[kk].play();acc[kk].setEffectiveWeight(kk==='quieto'?1:0);}
      PRESENCIA.mezcla=mez;PRESENCIA.acc=acc;
      TEX_IA.monstruo='ok '+g.animations.length+' clips';
    }catch(e){TEX_IA.monstruo='error: '+e.message;}
  },undefined,()=>{TEX_IA.monstruo='no llego';});
}
vestirMonstruo();

/* El peso de cada clip sale de la VELOCIDAD MEDIDA del bicho, no de un temporizador: asi el
   paso y el desplazamiento no se pueden desincronizar. La velocidad de referencia de cada
   ciclo esta en un solo sitio para poder ajustarla midiendo el patinaje. */
const VEL_CAMINA=1.25,VEL_CORRE=3.0;
function animarMonstruo(dt,vel){
  const A=PRESENCIA.acc;
  if(!PRESENCIA.mezcla||!A)return;
  const corre=THREE.MathUtils.clamp((vel-1.7)/1.6,0,1);
  const anda=THREE.MathUtils.clamp(vel/.85,0,1)*(1-corre);
  if(A.quieto)A.quieto.setEffectiveWeight(Math.max(0,1-anda-corre));
  if(A.camina){A.camina.setEffectiveWeight(anda);
    A.camina.timeScale=THREE.MathUtils.clamp(vel/VEL_CAMINA,.55,2.0);}
  if(A.corre){A.corre.setEffectiveWeight(corre);
    A.corre.timeScale=THREE.MathUtils.clamp(vel/VEL_CORRE,.7,1.9);}
  PRESENCIA.mezcla.update(dt);
}
"""
cambiar("\n/* brillo del cuadro entero:", BLOQUE + "\n/* brillo del cuadro entero:")

# el mixer se actualiza donde ya se calcula la velocidad real del bicho
cambiar("""      const andando=Math.min(P.vel/1.0,1);
      P.paso+=dt*(1.5+P.vel*3.4);""",
        """      const andando=Math.min(P.vel/1.0,1);
      animarMonstruo(dt,P.vel);
      P.paso+=dt*(1.5+P.vel*3.4);""")

# sonda para fotografiarlo sin esperar a que el juego decida mostrarlo
cambiar("  mirar:a=>{yaw=yawObj=a;return a;}};",
        """  mirar:a=>{yaw=yawObj=a;return a;},
  bicho:(d,vel)=>{const P=PRESENCIA,g=P.grupo;
    g.visible=true;P.activa=true;P.oculta=999;P.estado='mira';P.estadoT=99;
    g.position.set(jugador.pos.x+Math.sin(yaw)*(d||7),0,jugador.pos.z+Math.cos(yaw)*(d||7));
    g.position.y=alturaEn(g.position.x,g.position.z);
    g.rotation.y=yaw+Math.PI;
    if(vel!==undefined){P.vel=vel;animarMonstruo(.3,vel);}
    return {x:+g.position.x.toFixed(2),z:+g.position.z.toFixed(2),
            modelo:!!P.modelo,vel:P.vel};}};""")

assert s != orig
io.open(ARCH, "w", encoding="utf-8").write(s)
print("monstruo: %d -> %d bytes" % (len(orig), len(s)))
