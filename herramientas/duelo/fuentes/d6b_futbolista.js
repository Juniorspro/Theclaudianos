/* ---------------- los futbolistas: modelo con esqueleto y 22 animaciones de captura de movimiento ----------------
   La malla la generó Rezona. El esqueleto (24 huesos) y 14 animaciones salen de la biblioteca de mocap de Meshy
   (vía Higgsfield): patada, carrera, sprint, caminata, tres idles, dos lamentos, tres festejos, levantarse y el
   salto de atajada. Las tres estiradas del arquero (y sus espejos) y su postura de espera se sacaron de videos de
   referencia con MediaPipe: un «DeepMotion» casero (herramientas/duelo/modelos, ver memoria/duelo.md).
   Encima de los clips van capas por código: IK de manos hacia la pelota en la estirada, IK de la pierna en el
   contacto de la patada y en el jueguito, cabeza que sigue la pelota, pies apoyados en el piso. */
var MODELOS={};
function cargarModelos(listo){
  var A=window.ARCHIVOS||{}, nombres=['jugador-rojo','jugador-amarillo'], faltan=nombres.length, L=new GLTFLoader();
  var uno=function(){if(--faltan===0)listo();};
  nombres.forEach(function(n){
    var d=A[n];if(!d){uno();return;}
    try{var bin=atob(d.slice(d.indexOf(',')+1)), buf=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
      L.parse(buf.buffer,'',function(g){MODELOS[n]=g;uno();},function(e){console.warn('modelo',n,e);uno();});}catch(e){uno();}
  });
}
var _q=new THREE.Quaternion(), _q2=new THREE.Quaternion(), _p0=new THREE.Vector3(), _p1=new THREE.Vector3(), _p2=new THREE.Vector3(), _p3=new THREE.Vector3();
function posEnRaiz(J,o,v){o.getWorldPosition(v);return J.raiz.worldToLocal(v);}
/* estado del juego → clips (con variantes); UNA_VEZ = los que se tocan una sola vez y quedan en el último cuadro */
var CLIPS_DE={quieto:['quieto'],parado:['parado'],espera:['listo'],arquero:['arquero_listo'],correr:['carrera'],
  patear:['patada'],festejar:['puno','salto_brazos','musculos'],lamento:['lamento','bronca'],malabares:['quieto'],volada:['estirada_alta_izq']};
var UNA_VEZ=/^(patada|puno|salto_brazos|musculos|lamento|bronca|atrapa|estirada_|vuelo_)/;
/* qué hace cada estado cuando su clip de un tiro termina */
var LUEGO={festejar:'quieto',lamento:'quieto'};
function crearFutbolista(nombre,o){
  var g=MODELOS[nombre];if(!g||!g.animations.length)return null;
  var m=SkeletonUtils.clone(g.scene);
  var J={glb:true,num:o.numero||9,raiz:new THREE.Group(),modelo:m,x:0,z:0,y:0,giro:0,anim:'quieto',t:0,p:0,te:0,var:0,h:{},
    pesos:{},acc:{},meta:{},animPrev:null,clip:null,apoyo:0,fase:0,xPrev:0,guante:0,nombre:nombre};
  J.raiz.add(m);R3.escena.add(J.raiz);
  m.traverse(function(q){if(q.isBone)J.h[q.name]=q;if(q.isSkinnedMesh){q.castShadow=true;q.receiveShadow=false;q.frustumCulled=false;
    q.material=q.material.clone();J.malla=q;}});
  /* tamaño (1,80 m, apoyado en el piso: la caja de una malla con esqueleto es la de reposo) */
  m.updateMatrixWorld(true);var caja=new THREE.Box3().setFromObject(m), alto=caja.max.y-caja.min.y, s=(o.alto||1.8)/alto;
  m.scale.multiplyScalar(s);m.updateMatrixWorld(true);caja.setFromObject(m);m.position.y-=caja.min.y;J.escala=s;
  /* hacia dónde mira: la punta del pie adelante del talón; se gira para que mire a -z */
  m.updateMatrixWorld(true);
  var pie=posEnRaiz(J,J.h.LeftFoot,new THREE.Vector3()), punta=posEnRaiz(J,J.h.LeftToeBase,new THREE.Vector3()), f=punta.sub(pie);f.y=0;f.normalize();
  m.rotation.y=Math.PI-Math.atan2(f.x,f.z);m.updateMatrixWorld(true);
  /* la cadera de reposo sobre el origen (los clips vienen centrados en ella): el cuerpo queda donde el juego cree */
  var hc=posEnRaiz(J,J.h.Hips,new THREE.Vector3());m.position.x-=hc.x;m.position.z-=hc.z;m.updateMatrixWorld(true);
  J.base=m.position.clone();
  var mat=J.malla.material;mat.metalness=0;mat.roughness=0.68;mat.envMapIntensity=0.85;
  J.texOriginal=mat.map&&mat.map.image;J.mapas={};
  /* viajes de la cadera (lo que se sacó de los clips que se desplazan: el juego lo aplica y lo escala) */
  J.viajes=(window.ARCHIVOS||{})[nombre.replace('jugador','viajes')]||{};
  analizarClips(J,g.animations);
  /* el mezclador: una acción por clip, el tiempo lo pone el código cada cuadro */
  J.mixer=new THREE.AnimationMixer(m);
  g.animations.forEach(function(c){var a=J.mixer.clipAction(c);a.setLoop(THREE.LoopRepeat);a.timeScale=0;a.play();a.setEffectiveWeight(0);a.enabled=false;
    J.acc[c.name]=a;J.pesos[c.name]=0;});
  prepararGuantes(J,o.guantes||'#2adf6a');prepararDorsal(J);
  J.huesos=J.malla.skeleton.bones;J.limpio=J.huesos.map(function(b){return b.quaternion.clone();});J.limpioP=J.h.Hips.position.clone();
  return J;
}
/* ---------------- lo que se mide de cada clip al cargar (tiempos de contacto, alcance, apoyo) ---------------- */
function analizarClips(J,clips){
  var mx=new THREE.AnimationMixer(J.modelo), por={};clips.forEach(function(c){por[c.name]=c;});
  var P=function(n){return posEnRaiz(J,J.h[n],new THREE.Vector3());};
  var muestra=function(nom,fn){var c=por[nom];if(!c)return;mx.stopAllAction();var a=mx.clipAction(c);a.reset().play();
    var fps=30,n=Math.round(c.duration*fps)+1;for(var i=0;i<n;i++){mx.setTime(Math.min(c.duration-1e-4,i/fps));J.modelo.updateMatrixWorld(true);fn(i/fps,i,c);}
    a.stop();mx.uncacheAction(c);};
  var M=J.meta;
  /* los pies apoyados: se miden en la pose de reposo (la malla está sobre el piso). Ojo: no en un clip,
     el idle de Meshy viene flotando 17 cm */
  J.modelo.updateMatrixWorld(true);
  M.puntaY=Math.min(P('LeftToeBase').y,P('RightToeBase').y);M.tobilloY=Math.min(P('LeftFoot').y,P('RightFoot').y);
  /* patada: el contacto es el cuadro de mayor velocidad adelante (−z) de la punta derecha cerca del piso */
  var prev=null, mejor=null;
  muestra('patada',function(t,i){var p=P('RightToeBase');if(prev){var v=-(p.z-prev.z)*30;if(p.y<0.32&&(!mejor||v>mejor.v))mejor={v:v,t:t,p:p.clone()};}prev=p.clone();});
  if(mejor){M.patada={tc:mejor.t,pie:mejor.p,t0:Math.max(0,mejor.t-0.32)};}
  /* estiradas: arranque (el viaje pasa el 4 %), atajada (mano más lejos del cuerpo) y dónde está la mano ahí */
  Object.keys(por).forEach(function(nom){
    if(!/^(estirada_|vuelo_|atrapa)/.test(nom))return;
    var v=J.viajes[nom], mejorA=null, izq=/izq/.test(nom)||nom==='atrapa';
    var tot=v?v.x[v.x.length-1]:0, fpsV=v?v.fps:30, t0=0;
    if(v){for(var k=0;k<v.x.length;k++){if(Math.abs(v.x[k])>Math.abs(tot)*0.1){t0=Math.max(0,k/fpsV-0.1);break;}}}
    var hipMin=null;
    muestra(nom,function(t){var l=P('LeftHand'), r=P('RightHand');
      /* hacia el lado de la estirada: la izquierda del jugador es −x en el marco del juego */
      var lat=function(q){return izq?-q.x:q.x;};
      var mano=lat(l)>lat(r)?l:r, a=lat(mano)+Math.max(0,mano.y-1.2)*0.35;
      if(t>=t0&&(!mejorA||a>mejorA.a))mejorA={a:a,t:t,lat:lat(mano),y:mano.y};
      var hy=P('Hips').y;if(t>t0+0.4&&(!hipMin||hy<hipMin.y))hipMin={t:t,y:hy};});
    var vc=v?interp(v.x,(mejorA?mejorA.t:0)*fpsV):0;
    M[nom]={t0:t0,tAt:mejorA?mejorA.t:0.6,alcance:mejorA?mejorA.lat:0.8,yMano:mejorA?mejorA.y:1.5,viajeAt:Math.abs(vc),viajeTot:Math.abs(tot),tYace:hipMin?hipMin.t:1.2};
  });
  mx.stopAllAction();
}
function interp(arr,i){if(!arr||!arr.length)return 0;if(i<=0)return arr[0];if(i>=arr.length-1)return arr[arr.length-1];var k=Math.floor(i),f=i-k;return arr[k]*(1-f)+arr[k+1]*f;}
/* ---------------- guantes: se pintan en la malla (por el peso de los huesos de la mano), no son pelotas pegadas ---------------- */
function prepararGuantes(J,color){
  var geo=J.malla.geometry, si=geo.attributes.skinIndex, sw=geo.attributes.skinWeight, n=si.count, gw=new Float32Array(n);
  var hs=J.malla.skeleton.bones, iL=hs.indexOf(J.h.LeftHand), iR=hs.indexOf(J.h.RightHand);
  /* los atributos pueden venir entrelazados (así los escribe gltf-transform): se leen con getX..getW, nunca con .array */
  var comp=function(at,i,k){return k===0?at.getX(i):k===1?at.getY(i):k===2?at.getZ(i):at.getW(i);};
  /* el pesado automático «filtra» un poco de mano a vértices lejanos (puntitos en el torso): sólo cuenta cerca
     de la muñeca, medido en la pose de reposo (la posición del hueso sale de su matriz inversa de unión) */
  var pos=geo.attributes.position, muL=new THREE.Vector3().setFromMatrixPosition(J.malla.skeleton.boneInverses[iL].clone().invert()),
    muR=new THREE.Vector3().setFromMatrixPosition(J.malla.skeleton.boneInverses[iR].clone().invert()), v=new THREE.Vector3(), bm=J.malla.bindMatrix;
  var largoMano=muL.distanceTo(new THREE.Vector3().setFromMatrixPosition(J.malla.skeleton.boneInverses[hs.indexOf(J.h.LeftForeArm)].clone().invert()))*0.62;
  for(var i=0;i<n;i++){var w=0;for(var k=0;k<4;k++){var b=comp(si,i,k);if(b===iL||b===iR)w+=comp(sw,i,k);}
    if(w>0){v.fromBufferAttribute(pos,i);var dm=Math.min(v.distanceTo(muL),v.distanceTo(muR));w*=1-Math.min(1,Math.max(0,(dm-largoMano)/(largoMano*0.35)));}
    gw[i]=w;}
  geo.setAttribute('aGuante',new THREE.BufferAttribute(gw,1));
  J.uGuante={value:0};J.uColGuante={value:col(color)};
  var mat=J.malla.material;
  mat.onBeforeCompile=function(sh){
    sh.uniforms.uGuante=J.uGuante;sh.uniforms.uColGuante=J.uColGuante;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aGuante;\nvarying float vGuante;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvGuante=aGuante;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uGuante;\nuniform vec3 uColGuante;\nvarying float vGuante;')
      .replace('#include <map_fragment>','#include <map_fragment>\n{float gm=smoothstep(0.5,0.66,vGuante)*uGuante;float pu=smoothstep(0.34,0.44,vGuante)*(1.0-smoothstep(0.5,0.58,vGuante))*uGuante;'+
        'float lu=dot(diffuseColor.rgb,vec3(0.3,0.59,0.11));diffuseColor.rgb=mix(diffuseColor.rgb,uColGuante*(0.62+0.8*lu),gm);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.92),pu);}');
  };
  mat.customProgramCacheKey=function(){return 'futbolista-guante';};
  J.guantes=[];J.mats={guante:{color:J.uColGuante.value}};
}
function ponerGuantes(J,si){
  J.uGuante.value+=((si?1:0)-J.uGuante.value)*0.35;
  var e=1+0.14*J.uGuante.value;J.h.LeftHand.scale.setScalar(e);J.h.RightHand.scale.setScalar(e);
}
/* ---------------- el número se pinta en la espalda de la textura (se deforma con la camiseta) ----------------
   Se buscan los triángulos de la espalda en la pose de reposo y, para cada uno, la transformación afín de la
   espalda (en metros) a su lugar en la textura: así el número cruza las costuras sin cortarse. */
function prepararDorsal(J){
  var geo=J.malla.geometry, pos=geo.attributes.position, uv=geo.attributes.uv, ix=geo.index;if(!uv)return;
  var caja=new THREE.Box3();for(var i=0;i<pos.count;i+=5)caja.expandByPoint(_p0.fromBufferAttribute(pos,i));
  var H=caja.max.y-caja.min.y, y0=caja.min.y+H*0.615, y1=caja.min.y+H*0.775, cx=(caja.min.x+caja.max.x)/2, x0=cx-H*0.075, x1=cx+H*0.075;
  /* la espalda: en el GLB el jugador mira a +z (el eje menos profundo del cuerpo es z) */
  var zmid=(caja.min.z+caja.max.z)/2, tris=[], A=new THREE.Vector3(), B=new THREE.Vector3(), C=new THREE.Vector3(), N=new THREE.Vector3();
  var nt=ix?ix.count/3:pos.count/3;
  for(var t=0;t<nt;t++){
    var a=ix?ix.getX(t*3):t*3, b=ix?ix.getX(t*3+1):t*3+1, c=ix?ix.getX(t*3+2):t*3+2;
    A.fromBufferAttribute(pos,a);B.fromBufferAttribute(pos,b);C.fromBufferAttribute(pos,c);
    var mx_=(A.x+B.x+C.x)/3, my=(A.y+B.y+C.y)/3, mz=(A.z+B.z+C.z)/3;
    if(my<y0-0.03||my>y1+0.03||mx_<x0-0.03||mx_>x1+0.03||mz>zmid)continue;
    N.subVectors(B,A).cross(_p1.subVectors(C,A)).normalize();if(N.z>-0.3)continue;
    tris.push([A.x,A.y,uv.getX(a),uv.getY(a),B.x,B.y,uv.getX(b),uv.getY(b),C.x,C.y,uv.getX(c),uv.getY(c)]);
  }
  J.dorsal={tris:tris,x0:x0,x1:x1,y0:y0,y1:y1};
}
function pintarDorsal(g,W,H,J,colTexto,colBorde){
  var D=J.dorsal;if(!D||!D.tris.length)return;
  var nw=256, nh=Math.round(256*(D.y1-D.y0)/(D.x1-D.x0)), cv=document.createElement('canvas');cv.width=nw;cv.height=nh;var c=cv.getContext('2d');
  c.font='900 '+Math.round(nh*0.86)+'px "Arial Black",Arial';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
  c.lineWidth=nh*0.09;c.strokeStyle=colBorde;c.strokeText(String(J.num),nw/2,nh*0.54);c.fillStyle=colTexto;c.fillText(String(J.num),nw/2,nh*0.54);
  /* de la imagen del número a la espalda: vista desde atrás, la izquierda de la imagen es +x del GLB */
  var ax=-(D.x1-D.x0)/nw, bx=D.x1, ay=-(D.y1-D.y0)/nh, by=D.y1;
  D.tris.forEach(function(t){
    var X0=t[0],Y0=t[1],X1=t[4],Y1=t[5],X2=t[8],Y2=t[9], u0=t[2]*W,v0=t[3]*H,u1=t[6]*W,v1=t[7]*H,u2=t[10]*W,v2=t[11]*H;
    var det=(X1-X0)*(Y2-Y0)-(X2-X0)*(Y1-Y0);if(Math.abs(det)<1e-12)return;
    /* afín espalda→textura: u = a*X + b*Y + c */
    var a1=((u1-u0)*(Y2-Y0)-(u2-u0)*(Y1-Y0))/det, b1=((u2-u0)*(X1-X0)-(u1-u0)*(X2-X0))/det, c1=u0-a1*X0-b1*Y0;
    var a2=((v1-v0)*(Y2-Y0)-(v2-v0)*(Y1-Y0))/det, b2=((v2-v0)*(X1-X0)-(v1-v0)*(X2-X0))/det, c2=v0-a2*X0-b2*Y0;
    g.save();g.beginPath();
    /* el triángulo en la textura, agrandado medio píxel para no dejar rendijas */
    var mu=(u0+u1+u2)/3, mv=(v0+v1+v2)/3, e=function(u,m){return u+(u-m)*0.08;};
    g.moveTo(e(u0,mu),e(v0,mv));g.lineTo(e(u1,mu),e(v1,mv));g.lineTo(e(u2,mu),e(v2,mv));g.closePath();g.clip();
    /* imagen → espalda → textura */
    g.setTransform(a1*ax, a2*ax, b1*ay, b2*ay, a1*bx+b1*by+c1, a2*bx+b2*by+c2);
    g.drawImage(cv,0,0);g.restore();
  });
}
/* ---------------- la camiseta del color que se elija: se repinta la textura ---------------- */
function repintar(J,reglas,clave,colNum){
  if(!J.texOriginal)return;
  var mat=J.malla.material;
  if(J.mapas[clave]){mat.map=J.mapas[clave];mat.needsUpdate=true;return;}
  var im=J.texOriginal, c=document.createElement('canvas');c.width=im.width;c.height=im.height;var g=c.getContext('2d');g.drawImage(im,0,0);
  var d=g.getImageData(0,0,c.width,c.height), px=d.data;
  var destinos=reglas.map(function(r){var cc=new THREE.Color(r.a);return [cc.r*255,cc.g*255,cc.b*255];});
  for(var i=0;i<px.length;i+=4){
    var r=px[i],gg=px[i+1],b=px[i+2], mx=Math.max(r,gg,b), mn=Math.min(r,gg,b), v=mx/255, s=mx?(mx-mn)/mx:0, h=0;
    if(mx!==mn){if(mx===r)h=((gg-b)/(mx-mn)+6)%6;else if(mx===gg)h=(b-r)/(mx-mn)+2;else h=(r-gg)/(mx-mn)+4;h*=60;}
    for(var k=0;k<reglas.length;k++){var R=reglas[k];
      if(R.de(h,s,v)){var lum=(0.3*r+0.59*gg+0.11*b)/R.ref, D=destinos[k];px[i]=Math.min(255,D[0]*lum);px[i+1]=Math.min(255,D[1]*lum);px[i+2]=Math.min(255,D[2]*lum);break;}}
  }
  g.putImageData(d,0,0);
  pintarDorsal(g,c.width,c.height,J,colNum[0],colNum[1]);
  var t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.anisotropy=4;
  J.mapas[clave]=t;mat.map=t;mat.needsUpdate=true;
}
var ES_ROJO=function(h,s,v){return s>0.42&&v>0.16&&(h<16||h>335);};
var ES_BLANCO=function(h,s,v){return s<0.12&&v>0.7;};
var ES_AMARILLO=function(h,s,v){return h>36&&h<74&&(s>0.42&&v>0.2||s>0.3&&v>0.45);};
var ES_AZUL=function(h,s,v){return s>0.3&&v>0.12&&h>200&&h<255;};
function oscuroSi(hex){var c=new THREE.Color(hex);return (0.3*c.r+0.59*c.g+0.11*c.b)>0.45;}
function vestirFutbolista(J,kit,esRival){
  var cam=kit.cam, sh=kit.short||'#ffffff', num=oscuroSi(cam)?['#15151f','rgba(255,255,255,0.9)']:['#ffffff','rgba(10,10,20,0.85)'];
  if(J.nombre==='jugador-amarillo')repintar(J,[{de:ES_AMARILLO,a:cam,ref:205},{de:ES_AZUL,a:sh,ref:70}],'am:'+cam+sh,num);
  else repintar(J,[{de:ES_ROJO,a:cam,ref:120},{de:ES_BLANCO,a:sh,ref:228}],'ro:'+cam+sh,num);
}
/* ---------------- el esqueleto hacia dónde va: estado → clip, fundidos, tiempos ---------------- */
function elegirClip(J,a){
  var lista=CLIPS_DE[a]||['quieto'];
  if(a==='volada')return clipDeVolada(J);
  if(!J.repe)J.var=Math.floor(Math.random()*lista.length);
  var c=lista[J.var%lista.length];return J.acc[c]?c:'quieto';
}
function clipDeVolada(J){
  /* la izquierda del jugador es (−cos giro, 0, sen giro) */
  var lat=-(J.dx||0)*Math.cos(J.giro||0), alto=J.dy||0, lado=lat>=0?'izq':'der';
  if(Math.abs(lat)<0.55&&alto>0.45)return J.acc.atrapa?'atrapa':'vuelo_'+lado;
  if(alto>=0.72)return 'estirada_alta_'+lado;
  if(alto>=0.3)return 'vuelo_'+lado;
  return 'estirada_baja_'+lado;
}
function entrarEstado(J,a,enRepe){
  J.desdeCarrera=J.animPrev==='correr';
  if(!enRepe)J.te=0;J.clip=elegirClip(J,a);J.contacto=false;J.cadena=null;
  J.fundido=a==='volada'||a==='patear'?16:a==='arquero'||a==='correr'?9:6;
  if(a==='volada'){
    J.x0v=J.x;J.z0v=J.z;
    var M=J.meta[J.clip]||{t0:0,tAt:0.6,alcance:0.8,viajeAt:1};
    /* cuánto tiene que viajar la cadera para que la mano llegue: lo que falta después del alcance del brazo */
    var lat=Math.abs(-(J.dx||0)*Math.cos(J.giro||0));
    J.kViaje=M.viajeAt>0.05?Math.max(0,Math.min(1.35,(lat+0.05-M.alcance)/M.viajeAt)):0;
    /* la mano llega al objetivo en ~0,45 s de juego */
    J.velV=Math.max(1.0,Math.min(2.3,(M.tAt-M.t0)/0.3));J.tAtJuego=(M.tAt-M.t0)/J.velV;
    J.objetivo=predecirObjetivo(J);
  }
}
/* adonde el arquero CREE que va la pelota (lo que decidió: con el error de la IA o el gesto del jugador), no la
   trayectoria exacta: si no, la mano la encuentra siempre */
function predecirObjetivo(J){return new THREE.Vector3(J.x+(J.dx||0),0.8+(J.dy||0),J.z+0.25*(J.giro>1.5?1:-1));}
/* tiempo del clip actual según el estado */
function tiempoClip(J,dur){
  var a=J.anim, c=J.clip;
  if(a==='patear')return Math.min(dur,t0Patada(J)+J.te*1.12);
  if(a==='volada'){
    if(J.cadena)return Math.min(dur,J.cadena.t0+(J.p-J.cadena.te0)*0.95);
    var M=J.meta[c]||{t0:0};return Math.min(dur,M.t0+J.p*J.velV);
  }
  if(UNA_VEZ.test(c))return Math.min(dur,J.te*(a==='festejar'?1.05:1));
  var vel=c==='carrera'?1.08:c==='sprint'?1.0:1;
  return ((J.t*vel+(J.num%7)*0.37)%dur+dur)%dur;
}
function posarFutbolista(J,dt){
  J.t+=dt;var a=J.anim, enRepe=!!J.repe;
  if(a!==J.animPrev){entrarEstado(J,a,enRepe);J.animPrev=a;}
  if(enRepe){J.repe=false;J.pUlt=J.p;}else{J.te+=dt;if(a==='volada'){if(J.p===J.pUlt)J.p+=dt;J.pUlt=J.p;}}
  if(a==='correr')J.clip=J.acelera&&J.acc.sprint?'sprint':'carrera';
  var c=J.clip, act=J.acc[c], dur=act.getClip().duration;
  /* los de un tiro, cuando terminan: el siguiente clip del estado */
  if(UNA_VEZ.test(c)&&a!=='volada'&&J.te*1.05>dur+0.25&&LUEGO[a]){J.clip=LUEGO[a];c=J.clip;act=J.acc[c];dur=act.getClip().duration;}
  if(a==='volada'&&!enRepe)seguirVolada(J,dt);
  c=J.clip;act=J.acc[c];dur=act.getClip().duration;
  var tc=tiempoClip(J,dur);
  if(a==='patear'&&J.meta.patada&&!J.contacto&&tc>=J.meta.patada.tc)J.contacto=true;
  /* fundidos (y el paso lateral del arquero, mezclado según lo rápido que se corre) */
  var sec=pasoLateral(J);
  var k=Math.min(1,Math.max(dt,J.dtPaso||0)*J.fundido);if(dt===0&&!J.pesos[c]&&!J.dtPaso)k=1;
  for(var n in J.acc){var ac=J.acc[n], obj=n===c?1-sec.w:(n===sec.clip?sec.w:0);var w=J.pesos[n]+(obj-J.pesos[n])*(n===sec.clip||n===c&&sec.w>0?Math.min(1,k*1.5):k);if(w<0.002)w=0;J.pesos[n]=w;
    ac.enabled=w>0;ac.setEffectiveWeight(w);
    if(w>0&&n!==c){if(/^arquero_paso/.test(n)){var dp=ac.getClip().duration;ac.time=((J.fasePaso%1)+1)%1*(dp-1e-4);}
      else /* el que se va sigue su propio tiempo */ac.time=Math.min(ac.getClip().duration-1e-4,ac.time+dt);}}
  act.time=Math.min(dur-1e-4,Math.max(0,tc));
  /* el mezclador no reescribe un hueso que no cambió: se vuelve a la pose limpia antes (si no, las capas se acumulan) */
  for(var i=0;i<J.huesos.length;i++)J.huesos[i].quaternion.copy(J.limpio[i]);J.h.Hips.position.copy(J.limpioP);
  J.mixer.update(0);
  for(i=0;i<J.huesos.length;i++)J.limpio[i].copy(J.huesos[i].quaternion);J.limpioP.copy(J.h.Hips.position);
  /* la raíz */
  var m=J.modelo;m.position.copy(J.base);
  J.raiz.position.set(J.x,J.y||0,J.z);J.raiz.rotation.set(0,J.giro||0,0);J.raiz.updateMatrixWorld(true);
  capas(J,dt);
}
/* el arquero corriéndose de costado: velocidad lateral medida por lo que se movió (en la fase de vuelo se posa
   con dt=0, así que se usa el reloj J.t), y la fase del paso avanza con la distancia: los pies no patinan */
function pasoLateral(J){
  var dtt=J.t-(J.tPaso===undefined?J.t:J.tPaso), dx=J.x-(J.xPaso===undefined?J.x:J.xPaso);J.tPaso=J.t;J.xPaso=J.x;J.dtPaso=dtt;
  if(dtt>0){var v=dx*(-Math.cos(J.giro||0))/dtt;J.vLat=(J.vLat||0)+(v-(J.vLat||0))*Math.min(1,dtt*12);}
  J.fasePaso=(J.fasePaso||0)+Math.abs(dx)/1.12;
  var sp=Math.abs(J.vLat||0), w=J.anim==='arquero'&&J.acc.arquero_paso_izq?Math.min(1,Math.max(0,(sp-0.12)/0.8)):0;
  return {clip:(J.vLat||0)>0?'arquero_paso_izq':'arquero_paso_der',w:w};
}
/* ---------------- capas por código encima del clip ---------------- */
function capas(J,dt){
  var a=J.anim;
  /* guantes sólo de arquero */
  ponerGuantes(J,a==='arquero'||a==='volada');
  /* arquero moviéndose de costado: pasitos (los pies se levantan alternados según lo recorrido) */
  if(a==='arquero'&&!J.acc.arquero_paso_izq){
    var dx=Math.abs(J.x-J.xPrev);J.fase+=dx*9;var paso=Math.min(1,dx/Math.max(dt,1e-3)/2.2);
    if(paso>0.05){levantarPie(J,'Left',Math.max(0,Math.sin(J.fase))*0.09*paso);levantarPie(J,'Right',Math.max(0,-Math.sin(J.fase))*0.09*paso);}
  }
  J.xPrev=J.x;
  if(a==='patear')piernaPatada(J);
  if(a==='volada')manosVolada(J);
  if(a==='malabares')piernaJueguito(J);
  /* la cabeza sigue la pelota (arquero y pateador esperando) */
  var mira=a==='arquero'||a==='espera'||a==='quieto'&&typeof P!=='undefined'&&P&&P.fase==='carrera'||(a==='volada'&&J.p<0.35);
  if(typeof B!=='undefined')mirarA(J,B.p,mira?0.85:0);
  apoyar(J,a==='volada'||a==='festejar'||J.clip==='atrapa'?2:1,dt);
}
/* IK de dos huesos (hombro-codo-muñeca / cadera-rodilla-tobillo) hacia un punto del mundo */
var _ikA=new THREE.Vector3(),_ikB=new THREE.Vector3(),_ikC=new THREE.Vector3(),_ikN=new THREE.Vector3(),_ikQa=new THREE.Quaternion(),_ikQb=new THREE.Quaternion();
function ponerMundo(b,qw){var pq=b.parent.getWorldQuaternion(_q2);b.quaternion.copy(pq.invert().multiply(qw));b.updateMatrixWorld(true);}
function ik2(J,na,nb,nc,T,peso){
  if(!(peso>0.001))return;
  var a=J.h[na],b=J.h[nb],c=J.h[nc];if(!a||!b||!c)return;
  var qa0=a.quaternion.clone(), qb0=b.quaternion.clone();
  a.getWorldPosition(_ikA);b.getWorldPosition(_ikB);c.getWorldPosition(_ikC);
  var la=_ikA.distanceTo(_ikB), lb=_ikB.distanceTo(_ikC), d=Math.min(la+lb-1e-3,Math.max(Math.abs(la-lb)+1e-3,_ikA.distanceTo(T)));
  var ab=_p1.subVectors(_ikB,_ikA), bc=_p2.subVectors(_ikC,_ikB);
  _ikN.crossVectors(ab,bc);if(_ikN.lengthSq()<1e-10)return;_ikN.normalize();
  var cur=Math.acos(Math.max(-1,Math.min(1,-ab.dot(bc)/(la*lb)))), des=Math.acos(Math.max(-1,Math.min(1,(la*la+lb*lb-d*d)/(2*la*lb))));
  ponerMundo(b,_q.setFromAxisAngle(_ikN,cur-des).multiply(b.getWorldQuaternion(_ikQb)));
  c.getWorldPosition(_ikC);
  var v1=_p1.subVectors(_ikC,_ikA).normalize(), v2=_p2.subVectors(T,_ikA).normalize();
  ponerMundo(a,_q.setFromUnitVectors(v1,v2).multiply(a.getWorldQuaternion(_ikQa)));
  if(peso<1){a.quaternion.copy(qa0.slerp(a.quaternion,peso));b.quaternion.copy(qb0.slerp(b.quaternion,peso));a.updateMatrixWorld(true);}
}
function levantarPie(J,l,h){if(h<0.004)return;var f=J.h[l+'Foot'];f.getWorldPosition(_p3);_p3.y+=h;ik2(J,l+'UpLeg',l+'Leg',l+'Foot',_p3.clone(),1);}
/* patada: en el contacto la punta pasa a la altura del centro de la pelota (el mocap la pasaba 10 cm arriba) */
function piernaPatada(J){
  var P=J.meta.patada;if(!P)return;
  var tc=t0Patada(J)+J.te*1.12, d=(tc-P.tc)/0.11, w=Math.exp(-d*d);if(w<0.02)return;
  var punta=J.h.RightToeBase.getWorldPosition(new THREE.Vector3());
  var baja=Math.max(0,punta.y-(R_PELOTA+0.02));if(baja<0.005)return;
  var tob=J.h.RightFoot.getWorldPosition(new THREE.Vector3());tob.y-=baja;
  ik2(J,'RightUpLeg','RightLeg','RightFoot',tob,w);
}
/* jueguito: el pie que toca sube a buscar la pelota cuando baja (mismo reloj que pelotaJueguito) */
function piernaJueguito(J){
  var c=(J.t*2.2)%2, k=Math.round(c), l=k%2===0?'Right':'Left';
  var lev=Math.exp(-Math.pow((c-k)/0.17,2));
  var h=J.h[l+'Foot'].getWorldPosition(new THREE.Vector3()), cad=J.h[l+'UpLeg'].getWorldPosition(new THREE.Vector3());
  var fw=new THREE.Vector3(-Math.sin(J.giro),0,-Math.cos(J.giro));
  var obj=cad.clone().addScaledVector(fw,0.28);obj.y=h.y+0.22*lev;
  ik2(J,l+'UpLeg',l+'Leg',l+'Foot',h.clone().lerp(obj,lev),lev);
}
/* estirada: las manos van a la pelota (la que va adelante, entera; la otra la acompaña) */
function manosVolada(J){
  if(J.cadena||!J.objetivo)return;
  var tA=J.tAtJuego||0.3, u=J.p/0.1, w=Math.min(1,u*u)*(1-Math.min(1,Math.max(0,(J.p-tA-0.25)/0.3)))*0.8;if(w<0.03)return;
  var T=J.objetivo.clone();
  /* un poco de imán sólo si la pelota ya pasa pegada a la mano (para que se vea el toque) */
  if(typeof B!=='undefined'&&B.vuela&&B.p.distanceTo(T)<0.32)T.lerp(B.p,0.5);
  var izq=/izq/.test(J.clip)||(J.clip==='atrapa'&&-(J.dx||0)*Math.cos(J.giro||0)>=0);
  var l1=izq?'Left':'Right', l2=izq?'Right':'Left';
  ik2(J,l1+'Arm',l1+'ForeArm',l1+'Hand',T,w);
  var T2=T.clone();T2.y-=0.12;var hb=J.h.Spine.getWorldPosition(new THREE.Vector3());T2.lerp(hb,0.16);
  ik2(J,l2+'Arm',l2+'ForeArm',l2+'Hand',T2,w*0.7);
}
/* la estirada viaja: la cadera se corre lo que dice el clip, escalado para llegar a la pelota */
function seguirVolada(J,dt){
  var c=J.clip, v=J.viajes[J.cadena?J.cadena.clip:c], M=J.meta[c]||{t0:0};
  var act=J.acc[c], dur=act.getClip().duration;
  if(!J.cadena){
    var tc=M.t0+J.p*J.velV;
    /* la alta termina acostado: sigue con la levantada de la baja desde que queda en el piso */
    if(tc>=dur&&/^estirada_alta_/.test(c)){var cb=c.replace('alta','baja');if(J.acc[cb]){var Mb=J.meta[cb]||{tYace:1.3};
      J.cadena={clip:cb,t0:Mb.tYace,te0:J.p,x0:J.x,z0:J.z,v0:J.viajes[cb]?interp(J.viajes[cb].x,Mb.tYace*J.viajes[cb].fps):0};J.clip=cb;J.fundido=5;}}
  }
  var lx, fps=v?v.fps:30, s=J.escala;
  var izqX=-Math.cos(J.giro||0), izqZ=Math.sin(J.giro||0);
  if(J.cadena){
    var tcc=J.cadena.t0+(J.p-J.cadena.te0)*0.95, vb=J.viajes[J.cadena.clip];
    lx=vb?(interp(vb.x,tcc*vb.fps)-J.cadena.v0):0;
    J.x=J.cadena.x0+izqX*lx*s;J.z=J.cadena.z0+izqZ*lx*s;
  } else if(v){
    var v0=interp(v.x,M.t0*fps), vAt=interp(v.x,M.tAt*fps)-v0, vt=interp(v.x,(M.t0+J.p*J.velV)*fps)-v0;
    var norma=Math.abs(vAt)>0.05?vt/vAt:0, arranque=ease(Math.min(1,J.p/Math.max(0.2,J.tAtJuego*1.25)));
    var g_=J.p<J.tAtJuego?Math.max(norma,arranque):norma;
    lx=g_*vAt;
    J.x=J.x0v+izqX*lx*s*J.kViaje;J.z=J.z0v+izqZ*lx*s*J.kViaje;
  }
  J.y=0;
}
/* la cabeza (y un poco el cuello) mira a un punto, con límite */
function mirarA(J,T,peso){
  J.pesoMira=(J.pesoMira||0)+((peso||0)-(J.pesoMira||0))*0.15;var w=J.pesoMira;if(w<0.02)return;
  var hd=J.h.Head, hf=J.h.headfront;if(!hf)return;
  for(var pasada=0;pasada<2;pasada++){
    var b=pasada===0?J.h.neck:hd, frac=pasada===0?0.35:0.75;
    hd.getWorldPosition(_p1);hf.getWorldPosition(_p2);var cur=_p2.sub(_p1).normalize();
    var des=_p3.copy(T).sub(_p1).normalize();
    var ang=Math.acos(Math.max(-1,Math.min(1,cur.dot(des))));if(ang<1e-3)return;
    var lim_=1.05;if(ang>lim_){des.lerpVectors(cur,des,lim_/ang).normalize();}
    _q.setFromUnitVectors(cur,des);_q.slerp(_q2.identity(),1-w*frac);
    ponerMundo(b,_q.multiply(b.getWorldQuaternion(new THREE.Quaternion())));
  }
}
/* pies en el piso: parados, la punta o el tobillo tocan el piso; en el aire, nada atraviesa el piso */
var APOYO_RADIOS=[['Hips',0.13],['Spine',0.14],['Head',0.12],['LeftHand',0.05],['RightHand',0.05],['LeftLeg',0.07],['RightLeg',0.07],['LeftArm',0.07],['RightArm',0.07]];
function apoyar(J,modo,dt){
  var M=J.meta, y0=(J.y||0), bajo=1e9;
  var pl=J.h.LeftToeBase.getWorldPosition(_p1).y-y0-M.puntaY, pr=J.h.RightToeBase.getWorldPosition(_p1).y-y0-M.puntaY;
  var tl=J.h.LeftFoot.getWorldPosition(_p1).y-y0-M.tobilloY, tr=J.h.RightFoot.getWorldPosition(_p1).y-y0-M.tobilloY;
  var pie=Math.min(pl,pr,tl,tr), corr;
  if(modo===1)corr=-pie;
  else{corr=Math.max(0,-pie);for(var i=0;i<APOYO_RADIOS.length;i++){var r=APOYO_RADIOS[i];var b=J.h[r[0]];if(!b)continue;var yy=b.getWorldPosition(_p1).y-y0;if(r[1]-yy>corr)corr=r[1]-yy;}}
  if(!isFinite(corr))corr=0;
  J.apoyo+=(corr-J.apoyo)*Math.min(1,dt>0?dt*18:1);
  J.modelo.position.y=J.base.y+J.apoyo;
  if(Math.abs(J.apoyo)>0.001)J.modelo.updateMatrixWorld(true);
}
/* las esferas de choque del arquero, en los huesos */
function partesFutbolista(J,out){
  J.raiz.updateMatrixWorld(true);out.length=0;
  var add=function(n,r,dy){var b=J.h[n];if(!b)return;b.getWorldPosition(_p0);out.push({x:_p0.x,y:_p0.y+(dy||0),z:_p0.z,r:r});};
  var mid=function(a,b,r){var A=J.h[a],B_=J.h[b];if(!A||!B_)return;A.getWorldPosition(_p0);B_.getWorldPosition(_p1);out.push({x:(_p0.x+_p1.x)/2,y:(_p0.y+_p1.y)/2,z:(_p0.z+_p1.z)/2,r:r});};
  add('LeftHand',0.14);add('RightHand',0.14);mid('LeftForeArm','LeftHand',0.11);mid('RightForeArm','RightHand',0.11);
  add('Head',0.16,0.08);add('Spine',0.24);add('Hips',0.2);add('LeftLeg',0.12);add('RightLeg',0.12);mid('LeftLeg','LeftFoot',0.11);mid('RightLeg','RightFoot',0.11);add('LeftFoot',0.11);add('RightFoot',0.11);
  return out;
}
/* cuánto dura la estirada en tiempo de juego (incluida la levantada encadenada) */
function finVolada(J){
  var c=J.cadena?J.cadena.clip:J.clip, a=J.acc[c];if(!a)return 1.3;var dur=a.getClip().duration;
  if(J.cadena)return J.cadena.te0+(dur-J.cadena.t0)/0.95+0.15;
  var M=J.meta[c]||{t0:0};
  if(/^estirada_alta_/.test(c))return 99; /* sigue con la levantada: termina cuando termine la cadena */
  return (dur-M.t0)/(J.velV||1)+0.15;
}
function t0Patada(J){var P=J.meta.patada;if(!P)return 0;return J.desdeCarrera?Math.max(0,P.tc-0.24):P.t0;}
function patadaTerminada(J){if(!J.glb)return J.p>=1;var P=J.meta.patada;return !P||(t0Patada(J)+J.te*1.12)>1.42;}
/* dónde parar al pateador para que en el contacto la punta del pie quede detrás de la pelota */
function puntoDePatada(J,bx,bz,giro){
  var P=J.meta.patada;if(!P)return null;
  var px=P.pie.x, pz=P.pie.z, c=Math.cos(giro), s=Math.sin(giro);
  /* vector del pie girado con el jugador, y 9 cm antes del centro de la pelota */
  var wx=px*c+pz*s, wz=-px*s+pz*c, fx=-Math.sin(giro), fz=-Math.cos(giro);
  return {x:bx-wx-fx*0.09, z:bz-wz-fz*0.09};
}

/* los dos juegos de funciones conviven: el muñeco viejo queda de respaldo si el modelo no carga */
var _posarViejo=posar, _partesViejo=partesArquero, _vestirViejo=vestirJugador;
posar=function(J,dt){return J.glb?posarFutbolista(J,dt):_posarViejo(J,dt);};
partesArquero=function(J,out){return J.glb?partesFutbolista(J,out):_partesViejo(J,out);};
vestirJugador=function(J,kit){return J.glb?vestirFutbolista(J,kit,false):_vestirViejo(J,kit);};
