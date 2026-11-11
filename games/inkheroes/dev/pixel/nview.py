# usage: python3 nview.py out.png scale file1 file2 ...  -> side-by-side magnified contact sheet on grey
import sys
from PIL import Image
out, sc, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims=[Image.open(f).convert('RGBA') for f in files]
w=sum(i.width*sc+8 for i in ims); h=max(i.height*sc for i in ims)+8
s=Image.new('RGBA',(w,h),(120,125,135,255)); x=4
for i in ims:
    s.alpha_composite(i.resize((i.width*sc,i.height*sc),Image.NEAREST),(x,h-4-i.height*sc)); x+=i.width*sc+8
s.save(out)
