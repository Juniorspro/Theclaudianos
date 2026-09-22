K='#141018'
def pal(**kw):
    base = dict(k=K, e='#ffffff', r='#ff4d6a', p='#e8b078', P='#b98352', z='#2a2230', Z='#1a1520')
    base.update(kw); return base
TIPOS = {
 'guardia':   dict(cab='casco', tor='base', pal=pal(a='#c0413a',A='#86292a',b='#3a3040',B='#262030',c='#9a98a8',C='#63617a',d='#2a2230',g='#3a3040',G='#262030')),
 'escudero':  dict(cab='casco_nariz', tor='coraza', escudo=1, pal=pal(a='#7a7f92',A='#565a6b',b='#33363f',B='#23252c',c='#aeb3c4',C='#6e7386',d='#c9a13a',g='#2c2f36',G='#1d1f24')),
 'cuchillero':dict(cab='gorra', tor='base', pal=pal(a='#4a9a60',A='#2f6b40',b='#2a3a32',B='#1b2620',c='#2e5c3c',C='#1e3d28',d='#c9a13a',g='#243028',G='#16201a')),
 'pesado':    dict(cab='pelado_barba', tor='base', pal=pal(a='#8a5a2e',A='#5f3d1e',b='#3b2d20',B='#281e15',c='#8a5a2e',C='#5f3d1e',d='#3a2a1c',h='#3a2a1c',H='#241a10',g='#e8b078',G='#b98352')),
 'ninja':     dict(cab='capucha', tor='base', pal=pal(a='#3b2f55',A='#241c38',b='#241c38',B='#161026',c='#3b2f55',C='#241c38',d='#171226',g='#171226',G='#0e0a18')),
 'tirador':   dict(cab='gorra', tor='base', pal=pal(a='#6b7a42',A='#48542c',b='#2f3522',B='#1f2416',c='#3f4726',C='#2a301a',d='#1f2416',g='#26291c',G='#181a12')),
 'elite':     dict(cab='casco_nariz', tor='coraza', pal=pal(a='#2c2c38',A='#1c1c26',b='#1d1d26',B='#121218',c='#d8b040',C='#a07c20',d='#ff7a2f',g='#15151c',G='#0c0c10',r='#ff7a2f')),
 'comando':   dict(cab='boina_bigote', tor='base', pal=pal(a='#6b7a4a',A='#48542f',b='#33382a',B='#22261c',c='#9c2f2f',C='#6a1f1f',d='#3a2a1c',h='#3a2a1c',H='#241a10',g='#232618',G='#16180f')),
 'carnicero': dict(cab='pelado_barba', tor='mandil', pal=pal(a='#a34040',A='#6e2a2a',b='#3a2626',B='#271a1a',c='#a34040',C='#6e2a2a',d='#2b1f1a',h='#2b1f1a',H='#1a120f',e='#e8e2d4',r='#b3262e',g='#2a1c1c',G='#1a1010')),
 'gemelo':    dict(cab='capucha', tor='base', pal=pal(a='#5a3470',A='#3b2249',b='#2a1a34',B='#1a1022',c='#5a3470',C='#3b2249',d='#ff4d6a',g='#160f1e',G='#0c0812')),
 'rey':       dict(cab='corona_barba', tor='manto', pal=pal(a='#4a2466',A='#301844',b='#241433',B='#170c22',c='#ffd24a',C='#c09a20',d='#ffd24a',h='#c9c4bb',H='#8f8a82',r='#ff3a2f',g='#1a0f26',G='#0e0816',p='#ecc79c',P='#bd9468')),
}
# la barba del rey es gris: el rol d se usa para oro en corona/manto; la barba usa D en sombra.
