# Kit de piezas pixel art para enemigos. Letras = ROLES, cada tipo trae su paleta.
# k contorno · p/P piel · a/A uniforme · b/B pantalón · c/C casco/accesorio · d/D detalle
# e blanco de ojo · r ojo rojo · g/G guante · z/Z bota
W = 23
def fila(s): 
    assert len(s)==W, (len(s), s)
    return s
CARA = [  # filas 7..21 de la cabeza: cara redonda, ceño y ojos chicos de matón
 "......kkkkkkkkkkk......",
 "....kkpppppppppppkk....",
 "...kpppppppppppppppk...",
 "..kpppppppppppppppppk..",
 "..kpppppppppppppppppk..",
 ".kPpppppppkkkppppkkkpk.",
 ".kPppppppkkekkpppkekpk.",
 ".kPpppppppkkkppppkkkpk.",
 ".kPPpppppppppppppppppk.",
 "..kPpppppppppppkkkkpk..",
 "..kPPppppppppppppppk...",
 "...kPPPpppppppppppPk...",
 "....kkPPPPPPPPPPPPk....",
 "......kkkkkkkkkkkk.....",
]
def cabeza(sombrero=None, sobre=None):
    g = [list("."*W) for _ in range(22)]
    for i,r in enumerate(CARA):
        for x,c in enumerate(fila(r)): g[8+i][x]=c
    for capa in (sombrero, sobre):
        if not capa: continue
        y0, filas = capa
        for i,r in enumerate(filas):
            for x,c in enumerate(fila(r)):
                if c!='_': g[y0+i][x]=c
    return [''.join(r) for r in g]
CASCO = (1,[
 "_______kkkkkkkk________",
 "_____kkccccccccck______",
 "____kcccccccccccck_____",
 "___kcCcccccccccccck____",
 "__kcCcccccccccccccck___",
 "__kcCccccccccccccccck__",
 "__kCCccccccccccccccck__",
 "_kCCCccccccccccccccck__",
 "_kkkkkkkkkkkkkkkkkkkkk_",
 "_kCCCCCCCCCCCCCCCCCCk__",
 "__kkk___________kkk____",
])
CASCO_NARIZ = (12,[
 "__________________kk___",
 "__________________ck___",
 "__________________ck___",
])
GORRA = (3,[
 "_______kkkkkkkkk_______",
 "_____kkcccccccccck_____",
 "____kcCccccccccccck____",
 "___kcCcccccccccccccck__",
 "___kCCcccccccccccccccck",
 "___kkkkkkkkkkkkkkkkkkkk",
 "____kkk____________kk__",
])
PELADO = (4,[
 "_______kkkkkkkk________",
 "_____kkppppppppkk______",
 "____kpppppppppppk______",
 "___kPppppppppppppk_____",
])
BARBA = (16,[
 "__kPppphhhhhhhhhhhpk___",
 "__kPhhhhhhhhhhhhhhhk___",
 "___khhhhhhhhhhhhhhk____",
 "____khhhhHHHHhhhhk_____",
 "_____kkkhhhhhhkkk______",
 "________kkkkkk_________",
])
BIGOTE = (17,[
 "___________khhhhhhk____",
 "____________kkkkkk_____",
])
CAPUCHA = (1,[
 "_______kkkkkkkk________",
 "_____kkccccccccck______",
 "____kcccccccccccck_____",
 "___kcCccccccccccccck___",
 "__kcCcccccccccccccccc__",
 "__kcCccccccccccccccck__",
 "__kCCccccccccccccccck__",
 "_kCCcccccccccccccccck__",
 "_kCcccccccccccccccccck_",
 "_kCcccccccccccccccccck_",
 "_kCCcccccccccccccccck__",
 "_kCCkkkkkkkkkkkkkkkkk__",
 "_kCkrrrkkkkkkrrrrkk_k__",
 "_kCkkkkkkkkkkkkkkkkk_k_",
 "_kCCcccccccccccccccck__",
 "_kCCcccccccccccccccck__",
 "__kCCccccccccccccccck__",
 "__kCCCccccccccccccck___",
 "___kCCCCccccccccCck____",
 "____kkCCCCCCCCCCCk_____",
 "______kkkkkkkkkkk______",
])
CORONA = (1,[
 "_____k___k___k___k_____",
 "____kdk_kdk_kdk_kdk____",
 "____kdkkkdkkkdkkkdk____",
 "____kddddrddddrdddk____",
 "____kDDDDDDDDDDDDDk____",
 "____kkkkkkkkkkkkkkk____",
])
BOINA = (3,[
 "________kkkkkkkk_______",
 "_____kkkccccccccck_____",
 "___kkcccccccccccccck___",
 "__kCcccccccccccccccck__",
 "__kCCCCCCCCCCCCCCCCCk__",
 "___kkkkkkkkkkkkkkkkk___",
])
def cabeza_multi(*capas):
    g=[list(r) for r in cabeza()]
    for y0,filas in capas:
        for i,r in enumerate(filas):
            for x,c in enumerate(r):
                if c!='_': g[y0+i][x]=c
    return [''.join(r) for r in g]
CABEZAS = {
 'casco': cabeza(CASCO),
 'casco_nariz': cabeza(CASCO, CASCO_NARIZ),
 'gorra': cabeza(GORRA),
 'pelado_barba': cabeza_multi(PELADO, BARBA),
 'capucha': cabeza(CAPUCHA),
 'boina_bigote': cabeza(BOINA, BIGOTE),
 'corona_barba': cabeza_multi(PELADO, CORONA, BARBA),
}
T = 17
TORSOS = {
 'base': [
  "..kkkkkkkkkkkkk..",
  ".kaaaaaaaaaaaaak.",
  "kaaaaaaaaaaaaaaak",
  "kAaaaaaaaaaaaaAak",
  "kAAaaaaaaaaaaAAak",
  ".kAaaaaaaaaaaAak.",
  ".kAAaaaaaaaaaAAk.",
  ".kkkkkkkkkkkkkkk.",
  ".kdddddcdddddddk.",
  ".kkkkkkkkkkkkkkk.",
  "..kBbbbbbbbbbbBk.",
  "..kkkkkkkkkkkkkk.",
 ],
 'mandil': [
  "..kkkkkkkkkkkkk..",
  ".kaaakeeeeekaaak.",
  "kaaaakeeeeekaaaak",
  "kAaaakeeeeekaaAak",
  "kAAakeeeeeeekAAak",
  ".kAakeeerreekAak.",
  ".kAkeeeeeeeeekAk.",
  ".kkkeeeerreeeekk.",
  ".kkeeeeeeeeeeekk.",
  ".kkeeeeeeeeeeekk.",
  "..kBkkkkkkkkkBBk.",
  "..kkkkkkkkkkkkkk.",
 ],
 'coraza': [
  "..kkkkkkkkkkkkk..",
  ".kcccccccccccck..",
  "kcCccccccccccccck",
  "kCCcckccckccccCck",
  "kCCccckcccckccCck",
  ".kCccccckccccCck.",
  ".kCCcccccccccCCk.",
  ".kkkkkkkkkkkkkkk.",
  ".kddddddrdddddddk"[:17],
  ".kkkkkkkkkkkkkkk.",
  "..kBbbbbbbbbbbBk.",
  "..kkkkkkkkkkkkkk.",
 ],
 'manto': [
  "..kkkkkkkkkkkkk..",
  ".kdaaaaaaaaaaadk.",
  "kdaaaaaaaaaaaaadk",
  "kdAaaaaaddaaaAadk",
  "kdAAaaaaddaaAAadk",
  ".kdAaaaaddaaAadk.",
  ".kdAAaaaddaaAAdk.",
  ".kkkkkkkkkkkkkkk.",
  ".kdddddrrddddddk.",
  ".kkkkkkkkkkkkkkk.",
  "..kAaaaaaaaaaaAk.",
  "..kkkkkkkkkkkkkk.",
 ],
}
PUNO_D = [".kkkkkk.","kgggggGk","kgGgGggk","kggggggk","kGgggggk","kGGGGGGk",".kkkkkk."]
PUNO_T = [".kkkkkk.","kGggggGk","kGGgGgGk","kGggggGk","kGGGGGGk","kkGGGGkk",".kkkkkk."]
PIERNA_T = [
 "....kkkkkkkk.",
 "...kBbbbbbbbk",
 "...kBbbbbbbbk",
 "...kBBbbbbbbk",
 "...kBBbbbbbk.",
 "...kBBbbbbbk.",
 "...kBBbbbbbk.",
 "...kBBbbbbbk.",
 "..kkkkkkkkkk.",
 "..kZzzzzzzzk.",
 "..kZZzzzzzzzk"[:13],
 "..kkkkkkkkkkk"[:13],
]
PIERNA_D = [
 "kkkkkkkkk.....",
 "kbbbbbbbBk....",
 "kbbbbbbbBk....",
 "kbbbbbbBBk....",
 ".kbbbbbBBk....",
 ".kbbbbbBBk....",
 ".kbbbbbBBk....",
 ".kbbbbbBBk....",
 ".kkkkkkkkkk...",
 ".kzzzzzzzZk...",
 ".kzzzzzzzzZZk.",
 ".kkkkkkkkkkkk.",
]
PIE = [".kkkkkk.","kzzzzzzk","kZzzzzZk","kkkkkkkk"]
ESCUDO = [
 ".kkkkkk.",
 "kccccCck",
 "kcCcccCk",
 "kcCddcCk",
 "kcCddcCk",
 "kcCddcCk",
 "kcCcccCk",
 "kcccccCk",
 "kcCcccCk",
 "kcCcccCk",
 ".kcccCk.",
 "..kkkk..",
]
