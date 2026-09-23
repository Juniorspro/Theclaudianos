# arma 7_niveles.js: cada nivel se dibuja con piezas en coordenadas de mundo (y = altura desde abajo)
import json
class N:
    def __init__(s, ancho, alto):
        s.w, s.h = ancho, alto; s.g = [['.']*ancho for _ in range(alto)]
    def p(s, x, y, c):
        if 0 <= x < s.w and 0 <= y < s.h: s.g[y][x] = c
    def r(s, x0, y0, x1, y1, c='#'):          # rectángulo inclusivo
        for y in range(y0, y1+1):
            for x in range(x0, x1+1): s.p(x, y, c)
    def suelo(s, x0, x1, h, c='#'): s.r(x0, 0, x1, h-1, c)
    def tablon(s, x0, x1, y): s.r(x0, y, x1, y, '=')
    def filas(s): return [''.join(s.g[y]) for y in range(s.h-1, -1, -1)]
    def ver(s):
        for f in s.filas(): print(f)
NIV = []
def nivel(meta, n): meta['mapa'] = n.filas(); NIV.append(meta); return n

# ---------------------------------------------------------------- 1-1 EL MUELLE (tutorial)
n = N(112, 18)
n.suelo(0, 12, 4); n.p(3, 4, 'P')
n.suelo(17, 34, 4); n.r(23, 4, 24, 5, 'x'); n.p(30, 4, 'm'); n.p(20, 7, 'l')
n.suelo(35, 46, 7); n.p(40, 7, 'm'); n.p(44, 7, 'm'); n.p(38, 11, 'l')
n.suelo(47, 70, 4); n.r(52, 5, 58, 7); n.p(55, 8, 'e'); n.p(50, 8, 'l')
n.r(62, 6, 62, 13); n.r(66, 4, 70, 10)                         # el tiro de pared: colgada a la izquierda, maciza a la derecha
n.suelo(71, 86, 11); n.r(74, 15, 86, 15); n.r(74, 11, 74, 14, 'V'); n.p(78, 11, 'm'); n.p(81, 11, 'e'); n.p(84, 11, 'm'); n.p(80, 14, 'l')
n.suelo(87, 111, 4); n.p(94, 4, 'o'); n.p(93, 4, 'm'); n.p(96, 4, 'm'); n.p(100, 7, 'n')
n.p(108, 4, 'D'); n.r(110, 4, 111, 17)
nivel({'id':'1-1', 'cap':'puerto', 'nombre':'EL MUELLE', 'estrellas':[2000, 4000, 6500], 'neones':['BAR', 'MATE'],
  'pistas':[{'x':4, 'txt':'Arrastrá para atrás y soltá: así se salta.'}, {'x':18, 'txt':'En el aire el tiempo se frena. ¡Tocalos para tirarles!'},
            {'x':48, 'txt':'Arrastrá de costado para deslizarte por abajo.'}, {'x':60, 'txt':'Saltá contra la pared para agarrarte y de ahí saltá otra vez.'},
            {'x':72, 'txt':'¡Tirate por el vidrio!'}, {'x':88, 'txt':'¿Ves la garrafa? Un tiro y chau.'}]}, n)


# ---------------------------------------------------------------- 1-2 LOS CONTENEDORES
n = N(122, 22)
n.suelo(0, 20, 4); n.p(3, 4, 'P'); n.p(12, 4, 'm'); n.p(9, 8, 'l')
n.suelo(21, 32, 7); n.p(26, 7, 'm'); n.p(30, 7, 'm')
n.suelo(33, 39, 4); n.p(35, 4, 'm'); n.p(36, 4, 'o'); n.p(38, 4, 'm')
n.suelo(40, 43, 8); n.tablon(41, 43, 10); n.suelo(44, 48, 13); n.p(47, 13, 't'); n.p(45, 17, 'l')
n.suelo(49, 70, 4); n.tablon(54, 66, 8); n.p(60, 9, 'm'); n.r(62, 4, 62, 7, 'B'); n.p(59, 4, 'o'); n.p(64, 4, 'e'); n.p(67, 4, 'm'); n.p(57, 12, 'n')
n.suelo(71, 91, 4); n.r(71, 6, 85, 9); n.p(76, 4, 'm'); n.p(81, 4, 'p'); n.p(84, 4, 'x'); n.p(78, 5, 'l')
n.r(88, 7, 88, 17); n.r(92, 4, 121, 13); n.p(90, 4, 'm')
n.r(103, 14, 104, 15, 'x'); n.p(99, 16, 'c'); n.p(97, 14, 'm'); n.p(106, 14, 'e'); n.p(109, 14, 'm'); n.p(101, 18, 'l'); n.p(112, 14, 't')
n.p(117, 14, 'D'); n.r(120, 14, 121, 21)
nivel({'id':'1-2', 'cap':'puerto', 'nombre':'LOS CONTENEDORES', 'estrellas':[3500, 7000, 11000], 'neones':['YERBA'],
  'pistas':[{'x':30, 'txt':'Tres juntos y una garrafa. Hacé la cuenta.'}, {'x':41, 'txt':'¡Cuidado con el tirador! El círculo rojo avisa.'},
            {'x':88, 'txt':'Pared contra pared: saltá de una a la otra para subir.'}, {'x':96, 'txt':'Tirale a la chapa: la bala rebota sola al más cercano.'}]}, n)

# ---------------------------------------------------------------- 1-3 EL CARGUERO
n = N(130, 22)
n.suelo(0, 14, 5); n.p(3, 5, 'P'); n.p(10, 5, 'm'); n.r(6, 5, 6, 5, 'x'); n.p(12, 9, 'l')
n.suelo(19, 24, 8); n.suelo(25, 125, 7)
n.r(32, 7, 37, 9); n.r(50, 7, 55, 9); n.p(29, 7, 'm'); n.p(42, 7, 'o'); n.p(44, 7, 'e'); n.p(47, 7, 'm'); n.p(53, 10, 't'); n.p(35, 10, 'm'); n.p(62, 7, 'm'); n.p(40, 12, 'l')
n.r(70, 10, 70, 18); n.r(70, 7, 70, 9, 'V'); n.tablon(71, 95, 10); n.tablon(71, 95, 14); n.r(70, 18, 96, 18); n.r(96, 7, 96, 14); n.r(96, 15, 96, 17, 'V')
n.p(76, 7, 'm'); n.p(88, 7, 'p'); n.p(80, 11, 'e'); n.p(91, 11, 'm'); n.p(75, 15, 'm'); n.p(86, 15, 'e'); n.p(93, 15, 't'); n.p(83, 9, 'l'); n.p(78, 13, 'l'); n.p(90, 17, 'l'); n.p(74, 20, 'n')
n.suelo(97, 125, 7); n.p(104, 7, 'm'); n.p(107, 7, 'o'); n.p(109, 7, 'm'); n.p(113, 9, 'c'); n.p(118, 7, 'e'); n.r(115, 7, 116, 8, 'x'); n.p(110, 11, 'l')
n.p(123, 7, 'D'); n.r(126, 7, 129, 13)
nivel({'id':'1-3', 'cap':'puerto', 'nombre':'EL CARGUERO', 'estrellas':[5000, 10000, 15000], 'neones':['S.S. BERGAMOTA'],
  'pistas':[{'x':16, 'txt':'Si caés al agua, chau. Saltá largo.'}, {'x':66, 'txt':'El puente de mando. Los tablones se cruzan desde abajo.'},
            {'x':99, 'txt':'Casi, casi. El té de Earl Grey está en la fábrica.'}]}, n)

# ---------------------------------------------------------------- 2-1 LAS TOLVAS
n = N(96, 20)
n.r(0, 17, 95, 19)
n.suelo(0, 95, 4); n.p(3, 4, 'P'); n.p(12, 4, 'm'); n.p(8, 9, 'l')
n.r(16, 4, 22, 4, '^'); n.tablon(17, 19, 7)
n.r(28, 4, 31, 7); n.p(26, 4, 'e'); n.p(30, 8, 'm'); n.p(38, 4, 'e'); n.r(25, 13, 33, 16); n.p(29, 12, 'l')
n.p(44, 3, 'v'); n.tablon(41, 55, 11); n.p(48, 12, 'm'); n.p(52, 12, 'm'); n.p(54, 12, 't'); n.p(47, 15, 'l')
n.r(56, 11, 66, 11, '>'); n.p(62, 12, 'm'); n.r(67, 4, 67, 11)
n.r(75, 4, 75, 7, 'B'); n.p(73, 4, 'o'); n.p(78, 4, 'e'); n.p(82, 4, 'p'); n.p(80, 9, 'l')
n.p(90, 4, 'D'); n.r(94, 4, 95, 16)
nivel({'id':'2-1', 'cap':'fabrica', 'nombre':'LAS TOLVAS', 'estrellas':[3500, 7000, 11000], 'neones':['EARL GREY TEA'],
  'pistas':[{'x':14, 'txt':'Alambre de púas. Ni se te ocurra.'}, {'x':40, 'txt':'El vapor te sube. Parate arriba del respiradero.'},
            {'x':57, 'txt':'La cinta te lleva. Aprovechala.'}]}, n)

# ---------------------------------------------------------------- 2-2 LA CINTA
n = N(108, 20)
n.r(0, 17, 107, 19)
n.suelo(0, 107, 4); n.p(2, 4, 'P')
n.r(10, 3, 55, 3, '<'); n.p(12, 3, 'v'); n.p(50, 3, 'v'); n.p(25, 4, 'm'); n.p(35, 4, 'm'); n.p(45, 4, 'e')
n.r(14, 9, 60, 9, '>'); n.p(40, 10, 'm'); n.p(58, 10, 't'); n.p(30, 10, 'e'); n.p(22, 14, 'l'); n.p(44, 14, 'l'); n.p(30, 7, 'l')
n.r(62, 4, 66, 4, '^'); n.tablon(61, 67, 7)
n.r(72, 4, 72, 7, 'V'); n.r(72, 8, 95, 9); n.p(78, 4, 'e'); n.p(84, 4, 'm'); n.p(86, 4, 'o'); n.p(90, 4, 'p'); n.p(82, 7, 'l'); n.p(88, 12, 'n')
n.p(101, 4, 'D'); n.r(106, 4, 107, 16)
nivel({'id':'2-2', 'cap':'fabrica', 'nombre':'LA CINTA', 'estrellas':[4000, 8000, 12500], 'neones':["FIVE O'CLOCK"],
  'pistas':[{'x':6, 'txt':'Todo viene para acá. Y ellos también.'}, {'x':58, 'txt':'Deslizarse sobre una cinta a favor es... rápido.'}]}, n)

# ---------------------------------------------------------------- 2-3 LAS CALDERAS
n = N(72, 30)
n.suelo(0, 12, 5); n.p(3, 5, 'P'); n.p(8, 9, 'l')
n.suelo(16, 24, 9); n.p(20, 9, 'm'); n.p(22, 9, 'o'); n.p(18, 9, 'm')
n.suelo(25, 27, 4); n.p(26, 3, 'v'); n.tablon(25, 40, 11); n.p(33, 12, 'e'); n.p(38, 12, 'm'); n.p(31, 16, 'l')
n.r(41, 17, 41, 26); n.r(42, 11, 46, 11); n.suelo(47, 71, 25)
n.p(53, 25, 'm'); n.p(55, 25, 'p'); n.p(59, 25, 'o'); n.p(61, 25, 'e'); n.p(64, 25, 'm'); n.p(57, 28, 'l'); n.p(44, 20, 'l')
n.p(68, 25, 'D')
nivel({'id':'2-3', 'cap':'fabrica', 'nombre':'LAS CALDERAS', 'estrellas':[3500, 7000, 11000], 'neones':['PELIGRO'],
  'pistas':[{'x':4, 'txt':'Abajo hay té hirviendo. Ni mojarte los pies.'}, {'x':40, 'txt':'Arriba está la oficina del capataz. Subí por las paredes.'}]}, n)

# ---------------------------------------------------------------- 3-1 EL LOBBY
n = N(122, 22)
n.suelo(0, 121, 4); n.p(3, 4, 'P'); n.p(8, 8, 'n')
n.r(12, 4, 12, 7, 'V'); n.r(12, 8, 60, 12); n.p(20, 4, 'm'); n.p(24, 4, 'm'); n.p(30, 4, 'e'); n.r(33, 4, 36, 4, 'x'); n.p(38, 4, 'p'); n.p(46, 4, 'm')
n.p(18, 7, 'l'); n.p(28, 7, 'l'); n.p(42, 7, 'l'); n.p(54, 7, 'l')
n.r(40, 8, 58, 8, '.'); n.tablon(40, 58, 8); n.r(40, 9, 60, 12, '#'); n.r(40, 9, 58, 11, '.'); n.p(55, 9, 't'); n.p(50, 9, 'e')
n.r(62, 7, 62, 20); n.r(66, 4, 70, 17); n.suelo(71, 121, 18); n.r(66, 21, 121, 21)
n.r(80, 18, 80, 20, 'V'); n.r(95, 18, 95, 20, 'V'); n.p(75, 18, 'm'); n.p(85, 18, 'e'); n.p(90, 18, 'm'); n.p(100, 18, 'p'); n.p(98, 18, 'o'); n.p(110, 18, 't')
n.p(77, 20, 'l'); n.p(92, 20, 'l'); n.p(106, 20, 'l')
n.p(116, 18, 'D'); n.r(120, 18, 121, 20)
nivel({'id':'3-1', 'cap':'torre', 'nombre':'EL LOBBY', 'estrellas':[5000, 10000, 16000], 'neones':['HOTEL', 'EARL GREY'],
  'pistas':[{'x':6, 'txt':'La Torre Bergamota. Earl Grey está en la cima.'}, {'x':60, 'txt':'Hueco del ascensor. Ya sabés: pared, pared, pared.'}]}, n)

# ---------------------------------------------------------------- 3-2 LAS OFICINAS
n = N(60, 42)
n.suelo(0, 59, 4); n.r(0, 4, 1, 41); n.r(58, 4, 59, 41); n.p(4, 4, 'P')
pisos = [4, 9, 14, 19, 24, 29, 34]
for k, s in enumerate(pisos[1:]):
    y = s - 1; n.r(2, y, 57, y)
    h0, h1 = (50, 53) if k % 2 == 0 else (6, 9)
    n.r(h0, y, h1, y, '.'); n.r(h0 - 1, s - 5, h1 + 1, s - 5, 'x') if False else None
    n.p(h0 + 1, pisos[k], 'x'); n.p(h0 + 2, pisos[k], 'x')
bichos = [[(20, 'm'), (34, 'e')], [(15, 'm'), (30, 't'), (44, 'm')], [(22, 'e'), (38, 'm')], [(14, 'p'), (32, 'm'), (46, 'e')], [(20, 'm'), (36, 'o'), (38, 'e')], [(16, 't'), (28, 'm'), (44, 'p')], [(30, 'm'), (40, 'e')]]
for k, s in enumerate(pisos):
    for x, c in bichos[k]: n.p(x, s, c)
    n.p(12 + (k*7) % 30, s + 3, 'l'); n.p(40 - (k*5) % 20, s + 3, 'l')
    if k % 2: n.r(26, s, 26, s + 2, 'V')
n.p(54, 34, 'D'); n.r(2, 39, 57, 39)
nivel({'id':'3-2', 'cap':'torre', 'nombre':'LAS OFICINAS', 'estrellas':[5000, 10000, 16000], 'neones':[],
  'pistas':[{'x':5, 'txt':'Siete pisos de burócratas del té. Subí.'}]}, n)

# ---------------------------------------------------------------- 3-3 LA CIMA (el jefe)
n = N(30, 20)
n.suelo(0, 29, 4); n.r(0, 4, 1, 19); n.r(28, 4, 29, 19); n.p(4, 4, 'P')
n.tablon(3, 8, 8); n.tablon(21, 26, 8); n.tablon(11, 18, 12); n.p(24, 4, 'J')
n.p(5, 11, 'l'); n.p(24, 11, 'l'); n.p(14, 15, 'l'); n.p(14, 17, 'n')
nivel({'id':'3-3', 'cap':'torre', 'nombre':'LA CIMA', 'estrellas':[8000, 14000, 20000], 'neones':['EARL GREY TEA CO.'], 'jefe':True, 'pistas':[]}, n)

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1: NIV[int(sys.argv[1])] and print('\n'.join(NIV[int(sys.argv[1])]['mapa']))
    js = '/* ================================================================ los niveles (salen de niveles.py) */\nconst NIVELES = ' + json.dumps(NIV, ensure_ascii=False, indent=0) + ';\n'
    open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '7_niveles.js'), 'w').write(js)
