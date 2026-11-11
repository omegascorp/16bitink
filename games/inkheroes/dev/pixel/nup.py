# usage: python3 nup.py <url> file.png ... -> uploads (pads to x4) and prints refs
import sys, io, json, subprocess, tempfile
from PIL import Image
url=sys.argv[1]
for f in sys.argv[2:]:
    im=Image.open(f).convert('RGBA'); w,h=(im.width+3)//4*4,(im.height+3)//4*4
    o=Image.new('RGBA',(w,h)); o.paste(im,((w-im.width)//2,h-im.height))
    t=tempfile.mktemp(suffix='.png'); o.save(t)
    r=subprocess.run(['curl','-sS','-F',f'file=@{t}',url],capture_output=True,text=True).stdout
    print(f,o.size,json.loads(r).get('ref'))
