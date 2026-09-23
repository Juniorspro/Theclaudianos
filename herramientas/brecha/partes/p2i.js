
/* ====================== idiomas: español (base), inglés y portugués ======================
   Cada texto se escribe en castellano y T() lo traduce: entero si está en el diccionario, y si no
   por frases sueltas (palabras enteras), así sirven también los armados como 'OLEADA ' + n. */
const IDIOMAS = [['es','ESPAÑOL'], ['en','ENGLISH'], ['pt','PORTUGUÊS']];
const TR = {
  en:{
    /* menús */
    'UNIDAD TÁCTICA · OPERACIONES ESPECIALES':'TACTICAL UNIT · SPECIAL OPERATIONS', 'OPERACIONES':'OPERATIONS', 'ARMERÍA':'ARMORY', 'INSTRUCCIÓN':'BRIEFING',
    'SONIDO':'SOUND', 'SÍ':'ON', 'NO':'OFF', 'GRÁFICOS':'GRAPHICS', 'ALTOS':'HIGH', 'MEDIOS':'MEDIUM', 'BAJOS':'LOW', 'IDIOMA':'LANGUAGE', 'ELEGÍ LA OPERACIÓN':'CHOOSE YOUR OPERATION', 'VOLVER':'BACK', 'OPERACIÓN':'OPERATION', 'EQUIPO':'GEAR',
    'DESPLEGAR':'DEPLOY', 'ARMAS':'WEAPONS', 'MEJORAS':'UPGRADES', 'ANTES DE SALIR':'BEFORE YOU GO', 'OPERACIÓN EN CURSO':'OPERATION IN PROGRESS', 'PAUSA':'PAUSED',
    'SEGUIR':'RESUME', 'REINICIAR':'RESTART', 'ABORTAR':'ABORT', 'INFORME':'REPORT', 'MISIÓN CUMPLIDA':'MISSION COMPLETE', 'MISIÓN FALLIDA':'MISSION FAILED',
    'SIGUIENTE':'NEXT', 'REPETIR':'RETRY', 'CARGANDO…':'LOADING…', 'CUBRIR':'COVER', 'AIRE':'BREATH', 'BRECHA':'BREACH',
    'CLASIFICADO · cumplí la anterior':'CLASSIFIED · complete the previous one', 'CLASIFICADO':'CLASSIFIED', 'CUMPLIDA':'DONE', 'ACTIVA':'ACTIVE',
    'DAÑO':'DAMAGE', 'CADENCIA':'FIRE RATE', 'PRECISIÓN':'ACCURACY', 'CARGADOR':'MAGAZINE', 'L96 · ASIGNADO':'L96 · ASSIGNED',
    'La operación es de francotirador: se sale con el L96 y la pistola.':'This is a sniper operation: you go in with the L96 and the pistol.',
    'EN MANO':'EQUIPPED', 'LLEVAR':'TAKE', 'Chaleco':'Vest', 'casco':'helmet', 'botiquín':'medkit', 'cegadoras':'flashbangs', 'Vida':'Health',
    'EN USO':'IN USE', 'COMPRADA':'OWNED', 'COMPRAR':'BUY', 'AL MÁXIMO':'MAXED', 'MEJORAR':'UPGRADE',
    'SIN RASGUÑOS':'UNTOUCHED', 'TIRADOR':'MARKSMAN', 'SALVADOR':'SAVIOR', 'FANTASMA':'GHOST', 'RELÁMPAGO':'LIGHTNING',
    'TIEMPO':'TIME', 'BAJAS':'KILLS', 'A LA CABEZA':'HEADSHOTS', 'REHENES':'HOSTAGES', 'DAÑO RECIBIDO':'DAMAGE TAKEN', 'PAGA':'PAY',
    /* armas, mejoras, equipo */
    'Pistola. Semiautomática, precisa y con muchos cargadores.':'Pistol. Semi-automatic, accurate, plenty of magazines.',
    'Subfusil. Mucha cadencia, poco retroceso, poco alcance.':'SMG. High fire rate, low recoil, short range.',
    'Fusil de asalto. El que sirve para todo.':'Assault rifle. Good for everything.',
    'Escopeta. Ocho perdigones: de cerca borra, de lejos rasguña.':'Shotgun. Eight pellets: erases up close, scratches from afar.',
    'Tirador. Semiautomático, pega fuerte y tiene mira de 3x.':'Marksman rifle. Semi-automatic, hits hard, 3x scope.',
    'Francotirador de cerrojo. Mira de 7x. La bala tarda y la mueve el viento.':'Bolt-action sniper. 7x scope. The bullet takes time and the wind moves it.',
    'SILENCIADOR':'SUPPRESSOR', 'No te delatan los disparos (clave en el puerto). −8 % de daño.':'Your shots don\'t give you away (key at the port). −8 % damage.',
    'MIRA HOLO':'HOLO SIGHT', 'La mira se pega más a los blancos y el zoom es un 20 % mayor.':'The reticle sticks to targets more and zoom is 20 % stronger.',
    'CARGADOR EXT.':'EXT. MAG', '+40 % de balas por cargador.':'+40 % rounds per magazine.', 'EMPUÑADURA':'GRIP', '−35 % de retroceso y de dispersión.':'−35 % recoil and spread.',
    'CHALECO':'VEST', '+30 de vida por nivel.':'+30 health per level.', 'CASCO':'HELMET', 'Recibís un 12 % menos por nivel.':'You take 12 % less damage per level.',
    'BOTIQUÍN':'MEDKIT', 'Cura 50 una vez por misión (toque largo en la vida). Se usa solo si vas a morir.':'Heals 50 once per mission. Used automatically when you are about to die.',
    'CEGADORAS':'FLASHBANGS', 'Aturden a todos los que miran unos 3 segundos.':'Stun everyone looking for about 3 seconds.',
    'silenciador':'suppressor', 'mira holo':'holo sight', 'cargador ext.':'ext. mag', 'empuñadura':'grip',
    /* enemigos y misiones */
    'ESCOPETERO':'SHOTGUNNER', 'PESADO':'HEAVY', 'ESCUDO':'SHIELD', 'COHETERO':'ROCKETEER', 'FRANCOTIRADOR':'SNIPER', 'CAPTOR':'CAPTOR', 'EL COLOSO':'THE COLOSSUS',
    'DEPÓSITO':'WAREHOUSE', 'EMBAJADA':'EMBASSY', 'PUERTO':'PORT', 'AUTOPISTA':'HIGHWAY', 'BÚNKER':'BUNKER', 'SIN DATOS':'NO DATA', 'RUTA 5':'ROUTE 5',
    'Asalto a un depósito tomado. Avance, cubiertas y una brecha con rehén al fondo.':'Assault on a seized warehouse. Push forward, use cover, and breach to the hostage at the back.',
    'Rehenes en tres salones. Brechas en cámara lenta y secuestradores con cuenta regresiva. Hay reloj.':'Hostages in three halls. Slow-motion breaches and captors on a countdown. On the clock.',
    'Francotirador desde una grúa. Viento, caída de la bala y un blanco que escapa en auto.':'Sniping from a crane. Wind, bullet drop and a target escaping by car.',
    'Escolta de convoy en movimiento. Camionetas, puentes, cohetes y un helicóptero.':'Escort a moving convoy. Trucks, bridges, rockets and a helicopter.',
    'El laboratorio bajo tierra. Escudos, pesados y El Coloso con su minigun.':'The underground lab. Shields, heavies and The Colossus with his minigun.',
    /* en juego */
    'usaste uno':'you used one', 'TE ABATIERON':'YOU WERE TAKEN DOWN', 'EJECUTARON AL REHÉN':'THE HOSTAGE WAS EXECUTED', 'CASCO ROTO':'HELMET BROKEN', 'PLACA ROTA':'PLATE BROKEN',
    'CABEZA':'HEADSHOT', 'BAJA':'KILL', '¡COHETE!':'ROCKET!', 'LE DISTE A UN REHÉN':'YOU HIT A HOSTAGE', 'LE DISTE A UN CIVIL':'YOU HIT A CIVILIAN',
    '¡HELICÓPTERO ABAJO!':'HELICOPTER DOWN!', 'VEHÍCULO':'VEHICLE', '¡PUENTE!':'BRIDGE!', '¡HELICÓPTERO!':'HELICOPTER!', '¡EL OBJETIVO ESCAPA!':'THE TARGET IS ESCAPING!',
    'bajá al chofer':'take out the driver', '¡CARGADORES!':'AMMO!', 'AVANZANDO':'MOVING UP', '¡TOMARON UN REHÉN!':'THEY TOOK A HOSTAGE!', 'a la cabeza':'aim for the head',
    'rompé las placas':'break the plates', 'OLEADA':'WAVE', 'DESPEJADO':'CLEAR', 'DERRIBÁ A EL COLOSO':'TAKE DOWN THE COLOSSUS', 'SALVÁ AL REHÉN':'SAVE THE HOSTAGE',
    'LIMPIÁ LA ZONA':'CLEAR THE AREA', 'EMBOSCADA':'AMBUSH', 'tocá el botón para entrar':'tap the button to go in', 'PREPARÁ LA BRECHA':'READY THE BREACH',
    'LIMPIÁ EL CUARTO':'CLEAR THE ROOM', 'REHENES A SALVO':'HOSTAGES SAFE', 'PUESTO':'POST', 'viento':'wind', 'EL OBJETIVO ESCAPÓ':'THE TARGET GOT AWAY',
    'EL OBJETIVO: EL CHOFER':'TARGET: THE DRIVER', 'NEUTRALIZÁ LOS BLANCOS':'NEUTRALIZE THE TARGETS', 'DERRIBÁ EL HELICÓPTERO':'SHOOT DOWN THE HELICOPTER',
    'PROTEGÉ EL CONVOY':'PROTECT THE CONVOY', 'SE ACABÓ EL TIEMPO':'TIME\'S UP', 'ENTRADA':'ENTRY',
    'RECARGANDO':'RELOADING', 'VIDA':'HEALTH', 'A CUBIERTO':'IN COVER', 'HOSTIL':'HOSTILE', 'HOSTILES':'HOSTILES', 'VIENTO':'WIND', '¡ALARMA!':'ALARM!', 'HELICÓPTERO':'HELICOPTER',
    'NO SE PUDO CARGAR EL MOTOR 3D':'THE 3D ENGINE COULD NOT LOAD'
  },
  pt:{
    'UNIDAD TÁCTICA · OPERACIONES ESPECIALES':'UNIDADE TÁTICA · OPERAÇÕES ESPECIAIS', 'OPERACIONES':'OPERAÇÕES', 'ARMERÍA':'ARSENAL', 'INSTRUCCIÓN':'BRIEFING',
    'SONIDO':'SOM', 'SÍ':'SIM', 'NO':'NÃO', 'GRÁFICOS':'GRÁFICOS', 'ALTOS':'ALTOS', 'MEDIOS':'MÉDIOS', 'BAJOS':'BAIXOS', 'IDIOMA':'IDIOMA', 'ELEGÍ LA OPERACIÓN':'ESCOLHA A OPERAÇÃO', 'VOLVER':'VOLTAR', 'OPERACIÓN':'OPERAÇÃO', 'EQUIPO':'EQUIPAMENTO',
    'DESPLEGAR':'INICIAR', 'ARMAS':'ARMAS', 'MEJORAS':'MELHORIAS', 'ANTES DE SALIR':'ANTES DE SAIR', 'OPERACIÓN EN CURSO':'OPERAÇÃO EM ANDAMENTO', 'PAUSA':'PAUSA',
    'SEGUIR':'CONTINUAR', 'REINICIAR':'REINICIAR', 'ABORTAR':'ABORTAR', 'INFORME':'RELATÓRIO', 'MISIÓN CUMPLIDA':'MISSÃO CUMPRIDA', 'MISIÓN FALLIDA':'MISSÃO FRACASSADA',
    'SIGUIENTE':'PRÓXIMA', 'REPETIR':'REPETIR', 'CARGANDO…':'CARREGANDO…', 'CUBRIR':'COBRIR', 'AIRE':'FÔLEGO', 'BRECHA':'INVADIR',
    'CLASIFICADO · cumplí la anterior':'CONFIDENCIAL · cumpra a anterior', 'CLASIFICADO':'CONFIDENCIAL', 'CUMPLIDA':'CUMPRIDA', 'ACTIVA':'ATIVA',
    'DAÑO':'DANO', 'CADENCIA':'CADÊNCIA', 'PRECISIÓN':'PRECISÃO', 'CARGADOR':'PENTE', 'L96 · ASIGNADO':'L96 · DESIGNADO',
    'La operación es de francotirador: se sale con el L96 y la pistola.':'É uma operação de atirador de elite: você vai com o L96 e a pistola.',
    'EN MANO':'EQUIPADA', 'LLEVAR':'LEVAR', 'Chaleco':'Colete', 'casco':'capacete', 'botiquín':'kit médico', 'cegadoras':'granadas de luz', 'Vida':'Vida',
    'EN USO':'EM USO', 'COMPRADA':'COMPRADA', 'COMPRAR':'COMPRAR', 'AL MÁXIMO':'NO MÁXIMO', 'MEJORAR':'MELHORAR',
    'SIN RASGUÑOS':'SEM ARRANHÕES', 'TIRADOR':'ATIRADOR', 'SALVADOR':'SALVADOR', 'FANTASMA':'FANTASMA', 'RELÁMPAGO':'RELÂMPAGO',
    'TIEMPO':'TEMPO', 'BAJAS':'ABATES', 'A LA CABEZA':'NA CABEÇA', 'REHENES':'REFÉNS', 'DAÑO RECIBIDO':'DANO RECEBIDO', 'PAGA':'PAGAMENTO',
    'Pistola. Semiautomática, precisa y con muchos cargadores.':'Pistola. Semiautomática, precisa e com muitos pentes.',
    'Subfusil. Mucha cadencia, poco retroceso, poco alcance.':'Submetralhadora. Muita cadência, pouco recuo, pouco alcance.',
    'Fusil de asalto. El que sirve para todo.':'Fuzil de assalto. Serve para tudo.',
    'Escopeta. Ocho perdigones: de cerca borra, de lejos rasguña.':'Escopeta. Oito balins: de perto apaga, de longe arranha.',
    'Tirador. Semiautomático, pega fuerte y tiene mira de 3x.':'Fuzil de precisão. Semiautomático, bate forte e tem mira de 3x.',
    'Francotirador de cerrojo. Mira de 7x. La bala tarda y la mueve el viento.':'Rifle de ferrolho. Mira de 7x. A bala demora e o vento a desvia.',
    'SILENCIADOR':'SILENCIADOR', 'No te delatan los disparos (clave en el puerto). −8 % de daño.':'Seus tiros não te denunciam (essencial no porto). −8 % de dano.',
    'MIRA HOLO':'MIRA HOLO', 'La mira se pega más a los blancos y el zoom es un 20 % mayor.':'A mira gruda mais nos alvos e o zoom é 20 % maior.',
    'CARGADOR EXT.':'PENTE EXT.', '+40 % de balas por cargador.':'+40 % de balas por pente.', 'EMPUÑADURA':'EMPUNHADURA', '−35 % de retroceso y de dispersión.':'−35 % de recuo e de dispersão.',
    'CHALECO':'COLETE', '+30 de vida por nivel.':'+30 de vida por nível.', 'CASCO':'CAPACETE', 'Recibís un 12 % menos por nivel.':'Você recebe 12 % menos por nível.',
    'BOTIQUÍN':'KIT MÉDICO', 'Cura 50 una vez por misión (toque largo en la vida). Se usa solo si vas a morir.':'Cura 50 uma vez por missão. É usado sozinho quando você vai morrer.',
    'CEGADORAS':'GRANADAS DE LUZ', 'Aturden a todos los que miran unos 3 segundos.':'Atordoam todos que olham por uns 3 segundos.',
    'silenciador':'silenciador', 'mira holo':'mira holo', 'cargador ext.':'pente ext.', 'empuñadura':'empunhadura',
    'ESCOPETERO':'ESCOPETEIRO', 'PESADO':'PESADO', 'ESCUDO':'ESCUDO', 'COHETERO':'LANÇA-FOGUETES', 'FRANCOTIRADOR':'ATIRADOR DE ELITE', 'CAPTOR':'SEQUESTRADOR', 'EL COLOSO':'O COLOSSO',
    'DEPÓSITO':'DEPÓSITO', 'EMBAJADA':'EMBAIXADA', 'PUERTO':'PORTO', 'AUTOPISTA':'RODOVIA', 'BÚNKER':'BUNKER', 'SIN DATOS':'SEM DADOS', 'RUTA 5':'RODOVIA 5',
    'Asalto a un depósito tomado. Avance, cubiertas y una brecha con rehén al fondo.':'Assalto a um depósito tomado. Avanço, coberturas e uma invasão com refém no fundo.',
    'Rehenes en tres salones. Brechas en cámara lenta y secuestradores con cuenta regresiva. Hay reloj.':'Reféns em três salões. Invasões em câmera lenta e sequestradores com contagem regressiva. Tem relógio.',
    'Francotirador desde una grúa. Viento, caída de la bala y un blanco que escapa en auto.':'Atirador de elite num guindaste. Vento, queda da bala e um alvo que foge de carro.',
    'Escolta de convoy en movimiento. Camionetas, puentes, cohetes y un helicóptero.':'Escolta de comboio em movimento. Caminhonetes, pontes, foguetes e um helicóptero.',
    'El laboratorio bajo tierra. Escudos, pesados y El Coloso con su minigun.':'O laboratório subterrâneo. Escudos, pesados e O Colosso com sua minigun.',
    'usaste uno':'você usou um', 'TE ABATIERON':'VOCÊ FOI ABATIDO', 'EJECUTARON AL REHÉN':'EXECUTARAM O REFÉM', 'CASCO ROTO':'CAPACETE QUEBRADO', 'PLACA ROTA':'PLACA QUEBRADA',
    'CABEZA':'CABEÇA', 'BAJA':'ABATE', '¡COHETE!':'FOGUETE!', 'LE DISTE A UN REHÉN':'VOCÊ ACERTOU UM REFÉM', 'LE DISTE A UN CIVIL':'VOCÊ ACERTOU UM CIVIL',
    '¡HELICÓPTERO ABAJO!':'HELICÓPTERO ABATIDO!', 'VEHÍCULO':'VEÍCULO', '¡PUENTE!':'PONTE!', '¡HELICÓPTERO!':'HELICÓPTERO!', '¡EL OBJETIVO ESCAPA!':'O ALVO ESTÁ FUGINDO!',
    'bajá al chofer':'derrube o motorista', '¡CARGADORES!':'MUNIÇÃO!', 'AVANZANDO':'AVANÇANDO', '¡TOMARON UN REHÉN!':'PEGARAM UM REFÉM!', 'a la cabeza':'mire na cabeça',
    'rompé las placas':'quebre as placas', 'OLEADA':'ONDA', 'DESPEJADO':'LIMPO', 'DERRIBÁ A EL COLOSO':'DERRUBE O COLOSSO', 'SALVÁ AL REHÉN':'SALVE O REFÉM',
    'LIMPIÁ LA ZONA':'LIMPE A ÁREA', 'EMBOSCADA':'EMBOSCADA', 'tocá el botón para entrar':'toque o botão para entrar', 'PREPARÁ LA BRECHA':'PREPARE A INVASÃO',
    'LIMPIÁ EL CUARTO':'LIMPE A SALA', 'REHENES A SALVO':'REFÉNS A SALVO', 'PUESTO':'POSTO', 'viento':'vento', 'EL OBJETIVO ESCAPÓ':'O ALVO FUGIU',
    'EL OBJETIVO: EL CHOFER':'ALVO: O MOTORISTA', 'NEUTRALIZÁ LOS BLANCOS':'NEUTRALIZE OS ALVOS', 'DERRIBÁ EL HELICÓPTERO':'DERRUBE O HELICÓPTERO',
    'PROTEGÉ EL CONVOY':'PROTEJA O COMBOIO', 'SE ACABÓ EL TIEMPO':'O TEMPO ACABOU', 'ENTRADA':'ENTRADA',
    'RECARGANDO':'RECARREGANDO', 'VIDA':'VIDA', 'A CUBIERTO':'PROTEGIDO', 'HOSTIL':'HOSTIL', 'HOSTILES':'HOSTIS', 'VIENTO':'VENTO', '¡ALARMA!':'ALARME!', 'HELICÓPTERO':'HELICÓPTERO',
    'NO SE PUDO CARGAR EL MOTOR 3D':'NÃO FOI POSSÍVEL CARREGAR O MOTOR 3D'
  }
};
/* la instrucción tiene negritas adentro: va entera por idioma */
const COMO_TXT = {
  en:`<p><b>The team moves on its own.</b> You aim and shoot: drag your finger across the screen to move the reticle and hold <b>FIRE</b>.</p>
      <p><b>AIM</b> zooms in and tightens the reticle. A <b>headshot</b> drops anyone without a helmet. Heavies wear plates: break them or go for the head.</p>
      <p><b>COVER</b>: hold it to hide behind cover. They can't hit you there, you reload faster and recover some health. Release it to lean out.</p>
      <p>In front of a door, <b>BREACH</b> appears: the door gets kicked in and time slows down for a few seconds. <b>Don't shoot the hostages</b> (white shirts).</p>
      <p>With the sniper rifle, <b>wind</b> and <b>distance</b> move the bullet. <b>BREATH</b> holds your breath and steadies the scope. The flashbang stuns everyone for three seconds.</p>
      <p style="color:#5a636b">PC: mouse aims, click fires, right click or Z aims, space covers, R reloads, Q weapon, G grenade, E breach, Shift breath, P pause.</p>`,
  pt:`<p><b>A equipe avança sozinha.</b> Você mira e atira: arraste o dedo pela tela para mover a mira e segure <b>FOGO</b>.</p>
      <p><b>MIRAR</b> aproxima e firma a mira. Um tiro na <b>cabeça</b> derruba qualquer um sem capacete. Os pesados usam placas: quebre-as ou procure a cabeça.</p>
      <p><b>COBRIR</b>: segure para se esconder atrás da cobertura. Ali não te acertam, você recarrega mais rápido e recupera um pouco de vida. Solte para aparecer.</p>
      <p>Diante de uma porta aparece <b>INVADIR</b>: a porta é arrombada e o tempo desacelera por alguns segundos. <b>Não acerte os reféns</b> (camisa branca).</p>
      <p>Com o atirador de elite, o <b>vento</b> e a <b>distância</b> desviam a bala. <b>FÔLEGO</b> prende a respiração e deixa a mira parada. A granada de luz atordoa todos por três segundos.</p>
      <p style="color:#5a636b">PC: o mouse mira, clique atira, botão direito ou Z mira, espaço cobre, R recarrega, Q arma, G granada, E invadir, Shift fôlego, P pausa.</p>`
};
function idiomaInicial(){ const n = (navigator.language||'es').slice(0,2).toLowerCase(); return n==='en' || n==='pt' ? n : 'es'; }
if(!G.idioma) G.idioma = idiomaInicial();
const TRC = {};   /* por idioma: {re, cache} */
function T(s){
  const l = G.idioma; if(l==='es' || s==null) return s; s = String(s); const D = TR[l]; if(!D) return s;
  if(D[s] !== undefined) return D[s];
  let C = TRC[l]; if(!C){ const ks = Object.keys(D).sort((a, b)=> b.length - a.length).map(k=> k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    C = TRC[l] = {re:new RegExp('(?<![\\p{L}])(' + ks.join('|') + ')(?![\\p{L}])', 'gu'), cache:new Map()}; }
  let r = C.cache.get(s); if(r !== undefined) return r;
  r = s.replace(C.re, m=> D[m]); if(C.cache.size > 600) C.cache.clear(); C.cache.set(s, r); return r;
}
/* textos fijos del HTML: se guarda el original en castellano y se traduce desde ahí */
const TXT_ES = new Map();
let COMO_ES = null;
function aplicarIdioma(){
  document.documentElement.lang = G.idioma;
  const como = document.querySelector('#capaComo .texto'); if(como){ if(COMO_ES===null) COMO_ES = como.innerHTML; como.innerHTML = G.idioma==='es' ? COMO_ES : COMO_TXT[G.idioma]; }
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {acceptNode:n=> n.parentNode.closest('.titulo,script,style,#capaComo .texto,#listaMisiones,#listaEquipo,#listaArmeria,#medallas,#resumen,#aviso,#btSonido,#eqMision,#resTit,#resSub,#rango,#resEst,#armTit,#dinero,#idiomas') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
  for(let n = w.nextNode(); n; n = w.nextNode()){ if(!TXT_ES.has(n)){ if(!n.nodeValue.trim()) continue; TXT_ES.set(n, n.nodeValue); }
    const o = TXT_ES.get(n), t = o.trim(); n.nodeValue = o.replace(t, T(t)); }
  document.querySelectorAll('#idiomas button').forEach(b=> b.classList.toggle('ya', b.dataset.l===G.idioma));
}
