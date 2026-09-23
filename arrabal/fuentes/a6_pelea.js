
/* ===========================================================================
   LA PELEA — escenario, luchadores, golpes, cuadros de golpe, IA y equipos
   ========================================================================= */
var MUNDO_W=1300, GRAV=1650;
var ESC={y0:96,h:470,suelo:0};            /* el escenario en la pantalla: se recalcula con el alto */
function medirEscenario(){
  /* apaisado: el escenario es toda la pantalla; el HUD y el mando van encima */
  ESC.y0=0;
  ESC.h=ALTO;
  ESC.suelo=ALTO-44;
}
/* ---------------- las poses clave ---------------- */
var G0=GUARDIA;
var SALTO=conPose(G0,{pFm:1.1,pFr:1.7,pTm:0.3,pTr:1.5,tor:0.1,bFs:1.1,bFc:1.4});
var POSES={
  guardia:G0,
  jab:conPose(G0,{tor:0.3,bFs:1.55,bFc:0.05,pFm:0.5,pTm:-0.45}),
  jabPrep:conPose(G0,{tor:0.05,bFs:0.7,bFc:2.1,pFm:0.3,pTm:-0.35}),
  cruz:conPose(G0,{tor:0.45,bTs:1.55,bTc:0.05,bFs:0.6,bFc:2.0,pFm:0.55,pTm:-0.5}),
  gancho:conPose(G0,{tor:0.2,cab:0.1,bFs:1.95,bFc:1.1,pFm:0.45,pTm:-0.4}),
  cuerpo:conPose(G0,{tor:0.62,bFs:1.25,bFc:0.2,pFm:0.75,pFr:0.9,pTm:-0.5,pTr:0.6}),
  patBaja:conPose(G0,{tor:-0.1,pFm:1.2,pFr:0.1,bFs:0.6,bFc:1.2}),
  patMedia:conPose(G0,{tor:-0.28,pFm:1.62,pFr:0.05,bFs:0.4,bTs:-0.3}),
  patAlta:conPose(G0,{tor:-0.48,pFm:2.15,pFr:0,bFs:0.2,bTs:-0.6,cab:0.2}),
  patPrep:conPose(G0,{tor:0.05,pFm:0.9,pFr:1.9,bFs:0.7}),
  fuerte:conPose(G0,{tor:0.62,bFs:1.6,bFc:0,bTs:-0.45,bTc:0.6,pFm:0.95,pFr:0.25,pTm:-0.95,pTr:0.05}),
  fuertePrep:conPose(G0,{tor:-0.2,bFs:0.2,bFc:2.3,bTs:0.3,pFm:0.2,pTm:-0.3}),
  alzada:conPose(G0,{tor:-0.15,cab:-0.2,bFs:2.9,bFc:0.2,pFm:0.25,pTm:-0.3}),
  alzadaPrep:conPose(G0,{tor:0.35,bFs:0.4,bFc:0.4,pFm:0.8,pFr:1.4,pTm:-0.5,pTr:0.9}),
  barrida:conPose(G0,{tor:0.55,pFm:1.55,pFr:0,pTm:-0.35,pTr:2.3,bFs:0.4,bTs:-0.2}),
  salto:SALTO,
  aerea1:conPose(SALTO,{pFm:1.5,pFr:0.1,tor:-0.1}),
  aerea2:conPose(SALTO,{bFs:1.7,bFc:0.1,tor:0.3}),
  aerea3:conPose(SALTO,{bFs:2.8,bFc:0.4,bTs:2.6,bTc:0.4,tor:-0.3}),
  azote:conPose(SALTO,{bFs:0.7,bFc:0.2,bTs:0.6,bTc:0.2,tor:0.65,pFm:0.6,pFr:0.4}),
  bloqueo:conPose(G0,{tor:-0.08,bFs:1.3,bFc:2.3,bTs:1.1,bTc:2.4,cab:0.15,pFm:0.3,pTm:-0.45}),
  golpeado:conPose(G0,{tor:-0.4,cab:-0.35,bFs:0.3,bFc:0.6,bTs:-0.3,bTc:0.5,pFm:0.5,pTm:-0.2}),
  aireG:conPose(G0,{tor:-0.7,cab:-0.4,bFs:-0.5,bFc:0.3,bTs:-0.9,bTc:0.2,pFm:0.7,pFr:0.3,pTm:-0.3,pTr:0.6}),
  caido:conPose(G0,{giro:-1.45,tor:0,cab:-0.1,bFs:0.4,bFc:0.3,bTs:-0.4,bTc:0.2,pFm:0.25,pFr:0.3,pTm:-0.1,pTr:0.1}),
  dash:conPose(G0,{tor:0.55,bFs:0.4,bFc:1.4,bTs:-0.6,bTc:0.8,pFm:1.1,pFr:1.1,pTm:-0.8,pTr:0.3}),
  dashAtras:conPose(G0,{tor:-0.3,bFs:1.2,bFc:1.8,pFm:0.7,pFr:0.2,pTm:-0.2,pTr:1.2}),
  victoria:conPose(G0,{tor:-0.1,cab:-0.15,bFs:3.0,bFc:0.3,bTs:0.4,bTc:0.6,pFm:0.15,pFr:0.1,pTm:-0.15,pTr:0.05}),
  giro1:conPose(G0,{tor:-0.3,pFm:1.9,pFr:0.1,bFs:-0.6,bTs:2.2}),
  giro2:conPose(G0,{tor:0.3,pTm:1.9,pTr:0.1,pFm:-0.2,bTs:-0.6,bFs:2.2})
};
/* ---------------- los golpes ----------------
   Los de cadena casi no empujan y avanzan un paso: si empujaran, el tercero no llega
   (medido: el rival quedaba a 120 y el jab alcanza 105). El remate sí empuja fuerte.
   k: poses clave [cuadro, pose]; act: cuadros activos; cad: desde qué cuadro se puede encadenar */
function golpe(o){
  var d={dur:18,act:[6,9],cad:8,dmg:0.1,hs:18,bs:12,emp:120,lanz:0,derriba:false,caja:[18,-95,52,40],
    sfx:'golpe1',silb:'silbido',med:0.09,parada:4,avance:0,tipo:'normal',aire:false};
  for(var k in o)d[k]=o[k];
  return d;
}
var NORMALES={
  jab:golpe({emp:40,avance:110,k:[[0,'jabPrep'],[5,'jab'],[11,'jab'],[16,'guardia']],dur:16,act:[5,8],cad:7,dmg:0.1,caja:[16,-104,50,34]}),
  cruz:golpe({emp:40,avance:110,k:[[0,'jabPrep'],[6,'cruz'],[12,'cruz'],[18,'guardia']],dur:18,act:[6,9],cad:8,dmg:0.11,caja:[16,-104,54,34]}),
  gancho:golpe({emp:40,avance:110,k:[[0,'jabPrep'],[7,'gancho'],[13,'gancho'],[20,'guardia']],dur:20,act:[7,10],cad:9,dmg:0.13,caja:[10,-122,48,44],sfx:'golpe2'}),
  cuerpo:golpe({k:[[0,'fuertePrep'],[8,'cuerpo'],[16,'cuerpo'],[26,'guardia']],dur:26,act:[8,12],cad:11,dmg:0.18,hs:24,emp:260,caja:[14,-86,56,40],sfx:'golpe2',parada:6}),
  patBaja:golpe({emp:40,avance:110,k:[[0,'patPrep'],[5,'patBaja'],[11,'patBaja'],[16,'guardia']],dur:16,act:[5,8],cad:7,dmg:0.1,caja:[18,-60,56,34]}),
  patMedia:golpe({emp:40,avance:110,k:[[0,'patPrep'],[6,'patMedia'],[12,'patMedia'],[18,'guardia']],dur:18,act:[6,9],cad:8,dmg:0.11,caja:[18,-92,60,38]}),
  patAlta:golpe({k:[[0,'patPrep'],[8,'patAlta'],[16,'patAlta'],[26,'guardia']],dur:26,act:[8,12],cad:11,dmg:0.18,hs:24,emp:260,caja:[14,-128,62,46],sfx:'golpe2',parada:6}),
  fuerte:golpe({k:[[0,'fuertePrep'],[11,'fuerte'],[20,'fuerte'],[30,'guardia']],dur:30,act:[11,15],cad:99,dmg:0.3,hs:32,bs:18,emp:520,
    caja:[14,-104,70,46],sfx:'golpe3',silb:'silbido2',parada:9,avance:260,med:0.16}),
  alzada:golpe({k:[[0,'alzadaPrep'],[8,'alzada'],[18,'alzada'],[28,'guardia']],dur:28,act:[8,12],cad:12,dmg:0.2,hs:40,lanz:640,
    caja:[8,-150,52,90],sfx:'golpe2',silb:'silbido2',parada:6,med:0.14}),
  barrida:golpe({k:[[0,'alzadaPrep'],[9,'barrida'],[20,'barrida'],[30,'guardia']],dur:30,act:[9,14],cad:99,dmg:0.22,derriba:true,
    caja:[14,-34,74,30],sfx:'golpe2',silb:'silbido2',parada:6,avance:140,bajo:true}),
  aerea1:golpe({k:[[0,'salto'],[4,'aerea1'],[12,'aerea1'],[16,'salto']],dur:16,act:[4,9],cad:8,dmg:0.1,hs:22,aire:true,caja:[10,-90,56,50]}),
  aerea2:golpe({k:[[0,'salto'],[5,'aerea2'],[13,'aerea2'],[18,'salto']],dur:18,act:[5,10],cad:9,dmg:0.11,hs:22,aire:true,caja:[10,-110,56,44]}),
  aerea3:golpe({k:[[0,'salto'],[6,'aerea3'],[14,'aerea3'],[22,'salto']],dur:22,act:[6,11],cad:10,dmg:0.14,hs:24,aire:true,caja:[4,-140,60,60],sfx:'golpe2'}),
  azote:golpe({k:[[0,'aerea3'],[8,'azote'],[20,'azote'],[26,'salto']],dur:26,act:[8,14],cad:99,dmg:0.26,aire:true,derriba:true,rebote:true,
    caja:[4,-80,64,70],sfx:'golpe3',silb:'silbido2',parada:9,med:0.15})
};
/* cada estilo arma su cadena de cuatro con los golpes que le quedan bien */
var CADENAS={baston:['jab','cruz','patBaja','cuerpo'],arpon:['jab','cruz','patBaja','cuerpo'],garras:['jab','cruz','gancho','cuerpo'],
  lucha:['jab','cruz','gancho','cuerpo'],palo:['jab','cruz','patBaja','cuerpo'],
  patadas:['patBaja','patMedia','jab','patAlta'],punos:['jab','cruz','gancho','cuerpo'],
  vara:['jab','cruz','patBaja','cuerpo'],bolas:['jab','cruz','patBaja','cuerpo'],
  gancho:['jab','cruz','patBaja','cuerpo'],llave:['jab','cruz','patBaja','cuerpo']};
/* las armas largas pegan más lejos: se estira la caja de golpe de las manos */
var ALCANCE_ARMA={vara:1.45,bolas:1.3,gancho:1.4,llave:1.12,patadas:1.08,punos:1,baston:1.5,arpon:1.3,garras:1.1,lucha:0.95,palo:1.35};

/* ---------------- los especiales y súper de cada uno ---------------- */
var ESPECIALES={
  ocho:golpe({k:[[0,'patPrep'],[6,'giro1'],[12,'giro2'],[18,'giro1'],[24,'giro2'],[30,'patAlta'],[40,'guardia']],dur:40,act:[6,32],multi:6,
    dmg:0.09,hs:20,emp:60,avance:420,tipo:'esp',caja:[4,-110,64,70],sfx:'golpe1',color:'255,90,110'}),
  boleo:golpe({busca:true,k:[[0,'patPrep'],[9,'patAlta'],[20,'patAlta'],[32,'guardia']],dur:32,act:[9,14],dmg:0.34,lanz:700,hs:40,tipo:'esp',
    caja:[6,-170,66,120],sfx:'golpe3',parada:8,color:'255,90,110'}),
  fuelle:golpe({k:[[0,'fuertePrep'],[10,'fuerte'],[26,'fuerte'],[34,'guardia']],dur:34,act:[99,99],tipo:'esp',proy:'aire',sfx:'viento',fuelle:true}),
  estiba:golpe({busca:true,k:[[0,'fuertePrep'],[14,'fuerte'],[24,'fuerte'],[36,'guardia']],dur:36,act:[14,18],dmg:0.5,derriba:true,imparable:true,tipo:'esp',
    avance:380,caja:[10,-110,76,70],sfx:'golpe3',parada:12,color:'255,200,90'}),
  farol:golpe({k:[[0,'jabPrep'],[9,'jab'],[22,'jab'],[30,'guardia']],dur:30,act:[99,99],tipo:'esp',proy:'fuego',sfx:'fuego'}),
  mecha:golpe({k:[[0,'alzadaPrep'],[10,'alzada'],[26,'alzada'],[34,'guardia']],dur:34,act:[99,99],tipo:'esp',proy:'pilar',sfx:'fuego'}),
  boleadora:golpe({k:[[0,'fuertePrep'],[10,'jab'],[22,'jab'],[30,'guardia']],dur:30,act:[99,99],tipo:'esp',proy:'bolas',sfx:'electro'}),
  pava:golpe({busca:true,k:[[0,'bloqueo'],[8,'victoria'],[30,'victoria'],[38,'guardia']],dur:38,act:[8,30],multi:6,dmg:0.1,hs:20,emp:40,tipo:'esp',
    caja:[-50,-150,120,150],sfx:'electro',color:'120,220,255',aura:'120,220,255'}),
  anzuelo:golpe({k:[[0,'jabPrep'],[8,'jab'],[24,'jab'],[32,'guardia']],dur:32,act:[99,99],tipo:'esp',proy:'anzuelo',sfx:'cadena'}),
  cardumen:golpe({k:[[0,'jabPrep'],[10,'jab'],[24,'jab'],[32,'guardia']],dur:32,act:[99,99],tipo:'esp',proy:'peces',sfx:'agua'}),
  bondi:golpe({k:[[0,'jabPrep'],[8,'jab'],[22,'jab'],[30,'guardia']],dur:30,act:[99,99],tipo:'esp',proy:'bondi',sfx:'dash'}),
  /* la segunda tanda */
  palma:golpe({k:[[0,'fuertePrep'],[10,'fuerte'],[24,'fuerte'],[32,'guardia']],dur:32,act:[99,99],tipo:'esp',proy:'palma',sfx:'carga'}),
  rodilla:golpe({busca:true,k:[[0,'alzadaPrep'],[8,'patMedia'],[18,'patMedia'],[30,'guardia']],dur:30,act:[8,13],dmg:0.34,lanz:720,hs:40,tipo:'esp',
    caja:[4,-150,60,110],sfx:'golpe3',parada:8,color:'255,215,80'}),
  remolino:golpe({k:[[0,'jabPrep'],[5,'giro1'],[10,'giro2'],[15,'giro1'],[20,'giro2'],[25,'giro1'],[36,'guardia']],dur:36,act:[5,28],multi:6,
    dmg:0.085,hs:20,emp:60,avance:380,tipo:'esp',caja:[-10,-130,90,110],sfx:'golpe1',color:'120,230,150'}),
  estocada:golpe({busca:true,k:[[0,'fuertePrep'],[12,'fuerte'],[24,'fuerte'],[34,'guardia']],dur:34,act:[12,16],dmg:0.42,hs:34,emp:560,tipo:'esp',
    caja:[10,-110,110,40],sfx:'golpe3',parada:9,color:'255,120,90'}),
  arpon:golpe({k:[[0,'jabPrep'],[8,'jab'],[24,'jab'],[32,'guardia']],dur:32,act:[99,99],tipo:'esp',proy:'arpon',sfx:'cadena'}),
  mina:golpe({k:[[0,'barrida'],[10,'barrida'],[24,'barrida'],[32,'guardia']],dur:32,act:[99,99],tipo:'esp',proy:'mina',sfx:'metal'}),
  zarpazo:golpe({busca:true,k:[[0,'jabPrep'],[5,'jab'],[10,'cruz'],[15,'jab'],[20,'cruz'],[32,'guardia']],dur:32,act:[5,22],multi:4,dmg:0.11,hs:22,emp:60,avance:300,tipo:'esp',
    caja:[6,-120,62,70],sfx:'golpe2',color:'255,190,60'}),
  aullido:golpe({k:[[0,'bloqueo'],[10,'victoria'],[30,'victoria'],[38,'guardia']],dur:38,act:[99,99],tipo:'esp',proy:'aullido',sfx:'viento'}),
  embestida:golpe({k:[[0,'fuertePrep'],[10,'dash'],[26,'dash'],[38,'guardia']],dur:38,act:[10,26],dmg:0.4,derriba:true,imparable:true,avance:520,tipo:'esp',
    caja:[0,-120,60,100],sfx:'golpe3',parada:10,color:'255,120,60'}),
  suplex:golpe({busca:true,k:[[0,'fuertePrep'],[10,'alzada'],[22,'alzada'],[36,'guardia']],dur:36,act:[10,14],dmg:0.58,lanz:760,imparable:true,tipo:'esp',
    caja:[4,-140,56,120],sfx:'golpe3',parada:14,color:'255,220,140'}),
  bochazo:golpe({k:[[0,'fuertePrep'],[8,'jab'],[20,'jab'],[28,'guardia']],dur:28,act:[99,99],tipo:'esp',proy:'bocha',sfx:'golpe1'}),
  barripalo:golpe({busca:true,k:[[0,'alzadaPrep'],[8,'barrida'],[20,'barrida'],[30,'guardia']],dur:30,act:[8,14],dmg:0.34,derriba:true,tipo:'esp',
    caja:[10,-40,96,34],sfx:'golpe2',parada:7,bajo:true,color:'120,170,255'}),
  llave:golpe({busca:true,k:[[0,'alzada'],[12,'fuerte'],[22,'fuerte'],[34,'guardia']],dur:34,act:[12,16],dmg:0.46,derriba:true,imparable:true,tipo:'esp',
    caja:[6,-120,64,110],sfx:'metal',parada:10,avance:160,color:'200,210,230'})
};
/* el súper: todos tienen cinemática; después cada uno hace lo suyo */
var SUPERS={
  tango:{proy:null,rafaga:9,avance:520,color:'255,70,100'},
  vapor:{proy:'vapor',color:'230,240,255'},
  faroles:{proy:'lluviaFuego',color:'255,150,40'},
  pampero:{proy:'rayos',color:'140,230,255'},
  crecida:{proy:'ola',color:'80,210,200',cura:0.25},
  horapico:{proy:'colectivos',color:'255,210,60'},
  milpalmas:{proy:null,rafaga:10,avance:520,color:'255,215,80'},
  bambu:{proy:null,rafaga:9,avance:520,color:'120,230,150'},
  torpedo:{proy:'torpedo',color:'255,140,60'},
  lunallena:{proy:null,rafaga:8,avance:560,color:'255,190,60',cura:0.15},
  campeon:{proy:null,rafaga:5,avance:480,color:'255,120,60'},
  golazo:{proy:'lluviaBochas',color:'240,240,255'}
};

/* ---------------- un luchador ---------------- */
function nuevoLuchador(inst,lado){
  var C=cartaDe(inst.id), L=LUCH[C.l], st=statsDe(inst);
  var F={inst:inst,C:C,L:L,l:C.l,lado:lado,x:0,y:0,vx:0,vy:0,f:lado?-1:1,enSuelo:true,
    vida:st.vida,vidaMax:st.vida,rastro:st.vida,atk:st.atk,crit:st.crit,elem:C.e,firma:C.f,
    est:'guardia',t:0,mov:null,fr:0,pose:conPose(G0,{}),exp:'normal',parpadeo:false,
    combo:0,cadena:0,buffer:null,inv:0,stun:0,med:0,cd:[0,0],golpesMov:0,multiT:0,
    quema:0,contra:false,escudo:0,golpeando:false,ko:false,aereos:0,tEst:0};
  if(F.firma==='arranque')F.med=1;
  return F;
}
function rinde(F,f){return F.firma===f?(F.inst.arbol&&F.inst.arbol.fir?1.5:1):0;}
function rival(F){return M.act[1-F.lado];}
function distancia(F){var R=rival(F);return R?Math.abs(R.x-F.x):999;}
function mirarRival(F){var R=rival(F);if(R&&F.enSuelo&&(F.est==='guardia'||F.est==='camina'||F.est==='bloqueo'))F.f=R.x>F.x?1:-1;}
function ponerEstado(F,e){
  if(e==='dash'&&F.est!=='dash'&&F.enSuelo)polvo(F.x-F.f*20,F.y,5);    /* el arranque levanta tierra */
  F.est=e;F.tEst=0;
}
function empezarMov(F,nombre,mov){
  F.est='ataque';F.mov=mov;F.movNom=nombre;F.fr=0;F.golpesMov=0;F.multiT=0;F.tEst=0;
  if(mov.avance&&F.enSuelo)F.vx=mov.avance*F.f;
  if(mov.silb)Sonido.fx(mov.silb);
}
/* ---------------- las órdenes (del jugador o de la IA) ---------------- */
function orden(F,o){
  if(!F||F.ko||M.fin)return;
  var libre=F.est==='guardia'||F.est==='camina'||F.est==='bloqueo';
  var enCadena=F.est==='ataque'&&F.fr>=F.mov.cad&&F.golpesMov>0;
  var aire=!F.enSuelo, R=rival(F), alc=64*TAM*F.L.alcance*(ALCANCE_ARMA[F.L.estilo]||1);
  if(F.est==='ataque'&&!enCadena){F.buffer=o;return;}      /* se guarda y sale apenas se pueda */
  if(!libre&&!enCadena&&!(aire&&F.est==='salto'))return;
  var cad=CADENAS[F.L.estilo];
  if(o==='toca'){
    if(aire){
      var n=F.aereos%3;F.aereos++;
      empezarMov(F,'aerea'+(n+1),NORMALES['aerea'+(n+1)]);return;
    }
    if(libre&&R&&distancia(F)>alc*1.35){dashear(F,1,'toca');return;}   /* lejos: se acerca y pega */
    var i=enCadena?Math.min(3,F.cadena+1):0;
    F.cadena=i;empezarMov(F,cad[i],NORMALES[cad[i]]);return;
  }
  if(o==='adelante'){
    if(aire)return;
    if(enCadena||(R&&distancia(F)<alc*1.4)){F.cadena=0;empezarMov(F,'fuerte',NORMALES.fuerte);return;}
    dashear(F,1,null);return;
  }
  if(o==='atras'){if(!aire&&libre)dashear(F,-1,null);return;}
  if(o==='arriba'){
    if(aire)return;
    if(enCadena){F.cadena=0;empezarMov(F,'alzada',NORMALES.alzada);F.persigue=true;return;}
    saltar(F,0);return;
  }
  if(o==='abajo'){
    if(aire){empezarMov(F,'azote',NORMALES.azote);F.vy=Math.max(F.vy,420);return;}
    F.cadena=0;empezarMov(F,'barrida',NORMALES.barrida);return;
  }
  if(o==='esp0'||o==='esp1'){
    var k=o==='esp0'?0:1;
    if(F.cd[k]>0||aire)return;
    var e=F.L.esp[k];
    F.cd[k]=e.cd*(1-rinde(F,'enfriar')*0.25);
    F.cadena=0;empezarMov(F,e.id,ESPECIALES[e.id]);
    Sonido.fx('carga');return;
  }
  if(o==='super'){
    if(F.med<2||aire)return;
    F.med-=2;
    empezarSuper(F);return;
  }
}
function dashear(F,dir,despues){
  ponerEstado(F,dir>0?'dash':'dashAtras');
  F.vx=(dir>0?480:-420)*F.f*F.L.vel;F.buffer=despues;
  if(dir<0)F.inv=0.18;
  Sonido.fx('dash');polvo(F.x,F.y,6);
}
function saltar(F,dirX){
  ponerEstado(F,'salto');F.enSuelo=false;F.vy=-720;F.vx=dirX*200;F.aereos=0;
  Sonido.fx('salto');polvo(F.x,F.y,5);
}
/* ---------------- recibir un golpe ---------------- */
function pegar(A,D,mov,x,y,escala){
  if(!D||D.ko||D.inv>0)return false;
  escala=escala||1;
  var cubre=D.est==='bloqueo'&&D.enSuelo&&!mov.imparable&&Math.sign(A.x-D.x)===D.f;
  if(cubre){
    D.stun=mov.bs/60;D.vx=-D.f*mov.emp*0.9;
    var chip=mov.tipo==='esp'||mov.tipo==='sup'?0.12:0;
    if(chip)herir(D,A,A.atk*mov.dmg*chip*escala,false);
    D.med=Math.min(3,D.med+0.05);D.contra=D.firma==='contra';
    Sonido.fx('bloqueo');FX.chispa(x,y,'255,255,255',true);
    FX.congelar(3);
    return true;
  }
  /* el daño: ataque × golpe × elemento × escalado del combo × crítico */
  var comboEsc=Math.max(0.35,1-D.combo*0.07);
  var dmg=A.atk*mov.dmg*escala*ventajaElem(A.elem,D.elem)*comboEsc;
  if(A.firma==='combo')dmg*=1+Math.min(0.36,D.combo*0.03)*rinde(A,'combo');
  if(A.firma==='furia'&&A.vida<A.vidaMax*0.35)dmg*=1+0.35*rinde(A,'furia');
  if(A.contra){dmg*=1.5;A.contra=false;}
  if(D.firma==='coraza')dmg*=1-0.15*rinde(D,'coraza');
  var arb=A.inst.arbol||{};
  if(mov.tipo==='esp')dmg*=1+(arb.sp1&&A.movNom===A.L.esp[0].id?0.2:0)+(arb.sp2&&A.movNom===A.L.esp[1].id?0.2:0);
  if(mov.tipo==='sup'&&arb.sup)dmg*=1.25;
  var pc=A.crit+(!A.enSuelo?0.25*rinde(A,'critAereo'):0), crit=rnd()<pc;
  if(crit)dmg*=1.5;
  herir(D,A,dmg,crit);
  if(A.firma==='robo')A.vida=Math.min(A.vidaMax,A.vida+dmg*0.04*rinde(A,'robo'));
  if(mov.tipo==='esp'&&A.firma==='quemadura')D.quema=3;
  A.med=Math.min(3,A.med+mov.med*(1+0.3*rinde(A,'medidor')));
  D.med=Math.min(3,D.med+mov.med*0.5);
  D.combo++;M.comboVis={n:D.combo,t:1.4,lado:A.lado};
  if(M.modo==='arcade'&&A.lado===0)M.puntos+=Math.round(dmg*10)+D.combo*50;
  /* los anuncios del salón: el combo largo se festeja */
  var AN={5:['¡BIEN!','#bff0ff','#3a8ad8'],10:['¡GRAN COMBO!','#ffe36a','#ff5a1a'],15:['¡BESTIAL!','#ffb0e0','#c02a8a'],20:['¡ARRABALERO!','#ffffff','#ff2a2a']}[D.combo];
  if(AN&&M.modo!=='demo'){M.anuncio={txt:AN[0],t:1.3,col1:AN[1],col2:AN[2],lado:A.lado};Sonido.fx('anuncio');}
  if(D.combo>M.comboMax[A.lado])M.comboMax[A.lado]=D.combo;
  /* cómo sale volando */
  if(D.vida<=0){noquear(D,A);}
  else if(mov.lanz||!D.enSuelo){
    ponerEstado(D,'aireG');D.enSuelo=false;
    D.vy=mov.lanz?-mov.lanz:-260*Math.max(0.4,1-D.combo*0.05);
    D.vx=-D.f*(mov.emp*0.4);D.stun=1;
    if(mov.rebote)D.vy=520;
  } else if(mov.derriba){
    ponerEstado(D,'aireG');D.enSuelo=false;D.vy=-380;D.vx=-D.f*260;D.stun=1;D.derribado=true;
  } else {
    ponerEstado(D,'golpeado');D.stun=mov.hs/60;D.vx=-D.f*mov.emp;
  }
  D.f=A.x>D.x?1:-1;
  D.exp='dolor';
  /* el impacto: congelado, temblor, chispa y sonido según el peso del golpe */
  FX.congelar(mov.parada+(crit?3:0));
  FX.sacudir(mov.parada*0.9);
  var colG=mov.color||(crit?'255,230,90':'255,250,230'), fuerte=mov.parada>=8||crit;
  FX.chispa(x,y,colG,false,fuerte);
  FX.onda(x,y,colG,fuerte);
  if(mov.tipo!=='normal'||ALCANCE_ARMA[A.L.estilo]>1.2)FX.tajo(x,y,A.f,colG,fuerte);
  if(mov.parada>=10||crit){FX.acercar(x,y,crit?1.12:1.08);FX.velocidad(0.28);FX.flash=Math.max(FX.flash,0.16);}
  D.tBlanco=Date.now();
  if(!D.enSuelo||mov.derriba||mov.lanz)polvo(D.x,D.y,4);
  if(crit)FX.texto(x,y-30,'¡CRÍTICO!','#ffd76a',16);
  sonarGolpe(A,mov,crit);
  vibrar(mov.parada>=8?40:12);
  return true;
}
/* el sonido del golpe, por capas: el impacto (piña o patada según el golpe), el arma si la hay,
   y el crítico encima */
var CAPA_ARMA={vara:'madera',baston:'madera',palo:'madera',gancho:'metal',llave:'metal',arpon:'metal',garras:'garra'};
function sonarGolpe(A,mov,crit){
  var sfx=mov.sfx||'golpe1', nom=A.movNom||'';
  if((sfx==='golpe1'||sfx==='golpe2')&&/^pat|aerea2|aerea3|barrida|giro|rodilla/.test(nom))sfx='patada';
  Sonido.fx(sfx);
  var capa=CAPA_ARMA[A.L.estilo];
  if(capa&&mov.tipo!=='sup'&&!/^pat|aerea2|aerea3|rodilla/.test(nom))Sonido.fx(capa,0.6);
  if(crit)Sonido.fx('critico',0.8);
  if(mov.parada>=10&&sfx!=='golpe3')Sonido.fx('golpe3',0.55);     /* los que frenan la pelea, con peso abajo */
}
function herir(D,A,d,crit){
  D.vida=Math.max(0,D.vida-d);
  FX.numero(D.x,D.y-150*D.L.alto*TAM,Math.round(d),crit);
}
function noquear(D,A){
  D.ko=true;D.vida=0;ponerEstado(D,'aireG');D.enSuelo=false;D.vy=-520;D.vx=-D.f*300;D.stun=9;
  D.exp='ko';
  M.lento=0.9;                       /* el K.O. en cámara lenta */
  FX.sacudir(12);FX.flash=0.6;
  Sonido.fx('ko');vibrar(120);
  M.cartel={txt:'K.O.',t:1.6,col:'#ff4a5a'};
}
/* ---------------- el súper: cinemática con el retrato, después el ataque ---------------- */
function empezarSuper(F){
  var S=SUPERS[F.L.sup.id];
  M.cine={F:F,t:0,dur:1.1,nom:F.L.sup.nom,col:S.color};FX.velocidad(1.4);
  ponerEstado(F,'super');F.vx=0;F.inv=2;
  Sonido.fx('super');vibrar(60);
}
function ejecutarSuper(F){
  var S=SUPERS[F.L.sup.id], R=rival(F), mov=golpe({dmg:0.16,hs:26,emp:80,tipo:'sup',sfx:'golpe2',parada:5,med:0,color:S.color});
  if(S.rafaga){                      /* el tango final: se tira encima y encadena */
    F.x=R?R.x-F.f*50:F.x;F.rafaga={n:S.rafaga,t:0,mov:mov};ponerEstado(F,'rafaga');
  } else {
    lanzarProy(F,S.proy,mov);ponerEstado(F,'ataque');F.mov=golpe({k:[[0,'victoria'],[30,'victoria'],[44,'guardia']],dur:44,act:[99,99],tipo:'sup'});F.fr=0;
    if(S.cura)F.vida=Math.min(F.vidaMax,F.vida+F.vidaMax*S.cura*0.4);
  }
  F.inv=0.6;
}
/* ---------------- proyectiles ---------------- */
function lanzarProy(F,tipo,movSup){
  var R=rival(F), x=F.x+F.f*40, y=F.y-100*F.L.alto*TAM, P=[];
  var base={dueño:F,x:x,y:y,vx:0,vy:0,r:18,vida:2.5,tipo:tipo,golpes:1,cada:0.12,t:0,tGolpe:0,
    mov:golpe({dmg:0.3,hs:26,emp:200,tipo:'esp',sfx:'golpe2',parada:6,med:0.12})};
  var mk=function(o){var p={};for(var k in base)p[k]=base[k];for(var j in o)p[j]=o[j];p.mov=o.mov||(movSup||base.mov);P.push(p);};
  if(tipo==='aire')mk({vx:F.f*300,r:26,golpes:1,mov:golpe({dmg:0.3,hs:30,emp:520,tipo:'esp',sfx:'viento',parada:6,med:0.12,color:'220,240,255'})});
  else if(tipo==='fuego')mk({vx:F.f*430,r:16,mov:golpe({dmg:0.32,hs:28,emp:240,tipo:'esp',sfx:'fuego',parada:6,med:0.12,color:'255,150,40'})});
  else if(tipo==='pilar'){var px=R?R.x:x+F.f*200;mk({x:px,y:F.y,espera:0.45,r:30,vida:1.0,golpes:3,cada:0.12,fijo:true,
    mov:golpe({dmg:0.13,hs:30,lanz:520,tipo:'esp',sfx:'fuego',parada:5,med:0.08,color:'255,150,40'})});}
  else if(tipo==='bolas')mk({vx:F.f*380,vy:-260,grav:900,r:16,mov:golpe({dmg:0.28,hs:52,emp:60,tipo:'esp',sfx:'electro',parada:7,med:0.12,color:'140,230,255'})});
  else if(tipo==='anzuelo')mk({vx:F.f*620,r:14,vida:0.6,tira:true,mov:golpe({dmg:0.22,hs:40,emp:-420,tipo:'esp',sfx:'cadena',parada:7,med:0.12,color:'200,200,210'})});
  else if(tipo==='peces')mk({vx:F.f*250,r:24,golpes:5,cada:0.13,vida:3,mov:golpe({dmg:0.08,hs:22,emp:40,tipo:'esp',sfx:'agua',parada:3,med:0.05,color:'120,255,230'})});
  else if(tipo==='bondi')mk({vx:F.f*520,r:22,golpes:2,cada:0.16,mov:golpe({dmg:0.17,hs:26,emp:260,tipo:'esp',sfx:'golpe2',parada:5,med:0.1,color:'255,210,60'})});
  else if(tipo==='vapor')mk({vx:F.f*340,y:F.y-90,r:70,golpes:6,cada:0.1,vida:2.6,mov:movSup});
  else if(tipo==='lluviaFuego'){for(var i=0;i<9;i++)mk({x:(R?R.x:x)+(i-4)*34,y:ESC.y0-40-i*60,vy:720,r:18,vida:2,golpes:1,mov:movSup});}
  else if(tipo==='rayos'){for(var j=0;j<5;j++)mk({x:R?R.x:x,y:F.y,espera:0.12+j*0.22,r:34,vida:0.2+j*0.22+0.2,fijo:true,rayo:true,golpes:1,sigue:true,mov:movSup});}
  else if(tipo==='ola')mk({vx:F.f*380,y:F.y-30,r:50,golpes:7,cada:0.1,vida:2.4,rasante:true,cura:0.25,mov:movSup});
  else if(tipo==='palma')mk({vx:F.f*360,r:22,mov:golpe({dmg:0.33,hs:30,emp:300,tipo:'esp',sfx:'golpe2',parada:7,med:0.12,color:'255,215,80'})});
  else if(tipo==='arpon')mk({vx:F.f*700,r:12,vida:0.55,tira:true,mov:golpe({dmg:0.24,hs:42,emp:-460,tipo:'esp',sfx:'cadena',parada:7,med:0.12,color:'200,210,230'})});
  else if(tipo==='mina'){      /* la trampa cae donde está el rival, si está a tiro; si no, a 200 */
    var dm=R?(R.x-F.x)*F.f:200; dm=dm<60||dm>300?200:dm;
    mk({x:F.x+F.f*dm,y:F.y-10,espera:0.7,r:44,vida:1.1,fijo:true,golpes:1,mov:golpe({dmg:0.36,hs:30,lanz:600,tipo:'esp',sfx:'golpe3',parada:9,med:0.12,color:'255,160,60'})});}
  else if(tipo==='aullido')mk({vx:F.f*300,r:34,golpes:3,cada:0.14,vida:1.6,mov:golpe({dmg:0.1,hs:40,emp:120,tipo:'esp',sfx:'viento',parada:3,med:0.06,color:'255,190,90'})});
  else if(tipo==='bocha')mk({vx:F.f*760,y:F.y-40,r:10,mov:golpe({dmg:0.26,hs:28,emp:260,tipo:'esp',sfx:'golpe1',parada:6,med:0.12,color:'240,240,255'})});
  else if(tipo==='torpedo')mk({vx:F.f*280,y:F.y-60,r:40,golpes:6,cada:0.08,vida:3,mov:movSup});
  else if(tipo==='lluviaBochas'){for(var b=0;b<10;b++)mk({x:(R?R.x:x)+(b-4.5)*9,y:ESC.y0-40-b*50,vy:820,r:12,vida:2,golpes:1,mov:movSup});}
  else if(tipo==='colectivos'){for(var k=0;k<3;k++)mk({x:F.x-F.f*(260+k*170),y:F.y-40,vx:F.f*820,r:40,golpes:2,cada:0.1,vida:2.2,bus:true,mov:movSup});}
  M.proy=M.proy.concat(P);
}
function pasarProy(dt){
  for(var i=M.proy.length-1;i>=0;i--){
    var p=M.proy[i];
    p.t+=dt;
    if(p.espera&&p.t<p.espera){if(p.sigue){var Rz=rival(p.dueño);if(Rz)p.x=Rz.x;}continue;}
    if(!p.fijo){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.grav)p.vy+=p.grav*dt;}
    if(p.y>ESC.suelo-p.r*0.6&&p.grav){p.y=ESC.suelo-p.r*0.6;p.vy*=-0.4;p.vx*=0.7;}
    if((p.tipo==='lluviaFuego'||p.tipo==='lluviaBochas')&&p.y>ESC.suelo-10){FX.chispa(p.x,ESC.suelo-10,'255,150,40',false,true);M.proy.splice(i,1);continue;}
    var D=rival(p.dueño);
    p.tGolpe-=dt;
    if(D&&!D.ko&&p.golpes>0&&p.tGolpe<=0){
      var alto=150*D.L.alto*TAM, dy=p.rasante||p.fijo||p.rayo?0:Math.max(0,Math.abs(p.y-(D.y-alto*0.5))-alto*0.5);
      var dx=Math.abs(p.x-D.x);
      if(dx<p.r+18&&dy<p.r){
        p.golpes--;p.tGolpe=p.cada;
        pegar(p.dueño,D,p.mov,p.x,Math.min(p.y,D.y-70),1);
        if(p.tira&&D.est==='golpeado'){D.vx=p.dueño.f*-1*-380;}      /* el anzuelo lo trae */
        if(p.cura)p.dueño.vida=Math.min(p.dueño.vidaMax,p.dueño.vida+p.dueño.atk*0.05);
        if(p.golpes<=0&&!p.fijo){M.proy.splice(i,1);continue;}
      }
    }
    if(p.t>p.vida||p.x<-200||p.x>MUNDO_W+200)M.proy.splice(i,1);
  }
}
/* ---------------- un paso de un luchador ---------------- */
function pasarLuchador(F,dt){
  F.t+=dt;F.tEst+=dt;
  if(F.inv>0)F.inv-=dt;
  for(var k=0;k<2;k++)if(F.cd[k]>0)F.cd[k]=Math.max(0,F.cd[k]-dt);
  if(F.quema>0){F.quema-=dt;F.vida=Math.max(1,F.vida-F.vidaMax*0.02*dt);if(az()<0.3)FX.humo(F.x,F.y-80);}
  if(F.rastro>F.vida)F.rastro=Math.max(F.vida,F.rastro-F.vidaMax*0.3*dt);
  F.parpadeo=(F.t%3.1)<0.1;
  F.golpeando=false;
  var P=null, est=F.est, R=rival(F);
  /* la física: gravedad en el aire, roce en el piso */
  if(!F.enSuelo){
    F.vy+=GRAV*dt*(est==='aireG'&&F.combo>0?0.8:1);
    F.x+=F.vx*dt;F.y+=F.vy*dt;
    if(F.y>=ESC.suelo){
      F.y=ESC.suelo;F.enSuelo=true;F.vy=0;
      if(est==='aireG'){ponerEstado(F,'caido');F.vx*=0.3;Sonido.fx('caida');polvo(F.x,F.y,10);FX.sacudir(4);F.combo=0;}
      else{ponerEstado(F,'guardia');Sonido.fx('cae');polvo(F.x,F.y,5);F.aereos=0;F.combo=0;}
      if(F.est==='ataque'&&F.mov&&F.mov.aire)ponerEstado(F,'guardia');
    }
  } else {
    F.x+=F.vx*dt;
    F.vx*=Math.pow(est==='dash'||est==='dashAtras'?0.02:0.0008,dt);
  }
  /* los bordes: el mundo y la pantalla (los dos se ven siempre) */
  var izq=Math.max(20,M.cam-ANCHO/2+22), der=Math.min(MUNDO_W-20,M.cam+ANCHO/2-22);
  if(F.x<izq){F.x=izq;F.vx=Math.max(0,F.vx);}
  if(F.x>der){F.x=der;F.vx=Math.min(0,F.vx);}
  switch(est){
    case 'guardia': case 'camina':
      F.exp='normal';F.combo=0;
      var r=Math.sin(F.t*3.2);
      P=conPose(G0,{tor:G0.tor+r*0.03,bFs:G0.bFs+r*0.04,bTs:G0.bTs-r*0.03,pFr:G0.pFr+r*0.05,pTr:G0.pTr+r*0.04});
      if(est==='camina'){var ph=F.t*9;P.pFm=0.2+Math.sin(ph)*0.45;P.pTm=-0.2-Math.sin(ph)*0.45;P.pFr=0.4+Math.max(0,Math.cos(ph))*0.6;P.pTr=0.3+Math.max(0,-Math.cos(ph))*0.6;}
      mirarRival(F);
      if(F.buffer){var b=F.buffer;F.buffer=null;orden(F,b);}
      break;
    case 'bloqueo':
      P=POSES.bloqueo;F.exp='normal';mirarRival(F);
      if(F.stun>0)F.stun-=dt;
      break;
    case 'dash': case 'dashAtras':
      P=POSES[est];
      var alc=64*TAM*F.L.alcance*(ALCANCE_ARMA[F.L.estilo]||1);
      if(est==='dash'&&F.buffer==='toca'&&R&&distancia(F)<alc*1.1){F.buffer=null;ponerEstado(F,'guardia');F.vx*=0.3;orden(F,'toca');break;}
      if(F.tEst>0.26){ponerEstado(F,'guardia');if(F.buffer){var bb=F.buffer;F.buffer=null;orden(F,bb);}}
      break;
    case 'salto':
      P=POSES.salto;
      break;
    case 'ataque':
      var m=F.mov;
      /* los especiales cuerpo a cuerpo "se tiran encima": si el rival está lejos, primero corren */
      if(m.busca&&F.fr<1&&R&&F.enSuelo){
        var alcB=(m.caja[0]+m.caja[2])*escalaCaja(F,m)*0.85;
        F.tBusca=(F.tBusca||0)+dt;
        if(Math.abs(R.x-F.x)>alcB&&F.tBusca<0.6){F.vx=640*F.f*F.L.vel;mezclar(F.pose,POSES.dash,Math.min(1,dt*18),F.pose);if(az()<0.4)polvo(F.x,F.y,1);break;}
      }
      F.tBusca=0;
      F.fr+=dt*60;
      P=poseDeMov(m,F.fr);
      F.exp=F.fr<m.act[1]?'grito':'normal';
      F.golpeando=F.fr>=m.act[0]&&F.fr<=m.act[1]+6;
      if(m.fuelle)F.fuelle=Math.max(0,Math.sin(Math.min(1,F.fr/16)*Math.PI));
      /* la estocada: el paso adelante se sostiene hasta llegar al rival. Si sólo se diera
         el empujón inicial, el roce del piso se lo come y el especial pega al aire (medido: 0 de daño) */
      if(m.avance&&F.enSuelo&&R){
        var hasta=m.tipo==='esp'?m.act[1]:m.act[0];
        var pegado=Math.abs(R.x-F.x)<(18*F.L.grosor+18*R.L.grosor)*TAM+10;
        if(F.fr<hasta&&!pegado&&(m.multi||F.golpesMov===0))F.vx=m.avance*F.f;
      }
      if(m.proy&&F.fr>=m.k[1][0]&&!F.proyLanzado){F.proyLanzado=true;lanzarProy(F,m.proy);}
      if(m.aura&&F.fr>=m.act[0]&&F.fr<=m.act[1]&&az()<0.5)FX.chispa(F.x+(az()-0.5)*90,F.y-40-az()*110,m.aura,true);
      /* los cuadros activos: si la caja de golpe toca al rival, pega (una vez, o cada tanto en los multi) */
      if(F.fr>=m.act[0]&&F.fr<=m.act[1]&&R){
        F.multiT-=dt;
        var puede=m.multi?F.multiT<=0&&F.golpesMov<m.multi:F.golpesMov===0;
        if(puede&&tocaCaja(F,m,R)){
          var cx=F.x+F.f*(m.caja[0]+m.caja[2]*0.7)*escalaCaja(F,m), cy=F.y+m.caja[1]*F.L.alto*TAM+m.caja[3]*0.4;
          if(pegar(F,R,m,cx,cy,1)){F.golpesMov++;F.multiT=0.1;}
        }
      }
      /* después de la alzada el que lanzó salta a perseguir */
      if(F.movNom==='alzada'&&F.persigue&&F.golpesMov>0&&F.fr>=m.act[1]+2){
        F.persigue=false;saltar(F,F.f*0.6);F.vy=-760;
      }
      if(F.fr>=m.dur){
        F.proyLanzado=false;F.fuelle=0;F.persigue=false;
        if(!F.enSuelo){ponerEstado(F,'salto');}
        else{ponerEstado(F,'guardia');F.cadena=0;}
        if(F.buffer){var b2=F.buffer;F.buffer=null;orden(F,b2);}
      } else if(F.buffer&&F.fr>=m.cad&&F.golpesMov>0){var b3=F.buffer;F.buffer=null;orden(F,b3);}
      break;
    case 'golpeado':
      P=POSES.golpeado;F.stun-=dt;
      if(F.stun<=0)ponerEstado(F,'guardia');
      break;
    case 'aireG':
      P=POSES.aireG;
      break;
    case 'caido':
      P=POSES.caido;F.exp=F.ko?'ko':'dolor';
      if(!F.ko&&F.tEst>0.7){ponerEstado(F,'levanta');F.inv=0.45;}
      break;
    case 'levanta':
      P=mezclar(POSES.caido,G0,suave(Math.min(1,F.tEst/0.35)),{});
      if(F.tEst>0.35){ponerEstado(F,'guardia');F.combo=0;F.derribado=false;}
      break;
    case 'super':
      P=POSES.victoria;F.exp='grito';
      break;
    case 'rafaga':
      var rf=F.rafaga;rf.t+=dt;
      P=(Math.floor(rf.t*14)%2)?POSES.giro1:POSES.jab;F.exp='grito';F.golpeando=true;
      if(R&&rf.t>0.07*(S_rafagaHechos(rf)+1)&&rf.n>0){
        rf.n--;rf.hechos=(rf.hechos||0)+1;
        R.x=F.x+F.f*52;
        var ult=rf.n===0;
        pegar(F,R,ult?golpe({dmg:0.45,derriba:true,tipo:'sup',sfx:'golpe3',parada:14,med:0,color:'255,70,100'}):rf.mov,R.x,R.y-90,1);
        for(var q=0;q<3;q++)FX.petalo(R.x,R.y-90);
      }
      if(rf.n<=0&&rf.t>0.9)ponerEstado(F,'guardia');
      break;
    case 'ko':
      P=POSES.caido;F.exp='ko';
      break;
    case 'victoria':
      P=conPose(POSES.victoria,{tor:POSES.victoria.tor+Math.sin(F.t*4)*0.05});F.exp='grito';
      break;
    case 'entra':
      P=POSES.salto;
      break;
  }
  if(F.est==='caido'&&F.ko)ponerEstado(F,'ko');
  /* la pose llega suave: nunca salta de una a otra de golpe */
  if(P){
    var vel=F.est==='ataque'||F.est==='rafaga'?1:Math.min(1,dt*18);
    mezclar(F.pose,P,vel,F.pose);
  }
}
function S_rafagaHechos(rf){return rf.hechos||0;}
function poseDeMov(m,fr){
  var k=m.k;
  if(fr<=k[0][0])return POSES[k[0][1]];
  for(var i=0;i<k.length-1;i++){
    if(fr>=k[i][0]&&fr<=k[i+1][0]){
      var t=(fr-k[i][0])/Math.max(1,k[i+1][0]-k[i][0]);
      return mezclar(POSES[k[i][1]],POSES[k[i+1][1]],suave(t),{});
    }
  }
  return POSES[k[k.length-1][1]];
}
function escalaCaja(F,m){
  var manos=['jab','cruz','gancho','cuerpo','fuerte','aerea2','aerea3','alzada'];
  return TAM*F.L.alcance*(manos.indexOf(F.movNom)>=0?(ALCANCE_ARMA[F.L.estilo]||1):1);
}
function tocaCaja(F,m,R){
  if(R.ko&&R.est==='ko')return false;
  var e=escalaCaja(F,m), a=F.L.alto*TAM;
  var x0=F.x+F.f*m.caja[0]*e, x1=F.x+F.f*(m.caja[0]+m.caja[2])*e;
  var lx=Math.min(x0,x1), hx=Math.max(x0,x1);
  var y0=F.y+m.caja[1]*a, y1=y0+m.caja[3]*a;
  /* el cuerpo del rival: un rectángulo; tirado, uno bajo y largo */
  var ra=R.L.alto*TAM, rw=18*R.L.grosor*TAM;
  var ry0=R.est==='caido'||R.est==='ko'?R.y-40:R.y-150*ra, ry1=R.y;
  if(R.est==='caido')return false;               /* en el piso no se le pega (se está levantando) */
  return hx>R.x-rw&&lx<R.x+rw&&y1>ry0&&y0<ry1;
}
function polvo(x,y,n){for(var i=0;i<n;i++)FX.part.push({x:x+(az()-0.5)*30,y:y-2,vx:(az()-0.5)*120,vy:-az()*80,t:0,tm:0.5+az()*0.3,r:4+az()*5,col:'180,160,140',humo:true});}
