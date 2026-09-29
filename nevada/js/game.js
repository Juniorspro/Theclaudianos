/* =============================================================
   game.js -> La escena, la camara y el bucle.

   EL PRESUPUESTO
   El aparato de referencia es un TCL 20SE: Snapdragon 460, Adreno
   610, pantalla de 720 x 1640. Eso da margen para unos 120 draw
   calls y 60.000 triangulos a 60 fotogramas, y ni un solo
   post-proceso. El reparto queda asi:

     decorado      3 llamadas   (malla unica + telon + manchas)
     personajes    2 por cabeza (cuerpo y contorno)
     armas         1 por armado
     efectos       5 en total   (trazadoras, gotas, manchas,
                                 casquillos, sombras), todas
                                 instanciadas
     sombras       1

   Con quince enemigos en pantalla son unas 55 llamadas. El resto
   del presupuesto se deja libre a proposito: una arena a tope con
   sangre acumulada tiene que seguir yendo a 60, porque es
   justamente cuando peor viene un tiron.

   LA CAMARA
   Perspectiva de angulo muy cerrado (24 grados) y muy lejos. Casi
   es una ortografica, pero no del todo: ese pellizco de
   perspectiva es lo que hace que el decorado tenga fondo y que el
   personaje no parezca una calcomania. Sigue al jugador en X con
   retraso y se adelanta hacia donde mira.
   ============================================================= */
(function (global) {
  'use strict';

  const Game = {};
  const _v = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const OCULTO = new THREE.Matrix4().makeScale(0, 0, 0);

  const MAX_SOMBRAS = 96;   // tres por cuerpo: la del cuerpo y una por pie
  const MAX_SUELTAS = 14;

  Game.CALIDADES = {
    baja:  { escala: 0.62, antialias: false, maxEnemigos: 8,  sangre: 0.5, manchas: true },
    media: { escala: 0.82, antialias: false, maxEnemigos: 12, sangre: 1.0, manchas: true },
    alta:  { escala: 1.00, antialias: true,  maxEnemigos: 16, sangre: 1.0, manchas: true }
  };

  Game.init = function (lienzo) {
    Game.lienzo = lienzo;
    Game.calidad = U.store.get('madness.calidad', 'media');
    Game.sangreOn = U.store.get('madness.sangre', 1) !== 0;
    const cal = Game.CALIDADES[Game.calidad];

    Game.ren = new THREE.WebGLRenderer({
      canvas: lienzo, antialias: cal.antialias, alpha: false,
      powerPreference: 'high-performance', stencil: false, depth: true
    });
    Game.ren.setClearColor(0x0a0202, 1);
    Game.ren.sortObjects = true;

    Game.escena = new THREE.Scene();
    Game.escena.fog = null;     // niebla no: en Madness no hay aire

    Game.cam = new THREE.PerspectiveCamera(24, 16 / 9, 0.5, 120);
    /* Cuanto alto del mundo entra en pantalla. De aqui sale la
       distancia de la camara, no al reves: asi el personaje ocupa
       la misma porcion de pantalla en un movil apaisado y en un
       monitor, que es lo unico que importa para que el juego se
       sienta igual. */
    /* Cuanto se aleja la camara. Con 4,6 el muñeco ocupaba el 39%
       del alto de la pantalla y se sentia encima; a 5,6 baja al
       32% y el encuadre respira, que es como se ve el original:
       ahi el personaje no llega a un quinto del escenario. */
    /* CUANTO SE VE DE ALTO.

       Estaba en 5,6 m y se veia de demasiado cerca: la arena se
       quedaba fuera del encuadre y no se veian venir los que salen
       por las puertas de los extremos. A 9,5 entra la sala y los
       personajes ocupan lo que ocupan en el original -1,70 m de
       9,5 es el 18% del alto de pantalla-. En un TCL 20SE en
       horizontal eso son 129 px por muñeco, que se lee de sobra. */
    Game.ALTO_VISTA = 9.5;
    /* A 15 metros. Ver el comentario del redimensionado: con la
       camara picada, la distancia decide la altura, y la altura
       tiene que caber debajo del techo. */
    Game.DIST_CAM = 12;
    /* 15 grados de picado, medido sobre el video de Project Nexus
       2: la TAPA de un barril es un circulo, y con la camara
       picada se ve como una elipse cuya relacion alto/ancho es el
       seno del angulo. En el fotograma mide 13 px de alto por 50
       de ancho = 0,26, y asin(0,26) = 15 grados.

       (Primero lo medi sobre los cercos que el juego pinta en el
       suelo y me salio 26. Esos cercos no son circulos: son rombos
       con las puntas marcadas, y las puntas estiran la medida. El
       barril es un cilindro de verdad.) */
    Game.PICADO = 19 * Math.PI / 180;
    Game.camX = 0; Game.camY = 2.55; Game.camZ = 9; Game.camZfoco = 0.3;
    Game.sacudidaX = 0; Game.sacudidaY = 0;

    Art.initMaterials();
    Game.escena.add(Arena.construir({ semilla: 0x4e455641 }));
    /* La armeria por dentro, lejos, en x = 80 (armeria.js). */
    if (global.Armeria) { Game.escena.add(Armeria.construir()); Armeria.crearTendero(Game.escena); }
    Game.crearResaltes();
    /* la mira de los enemigos, creada ya: su dibujo carga asincrono y
       la primera que saliera se veria vacia */
    if (global.AI && AI.reticula) AI.reticula.crear(Game.escena);
    Game.sala = 'arena';
    Combat.init(Game.escena);
    Disparo.init(Game.escena, Game.cam);

    /* --- Sombras de contacto ---
       Ni mapas de sombra ni luces: una mancha oscura debajo de
       cada cuerpo, todas en una sola llamada. Es lo unico que hace
       falta para que un personaje no parezca flotar, y cuesta un
       draw call para toda la arena. */
    const gS = new THREE.PlaneGeometry(1, 1);
    gS.rotateX(-Math.PI / 2);
    Game.sombras = new THREE.InstancedMesh(gS, Art.mats.sombra, MAX_SOMBRAS);
    Game.sombras.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    Game.sombras.frustumCulled = false;
    Game.sombras.renderOrder = -2;
    Game.escena.add(Game.sombras);

    /* --- Armas tiradas por el suelo ---
       Cuando alguien muere suelta lo que llevaba. Se guardan en un
       deposito de catorce: si caen mas, se recicla la mas vieja.
       Que el arma del muerto siga ahi es media mecanica del juego:
       en Madness uno no lleva arsenal, lleva lo ultimo que cogio. */
    Game.sueltas = new U.Pool(MAX_SUELTAS, () => ({
      malla: null, id: null, obj: null, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, giro: 0, vr: 0,
      vuela: false, rueda: false, peligro: false, lanzador: null
    }));
    Game.sueltasGrupo = new THREE.Group();
    Game.escena.add(Game.sueltasGrupo);

    Mira.init(Game.escena);
    TacBar.init(Game.escena);
    Game.actores = [];
    Game.cerebros = [];
    Game.objetivos = [];
    Game.huecos = { n: 0 };
    Game.tiempo = 0;
    Game.pausa = false;
    Game.enMarcha = false;

    return Game;
  };

  Game.redimensionar = function (w, h) {
    if (!Game.ren) return;
    const cal = Game.CALIDADES[Game.calidad];
    /* La resolucion de render se separa del tamaño en pantalla: en
       un telefono de 720p bajar a 0,82 no se nota y devuelve un
       30% de relleno. Es la palanca mas barata que hay. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    /* la fraccion de la nativa la deciden los ajustes (fija o AUTO,
       ajustes.js); sin ellos, la de la calidad como siempre */
    const escala = global.Ajustes && Ajustes.v ? Ajustes.escala() : cal.escala * (dpr > 1.5 ? 0.9 : 1);
    Game.ren.setPixelRatio(dpr * escala);
    Game.ren.setSize(w, h, false);
    Game.cam.aspect = w / h;
    /* AHORA LA DISTANCIA MANDA Y EL ANGULO SALE DE ELLA, no al
       reves. Antes se fijaba el campo de vision y la distancia se
       deducia del encuadre, y eso daba entre 15 y 27 metros segun
       la pantalla. Con la camara horizontal daba igual; con la
       camara PICADA no, porque la altura a la que se pone es

         altura = ojo + D * sen(picado)

       o sea que a 27 m subia a 8 metros y se salia por el techo de
       la nave: encuadraba la cara de arriba de la losa y la
       pantalla se quedaba negra. Medido.

       Con D fijo en 15 m y 15 grados de picado, la camara se queda
       a 4,83 -por debajo del techo, que esta a 5,2- y el borde de
       arriba del encuadre apunta 2,5 grados hacia ARRIBA, que es
       lo justo para que el techo siga entrando en cuadro. */
    Game.camZ = Game.DIST_CAM;
    const fovBase = 2 * Math.atan((Game.ALTO_VISTA / 2) / Game.camZ) * 180 / Math.PI;
    /* Con la pantalla muy apaisada -un movil girado da 2,2:1- el
       encuadre vertical deja al jugador diminuto. Se compensa
       abriendo un poco el angulo cuanto mas ancha sea. */
    Game.cam.fov = U.clamp(fovBase * U.clamp((w / h) / 1.78, 0.9, 1.22), 22, 46);
    Game.cam.updateProjectionMatrix();
    /* La tinta: el casco (1,6 cm) medido en pixeles de render a la
       distancia de camara; el empuje solo completa hasta el minimo. */
    if (global.Art && Art.UNI_TINTA) {
      const altoPx = h * Game.ren.getPixelRatio();
      const altoM = 2 * Game.camZ * Math.tan(Game.cam.fov * Math.PI / 360);
      const cascoPx = 0.016 / altoM * altoPx;
      Art.UNI_TINTA.value = Math.max(0, Art.TINTA_MIN_PX - cascoPx) / altoPx;
    }
    document.documentElement.style.setProperty('--u', (h / 360) + 'px');
    /* La chapa del HUD se vuelve a trazar: su camino depende del
       ancho y con un path fijo las esquinas saldrian ovaladas. */
    if (global.HUD && HUD.medir) HUD.medir();
  };

  /* =============================================================
     PARTIDA
     ============================================================= */
  /* opts.armeria: reaparecer DENTRO de la armeria (tras morir: en el SWF,
     arena_1_resetB devuelve al menu de la armeria, arena_menu). */
  Game.empezar = function (opts) {
    opts = opts || {};
    Game.limpiar();
    Game.finPuesto = false;
    if (global.Armeria) Game.ponerSala('arena');
    Game.cruce = null;
    if (global.Tienda) Tienda.cerrar();
    { const v = document.getElementById('velo'); if (v) v.style.opacity = '0'; }
    Game.jugador = Player.crear({ x: 0, arma: opts.arma || 'puños' });
    /* LA FICHA DEL SWF (progreso.js): nivel, estadisticas, destrezas,
       ventajas y dinero, guardados entre partidas como MadnessSaveData. */
    if (global.Progreso) {
      if (!Progreso.ficha) Progreso.cargar();
      Progreso.aplicar(Game.jugador, Progreso.ficha, true);
      Progreso.ganado.xp = 0; Progreso.ganado.cash = 0;
    }
    HUD.nombre(Chars.TIPOS[Game.jugador.tipo].nombre);
    /* El retrato se pinta con el mismo muñeco y el mismo
       acelerador que el juego; ver HUD.retrato(). */
    HUD.retrato(Game.ren, Game.jugador.tipo);
    Game.escena.add(Game.jugador.grupo);
    Game.actores.push(Game.jugador);
    Game.objetivos.push(Actor.comoObjetivo(Game.jugador));
    /* LA ENTRADA DEL JUGADOR.

       No aparece puesto en medio de la arena: SALE por la puerta
       del centro, que es la de la tienda. Es la del original -en
       el SWF, addStartPointDoor(0,0) cuelga el punto de salida del
       jugador precisamente de la puerta 0, la que tiene
       myConnection a storeRoster y disableDoorSpawn-. Y es la
       unica por la que no salen enemigos.

       Medio segundo de puerta abriendose y el jugador andando
       hacia el frente dice, sin un solo cartel, quien eres y por
       donde has entrado. */
    const pTienda = Arena.puertas && Arena.puertas.find((p) => p.tienda);
    if (opts.armeria && global.Armeria) {
      /* Dentro de la armeria, delante de su puerta, donde deja el cruce. */
      Game.ponerSala('armeria');
      Game.jugador.x = Armeria.CX - Armeria.ANCHO / 2 + Armeria.MARGEN + 0.7;
      Game.jugador.z = Armeria.PUERTA_Z;
      Game.jugador.mirando = 1; Game.jugador.giro = 0;
      Actor.colocar(Game.jugador);
      Game.camX = U.clamp(Game.jugador.x, Arena.CX - Math.max(0, Arena.limite() - 6), Arena.CX + Math.max(0, Arena.limite() - 6));
    } else if (pTienda) {
      /* SALE DEL FONDO DEL PASO, igual que un enemigo, y zPuerta
         es la distancia DE VERDAD.

         Estaba a 1,35 m de la puerta pero naciendo a 3,63 -o sea
         con zPuerta mintiendo en mas de dos metros-, y como
         'saliendo' es z/-zPuerta y va recortado a 1, el resultado
         era que valia 1 durante los primeros 2,3 metros y luego se
         desplomaba: medido, el giro del cuerpo saltaba de 0 a 0,69
         radianes en UN fotograma. Y los primeros 0,4 segundos el
         muñeco andaba por detras del muro, sin verse.

         Naciendo a 55 cm del plano de la hoja -lo mismo que
         Game.soltar- sale del fondo negro del vano y 'saliendo'
         baja de 1 a 0 sin un solo escalon. */
      const zIni = pTienda.z - 0.55;
      Game.jugador.x = pTienda.x;
      Game.jugador.z = zIni;
      Game.jugador.zPuerta = -zIni;
      Game.jugador.saliendo = 1;
      Game.jugador.salFondo = 1;
      Game.jugador.mirando = 1;
      /* De frente a camara al arrancar; el giro a la pose de pelea
         lo hace Actor.actualizar segun sale del vano. */
      Game.jugador.giro = 0;
      Actor.colocar(Game.jugador);
      pTienda.estado = 'abriendo';
      pTienda.t = 0;
    }

    Game.olas = Waves.crear();
    /* El dinero es el de la ficha (MadnessRoster.playerRoster.myCash). */
    if (global.Progreso) Object.defineProperty(Game.olas, 'dinero', {
      get: () => Progreso.ficha.myCash,
      set: (v) => { Progreso.ficha.myCash = v; Progreso.guardar(); }
    });
    /* LA PRIMERA OLEADA TAMBIEN LA ARRANCA EL PANEL.

       Antes empezaba sola, y por eso el boton no servia para nada:
       para cuando el jugador terminaba de salir por la puerta ya
       tenia enemigos encima, asi que nunca llegaba a verlo
       encendido. Ahora la partida arranca EN RESPIRO, con la
       oleada 0: se sale por la puerta, se ve el panel latiendo al
       lado, se va y se aprieta. Que es lo que dice el original:

         "Activate this panel with your SPACE bar to get that
          door open."

       Sin cuenta atras, y esto tambien es a proposito: aqui no hay
       nada de lo que descansar todavia, asi que si el reloj la
       arrancara solo volveriamos a lo de antes. La red de
       seguridad de la cuenta atras se queda para los respiros de
       en medio, donde el jugador YA sabe que existe el panel. */
    Game.olas.oleada = 0;
    /* CONTINUE (loadGame): las armas del lider en sus ranuras, con las
       balas y el desgaste que tenian, y la arena por la oleada guardada
       (generateArena(currentWave)): el panel abre la siguiente. */
    if (opts.continuar && global.Progreso && Progreso.ficha) {
      const F = Progreso.ficha, j = Game.jugador;
      j.armas = [0, 1].map((i) => {
        const d = F.myWeapons && F.myWeapons[i];
        if (!d || !Weapons.CAT[d.id]) return null;
        const o = Weapons.equipar(d.id);
        for (const k of ['cargador', 'cargas', 'salud', 'roto']) if (d[k] !== undefined) o[k] = d[k];
        return o;
      });
      j.ranura = F.ranura === 1 && j.armas[1] ? 1 : 0;
      Actor.empuñar(j, j.armas[j.ranura]);
      Game.olas.oleada = Math.max(0, F.arenaOla | 0);
    }
    Waves.respirar(Game.olas, Infinity);
    if (global.Cartel) Cartel.cerrarTodo();
    Sonido.musica(1);
    Game.enMarcha = true;
    Game.pausa = false;
    Game.tiempo = 0;
    return Game.jugador;
  };

  /* LA PARTIDA A LA FICHA (MadnessSaveData.saveGame): las armas del
     lider con lo que les queda, la ranura en mano y la ultima oleada
     TERMINADA. Se llama al cerrar el TEST RESULTS de cada oleada
     (arena_1_reset -> arena_menu, donde el SWF guarda), al comprar, y al
     salir del juego (QUIT, al menu o al cerrar la app, como el guardado
     de gameMenu del SWF): a media oleada se guarda la anterior, y al
     volver esa oleada se repite entera. Muerto no: eso lo guarda
     arena_1_dead (oleada 1 y sin armas). */
  /* USAR EL PANEL (interactType 'activator' -> myStatus 'use'): el muñeco
     va hasta delante de la placa (a 0,55 m de su cara: el brazo llega),
     se vuelve hacia la pared y hace la animacion 'use' del SWF (sprite
     5354, 44 cuadros); en el cuadro 14, useActivator: el boton suena y la
     oleada arranca (Arena.panel.tocado, que lee el respiro). */
  Game.usarPanel = function (jug) {
    const P = Arena.panel;
    if (!P || jug.man || jug.irA) return false;
    /* DONDE PARARSE PARA QUE LA MANO CAIGA EN EL BOTON. Medido en el cuadro
       14 de 'use' (useActivator), de cara a la pared (rumbo -90): la mano
       que se estira es la izquierda y queda 0,35 m a la derecha del
       muñeco (+x), 0,44 m por delante (-z) y a 1,06 m de alto -el boton
       esta a 1,02-. Parado justo enfrente, la mano tocaba la pared a un
       palmo del boton. La cara de la placa esta 0,08 por delante de P.z. */
    const x = P.x - 0.35, z = P.z + 0.08 + 0.44;
    return Actor.irAPunto(jug, x, z, -Math.PI / 2, () => {
      Actor.maniobra(jug, 'use', {
        useActivator: () => {
          if (!P.activo || P.tocado) return;
          P.tocado = true;
          Sonido.tocar('boton', { x: P.x, cam: Game.camX });
        }
      });
    });
  };

  Game.guardarPartida = function () {
    const F = global.Progreso && Progreso.ficha, j = Game.jugador, W = Game.olas;
    if (!F || !j || !W || !Game.enMarcha || Game.patio || !j.vivo || Game.finPuesto) return;
    F.myWeapons = (j.armas || [null, null]).slice(0, 2).map((o) => (o && o.id && o.id !== 'puños')
      ? { id: o.id, cargador: o.cargador, cargas: o.cargas, salud: o.salud, roto: !!o.roto } : null);
    while (F.myWeapons.length < 2) F.myWeapons.push(null);
    F.ranura = j.ranura || 0;
    F.arenaOla = Math.max(0, W.estado === 'combate' ? W.oleada - 1 : W.oleada);
    Progreso.guardar();
  };

  /* =============================================================
     LA PUERTA DE LA ARMERIA

     En el SWF la puerta 0 de la arena es la de la tienda
     (myConnection = storeRoster): por ahi se pasa a la armeria. Aqui
     igual, y SOLO entre oleadas -la luz verde de esa puerta es
     justamente eso-: pegado a la hoja y empujando hacia el fondo, se
     abre, fundido a negro y se aparece dentro, delante de la puerta de
     su lateral izquierda. Para volver, lo mismo contra esa puerta.

     El fundido va con el reloj de la interfaz: 0,25 s a negro, el
     cambio de sala a oscuras y 0,25 s de vuelta.
     ============================================================= */
  const SALAS = {
    arena:   () => ({ cx: 0, largo: 44, margen: 1.8 }),
    armeria: () => ({ cx: Armeria.CX, largo: Armeria.ANCHO, margen: Armeria.MARGEN })
  };
  Game.ponerSala = function (s) {
    const d = SALAS[s]();
    Game.sala = s;
    /* Los trastos que empujan (Arena.empujar) son los de la sala en la
       que se esta. */
    if (!Game._trastosArena) Game._trastosArena = Arena.trastos;
    Arena.trastos = s === 'armeria' ? Armeria.trastos : Game._trastosArena;
    Arena.CX = d.cx; Arena.LARGO = d.largo; Arena.MARGEN_X = d.margen;
  };
  /* EL CRUCE, CON SU ANIMACION.

     Antes el jugador desaparecia en cuanto rozaba la hoja y aparecia
     dentro con la puerta aun subiendo, suelto, donde cayera. Ahora es
     lo que se ve en el SWF cuando alguien pasa por una puerta:

       abrir    se pierde el control; la hoja sube (0,2 s, la curva del
                SWF) mientras el muñeco se pone delante del vano
       entrar   anda hacia dentro del vano, a paso (2,35 m/s, el de
                salir de las puertas), hasta meterse en lo oscuro
       negro    0,25 s de fundido, siempre andando
       --       a oscuras: cambio de sala; aparece DENTRO del vano de
                la otra puerta, que ya esta abierta del todo (no se la
                ve subir: por ahi se acaba de entrar)
       salir    0,25 s de vuelta de la oscuridad mientras sale andando
                hasta un paso por delante de la puerta; ahi se le
                devuelve el control y la puerta se cierra detras

     Los puntos del recorrido estan en el mundo; 'guionCruce' convierte
     el siguiente en la palanca del jugador, asi que anda con su
     animacion de siempre, girando hacia donde va. */
  const PASO_CRUCE = 0.06;
  function puertaTienda() { return Arena.puertas && Arena.puertas.find((p) => p.tienda); }
  function recorrido(destino, jug) {
    const pT = puertaTienda(), X0 = Armeria.CX - Armeria.ANCHO / 2, PZ = Armeria.PUERTA_Z;
    // [frente de la puerta de salida, dentro de su vano], [dentro del vano de llegada, fuera]
    if (destino === 'armeria') return {
      ida: [[pT.x, pT.z + 0.25], [pT.x, pT.z - 0.75]],
      vuelta: [[X0 - 0.55, PZ], [X0 + Armeria.MARGEN + 0.7, PZ]] };
    return {
      ida: [[X0 + Armeria.MARGEN + 0.2, PZ], [X0 - 0.75, PZ]],
      vuelta: [[pT.x, pT.z - 0.55], [pT.x, pT.z + 1.0]] };
  }
  Game.cruzar = function (destino) {
    if (Game.cruce || !global.Armeria) return false;
    const jug = Game.jugador, r = recorrido(destino, jug);
    /* Si ya esta mas cerca del fondo del vano que el punto de delante de
       la puerta, no se le hace recular hasta el: va derecho. */
    const [a, b2] = r.ida, dA = Math.hypot(b2[0] - a[0], b2[1] - a[1]);
    const ida = Math.hypot(b2[0] - jug.x, b2[1] - jug.z) < dA ? [b2] : r.ida.slice();
    Game.cruce = { fase: 'abrir', t: 0, destino: destino, puntos: ida, vuelta: r.vuelta };
    jug.guion = true; jug.sinTope = true;
    if (global.Mira) { Mira.blanco = null; Mira.fijado = false; }
    const p = destino === 'armeria' ? puertaTienda() : Armeria.puerta;
    if (destino === 'armeria') Arena.abrirPuerta(p);
    else if (p.estado === 'cerrada' || p.estado === 'cerrando') {
      p.estado = 'abriendo'; p.t = 0; Sonido.tocar('puerta', { x: 0, cam: 0 });
    }
    p.ocupada = true;
    return true;
  };
  /* La palanca del guion: hacia el siguiente punto, a paso. */
  Game.guionCruce = function (entrada, jug) {
    const c = Game.cruce;
    entrada.mover = 0; entrada.moverZ = 0; entrada.correr = false; entrada.salto = false;
    if (!c.puntos.length || (c.fase === 'abrir' && c.t < 0.08)) return;
    const [tx, tz] = c.puntos[0];
    const dx = tx - jug.x, dz = tz - jug.z, d = Math.hypot(dx, dz);
    if (d < PASO_CRUCE) { c.puntos.shift(); return; }
    // la palanca entera anda; al llegar se afloja para no pasarse
    const k = Math.min(1, d / 0.35) || 0;
    entrada.mover = dx / d * Math.max(0.35, k);
    entrada.moverZ = dz / d * Math.max(0.35, k);
  };
  Game.pasoCruce = function (dt, jug, entrada, W) {
    const velo = document.getElementById('velo');
    const c = Game.cruce;
    if (c) {
      c.t += dt;
      if (c.fase === 'abrir' && c.t >= Arena.P_ABRIR * 0.6) c.fase = 'entrar';
      // en lo oscuro del vano: el primer punto ya se paso y el segundo esta cerca
      if (c.fase === 'entrar' && c.puntos.length === 1 &&
          Math.hypot(c.puntos[0][0] - jug.x, c.puntos[0][1] - jug.z) < 0.5) { c.fase = 'negro'; c.t0 = c.t; }
      if (c.fase === 'entrar' && !c.puntos.length) { c.fase = 'negro'; c.t0 = c.t; }
      if (c.fase === 'negro') {
        const f = (c.t - c.t0) / 0.25;
        if (velo) velo.style.opacity = String(Math.min(1, f));
        if (f >= 1) {
          /* A OSCURAS: cambio de sala */
          const salida = c.destino === 'armeria' ? puertaTienda() : Armeria.puerta;
          salida.ocupada = false;                     // ya se cerrara sola, sin nadie delante
          Game.ponerSala(c.destino);
          const [x0, z0] = c.vuelta[0];
          jug.x = x0; jug.z = z0; jug.vx = 0; jug.vz = 0;
          const [x1, z1] = c.vuelta[1];
          jug.rumbo = jug.rumboObj = Math.atan2(z1 - z0, x1 - x0); jug.paso = 0;
          const llegada = c.destino === 'armeria' ? Armeria.puerta : puertaTienda();
          Arena.abiertaYa(llegada);
          Game.camX = U.clamp(jug.x, Arena.CX - Math.max(0, Arena.limite() - 6), Arena.CX + Math.max(0, Arena.limite() - 6));
          c.puntos = c.vuelta.slice(1);
          c.fase = 'salir'; c.t0 = c.t;
        }
      } else if (c.fase === 'salir') {
        if (velo) velo.style.opacity = String(Math.max(0, 1 - (c.t - c.t0) / 0.25));
        if (!c.puntos.length && c.t - c.t0 >= 0.25) {
          const llegada = c.destino === 'armeria' ? Armeria.puerta : puertaTienda();
          llegada.ocupada = false;
          jug.guion = false; jug.sinTope = false;
          Game.cruce = null;
          if (velo) velo.style.opacity = '0';
        }
      }
      return;
    }
    if (!jug.vivo || !global.Armeria) return;
    if (Game.sala === 'arena') {
      /* Solo entre oleadas y pegado a la hoja de la tienda, empujando
         hacia el fondo. */
      const pT = puertaTienda();
      if (pT && W.estado === 'respiro' && !W.cerrojo && Math.abs(jug.x - pT.x) < pT.AN * 0.4 &&
          jug.z < pT.z + 0.35 && (entrada.moverZ || 0) < -0.5) Game.cruzar('armeria');
    } else {
      const p = Armeria.puerta;
      if (jug.x < Arena.CX - Arena.limite() + 0.15 && Math.abs(jug.z - Armeria.PUERTA_Z) < p.AN * 0.4 &&
          (entrada.mover || 0) < -0.5) Game.cruzar('arena');
    }
  };

  Game.limpiar = function () {
    for (let i = 0; i < Game.actores.length; i++) {
      Actor.destruir(Game.actores[i], Game.escena);
    }
    Game.actores.length = 0;
    Game.cerebros.length = 0;
    Game.objetivos.length = 0;
    Game.huecos.n = 0;
    /* la mira de un enemigo que ya no esta, y su destello */
    if (global.AI && AI.apuntador) AI.soltarMira(AI.apuntador);
    if (global.AI && AI.pasoMira) AI.pasoMira(0, null, []);
    Game.sueltas.clear((s) => { if (s.malla) s.malla.visible = false; });
    Combat.limpiarManchas();
    Disparo.limpiar();
    TacBar.limpiar();
    if (global.Cartel) Cartel.cerrarTodo();
  };

  Game.soltar = function (tipo, arma, x, mirando, z, lateral) {
    /* La puerta ya sono al abrirse, en Arena.abrirPuerta. Aqui
       sonaba otra vez cuando el enemigo salia del hueco: dos
       puertas por cada uno que entra. */
    const A = Actor.crear({ tipo: tipo, arma: arma, x: x, mirando: mirando, z: 0 });
    if (lateral) {
      /* PUERTA DE EXTREMO: se sale por la X y de perfil.

         Antes estas soltaban igual que las del fondo -con la z
         corrida 55 cm-, asi que un enemigo de la puerta de la
         derecha nacia con la x de esa puerta pero saliendo hacia
         la camara: cruzaba la pared DEL FONDO, no la suya, y
         encima lo hacia mirando de frente. Aqui sale andando hacia
         dentro de la arena, que es lo que se ve en el original.

         Nace 55 cm por fuera del plano de la hoja -dentro del
         vano, tapado por la jamba- y anda hasta el tope de la
         arena. */
      A.x = x - mirando * 0.55;
      A.salLado = mirando;
      A.salX = Math.abs((mirando > 0 ? -Arena.limite() : Arena.limite()) - A.x);
      /* Y EN LA Z DE SU PUERTA, no en cero.

         Estaba clavado a z = 0, que era el plano de pelea de cuando
         esto era un pasillo. Las puertas de los extremos estan
         ahora centradas en la pared, a z = 1,75, asi que el enemigo
         nacia metro y tres cuartos por delante de su propia puerta:
         salia de la pared lisa, no del hueco.

         El que llama pasa la z ya corrida 55 cm hacia el fondo -que
         es lo que necesita la puerta del FONDO para nacer dentro
         del vano-, asi que aqui se le devuelven: por una puerta de
         costado no se entra desde el fondo, se entra desde el lado. */
      A.z = (z === undefined ? 0 : z + 0.55);
      A.saliendo = 0;
    } else if (z !== undefined) {
      /* PUERTA DEL FONDO: sale ANDANDO desde el hueco hacia el
         plano de pelea, y de frente mientras cruza el vano. Sin
         esto aparecia ya en el sitio y la puerta era un adorno. */
      A.z = z; A.zPuerta = -z; A.saliendo = 1; A.salFondo = 1;
      A.giro = 0;                 // arranca de cara a camara
    }
    A.bando = 'enemigo';
    Game.escena.add(A.grupo);
    Game.actores.push(A);
    Game.objetivos.push(Actor.comoObjetivo(A));
    Game.cerebros.push(AI.crear(A));
    return A;
  };

  /* UN ARMA QUE CAE AL SUELO (dropGun, la muerte). o es el objeto del
     arma (Weapons.equipar) con lo que le quede; un id suelto crea una
     nueva con cargador y cargas dados. Cae DONDE cayo su dueño, tambien
     en profundidad. Devuelve el bulto del suelo. */
  Game.tirarArma = function (o, x, y, cargador, z, cargas) {
    if (!o) return null;
    if (typeof o === 'string') {
      if (o === 'puños') return null;
      o = Weapons.equipar(o);
      if (cargador !== undefined) o.cargador = cargador;
      if (cargas !== undefined) o.cargas = cargas;
    }
    if (o.id === 'puños') return null;
    const s = Game.sueltas.take();
    if (!s.malla) {
      s.malla = new THREE.Group();
      Game.sueltasGrupo.add(s.malla);
    }
    while (s.malla.children.length) s.malla.remove(s.malla.children[0]);
    s.malla.userData.tinte = null;
    const m = Weapons.crear(o.id);
    if (m) s.malla.add(m);
    s.malla.visible = true;
    s.obj = o; s.id = o.id;
    s.x = x; s.y = y + 0.4; s.vy = 2.2; s.vx = 0; s.vz = 0; s.vr = 0;
    s.z = z === undefined ? 0.35 : z;
    s.giro = U.rng() * 6;
    s.vuela = false; s.rueda = false; s.peligro = false; s.lanzador = null;
    return s;
  };

  /* throwWeapon (121731..122962): el arma sale de la mano como particula
     'thrown' (peligrosa: MadnessParticle.init la pasa a 'gun' con
     amDangerous) y al pararse queda como pickup. Con la mira horizontal
     (|rotacion| = 90 en la de SwainMath, 0 arriba):
       x  (25 + STR/2 + 10 x blanca) px/cuadro
       y  -(25 + STR/2 + 10 x blanca) + (30 + STR/2) x 70/90 px/cuadro
     o sea casi recta la de fuego (-1,7 px/cuadro hacia arriba) y con
     comba la blanca (-11,7); gira 10 grados/cuadro (70 la blanca), rebota
     x0,5 (inBounce) y cae con MadnessParticle.gravity = 2,8 px/cuadro². */
  const PXM = 0.214 / 13.06, CPS = 30;
  Game.lanzarArma = function (o, A, desde) {
    const p = desde || { x: A.x, y: A.y + 1.0, z: A.z || 0 };
    const s = Game.tirarArma(o, p.x, p.y - 0.4, undefined, p.z);
    if (!s) return null;
    const blanca = o.ficha.tipo === 'melee' ? 1 : 0;
    const str = Math.max(0, ((A.modDmg || 1) - 1) * 15);        // modDmg = 1 + STR/15
    const H = 25 + str / 2 + 10 * blanca;
    const vyPx = -H + (30 + str / 2) * (70 / 90);
    const dir = Math.cos(A.rumbo) >= 0 ? 1 : -1;
    s.y = p.y;
    s.vx = Math.cos(A.rumbo) * H * CPS * PXM;
    s.vz = Math.sin(A.rumbo) * H * CPS * PXM;
    s.vy = -vyPx * CPS * PXM;
    s.vr = -dir * (blanca ? 70 : 10) * CPS * Math.PI / 180;
    s.giro = 0;
    s.vuela = true; s.rueda = false; s.peligro = true; s.lanzador = A;
    return s;
  };

  /* El golpe del arma lanzada (MadnessParticle, 9273..10883 y
     hitCharacter 12882..13520): a cualquiera de otro bando que no este
     esquivando, a menos de 40 px de fondo y dentro de su ancho y su alto;
     en la cabeza si da en myHead. El daño lo pone assignWeaponDamage
     (14030..14158):
       myDamage / 2 + |((xSpeed + ySpeed) - 20) / 2| / 4
     con xSpeed e ySpeed en px/cuadro, y con el arma de la blanca
     (createWeapon del mismo tipo) o la de los puños (unarmedWeapon) si es
     de fuego. Lo aplica checkDamage sin atacante con ficha: ni STR ni
     perks, y no pasa por la TAC (eso lo mira checkMeleeHit). Despues deja
     de ser peligrosa, rebota hacia atras x0,2 y a la blanca le quita 2 de
     myHealth (nunca de 1 para abajo). */
  function golpeLanzada(s) {
    const L = s.lanzador;
    for (let i = 0; i < Game.actores.length; i++) {
      const A = Game.actores[i];
      if (!A.vivo || A === L || (L && A.bando === L.bando) || A.esquiva > 0 || A.salFondo > 0) continue;
      if (Math.abs(s.z - (A.z || 0)) > 40 * PXM) continue;
      if (Math.abs(s.x - A.x) > A.r || s.y < A.y || s.y > A.y + A.alto) continue;
      const o = s.obj, blanca = o.ficha.tipo === 'melee';
      const xs = s.vx / (CPS * PXM), ys = -s.vy / (CPS * PXM);
      const dano = o.ficha.dano / 2 + Math.abs(((xs + ys) - 20) / 2) / 4;
      const cabeza = s.y > A.y + Actor.cabezaBaja(A);
      const info = { arma: { id: 'lanzada', ficha: blanca ? o.ficha : Weapons.CAT['puños'] },
                     enRango: true, apuntado: true, lanzada: true, cabeza: cabeza, sello: ++Actor.sello };
      const ex = Math.sign(s.vx || 1) * 1.2;
      Actor.golpear(A, dano, ex, 0.4, s.x, s.y, L, info, Math.sign(s.vz) * 0.4);
      Combat.impactoMelee(s.x, s.y, s.z, Math.sign(s.vx || 1), dano, blanca && o.ficha.corta, Math.sign(s.vz), false);
      Sonido.tocar(blanca && o.ficha.corta ? 'corte' : 'romo', { x: s.x, cam: Game.camX });
      s.peligro = false;
      s.vx *= -0.2; s.vz *= -0.2; s.vr *= -0.2;
      if (blanca && o.saludMax > 0) o.salud = Math.max(1, o.salud - 2);
      return;
    }
  }

  /* =============================================================
     EL BUCLE
  /* =============================================================
     EL BUCLE
     ============================================================= */
  /* LA OLEADA n, YA ANUNCIADA: la llama el cartel de WAVE n al
     cerrarse, que es lo que hace arena_1_waves en el original. */
  Game.soltarOleada = function (n) {
    const W = Game.olas;
    if (!W || W.estado !== 'anuncio') return;
    Waves.empezar(W, n);
    /* EL TEMA NO CAMBIA EN CADA OLEADA.

       Estaba llamado con W.oleada, y como la musica se elige
       con oleada-1 modulo el numero de temas, cambiaba de pista
       CADA RONDA: cuatro compases y a otra cosa. En el original
       el tema se oye entero y el cambio, cuando llega, no se
       nota.

       Aqui el tema dura cinco oleadas -con el bucle del propio
       <audio>, o sea que se oye completo las veces que haga
       falta- y de la diez en adelante entra el de jefe, que es
       la forma mas barata que tiene el juego de decir "esto ya
       va en serio" sin un cartel. El propio Sonido.musica no
       hace nada si el tema pedido ya esta sonando, y cuando si
       cambia, lo funde. */
    Sonido.musica(W.oleada >= 10 ? 'jefe' : 1 + Math.floor((W.oleada - 1) / 5) * 5);
  };

  Game.paso = function (dt) {
    if (!Game.enMarcha || Game.pausa) return;
    Game.tiempo += dt;

    const jug = Game.jugador;
    const W = Game.olas;

    /* EL BULLET TIME DEL SWF (MadnessCharacter, t178352).

       Mientras esta activo, la velocidad del mundo (myGameSpeed) pasa de
       1 a 0, y eso hace dos cosas a TODOS -tambien al jugador, que en
       nivel 1 no tiene los perks de bullet time-:
         · las animaciones avanzan 1 cuadro por tic en vez de 2
           (SpeedFrameSkipper.adjustFrames: nextFrame x myGameSpeed+1):
           van al 50%;
         · el desplazamiento se multiplica por slowmoSpeedMod = 0,4 +
           0,6 x myGameSpeed: al 40%. Tambien las particulas.
       Aqui: dtMundo al 50% y el desplazamiento un 0,8 mas (0,5 x 0,8 =
       0,4). La camara, la mira y la interfaz van en tiempo real, y la
       barra se gasta en tiempo real: 1 cuadro por tic, 400 de tope = 13,3 s. */
    if (jug.bulletTime) {
      jug.slowMo = Math.max(0, jug.slowMo - dt * 30);
      /* Se corta sola al vaciarse, y al quedar aturdido o morir (el
         original la apaga en 'stun', 'dead' y 'knockback'). */
      if (jug.slowMo <= 0 || !jug.vivo || jug.aturdido > 0) jug.bulletTime = false;
    }
    const escala = jug.bulletTime ? 0.5 : 1;
    Game.movLento = jug.bulletTime ? 0.8 : 1;
    const dtMundo = dt * escala;

    /* --- Grifo de enemigos --- */
    if (W.estado === 'combate') {
      const vivos = Game.contarVivos();
      const cal = Game.CALIDADES[Game.calidad];
      if (vivos < cal.maxEnemigos) {
        /* Los enemigos NO aparecen: SALEN por una puerta, y la
           puerta se abre antes. Eso es medio segundo de aviso -la
           hoja moviendose y la luz en verde- que el jugador puede
           usar, y es lo que hace el original: sus puertas tienen
           mySpawnTimer y el bicho sale del hueco.

           Si las cuatro que sueltan estan ocupadas no se suelta a
           nadie este fotograma. Antes no habia cola: se elegia una
           de las dos a cara o cruz y aparecian dos a la vez en el
           mismo sitio, uno dentro de otro. */
        const p = Arena.puertaLibre(U.rng);
        if (p) {
          const sig = Waves.siguiente(W, dt, vivos);
          if (sig) {
            Arena.abrirPuerta(p);
            p.pendiente = sig;
            /* Empieza a andar cuando la hoja ya ha subido mas de
               medio cuerpo: asi se le ve aparecer POR DEBAJO de la
               puerta que sube, que es lo que pasa en el original,
               en vez de materializarse con la puerta ya abierta. */
            p.espera = Arena.P_ABRIR * 0.42;
          }
        }
      }
      /* Los que ya tienen puerta abierta y les toca salir. */
      for (let i = 0; i < Arena.puertas.length; i++) {
        const p = Arena.puertas[i];
        if (!p.pendiente) continue;
        p.espera -= dt;
        if (p.espera > 0) continue;
        /* Nace en el FONDO del paso, no en el plano de la hoja: se
           le ve salir de lo oscuro. */
        Game.soltar(p.pendiente.tipo, p.pendiente.arma, p.x, p.lado,
                    p.z - 0.55, p.dir !== 'fondo');
        p.pendiente = null;
      }
      if (Waves.terminada(W, vivos)) {
        /* NO HAY CUENTA ATRAS NI TIENDA. Como en el original
           (MadnessEvents.arena_1_clear): el cartel de WAVE COMPLETE,
           con su S_Menu3, y la ronda siguiente la abre el panel de la
           pared y nada mas. La tienda es la ARMERIA, al otro lado de
           su puerta; no una ventana que salta en mitad de la sala. */
        Waves.respirar(W, Infinity);
        Cartel.lines('WAVE COMPLETE', 90);
        /* arena_1_clear: tras el cartel, addBuffer(70, arena_1_pause) -el
           mundo se para- y la ventana 'arena' (TEST RESULTS) con lo ganado.
           DONE es arena_1_reset: se vuelca lo que falte y se guarda. */
        if (global.PopArena) Cartel.espera(70, () => {
          Game.pausa = true;
          PopArena.mostrar(() => {
            const F = Progreso.ficha;
            if (F.myWaves < W.oleada) F.myWaves = W.oleada;
            W.cerrojo = false;             // arena_1_reset: unlockDoor(0, 0)
            Game.guardarPartida();
            Game.pausa = false;
          });
        });
        else W.cerrojo = false;
      }
    } else if (W.estado === 'respiro') {
      /* EL PANEL ABRE LA RONDA, y es lo unico que la abre. Y no la
         suelta de golpe: como en arena_1_START, una espera de 10
         fotogramas y el cartel de WAVE n, y los enemigos salen
         cuando el cartel se cierra (su funcion es arena_1_waves). */
      if (Arena.panel && Arena.panel.tocado) {
        W.estado = 'anuncio';
        const n = W.oleada + 1;
        Cartel.espera(10);
        Cartel.lines('WAVE ' + n, 90, () => Game.soltarOleada(n));
      }
    }

    /* --- Jugador --- */
    const e = Input.leer();
    /* SALIENDO POR LA PUERTA NO SE JUEGA, Y SE DESCARTA AQUI.

       El corte estaba dentro de Player.actualizar, que es el ultimo
       de la lista: para cuando llegaba, ya se habian llamado
       Mira.paso, Player.atacar, recargar, esquivar, bullet time y
       recoger. O sea que se podia disparar, esquivar y cambiar de
       arma con medio cuerpo todavia dentro de la puerta, que es
       justo lo que se veia. Se corta arriba, antes de leer nada, y
       ademas se limpian los pulsos para que un boton apretado
       durante la entrada no salte de golpe al terminar. */
    /* Cruzando la puerta de la armeria tampoco: lleva el guion. */
    const entrando = jug.vivo && (Actor.enVano(jug) || !!Game.cruce || !!(global.Tienda && Tienda.abierta));
    /* Los pulsos se consumen igual, para que un boton apretado
       durante la entrada no salte de golpe al pisar la arena. */
    if (entrando) Input.limpiarPulsos();
    const entrada = entrando
      ? { mover: 0, moverZ: 0, correr: false, salto: false }
      : { mover: e.mover, moverZ: e.moverZ, correr: e.correr, salto: e.salto };
    if (Game.cruce) Game.guionCruce(entrada, jug);
    if (!entrando) {
      /* La mira se mueve ANTES que el jugador: el personaje se
         orienta hacia donde ella esta, no al reves. */
      /* En tiempo REAL: en el original la mira es el raton y el bullet
         time no la frena. Es la gracia: el mundo lento, tu punteria no. */
      Mira.paso(dt, jug, Game.entradaMira(e), Game.objetivos);
      /* El FLANCO del boton, ademas del nivel: con arma de fuego
         mantener dispara a su cadencia, pero un golpe sale por cada
         pulsacion. Con solo el nivel, un toque de 100 ms son seis
         pasos con el boton abajo y los que caian durante el golpe lo
         dejaban encolado: un toque, dos golpes. */
      const flanco = !!e.atacar && !Game._atacaba;
      Game._atacaba = !!e.atacar;
      /* EL PANEL SE APRIETA CON ATACAR: cerca de el, el boton no pega, va
         y lo usa (Game.usarPanel). Mientras dura, tampoco. */
      const P = Arena.panel;
      if (flanco && P && P.activo && P.cerca && Game.sala === 'arena' && !jug.man && !jug.irA) Game.usarPanel(jug);
      else if (e.atacar && !(jug.man && jug.man.nombre === 'use') && !(jug.irA && jug.irA.punto)) Player.atacar(jug, Game.objetivos, flanco);
      if (Input.pulso('recargar')) Player.recargar(jug);
      /* toggleGuard (32824..33536) partido en dos botones: BLOQUEAR
         mantenido es la guardia (solo con arma blanca) y ESQUIVA, la
         esquiva, siempre. */
      const blanca = jug.arma.id !== 'puños' && jug.arma.ficha.tipo === 'melee';
      Actor.guardia(jug, blanca && !!e.guardia);
      if (Input.pulso('esquiva')) { Actor.guardia(jug, false); Player.esquivar(jug); }
      if (Input.pulso('furia')) Player.bulletTime(jug);
      /* togglePickup, como en el SWF (32453..32809): con la mano vacia va
         a por el arma resaltada y la recoge; con algo en la mano, la
         lanza hacia la mira. Nada desaparece: lo lanzado queda en el
         suelo con lo que le quede. */
      if (Input.pulso('recoger')) Player.recoger(jug, Game.sueltas.items);
      if (Input.pulso('tirar')) Player.tirar(jug);
      // toggleAction: la otra ranura (Actor.cambiar)
      if (Input.pulso('cambiar') && !Actor.cambiar(jug) && !jug.man && !Actor.puedeCambiar(jug) &&
          !Progreso.perk(jug, 'perkSidearm1')) {
        /* sin Sidearm1 no hay segunda ranura (toggleAction no hace nada):
           se dice por que, en vez de un boton que parece roto */
        HUD.aviso('SEGUNDA ARMA: FUERZA 5 (SIDEARM)');
      }
    }
    /* El jugador con SU myGameSpeed (Player.gs): los perks de bullet
       time y de puños lo aceleran respecto del mundo. Sin perks da lo
       mismo que antes: dtMundo y el 0,8 de Game.movLento. */
    jug.gs = Player.gs(jug);
    jug.kMov = Player.kMov(jug, jug.gs);
    Player.actualizar(jug, dt * (jug.gs + 1) / 2, Game.tiempo, Game.objetivos, entrada);

    /* --- Enemigos --- */
    /* Los cadaveres: un paso del motor de fisica para todos, con los
       vivos dentro como cilindros que empujan (ragdoll.js). */
    // los cadaveres, como las particulas del original: al 40% en bullet time
    if (global.Ragdolls) Ragdolls.paso(dtMundo * Game.movLento, Game.actores);
    for (let i = 0; i < Game.cerebros.length; i++) {
      const B = Game.cerebros[i];
      AI.actualizar(B, dtMundo, jug, Game.huecos, Game.objetivos);
      Actor.actualizar(B.a, dtMundo, Game.tiempo);
    }

    /* --- Que nadie ocupe el sitio de otro --- */
    Actor.separar(Game.actores, dtMundo);
    /* --- Bajas y limpieza --- */
    for (let i = Game.actores.length - 1; i >= 0; i--) {
      const A = Game.actores[i];
      if (A === jug) continue;
      if (!A.vivo && !A.contado) {
        A.contado = true;
        Waves.bajaEnemiga(W, A.tipo);
        /* appropriateXP (Arena): el dinero de la baja va al fondo de la
           oleada sea quien sea el que mata; la XP solo si mato el jugador. */
        if (global.Progreso) {
          const r = Progreso.recompensa(A.asesino ? (A.asesino.nivel || 0) : 0, A.nivel || 0, A.asesino === jug);
          Progreso.ganado.cash += r.cash; Progreso.ganado.xp += r.xp;
        }
        jug.bajas++;
        /* La barra de bullet time se carga con las bajas del JUGADOR:
           +20 cuadros por baja, +10 si ya estaba en bullet time (t178358,
           appropriateXP). Tope 400. */
        if (A.asesino === jug) {
          jug.slowMo = Math.min(Player.SLOWMO_MAX, jug.slowMo + (jug.bulletTime ? 10 : 20));
        }
        jug.combo++; jug.tCombo = 2.4;
        if (A.soltoAlMorir) Game.tirarArma(A.soltoAlMorir, A.x, A.y + 0.6, undefined, A.z);
      }
      // los cuerpos se quedan un rato y luego se van, para no
      // gastar draw calls en decorado que ya no cuenta nada
      if (!A.vivo && A.muerte > 7) {
        Actor.destruir(A, Game.escena);
        Game.actores.splice(i, 1);
        const k = Game.objetivos.findIndex((o) => o.actor === A);
        if (k >= 0) Game.objetivos.splice(k, 1);
        const c = Game.cerebros.findIndex((b) => b.a === A);
        if (c >= 0) Game.cerebros.splice(c, 1);
      }
    }

    if (!jug.vivo && !Game.finPuesto) {
      Game.finPuesto = true;
      /* arena_1_dead: totalWaves vuelve a 1 y se guarda; addBuffer(20) y
         la ventana 'arena' con lo ganado; DONE (arena_1_resetB) vuelve a
         la armeria. El 1,1 s de antes es la caida del cuerpo. */
      if (global.PopArena) {
        setTimeout(() => {
          if (global.Cartel) Cartel.cerrarTodo();
          const F = Progreso.ficha;
          if (F.myWaves < W.oleada) F.myWaves = W.oleada;
          /* totalWaves = 1: la proxima partida empieza de cero, y el
             muerto no conserva lo que llevaba en las manos */
          F.arenaOla = 0; F.myWeapons = [null, null]; F.ranura = 0;
          Progreso.guardar();
          Game.pausa = true;
          PopArena.mostrar(() => {
            Game.pausa = false;
            Game.empezar({ armeria: true, arma: 'puños' });
          });
        }, 1100 + 20 / 30 * 1000);
      } else setTimeout(() => HUD.muerte(W, jug), 1100);
    }

    Game.actualizarSueltas(dtMundo);
    Game.pasoResaltes(dt, jug);
    Game.pasoCruce(dt, jug, entrada, W);
    if (global.Tienda) Tienda.paso(jug);
    Arena.pasoPuertas(dtMundo);
    if (global.Armeria) Armeria.paso(dtMundo);
    Arena.pasoVentilacion(dt);
    /* El panel se enciende cuando toca arrancar una ronda. Va con
       el dt de la interfaz, no con el del mundo: el latido de una
       bombilla no se ralentiza porque el jugador entre en bullet time. */
    /* Los carteles de WAVE n / WAVE COMPLETE corren con el reloj de
       la interfaz, a sus 30 tics por segundo. */
    Cartel.paso(dt);
    if (Arena.panel) {
      /* Y el panel no se enciende mientras quede un cartel en pie: en
         el original la sala no se reabre hasta que la ventana se ha
         ido (arena_1_reset). */
      Arena.panel.activo = (W.estado === 'respiro') && !W.cerrojo && !Cartel.ocupado() && !(global.PopArena && PopArena.abierta);
      /* a su alcance; lo aprieta Game.usarPanel con ATACAR */
      Arena.panel.cerca = Arena.pasoPanel(dt, jug);
      if (W.estado !== 'respiro') Arena.panel.tocado = false;
    }
    if (AI.pasoMira) AI.pasoMira(dtMundo, jug, Game.objetivos);   // la mira de los enemigos (aimTimer)
    Combat.actualizar(dtMundo);
    Disparo.actualizar(dtMundo);
    Game.actualizarSombras();
    Game.actualizarCamara(dt);
    Mira.dibujar(jug);
    /* Las TAC de todo el que lleve una, sobre su cabeza. No es solo
       cosa del jugador: cualquier actor con barra la enseña, que es
       como funciona en el original. */
    TacBar.dibujar(Game.actores, Game.cam, dt);
    HUD.actualizar(jug, W, Game.contarVivos());
  };

  Game.contarVivos = function () {
    let n = 0;
    for (let i = 0; i < Game.actores.length; i++) {
      const A = Game.actores[i];
      if (A !== Game.jugador && A.vivo) n++;
    }
    return n;
  };

  /* Lo que la mira necesita cada fotograma: o un punto absoluto
     -el raton ya esta en un sitio del mundo- o un empujon en metros
     -el dedo solo da un arrastre-. */
  const _mira = { miraDX: 0, miraDY: 0, miraNdc: null };
  const _ndcRaton = { x: 0, y: 0 };
  Game.entradaMira = function (e) {
    _mira.miraDX = 0; _mira.miraDY = 0; _mira.miraNdc = null; _mira.dedo = false; _mira.tactil = false;
    if (Input.modoTactil) {
      const t = Input.tactil();
      _mira.tactil = true;
      _mira.dedo = !!t.apuntando;          // el dedo de apuntar sigue apoyado
      if (t.miraDX || t.miraDY) {
        /* EL ARRASTRE VA EN FRACCIONES DE PANTALLA, SIN TRADUCIR.

           Antes se pasaba a metros de mundo aqui -ancho de vista por
           la fraccion- y mira.js lo sumaba a una coordenada del
           suelo. Con la camara picada eso no cuadra: un centimetro
           de dedo hacia arriba son metros distintos segun donde
           este la mira, y hacia los lados tampoco coincide con la
           pantalla. De ahi que arrastrar a la derecha no llevara la
           mira a la derecha.

           Ahora el gesto llega crudo y lo resuelve mira.js
           proyectando: la mira se mueve por la PANTALLA los pixeles
           que se ha movido el dedo, y el angulo sale de deshacer
           esa proyeccion. */
        _mira.miraDX = t.miraDX;
        _mira.miraDY = t.miraDY;
        t.miraDX = 0; t.miraDY = 0;
      }
      return _mira;
    }
    if (e.raton.dentro) {
      /* El puntero es un punto de la pantalla y mira.js apunta a lo que
         hay debajo de el (Mira.paso, resolverMira). */
      _ndcRaton.x = e.raton.x; _ndcRaton.y = e.raton.y;
      _mira.miraNdc = _ndcRaton;
    }
    return _mira;
  };

  /* Las armas del suelo: las que caen (dropGun) dan su botecito; las
     lanzadas vuelan como la particula del SWF (Game.lanzarArma). */
  const G_PART = 2.8 * CPS * CPS * PXM;         // MadnessParticle.gravity, en m/s²
  let _pulso = 0;
  Game.pickupJugador = null;
  Game.actualizarSueltas = function (dt) {
    // la sala en la que se esta: la arena o la Armory (x = 80)
    const enArm = Game.sala === 'armeria' && global.Armeria;
    const cx = enArm ? Armeria.CX : Arena.CX, lim = enArm ? Armeria.ANCHO / 2 - 0.5 : Arena.limite();
    const zA = Arena.Z_ATRAS, zF = Arena.Z_FRENTE;
    Game.sueltas.forEach((s) => {
      if (!s.malla) return;
      if (s.vuela) {
        s.vy -= G_PART * dt;
        s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
        s.giro += s.vr * dt;
        /* contra la pared: rebota x inBounce, deja de ser peligrosa y suena
           'clang' (7859..8022) */
        if (Math.abs(s.x - cx) > lim) {
          s.x = cx + Math.sign(s.x - cx) * lim; s.vx *= -0.5; s.vr *= -1;
          if (s.peligro) Sonido.tocar('metal', { x: s.x, cam: Game.camX, vol: 0.6 });
          s.peligro = false;
        }
        if (s.z < zA || s.z > zF) { s.z = U.clamp(s.z, zA, zF); s.vz *= -0.5; s.peligro = false; }
        /* el suelo (6051..6174): cayendo a menos de 8 px/cuadro se queda
           rodando; si no, bota x0,5 y pierde un cuarto de velocidad */
        if (s.y <= 0.10) {
          s.y = 0.10;
          if (-s.vy < 8 * CPS * PXM) { s.rueda = true; s.vy = 0; }
          else { s.vy = -s.vy * 0.5; s.vx *= 0.75; s.vz *= 0.75; s.vr *= -0.5; }
        }
        /* rodando: x0,75 por cuadro (8357..8456) hasta pararse (menos de
           2 px/cuadro): entonces queda de pickup (killMe -> allPickups) */
        if (s.rueda) {
          const k = Math.pow(0.75, dt * CPS);
          s.vx *= k; s.vz *= k; s.vr *= k;
          if (Math.hypot(s.vx, s.vz) < 2 * CPS * PXM) { s.vuela = false; s.peligro = false; s.vx = s.vz = s.vr = 0; }
        }
        if (s.peligro) golpeLanzada(s);
        s.malla.position.set(s.x, s.y, s.z);
        s.malla.rotation.set(0, 1.2, s.vuela ? s.giro : 1.5708);
        return;
      }
      s.vy -= 24 * dt;
      s.y += s.vy * dt;
      if (s.y <= 0.10) { s.y = 0.10; s.vy = 0; }
      else s.giro += dt * 7;
      s.malla.position.set(s.x, s.y, s.z === undefined ? 0.35 : s.z);
      s.malla.rotation.set(0, 1.2, s.vy === 0 ? 1.5708 : s.giro);
    });
    /* EL RESALTADO (MadnessCharacter 27078..27262 y MadnessParticle
       11734..12043): cada 10 cuadros (PulseTimer 10), si el jugador esta
       quieto, andando o corriendo y sin destino fijado, su targetPickup es
       el findClosestPickup(true) de la caja de +-55 x +-35 px; en otro
       estado que no sea recoger o dash se borra. Ese, y solo ese, se tiñe:
       verde si se puede usar, rojo si es un arma de fuego vacia. */
    const jug = Game.jugador;
    _pulso += dt;
    if (jug && _pulso >= 10 / CPS) {
      _pulso = 0;
      if (!jug.vivo || Actor.fuera(jug) || jug.esquiva > 0) Game.pickupJugador = null;
      else if (!jug.man && !jug.irA) Game.pickupJugador = Actor.pickupCercano(jug, Game.sueltas.items, true);
    }
    const t = Game.pickupJugador;
    if (t && (!t.alive || t.vuela)) Game.pickupJugador = null;
    Game.sueltas.forEach((s) => {
      if (s.malla) Weapons.tintar(s.malla, s === Game.pickupJugador ? (Weapons.vacia(s.obj) ? 'rojo' : 'verde') : null);
    });
  };

  /* =============================================================
     LO USABLE DEL ENTORNO, RESALTADO

     En el SWF solo el arma del suelo a tiro se tiñe (+250 verde, ver
     actualizarSueltas); los paneles se leen por su dibujo -la bombilla
     que late, sus cuadros 1 y 2- y las puertas por la luz de su cerradura.
     Aqui, ademas, lo que se puede usar AHORA y esta cerca lleva un
     contorno del mismo verde que el arma a tiro, latiendo al ritmo del
     panel (6,6 rad/s, Arena.pasoPanel): el panel de 'Press to Start', la
     puerta ARMORY (entre oleadas), la puerta de vuelta y la ventana de la
     tienda. Un anillo plano por objeto, una llamada de dibujo cada uno y
     solo mientras se ve.
     ============================================================= */
  const VERDE_USO = 0x00fa00, CERCA_USO = 4.0, GROSOR_USO = 0.045;
  /* EL MARCO DE UNA PUERTA: una U, sin tira de abajo (sobre el suelo se
     veia sucia). Los lados bajan hasta el piso (4 mm por encima, para que
     el suelo no se los coma) y arriba cierra el dintel. Origen en el piso. */
  const SUELO_USO = 0.004;
  function anilloPuerta(w, h) {
    const t = GROSOR_USO, S = new THREE.Shape();
    S.moveTo(-w / 2 - t, 0); S.lineTo(-w / 2 - t, h + t); S.lineTo(w / 2 + t, h + t); S.lineTo(w / 2 + t, 0);
    S.lineTo(w / 2, 0); S.lineTo(w / 2, h); S.lineTo(-w / 2, h); S.lineTo(-w / 2, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: VERDE_USO, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    /* ADELANTADO 0,30 m EN PROFUNDIDAD, como la tinta del torso (aAde):
       cada vertice se acerca a la camara por su propia linea de vista, asi
       que en pantalla no se mueve, pero en el Z le gana a la jamba, al
       marco y a la franja oscura del pie de la pared, que le comian los
       lados desde media altura hasta el suelo. Un muñeco parado delante de
       la puerta (a mas de 0,30) lo sigue tapando. */
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>',
        'vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );\n' +
        'float dzUso = -mvPosition.z;\n' +
        'mvPosition.xyz *= max( dzUso - 0.30, 0.05 ) / dzUso;\n' +
        'gl_Position = projectionMatrix * mvPosition;');
    };
    const m = new THREE.Mesh(new THREE.ShapeGeometry(S), mat);
    m.visible = false; m.renderOrder = 4;
    m.userData.dy = SUELO_USO;
    Game.escena.add(m);
    return m;
  }
  function anillo(w, h) {
    const t = GROSOR_USO, S = new THREE.Shape();
    S.moveTo(-w / 2 - t, -h / 2 - t); S.lineTo(w / 2 + t, -h / 2 - t); S.lineTo(w / 2 + t, h / 2 + t); S.lineTo(-w / 2 - t, h / 2 + t);
    const Hh = new THREE.Path();
    Hh.moveTo(-w / 2, -h / 2); Hh.lineTo(-w / 2, h / 2); Hh.lineTo(w / 2, h / 2); Hh.lineTo(w / 2, -h / 2);
    S.holes.push(Hh);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(S), new THREE.MeshBasicMaterial({
      color: VERDE_USO, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.visible = false; m.renderOrder = 4;
    Game.escena.add(m);
    return m;
  }
  Game.crearResaltes = function () {
    const R = Game.resaltes = [];
    const P = Arena.panel;
    /* el boton del panel: su marco negro, 0,48 x 0,66, 0,09 por delante del
       zocalo (Arena, 'EL ORDEN EN Z') */
    if (P) R.push({ m: anillo(0.48, 0.66), x: P.x, y: P.y, z: P.z + 0.10, ry: 0,
                    usable: () => P.activo && Game.sala === 'arena' });
    const pT = Arena.puertas && Arena.puertas.find((p) => p.tienda);
    // por delante del marco 3D de la puerta (0,11 + 0,004 del plano de la hoja: Arena.puerta)
    if (pT) R.push({ m: anilloPuerta(pT.AN, pT.AL), x: pT.cx, y: null, z: pT.cz + 0.13, ry: 0,
                     usable: () => Game.sala === 'arena' && Game.olas && Game.olas.estado === 'respiro' && !Game.olas.cerrojo });
    if (global.Armeria && Armeria.puerta) {
      const pu = Armeria.puerta;
      R.push({ m: anilloPuerta(pu.AN, pu.AL), x: pu.x + 0.05, y: null, z: pu.z, ry: Math.PI / 2,   // grupo en -MX-0,09, marco +0,13
               usable: () => Game.sala === 'armeria' });
    }
    if (global.Armeria && Armeria.SHOP) {
      const SH = Armeria.SHOP;
      R.push({ m: anillo(SH.an, SH.y1 - SH.y0), x: Armeria.CX + SH.x, y: (SH.y0 + SH.y1) / 2, z: Arena.FONDO + 0.25 + 0.02, ry: 0,
               usable: () => Game.sala === 'armeria' && !(global.Tienda && Tienda.abierta) });
    }
    for (const r of R) { r.m.position.set(r.x, r.y === null ? r.m.userData.dy : r.y, r.z); r.m.rotation.y = r.ry; }
  };
  let _tUso = 0;
  Game.pasoResaltes = function (dt, jug) {
    if (!Game.resaltes) return;
    _tUso += dt;
    const k = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(_tUso * 6.6));
    for (const r of Game.resaltes) {
      const ver = !!(jug && jug.vivo && !Game.cruce && r.usable() &&
                     Math.hypot(jug.x - r.x, (jug.z || 0) - r.z) < CERCA_USO);
      r.m.visible = ver;
      if (ver) r.m.material.opacity = 0.85 * k;
    }
  };

  /* LA SOMBRA DE CADA PIE. Con una sola mancha por cuerpo el pie no
     tocaba nada: la mancha se quedaba quieta debajo del torso mientras
     el pie andaba, y la suela se leia hundida en el piso. Cada pie
     lleva la suya, con la huella del pie (Chars.PIE: 0,315 x 0,18),
     orientada como el pie y centrada en su suela, que en el hueso esta
     0,171 por debajo del pivote (0,187 - 0,016 que se levanta la suela)
     y 0,022 por delante (el centro entre talon y punta). Al levantarse
     se encoge: a 25 cm del suelo ya no hay. Mismo InstancedMesh, cero
     llamadas de dibujo nuevas. */
  const _pc = new THREE.Vector3(), _pf = new THREE.Vector3();
  function sombrasPies(A, i) {
    const c = A.cuerpo;
    if (!c || !c.huesos || !global.Chars || i + 2 > MAX_SOMBRAS) return i;
    const P = Chars.PIE, zc = P.z0 + P.largo / 2;
    for (const id of [Chars.H.PIE_I, Chars.H.PIE_D]) {
      const b = c.huesos[id];
      b.updateWorldMatrix(true, false);
      _pc.set(0, -0.171, zc).applyMatrix4(b.matrixWorld);
      _pf.set(0, -0.171, zc + 1).applyMatrix4(b.matrixWorld).sub(_pc);
      const k = U.clamp(1 - _pc.y / 0.25, 0, 1);
      if (k <= 0) continue;
      const e = 0.55 + 0.45 * k;
      _v.set(_pc.x, 0.017, _pc.z);
      _q.setFromAxisAngle(_eje, Math.atan2(_pf.x, _pf.z));
      _s.set(P.ancho * 2.2 * e, 1, P.largo * 1.6 * e);   // la mancha es blanda: asoma alrededor de la suela
      _m.compose(_v, _q, _s);
      Game.sombras.setMatrixAt(i++, _m);
    }
    return i;
  }
  const _eje = new THREE.Vector3(0, 1, 0);

  Game.actualizarSombras = function () {
    let i = 0;
    for (let k = 0; k < Game.actores.length && i < MAX_SOMBRAS; k++) {
      const A = Game.actores[k];
      // la sombra se encoge y se aclara con la altura: es lo unico
      // que informa de si alguien esta saltando
      const alto = U.clamp(1 - A.y * 0.32, 0.35, 1);
      const r = A.r * 3.1 * alto;
      _v.set(A.x, 0.016, A.z + 0.05);
      _q.set(0, 0, 0, 1);
      _s.set(r, 1, r * 0.62);
      _m.compose(_v, _q, _s);
      Game.sombras.setMatrixAt(i++, _m);
      i = sombrasPies(A, i);
    }
    for (let k = i; k < MAX_SOMBRAS; k++) Game.sombras.setMatrixAt(k, OCULTO);
    Game.sombras.instanceMatrix.needsUpdate = true;
  };

  Game.actualizarCamara = function (dt) {
    const jug = Game.jugador;
    /* La camara se adelanta hacia donde mira el jugador: asi ve
       venir lo que le va a atacar en vez de descubrirlo cuando ya
       le esta pegando. Y sigue en X con retraso, nunca clavada,
       porque una camara pegada al personaje marea. */
    const meta = jug.x + jug.mirando * 2.0 + jug.vx * 0.22;
    /* Alrededor del centro de la sala en la que se este (Arena.CX); en
       una sala mas estrecha que el encuadre, quieta en el centro. */
    const hol = Math.max(0, Arena.limite() - 6);
    Game.camX = U.damp(Game.camX, U.clamp(meta, Arena.CX - hol, Arena.CX + hol), 4.2, dt);
    /* La altura de camara sube con el encuadre: con 9,5 m de alto
       y la camara a 1,72 el suelo se comia media pantalla. */
    /* Y ahora tambien sigue en PROFUNDIDAD. El foco va un poco por
       delante del jugador -0,35 del camino hacia el frente de la
       sala- para que, estando el pegado a la pared, siga entrando
       suelo por abajo en vez de quedarse el encuadre lleno de
       muro. */
    /* LA CAMARA NO SIGUE AL JUGADOR EN PROFUNDIDAD. PUNTO.

       Primero fue 0,72 y luego 0,50, y las dos veces el problema es
       el mismo: si la camara avanza cuando el jugador avanza, el
       suelo tiene que seguir existiendo por delante de ella, asi
       que la sala no se puede acabar nunca. De ahi los veintiun
       metros de suelo y la pared invisible plantada en medio de la
       nada.

       Con la camara CLAVADA en z = 1,6 la sala pasa a ser un
       escenario: el borde de abajo del cuadro corta el suelo
       siempre en el mismo sitio -7,55 m-, asi que ahi se puede
       poner el tope de juego y se acabo la pared invisible. El
       jugador se mueve DENTRO del encuadre, que es lo que hace
       MPN2, en vez de arrastrarlo. Y de paso la sala mide diez
       metros de fondo en vez de veintiuno.

       En x si sigue, porque la arena mide 44 m y ahi no hay
       escenario que valga. */
    Game.camZfoco = 1.6;

    const s = Combat.sacudida;
    if (s > 0.001) {
      Game.sacudidaX = (Math.random() - 0.5) * s * 0.55;
      Game.sacudidaY = (Math.random() - 0.5) * s * 0.42;
    } else { Game.sacudidaX = 0; Game.sacudidaY = 0; }

    /* LA CAMARA DE PROJECT NEXUS 2, MEDIDA.

       Estaba casi horizontal -miraba 62 cm por debajo de si misma,
       o sea unos 2 grados- porque el juego era de izquierda a
       derecha y no habia suelo que enseñar. Con la arena
       convertida en habitacion hace falta ver el suelo, y el
       angulo no es una eleccion libre: sale del video.

       Los cercos que Project Nexus pinta en el suelo son CIRCULOS.
       Con la camara picada se ven como elipses, y la relacion
       alto/ancho de una elipse asi es exactamente el seno del
       angulo. Medido sobre el fotograma: 38,3 px de alto por 86,7
       de ancho = 0,442, o sea

         picado = asin(0,442) = 26,2 grados

       La camara se coloca sobre una esfera alrededor del punto que
       mira: sube D*sin(26,2) y se aleja D*cos(26,2). Asi el picado
       es el mismo a cualquier distancia, que es lo que hace que la
       arena se lea igual en un movil apaisado que en un monitor. */
    const PIC = Game.PICADO;
    const D = Game.camZ;
    const oy = 0.95;                     // se mira al pecho, no a los pies
    Game.cam.position.set(
      Game.camX + Game.sacudidaX,
      oy + D * Math.sin(PIC) + Game.sacudidaY,
      Game.camZfoco + D * Math.cos(PIC));
    Game.cam.lookAt(Game.camX, oy, Game.camZfoco);
    // el telon se mueve menos que la camara: parallax barato
    if (Arena.telon) Arena.telon.position.x = Game.camX * 0.55;
  };

  /* El fondo del menu: la ciudad de Nevada, no la arena.

     Antes el menu paseaba la camara por la arena vacia. Costaba lo
     mismo que una partida y se veia lo que era: un almacen con las
     luces apagadas. El menu del original no esta dentro del sitio
     donde se pelea, esta fuera, mirando la ciudad. */
  Game.pasoMenu = function (dt) {
    if (!Game.ciudad) Game.ciudad = Ciudad.crear();
    Ciudad.paso(Game.ciudad, dt, Game.cam);
  };

  Game.dibujar = function () {
    if (!Game.enMarcha && Game.ciudad) {
      Game.ren.render(Game.ciudad.escena, Game.ciudad.cam);
      return;
    }
    Game.ren.render(Game.escena, Game.cam);
  };

  Game.aplicarCalidad = function (c) {
    Game.calidad = c;
    U.store.set('madness.calidad', c);
    Device.medir();
  };

  global.Game = Game;
})(window);

