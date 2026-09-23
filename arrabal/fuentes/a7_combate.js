
/* ---------------- efectos: chispas de historieta, números, polvo, pétalos ---------------- */
var FX={
  part:[], textos:[], nums:[], chispas:[], ondas:[], tajos:[], sac:0, flash:0, congelado:0, vel:0, zoom:null,
  limpiar:function(){this.part.length=0;this.textos.length=0;this.nums.length=0;this.chispas.length=0;this.ondas.length=0;this.tajos.length=0;
    this.sac=0;this.flash=0;this.congelado=0;this.vel=0;this.zoom=null;},
  /* la onda del impacto: un aro que se abre y se apaga */
  onda:function(x,y,col,grande){this.ondas.push({x:x,y:y,col:col,t:0,tm:grande?0.34:0.22,r:grande?90:52,w:grande?9:5});},
  /* el tajo: una medialuna de luz en la dirección del golpe (armas, especiales) */
  tajo:function(x,y,dir,col,grande){this.tajos.push({x:x,y:y,dir:dir,col:col,t:0,tm:0.16,r:grande?78:54,rot:(az()-0.5)*1.2});},
  /* el golpe grande acerca la cámara un instante sobre el impacto */
  acercar:function(x,y,k){if(Prog.aj.temblor===false)return;this.zoom={x:x,y:y,k:k,t:0,tm:0.32};},
  velocidad:function(n){this.vel=Math.max(this.vel,n);},
  sacudir:function(n){if(Prog.aj.temblor===false)return;this.sac=Math.max(this.sac,n);},
  congelar:function(n){this.congelado=Math.max(this.congelado,n);},
  /* la estrella del impacto: puntas irregulares con borde de tinta, como en una viñeta */
  chispa:function(x,y,col,chica,grande){
    this.chispas.push({x:x,y:y,col:col,t:0,tm:chica?0.12:grande?0.26:0.18,r:chica?14:grande?46:30,rot:az()*TAU,p:chica?6:grande?12:9});
    for(var i=0;i<(chica?3:grande?14:7);i++){
      var a=az()*TAU, v=(grande?520:320)*(0.4+az());
      this.part.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:0,tm:0.25+az()*0.2,r:1.5+az()*2,col:col,linea:true});
    }
  },
  numero:function(x,y,n,crit){this.nums.push({x:x+(az()-0.5)*30,y:y,n:n,crit:crit,t:0,vy:-90});},
  texto:function(x,y,txt,col,tam){this.textos.push({x:x,y:y,t:0,txt:txt,col:col||'#fff',tam:tam||14});},
  humo:function(x,y){this.part.push({x:x+(az()-0.5)*20,y:y,vx:(az()-0.5)*30,vy:-60,t:0,tm:0.8,r:5+az()*5,col:'60,50,50',humo:true});},
  petalo:function(x,y){var a=az()*TAU;this.part.push({x:x,y:y,vx:Math.cos(a)*220,vy:Math.sin(a)*220-120,t:0,tm:1.2,r:4,col:'220,30,60',petalo:true,rot:az()*6});},
  pasar:function(dt){
    var i;
    for(i=this.part.length-1;i>=0;i--){
      var p=this.part[i];p.t+=dt;
      if(p.t>=p.tm){this.part.splice(i,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.humo){p.vx*=0.96;p.vy*=0.96;p.r+=dt*14;}
      else if(p.petalo){p.vy+=240*dt;p.vx*=0.98;p.rot+=dt*8;}
      else{p.vx*=0.9;p.vy=p.vy*0.9+120*dt;}
    }
    for(i=this.chispas.length-1;i>=0;i--){this.chispas[i].t+=dt;if(this.chispas[i].t>=this.chispas[i].tm)this.chispas.splice(i,1);}
    for(i=this.nums.length-1;i>=0;i--){var n=this.nums[i];n.t+=dt;n.y+=n.vy*dt;n.vy*=0.92;if(n.t>0.9)this.nums.splice(i,1);}
    for(i=this.textos.length-1;i>=0;i--){var x=this.textos[i];x.t+=dt;x.y-=24*dt;if(x.t>1)this.textos.splice(i,1);}
    for(i=this.ondas.length-1;i>=0;i--){this.ondas[i].t+=dt;if(this.ondas[i].t>=this.ondas[i].tm)this.ondas.splice(i,1);}
    for(i=this.tajos.length-1;i>=0;i--){this.tajos[i].t+=dt;if(this.tajos[i].t>=this.tajos[i].tm)this.tajos.splice(i,1);}
    if(this.zoom){this.zoom.t+=dt;if(this.zoom.t>=this.zoom.tm)this.zoom=null;}
    this.vel=Math.max(0,this.vel-dt);
    this.sac*=Math.pow(0.86,dt*60);
    this.flash=Math.max(0,this.flash-dt*2.5);
  },
  dibujar:function(g){
    var i;
    for(i=0;i<this.part.length;i++){
      var p=this.part[i], k=1-p.t/p.tm;
      if(p.humo){g.fillStyle='rgba('+p.col+','+(k*0.35).toFixed(3)+')';g.beginPath();g.arc(p.x,p.y,p.r,0,TAU);g.fill();}
      else if(p.petalo){g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.fillStyle='rgba('+p.col+','+k.toFixed(3)+')';g.beginPath();g.ellipse(0,0,5,2.5,0,0,TAU);g.fill();g.restore();}
      else if(p.linea){g.strokeStyle='rgba('+p.col+','+k.toFixed(3)+')';g.lineWidth=p.r;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-p.vx*0.03,p.y-p.vy*0.03);g.stroke();}
    }
    g.save();g.globalCompositeOperation='lighter';
    for(i=0;i<this.ondas.length;i++){
      var o=this.ondas[i], ko=o.t/o.tm, ro=o.r*(0.25+0.75*Math.sqrt(ko));
      g.strokeStyle='rgba('+o.col+','+(1-ko).toFixed(3)+')';g.lineWidth=o.w*(1-ko)+1;
      g.beginPath();g.ellipse(o.x,o.y,ro,ro*0.8,0,0,TAU);g.stroke();
      g.strokeStyle='rgba(255,255,255,'+(0.8*(1-ko)).toFixed(3)+')';g.lineWidth=1.5;
      g.beginPath();g.ellipse(o.x,o.y,ro*0.7,ro*0.56,0,0,TAU);g.stroke();
    }
    for(i=0;i<this.tajos.length;i++){
      var tj=this.tajos[i], kt=tj.t/tj.tm, rt=tj.r*(0.7+kt*0.5);
      g.save();g.translate(tj.x,tj.y);g.scale(tj.dir,1);g.rotate(tj.rot);
      g.fillStyle='rgba('+tj.col+','+(0.9*(1-kt)).toFixed(3)+')';
      g.beginPath();g.arc(-rt*0.5,0,rt,-1.1,1.1);g.arc(-rt*0.5-rt*0.28,0,rt*0.92,1.0,-1.0,true);g.closePath();g.fill();
      g.fillStyle='rgba(255,255,255,'+(0.9*(1-kt)).toFixed(3)+')';
      g.beginPath();g.arc(-rt*0.5,0,rt,-0.7,0.7);g.arc(-rt*0.5-rt*0.1,0,rt*0.96,0.66,-0.66,true);g.closePath();g.fill();
      g.restore();
    }
    g.restore();
    for(i=0;i<this.chispas.length;i++){
      var c=this.chispas[i], kk=c.t/c.tm, r=c.r*(0.6+kk*0.7);
      g.save();g.translate(c.x,c.y);g.rotate(c.rot+kk*0.4);g.globalAlpha=1-kk*kk;
      g.beginPath();
      for(var j=0;j<c.p*2;j++){var ra=j%2?r*0.42:r*(0.85+((j*37)%7)/20);var an=j/(c.p*2)*TAU;g[j?'lineTo':'moveTo'](Math.cos(an)*ra,Math.sin(an)*ra);}
      g.closePath();g.fillStyle='rgba('+c.col+',1)';g.fill();
      g.lineWidth=3;g.strokeStyle=TINTA;g.stroke();
      g.fillStyle='#ffffff';g.beginPath();g.arc(0,0,r*0.28,0,TAU);g.fill();
      g.restore();
    }
    for(i=0;i<this.nums.length;i++){
      var n=this.nums[i], a=1-Math.pow(n.t/0.9,3), e=n.t<0.1?1.6-n.t*6:1;
      g.save();g.globalAlpha=a;g.translate(n.x,n.y);g.scale(e,e);
      texto(g,String(n.n),0,0,n.crit?22:16,n.crit?'#ffd23a':'#ffffff');
      g.restore();
    }
    for(i=0;i<this.textos.length;i++){
      var x=this.textos[i];g.save();g.globalAlpha=1-Math.pow(x.t,3);texto(g,x.txt,x.x,x.y,x.tam,x.col);g.restore();
    }
  }
};

/* ---------------- la IA del rival ----------------
   d: dificultad de 0 a 1. Reacciona tarde o temprano, se cubre más o menos,
   arma combos más o menos largos, y usa especiales y súper. */
function pasarIA(F,dt,d){
  if(!F||F.ko||M.cine||M.fin||M.intro>0)return;
  var R=rival(F);if(!R||R.ko)return;
  var ia=F.ia||(F.ia={t:0.6,reac:0,decide:false,largo:0,hechos:0});
  var dist=Math.abs(R.x-F.x), alc=64*TAM*F.L.alcance*(ALCANCE_ARMA[F.L.estilo]||1);
  var libre=F.est==='guardia'||F.est==='camina';
  /* defenderse: el rival arranca un golpe cerca, o viene un proyectil */
  var amenaza=(R.est==='ataque'&&R.mov&&R.fr<R.mov.act[1]&&dist<alc*1.9)||M.proy.some(function(p){return p.dueño===R&&Math.abs(p.x-F.x)<150&&Math.sign(p.vx||0)===Math.sign(F.x-p.x);});
  if(amenaza&&(libre||F.est==='bloqueo')){
    if(!ia.mirando){ia.mirando=true;ia.reac=0.3-d*0.22;ia.decide=rnd()<0.18+d*0.55;}
    ia.reac-=dt;
    if(ia.reac<=0&&ia.decide){ponerEstado(F,'bloqueo');F.tBloq=0.3;return;}
  } else ia.mirando=false;
  if(F.est==='bloqueo'){F.tBloq-=dt;if(F.tBloq<=0&&F.stun<=0)ponerEstado(F,'guardia');return;}
  /* seguir el combo que empezó */
  if(F.est==='ataque'&&F.golpesMov>0&&F.fr>=F.mov.cad&&ia.hechos<ia.largo){
    ia.hechos++;
    if(ia.hechos===ia.largo){
      var fin=rnd();
      orden(F,fin<0.35+d*0.3?'arriba':fin<0.75?'adelante':'toca');
    } else orden(F,'toca');
    return;
  }
  /* en el aire, persiguiendo después de la alzada */
  if(F.est==='salto'&&!R.enSuelo&&Math.abs(R.y-F.y)<120&&dist<alc*1.3){
    orden(F,F.aereos>=2&&rnd()<0.5+d*0.3?'abajo':'toca');return;
  }
  if(!libre)return;
  ia.t-=dt;
  if(dist>alc*1.15){                      /* acercarse: caminando o de un salto */
    if(F.cd[0]<=0&&rnd()<0.012+d*0.02&&esProyectil(F.L.esp[0].id)){orden(F,'esp0');return;}
    if(F.cd[1]<=0&&rnd()<0.008+d*0.015&&esProyectil(F.L.esp[1].id)){orden(F,'esp1');return;}
    if(rnd()<0.012+d*0.01){orden(F,'adelante');return;}
    ponerEstado(F,'camina');F.f=R.x>F.x?1:-1;F.vx=F.f*150*F.L.vel;F.est='camina';
    return;
  }
  if(F.est==='camina')ponerEstado(F,'guardia');
  if(ia.t>0)return;
  ia.t=0.34-d*0.18+rnd()*0.3;
  var r=rnd();
  if(F.med>=2&&r<0.1+d*0.15){orden(F,'super');return;}
  if(F.cd[0]<=0&&r<0.2){orden(F,'esp0');return;}
  if(F.cd[1]<=0&&r<0.3){orden(F,'esp1');return;}
  if(r<0.42&&R.enSuelo){orden(F,'abajo');return;}
  if(r<0.5){orden(F,'atras');return;}
  ia.largo=1+Math.floor(d*3+rnd()*2);ia.hechos=0;
  orden(F,'toca');
}
function esProyectil(id){var m=ESPECIALES[id];return !!(m&&m.proy);}

/* ---------------- la pelea entera ---------------- */
function instanciaDe(id){return Prog.cartas[id];}
function nuevaPelea(pelea,equipoJ,modo){
  Mando.reiniciar();
  setTimeout(function(){if(!M)return;var ids=M.eq[0].concat(M.eq[1]).map(function(F){return F.l;});soltarAnims(ids);ids.forEach(imgAnim);},0);
  medirEscenario();
  M={pelea:pelea,act:[null,null],eq:[[],[]],idx:[0,0],proy:[],cam:MUNDO_W/2,reloj:0,cine:null,cartel:null,
     intro:3.0,fin:0,resultado:null,comboVis:null,comboMax:[0,0],lento:0,t:0,dificultad:pelea.dificultad,koHecho:{},esc:BARRIOS[pelea.barrio].esc,
     modo:modo||'historia',ronda:1,vic:[0,0],puntos:0,entre:0,bonus:null,anuncio:null};
  M.eq[0]=equipoJ?equipoJ.map(function(inst){return nuevoLuchador(inst,0);}):
    Prog.equipo.filter(function(id){return !!Prog.cartas[id];}).map(function(id){return nuevoLuchador(instanciaDe(id),0);});
  M.eq[1]=pelea.equipo.map(function(inst){return nuevoLuchador(inst,1);});
  if(pelea.jefe){var J1=M.eq[1][M.eq[1].length-1];J1.vidaMax=J1.vida=J1.rastro=Math.round(J1.vida*1.5);J1.jefe=true;}
  /* el reloj crece con los equipos: un 3 contra 3 con 120 s se iba siempre a tiempo */
  M.reloj=M.relojIni=60+35*Math.max(M.eq[0].length,M.eq[1].length);
  if(M.modo!=='historia'){          /* arcade y demo: uno contra uno, rondas de 60 s */
    M.reloj=M.relojIni=60;M.intro=2.4;
    M.cartel={txt:'RONDA 1',t:1.4,col:'#ffffff',arcade:true};
  }
  entrar(0,true);entrar(1,true);
  FX.limpiar();
  Sonido.musica(pelea.jefe?'jefe':BARRIOS[pelea.barrio].mus);
  Sonido.fx(M.modo==='historia'?'vs':'ronda');
}
/* rondas: gana la pelea el primero que gana dos */
function finRonda(g){
  if(M.entre>0||M.fin)return;
  M.vic[g]++;
  var P=M.act[0];
  if(g===0&&M.modo==='arcade'){
    var bt=Math.ceil(Math.max(0,M.reloj))*100, bv=Math.round(P.vida/P.vidaMax*5000), perf=P.vida>=P.vidaMax?10000:0;
    M.bonus={t:0,tiempo:bt,vida:bv,perfecto:perf,total:bt+bv+perf,sumado:false};
    if(perf){M.anuncio={txt:'¡PERFECTO!',t:2,col1:'#bff0ff',col2:'#3a8ad8'};}
  }
  if(M.vic[g]>=2){terminarPelea(g===0?'gano':'perdio');M.fin=3.4;}
  else{M.entre=3.4;var gan=M.act[g];if(gan&&!gan.ko)ponerEstado(gan,'victoria');}
}
function nuevaRonda(){
  M.ronda++;M.proy=[];M.reloj=M.relojIni;M.intro=2.4;M.bonus=null;M.anuncio=null;M.cam=MUNDO_W/2;
  for(var l=0;l<2;l++){
    var F=M.act[l];
    F.vida=F.rastro=F.vidaMax;F.ko=false;F.exp='normal';F.combo=0;F.cd=[0,0];F.quema=0;F.inv=0;F.stun=0;F.vx=F.vy=0;F.buffer=null;
    F.y=ESC.suelo;F.enSuelo=true;F.x=MUNDO_W/2+(l?110:-110);F.f=l?-1:1;ponerEstado(F,'guardia');
  }
  var fin=M.vic[0]===1&&M.vic[1]===1;
  M.cartel={txt:fin?'RONDA FINAL':'RONDA '+M.ronda,t:1.4,col:'#ffffff',arcade:true};
  Sonido.fx('ronda');
}
function entrar(lado,primero){
  var F=M.eq[lado][M.idx[lado]];
  F.y=ESC.suelo;F.enSuelo=true;F.f=lado?-1:1;
  if(primero){F.x=MUNDO_W/2+(lado?110:-110);ponerEstado(F,'guardia');}
  else{
    /* el relevo entra de un salto desde su lado */
    F.x=M.cam+(lado?1:-1)*(ANCHO/2+30);F.y=ESC.suelo-160;F.enSuelo=false;F.vy=-300;F.vx=(lado?-1:1)*260;
    ponerEstado(F,'entra');F.inv=1;Sonido.fx('entra');
    M.cartel={txt:F.L.nom,t:1.3,col:lado?'#ff9d8a':'#9fd8ff',chico:true};
  }
  M.act[lado]=F;
}
function vivos(lado){return M.eq[lado].filter(function(F){return !F.ko;}).length;}
function pasarPelea(dt){
  M.t+=dt;
  if(M.lento>0){M.lento-=dt;dt*=0.3;}
  if(M.cine){                    /* la cinemática del súper congela el mundo */
    M.cine.t+=dt;
    if(M.cine.t>=M.cine.dur){var Fc=M.cine.F;M.cine=null;ejecutarSuper(Fc);}
    FX.pasar(dt);return;
  }
  if(M.intro>0){
    var antes=M.intro;M.intro-=dt;
    if(antes>1.0&&M.intro<=1.0){Sonido.fx('peleen');M.cartel={txt:M.modo==='historia'?'¡A PELEAR!':'¡PELEEN!',t:1.0,col:'#ffd23a',arcade:M.modo!=='historia'};}
    for(var q=0;q<2;q++)pasarLuchador(M.act[q],dt);
    FX.pasar(dt);return;
  }
  /* el jugador: gestos y botones (o el piloto automático en las pruebas) */
  var P=M.act[0], E=M.act[1];
  /* entre rondas: los dos quedan quietos, el ganador festeja, se suman los bonos */
  if(M.entre>0){
    M.entre-=dt;
    if(M.bonus){M.bonus.t+=dt;if(M.bonus.t>1.6&&!M.bonus.sumado){M.bonus.sumado=true;M.puntos+=M.bonus.total;Sonido.fx('bonus');}}
    pasarLuchador(P,dt);pasarLuchador(E,dt);FX.pasar(dt);
    if(M.cartel){M.cartel.t-=dt;if(M.cartel.t<=0)M.cartel=null;}
    if(M.anuncio){M.anuncio.t-=dt;if(M.anuncio.t<=0)M.anuncio=null;}
    if(M.entre<=0)nuevaRonda();
    return;
  }
  if(M.modo==='demo'){pasarIA(P,dt,0.6);}
  else if(J.bot)pasarIA(P,dt,0.75);
  else controlJugador(P);
  if(!J.quietoE)pasarIA(E,dt,M.dificultad);
  pasarLuchador(P,dt);pasarLuchador(E,dt);
  /* que no se atraviesen */
  if(P.enSuelo&&E.enSuelo&&!P.ko&&!E.ko){
    var sep=(18*P.L.grosor+18*E.L.grosor)*TAM, d=E.x-P.x;
    if(Math.abs(d)<sep){var emp=(sep-Math.abs(d))/2*(d>=0?1:-1);P.x-=emp;E.x+=emp;}
  }
  pasarProy(dt);
  /* la cámara: al medio de los dos, sin salirse del mundo */
  var obj=lim((P.x+E.x)/2,ANCHO/2,MUNDO_W-ANCHO/2);
  M.cam+=(obj-M.cam)*Math.min(1,dt*6);
  if(!M.fin)M.reloj-=dt;
  if(M.comboVis){M.comboVis.t-=dt;if(M.comboVis.t<=0)M.comboVis=null;}
  if(M.cartel){M.cartel.t-=dt;if(M.cartel.t<=0)M.cartel=null;}
  if(M.anuncio){M.anuncio.t-=dt;if(M.anuncio.t<=0)M.anuncio=null;}
  var rondas=M.modo!=='historia';
  /* los relevos y el final */
  for(var l=0;l<2;l++){
    var F=M.act[l];
    if(F.ko&&F.est==='ko'&&F.tEst>1.0&&!M.fin&&!(M.entre>0)){
      if(rondas)finRonda(1-l);
      else if(M.idx[l]<M.eq[l].length-1){M.idx[l]++;entrar(l,false);}
      else terminarPelea(l===1?'gano':'perdio');
    }
  }
  if(M.reloj<=0&&!M.fin&&!(M.entre>0)){
    var pj=M.eq[0].reduce(function(a,F){return a+F.vida/F.vidaMax;},0), pe=M.eq[1].reduce(function(a,F){return a+F.vida/F.vidaMax;},0);
    M.cartel={txt:'¡TIEMPO!',t:1.6,col:'#ffd23a',arcade:rondas};
    if(rondas)finRonda(pj>=pe?0:1);else terminarPelea(pj>=pe?'gano':'perdio');
  }
  if(M.fin>0){
    M.fin-=dt;
    if(M.bonus){M.bonus.t+=dt;if(M.bonus.t>1.6&&!M.bonus.sumado){M.bonus.sumado=true;M.puntos+=M.bonus.total;Sonido.fx('bonus');}}
    if(M.fin<=0){
      if(M.modo==='arcade')arcadeFinPelea(M.resultado);
      else if(M.modo==='demo')nuevaDemo();
      else mostrarResultado();
    }
  }
  FX.pasar(dt);
}
function terminarPelea(res){
  M.resultado=res;M.fin=2.6;
  var gan=M.act[res==='gano'?0:1];
  if(gan&&!gan.ko)ponerEstado(gan,'victoria');
  M.cartel={txt:res==='gano'?(M.modo==='historia'?'¡VICTORIA!':'¡GANASTE!'):(M.modo==='historia'?'DERROTA':'PERDISTE'),t:2.4,col:res==='gano'?'#ffd23a':'#ff6a6a',arcade:M.modo!=='historia'};
  if(M.modo!=='demo')Sonido.fx(res==='gano'?'victoria':'derrota');
}
/* el jugador: cada gesto es una orden; los botones del súper y especiales van aparte */
function controlJugador(P){
  var dir=function(d){if(d==='arr')return'arriba';if(d==='aba')return'abajo';
    var der=d==='der';return (der===(P.f>0))?'adelante':'atras';};
  /* el mando de botones (los gestos quedan sólo para las pruebas) */
  mandoJugador(P);
  for(var i=0;i<Entrada.gestos.length;i++){
    var g=Entrada.gestos[i];
    orden(P,g.tipo==='toca'?'toca':dir(g.dir));
  }
  /* cubrirse */
  if(Entrada.cubre&&(P.est==='guardia'||P.est==='camina'))ponerEstado(P,'bloqueo');
  if(!Entrada.cubre&&P.est==='bloqueo'&&P.stun<=0)ponerEstado(P,'guardia');
  /* teclado */
  var T=Entrada;
  if(T.recien('KeyZ')||T.recien('KeyJ'))orden(P,'toca');
  if(T.recien('KeyX')||T.recien('KeyK'))orden(P,'adelante');
  if(T.recien('ArrowUp')||T.recien('KeyW'))orden(P,'arriba');
  if(T.recien('ArrowDown')||T.recien('KeyS'))orden(P,'abajo');
  if(T.recien('Digit1'))orden(P,'esp0');
  if(T.recien('Digit2'))orden(P,'esp1');
  if(T.recien('Digit3'))orden(P,'super');
  var mx=(T.tecla['ArrowRight']||T.tecla['KeyD']?1:0)-(T.tecla['ArrowLeft']||T.tecla['KeyA']?1:0);
  if(mx&&(P.est==='guardia'||P.est==='camina')){ponerEstado(P,'camina');P.est='camina';P.vx=mx*150*P.L.vel;}
  else if(!mx&&P.est==='camina')ponerEstado(P,'guardia');
}
