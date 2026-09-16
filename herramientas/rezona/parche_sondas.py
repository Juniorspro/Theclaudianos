#!/usr/bin/env python3
"""Sondas del banco: el cuadro entero (no la ultima pasada), saltar el reloj y plantarse
en una casa. Reemplazo exacto con assert de ancla."""
import io
ARCH = "juegos-pc/Bosque.html"
s = io.open(ARCH, encoding="utf-8").read()
orig = s

def cambiar(a, b):
    global s
    assert s.count(a) == 1, "ancla %r aparece %d veces" % (a[:50], s.count(a))
    s = s.replace(a, b)

# renderer.info se pone a cero al empezar CADA render() y la pasada VHS es otra:
# sin apagar autoReset se mide la ultima pasada (1 llamada, 2 triangulos), no el cuadro.
cambiar("const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});",
        "const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});\n"
        "renderer.info.autoReset=false;")
cambiar("""function animar(){
  requestAnimationFrame(animar);""",
        """function animar(){
  requestAnimationFrame(animar);
  renderer.info.reset();   // a mano, porque autoReset esta apagado""")
cambiar("  jug:jugador,aplicarGfx,ia:()=>TEX_IA,brillo:pedirBrillo};",
        """  jug:jugador,aplicarGfx,ia:()=>TEX_IA,brillo:pedirBrillo,
  saltar:seg=>{reloj.elapsedTime+=seg;return reloj.elapsedTime;},
  casas:()=>centrosCasa.map(c=>({x:c.x,z:c.z})),
  ir:(x,z)=>{jugador.pos.x=x;jugador.pos.z=z;return{x:x,z:z};},
  mirar:a=>{jugador.yaw=a;return a;}};""")

assert s != orig
io.open(ARCH, "w", encoding="utf-8").write(s)
print("sondas: %d -> %d bytes" % (len(orig), len(s)))
