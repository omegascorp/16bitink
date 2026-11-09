# usage: python3 up.py <png> <upload-url>  -> pads to multiples of 4 (bottom/right transparent), uploads, prints ref
import sys, io, json, subprocess
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA')
w, h = (im.width + 3) // 4 * 4, (im.height + 3) // 4 * 4
o = Image.new('RGBA', (w, h)); o.paste(im, ((w - im.width) // 2, h - im.height))
o.save('/tmp/_up.png')
print(sys.argv[1], o.size, subprocess.run(['curl', '-sS', '-F', 'file=@/tmp/_up.png', sys.argv[2]], capture_output=True, text=True).stdout)
