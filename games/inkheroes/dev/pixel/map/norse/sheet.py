import sys
from PIL import Image
out=sys.argv[1]; fs=sys.argv[2:]
ims=[Image.open(f).convert('RGBA') for f in fs]
W=sum(i.width+8 for i in ims);H=max(i.height for i in ims)
s=Image.new('RGBA',(W,H),(236,242,248,255));x=0
for i in ims: s.alpha_composite(i,(x,H-i.height));x+=i.width+8
sc=3 if W<700 else 2
s.resize((W*sc,H*sc),Image.NEAREST).save(out)
