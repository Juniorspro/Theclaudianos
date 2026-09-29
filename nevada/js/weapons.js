/* =============================================================
   weapons.js -> El armero.

   En Madness el arma no es una estadistica, es un OBJETO que
   cambia de manos: se recoge del suelo, se le acaba la munición,
   se le arranca de las manos a un agente de un manotazo y se
   lanza a la cara del siguiente. Por eso aqui un arma es una
   ficha con numeros Y una malla, y las dos cosas viajan juntas.

   Las mallas se construyen una sola vez por modelo y se comparten:
   veinte grunts con pistola son veinte objetos apuntando a la
   misma geometria. Cada arma en mano cuesta UNA llamada de dibujo
   -no lleva contorno propio: a este tamaño la linea negra se come
   el arma entera, asi que el canto oscuro va horneado en el
   color-.
   ============================================================= */
(function (global) {
  'use strict';

  const W = {};

  /* =============================================================
     FICHAS

     dano          por impacto: el myDamage del SWF tal cual (t178382). Antes iban
                   multiplicados ~3 y todo el mundo caia de un golpe. El daño
                   final lo calcula Actor.danoSWF (fuerza, rango, END).
     cadencia      segundos entre disparos
     cargador      balas antes de recargar
     recarga       segundos
     disp          dispersion en radianes
     perdigones    balas por disparo (escopeta): myShots del SWF, 5 en las tres
     empuje        cuanto tira del cuerpo al impactar
     agarre        donde se pone la mano que empuña, en el EJE DE
                   LA PELEA -el mismo que usa anim.js-:
                     alcance  metros por delante del cuerpo
                     alto     altura sobre el hueso del tronco
                     sep      separacion lateral (0,365 = reposo)
                   si 'dos', la izquierda va en alcance2/alto2/sep2,
                   que caen sobre el cañon del arma porque la mano
                   que empuña se alinea con ese mismo eje
     ============================================================= */
  /* EL GIRO DE MUÑECA DE UN ARMA DE FUEGO.

     El eje sobre el que la mano envuelve lo que agarra esta a unos
     45 grados del de punteria -por eso el bate, que va inclinado
     esos mismos 45, queda bien cogido-. Una pistola no se puede
     poner en ese eje: su empuñadura es PERPENDICULAR al cañon, asi
     que la mano salia envolviendo el cañon, con los nudillos en fila
     horizontal por debajo.

     -1,45 radianes es lo que pone la fila de nudillos VERTICAL y del
     lado del cañon, con el pulgar arriba contra la corredera, que es
     como se coge una pistola. Sacado probando el rango entero de
     -1,75 a +1,4 y mirando cual lee: en positivo la mano sale
     girada al reves -los nudillos al lado contrario del cañon-, que
     es lo que se veia antes de medirlo.

     La MANO lleva este giro; el ARMA NO. El hueso del arma se lo
     deshace por la izquierda, asi que la punteria no se entera:
     medido, el cañon apunta a (0,992, 0,090, -0,085) con muñeca 0,
     con 0,7 y con 1,4. El mismo vector hasta el tercer decimal.

     La mano DE DELANTE de un arma larga no lo lleva: esa agarra el
     guardamanos, que si es una columna en el eje de punteria. */
  const MUÑ_PISTOLA = -1.45;

  /* LA MUNICION ES LA DEL ORIGINAL: 'cargador' es myAmmo -las balas de
     un cargador- y 'cargas' es startClips -los cargadores de repuesto,
     2 si el arma no dice otra cosa-. Asi lo cuenta el HUD del SWF
     (MadnessMenu.setWeaponIcon) y asi recarga: un cargador nuevo cada
     vez, y el que se saca se tira con lo que le quedase ("This dumps
     your current clip and all leftover ammo in it").

     'cat' es la CATEGORIA del original -myCat-, y no es decorado:
     es lo que pondera cuanto muerde cada arma la barra TAC.
     fusil x2, subfusil x1,2, pesada x0,5. Ver actor.js. */
  /* 'nombre' es el myName de cada arma en ItemGenerator del SWF, tal
     cual, desensamblado de storePopulator: 'Beretta 92', 'H&K MP5',
     'Colt Revolver'... El de las manos vacias es el de unarmedWeapon. */
  /* 'rango' es el myRange del arma en ItemGenerator (px del SWF, pasado
     a metros con la escala de los golpes, 0,214 m / 13,06 px):
       Unarmed 95  Bowie Knife 105  Baseball Bat 115  Iron Pipe 125
       Megachette 130
     Con el se para la IA antes de pegar: intendedX = blanco -/+
     (myRange - 40) x azar(0,5..1) (MadnessCharacter, ataque). */
  /* Las de fuego llevan ademas, de ItemGenerator.createWeapon tal cual:
       rof       myROF, cuadros entre disparos (Beretta 18, Colt 20,
                 MP5 6, SPAS/97k 40, AR-15 6). Aqui la espera es
                 'cadencia' en segundos; rof solo sirve para escalarla
                 con los perks (Progreso.kROF) y para el smgAimTimer.
       rangoSWF  myRange en px, el rango EFECTIVO (Beretta 110, Colt
                 195, Snub 85, MP5 140, escopetas 160, AR-15 200), a
                 metros con PX (Progreso.rangoPx y Combat.disparar).
       bomba     havePump: las dos escopetas (los perks de ROF de
                 escopeta son solo para las de bomba). */
  const PX = 0.214 / 13.06;
  W.PX = PX;
  W.CAT = {
    /* --- Cuerpo a cuerpo --- */
    puños: {
      nombre: 'Unarmed', rango: 95 * PX, tipo: 'melee', cat: 'melee', dano: 2, cadencia: 0.30,
      alcance: 1.05, empuje: 2.4, aturde: 0.18, sinMalla: true
    },
    cuchillo: {
      nombre: 'Bowie Knife', rango: 105 * PX, tipo: 'melee', cat: 'melee', dano: 5, cadencia: 0.34, salud: 30,
      alcance: 1.11, empuje: 1.8, aturde: 0.10, corta: true, hoja: true,
      pose: [-0.55, 0, 0.26],
      /* Su cadena de golpes y donde tiene la PUNTA dentro de su
         malla: la zona de impacto sale de ahi, no de un numero
         suelto, asi que la caja va donde de verdad esta el filo. */
      golpes: ['cuchilloA', 'cuchilloB', 'cuchilloA'],
      /* Se lleva en UNA mano y en PUÑO, no envuelta: en la hoja de
         referencia el agente sujeta el cuchillo con la mano cerrada,
         que aqui es la pose de reposo. La otra mano queda libre. */
      agarre: { alcance: 0.30, alto: 0.66, sep: 0.300, poseReposo: true }
    },
    bate: {
      nombre: 'Baseball Bat', rango: 115 * PX, tipo: 'melee', cat: 'melee', dano: 9, cadencia: 0.52, salud: 20,
      /* el alcance sube con el barril: si la malla llega mas lejos que
         la zona de golpe, el bate atraviesa al enemigo sin tocarlo */
      alcance: 1.82, empuje: 6.5, aturde: 0.55, pose: [-0.78, 0, 0.20],
      golpes: ['bateA', 'bateA', 'bateB'], punta: 0.760,
      /* Se coge con las DOS manos y no de la misma forma: la de
         delante envuelve el mango -pose de agarre- y la de atras va
         cerrada debajo, en puño. Es como se coge un bate de verdad y
         es lo que enseña la hoja de referencia de la serie. */
      /* LAS DOS MANOS SE TIENEN QUE VER, cada una con su contorno.

         Estaban a 0,10 una de otra con manos de 0,30: se solapaban
         casi enteras y se leian como un solo bulto. Medido sobre la
         hoja de referencia, la separacion entre las dos manos es
         una vez el tamaño de una mano -se tocan, no se comen-, o sea
         0,225 m con la mano ya a su escala buena.

         Estos tres numeros no estan puestos a ojo: salen de coger el
         punto del EJE DEL BATE que queda 0,225 por detras del agarre
         delantero, deshacerle los dos desplazamientos con los que
         cuelga el arma -al centro de la palma y al fondo- y pasarlo
         a (alcance, alto, sep) invirtiendo aHueso(). */
      agarre: { alcance: 0.28, alto: 0.640, sep: 0.290,
                dos: true, reposoAtras: true,
                alcance2: 0.167, alto2: 0.527, sep2: 0.296 }
    },
    /* EL IRON PIPE -'pipe' en el SWF-. Sus numeros salen de ItemGenerator
       comparados con los del bate, que ya estaba afinado:
         pipe  daño 6  alcance 125  contundente  una mano
         bat   daño 9  alcance 115
       Una mano, como en el original -twoHand False-, asi que lleva el
       agarre y los golpes del megachette, que es la otra arma larga de
       una mano; pero no corta. */
    tubo: {
      nombre: 'Iron Pipe', rango: 125 * PX, tipo: 'melee', cat: 'melee', dano: 6, cadencia: 0.52, salud: 20,
      alcance: 1.76, empuje: 4.3, aturde: 0.37, pose: [-0.70, 0, 0.00],
      golpes: ['megachetteA', 'megachetteB', 'megachetteA'],
      agarre: { alcance: 0.30, alto: 0.700, sep: 0.300, poseReposo: true }
    },
    megachette: {
      nombre: 'Megachette', rango: 130 * PX, tipo: 'melee', cat: 'melee', dano: 9, cadencia: 0.58, salud: 50,
      /* Hoja de 0,86 m sobre 1,23 de arma: llega mucho mas lejos que
         el machete de antes, y pesa, asi que va mas lento. */
      alcance: 1.22, empuje: 4.2, aturde: 0.30, corta: true, decapita: true,
      /* El tercer numero va a CERO a proposito. Con 0,24 la hoja
         salia girada sobre su eje largo y el arma entera se metia
         hacia el fondo: medido, 0,53 de componente hacia la camara,
         o sea escorzada casi a la mitad, y por eso parecia un palo
         corto en vez de un cuchillon. A cero, la cara de la hoja
         mira a camara -0,98- y el eje largo se queda en el plano. */
      hoja: true, pose: [-0.70, 0, 0.00],
      golpes: ['megachetteA', 'megachetteB', 'megachetteA'],
      /* Se sujeta con UNA mano y con el puño cerrado, como el
         cuchillo: en la hoja de referencia el muñeco lo lleva
         agarrado del mango con la mano cerrada. */
      agarre: { alcance: 0.30, alto: 0.700, sep: 0.300, poseReposo: true }
    },

    /* --- Fuego --- */
    pistola: {
      nombre: 'Beretta 92', tipo: 'fuego', cat: 'pistol', dano: 7, cadencia: 0.16,
      rof: 18, rangoSWF: 110,
      cargador: 18, cargas: 2, recarga: 1.05, disp: 0.030,
      empuje: 1.4, alcance: 32, auto: false, retro: 0.55, vel: 95,
      agarre: { alcance: 0.58, alto: 0.630, sep: 0.175, muñeca: MUÑ_PISTOLA }
    },
    magnum: {
      nombre: 'Colt Revolver', tipo: 'fuego', cat: 'revolver', dano: 12, cadencia: 0.46,
      rof: 20, rangoSWF: 195,
      cargador: 6, cargas: 2, recarga: 1.70, disp: 0.020,
      empuje: 6.0, alcance: 40, auto: false, retro: 1.25, atraviesa: 1, vel: 118,
      agarre: { alcance: 0.60, alto: 0.650, sep: 0.175, muñeca: MUÑ_PISTOLA }
    },
    /* El Snub Colt -'357snub'-, el .357 corto. Contra el largo, en ItemGenerator:
         357snub  daño 10  dispersion 10  alcance  85
         357long  daño 12  dispersion  2  alcance 195
       Pega casi igual y abre mucho mas: la dispersion se lleva con la
       misma regla que la 9 mm -dispersion 6 del SWF = 0,030-. */
    revolver: {
      nombre: 'Snub Colt', tipo: 'fuego', cat: 'revolver', dano: 10, cadencia: 0.46,
      rof: 20, rangoSWF: 85,
      cargador: 6, cargas: 3, recarga: 1.70, disp: 0.050,
      empuje: 5.0, alcance: 17, auto: false, retro: 1.10, atraviesa: 1, vel: 118,
      agarre: { alcance: 0.60, alto: 0.650, sep: 0.175, muñeca: MUÑ_PISTOLA }
    },
    subfusil: {
      nombre: 'H&K MP5', tipo: 'fuego', cat: 'smg', dano: 8, cadencia: 0.072,
      rof: 6, rangoSWF: 140,
      cargador: 30, cargas: 2, recarga: 1.35, disp: 0.058,
      empuje: 0.9, alcance: 28, auto: true, retro: 0.34, vel: 100,
      agarre: { alcance: 0.40, alto: 0.615, sep: 0.215, muñeca: MUÑ_PISTOLA,
                dos: true, canon: true,
                alcance2: 0.645, alto2: 0.632, sep2: 0.238 }
    },
    escopeta: {
      nombre: 'SPAS-12', tipo: 'fuego', cat: 'shotgun', dano: 7, cadencia: 0.78,
      rof: 40, rangoSWF: 160, bomba: true,
      cargador: 8, cargas: 16, recarga: 2.10, disp: 0.080, perdigones: 5,
      empuje: 8.5, alcance: 14, auto: false, retro: 1.60, vel: 82,
      agarre: { alcance: 0.38, alto: 0.600, sep: 0.220, muñeca: MUÑ_PISTOLA,
                dos: true, canon: true,
                alcance2: 0.775, alto2: 0.614, sep2: 0.242 }
    },
    /* LA APERTURA DE LAS ESCOPETAS. En ItemGenerator es mySpread 9: el
       bulletRotation sale uniforme entre -9 y +9 grados, pero en el
       plano de la PANTALLA, o sea sobre todo arriba y abajo, contra un
       cuerpo de 1,8 m de alto. Aqui el abanico se abre en planta,
       contra un cuerpo de medio metro de ancho: con los mismos 9
       grados -o con los 6,6 de antes, y repartidos al azar- a cinco
       metros casi todo el plomo pasaba al lado y parecia que salia a
       cualquier parte. 0,08 rad (4,6 grados) de semiapertura, en un
       abanico repartido (Combat.disparar): a tres metros entra todo, a
       cinco mas de la mitad, que es lo que hace la escopeta del SWF.
       La Norinco 97k. En ItemGenerator es la SPAS-12 con OTRO cargador: mismo
       daño, cadencia, dispersion, alcance y cinco perdigones; lleva 5
       cartuchos contra 8, y 3 cargadores contra 16. */
    escopeta97: {
      nombre: 'Norinco 97k', tipo: 'fuego', cat: 'shotgun', dano: 7, cadencia: 0.78,
      rof: 40, rangoSWF: 160, bomba: true,
      cargador: 5, cargas: 3, recarga: 1.80, disp: 0.080, perdigones: 5,
      empuje: 8.5, alcance: 14, auto: false, retro: 1.60, vel: 82,
      agarre: { alcance: 0.38, alto: 0.600, sep: 0.220, muñeca: MUÑ_PISTOLA,
                dos: true, canon: true, sep2: 0.242 }
    },
    fusil: {
      nombre: 'AR-15', tipo: 'fuego', cat: 'rifle', dano: 11, cadencia: 0.105,
      rof: 6, rangoSWF: 200,
      cargador: 30, cargas: 2, recarga: 1.60, disp: 0.032,
      empuje: 1.8, alcance: 44, auto: true, retro: 0.62, atraviesa: 1, vel: 160,
      agarre: { alcance: 0.40, alto: 0.615, sep: 0.215, muñeca: MUÑ_PISTOLA,
                dos: true, canon: true,
                alcance2: 0.810, alto2: 0.630, sep2: 0.240 }
    }
  };

  /* =============================================================
     MALLAS
     Una por modelo, compartida. Todas se construyen mirando a +Z
     (el personaje apunta hacia su propio frente) con la empuñadura
     en el origen: asi colgarlas del hueso de la mano es poner la
     malla en el hueso y nada mas.
     ============================================================= */
  const _geos = Object.create(null);

  /* =============================================================
     LAS ARMAS DEL SWF, EN 3D

     Salen de los sprites del juego original -modelos_swf.js, generado
     por tools/swf_modelos-. Cada zona de color que el dibujo separa
     con trazo negro es una PIEZA: su contorno, liso, se extruye con un
     bisel redondeado y con el grosor que pide su radio inscrito, asi
     que un cañon fino sale redondo y un cajon ancho sale con caras
     planas y cantos suaves. Nada de columnas de cajas.

     El trazo del dibujo no se pierde: cada pieza lleva un RESPALDO
     -la pieza ensanchada lo que mide el trazo- que se pinta con el
     material de contorno. Entre dos piezas queda un surco negro, que
     es la linea del SWF, y por fuera el perfil de siempre.

     Las mallas estan en METROS y con el origen en el centro del puño
     de la postura del SWF (sprite 5271): el arma va donde el original
     la sujeta, no donde se le ocurrio a nadie.
     ============================================================= */
  const SWF = global.MODELOS_SWF || {};
  const _v2 = (a) => {
    const r = [];
    for (let i = 0; i < a.length; i += 2) r.push(new THREE.Vector2(a[i], a[i + 1]));
    return r;
  };

  /* UNA PIEZA. El contorno esta en (z, y) de la malla y se extruye por
     X, que es el grosor. Cada vertice trae SU bisel:

       - en el borde exterior del arma, un bisel redondeado: el volumen;
       - en las juntas con otra pieza, CERO: las dos piezas quedan al ras
         y pegadas, como en el dibujo, con la linea pintada encima. Con
         bisel en todo el contorno cada pieza se veia como una almohadita
         suelta.

     El extrusor es propio porque el de three solo sabe un bisel para
     todo el contorno. Normales suaves salvo en quiebres de mas de 40
     grados: el bisel sale redondo y la cara plana sigue plana. */
  const PASOS_ARMA = 2;       // pasos del bisel de un arma; una mano lleva los suyos (i.pasos)
  const APARTE = 0.0012;      // cuanto se mete hacia dentro el muestreo de las paredes
  function lazo(a, bs) {
    const L = [];
    for (let i = 0, k = 0; i < a.length; i += 2, k++) L.push({ z: a[i], y: a[i + 1], b: bs ? bs[k] : 0 });
    let s = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i], q = L[(i + 1) % L.length];
      s += p.z * q.y - q.z * p.y;
    }
    return { L, ccw: s > 0 };
  }
  /* Hacia donde se mete cada vertice al hacer el bisel (multiplicado por
     su bisel da el desplazamiento de la tapa).

       - Los dos lados son BORDE exterior: inglete acotado, lo normal.
       - Uno es borde y el otro es JUNTA con otra pieza: el vertice se
         desliza A LO LARGO DE LA JUNTA hasta quedar a un bisel del borde.
         En inglete se metia en diagonal, la tapa se despegaba de la junta
         y asomaba el respaldo negro en forma de V.
       - Los dos son junta: no se mueve. */
  function normales(L) {
    const n = L.length, N = [];
    for (let i = 0; i < n; i++) {
      const a = L[(i - 1 + n) % n], p = L[i], c = L[(i + 1) % n];
      let z1 = p.z - a.z, y1 = p.y - a.y, z2 = c.z - p.z, y2 = c.y - p.y;
      const l1 = Math.hypot(z1, y1) || 1, l2 = Math.hypot(z2, y2) || 1;
      z1 /= l1; y1 /= l1; z2 /= l2; y2 /= l2;
      const n1z = -y1, n1y = z1, n2z = -y2, n2y = z2;      // normales interiores
      const b1 = a.b > 0 && p.b > 0, b2 = p.b > 0 && c.b > 0;  // lado de borde?
      if (b1 && b2) {
        let mz = n1z + n2z, my = n1y + n2y;
        const ml = Math.hypot(mz, my) || 1; mz /= ml; my /= ml;
        const k = Math.min(2.5, 1 / Math.max(0.35, mz * n1z + my * n1y));
        N.push([mz * k, my * k]);
      } else if (b1 || b2) {
        // d: la junta, alejandose del vertice; nb: normal del lado de borde
        const dz = b1 ? z2 : -z1, dy = b1 ? y2 : -y1;
        const nbz = b1 ? n1z : n2z, nby = b1 ? n1y : n2y;
        const k = Math.min(3, 1 / Math.max(0.2, dz * nbz + dy * nby));
        N.push([dz * k, dy * k]);
      } else {
        N.push([0, 0]);
      }
    }
    return N;
  }

  // la tapa encogida: ni se da la vuelta ni se cruza consigo misma
  function tapaValida(lazos, Ns) {
    const P = lazos.map((L, k) => L.map((p, i) => [p.z + Ns[k][i][0] * p.b, p.y + Ns[k][i][1] * p.b]));
    const area = (q) => { let s = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; s += a[0] * b[1] - b[0] * a[1]; } return s; };
    const area0 = (L) => { let s = 0; for (let i = 0; i < L.length; i++) { const a = L[i], b = L[(i + 1) % L.length]; s += a.z * b.y - b.z * a.y; } return s; };
    for (let k = 0; k < P.length; k++) if (area(P[k]) * area0(lazos[k]) <= 0) return false;
    const E = [];
    P.forEach((q, k) => q.forEach((a, i) => E.push([a, q[(i + 1) % q.length], k, i, q.length])));
    const cruza = (a, b, c, d) => {
      const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
      const d1 = o(a, b, c), d2 = o(a, b, d), d3 = o(c, d, a), d4 = o(c, d, b);
      return d1 * d2 < 0 && d3 * d4 < 0;
    };
    for (let x = 0; x < E.length; x++) {
      for (let y = x + 1; y < E.length; y++) {
        const e = E[x], f = E[y];
        if (e[2] === f[2] && (Math.abs(e[3] - f[3]) <= 1 || Math.abs(e[3] - f[3]) === e[4] - 1)) continue;
        if (cruza(e[0], e[1], f[0], f[1])) return false;
      }
    }
    return true;
  }

  function extruir(B, o, ob, hs, hbs, T, hex, uv, pasos, lente) {
    const h = T * 0.5;
    const PASOS = pasos || PASOS_ARMA;
    const ext = lazo(o, ob);
    if (!ext.ccw) ext.L.reverse();
    const lazos = [ext.L];
    (hs || []).forEach((q, k) => {
      const l = lazo(q, hbs ? hbs[k] : null);
      if (l.ccw) l.L.reverse();           // agujeros horarios
      lazos.push(l.L);
    });
    /* LA TAPA TIENE QUE SER UN POLIGONO VALIDO. En una pieza en anillo
       fino -el marco de la mira, los aros de la culata- el borde de fuera
       se encoge y el del agujero crece: si se cruzan, el triangulador
       tapa el agujero. Se comprueba antes y, si pasa, el bisel de esa
       pieza se reduce a la mitad hasta que la tapa sea valida. */
    const Ns = lazos.map(normales);
    const base = lazos.map((L) => L.map((p) => p.b));
    for (let esc = 1; ; esc *= 0.5) {
      if (esc < 0.1) esc = 0;
      lazos.forEach((L, k) => L.forEach((p, i) => { p.b = base[k][i] * esc; }));
      if (esc === 0 || tapaValida(lazos, Ns)) break;
    }
    const tris = [];
    const tri = (a, b, c, ex, ey, ez) => {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * nx + ny * ny + nz * nz < 1e-16) return;
      if (nx * ex + ny * ey + nz * ez < 0) tris.push(a, c, b); else tris.push(a, b, c);
    };
    const tapa = [];
    lazos.forEach((L, li) => {
      const N = Ns[li], n = L.length;
      // anillos de la tapa delantera a la trasera
      const anillos = [];
      // cada vertice lleva, ademas, DONDE mira el dibujo
      /* EL BISEL EN LENTE (manos): hacia dentro entra lo que cabe en
         cada vertice (b), pero en profundidad baja siempre hasta el medio
         del grueso. Asi una parte estrecha -un pulgar- sale redonda y no
         una caja con el canto limado. En una junta (b 0) no baja nada. */
      const bzDe = (b) => lente ? (b > 0 ? h * Math.min(1, b / (0.25 * h)) : 0) : b;
      const anillo = (f, lado, dentro) => L.map((p, i) => {
        const b = p.b, x = lado * (h - bzDe(b) * dentro);
        // cada anillo mira el dibujo en SU sitio -si todo el bisel mirase el
        // borde de la tapa, el dibujo se comprimiria ahi y torceria las
        // lineas-; solo la pared del borde se aparta un pelo del antialias.
        // En una junta (bisel 0) no se aparta: mira la linea, que es negra.
        const m = b > 0 ? Math.max(b * f, APARTE) : 0;
        return [x, p.y + N[i][1] * b * f, p.z + N[i][0] * b * f,
                p.z + N[i][0] * m, p.y + N[i][1] * m];
      });
      for (let k = 0; k <= PASOS; k++) {
        const th = k / PASOS * Math.PI / 2;
        anillos.push(anillo(1 - Math.sin(th), 1, 1 - Math.cos(th)));
      }
      for (let k = PASOS; k >= 0; k--) {
        const th = k / PASOS * Math.PI / 2;
        anillos.push(anillo(1 - Math.sin(th), -1, 1 - Math.cos(th)));
      }
      for (let r = 0; r < anillos.length - 1; r++) {
        const A = anillos[r], C = anillos[r + 1];
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          // hacia fuera: contra la normal interior del lado
          const dz = L[j].z - L[i].z, dy = L[j].y - L[i].y;
          const ey = -dz, ez = dy;
          tri(A[i], A[j], C[j], 0, ey, ez);
          tri(A[i], C[j], C[i], 0, ey, ez);
        }
      }
      tapa.push(anillos[0]);
    });
    // las dos tapas, triangulas sobre el anillo de la tapa
    const v2 = tapa.map((A) => A.map((p) => new THREE.Vector2(p[2], p[1])));
    const caras = THREE.ShapeUtils.triangulateShape(v2[0], v2.slice(1));
    const todos = [].concat(...tapa);
    for (const f of caras) {
      const a = todos[f[0]], b = todos[f[1]], c = todos[f[2]];
      tri(a, b, c, 1, 0, 0);
      tri([-a[0], a[1], a[2], a[3], a[4]], [-b[0], b[1], b[2], b[3], b[4]],
          [-c[0], c[1], c[2], c[3], c[4]], -1, 0, 0);
    }
    solido(B, tris, hex, uv);
  }

  function solido(B, tris, hex, uv) {
    const n = tris.length / 3;
    const X = new Float32Array(n * 9);
    for (let f = 0; f < n; f++) {
      for (let c = 0; c < 3; c++) {
        const p = tris[f * 3 + c];
        X[f * 9 + c * 3] = p[0]; X[f * 9 + c * 3 + 1] = p[1]; X[f * 9 + c * 3 + 2] = p[2];
      }
    }
    const fn = new Float32Array(n * 3);
    const clave = (i) => Math.round(X[i] * 2e4) + ',' + Math.round(X[i + 1] * 2e4) +
                         ',' + Math.round(X[i + 2] * 2e4);
    const junto = new Map();
    for (let f = 0; f < n; f++) {
      const o0 = f * 9;
      const ax = X[o0 + 3] - X[o0], ay = X[o0 + 4] - X[o0 + 1], az = X[o0 + 5] - X[o0 + 2];
      const bx = X[o0 + 6] - X[o0], by = X[o0 + 7] - X[o0 + 1], bz = X[o0 + 8] - X[o0 + 2];
      fn[f * 3] = ay * bz - az * by; fn[f * 3 + 1] = az * bx - ax * bz; fn[f * 3 + 2] = ax * by - ay * bx;
      for (let c = 0; c < 3; c++) {
        const k = clave(o0 + c * 3);
        let l = junto.get(k); if (!l) junto.set(k, l = []);
        l.push(f);
      }
    }
    const col = B._rgb(hex, 1);
    const COS = 0.766;
    for (let f = 0; f < n; f++) {
      const o0 = f * 9;
      const nx = fn[f * 3], ny = fn[f * 3 + 1], nz = fn[f * 3 + 2];
      const ln = Math.hypot(nx, ny, nz);
      if (ln < 1e-12) continue;
      const cc = col;
      const idx = [];
      for (let c = 0; c < 3; c++) {
        const p = o0 + c * 3;
        let sx = 0, sy = 0, sz = 0;
        for (const g of junto.get(clave(p))) {
          const gx = fn[g * 3], gy = fn[g * 3 + 1], gz = fn[g * 3 + 2];
          const gl = Math.hypot(gx, gy, gz);
          if (gl < 1e-12 || (gx * nx + gy * ny + gz * nz) / (gl * ln) < COS) continue;
          sx += gx; sy += gy; sz += gz;
        }
        const sl = Math.hypot(sx, sy, sz) || 1;
        idx.push(B._vert(X[p], X[p + 1], X[p + 2], sx / sl, sy / sl, sz / sl,
                         cc[0], cc[1], cc[2]));
        const q = tris[f * 3 + c];
        if (B.uv) B.uv.push(uv ? (q[3] - uv.z0) * uv.R / uv.w : 0,
                            uv ? 1 - (uv.y1 - q[4]) * uv.R / uv.h : 0);
      }
      B.idx.push(idx[0], idx[1], idx[2]);
    }
  }

  /* PIEZA TORNEADA (G16): el bate es redondo. Cada entrada del perfil es
     [z, centro en y, radio]; se gira alrededor del eje del arma. El
     dibujo se proyecta de costado, igual que en las piezas extruidas, asi
     que de frente se ve el SWF tal cual y las vueltas de cinta envuelven
     el mango. */
  const LADOS = 28;
  // interpolado del perfil en z
  function enPerfil(P, z) {
    for (let k = 0; k < P.length - 1; k++) {
      const a0 = P[k], a1 = P[k + 1];
      if (z >= a0[0] && z <= a1[0]) {
        const f = (z - a0[0]) / Math.max(a1[0] - a0[0], 1e-9);
        return [z, a0[1] + f * (a1[1] - a0[1]), a0[2] + f * (a1[2] - a0[2])];
      }
    }
    return P[z < P[0][0] ? 0 : P.length - 1].slice();
  }
  function tornear(B, perfil0, extra, hex, uv) {
    /* LA PUNTA ES UNA CUPULA DE VERDAD: media vez el radio de hondo. Se
       corta el perfil donde empieza y la cupula sale tangente al barril.
       Encajada en el ultimo tramo salia de 1,5 cm, casi plana, y se leia
       como un disco pegado con su borde. */
    const fin = perfil0[perfil0.length - 1];
    const rFin = enPerfil(perfil0, fin[0] - 0.5 * (fin[2] + extra))[2] + extra;
    const d = 0.5 * rFin, zc = fin[0] - d;
    const perfil = perfil0.filter((q) => q[0] < zc - 1e-4).concat([enPerfil(perfil0, zc)]);
    /* Y el dibujo, en la punta, se mira en el barril: en el SWF la punta
       tiene su chaflan con trazo negro y, mirado ahi, salia una raya en la
       base de la cupula. El barril es liso, asi que no se nota. */
    const uzMax = zc - 0.02;
    const n = perfil.length, tris = [];
    const pto = (p, r, a, uy) => {
      const x = r * Math.sin(a), y = p[1] + r * Math.cos(a);
      return [x, y, p[0], Math.min(p[0], uzMax), p[1] + uy * Math.cos(a)];
    };
    const anillos = [];
    for (let k = 0; k < n; k++) {
      const p = perfil[k], r = p[2] + extra, A = [];
      for (let s = 0; s < LADOS; s++) A.push(pto(p, r, s / LADOS * Math.PI * 2, Math.max(0, r - APARTE)));
      anillos.push(A);
    }
    const push = (a, b, c) => tris.push(a, b, c);
    for (let k = 0; k < n - 1; k++) {
      for (let s = 0; s < LADOS; s++) {
        const s2 = (s + 1) % LADOS;
        const a = anillos[k][s], b = anillos[k][s2], c = anillos[k + 1][s2], d2 = anillos[k + 1][s];
        push(a, c, b); push(a, d2, c);
      }
    }
    // el pomo: tapa plana, como en el dibujo
    {
      const p = perfil[0], cen = [0, p[1], p[0], Math.min(p[0], uzMax), p[1]];
      for (let s = 0; s < LADOS; s++) push(cen, anillos[0][s], anillos[0][(s + 1) % LADOS]);
    }
    // la cupula, tangente al barril
    {
      const p = perfil[n - 1], r0 = p[2] + extra, PASOS_C = 6;
      let prev = anillos[n - 1];
      for (let k = 1; k <= PASOS_C; k++) {
        const f = k / PASOS_C * Math.PI / 2;
        const rr = r0 * Math.cos(f), q = [zc + d * Math.sin(f), p[1]];
        const A = [];
        for (let s = 0; s < LADOS; s++) A.push(pto(q, rr, s / LADOS * Math.PI * 2, 0.5 * rr));
        for (let s = 0; s < LADOS; s++) {
          const s2 = (s + 1) % LADOS;
          if (k < PASOS_C) { push(prev[s], A[s2], prev[s2]); push(prev[s], A[s], A[s2]); }
          else push(prev[s], A[s], prev[s2]);
        }
        prev = A;
      }
    }
    solido(B, tris, hex, uv);
  }

  /* LA BOCA DEL CAÑON (G15): el agujero, del tamaño que da el CALIBRE.

     El diametro sale del calibre real en proporcion a la pieza real que
     forma la cara de la punta, y esa pieza se mide en el modelo: asi el
     agujero guarda con el cañon dibujado la misma relacion que en el arma
     de verdad, sea cual sea la escala del dibujo.

       arma        calibre            pieza de la boca (real)        agujero/pieza
       9 mm        9 mm               cañon de la Beretta 92, 14 mm      0,64
       magnum      .357 (9,1 mm)      cañon + guardamontes, 30 mm alto   0,30
       .357 corto  .357 (9,1 mm)      cañon + guardamontes, 30 mm        0,30
       subfusil    9 mm               cañon del MP5, 16 mm               0,56
       escopeta    calibre 12, 18,5   anillo de la boca, 30 mm           0,62
       97K         calibre 12, 18,5   cañon liso, 22 mm                  0,84
       fusil       5,56 mm            apagallamas A2, 22 mm              0,25

     Va centrado en el eje de disparo del SWF -myShootPoint-, no en el
     centro de la cara: en los revolveres la cara incluye el guardamontes
     de debajo y el agujero va arriba. */
  const CALIBRE = {
    pistola: [9, 14], magnum: [9.1, 30], revolver: [9.1, 30], subfusil: [9, 16],
    escopeta: [18.5, 30], escopeta97: [18.5, 22], fusil: [5.56, 22]
  };
  function disco(tris, y, z, r0, r1, sg) {
    for (let s = 0; s < 32; s++) {
      const a0 = s / 32 * Math.PI * 2, a1 = (s + 1) / 32 * Math.PI * 2;
      const p0 = [r0 * Math.sin(a0), y + r0 * Math.cos(a0), z, 0, 0], p1 = [r0 * Math.sin(a1), y + r0 * Math.cos(a1), z, 0, 0];
      const q0 = [r1 * Math.sin(a0), y + r1 * Math.cos(a0), z, 0, 0], q1 = [r1 * Math.sin(a1), y + r1 * Math.cos(a1), z, 0, 0];
      if (r0 === 0) tris.push(p0, q1, q0); else tris.push(p0, q1, q0, p0, p1, q1);
    }
  }
  function boca(B, D, id) {
    const c = D.i.canon, bo = D.i.boca, cal = CALIBRE[id];
    if (!c || !bo || !cal) return;
    const [zf, yc, hh, T] = c;
    const b = Math.min(0.35 * T, 0.5 * hh, 0.015);
    // radio por calibre, y nunca fuera de la cara plana
    const r = Math.min(hh * cal[0] / cal[1], hh - b, T / 2 - b) * 0.98;
    const y = Math.max(yc - hh + b + r, Math.min(yc + hh - b - r, bo[1]));
    /* La cara de verdad es el vertice mas adelantado de las piezas a esa
       altura: el contorno final se ensancha un poco al solaparse con la
       vecina, y con el dato medido el disco quedaba 1-2 mm DENTRO del
       cañon, tapado. */
    let zc = zf;
    for (const p of D.p) {
      for (let k = 0; k < p.o.length; k += 2) {
        if (Math.abs(p.o[k + 1] - y) < hh && p.o[k] > zc - 0.02) zc = Math.max(zc, p.o[k]);
      }
    }
    const agujero = [], corona = [];
    disco(agujero, y, zc + 0.0006, 0, r);
    // la corona: una arista de acero apenas mas clara que el cañon
    disco(corona, y, zc + 0.0004, r, r * 1.14);
    solido(B, agujero, 0x040404, null);
    solido(B, corona, 0x404044, null);
  }

  /* El ARO de una pieza de mano (G26): el trazo de fuera del SWF, plano,
     sobre la cara de delante y la de atras. De frente es el mismo trazo;
     de lado es la linea donde acaba la cara y empieza el costado. */
  const ARO_APARTE = 0.0012;
  function aros(B, lista, T) {
    const x0 = T * 0.5 + ARO_APARTE;
    const c = B._rgb(0x0a0a0a, 1);
    for (const [o, hs] of lista) {
      const pts = (q) => { const r = []; for (let i = 0; i < q.length; i += 2) r.push(new THREE.Vector2(q[i], q[i + 1])); return r; };
      let ex = pts(o); const hu = hs.map(pts);
      if (THREE.ShapeUtils.isClockWise(ex)) ex = ex.reverse();
      hu.forEach((h, k) => { if (!THREE.ShapeUtils.isClockWise(h)) hu[k] = h.reverse(); });
      const caras = THREE.ShapeUtils.triangulateShape(ex, hu);
      const todos = ex.concat(...hu);
      for (const lado of [1, -1]) {
        const idx = todos.map((v) => {
          const k = B._vert(lado * x0, v.y, v.x, lado, 0, 0, c[0], c[1], c[2], U.LUZ_PLANA);
          if (B.uv) B.uv.push(0, 0);
          return k;
        });
        for (const f of caras) {
          // hacia +x (o -x): con (z, y) antihorario visto desde +x, el
          // orden de la tapa es el de ShapeUtils al reves
          if (lado > 0) B.idx.push(idx[f[0]], idx[f[2]], idx[f[1]]);
          else B.idx.push(idx[f[0]], idx[f[1]], idx[f[2]]);
        }
      }
    }
  }

  /* Una pieza del SWF modelada por tools/swf_modelos/modelar.py -un arma
     o una mano-, sin nada propio de arma: piezas y respaldos. */
  function construirModelo(D, tinta) {
    const pasos = D.i && D.i.pasos, lente = !!(D.i && D.i.lente);
    const B = tinta ? U.builder() : U.builder({ uv: true });
    if (tinta) {
      for (const p of D.t) extruir(B, p.o, p.ob || null, p.h, p.hb || null, p.T, 0x000000, null, pasos, lente);
    } else {
      for (const p of D.p) {
        if (p.c !== undefined) extruir(B, p.o, null, p.h, null, p.T, p.c, null, pasos, lente);
        else extruir(B, p.o, p.ob, p.h, p.hb, p.T, 0xffffff, D.x, pasos, lente);
        if (p.aro) aros(B, p.aro, p.T);
      }
    }
    return B.build();
  }
  W.construirModelo = construirModelo;

  /* 'parte' es una pieza que se mueve sola -la corredera, el tambor, la
     bomba, el cargador-: cada una es su propio modelo, hecho desde SU
     sprite del SWF (tools/swf_modelos/partes.py), y el arma sin 'parte'
     es el CUERPO, que trae dibujado lo que las piezas tapan. */
  const modeloDe = (id, parte) => parte ? SWF[id].partes[parte] : SWF[id];
  function construirSWF(id, tinta, parte) {
    const D = modeloDe(id, parte);
    if (tinta) {
      const B = U.builder();
      if (D.r) {
        // el casco del torno: hasta el borde de la silueta y un pelo mas
        const p = D.r.p.map((q) => [q[0], q[1], q[2]]);
        p[0] = [p[0][0] - 0.004, p[0][1], p[0][2]];
        p[p.length - 1] = [p[p.length - 1][0] + 0.004, p[p.length - 1][1], p[p.length - 1][2]];
        tornear(B, p, 0.004, 0x000000, null);
      } else {
        for (const p of D.t) extruir(B, p.o, null, p.h, null, p.T, 0x000000, null);
      }
      return B.build();
    }
    // el color lo pone el dibujo: blanco por vertice y la textura encima;
    // los trazos sueltos van negros y no miran la textura
    const B = U.builder({ uv: true });
    if (D.r) {
      /* El color va por dentro del trazo exterior: radio menos el trazo y
         los dos extremos recortados lo mismo. Recortado DE VERDAD -fuera
         lo que queda de mas e interpolado el borde-: moviendo solo el
         ultimo punto, los de la punta quedaban por delante de el, el
         perfil se doblaba y la punta salia vuelta hacia dentro. */
      const wo = D.r.wo, P0 = D.r.p;
      const za = P0[0][0] + wo, zb = P0[P0.length - 1][0] - wo;
      const en = (z) => {
        for (let k = 0; k < P0.length - 1; k++) {
          const a0 = P0[k], a1 = P0[k + 1];
          if (z >= a0[0] && z <= a1[0]) {
            const f = (z - a0[0]) / Math.max(a1[0] - a0[0], 1e-9);
            return [z, a0[1] + f * (a1[1] - a0[1]), a0[2] + f * (a1[2] - a0[2])];
          }
        }
        return null;
      };
      const p = [en(za)].concat(P0.filter((q) => q[0] > za && q[0] < zb).map((q) => q.slice()), [en(zb)])
        .map((q) => [q[0], q[1], q[2] - wo]).filter((q) => q[2] > 0.003);
      tornear(B, p, 0, 0xffffff, D.x);
    } else {
      for (const p of D.p) {
        if (p.c !== undefined) extruir(B, p.o, null, p.h, null, p.T, p.c, null);
        else extruir(B, p.o, p.ob, p.h, p.hb, p.T, 0xffffff, D.x);
      }
      if (!parte) boca(B, D, id);
    }
    return B.build();
  }

  /* El material de cada arma del SWF: el de siempre -luz por escalones-
     con su dibujo encima. Uno por arma, compartido por todas sus copias. */
  const _mats = Object.create(null);
  function materialDe(id, parte) {
    const k = id + (parte ? '@' + parte : '');
    if (!_mats[k]) {
      const tex = new THREE.TextureLoader().load(modeloDe(id, parte).x.src);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      _mats[k] = Art.aplicarEscalones(new THREE.MeshBasicMaterial({ vertexColors: true, map: tex }));
    }
    return _mats[k];
  }

  W.geo = function (id, tinta, parte) {
    const k = id + (tinta ? '#t' : '') + (parte ? '@' + parte : '');
    if (!_geos[k]) {
      _geos[k] = construirSWF(id, tinta, parte);
    }
    return _geos[k];
  };

  /* -------------------------------------------------------------
     EL TAMAÑO DEL ARMA

     Las mallas van a medidas reales, y al lado de estos muñecos se
     veian de juguete. No es un fallo de medida: el muñeco NO ESTA A
     ESCALA HUMANA. Mide 1,70 pero la cabeza le ocupa el 23% del
     cuerpo y el puño 21 cm; son proporciones de dibujo, y un arma a
     escala real al lado de un puño de 21 cm desaparece.

     En la serie y en MPN2 las armas van deliberadamente GRANDES, que
     es lo que hace que se lean de un vistazo en mitad de un tiroteo.
     La escala vive en la ficha y no en la malla para que 'boca' y los
     agarres puedan contar con ella sin recalcular geometria.
     ------------------------------------------------------------- */
  const ESCALA = {
    pistola: 1.30, magnum: 1.28, subfusil: 1.22,
    escopeta: 1.16, fusil: 1.16,
    cuchillo: 1.00, megachette: 1.00, bate: 1.10
  };
  W.escalaDe = function (id) { return SWF[id] ? 1 : (ESCALA[id] || 1); };

  /* Un arma lista para colgar de una mano: dos mallas -color y
     contorno- dentro de un grupo. La geometria es compartida, asi
     que veinte grunts con pistola son veinte objetos apuntando a
     las mismas dos mallas. */
  /* =============================================================
     LAS MANOS DEL ARMA

     En el SWF cada postura de arma trae SUS manos -myHand, myHand2-
     colocadas donde agarran: el puño envolviendo la culata, los tres
     dedos bajo el guardamanos. Aqui van igual: pegadas a la malla del
     arma con las matrices del SWF (manos.py las lleva al marco de la
     malla), y el animador esconde las del personaje. Asi el agarre es
     exacto en todas las armas y no depende de por donde pase el hueso
     de la mano.

     Un arma de fuego va en la mano de DELANTE (como beretta_front del
     SWF) y una blanca en la de atras. Y la mano es un objeto 3D con dos
     caras: la de fuera -lejos del cuerpo- es el dorso (*_front del SWF)
     y la de dentro los dedos y la palma (*_back). Cual se ve lo decide
     el angulo real en cada cuadro (W.caraManos). Ver manos.js.
     ============================================================= */
  const _geoMano = Object.create(null);
  /* 'parte': la mano que agarra una pieza que se mueve -la de delante
     de las escopetas va en la bomba- va con ella (ver disparo.js). */
  function geoMano(id, lado, cara, tinta, parte) {
    const k = id + ':' + lado + cara + (tinta ? '#t' : '') + (parte ? '@' + parte : '');
    if (!_geoMano[k]) {
      const B = U.builder(tinta ? {} : { uv: true });
      for (const inst of global.Manos.datos.armas[id]) {
        const suya = (global.Disparo ? Disparo.parteDeMano(id, inst) : null) === (parte || null);
        if (suya && inst.lado === lado && inst.cara === cara) global.Manos.meter(B, inst, 'arma', tinta, 0x000000);
      }
      _geoMano[k] = B.build();
    }
    return _geoMano[k];
  }
  /* Cuantas manos pone el arma: 0 si el personaje usa las suyas. Cada
     mano va cuatro veces: por cada cara del arma, su cara de fuera y
     su cara de dentro. */
  W.manosDe = function (id) {
    const l = global.Manos && global.Manos.datos.armas[id];
    return l ? l.length / 4 : 0;
  };
  /* LA CARA DE LA MANO QUE SE VE, SEGUN EL ANGULO REAL.

     q es la orientacion de la malla del arma en el mundo y 'fuera' el
     lado del cuerpo en el que esta la mano (del cuerpo hacia la mano,
     en el mundo). La camara mira por -Z: se ve la cara +x del arma si
     su x apunta a camara. Si esa cara es la de FUERA de la mano -la
     que se aleja del cuerpo- se enseña el dorso; si es la de DENTRO,
     los dedos y la palma. Asi la mano es una sola, con dos caras, y
     se ve la que toca desde donde se la mire. */
  const _vxm = new THREE.Vector3();
  W.caraManos = function (manos, q, fuera) {
    _vxm.set(1, 0, 0).applyQuaternion(q);
    const lado = _vxm.z > 0 ? 1 : -1;
    const deFuera = (_vxm.dot(fuera) > 0) === (lado > 0);
    for (const k in manos) manos[k].visible = false;
    const g = manos[lado + (deFuera ? 'fuera' : 'dentro')];
    if (g) g.visible = true;
  };

  W.crear = function (id, piel) {
    const f = W.CAT[id];
    if (!f || f.sinMalla) return null;
    const grupo = new THREE.Group();
    const linea = new THREE.Mesh(W.geo(id, true), Art.mats.contorno);
    linea.renderOrder = 2;      // despues del color: ver Art.mats.contorno
    linea.frustumCulled = false;
    grupo.add(linea);
    const cuerpo = new THREE.Mesh(W.geo(id), SWF[id] ? materialDe(id) : Art.mats.plano);
    cuerpo.frustumCulled = false;
    grupo.add(cuerpo);
    /* Las piezas que se mueven solas -la corredera de la Beretta, la
       bomba de las escopetas, los cargadores-, cada una en su grupo
       para que disparo.js la corra por su recorrido del SWF. */
    const partes = SWF[id] && global.Disparo ? Disparo.partes(id) : null;
    if (partes) {
      grupo.userData.partes = {};
      for (const n of partes) {
        const g = new THREE.Group();
        // la mano de delante (mano2) es una parte sin malla propia
        if (SWF[id].partes && SWF[id].partes[n]) {
          const l = new THREE.Mesh(W.geo(id, true, n), Art.mats.contorno);
          l.renderOrder = 2; l.frustumCulled = false;
          const c = new THREE.Mesh(W.geo(id, false, n), materialDe(id, n));
          c.frustumCulled = false;
          g.add(l); g.add(c);
        }
        grupo.add(g);
        grupo.userData.partes[n] = g;
      }
    }
    /* Solo en la mano de alguien: un arma tirada en el suelo no lleva
       manos. */
    if (piel && W.manosDe(id)) {
      const manos = {};
      for (const lado of [-1, 1]) {
        for (const cara of ['fuera', 'dentro']) {
          const g = new THREE.Group();
          const c = new THREE.Mesh(geoMano(id, lado, cara, false), global.Manos.material(piel));
          c.frustumCulled = false;
          const l = new THREE.Mesh(geoMano(id, lado, cara, true), Art.mats.contorno);
          l.renderOrder = 2;
          l.frustumCulled = false;
          g.add(c); g.add(l);
          g.visible = lado === -1 && cara === 'fuera';
          grupo.add(g);
          manos[lado + cara] = g;
          /* La que va en una pieza movil cuelga de esa pieza, y se
             enseña o se esconde con su cara (Disparo.piezas). */
          for (const n in (grupo.userData.partes || {})) {
            const gc = geoMano(id, lado, cara, false, n);
            if (!gc.attributes.position || !gc.attributes.position.count) continue;
            const gp = new THREE.Group();
            const cp = new THREE.Mesh(gc, global.Manos.material(piel));
            cp.frustumCulled = false;
            const lp = new THREE.Mesh(geoMano(id, lado, cara, true, n), Art.mats.contorno);
            lp.renderOrder = 2; lp.frustumCulled = false;
            gp.add(cp); gp.add(lp);
            grupo.userData.partes[n].add(gp);
            (grupo.userData.manosParte = grupo.userData.manosParte || []).push({ g: gp, cara: g });
          }
        }
      }
      grupo.userData.manos = manos;
      grupo.userData.piel = piel;     // para las poses de la mano (disparo.js)
    }
    grupo.scale.setScalar(W.escalaDe(id));
    grupo.frustumCulled = false;
    return grupo;
  };

  /* Estado de un arma en manos de alguien */
  /* EL ARMA ES UN OBJETO QUE SE CONSERVA: el myWeapons[n] del SWF. Pasa
     de la mano a la otra ranura, al suelo y a la mano de otro con lo que
     le quede -balas, cargadores, desgaste-; nunca se crea otra al cogerla.

     salud  el myHealth de las blancas (ItemGenerator.createWeapon: Bowie
            30, Bat 20, Pipe 20, Megachette 'tangsword' 50). damageMelee
            (117440..118015) le quita 1 por golpe que entra; a 12% o menos
            queda 'broken' y a 0 se rompe. Las de fuego no la tienen. */
  W.equipar = function (id) {
    const f = W.CAT[id];
    return {
      id: id, ficha: f,
      cargador: f.cargador || 0,
      cargas: f.cargas || 0,
      salud: f.salud || 0,
      saludMax: f.salud || 0,
      roto: false,
      espera: 0,          // enfriamiento entre disparos
      recargando: 0
    };
  };

  /* Sin nada que hacer con ella: un arma de fuego sin balas ni cargadores
     (el pickup rojo del SWF: myAmmo == 0 && myClips == 0). Las blancas
     llevan myAmmo = 1 en createWeapon y nunca estan vacias. */
  W.vacia = function (o) {
    return !!o && o.ficha.tipo === 'fuego' && (o.cargador || 0) <= 0 && (o.cargas || 0) <= 0;
  };

  /* EL RESALTADO DEL SWF (MadnessParticle.amDead, 11734..12043): el arma
     del suelo que el jugador tiene a tiro (targetPickup) se tiñe con un
     Color.setTransform de desplazamiento: {rb: 0, gb: 250, bb: 0} si se
     puede usar y {rb: 250, gb: 0, bb: 0} si esta vacia. Es una SUMA, no un
     producto: el dibujo entero, contorno incluido, se va a verde (o rojo)
     y conserva sus sombras en los otros dos canales. Aqui, lo mismo: el
     material del arma con + (0, 250/255, 0) al color final, y la tinta
     (negra) de ese color. Un material por arma y tinte, compartido. */
  const _tinte = {};
  const TINTES = { verde: [0, 250 / 255, 0], rojo: [250 / 255, 0, 0] };
  function materialTinte(base, clave, t) {
    const k = clave + '|' + t;
    if (_tinte[k]) return _tinte[k];
    let m;
    if (base === Art.mats.contorno) {
      m = base.clone();
      m.color.setRGB(TINTES[t][0], TINTES[t][1], TINTES[t][2]);
    } else {
      m = new THREE.MeshBasicMaterial({ vertexColors: base.vertexColors, map: base.map || null,
                                        color: base.color ? base.color.clone() : 0xffffff });
      Art.aplicarEscalones(m);
      const antes = m.onBeforeCompile, c = TINTES[t];
      m.onBeforeCompile = (sh) => {
        antes(sh);
        sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>',
          '#include <dithering_fragment>\n\tgl_FragColor.rgb = min(gl_FragColor.rgb + vec3(' +
          c.map((v) => v.toFixed(4)).join(', ') + '), vec3(1.0));');
      };
      m.customProgramCacheKey = () => 'madness-escalones-tinte-' + t;
    }
    _tinte[k] = m;
    return m;
  }
  /* t: 'verde', 'rojo' o null (sin tinte). Recorre la malla del arma y
     cambia cada material por su version teñida, guardando el original. */
  W.tintar = function (malla, t) {
    if (!malla || malla.userData.tinte === t) return;
    malla.userData.tinte = t;
    malla.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.userData.matBase) o.userData.matBase = o.material;
      const b = o.userData.matBase;
      o.material = t ? materialTinte(b, b.uuid, t) : b;
    });
  };

  /* La boca del cañon. De aqui sale el fogonazo y aqui empieza la
     bala.

     'alcance' va por el eje de la pelea -los mismos metros que usa
     el agarre- y 'alto' es ya ALTURA SOBRE EL SUELO, con el
     desplazamiento del hueso del tronco sumado: quien dispara no
     tiene por que saber donde pivota un torso.

     Y sale donde sale porque la mano que empuña se alinea con ese
     eje: si el arma apuntase a su frente propio, la bala saldria
     por un sitio y el cañon miraria a otro. */
  /* =============================================================
     LA VELOCIDAD DE BOCA, Y POR QUE NO ES LA DE VERDAD

     Desde que las balas son proyectiles y no rayas instantaneas,
     cada arma necesita a que velocidad salen. Las de verdad son
     320 m/s una 9 mm, 400 una escopeta, 900 un fusil de asalto.

     Con esos numeros no se veria NADA: esta arena mide diez metros
     de fondo y cuarenta y cuatro de ancho, asi que una bala de 900
     la cruza en 0,05 s, tres fotogramas. El tiro volveria a ser un
     hitscan con pasos extra.

     Asi que van a un cuarto de lo real, que mantiene el ORDEN y las
     proporciones entre calibres -lo unico que el jugador puede
     leer- y deja un tiempo de vuelo que se ve:

       escopeta  82    9 mm 95    subfusil 100    magnum 118    fusil 160

     A diez metros eso son 0,12 s con la escopeta y 0,06 con el
     fusil: se ve salir el trazo, se ve llegar, y a un enemigo que
     corre hay que adelantarle el tiro. La gravedad, en cambio, SI
     es la de verdad -9,81 m/s2-, porque a estas velocidades la
     caida en diez metros son cinco centimetros y eso no hay que
     escalarlo para que se sienta bien. */
  const TRONCO = 0.260;
  /* Distancia del agarre a la boca, en la malla sin escalar. Sale de
     la geometria de arriba, no de un numero puesto a ojo. */
  const LARGO = { pistola: 0.224, magnum: 0.318, subfusil: 0.368,
                  escopeta: 0.652, fusil: 0.666 };

  W.boca = function (id) {
    const f = W.CAT[id];
    if (!f || f.tipo !== 'fuego') return { alcance: 0.60, alto: 1.12 };
    const g = f.agarre;
    const m = SWF[id] && SWF[id].i.boca;
    if (m) return { alcance: g.alcance + m[0], alto: TRONCO + g.alto + m[1] };
    return { alcance: g.alcance + (LARGO[id] || 0.30) * W.escalaDe(id),
             alto: TRONCO + g.alto + 0.04 };
  };

  /* =============================================================
     APUNTAR DESDE LA MANO, NO DESDE LA BOCA

     El pico se calculaba de la BOCA a la mira. Con un arma larga -la
     SPAS mide 1,8 m, la boca queda 2,2 m por delante- la boca cae casi
     encima de la mira y el arma se ponia a 34 grados mirando al cielo.
     En el original el brazo gira desde la mano, y es lo que hay que
     hacer: el angulo se calcula desde la EMPUÑADURA, con la correccion
     exacta para que la linea del cañon -que va por encima de la mano-
     pase por el blanco:

         pico = atan2(dy, dh) - asin(alto del cañon / distancia)

     Y la boca se saca DESPUES, con ese pico: la bala nace en el cañon
     que se ve y va por su linea.
     ============================================================= */
  function geomBoca(id) {
    const f = W.CAT[id];
    const g = f && f.agarre;
    const m = SWF[id] && SWF[id].i.boca;
    if (!f || f.tipo !== 'fuego' || !g) return null;
    return { az: g.alcance, ay: TRONCO + g.alto,
             bz: m ? m[0] : (LARGO[id] || 0.30) * W.escalaDe(id), by: m ? m[1] : 0.04 };
  }
  W.pico = function (A, tx, ty, tz) {
    const G = geomBoca(A.arma ? A.arma.id : '');
    const e = A.cuerpo.escala;
    const az = G ? G.az : 0.6, ay = G ? G.ay : 1.12, by = G ? G.by : 0;
    const rt = global.Actor ? Actor.rumboTiro(A) : A.rumbo;
    const gx = A.x + Math.cos(rt) * az * e, gz = (A.z || 0) + Math.sin(rt) * az * e;
    const dh = Math.max(0.05, Math.hypot(tx - gx, tz - gz)), dy = ty - (A.y + ay * e);
    const D = Math.hypot(dh, dy);
    return Math.atan2(dy, dh) - Math.asin(U.clamp(by * e / D, -0.95, 0.95));
  };
  W.puntoBoca = function (A, pico, out) {
    out = out || { x: 0, y: 0, z: 0 };
    const id = A.arma ? A.arma.id : '';
    const G = geomBoca(id), e = A.cuerpo.escala;
    const rt = global.Actor ? Actor.rumboTiro(A) : A.rumbo;
    if (!G) {
      const b = W.boca(id);
      out.x = A.x + Math.cos(rt) * b.alcance * e;
      out.z = (A.z || 0) + Math.sin(rt) * b.alcance * e;
      out.y = A.y + b.alto * e;
      return out;
    }
    const c = Math.cos(pico), s = Math.sin(pico);
    const fw = (G.az + G.bz * c - G.by * s) * e, up = (G.ay + G.bz * s + G.by * c) * e;
    out.x = A.x + Math.cos(rt) * fw;
    out.z = (A.z || 0) + Math.sin(rt) * fw;
    out.y = A.y + up;
    return out;
  };

  /* Lo que suelta un enemigo al morir, por faccion */
  W.botin = function (tipo, rng) {
    const tablas = {
      grunt: ['puños', 'puños', 'tubo', 'cuchillo', 'bate', 'pistola'],
      agente: ['pistola', 'pistola', 'revolver', 'magnum', 'subfusil'],
      agenteClasico: ['pistola', 'pistola', 'revolver', 'magnum', 'subfusil'],
      soldat: ['fusil', 'escopeta', 'escopeta97', 'subfusil'],
      agenteMk0: ['magnum', 'subfusil', 'fusil'],
      hank: ['megachette']
    };
    const t = tablas[tipo] || tablas.grunt;
    return t[Math.floor((rng ? rng() : Math.random()) * t.length)];
  };

  W.limpiar = function () {
    for (const k in _geos) { _geos[k].dispose(); delete _geos[k]; }
  };

  /* Lo que sale del modelo y no se escribe a mano:
     - la PUNTA de las blancas, que es donde va la zona de golpe;
     - la mano de DELANTE de las de dos manos: el SWF la pone en su
       postura -myHand2- y aqui se lleva a la misma distancia del puño
       a lo largo del arma. */
  /* Lo que el brazo adelanta la punta en cada golpe, medido con las
     mallas con las que se afinaron las animaciones: alcance - punta.
       cuchillo  1,18 - 0,489      megachette  1,55 - 1,109
       bate      1,82 - 0,836      tubo: los golpes del megachette */
  const BRAZO = { cuchillo: 0.691, megachette: 0.441, bate: 0.984, tubo: 0.441 };
  for (const id in SWF) {
    const f = W.CAT[id], i = SWF[id].i;
    if (!f) continue;
    if (f.tipo === 'melee') {
      f.punta = i.zmax;
      /* El alcance del golpe es la punta MAS lo que el brazo la adelanta,
         y eso ultimo es lo que se afino a mano con cada animacion. Asi el
         alcance sigue a la malla y no a un numero suelto. */
      if (BRAZO[id] !== undefined) f.alcance = +(BRAZO[id] + f.punta).toFixed(3);
    }
    const g = f.agarre;
    if (g && g.dos && g.canon && i.mano2) {
      g.alcance2 = +(g.alcance + i.mano2[0]).toFixed(3);
      g.alto2 = +(g.alto + i.mano2[1]).toFixed(3);
    }
  }

  // Los dibujos se cargan al arrancar: si se pidieran al equipar el arma,
  // el primer fotograma la pintaria negra mientras llega la imagen.
  for (const id in SWF) {
    materialDe(id);
    for (const n in (SWF[id].partes || {})) materialDe(id, n);
  }

  global.Weapons = W;
})(window);

