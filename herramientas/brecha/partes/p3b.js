
/* ====================== pose 3D de un soldado ====================== */
const _loc = {}; for(const k of J3) _loc[k] = V3(0,0,0);
const _codo = V3(0,0,0), _obj = V3(0,0,0), _polo = V3(0,0,0);
function poseSoldado(e, t){
  const L = _loc, ag = e.agache||0, ap = e.apunta||0, f = e.fase||0, mueve = e.moviendo ? 1 : 0, gran = e.def && e.def.jefe ? 1 : 0;
  const alt = 0.95 - ag*0.42, respira = Math.sin(t*2 + e.id)*0.01;
  L.pel.set(0, alt + Math.abs(Math.sin(f))*0.04*mueve, -ag*0.12);
  const incl = 0.12*mueve + ag*0.25 + (e.fl ? e.fl.t*0.5 : 0)*(e.fl ? e.fl.dz : 0);
  L.pec.set((e.fl ? e.fl.dx*e.fl.t*0.3 : 0), L.pel.y + 0.4 + respira, L.pel.z + incl*0.4 + 0.02);
  L.cue.set(L.pec.x, L.pec.y + 0.17, L.pec.z + incl*0.2);
  const pitch = (e.pitch||0)*ap;
  L.cab.set(L.cue.x + (e.fl && e.fl.cab ? e.fl.dx*e.fl.t*0.25 : 0), L.cue.y + 0.16, L.cue.z + 0.03 + Math.sin(pitch)*0.05 - (e.fl && e.fl.cab ? e.fl.t*0.12 : 0));
  /* mirando a +z, la derecha del cuerpo está en x−: la «D» va en x− (antes estaba espejado y un modelo de verdad cruzaba los brazos) */
  for(const s of [-1,1]){ const k = s<0 ? 'D' : 'I'; L['ho'+k].set(L.pec.x + s*0.21, L.pec.y + 0.1, L.pec.z); L['ca'+k].set(s*0.11, L.pel.y - 0.04, L.pel.z); }
  /* piernas: caminar, agacharse (rodilla al piso atrás) */
  for(const s of [-1,1]){ const k = s<0 ? 'D' : 'I', ph = f + (s<0 ? 0 : Math.PI);
    const px = s*0.14, pz = mueve ? Math.sin(ph)*0.32 : (s<0 ? 0.12 : -0.1)*(1 + ag), py = mueve ? Math.max(0, Math.cos(ph))*0.14 : 0;
    _obj.set(px, py + 0.05, pz - (ag && s>0 ? 0.3*ag : 0)); _polo.set(0, 0, 1);
    const pie = ik3(L['ca'+k], _obj, 0.46, 0.46, _polo, _codo); L['ro'+k].copy(_codo); L['pi'+k].copy(pie); }
  /* brazos: con el arma lista, subida al hombro al apuntar; el que tiene rehén lo agarra del cuello */
  const yA = lerp(L.pec.y - 0.28, L.pec.y + 0.02, ap) + Math.sin(pitch)*0.25, zA = lerp(0.2, 0.3, ap) - (e.retro||0);
  const manoD = V3(-0.12, yA, L.pec.z + zA), manoI = V3(0.02, yA + 0.03 + Math.sin(pitch)*0.2, L.pec.z + zA + 0.28 + Math.cos(pitch)*0.02);
  if(e.def && e.def.captor){ manoI.set(-0.05, L.pec.y + 0.05, L.pec.z + 0.35); manoD.set(-0.2, L.pec.y + 0.1, L.pec.z + 0.3); }
  if(e.def && e.def.escudo){ manoI.set(0.12, L.pec.y - 0.05, L.pec.z + 0.35); }
  if(e.levanta){ manoI.set(0.16, L.cab.y + 0.1, L.cab.z - 0.02); manoD.set(-0.16, L.cab.y + 0.1, L.cab.z - 0.02); }   /* civiles: manos en la nuca */
  if(e.rehenDe){ manoI.set(0.18, L.pel.y - 0.05, L.pel.z - 0.15); manoD.set(-0.18, L.pel.y - 0.05, L.pel.z - 0.15); }
  for(const [k, m] of [['I', manoI], ['D', manoD]]){ _polo.set(k==='I' ? 1 : -1, -1.2, -0.3); const mano = ik3(L['ho'+k], m, 0.3*(1 + gran*0.1), 0.3*(1 + gran*0.1), _polo, _codo); L['co'+k].copy(_codo); L['ma'+k].copy(mano); }
  return L;
}
/* del espacio del soldado al mundo (girado por su rumbo; si va arriba de un vehículo, por el vehículo) */
const _m4 = new THREE.Matrix4();
function aMundo3(e, L){
  if(!e.pts){ e.pts = {}; for(const k of J3) e.pts[k] = V3(0,0,0); }
  const s = e.esc||1, cy = Math.cos(e.rumbo), sy = Math.sin(e.rumbo);
  for(const k of J3){ const p = L[k], x = p.x*s, z = p.z*s; e.pts[k].set(e.pos.x + x*cy + z*sy, e.pos.y + p.y*s, e.pos.z - x*sy + z*cy); }
  if(e.padre){ e.padre.updateMatrixWorld(); for(const k of J3) e.pts[k].applyMatrix4(e.padre.matrixWorld); }
}
/* las piezas siguen a los puntos */
const _fw = V3(0,0,0), _rt = V3(0,0,0), _up = V3(0,0,0), _m3 = new THREE.Matrix4();
function vestir(e){
  if(e.cuerpo.glb){ vestirGLB(e); return; }
  const P = e.pts, pz = e.cuerpo.piezas, s = e.esc||1;
  for(const [a,b,w,d] of HUESO3){ const m = pz[a+b]; if(m) entre(m, P[a], P[b], w*s, (a==='pel'||a==='pec' ? 0.12 : w)*s); }
  /* cabeza orientada con el torso */
  _up.subVectors(P.cab, P.cue).normalize(); _rt.subVectors(P.hoI, P.hoD).normalize(); _fw.crossVectors(_rt, _up).normalize();   /* _rt = hacia la izquierda del cuerpo (x+ local): la base sigue siendo una rotación */
  _m3.makeBasis(_rt, _up, _fw);
  const cab = pz.cab; cab.position.copy(P.cab); cab.quaternion.setFromRotationMatrix(_m3); cab.scale.set(0.25*s, 0.28*s, 0.26*s);
  if(pz.visor){ pz.visor.position.copy(P.cab).addScaledVector(_fw, 0.12*s).addScaledVector(_up, 0.02*s); pz.visor.quaternion.copy(cab.quaternion); pz.visor.scale.set(0.2*s, 0.07*s, 0.04*s); pz.visor.visible = !e.cascoRoto || true; }
  if(pz.casco){ pz.casco.visible = !!(e.placas && e.placas.casco > 0); pz.casco.position.copy(P.cab).addScaledVector(_up, 0.08*s); pz.casco.quaternion.copy(cab.quaternion); pz.casco.scale.set(0.3*s, 0.18*s, 0.31*s); }
  if(pz.pelo){ pz.pelo.position.copy(P.cab).addScaledVector(_up, 0.11*s).addScaledVector(_fw, -0.02*s); pz.pelo.quaternion.copy(cab.quaternion); pz.pelo.scale.set(0.27*s, 0.08*s, 0.28*s); }
  for(const k of ['I','D']){ const b = pz['bota'+k]; b.position.copy(P['pi'+k]).addScaledVector(_fw, 0.06*s); b.position.y = Math.max(b.position.y, P['pi'+k].y - 0.02); b.quaternion.copy(cab.quaternion); b.scale.set(0.13*s, 0.1*s, 0.28*s); }
  /* chaleco sobre el pecho */
  _up.subVectors(P.cue, P.pel).normalize(); _fw.crossVectors(_rt, _up).normalize(); _m3.makeBasis(_rt, _up, _fw);
  if(pz.chaleco){ const pl = e.placas; pz.chaleco.visible = !pl || pl.pecho === undefined || pl.pecho > 0 || !e.def.placas;
    pz.chaleco.position.copy(P.pec).addScaledVector(_up, -0.08*s).addScaledVector(_fw, 0.02*s); pz.chaleco.quaternion.setFromRotationMatrix(_m3); pz.chaleco.scale.set(0.44*s, 0.44*s, 0.3*s); }
  if(pz.tanque){ pz.tanque.position.copy(P.pec).addScaledVector(_fw, -0.26*s); pz.tanque.quaternion.setFromRotationMatrix(_m3); pz.tanque.scale.set(0.34*s, 0.5*s, 0.18*s); pz.tanque.visible = !e.tanqueRoto; }
  if(e.def && e.def.jefe){ const pl = e.placas;
    const chapa = (k, a, b, w)=>{ const m = pz['pl_'+k]; m.visible = pl[k] > 0; if(m.visible) entre(m, P[a], P[b], w*s, w*0.9*s); };
    chapa('pecho','pel','cue',0.26); chapa('brazoI','hoI','coI',0.1); chapa('brazoD','hoD','coD',0.1); chapa('piernaI','caI','roI',0.12); chapa('piernaD','caD','roD',0.12); }
  /* arma: de la mano derecha hacia la izquierda y más allá */
  if(pz.arma){ const vivo = e.estado !== 'muerto';
    pz.arma.visible = pz.arma2.visible = vivo || e.armaCae;
    if(vivo){ _fw.subVectors(P.maI, P.maD).normalize(); const largo = e.def.jefe ? 1.0 : (e.def.escudo ? 0.3 : 0.8);
      entre(pz.arma, P.maD.clone().addScaledVector(_fw, -0.12), P.maD.clone().addScaledVector(_fw, largo), 0.035*s, 0.05*s);
      pz.arma.quaternion.multiply(_q.setFromAxisAngle(ARRIBA, 0)); entre(pz.arma2, P.maD, P.maD.clone().addScaledVector(_fw, 0.1).add(V3(0,-0.12*s,0)), 0.03*s, 0.03*s);
      e.boca = (e.boca || V3(0,0,0)).copy(P.maD).addScaledVector(_fw, largo); }
  }
  if(pz.tubo){ pz.tubo.visible = e.estado !== 'muerto'; if(pz.tubo.visible) entre(pz.tubo, P.hoD.clone().addScaledVector(_fw, -0.4), P.hoD.clone().addScaledVector(_fw, 0.7), 0.08, 0.08); }
  if(pz.escudo){ _fw.set(Math.sin(e.rumbo), 0, Math.cos(e.rumbo)); _rt.set(Math.cos(e.rumbo), 0, -Math.sin(e.rumbo));
    /* el escudo tapa del cinto al mentón; al tirar se corre a un costado y deja ver el cuerpo */
    const c = P.pel.clone().lerp(P.pec, 0.2).addScaledVector(_fw, 0.42*s).addScaledVector(_rt, e.estado==='disparar' ? 0.32 : 0); c.y = Math.max(0.6, c.y);
    pz.escudo.position.copy(c); pz.escudo.rotation.set(0, e.rumbo, 0); pz.escudo.scale.set(0.66, 1.0, 0.05); pz.escudo.visible = e.estado !== 'muerto' || e.escudoCae;
    pz.visera.position.copy(c).add(V3(0, 0.34, 0)).addScaledVector(_fw, 0.03); pz.visera.rotation.set(0, e.rumbo, 0); pz.visera.scale.set(0.3, 0.14, 0.06); pz.visera.visible = pz.escudo.visible;
    e.escudoCaja = {c, rumbo:e.rumbo, w:0.33, h:0.5, d:0.05}; }
}

/* ====================== muñeco de trapo 3D (verlet) ====================== */
const RESTR = HUESO3.map(h=> [h[0], h[1]]).concat([['pel','caI'],['pel','caD'],['caI','caD'],['pec','hoI'],['pec','hoD'],['hoI','hoD'],['cue','cab'],['pec','cab'],['pel','hoI'],['pel','hoD'],['pec','caI'],['pec','caD'],['cue','hoI'],['cue','hoD']]);
function hacerTrapo(e, imp, punto){
  const tr = {p:{}, v:{}, l:[], quieto:0, cajas:[]};
  for(const k of J3){ const p = e.pts[k].clone(); tr.p[k] = p; const vp = e.velMundo ? e.velMundo.clone().multiplyScalar(DT) : V3(0,0,0); tr.v[k] = p.clone().sub(vp); }
  for(const [a,b] of RESTR) tr.l.push([a, b, e.pts[a].distanceTo(e.pts[b])]);
  /* el golpe empuja más a los puntos cercanos al impacto */
  for(const k of J3){ const d = punto ? e.pts[k].distanceTo(punto) : 0.5, w = 1/(1 + d*4); tr.v[k].addScaledVector(imp, -DT*w*1.4); }
  const c = e.pts.pel; for(const b of MUNDO.cajas) if(b.x1 > c.x - 3 && b.x0 < c.x + 3 && b.z1 > c.z - 3 && b.z0 < c.z + 3 && b.y1 > -0.5) tr.cajas.push(b);
  e.trapo = tr;
}
const RADIO_TRAPO = {pel:0.13, pec:0.14, cue:0.1, cab:0.1, hoI:0.09, hoD:0.09, caI:0.1, caD:0.1};
function pasarTrapo(e){
  const tr = e.trapo; if(tr.quieto > 90) return; let mov = 0; const g = 9.8*DT*DT*(J.lento > 0 ? 0.3 : 1);
  for(const k of J3){ const p = tr.p[k], v = tr.v[k], vx = (p.x - v.x)*0.985, vy = (p.y - v.y)*0.985, vz = (p.z - v.z)*0.985; v.copy(p); p.x += vx; p.y += vy - g; p.z += vz; mov += Math.abs(vx) + Math.abs(vy) + Math.abs(vz);
    const piso = e.piso !== undefined ? e.piso : 0;
    const r = RADIO_TRAPO[k] || 0.06;   /* el tronco y la cabeza tienen más espesor que un brazo: si no, el modelo queda medio enterrado */
    if(p.y < piso + r){ p.y = piso + r; v.x = p.x - vx*0.5; v.z = p.z - vz*0.5; }
    for(const b of tr.cajas){ if(p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1 && p.z > b.z0 && p.z < b.z1){
      const dx0 = p.x - b.x0, dx1 = b.x1 - p.x, dy1 = b.y1 - p.y, dz0 = p.z - b.z0, dz1 = b.z1 - p.z, m = Math.min(dx0, dx1, dy1, dz0, dz1);
      if(m===dy1){ p.y = b.y1 + 0.01; v.y = p.y; } else if(m===dx0) p.x = b.x0 - 0.01; else if(m===dx1) p.x = b.x1 + 0.01; else if(m===dz0) p.z = b.z0 - 0.01; else p.z = b.z1 + 0.01; } } }
  for(let it=0; it<4; it++) for(const [a,b,l] of tr.l){ const pa = tr.p[a], pb = tr.p[b]; _a.subVectors(pb, pa); const d = _a.length() || 1e-4, k = (d - l)/d*0.5; pa.addScaledVector(_a, k); pb.addScaledVector(_a, -k); }
  if(mov < 0.004) tr.quieto++; else tr.quieto = 0;
  for(const k of J3) e.pts[k].copy(tr.p[k]);
}

/* ====================== impactos: rayo contra cápsulas, cajas y escudos ====================== */
function rayoCaja(o, d, b, tmax){
  let t0 = 0, t1 = tmax, nrm = 0;
  for(const [ax, mn, mx] of [['x', b.x0, b.x1], ['y', b.y0, b.y1], ['z', b.z0, b.z1]]){ const od = o[ax], dd = d[ax];
    if(Math.abs(dd) < 1e-9){ if(od < mn || od > mx) return null; continue; }
    let ta = (mn - od)/dd, tb = (mx - od)/dd, n = ax; if(ta > tb){ const s = ta; ta = tb; tb = s; }
    if(ta > t0){ t0 = ta; nrm = n + (dd > 0 ? '-' : '+'); } if(tb < t1) t1 = tb; if(t0 > t1) return null; }
  return t0 > 0.001 ? {t:t0, n:nrm} : null;
}
function rayoMundo(o, d, tmax){ let mejor = null; for(const b of MUNDO.cajas){ const h = rayoCaja(o, d, b, mejor ? mejor.t : tmax); if(h && (!mejor || h.t < mejor.t)){ mejor = h; mejor.caja = b; } } return mejor; }
function rayoCapsula(o, d, a, b, r){
  /* punto más cercano entre el rayo y el segmento */
  _a.subVectors(b, a); _b.subVectors(a, o);
  const aa = _a.dot(_a), ad = _a.dot(d), ab = _a.dot(_b), db = d.dot(_b), den = aa - ad*ad;
  let s = den > 1e-9 ? lim((ad*db - ab)/den, 0, 1) : 0; let t = s*ad + db; if(t < 0){ t = 0; s = lim(-ab/aa, 0, 1); }
  _c.copy(a).addScaledVector(_a, s); const px = o.x + d.x*t - _c.x, py = o.y + d.y*t - _c.y, pz = o.z + d.z*t - _c.z, dist2 = px*px + py*py + pz*pz;
  if(dist2 > r*r) return null; return t - Math.sqrt(r*r - dist2);
}
const PARTES = [['cab','cab',0.15,'cabeza'],['pel','pec',0.2,'torso'],['pec','cue',0.19,'torso'],['hoI','coI',0.08,'brazoI'],['coI','maI',0.075,'brazoI'],['hoD','coD',0.08,'brazoD'],['coD','maD',0.075,'brazoD'],
  ['caI','roI',0.1,'piernaI'],['roI','piI',0.09,'piernaI'],['caD','roD',0.1,'piernaD'],['roD','piD',0.09,'piernaD']];
function rayoCuerpo(o, d, e, tmax){
  let mejor = null; const s = e.esc||1;
  for(const [a, b, r, parte] of PARTES){ const t = rayoCapsula(o, d, e.pts[a], e.pts[b], r*s); if(t !== null && t > 0 && t < tmax && (!mejor || t < mejor.t)) mejor = {t, parte}; }
  return mejor;
}
function rayoEscudo(o, d, E, tmax){
  const c = Math.cos(-E.rumbo), s = Math.sin(-E.rumbo);
  const lo = V3(o.x - E.c.x, o.y - E.c.y, o.z - E.c.z), lx = lo.x*c + lo.z*s, lz = -lo.x*s + lo.z*c, dx = d.x*c + d.z*s, dz = -d.x*s + d.z*c;
  const h = rayoCaja(V3(lx, lo.y, lz), V3(dx, d.y, dz), {x0:-E.w, x1:E.w, y0:-E.h, y1:E.h, z0:-E.d, z1:E.d}, tmax); return h ? h.t : null;
}

/* ====================== efectos ====================== */
const FX = {};
function iniFX(){
  /* trazadoras: segmentos que se achican */
  const N = 80; FX.traz = []; const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N*6), 3)); tg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N*6), 3));
  FX.trazL = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({vertexColors:true, transparent:true, opacity:0.9, fog:false})); FX.trazL.frustumCulled = false; escena.add(FX.trazL);
  for(let i=0;i<N;i++) FX.traz.push({t:0});
  /* láseres de los que apuntan */
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(24*6), 3));
  FX.laser = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({color:colL('#ff2a1a'), transparent:true, opacity:0.75, fog:false})); FX.laser.frustumCulled = false; escena.add(FX.laser);
  /* partículas: chispas, sangre, polvo, humo */
  const P = 500; const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(P*3), 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(P*3), 3));
  /* dos nubes: humo, polvo y sangre con alfa; chispas sumadas y por encima de 1 (el bloom las hace brillar) */
  const tp = texPunto();
  FX.puntos = new THREE.Points(pg, new THREE.PointsMaterial({size:0.09, vertexColors:true, sizeAttenuation:true, map:tp, transparent:true, depthWrite:false})); FX.puntos.frustumCulled = false; escena.add(FX.puntos); FX.parts = [];
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(P*3), 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(P*3), 3));
  FX.chisp = new THREE.Points(cg, new THREE.PointsMaterial({size:0.05, vertexColors:true, sizeAttenuation:true, map:tp, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false})); FX.chisp.frustumCulled = false; escena.add(FX.chisp);
  /* casquillos del arma propia: se ven en la escena del arma, saltan a la derecha y giran */
  FX.casq = []; const cgeo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.022, 8), cmat = mat('#c8a050', {roughness:0.3, metalness:1});
  for(let i=0;i<14;i++){ const m = new THREE.Mesh(cgeo, cmat); m.visible = false; vmEscena.add(m); FX.casq.push({m, t:0, v:V3(0,0,0), w:V3(0,0,0)}); }
  /* agujeros y manchas: una malla instanciada cada uno */
  FX.aguj = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.1), matMarca(texAgujero(), 0.6), 90); FX.aguj.frustumCulled = false; FX.nAg = 0;
  FX.sang = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), matMarca(texSangre(), 0.25, 3), 70); FX.sang.frustumCulled = false; FX.nSa = 0;
  const cero = new THREE.Matrix4().makeScale(0,0,0); for(let i=0;i<90;i++) FX.aguj.setMatrixAt(i, cero); for(let i=0;i<70;i++) FX.sang.setMatrixAt(i, cero);
  escena.add(FX.aguj); escena.add(FX.sang);
  /* fogonazos de los enemigos */
  FX.flash = []; for(let i=0;i<10;i++){ const m = flashMalla(0.8); m.scale.setScalar(2.2); escena.add(m); FX.flash.push({m, t:0}); }
}
/* marcas dibujadas: agujero con borde astillado y salpicadura con gotas (con alfa: un cuadrado liso se lee a papel) */
function texAgujero(){ const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32,32,2,32,32,30); gr.addColorStop(0,'rgba(8,8,8,1)'); gr.addColorStop(0.22,'rgba(20,18,16,0.95)'); gr.addColorStop(0.45,'rgba(60,56,50,0.55)'); gr.addColorStop(1,'rgba(90,86,80,0)');
  g.fillStyle = gr; g.fillRect(0,0,64,64); g.strokeStyle = 'rgba(30,28,26,0.6)'; g.lineWidth = 1;
  for(let k=0;k<7;k++){ const a = Math.random()*Math.PI*2; g.beginPath(); g.moveTo(32,32); let x = 32, y = 32; for(let s=0;s<4;s++){ x += Math.cos(a + (Math.random()-0.5))*5; y += Math.sin(a + (Math.random()-0.5))*5; g.lineTo(x, y); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
function texSangre(){ const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gota = (x, y, r, a)=>{ const gr = g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,'rgba(90,6,4,'+a+')'); gr.addColorStop(0.7,'rgba(70,4,2,'+a*0.9+')'); gr.addColorStop(1,'rgba(60,2,2,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill(); };
  gota(64,64,34,0.95); for(let k=0;k<26;k++){ const a = Math.random()*Math.PI*2, d = 20 + Math.random()*40; gota(64 + Math.cos(a)*d, 64 + Math.sin(a)*d, 2 + Math.random()*9, 0.9); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
function matMarca(tx, rug, pof){ return parcheNiebla(new THREE.MeshStandardMaterial({map:tx, transparent:true, depthWrite:false, roughness:rug, metalness:0, side:THREE.DoubleSide, polygonOffset:true, polygonOffsetFactor:-(pof||2), polygonOffsetUnits:-2})); }
function texPunto(){ const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16,16,0,16,16,16);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.45,'rgba(255,255,255,0.6)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0,0,32,32); return new THREE.CanvasTexture(c); }
function casquillo(){ const q = FX.casq.find(c=> c.t <= 0) || FX.casq[0]; q.t = 0.55; q.m.visible = true;
  q.m.position.copy(VM.g.position).add(V3(0.025, 0.04, -0.09).multiplyScalar(VM.g.scale.x));   /* la ventana de expulsión, a la derecha del cerrojo */ q.v.set(vr(0.5, 0.9), vr(0.5, 1.0), vr(-0.1, 0.25)); q.w.set(vr(-20,20), vr(-20,20), vr(-20,20)); }
function limpiarFX(){ for(const t of FX.traz) t.t = 0; FX.parts.length = 0; const cero = new THREE.Matrix4().makeScale(0,0,0);
  for(let i=0;i<90;i++) FX.aguj.setMatrixAt(i, cero); for(let i=0;i<70;i++) FX.sang.setMatrixAt(i, cero); FX.aguj.instanceMatrix.needsUpdate = FX.sang.instanceMatrix.needsUpdate = true; FX.nAg = FX.nSa = 0; }
function trazo(a, b, col, vida){ const t = FX.traz.find(q=> q.t <= 0) || FX.traz[0]; t.a = a.clone(); t.b = b.clone(); t.t = vida||0.07; t.vida = t.t; t.col = colL(col||'#ffe0a0'); }
function particula(p, v, col, vida, g, brilla){ if(FX.parts.length >= 500) FX.parts.shift(); const c = colL(col); if(brilla) c.multiplyScalar(brilla); FX.parts.push({p:p.clone(), v:v.clone(), c, t:vida, g:g===undefined ? 1 : g, add:!!brilla}); }
function chispas(p, n, col){ for(let i=0;i<n;i++) particula(p, V3(vr(-2,2), vr(0,3), vr(-2,2)), col||'#ffd27a', vr(0.1,0.3), 0.6, 5); for(let i=0;i<3;i++) particula(p, V3(vr(-0.4,0.4), vr(0.1,0.6), vr(-0.4,0.4)), '#a8a8a8', vr(0.3,0.7), -0.05); }
function sangre(p, d, n){ for(let i=0;i<n;i++) particula(p, V3(d.x*vr(1,3) + vr(-1,1), vr(-0.5,2), d.z*vr(1,3) + vr(-1,1)), i%2 ? '#8a0e0a' : '#b8201a', vr(0.3,0.7), 1); }
const _mm = new THREE.Matrix4(), _pp = V3(0,0,0), _ss = V3(1,1,1), _qq = new THREE.Quaternion(), _nn = V3(0,0,0), _zz = V3(0,0,1);
function marca(malla, idx, p, normal, tam, giro){ _nn.copy(normal); _qq.setFromUnitVectors(_zz, _nn); if(giro) _qq.multiply(new THREE.Quaternion().setFromAxisAngle(_zz, giro));
  _pp.copy(p).addScaledVector(_nn, 0.005); _ss.set(tam, tam, tam); _mm.compose(_pp, _qq, _ss); malla.setMatrixAt(idx, _mm); malla.instanceMatrix.needsUpdate = true; }
const NORMAL = {'x-':V3(-1,0,0),'x+':V3(1,0,0),'y-':V3(0,-1,0),'y+':V3(0,1,0),'z-':V3(0,0,-1),'z+':V3(0,0,1)};
function agujero(p, n){ marca(FX.aguj, FX.nAg++ % 90, p, NORMAL[n]||NORMAL['y+'], vr(0.8,1.3), vr(0,3)); }
function mancha(p, n, tam){ marca(FX.sang, FX.nSa++ % 70, p, NORMAL[n]||NORMAL['y+'], tam, vr(0,3)); }
function fogonazoEnemigo(p){ const f = FX.flash.find(q=> q.t <= 0) || FX.flash[0]; f.m.position.copy(p); f.m.visible = true; f.t = 0.05; f.m.quaternion.copy(cam.quaternion); f.m.rotateZ(vr(0,3)); f.m.scale.setScalar(vr(1.8, 2.6)); }
function pasarFX(dt){
  const tp = FX.trazL.geometry.attributes.position.array, tc = FX.trazL.geometry.attributes.color.array; let i = 0;
  for(const t of FX.traz){ if(t.t > 0){ t.t -= dt; const k = 1 - Math.max(0, t.t)/t.vida;
      const a = t.a.clone().lerp(t.b, k*0.8), b = t.b; tp.set([a.x,a.y,a.z,b.x,b.y,b.z], i*6); tc.set([t.col.r,t.col.g,t.col.b,t.col.r,t.col.g,t.col.b], i*6); }
    else tp.fill(0, i*6, i*6+6); i++; }
  FX.trazL.geometry.attributes.position.needsUpdate = FX.trazL.geometry.attributes.color.needsUpdate = true;
  const pp = FX.puntos.geometry.attributes.position.array, pc = FX.puntos.geometry.attributes.color.array; let n = 0;
  for(let k=FX.parts.length-1;k>=0;k--){ const q = FX.parts[k]; q.t -= dt; if(q.t <= 0){ FX.parts.splice(k,1); continue; } q.v.y -= 9.8*q.g*dt; q.p.addScaledVector(q.v, dt); if(q.p.y < 0.02 && q.g > 0){ q.p.y = 0.02; q.v.multiplyScalar(0.3); } }
  const cp2 = FX.chisp.geometry.attributes.position.array, cc2 = FX.chisp.geometry.attributes.color.array; let m2 = 0;
  for(const q of FX.parts){ if(q.add){ const f = Math.min(1, q.t*6); cp2[m2*3] = q.p.x; cp2[m2*3+1] = q.p.y; cp2[m2*3+2] = q.p.z; cc2[m2*3] = q.c.r*f; cc2[m2*3+1] = q.c.g*f; cc2[m2*3+2] = q.c.b*f; m2++; continue; }
    pp[n*3] = q.p.x; pp[n*3+1] = q.p.y; pp[n*3+2] = q.p.z; pc[n*3] = q.c.r; pc[n*3+1] = q.c.g; pc[n*3+2] = q.c.b; n++; }
  for(let k=n; k<500; k++){ pp[k*3] = 0; pp[k*3+1] = -999; pp[k*3+2] = 0; }
  for(let k=m2; k<500; k++){ cp2[k*3] = 0; cp2[k*3+1] = -999; cp2[k*3+2] = 0; }
  FX.chisp.geometry.attributes.position.needsUpdate = FX.chisp.geometry.attributes.color.needsUpdate = true;
  for(const q of FX.casq) if(q.t > 0){ q.t -= dt; q.v.y -= 6*dt; q.m.position.addScaledVector(q.v, dt); q.m.rotation.x += q.w.x*dt; q.m.rotation.z += q.w.z*dt; if(q.t <= 0) q.m.visible = false; }
  FX.puntos.geometry.attributes.position.needsUpdate = FX.puntos.geometry.attributes.color.needsUpdate = true; FX.puntos.geometry.setDrawRange(0, 500);
  for(const f of FX.flash) if(f.t > 0){ f.t -= dt; if(f.t <= 0) f.m.visible = false; }
}
function dibujarLaseres(lista){
  const a = FX.laser.geometry.attributes.position.array; a.fill(0); let i = 0;
  for(const [p, q] of lista){ if(i >= 24) break; a.set([p.x,p.y,p.z,q.x,q.y,q.z], i*6); i++; }
  FX.laser.geometry.attributes.position.needsUpdate = true; FX.laser.material.opacity = 0.45 + 0.35*Math.sin(J.t*0.6);
}

/* ====================== vehículos y helicóptero (convoy) ====================== */
/* vehículos generados: frente hacia −z (hacia donde viaja el convoy); las cajas viejas tenían la cabina atrás */
const MAT_VEH = {};
function matVeh(id, col){ const k = id + (col||''); if(MAT_VEH[k]) return MAT_VEH[k]; const m = MODELOS[id].mat.clone(); if(col){ m.color = colL(col); } parcheNiebla(m); return MAT_VEH[k] = m; }
function vehGLB(id, col, largo){
  if(!hayModelo(id)) return null; const M = MODELOS[id], b = M.caja, g = new THREE.Group(), m = new THREE.Mesh(M.geo, matVeh(id, col));
  const k = largo ? largo/(b.max.z - b.min.z) : 1; m.scale.setScalar(k); m.castShadow = true; m.receiveShadow = true; g.add(m);
  g.userData = {glb:true, cab:m, alto:(b.max.y - b.min.y)*k, largo:(b.max.z - b.min.z)*k, ancho:(b.max.x - b.min.x)*k}; return g;
}
function camioneta(col, jugador){
  /* camioneta generada: el color de diseño tiñe la foto (la propia va blanca, sin teñir) */
  const gg = vehGLB('veh_camioneta', jugador ? null : col, 5.3);
  if(gg){ gg.userData.asientos = {chofer:V3(-0.45, 0.55, -0.55), caja:[V3(-0.45, 1.02, 1.2), V3(0.5, 1.02, 1.7)]}; if(jugador) gg.userData.jugador = true; return gg; }
  const g = new THREE.Group(), m = c=> mat(c);
  const pone = (x,y,z,w,h,d,c)=>{ const q = new THREE.Mesh(CAJA, m(c)); q.position.set(x,y,z); q.scale.set(w,h,d); q.castShadow = true; g.add(q); return q; };
  pone(0, 0.75, 0, 2.1, 0.6, 5.4, col); const cab = pone(0, 1.45, 1.2, 2.0, 0.85, 1.9, col); pone(0, 1.5, 2.17, 1.8, 0.6, 0.04, '#2a3a4a');
  pone(0, 1.2, -1.6, 2.1, 0.5, 0.1, col); for(const s of [-1,1]) pone(s*1.02, 1.2, -1.2, 0.08, 0.5, 2.8, col);
  for(const [x,z] of [[-1,1.7],[1,1.7],[-1,-1.7],[1,-1.7]]){ const r = pone(x, 0.42, z, 0.35, 0.84, 0.84, '#15171a'); r.rotation.x = 0.3; }
  pone(0, 0.85, 2.72, 1.9, 0.3, 0.08, '#8a8f94');
  g.userData.cab = cab; if(jugador) g.userData.jugador = true;
  return g;
}
function moto(){ const gg = vehGLB('veh_moto', null, 2.1); if(gg){ gg.userData.asientos = {chofer:V3(0, 0.62, 0.12), caja:[V3(0, 0.7, 0.55)]}; return gg; }
  const g = new THREE.Group(); const pone = (x,y,z,w,h,d,c)=>{ const q = new THREE.Mesh(CAJA, mat(c)); q.position.set(x,y,z); q.scale.set(w,h,d); g.add(q); return q; };
  pone(0, 0.6, 0, 0.35, 0.4, 1.6, '#2a2e33'); pone(0, 0.35, 0.75, 0.12, 0.7, 0.7, '#15171a'); pone(0, 0.35, -0.75, 0.12, 0.7, 0.7, '#15171a'); pone(0, 0.95, 0.55, 0.6, 0.06, 0.06, '#8a8f94'); return g; }
/* rotor: un disco con el barrido de las palas (se lee mejor que palas que giran a 28 rad/s en 60 cuadros) */
function texRotor(){ const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  for(let k=0;k<4;k++){ const a0 = k*Math.PI/2; const gr = g.createRadialGradient(128,128,10,128,128,128); gr.addColorStop(0,'rgba(20,22,24,0.9)'); gr.addColorStop(1,'rgba(20,22,24,0.25)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(128,128); g.arc(128,128,126,a0,a0 + 0.55); g.closePath(); g.fill(); }
  g.fillStyle = 'rgba(20,22,24,0.12)'; g.beginPath(); g.arc(128,128,126,0,Math.PI*2); g.fill();
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
let TEX_ROTOR = null;
function helicoptero(){
  const hg = vehGLB('veh_helicoptero', null, 13);
  if(hg){ /* el modelo mira a −z: se lo gira dentro para que el resto del código (hecho con la nariz en +z) siga igual */
    const g = new THREE.Group(), cuerpo = hg.children[0]; cuerpo.rotation.y = Math.PI; cuerpo.position.y = -1.45; g.add(cuerpo);
    TEX_ROTOR = TEX_ROTOR || texRotor();
    const mr = new THREE.MeshBasicMaterial({map:TEX_ROTOR, transparent:true, depthWrite:false, side:THREE.DoubleSide});
    const rotor = new THREE.Mesh(new THREE.CircleGeometry(6.4, 40), mr); rotor.rotation.x = -Math.PI/2; const piv = new THREE.Group(); piv.add(rotor);
    /* el mástil medido en el modelo (nariz en −z); girado π queda en +z */
    const pr = MODELOS.veh_helicoptero.man.puntos && MODELOS.veh_helicoptero.man.puntos.rotor; piv.position.set(0, (pr ? pr[1] : hg.userData.alto - 0.1) - 1.45 + 0.05, pr ? -pr[2] : 0.2); g.add(piv);
    const cola = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), mr); cola.rotation.y = Math.PI/2; const pc = new THREE.Group(); pc.add(cola); pc.position.set(0.45, hg.userData.alto*0.45 - 1.45, -6.1); g.add(pc);
    g.userData = {rotor:piv, cola:pc, motor:cuerpo, glb:true}; return g; }
  const g = new THREE.Group(); const pone = (x,y,z,w,h,d,c)=>{ const q = new THREE.Mesh(CAJA, mat(c)); q.position.set(x,y,z); q.scale.set(w,h,d); q.castShadow = true; g.add(q); return q; };
  pone(0, 0, 0, 2.4, 2.2, 5, '#3a4038'); pone(0, 0.2, 2.8, 2.0, 1.6, 1.2, '#2a3a4a'); pone(0, 0.5, -5, 0.6, 0.6, 6, '#3a4038'); pone(0, 1.3, -7.6, 0.2, 2.2, 1.2, '#3a4038');
  for(const s of [-1,1]){ pone(s*1.1, -1.45, 0, 0.12, 0.12, 4.4, '#15171a'); pone(s*1.1, -1.2, 1.2, 0.1, 0.5, 0.1, '#15171a'); pone(s*1.1, -1.2, -1.2, 0.1, 0.5, 0.1, '#15171a'); }
  const rotor = pone(0, 1.35, 0, 11, 0.06, 0.35, '#15171a'); const cola = pone(0.35, 0.6, -7.8, 0.06, 2.2, 0.25, '#15171a');
  const motor = pone(0, 1.2, -0.6, 1.4, 0.6, 2, '#50565c');
  g.userData = {rotor, cola, motor};
  return g;
}

/* ====================== arma en primera persona ====================== */
const VM = {g:new THREE.Group(), arma:null, id:'', patada:0, recarga:0, fl:null, mira:V3(0,0.06,0), bocaY:0.01};
/* fogonazo: una estrella dibujada, sumada y por encima de 1 (en HDR el bloom la agranda sola) */
function texEstrella(){ const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,220,150,0.9)'); gr.addColorStop(0.5, 'rgba(255,140,40,0.25)'); gr.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.globalCompositeOperation = 'lighter';
  for(let k=0;k<7;k++){ const a = k/7*Math.PI*2 + 0.3, l = 40 + (k%2)*20; g.strokeStyle = 'rgba(255,210,130,0.55)'; g.lineWidth = 5 - (k%2)*2; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a)*l, 64 + Math.sin(a)*l); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
const TEX_ESTRELLA = texEstrella();
function flashMalla(k){ const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({map:TEX_ESTRELLA, color:new THREE.Color(7, 4.2, 2.2).multiplyScalar(k||1), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, fog:false});
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), m), p2 = p1.clone(), p3 = p1.clone(); p2.rotation.y = Math.PI/2; p3.rotation.x = Math.PI/2; p3.scale.setScalar(0.7); g.add(p1, p2, p3); g.visible = false; return g; }
function iniVM(){
  VM.luzH = new THREE.HemisphereLight(0xffffff, 0x404448, 0.9); vmEscena.add(VM.luzH);
  VM.luzD = new THREE.DirectionalLight(0xffffff, 0.8); VM.luzD.position.set(-1, 2, 1); vmEscena.add(VM.luzD);
  VM.luzC = new THREE.DirectionalLight(0x9ab8ff, 0.35); VM.luzC.position.set(1.5, 0.5, -1.5); vmEscena.add(VM.luzC);   /* contra frío: separa el arma del fondo */
  VM.luzF = new THREE.PointLight(0xffb060, 0, 1.6, 2); vmEscena.add(VM.luzF);   /* el fogonazo ilumina el arma */
  vmEscena.add(VM.g);
  VM.fl = flashMalla(1); VM.g.add(VM.fl);
}
const MATE_MANGA = ()=> mat('#2b3036', {roughness:0.95, metalness:0}), MATE_GUANTE = ()=> mat('#17191c', {roughness:0.82, metalness:0});
function guante(g, x, y, z, izq){ const q = new THREE.Mesh(CAJA, MATE_GUANTE()); q.position.set(x, y, z); q.scale.set(0.065, 0.085, 0.1); g.add(q);
  const dedos = new THREE.Mesh(CAJA, MATE_GUANTE()); dedos.position.set(x + (izq ? 0.02 : -0.02), y + 0.035, z - 0.03); dedos.scale.set(0.03, 0.03, 0.08); g.add(dedos); return q; }
function manga(g, x, y, z, rx, ry, largo){ const m = new THREE.Mesh(CAJA, MATE_MANGA()); m.position.set(x, y, z); m.scale.set(0.095, 0.095, largo); m.rotation.set(rx, ry, 0); g.add(m);
  const puno = new THREE.Mesh(CAJA, mat('#3a4046', {roughness:0.9})); puno.position.set(0, 0, -0.5); puno.scale.set(1.08, 1.08, 0.12); m.add(puno); return m; }
function armarVM(id){
  if(VM.id === id) return; VM.id = id; if(VM.arma) VM.g.remove(VM.arma);
  const A = ARMAS[id], g = new THREE.Group(), idm = 'arma_' + id, P = puntosArma(idm);
  if(P){
    /* el modelo generado, con la empuñadura en el origen del grupo */
    const m = mallaModelo(idm, false); m.position.copy(P.empunadura).multiplyScalar(-1); g.add(m);
    const boca = P.boca.clone().sub(P.empunadura), gm = P.guardamano.clone().sub(P.empunadura);
    VM.boca = boca.z; VM.bocaY = boca.y; VM.mira.copy(P.mira).sub(P.empunadura);
    if(tieneMej(id,'silen')){ const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 14), mat('#15171a', {roughness:0.5, metalness:0.6})); s.rotation.x = Math.PI/2; s.position.set(0, boca.y, boca.z - 0.1); g.add(s); VM.boca -= 0.2; }
    if(tieneMej(id,'mira') && A.clase!=='francotirador'){ const s = new THREE.Mesh(CAJA, mat('#15171a', {roughness:0.4, metalness:0.5})); s.position.set(0, VM.mira.y + 0.022, VM.mira.z - 0.02); s.scale.set(0.034, 0.042, 0.07); g.add(s);
      const vid = new THREE.Mesh(new THREE.PlaneGeometry(0.026, 0.026), new THREE.MeshBasicMaterial({color:new THREE.Color(0.9, 0.2, 0.15), transparent:true, opacity:0.35})); vid.position.set(0, VM.mira.y + 0.028, VM.mira.z - 0.056); g.add(vid); VM.mira.y += 0.03; }
    /* manos: la derecha en la empuñadura, la izquierda en el guardamano (la pistola, a dos manos) */
    /* manos generadas (palma en el origen, antebrazo hacia +z): la derecha envuelve la empuñadura, la izquierda sostiene el guardamano */
    const md = mallaModelo('mano_der', false), mi = mallaModelo('mano_izq', false);
    if(md){ md.position.set(0.012, -0.012, 0.03); md.rotation.set(0.42, -0.1, 0.06); g.add(md); }
    else { guante(g, 0, -0.01, 0.02, false); manga(g, 0.045, -0.1, 0.24, 0.42, -0.08, 0.42); }
    if(mi){ if(A.clase==='pistola'){ mi.position.set(-0.02, -0.045, 0.035); mi.rotation.set(0.35, 0.55, -0.35); } else { mi.position.set(gm.x - 0.004, gm.y - 0.03, gm.z); mi.rotation.set(0.3, 0.42, 0.12); } g.add(mi); }
    else if(A.clase==='pistola'){ guante(g, -0.035, -0.02, 0.0, true); manga(g, -0.12, -0.12, 0.22, 0.45, 0.35, 0.42); }
    else { guante(g, gm.x - 0.01, gm.y - 0.02, gm.z, true); manga(g, gm.x - 0.12, gm.y - 0.12, gm.z + 0.2, 0.32, 0.5, 0.46); }
  } else {
    for(const [, x, y, z, w, h, d, c] of A.piezas){ const m = new THREE.Mesh(CAJA, mat(c)); m.position.set(x, y, z); m.scale.set(w, h, d); g.add(m); }
    if(tieneMej(id,'silen')){ const s = new THREE.Mesh(CAJA, mat('#15171a')); const z0 = Math.min(...A.piezas.map(p=> p[3] - p[6]/2)); s.position.set(0, 0.015, z0 - 0.09); s.scale.set(0.04, 0.04, 0.18); g.add(s); }
    if(tieneMej(id,'mira') && A.clase!=='francotirador'){ const s = new THREE.Mesh(CAJA, mat('#15171a')); s.position.set(0, 0.075, -0.06); s.scale.set(0.035, 0.04, 0.07); g.add(s); }
    const manga0 = new THREE.Mesh(CAJA, MATE_MANGA()); manga0.position.set(0.05, -0.12, 0.25); manga0.scale.set(0.09, 0.09, 0.4); manga0.rotation.x = 0.35; g.add(manga0);
    const guante0 = new THREE.Mesh(CAJA, MATE_GUANTE()); guante0.position.set(0.0, -0.05, 0.02); guante0.scale.set(0.07, 0.08, 0.1); g.add(guante0);
    if(A.clase!=='pistola'){ const m2 = new THREE.Mesh(CAJA, MATE_MANGA()); m2.position.set(-0.12, -0.14, -0.08); m2.scale.set(0.09, 0.09, 0.36); m2.rotation.set(0.3, -0.5, 0); g.add(m2);
      const g2 = new THREE.Mesh(CAJA, MATE_GUANTE()); g2.position.set(-0.02, -0.04, -0.2); g2.scale.set(0.07, 0.07, 0.1); g.add(g2); }
    VM.boca = Math.min(...A.piezas.map(p=> p[3] - p[6]/2)) - (tieneMej(id,'silen') ? 0.18 : 0); VM.bocaY = 0.01; VM.mira.set(0, 0.06, 0);
  }
  VM.arma = g; VM.g.add(g);
}
