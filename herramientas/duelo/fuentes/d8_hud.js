/* ---------------- lo que se dibuja encima del partido ---------------- */
function placaMarcador(g,x,y,w,der,nom,goles,col1,col2,pod,trof,t){
  /* la placa inclinada con el nombre y el cajón blanco del resultado, como en la referencia */
  g.save();
  var h=40, sk=10;
  g.fillStyle='rgba(0,0,0,0.3)';g.beginPath();g.moveTo(x+sk+3,y+4);g.lineTo(x+w+3,y+4);g.lineTo(x+w-sk+3,y+h+4);g.lineTo(x+3,y+h+4);g.closePath();g.fill();
  g.fillStyle=lin(g,x,y,x+w,y,der?[[0,'#ffffff'],[0.28,'#ffffff'],[0.3,col2],[1,col1]]:[[0,col1],[0.7,col2],[0.72,'#ffffff'],[1,'#ffffff']]);
  g.beginPath();g.moveTo(x+sk,y);g.lineTo(x+w,y);g.lineTo(x+w-sk,y+h);g.lineTo(x,y+h);g.closePath();g.fill();
  g.strokeStyle='rgba(10,20,50,0.85)';g.lineWidth=2;g.stroke();
  var bx=der?x+w*0.15:x+w*0.86;
  texto(g,String(goles),bx,y+h/2+1,28,'#1a2a4a',null,false);
  var nx=der?x+w*0.62:x+w*0.38;
  var tam=Math.min(17,15*120/Math.max(60,texAncho(g,nom,15)));
  texto(g,nom,nx,y+h/2+1,tam,'#ffffff');
  /* los trofeos arriba y la barra de poder abajo */
  icono(g,'trofeo',der?x+w-14:x+12,y-11,15);texto(g,String(trof),der?x+w-26:x+24,y-10,12,'#ffffff',der?'right':'left');
  var bw=w-40, bxx=der?x+8:x+30;
  g.fillStyle='rgba(10,20,50,0.75)';redondo(g,bxx,y+h+4,bw,11,4);g.fill();
  var lleno=pod>=1;
  if(pod>0){g.fillStyle=lleno?lin(g,bxx,0,bxx+bw,0,[[0,'#fff35a'],[0.5,'#ffffff'],[1,'#fff35a']]):'#6af05a';
    var pw=bw*lim(pod,0,1);redondo(g,der?bxx+bw-pw:bxx,y+h+4,pw,11,4);g.fill();
    if(lleno){g.globalAlpha=0.5+0.5*Math.sin(t*10);halo(g,bxx+bw/2,y+h+9,60,'255,240,120',0.4);g.globalAlpha=1;}}
  icono(g,'rayo',der?x+w-12:x+18,y+h+9,14,lleno?'#fff35a':'#ffffff');
  g.restore();
}
function dibujarHUD(g,t){
  if(!P)return;
  var r=P.rival;
  placaMarcador(g,6,26,176,false,'VOS',P.goles[0],'#2a5ad8','#3a7af0',P.pod[0],Prog.trofeos,t);
  placaMarcador(g,ANCHO-182,26,176,true,r.nom,P.goles[1],'#e0501a','#ff7a2a',P.pod[1],r.trofeos,t);
  /* la pausa en el medio (la bandera) */
  var ap=UI.apretado==='pausa';
  g.save();g.translate(ANCHO/2,48);if(ap)g.scale(0.9,0.9);
  g.fillStyle='rgba(10,20,50,0.8)';g.beginPath();g.arc(0,0,19,0,TAU);g.fill();g.strokeStyle='rgba(255,255,255,0.7)';g.lineWidth=2;g.stroke();
  icono(g,'pausa',0,0,16,'#ffffff');g.restore();UI.boton('pausa',ANCHO/2-26,22,52,52);
  /* el reloj */
  var s=Math.ceil(P.reloj);
  g.fillStyle='rgba(20,30,60,0.72)';redondo(g,ANCHO/2-50,78,100,56,12);g.fill();
  if(P.muerte){texto(g,'MUERTE',ANCHO/2,96,12,'#ffd23a');texto(g,'SÚBITA',ANCHO/2,116,16,'#ffd23a');}
  else{texto(g,'TIEMPO',ANCHO/2,92,11,'#dfe8ff');var tr=s<=10?1+0.12*Math.max(0,Math.sin(t*10)):1;
    g.save();g.translate(ANCHO/2,117);g.scale(tr,tr);texto(g,String(s),0,0,28,s<=10?'#ff5a4a':'#ffffff');g.restore();}
  /* de quién es el turno */
  var F=P.fase;
  if(F==='prep'||F==='apunta'||F==='carrera'){
    var txt=P.turno===0?'TU TIRO':'¡ATAJÁ!', cpill=P.turno===0?'#3a7af0':'#e0501a', e=lim(P.tf*4,0,1);
    g.save();g.globalAlpha=e;g.fillStyle=cpill;redondo(g,ANCHO/2-58,142,116,24,12);g.fill();texto(g,txt,ANCHO/2,154.5,13,'#ffffff');g.restore();
  }
  if(F==='apunta')dibujarApuntar(g,t);
  if(F==='carrera'||(F==='vuelo'&&P.turno===1)){
    if(Prog.partidos<2){g.save();g.globalAlpha=0.75+0.25*Math.sin(t*5);texto(g,'ARRASTRÁ PARA MOVERTE',ANCHO/2,ALTO-150,13,'#ffffff');texto(g,'DESLIZÁ RÁPIDO PARA TIRARTE',ANCHO/2,ALTO-128,13,'#fff35a');g.restore();}
  }
  /* el botón del poder */
  var puede=P.pod[0]>=1&&(F==='apunta'&&!P.superArmado||(P.turno===1&&(F==='carrera'||F==='vuelo')&&P.reflejos<=0));
  if(puede||P.superArmado){
    var px=ANCHO-58, py=ALTO-170, pr=34, lat=1+0.06*Math.sin(t*9);
    g.save();g.translate(px,py);g.scale(lat,lat);
    halo(g,0,0,pr*1.9,P.superArmado?'255,140,40':'255,240,120',0.5);
    g.fillStyle=lin(g,0,-pr,0,pr,[[0,'#fff6a0'],[1,P.superArmado?'#ff5a1a':'#ffb01a']]);g.beginPath();g.arc(0,0,pr,0,TAU);g.fill();
    g.strokeStyle='#1a2a4a';g.lineWidth=3;g.stroke();icono(g,'rayo',0,-6,28,'#ffffff');
    texto(g,P.turno===0?'SÚPER':'REFLEJOS',0,pr*0.55,10,'#ffffff');g.restore();
    if(puede)UI.boton('poder',px-pr-6,py-pr-6,pr*2+12,pr*2+12,true);
  }
  if(F==='repe'){
    g.fillStyle='rgba(0,0,0,0.85)';g.fillRect(0,0,ANCHO,ALTO*0.09);g.fillRect(0,ALTO*0.91,ANCHO,ALTO*0.09);
    g.fillStyle='#ff2a2a';g.globalAlpha=0.5+0.5*Math.sin(t*6);g.beginPath();g.arc(28,ALTO*0.045,7,0,TAU);g.fill();g.globalAlpha=1;
    texto(g,'REPETICIÓN',44,ALTO*0.045,15,'#ffffff','left');texto(g,'TOCÁ PARA SEGUIR',ANCHO/2,ALTO*0.955,11,'#c0c8e0');
  }
  if(F==='intro')dibujarIntro(g,t);
  dibujarCartelP(g,t);
}
/* mientras deslizás: el camino del dedo y la mira sobre el arco */
function dibujarApuntar(g,t){
  var cam=P.camino, bp=aPantalla(B.p);
  if(cam.length<2){
    if(Prog.tuto||Prog.partidos<1){
      /* la manito que muestra el gesto */
      var k=(t*0.8)%1, y0=bp.y+30, y1=bp.y-230, x=bp.x+Math.sin(k*Math.PI)*40, y=y0+(y1-y0)*suave(k);
      g.save();g.globalAlpha=k<0.85?1:(1-k)/0.15;
      g.strokeStyle='rgba(255,255,255,0.5)';g.lineWidth=5;g.lineCap='round';g.setLineDash([2,12]);g.beginPath();g.moveTo(bp.x,y0);g.quadraticCurveTo(bp.x+50,(y0+y1)/2,x,y);g.stroke();g.setLineDash([]);
      dibujarDedo(g,x,y);g.restore();
      texto(g,'DESLIZÁ HACIA EL ARCO PARA PATEAR',ANCHO/2,ALTO-120,13,'#ffffff');
      texto(g,'CURVÁ EL DEDO PARA DARLE EFECTO',ANCHO/2,ALTO-98,11,'#fff35a');
    }
    return;
  }
  g.save();g.lineCap='round';g.lineJoin='round';
  g.globalCompositeOperation='lighter';
  for(var pass=0;pass<2;pass++){
    g.strokeStyle=pass?'rgba(255,255,255,0.9)':'rgba(255,230,90,0.35)';g.lineWidth=pass?4:14;
    g.beginPath();g.moveTo(cam[0].x,cam[0].y);for(var i=1;i<cam.length;i++)g.lineTo(cam[i].x,cam[i].y);g.stroke();
  }
  g.restore();
  var T=leerTiro(cam);
  if(T){var q=aPantalla(new THREE.Vector3(T.tx,Math.min(T.ty,3),P.zArco));
    var afuera=Math.abs(T.tx)>ARCO_W/2||T.ty>ARCO_H, c=afuera?'#ff5a4a':'#6aff8a';
    g.save();g.translate(q.x,q.y);g.rotate(t*2);g.strokeStyle=c;g.lineWidth=3;
    g.beginPath();g.arc(0,0,11,0,TAU);g.stroke();for(var k2=0;k2<4;k2++){g.rotate(TAU/4);g.beginPath();g.moveTo(14,0);g.lineTo(20,0);g.stroke();}g.restore();
    /* la fuerza */
    var fw=120, fx=ANCHO/2-fw/2, fy=ALTO-84;
    g.fillStyle='rgba(10,20,50,0.7)';redondo(g,fx,fy,fw,10,5);g.fill();
    g.fillStyle=T.pot>1.05?'#ff5a4a':T.pot>0.8?'#ffd23a':'#6aff8a';redondo(g,fx,fy,fw*lim(T.pot/1.35,0,1),10,5);g.fill();
    texto(g,'FUERZA',ANCHO/2,fy-10,10,'#ffffff');
    if(Math.abs(T.curva)>0.08)texto(g,'CON EFECTO',ANCHO/2,fy+24,11,'#fff35a');
  }
}
function dibujarDedo(g,x,y){
  g.save();g.translate(x,y);g.fillStyle='#ffffff';g.strokeStyle='#1a2a4a';g.lineWidth=2.5;
  g.beginPath();g.moveTo(-6,0);g.lineTo(-6,-26);g.quadraticCurveTo(0,-34,6,-26);g.lineTo(6,-4);g.lineTo(18,0);g.quadraticCurveTo(24,6,20,24);g.lineTo(-10,26);g.quadraticCurveTo(-16,12,-6,0);g.closePath();g.fill();g.stroke();
  g.globalAlpha=0.6;g.fillStyle='#ffffff';g.beginPath();g.arc(0,-30,9,0,TAU);g.fill();g.restore();
}
function dibujarIntro(g,t){
  var k=P.tf, e=ease(k/0.45), sal=k>1.8?ease((k-1.8)/0.4):0;
  g.save();g.globalAlpha=1-sal;
  g.fillStyle='rgba(10,15,40,'+(0.55*(1-sal))+')';g.fillRect(0,0,ANCHO,ALTO);
  var cy=ALTO*0.42;
  [[0,'VOS',Prog.trofeos,'#2a5ad8'],[1,P.rival.nom,P.rival.trofeos,'#e0501a']].forEach(function(q,i){
    var dx=(1-e)*(i?420:-420), y=cy+(i?54:-54);
    g.fillStyle=q[3];g.beginPath();g.moveTo(20+dx,y-34);g.lineTo(ANCHO-8+dx,y-34);g.lineTo(ANCHO-28+dx,y+34);g.lineTo(0+dx,y+34);g.closePath();g.fill();
    g.strokeStyle='rgba(255,255,255,0.8)';g.lineWidth=3;g.stroke();
    texto(g,q[1],ANCHO/2+dx,y-4,26,'#ffffff');icono(g,'trofeo',ANCHO/2-24+dx,y+20,16);texto(g,String(q[2]),ANCHO/2-12+dx,y+21,13,'#ffffff','left');
  });
  if(k>0.4){var z=lim((k-0.4)/0.25,0,1), es=z<1?2.2-1.2*z:1;g.save();g.translate(ANCHO/2,cy);g.scale(es,es);textoGordo(g,'VS',0,0,54,'#ffffff','#ffd23a');g.restore();}
  if(k>1.0){texto(g,ARENAS[P.arena].nom,ANCHO/2,cy+130,14,'#ffffff');texto(g,P.turno===0?'EMPEZÁS PATEANDO VOS':'EMPIEZA PATEANDO EL RIVAL',ANCHO/2,cy+154,12,'#ffd23a');}
  g.restore();
}
function dibujarCartelP(g,t){
  var c=P.cartel;if(!c)return;
  var p=c.t/c.dur, es=p<0.12?0.3+p/0.12*0.9:p>0.85?1.2-(p-0.85)/0.15*0.8:1.2-(p-0.12)*0.25, al=p>0.85?(1-p)/0.15:1;
  g.save();g.globalAlpha=Math.max(0,al);g.translate(ANCHO/2,ALTO*0.36);g.scale(es,es);g.rotate(-0.06);
  if(c.grande){g.save();g.globalCompositeOperation='lighter';g.fillStyle=rad(g,0,0,10,230,[[0,'rgba('+c.col+',0.55)'],[1,'rgba('+c.col+',0)']]);g.beginPath();g.ellipse(0,0,240,90,0,0,TAU);g.fill();g.restore();
    /* rayos que giran detrás */
    g.save();g.globalAlpha*=0.35;g.rotate(t*0.8);g.fillStyle='rgb('+c.col+')';for(var i=0;i<10;i++){g.rotate(TAU/10);g.beginPath();g.moveTo(0,0);g.lineTo(260,-18);g.lineTo(260,18);g.closePath();g.fill();}g.restore();}
  var tam=c.grande?46:34;tam=Math.min(tam,tam*360/Math.max(1,texAncho(g,c.txt,tam)));
  textoGordo(g,c.txt,0,0,tam,'#ffffff','rgb('+c.col+')');
  g.restore();
}
