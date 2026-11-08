# Composes the test battle from PixelLab sprites on one locked pixel grid.
# Layout is in logical 16-bit units (320×180); density S maps it to S device
# pixels per unit. Sprites are pasted 1:1 at whole-pixel offsets: never scaled,
# rotated or flipped. Usage: python3 compose.py 16|32|64
import sys
from PIL import Image, ImageDraw

DENSITY = {'16': 1, '32': 2, '64': 4}
ASSETS = {
    '16': dict(bg='s16-bg.png', knight='s16-knight.png', griffin='s16-griffin.png', wolf='s16-wolf.png'),
    '32': dict(bg='b32-bg2.png', knight='optB-knight.png', griffin='optB-griffin.png', wolf='b32-wolf.png'),
    '64': dict(bg='s64-bg.png', knight='s64-knight.png', griffin='s64-griffin.png', wolf='s64-wolf.png'),
}
# Baked-in ground shadows to drop (colour, from this row down); compose draws its own.
STRIP = {'s64-griffin.png': ((85, 80, 72), 145)}
# 64-bit is 1280×720; one generation tops out near 640×360, so it shows a
# native close-up: this logical window (x, y) of the battle at ×4.
CROP64 = (92, 90)
HEX_W, HEX_H, ROW_STEP = 22, 16, 13
ROWS = [120 + ROW_STEP * r for r in range(5)]
HEX_LINE = (12, 28, 6, 120)
HEX_LINE_HI = (12, 28, 6, 175)  # 1px lines read lighter at higher density
HIGHLIGHT = (245, 205, 90, 230)
HIGHLIGHT_FILL = (245, 205, 90, 60)
SHADOW = (16, 30, 10, 90)
# (sprite, logical foot x, foot y, stack count, side)
UNITS = [
    ('knight', 24, 142, 0, 'player'),
    ('griffin', 116, 149, 8, 'player'),
    ('wolf', 215, 136, 12, 'neutral'),
    ('wolf', 259, 162, 9, 'neutral'),
]
BADGE = {'player': ((54, 74, 150), (150, 175, 235)), 'neutral': ((150, 105, 30), (240, 200, 110))}
FONT3 = {'0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
         '5': '111100111001111', '6': '111100111101111', '7': '111001001010010', '8': '111101111101111', '9': '111101111001111'}
FONT5 = {'0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111',
         '3': '01110100010000100110000011000101110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
         '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110',
         '9': '01110100011000101111000010001001100'}


def hex_points(cx, cy, s, ox, oy):
    pts = [(cx, cy - 8), (cx + 11, cy - 4), (cx + 11, cy + 4), (cx, cy + 8), (cx - 11, cy + 4), (cx - 11, cy - 4)]
    return [(round((x - ox) * s), round((y - oy) * s)) for x, y in pts]


def hex_centres():
    for r, cy in enumerate(ROWS):
        for k in range(12):
            yield 50 + (r % 2) * 11 + HEX_W * k, cy


def draw_hexes(layer, s, ox, oy, highlight):
    d = ImageDraw.Draw(layer)
    for cx, cy in hex_centres():
        p = hex_points(cx, cy, s, ox, oy)
        d.line(p + [p[0]], fill=HEX_LINE if s == 1 else HEX_LINE_HI, width=1)
    p = hex_points(*highlight, s, ox, oy)
    d.polygon(p, fill=HIGHLIGHT_FILL)
    d.line(p + [p[0]], fill=HIGHLIGHT, width=max(1, s // 2))


def draw_badge(img, x, y, n, side, s):
    big = s > 1
    font, gw, gh = (FONT5, 5, 7) if big else (FONT3, 3, 5)
    px = 2 if s == 4 else 1
    pad = 2 * px if big else 1
    w = (len(str(n)) * (gw + 1) - 1) * px + pad * 2
    h = gh * px + pad * 2
    fill, rim = BADGE[side]
    d = ImageDraw.Draw(img)
    d.rectangle([x - 1, y - 1, x + w, y + h], fill=(20, 16, 12, 255))
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=fill + (255,))
    d.line([x, y, x + w - 1, y], fill=rim + (255,))
    for c, ch in enumerate(str(n)):
        for k, bit in enumerate(font[ch]):
            if bit == '1':
                gx = x + pad + (c * (gw + 1) + k % gw) * px
                gy = y + pad + (k // gw) * px
                d.rectangle([gx, gy, gx + px - 1, gy + px - 1], fill=(255, 250, 235, 255))


def load_sprite(path):
    im = Image.open(path).convert('RGBA')
    if path in STRIP:
        rgb, row = STRIP[path]
        px = im.load()
        for y in range(row, im.height):
            for x in range(im.width):
                if px[x, y][:3] == rgb:
                    px[x, y] = (0, 0, 0, 0)
    return im


def foot_centre(im, bbox):
    """x-centre of the opaque pixels in the bottom eighth: the feet, not wings or tail."""
    x0, y0, x1, y1 = bbox
    a = im.getchannel('A').load()
    xs = [x for y in range(y1 - max(2, (y1 - y0) // 8), y1) for x in range(x0, x1) if a[x, y]]
    return (min(xs) + max(xs)) // 2


def compose(key):
    s = DENSITY[key]
    a = ASSETS[key]
    ox, oy = CROP64 if key == '64' else (0, 0)
    bg = Image.open(a['bg']).convert('RGBA')
    size = bg.size
    over = Image.new('RGBA', size, (0, 0, 0, 0))
    draw_hexes(over, s, ox, oy, highlight=(116, 146))
    sd = ImageDraw.Draw(over)
    sprites = {n: load_sprite(a[n]) for n in ('knight', 'griffin', 'wolf')}
    placed = []
    for name, fx, fy, count, side in UNITS:
        spr = sprites[name]
        bx0, by0, bx1, by1 = spr.getbbox()
        X, Y = round((fx - ox) * s), round((fy - oy) * s)
        rx, ry = (bx1 - bx0) // 3, max(2, 2 * s)
        sd.ellipse([X - rx, Y - ry, X + rx, Y + ry], fill=SHADOW)
        # Feet sit on the hex centre: whole-pixel offset only.
        pos = (X - foot_centre(spr, (bx0, by0, bx1, by1)), Y - by1 + 1)
        placed.append((spr, pos, count, side, X + (bx1 - bx0) // 2 - 2 * s, Y - 3 * s))
    img = Image.alpha_composite(bg, over)
    for spr, pos, count, side, bx, by in placed:
        img.paste(spr, pos, spr)  # sprites have 1-bit alpha; paste clips off-frame units
    for spr, pos, count, side, bx, by in placed:
        if count:
            draw_badge(img, bx, by, count, side, s)
    out = img.convert('RGB')
    out.save(f'battle-{key}.png')
    report(key, a, sprites, out)


def block_size(im):
    """Largest k for which the image is made of k×k blocks (1 = true native pixels)."""
    for k in (4, 3, 2):
        if im.width % k or im.height % k:
            continue
        small = im.resize((im.width // k, im.height // k), Image.NEAREST)
        if small.resize(im.size, Image.NEAREST).tobytes() == im.tobytes():
            return k
    return 1


def report(key, a, sprites, out):
    print(f'battle-{key}.png {out.size} colours={len(out.getcolors(1 << 20))}')
    for n in ('bg', 'knight', 'griffin', 'wolf'):
        im = Image.open(a[n]).convert('RGBA')
        cols = len({p for p in im.getdata() if p[3] > 0})
        semi = sum(1 for p in im.getdata() if 0 < p[3] < 255)
        bb = im.getbbox()
        print(f'  {n:8s} {a[n]:18s} {im.size} h={bb[3] - bb[1]:3d} colours={cols:3d} '
              f'semi-alpha={semi} block={block_size(im)}')


if __name__ == '__main__':
    for k in sys.argv[1:]:
        compose(k)
