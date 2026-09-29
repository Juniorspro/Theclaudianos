/* =============================================================
   ciudad.js -> El fondo del menu: la ciudad del mapa de episodios.

   Es el mapa de episodios de Madness: Project Nexus -world_map, cuadro
   2, "Episode 1.5: Ground Zero"-, sacado del SWF y partido en sus
   capas (tools/swf_ciudad, datos en js/ciudad_swf.js):

     FONDO   el cielo rojo, el resplandor, las siluetas lejanas y el
             suelo, tal cual.
     MEDIO   los edificios marrones con sus rejillas de ventanas.
     CERCA   las piezas grises de delante: la torre de control, el
             bloque bajo y la torre Nexus con la antena y la parabolica.

   Cada capa es un plano a su distancia, del tamaño justo para que con
   la camara centrada se vea exactamente el mapa del SWF. La camara va y
   viene despacio de lado y el paralaje sale solo de la perspectiva: lo
   de delante se mueve mas que lo de detras.

   En pantallas mas anchas que el mapa (860 x 540, 1,59:1; un movil
   apaisado es 2,2:1) el fondo y los edificios marrones siguen por los
   lados en espejo -la textura se repite reflejada, sin costura-; las
   torres, que son unicas, no se repiten.

   Lo que hubo aqui y ya no: torres de cajas inventadas, dos siluetas
   desenfocadas en primer termino -las columnas negras de los lados, que
   ademas tapaban el cielo y dejaban una franja negra arriba- y unas
   bandas horizontales en el cielo. Nada de eso salia del juego.

   Coste: tres planos con textura, tres llamadas de dibujo.
   ============================================================= */
(function (global) {
  'use strict';

  const Ciudad = {};
  const S = global.CIUDAD_SWF;

  /* Distancia de cada capa a la camara. Con la camara centrada da igual
     -cada plano se escala a su distancia-; al moverla, estas
     proporciones son el paralaje. */
  const DIST = { fondo: 420, medio: 260, cerca: 170 };
  const PASEO = 9;              // lo que va y viene la camara, a lo ancho
  const FOV = 30;

  function textura(src, espejo) {
    const img = new Image();
    const t = new THREE.Texture(img);
    img.onload = () => { t.needsUpdate = true; };
    img.src = src;
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    if (espejo) t.wrapS = THREE.MirroredRepeatWrapping;
    return t;
  }

  /* EL MAPA VA EN ESPEJO Y CORRIDO. En el SWF la torre Nexus esta a la
     derecha, y ahi el menu pone sus botones y sus textos: la tapaban
     entera. Reflejado, la torre queda a la izquierda, que es el hueco
     que el menu del SWF deja para su personaje; y el centro de la
     pantalla cae en CENTRO -en px del mapa ya reflejado-, lo que deja
     la torre fuera del titulo tanto a 16:9 como a 20:9. */
  const CENTRO = 580;

  /* Un plano con la capa 'nombre', puesto a su distancia. La unidad es
     el px del mapa proyectado a esa distancia: k = alto visible a esa
     distancia / 540. 'lados' es cuanto se estira a cada lado en espejo,
     en fracciones del ancho de la capa. */
  function capa(nombre, lados) {
    const c = S.capas[nombre], d = DIST[nombre];
    const k = 2 * d * Math.tan(FOV * Math.PI / 360) / S.alto;
    const rep = 1 + 2 * lados;
    const t = textura(c.src, lados > 0);
    // reflejada: u' = 1 + lados - rep * u
    t.repeat.x = -rep; t.offset.x = 1 + lados;
    if (!(lados > 0)) t.wrapS = THREE.RepeatWrapping;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(c.w * k * rep, c.h * k),
      new THREE.MeshBasicMaterial({ map: t, transparent: nombre !== 'fondo', depthWrite: false })
    );
    // centro de la capa en el mapa reflejado, respecto de CENTRO
    const cx = S.ancho - (c.x + c.w / 2);
    m.position.set((cx - CENTRO) * k, -(c.y + c.h / 2 - S.alto / 2) * k, -d);
    m.frustumCulled = false;
    return m;
  }

  Ciudad.crear = function () {
    const esc = new THREE.Scene();
    esc.background = new THREE.Color(0x000000);
    const grupo = new THREE.Group();
    esc.add(grupo);
    const fondo = capa('fondo', 0.6), medio = capa('medio', 0.6), cerca = capa('cerca', 0);
    fondo.renderOrder = 0; medio.renderOrder = 1; cerca.renderOrder = 2;
    grupo.add(fondo, medio, cerca);
    const cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 1, 900);
    return { escena: esc, grupo: grupo, cam: cam, t: 0 };
  };

  /* =============================================================
     EL PASEO

     Solo de lado y sin girar: si la camara girase, los planos dejarian
     de estar de frente y se veria que son planos. La altura no cambia:
     el mapa llena la pantalla de arriba abajo, como en el SWF.
     ============================================================= */
  Ciudad.paso = function (C, dt, refe) {
    const cam = C.cam;
    if (cam.aspect !== refe.aspect) {
      cam.aspect = refe.aspect;
      cam.updateProjectionMatrix();
    }
    C.t += dt;
    cam.position.set(Math.sin(C.t * 0.05) * PASEO, 0, 0);
  };

  global.Ciudad = Ciudad;
})(window);

