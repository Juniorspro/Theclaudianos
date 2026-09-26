/* ---------------- lo que se colecciona: camisetas, pelotas, estelas ---------------- */
var KITS={
  rojo:{nom:'CLÁSICA ROJA',cam:'#d8282a',short:'#ffffff',med:'#d8282a',precio:0},
  azul:{nom:'CELESTE',cam:'#5ab4f0',short:'#1a2a6a',med:'#ffffff',precio:0},
  verde:{nom:'SELVA',cam:'#1a9a4a',short:'#ffffff',med:'#ffd23a',precio:300},
  negro:{nom:'NOCHE',cam:'#20222a',short:'#20222a',med:'#ff4fa0',precio:500},
  naranja:{nom:'ATARDECER',cam:'#ff7a1a',short:'#2a1a4a',med:'#ff7a1a',precio:700},
  violeta:{nom:'LEYENDA',cam:'#8a3af0',short:'#ffd23a',med:'#8a3af0',precio:1200}
};
var ORDEN_KITS=['rojo','azul','verde','negro','naranja','violeta'];
var PELOTAS={
  clasica:{nom:'CLÁSICA',base:'#ffffff',panel:'#1a1a22',precio:0},
  playa:{nom:'PLAYERA',base:'#ffe36a',panel:'#2a8af0',raya:'#ff4fa0',precio:250},
  fuego:{nom:'VOLCÁN',base:'#ff6a1a',panel:'#3a0a0a',precio:600},
  hielo:{nom:'GLACIAR',base:'#dff6ff',panel:'#3aa8e0',precio:600},
  oro:{nom:'DORADA',base:'#ffd23a',panel:'#8a5a0a',raya:'#ffffff',precio:1500}
};
var ORDEN_PELOTAS=['clasica','playa','fuego','hielo','oro'];
/* la estela del tiro: color de salida, color de la cola (como en la referencia: amarillo a verde) */
var ESTELAS={
  sol:{0:'#fff35a',1:'#3ae07a',nom:'SOL Y CÉSPED',precio:0},
  fuego:{0:'#fff2a0',1:'#ff3a1a',nom:'LLAMARADA',precio:400},
  hielo:{0:'#ffffff',1:'#3a9aff',nom:'ESCARCHA',precio:400},
  arcoiris:{0:'#ffffff',1:'#ffffff',2:'arcoiris',nom:'ARCOÍRIS',precio:900},
  noche:{0:'#e0b0ff',1:'#4a1aa0',nom:'GALAXIA',precio:900}
};
var ORDEN_ESTELAS=['sol','fuego','hielo','arcoiris','noche'];
var ORDEN_ARENAS=['playa','terraza','noche'];
/* los rivales: apodos inventados, con el color de su camiseta */
var APODOS=['Tanque_09','LaPulga','Zurdito','ElMuro','Gambeta10','Chanfle','Taquito','PibeDeOro','Rabona','ElCrack',
  'Bombazo','Globito','Puntín','LaJoya','Tiki_Tiki','Chilena_Ya','Cañito','DonPelota','Arquerazo','Volea'];
var CAMIS_RIVAL=['#ffd23a','#2ac06a','#ff7ab8','#ffffff','#2a8af0','#ff8a1a'];
/* ---------------- el progreso ---------------- */
var Prog=null;
function progNuevo(){
  return {monedas:300,gemas:5,trofeos:0,maxTrofeos:0,kit:'rojo',pelota:'clasica',estela:'sol',
    tengo:{kit:{rojo:1,azul:1},pelota:{clasica:1},estela:{sol:1}},premios:{},
    partidos:0,ganados:0,goles:0,atajadas:0,racha:0,tuto:true,aj:{musica:0.8,efectos:0.9,vibra:true}};
}
function cargarProg(){
  try{Prog=JSON.parse(localStorage.getItem('duelo.v1'));}catch(e){Prog=null;}
  if(!Prog||!Prog.tengo)Prog=progNuevo();
  var b=progNuevo();for(var k in b)if(Prog[k]===undefined)Prog[k]=b[k];
}
function guardarProg(){try{localStorage.setItem('duelo.v1',JSON.stringify(Prog));}catch(e){}}
function vibrar(ms){if(!Prog.aj.vibra||!navigator.vibrate)return;try{navigator.vibrate(ms);}catch(e){}}
function arenaActual(){var a='playa';ORDEN_ARENAS.forEach(function(id){if(Prog.trofeos>=ARENAS[id].trofeos)a=id;});return a;}
/* los premios del camino de trofeos */
var CAMINO=[{t:30,tipo:'monedas',n:150},{t:80,tipo:'gemas',n:5},{t:130,tipo:'monedas',n:300},{t:200,tipo:'arena',n:'terraza'},
  {t:260,tipo:'monedas',n:400},{t:330,tipo:'gemas',n:10},{t:420,tipo:'monedas',n:600},{t:500,tipo:'arena',n:'noche'},{t:620,tipo:'gemas',n:20},{t:800,tipo:'monedas',n:1500}];
