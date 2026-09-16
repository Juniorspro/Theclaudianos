#!/usr/bin/env python3
"""Vuelta A: los pies del monstruo, el costo del cuadro, la luz y el VHS.
Reemplazo exacto con assert de ancla; el texto se calcula entero antes de escribir."""
import io
ARCH = "juegos-pc/Bosque.html"
s = io.open(ARCH, encoding="utf-8").read()
orig = s

def cambiar(a, b, veces=1):
    global s
    assert s.count(a) == veces, "ancla %r aparece %d veces (esperaba %d)" % (a[:60], s.count(a), veces)
    s = s.replace(a, b)

# ---------------------------------------------------------------- 1. fundir las casas
cambiar("const muros=[],plataformas=[],reliquias=[],centrosCasa=[],ocluyentes=[],interiores=[];",
        """const muros=[],plataformas=[],reliquias=[],centrosCasa=[],ocluyentes=[],interiores=[];
const casasGrupos=[];
/* Fundir geometria es la palanca mas grande de llamadas de dibujo: las casas son cientos de
   cajas sueltas que comparten UNA geometria unitaria escalada por instancia. Se funden por casa
   y por material. El indice va en Uint32: pasados 65.535 vertices el desborde no avisa, dibuja
   triangulos que apuntan a cualquier lado. */
function fundirMallas(mallas){
  const pos=[],nor=[],uvs=[],idx=[];let base=0;
  const v=new THREE.Vector3(),nm=new THREE.Matrix3();
  for(const m of mallas){
    m.updateMatrix();
    const g=m.geometry,p=g.attributes.position,n=g.attributes.normal,t=g.attributes.uv;
    nm.getNormalMatrix(m.matrix);
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i).applyMatrix4(m.matrix);pos.push(v.x,v.y,v.z);
      if(n){v.fromBufferAttribute(n,i).applyMatrix3(nm).normalize();nor.push(v.x,v.y,v.z);}
      if(t)uvs.push(t.getX(i),t.getY(i));
    }
    const ix=g.index;
    if(ix)for(let i=0;i<ix.count;i++)idx.push(base+ix.getX(i));
    else for(let i=0;i<p.count;i++)idx.push(base+i);
    base+=p.count;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  if(nor.length===pos.length)g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  if(uvs.length)g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx),1));
  g.computeBoundingSphere();
  return g;
}
function fundirCasa(g){
  const porMat=new Map();
  for(const h of g.children){
    if(!h.isMesh||!h.userData.f)continue;
    if(!porMat.has(h.material))porMat.set(h.material,[]);
    porMat.get(h.material).push(h);
  }
  let antes=0,despues=0;
  porMat.forEach((lista,mat)=>{
    antes+=lista.length;
    if(lista.length<2){despues++;return;}
    const m=new THREE.Mesh(fundirMallas(lista),mat);
    m.castShadow=m.receiveShadow=true;
    for(const h of lista)g.remove(h);
    g.add(m);ocluyentes.push(m);despues++;
  });
  return [antes,despues];
}""")

cambiar("""  const g=new THREE.Group();g.position.set(ax,base,az);g.rotation.y=rot;scene.add(g);""",
        """  const g=new THREE.Group();g.position.set(ax,base,az);g.rotation.y=rot;scene.add(g);
  casasGrupos.push(g);""")

# las cajas ya no entran de a una en el raycast: entra la malla fundida
cambiar("    m.castShadow=m.receiveShadow=true;g.add(m);ocluyentes.push(m);",
        "    m.castShadow=m.receiveShadow=true;m.userData.f=1;g.add(m);")
cambiar("    m.castShadow=m.receiveShadow=true;g.add(m);return m;",
        "    m.castShadow=m.receiveShadow=true;m.userData.f=1;g.add(m);return m;")
cambiar("SITIOS.forEach((s,i)=>crearCasa(s.x,s.z,s.rot,i+1,s.dos));",
        """SITIOS.forEach((s,i)=>crearCasa(s.x,s.z,s.rot,i+1,s.dos));
let FUNDIDO=[0,0];
casasGrupos.forEach(g=>{const r=fundirCasa(g);FUNDIDO[0]+=r[0];FUNDIDO[1]+=r[1];});""")

# ---------------------------------------------------------------- 2. sombras de las hojas
# Una sombra es una pasada entera de la escena: las hojas son el 90% de los triangulos y su
# sombra es una mancha que la copa ya proyecta con las ramas.
cambiar("  r.castShadow=h.castShadow=true;r.receiveShadow=h.receiveShadow=true;",
        "  r.castShadow=true;h.castShadow=false;r.receiveShadow=h.receiveShadow=true;")
cambiar("    h.castShadow=r.castShadow=true;h.receiveShadow=r.receiveShadow=true;",
        "    r.castShadow=true;h.castShadow=false;h.receiveShadow=r.receiveShadow=true;")

# ---------------------------------------------------------------- 3. luz global
cambiar("  ambiente.intensity=THREE.MathUtils.lerp(.21,.50,dia)*(1-intLluvia*.6)+flash*1.3;",
        "  ambiente.intensity=THREE.MathUtils.lerp(.46,1.05,dia)*(1-intLluvia*.6)+flash*1.3;")
cambiar("  renderer.toneMappingExposure=THREE.MathUtils.lerp(.86,.94,dia)*(1-intLluvia*.32);",
        """  renderer.toneMappingExposure=THREE.MathUtils.lerp(.98,1.10,dia)*(1-intLluvia*.32);
  if(ENTORNO.mapa)ENTORNO.intensidad(THREE.MathUtils.lerp(.22,.62,dia)*(1-intLluvia*.45));""")
cambiar("const ambiente=new THREE.HemisphereLight(0x162434,0x050806,.22);scene.add(ambiente);",
        """// los dos colores tienen que ser DISTINTOS o la hemisferica no tiene forma: reparte segun
// hacia donde mira la cara, y con el suelo en negro toda cara que no mire al cielo recibe cero
const ambiente=new THREE.HemisphereLight(0x2c4058,0x14110c,.46);scene.add(ambiente);""")

# ---------------------------------------------------------------- 4. el VHS, que saturaba
cambiar("""    uVHS.uFuerza.value=.62+intLluvia*.35+vistaPresencia*.5+(1-dia)*.12
                      +(PRESENCIA.susto>0?1.15:0);""",
        """    // antes llegaba a 2,1 y a esa altura el filtro se come la imagen. Se topa, y ademas
    // el jugador elige cuanta cinta quiere (CFG.vhs, en localStorage).
    uVHS.uFuerza.value=Math.min(1.25,.40+intLluvia*.26+vistaPresencia*.34+(1-dia)*.08
                      +(PRESENCIA.susto>0?.75:0))*CFG.vhs;""")
cambiar("      col=mix(col,col*0.62+arrastre*0.38,0.4*F);",
        "      col=mix(col,col*0.62+arrastre*0.38,0.26*F);")
cambiar("      col=mix(col,vec3(lum),0.2*F);",
        "      col=mix(col,vec3(lum),0.13*F);")
cambiar("      col*=1.0-0.15*scan*F;",
        "      col*=1.0-0.09*scan*F;")
cambiar("      col+=(n-0.5)*0.08*F;",
        "      col+=(n-0.5)*0.055*F;")
cambiar("      col*=mix(1.0,1.0-dot(d,d)*0.95,0.8*F);",
        "      col*=mix(1.0,1.0-dot(d,d)*0.62,0.7*F);")
cambiar("const CFG={sens:1,gfx:'media'};",
        "const CFG={sens:1,gfx:'media',vhs:.75};")

# ---------------------------------------------------------------- 5. los pies del monstruo
cambiar("""      PRESENCIA.mezcla=mez;PRESENCIA.acc=acc;""",
        """      PRESENCIA.mezcla=mez;PRESENCIA.acc=acc;
      /* Los pies al piso MEDIDOS, no supuestos: el bind dice donde termina el pie en reposo y
         el ciclo lo baja. Se barren los tres clips y se corrige por el punto mas bajo que
         alcanza la piel; sin esto el bicho camina enterrado hasta la rodilla. */
      const piel=[];m.traverse(o=>{if(o.isSkinnedMesh)piel.push(o);});
      if(piel.length){
        const pa=piel[0],at=pa.geometry.attributes.position,v=new THREE.Vector3();
        const salto=Math.max(1,(at.count/240)|0);let minY=Infinity;
        for(const cual in acc){
          const a=acc[cual];if(!a)continue;
          for(const kk in acc)if(acc[kk])acc[kk].setEffectiveWeight(acc[kk]===a?1:0);
          const dur=a.getClip().duration;
          for(let k=0;k<6;k++){
            mez.setTime(dur*k/6);PRESENCIA.grupo.updateMatrixWorld(true);
            for(let i=0;i<at.count;i+=salto){
              v.fromBufferAttribute(at,i);pa.boneTransform(i,v);
              pa.localToWorld(v);
              if(v.y<minY)minY=v.y;
            }
          }
        }
        const base=new THREE.Vector3();PRESENCIA.grupo.getWorldPosition(base);
        const esc=PRESENCIA.grupo.scale.y||1;
        if(isFinite(minY))m.position.y-=(minY-base.y)/esc;
        PRESENCIA.pies=+(minY-base.y).toFixed(3);
        for(const kk in acc)if(acc[kk])acc[kk].setEffectiveWeight(kk==='quieto'?1:0);
        mez.setTime(0);
      }""")

# ---------------------------------------------------------------- 6. sondas nuevas
cambiar("  costo:()=>{const por={};let tot=0,vis=0;",
        """  fundido:()=>({cajas:FUNDIDO[0],mallas:FUNDIDO[1],ocluyentes:ocluyentes.length,
                pies:PRESENCIA.pies,entorno:!!ENTORNO.mapa}),
  sombras:v=>{renderer.shadowMap.enabled=v;scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});return v;},
  costo:()=>{const por={};let tot=0,vis=0;""")

assert s != orig
io.open(ARCH, "w", encoding="utf-8").write(s)
print("parche A: %d -> %d bytes" % (len(orig), len(s)))
