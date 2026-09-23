<script>
'use strict';
/* =====================================================================
   BRECHA 7 — shooter táctico sobre rieles al estilo SIERRA 7.
   Un archivo; three.js r128 desde el CDN. Mundo en metros, y arriba es +y.
   ===================================================================== */
const $ = id => document.getElementById(id);
const lim=(v,a,b)=> v<a?a:(v>b?b:v), lerp=(a,b,t)=> a+(b-a)*t, TAU = Math.PI*2, sig = v=> v<0?-1:(v>0?1:0);
const angDif=(a,b)=>{ let d=(b-a)%TAU; if(d>Math.PI) d-=TAU; if(d<-Math.PI) d+=TAU; return d; };
function mulberry(a){ return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function semilla32(s){ let h=1779033703^s.length; for(let i=0;i<s.length;i++){ h=Math.imul(h^s.charCodeAt(i),3432918353); h=h<<13|h>>>19; } return h>>>0; }
let rnd = mulberry(1);
const rf=(a,b)=> a+rnd()*(b-a), ri=(a,b)=> a+Math.floor(rnd()*(b-a+1)), elegir = a=> a[Math.floor(rnd()*a.length)];
const vr=(a,b)=> a+Math.random()*(b-a);
const DT = 1/60;

/* ---------- guardado ---------- */
const CLAVE = 'brecha7.v1';
function cargar(){
  const b = {dinero:0, armas:{p9:1, r4:1}, mejoras:{}, equipo:{chaleco:0, casco:0, botiquin:0, granadas:1}, primaria:'r4', secundaria:'p9',
    estrellas:[0,0,0,0,0], rangos:['','','','',''], medallas:{}, abierto:1, sonido:true, sens:1, graficos:'auto'};
  try{ const o = JSON.parse(localStorage.getItem(CLAVE)); if(o) return Object.assign(b, o, {armas:Object.assign(b.armas, o.armas||{}), equipo:Object.assign(b.equipo, o.equipo||{}), mejoras:o.mejoras||{}, medallas:o.medallas||{}}); }catch(e){}
  return b;
}
function guardar(){ try{ localStorage.setItem(CLAVE, JSON.stringify(G)); }catch(e){} }
const G = cargar();

/* ---------- armas: cada una se arma con piezas (la misma lista dibuja el 3D y el ícono) ---------- */
const ARMAS = {
  p9:  {nom:'P9', txt:'Pistola. Semiautomática, precisa y con muchos cargadores.', clase:'pistola', dmg:34, cad:0.16, auto:false, carg:15, res:Infinity, disp:0.010, ret:0.035, zoom:1.3, rec:1.25, perd:1, precio:0, sfx:'pistola',
        piezas:[['c',0,0.02,-0.1,0.035,0.055,0.2,'#2a2e33'],['c',0,-0.05,-0.03,0.03,0.1,0.045,'#1c1f23'],['c',0,0.052,-0.1,0.036,0.012,0.19,'#3a3f45']]},
  k5:  {nom:'K5', txt:'Subfusil. Mucha cadencia, poco retroceso, poco alcance.', clase:'primaria', dmg:22, cad:0.07, auto:true, carg:30, res:210, disp:0.02, ret:0.016, zoom:1.4, rec:1.7, perd:0.7, precio:1400, sfx:'subfusil',
        piezas:[['c',0,0.01,-0.16,0.045,0.07,0.34,'#2a2e33'],['c',0,-0.08,-0.1,0.03,0.12,0.04,'#1c1f23'],['c',0,-0.05,-0.02,0.03,0.09,0.045,'#1c1f23'],['c',0,0.02,-0.36,0.022,0.022,0.1,'#1c1f23'],['c',0,0.0,0.05,0.035,0.05,0.12,'#3a3f45']]},
  r4:  {nom:'R4', txt:'Fusil de asalto. El que sirve para todo.', clase:'primaria', dmg:31, cad:0.095, auto:true, carg:30, res:180, disp:0.011, ret:0.024, zoom:1.7, rec:2.1, perd:0.9, precio:0, sfx:'fusil',
        piezas:[['c',0,0.01,-0.2,0.045,0.07,0.44,'#2a2e33'],['c',0,-0.09,-0.13,0.032,0.13,0.05,'#1c1f23'],['c',0,-0.06,-0.02,0.03,0.1,0.045,'#1c1f23'],['c',0,0.015,-0.5,0.02,0.02,0.18,'#1c1f23'],['c',0,-0.01,0.1,0.04,0.08,0.2,'#3a3f45'],['c',0,0.07,-0.18,0.03,0.035,0.12,'#15171a']]},
  b12: {nom:'B12', txt:'Escopeta. Ocho perdigones: de cerca borra, de lejos rasguña.', clase:'primaria', dmg:17, perd:8, cad:0.72, auto:false, carg:7, res:49, disp:0.055, ret:0.13, zoom:1.25, rec:0.5, porBala:true, precio:1900, sfx:'escopeta',
        piezas:[['c',0,0.02,-0.26,0.05,0.06,0.56,'#2a2e33'],['c',0,-0.02,-0.3,0.045,0.045,0.26,'#4a3a2a'],['c',0,-0.05,0.02,0.035,0.1,0.05,'#1c1f23'],['c',0,-0.02,0.14,0.045,0.09,0.22,'#4a3a2a']]},
  m14: {nom:'M14', txt:'Tirador. Semiautomático, pega fuerte y tiene mira de 3x.', clase:'primaria', dmg:72, cad:0.26, auto:false, carg:12, res:72, disp:0.004, ret:0.07, zoom:3.2, rec:2.4, perd:1, precio:2800, sfx:'tirador',
        piezas:[['c',0,0.01,-0.26,0.045,0.07,0.56,'#3a3228'],['c',0,-0.08,-0.12,0.03,0.12,0.05,'#1c1f23'],['c',0,0.015,-0.62,0.02,0.02,0.2,'#1c1f23'],['c',0,-0.01,0.14,0.045,0.09,0.24,'#3a3228'],['c',0,0.085,-0.2,0.032,0.04,0.2,'#15171a']]},
  l96: {nom:'L96', txt:'Francotirador de cerrojo. Mira de 7x. La bala tarda y la mueve el viento.', clase:'francotirador', dmg:180, cad:1.15, auto:false, carg:5, res:40, disp:0.0006, ret:0.16, zoom:7, rec:3.0, perd:1, precio:0, sfx:'franco', bala:820,
        piezas:[['c',0,0.01,-0.3,0.05,0.07,0.66,'#3a4a3a'],['c',0,0.015,-0.78,0.022,0.022,0.3,'#1c1f23'],['c',0,-0.02,0.16,0.05,0.1,0.26,'#3a4a3a'],['c',0,0.1,-0.24,0.04,0.05,0.34,'#15171a'],['c',0,-0.06,-0.05,0.03,0.08,0.04,'#1c1f23']]},
};
const ORDEN_ARMAS = ['p9','r4','k5','b12','m14'];
const MEJORAS = {
  silen:  {nom:'SILENCIADOR', txt:'No te delatan los disparos (clave en el puerto). −8 % de daño.', precio:700},
  mira:   {nom:'MIRA HOLO', txt:'La mira se pega más a los blancos y el zoom es un 20 % mayor.', precio:600},
  carg:   {nom:'CARGADOR EXT.', txt:'+40 % de balas por cargador.', precio:800},
  empu:   {nom:'EMPUÑADURA', txt:'−35 % de retroceso y de dispersión.', precio:900},
};
const tieneMej = (a, m) => !!(G.mejoras[a] && G.mejoras[a][m]);
const EQUIPO = {
  chaleco:  {nom:'CHALECO', txt:'+30 de vida por nivel.', max:3, precio:[600,1200,2200]},
  casco:    {nom:'CASCO', txt:'Recibís un 12 % menos por nivel.', max:2, precio:[900,1900]},
  botiquin: {nom:'BOTIQUÍN', txt:'Cura 50 una vez por misión (toque largo en la vida). Se usa solo si vas a morir.', max:2, precio:[800,1600]},
  granadas: {nom:'CEGADORAS', txt:'Aturden a todos los que miran unos 3 segundos.', max:3, precio:[0,700,1400]},
};
/* ---------- enemigos ---------- */
const ENEMIGOS = {
  tirador:   {nom:'TIRADOR', hp:100, vel:2.4, prec:0.34, dmg:7, rafaga:3, cadR:0.11, aviso:0.95, color:'#2b2f35', vest:'#3b4148'},
  escopeta:  {nom:'ESCOPETERO', hp:120, vel:3.2, prec:0.5, dmg:16, rafaga:1, cadR:0.9, aviso:0.75, color:'#33302c', vest:'#4a4238', corto:true},
  pesado:    {nom:'PESADO', hp:170, vel:1.6, prec:0.3, dmg:6, rafaga:9, cadR:0.09, aviso:1.2, color:'#26282c', vest:'#4a4f55', placas:{pecho:140, casco:70}},
  escudo:    {nom:'ESCUDO', hp:110, vel:1.8, prec:0.4, dmg:8, rafaga:2, cadR:0.25, aviso:1.0, color:'#2b2f35', vest:'#3b4148', escudo:true},
  rpg:       {nom:'COHETERO', hp:90, vel:2.0, prec:1, dmg:34, rafaga:1, cadR:2, aviso:1.5, color:'#3a2f2a', vest:'#5a4a3a', cohete:true},
  franco:    {nom:'FRANCOTIRADOR', hp:90, vel:0, prec:0.55, dmg:30, rafaga:1, cadR:3, aviso:1.9, color:'#2a302a', vest:'#3a453a', laser:true},
  captor:    {nom:'CAPTOR', hp:100, vel:0, prec:0, dmg:0, rafaga:0, cadR:9, aviso:9, color:'#2b2f35', vest:'#3b4148', captor:true},
  coloso:    {nom:'EL COLOSO', hp:700, vel:1.1, prec:0.28, dmg:5, rafaga:28, cadR:0.06, aviso:1.6, color:'#202226', vest:'#50565c', jefe:true, placas:{pecho:260, casco:160, brazoI:90, brazoD:90, piernaI:110, piernaD:110}},
};
/* ---------- misiones ---------- */
const MISIONES = [
  {id:'deposito', nom:'DEPÓSITO', lugar:'ROSARIO · 06:10', txt:'Asalto a un depósito tomado. Avance, cubiertas y una brecha con rehén al fondo.', tipo:'asalto', tema:0, dif:1.0, pago:900, tiempo:0},
  {id:'embajada', nom:'EMBAJADA', lugar:'RECOLETA · 23:40', txt:'Rehenes en tres salones. Brechas en cámara lenta y secuestradores con cuenta regresiva. Hay reloj.', tipo:'rehenes', tema:1, dif:1.2, pago:1400, tiempo:300},
  {id:'puerto', nom:'PUERTO', lugar:'DOCK SUR · 19:05', txt:'Francotirador desde una grúa. Viento, caída de la bala y un blanco que escapa en auto.', tipo:'franco', tema:2, dif:1.35, pago:1800, tiempo:0},
  {id:'autopista', nom:'AUTOPISTA', lugar:'RUTA 5 · 14:30', txt:'Escolta de convoy en movimiento. Camionetas, puentes, cohetes y un helicóptero.', tipo:'convoy', tema:3, dif:1.5, pago:2300, tiempo:0},
  {id:'bunker', nom:'BÚNKER', lugar:'SIN DATOS', txt:'El laboratorio bajo tierra. Escudos, pesados y El Coloso con su minigun.', tipo:'bunker', tema:4, dif:1.75, pago:3000, tiempo:0},
];
/* temas: niebla/cielo, paredes, piso, acento, luz clave, luz de relleno, noche */
const TEMAS = [
  {cielo:'#b6bec6', niebla:[18,70], pared:'#cfd3d6', pared2:'#b9bec3', piso:'#8f969c', techo:'#aeb4b9', acento:'#e2a33a', luz:'#fff2e0', luzI:1.05, amb:'#c4ccd6', ambI:0.62, noche:0, suelo:'#6a7076'},
  {cielo:'#1c1a22', niebla:[14,48], pared:'#d6c9b1', pared2:'#b8a88c', piso:'#5e4534', techo:'#e2d6c0', acento:'#9a2a2a', luz:'#ffd9a8', luzI:0.95, amb:'#6a5e70', ambI:0.55, noche:1, suelo:'#3a2c22'},
  {cielo:'#e39a6a', niebla:[140,720], pared:'#8a8f94', pared2:'#6e747a', piso:'#6f7479', techo:'#8a8f94', acento:'#d6582a', luz:'#ffc08a', luzI:1.15, amb:'#8a90b0', ambI:0.55, noche:0, suelo:'#2a3e52', mar:true},
  {cielo:'#a9c3d8', niebla:[80,420], pared:'#c9b48e', pared2:'#b09a74', piso:'#47474b', techo:'#c9b48e', acento:'#e8d24a', luz:'#fff4dc', luzI:1.2, amb:'#b8c8d8', ambI:0.7, noche:0, suelo:'#c7ad84'},
  {cielo:'#141a17', niebla:[10,40], pared:'#7f8a83', pared2:'#66716a', piso:'#434b46', techo:'#5a645e', acento:'#3f7a5c', luz:'#d8ffe6', luzI:0.9, amb:'#4a5a52', ambI:0.55, noche:1, suelo:'#2a322e'},
];

/* el sonido está en su propia parte (p2s.js) */
