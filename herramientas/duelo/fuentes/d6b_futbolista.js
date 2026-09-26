/* ---------------- los futbolistas de verdad: modelo 3D de Rezona con esqueleto ----------------
   Rezona dio el modelo (29 mil triángulos, texturas pintadas) y cinco animaciones: quieto, correr,
   caminar, saltar y dolerse. La patada, la estirada del arquero, la postura de arquero, el festejo,
   el lamento y el jueguito se hacen moviendo huesos ENCIMA de esas animaciones.
   Como no se sabe para qué lado gira cada hueso, se calibra al cargar: se prueba cada eje y se mira
   hacia dónde se mueve la punta (el pie, la mano, la cabeza). */
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
var _q=new THREE.Quaternion(), _p0=new THREE.Vector3(), _p1=new THREE.Vector3();
function posEnRaiz(J,o,v){o.getWorldPosition(v);return J.raiz.worldToLocal(v);}
function crearFutbolista(nombre,o){
  var g=MODELOS[nombre];if(!g)return null;
  var m=SkeletonUtils.clone(g.scene);
  var J={glb:true,num:o.numero||9,raiz:new THREE.Group(),modelo:m,x:0,z:0,giro:0,anim:'quieto',t:0,p:0,h:{},pesos:{},anterior:null};
  J.raiz.add(m);R3.escena.add(J.raiz);
  m.traverse(function(q){if(q.isBone)J.h[q.name]=q;if(q.isMesh){q.castShadow=true;q.receiveShadow=false;q.frustumCulled=false;
    q.material=q.material.clone();J.malla=q;}});
  /* el tamaño: 1,80 m, apoyado en el piso (la caja de una malla con esqueleto es la de reposo: justo lo que sirve acá) */
  m.updateMatrixWorld(true);var caja=new THREE.Box3().setFromObject(m), alto=caja.max.y-caja.min.y, s=(o.alto||1.8)/alto;
  m.scale.setScalar(s);m.position.y=-caja.min.y*s;J.escala=s;
  /* hacia dónde mira: la punta del pie adelante del talón; se gira para que mire a -z (como los muñecos de antes) */
  m.updateMatrixWorld(true);
  var pie=posEnRaiz(J,J.h.L_Foot,new THREE.Vector3()), punta=posEnRaiz(J,J.h.L_ToeBase,new THREE.Vector3()), f=punta.sub(pie);f.y=0;f.normalize();
  m.rotation.y=Math.PI-Math.atan2(f.x,f.z);m.updateMatrixWorld(true);
  /* la piel del material: sin brillo de metal y con el color en sRGB */
  var mat=J.malla.material;mat.metalness=0;mat.roughness=0.7;mat.envMapIntensity=0.8;
  J.texOriginal=mat.map&&mat.map.image;J.mapas={};
  /* las animaciones: se saca el avance de la cadera (el paso lo pone el juego) */
  J.mixer=new THREE.AnimationMixer(m);J.acc={};
  /* el eje vertical de la cadera es el de mayor valor en «idle» (el esqueleto viene con z arriba); los otros dos se clavan al de idle */
  var ref=null;g.animations.forEach(function(c){if(c.name==='idle')c.tracks.forEach(function(tr){if(/Hip\.position$/.test(tr.name))ref=tr.values.slice(0,3);});});
  var vert=ref?[0,1,2].reduce(function(a,b){return Math.abs(ref[b])>Math.abs(ref[a])?b:a;},0):1;
  g.animations.forEach(function(c){
    c=c.clone();
    c.tracks.forEach(function(tr){if(/(Root|Hip)\.position$/.test(tr.name)){var v=tr.values=tr.values.slice(), r=/Hip/.test(tr.name)&&ref?ref:[v[0],v[1],v[2]];
      for(var i=0;i<v.length;i+=3)for(var k=0;k<3;k++)if(k!==vert)v[i+k]=r[k];}});
    var a=J.mixer.clipAction(c);a.play();a.setEffectiveWeight(0);J.acc[c.name]=a;J.pesos[c.name]=0;
  });
  if(J.acc.hurt){J.acc.hurt.setLoop(THREE.LoopOnce);J.acc.hurt.clampWhenFinished=true;}
  /* se calibra en la pose de parado (la de reposo del archivo tiene los brazos en cruz y los ejes quedan torcidos) */
  if(J.acc.idle){J.acc.idle.setEffectiveWeight(1);J.pesos.idle=1;J.mixer.update(0);}
  calibrarFutbolista(J);
  agregarGuantes(J,o.guantes||'#2adf6a');agregarNumero(J,o.cam||'#d8282a');
  return J;
}
/* ---------------- calibración de los ejes ---------------- */
function calibrar(J,hueso,efector,dir){
  var b=J.h[hueso], e=J.h[efector];if(!b||!e)return null;
  var q0=b.quaternion.clone(), p0=posEnRaiz(J,e,new THREE.Vector3()), mejor=null;
  ['x','y','z'].forEach(function(ax){var v=new THREE.Vector3();v[ax]=1;
    b.quaternion.copy(q0).multiply(_q.setFromAxisAngle(v,0.35));J.raiz.updateMatrixWorld(true);
    var d=posEnRaiz(J,e,_p1).sub(p0), pr=d.dot(dir);
    if(!mejor||Math.abs(pr)>Math.abs(mejor.pr))mejor={v:v,pr:pr};});
  b.quaternion.copy(q0);J.raiz.updateMatrixWorld(true);
  return {b:b,eje:mejor.v,signo:sig(mejor.pr)};
}
/* el giro del tronco: el eje que lleva el hombro izquierdo adelante y el derecho atrás (no el que agacha los dos) */
function calibrarGiro(J){
  var b=J.h.Spine01;if(!b)return null;var q0=b.quaternion.clone(), l0=posEnRaiz(J,J.h.L_Upperarm,new THREE.Vector3()), r0=posEnRaiz(J,J.h.R_Upperarm,new THREE.Vector3()), mejor=null;
  ['x','y','z'].forEach(function(ax){var v=new THREE.Vector3();v[ax]=1;
    b.quaternion.copy(q0).multiply(_q.setFromAxisAngle(v,0.35));J.raiz.updateMatrixWorld(true);
    var pr=-(posEnRaiz(J,J.h.L_Upperarm,_p1).z-l0.z)+(posEnRaiz(J,J.h.R_Upperarm,_p1).z-r0.z);
    if(!mejor||Math.abs(pr)>Math.abs(mejor.pr))mejor={v:v,pr:pr};});
  b.quaternion.copy(q0);J.raiz.updateMatrixWorld(true);
  return {b:b,eje:mejor.v,signo:sig(mejor.pr)};
}
function calibrarFutbolista(J){
  var ad=new THREE.Vector3(0,0,-1), at=new THREE.Vector3(0,0,1), ar=new THREE.Vector3(0,1,0), ab=new THREE.Vector3(0,-1,0);
  J.raiz.updateMatrixWorld(true);
  var ladoX=function(n){return sig(posEnRaiz(J,J.h[n],new THREE.Vector3()).x);};
  var C={};
  ['L','R'].forEach(function(l){
    var fuera=new THREE.Vector3(ladoX(l+'_Foot'),0,0), fueraM=new THREE.Vector3(ladoX(l+'_Hand'),0,0);
    C[l+'muslo']=calibrar(J,l+'_Thigh',l+'_Foot',ad);
    C[l+'abre']=calibrar(J,l+'_Thigh',l+'_Foot',fuera);
    C[l+'rodilla']=calibrar(J,l+'_Calf',l+'_Foot',at);
    C[l+'pie']=calibrar(J,l+'_Foot',l+'_ToeBase',ab);
    C[l+'brazo']=calibrar(J,l+'_Upperarm',l+'_Hand',ad);
    C[l+'alza']=calibrar(J,l+'_Upperarm',l+'_Hand',fueraM);
    C[l+'codo']=calibrar(J,l+'_Forearm',l+'_Hand',ad);
  });
  C.columna=calibrar(J,'Spine01','Head',ad);
  C.giro=calibrarGiro(J);
  C.rolido=calibrar(J,'Hip','Head',new THREE.Vector3(1,0,0));
  C.cabeza=calibrar(J,'NeckTwist01','Head',ad);
  J.cal=C;
}
function rot(J,k,ang){var c=J.cal[k];if(!c||!ang)return;c.b.quaternion.multiply(_q.setFromAxisAngle(c.eje,c.signo*ang));}
/* ---------------- guantes y número ---------------- */
function agregarGuantes(J,color){
  var mat=new THREE.MeshStandardMaterial({color:col(color),roughness:0.5});J.guantes=[];
  ['L','R'].forEach(function(l){var mano=J.h[l+'_Hand'], ante=J.h[l+'_Forearm'];if(!mano)return;
    var gl=new THREE.Mesh(new THREE.SphereGeometry(0.06,12,10),mat);gl.scale.set(1,1.25,0.7).multiplyScalar(1/J.escala);gl.castShadow=true;
    /* un poco hacia los dedos: en la dirección del antebrazo a la mano */
    var a=ante.getWorldPosition(new THREE.Vector3()), b=mano.getWorldPosition(new THREE.Vector3()), dir=b.clone().sub(a).normalize().multiplyScalar(0.06);
    var w=b.clone().add(dir);mano.worldToLocal(w);gl.position.copy(w);mano.add(gl);gl.visible=false;J.guantes.push(gl);});
  J.mats={guante:mat};
}
function texNumeroTransp(n){
  return lienzoTex(128,128,function(g,w,h){g.clearRect(0,0,w,h);g.font='900 84px "Arial Black",Arial';g.textAlign='center';g.textBaseline='middle';
    g.lineWidth=10;g.strokeStyle='rgba(10,10,20,0.85)';g.strokeText(String(n),w/2,h/2+4);g.fillStyle='#ffffff';g.fillText(String(n),w/2,h/2+4);});
}
function agregarNumero(J,colCam){
  var esp=J.h.Spine02||J.h.Spine01;if(!esp)return;
  var pl=new THREE.Mesh(new THREE.PlaneGeometry(0.2,0.2),new THREE.MeshStandardMaterial({map:texNumeroTransp(J.num),transparent:true,roughness:0.6,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  J.raiz.updateMatrixWorld(true);
  /* en la espalda: detrás del hueso del pecho, un poco más arriba */
  var p=posEnRaiz(J,esp,new THREE.Vector3());pl.position.set(0,p.y+0.04,p.z+0.14);J.raiz.add(pl);esp.attach(pl);
  J.numero=pl;
}
/* ---------------- la camiseta del color que se elija: se repinta la textura ---------------- */
function repintar(J,reglas,clave){
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
  var t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.anisotropy=4;
  J.mapas[clave]=t;mat.map=t;mat.needsUpdate=true;
}
var ES_ROJO=function(h,s,v){return s>0.45&&v>0.18&&(h<16||h>335);};
var ES_BLANCO=function(h,s,v){return s<0.12&&v>0.72;};
var ES_AMARILLO=function(h,s,v){return s>0.45&&v>0.35&&h>38&&h<72;};
function vestirFutbolista(J,kit,esRival){
  var reglas;
  if(esRival)reglas=[{de:ES_AMARILLO,a:kit.cam,ref:200}];
  else{reglas=[{de:ES_ROJO,a:kit.cam,ref:95}];if(kit.short.toLowerCase()!=='#ffffff')reglas.push({de:ES_BLANCO,a:kit.short,ref:225});}
  repintar(J,reglas,(esRival?'r':'y')+kit.cam+kit.short);
}
/* ---------------- las poses ---------------- */
var CLIP_DE={quieto:'idle',espera:'idle',arquero:'idle',patear:'idle',volada:'idle',malabares:'idle',correr:'run',caminar:'walk',festejar:'jump',lamento:'hurt'};
function posarFutbolista(J,dt){
  J.t+=dt;var a=J.anim, p=J.p, clip=CLIP_DE[a]||'idle';
  if(!J.acc[clip])clip='idle';
  if(a!==J.anterior){if(a==='lamento'&&J.acc.hurt){J.acc.hurt.reset().play();}J.anterior=a;}
  /* los pesos se mezclan suave: correr → patear no salta */
  var k=Math.min(1,dt*12);
  for(var n in J.acc){var obj=n===clip?1:0;J.pesos[n]+=(obj-J.pesos[n])*k;J.acc[n].setEffectiveWeight(J.pesos[n]);}
  if(J.acc.run)J.acc.run.timeScale=J.acelera?1.45:1.05;
  /* el mezclador no reescribe un hueso si su valor no cambió (con dt=0, o dos veces en el mismo cuadro):
     sin volver a la pose limpia, los giros de encima se acumulan y el arquero termina cabeza abajo */
  var hs=J.huesosCal;if(!hs){hs=J.huesosCal=[];for(var kc in J.cal){var cb=J.cal[kc]&&J.cal[kc].b;if(cb&&hs.indexOf(cb)<0)hs.push(cb);}J.limpio=hs.map(function(b){return b.quaternion.clone();});}
  for(var ih=0;ih<hs.length;ih++)hs[ih].quaternion.copy(J.limpio[ih]);
  J.mixer.update(dt);
  for(ih=0;ih<hs.length;ih++)J.limpio[ih].copy(hs[ih].quaternion);
  var e=ease, m=J.modelo;m.position.x=0;m.position.z=0;var base=m.userData.y0===undefined?(m.userData.y0=m.position.y):m.userData.y0;m.position.y=base;
  var giroL=Math.cos(J.giro||0), rollo=0;
  J.guantes.forEach(function(gl){gl.visible=(a==='arquero'||a==='volada');});
  if(a==='arquero'){
    m.position.y=base-0.1;
    ['L','R'].forEach(function(l){rot(J,l+'muslo',0.55);rot(J,l+'rodilla',1.0);rot(J,l+'abre',0.22);rot(J,l+'brazo',0.8);rot(J,l+'alza',0.45);rot(J,l+'codo',0.55);});
    rot(J,'columna',0.28);
    var paso=Math.sin(J.t*14)*Math.min(1,Math.abs(J.vx||0)/3);rot(J,'Lmuslo',paso*0.2);rot(J,'Rmuslo',-paso*0.2);
  } else if(a==='patear'){
    var w=p<0.45?e(p/0.45):1, gp=p<0.45?0:e((p-0.45)/0.15), sg=p<0.6?0:e((p-0.6)/0.4);
    rot(J,'Rmuslo',-0.95*w*(1-gp)+1.4*gp-0.95*sg);rot(J,'Rrodilla',1.55*w*(1-gp)+0.1*gp);rot(J,'Rpie',0.3*gp);
    rot(J,'Lmuslo',0.2);rot(J,'Lrodilla',0.35);
    rot(J,'Lalza',1.1+0.3*gp);rot(J,'Ralza',0.5+0.4*w);rot(J,'Lbrazo',0.4*gp);rot(J,'Rbrazo',-0.5*gp);
    rot(J,'giro',-0.35*w+0.55*gp);rot(J,'columna',-0.15*w+0.25*gp-0.1*sg);
    m.position.y=base-0.04;
  } else if(a==='volada'){
    var ev=e(p/0.5), dx=(J.dx||0)*giroL, dy=J.dy||0, lado=Math.abs(dx)<0.3?0:sig(dx);
    /* la estirada: todo el cuerpo se acuesta hacia el lado del tiro, pivoteando en los pies */
    rollo=-sig(dx||1)*(J.rollo||0)*ev;rot(J,'columna',-0.15*ev);
    ['L','R'].forEach(function(l){rot(J,l+'alza',2.5*ev);rot(J,l+'codo',0.1);rot(J,l+'muslo',0.15);});
    rot(J,lado>0?'Rabre':'Labre',0.35*ev);rot(J,'cabeza',-0.2*ev);
    m.position.y=base+Math.max(0,dy)*0.1*ev;
  } else if(a==='festejar'){
    var s2=Math.sin(J.t*9);['L','R'].forEach(function(l){rot(J,l+'alza',2.6+s2*0.2);rot(J,l+'codo',0.4);});
  } else if(a==='lamento'){
    var kk=Math.min(1,J.t*2);['L','R'].forEach(function(l){rot(J,l+'alza',2.0*kk);rot(J,l+'brazo',0.7*kk);rot(J,l+'codo',2.1*kk);});rot(J,'columna',0.3*kk);rot(J,'cabeza',0.35*kk);
  } else if(a==='malabares'){
    var c=(J.t*2.2)%2, der=c<1, q=c%1, lev=Math.sin(q*Math.PI), l2=der?'R':'L';
    rot(J,l2+'muslo',0.9*lev);rot(J,l2+'rodilla',0.7*lev);rot(J,l2+'pie',-0.2*lev);
    rot(J,'Lalza',0.5);rot(J,'Ralza',0.5);rot(J,'columna',0.15);rot(J,'cabeza',0.35);
  } else if(a==='correr'&&J.acelera){rot(J,'columna',0.22);}
  J.raiz.position.set(J.x,J.y||0,J.z);J.raiz.rotation.set(0,J.giro,rollo,'YXZ');
}
/* las esferas de choque del arquero, en los huesos */
function partesFutbolista(J,out){
  J.raiz.updateMatrixWorld(true);out.length=0;
  var add=function(n,r,dy){var b=J.h[n];if(!b)return;b.getWorldPosition(_p0);out.push({x:_p0.x,y:_p0.y+(dy||0),z:_p0.z,r:r});};
  var mid=function(a,b,r){var A=J.h[a],B=J.h[b];if(!A||!B)return;A.getWorldPosition(_p0);B.getWorldPosition(_p1);out.push({x:(_p0.x+_p1.x)/2,y:(_p0.y+_p1.y)/2,z:(_p0.z+_p1.z)/2,r:r});};
  add('L_Hand',0.15);add('R_Hand',0.15);mid('L_Forearm','L_Hand',0.12);mid('R_Forearm','R_Hand',0.12);
  add('Head',0.16,0.08);add('Spine02',0.24);add('Pelvis',0.2);add('L_Calf',0.12);add('R_Calf',0.12);add('L_Foot',0.11);add('R_Foot',0.11);
  return out;
}

/* los dos juegos de funciones conviven: el muñeco viejo queda de respaldo si el modelo no carga */
var _posarViejo=posar, _partesViejo=partesArquero, _vestirViejo=vestirJugador;
posar=function(J,dt){return J.glb?posarFutbolista(J,dt):_posarViejo(J,dt);};
partesArquero=function(J,out){return J.glb?partesFutbolista(J,out):_partesViejo(J,out);};
vestirJugador=function(J,kit){return J.glb?vestirFutbolista(J,kit,false):_vestirViejo(J,kit);};
