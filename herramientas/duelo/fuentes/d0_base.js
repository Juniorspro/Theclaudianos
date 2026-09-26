/* ---------------- lo que usa todo lo demás ---------------- */
var lim=function(v,a,b){return v<a?a:v>b?b:v;};
var sig=function(v){return v<0?-1:1;};
var TAU=Math.PI*2;
var dist2=function(ax,ay,bx,by){var dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
var mezclar=function(a,b,k){return a+(b-a)*k;};
var suave=function(x){x=lim(x,0,1);return x*x*(3-2*x);};
var az=Math.random;

/* el juego se piensa PARADO: 412 de ancho y el alto que dé el teléfono (700 a 1000).
   En una pantalla ancha (compu, tablet acostada) se juega en una columna centrada. */
var ANCHO=412, ALTO=892;

/* ---------------- pantalla: el lienzo 3D abajo, el lienzo de la interfaz encima ---------------- */
var Pantalla={
  gl:null, ui:null, g:null, S:1, dpr:1, W:412, H:892, x0:0, y0:0, cw:1, ch:1, pedir:true, cuenta:0, alCambiar:null, escala3D:1,
  iniciar:function(gl,ui){
    this.gl=gl;this.ui=ui;this.g=ui.getContext('2d');
    var pedir=function(){Pantalla.pedir=true;};
    addEventListener('resize',pedir);addEventListener('orientationchange',pedir);
    if(window.ResizeObserver)new ResizeObserver(pedir).observe(ui.parentNode);
    this.medir();
  },
  medir:function(){
    var env=this.ui.parentNode, cw=Math.max(1,env.clientWidth||innerWidth), ch=Math.max(1,env.clientHeight||innerHeight);
    var dpr=Math.min(devicePixelRatio||1,2);
    /* la columna: el ancho del teléfono, o 0,56 del alto si la pantalla es ancha */
    var w=Math.min(cw,ch*0.6), h=ch;
    var S=w/412, H=Math.round(h/S);
    if(H>1000){H=1000;h=H*S;}
    if(H<680){H=680;S=h/H;w=412*S;}
    this.pedir=false;
    if(Math.abs(S-this.S)<0.0005&&H===this.H&&dpr===this.dpr&&cw===this.cw&&ch===this.ch)return false;
    this.S=S;this.H=H;this.dpr=dpr;this.cw=cw;this.ch=ch;this.x0=Math.round((cw-w)/2);this.y0=Math.round((ch-h)/2);
    [this.gl,this.ui].forEach(function(c){c.style.left=Pantalla.x0+'px';c.style.top=Pantalla.y0+'px';c.style.width=Math.round(w)+'px';c.style.height=Math.round(h)+'px';});
    this.ui.width=Math.round(w*dpr);this.ui.height=Math.round(h*dpr);
    this.g.setTransform(S*dpr,0,0,S*dpr,0,0);
    ANCHO=412;ALTO=H;
    if(this.alCambiar)this.alCambiar(Math.round(w),Math.round(h),dpr);
    return true;
  },
  revisar:function(){this.cuenta++;if(this.pedir||this.cuenta%30===0)this.medir();},
  /* de la ventana a unidades de diseño, y al revés (para las pruebas) */
  aMundo:function(cx,cy){var r=this.ui.getBoundingClientRect();return{x:(cx-r.left)/this.S,y:(cy-r.top)/this.S};},
  aVentana:function(x,y){var r=this.ui.getBoundingClientRect();return{x:r.left+x*this.S,y:r.top+y*this.S};}
};
function lin(g,x0,y0,x1,y1,paradas){var d=g.createLinearGradient(x0,y0,x1,y1);
  for(var i=0;i<paradas.length;i++)d.addColorStop(paradas[i][0],paradas[i][1]);return d;}
function rad(g,x,y,r0,r1,paradas){var d=g.createRadialGradient(x,y,r0,x,y,r1);
  for(var i=0;i<paradas.length;i++)d.addColorStop(paradas[i][0],paradas[i][1]);return d;}
function halo(g,x,y,r,col,fuerza){
  g.save();g.globalCompositeOperation='lighter';
  g.fillStyle=rad(g,x,y,0,r,[[0,'rgba('+col+','+(fuerza||0.9)+')'],[0.45,'rgba('+col+',0.28)'],[1,'rgba('+col+',0)']]);
  g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.restore();
}
/* ---------------- las imágenes (vienen como data: en window.ARCHIVOS) ---------------- */
var IMG={};
function cargarAssets(listo){
  var A=window.ARCHIVOS||{}, faltan=0;
  Object.keys(A).forEach(function(n){
    if(typeof A[n]!=='string'||A[n].indexOf('data:image')!==0)return;
    faltan++;var im=new Image();im.onload=function(){IMG[n]=im;if(--faltan===0&&listo)listo();};im.onerror=function(){if(--faltan===0&&listo)listo();};im.src=A[n];
  });
  if(!faltan&&listo)listo();
}
