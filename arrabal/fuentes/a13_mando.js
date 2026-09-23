/* ---------------- el mando: cruceta flotante a la izquierda, botones a la derecha ----------------
   Cada cuadro se mira dónde está cada dedo (Entrada.dedos): el que arrancó en la mitad izquierda
   es el palito (su base aparece donde se apoyó); los demás aprietan el botón que tengan debajo,
   y se puede correr el dedo de un botón a otro sin levantarlo. Los golpes salen al APOYAR. */
var Mando={
  palo:null,             /* {id, bx, by, x, y}: el dedo del palito y su base */
  dx:0, dy:0,            /* hacia dónde apunta el palito, -1..1 */
  antes:{}, ahora:{},    /* botones apretados el cuadro anterior y este */
  arribaAntes:false, abajoAntes:false, ultimoLado:0, tLado:0,
  R:58,
  botones:function(){
    var W=ANCHO, H=ALTO;
    return [
      {id:'golpe', x:W-90,  y:H-82,  r:44, nom:'GOLPE',  ic:'puno', col:'#ffd23a'},
      {id:'fuerte',x:W-196, y:H-60,  r:34, nom:'FUERTE', ic:'pie',  col:'#ff8a4a'},
      {id:'esp0',  x:W-186, y:H-150, r:31, nom:'',       ic:'rayo', col:'#8fd3ff'},
      {id:'esp1',  x:W-104, y:H-188, r:31, nom:'',       ic:'rayo', col:'#8fd3ff'},
      {id:'super', x:W-282, y:H-118, r:33, nom:'SÚPER',  ic:'estrella', col:'#ffb0e0'},
      {id:'bloqueo',x:196,  y:H-54,  r:30, nom:'CUBRIR', ic:'escudo', col:'#bff0ff'}
    ];
  },
  reiniciar:function(){this.palo=null;this.dx=this.dy=0;this.antes={};this.ahora={};this.arribaAntes=this.abajoAntes=false;},
  /* se llama una vez por paso de la pelea */
  leer:function(){
    var bs=this.botones(), vivos={}, ahora={};
    for(var k in Entrada.dedos){
      var d=Entrada.dedos[k];vivos[k]=true;
      if(this.palo&&this.palo.id===k)continue;
      /* un dedo nuevo en la mitad izquierda (y no sobre CUBRIR) es el palito */
      var sobreB=null;
      for(var i=0;i<bs.length;i++){var b=bs[i],ex=d.x-b.x,ey=d.y-b.y;if(ex*ex+ey*ey<Math.pow(b.r*1.25,2)){sobreB=b;break;}}
      if(!this.palo&&!d.mando&&!sobreB&&d.x0<ANCHO*0.45&&d.y0>ALTO*0.3){
        this.palo={id:k,bx:lim(d.x0,70,ANCHO*0.4),by:lim(d.y0,ALTO*0.45,ALTO-70)};d.mando=true;continue;
      }
      d.mando=true;
      if(sobreB)ahora[sobreB.id]=true;
    }
    if(this.palo&&!vivos[this.palo.id])this.palo=null;
    if(this.palo){
      var p=Entrada.dedos[this.palo.id], vx=p.x-this.palo.bx, vy=p.y-this.palo.by, L=Math.sqrt(vx*vx+vy*vy), R=this.R;
      /* la base sigue al dedo si se va muy lejos: no hay que volver a buscarla */
      if(L>R*1.4){this.palo.bx=p.x-vx/L*R*1.4;this.palo.by=p.y-vy/L*R*1.4;vx=p.x-this.palo.bx;vy=p.y-this.palo.by;L=R*1.4;}
      this.dx=L>12?lim(vx/R,-1,1):0;this.dy=L>12?lim(vy/R,-1,1):0;
    } else {this.dx=this.dy=0;}
    this.antes=this.ahora;this.ahora=ahora;
  },
  recien:function(id){return !!this.ahora[id]&&!this.antes[id];},
  apretado:function(id){return !!this.ahora[id];}
};
/* las órdenes del mando para el jugador */
function mandoJugador(P,dt){
  var Md=Mando;
  Md.leer();
  if(Md.recien('golpe'))orden(P,'toca');
  if(Md.recien('fuerte'))orden(P,'adelante');
  if(Md.recien('esp0'))orden(P,'esp0');
  if(Md.recien('esp1'))orden(P,'esp1');
  if(Md.recien('super'))orden(P,'super');
  /* el palito: arriba salta (en diagonal si también va de costado), abajo barre, al costado camina.
     Dos toques rápidos hacia un lado: corrida o paso atrás */
  var arriba=Md.dy<-0.55, abajo=Md.dy>0.6, lado=Math.abs(Md.dx)>0.35?(Md.dx>0?1:-1):0;
  if(arriba&&!Md.arribaAntes){
    var libre=P.est==='guardia'||P.est==='camina';
    if(libre&&P.enSuelo&&lado)saltar(P,lado*0.9);else orden(P,'arriba');
  }
  if(abajo&&!Md.abajoAntes)orden(P,'abajo');
  Md.arribaAntes=arriba;Md.abajoAntes=abajo;
  if(lado&&lado!==Md.ultimoLado){
    if(J.t-Md.tLado<0.28&&Md.ladoSoltado===lado)orden(P,(lado===P.f)?'adelante':'atras');
    Md.tLado=J.t;Md.ladoSoltado=0;
  }
  if(!lado&&Md.ultimoLado)Md.ladoSoltado=Md.ultimoLado;
  Md.ultimoLado=lado;
  /* cubrirse: el botón CUBRIR, o tirar el palito para atrás cuando el rival ataca */
  var R=rival(P), atras=lado&&lado!==P.f;
  var amenaza=R&&((R.est==='ataque'&&R.mov&&R.fr<R.mov.act[1]+2)||M.proy.some(function(p){return p.dueño===R;}));
  Entrada.cubre=Md.apretado('bloqueo')||(atras&&amenaza&&P.enSuelo)||!!Entrada.tecla['Space'];
  if(!arriba&&!abajo&&lado&&!Entrada.cubre&&(P.est==='guardia'||P.est==='camina')){
    ponerEstado(P,'camina');P.est='camina';P.vx=lado*150*P.L.vel*(lado===P.f?1:0.8);
  } else if(!lado&&P.est==='camina'&&!Entrada.tecla['ArrowLeft']&&!Entrada.tecla['ArrowRight']&&!Entrada.tecla['KeyA']&&!Entrada.tecla['KeyD'])ponerEstado(P,'guardia');
}
/* ---------------- el dibujo del mando: vidrio oscuro, borde dorado, íconos grandes ---------------- */
function iconoMando(g,ic,s,col){
  g.save();g.fillStyle=col;g.strokeStyle=col;g.lineWidth=s*0.14;g.lineJoin='round';g.lineCap='round';
  if(ic==='puno'){                       /* un puño de frente */
    redondo(g,-s*0.42,-s*0.3,s*0.84,s*0.62,s*0.18);g.fill();
    g.fillStyle='rgba(0,0,0,0.35)';for(var i=1;i<4;i++)g.fillRect(-s*0.42+i*s*0.21,-s*0.3,s*0.03,s*0.3);
    g.fillStyle=col;redondo(g,-s*0.3,s*0.28,s*0.6,s*0.22,s*0.08);g.fill();
  } else if(ic==='pie'){                 /* un puño envuelto en fuego: el golpe fuerte */
    g.globalAlpha=0.9;
    g.beginPath();g.moveTo(-s*0.55,s*0.1);g.quadraticCurveTo(-s*0.35,-s*0.55,-s*0.05,-s*0.2);g.quadraticCurveTo(-s*0.05,-s*0.62,s*0.25,-s*0.5);
    g.quadraticCurveTo(s*0.1,-s*0.2,s*0.55,-s*0.1);g.lineTo(s*0.2,s*0.45);g.lineTo(-s*0.4,s*0.45);g.closePath();g.fill();
    g.globalAlpha=1;g.fillStyle='#1a0e06';
    redondo(g,-s*0.3,-s*0.08,s*0.6,s*0.42,s*0.12);g.fill();
    g.fillStyle=col;redondo(g,-s*0.24,-s*0.03,s*0.48,s*0.32,s*0.1);g.fill();
    g.fillStyle='rgba(0,0,0,0.35)';for(var j=1;j<3;j++)g.fillRect(-s*0.24+j*s*0.16,-s*0.03,s*0.025,s*0.16);
  } else if(ic==='escudo'){
    g.beginPath();g.moveTo(0,-s*0.5);g.lineTo(s*0.42,-s*0.32);g.lineTo(s*0.36,s*0.12);g.quadraticCurveTo(s*0.2,s*0.42,0,s*0.52);
    g.quadraticCurveTo(-s*0.2,s*0.42,-s*0.36,s*0.12);g.lineTo(-s*0.42,-s*0.32);g.closePath();g.fill();
  } else icono(g,ic,0,0,s,col);
  g.restore();
}
function dibujarControles(g,t){
  var P=M.act[0];if(!P)return;
  var bs=Mando.botones();
  g.save();
  /* el palito: la base donde está (o dónde aparece), la perilla donde apunta */
  var bx=Mando.palo?Mando.palo.bx:118, by=Mando.palo?Mando.palo.by:ALTO-104, R=Mando.R;
  g.globalAlpha=Mando.palo?0.9:0.55;
  g.fillStyle='rgba(10,6,20,0.45)';g.beginPath();g.arc(bx,by,R+10,0,TAU);g.fill();
  g.strokeStyle='rgba(216,178,90,0.8)';g.lineWidth=2;g.beginPath();g.arc(bx,by,R+10,0,TAU);g.stroke();
  /* las cuatro flechas */
  [[0,-1],[0,1],[-1,0],[1,0]].forEach(function(v){
    var on=(v[1]<0&&Mando.dy<-0.55)||(v[1]>0&&Mando.dy>0.6)||(v[0]&&Math.sign(Mando.dx)===v[0]&&Math.abs(Mando.dx)>0.35);
    g.save();g.translate(bx+v[0]*R*0.72,by+v[1]*R*0.72);g.rotate(Math.atan2(v[1],v[0]));
    g.fillStyle=on?'#ffe36a':'rgba(243,230,196,0.7)';g.beginPath();g.moveTo(9,0);g.lineTo(-5,-8);g.lineTo(-5,8);g.closePath();g.fill();g.restore();
  });
  var kx=bx+Mando.dx*R*0.8, ky=by+Mando.dy*R*0.8;
  g.fillStyle=rad(g,kx-6,ky-8,2,30,[[0,'#6a5a8a'],[1,'#241a38']]);g.beginPath();g.arc(kx,ky,26,0,TAU);g.fill();
  g.strokeStyle='#d8b25a';g.lineWidth=2.5;g.beginPath();g.arc(kx,ky,26,0,TAU);g.stroke();
  if(!Mando.palo){g.globalAlpha=0.5;texto(g,'MOVER',bx,by+R+22,10,'#d8b25a',null,false);}
  g.globalAlpha=1;
  /* los botones */
  bs.forEach(function(b){
    var ap=Mando.apretado(b.id), listo=true, fr=0, nom=b.nom;
    if(b.id==='esp0'||b.id==='esp1'){var k=b.id==='esp0'?0:1;listo=P.cd[k]<=0;fr=listo?0:P.cd[k]/(P.L.esp[k].cd||1);nom=P.L.esp[k].nom;}
    if(b.id==='super'){listo=P.med>=2;}
    g.save();g.translate(b.x,b.y);var e=ap?0.9:1;g.scale(e,e);
    if(listo&&(b.id==='super'))halo(g,0,0,b.r*2,'255,170,220',0.3+0.2*Math.sin(t*6));
    g.globalAlpha=0.88;
    g.fillStyle=ap?'rgba(255,220,120,0.55)':'rgba(12,8,24,0.62)';g.beginPath();g.arc(0,0,b.r,0,TAU);g.fill();
    if(fr>0){g.fillStyle='rgba(0,0,0,0.55)';g.beginPath();g.moveTo(0,0);g.arc(0,0,b.r,-Math.PI/2,-Math.PI/2+TAU*fr);g.closePath();g.fill();}
    g.globalAlpha=1;
    g.strokeStyle=listo?b.col:'rgba(140,120,90,0.8)';g.lineWidth=ap?4:2.5;g.beginPath();g.arc(0,0,b.r,0,TAU);g.stroke();
    g.strokeStyle='rgba(255,255,255,0.18)';g.lineWidth=1;g.beginPath();g.arc(0,0,b.r-4,Math.PI*1.1,Math.PI*1.9);g.stroke();
    iconoMando(g,b.ic,b.r*0.62,listo?b.col:'#7a6a50');
    if(!listo&&fr>0)texto(g,String(Math.ceil(P.cd[b.id==='esp0'?0:1])),0,1,15,'#fff',null,false);
    g.restore();
    if(nom){var ny=b.y+b.r+9;texto(g,nom.length>13?nom.slice(0,12)+'…':nom,b.x,ny,nom.length>9?7.5:9,listo?'#f3e6c4':'#8a7a5a',null,false);}
  });
  /* el medidor de súper, al lado del botón */
  var sb=bs[4], mw=66, mx=sb.x-mw/2, my=sb.y-sb.r-18;
  for(var i=0;i<3;i++){
    var f=lim(P.med-i,0,1), x=mx+i*(mw/3+1);
    g.fillStyle='rgba(0,0,0,0.6)';g.fillRect(x,my,mw/3-2,7);
    if(f>0){g.fillStyle=f>=1?'#ffb0e0':'#8fd3ff';g.fillRect(x,my,(mw/3-2)*f,7);}
  }
  g.restore();
}
