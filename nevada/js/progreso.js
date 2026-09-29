/* =============================================================
   progreso.js -> La ficha del jugador de la Arena y como crece.

   Todo es MadnessDataFile (t178349) y MadnessGameSelect (t178358)
   del SWF, sin nada puesto a mano:

   - La ficha nueva de la Arena (createNew 'arena'): 'Player', nivel 1,
     especial (amSpecial), applyStats todo a 0, sin armas y con $0
     (MadnessSaveData: playerRoster.myCash = 0).
   - getLevelUpXP(nivel) = 100 x nivel - 0,5 x nivel x 100 = 50 x nivel.
   - applyXP: suma la XP y, si llega a getLevelUpXP(nivel), sube UN
     nivel, da 3 puntos de estadistica y 3 de destreza y le RESTA
     getLevelUpXP del nivel NUEVO (sic: con 50 de XP en nivel 1 queda en
     -50 en nivel 2; el SWF lo hace asi y aqui tambien). Luego
     changeStats, que ademas cura del todo.
   - buyStat: un punto sube un nivel la estadistica o destreza (tope
     statCap = 30), y changeStats + assignPerks.
   - changeStats: modSpeed = 1 + DEX/45, modDmg = 1 + STR/15,
     modRecharge = 1 + TAC/10, modArmor = 1 + END/15,
     modAllySmart = 1 + LEAD/15, modHurtTactics = 1 + AWR/50,
     modRange = AWR x 1,5; vida = 6 + nivel (+10 especial); barra TAC
     por nivel (+10 con perkTacBar1 y +10 con perkTacBar2); bullet
     time de 400.
   - assignPerks: cada ventaja se enciende al llegar su estadistica o
     destreza a 5, 10, 15, 20, 25 o 30 (la tabla PERKS de abajo).
   - appropriateXP (Arena): por cada baja, dinero = nivel del muerto x 20
     (si el que mata tiene mas nivel: x 0,7 + x nivel muerto / nivel
     matador) para el fondo de la oleada, y si mato el jugador, XP =
     nivel del muerto x 8 (minimo 1).
   ============================================================= */
(function (global) {
  'use strict';

  const Progreso = {};
  const STATS = ['STR', 'DEX', 'TAC', 'END', 'LEAD', 'AWR'];
  const SKILLS = ['Pistol', 'SMG', 'Rifle', 'Shotgun', 'Melee', 'Unarmed'];
  Progreso.STATS = STATS; Progreso.SKILLS = SKILLS;

  /* assignPerks, en orden: la ventaja que da cada nivel 5..30 de cada
     estadistica o destreza. SMG 30 no da nada: en el SWF su perkSMGROF
     se asigna a una variable local por error y nunca se enciende. */
  const PERKS = {
    STR: ['perkSidearm1', 'perkKnockdown1', 'perkBlockBreak', 'perkStunDash1', 'perkKnockdown2', 'perkStunDash2'],
    DEX: ['perkDodge1', 'perkReload1', 'perkDodge2', 'perkBlock1', 'perkDodge3', 'perkBlock2'],
    TAC: ['perkLowAcc1', 'perkCoverShoot', 'perkTacBar1', 'perkLowAcc2', 'perkTacBar2', 'perkLowAcc3'],
    END: ['perkArmor1', 'perkArmor2', 'perkStunProof1', 'perkArmor3', 'perkStunProof2', 'perkImmuneLowDmg'],
    LEAD: ['perkTeamBonus1', 'perkFearMonger1', 'perkTeamBonus2', 'perkFearMonger2', 'perkTeamBonus3', 'perkFearMonger3'],
    AWR: ['perkHeadshotCrits', 'perkBulletTime1', 'perkBulletTime2', 'perkArmorPierce', 'perkBulletTime3', 'perkBulletTime4'],
    Pistol: ['perkPistolAccuracy1', 'perkPistolReload', 'perkPistolROF1', 'perkPistolEffectiveness', 'perkPistolAccuracy2', 'perkPistolROF2'],
    SMG: ['perkSMGAim1', 'perkSMGReload', 'perkSMGTacDamage', 'perkSMGRange', 'perkSMGAim2', null],
    Rifle: ['perkRifleTacDamage', 'perkRifleRange1', 'perkRifleAccuracy', 'perkRifleEffectiveness', 'perkRifleRange2', 'perkRifleReload'],
    Shotgun: ['perkShotgunDamage', 'perkShotgunROF1', 'perkShotgunShots1', 'perkShotgunROF2', 'perkShotgunReload', 'perkShotgunShots2'],
    Melee: ['perkMeleeMoves1', 'perkMeleePistolWhip', 'perkMeleeMoves2', 'perkMeleeDisarm', 'perkMeleeMoves3', 'perkMeleeMoves4'],
    Unarmed: ['perkUnarmedMoves1', 'perkUnarmedSpeed1', 'perkUnarmedMoves2', 'perkUnarmedSpeed2', 'perkUnarmedMoves3', 'perkUnarmedSpeed3']
  };
  Progreso.PERKS = PERKS;

  const CLAVE = 'madness.ficha';
  /* earnedXP / earnedCash de MadnessGameSelect: lo que se lleva la oleada
     en curso, que la ventana de TEST RESULTS vuelca a la ficha. */
  Progreso.ganado = { xp: 0, cash: 0 };

  Progreso.nueva = function () {
    const F = { myLevel: 1, myXP: 0, statPoints: 0, skillPoints: 0, statCap: 30, amSpecial: true, myCash: 0, myWaves: 0, perks: {},
                /* lo de la arena que guarda saveGame y lee loadGame: las
                   armas del lider (teamLeader.myWeapons, con balas y
                   desgaste), la ranura en mano y la ultima oleada
                   terminada (currentWave = esta + 1: generateArena la
                   retoma por ahi) */
                myWeapons: [null, null], ranura: 0, arenaOla: 0,
                /* la ropa de la tienda (tienda.js): lo comprado y lo puesto en
                   cada ranura del SWF que tenemos -mask y shirt-. Queda en la
                   ficha: no se pierde al morir, como el dinero. */
                ropa: { tiene: [], mask: null, shirt: null } };
    STATS.forEach((k) => { F['stat' + k] = 0; });
    SKILLS.forEach((k) => { F['skill' + k] = 0; });
    Progreso.assignPerks(F);
    return F;
  };

  /* La partida se guarda como en el SWF (MadnessSaveData.saveGame): al
     terminar cada oleada y al morir. */
  Progreso.cargar = function () {
    const G = global.U && U.store ? U.store.get(CLAVE, null) : null;
    const F = Progreso.nueva();
    if (G && typeof G === 'object') for (const k in F) if (k !== 'perks' && G[k] !== undefined) F[k] = G[k];
    Progreso.assignPerks(F);
    Progreso.ficha = F;
    return F;
  };
  Progreso.guardar = function () {
    const F = Progreso.ficha;
    if (!F || !global.U || !U.store) return;
    const o = {}; for (const k in F) if (k !== 'perks') o[k] = F[k];
    U.store.set(CLAVE, o);
  };
  Progreso.borrar = function () { Progreso.ficha = Progreso.nueva(); Progreso.guardar(); return Progreso.ficha; };

  Progreso.getLevelUpXP = function (nivel) { return (100 * nivel) - ((0.5 * (nivel - 0)) * 100); };

  Progreso.assignPerks = function (F) {
    const p = F.perks = {};
    for (const k in PERKS) {
      const v = F[(STATS.indexOf(k) >= 0 ? 'stat' : 'skill') + k] || 0;
      PERKS[k].forEach((n, i) => { if (n) p[n] = v >= (i + 1) * 5; });
    }
    return p;
  };
  Progreso.tiene = function (F, perk) { return !!(F && F.perks && F.perks[perk]); };

  /* applyXP: devuelve true si subio de nivel. */
  Progreso.applyXP = function (F, xp) {
    F.myXP += xp;
    if (!(F.myXP < Progreso.getLevelUpXP(F.myLevel))) {
      F.myLevel += 1;
      F.statPoints += 3;
      F.skillPoints += 3;
      F.myXP -= Progreso.getLevelUpXP(F.myLevel);
      return true;
    }
    return false;
  };

  /* buyStat (clickStat en MY STATS). cat: 'stat' | 'skill'. */
  Progreso.buyStat = function (F, st, cat) {
    if (!(F[cat + 'Points'] > 0) || !((F[cat + st] || 0) < F.statCap)) return false;
    F[cat + st] = (F[cat + st] || 0) + 1;
    F[cat + 'Points'] -= 1;
    Progreso.assignPerks(F);
    return true;
  };

  /* La barra TAC de un nivel (changeStats): 5 x (0,7 - i/100) por nivel
     desde el 5 hasta el 44. */
  Progreso.tacDeNivel = function (nivel) {
    let t = 0;
    for (let i = 5; i <= nivel && i < 45; i++) t += Math.floor(5 * (0.7 - i / 100));
    return t;
  };

  /* changeStats sobre el actor del jugador. 'curar': changeStats deja la
     vida al maximo (myHealth = myHealthMax), y el SWF lo llama al subir
     de nivel y al comprar un punto. */
  Progreso.aplicar = function (a, F, curar) {
    F = F || Progreso.ficha;
    if (!a || !F) return;
    const L = F.myLevel;
    a.nivel = L;
    a.statSTR = F.statSTR; a.statDEX = F.statDEX; a.statTAC = F.statTAC;
    a.statEND = F.statEND; a.statLEAD = F.statLEAD; a.statAWR = F.statAWR;
    SKILLS.forEach((k) => { a['skill' + k] = F['skill' + k] || 0; });
    a.dex = F.statDEX;                                  // la variante de la esquiva (player.js)
    a.modSpeed = 1 + F.statDEX / 45;
    a.modDmg = 1 + F.statSTR / 15;
    a.tacMod = 1 + F.statTAC / 10;                      // modRecharge
    a.modArmor = 1 + F.statEND / 15;
    a.modAllySmart = 1 + F.statLEAD / 15;
    a.tacDano = 1 + F.statAWR / 50;                     // modHurtTactics
    a.modRange = F.statAWR * 1.5;
    a.perks = F.perks;
    const vidaMax = 6 + Math.floor(L) + (F.amSpecial ? 10 : 0);
    const frac = a.vidaMax ? a.vida / a.vidaMax : 1;
    a.vidaMax = vidaMax;
    a.vida = curar ? vidaMax : Math.min(vidaMax, Math.max(0, frac * vidaMax));
    let tac = Progreso.tacDeNivel(L);
    if (F.perks.perkTacBar1) tac += 10;
    if (F.perks.perkTacBar2) tac += 10;
    a.tacMax = tac;
    if (curar) a.tac = tac; else a.tac = Math.min(a.tac || 0, tac);
  };

  /* appropriateXP, rama de la Arena: lo que deja una baja. */
  Progreso.recompensa = function (nivelMatador, nivelMuerto, delJugador) {
    let cash = nivelMuerto * 20;
    if (nivelMatador > nivelMuerto) cash = (cash * 0.7) + (cash * (nivelMuerto / nivelMatador));
    let xp = 0;
    if (delJugador) { xp = nivelMuerto * 8; if (xp < 1) xp = 1; }
    return { cash: cash, xp: xp };
  };

  /* =============================================================
     LO QUE CADA VENTAJA CAMBIA EN LA PELEA

     Todo de MadnessCharacter (t178352), con el offset del bytecode.
     'a' es el actor: el jugador lleva a.perks (Progreso.aplicar); los
     enemigos no llevan ninguna, como en la Arena del SWF.
     ============================================================= */
  const P = (a, n) => !!(a && a.perks && a.perks[n]);
  Progreso.perk = P;
  const esPistola = (f) => f && (f.cat === 'pistol' || f.cat === 'revolver');

  /* myGameSpeed del personaje (determineGameSpeed, 125142..126177): el
     del mundo -1, o 0 en bullet time- mas lo que suman los perks en el
     estado en que esta. Lo calcula Game.paso cada cuadro (a.gs). */
  Progreso.gs = function (a) { return a && a.gs !== undefined ? a.gs : 1; };

  /* Cadencia: el arma dispara cuando rofTimer >= myROF - rofAdjust
     (48963), y rofAdjust suma (47814..48291):
       pistola o revolver: +1 perkPistolROF1, +1 perkPistolROF2
       subfusil: +1 perkSMGROF (nunca se enciende: ver PERKS)
       escopeta de bomba (havePump): +7 perkShotgunROF1, +7 perkShotgunROF2
     La espera se escala por (myROF - rofAdjust) / myROF: la Beretta
     pasa de 18 a 16 cuadros y la SPAS de 40 a 26. Y rofTimer sube
     1 + myGameSpeed por cuadro, +1 mas en bullet time con
     perkBulletTime3 (47732..47796): eso lo hace Progreso.kTiempoROF. */
  Progreso.kROF = function (a, f) {
    if (!f || !f.rof) return 1;
    let adj = 0;
    if (esPistola(f)) { if (P(a, 'perkPistolROF2')) adj += 1; if (P(a, 'perkPistolROF1')) adj += 1; }
    if (f.cat === 'smg' && P(a, 'perkSMGROF')) adj += 1;
    if (f.cat === 'shotgun' && f.bomba) { if (P(a, 'perkShotgunROF2')) adj += 7; if (P(a, 'perkShotgunROF1')) adj += 7; }
    return (f.rof - adj) / f.rof;
  };
  Progreso.kTiempoROF = function (a) {
    const gs = Progreso.gs(a);
    return (1 + gs + (a && a.bulletTime && P(a, 'perkBulletTime3') ? 1 : 0)) / (1 + gs);
  };

  /* Recarga: reloadTimer sube 1 + myGameSpeed por cuadro y +1 mas con
     el perk de recarga de la categoria del arma (43951..44372):
     perkPistolReload (pistola y revolver), perkSMGReload,
     perkRifleReload, perkShotgunReload. A velocidad normal es x1,5; en
     bullet time, x2. */
  Progreso.kRecarga = function (a, f) {
    if (!f) return 1;
    const c = f.cat;
    const perk = (esPistola(f) && P(a, 'perkPistolReload')) || (c === 'smg' && P(a, 'perkSMGReload')) ||
                 (c === 'rifle' && P(a, 'perkRifleReload')) || (c === 'shotgun' && P(a, 'perkShotgunReload'));
    const gs = Progreso.gs(a);
    return perk ? (2 + gs) / (1 + gs) : 1;
  };

  /* Dispersion (75181..75791): bulletRotation al azar en +-mySpread, y
     QUIETO (mySpeedRight == 0 y mySpeedDown == 0):
       pistola o revolver x0,3 con perkPistolAccuracy2, si no x0,6 con
       perkPistolAccuracy1; fusil x0,3 con perkRifleAccuracy.
     El subfusil, siempre x smgAimTimer (ver Progreso.pasoSMG). */
  Progreso.kDisp = function (a, f) {
    if (!f || !a) return 1;
    let k = 1;
    const quieto = Math.abs(a.vx || 0) < 0.05 && Math.abs(a.vz || 0) < 0.05;
    if (quieto && esPistola(f)) {
      if (P(a, 'perkPistolAccuracy2')) k *= 0.3; else if (P(a, 'perkPistolAccuracy1')) k *= 0.6;
    }
    if (f.cat === 'smg') k *= (a.smgAim || 1);
    if (f.cat === 'rifle' && P(a, 'perkRifleAccuracy') && quieto) k *= 0.3;
    return k;
  };

  /* smgAimTimer (48341..48638), cada cuadro de 30 fps: vuelve a 1 cuando
     rofTimer > myROF + 3 -hace mas de tres cuadros que no dispara-; si
     no, baja 0,04 por cuadro hasta 0,1 con perkSMGAim2, o 0,02 hasta
     0,4 con perkSMGAim1. 'desde' son los segundos desde el ultimo
     disparo; la espera del arma equivale a myROF cuadros. */
  Progreso.pasoSMG = function (a, f, desde, dt) {
    if (!a) return;
    if (!f || f.cat !== 'smg' || !f.rof) { a.smgAim = 1; return; }
    const cuadro = f.cadencia / f.rof;                // s por cuadro del SWF con esta arma
    if (desde > cuadro * (f.rof + 3)) { a.smgAim = 1; return; }
    const n = dt * 30;
    if (P(a, 'perkSMGAim2')) { if (a.smgAim > 0.1) a.smgAim = Math.max(0.1, a.smgAim - 0.04 * n); }
    else if (P(a, 'perkSMGAim1')) { if (a.smgAim > 0.4) a.smgAim = Math.max(0.4, a.smgAim - 0.02 * n); }
  };

  /* Perdigones: myShots +1 perkShotgunShots1, +1 perkShotgunShots2 (74973..75057). */
  Progreso.perdigones = function (a, f) {
    let n = (f && f.perdigones) || 1;
    if (f && f.cat === 'shotgun') { if (P(a, 'perkShotgunShots1')) n += 1; if (P(a, 'perkShotgunShots2')) n += 1; }
    return n;
  };

  /* EL RANGO EFECTIVO. Un disparo es 'de cerca' si la distancia no pasa
     de myRange x myScale + modRange + r7 (82107), con r7 = +40
     perkSMGRange en subfusil y +30 perkRifleRange1, +30 perkRifleRange2
     en fusil (75629..75887). modRange = AWR x 1,5. Todo en px del SWF,
     a metros con Weapons.PX (0,214 m / 13,06 px), la escala de los
     golpes y de la esquiva: el myRange de un arma de fuego se mide con
     la misma regla que el de un bate. */
  Progreso.rangoPx = function (a, f) {
    if (!f || !f.rangoSWF) return 0;
    let r7 = 0;
    if (f.cat === 'smg' && P(a, 'perkSMGRange')) r7 += 40;
    if (f.cat === 'rifle') { if (P(a, 'perkRifleRange1')) r7 += 30; if (P(a, 'perkRifleRange2')) r7 += 30; }
    return f.rangoSWF + ((a && a.modRange) || 0) + r7;
  };

  /* En el SWF esto no llega a ocurrir (la distancia r9, 74810, es un
     'new Number()' que vale 0); aqui se aplica tal como esta escrito, a
     proposito (ver combat.js).

     La tirada de fuera de rango (81834..82436), en disparos NO
     apuntados (aimTimer == -1): r5 = 2, -1 con perkPistolEffectiveness
     (pistola o revolver) y -1 con perkRifleEffectiveness (fusil); mas
     ceil(exceso / 45) por los px que pase del rango; minimo 0. Si
     randomNumber(0, r5) > 1 el tiro va a la TAC del blanco (targetsTac)
     en vez de al cuerpo. Devuelve true si se desvia. */
  Progreso.desvia = function (a, f, excesoPx, rng) {
    let r5 = 2;
    if (esPistola(f) && P(a, 'perkPistolEffectiveness')) r5 -= 1;
    if (f && f.cat === 'rifle' && P(a, 'perkRifleEffectiveness')) r5 -= 1;
    if (excesoPx > 0) r5 += Math.ceil(excesoPx / 45);
    if (r5 < 0) r5 = 0;
    const tirada = Math.floor((rng || Math.random)() * (r5 + 1));   // SwainMath.randomNumber(0, r5), entero
    return tirada > 1;
  };

  global.Progreso = Progreso;
})(window);

