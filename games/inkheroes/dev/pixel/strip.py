# usage: strip.py out.png strip1 strip2 ... (2x, grey bg, stacked rows)
import sys
from PIL import Image
ims=[Image.open(p).convert('RGBA') for p in sys.argv[2:]]
W=max(i.width for i in ims); H=sum(i.height for i in ims)
o=Image.new('RGBA',(W,H),(150,130,100,255)); y=0
for i in ims: o.alpha_composite(i,(0,y)); y+=i.height
s=2 if W<1000 else 1
o.resize((W*s,H*s),Image.NEAREST).convert('RGB').save(sys.argv[1])
