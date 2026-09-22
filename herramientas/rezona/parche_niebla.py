#!/usr/bin/env python3
"""Niebla con bruma baja y tinte de sol, sobre la niebla exponencial que ya estaba.

Por que: `FogExp2` pinta todo del mismo color mire donde mire, y la profundidad de un bosque
sale de que lo bajo tenga mas bruma que lo alto y de que la niebla se encienda del lado del sol.
Se parchea el trozo `fog_*` de three POR MATERIAL, encadenando el `onBeforeCompile` que ya tenga
(viento, proyeccion de UV): es uno solo por material y el segundo parche borra al primero."""
import io
ARCH = "juegos-pc/Bosque.html"
s = io.open(ARCH, encoding="utf-8").read()
orig = s

def cambiar(a, b):
    global s
    assert s.count(a) == 1, "ancla %r aparece %d veces" % (a[:70], s.count(a))
    s = s.replace(a, b)

BLOQUE = r"""
/* ================= niebla con bruma baja =================
   Los uniformes son UN solo objeto compartido por todos los materiales: se asignan por
   referencia dentro de onBeforeCompile, asi una escritura por cuadro alcanza para todos.
   La cantidad de niebla suma dos cosas: la exponencial de siempre (cuadratica, la que ya
   estaba tuneada) y la integral de la bruma baja a lo largo del rayo, que depende de la
   altura de la camara y de hacia donde mira. */
const NIEBLA={
  uNbAlta:{value:.0090},              // cuanta bruma hay pegada al piso
  uNbCaida:{value:.115},              // cada cuantos metros se divide (1/8,7 m)
  uNbBase:{value:0},                  // la cota donde la bruma es mas espesa
  uNbCamY:{value:0},
  uNbSolV:{value:new THREE.Vector3(0,1,0)},     // el sol en espacio de vista
  uNbSolCol:{value:new THREE.Color(0x30404e)},  // de que color se enciende del lado del sol
  uNbVistaMundo:{value:new THREE.Matrix3()}
};
function parchearNiebla(mat){
  if(!mat||mat.fog===false||mat.userData.nb)return;
  if(!(mat.isMeshStandardMaterial||mat.isMeshPhongMaterial||mat.isMeshLambertMaterial))return;
  mat.userData.nb=1;
  const previo=mat.onBeforeCompile;
  mat.onBeforeCompile=function(sh,r){
    if(previo)previo.call(mat,sh,r);
    for(const k in NIEBLA)sh.uniforms[k]=NIEBLA[k];   // por REFERENCIA, no copia
    sh.vertexShader=sh.vertexShader
      .replace('#include <fog_pars_vertex>',
        '#include <fog_pars_vertex>\n#ifdef USE_FOG\nvarying vec3 vNbPos;\n#endif')
      .replace('#include <fog_vertex>',
        '#include <fog_vertex>\n#ifdef USE_FOG\nvNbPos=mvPosition.xyz;\n#endif');
    sh.fragmentShader=sh.fragmentShader
      .replace('#include <fog_pars_fragment>',
        '#ifdef USE_FOG\n'+
        ' varying vec3 vNbPos;\n uniform vec3 fogColor;\n uniform float fogDensity;\n'+
        ' uniform float uNbAlta,uNbCaida,uNbBase,uNbCamY;\n'+
        ' uniform vec3 uNbSolV,uNbSolCol;\n uniform mat3 uNbVistaMundo;\n'+
        '#endif')
      .replace('#include <fog_fragment>',
        '#ifdef USE_FOG\n'+
        ' float nbD=length(vNbPos);\n'+
        ' vec3 nbDir=vNbPos/max(nbD,1e-4);\n'+
        ' float nbDy=(uNbVistaMundo*nbDir).y;\n'+
        ' float nbK=uNbCaida*nbDy;\n'+
        ' float nbInt=abs(nbK)>1e-4?(1.0-exp(-nbK*nbD))/nbK:nbD;\n'+
        ' float nbBaja=uNbAlta*exp(-uNbCaida*(uNbCamY-uNbBase))*nbInt;\n'+
        ' float nbE=fogDensity*nbD;\n'+
        ' float nbCant=1.0-exp(-(nbE*nbE+nbBaja));\n'+
        ' float nbSol=pow(max(dot(nbDir,uNbSolV),0.0),6.0);\n'+
        ' gl_FragColor.rgb=mix(gl_FragColor.rgb,mix(fogColor,uNbSolCol,nbSol*0.85),'+
        'clamp(nbCant,0.0,1.0));\n'+
        '#endif');
  };
  mat.needsUpdate=true;
}
function vestirNiebla(raiz){
  let n=0;
  (raiz||scene).traverse(o=>{
    const m=o.material;if(!m)return;
    for(const mm of (Array.isArray(m)?m:[m])){if(!mm.userData.nb){parchearNiebla(mm);n++;}}
  });
  return n;
}
const NB_MATS=vestirNiebla(scene);
"""
cambiar("\n/* ================= luz de entorno (IBL) =================",
        BLOQUE + "\n/* ================= luz de entorno (IBL) =================")

# el monstruo llega despues: sus materiales tambien entran a la niebla
cambiar("      PRESENCIA.mezcla=mez;PRESENCIA.acc=acc;ENTORNO.sumar(m);",
        "      PRESENCIA.mezcla=mez;PRESENCIA.acc=acc;ENTORNO.sumar(m);vestirNiebla(m);")

# una escritura por cuadro: los uniformes son compartidos
cambiar("""  tmpCol.copy(cNieblaN).lerp(cNieblaD,dia).lerp(cNieblaLl,intLluvia*.88);
  scene.fog.color.copy(tmpCol);""",
        """  tmpCol.copy(cNieblaN).lerp(cNieblaD,dia).lerp(cNieblaLl,intLluvia*.88);
  scene.fog.color.copy(tmpCol);
  // la bruma baja y su tinte: el sol se pasa a espacio de vista una vez por cuadro
  NIEBLA.uNbCamY.value=camera.getWorldPosition(tmpV).y;
  NIEBLA.uNbVistaMundo.value.setFromMatrix4(camera.matrixWorld);
  NIEBLA.uNbSolV.value.copy(dirAstro).transformDirection(camera.matrixWorldInverse);
  NIEBLA.uNbSolCol.value.copy(tmpCol).lerp(cSolNiebla,.55+dia*.35);
  NIEBLA.uNbAlta.value=(.0075+intLluvia*.010)*(1-dia*.35);
  NIEBLA.uNbBase.value=alturaEn(jugador.pos.x,jugador.pos.z)-.6;""")
cambiar("const cNieblaN=new THREE.Color(0x060a0e),cNieblaD=new THREE.Color(0x5b6b64),cNieblaLl=new THREE.Color(0x141a20);",
        "const cNieblaN=new THREE.Color(0x060a0e),cNieblaD=new THREE.Color(0x5b6b64),cNieblaLl=new THREE.Color(0x141a20);\n"
        "const cSolNiebla=new THREE.Color(0x9e8f6e);   // el color con el que se enciende del lado del sol")

cambiar("  fundido:()=>({cajas:FUNDIDO[0],mallas:FUNDIDO[1],ocluyentes:ocluyentes.length,",
        "  niebla:()=>({mats:NB_MATS,alta:NIEBLA.uNbAlta.value,caida:NIEBLA.uNbCaida.value,\n"
        "               base:+NIEBLA.uNbBase.value.toFixed(2),camY:+NIEBLA.uNbCamY.value.toFixed(2),\n"
        "               densidad:+scene.fog.density.toFixed(4)}),\n"
        "  fundido:()=>({cajas:FUNDIDO[0],mallas:FUNDIDO[1],ocluyentes:ocluyentes.length,")

assert s != orig
texto = s
io.open(ARCH, "w", encoding="utf-8").write(texto)
print("niebla: %d -> %d bytes" % (len(orig), len(texto)))
