/* =============================================================
   art.js -> Paleta, materiales y texturas dibujadas a mano.

   Madness Combat es monocromo: grises, blanco, negro y el rojo de
   la sangre. No hay un solo color saturado en toda la serie salvo
   la sangre y, muy de vez en cuando, un detalle. La paleta de
   abajo esta medida sobre el render de referencia del Grunt:
   cabeza clara, mono gris medio, guantes casi blancos, pantalon
   muy oscuro y botas negras.

   Ninguna textura es un archivo. Las manchas de tinta, el grano
   del papel y las salpicaduras de sangre se dibujan con canvas al
   arrancar y se suben una sola vez a la tarjeta. Asi el juego
   entero sigue siendo un puñado de archivos de texto.
   ============================================================= */
(function (global) {
  'use strict';

  const Art = {};

  /* ---------------- Paleta ----------------
     Los tonos de personaje salen de muestrear el render de
     referencia: cabeza 184-196, mono 92-100, guantes 198-207,
     pantalon 36-47, botas 7. Se han subido un 8% porque el render
     lleva un velo oscuro encima y en pantalla pequena el contraste
     se come los medios tonos. */
  Art.C = {
    /* --- Cuerpo --- */
    piel:      0xb8b8b6,   // la cabeza: medido 182 a la luz, 102 en sombra
    pielAlta:  0xe6e6e6,
    mono:      0x767673,   // el peto: medido 118
    monoOsc:   0x565656,
    guante:    0xbebebc,   // manoplas: medido 186, casi el tono de la cara
    pantalon:  0x30302f,
    /* La bota. En la hoja de turnaround salio marron, pero eso es
       un desliz de color de ese render: en la serie el calzado es
       gris oscuro. Lo que SI se conserva de la medicion es la
       relacion de tonos -la bota da 69 de luminancia contra 118 del
       peto, o sea un 58%-, porque es la que hace que la silueta se
       apoye en el suelo en vez de flotar. */
    /* GRIS NEUTRO, NO MARRON. En la hoja la bota sale marron, pero
       eso es la textura de cuero del render; el personaje del juego
       calza gris oscuro. Y "casi gris" no vale: con el rojo tres
       puntos por encima del azul ya se lee marron contra el suelo
       gris de la arena. Aqui el azul va POR ENCIMA del rojo, para
       que no haya forma de que tire a calido. */
    /* Y AL FINAL, EL DEL SWF: el pie de Madness: Project Nexus es UNA
       forma para todos los tipos (DefineShape 2789 dentro del 2790), sin
       suela de otro color, y su relleno mide 102 contra los 153 del
       torso del civ: dos tercios. Aqui el peto mide 118, asi que el pie
       va a 118 x 0,67 = 79 -con 102 salia del mismo tono que el torso-. */
    bota:      0x4f4f4f,
    botaCana:  0x53565c,   // un punto mas clara
    botaSuela: 0x1b1c1f,   // la suela, casi negra
    cruz:      0x0d0d0d,   // los trazos: nucleo medido en 13
    correa:    0x3a3a3a,

    /* --- Facciones --- */
    zed:       0x9aa08e,   // carne agria
    zedOsc:    0x6d7263,
    l33t:      0x232830,
    l33tGaf:   0x2ad0d0,

    /* --- Armas --- */
    metal:     0x5c5c5c,
    metalOsc:  0x333333,
    metalAlt:  0x818181,
    culata:    0x3b2f26,
    hoja:      0xc8ccd0,   // filo de cuchillo/machete
    manija:    0x1e1e1e,

    /* --- Sangre --- */
    sangre:    0xa81414,
    sangreOsc: 0x6b0d0d,
    sangreVic: 0xd42020,

    /* --- Escenario --- */
    suelo:     0x3c3c3c,
    sueloAlt:  0x484848,
    muro:      0x2a2a2a,
    muroAlt:   0x343434,
    fondo:     0x1b1b1b,
    tinta:     0x0b0b0b,
    luzTubo:   0xf2f2ea,
    reja:      0x202020,
    caja:      0x565044,
    barril:    0x4a3230
  };

  /* ---------------- Materiales compartidos ----------------
     Todo el juego cabe en cinco materiales. Cambiar de material
     cuesta mas que dibujar triangulos, asi que cuantos menos,
     mejor. Ninguno calcula luces: el volumen ya va horneado en el
     color de cada vertice. */
  Art.mats = {};

  /* =============================================================
     EL MATERIAL DE TODO

     Madness no tiene degradados: tiene MANCHAS. En la hoja de
     referencia la cabeza no se oscurece poco a poco hacia la
     izquierda, hay una media luna de sombra con un borde limpio, y
     dentro de ella el tono es uniforme. Eso es sombreado por
     escalones, y es lo que distingue un dibujo de un render.

     Se resuelve con seis lineas de shader injertadas en el
     material basico: cada vertice trae, en un atributo aparte,
     cuanta luz recibe; el fragmento reparte ese valor en cuatro
     escalones y multiplica el color. Como el valor se interpola
     por el triangulo, el borde entre escalones sale donde toca -una
     curva limpia- y no pegado al canto de la malla.

     Coste: un atributo de un float, una variable interpolada y
     cuatro comparaciones por pixel. En un Adreno 610 no se mide.
     ============================================================= */
  const ESCALONES = `
    float e;
    if      (luz < 0.50) e = 0.56;
    else if (luz < 0.62) e = 0.80;
    else if (luz < 0.88) e = 1.00;
    else                  e = 1.18;
    diffuseColor.rgb *= e;
  `;

  /* =============================================================
     EL MUÑECO DE LAS FICHAS (retrato del HUD y pedestal de la tienda)

     La luz: viene de la camara, apenas a la derecha y apenas de
     arriba, y no de la sala -U.LUZ = (0,44, 0,74, 0,51)-: la ficha del
     SWF va iluminada casi entera y plana, con la sombra en una media
     luna fina en la nuca. Con la luz de la sala medio muñeco quedaba
     en el escalon oscuro.

     El tono: los colores del muñeco son los medidos en la ARENA, que en
     una ficha se leen apagados. La ficha del SWF (selectDisplay,
     td_sel.png) los tiene mas claros y menos contrastados: cabeza 204,
     cuerpo 153, pies 102. Pintado con esta luz, el muñeco sale con la
     cabeza en 184, el peto en 127 y los pies en 86 (medidos en la
     tienda); se remapea al volcar los pixeles con la recta que lleva
     184 -> 204 y 127 -> 153 (salida = 39,4 + 0,895 x entrada; los pies
     quedan en 116) y se deja la tinta negra como esta: el remapeo entra
     de a poco entre 25 y 70, donde acaba el borde suavizado de la linea. */
  Art.matFicha = function () {
    if (!Art.mats.retrato) {
      const x = 0.30, y = 0.22, z = 0.93, l = Math.hypot(x, y, z);
      Art.mats.retrato = Art.aplicarEscalonesMundo(new THREE.MeshBasicMaterial({ vertexColors: true }), true,
                                                   { x: x / l, y: y / l, z: z / l });
    }
    return Art.mats.retrato;
  };
  Art.tonoFicha = function (px) {
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
      const t = Math.min(1, Math.max(0, (lum - 25) / 45)), w = t * t * (3 - 2 * t);
      for (let k = 0; k < 3; k++) {
        const v = px[i + k], m = 39.4 + 0.895 * v;
        px[i + k] = v + (m - v) * w;
      }
    }
  };

  Art.aplicarEscalones = function (mat) {
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float aLuz;\nvarying float vLuz;\n' +
        sh.vertexShader.replace('#include <begin_vertex>',
                                '#include <begin_vertex>\n\tvLuz = aLuz;');
      sh.fragmentShader = 'varying float vLuz;\n' +
        sh.fragmentShader.replace('#include <color_fragment>',
                                  '#include <color_fragment>\n\t{ float luz = vLuz < 0.0 ? 0.70 : vLuz;' +
                                  ESCALONES + '}');
    };
    // sin esto three reutilizaria el programa del material basico
    // de siempre y el injerto no llegaria a compilarse nunca
    mat.customProgramCacheKey = () => 'madness-escalones';
    return mat;
  };

  /* =============================================================
     LA LUZ DE LOS CUERPOS: LA MISMA QUE LA DE LA SALA

     La luz horneada en cada vertice estaba clavada al MODELO: la
     media luna de sombra iba pegada siempre al mismo costado del
     muñeco, mirase a donde mirase, y se leia como lo que era, una
     mancha pintada.

     La sala ya tiene una luz: paredes, suelo, barriles, cajas y
     puertas llevan horneado U.luzDe() con sus normales DEL MUNDO -la
     arena se construye en coordenadas de mundo-, o sea una clave que
     entra desde arriba, a la derecha y de frente. Los cuerpos ahora
     usan exactamente esa misma direccion, calculada en cada fotograma
     con la normal YA DEFORMADA por los huesos (skinnormal_vertex) y
     llevada al mundo. Resultado:

       · un personaje se sombrea del mismo lado que el barril que
         tiene al lado, porque les da la misma luz;
       · al girarse, la sombra se queda donde cae la luz y es el
         cuerpo el que pasa por debajo: la cara, las manos, los
         hombros, la joroba de la espalda y los pies cambian de
         escalon segun miren hacia la luz o se alejen de ella;
       · un puño girado enseña su cara oscura; un torso que se
         inclina hacia delante se oscurece por el pecho.

     Los escalones son los mismos: la sombra sigue siendo una mancha
     de borde limpio, no un degradado. Lo pintado plano -la cruz,
     rayitas- sigue sin luz (valor negativo en aLuz).

     Coste: una normal por vertice que la tarjeta ya calculaba para
     la piel, un vec3 interpolado y un producto escalar por pixel.
     ============================================================= */
  /* LA CABEZA SIEMPRE ENTERA, POR ENCIMA DEL CUERPO.

     En el SWF la cabeza es una capa aparte POR ENCIMA del cuerpo
     (madness_character 5628 -> mySprite 5317: myBody y encima myHead):
     el ovalo sale siempre completo, con su contorno entero, mire el
     muñeco a donde mire. En 3D el ovalo se hunde en los hombros y, de
     tres cuartos y de costado, la joroba de la espalda le comia un
     pedazo por abajo; tampoco quedaba linea entre cabeza y torso.

     Asi que, cuando el muñeco NO esta de espaldas, el torso se dibuja
     con la profundidad CORRIDA HACIA ATRAS hasta Art.CAPA metros. Solo
     la profundidad: en pantalla no se mueve ni se deforma nada.

       · De frente, de tres cuartos y de costado los hombros le llevan
         a la cabeza hasta 23 cm: con 30 la cabeza gana y el ovalo sale
         entero, como en el SWF.
       · De espaldas no se corre nada: la joroba va por delante de la
         nuca y la tapa, que es lo que hace que un muñeco de Madness se
         vea jorobado. El paso entre una cosa y otra es suave y sale del
         rumbo del propio personaje contra la camara, en el shader.
       · Solo el torso, y en una rampa MUY suave: nada a la altura de
         los pies -que no se tocan, o el suelo los tapa- y entero a la
         de los hombros. Con una rampa corta salia una franja negra: con
         la camara picada, en un mismo pixel la cara de delante y la de
         atras del torso estan a 22 cm de altura una de otra, se corrian
         distinto y la tinta de atras pasaba por delante. De 0,25 a 0,85
         la diferencia no pasa de 11 cm, contra 34 de margen.

     Las manos y el arma no se corren. Cuanto se corre cada vertice va
     en el atributo aCapa (en la tinta, en el verde: ver Chars.geoDe). */
  Art.CAPA = 0.30;
  /* Cuanto se aplica la capa segun hacia donde mira el muñeco: 1 de
     frente y de costado, 0 de espaldas. */
  /* EN UN CADAVER NO. Todo esto es para el muñeco DE PIE visto por la
     camara del juego. Acostado, su frente apunta casi vertical: su
     sombra en el suelo (fw.xz) mide casi cero, la direccion saltaba de
     un fotograma a otro y la capa del torso con ella, de +0,30 a -0,25:
     torso y cabeza se turnaban para taparse y TITILABAN (medido: 38.030
     pixeles de ida y vuelta en 90 cuadros de camara girando de a un
     grado). Ahora:
       · la direccion se desvanece cuando esa sombra es corta (por
         debajo de 0,5 de largo), hacia 'de frente', sin saltos;
       · y derecho() -lo que el eje arriba del muñeco apunta hacia
         arriba en el mundo- apaga las capas del todo al tumbarse (de
         0,85 a 0,55: el que corre inclinado sigue entero): tumbado
         manda la profundidad 3D de verdad. */
  const VISTA_GLSL =
    'float derecho() {\n' +
    '\tvec3 up = mat3(modelMatrix) * vec3(0.0, 1.0, 0.0);\n' +
    '\treturn smoothstep(0.55, 0.85, up.y / max(1e-5, length(up)));\n}\n' +
    'float vistaCapa() {\n' +
    '\tvec3 fw = mat3(modelMatrix) * vec3(0.0, 0.0, 1.0);\n' +
    '\tvec2 a = fw.xz, b = cameraPosition.xz - modelMatrix[3].xz;\n' +
    '\tfloat la = length(a) / max(1e-5, length(fw));\n' +
    '\tfloat c = dot(a, b) / max(1e-5, length(a) * length(b));\n' +
    '\treturn mix(1.0, smoothstep(-0.75, -0.25, c), smoothstep(0.2, 0.5, la));\n}\n';
  Art.VISTA_GLSL = VISTA_GLSL;           // lo usan las mascaras (accesorios.js)
  const CAPA_GLSL = (peso) =>
    '\t{ vec4 pz = projectionMatrix * vec4(mvPosition.xy, mvPosition.z - (' + peso + '), 1.0);\n' +
    '\t  gl_Position.z = pz.z / pz.w * gl_Position.w; }\n';
  /* Y DE ESPALDAS, AL REVES: LA JOROBA POR ENCIMA DE LA NUCA. Con la
     camara picada la nuca queda mas cerca que lo alto de la joroba, asi
     que la tapaba: faltaba el borde de la joroba, o se veia un trozo del
     ovalo entre ese borde y el torso. Cuanto mas de espaldas, la misma
     rampa del torso -color y tinta juntos, asi no se cruzan- se ADELANTA
     Art.NUCA metros: la joroba tapa la nuca y su contorno es su propio
     borde. La cabeza no se mueve (corriendola, contra una puerta se
     metia detras del vidrio). */
  Art.NUCA = 0.25;
  /* Y EL BAJO DEL TORSO, POR ENCIMA DE LOS PIES. En el muñeco del SWF
     los pies son una capa por DEBAJO del cuerpo (profundidades 1 y 3
     contra la 9 del cuerpo): el torso los tapa donde se cruzan. En 3D,
     al correr, la punta del pie adelantado asomaba por la pared del
     torso encima del ruedo. El bajo del torso -rampa suave de 0,20 a
     0,34- adelanta su profundidad Art.PIES metros: tapa el pie donde se
     cruzan y la punta que asoma por delante se sigue viendo.

     Y con eso la linea que cierra el torso por abajo sale SOLA: es su
     propio contorno, que al ir por delante se dibuja encima de los pies,
     con el mismo trazo que los costados. (Hubo una franja pintada aparte
     para eso, y con el contorno debajo salia una linea doble.) */
  Art.PIES = 0.12;
  /* Las rampas salen de la altura del vertice EN REPOSO -el atributo
     position, antes de la piel-; 'a' solo marca que es torso. */
  const CAPA_DE = (a) => a + ' * derecho() * (smoothstep(0.25, 0.85, position.y) * (' + Art.CAPA.toFixed(3) +
                         ' * vistaCapa() - ' + Art.NUCA.toFixed(3) + ' * (1.0 - vistaCapa())) - ' +
                         '(1.0 - smoothstep(0.20, 0.34, position.y)) * ' + Art.PIES.toFixed(3) + ')';
  /* La ropa (ropa.js) va adelantada como la tinta del torso, con la misma
     rampa: aAde es su adelanto, en metros (0 en todo lo demas). */
  const CAPA_CUERPO = CAPA_DE('aCapa') + ' - aAde * smoothstep(0.30, 0.45, position.y)';

  /* 'luz' (opcional) cambia la luz de la sala por otra: la usa el
     retrato del HUD (hud.js), que tiene su propia luz, la del SWF. */
  Art.aplicarEscalonesMundo = function (mat, capas, luz) {
    const L = luz || U.LUZ;
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = 'attribute float aLuz;\nvarying float vLuz;\nvarying vec3 vNMundo;\n' +
        (capas ? 'attribute float aCapa;\nattribute float aAde;\n' + VISTA_GLSL : '') +
        sh.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n\tvLuz = aLuz;\n' +
          '#ifdef USE_SKINNING\n\tvNMundo = mat3(modelMatrix) * objectNormal;\n' +
          '#else\n\tvNMundo = mat3(modelMatrix) * normal;\n#endif')
          .replace('#include <project_vertex>', '#include <project_vertex>\n' + (capas ? CAPA_GLSL(CAPA_CUERPO) : ''));
      sh.fragmentShader = 'varying float vLuz;\nvarying vec3 vNMundo;\n' +
        'const vec3 LUZ_SALA = vec3(' + L.x.toFixed(5) + ', ' + L.y.toFixed(5) + ', ' + L.z.toFixed(5) + ');\n' +
        sh.fragmentShader.replace('#include <color_fragment>',
          '#include <color_fragment>\n\t{ float luz = vLuz < 0.0 ? 0.70 : ' +
          '0.5 + 0.5 * dot(normalize(vNMundo), LUZ_SALA);' + ESCALONES + '}');
    };
    mat.customProgramCacheKey = () => 'madness-escalones-sala' + (capas ? '-capas' : '') +
                                      (luz ? '-luz' + L.x.toFixed(3) + L.y.toFixed(3) + L.z.toFixed(3) : '');
    return mat;
  };

  /* La tinta: la misma capa que el color (verde) y el adelanto de cada
     pieza (azul, en metros). Ver M.contornoPiel. */
  /* En el bajo del torso la tinta NO se adelanta: mirando desde arriba
     el borde de abajo, el rayo cruza muy poco torso -entra por el bisel
     y sale por la tapa- y la tinta adelantada pasaba por delante del
     bisel y lo pintaba de negro: la linea de abajo salia el doble de
     gruesa. El adelanto solo hace falta arriba (la puerta, la nuca). */
  /* La tinta de una mascara con dibujo lleva mas adelanto que el ovalo
     (color.b > 0,16, ver Accesorios.ADELANTO) y, como la mascara, solo de
     frente y de costado: de espaldas la nuca va delante de ella. */
  /* Y tumbado, sin adelanto (derecho()): con cadaveres apilados, la
     tinta adelantada 12-15 cm del de abajo pasaba por delante del de
     arriba segun el angulo de la camara. En 3D puro el contorno sale
     igual: es la cara de atras del casco, detras de la pieza. */
  const ADELANTO_GLSL = CAPA_GLSL(CAPA_DE('color.g') +
    ' - derecho() * color.b * (color.g > 0.5 ? smoothstep(0.30, 0.45, position.y) : (color.b > 0.16 ? vistaCapa() : 1.0))');

  Art.initMaterials = function () {
    const M = Art.mats;

    // Cuerpos, armas y decorados: un unico material para todo
    M.plano = Art.aplicarEscalones(new THREE.MeshBasicMaterial({ vertexColors: true }));

    // Los personajes: la misma mancha, con la luz en el mundo
    M.cuerpo = Art.aplicarEscalonesMundo(new THREE.MeshBasicMaterial({ vertexColors: true }), true);

    // El mismo, pero pintado por las dos caras (piezas planas)
    M.planoDoble = Art.aplicarEscalones(
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));

    /* Contorno: el casco hinchado dibujado al reves. Solo caras
       traseras, asi que lo unico que asoma es el borde.

       VA DESPUES DEL COLOR, Y NO ESCRIBE PROFUNDIDAD. Esto no es un
       detalle: es lo que permite que una pieza este hecha de varios
       trozos.

       Dibujandolo ANTES -como estaba-, el casco de cada trozo tapa a
       los trozos vecinos: donde la pared trasera del casco del dedo
       queda por delante de la superficie de la palma, la palma no
       pasa el test de profundidad y aparece una cuña negra dentro de
       la silueta. Era el motivo de que las manos, las botas y las
       armas salieran con astillas negras por las juntas, y de que
       hubiera que hacerlo todo de una pieza.

       Dibujandolo DESPUES, el buffer ya tiene la superficie mas
       cercana de TODA la figura. Y la pared trasera de cualquier
       casco esta siempre por detras de la cara delantera de su
       propio trozo, o sea por detras de esa superficie mas cercana:
       no pasa el test y no se dibuja. Dentro de la silueta no puede
       aparecer negro POR CONSTRUCCION, con los trozos que sean. Solo
       sobrevive el reborde de fuera, que es justo el contorno. */
    M.contorno = new THREE.MeshBasicMaterial({
      color: 0x000000, side: THREE.BackSide, depthWrite: false
    });

    /* EL CONTORNO DE LOS PERSONAJES: GROSOR MINIMO EN PANTALLA.

       El casco hinchado da una linea de grosor fijo EN EL MUNDO: 1,6
       cm. A la distancia de juego -la vista abarca 9,5 m de alto- en
       un movil de 720 eso es menos de un pixel, y una linea de menos
       de un pixel sale a trozos: se come en los costados del torso,
       desaparece al girar y parpadea al andar. Era la silueta "rota"
       que se veia.

       En Madness la tinta es gorda y pareja. Asi que, ademas del
       casco, cada vertice de la pasada de tinta se empuja HACIA
       AFUERA EN PANTALLA, en la direccion de su normal proyectada,
       una fraccion fija del alto de la vista. El grosor ya no depende
       de la distancia ni del angulo: la linea nunca baja de ~2 px en
       un movil y escala con la pantalla. No hace falta ningun
       uniform: el aspecto sale de la propia matriz de proyeccion
       (P[1][1] / P[0][0]).

       Sigue dibujandose despues del color y sin escribir profundidad
       -ver M.contorno-, asi que dentro de la silueta sigue sin poder
       aparecer negro. */
    /* PERO MEDIDO CONTRA EL SWF, ESA LINEA SOBRABA: alli la tinta mide
       el 2,6% del ancho de la cabeza (16 px sobre 617 en el sprite de la
       cabeza), y el casco de 1,6 cm ya da el 2,4% (0,016 / 0,666). El
       empuje de 0,34% del alto de la vista sumaba otros 3,2 cm: la linea
       salia casi tres veces mas gorda que en el juego original, y en el
       movil se notaba. Ahora el empuje solo COMPLETA hasta un minimo en
       pixeles -para que no se corte en pantallas chicas-: si el casco ya
       llega, no empuja nada. Lo calcula Game.redimensionar (uniform). */
    Art.TINTA_MIN_PX = 1.6;
    Art.UNI_TINTA = { value: 0 };   // fraccion del alto de la vista (en pixeles de render)
    /* Cuanto se empuja cada vertice va en el ROJO de su color de
       vertice (el material es negro, asi que el color no se ve): 1 en
       torso, cabeza y pies; menos en las manos, que son tan chicas que
       con la linea entera de frente no se veia el relleno. Ver
       Chars.geoDe. */
    /* Y ESTA SI ESCRIBE PROFUNDIDAD. Sin escribirla, lo translucido
       que se dibuja despues -el vidrio de las puertas- pintaba encima
       de la linea, y de espaldas contra una puerta el muñeco se quedaba
       sin contorno. Escribirla no rompe nada: se dibuja despues del
       color, asi que por dentro de la silueta no pasa el test y no
       escribe; solo escribe en la franja de fuera, que es suya. */
    M.contornoPiel = new THREE.MeshBasicMaterial({
      color: 0x000000, side: THREE.BackSide, depthWrite: true, vertexColors: true
    });
    M.contornoPiel.onBeforeCompile = (sh) => {
      sh.uniforms.uTinta = Art.UNI_TINTA;
      sh.vertexShader = 'uniform float uTinta;\n' + VISTA_GLSL + sh.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\n' +
        '#ifdef USE_SKINNING\n' +
        // con BackSide three da vuelta la normal (FLIP_SIDED): se deshace
        '\t{ vec3 nv = normalize(transformedNormal);\n' +
        '#ifdef FLIP_SIDED\n\t  nv = -nv;\n#endif\n' +
        '\t  vec2 d = (projectionMatrix * vec4(nv, 0.0)).xy;\n' +
        '\t  float asp = projectionMatrix[1][1] / projectionMatrix[0][0];\n' +
        '\t  vec2 dp = d * vec2(asp, 1.0); float ld = length(dp);\n' +
        '\t  if (ld > 1e-6) gl_Position.xy += (dp / ld) * vec2(1.0 / asp, 1.0) * color.r * 2.0 * uTinta * gl_Position.w;\n' +
        '\t}\n' +
        /* En el azul, cuanto se ADELANTA la tinta. La linea que asoma
           es la cara trasera del casco, que en el borde de la silueta
           esta a la profundidad del centro de la pieza: con el muñeco de
           espaldas contra una puerta, la hoja la tapaba y salia a
           puntos. Cada pieza se adelanta segun lo que mide de grueso -la
           cabeza 15 cm, el torso 12, los pies 6, las manos nada-: por
           dentro de la silueta la cara trasera esta detras de la
           delantera todo ese grueso, y la franja que gana hacia dentro
           queda por debajo de medio pixel. Con un adelanto igual para
           todo (probado, 12 cm) las manos, de 3,4 cm, se pintaban de
           negro enteras. */
        ADELANTO_GLSL +
        '#endif');
    };
    M.contornoPiel.customProgramCacheKey = () => 'madness-tinta-pantalla';

    // Sangre y humo: un plano suelto que siempre mira a camara
    M.sangre = new THREE.MeshBasicMaterial({
      color: 0xffffff, vertexColors: true, transparent: true,
      depthWrite: false, map: Art.texSalpicadura()
    });

    // Sombra de contacto: una mancha oscura bajo cada personaje
    M.sombra = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.34,
      depthWrite: false, map: Art.texMancha()
    });

    return M;
  };

  /* =============================================================
     TEXTURAS DIBUJADAS
     ============================================================= */

  function lienzo(n) {
    const c = document.createElement('canvas');
    c.width = c.height = n;
    return c;
  }

  function subir(canvas, opts) {
    opts = opts || {};
    const t = new THREE.CanvasTexture(canvas);
    t.minFilter = opts.mip === false ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = opts.mip !== false;
    t.anisotropy = 1;                 // en un Adreno 610 no sale gratis
    if (opts.repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(opts.repeat, opts.repeat);
    }
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* --- Una salpicadura de tinta: gota central y satelites ---
     La sangre de Madness no es una nube difusa, son goterones
     duros con hilillos. Se dibuja con circulos de radio irregular
     y brazos finos que salen del centro. */
  function pintarSalpicadura(ctx, cx, cy, r, rng, alpha) {
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    // cuerpo principal, contorno irregular
    ctx.beginPath();
    const lobes = 9 + Math.floor(rng() * 5);
    for (let i = 0; i <= lobes; i++) {
      const a = (i / lobes) * Math.PI * 2;
      const rr = r * (0.70 + rng() * 0.55);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    // brazos: gotas que salen disparadas
    const brazos = 4 + Math.floor(rng() * 6);
    for (let i = 0; i < brazos; i++) {
      const a = rng() * Math.PI * 2;
      const largo = r * (1.1 + rng() * 2.0);
      const grosor = r * (0.10 + rng() * 0.16);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -grosor);
      ctx.lineTo(largo * 0.75, -grosor * 0.35);
      ctx.lineTo(largo, 0);
      ctx.lineTo(largo * 0.75, grosor * 0.35);
      ctx.lineTo(0, grosor);
      ctx.closePath();
      ctx.fill();
      // la gota que se desprende al final del brazo
      if (rng() < 0.65) {
        ctx.beginPath();
        ctx.arc(largo * (1.10 + rng() * 0.35), 0, grosor * (0.5 + rng() * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* Mancha de sangre para pegar en el suelo y las paredes */
  Art.texSalpicadura = function () {
    if (Art._texSalp) return Art._texSalp;
    const N = 128, c = lienzo(N), ctx = c.getContext('2d');
    const rng = U.makeRNG(0x5a1a1c0d);
    ctx.clearRect(0, 0, N, N);
    ctx.fillStyle = '#ffffff';
    pintarSalpicadura(ctx, N / 2, N / 2, N * 0.21, rng, 1);
    for (let i = 0; i < 7; i++) {
      pintarSalpicadura(ctx, N * (0.25 + rng() * 0.5), N * (0.25 + rng() * 0.5),
                        N * (0.03 + rng() * 0.06), rng, 0.9);
    }
    Art._texSalp = subir(c);
    return Art._texSalp;
  };

  /* =============================================================
     LAS PUERTAS DE LA ARENA

     Tercera version. Las dos primeras las hice de memoria y de una
     captura de la SERIE, y la serie no es el juego: sus puertas son
     altas -1,5 de alto por 1 de ancho-. Las de la arena de Project
     Nexus son CASI CUADRADAS. Medido sobre la captura de la sala:

       puerta normal   78 x 93 px  ->  alto/ancho 1,192
       puerta ARMORY   79 x 86 px  ->  alto/ancho 1,089

     y no son del mismo color: la del centro es la de la tienda y es
     MUCHO mas blanca que las otras.

       muro            #616161        suelo           #585858
       hoja normal     #6F6F6F        hoja ARMORY     #CCCCCC
       rayas           #A7A7A7 en las dos
       marco           #1B1B1B fuera, #4F4F4F la cara, #1A1A1A dentro
                       5 px = 6,4% del ancho

     LA FRANJA DE ABAJO
       empieza al 84% del alto y llega al suelo (el 16% de abajo)
       paso de raya   16,5 px = 21,2% del ancho
       inclinacion    dx/dy = -0,5  (cae hacia la izquierda: "/")

     Ojo con el paso y la inclinacion: en la captura de la serie
     salian 10,3% y 0,87, casi el doble de finas y el doble de
     tumbadas. No son las mismas puertas.

     EL ESTARCIDO
       las normales llevan la calavera de Madness
       la ARMORY lleva un fusil y simbolos de dolar

     Y ENCIMA DE LA ARMORY
       cartel     50 x 25 px, centrado, fondo #535353, letra #A4A4A4
       luz        9 px = 11,4% del ancho, centrada, #03FE03 / #FF0000
     ============================================================= */
  /* MEDIDO OTRA VEZ, Y ESTA VEZ BIEN.

     Barrido vertical por dentro de la puerta de la calavera,
     columna x=60 de la captura de la sala:

       y 125..136   #616161   el muro
       y 137        #1C1C1C   la linea de fuera del marco
       y 138..142   #62 #55 #5B #41 #64   la cara del marco
       y 143..227   #6F6F6F   EL PANEL
       y 228        #000000   el suelo

     O sea: EL MARCO NO TIENE LADO DE ABAJO. Es una U del reves
     -arriba y los dos costados- y el panel baja hasta el suelo.
     Por eso en el juego la fila de rayas se ve entera: no hay nada
     que la tape. Yo le estaba pintando un marco alrededor entero y
     me comia el bajo; luego lo saque por fuera y engorde la puerta.
     Las dos veces por no haber mirado el borde de abajo.

     Y de paso sale la otra correccion: el panel mide 78 x 85, o sea
     alto/ancho 1,090, que es EL MISMO que el de la ARMORY (79 x 86
     = 1,089). Los dos paneles son iguales de forma; lo que cambia
     es el color y el estarcido. El 1,192 que tenia para la normal
     salia de medir el panel CON su marco.

       panel        78 x 85   ->  1,090
       marco lados  5 px = 6,4% del ancho del panel
       marco arriba 6 px = 7,1% del alto
       marco abajo  ninguno
       franja       del 82% del alto del panel hasta el bajo */
  Art.ASPECTO_PUERTA = 1.090;
  Art.ASPECTO_ARMERIA = 1.089;
  const M_LADO = 0.064, M_ARRIBA = 0.071;

  /* Lo que mide el LIENZO entero -panel mas marco-, que es lo que
     necesita el quad de la puerta. */
  Art.aspectoPuerta = function (tipo) {
    const a = tipo === 'armeria' ? Art.ASPECTO_ARMERIA : Art.ASPECTO_PUERTA;
    const AN = 160, AL = Math.round(160 * a);
    const ml = Math.round(AN * M_LADO), ma = Math.round(AL * M_ARRIBA);
    return (AL + ma) / (AN + ml * 2);
  };

  /* Que parte del lienzo es PANEL -la hoja que sube- y que parte es
     MARCO -que se queda en el muro-: el panel es el centro, AN de
     AN + 2*ml de ancho, y de abajo arriba AL de AL + ma. */
  Art.panelPuerta = function (tipo) {
    const a = tipo === 'armeria' ? Art.ASPECTO_ARMERIA : Art.ASPECTO_PUERTA;
    const AN = 160, AL = Math.round(160 * a);
    const ml = Math.round(AN * M_LADO), ma = Math.round(AL * M_ARRIBA);
    return { fx: AN / (AN + 2 * ml), fy: AL / (AL + ma), u0: ml / (AN + 2 * ml) };
  };

  const PTA = {
    normal:  { hoja: '#6F6F6F', aspecto: 1.192 },
    armeria: { hoja: '#CCCCCC', aspecto: 1.089 }
  };

  /* =============================================================
     LOS ESTARCIDOS, SACADOS DEL SWF

     Los dibuje a mano y se veian horribles, porque la calavera de
     Madness no es "un craneo con cuernos": es un dibujo concreto
     con su asimetria, sus astillas y sus goterones de spray, y eso
     no se saca de memoria.

     Estan en el propio archivo del juego. El sprite de la puerta
     de arena -amArena, id 4529- cuelga de dos DefineShape:

       forma 4525   65,2 x 62,8 px   la CALAVERA
       forma 4526   90,9 x 66,2 px   el FUSIL con los dolares
       (y 4527, 94,4 x 47,0, el cartel de EMPLOYEES ONLY)

     Leidos con el lector de DefineShape, rasterizados a PNG para
     reconocerlos, y exportados aqui como listas de puntos
     normalizadas al lado mayor y centradas en el origen. Las
     curvas ya vienen partidas en tramos por el lector, asi que un
     camino es un poligono y se pinta con lineTo.

     Se tiran los caminos con area menor que el 0,06% del cuadro:
     son motas de spray de uno o dos pixeles que a este tamaño no
     se ven y se llevaban la mitad de los bytes. Quedan 7 caminos
     de 15 en la calavera y 19 de 60 en el fusil.
     ============================================================= */
  const CALAVERA = { w: 1.000, h: 0.962, c: [
    [0.369,-0.148,0.371,-0.137,0.373,-0.125,0.374,-0.113,0.375,-0.101,0.376,-0.089,0.377,-0.076,0.384,-0.059,0.39,-0.045,0.396,-0.033,0.399,-0.023,0.401,-0.015,0.402,-0.01,0.402,0.002,0.401,0.014,0.4,0.028,0.398,0.043,0.396,0.059,0.393,0.077,0.387,0.125,0.401,0.132,0.42,0.141,0.436,0.151,0.449,0.161,0.459,0.17,0.466,0.178,0.469,0.187,0.465,0.19,0.449,0.19,0.413,0.191,0.42,0.199,0.427,0.206,0.433,0.213,0.437,0.218,0.441,0.224,0.443,0.227,0.446,0.232,0.447,0.237,0.449,0.244,0.449,0.251,0.45,0.26,0.451,0.268,0.448,0.273,0.436,0.267,0.423,0.26,0.41,0.251,0.394,0.24,0.378,0.226,0.361,0.211,0.326,0.174,0.322,0.219,0.322,0.227,0.322,0.234,0.323,0.24,0.323,0.244,0.324,0.248,0.324,0.25,0.327,0.256,0.33,0.261,0.334,0.266,0.338,0.27,0.344,0.275,0.351,0.279,0.351,0.28,0.35,0.282,0.349,0.283,0.347,0.283,0.345,0.284,0.342,0.285,0.334,0.282,0.327,0.277,0.322,0.273,0.317,0.267,0.314,0.262,0.312,0.255,0.311,0.252,0.311,0.248,0.311,0.243,0.31,0.237,0.31,0.23,0.31,0.223,0.315,0.16,0.311,0.155,0.309,0.148,0.307,0.143,0.305,0.138,0.304,0.134,0.304,0.129,0.307,0.111,0.311,0.097,0.371,0.118,0.371,0.117,0.371,0.109,0.372,0.101,0.373,0.091,0.375,0.08,0.377,0.068,0.38,0.055,0.383,0.042,0.386,0.03,0.387,0.019,0.389,0.009,0.39,0.0,0.39,-0.007,0.377,-0.037,0.376,-0.04,0.375,-0.028,0.374,-0.016,0.373,-0.004,0.371,0.007,0.369,0.019,0.367,0.03,0.32,0.02,0.322,0.043,0.321,0.068,0.313,0.069,0.31,0.065,0.31,0.018,0.285,0.015,0.262,0.014,0.239,0.015,0.218,0.018,0.199,0.023,0.18,0.03,0.215,0.227,0.221,0.227,0.224,0.261,0.224,0.282,0.223,0.304,0.222,0.329,0.22,0.357,0.218,0.388,0.215,0.42,0.209,0.42,0.206,0.417,0.206,0.406,0.212,0.272,0.169,0.279,0.163,0.188,0.156,0.216,0.15,0.206,0.146,0.195,0.143,0.183,0.143,0.169,0.143,0.155,0.144,0.138,0.113,0.102,0.118,0.125,0.121,0.148,0.123,0.173,0.123,0.197,0.122,0.223,0.12,0.249,0.113,0.25,0.114,0.257,0.114,0.263,0.113,0.27,0.113,0.276,0.11,0.283,0.108,0.289,0.091,0.291,0.091,0.28,0.093,0.269,0.094,0.258,0.097,0.248,0.1,0.238,0.104,0.228,0.107,0.219,0.104,0.207,0.102,0.201,0.1,0.195,0.097,0.191,0.093,0.187,0.088,0.184,0.083,0.182,0.064,0.256,0.061,0.257,0.05,0.282,0.046,0.28,0.021,0.225,0.016,0.291,0.015,0.29,-0.018,0.285,-0.021,0.274,-0.02,0.265,-0.018,0.256,-0.015,0.247,-0.012,0.24,-0.008,0.232,-0.003,0.225,-0.034,0.194,-0.038,0.195,-0.043,0.208,-0.048,0.221,-0.054,0.234,-0.059,0.248,-0.064,0.263,-0.069,0.277,-0.113,0.27,-0.071,0.03,-0.097,0.021,-0.123,0.016,-0.153,0.014,-0.186,0.016,-0.221,0.021,-0.258,0.03,-0.26,0.019,-0.262,0.007,-0.264,-0.006,-0.265,-0.018,-0.266,-0.03,-0.267,-0.043,-0.268,-0.065,-0.268,-0.069,-0.268,-0.082,-0.267,-0.096,-0.265,-0.109,-0.265,-0.122,-0.262,-0.135,-0.26,-0.148,-0.261,-0.186,-0.26,-0.25,-0.262,-0.248,-0.265,-0.247,-0.268,-0.245,-0.271,-0.244,-0.275,-0.243,-0.279,-0.243,-0.285,-0.243,-0.291,-0.245,-0.298,-0.247,-0.306,-0.25,-0.314,-0.253,-0.323,-0.257,-0.322,-0.067,-0.322,0.04,-0.325,0.205,-0.331,0.205,-0.334,0.042,-0.334,-0.067,-0.334,-0.263,-0.344,-0.269,-0.357,-0.276,-0.369,-0.284,-0.383,-0.293,-0.396,-0.303,-0.411,-0.314,-0.438,-0.334,-0.46,-0.351,-0.478,-0.365,-0.49,-0.375,-0.498,-0.382,-0.5,-0.385,-0.499,-0.389,-0.498,-0.395,-0.495,-0.401,-0.492,-0.409,-0.488,-0.418,-0.482,-0.429,-0.475,-0.441,-0.469,-0.453,-0.463,-0.462,-0.457,-0.47,-0.451,-0.477,-0.445,-0.481,-0.342,-0.385,-0.315,-0.359,-0.294,-0.337,-0.276,-0.319,-0.265,-0.303,-0.257,-0.291,-0.255,-0.283,-0.255,-0.271,-0.252,-0.271,-0.248,-0.188,-0.248,-0.158,-0.221,-0.186,-0.197,-0.217,-0.176,-0.249,-0.159,-0.284,-0.144,-0.321,-0.133,-0.36,-0.11,-0.375,-0.087,-0.388,-0.062,-0.398,-0.037,-0.406,-0.01,-0.41,0.018,-0.411,0.036,-0.411,0.051,-0.411,0.054,-0.411,0.058,-0.411,0.073,-0.411,0.091,-0.411,0.119,-0.41,0.146,-0.406,0.171,-0.398,0.196,-0.388,0.219,-0.375,0.242,-0.36,0.254,-0.319,0.269,-0.28,0.288,-0.243,0.311,-0.209,0.338,-0.178,0.369,-0.148],
    [0.215,-0.158,0.137,-0.133,0.131,-0.145,0.129,-0.14,0.126,-0.136,0.123,-0.132,0.119,-0.127,0.114,-0.123,0.11,-0.118,0.08,-0.097,0.081,-0.165,0.081,-0.24,0.078,-0.21,0.071,-0.132,0.065,-0.136,0.061,-0.141,0.057,-0.145,0.054,-0.15,0.053,-0.155,0.052,-0.161,0.058,-0.199,0.064,-0.238,0.064,-0.252,0.052,-0.258,0.049,-0.234,0.045,-0.212,0.041,-0.191,0.037,-0.172,0.032,-0.155,0.028,-0.138,0.028,-0.138,0.029,-0.097,-0.001,-0.118,-0.022,-0.145,-0.028,-0.133,-0.106,-0.158,-0.166,-0.179,-0.169,-0.178,-0.171,-0.178,-0.173,-0.176,-0.174,-0.174,-0.175,-0.171,-0.175,-0.168,-0.166,-0.164,-0.169,-0.162,-0.166,-0.152,-0.161,-0.141,-0.154,-0.13,-0.145,-0.118,-0.133,-0.105,-0.12,-0.091,-0.102,-0.076,-0.085,-0.062,-0.067,-0.053,-0.05,-0.045,-0.033,-0.041,-0.015,-0.039,-0.011,-0.039,-0.008,-0.039,-0.006,-0.04,-0.006,-0.041,-0.007,-0.042,-0.009,-0.043,-0.009,-0.056,-0.013,-0.061,-0.016,-0.066,-0.018,-0.069,-0.02,-0.073,-0.021,-0.076,-0.021,-0.079,0.015,-0.079,0.015,-0.075,0.012,-0.068,0.008,-0.061,0.006,-0.053,0.005,-0.043,0.003,-0.033,0.003,-0.022,0.004,-0.01,0.005,0.005,0.007,0.021,0.01,0.039,0.014,0.059,0.018,0.082,0.033,0.148,0.033,0.181,0.036,0.164,0.039,0.148,0.051,0.092,0.051,0.064,0.054,0.079,0.058,0.064,0.058,0.092,0.07,0.148,0.073,0.164,0.076,0.181,0.076,0.148,0.09,0.082,0.095,0.059,0.099,0.039,0.102,0.021,0.104,0.005,0.105,-0.01,0.106,-0.022,0.106,-0.033,0.104,-0.043,0.103,-0.053,0.1,-0.061,0.097,-0.068,0.094,-0.075,0.094,-0.079,0.13,-0.079,0.13,-0.076,0.129,-0.073,0.127,-0.069,0.125,-0.066,0.122,-0.061,0.118,-0.056,0.118,-0.043,0.116,-0.042,0.115,-0.041,0.115,-0.04,0.117,-0.039,0.12,-0.039,0.124,-0.039,0.142,-0.041,0.159,-0.045,0.176,-0.053,0.194,-0.062,0.211,-0.076,0.229,-0.091,0.242,-0.105,0.254,-0.118,0.263,-0.13,0.27,-0.141,0.275,-0.152,0.278,-0.162,0.275,-0.164,0.284,-0.168,0.284,-0.171,0.283,-0.174,0.281,-0.176,0.28,-0.178,0.278,-0.178,0.275,-0.179,0.27,-0.178,0.263,-0.175,0.254,-0.172,0.243,-0.168,0.23,-0.164,0.215,-0.158],
    [0.494,-0.303,0.491,-0.299,0.477,-0.306,0.469,-0.313,0.469,-0.313,0.469,-0.28,0.469,-0.25,0.469,-0.221,0.467,-0.191,0.465,-0.162,0.463,-0.132,0.46,-0.102,0.454,-0.102,0.452,-0.105,0.451,-0.116,0.458,-0.307,0.454,-0.305,0.45,-0.302,0.446,-0.299,0.442,-0.296,0.438,-0.293,0.433,-0.289,0.423,-0.28,0.413,-0.273,0.405,-0.268,0.399,-0.263,0.393,-0.261,0.39,-0.26,0.356,-0.262,0.347,-0.274,0.334,-0.297,0.354,-0.327,0.373,-0.352,0.393,-0.373,0.411,-0.389,0.429,-0.401,0.446,-0.409,0.462,-0.412,0.476,-0.409,0.486,-0.4,0.494,-0.385,0.498,-0.363,0.5,-0.336,0.498,-0.323,0.49,-0.322,0.492,-0.316,0.494,-0.303],
    [-0.193,0.126,-0.198,0.14,-0.206,0.155,-0.216,0.171,-0.229,0.187,-0.244,0.204,-0.262,0.223,-0.255,0.231,-0.258,0.236,-0.273,0.233,-0.287,0.245,-0.311,0.265,-0.331,0.282,-0.348,0.295,-0.363,0.303,-0.375,0.309,-0.383,0.311,-0.396,0.302,-0.402,0.291,-0.4,0.281,-0.392,0.269,-0.38,0.254,-0.362,0.237,-0.34,0.217,-0.312,0.195,-0.212,0.12,-0.203,0.122,-0.193,0.126],
    [0.445,-0.205,0.435,-0.202,0.427,-0.199,0.42,-0.197,0.416,-0.194,0.413,-0.191,0.411,-0.189,0.402,-0.174,0.387,-0.174,0.386,-0.175,0.385,-0.176,0.384,-0.178,0.384,-0.18,0.383,-0.182,0.383,-0.185,0.41,-0.234,0.442,-0.231,0.445,-0.205],
    [-0.393,-0.004,-0.4,-0.004,-0.406,-0.004,-0.412,-0.006,-0.416,-0.007,-0.419,-0.009,-0.421,-0.012,-0.433,-0.036,-0.431,-0.044,-0.416,-0.036,-0.39,-0.027,-0.39,-0.009,-0.393,-0.004],
    [-0.304,0.386,-0.305,0.478,-0.31,0.481,-0.311,0.47,-0.313,0.457,-0.314,0.443,-0.315,0.426,-0.316,0.408,-0.316,0.388,-0.314,0.294,-0.307,0.294,-0.304,0.386]
  ] };
  const ARMERIA = { w: 1.000, h: 0.728, c: [
    [0.257,-0.257,0.333,-0.278,0.335,-0.27,0.388,-0.284,0.381,-0.31,0.403,-0.316,0.41,-0.288,0.407,-0.278,0.41,-0.263,0.42,-0.265,0.454,-0.273,0.455,-0.271,0.486,-0.28,0.493,-0.252,0.462,-0.243,0.464,-0.237,0.431,-0.223,0.436,-0.203,0.433,-0.199,0.43,-0.195,0.424,-0.194,0.416,-0.193,0.407,-0.194,0.397,-0.195,0.383,-0.19,0.383,-0.189,0.382,-0.187,0.379,-0.184,0.375,-0.18,0.368,-0.175,0.36,-0.17,0.35,-0.163,0.347,-0.163,0.344,-0.164,0.342,-0.165,0.34,-0.166,0.338,-0.168,0.337,-0.169,0.337,-0.172,0.316,-0.164,0.292,-0.155,0.293,-0.155,0.295,-0.135,0.295,-0.131,0.302,-0.132,0.303,-0.125,0.298,-0.117,0.295,-0.115,0.294,-0.113,0.292,-0.113,0.29,-0.112,0.289,-0.111,0.288,-0.111,0.281,-0.116,0.278,-0.122,0.279,-0.124,0.279,-0.125,0.281,-0.127,0.283,-0.128,0.286,-0.129,0.289,-0.13,0.29,-0.13,0.29,-0.135,0.29,-0.139,0.289,-0.142,0.288,-0.146,0.287,-0.148,0.285,-0.15,0.282,-0.152,0.269,-0.147,0.256,-0.142,0.244,-0.137,0.233,-0.132,0.223,-0.127,0.213,-0.123,0.212,-0.119,0.211,-0.117,0.209,-0.114,0.207,-0.113,0.206,-0.111,0.204,-0.11,0.201,-0.109,0.199,-0.108,0.196,-0.108,0.194,-0.109,0.192,-0.11,0.19,-0.111,0.188,-0.113,0.181,-0.119,0.176,-0.103,0.169,-0.1,0.173,-0.086,0.177,-0.073,0.181,-0.059,0.185,-0.046,0.19,-0.034,0.194,-0.022,0.198,-0.021,0.202,-0.02,0.207,-0.018,0.212,-0.014,0.217,-0.01,0.222,-0.006,0.25,0.018,0.248,0.021,0.246,0.02,0.243,0.018,0.238,0.015,0.232,0.011,0.223,0.007,0.214,0.002,0.2,-0.009,0.205,0.003,0.21,0.015,0.216,0.026,0.222,0.036,0.228,0.046,0.234,0.056,0.23,0.059,0.232,0.066,0.229,0.07,0.228,0.07,0.227,0.071,0.227,0.072,0.227,0.073,0.226,0.073,0.226,0.074,0.226,0.075,0.227,0.076,0.227,0.076,0.227,0.077,0.228,0.077,0.229,0.076,0.232,0.079,0.228,0.089,0.226,0.093,0.226,0.12,0.224,0.163,0.222,0.163,0.221,0.12,0.221,0.111,0.219,0.104,0.217,0.098,0.217,0.093,0.216,0.088,0.215,0.083,0.215,0.079,0.217,0.069,0.17,0.103,0.171,0.116,0.171,0.12,0.172,0.12,0.174,0.18,0.172,0.24,0.169,0.24,0.168,0.189,0.164,0.204,0.162,0.211,0.161,0.219,0.159,0.228,0.158,0.237,0.157,0.246,0.157,0.256,0.156,0.343,0.155,0.344,0.153,0.336,0.153,0.325,0.152,0.313,0.152,0.3,0.152,0.284,0.152,0.267,0.151,0.258,0.15,0.249,0.15,0.24,0.15,0.232,0.15,0.224,0.15,0.217,0.151,0.204,0.152,0.193,0.155,0.184,0.158,0.177,0.163,0.173,0.168,0.17,0.168,0.148,0.167,0.158,0.166,0.16,0.164,0.157,0.164,0.155,0.163,0.151,0.163,0.147,0.163,0.142,0.163,0.137,0.163,0.131,0.163,0.125,0.163,0.12,0.163,0.116,0.164,0.111,0.164,0.107,0.157,0.112,0.155,0.134,0.155,0.134,0.153,0.157,0.15,0.157,0.149,0.156,0.149,0.14,0.13,0.145,0.129,0.186,0.124,0.189,0.123,0.184,0.121,0.178,0.12,0.17,0.119,0.162,0.119,0.152,0.119,0.141,0.119,0.136,0.119,0.135,0.119,0.128,0.119,0.128,0.119,0.12,0.12,0.113,0.12,0.108,0.121,0.103,0.122,0.099,0.123,0.096,0.119,0.089,0.114,0.081,0.111,0.073,0.107,0.065,0.103,0.057,0.099,0.048,0.1,0.054,0.094,0.057,0.09,0.054,0.089,0.049,0.089,0.042,0.09,0.041,0.09,0.04,0.091,0.04,0.092,0.04,0.094,0.04,0.096,0.04,0.09,0.026,0.084,0.012,0.079,-0.003,0.073,-0.018,0.068,-0.035,0.062,-0.051,0.053,-0.047,0.037,-0.037,0.013,-0.031,0.014,-0.012,0.021,0.009,0.022,0.015,0.023,0.021,0.023,0.027,0.023,0.034,0.023,0.04,0.023,0.046,0.021,0.062,0.017,0.065,0.014,0.055,0.013,0.088,0.01,0.089,0.009,0.087,0.009,0.024,0.007,0.015,0.006,0.008,0.003,0.001,0.0,-0.006,-0.004,-0.012,-0.008,-0.016,-0.008,-0.022,-0.004,-0.022,-0.002,-0.022,0.001,-0.021,0.004,-0.02,0.007,-0.019,0.009,-0.017,0.009,-0.03,-0.057,-0.012,-0.074,0.004,-0.08,0.003,-0.081,0.002,-0.081,0.001,-0.081,-0.001,-0.082,-0.002,-0.082,-0.004,-0.082,-0.006,-0.081,-0.011,-0.081,-0.013,-0.08,-0.015,-0.079,-0.017,-0.078,-0.019,-0.076,-0.02,-0.075,-0.021,-0.078,-0.023,-0.089,-0.065,-0.078,-0.083,-0.197,-0.051,-0.2,-0.042,-0.197,-0.041,-0.194,-0.039,-0.191,-0.036,-0.189,-0.034,-0.186,-0.03,-0.185,-0.027,-0.121,-0.044,-0.087,-0.012,-0.087,-0.01,-0.092,0.003,-0.096,0.018,-0.098,0.034,-0.098,0.051,-0.097,0.068,-0.095,0.087,-0.094,0.089,-0.091,0.089,-0.089,0.09,-0.086,0.092,-0.085,0.094,-0.083,0.097,-0.082,0.1,-0.081,0.101,-0.078,0.101,-0.076,0.118,-0.078,0.134,-0.079,0.135,-0.08,0.133,-0.081,0.131,-0.081,0.128,-0.081,0.125,-0.082,0.122,-0.082,0.118,-0.082,0.107,-0.083,0.108,-0.09,0.112,-0.093,0.114,-0.093,0.166,-0.098,0.169,-0.098,0.211,-0.1,0.212,-0.103,0.212,-0.106,0.19,-0.108,0.172,-0.11,0.156,-0.111,0.143,-0.112,0.133,-0.112,0.127,-0.112,0.117,-0.166,0.12,-0.171,0.102,-0.173,0.083,-0.174,0.063,-0.173,0.043,-0.171,0.023,-0.166,0.001,-0.166,-0.006,-0.167,-0.012,-0.168,-0.017,-0.171,-0.021,-0.175,-0.024,-0.18,-0.026,-0.185,-0.027],
    [0.49,0.087,0.408,0.065,0.412,0.048,0.418,0.026,0.417,0.024,0.416,0.023,0.415,0.021,0.414,0.02,0.413,0.019,0.411,0.019,0.402,0.019,0.4,0.021,0.399,0.023,0.398,0.025,0.397,0.027,0.396,0.029,0.395,0.032,0.394,0.037,0.393,0.042,0.393,0.046,0.392,0.05,0.392,0.052,0.393,0.055,0.429,0.094,0.436,0.101,0.443,0.108,0.448,0.115,0.453,0.121,0.457,0.127,0.46,0.131,0.463,0.135,0.465,0.14,0.468,0.145,0.469,0.151,0.471,0.157,0.472,0.164,0.472,0.17,0.472,0.177,0.471,0.184,0.47,0.191,0.469,0.199,0.466,0.206,0.463,0.219,0.458,0.232,0.452,0.242,0.445,0.251,0.438,0.26,0.43,0.267,0.421,0.272,0.411,0.276,0.401,0.278,0.39,0.279,0.378,0.279,0.365,0.278,0.357,0.309,0.316,0.298,0.324,0.267,0.315,0.263,0.307,0.259,0.3,0.253,0.293,0.246,0.287,0.239,0.282,0.23,0.276,0.221,0.272,0.21,0.27,0.198,0.27,0.184,0.272,0.169,0.276,0.152,0.281,0.134,0.363,0.155,0.357,0.177,0.355,0.186,0.353,0.194,0.351,0.201,0.35,0.206,0.35,0.211,0.35,0.213,0.35,0.215,0.35,0.217,0.35,0.218,0.351,0.219,0.353,0.219,0.354,0.22,0.363,0.219,0.37,0.207,0.376,0.173,0.375,0.169,0.374,0.165,0.372,0.161,0.369,0.156,0.365,0.151,0.36,0.146,0.351,0.136,0.343,0.127,0.337,0.119,0.331,0.112,0.326,0.106,0.322,0.1,0.318,0.096,0.315,0.091,0.312,0.086,0.311,0.08,0.309,0.074,0.307,0.067,0.307,0.06,0.306,0.053,0.307,0.045,0.307,0.037,0.309,0.03,0.311,0.021,0.314,0.01,0.318,0.0,0.324,-0.009,0.33,-0.017,0.337,-0.023,0.345,-0.029,0.353,-0.032,0.362,-0.036,0.372,-0.038,0.382,-0.039,0.394,-0.039,0.406,-0.039,0.413,-0.063,0.454,-0.052,0.447,-0.028,0.457,-0.023,0.466,-0.017,0.474,-0.01,0.481,-0.004,0.487,0.003,0.492,0.011,0.496,0.019,0.497,0.028,0.498,0.038,0.498,0.048,0.497,0.059,0.494,0.07,0.49,0.087],
    [-0.362,0.002,-0.35,0.006,-0.349,0.006,-0.349,0.004,-0.346,0.004,-0.346,0.002,-0.342,0.002,-0.342,0.004,-0.338,0.004,-0.336,0.002,-0.333,0.0,-0.33,-0.002,-0.326,-0.004,-0.322,-0.006,-0.318,-0.007,-0.312,-0.01,-0.306,-0.012,-0.301,-0.014,-0.296,-0.015,-0.292,-0.015,-0.288,-0.015,-0.293,-0.007,-0.297,0.002,-0.3,0.012,-0.303,0.023,-0.304,0.034,-0.304,0.046,-0.304,0.057,-0.303,0.058,-0.31,0.058,-0.327,0.043,-0.341,0.028,-0.34,0.05,-0.339,0.052,-0.338,0.053,-0.337,0.056,-0.336,0.058,-0.336,0.06,-0.335,0.063,-0.335,0.065,-0.335,0.07,-0.336,0.075,-0.337,0.08,-0.337,0.084,-0.339,0.087,-0.34,0.091,-0.34,0.096,-0.342,0.19,-0.345,0.19,-0.346,0.189,-0.346,0.076,-0.349,0.078,-0.353,0.039,-0.355,0.037,-0.357,0.036,-0.359,0.035,-0.36,0.032,-0.362,0.03,-0.363,0.028,-0.363,0.026,-0.372,0.037,-0.369,0.048,-0.368,0.048,-0.368,0.051,-0.368,0.056,-0.369,0.069,-0.372,0.069,-0.376,0.061,-0.379,0.051,-0.378,0.05,-0.379,0.048,-0.379,0.046,-0.377,0.046,-0.376,0.042,-0.38,0.046,-0.403,0.073,-0.4,0.073,-0.399,0.073,-0.397,0.074,-0.395,0.075,-0.394,0.077,-0.393,0.079,-0.387,0.081,-0.392,0.086,-0.393,0.086,-0.396,0.096,-0.398,0.098,-0.4,0.1,-0.402,0.102,-0.404,0.103,-0.406,0.103,-0.409,0.103,-0.411,0.103,-0.412,0.103,-0.414,0.102,-0.415,0.101,-0.416,0.1,-0.417,0.098,-0.42,0.092,-0.423,0.095,-0.431,0.092,-0.389,0.048,-0.365,0.021,-0.368,0.013,-0.368,0.003,-0.386,0.008,-0.387,0.004,-0.451,0.021,-0.431,0.137,-0.439,0.139,-0.448,0.153,-0.456,0.15,-0.448,0.136,-0.447,0.136,-0.459,0.09,-0.461,0.093,-0.463,0.095,-0.465,0.096,-0.466,0.097,-0.468,0.097,-0.469,0.098,-0.47,0.098,-0.474,0.097,-0.477,0.096,-0.48,0.095,-0.481,0.092,-0.481,0.089,-0.481,0.085,-0.48,0.08,-0.479,0.078,-0.476,0.075,-0.473,0.074,-0.469,0.073,-0.464,0.073,-0.456,0.074,-0.456,0.083,-0.459,0.09],
    [-0.223,0.151,-0.2,0.157,-0.204,0.171,-0.198,0.174,-0.193,0.177,-0.188,0.181,-0.184,0.184,-0.18,0.189,-0.177,0.193,-0.175,0.198,-0.174,0.203,-0.174,0.208,-0.174,0.215,-0.175,0.221,-0.176,0.227,-0.179,0.237,-0.227,0.224,-0.223,0.215,-0.221,0.202,-0.221,0.201,-0.221,0.2,-0.222,0.199,-0.222,0.198,-0.223,0.197,-0.224,0.197,-0.229,0.198,-0.233,0.206,-0.234,0.208,-0.234,0.211,-0.234,0.213,-0.235,0.215,-0.234,0.217,-0.234,0.218,-0.233,0.221,-0.23,0.223,-0.227,0.227,-0.223,0.231,-0.218,0.236,-0.213,0.241,-0.196,0.262,-0.194,0.265,-0.193,0.267,-0.191,0.271,-0.19,0.274,-0.189,0.278,-0.189,0.282,-0.193,0.306,-0.195,0.313,-0.198,0.32,-0.201,0.326,-0.205,0.332,-0.209,0.336,-0.214,0.34,-0.219,0.343,-0.224,0.345,-0.23,0.347,-0.236,0.348,-0.243,0.348,-0.251,0.347,-0.256,0.364,-0.279,0.358,-0.274,0.341,-0.279,0.339,-0.284,0.336,-0.288,0.333,-0.292,0.329,-0.296,0.325,-0.299,0.32,-0.303,0.314,-0.305,0.307,-0.306,0.301,-0.306,0.293,-0.305,0.284,-0.303,0.274,-0.299,0.263,-0.252,0.276,-0.255,0.289,-0.257,0.294,-0.258,0.299,-0.259,0.303,-0.259,0.306,-0.259,0.308,-0.259,0.31,-0.259,0.311,-0.259,0.311,-0.259,0.312,-0.259,0.312,-0.258,0.313,-0.257,0.314,-0.251,0.314,-0.248,0.306,-0.244,0.287,-0.245,0.285,-0.245,0.282,-0.247,0.279,-0.249,0.277,-0.251,0.274,-0.254,0.271,-0.276,0.245,-0.278,0.242,-0.279,0.239,-0.281,0.237,-0.282,0.233,-0.283,0.229,-0.284,0.226,-0.285,0.221,-0.285,0.217,-0.285,0.213,-0.284,0.208,-0.283,0.204,-0.282,0.199,-0.28,0.193,-0.277,0.187,-0.274,0.182,-0.271,0.178,-0.267,0.174,-0.262,0.171,-0.257,0.168,-0.252,0.167,-0.246,0.165,-0.24,0.164,-0.234,0.164,-0.227,0.165,-0.223,0.151],
    [-0.384,-0.357,-0.359,-0.364,-0.355,-0.349,-0.348,-0.349,-0.342,-0.349,-0.336,-0.348,-0.329,-0.347,-0.324,-0.345,-0.318,-0.342,-0.314,-0.339,-0.31,-0.334,-0.307,-0.329,-0.304,-0.324,-0.301,-0.318,-0.299,-0.311,-0.296,-0.3,-0.348,-0.287,-0.35,-0.297,-0.354,-0.311,-0.36,-0.312,-0.365,-0.31,-0.364,-0.3,-0.359,-0.288,-0.355,-0.287,-0.351,-0.285,-0.347,-0.283,-0.341,-0.282,-0.334,-0.28,-0.327,-0.278,-0.299,-0.267,-0.282,-0.253,-0.279,-0.25,-0.278,-0.246,-0.276,-0.242,-0.274,-0.238,-0.273,-0.233,-0.272,-0.228,-0.27,-0.22,-0.269,-0.212,-0.268,-0.205,-0.27,-0.197,-0.271,-0.191,-0.273,-0.184,-0.276,-0.179,-0.28,-0.174,-0.284,-0.169,-0.29,-0.165,-0.296,-0.161,-0.304,-0.158,-0.299,-0.139,-0.325,-0.132,-0.329,-0.151,-0.336,-0.15,-0.341,-0.15,-0.347,-0.151,-0.353,-0.153,-0.359,-0.155,-0.364,-0.158,-0.37,-0.161,-0.376,-0.166,-0.381,-0.172,-0.384,-0.179,-0.388,-0.188,-0.392,-0.198,-0.395,-0.21,-0.344,-0.224,-0.34,-0.21,-0.332,-0.189,-0.328,-0.186,-0.323,-0.189,-0.324,-0.198,-0.331,-0.218,-0.332,-0.22,-0.334,-0.222,-0.337,-0.224,-0.34,-0.225,-0.344,-0.227,-0.348,-0.228,-0.383,-0.24,-0.386,-0.241,-0.389,-0.243,-0.392,-0.245,-0.395,-0.248,-0.398,-0.251,-0.401,-0.254,-0.404,-0.258,-0.406,-0.262,-0.408,-0.266,-0.41,-0.27,-0.412,-0.275,-0.414,-0.28,-0.415,-0.287,-0.416,-0.294,-0.416,-0.3,-0.415,-0.306,-0.413,-0.312,-0.41,-0.317,-0.407,-0.322,-0.403,-0.327,-0.399,-0.331,-0.393,-0.335,-0.387,-0.338,-0.381,-0.342,-0.384,-0.357],
    [-0.112,-0.31,-0.111,-0.307,-0.109,-0.305,-0.109,-0.301,-0.108,-0.298,-0.108,-0.295,-0.108,-0.291,-0.109,-0.285,-0.136,-0.288,-0.136,-0.294,-0.135,-0.302,-0.138,-0.304,-0.14,-0.303,-0.142,-0.299,-0.141,-0.292,-0.128,-0.281,-0.117,-0.27,-0.116,-0.268,-0.114,-0.267,-0.113,-0.265,-0.112,-0.263,-0.111,-0.261,-0.111,-0.259,-0.111,-0.245,-0.112,-0.241,-0.113,-0.237,-0.114,-0.233,-0.116,-0.229,-0.117,-0.226,-0.119,-0.223,-0.122,-0.222,-0.125,-0.22,-0.128,-0.219,-0.132,-0.218,-0.136,-0.217,-0.141,-0.217,-0.141,-0.207,-0.155,-0.208,-0.154,-0.218,-0.157,-0.219,-0.16,-0.221,-0.162,-0.222,-0.165,-0.224,-0.168,-0.226,-0.17,-0.229,-0.172,-0.232,-0.174,-0.235,-0.175,-0.239,-0.175,-0.243,-0.176,-0.248,-0.175,-0.254,-0.174,-0.26,-0.147,-0.257,-0.148,-0.25,-0.148,-0.238,-0.147,-0.235,-0.144,-0.237,-0.142,-0.24,-0.141,-0.251,-0.142,-0.253,-0.142,-0.254,-0.144,-0.256,-0.145,-0.257,-0.147,-0.259,-0.149,-0.26,-0.163,-0.272,-0.169,-0.283,-0.171,-0.298,-0.17,-0.302,-0.169,-0.305,-0.167,-0.309,-0.166,-0.311,-0.164,-0.314,-0.162,-0.316,-0.159,-0.317,-0.156,-0.319,-0.153,-0.321,-0.15,-0.321,-0.146,-0.322,-0.142,-0.322,-0.141,-0.331,-0.128,-0.329,-0.129,-0.321,-0.125,-0.32,-0.122,-0.318,-0.119,-0.316,-0.116,-0.315,-0.114,-0.312,-0.112,-0.31],
    [0.013,-0.192,0.011,-0.199,0.004,-0.207,-0.186,-0.149,-0.191,-0.146,-0.192,-0.144,-0.194,-0.14,-0.197,-0.139,-0.201,-0.141,-0.205,-0.138,-0.209,-0.135,-0.212,-0.132,-0.215,-0.129,-0.218,-0.125,-0.22,-0.122,-0.217,-0.121,-0.212,-0.113,-0.211,-0.111,-0.211,-0.109,-0.211,-0.108,-0.212,-0.106,-0.212,-0.105,-0.213,-0.103,-0.215,-0.101,-0.215,-0.1,-0.208,-0.092,-0.191,-0.097,-0.175,-0.102,-0.158,-0.107,-0.142,-0.112,-0.125,-0.117,-0.109,-0.122,-0.108,-0.124,-0.107,-0.127,-0.105,-0.129,-0.102,-0.13,-0.1,-0.131,-0.096,-0.13,-0.091,-0.129,-0.091,-0.127,-0.072,-0.131,-0.053,-0.136,-0.034,-0.141,-0.015,-0.146,0.003,-0.15,0.023,-0.154],
    [0.19,-0.214,0.195,-0.218,0.196,-0.218,0.196,-0.232,0.128,-0.214,0.14,-0.193,0.142,-0.191,0.142,-0.19,0.161,-0.195,0.158,-0.206,0.19,-0.214,0.188,-0.213,0.187,-0.211,0.186,-0.21,0.185,-0.208,0.185,-0.207,0.185,-0.205,0.185,-0.196,0.186,-0.194,0.187,-0.192,0.189,-0.19,0.191,-0.189,0.194,-0.188,0.197,-0.188,0.199,-0.188,0.2,-0.189,0.201,-0.189,0.204,-0.19,0.205,-0.191,0.207,-0.193,0.212,-0.202,0.209,-0.206,0.208,-0.207,0.207,-0.207,0.207,-0.208,0.206,-0.209,0.206,-0.21,0.206,-0.211,0.205,-0.216,0.211,-0.22],
    [-0.464,0.073,-0.493,-0.039,-0.477,-0.043,-0.456,0.002,-0.412,-0.01,-0.378,-0.043,-0.354,-0.046,-0.266,-0.09,-0.267,-0.092,-0.268,-0.098,-0.268,-0.101,-0.267,-0.103,-0.267,-0.106,-0.266,-0.108,-0.265,-0.11,-0.264,-0.112,-0.262,-0.115,-0.26,-0.118,-0.257,-0.12,-0.254,-0.122,-0.251,-0.123,-0.248,-0.124,-0.228,-0.122,-0.228,-0.122,-0.221,-0.122,-0.22,-0.122],
    [0.383,-0.19,0.386,-0.199,0.384,-0.204,0.383,-0.205,0.378,-0.206,0.375,-0.206,0.372,-0.206,0.369,-0.205,0.367,-0.204,0.366,-0.202,0.364,-0.191,0.36,-0.197,0.359,-0.199,0.356,-0.2,0.354,-0.201,0.351,-0.201,0.349,-0.202,0.345,-0.202,0.34,-0.201,0.339,-0.2,0.336,-0.177,0.337,-0.172],
    [-0.201,-0.141,-0.215,-0.149,-0.216,-0.15,-0.217,-0.151,-0.218,-0.153,-0.219,-0.155,-0.219,-0.157,-0.219,-0.16,-0.219,-0.164,-0.218,-0.167,-0.216,-0.17,-0.212,-0.171,-0.208,-0.172,-0.203,-0.172,-0.198,-0.172,-0.194,-0.17,-0.19,-0.168,-0.188,-0.166,-0.187,-0.162,-0.186,-0.158,-0.189,-0.151,-0.191,-0.146],
    [0.296,-0.346,0.298,-0.339,0.298,-0.336,0.297,-0.333,0.296,-0.331,0.296,-0.328,0.295,-0.326,0.294,-0.324,0.292,-0.322,0.29,-0.32,0.288,-0.319,0.286,-0.318,0.284,-0.317,0.281,-0.317,0.27,-0.318,0.27,-0.34,0.273,-0.344,0.276,-0.343,0.281,-0.347,0.292,-0.35,0.296,-0.346],
    [-0.338,0.013,-0.339,0.016,-0.337,0.02,-0.334,0.024,-0.331,0.028,-0.326,0.034,-0.321,0.039,-0.316,0.045,-0.307,0.053,-0.307,0.006,-0.31,0.004,-0.32,0.012,-0.327,0.018,-0.327,0.019,-0.328,0.019,-0.329,0.021,-0.332,0.02,-0.337,0.02,-0.336,0.016,-0.335,0.013,-0.338,0.013],
    [0.096,0.04,0.097,0.041,0.096,0.035,0.096,0.029,0.095,0.02,0.095,0.012,0.094,0.002,0.094,-0.009,0.095,-0.041,0.096,-0.048,0.097,-0.053,0.098,-0.058,0.1,-0.062,0.102,-0.064,0.104,-0.066,0.105,-0.062,0.105,0.046,0.1,0.048,0.099,0.047,0.099,0.048],
    [-0.215,-0.1,-0.218,-0.086,-0.22,-0.083,-0.222,-0.08,-0.224,-0.078,-0.227,-0.076,-0.23,-0.074,-0.234,-0.073,-0.254,-0.076,-0.257,-0.078,-0.259,-0.079,-0.261,-0.081,-0.263,-0.084,-0.265,-0.087,-0.266,-0.09,-0.235,-0.103],
    [-0.225,0.073,-0.197,0.043,-0.177,0.018,-0.174,0.032,-0.184,0.043,-0.193,0.053,-0.201,0.061,-0.21,0.068,-0.217,0.072,-0.224,0.075,-0.225,0.073],
    [0.128,-0.214,0.123,-0.221,0.013,-0.192,0.023,-0.154,0.032,-0.151,0.163,-0.186],
    [-0.078,-0.083,-0.006,-0.102,0.021,-0.108,0.053,-0.047],
    [0.013,-0.031,0.023,-0.051,0.012,-0.092,-0.006,-0.102]
  ] };

  function estarcir(g, D, cx, cy, tam) {
    g.save();
    g.translate(cx, cy);
    g.scale(tam, tam);
    g.beginPath();
    for (let i = 0; i < D.c.length; i++) {
      const c = D.c[i];
      g.moveTo(c[0], c[1]);
      for (let k = 2; k < c.length; k += 2) g.lineTo(c[k], c[k + 1]);
      g.closePath();
    }
    /* 'evenodd' es lo que hace que los huecos -las cuencas de los
       ojos, el interior del guardamonte- salgan huecos en vez de
       macizos: en el SWF son caminos del mismo relleno metidos
       dentro del contorno. */
    g.fill('evenodd');
    g.restore();
  }

  Art.texPuerta = function (tipo) {
    const k = tipo === 'armeria' ? 'armeria' : 'normal';
    Art._texPta = Art._texPta || {};
    if (Art._texPta[k]) return Art._texPta[k];
    const D = PTA[k];

    const AN = 160, AL = Math.round(160 * D.aspecto);
    const ml = Math.round(AN * M_LADO), ma = Math.round(AL * M_ARRIBA);
    const c = document.createElement('canvas');
    c.width = AN + ml * 2; c.height = AL + ma;      // sin marco abajo
    const g = c.getContext('2d');

    /* El marco primero, en todo el lienzo; el panel se pinta encima
       y deja el marco asomando por arriba y por los costados. Por
       abajo el panel llega al borde, que es el suelo. */
    g.fillStyle = '#4F4F4F'; g.fillRect(0, 0, c.width, c.height);

    g.save();
    g.translate(ml, ma);                            // origen = el panel

    g.fillStyle = D.hoja; g.fillRect(0, 0, AN, AL);

    /* DONDE VA CADA ESTARCIDO, medido sobre la caja de TINTA -no la
       del trazado-: la calavera al 62,8% del ancho del panel con el
       centro al 44,9% x y 50,5% y; el fusil al 87,3% con el centro
       al 49,4% x y 44,2% y. Las dos formas del SWF vienen
       normalizadas al lado mayor, que en las dos es el ancho, asi
       que el tamaño que se pasa es el ancho que ocupa. */
    g.fillStyle = 'rgba(236,236,236,0.86)';
    if (k === 'armeria') estarcir(g, ARMERIA,  AN * 0.494, AL * 0.442, AN * 0.873);
    else                 estarcir(g, CALAVERA, AN * 0.449, AL * 0.505, AN * 0.628);

    /* LA FRANJA: del 82% del alto del panel hasta el bajo. Rayas
       #A7A7A7 a paso del 21,2% del ancho, inclinacion dx/dy = -0,5. */
    const fy = AL * 0.82, fh = AL - fy;
    g.save();
    g.beginPath(); g.rect(0, fy, AN, fh); g.clip();
    g.fillStyle = D.hoja; g.fillRect(0, fy, AN, fh);
    g.fillStyle = '#A7A7A7';
    const paso = AN * 0.212, ancho = paso * 0.48, sesgo = -fh * 0.5;
    for (let x = -paso * 2; x < AN + paso * 2; x += paso) {
      g.beginPath();
      g.moveTo(x, fy);
      g.lineTo(x + ancho, fy);
      g.lineTo(x + ancho + sesgo, fy + fh);
      g.lineTo(x + sesgo, fy + fh);
      g.closePath(); g.fill();
    }
    g.restore();
    g.restore();

    /* Las dos lineas oscuras del marco: #1B1B1B por fuera y
       #1A1A1A pegada al panel. La de abajo no existe. */
    g.strokeStyle = '#1B1B1B'; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(1, c.height); g.lineTo(1, 1);
    g.lineTo(c.width - 1, 1); g.lineTo(c.width - 1, c.height);
    g.stroke();
    g.strokeStyle = '#1A1A1A';
    g.beginPath();
    g.moveTo(ml, c.height); g.lineTo(ml, ma);
    g.lineTo(ml + AN, ma); g.lineTo(ml + AN, c.height);
    g.stroke();

    Art._texPta[k] = subir(c, { mip: false });
    return Art._texPta[k];
  };

  /* =============================================================
     LOS CARTELES DE LA SALA, SACADOS DEL SWF

     Estan en el fondo de la arena: 'madness_world' (sprite 3821),
     fotograma 'arena1', lleva 'myBG' = sprite 3801, y ahi dentro
     cuelgan como dos sprites mas:

       3790  el ARMORY       148 x 72,5 px, en (603; 262,7)
             girado 5,3 grados a la derecha (b = 0,092)
       3792  el WARNING / Press to Start, 58 x 63,25 px, en
             (727,1; 376,2) a escala 1,364 y girado 2,3 grados a la
             izquierda (b = -0,055)

     Cada uno se aisla en un SWF minimo con sus definiciones
     copiadas byte a byte y lo pinta Ruffle a x4 dos veces, sobre
     negro y sobre blanco, que es de donde sale el alfa exacto
     (tools/swf_iconos). Se guardan en 16 grises: son grises.

     El ARMORY de antes lo habia dibujado yo con canvas porque no lo
     encontraba entre las formas: no es una forma suelta, es un
     sprite del decorado. */
  function texDeImagen(ancho, alto, fondo, b64) {
    const c = document.createElement('canvas'); c.width = ancho; c.height = alto;
    const g = c.getContext('2d');
    /* Mientras llega la imagen, el gris del carton: si el primer
       fotograma pilla el canvas vacio se ve un agujero. */
    g.fillStyle = fondo; g.fillRect(0, 0, ancho, alto);
    const t = subir(c, { mip: false });
    const im = new Image();
    im.onload = function () {
      g.clearRect(0, 0, ancho, alto);
      g.drawImage(im, 0, 0, ancho, alto);
      t.needsUpdate = true;
    };
    im.src = 'data:image/png;base64,' + b64;
    return t;
  }

  /* Las medidas del SWF, para quien los cuelga. */
  Art.CARTEL_ARMERIA = { aspecto: 72.5 / 148, giro: -Math.atan2(0.092, 0.995) };
  Art.CARTEL_INICIO = { aspecto: 63.25 / 58, giro: Math.atan2(0.055, 1.364) };

  /* EL CARTEL DE SHOP, con la placa del de ARMORY (3790), medida sobre
     su imagen del SWF (296 x 145 px):

       negro 0..4 px, banda #4D4D4D hasta 12, linea negra hasta 16,
       la placa #D0D0D0 con rayas en diagonal #C4C4C4, linea negra de
       4 px y la banda de abajo mas oscura (#313131) hasta 140
       y las letras #555555, ocupando el 85% del alto de la placa

     Las letras del ARMORY son de palo seco y muy negras; aqui van con
     la Impact del propio SWF ('Impact SWF'), ensanchadas hasta llenar la
     placa como las de ARMORY. El SWF no trae un cartel de SHOP: la tienda
     de la arena es una ventana del menu (storeRoster). */
  Art.CARTEL_SHOP = { aspecto: 145 / 296 };
  Art.texCartelShop = function () {
    if (Art._texShop) return Art._texShop;
    const W = 592, H = 290, k = W / 296;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const pinta = () => {
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#040404'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#4D4D4D'; g.fillRect(4 * k, 4 * k, W - 8 * k, 127 * k);
      g.fillStyle = '#313131'; g.fillRect(4 * k, 131 * k, W - 8 * k, 9 * k);
      g.fillStyle = '#000000'; g.fillRect(13 * k, 12 * k, W - 26 * k, 119 * k);
      const px = 17 * k, py = 16 * k, pw = W - 34 * k, ph = 111 * k;
      g.fillStyle = '#D0D0D0'; g.fillRect(px, py, pw, ph);
      // las rayas de la placa: diagonales anchas, como en el ARMORY
      g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
      g.fillStyle = '#C4C4C4';
      for (let x = px - ph; x < px + pw + ph; x += 44 * k) {
        g.beginPath(); g.moveTo(x, py + ph); g.lineTo(x + 10 * k, py + ph);
        g.lineTo(x + 10 * k + ph * 0.55, py); g.lineTo(x + ph * 0.55, py); g.closePath(); g.fill();
      }
      g.restore();
      // las letras: 85% del alto de la placa, llenando su ancho
      const alto = ph * 0.85;
      g.save();
      g.font = Math.round(alto * 1.18) + "px 'Impact SWF', Impact, sans-serif";
      g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      const m = g.measureText('SHOP');
      const tinta = (m.actualBoundingBoxAscent || alto) + (m.actualBoundingBoxDescent || 0);
      const sy = alto / tinta, sx = (pw * 0.9) / m.width;
      g.translate(px + pw / 2, py + ph / 2 + alto / 2);
      g.scale(sx, sy);
      g.fillStyle = '#555555';
      g.fillText('SHOP', 0, -(m.actualBoundingBoxDescent || 0));
      g.restore();
      if (Art._texShop) Art._texShop.needsUpdate = true;
    };
    pinta();
    Art._texShop = subir(c, { mip: false });
    if (document.fonts && document.fonts.load) document.fonts.load("100px 'Impact SWF'").then(pinta, () => {});
    return Art._texShop;
  };

  Art.texCartelArmeria = function () {
    if (!Art._texArm) Art._texArm = texDeImagen(296, 145, '#8a8a8a',
    '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' +
    'rkJggg==');
    return Art._texArm;
  };

  /* EL CARTEL DE "WARNING / PRESS TO START": el sprite 3792 del
     fondo de la sala, entero y del SWF (ver arriba). Antes era un
     recorte de una captura de la arena, enderezado a mano. */
  Art.texCartelInicio = function () {
    if (!Art._texIni) Art._texIni = texDeImagen(128, 140, '#4c4c4c',
    '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');
    return Art._texIni;
  };

  /* =============================================================
     EL SUELO DE LA ARENA

     Era una losa de color plano, y con la camara picada ocupa dos
     tercios de la pantalla: dos tercios de gris muerto. Antes
     llevaba juntas de losa que daban algo que mirar, pero esas
     juntas con esta camara se leen como una rejilla negra y no es
     lo que hay en ninguna de las dos referencias.

     Lo que hay en Project Nexus es HORMIGON SUCIO. Medido sobre el
     video, en una zona de suelo limpia de efectos:

       mediana 96 de 255, percentil 3 en 68 y el 97 en 120
       desviacion tipica 15,6

     o sea que el suelo varia un +-25% alrededor de su tono, y esa
     variacion es en MANCHAS GRANDES Y DIFUSAS, no en grano fino:
     parches de varios metros, unos mas oscuros y otros mas claros,
     con los bordes deshechos.

     Asi que la textura son tres capas:

       - veinte manchas anchas de degradado radial, mitad oscuras
         mitad claras, a poca opacidad
       - unas vetas largas y finas, que es lo que deja el fratas
         al alisar el hormigon
       - grano muy fino por encima, para que no queden bandas

     Sale en gris neutro y se tiñe con el color del suelo, asi que
     la paleta del juego sigue mandando. Y se repite cada 7 metros:
     mas corto y se ve el patron, mas largo y no se nota. */
  /* =============================================================
     EL SUELO DE LA ARENA

     Es la baldosa de hormigon de siempre -la que ya tenia el
     proyecto- con UN solo cambio: fuera las cuatro salpicaduras de
     tinta que llevaba dentro.

     Esas salpicaduras eran el problema. Al repetirse la textura
     por los 44 x 21,6 m del suelo se repetian con ella, asi que lo
     que se veia no eran cuatro manchas: eran las mismas cuatro
     manchas una y otra vez, en retiacula, por toda la arena. Y una
     salpicadura en estrella se lee como un objeto -algo que esta
     ahi- no como suciedad, asi que ademas competia con lo unico
     que tiene derecho a hacer manchas negras en el suelo, que es
     la sangre.

     Todo lo demas se queda igual, y el motivo de que se quede
     igual es que ya estaba bien: la junta en cruz de dos bordes
     -que al repetir da la retiacula de losas sin lineas dobles-,
     su filo claro al lado, los doscientos puntos de arido y el
     grano fino por encima. Eso es lo que hace que parezca
     hormigon y no un color plano.

     Se probaron en medio otras tres cosas que NO funcionan, y vale
     la pena dejarlo escrito para no volver a ellas: manchas
     difusas grandes copiadas del video de Project Nexus (salen
     como niebla, no como suciedad), vetas de fratas (se leen como
     grietas) y suelo liso sin nada (dos tercios de pantalla de
     gris muerto). */
  Art.texSuelo = function (seed) {
    if (Art._texSue) return Art._texSue;
    const N = 256, c = lienzo(N), ctx = c.getContext('2d');
    const rng = U.makeRNG(seed || 0x5355454c);
    ctx.fillStyle = '#404040';
    ctx.fillRect(0, 0, N, N);
    /* La junta, en dos bordes de los cuatro: asi la retiacula sale
       de la propia repeticion y no hay lineas dobles. */
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, N, 3);
    ctx.fillRect(0, 0, 3, N);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 3, N, 2);
    ctx.fillRect(3, 0, 2, N);
    /* El arido: doscientos puntos oscuros de uno a cuatro pixeles. */
    for (let i = 0; i < 200; i++) {
      const s = 1 + rng() * 3;
      ctx.fillStyle = 'rgba(0,0,0,' + (0.05 + rng() * 0.16).toFixed(3) + ')';
      ctx.fillRect(rng() * N, rng() * N, s, s);
    }
    /* AQUI IBAN LAS CUATRO SALPICADURAS. No vuelven. */
    const img = ctx.getImageData(0, 0, N, N), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() - 0.5) * 16;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
    Art._texSue = subir(c, { repeat: 1 });
    return Art._texSue;
  };

  /* Mancha suave: sombra de contacto */
  Art.texMancha = function () {
    if (Art._texMan) return Art._texMan;
    const N = 64, c = lienzo(N), ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, N, N);
    Art._texMan = subir(c);
    return Art._texMan;
  };

  /* --- Pared de fondo: hormigon sucio con tinta encima ---
     Es el fondo de toda arena de Madness: gris plano, manchas de
     tinta negra, arañazos y un grano fino. Una sola textura que se
     repite; no hay ni un archivo de imagen en el juego. */
  Art.texMuro = function (seed) {
    const N = 256, c = lienzo(N), ctx = c.getContext('2d');
    const rng = U.makeRNG(seed || 0x4d55524f);

    // base
    ctx.fillStyle = '#343434';
    ctx.fillRect(0, 0, N, N);

    // vetas anchas de humedad
    for (let i = 0; i < 26; i++) {
      const x = rng() * N, w = 6 + rng() * 34;
      ctx.fillStyle = 'rgba(0,0,0,' + (0.04 + rng() * 0.09).toFixed(3) + ')';
      ctx.fillRect(x, 0, w, N);
    }
    for (let i = 0; i < 16; i++) {
      const y = rng() * N, h = 4 + rng() * 22;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.015 + rng() * 0.03).toFixed(3) + ')';
      ctx.fillRect(0, y, N, h);
    }

    // salpicones de tinta: el sello visual de la serie
    ctx.fillStyle = 'rgba(8,8,8,0.82)';
    for (let i = 0; i < 9; i++) {
      pintarSalpicadura(ctx, rng() * N, rng() * N, 4 + rng() * 13, rng, 0.55 + rng() * 0.4);
    }

    // arañazos finos
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const x = rng() * N, y = rng() * N;
      const a = rng() * Math.PI * 2, l = 5 + rng() * 26;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }

    // grano: ruido fino, como el papel de un dibujo escaneado
    const img = ctx.getImageData(0, 0, N, N), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() - 0.5) * 22;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);

    return subir(c, { repeat: 1 });
  };

  /* La vieja Art.texSuelo estaba AQUI y se llamaba igual que la
     de arriba, asi que la pisaba: pintaba dos juntas en cruz,
     doscientos puntitos y cuatro salpicaduras de tinta. Esas
     salpicaduras eran las manchas en estrella que se veian
     repetidas por todo el suelo, y las juntas las lineas rectas.
     Nadie mas la usaba. */

  /* --- Fondo lejano: la nube de tinta que hay detras de todo ---
     Se dibuja en un plano gigante al fondo. No se mueve con el
     jugador mas que un poco: da profundidad sin cargar geometria. */
  Art.texFondo = function (seed) {
    const N = 512, c = lienzo(N), ctx = c.getContext('2d');
    const rng = U.makeRNG(seed || 0x464f4e44);
    const g = ctx.createLinearGradient(0, 0, 0, N);
    g.addColorStop(0, '#0d0d0d');
    g.addColorStop(0.55, '#242424');
    g.addColorStop(1, '#101010');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, N, N);
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    for (let i = 0; i < 26; i++) {
      pintarSalpicadura(ctx, rng() * N, rng() * N, 6 + rng() * 30, rng, 0.35 + rng() * 0.5);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let i = 0; i < 10; i++) {
      pintarSalpicadura(ctx, rng() * N, rng() * N, 10 + rng() * 40, rng, 0.5);
    }
    const img = ctx.getImageData(0, 0, N, N), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() - 0.5) * 18;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
    return subir(c);
  };

  global.Art = Art;
})(window);

