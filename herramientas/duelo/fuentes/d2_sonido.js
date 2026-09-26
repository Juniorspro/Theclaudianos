var GANANCIA_SFX={patada:0.9,patada2:1,cabezazo:0.85,poste:0.8,red:0.8,silbato:0.7,gol:1,rebote:0.5,salto:0.45,
  super:0.9,fuego:0.8,hielo:0.8,chancleta:0.8,onda:0.9,clic:0.5,moneda:0.7,cofre:0.9,abucheo:0.6,festejo:0.9,chilena:1,silbatofin:0.7,rayo:0.8,soga:0.8};
/* si un efecto no está grabado, un tono corto: nunca queda mudo del todo */
function SONIDOS_FX(n){
  var S=Sonido;if(!S.ac||!S.activo)return;
  var t=S.ahora();
  if(n==='clic')S.tono({f:900,f2:1300,dur:0.05,vol:0.08,tipo:'square',t:t,filtro:4000});
  else S.tono({f:220,f2:90,dur:0.1,vol:0.15,tipo:'sine',t:t});
}
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
  decodificar:function(){
    var A=window.ARCHIVOS||{}, S=this;
    ['menu','partido','hinchada'].forEach(function(n){
      var d=A['musica-'+n];
      if(!d)return;
      try{
        var bin=atob(d.slice(d.indexOf(',')+1)), buf=new Uint8Array(bin.length);
        for(var i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
        S.ac.decodeAudioData(buf.buffer,function(ab){S.pistas[n]=ab;},function(){});
      }catch(e){}
    });
    /* las voces del relator: otro MP3 con mapa, igual que los efectos */
    if(A.voces&&A.vocesMapa){try{
      var bv=atob(A.voces.slice(A.voces.indexOf(',')+1)), b3=new Uint8Array(bv.length);
      for(var j=0;j<bv.length;j++)b3[j]=bv.charCodeAt(j);
      S.ac.decodeAudioData(b3.buffer,function(ab){S.voces=ab;},function(){});
    }catch(e){}}
    /* los efectos grabados de la pelea: un solo MP3 y el mapa de dónde está cada uno */
    var d=A.sfx;
    if(d&&A.sfxMapa){try{
      var bin=atob(d.slice(d.indexOf(',')+1)), b2=new Uint8Array(bin.length);
      for(var i=0;i<bin.length;i++)b2[i]=bin.charCodeAt(i);
      S.ac.decodeAudioData(b2.buffer,function(ab){S.sfx=ab;},function(){});
    }catch(e){}}
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
  /* el relator: una frase por vez (la de gol pisa a las otras); la música y la hinchada bajan mientras habla */
  tVoz:0, fuenteVoz:null,
  voz:function(n,prob,fuerte){
    var M2=(window.ARCHIVOS||{}).vocesMapa, vs=M2&&M2[n];
    if(!this.ac||!this.activo||!this.voces||!vs||J.mudo)return;
    if(prob!==undefined&&Math.random()>prob)return;
    var t=this.ac.currentTime;
    if(!fuerte&&t<this.tVoz)return;
    if(this.fuenteVoz){try{this.fuenteVoz.stop();}catch(e){}}
    var k=Math.floor(Math.random()*vs.length);if(vs.length>1&&k===this.ultimo['voz'+n])k=(k+1)%vs.length;this.ultimo['voz'+n]=k;
    var corre=this.voces.duration-M2._largo>0.005?1105/32000:0;
    var s=this.ac.createBufferSource(), g=this.ac.createGain();
    s.buffer=this.voces;g.gain.value=1.25*Prog.aj.efectos;s.connect(g);g.connect(this.maestro);
    s.start(t,vs[k][0]+corre,vs[k][1]);this.fuenteVoz=s;this.tVoz=t+vs[k][1]+0.4;
    var bp=this.busP.gain;bp.cancelScheduledValues(t);bp.setValueAtTime(bp.value,t);bp.linearRampToValueAtTime(0.85*this.volM*0.45,t+0.08);
    bp.setValueAtTime(0.85*this.volM*0.45,t+vs[k][1]);bp.linearRampToValueAtTime(0.85*this.volM,t+vs[k][1]+0.5);
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
  /* la música es grabada (componer.py): si todavía no decodificó, silencio */
  correr:function(){
    if(!this.ac||!this.activo)return;
    var T=this.temaProx||this.tema;
    if(this.temaProx){this.tema=T;this.temaProx=null;}
    if(this.pistas[T]){if(this.fuenteTema!==T)this.ponerPista(T);}
    else if(this.fuente)this.quitarPista();
    /* la hinchada: un segundo bucle que suena abajo de la música en los partidos */
    var quiere=this.conHinchada&&this.pistas.hinchada;
    if(quiere&&!this.amb){var s=this.ac.createBufferSource(),g=this.ac.createGain(),t=this.ac.currentTime;
      s.buffer=this.pistas.hinchada;s.loop=true;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.55,t+1.2);
      s.connect(g);g.connect(this.busP);s.start(t);this.amb=s;this.ganAmb=g;}
    if(!quiere&&this.amb){var tt=this.ac.currentTime;this.ganAmb.gain.cancelScheduledValues(tt);this.ganAmb.gain.setValueAtTime(this.ganAmb.gain.value,tt);
      this.ganAmb.gain.exponentialRampToValueAtTime(0.0001,tt+0.6);try{this.amb.stop(tt+0.65);}catch(e){}this.amb=null;}
  },
  /* la hinchada se enciende un momento (gol, atajada) */
  rugir:function(k){if(this.ganAmb){var t=this.ac.currentTime;this.ganAmb.gain.cancelScheduledValues(t);this.ganAmb.gain.setValueAtTime(this.ganAmb.gain.value,t);
    this.ganAmb.gain.linearRampToValueAtTime(0.55+0.6*k,t+0.15);this.ganAmb.gain.linearRampToValueAtTime(0.55,t+2.5);}},
  conHinchada:false, amb:null, ganAmb:null
};
