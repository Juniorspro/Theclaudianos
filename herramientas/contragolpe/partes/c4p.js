<script>
/* ====================== personajes ======================
   Lowpoly facetado de polígonos: cada hueso lleva una malla fundida con color por vértice (casco, antiparras, pasamontañas,
   chaleco con portacargadores, rodilleras, borceguíes...), todas con el mismo material por personaje. El esqueleto se arma
   por cuadro: caminata procedural con fase por distancia (los pies no patinan), columna que se dobla con el apunte, brazos con
   IK al arma que va delante del pecho, agachado con IK de piernas. La luz sale del mapa de luz (luzEn): ambiente e indirecta
   por uniforme y el sol sólo si le llega. Al morir cae hacia donde lo empujó el tiro (o para el otro lado si hay pared). */
const PERS_PALETA = {
  ct:[{uni:'#2e3a52', ch:'#1f2633', cas:'#262c36', piel:'#c89272', bota:'#18191c', gua:'#15161a', ex:'#3b475e'},
      {uni:'#3b4a38', ch:'#262d24', cas:'#2c3328', piel:'#9c6e52', bota:'#1d1a17', gua:'#1a1a1a', ex:'#4c5a47'},
      {uni:'#23324a', ch:'#11151d', cas:'#161a22', piel:'#e0b090', bota:'#101114', gua:'#101012', ex:'#34435e'}],
  t:[{uni:'#6b5a3e', ch:'#3f3a2c', cas:'#2b2b2b', piel:'#b98463', bota:'#3a2c20', gua:'#2a2520', ex:'#8a7550'},
     {uni:'#4d5234', ch:'#2d2f22', cas:'#8a2a22', piel:'#8f6346', bota:'#2b241c', gua:'#24211c', ex:'#6a6d48'},
     {uni:'#7a6a55', ch:'#533f2d', cas:'#1d1d1d', piel:'#caa07c', bota:'#443427', gua:'#302a24', ex:'#9a8667'}]};
function pzC(geo, col){ const g = (geo.index ? geo.toNonIndexed() : geo); const c = lin(col), n = g.attributes.position.count, a = new Float32Array(n*3); for(let i=0;i<n;i++){ a[i*3] = c.r; a[i*3+1] = c.g; a[i*3+2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if(g.attributes.uv) g.deleteAttribute('uv'); return g; }
function fundirPers(lista){ let n = 0; for(const g of lista) n += g.attributes.position.count; const P = new Float32Array(n*3), C = new Float32Array(n*3); let o = 0;
  for(const g of lista){ const c = g.attributes.position.count; P.set(g.attributes.position.array.subarray(0, c*3), o*3); C.set(g.attributes.color.array.subarray(0, c*3), o*3); o += c; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.computeVertexNormals(); g.computeBoundingSphere(); return g; }
/* formas: todas a lo largo de +y desde el origen del hueso */
const fC = (rb, rt, L, lados, y0)=>{ const g = new THREE.CylinderGeometry(rt, rb, L, lados || 7, 1); g.translate(0, (y0 || 0) + L/2, 0); return g; };
const fB = (w, h, d, x, y, z)=>{ const g = new THREE.BoxGeometry(w, h, d); g.translate(x || 0, y || 0, z || 0); return g; };
const fE = (r, x, y, z, sx, sy, sz, det)=>{ const g = new THREE.IcosahedronGeometry(r, det || 1); g.scale(sx || 1, sy || 1, sz || 1); g.translate(x || 0, y || 0, z || 0); return g; };
const DIM = {cadera:0.93, torso:0.46, cuello:0.08, cabeza:0.24, brazo:0.29, ante:0.27, muslo:0.44, pierna:0.44, hombroX:0.2, caderaX:0.1};
function mallasPersonaje(bando, v){
  const C = PERS_PALETA[bando][v % 3], ct = bando === 'ct', M = {};
  /* pelvis: cadera, cinturón, portaarma */
  M.pelvis = [pzC(fB(0.32, 0.2, 0.2, 0, -0.04, 0), C.uni), pzC(fB(0.34, 0.05, 0.22, 0, 0.05, 0), C.ch), pzC(fB(0.07, 0.12, 0.09, 0.18, -0.02, 0), C.ch)];
  /* torso: tronco que se ensancha, chaleco con portacargadores y radio */
  const tronco = new THREE.CylinderGeometry(0.2, 0.16, DIM.torso, 7, 1); tronco.scale(1, 1, 0.66); tronco.translate(0, DIM.torso/2, 0);
  M.torso = [pzC(tronco, C.uni), pzC(fB(0.38, 0.34, 0.26, 0, 0.26, 0.0), C.ch)];
  for(const x of [-0.1, 0, 0.1]) M.torso.push(pzC(fB(0.085, 0.13, 0.06, x, 0.2, -0.155), C.ex));
  if(ct){ M.torso.push(pzC(fB(0.06, 0.12, 0.04, -0.15, 0.36, -0.14), '#111')); M.torso.push(pzC(fB(0.26, 0.05, 0.05, 0, 0.44, -0.12), C.ch)); M.torso.push(pzC(fB(0.44, 0.08, 0.28, 0, 0.45, 0), C.ch)); }
  else { M.torso.push(pzC(fB(0.3, 0.12, 0.05, 0, 0.12, -0.16), C.ex)); M.torso.push(pzC(fB(0.42, 0.1, 0.24, 0, 0.44, 0.0), C.uni)); }
  /* cabeza: pasamontañas, casco con antiparras (CT) o gorra/pañuelo (T) */
  M.cabeza = [pzC(fC(0.055, 0.05, DIM.cuello, 6), C.ch), pzC(fE(0.115, 0, 0.14, 0, 0.92, 1.05, 1), ct ? '#1b1c20' : C.cas), pzC(fB(0.12, 0.04, 0.03, 0, 0.16, -0.1), C.piel)];
  if(ct){ const casco = new THREE.SphereGeometry(0.135, 8, 5, 0, TAU, 0, Math.PI*0.52); casco.scale(1, 0.9, 1.08); casco.translate(0, 0.17, 0.005); M.cabeza.push(pzC(casco, C.cas));
    M.cabeza.push(pzC(fB(0.2, 0.05, 0.05, 0, 0.165, -0.11), '#3a4d5c')); M.cabeza.push(pzC(fB(0.24, 0.02, 0.2, 0, 0.19, 0), C.cas)); }
  else { const gorra = new THREE.SphereGeometry(0.125, 8, 4, 0, TAU, 0, Math.PI*0.45); gorra.translate(0, 0.17, 0); M.cabeza.push(pzC(gorra, v % 3 === 1 ? '#8a2a22' : C.cas));
    if(v % 3 !== 2) M.cabeza.push(pzC(fB(0.16, 0.02, 0.1, 0, 0.19, -0.12), v % 3 === 1 ? '#8a2a22' : C.cas)); M.cabeza.push(pzC(fB(0.2, 0.07, 0.03, 0, 0.1, -0.1), C.ex)); }
  /* brazos */
  for(const s of ['i', 'd']){ M['brazo_' + s] = [pzC(fC(0.06, 0.052, DIM.brazo, 6), C.uni), pzC(fE(0.07, 0, 0.02, 0, 1, 0.8, 1, 0), ct ? C.ch : C.uni)];
    M['ante_' + s] = [pzC(fC(0.05, 0.04, DIM.ante, 6), C.uni), pzC(fE(0.052, 0, DIM.ante + 0.04, 0, 0.8, 1, 1.1, 0), C.gua)]; }
  /* piernas: muslo, rodillera, pierna, borceguí */
  for(const s of ['i', 'd']){ M['muslo_' + s] = [pzC(fC(0.085, 0.065, DIM.muslo, 7), C.uni), pzC(fB(0.06, 0.1, 0.1, s === 'i' ? -0.07 : 0.07, DIM.muslo*0.45, 0), C.ex)];
    M['pierna_' + s] = [pzC(fC(0.062, 0.05, DIM.pierna, 6), C.uni), pzC(fE(0.07, 0, 0.02, -0.03, 1, 0.9, 0.8, 0), ct ? '#15161a' : C.uni), pzC(fB(0.11, 0.1, 0.24, 0, DIM.pierna + 0.02, -0.05), C.bota)]; }
  return M;
}
/* material: estándar con color por vértice, facetado; la luz del lugar entra por dos uniformes (ambiente y cuánto sol) */
function matPersonaje(){ const u = {amb:{value:new THREE.Color(0.4, 0.4, 0.42)}, solK:{value:1}};
  const m = new THREE.MeshStandardMaterial({vertexColors:true, flatShading:true, roughness:0.82, metalness:0});
  m.onBeforeCompile = sh=>{ sh.uniforms.ambPers = u.amb; sh.uniforms.solPers = u.solK;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 ambPers; uniform float solPers;').replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      reflectedLight.directDiffuse *= solPers; reflectedLight.directSpecular *= solPers; reflectedLight.indirectDiffuse += ambPers*diffuseColor.rgb;`); };
  m.customProgramCacheKey = ()=> 'pers'; m.userData.u = u; return m; }
function personajeNuevo(bando, variante){
  const g = new THREE.Group(), mat = matPersonaje(), M = mallasPersonaje(bando, variante || 0), H = {};
  for(const k in M){ const me = new THREE.Mesh(fundirPers(M[k]), mat); me.castShadow = true; me.frustumCulled = false; g.add(me); H[k] = me; }
  const P = {g, mat, H, bando, fase:0, arma:null, armaId:null, muerte:null, luz:{r:0.5, g:0.5, b:0.5, sol:1}, luzT:0, amb:new THREE.Color(0.4, 0.4, 0.42), sol:1, agach:0, pitch:0, retro:0, t:0};
  return P;
}
function personajeRevivir(P){ P.muerte = null; P.g.rotation.set(0, 0, 0); }
const _pj = {}, _pv = V3(), _pw = V3();
function ponerHueso(me, a, b, ref){ me.position.copy(a); me.quaternion.copy(baseHueso(a, b, ref || V3(0, 0, -1), me.quaternion)); }
function personajePose(P, est, dt){
  if(!P.g.parent) return; P.t += dt;
  /* luz del lugar (cada 12 cuadros), suavizada */
  if((P.luzT -= dt) <= 0){ P.luzT = 0.2; luzEn(est.pos.x, est.pos.y + 1, est.pos.z, P.luz); }
  const k = 1 - Math.exp(-dt*5); P.amb.r = lerp(P.amb.r, 0.35 + P.luz.r*1.4, k); P.amb.g = lerp(P.amb.g, 0.35 + P.luz.g*1.4, k); P.amb.b = lerp(P.amb.b, 0.37 + P.luz.b*1.4, k); P.sol = lerp(P.sol, P.luz.sol, k);
  P.mat.userData.u.amb.value.copy(P.amb); P.mat.userData.u.solK.value = P.sol;
  /* arma en la mano */
  if(est.arma !== P.armaId){ if(P.arma) P.g.remove(P.arma.g); P.armaId = est.arma; const f = FABRICA[est.arma === 'cuchillo' ? (P.bando === 't' ? 'cuchillo_t' : 'cuchillo') : est.arma]; P.arma = f ? f() : null;
    if(P.arma){ P.arma.g.traverse(o=>{ if(o.isMesh){ o.castShadow = true; } }); P.g.add(P.arma.g); } }
  P.g.position.copy(est.pos);
  if(P.muerte){ caerMuerto(P, dt); return; }
  P.g.rotation.set(0, est.yaw, 0);
  /* marco local: +x derecha, +y arriba, −z adelante */
  const vl = V3(est.vel.x, 0, est.vel.z).applyAxisAngle(V3(0, 1, 0), -est.yaw), vel = vl.length(), ag = est.agachado || 0;
  P.agach = lerp(P.agach, ag, 1 - Math.exp(-dt*10)); P.pitch = lerp(P.pitch, est.apuntePitch || 0, 1 - Math.exp(-dt*12)); P.retro = Math.max(0, P.retro - dt*6); if(est.disparo) P.retro = 1;
  const corre = est.suelo ? lim(vel/5.5, 0, 1) : 0, zancada = 0.55 + corre*0.5; P.fase += (est.suelo ? vel : 0)*dt/zancada*Math.PI;
  const bob = est.suelo ? Math.abs(Math.sin(P.fase))*0.035*lim(vel/2, 0, 1) : 0, yC = DIM.cadera - P.agach*0.36 - bob*0.5 + (est.suelo ? 0 : 0.05);
  const dirMov = vel > 0.2 ? V3(vl.x/vel, 0, vl.z/vel) : V3(0, 0, -1);
  /* columna: se inclina adelante al correr y con el apunte; el torso gira un poco hacia el arma */
  const cad = V3(0, yC, 0), incl = corre*0.18 + P.agach*0.25, dT = V3(0, Math.cos(incl), -Math.sin(incl)), cue = cad.clone().addScaledVector(dT, DIM.torso);
  ponerHueso(P.H.pelvis, cad, cad.clone().add(V3(0, 0.1, 0))); P.H.pelvis.position.copy(cad); P.H.pelvis.quaternion.identity();
  const qT = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dT); P.H.torso.position.copy(cad); P.H.torso.quaternion.copy(qT);
  const cab = cue.clone().add(V3(0, 0.03, 0)); P.H.cabeza.position.copy(cab); P.H.cabeza.quaternion.setFromEuler(new THREE.Euler(P.pitch*0.6 - incl*0.5, 0, 0));
  /* arma delante del pecho, girada con el apunte; retroceso hacia atrás */
  const pecho = cad.clone().addScaledVector(dT, DIM.torso*0.82), p = P.pitch, apunta = V3(0, Math.sin(p), -Math.cos(p));
  const esRifle = P.arma && P.arma.d.largo > 0.4, esPist = P.arma && P.arma.d.clase === 'pistola';
  const agarre = pecho.clone().add(V3(0.1, -0.08, 0)).addScaledVector(apunta, esPist ? 0.4 : 0.2 - P.retro*0.03);
  if(P.arma){ const A = P.arma; A.g.position.copy(agarre); A.g.quaternion.setFromEuler(new THREE.Euler(p, 0, 0)); A.g.updateMatrixWorld(true);
    const ea = A.e.agarre ? A.e.agarre.position.clone().applyQuaternion(A.g.quaternion) : V3(); A.g.position.copy(agarre).sub(ea); A.g.updateMatrix(); }
  const manoD = agarre.clone(), manoI = P.arma && A_apoyo(P) ? A_apoyo(P) : agarre.clone().add(V3(-0.05, 0.01, -0.05));
  for(const [s, mano, sx] of [['d', manoD, 1], ['i', manoI, -1]]){ const hom = cue.clone().add(V3(sx*DIM.hombroX, -0.05, 0)), polo = hom.clone().add(V3(sx*0.6, -0.6, 0.3));
    const codo = ik2(hom, mano, DIM.brazo, DIM.ante, polo); ponerHueso(P.H['brazo_' + s], hom, codo, V3(0, 0, -1)); ponerHueso(P.H['ante_' + s], codo, mano, V3(0, 0, -1)); }
  /* piernas: pies con fase alternada a lo largo de la dirección de avance */
  const amp = est.suelo ? lim(vel/2.2, 0, 1)*zancada*0.5 : 0.1;
  for(const [s, sx, fz] of [['i', -1, 0], ['d', 1, Math.PI]]){ const f = P.fase + fz, cadL = cad.clone().add(V3(sx*DIM.caderaX, -0.05, 0));
    const adel = Math.cos(f)*amp, alza = Math.max(0, Math.sin(f))*0.14*lim(vel/1.5, 0, 1) + (est.suelo ? 0 : 0.18);
    const pie = V3(sx*(DIM.caderaX + 0.02) + dirMov.x*adel, 0.09 + alza, dirMov.z*adel + (P.agach > 0.5 ? 0.1 : 0));
    const rod = ik2(cadL, pie, DIM.muslo, DIM.pierna, cadL.clone().add(V3(0, -0.3, -0.8))); ponerHueso(P.H['muslo_' + s], cadL, rod, V3(0, 0, 1)); ponerHueso(P.H['pierna_' + s], rod, pie, V3(0, 0, 1)); }
}
function A_apoyo(P){ const A = P.arma; if(!A || !A.e.apoyo) return null; A.g.updateMatrix(); return A.e.apoyo.position.clone().applyMatrix4(A.g.matrix); }
/* ---------- morir: cae hacia el empuje; si hay pared, para el otro lado; los brazos se sueltan ---------- */
function personajeMorir(P, imp, pto){
  const dir = V3(imp ? imp.x : 0, 0, imp ? imp.z : 0); if(dir.lengthSq() < 1e-4) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5); dir.normalize();
  const o = P.g.position; if(rayo(o.x, o.y + 1, o.z, dir.x, 0, dir.z, 1.7, F_SOLIDA, true, -1) >= 0) dir.negate();
  if(rayo(o.x, o.y + 1, o.z, dir.x, 0, dir.z, 1.7, F_SOLIDA, true, -1) >= 0) P.muerte = {dir, t:0, ang:0, vel:0, sentado:true};
  else P.muerte = {dir, t:0, ang:0, vel:1.2 + (imp ? Math.min(3, imp.length()*0.3) : 0), sentado:false};
  P.muerte.yaw0 = P.g.rotation.y; P.muerte.eje = V3(dir.z, 0, -dir.x);
}
function caerMuerto(P, dt){ const m = P.muerte; m.t += dt; const top = m.sentado ? 0.5 : Math.PI/2*0.98;
  if(m.ang < top){ m.vel += 9*Math.sin(Math.max(0.15, m.ang))*dt*1.6; m.ang = Math.min(top, m.ang + m.vel*dt); if(m.ang >= top && m.vel > 1.5){ m.vel *= -0.25; m.ang = top - 0.02; } }
  const q = new THREE.Quaternion().setFromAxisAngle(m.eje, -m.ang), q0 = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), m.yaw0); P.g.quaternion.copy(q).multiply(q0);
  if(m.sentado){ P.g.position.y -= Math.min(0.4, m.t*0.8)*0.02; }
  /* brazos sueltos y piernas un poco dobladas */
  const k = Math.min(1, m.t*2); for(const s of ['i', 'd']){ const b = P.H['brazo_' + s], a = P.H['ante_' + s]; b.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.4, 0, s === 'd' ? 2.6 : -2.6)), k*0.08); a.quaternion.slerp(b.quaternion, k*0.1); }
  if(P.arma && !m.soltada){ m.soltada = true; P.g.remove(P.arma.g); }
}
window.vitrina_personajes = async function(){
  const L = []; let i = 0; for(const b of ['ct', 't']) for(let v=0;v<3;v++){ const P = personajeNuevo(b, v); escena.add(P.g); const x = -5 + i*2; i++; L.push({P, est:{pos:V3(x, 0, -8), yaw:0, vel:V3(0, 0, i % 2 ? -2.5 : 0), suelo:true, agachado:v === 2 ? 1 : 0, apuntePitch:0, arma:i % 3 ? 'ak47' : 'glock'}}); }
  window.__P = {L, pose(t){ for(const x of L){ for(let k=0;k<Math.round(t*60);k++) personajePose(x.P, x.est, DT); } } };
  for(const x of L) personajePose(x.P, x.est, DT);
};
</script>
