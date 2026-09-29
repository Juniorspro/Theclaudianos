/* =============================================================
   main.js -> Arranque, menus y el reloj.

   EL RELOJ
   El bucle no usa el dt que da el navegador tal cual. Se acumula
   y se gasta en pasos fijos de 1/60: asi la fisica y la IA se
   comportan igual a 30 que a 60 que a 120 fotogramas, y una
   pestaña que estuvo dos segundos en segundo plano no adelanta
   media oleada de golpe al volver. El limite de tres pasos por
   fotograma es el freno que evita la espiral de la muerte: si el
   aparato no llega, el juego va a camara lenta, pero no se
   atasca.

   Y hay UNA excepcion: la congelacion de impacto. Cuando un golpe
   conecta, el mundo se para 50 milisegundos. Es el truco mas
   viejo del genero y el que mas se nota: sin el, pegar no suena a
   nada.
   ============================================================= */
(function (global) {
  'use strict';

  const PASO = 1 / 60;
  let acumulado = 0;
  let ultimo = 0;
  let iniciado = false;

  function pantalla(id) {
    document.querySelectorAll('.pantalla').forEach((p) => {
      p.classList.toggle('ver', p.id === id);
    });
  }
  function cerrarPantallas() {
    document.querySelectorAll('.pantalla').forEach((p) => p.classList.remove('ver'));
  }

  /* =============================================================
     NAVEGACION
     ============================================================= */
  /* LA PARTIDA GUARDADA: la ficha (Progreso, 'madness.ficha'), que se
     guarda al acabar cada oleada y al morir, como MadnessSaveData.saveGame.
     setContinueButton: CONTINUE solo si existe (testSaveExists). */
  const hayPartida = () => !!(global.U && U.store && U.store.get('madness.ficha', null));
  function modoArena(on) {
    const b = $('banda'), tab = $('tabArena'), cont = $('btContinuar');
    if (!b) return;
    b.classList.toggle('conArena', on);
    if (tab) tab.classList.toggle('elegida', on);
    if (cont) cont.disabled = !hayPartida();
    /* LA LINEA BAJA DEL BOTON, NO DE LA FRANJA. En el SWF (Ruffle, captura
       del submenu) el marco gris de ARENA COMBAT acaba en y 221 y la raya
       vertical empieza en la 222, pegada debajo, al 45% del boton (x 478
       en 438-527); baja hasta la altura de CONTINUE. Se mide con offsets
       -el diseño sin transformar- y se pasa a u, asi vale con el escenario
       girado y al cambiar de tamaño. El marco sobresale 2,4 u (.bt::before). */
    if (on && tab) {
      const cont = b.querySelector('.bandaCont');
      const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 1;
      let x = 0, y = 0;
      for (let e = tab; e && e !== cont; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
      b.style.setProperty('--ramalX', ((cont.offsetWidth - (x + tab.offsetWidth * 0.45)) / u).toFixed(2));
      b.style.setProperty('--ramalTop', ((y + tab.offsetHeight) / u + 2.4).toFixed(2));
    }
  }
  function jugar(opts) {
    cerrarPantallas();
    Device.pantallaCompleta();
    HUD.mostrar(true);
    Game.finPuesto = false;
    Game.empezar(opts);
  }
  /* Salir a medias tambien guarda (el gameMenu del SWF guarda al irse):
     por QUIT, por el menu, o cerrando la app o la pestaña, que en un
     telefono es lo normal. 'pagehide' es lo ultimo que llega seguro en
     Android e iOS; 'hidden' cubre el cambio de app. */
  global.addEventListener('pagehide', () => Game.guardarPartida());
  document.addEventListener('visibilitychange', () => { if (document.hidden) Game.guardarPartida(); });
  /* QUIT DE VERDAD. window.close() cierra la ventana si la abrio un
     script o si el juego corre instalado (PWA / app); si el navegador no
     deja, se sale de la pagina: atras en el historial si se llego desde
     otra, y si no, a una pagina en blanco. Antes se apaga todo. */
  function salir() {
    Game.guardarPartida();
    Game.limpiar(); Game.enMarcha = false; Game.pausa = false;
    HUD.mostrar(false);
    Sonido.pararMusica(true);
    if (Sonido.mudo) Sonido.mudo(true);
    Device.salirPantallaCompleta();
    try { global.close(); } catch (e) { /* sigue */ }
    setTimeout(() => {
      if (global.closed) return;
      if (global.history.length > 1) global.history.back();
      setTimeout(() => { if (!global.closed) global.location.replace('about:blank'); }, 400);
    }, 150);
  }

  function ir(destino) {
    switch (destino) {
      /* ARENA COMBAT (pressArena): no arranca, abre NEW GAME / CONTINUE */
      case 'modoArena':
        modoArena(!$('banda').classList.contains('conArena'));
        break;
      case 'menuArena':
        pantalla('menu'); modoArena(true);
        break;
      /* pressNew: con partida guardada pregunta antes (popup 'yesno') */
      case 'nueva':
        if (hayPartida()) pantalla('confirmaNueva');
        else { Progreso.borrar(); jugar(); }
        break;
      case 'nuevaSi':
        Progreso.borrar();
        jugar();
        break;
      /* pressContinue: carga la ficha y a la arena */
      case 'continuar':
        if (!hayPartida()) break;
        Progreso.cargar();
        jugar({ continuar: true });
        break;
      case 'arena':
        cerrarPantallas();
        Device.pantallaCompleta();
        HUD.mostrar(true);
        Game.finPuesto = false;
        Game.empezar();
        break;

      case 'ajustes':
        Game.pausa = Game.enMarcha;
        pantalla('ajustes');
        Ajustes.info();
        break;
      /* VOLVER de los ajustes: a la pausa si se entro desde la partida
         (antes iba al menu y se perdia la partida), si no al menu */
      case 'volverAjustes':
        if (Game.enMarcha) pantalla('pausa');
        else { pantalla('menu'); modoArena(false); }
        break;

      case 'creditos': pantalla('creditos'); break;

      /* Los dos modos que todavia no estan. Los botones van
         apagados, pero si alguien llega aqui por teclado que al
         menos diga por que no pasa nada.

         El patio -la arena sin oleadas, con grunts que reaparecen-
         esta implementado mas abajo en este mismo archivo y se deja
         puesto: es la semilla de The Playground. Lo que no esta es
         el modo, asi que la puerta esta cerrada. */
      case 'historia':
      case 'entrenar':
        HUD.aviso('EN DESARROLLO');
        break;

      /* Atajo de desarrollo: no hay boton que lleve aqui. */
      case 'patio':
        cerrarPantallas();
        Device.pantallaCompleta();
        HUD.mostrar(true);
        Game.finPuesto = false;
        Game.empezar();
        Game.olas.estado = 'patio';
        Game.patio = true;
        HUD.aviso('EL PATIO');
        break;

      /* QUIT (pressQuit): fuera del juego, ver salir() */
      case 'salir':
        salir();
        break;

      case 'menu':
        Game.guardarPartida();          // antes de soltar la partida
        Game.enMarcha = false;
        Game.pausa = false;
        Game.patio = false;
        HUD.mostrar(false);
        pantalla('menu');
        modoArena(false);
        figuraMenu();
        Sonido.musica('menu');
        break;

      case 'seguir':
        cerrarPantallas();
        Game.pausa = false;
        Device.reiniciarBotones();
        break;

      case 'abandonar':
        Game.limpiar();
        ir('menu');
        break;

      case 'reintentar':
        cerrarPantallas();
        Game.finPuesto = false;
        Game.empezar();
        break;
    }
  }

  /* =============================================================
     CABLEADO
     ============================================================= */
  /* Los sonidos de interfaz. El catalogo del original separa
     MOVERSE por el menu, PULSAR, VOLVER y ENTRAR en una pantalla
     -S_Menu1 a S_Menu5-, y tiene razon: si todo suena igual, el
     menu no responde, solo pita.

     Y el AudioContext se crea AQUI, dentro del primer clic: en
     movil el navegador no deja de otra forma, y si se intenta
     antes queda suspendido para siempre y el juego se queda mudo
     sin decir nada. */
  function sonarBoton(b) {
    Sonido.init();
    /* La musica del menu no puede arrancar con la pagina -el
       navegador no deja sonar nada sin un gesto-, asi que engancha
       en el primer clic que da el jugador, sea cual sea. */
    if (!Game.enMarcha) Sonido.musica('menu');
    const d = b.dataset.ir;
    if (b.disabled) { Sonido.tocar('ui_nada'); return; }
    if (d === 'arena' || d === 'historia' || d === 'entrenar') Sonido.tocar('ui_entrar');
    else if (d === 'menu' || d === 'seguir' || d === 'volverAjustes') Sonido.tocar('ui_volver');
    else Sonido.tocar('ui_pulsar');
  }

  function cablear() {
    document.querySelectorAll('[data-ir]').forEach((b) => {
      b.addEventListener('click', () => { sonarBoton(b); ir(b.dataset.ir); });
      b.addEventListener('pointerenter', () => Sonido.tocar('ui_mover'));
    });
    /* Los interruptores de ajustes tambien suenan, y tambien
       arrancan el audio: se puede entrar a opciones antes que a
       la arena. */
    document.querySelectorAll('.seg button, .tbtn').forEach((b) => {
      b.addEventListener('click', () => { Sonido.init(); Sonido.tocar('ui_pulsar'); });
    });

    /* los ajustes se cablean solos (ajustes.js) */
  }

  function $(id) { return document.getElementById(id); }

  /* EL PERSONAJE DEL MENU (charIcon, assignRandomCharacter 4481..4765):
     uno al azar de los del juego, sin armas, de tres cuartos. Se dibuja
     EN VIVO en su propio lienzo (un WebGLRenderer chico con alfa, que
     comparte mallas y materiales con el del juego): el SWF le hace
     'mySprite.play()' y el muñeco respira. Una foto fija salia tiesa, y
     si se sacaba antes de que cargara la textura de las manos, con las
     manos negras. Se pinta a 30 fps (los del SWF) y solo con el menu a
     la vista.

     EL REPOSO, sprite 7430 (el mySprite de charIcon 7431): 50 cuadros a
     30 fps, 1,67 s. Todas las piezas van en fase; la curva es la de la X
     de la cabeza (en twips: 0 en el cuadro 1, 40 en el 25-26 y vuelta),
     normalizada. A metros: de la coronilla (registro de myHead, y 506) al
     suelo (pies, y ~1850) hay 67,2 px = 1,70 m -> 1 px = 0,0253 m; el
     registro del cuerpo (y 1230) cae a 0,78 m, el ALTO_PECHO. En el pico:
       cuerpo      gira de -12,11 a -9,53 grados: 2,58 hacia delante; su
                   registro avanza 1,2 px (0,030 m) y sube 0,45 (0,011)
       cabeza      avanza 2 px (0,051 m) y no gira
       mano atras  (handNone_back) avanza 3,2 px (0,081) y baja 1 (0,025)
       mano delante (handNone_front) sube 3 px (0,076)
     Aqui la cabeza y las manos cuelgan del cuerpo: se les quita lo que ya
     les da el cuerpo al inclinarse, para que en el mundo hagan lo del SWF. */
  const REPOSO_MENU = [0, 0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 8, 10, 12, 14, 18, 21, 25, 30, 33, 36, 38, 39, 40, 40,
                       40, 39, 38, 36, 34, 31, 28, 25, 21, 18, 15, 13, 11, 9, 7, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0];
  const PX = 0.0253, GIRO_MENU = 2.58 * Math.PI / 180;
  /* sin hank hasta que se rehaga su modelo */
  const TIPOS_MENU = ['grunt', 'agente', 'agenteClasico', 'agenteMk0', 'soldat', 'atp'];
  const FIG = { ren: null, esc: null, cam: null, t: null, reloj: 0, acum: 0 };
  const _qm = new THREE.Quaternion(), _ex = new THREE.Vector3(1, 0, 0);

  function lienzoFigura() {
    const c = $('menuFigura');
    if (!c) return null;
    if (!FIG.ren) {
      try {
        FIG.ren = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: false, premultipliedAlpha: true,
                                            powerPreference: 'low-power', stencil: false });
      } catch (e) { return null; }
      FIG.ren.setClearColor(0x000000, 0);
    }
    /* el bufer, al tamaño en pantalla por la escala de los ajustes */
    const w = c.clientWidth || 146, h = c.clientHeight || 146;
    const pr = Math.min(global.devicePixelRatio || 1, 2) * (global.Ajustes && Ajustes.v ? Ajustes.escala() : 1);
    if (FIG.w !== w || FIG.h !== h || FIG.pr !== pr) {
      FIG.w = w; FIG.h = h; FIG.pr = pr;
      FIG.ren.setPixelRatio(pr); FIG.ren.setSize(w, h, false);
      if (FIG.cam) { FIG.cam.aspect = w / h; FIG.cam.updateProjectionMatrix(); }
    }
    return FIG.ren;
  }

  function figuraMenu() {
    if (!global.Actor || !lienzoFigura()) return;
    if (FIG.t) { Actor.destruir(FIG.t, FIG.esc); FIG.t = null; }
    const tipos = TIPOS_MENU.filter((t) => Chars.TIPOS[t]);
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];
    FIG.esc = new THREE.Scene();
    let t;
    try {
      t = Actor.crear({ tipo: tipo, arma: 'puños', x: 0, z: 0, mirando: 1 });
      t.sinTope = true; t.guion = true;
      t.rumbo = t.rumboObj = Math.PI / 2 - 0.55;
      for (let i = 0; i < 40; i++) Actor.actualizar(t, 1 / 60, i / 60);
    } catch (e) { return; }
    FIG.esc.add(t.grupo);
    FIG.t = t; FIG.reloj = 0; FIG.acum = 1;
    const alto = Chars.ALTO * ((Chars.TIPOS[tipo] && Chars.TIPOS[tipo].escala) || 1);
    /* De la cadera a un 6% por encima de la coronilla (aire para el
       casco del ATP). Abajo 0,22 del alto = 0,374 m: las manos de reposo
       estan a 0,546 m (hueso manoI, 0,286 sobre el pivote del cuerpo en
       0,26), y en el reposo del SWF la de atras baja 0,025 m: entran
       ENTERAS y la linea de abajo corta la cadera, no un puño. */
    const FOV = 26, y0 = alto * 0.22, y1 = alto * 1.06;
    const d = (y1 - y0) / (2 * Math.tan(FOV * Math.PI / 360));
    FIG.cam = new THREE.PerspectiveCamera(FOV, FIG.w / FIG.h, 0.05, 30);
    FIG.cam.position.set(0, (y0 + y1) / 2 + 0.3, d); FIG.cam.lookAt(0, (y0 + y1) / 2, 0);
    pintarFigura(0);
  }

  /* El reposo del SWF encima de la pose del juego, en el marco de cada
     hueso; s = 1 lo pone y s = -1 lo quita (despues de pintar, para que
     no se acumule con lo que el animador no reescribe). */
  function reposoSWF(t, k, s) {
    const hs = t.cuerpo.huesos, H = Chars.H;
    const cu = hs[H.CUERPO], ca = hs[H.CABEZA];
    const g = k * GIRO_MENU * s;
    // el cuerpo: se inclina hacia delante (+Z es su frente) y avanza/sube
    _qm.setFromAxisAngle(_ex, g); cu.quaternion.multiply(_qm);
    cu.position.z += k * 0.030 * s; cu.position.y += k * 0.011 * s;
    /* la cabeza: en el mundo 0,051 hacia delante y sin girar. La
       inclinacion ya la adelanta 0,93 * sen(2,58) = 0,042 y el cuerpo
       0,030: sobran 0,021, que se le quitan; y se desgira */
    ca.position.z += k * (0.051 - 0.030 - 0.93 * Math.sin(GIRO_MENU)) * s;
    _qm.setFromAxisAngle(_ex, -g); ca.quaternion.premultiply(_qm);
    /* las manos: el cuerpo ya las lleva 0,030 + 0,286 * sen(2,58) = 0,043
       hacia delante y 0,011 arriba. La de atras (la que enseña el
       dorso, REVES) tiene que ir 0,081 delante y 0,025 abajo; la de
       delante, 0,076 arriba y en su sitio */
    const adel = 0.030 + 0.286 * Math.sin(GIRO_MENU);
    const atrasI = !!t.revesI;
    for (const [ids, atras] of [[Chars.MANOS_I, atrasI], [Chars.MANOS_D, !atrasI]]) {
      const dz = (atras ? 0.081 : 0) - adel, dy = (atras ? -0.025 : 0.076) - 0.011;
      for (const id of ids) { hs[id].position.z += k * dz * s; hs[id].position.y += k * dy * s; }
    }
  }

  function pintarFigura(dt) {
    const t = FIG.t;
    if (!t || !lienzoFigura()) return;
    FIG.reloj += dt;
    Actor.actualizar(t, dt || 1 / 60, FIG.reloj);
    const f = (FIG.reloj * 30) % 50, i = Math.floor(f), fr = f - i;
    const k = (REPOSO_MENU[i] + (REPOSO_MENU[(i + 1) % 50] - REPOSO_MENU[i]) * fr) / 40;
    reposoSWF(t, k, 1);
    FIG.ren.render(FIG.esc, FIG.cam);
    reposoSWF(t, k, -1);
  }

  /* Cada fotograma del bucle: a 30 fps y solo con el menu delante. */
  function pasoFigura(dt) {
    if (!FIG.t || Game.enMarcha) return;
    const m = $('menu');
    if (!m || !m.classList.contains('ver')) return;
    FIG.acum += dt;
    if (FIG.acum < 1 / 30 - 0.002) return;
    pintarFigura(Math.min(FIG.acum, 0.1));
    FIG.acum = 0;
  }
  Game.figuraMenu = figuraMenu;
  Game.pintarFigura = pintarFigura;     // para el banco de QA

  /* =============================================================
     EL PATIO
     Cuatro grunts que vuelven a salir en cuanto caen. Sin
     puntuacion, sin tienda y sin muerte permanente.
     ============================================================= */
  function patio(dt) {
    if (!Game.patio || !Game.enMarcha) return;
    if (Game.contarVivos() < 4 && U.rng() < dt * 1.6) {
      const p = Arena.puertas[U.rng() < 0.5 ? 0 : 1];
      const armas = ['puños', 'bate', 'cuchillo', 'pistola'];
      Game.soltar('grunt', armas[Math.floor(U.rng() * armas.length)], p.x, p.lado);
    }
    if (!Game.jugador.vivo) {
      Game.jugador.vivo = true;
      Game.jugador.vida = Game.jugador.vidaMax;
      Game.jugador.muerte = 0;
      Game.jugador.grupo.rotation.set(0, 0, 0);
      Game.finPuesto = false;
    }
  }

  /* =============================================================
     EL BUCLE
     ============================================================= */
  function bucle(ahora) {
    requestAnimationFrame(bucle);
    /* el tope de FPS de los ajustes: el fotograma que sobra ni se
       simula ni se pinta; el dt del siguiente ya lo lleva */
    if (Ajustes.saltar(ahora)) return;
    Ajustes.cuadro(ahora);
    if (!ultimo) ultimo = ahora;
    let dt = (ahora - ultimo) / 1000;
    ultimo = ahora;
    // una pestaña que vuelve de segundo plano trae un dt enorme:
    // se recorta antes de que adelante media partida
    if (dt > 0.25) dt = 0.25;

    if (Input.pulso('pausa')) {
      if (Game.enMarcha) {
        if (document.querySelector('.pantalla.ver')) ir('seguir');
        else { Game.pausa = true; pantalla('pausa'); }
      }
    }

    /* La congelacion de impacto para el mundo, no el reloj: se
       descuenta con el tiempo real para que dure siempre lo mismo
       vaya el aparato como vaya. */
    // sin partida en marcha, la camara pasea por la arena vacia:
    // es el fondo del menu
    if (!Game.enMarcha) { Game.pasoMenu(dt); pasoFigura(dt); }

    let pasos = 0;
    if (Combat.congelar > 0) {
      Combat.congelar -= dt;
    } else {
      acumulado += dt;
      while (acumulado >= PASO && pasos < 3) {
        Game.paso(PASO);
        patio(PASO);
        acumulado -= PASO;
        pasos++;
      }
      if (acumulado > PASO * 3) acumulado = 0;   // el aparato no llega: se suelta lastre
    }

    /* LOS PULSOS SOLO SE TIRAN SI ALGUIEN HA PODIDO LEERLOS.

       El paso de simulacion es fijo a 1/60, pero el bucle corre a
       la frecuencia de la pantalla. En un movil de 120 Hz la mitad
       de los fotogramas NO dan un paso -todavia no se ha acumulado
       1/60- y aqui se borraban igual: la mitad de los toques de
       saltar, recargar o esquivar se perdian antes de que el juego
       los viera. Se notaba como "a veces no responde", que es la
       peor clase de fallo porque no se puede repetir a voluntad.

       Y la congelacion de impacto hacia lo mismo, pero seguro: sus
       fotogramas no dan ningun paso, asi que cualquier toque
       durante una congelacion se iba a la basura.

       Colgandolo de 'pasos' el pulso espera al siguiente paso, que
       nunca esta a mas de 16 ms. Que no se acumulen para siempre lo
       garantiza Input.pulso(), que los consume al leerlos. */
    if (pasos > 0) {
      Input.tactil().fuegoPulso = false;
      Input.limpiarPulsos();
    }
    Game.dibujar();
  }

  /* =============================================================
     ARRANQUE
     ============================================================= */
  function arrancar() {
    if (iniciado) return;
    iniciado = true;
    const lienzo = document.getElementById('lienzo');
    Input.init(lienzo);
    Ajustes.cargar();            // antes del render: la calidad elige el suavizado
    Game.init(lienzo);
    HUD.init();
    if (window.Tienda) Tienda.init();
    Device.init(Game);
    cablear();
    Ajustes.cablear();
    Ajustes.aplicarTodo();
    HUD.mostrar(false);
    pantalla('menu');
    figuraMenu();
    requestAnimationFrame(bucle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }

  global.__ir = ir;      // para poder saltar de pantalla desde una prueba
})(window);

