var GANANCIA_SFX={golpe1:0.8,golpe2:0.9,golpe3:1,patada:0.9,madera:0.7,metal:0.55,garra:0.7,bloqueo:0.8,
  silbido:0.4,silbido2:0.5,critico:0.8,ko:1,caida:0.85,cae:0.5,fuego:0.7,electro:0.6,agua:0.7,viento:0.6,cadena:0.6,dash:0.45};
var Sonido={
  ac:null, maestro:null, busM:null, busE:null, busP:null, ruido:null, activo:true,
  volM:0.8, volE:0.9, paso:0, tProx:0, tema:'menu', temaProx:null,
  pistas:{}, fuente:null, ganFuente:null, fuenteTema:null,
  iniciar:function(){
    if(this.ac)return;
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    this.ac=new AC();
    this.maestro=this.ac.createGain();this.maestro.connect(this.ac.destination);
    /* un poco de sala: el espacio no suena a auricular pegado */
    var conv=this.ac.createConvolver(), largo=Math.floor(this.ac.sampleRate*1.3);
    var b=this.ac.createBuffer(2,largo,this.ac.sampleRate);
    for(var c=0;c<2;c++){var d=b.getChannelData(c);
      for(var i=0;i<largo;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/largo,2.4);}
    conv.buffer=b;
    this.sala=this.ac.createGain();this.sala.gain.value=0.2;
    this.sala.connect(conv);conv.connect(this.maestro);
    this.busM=this.ac.createGain();this.busM.connect(this.maestro);this.busM.connect(this.sala);
    this.busE=this.ac.createGain();this.busE.connect(this.maestro);
    /* las pistas grabadas no pasan por la sala: ya vienen mezcladas */
    this.busP=this.ac.createGain();this.busP.connect(this.maestro);
    var n=this.ac.createBuffer(1,this.ac.sampleRate,this.ac.sampleRate), dd=n.getChannelData(0);
    for(var k=0;k<dd.length;k++)dd[k]=Math.random()*2-1;
    this.ruido=n;
    this.tProx=this.ac.currentTime+0.05;
    this.aplicarVol();
    this.decodificar();
  },
  aplicarVol:function(){
    if(!this.ac)return;
    this.maestro.gain.value=this.activo?0.62:0;
    this.busM.gain.value=0.5*this.volM;
    this.busP.gain.value=0.85*this.volM;
    this.busE.gain.value=0.9*this.volE;
  },
  /* la música generada viaja como data: adentro del HTML. Sin fetch: desde file://
     un fetch a data: se bloquea en silencio. Se decodifica a mano. */
  /* un MP3: si viene como data: se decodifica a mano; si es una URL (streaming), se baja */
  bajar:function(d,listo){
    var S=this;
    if(d.indexOf('data:')===0){var bin=atob(d.slice(d.indexOf(',')+1)), buf=new Uint8Array(bin.length);
      for(var i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);S.ac.decodeAudioData(buf.buffer,listo,function(){});return;}
    fetch(d).then(function(r){return r.arrayBuffer();}).then(function(ab){S.ac.decodeAudioData(ab,listo,function(){});}).catch(function(){});
  },
  decodificar:function(){
    var A=window.ARCHIVOS||{}, S=this;
    ['menu','conventillo','milonga','riachuelo','jefe','relicario'].forEach(function(n){
      var d=A['musica-'+n];
      if(d)try{S.bajar(d,function(ab){S.pistas[n]=ab;});}catch(e){}
    });
    /* los efectos grabados de la pelea: un solo MP3 y el mapa de dónde está cada uno */
    if(A.sfx&&A.sfxMapa)try{S.bajar(A.sfx,function(ab){S.sfx=ab;});}catch(e){}
  },
  ahora:function(){return this.ac?this.ac.currentTime:0;},
  /* un tono con envolvente: la base de casi todos los efectos */
  tono:function(o){
    if(!this.ac||!this.activo)return;
    var t=o.t||this.ahora(), g=this.ac.createGain(), s=this.ac.createOscillator();
    s.type=o.tipo||'square';
    s.frequency.setValueAtTime(o.f,t);
    if(o.det)s.detune.setValueAtTime(o.det,t);
    if(o.f2)s.frequency.exponentialRampToValueAtTime(Math.max(20,o.f2),t+(o.dur||0.2));
    var v=o.vol===undefined?0.2:o.vol;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(v,t+(o.at||0.005));
    g.gain.exponentialRampToValueAtTime(0.0001,t+(o.dur||0.2));
    var sal=g;
    if(o.filtro){var f=this.ac.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(o.filtro,t);
      if(o.filtro2)f.frequency.exponentialRampToValueAtTime(o.filtro2,t+(o.dur||0.2));
      g.connect(f);sal=f;}
    s.connect(g);sal.connect(o.bus||this.busE);
    if(o.sala)sal.connect(this.sala);
    s.start(t);s.stop(t+(o.dur||0.2)+0.05);
  },
  /* ruido filtrado: explosiones, motores, roce */
  soplo:function(o){
    if(!this.ac||!this.activo)return;
    var t=o.t||this.ahora(), f=o.f||900, dur=o.dur||0.3;
    var s=this.ac.createBufferSource();s.buffer=this.ruido;s.loop=true;
    s.playbackRate.value=0.7+Math.random()*0.6;
    var bp=this.ac.createBiquadFilter();bp.type=o.tipo||'lowpass';
    bp.frequency.setValueAtTime(f,t);
    bp.frequency.exponentialRampToValueAtTime(Math.max(60,o.f2||f*0.25),t+dur);
    bp.Q.value=o.q||1;
    var g=this.ac.createGain();
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(o.vol===undefined?0.3:o.vol,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    s.connect(bp);bp.connect(g);g.connect(o.bus||this.busE);
    if(o.sala!==false)g.connect(this.sala);
    s.start(t);s.stop(t+dur+0.05);
  },
  fx:function(n,vol){if(!this.muestra(n,vol))SONIDOS_FX(n);},
  /* un efecto grabado: una variante al azar (distinta de la última), con el tono corrido ±6 % */
  ultimo:{},
  muestra:function(n,vol){
    var M=(window.ARCHIVOS||{}).sfxMapa, vs=M&&M[n];
    if(!this.ac||!this.activo||!this.sfx||!vs)return false;
    var k=Math.floor(Math.random()*vs.length);
    if(vs.length>1&&k===this.ultimo[n])k=(k+1)%vs.length;
    this.ultimo[n]=k;
    /* si el navegador no recortó el retardo del MP3, todo el archivo viene corrido 1105 muestras */
    var corre=this.sfx.duration-M._largo>0.005?1105/32000:0;
    var s=this.ac.createBufferSource(), g=this.ac.createGain(), t=this.ac.currentTime;
    s.buffer=this.sfx;s.playbackRate.value=0.94+Math.random()*0.12;
    g.gain.value=(GANANCIA_SFX[n]||0.8)*(vol===undefined?1:vol);
    s.connect(g);g.connect(this.busE);
    if(n==='ko'||n==='critico'||n==='golpe3')g.connect(this.sala);
    s.start(t,vs[k][0]+corre,vs[k][1]);
    return true;
  },
  musica:function(n){ if(this.tema!==n||this.temaProx)this.temaProx=n; },
  ponerPista:function(T){
    this.quitarPista();
    var s=this.ac.createBufferSource(), g=this.ac.createGain(), t=this.ac.currentTime;
    s.buffer=this.pistas[T];s.loop=true;
    /* el MP3 trae silencio del codificador al principio (y relleno al final) si el navegador no
       lo recorta: el bucle se ajusta al largo exacto con el que se compuso el tema */
    var meta=(window.ARCHIVOS||{}).musica, d=meta&&meta[T], sobra=d?s.buffer.duration-d:0;
    if(d&&sobra>0.005){s.loopStart=Math.min(sobra,1105/32000);s.loopEnd=s.loopStart+d;}
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(1,t+0.7);
    s.connect(g);g.connect(this.busP);s.start(t,s.loopStart||0);
    this.fuente=s;this.ganFuente=g;this.fuenteTema=T;
  },
  quitarPista:function(){
    if(!this.fuente)return;
    var t=this.ac.currentTime, g=this.ganFuente, s=this.fuente;
    g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(Math.max(0.0001,g.gain.value),t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.5);
    try{s.stop(t+0.55);}catch(e){}
    this.fuente=null;this.fuenteTema=null;
  },
  /* si hay pista generada, suena esa; si no, el secuenciador sintetiza el tema */
  correr:function(){
    if(!this.ac||!this.activo)return;
    var T=this.temaProx||this.tema;
    if(this.pistas[T]){
      if(this.temaProx){this.tema=T;this.temaProx=null;}
      if(this.fuenteTema!==T)this.ponerPista(T);
      return;
    }
    if(this.fuente)this.quitarPista();
    var t=this.ac.currentTime;
    if(this.tProx<t)this.tProx=t+0.05;
    /* se programa con adelanto: si se espera al cuadro, el ritmo cojea */
    while(this.tProx<t+0.3){
      if(this.temaProx&&this.paso%16===0){this.tema=this.temaProx;this.temaProx=null;}
      this.pasoMusica(this.paso,this.tProx);
      this.tProx+=this.dur();this.paso++;
    }
  },
  dur:function(){return 60/TEMAS[this.tema].bpm/4;},
  midi:function(m){return 440*Math.pow(2,(m-69)/12);},
  pasoMusica:function(p,t){pasoTango(this,p,t);}
};
