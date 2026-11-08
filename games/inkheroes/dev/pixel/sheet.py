# usage: sheet.py out.png in1 in2 ... : nearest 4x contact sheet on grey
import sys
from PIL import Image
ims=[Image.open(p).convert('RGBA') for p in sys.argv[2:]]
S=4; W=sum(i.width*S+8 for i in ims); H=max(i.height for i in ims)*S+8
o=Image.new('RGBA',(W,H),(150,130,100,255)); x=4
for i in ims:
    o.alpha_composite(i.resize((i.width*S,i.height*S),Image.NEAREST),(x,4)); x+=i.width*S+8
o.convert('RGB').save(sys.argv[1])
