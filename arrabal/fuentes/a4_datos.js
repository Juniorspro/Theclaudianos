
/* ===========================================================================
   LOS DATOS: luchadores, cartas, elementos, rarezas y la campaña
   ========================================================================= */
/* elementos: AGUA le gana a FUEGO, FUEGO a VIENTO, VIENTO a AGUA; LUNA y SOL se ganan entre sí */
var ELEM={
  fuego:{nom:'FUEGO',col:'255,120,50',gana:'viento'},
  agua:{nom:'AGUA',col:'70,170,255',gana:'fuego'},
  viento:{nom:'VIENTO',col:'120,230,150',gana:'agua'},
  luna:{nom:'LUNA',col:'190,150,255',gana:'sol'},
  sol:{nom:'SOL',col:'255,215,80',gana:'luna'}
};
function ventajaElem(a,b){
  if(ELEM[a].gana===b)return 1.25;
  if(ELEM[b].gana===a)return 0.8;
  return 1;
}
var RAREZA={
  bronce:{nom:'BRONCE',col:['#e8a86a','#8a4f22'],mult:1.0,max:30,orden:0},
  plata:{nom:'PLATA',col:['#e6eef7','#7d8ea3'],mult:1.25,max:40,orden:1},
  oro:{nom:'ORO',col:['#ffe38a','#b8860b'],mult:1.6,max:50,orden:2},
  diamante:{nom:'DIAMANTE',col:['#c9f6ff','#6a5cff'],mult:2.1,max:60,orden:3}
};
/* los seis luchadores del arrabal (originales). Proporciones, colores y estilo de pelea */
var LUCH={
  morocha:{nom:'LA MOROCHA',alto:1.0,grosor:0.9,vel:1.15,peso:0.9,alcance:1.05,estilo:'patadas',
    piel:'#f1c7a6',pielS:'#c98f6d',ropa:'#b3142b',ropaS:'#6e0a1a',extra:'#1a1a22',extraS:'#050508',pelo:'#15131c',
    atk:118,vida:980,crit:0.08,
    esp:[{id:'ocho',nom:'OCHO CORTADO',cd:6},{id:'boleo',nom:'BOLEO',cd:8}],sup:{id:'tango',nom:'TANGO FINAL'}},
  bandoneon:{nom:'EL BANDONEÓN',alto:1.14,grosor:1.35,vel:0.85,peso:1.35,alcance:1.0,estilo:'punos',
    piel:'#e7b58f',pielS:'#b07e5b',ropa:'#f2f2f5',ropaS:'#aeb6c6',extra:'#20304f',extraS:'#0f1a30',pelo:'#3a2618',metal:'#d4a24a',metalS:'#7a5418',
    atk:128,vida:1180,crit:0.05,
    esp:[{id:'fuelle',nom:'FUELLE',cd:6},{id:'estiba',nom:'ESTIBADOR',cd:9}],sup:{id:'vapor',nom:'TANGO DE VAPOR'}},
  chispa:{nom:'CHISPA FAROLERA',alto:0.92,grosor:0.9,vel:1.05,peso:0.9,alcance:1.35,estilo:'vara',
    piel:'#f6d0b5',pielS:'#d19a7c',ropa:'#1f3a6e',ropaS:'#0f1f42',extra:'#6b5a44',extraS:'#3d3122',pelo:'#ff7a1f',metal:'#474d5c',metalS:'#1e222c',
    atk:112,vida:940,crit:0.07,
    esp:[{id:'farol',nom:'FAROL',cd:5},{id:'mecha',nom:'MECHA ALTA',cd:8}],sup:{id:'faroles',nom:'NOCHE DE FAROLES'}},
  mate:{nom:'DOCTOR MATE',alto:1.02,grosor:0.95,vel:0.95,peso:1.0,alcance:1.2,estilo:'bolas',
    piel:'#e9bf9c',pielS:'#b8876a',ropa:'#3f6b3a',ropaS:'#23401f',extra:'#6e4b2a',extraS:'#3f2915',pelo:'#c9c9c9',metal:'#c9a24e',
    atk:115,vida:1010,crit:0.06,
    esp:[{id:'boleadora',nom:'BOLEADORA',cd:6},{id:'pava',nom:'PAVA ELÉCTRICA',cd:8}],sup:{id:'pampero',nom:'TORMENTA PAMPEANA'}},
  parca:{nom:'LA PARCA DEL RIACHUELO',alto:1.06,grosor:0.95,vel:1.0,peso:0.85,alcance:1.3,estilo:'gancho',
    piel:'#bfe8e2',pielS:'#7fb3ad',ropa:'#26343f',ropaS:'#121b22',extra:'#3d5561',extraS:'#1f2e36',pelo:'#3fc6b4',metal:'#8c6a4a',metalS:'#4a3522',
    atk:114,vida:990,crit:0.07,
    esp:[{id:'anzuelo',nom:'ANZUELO',cd:7},{id:'cardumen',nom:'CARDUMEN',cd:7}],sup:{id:'crecida',nom:'LA CRECIDA'}},
  colectivo:{nom:'COLECTIVO',alto:0.82,grosor:0.85,vel:1.2,peso:0.75,alcance:1.0,estilo:'llave',
    piel:'#b9855f',pielS:'#8a5c3c',ropa:'#e8b21e',ropaS:'#a7780a',extra:'#2c2c34',extraS:'#131318',pelo:'#2b1c12',metal:'#9aa3b2',metalS:'#50586a',
    atk:108,vida:900,crit:0.09,
    esp:[{id:'bondi',nom:'BONDI',cd:6},{id:'llave',nom:'LLAVE INGLESA',cd:8}],sup:{id:'horapico',nom:'HORA PICO'}}
};
/* la segunda tanda: seis más, de los arquetipos clásicos del género pero propios del arrabal */
LUCH.kanji={nom:'DON KANJI',alto:0.98,grosor:1.0,vel:0.95,peso:1.0,alcance:1.05,estilo:'punos',
  piel:'#e6b48c',pielS:'#b07e5b',ropa:'#1e1e26',ropaS:'#0c0c12',extra:'#1e1e26',extraS:'#0c0c12',pelo:'#c9c9c9',metal:'#d8b25a',
  atk:122,vida:1010,crit:0.07,
  esp:[{id:'palma',nom:'PALMA DE ORO',cd:5},{id:'rodilla',nom:'RODILLAZO DEL CERRO',cd:8}],sup:{id:'milpalmas',nom:'MIL PALMAS'}};
LUCH.xiao={nom:'XIAO FENG',alto:1.0,grosor:0.88,vel:1.1,peso:0.9,alcance:1.0,estilo:'baston',
  piel:'#f0c9a0',pielS:'#c0926c',ropa:'#1f8a5a',ropaS:'#0f5536',extra:'#18181e',extraS:'#08080c',pelo:'#141018',metal:'#b3261e',metalS:'#6a120e',
  atk:114,vida:960,crit:0.08,
  esp:[{id:'remolino',nom:'REMOLINO',cd:6},{id:'estocada',nom:'BASTÓN LARGO',cd:7}],sup:{id:'bambu',nom:'TORMENTA DE BAMBÚ'}};
LUCH.buzo={nom:'EL BUZO TÁCTICO',alto:1.0,grosor:0.95,vel:1.0,peso:1.0,alcance:1.0,estilo:'arpon',
  piel:'#e2b08a',pielS:'#ae7c58',ropa:'#1a1d24',ropaS:'#0a0c10',extra:'#1a1d24',extraS:'#0a0c10',pelo:'#2a1c16',metal:'#c9a24e',metalS:'#6a5020',
  atk:116,vida:990,crit:0.07,
  esp:[{id:'arpon',nom:'ARPÓN',cd:6},{id:'mina',nom:'MINA DE PUERTO',cd:8}],sup:{id:'torpedo',nom:'TORPEDO'}};
LUCH.lobizon={nom:'EL LOBIZÓN',alto:1.1,grosor:1.2,vel:1.15,peso:1.15,alcance:1.05,estilo:'garras',
  piel:'#7a5a3e',pielS:'#4e3826',ropa:'#7a5a3e',ropaS:'#4e3826',extra:'#b89a72',extraS:'#7a6446',pelo:'#5a4230',metal:'#e8e0cc',
  atk:124,vida:1060,crit:0.08,
  esp:[{id:'zarpazo',nom:'ZARPAZO',cd:6},{id:'aullido',nom:'AULLIDO',cd:8}],sup:{id:'lunallena',nom:'LUNA LLENA'}};
LUCH.toro={nom:'EL TORO DE MATADEROS',alto:1.16,grosor:1.45,vel:0.8,peso:1.45,alcance:0.95,estilo:'lucha',
  piel:'#d9a47c',pielS:'#a2704e',ropa:'#d9a47c',ropaS:'#a2704e',extra:'#141418',extraS:'#050507',pelo:'#141418',metal:'#d8b25a',metalS:'#7a5418',
  atk:132,vida:1220,crit:0.05,
  esp:[{id:'embestida',nom:'EMBESTIDA',cd:7},{id:'suplex',nom:'SUPLEX DE MATADEROS',cd:9}],sup:{id:'campeon',nom:'CAMPEÓN DEL MATADERO'}};
LUCH.vale={nom:'VALE',alto:0.9,grosor:0.88,vel:1.15,peso:0.85,alcance:1.05,estilo:'palo',
  piel:'#f4cfb0',pielS:'#cf9a78',ropa:'#f4f4f6',ropaS:'#b8bcc8',extra:'#233a6e',extraS:'#12203e',pelo:'#6a3a1e',metal:'#3a6ac8',metalS:'#1e3a78',
  atk:110,vida:930,crit:0.09,
  esp:[{id:'bochazo',nom:'BOCHAZO',cd:5},{id:'barripalo',nom:'BARRIDA DE PALO',cd:7}],sup:{id:'golazo',nom:'GOL OLÍMPICO'}};
var ORDEN_LUCH=['morocha','bandoneon','chispa','mate','parca','colectivo','kanji','xiao','buzo','lobizon','toro','vale'];
/* las firmas: la habilidad pasiva de cada carta */
var FIRMAS={
  critAereo:{nom:'VUELO RASANTE',des:'+25% de crítico en el aire'},
  medidor:{nom:'SANGRE CALIENTE',des:'+30% de súper por golpe'},
  robo:{nom:'MORDIDA',des:'cura el 4% del daño que hace'},
  furia:{nom:'ÚLTIMO TANGO',des:'+35% de daño con menos de 35% de vida'},
  enfriar:{nom:'SANGRE FRÍA',des:'especiales se recargan 25% más rápido'},
  arranque:{nom:'ENTRADA TRIUNFAL',des:'empieza con una barra de súper'},
  quemadura:{nom:'BRASA',des:'los especiales queman 3 segundos'},
  combo:{nom:'ENCADENADO',des:'+3% de daño por golpe de combo (tope 36%)'},
  contra:{nom:'CONTRAGOLPE',des:'después de cubrirse, el próximo golpe +50%'},
  coraza:{nom:'CORAZA',des:'recibe 15% menos daño'}
};
/* las cartas: 3 por luchador. Nombre de la variante, rareza, elemento y firma */
var CARTAS=[
  {id:'mo1',l:'morocha',nom:'TACO AGUJA',r:'bronce',e:'fuego',f:'combo'},
  {id:'mo2',l:'morocha',nom:'MEDIA LUZ',r:'plata',e:'luna',f:'critAereo'},
  {id:'mo3',l:'morocha',nom:'REINA DEL SALÓN',r:'oro',e:'sol',f:'furia'},
  {id:'ba1',l:'bandoneon',nom:'PUERTO MADRUGADA',r:'bronce',e:'viento',f:'coraza'},
  {id:'ba2',l:'bandoneon',nom:'FUELLE ROTO',r:'plata',e:'agua',f:'contra'},
  {id:'ba3',l:'bandoneon',nom:'ORQUESTA TÍPICA',r:'oro',e:'viento',f:'medidor'},
  {id:'ch1',l:'chispa',nom:'APRENDIZ',r:'bronce',e:'fuego',f:'quemadura'},
  {id:'ch2',l:'chispa',nom:'FAROL DE ESQUINA',r:'plata',e:'sol',f:'enfriar'},
  {id:'ch3',l:'chispa',nom:'LLAMA ETERNA',r:'diamante',e:'fuego',f:'arranque'},
  {id:'ma1',l:'mate',nom:'CEBADOR',r:'bronce',e:'luna',f:'enfriar'},
  {id:'ma2',l:'mate',nom:'BOLAS CRIOLLAS',r:'plata',e:'viento',f:'combo'},
  {id:'ma3',l:'mate',nom:'PAMPERO',r:'oro',e:'luna',f:'critAereo'},
  {id:'pa1',l:'parca',nom:'NIEBLA',r:'bronce',e:'agua',f:'robo'},
  {id:'pa2',l:'parca',nom:'SUDESTADA',r:'oro',e:'agua',f:'medidor'},
  {id:'pa3',l:'parca',nom:'BARCA NEGRA',r:'diamante',e:'luna',f:'robo'},
  {id:'co1',l:'colectivo',nom:'APRENDIZ DE TALLER',r:'bronce',e:'sol',f:'arranque'},
  {id:'co2',l:'colectivo',nom:'LÍNEA 60',r:'plata',e:'fuego',f:'furia'},
  {id:'co3',l:'colectivo',nom:'FILETEADOR',r:'oro',e:'sol',f:'contra'},
  {id:'ka1',l:'kanji',nom:'SENSEI DE BELGRANO',r:'bronce',e:'viento',f:'contra'},
  {id:'ka2',l:'kanji',nom:'FAJA DORADA',r:'oro',e:'sol',f:'critAereo'},
  {id:'ka3',l:'kanji',nom:'EL ÚLTIMO MAESTRO',r:'diamante',e:'luna',f:'combo'},
  {id:'xi1',l:'xiao',nom:'BASTÓN DE BAMBÚ',r:'bronce',e:'viento',f:'combo'},
  {id:'xi2',l:'xiao',nom:'DRAGÓN DE JADE',r:'plata',e:'agua',f:'enfriar'},
  {id:'xi3',l:'xiao',nom:'NUBE ROJA',r:'oro',e:'fuego',f:'critAereo'},
  {id:'bu1',l:'buzo',nom:'RECLUTA ANFIBIA',r:'bronce',e:'agua',f:'coraza'},
  {id:'bu2',l:'buzo',nom:'FONDO DEL DIQUE',r:'plata',e:'agua',f:'arranque'},
  {id:'bu3',l:'buzo',nom:'COMANDANTE DEL PUERTO',r:'oro',e:'luna',f:'medidor'},
  {id:'lo1',l:'lobizon',nom:'SÉPTIMO HIJO',r:'bronce',e:'luna',f:'robo'},
  {id:'lo2',l:'lobizon',nom:'NOCHE DE VIERNES',r:'plata',e:'luna',f:'furia'},
  {id:'lo3',l:'lobizon',nom:'EL QUE AÚLLA',r:'diamante',e:'fuego',f:'robo'},
  {id:'to1',l:'toro',nom:'DEBUTANTE',r:'bronce',e:'fuego',f:'coraza'},
  {id:'to2',l:'toro',nom:'CINTURÓN DE CUERO',r:'plata',e:'sol',f:'furia'},
  {id:'to3',l:'toro',nom:'CAMPEÓN INVICTO',r:'oro',e:'fuego',f:'coraza'},
  {id:'va1',l:'vale',nom:'PRIMER AÑO',r:'bronce',e:'sol',f:'medidor'},
  {id:'va2',l:'vale',nom:'CAPITANA',r:'plata',e:'viento',f:'combo'},
  {id:'va3',l:'vale',nom:'LEONA',r:'oro',e:'sol',f:'enfriar'}
];
function cartaDe(id){for(var i=0;i<CARTAS.length;i++)if(CARTAS[i].id===id)return CARTAS[i];return CARTAS[0];}
/* el árbol de habilidades: 8 nodos alrededor del retrato */
var ARBOL=[
  {id:'atk1',nom:'FUERZA',des:'+6% de daño',ico:'puno',req:1},
  {id:'vid1',nom:'AGUANTE',des:'+8% de vida',ico:'corazon',req:3},
  {id:'crt1',nom:'OJO FINO',des:'+4% de crítico',ico:'ojo',req:6},
  {id:'sp1',nom:'ESPECIAL I',des:'+20% de daño del primer especial',ico:'rayo',req:9},
  {id:'sp2',nom:'ESPECIAL II',des:'+20% de daño del segundo especial',ico:'rayo',req:12},
  {id:'atk2',nom:'FUERZA II',des:'+8% de daño',ico:'puno',req:16},
  {id:'sup',nom:'SÚPER',des:'+25% de daño del súper',ico:'estrella',req:20},
  {id:'fir',nom:'FIRMA',des:'la firma rinde 50% más',ico:'firma',req:25}
];
/* cuánto vale una carta con su nivel, estrellas y árbol */
function statsDe(inst){
  var C=cartaDe(inst.id), L=LUCH[C.l], R=RAREZA[C.r], a=inst.arbol||{};
  var niv=1+(inst.nivel-1)*0.045, est=1+(inst.estrellas||0)*0.08;
  var atk=L.atk*R.mult*niv*est*(1+(a.atk1?0.06:0)+(a.atk2?0.08:0));
  var vida=L.vida*R.mult*niv*est*(1+(a.vid1?0.08:0));
  return{atk:Math.round(atk),vida:Math.round(vida),crit:L.crit+(a.crt1?0.04:0),
    poder:Math.round(atk*2.2+vida*0.35+(inst.nivel*6))};
}
function precioNivel(inst){var C=cartaDe(inst.id);return Math.round(35*inst.nivel*RAREZA[C.r].mult);}
function precioNodo(k){return 120+k*140;}
/* la campaña: tres barrios de cinco peleas; la quinta de cada uno es el jefe */
var BARRIOS=[
  {id:'conventillo',nom:'EL CONVENTILLO',esc:'conventillo',mus:'conventillo'},
  {id:'milonga',nom:'LA MILONGA',esc:'milonga',mus:'milonga'},
  {id:'riachuelo',nom:'EL RIACHUELO',esc:'riachuelo',mus:'riachuelo'}
];
var JEFES_BARRIO=['ba3','mo3','pa3'];
function peleaDe(n){             /* n: 1..15 */
  var r=mulberry(semillaTexto('arrabal#'+n)), b=Math.floor((n-1)/5), jefe=n%5===0;
  var cant=Math.min(3,1+Math.floor((n+1)/3)), eq=[];
  /* la rareza de los rivales la manda el barrio: en el primero, bronce y plata nada más */
  var tope=['plata','oro','diamante'][b], pool=CARTAS.filter(function(c){return RAREZA[c.r].orden<=RAREZA[tope].orden&&JEFES_BARRIO.indexOf(c.id)<0;});
  for(var i=0;i<cant;i++){
    var c=jefe&&i===cant-1?JEFES_BARRIO[b]:pool[Math.floor(r()*pool.length)].id;
    for(var k=0;k<6&&eq.some(function(x){return x.id===c;});k++)c=pool[Math.floor(r()*pool.length)].id;
    eq.push({id:c,nivel:Math.max(1,Math.round(n*2.0-1+r()*2)),estrellas:jefe&&i===cant-1?b:0,arbol:{}});
  }
  return{n:n,barrio:b,jefe:jefe,equipo:eq,
    premio:{monedas:80+n*30,xp:40+n*14,fichas:jefe?3:1},
    dificultad:Math.min(1,0.18+n*0.055)};
}
