# Dibuja el esqueleto 2D de MediaPipe sobre los cuadros (verificación) y una vista 3D de los puntos de mundo
import json,sys
from PIL import Image,ImageDraw
S='/tmp/claude-0/-home-user-Theclaudianos/e486f19c-2108-5f63-afca-f65a9ce5e64e/scratchpad/mocap'
pose,carpeta,cuadros,out=sys.argv[1],sys.argv[2],[int(x) for x in sys.argv[3].split(',')],sys.argv[4]
d={f['i']:f for f in json.load(open(f'{S}/{pose}'))}
CON=[(11,12),(11,13),(13,15),(12,14),(14,16),(11,23),(12,24),(23,24),(23,25),(25,27),(27,31),(27,29),(24,26),(26,28),(28,32),(28,30),(0,11),(0,12),(15,19),(16,20)]
W=Image.new('RGB',(len(cuadros)*300,600),'black')
for k,i in enumerate(cuadros):
  im=Image.open(f'{S}/{carpeta}/{i:03d}.jpg');f=d.get(i)
  dr=ImageDraw.Draw(im)
  if f and f['ok']:
    p=f['p2']
    xs=[q[0] for q in p];ys=[q[1] for q in p];cx=(min(xs)+max(xs))/2;cy=(min(ys)+max(ys))/2;L=max(max(xs)-min(xs),max(ys)-min(ys))*1.4+60
    for a,b in CON:
      col=(255,60,60) if (a%2==1 and a>10) else (60,160,255)
      dr.line([tuple(p[a][:2]),tuple(p[b][:2])],fill=col,width=4)
    crop=im.crop((cx-L/2,cy-L/2,cx+L/2,cy+L/2)).resize((300,300))
    # vista 3D de mundo: frente (x,y) y costado (z,y)
    v=Image.new('RGB',(300,300),(20,20,30));dv=ImageDraw.Draw(v);pw=f['pw']
    for a,b in CON:
      A=pw[a];B=pw[b];col=(255,60,60) if (a%2==1 and a>10) else (60,160,255)
      dv.line([(75+A[0]*110,150+A[1]*110),(75+B[0]*110,150+B[1]*110)],fill=col,width=3)
      dv.line([(225+A[2]*110,150+A[1]*110),(225+B[2]*110,150+B[1]*110)],fill=col,width=3)
    dv.text((4,4),f'{i} frente | costado',fill='white')
  else:
    crop=im.resize((300,170));v=Image.new('RGB',(300,300))
  W.paste(crop,(k*300,0));W.paste(v,(k*300,300))
W.save(f'{S}/{out}')
