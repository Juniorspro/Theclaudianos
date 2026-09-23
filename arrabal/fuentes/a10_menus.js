
/* ===========================================================================
   EL PROGRESO — se guarda solo en localStorage (dentro de try/catch)
   ========================================================================= */
var Prog={monedas:600,fichas:5,cartas:{},equipo:[],avance:1,estrellas:{},peleasJugadas:0,
  ranking:[{ini:'MPK',pts:120000,l:'morocha'},{ini:'ARR',pts:90000,l:'bandoneon'},{ini:'TGO',pts:60000,l:'chispa'},{ini:'FIL',pts:40000,l:'mate'},{ini:'BOC',pts:20000,l:'parca'}],
  aj:{musica:0.8,efectos:0.9,vibra:true,temblor:true,crt:true}};
function cartaNueva(id){return{id:id,nivel:1,xp:0,estrellas:0,arbol:{}};}
function cargarProg(){
  try{var s=localStorage.getItem('arrabal.v1');if(s){var o=JSON.parse(s);for(var k in o)if(k!=='aj')Prog[k]=o[k];if(o.aj)for(var a in o.aj)Prog.aj[a]=o.aj[a];}}catch(e){}
  if(!Object.keys(Prog.cartas).length){['mo1','ch1','ba1'].forEach(function(id){Prog.cartas[id]=cartaNueva(id);});}
  Prog.equipo=Prog.equipo.filter(function(id){return !!Prog.cartas[id];});
  if(!Prog.equipo.length)Prog.equipo=Object.keys(Prog.cartas).slice(0,3);
}
function guardarProg(){try{localStorage.setItem('arrabal.v1',JSON.stringify(Prog));}catch(e){}}
function xpNivel(n){return 60+n*25;}
function darXP(inst,xp){
  var C=cartaDe(inst.id), max=RAREZA[C.r].max, subio=0;
  inst.xp+=xp;
  while(inst.nivel<max&&inst.xp>=xpNivel(inst.nivel)){inst.xp-=xpNivel(inst.nivel);inst.nivel++;subio++;}
  if(inst.nivel>=max)inst.xp=0;
  return subio;
}
function vibrar(ms){if(!Prog.aj.vibra||!navigator.vibrate)return;try{navigator.vibrate(ms);}catch(e){}}

/* ---------------- el fondo de los menús: un escenario oscurecido que respira ---------------- */
function fondoMenu(g,t,esc){
  var im=IMG['escenario-'+(esc||'conventillo')];
  g.fillStyle='#0e0818';g.fillRect(0,0,ANCHO,ALTO);
  if(im){var w=Math.max(ANCHO*1.12,ALTO*im.width/im.height), h=w*im.height/im.width, x=-(w-ANCHO)/2+Math.sin(t*0.08)*((w-ANCHO)/2);
    g.globalAlpha=0.55;g.drawImage(im,x,ALTO-h,w,h);g.globalAlpha=1;}
  g.fillStyle=lin(g,0,0,0,ALTO,[[0,'rgba(14,8,24,0.55)'],[0.5,'rgba(14,8,24,0.25)'],[1,'rgba(14,8,24,0.85)']]);g.fillRect(0,0,ANCHO,ALTO);
  /* polvo dorado que flota */
  g.save();g.globalCompositeOperation='lighter';
  for(var i=0;i<24;i++){var px=(i*97+t*(8+i%5*3))%ANCHO, py=ALTO-((i*151+t*(14+i%7*4))%ALTO);
    g.fillStyle='rgba(255,210,120,'+(0.15+0.15*Math.sin(t*2+i))+')';g.beginPath();g.arc(px,py,1.5+i%3,0,TAU);g.fill();}
  g.restore();
}
function cabecera(g,titulo,t,col){
  var e=entra(0);
  g.save();g.globalAlpha=Math.min(1,e*1.4);
  textoArcade(g,titulo,ANCHO/2,28,20,'#ffffff',col||'#ffd23a');
  g.restore();
  botonVolver(g);pastillas(g,e);
}
function botonVolver(g){
  var ap=UI.apretado==='volver';
  g.fillStyle='rgba(14,8,24,0.85)';g.beginPath();g.arc(30,27,ap?17:19,0,TAU);g.fill();
  g.strokeStyle='#d8b25a';g.lineWidth=1.5;g.stroke();icono(g,'izq',28,27,18,'#f3e6c4');
  UI.boton('volver',4,4,54,48);
}

/* ---------------- la portada ---------------- */
function dibujarPortadaVieja(g,t){
  fondoMenu(g,t,'milonga');
  /* la vitrina: los tres del equipo, uno adelante y dos atrás, que rotan solos */
  var eq=Prog.equipo.map(function(id){return Prog.cartas[id];}), n=eq.length;
  var cy=ALTO*0.36, lead=Math.floor(t/3.2)%Math.max(1,n), fase=(t%3.2)/3.2;
  for(var k=n-1;k>=0;k--){
    var i=(lead+k)%n, C=cartaDe(eq[i].id), e=entra(0.15+k*0.1);
    if(e<=0)continue;
    var x=ANCHO/2+(k===0?0:(k===1?-110:110)), w=k===0?250:170, hh=k===0?300:210;
    var sal=k===0&&fase>0.85?(fase-0.85)/0.15:0;
    g.save();g.globalAlpha=Math.min(1,e)*(k===0?1-sal*0.5:0.55);
    retrato(g,C.l,x-w/2,cy-hh/2+(1-e)*60+(k?20:0),w,hh,k===1,false,0.02,true);
    g.restore();
  }
  /* el título: letras con relieve dorado y fileteado alrededor */
  var te=entra(0.05);
  g.save();g.globalAlpha=Math.min(1,te*1.4);g.translate(ANCHO/2,ALTO*0.62);g.scale(0.7+te*0.3,0.7+te*0.3);
  voluta(g,-150,6,1.1,Math.PI*1.1,'#e8c25a');voluta(g,150,6,1.1,-Math.PI*0.1+Math.PI*2,'#e8c25a');
  g.font='bold 58px Georgia,serif';g.textAlign='center';g.textBaseline='middle';
  g.lineJoin='round';g.lineWidth=10;g.strokeStyle='#2a1406';g.strokeText('ARRABAL',0,0);
  g.fillStyle=lin(g,0,-28,0,28,[[0,'#fff3c4'],[0.45,'#ffd23a'],[0.55,'#e08a1a'],[1,'#8a3a0a']]);g.fillText('ARRABAL',0,0);
  g.lineWidth=1.5;g.strokeStyle='rgba(255,250,230,0.7)';g.strokeText('ARRABAL',0,-1);
  g.restore();
  var se=entra(0.3);g.save();g.globalAlpha=se;texto(g,'PUÑOS DE FILETEADO',ANCHO/2,ALTO*0.62+42,14,'#f3e6c4');g.restore();
  pastillas(g,entra(0));
  /* los botones */
  var bw=240, bx=ANCHO/2-bw/2, by=ALTO*0.70;
  botonCaja(g,'mapa',bx,by,bw,58,'PELEAR','#ffd86a','#c98a1a',24,0.4,'MAPA DEL ARRABAL');
  var fw=(bw-16)/3, fy=by+72;
  [['equipo','EQUIPO','grupo'],['coleccion','CARTAS','cartas'],['relicario','COFRE','cofre']].forEach(function(b,i){
    var x=bx+i*(fw+8), e=entra(0.5+i*0.06);if(e<=0)return;
    var ap=UI.apretado===b[0];
    g.save();g.globalAlpha=Math.min(1,e*1.4);g.translate(x+fw/2,fy+34+(1-e)*50+(ap?3:0));g.scale(ap?0.95:1,ap?0.95:1);
    panel(g,-fw/2,-34,fw,68,t);
    icono(g,b[2],0,-8,24,'#ffd23a');texto(g,b[1],0,18,12,'#f3e6c4');
    if(b[0]==='relicario'&&Prog.fichas>0){g.fillStyle='#c0392b';g.beginPath();g.arc(fw/2-8,-26,9,0,TAU);g.fill();texto(g,String(Prog.fichas),fw/2-8,-25.5,10,'#fff',null,false);}
    g.restore();UI.boton(b[0],x,fy,fw,68);
  });
  var ea=entra(0.7);g.save();g.globalAlpha=ea;
  g.fillStyle='rgba(14,8,24,0.8)';g.beginPath();g.arc(ANCHO/2,fy+106,19,0,TAU);g.fill();g.strokeStyle='#d8b25a';g.lineWidth=1.5;g.stroke();
  icono(g,'ajustes',ANCHO/2,fy+106,20,'#f3e6c4');g.restore();
  UI.boton('ajustes',ANCHO/2-24,fy+84,48,44);
}

/* ---------------- el mapa del arrabal ---------------- */
/* el mapa apaisado: el camino corre de izquierda a derecha y se arrastra de costado */
function posNodoMapa(n){
  var b=Math.floor((n-1)/5);
  return{x:110+(n-1)*128+b*90-J.scroll,y:ALTO*0.56+Math.sin(n*1.1)*70};
}
function anchoMapa(){return 110+14*128+2*90+140;}
function dibujarMapa(g,t){
  fondoMenu(g,t,BARRIOS[Math.min(2,Math.floor((Math.min(15,Prog.avance)-1)/5))].esc);
  /* el camino */
  g.save();g.strokeStyle='rgba(232,194,90,0.55)';g.lineWidth=4;g.setLineDash([2,12]);g.lineDashOffset=-t*18;g.lineCap='round';
  g.beginPath();for(var n=1;n<=15;n++){var q=posNodoMapa(n);g[n===1?'moveTo':'lineTo'](q.x,q.y);}g.stroke();g.restore();
  /* los carteles de cada barrio, arriba de su primera pelea */
  for(var b=0;b<3;b++){
    var p1=posNodoMapa(b*5+1), p5=posNodoMapa(b*5+5), xb=(p1.x+p5.x)/2, yb=96;
    if(xb<-140||xb>ANCHO+140)continue;
    g.save();g.fillStyle='rgba(14,8,24,0.85)';redondo(g,xb-120,yb-16,240,32,6);g.fill();
    marcoFilete(g,xb-120,yb-16,240,32,t,true);
    texto(g,BARRIOS[b].nom,xb,yb+1,14,'#ffd23a');g.restore();
  }
  for(var m=1;m<=15;m++){
    var P=posNodoMapa(m);if(P.x<-60||P.x>ANCHO+60)continue;
    var libre=m<=Prog.avance, jefe=m%5===0, pe=peleaDe(m), est=Prog.estrellas[m]||0;
    var e=entra(0.04+Math.min(6,Math.abs(m-Prog.avance))*0.05);
    var r=jefe?38:30, ap=UI.apretado==='pelea:'+m;
    g.save();g.globalAlpha=Math.min(1,e*1.4)*(libre?1:0.5);g.translate(P.x,P.y);var es=e*(ap?0.92:1);g.scale(es,es);
    if(m===Prog.avance)halo(g,0,0,r*2+Math.sin(t*4)*4,'255,210,90',0.45);
    g.fillStyle='rgba(14,8,24,0.95)';g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
    var lider=pe.equipo[pe.equipo.length-1];
    if(libre)retrato(g,cartaDe(lider.id).l,-r+3,-r+3,r*2-6,r*2-6,true,true);
    else icono(g,'candado',0,0,22,'#8a7a5a');
    g.strokeStyle=jefe?'#ff6a4a':'#d8b25a';g.lineWidth=jefe?4:3;g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();
    g.fillStyle='#1a0e06';g.beginPath();g.arc(-r*0.8,r*0.7,11,0,TAU);g.fill();g.strokeStyle='#d8b25a';g.lineWidth=1.5;g.stroke();
    texto(g,String(m),-r*0.8,r*0.7+0.5,10,'#f3e6c4',null,false);
    for(var s2=0;s2<3;s2++)icono(g,'estrella',(s2-1)*14,-r-8,12,s2<est?'#ffd23a':'rgba(255,255,255,0.2)');
    if(jefe)texto(g,'JEFE',0,r+14,10,'#ff9d8a');
    g.restore();
    if(libre)UI.boton('pelea:'+m,P.x-r,P.y-r,r*2,r*2);
  }
  /* bordes que se funden, y una pista de que se arrastra */
  g.fillStyle=lin(g,0,0,60,0,[[0,'rgba(14,8,24,0.9)'],[1,'rgba(14,8,24,0)']]);g.fillRect(0,0,60,ALTO);
  g.fillStyle=lin(g,ANCHO-60,0,ANCHO,0,[[0,'rgba(14,8,24,0)'],[1,'rgba(14,8,24,0.9)']]);g.fillRect(ANCHO-60,0,60,ALTO);
  g.fillStyle=lin(g,0,0,0,70,[[0,'rgba(14,8,24,0.95)'],[1,'rgba(14,8,24,0)']]);g.fillRect(0,0,ANCHO,70);
  cabecera(g,'MAPA DEL ARRABAL',t);
  g.save();g.globalAlpha=0.55+0.25*Math.sin(t*3);texto(g,'◀  ARRASTRÁ PARA RECORRER  ▶',ANCHO/2,ALTO-18,10,'#d8b25a',null,false);g.restore();
}
function pasarScrollX(dt,max){
  if(Entrada.tocando){J.velS=-Entrada.acx/Math.max(dt,1e-3);J.scroll-=Entrada.acx;}
  else{J.scroll+=J.velS*dt;J.velS*=Math.pow(0.04,dt);}
  J.scroll=lim(J.scroll,0,Math.max(0,max));
}
function pasarScroll(dt,max){
  if(Entrada.tocando){J.velS=Entrada.acy/Math.max(dt,1e-3);J.scroll+=Entrada.acy;}
  else{J.scroll+=J.velS*dt;J.velS*=Math.pow(0.04,dt);}
  J.scroll=lim(J.scroll,-Math.max(0,max),0);        /* las listas suben al arrastrar para arriba */
}

/* ---------------- armar el equipo antes de pelear ---------------- */
function poderEquipo(ids){return ids.reduce(function(a,id){return a+statsDe(Prog.cartas[id]).poder;},0);}
function dibujarEquipo(g,t){
  fondoMenu(g,t,J.pelea?BARRIOS[J.pelea.barrio].esc:'conventillo');
  cabecera(g,J.pelea?'PELEA '+J.pelea.n+(J.pelea.jefe?' · JEFE':''):'TU EQUIPO',t);
  /* a la izquierda: los rivales (si hay pelea), tu equipo y el botón; a la derecha, la colección */
  var izq=Math.min(400,ANCHO*0.46), y=62;
  g.fillStyle='rgba(10,6,20,0.55)';redondo(g,10,y-6,izq-10,ALTO-y-2,12);g.fill();
  if(J.pelea){
    texto(g,'RIVALES',24,y+8,11,'#ff9d8a','left');
    var pr=J.pelea.equipo.reduce(function(a,i){return a+statsDe(i).poder;},0);
    texto(g,'PODER '+pr,izq-14,y+8,11,'#ff9d8a','right');
    var cw=Math.min(78,(izq-60)/3), ch=cw*1.36;
    J.pelea.equipo.forEach(function(inst,i){var e=entra(0.05+i*0.06);if(e<=0)return;
      dibujarCarta(g,inst,(izq+10)/2-(J.pelea.equipo.length*(cw+8)-8)/2+i*(cw+8),y+18+(1-e)*30,cw,ch,{alfa:Math.min(1,e*1.4)});});
    y+=ch+30;
  }
  texto(g,'TU EQUIPO',24,y+8,11,'#9fd8ff','left');
  texto(g,'PODER '+poderEquipo(Prog.equipo),izq-14,y+8,11,'#9fd8ff','right');
  var sw=Math.min(J.pelea?84:110,(izq-60)/3), sh=sw*1.36;
  for(var s2=0;s2<3;s2++){
    var x=(izq+10)/2-(3*(sw+8)-8)/2+s2*(sw+8), yy=y+18, id=Prog.equipo[s2];
    if(id){dibujarCarta(g,Prog.cartas[id],x,yy,sw,sh);UI.boton('sacar:'+s2,x,yy,sw,sh);
      if(J.pelea&&J.pelea.equipo[s2]){var v=ventajaElem(cartaDe(id).e,cartaDe(J.pelea.equipo[s2].id).e);
        if(v!==1){icono(g,'flecha',x+sw-10,yy+sh-12,16,v>1?'#7cff9d':'#ff6a6a');}}
    } else {g.strokeStyle='rgba(216,178,90,0.5)';g.setLineDash([6,6]);g.lineWidth=2;redondo(g,x,yy,sw,sh,8);g.stroke();g.setLineDash([]);
      texto(g,'+',x+sw/2,yy+sh/2,30,'rgba(216,178,90,0.6)',null,false);}
  }
  if(J.pelea)botonCaja(g,'pelear',(izq+10)/2-100,ALTO-64,200,52,'¡A PELEAR!','#ff9a6a','#c0392b',22,0.3);
  else texto(g,'TOCÁ UNA CARTA DE LA DERECHA PARA SUMARLA',(izq+10)/2,ALTO-30,9,'#b9a67a',null,false);
  /* la colección, en grilla, que se arrastra de arriba a abajo */
  var gx=izq+14, gw=ANCHO-gx-14, ids=Object.keys(Prog.cartas), cw2=70, ch2=cw2*1.36, porFila=Math.max(3,Math.floor(gw/(cw2+8)));
  var y0=62, altoLista=ALTO-y0-6, pad=(gw-porFila*(cw2+8)+8)/2;
  g.save();g.beginPath();g.rect(gx,y0,gw,altoLista);g.clip();
  ids.forEach(function(id,i){
    var fx=gx+pad+(i%porFila)*(cw2+8), fy=y0+6+Math.floor(i/porFila)*(ch2+8)+J.scroll;
    if(fy>y0+altoLista||fy+ch2<y0)return;
    dibujarCarta(g,Prog.cartas[id],fx,fy,cw2,ch2,{elegida:Prog.equipo.indexOf(id)>=0});
    if(fy>y0-ch2*0.5&&fy<y0+altoLista-ch2*0.5)UI.boton('elegir:'+id,fx,fy,cw2,ch2);
  });
  g.restore();
  J.maxScroll=Math.max(0,Math.ceil(ids.length/porFila)*(ch2+8)-altoLista+10);
}
function tocarEquipo(id){
  if(id.indexOf('sacar:')===0){var s=+id.split(':')[1];if(Prog.equipo.length>1){Prog.equipo.splice(s,1);Sonido.fx('pasa');}else Sonido.fx('no');guardarProg();return true;}
  if(id.indexOf('elegir:')===0){
    var c=id.split(':')[1], i=Prog.equipo.indexOf(c);
    if(i>=0){if(Prog.equipo.length>1)Prog.equipo.splice(i,1);else{Sonido.fx('no');return true;}}
    else if(Prog.equipo.length<3)Prog.equipo.push(c);
    else{Prog.equipo[2]=c;}
    Sonido.fx('blip');guardarProg();return true;
  }
  return false;
}

/* ---------------- la colección ---------------- */
function dibujarColeccion(g,t){
  fondoMenu(g,t,'conventillo');
  var tengo=Object.keys(Prog.cartas).length;
  var cw=92, ch=cw*1.38, y0=66, porFila=Math.floor((ANCHO-30)/(cw+14)), gap=(ANCHO-porFila*cw)/(porFila+1);
  var visible=ALTO-y0;
  g.save();g.beginPath();g.rect(0,y0,ANCHO,visible);g.clip();
  CARTAS.forEach(function(C,i){
    var x=gap+(i%porFila)*(cw+gap), y=y0+8+Math.floor(i/porFila)*(ch+14)+J.scroll;
    if(y>ALTO||y+ch<y0)return;
    var inst=Prog.cartas[C.id], e=entra(0.03*Math.min(9,i));
    if(e<=0)return;
    g.save();g.globalAlpha=Math.min(1,e*1.4);g.translate(0,(1-e)*40);
    if(inst){dibujarCarta(g,inst,x,y,cw,ch);if(y>y0-ch*0.5)UI.boton('carta:'+C.id,x,y,cw,ch);}
    else{
      g.fillStyle='rgba(20,14,30,0.9)';redondo(g,x,y,cw,ch,8);g.fill();
      g.strokeStyle=RAREZA[C.r].col[1];g.lineWidth=2;redondo(g,x,y,cw,ch,8);g.stroke();
      g.globalAlpha*=0.25;retrato(g,C.l,x+4,y+4,cw-8,ch*0.66,false,false,0.02);g.globalAlpha=Math.min(1,e*1.4);
      icono(g,'candado',x+cw/2,y+ch*0.4,24,'#8a7a5a');
      texto(g,'???',x+cw/2,y+ch*0.84,11,'#8a7a5a',null,false);
    }
    g.restore();
  });
  g.restore();
  J.maxScroll=Math.max(0,Math.ceil(CARTAS.length/porFila)*(ch+14)-visible+20);
  g.fillStyle=lin(g,0,0,0,70,[[0,'rgba(14,8,24,0.98)'],[1,'rgba(14,8,24,0.1)']]);g.fillRect(0,0,ANCHO,70);
  cabecera(g,'COLECCIÓN',t);
  texto(g,tengo+' / '+CARTAS.length+' CARTAS',ANCHO/2,54,10,'#b9a67a',null,false);
}

/* ---------------- el detalle de una carta ---------------- */
function dibujarDetalle(g,t){
  var inst=Prog.cartas[J.cartaVista], C=cartaDe(inst.id), L=LUCH[C.l], st=statsDe(inst), R=RAREZA[C.r];
  fondoMenu(g,t,'milonga');
  var e=entra(0.05), izq=Math.round(ANCHO*0.38);
  /* el retrato grande, que respira, a la izquierda */
  g.save();g.globalAlpha=Math.min(1,e*1.3);
  var rh=ALTO-70, rw=Math.min(izq-20,rh*0.9), ry=56+(1-e)*30+Math.sin(t*1.6)*3;
  halo(g,izq/2,ry+rh*0.5,rh*0.5,ELEM[C.e].col,0.25);
  retrato(g,C.l,izq/2-rw/2,ry,rw,rh,false,false,0.02,true);
  g.restore();
  cabecera(g,'',t);
  var x0=izq, w=ANCHO-izq-16, y=56;
  var pe=entra(0.15);g.save();g.globalAlpha=Math.min(1,pe*1.4);
  panel(g,x0,y,w,ALTO-y-12,t);
  var cx=x0+w/2;
  texto(g,C.nom,cx,y+24,20,R.col[0]);
  texto(g,L.nom+' · '+R.nom+' · '+ELEM[C.e].nom,cx,y+44,11,'#cfc2a4',null,false);
  for(var s2=0;s2<5;s2++)icono(g,'estrella',cx+(s2-2)*16,y+62,13,s2<(inst.estrellas||0)?'#ffd23a':'rgba(255,255,255,0.18)');
  var cols=[['DAÑO',st.atk],['VIDA',st.vida],['CRÍTICO',Math.round(st.crit*100)+'%'],['PODER',st.poder]];
  cols.forEach(function(c,i){var x=x0+20+i*((w-40)/4)+((w-40)/8);
    texto(g,String(c[1]),x,y+90,16,'#f3e6c4');texto(g,c[0],x,y+107,9,'#b9a67a',null,false);});
  var max=R.max;
  texto(g,'NIVEL '+inst.nivel+' / '+max,x0+22,y+132,12,'#9fd8ff','left');
  barra(g,x0+22,y+141,w-44,9,inst.nivel>=max?1:inst.xp/xpNivel(inst.nivel),'#8fd3ff','#2f7fc0');
  var Fi=FIRMAS[C.f];
  texto(g,'FIRMA · '+Fi.nom,x0+22,y+168,12,'#ffd23a','left');
  texto(g,Fi.des,x0+22,y+184,10,'#cfc2a4','left',false);
  texto(g,'ESPECIALES · '+L.esp[0].nom+' · '+L.esp[1].nom+'   ·   SÚPER · '+L.sup.nom,x0+22,y+204,9,'#cfc2a4','left',false);
  g.restore();
  var by=ALTO-70, bw=(w-54)/2, pr=precioNivel(inst), puede=inst.nivel<max&&Prog.monedas>=pr;
  botonCaja(g,'mejorar',x0+18,by,bw,50,inst.nivel>=max?'NIVEL MÁX':'MEJORAR',puede?'#ffd86a':'#8a8070',puede?'#c98a1a':'#5a5040',18,0.25,inst.nivel>=max?null:'$ '+pr);
  botonCaja(g,'arbol',x0+36+bw,by,bw,50,'HABILIDADES','#b9e6ff','#3a7ac0',16,0.3);
}

/* ---------------- el árbol de habilidades: una rueda alrededor del retrato ---------------- */
function dibujarArbol(g,t){
  var inst=Prog.cartas[J.cartaVista], C=cartaDe(inst.id);
  fondoMenu(g,t,'riachuelo');
  cabecera(g,'HABILIDADES',t);
  var cx=ANCHO*0.3, cy=ALTO*0.56, R=Math.min(118,ALTO*0.3);
  var e=entra(0.05);
  /* la rueda: aros y rayos dorados, como una ventana de iglesia de barrio */
  g.save();g.globalAlpha=Math.min(1,e*1.4);
  g.fillStyle='rgba(30,18,10,0.85)';g.beginPath();g.arc(cx,cy,R+34,0,TAU);g.fill();
  g.strokeStyle='#d8b25a';g.lineWidth=3;g.beginPath();g.arc(cx,cy,R+34,0,TAU);g.stroke();
  g.lineWidth=1.5;g.beginPath();g.arc(cx,cy,R,0,TAU);g.stroke();g.beginPath();g.arc(cx,cy,R*0.45,0,TAU);g.stroke();
  ARBOL.forEach(function(n,i){
    var a=-Math.PI/2+i/ARBOL.length*TAU, x=cx+Math.cos(a)*R, y=cy+Math.sin(a)*R;
    var tiene=!!inst.arbol[n.id], alcanza=inst.nivel>=n.req;
    g.strokeStyle=tiene?'rgba(120,220,255,0.9)':'rgba(216,178,90,0.4)';g.lineWidth=tiene?3:1.5;
    g.beginPath();g.moveTo(cx+Math.cos(a)*R*0.45,cy+Math.sin(a)*R*0.45);g.lineTo(x,y);g.stroke();
  });
  g.fillStyle='#120a1e';g.beginPath();g.arc(cx,cy,R*0.42,0,TAU);g.fill();
  retrato(g,C.l,cx-R*0.4,cy-R*0.4,R*0.8,R*0.8,false,true);
  g.strokeStyle='#d8b25a';g.lineWidth=2.5;g.beginPath();g.arc(cx,cy,R*0.42,0,TAU);g.stroke();
  g.restore();
  ARBOL.forEach(function(n,i){
    var a=-Math.PI/2+i/ARBOL.length*TAU, x=cx+Math.cos(a)*R, y=cy+Math.sin(a)*R;
    var tiene=!!inst.arbol[n.id], alcanza=inst.nivel>=n.req, el=J.nodoVisto===i, ne=entra(0.1+i*0.04);
    if(ne<=0)return;
    g.save();g.translate(x,y);g.scale(ne,ne);
    if(tiene)halo(g,0,0,30,'120,220,255',0.5);
    g.fillStyle=tiene?'#1e4a6a':alcanza?'#3a2a14':'#1e1a24';g.beginPath();g.arc(0,0,22,0,TAU);g.fill();
    g.strokeStyle=el?'#ffffff':tiene?'#8fe0ff':alcanza?'#d8b25a':'#5a5060';g.lineWidth=el?3.5:2.5;g.stroke();
    icono(g,n.ico,0,0,20,tiene?'#bff0ff':alcanza?'#ffd23a':'#6a6070');
    if(!alcanza)texto(g,'N'+n.req,0,30,9,'#8a8090',null,false);
    g.restore();
    UI.boton('nodo:'+i,x-26,y-26,52,52);
  });
  /* el nodo elegido: qué da, cuánto cuesta */
  var n=ARBOL[J.nodoVisto||0], k=J.nodoVisto||0, tiene=!!inst.arbol[n.id], alcanza=inst.nivel>=n.req, pr=precioNodo(k);
  var px=ANCHO*0.58, pw=ANCHO-px-18, py=ALTO*0.3, pcx=px+pw/2;
  panel(g,px,py,pw,190,t);
  texto(g,n.nom,pcx,py+30,18,'#ffd23a');
  texto(g,n.des,pcx,py+58,12,'#f3e6c4',null,false);
  texto(g,'NIVEL DE LA CARTA: '+inst.nivel,pcx,py+82,10,'#9fd8ff',null,false);
  if(tiene)texto(g,'✔ APRENDIDA',pcx,py+130,14,'#8fe0ff');
  else if(!alcanza)texto(g,'NECESITA NIVEL '+n.req,pcx,py+130,13,'#ff9d8a');
  else botonCaja(g,'aprender',pcx-100,py+106,200,48,'APRENDER',Prog.monedas>=pr?'#ffd86a':'#8a8070',Prog.monedas>=pr?'#c98a1a':'#5a5040',17,0.1,'$ '+pr);
}

/* ---------------- el relicario: el cofre se sacude, se abre y sale una carta ---------------- */
var PROB_RAREZA=[['bronce',0.58],['plata',0.28],['oro',0.115],['diamante',0.025]];
function sortearCarta(){
  var r=Math.random(), acc=0, rar='bronce';
  for(var i=0;i<PROB_RAREZA.length;i++){acc+=PROB_RAREZA[i][1];if(r<acc){rar=PROB_RAREZA[i][0];break;}}
  var pool=CARTAS.filter(function(c){return c.r===rar;});
  return pool[Math.floor(Math.random()*pool.length)].id;
}
function abrirCofre(){
  if(Prog.fichas<=0||J.cofre){Sonido.fx('no');return;}
  Prog.fichas--;
  var id=sortearCarta(), nueva=!Prog.cartas[id];
  if(nueva)Prog.cartas[id]=cartaNueva(id);
  else Prog.cartas[id].estrellas=Math.min(5,(Prog.cartas[id].estrellas||0)+1);
  guardarProg();
  J.cofre={t:0,id:id,nueva:nueva,sono:{}};
  Sonido.fx('cofre');vibrar(30);
}
function pasarRelicario(dt){
  var c=J.cofre;if(!c)return;
  c.t+=dt;
  if(c.t>0.9&&!c.sono.abre){c.sono.abre=true;Sonido.fx('abre');FX.flash=0.9;FX.sacudir(8);vibrar(60);}
  var r=cartaDe(c.id).r;
  if(c.t>1.6&&!c.sono.rev){c.sono.rev=true;Sonido.fx(r==='oro'||r==='diamante'?'legend':'revela');}
}
function dibujarRelicario(g,t){
  fondoMenu(g,t,'riachuelo');
  cabecera(g,'EL RELICARIO',t,'#ffb0e0');
  var c=J.cofre, cx=ANCHO*0.36, cy=ALTO*0.55;
  var im=IMG.relicario, w=Math.min(270,ALTO*0.62), h=im?w*im.height/im.width:w*0.8;
  if(!c||c.t<1.1){
    /* el cofre flota; cuando se abre, tiembla cada vez más */
    var sac=c?Math.pow(c.t/0.9,2)*10:0, dx=c?(az()-0.5)*sac:0, dy=Math.sin(t*2)*6+(c?(az()-0.5)*sac:0);
    halo(g,cx,cy,w*0.8,'255,200,120',0.25+(c?c.t*0.4:0.1*Math.sin(t*3)));
    if(im)g.drawImage(im,cx-w/2+dx,cy-h/2+dy,w,h);
    else{g.fillStyle='#6a3a1a';redondo(g,cx-w/2,cy-h/3,w,h*0.66,10);g.fill();}
    if(c&&c.t>0.85){g.fillStyle='rgba(255,250,230,'+((c.t-0.85)/0.25)+')';g.fillRect(0,0,ANCHO,ALTO);}
  } else {
    /* la carta: da vuelta y aterriza, con el brillo de su rareza */
    var k=lim((c.t-1.1)/0.5,0,1), inst=Prog.cartas[c.id], C=cartaDe(c.id), ch=ALTO*0.62, cw=ch/1.38;
    var rar=C.r, col={bronce:'232,168,106',plata:'230,238,247',oro:'255,227,138',diamante:'150,230,255'}[rar];
    g.save();g.globalCompositeOperation='lighter';
    for(var i=0;i<12;i++){var a=i/12*TAU+t*0.4;g.fillStyle='rgba('+col+',0.12)';g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*500,cy+Math.sin(a)*500);g.lineTo(cx+Math.cos(a+0.14)*500,cy+Math.sin(a+0.14)*500);g.closePath();g.fill();}
    g.restore();
    halo(g,cx,cy,cw,col,0.5);
    var giro=Math.cos(k*Math.PI);          /* de dorso (1) a frente (-1) */
    g.save();g.translate(cx,cy);g.scale(Math.abs(giro)*(0.8+k*0.2),0.8+k*0.2);
    if(giro>0){g.fillStyle=lin(g,-cw/2,-ch/2,cw/2,ch/2,[[0,'#3a1a4a'],[1,'#120a1e']]);redondo(g,-cw/2,-ch/2,cw,ch,10);g.fill();
      marcoFilete(g,-cw/2,-ch/2,cw,ch,t,true);icono(g,'cofre',0,0,50,'#e8c25a');}
    else dibujarCarta(g,inst,-cw/2,-ch/2,cw,ch);
    g.restore();
    if(k>=1){
      texto(g,c.nueva?'¡NUEVA CARTA!':'REPETIDA · +1 ESTRELLA',cx,cy+ch/2+20,16,c.nueva?'#7cff9d':'#ffd23a');
      texto(g,RAREZA[rar].nom,cx,cy-ch/2-14,14,'rgb('+col+')');
    }
  }
  var listo=!c||c.t>2.1;
  if(listo){
    var bx=ANCHO*0.72;
    texto(g,'CADA FICHA ABRE EL COFRE UNA VEZ',bx,ALTO*0.4,11,'#cfc2a4',null,false);
    texto(g,'BRONCE 58% · PLATA 28%',bx,ALTO*0.4+20,10,'#9a8f7a',null,false);
    texto(g,'ORO 11,5% · DIAMANTE 2,5%',bx,ALTO*0.4+36,10,'#9a8f7a',null,false);
    botonCaja(g,'abrir',bx-110,ALTO*0.4+56,220,60,Prog.fichas>0?'ABRIR COFRE':'SIN FICHAS',Prog.fichas>0?'#ffb0e0':'#8a8070',Prog.fichas>0?'#8a2a8a':'#5a5040',21,0.1,'1 FICHA · TENÉS '+Prog.fichas);
  }
}

/* ---------------- el resultado ---------------- */
function mostrarResultado(){
  var gano=M.resultado==='gano', pe=M.pelea, R={gano:gano,n:pe.n,estrellas:0,monedas:0,fichas:0,xp:0,subidas:[],combo:M.comboMax[0]};
  if(gano){
    var nadieCayo=M.eq[0].every(function(F){return !F.ko;}), rapido=M.relojIni-M.reloj<M.relojIni*0.5;
    R.estrellas=1+(nadieCayo?1:0)+(rapido?1:0);
    var primera=!Prog.estrellas[pe.n];
    Prog.estrellas[pe.n]=Math.max(Prog.estrellas[pe.n]||0,R.estrellas);
    R.monedas=pe.premio.monedas*(primera?2:1);R.fichas=primera?pe.premio.fichas:(pe.jefe?1:0);R.xp=pe.premio.xp;
    if(pe.n>=Prog.avance)Prog.avance=Math.min(15,pe.n+1);
  } else {R.monedas=Math.round(pe.premio.monedas*0.25);R.xp=Math.round(pe.premio.xp*0.4);}
  Prog.monedas+=R.monedas;Prog.fichas+=R.fichas;Prog.peleasJugadas++;
  M.eq[0].forEach(function(F){var s=darXP(F.inst,R.xp);if(s)R.subidas.push({l:F.l,nom:F.C.nom,n:F.inst.nivel});});
  guardarProg();
  J.res=R;irA('resultado');
  Sonido.musica('menu');
}
function pasarResultado(){
  var R=J.res;
  for(var s=0;s<R.estrellas;s++)if(J.tMenu>0.7+s*0.35&&!J['est'+s]){J['est'+s]=true;Sonido.fx('estrella');FX.sacudir(3);}
  if(R.subidas.length&&J.tMenu>2&&!J.subioSono){J.subioSono=true;Sonido.fx('sube');}
}
function dibujarResultado(g,t){
  var R=J.res;
  fondoMenu(g,t,BARRIOS[M.pelea.barrio].esc);
  var e=entra(0), izq=Math.round(ANCHO*0.4);
  /* a la izquierda el que más pegó, de cuerpo entero; a la derecha el título, estrellas y premios */
  var ganador=M.eq[0][0], suelo=ALTO-20;
  g.save();g.globalAlpha=Math.min(1,entra(0.1));
  halo(g,izq/2,suelo-130,160,R.gano?'255,210,90':'160,60,60',0.25);
  if(!cuadroSuelto(g,ganador.l,R.gano?'victoria':'golpeado',izq/2,suelo,1,280,1,0))retrato(g,ganador.l,izq/2-120,40,240,ALTO-60,false,false,0.02,true);
  g.restore();
  var cx=izq+(ANCHO-izq)/2;
  g.save();g.globalAlpha=Math.min(1,e*1.4);g.translate(cx,52);g.scale(0.5+e*0.5,0.5+e*0.5);g.rotate(-0.04);
  textoArcade(g,R.gano?'¡VICTORIA!':'DERROTA',0,0,40,R.gano?'#ffe36a':'#ff9a8a',R.gano?'#ff5a1a':'#c0302a');g.restore();
  for(var s2=0;s2<3;s2++){
    var k=lim((J.tMenu-0.7-s2*0.35)/0.25,0,1), on=s2<R.estrellas&&k>0, es=on?1+(1-k)*1.8:1;
    g.save();g.translate(cx+(s2-1)*58,112-(s2===1?8:0));g.scale(es,es);g.globalAlpha=on?k:1;
    icono(g,'estrella',0,0,42,on?'#ffd23a':'rgba(255,255,255,0.15)');g.restore();
  }
  var y=146, pw=Math.min(420,ANCHO-izq-30), px=cx-pw/2, pe=entra(0.5);
  g.save();g.globalAlpha=Math.min(1,pe*1.4);
  panel(g,px,y,pw,120,t);
  var cuenta=lim((J.tMenu-0.9)/1,0,1);
  moneda(g,px+34,y+28,12);texto(g,'+'+Math.round(R.monedas*cuenta),px+54,y+29,18,'#f3e6c4','left');
  ficha(g,px+pw/2+20,y+28,12);texto(g,'+'+R.fichas,px+pw/2+40,y+29,18,'#f3e6c4','left');
  texto(g,'+'+R.xp+' EXPERIENCIA PARA CADA UNO',cx,y+60,11,'#9fd8ff',null,false);
  texto(g,'COMBO MÁS LARGO: '+R.combo+' GOLPES',cx,y+80,11,'#cfc2a4',null,false);
  if(R.subidas.length&&J.tMenu>2)texto(g,R.subidas.map(function(u){return u.nom+' → NIVEL '+u.n;}).join(' · '),cx,y+102,10,'#7cff9d',null,false);
  g.restore();
  var by=ALTO-122, bw=Math.min(260,pw);
  if(R.gano&&R.n<15)botonCaja(g,'siguiente',cx-bw/2,by,bw,54,'SIGUIENTE PELEA','#ffd86a','#c98a1a',20,0.9,'PELEA '+(R.n+1));
  else botonCaja(g,'reintentar',cx-bw/2,by,bw,54,R.gano?'OTRA VEZ':'REINTENTAR','#ff9a6a','#c0392b',20,0.9);
  botonCaja(g,'mapa',cx-bw/2,by+64,bw/2-5,44,'MAPA','#d8cfb5','#8a7a5a',15,1.0);
  botonCaja(g,'equipo',cx+5,by+64,bw/2-5,44,'EQUIPO','#b9e6ff','#3a7ac0',15,1.05);
}

/* ---------------- pausa y ajustes ---------------- */
function dibujarPausa(g,t){
  dibujarPelea(g,t);dibujarHUDPelea(g,t);
  g.fillStyle='rgba(8,4,14,0.82)';g.fillRect(0,0,ANCHO,ALTO);
  textoArcade(g,'PAUSA',ANCHO/2,ALTO*0.22,40,'#ffe36a','#ff5a1a');
  var bw=240,bx=ANCHO/2-bw/2,by=ALTO*0.32;
  botonCaja(g,'seguir',bx,by,bw,58,'SEGUIR','#ffd86a','#c98a1a',22,0.05);
  botonCaja(g,'ajustes',bx,by+70,bw,48,'AJUSTES','#b9e6ff','#3a7ac0',18,0.1);
  botonCaja(g,'rendirse',bx,by+130,bw,48,'RENDIRSE','#ff9a6a','#c0392b',18,0.15);
}
function filaAjuste(g,x0,y,w,ico,nom,valor,idMenos,idMas,i,t){
  var e=entra(0.08+i*0.05);if(e<=0)return;
  g.save();g.globalAlpha=Math.min(1,e*1.4);g.translate((1-e)*-80,0);
  panel(g,x0,y,w,56,t);
  icono(g,ico,x0+26,y+28,20,'#ffd23a');texto(g,nom,x0+48,y+18,12,'#f3e6c4','left');
  var xd=x0+w;
  if(typeof valor==='number'){
    barra(g,x0+48,y+34,w-164,10,valor,'#ffd86a','#c98a1a');
    [[idMenos,'-',xd-108],[idMas,'+',xd-58]].forEach(function(b){
      g.fillStyle=UI.apretado===b[0]?'rgba(255,210,90,0.4)':'rgba(255,210,90,0.16)';redondo(g,b[2],y+10,42,36,8);g.fill();
      texto(g,b[1],b[2]+21,y+28,22,'#fff',null,false);});
  } else {
    g.fillStyle=UI.apretado===idMas?'rgba(255,210,90,0.4)':'rgba(255,210,90,0.16)';redondo(g,xd-120,y+11,104,34,8);g.fill();
    texto(g,valor,xd-68,y+28,13,'#fff');
  }
  g.restore();
  if(typeof valor==='number'){UI.boton(idMenos,xd-112,y+4,50,48);UI.boton(idMas,xd-62,y+4,50,48);}
  else UI.boton(idMas,xd-124,y+6,112,44);
}
function dibujarAjustes(g,t){
  fondoMenu(g,t,'milonga');cabecera(g,'AJUSTES',t);
  var A=Prog.aj, w=Math.round(ANCHO*0.52), x0=16, y=60;
  filaAjuste(g,x0,y,w,'musica','MÚSICA',A.musica,'mus-','mus+',0,t);y+=64;
  filaAjuste(g,x0,y,w,'efectos','EFECTOS',A.efectos,'efe-','efe+',1,t);y+=64;
  filaAjuste(g,x0,y,w,'vibra','VIBRACIÓN',A.vibra?'SÍ':'NO',null,'vibra',2,t);y+=64;
  filaAjuste(g,x0,y,w,'temblor','TEMBLOR DE PANTALLA',A.temblor?'SÍ':'NO',null,'temblor',3,t);y+=64;
  filaAjuste(g,x0,y,w,'ojo','EFECTO DE TUBO (ARCADE)',A.crt!==false?'SÍ':'NO',null,'crt',4,t);
  /* el mando, explicado con sus botones */
  var px=x0+w+12, pw=ANCHO-px-16, py=60, e=entra(0.3);
  g.save();g.globalAlpha=e;
  panel(g,px,py,pw,ALTO-py-14,t);
  texto(g,'EL MANDO',px+pw/2,py+22,14,'#ffd23a');
  [['PALITO','a la izquierda: caminar, saltar (arriba), barrer (abajo)'],['DOS VECES','hacia un lado: correr o paso atrás'],
   ['GOLPE','encadená hasta cuatro'],['FUERTE','golpe fuerte (o acercarte)'],['RAYOS','los dos especiales de tu luchador'],
   ['SÚPER','con dos barras llenas'],['CUBRIR','o tirá el palito para atrás cuando atacan'],['EN COMBO','arriba lanza; abajo en el aire, azote']].forEach(function(l,i){
    texto(g,l[0],px+18,py+50+i*25,10,'#ffd23a','left');texto(g,l[1],px+100,py+50+i*25,9,'#cfc2a4','left',false);});
  g.restore();
}
function tocarAjuste(id){
  var A=Prog.aj;
  if(id==='mus-')A.musica=lim(Math.round((A.musica-0.1)*10)/10,0,1);
  else if(id==='mus+')A.musica=lim(Math.round((A.musica+0.1)*10)/10,0,1);
  else if(id==='efe-')A.efectos=lim(Math.round((A.efectos-0.1)*10)/10,0,1);
  else if(id==='efe+')A.efectos=lim(Math.round((A.efectos+0.1)*10)/10,0,1);
  else if(id==='vibra'){A.vibra=!A.vibra;vibrar(40);}
  else if(id==='temblor')A.temblor=!A.temblor;
  else if(id==='crt')A.crt=A.crt===false;
  else return false;
  Sonido.volM=A.musica;Sonido.volE=A.efectos;Sonido.aplicarVol();guardarProg();
  return true;
}
