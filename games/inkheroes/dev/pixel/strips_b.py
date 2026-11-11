# usage: python3 strips_b.py out.png unit... -> contact sheet: one row per unit, idle/walk/attack strips stacked (x2)
import sys
from PIL import Image
from pathlib import Path
A=Path(__file__).parent/'anim'
rows=[]
for u in sys.argv[2:]:
    for pose in ('idle','walk','attack'):
        f=A/f'{u}-{pose}.png'
        if f.exists(): rows.append(Image.open(f).convert('RGBA'))
W=max(r.width for r in rows); H=sum(r.height+2 for r in rows)
s=Image.new('RGBA',(W,H),(120,125,135,255)); y=0
for r in rows: s.alpha_composite(r,(0,y)); y+=r.height+2
sc=2 if W<=700 else 1
s=s.resize((W*sc,H*sc),Image.NEAREST); s.save(sys.argv[1]); print(s.size)
