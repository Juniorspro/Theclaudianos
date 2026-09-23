
/* ====================== soldados con esqueleto generado (Rezona) ======================
   El GLB se mueve con NUESTRO IK: cada hueso se orienta para que su eje hacia el hijo apunte al punto
   que le toca. El tronco y la cadera usan dos ejes (el del tronco y la línea de hombros o de caderas);
   brazos y piernas se giran con su padre y después se alinean al punto siguiente (así no degeneran
   cuando apuntan al frente). Sólo mira los 16 puntos del mundo: sirve igual vivo y en el muñeco de trapo. */
const PJ = {};
const PJ_DE = {tirador:'pj_soldado', escopeta:'pj_soldado', pesado:'pj_pesado', escudo:'pj_soldado', rpg:'pj_soldado', franco:'pj_soldado', captor:'pj_soldado', coloso:'pj_coloso'};
const TINTE_PJ = {tirador:'#ffffff', escopeta:'#e6dccb', escudo:'#c4d0e2', rpg:'#d2d8b4', franco:'#b8c4a0', captor:'#e8c4bc'};
const ARMA_DE = {tirador:'arma_r4', escopeta:'arma_b12', pesado:'arma_m14', escudo:'arma_p9', rpg:'arma_rpg', franco:'arma_l96', captor:'arma_p9', coloso:'arma_minigun'};
/* orden de los huesos: primero los padres */
const CADENA = ['Hip','Pelvis','Waist','Spine01','Spine02','NeckTwist01','Head','L_Clavicle','L_Upperarm','L_Forearm','L_Hand','R_Clavicle','R_Upperarm','R_Forearm','R_Hand',
  'L_Thigh','L_Calf','L_Foot','L_ToeBase','R_Thigh','R_Calf','R_Foot','R_ToeBase'];
function prepararPersonajes(){
  for(const man of (MAN.pj||[])){
    const g = GLB_LISTO['glb/' + man.id]; if(!g) continue;
    let sk = null; g.scene.traverse(o=>{ if(o.isSkinnedMesh && !sk) sk = o; }); if(!sk) continue;
    g.scene.updateMatrixWorld(true);
    /* pose de reposo en el mundo (la del GLB es la de atadura) */
    const rest = {}; for(const b of sk.skeleton.bones){ const p = V3(0,0,0), q = new THREE.Quaternion(); b.getWorldPosition(p); b.getWorldQuaternion(q); rest[b.name] = {p, q}; }
    if(!rest.Hip || !rest.Head) continue;
    const dir = (a, b)=> rest[b].p.clone().sub(rest[a].p).normalize();
    const R = {rest, d:{Hip:dir('Hip','Spine02'), Spine01:dir('Spine01','Spine02'), Spine02:dir('Spine02','NeckTwist01'), NeckTwist01:dir('NeckTwist01','Head'),
        L_Upperarm:dir('L_Upperarm','L_Forearm'), L_Forearm:dir('L_Forearm','L_Hand'), R_Upperarm:dir('R_Upperarm','R_Forearm'), R_Forearm:dir('R_Forearm','R_Hand'),
        L_Thigh:dir('L_Thigh','L_Calf'), L_Calf:dir('L_Calf','L_Foot'), R_Thigh:dir('R_Thigh','R_Calf'), R_Calf:dir('R_Calf','R_Foot'), L_Foot:dir('L_Foot','L_ToeBase'), R_Foot:dir('R_Foot','R_ToeBase')},
      latH:dir('R_Thigh','L_Thigh'), latS:dir('R_Upperarm','L_Upperarm'), cabDir:V3(0,1,0).applyQuaternion(rest.Head.q)};
    R.cabDir = dir('NeckTwist01','Head');
    PJ[man.id] = {scene:g.scene, man, R, mats:{}};
  }
}
AL_LLEGAR.push(prepararPersonajes);
function matPJ(id, tipo){
  const P = PJ[id], k = tipo || '*'; if(P.mats[k]) return P.mats[k];
  const m = matModelo('pj', id, P.man, {skinning:true, envMapIntensity:0.7});
  if(TINTE_PJ[tipo]) m.color = colL(TINTE_PJ[tipo]);
  if(id === 'pj_pesado') m.roughness = 1;   /* venía en 0,25 y se veía de plástico */
  return P.mats[k] = m;
}
/* un cuerpo nuevo: el GLB clonado (cada uno con su esqueleto) y, si hay, el arma y el escudo generados */
function cuerpoGLB(tipo, civil){
  const id = civil ? 'pj_rehen' : PJ_DE[tipo]; if(!id || !PJ[id] || !THREE.SkeletonUtils) return null;
  const esc = THREE.SkeletonUtils.clone(PJ[id].scene), huesos = {}; let malla = null;
  esc.traverse(o=>{ if(o.isBone) huesos[o.name] = o; if(o.isSkinnedMesh){ malla = o; o.material = matPJ(id, civil ? 'civil' : tipo); o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true; } });
  if(!malla) return null;
  const g = new THREE.Group(); g.add(esc);
  const C = {g, piezas:{}, glb:{id, esc, huesos, malla, R:PJ[id].R}};
  if(!civil){ const ida = ARMA_DE[tipo]; if(MODELOS[ida]){ const a = new THREE.Group(), m = mallaModelo(lodDe(ida)), P = puntosArma(ida); m.position.copy(P.empunadura).multiplyScalar(-1); a.add(m); g.add(a); C.glb.arma = {g:a, P}; } }
  if(!civil && tipo === 'escudo' && MODELOS.escudo){ const m = mallaModelo('escudo'); g.add(m); C.glb.escudo = m; }
  return C;
}
const _qA = new THREE.Quaternion(), _qB = new THREE.Quaternion(), _qP = new THREE.Quaternion(), _qW = {}, _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
const _v1 = V3(0,0,0), _v2 = V3(0,0,0), _v3 = V3(0,0,0), _v4 = V3(0,0,0), _lat = V3(0,0,0), _lat2 = V3(0,0,0);
/* rotación que lleva el marco (y=a, x≈b) al marco (y=c, x≈d) */
function rotMarcos(a, b, c, d, sal){
  const base = (y, x, m)=>{ _v3.copy(x).addScaledVector(y, -x.dot(y)).normalize(); _v4.crossVectors(_v3, y); m.makeBasis(_v3, y, _v4); };
  base(a, b, _m1); base(c, d, _m2); _m1.transpose(); _m2.multiply(_m1); return sal.setFromRotationMatrix(_m2);
}
function ponerHueso(B, nombre, qMundo, padre){
  const b = B[nombre]; if(!b) return; _qW[nombre] = (_qW[nombre] || new THREE.Quaternion()).copy(qMundo);
  _qP.copy(_qW[padre] || new THREE.Quaternion()).invert(); b.quaternion.copy(_qP).multiply(qMundo);
}
/* hueso que sigue a su padre y después se alinea con el segmento a→b del juego */
function alinearHueso(B, R, nombre, padre, rPadre, a, b){
  const rest = R.rest[nombre]; if(!rest) return;
  _qA.copy(rPadre).multiply(rest.q);   /* girado junto con el padre */
  if(a && b && R.d[nombre]){ _v1.copy(R.d[nombre]).applyQuaternion(rPadre); _v2.subVectors(b, a); const l = _v2.length(); if(l > 1e-4){ _v2.divideScalar(l); _qB.setFromUnitVectors(_v1, _v2); _qA.premultiply(_qB); } }
  ponerHueso(B, nombre, _qA, padre);
  return _qA.clone().multiply(_qB.copy(rest.q).invert());   /* delta de mundo de este hueso (para sus hijos) */
}
function vestirGLB(e){
  const C = e.cuerpo.glb, B = C.huesos, R = C.R, P = e.pts, s = e.esc || 1;
  for(const k in _qW) delete _qW[k];
  C.esc.position.set(0, 0, 0); C.esc.scale.setScalar(s);
  /* cadera en el punto del juego (un poco más abajo: las piernas del modelo son 5 cm más cortas) */
  B.Hip.position.set(P.pel.x/s, P.pel.y/s - 0.045, P.pel.z/s);
  _lat.subVectors(P.caI, P.caD).normalize(); _lat2.subVectors(P.hoI, P.hoD).normalize();
  _v2.subVectors(P.pec, P.pel).normalize();
  const dHip = rotMarcos(R.d.Hip, R.latH, _v2, _lat, new THREE.Quaternion());
  for(const n of ['Hip','Pelvis','Waist']) ponerHueso(B, n, _qA.copy(dHip).multiply(R.rest[n].q), n==='Hip' ? 'Root' : (n==='Pelvis' ? 'Hip' : 'Hip'));
  const dS1 = rotMarcos(R.d.Spine01, R.latH, _v2, _v1.addVectors(_lat, _lat2).normalize(), new THREE.Quaternion());
  ponerHueso(B, 'Spine01', _qA.copy(dS1).multiply(R.rest.Spine01.q), 'Waist');
  _v2.subVectors(P.cue, P.pec).normalize();
  const dS2 = rotMarcos(R.d.Spine02, R.latS, _v2, _lat2, new THREE.Quaternion());
  ponerHueso(B, 'Spine02', _qA.copy(dS2).multiply(R.rest.Spine02.q), 'Spine01');
  _v2.subVectors(P.cab, P.cue).normalize();
  const dN = rotMarcos(R.d.NeckTwist01, R.latS, _v2, _lat2, new THREE.Quaternion());
  ponerHueso(B, 'NeckTwist01', _qA.copy(dN).multiply(R.rest.NeckTwist01.q), 'Spine02');
  ponerHueso(B, 'Head', _qA.copy(dN).multiply(R.rest.Head.q), 'NeckTwist01');
  /* brazos y piernas: I = izquierda del cuerpo = L_ del modelo */
  for(const [lado, k] of [['L','I'], ['R','D']]){
    ponerHueso(B, lado + '_Clavicle', _qA.copy(dS2).multiply(R.rest[lado + '_Clavicle'].q), 'Spine02');
    const dU = alinearHueso(B, R, lado + '_Upperarm', lado + '_Clavicle', dS2, P['ho' + k], P['co' + k]);
    const dF = alinearHueso(B, R, lado + '_Forearm', lado + '_Upperarm', dU, P['co' + k], P['ma' + k]);
    alinearHueso(B, R, lado + '_Hand', lado + '_Forearm', dF, null, null);
    const dT = alinearHueso(B, R, lado + '_Thigh', 'Pelvis', dHip, P['ca' + k], P['ro' + k]);
    const dC = alinearHueso(B, R, lado + '_Calf', lado + '_Thigh', dT, P['ro' + k], P['pi' + k]);
    /* el pie, apoyado y hacia adelante mientras vive; muerto, sigue a la pierna */
    if(e.estado !== 'muerto'){ _v1.crossVectors(_lat, ARRIBA).normalize(); _v3.copy(P['pi' + k]).addScaledVector(_v1, 0.14); _v3.y = P['pi' + k].y - 0.01; alinearHueso(B, R, lado + '_Foot', lado + '_Calf', dC, P['pi' + k], _v3); }
    else alinearHueso(B, R, lado + '_Foot', lado + '_Calf', dC, null, null);
    ponerHueso(B, lado + '_ToeBase', _qA.copy(_qW[lado + '_Foot'] || dC).multiply(_qB.copy(R.rest[lado + '_Foot'].q).invert()).multiply(R.rest[lado + '_ToeBase'].q), lado + '_Foot');
  }
  C.esc.updateMatrixWorld(true);
  /* arma en la mano derecha del modelo, apuntando de la derecha a la izquierda (como la toma el IK) */
  if(C.arma){ const vivo = e.estado !== 'muerto'; C.arma.g.visible = vivo || !!e.armaCae;
    if(vivo){ B.R_Hand.getWorldPosition(_v1); _v2.subVectors(P.maI, P.maD); if(_v2.lengthSq() < 1e-6) _v2.set(Math.sin(e.rumbo), 0, Math.cos(e.rumbo)); _v2.normalize();
      if(e.def && (e.def.cohete || e.def.jefe)){ _v2.set(Math.sin(e.rumbo), Math.sin(e.pitch||0)*0.5, Math.cos(e.rumbo)).normalize(); }
      /* -z del modelo del arma → hacia donde apunta; +y lo más parecido al arriba del mundo */
      _v3.copy(_v2).negate(); _v4.copy(ARRIBA).addScaledVector(_v3, -ARRIBA.dot(_v3)).normalize(); const x = V3(0,0,0).crossVectors(_v4, _v3);
      _m1.makeBasis(x, _v4, _v3); C.arma.g.quaternion.setFromRotationMatrix(_m1); C.arma.g.position.copy(_v1); C.arma.g.scale.setScalar(s);
      if(e.def && e.def.cohete){ C.arma.g.position.copy(P.hoD).addScaledVector(_v2, 0.1); }
      const bo = C.arma.P.boca.clone().sub(C.arma.P.empunadura).multiplyScalar(s).applyQuaternion(C.arma.g.quaternion).add(C.arma.g.position);
      e.boca = (e.boca || V3(0,0,0)).copy(bo); }
  }
  if(C.escudo){ const m = C.escudo, fw = V3(Math.sin(e.rumbo), 0, Math.cos(e.rumbo)), rt = V3(Math.cos(e.rumbo), 0, -Math.sin(e.rumbo));
    const c = P.pel.clone().lerp(P.pec, 0.2).addScaledVector(fw, 0.42*s).addScaledVector(rt, e.estado==='disparar' ? 0.32 : 0); c.y = Math.max(0.6, c.y);
    m.visible = e.estado !== 'muerto' || !!e.escudoCae; m.position.copy(c).add(V3(0, -0.5, 0)); m.rotation.set(0, e.rumbo + Math.PI, 0);   /* la mirilla del modelo mira a −z: hacia afuera, al jugador */
    const b = MODELOS.escudo.caja; m.scale.set(0.66/(b.max.x - b.min.x), 1.0/(b.max.y - b.min.y), 0.66/(b.max.x - b.min.x));
    m.position.sub(V3(0, b.min.y*m.scale.y, 0));
    e.escudoCaja = {c, rumbo:e.rumbo, w:0.33, h:0.5, d:0.05}; }
}
