<script>
'use strict';
/* =====================================================================
   ALAS · DUELO AÉREO — combate aéreo en tercera persona con jets.
   Un archivo, sin red: three.js r128 y lo generado con Rezona van adentro.
   Mundo en metros, arriba es +y, el avión mira hacia −z en su marco.
   ===================================================================== */
const $ = id => document.getElementById(id);
const lim=(v,a,b)=> v<a?a:(v>b?b:v), lerp=(a,b,t)=> a+(b-a)*t, TAU = Math.PI*2, sig = v=> v<0?-1:(v>0?1:0);
const angDif=(a,b)=>{ let d=(b-a)%TAU; if(d>Math.PI) d-=TAU; if(d<-Math.PI) d+=TAU; return d; };
const suave = t=> t<=0 ? 0 : t>=1 ? 1 : t*t*(3-2*t);
function mulberry(a){ return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function semilla32(s){ let h=1779033703^s.length; for(let i=0;i<s.length;i++){ h=Math.imul(h^s.charCodeAt(i),3432918353); h=h<<13|h>>>19; } return h>>>0; }
let rnd = mulberry(1);
const rf=(a,b)=> a+rnd()*(b-a), ri=(a,b)=> a+Math.floor(rnd()*(b-a+1)), elegir = a=> a[Math.floor(rnd()*a.length)];
const vr=(a,b)=> a+Math.random()*(b-a);
const V3 = (x,y,z)=> new THREE.Vector3(x,y,z);
const DT = 1/60, GRAV = 9.81;

/* ---------- guardado ---------- */
const CLAVE = 'alas.v1';
function cargar(){
  const b = {dinero:0, avion:'tomcat', aviones:{tomcat:1}, mejoras:{}, estrellas:[0,0,0,0,0], rangos:['','','','',''], abierto:1,
    sonido:true, graficos:'auto', invertir:false, asistencia:true, idioma:null, calAuto:0, jugadas:0};
  try{ const o = JSON.parse(localStorage.getItem(CLAVE)); if(o) return Object.assign(b, o, {aviones:Object.assign(b.aviones, o.aviones||{}), mejoras:o.mejoras||{}}); }catch(e){}
  return b;
}
function guardar(){ try{ localStorage.setItem(CLAVE, JSON.stringify(G)); }catch(e){} }
const G = cargar();

/* ---------- aviones: velocidades en m/s, giros en rad/s, empuje en m/s² ---------- */
const AVIONES = {
  tomcat: {nom:'F-14 GATO', txt:'Caza naval de ala variable. Aguanta mucho castigo y lleva seis misiles.', modelo:'jet_tomcat', precio:0,
    vmax:390, vmin:70, empuje:30, giro:1.2, alabeo:3.1, guinada:0.35, gmax:8, hp:150, misiles:6, bengalas:6, dmg:9, cad:0.05, color:'#aab4bd', largo:19},
  viper: {nom:'F-16 VÍBORA', txt:'Liviano y nervioso: el que mejor gira. Pocas balas de más: apuntá bien.', modelo:'jet_viper', precio:3200,
    vmax:405, vmin:62, empuje:34, giro:1.55, alabeo:4.2, guinada:0.45, gmax:9, hp:105, misiles:6, bengalas:6, dmg:8, cad:0.045, color:'#9aa4ad', largo:15},
  flanker: {nom:'SU-27 FLANCO', txt:'Pesado y veloz, con ocho misiles y un cañón que pega fuerte.', modelo:'jet_flanker', precio:6800,
    vmax:415, vmin:66, empuje:35, giro:1.4, alabeo:3.4, guinada:0.4, gmax:9, hp:175, misiles:8, bengalas:8, dmg:11, cad:0.05, color:'#7f97b3', largo:22},
  sombra: {nom:'F-35 SOMBRA', txt:'Furtivo: a los enemigos les cuesta el doble fijarte. Rápido y con bodega para ocho misiles.', modelo:'jet_sombra', precio:12000,
    vmax:440, vmin:64, empuje:40, giro:1.5, alabeo:3.9, guinada:0.45, gmax:9, hp:140, misiles:8, bengalas:8, dmg:10, cad:0.045, color:'#5d6670', largo:16, furtivo:true},
};
const ORDEN_AV = ['tomcat','viper','flanker','sombra'];
const MEJORAS = {
  motor:   {nom:'MOTOR', txt:'+6 % empuje y velocidad', precio:[900, 1800, 3200]},
  blindaje:{nom:'BLINDAJE', txt:'+15 % de vida', precio:[800, 1600, 3000]},
  misiles: {nom:'MISILES', txt:'+1 misil y buscador más fino', precio:[1000, 2000, 3500]},
  canon:   {nom:'CAÑÓN', txt:'+12 % de daño', precio:[700, 1500, 2800]},
};
const nivelMej = (a, m)=> (G.mejoras[a] && G.mejoras[a][m]) || 0;
/* lo que vuela: el avión con sus mejoras */
function statsDe(id){ const A = AVIONES[id], m = k=> nivelMej(id, k);
  return Object.assign({}, A, {empuje:A.empuje*(1 + 0.06*m('motor')), vmax:A.vmax*(1 + 0.04*m('motor')), hp:Math.round(A.hp*(1 + 0.15*m('blindaje'))),
    misiles:A.misiles + m('misiles'), buscador:1 + 0.12*m('misiles'), dmg:A.dmg*(1 + 0.12*m('canon'))}); }
/* enemigos: el avión y la cabeza del piloto (pericia 0..1) */
const ENEMIGOS = {
  caza:   {nom:'CAZA', modelo:'jet_enemigo', vmax:370, vmin:70, empuje:30, giro:1.25, alabeo:3.2, guinada:0.35, gmax:8, hp:70, misiles:2, bengalas:2, dmg:5, cad:0.07, color:'#a89a72', largo:17},
  as:     {nom:'EL AS', modelo:'jet_as', vmax:420, vmin:62, empuje:38, giro:1.6, alabeo:4.2, guinada:0.45, gmax:9.5, hp:420, misiles:6, bengalas:10, dmg:7, cad:0.05, color:'#22252a', largo:18, jefe:true},
  bombardero: {nom:'BOMBARDERO', modelo:'jet_flanker', vmax:260, vmin:80, empuje:18, giro:0.55, alabeo:1.4, guinada:0.2, gmax:4, hp:150, misiles:0, bengalas:3, dmg:4, cad:0.12, color:'#6f7a6a', largo:24, escala:1.35, bombardero:true},
  aliado: {nom:'ALIADO', modelo:'jet_viper', vmax:390, vmin:62, empuje:33, giro:1.4, alabeo:4, guinada:0.4, gmax:9, hp:140, misiles:4, bengalas:4, dmg:7, cad:0.05, color:'#8fa0b0', largo:15},
};
/* ---------- misiones ---------- */
const MISIONES = [
  {id:'m1', nom:'AMANECER', lugar:'MAR ABIERTO · 06:20', cielo:'cielo_tarde', sol:[75, 12], txt:'Primer contacto: un caza cruza el mar a la hora del amanecer. Seguilo, fijalo y derribalo. Después llegan dos más.',
    olas:[[['caza',0.3]], [['caza',0.35],['caza',0.35]]], aliados:0, islas:5, recompensa:900, tiempo:0},
  {id:'m2', nom:'CORDILLERA', lugar:'ISLAS DEL NORTE · 11:40', cielo:'cielo_dia', sol:[160, 58], txt:'Una escuadrilla enemiga entre las montañas. Tenés un compañero de ala: cuidale la cola y que él te cuide la tuya.',
    olas:[[['caza',0.45],['caza',0.45],['caza',0.5],['caza',0.5]], [['caza',0.55],['caza',0.55]]], aliados:1, islas:8, montanoso:true, recompensa:1600, tiempo:0},
  {id:'m3', nom:'PORTAAVIONES', lugar:'GRUPO DE COMBATE · 14:05', cielo:'cielo_dia', sol:[210, 48], txt:'Vienen bombarderos contra nuestro portaaviones. Bajalos antes de que lleguen; los cazas de escolta van a querer distraerte.',
    olas:[[['bombardero',0.4],['bombardero',0.4],['caza',0.5]], [['bombardero',0.45],['bombardero',0.45],['caza',0.55],['caza',0.55]], [['bombardero',0.5],['bombardero',0.5],['bombardero',0.5],['caza',0.6]]],
    aliados:1, islas:6, portaaviones:true, recompensa:2400, tiempo:0},
  {id:'m4', nom:'RASANTE', lugar:'ESTRECHO DEL SUR · 17:50', cielo:'cielo_tarde', sol:[250, 9], txt:'Tres destructores cierran el estrecho. Hundilos volando bajo, entre las islas: arriba te espera la artillería y los cazas.',
    olas:[[['caza',0.55],['caza',0.55]], [['caza',0.6],['caza',0.6],['caza',0.6]]], barcos:3, aliados:0, islas:9, montanoso:true, recompensa:3000, tiempo:0},
  {id:'m5', nom:'EL AS', lugar:'OJO DE LA TORMENTA · 20:10', cielo:'cielo_tormenta', sol:[300, 20], txt:'El mejor piloto enemigo, el del jet negro. Tira bengalas, esquiva misiles y no perdona. Primero sus dos escoltas.',
    olas:[[['caza',0.65],['caza',0.65]], [['as',0.95]]], aliados:0, islas:7, tormenta:true, recompensa:5000, tiempo:0},
];
