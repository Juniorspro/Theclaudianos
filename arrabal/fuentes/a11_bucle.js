
/* ===========================================================================
   ESTADOS, TOQUES, BUCLE Y ARRANQUE
   ========================================================================= */
var J={estado:'portada',t:0,cuadro:0,tMenu:0,fundido:0,monVis:0,scroll:0,velS:0,maxScroll:0,
  pelea:null,cartaVista:null,nodoVisto:0,cofre:null,res:null,bot:false,volverA:'menu',sel:0,tSel:20,tMenuSel:0,elegido:0,arc:null,tCont:0,ini:[0,0,0],iniSlot:0};
var M=null;
function irA(e){
  if(e!==J.estado)J.previo=J.estado;
  J.estado=e;UI.limpiar();J.fundido=0.28;J.tMenu=0;J.scroll=0;J.velS=0;
  ['est0','est1','est2','subioSono'].forEach(function(k){J[k]=false;});
  if(e==='mapa')J.scroll=lim((Prog.avance-3)*128+Math.floor((Prog.avance-1)/5)*90,0,Math.max(0,anchoMapa()-ANCHO));
  if(e==='selec'){J.tMenuSel=0;J.elegido=0;}
  if(e==='portada'&&!(M&&M.modo==='demo'))nuevaDemo();
  if(e==='relicario'){J.cofre=null;Sonido.musica('relicario');}
  else if(['portada','menu','mapa','equipo','coleccion','detalle','arbol','ajustes','resultado','selec','vs','ranking'].indexOf(e)>=0)Sonido.musica(e==='vs'?'jefe':'menu');
}
function empezarPelea(pe){nuevaPelea(pe);irA('pelea');Sonido.musica(pe.jefe?'jefe':BARRIOS[pe.barrio].mus);}
function manejarToques(){
  var id=UI.tocado();
  if(id){
    Sonido.iniciar();
    if(J.estado==='pelea'&&M&&!(M.intro>0)&&!M.cine&&!(M.entre>0)){
      if(id==='pausa'){Sonido.fx('clic');irA('pausa');}
      else orden(M.act[0],id);
    }
    return;
  }
  id=UI.soltado();
  if(!id)return;
  Sonido.iniciar();Sonido.fx('clic');
  var E=J.estado;
  if(id==='volver'){
    irA(E==='arbol'?'detalle':E==='detalle'?'coleccion':E==='ajustes'?(J.volverA||'menu'):E==='equipo'&&J.pelea?'mapa':'menu');return;
  }
  /* el salón */
  if(id==='empezar'){Sonido.fx('ficha');irA('menu');return;}
  if(id==='arcade'){empezarArcade();return;}
  if(id==='ranking'){J.nuevoRecord=null;irA('ranking');return;}
  if(id.indexOf('sel:')===0&&!J.elegido){var i2=+id.split(':')[1];if(i2===J.sel)elegirArcade();else{J.sel=i2;J.tMenuSel=0;Sonido.fx('blip');}return;}
  if(id==='elegir'&&!J.elegido){elegirArcade();return;}
  if(id==='continuar'){J.arc.puntos=0;J.arc.continues++;Sonido.fx('ficha');irA('vs');return;}
  if(id==='rendirArcade'){juegoTerminado();return;}
  if(id==='finArcade'){if(J.estado==='campeon'&&entraEnRanking(J.arc.puntos)){J.ini=[0,0,0];J.iniSlot=0;irA('iniciales');}else irA('ranking');return;}
  if(id.indexOf('ini:')===0){var q=id.split(':'), s=+q[2];J.iniSlot=s;
    if(q[1]==='up')J.ini[s]=(J.ini[s]+1)%LETRAS.length;else if(q[1]==='dn')J.ini[s]=(J.ini[s]+LETRAS.length-1)%LETRAS.length;
    Sonido.fx('blip');return;}
  if(id==='iniListo'){guardarIniciales();return;}
  if(id==='mapa'){J.pelea=null;irA('mapa');}
  else if(id==='equipo'){J.pelea=null;irA('equipo');}
  else if(id==='coleccion')irA('coleccion');
  else if(id==='relicario')irA('relicario');
  else if(id==='ajustes'){J.volverA=E==='pausa'?'pausa':'menu';irA('ajustes');}
  else if(id.indexOf('pelea:')===0){J.pelea=peleaDe(+id.split(':')[1]);irA('equipo');}
  else if(id==='pelear'&&J.pelea)empezarPelea(J.pelea);
  else if(id.indexOf('carta:')===0){J.cartaVista=id.split(':')[1];irA('detalle');}
  else if(id==='mejorar'){
    var inst=Prog.cartas[J.cartaVista], pr=precioNivel(inst);
    if(inst.nivel<RAREZA[cartaDe(inst.id).r].max&&Prog.monedas>=pr){Prog.monedas-=pr;inst.nivel++;inst.xp=0;guardarProg();Sonido.fx('sube');vibrar(30);}
    else Sonido.fx('no');
  }
  else if(id==='arbol'){J.nodoVisto=0;irA('arbol');}
  else if(id.indexOf('nodo:')===0){J.nodoVisto=+id.split(':')[1];Sonido.fx('blip');}
  else if(id==='aprender'){
    var ic=Prog.cartas[J.cartaVista], n=ARBOL[J.nodoVisto], p=precioNodo(J.nodoVisto);
    if(!ic.arbol[n.id]&&ic.nivel>=n.req&&Prog.monedas>=p){Prog.monedas-=p;ic.arbol[n.id]=true;guardarProg();Sonido.fx('compra');vibrar(30);}
    else Sonido.fx('no');
  }
  else if(id==='abrir')abrirCofre();
  else if(id==='seguir')irA('pelea');
  else if(id==='rendirse'){irA('pelea');M.cartel=null;M.entre=0;terminarPelea('perdio');M.fin=0.01;}
  else if(id==='siguiente'){J.pelea=peleaDe(J.res.n+1);irA('equipo');}
  else if(id==='reintentar'){J.pelea=peleaDe(J.res.n);irA('equipo');}
  else if(tocarEquipo(id)){}
  else tocarAjuste(id);
}
var CUADRO=1/60;
var Bucle={acum:0,ultimo:0,msDibujo:0,
  iniciar:function(){var self=this;requestAnimationFrame(function paso(ts){requestAnimationFrame(paso);self.cuadro(ts);});},
  cuadro:function(ts){
    var dtR=Math.min(0.1,Math.max(0,(ts-(this.ultimo||ts))/1000));this.ultimo=ts;this.acum+=dtR;
    var n=0;while(this.acum>=CUADRO&&n<4){this.acum-=CUADRO;n++;this.pasar(CUADRO);}
    var t0=performance.now();this.dibujar();this.msDibujo=this.msDibujo*0.9+(performance.now()-t0)*0.1;
  },
  adelantar:function(n){for(var i=0;i<n;i++)this.pasar(CUADRO);},
  pasar:function(dt){
    J.t+=dt;J.cuadro++;J.tMenu+=dt;
    if(J.fundido>0)J.fundido=Math.max(0,J.fundido-dt);
    Sonido.correr();
    Entrada.medirCubre();
    /* el golpe congela la pelea unos cuadros: la entrada NO se consume, sale después */
    if(FX.congelado>0&&J.estado==='pelea'){FX.congelado--;return;}
    manejarToques();
    var E=J.estado;
    if(E==='pelea'){
      if(Entrada.recien('Escape')||Entrada.recien('KeyP'))irA('pausa');
      else pasarPelea(dt);
    } else if(E==='portada'){
      if(M&&M.modo==='demo'){if(FX.congelado>0)FX.congelado--;else pasarPelea(dt);}
      if(Entrada.recien('Enter')||Entrada.recien('Space')){Sonido.fx('ficha');irA('menu');}
    } else {
      if(E==='selec'){J.tMenuSel+=dt;
        if(J.elegido>0){J.elegido-=dt;if(J.elegido<=0){J.elegido=0;irA('vs');Sonido.fx('vs');}}
        else{pasarSelec(dt);
          var nL=ORDEN_LUCH.length;
          if(Entrada.recien('ArrowRight')){J.sel=(J.sel+1)%nL;J.tMenuSel=0;Sonido.fx('blip');}
          if(Entrada.recien('ArrowLeft')){J.sel=(J.sel+nL-1)%nL;J.tMenuSel=0;Sonido.fx('blip');}
          if(Entrada.recien('Enter'))elegirArcade();}}
      if(E==='vs'&&J.tMenu>2.9)arrancarPeleaArcade();
      if(E==='continuar')pasarContinuar(dt);
      if(E==='mapa')pasarScrollX(dt,anchoMapa()-ANCHO);
      if(E==='equipo'||E==='coleccion')pasarScroll(dt,J.maxScroll);
      if(E==='relicario')pasarRelicario(dt);
      if(E==='resultado')pasarResultado();
      if(E!=='pausa')FX.pasar(dt);
    }
    Entrada.fin();
  },
  dibujar:function(){
    Pantalla.revisar();
    if(ESC.h===0||Pantalla.cambio){medirEscenario();Pantalla.cambio=false;}
    var g=Pantalla.g, t=J.t;
    UI.apretado=null;
    if(Entrada.tocando){var r=UI.bajo(Entrada.x0,Entrada.y0);if(r&&UI.bajo(Entrada.x,Entrada.y)===r)UI.apretado=r.id;}
    for(var k in Entrada.dedos){var d=Entrada.dedos[k];if(d.boton){var rb=UI.bajo(d.x0,d.y0,true);if(rb)UI.apretado=rb.id;}}
    UI.limpiar();
    g.save();
    if(FX.sac>0.3)g.translate((az()-0.5)*FX.sac,(az()-0.5)*FX.sac);
    g.fillStyle='#0e0818';g.fillRect(-20,-20,ANCHO+40,ALTO+40);
    var E=J.estado;
    if(E==='pelea'){dibujarPelea(g,t);dibujarHUDPelea(g,t);dibujarControles(g,t);
      if(M.cine)dibujarCine(g,t);dibujarIntro(g,t);dibujarCartel(g,t);}
    else if(E==='pausa')dibujarPausa(g,t);
    else if(E==='portada')dibujarAtraccion(g,t);
    else if(E==='menu')dibujarMenu(g,t);
    else if(E==='selec')dibujarSelec(g,t);
    else if(E==='vs')dibujarVSArcade(g,t);
    else if(E==='continuar')dibujarContinuar(g,t);
    else if(E==='campeon')dibujarCampeon(g,t);
    else if(E==='gameover')dibujarGameOver(g,t);
    else if(E==='iniciales')dibujarIniciales(g,t);
    else if(E==='ranking')dibujarRanking(g,t);
    else if(E==='mapa')dibujarMapa(g,t);
    else if(E==='equipo')dibujarEquipo(g,t);
    else if(E==='coleccion')dibujarColeccion(g,t);
    else if(E==='detalle')dibujarDetalle(g,t);
    else if(E==='arbol')dibujarArbol(g,t);
    else if(E==='relicario')dibujarRelicario(g,t);
    else if(E==='resultado')dibujarResultado(g,t);
    else if(E==='campeon'){}
    else if(E==='ajustes')dibujarAjustes(g,t);
    if(E!=='pelea'&&E!=='pausa'){g.save();FX.dibujar(g);g.restore();}
    if(FX.flash>0){g.fillStyle='rgba(255,250,235,'+(FX.flash*0.6).toFixed(3)+')';g.fillRect(0,0,ANCHO,ALTO);}
    if(J.fundido>0){g.fillStyle='rgba(8,4,14,'+(J.fundido/0.28*0.8).toFixed(3)+')';g.fillRect(-20,-20,ANCHO+40,ALTO+40);}
    g.restore();
    capaCRT(g);                  /* el vidrio del tubo, encima de todo */
    if(window.Idioma)Idioma.dibujar(g,ANCHO,ALTO,t);
  }
};
function arrancar(){
  cargarProg();
  J.monVis=Prog.monedas;
  Sonido.volM=Prog.aj.musica;Sonido.volE=Prog.aj.efectos;
  var lz=document.getElementById('lienzo');
  Pantalla.iniciar(lz);
  if(window.Idioma)Idioma.iniciar('arrabal',function(x,y){return Pantalla.aMundo(x,y);},'216,178,90');
  Pantalla.alCambiar=function(){Pantalla.cambio=true;};
  Entrada.iniciar(lz);
  /* en la pelea todo dedo es del mando (no hay gestos); en los menús, sólo los botones inmediatos */
  Entrada.filtro=function(x,y){return J.estado==='pelea'||!!UI.bajo(x,y,true);};
  medirEscenario();
  cargarAssets();
  /* iOS: el audio web respeta el interruptor de silencio y arranca suspendido. Se pide la
     categoría "reproducción" (iOS 17 en adelante), se suena un <audio> mudo en bucle (en los iOS
     viejos eso pasa la sesión a reproducción) y el contexto se reanuda en CADA toque. */
  var SILENCIO='data:audio/wav;base64,UklGRsQPAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAPAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA', mudo=null;
  var prender=function(){
    Sonido.iniciar();
    try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}
    if(Sonido.ac&&Sonido.ac.state!=='running'&&Sonido.ac.resume)Sonido.ac.resume();
    if(!mudo){try{mudo=new Audio(SILENCIO);mudo.loop=true;mudo.volume=0.01;var pr=mudo.play();if(pr&&pr.catch)pr.catch(function(){mudo=null;});}catch(e){mudo=null;}}
  };
  ['touchstart','touchend','mousedown','keydown'].forEach(function(ev){addEventListener(ev,prender,{passive:true});});
  if(window.Idioma)Idioma.alTocar.push(prender);
  addEventListener('touchstart',prender,{once:true});addEventListener('mousedown',prender,{once:true});addEventListener('keydown',prender,{once:true});
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){if(J.estado==='pelea')irA('pausa');if(Sonido.ac&&Sonido.ac.suspend)Sonido.ac.suspend();}
    else if(Sonido.ac&&Sonido.ac.resume)Sonido.ac.resume();
  });
  irA('portada');
  Bucle.iniciar();
  var c=document.getElementById('cargando');if(c)c.style.display='none';
  /* sondas para el banco de pruebas: el juego no las usa */
  window.__A={listo:true,J:J,Prog:Prog,UI:UI,Sonido:Sonido,
    estado:function(){return J.estado;},
    ir:function(e){irA(e);},
    anda:function(n){Bucle.adelantar(n||1);},
    dibujarYa:function(){Bucle.dibujar();},
    aVentana2:function(x,y){return Pantalla.aVentana(x,y);},
    bot:function(v){J.bot=v!==false;},
    quieto:function(v){J.quietoE=v!==false;},
    medidor:function(n){if(M)M.act[0].med=n;},
    nivelar:function(n){for(var k in Prog.cartas){var c=Prog.cartas[k];c.nivel=Math.min(n,RAREZA[cartaDe(k).r].max);}guardarProg();},
    pelea:function(n){J.pelea=peleaDe(n||1);empezarPelea(J.pelea);},
    arcade:function(l){J.sel=ORDEN_LUCH.indexOf(l||'morocha');irA('selec');elegirArcade();J.elegido=0;irA('vs');J.tMenu=3;arrancarPeleaArcade();},
    ronda:function(){return M?{ronda:M.ronda,vic:M.vic.slice(),puntos:M.puntos,modo:M.modo,entre:M.entre>0,bonus:M.bonus&&M.bonus.total}:null;},
    arc:function(){return J.arc?{l:J.arc.l,i:J.arc.i,de:J.arc.escalera.length,puntos:J.arc.puntos}:null;},
    saltarIntro:function(){if(M)M.intro=0;},
    orden:function(o){if(M)orden(M.act[0],o);},
    gesto:function(g){Entrada.gestos.push(g);},
    mundo:function(){if(!M)return null;var f=function(F){return{l:F.l,vida:Math.round(F.vida),max:F.vidaMax,est:F.est,x:Math.round(F.x),y:Math.round(F.y),med:+F.med.toFixed(2),combo:F.combo,ko:F.ko};};
      return{j:f(M.act[0]),e:f(M.act[1]),idx:M.idx.slice(),vivos:[vivos(0),vivos(1)],reloj:Math.round(M.reloj),proy:M.proy.length,resultado:M.resultado,combo:M.comboMax.slice()};},
    imgs:function(){return Object.keys(IMG).sort();},
    tocar:function(id){var d=UI.donde(id);if(!d)return false;
      if(d.inm)Entrada.toques.push({x:d.x,y:d.y,id:'p'});else Entrada.suelta={dx:0,dy:0,x0:d.x,y0:d.y,x:d.x,y:d.y};
      manejarToques();Entrada.fin();return true;},
    botones:function(){return UI.rects.map(function(r){return r.id;});},
    donde:function(id){var d=UI.donde(id);if(!d)return null;var v=Pantalla.aVentana(d.x,d.y);return{x:v.x,y:v.y,inm:d.inm};},
    aVentana:function(x,y){return Pantalla.aVentana(x,y);},
    mando:function(){return Mando.botones();},
    mundo2:function(){return{j:M.act[0],e:M.act[1],palo:Mando.palo,dx:Mando.dx,dy:Mando.dy};},
    darTodo:function(){CARTAS.forEach(function(c){if(!Prog.cartas[c.id])Prog.cartas[c.id]=cartaNueva(c.id);});Prog.monedas=99999;Prog.fichas=20;guardarProg();},
    borrar:function(){try{localStorage.removeItem('arrabal.v1');}catch(e){}},
    medidas:function(){return{msDibujo:Bucle.msDibujo,W:Pantalla.W,H:Pantalla.H,escH:ESC.h,part:FX.part.length};},
    matarRival:function(){if(M){var E=M.act[1];E.vida=1;}}
  };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrancar);else arrancar();
