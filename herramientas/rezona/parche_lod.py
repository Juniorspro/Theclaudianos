#!/usr/bin/env python3
"""Tercer nivel de detalle de las copas: de lejos, una de cada tres tarjetas, mas grande.

Las hojas son el 90 % de los triangulos del cuadro y a cuarenta metros nadie cuenta agujas: lo
que se lee es la MANCHA. Se arma una segunda geometria de copa por variante y cada cuadra
muestra una o la otra segun la distancia; las llamadas no suben porque nunca se dibujan las dos."""
import io
ARCH = "juegos-pc/Bosque.html"
s = io.open(ARCH, encoding="utf-8").read()
orig = s

def cambiar(a, b):
    global s
    assert s.count(a) == 1, "ancla %r aparece %d veces" % (a[:70], s.count(a))
    s = s.replace(a, b)

cambiar("  const ramas=[],hojas=[];", "  const ramas=[],hojas=[],hojasLejos=[];")
cambiar("""      const g=HOJA_BASE.clone();g.applyMatrix4(m);g.computeVertexNormals();
      const c=tonoHoja.clone().offsetHSL((rnd()-.5)*.03,(rnd()-.5)*.12,(rnd()-.5)*.14);
      marcar(g,flexHoja(nivel),rnd()*6.283,c);
      hojas.push(g);""",
        """      const g=HOJA_BASE.clone();g.applyMatrix4(m);g.computeVertexNormals();
      const c=tonoHoja.clone().offsetHSL((rnd()-.5)*.03,(rnd()-.5)*.12,(rnd()-.5)*.14);
      const fase=rnd()*6.283;
      marcar(g,flexHoja(nivel),fase,c);
      hojas.push(g);
      // copa de lejos: una de cada tres, agrandada desde su propia base (el origen de la
      // tarjeta ES su base), asi la mancha ocupa lo mismo con un tercio de los triangulos
      if(i%3===0){
        const gl=HOJA_BASE.clone();
        gl.applyMatrix4(m.clone().multiply(new THREE.Matrix4().makeScale(1.62,1.5,1.62)));
        gl.computeVertexNormals();
        marcar(gl,flexHoja(nivel),fase,c);
        hojasLejos.push(gl);
      }""")
cambiar("  return {ramas:fusionar(ramas),hojas:fusionar(hojas)};",
        "  return {ramas:fusionar(ramas),hojas:fusionar(hojas),hojasLejos:fusionar(hojasLejos)};")

cambiar("""  const esfera=new THREE.Sphere(new THREE.Vector3(0,6,0),CELDA_ARB*.78+16);
  V.ramas.boundingSphere=esfera;V.hojas.boundingSphere=esfera.clone();""",
        """  const esfera=new THREE.Sphere(new THREE.Vector3(0,6,0),CELDA_ARB*.78+16);
  V.ramas.boundingSphere=esfera;V.hojas.boundingSphere=esfera.clone();
  V.hojasLejos.boundingSphere=esfera.clone();""")

cambiar("""  const r=new THREE.InstancedMesh(V.ramas,matRama,G.ms.length);
  const h=new THREE.InstancedMesh(V.hojas,matHoja,G.ms.length);
  G.ms.forEach((m,i)=>{r.setMatrixAt(i,m);h.setMatrixAt(i,m);});
  r.instanceMatrix.needsUpdate=h.instanceMatrix.needsUpdate=true;
  r.position.set(G.ccx,0,G.ccz);h.position.set(G.ccx,0,G.ccz);
  r.castShadow=true;h.castShadow=false;r.receiveShadow=h.receiveShadow=true;
  scene.add(r,h);
  CUADRAS.push({r:r,h:h,x:G.ccx,z:G.ccz});""",
        """  const r=new THREE.InstancedMesh(V.ramas,matRama,G.ms.length);
  const h=new THREE.InstancedMesh(V.hojas,matHoja,G.ms.length);
  const hl=new THREE.InstancedMesh(V.hojasLejos,matHoja,G.ms.length);
  G.ms.forEach((m,i)=>{r.setMatrixAt(i,m);h.setMatrixAt(i,m);hl.setMatrixAt(i,m);});
  r.instanceMatrix.needsUpdate=h.instanceMatrix.needsUpdate=hl.instanceMatrix.needsUpdate=true;
  r.position.set(G.ccx,0,G.ccz);h.position.set(G.ccx,0,G.ccz);hl.position.set(G.ccx,0,G.ccz);
  r.castShadow=true;h.castShadow=hl.castShadow=false;
  r.receiveShadow=h.receiveShadow=hl.receiveShadow=true;
  hl.visible=false;
  scene.add(r,h,hl);
  CUADRAS.push({r:r,h:h,hl:hl,x:G.ccx,z:G.ccz});""")

cambiar("""  const lim=2.25/Math.max(scene.fog.density,1e-3)+CELDA_ARB*.9+16;
  const l2=lim*lim;
  for(const c of CUADRAS){
    const d2=(c.x-x)*(c.x-x)+(c.z-z)*(c.z-z);
    const ver=d2<l2;
    if(c.r.visible!==ver){c.r.visible=ver;c.h.visible=ver;}
  }""",
        """  const lim=2.25/Math.max(scene.fog.density,1e-3)+CELDA_ARB*.9+16;
  const l2=lim*lim, cerca2=CUAD_CERCA*CUAD_CERCA;
  for(const c of CUADRAS){
    const d2=(c.x-x)*(c.x-x)+(c.z-z)*(c.z-z);
    const ver=d2<l2, detalle=d2<cerca2;
    if(c.r.visible!==ver)c.r.visible=ver;
    const vh=ver&&detalle, vl=ver&&!detalle;
    if(c.h.visible!==vh)c.h.visible=vh;
    if(c.hl.visible!==vl)c.hl.visible=vl;
  }""")
cambiar("const CUADRAS=[];\nlet proxRecorte=0;",
        "const CUADRAS=[];\nconst CUAD_CERCA=72;   // hasta aca la copa entera; mas alla, la de lejos\nlet proxRecorte=0;")

cambiar("  niebla:()=>({mats:NB_MATS,",
        """  copas:()=>{let cerca=0,lejos=0,off=0;
    for(const c of CUADRAS){if(c.h.visible)cerca++;else if(c.hl.visible)lejos++;else off++;}
    return {cuadras:CUADRAS.length,completas:cerca,lejanas:lejos,apagadas:off,
      triCerca:VARIANTES[0].hojas.index.count/3,triLejos:VARIANTES[0].hojasLejos.index.count/3};},
  niebla:()=>({mats:NB_MATS,""")

assert s != orig
texto = s
io.open(ARCH, "w", encoding="utf-8").write(texto)
print("lod: %d -> %d bytes" % (len(orig), len(texto)))
