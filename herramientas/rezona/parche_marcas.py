#!/usr/bin/env python3
"""La ultima reliquia se marca como la anteultima, y la sombra guia de mas lejos."""
import io
ARCH = "juegos-pc/Bosque.html"
s = io.open(ARCH, encoding="utf-8").read()
orig = s

def cambiar(a, b):
    global s
    assert s.count(a) == 1, "ancla %r aparece %d veces" % (a[:60], s.count(a))
    s = s.replace(a, b)

# 1. el contorno tambien vale para la ultima: es la que la sombra dejo en el inicio, y sin
#    marca hay que cruzar el mapa de memoria. Vale desde que quedan dos hasta que no queda ninguna.
cambiar("""  /* --- la anteultima brilla y se ve desde cualquier parte del mapa --- */
  if(recogidas===TOTAL-2){""",
        """  /* --- la anteultima Y la ultima brillan y se ven desde cualquier parte del mapa:
         la ultima es la que la sombra deja donde empezaste, del otro lado del bosque --- */
  if(recogidas>=TOTAL-2&&recogidas<TOTAL){""")

# 2. la guia, de mas lejos. Un numero solo, con nombre, para poder medirlo y moverlo.
cambiar("""const GUIA={on:false,x:0,z:0};""",
        """/* La sombra guia hacia la trampilla caminando DELANTE del jugador. De cerca se lee a
   escolta; de lejos se lee a que algo te lleva, que es lo que tiene que pasar cuando ya
   juntaste las cinco notas. DELANTE es la distancia a la que camina; LLEGA, el radio en el
   que se queda al lado de la trampilla esperandote. */
const GUIA={on:false,x:0,z:0,delante:19.0,llega:9.0};""")
cambiar("""        if(dTr<7.5){gx=BAJO.trX;gz=BAJO.trZ;}          // ya llegaste: se queda al lado
        else{
          const av=Math.min(dTr-2.5,8.0);""",
        """        if(dTr<GUIA.llega){gx=BAJO.trX;gz=BAJO.trZ;}   // ya llegaste: se queda al lado
        else{
          const av=Math.min(dTr-3.0,GUIA.delante);""")
# de lejos hay que poder seguirla: el paso de la guia va con el clip de caminar, no quieta
cambiar("""        gr.position.set(GUIA.x,alturaEn(GUIA.x,GUIA.z),GUIA.z);
        gr.scale.y=.88;gr.rotation.z=0;gr.rotation.x=0;""",
        """        const avx=GUIA.x-gr.position.x,avz=GUIA.z-gr.position.z;
        gr.position.set(GUIA.x,alturaEn(GUIA.x,GUIA.z),GUIA.z);
        P.vel=Math.hypot(avx,avz)/Math.max(dt,1e-4);   // el ciclo sale de lo que se movio
        gr.scale.y=.88;gr.rotation.z=0;gr.rotation.x=0;""")

# 3. sondas: la fase se pone a mano (es el ESTADO del juego), lo que se mide es la marca
cambiar("  costo:()=>{const por={};let tot=0,vis=0;",
        """  fase:n=>{const q=Math.max(0,Math.min(TOTAL,n|0));
    for(const r of reliquias)r.tomada=false;
    let i=0;for(const r of reliquias){if(i>=q)break;r.tomada=true;r.malla.visible=false;i++;}
    recogidas=q;contador('reliquia',recogidas,TOTAL);
    if(recogidas===TOTAL-1)ultimaAlInicio();
    return {recogidas:recogidas,total:TOTAL};},
  marcas:()=>{const o=new THREE.Vector3();camera.getWorldPosition(o);
    const sr=reliquias.find(r=>!r.tomada);
    return {recogidas:recogidas,
      marcaR:{visible:MARCA_R.visible,
        x:+MARCA_R.position.x.toFixed(2),z:+MARCA_R.position.z.toFixed(2),
        opacidad:+MARCA_R.material.opacity.toFixed(2),
        escala:+MARCA_R.scale.x.toFixed(4),
        dist:sr?+Math.hypot(sr.x-o.x,sr.z-o.z).toFixed(1):null},
      inicio:{x:INICIO.x,z:INICIO.z},
      reliquiaLibre:sr?{x:+sr.x.toFixed(2),z:+sr.z.toFixed(2)}:null};},
  guia:()=>{const o=new THREE.Vector3();camera.getWorldPosition(o);
    const g=PRESENCIA.grupo;
    return {on:GUIA.on,delante:GUIA.delante,llega:GUIA.llega,
      visible:g.visible,
      dJugador:+Math.hypot(g.position.x-o.x,g.position.z-o.z).toFixed(1),
      dTrampilla:+Math.hypot(BAJO.trX-g.position.x,BAJO.trZ-g.position.z).toFixed(1),
      vel:+PRESENCIA.vel.toFixed(2)};},
  costo:()=>{const por={};let tot=0,vis=0;""")

assert s != orig
nuevo = s
io.open(ARCH, "w", encoding="utf-8").write(nuevo)
print("marcas: %d -> %d bytes" % (len(orig), len(nuevo)))
