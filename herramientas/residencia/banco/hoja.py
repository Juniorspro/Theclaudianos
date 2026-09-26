import sys
from PIL import Image
pref=sys.argv[1]; names=sys.argv[2].split(','); out=sys.argv[3]
ims=[Image.open(f'/tmp/ui/res/{pref}_{n}.png').rotate(90,expand=True) for n in names]
w,h=ims[0].size; cols=2; rows=(len(ims)+1)//2
S=Image.new('RGB',(w*cols,h*rows),(0,0,0))
for i,im in enumerate(ims): S.paste(im,((i%cols)*w,(i//cols)*h))
S=S.resize((S.width//2*1,S.height//2*1)) if S.width>1800 else S
S.save(out)
