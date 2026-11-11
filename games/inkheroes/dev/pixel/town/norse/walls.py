"""walls.py pad|unpad: the Greek wall pieces padded (bottom/right, transparent) to multiples of 4 for edit_image_pixen (walls/in-*.png),
and the edited ones (walls/out-*.png) cropped back to the Greek piece's size (iso/<name>.png), so every foot line and corner point in townWalls.ts holds."""
import sys
from pathlib import Path
from PIL import Image

HERE = Path(__file__).parent
SRC = HERE.parents[3] / 'src' / 'art' / 'pixel' / 'town'
NAMES = ['walls-fort', 'walls-citadel', 'walls-castle', 'wall', 'wall-up', 'wall-gate', 'corner-front', 'corner-back', 'corner-left', 'corner-left-rear', 'corner-right', 'corner-right-rear']
up = lambda n: (n + 3) // 4 * 4

if sys.argv[1] == 'pad':
    for n in NAMES:
        im = Image.open(SRC / f'{n}.png').convert('RGBA')
        c = Image.new('RGBA', (up(im.width), up(im.height)))
        c.paste(im, (0, 0))
        c.save(HERE / 'walls' / f'in-{n}.png')
        print(n, im.size, c.size)
else:
    for n in NAMES:
        f = HERE / 'walls' / f'out-{n}.png'
        if not f.exists():
            continue
        g = Image.open(SRC / f'{n}.png')
        Image.open(f).convert('RGBA').crop((0, 0, g.width, g.height)).save(HERE / 'iso' / f'{n}.png')
        print('ok', n)
