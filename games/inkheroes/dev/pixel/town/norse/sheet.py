"""sheet.py out.png file... : files side by side on a grey-blue ground (heroes review)."""
import sys
from PIL import Image
ims = [Image.open(f).convert('RGBA') for f in sys.argv[2:]]
W = sum(i.width for i in ims) + 6 * len(ims)
s = Image.new('RGBA', (W, max(i.height for i in ims)), (110, 130, 150, 255))
x = 0
for i in ims:
    s.alpha_composite(i, (x, 0)); x += i.width + 6
s.save(sys.argv[1])
