/* =============================================================
   prendas.js -> LA ROPA DEL SWF COMO DATOS: el catalogo, la armadura
   que da cada prenda y con que ropa salen los enemigos. Los modelos 3D
   estan en accesorios.js (cabeza), ropa.js (torso) y prendas3d.js.

   EL CATALOGO: ItemGenerator.createArmor, tal cual. Cada prenda tiene
   myName, myCat (hat / mask / mouth / shirt), myArmor, myWeight (none /
   light / med / heavy) y myPrice, y al final de la funcion:

     myPrice = myPrice + myArmor * 100        (lo que cobra la tienda)
     myNameFull = myName

   Los trajes de agente no estan en createArmor: son el CUERPO del agente
   ('Parts - Body', 7289), la ropa va encima (myShirt). Aca son la ranura
   'traje', sin armadura, con precio nuestro.

   LA ARMADURA (MadnessCharacter.refreshArmor y checkDamage):
     myHeadArmor = armor del sombrero + la mascara + la boca
     myBodyArmor = armor de la camisa (shirt)
   y en cada impacto, ANTES que ningun multiplicador:
     cabeza:  si (!atacante.perkArmorPierce || sombrero heavy) d -= myHeadArmor
     cuerpo:  si (!atacante.perkArmorPierce || camisa heavy)   d -= myBodyArmor
   (ver Actor.danoSWF). El peso solo pide su ventaja para ponerse la
   prenda (light -> perkArmor1, med -> perkArmor2, heavy -> perkArmor3,
   MadnessStoreItems) y hace que la perforacion no la atraviese si es
   heavy.
   ============================================================= */
(function (global) {
  'use strict';

  const P = {};

  /* id -> [myName, myCat, myArmor, myWeight, myPrice (el de createArmor), bajada]
     La bajada es nuestra: el SWF repite el nombre (myNameFull = myName), y
     con cuatro 'Armored Vest' o dos 'Agent Shades' hace falta decir cual. */
  const C = {
    // ---- CASCOS (hat): HatsAll, 7363
    hat1:       ['SWAT Cap',       'hat', 0.5, 'light', 200, 'GORRA TACTICA DE VISERA'],
    hat2:       ['Leon Cap',       'hat', 0.5, 'light', 200, 'GORRO DE LANA CAIDO'],
    hat3:       ['Sweatband',      'hat', 0.5, 'light', 200, 'VINCHA DE TELA'],
    hat4:       ['Ballcap',        'hat', 0.5, 'light', 200, 'GORRA DE BEISBOL'],
    hat5:       ['Desperado',      'hat', 0, 'none', 100, 'SOMBRERO DE ALA PLANA'],
    hat6:       ['Bowler',         'hat', 0, 'none', 100, 'BOMBIN'],
    headphones: ['Headphones',     'hat', 0, 'none', 100, 'AURICULARES'],
    top:        ['Tophat',         'hat', 0, 'none', 100, 'GALERA'],
    fedora:     ['Fedora',         'hat', 0, 'none', 100, 'SOMBRERO DE FIELTRO'],
    hat9:       ['Sombrero',       'hat', 0, 'none', 100, 'SOMBRERO MEXICANO'],
    helmet1:    ['Soldier Helm',   'hat', 2, 'med', 500, 'CASCO DE SOLDADO'],
    helmet3:    ['Blast Helm',     'hat', 3, 'heavy', 1200, 'CASCO CON PANTALLA DE SOLDAR'],
    // ---- MASCARAS (mask): MasksAll, 7358
    agent1_mask:   ['Agent Shades',   'mask', 0, 'none', 900, 'LAS ROJAS DEL AGENTE'],
    agent1_mask_b: ['Agent Shades',   'mask', 0, 'none', 900, 'LAS NEGRAS DEL AGENTE CLASICO'],
    agent2_mask:   ['ATP Mask',       'mask', 0.5, 'light', 1200, 'LA DEL AGENTE MK1'],
    agent3_mask:   ['OBSV Goggles',   'mask', 0, 'none', 900, 'LAS DEL AGENTE MK0'],
    shades1:       ['Radio-Shades',   'mask', 0, 'none', 100, 'LENTES NEGROS DE PASTA'],
    shades3:       ['State Troopers', 'mask', 0, 'none', 100, 'LENTES DE AVIADOR'],
    shades5:       ['Professionals',  'mask', 0, 'none', 100, 'LENTES REDONDOS OSCUROS'],
    shades8:       ['3-D',            'mask', 0, 'none', 100, 'LENTES DE CINE 3-D'],
    shades12:      ['Coolguys',       'mask', 0, 'none', 100, 'LENTES CUADRADOS NEGROS'],
    goggles1:      ['Dr. Horrible',   'mask', 0, 'none', 100, 'ANTIPARRAS DE SOLDADOR'],
    paintball1:    ['Paintball Mask', 'mask', 0.8, 'light', 400, 'VISOR DE PAINTBALL'],
    tricky:        ['Iron Slab',      'mask', 1.2, 'med', 9000, 'LA PLANCHA DE HIERRO'],
    // ---- BOCA (mouth): MouthsAll, 7318
    mouth3:  ['Bandana 1',  'mouth', 0.5, 'light', 200, 'PAÑUELO NEGRO'],
    mouth6:  ['Bandana 2',  'mouth', 0.5, 'light', 200, 'PAÑUELO GRIS'],
    mask1:   ['Skimask',    'mouth', 0, 'none', 100, 'PASAMONTAÑAS'],
    mouth10: ['SARS Guard', 'mouth', 0, 'none', 100, 'BARBIJO'],
    mouth1:  ['Breather',   'mouth', 0.5, 'light', 200, 'RESPIRADOR'],
    // ---- ROPA (shirt): Outfit - Body - Core, 7295
    armor1: ['Padded Vest',  'shirt', 3, 'light', 200, 'CHALECO ACOLCHADO'],
    armor2: ['Utility Vest', 'shirt', 2, 'light', 200, 'CHALECO CON CARGADORES'],
    armor3: ['Armored Vest', 'shirt', 3, 'light', 200, 'CHALECO DE PLACA'],
    armor4: ['Armored Vest', 'shirt', 3, 'light', 200, 'CHALECO DE PLACA, DOS CORREAS'],
    armor5: ['Armored Vest', 'shirt', 5, 'med', 500, 'CHALECO DE PLACA ACHAFLANADA'],
    armor6: ['Metal Vest',   'shirt', 10, 'heavy', 1200, 'CHALECO DE CHAPA REMACHADA'],
    // ---- los trajes de agente: 'Parts - Body', no createArmor (precio nuestro)
    agent:  ['Agent Suit',     'traje', 0, 'none', 900, 'EL DEL AGENTE'],
    agent2: ['Agent Suit Mk1', 'traje', 0, 'none', 1200, 'EL DEL AGENTE MK1, CON ARNES'],
    agent3: ['Agent Suit Mk0', 'traje', 0, 'none', 1200, 'EL DEL AGENTE MK0, CON BANDOLERA']
  };
  /* El precio de la tienda: el de createArmor mas la armadura (x 100). Los
     trajes, tal cual. */
  P.CAT = {};
  for (const id in C) {
    const c = C[id];
    P.CAT[id] = { id, nombre: c[0], cat: c[1], armor: c[2], peso: c[3],
                  precio: c[1] === 'traje' ? c[4] : c[4] + c[2] * 100, bajada: c[5] };
  }
  P.de = (id) => (id && P.CAT[id]) || null;

  /* La descripcion de cada categoria (el final de createArmor). */
  P.DESC = {
    hat: 'Cover up that pretty skull with something your enemies can take aim at.',
    mask: "They couldn't see your eyes before, but now you can be extra certain of it.",
    mouth: 'Take your inner badass to the next level with some sweet gob gear.',
    shirt: "Your head isn't the only vital point on your body that needs covering.",
    traje: "Your head isn't the only vital point on your body that needs covering."
  };

  /* LAS RANURAS del muñeco: traje (el cuerpo), camisa (shirt, encima),
     mascara, sombrero y boca. En la ficha (progreso.js) van con el nombre
     de la categoria del SWF; en el tipo de personaje (chars.js), con el
     suyo. */
  P.RANURAS = ['traje', 'shirt', 'mask', 'hat', 'mouth'];
  P.CAMPO = { traje: 'ropa', shirt: 'camisa', mask: 'mascara', hat: 'sombrero', mouth: 'boca' };

  /* El atuendo de un tipo de personaje: las cinco ranuras. */
  P.atuendoDe = function (F) {
    F = F || {};
    return { traje: F.ropa || null, shirt: F.camisa || null, mask: F.mascara || null,
             hat: F.sombrero || null, mouth: F.boca || null };
  };

  /* refreshArmor: lo que suma cada ranura. */
  P.armadura = function (at) {
    const a = (id) => { const c = P.de(id); return c ? c.armor : 0; };
    const hat = P.de(at && at.hat), shirt = P.de(at && at.shirt);
    return {
      cabeza: a(at && at.hat) + a(at && at.mask) + a(at && at.mouth),
      cuerpo: a(at && at.shirt),
      pesoCasco: hat ? hat.peso : 'none',
      pesoCamisa: shirt ? shirt.peso : 'none'
    };
  };

  /* La ventaja que pide cada peso para ponerse (MadnessStoreItems). */
  P.PERK_PESO = { light: ['perkArmor1', 'ARMOR 1'], med: ['perkArmor2', 'ARMOR 2'], heavy: ['perkArmor3', 'ARMOR 3'] };

  /* LO QUE ESTA MODELADO EN 3D. Lo que el SWF le da a un enemigo y aca no
     tiene modelo sale como si no le tocara nada (el hueco 'undefined' de
     sus listas): la probabilidad de lo que si esta no cambia. */
  P.modelada = function (id) {
    if (!id || !P.CAT[id]) return false;
    const c = P.CAT[id].cat;
    if (c === 'traje') return !!(global.Ropa && Ropa.MODELOS[id]);
    if (c === 'shirt') return !!(global.Ropa && Ropa.CHALECOS && Ropa.CHALECOS[id]);
    return !!(global.Accesorios && Accesorios.MODELOS[id]);
  };

  /* =============================================================
     CON QUE ROPA SALE CADA ENEMIGO: ItemGenerator.equipLoadout

       civ (el grunt), del bando enemigo:
         hat    [-, -, hat1, hat2, hat3, hat4, hat5, headphones, hat6,
                 helmet1, helmet2, helmet3]
                 i = randomNumber(min(-3, L - 15), min(n, max(4, L * 1,5)))
         shirt  [-, -, armor1, armor2, armor3, armor4, armor5, armor8,
                 armor9, armor10, armor11, armor6, armor7, armor12]
                 i = randomNumber(min(-3, L - 20), min(n, L * 1,5))
         mouth  [-, -, mask1, mouth6, mouth3]
                 i = randomNumber(min(-3, L - 15), min(n, L))
         mask   [-, -, shades1, shades3, shades5, paintball1, paintball2,
                 goggles1, hi1 ... hi8]
                 i = randomNumber(min(-3, L - 15), min(n, max(3, L * 1,5)))
       agent, agent2, agent3 (y sus zombis):
         shirt  la misma lista, i = randomNumber(min(-3, L - 25), min(n, L * 1,5))
         mouth  [-, -, mouth1, mouth2, mouth4, mouth5, mouth8]
                 i = randomNumber(min(-3, L - 25), min(n, L))

     randomNumber(a, b) = floor(random * (b - a + 1)) + a, con a y b sin
     redondear (L * 1,5). Un indice negativo o fuera de la lista es 'nada':
     por eso a nivel bajo casi nadie lleva nada y al subir la ventana se
     corre hacia las prendas duras. L es el nivel de la escuadra, el mismo
     que elige su lista (Waves.listaEscuadra). El agent2 no lleva nada en la
     boca aca: su ATP Mask ya trae la barbillera.
     ============================================================= */
  const L_HAT = [null, null, 'hat1', 'hat2', 'hat3', 'hat4', 'hat5', 'headphones', 'hat6', 'helmet1', 'helmet2', 'helmet3'];
  const L_SHIRT = [null, null, 'armor1', 'armor2', 'armor3', 'armor4', 'armor5', 'armor8', 'armor9', 'armor10', 'armor11', 'armor6', 'armor7', 'armor12'];
  const L_MOUTH = [null, null, 'mask1', 'mouth6', 'mouth3'];
  const L_MASK = [null, null, 'shades1', 'shades3', 'shades5', 'paintball1', 'paintball2', 'goggles1', 'hi1', 'hi2', 'hi3', 'hi4', 'hi5', 'hi6', 'hi7', 'hi8'];
  const L_MOUTH_AG = [null, null, 'mouth1', 'mouth2', 'mouth4', 'mouth5', 'mouth8'];
  const randomNumber = (rng, a, b) => Math.floor(rng() * (b - a + 1)) + a;
  function tirada(rng, lista, bajo, alto) {
    const id = lista[randomNumber(rng, Math.min(-3, bajo), alto)];
    return id && P.modelada(id) ? id : null;
  }
  /* 'swf' es el personaje del SWF que hace el tipo (civ, agent, agent2,
     agent3). Devuelve solo las ranuras que le toca cambiar. */
  P.cargaEnemigo = function (swf, L, rng) {
    const n = (a) => a.length;
    if (swf === 'civ') {
      return {
        hat: tirada(rng, L_HAT, L - 15, Math.min(n(L_HAT), Math.max(4, L * 1.5))),
        shirt: tirada(rng, L_SHIRT, L - 20, Math.min(n(L_SHIRT), L * 1.5)),
        mouth: tirada(rng, L_MOUTH, L - 15, Math.min(n(L_MOUTH), L)),
        mask: tirada(rng, L_MASK, L - 15, Math.min(n(L_MASK), Math.max(3, L * 1.5)))
      };
    }
    if (swf && swf.slice(0, 5) === 'agent') {
      const shirt = tirada(rng, L_SHIRT, L - 25, Math.min(n(L_SHIRT), L * 1.5));
      const mouth = tirada(rng, L_MOUTH_AG, L - 25, Math.min(n(L_MOUTH_AG), L));
      return swf === 'agent2' ? { shirt } : { shirt, mouth };
    }
    return {};
  };

  global.Prendas = P;
})(window);
