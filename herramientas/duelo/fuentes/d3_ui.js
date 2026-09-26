/* ---------------- la interfaz: botones gordos y lustrosos, paneles, letras con borde ----------------
   Estilo de juego deportivo de celular: colores vivos, relieve, todo redondeado. */
var FUENTE='"Arial Black","Helvetica Neue",Arial,sans-serif';
var UI={rects:[],apretado:null,
  limpiar:function(){this.rects.length=0;},
  boton:function(id,x,y,w,h,inmediato){this.rects.push({id:id,x:x,y:y,w:w,h:h,inm:!!inmediato});},
  bajo:function(x,y,soloInm){for(var i=this.rects.length-1;i>=0;i--){var r=this.rects[i];
    if(soloInm&&!r.inm)continue;if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)return r;}return null;},
  tocado:function(){for(var i=0;i<Entrada.toques.length;i++){var r=this.bajo(Entrada.toques[i].x,Entrada.toques[i].y,true);if(r)return r.id;}return null;},
  soltado:function(){var s=Entrada.suelta;if(!s)return null;if(s.dx*s.dx+s.dy*s.dy>18*18)return null;
    var r=this.bajo(s.x0,s.y0);if(!r||r.inm)return null;var r2=this.bajo(s.x,s.y);return r2===r?r.id:null;},
  donde:function(id){for(var i=0;i<this.rects.length;i++)if(this.rects[i].id===id){var r=this.rects[i];return{x:r.x+r.w/2,y:r.y+r.h/2,inm:r.inm};}return null;}
};
function entra(retraso){var x=lim((J.tMenu-(retraso||0))/0.38,0,1);return x<1?1-Math.pow(1-x,3)*(1-x*0.4)+Math.sin(x*Math.PI)*0.12:1;}
function redondo(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);
  g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);
  g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();}
/* texto con borde oscuro grueso (el de todos los juegos de celular) */
function texto(g,txt,x,y,tam,col,al,borde){
  g.save();g.font='900 '+tam+'px '+FUENTE;g.textAlign=al||'center';g.textBaseline='middle';g.lineJoin='round';
  if(borde!==false){g.lineWidth=Math.max(2.5,tam*0.2);g.strokeStyle='rgba(20,10,40,0.95)';g.strokeText(txt,x,y);}
  g.fillStyle=col||'#fff';g.fillText(txt,x,y);g.restore();
}
/* letras gordas con relieve de bloque (GOOOL, títulos) */
function textoGordo(g,txt,x,y,tam,col1,col2,al){
  g.save();g.font='900 '+tam+'px '+FUENTE;g.textAlign=al||'center';g.textBaseline='middle';g.lineJoin='round';
  var prof=Math.max(3,tam*0.09);
  for(var i=prof;i>0;i--){g.fillStyle=i===prof?'rgba(0,0,0,0.35)':'#3a1a06';g.fillText(txt,x+i*0.5,y+i);}
  g.lineWidth=tam*0.16;g.strokeStyle='#2a1204';g.strokeText(txt,x,y);
  var d=g.createLinearGradient(0,y-tam*0.5,0,y+tam*0.5);
  d.addColorStop(0,'#ffffff');d.addColorStop(0.3,col1||'#ffe36a');d.addColorStop(0.7,col2||'#ff8a1a');d.addColorStop(1,'#b0400a');
  g.fillStyle=d;g.fillText(txt,x,y);
  g.lineWidth=Math.max(1,tam*0.04);g.strokeStyle='rgba(255,255,255,0.6)';g.strokeText(txt,x,y-tam*0.04);
  g.restore();
}
/* el botón lustroso: base oscura, cara con degradé, brillo arriba, sombra; se hunde al apretar */
var ESTILOS={verde:['#b6ff5a','#4fc21a','#2a7a0a'],amarillo:['#fff08a','#ffc21a','#b87a00'],azul:['#9ae0ff','#2f9af0','#12508a'],
  rojo:['#ffb09a','#f0452a','#8a1a0a'],violeta:['#e0b0ff','#9a4af0','#4a1a8a'],gris:['#e8e8f0','#a8a8b8','#5a5a6a']};
function botonG(g,id,x,y,w,h,txt,estilo,tam,retraso,sub,icono_){
  var e=entra(retraso||0);if(e<=0)return;
  var c=ESTILOS[estilo||'verde'], ap=UI.apretado===id, hund=ap?4:0;
  g.save();g.globalAlpha=Math.min(1,e*1.5);
  g.translate(x+w/2,y+h/2);var es=(0.8+0.2*e)*(ap?0.97:1);g.scale(es,es);g.translate(-w/2,-h/2);
  var r=Math.min(18,h*0.32), pl=IMG['ui-placa-'+(estilo||'verde')];
  if(pl){placa(g,pl,0,hund,w,h);if(ap){g.save();g.globalCompositeOperation='lighter';g.globalAlpha=0.18;placa(g,pl,0,hund,w,h);g.restore();}}
  else{
  g.fillStyle='rgba(0,0,0,0.35)';redondo(g,2,8,w,h,r);g.fill();
  g.fillStyle=c[2];redondo(g,0,6,w,h,r);g.fill();
  g.fillStyle=lin(g,0,hund,0,h+hund,[[0,c[0]],[0.5,c[1]],[1,c[1]]]);redondo(g,0,hund,w,h,r);g.fill();
  g.fillStyle='rgba(255,255,255,0.35)';redondo(g,5,hund+4,w-10,h*0.38,r*0.8);g.fill();
  g.strokeStyle='rgba(20,10,40,0.85)';g.lineWidth=2.5;redondo(g,0,hund,w,h,r);g.stroke();
  }
  var ty=hund+h/2+(sub?-7:1), tx=w/2+(icono_?12:0);
  if(icono_)icono(g,icono_,tx-texAncho(g,txt,tam||20)/2-18,ty,tam?tam*1.1:22,'#ffffff');
  texto(g,txt,tx,ty,tam||20,'#ffffff');
  if(sub)texto(g,sub,w/2,hund+h/2+14,Math.max(9,(tam||20)*0.45),'#ffffff');
  g.restore();
  UI.boton(id,x,y,w,h);
}
/* la placa de Rezona estirada en tres partes: las puntas redondas no se deforman */
function placa(g,im,x,y,w,h){
  var cs=im.height*0.55, cd=Math.min(w/2,cs*h/im.height), ch=h;
  g.drawImage(im,0,0,cs,im.height,x,y,cd,ch);
  g.drawImage(im,cs,0,im.width-cs*2,im.height,x+cd,y,w-cd*2,ch);
  g.drawImage(im,im.width-cs,0,cs,im.height,x+w-cd,y,cd,ch);
}
function texAncho(g,txt,tam){g.save();g.font='900 '+tam+'px '+FUENTE;var w=g.measureText(txt).width;g.restore();return w;}
/* un panel de vidrio oscuro con borde claro */
function panelG(g,x,y,w,h,col){
  g.save();
  g.fillStyle='rgba(0,0,0,0.3)';redondo(g,x+3,y+5,w,h,16);g.fill();
  g.fillStyle=col||'rgba(40,20,90,0.82)';redondo(g,x,y,w,h,16);g.fill();
  g.strokeStyle='rgba(255,255,255,0.25)';g.lineWidth=2;redondo(g,x+1.5,y+1.5,w-3,h-3,15);g.stroke();
  g.strokeStyle='rgba(20,10,40,0.9)';g.lineWidth=2;redondo(g,x,y,w,h,16);g.stroke();
  g.restore();
}
/* el fondo de los menús: degradé violeta con rayos que giran y pelotitas que flotan */
function fondoMenu(g,t,c1,c2){
  g.fillStyle=lin(g,0,0,ANCHO,ALTO,[[0,c1||'#ff4fa0'],[0.5,'#8a3af0'],[1,c2||'#2a2ad0']]);g.fillRect(0,0,ANCHO,ALTO);
  g.save();g.globalAlpha=0.08;g.translate(ANCHO*0.3,ALTO*0.4);g.rotate(t*0.05);g.fillStyle='#ffffff';
  for(var i=0;i<12;i++){g.rotate(TAU/12);g.beginPath();g.moveTo(0,0);g.lineTo(1200,-90);g.lineTo(1200,90);g.closePath();g.fill();}
  g.restore();
  g.save();g.globalAlpha=0.12;
  for(var k=0;k<9;k++){var x=(k*173+t*20*(1+k%3))%(ANCHO+80)-40, y=ALTO-((k*97+t*30*(1+k%2))%(ALTO+80))+40;pelotaChica(g,x,y,8+k%4*4,t*(1+k%3));}
  g.restore();
}
function pelotaChica(g,x,y,r,giro){
  g.save();g.translate(x,y);g.rotate(giro||0);
  g.fillStyle='#fff';g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
  g.fillStyle='#1a1a2a';for(var i=0;i<5;i++){var a=i/5*TAU;g.beginPath();g.arc(Math.cos(a)*r*0.62,Math.sin(a)*r*0.62,r*0.24,0,TAU);g.fill();}
  g.beginPath();g.arc(0,0,r*0.3,0,TAU);g.fill();
  g.strokeStyle='#1a1a2a';g.lineWidth=Math.max(1,r*0.12);g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();
  g.restore();
}
/* los íconos, dibujados: moneda, gema, trofeo, candado, estrella, flechas, pausa, engranaje, bota */
function icono(g,n,x,y,s,col){
  var ir=IMG['ui-'+({moneda:'moneda',gema:'gema',cofre:'cofre'}[n]||(n.indexOf('trofeo-')===0?n:n==='trofeo'?'trofeo-oro':''))];
  if(ir){var e=s*1.15/Math.max(ir.width,ir.height);g.drawImage(ir,x-ir.width*e/2,y-ir.height*e/2,ir.width*e,ir.height*e);return;}
  if(n.indexOf('trofeo-')===0)n='trofeo';
  g.save();g.translate(x,y);g.fillStyle=col||'#fff';g.strokeStyle='rgba(20,10,40,0.9)';g.lineWidth=Math.max(1.5,s*0.08);g.lineJoin='round';
  var h=s/2;
  if(n==='moneda'){g.fillStyle='#ffc21a';g.beginPath();g.arc(0,0,h,0,TAU);g.fill();g.stroke();g.fillStyle='#fff08a';g.beginPath();g.arc(-h*0.15,-h*0.15,h*0.62,0,TAU);g.fill();
    g.fillStyle='#b87a00';g.font='900 '+(s*0.62)+'px '+FUENTE;g.textAlign='center';g.textBaseline='middle';g.fillText('$',0,s*0.03);}
  else if(n==='gema'){g.fillStyle='#4af0ff';g.beginPath();g.moveTo(0,-h);g.lineTo(h*0.85,-h*0.25);g.lineTo(0,h);g.lineTo(-h*0.85,-h*0.25);g.closePath();g.fill();g.stroke();
    g.fillStyle='rgba(255,255,255,0.6)';g.beginPath();g.moveTo(0,-h);g.lineTo(h*0.3,-h*0.25);g.lineTo(-h*0.3,-h*0.25);g.closePath();g.fill();}
  else if(n==='trofeo'){g.fillStyle='#ffd23a';g.beginPath();g.moveTo(-h*0.7,-h);g.lineTo(h*0.7,-h);g.quadraticCurveTo(h*0.7,h*0.2,0,h*0.25);g.quadraticCurveTo(-h*0.7,h*0.2,-h*0.7,-h);g.fill();g.stroke();
    g.fillRect(-h*0.15,h*0.2,h*0.3,h*0.4);g.fillRect(-h*0.5,h*0.6,h,h*0.3);g.strokeRect(-h*0.5,h*0.6,h,h*0.3);}
  else if(n==='candado'){g.fillStyle=col||'#c0c0d0';redondo(g,-h*0.7,-h*0.1,h*1.4,h*1.1,h*0.2);g.fill();g.stroke();
    g.beginPath();g.arc(0,-h*0.1,h*0.45,Math.PI,0);g.lineWidth=s*0.14;g.strokeStyle=col||'#c0c0d0';g.stroke();}
  else if(n==='estrella'){g.beginPath();for(var i=0;i<10;i++){var r=i%2?h*0.45:h,a=i/10*TAU-Math.PI/2;g[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.stroke();}
  else if(n==='izq'||n==='der'||n==='arriba'){g.rotate(n==='izq'?Math.PI:n==='arriba'?-Math.PI/2:0);
    g.beginPath();g.moveTo(h,0);g.lineTo(-h*0.5,-h*0.85);g.lineTo(-h*0.5,h*0.85);g.closePath();g.fill();g.stroke();}
  else if(n==='pausa'){redondo(g,-h*0.7,-h*0.8,h*0.5,h*1.6,h*0.15);g.fill();g.stroke();redondo(g,h*0.2,-h*0.8,h*0.5,h*1.6,h*0.15);g.fill();g.stroke();}
  else if(n==='engranaje'){g.beginPath();for(var j=0;j<16;j++){var rr=j%2?h*0.72:h,aa=j/16*TAU;g.lineTo(Math.cos(aa)*rr,Math.sin(aa)*rr);}g.closePath();g.fill();g.stroke();
    g.fillStyle='rgba(20,10,40,0.9)';g.beginPath();g.arc(0,0,h*0.3,0,TAU);g.fill();}
  else if(n==='bota'){g.beginPath();g.moveTo(-h*0.6,-h);g.lineTo(-h*0.05,-h);g.lineTo(0,-h*0.05);g.lineTo(h*0.8,h*0.15);g.quadraticCurveTo(h,h*0.7,h*0.5,h*0.7);
    g.lineTo(-h*0.6,h*0.7);g.closePath();g.fill();g.stroke();g.fillStyle='rgba(20,10,40,0.9)';g.fillRect(-h*0.6,h*0.5,h*1.35,h*0.2);
    for(var k=0;k<3;k++)g.fillRect(-h*0.5+k*h*0.35,h*0.7,h*0.15,h*0.2);}
  else if(n==='rayo'){g.beginPath();g.moveTo(h*0.2,-h);g.lineTo(-h*0.5,h*0.1);g.lineTo(-h*0.05,h*0.1);g.lineTo(-h*0.25,h);g.lineTo(h*0.55,-h*0.2);g.lineTo(h*0.08,-h*0.2);g.closePath();g.fill();g.stroke();}
  else if(n==='cofre'){g.fillStyle='#b8702a';redondo(g,-h,-h*0.4,s,h*1.3,h*0.2);g.fill();g.stroke();g.beginPath();g.moveTo(-h,-h*0.3);g.quadraticCurveTo(0,-h*1.3,h,-h*0.3);g.fill();g.stroke();
    g.fillStyle='#ffd23a';g.fillRect(-h*0.15,-h*0.35,h*0.3,h*0.45);}
  else if(n==='camiseta'){g.beginPath();g.moveTo(-h*0.4,-h);g.lineTo(-h,-h*0.55);g.lineTo(-h*0.7,-h*0.1);g.lineTo(-h*0.5,-h*0.25);g.lineTo(-h*0.5,h);g.lineTo(h*0.5,h);g.lineTo(h*0.5,-h*0.25);
    g.lineTo(h*0.7,-h*0.1);g.lineTo(h,-h*0.55);g.lineTo(h*0.4,-h);g.quadraticCurveTo(0,-h*0.6,-h*0.4,-h);g.closePath();g.fill();g.stroke();}
  else if(n==='x'){g.lineWidth=s*0.2;g.strokeStyle=col||'#fff';g.lineCap='round';g.beginPath();g.moveTo(-h*0.6,-h*0.6);g.lineTo(h*0.6,h*0.6);g.moveTo(h*0.6,-h*0.6);g.lineTo(-h*0.6,h*0.6);g.stroke();}
  g.restore();
}
/* monedas, gemas y trofeos arriba a la derecha */
function pastillas(g,e){
  J.monVis+=(Prog.monedas-J.monVis)*0.2;if(Math.abs(Prog.monedas-J.monVis)<0.5)J.monVis=Prog.monedas;
  g.save();g.globalAlpha=Math.min(1,(e===undefined?1:e)*1.5);
  [[ANCHO-330,Math.round(J.monVis),'moneda'],[ANCHO-218,Prog.gemas,'gema'],[ANCHO-106,Prog.trofeos,'trofeo']].forEach(function(p){
    g.fillStyle='rgba(20,10,40,0.6)';redondo(g,p[0],10,96,28,14);g.fill();
    g.strokeStyle='rgba(255,255,255,0.3)';g.lineWidth=1.5;redondo(g,p[0],10,96,28,14);g.stroke();
    icono(g,p[2],p[0]+14,24,24);texto(g,String(p[1]),p[0]+32,25,14,'#ffffff','left');
  });
  g.restore();
}
function botonCerrar(g,id,x,y){
  var ap=UI.apretado===id;
  g.save();g.translate(x,y);if(ap)g.scale(0.9,0.9);
  g.fillStyle='#2a7a0a';g.beginPath();g.arc(0,3,22,0,TAU);g.fill();
  g.fillStyle=lin(g,0,-22,0,22,[[0,'#b6ff5a'],[1,'#4fc21a']]);g.beginPath();g.arc(0,0,22,0,TAU);g.fill();
  g.strokeStyle='rgba(20,10,40,0.9)';g.lineWidth=2.5;g.stroke();
  icono(g,'x',0,0,20,'#1a3a0a');g.restore();
  UI.boton(id,x-26,y-26,52,52);
}
function barraG(g,x,y,w,h,f,c1,c2){
  g.fillStyle='rgba(20,10,40,0.7)';redondo(g,x,y,w,h,h/2);g.fill();
  if(f>0){g.save();redondo(g,x,y,w,h,h/2);g.clip();g.fillStyle=lin(g,0,y,0,y+h,[[0,c1],[1,c2||c1]]);g.fillRect(x,y,w*lim(f,0,1),h);
    g.fillStyle='rgba(255,255,255,0.35)';g.fillRect(x,y,w*lim(f,0,1),h*0.4);g.restore();}
  g.strokeStyle='rgba(20,10,40,0.9)';g.lineWidth=1.5;redondo(g,x,y,w,h,h/2);g.stroke();
}
