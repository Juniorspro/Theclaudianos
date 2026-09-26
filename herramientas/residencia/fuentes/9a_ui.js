/* ================================================================ el HUD y las pantallas de juego (todo en DOM, adentro del escenario girado) */
const UI = {objCambio:true, barraCambio:true, subT:0, avisoT:0, pensT:0, destT:0, ranuras:[], ultReloj:''};
const LISTA = {linterna:['Buscá la linterna', () => JUG.linterna.tiene], tabla:['Tapá una ventana con tablas', () => tablasPuestas() >= 1],
  camara:['Instalá una cámara', () => CAMS.some(c => c.instalada)], generador:['Cargá el generador', () => GEN.nafta >= 60]};
/* los íconos de la barra, dibujados en lienzos chiquitos */
function icono(tipo){ const [c, g] = lienzo(48, 48); g.lineJoin = 'round';
  if(tipo === 'pila'){ g.fillStyle = '#d8b030'; g.fillRect(14, 8, 20, 34); g.fillStyle = '#2a2a2a'; g.fillRect(14, 8, 20, 10); g.fillStyle = '#bbb'; g.fillRect(20, 4, 8, 5); g.fillStyle = '#000'; g.font = 'bold 12px Arial'; g.fillText('+', 20, 33); }
  if(tipo === 'tablas'){ g.fillStyle = '#8c5a30'; g.save(); g.translate(24, 26); g.rotate(-0.5); g.fillRect(-20, -6, 40, 11); g.restore(); g.fillStyle = '#6a3a1c'; g.save(); g.translate(24, 30); g.rotate(0.3); g.fillRect(-20, -5, 40, 9); g.restore();
    g.fillStyle = '#9a9aa0'; g.fillRect(30, 6, 14, 7); g.fillStyle = '#7a4a26'; g.fillRect(35, 12, 4, 20); }
  if(tipo === 'bidon'){ g.fillStyle = '#c8201c'; g.fillRect(10, 14, 26, 28); g.fillRect(16, 8, 14, 8); g.fillStyle = '#e8e8e8'; g.fillRect(33, 6, 5, 12); g.fillStyle = '#8a1010'; g.fillRect(14, 20, 18, 3); g.fillRect(14, 28, 18, 3); }
  if(tipo === 'llave'){ g.strokeStyle = '#b8b8c0'; g.lineWidth = 6; g.beginPath(); g.moveTo(12, 38); g.lineTo(32, 16); g.stroke(); g.lineWidth = 5; g.beginPath(); g.arc(34, 13, 8, 2.4, 5.6); g.stroke(); }
  if(tipo === 'gaseosa'){ g.fillStyle = '#c8281c'; g.fillRect(15, 10, 18, 30); g.fillStyle = '#ddd'; g.fillRect(15, 8, 18, 4); g.fillRect(15, 38, 18, 3); g.fillStyle = '#fff'; g.font = 'bold 9px Arial'; g.fillText('COLA', 15, 28); }
  return c; }
function iniciarUI(){
  const B = $('barra'); B.innerHTML = '';
  for(const [k, tipo] of [['pila', 'pila'], ['tablas', 'tablas'], ['bidon', 'bidon'], ['llave', 'llave'], ['gaseosa', 'gaseosa']]){
    const r = document.createElement('div'); r.className = 'ranura txt'; r.appendChild(icono(tipo)); const n = document.createElement('span'); n.className = 'n'; r.appendChild(n);
    const kk = document.createElement('span'); kk.className = 'k'; kk.textContent = String(UI.ranuras.length + 1); r.appendChild(kk); B.appendChild(r); UI.ranuras.push({k, r, n});
    tocar(r, () => usarRanura(k)); }
  tocar('bAccion', () => { ACC.apretado = true; ACC.flanco = true; }, () => { ACC.apretado = false; });
  tocar('bLinterna', () => alternarLinterna());
  tocar('bCorrer', () => { ENT.correr = true; }, () => { ENT.correr = false; });
  tocar('bPausa', () => pausar(true));
  tocar('camIzq', () => cambiarCamara(-1)); tocar('camDer', () => cambiarCamara(1)); tocar('camCerrar', () => cerrarCamaras());
  tocar('qteIzq', () => empujarQTE(-1)); tocar('qteDer', () => empujarQTE(1)); tocar('salirPlacard', () => salirPlacard());
  /* el panel de fusibles se arma acá */
  const f = document.createElement('div'); f.id = 'fusibles'; f.className = 'oculto'; f.style.cssText = 'position:absolute;inset:0;pointer-events:auto;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center';
  f.innerHTML = '<div class="panel" style="min-width:52%"><b class="txt" id="fusT"></b><div id="cables" style="display:flex;gap:6%;justify-content:center;margin:1em 0;height:34vmin"></div><div class="nota txt" id="fusN"></div><button class="boton" id="fusCerrar"></button></div>';
  stage.appendChild(f);
  const colores = ['#d82020', '#2050d8', '#e8c820', '#28a838'];
  for(let i = 0; i < 4; i++){ const c = document.createElement('button'); c.className = 'cable'; c.style.cssText = 'width:14%;height:100%;border:3px solid #222;border-radius:8px;background:' + colores[i] + ';position:relative;padding:0'; c.innerHTML = '<i style="position:absolute;left:-30%;right:-30%;top:40%;height:20%;display:none"></i>';
    $('cables').appendChild(c); tocar(c, () => tocarCable(i)); }
  tocar('fusCerrar', () => cerrarFusibles());
  ENT.cb.tecla = teclaJuego; ENT.cb.oculto = () => { if(J.modo === 'juego') pausar(true); };
}
function teclaJuego(k){
  if(J.modo !== 'juego') return;
  if(k === 'KeyE' || k === 'Space'){ ACC.flanco = true; ACC.apretado = true; setTimeout(() => { ACC.apretado = ENT.teclas.KeyE || ENT.teclas.Space; }, 1100); }
  if(k === 'KeyF') alternarLinterna(); if(k === 'Escape' || k === 'KeyP') pausar(!J.pausa);
  if(k >= 'Digit1' && k <= 'Digit5') usarRanura(['pila', 'tablas', 'bidon', 'llave', 'gaseosa'][+k.slice(5) - 1]);
  if(CAMV.abierta){ if(k === 'KeyA' || k === 'ArrowLeft') cambiarCamara(-1); if(k === 'KeyD' || k === 'ArrowRight') cambiarCamara(1); if(k === 'KeyX' || k === 'KeyC') cerrarCamaras(); }
  if(QTE.estado === 'activo'){ if(k === 'KeyA' || k === 'ArrowLeft') empujarQTE(-1); if(k === 'KeyD' || k === 'ArrowRight') empujarQTE(1); }
  if(JUG.en === 'placard' && k === 'KeyQ') salirPlacard();
}
addEventListener('keyup', e => { if(e.code === 'KeyE' || e.code === 'Space') ACC.apretado = false; });
function usarRanura(k){
  const L = JUG.linterna;
  if(k === 'pila'){ if(!L.tiene) return pensar(tr('No tengo linterna.')); if(L.repuestos > 0 && L.bat < 95){ L.repuestos--; L.bat = 100; SON.fx('bateria'); UI.barraCambio = true; } else if(!L.repuestos) pensar(tr('No me quedan pilas.')); }
  if(k === 'gaseosa'){ if(JUG.inv.gaseosas > 0){ JUG.inv.gaseosas--; JUG.energia = 100; JUG.gaseosaT = 25; SON.fx('gaseosa'); UI.barraCambio = true; } }
  if(k === 'tablas' && !JUG.inv.tablas) pensar(tr('Las tablas están arriba, en el dormitorio.'), 3);
  if(k === 'bidon' && JUG.inv.bidon < 0) pensar(tr('El bidón está en el galpón, atrás.'), 3);
  if(k === 'llave' && !JUG.inv.llave) pensar(tr('Necesito la llave inglesa. Creo que está en el lavadero.'), 3.5);
}
function alternarLinterna(){ const L = JUG.linterna; if(!L.tiene){ pensar(tr('No tengo linterna.')); return; }
  if(L.bat <= 0){ if(L.repuestos > 0){ L.repuestos--; L.bat = 100; SON.fx('bateria'); } else { pensar(tr('Se quedó sin pilas.')); SON.fx('linterna_off'); return; } }
  L.on = !L.on; SON.fx(L.on ? 'linterna_on' : 'linterna_off'); UI.barraCambio = true; }
function pasoLinterna(dt){ const L = JUG.linterna, R = RND.linterna;
  if(L.on && L.bat > 0){ L.bat = Math.max(0, L.bat - dt*1.05); if(L.bat <= 0){ L.on = false; SON.fx('linterna_off'); pensar(tr('Se quedó sin pilas.'), 2.5); UI.barraCambio = true; } }
  const cerca = MON.activo ? Math.hypot(MON.x - JUG.x, MON.z - JUG.z) : 99, falla = (cerca < 7 && MON.estado !== 'lejos') || (L.bat < 12 && L.bat > 0);
  if(falla && Math.random() < dt*6) L.falla = rv(0.04, 0.16); L.falla = Math.max(0, L.falla - dt);
  R.intensity = L.on && L.bat > 0 && JUG.en === 'libre' ? (L.falla > 0 ? 0.15 : 2.6)*(0.6 + 0.4*lim(L.bat/30, 0, 1)) : 0; $('bLinterna').classList.toggle('on', L.on); }

UI.hud = on => { $('hud').classList.toggle('oculto', !on); };
UI.subtitulo = (txt, dur, tipo) => { if(!AJ.subs) return; $('subs').innerHTML = (tipo === 'radio' ? '<em>' + tr('RADIO') + ':</em> ' : tipo === 'telefono' || tipo === 'susurro' ? '<em>' + tr('TELÉFONO') + ':</em> ' : '') + txt; UI.subT = dur; };
UI.aviso = (txt, t) => { $('aviso').textContent = txt; UI.avisoT = t || 2.5; };
UI.destello = (k, col) => { const d = $('destello'); d.style.background = col || '#8a0000'; d.style.mixBlendMode = col ? 'normal' : 'multiply'; d.style.opacity = k; UI.destT = k; };
UI.camaras = on => { $('camaras').classList.toggle('oculto', !on); $('hud').classList.toggle('oculto', on); $('lienzo').style.filter = on ? 'grayscale(0.85) contrast(1.35) brightness(1.25) sepia(0.25)' : ''; if(!on) GRANO.k = 1; };
UI.placard = on => { $('placard').classList.toggle('oculto', !on); $('salirPlacard').textContent = tr('SALIR'); $('hud').classList.toggle('oculto', on); };
UI.qte = on => { for(const id of ['qte', 'qteIzq', 'qteDer']) $(id).classList.toggle('oculto', !on); $('salirPlacard').classList.toggle('oculto', on); $('qteTip').textContent = tr('Aguantá la puerta: mantené la marca en el centro'); };
UI.fusibles = on => { $('fusibles').classList.toggle('oculto', !on); if(!on) return; $('fusT').textContent = tr('CAJA DE FUSIBLES'); $('fusN').textContent = tr('Tocá con la llave el cable que echa chispas.'); $('fusCerrar').textContent = tr('CERRAR');
  [...document.querySelectorAll('.cable i')].forEach((c, i) => { c.style.display = i === FUS.malo ? 'block' : 'none'; c.style.background = 'radial-gradient(circle, #fff 0, #ffe060 30%, rgba(255,200,0,0) 70%)'; }); };
UI.cerrarTodo = () => { if(CAMV.abierta){ CAMV.abierta = false; UI.camaras(false); } if(FUS.abierta) cerrarFusibles(); $('placard').classList.add('oculto'); for(const id of ['qte', 'qteIzq', 'qteDer']) $(id).classList.add('oculto');
  if(JUG.en !== 'libre' && JUG.en !== 'placard') JUG.en = 'libre'; };

/* cada cuadro */
UI.paso = dt => {
  if(J.modo !== 'juego' && J.modo !== 'susto') return;
  const R = hora12(J.hora); if(R !== UI.ultReloj){ UI.ultReloj = R; $('reloj').textContent = R; }
  if(UI.objCambio || Math.random() < 0.1){ UI.objCambio = false; $('objT').textContent = tr('Objetivo:'); $('objTxt').textContent = tr(J.obj);
    $('lista').innerHTML = J.lista.map(k => '<li class="' + (LISTA[k][1]() ? 'ok' : '') + '">' + tr(LISTA[k][0]) + '</li>').join(''); }
  /* la pila, el aire y la energía */
  const L = JUG.linterna, bars = document.querySelectorAll('#pila i'), n = L.tiene ? Math.ceil(L.bat/25) : 0;
  bars.forEach((b, i) => b.classList.toggle('off', i >= n)); $('pila').classList.toggle('baja', L.tiene && L.bat < 25); $('batN').textContent = '×' + (L.tiene ? L.repuestos + 1 : 0);
  $('o2b').firstChild.style.height = JUG.o2.toFixed(1) + '%'; $('o2b').classList.toggle('baja', JUG.o2 < 35); $('stamb').firstChild.style.height = JUG.energia.toFixed(1) + '%';
  $('avLuz').classList.toggle('oculto', ELEC.hay); $('avGen').classList.toggle('oculto', GEN.nafta > 22 || J.hora < 20); $('avAire').classList.toggle('oculto', JUG.o2 > 50);
  if(UI.barraCambio){ UI.barraCambio = false; const I = JUG.inv;
    for(const s of UI.ranuras){ let v = '', vacia = true;
      if(s.k === 'pila'){ vacia = !L.tiene || !L.repuestos; v = L.repuestos ? '×' + L.repuestos : ''; }
      if(s.k === 'tablas'){ vacia = !I.tablas; v = I.tablas ? '×' + I.tablas : ''; }
      if(s.k === 'bidon'){ vacia = I.bidon < 0; v = I.bidon > 0 ? tr('LLENO') : I.bidon === 0 ? tr('VACÍO') : ''; }
      if(s.k === 'llave'){ vacia = !I.llave; }
      if(s.k === 'gaseosa'){ vacia = !I.gaseosas; v = I.gaseosas ? '×' + I.gaseosas : ''; }
      s.r.classList.toggle('vacia', vacia); s.n.textContent = v; } }
  /* los textos que se van */
  UI.subT -= dt; if(UI.subT <= 0) $('subs').innerHTML = '';
  UI.avisoT -= dt; if(UI.avisoT <= 0) $('aviso').textContent = '';
  const p = J.pensamiento, pe = $('pensado'); if(p){ p.t -= dt; pe.textContent = p.txt; pe.style.opacity = p.t > 0 ? 1 : 0; if(p.t < -1) J.pensamiento = null; }
  if(UI.destT > 0){ UI.destT = Math.max(0, UI.destT - dt*1.4); $('destello').style.opacity = UI.destT; }
  /* las cámaras */
  if(CAMV.abierta){ const c = CAMS[CAMV.i]; $('camNombre').textContent = tr(c.nombre); $('camHora').textContent = hora12(J.hora) + '  ' + String(Math.floor((J.hora % 1)*60)).padStart(2, '0');
    const si = $('camSenal'); si.firstChild.style.width = (CAMV.senal*100).toFixed(0) + '%'; si.classList.toggle('mala', CAMV.senal < 0.5);
    $('camPerdida').classList.toggle('oculto', CAMV.perdida <= 0); $('camPerdida').textContent = tr('SEÑAL PERDIDA'); }
  /* el placard: la marca de la barra */
  if(QTE.estado === 'activo'){ $('qteMarca').style.left = (QTE.pos*100).toFixed(1) + '%'; $('qteBarra').classList.toggle('mal', QTE.fuera > 0.05); const izq = QTE.pos > 0.5; $('qteIzq').classList.toggle('luz', izq); $('qteDer').classList.toggle('luz', !izq); }
};
