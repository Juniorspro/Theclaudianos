/* ================================================================ menús (DOM, adentro del escenario) */
const MENU = {p:'', t:0, volver:null};
function bandera(l){ const [c, g] = lienzo(30, 20);
  if(l === 'es'){ g.fillStyle = '#74acdf'; g.fillRect(0, 0, 30, 20); g.fillStyle = '#fff'; g.fillRect(0, 7, 30, 6); g.fillStyle = '#f6b40e'; g.beginPath(); g.arc(15, 10, 2.4, 0, 7); g.fill(); }
  if(l === 'en'){ g.fillStyle = '#012169'; g.fillRect(0, 0, 30, 20); g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(30, 20); g.moveTo(30, 0); g.lineTo(0, 20); g.stroke(); g.strokeStyle = '#c8102e'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#fff'; g.fillRect(12, 0, 6, 20); g.fillRect(0, 7, 30, 6); g.fillStyle = '#c8102e'; g.fillRect(13.5, 0, 3, 20); g.fillRect(0, 8.5, 30, 3); }
  if(l === 'pt'){ g.fillStyle = '#009c3b'; g.fillRect(0, 0, 30, 20); g.fillStyle = '#ffdf00'; g.beginPath(); g.moveTo(15, 2); g.lineTo(28, 10); g.lineTo(15, 18); g.lineTo(2, 10); g.fill(); g.fillStyle = '#002776'; g.beginPath(); g.arc(15, 10, 4.3, 0, 7); g.fill(); }
  return c.toDataURL(); }
function pantalla(html, fondo){ const m = $('menu'); m.className = fondo === false ? '' : 'fondo'; m.innerHTML = html; m.classList.remove('oculto'); }
function boton(id, txt, fn, extra){ setTimeout(() => { const b = $(id); if(b) tocar(b, () => { SON.arrancar(); SON.fx('boton'); fn(); }); }, 0); return '<button class="boton ' + (extra || '') + '" id="' + id + '">' + txt + '</button>'; }
function cerrarMenu(){ const m = $('menu'); m.innerHTML = ''; m.classList.add('oculto'); MENU.p = ''; }

function menuIdioma(){ MENU.p = 'idioma'; J.modo = 'menu';
  pantalla('<div class="panel"><div class="titulo txt" style="font-size:clamp(20px,6vmin,40px)">IDIOMA · LANGUAGE · IDIOMA</div>' +
    ['es', 'en', 'pt'].map(l => boton('id_' + l, '<img class="bandera" src="' + bandera(l) + '">' + {es:'ESPAÑOL', en:'ENGLISH', pt:'PORTUGUÊS'}[l], () => { ponerIdioma(l); AJ.vistoIdioma = true; guardarAj(); menuTitulo(); }, l === IDIOMA ? 'sel' : '')).join('') + '</div>'); }
function menuTitulo(){ MENU.p = 'titulo'; J.modo = 'menu'; UI.hud(false); ENT.activo = false;
  const g = PROG.ganadas, noches = Object.values(g).reduce((a, b) => a + b, 0);
  pantalla('<div id="menuTitulo"><div class="titulo txt">' + tr('NO LO DEJES') + '<br><em>' + tr('ENTRAR') + '</em></div><div class="sub txt">' + tr('Una noche. Una casa. Algo afuera.') + '</div>' +
    (noches ? '<div class="nota txt">' + tr('Noches sobrevividas: {0}', noches) + '</div>' : '') + '</div>' +
    '<div id="menuBotones">' + boton('m_jugar', tr('JUGAR'), menuDificultad, 'rojo') + boton('m_como', tr('CÓMO SE JUEGA'), menuComo) + boton('m_op', tr('OPCIONES'), () => menuOpciones(menuTitulo)) +
    boton('m_idioma', '<img class="bandera" src="' + bandera(IDIOMA) + '">' + tr('IDIOMA'), menuIdioma) + '<div class="nota txt">' + tr('Con auriculares da más miedo.') + '</div></div>', false);
  SON.musica('menu'); }
function menuDificultad(){ MENU.p = 'dif';
  const d = (k, t, s) => boton('d_' + k, t + '<div class="nota" style="opacity:0.8;font-weight:600">' + s + '</div>', () => { cerrarMenu(); nuevaPartida(k); }, k === AJ.dificultad ? 'sel' : '');
  pantalla('<div class="panel" style="max-width:70%"><div class="titulo txt" style="font-size:clamp(20px,6vmin,38px)">' + tr('DIFICULTAD') + '</div>' +
    d('facil', tr('FÁCIL'), tr('Más tablas, más tiempo, el bicho tarda más.')) + d('normal', tr('NORMAL'), tr('Como en el original.')) + d('pesadilla', tr('PESADILLA'), tr('Menos tablas, más hambre, sin reintentos.')) +
    boton('d_volver', tr('VOLVER'), menuTitulo) + '</div>'); }
function menuComo(){ MENU.p = 'como';
  const t = (titulo, txt) => '<div class="tarjeta" style="margin:0.7em 0"><div class="txt" style="font-size:1.6em;min-width:1.4em">' + titulo + '</div><div class="txt" style="font-weight:600">' + txt + '</div></div>';
  pantalla('<div class="panel" style="max-width:82%;text-align:left"><div class="titulo txt" style="font-size:clamp(18px,5.5vmin,34px);text-align:center">' + tr('TRANSMISIÓN DE EMERGENCIA') + '</div>' +
    t('1', tr('PREPARATE (hasta las 12): buscá la linterna, agarrá las tablas de arriba y clavalas en las ventanas, instalá las cámaras de afuera y llená el generador en el galpón del fondo.')) +
    t('2', tr('SOBREVIVÍ (de 12 a 6): cuando escuches que respira del otro lado de una ventana, corré a ese cuarto y prendé la luz. No prendas todas a la vez: saltan los fusibles.')) +
    t('3', tr('Si entra, escondete en un placard y aguantá la puerta con ◀ ▶. El generador te da aire: si se apaga, te asfixiás.')) +
    t('✋', tr('Izquierda: caminar. Derecha: mirar. La mano sirve para todo; mantenela apretada para clavar o cargar nafta.')) +
    boton('c_volver', tr('VOLVER'), menuTitulo) + '</div>'); }
function menuOpciones(volver){ MENU.p = 'op'; MENU.volver = volver;
  const op = (et, id, vals, act, fn) => '<div class="op txt"><span>' + et + '</span><div class="fila">' + vals.map(([v, t]) => boton(id + '_' + v, t, () => { fn(v); menuOpciones(volver); }, v === act ? 'sel' : '')).join('') + '</div></div>';
  pantalla('<div class="panel" style="min-width:62%"><div class="titulo txt" style="font-size:clamp(18px,5.5vmin,34px)">' + tr('OPCIONES') + '</div>' +
    op(tr('IDIOMA'), 'o_id', [['es', 'ES'], ['en', 'EN'], ['pt', 'PT']], IDIOMA, v => ponerIdioma(v)) +
    op(tr('CALIDAD'), 'o_cal', [['baja', tr('BAJA')], ['media', tr('MEDIA')], ['alta', tr('ALTA')]], AJ.calidad, v => { AJ.calidad = v; guardarAj(); aplicarCalidad(); }) +
    op(tr('SENSIBILIDAD'), 'o_sen', [['0.6', '1'], ['0.85', '2'], ['1', '3'], ['1.3', '4'], ['1.7', '5']], String(AJ.sens), v => { AJ.sens = +v; guardarAj(); }) +
    op(tr('BRILLO'), 'o_bri', [['0.8', '1'], ['1', '2'], ['1.2', '3'], ['1.45', '4']], String(AJ.brillo), v => { AJ.brillo = +v; guardarAj(); }) +
    op(tr('MÚSICA'), 'o_mus', [['0', tr('NO')], ['0.5', '½'], ['0.8', tr('SÍ')]], String(AJ.musica), v => { AJ.musica = +v; guardarAj(); SON.volumen(AJ.musica, AJ.efectos); }) +
    op(tr('SONIDO'), 'o_ef', [['0.5', '½'], ['1', tr('SÍ')]], String(AJ.efectos), v => { AJ.efectos = +v; guardarAj(); SON.volumen(AJ.musica, AJ.efectos); }) +
    op(tr('SUBTÍTULOS'), 'o_sub', [['1', tr('SÍ')], ['0', tr('NO')]], AJ.subs ? '1' : '0', v => { AJ.subs = v === '1'; guardarAj(); }) +
    op(tr('VIBRACIÓN'), 'o_vib', [['1', tr('SÍ')], ['0', tr('NO')]], AJ.vibrar ? '1' : '0', v => { AJ.vibrar = v === '1'; guardarAj(); }) +
    boton('o_volver', tr('VOLVER'), () => volver()) + '</div>'); }
function pausar(on){ if(J.modo !== 'juego') return; J.pausa = on; SON.pausa(on); soltarTodo();
  if(on){ if(document.pointerLockElement) document.exitPointerLock(); MENU.p = 'pausa';
    pantalla('<div class="panel"><div class="titulo txt" style="font-size:clamp(22px,7vmin,44px)">' + tr('PAUSA') + '</div><div class="sub txt">' + hora12(J.hora) + ' · ' + tr(J.obj) + '</div>' +
      boton('pa_seguir', tr('SEGUIR'), () => { cerrarMenu(); pausar(false); }, 'rojo') + boton('pa_op', tr('OPCIONES'), () => menuOpciones(() => pausar(true))) +
      boton('pa_salir', tr('SALIR AL MENÚ'), () => { J.pausa = false; SON.pausa(false); salirAlMenu(); }) + '</div>'); }
  else cerrarMenu(); }
function salirAlMenu(){ J.modo = 'menu'; ENT.activo = false; UI.cerrarTodo(); UI.hud(false); SON.amortiguar(0); SON.corazon(0); SON.bucleParar('m_resp'); SON.callarVoz(); MON.activo = false; menuTitulo(); }
const CAUSAS = {monstruo:'TE ENCONTRÓ', afuera:'TE AGARRÓ AFUERA', aire:'TE QUEDASTE SIN AIRE', auto:'TE PISÓ UN PATRULLERO', placard:'TE SACÓ DEL PLACARD'};
UI.muerte = causa => { setTimeout(() => { MENU.p = 'muerte';
  const tip = TIPS[causa] || TIPS.luz, puede = J.dif.reintentar && J.retry;
  pantalla('<div class="panel" style="background:rgba(30,0,0,0.85);border-color:#6a0a0a"><div class="grande rojo txt">' + tr('MORISTE') + '</div><div class="sub txt">' + tr(CAUSAS[causa] || 'TE ENCONTRÓ') + ' · ' + hora12(J.hora) + '</div>' +
    '<div class="txt" style="margin:0.6em 0 1em;font-weight:600">' + tr('Consejo:') + ' ' + tr(tip) + '</div>' +
    (puede ? boton('mu_rei', tr('REINTENTAR DESDE LAS 12'), () => { cerrarMenu(); reintentar(); }, 'rojo') : '') + boton('mu_nueva', tr('EMPEZAR DE NUEVO'), () => { cerrarMenu(); nuevaPartida(AJ.dificultad); }) +
    boton('mu_menu', tr('MENÚ'), salirAlMenu) + '</div>'); }, causa === 'aire' || causa === 'auto' ? 900 : 200); };
UI.victoria = () => { MENU.p = 'victoria'; const S = J.stats;
  pantalla('<div class="panel"><div class="grande txt">' + tr('SOBREVIVISTE') + '</div><div class="sub txt">' + tr('Llegaste a las 6 AM.') + ' · ' + tr({facil:'FÁCIL', normal:'NORMAL', pesadilla:'PESADILLA'}[AJ.dificultad]) + '</div>' +
    '<div class="txt" style="text-align:left;margin:0.6em auto 1em;display:inline-block;font-weight:700;line-height:1.5">' + tr('Tablas clavadas: {0}', S.tablas) + '<br>' + tr('Veces que lo echaste: {0}', S.echado) + '<br>' +
    tr('Nafta cargada: {0}%', Math.round(S.nafta)) + '<br>' + tr('Veces que aguantaste en el placard: {0}', S.escondido) + '</div>' +
    boton('vi_otra', tr('JUGAR OTRA VEZ'), () => { cerrarMenu(); menuDificultad(); }, 'rojo') + boton('vi_menu', tr('MENÚ'), salirAlMenu) + '</div>'); };

/* el fondo del menú: la casa de noche desde el jardín, una ventana de arriba prendida y algo parado en el pasto */
function camaraMenu(dt){ MENU.t += dt; const t = MENU.t, c = RND.cam;
  c.position.set(Math.sin(t*0.05)*3 + 3, 1.7 + Math.sin(t*0.13)*0.1, -17 + Math.sin(t*0.07)*0.8); c.rotation.order = 'YXZ'; c.rotation.set(0.12, Math.PI + 0.12 + Math.sin(t*0.05)*0.08, 0);
  for(const L of MUNDO.luces) if(L.id === 'master' || L.id === 'porche') L.on = true; ELEC.hay = true;
  MON.preview = 1; MON.anim = 'mira'; ponerMon(6.4, 0, -8.8); MON.yaw = Math.atan2(c.position.x - MON.x, c.position.z - MON.z); /* parado en la esquina de la casa, mirándote */ MON.fase += dt;
  J.hora = 22.5; }
