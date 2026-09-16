#!/usr/bin/env python3
"""Mete las texturas de Rezona en el Bosque. Reemplazo de cadena exacta con assert de ancla:
un parche que no encuentra su sitio tiene que fallar en voz alta. El texto completo se calcula
antes de abrir el archivo para escribir (io.open(p,'w') trunca antes de evaluar)."""
import io, sys

ARCH = "juegos-pc/Bosque.html"
SHA = "558978766fee531cc67e140845e9799e6a88b47a"

s = io.open(ARCH, encoding="utf-8").read()
orig = s

def cambiar(viejo, nuevo):
    global s
    assert s.count(viejo) == 1, "ancla no unica o ausente: %r (%d)" % (viejo[:60], s.count(viejo))
    s = s.replace(viejo, nuevo)

# --- 1. material propio para el techo del porche, para que la teja tenga donde entrar ---
cambiar("const matRoca=new THREE.MeshStandardMaterial({color:0x60625c,roughness:1,flatShading:true});",
        "const matRoca=new THREE.MeshStandardMaterial({color:0x60625c,roughness:1,flatShading:true});\n"
        "const matTeja=new THREE.MeshStandardMaterial({map:texTabla(),color:0x9a9384,roughness:1});")
cambiar("const tej=caja(0,3.22,D/2+1.5,5.8,.18,2.9,matTabla,false,false);tej.rotation.x=.26;",
        "const tej=caja(0,3.22,D/2+1.5,5.8,.18,2.9,matTeja,false,false);tej.rotation.x=.26;")

# --- 2. el bloque de texturas IA, al final, donde TODOS los materiales ya existen (TDZ) ---
BLOQUE = r"""
/* ================= texturas IA (Rezona Lab) =================
   Lo procedural NO se borra: la foto pisa al canvas cuando decodifica, y si no llega el juego
   se ve exactamente como antes. Cada foto trae los METROS que cubre y de ahi sale la escala,
   no del gusto. Las cajas del pueblo comparten UNA geometria unitaria y se escalan por instancia,
   asi que una repeticion global no puede ser correcta para todas: la UV se proyecta por caja
   desde la posicion de mundo, y eso fija los metros por baldosa para todo el pueblo de una.
   El tinte se recalcula en lineal porque three multiplica map x vertexColor x material.color. */
const CDN_IA='https://cdn.jsdelivr.net/gh/Juniorspro/Theclaudianos@__SHA__/assets/';
const TEX_IA={};   // sonda: un base64/descarga que no llega no falla ni avisa

function promLineal(img){
  const L=64,c=document.createElement('canvas');c.width=c.height=L;
  const x=c.getContext('2d');x.drawImage(img,0,0,L,L);
  const d=x.getImageData(0,0,L,L).data;let r=0,g=0,b=0;
  const aLin=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);};
  for(let i=0;i<d.length;i+=4){r+=aLin(d[i]);g+=aLin(d[i+1]);b+=aLin(d[i+2]);}
  const n=d.length/4;return{r:Math.max(r/n,1e-4),g:Math.max(g/n,1e-4),b:Math.max(b/n,1e-4)};
}
function normalDe(img,fuerza){
  const L=512,c=document.createElement('canvas');c.width=c.height=L;
  const x=c.getContext('2d');x.drawImage(img,0,0,L,L);
  const p=x.getImageData(0,0,L,L).data,sal=x.createImageData(L,L),q=sal.data;
  const lum=i=>(p[i]*.299+p[i+1]*.587+p[i+2]*.114)/255;
  for(let y=0;y<L;y++)for(let X=0;X<L;X++){
    const i=(y*L+X)*4;
    const dx=(lum((y*L+(X+1)%L)*4)-lum((y*L+(X+L-1)%L)*4))*fuerza;
    const dy=(lum((((y+1)%L)*L+X)*4)-lum((((y+L-1)%L)*L+X)*4))*fuerza;
    const nx=-dx,ny=-dy,l=Math.hypot(nx,ny,1);
    q[i]=(nx/l*.5+.5)*255;q[i+1]=(ny/l*.5+.5)*255;q[i+2]=(1/l*.5+.5)*255;q[i+3]=255;
  }
  x.putImageData(sal,0,0);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;return t;
}
/* la UV sale de la posicion de mundo: metros por baldosa reales, sin tocar ninguna geometria */
function proyectarCaja(mat,metros){
  const M=metros.toFixed(3);
  mat.onBeforeCompile=sh=>{
    sh.vertexShader=sh.vertexShader.replace('#include <uv_vertex>',
      '#ifdef USE_UV\n'+
      ' vec3 pIA=(modelMatrix*vec4(position,1.0)).xyz;\n'+
      ' vec3 nIA=normalize(mat3(modelMatrix)*normal);\n'+
      ' vec3 aIA=abs(nIA);\n'+
      ' vUv=(aIA.y>aIA.x&&aIA.y>aIA.z)?pIA.xz/'+M+':(aIA.x>aIA.z)?pIA.zy/'+M+':pIA.xy/'+M+';\n'+
      '#endif');
  };
  mat.needsUpdate=true;
}
function vestir(nombre,relieve,usos){
  const im=new Image();im.crossOrigin='anonymous';
  im.onload=()=>{
    try{
      const nuevo=promLineal(im),nrm=normalDe(im,relieve);
      for(const u of usos){
        const m=u.mat;
        const t=new THREE.Texture(im);
        t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;  // los dos bordes que se tocan son el mismo
        t.encoding=THREE.sRGBEncoding;
        t.anisotropy=renderer.capabilities.getMaxAnisotropy();
        if(u.repeat)t.repeat.set(u.repeat[0],u.repeat[1]);
        t.needsUpdate=true;
        if(m.map&&m.map.image){                        // el tinte se recalcula, no se hereda
          const viejo=promLineal(m.map.image);
          m.color.r=Math.min(2,m.color.r*viejo.r/nuevo.r);
          m.color.g=Math.min(2,m.color.g*viejo.g/nuevo.g);
          m.color.b=Math.min(2,m.color.b*viejo.b/nuevo.b);
        }
        m.map=t;
        m.normalMap=nrm;
        m.normalScale=new THREE.Vector2(u.nScale||.8,u.nScale||.8);
        if(u.metros)proyectarCaja(m,u.metros);
        m.needsUpdate=true;
      }
      TEX_IA[nombre]='ok '+(im.naturalWidth||0)+'px';
    }catch(e){TEX_IA[nombre]='error: '+e.message;}
  };
  im.onerror=()=>{TEX_IA[nombre]='no llego';};
  TEX_IA[nombre]='pidiendo';
  im.src=CDN_IA+nombre+'.jpg';
}
/* suelo: 1020 m de plano con una foto de 4 m -> 255 copias. Los otros van por proyeccion. */
vestir('suelo',   1.6,[{mat:suelo.material,repeat:[255,255],nScale:.55}]);
vestir('piedra',  2.4,[{mat:matPiedra,metros:2.0,nScale:.9}]);
vestir('tabla',   2.0,[{mat:matTabla,metros:2.4,nScale:.8},{mat:matMadera,metros:2.4,nScale:.8}]);
vestir('teja',    2.2,[{mat:matTeja,metros:2.4,nScale:.9}]);
vestir('corteza', 2.6,[{mat:matViga,metros:2.2,nScale:.9},
                       {mat:matRama,repeat:[1,2],nScale:.7}]);

/* brillo del cuadro entero: readPixels sobre el lienzo ya dibujado. Con drawImage sobre un
   lienzo WebGL sin preserveDrawingBuffer sale cero, y leerlo fuera del cuadro tambien. */
let pedidoBrillo=null;
function pedirBrillo(){return new Promise(r=>{pedidoBrillo=r;});}
function leerBrillo(){
  if(!pedidoBrillo)return;
  const gl=renderer.getContext(),w=renderer.domElement.width,h=renderer.domElement.height;
  const px=new Uint8Array(w*h*4);
  gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
  let s=0;for(let i=0;i<px.length;i+=4)s+=px[i]*.299+px[i+1]*.587+px[i+2]*.114;
  const f=pedidoBrillo;pedidoBrillo=null;
  f({medio:+(s/(w*h)).toFixed(2),w:w,h:h});
}
""".replace("__SHA__", SHA)

cambiar("// sonda del banco: nada del juego la lee, existe para poder medir sin jugar",
        BLOQUE + "\n// sonda del banco: nada del juego la lee, existe para poder medir sin jugar")

# --- 3. la sonda ---
cambiar("  jug:jugador,aplicarGfx};",
        "  jug:jugador,aplicarGfx,ia:()=>TEX_IA,brillo:pedirBrillo};")

# --- 4. el brillo se lee al final del cuadro, despues de la ultima pasada ---
cambiar("""  }else{
    renderer.render(scene,camera);
  }
}""",
        """  }else{
    renderer.render(scene,camera);
  }
  leerBrillo();
}""")

assert s != orig
io.open(ARCH, "w", encoding="utf-8").write(s)
print("parche aplicado: %d -> %d bytes" % (len(orig), len(s)))
