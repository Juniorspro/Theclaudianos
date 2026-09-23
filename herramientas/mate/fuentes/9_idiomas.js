/* ================================================================ frases: castellano, inglés, portugués */
const FRASES = [
[
"¡PUM!",
"POP!",
"PUM!"
],
[
"¿Un enmascarado con un mate? Qué vulgar.",
"A masked man with a mate gourd? How vulgar.",
"Um mascarado com uma cuia? Que vulgar."
],
[
"¡Suficiente! ¡Traigan las teteras!",
"Enough! Bring the teapots!",
"Chega! Tragam as chaleiras!"
],
[
"¡Mi traje! ¡Esto es la GUERRA!",
"My suit! This means WAR!",
"Meu terno! Isso é GUERRA!"
],
[
"¡SU PROPIO TÉ!",
"HIS OWN TEA!",
"O PRÓPRIO CHÁ!"
],
[
"¡Nooo! ¡Mi hora del té!",
"Nooo! My tea time!",
"Nããão! Minha hora do chá!"
],
[
"SALTEAR",
"SKIP",
"PULAR"
],
[
"UNA VENGANZA CON YERBA",
"A REVENGE BREWED IN YERBA",
"UMA VINGANÇA COM ERVA"
],
[
"TOCÁ PARA EMPEZAR",
"TAP TO START",
"TOQUE PARA COMEÇAR"
],
[
"CONTINUAR",
"CONTINUE",
"CONTINUAR"
],
[
"JUGAR",
"PLAY",
"JOGAR"
],
[
"CAPÍTULOS",
"CHAPTERS",
"CAPÍTULOS"
],
[
"OPCIONES",
"OPTIONS",
"OPÇÕES"
],
[
"CRÉDITOS",
"CREDITS",
"CRÉDITOS"
],
[
"VOLVER",
"BACK",
"VOLTAR"
],
[
"IDIOMA",
"LANGUAGE",
"IDIOMA"
],
[
"CALIDAD",
"QUALITY",
"QUALIDADE"
],
[
"MÚSICA",
"MUSIC",
"MÚSICA"
],
[
"EFECTOS",
"SOUND FX",
"EFEITOS"
],
[
"VIBRACIÓN",
"VIBRATION",
"VIBRAÇÃO"
],
[
"SÍ",
"YES",
"SIM"
],
[
"NO",
"NO",
"NÃO"
],
[
"ALTA",
"HIGH",
"ALTA"
],
[
"MEDIA",
"MEDIUM",
"MÉDIA"
],
[
"BAJA",
"LOW",
"BAIXA"
],
[
"ESPAÑOL",
"ESPAÑOL",
"ESPAÑOL"
],
[
"ENGLISH",
"ENGLISH",
"ENGLISH"
],
[
"PORTUGUÊS",
"PORTUGUÊS",
"PORTUGUÊS"
],
[
"PAUSA",
"PAUSED",
"PAUSA"
],
[
"REINICIAR NIVEL",
"RESTART LEVEL",
"REINICIAR FASE"
],
[
"SALIR AL MENÚ",
"QUIT TO MENU",
"SAIR PARA O MENU"
],
[
"¡NIVEL COMPLETO!",
"LEVEL CLEAR!",
"FASE COMPLETA!"
],
[
"BAJAS",
"KILLS",
"ABATES"
],
[
"PRECISIÓN",
"ACCURACY",
"PRECISÃO"
],
[
"TIEMPO",
"TIME",
"TEMPO"
],
[
"MUERTES",
"DEATHS",
"MORTES"
],
[
"ESTILO",
"STYLE",
"ESTILO"
],
[
"PUNTAJE",
"SCORE",
"PONTUAÇÃO"
],
[
"¡NUEVO RÉCORD!",
"NEW RECORD!",
"NOVO RECORDE!"
],
[
"SIGUIENTE",
"NEXT",
"PRÓXIMA"
],
[
"FINAL",
"ENDING",
"FINAL"
],
[
"REPETIR",
"REPLAY",
"REPETIR"
],
[
"MENÚ",
"MENU",
"MENU"
],
[
"TE BAJARON",
"YOU GOT TAKEN DOWN",
"VOCÊ CAIU"
],
[
"REINTENTAR",
"RETRY",
"TENTAR DE NOVO"
],
[
"LORD EARL GREY",
"LORD EARL GREY",
"LORD EARL GREY"
],
[
"EARL GREY",
"EARL GREY",
"EARL GREY"
],
[
"ALMACÉN DON YERBA",
"DON YERBA'S STORE",
"ARMAZÉM DOM ERVA"
],
[
"BERGAMOTA TEA CO.",
"BERGAMOT TEA CO.",
"BERGAMOTA TEA CO."
],
[
"EL MUELLE",
"THE PIER",
"O CAIS"
],
[
"Arrastrá para atrás y soltá: así se salta.",
"Drag back and let go: that's how you jump.",
"Arraste para trás e solte: é assim que se pula."
],
[
"En el aire el tiempo se frena. ¡Tocalos para tirarles!",
"In the air, time slows down. Tap them to shoot!",
"No ar o tempo desacelera. Toque neles para atirar!"
],
[
"Arrastrá de costado para deslizarte por abajo.",
"Drag sideways to slide under things.",
"Arraste para o lado para deslizar por baixo."
],
[
"Saltá contra la pared para agarrarte y de ahí saltá otra vez.",
"Jump into a wall to grab it, then jump again from there.",
"Pule contra a parede para se agarrar e pule de novo dali."
],
[
"¡Tirate por el vidrio!",
"Crash through the glass!",
"Atravesse o vidro!"
],
[
"¿Ves la garrafa? Un tiro y chau.",
"See that gas tank? One shot and bye-bye.",
"Viu o botijão? Um tiro e tchau."
],
[
"LOS CONTENEDORES",
"THE CONTAINERS",
"OS CONTÊINERES"
],
[
"Tres juntos y una garrafa. Hacé la cuenta.",
"Three of them and a gas tank. Do the math.",
"Três juntos e um botijão. Faça as contas."
],
[
"¡Cuidado con el tirador! El círculo rojo avisa.",
"Watch out for the sniper! The red ring warns you.",
"Cuidado com o atirador! O círculo vermelho avisa."
],
[
"Pared contra pared: saltá de una a la otra para subir.",
"Wall to wall: jump from one to the other to climb.",
"Parede contra parede: pule de uma para a outra para subir."
],
[
"Tirale a la chapa: la bala rebota sola al más cercano.",
"Shoot the metal plate: the bullet bounces to the nearest one.",
"Atire na chapa: a bala ricocheteia sozinha no mais próximo."
],
[
"EL CARGUERO",
"THE FREIGHTER",
"O CARGUEIRO"
],
[
"Si caés al agua, chau. Saltá largo.",
"Fall in the water and you're done. Jump far.",
"Se cair na água, já era. Pule longe."
],
[
"El puente de mando. Los tablones se cruzan desde abajo.",
"The bridge. You can jump through planks from below.",
"A ponte de comando. Dá para atravessar as tábuas por baixo."
],
[
"Casi, casi. El té de Earl Grey está en la fábrica.",
"Almost there. Earl Grey's tea is at the factory.",
"Quase lá. O chá de Earl Grey está na fábrica."
],
[
"LAS TOLVAS",
"THE HOPPERS",
"AS TREMONHAS"
],
[
"Alambre de púas. Ni se te ocurra.",
"Barbed wire. Don't even think about it.",
"Arame farpado. Nem pense nisso."
],
[
"El vapor te sube. Parate arriba del respiradero.",
"Steam lifts you up. Stand over the vent.",
"O vapor te levanta. Fique em cima do respiradouro."
],
[
"La cinta te lleva. Aprovechala.",
"The belt carries you. Use it.",
"A esteira te leva. Aproveite."
],
[
"LA CINTA",
"THE CONVEYOR",
"A ESTEIRA"
],
[
"Todo viene para acá. Y ellos también.",
"Everything's coming this way. So are they.",
"Tudo vem para cá. E eles também."
],
[
"Deslizarse sobre una cinta a favor es... rápido.",
"Sliding along a moving belt is... fast.",
"Deslizar numa esteira a favor é... rápido."
],
[
"LAS CALDERAS",
"THE BOILERS",
"AS CALDEIRAS"
],
[
"Abajo hay té hirviendo. Ni mojarte los pies.",
"There's boiling tea down there. Don't even dip a toe.",
"Lá embaixo tem chá fervendo. Nem molhe os pés."
],
[
"Arriba está la oficina del capataz. Subí por las paredes.",
"The foreman's office is up top. Climb the walls.",
"O escritório do capataz fica lá em cima. Suba pelas paredes."
],
[
"EL LOBBY",
"THE LOBBY",
"O SAGUÃO"
],
[
"La Torre Bergamota. Earl Grey está en la cima.",
"Bergamot Tower. Earl Grey is at the top.",
"A Torre Bergamota. Earl Grey está no topo."
],
[
"Hueco del ascensor. Ya sabés: pared, pared, pared.",
"Elevator shaft. You know the drill: wall, wall, wall.",
"Poço do elevador. Você já sabe: parede, parede, parede."
],
[
"LAS OFICINAS",
"THE OFFICES",
"OS ESCRITÓRIOS"
],
[
"Siete pisos de burócratas del té. Subí.",
"Seven floors of tea bureaucrats. Go up.",
"Sete andares de burocratas do chá. Suba."
],
[
"LA CIMA",
"THE SUMMIT",
"O TOPO"
],
[
"Puerto Yerba. Una ciudad que se despierta con mate.",
"Puerto Yerba. A city that wakes up with mate.",
"Puerto Yerba. Uma cidade que acorda com chimarrão."
],
[
"Hasta que llegó Lord Earl Grey, el barón del té, con un plan: prohibir el mate.",
"Until Lord Earl Grey, the tea baron, arrived with a plan: to ban mate.",
"Até que chegou Lord Earl Grey, o barão do chá, com um plano: proibir o mate."
],
[
"Sus matones cerraron cada almacén de la costa. La yerba desapareció.",
"His thugs shut down every store on the coast. The yerba vanished.",
"Seus capangas fecharam cada armazém da costa. A erva sumiu."
],
[
"Che... ¿me escuchás? Soy yo, Mateo. Tu mate.",
"Hey... can you hear me? It's me, Mateo. Your mate gourd.",
"Ei... tá me ouvindo? Sou eu, Mateo. Sua cuia."
],
[
"Earl Grey se llevó toda la yerba de la ciudad. Toda.",
"Earl Grey took all the yerba in the city. All of it.",
"Earl Grey levou toda a erva da cidade. Toda."
],
[
"Vamos a buscarla. Vos poné la puntería, yo pongo el sabor.",
"Let's go get it back. You bring the aim, I'll bring the flavor.",
"Vamos buscá-la. Você entra com a mira, eu entro com o sabor."
],
[
"CAPÍTULO 1",
"CHAPTER 1",
"CAPÍTULO 1"
],
[
"EL PUERTO",
"THE HARBOR",
"O PORTO"
],
[
"La yerba entra por el muelle.",
"The yerba comes in through the pier.",
"A erva entra pelo cais."
],
[
"La Fábrica Bergamota. Ahí convierten la yerba confiscada en... té.",
"The Bergamot Factory. That's where they turn seized yerba into... tea.",
"A Fábrica Bergamota. Lá transformam a erva confiscada em... chá."
],
[
"Qué asco. Vamos a apagarles las calderas.",
"Gross. Let's shut down their boilers.",
"Que nojo. Vamos apagar as caldeiras deles."
],
[
"CAPÍTULO 2",
"CHAPTER 2",
"CAPÍTULO 2"
],
[
"LA FÁBRICA",
"THE FACTORY",
"A FÁBRICA"
],
[
"Vapor, cintas y teteras.",
"Steam, belts and teapots.",
"Vapor, esteiras e chaleiras."
],
[
"La Torre Bergamota. Ochenta pisos de té, y arriba de todo, él.",
"Bergamot Tower. Eighty floors of tea, and at the very top, him.",
"A Torre Bergamota. Oitenta andares de chá e, lá no alto, ele."
],
[
"Enmascarado... Subí si te animás. Te espera el té de las cinco.",
"Masked man... Come up if you dare. Five o'clock tea awaits.",
"Mascarado... Suba se tiver coragem. O chá das cinco te espera."
],
[
"Ese tipo me cae peor que el agua hervida.",
"I like that guy less than boiled water.",
"Esse cara me cai pior que água fervida."
],
[
"CAPÍTULO 3",
"CHAPTER 3",
"CAPÍTULO 3"
],
[
"LA TORRE",
"THE TOWER",
"A TORRE"
],
[
"Arriba de todo espera el té.",
"At the very top, the tea awaits.",
"Lá no alto, o chá espera."
],
[
"BARÓN DEL TÉ",
"THE TEA BARON",
"O BARÃO DO CHÁ"
],
[
"Así que vos sos el que anda rompiendo mis vidrios.",
"So you're the one breaking all my windows.",
"Então é você quem anda quebrando meus vidros."
],
[
"¡Y tus teteras! ¡Devolvé la yerba!",
"And your teapots! Give back the yerba!",
"E suas chaleiras! Devolva a erva!"
],
[
"Nadie se resiste al té de las cinco. Nadie.",
"No one resists five o'clock tea. No one.",
"Ninguém resiste ao chá das cinco. Ninguém."
],
[
"Esa mañana, Puerto Yerba volvió a oler a yerba.",
"That morning, Puerto Yerba smelled of yerba again.",
"Naquela manhã, Puerto Yerba voltou a cheirar a erva."
],
[
"¿Lo escuchás? Toda la ciudad está poniendo la pava.",
"Hear that? The whole city is putting the kettle on.",
"Tá ouvindo? A cidade inteira está pondo a chaleira no fogo."
],
[
"Che... ¿y si nos tomamos unos amargos?",
"Hey... how about a few bitter mates?",
"Ei... que tal uns chimarrões?"
],
[
"FIN",
"THE END",
"FIM"
],
[
"MATE AMARGO",
"MATE AMARGO",
"MATE AMARGO"
],
[
"Gracias por jugar.",
"Thanks for playing.",
"Obrigado por jogar."
],
[
"IDEA Y DIRECCIÓN",
"IDEA AND DIRECTION",
"IDEIA E DIREÇÃO"
],
[
"JUNIORS",
"JUNIORS",
"JUNIORS"
],
[
"PROGRAMACIÓN, PIXEL ART, LUZ",
"CODE, PIXEL ART, LIGHTING",
"PROGRAMAÇÃO, PIXEL ART, LUZ"
],
[
"CLAUDE",
"CLAUDE",
"CLAUDE"
],
[
"MÚSICA Y SONIDO",
"MUSIC AND SOUND",
"MÚSICA E SOM"
],
[
"SINTETIZADOS EN EL NAVEGADOR",
"SYNTHESIZED IN THE BROWSER",
"SINTETIZADOS NO NAVEGADOR"
],
[
"HOMENAJE A",
"A TRIBUTE TO",
"UMA HOMENAGEM A"
],
[
"MY FRIEND PEDRO",
"MY FRIEND PEDRO",
"MY FRIEND PEDRO"
],
[
"HECHO EN THECLAUDIANOS",
"MADE AT THECLAUDIANOS",
"FEITO NO THECLAUDIANOS"
],
[
"GRACIAS POR JUGAR",
"THANKS FOR PLAYING",
"OBRIGADO POR JOGAR"
],
[
"Tocá a un enemigo en el aire: todo va en cámara lenta.",
"Tap an enemy while airborne: everything goes slow-mo.",
"Toque num inimigo no ar: tudo fica em câmera lenta."
],
[
"El círculo que se vacía avisa cuándo te van a tirar.",
"The emptying ring tells you when they're about to shoot.",
"O círculo que se esvazia avisa quando vão atirar."
],
[
"Dos dedos, dos enemigos: cada brazo apunta por su lado.",
"Two fingers, two enemies: each arm aims on its own.",
"Dois dedos, dois inimigos: cada braço mira para um lado."
],
[
"Deslizarte te hace más chico: las balas pasan por arriba.",
"Sliding makes you smaller: bullets fly overhead.",
"Deslizar te deixa menor: as balas passam por cima."
],
[
"Una bala contra la chapa busca sola al enemigo más cercano.",
"A bullet off a metal plate seeks the nearest enemy.",
"Uma bala na chapa procura sozinha o inimigo mais próximo."
],
[
"Las garrafas no perdonan. A nadie.",
"Gas tanks forgive no one. No one.",
"Botijões não perdoam. Ninguém."
],
[
"EL CEBADOR",
"THE BREWER",
"O CEVADOR"
],
[
"MATEO",
"MATEO",
"MATEO"
],
[
"MATÓN",
"THUG",
"CAPANGA"
],
[
"RADIO",
"RADIO",
"RÁDIO"
],
[
"¡AÉREO!",
"AIRBORNE!",
"AÉREO!"
],
[
"¡DOBLETE!",
"DOUBLE!",
"DOBRADINHA!"
],
[
"¡TRIPLETE!",
"TRIPLE!",
"TRIPLETE!"
],
[
"¡DESDE LA PARED!",
"OFF THE WALL!",
"DA PAREDE!"
],
[
"¡DESLIZANDO!",
"SLIDING!",
"DESLIZANDO!"
],
[
"¡A LA CABEZA!",
"HEADSHOT!",
"NA CABEÇA!"
],
[
"¡CARAMBOLA!",
"RICOCHET!",
"RICOCHETE!"
],
[
"¡KABOOM!",
"KABOOM!",
"KABUM!"
],
[
"¡CRASH!",
"CRASH!",
"CRASH!"
],
[
"BAR",
"BAR",
"BAR"
],
[
"MATE",
"MATE",
"MATE"
],
[
"YERBA",
"YERBA",
"ERVA"
],
[
"S.S. BERGAMOTA",
"S.S. BERGAMOT",
"S.S. BERGAMOTA"
],
[
"EARL GREY TEA",
"EARL GREY TEA",
"EARL GREY TEA"
],
[
"FIVE O'CLOCK",
"FIVE O'CLOCK",
"FIVE O'CLOCK"
],
[
"PELIGRO",
"DANGER",
"PERIGO"
],
[
"HOTEL",
"HOTEL",
"HOTEL"
],
[
"EARL GREY TEA CO.",
"EARL GREY TEA CO.",
"EARL GREY TEA CO."
],
[
"TÉ",
"TEA",
"CHÁ"
],
[
"CLUB",
"CLUB",
"CLUBE"
],
[
"SAKE",
"SAKE",
"SAKE"
],
[
"Palanca izquierda para moverte. Empujala para arriba y saltás.",
"Left stick to move. Push it up to jump.",
"Alavanca esquerda para andar. Empurre para cima e você pula."
],
[
"Palanca derecha para apuntar y tirar. En el aire, el tiempo se frena.",
"Right stick to aim and shoot. In the air, time slows down.",
"Alavanca direita para mirar e atirar. No ar, o tempo desacelera."
],
[
"Corré y tirá la palanca para abajo: te deslizás por debajo.",
"Run and pull the stick down: you slide underneath.",
"Corra e puxe a alavanca para baixo: você desliza por baixo."
],
[
"Saltá contra la pared empujando hacia ella, y después para arriba.",
"Jump into a wall pushing toward it, then push up.",
"Pule contra a parede empurrando para ela, e depois para cima."
],
[
"Apuntá en el aire con la palanca derecha: todo va en cámara lenta.",
"Aim with the right stick while airborne: everything goes slow-mo.",
"Mire com a alavanca direita no ar: tudo fica em câmera lenta."
],
[
"La mira se engancha sola al enemigo más cercano a donde apuntás.",
"The reticle locks onto the enemy closest to where you aim.",
"A mira trava sozinha no inimigo mais próximo de onde você mira."
],
[
"Corré y bajá la palanca: deslizándote, las balas pasan por arriba.",
"Run and pull the stick down: while sliding, bullets fly overhead.",
"Corra e puxe a alavanca: deslizando, as balas passam por cima."
],
[
"CONTROLES",
"CONTROLS",
"CONTROLES"
],
[
"PALANCAS",
"STICKS",
"ALAVANCAS"
],
[
"ARRASTRE",
"DRAG",
"ARRASTAR"
]
];
