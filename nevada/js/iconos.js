/* =============================================================
   iconos.js -> LOS ICONOS DE LOS BOTONES DE ACCION (movil)

   Los dibujos salen del SWF (iconos_swf.js, generado por
   tools/swf_iconos/botones.py): las manos del jugador, el cuchillo, la
   Beretta, el machete, el cartucho del HUD, el cargador del AR-15, el
   fogonazo y el busto del grunt, con su tinta negra y su gris, armados en
   composiciones propias. Los botones van SIN rotulo: el dibujo dice la
   accion y el nombre queda en aria-label / title.

   ATACAR cambia con lo que va a hacer: puño, arma blanca, arma de fuego,
   o USAR cuando hay algo del entorno a mano (el panel de la oleada).
   ============================================================= */
(function (global) {
  'use strict';

  /* Lo que se ve en cada boton (data-act) y su nombre. */
  const BOTON = {
    fuego: ['puno', 'Atacar'], esquiva: ['esquiva', 'Esquivar'], bloquear: ['bloquear', 'Bloquear'],
    furia: ['btime', 'Bullet time'], recargar: ['recargar', 'Recargar'], cambiar: ['cambiar', 'Cambiar de arma'],
    tirar: ['tirar', 'Tirar el arma'], recoger: ['coger', 'Recoger']
  };
  const NOMBRE = { puno: 'Atacar', blanca: 'Atacar', fuego: 'Disparar', usar: 'Usar' };

  const img = (cual) => (global.ICONOS_SWF || {})[cual] || '';

  const Iconos = {};
  /* Una vez: a cada boton su dibujo en lugar del rotulo. */
  Iconos.montar = function () {
    document.querySelectorAll('.tbtn[data-act]').forEach((b) => {
      const d = BOTON[b.dataset.act];
      if (!d || b.querySelector('.ico')) return;
      const i = document.createElement('i');
      i.className = 'ico';
      i.style.backgroundImage = 'url("' + img(d[0]) + '")';
      b.insertBefore(i, b.firstChild);
      b.dataset.ico = d[0];
      b.setAttribute('aria-label', d[1]);
      b.title = d[1];
      b.classList.add('conIco');
    });
  };
  /* Cambia el dibujo de un boton, solo si cambia. */
  Iconos.poner = function (act, cual) {
    const b = document.querySelector('.tbtn[data-act="' + act + '"]');
    if (!b || b.dataset.ico === cual) return;
    const i = b.querySelector('.ico');
    if (i) i.style.backgroundImage = 'url("' + img(cual) + '")';
    b.dataset.ico = cual;
    if (NOMBRE[cual] && act === 'fuego') { b.setAttribute('aria-label', NOMBRE[cual]); b.title = NOMBRE[cual]; }
  };

  global.Iconos = Iconos;
})(window);

