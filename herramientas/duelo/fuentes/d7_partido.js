/* ---------------- el partido: uno contra uno, se patea por turnos ----------------
   Vos pateás al arco de arriba y el rival ataja; después patea él y atajás vos en tu arco (el de
   abajo, pegado a la cámara). 90 segundos de juego; si empatan, muerte súbita de a un tiro. */
var G_=9.81, KD=0.0055, KM=0.0052, DURACION=90;
var P=null, YO=null, EL=null;
var B={p:new THREE.Vector3(0,R_PELOTA,0),v:new THREE.Vector3(),w:new THREE.Vector3(),vuela:false,super:false};
function crearJugadores(){
  YO=crearFutbolista('jugador-rojo',{numero:9,guantes:'#2adf6a',cam:'#d8282a'})||crearJugador({cam:'#d8282a',short:'#ffffff',med:'#d8282a',piel:'#e0a878',pelo:'#e8c060',numero:9,guantes:'#2adf6a'});YO.num=9;
  EL=crearFutbolista('jugador-amarillo',{numero:1,guantes:'#ff4fa0',cam:'#ffd23a'})||crearJugador({cam:'#ffd23a',short:'#1a3a8a',med:'#ffd23a',piel:'#8a5a3a',pelo:'#1a1010',numero:1,guantes:'#ff4fa0'});EL.num=1;
}
function nuevoPartido(o){
  P={fase:'intro',tf:0,reloj:DURACION,goles:[0,0],pod:[0,0],turno:Math.random()<0.5?0:1,dif:o.dif,arena:o.arena,rival:o.rival,
    muerte:false,tirosRonda:0,tiros:[0,0],alArco:[0,0],atajadas:[0,0],cartel:null,res:null,tRes:0,lento:0,escLento:1,
    camino:[],flecha:null,superArmado:false,reflejos:0,rec:[],repe:null,dijo10:false,hist:[],quieto:0,practica:!!o.practica};
  vestirJugador(YO,KITS[Prog.kit]);vestirPelota(Prog.pelota);
  var c=o.rival.cam;
  if(EL.glb)vestirFutbolista(EL,{cam:c,short:'#1a2a5a'},true);
  else{EL.mats.cam.color.set(c);EL.mats.short.color.set('#1a2a5a');EL.mats.med.color.set(c);
    EL.numero.material.map=texNumero(1,c,'#1a1a2a');EL.numero.material.needsUpdate=true;}
  YO.raiz.visible=EL.raiz.visible=true;R3.pelota.visible=true;
  prepararTiro();P.fase='intro';P.tf=0;
  Sonido.voz('listos',1,true);
}
/* ---------------- preparar cada tiro ---------------- */
function prepararTiro(){
  var yoPatea=P.turno===0;
  P.res=null;P.tRes=0;P.rec.length=0;P.camino.length=0;P.flecha=null;P.quieto=0;
  B.vuela=false;B.v.set(0,0,0);B.w.set(0,0,0);B.super=false;R3.estela.pts.length=0;
  var sx=(Math.random()-0.5)*5, sz=yoPatea?(-1+Math.random()*5):(-4+Math.random()*5);
  B.p.set(sx,R_PELOTA,sz);
  var tirador=yoPatea?YO:EL, arquero=yoPatea?EL:YO, zArco=yoPatea?Z_RIVAL:Z_MIO;
  /* el que patea, parado atrás de la pelota mirando al arco */
  var dx=0-sx, dz=zArco-sz, d=Math.hypot(dx,dz);
  tirador.giro=Math.atan2(-dx,-dz);
  var atras=yoPatea?0.75:1.9;
  tirador.x=sx-dx/d*atras;tirador.z=sz-dz/d*atras;tirador.y=0;tirador.anim=yoPatea?'espera':'quieto';tirador.p=0;
  if(yoPatea&&tirador.glb){var pp=puntoDePatada(tirador,sx,sz,tirador.giro);if(pp){tirador.x=pp.x;tirador.z=pp.z;}}
  arquero.x=0;arquero.y=0;arquero.z=zArco+(yoPatea?0.45:-0.45);arquero.giro=yoPatea?Math.PI:0;arquero.anim='arquero';arquero.p=0;arquero.vx=0;
  arquero.kx=0;arquero.volando=false;arquero.reac=0;arquero.previsto=false;
  P.tirador=tirador;P.arquero=arquero;P.zArco=zArco;
  /* la cámara: atrás de tu arco; si pateás, un poco más adelante para ver el arco de arriba */
  var C=R3.camObj;
  /* más baja y más cerca que antes, siguiendo a la pelota: el arco se ve ~67 % más grande (apuntar es más preciso)
     y la pelota y el arco entran siempre en la pantalla parada (buscado con la pelota en las esquinas) */
  if(yoPatea){C.pos.set(sx,2.8,sz+6.8);C.mira.set(sx*0.5,1.1,Z_RIVAL+1);C.fov=46;}
  else{C.pos.set(0,4.2,Z_MIO+6.4);C.mira.set(0,0.5,-2);C.fov=62;}
}
/* ---------------- la pelota ---------------- */
var _a=new THREE.Vector3(), _n=new THREE.Vector3();
function pasoPelota(dt,partes){
  var v=B.v, p=B.p, w=B.w, sp=v.length();
  v.y-=G_*dt;
  v.addScaledVector(v,-KD*sp*dt);
  _a.crossVectors(w,v).multiplyScalar(KM);v.addScaledVector(_a,dt);
  w.multiplyScalar(1-0.35*dt);
  var zAntes=p.z;
  p.addScaledVector(v,dt);
  /* piso */
  if(p.y<R_PELOTA){p.y=R_PELOTA;if(v.y<-1.2){v.y=-v.y*0.55;Sonido.fx('rebote',Math.min(1,-v.y/6));}else v.y=0;v.x*=0.985;v.z*=0.985;w.multiplyScalar(0.9);}
  /* tableros de los costados y de atrás */
  var hw=ANCHO_C/2+0.5;if(Math.abs(p.x)>hw){p.x=sig(p.x)*hw;v.x=-v.x*0.6;}
  if(Math.abs(p.z)>LARGO/2+1.35){p.z=sig(p.z)*(LARGO/2+1.35);v.z=-v.z*0.3;}
  /* los palos y el travesaño de los dos arcos */
  [Z_MIO,Z_RIVAL].forEach(function(zg){
    if(Math.abs(p.z-zg)>0.4)return;
    [[-ARCO_W/2,0,-ARCO_W/2,ARCO_H],[ARCO_W/2,0,ARCO_W/2,ARCO_H],[-ARCO_W/2,ARCO_H,ARCO_W/2,ARCO_H]].forEach(function(s){
      var ax=s[0],ay=s[1],bx=s[2],by=s[3], ex=bx-ax, ey=by-ay, L2=ex*ex+ey*ey, t=lim(((p.x-ax)*ex+(p.y-ay)*ey)/L2,0,1);
      var cx=ax+ex*t, cy=ay+ey*t;_n.set(p.x-cx,p.y-cy,p.z-zg);var d=_n.length(), min=R_PELOTA+0.06;
      if(d<min&&d>1e-5){_n.divideScalar(d);p.set(cx,cy,zg).addScaledVector(_n,min);var vn=v.dot(_n);
        if(vn<0){v.addScaledVector(_n,-1.75*vn);v.multiplyScalar(0.85);if(!P.res&&!B.golpePalo){B.golpePalo=true;Sonido.fx('poste',Math.min(1,-vn/15));Sonido.voz('palo',0.8);R3.sacude=0.5;}}}
    });
  });
  /* el arquero: esferas en manos, antebrazos, cabeza, cuerpo y piernas */
  if(partes&&Math.abs(p.z-P.arquero.z)<2.2){
    for(var i=0;i<partes.length;i++){var q=partes[i];_n.set(p.x-q.x,p.y-q.y,p.z-q.z);var d2=_n.length(), mn=R_PELOTA+q.r*(P.alcance||1);
      if(d2<mn&&d2>1e-5){_n.divideScalar(d2);p.set(q.x,q.y,q.z).addScaledVector(_n,mn);var vn2=v.dot(_n);
        if(vn2<0){v.addScaledVector(_n,-1.35*vn2);v.multiplyScalar(0.55);v.y+=1.2;w.multiplyScalar(0.3);
          if(!P.res){marcarRes('atajada');}}}}
  }
  /* ¿cruzó una línea de gol? */
  var zg=P.zArco, cruzo=(zg<0)?(zAntes>zg&&p.z<=zg):(zAntes<zg&&p.z>=zg);
  if(cruzo&&!P.res){
    if(Math.abs(p.x)<ARCO_W/2-R_PELOTA*0.3&&p.y<ARCO_H-R_PELOTA*0.3)marcarRes('gol');
    else marcarRes(B.golpePalo?'palo':'afuera');
  }
  /* adentro del arco: la red frena */
  if(P.res==='gol'){var fondo=zg+sig(zg)*ARCO_P*0.9;
    if((zg<0&&p.z<fondo)||(zg>0&&p.z>fondo)){p.z=fondo;if(!B.enRed){B.enRed=true;golpeRed(zg>0?0:1,p.x,p.y,sp/18);}v.multiplyScalar(0.25);}}
}
function lanzar(v0,spin,superT){
  B.v.copy(v0);B.w.copy(spin);B.vuela=true;B.golpePalo=false;B.enRed=false;B.super=!!superT;
  P.fase='vuelo';P.tf=0;P.alcance=1;
  var fuerte=v0.length();Sonido.fx(fuerte>24?'patada2':'patada');if(superT){Sonido.fx('fuego');R3.sacude=0.6;}
  P.tiros[P.turno]++;
  /* la reacción del arquero rival (si ataja el rival) */
  var A=P.arquero;A.reac=0;A.previsto=false;
}
/* simular un tiro sin mover nada (para apuntar con efecto y para la flecha) */
function simular(p0,v0,w0,zObj){
  var p=p0.clone(), v=v0.clone(), w=w0.clone(), dt=1/120;
  for(var i=0;i<400;i++){
    var sp=v.length();v.y-=G_*dt;v.addScaledVector(v,-KD*sp*dt);_a.crossVectors(w,v).multiplyScalar(KM);v.addScaledVector(_a,dt);w.multiplyScalar(1-0.35*dt);
    var za=p.z;p.addScaledVector(v,dt);if(p.y<R_PELOTA){p.y=R_PELOTA;v.y=Math.abs(v.y)*0.5;}
    if((zObj<0&&za>zObj&&p.z<=zObj)||(zObj>0&&za<zObj&&p.z>=zObj)){var f=(zObj-za)/(p.z-za);return {p:p,t:i*dt,v:v};}
  }
  return null;
}
/* la velocidad de salida para llegar a (tx,ty) en el arco con esa rapidez y ese efecto: se corrige mirando dónde cae */
function resolverTiro(p0,tx,ty,zObj,rapidez,spinY){
  var obj=new THREE.Vector3(tx,ty,zObj), apunta=obj.clone(), v0=new THREE.Vector3(), w=new THREE.Vector3(0,spinY,0);
  for(var k=0;k<4;k++){
    var dx=apunta.x-p0.x, dz=apunta.z-p0.z, dh=Math.hypot(dx,dz), t=dh/rapidez;
    v0.set(dx/t,(apunta.y-p0.y)/t+0.5*G_*t,dz/t);
    var r=simular(p0,v0,w,zObj);if(!r)break;
    apunta.x+=(obj.x-r.p.x);apunta.y+=(obj.y-r.p.y)*0.9;
  }
  return v0;
}
/* ---------------- vos pateás: leer el trazo del dedo ----------------
   La pelota va adonde apunta el dedo: el final del trazo se proyecta sobre el arco con la perspectiva de la
   cámara (un rayo desde la cámara que corta el plano del arco). Si el dedo no llegó hasta el arco, el trazo se
   prolonga en su misma dirección hasta la línea del arco y la fuerza lo levanta un poco. La velocidad del final
   del gesto da la fuerza; la panza del trazo (suavizado) da el efecto, y el tiro igual termina donde apuntó. */
function suavizarTrazo(c){
  if(c.length<5)return c;
  var o=[c[0]];
  for(var i=1;i<c.length-1;i++){var a=c[Math.max(0,i-2)],b=c[i-1],m=c[i],n=c[i+1],z=c[Math.min(c.length-1,i+2)];
    o.push({x:(a.x+2*b.x+3*m.x+2*n.x+z.x)/9,y:(a.y+2*b.y+3*m.y+2*n.y+z.y)/9,t:m.t});}
  o.push(c[c.length-1]);return o;
}
function leerTiro(traza){
  if(!traza||traza.length<2)return null;
  var c=suavizarTrazo(traza), s=c[0], e=c[c.length-1], dx=e.x-s.x, dy=e.y-s.y, L=Math.hypot(dx,dy);
  if(dy>-30||L<40)return null;
  var ms=Math.max(40,e.t-s.t);
  /* la fuerza: pesa la velocidad del final del gesto (los últimos 90 ms), no sólo la media */
  var k=c.length-1;while(k>0&&e.t-c[k-1].t<90)k--;var q=c[Math.max(0,k-1)];
  var vFin=Math.hypot(e.x-q.x,e.y-q.y)/Math.max(0.016,(e.t-q.t)/1000), vel=Math.max(L/(ms/1000),vFin*0.85);
  var pot=lim(vel/1500*0.65+L/420*0.45,0.25,1.35);
  /* el efecto: cuánto se panza el trazo respecto de la cuerda (derecha = +); lo muy chico es temblor del dedo */
  var mx=0;for(var i=1;i<c.length-1;i++){var d=((c[i].x-s.x)*dy-(c[i].y-s.y)*dx)/L;if(Math.abs(d)>Math.abs(mx))mx=d;}
  var cu=-mx/L;cu=Math.abs(cu)<0.035?0:cu-sig(cu)*0.035;var curva=lim(cu*1.15,-0.45,0.45);
  /* adónde apunta: el final del trazo sobre el arco */
  var zA=P.zArco, lin=aPantalla(new THREE.Vector3(B.p.x*0.3,0,zA)), ex=e.x, ey=e.y, alza=0;
  if(ey>lin.y){var f=(s.y-lin.y)/Math.max(1,s.y-ey);ex=s.x+dx*f;ey=lin.y;alza=Math.max(0,pot-0.55)*1.1;}
  var hit=rayoAPlanoZ(ex,ey,zA);if(!hit)return null;
  return {tx:hit.x,ty:Math.max(0.14,hit.y)+alza,pot:pot,curva:curva,vel:vel};
}
/* la salida del tiro (sin el error por pasarse de fuerza): la usan el tiro y la trayectoria que se dibuja */
function planTiro(T,sup,tx,ty){
  var rap=(16.5+11*Math.min(1.05,T.pot))*(sup?1.3:1), spin=lim(T.curva*70,-26,26)*(sup?1.4:1);
  return {v:resolverTiro(B.p,tx===undefined?T.tx:tx,ty===undefined?T.ty:ty,P.zArco,rap,spin),spin:spin};
}
/* los puntos del vuelo hasta el arco (misma física que la pelota), para dibujarlos mientras se apunta */
function trayectoriaTiro(v0,spinY,n){
  var p=B.p.clone(), v=v0.clone(), w=new THREE.Vector3(0,spinY,0), dt=1/120, out=[p.clone()], zObj=P.zArco, cada=Math.max(1,Math.round(0.6/dt/(n||14)));
  for(var i=1;i<400;i++){
    var sp=v.length();v.y-=G_*dt;v.addScaledVector(v,-KD*sp*dt);_a.crossVectors(w,v).multiplyScalar(KM);v.addScaledVector(_a,dt);w.multiplyScalar(1-0.35*dt);
    var za=p.z;p.addScaledVector(v,dt);if(p.y<R_PELOTA){p.y=R_PELOTA;v.y=Math.abs(v.y)*0.5;}
    if(i%cada===0)out.push(p.clone());
    if((zObj<0&&p.z<=zObj)||(zObj>0&&p.z>=zObj)){out.push(p.clone());break;}
  }
  return out;
}
function patearYo(T){
  var sup=P.superArmado;P.superArmado=false;if(sup)P.pod[0]=0;
  /* pasarse de fuerza sale menos preciso (lo demás va exactamente adonde apuntaste) */
  var err=Math.max(0,T.pot-1.1)*1.4;
  var tx=T.tx+(Math.random()-0.5)*err, ty=T.ty+Math.random()*err*0.6, pl=planTiro(T,sup,tx,ty);
  P.tiroYo={v:pl.v,spin:new THREE.Vector3(0,pl.spin,0),sup:sup,tx:tx,ty:ty};
  YO.anim='patear';YO.p=0;P.fase='pateando';P.tf=0;
  if(Prog.tuto){Prog.tuto=false;guardarProg();}
}
/* ---------------- el rival patea ---------------- */
function planearTiroRival(){
  var d=P.dif, r=Math.random();
  var lado=r<0.18?0:(Math.random()<0.5?-1:1);
  var tx=lado*(1.0+Math.random()*0.85), ty=0.2+Math.random()*1.65;
  var picar=Math.random()<0.08;
  var rap=picar?13:(16+Math.random()*6+d*6), spin=(Math.random()-0.5)*2*(8+d*18);
  if(picar){ty=1.85;spin=0;}
  var err=(1-d)*0.7;tx+=(Math.random()-0.5)*err;ty+=(Math.random()-0.5)*err*0.6;
  var sup=P.pod[1]>=1&&Math.random()<0.7;if(sup){P.pod[1]=0;rap*=1.25;spin*=1.3;}
  P.tiroEl={v:resolverTiro(B.p,tx,ty,P.zArco,rap,spin),spin:new THREE.Vector3(0,spin,0),sup:sup};
}
/* ---------------- los arqueros ---------------- */
function pasarArqueroRival(A,dt){
  if(A.volando){pasarVolada(A,dt);return;}
  if(P.fase==='vuelo'&&!P.res){
    A.reac+=dt;
    var demora=0.39-0.18*P.dif+(B.super?0.12:0)+Math.abs(B.w.y)*0.004;
    if(A.reac>demora){
      /* predice en línea recta (no lee el efecto): por eso el chanfle lo engaña */
      var vz=B.v.z;if(Math.abs(vz)<0.5)return;
      var t=(A.z-B.p.z)/vz;if(t<0)return;
      var px=B.p.x+B.v.x*t, py=B.p.y+B.v.y*t-0.5*G_*t*t;
      if(!A.ruido)A.ruido=(Math.random()-0.5)*(1.35*(1-P.dif)+0.3);
      px+=A.ruido;
      var dx=px-A.x;
      if(Math.abs(dx)<0.5&&py<1.4){A.x+=lim(dx,-4*dt,4*dt);A.vx=dx;}
      else if(t<0.5+0.1*P.dif&&Math.abs(px)<ARCO_W/2+0.8){
        var alc=1.35+0.45*P.dif;empezarVolada(A,lim(dx,-alc,alc),lim(py-0.8,0,1.1));
      } else {A.x+=lim(dx,-3*dt,3*dt)*0.6;A.vx=dx;}
    }
  }
}
function empezarVolada(A,dx,dy){A.volando=true;A.anim='volada';A.p=0;A.dx=dx;A.dy=dy;A.x0=A.x;Sonido.fx('salto');}
function pasarVolada(A,dt){
  A.p+=dt;
  /* el futbolista con esqueleto: el clip de la estirada lleva la cadera (d6b); acá sólo se ve cuándo terminó */
  if(A.glb){if(A.p>finVolada(A)){A.volando=false;A.anim='arquero';A.y=0;A.p=0;}return;}
  var e=ease(A.p/0.5);
  A.x=A.x0+A.dx*e;A.y=Math.max(0,A.dy)*0.35*Math.sin(Math.min(1,A.p/0.55)*Math.PI*0.5)*(A.p>0.8?Math.max(0,1-(A.p-0.8)/0.4):1);
  if(A.p>1.3){A.volando=false;A.anim='arquero';A.y=0;A.p=0;}
}
/* tu arquero: arrastrás para moverte, deslizás rápido para tirarte */
function pasarArqueroYo(A,dt){
  if(A.volando){pasarVolada(A,dt);return;}
  var E=Entrada;
  if(E.tocando){var tx=lim((E.x-ANCHO/2)/(ANCHO*0.42)*2.2,-2.3,2.3);var d=tx-A.x;A.x+=lim(d,-7*dt,7*dt);A.vx=d/Math.max(dt,0.001)*0.1;}
  else A.vx*=0.8;
  var s=E.suelta;
  if(s){var dx=s.vx*0.12, dy=s.vy*0.12, L=Math.hypot(dx,dy);
    if(Math.hypot(s.tx||0,s.ty||0)>Math.max(45,L)){dx=s.tx;dy=s.ty;L=Math.hypot(dx,dy);}
    if(L>38&&Math.hypot(s.dx,s.dy)>30){var k=(P.reflejos>0?1.2:1);empezarVolada(A,lim(dx/80,-1,1)*2.1*k,lim(-dy/90,0,1)*1.3*k);ayudaVolada(A);}
    else if(Math.hypot(s.dx,s.dy)<10&&P.fase!=='carrera'){empezarVolada(A,0,1.0);}
  }
}
/* una ayudita: si la estirada pasa cerca de la pelota, se corrige un poco hacia ella */
function ayudaVolada(A){
  if(!B.vuela)return;var vz=B.v.z;if(Math.abs(vz)<0.5)return;var t=(A.z-B.p.z)/vz;if(t<0||t>1.5)return;
  var px=B.p.x+B.v.x*t, py=B.p.y+B.v.y*t-0.5*G_*t*t, fx=A.x0+A.dx;
  if(Math.abs(px-fx)<0.9){A.dx+=(px-fx)*0.45;}
  if(py>0.6)A.dy=Math.max(A.dy,lim(py-0.8,0,1.3)*0.8);
}
/* ---------------- el resultado de cada tiro ---------------- */
function marcarRes(r){
  P.res=r;P.tRes=0;var yoPateo=P.turno===0, i=P.turno;
  if(r==='gol'){P.goles[i]++;P.pod[i]=Math.min(1,P.pod[i]+0.34);P.alArco[i]++;
    Sonido.fx('red');Sonido.fx('gol');Sonido.rugir(1);Sonido.voz('gol',1,true);vibrar(yoPateo?120:60);R3.sacude=yoPateo?0.8:0.4;R3.hinchada.salto=1;
    P.cartel={txt:yoPateo?calidadGol():'GOL DEL RIVAL',col:yoPateo?'255,210,58':'255,90,70',t:0,dur:2.2,grande:yoPateo};
    if(yoPateo){FXd.confeti();if(!P.practica)Prog.goles++;}
  } else if(r==='atajada'){var j=1-i;P.pod[j]=Math.min(1,P.pod[j]+0.34);P.atajadas[j]++;P.alArco[i]++;
    Sonido.fx('cabezazo');Sonido.voz('atajada',0.9);vibrar(yoPateo?30:90);R3.sacude=0.3;
    P.cartel={txt:yoPateo?'¡LA SACÓ!':'¡QUÉ ATAJADA!',col:yoPateo?'255,130,90':'120,230,255',t:0,dur:1.6,grande:!yoPateo};
    if(!yoPateo&&!P.practica)Prog.atajadas++;
  } else if(r==='palo'){P.cartel={txt:'¡PALO!',col:'255,255,255',t:0,dur:1.4};}
  else {P.cartel={txt:yoPateo?'AFUERA':'¡SE FUE AFUERA!',col:yoPateo?'200,200,220':'120,255,160',t:0,dur:1.3};if(!yoPateo)Sonido.fx('abucheo',0.5);}
  P.hist.push({quien:i,res:r});
}
function calidadGol(){
  var p=B.p, sp=B.v.length();
  if(B.super)return '¡SÚPER GOLAZO!';
  if(Math.abs(p.x)>1.45&&p.y>1.3)return '¡AL ÁNGULO!';
  if(Math.abs(P.tiroYo&&P.tiroYo.spin.y||0)>14)return '¡CON EFECTO!';
  if(sp>24)return '¡MISIL!';
  return '¡GOOOL!';
}
/* ---------------- un paso del partido ---------------- */
var _partes=[];
function pasarPartido(dtR){
  if(!P)return;
  /* la cámara lenta (al patear el rival, y con los reflejos) */
  if(P.lento>0)P.lento-=dtR;
  if(P.reflejos>0)P.reflejos-=dtR;
  var esc=P.reflejos>0?0.35:(P.lento>0?0.45:1);P.escLento+=(esc-P.escLento)*0.2;
  var dt=dtR*P.escLento;
  P.tf+=dtR;
  if(P.cartel){P.cartel.t+=dtR;if(P.cartel.t>P.cartel.dur)P.cartel=null;}
  var F=P.fase;
  if(F==='intro'){if(P.tf>2.2){P.fase='prep';P.tf=0;}}
  else if(F==='prep'){if(P.tf>0.7){P.fase=P.turno===0?'apunta':'carrera';P.tf=0;if(P.turno===1)planearTiroRival();}}
  else if(F==='apunta'){
    correrReloj(dtR);
    var E=Entrada;
    /* el trazo es el de la entrada (cada evento del dedo, con su hora): se dibuja y se lee de ahí */
    if(E.tocando&&E.traza)P.camino=E.traza;
    if(E.suelta&&(E.suelta.traza||P.camino.length)){var T=leerTiro(E.suelta.traza||P.camino);P.camino=[];if(T)patearYo(T);}
    if(P.tf>8&&P.fase==='apunta'){patearYo({tx:(Math.random()-0.5)*2,ty:0.4,pot:0.45,curva:0});}
  }
  else if(F==='pateando'){YO.p+=dt*1.8;
    if(!YO.glb){/* el muñeco: se arrima a la pelota mientras carga la pierna */
      var ax=B.p.x-YO.x, az=B.p.z-YO.z, ad=Math.hypot(ax,az);if(!B.vuela&&ad>0.42){YO.x+=ax/ad*1.4*dt;YO.z+=az/ad*1.4*dt;}}
    /* sale en el contacto del pie (el futbolista) o a mitad del gesto (el muñeco) */
    if((YO.glb?YO.contacto:YO.p>=0.52)&&!B.vuela){var T2=P.tiroYo;lanzar(T2.v,T2.spin,T2.sup);}}
  else if(F==='carrera'){
    correrReloj(dtR);
    /* el rival se acerca a la pelota y patea */
    var tir=EL, pp=tir.glb?puntoDePatada(tir,B.p.x,B.p.z,tir.giro):null;
    var ox=pp?pp.x:B.p.x, oz=pp?pp.z:B.p.z, dx=ox-tir.x, dz=oz-tir.z, d=Math.hypot(dx,dz), cerca=pp?0.06:0.8;
    if(d>cerca&&tir.anim!=='patear'){tir.anim='correr';tir.acelera=true;var pasoR=Math.min(d,(pp?Math.min(4.2,1.2+d*2.2):4.2)*dt);tir.x+=dx/d*pasoR;tir.z+=dz/d*pasoR;}
    else{if(tir.anim!=='patear'){tir.anim='patear';tir.p=0.3;tir.acelera=false;}tir.p+=dt*2.2;
      if((tir.glb?tir.contacto:tir.p>=0.52)&&!B.vuela){var T3=P.tiroEl;lanzar(T3.v,T3.spin,T3.sup);P.lento=0.3;}}
    pasarArqueroYo(YO,dt);
  }
  if(P.fase==='vuelo'){
    correrReloj(dtR);
    var A=P.arquero;
    if(A===EL)pasarArqueroRival(A,dt);else pasarArqueroYo(A,dt);
    if(P.turno===0&&YO.anim==='patear'){YO.p=Math.min(1,YO.p+dt*1.4);if(patadaTerminada(YO))YO.anim='espera';}
    if(P.turno===1&&EL.anim==='patear'){EL.p=Math.min(1,EL.p+dt*1.4);if(patadaTerminada(EL))EL.anim='quieto';}
    posar(A,0);partesArquero(A,_partes);
    var n=4;for(var k=0;k<n;k++)pasoPelota(dt/n,_partes);
    grabar(dtR);
    if(!P.res){P.quieto+=dt;if(B.v.length()<0.6&&B.p.y<0.2)P.quieto+=dt*3;if(P.quieto>3.2)marcarRes('afuera');}
    else{P.tRes+=dtR;
      if(P.tRes>1.1){
        if(P.res==='gol'){P.tirador.anim='festejar';}
        if(P.res==='gol'&&P.rec.length>30){P.fase='repe';P.tf=0;P.repe={i:0};}
        else{P.fase='resultado';P.tf=0;}
      }
      if(P.res==='gol'&&P.tRes>0.3){P.tirador.anim='festejar';if(P.arquero.anim!=='volada')P.arquero.anim='lamento';}
    }
  }
  else if(P.fase==='repe'){
    /* la repetición: cámara al costado del arco, a media velocidad */
    var R=P.repe;R.i+=dtR*60*0.5;var f=P.rec[Math.min(P.rec.length-1,Math.floor(R.i))];
    if(f)aplicarFoto(f);
    var zg=P.zArco, C=R3.camObj;C.pos.set(4.5,1.5,zg-sig(zg)*3.2);C.mira.set(0,0.9,zg);C.fov=48;
    if(R.i>=P.rec.length+30||Entrada.suelta){P.fase='resultado';P.tf=0.8;prepararCamaraResultado();}
  }
  else if(P.fase==='resultado'){
    if(P.tf>1.3){siguienteTurno();}
  }
  /* los muñecos y la pelota a la escena */
  [YO,EL].forEach(function(J){if(J!==P.arquero||P.fase!=='vuelo')posar(J,dt);else{J.t+=dt;}});
  if(P.fase==='apunta'||P.fase==='prep'||P.fase==='pateando'||P.fase==='intro'){if(P.arquero===EL)EL.anim='arquero';}
  pasarEstela(B.p,B.vuela&&!P.res||(B.vuela&&P.tRes<0.25),B.super?'fuego':Prog.estela,B.super?0.2:0.12);
}
function prepararCamaraResultado(){var C=R3.camObj;if(P.turno===0){C.pos.set(B.p.x*0.2,4.3,4);C.mira.set(0,0.7,Z_RIVAL);C.fov=58;}}
function correrReloj(dt){
  if(P.muerte)return;
  P.reloj=Math.max(0,P.reloj-dt);
  if(!P.dijo10&&P.reloj<=10){P.dijo10=true;Sonido.voz('ultimos',1,true);}
}
function siguienteTurno(){
  P.tirosRonda++;
  var fin=false;
  if(P.muerte){if(P.tirosRonda>=2){P.tirosRonda=0;if(P.goles[0]!==P.goles[1])fin=true;}}
  else if(P.reloj<=0){
    if(P.goles[0]!==P.goles[1])fin=true;
    else{P.muerte=true;P.tirosRonda=0;P.cartel={txt:'MUERTE SÚBITA',col:'255,210,58',t:0,dur:2,grande:true};Sonido.voz('oro',1,true);Sonido.fx('silbato');}
  }
  if(fin){terminarPartido();return;}
  P.turno=1-P.turno;prepararTiro();P.fase='prep';P.tf=0;
}
function terminarPartido(){
  P.fase='fin';P.tf=0;Sonido.fx('silbatofin');
  var gane=P.goles[0]>P.goles[1];
  YO.anim=gane?'festejar':'lamento';EL.anim=gane?'lamento':'festejar';
  Sonido.voz(gane?'victoria':'derrota',1,true);if(gane){Sonido.fx('festejo');FXd.confeti();}else Sonido.fx('abucheo');
  irA('fin');
}
/* ---------------- la grabación para la repetición ---------------- */
function foto(J){return [J.x,J.y||0,J.z,J.giro,J.anim,J.p,J.dx||0,J.dy||0,J.t,J.te||0,J.var||0];}
/* la repetición se graba a 60 cuadros por segundo de juego, sea cual sea el paso (la pantalla puede ir a 120 Hz) */
function grabar(dt){P.tGrab=(P.tGrab||0)+(dt||CUADRO);if(P.tGrab<CUADRO*0.999&&P.rec.length)return;P.tGrab=Math.max(0,P.tGrab-CUADRO);
  P.rec.push({b:[B.p.x,B.p.y,B.p.z],yo:foto(YO),el:foto(EL)});if(P.rec.length>240)P.rec.shift();}
function aplicarFoto(f){
  B.p.set(f.b[0],f.b[1],f.b[2]);
  [[YO,f.yo],[EL,f.el]].forEach(function(q){var J=q[0],s=q[1];J.x=s[0];J.y=s[1];J.z=s[2];J.giro=s[3];J.anim=s[4];J.p=s[5];J.dx=s[6];J.dy=s[7];J.t=s[8];J.te=s[9];J.var=s[10];J.repe=true;});
}
/* ---------------- los poderes ---------------- */
function usarPoder(){
  if(P.pod[0]<1)return;
  if(P.fase==='apunta'){P.superArmado=true;Sonido.fx('super');vibrar(40);P.cartel={txt:'¡SÚPER TIRO LISTO!',col:'255,140,40',t:0,dur:1.2};}
  else if(P.turno===1&&(P.fase==='carrera'||P.fase==='vuelo')){P.pod[0]=0;P.reflejos=1.8;P.alcance=1.25;Sonido.fx('hielo');Sonido.voz('poder',0.7);P.cartel={txt:'¡REFLEJOS!',col:'120,230,255',t:0,dur:1.2};}
}
/* ---------------- los efectos 3D: confeti ---------------- */
var FXd={conf:null,
  confeti:function(){
    if(!this.conf){var geo=new THREE.PlaneGeometry(0.12,0.07);var m=new THREE.InstancedMesh(geo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),220);
      m.frustumCulled=false;R3.escena.add(m);this.conf={m:m,p:[]};var c=new THREE.Color(), cs=['#ffd23a','#ff4fa0','#2adfff','#ffffff','#4fc21a','#ff8a1a'];
      for(var i=0;i<220;i++)m.setColorAt(i,c.set(cs[i%6]));}
    var C=this.conf;C.p.length=0;var z=P?P.zArco:Z_RIVAL;
    for(var k=0;k<220;k++)C.p.push({x:(Math.random()-0.5)*10,y:6+Math.random()*5,z:z*0.6+(Math.random()-0.5)*8,vx:(Math.random()-0.5)*2,vy:-1-Math.random()*1.5,r:Math.random()*6,vr:(Math.random()-0.5)*10,t:0});
  },
  pasar:function(dt){
    var C=this.conf;if(!C||!C.p.length)return;var M=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), s=new THREE.Vector3(1,1,1), v=new THREE.Vector3();
    var vivos=0;
    for(var i=0;i<C.p.length;i++){var p=C.p[i];p.t+=dt;p.x+=p.vx*dt+Math.sin(p.t*3+i)*0.02;p.y+=p.vy*dt;p.r+=p.vr*dt;
      if(p.y>0.02)vivos++;else p.y=0.02;
      e.set(p.r,p.r*0.7,0);q.setFromEuler(e);M.compose(v.set(p.x,p.y,p.z),q,s);C.m.setMatrixAt(i,M);}
    C.m.instanceMatrix.needsUpdate=true;if(!vivos&&C.p[0].t>6){C.p.length=0;for(var j=0;j<220;j++){M.makeScale(0,0,0);C.m.setMatrixAt(j,M);}C.m.instanceMatrix.needsUpdate=true;}
  }
};
