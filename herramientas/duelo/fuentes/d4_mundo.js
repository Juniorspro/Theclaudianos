/* ---------------- el mundo 3D: la arena, la cancha, los arcos, la hinchada, la pelota ----------------
   Unidades: metros. x a la derecha, y arriba, z hacia la cámara. Tu arco está en z=+LARGO/2 (abajo
   de la pantalla), el del rival en z=-LARGO/2. La cámara mira desde atrás de tu arco. */
var LARGO=22, ANCHO_C=12, ARCO_W=4, ARCO_H=2.1, ARCO_P=1.2, R_PELOTA=0.11;
var Z_MIO=LARGO/2, Z_RIVAL=-LARGO/2;
var R3={renderer:null,escena:null,cam:null,sol:null,hemi:null,arena:null,grupoArena:null,redes:[],hinchada:null,
  pelota:null,estela:null,luces:[],t:0,sacude:0,camObj:{pos:new THREE.Vector3(0,4.6,17.6),mira:new THREE.Vector3(0,0.4,-3),fov:62}};
function col(h){return new THREE.Color(h);}
function lienzoTex(w,h,dibujo,repetir){
  var c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d');dibujo(g,w,h);
  var t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
  if(repetir){t.wrapS=t.wrapT=THREE.RepeatWrapping;}
  return t;
}
function texImg(nombre,repetir){
  var im=IMG[nombre];if(!im)return null;
  var t=new THREE.Texture(im);t.needsUpdate=true;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
  if(repetir){t.wrapS=t.wrapT=THREE.RepeatWrapping;}
  return t;
}
function iniciar3D(lienzo){
  var r=new THREE.WebGLRenderer({canvas:lienzo,antialias:true,powerPreference:'high-performance'});
  r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
  r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
  r.info.autoReset=false;
  R3.renderer=r;
  R3.escena=new THREE.Scene();
  /* reflejos de entorno: sin esto lo PBR (los jugadores, los caños) sale plano */
  var pm=new THREE.PMREMGenerator(r);R3.escena.environment=pm.fromScene(new RoomEnvironment(),0.04).texture;R3.escena.environmentIntensity=0.55;
  /* el posproceso: brillo suave en lo que más ilumina, y un revelado con viñeta y un poco más de color */
  R3.composer=new EffectComposer(r,new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,samples:4}));
  R3.cam=new THREE.PerspectiveCamera(62,0.46,0.1,400);
  R3.hemi=new THREE.HemisphereLight(0xbfe4ff,0x8a7a5a,0.9);R3.escena.add(R3.hemi);
  var s=new THREE.DirectionalLight(0xfff0d8,2.6);s.position.set(-11,13,5);s.castShadow=true;
  s.shadow.mapSize.set(2048,2048);var sc=s.shadow.camera;sc.left=-10;sc.right=10;sc.top=15;sc.bottom=-15;sc.near=1;sc.far=50;
  s.shadow.bias=-0.0004;s.shadow.normalBias=0.025;s.shadow.radius=3;
  R3.escena.add(s);R3.escena.add(s.target);R3.sol=s;
  crearPelota();crearEstela();
  var C=R3.composer;C.addPass(new RenderPass(R3.escena,R3.cam));
  R3.bloom=new UnrealBloomPass(new THREE.Vector2(256,256),0.32,0.5,0.92);C.addPass(R3.bloom);
  R3.revelado=new ShaderPass({uniforms:{tDiffuse:{value:null},uVin:{value:0.28},uSat:{value:1.12}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform sampler2D tDiffuse;uniform float uVin,uSat;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);'+
      'float l=dot(c.rgb,vec3(0.2126,0.7152,0.0722));c.rgb=mix(vec3(l),c.rgb,uSat);vec2 d=vUv-0.5;c.rgb*=1.0-uVin*dot(d,d)*2.2;gl_FragColor=c;}'});
  C.addPass(R3.revelado);C.addPass(new OutputPass());
  R3.post=true;
}
function tamano3D(w,h,dpr){
  var r=R3.renderer;if(!r)return;
  r.setPixelRatio(dpr*Pantalla.escala3D);r.setSize(w,h,false);
  R3.cam.aspect=w/h;R3.cam.updateProjectionMatrix();
  if(R3.composer){R3.composer.setPixelRatio(dpr*Pantalla.escala3D);R3.composer.setSize(w,h);R3.bloom.resolution.set(w*0.5,h*0.5);}
}
/* ---------------- texturas hechas con código ---------------- */
function texPelota(estilo){
  return lienzoTex(512,256,function(g,w,h){
    var E=PELOTAS[estilo]||PELOTAS.clasica;
    g.fillStyle=E.base;g.fillRect(0,0,w,h);
    /* los paneles: pentágonos repartidos en la proyección, más anchos cerca de los polos */
    g.fillStyle=E.panel;
    var pts=[[0.1,0.5],[0.3,0.5],[0.5,0.5],[0.7,0.5],[0.9,0.5],[0,0.22],[0.2,0.22],[0.4,0.22],[0.6,0.22],[0.8,0.22],[0.1,0.78],[0.3,0.78],[0.5,0.78],[0.7,0.78],[0.9,0.78],[0.5,0.02],[0.5,0.98]];
    pts.forEach(function(p,i){var x=p[0]*w, y=p[1]*h, ex=1/Math.max(0.25,Math.sin(p[1]*Math.PI)), r=h*0.075;
      g.save();g.translate(x,y);g.scale(ex,1);g.beginPath();for(var k=0;k<5;k++){var a=k/5*TAU-Math.PI/2;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.restore();
      if(x<r*ex*2){g.save();g.translate(x+w,y);g.scale(ex,1);g.beginPath();for(var k2=0;k2<5;k2++){var a2=k2/5*TAU-Math.PI/2;g.lineTo(Math.cos(a2)*r,Math.sin(a2)*r);}g.closePath();g.fill();g.restore();}});
    if(E.raya){g.fillStyle=E.raya;g.fillRect(0,h*0.47,w,h*0.06);}
    g.strokeStyle='rgba(0,0,0,0.25)';g.lineWidth=2;
    for(var i=0;i<12;i++){g.beginPath();g.moveTo(i*w/12,0);g.lineTo(i*w/12+20,h);g.stroke();}
  });
}
/* el piso de afuera: la vereda de ondas blancas y negras de la costanera */
function texVereda(){
  return lienzoTex(512,512,function(g,w,h){
    g.fillStyle='#efe8da';g.fillRect(0,0,w,h);
    g.fillStyle='#2a2a30';
    for(var k=0;k<4;k++){var y0=k*h/4;g.beginPath();g.moveTo(0,y0);
      for(var x=0;x<=w;x+=8)g.lineTo(x,y0+Math.sin(x/w*TAU*2)*h*0.06+h*0.06);
      for(var x2=w;x2>=0;x2-=8)g.lineTo(x2,y0+Math.sin(x2/w*TAU*2)*h*0.06+h*0.14);g.closePath();g.fill();}
    /* las piedritas */
    for(var i=0;i<1800;i++){g.fillStyle='rgba(0,0,0,'+(Math.random()*0.08)+')';g.fillRect(Math.random()*w,Math.random()*h,3,3);}
  },true);
}
function texBaldosas(c1,c2){
  return lienzoTex(256,256,function(g,w,h){
    for(var y=0;y<4;y++)for(var x=0;x<4;x++){g.fillStyle=(x+y)%2?c1:c2;g.fillRect(x*64,y*64,64,64);
      g.fillStyle='rgba(255,255,255,0.05)';g.fillRect(x*64+2,y*64+2,60,4);}
    g.strokeStyle='rgba(0,0,0,0.25)';g.lineWidth=2;for(var i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,h);g.stroke();g.beginPath();g.moveTo(0,i*64);g.lineTo(w,i*64);g.stroke();}
  },true);
}
function texTejido(){
  return lienzoTex(128,128,function(g,w,h){
    g.clearRect(0,0,w,h);g.strokeStyle='rgba(235,240,245,0.85)';g.lineWidth=3;
    g.beginPath();g.moveTo(0,0);g.lineTo(w,h);g.moveTo(w,0);g.lineTo(0,h);g.stroke();
  },true);
}
function texHoja(){
  return lienzoTex(128,512,function(g,w,h){
    g.clearRect(0,0,w,h);
    g.strokeStyle='#3c6a1c';g.lineWidth=6;g.beginPath();g.moveTo(w/2,h);g.lineTo(w/2,0);g.stroke();
    for(var i=0;i<26;i++){var y=h-i*h/26, l=w*0.48*Math.sin((i+1)/27*Math.PI);
      g.fillStyle=i%2?'#4f9a2a':'#3f8a22';
      g.beginPath();g.moveTo(w/2,y);g.quadraticCurveTo(w/2-l*0.6,y-10,w/2-l,y-26);g.lineTo(w/2,y-8);g.fill();
      g.beginPath();g.moveTo(w/2,y);g.quadraticCurveTo(w/2+l*0.6,y-10,w/2+l,y-26);g.lineTo(w/2,y-8);g.fill();}
  });
}
/* ---------------- la arena ---------------- */
var ARENAS={
  playa:{nom:'ARENA COSTANERA',fondo:'fondo-playa',piso:'vereda',cielo:['#7fc4f5','#d9f0ff'],sol:[0xfff0d8,2.6],hemi:[0xbfe4ff,0x8a7a5a,0.9],trofeos:0,
    tablero:['#5a2ad0','#2a6af0'],gradas:['#3a4ad8','#6a3ae0']},
  terraza:{nom:'TERRAZA DEL MORRO',fondo:'fondo-terraza',piso:'baldosa',cielo:['#f0a070','#ffe0b0'],sol:[0xffc890,2.3],hemi:[0xffd8b0,0x6a4a3a,0.8],trofeos:200,
    tablero:['#e04a8a','#f08a2a'],gradas:['#c03a6a','#e07a2a']},
  noche:{nom:'ESTADIO DE LAS LUCES',fondo:'fondo-noche',piso:'vereda',cielo:['#0a1030','#2a2a60'],sol:[0x9ab8ff,1.4],hemi:[0x6a7ac0,0x201a30,0.75],trofeos:500,noche:true,
    tablero:['#2adfff','#8a3aff'],gradas:['#2a2a8a','#5a2ab0']}
};
function armarArena(id){
  var A=ARENAS[id], E=R3.escena;
  if(R3.grupoArena){E.remove(R3.grupoArena);R3.grupoArena.traverse(function(o){if(o.geometry)o.geometry.dispose();});}
  var G=new THREE.Group();R3.grupoArena=G;E.add(G);R3.arena=id;R3.redes=[];R3.luces.forEach(function(l){E.remove(l);});R3.luces=[];
  E.background=col(A.cielo[0]);
  R3.sol.color=col(A.sol[0]);R3.sol.intensity=A.sol[1];
  R3.hemi.color=col(A.hemi[0]);R3.hemi.groundColor=col(A.hemi[1]);R3.hemi.intensity=A.hemi[2];
  E.fog=new THREE.Fog(col(A.cielo[1]),60,160);
  /* el fondo pintado: un cilindro gigante alrededor de todo, sin luz ni niebla */
  var tf=texImg(A.fondo);
  if(tf){tf.wrapS=THREE.RepeatWrapping;tf.repeat.x=-2;tf.offset.x=0.25;
    var cil=new THREE.Mesh(new THREE.CylinderGeometry(95,95,72,64,1,true),new THREE.MeshBasicMaterial({map:tf,side:THREE.BackSide,fog:false,toneMapped:false}));
    cil.position.y=24;cil.rotation.y=Math.PI*0.5;G.add(cil);}
  /* el piso de afuera */
  var tp=A.piso==='vereda'?texVereda():texBaldosas('#c8b8a0','#b8a890');tp.repeat.set(40,40);
  var piso=new THREE.Mesh(new THREE.PlaneGeometry(220,220),new THREE.MeshStandardMaterial({map:tp,roughness:0.9,color:A.noche?0x7a7a90:0xffffff}));
  piso.rotation.x=-Math.PI/2;piso.position.y=-0.02;piso.receiveShadow=true;G.add(piso);
  armarCancha(G,A);armarArcos(G);armarTableros(G,A);armarTribunas(G,A);armarDecorado(G,A,id);
  banderines(G);bancos(G,A);techosTribunas(G,A);fotografos(G);ajustarCapas();
  if(A.noche)armarReflectores(G);
}
/* la cancha: una textura horneada (pasto + franjas de corte + líneas pintadas) y encima capas de
   pasto (la técnica de "cáscaras"): cada capa deja ver menos hojas, y juntas dan el relieve. */
var CAPAS_PASTO=6, W_TEX=13.2, L_TEX=24.2;
function texCancha(A){
  var cw=1024, ch=Math.round(1024*L_TEX/W_TEX), ppm=cw/W_TEX;
  return lienzoTex(cw,ch,function(g,w,h){
    var im=IMG.cesped;
    if(im){var t=256;for(var y=0;y<h;y+=t)for(var x=0;x<w;x+=t)g.drawImage(im,x,y,t,t);}
    else{g.fillStyle='#3faa3a';g.fillRect(0,0,w,h);}
    /* el color de la arena: de día más amarillo, de noche más frío */
    g.fillStyle=A.noche?'rgba(20,60,90,0.18)':'rgba(120,200,40,0.10)';g.fillRect(0,0,w,h);
    /* franjas de corte, a lo largo y un poco a lo ancho (el damero suave de los estadios nuevos) */
    var n=12;for(var i=0;i<n;i++){if(i%2)continue;g.fillStyle='rgba(255,255,230,0.10)';g.fillRect(0,i*h/n,w,h/n);}
    for(var j=0;j<8;j++){if(j%2)continue;g.fillStyle='rgba(0,40,0,0.05)';g.fillRect(j*w/8,0,w/8,h);}
    /* desgaste frente a los arcos y en el círculo central */
    [[w/2,ppm*1.2],[w/2,h-ppm*1.2],[w/2,h/2]].forEach(function(p){g.fillStyle=rad(g,p[0],p[1],0,ppm*2.4,[[0,'rgba(150,130,60,0.22)'],[1,'rgba(150,130,60,0)']]);g.fillRect(p[0]-ppm*3,p[1]-ppm*3,ppm*6,ppm*6);});
    /* las líneas, en metros (el centro de la textura es el centro de la cancha) */
    var X=function(m){return w/2+m*ppm;}, Z=function(m){return h/2+m*ppm;};
    g.strokeStyle='rgba(250,252,245,0.95)';g.lineWidth=0.09*ppm;g.lineCap='butt';
    var hw=ANCHO_C/2, hl=LARGO/2;
    g.strokeRect(X(-hw),Z(-hl),ANCHO_C*ppm,LARGO*ppm);
    g.beginPath();g.moveTo(X(-hw),Z(0));g.lineTo(X(hw),Z(0));g.stroke();
    g.beginPath();g.arc(X(0),Z(0),2.6*ppm,0,TAU);g.stroke();
    g.fillStyle='rgba(250,252,245,0.95)';
    [0,hl-4.5,-hl+4.5].forEach(function(z){g.beginPath();g.arc(X(0),Z(z),0.13*ppm,0,TAU);g.fill();});
    [1,-1].forEach(function(sg){
      g.beginPath();g.arc(X(0),Z(sg*hl),3.4*ppm,sg>0?Math.PI:0,sg>0?TAU:Math.PI);g.stroke();
      g.strokeRect(X(-2.3),Z(sg>0?hl-1.2:-hl),4.6*ppm,1.2*ppm);
      [[-hw,1],[hw,-1]].forEach(function(c){g.beginPath();g.arc(X(c[0]),Z(sg*hl),0.5*ppm,0,TAU);g.stroke();});
    });
  });
}
function texHojas(){
  /* cada pixel es una hoja con una altura al azar (en el alfa); los racimos le dan irregularidad */
  var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d'), d=g.createImageData(256,256);
  for(var i=0;i<256*256;i++){var a=Math.random();a=a*a*(0.6+0.4*Math.random());var v=Math.floor(a*255);
    d.data[i*4]=d.data[i*4+1]=d.data[i*4+2]=255;d.data[i*4+3]=v;}
  g.putImageData(d,0,0);
  var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;return t;
}
function armarCancha(G,A){
  var tc=texCancha(A);
  var base=new THREE.Mesh(new THREE.PlaneGeometry(W_TEX,L_TEX),new THREE.MeshStandardMaterial({map:tc,roughness:0.92,color:0xb8c8b0}));
  base.rotation.x=-Math.PI/2;base.receiveShadow=true;G.add(base);
  var th=R3.texHojas||(R3.texHojas=texHojas());th.repeat.set(W_TEX*1.6,L_TEX*1.6);
  R3.capas=[];
  for(var i=1;i<=CAPAS_PASTO;i++){var f=i/CAPAS_PASTO;
    var m=new THREE.Mesh(new THREE.PlaneGeometry(W_TEX,L_TEX),new THREE.MeshStandardMaterial({map:tc,alphaMap:th,alphaTest:0.12+f*0.62,roughness:0.9,
      color:new THREE.Color().setRGB(0.72+f*0.34,0.8+f*0.26,0.7+f*0.22)}));
    m.rotation.x=-Math.PI/2;m.position.y=f*0.028;m.receiveShadow=true;G.add(m);R3.capas.push(m);}
  /* sombra de contacto al pie de los tableros: oscurece donde se junta la pared con el pasto */
  var ao=lienzoTex(4,64,function(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'rgba(0,0,0,0.5)'],[1,'rgba(0,0,0,0)']]);g.fillRect(0,0,w,h);});
  var mao=new THREE.MeshBasicMaterial({map:ao,transparent:true,depthWrite:false});
  var hw=ANCHO_C/2+0.54, hl=LARGO/2+0.34;
  [[-hw,0,Math.PI/2,LARGO+1],[hw,0,-Math.PI/2,LARGO+1]].forEach(function(p){var m=new THREE.Mesh(new THREE.PlaneGeometry(p[3],0.8),mao);m.rotation.set(-Math.PI/2,0,p[2]);m.position.set(p[0]+(p[0]<0?0.4:-0.4),0.031,p[1]);G.add(m);});
}
/* con la resolución baja (teléfono justo), menos capas de pasto */
function ajustarCapas(){if(!R3.capas)return;var n=Pantalla.escala3D<0.8?3:CAPAS_PASTO;R3.capas.forEach(function(m,i){m.visible=i<n;});}
/* ---------------- lo de alrededor: banderines, bancos, techos, fotógrafos ---------------- */
function banderines(G){
  R3.banderas=[];
  var palo=new THREE.MeshStandardMaterial({color:0xf0f0f0,roughness:0.4}), tela=new THREE.MeshStandardMaterial({color:0xffd23a,side:THREE.DoubleSide,roughness:0.7});
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){
    var x=c[0]*ANCHO_C/2, z=c[1]*LARGO/2;
    var p=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.5,6),palo);p.position.set(x,0.75,z);p.castShadow=true;G.add(p);
    var geo=new THREE.PlaneGeometry(0.42,0.3,6,1);geo.translate(0.21,0,0);
    var f=new THREE.Mesh(geo,tela);f.position.set(x,1.35,z);f.castShadow=true;G.add(f);
    R3.banderas.push({m:f,base:geo.attributes.position.array.slice(),fase:Math.random()*6});
  });
}
function pasarBanderas(t){
  if(!R3.banderas)return;
  R3.banderas.forEach(function(b){var P=b.m.geometry.attributes.position.array, B=b.base;
    for(var i=0;i<P.length;i+=3){var x=B[i];P[i+2]=Math.sin(t*6+x*9+b.fase)*x*0.35;P[i]=B[i]*(1-Math.abs(Math.sin(t*3+b.fase))*0.05);}
    b.m.geometry.attributes.position.needsUpdate=true;b.m.rotation.y=Math.sin(t*0.7+b.fase)*0.4;});
  if(R3.leds)R3.leds.forEach(function(tx){tx.offset.x=(t*0.035)%1;});
}
function bancos(G,A){
  /* dos bancos de suplentes con techo de acrílico, en las esquinas de atrás de tu arco */
  var acr=new THREE.MeshStandardMaterial({color:0x9ad8ff,transparent:true,opacity:0.35,roughness:0.1,metalness:0.1,side:THREE.DoubleSide});
  var asiento=new THREE.MeshStandardMaterial({color:col(A.gradas[0]),roughness:0.5});
  var estruct=new THREE.MeshStandardMaterial({color:0xd8dce8,metalness:0.6,roughness:0.35});
  [-1,1].forEach(function(l){
    var g=new THREE.Group();g.position.set(l*4.9,0,LARGO/2+1.1);g.rotation.y=Math.PI;G.add(g);
    var fondo=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.6,0.06),acr);fondo.position.set(0,0.8,-0.55);g.add(fondo);
    var techo=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,2.6,16,1,true,0,Math.PI*0.6),acr);techo.rotation.z=Math.PI/2;techo.rotation.y=0;techo.position.set(0,1.1,-0.1);g.add(techo);
    for(var k=0;k<4;k++){var s2=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.08,0.45),asiento);s2.position.set(-0.9+k*0.6,0.45,-0.3);s2.castShadow=true;g.add(s2);
      var r=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.45,0.06),asiento);r.position.set(-0.9+k*0.6,0.7,-0.5);g.add(r);}
    [-1.25,1.25].forEach(function(x){var c=new THREE.Mesh(new THREE.BoxGeometry(0.06,1.8,0.06),estruct);c.position.set(x,0.9,-0.5);g.add(c);});
  });
}
function techosTribunas(G,A){
  var mat=new THREE.MeshStandardMaterial({color:0xf2f4f8,roughness:0.45,metalness:0.3,side:THREE.DoubleSide});
  var col_=new THREE.MeshStandardMaterial({color:0x9098b0,roughness:0.4,metalness:0.6});
  var x0=ANCHO_C/2+1.6, largo=LARGO-2;
  [-1,1].forEach(function(l){
    var t=new THREE.Mesh(new THREE.BoxGeometry(5.2,0.12,largo+0.6),mat);t.position.set(l*(x0+2.2),4.3,0);t.rotation.z=l*0.12;t.castShadow=true;t.receiveShadow=true;G.add(t);
    /* el borde con luces */
    var borde=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.3,largo+0.6),new THREE.MeshBasicMaterial({color:col(A.tablero[1]),toneMapped:false}));borde.position.set(l*(x0-0.35),4.0,0);G.add(borde);
    for(var k=0;k<5;k++){var c=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,4.4,8),col_);c.position.set(l*(x0+4.4),2.2,-largo/2+k*largo/4);c.castShadow=true;G.add(c);}
  });
}
function fotografos(G){
  var ropa=new THREE.MeshStandardMaterial({color:0x2a3a5a,roughness:0.8}), chaleco=new THREE.MeshStandardMaterial({color:0xff8a1a,roughness:0.7}), cam=new THREE.MeshStandardMaterial({color:0x111116,roughness:0.3,metalness:0.4});
  var piel=new THREE.MeshStandardMaterial({color:0xc08a60,roughness:0.6});
  [-3.4,-2.6,2.8,3.6].forEach(function(x,i){
    var g=new THREE.Group();g.position.set(x,0,-LARGO/2-1.0);g.rotation.y=(x<0?0.3:-0.3);G.add(g);
    var cuerpo=new THREE.Mesh(new THREE.CapsuleGeometry(0.2,0.3,4,8),chaleco);cuerpo.position.y=0.55;cuerpo.castShadow=true;g.add(cuerpo);
    var pier=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.2,0.5),ropa);pier.position.set(0,0.1,0.15);g.add(pier);
    var cab=new THREE.Mesh(new THREE.SphereGeometry(0.12,10,8),piel);cab.position.y=0.95;g.add(cab);
    var c=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.11,0.12),cam);c.position.set(0,0.92,0.17);g.add(c);
    var lente=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.05,0.3,10),cam);lente.rotation.x=Math.PI/2;lente.position.set(0,0.92,0.36);g.add(lente);
  });
}
/* ---------------- los arcos, con la red que se infla ---------------- */
function armarArcos(G){
  var palo=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.35,metalness:0.1});
  [Z_MIO,Z_RIVAL].forEach(function(z,idx){
    var s=z>0?1:-1, g=new THREE.Group();g.position.z=z;G.add(g);
    var canos=[], m4=new THREE.Matrix4(), q=new THREE.Quaternion();
    var cil=function(x1,y1,z1,x2,y2,z2,r){var a=new THREE.Vector3(x1,y1,z1),b=new THREE.Vector3(x2,y2,z2),d=b.clone().sub(a);
      var c=new THREE.CylinderGeometry(r,r,d.length(),10);q.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
      m4.compose(a.clone().add(b).multiplyScalar(0.5),q,new THREE.Vector3(1,1,1));c.applyMatrix4(m4);canos.push(c);};
    var w=ARCO_W/2, h=ARCO_H, p=ARCO_P*s;
    cil(-w,0,0,-w,h,0,0.06);cil(w,0,0,w,h,0,0.06);cil(-w,h,0,w,h,0,0.06);
    cil(-w,h,0,-w,h*0.8,p,0.03);cil(w,h,0,w,h*0.8,p,0.03);cil(-w,h*0.8,p,w,h*0.8,p,0.03);cil(-w,0,p,w,0,p,0.03);
    cil(-w,0,p,-w,h*0.8,p,0.03);cil(w,0,p,w,h*0.8,p,0.03);
    var arcoM=new THREE.Mesh(fundir(canos),palo);arcoM.castShadow=true;g.add(arcoM);
    /* la red: una malla de puntos en el fondo y los costados, dibujada con líneas; el fondo se deforma */
    var nx=22, ny=11, pts=[], base=[];
    for(var j=0;j<=ny;j++)for(var i=0;i<=nx;i++){var x=-w+i/nx*ARCO_W, y=j/ny*h*0.8;base.push(x,y,p);pts.push(x,y,p);}
    var idxs=[];for(var j2=0;j2<=ny;j2++)for(var i2=0;i2<=nx;i2++){var k=j2*(nx+1)+i2;if(i2<nx)idxs.push(k,k+1);if(j2<ny)idxs.push(k,k+nx+1);}
    /* techo y costados */
    var extra=[], ex=function(a,b){var o=pts.length/3;pts.push(a[0],a[1],a[2],b[0],b[1],b[2]);base.push(a[0],a[1],a[2],b[0],b[1],b[2]);idxs.push(o,o+1);};
    for(var i3=0;i3<=nx;i3+=1){var x3=-w+i3/nx*ARCO_W;ex([x3,h,0],[x3,h*0.8,p]);}
    for(var t=0;t<=6;t++){var f=t/6;ex([-w,h*0.8*f+h*0.2*f*0,p*f],[-w,0,p*f]);ex([w,h*0.8*f,p*f],[w,0,p*f]);}
    for(var j4=0;j4<=ny;j4++){var y4=j4/ny*h;ex([-w,y4,0],[-w,Math.min(y4,h*0.8),p]);ex([w,y4,0],[w,Math.min(y4,h*0.8),p]);}
    var geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));geo.setIndex(idxs);
    var red=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.75}));
    g.add(red);
    R3.redes.push({geo:geo,base:new Float32Array(base),nFondo:(nx+1)*(ny+1),golpe:0,gx:0,gy:0,s:s,z:z});
  });
}
/* la red se infla donde entró la pelota y tiembla un rato */
function golpeRed(lado,x,y,fuerza){var R=R3.redes[lado];R.golpe=Math.min(1.4,fuerza);R.gx=x;R.gy=y;R.t0=R3.t;}
function pasarRedes(){
  R3.redes.forEach(function(R){
    if(R.golpe<=0.001&&!R.sucia)return;
    var P=R.geo.attributes.position.array, B=R.base, dt=R3.t-(R.t0||0);
    var amp=R.golpe*Math.exp(-dt*2.2)*Math.cos(dt*14)*0.55;
    for(var k=0;k<R.nFondo;k++){var x=B[k*3], y=B[k*3+1], d=((x-R.gx)*(x-R.gx)+(y-R.gy)*(y-R.gy));
      P[k*3+2]=B[k*3+2]+R.s*amp*Math.exp(-d*0.9);}
    R.geo.attributes.position.needsUpdate=true;R.sucia=Math.abs(amp)>0.002;if(!R.sucia)R.golpe=0;
  });
}
/* ---------------- los tableros con cartel y el alambrado ---------------- */
function armarTableros(G,A){
  var tc=texImg('carteles',true)||lienzoTex(512,64,function(g,w,h){g.fillStyle=lin(g,0,0,w,0,[[0,A.tablero[0]],[1,A.tablero[1]]]);g.fillRect(0,0,w,h);},true);
  var matT=new THREE.MeshStandardMaterial({map:tc,roughness:0.6,emissive:A.noche?0x222244:0x000000,emissiveMap:A.noche?tc:null});
  var alto=0.9, hw=ANCHO_C/2+0.6, hl=LARGO/2+0.4;
  R3.leds=[];
  var tabla=function(x,z,l,giro){var t=tc.clone();t.needsUpdate=true;t.repeat.set(l/8,1);R3.leds.push(t);
    var m=new THREE.Mesh(new THREE.BoxGeometry(l,alto,0.12),new THREE.MeshStandardMaterial({map:t,roughness:0.5,emissive:0xffffff,emissiveIntensity:A.noche?0.9:0.35,emissiveMap:t}));
    m.position.set(x,alto/2,z);m.rotation.y=giro;m.castShadow=true;m.receiveShadow=true;G.add(m);};
  tabla(-hw,0,LARGO+0.8,Math.PI/2);tabla(hw,0,LARGO+0.8,Math.PI/2);
  var lado=(hw*2-ARCO_W-0.4)/2;
  [hl,-hl].forEach(function(z){tabla(-hw+lado/2,z,lado,0);tabla(hw-lado/2,z,lado,0);});
  /* el alambrado arriba de los tableros, con postes */
  var tt=texTejido();tt.repeat.set(30,3);
  var mat=new THREE.MeshBasicMaterial({map:tt,transparent:true,alphaTest:0.3,side:THREE.DoubleSide,color:A.noche?0x8890b0:0xffffff});
  var cerco=function(x,z,l,giro,h){var t2=tt.clone();t2.needsUpdate=true;t2.repeat.set(l*2.2,h*2.2);
    var m=new THREE.Mesh(new THREE.PlaneGeometry(l,h),new THREE.MeshBasicMaterial({map:t2,transparent:true,alphaTest:0.3,side:THREE.DoubleSide,color:A.noche?0x8890b0:0xffffff}));
    m.position.set(x,alto+h/2,z);m.rotation.y=giro;G.add(m);};
  cerco(-hw,0,LARGO+0.8,Math.PI/2,2.2);cerco(hw,0,LARGO+0.8,Math.PI/2,2.2);
  cerco(0,-hl-1.2,hw*2,0,3.2);
  var poste=new THREE.MeshStandardMaterial({color:0xd8dce8,roughness:0.4,metalness:0.6});
  var ps=[];for(var i=0;i<=8;i++){var z=-LARGO/2-0.4+i*(LARGO+0.8)/8;
    [-hw,hw].forEach(function(x){var c=new THREE.CylinderGeometry(0.04,0.04,3.1,6);c.translate(x,1.55,z);ps.push(c);});}
  G.add(new THREE.Mesh(fundir(ps),poste));
}
/* ---------------- las tribunas con la hinchada (una malla instanciada: una llamada) ---------------- */
function armarTribunas(G,A){
  var filas=5, largo=LARGO-2, x0=ANCHO_C/2+1.6;
  var mats=[new THREE.MeshStandardMaterial({color:col(A.gradas[0]),roughness:0.7}),new THREE.MeshStandardMaterial({color:col(A.gradas[1]),roughness:0.7})];
  var gente=[];
  [-1,1].forEach(function(lado){
    for(var f=0;f<filas;f++){
      var m=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.45*(f+1),largo),mats[f%2]);
      m.position.set(lado*(x0+f*0.9),0.225*(f+1),0);m.castShadow=true;m.receiveShadow=true;G.add(m);
      for(var k=0;k<24;k++){if(Math.random()<0.15)continue;gente.push([lado*(x0+f*0.9),0.45*(f+1),-largo/2+0.5+k*(largo-1)/23,lado]);}
    }
  });
  /* una persona = cuerpo + cabeza fundidos en una geometría, con color por instancia */
  var cuerpo=new THREE.CylinderGeometry(0.17,0.2,0.55,6);cuerpo.translate(0,0.28,0);
  var cabeza=new THREE.SphereGeometry(0.13,8,6);cabeza.translate(0,0.68,0);
  var geo=fundir([cuerpo,cabeza]);
  var im=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({roughness:0.8}),gente.length);
  var M=new THREE.Matrix4(), c=new THREE.Color(), camis=['#e8352a','#ffd23a','#2a8af0','#ffffff','#2ac06a','#ff7ab8','#8a4af0','#ff8a1a'];
  gente.forEach(function(p,i){M.makeRotationY(p[3]>0?-Math.PI/2:Math.PI/2);M.setPosition(p[0],p[1],p[2]);im.setMatrixAt(i,M);im.setColorAt(i,c.set(camis[i%camis.length]));});
  im.castShadow=false;G.add(im);
  R3.hinchada={im:im,pos:gente,salto:0,M:M};
}
function fundir(geos){
  var pos=[],nor=[],uv=[],idx=[],o=0;
  geos.forEach(function(g){g=g.index?g.toNonIndexed():g;var p=g.attributes.position.array,n=g.attributes.normal.array,u=g.attributes.uv?g.attributes.uv.array:null;
    for(var i=0;i<p.length;i++){pos.push(p[i]);nor.push(n[i]);}
    for(var j=0;j<p.length/3;j++){uv.push(u?u[j*2]:0,u?u[j*2+1]:0);idx.push(o+j);}o+=p.length/3;});
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return g;
}
/* la hinchada salta: más en los goles */
function pasarHinchada(dt){
  var H=R3.hinchada;if(!H)return;H.salto=Math.max(0,H.salto-dt*0.35);
  if(R3.cuadro%2)return;
  var M=H.M, t=R3.t;
  for(var i=0;i<H.pos.length;i++){var p=H.pos[i], b=Math.max(0,Math.sin(t*(3+i%5)+i))*(0.04+H.salto*0.35*((i*7)%3===0?1:0.6));
    M.makeRotationY(p[3]>0?-Math.PI/2:Math.PI/2);M.setPosition(p[0],p[1]+b,p[2]);H.im.setMatrixAt(i,M);}
  H.im.instanceMatrix.needsUpdate=true;
}
/* ---------------- el decorado: palmeras, carpas, sombrillas, puestos ---------------- */
function palmera(G,x,z,h,curva){
  var tronco=R3.matTronco||(R3.matTronco=new THREE.MeshStandardMaterial({color:0x8a6a44,roughness:0.9}));
  var th=R3.texHoja||(R3.texHoja=texHoja());
  var mh=R3.matHoja||(R3.matHoja=new THREE.MeshStandardMaterial({map:th,transparent:true,alphaTest:0.4,side:THREE.DoubleSide,roughness:0.8}));
  /* tronco: siete tramos fundidos en una malla; hojas: ocho tarjetas curvas en otra */
  var n=7, px=0, py=0, tramos=[], hojas=[], m4=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler();
  for(var i=0;i<n;i++){var c=new THREE.CylinderGeometry(0.16-i*0.012,0.2-i*0.012,h/n+0.05,7);var nx=Math.sin(i/n*1.4)*curva;
    e.set(0,0,-curva*0.12);q.setFromEuler(e);m4.compose(new THREE.Vector3(nx,py+h/n/2,0),q,new THREE.Vector3(1,1,1));c.applyMatrix4(m4);tramos.push(c);px=nx;py+=h/n;}
  for(var k=0;k<8;k++){var pl=new THREE.PlaneGeometry(1.1,3.6,1,4), pa=pl.attributes.position;
    for(var v=0;v<pa.count;v++){var yy=pa.getY(v);pa.setZ(v,-Math.pow((yy+1.8)/3.6,2)*1.2);}
    pl.translate(0,1.8,0);e.set(-1.0,k/8*TAU,0,'YXZ');q.setFromEuler(e);m4.compose(new THREE.Vector3(px,py,0),q,new THREE.Vector3(1,1,1));pl.applyMatrix4(m4);hojas.push(pl);}
  var t=new THREE.Mesh(fundir(tramos),tronco);t.position.set(x,0,z);t.castShadow=true;G.add(t);
  var hj=new THREE.Mesh(fundir(hojas),mh);hj.position.set(x,0,z);hj.castShadow=true;G.add(hj);
}
function carpa(G,x,z,col1,col2,r){
  var m=new THREE.Mesh(new THREE.ConeGeometry(r,r*1.1,4),new THREE.MeshStandardMaterial({color:col(col1),roughness:0.7}));
  m.position.set(x,r*1.1/2+1.4,z);m.rotation.y=Math.PI/4;m.castShadow=true;G.add(m);
  var b=new THREE.Mesh(new THREE.BoxGeometry(r*1.3,1.4,r*1.3),new THREE.MeshStandardMaterial({color:col(col2),roughness:0.8}));b.position.set(x,0.7,z);b.castShadow=true;G.add(b);
}
var SOMB=null;
function sombrilla(G,x,z,c){
  if(!SOMB)SOMB={telas:{},palos:[]};
  var t=new THREE.ConeGeometry(1.1,0.45,10);t.translate(x,2.1,z);(SOMB.telas[c]=SOMB.telas[c]||[]).push(t);
  var p=new THREE.CylinderGeometry(0.03,0.03,2.1,5);p.translate(x,1.05,z);SOMB.palos.push(p);
  var m=new THREE.CylinderGeometry(0.45,0.45,0.05,10);m.translate(x,0.75,z);SOMB.palos.push(m);
}
function fundirSombrillas(G){
  if(!SOMB)return;
  Object.keys(SOMB.telas).forEach(function(c){var m=new THREE.Mesh(fundir(SOMB.telas[c]),new THREE.MeshStandardMaterial({color:col(c),roughness:0.7}));m.castShadow=true;G.add(m);});
  G.add(new THREE.Mesh(fundir(SOMB.palos),new THREE.MeshStandardMaterial({color:0xe8dcc8,roughness:0.6})));SOMB=null;
}
function armarDecorado(G,A,id){
  var cols=['#ff4fa0','#ffd23a','#2adfff','#8a4af0','#4fc21a','#ff8a1a'];
  var lugares=[[-11,-8],[11,-10],[-12,4],[12,6],[-9,15],[9,16],[-15,-16],[15,-18],[0,-19],[-6,-20],[6,-21]];
  lugares.forEach(function(p,i){palmera(G,p[0],p[1],5.5+(i%3),i%2?0.8:-0.8);});
  if(id!=='terraza'){
    [[-15,-4],[16,-2],[-17,10],[17,12],[-10,-24],[10,-25]].forEach(function(p,i){carpa(G,p[0],p[1],cols[i%6],cols[(i+2)%6],2.2);});
    for(var i=0;i<10;i++){sombrilla(G,(i%2?1:-1)*(10+(i*37)%6),-14+i*3.2,cols[i%6]);}
    fundirSombrillas(G);
  } else {
    /* terraza: baranda, tanques de agua y equipos de aire */
    var bar=new THREE.MeshStandardMaterial({color:0xd8d0c8,roughness:0.6});
    for(var k=0;k<4;k++){var l=40, m=new THREE.Mesh(new THREE.BoxGeometry(l,1.1,0.2),bar);m.position.set(k<2?0:(k===2?-20:20),0.55,k<2?(k?-20:20):0);if(k>=2)m.rotation.y=Math.PI/2;G.add(m);}
    [[-13,-12],[14,-9],[-14,8]].forEach(function(p){var t=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,2.2,14),new THREE.MeshStandardMaterial({color:0x4a6ad0,roughness:0.5}));t.position.set(p[0],2.6,p[1]);t.castShadow=true;G.add(t);
      var b=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.5,2.6),bar);b.position.set(p[0],0.75,p[1]);G.add(b);});
    [[12,4],[-12,-3],[13,13]].forEach(function(p,i){carpa(G,p[0],p[1],cols[i*2],cols[i*2+1],1.8);});
  }
}
function armarReflectores(G){
  var mp=new THREE.MeshStandardMaterial({color:0x8890a8,metalness:0.6,roughness:0.4});
  var ml=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  [[-10,-14],[10,-14],[-10,14],[10,14]].forEach(function(p){
    var poste=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,14,8),mp);poste.position.set(p[0],7,p[1]);G.add(poste);
    var panel=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.2,0.3),ml);panel.position.set(p[0]*0.96,14,p[1]*0.96);panel.lookAt(0,0,0);G.add(panel);
    var l=new THREE.PointLight(0xdfe8ff,60,40,1.6);l.position.set(p[0]*0.9,12,p[1]*0.9);R3.escena.add(l);R3.luces.push(l);
  });
}
/* ---------------- la pelota y su estela ---------------- */
function crearPelota(){
  var m=new THREE.Mesh(new THREE.SphereGeometry(R_PELOTA,28,18),new THREE.MeshStandardMaterial({map:texPelota('clasica'),roughness:0.45}));
  m.castShadow=true;R3.escena.add(m);R3.pelota=m;
  /* la sombra de contacto: un disco oscuro que se achica con la altura (la del sol sola no alcanza para leer la altura) */
  var s=new THREE.Mesh(new THREE.CircleGeometry(0.16,16),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.35,depthWrite:false}));
  s.rotation.x=-Math.PI/2;R3.escena.add(s);R3.sombraPelota=s;
}
function vestirPelota(estilo){R3.pelota.material.map=texPelota(estilo);R3.pelota.material.needsUpdate=true;}
var N_ESTELA=26;
function crearEstela(){
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(N_ESTELA*2*3),3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(N_ESTELA*2*4),4));
  var idx=[];for(var i=0;i<N_ESTELA-1;i++){var a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}g.setIndex(idx);
  var m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
  m.frustumCulled=false;R3.escena.add(m);R3.estela={m:m,pts:[],estilo:'sol'};
}
/* la estela es una cinta de las últimas posiciones, siempre de cara a la cámara */
function pasarEstela(p,activa,estilo,ancho){
  var E=R3.estela;
  if(activa){E.pts.unshift(p.clone());if(E.pts.length>N_ESTELA)E.pts.pop();}
  else if(E.pts.length)E.pts.pop();
  var pos=E.m.geometry.attributes.position.array, cl=E.m.geometry.attributes.color.array, cam=R3.cam.position;
  var C=ESTELAS[estilo]||ESTELAS.sol, a=new THREE.Color(), b=new THREE.Color(), tmp=new THREE.Color();a.set(C[0]);b.set(C[1]);
  var lado=new THREE.Vector3(), dir=new THREE.Vector3(), aCam=new THREE.Vector3();
  for(var i=0;i<N_ESTELA;i++){
    var q=E.pts[Math.min(i,E.pts.length-1)];
    if(!q){for(var z=0;z<6;z++)pos[i*6+z]=0;cl[i*8+3]=cl[i*8+7]=0;continue;}
    var q2=E.pts[Math.min(i+1,E.pts.length-1)]||q;dir.subVectors(q,q2);if(dir.lengthSq()<1e-6)dir.set(0,0,1);
    aCam.subVectors(cam,q);lado.crossVectors(dir,aCam).normalize();
    var k=i/(N_ESTELA-1), w=(ancho||0.12)*(1-k*0.85);
    pos[i*6]=q.x+lado.x*w;pos[i*6+1]=q.y+lado.y*w;pos[i*6+2]=q.z+lado.z*w;
    pos[i*6+3]=q.x-lado.x*w;pos[i*6+4]=q.y-lado.y*w;pos[i*6+5]=q.z-lado.z*w;
    if(C[2]==='arcoiris')tmp.setHSL((k*0.9+R3.t*0.3)%1,1,0.55);else tmp.copy(a).lerp(b,k);
    var al=(1-k)*(i<E.pts.length?0.95:0);
    for(var s2=0;s2<2;s2++){cl[i*8+s2*4]=tmp.r;cl[i*8+s2*4+1]=tmp.g;cl[i*8+s2*4+2]=tmp.b;cl[i*8+s2*4+3]=al;}
  }
  E.m.geometry.attributes.position.needsUpdate=true;E.m.geometry.attributes.color.needsUpdate=true;
}
/* ---------------- la cámara: se acerca suave a donde el partido la pide, con temblor ---------------- */
function pasarCamara(dt){
  var C=R3.camObj, cam=R3.cam, k=1-Math.pow(0.02,dt);
  cam.position.lerp(C.pos,k);
  if(!R3.miraAct)R3.miraAct=C.mira.clone();R3.miraAct.lerp(C.mira,k);
  if(Math.abs(cam.fov-C.fov)>0.01){cam.fov+=(C.fov-cam.fov)*k;cam.updateProjectionMatrix();}
  cam.lookAt(R3.miraAct);
  if(R3.sacude>0.01){cam.position.x+=(Math.random()-0.5)*R3.sacude*0.15;cam.position.y+=(Math.random()-0.5)*R3.sacude*0.15;R3.sacude*=Math.pow(0.01,dt);}
}
function camaraYa(){var C=R3.camObj;R3.cam.position.copy(C.pos);R3.cam.fov=C.fov;R3.cam.updateProjectionMatrix();R3.miraAct=C.mira.clone();R3.cam.lookAt(R3.miraAct);}
/* de un punto del mundo a la pantalla, en unidades de diseño (para dibujar la interfaz encima) */
var _v=new THREE.Vector3();
function aPantalla(p){_v.copy(p).project(R3.cam);return{x:(_v.x+1)/2*ANCHO,y:(1-_v.y)/2*ALTO,atras:_v.z>1};}
/* de un punto de la pantalla a un rayo del mundo, cortado con el plano z = z0 */
var _ray=new THREE.Raycaster();
function rayoAPlanoZ(sx,sy,z0){
  _ray.setFromCamera(new THREE.Vector2(sx/ANCHO*2-1,-(sy/ALTO*2-1)),R3.cam);
  var o=_ray.ray.origin, d=_ray.ray.direction;if(Math.abs(d.z)<1e-5)return null;
  var t=(z0-o.z)/d.z;if(t<0)return null;
  return new THREE.Vector3(o.x+d.x*t,o.y+d.y*t,z0);
}
function dibujar3D(){
  var r=R3.renderer;r.info.reset();
  if(R3.post&&R3.composer)R3.composer.render();else r.render(R3.escena,R3.cam);
}
