
/* ---------------- los assets: retratos, escenarios y el cofre, de Rezona ----------------
   Vienen por streaming desde jsDelivr (window.ARCHIVOS trae la URL de cada uno; en las versiones
   viejas traía el data: entero). El juego anda igual mientras llegan: se dibujan marcos y siluetas. */
function esImagen(v){return typeof v==='string'&&(v.indexOf('data:image')===0||/\.(avif|webp|png|jpe?g)(\?|$)/.test(v));}
function nuevaImg(src,listo){var im=new Image();if(src.indexOf('data:')!==0)im.crossOrigin='anonymous';im.onload=function(){listo(im);};im.src=src;return im;}
var IMG={};
/* los atlas de animación se decodifican sólo para los que están en escena, y se sueltan después:
   decodificados los doce no entran en la memoria de un teléfono */
var ANIM_META=null, ANIM_CARGA={};
function imgAnim(id){
  var n='anim-'+id;
  if(IMG[n])return IMG[n];
  var A=window.ARCHIVOS||{};
  if(!ANIM_CARGA[n]&&A[n]){ANIM_CARGA[n]=true;nuevaImg(A[n],function(im){if(ANIM_CARGA[n])IMG[n]=im;});}
  return null;
}
function soltarAnims(quedan){
  for(var n in ANIM_CARGA){var id=n.slice(5);if(quedan.indexOf(id)<0){delete ANIM_CARGA[n];if(IMG[n]){IMG[n].src='';delete IMG[n];}}}
}
function cargarAssets(){
  var A=window.ARCHIVOS||{};
  if(A.sprites&&typeof A.sprites==='object')SPR_META=A.sprites;     /* los cuadros de cada atlas */
  if(A.anim&&typeof A.anim==='object')ANIM_META=A.anim;              /* las animaciones de 24 cuadros */
  Object.keys(A).forEach(function(n){
    if(!esImagen(A[n]))return;
    if(n.indexOf('anim-')===0)return;       /* pesan mucho: se bajan y decodifican cuando el luchador entra */
    nuevaImg(A[n],function(im){IMG[n]=im;});
  });
}
/* el retrato recortado en círculo (o el rectángulo de una carta), mirando hacia donde toca */
function retrato(g,l,x,y,w,h,espejo,circulo,enfoque,sinFondo){
  var im=IMG['retrato-'+l];
  g.save();
  g.beginPath();if(circulo)g.arc(x+w/2,y+h/2,w/2,0,TAU);else g.rect(x,y,w,h);g.clip();
  if(!sinFondo){g.fillStyle='#1a1426';g.fillRect(x,y,w,h);}
  if(im){
    /* se encuadra la parte de arriba: la cara, no las botas */
    var e=enfoque||0.28, sc=Math.max(w/im.width,h/im.height)*(circulo?1.7:1.05);
    var dw=im.width*sc, dh=im.height*sc, dx=x+(w-dw)/2, dy=y-dh*e*(circulo?1:0.35)+(circulo?h*0.1:0);
    if(espejo){g.translate(x*2+w,0);g.scale(-1,1);}
    g.drawImage(im,dx,dy,dw,dh);
  } else {
    var L=LUCH[l];g.fillStyle=L.ropa;g.beginPath();g.arc(x+w/2,y+h*0.9,w*0.45,Math.PI,0);g.fill();
    g.fillStyle=L.piel;g.beginPath();g.arc(x+w/2,y+h*0.45,w*0.22,0,TAU);g.fill();
  }
  g.restore();
}

/* ---------------- el escenario ---------------- */
function dibujarEscenario(g,t){
  var im=IMG['escenario-'+M.esc], y0=ESC.y0, h=ESC.h;
  g.save();g.beginPath();g.rect(0,y0,ANCHO,h);g.clip();
  if(im){
    /* apaisado: el fondo tiene que cubrir el ancho con margen para el parallax */
    var ah=Math.max(h/(ESC.suelo-y0+h*0.12)*h*1.02,ANCHO*1.22*im.height/im.width), aw=ah*im.width/im.height;
    var k=(aw-ANCHO)/(MUNDO_W-ANCHO);            /* parallax: el fondo recorre su ancho mientras la cámara recorre el mundo */
    var x=-(M.cam-ANCHO/2)*k;
    g.drawImage(im,x,y0+h-ah,aw,ah);
  } else {
    g.fillStyle=lin(g,0,y0,0,y0+h,[[0,'#241a3a'],[1,'#0e0a18']]);g.fillRect(0,y0,ANCHO,h);
    g.fillStyle='#2a2234';g.fillRect(0,ESC.suelo,ANCHO,h);
  }
  /* viñeta y un poco de oscuridad para que los luchadores se lean */
  g.fillStyle=lin(g,0,y0,0,y0+h,[[0,'rgba(8,4,14,0.45)'],[0.4,'rgba(8,4,14,0.05)'],[0.85,'rgba(8,4,14,0.15)'],[1,'rgba(8,4,14,0.6)']]);
  g.fillRect(0,y0,ANCHO,h);
  g.restore();
}
function dibujarProy(g,p,t){
  if(p.espera&&p.t<p.espera){
    if(p.tipo==='pilar'||p.rayo){g.save();g.globalAlpha=0.5+0.5*Math.sin(t*30);g.fillStyle=p.rayo?'rgba(140,230,255,0.6)':'rgba(255,140,40,0.6)';
      g.beginPath();g.ellipse(p.x,ESC.suelo,34,7,0,0,TAU);g.fill();g.restore();}
    return;
  }
  g.save();
  switch(p.tipo){
    case 'aire':
      g.globalCompositeOperation='lighter';
      for(var i=0;i<3;i++){g.strokeStyle='rgba(220,240,255,'+(0.5-i*0.12)+')';g.lineWidth=5-i;g.beginPath();g.arc(p.x-Math.sign(p.vx)*i*12,p.y,p.r-i*5,t*8+i,t*8+i+4.2);g.stroke();}
      break;
    case 'fuego': case 'lluviaFuego':
      g.globalCompositeOperation='lighter';
      var tr=p.tipo==='fuego'?-Math.sign(p.vx):0, tv=p.tipo==='lluviaFuego'?-1:0;
      for(var j=0;j<5;j++){g.fillStyle='rgba(255,'+(160-j*20)+',40,'+(0.5-j*0.08)+')';g.beginPath();g.arc(p.x+tr*j*9,p.y+tv*j*10,p.r*(1-j*0.12),0,TAU);g.fill();}
      g.fillStyle='rgba(255,250,220,1)';g.beginPath();g.arc(p.x,p.y,p.r*0.45,0,TAU);g.fill();
      break;
    case 'pilar':
      var k=Math.min(1,(p.t-p.espera)/0.15), hP=200*k;
      g.globalCompositeOperation='lighter';
      g.fillStyle=lin(g,0,ESC.suelo-hP,0,ESC.suelo,[[0,'rgba(255,80,0,0)'],[0.4,'rgba(255,150,40,0.8)'],[1,'rgba(255,240,180,0.95)']]);
      g.beginPath();g.moveTo(p.x-26,ESC.suelo);g.quadraticCurveTo(p.x-18+Math.sin(t*30)*5,ESC.suelo-hP*0.6,p.x,ESC.suelo-hP);
      g.quadraticCurveTo(p.x+18+Math.sin(t*27)*5,ESC.suelo-hP*0.6,p.x+26,ESC.suelo);g.fill();
      break;
    case 'bolas':
      for(var b=0;b<2;b++){var an=t*20+b*Math.PI, bx=p.x+Math.cos(an)*14, by=p.y+Math.sin(an)*8;
        g.strokeStyle='#6b4a2a';g.lineWidth=2;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(bx,by);g.stroke();
        g.strokeStyle=TINTA;g.lineWidth=2.5;circ(g,bx,by,6,'#bfe9ff');
        g.globalCompositeOperation='lighter';g.fillStyle=rad(g,bx,by,1,16,[[0,'rgba(160,240,255,0.9)'],[1,'rgba(60,160,255,0)']]);g.beginPath();g.arc(bx,by,16,0,TAU);g.fill();g.globalCompositeOperation='source-over';}
      break;
    case 'anzuelo':
      var D=p.dueño, mx=D.x+D.f*30, my=D.y-100*D.L.alto*TAM;
      g.fillStyle='#9a9aa6';for(var c=1;c<14;c++){var q=lerpP({x:mx,y:my},p,c/14);g.beginPath();g.arc(q.x,q.y,2,0,TAU);g.fill();}
      g.strokeStyle=TINTA;g.lineWidth=6;g.beginPath();g.arc(p.x,p.y+6,9,-Math.PI*0.5,Math.PI*0.9);g.stroke();
      g.strokeStyle='#8c6a4a';g.lineWidth=3;g.beginPath();g.arc(p.x,p.y+6,9,-Math.PI*0.5,Math.PI*0.9);g.stroke();
      break;
    case 'peces':
      g.globalCompositeOperation='lighter';
      for(var f=0;f<5;f++){var fx=p.x+Math.sin(t*6+f*1.7)*16-f*Math.sign(p.vx)*10, fy=p.y+Math.cos(t*5+f)*18;
        g.fillStyle='rgba(120,255,230,0.55)';g.beginPath();g.ellipse(fx,fy,10,5,0,0,TAU);g.fill();
        g.beginPath();g.moveTo(fx-Math.sign(p.vx)*8,fy);g.lineTo(fx-Math.sign(p.vx)*16,fy-6);g.lineTo(fx-Math.sign(p.vx)*16,fy+6);g.fill();}
      break;
    case 'bondi':
      g.translate(p.x,p.y);g.scale(Math.sign(p.vx)*1.4,1.4);g.lineJoin='round';dron(g,0,0,1,t);
      break;
    case 'palma':           /* una mano abierta de energía dorada */
      g.globalCompositeOperation='lighter';
      g.fillStyle=rad(g,p.x,p.y,2,p.r*1.6,[[0,'rgba(255,250,210,0.95)'],[0.4,'rgba(255,210,80,0.6)'],[1,'rgba(255,160,40,0)']]);
      g.beginPath();g.arc(p.x,p.y,p.r*1.6,0,TAU);g.fill();
      g.fillStyle='rgba(255,240,180,0.85)';
      for(var dd=0;dd<4;dd++){g.beginPath();g.ellipse(p.x+Math.sign(p.vx)*p.r*0.9,p.y-p.r*0.6+dd*p.r*0.4,p.r*0.45,p.r*0.13,0,0,TAU);g.fill();}
      g.beginPath();g.ellipse(p.x,p.y,p.r*0.7,p.r*0.8,0,0,TAU);g.fill();
      break;
    case 'arpon':
      var Da=p.dueño, hx=Da.x+Da.f*40, hy=Da.y-100*Da.L.alto*TAM;
      g.strokeStyle='#c9b48a';g.lineWidth=2;g.beginPath();g.moveTo(hx,hy);g.quadraticCurveTo((hx+p.x)/2,Math.max(hy,p.y)+10,p.x,p.y);g.stroke();
      g.save();g.translate(p.x,p.y);g.scale(Math.sign(p.vx),1);g.fillStyle='#9aa3b2';g.strokeStyle=TINTA;g.lineWidth=2;
      g.fillRect(-18,-2,18,4);g.beginPath();g.moveTo(0,-7);g.lineTo(12,0);g.lineTo(0,7);g.closePath();g.fill();g.stroke();g.restore();
      break;
    case 'mina':
      var km=p.t<p.espera?(p.t/p.espera):1;
      if(p.t<p.espera){g.fillStyle='#3a3a44';g.strokeStyle=TINTA;g.lineWidth=2.5;g.beginPath();g.arc(p.x,ESC.suelo-10,12,0,TAU);g.fill();g.stroke();
        for(var pu=0;pu<6;pu++){var ap=pu/6*TAU;g.beginPath();g.moveTo(p.x+Math.cos(ap)*12,ESC.suelo-10+Math.sin(ap)*12);g.lineTo(p.x+Math.cos(ap)*17,ESC.suelo-10+Math.sin(ap)*17);g.stroke();}
        g.fillStyle=Math.floor(p.t*12)%2?'#ff3a2a':'#5a1010';g.beginPath();g.arc(p.x,ESC.suelo-18,3,0,TAU);g.fill();}
      else{g.globalCompositeOperation='lighter';var re=lim((p.t-p.espera)/0.4,0,1), ex=ESC.suelo-30, ra=20+50*Math.min(1,re*2.5), al=1-re;
        g.fillStyle='rgba(255,90,20,'+(0.45*al)+')';g.beginPath();g.arc(p.x,ex,ra,0,TAU);g.fill();
        g.fillStyle='rgba(255,190,60,'+(0.55*al)+')';g.beginPath();g.arc(p.x,ex,ra*0.62,0,TAU);g.fill();
        g.fillStyle='rgba(255,250,220,'+(0.7*al)+')';g.beginPath();g.arc(p.x,ex,ra*0.3,0,TAU);g.fill();}
      break;
    case 'aullido':         /* ondas de sonido que se abren */
      g.globalCompositeOperation='lighter';
      for(var w=0;w<4;w++){var rr=p.r*(0.4+w*0.25)+Math.sin(t*20+w)*3;g.strokeStyle='rgba(255,200,110,'+(0.6-w*0.12)+')';g.lineWidth=4-w*0.6;
        g.beginPath();g.arc(p.x-Math.sign(p.vx)*w*10,p.y,rr,Math.sign(p.vx)>0?-1.1:Math.PI-1.1,Math.sign(p.vx)>0?1.1:Math.PI+1.1);g.stroke();}
      break;
    case 'bocha': case 'lluviaBochas':
      g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,255,255,0.25)';
      for(var tb=1;tb<5;tb++){g.beginPath();g.arc(p.x-(p.tipo==='bocha'?Math.sign(p.vx)*tb*8:0),p.y-(p.tipo==='bocha'?0:tb*9),p.r*(1-tb*0.15),0,TAU);g.fill();}
      g.globalCompositeOperation='source-over';g.strokeStyle=TINTA;g.lineWidth=2;circ(g,p.x,p.y,p.r*0.8,'#f6f6fa');
      g.strokeStyle='rgba(200,40,40,0.7)';g.beginPath();g.arc(p.x,p.y,p.r*0.5,t*10,t*10+2);g.stroke();
      break;
    case 'torpedo':
      g.save();g.translate(p.x,p.y);g.scale(Math.sign(p.vx),1);
      g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,160,60,0.5)';for(var bu=1;bu<6;bu++){g.beginPath();g.arc(-50-bu*12,Math.sin(t*20+bu)*6,10-bu,0,TAU);g.fill();}
      g.globalCompositeOperation='source-over';g.strokeStyle=TINTA;g.lineWidth=3;
      g.fillStyle='#5a6070';redondo(g,-50,-14,90,28,14);g.fill();g.stroke();
      g.fillStyle='#e8732a';g.fillRect(-10,-14,8,28);g.strokeRect(-10,-14,8,28);
      g.fillStyle='#3a3a44';g.beginPath();g.moveTo(-50,-4);g.lineTo(-64,-16);g.lineTo(-64,16);g.lineTo(-50,4);g.closePath();g.fill();g.stroke();
      g.restore();
      break;
    case 'colectivos':
      g.translate(p.x,p.y);g.scale(Math.sign(p.vx)*3.2,3.2);g.lineJoin='round';dron(g,0,0,1,t);
      break;
    case 'vapor':
      g.globalCompositeOperation='lighter';
      for(var v=0;v<7;v++){g.fillStyle='rgba(230,240,255,'+(0.18-v*0.015)+')';g.beginPath();g.arc(p.x-Math.sign(p.vx)*v*18,p.y+Math.sin(t*6+v)*20,p.r*(1-v*0.08),0,TAU);g.fill();}
      break;
    case 'rayos':
      var yT=ESC.y0, pts=[{x:p.x,y:yT}];for(var r=1;r<8;r++)pts.push({x:p.x+(az()-0.5)*30,y:yT+(ESC.suelo-yT)*r/8});pts.push({x:p.x,y:ESC.suelo});
      g.globalCompositeOperation='lighter';
      [[10,'rgba(120,200,255,0.35)'],[4,'rgba(200,240,255,0.9)'],[1.5,'#ffffff']].forEach(function(s){g.strokeStyle=s[1];g.lineWidth=s[0];g.beginPath();pts.forEach(function(q,i){g[i?'lineTo':'moveTo'](q.x,q.y);});g.stroke();});
      break;
    case 'ola':
      g.fillStyle='rgba(60,190,190,0.55)';g.strokeStyle='rgba(220,255,250,0.8)';g.lineWidth=3;
      g.beginPath();g.moveTo(p.x-90*Math.sign(p.vx),ESC.suelo);
      for(var o=0;o<=10;o++){var ox=p.x-90*Math.sign(p.vx)+o*18*Math.sign(p.vx);g.lineTo(ox,ESC.suelo-40-Math.sin(o*0.7+t*10)*14-(o>6?(10-o)*6:o*6));}
      g.lineTo(p.x+90*Math.sign(p.vx),ESC.suelo);g.closePath();g.fill();g.stroke();
      break;
  }
  g.restore();
}
function dibujarPelea(g,t){
  dibujarEscenario(g,t);
  g.save();
  g.beginPath();g.rect(0,ESC.y0,ANCHO,ESC.h);g.clip();
  g.translate(ANCHO/2-M.cam,0);
  /* el golpe fuerte acerca la cámara sobre el impacto y vuelve */
  if(FX.zoom){var z=FX.zoom, kz=1+(z.k-1)*Math.sin(Math.min(1,z.t/z.tm)*Math.PI);
    g.translate(z.x,z.y);g.scale(kz,kz);g.translate(-z.x,-z.y);}
  /* el que está atacando va adelante */
  var a=M.act[0], b=M.act[1], orden2=b.golpeando&&!a.golpeando?[a,b]:[b,a];
  orden2.forEach(function(F){
    if(F.inv>0&&F.est==='entra'&&Math.floor(t*20)%2)return;
    dibujarTitere(g,F,t);
    if(F.est==='bloqueo'){g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(140,210,255,0.5)';g.lineWidth=3;
      g.beginPath();g.arc(F.x+F.f*18,F.y-90*F.L.alto*TAM,46,-1.2,1.2);g.stroke();g.restore();}
    if(F.quema>0){g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,120,30,0.25)';g.beginPath();g.ellipse(F.x,F.y-70,30,70,0,0,TAU);g.fill();g.restore();}
  });
  for(var i=0;i<M.proy.length;i++)dibujarProy(g,M.proy[i],t);
  FX.dibujar(g);
  g.restore();
  if(FX.vel>0)lineasVelocidad(g,Math.min(1,FX.vel*2.5),t);
  /* el marco del escenario: fileteado dorado */
  marcoFilete(g,2,ESC.y0-2,ANCHO-4,ESC.h+4,t,true);
}

/* ---------------- el HUD de la pelea (apaisado) ----------------
   Arriba y fino, sobre el escenario: retrato, barra de vida con rastro, nombre y reservas a
   cada lado; el reloj en un medallón al medio, con las rondas a los costados y la pausa abajo. */
function barraVida(g,x,y,w,h,f,fr,der,t){
  var inc=10;
  var forma=function(){g.beginPath();
    if(der){g.moveTo(x,y);g.lineTo(x+w,y);g.lineTo(x+w,y+h);g.lineTo(x+inc,y+h);}
    else{g.moveTo(x,y);g.lineTo(x+w,y);g.lineTo(x+w-inc,y+h);g.lineTo(x,y+h);}
    g.closePath();};
  g.save();
  g.fillStyle='rgba(0,0,0,0.7)';forma();g.fill();
  forma();g.clip();
  var d1=der?x+w*(1-fr):x;g.fillStyle='rgba(255,90,70,0.9)';g.fillRect(d1,y,w*fr,h);
  var d2=der?x+w*(1-f):x;
  g.fillStyle=lin(g,0,y,0,y+h,f>0.3?[[0,'#fff29a'],[0.5,'#ffc93a'],[1,'#d97a0a']]:[[0,'#ff9a8a'],[1,'#b01e1e']]);g.fillRect(d2,y,w*f,h);
  g.fillStyle='rgba(255,255,255,0.35)';g.fillRect(d2,y,w*f,h*0.3);
  /* el brillo que recorre la barra cuando queda poca vida */
  if(f<0.3&&f>0){var bt=(t*1.2)%1;g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,120,100,0.4)';g.fillRect(d2+(der?w*f*(1-bt):w*f*bt)-12,y,24,h);}
  g.restore();
  g.strokeStyle='#e8c46a';g.lineWidth=2;forma();g.stroke();
  g.strokeStyle='rgba(0,0,0,0.6)';g.lineWidth=1;forma();g.stroke();
}
function hudLado(g,lado,t){
  var F=M.act[lado], der=lado===1, s=der?-1:1;
  var cx=der?ANCHO-38:38, cy=36;
  /* el retrato, con el aro del color de su elemento */
  g.save();
  g.fillStyle='rgba(10,8,20,0.92)';g.beginPath();g.arc(cx,cy,28,0,TAU);g.fill();
  retrato(g,F.l,cx-26,cy-26,52,52,der,true);
  g.strokeStyle='rgb('+ELEM[F.elem].col+')';g.lineWidth=3;g.beginPath();g.arc(cx,cy,27,0,TAU);g.stroke();
  g.strokeStyle='#e8c46a';g.lineWidth=1.5;g.beginPath();g.arc(cx,cy,30.5,0,TAU);g.stroke();
  g.restore();
  /* la barra de vida */
  var bx0=der?ANCHO/2+42:74, bw=ANCHO/2-42-74;
  barraVida(g,bx0,16,bw,18,F.vida/F.vidaMax,F.rastro/F.vidaMax,der,t);
  /* el nombre y la carta */
  var nx=der?bx0+bw:bx0;
  texto(g,F.L.nom+(F.jefe?' ★':''),nx+s*2,46,12,'#fff3d4',der?'right':'left');
  g.save();g.font='bold 12px Georgia, serif';var anchoNom=g.measureText(F.L.nom+(F.jefe?' ★':'')).width;g.restore();
  texto(g,F.C.nom,nx+s*(anchoNom+10),46,9,'#b9a67a',der?'right':'left',false);
  /* elemento, junto al retrato */
  g.fillStyle='rgb('+ELEM[F.elem].col+')';g.beginPath();g.arc(cx+s*22,cy+22,6,0,TAU);g.fill();
  g.strokeStyle=TINTA;g.lineWidth=1.5;g.stroke();
  /* los de reserva, chiquitos, abajo del nombre */
  var eq=M.eq[lado];
  for(var i=0,k=0;i<eq.length;i++){
    if(eq[i]===F)continue;
    var rx=nx+s*(11+k*25), ry=64;k++;
    g.save();g.globalAlpha=eq[i].ko?0.35:1;
    g.fillStyle='rgba(10,8,20,0.9)';g.beginPath();g.arc(rx,ry,11,0,TAU);g.fill();
    retrato(g,eq[i].l,rx-10,ry-10,20,20,der,true);
    g.strokeStyle='#e8c46a';g.lineWidth=1.2;g.beginPath();g.arc(rx,ry,11,0,TAU);g.stroke();
    if(eq[i].ko){g.strokeStyle='#ff4a5a';g.lineWidth=2.5;g.beginPath();g.moveTo(rx-7,ry-7);g.lineTo(rx+7,ry+7);g.moveTo(rx+7,ry-7);g.lineTo(rx-7,ry+7);g.stroke();}
    g.restore();
  }
}
function dibujarHUDPelea(g,t){
  /* una penumbra arriba para que el HUD se lea sobre cualquier fondo */
  g.fillStyle=lin(g,0,0,0,86,[[0,'rgba(8,4,14,0.75)'],[1,'rgba(8,4,14,0)']]);g.fillRect(0,0,ANCHO,86);
  hudLado(g,0,t);hudLado(g,1,t);
  /* el reloj en su medallón */
  var s=Math.max(0,Math.ceil(M.reloj));
  g.save();g.translate(ANCHO/2,30);
  g.fillStyle=rad(g,0,-6,2,28,[[0,'#2a2040'],[1,'#0c0816']]);g.beginPath();g.arc(0,0,26,0,TAU);g.fill();
  g.strokeStyle='#e8c46a';g.lineWidth=2.5;g.stroke();
  g.strokeStyle='rgba(232,196,106,0.4)';g.lineWidth=1;g.beginPath();g.arc(0,0,21,0,TAU);g.stroke();
  var lat=s<=10?1+0.08*Math.max(0,Math.sin(t*10)):1;g.scale(lat,lat);
  texto(g,String(s),0,1,s>=100?16:21,s<=10?'#ff7a6a':'#fff3d4');
  g.restore();
  if(M.modo!=='historia'){
    /* las rondas: dos por lado del reloj */
    for(var l=0;l<2;l++)for(var r=0;r<2;r++){
      var rx=l?ANCHO/2+36+r*14:ANCHO/2-36-r*14, on=M.vic[l]>r;
      g.fillStyle=on?'#ffd23a':'rgba(0,0,0,0.6)';g.beginPath();g.arc(rx,48,5,0,TAU);g.fill();
      g.strokeStyle='#e8c46a';g.lineWidth=1.2;g.stroke();
      if(on){g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,220,90,0.4)';g.beginPath();g.arc(rx,48,9,0,TAU);g.fill();g.restore();}
    }
    if(M.modo==='arcade'){
      texto(g,'1P '+numero8(M.puntos),74,80,10,'#ffd23a','left');
      texto(g,'RÉCORD '+numero8(Math.max(M.puntos,Prog.ranking[0].pts)),ANCHO-74,80,10,'#bff0ff','right');
    }
  }
  /* pausa: un botón chico abajo del reloj */
  var ap=UI.apretado==='pausa';
  g.save();g.translate(ANCHO/2,72);if(ap)g.scale(0.9,0.9);
  g.fillStyle='rgba(10,8,20,0.8)';redondo(g,-17,-11,34,22,11);g.fill();
  g.strokeStyle='rgba(232,196,106,0.7)';g.lineWidth=1.2;redondo(g,-17,-11,34,22,11);g.stroke();
  icono(g,'pausa',0,0,11,'#e8c46a');g.restore();
  UI.boton('pausa',ANCHO/2-26,58,52,30,true);
  /* el contador de combo, del lado del que pega */
  if(M.comboVis&&M.comboVis.n>=2){
    var cv=M.comboVis, x=cv.lado?ANCHO-90:90, e=1+Math.min(0.6,cv.n*0.02);
    g.save();g.globalAlpha=Math.min(1,cv.t*2);g.translate(x,140);g.scale(e,e);g.rotate(cv.lado?0.08:-0.08);
    textoArcade(g,String(cv.n),0,0,36,'#ffe36a','#ff5a1a');texto(g,'GOLPES',0,24,11,'#fff3d4');
    g.restore();
  }
}
/* los controles: medidor, especiales, súper, y la guía de gestos */
/* la cinemática del súper: franja diagonal, el retrato entra, el nombre del golpe */
function dibujarCine(g,t){
  var c=M.cine, k=c.t/c.dur, F=c.F;
  g.fillStyle='rgba(0,0,0,'+(0.65*Math.min(1,k*5)).toFixed(3)+')';g.fillRect(0,0,ANCHO,ALTO);
  var ent=Math.min(1,k*4), sal=Math.max(0,(k-0.8)/0.2);
  var yc=ESC.y0+ESC.h*0.5;
  g.save();
  g.translate(0,yc);g.transform(1,-0.18,0,1,0,0);
  g.fillStyle='rgba('+c.col+',0.9)';g.fillRect(-20,-70,ANCHO+40,140);
  g.fillStyle='rgba(255,255,255,0.9)';g.fillRect(-20,-74,ANCHO+40,4);g.fillRect(-20,70,ANCHO+40,4);
  g.restore();
  var px=(F.lado?ANCHO:-260)+(F.lado?-1:1)*ent*300+(F.lado?1:-1)*sal*400;
  retrato(g,F.l,F.lado?px-280:px,yc-150,280,300,F.lado===1,false,0.05,true);
  g.save();g.globalAlpha=1-sal;
  texto(g,c.nom,ANCHO/2+(F.lado?-60:60),yc+96,26,'#ffffff');
  g.restore();
}
/* la presentación: VS con los dos que abren la pelea */
function dibujarIntro(g,t){
  if(M.intro<=1.0||M.modo!=='historia')return;
  var k=(3.0-M.intro)/2.0, ent=Math.min(1,k*3), sal=Math.max(0,(k-0.85)/0.15);
  g.fillStyle='rgba(8,4,14,'+(0.8*(1-sal)).toFixed(3)+')';g.fillRect(0,0,ANCHO,ALTO);
  var a=M.act[0], b=M.act[1], yc=ALTO*0.4;
  g.save();g.globalAlpha=1-sal;
  retrato(g,a.l,-240+ent*240,yc-240,240,260,false,false,0.05,true);
  retrato(g,b.l,ANCHO-ent*240,yc-10,240,260,true,false,0.05,true);
  var e=1+Math.max(0,1-k*4)*2;
  g.save();g.translate(ANCHO/2,yc+10);g.scale(e,e);g.rotate(-0.12);
  texto(g,'VS',0,0,64,'#ffd23a');g.restore();
  texto(g,a.L.nom,20,yc+44,15,'#9fd8ff','left');
  texto(g,b.L.nom,ANCHO-20,yc-24,15,'#ff9d8a','right');
  if(M.pelea.jefe)texto(g,'— PELEA CON EL JEFE DEL BARRIO —',ANCHO/2,yc+300,12,'#ffd23a');
  texto(g,BARRIOS[M.pelea.barrio].nom+' · PELEA '+M.pelea.n,ANCHO/2,yc-270,13,'#f3e6c4');
  g.restore();
}
function dibujarCartel(g,t){
  /* el anuncio del combo largo, del lado del que pega */
  if(M.anuncio){
    var a=M.anuncio, ka=Math.min(1,(1.3-a.t)*6), ea=ka<1?2.2-ka*1.2:1+Math.sin(t*20)*0.03;
    g.save();g.globalAlpha=Math.min(1,a.t*3);g.translate(a.lado===1?ANCHO*0.7:ANCHO*0.3,ESC.y0+ESC.h*0.62);g.scale(ea,ea);g.rotate(a.lado===1?0.08:-0.08);
    textoArcade(g,a.txt,0,0,24,a.col1,a.col2);g.restore();
  }
  /* la cuenta de bonos al ganar una ronda */
  if(M.bonus&&(M.entre>0||M.fin>0)){
    var b=M.bonus, kb=Math.min(1,b.t/0.4), y0=ESC.y0+ESC.h*0.52;
    g.save();g.globalAlpha=kb;
    g.fillStyle='rgba(8,4,14,0.8)';g.fillRect(30,y0-10,ANCHO-60,b.perfecto?116:96);
    marcoFilete(g,30,y0-10,ANCHO-60,b.perfecto?116:96,t,true);
    var filas=[['TIEMPO',b.tiempo],['VIDA',b.vida]];if(b.perfecto)filas.push(['PERFECTO',b.perfecto]);
    filas.forEach(function(q,i){var cuenta=Math.min(1,Math.max(0,(b.t-0.3-i*0.3)/0.5));
      texto(g,q[0],50,y0+14+i*22,13,'#f3e6c4','left');textoArcade(g,numero8(q[1]*cuenta,5),ANCHO-50,y0+14+i*22,15,'#ffffff','#ffd23a','right');});
    textoArcade(g,'1P '+numero8(M.puntos),ANCHO/2,y0+(b.perfecto?92:70),17,'#ffe36a','#ff7a1a');
    g.restore();
  }
  var c=M.cartel;if(!c)return;
  if(c.arcade){
    var durA=c.txt.length>10?2.4:1.4, kk=1-c.t/durA, ee=kk<0.12?3-kk*16.6:1+Math.max(0,0.12-Math.abs(kk-0.2))*1.5;
    var sac=kk<0.25?(0.25-kk)*30:0;
    g.save();g.globalAlpha=Math.min(1,c.t*3);g.translate(ANCHO/2+(az()-0.5)*sac,ESC.y0+ESC.h*0.36+(az()-0.5)*sac);g.scale(ee,ee);g.rotate(-0.07);
    var tam=c.txt.length>9?38:52;
    textoArcade(g,c.txt,0,0,tam,c.col==='#ffffff'?'#ffffff':'#ffe36a',c.col==='#ff6a6a'?'#c0201a':c.col==='#ffffff'?'#7ab8ff':'#ff5a1a');
    g.restore();return;
  }
  var dur=c.chico?1.3:c.txt==='K.O.'?1.6:2.4, k=1-c.t/dur, e=k<0.15?1+(0.15-k)*8:1;
  g.save();g.globalAlpha=Math.min(1,c.t*3);g.translate(ANCHO/2,ESC.y0+ESC.h*0.38);g.scale(e,e);g.rotate(-0.06);
  texto(g,c.txt,0,0,c.chico?22:48,c.col);
  g.restore();
}

/* las líneas de velocidad de historieta: rayos desde el borde hacia el centro del escenario */
function lineasVelocidad(g,k,t){
  var cx=ANCHO/2, cy=ESC.y0+ESC.h*0.5, R=Math.max(ANCHO,ESC.h)*0.75, n=46;
  g.save();g.beginPath();g.rect(0,ESC.y0,ANCHO,ESC.h);g.clip();
  g.fillStyle='rgba(255,255,255,'+(0.55*k).toFixed(3)+')';
  for(var i=0;i<n;i++){
    var sem=(i*7919+Math.floor(t*30)*131)%997/997, a=i/n*TAU+sem*0.12, r0=R*(0.42+sem*0.2), an=0.012+sem*0.018;
    g.beginPath();g.moveTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);
    g.lineTo(cx+Math.cos(a-an)*r0,cy+Math.sin(a-an)*r0);g.lineTo(cx+Math.cos(a+an)*r0,cy+Math.sin(a+an)*r0);g.fill();
  }
  g.restore();
}
