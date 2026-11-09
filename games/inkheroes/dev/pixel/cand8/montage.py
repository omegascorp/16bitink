import sys
from PIL import Image
names=sys.argv[2:]; cell=int(sys.argv[1])
cols=min(4,len(names)); rows=(len(names)+3)//4
m=Image.new('RGBA',(cell*cols,cell*rows),(120,140,110,255))
for i,k in enumerate(names):
    im=Image.open(f'cand8/{k}.png').convert('RGBA'); m.alpha_composite(im,((i%4)*cell,(i//4)*cell))
m=m.resize((m.width*2,m.height*2),Image.NEAREST); m.save('cand8/_m.png'); print(m.size)
