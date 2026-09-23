
/* ===========================================================================
   INTERFAZ — botones de pelea al apoyar el dedo, de menú al levantarlo sin correrlo
   ========================================================================= */
var UI={rects:[],apretado:null,
  limpiar:function(){this.rects.length=0;},
  boton:function(id,x,y,w,h,inmediato){this.rects.push({id:id,x:x,y:y,w:w,h:h,inm:!!inmediato});},
  bajo:function(x,y,soloInm){
    for(var k=this.rects.length-1;k>=0;k--){var r=this.rects[k];if(soloInm&&!r.inm)continue;
      if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)return r;}
    return null;
  },
  tocado:function(){for(var i=0;i<Entrada.toques.length;i++){var r=this.bajo(Entrada.toques[i].x,Entrada.toques[i].y,true);if(r)return r.id;}return null;},
  soltado:function(){
    var s=Entrada.suelta;
    if(!s||Math.abs(s.dx)>16||Math.abs(s.dy)>16)return null;
    var r=this.bajo(s.x,s.y), r0=this.bajo(s.x0,s.y0);
    return r&&r0&&r.id===r0.id&&!r.inm?r.id:null;
  },
  donde:function(id){for(var i=0;i<this.rects.length;i++)if(this.rects[i].id===id){var r=this.rects[i];return{x:r.x+r.w/2,y:r.y+r.h/2,inm:r.inm};}return null;}
};
function entra(retraso){
  var x=lim((J.tMenu-(retraso||0))/0.42,0,1);
  if(x<=0)return 0;
  var c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);
}
function texto(g,txt,x,y,tam,col,al,borde){
  g.save();
  g.font='bold '+tam+'px Georgia,"Times New Roman",serif';
  g.textAlign=al||'center';g.textBaseline='middle';
  if(borde!==false){g.lineJoin='round';g.lineWidth=Math.max(2,tam*0.17);g.strokeStyle='rgba(10,5,14,0.9)';g.strokeText(txt,x,y);}
  g.fillStyle=col||'#fff';g.fillText(txt,x,y);
  g.restore();
}
function redondo(g,x,y,w,h,r){
  g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);
  g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();
}
/* ---------------- el fileteado porteño: espirales, hojas y bandas de color ----------------
   Se dibuja una vez por tamaño y se guarda: los marcos no cuestan nada por cuadro */
var CACHE_FILETE={};
function voluta(g,x,y,esc,rot,col){
  g.save();g.translate(x,y);g.rotate(rot);g.scale(esc,esc);
  g.lineCap='round';
  /* el tallo que se enrosca */
  g.strokeStyle='#2a1406';g.lineWidth=5;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(18,-2,30,-14,26,-26);g.bezierCurveTo(22,-36,8,-32,10,-22);g.stroke();
  g.strokeStyle=col||'#e8c25a';g.lineWidth=2.6;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(18,-2,30,-14,26,-26);g.bezierCurveTo(22,-36,8,-32,10,-22);g.stroke();
  /* las hojas de acanto */
  var hojas=[[12,-3,0.5,'#c0392b'],[22,-10,1.1,'#1e7a4a'],[27,-20,1.8,'#2a5db0']];
  hojas.forEach(function(h){
    g.save();g.translate(h[0],h[1]);g.rotate(h[2]);
    g.fillStyle=h[3];g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(6,-8,14,-2);g.quadraticCurveTo(7,1,0,0);g.fill();
    g.strokeStyle='#2a1406';g.lineWidth=1.2;g.stroke();
    g.strokeStyle='rgba(255,240,200,0.7)';g.lineWidth=0.8;g.beginPath();g.moveTo(2,-1);g.lineTo(10,-2.5);g.stroke();
    g.restore();
  });
  g.fillStyle='#e8c25a';g.beginPath();g.arc(10,-22,2.2,0,TAU);g.fill();
  g.restore();
}
function marcoFilete(g,x,y,w,h,t,liviano){
  var clave=Math.round(w)+'x'+Math.round(h)+(liviano?'l':'');
  var c=CACHE_FILETE[clave];
  if(!c){
    c=document.createElement('canvas');c.width=Math.ceil(w*2);c.height=Math.ceil(h*2);
    var q=c.getContext('2d');q.scale(2,2);
    q.strokeStyle='#2a1406';q.lineWidth=5;q.strokeRect(3,3,w-6,h-6);
    q.strokeStyle='#d8b25a';q.lineWidth=2.4;q.strokeRect(3,3,w-6,h-6);
    q.strokeStyle='rgba(192,57,43,0.8)';q.lineWidth=1.2;q.strokeRect(7,7,w-14,h-14);
    var e=liviano?0.62:0.9;
    [[8,8,0],[w-8,8,Math.PI/2],[w-8,h-8,Math.PI],[8,h-8,-Math.PI/2]].forEach(function(p){
      voluta(q,p[0],p[1],e,p[2]);voluta(q,p[0],p[1],e,p[2]+Math.PI/2);
      q.save();q.translate(p[0],p[1]);q.scale(e,e);q.fillStyle='#e8c25a';q.strokeStyle='#2a1406';q.lineWidth=1.5;q.beginPath();q.arc(0,0,4.5,0,TAU);q.fill();q.stroke();q.restore();
    });
    CACHE_FILETE[clave]=c;
  }
  g.drawImage(c,x,y,w,h);
}
/* un panel de menú: fondo oscuro con borde de fileteado */
function panel(g,x,y,w,h,t){
  g.fillStyle='rgba(16,10,26,0.9)';redondo(g,x,y,w,h,8);g.fill();
  marcoFilete(g,x,y,w,h,t,true);
}
/* un botón con placa dorada que entra con rebote */
function botonCaja(g,id,x,y,w,h,txt,col,col2,tam,retraso,sub){
  var e=entra(retraso||0);if(e<=0)return;
  var ap=UI.apretado===id, dy=(1-e)*70+(ap?4:0), esc=ap?0.96:1;
  g.save();g.globalAlpha=Math.min(1,e*1.4);
  g.translate(x+w/2,y+h/2+dy);g.scale(esc,esc);g.translate(-w/2,-h/2);
  g.fillStyle='rgba(0,0,0,0.55)';redondo(g,0,6,w,h,10);g.fill();
  g.fillStyle=lin(g,0,0,0,h,[[0,col],[0.55,col],[1,col2]]);redondo(g,0,0,w,h,10);g.fill();
  g.strokeStyle='#2a1406';g.lineWidth=3;redondo(g,0,0,w,h,10);g.stroke();
  g.strokeStyle='rgba(255,240,200,0.75)';g.lineWidth=1.5;redondo(g,3,3,w-6,h-6,8);g.stroke();
  var bt=((J.t*0.45+(retraso||0)*3)%2.6);
  if(bt<1){g.save();redondo(g,0,0,w,h,10);g.clip();g.globalCompositeOperation='lighter';var bx=-40+bt*(w+80);
    g.fillStyle=lin(g,bx-30,0,bx+30,0,[[0,'rgba(255,255,255,0)'],[0.5,'rgba(255,255,255,0.3)'],[1,'rgba(255,255,255,0)']]);
    g.transform(1,0,-0.35,1,0,0);g.fillRect(bx-30,0,60,h);g.restore();}
  if(sub){texto(g,txt,w/2,h/2-8,tam||20,'#2a1406',null,false);texto(g,sub,w/2,h/2+14,11,'rgba(42,20,6,0.8)',null,false);}
  else texto(g,txt,w/2,h/2+1,tam||20,'#2a1406',null,false);
  g.restore();
  UI.boton(id,x,y,w,h);
}
function barra(g,x,y,w,h,f,col,col2){
  g.fillStyle='rgba(0,0,0,0.6)';redondo(g,x,y,w,h,h/2);g.fill();
  if(f>0){g.save();redondo(g,x,y,w,h,h/2);g.clip();g.fillStyle=lin(g,x,y,x,y+h,[[0,col],[1,col2||col]]);g.fillRect(x,y,w*lim(f,0,1),h);
    g.fillStyle='rgba(255,255,255,0.28)';g.fillRect(x,y,w*lim(f,0,1),h*0.42);g.restore();}
  g.strokeStyle='rgba(216,178,90,0.7)';g.lineWidth=1;redondo(g,x,y,w,h,h/2);g.stroke();
}
function icono(g,n,x,y,s,col){
  g.save();g.translate(x,y);g.scale(s/24,s/24);
  g.strokeStyle=col||'#fff';g.fillStyle=col||'#fff';g.lineWidth=2.6;g.lineCap='round';g.lineJoin='round';
  var i;
  switch(n){
    case 'izq': g.beginPath();g.moveTo(5,-9);g.lineTo(-5,0);g.lineTo(5,9);g.stroke();break;
    case 'der': g.beginPath();g.moveTo(-5,-9);g.lineTo(5,0);g.lineTo(-5,9);g.stroke();break;
    case 'pausa': g.fillRect(-7,-8,4.5,16);g.fillRect(2.5,-8,4.5,16);break;
    case 'rayo': g.beginPath();g.moveTo(2,-11);g.lineTo(-6,2);g.lineTo(0,2);g.lineTo(-2,11);g.lineTo(6,-2);g.lineTo(0,-2);g.closePath();g.fill();break;
    case 'estrella': g.beginPath();for(i=0;i<10;i++){var r=i%2?5:11,a=i/10*TAU-Math.PI/2;g[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();break;
    case 'corazon': g.beginPath();g.moveTo(0,9);g.bezierCurveTo(-13,0,-7,-11,0,-4);g.bezierCurveTo(7,-11,13,0,0,9);g.fill();break;
    case 'puno': redondo(g,-8,-7,16,14,4);g.fill();g.fillRect(-10,-2,4,8);break;
    case 'ojo': g.beginPath();g.moveTo(-11,0);g.quadraticCurveTo(0,-10,11,0);g.quadraticCurveTo(0,10,-11,0);g.stroke();g.beginPath();g.arc(0,0,3.5,0,TAU);g.fill();break;
    case 'firma': g.beginPath();g.moveTo(-10,6);g.bezierCurveTo(-6,-10,0,10,4,-4);g.bezierCurveTo(6,-10,10,-2,11,4);g.stroke();break;
    case 'candado': g.beginPath();g.arc(0,-3,5.5,Math.PI,0);g.stroke();redondo(g,-8,-3,16,13,2.5);g.fill();break;
    case 'cofre': redondo(g,-10,-4,20,13,2);g.fill();g.beginPath();g.moveTo(-10,-4);g.quadraticCurveTo(0,-14,10,-4);g.fill();break;
    case 'cartas': g.save();g.rotate(-0.2);redondo(g,-9,-10,12,18,2);g.stroke();g.restore();g.save();g.rotate(0.2);redondo(g,-2,-10,12,18,2);g.fill();g.restore();break;
    case 'mapa': g.beginPath();g.moveTo(-10,-7);g.lineTo(-4,-10);g.lineTo(4,-7);g.lineTo(10,-10);g.lineTo(10,7);g.lineTo(4,10);g.lineTo(-4,7);g.lineTo(-10,10);g.closePath();g.stroke();
      g.beginPath();g.moveTo(-4,-10);g.lineTo(-4,7);g.moveTo(4,-7);g.lineTo(4,10);g.stroke();break;
    case 'ajustes': for(i=0;i<8;i++){g.save();g.rotate(i*Math.PI/4);g.fillRect(-2.2,-11,4.4,5);g.restore();}g.beginPath();g.arc(0,0,7,0,TAU);g.stroke();break;
    case 'grupo': g.beginPath();g.arc(-6,-4,4,0,TAU);g.arc(6,-4,4,0,TAU);g.fill();g.beginPath();g.arc(0,-6,5,0,TAU);g.fill();
      g.beginPath();g.moveTo(-10,9);g.quadraticCurveTo(0,-2,10,9);g.fill();break;
    case 'musica': g.beginPath();g.moveTo(-3,6);g.lineTo(-3,-8);g.lineTo(8,-10);g.lineTo(8,4);g.stroke();g.beginPath();g.arc(-6,6,3.2,0,TAU);g.arc(5,4,3.2,0,TAU);g.fill();break;
    case 'efectos': g.beginPath();g.moveTo(-9,-3);g.lineTo(-4,-3);g.lineTo(2,-9);g.lineTo(2,9);g.lineTo(-4,3);g.lineTo(-9,3);g.closePath();g.fill();break;
    case 'vibra': redondo(g,-5,-9,10,18,2.5);g.stroke();g.beginPath();g.moveTo(-9,-4);g.lineTo(-9,4);g.moveTo(9,-4);g.lineTo(9,4);g.stroke();break;
    case 'temblor': g.beginPath();g.moveTo(-10,0);g.lineTo(-6,-6);g.lineTo(-2,6);g.lineTo(2,-6);g.lineTo(6,6);g.lineTo(10,0);g.stroke();break;
    case 'flecha': g.beginPath();g.moveTo(0,-10);g.lineTo(8,0);g.lineTo(3,0);g.lineTo(3,10);g.lineTo(-3,10);g.lineTo(-3,0);g.lineTo(-8,0);g.closePath();g.fill();break;
  }
  g.restore();
}
function moneda(g,x,y,r){
  g.fillStyle=rad(g,x-r*0.3,y-r*0.3,1,r,[[0,'#fff6c9'],[0.5,'#ffc93c'],[1,'#a86a06']]);g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
  g.strokeStyle='#5a3502';g.lineWidth=1.5;g.stroke();texto(g,'$',x,y+0.5,r*1.1,'#6a4008',null,false);
}
function ficha(g,x,y,r){
  g.save();g.translate(x,y);g.rotate(Math.PI/4);g.fillStyle=lin(g,-r,-r,r,r,[[0,'#ffb0e0'],[1,'#8a2a8a']]);g.fillRect(-r*0.7,-r*0.7,r*1.4,r*1.4);
  g.strokeStyle='#2a0a2a';g.lineWidth=1.5;g.strokeRect(-r*0.7,-r*0.7,r*1.4,r*1.4);g.restore();
}
/* las pastillas de monedas y fichas, que cuentan en vez de saltar */
function pastillas(g,e){
  J.monVis+=(Prog.monedas-J.monVis)*0.18;if(Math.abs(Prog.monedas-J.monVis)<0.5)J.monVis=Prog.monedas;
  g.save();g.globalAlpha=Math.min(1,(e===undefined?1:e)*1.4);
  [[ANCHO-220,Math.round(J.monVis),'mon'],[ANCHO-112,Prog.fichas,'fic']].forEach(function(p){
    g.fillStyle='rgba(14,8,24,0.85)';redondo(g,p[0],10,96,28,14);g.fill();
    g.strokeStyle='#d8b25a';g.lineWidth=1.5;redondo(g,p[0],10,96,28,14);g.stroke();
    if(p[2]==='mon')moneda(g,p[0]+16,24,10);else ficha(g,p[0]+16,24,10);
    texto(g,String(p[1]),p[0]+32,25,13,'#f3e6c4','left');
  });
  g.restore();
}
/* ---------------- la carta: marco de su rareza, retrato, nombre, nivel y elemento ---------------- */
function dibujarCarta(g,inst,x,y,w,h,opts){
  opts=opts||{};
  var C=cartaDe(inst.id), R=RAREZA[C.r], L=LUCH[C.l], t=J.t;
  g.save();
  if(opts.alfa!==undefined)g.globalAlpha=opts.alfa;
  g.fillStyle='rgba(0,0,0,0.5)';redondo(g,x+2,y+4,w,h,8);g.fill();
  g.fillStyle=lin(g,x,y,x+w,y+h,[[0,R.col[0]],[1,R.col[1]]]);redondo(g,x,y,w,h,8);g.fill();
  /* el diamante brilla con un arcoíris que corre */
  if(C.r==='diamante'){g.save();redondo(g,x,y,w,h,8);g.clip();g.globalCompositeOperation='lighter';
    var gx=x+((t*80)%(w*3))-w;g.fillStyle=lin(g,gx,y,gx+w,y+h,[[0,'rgba(255,80,200,0)'],[0.3,'rgba(255,80,200,0.35)'],[0.5,'rgba(80,240,255,0.35)'],[0.7,'rgba(255,240,80,0.3)'],[1,'rgba(255,240,80,0)']]);
    g.fillRect(x,y,w,h);g.restore();}
  var m=4, ph=h-m*2-h*0.26;
  g.fillStyle='rgb('+ELEM[C.e].col+')';g.globalAlpha*=0.35;g.fillRect(x+m,y+m,w-m*2,ph);g.globalAlpha=opts.alfa!==undefined?opts.alfa:1;
  retrato(g,C.l,x+m,y+m,w-m*2,ph,false,false,0.02);
  g.strokeStyle='#1a0e06';g.lineWidth=2;g.strokeRect(x+m,y+m,w-m*2,ph);
  /* la placa del nombre */
  var py=y+m+ph+2, phh=h-(py-y)-m;
  g.fillStyle='rgba(18,10,26,0.95)';g.fillRect(x+m,py,w-m*2,phh);
  var tn=Math.max(7,Math.min(11,w*0.1));
  texto(g,C.nom,x+w/2,py+phh*0.32,tn,'#f3e6c4',null,false);
  texto(g,L.nom,x+w/2,py+phh*0.7,tn*0.72,'#b9a67a',null,false);
  /* el nivel y el elemento arriba */
  g.fillStyle='rgba(18,10,26,0.9)';g.beginPath();g.arc(x+13,y+13,10,0,TAU);g.fill();
  g.strokeStyle=R.col[0];g.lineWidth=1.5;g.stroke();
  texto(g,String(inst.nivel),x+13,y+13.5,9,'#fff',null,false);
  g.fillStyle='rgb('+ELEM[C.e].col+')';g.beginPath();g.arc(x+w-12,y+12,6,0,TAU);g.fill();g.strokeStyle=TINTA;g.lineWidth=1.5;g.stroke();
  for(var s=0;s<(inst.estrellas||0);s++)icono(g,'estrella',x+w/2+(s-((inst.estrellas||0)-1)/2)*11,py-6,10,'#ffd23a');
  g.strokeStyle='#1a0e06';g.lineWidth=2;redondo(g,x,y,w,h,8);g.stroke();
  if(opts.elegida){g.strokeStyle='#7cff9d';g.lineWidth=3;redondo(g,x-2,y-2,w+4,h+4,9);g.stroke();}
  g.restore();
}
