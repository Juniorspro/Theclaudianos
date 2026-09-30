/* =============================================================
   tienda.js -> La TIENDA de la armeria: la pantalla que se abre al
   acercarse al mostrador (armeria.js).

   Hecha sobre la tienda del SWF (madness_store_items, 8023, y su
   clase MadnessStoreItems):
   - a la izquierda la ficha (selectDisplay, 952): el muñeco sobre el
     pedestal de dos tambores bajo el foco, el nombre y el nivel, y
     debajo un recuadro que cambia con las tres pestañas rojas del SWF:
     el arma que lleva, las ESTADISTICAS (vida y TAC en rojo y las dos
     columnas de 10 pastillas, updateIndividualBar) y las HABILIDADES;
   - en medio el arma elegida con lo que ensena el SWF al elegirla
     (fotograma 2 de 952): myName, myNameFull, myDescription y Damage,
     Range, Accuracy y Ammo -de las cuerpo a cuerpo, Accuracy y Ammo
     ' - '-, y el boton de comprar;
   - a la derecha las armas por categoria en una tira de pestañas, de a
     tres por fila, cada una con la baldosa del SWF (madness_item_portrait,
     8254: fondo con su luz y el arma en diagonal), su nombre en la franja
     negra (gunNameTEXT), el marco de elegida (selectMe) y la estrella de
     equipada (amEquipped). Imagenes en tienda_swf.js (tools/swf_tienda).
   ============================================================= */
(function (global) {
  'use strict';

  /* recien: purchasedStat del SWF (categoria + estadistica + nivel del
     punto recien comprado), el que lleva el destello justBought.
     pulso: el peg que se acaba de tocar, que da el pulso amSelected UNA vez. */
  const Tienda = { abierta: false, sel: null, bloqueo: false, cat: 0, pest: 0, sub: 'stat', pag: 0, perk: null,
                   recien: '', pulso: '' };
  const $ = (id) => document.getElementById(id);

  /* Las categorias son los botones de mySubMenu del SWF, en su orden:
     buttonMain (armas largas), buttonSide (la pistola), el mismo
     buttonSide en su fotograma 'melee' (el cuchillo) y buttonHat,
     buttonMask, buttonMouth y buttonShirt. La ropa sale del catalogo del
     SWF (prendas.js): lo que ya esta modelado en 3D, en el orden de
     createArmor; en ROPA, primero los trajes de agente y despues los
     chalecos. */
  const SECCIONES = [
    ['ARMAS LARGAS', ['fusil', 'subfusil', 'escopeta', 'escopeta97']],
    ['PISTOLAS', ['pistola', 'revolver', 'magnum']],
    ['CUERPO A CUERPO', ['cuchillo', 'tubo', 'bate', 'megachette']],
    ['CASCOS', ['hat']], ['MASCARAS', ['mask']], ['BOCA', ['mouth']], ['ROPA', ['traje', 'shirt']]
  ];
  const ROPA_DESDE = 3;
  /* MadnessStoreItems pinta la grilla con casilleros fijos (6 x 3 de
     80 x 105 px en la pantalla de 800 x 600: cada casilla es el 10 % del
     ancho). Aca van dos filas de tres, y asi la casilla queda del mismo
     tamaño que en el SWF; lo que no entra va en paginas (pagePrev /
     pageNext del SWF). */
  const CASILLAS = 6;
  let _ids = null;
  function idsDe(i) {
    if (!_ids) {
      _ids = SECCIONES.map(([, L], k) => (k < ROPA_DESDE ? L
        : [].concat(...L.map((cat) => Object.keys(Prendas.CAT).filter((id) => Prendas.CAT[id].cat === cat && Prendas.modelada(id))))));
    }
    return _ids[i];
  }
  const SECCION = new Proxy({}, { get: (o, id) => {
    for (let i = 0; i < SECCIONES.length; i++) if (idsDe(i).indexOf(id) >= 0) return i;
    return undefined;
  } });
  const paginas = (i) => Math.max(1, Math.ceil(idsDe(i).length / CASILLAS));
  // la pagina de cada categoria; al elegir algo, la suya
  const paginaDe = (id) => Math.floor(Math.max(0, idsDe(SECCION[id]).indexOf(id)) / CASILLAS);

  /* LOS DATOS DEL SWF: ItemGenerator.createWeapon, tal cual (el daño es
     el mismo que usa el juego: Weapons.CAT.dano). mySpread es lo que el
     SWF rotula 'Accuracy' -cuanto MENOS, mas preciso-; myAmmo es el
     cargador (myAmmoMax = myAmmo). */
  const SWF = {
    pistola:    ['Beretta 92', 'Beretta 92 9x19mm', 7, 110, 6, 18,
      'A popular firearm due to an impressive magazine capacity and decent damage.  Especially handy for confrontations with numerous antagonists.'],
    magnum:     ['Colt Revolver', 'Colt Revolver .357 Magnum', 12, 195, 2, 6,
      'Powerful, accurate, and stylish. Handy for breaking through the more durable foes in Nevada.'],
    revolver:   ['Snub Colt', 'Snub Colt Revolver .357 Magnum', 10, 85, 10, 6,
      "Very powerful short range cannon.  It puts down mooks fast so long as you're right up against them."],
    subfusil:   ['H&K MP5', 'H&K MP5 9x19mm', 8, 140, 6, 30,
      'Made popular in Nevada for one reason: It is very good at what it does.'],
    escopeta:   ['SPAS-12', 'SPAS-12 12-Gauge', 7, 160, 9, 8,
      'Top of the line tactical shotgun.  Perfect for clearing particularly busy rooms.'],
    escopeta97: ['Norinco 97k', 'Norinco 97k 12-Gauge', 7, 160, 9, 5,
      'Box magazine fed pump action shotgun.  Great for making lasting impressions.'],
    fusil:      ['AR-15', 'AR-15 5.56x45mm', 11, 200, 4, 30,
      "The most mass produced .223 rifle the world has ever seen.  A great all-purpose rifle, just don't forget your cleaning kit."],
    cuchillo:   ['Bowie Knife', 'Bowie Knife', 5, 105, 0, 0,
      'Named for the famous knife fighter who died defending the Alamo. Now you can be just like him, except for the dead part.'],
    tubo:       ['Iron Pipe', 'Iron Pipe', 6, 125, 0, 0,
      "The damage isn't anything to brag about, but the range of a stainless steel pipe is a definite perk."],
    bate:       ['Baseball Bat', 'Baseball Bat', 9, 115, 0, 0,
      "Aim for an opponent's skull and be thankful for all those times you skipped Soldier Training to go play a round of tee-ball."],
    // sin arma: no se vende, pero la ficha ensena sus numeros (Weapons.CAT: dano 2, rango 95 del SWF)
    'puños':    ['Unarmed', 'Unarmed', 2, 95, 0, 0, ''],
    megachette: ['Megachette', 'Megachette', 9, 130, 0, 0,
      'This mighty hack-n-slasher resembles the Full Tang of a bladed weapon, but with a tremendous amount of heft for that extra cleaving power.']
  };
  /* LA ROPA DEL SWF: el catalogo de createArmor (prendas.js) -myName,
     myCat, myArmor, myWeight y el precio de la tienda, que es myPrice +
     myArmor x 100-, y la descripcion de su categoria. Sus baldosas salen
     de madness_item_portrait con la prenda dentro (ropa_swf.js,
     herramientas/swf/iconos_ropa.py).
     Para PONERSE algo con peso hace falta su ventaja (MadnessStoreItems:
     light -> perkArmor1, med -> perkArmor2, heavy -> perkArmor3); sin ella
     el boton dice por que no. Comprar se puede igual. */
  const esRopa = (id) => !!Prendas.de(id);
  const fichaRopa = () => (global.Progreso && Progreso.ficha && Progreso.ficha.ropa) || Progreso.ropaVacia();
  const tieneRopa = (id) => fichaRopa().tiene.indexOf(id) >= 0;
  const puesta = (id) => esRopa(id) && fichaRopa()[Prendas.de(id).cat] === id;
  const faltaPerk = (id) => { const k = Prendas.PERK_PESO[Prendas.de(id).peso]; return k && !Progreso.perk(Game.jugador, k[0]) ? k[1] : null; };

  /* Las barras, contra el extremo del catalogo del SWF: daño 12 (Colt),
     alcance 200 (AR-15), dispersion 2..10 (Colt..Snub, se invierte) y
     cargador 30. */
  const BARRAS = [
    ['Damage', (s) => s[2], (v) => v / 12],
    ['Range', (s) => s[3], (v) => v / 200],
    ['Accuracy', (s) => s[4], (v) => (12 - v) / 10],
    ['Ammo', (s) => s[5], (v) => v / 30]
  ];

  /* LAS VENTAJAS DEL SWF: MadnessDataFile.applyPerkDescription, tal cual.
     Para cada estadistica y destreza, v[0] es la ficha (nivel 0) y v[1..6]
     las ventajas de los niveles 5, 10, 15, 20, 25 y 30. Los demas niveles
     se escriben con 'nivel': en las estadisticas 'Strength 7' y 'Melee/
     Unarmed damage + 4.66%' (floor(n * 100 / div) / 100); en las
     destrezas ' Pistols 7' e 'Increase 7'. */
  const PERKS = {
    STR: { nivel: ["Strength", "Melee/Unarmed damage + ", 1.5], v: [
      ["Stat: Strength", "A measure of your raw strength."],
      ["Perk: Sidearm", "Carry a second weapon."],
      ["Perk: Knockdown 1", "Your blunt melee and unarmed attacks have a greater chance of knocking down enemies."],
      ["Perk: Block Breaker", "Your Melee and Unarmed attacks are unblockable (but may still be parried)."],
      ["Perk: Stun-Dash 1", "Your dash attacks stun opponents."],
      ["Perk: Knockdown 2", "Your blunt melee and unarmed attacks have a greater chance of knocking down enemies."],
      ["Perk: Stun-Dash 2", "Your dash attacks knock over opponents."]] },
    DEX: { nivel: ["Dexterity", "Move speed + ", 2.0], v: [
      ["Stat: Dexterity", "Your speed and agility."],
      ["Perk: Dodge 1", "When taking a Tac-Bar hit, you will automatically evade the shot, decreasing further damage (Enabled at Level 5)."],
      ["Perk: Fast-Load", "Swap weapons more quickly."],
      ["Perk: Dodge 2", "Perform an active sliding dodge with increased skill."],
      ["Perk: Bullet Block", "Your Melee block will stop bullets at minor Tactics loss."],
      ["Perk: Dodge 3", "Perform  an active flipping dodge with ninja-like skill."],
      ["Perk: Bullet Deflect", "Your Melee weapon will deflect bullets back at opponents."]] },
    TAC: { nivel: ["Tactics", "Tac-Bar Recharge + ", 1.0], v: [
      ["Stat: Tactics", "Battle savy and your tactical integrity while under fire."],
      ["Perk: Evade 1", "Take half Tac-Bar damage from low-accuracy shots."],
      ["Perk: Cover Fire", "Take half Tac-Bar damage when hit while firing from cover."],
      ["Perk: Tac-Bar 1", "Boost to your Tac-Bar."],
      ["Perk: Evade 2", "Take half Tac-Bar damage from Melee and Unarmed attacks."],
      ["Perk: Tac-Bar 2", "Bigger boost to your Tac-Bar."],
      ["Perk: Evade 3", "Take no Tac-Bar damage from low-accuracy shots."]] },
    END: { nivel: ["Endurance", "Damage Reduction + ", 1.5], v: [
      ["Stat: Endurance", "The ability to withstand damage of all kinds and to lift heavy armor."],
      ["Perk: Armor 1", "You may wear light-class armor."],
      ["Perk: Armor 2", "You may wear medium-class armor."],
      ["Perk: Stun-Proof 1", "Low- to Mid-damage attacks no longer cause you to be stunned."],
      ["Perk: Armor 3", "You may wear heavy-class armor."],
      ["Perk: Stun-Proof 2", "You are not stunned by any form of damage."],
      ["Perk: Immunity", "Low-damage shots inflict next to no damage to you."]] },
    LEAD: { nivel: ["Leadership", "Ally reaction-time - ", 1.5], v: [
      ["Stat: Leadership", "The level of skill and morale your teammates will exhibit in combat, and the fear you inspire in enemies."],
      ["Perk: Team Bonus 1", "Small increase to morale and decision-making skill of allies. Plus one squadmate."],
      ["Perk: Fearmonger 1", "Small decrease to the morale and reaction-time of opponents. Plus one squadmate."],
      ["Perk: Team Bonus 2", "Medium increase to morale and decision-making skill of allies. Plus one squadmate."],
      ["Perk: Fearmonger 2", "Medium decrease to the morale and reaction-time of opponents. Plus one squadmate."],
      ["Perk: Team Bonus 3", "Large increase to morale and decision-making skill of allies. Plus one squadmate."],
      ["Perk: Fearmonger 3", "Large decrease to the morale and reaction-time of opponents. Plus one squadmate."]] },
    AWR: { nivel: ["Awareness", "Tac-Bar damage + ", 5.0], v: [
      ["Stat: Awareness", "Your time-sense and ability to perceive the weaknesses of opponents."],
      ["Perk: Headshots", "Headshots deal increased damage."],
      ["Perk: Bullet-Time 1", "Retain full movement speed during Bullet-Time."],
      ["Perk: Bullet-Time 2", "Retain full Melee and Unarmed attack speed during Bullet-Time."],
      ["Perk: Armor-Piercing", "Close-range attacks ignore the enemy's medium or light armor."],
      ["Perk: Bullet-Time 3", "Retain full ranged attack speed during Bullet-Time."],
      ["Perk: Bullet-Time 4", "Increased movement speed during Bullet-Time."]] },
    Pistol: { nivel: ["Pistols", "Increase ", 0], v: [
      ["Skill: Pistols", "Ability to wield small, single-handed ranged weapons."],
      ["Perk: Pistol Accuracy 1", "Tighten up the accuracy of pistol shots when standing still."],
      ["Perk: Pistol Reload", "Doubletime your pistol reload."],
      ["Perk: Pistol ROF 1", "Increased rate of fire with pistols."],
      ["Perk: Pistol Effectiveness", "Pistols hit more often outside their effective range."],
      ["Perk: Pistol Accuracy 2", "Further increase the accuracy of pistol shots when standing still."],
      ["Perk: Pistol ROF 2", "Even better rate of fire with pistols."]] },
    SMG: { nivel: ["SMGs", "Increase ", 0], v: [
      ["Skill: SMGs", "Ability to wield small, two-handed ranged weapons."],
      ["Perk: SMG Aim 1", "Increased accuracy the longer you hold down the trigger of your SMG."],
      ["Perk: SMG Reload", "Doubletime your SMG reload."],
      ["Perk: SMG Tac Damage", "Increased SMG damage on Tac-Bar hits versus stationary targets."],
      ["Perk: SMG Range", "Increase the effective range of SMGs."],
      ["Perk: SMG Aim 2", "Even greater accuracy the longer you hold down the trigger of your SMG."],
      ["Perk: SMG ROF", "Increased rate of fire with SMGs."]] },
    Rifle: { nivel: ["Rifles", "Increase ", 0], v: [
      ["Skill: Rifles", "Ability to wield large, two-handed ranged weapons."],
      ["Perk: Rifle Tac Damage", "Increased rifle damage on Tac-Bar hits versus stationary targets."],
      ["Perk: Rifle Range 1", "Increase the effective range of rifles."],
      ["Perk: Rifle Accuracy", "Tighten up the accuracy of rifle shots when standing still."],
      ["Perk: Rifle Effectiveness", "Rifles hit more often outside their effective range."],
      ["Perk: Rifle Range 2", "Increase the effective range of rifles."],
      ["Perk: Rifle Reload", "Doubletime your rifle reload."]] },
    Shotgun: { nivel: ["Shotguns", "Increase ", 0], v: [
      ["Skill: Shotguns", "Ability to wield large, two-handed scatter weapons."],
      ["Perk: Shotgun Damage", "Increase damage of point-blank shotgun blasts."],
      ["Perk: Shotgun ROF 1", "Increased rate of fire with pump shotguns."],
      ["Perk: Shot Increase 1", "Each blast of your shotgun fires an additional pellet."],
      ["Perk: Shotgun ROF 2", "Even better rate of fire with pump shotguns."],
      ["Perk: Shotgun Reload", "Doubletime your shotgun reload."],
      ["Perk: Shot Increase 2", "Each blast of your shotgun fires two additional pellets."]] },
    Melee: { nivel: ["Melee", "Increase ", 0], v: [
      ["Skill: Melee", "Ability to wield melee weapons at close range, or thrown."],
      ["Perk: Beginner Combos", "Launch three basic melee attacks in quick succession."],
      ["Perk: Pistol Whip", "Use your ranged weapon as a slugging instrument at close range."],
      ["Perk: Advanced Combos", "Your three-hit combos feature more advanced moves."],
      ["Perk: Disarm", "Timed blocking of an opponent's melee attack will disarm their weapon."],
      ["Perk: Expert Combos", "Combos no longer include low-level attacks, and have a vastly improved cooldown time."],
      ["Perk: Master Combos", "Your three-hit combos end with a devastating finisher attack."]] },
    Unarmed: { nivel: ["Unarmed", "Increase ", 0], v: [
      ["Skill: Unarmed", "Ability to wield one's fists as weapons."],
      ["Perk: Basic Pugilist", "Throw quality punches."],
      ["Perk: Pummel 1", "Decrease the cooldown of your punches slightly."],
      ["Perk: Advanced Pugilist", "Turn your fists into lethal weapons with some new moves."],
      ["Perk: Pummel 2", "Decrease the cooldown of your punches moderately."],
      ["Perk: Expert Pugilist", "Unleash devastating martial arts moves."],
      ["Perk: Pummel 3", "Increase the actual speed of all unarmed attacks."]] }
  };
  /* El myText de cada fotograma de perk_icon (7939): su texto y la escala
     horizontal con la que el SWF lo comprime para que entre en el campo de
     102 x 53 px (Impact 42). Todas quedan centradas en x = 36 del recuadro. */
  const CABECERA = {
    STR: ['STR', 1], DEX: ['DEX', 1], TAC: ['TAC', 1], END: ['END', 1], LEAD: ['LEAD', 0.8654], AWR: ['AWR', 0.8853],
    Pistol: ['Pistol', 0.6821], SMG: ['SMG', 0.8749], Rifle: ['Rifle', 0.848], Shotgun: ['Shotgun', 0.4688],
    Melee: ['Melee', 0.6392], Unarmed: ['Unarmed', 0.4282]
  };
  const COLS = {
    stat: ['STR', 'DEX', 'TAC', 'END', 'LEAD', 'AWR'],
    skill: ['Pistol', 'SMG', 'Rifle', 'Shotgun', 'Melee', 'Unarmed']
  };

  const item = (id) => (esRopa(id) ? { id: id, precio: Prendas.de(id).precio } : Waves.TIENDA.find((t) => t.id === id));
  const T = () => global.TIENDA_SWF || { baldosa: {}, pestana: [] };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /* updateIndividualBar del SWF: 10 pastillas y el valor las va pasando
     de gris a rojo, naranja y amarillo (fotogramas 1-4 de la 918): la
     pastilla k (1..10) avanza una vez por cada i <= valor con
     ((i - 1) % 10) + 1 == k. */
  function pastillas(v) {
    const P = (T().est || {}).pastilla || [];
    v = Math.max(0, Math.round(v));
    let h = '';
    for (let k = 1; k <= 10; k++) {
      const f = v >= k ? Math.min(3, Math.floor((v - k) / 10) + 1) : 0;
      h += '<img src="' + (P[f] || '') + '" alt="">';
    }
    return '<span class="pegs">' + h + '</span>';
  }

  /* Los valores del jugador en la escala del SWF (0 a 30): los de su
     ficha (progreso.js), que Progreso.aplicar copia al actor. */
  function valores(a) {
    const F = global.Progreso && Progreso.ficha, o = {};
    for (const k of COLS.stat) o[k] = F ? F['stat' + k] || 0 : 0;
    for (const k of COLS.skill) o[k] = F ? F['skill' + k] || 0 : 0;
    return o;
  }

  /* ---------------- la derecha: pestañas y baldosas ---------------- */
  function pintarLista() {
    const W = Game.olas, jug = Game.jugador, TS = T(), B = TS.baldosa, an = TS.anchos || [];
    let h = '<div class="tdCats">';
    (TS.categoria || []).forEach((src, i) => {
      h += '<button class="tdCat' + (i === Tienda.cat ? ' on' : '') + '" data-cat="' + i + '" style="flex:' + (an[i] || 1) +
           '"><img src="' + src + '" alt="' + SECCIONES[i][0] + '"></button>';
    });
    h += '</div><div class="baldosas">';
    const ids = idsDe(Tienda.cat), np = paginas(Tienda.cat);
    const pg = Math.min(np - 1, Tienda.lpag[Tienda.cat] || 0);
    for (let n = 0; n < CASILLAS; n++) {
      const id = ids[pg * CASILLAS + n], it = id && item(id);
      if (!it) { h += '<div class="bald vacia"><img src="' + (TS.vacia || '') + '" alt=""></div>'; continue; }
      const cl = ['bald'], ropa = esRopa(id), suya = ropa ? tieneRopa(id) : jug && jug.arma.id === id;
      if (W && W.dinero < it.precio && !suya) cl.push('cara');
      const img = ropa ? ((global.ROPA_SWF && ROPA_SWF.baldosa[id]) || '') : (B[id] || '');
      h += '<button class="' + cl.join(' ') + '" data-id="' + id + '"><img src="' + img + '" alt="">' +
           (id === Tienda.sel ? '<img class="marco" src="' + TS.sel + '" alt="">' : '') +
           ((ropa ? puesta(id) : suya) ? '<img class="marco" src="' + TS.estrella + '" alt="">' : '') +
           '<b>' + esc(ropa ? Prendas.de(id).nombre : SWF[id][0]) + '</b><em>' + (ropa && suya ? 'TUYA' : '$' + it.precio) + '</em></button>';
    }
    h += '</div>';
    // pagePrev / pageNext: solo si la categoria no entra en una pagina
    if (np > 1) {
      h += '<div class="tdPags"><button data-lpag="-1"' + (pg > 0 ? '' : ' disabled') + '>&#9664;</button><span>PAGE ' + (pg + 1) + ' / ' + np +
           '</span><button data-lpag="1"' + (pg < np - 1 ? '' : ' disabled') + '>&#9654;</button></div>';
    }
    $('tdLista').innerHTML = h;
  }

  /* Damage / Range / Accuracy / Ammo como las cuatro filas del SWF. */
  function filas(id) {
    const s = SWF[id], melee = !s[5];
    return BARRAS.map(([n, f, k], i) => {
      const v = f(s), nada = melee && i >= 2;
      return '<div class="fila"><span>' + n + '</span><div class="barra"><i style="width:' +
             (nada ? 0 : Math.round(Math.max(0.04, Math.min(1, k(v))) * 100)) + '%"></i></div><b>' +
             (nada ? ' - ' : v) + '</b></div>';
    }).join('');
  }

  /* ---------------- el centro: el arma elegida ---------------- */
  function pintarArma() {
    if (esRopa(Tienda.sel)) { pintarRopa(); return; }
    const id = Tienda.sel, s = SWF[id], it = item(id), W = Game.olas, jug = Game.jugador;
    const tuya = jug && jug.arma.id === id, puede = W && W.dinero >= it.precio;
    $('tdArma').innerHTML =
      '<small>' + SECCIONES[SECCION[id]][0] + '</small><h3>' + esc(s[0]) + '</h3><h6>' + esc(s[1]) + '</h6>' +
      '<div class="grande"><div class="bald"><img src="' + (T().baldosa[id] || '') + '" alt=""><b>' + esc(s[0]) + '</b></div></div>' +
      '<p>' + esc(s[6]) + '</p>' + filas(id) +
      '<button class="bt principal comprar" id="tdComprar"' + (tuya || !puede ? ' disabled' : '') + '><span>' +
      (tuya ? 'EQUIPADA' : (puede ? 'COMPRAR  ' : 'FALTA DINERO  ') + '$' + it.precio) + '</span></button>';
    $('tdDinero').textContent = '$' + (W ? W.dinero : 0);
  }

  /* La prenda elegida, como el SWF ensena una armadura: su nombre, la
     descripcion de la categoria, y en las filas Armor y Weight (myArmor y
     myWeight en mayusculas); Accuracy y Ammo, ' - '. El boton compra,
     pone o saca. */
  /* La barra de Armor, contra lo mas duro que se vende: el Metal Vest (10). */
  const ARMOR_TOPE = 10;
  function pintarRopa() {
    const id = Tienda.sel, r = Prendas.de(id), it = item(id), W = Game.olas;
    const tuya = tieneRopa(id), lleva = puesta(id), falta = faltaPerk(id), puede = W && W.dinero >= it.precio;
    const fila = (n, v, k) => '<div class="fila"><span>' + n + '</span><div class="barra"><i style="width:' +
      (k === null ? 0 : Math.round(Math.max(0.04, Math.min(1, k)) * 100)) + '%"></i></div><b>' + v + '</b></div>';
    const PESO = { none: 0, light: 0.34, med: 0.67, heavy: 1 };
    let txt, off = false;
    if (lleva) txt = 'SACAR';
    else if (tuya) { txt = falta ? 'REQUIERE ' + falta : 'PONER'; off = !!falta; }
    else { txt = (puede ? 'COMPRAR  ' : 'FALTA DINERO  ') + '$' + it.precio; off = !puede; }
    $('tdArma').innerHTML =
      '<small>' + SECCIONES[SECCION[id]][0] + '</small><h3>' + esc(r.nombre) + '</h3><h6>' + esc(r.bajada) + '</h6>' +
      '<div class="grande"><div class="bald"><img src="' + ((global.ROPA_SWF && ROPA_SWF.baldosa[id]) || '') + '" alt=""><b>' + esc(r.nombre) + '</b></div></div>' +
      '<p>' + esc(Prendas.DESC[r.cat] || '') + '</p>' +
      fila('Armor', r.armor, r.armor / ARMOR_TOPE) + fila('Weight', r.peso.toUpperCase(), PESO[r.peso]) + fila('Accuracy', ' - ', null) + fila('Ammo', ' - ', null) +
      '<button class="bt principal comprar" id="tdComprar"' + (off ? ' disabled' : '') + '><span>' + txt + '</span></button>';
    $('tdDinero').textContent = '$' + (W ? W.dinero : 0);
  }

  /* Comprar, poner o sacar la prenda elegida. Lo comprado es de la ficha
     (progreso.js): se guarda al momento y sigue despues de morir. Cada
     prenda va a la ranura de su categoria (traje, shirt, mask, hat,
     mouth) y la armadura del jugador se rehace (Actor.vestir). */
  function botonRopa(id) {
    const F = Progreso.ficha, R = F.ropa, r = Prendas.de(id), W = Game.olas, jug = Game.jugador;
    if (puesta(id)) R[r.cat] = null;
    else if (tieneRopa(id)) { if (faltaPerk(id)) return false; R[r.cat] = id; }
    else {
      if (!W || W.dinero < r.precio) return false;
      W.dinero -= r.precio;
      R.tiene.push(id);
      if (!faltaPerk(id)) R[r.cat] = id;
    }
    Actor.vestir(jug, Progreso.atuendo());
    HUD.retrato(Game.ren, jug.tipo);
    Progreso.guardar();
    return true;
  }

  /* ---------------- la izquierda: la ficha ---------------- */
  function pintarFicha() {
    const a = Game.jugador;
    $('tdNombre').textContent = (Chars.TIPOS[a.tipo] && Chars.TIPOS[a.tipo].nombre) || a.tipo;
    $('tdFondoNombre').textContent = ((Chars.TIPOS[a.tipo] && Chars.TIPOS[a.tipo].nombre) || a.tipo).toUpperCase();
    $('tdNivel').textContent = 'LEVEL ' + ((global.Progreso && Progreso.ficha.myLevel) || a.nivel || 1);
    pintarRecuadro();
  }

  /* El recuadro de debajo del pedestal: la ficha (fotograma 1 de
     selectDisplay: vida y TAC en rojo y las dos columnas de 10 pastillas)
     o, en la vista STATS, la ventaja elegida (fotograma 5: nombre y
     descripcion de applyPerkDescription). */
  function pintarRecuadro() {
    const a = Game.jugador, P = T().pestana, V = valores(a);
    let h;
    if (Tienda.pest === 2 && Tienda.perk) {
      const [st, n] = Tienda.perk, pk = PERKS[st], L = pk.nivel;
      let nom, des;
      if (n % 5 === 0) { nom = pk.v[n / 5][0]; des = pk.v[n / 5][1]; }
      else if (L[2]) { nom = L[0] + ' ' + n; des = L[1] + Math.floor(n * 100 / L[2]) / 100 + '%'; }
      else { nom = ' ' + L[0] + ' ' + n; des = L[1] + n; }
      // applyPerkDescription: el nombre en verde (65280) si ya se tiene, en rojo (16711680) si no
      h = '<div class="tdPerk"><h4 style="color:' + (V[st] >= n ? '#0f0' : '#f00') + '">' + esc(nom) + '</h4><p>' + esc(des) + '</p></div>';
    } else {
      const col = (L) => L.map((k) => '<div class="est"><span>' + k.toUpperCase() + '</span>' + pastillas(V[k]) + '</div>').join('');
      h = '<div class="tdCifras"><div><b>' + Math.ceil(a.vidaMax || a.vida) + '</b><span>HEALTH</span></div>' +
          '<div><b>' + Math.round(a.tacMax || a.tac || 0) + '</b><span>TAC-BAR</span></div></div>' +
          '<div class="tdEst"><div>' + col(COLS.stat) + '</div><i class="raya"></i><div>' + col(COLS.skill) + '</div></div>';
    }
    $('tdRecuadro').innerHTML = h;
    $('tdPestanas').innerHTML = P.map((src, i) =>
      '<button class="' + (i === Tienda.pest ? 'on' : '') + '" data-pest="' + i + '"><img src="' + src + '" alt=""></button>').join('');
    $('tdCuerpo').className = 'tdCuerpo v' + Tienda.pest;
  }

  /* ---------------- STATS: la pantalla de MadnessTeamSetup.init3 ----------------
     Seis columnas de 72 px cada 87 (x = 310 + i * 87): arriba la cabecera
     (perk_icon), y debajo la escalera de la pagina -niveles 1-10, 11-20 o
     21-30-: cuatro escalones de 17 px (perk_peg), la medalla del 5
     (perk_5, 68 px, con el logo de la estadistica), cuatro escalones mas y
     la medalla del 10. Un escalon se enciende si el valor pasa su nivel,
     con el fotograma de la pagina (2, 3 o 4); el logo de la medalla va al
     40 % apagado y blanco al conseguirla. Arriba los dos botones STAT /
     SKILL (mySubMenu), los puntos por gastar y el paginador. */
  function pintarStats() {
    const E = T().est || {}, a = Game.jugador, V = valores(a), pg = Tienda.pag, pts = (Progreso.ficha[Tienda.sub + 'Points']) || 0;
    let h = '<div class="stBarra"><div class="stSub">' + (E.sub || []).map((src, i) => {
      const k = i ? 'skill' : 'stat';
      return '<button class="' + (Tienda.sub === k ? 'on' : '') + '" data-sub="' + k + '"><img src="' + src + '" alt="' + k + '"></button>';
    }).join('') + '</div><div class="stPuntos' + (pts > 0 ? ' hay' : '') + '"><span>Points to Spend:</span><b>' + pts + '</b></div>' +
      '<div class="stPag"><button data-pag="-1"' + (pg > 0 ? '' : ' disabled') + '>&#9650;</button><span>PAGE ' + (pg + 1) +
      '</span><button data-pag="1"' + (pg < 2 ? '' : ' disabled') + '>&#9660;</button></div></div><div class="stCols">';
    for (const st of COLS[Tienda.sub]) {
      const v = V[st];
      /* init3: con puntos y por debajo del tope (30) la cabecera va en su
         fotograma 2 -verde, 'BUY +'- con el texto blanco (16777215); si no,
         gris con la flecha y el texto en 10066329 (#999999). */
      const compra = pts > 0 && v < 30;
      h += '<div class="stCol"><button class="stCab' + (compra ? ' compra' : '') + '" data-' + (compra ? 'compra' : 'paso') + '="' + st +
           (compra ? '' : ',0') + '"><img src="' + E.cab[compra ? 1 : 0] + '" alt=""><b><i style="transform:scaleX(' + CABECERA[st][1] + ')">' +
           CABECERA[st][0] + '</i></b></button>';
      for (let k = 1; k <= 10; k++) {
        const n = k + 10 * pg, si = v >= n;
        /* justBought (el destello de lo recien comprado) y amSelected (el
           pulso de tocar), encima de la pieza en el orden del SWF: en la
           medalla el destello va DEBAJO del logo y el pulso encima. */
        const med = k === 5 || k === 10, q = med ? 'med' : 'peg';
        const dest = Tienda.recien === Tienda.sub + st + n ? fx('destello', q) : '';
        const pul = Tienda.pulso === st + ',' + n ? fx('elegida', q) : '';
        if (med) {
          h += '<button class="stMed' + (si ? ' si' : '') + '" data-paso="' + st + ',' + n + '"><img src="' +
               E.medalla[si ? 1 + pg : 0] + '" alt="">' + dest + '<img class="logo" src="' + E.logo[st] + '" alt="">' + pul + '</button>';
        } else {
          h += '<button class="stPeg" data-paso="' + st + ',' + n + '"><img src="' +
               E.escalon[si ? 1 + pg : 0] + '" alt="">' + dest + pul + '</button>';
        }
      }
      h += '</div>';
    }
    $('tdLista').innerHTML = h + '</div>';
    Tienda.pulso = '';            // el pulso se da una vez: no vuelve al repintar
  }

  /* Un destello del SWF (tienda_swf.js est.destello / est.elegida): una tira
     de cuadros que CSS recorre a 30 fps -17 el justBought, 5 el amSelected,
     los dos una vez y parados en su ultimo cuadro, vacio-, en su caja
     respecto a la pieza. */
  function fx(tipo, q) {
    const D = T().est && T().est[tipo] && T().est[tipo][q];
    if (!D) return '';
    const c = D.caja;
    return '<i class="stFx ' + tipo + '" style="left:' + c[0] + '%;top:' + c[1] + '%;width:' + c[2] + '%;height:' + c[3] +
           '%;background-image:url(' + D.tira + ');background-size:' + (100 * D.n) + '% 100%;--n:' + D.n + '"></i>';
  }

  /* ---------------- SQUAD: la escuadra (MadnessTeamSetup.init) ----------------
     Cada miembro es su retrato, el mismo del HUD (#careto: rejilla roja,
     filo claro, el busto de HUD.retrato) con la placa negra del nombre y
     la muesca roja. En la Arena el jugador va solo: es el lider
     (buttonSquad en 'leader') y los demas huecos quedan vacios. */
  function pintarSquad() {
    const a = Game.jugador, nom = (Chars.TIPOS[a.tipo] && Chars.TIPOS[a.tipo].nombre) || a.tipo;
    let h = '<div class="sqCartas"><div class="sqCarta lider"><div class="sqCara"><canvas id="sqRetrato" width="110" height="126"></canvas>' +
            '<em>LEADER</em></div><div class="sqPlaca"><span>' + esc(nom) + '</span><small>LV ' + (a.nivel || 1) + '</small></div></div>';
    for (let i = 0; i < 5; i++) h += '<div class="sqCarta"><div class="sqCara"></div><div class="sqPlaca"><span>EMPTY</span></div></div>';
    $('tdLista').innerHTML = h + '</div>';
    const f = $('caraCanvas'), c = $('sqRetrato');
    if (f && c) c.getContext('2d').drawImage(f, 0, 0, c.width, c.height);
  }

  /* clickStat -> buyStat: un punto de la categoria sube un nivel la
     estadistica o destreza; changeStats (Progreso.aplicar, que cura) y
     assignPerks encienden en el acto lo que de. */
  function comprarPunto(st) {
    const F = Progreso.ficha;
    if (!Progreso.buyStat(F, st, Tienda.sub)) return false;
    Progreso.aplicar(Game.jugador, F, true);
    Progreso.guardar();
    Tienda.perk = [st, F[Tienda.sub + st]];
    // displayPage = floor((valor - 1) / 10) y purchasedStat = cat + estadistica + valor
    Tienda.pag = Math.min(2, Math.floor((Tienda.perk[1] - 1) / 10));
    Tienda.recien = Tienda.sub + st + F[Tienda.sub + st];
    return true;
  }

  function pintarDerecha() {
    if (Tienda.pest === 2) pintarStats(); else if (Tienda.pest === 1) pintarSquad(); else pintarLista();
  }

  /* ---------------- el muñeco sobre el pedestal ----------------
     Se pinta UNA vez al abrir, con el acelerador del juego y a un render
     target (como HUD.retrato). El muñeco es un Actor de verdad con los
     puños -como la ficha del SWF, que lo ensena sin arma y con las manos
     sueltas delante-, puesto en su postura de reposo con unos pasos de
     Actor.actualizar: asi las manos van donde van en el juego y los pies
     apoyan en el tambor.
     EL PEDESTAL, medido en la ficha del SWF (td_store.png, 1x): el
     muñeco mide 140 px; el tambor de arriba 112 px de ancho y ~14 de
     alto, el de abajo 146 de ancho y ~30 de alto. En metros, k = alto/140. */
  function pintarFigura() {
    const c = $('tdFigura'), ren = Game.ren;
    if (!c || !ren) return;
    const W = c.width, H = c.height, jug = Game.jugador;
    const esc3 = new THREE.Scene();
    let t = null, grupo;
    /* LA VISTA PREVIA DEL ARMA (applyAlpha, 8318..9531): el muñeco de la
       ficha (storeDummy) se equipa lo elegido en la ranura de prueba y, si
       no es lo que ya lleva, el arma se pinta a _alpha 70 con el color
       desplazado {rb: 80, gb: 80, bb: 150}: translucida y azulada. Lo que
       ya se lleva, tal cual. */
    const sel = Tienda.sel && Weapons.CAT[Tienda.sel] && Tienda.sel !== 'puños' ? Tienda.sel : null;
    const enMano = jug.arma && jug.arma.id !== 'puños' ? jug.arma.id : 'puños';
    const armaFig = sel || enMano;
    /* LA ROPA SE PRUEBA IGUAL (applyAlpha sobre myHead o myBody): el muñeco
       con la prenda elegida en su ranura y, si no es suya, en azul y
       translucido. Aca la prenda va fundida en la malla, asi que el tinte va
       al muñeco entero, como en el SWF va a la cabeza o al cuerpo entero. */
    let tipoFig = jug.tipo, probar = false;
    if (esRopa(Tienda.sel)) {
      const p = Progreso.atuendo();
      p[Prendas.de(Tienda.sel).cat] = Tienda.sel;
      tipoFig = Chars.vestido(Chars.base(jug.tipo), p);
      probar = !tieneRopa(Tienda.sel);
    }
    try {
      t = Actor.crear({ tipo: tipoFig, arma: armaFig, x: 0, z: 0, mirando: 1 });
      t.sinTope = true; t.guion = true;
      t.rumbo = t.rumboObj = Math.PI / 2 - 0.45;     // tres cuartos, como HUD.retrato
      for (let i = 0; i < 40; i++) Actor.actualizar(t, 1 / 60, i / 60);
      grupo = t.grupo;
      if (sel && sel !== enMano && t.mallaArma) vistaPrevia(t);
    } catch (e) {
      const cu = Chars.crear(jug.tipo); cu.grupo.rotation.y = 0.45; grupo = cu.grupo;
    }
    const alto = Chars.ALTO * ((Chars.TIPOS[jug.tipo] && Chars.TIPOS[jug.tipo].escala) || 1);
    const k = alto / 140;
    const r1 = 56 * k, h1 = 14 * k, r2 = 73 * k, h2 = 30 * k;
    // con la luz y el tono de las fichas (Art.matFicha / Art.tonoFicha), no con la de la sala
    const matF = Art.matFicha();
    grupo.traverse((o) => { if (o.material === Art.mats.cuerpo) o.material = matF; });
    // los cristales translucidos, con la opacidad para mezcla lineal (ver Chars.matVidrioLineal)
    grupo.traverse((o) => { if (o.material && o.material.userData && o.material.userData.vidrio) o.material = Chars.matVidrioLineal(o.material.opacity); });
    // la prenda a prueba: el muñeco entero en azul translucido, menos su tinta y el arma
    if (probar && t) t.cuerpo.grupo.traverse((o) => {
      if (o.isMesh && o.material !== Art.mats.contornoPiel && !(t.mallaArma && o.parent && esDe(o, t.mallaArma))) o.material = materialPrueba(o.material);
    });
    const sube = new THREE.Group(); sube.position.y = h1 + h2; sube.add(grupo); esc3.add(sube);
    const B = U.builder();
    B.addCyl(r2, r2, h2, 40, 0, h2 / 2, 0, 0x8c8c8c, {});
    B.addCyl(r1, r1, h1, 40, 0, h2 + h1 / 2, 0, 0xb4b4b4, {});
    const geo = B.build();
    const ped = new THREE.Mesh(geo, Art.mats.plano);
    // la tinta negra del pedestal: la misma pieza un poco mayor y del reves
    const tinta = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
    tinta.scale.set(1.035, 1.02, 1.035); tinta.position.y = -0.004;
    esc3.add(ped, tinta);
    /* El encuadre es la franja de selectDisplay de y = -75 a 147 px del SWF
       (coronilla en -60, suela en 72, nombre en 107 y nivel en 135): cada px
       del SWF son alto x 1,035 / 132 m y la suela esta en h1 + h2. */
    const mSwf = alto * 1.035 / 132, yM = (ySwf) => h1 + h2 + (72 - ySwf) * mSwf;
    const FOV = 24, arriba = yM(-75) - yM(147), medio = (yM(-75) + yM(147)) / 2;
    const d = arriba / (2 * Math.tan(FOV * Math.PI / 360));
    const cam = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 30);
    cam.position.set(0, medio + 0.55, d); cam.lookAt(0, medio, 0);
    /* sRGB en el destino: sin esto three r160 deja el render a textura en
       espacio LINEAL y el muñeco salia oscurisimo (cabeza 144 en vez de
       184, peto 55 en vez de 118, medidos). */
    const rt = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true, colorSpace: THREE.SRGBColorSpace });
    const antes = ren.getRenderTarget(), alfa = ren.getClearAlpha();
    ren.setRenderTarget(rt); ren.setClearAlpha(0); ren.clear(true, true, false);
    ren.render(esc3, cam);
    const buf = new Uint8Array(W * H * 4);
    ren.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    ren.setRenderTarget(antes); ren.setClearAlpha(alfa);
    rt.dispose(); geo.dispose(); tinta.material.dispose();
    const g = c.getContext('2d'), img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    Art.tonoFicha(img.data);
    /* LOS TEXTOS DE LA FICHA, donde los pone selectDisplay (952), medidos
       contra la figura: en el SWF la coronilla cae en y = -60 y la suela en
       72 (td_sel.png). El nombre del tipo grande del fondo (charNameTEXT,
       Impact 71) tiene su centro al 65 % de la coronilla a la suela
       (y = 26,2) y sobre el eje del pedestal; el nombre (charName2TEXT,
       Impact 34) en y = 107 y el nivel (levelTEXT, Impact 18) en 135. Se
       proyectan la coronilla y la suela con la camara de la figura, y de
       ahi sale la escala: cuanto del alto del lienzo es un px del SWF. */
    const yDe = (yM) => (1 - new THREE.Vector3(0, yM, 0).project(cam).y) / 2;
    const yCab = yDe(h1 + h2 + alto * 1.035), yPie = yDe(h1 + h2), kS = (yPie - yCab) / 132;
    const aY = (ySwf) => ((yCab + (ySwf + 60) * kS) * 100).toFixed(2) + '%';
    const PS = c.parentNode.style;
    PS.setProperty('--yFondo', aY(26.2)); PS.setProperty('--yNom', aY(107)); PS.setProperty('--yNiv', aY(135));
    PS.setProperty('--k', (kS * 100).toFixed(3) + 'cqh');
    g.putImageData(img, 0, 0);
  }

  /* El tinte de prueba sobre la malla del arma (sin sus manos): copias de
     sus materiales con el desplazamiento sumado al final y alfa 0,7. */
  const _prueba = new Map();
  function materialPrueba(m) {
    let r = _prueba.get(m);
    if (!r) {
      r = m.clone();
      const antes = m.onBeforeCompile, clave = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
      r.onBeforeCompile = (sh, ren) => {
        if (antes) antes.call(m, sh, ren);
        const k = sh.fragmentShader.lastIndexOf('}');
        sh.fragmentShader = sh.fragmentShader.slice(0, k) +
          '\tgl_FragColor.rgb = min( vec3( 1.0 ), gl_FragColor.rgb + vec3( 80.0, 80.0, 150.0 ) / 255.0 );\n}' +
          sh.fragmentShader.slice(k + 1);
      };
      r.customProgramCacheKey = () => clave + '-prueba';
      r.transparent = true; r.opacity = 0.7; r.depthWrite = false;
      _prueba.set(m, r);
    }
    return r;
  }
  const esDe = (o, raiz) => { for (let p = o; p; p = p.parent) if (p === raiz) return true; return false; };
  function vistaPrevia(t) {
    const manos = new Set();
    const mu = t.mallaArma.userData && t.mallaArma.userData.manos;
    if (mu) for (const k in mu) mu[k].traverse((o) => manos.add(o));
    t.mallaArma.traverse((o) => { if (o.isMesh && !manos.has(o)) o.material = materialPrueba(o.material); });
  }

  function elegir(id) {
    Tienda.sel = id;
    if (SECCION[id] !== undefined) Tienda.lpag[SECCION[id]] = paginaDe(id);
    pintarLista(); pintarArma(); pintarFigura();
  }
  Tienda.lpag = {};
  Tienda.elegir = elegir;

  Tienda.abrir = function () {
    if (Tienda.abierta) return;
    Tienda.abierta = true;
    const jug = Game.jugador;
    if (!Tienda.sel) Tienda.sel = item(jug.arma.id) && SECCION[jug.arma.id] !== undefined ? jug.arma.id : 'pistola';
    Tienda.cat = SECCION[Tienda.sel];
    pintarFigura(); pintarFicha(); pintarDerecha(); pintarArma();
    $('tienda').classList.remove('oculto');
    document.body.classList.add('enTienda');
    // createTeamSetup / createItemStore no suenan: la tienda se abre en silencio
  };
  Tienda.cerrar = function () {
    if (!Tienda.abierta) return;
    Tienda.abierta = false; Tienda.bloqueo = true;   // no se reabre hasta alejarse del mostrador
    $('tienda').classList.add('oculto');
    document.body.classList.remove('enTienda');
  };

  /* Cerca del mostrador se abre sola; alejarse la cierra y rearma. */
  Tienda.paso = function (jug) {
    const SH = global.Armeria && Armeria.SHOP;
    if (!SH || Game.sala !== 'armeria' || Game.cruce) { if (Tienda.abierta) Tienda.cerrar(); Tienda.bloqueo = false; return; }
    const cerca = Math.abs(jug.x - (Armeria.CX + SH.x)) < SH.an / 2 && jug.z < Arena.FONDO + 0.25 + 1.25;
    if (!cerca) { if (Tienda.abierta) Tienda.cerrar(); Tienda.bloqueo = false; return; }
    if (!Tienda.abierta && !Tienda.bloqueo) Tienda.abrir();
  };

  Tienda.init = function () {
    const t = $('tienda');
    if (!t) return;
    /* LOS SONIDOS, los de cada boton del SWF (SwainAudioPlayer.playSound,
       sin variar el tono):
         MadnessStoreItems  pressPortrait, pressItemSlot, pressPrev/Next  menu2
                            pressConfirm (comprar)                        buy
         MadnessTeamSetup   pressStats (STATS y STAT / SKILL)             menu1
                            pressStore (GEAR)                             menu4
                            pressClose                                    menu1
                            pressPrev2 / pressNext2 (paginas)             menu2
                            clickStat (comprar un punto)                  blunt
                            displayStatInfo (tocar un escalon)            nada
       menu1/2/4 son S_Menu1/2/4 (ui_mover, ui_pulsar, ui_volver) y buy es
       S_StoreBuy (ui_compra). La escuadra (SQUAD) sale de init2, como
       pressClose: menu1. */
    const suena = (n) => Sonido.tocar(n, { tono: 0 });
    t.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.id) { elegir(b.dataset.id); suena('ui_pulsar'); }
      else if (b.dataset.cat) {
        Tienda.cat = +b.dataset.cat;
        const L = idsDe(Tienda.cat), pg = Math.min(paginas(Tienda.cat) - 1, Tienda.lpag[Tienda.cat] || 0);
        if (L.length) elegir(L[pg * CASILLAS]); else pintarLista();
        suena('ui_pulsar');
      }
      else if (b.dataset.lpag) {
        // pressPrev / pressNext de MadnessStoreItems: menu2
        const i = Tienda.cat;
        Tienda.lpag[i] = Math.max(0, Math.min(paginas(i) - 1, (Tienda.lpag[i] || 0) + +b.dataset.lpag));
        pintarLista(); suena('ui_pulsar');
      }
      else if (b.dataset.pest) {
        Tienda.pest = +b.dataset.pest; Tienda.perk = null; pintarRecuadro(); pintarDerecha();
        suena(Tienda.pest === 0 ? 'ui_volver' : 'ui_mover');
      }
      else if (b.dataset.sub) { Tienda.sub = b.dataset.sub; Tienda.perk = null; pintarStats(); pintarRecuadro(); suena('ui_mover'); }
      else if (b.dataset.pag) {
        // pressPrev2 / pressNext2: purchasedStat = '' (el destello se apaga al pasar de pagina)
        Tienda.pag = Math.max(0, Math.min(2, Tienda.pag + +b.dataset.pag)); Tienda.recien = ''; pintarStats(); suena('ui_pulsar');
      }
      else if (b.dataset.compra) {
        if (comprarPunto(b.dataset.compra)) { pintarStats(); pintarRecuadro(); suena('blunt'); }
      }
      else if (b.dataset.paso) {
        const [st, n] = b.dataset.paso.split(',');
        /* displayStatInfo no llama a init3: el destello de lo comprado ya se
           apago y no vuelve a salir al tocar otro escalon */
        Tienda.perk = [st, +n]; Tienda.pulso = st + ',' + n; Tienda.recien = ''; pintarStats(); pintarRecuadro();
      }
      else if (b.id === 'tdComprar' && esRopa(Tienda.sel)) {
        const compra = !tieneRopa(Tienda.sel);
        if (botonRopa(Tienda.sel)) { suena(compra ? 'ui_compra' : 'ui_pulsar'); pintarFigura(); pintarFicha(); pintarDerecha(); pintarArma(); }
      }
      else if (b.id === 'tdComprar' && Waves.comprar(Game.olas, Game.jugador, Tienda.sel)) {
        suena('ui_compra');
        pintarFicha(); pintarDerecha(); pintarArma();
      } else if (b.id === 'tdSalir') { Tienda.cerrar(); suena('ui_mover'); }
    });
  };

  global.Tienda = Tienda;
})(window);

