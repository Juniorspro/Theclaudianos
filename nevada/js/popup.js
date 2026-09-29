/* =============================================================
   popup.js -> La ventana 'arena' de madness_popup (MadnessPopup,
   t178373): la de TEST RESULTS que sale al terminar una oleada y al
   morir en la Arena, con el nivel, la barra de experiencia y el dinero.

   Como en el SWF, a 30 cuadros por segundo:
   - aparece desde _alpha 20, +20 por cuadro;
   - myTimer arranca en 50 y baja 1 por cuadro; en la Arena no pasa de 2
     (se queda abierta hasta DONE), y en 2 empieza a volcar lo ganado:
     applyXPFromEarned pasa el 10 % de earnedXP y de earnedCash cada
     cuadro (lo ultimo, entero, cuando queda 1 o menos);
   - setArenaStats pinta cada cuadro el nivel, '+ $' y el dinero TOTAL
     del jugador, y xpBar.myBar._xscale = myXP / getLevelUpXP(nivel);
   - DONE (el boton 7778) es pressYes: lo que falte se vuelca de golpe
     (arena_1_reset) y se cierra.
   Las imagenes (fondo con marco, salpicaduras, circuitos y Desert Eagles;
   el relleno de la barra; el boton) son del SWF: js/popup_swf.js. Los
   textos van en HTML con sus fuentes y medidas del SWF (px de la ventana,
   s = 0,679u por px: los 530 px de alto del escenario del SWF son las 360u del juego).
   ============================================================= */
(function (global) {
  'use strict';

  const PopArena = { abierta: false };
  const $ = (id) => document.getElementById(id);
  let raf = 0, alCerrar = null, alpha = 0, timer = 0, ultimo = 0, acum = 0;

  function montar() {
    let el = $('popArena');
    if (el) return el;
    const P = global.POPUP_SWF || {};
    el = document.createElement('div');
    el.id = 'popArena';
    el.className = 'oculto';
    /* La caja: 480 x 357 px del SWF con el origen de la ventana en (240, 37).
       El relleno (myBar lleno, ya recortado por la mascara del canal) ocupa
       [56,3, 148,3, 426,7, 185,7] de esa caja: es su propia imagen, puesta
       ahi y cortada por la derecha segun la XP (pintar). */
    const bb = P.bbarra || [56.3, 148.3, 426.7, 185.7];
    /* El orden de profundidad del SWF: el panel (7762), el titulo
       'TEST RESULTS' (7763, dos veces), lo de encima -Desert Eagles,
       circuitos, el canal oscuro de la barra y el boton DONE con su
       flecha-, el relleno (myBar, bajo la mascara del canal), la tapa de
       la barra (7783: el borde gris y el brillo) y encima de todo 'LEVEL',
       el nivel y el dinero. */
    el.innerHTML =
      '<div class="paCaja">' +
      '<img class="paCapa" src="' + (P.base || '') + '" alt="">' +
      '<img class="paCapa" src="' + (P.titulo || '') + '" alt="TEST RESULTS">' +
      '<img class="paCapa" src="' + (P.encima || '') + '" alt="">' +
      '<div class="paBarra" style="left:calc(var(--s)*' + bb[0] + ');top:calc(var(--s)*' + bb[1] +
        ');width:calc(var(--s)*' + (bb[2] - bb[0]) + ');height:calc(var(--s)*' + (bb[3] - bb[1]) + ')">' +
        '<img id="paRelleno" src="' + (P.barra || '') + '" alt=""></div>' +
      '<img class="paCapa" src="' + (P.tapa || '') + '" alt="">' +
      '<b class="paLevel">LEVEL</b><b class="paNivel" id="paNivel">1</b>' +
      '<b class="paCash" id="paCash">+ $0</b>' +
      '<button class="paDone" id="paDone" aria-label="DONE"></button>' +
      '</div>';
    const hud = $('hud') || document.body;
    hud.appendChild(el);
    $('paDone').addEventListener('click', (e) => { e.stopPropagation(); PopArena.done(); });
    return el;
  }

  /* setArenaStats */
  function pintar() {
    const F = Progreso.ficha;
    $('paNivel').textContent = F.myLevel;
    $('paCash').textContent = '+ $' + Math.floor(F.myCash);
    const f = F.myXP / Progreso.getLevelUpXP(F.myLevel);
    /* xpBar.myBar._xscale = f x 100: myBar crece desde su origen (xbarra[0],
       472,9 x 0,7839 = 370,7 px lleno) y la mascara del canal lo recorta.
       Como el relleno es un degradado vertical, escalarlo es cortarlo por
       la derecha en xbarra[0] + f x xbarra[1]. Con _xscale negativo -la XP
       que applyXP deja por debajo de 0 al subir de nivel- el SWF lo dibuja
       a la izquierda del origen, fuera de la mascara: no se ve nada. */
    const P = global.POPUP_SWF || {}, bb = P.bbarra || [56.3, 148.3, 426.7, 185.7];
    const xb = P.xbarra || [56.55, 370.7];
    const xr = xb[0] + Math.max(0, Math.min(1, f)) * xb[1];
    const vis = Math.max(0, Math.min(1, (xr - bb[0]) / (bb[2] - bb[0])));
    $('paRelleno').style.clipPath = 'inset(0 ' + ((1 - vis) * 100).toFixed(2) + '% 0 0)';
  }

  /* applyXPFromEarned: un 10 % por cuadro */
  function volcar(todo) {
    const G = Progreso.ganado, F = Progreso.ficha;
    let sube = false;
    if (G.xp > 0) {
      const x = (!todo && G.xp > 1) ? G.xp * 0.1 : G.xp;
      sube = Progreso.applyXP(F, x) || sube;
      G.xp -= x;
    }
    if (G.cash > 0) {
      const c = (!todo && G.cash > 1) ? G.cash * 0.1 : G.cash;
      F.myCash += c; G.cash -= c;
    }
    if (sube && global.Game && Game.jugador) Progreso.aplicar(Game.jugador, F, true);   // changeStats: cura
  }

  function tick(ahora) {
    raf = requestAnimationFrame(tick);
    if (!ultimo) ultimo = ahora;
    acum += Math.min(0.25, (ahora - ultimo) / 1000); ultimo = ahora;
    while (acum >= 1 / 30) {
      acum -= 1 / 30;
      if (timer > 1) { timer -= 1; if (timer < 2) timer = 2; }
      if (alpha < 100) alpha = Math.min(100, alpha + 20);
      if (timer === 2) volcar(false);
    }
    $('popArena').style.opacity = String(alpha / 100);
    pintar();
  }

  /* addPopup('arena', '', null, 440, 100, undef, 50, alCerrar) */
  PopArena.mostrar = function (fn) {
    const el = montar();
    alCerrar = fn || null;
    alpha = 20; timer = 50; ultimo = 0; acum = 0;
    PopArena.abierta = true;
    el.classList.remove('oculto');
    el.style.opacity = '0.2';
    pintar();
    if (global.Sonido) Sonido.tocar('menu', {});
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };

  /* pressYes -> arena_1_reset / arena_1_resetB: lo que falte, de golpe */
  PopArena.done = function () {
    if (!PopArena.abierta) return;
    volcar(true);
    Progreso.ficha.myCash = Math.floor(Progreso.ficha.myCash);
    Progreso.guardar();
    cancelAnimationFrame(raf);
    PopArena.abierta = false;
    $('popArena').classList.add('oculto');
    if (global.Sonido) Sonido.tocar('boton', {});
    const f = alCerrar; alCerrar = null;
    if (f) f();
  };

  global.PopArena = PopArena;
})(window);

