/* =============================================================
   golpes.js -> QUE GOLPE DA CADA UNO CON UN ARMA BLANCA, como en el SWF.

   En MPN2 los golpes no son del arma: son del PERSONAJE (madness_character,
   5628) y valen para cualquier arma blanca. Se eligen por el nivel de
   cuerpo a cuerpo y por el combo (el metodo de ataque de MadnessCharacter):

     skillMelee >= 5  perkMeleeMoves1    >= 15 perkMeleeMoves2
               >= 25  perkMeleeMoves3    >= 30 perkMeleeMoves4

     combo    sin perk   Moves1   Moves2   Moves3        Moves4
       1      chump      basic    basic    better        better
       2        -        basic    basic    better        better
       3        -        basic    better   better 1..3   finish
     (sin perk el combo se queda en el tope: siempre chump)

   Corriendo, el golpe es melee_dash2. El combo sigue si se vuelve a
   atacar antes de 4 cuadros despues de acabar el golpe (meleeComboTimer);
   si no, empieza de nuevo. Aqui ademas se guarda el ataque pedido A MITAD
   de un golpe y se lanza al acabar: en el SWF lo hace mantener el boton
   (mouseHold), y en el movil no hay boton que mantener.

   El nivel: el jugador empieza sin (sus puntos se reparten en la armeria,
   el puesto de habilidades). Los enemigos, como randomStats del SWF:
   nivel x 3 puntos de habilidad repartidos al azar, de uno en uno, entre
   las seis (escopeta, fusil, subfusil, pistola, cuerpo a cuerpo, sin
   armas), con tope de 30 en cada una.
   ============================================================= */
(function (global) {
  'use strict';

  const Golpes = {};
  const FPS = 30;
  const VENTANA_COMBO = 4 / FPS;

  Golpes.perk = function (skill) {
    return skill >= 30 ? 4 : skill >= 25 ? 3 : skill >= 15 ? 2 : skill >= 5 ? 1 : 0;
  };

  /* randomStats: nivel x 3 puntos, al azar entre las seis habilidades. */
  Golpes.skillDeNivel = function (nivel, rng) {
    const r = rng || Math.random;
    const s = [0, 0, 0, 0, 0, 0];
    for (let k = 0; k < nivel * 3; k++) {
      const i = Math.floor(r() * 6);
      if (s[i] < 30) s[i]++;
    }
    return s[4];                         // la quinta es Melee
  };

  const azar = (n) => 1 + Math.floor(Math.random() * n);

  /* El golpe que toca, y el combo avanza (MadnessCharacter, ataque). */
  Golpes.elegir = function (A) {
    Golpes.danoConArma(A);
    if (A.corriendo) return 'melee_dash2';
    if (A.golpeSuelto > VENTANA_COMBO) A.meleeCombos = 3;
    if ((A.meleeCombos || 0) > 2) A.meleeCombos = 0;
    const c = A.meleeCombos || 0;
    const p = Golpes.perk(A.skillMelee || 0);
    let n;
    if (p === 4) n = c < 2 ? 'melee_better' + azar(6) : 'melee_finish' + azar(3);
    else if (p === 3) n = 'melee_better' + azar(c < 2 ? 6 : 3);
    else if (p === 2) n = c < 2 ? 'melee_basic' + azar(6) : 'melee_better' + azar(6);
    else if (p === 1) n = 'melee_basic' + azar(6);
    else { A.meleeCombos = 2; n = 'melee_chump' + azar(2); }
    A.meleeCombos = (A.meleeCombos || 0) + 1;
    return n;
  };

  /* SIN ARMA (MadnessCharacter, ataque): por perk de 'unarmed', igual
     de uno en uno que con armas pero sin combo:
       perkUnarmedMoves3 (>= 25)  1/3 brawl 1-4, si no 1/2 savate 1-5, si no elite 1-5
       perkUnarmedMoves2 (>= 15)  1/2 brawl 1-4, si no savate 1-5
       perkUnarmedMoves1 (>=  5)  brawl 1-4
       sin perk                   chump 1-2
     La unica patada (elite_5, mortal con patada) es de Moves3: el
     jugador de nivel 1 pega solo los dos puñetazos torpes del chump.
     Y el daño lo pone el estilo (ItemGenerator.changeUnarmedDamage):
     chump 2 -el del arma 'Unarmed'-, brawl 2,5, savate 5,5, elite 10. */
  const DANO_ESTILO = { chump: 2, brawl: 2.5, savate: 5.5, elite: 10 };

  /* ItemGenerator.changeUnarmedDamage(personaje, myStatus, perkKnockdown2),
     que el ataque llama cada vez (MadnessCharacter 54030..54136):
       - SIN ARMA, con el golpe que sale: si es savate O se tiene
         perkKnockdown2 (STR 25) -> 5,5; si no, brawl -> 2,5; elite -> 10;
         cualquier otro -chump, el golpe corriendo- deja el que hubiera
         (2 el de 'Unarmed' al empezar). Con Knockdown 2 TODO golpe sin
         arma queda en 5,5, tambien el elite: el SWF lo mira primero.
       - CON ARMA (blanca o de fuego): changeUnarmedDamage(..., 'unarmed_brawl')
         -> 2,5: lo que pegan la mano libre de los combos y el culatazo. */
  Golpes.danoSinArma = function (A, n) {
    const st = String(n).split('_')[1];
    if (st === 'savate' || (global.Progreso && Progreso.perk(A, 'perkKnockdown2'))) A.danoPuno = DANO_ESTILO.savate;
    else if (st === 'brawl') A.danoPuno = DANO_ESTILO.brawl;
    else if (st === 'elite') A.danoPuno = DANO_ESTILO.elite;
    else A.danoPuno = A.danoPuno || DANO_ESTILO.chump;
  };
  Golpes.danoConArma = function (A) { A.danoPuno = DANO_ESTILO.brawl; };
  Golpes.elegirSinArma = function (A) {
    const s = A.skillUnarmed || 0;
    let n;
    /* Corriendo (myStatus 'dash') y sin arma: melee_dash1, el gancho de
       abajo arriba, para cualquier nivel. Su daño no lo cambia
       changeUnarmedDamage (solo savate, brawl y elite; savate o el perk
       de dash dan 5,5): se queda el del ultimo estilo, 2 al empezar. */
    if (A.corriendo) { Golpes.danoSinArma(A, 'melee_dash1'); return 'unarmed_dash1'; }
    if (s >= 25) n = Math.random() < 1 / 3 ? 'unarmed_brawl_' + azar(4)
                   : Math.random() < 0.5 ? 'unarmed_savate_' + azar(5) : 'unarmed_elite_' + azar(5);
    else if (s >= 15) n = Math.random() < 0.5 ? 'unarmed_brawl_' + azar(4) : 'unarmed_savate_' + azar(5);
    else if (s >= 5) n = 'unarmed_brawl_' + azar(4);
    else n = 'unarmed_chump_' + azar(2);
    Golpes.danoSinArma(A, n);
    return n;
  };

  /* EL PUÑO SE PARA EN EL BLANCO. En el SWF el puño llega a 85-92 px
     (1,4-1,5 m) y en 2D pasa por delante del enemigo dibujado; en 3D le
     atraviesa el pecho. Asi que al lanzar se mira quien hay delante
     (en el rumbo, dentro de su radio a los lados) y el alcance del
     golpe se escala para que el puño acabe EN SU SUPERFICIE: el mismo
     golpe del SWF, mas corto. Sin nadie delante sale entero, al aire.
       tope = distancia al blanco - su radio - el grueso del puño
              (0,055) - la guardia de LA MANO QUE PEGA (0,16 la de delante,
              'shoot', que es la I del muñeco; 0,21 la de detras: anim.js).
              El puño va donde dice el SWF en el mundo: el torso que se
              inclina y avanza ya no lo adelanta (anim.js le quita a la mano
              lo que se mueve el torso).
     y se escala con lo que avanza esa mano EN SU CUADRO DE IMPACTO: asi el
     puño llega justo a la superficie en el instante del golpe. */
  Golpes.tope = function (A) {
    const G = global.Game;
    if (!G || !G.objetivos) return Infinity;
    const cx = Math.cos(A.rumbo), cz = Math.sin(A.rumbo);
    let mejor = Infinity;
    for (const o of G.objetivos) {
      if (!o.vivo || o.actor === A || o.actor.bando === A.bando) continue;
      const dx = o.x - A.x, dz = (o.z || 0) - (A.z || 0);
      const fr = dx * cx + dz * cz, la = Math.abs(dz * cx - dx * cz);
      if (fr > 0 && la < o.r + 0.2) mejor = Math.min(mejor, fr - o.r);
    }
    return mejor - 0.055;
  };

  /* LA DISTANCIA MINIMA PARA PEGAR SIN METERSE EN LA CARA DEL OTRO.
     La cabeza manda: ovalo de 0,333 de radio y 0,152 adelantado hacia
     donde mira (chars.js), y el que pega se inclina hacia delante lo que
     diga el golpe del SWF en su cuadro de impacto -su 'incl'-, que lleva
     la cabeza (a 1,055 sobre la pelvis) 1,055 x sen(incl) mas alla. Se
     toma la mayor de los golpes del juego, mas 5 cm de aire entre cabezas. */
  Golpes.distMinima = (() => {
    let incl = 0;
    const G = global.GOLPES_SWF || {};
    for (const k in G) {
      /* Solo los que se dan PARADO en el juego: ni los de carrera (dash, que
         se tiran hacia delante porque vienen corriendo) ni los de Mag, las
         abominaciones o el slam, que aqui no hay quien los de. */
      if (!/^(melee_(chump|basic|better|finish)|unarmed_(chump|brawl|savate|elite))/.test(k)) continue;
      for (const x of G[k].golpes) {
        const f = G[k].filas[Math.min(G[k].filas.length - 1, x[0] - 1)];
        if (f && f[3] > incl) incl = f[3];
      }
    }
    return 2 * Chars.CARA.rx + 2 * Chars.CABEZA_Z + 1.055 * Math.sin(incl) + 0.05;
  })();

  /* Lanzar el golpe elegido. Devuelve true si salio. */
  Golpes.lanzar = function (A) {
    const sin = A.arma && A.arma.id === 'puños';
    const n = sin ? Golpes.elegirSinArma(A) : Golpes.elegir(A);
    const ok = Anim.lanzar(A.anim, 'swf_' + n);
    if (ok && sin) {
      const a = Anim.ACCIONES['swf_' + n], imp = a.impactos[0];
      // manoD ('shoot', la de delante) la da la I del muñeco, con su guardia 0,05 atras
      const shoot = !imp || imp.tipo !== 'manoI';
      const f = imp ? a.swf.filas[Math.min(a.swf.filas.length - 1, Math.round(imp.t * 30))] : null;
      const izqM = A.mirando < 0 && f && f.length > 12;       // el otro par de manos (anim.js)
      const llega = f ? (shoot ? f[izqM ? 12 : 0] : f[izqM ? 14 : 4]) : a.alcMax;
      // mas el Z_MANO: la mano va 0,12 por delante del pecho ademas de su guardia
      const guardia = Anim.GUARDIA.alcance - (shoot ? 0.05 : 0) + Anim.Z_MANO;
      A.anim.escAlcance = llega > 0 ? U.clamp((Golpes.tope(A) - guardia) / llega, 0, 1) : 1;
    }
    return ok;
  };

  /* Cada paso: el reloj del combo corre mientras NO se golpea. */
  Golpes.paso = function (A, dt) {
    if (Anim.ocupado(A.anim)) A.golpeSuelto = 0;
    else A.golpeSuelto = (A.golpeSuelto || 0) + dt;
  };

  /* LA GUARDIA DEL SWF. Todas las armas blancas se sostienen igual
     (melee_front de MadnessGunDump: el arma a 19,2 grados en la mano,
     dibujada vertical) y en pantalla apuntan a 70,8 grados. Cada malla,
     con la muñeca a cero, apunta a otro angulo -medido de perfil en el
     juego-; la diferencia es su giro de guardia, y los golpes del SWF
     van sumados a el: asi en cada cuadro el arma apunta a donde apunta
     en el SWF. */
  const ANG_SWF = 70.8;
  const ANG_MALLA = { bate: 44.7, cuchillo: 31.5, megachette: 40.1, tubo: 40.1 };
  if (global.Weapons) {
    for (const id in ANG_MALLA) {
      const f = Weapons.CAT[id];
      if (f && f.agarre) f.agarre.giroGuardia = (ANG_MALLA[id] - ANG_SWF) * Math.PI / 180;
    }
  }

  Golpes.usa = function (f) {
    if (!global.GOLPES_SWF || !f || f.tipo !== 'melee') return false;
    return f.sinMalla ? !!global.GOLPES_SWF.unarmed_chump_1 : true;
  };

  global.Golpes = Golpes;
})(window);

