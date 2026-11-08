# Egypt (The Two Lands) art test: roster.png (Egypt row over a Greek row for scale)
# and battle.png (Egypt left vs Greeks right). Sprites are pasted 1:1 at whole-pixel
# offsets; the roster is upscaled 2x with nearest-neighbour. Test only, no game files touched.
# Usage (from this folder): python3 compose_egypt.py   (needs Pillow)
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
DEV = os.path.join(HERE, '..', '..')
sys.path.insert(0, os.path.join(HERE, '..', 'pixellab'))
from compose import draw_badge, foot_centre  # noqa: E402

EGYPT = [('Nile Levy', 'levy.png'), ('Nubian Archer', 'nubian.png'), ('Jackal Warrior', 'jackal.png'),
         ('War Chariot', 'chariot.png'), ('Mummy', 'mummy.png'), ('Sphinx', 'sphinx.png'), ('Bennu', 'bennu.png')]
GREEK = [('Hoplite', 'art-direction/greek/hoplite.png'), ('Slinger', 'art-direction/greek/slinger.png'),
         ('Griffin', 'art-direction/pixellab/optB-griffin.png'), ('Minotaur', 'pixel/shrink/minotaur.png'),
         ('Centaur', 'pixel/src/centaur.png'), ('Companion', 'pixel/shrink/companion.png'),
         ('Titan', 'pixel/shrink/titan.png')]
BG = os.path.join(DEV, 'pixel', 'bg960')
SHADOW = (40, 24, 10, 90)
FLY = {'Griffin', 'Bennu'}


def sprite(path, base):
    im = Image.open(os.path.join(base, path)).convert('RGBA')
    return im.crop(im.getbbox())


def backdrop(width, height):
    h = Image.open(os.path.join(BG, 'sand-horizon.png')).convert('RGBA')
    g = Image.open(os.path.join(BG, 'sand-ground.png')).convert('RGBA')
    img = Image.new('RGBA', (width, height), (0, 0, 0, 255))
    for x in range(0, width, h.width):
        img.alpha_composite(h, (x, 0))
        img.alpha_composite(g, (x, h.height))
    return img.crop((0, 0, width, height))


def shadow(img, cx, fy, w):
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(ov).ellipse([cx - w // 3, fy - 3, cx + w // 3, fy + 3], fill=SHADOW)
    img.alpha_composite(ov)


def paste_feet(img, spr, cx, fy, lift=0, flip=False):
    if flip:
        spr = spr.transpose(Image.FLIP_LEFT_RIGHT)
    shadow(img, cx, fy, spr.width)
    img.alpha_composite(spr, (cx - spr.width // 2, fy - spr.height + 1 - lift))


def font(size):
    for p in ('/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc'):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def row(img, items, base, ground, width, tier_label_y):
    sprs = [sprite(p, base) for _, p in items]
    gap = (width - sum(s.width for s in sprs)) // (len(sprs) + 1)
    x = gap
    out = []
    for (name, _), s in zip(items, sprs):
        lift = 14 if name in FLY else 0
        paste_feet(img, s, x + s.width // 2, ground, lift)
        out.append((name, x + s.width // 2))
        x += s.width + gap
    return out


def roster():
    w, h = 768, 330
    img = backdrop(w, h)
    top = row(img, GREEK, DEV, 140, w, 0)
    bot = row(img, EGYPT, HERE, 290, w, 0)
    big = img.resize((w * 2, h * 2), Image.NEAREST)
    d = ImageDraw.Draw(big)
    f = font(20)
    for lab, cy in (('GREEK base units (for scale)', 14), ('EGYPT: The Two Lands, base units', 164)):
        d.text((16, cy * 2 - 8 + (0 if cy < 100 else 16)), lab, font=f, fill=(255, 240, 200, 255),
               stroke_width=2, stroke_fill=(30, 18, 8, 255))
    f2 = font(16)
    for items, gy in ((top, 140), (bot, 290)):
        for name, cx in items:
            d.text((cx * 2, gy * 2 + 18), name, font=f2, fill=(255, 240, 200, 255), anchor='mt',
                   stroke_width=2, stroke_fill=(30, 18, 8, 255))
    big.convert('RGB').save(os.path.join(HERE, 'roster.png'))
    print('roster.png', big.size)


def battle():
    w, h = 768, 420
    img = backdrop(w, h)
    spr = lambda name: sprite(dict(EGYPT)[name], HERE)  # noqa: E731
    gsp = lambda name: sprite(dict(GREEK)[name], DEV)  # noqa: E731
    # (sprite, foot x, foot y, count, side, flip, lift), painted back to front
    units = [
        (spr("Sphinx"), 175, 255, 3, 'player', False, 0),
        (spr("Mummy"), 70, 290, 12, 'player', False, 0),
        (spr("Bennu"), 290, 235, 1, 'player', False, 22),
        (spr("Nubian Archer"), 70, 222, 20, 'player', False, 0),
        (spr("Jackal Warrior"), 230, 310, 8, 'player', False, 0),
        (spr('War Chariot'), 130, 380, 4, 'player', False, 0),
        (spr('Nile Levy'), 270, 355, 25, 'player', False, 0),
        (gsp('Titan'), 620, 245, 2, 'neutral', True, 0),
        (gsp('Griffin'), 515, 240, 6, 'neutral', True, 20),
        (gsp('Slinger'), 705, 290, 18, 'neutral', True, 0),
        (gsp('Minotaur'), 560, 305, 7, 'neutral', True, 0),
        (gsp('Companion'), 655, 385, 5, 'neutral', True, 0),
        (gsp('Hoplite'), 485, 360, 30, 'neutral', True, 0),
    ]
    units.sort(key=lambda u: u[2])
    placed = []
    for s, fx, fy, n, side, flip, lift in units:
        paste_feet(img, s, fx, fy, lift, flip)
        placed.append((fx + s.width // 2 - 8, fy + 2 - lift, n, side))
    for bx, by, n, side in placed:
        draw_badge(img, bx, by, n, side, 2)
    img.convert('RGB').save(os.path.join(HERE, 'battle.png'))
    print('battle.png', img.size)


if __name__ == '__main__':
    roster()
    battle()
