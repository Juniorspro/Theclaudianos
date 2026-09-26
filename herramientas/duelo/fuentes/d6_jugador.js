/* ---------------- los jugadores: un muñeco articulado, animado con código ----------------
   Mira hacia -z por defecto (hacia el arco del rival). Rotar una cadera en +x lleva la pierna
   adelante; la rodilla dobla en -x. Todo se arma con cápsulas: silueta clara antes que detalle. */
function capsula(r,l,mat){var m=new THREE.Mesh(new THREE.CapsuleGeometry(r,l,4,10),mat);m.castShadow=true;return m;}
function texNumero(n,colFondo,colNum){
  return lienzoTex(128,128,function(g,w,h){g.fillStyle=colFondo;g.fillRect(0,0,w,h);
    g.font='900 78px "Arial Black",Arial';g.textAlign='center';g.textBaseline='middle';g.lineWidth=8;g.strokeStyle='rgba(0,0,0,0.35)';
    g.strokeText(String(n),w/2,h/2+4);g.fillStyle=colNum;g.fillText(String(n),w/2,h/2+4);});
}
function crearJugador(o){
  /* o: {cam, short, med, piel, pelo, numero, guantes} */
  var M=function(c,r){return new THREE.MeshStandardMaterial({color:col(c),roughness:r||0.7});};
  var mCam=M(o.cam,0.6), mShort=M(o.short), mMed=M(o.med), mPiel=M(o.piel,0.6), mPelo=M(o.pelo,0.9), mBot=M('#1a1a22',0.4), mGuante=M(o.guantes||o.piel,0.5);
  var J={num:o.numero||9,raiz:new THREE.Group(),mats:{cam:mCam,short:mShort,med:mMed,guante:mGuante},x:0,z:0,giro:0,anim:'quieto',t:0,p:0};
  var R=J.raiz;
  var pel=new THREE.Group();pel.position.y=0.95;R.add(pel);J.pelvis=pel;
  var sh=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.2,0.22),mShort);sh.castShadow=true;pel.add(sh);
  var tor=new THREE.Group();tor.position.y=0.06;pel.add(tor);J.torso=tor;
  var pecho=capsula(0.16,0.28,mCam);pecho.scale.set(1.3,1,0.8);pecho.position.y=0.26;tor.add(pecho);
  /* el número en la espalda (la cámara ve la espalda) */
  var num=new THREE.Mesh(new THREE.PlaneGeometry(0.2,0.2),new THREE.MeshStandardMaterial({map:texNumero(o.numero||9,o.cam,'#ffffff'),roughness:0.6,transparent:true}));
  num.position.set(0,0.3,0.131);tor.add(num);J.numero=num;
  var cab=new THREE.Group();cab.position.y=0.55;tor.add(cab);J.cabeza=cab;
  var cuello=capsula(0.05,0.06,mPiel);cuello.position.y=-0.04;cab.add(cuello);
  var cara=new THREE.Mesh(new THREE.SphereGeometry(0.12,16,12),mPiel);cara.scale.set(0.95,1.08,1);cara.position.y=0.1;cara.castShadow=true;cab.add(cara);
  var pelo=new THREE.Mesh(new THREE.SphereGeometry(0.126,16,10,0,TAU,0,Math.PI*0.55),mPelo);pelo.position.y=0.12;pelo.rotation.x=0.25;cab.add(pelo);
  /* la cara (mira a -z): ojos, cejas y nariz; alcanza para que en el vestuario no sea un huevo */
  var mOjo=new THREE.MeshStandardMaterial({color:0x1a1410,roughness:0.3}), mBlanco=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.4});
  [-1,1].forEach(function(l){var b=new THREE.Mesh(new THREE.SphereGeometry(0.026,10,8),mBlanco);b.position.set(l*0.045,0.12,-0.105);b.scale.z=0.5;cab.add(b);
    var o=new THREE.Mesh(new THREE.SphereGeometry(0.015,8,6),mOjo);o.position.set(l*0.045,0.118,-0.118);cab.add(o);
    var c=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.012,0.012),mPelo);c.position.set(l*0.047,0.158,-0.11);c.rotation.z=-l*0.15;cab.add(c);});
  var nar=new THREE.Mesh(new THREE.SphereGeometry(0.02,8,6),mPiel);nar.position.set(0,0.085,-0.122);cab.add(nar);
  var boca=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.008,0.01),mOjo);boca.position.set(0,0.045,-0.112);cab.add(boca);
  var brazo=function(lado){
    var hom=new THREE.Group();hom.position.set(lado*0.24,0.42,0);tor.add(hom);
    var sup=capsula(0.05,0.2,mCam);sup.position.y=-0.12;hom.add(sup);
    var codo=new THREE.Group();codo.position.y=-0.27;hom.add(codo);
    var ant=capsula(0.045,0.18,mPiel);ant.position.y=-0.11;codo.add(ant);
    var mano=new THREE.Mesh(new THREE.SphereGeometry(o.guantes?0.075:0.055,10,8),o.guantes?mGuante:mPiel);mano.position.y=-0.26;mano.castShadow=true;codo.add(mano);
    return {hom:hom,codo:codo,mano:mano};
  };
  var pierna=function(lado){
    var cad=new THREE.Group();cad.position.set(lado*0.1,-0.08,0);pel.add(cad);
    var mus=capsula(0.075,0.26,mPiel);mus.position.y=-0.2;cad.add(mus);
    var rod=new THREE.Group();rod.position.y=-0.42;cad.add(rod);
    var can=capsula(0.062,0.26,mMed);can.position.y=-0.2;rod.add(can);
    var pie=new THREE.Mesh(new THREE.BoxGeometry(0.11,0.08,0.26),mBot);pie.position.set(0,-0.44,-0.05);pie.castShadow=true;rod.add(pie);
    return {cad:cad,rod:rod,pie:pie};
  };
  J.bi=brazo(-1);J.bd=brazo(1);J.pi=pierna(-1);J.pd=pierna(1);
  /* sólo lo grande proyecta sombra: la cara y las manos no se notan y duplican llamadas */
  R.traverse(function(m){if(m.isMesh)m.castShadow=true;});
  cab.traverse(function(m){if(m.isMesh&&m!==cara)m.castShadow=false;});
  R3.escena.add(R);
  return J;
}
function vestirJugador(J,kit){
  J.mats.cam.color.set(kit.cam);J.mats.short.color.set(kit.short);J.mats.med.color.set(kit.med);
  J.numero.material.map=texNumero(J.num||9,kit.cam,'#ffffff');J.numero.material.needsUpdate=true;
}
/* ---------------- las poses ---------------- */
function ceroPose(J){
  J.pelvis.position.set(0,0.95,0);J.pelvis.rotation.set(0,0,0);J.torso.rotation.set(0,0,0);J.cabeza.rotation.set(0,0,0);
  [J.bi,J.bd].forEach(function(b){b.hom.rotation.set(0,0,0);b.codo.rotation.set(0,0,0);});
  [J.pi,J.pd].forEach(function(p){p.cad.rotation.set(0,0,0);p.rod.rotation.set(0,0,0);p.pie.rotation.set(0,0,0);});
}
var ease=function(x){x=lim(x,0,1);return 1-Math.pow(1-x,3);};
function posar(J,dt){
  J.t+=dt;var t=J.t, a=J.anim, p=J.p;
  ceroPose(J);
  if(a==='quieto'||a==='espera'){
    var b=Math.sin(t*3.2);J.pelvis.position.y=0.93+b*0.008;
    J.bi.hom.rotation.z=-0.18;J.bd.hom.rotation.z=0.18;J.bi.codo.rotation.x=0.3;J.bd.codo.rotation.x=0.3;
    J.pi.cad.rotation.x=0.12;J.pi.rod.rotation.x=-0.2;J.pd.cad.rotation.x=-0.05;J.pd.rod.rotation.x=-0.12;
    J.cabeza.rotation.y=Math.sin(t*0.7)*0.15;
  } else if(a==='correr'){
    var f=t*11, s=Math.sin(f);
    J.pelvis.position.y=0.93+Math.abs(Math.cos(f))*0.05;J.torso.rotation.x=-0.18;
    J.pi.cad.rotation.x=s*0.8;J.pd.cad.rotation.x=-s*0.8;
    J.pi.rod.rotation.x=-Math.max(0,-s)*1.3-0.2;J.pd.rod.rotation.x=-Math.max(0,s)*1.3-0.2;
    J.bi.hom.rotation.x=-s*0.8;J.bd.hom.rotation.x=s*0.8;J.bi.codo.rotation.x=1.2;J.bd.codo.rotation.x=1.2;
    J.bi.hom.rotation.z=-0.12;J.bd.hom.rotation.z=0.12;
  } else if(a==='patear'){
    /* impulso atrás, golpe, y la pierna que sigue de largo; la otra se planta */
    var w=p<0.45?ease(p/0.45):1, g=p<0.45?0:ease((p-0.45)/0.15), sg=p<0.6?0:ease((p-0.6)/0.4);
    var cad=-0.9*w*(1-g)+1.35*g-0.9*sg, rod=-1.5*w*(1-g)-0.1*g;
    J.pd.cad.rotation.x=cad;J.pd.rod.rotation.x=rod;
    J.pi.cad.rotation.x=0.25;J.pi.rod.rotation.x=-0.35;
    J.pelvis.rotation.y=-0.35*w+0.5*g;J.torso.rotation.x=-0.25*w+0.2*g;J.pelvis.position.y=0.9;
    J.bi.hom.rotation.z=-0.9-0.3*g;J.bd.hom.rotation.z=0.6+0.4*w;J.bi.hom.rotation.x=0.5*g;J.bd.hom.rotation.x=-0.6*g;
    J.cabeza.rotation.x=0.3;
  } else if(a==='arquero'){
    /* listo para atajar: rodillas dobladas, brazos adelante y abiertos, pasitos al costado */
    var paso=Math.sin(t*14)*Math.min(1,Math.abs(J.vx||0)/3);
    J.pelvis.position.y=0.82;J.torso.rotation.x=0.25;
    J.pi.cad.rotation.set(0.55+paso*0.2,0,-0.2);J.pd.cad.rotation.set(0.55-paso*0.2,0,0.2);J.pi.rod.rotation.x=-0.95;J.pd.rod.rotation.x=-0.95;
    J.bi.hom.rotation.set(0.9,0,-0.55);J.bd.hom.rotation.set(0.9,0,0.55);J.bi.codo.rotation.x=0.5;J.bd.codo.rotation.x=0.5;
    J.cabeza.rotation.x=-0.2;
  } else if(a==='volada'){
    /* la estirada: el cuerpo se acuesta hacia el lado, los brazos se estiran por arriba de la cabeza */
    var e=ease(p/0.55), dx=J.dx||0, dy=J.dy||0, lado=Math.abs(dx)<0.3?0:sig(dx), cae=p>0.7?ease((p-0.7)/0.3):0;
    J.pelvis.position.y=0.9+Math.max(0,dy)*0.55*e;
    J.pelvis.rotation.z=-lado*Math.min(1.35,0.35+Math.abs(dx)*0.5)*e;
    J.pelvis.rotation.x=0.15*e;
    var arr=lado===0?1:0.4+Math.min(1,Math.abs(dy))*0.3;
    J.bi.hom.rotation.set(0.2*e,0,-(0.4+2.5*e*(lado<=0?1:0.8)));J.bd.hom.rotation.set(0.2*e,0,0.4+2.5*e*(lado>=0?1:0.8));
    J.bi.codo.rotation.x=0.1;J.bd.codo.rotation.x=0.1;
    J.pi.cad.rotation.set(0.2,0,-0.3*e);J.pd.cad.rotation.set(0.2,0,0.3*e);J.pi.rod.rotation.x=-0.3;J.pd.rod.rotation.x=-0.3;
    J.cabeza.rotation.z=lado*0.3*e;
  } else if(a==='festejar'){
    var s2=Math.sin(t*9);J.pelvis.position.y=0.95+Math.max(0,s2)*0.12;
    J.bi.hom.rotation.z=-2.6-s2*0.25;J.bd.hom.rotation.z=2.6+s2*0.25;J.bi.codo.rotation.x=0.4;J.bd.codo.rotation.x=0.4;
    J.pi.cad.rotation.x=Math.max(0,s2)*0.5;J.pi.rod.rotation.x=-Math.max(0,s2)*0.9;J.cabeza.rotation.x=-0.35;J.torso.rotation.x=-0.15;
  } else if(a==='lamento'){
    J.pelvis.position.y=0.9;J.torso.rotation.x=0.35;J.cabeza.rotation.x=0.5;
    J.bi.hom.rotation.set(-2.4,0,-0.6);J.bd.hom.rotation.set(-2.4,0,0.6);J.bi.codo.rotation.x=-2.2;J.bd.codo.rotation.x=-2.2;
    J.pi.rod.rotation.x=-0.15;J.pd.rod.rotation.x=-0.15;
  } else if(a==='malabares'){
    /* jueguito: una pierna y la otra, la pelota sube y baja (la pelota la mueve el menú) */
    var c=(t*2.2)%2, der=c<1, q=c%1, lev=Math.sin(q*Math.PI);
    var pp=der?J.pd:J.pi, otra=der?J.pi:J.pd;
    pp.cad.rotation.x=0.9*lev;pp.rod.rotation.x=-0.6*lev;pp.pie.rotation.x=-0.3*lev;otra.rod.rotation.x=-0.15;
    J.bi.hom.rotation.z=-0.5;J.bd.hom.rotation.z=0.5;J.torso.rotation.x=0.12;J.cabeza.rotation.x=0.35;J.pelvis.position.y=0.93;
  }
  R3JugadorPos(J);
}
function R3JugadorPos(J){J.raiz.position.set(J.x,J.y||0,J.z);J.raiz.rotation.y=J.giro;}
/* ---------------- dónde están sus partes (para que ataje de verdad) ---------------- */
var _w=new THREE.Vector3();
function partesArquero(J,out){
  J.raiz.updateMatrixWorld(true);
  out.length=0;
  var add=function(o,r,dy){o.getWorldPosition(_w);out.push({x:_w.x,y:_w.y+(dy||0),z:_w.z,r:r});};
  add(J.bi.mano,0.14);add(J.bd.mano,0.14);
  /* el antebrazo también ataja */
  var mid=function(b){b.codo.getWorldPosition(_w);var a=_w.clone();b.mano.getWorldPosition(_w);out.push({x:(a.x+_w.x)/2,y:(a.y+_w.y)/2,z:(a.z+_w.z)/2,r:0.12});};
  mid(J.bi);mid(J.bd);
  J.cabeza.getWorldPosition(_w);out.push({x:_w.x,y:_w.y+0.1,z:_w.z,r:0.16});
  J.torso.getWorldPosition(_w);out.push({x:_w.x,y:_w.y+0.22,z:_w.z,r:0.24});
  J.pelvis.getWorldPosition(_w);out.push({x:_w.x,y:_w.y,z:_w.z,r:0.2});
  add(J.pi.rod,0.12);add(J.pd.rod,0.12);add(J.pi.pie,0.11);add(J.pd.pie,0.11);
  return out;
}
