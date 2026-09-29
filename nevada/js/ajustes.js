/* =============================================================
   ajustes.js -> LOS AJUSTES DEL JUEGO: que se guardan, que se
   detectan solos y que hace cada uno de verdad.

   El SWF (MadnessGameSelect, pantalla Options) tiene tres: QUALITY
   HIGH/MEDIUM/LOW (el _quality de Flash), MUSIC ON/OFF y BACKGROUND
   HIGH/LOW; los guarda saveOptions (myQuality, muteMusic,
   backgroundQuality). Aqui la calidad es la misma idea con lo que
   cuesta en 3D, y se suma lo que un telefono necesita: la resolucion
   de render, el tope de FPS y el contador.

     calidad     baja | media | alta: enemigos a la vez, cuanta sangre
                 y el suavizado (Game.CALIDADES)
     resolucion  'auto' o una fraccion fija de la nativa (0,5..1). En
                 AUTO la escala baja y sube sola para sostener los FPS
     fps         30 | 60 | 0 (sin tope)
     verFps      el contador en la esquina
     sangre      de verdad: sin gotas ni charcos (Combat.sangre/mancha)
     gore        reservado: el desmembramiento todavia no esta
     musica      volumen 0..1 (0 = MUSIC OFF del SWF)
     efectos     volumen 0..1

   LA PRIMERA VEZ los valores salen del aparato (detectar): la GPU que
   da WEBGL_debug_renderer_info, la memoria y los nucleos. El TCL 20SE
   (Adreno 610, 4 GB) cae en BAJA: la escala de partida 0,62 y AUTO.
   ============================================================= */
(function (global) {
  'use strict';

  const CLAVE = 'madness.ajustes';
  const RESOLUCIONES = [0.5, 0.67, 0.75, 0.85, 1];

  const Ajustes = {
    v: null,           // los valores
    perfil: null,      // lo detectado: { gpu, nivel, motivo, movil }
    din: 1,            // la escala que lleva AUTO ahora mismo
    aviso: ''
  };

  /* ---------------------------------------------------------------
     DETECTAR
     --------------------------------------------------------------- */
  /* El nombre de la GPU, con un contexto de usar y tirar: se pide antes
     de crear el del juego porque el suavizado (antialias) solo se puede
     elegir al crearlo. Se suelta en el acto (WEBGL_lose_context). */
  function nombreGPU() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return '';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const n = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const fin = gl.getExtension('WEBGL_lose_context');
      if (fin) fin.loseContext();
      return String(n || '');
    } catch (e) { return ''; }
  }

  /* El escalon del aparato por su GPU. Las fronteras son las gamas de
     cada fabricante: Adreno 6xx por debajo de 616 (610, 612: Snapdragon
     460/662) es gama baja, 616-639 media (Snapdragon 7xx) y 640 en
     adelante alta (855 y siguientes); en Mali, las G5x/G7[12] y las T
     son bajas, las G7[6-8]/G68 medias y las de tres cifras (G610, G710,
     G715...) altas. Si no se reconoce, deciden memoria y nucleos. */
  function nivelDe(gpu, movil, mem, nuc) {
    const g = gpu.toLowerCase();
    let m;
    if (/swiftshader|llvmpipe|softpipe|software/.test(g)) return ['baja', 'render por software'];
    if ((m = g.match(/adreno[^0-9]*(\d{3})/))) {
      const n = +m[1];
      if (n >= 640) return ['alta', 'Adreno ' + n];
      if ((n >= 616 && n < 640) || (n >= 540 && n < 600)) return ['media', 'Adreno ' + n];
      return ['baja', 'Adreno ' + n];
    }
    if (/immortalis|xclipse|apple/.test(g)) return ['alta', gpu];
    if ((m = g.match(/mali-g(\d+)/))) {
      const n = +m[1];
      if (n >= 100) return ['alta', 'Mali-G' + n];
      if (n >= 76 || n === 68) return ['media', 'Mali-G' + n];
      return ['baja', 'Mali-G' + n];
    }
    if (/mali|powervr|videocore|tegra 3/.test(g)) return ['baja', gpu];
    if (!movil) {
      if (/intel.*(hd|uhd)|intel\(r\) (hd|uhd)/.test(g)) return ['media', 'Intel integrada'];
      return ['alta', gpu || 'escritorio'];
    }
    if ((mem && mem <= 3) || (nuc && nuc <= 4)) return ['baja', mem + ' GB / ' + nuc + ' nucleos'];
    return ['media', (mem || '?') + ' GB / ' + (nuc || '?') + ' nucleos'];
  }

  Ajustes.detectar = function () {
    const movil = global.Device ? Device.detectar() : /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    const gpu = nombreGPU();
    const [nivel, motivo] = nivelDe(gpu, movil, navigator.deviceMemory || 0, navigator.hardwareConcurrency || 0);
    return { gpu, nivel, motivo, movil };
  };

  /* Lo que se pone solo segun el aparato. En un telefono el tope es 60
     aunque la pantalla vaya a 90 o 120: la simulacion va a pasos de 1/60
     y pintar mas es gastar bateria en fotogramas repetidos. */
  function porDefecto(p) {
    const antes = U.store.get('madness.sangre', 1) !== 0;           // de la version anterior
    const son = U.store.get('madness.sonido', 1) !== 0;
    return {
      calidad: p.nivel, resolucion: 'auto', fps: p.movil ? 60 : 0, verFps: false,
      sangre: antes, gore: false, musica: son ? 1 : 0, efectos: son ? 1 : 0
    };
  }

  /* Antes de Game.init: la calidad decide el suavizado del contexto. */
  Ajustes.cargar = function () {
    Ajustes.perfil = U.store.get('madness.perfil', null);
    if (!Ajustes.perfil || !Ajustes.perfil.nivel) {
      Ajustes.perfil = Ajustes.detectar();
      U.store.set('madness.perfil', Ajustes.perfil);
    }
    const g = U.store.get(CLAVE, null);
    Ajustes.v = Object.assign(porDefecto(Ajustes.perfil), g || {});
    if (!Game.CALIDADES[Ajustes.v.calidad]) Ajustes.v.calidad = 'media';
    U.store.set('madness.calidad', Ajustes.v.calidad);
    Ajustes.din = escalaBase();
    return Ajustes.v;
  };

  Ajustes.guardar = function () { U.store.set(CLAVE, Ajustes.v); };

  /* ---------------------------------------------------------------
     LA RESOLUCION
     --------------------------------------------------------------- */
  /* La base de AUTO: la de la calidad, y un 10% menos en pantallas de
     mas de 1,5 px por punto (en un 720p a dpr 2 no se nota y es un 19%
     menos de relleno). */
  function escalaBase() {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    return Game.CALIDADES[Ajustes.v.calidad].escala * (dpr > 1.5 ? 0.9 : 1);
  }
  /* La fraccion de la resolucion nativa que se dibuja ahora. */
  Ajustes.escala = function () {
    if (!Ajustes.v) return 1;
    return Ajustes.v.resolucion === 'auto' ? Ajustes.din : +Ajustes.v.resolucion;
  };

  /* AUTO: cada 1,5 s de partida se mira cuantos fotogramas se pintaron.
     Por debajo del 88% del objetivo baja la escala 0,08; si tres
     ventanas seguidas pasan del 97%, sube 0,05 hasta la base. Nunca por
     debajo de 0,45 ni del 60% de la base: mas abajo ya no se lee el
     dibujo de las armas. Cada cambio es un setPixelRatio, por eso no se
     hace cada fotograma. */
  const VENTANA = 1500;
  let vIni = 0, vCuadros = 0, holgadas = 0;
  function dinamica(ahora) {
    if (!Game.enMarcha || Game.pausa || document.hidden) { vIni = 0; return; }
    if (!vIni) { vIni = ahora; vCuadros = 0; return; }
    vCuadros++;
    if (ahora - vIni < VENTANA) return;
    const fps = vCuadros * 1000 / (ahora - vIni);
    vIni = ahora; vCuadros = 0;
    const meta = Ajustes.v.fps || 60, base = escalaBase();
    const min = Math.max(0.45, base * 0.6);
    let e = Ajustes.din;
    if (fps < meta * 0.88) { e = Math.max(min, e - 0.08); holgadas = 0; }
    else if (fps > meta * 0.97) { if (++holgadas >= 3 && e < base) { e = Math.min(base, e + 0.05); holgadas = 0; } }
    else holgadas = 0;
    if (Math.abs(e - Ajustes.din) > 1e-3) { Ajustes.din = e; Device.medir(); }
  }

  /* ---------------------------------------------------------------
     EL TOPE DE FPS Y EL CONTADOR
     --------------------------------------------------------------- */
  /* true si este fotograma se salta. 2 ms de margen: el requestAnimationFrame
     no llega clavado, y a 60 Hz con tope 60 sin margen se perderia uno de
     cada tantos. */
  let ultDib = 0;
  Ajustes.saltar = function (ahora) {
    const tope = Ajustes.v && +Ajustes.v.fps;
    if (!tope) return false;
    const min = 1000 / tope;
    if (ahora - ultDib < min - 2) return true;
    ultDib = ahora;
    return false;
  };

  let cIni = 0, cN = 0, fpsMedido = 0;
  Ajustes.cuadro = function (ahora) {
    dinamica(ahora);
    cN++;
    if (!cIni) cIni = ahora;
    if (ahora - cIni >= 500) {
      fpsMedido = cN * 1000 / (ahora - cIni);
      cIni = ahora; cN = 0;
      const c = $('contFps');
      if (c && Ajustes.v.verFps) c.textContent = Math.round(fpsMedido) + ' FPS';
      if ($('ajustes') && $('ajustes').classList.contains('ver')) info();
    }
  };

  /* ---------------------------------------------------------------
     APLICAR
     --------------------------------------------------------------- */
  const APLICA = {
    calidad(v) {
      Game.calidad = v;
      U.store.set('madness.calidad', v);
      Ajustes.din = escalaBase();
      /* El suavizado solo se elige al crear el contexto WebGL: se avisa
         en vez de rehacer el render (se perderian todas las mallas). */
      const aa = !!(Game.ren && Game.ren.getContextAttributes && Game.ren.getContextAttributes().antialias);
      Ajustes.aviso = Game.CALIDADES[v].antialias !== aa ? 'El suavizado de bordes cambia al volver a abrir el juego.' : '';
      Device.medir();
    },
    resolucion() { Ajustes.din = escalaBase(); Device.medir(); },
    fps() { ultDib = 0; },
    verFps(v) {
      const c = $('contFps');
      if (c) { c.hidden = !v; c.textContent = v ? Math.round(fpsMedido || 60) + ' FPS' : ''; }
    },
    sangre(v) {
      Game.sangreOn = v;
      U.store.set('madness.sangre', v ? 1 : 0);
      if (!v && global.Combat && Combat.limpiarSangre) Combat.limpiarSangre();
    },
    gore() {},
    /* 'aMano': lo movio el jugador. Al arrancar solo se fija el volumen:
       la musica empieza con el primer toque (sonido.js, el navegador no
       deja sonar nada antes). */
    musica(v, aMano) {
      if (!global.Sonido) return;
      Sonido.volMusica(0.55 * v);          // 0,55: el volumen de la musica de sonido.js
      Sonido.sinMusicaAjuste = v <= 0.001;
      if (v <= 0.001) Sonido.pararMusica(true);
      else if (aMano && !Game.enMarcha) Sonido.musica('menu');
    },
    efectos(v) { if (global.Sonido && Sonido.volEfectos) Sonido.volEfectos(v); }
  };

  Ajustes.poner = function (k, v, sinGuardar) {
    Ajustes.v[k] = v;
    if (APLICA[k]) APLICA[k](v, true);
    if (!sinGuardar) Ajustes.guardar();
    marcar();
    info();
  };

  /* Todo de una vez: al arrancar (con Game y Sonido ya hechos) y al
     restablecer. */
  Ajustes.aplicarTodo = function () {
    for (const k in APLICA) if (k !== 'calidad' && k !== 'resolucion') APLICA[k](Ajustes.v[k]);
    Game.calidad = Ajustes.v.calidad;
    Game.sangreOn = !!Ajustes.v.sangre;
    Ajustes.din = escalaBase();
    Device.medir();
    marcar(); info();
  };

  Ajustes.restablecer = function () {
    Ajustes.perfil = Ajustes.detectar();
    U.store.set('madness.perfil', Ajustes.perfil);
    const d = porDefecto(Ajustes.perfil);
    d.sangre = true; d.musica = 1; d.efectos = 1;
    Ajustes.v = d;
    Ajustes.guardar();
    APLICA.calidad(d.calidad);
    Ajustes.aplicarTodo();
  };

  /* ---------------------------------------------------------------
     LA PANTALLA
     --------------------------------------------------------------- */
  function $(id) { return document.getElementById(id); }

  function marcar() {
    const r = $('ajustes');
    if (!r || !Ajustes.v) return;
    r.querySelectorAll('.segm[data-aj]').forEach((s) => {
      const val = String(Ajustes.v[s.dataset.aj]);
      s.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === val));
    });
    r.querySelectorAll('input[data-aj]').forEach((i) => {
      const p = Math.round(Ajustes.v[i.dataset.aj] * 100);
      i.value = p;
      i.style.setProperty('--p', p + '%');
      const o = r.querySelector('output[for="' + i.id + '"]');
      if (o) o.textContent = p ? p + '%' : 'OFF';
    });
    const m = r.querySelector('.segm[data-modo]');
    if (m && global.Device) m.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === Device.modo));
  }

  const NIVEL = { baja: 'BAJO', media: 'MEDIO', alta: 'ALTO' };
  function info() {
    const el = $('infoRend');
    if (!el || !Ajustes.v || !Game.ren) return;
    const c = Game.ren.domElement, p = Ajustes.perfil || {};
    const res = Ajustes.v.resolucion === 'auto' ? 'AUTO ' + Math.round(Ajustes.din * 100) + '%' : Math.round(Ajustes.escala() * 100) + '%';
    el.innerHTML =
      '<span>' + (p.motivo || p.gpu || 'GPU desconocida').replace(/[<>&]/g, '') + ' · PERFIL ' + (NIVEL[p.nivel] || '?') + '</span>' +
      '<span>RENDER ' + c.width + '×' + c.height + ' (' + res + ') · ' + (fpsMedido ? Math.round(fpsMedido) : '—') + ' FPS</span>' +
      (Ajustes.aviso ? '<em>' + Ajustes.aviso + '</em>' : '');
  }
  Ajustes.info = info;

  const PULSA = () => { if (global.Sonido) { Sonido.init(); Sonido.tocar('ui_pulsar'); } };

  Ajustes.cablear = function () {
    const r = $('ajustes');
    if (!r) return;
    // pestañas
    r.querySelectorAll('.ajTabs button').forEach((b) => {
      b.addEventListener('click', () => {
        PULSA();
        r.querySelectorAll('.ajTabs button').forEach((x) => x.classList.toggle('on', x === b));
        r.querySelectorAll('.ajHoja').forEach((h) => h.classList.toggle('on', h.dataset.hoja === b.dataset.tab));
      });
    });
    // selectores
    r.querySelectorAll('.segm[data-aj] button').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.disabled) return;
        PULSA();
        const k = b.parentElement.dataset.aj, s = b.dataset.v;
        const v = s === 'true' ? true : s === 'false' ? false : s === 'auto' ? 'auto' : isNaN(+s) ? s : +s;
        Ajustes.poner(k, v);
      });
    });
    // mandos (los guarda Device)
    r.querySelectorAll('.segm[data-modo] button').forEach((b) => {
      b.addEventListener('click', () => { PULSA(); Device.aplicar(b.dataset.v); marcar(); });
    });
    // volumenes
    r.querySelectorAll('input[data-aj]').forEach((i) => {
      i.addEventListener('input', () => {
        if (global.Sonido) Sonido.init();
        Ajustes.poner(i.dataset.aj, (+i.value) / 100, true);
      });
      i.addEventListener('change', () => { Ajustes.guardar(); if (i.dataset.aj === 'efectos') PULSA(); });
    });
    const rb = $('ajAuto');
    if (rb) rb.addEventListener('click', () => { PULSA(); Ajustes.restablecer(); });
    marcar(); info();
  };

  Ajustes.RESOLUCIONES = RESOLUCIONES;
  Ajustes.nivelDe = nivelDe;          // para el banco de QA
  global.Ajustes = Ajustes;
})(window);

