/* =============================================================
   input.js -> Una sola capa de entrada.

   El juego no pregunta nunca si hay teclado o dedos: pregunta
   "¿se esta moviendo?" y "¿esta atacando?". Teclas, raton y tacto
   escriben en el mismo sitio, y por eso el codigo de juego no
   tiene ni un solo "if movil".
   ============================================================= */
(function (global) {
  'use strict';

  const Input = {
    teclas: Object.create(null),
    pulsos: Object.create(null),   // acciones de un solo fotograma
    modoTactil: false,
    raton: { x: 0, y: 0, dentro: false, izq: false },
    t: {
      moverX: 0, moverZ: 0, saltar: false, correr: false,
      fuego: false, fuegoPulso: false,
      apuntando: false,
      /* arrastre de la mira, en fracciones de pantalla; lo consume
         y lo pone a cero Game.entradaMira cada fotograma */
      miraDX: 0, miraDY: 0
    }
  };

  Input.init = function (lienzo) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      Input.teclas[k] = true;
      Input.teclas[e.code] = true;
      // las teclas que el navegador se quiere quedar
      if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].indexOf(k) >= 0) e.preventDefault();
      const mapa = { r: 'recargar', e: 'recoger', q: 'cambiar', f: 'furia', c: 'esquiva', g: 'tirar',
                     shift: null, escape: 'pausa' };
      if (mapa[k]) Input.tap(mapa[k]);
      if (k === ' ') Input.tap('saltar');
    });
    window.addEventListener('keyup', (e) => {
      Input.teclas[e.key.toLowerCase()] = false;
      Input.teclas[e.code] = false;
    });
    window.addEventListener('blur', () => { Input.teclas = Object.create(null); });

    if (lienzo) {
      lienzo.addEventListener('mousemove', (e) => {
        const r = lienzo.getBoundingClientRect();
        Input.raton.x = (e.clientX - r.left) / r.width * 2 - 1;
        Input.raton.y = -((e.clientY - r.top) / r.height * 2 - 1);
        Input.raton.dentro = true;
      });
      lienzo.addEventListener('mousedown', (e) => {
        if (e.button === 0) { Input.raton.izq = true; Input.tap('atacar'); }
      });
      window.addEventListener('mouseup', (e) => { if (e.button === 0) Input.raton.izq = false; });
      lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    return Input;
  };

  Input.tap = function (accion) { Input.pulsos[accion] = true; };

  /* Consume un pulso: devuelve true una sola vez */
  Input.pulso = function (accion) {
    if (Input.pulsos[accion]) { Input.pulsos[accion] = false; return true; }
    return false;
  };

  Input.limpiarPulsos = function () { Input.pulsos = Object.create(null); };

  /* El estado que lee el juego, ya mezclado */
  Input.leer = function () {
    const t = Input.t;
    let mover = 0, moverZ = 0;
    if (!Input.modoTactil) {
      if (Input.teclas['a'] || Input.teclas['arrowleft']) mover -= 1;
      if (Input.teclas['d'] || Input.teclas['arrowright']) mover += 1;
      /* Y el otro eje. W/S van HACIA EL FONDO y hacia la camara:
         W sube en pantalla, que es alejarse, o sea z negativa. */
      if (Input.teclas['w'] || Input.teclas['arrowup']) moverZ -= 1;
      if (Input.teclas['s'] || Input.teclas['arrowdown']) moverZ += 1;
    } else {
      mover = t.moverX;
      moverZ = t.moverZ || 0;
    }
    const correr = Input.modoTactil ? t.correr
      : !!(Input.teclas['shift'] || Input.teclas['ShiftLeft'] || Input.teclas['ShiftRight']);

    return {
      mover: U.clamp(mover, -1, 1),
      moverZ: U.clamp(moverZ, -1, 1),
      correr: correr,
      /* Solo pulso. Antes esto tenia ademas el nivel de la palanca
         -"|| (Input.modoTactil && t.saltar)"- y como Input.leer()
         se llama una vez por PASO de simulacion, mantener la
         palanca arriba pedia saltar sesenta veces por segundo.
         El flanco lo da ahora device.js. */
      salto: Input.pulso('saltar'),
      atacar: Input.modoTactil ? (t.fuego || t.fuegoPulso) : (Input.raton.izq || Input.pulsos['atacar']),
      /* BLOQUEAR mantenido (la guardia, toggleGuard del SWF con arma
         blanca): el boton en el movil, la V en el teclado */
      guardia: Input.modoTactil ? !!t.bloquear : !!Input.teclas['v'],
      raton: Input.raton
    };
  };

  Input.tactil = function () { return Input.t; };

  global.Input = Input;
})(window);

