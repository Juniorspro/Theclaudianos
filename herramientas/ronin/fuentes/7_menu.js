/* ================================================================ los menús: papel, tinta y un sello rojo
   Todo lo que se toca es DOM (se toca con el dedo sin pelearse con el lienzo); lo que se mueve atrás es el lienzo.
   Las animaciones son CSS: los botones entran de a uno con un trazo, las pantallas se cambian con una cortina de
   tinta, las cartas se dan vuelta en 3D y los carteles de etapa barren la pantalla con una pincelada. */
(() => { const st = document.createElement('style'); st.textContent = `
  @keyframes entra { from { opacity:0; transform:translateX(38px) skewX(-8deg); } to { opacity:1; transform:none; } }
  @keyframes sube { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
  @keyframes gira { from { transform:rotateY(180deg) scale(0.8); } to { transform:rotateY(0) scale(1); } }
  @keyframes cae { to { transform:translateY(140%) rotate(14deg); opacity:0; } }
  @keyframes pincel { 0% { clip-path:inset(0 100% 0 0); } 100% { clip-path:inset(0 0 0 0); } }
  @keyframes barre { 0% { transform:translateX(-110%) skewX(-12deg); } 18% { transform:translateX(0) skewX(-12deg); } 82% { transform:translateX(0) skewX(-12deg); } 100% { transform:translateX(115%) skewX(-12deg); } }
  @keyframes late { 0%,100% { transform:scale(1); } 50% { transform:scale(1.06); } }
  @keyframes tinta { from { transform:scale(0); } to { transform:scale(1); } }
  .menu-der { position:absolute; right:4%; top:50%; transform:translateY(-50%); display:flex; flex-direction:column; align-items:flex-end; gap:0.2em; width:40%; }
  .menu-der .btn { width:100%; justify-content:flex-start; animation:entra 0.5s both; }
  .menu-der .btn .k { font-size:1.15em; color:#d8322a; margin-right:0.4em; }
  .oro { position:absolute; left:3%; bottom:4%; font-size:clamp(13px, 4vmin, 20px); font-weight:900; color:#f0d27a; text-shadow:0 2px 6px #000; animation:sube 0.6s 0.4s both; }
  .fila { display:flex; gap:2%; justify-content:center; flex-wrap:nowrap; }
  .carta { perspective:900px; width:30%; max-width:210px; cursor:pointer; }
  .carta .cara { background:linear-gradient(170deg, #efe5cf, #d4c19b); color:#1a1410; border-radius:4px; padding:10% 8% 12%; text-align:center; position:relative;
    box-shadow:0 8px 26px rgba(0,0,0,0.55), inset 0 0 30px rgba(120,80,40,0.35); animation:gira 0.7s both; backface-visibility:hidden; min-height:100%; }
  .carta .cara::before { content:""; position:absolute; inset:5px; border:2px solid rgba(40,26,16,0.55); border-radius:2px; }
  .carta .kj { font-size:clamp(34px, 13vmin, 70px); font-weight:900; color:#b3191b; line-height:1.05; text-shadow:2px 2px 0 rgba(0,0,0,0.12); }
  .carta b { display:block; font-size:clamp(12px, 3.6vmin, 18px); margin:0.35em 0 0.3em; letter-spacing:0.05em; }
  .carta p { font-size:clamp(10px, 2.9vmin, 14px); margin:0; line-height:1.3; opacity:0.85; }
  .carta.fuera { animation:cae 0.5s ease-in forwards; }
  .carta.elegida .cara { animation:late 0.5s; box-shadow:0 0 0 3px #b3191b, 0 10px 36px rgba(0,0,0,0.6); }
  #velo { position:absolute; inset:0; pointer-events:none; display:flex; align-items:center; justify-content:center; flex-direction:column; opacity:0; transition:opacity 0.35s; background:#0b0806; z-index:5; }
  #velo.si { opacity:1; pointer-events:auto; }
  #velo .txt { font-size:clamp(13px, 4vmin, 20px); letter-spacing:0.2em; margin-bottom:1em; color:#e6dcc6; }
  #velo .pb { width:44%; height:6px; background:rgba(255,255,255,0.1); position:relative; overflow:hidden; border-radius:3px; }
  #velo .pb i { position:absolute; left:0; top:0; bottom:0; width:0; background:linear-gradient(90deg, #6a0c0c, #d22a22); transition:width 0.25s; }
  .cartel { position:absolute; left:0; right:0; top:30%; height:34%; pointer-events:none; overflow:hidden; }
  .cartel .banda { position:absolute; left:-5%; right:-5%; top:14%; bottom:14%; background:#0d0907; box-shadow:0 0 40px rgba(0,0,0,0.8); animation:barre 2.3s cubic-bezier(.2,.8,.2,1) both;
    display:flex; align-items:center; justify-content:center; flex-direction:column; }
  .cartel .banda.jefe { background:linear-gradient(90deg, #1a0302, #5a0806 50%, #1a0302); }
  .cartel .g { font-size:clamp(22px, 9vmin, 48px); font-weight:900; letter-spacing:0.18em; color:#f0e6d2; }
  .cartel .p { font-size:clamp(11px, 3.4vmin, 17px); letter-spacing:0.3em; color:#d8322a; margin-top:0.3em; }
  .consejo { position:absolute; left:19%; top:17%; width:62%; box-sizing:border-box; text-align:center; background:rgba(12,8,6,0.82); color:#f2e8d2; border-left:4px solid #b3191b;
    padding:0.6em 1em; font-size:clamp(12px, 3.5vmin, 17px); line-height:1.3; border-radius:2px; animation:sube 0.35s both; pointer-events:none; }
  .pergaminos { display:flex; gap:2.5%; justify-content:center; width:92%; }
  .perg { flex:1; position:relative; border-radius:3px; overflow:hidden; cursor:pointer; background:#0d0907 center/cover no-repeat; min-height:62vmin; box-shadow:0 8px 24px rgba(0,0,0,0.6); animation:sube 0.5s both; }
  .perg::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.05) 30%, rgba(8,4,2,0.88)); }
  .perg .ptxt { position:absolute; left:6%; right:6%; bottom:6%; z-index:1; color:#f0e6d2; }
  .perg .num { font-size:clamp(28px, 11vmin, 60px); font-weight:900; color:#d8322a; line-height:1; }
  .perg .nom { font-size:clamp(13px, 4vmin, 20px); font-weight:900; letter-spacing:0.08em; }
  .perg .det { font-size:clamp(10px, 2.8vmin, 14px); opacity:0.8; margin-top:0.2em; }
  .perg.cerrado { filter:grayscale(1) brightness(0.45); cursor:default; }
  .lista { display:flex; flex-direction:column; gap:0.4em; min-width:min(640px, 80vmax); }
  .item { display:flex; align-items:center; gap:0.8em; padding:0.45em 0.7em; background:rgba(40,26,16,0.07); border-left:4px solid var(--c, #8a8278); animation:entra 0.4s both; }
  .item .dat { flex:1; } .item .dat b { display:block; font-size:clamp(12px, 3.6vmin, 18px); } .item .dat small { font-size:clamp(10px, 2.8vmin, 13px); opacity:0.75; }
  .item .btn { min-width:0; font-size:clamp(11px, 3.2vmin, 15px); padding:0.45em 0.9em; margin:0; }
  .barritas { display:inline-flex; gap:2px; margin-left:0.4em; vertical-align:middle; } .barritas i { width:8px; height:10px; background:rgba(0,0,0,0.15); } .barritas i.si { background:#b3191b; }
`; document.head.appendChild(st); })();

const UI = {};
const uiRaiz = $('ui');
function capa(html, cls){ uiRaiz.querySelectorAll('.capa').forEach(n => n.remove()); const d = document.createElement('div'); d.className = 'capa ' + (cls || ''); d.innerHTML = html; uiRaiz.appendChild(d); return d; }
function tocar(el, f){ if(!el) return; let listo = true; const h = e => { e.preventDefault(); e.stopPropagation(); if(!listo) return; listo = false; setTimeout(() => listo = true, 250); SON.arrancar(); try { f(e); } catch(er){ anotarError(er); } };
  el.addEventListener('touchend', h, {passive:false}); el.addEventListener('click', h); }
function btn(txt, id, cls, k){ return `<button class="btn ${cls || ''}" id="${id}">${k ? `<span class="k kanji">${k}</span>` : ''}<span>${txt}</span></button>`; }
UI.cerrar = () => { uiRaiz.querySelectorAll('.capa').forEach(n => n.remove()); };
/* la cortina de tinta entre pantallas y la barra de carga */
(() => { const v = document.createElement('div'); v.id = 'velo'; v.innerHTML = '<div class="txt"></div><div class="pb"><i></i></div>'; stage.appendChild(v); })();
UI.velo = (si, txt) => { const v = $('velo'); v.classList.toggle('si', !!si); if(txt) v.querySelector('.txt').textContent = txt; if(si) v.querySelector('.pb i').style.width = '0'; };
UI.progreso = k => { $('velo').querySelector('.pb i').style.width = Math.round(k*100) + '%'; };
async function cortina(f){ UI.velo(true, ''); $('velo').querySelector('.pb').style.visibility = 'hidden'; SON.fx('pincel', {vol:0.6}); await esperar(330); try { f(); } catch(e){ anotarError(e); } await esperar(60); UI.velo(false); $('velo').querySelector('.pb').style.visibility = ''; }

/* ---------------------------------------------------------------- el idioma, la primera vez */
UI.idioma = () => { JUEGO.modo = 'menu';
  const d = capa(`<div class="panel" style="text-align:center"><p class="titulo-p">IDIOMA · LANGUAGE · IDIOMA</p><div>${btn('ESPAÑOL', 'l_es', IDIOMA === 'es' ? 'rojo' : '')}${btn('ENGLISH', 'l_en', IDIOMA === 'en' ? 'rojo' : '')}${btn('PORTUGUÊS', 'l_pt', IDIOMA === 'pt' ? 'rojo' : '')}</div></div>`);
  for(const l of ['es', 'en', 'pt']) tocar(d.querySelector('#l_' + l), () => { ponerIdioma(l); AJ.vistoIdioma = true; guardarAj(); SON.fx('menu_ok'); cortina(() => UI.titulo()); }); };

/* ---------------------------------------------------------------- el título */
const TITULO = {t0:0};
UI.titulo = () => {
  JUEGO.modo = 'menu'; JUEGO.pausa = false; TITULO.t0 = RELOJ.real; LUGAR = 'bambu'; CLIMA.length = 0; SON.musica('menu'); SON.ambiente('bambu'); SON.fx('titulo');
  const hayCap = CAPITULOS.length, y = PROG.cap_hecho || {};
  const d = capa(`<div class="menu-der">
    ${btn(tr('HISTORIA'), 'm_hist', '', '道')}${btn(tr('BATALLAS DE YOKAI'), 'm_yok', y[1] ? '' : 'claro', '妖')}${btn(tr('HERRERÍA'), 'm_her', '', '刀')}${btn(tr('DOJO'), 'm_doj', '', '道場')}${btn(tr('OPCIONES'), 'm_opc', '', '設')}${btn(tr('CÓMO SE JUEGA'), 'm_como', 'claro', '?')}
  </div><div class="oro">${miles(PROG.oro)} ${tr('ryo')}</div>`);
  d.querySelectorAll('.menu-der .btn').forEach((b, i) => b.style.animationDelay = (1.1 + i*0.08) + 's');
  tocar(d.querySelector('#m_hist'), () => { SON.fx('menu_ok'); cortina(() => UI.capitulos()); });
  tocar(d.querySelector('#m_yok'), () => { SON.fx('menu_ok'); cortina(() => UI.yokai()); });
  tocar(d.querySelector('#m_her'), () => { SON.fx('menu_ok'); cortina(() => UI.herreria()); });
  tocar(d.querySelector('#m_doj'), () => { SON.fx('menu_ok'); cortina(() => UI.dojo()); });
  tocar(d.querySelector('#m_opc'), () => { SON.fx('menu_ok'); UI.opciones(); });
  tocar(d.querySelector('#m_como'), () => { SON.fx('menu_ok'); UI.como(); });
};
/* el título pintado a pincel, dibujado en el lienzo detrás de los botones */
let _tituloCv = null;
function dibujarTitulo(dt){
  const W = MED.w, H = MED.h, u = MED.u, t = RELOJ.real - TITULO.t0; g.setTransform(MED.dpr, 0, 0, MED.dpr, 0, 0);
  dibujarFondo(W, H, 180 + Math.sin(RELOJ.real*0.08)*120); climaPaso(dt, W, H); climaDibujar(W, H);
  g.fillStyle = 'rgba(10,6,4,0.28)'; g.fillRect(0, 0, W, H);
  /* el ronin respira a la izquierda */
  const P = PJ.heroe; if(P && P.anims.quieto){ const e = TITULO.e || (TITULO.e = luchador('heroe', 0, 1)); e.animT = RELOJ.real; e.anim = 'quieto'; e.fpsAnim = 8;
    const x = W*0.2/u + 0; e.x = x; dibujarLuchador(e, 0); }
  /* el título: se revela de izquierda a derecha con un borde de pincel, y gotea */
  if(!_tituloCv){ _tituloCv = document.createElement('canvas'); }
  const tw = Math.round(W*0.5), th = Math.round(H*0.34), c = _tituloCv; if(c.width !== tw*2 || c.height !== th*2){ c.width = tw*2; c.height = th*2;
    const x = c.getContext('2d'); x.scale(2, 2); x.textBaseline = 'middle';
    x.font = `900 ${th*0.2}px Georgia, serif`; x.fillStyle = '#e8dcc2'; x.textAlign = 'left'; x.fillText(tr('EL ÚLTIMO'), th*0.06, th*0.2);
    x.font = `900 ${th*0.52}px Georgia, serif`; x.lineWidth = th*0.03; x.strokeStyle = '#0b0806'; x.strokeText('RŌNIN', 0, th*0.62); x.fillStyle = '#f2e8d4'; x.fillText('RŌNIN', 0, th*0.62);
    x.fillStyle = '#b3191b'; x.fillRect(th*0.04, th*0.92, tw*0.66, th*0.035); }
  const k = lim((t - 0.2)/1.1, 0, 1), rx = W*0.06 + 0, ry = H*0.1;
  g.save(); g.beginPath(); const bordeX = tw*suave(k); g.moveTo(rx, ry); g.lineTo(rx + bordeX, ry);
  for(let i = 0; i <= 12; i++){ const yy = ry + th*i/12; g.lineTo(rx + bordeX + Math.sin(i*1.7 + t*3)*8*u*(1 - k), yy); } g.lineTo(rx, ry + th); g.closePath(); g.clip();
  g.drawImage(c, rx, ry, tw, th); g.restore();
  /* el sello rojo con 浪人 */
  const ks = lim((t - 1.2)/0.35, 0, 1); if(ks > 0){ const s = 1 + (1 - ks)*1.6; g.save(); g.translate(rx + tw*0.78, ry + th*0.28); g.scale(s, s); g.rotate(-0.08); g.globalAlpha = ks;
    g.fillStyle = '#b3191b'; g.fillRect(-26*u, -38*u, 52*u, 76*u); g.fillStyle = '#f4ead6'; g.font = `900 ${30*u}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('浪', 0, -16*u); g.fillText('人', 0, 18*u); g.restore(); }
  g.fillStyle = 'rgba(240,230,210,0.55)'; g.font = `700 ${11*u}px Georgia, serif`; g.textAlign = 'left'; g.globalAlpha = lim((t - 1.6)/0.6, 0, 1);
  g.fillText(tr('Desviá. Esperá. Cortá.'), rx + 4*u, ry + th + 14*u); g.globalAlpha = 1;
}

/* ---------------------------------------------------------------- capítulos */
UI.capitulos = () => {
  const html = CAPITULOS.map((C, i) => { const abierto = C.id <= PROG.capitulo, m = PROG.mejor[C.id] || 0, im = FONDOS[LUGARES[C.lugares[C.lugares.length - 1]].fondo];
    return `<div class="perg ${abierto ? '' : 'cerrado'}" id="c_${C.id}" style="animation-delay:${i*0.08}s;${im ? `background-image:url(${im.src})` : ''}"><div class="ptxt"><div class="num">${['一', '二', '三'][i]}</div>
      <div class="nom">${tr(C.nombre)}</div><div class="det">${abierto ? (m >= 10 ? tr('Completado') : tr('Mejor: etapa {0}/10', m)) : tr('Terminá el capítulo anterior')}</div></div></div>`; }).join('');
  const d = capa(`<div style="display:flex;flex-direction:column;align-items:center;width:100%"><p class="titulo-p" style="color:#f0e6d2;text-shadow:0 2px 8px #000">${tr('HISTORIA')}</p><div class="pergaminos">${html}</div>
    <div style="margin-top:2%">${btn(tr('VOLVER'), 'volver', 'claro')}</div></div>`);
  d.querySelector('#volver').style.color = '#f0e6d2'; d.querySelector('#volver').style.borderColor = '#f0e6d2';
  for(const C of CAPITULOS) if(C.id <= PROG.capitulo) tocar(d.querySelector('#c_' + C.id), () => { SON.fx('menu_ok'); empezarCapitulo(C.id); });
  tocar(d.querySelector('#volver'), () => { SON.fx('menu_atras'); cortina(() => UI.titulo()); });
};
UI.yokai = () => {
  const h = PROG.cap_hecho || {};
  const html = YOKAI.map((Y, i) => { const abierto = !!h[Y.abre], im = FONDOS.f_yokai;
    return `<div class="perg ${abierto ? '' : 'cerrado'}" id="y_${Y.id}" style="animation-delay:${i*0.08}s;${im ? `background-image:url(${im.src})` : ''}"><div class="ptxt"><div class="num">妖</div>
      <div class="nom">${tr(Y.nombre)}</div><div class="det">${abierto ? tr(Y.txt) + ' · ' + tr('Premio: {0} ryo', miles(Y.premio)) : tr('Se abre al terminar el capítulo {0}', Y.abre)}</div></div></div>`; }).join('');
  const d = capa(`<div style="display:flex;flex-direction:column;align-items:center;width:100%"><p class="titulo-p" style="color:#9fe3ff;text-shadow:0 2px 8px #000">${tr('BATALLAS DE YOKAI')}</p><div class="pergaminos" style="width:70%">${html}</div>
    <div style="margin-top:2%">${btn(tr('VOLVER'), 'volver', 'claro')}</div></div>`);
  d.querySelector('#volver').style.color = '#f0e6d2'; d.querySelector('#volver').style.borderColor = '#f0e6d2';
  for(const Y of YOKAI) if(h[Y.abre]) tocar(d.querySelector('#y_' + Y.id), () => { SON.fx('menu_ok'); empezarYokai(Y.id); });
  tocar(d.querySelector('#volver'), () => { SON.fx('menu_atras'); cortina(() => UI.titulo()); });
};
/* ---------------------------------------------------------------- herrería y dojo */
UI.herreria = () => {
  const filas = Object.keys(ESPADAS).map((id, i) => { const E = ESPADAS[id], nv = PROG.espadas[id] || 0, [rn, rc] = RANGOS[E.rango], puesta = PROG.espada === id, H = HABILIDADES[E.hab];
    const accion = !nv ? btn(tr('COMPRAR {0}', miles(E.precio)), 'a_' + id, PROG.oro >= E.precio ? 'rojo' : '') : puesta ? btn(tr('EN LA MANO'), 'a_' + id, 'claro') : btn(tr('USAR'), 'a_' + id);
    const mej = nv && nv < 10 ? btn(tr('MEJORAR {0}', miles(precioMejora(id))), 'm_' + id, PROG.oro >= precioMejora(id) ? '' : 'claro') : '';
    return `<div class="item" style="--c:${rc};animation-delay:${i*0.05}s"><span class="kanji" style="font-size:1.8em;color:${rc}">${H.kanji}</span><div class="dat"><b>${tr(E.nombre)} <small style="color:${rc}">${tr(rn)}</small>${nv ? ' · ' + tr('nivel {0}', nv) : ''}</b>
      <small>${tr('Daño {0}', Math.round(E.dano*(1 + (Math.max(1, nv) - 1)*0.12)))} · ${tr(H.nombre)}: ${tr(H.txt)}</small></div>${mej}${accion}</div>`; }).join('');
  const d = capa(`<div class="panel"><p class="titulo-p"><span class="kanji" style="color:#b3191b">刀</span> ${tr('HERRERÍA')} <small style="font-size:0.5em;float:right">${miles(PROG.oro)} ${tr('ryo')}</small></p><div class="lista">${filas}</div><div style="text-align:right;margin-top:0.6em">${btn(tr('VOLVER'), 'volver', 'claro')}</div></div>`);
  for(const id in ESPADAS){ tocar(d.querySelector('#a_' + id), () => { if(comprarEspada(id)) UI.herreria(); }); const m = d.querySelector('#m_' + id); if(m) tocar(m, () => { if(mejorarEspada(id)) UI.herreria(); }); }
  tocar(d.querySelector('#volver'), () => { SON.fx('menu_atras'); cortina(() => UI.titulo()); });
};
const DOJO = [['vida', '命', 'Vida', '+30 de vida máxima por nivel.'], ['filo', '刃', 'Filo', '+7% de daño por nivel.'], ['postura', '根', 'Equilibrio', '+12 de equilibrio por nivel.'], ['ki', '気', 'Ki', 'La habilidad carga un 8% más rápido por nivel.']];
UI.dojo = () => {
  const filas = DOJO.map(([k, kj, n, txt], i) => { const nv = PROG.dojo[k] || 0, p = precioDojo(k);
    return `<div class="item" style="animation-delay:${i*0.05}s"><span class="kanji" style="font-size:1.8em;color:#b3191b">${kj}</span><div class="dat"><b>${tr(n)}<span class="barritas">${Array.from({length:10}, (_, j) => `<i class="${j < nv ? 'si' : ''}"></i>`).join('')}</span></b><small>${tr(txt)}</small></div>
      ${nv < 10 ? btn(tr('ENTRENAR {0}', miles(p)), 'd_' + k, PROG.oro >= p ? 'rojo' : 'claro') : btn(tr('AL MÁXIMO'), 'd_' + k, 'claro')}</div>`; }).join('');
  const d = capa(`<div class="panel"><p class="titulo-p"><span class="kanji" style="color:#b3191b">道場</span> ${tr('DOJO')} <small style="font-size:0.5em;float:right">${miles(PROG.oro)} ${tr('ryo')}</small></p><div class="lista">${filas}</div><div style="text-align:right;margin-top:0.6em">${btn(tr('VOLVER'), 'volver', 'claro')}</div></div>`);
  for(const [k] of DOJO) tocar(d.querySelector('#d_' + k), () => { if(entrenar(k)) UI.dojo(); });
  tocar(d.querySelector('#volver'), () => { SON.fx('menu_atras'); cortina(() => UI.titulo()); });
};
/* ---------------------------------------------------------------- opciones, cómo se juega y pausa */
UI.opciones = (desdePausa) => {
  const t = (k, a) => btn((AJ[k] ? '■ ' : '□ ') + tr(a), 'o_' + k, AJ[k] ? '' : 'claro');
  const d = capa(`<div class="panel" style="text-align:center"><p class="titulo-p">${tr('OPCIONES')}</p>
    <div>${btn('ESPAÑOL', 'l_es', IDIOMA === 'es' ? 'rojo' : 'claro')}${btn('ENGLISH', 'l_en', IDIOMA === 'en' ? 'rojo' : 'claro')}${btn('PORTUGUÊS', 'l_pt', IDIOMA === 'pt' ? 'rojo' : 'claro')}</div>
    <div>${btn(tr('MÚSICA {0}%', Math.round(AJ.musica*100)), 'o_mus')}${btn(tr('EFECTOS {0}%', Math.round(AJ.efectos*100)), 'o_efe')}</div>
    <div>${t('vibrar', 'VIBRACIÓN')}${t('sacudida', 'SACUDIDA DE CÁMARA')}${t('sangre', 'SANGRE')}</div>
    <div>${btn(tr('VOLVER'), 'volver', 'claro')}</div></div>`);
  for(const l of ['es', 'en', 'pt']) tocar(d.querySelector('#l_' + l), () => { ponerIdioma(l); _tituloCv = null; SON.fx('menu_ok'); UI.opciones(desdePausa); });
  tocar(d.querySelector('#o_mus'), () => { AJ.musica = AJ.musica >= 1 ? 0 : Math.round((AJ.musica + 0.25)*100)/100; guardarAj(); SON.volumen(AJ.musica, AJ.efectos); UI.opciones(desdePausa); });
  tocar(d.querySelector('#o_efe'), () => { AJ.efectos = AJ.efectos >= 1 ? 0 : Math.round((AJ.efectos + 0.25)*100)/100; guardarAj(); SON.volumen(AJ.musica, AJ.efectos); SON.fx('choque'); UI.opciones(desdePausa); });
  for(const k of ['vibrar', 'sacudida', 'sangre']) tocar(d.querySelector('#o_' + k), () => { AJ[k] = !AJ[k]; guardarAj(); SON.fx('menu_mover'); UI.opciones(desdePausa); });
  tocar(d.querySelector('#volver'), () => { SON.fx('menu_atras'); if(desdePausa) UI.pausa(); else UI.titulo(); });
};
UI.como = () => {
  const d = capa(`<div class="panel" style="max-width:80%"><p class="titulo-p">${tr('CÓMO SE JUEGA')}</p><div class="sub" style="font-size:clamp(11px,3.1vmin,15px)">
    <p>◀ ▶ ${tr('para moverte.')} <b>${tr('ATACAR')}</b> ${tr('corta; tres toques seguidos hacen un combo.')}</p>
    <p><b style="color:#b3191b">${tr('Destello blanco')}</b>: ${tr('tocá GUARDIA justo antes del golpe y lo DESVIÁS: el enemigo pierde equilibrio. Si ya la tenías apretada, sólo bloqueás y perdés equilibrio vos.')}</p>
    <p><b style="color:#b3191b">殺</b>: ${tr('un golpe imparable. No se bloquea: esquivalo o tocá ATACAR justo antes del impacto para el CONTRAGOLPE RELÁMPAGO.')}</p>
    <p><b style="color:#c9a024">${tr('Equilibrio')}</b>: ${tr('la barra amarilla. Si se vacía, quedás aturdido. Al enemigo le pasa lo mismo, y aturdido recibe casi el doble.')}</p>
    <p><b>${tr('HABILIDAD')}</b>: ${tr('se carga golpeando y desviando. Cada espada trae la suya.')}</p></div><div style="text-align:right">${btn(tr('VOLVER'), 'volver', 'claro')}</div></div>`);
  tocar(d.querySelector('#volver'), () => { SON.fx('menu_atras'); UI.titulo(); });
};
UI.pausa = () => {
  const d = capa(`<div class="panel" style="text-align:center;min-width:46%"><p class="titulo-p">${tr('PAUSA')}</p>
    <div>${btn(tr('SEGUIR'), 'p_seg', 'rojo')}</div><div>${btn(tr('OPCIONES'), 'p_opc', 'claro')}</div><div>${btn(tr('ABANDONAR'), 'p_sal', 'claro')}</div></div>`);
  tocar(d.querySelector('#p_seg'), () => pausar());
  tocar(d.querySelector('#p_opc'), () => UI.opciones(true));
  tocar(d.querySelector('#p_sal'), () => { JUEGO.pausa = false; SON.musica('menu'); cortina(() => UI.titulo()); });
};
/* ---------------------------------------------------------------- lo de la pelea */
UI.cartelEtapa = (etiqueta, T) => {
  const d = document.createElement('div'); d.className = 'cartel'; const jefe = T.jefe;
  d.innerHTML = `<div class="banda ${jefe ? 'jefe' : ''}"><div class="g">${jefe ? (T.yokai ? '妖 · ' : '決戦 · ') + tr(T.nombre).toUpperCase() : etiqueta.split('·')[1] || etiqueta}</div><div class="p">${jefe ? etiqueta : tr(T.nombre)}</div></div>`;
  uiRaiz.appendChild(d); setTimeout(() => d.remove(), 2400);
};
UI.consejo = txt => { uiRaiz.querySelectorAll('.consejo').forEach(n => n.remove()); const d = document.createElement('div'); d.className = 'consejo'; d.textContent = txt; uiRaiz.appendChild(d); setTimeout(() => d.remove(), 3800); };
UI.bendicion = (oro, cs) => {
  JUEGO.modo = 'bendicion'; SON.fx('moneda');
  const html = cs.map((b, i) => `<div class="carta" id="b_${b.id}" style="animation-delay:${i*0.12}s"><div class="cara" style="animation-delay:${0.25 + i*0.14}s"><div class="kj">${b.kanji}</div><b>${tr(b.nombre)}</b><p>${tr(b.txt)}</p></div></div>`).join('');
  const d = capa(`<div style="width:94%;text-align:center"><p class="titulo-p" style="color:#f0e6d2;text-shadow:0 2px 8px #000">${tr('Etapa {0} superada', JUEGO.etapa)} · <span style="color:#f0d27a">+${miles(oro)} ${tr('ryo')}</span></p>
    <p class="sub" style="color:#e6dcc6">${tr('Elegí una bendición')}</p><div class="fila">${html}</div></div>`);
  cs.forEach((b, i) => setTimeout(() => SON.fx('carta', {tono:1 + i*0.08}), 250 + i*140));
  for(const b of cs) tocar(d.querySelector('#b_' + b.id), () => { d.querySelectorAll('.carta').forEach(c => c.classList.add(c.id === 'b_' + b.id ? 'elegida' : 'fuera')); setTimeout(() => tomarBendicion(b.id), 650); });
};
UI.resultado = (tipo, oro) => {
  JUEGO.modo = 'resultado'; const S = LUCHA.stats;
  const titulo = tipo === 'capitulo' ? tr('¡CAPÍTULO COMPLETADO!') : tr('¡YOKAI DERROTADO!');
  const d = capa(`<div class="panel" style="text-align:center;min-width:52%"><p class="titulo-p"><span class="sello">勝</span> ${titulo}</p>
    <p class="sub">${tr('Oro ganado')}: <b>${miles(JUEGO.oroRun)} ${tr('ryo')}</b><br>${tr('Desvíos')}: ${S.desvios} · ${tr('Contragolpes')}: ${S.relampagos} · ${tr('Golpes')}: ${S.golpes}</p>
    <div>${btn(tr('CONTINUAR'), 'r_ok', 'rojo')}</div></div>`);
  tocar(d.querySelector('#r_ok'), () => cortina(() => UI.titulo()));
};
UI.derrota = () => {
  JUEGO.modo = 'derrota';
  const d = capa(`<div class="panel" style="text-align:center;min-width:52%;background:linear-gradient(180deg,#2a0806,#120302);color:#f0e0d0"><p class="titulo-p" style="color:#ff4a3a">死 · ${tr('HAS CAÍDO')}</p>
    <p class="sub">${JUEGO.cap ? tr('Llegaste a la etapa {0}/10.', JUEGO.etapa + 1) + ' ' : ''}${tr('El oro ganado queda: {0} ryo.', miles(JUEGO.oroRun))}<br>${tr(elegir(['Cuando brille en blanco, apretá GUARDIA justo antes: no la dejes apretada.', 'El 殺 rojo no se bloquea: esquivá o atacá justo antes del golpe.', 'Si te quedás sin equilibrio, alejate y dejalo volver.', 'En la herrería y el dojo el oro se vuelve fuerza.']))}</p>
    <div>${btn(tr('REINTENTAR'), 'd_re', 'rojo')}${btn(tr('MENÚ'), 'd_me', 'claro')}</div></div>`);
  d.querySelector('#d_me').style.color = '#f0e0d0'; d.querySelector('#d_me').style.borderColor = '#f0e0d0';
  tocar(d.querySelector('#d_re'), () => { if(JUEGO.yokai) empezarYokai(JUEGO.yokai.id); else empezarCapitulo(JUEGO.cap.id); });
  tocar(d.querySelector('#d_me'), () => { SON.musica('menu'); cortina(() => UI.titulo()); });
};
