
/* ---------------- entrada: gestos de pelea y toques de menú ----------------
   En la pelea cada dedo es un gesto: tocar = golpe, deslizar = golpe fuerte,
   salto, barrida o retroceso, y mantener quieto = cubrirse. El gesto se lee
   APENAS el dedo se corre 26 unidades: esperar a que suelte lo haría lento.
   En los menús vale lo de siempre: el botón responde al soltar sin correr el dedo. */
var Entrada={
  dedos:{}, tocando:false, x:0, y:0, x0:0, y0:0, acx:0, acy:0, id:null, filtro:null,
  tecla:{}, EDGE:{}, toques:[], suelta:null, gestos:[], cubre:false,
  iniciar:function(lienzo){
    var E=this;
    var idDe=function(t){return t.identifier!==undefined?t.identifier:'m';};
    var abajo=function(e){
      var ts=e.changedTouches?e.changedTouches:[e];
      for(var i=0;i<ts.length;i++){
        var t=ts[i], p=Pantalla.aMundo(t.clientX,t.clientY), id=idDe(t);
        E.toques.push({x:p.x,y:p.y,id:id});
        var enBoton=!!(E.filtro&&E.filtro(p.x,p.y));
        E.dedos[id]={x0:p.x,y0:p.y,x:p.x,y:p.y,t0:performance.now(),usado:enBoton,boton:enBoton};
        if(E.id===null&&!enBoton){E.id=id;E.tocando=true;E.x=E.x0=p.x;E.y=E.y0=p.y;}
      }
      if(e.cancelable)e.preventDefault();
    };
    var mover=function(e){
      var ts=e.changedTouches?e.changedTouches:[e];
      for(var i=0;i<ts.length;i++){
        var t=ts[i], id=idDe(t), d=E.dedos[id];
        if(!d)continue;
        var p=Pantalla.aMundo(t.clientX,t.clientY);
        if(id===E.id){E.acx+=p.x-E.x;E.acy+=p.y-E.y;E.x=p.x;E.y=p.y;}
        d.x=p.x;d.y=p.y;
        var dx=p.x-d.x0, dy=p.y-d.y0;
        if(!d.usado&&dx*dx+dy*dy>26*26){
          d.usado=true;d.corrido=true;
          E.gestos.push({tipo:'desliza',dir:Math.abs(dx)>Math.abs(dy)?(dx>0?'der':'izq'):(dy>0?'aba':'arr')});
        }
      }
      if(e.cancelable)e.preventDefault();
    };
    var arriba=function(e){
      var ts=e.changedTouches?e.changedTouches:[e];
      for(var i=0;i<ts.length;i++){
        var id=idDe(ts[i]), d=E.dedos[id];
        if(d&&!d.usado&&!d.cubriendo&&performance.now()-d.t0<300)E.gestos.push({tipo:'toca'});
        delete E.dedos[id];
        if(id===E.id){
          E.suelta={dx:E.x-E.x0,dy:E.y-E.y0,x0:E.x0,y0:E.y0,x:E.x,y:E.y};
          E.id=null;E.tocando=false;
        }
      }
      if(e.cancelable)e.preventDefault();
    };
    lienzo.addEventListener('touchstart',abajo,{passive:false});
    lienzo.addEventListener('touchmove',mover,{passive:false});
    lienzo.addEventListener('touchend',arriba,{passive:false});
    lienzo.addEventListener('touchcancel',arriba,{passive:false});
    lienzo.addEventListener('mousedown',abajo);
    addEventListener('mousemove',function(e){if(E.dedos.m)mover(e);});
    addEventListener('mouseup',arriba);
    addEventListener('keydown',function(e){
      if(!E.tecla[e.code])E.EDGE[e.code]=true;
      E.tecla[e.code]=true;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].indexOf(e.code)>=0)e.preventDefault();
    });
    addEventListener('keyup',function(e){E.tecla[e.code]=false;});
    addEventListener('blur',function(){E.tecla={};E.dedos={};E.id=null;E.tocando=false;});
  },
  /* cubrirse: algún dedo apoyado, quieto, hace más de 200 ms (un toque de verdad dura ~100) */
  medirCubre:function(){
    var ahora=performance.now(), c=false;
    for(var k in this.dedos){
      var d=this.dedos[k];
      if(d.usado)continue;
      var dx=d.x-d.x0, dy=d.y-d.y0;
      if(ahora-d.t0>200&&dx*dx+dy*dy<18*18){d.cubriendo=true;c=true;}
    }
    this.cubre=c||!!this.tecla['Space'];
  },
  recien:function(c){return !!this.EDGE[c];},
  /* se borra al FINAL del paso: si no, un "recién apretado" nunca se lee */
  fin:function(){this.EDGE={};this.toques.length=0;this.acx=0;this.acy=0;this.suelta=null;this.gestos.length=0;}
};
