"""preview.py layout.json out.png: a still of the Norse city (layout from preview.mjs, art from src/art/pixel/town-norse, the Greek city's for any piece not drawn yet).
Ground is simplified (snow, paving on the streets, an earth rampart edge); the game paints it in townGround.ts."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

GAME = Path(__file__).resolve().parents[4]
N = GAME / 'src/art/pixel/town-norse'
G = GAME / 'src/art/pixel/town'
L = json.load(open(sys.argv[1]))
W, H = L['stage']['w'], L['stage']['h']
img = Image.new('RGBA', (W, H), (0, 0, 0, 255))
d = ImageDraw.Draw(img)
HOR = 232
for y in range(H):
    if y < HOR:
        t = y / HOR
        c = (int(110 + 90 * t), int(150 + 70 * t), int(200 + 30 * t))
    else:
        c = (232, 238, 245)
    d.line([(0, y), (W, y)], fill=c + (255,))
# far hills
import random
random.seed(3)
for i in range(0, W, 3):
    h = 40 + int(30 * abs(__import__('math').sin(i / 90.0)) + 20 * abs(__import__('math').sin(i / 33.0)))
    d.line([(i, HOR - h), (i, HOR)], fill=(190, 205, 222, 255), width=3)
    d.line([(i, HOR - h), (i, HOR - h + 5)], fill=(245, 248, 252, 255), width=3)
ground = Image.open(N / 'ground.png').convert('RGBA')
for y in range(HOR, H, ground.height):
    for x in range(0, W, ground.width):
        img.alpha_composite(ground, (x, y))
CX, CY, TW, TH, C = L['origin']['x'], L['origin']['y'], 32, 16, L['city']
def ts(i, j): return (CX + (i - j) * TW / 2, CY + (i + j) * TH / 2)
pave = Image.open(N / 'paving.png').convert('RGBA')
# city diamond: paving (sampled from the swatch), garden ring snow
mask = Image.new('L', (W, H), 0); md = ImageDraw.Draw(mask)
md.polygon([ts(0, 0), ts(C, 0), ts(C, C), ts(0, C)], fill=255)
tile = Image.new('RGBA', (W, H))
for y in range(0, H, pave.height):
    for x in range(0, W, pave.width): tile.alpha_composite(pave, (x, y))
# rampart front faces
for a, b, col in ((ts(0, C), ts(C, C), (138, 108, 80, 255)), (ts(C, C), ts(C, 0), (92, 70, 54, 255))):
    d.polygon([a, b, (b[0], b[1] + 14), (a[0], a[1] + 14)], fill=col)
img.paste(tile, (0, 0), mask)
vm = Image.new('L', (W, H), 0); vd = ImageDraw.Draw(vm)
vd.polygon([ts(0, 0), ts(C, 0), ts(C, C), ts(0, C)], fill=255)
vd.polygon([ts(1, 1), ts(C - 1, 1), ts(C - 1, C - 1), ts(1, C - 1)], fill=0)
img.paste(ground.crop((0, 0, 128, 128)).resize((W, H), 0), (0, 0), vm)

def sprite(art):
    for base in (N, G):
        p = base / f'{art}.png'
        if p.exists(): return Image.open(p).convert('RGBA')
def put(art, x, y, flip=False):
    s = sprite(art)
    if flip: s = s.transpose(Image.FLIP_LEFT_RIGHT)
    img.alpha_composite(s, (int(x - s.width // 2), int(y - s.height + 1)))
def put_tl(art, x, y):
    s = sprite(art); img.alpha_composite(s, (x, y))
for p in L['walls']['back']: put_tl(p['art'], p['x'], p['y'])
items = [('p', p) for p in L['pieces']] + [('t', t) for t in L['trees']]
items.sort(key=lambda it: (it[1]['y'], it[1]['x']))
for k, p in items: put(p['art'], p['x'], p['y'], p.get('flip', False))
for p in L['walls']['front']: put_tl(p['art'], p['x'], p['y'])
img.crop((0, 120, W, 700)).convert('RGB').save(sys.argv[2])
print('missing (Greek stand-ins):', L['missing'])
