/* =============================================================
   device.js -> Modo PC / movil, orientacion y mandos tactiles.

   EL JUEGO SIEMPRE SE VE EN HORIZONTAL. Si el telefono esta en
   vertical no se pide girarlo: se gira el propio juego 90 grados
   con una transformacion CSS y se juega tal cual. Un cartel de
   "gira el movil" es una pantalla que el jugador tiene que
   obedecer antes de jugar, y eso es una pantalla de mas.

   Como los dedos siguen tocando en coordenadas de pantalla SIN
   girar, todos los toques se convierten al espacio del escenario.
   Ese es el unico sitio del juego que sabe que existe el giro.

   Este modulo es el que mas se ha probado en un telefono de
   verdad: las decisiones raras que hay aqui -y estan comentadas-
   son cicatrices, no caprichos.
   ============================================================= */
(function (global) {
  'use strict';

  const Device = {
    modo: 'auto',          // auto | pc | movil
    esMovil: false,
    girado: false,
    aw: 0, ah: 0,          // tamano del escenario, ya en horizontal
    juego: null,

    detectar() {
      const grueso = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const tacto = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
      const ua = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|Opera Mini/i.test(navigator.userAgent);
      // iPadOS se presenta como Mac: lo delata el multitactil
      const ipad = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
      return (tacto && (grueso || ua)) || ipad;
    },

    init(juego) {
      this.juego = juego;
      this.escenario = document.getElementById('escenario');
      this.cargar();
      this.aplicar(this.modo);
      this._initTactil();

      window.addEventListener('resize', () => this.medir());
      window.addEventListener('orientationchange', () => {
        // el navegador avisa del giro ANTES de actualizar el tamano
        setTimeout(() => this.medir(), 120);
        setTimeout(() => this.medir(), 420);
      });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => this.medir());
      }
      this.medir();
      return this;
    },

    cargar() {
      const v = U.store.get('madness.device', 'auto');
      if (v === 'pc' || v === 'movil' || v === 'auto') this.modo = v;
    },

    aplicar(modo) {
      this.modo = modo;
      U.store.set('madness.device', modo);
      this.esMovil = (modo === 'movil') || (modo === 'auto' && this.detectar());
      document.body.classList.toggle('movil', this.esMovil);
      document.body.classList.toggle('pc', !this.esMovil);
      Input.modoTactil = this.esMovil;
      this.medir();
    },

    medir() {
      const w = Math.round(window.innerWidth);
      const h = Math.round(window.innerHeight);
      const vertical = h > w;

      /* EL GIRO DEPENDE DEL APARATO, NO DE LOS MANDOS.
         Si se atara a esMovil, elegir "PC" en un telefono dejaria
         de girar el escenario y el juego se quedaria alto y
         estrecho, como roto. Son dos cosas distintas: el modo dice
         si se juega con dedos o con teclado, y el giro solo dice
         que un telefono en vertical hay que verlo apaisado. */
      const enMano = this.esMovil || this.detectar();
      const girar = enMano && vertical;
      this.girado = girar;

      if (girar) {
        this.aw = h; this.ah = w;
        this.escenario.style.width = h + 'px';
        this.escenario.style.height = w + 'px';
        // el giro deja el rectangulo descentrado: se recoloca a mano
        this.escenario.style.transform =
          'translate(' + ((w - h) / 2) + 'px,' + ((h - w) / 2) + 'px) rotate(90deg)';
      } else {
        this.aw = w; this.ah = h;
        this.escenario.style.width = w + 'px';
        this.escenario.style.height = h + 'px';
        this.escenario.style.transform = 'none';
      }
      document.body.classList.toggle('girado', girar);

      /* La interfaz se adapta al tamano del ESCENARIO, no al de la
         pantalla: girado, una media query mediria el lado
         equivocado. */
      document.body.classList.toggle('compacto', this.ah < 620);
      document.body.classList.toggle('mini', this.ah < 400);
      document.body.classList.toggle('estrecho', this.aw < 560);

      if (this.juego && this.juego.redimensionar) this.juego.redimensionar(this.aw, this.ah);
    },

    /* Pantalla completa y bloqueo de orientacion. Si el navegador
       los rechaza no pasa nada: el giro por CSS ya garantiza que se
       vea en horizontal. */
    pantallaCompleta() {
      if (!this.esMovil) return;
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req && !document.fullscreenElement) {
        const p = req.call(el);
        if (p && p.then) p.then(() => this._bloquear(), () => {});
        else this._bloquear();
      } else this._bloquear();
    },
    /* Salir de pantalla completa: lo pide QUIT. Si el navegador no
       nos tenia en pantalla completa, no hay nada que hacer. */
    salirPantallaCompleta() {
      try {
        const sal = document.exitFullscreen || document.webkitExitFullscreen;
        if (sal && document.fullscreenElement) {
          const p = sal.call(document);
          if (p && p.catch) p.catch(() => {});
        }
      } catch (e) { /* da igual: es cosmetico */ }
    },

    _bloquear() {
      try {
        const o = screen.orientation;
        if (o && o.lock) { const p = o.lock('landscape'); if (p && p.catch) p.catch(() => {}); }
      } catch (e) { /* no soportado */ }
      setTimeout(() => this.medir(), 200);
    },

    /* --- Conversion de coordenadas --- */
    vecAEscenario(dx, dy) { return this.girado ? [dy, -dx] : [dx, dy]; },
    puntoAEscenario(cx, cy) {
      const r = this.escenario.getBoundingClientRect();
      let dx = cx - (r.left + r.width / 2);
      let dy = cy - (r.top + r.height / 2);
      if (this.girado) { const t = dx; dx = dy; dy = -t; }
      return [this.aw / 2 + dx, this.ah / 2 + dy];
    },

    /* ¿El dedo ha caido sobre interfaz? Esos toques son del
       navegador: si se les hace preventDefault, deja de generarse
       el 'click' y los menus se quedan muertos al tacto. */
    _esUI(el) {
      return !!(el && el.closest &&
        el.closest('button, input, select, a, .pantalla, .tbtn, .tienda'));
    },
    _uiBloquea() {
      if (this.juego && this.juego.pausa) return true;
      return !!document.querySelector('.pantalla.ver');
    },

    /* =============================================================
       MANDOS TACTILES
       Palanca flotante a la izquierda, gatillo a la derecha y
       botones. Todo con seguimiento por identificador de dedo, asi
       se puede correr, apuntar y disparar a la vez.
       ============================================================= */
    _initTactil() {
      const esc = this.escenario;
      const palanca = document.getElementById('palanca');
      const bola = document.getElementById('palancaBola');
      const t = Input.tactil();
      const yo = this;
      const RADIO = 58;

      this._idPalanca = null;
      this._idMira = null;
      /* El dedo que aprieta FUEGO tambien apunta: si se arrastra
         sin soltar, mueve la punteria. Sin esto habria que disparar
         quieto o soltar el gatillo para apuntar, y contra una
         escopeta eso es morirse. */
      this._idGatillo = null;

      const arrancaPalanca = (tc, x, y) => {
        yo._idPalanca = tc.identifier;
        yo._px = x; yo._py = y;
        palanca.style.left = x + 'px';
        palanca.style.top = y + 'px';
        palanca.classList.add('on');
        bola.style.transform = 'translate(-50%,-50%)';
      };
      /* SALTAR CON LA PALANCA: UN PULSO, NO UN NIVEL

         Esto era un nivel -"la palanca esta arriba"- y el juego lo
         leia CADA PASO de simulacion. Empujar y mantener, que es el
         gesto natural, daba un salto detras de otro: medido, 900 ms
         con la palanca arriba salian CINCO saltos, y como el paso
         fijo son 1/60 s y el bucle mete hasta tres por fotograma,
         cada uno salia repetido a 20 ms del anterior. De ahi el
         "siempre salta doble".

         Ahora es un flanco con HISTERESIS: salta al cruzar -0,62
         y no se vuelve a armar hasta bajar de -0,40. Sin esa banda
         muerta, un pulgar que tiembla en el umbral vuelve a
         disparar solo. */
      /* LA PALANCA DA LOS DOS EJES.

         Antes el eje vertical era el salto -empujar arriba saltaba-
         y eso tenia sentido mientras el juego fuera de izquierda a
         derecha: no habia nada mas que hacer con la vertical. Ahora
         la arena es una habitacion y arriba es ir hacia el fondo,
         asi que la vertical es movimiento y el salto se va a su
         propio boton.

         La zona muerta del 12% es para que andar recto sea posible:
         sin ella, un pulgar que empuja "a la derecha" siempre mete
         algo de vertical y el muñeco se va en diagonal. */
      const MUERTA = 0.12;
      const muevePalanca = (x, y) => {
        let dx = x - yo._px, dy = y - yo._py;
        const d = Math.hypot(dx, dy);
        if (d > RADIO) { dx = dx / d * RADIO; dy = dy / d * RADIO; }
        bola.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
        let ex = dx / RADIO, ez = dy / RADIO;
        if (Math.abs(ex) < MUERTA) ex = 0;
        if (Math.abs(ez) < MUERTA) ez = 0;
        t.moverX = ex;
        t.moverZ = ez;
        t.correr = (d / RADIO) > 0.82;
        t.saltar = false;
      };
      const sueltaPalanca = () => {
        yo._idPalanca = null;
        palanca.classList.remove('on');
        bola.style.transform = 'translate(-50%,-50%)';
        t.moverX = 0; t.moverZ = 0; t.correr = false; t.saltar = false;
      };

      esc.addEventListener('touchstart', (e) => {
        if (!yo.esMovil) return;
        if (yo._esUI(e.target) || yo._uiBloquea()) return;
        let atendido = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const tc = e.changedTouches[i];
          if (yo._esUI(tc.target)) continue;
          const p = yo.puntoAEscenario(tc.clientX, tc.clientY);
          if (p[0] < yo.aw * 0.44 && yo._idPalanca === null) {
            arrancaPalanca(tc, p[0], p[1]); atendido = true;
          } else if (yo._idMira === null) {
            yo._idMira = tc.identifier;
            yo._mx = tc.clientX; yo._my = tc.clientY;
            t.apuntando = true;
            atendido = true;
          }
        }
        if (atendido && e.cancelable) e.preventDefault();
      }, { passive: false });

      esc.addEventListener('touchmove', (e) => {
        if (!yo.esMovil) return;
        let atendido = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const tc = e.changedTouches[i];
          if (tc.identifier === yo._idPalanca) {
            const p = yo.puntoAEscenario(tc.clientX, tc.clientY);
            muevePalanca(p[0], p[1]); atendido = true;
          } else if (tc.identifier === yo._idMira || tc.identifier === yo._idGatillo) {
            /* El arrastre MUEVE LA MIRA. Antes sumaba en un angulo
               de elevacion recortado a +-0,9 que no volvia nunca a
               cero, asi que dos gestos hacia arriba dejaban el arma
               apuntando al cielo el resto de la partida.

               Va en fracciones de pantalla y con ganancia: el gesto
               llega mas lejos que el dedo, que es lo que hace usable
               una mira en un movil. */
            const v = yo.vecAEscenario(tc.clientX - yo._mx, tc.clientY - yo._my);
            /* Zona muerta: un toque no mueve la mira. Sin esto, cada
               vez que el pulgar roza la pantalla para disparar la
               punteria da un tirón, y con el enganche automatico
               puesto eso se siente como que el juego pelea contigo. */
            if (Math.hypot(v[0], v[1]) > 3) {
              t.miraDX += (v[0] / yo.aw) * 1.85;
              t.miraDY += (v[1] / yo.ah) * 1.85;
              yo._mx = tc.clientX; yo._my = tc.clientY;
            }
            atendido = true;
          }
        }
        // los dedos que no son de juego se dejan pasar: asi un
        // panel con desplazamiento se sigue moviendo con el dedo
        if (atendido && e.cancelable) e.preventDefault();
      }, { passive: false });

      const sueltaDedo = (e) => {
        if (!yo.esMovil) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const tc = e.changedTouches[i];
          if (tc.identifier === yo._idPalanca) sueltaPalanca();
          if (tc.identifier === yo._idMira) { yo._idMira = null; t.apuntando = false; }
        }
      };
      esc.addEventListener('touchend', sueltaDedo);
      esc.addEventListener('touchcancel', sueltaDedo);

      /* --- Botones --- */
      const mantener = { fuego: 'fuego', bloquear: 'bloquear' };
      const pulsar = { esquiva: 'esquiva', recargar: 'recargar', recoger: 'recoger', tirar: 'tirar',
                       furia: 'furia', cambiar: 'cambiar', saltar: 'saltar' };

      document.querySelectorAll('.tbtn[data-act]').forEach((btn) => {
        const act = btn.dataset.act;
        const abajo = (e) => {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          btn.classList.add('down');
          if (act === 'fuego' && e.changedTouches && e.changedTouches.length) {
            const tc = e.changedTouches[0];
            yo._idGatillo = tc.identifier;
            yo._mx = tc.clientX; yo._my = tc.clientY;
          }
          if (mantener[act]) {
            t[act] = true;
            // un toque puede empezar y acabar en el mismo fotograma:
            // el pestillo asegura que el juego llegue a verlo
            if (act === 'fuego') t.fuegoPulso = true;
          } else if (pulsar[act]) {
            Input.tap(pulsar[act]);
          }
        };
        const arriba = (e) => {
          if (e) { if (e.cancelable) e.preventDefault(); e.stopPropagation(); }
          btn.classList.remove('down');
          if (act === 'fuego') yo._idGatillo = null;
          if (mantener[act]) t[act] = false;
        };
        btn.addEventListener('touchstart', abajo, { passive: false });
        btn.addEventListener('touchend', arriba, { passive: false });
        btn.addEventListener('touchcancel', arriba, { passive: false });
        // tambien sirve para probar los mandos con raton
        btn.addEventListener('mousedown', abajo);
        btn.addEventListener('mouseup', arriba);
        btn.addEventListener('mouseleave', arriba);
      });

      const pausa = document.getElementById('tpausa');
      if (pausa) {
        const p = (e) => { if (e.cancelable) e.preventDefault(); e.stopPropagation(); Input.tap('pausa'); };
        pausa.addEventListener('touchstart', p, { passive: false });
        pausa.addEventListener('mousedown', p);
      }
    },

    reiniciarBotones() {
      const t = Input.tactil();
      t.fuego = false; t.fuegoPulso = false; t.bloquear = false;
      document.querySelectorAll('.tbtn.down').forEach((b) => b.classList.remove('down'));
    }
  };

  global.Device = Device;
})(window);

