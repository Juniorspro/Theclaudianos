/* ---------------- el estado de la aplicación y el bucle ---------------- */
var CUADRO=1/60;
var J={pant:'portada',t:0,tMenu:0,cuadro:0,monVis:0,trans:null,pausa:false,aviso:null,rival:null,dif:0.4,res:null,tab:0,selV:null,borrar:0};
var TRANS=0.5;
function irA(p,rapido){if(rapido){cambiarA(p);J.blanco=1;return;}if(J.trans)return;J.trans={t:0,dest:p,hecho:false};}
function cambiarA(p){var v=PANT[J.pant];if(v&&v.salir)v.salir();J.pant=p;J.tMenu=0;J.aviso=null;UI.apretado=null;if(PANT[p].entrar)PANT[p].entrar();}
function manejarToques(){
  if(J.trans)return;
  var id=UI.tocado()||UI.soltado();if(!id)return;
  if(id!=='empezar'&&id!=='poder')Sonido.fx('clic');
  PANT[J.pant].accion(id);
}
function dibujarCortina(g,c){
  if(c<=0)return;var n=7, hb=ALTO/n, sk=60, cols=['#2a5ad8','#ff8a1a','#3a7af0','#ffd23a','#2a5ad8','#e0501a','#3a7af0'];
  for(var i=0;i<n;i++){var f=lim(c*1.7-i*0.1,0,1), w=f*(ANCHO+sk*2);if(w<=0)continue;var y=i*hb, dir=i%2;
    g.fillStyle=cols[i];g.beginPath();if(dir){g.moveTo(ANCHO+sk,y);g.lineTo(ANCHO+sk-w-sk,y);g.lineTo(ANCHO+sk-w,y+hb+1);g.lineTo(ANCHO+sk,y+hb+1);}
    else{g.moveTo(-sk,y);g.lineTo(-sk+w+sk,y);g.lineTo(-sk+w,y+hb+1);g.lineTo(-sk,y+hb+1);}g.closePath();g.fill();}
}
var Bucle={acum:0,ultimo:0,msCuadro:16,
  iniciar:function(){var s=this;requestAnimationFrame(function paso(ts){requestAnimationFrame(paso);s.cuadro(ts);});},
  cuadro:function(ts){
    var dtR=Math.min(0.1,Math.max(0,(ts-(this.ultimo||ts))/1000));this.ultimo=ts;this.acum+=dtR;
    var t0=performance.now();
    if(J.congelado){this.acum=0;this.dibujar();return;}      /* el banco maneja el tiempo a mano */
    var n=0;while(this.acum>=CUADRO&&n<4){this.acum-=CUADRO;n++;this.pasar(CUADRO);}
    this.dibujar();
    /* la resolución del 3D se adapta: si el cuadro tarda, baja; si sobra, sube */
    var ms=performance.now()-t0;this.msCuadro=this.msCuadro*0.95+(dtR*1000)*0.05;
    if(J.cuadro%120===0&&J.cuadro>240){var e=Pantalla.escala3D;
      if(this.msCuadro>24&&e>0.6){Pantalla.escala3D=Math.max(0.6,e-0.1);Pantalla.pedir=true;Pantalla.S=0;ajustarCapas();if(Pantalla.escala3D<0.75)R3.post=false;}
      else if(this.msCuadro<17&&e<1){Pantalla.escala3D=Math.min(1,e+0.1);Pantalla.pedir=true;Pantalla.S=0;}}
  },
  adelantar:function(n){for(var i=0;i<n;i++)this.pasar(CUADRO);},
  pasar:function(dt){
    J.t+=dt;J.cuadro++;J.tMenu+=dt;R3.t+=dt;R3.cuadro=J.cuadro;
    if(J.blanco>0)J.blanco=Math.max(0,J.blanco-dt*3);
    if(J.aviso){J.aviso.t+=dt;if(J.aviso.t>2.2)J.aviso=null;}
    Sonido.correr();
    var E=Entrada;UI.apretado=null;
    if(E.tocando){var r=UI.bajo(E.x0,E.y0);if(r&&UI.bajo(E.x,E.y)===r)UI.apretado=r.id;}
    manejarToques();
    if(J.trans){var T=J.trans;T.t+=dt;if(!T.hecho&&T.t>=TRANS/2){T.hecho=true;cambiarA(T.dest);}if(T.t>=TRANS)J.trans=null;}
    var Pp=PANT[J.pant];if(Pp.paso)Pp.paso(dt,J.t);
    pasarCamara(dt);pasarRedes();pasarHinchada(dt);pasarBanderas(J.t);
    R3.pelota.position.copy(B.p);R3.pelota.rotation.x-=B.v.z*dt/R_PELOTA;R3.pelota.rotation.z+=B.v.x*dt/R_PELOTA;
    var sp=R3.sombraPelota;sp.position.set(B.p.x,0.01,B.p.z);var al=Math.max(0.3,1-B.p.y/4);sp.scale.set(al,al,al);sp.material.opacity=0.35*al;
    if(J.pant!=='partido'&&Entrada.recien('Escape')&&PANT[J.pant].accion)PANT[J.pant].accion('nav-menu');
    E.fin();
  },
  dibujar:function(){
    Pantalla.revisar();
    dibujar3D();
    var g=Pantalla.g;g.clearRect(0,0,ANCHO,ALTO);
    UI.limpiar();g.save();
    PANT[J.pant].dibujar(g,J.t);
    dibujarAviso(g);
    if(J.trans){var k=J.trans.t/TRANS;dibujarCortina(g,k<0.5?k*2:2-k*2);}
    if(J.blanco>0){g.fillStyle='rgba(255,255,255,'+J.blanco.toFixed(3)+')';g.fillRect(0,0,ANCHO,ALTO);}
    g.restore();
    if(window.Idioma)Idioma.dibujar(g,ANCHO,ALTO,J.t);
  }
};
function arrancar(){
  cargarProg();J.monVis=Prog.monedas;
  Sonido.volM=Prog.aj.musica;Sonido.volE=Prog.aj.efectos;
  var gl=document.getElementById('gl'), ui=document.getElementById('ui');
  Pantalla.alCambiar=function(w,h,dpr){tamano3D(w,h,dpr);};
  iniciar3D(gl);
  Pantalla.iniciar(gl,ui);
  if(window.Idioma)Idioma.iniciar('duelo',function(x,y){return Pantalla.aMundo(x,y);},'255,154,42');
  Entrada.iniciar(ui);
  cargarAssets(function(){cargarModelos(function(){
    crearJugadores();vestirJugador(YO,KITS[Prog.kit]);vestirPelota(Prog.pelota);
    armarArena(arenaActual());
    cambiarA('portada');camaraYa();
    Bucle.iniciar();
    var c=document.getElementById('cargando');if(c)c.style.display='none';
    J.listo=true;
  });});
  var SILENCIO='__SILENCIO__', mudo=null;
  var prender=function(){
    Sonido.iniciar();aplicarAjustes();
    try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}
    if(Sonido.ac&&Sonido.ac.state!=='running'&&Sonido.ac.resume)Sonido.ac.resume();
    if(!mudo){try{mudo=new Audio(SILENCIO);mudo.loop=true;mudo.volume=0.01;var pr=mudo.play();if(pr&&pr.catch)pr.catch(function(){mudo=null;});}catch(e){mudo=null;}}
  };
  ['touchstart','touchend','mousedown','keydown'].forEach(function(ev){addEventListener(ev,prender,{passive:true});});
  if(window.Idioma)Idioma.alTocar.push(prender);
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){if(J.pant==='partido')J.pausa=true;if(Sonido.ac&&Sonido.ac.suspend)Sonido.ac.suspend();}
    else if(Sonido.ac&&Sonido.ac.resume)Sonido.ac.resume();
  });
  /* sondas para el banco de pruebas: el juego no las usa */
  window.__D={J:J,UI:UI,Sonido:Sonido,E:Entrada,yo:function(){return YO;},el:function(){return EL;},posar:function(Jx,dt){posar(Jx,dt);},cam:function(){return R3.cam;},render:function(){dibujar3D();},
    listo:function(){return !!J.listo;},
    congelar:function(v){J.congelado=v!==false;},
    prog:function(){return Prog;},pant:function(){return J.pant;},
    ir:function(p){cambiarA(p);},anda:function(n){Bucle.adelantar(n||1);},dibujarYa:function(){Bucle.dibujar();},
    partido:function(){if(!P)return null;return{fase:P.fase,turno:P.turno,goles:P.goles.slice(),reloj:+P.reloj.toFixed(1),res:P.res,pod:P.pod.slice(),muerte:P.muerte,
      b:[+B.p.x.toFixed(2),+B.p.y.toFixed(2),+B.p.z.toFixed(2)],v:+B.v.length().toFixed(1),arq:{x:+P.arquero.x.toFixed(2),vol:!!P.arquero.volando}};},
    jugar:function(o){o=o||{};J.rival={nom:o.nom||'Prueba',trofeos:0,cam:'#ffd23a'};J.dif=o.dif===undefined?0.5:o.dif;empezarPartido();if(o.turno!==undefined){P.turno=o.turno;prepararTiro();}},
    /* patear como si fuera un deslizamiento: tx, ty en el arco, fuerza y efecto */
    patear:function(tx,ty,pot,curva){if(!P||P.fase!=='apunta')return false;patearYo({tx:tx,ty:ty,pot:pot||0.8,curva:curva||0});return true;},
    tirarse:function(dx,dy){if(!P)return;empezarVolada(YO,dx,dy);},
    /* como un jugador atento: se tira hacia donde apunta la pelota ahora (en línea recta: el efecto lo engaña) */
    tirarseBien:function(){var A=YO, vz=B.v.z;if(!P||Math.abs(vz)<0.5)return false;var t=(A.z-B.p.z)/vz;if(t<0)return false;
      var px=B.p.x+B.v.x*t, py=B.p.y+B.v.y*t-0.5*G_*t*t;empezarVolada(A,lim(px-A.x,-2.1,2.1),lim(py-0.8,0,1.3));ayudaVolada(A);return true;},
    fase:function(f){P.fase=f;P.tf=0;},
    reloj:function(s){if(P)P.reloj=s;},
    tocar:function(id){var d=UI.donde(id);if(!d)return false;if(d.inm)Entrada.toques.push({x:d.x,y:d.y,id:'p'});else Entrada.suelta={dx:0,dy:0,x0:d.x,y0:d.y,x:d.x,y:d.y,vx:0,vy:0};manejarToques();Entrada.fin();return true;},
    botones:function(){return UI.rects.map(function(r){return r.id;});},
    donde:function(id){var d=UI.donde(id);if(!d)return null;return Pantalla.aVentana(d.x,d.y);},
    aVentana:function(x,y){return Pantalla.aVentana(x,y);},
    pelotaEnPantalla:function(){var q=aPantalla(B.p);return Pantalla.aVentana(q.x,q.y);},
    info:function(){var i=R3.renderer.info;return{llamadas:i.render.calls,triangulos:i.render.triangles,escala:Pantalla.escala3D,ms:Bucle.msCuadro};},
    borrar:function(){try{localStorage.removeItem('duelo.v1');}catch(e){}},
    darTodo:function(){Prog.monedas=99999;Prog.gemas=999;Prog.trofeos=600;guardarProg();}
  };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrancar);else arrancar();
