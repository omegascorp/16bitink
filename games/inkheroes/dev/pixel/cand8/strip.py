import sys
from PIL import Image
# usage: strip.py out.png w h name:pose ... -> stacked strips on a green background
w,h=int(sys.argv[2]),int(sys.argv[3]); rows=[]
for a in sys.argv[4:]:
    rows.append(Image.open(f'anim/{a}.png').convert('RGBA'))
W=max(r.width for r in rows); m=Image.new('RGBA',(W,h*len(rows)),(120,140,110,255))
for i,r in enumerate(rows): m.alpha_composite(r,(0,i*h))
m.save(sys.argv[1]); print(m.size)
