/* ---------------- las pantallas: la arena 3D siempre atrás, la interfaz encima ---------------- */
var PANT={};
function menu3D(modo){
  /* dónde va la cámara y qué hacen los muñecos en cada pantalla */
  var C=R3.camObj;
  YO.raiz.visible=true;EL.raiz.visible=false;R3.pelota.visible=true;R3.estela.pts.length=0;
  YO.x=0;YO.z=2;YO.y=0;YO.giro=0;
  if(modo==='vestuario'){YO.anim='quieto';YO.giro=Math.PI;C.pos.set(0,1.6,8.6);C.mira.set(0,0.15,2);C.fov=40;}
  else{YO.anim='malabares';YO.giro=Math.PI*0.85;}
}
function orbitarMenu(t){
  var C=R3.camObj, a=t*0.12;
  C.pos.set(Math.sin(a)*9.5,4.2+Math.sin(t*0.3)*0.6,2+Math.cos(a)*9.5);C.mira.set(0,1.2,2);C.fov=55;
}
/* la pelota del jueguito sigue al pie que la toca */
function pelotaJueguito(){
  var c=(YO.t*2.2)%2, der=c<1, q=c%1;
  var lado=der?0.1:-0.1, s=Math.sin(YO.giro), co=Math.cos(YO.giro);
  var fx=YO.x+(lado*co)-0.28*s, fz=YO.z-(lado*-s)-0.28*co;
  B.p.set(fx,0.35+Math.sin(q*Math.PI)*1.15,fz);
}
function pasarMenu3D(t,dt){
  if(YO.anim==='malabares'){posar(YO,dt);pelotaJueguito();}
  else{posar(YO,dt);B.p.set(YO.x+0.45,R_PELOTA,YO.z+0.3);}
}
/* ---------------- portada ---------------- */
PANT.portada={
  entrar:function(){menu3D('menu');Sonido.musica('menu');Sonido.conHinchada=false;},
  paso:function(dt,t){orbitarMenu(t);pasarMenu3D(t,dt);},
  dibujar:function(g,t){
    g.fillStyle=lin(g,0,0,0,ALTO,[[0,'rgba(10,20,60,0.55)'],[0.4,'rgba(10,20,60,0)'],[0.75,'rgba(10,20,60,0)'],[1,'rgba(10,20,60,0.75)']]);g.fillRect(0,0,ANCHO,ALTO);
    var lg=IMG.logo, k=lim(J.tMenu/0.8,0,1), e=k<1?1-Math.pow(1-k,3)+Math.sin(k*Math.PI)*0.15:1;
    if(lg){var w=ANCHO*0.86*e, h=w*lg.height/lg.width;g.save();g.translate(ANCHO/2,ALTO*0.2);g.rotate(Math.sin(t*1.2)*0.02);g.drawImage(lg,-w/2,-h/2,w,h);g.restore();}
    else textoGordo(g,'DUELO DE ARCOS',ANCHO/2,ALTO*0.2,40,'#ffffff','#3a7af0');
    texto(g,'FÚTBOL 1 CONTRA 1 · PATEÁ Y ATAJÁ',ANCHO/2,ALTO*0.2+150,13,'#ffffff');
    if(J.tMenu>1){g.save();g.globalAlpha=0.6+0.4*Math.sin(t*5);texto(g,'TOCÁ PARA JUGAR',ANCHO/2,ALTO*0.86,24,'#ffffff');g.restore();}
    UI.boton('empezar',0,0,ANCHO,ALTO);
    if(window.Idioma)Idioma.botonAqui(ANCHO-32,32,20);
  },
  accion:function(id){if(id==='empezar')irA('menu');}
};
/* ---------------- menú principal ---------------- */
function barraNav(g,activa){
  var items=[['vestuario','VESTUARIO','camiseta'],['arenas','ARENAS','trofeo'],['menu','JUGAR','bota'],['ajustes','AJUSTES','engranaje']];
  var h=64, y=ALTO-h, w=ANCHO/items.length;
  g.fillStyle=lin(g,0,y,0,ALTO,[[0,'rgba(20,30,80,0.92)'],[1,'rgba(8,12,40,0.98)']]);g.fillRect(0,y,ANCHO,h);
  g.fillStyle='rgba(255,255,255,0.18)';g.fillRect(0,y,ANCHO,2);
  items.forEach(function(it,i){var x=i*w, sel=it[0]===activa;
    if(sel){g.fillStyle=lin(g,0,y,0,ALTO,[[0,'#ff9a2a'],[1,'#e0501a']]);redondo(g,x+4,y+4,w-8,h-8,12);g.fill();}
    icono(g,it[2],x+w/2,y+24,sel?26:22,'#ffffff');texto(g,it[1],x+w/2,y+50,9,'#ffffff');
    UI.boton('nav-'+it[0],x,y,w,h);});
}
function navegar(id){var d=id.slice(4);if(d!==J.pant)irA(d);}
PANT.menu={
  entrar:function(){menu3D('menu');Sonido.musica('menu');Sonido.conHinchada=false;if(R3.arena!==arenaActual())armarArena(arenaActual());},
  paso:function(dt,t){orbitarMenu(t);pasarMenu3D(t,dt);},
  dibujar:function(g,t){
    g.fillStyle=lin(g,0,0,0,ALTO,[[0,'rgba(10,20,60,0.6)'],[0.25,'rgba(10,20,60,0)'],[0.6,'rgba(10,20,60,0)'],[1,'rgba(10,20,60,0.85)']]);g.fillRect(0,0,ANCHO,ALTO);
    pastillas(g,entra(0));
    /* el perfil arriba a la izquierda */
    g.fillStyle='rgba(10,20,50,0.7)';redondo(g,8,10,68,28,14);g.fill();icono(g,'estrella',22,24,16,'#ffd23a');texto(g,String(nivelJugador()),34,25,13,'#ffffff','left');
    var lg=IMG.logo;if(lg){var w=ANCHO*0.62, h=w*lg.height/lg.width, e=entra(0.05);g.save();g.globalAlpha=Math.min(1,e*1.5);g.drawImage(lg,ANCHO/2-w/2,52,w,h);g.restore();}
    /* la arena actual y cuánto falta para la siguiente */
    var a=arenaActual(), A=ARENAS[a], sig_=ORDEN_ARENAS[ORDEN_ARENAS.indexOf(a)+1];
    var cy=ALTO-236, e2=entra(0.12);
    g.save();g.globalAlpha=Math.min(1,e2*1.5);g.translate(0,(1-e2)*60);
    panelG(g,20,cy,ANCHO-40,86,'rgba(20,30,80,0.82)');
    var im=IMG[A.fondo];if(im){g.save();redondo(g,28,cy+8,110,70,10);g.clip();g.drawImage(im,im.width*0.1,0,im.height*1.6,im.height,28,cy+8,110,70);g.restore();}
    texto(g,A.nom,150,cy+24,14,'#ffffff','left');
    if(sig_){var fr=(Prog.trofeos-A.trofeos)/(ARENAS[sig_].trofeos-A.trofeos);
      barraG(g,150,cy+42,ANCHO-190,12,fr,'#ffd23a','#ff8a1a');texto(g,Prog.trofeos+' / '+ARENAS[sig_].trofeos,150,cy+66,11,'#dfe8ff','left');icono(g,'candado',ANCHO-44,cy+66,14,'#dfe8ff');}
    else texto(g,'¡ARENA MÁXIMA!',150,cy+50,13,'#ffd23a','left');
    g.restore();
    /* el botón grande */
    var bw=ANCHO-60, pulso=1+0.025*Math.sin(t*4);
    g.save();g.translate(ANCHO/2,ALTO-114);g.scale(pulso,pulso);g.translate(-ANCHO/2,-(ALTO-114));
    botonG(g,'jugar',30,ALTO-140,bw,56,'JUGAR','amarillo',30,0.18,null,null);g.restore();
    barraNav(g,'menu');
    if(window.Idioma)Idioma.botonAqui(28,68,18);
  },
  accion:function(id){if(id==='jugar')irA('buscando');else if(id.indexOf('nav-')===0)navegar(id);}
};
function nivelJugador(){return 1+Math.floor(Math.sqrt((Prog.partidos*40+Prog.goles*10)/60));}
/* ---------------- buscando rival ---------------- */
PANT.buscando={
  entrar:function(){
    var tr=Math.max(0,Prog.trofeos+Math.round((Math.random()-0.5)*80));
    J.rival={nom:APODOS[Math.floor(Math.random()*APODOS.length)],trofeos:tr,cam:CAMIS_RIVAL[Math.floor(Math.random()*CAMIS_RIVAL.length)]};
    J.dif=lim(0.25+Prog.trofeos/900+(Math.random()-0.5)*0.1,0.2,0.92);
    Sonido.fx('clic');
  },
  paso:function(dt,t){orbitarMenu(t);pasarMenu3D(t,dt);if(J.tMenu>2.3&&!J.trans)empezarPartido();},
  dibujar:function(g,t){
    g.fillStyle='rgba(8,14,40,0.78)';g.fillRect(0,0,ANCHO,ALTO);
    var cy=ALTO*0.42, hallado=J.tMenu>1.5;
    g.save();g.translate(ANCHO/2,cy);g.rotate(t*4);g.strokeStyle='#ffd23a';g.lineWidth=6;g.lineCap='round';
    if(!hallado){g.beginPath();g.arc(0,0,40,0,Math.PI*1.4);g.stroke();}g.restore();
    if(!hallado){texto(g,'BUSCANDO RIVAL…',ANCHO/2,cy+80,18,'#ffffff');texto(g,APODOS[Math.floor(t*12)%APODOS.length],ANCHO/2,cy,14,'#9ab0e0');}
    else{var e=ease((J.tMenu-1.5)/0.3);g.save();g.translate(ANCHO/2,cy);g.scale(0.5+e*0.5,0.5+e*0.5);
      textoGordo(g,'¡RIVAL ENCONTRADO!',0,-70,24,'#ffffff','#ffd23a');
      g.fillStyle=J.rival.cam;g.beginPath();g.arc(0,0,40,0,TAU);g.fill();g.strokeStyle='#ffffff';g.lineWidth=4;g.stroke();icono(g,'camiseta',0,0,40,'#ffffff');
      texto(g,J.rival.nom,0,62,20,'#ffffff');icono(g,'trofeo',-20,88,16);texto(g,String(J.rival.trofeos),-8,89,14,'#ffffff','left');g.restore();}
  },
  accion:function(){}
};
function empezarPartido(){
  armarArena(arenaActual());
  nuevoPartido({dif:J.dif,arena:arenaActual(),rival:J.rival});
  irA('partido',true);
}
/* ---------------- el partido ---------------- */
PANT.partido={
  entrar:function(){Sonido.musica('partido');Sonido.conHinchada=true;Entrada.filtro=function(x,y){return !!UI.bajo(x,y,true)||!!UI.bajo(x,y);};camaraYa();},
  salir:function(){Entrada.filtro=null;},
  paso:function(dt){if(J.pausa)return;pasarPartido(dt);FXd.pasar(dt);if(Entrada.recien('Escape')||Entrada.recien('KeyP'))J.pausa=true;},
  dibujar:function(g,t){
    dibujarHUD(g,t);
    if(J.pausa){g.fillStyle='rgba(8,14,40,0.75)';g.fillRect(0,0,ANCHO,ALTO);UI.limpiar();
      panelG(g,40,ALTO*0.3,ANCHO-80,230,'rgba(20,30,80,0.95)');textoGordo(g,'PAUSA',ANCHO/2,ALTO*0.3+40,34,'#ffffff','#9ac8ff');
      botonG(g,'seguir',70,ALTO*0.3+80,ANCHO-140,54,'SEGUIR','verde',22);botonG(g,'abandonar',70,ALTO*0.3+150,ANCHO-140,50,'ABANDONAR','rojo',17);}
  },
  accion:function(id){
    if(id==='pausa')J.pausa=true;else if(id==='seguir')J.pausa=false;
    else if(id==='abandonar'){J.pausa=false;P.goles[1]=Math.max(P.goles[1],P.goles[0]+1);terminarPartido();}
    else if(id==='poder')usarPoder();
  }
};
/* ---------------- el resultado ---------------- */
PANT.fin={
  entrar:function(){
    var gane=P.goles[0]>P.goles[1];
    var dt=gane?26+Math.floor(Math.random()*8):-Math.min(Prog.trofeos,12+Math.floor(Math.random()*6));
    var mon=gane?60+P.goles[0]*10:20+P.goles[0]*5;
    Prog.partidos++;if(gane){Prog.ganados++;Prog.racha++;}else Prog.racha=0;
    if(gane&&Prog.racha>=3)mon+=40;
    Prog.trofeos+=dt;Prog.maxTrofeos=Math.max(Prog.maxTrofeos,Prog.trofeos);Prog.monedas+=mon;guardarProg();
    J.res={gane:gane,dt:dt,mon:mon,cuenta:0,cuentaT:0,goles:P.goles.slice(),tiros:P.tiros.slice(),atajadas:P.atajadas.slice(),racha:Prog.racha};
    J.monVis=Prog.monedas-mon;Sonido.conHinchada=false;
    var C=R3.camObj;C.pos.set(YO.x+1.5,1.8,YO.z+3.5);C.mira.set(YO.x,1.2,YO.z);C.fov=45;
  },
  paso:function(dt,t){var R=J.res;if(J.tMenu>0.9){R.cuenta=Math.min(R.mon,R.cuenta+Math.max(1,R.mon*dt*1.3));R.cuentaT=lim((J.tMenu-0.9)/1.0,0,1);}
    [YO,EL].forEach(function(Jx){posar(Jx,dt);});FXd.pasar(dt);},
  dibujar:function(g,t){
    var R=J.res;
    g.fillStyle=lin(g,0,0,0,ALTO,[[0,'rgba(8,14,40,0.2)'],[0.45,'rgba(8,14,40,0.5)'],[1,'rgba(8,14,40,0.92)']]);g.fillRect(0,0,ANCHO,ALTO);
    var e=entra(0);g.save();g.translate(ANCHO/2,ALTO*0.12);var es=e<1?0.4+e*0.7:1+0.03*Math.sin(t*4);g.scale(es,es);
    textoGordo(g,R.gane?'¡GANASTE!':'PERDISTE',0,0,50,R.gane?'#ffe36a':'#ffffff',R.gane?'#ff8a1a':'#9aa8c8');g.restore();
    texto(g,R.goles[0]+'  -  '+R.goles[1],ANCHO/2,ALTO*0.12+52,34,'#ffffff');
    var y0=ALTO*0.5;
    panelG(g,24,y0,ANCHO-48,190,'rgba(20,30,80,0.9)');
    icono(g,'trofeo',70,y0+36,30);var tr=Math.round(R.dt*R.cuentaT);texto(g,(tr>=0?'+':'')+tr,96,y0+37,26,R.dt>=0?'#ffd23a':'#ff6a5a','left');
    icono(g,'moneda',ANCHO/2+40,y0+36,28);texto(g,'+'+Math.round(R.cuenta),ANCHO/2+62,y0+37,24,'#ffe36a','left');
    [['TIROS',R.tiros[0]],['GOLES',R.goles[0]],['ATAJADAS',R.atajadas[0]]].forEach(function(s,i){var x=24+(ANCHO-48)*(i+0.5)/3;
      texto(g,String(s[1]),x,y0+96,24,'#ffffff');texto(g,s[0],x,y0+122,10,'#9ab0e0');});
    if(R.racha>=2)texto(g,'RACHA DE '+R.racha+' VICTORIAS',ANCHO/2,y0+162,13,'#6aff8a');
    botonG(g,'otra',30,ALTO-150,ANCHO/2-40,52,'REVANCHA','azul',18,0.5);
    botonG(g,'seguir',ANCHO/2+10,ALTO-150,ANCHO/2-40,52,'SEGUIR','amarillo',20,0.55);
    dibujarPremioNuevo(g,t);
  },
  accion:function(id){if(id==='seguir'){P=null;irA('menu');}else if(id==='otra')irA('buscando');}
};
/* si con los trofeos nuevos se abre una arena, un cartel */
function dibujarPremioNuevo(g,t){
  var a=arenaActual();if(!J.res||!J.res.gane||J.arenaVista===a)return;
  if(ARENAS[a].trofeos>0&&Prog.trofeos-J.res.dt<ARENAS[a].trofeos){
    g.save();g.globalAlpha=0.7+0.3*Math.sin(t*5);texto(g,'¡NUEVA ARENA: '+ARENAS[a].nom+'!',ANCHO/2,ALTO*0.44,15,'#6aff8a');g.restore();}
}
/* ---------------- el vestuario ---------------- */
var TABS=[['kit','CAMISETAS',KITS,ORDEN_KITS],['pelota','PELOTAS',PELOTAS,ORDEN_PELOTAS],['estela','ESTELAS',ESTELAS,ORDEN_ESTELAS]];
PANT.vestuario={
  entrar:function(){menu3D('vestuario');J.tab=J.tab||0;J.selV=null;},
  paso:function(dt,t){YO.giro=Math.PI+Math.sin(t*0.6)*0.9;pasarMenu3D(t,dt);
    /* la estela de muestra: la pelota da vueltas alrededor del jugador */
    if(TABS[J.tab][0]==='estela'){var a=t*3;B.p.set(Math.cos(a)*1.1,1.1+Math.sin(a*2)*0.3,2+Math.sin(a)*1.1);pasarEstela(B.p,true,J.selV||Prog.estela,0.1);}
    else pasarEstela(B.p,false,Prog.estela);},
  dibujar:function(g,t){
    g.fillStyle=lin(g,0,0,0,ALTO,[[0,'rgba(10,20,60,0.5)'],[0.35,'rgba(10,20,60,0)'],[0.5,'rgba(10,20,60,0.6)'],[1,'rgba(8,12,40,0.95)']]);g.fillRect(0,0,ANCHO,ALTO);
    pastillas(g,entra(0));textoGordo(g,'VESTUARIO',ANCHO/2,62,28,'#ffffff','#9ac8ff');
    var T=TABS[J.tab], y0=ALTO*0.5;
    TABS.forEach(function(tb,i){var w=(ANCHO-40)/3, x=20+i*w, sel=i===J.tab;
      g.fillStyle=sel?'#ff8a1a':'rgba(20,30,80,0.85)';redondo(g,x+3,y0,w-6,34,10);g.fill();texto(g,tb[1],x+w/2,y0+17,11,'#ffffff');UI.boton('tab-'+i,x,y0,w,34);});
    var lista=T[3], D=T[2], cols=3, cw=(ANCHO-40)/cols, chh=88;
    lista.forEach(function(id,i){var x=20+(i%cols)*cw, y=y0+46+Math.floor(i/cols)*(chh+8), it=D[id], mio=Prog.tengo[T[0]][id], puesto=Prog[T[0]]===id, sel=(J.selV||Prog[T[0]])===id;
      g.fillStyle=sel?'rgba(255,210,58,0.25)':'rgba(20,30,80,0.85)';redondo(g,x+3,y,cw-6,chh,12);g.fill();
      g.strokeStyle=puesto?'#6aff8a':sel?'#ffd23a':'rgba(255,255,255,0.2)';g.lineWidth=puesto||sel?3:1.5;redondo(g,x+3,y,cw-6,chh,12);g.stroke();
      muestra(g,T[0],id,x+cw/2,y+34,t);
      texto(g,it.nom,x+cw/2,y+68,9,'#ffffff');
      if(!mio){icono(g,'moneda',x+cw/2-18,y+82,12);texto(g,String(it.precio),x+cw/2-8,y+82,10,'#ffe36a','left');}
      else if(puesto)texto(g,'PUESTO',x+cw/2,y+82,9,'#6aff8a');
      UI.boton('it-'+id,x,y,cw,chh);});
    var s=J.selV;
    if(s&&s!==Prog[T[0]]){var mio2=Prog.tengo[T[0]][s], pr=D[s].precio;
      botonG(g,'comprar',40,ALTO-138,ANCHO-80,50,mio2?'PONER':'COMPRAR',mio2?'verde':'amarillo',20,0,mio2?null:pr+' MONEDAS');}
    barraNav(g,'vestuario');
  },
  accion:function(id){
    var T=TABS[J.tab];
    if(id.indexOf('nav-')===0)navegar(id);
    else if(id.indexOf('tab-')===0){J.tab=+id.slice(4);J.selV=null;}
    else if(id.indexOf('it-')===0){J.selV=id.slice(3);previsualizar(T[0],J.selV);}
    else if(id==='comprar'){var s=J.selV, D=T[2];
      if(!Prog.tengo[T[0]][s]){if(Prog.monedas<D[s].precio){avisar('TE FALTAN '+(D[s].precio-Prog.monedas)+' MONEDAS');return;}Prog.monedas-=D[s].precio;Prog.tengo[T[0]][s]=1;Sonido.fx('moneda');}
      Prog[T[0]]=s;guardarProg();Sonido.fx('festejo');J.selV=null;previsualizar(T[0],s);}
  }
};
function previsualizar(tipo,id){if(tipo==='kit')vestirJugador(YO,KITS[id]);else if(tipo==='pelota')vestirPelota(id);}
function muestra(g,tipo,id,x,y,t){
  if(tipo==='kit'){var K=KITS[id];g.save();g.translate(x,y);g.fillStyle=K.cam;g.strokeStyle='#0a1030';g.lineWidth=2;
    g.beginPath();g.moveTo(-12,-18);g.lineTo(-26,-10);g.lineTo(-20,0);g.lineTo(-14,-4);g.lineTo(-14,20);g.lineTo(14,20);g.lineTo(14,-4);g.lineTo(20,0);g.lineTo(26,-10);g.lineTo(12,-18);g.quadraticCurveTo(0,-10,-12,-18);g.closePath();g.fill();g.stroke();
    g.fillStyle=K.short;g.fillRect(-14,14,28,6);texto(g,'9',0,4,14,'#ffffff');g.restore();}
  else if(tipo==='pelota'){var Pl=PELOTAS[id];g.save();g.translate(x,y);g.rotate(t);g.fillStyle=Pl.base;g.beginPath();g.arc(0,0,22,0,TAU);g.fill();
    g.fillStyle=Pl.panel;for(var i=0;i<5;i++){var a=i/5*TAU;g.beginPath();g.arc(Math.cos(a)*14,Math.sin(a)*14,5,0,TAU);g.fill();}g.beginPath();g.arc(0,0,6,0,TAU);g.fill();
    if(Pl.raya){g.fillStyle=Pl.raya;g.fillRect(-22,-2,44,4);}g.strokeStyle='#0a1030';g.lineWidth=2;g.beginPath();g.arc(0,0,22,0,TAU);g.stroke();g.restore();}
  else{var E=ESTELAS[id];g.save();g.lineCap='round';
    for(var k=0;k<12;k++){var f=k/11;g.strokeStyle=E[2]==='arcoiris'?'hsl('+((f*300+t*100)%360)+',100%,60%)':mezclaCol(E[0],E[1],f);g.lineWidth=14*(1-f*0.7);g.globalAlpha=1-f*0.8;
      g.beginPath();g.moveTo(x+30-f*60,y+Math.sin(f*3+t*3)*8);g.lineTo(x+30-(f+0.1)*60,y+Math.sin((f+0.1)*3+t*3)*8);g.stroke();}g.restore();}
}
function mezclaCol(a,b,f){var c1=new THREE.Color(a),c2=new THREE.Color(b);c1.lerp(c2,f);return '#'+c1.getHexString();}
/* ---------------- el camino de trofeos y las arenas ---------------- */
PANT.arenas={
  entrar:function(){menu3D('menu');J.scroll=0;},
  paso:function(dt,t){orbitarMenu(t);pasarMenu3D(t,dt);if(Entrada.tocando)J.scroll=lim((J.scroll||0)-Entrada.acy,0,ALTO*1.2);},
  dibujar:function(g,t){
    g.fillStyle='rgba(8,14,40,0.82)';g.fillRect(0,0,ANCHO,ALTO);
    pastillas(g,entra(0));textoGordo(g,'CAMINO DE TROFEOS',ANCHO/2,62,22,'#ffffff','#ffd23a');
    g.save();g.beginPath();g.rect(0,90,ANCHO,ALTO-160);g.clip();
    var y=110-J.scroll;
    ORDEN_ARENAS.forEach(function(id){var A=ARENAS[id], abierta=Prog.trofeos>=A.trofeos, im=IMG[A.fondo];
      panelG(g,20,y,ANCHO-40,120,'rgba(20,30,80,0.9)');
      if(im){g.save();redondo(g,28,y+8,ANCHO-56,74,10);g.clip();g.drawImage(im,0,im.height*0.1,im.width,im.width*74/(ANCHO-56),28,y+8,ANCHO-56,74*(ANCHO-56)/(ANCHO-56));
        if(!abierta){g.fillStyle='rgba(8,10,30,0.65)';g.fillRect(28,y+8,ANCHO-56,74);}g.restore();}
      texto(g,A.nom,40,y+100,14,'#ffffff','left');icono(g,'trofeo',ANCHO-80,y+100,16);texto(g,String(A.trofeos),ANCHO-68,y+101,13,'#ffd23a','left');
      if(!abierta)icono(g,'candado',ANCHO/2,y+45,30,'#ffffff');
      y+=132;
      /* los premios hasta la próxima arena */
      CAMINO.filter(function(c){var sig2=ORDEN_ARENAS[ORDEN_ARENAS.indexOf(id)+1];return c.tipo!=='arena'&&c.t>A.trofeos&&(!sig2||c.t<ARENAS[sig2].trofeos);}).forEach(function(c){
        var listo=Prog.trofeos>=c.t, cobrado=Prog.premios[c.t];
        g.fillStyle=cobrado?'rgba(60,70,110,0.7)':listo?'rgba(255,190,40,0.9)':'rgba(20,30,80,0.85)';redondo(g,60,y,ANCHO-120,40,12);g.fill();
        icono(g,'trofeo',80,y+20,14);texto(g,String(c.t),92,y+21,12,'#ffffff','left');
        icono(g,c.tipo==='gemas'?'gema':'moneda',ANCHO/2+30,y+20,18);texto(g,'+'+c.n,ANCHO/2+44,y+21,13,'#ffffff','left');
        texto(g,cobrado?'✓':listo?'COBRAR':'',ANCHO-90,y+21,11,cobrado?'#6aff8a':'#1a2a4a');
        if(listo&&!cobrado)UI.boton('premio-'+c.t,60,y,ANCHO-120,40);
        y+=48;});
      y+=8;});
    g.restore();
    barraNav(g,'arenas');
  },
  accion:function(id){
    if(id.indexOf('nav-')===0)navegar(id);
    else if(id.indexOf('premio-')===0){var tt=+id.slice(7), c=CAMINO.filter(function(x){return x.t===tt;})[0];
      if(c&&!Prog.premios[tt]){Prog.premios[tt]=1;if(c.tipo==='gemas')Prog.gemas+=c.n;else Prog.monedas+=c.n;guardarProg();Sonido.fx('cofre');FXd.confeti();}}
  }
};
/* ---------------- ajustes ---------------- */
PANT.ajustes={
  entrar:function(){menu3D('menu');J.borrar=0;},
  paso:function(dt,t){orbitarMenu(t);pasarMenu3D(t,dt);},
  dibujar:function(g,t){
    g.fillStyle='rgba(8,14,40,0.82)';g.fillRect(0,0,ANCHO,ALTO);
    textoGordo(g,'AJUSTES',ANCHO/2,62,28,'#ffffff','#9ac8ff');
    var A=Prog.aj, x=24, w=ANCHO-48, y=110;
    panelG(g,x,y,w,300,'rgba(20,30,80,0.9)');
    [['musica','MÚSICA'],['efectos','EFECTOS']].forEach(function(f,i){var yy=y+36+i*64;texto(g,f[1],x+20,yy,14,'#ffffff','left');
      botonG(g,f[0]+'-',x+w-196,yy-20,40,40,'–','azul',20);barraG(g,x+w-148,yy-6,96,12,A[f[0]],'#6aff8a','#2a9a3a');botonG(g,f[0]+'+',x+w-46,yy-20,40,40,'+','azul',20);});
    texto(g,'VIBRACIÓN',x+20,y+164,14,'#ffffff','left');botonG(g,'vibra',x+w-110,y+144,92,40,A.vibra?'SÍ':'NO',A.vibra?'verde':'gris',16);
    botonG(g,'borrar',x+20,y+224,w-40,44,J.borrar?'¿SEGURO? TOCÁ OTRA VEZ':'BORRAR PROGRESO','rojo',14);
    texto(g,'PARTIDOS '+Prog.partidos+'  ·  GANADOS '+Prog.ganados+'  ·  GOLES '+Prog.goles,ANCHO/2,y+330,11,'#9ab0e0');
    barraNav(g,'ajustes');
  },
  accion:function(id){
    var A=Prog.aj;
    if(id.indexOf('nav-')===0){guardarProg();navegar(id);return;}
    var m=id.match(/^(musica|efectos)([+-])$/);
    if(m){A[m[1]]=Math.round(lim(A[m[1]]+(m[2]==='+'?0.1:-0.1),0,1)*10)/10;aplicarAjustes();}
    else if(id==='vibra'){A.vibra=!A.vibra;vibrar(40);}
    else if(id==='borrar'){if(J.borrar){Prog=progNuevo();guardarProg();aplicarAjustes();vestirJugador(YO,KITS[Prog.kit]);vestirPelota(Prog.pelota);irA('portada');}else J.borrar=1;}
    guardarProg();
  }
};
function aplicarAjustes(){Sonido.volM=Prog.aj.musica;Sonido.volE=Prog.aj.efectos;Sonido.aplicarVol();}
function avisar(txt){J.aviso={txt:txt,t:0};}
function dibujarAviso(g){
  var A=J.aviso;if(!A)return;var k=A.t, al=k<0.2?k/0.2:k>1.8?Math.max(0,(2.2-k)/0.4):1;
  g.save();g.globalAlpha=al;var w=texAncho(g,A.txt,13)+40;
  g.fillStyle='rgba(10,20,50,0.92)';redondo(g,ANCHO/2-w/2,ALTO*0.4,w,36,18);g.fill();g.strokeStyle='#ffd23a';g.lineWidth=2;redondo(g,ANCHO/2-w/2,ALTO*0.4,w,36,18);g.stroke();
  texto(g,A.txt,ANCHO/2,ALTO*0.4+18,13,'#ffffff');g.restore();
}
