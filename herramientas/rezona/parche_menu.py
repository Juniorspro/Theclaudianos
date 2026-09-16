#!/usr/bin/env python3
"""Cablea el menu nuevo: JUGAR, AJUSTES y COMO SE JUEGA, mas la cinta VHS en ajustes."""
import io
ARCH = "juegos-pc/Bosque.html"
s = io.open(ARCH, encoding="utf-8").read()
orig = s

def cambiar(a, b):
    global s
    assert s.count(a) == 1, "ancla %r aparece %d veces" % (a[:70], s.count(a))
    s = s.replace(a, b)

cambiar("""  if(isFinite(v))CFG.sens=Math.min(2.4,Math.max(.4,v));""",
        """  if(isFinite(v))CFG.sens=Math.min(2.4,Math.max(.4,v));
  const cinta=parseFloat(localStorage.getItem('bosque_vhs'));
  if(isFinite(cinta))CFG.vhs=Math.min(1.15,Math.max(0,cinta));""")

cambiar("""    P.querySelectorAll('.gfx').forEach(b=>b.classList.toggle('on',b.dataset.g===CFG.gfx));""",
        """    P.querySelectorAll('.gfx').forEach(b=>b.classList.toggle('on',b.dataset.g===CFG.gfx));
    P.querySelectorAll('.vhsB').forEach(b=>b.classList.toggle('on',
      Math.abs(parseFloat(b.dataset.v)-CFG.vhs)<.01));""")
cambiar("""  const guarda=()=>{try{localStorage.setItem('bosque_gfx',CFG.gfx);
    localStorage.setItem('bosque_sens',String(CFG.sens));}catch(e){}};""",
        """  const guarda=()=>{try{localStorage.setItem('bosque_gfx',CFG.gfx);
    localStorage.setItem('bosque_sens',String(CFG.sens));
    localStorage.setItem('bosque_vhs',String(CFG.vhs));}catch(e){}};""")
cambiar("""  P.querySelectorAll('.gfx').forEach(b=>toca(b,()=>{
    CFG.gfx=b.dataset.g;aplicarGfx();pinta();guarda();}));""",
        """  P.querySelectorAll('.gfx').forEach(b=>toca(b,()=>{
    CFG.gfx=b.dataset.g;aplicarGfx();pinta();guarda();}));
  P.querySelectorAll('.vhsB').forEach(b=>toca(b,()=>{
    CFG.vhs=parseFloat(b.dataset.v);pinta();guarda();}));""")

# el menu: el juego ya se esta dibujando detras, asi que el velo va en degradado
cambiar("""intro.addEventListener('touchstart',e=>{e.stopPropagation();e.preventDefault();cruzarPuerta();},{passive:false});
intro.addEventListener('click',e=>{e.stopPropagation();cruzarPuerta();});""",
        """/* El menu vive sobre la puerta. Un panel opaco encima de una escena ya dibujada tira a la
   basura lo unico que el juego tiene para enseñar: el velo va en degradado. */
const elMenu=document.getElementById('menu'),elAyuda=document.getElementById('ayuda');
const tocaUI=(el,fn)=>{
  if(!el)return;
  el.addEventListener('touchstart',e=>{e.stopPropagation();e.preventDefault();fn();},{passive:false});
  el.addEventListener('click',e=>{e.stopPropagation();if(!('ontouchstart'in window))fn();});
};
tocaUI(document.getElementById('mJugar'),()=>{elMenu.classList.add('oculto');cruzarPuerta();});
tocaUI(document.getElementById('mAjustes'),()=>document.getElementById('cfgP').classList.add('on'));
tocaUI(document.getElementById('mAyuda'),()=>elAyuda.classList.add('on'));
tocaUI(document.getElementById('ayudaX'),()=>elAyuda.classList.remove('on'));
elMenu.addEventListener('touchmove',e=>{e.stopPropagation();e.preventDefault();},{passive:false});
elAyuda.addEventListener('touchstart',e=>e.stopPropagation(),{passive:false});
// la sonda del banco sigue entrando por la puerta, y el menu se va con ella
intro.addEventListener('touchstart',e=>{e.stopPropagation();e.preventDefault();
  elMenu.classList.add('oculto');cruzarPuerta();},{passive:false});
intro.addEventListener('click',e=>{e.stopPropagation();
  elMenu.classList.add('oculto');cruzarPuerta();});""")

assert s != orig
io.open(ARCH, "w", encoding="utf-8").write(s)
print("menu: %d -> %d bytes" % (len(orig), len(s)))
