#!/usr/bin/env python3
"""HDR: la escena se dibuja en coma flotante y el tono se aplica AL FINAL, adentro del post.

Por que: hoy la escena se revela a 8 bits con ACES y recien despues pasa el VHS, asi que el
filtro trabaja sobre una imagen ya recortada — los faroles, la linterna y los ojos no tienen
por donde brillar. Con el destino en HalfFloat, el sol y las luces pasan de 1,0 y el revelado
(exposicion + ACES + sRGB) se hace una sola vez adentro del shader del post.
Si la placa no soporta coma flotante, queda todo como estaba (uTono=0 y ACES en el renderer)."""
import io
ARCH = "juegos-pc/Bosque.html"
s = io.open(ARCH, encoding="utf-8").read()
orig = s

def cambiar(a, b):
    global s
    assert s.count(a) == 1, "ancla %r aparece %d veces" % (a[:70], s.count(a))
    s = s.replace(a, b)

# ---------------------------------------------------------------- 1. el destino en HDR
cambiar("""const destino=new THREE.WebGLRenderTarget(2,2,{
  minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
  format:THREE.RGBAFormat,stencilBuffer:false});
destino.texture.encoding=THREE.sRGBEncoding;""",
        """/* coma flotante si la placa puede: es lo que deja que una luz pase de 1,0 */
const HDR=!!(renderer.capabilities.isWebGL2
  ? renderer.extensions.get('EXT_color_buffer_float')
  : renderer.extensions.get('EXT_color_buffer_half_float'));
const destino=new THREE.WebGLRenderTarget(2,2,{
  minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
  format:THREE.RGBAFormat,stencilBuffer:false,
  type:HDR?THREE.HalfFloatType:THREE.UnsignedByteType});
destino.texture.encoding=HDR?THREE.LinearEncoding:THREE.sRGBEncoding;
/* El tono lo pone la ultima pasada. Con ACES en el renderer, la escena llegaria al post ya
   revelada y recortada. Sin HDR no hay donde guardar lo que pasa de 1, asi que se deja ACES. */
renderer.toneMapping=HDR?THREE.NoToneMapping:THREE.ACESFilmicToneMapping;""")
cambiar("renderer.toneMapping=THREE.ACESFilmicToneMapping;\n", "")

# ---------------------------------------------------------------- 2. uniformes del post
cambiar("""  uGlitch:{value:0},
  uRes:{value:new THREE.Vector2(1,1)}""",
        """  uGlitch:{value:0},
  uRes:{value:new THREE.Vector2(1,1)},
  uExp:{value:1},            // la exposicion pasa a vivir en el post
  uTono:{value:0},           // 1 = revelar aca (hay HDR); 0 = ya vino revelado
  uGlow:{value:0}            // halo de lo que pasa de 1: solo en calidad alta""")

# ---------------------------------------------------------------- 3. revelado en el shader
cambiar("""    void main(){
      float F=uFuerza;""",
        """    // ACES (ajuste de Narkowicz) y sRGB a mano: un ShaderMaterial crudo no recibe
    // ninguna de las dos cosas de three, y sin ellas todo sale oscuro y sin rango.
    vec3 aces(vec3 x){
      return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);
    }
    vec3 aSRGB(vec3 c){
      return mix(pow(max(c,vec3(0.0)),vec3(0.41666))*1.055-0.055,c*12.92,step(c,vec3(0.0031308)));
    }
    vec3 revelar(vec2 uv){
      vec3 c=texture2D(tDiffuse,uv).rgb;
      if(uTono<0.5)return c;                  // ya venia revelada (sin HDR)
      return aSRGB(aces(c*uExp));
    }
    void main(){
      float F=uFuerza;""")

# las cuatro lecturas de la imagen pasan por el revelado
cambiar("""      float r=texture2D(tDiffuse,clamp(vec2(uv.x+ab,uv.y),0.0,1.0)).r;
      vec4 base=texture2D(tDiffuse,uv);
      float b=texture2D(tDiffuse,clamp(vec2(uv.x-ab,uv.y),0.0,1.0)).b;
      vec3 col=vec3(r,base.g,b);""",
        """      float r=revelar(clamp(vec2(uv.x+ab,uv.y),0.0,1.0)).r;
      vec3 base=revelar(uv);
      float b=revelar(clamp(vec2(uv.x-ab,uv.y),0.0,1.0)).b;
      vec3 col=vec3(r,base.g,b);
      /* halo de lo que pasa de 1: cuatro muestras del BUFFER CRUDO, no de la imagen revelada,
         porque despues del tono ya no queda nada arriba de 1 para brillar. */
      if(uGlow>0.0){
        vec2 e=vec2(3.5/uRes.x,3.5/uRes.y);
        vec3 h=texture2D(tDiffuse,clamp(uv+vec2( e.x,0.0),0.0,1.0)).rgb
              +texture2D(tDiffuse,clamp(uv+vec2(-e.x,0.0),0.0,1.0)).rgb
              +texture2D(tDiffuse,clamp(uv+vec2(0.0, e.y),0.0,1.0)).rgb
              +texture2D(tDiffuse,clamp(uv+vec2(0.0,-e.y),0.0,1.0)).rgb;
        col+=aSRGB(max(h*0.25*uExp-1.0,vec3(0.0))*0.5)*uGlow;
      }""")
cambiar("""      vec3 arrastre=texture2D(tDiffuse,clamp(uv+vec2(-3.0/uRes.x,0.0),0.0,1.0)).rgb;""",
        """      vec3 arrastre=revelar(clamp(uv+vec2(-3.0/uRes.x,0.0),0.0,1.0));""")

# ---------------------------------------------------------------- 4. el post corre SIEMPRE
cambiar("""    renderer.setRenderTarget(destino);
    renderer.render(scene,camera);
    renderer.setRenderTarget(null);
    renderer.render(escenaVHS,camVHS);
  }else{
    renderer.render(scene,camera);
  }""",
        """    renderer.setRenderTarget(destino);
    renderer.render(scene,camera);
    renderer.setRenderTarget(null);
    renderer.render(escenaVHS,camVHS);
  }else if(HDR){
    // sin cinta pero con HDR: el revelado tiene que pasar igual, una sola vez
    uVHS.uFuerza.value=0;uVHS.uGlitch.value=0;
    renderer.setRenderTarget(destino);
    renderer.render(scene,camera);
    renderer.setRenderTarget(null);
    renderer.render(escenaVHS,camVHS);
  }else{
    renderer.render(scene,camera);
  }""")

# ---------------------------------------------------------------- 5. exposicion y glow
cambiar("  renderer.toneMappingExposure=THREE.MathUtils.lerp(.94,1.02,dia)*(1-intLluvia*.32);",
        """  const expo=THREE.MathUtils.lerp(.94,1.02,dia)*(1-intLluvia*.32);
  if(HDR){uVHS.uTono.value=1;uVHS.uExp.value=expo;}
  else renderer.toneMappingExposure=expo;""")
cambiar("""  if(astro.shadow.map){astro.shadow.map.dispose();astro.shadow.map=null;}""",
        """  uVHS.uGlow.value=(CFG.gfx==='alta'&&HDR)?.85:0;   // el relleno es lo que siempre se paga
  if(astro.shadow.map){astro.shadow.map.dispose();astro.shadow.map=null;}""")

cambiar("  niebla:()=>({mats:NB_MATS,",
        """  hdr:()=>({hdr:HDR,tipo:destino.texture.type,tono:uVHS.uTono.value,
            exp:+uVHS.uExp.value.toFixed(3),glow:uVHS.uGlow.value,
            renderer:renderer.toneMapping}),
  niebla:()=>({mats:NB_MATS,""")

assert s != orig
texto = s
io.open(ARCH, "w", encoding="utf-8").write(texto)
print("hdr: %d -> %d bytes" % (len(orig), len(texto)))
