
/* ===========================================================================
   LOS TÍTERES — cada luchador es un esqueleto con poses. Una pose son ángulos
   (medidos desde "colgando para abajo"; positivo = hacia adelante); los golpes
   son poses clave interpoladas. El cuerpo se dibuja con cápsulas de dos tonos
   (luz y sombra) y un trazo de tinta encima: el look de dibujo animado sale de ahí.
   ========================================================================= */
var TAM=1.55;            /* tamaño de los luchadores en la pantalla */
var ESQ={muslo:34,pierna:35,torso:44,cabeza:14,brazo:25,antebrazo:24};
var TINTA='#140c16';
var GUARDIA={tor:0.14,cab:-0.05,bFs:0.95,bFc:1.55,bTs:0.55,bTc:1.85,pFm:0.34,pFr:0.5,pTm:-0.32,pTr:0.35,giro:0};
var CLAVES_POSE=['tor','cab','bFs','bFc','bTs','bTc','pFm','pFr','pTm','pTr','giro'];
function conPose(base,cambios){var p={};for(var k in base)p[k]=base[k];for(var c in cambios)p[c]=cambios[c];return p;}
/* suave al entrar y al salir: los golpes no se ven mecánicos */
function suave(t){return t*t*(3-2*t);}
function mezclar(a,b,t,dest){
  dest=dest||{};
  for(var i=0;i<CLAVES_POSE.length;i++){var k=CLAVES_POSE[i];dest[k]=a[k]+(b[k]-a[k])*t;}
  return dest;
}
function mover(p,a,l){return{x:p.x+Math.sin(a)*l,y:p.y+Math.cos(a)*l};}
function esqueleto(L,P,enSuelo){
  var s=L.alto*TAM, m=ESQ.muslo*s, pi=ESQ.pierna*s, to=ESQ.torso*s, br=ESQ.brazo*s, an=ESQ.antebrazo*s;
  var cad={x:0,y:-(m+pi)};
  var pecho={x:cad.x+Math.sin(P.tor)*to,y:cad.y-Math.cos(P.tor)*to};
  var ca=P.tor+P.cab;
  var cab={x:pecho.x+Math.sin(ca)*ESQ.cabeza*s*1.15,y:pecho.y-Math.cos(ca)*ESQ.cabeza*s*1.15};
  var hom={x:cad.x+Math.sin(P.tor)*to*0.88,y:cad.y-Math.cos(P.tor)*to*0.88};
  var hF={x:hom.x+2*s,y:hom.y}, hT={x:hom.x-3*s,y:hom.y+1};
  var cF=mover(hF,P.bFs,br), mF=mover(cF,P.bFs+P.bFc,an);
  var cT=mover(hT,P.bTs,br), mT=mover(cT,P.bTs+P.bTc,an);
  var cdF={x:cad.x+3*s,y:cad.y}, cdT={x:cad.x-3*s,y:cad.y};
  var rF=mover(cdF,P.pFm,m), pF=mover(rF,P.pFm-P.pFr,pi);
  var rT=mover(cdT,P.pTm,m), pT=mover(rT,P.pTm-P.pTr,pi);
  var E={s:s,cad:cad,pecho:pecho,cab:cab,ang:ca,hom:hom,hF:hF,hT:hT,cF:cF,mF:mF,cT:cT,mT:mT,
    cdF:cdF,cdT:cdT,rF:rF,pF:pF,rT:rT,pT:pT,angF:P.bFs+P.bFc,angT:P.bTs+P.bTc,tor:P.tor};
  var nombres=['cad','pecho','cab','hom','hF','hT','cF','mF','cT','mT','cdF','cdT','rF','pF','rT','pT'];
  if(P.giro){
    var c=Math.cos(P.giro), sn=Math.sin(P.giro);
    nombres.forEach(function(n){var q=E[n], x=q.x-cad.x, y=q.y-cad.y;E[n]={x:cad.x+x*c-y*sn,y:cad.y+x*sn+y*c};});
    E.ang+=P.giro;E.angF+=P.giro;E.angT+=P.giro;E.tor+=P.giro;
  }
  /* en el piso: se baja o se sube todo hasta que el pie más bajo toque el suelo */
  if(enSuelo){
    var maxY=Math.max(E.pF.y,E.pT.y);
    if(Math.abs(P.giro)>0.6)nombres.forEach(function(n){maxY=Math.max(maxY,E[n].y+(n==='cab'?ESQ.cabeza*s:4*s));});
    nombres.forEach(function(n){E[n]={x:E[n].x,y:E[n].y-maxY};});
  }
  return E;
}
/* una cápsula que se afina: brazos, piernas, cuellos */
function capsula(g,a,b,r1,r2){
  var dx=b.x-a.x, dy=b.y-a.y, l=Math.hypot(dx,dy)||1, nx=-dy/l, ny=dx/l, an=Math.atan2(dy,dx);
  g.beginPath();
  g.moveTo(a.x+nx*r1,a.y+ny*r1);g.lineTo(b.x+nx*r2,b.y+ny*r2);
  g.arc(b.x,b.y,r2,an+Math.PI/2,an-Math.PI/2,true);
  g.lineTo(a.x-nx*r1,a.y-ny*r1);
  g.arc(a.x,a.y,r1,an-Math.PI/2,an+Math.PI/2,true);
  g.closePath();
}
function miembro(g,a,b,r1,r2,col,colS){
  capsula(g,a,b,r1,r2);g.fillStyle=col;g.fill();
  var dx=b.x-a.x, dy=b.y-a.y, l=Math.hypot(dx,dy)||1, nx=-dy/l*0.42, ny=dx/l*0.42;
  capsula(g,{x:a.x-nx*r1,y:a.y-ny*r1},{x:b.x-nx*r2,y:b.y-ny*r2},r1*0.55,r2*0.55);g.fillStyle=colS;g.fill();
  capsula(g,a,b,r1,r2);g.stroke();
}
function forma(g,pts,col,colS,sombra){
  g.beginPath();g.moveTo(pts[0].x,pts[0].y);
  for(var i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
  g.closePath();g.fillStyle=col;g.fill();
  if(sombra){g.save();g.clip();g.fillStyle=colS;g.beginPath();sombra();g.fill();g.restore();
    g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(var j=1;j<pts.length;j++)g.lineTo(pts[j].x,pts[j].y);g.closePath();}
  g.stroke();
}
function lerpP(a,b,t){return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
function circ(g,x,y,r,col){g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=col;g.fill();g.stroke();}

/* la cara, de tres cuartos mirando para adelante: la expresión cambia con lo que pasa */
function cabezaLobo(g,E,L,exp,t){
  var s=E.s, c=E.cab, r=ESQ.cabeza*s*1.15;
  g.save();g.translate(c.x,c.y);g.rotate(E.ang);
  capsula(g,{x:-2*s,y:r*0.5},{x:-3*s,y:r*1.3},r*0.5,r*0.5);g.fillStyle=L.ropaS;g.fill();g.stroke();
  /* orejas */
  g.fillStyle=L.ropa;[[-r*0.6,-r*0.7],[-r*0.1,-r*0.95]].forEach(function(o){g.beginPath();g.moveTo(o[0]-r*0.3,o[1]+r*0.3);g.lineTo(o[0],o[1]-r*0.6);g.lineTo(o[0]+r*0.3,o[1]+r*0.3);g.closePath();g.fill();g.stroke();});
  /* cráneo y hocico */
  g.beginPath();g.ellipse(-r*0.1,0,r*0.85,r*0.8,0,0,TAU);g.fillStyle=L.ropa;g.fill();g.stroke();
  var boca=exp==='grito'||exp==='dolor'?r*0.35:r*0.1;
  g.beginPath();g.moveTo(r*0.2,-r*0.35);g.lineTo(r*1.45,-r*0.05);g.lineTo(r*1.5,r*0.15);g.lineTo(r*0.4,r*0.25);g.closePath();g.fillStyle=L.extra;g.fill();g.stroke();
  g.beginPath();g.moveTo(r*0.35,r*0.28);g.lineTo(r*1.3,r*0.2+boca);g.lineTo(r*0.3,r*0.5+boca*0.6);g.closePath();g.fillStyle=L.extraS;g.fill();g.stroke();
  g.fillStyle='#fff';for(var d=0;d<3;d++){g.beginPath();g.moveTo(r*(0.6+d*0.25),r*0.2);g.lineTo(r*(0.68+d*0.25),r*0.36);g.lineTo(r*(0.76+d*0.25),r*0.2);g.closePath();g.fill();}
  g.fillStyle='#1a1216';g.beginPath();g.arc(r*1.45,r*0.02,r*0.1,0,TAU);g.fill();
  /* el ojo ámbar que brilla */
  g.fillStyle=exp==='ko'?'#6a5a4a':'#ffc23a';g.beginPath();g.ellipse(r*0.3,-r*0.32,r*0.16,r*0.12,-0.3,0,TAU);g.fill();g.stroke();
  if(exp!=='ko'){g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,190,60,0.5)';g.beginPath();g.arc(r*0.3,-r*0.32,r*0.3,0,TAU);g.fill();g.restore();}
  g.fillStyle=L.pelo;g.beginPath();g.moveTo(-r*0.9,-r*0.2);g.lineTo(-r*1.3,r*0.1);g.lineTo(-r*0.85,r*0.15);g.lineTo(-r*1.2,r*0.5);g.lineTo(-r*0.7,r*0.4);g.closePath();g.fill();
  g.restore();
}
function cara(g,E,L,exp,parp){
  var s=E.s, c=E.cab, r=ESQ.cabeza*s;
  g.save();g.translate(c.x,c.y);g.rotate(E.ang);
  var pal=L===LUCH.parca;
  /* cuello */
  capsula(g,{x:-1*s,y:r*0.6},{x:-2*s,y:r*1.35},r*0.34,r*0.36);g.fillStyle=L.pielS;g.fill();g.stroke();
  /* cabeza con sombra en la nuca */
  g.beginPath();g.ellipse(0,0,r*0.95,r*1.05,0,0,TAU);g.fillStyle=L.piel;g.fill();
  g.save();g.clip();g.fillStyle=L.pielS;g.beginPath();g.ellipse(-r*0.75,r*0.2,r*0.6,r*1.2,0,0,TAU);g.fill();g.restore();
  g.beginPath();g.ellipse(0,0,r*0.95,r*1.05,0,0,TAU);g.stroke();
  /* ojo */
  var ex=r*0.42, ey=-r*0.08;
  if(exp==='ko'){
    g.lineWidth=2;g.beginPath();g.moveTo(ex-3,ey-3);g.lineTo(ex+3,ey+3);g.moveTo(ex+3,ey-3);g.lineTo(ex-3,ey+3);g.stroke();
  } else if(exp==='dolor'||parp){
    g.lineWidth=2;g.beginPath();g.moveTo(ex-4,ey-1);g.lineTo(ex+3,ey+1);g.stroke();
  } else {
    g.fillStyle=pal?'#e9fffb':'#ffffff';g.beginPath();g.ellipse(ex,ey,r*0.24,r*0.3,0,0,TAU);g.fill();g.lineWidth=1.6;g.stroke();
    g.fillStyle=pal?'#c9fff5':'#1b1320';g.beginPath();g.arc(ex+r*0.09,ey+r*0.02,r*0.13,0,TAU);g.fill();
    if(pal){g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(120,255,230,0.6)';g.beginPath();g.arc(ex+r*0.09,ey,r*0.3,0,TAU);g.fill();g.restore();}
    else{g.fillStyle='#fff';g.beginPath();g.arc(ex+r*0.13,ey-r*0.08,r*0.05,0,TAU);g.fill();}
  }
  /* ceja: la actitud entera está en la ceja */
  g.lineWidth=2.4;g.beginPath();
  if(exp==='grito'){g.moveTo(ex-r*0.3,ey-r*0.42);g.lineTo(ex+r*0.3,ey-r*0.28);}
  else if(exp==='dolor'){g.moveTo(ex-r*0.3,ey-r*0.3);g.lineTo(ex+r*0.3,ey-r*0.44);}
  else{g.moveTo(ex-r*0.3,ey-r*0.4);g.lineTo(ex+r*0.32,ey-r*0.36);}
  g.stroke();
  /* boca */
  g.lineWidth=1.8;
  if(exp==='grito'||exp==='dolor'){g.fillStyle='#4a0f1a';g.beginPath();g.ellipse(r*0.55,r*0.45,r*0.16,r*0.2,0,0,TAU);g.fill();g.stroke();}
  else{g.beginPath();g.moveTo(r*0.35,r*0.46);g.quadraticCurveTo(r*0.55,r*0.52,r*0.72,r*0.4);g.stroke();}
  g.lineWidth=2.6;
  g.restore();
}

/* ---------------- el vestuario de cada uno ---------------- */
/* el pelo o el sombrero, encima de la cabeza (en el sistema de la cabeza) */
function peinado(g,E,L,id,t,vx){
  var s=E.s, r=ESQ.cabeza*s;
  g.save();g.translate(E.cab.x,E.cab.y);g.rotate(E.ang);
  if(id==='morocha'){                  /* melena carré con flequillo recto */
    g.fillStyle=L.pelo;g.beginPath();
    g.moveTo(r*0.75,-r*0.45);g.quadraticCurveTo(r*0.2,-r*1.4,-r*0.9,-r*0.8);
    g.quadraticCurveTo(-r*1.35,r*0.2,-r*0.95,r*0.95);g.lineTo(-r*0.2,r*0.85);
    g.quadraticCurveTo(-r*0.35,r*0.1,r*0.05,-r*0.2);g.lineTo(r*0.8,-r*0.25);g.closePath();g.fill();g.stroke();
    g.strokeStyle='rgba(255,255,255,0.25)';g.lineWidth=1.5;g.beginPath();g.moveTo(-r*0.1,-r*0.95);g.quadraticCurveTo(-r*0.6,-r*0.7,-r*0.8,-r*0.2);g.stroke();
  } else if(id==='bandoneon'){         /* gorra achatada y bigote de manubrio */
    g.fillStyle=L.extra;g.beginPath();g.ellipse(-r*0.05,-r*0.7,r*1.05,r*0.42,-0.1,0,TAU);g.fill();g.stroke();
    g.beginPath();g.moveTo(r*0.4,-r*0.55);g.quadraticCurveTo(r*1.3,-r*0.45,r*1.25,-r*0.3);g.lineTo(r*0.3,-r*0.35);g.closePath();g.fill();g.stroke();
    g.fillStyle=L.pelo;g.beginPath();g.moveTo(r*0.2,r*0.3);g.quadraticCurveTo(r*0.6,r*0.15,r*1.0,r*0.35);
    g.quadraticCurveTo(r*1.15,r*0.2,r*1.1,r*0.05);g.quadraticCurveTo(r*1.3,r*0.35,r*0.95,r*0.5);
    g.quadraticCurveTo(r*0.6,r*0.4,r*0.25,r*0.48);g.closePath();g.fill();g.stroke();
  } else if(id==='chispa'){            /* colita naranja que se bambolea */
    var cola=Math.sin(t*6)*0.25-vx*0.0015;
    g.fillStyle=L.pelo;g.beginPath();g.moveTo(-r*0.6,-r*0.5);
    g.quadraticCurveTo(-r*2.0,-r*0.9+cola*r,-r*2.3,r*0.2+cola*r*2);g.quadraticCurveTo(-r*1.5,-r*0.1,-r*0.8,r*0.1);g.closePath();g.fill();g.stroke();
    g.beginPath();g.moveTo(r*0.85,-r*0.2);g.quadraticCurveTo(r*0.6,-r*1.35,-r*0.5,-r*1.0);
    g.quadraticCurveTo(-r*1.1,-r*0.6,-r*0.9,r*0.3);g.lineTo(-r*0.4,-r*0.1);g.lineTo(r*0.1,-r*0.55);g.lineTo(r*0.35,-r*0.25);g.lineTo(r*0.55,-r*0.5);g.closePath();g.fill();g.stroke();
    g.fillStyle='rgba(60,40,40,0.35)';g.beginPath();g.arc(r*0.55,r*0.35,r*0.12,0,TAU);g.fill();   /* hollín */
  } else if(id==='mate'){              /* sombrero de ala ancha, antiparras y bigote gris */
    g.fillStyle=L.extra;g.beginPath();g.ellipse(0,-r*0.55,r*1.6,r*0.28,-0.05,0,TAU);g.fill();g.stroke();
    g.beginPath();g.moveTo(-r*0.75,-r*0.6);g.quadraticCurveTo(-r*0.7,-r*1.6,0,-r*1.55);g.quadraticCurveTo(r*0.75,-r*1.6,r*0.75,-r*0.6);g.closePath();g.fill();g.stroke();
    g.fillStyle=L.metal;g.beginPath();g.ellipse(r*0.2,-r*1.0,r*0.28,r*0.2,0,0,TAU);g.fill();g.stroke();
    g.fillStyle='#8ff6ff';g.beginPath();g.ellipse(r*0.2,-r*1.0,r*0.15,r*0.1,0,0,TAU);g.fill();
    g.fillStyle=L.pelo;g.beginPath();g.moveTo(r*0.2,r*0.3);g.quadraticCurveTo(r*0.7,r*0.1,r*1.05,r*0.45);
    g.quadraticCurveTo(r*0.7,r*0.7,r*0.3,r*0.55);g.closePath();g.fill();g.stroke();
  } else if(id==='parca'){             /* sombrero de lluvia y pelo largo mojado que flota */
    var fl=Math.sin(t*2.4);
    g.fillStyle=L.pelo;g.globalAlpha=0.9;g.beginPath();g.moveTo(-r*0.5,-r*0.6);
    g.quadraticCurveTo(-r*2.1,r*0.3+fl*r*0.4,-r*1.6,r*2.4+fl*r*0.5);g.quadraticCurveTo(-r*0.8,r*1.2,-r*0.2,r*0.9);g.closePath();g.fill();g.stroke();
    g.globalAlpha=1;
    g.fillStyle=L.extra;g.beginPath();g.moveTo(-r*1.3,-r*0.2);g.quadraticCurveTo(-r*1.1,-r*1.5,r*0.1,-r*1.35);
    g.quadraticCurveTo(r*1.2,-r*1.2,r*1.4,-r*0.35);g.quadraticCurveTo(r*0.2,-r*0.7,-r*1.3,-r*0.2);g.closePath();g.fill();g.stroke();
  } else if(id==='kanji'){             /* pelado, barba de chivo canosa y cejas espesas */
    g.fillStyle='rgba(255,255,255,0.25)';g.beginPath();g.ellipse(-r*0.2,-r*0.55,r*0.4,r*0.2,-0.4,0,TAU);g.fill();
    g.fillStyle=L.pelo;g.beginPath();g.moveTo(r*0.35,r*0.55);g.quadraticCurveTo(r*0.55,r*1.7,r*0.2,r*1.55);g.quadraticCurveTo(r*0.1,r*1.0,r*0.2,r*0.55);g.closePath();g.fill();g.stroke();
    g.fillStyle=L.pelo;g.beginPath();g.ellipse(r*0.45,-r*0.42,r*0.3,r*0.1,0.15,0,TAU);g.fill();
  } else if(id==='xiao'){              /* cola de caballo larga que vuela */
    var cx=Math.sin(t*5)*0.3-vx*0.002;
    g.fillStyle=L.pelo;g.beginPath();g.moveTo(-r*0.7,-r*0.3);
    g.quadraticCurveTo(-r*2.2,r*0.2+cx*r,-r*2.6,r*1.6+cx*r*2);g.quadraticCurveTo(-r*1.6,r*0.6,-r*0.7,r*0.3);g.closePath();g.fill();g.stroke();
    g.beginPath();g.moveTo(r*0.8,-r*0.3);g.quadraticCurveTo(r*0.5,-r*1.3,-r*0.5,-r*1.05);g.quadraticCurveTo(-r*1.1,-r*0.6,-r*0.9,r*0.1);g.lineTo(-r*0.3,-r*0.35);g.lineTo(r*0.4,-r*0.5);g.closePath();g.fill();g.stroke();
    g.fillStyle=L.metal;g.fillRect(-r*0.85,-r*0.2,r*0.3,r*0.25);
  } else if(id==='buzo'){              /* pelo corto y la máscara de buceo subida */
    g.fillStyle=L.pelo;g.beginPath();g.moveTo(r*0.8,-r*0.3);g.quadraticCurveTo(r*0.4,-r*1.3,-r*0.6,-r*1.0);g.quadraticCurveTo(-r*1.1,-r*0.4,-r*0.8,r*0.4);g.lineTo(-r*0.35,r*0.1);g.lineTo(r*0.2,-r*0.5);g.closePath();g.fill();g.stroke();
    g.fillStyle='#e8732a';redondo(g,-r*0.5,-r*1.05,r*1.4,r*0.5,r*0.2);g.fill();g.stroke();
    g.fillStyle='rgba(150,220,255,0.85)';redondo(g,-r*0.2,-r*0.98,r*0.9,r*0.34,r*0.14);g.fill();g.stroke();
  } else if(id==='toro'){              /* la máscara de toro, con cuernos */
    g.fillStyle=L.extra;g.beginPath();g.ellipse(0,-r*0.1,r*1.0,r*1.08,0,Math.PI*1.05,Math.PI*2.02);g.lineTo(r*0.95,r*0.1);g.lineTo(-r*0.95,r*0.1);g.closePath();g.fill();g.stroke();
    g.fillStyle='#b3141e';g.beginPath();g.moveTo(r*0.2,-r*0.9);g.lineTo(r*0.45,-r*0.2);g.lineTo(r*0.05,-r*0.2);g.closePath();g.fill();
    g.fillStyle='#f4efe2';
    [[-1,-r*0.7],[1,r*0.5]].forEach(function(c){g.beginPath();g.moveTo(c[1],-r*0.6);g.quadraticCurveTo(c[1]+c[0]*r*0.9,-r*1.2,c[1]+c[0]*r*0.8,-r*1.9);g.quadraticCurveTo(c[1]+c[0]*r*0.35,-r*1.1,c[1]-c[0]*r*0.1,-r*0.5);g.closePath();g.fill();g.stroke();});
    g.fillStyle='#ffffff';g.beginPath();g.ellipse(r*0.45,-r*0.1,r*0.2,r*0.14,0,0,TAU);g.fill();
    g.fillStyle='#d23a2a';g.beginPath();g.arc(r*0.5,-r*0.1,r*0.08,0,TAU);g.fill();
  } else if(id==='vale'){              /* rodete de rulos y pecas */
    g.fillStyle=L.pelo;
    [[-r*0.9,-r*0.9,r*0.55],[-r*0.3,-r*1.1,r*0.5],[r*0.35,-r*0.85,r*0.42],[-r*1.05,-r*0.2,r*0.45]].forEach(function(b){g.beginPath();g.arc(b[0],b[1],b[2],0,TAU);g.fill();g.stroke();});
    g.beginPath();g.arc(-r*0.7,-r*1.6,r*0.5,0,TAU);g.fill();g.stroke();
    g.fillStyle='#3a6ac8';g.beginPath();g.moveTo(-r*0.9,-r*1.3);g.lineTo(-r*1.4,-r*1.6);g.lineTo(-r*1.35,-r*1.1);g.closePath();g.fill();g.stroke();
    g.fillStyle='rgba(150,80,40,0.6)';[[r*0.35,r*0.25],[r*0.55,r*0.32],[r*0.45,r*0.15]].forEach(function(p){g.beginPath();g.arc(p[0],p[1],r*0.05,0,TAU);g.fill();});
    g.fillStyle='#f4efe2';g.fillRect(r*0.62,r*0.02,r*0.22,r*0.12);g.strokeRect(r*0.62,r*0.02,r*0.22,r*0.12);
  } else if(id==='colectivo'){         /* gorra al revés */
    g.fillStyle=L.extra;g.beginPath();g.ellipse(0,-r*0.62,r*0.98,r*0.5,0,Math.PI,TAU);g.lineTo(r*0.98,-r*0.45);g.lineTo(-r*0.98,-r*0.45);g.closePath();g.fill();g.stroke();
    g.beginPath();g.moveTo(-r*0.7,-r*0.55);g.lineTo(-r*1.55,-r*0.35);g.lineTo(-r*1.5,-r*0.2);g.lineTo(-r*0.6,-r*0.38);g.closePath();g.fill();g.stroke();
    g.fillStyle=L.pelo;g.beginPath();g.moveTo(r*0.6,-r*0.45);g.lineTo(r*0.9,-r*0.25);g.lineTo(r*0.55,-r*0.3);g.closePath();g.fill();
  }
  g.restore();
}
/* el torso con su ropa. Va entre la pierna de atrás y la de adelante */
function tronco(g,E,L,id,t){
  var s=E.s, gr=L.grosor, a=E.hom, c=E.cad, w=11*s*gr, w2=9*s*gr;
  var dx=Math.cos(E.tor), dy=Math.sin(E.tor);           /* perpendicular al torso */
  var pts=[{x:a.x+dx*w,y:a.y+dy*w},{x:c.x+dx*w2,y:c.y+dy*w2},{x:c.x-dx*w2,y:c.y-dy*w2},{x:a.x-dx*w*1.05,y:a.y-dy*w*1.05}];
  if(id==='morocha'){
    /* la pollera: cubre la pierna de atrás y vuela con la de adelante; el tajo deja ver la otra */
    var hemT=lerpP(E.cdT,E.rT,1.15), hemF=lerpP(E.cdF,E.rF,0.8);
    forma(g,[{x:c.x-dx*w2,y:c.y-dy*w2},{x:hemT.x-8*s,y:hemT.y+4*s},{x:(hemT.x+hemF.x)/2,y:Math.max(hemT.y,hemF.y)+6*s},{x:hemF.x+4*s,y:hemF.y},{x:c.x+dx*w2,y:c.y+dy*w2}],
      L.ropa,L.ropaS,function(){g.rect(c.x-40*s,c.y,40*s,60*s);});
    g.strokeStyle='#050508';g.lineWidth=2;g.beginPath();g.moveTo(hemT.x-8*s,hemT.y+4*s);g.lineTo((hemT.x+hemF.x)/2,Math.max(hemT.y,hemF.y)+6*s);g.stroke();
    g.strokeStyle=TINTA;g.lineWidth=2.6;
  }
  return pts;
}
function trontoFrente(g,E,L,id,pts,t){
  var s=E.s, a=E.hom, c=E.cad;
  var sombra=function(){g.moveTo(pts[3].x,pts[3].y);g.lineTo(pts[2].x,pts[2].y);g.lineTo(lerpP(pts[2],pts[1],0.4).x,lerpP(pts[2],pts[1],0.4).y);g.lineTo(lerpP(pts[3],pts[0],0.4).x,lerpP(pts[3],pts[0],0.4).y);};
  if(id==='morocha'){
    forma(g,pts,L.ropa,L.ropaS,sombra);
    g.fillStyle='#050508';g.beginPath();g.moveTo(pts[0].x,pts[0].y);g.lineTo(lerpP(pts[0],pts[3],0.5).x,lerpP(pts[0],pts[3],0.5).y+3*s);g.lineTo(pts[3].x,pts[3].y);g.closePath();g.fill();
  } else if(id==='bandoneon'){
    forma(g,pts,L.ropa,L.ropaS,sombra);
    g.save();g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(var i=1;i<4;i++)g.lineTo(pts[i].x,pts[i].y);g.closePath();g.clip();
    g.strokeStyle='#2c4a8a';g.lineWidth=4*s;
    for(var k=0;k<6;k++){var q=lerpP(a,c,k/5+0.05);g.beginPath();g.moveTo(q.x-30*s,q.y);g.lineTo(q.x+30*s,q.y);g.stroke();}
    g.restore();
    g.strokeStyle='#5a3a1c';g.lineWidth=3.5*s;g.beginPath();g.moveTo(lerpP(pts[0],pts[3],0.25).x,a.y);g.lineTo(lerpP(pts[1],pts[2],0.3).x,c.y);g.stroke();
    g.strokeStyle=TINTA;g.lineWidth=2.6;
    g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(var j=1;j<4;j++)g.lineTo(pts[j].x,pts[j].y);g.closePath();g.stroke();
  } else if(id==='chispa'){
    /* saco de farolero con faldones que vuelan atrás */
    var fal=Math.sin(t*5)*3*s;
    forma(g,[pts[2],{x:pts[2].x-14*s,y:pts[2].y+20*s+fal},{x:pts[2].x+2*s,y:pts[2].y+14*s},pts[1]],L.ropaS,L.ropaS);
    forma(g,pts,L.ropa,L.ropaS,sombra);
    g.fillStyle='#e6b84a';for(var b=0;b<3;b++){var bq=lerpP(lerpP(pts[0],pts[1],0.25+b*0.22),lerpP(pts[3],pts[2],0.25+b*0.22),0.3);g.beginPath();g.arc(bq.x,bq.y,1.8*s,0,TAU);g.fill();}
  } else if(id==='mate'){
    forma(g,pts,'#d8cfb5','#a89d80',sombra);
    /* poncho: un triángulo a rayas sobre los hombros */
    var pp=[{x:a.x+16*s,y:a.y-2*s},{x:c.x+12*s,y:c.y-4*s},{x:c.x-8*s,y:c.y+2*s},{x:a.x-15*s,y:a.y}];
    forma(g,pp,L.ropa,L.ropaS,function(){g.rect(a.x-30*s,a.y,20*s,60*s);});
    g.strokeStyle=L.extra;g.lineWidth=2.5*s;
    for(var z=1;z<4;z++){var zq=lerpP(pp[0],pp[1],z/4), zw=lerpP(pp[3],pp[2],z/4);g.beginPath();g.moveTo(zq.x,zq.y);g.lineTo(zw.x,zw.y);g.stroke();}
    g.strokeStyle=TINTA;g.lineWidth=2.6;
  } else if(id==='parca'){
    /* piloto largo hasta los tobillos: esconde las piernas y se deshace en niebla abajo */
    var bajo=Math.max(E.pF.y,E.pT.y)-6*s;
    var fp=Math.sin(t*3)*3*s;
    g.save();
    var gr2=g.createLinearGradient(0,c.y,0,bajo+10*s);gr2.addColorStop(0,L.ropa);gr2.addColorStop(0.7,L.ropa);gr2.addColorStop(1,'rgba(38,52,63,0)');
    g.fillStyle=gr2;g.beginPath();g.moveTo(pts[0].x,pts[0].y);g.lineTo(pts[0].x+10*s,bajo+fp);g.lineTo(pts[3].x-16*s,bajo-fp);g.lineTo(pts[3].x,pts[3].y);g.closePath();g.fill();
    g.restore();
    forma(g,pts,L.ropa,L.ropaS,sombra);
    g.strokeStyle='rgba(120,200,190,0.4)';g.lineWidth=1.5;g.beginPath();g.moveTo(lerpP(pts[0],pts[3],0.4).x,a.y+2*s);g.lineTo(lerpP(pts[0],pts[3],0.4).x+4*s,bajo-10*s);g.stroke();
    g.strokeStyle=TINTA;g.lineWidth=2.6;
  } else if(id==='colectivo'){
    forma(g,pts,'#3a3a44','#23232a',sombra);
    var pe=[lerpP(pts[0],pts[1],0.35),pts[1],pts[2],lerpP(pts[3],pts[2],0.35)];
    forma(g,pe,L.ropa,L.ropaS,function(){g.rect(c.x-20*s,c.y-10*s,12*s,30*s);});
    g.strokeStyle=L.ropa;g.lineWidth=3*s;g.beginPath();g.moveTo(pe[0].x,pe[0].y);g.lineTo(pts[0].x-2*s,a.y+2*s);g.moveTo(pe[3].x,pe[3].y);g.lineTo(pts[3].x+2*s,a.y+2*s);g.stroke();
    g.strokeStyle=TINTA;g.lineWidth=2.6;
    g.fillStyle='rgba(40,30,20,0.35)';g.beginPath();g.arc(pe[1].x-5*s,pe[1].y-6*s,3*s,0,TAU);g.fill();
  } else if(id==='kanji'){
    /* el gi negro cruzado, con ribete y faja dorados, y el rosario de madera */
    forma(g,pts,L.ropa,L.ropaS,sombra);
    g.strokeStyle=L.metal;g.lineWidth=2.4*s;g.beginPath();g.moveTo(pts[0].x,pts[0].y);g.lineTo(lerpP(pts[1],pts[2],0.4).x,lerpP(pts[1],pts[2],0.4).y-8*s);g.stroke();
    g.fillStyle=L.metal;var fj=lerpP(a,c,0.82);g.save();g.translate(fj.x,fj.y);g.rotate(E.tor);g.fillRect(-12*s,-3*s,24*s,6*s);
    g.fillRect(4*s,2*s,4*s,12*s);g.fillRect(9*s,2*s,4*s,10*s);g.restore();
    g.fillStyle='#6a3a1a';for(var cu=0;cu<7;cu++){var pq=lerpP(lerpP(pts[0],pts[3],0.2),lerpP(pts[0],pts[3],0.8),cu/6);g.beginPath();g.arc(pq.x+Math.sin(cu)*2*s,pq.y+6*s+Math.sin(cu/6*Math.PI)*8*s,1.8*s,0,TAU);g.fill();}
    g.strokeStyle=TINTA;g.lineWidth=2.6;
  } else if(id==='xiao'){
    /* chaleco verde jade con nubes bordadas, y el faja negra */
    forma(g,pts,L.ropa,L.ropaS,sombra);
    g.strokeStyle='#e8c25a';g.lineWidth=1.4*s;var nb=lerpP(a,c,0.45);
    g.beginPath();g.arc(nb.x+2*s,nb.y,4*s,Math.PI,0);g.arc(nb.x+8*s,nb.y,3*s,Math.PI,0);g.stroke();
    g.fillStyle=L.extra;var fx=lerpP(a,c,0.88);g.save();g.translate(fx.x,fx.y);g.rotate(E.tor);g.fillRect(-11*s,-3*s,22*s,6*s);g.restore();
    g.strokeStyle=TINTA;g.lineWidth=2.6;
  } else if(id==='buzo'){
    /* el traje de neopreno con franjas naranjas y el arnés */
    forma(g,pts,L.ropa,L.ropaS,sombra);
    g.strokeStyle='#e8732a';g.lineWidth=3*s;g.beginPath();g.moveTo(pts[0].x,pts[0].y);g.lineTo(pts[1].x,pts[1].y);g.stroke();
    g.strokeStyle='#6a5a3a';g.lineWidth=2.6*s;g.beginPath();g.moveTo(pts[3].x,pts[3].y+2*s);g.lineTo(pts[1].x,pts[1].y-6*s);g.stroke();
    g.fillStyle='#6a5a3a';var bl=lerpP(pts[0],pts[1],0.6);g.fillRect(bl.x-3*s,bl.y-3*s,7*s,7*s);
    g.strokeStyle=TINTA;g.lineWidth=2.6;
  } else if(id==='lobizon'){
    /* el torso peludo, más claro en el pecho, y el pañuelo rojo */
    forma(g,pts,L.ropa,L.ropaS,sombra);
    g.fillStyle=L.extra;var pc=lerpP(a,c,0.35);g.beginPath();g.ellipse(pc.x+3*s,pc.y+4*s,6*s,10*s,E.tor,0,TAU);g.fill();
    g.strokeStyle=L.ropaS;g.lineWidth=1.5;for(var pl=0;pl<5;pl++){var pp=lerpP(pts[3],pts[2],0.15+pl*0.18);g.beginPath();g.moveTo(pp.x,pp.y);g.lineTo(pp.x-4*s,pp.y+3*s);g.stroke();}
    g.fillStyle='#b3261e';g.beginPath();g.moveTo(pts[0].x,pts[0].y);g.lineTo(pts[3].x,pts[3].y);g.lineTo(pts[3].x-10*s,pts[3].y+12*s);g.lineTo(lerpP(pts[0],pts[3],0.5).x,lerpP(pts[0],pts[3],0.5).y+8*s);g.closePath();g.fill();
    g.strokeStyle=TINTA;g.lineWidth=2.6;g.stroke();
  } else if(id==='toro'){
    /* torso desnudo y ancho, con el cinturón de campeón */
    forma(g,pts,L.piel,L.pielS,sombra);
    g.strokeStyle=L.pielS;g.lineWidth=1.6;var pe2=lerpP(a,c,0.3);g.beginPath();g.arc(pe2.x+4*s,pe2.y,6*s,0.2,2.6);g.stroke();
    var ci=lerpP(a,c,0.86);g.save();g.translate(ci.x,ci.y);g.rotate(E.tor);
    g.fillStyle=L.extra;g.fillRect(-16*s,-4*s,32*s,8*s);g.strokeRect(-16*s,-4*s,32*s,8*s);
    g.fillStyle=L.metal;g.beginPath();g.ellipse(4*s,0,9*s,7*s,0,0,TAU);g.fill();g.stroke();
    g.fillStyle=L.metalS;g.font='bold '+(8*s)+'px Georgia';g.textAlign='center';g.textBaseline='middle';g.fillText('M',4*s,0.5*s);
    g.restore();
  } else if(id==='vale'){
    /* guardapolvo blanco largo, abierto sobre el pulóver azul, con moño */
    var bajoV=lerpP(E.cad,E.rF,0.75).y+6*s, fv=Math.sin(t*4)*2*s;
    forma(g,[pts[0],{x:pts[0].x+8*s,y:bajoV+fv},{x:pts[3].x-10*s,y:bajoV-fv},pts[3]],L.ropa,L.ropaS,function(){g.rect(c.x-30*s,c.y-20*s,16*s,60*s);});
    forma(g,[lerpP(pts[0],pts[3],0.25),lerpP(pts[1],pts[2],0.3),lerpP(pts[1],pts[2],0.7),lerpP(pts[0],pts[3],0.75)],L.extra,L.extraS);
    g.fillStyle='#3a6ac8';var mo=lerpP(pts[0],pts[3],0.5);g.beginPath();g.moveTo(mo.x,mo.y+3*s);g.lineTo(mo.x-6*s,mo.y-1*s);g.lineTo(mo.x-6*s,mo.y+7*s);g.closePath();
    g.moveTo(mo.x,mo.y+3*s);g.lineTo(mo.x+6*s,mo.y-1*s);g.lineTo(mo.x+6*s,mo.y+7*s);g.closePath();g.fill();g.stroke();
  } else forma(g,pts,L.ropa,L.ropaS,sombra);
}
function pierna(g,E,L,id,lado){
  var s=E.s, gr=L.grosor, cd=lado?E.cdF:E.cdT, r=lado?E.rF:E.rT, p=lado?E.pF:E.pT;
  var sombraF=lado?1:0.82;
  var colM, colMS, colP, colPS;
  if(id==='morocha'){colM=colP=L.piel;colMS=colPS=L.pielS;}
  else if(id==='vale'){colM=L.piel;colMS=L.pielS;colP='#f4f4f6';colPS='#b8bcc8';}
  else if(id==='lobizon'){colM=L.extra;colMS=L.extraS;colP=L.ropa;colPS=L.ropaS;}
  else if(id==='toro'){colM=colP=L.extra;colMS=colPS=L.extraS;}
  else if(id==='colectivo'){colM=colP=L.ropa;colMS=colPS=L.ropaS;}
  else if(id==='bandoneon'){colM=colP=L.extra;colMS=colPS=L.extraS;}
  else {colM=colP=L.extra;colMS=colPS=L.extraS;}
  if(!lado){colM=oscurecer(colM);colP=oscurecer(colP);}
  if(id==='parca')return;                 /* un fantasma: no tiene pies, flota */
  miembro(g,cd,r,8.6*s*gr,6.9*s*gr,colM,colMS);
  miembro(g,r,p,6.9*s*gr,5.2*s*gr,colP,colPS);
  /* el pie, que siempre mira para adelante */
  var ang=Math.atan2(p.y-r.y,p.x-r.x)-Math.PI/2;
  g.save();g.translate(p.x,p.y);g.rotate(ang*0.4);
  if(id==='kanji'||id==='lobizon'){   /* descalzo; el lobizón, con garras en los pies */
    g.fillStyle=lado?(id==='kanji'?L.piel:L.ropa):oscurecer(id==='kanji'?L.piel:L.ropa);
    g.beginPath();g.moveTo(-4*s,-3*s);g.lineTo(6*s,-2*s);g.quadraticCurveTo(12*s,-1*s,11*s,3*s);g.lineTo(-5*s,3*s);g.closePath();g.fill();g.stroke();
    if(id==='lobizon'){g.fillStyle=L.metal;for(var gp=0;gp<3;gp++){g.beginPath();g.moveTo(8*s+gp*1.5*s,1*s);g.lineTo(14*s+gp*1.5*s,3*s);g.lineTo(9*s+gp*1.5*s,3*s);g.closePath();g.fill();}}
  } else if(id==='morocha'){
    g.fillStyle='#0c0b10';g.beginPath();g.moveTo(-3*s,-3*s);g.lineTo(10*s,1*s);g.lineTo(9*s,3*s);g.lineTo(-2*s,3*s);g.closePath();g.fill();g.stroke();
    g.fillStyle='#dfe6ee';g.beginPath();g.moveTo(-3*s,1*s);g.lineTo(-1*s,1*s);g.lineTo(-4*s,11*s);g.closePath();g.fill();g.stroke();  /* el taco-cuchilla */
  } else {
    var bota=id==='colectivo'?'#5a3a22':id==='vale'?'#e8e8ee':id==='buzo'?'#e8732a':id==='toro'?'#b3141e':'#2a1d16';
    g.fillStyle=lado?bota:oscurecer(bota);g.beginPath();g.moveTo(-4*s,-3*s);g.lineTo(6*s,-3*s);g.quadraticCurveTo(12*s*gr,-2*s,11*s*gr,3*s);g.lineTo(-5*s,3*s);g.closePath();g.fill();g.stroke();
  }
  g.restore();
}
function oscurecer(hex){
  var n=parseInt(hex.slice(1),16), r=(n>>16)*0.82, gg=((n>>8)&255)*0.82, b=(n&255)*0.82;
  return 'rgb('+Math.round(r)+','+Math.round(gg)+','+Math.round(b)+')';
}
function brazo(g,E,L,id,lado,t,F){
  var s=E.s, gr=L.grosor, h=lado?E.hF:E.hT, c=lado?E.cF:E.cT, m=lado?E.mF:E.mT, ang=lado?E.angF:E.angT;
  var mangaC, mangaS, anteC, anteS;
  if(id==='morocha'){mangaC=L.piel;mangaS=L.pielS;anteC=L.extra;anteS=L.extraS;}
  else if(id==='bandoneon'){mangaC=L.ropa;mangaS=L.ropaS;anteC=L.piel;anteS=L.pielS;}
  else if(id==='mate'){mangaC=L.ropa;mangaS=L.ropaS;anteC='#d8cfb5';anteS='#a89d80';}
  else if(id==='colectivo'){mangaC='#3a3a44';mangaS='#23232a';anteC=L.piel;anteS=L.pielS;}
  else if(id==='parca'){mangaC=L.ropa;mangaS=L.ropaS;anteC=L.ropa;anteS=L.ropaS;}
  else if(id==='kanji'){mangaC=L.ropa;mangaS=L.ropaS;anteC=L.piel;anteS=L.pielS;}
  else if(id==='xiao'||id==='toro'){mangaC=L.piel;mangaS=L.pielS;anteC=L.piel;anteS=L.pielS;}
  else if(id==='lobizon'){mangaC=L.ropa;mangaS=L.ropaS;anteC=L.ropa;anteS=L.ropaS;}
  else if(id==='vale'){mangaC=L.ropa;mangaS=L.ropaS;anteC=L.ropa;anteS=L.ropaS;}
  else {mangaC=L.ropa;mangaS=L.ropaS;anteC=L.ropa;anteS=L.ropaS;}
  if(!lado){mangaC=oscurecer(mangaC);anteC=oscurecer(anteC);}
  miembro(g,h,c,6.4*s*gr,5.5*s*gr,mangaC,mangaS);
  miembro(g,c,m,5.5*s*gr,4.6*s*gr,anteC,anteS);
  /* la mano: guante enorme en el Bandoneón, puño normal en los demás */
  if(id==='bandoneon'){
    g.save();g.translate(m.x,m.y);g.rotate(-ang+Math.PI/2);
    var ab=F&&F.fuelle?F.fuelle:0;
    g.fillStyle=lado?L.metal:oscurecer(L.metal);
    redondo(g,-9*s,-8*s-ab*3*s,20*s+ab*6*s,16*s+ab*6*s,4*s);g.fill();g.stroke();
    g.strokeStyle=L.metalS;g.lineWidth=1.6;
    for(var k=0;k<4;k++){g.beginPath();g.moveTo(-6*s+k*5*s*(1+ab*0.3),-7*s-ab*3*s);g.lineTo(-6*s+k*5*s*(1+ab*0.3),7*s+ab*3*s);g.stroke();}
    g.strokeStyle=TINTA;g.lineWidth=2.6;
    g.restore();
  } else if(id==='lobizon'){           /* la mano con garras */
    circ(g,m.x,m.y,5*s*gr,lado?L.ropa:oscurecer(L.ropa));
    g.fillStyle=L.metal;g.save();g.translate(m.x,m.y);g.rotate(-ang+Math.PI/2);
    for(var gz=-1;gz<=1;gz++){g.beginPath();g.moveTo(3*s,gz*3*s-1.5*s);g.lineTo(12*s,gz*4*s);g.lineTo(3*s,gz*3*s+1.5*s);g.closePath();g.fill();g.stroke();}
    g.restore();
  } else {
    var colM=id==='morocha'?L.extra:id==='buzo'?'#1a1d24':L.piel;
    circ(g,m.x,m.y,4.3*s*gr*(id==='toro'?1.35:1),lado?colM:oscurecer(colM));
    if(id==='kanji'||id==='xiao'){g.strokeStyle='#f4efe2';g.lineWidth=1.5;g.beginPath();g.arc(m.x,m.y,3*s,0,TAU);g.stroke();g.strokeStyle=TINTA;g.lineWidth=2.6;}
  }
}
/* las armas: van en la mano de adelante y siguen al antebrazo */
function arma(g,E,L,id,t,F){
  var s=E.s, m=E.mF, a=E.angF, ata=F&&F.golpeando;
  if(id==='chispa'){
    /* la vara de farolero: larga, sale de la mano en la dirección del antebrazo */
    var largo=78*s, dx=Math.sin(a), dy=Math.cos(a);
    var p0={x:m.x-dx*20*s,y:m.y-dy*20*s}, p1={x:m.x+dx*largo,y:m.y+dy*largo};
    g.strokeStyle=TINTA;g.lineWidth=6;g.beginPath();g.moveTo(p0.x,p0.y);g.lineTo(p1.x,p1.y);g.stroke();
    g.strokeStyle=L.metal;g.lineWidth=3;g.beginPath();g.moveTo(p0.x,p0.y);g.lineTo(p1.x,p1.y);g.stroke();
    g.strokeStyle=TINTA;g.lineWidth=2.6;
    g.save();g.translate(p1.x,p1.y);
    g.fillStyle='#2a2e38';redondo(g,-5*s,-6*s,10*s,12*s,2*s);g.fill();g.stroke();
    g.globalCompositeOperation='lighter';
    var fl=1+Math.sin(t*22)*0.15+(ata?0.6:0);
    g.fillStyle=rad(g,0,0,1,16*s*fl,[[0,'rgba(255,245,200,1)'],[0.35,'rgba(255,160,40,0.8)'],[1,'rgba(255,80,0,0)']]);
    g.beginPath();g.arc(0,0,16*s*fl,0,TAU);g.fill();
    g.restore();
  } else if(id==='mate'){
    /* boleadoras: dos bolas con luz eléctrica que giran alrededor de la mano */
    var vel=ata?18:5, ra=(ata?30:16)*s;
    for(var k=0;k<2;k++){
      var an=t*vel+k*Math.PI, bx=m.x+Math.cos(an)*ra, by=m.y+Math.sin(an)*ra*0.6-(ata?0:6*s);
      g.strokeStyle='#6b4a2a';g.lineWidth=1.6;g.beginPath();g.moveTo(m.x,m.y);g.lineTo(bx,by);g.stroke();
      g.strokeStyle=TINTA;g.lineWidth=2.6;
      circ(g,bx,by,4.5*s,'#bfe9ff');
      g.save();g.globalCompositeOperation='lighter';
      g.fillStyle=rad(g,bx,by,1,12*s,[[0,'rgba(160,240,255,0.9)'],[1,'rgba(60,160,255,0)']]);g.beginPath();g.arc(bx,by,12*s,0,TAU);g.fill();g.restore();
    }
  } else if(id==='parca'){
    /* el anzuelo con cadena: cuelga, o sale disparado en el golpe */
    var dx2=Math.sin(a), dy2=Math.cos(a), lar=(ata?64:26)*s;
    var fin={x:m.x+dx2*lar,y:m.y+dy2*lar+(ata?0:10*s)};
    g.fillStyle='#8c8c96';
    for(var e=1;e<9;e++){var q=lerpP(m,fin,e/9);g.beginPath();g.arc(q.x,q.y,1.6*s,0,TAU);g.fill();}
    g.save();g.translate(fin.x,fin.y);g.rotate(-a+Math.PI/2);
    g.strokeStyle=TINTA;g.lineWidth=6;g.beginPath();g.arc(0,6*s,8*s,-Math.PI*0.5,Math.PI*0.9);g.stroke();
    g.strokeStyle=L.metal;g.lineWidth=3;g.beginPath();g.arc(0,6*s,8*s,-Math.PI*0.5,Math.PI*0.9);g.stroke();
    g.restore();g.strokeStyle=TINTA;g.lineWidth=2.6;
  } else if(id==='xiao'){
    /* el bastón largo: sale para los dos lados de la mano */
    var dx3=Math.sin(a), dy3=Math.cos(a), lb=(ata?70:52)*s;
    var q0={x:m.x-dx3*lb*0.8,y:m.y-dy3*lb*0.8}, q1={x:m.x+dx3*lb,y:m.y+dy3*lb};
    g.strokeStyle=TINTA;g.lineWidth=7;g.beginPath();g.moveTo(q0.x,q0.y);g.lineTo(q1.x,q1.y);g.stroke();
    g.strokeStyle=L.metal;g.lineWidth=4;g.beginPath();g.moveTo(q0.x,q0.y);g.lineTo(q1.x,q1.y);g.stroke();
    g.fillStyle='#e8c25a';[q0,q1].forEach(function(q){g.beginPath();g.arc(q.x,q.y,3*s,0,TAU);g.fill();});
    g.strokeStyle=TINTA;g.lineWidth=2.6;
  } else if(id==='buzo'){
    /* el arpón: fusil corto con la punta y la soga */
    g.save();g.translate(m.x,m.y);g.rotate(-a+Math.PI/2);
    g.fillStyle='#5a4a3a';redondo(g,-6*s,-3*s,30*s,6*s,2*s);g.fill();g.stroke();
    g.fillStyle='#9aa3b2';g.fillRect(24*s,-1.2*s,(ata?24:14)*s,2.4*s);g.strokeRect(24*s,-1.2*s,(ata?24:14)*s,2.4*s);
    var px2=(ata?48:38)*s;g.beginPath();g.moveTo(px2,-4*s);g.lineTo(px2+8*s,0);g.lineTo(px2,4*s);g.closePath();g.fill();g.stroke();
    g.restore();
  } else if(id==='vale'){
    /* el palo de hockey, con la curva abajo */
    g.save();g.translate(m.x,m.y);g.rotate(-a+Math.PI/2+(ata?0.2:-0.5));
    g.strokeStyle=TINTA;g.lineWidth=6;g.beginPath();g.moveTo(-8*s,0);g.lineTo(36*s,0);g.quadraticCurveTo(44*s,0,44*s,8*s);g.stroke();
    g.strokeStyle=L.metal;g.lineWidth=3.2;g.beginPath();g.moveTo(-8*s,0);g.lineTo(36*s,0);g.quadraticCurveTo(44*s,0,44*s,8*s);g.stroke();
    g.strokeStyle='#f4efe2';g.lineWidth=3.2;g.beginPath();g.moveTo(-8*s,0);g.lineTo(2*s,0);g.stroke();
    g.restore();g.strokeStyle=TINTA;g.lineWidth=2.6;
  } else if(id==='colectivo'){
    /* la llave inglesa */
    g.save();g.translate(m.x,m.y);g.rotate(-a+Math.PI/2+(ata?0.3:-0.4));
    g.fillStyle=L.metal;redondo(g,-3*s,-4*s,34*s,8*s,3*s);g.fill();g.stroke();
    g.beginPath();g.moveTo(28*s,-10*s);g.lineTo(40*s,-10*s);g.lineTo(40*s,-3*s);g.lineTo(34*s,-3*s);g.lineTo(34*s,3*s);g.lineTo(40*s,3*s);g.lineTo(40*s,10*s);g.lineTo(28*s,10*s);g.closePath();g.fill();g.stroke();
    g.restore();
  }
}
/* el dron-colectivo que acompaña al pibe: flota atrás del hombro */
function dron(g,x,y,s,t){
  g.save();g.translate(x,y+Math.sin(t*3)*3);
  g.fillStyle='#d8262b';redondo(g,-13*s,-6*s,26*s,12*s,3*s);g.fill();g.stroke();
  g.fillStyle='#ffd23a';g.fillRect(-13*s,-1*s,26*s,3*s);
  g.fillStyle='#bfe8ff';for(var i=0;i<3;i++){g.fillRect(-9*s+i*7*s,-4*s,5*s,3*s);}
  g.strokeStyle=TINTA;g.lineWidth=1.5;
  var h=Math.sin(t*50)*7*s;
  g.beginPath();g.moveTo(-9*s-h,-9*s);g.lineTo(-9*s+h,-9*s);g.moveTo(9*s-h,-9*s);g.lineTo(9*s+h,-9*s);g.stroke();
  g.beginPath();g.moveTo(-9*s,-6*s);g.lineTo(-9*s,-9*s);g.moveTo(9*s,-6*s);g.lineTo(9*s,-9*s);g.stroke();
  g.lineWidth=2.6;g.restore();
}
/* dibuja un luchador entero. F: el luchador (posición, mirada, pose, expresión, estado) */
function dibujarTitere(g,F,t,escala){
  var L=LUCH[F.l], id=F.l, E=esqueleto(L,F.pose,F.enSuelo);
  if(dibujarSprite(g,F,t,escala))return E;     /* el sprite pintado manda; el títere queda de respaldo */
  g.save();
  g.translate(F.x,F.y+(id==='parca'&&F.enSuelo?-7-Math.sin(t*2.5)*4:0));
  g.scale(F.f*(escala||1),escala||1);
  g.lineJoin='round';g.lineCap='round';g.strokeStyle=TINTA;g.lineWidth=2.6;
  /* sombra en el piso */
  if(F.enSuelo){g.fillStyle='rgba(0,0,0,0.28)';g.beginPath();g.ellipse(0,0,26*L.alto*TAM*L.grosor,6,0,0,TAU);g.fill();}
  if(id==='colectivo')dron(g,-34*E.s,E.hom.y-44*E.s,E.s,t);
  brazo(g,E,L,id,false,t,F);
  pierna(g,E,L,id,false);
  var pts=tronco(g,E,L,id,t);
  pierna(g,E,L,id,true);
  trontoFrente(g,E,L,id,pts,t);
  if(id==='lobizon')cabezaLobo(g,E,L,F.exp,t);
  else{cara(g,E,L,F.exp,F.parpadeo);peinado(g,E,L,id,t,F.vx||0);}
  arma(g,E,L,id,t,F);
  brazo(g,E,L,id,true,t,F);
  g.restore();
  return E;
}

/* ---------------- los sprites pintados (Rezona): 12 cuadros por luchador ----------------
   Un atlas por luchador (sprites-<id>) y SPR_META con [x,y,w,h,anclaX] de cada cuadro; el ancla
   de abajo son los pies. Si el atlas no llegó, se dibuja el títere de siempre. */
var SPR_META=null;
/* de la pose de la animación al cuadro pintado */
var CUADRO_DE={guardia:'guardia',jabPrep:'prepGolpe',patPrep:'prepPatada',fuertePrep:'prepGolpe',dashAtras:'guardia',
  jab:'golpe',cruz:'golpe',gancho:'golpe',cuerpo:'golpe',aerea1:'golpe',giro2:'golpe',
  patMedia:'patada',patAlta:'patada',aerea2:'patada',aerea3:'patada',giro1:'patada',
  patBaja:'barrida',barrida:'barrida',alzadaPrep:'barrida',alzada:'alzada',
  fuerte:'especial',azote:'especial',salto:'salto',bloqueo:'bloqueo',golpeado:'golpeado',
  caido:'caido',dash:'dash',victoria:'victoria',aireG:'volando'};
function cuadroSprite(F){
  switch(F.est){
    case 'bloqueo':return 'bloqueo';
    case 'dash':return 'dash';
    case 'salto':case 'entra':return 'salto';
    case 'golpeado':return 'golpeado';
    case 'aireG':return F.ko&&F.enSuelo?'caido':'volando';
    case 'caido':case 'ko':return 'caido';
    case 'levanta':return F.tEst<0.12?'caido':'levanta';
    case 'camina':var ph=Math.floor(F.t*7)%4;return ph===0?'paso1':ph===2?'paso2':'guardia';
    case 'super':return 'especial';
    case 'victoria':return 'victoria';
    case 'rafaga':return (Math.floor(F.rafaga.t*14)%2)?'patada':'golpe';
    case 'ataque':
      if(!F.mov)return 'guardia';
      if(F.tBusca>0&&F.fr<1)return 'dash';      /* el especial que corre hasta el rival */
      var k=F.mov.k, nm=k[0][1];
      for(var i=0;i<k.length;i++)if(F.fr>=k[i][0]-2)nm=k[i][1];
      return CUADRO_DE[nm]||'guardia';
  }
  return 'guardia';
}
/* un lienzo chico de trabajo: el cuadro recortado en blanco (destello y estela) */
var LIENZO_BL=null;
function silueta(im,c,col){
  if(!LIENZO_BL){LIENZO_BL=document.createElement('canvas');}
  var L2=LIENZO_BL;
  if(L2.width<c[2]||L2.height<c[3]){L2.width=Math.max(L2.width,c[2]);L2.height=Math.max(L2.height,c[3]);}
  var q=L2.getContext('2d');
  q.clearRect(0,0,c[2],c[3]);q.globalCompositeOperation='source-over';
  q.drawImage(im,c[0],c[1],c[2],c[3],0,0,c[2],c[3]);
  q.globalCompositeOperation='source-in';q.fillStyle=col;q.fillRect(0,0,c[2],c[3]);
  q.globalCompositeOperation='source-over';
  return L2;
}
/* si falta un cuadro (hoja c sin llegar), el más parecido */
var CUADRO_RESPALDO={paso1:'guardia',paso2:'guardia',prepGolpe:'guardia',prepPatada:'guardia',levanta:'barrida',volando:'golpeado'};
function cuadroDe(md,nom){return md.f[nom]||md.f[CUADRO_RESPALDO[nom]]||md.f.guardia;}
/* ---------------- las animaciones de 24 cuadros ----------------
   Cada una sale de un video: respirar y caminar son ciclos; los golpes se recorren al ritmo del
   movimiento (cuadro = avance del golpe × 24), así el golpe del dibujo coincide con el del juego. */
var ANIM_PIERNA=/^pat|giro|rodilla/, ANIM_BRAZO=/^(jab|cruz|gancho|cuerpo)$/;
/* qué video es cada especial: en La Parca y Colectivo el "especial" filmado es el segundo */
var ANIM_ESP={parca:['especial2','especial'],colectivo:['especial2','especial']};
function animDe(F){
  var am=ANIM_META&&ANIM_META[F.l], A=am&&am.a;
  if(!A)return null;
  var n=null, p=0, e=F.est, T=function(x){return A[x]?x:null;};
  if(e==='guardia')n=T('idle'),p=(F.t*0.85)%1;
  else if(e==='camina'){n=T('caminar');p=(F.t*1.1)%1;if((F.vx||0)*F.f<0)p=1-p;}
  else if(e==='ataque'&&F.mov){
    var m=F.mov, nm=F.movNom||'';
    if(F.tBusca>0&&F.fr<1){n=T('dash');p=(F.t*1.6)%1;}
    else {
      p=lim(F.fr/m.dur,0,0.999);
      if(m.tipo==='sup'){n=T('super');p=0.3+p*0.7;}
      else if(m.tipo==='esp'){var par=ANIM_ESP[F.l]||['especial','especial2'];n=T(nm===F.L.esp[0].id?par[0]:par[1])||T('especial');}
      else if(nm==='fuerte')n=T('fuerte')||T('golpe');
      else if(nm==='alzada')n=T('alzada');
      else if(nm==='barrida'||nm==='patBaja')n=T('barrida');
      else if(/^aerea|azote/.test(nm)){n=T('aereo');if(nm==='azote')p=0.5+p*0.5;}
      else if(ANIM_PIERNA.test(nm))n=T('patada');
      else if(ANIM_BRAZO.test(nm))n=T('golpe');
    }
  }
  else if(e==='salto'||e==='entra'){n=T('salto');p=lim(0.22+0.56*((F.vy||0)+720)/1440,0.05,0.95);}
  else if(e==='bloqueo'){n=T('bloqueo');p=Math.min(0.5,0.08+F.tEst*2.2)+(F.tEst>0.2?Math.sin(F.t*6)*0.03:0);}
  else if(e==='dash'){n=T('dash');p=(F.tEst/0.26*0.6)%1;}
  else if(e==='dashAtras'){n=T('atras');p=lim(F.tEst/0.3,0,0.999);}
  else if(e==='golpeado'){n=T('golpeado');p=lim(F.tEst/0.5,0,0.999);}
  else if(e==='aireG'&&!F.enSuelo){n=T('volando');p=lim(F.tEst/0.9*0.72,0,0.72);}
  else if(e==='caido'||(e==='ko'&&F.enSuelo)||(e==='aireG'&&F.enSuelo)){n=T('caida');p=lim(0.55+F.tEst/0.4*0.45,0,0.999);}
  else if(e==='levanta'){n=T('levanta');p=lim(F.tEst/0.35,0,0.999);}
  else if(e==='victoria'){n=T('victoria');p=lim(F.tEst/1.4,0,0.999);}
  else if(e==='super'){n=T('super');p=lim(F.tEst/1.1*0.3,0,0.3);}
  else if(e==='rafaga'){n=T('super');p=0.3+0.65*((F.rafaga.t*1.3)%1);}
  if(!n)return null;
  var im=imgAnim(F.l);if(!im)return null;
  var f=A[n][Math.min(23,Math.floor(lim(p,0,0.999)*24))];if(!f)return null;
  /* al formato de los cuadros sueltos: [x,y,w,h,anclaX,anclaY] */
  return {im:im,c:[f[0],f[1],f[2],f[3],-f[4],-f[5]],alto:am.alto,nom:n};
}
function dibujarSprite(g,F,t,escala){
  var md=SPR_META&&SPR_META[F.l], im=IMG['sprites-'+F.l];
  if(!md||!im)return false;
  var L=LUCH[F.l], nom=cuadroSprite(F), c=cuadroDe(md,nom), ahora=Date.now();
  var an=animDe(F), altoRef=md.alto;
  if(an){im=an.im;c=an.c;altoRef=an.alto;nom='anim:'+an.nom;}
  var S=F.spr||(F.spr={nom:nom,ant:null,tCambio:0,suelo:F.enSuelo,tSuelo:0,tAire:0,estela:[],tEst:0});
  if(S.nom!==nom){S.ant=S.nom;S.nom=nom;S.tCambio=ahora;}
  if(F.enSuelo&&!S.suelo)S.tSuelo=ahora;           /* cae: se aplasta */
  if(!F.enSuelo&&S.suelo)S.tAire=ahora;            /* salta: se estira */
  S.suelo=F.enSuelo;
  /* la guardia pintada mide lo que el títere parado: 142 unidades por la altura del luchador */
  var k=142*L.alto*TAM/altoRef*(escala||1), sx=1, sy=1, dy=0, dx=0, rot=0;
  if(nom==='guardia'&&F.est!=='camina')sy=1+Math.sin(F.t*3.2)*0.012;   /* respira */
  if(F.est==='camina'&&!an)dy=-Math.abs(Math.sin(F.t*9))*3;
  if(F.l==='parca'&&F.enSuelo&&nom!=='caido')dy-=5+Math.sin(t*2.5)*3;
  var dC=(ahora-S.tCambio)/1000;
  /* el cuadro de golpe entra con un tirón hacia adelante: estira y avanza, después asienta */
  if(!an&&dC<0.1&&/golpe|patada|especial|alzada|barrida/.test(nom)){var kp=1-dC/0.1;sx*=1+0.1*kp;sy*=1-0.04*kp;dx+=10*kp;}
  var dS=(ahora-S.tSuelo)/1000; if(dS<0.14){var ka=1-dS/0.14;sx*=1+0.12*ka;sy*=1-0.14*ka;}
  var dA=(ahora-S.tAire)/1000; if(!F.enSuelo&&dA<0.16){var kz=1-dA/0.16;sx*=1-0.06*kz;sy*=1+0.1*kz;}
  if(nom==='golpeado'||nom==='anim:golpeado'){var kg=Math.max(0,1-F.tEst/0.25);rot=-0.14*kg;dx-=6*kg;}
  if(!an&&(nom==='volando'||F.est==='aireG'))rot=lim(-(F.vy||0)/1400,-0.45,0.45);
  if(!an&&F.est==='salto'&&nom==='salto')rot=lim((F.vx||0)*F.f/3000,-0.12,0.12);
  if(!an&&F.est==='dash')rot=0.08;
  /* durante el congelado del golpe, el que lo recibe tiembla */
  if(FX.congelado>0&&(F.est==='golpeado'||F.est==='aireG'))dx+=(az()-0.5)*7;
  /* la estela: copias que se apagan detrás en los movimientos rápidos */
  var rapido=F.est==='dash'||F.est==='super'||F.est==='rafaga'||(F.est==='ataque'&&F.mov&&(F.mov.tipo==='esp'||F.mov.tipo==='sup'))||(F.est==='aireG'&&F.combo>2);
  S.tEst+=1;
  if(rapido&&S.tEst%2===0)S.estela.push({c:c,im:im,k:k,x:F.x,y:F.y+dy,f:F.f,sx:sx,sy:sy,rot:rot,t:ahora});
  while(S.estela.length&&(S.estela.length>6||ahora-S.estela[0].t>220))S.estela.shift();
  var colE=F.mov&&F.mov.color?F.mov.color:(ELEM[F.elem]?ELEM[F.elem].col:'255,255,255');
  g.save();
  if(F.enSuelo){g.fillStyle='rgba(0,0,0,0.3)';g.beginPath();g.ellipse(F.x,F.y,34*L.alto*L.grosor,6,0,0,TAU);g.fill();}
  else{var alt=Math.max(0,ESC.suelo-F.y);g.fillStyle='rgba(0,0,0,'+(0.28*Math.max(0.2,1-alt/300)).toFixed(3)+')';
    g.beginPath();g.ellipse(F.x,ESC.suelo,30*L.alto*L.grosor*Math.max(0.4,1-alt/400),5,0,0,TAU);g.fill();}
  for(var e=0;e<S.estela.length;e++){
    var q=S.estela[e], ae=(1-(ahora-q.t)/220)*0.32;
    if(ae<=0)continue;
    var bl=silueta(q.im,q.c,'rgb('+colE+')');
    g.save();g.globalAlpha=ae;g.globalCompositeOperation='lighter';
    g.translate(q.x,q.y);g.rotate(q.rot*q.f);g.scale(q.f*q.k*q.sx,q.k*q.sy);
    g.drawImage(bl,0,0,q.c[2],q.c[3],-q.c[4],-(q.c[5]||q.c[3]),q.c[2],q.c[3]);g.restore();
  }
  g.translate(F.x+dx*F.f,F.y+dy);
  g.rotate(rot*F.f);
  g.scale(F.f*k*sx,k*sy);
  /* el cuadro anterior se funde debajo un instante: el cambio no es un salto seco */
  if(!an&&S.ant&&S.ant.indexOf('anim:')<0&&dC<0.07){var ca=cuadroDe(md,S.ant);g.globalAlpha=0.55*(1-dC/0.07);
    g.drawImage(im,ca[0],ca[1],ca[2],ca[3],-ca[4],-(ca[5]||ca[3]),ca[2],ca[3]);g.globalAlpha=1;}
  g.drawImage(im,c[0],c[1],c[2],c[3],-c[4],-(c[5]||c[3]),c[2],c[3]);
  /* el destello blanco del que recibe el golpe */
  var dB=F.tBlanco?(ahora-F.tBlanco)/1000:9;
  if(dB<0.12){g.globalAlpha=0.85*(1-dB/0.12);g.drawImage(silueta(im,c,'#ffffff'),0,0,c[2],c[3],-c[4],-(c[5]||c[3]),c[2],c[3]);}
  g.restore();
  return true;
}

/* un cuadro suelto, fuera de la pelea (menú): pies en (x,y), mirando f, con el alto pedido en unidades */
function cuadroSuelto(g,id,nom,x,y,f,alto,alfa,blanco){
  var md=SPR_META&&SPR_META[id], im=IMG['sprites-'+id];
  if(!md||!im)return false;
  var c=cuadroDe(md,nom), k=alto/md.alto*LUCH[id].alto;
  g.save();g.globalAlpha=alfa===undefined?1:alfa;g.translate(x,y);g.scale(f*k,k);
  g.drawImage(im,c[0],c[1],c[2],c[3],-c[4],-(c[5]||c[3]),c[2],c[3]);
  if(blanco>0){g.globalAlpha*=blanco;g.drawImage(silueta(im,c,'#ffffff'),0,0,c[2],c[3],-c[4],-(c[5]||c[3]),c[2],c[3]);}
  g.restore();
  return true;
}

/* un cuadro de una animación de 24, fuera de la pelea; si el atlas no llegó, el cuadro suelto */
function cuadroAnimSuelto(g,id,anim,p,x,y,f,alto,alfa,blanco,respaldo){
  var am=ANIM_META&&ANIM_META[id], A=am&&am.a, im=A&&A[anim]?imgAnim(id):null;
  if(!im)return cuadroSuelto(g,id,respaldo||'guardia',x,y,f,alto,alfa,blanco);
  var q=A[anim][Math.min(23,Math.floor(lim(p,0,0.999)*24))], c=[q[0],q[1],q[2],q[3],-q[4],-q[5]], k=alto/am.alto*LUCH[id].alto;
  g.save();g.globalAlpha=alfa===undefined?1:alfa;g.translate(x,y);g.scale(f*k,k);
  g.drawImage(im,c[0],c[1],c[2],c[3],-c[4],-c[5],c[2],c[3]);
  if(blanco>0){g.globalAlpha*=blanco;g.drawImage(silueta(im,c,'#ffffff'),0,0,c[2],c[3],-c[4],-c[5],c[2],c[3]);}
  g.restore();
  return true;
}
