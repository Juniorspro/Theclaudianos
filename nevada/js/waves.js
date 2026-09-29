/* =============================================================
   waves.js -> El modo Arena: oleadas, puntuacion y tienda.

   La arena de Madness no es "mata a cien". Es un contrato con el
   jugador que se repite: sale gente por las puertas, la matas,
   respiras diez segundos, compras algo y vuelve a empezar peor.
   Todo lo demas -las estadisticas, el dinero, el combo- existe
   para que esos diez segundos de respiro tengan una decision
   dentro.

   COMO ESCALA
   No se sube la vida de los enemigos: se cambia QUIEN sale. La
   oleada 1 son grunts con los puños; la 4 mete agentes con
   pistola; la 7, soldats con fusil. Un enemigo con mas vida solo
   alarga el tiroteo; un enemigo distinto obliga a jugar distinto,
   y ademas se ve venir -un soldat se reconoce por el visor rojo
   antes de que dispare-.

   EL GRIFO
   Nunca salen todos de golpe. Hay un cupo de vivos a la vez
   (aforo) y el resto espera detras de las puertas. Asi una oleada
   de treinta no se convierte en un muro que te aplasta ni en
   treinta enemigos comiendose la CPU: entran a cuentagotas y la
   presion se mantiene constante.
   ============================================================= */
(function (global) {
  'use strict';

  const Waves = {};

  /* Que sale y cuanto, por oleada. Se define a mano hasta la 10 y
     a partir de ahi se genera: las diez primeras son el tutorial
     encubierto y merecen estar escritas a mano. */
  /* =============================================================
     LA TABLA DE OLEADAS, SACADA DEL SWF

     Esto estaba inventado: la oleada 1 eran CINCO grunts, uno de
     ellos con bate, y de ahi subia a 7, 8, 10, 11, 13... Con eso la
     primera oleada ya es una pelea de cinco contra uno, que no es
     un arranque, es un examen.

     La de verdad esta en CharacterGenerator.returnWaveList(nivel,
     oleada) del original. Desensamblada del bloque
     __Packages.CharacterGenerator, modo 'standard', son doce
     arrays literales y dicen esto:

        1  civ civ civ
        2  civ civ civ civ
        3  agent agent civ civ
        4  agent agent agent civ civ
        5  agent agent agent agent agent civ
        6  agent2 agent2 agent agent agent agent
        7  agent2 agent2 agent2 agent agent agent
        8  agent2 agent2 agent2 agent2 agent agent
        9  agent3 agent2 agent2 agent2 agent2 agent
       10  agent3 agent3 agent3 agent2 agent2 agent2
       11  agent3 agent3 agent3 agent3 agent2 agent2
       12  agent3 x7

     Dos cosas saltan a la vista y las dos estaban mal aqui:

       - LA CANTIDAD CASI NO SUBE. Va 3, 4, 4, 5, 6, 6, 6, 6, 6, 6,
         6, 7. Doce oleadas y solo cuatro enemigos mas. Lo que sube
         es el TIPO, que es justo lo que dice el comentario de
         arriba de este archivo y lo que el codigo no hacia.
       - LA UNO SON TRES CIVILES. Tres, del tipo mas flojo que hay
         en el juego, y desarmados. La oleada 1 es donde aprendes
         los botones, no donde te matan.

     Aqui los cuatro escalones se mapean a los cuatro tipos que hay
     en este juego, por papel y no por nombre:

       civ -> grunt   agent -> agente   agent2 -> soldat   agent3 -> agenteMk0

     LOS TRES ESCALONES DE ARRIBA SON LA MISMA FACCION. Comprobado
     en __Packages.MadnessData: 'agent', 'agent2' y 'agent3' tienen
     bodyType y footType 'agent', o sea el mismo traje, y solo
     cambian de numeros. Aqui se estaba usando el ingeniero A.T.P.
     -un bruto de cuerpo a cuerpo- para el escalon del agente de
     elite, y de ahi que en la oleada 9 apareciera alguien que no
     pinta nada. El A.T.P. y su escopeta se van a la 13 en
     adelante, que es territorio propio: la tabla del original se
     acaba en la doce.

     y de la 13 en adelante se sigue el patron de la 12: todo del
     tipo alto y uno mas cada dos oleadas, con tope por
     rendimiento. */
  const T = { c: 'grunt', a: 'agente', b: 'soldat', e: 'agenteMk0' };
  const LISTAS = [
    'ccc', 'cccc', 'aacc', 'aaacc', 'aaaaac',
    'bbaaaa', 'bbbaaa', 'bbbbaa', 'ebbbba', 'eeebbb',
    'eeeebb', 'eeeeeee'
  ];
  /* =============================================================
     CON QUE SALE CADA ESCUADRA: LA REGLA DE ItemGenerator

     Esto estaba inventado -una tabla por tipo de enemigo y grado-
     y por eso las primeras oleadas eran veinticuatro tios con lo
     mismo en la mano. En el original el arma NO la elige el tipo de
     enemigo: la elige la ESCUADRA.

     Desensamblado de ItemGenerator.returnWaveLoadout(inLevel,
     inWave), que recibe el numero de oleada y el arenanum de la
     escuadra, y con s = escuadra - 1:

       si  s + floor(oleada/4) <= 0          -> 'unarmed'
       si  oleada == 5  o  s + oleada/4 <= 2 -> 'melee'
       si no                                  -> 'ranged'

     O sea: la primera escuadra de las tres primeras oleadas sale
     DESARMADA, la segunda a cuchillo, y de la tercera en adelante
     ya salen armados. Y la oleada 5 es entera de cuerpo a cuerpo
     -esta a mano en el codigo, 'r2 == 5'-, que es un respiro
     puesto a proposito justo antes de que empiecen los agentes
     serios.

       ola  escuadra 1..8
         1  D M F F F F F F        6  M F F F F F F F
         2  D M F F F F F F        7  M F F F F F F F
         3  D M F F F F F F        8  M F F F F F F F
         4  M M F F F F F F       10  F F F F F F F F
         5  M M M M M M M M       12+ F F F F F F F F

     Y QUE arma concreta sale de una lista ORDENADA DE PEOR A MEJOR,
     con una ventana que sube con el nivel. El original lo hace asi
     (visto en equipLoadout):

       indice = randomNumber(max(-3, nivel - K), min(largo, nivel * k))

     o sea que un enemigo de nivel bajo solo alcanza el principio de
     la lista y uno alto se mete en el final. Sus listas, por orden
     de aparicion al subir de nivel, son:

       melee   switchblade, bottle, hammer, pipe, ironknife, mallet,
               bowieknife, bat, baton, crowbar, carbonknife,
               billyclub, machette, ironsword, ...
       fuego   ppk, beretta, glock20, prokiller460 (pistolas) ->
               hk2, mp7, uzi, mp5 (subfusiles) -> 97k, spas12
               (escopetas) -> deagle, automagv, 357, 500 (magnums)
               -> ar15, ak74, m16, fnfal (fusiles)

     Aqui hay cuatro armas blancas y siete de fuego, asi que las
     listas se reducen a eso respetando el orden de aparicion. Donde
     va cada una sale de los arrays de equipLoadout, desensamblados:
       melee  ... pipe ... bowieknife, bat ... tangsword ...
       fuego  por escalones: [ppk, beretta ...] -> [500snub, 357snub,
              hk2 ... mp5 ... 97k, spas12 ...] -> [500long, 357long
              ... ar15 ...]
     o sea el Snub Colt entra con el subfusil y antes que las
     escopetas, y el Colt Revolver largo con el fusil. */
  const LISTA_MELEE = ['tubo', 'cuchillo', 'bate', 'megachette'];
  const LISTA_FUEGO = ['pistola', 'revolver', 'subfusil', 'escopeta97', 'escopeta',
                       'magnum', 'fusil'];

  /* La categoria, tal cual el original. */
  Waves.cargaDe = function (oleada, escuadra) {
    const s = escuadra - 1;
    if (s + Math.floor(oleada / 4) <= 0) return 'desarmado';
    if (oleada === 5 || s + oleada / 4 <= 2) return 'melee';
    return 'fuego';
  };

  /* Y el arma concreta: ventana sobre la lista que sube con el
     escalon de la oleada, igual que el original. */
  function armaDe(W, oleada, escuadra) {
    const cat = Waves.cargaDe(oleada, escuadra);
    if (cat === 'desarmado') return 'puños';
    const L = cat === 'melee' ? LISTA_MELEE : LISTA_FUEGO;
    const nivel = Waves.nivelDe(oleada);
    /* Los cinco niveles de la tabla recorren la lista entera, sea
       cual sea su largo: con cinco armas es nivel - 1, como antes, y
       con mas se reparten igual. Asi el fusil sigue llegando en el
       nivel 5 y no se queda fuera de las doce oleadas. */
    const alto = Math.min(L.length - 1, Math.round((nivel - 1) * (L.length - 1) / 4));
    const bajo = Math.max(0, alto - 2);
    return L[bajo + Math.floor(W.rng() * (alto - bajo + 1))];
  }

  Waves.crear = function () {
    return {
      oleada: 0,
      estado: 'prologo',      // prologo | combate | respiro | fin
      t: 0,
      cola: [],               // los que faltan por entrar
      vivos: 0,
      aforo: 6,
      dinero: 0,
      bajasTotal: 0,
      rng: U.makeRNG(0x01ea4a5a)
    };
  };

  /* =============================================================
     COMO SE MONTA UNA OLEADA DE VERDAD

     Aqui estaba el error que hacia que en la oleada 7 te vieras
     rodeado: se usaba el numero de oleada como indice de la tabla.
     No lo es.

     Desensamblado del bucle de MadnessEvents.arena_1_waves
     (__Packages.MadnessEvents), lo que hace el original en cada
     oleada es esto:

       r3 = 8
       r2 = ceil(totalWaves / 3)
       para r1 de 1 a 8:
         nivel = r2 - floor(r1 / 5)
         createRoster(sala,
                      CharacterGenerator.returnWaveList(totalWaves, nivel),
                      r1, 'enemy',
                      ItemGenerator.returnWaveLoadout(totalWaves, r1))
         ...myRosters[ultimo].arenanum = r1

     O sea DOS cosas que yo no tenia:

       1. UNA OLEADA SON OCHO ESCUADRAS, no un monton. Cada una es
          una lista de la tabla -tres a siete tipos- y salen EN
          ORDEN, numeradas con 'arenanum' de 1 a 8. Por eso en el
          original nunca tienes encima la oleada entera: tienes
          encima la escuadra que toca.

       2. EL INDICE DE LA TABLA ES ceil(oleada / 3), no la oleada.
          La tabla sube un escalon cada TRES oleadas. Con el indice
          mal, la oleada 7 sacaba la lista 7 -agent2 x3 + agent x3-
          cuando lo que toca de verdad es la lista 3: dos agentes y
          dos civiles. Tres veces mas dura de lo que debia.

       Y las cuatro ultimas escuadras van un escalon POR DEBAJO
       (el floor(r1/5)): la oleada empieza dura y afloja al final,
       que es lo que deja rematarla sin que se haga eterna.
     ============================================================= */
  Waves.ESCUADRAS = 8;

  /* El escalon de la tabla que le toca a una oleada. */
  Waves.nivelDe = function (n) { return Math.ceil(n / 3); };

  Waves.listaDe = function (n) {
    if (n <= LISTAS.length) return LISTAS[n - 1];
    /* La 12 son siete del tipo alto; de ahi en adelante, uno mas
       cada dos oleadas. El tope de 14 no es por dificultad, es por
       rendimiento: por encima de eso un Adreno 610 pierde
       fotogramas y la pelea deja de ser justa. */
    const n2 = Math.min(14, 7 + Math.floor((n - LISTAS.length + 1) / 2));
    /* De la 13 en adelante, todo agentes Mk0, como la 12 del
       original. Aqui entraba un ingeniero A.T.P. que no existe en la
       arena del SWF: el original solo saca civ, agent, agent2 y
       agent3. */
    return 'e'.repeat(n2);
  };

  /* La lista que le toca a la escuadra i (1..8) de la oleada n. */
  Waves.listaEscuadra = function (n, i) {
    const nivel = Math.max(1, Waves.nivelDe(n) - Math.floor(i / 5));
    return Waves.listaDe(nivel);
  };

  Waves.fichaDe = function (n) {
    let total = 0;
    for (let i = 1; i <= Waves.ESCUADRAS; i++) total += Waves.listaEscuadra(n, i).length;
    return { n: total, nivel: Waves.nivelDe(n) };
  };

  /* Monta la cola de una oleada a partir de su lista de tipos. Ya
     viene ordenada de mas fuerte a mas flojo en el original, asi
     que se baraja para que no salgan agrupados. */
  /* Monta las ocho escuadras de una oleada. Cada una se baraja por
     dentro -en el original la lista viene ordenada de mas fuerte a
     mas flojo- pero el ORDEN de las escuadras no se toca: es el
     'arenanum' y es lo que marca el ritmo de la oleada. */
  Waves.montarCola = function (W, n) {
    const esc = [];
    for (let e = 1; e <= Waves.ESCUADRAS; e++) {
      const lista = Waves.listaEscuadra(n, e);
      const grupo = [];
      for (let i = 0; i < lista.length; i++) {
        let tipo = T[lista[i]] || 'grunt';
        /* El agent sale en sus dos versiones del SWF: 'agent', con las
           gafas rojas, y 'agent_classic', con las negras. */
        if (tipo === 'agente' && W.rng() < 0.5) tipo = 'agenteClasico';
        grupo.push({ tipo: tipo, arma: armaDe(W, n, e) });
      }
      for (let i = grupo.length - 1; i > 0; i--) {
        const j = Math.floor(W.rng() * (i + 1));
        const t = grupo[i]; grupo[i] = grupo[j]; grupo[j] = t;
      }
      esc.push(grupo);
    }
    return esc;
  };

  Waves.empezar = function (W, n) {
    W.oleada = n;
    /* EL CERROJO DE LA PUERTA 0 (la de la armeria) y del panel: se echa
       al arrancar la oleada y lo suelta arena_1_reset -el DONE de la
       ventana TEST RESULTS- con unlockDoor(0, 0) y el evento
       arena_1_START del activador. Entre el ultimo muerto y esa ventana
       no se puede ni cruzar ni pulsar. */
    W.cerrojo = true;
    W.escuadras = Waves.montarCola(W, n);
    W.iEsc = 0;
    W.cola = W.escuadras[0].slice();     // la escuadra que esta saliendo
    W.total = Waves.fichaDe(n).n;
    W.matados = 0;
    W.estado = 'combate';
    W.t = 0;
    /* EL AFORO ES LA ESCUADRA, no la oleada.

       Estaba en "la oleada entera", y con la oleada siendo ocho
       escuadras eso son veinticuatro tipos encima a la vez. En el
       original lo que hay en la sala es la escuadra que toca: tres
       a siete. La siguiente no sale hasta que la anterior esta
       liquidada, que es lo que hace 'arenanum'. */
    W.aforo = Math.max(3, W.cola.length);
    W.goteo = 0;
  };

  /* Devuelve el siguiente enemigo que toca soltar, o null. El
     grifo se abre cuando hay hueco y ha pasado el intervalo. */
  Waves.siguiente = function (W, dt, vivos) {
    if (W.estado !== 'combate') return null;
    /* Escuadra liquidada: entra la siguiente, con un respiro corto
       para que se oiga la puerta y se vea venir. */
    if (W.cola.length === 0 && vivos === 0 && W.iEsc + 1 < W.escuadras.length) {
      W.iEsc++;
      W.cola = W.escuadras[W.iEsc].slice();
      W.aforo = Math.max(3, W.cola.length);
      W.goteo = 1.1;
    }
    if (W.cola.length === 0) return null;
    W.goteo -= dt;
    if (vivos >= W.aforo || W.goteo > 0) return null;
    W.goteo = 0.45 + W.rng() * 0.5;
    return W.cola.shift();
  };

  Waves.bajaEnemiga = function (W, tipo) {
    W.matados++;
    W.bajasTotal++;
    // el dinero de cada baja lo reparte Progreso.recompensa (appropriateXP del SWF)
  };

  /* ¿Se acabo la oleada? Cuando no queda nadie por soltar ni nadie
     vivo. */
  Waves.terminada = function (W, vivos) {
    return W.estado === 'combate' && W.cola.length === 0 && vivos === 0 &&
           W.iEsc + 1 >= W.escuadras.length;
  };

  Waves.respirar = function (W, seg) {
    W.estado = 'respiro';
    W.t = seg === undefined ? 9 : seg;
  };

  /* =============================================================
     TIENDA
     Lo que se vende en la armeria: las armas del juego, con el precio
     que les pone el SWF. ItemGenerator.createWeapon (t178382):
       precio = 100 x (50 - myROF) x (myDamage x myShots / 2) / 20
       precio += precio x myAmmo / 30
       cuerpo a cuerpo: precio += precio x myDamage / 20
       floor
     (la mira y el laser sumarian un 30 % cada uno; las de la tienda van
     sin ellos). Con los numeros de cada arma en ItemGenerator:
       Beretta 92   ROF 18 daño 7  1 tiro  18 balas  ->  896
       Snub Colt    ROF 20 daño 10 1 tiro   6 balas  ->  900
       Colt Revolver ROF 20 daño 12 1 tiro  6 balas  -> 1080
       H&K MP5      ROF 6  daño 8  1 tiro  30 balas  -> 1760
       Norinco 97k  ROF 40 daño 7  5 tiros  5 balas  -> 1020
       SPAS-12      ROF 40 daño 7  5 tiros  8 balas  -> 1108
       AR-15        ROF 6  daño 11 1 tiro  30 balas  -> 2420
       Bowie Knife  ROF 30 daño 5  (1)              ->  322
       Iron Pipe    ROF 30 daño 6                   ->  403
       Baseball Bat ROF 30 daño 9                   ->  674
       Megachette   ROF 30 daño 9                   ->  674
     El botiquin, el chaleco y la municion de antes no estaban en el SWF. */
  Waves.TIENDA = [
    { id: 'tubo',       precio: 403 },
    { id: 'cuchillo',   precio: 322 },
    { id: 'bate',       precio: 674 },
    { id: 'megachette', precio: 674 },
    { id: 'pistola',    precio: 896 },
    { id: 'revolver',   precio: 900 },
    { id: 'subfusil',   precio: 1760 },
    { id: 'escopeta97', precio: 1020 },
    { id: 'escopeta',   precio: 1108 },
    { id: 'magnum',     precio: 1080 },
    { id: 'fusil',      precio: 2420 }
  ];

  Waves.comprar = function (W, jug, id) {
    const it = Waves.TIENDA.find((x) => x.id === id);
    if (!it || W.dinero < it.precio) return false;
    W.dinero -= it.precio;
    /* Lo que llevaba en esa ranura no se pierde: en el SWF vuelve al
       inventario (unequipItem -> addWeapon); aqui, sin inventario, queda
       en el suelo delante del mostrador con lo que le quedara. */
    /* CON SIDEARM1 Y LA OTRA RANURA LIBRE, lo comprado va ALLI (en el SWF
       todo va al inventario y el equipo se arma con las dos ranuras): la
       que se lleva en la mano no se tira y queda la segunda arma, lista
       para el boton ARMA. Sin el perk solo hay una ranura. */
    const otra = 1 - (jug.ranura || 0);
    if (jug.armas && jug.armas[jug.ranura] && !jug.armas[otra] && Progreso.perk(jug, 'perkSidearm1')) {
      jug.armas[otra] = Weapons.equipar(id);
      Actor.empuñar(jug, jug.armas[jug.ranura]);      // re-enfunda: la nueva se ve a la espalda o en la cadera
      if (Game.guardarPartida) Game.guardarPartida();
      return true;
    }
    const antes = jug.armas && jug.armas[jug.ranura];
    if (antes) Game.tirarArma(antes, jug.x, jug.y + 0.6, undefined, jug.z);
    Actor.equipar(jug, id);
    if (Game.guardarPartida) Game.guardarPartida();     // lo comprado ya es tuyo
    return true;
  };

  global.Waves = Waves;
})(window);

