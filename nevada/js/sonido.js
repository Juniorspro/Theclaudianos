/* =============================================================
   sonido.js -> El audio del juego.

   DE DONDE SALE

   De Madness: Project Nexus Classic, del SWF original. La primera
   version de este archivo sintetizaba los 24 eventos a mano con
   osciladores y filtros; sonaba razonable pero no sonaba a Madness,
   porque el sonido de Madness no es una receta: es una biblioteca
   concreta que Krinkels y Swain eligieron hace quince años y que
   uno reconoce en dos disparos.

   El SWF lleva 137 DefineSound, todos MP3 mono a 22.050 Hz y 40
   kbps, con sus nombres exportados intactos -S_Gun_Glock,
   S_Melee_Block1, S_Track_Menu-. De ahi salen los 48 efectos y los
   4 temas que usa este juego. Los nombres de fichero se dejan tal
   cual estan en el original: asi se ve de donde viene cada cosa sin
   tener que fiarse de un comentario.

   CREDITOS  (ver tambien el README)
   Madness Combat y Madness: Project Nexus son de Matt "Krinkels"
   Jolly y Michael "The Swain" Swain. La musica es de Cheshyre.
   Nada de esto es mio y no se presenta como tal.

   DOS COSAS MEDIDAS QUE HAY QUE CORREGIR AL VUELO

   1. EL RETARDO DEL CODIFICADOR. Todo MP3 empieza con unas decenas
      de milisegundos de silencio que el codificador mete por su
      cuenta. El SWF lo sabe y guarda cuantas muestras saltarse
      (seekSamples: 1669 en 105 de los sonidos, 1633 en 28). Medido
      decodificando en Chromium, son entre 65 y 86 ms. En un
      disparo eso es un retardo que SE OYE: aprietas y suena tarde.
      Asi que cada muestra lleva su recorte y se arranca con
      start(0, recorte).

      El recorte se limita a 90 ms a proposito. Algunos sonidos
      -los silbidos de arma blanca, los bloqueos- tienen silencio
      de verdad al principio, que es el gesto antes del impacto:
      hasta 358 ms en S_Melee_Swish1. Ese silencio es diseño, no
      basura, y se respeta.

   2. LOS PICOS PASAN DE 1,0. Decodificar MP3 sobrepasa: medido,
      S_Gun_Uzi llega a 1,37 y hay ocho mas por encima de 1,1. Con
      tres enemigos disparando a la vez el bus satura y cruje. Cada
      muestra lleva su pico medido y se compensa, y ademas el
      maestro pasa por un limitador. Las dos cosas: la compensacion
      evita que un solo sonido reviente, el limitador evita que lo
      haga la suma.

   COMO SE CARGA
   Los efectos se descargan y descodifican a AudioBuffer -son 258
   KB en total, cabe de sobra-. La musica NO: son 1,7 MB y
   descodificada a PCM serian unos 30 MB de RAM, que en un TCL 20SE
   es medio presupuesto del navegador. Va por <audio> en tira, que
   descarga a medida que suena y no ocupa casi nada.

   Y se carga POR ORDEN DE FALTA: primero los seis de interfaz, que
   hacen falta en el mismo clic que arranca el audio, y el resto
   detras. Lo que todavia no este no suena, y eso solo puede pasar
   durante el primer segundo de menu.
   ============================================================= */
(function (global) {
  'use strict';

  const S = {};

  let ctx = null, maestro = null, limite = null, busJuego = null, busUI = null;
  let musNodo = null, musEl = null, musActual = null;
  const banco = {};        // evento -> [AudioBuffer|null, ...]
  const ultimo = {};       // evento -> t del ultimo disparo

  /* Donde viven los ficheros, relativo a la pagina. En el paquete
     de un solo archivo no hay ficheros: build.js deja las muestras
     en base64 dentro de global.__AUDIO y esto las coge de ahi. */
  S.RUTA = 'audio/';

  /* =================================================================
     EL BANCO

     'guardia' son los milisegundos minimos entre dos disparos del
     mismo evento: sin eso los ocho perdigones de una escopeta
     suenan a lata. Cada muestra es [nombre, pico medido, recorte].
     ================================================================= */
  const BANCO = {
    ui_mover:      { bus:'ui', vol:0.55, guardia: 40, f:[['S_Menu1',0.525,0.076]] },
    ui_pulsar:     { bus:'ui', vol:0.70, guardia: 50, f:[['S_Menu2',0.252,0.076]] },
    ui_volver:     { bus:'ui', vol:0.70, guardia: 50, f:[['S_Menu4',0.355,0.076]] },
    ui_entrar:     { bus:'ui', vol:0.65, guardia:200, f:[['S_Menu5',1.039,0.085]] },
    ui_nada:       { bus:'ui', vol:0.60, guardia: 80, f:[['S_StoreNoBuy',0.625,0.076]] },
    ui_compra:     { bus:'ui', vol:0.60, guardia: 80, f:[['S_StoreBuy',0.875,0.077]] },
    /* Los carteles de 'lines' -WAVE n y WAVE COMPLETE-: MadnessPopup
       llama a playSound('menu3') al abrir cualquiera de ellos, y la
       tabla lo manda a S_Menu3 (sacado del SWF, DefineSound 1247). */
    oleada:        { bus:'ui', vol:0.70, guardia:300, f:[['S_Menu3',1.158,0.074]] },
    puerta:        { bus:'juego', vol:0.50, guardia:120, f:[['S_Door',1.152,0.074]] },
    /* El panel de la arena. En el original, MadnessActivator llama
       a playSound('activator1') al pulsarlo y a 'activator2'
       cuando lo activa un companero de la IA; la tabla los manda a
       S_Activator1 y S_Activator2, que son estos mismos ficheros.
       Aqui solo se usa el primero: no hay companeros. */
    boton:         { bus:'juego', vol:0.85, guardia:200, f:[['S_Activator1',0.598,0.073]] },
    boton_ia:      { bus:'juego', vol:0.75, guardia:200, f:[['S_Activator2',0.932,0.081]] },
    tiro_pistol:   { bus:'juego', vol:0.80, guardia: 45, f:[['S_Gun_Glock',1.271,0.070], ['S_Gun_PPK',0.958,0.065], ['S_Gun_Beretta',1.031,0.070]] },
    tiro_revolver: { bus:'juego', vol:0.90, guardia: 60, f:[['S_Gun_Deagle',1.263,0.071], ['S_Gun_357',1.194,0.071]] },
    tiro_smg:      { bus:'juego', vol:0.62, guardia: 22, f:[['S_Gun_SMG1',0.998,0.069], ['S_Gun_SMG2',1.070,0.070], ['S_Gun_Uzi',1.370,0.071]] },
    tiro_shotgun:  { bus:'juego', vol:0.95, guardia: 90, f:[['S_Gun_Shotgun',1.146,0.070]] },
    tiro_rifle:    { bus:'juego', vol:0.78, guardia: 28, f:[['S_Gun_AK74',0.852,0.076], ['S_Gun_AR15',1.197,0.073], ['S_Gun_FAMAS',1.196,0.072]] },
    bombeo:        { bus:'juego', vol:0.70, guardia:120, f:[['S_Gun_ShotgunCock',0.946,0.077]] },
    vacio:         { bus:'juego', vol:0.90, guardia:140, f:[['S_Gun_EmptyClip',0.521,0.090]] },
    recargar:      { bus:'juego', vol:0.65, guardia:200, f:[['S_Gun_Reload',1.163,0.079]] },
    cambiar:       { bus:'juego', vol:0.85, guardia:120, f:[['S_Gun_Swap',0.429,0.090]] },
    /* 'swapmelee' y 'break' del SWF (SwainAudioPlayer: S_Melee_Swap a
       volumen x0,6 y S_Break a x0,5, frente al x0,7 de swapgun). Pico y
       recorte medidos descodificando en Chromium como los demas. */
    cambiarMelee:  { bus:'juego', vol:0.73, guardia:120, f:[['S_Melee_Swap',0.865,0.090]] },
    romper:        { bus:'juego', vol:0.61, guardia:120, f:[['S_Break',1.145,0.070]] },
    silbido:       { bus:'juego', vol:0.70, guardia: 60, f:[['S_Melee_Swish1',1.002,0.090], ['S_Melee_Swish2',0.982,0.090], ['S_Melee_Swish3',0.883,0.090]] },
    corte:         { bus:'juego', vol:0.75, guardia: 40, f:[['S_Melee_Slash1',1.110,0.090], ['S_Melee_Slash2',0.854,0.090], ['S_Melee_Slash4',0.946,0.090]] },
    romo:          { bus:'juego', vol:0.85, guardia: 40, f:[['S_Melee_Blunt1',0.433,0.086], ['S_Melee_Blunt2',0.574,0.083], ['S_Melee_Blunt3',0.989,0.089]] },
    /* 'blunt' del SWF: SwainAudioPlayer.soundLibrary lo manda a
       S_Melee_Blunt + randomNumber(1, 18) -los 18, DefineSound 1324 a
       1341- con volumen 100 (returnVolume). Suena al comprar un punto en
       STATS (MadnessTeamSetup.clickStat: buyStat, init3, playSound('blunt')).
       Pico y recorte medidos descodificando en Chromium, como los demas
       (umbral 0,005, que da los mismos 0,086 / 0,083 / 0,089 / 0,074 de
       Blunt1, 2, 3 y 8); el recorte con su tope de 90 ms (el Blunt6 va a
       11.025 Hz y arranca a 0,135 s). */
    blunt:         { bus:'ui', vol:0.85, guardia: 40, f:[['S_Melee_Blunt1',0.433,0.086], ['S_Melee_Blunt2',0.574,0.083], ['S_Melee_Blunt3',0.989,0.089],
                     ['S_Melee_Blunt4',0.611,0.081], ['S_Melee_Blunt5',1.008,0.073], ['S_Melee_Blunt6',1.187,0.090], ['S_Melee_Blunt7',1.023,0.076],
                     ['S_Melee_Blunt8',0.684,0.074], ['S_Melee_Blunt9',0.745,0.076], ['S_Melee_Blunt10',0.883,0.074], ['S_Melee_Blunt11',1.013,0.081],
                     ['S_Melee_Blunt12',1.089,0.075], ['S_Melee_Blunt13',1.021,0.078], ['S_Melee_Blunt14',1.052,0.075], ['S_Melee_Blunt15',1.040,0.076],
                     ['S_Melee_Blunt16',0.883,0.074], ['S_Melee_Blunt17',0.780,0.078], ['S_Melee_Blunt18',0.984,0.074]] },
    puno:          { bus:'juego', vol:0.55, guardia: 40, f:[['S_Melee_Blunt7',1.023,0.076], ['S_Melee_Blunt8',0.684,0.074]] },
    bloqueo:       { bus:'juego', vol:0.70, guardia: 60, f:[['S_Melee_Block1',1.281,0.090], ['S_Melee_Block2',1.185,0.090], ['S_Melee_Block3',1.086,0.090]] },
    metal:         { bus:'juego', vol:0.55, guardia: 50, f:[['S_Gun_Ricochet',1.116,0.073], ['S_Clang1',0.559,0.072], ['S_Clang2',0.542,0.075]] },
    /* 'ricochet' del SWF: S_Gun_Ricochet a x0,6 (returnVolume). Es el tiro
       que la armadura para entero (checkDamage, Actor.golpear). */
    rebote:        { bus:'juego', vol:0.60, guardia: 50, f:[['S_Gun_Ricochet',1.116,0.073]] },
    tac:           { bus:'juego', vol:0.60, guardia: 55, f:[['S_MetalBang',1.072,0.086], ['S_Clang3',0.396,0.072]] },
    caida:         { bus:'juego', vol:0.70, guardia: 70, f:[['S_Land1',0.688,0.076], ['S_Land2',0.726,0.078], ['S_Land3',0.675,0.090]] },
    caidaDura:     { bus:'juego', vol:0.85, guardia: 90, f:[['S_LandHard',0.907,0.074]] },
    herida:        { bus:'juego', vol:0.70, guardia: 55, f:[['S_Injury1',0.877,0.072], ['S_Injury2',0.844,0.071]] }
  };

  /* Los temas. 'S_Track_Menu' suena en el menu; en la arena van
     rotando por oleada, y a partir de la diez entra el de jefe. */
  const MUSICA = {
    menu:  'S_Track_Menu',
    arena: ['S_Track_Stage1', 'S_Track_Stage6'],
    jefe:  'S_Track_Boss1'
  };

  /* =================================================================
     ARRANQUE

     El AudioContext tiene que salir de un GESTO del usuario: en
     movil el navegador no deja crearlo de otra forma, y si se
     intenta antes queda 'suspended' para siempre y el juego se
     queda mudo sin avisar de nada.
     ================================================================= */
  S.listo = false;
  S.pendientes = 0;
  S.silencio = false;

  function cadena() {
    maestro = ctx.createGain();
    maestro.gain.value = 0.9;

    /* El limitador. No es un adorno: los MP3 del original pasan de
       1,0 al descodificar y en un tiroteo se suman cinco o seis a
       la vez. Umbral bajo y ratio alto es un limitador de verdad,
       no un compresor de color. */
    limite = ctx.createDynamicsCompressor();
    limite.threshold.value = -6;
    limite.knee.value = 0;
    limite.ratio.value = 20;
    limite.attack.value = 0.002;
    limite.release.value = 0.18;

    busJuego = ctx.createGain(); busJuego.gain.value = 1.0 * S.volEf;
    busUI    = ctx.createGain(); busUI.gain.value = 0.9 * S.volEf;
    busJuego.connect(maestro);
    busUI.connect(maestro);
    maestro.connect(limite);
    limite.connect(ctx.destination);
  }

  /* Base64 -> ArrayBuffer, para el paquete de un solo archivo. Se
     hace a mano en vez de con fetch('data:...') porque asi funciona
     igual abriendo el HTML con doble clic, sin servidor. */
  function deBase64(b64) {
    const s = atob(b64), n = s.length, a = new Uint8Array(n);
    for (let i = 0; i < n; i++) a[i] = s.charCodeAt(i);
    return a.buffer;
  }

  function crudo(nombre) {
    const emp = global.__AUDIO;
    if (emp && emp[nombre]) return Promise.resolve(deBase64(emp[nombre]));
    return fetch(S.RUTA + 'sfx/' + nombre + '.mp3').then((r) => {
      if (!r.ok) throw new Error(r.status + ' ' + nombre);
      return r.arrayBuffer();
    });
  }

  /* decodeAudioData con las dos firmas: la moderna devuelve una
     promesa, Safari viejo pide las dos funciones. */
  function descodificar(ab) {
    return new Promise((ok, mal) => {
      const p = ctx.decodeAudioData(ab, ok, mal);
      if (p && p.then) p.then(ok, mal);
    });
  }

  function cargarUno(ev, i) {
    const m = BANCO[ev].f[i];
    return crudo(m[0]).then(descodificar).then((buf) => {
      (banco[ev] || (banco[ev] = []))[i] = buf;
    }).catch((e) => {
      /* Que falte un sonido no puede tumbar el juego. Pasa al abrir
         el index.html con doble clic: fetch no lee file:// y el
         navegador lo corta por CORS. Se avisa una vez y se sigue. */
      if (!S.aviso) { S.aviso = true;
        console.warn('[sonido] no se pudo cargar el audio (' + e.message +
                     '). Si abriste el index.html con doble clic, hace falta ' +
                     'un servidor estatico, o usa el paquete de un solo archivo.'); }
      (banco[ev] || (banco[ev] = []))[i] = null;
    }).then(() => { S.pendientes = Math.max(0, S.pendientes - 1); });
  }

  const UI_YA = ['ui_pulsar', 'ui_mover', 'ui_volver', 'ui_nada', 'ui_entrar', 'ui_compra'];

  /* De seis en seis: un movil con 3G no agradece 48 peticiones a la
     vez, y ademas asi los de interfaz llegan de verdad primero. */
  function enCola(tareas, a_la_vez) {
    let i = 0;
    const uno = () => (i < tareas.length ? tareas[i++]().then(uno) : Promise.resolve());
    const hilos = [];
    for (let k = 0; k < a_la_vez; k++) hilos.push(uno());
    return Promise.all(hilos);
  }

  S.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    cadena();

    const ya = [], luego = [];
    for (const ev in BANCO) {
      const destino = UI_YA.indexOf(ev) >= 0 ? ya : luego;
      for (let i = 0; i < BANCO[ev].f.length; i++) {
        const e = ev, k = i;
        destino.push(() => cargarUno(e, k));
      }
    }
    S.pendientes = ya.length + luego.length;
    enCola(ya, 6).then(() => enCola(luego, 6)).then(() => { S.listo = true; });
  };

  /* Para las pruebas: espera a tenerlo todo. */
  S.terminar = function () {
    return new Promise((ok) => {
      const mira = () => (S.listo ? ok() : setTimeout(mira, 30));
      mira();
    });
  };

  /* =================================================================
     DISPARAR UN SONIDO

     'x' es la posicion en el mundo: lo que pasa a la izquierda se
     oye a la izquierda. Es gratis -un StereoPanner- y es la mitad
     de saber que te estan disparando por la espalda.
     ================================================================= */
  S.tocar = function (nombre, opts) {
    if (!ctx || S.silencio) return;
    const R = BANCO[nombre], v = banco[nombre];
    if (!R || !v) return;

    const ahora = ctx.currentTime;
    if (ultimo[nombre] !== undefined && ahora - ultimo[nombre] < R.guardia * 0.001) return;

    /* Se elige entre las que ya estan cargadas, no entre todas: si
       se sortea sobre el hueco, una de cada tres veces no suena. */
    const hechas = [];
    for (let i = 0; i < v.length; i++) if (v[i]) hechas.push(i);
    if (!hechas.length) return;
    ultimo[nombre] = ahora;

    const i = hechas[(Math.random() * hechas.length) | 0];
    const m = R.f[i];
    const src = ctx.createBufferSource();
    src.buffer = v[i];
    src.playbackRate.value = 1 + (Math.random() - 0.5) * (opts && opts.tono !== undefined ? opts.tono : 0.10);

    const o = opts || {};
    const g = ctx.createGain();
    /* vol del evento x compensacion del pico medido de ESTA muestra. */
    g.gain.value = R.vol * (o.vol === undefined ? 1 : o.vol) * (0.98 / Math.max(1, m[1]));

    let fin = g;
    if (o.x !== undefined && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      /* La arena mide 44 m; a media pantalla del centro ya suena
         del todo a un lado. Mas ancho que eso marea con auriculares. */
      p.pan.value = Math.max(-0.85, Math.min(0.85, (o.x - (o.cam || 0)) / 9));
      g.connect(p); fin = p;
    }
    fin.connect(R.bus === 'ui' ? busUI : busJuego);
    src.connect(g);
    src.start(0, m[2]);            // <- el recorte del retardo del codificador
  };

  /* =================================================================
     MUSICA

     Por <audio> y no por AudioBuffer, a proposito: los cuatro temas
     son 1,7 MB de MP3, pero descodificados a PCM de 32 bits son mas
     de 30 MB. En un movil de gama baja eso es pedir que el
     navegador mate la pestaña. Un <audio> en tira ocupa lo que
     ocupa su bufer y ya.
     ================================================================= */
  function fuenteMus() {
    if (musEl) return;
    musEl = new Audio();
    musEl.loop = true;
    musEl.preload = 'auto';
    musEl.crossOrigin = 'anonymous';
    /* Si no hay musica se calla y no se vuelve a intentar. Pasa con
       el paquete de un solo archivo hecho sin --con-musica: busca
       audio/mus/ al lado del HTML, y si no esta, no esta. Sin esto
       cada cambio de oleada deja un 404 en la consola. */
    musEl.addEventListener('error', () => {
      if (!S.sinMusica) {
        S.sinMusica = true;
        console.info('[sonido] sin musica (no encuentro ' + S.RUTA + 'mus/). ' +
                     'El juego va igual; para incrustarla: node madness/build.js --con-musica');
      }
      musActual = null;
    });
    if (ctx && ctx.createMediaElementSource) {
      try {
        const n = ctx.createMediaElementSource(musEl);
        musNodo = ctx.createGain();
        musNodo.gain.value = S.volMus;
        n.connect(musNodo);
        musNodo.connect(maestro);
      } catch (e) { musNodo = null; musEl.volume = 0.5; }
    } else { musEl.volume = 0.5; }
  }

  function rutaMus(n) {
    const emp = global.__MUSICA;
    if (emp && emp[n]) return 'data:audio/mpeg;base64,' + emp[n];
    return S.RUTA + 'mus/' + n + '.mp3';
  }

  /* 'que' es 'menu', 'jefe' o un numero de oleada. */
  S.musica = function (que) {
    if (S.silencio || S.sinMusica || S.sinMusicaAjuste || global.__SINMUSICA) return;
    let n;
    if (que === 'menu') n = MUSICA.menu;
    else if (que === 'jefe') n = MUSICA.jefe;
    else n = MUSICA.arena[(Math.max(1, que | 0) - 1) % MUSICA.arena.length];
    if (n === musActual && musEl && !musEl.paused) return;
    fuenteMus();
    /* NO SE CORTA UN TEMA, SE FUNDE.

       Cambiar musEl.src corta la reproduccion en seco, en el
       fotograma en que se cambia y a mitad de compas. Entre oleadas
       eso es un tijeretazo, y en el original no lo hay: la musica
       sigue y el cambio, cuando llega, no se nota.

       Asi que se baja el volumen en medio segundo, se cambia la
       pista con el tema ya callado y se vuelve a subir en otro
       medio. No es un crossfade de verdad -habria que tener dos
       elementos <audio> sonando a la vez y en un movil de gama baja
       eso es el doble de descodificacion-, pero resuelve lo unico
       que se oia mal, que era el corte. */
    const arranca = () => {
      musActual = n;
      musEl.src = rutaMus(n);
      const q = musEl.play();
      if (q && q.catch) q.catch(() => {});   // sin gesto todavia: se reintenta al siguiente
    };
    if (!musNodo || musActual === null || musEl.paused) { arranca(); subirMus(); return; }
    bajarMus();
    clearTimeout(musCambio);
    musCambio = setTimeout(() => { arranca(); subirMus(); }, 520);
  };

  const FUNDE = 0.5;
  let musCambio = 0;
  function rampa(a, dur) {
    if (!musNodo || !ctx) return;
    const t = ctx.currentTime;
    musNodo.gain.cancelScheduledValues(t);
    musNodo.gain.setValueAtTime(Math.max(0.0001, musNodo.gain.value), t);
    musNodo.gain.linearRampToValueAtTime(Math.max(0.0001, a), t + dur);
  }
  function bajarMus() { rampa(0.0001, FUNDE); }
  function subirMus() { if (musNodo) musNodo.gain.value = 0.0001; rampa(S.volMus, FUNDE); }
  S.volMus = 0.55;

  S.pararMusica = function (suave) {
    if (!musEl) return;
    musActual = null;
    if (!suave || !musNodo) { musEl.pause(); return; }
    const t = ctx.currentTime;
    musNodo.gain.cancelScheduledValues(t);
    musNodo.gain.setValueAtTime(musNodo.gain.value, t);
    musNodo.gain.linearRampToValueAtTime(0.0001, t + 0.7);
    setTimeout(() => { if (musEl) { musEl.pause(); musNodo.gain.value = S.volMus; } }, 750);
  };

  S.volMusica = function (v) {
    S.volMus = v;
    if (musNodo) musNodo.gain.value = v;
    else if (musEl) musEl.volume = v;
  };

  /* =================================================================
     LO DE SIEMPRE
     ================================================================= */
  S.muestra = function (nombre, i) { return (banco[nombre] || [])[i || 0] || null; };
  S.volumen = function (v) { if (maestro) maestro.gain.value = v; };
  /* El volumen de los efectos (ajustes): los dos buses, no el maestro,
     que por el pasa tambien la musica. 1,0 y 0,9 son los de cadena(). */
  S.volEf = 1;
  S.volEfectos = function (v) {
    S.volEf = v;
    if (busJuego) busJuego.gain.value = 1.0 * v;
    if (busUI) busUI.gain.value = 0.9 * v;
  };
  S.mudo = function (s) {
    S.silencio = !!s;
    if (s) S.pararMusica();
  };

  /* Que suena al disparar cada arma: la categoria del original. */
  S.arma = function (ficha) { return 'tiro_' + (ficha.cat || 'pistol'); };

  global.Sonido = S;
})(window);

