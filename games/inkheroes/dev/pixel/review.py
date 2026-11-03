# Contact sheet of a unit's strips (idle / walk / attack rows) on a grass-green ground, x2.
# Usage: python3 dev/pixel/review.py <out.png> <unit> [<unit> ...]
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ANIM = Path(__file__).parent / 'anim'
out, units = sys.argv[1], sys.argv[2:]
rows = []
for u in units:
    for pose in ('idle', 'walk', 'attack'):
        p = ANIM / f'{u}-{pose}.png'
        if p.exists():
            rows.append(Image.open(p).convert('RGBA'))
W = max(r.width for r in rows)
H = sum(r.height for r in rows)
sheet = Image.new('RGBA', (W, H), (104, 128, 80, 255))
d = ImageDraw.Draw(sheet)
y = 0
for r in rows:
    sheet.alpha_composite(r, (0, y))
    d.line([0, y, W, y], fill=(70, 90, 55, 255))
    y += r.height
sheet.resize((W * 2, H * 2), Image.NEAREST).save(out)
print(out, sheet.size)
