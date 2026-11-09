"""contact.py out.png name... : a contact sheet of iso/<name>.png on sand for review."""
import sys
from pathlib import Path
from PIL import Image
D = Path(__file__).parent / 'iso'
ims = [Image.open(D / f'{n}.png').convert('RGBA') for n in sys.argv[2:]]
W = 1500; x = y = rowh = 0
pos = []
for i in ims:
    if x + i.width > W: x, y, rowh = 0, y + rowh + 6, 0
    pos.append((x, y)); x += i.width + 6; rowh = max(rowh, i.height)
sheet = Image.new('RGBA', (W, y + rowh), (120, 150, 110, 255))
for i, p in zip(ims, pos): sheet.alpha_composite(i, p)
sheet.save(sys.argv[1])
