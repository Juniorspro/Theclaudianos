<script>
/* ====================== el arma en primera persona ======================
   VM.raiz cuelga de la cámara del arma (sus coordenadas son las de la cámara: +x derecha, +y arriba, −z adelante).
   El arma se pone en su pose de reposo; la mano derecha va al enchufe 'agarre' y la izquierda al 'apoyo' (o donde diga la
   animación); los brazos salen de hombros fuera de cuadro y se resuelven con IK. Encima van las capas: respiración,
   balanceo al caminar, inercia al girar, retroceso, aterrizaje. */
const VM = {raiz:new THREE.Group(), estilo:null, arma:null, id:null, manoD:null, manoI:null, brazoD:null, brazoI:null, t:0, clip:null, clipT:0,
  sway:V3(0, 0, 0), swayV:V3(0, 0, 0), rec:0, recV:0, recGiro:V3(0, 0, 0), recPos:0, caidaY:0, caidaV:0, fase:0, bob:0, ultYaw:0, ultPitch:0, visible:true};
camVM.add(VM.raiz);
/* cómo va cada mano respecto de su enchufe. Las direcciones van en el marco del ARMA (+x derecha, +y arriba, −z adelante), con el
   origen en el enchufe: pc = dónde queda el centro de la palma; y = hacia dónde apuntan los dedos (muñeca → nudillos); z = hacia
   dónde mira el dorso. Con 'eje' la mano se arma alrededor de una barra (mango, cuerpo de granada): r = la barra hacia el meñique,
   z0 = dorso de referencia girado 'a' grados alrededor de la barra, c = centro de la barra y rad = su radio.
   Después la palma se corre por su normal hasta tocar (apoyarPalma) y los dedos se cierran hasta tocar (ponerDedos).
   La que empuña: los metacarpianos van paralelos al caño y la empuñadura (inclinada) cruza la palma en diagonal, como en una
   mano de verdad; el dorso mira a la derecha y un poco arriba. La de apoyo en pistola tapa el costado izquierdo, los dedos
   bajan por delante sobre los de la otra y el pulgar va adelante. */
const MANO_EN = {
  pistola_d:{pc:[0.031, 0.005, 0.012], y:[0.45, 0.3, -0.85], z:[0.8, 0.25, 0.55], pose:'pistola'},
  pistola_i:{pc:[-0.04, -0.01, 0.0], y:[-0.1, 0.25, -0.96], z:[-0.8, 0.3, 0.5], pose:'apoyo'},
  rifle_d:{pc:[0.031, 0.005, 0.02], y:[-0.15, 0.42, -0.9], z:[0.8, 0.25, 0.55], pose:'pistola'},
  guardamano_i:{pc:[0.004, -0.022, 0.0], y:[0.8, 0.35, -0.3], z:[-0.3, -0.95, 0.1], pose:'guardamano'},
  vertical_i:{pc:[-0.03, 0.0, 0.02], y:[0, 0.05, -1], z:[-0.93, 0.3, 0.1], pose:'puno'},
  cuchillo_d:{eje:{r:[0, 0, 1], z0:[1, 0, 0], a:40, c:[0, 0, 0], rad:0.013}, pose:'puno'},
  granada_d:{eje:{r:[0, -1, 0], z0:[1, 0, 0], a:-30, c:[0, 0, 0], rad:0.024}, pose:'granada'},
  c4_d:{pc:[0.0, -0.022, -0.02], y:[0, 0, -1], z:[0.3, -0.95, 0], pose:'guardamano'}, c4_i:{pc:[0.0, -0.022, -0.02], y:[0, 0, -1], z:[-0.3, -0.95, 0], pose:'guardamano'},
  /* manos de la recarga y del cerrojo */
  cargador_i:{pc:[0.0, -0.024, 0.004], y:[0.15, 0.25, -0.95], z:[-0.2, -0.95, 0.1], pose:'cargador'},
  cargadorR_i:{pc:[-0.03, 0.01, 0.0], y:[0.3, -0.2, -0.93], z:[-0.95, 0.1, -0.25], pose:'cargador'},
  corredera_i:{pc:[0.0, 0.03, 0.0], y:[1, 0.1, 0.1], z:[0.1, 1, 0.1], pose:'pinza'},
  cerrojo_i:{pc:[0.01, 0.035, 0.0], y:[1, -0.35, 0.1], z:[0.3, 0.95, 0.1], pose:'pinza'},
  cerrojo_d:{pc:[0.02, 0.01, 0.02], y:[-0.3, 0.2, -0.93], z:[0.9, 0.3, 0.1], pose:'pinza'},
  anilla_i:{pc:[-0.02, 0.02, 0.0], y:[0.95, 0.2, -0.2], z:[0.0, 0.9, 0.4], pose:'anilla'},
  teclado_d:{pc:[0.0, 0.05, 0.05], y:[-0.3, -0.5, -0.8], z:[0.3, 0.8, -0.5], pose:'senalar'},
};
const PALMA_C = [0, 0.05, -0.015];
/* la barra agarrada pasa por (0, 0.066, −(0.016 + radio)) de la mano */
function defDeEje(def){ const e = def.eje, X = V3().fromArray(e.r).normalize(), Z = V3().fromArray(e.z0).applyAxisAngle(X, e.a*GRAD).normalize(), Y = Z.clone().cross(X).normalize();
  Z.copy(X.clone().cross(Y)).normalize(); const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  const b = V3(0, 0.066, -(0.016 + e.rad)).applyQuaternion(q); return {q, p:[e.c[0] - b.x, e.c[1] - b.y, e.c[2] - b.z]}; }
function quatDeEjes(y, z){ const Y = V3(y[0], y[1], y[2]).normalize(), Z0 = V3(z[0], z[1], z[2]); const X = Y.clone().cross(Z0).normalize(), Z = X.clone().cross(Y).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); }
/* pose de reposo del arma en la cámara (metros y grados) por arma */
const VM_REPOSO = {
  glock:{p:[0.07, -0.074, -0.34], r:[0, 3, 0]}, usps:{p:[0.07, -0.074, -0.34], r:[0, 3, 0]}, deagle:{p:[0.07, -0.078, -0.35], r:[0, 3, 0]},
  mac10:{p:[0.105, -0.08, -0.34], r:[0, 5, 0]}, mp9:{p:[0.105, -0.08, -0.34], r:[0, 5, 0]},
  ak47:{p:[0.12, -0.08, -0.36], r:[0, 5, 0]}, m4s:{p:[0.12, -0.078, -0.36], r:[0, 5, 0]}, awp:{p:[0.12, -0.09, -0.33], r:[0, 4, 0]},
  cuchillo:{p:[0.15, -0.13, -0.33], r:[-18, 38, 16]}, cuchillo_t:{p:[0.15, -0.13, -0.33], r:[-18, 38, 16]},
  he:{p:[0.14, -0.12, -0.3], r:[0, 0, 0]}, flash:{p:[0.14, -0.12, -0.3], r:[0, 0, 0]}, humo:{p:[0.14, -0.12, -0.3], r:[0, 0, 0]}, c4:{p:[0.0, -0.17, -0.36], r:[30, 0, 0]},
};
/* hombros lejos atrás y abajo (fuera de cuadro) para que el brazo llegue casi estirado, como en los juegos */
const HOMBRO = {d:V3(0.19, -0.22, 0.05), i:V3(-0.19, -0.22, 0.05), poloD:V3(0.6, -0.6, 0.0), poloI:V3(-0.6, -0.6, 0.0)};
function quatDeGrados(r){ return new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0]*GRAD, r[1]*GRAD, r[2]*GRAD, 'YXZ')); }
function vmEstilo(estilo){
  if(VM.estilo === estilo) return; VM.estilo = estilo;
  for(const k of ['manoD', 'manoI', 'brazoD', 'brazoI']) if(VM[k]){ VM.raiz.remove(VM[k].malla); VM[k].malla.geometry.dispose(); }
  VM.manoD = mallaMano('d', estilo); VM.manoI = mallaMano('i', estilo); VM.brazoD = mallaBrazo('d', estilo); VM.brazoI = mallaBrazo('i', estilo);
  for(const k of ['manoD', 'manoI', 'brazoD', 'brazoI']) VM.raiz.add(VM[k].malla);
}
function vmArma(id){
  if(VM.arma){ VM.raiz.remove(VM.arma.g); }
  const A = FABRICA[id === 'cuchillo' && VM.estilo === 't' ? 'cuchillo_t' : id](); VM.arma = A; VM.id = id; VM.raiz.add(A.g);
  A.g.traverse(o=>{ if(o.isMesh){ o.castShadow = false; o.frustumCulled = false; } });
  A.reposo = {pos:{}, rot:{}}; for(const k in A.p){ A.reposo.pos[k] = A.p[k].position.clone(); A.reposo.rot[k] = A.p[k].quaternion.clone(); }
  const cl = A.d.clase; VM.kD = 0.5; VM.kI = cl === 'pistola' ? 0.5 : 0.85; VM.agarre = cl === 'cuchillo' ? 'cuchillo_d' : cl === 'granada' ? 'granada_d' : cl === 'c4' ? 'c4_d' : cl === 'pistola' ? 'pistola_d' : 'rifle_d';
  VM.apoyo = cl === 'pistola' ? 'pistola_i' : id === 'mp9' ? 'vertical_i' : (cl === 'rifle' || cl === 'smg' || cl === 'francotirador') ? 'guardamano_i' : cl === 'c4' ? 'c4_i' : null;
  return A;
}
/* transforma del enchufe (marco del arma) + mano_en → matriz de la muñeca en la cámara */
const _mA = new THREE.Matrix4(), _mB = new THREE.Matrix4(), _mC = new THREE.Matrix4(), _pT = V3(), _qT = new THREE.Quaternion(), _sT = V3();
function manoEnEnchufe(A, enchufeNom, def, outPos, outQ){
  const e = A.e[enchufeNom] || A.e.agarre; A.g.updateMatrixWorld(true);
  if(!def.q){ if(def.eje){ const r = defDeEje(def); def.q = r.q; def.p = r.p; }
    else { def.q = quatDeEjes(def.y, def.z); const c = V3(PALMA_C[0], PALMA_C[1], PALMA_C[2]).applyQuaternion(def.q); def.p = [def.pc[0] - c.x, def.pc[1] - c.y, def.pc[2] - c.z]; } }
  /* marco del arma con el origen en el enchufe (la rotación del enchufe no cuenta) */
  _mB.compose(V3(e.position.x + def.p[0], e.position.y + def.p[1], e.position.z + def.p[2]), def.q, V3(1, 1, 1));
  _mA.copy(VM.raiz.matrixWorld).invert().multiply(e.parent.matrixWorld).multiply(_mB);
  _mA.decompose(outPos, outQ, _sT);
}
/* la manga termina en un tramo alineado con la mano (de C, 4,5 cm detrás de la muñeca por el eje de la mano, hasta 2 cm pasada
   la muñeca): así el puño del guante queda siempre adentro. El antebrazo va de C al codo, torcido 'k' desde el eje de la mano
   hacia el hombro nominal (la manga se dobla en C, como se arruga en la muñeca); el hombro real queda a un brazo del codo. */
const PUNO = 0.045;
function vmResolverBrazo(brazo, hombro, polo, wPos, qMano, k){
  const yM = V3(0, 1, 0).applyQuaternion(qMano), C = wPos.clone().addScaledVector(yM, -PUNO), aH = hombro.clone().sub(C).normalize();
  const dAnte = yM.clone().negate().lerp(aH, k === undefined ? 0.5 : k).normalize(), E = C.clone().addScaledVector(dAnte, BRAZO.b - PUNO);
  const S = E.clone().addScaledVector(hombro.clone().sub(E).normalize(), BRAZO.a); brazo.hombro = S;
  brazo.malla.position.copy(S);
  brazo.malla.quaternion.copy(baseHueso(S, E, polo.clone().sub(S), new THREE.Quaternion()));
  brazo.malla.updateMatrixWorld(true);
  const qA = brazo.malla.quaternion.clone(), dirL = v=> v.clone().applyQuaternion(qA.clone().invert());
  brazo.h0.quaternion.identity(); brazo.h1.position.set(0, BRAZO.a, 0);
  brazo.h1.quaternion.setFromUnitVectors(V3(0, 1, 0), dirL(C.clone().sub(E)).normalize());
  const q1 = qA.clone().multiply(brazo.h1.quaternion);
  brazo.h2.position.set(0, BRAZO.b - PUNO, 0); brazo.h2.quaternion.setFromUnitVectors(V3(0, 1, 0), yM.clone().applyQuaternion(q1.invert()).normalize());
  return E;
}
/* un cuadro del arma: pose del arma (reposo + animación + capas), manos, brazos, dedos */
function vmPoner(poseArma, manoD, manoI, dedosD, dedosI){
  const A = VM.arma; if(!A) return;
  A.g.position.copy(poseArma.pos); A.g.quaternion.copy(poseArma.q); A.g.updateMatrixWorld(true); VM.raiz.updateMatrixWorld(true);
  const pD = V3(), qD = new THREE.Quaternion(), pI = V3(), qI = new THREE.Quaternion();
  if(manoD.libre){ pD.copy(manoD.pos); qD.copy(manoD.q); } else manoEnEnchufe(A, manoD.enchufe || 'agarre', MANO_EN[manoD.def || VM.agarre], pD, qD);
  if(manoI){ if(manoI.libre){ pI.copy(manoI.pos); qI.copy(manoI.q); } else manoEnEnchufe(A, manoI.enchufe || 'apoyo', MANO_EN[manoI.def || VM.apoyo], pI, qI); }
  /* la mano que empuña: se apoya la palma contra el arma, se resuelve el brazo y los dedos se cierran hasta tocar */
  const volA = VM.contacto === false ? [] : (A.vol || []);
  VM.manoD.malla.position.copy(pD); VM.manoD.malla.quaternion.copy(qD);
  VM.movD = (!manoD.libre || manoD.contacto) && volA.length ? apoyarPalma(VM.manoD, volA) : 0;
  vmResolverBrazo(VM.brazoD, HOMBRO.d, HOMBRO.poloD, VM.manoD.malla.position, VM.manoD.malla.quaternion, VM.kD);
  ponerDedos(VM.manoD, dedosD, volA);
  const hayI = !!manoI; VM.manoI.malla.visible = VM.brazoI.malla.visible = hayI;
  if(hayI){ VM.manoI.malla.position.copy(pI); VM.manoI.malla.quaternion.copy(qI);
    /* la de apoyo también choca con la otra mano (en la pistola envuelve sus dedos) */
    const volI = volA.length ? volA.concat(volsDeMano(VM.manoD)) : volA;
    VM.movI = (!manoI.libre || manoI.contacto) && volI.length ? apoyarPalma(VM.manoI, volI) : 0;
    vmResolverBrazo(VM.brazoI, HOMBRO.i, HOMBRO.poloI, VM.manoI.malla.position, VM.manoI.malla.quaternion, VM.kI); ponerDedos(VM.manoI, dedosI, volI); }
}
function vmReposo(){ const r = VM_REPOSO[VM.id] || VM_REPOSO.ak47; return {pos:V3(r.p[0], r.p[1], r.p[2]), q:quatDeGrados(r.r)}; }
</script>
