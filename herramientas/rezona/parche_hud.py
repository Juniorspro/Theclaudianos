#!/usr/bin/env python3
"""HUD nuevo: menu de inicio, controles con iconos propios y panel de ajustes con VHS.
Los iconos van ADENTRO del HTML como mascaras en base64 (~49 kB): la interfaz no puede
depender de una descarga. El color y el tamaño los pone el CSS, no la imagen."""
import io, json, os

ARCH = "juegos-pc/Bosque.html"
B64 = json.load(open("herramientas/rezona/crudo/ui_b64.json"))

s = io.open(ARCH, encoding="utf-8").read()
orig = s

def cambiar(a, b, veces=1):
    global s
    assert s.count(a) == veces, "ancla %r aparece %d veces" % (a[:70], s.count(a))
    s = s.replace(a, b)

# ---------------------------------------------------------------- 1. las mascaras
raiz = ":root{\n" + "\n".join(
    "    --ic-%s:url(%s);" % (k.replace("ui-", ""), v) for k, v in sorted(B64.items())) + "\n  }\n"

CSS = raiz + """  .ic{display:block;width:100%;height:100%;background:currentColor;
    -webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat;}
  .btn .ic{width:52%;height:52%;}
  #correr .ic{--m:var(--ic-correr);} #linterna .ic{--m:var(--ic-linterna);}
  #vhs .ic{--m:var(--ic-vhs);} #cfg .ic{--m:var(--ic-ajustes);}
  #pantalla .ic{--m:var(--ic-pantalla);}
  #joy{background:none;border:none;}
  #joyAro{position:absolute;inset:0;color:rgba(206,224,238,.5);}
  #joyAro .ic{--m:var(--ic-joystick);}
  #joyPunto{background:none;box-shadow:none;color:rgba(228,240,250,.82);}
  #joyPunto .ic{--m:var(--ic-pulgar);filter:drop-shadow(0 3px 10px rgba(0,0,0,.6));}
  #reliquias{display:flex;align-items:center;gap:8px;}
  #relIc{width:19px;height:19px;color:#f0dfad;--m:var(--ic-reliquia);flex:none;}
  #ojoAviso{position:absolute;left:50%;top:14%;transform:translateX(-50%);width:34px;height:34px;
    color:rgba(255,92,72,.9);opacity:0;pointer-events:none;--m:var(--ic-ojo);
    filter:drop-shadow(0 0 10px rgba(255,40,20,.6));transition:opacity .25s linear;}

  /* ---- menu de inicio ---- */
  #menu{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:16px;
    background:linear-gradient(180deg,rgba(3,5,9,.92) 0%,rgba(3,5,9,.72) 38%,
      rgba(3,5,9,.30) 62%,rgba(3,5,9,.86) 100%);}
  #menu.oculto{display:none;}
  #titulo{width:min(74%,420px);height:96px;color:#e8eef4;--m:var(--ic-titulo);
    filter:drop-shadow(0 6px 22px rgba(0,0,0,.9));}
  #lema{color:rgba(206,224,238,.55);font-size:11.5px;letter-spacing:.34em;margin-top:-6px;}
  .mBtn{display:flex;align-items:center;gap:12px;min-width:236px;padding:13px 20px;
    border-radius:12px;border:1px solid rgba(190,214,230,.26);background:rgba(8,14,20,.55);
    color:#dce8f2;font-size:13px;letter-spacing:.2em;}
  .mBtn i{width:20px;height:20px;flex:none;}
  .mBtn.pri{border-color:rgba(238,226,190,.66);background:rgba(58,48,28,.5);color:#f6ecd0;}
  #mJugar i{--m:var(--ic-correr);} #mAjustes i{--m:var(--ic-ajustes);}
  #mAyuda i{--m:var(--ic-nota);}
  #ayuda{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:13;
    display:none;flex-direction:column;gap:11px;padding:20px 22px;border-radius:14px;
    background:rgba(6,11,16,.95);border:1px solid rgba(190,214,230,.24);color:#d6e4ee;
    font-size:12px;letter-spacing:.06em;max-width:300px;}
  #ayuda.on{display:flex;}
  .ayF{display:flex;align-items:center;gap:12px;}
  .ayF i{width:24px;height:24px;flex:none;color:#cfe0ee;}
  #ayudaX{margin-top:4px;text-align:center;padding:9px;border-radius:9px;
    border:1px solid rgba(190,214,230,.3);background:rgba(20,32,44,.5);letter-spacing:.2em;}
"""
cambiar("  #intro{position:absolute;inset:0;z-index:9;overflow:hidden;background:#04050a;",
        CSS + "  #intro{position:absolute;inset:0;z-index:9;overflow:hidden;background:#04050a;")

# ---------------------------------------------------------------- 2. el marcado
cambiar('  <div id="joy"><div id="joyPunto"></div></div>',
        '  <div id="joy"><div id="joyAro"><i class="ic"></i></div>'
        '<div id="joyPunto"><i class="ic"></i></div></div>')
cambiar('  <div class="btn" id="correr">CORRER</div>\n'
        '  <div class="btn" id="linterna">LUZ</div>',
        '  <div class="btn" id="correr"><i class="ic"></i></div>\n'
        '  <div class="btn" id="linterna"><i class="ic"></i></div>')
cambiar('  <div class="btn" id="pantalla">⛶</div>\n'
        '  <div class="btn on" id="vhs">VHS</div>\n'
        '  <div class="btn" id="cfg">⚙</div>',
        '  <div class="btn" id="pantalla"><i class="ic"></i></div>\n'
        '  <div class="btn on" id="vhs"><i class="ic"></i></div>\n'
        '  <div class="btn" id="cfg"><i class="ic"></i></div>\n'
        '  <i class="ic" id="ojoAviso"></i>')
cambiar('  <div id="reliquias">Reliquias 0 / 0</div>',
        '  <div id="reliquias"><i class="ic" id="relIc"></i><span id="relN">0 / 0</span></div>')

# el VHS entra en ajustes: antes el filtro se comia la imagen y no habia donde bajarlo
cambiar("""    <div id="cfgX">CERRAR</div>""",
        """    <div class="cfgF"><span>Cinta VHS</span><div>
      <b class="cfgB vhsB" data-v="0">NO</b><b class="cfgB vhsB" data-v="0.45">SUAVE</b>
      <b class="cfgB vhsB" data-v="0.75">MEDIA</b><b class="cfgB vhsB" data-v="1.15">FUERTE</b></div></div>
    <div id="cfgX">CERRAR</div>""")

cambiar("""    <div id="rotulo">BOSQUE</div>
    <div id="entrar">toca para cruzar la puerta</div>
  </div>""",
        """  </div>

  <div id="menu">
    <i class="ic" id="titulo"></i>
    <div id="lema">NO ENCIENDAS LA LUZ SI ALGO TE MIRA</div>
    <div class="mBtn pri" id="mJugar"><i class="ic"></i>JUGAR</div>
    <div class="mBtn" id="mAjustes"><i class="ic"></i>AJUSTES</div>
    <div class="mBtn" id="mAyuda"><i class="ic"></i>CÓMO SE JUEGA</div>
  </div>

  <div id="ayuda">
    <div class="ayF"><i class="ic" style="--m:var(--ic-joystick)"></i>
      <span>Arrastrá en la mitad izquierda para caminar; en la derecha, para mirar.</span></div>
    <div class="ayF"><i class="ic" style="--m:var(--ic-correr)"></i>
      <span>CORRER: te cansás, y el ruido se escucha.</span></div>
    <div class="ayF"><i class="ic" style="--m:var(--ic-linterna)"></i>
      <span>LUZ: la linterna te muestra el camino y también te muestra a vos.</span></div>
    <div class="ayF"><i class="ic" style="--m:var(--ic-reliquia)"></i>
      <span>Juntá las 13 reliquias: hay una en cada casa.</span></div>
    <div class="ayF"><i class="ic" style="--m:var(--ic-nota)"></i>
      <span>Después aparecen 5 notas. Y después, lo que hay abajo.</span></div>
    <div class="ayF"><i class="ic" style="--m:var(--ic-ojo)"></i>
      <span>Si el ojo se enciende, algo te está mirando.</span></div>
    <div id="ayudaX">CERRAR</div>
  </div>""")

# ---------------------------------------------------------------- 3. el codigo
cambiar("document.getElementById('reliquias').textContent=`Reliquias 0 / ${TOTAL}`;",
        "document.getElementById('relN').textContent=`0 / ${TOTAL}`;")
cambiar("const elRel=document.getElementById('reliquias'),elAviso=document.getElementById('aviso');",
        """const elRelN=document.getElementById('relN'),elRelIc=document.getElementById('relIc');
const elAviso=document.getElementById('aviso'),elOjo=document.getElementById('ojoAviso');
/* el contador guarda el ESTADO, no el texto: al cambiar de fase cambia el icono tambien */
function contador(tipo,hechas,total){
  elRelIc.style.setProperty('--m','var(--ic-'+tipo+')');
  elRelN.textContent=hechas+' / '+total;
}""")
cambiar("  elRel.textContent='Notas 0 / '+NOTAS.length;", "  contador('nota',0,NOTAS.length);")
cambiar("      elRel.textContent=`Reliquias ${recogidas} / ${TOTAL}`;",
        "      contador('reliquia',recogidas,TOTAL);")
cambiar("        elRel.textContent='Notas '+notas+' / '+NOTAS.length;",
        "        contador('nota',notas,NOTAS.length);")

# el ojo: se enciende cuando algo te mira. Se escribe solo cuando cambia.
cambiar("""  uCielo.uDia.value=dia;""",
        """  {const v=Math.min(1,vistaPresencia*1.3);
   if(Math.abs(v-ojoVisto)>.04){ojoVisto=v;elOjo.style.opacity=v.toFixed(2);}}
  uCielo.uDia.value=dia;""")
cambiar("const reloj=new THREE.Clock();", "let ojoVisto=0;\nconst reloj=new THREE.Clock();")

assert s != orig
io.open(ARCH, "w", encoding="utf-8").write(s)
print("HUD: %d -> %d bytes" % (len(orig), len(s)))
