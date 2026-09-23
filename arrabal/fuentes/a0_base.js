/* ---------------- lo que usa todo lo demás ---------------- */
var lim=function(v,a,b){return v<a?a:v>b?b:v;};
var sig=function(v){return v<0?-1:1;};
var TAU=Math.PI*2;
var dist2=function(ax,ay,bx,by){var dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
/* azar del mundo: con semilla, para que una partida se repita */
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function semillaTexto(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
var rnd=mulberry(1);                       /* azar del mundo */
var az=Math.random;                        /* azar visual: NUNCA toca el del mundo */

/* el juego se piensa APAISADO: 412 de alto y el ancho que dé la pantalla (700 a 1000).
   Si el teléfono está parado, el lienzo se gira 90° solo: se juega igual con la rotación bloqueada. */
var ANCHO=892, ALTO=412;

/* ---------------- pantalla: un lienzo, unidades de diseño ---------------- */
var Pantalla={
  lienzo:null,g:null,S:1,dpr:1,W:892,H:412,pedir:true,cuenta:0,alCambiar:null,girado:false,cw:1,ch:1,
  iniciar:function(lienzo){
    this.lienzo=lienzo;
    this.g=lienzo.getContext('2d',{alpha:false});
    var pedir=function(){Pantalla.pedir=true;};
    if(window.ResizeObserver)new ResizeObserver(pedir).observe(lienzo.parentNode);
    addEventListener('resize',pedir);addEventListener('orientationchange',pedir);
    this.medir();
  },
  medir:function(){
    var cont=this.lienzo.parentNode;
    var cw=Math.max(1,cont.clientWidth||innerWidth), ch=Math.max(1,cont.clientHeight||innerHeight);
    var dpr=Math.min(devicePixelRatio||1,2);
    var girado=ch>cw, largo=Math.max(cw,ch), corto=Math.min(cw,ch);
    var H=412, S=corto/H, W=Math.round(largo/S);
    if(W>1000){W=1000;}
    if(W<700){W=700;S=largo/W;}
    this.pedir=false;
    if(W===this.W&&H===this.H&&Math.abs(S-this.S)<0.001&&dpr===this.dpr&&girado===this.girado&&cw===this.cw&&ch===this.ch)return false;
    this.W=W;this.H=H;this.S=S;this.dpr=dpr;this.girado=girado;this.cw=cw;this.ch=ch;
    var L=this.lienzo, wc=W*S, hc=H*S;
    L.width=Math.round(wc*dpr);L.height=Math.round(hc*dpr);
    L.style.width=Math.round(wc)+'px';L.style.height=Math.round(hc)+'px';
    /* centrado en el envase y, si hace falta, girado: arriba del juego = derecha del teléfono */
    L.style.transform='translate('+(cw/2)+'px,'+(ch/2)+'px)'+(girado?' rotate(90deg)':'')+' translate('+(-wc/2)+'px,'+(-hc/2)+'px)';
    this.g.setTransform(S*dpr,0,0,S*dpr,0,0);
    this.g.imageSmoothingEnabled=true;
    ANCHO=W;ALTO=H;
    if(this.alCambiar)this.alCambiar(W,H);
    return true;
  },
  /* se revisa al EMPEZAR el cuadro: cambiar el tamaño del lienzo lo borra */
  revisar:function(){
    this.cuenta++;
    if(this.pedir||this.cuenta%30===0)this.medir();
  },
  /* de unidades de diseño a la ventana (para las pruebas: el inverso de aMundo) */
  aVentana:function(ux,uy){
    var r=this.lienzo.parentNode.getBoundingClientRect(), x=(ux-this.W/2)*this.S, y=(uy-this.H/2)*this.S;
    var dx=this.girado?-y:x, dy=this.girado?x:y;
    return{x:r.left+this.cw/2+dx,y:r.top+this.ch/2+dy};
  },
  /* de coordenadas de ventana a unidades de diseño (deshaciendo el giro) */
  aMundo:function(cx,cy){
    var r=this.lienzo.parentNode.getBoundingClientRect();
    var dx=cx-r.left-this.cw/2, dy=cy-r.top-this.ch/2;
    var x=this.girado?dy:dx, y=this.girado?-dx:dy;
    return{x:x/this.S+this.W/2,y:y/this.S+this.H/2};
  }
};


var K=2;
function lienzo(w,h){var c=document.createElement('canvas');c.width=Math.ceil(w*K);c.height=Math.ceil(h*K);
  var g=c.getContext('2d');g.scale(K,K);c.mw=w;c.mh=h;return c;}
function elipse(g,x,y,rx,ry,r){g.save();g.translate(x,y);if(r)g.rotate(r);g.beginPath();
  g.ellipse(0,0,rx,ry,0,0,TAU);g.restore();}
function lin(g,x0,y0,x1,y1,paradas){var d=g.createLinearGradient(x0,y0,x1,y1);
  for(var i=0;i<paradas.length;i++)d.addColorStop(paradas[i][0],paradas[i][1]);return d;}
function rad(g,x,y,r0,r1,paradas){var d=g.createRadialGradient(x,y,r0,x,y,r1);
  for(var i=0;i<paradas.length;i++)d.addColorStop(paradas[i][0],paradas[i][1]);return d;}
/* un halo: lo que hace que todo parezca que emite luz */
function halo(g,x,y,r,col,fuerza){
  g.save();g.globalCompositeOperation='lighter';
  g.fillStyle=rad(g,x,y,0,r,[[0,'rgba('+col+','+(fuerza||0.9)+')'],[0.45,'rgba('+col+',0.28)'],[1,'rgba('+col+',0)']]);
  g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.restore();
}

