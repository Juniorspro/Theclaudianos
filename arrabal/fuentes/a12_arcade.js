
/* ===========================================================================
   MODO ARCADE — como en las máquinas de salón: pantalla de atracción con una
   pelea demo, elegir luchador con cuenta regresiva, VS, escalera de rivales,
   rondas al mejor de tres, puntaje con bonos, ¿continuás? y récords con iniciales.
   ========================================================================= */
/* la letra de salón: cursiva, gorda, con degradé y borde negro grueso */
function textoArcade(g,txt,x,y,tam,col1,col2,al){
  g.save();
  g.font='italic 900 '+tam+'px "Arial Black","Trebuchet MS",Impact,sans-serif';
  g.textAlign=al||'center';g.textBaseline='middle';g.lineJoin='round';
  g.fillStyle='rgba(0,0,0,0.55)';g.fillText(txt,x+tam*0.06,y+tam*0.08);
  g.lineWidth=tam*0.22;g.strokeStyle='#0a0510';g.strokeText(txt,x,y);
  var d=g.createLinearGradient(0,y-tam*0.5,0,y+tam*0.5);
  d.addColorStop(0,'#ffffff');d.addColorStop(0.35,col1||'#ffe36a');d.addColorStop(0.62,col2||'#ff7a1a');d.addColorStop(1,'#8a2a00');
  g.fillStyle=d;g.fillText(txt,x,y);
  g.lineWidth=Math.max(1,tam*0.035);g.strokeStyle='rgba(255,255,255,0.55)';g.strokeText(txt,x,y-tam*0.03);
  g.restore();
}
/* el vidrio del tubo: líneas horizontales y bordes oscuros. Se hace una vez por tamaño */
var CRT=null;
function capaCRT(g){
  if(Prog.aj.crt===false)return;
  var clave=ANCHO+'x'+ALTO;
  if(!CRT||CRT.clave!==clave){
    var c=document.createElement('canvas');c.width=ANCHO*2;c.height=ALTO*2;var q=c.getContext('2d');q.scale(2,2);
    q.fillStyle='rgba(0,0,0,0.16)';for(var y=0;y<ALTO;y+=3)q.fillRect(0,y,ANCHO,1.1);
    var v=q.createRadialGradient(ANCHO/2,ALTO/2,Math.min(ANCHO,ALTO)*0.45,ANCHO/2,ALTO/2,Math.max(ANCHO,ALTO)*0.72);
    v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.5)');q.fillStyle=v;q.fillRect(0,0,ANCHO,ALTO);
    CRT={c:c,clave:clave};
  }
  g.drawImage(CRT.c,0,0,ANCHO,ALTO);
  /* la franja clara que baja, como el barrido de un tubo viejo */
  var by=(J.t*90)%(ALTO+200)-100;
  g.fillStyle=lin(g,0,by-40,0,by+40,[[0,'rgba(255,255,255,0)'],[0.5,'rgba(255,255,255,0.035)'],[1,'rgba(255,255,255,0)']]);g.fillRect(0,by-40,ANCHO,80);
}
function titila(v){return Math.floor(J.t*(v||2.2))%2===0;}
function numero8(n,d){var s=String(Math.max(0,Math.floor(n)));while(s.length<(d||7))s='0'+s;return s;}

/* ---------------- dónde pelea cada uno y cómo arma su instancia de arcade ---------------- */
var CASA={morocha:1,bandoneon:2,chispa:0,mate:1,parca:2,colectivo:0,kanji:1,xiao:0,buzo:2,lobizon:2,toro:0,vale:1};      /* índice de BARRIOS */
var CARTA_ARCADE={morocha:'mo1',bandoneon:'ba1',chispa:'ch1',mate:'ma1',parca:'pa1',colectivo:'co1',kanji:'ka1',xiao:'xi1',buzo:'bu1',lobizon:'lo1',toro:'to1',vale:'va1'};
function instArcade(l,nivel,est){return{id:CARTA_ARCADE[l],nivel:nivel,xp:0,estrellas:est||0,arbol:{atk1:true,vid1:true,crt1:true}};}

/* ---------------- la pantalla de atracción: una pelea demo de fondo ---------------- */
function nuevaDemo(){
  var a=ORDEN_LUCH[Math.floor(Math.random()*ORDEN_LUCH.length)], b=ORDEN_LUCH[Math.floor(Math.random()*ORDEN_LUCH.length)];
  var pe={n:0,barrio:CASA[b],jefe:false,equipo:[instArcade(b,20)],dificultad:0.6};
  nuevaPelea(pe,[instArcade(a,20)],'demo');
  Sonido.musica('menu');
}
function dibujarAtraccion(g,t){
  /* la pelea demo ocupa toda la pantalla (la máquina esperando); encima, el logo y el cartel */
  if(M&&M.modo==='demo'){dibujarPelea(g,t);dibujarHUDPelea(g,t);dibujarCartel(g,t);}
  if(window.Idioma)Idioma.botonAqui(ANCHO-36,36,22);
  if(titila(1.2))textoArcade(g,'DEMO',ANCHO/2,104,13,'#ffffff','#ff5a1a');
  /* una franja oscura abajo, donde va el cartel */
  g.fillStyle=lin(g,0,ALTO-150,0,ALTO,[[0,'rgba(8,4,14,0)'],[0.45,'rgba(8,4,14,0.75)'],[1,'rgba(8,4,14,0.95)']]);g.fillRect(0,ALTO-150,ANCHO,150);
  var e=entra(0.05), yl=ALTO-96;
  g.save();g.translate(ANCHO/2,yl);var es=(0.6+e*0.4)*0.9+Math.sin(t*2)*0.012;g.scale(es,es);g.globalAlpha=Math.min(1,e*1.5);
  voluta(g,-160,10,1.2,Math.PI*1.1,'#e8c25a');voluta(g,160,10,1.2,-Math.PI*0.1+Math.PI*2,'#e8c25a');
  textoArcade(g,'ARRABAL',0,0,54,'#ffe36a','#ff5a1a');
  g.restore();
  if(titila(1.6))textoArcade(g,'TOCÁ PARA EMPEZAR',ANCHO/2,ALTO-46,20,'#ffffff','#ffd23a');
  texto(g,'RÉCORD  '+numero8(Prog.ranking[0].pts)+'  '+Prog.ranking[0].ini,ANCHO/2,ALTO-20,11,'#ffd23a');
  texto(g,'JUEGO LIBRE',26,ALTO-20,10,'#9fd8ff','left');
  texto(g,'© 2026 MARIANO PEAK',ANCHO-26,ALTO-20,9,'#8a7a5a','right');
  UI.boton('empezar',0,0,ANCHO,ALTO);
}
/* ---------------- el menú principal ---------------- */
/* ---------------- el menú principal: un escenario con dos luchadores que se miden ----------------
   Cada 5 s entra una pareja nueva: llegan corriendo, se paran en guardia, cruzan dos golpes y se van.
   Detrás, dos reflectores barren el salón y el humo pasa; abajo, la marquesina con el récord. */
var MENU_PAR={a:null,b:null,t0:-99,golpes:0};
function parMenu(t){
  if(t-MENU_PAR.t0>5||!MENU_PAR.a){
    var n=ORDEN_LUCH.length, a=Math.floor(Math.random()*n), b=(a+1+Math.floor(Math.random()*(n-1)))%n;
    MENU_PAR={a:ORDEN_LUCH[a],b:ORDEN_LUCH[b],t0:t,golpes:0};
    if(J.estado==='menu')soltarAnims([MENU_PAR.a,MENU_PAR.b]);
  }
  return MENU_PAR;
}
function reflectores(g,t){
  g.save();g.globalCompositeOperation='lighter';
  [[-30,0.55,'255,214,140'],[ANCHO+30,-0.55,'170,200,255']].forEach(function(r,i){
    var a=Math.PI/2+r[1]+Math.sin(t*0.6+i*2.1)*0.32, L2=ALTO*0.75, ab=0.16;
    var x2=r[0]+Math.cos(a-ab)*L2, y2=-20+Math.sin(a-ab)*L2, x3=r[0]+Math.cos(a+ab)*L2, y3=-20+Math.sin(a+ab)*L2;
    g.fillStyle=rad(g,r[0],-20,10,L2,[[0,'rgba('+r[2]+',0.30)'],[0.6,'rgba('+r[2]+',0.08)'],[1,'rgba('+r[2]+',0)']]);
    g.beginPath();g.moveTo(r[0],-20);g.lineTo(x2,y2);g.lineTo(x3,y3);g.closePath();g.fill();
  });
  g.restore();
}
function humoMenu(g,t,y0,y1){
  g.save();
  for(var i=0;i<7;i++){
    var x=((i*173+t*(10+i*3))%(ANCHO+300))-150, y=y0+(y1-y0)*((i*0.37)%1), r=90+i*14;
    g.fillStyle=rad(g,x,y,4,r,[[0,'rgba(200,180,210,0.10)'],[1,'rgba(200,180,210,0)']]);
    g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
  }
  g.restore();
}
function logoMenu(g,t,te,x,y,tam){
  g.save();g.globalAlpha=Math.min(1,te*1.4);
  var esc=(0.7+te*0.3)*(1+Math.sin(t*2)*0.012);
  g.translate(x,y);g.scale(esc,esc);
  /* el halo de neón detrás */
  g.save();g.globalCompositeOperation='lighter';
  g.fillStyle=rad(g,0,0,10,tam*3.4,[[0,'rgba(255,120,40,'+(0.32+0.08*Math.sin(t*5)).toFixed(3)+')'],[1,'rgba(255,60,20,0)']]);
  g.beginPath();g.ellipse(0,0,tam*3.6,tam*1.3,0,0,TAU);g.fill();g.restore();
  textoArcade(g,'ARRABAL',0,0,tam,'#ffe36a','#ff5a1a');
  /* el brillo que cruza las letras */
  var bt=(t*0.5)%3, an=tam*3.2;
  if(bt<1){g.save();g.globalCompositeOperation='lighter';g.beginPath();g.rect(-an,-tam*0.75,an*2,tam*1.3);g.clip();
    var bx=-an-30+bt*(an*2+60);g.transform(1,0,-0.4,1,0,0);
    g.fillStyle=lin(g,bx-26,0,bx+26,0,[[0,'rgba(255,255,255,0)'],[0.5,'rgba(255,255,255,0.55)'],[1,'rgba(255,255,255,0)']]);
    g.fillRect(bx-26,-tam*0.75,52,tam*1.3);g.restore();}
  g.restore();
  g.save();g.globalAlpha=Math.min(1,te*1.2)*0.95;
  textoArcade(g,'PELEAS DE BARRIO',x,y+tam*0.72,Math.round(tam*0.26),'#bff0ff','#3a8ad8');
  g.restore();
}
var MENU_ESC={cx:0,suelo:0,alto:230,sep:92};
function paresEnEscena(g,t){
  var P=parMenu(t), c=t-P.t0, suelo=MENU_ESC.suelo, alto=MENU_ESC.alto, cx=MENU_ESC.cx;
  /* el piso de luz donde pisan */
  g.save();g.globalCompositeOperation='lighter';
  g.fillStyle=rad(g,cx,suelo,6,200,[[0,'rgba(255,200,120,0.28)'],[1,'rgba(255,200,120,0)']]);
  g.beginPath();g.ellipse(cx,suelo,200,34,0,0,TAU);g.fill();g.restore();
  var llega=Math.min(1,c/0.45), sale=Math.max(0,(c-4.4)/0.5), fuera=(1-suave(llega))*260+suave(sale)*300;
  var xa=cx-MENU_ESC.sep-fuera, xb=cx+MENU_ESC.sep+fuera, na='guardia', nb='guardia', ba=0, bb=0;
  /* animación de cada uno: [nombre, avance, cuadro suelto de respaldo] */
  var aa=['idle',(t*0.85)%1,'guardia'], ab=['idle',(t*0.85+0.4)%1,'guardia'];
  if(c<0.45){na='dash';nb='dash';aa=['caminar',(c*2)%1,'dash'];ab=['caminar',(c*2)%1,'dash'];}
  else if(c>1.9&&c<2.6){aa=['golpe',(c-1.9)/0.7,'golpe'];if(c>2.0){ab=['golpeado',(c-2.0)/0.6,'golpeado'];xb+=10;bb=c<2.12?1-(c-2.0)/0.12:0;}}
  else if(c>3.0&&c<4.0){ab=['especial',(c-3.0)/1.0,'especial'];if(c>3.1)aa=['golpeado',Math.min(1,(c-3.1)/0.6),'bloqueo'];ba=c>3.1&&c<3.22?1-(c-3.1)/0.12:0;}
  else if(c>4.4){aa=['caminar',((c-4.4)*2)%1,'dash'];ab=['caminar',((c-4.4)*2)%1,'dash'];}
  /* los golpes del menú: chispa y ruido una sola vez cada uno */
  if(c>2.0&&P.golpes===0){P.golpes=1;FX.chispa(cx+8,suelo-130,'255,250,230',false,true);FX.onda(cx+8,suelo-130,'255,230,160',true);Sonido.fx('golpe2');}
  if(c>3.1&&P.golpes===1){P.golpes=2;FX.chispa(cx-30,suelo-120,'255,255,255',true);Sonido.fx('bloqueo');}
  var alfa=Math.min(1,c/0.25)*(1-sale);
  g.fillStyle='rgba(0,0,0,'+(0.35*alfa).toFixed(3)+')';
  g.beginPath();g.ellipse(xa,suelo,40,7,0,0,TAU);g.fill();g.beginPath();g.ellipse(xb,suelo,40,7,0,0,TAU);g.fill();
  var resp=1+Math.sin(t*3.2)*0.012;
  g.save();g.translate(0,suelo);g.scale(1,resp);g.translate(0,-suelo);
  var okA=cuadroAnimSuelto(g,P.a,aa[0],aa[1],xa,suelo,1,alto,alfa,ba,aa[2]), okB=cuadroAnimSuelto(g,P.b,ab[0],ab[1],xb,suelo,-1,alto,alfa,bb,ab[2]);
  g.restore();
  if(okA&&okB&&c>0.5&&c<4.4){
    var an=Math.min(1,(c-0.5)/0.3);
    g.save();g.globalAlpha=an*(1-sale);
    textoArcade(g,LUCH[P.a].nom,xa,suelo+22,12,'#ffffff','#ff5a1a');
    textoArcade(g,LUCH[P.b].nom,xb,suelo+22,12,'#ffffff','#3a8ad8');
    var kv=c<0.8?1.6-(c-0.5)*2:1;
    g.translate(cx,suelo-alto*0.62);g.scale(kv,kv);textoArcade(g,'VS',0,0,30,'#ffe36a','#e0501a');
    g.restore();
  }
}
function marquesina(g,t,y){
  var rec=Prog.ranking&&Prog.ranking[0]?Prog.ranking[0]:null;
  var txt='  ★ RÉCORD '+(rec?rec.ini+' '+numero8(rec.pts):'—')+'   ★ 12 LUCHADORES   ★ PALITO PARA MOVERTE · GOLPE, FUERTE Y ESPECIALES A LA DERECHA · CUBRITE CON EL ESCUDO O TIRANDO PARA ATRÁS   ★ LLENÁ LA BARRA Y TIRÁ EL SÚPER   ★ EL BARRIO TE ESPERA  ';
  g.save();
  g.fillStyle='rgba(10,6,18,0.85)';g.fillRect(0,y,ANCHO,26);
  g.strokeStyle='#d8b25a';g.lineWidth=1.5;g.beginPath();g.moveTo(0,y);g.lineTo(ANCHO,y);g.moveTo(0,y+26);g.lineTo(ANCHO,y+26);g.stroke();
  g.beginPath();g.rect(0,y,ANCHO,26);g.clip();
  g.font='bold 12px Georgia, serif';var w=g.measureText(txt).width, x=-((t*55)%w);
  g.fillStyle='#ffd86a';g.textBaseline='middle';g.textAlign='left';
  g.fillText(txt,x,y+13.5);g.fillText(txt,x+w,y+13.5);
  g.restore();
}
/* el menú apaisado: el escenario con la pareja a la izquierda, la botonera a la derecha */
function dibujarMenu(g,t){
  fondoMenu(g,t,'milonga');
  reflectores(g,t);
  humoMenu(g,t,ALTO*0.25,ALTO*0.8);
  var te=entra(0.02), colX=Math.max(ANCHO*0.56,ANCHO-360), escW=colX;
  MENU_ESC.cx=escW*0.5;MENU_ESC.suelo=ALTO-44;MENU_ESC.alto=236;MENU_ESC.sep=Math.min(110,escW*0.2);
  paresEnEscena(g,t);
  logoMenu(g,t,te,escW*0.5,56,46);
  /* la botonera: un panel de vidrio oscuro con filete */
  var px=colX+10, pw=ANCHO-px-16, py=58, ph=302;
  var ep=entra(0.12);
  g.save();g.globalAlpha=Math.min(1,ep*1.4);g.translate((1-ep)*60,0);
  g.fillStyle='rgba(12,8,22,0.72)';redondo(g,px,py,pw,ph,14);g.fill();
  marcoFilete(g,px,py,pw,ph,t,true);
  g.restore();
  pastillas(g,te);
  if(window.Idioma)Idioma.botonAqui(34,ALTO-60,22);
  var bw=pw-36, bx=px+18, by=py+22;
  var lat=1+Math.max(0,Math.sin(t*4))*0.02;
  g.save();g.translate(bx+bw/2,by+32);g.scale(lat,lat);g.translate(-(bx+bw/2),-(by+32));
  botonCaja(g,'arcade',bx,by,bw,64,'ARCADE','#ffe36a','#e0501a',28,0.2,'6 RIVALES · RONDAS · RÉCORDS');
  g.restore();
  botonCaja(g,'mapa',bx,by+76,bw,52,'HISTORIA','#ffd86a','#c98a1a',20,0.26,'CAMPAÑA CON TUS CARTAS');
  var fw=(bw-16)/3, fy=by+142;
  [['equipo','EQUIPO','grupo'],['coleccion','CARTAS','cartas'],['relicario','COFRE','cofre']].forEach(function(b,i){
    var x=bx+i*(fw+8), e=entra(0.34+i*0.05);if(e<=0)return;
    var ap=UI.apretado===b[0];
    g.save();g.globalAlpha=Math.min(1,e*1.4);g.translate(x+fw/2,fy+30+(1-e)*40+(ap?3:0));g.scale(ap?0.95:1,ap?0.95:1);
    panel(g,-fw/2,-30,fw,60,t);icono(g,b[2],0,-8+Math.sin(t*3+i)*1.5,22,'#ffd23a');texto(g,b[1],0,16,11,'#f3e6c4');
    if(b[0]==='relicario'&&Prog.fichas>0){var pl=1+Math.max(0,Math.sin(t*6))*0.15;g.save();g.translate(fw/2-8,-22);g.scale(pl,pl);
      g.fillStyle='#c0392b';g.beginPath();g.arc(0,0,9,0,TAU);g.fill();texto(g,String(Prog.fichas),0,0.5,10,'#fff',null,false);g.restore();}
    g.restore();UI.boton(b[0],x,fy,fw,60);
  });
  var ry=fy+72;
  botonCaja(g,'ranking',bx,ry,bw/2-5,40,'RÉCORDS','#bff0ff','#3a8ad8',14,0.5);
  botonCaja(g,'ajustes',bx+bw/2+5,ry,bw/2-5,40,'AJUSTES','#d8cfb5','#8a7a5a',14,0.55);
  marquesina(g,t,ALTO-26);
}

/* ---------------- elegir luchador: grilla con cursor y cuenta regresiva ---------------- */
function empezarArcade(){J.sel=Math.max(0,ORDEN_LUCH.indexOf(J.ultimoArcade||'morocha'));J.tSel=20;irA('selec');Sonido.fx('ficha');}
function pasarSelec(dt){
  J.tSel-=dt;
  if(J.tSel<=0)elegirArcade();          /* se acaba el tiempo: juega el que está marcado */
}
function elegirArcade(){
  var l=ORDEN_LUCH[J.sel];J.ultimoArcade=l;
  var otros=ORDEN_LUCH.filter(function(x){return x!==l;});
  for(var i=otros.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tt=otros[i];otros[i]=otros[j];otros[j]=tt;}
  /* seis rivales al azar entre los once, y el jefe final: uno de los que no tocaron */
  J.arc={l:l,escalera:otros.slice(0,6).concat([otros[6+Math.floor(Math.random()*(otros.length-6))]]),i:0,puntos:0,continues:0};
  Sonido.fx('elegir');vibrar(40);
  J.elegido=0.9;           /* el marco destella antes del VS */
}
function dibujarSelec(g,t){
  fondoMenu(g,t,'conventillo');
  var l=ORDEN_LUCH[J.sel], L=LUCH[l], C=cartaDe(CARTA_ARCADE[l]);
  var izq=Math.round(ANCHO*0.42), gx0=izq+10, gw0=ANCHO-gx0-18;
  textoArcade(g,'ELEGÍ TU LUCHADOR',izq/2,32,20,'#ffffff','#ffd23a');
  /* la cuenta regresiva, como en el salón */
  var s=Math.max(0,Math.ceil(J.tSel));
  g.save();g.translate(ANCHO-40,34);var pul=s<=5?1+Math.max(0,Math.sin(t*TAU))*0.15:1;g.scale(pul,pul);
  textoArcade(g,String(s),0,0,26,s<=5?'#ff9d8a':'#ffffff',s<=5?'#ff3a2a':'#ffd23a');g.restore();
  /* el elegido de cuerpo entero, sobre un piso de luz, entrando desde el costado */
  var ent=Math.min(1,J.tMenuSel*6), cx=izq/2+(1-ent)*-60, suelo=ALTO-26;
  halo(g,cx,suelo-120,170,ELEM[C.e].col,0.28);
  g.save();g.globalCompositeOperation='lighter';g.fillStyle=rad(g,cx,suelo,4,150,[[0,'rgba(255,210,140,0.3)'],[1,'rgba(255,210,140,0)']]);
  g.beginPath();g.ellipse(cx,suelo,150,26,0,0,TAU);g.fill();g.restore();
  if(J.animSel!==l){J.animSel=l;soltarAnims([l]);}
  var ele=J.elegido>0, pa=ele?1-J.elegido/0.9:(t*0.85)%1;
  g.save();g.globalAlpha=ent;
  if(!cuadroAnimSuelto(g,l,ele?'victoria':'idle',pa,cx,suelo,1,262,1,ele?Math.max(0,J.elegido-0.6)*2:0,ele?'victoria':'guardia'))retrato(g,l,cx-120,60,240,ALTO-90,false,false,0.02,true);
  g.restore();
  /* la grilla de doce: 6 x 2 */
  var col=6, gap=6, cw=(gw0-(col-1)*gap)/col, ch=cw*1.08, gy=64;
  ORDEN_LUCH.forEach(function(id,i){
    var x=gx0+(i%col)*(cw+gap), y=gy+Math.floor(i/col)*(ch+gap), mio=i===J.sel, e=entra(0.05+i*0.02);
    if(e<=0)return;
    g.save();g.globalAlpha=Math.min(1,e*1.5);
    g.fillStyle=mio?'rgba(60,30,20,0.95)':'rgba(14,8,24,0.9)';redondo(g,x,y,cw,ch,6);g.fill();
    g.save();redondo(g,x,y,cw,ch,6);g.clip();retrato(g,id,x,y+2,cw,ch-2,false,false,0.02);g.restore();
    g.strokeStyle=mio?(titila(8)||J.elegido>0?'#ffe36a':'#ff5a1a'):'rgba(216,178,90,0.45)';g.lineWidth=mio?4:1.5;redondo(g,x,y,cw,ch,6);g.stroke();
    if(mio){textoArcade(g,'1P',x+14,y+11,11,'#bff0ff','#3a8ad8');}
    g.restore();
    UI.boton('sel:'+i,x,y,cw,ch);
  });
  /* el nombre, el título de la carta y cuatro barras */
  var iy=gy+ch*2+gap+26;
  textoArcade(g,L.nom,gx0,iy,22,'#ffe36a','#ff7a1a','left');
  texto(g,BARRIOS[CASA[l]].nom.toUpperCase()+' · '+C.nom,gx0,iy+22,10,'#cfc2a4','left',false);
  var st=[['DAÑO',L.atk/130],['VIDA',L.vida/1200],['VELOCIDAD',L.vel/1.2],['ALCANCE',L.alcance*(ALCANCE_ARMA[L.estilo]||1)/1.9]];
  st.forEach(function(q,i){var x=gx0+(i%2)*(gw0*0.3), y=iy+44+Math.floor(i/2)*18;
    texto(g,q[0],x,y,9,'#cfc2a4','left',false);barra(g,x+64,y-5,gw0*0.3-80,10,q[1],'#ffe36a','#e0701a');});
  if(!J.elegido)botonCaja(g,'elegir',ANCHO-18-190,ALTO-70,190,54,'¡ELEGIR!','#ffe36a','#e0501a',22,0.1);
}

/* ---------------- el VS de arcade: los dos enteros, el barrio y el número de pelea ---------------- */
function arcadeRival(){var a=J.arc, fin=a.i===a.escalera.length-1;return{l:a.escalera[a.i],fin:fin};}
function dibujarVSArcade(g,t){
  var a=J.arc, r=arcadeRival(), k=Math.min(1,J.tMenu/0.4), sal=Math.max(0,(J.tMenu-2.6)/0.3);
  g.fillStyle='#0a0510';g.fillRect(0,0,ANCHO,ALTO);
  /* dos mitades separadas por una diagonal, cada una de su color */
  var cxd=ANCHO/2;
  g.save();g.fillStyle=lin(g,0,0,cxd,0,[[0,'#0a1430'],[1,'#1d3a7a']]);g.beginPath();g.moveTo(0,0);g.lineTo(cxd+60,0);g.lineTo(cxd-60,ALTO);g.lineTo(0,ALTO);g.closePath();g.fill();
  g.fillStyle=lin(g,cxd,0,ANCHO,0,[[0,'#8a1a1a'],[1,'#3a0a10']]);g.beginPath();g.moveTo(cxd+60,0);g.lineTo(ANCHO,0);g.lineTo(ANCHO,ALTO);g.lineTo(cxd-60,ALTO);g.closePath();g.fill();
  /* rayos de velocidad en cada mitad */
  g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,255,255,0.06)';
  for(var i=0;i<14;i++){var y=((i*53+t*420)%(ALTO+60))-30;g.fillRect(0,y,cxd-40,3);g.fillRect(cxd+40,ALTO-y,ANCHO,3);}
  g.restore();
  var alto=ALTO*0.92;
  retrato(g,a.l,-320+k*(ANCHO*0.06+320)-sal*400,ALTO-alto,ANCHO*0.38,alto,false,false,0.02,true);
  retrato(g,r.l,ANCHO-k*(ANCHO*0.44)+sal*400,ALTO-alto,ANCHO*0.38,alto,true,false,0.02,true);
  textoArcade(g,LUCH[a.l].nom,24,ALTO-30,22,'#bff0ff','#3a8ad8','left');
  textoArcade(g,(r.fin?'JEFE FINAL · ':'')+LUCH[r.l].nom,ANCHO-24,ALTO-30,22,'#ffb0a0','#e0301a','right');
  var ev=Math.max(0,1-(J.tMenu-0.3)*3), es=1+ev*3;
  g.save();g.translate(ANCHO/2,ALTO*0.5);g.scale(es,es);g.rotate(-0.1);g.globalAlpha=1-sal;
  textoArcade(g,'VS',0,0,86,'#ffffff','#ffd23a');g.restore();
  textoArcade(g,'PELEA '+(a.i+1)+' DE '+a.escalera.length,ANCHO/2,30,16,'#ffffff','#ffd23a');
  texto(g,BARRIOS[CASA[r.l]].nom,ANCHO/2,54,12,'#f3e6c4');
  texto(g,'1P  '+numero8(a.puntos),ANCHO/2,ALTO-18,12,'#ffd23a');
}
function arrancarPeleaArcade(){
  var a=J.arc, r=arcadeRival(), n=a.i;
  var pe={n:n+1,barrio:CASA[r.l],jefe:r.fin,equipo:[instArcade(r.l,r.fin?30:16+n*2,r.fin?2:0)],dificultad:r.fin?0.92:Math.min(0.85,0.3+n*0.11)};
  nuevaPelea(pe,[instArcade(a.l,20)],'arcade');
  M.puntosIni=a.puntos;M.puntos=a.puntos;
  irA('pelea');
}
/* el final de una pelea de arcade */
function arcadeFinPelea(res){
  var a=J.arc;a.puntos=M.puntos;
  if(res==='gano'){
    a.i++;
    if(a.i>=a.escalera.length){irA('campeon');Sonido.fx('victoria');return;}
    irA('vs');Sonido.fx('vs');
  } else {J.tCont=10;irA('continuar');Sonido.musica('relicario');}
}
function pasarContinuar(dt){
  var antes=Math.ceil(J.tCont);J.tCont-=dt;
  if(Math.ceil(J.tCont)!==antes&&J.tCont>0)Sonido.fx('cuenta2');
  if(J.tCont<=0)juegoTerminado();
}
function juegoTerminado(){
  var a=J.arc;
  if(entraEnRanking(a.puntos)){J.ini=[0,0,0];J.iniSlot=0;irA('iniciales');}
  else{irA('gameover');Sonido.fx('derrota');}
}
function dibujarContinuar(g,t){
  g.fillStyle='#0a0510';g.fillRect(0,0,ANCHO,ALTO);
  var a=J.arc, izq=ANCHO*0.42;
  g.save();g.globalAlpha=0.55;
  if(!cuadroSuelto(g,a.l,'golpeado',izq/2,ALTO-18,1,300,0.55,0))retrato(g,a.l,izq/2-140,20,280,ALTO-40,false,false,0.02,true);
  g.restore();
  var cx=izq+(ANCHO-izq)/2;
  textoArcade(g,'¿CONTINUÁS?',cx,70,34,'#ffffff','#ffd23a');
  var s=Math.max(0,Math.ceil(J.tCont)), k=J.tCont-Math.floor(J.tCont);
  g.save();g.translate(cx,150);g.scale(1+k*0.4,1+k*0.4);textoArcade(g,String(s),0,0,64,'#ff9d8a','#ff2a1a');g.restore();
  texto(g,'EL PUNTAJE VUELVE A CERO',cx,206,11,'#b9a67a');
  botonCaja(g,'continuar',cx-110,232,220,56,'¡SÍ!','#ffe36a','#e0501a',24,0.05);
  botonCaja(g,'rendirArcade',cx-70,300,140,40,'NO','#d8cfb5','#8a7a5a',15,0.1);
}
function dibujarCampeon(g,t){
  var a=J.arc, izq=ANCHO*0.45;
  fondoMenu(g,t,'milonga');
  g.save();g.globalCompositeOperation='lighter';
  for(var i=0;i<14;i++){var an=i/14*TAU+t*0.3;g.fillStyle='rgba(255,210,90,0.1)';g.beginPath();g.moveTo(izq/2,ALTO*0.45);g.lineTo(izq/2+Math.cos(an)*900,ALTO*0.45+Math.sin(an)*900);g.lineTo(izq/2+Math.cos(an+0.12)*900,ALTO*0.45+Math.sin(an+0.12)*900);g.closePath();g.fill();}
  g.restore();
  if(!cuadroSuelto(g,a.l,'victoria',izq/2,ALTO-16,1,300,1,0))retrato(g,a.l,izq/2-140,20,280,ALTO-40,false,false,0.02,true);
  for(var p=0;p<3;p++)if(az()<0.3)FX.petalo(az()*ANCHO,10);
  var cx=izq+(ANCHO-izq)/2;
  textoArcade(g,'¡CAMPEÓN',cx,80,36,'#ffe36a','#ff5a1a');
  textoArcade(g,'DEL ARRABAL!',cx,124,36,'#ffe36a','#ff5a1a');
  texto(g,LUCH[a.l].nom,cx,166,16,'#f3e6c4');
  textoArcade(g,numero8(a.puntos),cx,214,28,'#ffffff','#ffd23a');
  botonCaja(g,'finArcade',cx-110,262,220,54,'SEGUIR','#ffe36a','#e0501a',22,1.2);
}
function dibujarGameOver(g,t){
  g.fillStyle='#0a0510';g.fillRect(0,0,ANCHO,ALTO);
  var e=Math.min(1,J.tMenu/0.6);
  g.save();g.globalAlpha=e;textoArcade(g,'FIN DEL JUEGO',ANCHO/2,ALTO*0.4,36,'#ff9d8a','#c0201a');g.restore();
  texto(g,'1P  '+numero8(J.arc.puntos),ANCHO/2,ALTO*0.5,16,'#ffd23a');
  if(J.tMenu>1.5)botonCaja(g,'finArcade',ANCHO/2-100,ALTO*0.62,200,52,'SEGUIR','#d8cfb5','#8a7a5a',18,1.5);
}
/* ---------------- récords con iniciales ---------------- */
var LETRAS='ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789';
function entraEnRanking(p){return p>0&&(Prog.ranking.length<5||p>Prog.ranking[Prog.ranking.length-1].pts);}
function guardarIniciales(){
  var ini=J.ini.map(function(i){return LETRAS[i];}).join('');
  Prog.ranking.push({ini:ini,pts:J.arc.puntos,l:J.arc.l});
  Prog.ranking.sort(function(a,b){return b.pts-a.pts;});Prog.ranking=Prog.ranking.slice(0,5);
  guardarProg();J.nuevoRecord=ini;irA('ranking');Sonido.fx('victoria');
}
function dibujarIniciales(g,t){
  g.fillStyle='#0a0510';g.fillRect(0,0,ANCHO,ALTO);
  var cx=ANCHO*0.4;
  textoArcade(g,'¡NUEVO RÉCORD!',cx,44,28,'#ffe36a','#ff5a1a');
  textoArcade(g,numero8(J.arc.puntos),cx,80,22,'#ffffff','#ffd23a');
  texto(g,'PONÉ TUS INICIALES',cx,106,12,'#f3e6c4');
  for(var i=0;i<3;i++){
    var x=cx+(i-1)*96, y=246, mio=i===J.iniSlot;
    [['up',-84,'▲'],['dn',84,'▼']].forEach(function(b){
      g.fillStyle=UI.apretado==='ini:'+b[0]+':'+i?'rgba(255,210,90,0.45)':'rgba(255,210,90,0.16)';redondo(g,x-32,y+b[1]-22,64,44,10);g.fill();
      texto(g,b[2],x,y+b[1],20,'#ffd23a',null,false);UI.boton('ini:'+b[0]+':'+i,x-34,y+b[1]-24,68,48);
    });
    g.fillStyle='rgba(14,8,24,0.95)';g.fillRect(x-34,y-36,68,72);
    g.strokeStyle=mio&&titila(4)?'#ffe36a':'#5a4a3a';g.lineWidth=3;g.strokeRect(x-34,y-36,68,72);
    textoArcade(g,LETRAS[J.ini[i]],x,y,44,'#ffffff','#ffd23a');
    UI.boton('ini:sel:'+i,x-34,y-36,68,72);
  }
  botonCaja(g,'iniListo',ANCHO*0.78-100,ALTO/2+10,200,56,'LISTO','#ffe36a','#e0501a',22,0.1);
}
function dibujarRanking(g,t){
  fondoMenu(g,t,'riachuelo');
  textoArcade(g,'LOS MEJORES',ANCHO/2,36,28,'#ffe36a','#ff5a1a');
  texto(g,'DEL ARRABAL',ANCHO/2,62,12,'#f3e6c4');
  var cols=['#ffe36a','#e6eef7','#e8a86a','#cfc2a4','#cfc2a4'], w=Math.min(620,ANCHO-80), x0=(ANCHO-w)/2;
  Prog.ranking.forEach(function(r,i){
    var y=80+i*64, e=entra(0.1+i*0.08);if(e<=0)return;
    var nuevo=J.nuevoRecord===r.ini&&J.arc&&r.pts===J.arc.puntos;
    g.save();g.globalAlpha=Math.min(1,e*1.4);g.translate((1-e)*-100,0);
    panel(g,x0,y,w,56,t);
    textoArcade(g,(i+1)+'°',x0+30,y+28,22,cols[i],'#8a5a1a');
    retrato(g,r.l||'morocha',x0+56,y+5,46,46,false,true);
    textoArcade(g,r.ini,x0+130,y+28,24,nuevo&&titila(4)?'#7cff9d':'#ffffff',nuevo?'#2a9a4a':'#ffd23a','left');
    textoArcade(g,numero8(r.pts),x0+w-18,y+28,22,cols[i],'#8a5a1a','right');
    g.restore();
  });
  botonVolver(g)
}
