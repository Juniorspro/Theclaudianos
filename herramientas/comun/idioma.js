/* ---------------- idiomas: común a todos los juegos de Mariano Peak ----------------
   Se mete en cada HTML como <script id="idioma"> ANTES del juego (herramientas/comun/poner_idioma.py).
   - Traduce en el momento de dibujar: fillText, strokeText y measureText pasan por Idioma.T, así
     el juego no cambia; lo que arma frases con números usa las reglas (_re) del diccionario.
   - Las funciones que parten un texto en renglones llaman a T con la frase entera y después
     dibujan con Idioma.pausa>0 (los pedazos no se vuelven a traducir).
   - La primera vez muestra la pantalla de idioma; después, un globo en la pantalla principal
     (el juego llama a Idioma.botonAqui(x,y) en ese cuadro) la vuelve a abrir.
   - Toma los toques en fase de captura: mientras está abierta, el juego no recibe nada. */
(function(){
var LISTA=[['es','ESPAÑOL','¡Hola! Elegí tu idioma'],['en','ENGLISH','Hi! Choose your language'],
  ['pt','PORTUGUÊS','Olá! Escolha seu idioma'],['fr','FRANÇAIS','Salut ! Choisis ta langue']];
var DIC=window.IDIOMA_DIC||{};
var I={
  actual:'es', abierto:false, primera:false, t:0, clave:'', boton:null, pausa:0, cache:{}, vistos:null,
  aMundo:null, rects:[], cuadro:0, tragando:false, alCambiar:null, acento:'255,210,58',
  T:function(s){
    if(typeof s!=='string'||!s)return s;
    if(this.vistos&&!this.pausa)this.vistos[s]=1;
    if(this.actual==='es'||this.pausa)return s;
    var c=this.cache[s];if(c!==undefined)return c;
    var d=DIC[this.actual]||{}, r=d[s];
    if(r===undefined){var re=(DIC._re&&DIC._re[this.actual])||[];
      for(var i=0;i<re.length;i++){var m=new RegExp(re[i][0]);if(m.test(s)){r=s.replace(m,re[i][1]);
        /* lo que la regla dejó en español (un nombre de pantalla, una ronda) se traduce también */
        r=r.replace(/\{([^}]*)\}/g,function(_,x){return d[x]!==undefined?d[x]:x;});break;}}}
    if(r===undefined)r=s;
    this.cache[s]=r;return r;
  },
  iniciar:function(clave,aMundo,acento){
    var S=this;S.clave=clave;S.aMundo=aMundo;if(acento)S.acento=acento;
    var g=null;try{g=localStorage.getItem(clave+'.idioma');}catch(e){}
    if(g&&LISTA.some(function(l){return l[0]===g;}))S.actual=g;
    else{S.abierto=true;S.primera=true;S.t=0;
      var nav=(navigator.language||'es').slice(0,2);if(LISTA.some(function(l){return l[0]===nav;}))S.actual=nav;}
    document.documentElement.lang=S.actual;
    var P=CanvasRenderingContext2D.prototype, f=P.fillText, st=P.strokeText, me=P.measureText;
    if(!P.__idioma){P.__idioma=true;
      P.fillText=function(s,x,y,m){return m===undefined?f.call(this,I.T(s),x,y):f.call(this,I.T(s),x,y,m);};
      P.strokeText=function(s,x,y,m){return m===undefined?st.call(this,I.T(s),x,y):st.call(this,I.T(s),x,y,m);};
      P.measureText=function(s){return me.call(this,I.T(s));};}
    var punto=function(e){var t=e.changedTouches?e.changedTouches[0]:e;return S.aMundo(t.clientX,t.clientY);};
    var abajo=function(e){
      var p=punto(e);
      if(S.abierto){S.tragando=true;S.tocar(p.x,p.y);}
      else if(S.boton&&S.boton.c>=S.cuadro-2&&(p.x-S.boton.x)*(p.x-S.boton.x)+(p.y-S.boton.y)*(p.y-S.boton.y)<(S.boton.r+10)*(S.boton.r+10)){S.tragando=true;S.abrir();}
      else return;
      e.stopPropagation();e.stopImmediatePropagation();if(e.cancelable)e.preventDefault();
    };
    var resto=function(e){if(!S.tragando&&!S.abierto)return;if(e.type==='touchend'||e.type==='mouseup'||e.type==='touchcancel')S.tragando=false;
      e.stopPropagation();e.stopImmediatePropagation();if(e.cancelable)e.preventDefault();};
    addEventListener('touchstart',abajo,{capture:true,passive:false});addEventListener('mousedown',abajo,true);
    ['touchmove','touchend','touchcancel','mousemove','mouseup','click'].forEach(function(ev){addEventListener(ev,resto,{capture:true,passive:false});});
    addEventListener('keydown',function(e){if(!S.abierto)return;var n=parseInt(e.key,10);
      if(n>=1&&n<=LISTA.length)S.elegir(LISTA[n-1][0]);else if(e.key==='Escape'&&!S.primera)S.abierto=false;
      e.stopPropagation();e.stopImmediatePropagation();},true);
  },
  abrir:function(){this.abierto=true;this.t=0;this.primera=false;},
  elegir:function(id){
    this.actual=id;this.cache={};this.abierto=false;this.primera=false;
    try{localStorage.setItem(this.clave+'.idioma',id);}catch(e){}
    document.documentElement.lang=id;
    if(this.alCambiar)this.alCambiar(id);
  },
  tocar:function(x,y){
    for(var i=0;i<this.rects.length;i++){var r=this.rects[i];
      if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h){if(r.id==='x')this.abierto=false;else this.elegir(r.id);return;}}
    if(!this.primera&&this.t>0.3)this.abierto=false;       /* tocar afuera cierra (salvo la primera vez) */
  },
  /* el juego avisa dónde quiere el globo en este cuadro (sólo en la pantalla principal) */
  botonAqui:function(x,y,r){this.boton={x:x,y:y,r:r||20,c:this.cuadro};},
  globo:function(g,x,y,r,t){
    g.save();g.translate(x,y);
    g.fillStyle='rgba(0,0,0,0.35)';g.beginPath();g.arc(1.5,3,r,0,Math.PI*2);g.fill();
    var d=g.createLinearGradient(0,-r,0,r);d.addColorStop(0,'#8fe0ff');d.addColorStop(1,'#1f6fd0');
    g.fillStyle=d;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.fill();
    g.strokeStyle='rgba(255,255,255,0.9)';g.lineWidth=Math.max(1.2,r*0.09);
    g.beginPath();g.arc(0,0,r*0.78,0,Math.PI*2);g.stroke();
    g.beginPath();g.ellipse(0,0,r*0.36,r*0.78,0,0,Math.PI*2);g.stroke();
    g.beginPath();g.moveTo(-r*0.78,0);g.lineTo(r*0.78,0);g.moveTo(-r*0.66,-r*0.4);g.lineTo(r*0.66,-r*0.4);g.moveTo(-r*0.66,r*0.4);g.lineTo(r*0.66,r*0.4);g.stroke();
    g.strokeStyle='rgba(10,6,30,0.9)';g.lineWidth=2;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.stroke();
    /* la sigla del idioma, en una pastilla */
    this.pausa++;g.font='900 '+Math.round(r*0.52)+'px "Arial Black",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='rgba(10,6,30,0.9)';var w=r*1.05;g.beginPath();g.rect(-w/2,r*0.55,w,r*0.62);g.fill();
    g.fillStyle='#fff';g.fillText(this.actual.toUpperCase(),0,r*0.87);this.pausa--;
    g.restore();
  },
  /* al final de cada cuadro, encima de todo */
  dibujar:function(g,W,H,t){
    var dt=1/60;this.t+=dt;
    var b=this.boton;
    if(b&&b.c===this.cuadro&&!this.abierto)this.globo(g,b.x,b.y,b.r*(1+0.04*Math.sin(t*3)),t);
    this.cuadro++;
    this.rects.length=0;
    if(!this.abierto)return;
    this.pausa++;
    var k=Math.min(1,this.t/0.3), e=1-Math.pow(1-k,3), A=this.acento;
    g.save();
    g.fillStyle='rgba(6,4,20,'+(0.78*e).toFixed(3)+')';g.fillRect(-20,-20,W+40,H+40);
    var vert=H>W, n=LISTA.length, bw=vert?Math.min(W-48,320):Math.min(250,(W-120)/2), bh=vert?64:62, gap=14;
    var cols=vert?1:2, filas=Math.ceil(n/cols), pw=cols*bw+(cols-1)*gap+40, ph=filas*bh+(filas-1)*gap+118;
    var px=W/2-pw/2, py=H/2-ph/2;
    g.translate(W/2,H/2);var es=0.85+0.15*e;g.scale(es,es);g.translate(-W/2,-H/2);g.globalAlpha=e;
    var rr=function(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
    g.fillStyle='rgba(0,0,0,0.4)';rr(px+4,py+7,pw,ph,22);g.fill();
    var d=g.createLinearGradient(0,py,0,py+ph);d.addColorStop(0,'#3a2a8a');d.addColorStop(1,'#140c40');g.fillStyle=d;rr(px,py,pw,ph,22);g.fill();
    g.strokeStyle='rgba('+A+',0.9)';g.lineWidth=3;rr(px,py,pw,ph,22);g.stroke();
    this.globo(g,W/2,py+4,26,t);
    g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
    var tit='IDIOMA · LANGUAGE · LÍNGUA · LANGUE';
    g.font='900 '+(vert?13:15)+'px "Arial Black",Arial,sans-serif';g.lineWidth=4;g.strokeStyle='rgba(10,6,30,0.95)';g.strokeText(tit,W/2,py+48);g.fillStyle='#fff';g.fillText(tit,W/2,py+48);
    for(var i=0;i<n;i++){
      var L=LISTA[i], c=i%cols, f=Math.floor(i/cols), x=px+20+c*(bw+gap), y=py+76+f*(bh+gap), sel=L[0]===this.actual;
      var ent=Math.min(1,Math.max(0,(this.t-0.08-i*0.05)/0.25)), dx=(1-ent)*(c?60:-60);
      g.save();g.globalAlpha=e*ent;g.translate(dx,0);
      g.fillStyle='rgba(0,0,0,0.35)';rr(x+2,y+5,bw,bh,16);g.fill();
      var d2=g.createLinearGradient(0,y,0,y+bh);
      if(sel){d2.addColorStop(0,'#fff3a0');d2.addColorStop(1,'rgb('+A+')');}else{d2.addColorStop(0,'#6a5ae0');d2.addColorStop(1,'#3a2aa0');}
      g.fillStyle=d2;rr(x,y,bw,bh,16);g.fill();
      g.fillStyle='rgba(255,255,255,0.28)';rr(x+5,y+4,bw-10,bh*0.36,12);g.fill();
      g.strokeStyle='rgba(10,6,30,0.9)';g.lineWidth=2.5;rr(x,y,bw,bh,16);g.stroke();
      /* la sigla en un círculo, el nombre y el saludo */
      g.fillStyle='rgba(10,6,30,0.85)';g.beginPath();g.arc(x+30,y+bh/2,19,0,Math.PI*2);g.fill();
      g.font='900 14px "Arial Black",Arial,sans-serif';g.fillStyle='#fff';g.fillText(L[0].toUpperCase(),x+30,y+bh/2+1);
      g.textAlign='left';g.font='900 20px "Arial Black",Arial,sans-serif';g.lineWidth=4;g.strokeStyle='rgba(10,6,30,0.9)';
      g.strokeText(L[1],x+58,y+bh/2-8);g.fillStyle='#fff';g.fillText(L[1],x+58,y+bh/2-8);
      g.font='bold 11px Arial,sans-serif';g.fillStyle=sel?'#3a1a06':'#e0dcff';g.fillText(L[2],x+58,y+bh/2+14);
      if(sel){g.strokeStyle='#2a8a1a';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(x+bw-34,y+bh/2);g.lineTo(x+bw-26,y+bh/2+8);g.lineTo(x+bw-14,y+bh/2-8);g.stroke();}
      g.textAlign='center';g.restore();
      this.rects.push({id:L[0],x:x,y:y,w:bw,h:bh});
    }
    if(!this.primera){var cx=px+pw-8, cy=py+8;g.fillStyle='#e8452a';g.beginPath();g.arc(cx,cy,17,0,Math.PI*2);g.fill();
      g.strokeStyle='rgba(10,6,30,0.9)';g.lineWidth=2.5;g.stroke();g.strokeStyle='#fff';g.lineWidth=3.5;g.lineCap='round';
      g.beginPath();g.moveTo(cx-6,cy-6);g.lineTo(cx+6,cy+6);g.moveTo(cx+6,cy-6);g.lineTo(cx-6,cy+6);g.stroke();
      this.rects.push({id:'x',x:cx-22,y:cy-22,w:44,h:44});}
    g.restore();
    this.pausa--;
  }
};
window.Idioma=I;window.T=function(s){return I.T(s);};
})();
