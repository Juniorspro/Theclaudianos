/* ---------------- los efectos ---------------- */
function SONIDOS_FX(n){
  var S=Sonido;
  if(!S.ac||!S.activo)return;
  var t=S.ahora(), v=0.9+Math.random()*0.2;          /* ±10 %: lo que se repite no cansa */
  switch(n){
    case 'golpe1': S.soplo({f:3200*v,f2:900,dur:0.07,vol:0.2,tipo:'bandpass',q:1.4,t:t,sala:false});
                   S.tono({f:240*v,f2:90,dur:0.07,vol:0.16,tipo:'square',t:t,filtro:1500}); break;
    case 'golpe2': S.soplo({f:2200*v,f2:400,dur:0.12,vol:0.28,tipo:'bandpass',q:1,t:t,sala:false});
                   S.tono({f:170*v,f2:60,dur:0.12,vol:0.24,tipo:'sine',t:t}); break;
    case 'golpe3': S.soplo({f:1600*v,f2:120,dur:0.28,vol:0.4,t:t});
                   S.tono({f:120*v,f2:38,dur:0.26,vol:0.36,tipo:'sine',t:t});
                   S.soplo({f:5200,f2:2000,dur:0.08,vol:0.12,tipo:'highpass',t:t,sala:false}); break;
    case 'bloqueo':S.tono({f:1800*v,f2:1300,dur:0.06,vol:0.12,tipo:'square',t:t,filtro:4000});
                   S.soplo({f:4000,f2:2500,dur:0.05,vol:0.1,tipo:'bandpass',q:3,t:t,sala:false}); break;
    case 'silbido':S.soplo({f:900*v,f2:3200,dur:0.14,vol:0.1,tipo:'bandpass',q:2.2,t:t,sala:false}); break;
    case 'silbido2':S.soplo({f:500*v,f2:2600,dur:0.22,vol:0.16,tipo:'bandpass',q:1.6,t:t,sala:false}); break;
    case 'salto':  S.soplo({f:600,f2:2400,dur:0.16,vol:0.1,tipo:'bandpass',q:1.2,t:t,sala:false}); break;
    case 'cae':    S.tono({f:110,f2:50,dur:0.1,vol:0.16,tipo:'sine',t:t}); S.soplo({f:700,f2:200,dur:0.1,vol:0.1,t:t,sala:false}); break;
    case 'dash':   S.soplo({f:1400,f2:400,dur:0.2,vol:0.14,tipo:'bandpass',q:1,t:t,sala:false}); break;
    case 'caida':  S.tono({f:90,f2:40,dur:0.3,vol:0.3,tipo:'sine',t:t}); S.soplo({f:900,f2:100,dur:0.35,vol:0.26,t:t}); break;
    case 'ko':
      S.tono({f:70,f2:26,dur:1.2,vol:0.4,tipo:'sine',t:t}); S.soplo({f:1200,f2:60,dur:1,vol:0.38,t:t});
      [392,330,262].forEach(function(f,i){S.tono({f:f,dur:0.4,vol:0.08,tipo:'sawtooth',t:t+0.25+i*0.16,filtro:1400,sala:true});}); break;
    case 'entra':  S.tono({f:180,f2:720,dur:0.3,vol:0.12,tipo:'sawtooth',t:t,filtro:1800,sala:true}); S.soplo({f:600,f2:3000,dur:0.3,vol:0.1,tipo:'bandpass',q:1,t:t}); break;
    case 'carga':  S.tono({f:300,f2:1300,dur:0.35,vol:0.1,tipo:'sawtooth',t:t,filtro:2600,sala:true}); break;
    case 'super':
      S.tono({f:90,f2:900,dur:0.6,vol:0.16,tipo:'sawtooth',t:t,filtro:800,filtro2:6000,sala:true});
      S.soplo({f:300,f2:7000,dur:0.6,vol:0.2,tipo:'bandpass',q:0.8,t:t});
      S.tono({f:55,f2:30,dur:0.9,vol:0.35,tipo:'sine',t:t+0.55}); break;
    case 'fuego':  S.soplo({f:1800,f2:300,dur:0.45,vol:0.28,t:t}); S.soplo({f:5000,f2:2000,dur:0.3,vol:0.08,tipo:'highpass',t:t,sala:false}); break;
    case 'agua':   S.soplo({f:2400,f2:500,dur:0.35,vol:0.2,tipo:'bandpass',q:0.9,t:t}); S.tono({f:500,f2:1400,dur:0.12,vol:0.08,tipo:'sine',t:t}); break;
    case 'viento': S.soplo({f:500,f2:2800,dur:0.5,vol:0.2,tipo:'bandpass',q:2,t:t}); break;
    case 'electro':
      for(var e=0;e<4;e++)S.tono({f:1200+Math.random()*1800,dur:0.04,vol:0.07,tipo:'square',t:t+e*0.035,filtro:5000});
      S.soplo({f:6000,f2:3000,dur:0.18,vol:0.08,tipo:'highpass',t:t,sala:false}); break;
    case 'cadena': for(var c=0;c<5;c++)S.tono({f:2400+c*180,dur:0.03,vol:0.05,tipo:'triangle',t:t+c*0.03}); break;
    case 'metal':  S.tono({f:900*v,dur:0.25,vol:0.1,tipo:'triangle',t:t,sala:true}); S.tono({f:1370*v,dur:0.2,vol:0.06,tipo:'triangle',t:t,sala:true}); break;
    case 'vapor':  S.soplo({f:3000,f2:1500,dur:0.4,vol:0.16,tipo:'highpass',t:t}); break;
    case 'vs':
      for(var r=0;r<10;r++)S.soplo({f:2600,f2:900,dur:0.06,vol:0.06+r*0.012,tipo:'bandpass',q:1.2,t:t+r*0.06,sala:false});
      S.tono({f:110,f2:55,dur:0.7,vol:0.34,tipo:'sine',t:t+0.62});
      [220,277,330,440].forEach(function(f){S.tono({f:f,dur:0.9,vol:0.05,tipo:'sawtooth',t:t+0.62,filtro:2400,sala:true});}); break;
    case 'peleen':
      S.tono({f:65,f2:40,dur:0.8,vol:0.34,tipo:'sine',t:t});
      [440,554,659,880].forEach(function(f,i){S.tono({f:f,dur:0.28,vol:0.07,tipo:'square',t:t+i*0.05,filtro:3200,sala:true});}); break;
    case 'victoria':
      [[523,0],[659,0.12],[784,0.24],[1046,0.36],[988,0.6],[1046,0.72]].forEach(function(n){
        S.tono({f:n[0],dur:0.3,vol:0.1,tipo:'square',t:t+n[1],filtro:3600,sala:true});
        S.tono({f:n[0]/2,dur:0.3,vol:0.07,tipo:'triangle',t:t+n[1]});}); break;
    case 'derrota':
      [[440,0],[415,0.3],[392,0.6],[330,0.95]].forEach(function(n){S.tono({f:n[0],dur:0.5,vol:0.1,tipo:'sawtooth',t:t+n[1],filtro:1400,sala:true});}); break;
    case 'clic':   S.tono({f:1300,f2:1700,dur:0.04,vol:0.08,tipo:'square',t:t,filtro:4000}); break;
    case 'blip':   S.tono({f:700,f2:900,dur:0.05,vol:0.06,tipo:'triangle',t:t}); break;
    case 'pasa':   S.soplo({f:1800,f2:600,dur:0.16,vol:0.07,tipo:'bandpass',q:1.2,t:t,sala:false}); break;
    case 'no':     S.tono({f:220,dur:0.08,vol:0.1,tipo:'square',t:t,filtro:1200}); S.tono({f:180,dur:0.12,vol:0.1,tipo:'square',t:t+0.09,filtro:1200}); break;
    case 'compra': [784,988,1318,1568].forEach(function(f,i){S.tono({f:f,dur:0.14,vol:0.1,tipo:'triangle',t:t+i*0.06,sala:true});}); break;
    case 'sube':   [523,784,1046,1568].forEach(function(f,i){S.tono({f:f,dur:0.18,vol:0.1,tipo:'square',t:t+i*0.07,filtro:3000,sala:true});}); break;
    case 'cofre':  for(var k=0;k<6;k++)S.tono({f:180+Math.random()*60,dur:0.05,vol:0.12,tipo:'square',t:t+k*0.07,filtro:900}); break;
    case 'abre':   S.soplo({f:400,f2:7000,dur:0.8,vol:0.2,tipo:'bandpass',q:0.8,t:t});
                   [659,880,1175,1568,2093].forEach(function(f,i){S.tono({f:f,dur:0.5,vol:0.06,tipo:'sine',t:t+0.1+i*0.07,sala:true});}); break;
    case 'revela': S.tono({f:1046,f2:2093,dur:0.3,vol:0.08,tipo:'triangle',t:t,sala:true}); break;
    case 'legend':
      [523,659,784,1046,1318,1568,2093].forEach(function(f,i){S.tono({f:f,dur:0.4,vol:0.07,tipo:'square',t:t+i*0.06,filtro:4200,sala:true});});
      S.tono({f:65,f2:40,dur:0.9,vol:0.3,tipo:'sine',t:t}); break;
    case 'estrella':S.tono({f:1568,f2:2349,dur:0.18,vol:0.1,tipo:'triangle',t:t,sala:true}); break;
    case 'cuenta': S.tono({f:1500*v,dur:0.025,vol:0.04,tipo:'square',t:t}); break;
    case 'ficha':  S.tono({f:988,dur:0.07,vol:0.14,tipo:'square',t:t,filtro:4000}); S.tono({f:1319,dur:0.35,vol:0.14,tipo:'square',t:t+0.07,filtro:4000,sala:true}); break;
    case 'ronda':  S.tono({f:98,f2:92,dur:1.4,vol:0.26,tipo:'sine',t:t,sala:true}); S.tono({f:196,f2:190,dur:1.2,vol:0.1,tipo:'triangle',t:t,sala:true});
                   S.soplo({f:4000,f2:1200,dur:0.8,vol:0.12,tipo:'bandpass',q:0.7,t:t}); break;
    case 'elegir': [392,523,659,784].forEach(function(f,i){S.tono({f:f,dur:0.2,vol:0.12,tipo:'sawtooth',t:t+i*0.05,filtro:3000,sala:true});});
                   S.tono({f:60,f2:40,dur:0.5,vol:0.3,tipo:'sine',t:t}); break;
    case 'anuncio':S.tono({f:660,f2:990,dur:0.18,vol:0.1,tipo:'square',t:t,filtro:3500,sala:true}); S.tono({f:990,dur:0.3,vol:0.08,tipo:'square',t:t+0.14,filtro:3500,sala:true}); break;
    case 'bonus':  for(var bn=0;bn<8;bn++)S.tono({f:1200+bn*120,dur:0.05,vol:0.06,tipo:'square',t:t+bn*0.04,filtro:5000}); break;
    case 'cuenta2':S.tono({f:440,dur:0.12,vol:0.14,tipo:'square',t:t,filtro:2000,sala:true}); break;
  }
}
/* ---------------- la música: tangos sintetizados, compuestos para el juego ----------------
   Base de tango: el bajo en ritmo de habanera, el piano marcando los cuatro tiempos, un
   bandoneón (dos osciladores desafinados, filtrados, con ataque blando) que lleva la
   melodía, y en los temas nocturnos un colchón de cuerdas. Melodías propias. */
var _=null;
function pasoTango(S,p,t){
  var T=TEMAS[S.tema], M=S.busM, n16=p%16, comp=Math.floor(p/16)%T.prog.length;
  var ac=T.prog[comp], raiz=ac[0], dur=S.dur();
  if(T.pad&&n16===0)ac.forEach(function(m){
    [-8,8].forEach(function(det){S.tono({f:S.midi(m+12),det:det,dur:dur*16,vol:T.pad,tipo:'sawtooth',bus:M,t:t,at:dur*4,filtro:T.filtroPad||1200,sala:true});});
  });
  var b=T.bajo[n16];
  if(b){
    var nb=b===1?raiz:b===2?raiz+7:raiz+12;
    S.tono({f:S.midi(nb-24),dur:dur*1.6,vol:0.2,tipo:'triangle',bus:M,t:t,filtro:600});
    S.tono({f:S.midi(nb-12),dur:dur*1.2,vol:0.05,tipo:'sawtooth',bus:M,t:t,filtro:900});
  }
  if(T.piano[n16]){      /* el marcato: el acorde entero, corto y seco */
    ac.forEach(function(m){S.tono({f:S.midi(m+12),dur:dur*(T.piano[n16]===2?2.2:0.8),vol:T.volPiano,tipo:'triangle',bus:M,t:t,filtro:3200,sala:true});});
  }
  var ml=T.mel[(comp*16+n16)%T.mel.length];
  if(ml!==null&&ml!==undefined){       /* el bandoneón */
    var f=S.midi(raiz+12+ml);
    S.tono({f:f,det:-7,dur:dur*T.largoMel,vol:T.volMel,tipo:'sawtooth',bus:M,t:t,at:0.035,filtro:1900,sala:true});
    S.tono({f:f,det:7,dur:dur*T.largoMel,vol:T.volMel*0.7,tipo:'square',bus:M,t:t,at:0.035,filtro:1500,sala:true});
  }
  if(T.arp&&T.arp[n16]){var an=ac[(n16>>1)%3]+24;S.tono({f:S.midi(an),dur:dur*0.8,vol:T.volArp,tipo:'sine',bus:M,t:t,sala:true});}
  if(T.bombo[n16])S.tono({f:140,f2:44,dur:0.18,vol:T.volBombo||0.28,tipo:'sine',bus:M,t:t});
  if(T.caja[n16])S.soplo({f:2600,f2:900,dur:0.11,vol:0.12,tipo:'bandpass',q:1.1,bus:M,t:t,sala:true});
  if(T.plato&&T.plato[n16])S.soplo({f:8000,f2:6000,dur:0.03,vol:0.03,tipo:'highpass',bus:M,t:t,sala:false});
  /* el golpe de caja del tango: la mano en la madera del contrabajo */
  if(T.chasquido&&T.chasquido[n16])S.soplo({f:1400,f2:700,dur:0.04,vol:0.1,tipo:'bandpass',q:4,bus:M,t:t,sala:false});
}
var HAB=[1,0,0,2,1,0,1,0, 1,0,0,2,1,0,3,0];       /* habanera: 3-3-2 */
var TEMAS={
  /* menú: electrotango en la menor. la m · re m · mi7 · la m */
  menu:{bpm:116,prog:[[57,60,64],[50,53,57],[52,56,59],[57,60,64]],bajo:HAB,
    piano:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],volPiano:0.035,volMel:0.05,largoMel:1.9,pad:0.012,
    mel:[12,_,_,11,12,_,15,_,14,_,12,_,_,_,_,_, 10,_,_,9,10,_,14,_,12,_,10,_,_,_,_,_,
         8,_,11,_,14,_,16,_,15,_,14,_,11,_,8,_, 12,_,_,_,7,_,_,_,12,_,_,_,_,_,_,_],
    bombo:[1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0],caja:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    plato:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,1],chasquido:[0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0]},
  /* el conventillo: milonga rápida y alegre, en do. do · sol7 · do · fa */
  conventillo:{bpm:138,prog:[[48,52,55],[43,47,50],[48,52,55],[53,57,60]],bajo:HAB,
    piano:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],volPiano:0.03,volMel:0.045,largoMel:1.4,
    mel:[16,_,19,_,16,_,12,_,14,_,16,_,17,_,_,_, 17,_,16,_,14,_,11,_,12,_,14,_,11,_,_,_,
         16,_,19,_,24,_,19,_,16,_,12,_,14,_,_,_, 12,_,_,16,_,_,19,_,17,_,_,_,_,_,_,_],
    bombo:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],caja:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    plato:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],chasquido:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1]},
  /* la milonga (el salón): tango dramático en re menor. re m · sol m · la7 · re m */
  milonga:{bpm:108,prog:[[50,53,57],[55,58,62],[57,61,64],[50,53,57]],bajo:HAB,
    piano:[2,0,0,0,1,0,0,0,2,0,0,0,1,0,1,0],volPiano:0.04,volMel:0.055,largoMel:2.4,pad:0.014,
    mel:[7,_,_,_,8,_,7,_,5,_,_,_,3,_,2,_, 5,_,_,_,7,_,5,_,3,_,_,_,2,_,0,_,
         4,_,_,7,_,_,10,_,9,_,7,_,4,_,1,_, 2,_,_,_,_,_,_,_,0,_,_,_,_,_,_,_],
    bombo:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],caja:[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
    chasquido:[0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0]},
  /* el Riachuelo: tango lento y espectral en mi menor. mi m · do · si7 · mi m */
  riachuelo:{bpm:96,prog:[[52,55,59],[48,52,55],[47,51,54],[52,55,59]],bajo:[1,0,0,0,0,0,2,0,1,0,0,0,0,0,0,0],
    piano:[2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],volPiano:0.035,volMel:0.045,largoMel:3,pad:0.02,filtroPad:900,
    mel:[12,_,_,_,_,_,11,_,12,_,_,_,15,_,_,_, 16,_,_,_,15,_,_,_,12,_,_,_,_,_,_,_,
         11,_,_,_,_,_,12,_,15,_,_,_,14,_,_,_, 12,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    arp:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],volArp:0.03,
    bombo:[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],caja:[0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],volBombo:0.2},
  /* el jefe de cada barrio: el mismo tango pero a los empujones. la m · si bemol · la m · sol# dis */
  jefe:{bpm:150,prog:[[57,60,64],[58,62,65],[57,60,64],[56,59,62]],bajo:[1,0,1,2,1,0,1,3,1,0,1,2,1,0,3,2],
    piano:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1],volPiano:0.03,volMel:0.05,largoMel:1.3,pad:0.012,
    mel:[12,_,11,_,12,_,15,_,17,_,15,_,12,_,11,_, 12,_,13,_,15,_,17,_,18,_,17,_,15,_,13,_,
         12,_,11,_,12,_,15,_,20,_,19,_,17,_,15,_, 14,_,11,_,8,_,11,_,12,_,_,_,_,_,_,_],
    bombo:[1,0,0,1,1,0,0,0,1,0,0,1,1,0,1,0],caja:[0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,1],
    plato:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]},
  /* el relicario: misterioso, suspendido. fa · re m · si bemol · do */
  relicario:{bpm:84,prog:[[53,57,60],[50,53,57],[46,50,53],[48,52,55]],bajo:[1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0],
    piano:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],volPiano:0,volMel:0.03,largoMel:3.5,pad:0.022,filtroPad:1600,
    mel:[19,_,_,_,_,_,_,_,21,_,_,_,_,_,_,_, 17,_,_,_,_,_,_,_,16,_,_,_,_,_,_,_,
         19,_,_,_,21,_,_,_,24,_,_,_,_,_,_,_, 22,_,_,_,21,_,_,_,19,_,_,_,_,_,_,_],
    arp:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],volArp:0.028,
    bombo:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],caja:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}
};
