# Greek roster test: the same 32-bit battle and 7-tier lineup for two rosters,
# "myth only" vs "history + myth". Uses the grid helpers from ../pixellab/compose.py;
# every sprite is pasted 1:1 at a whole-pixel offset.
# Usage (from this folder): python3 compose_greek.py [bg.png]
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pixellab'))
from compose import draw_badge, draw_hexes, foot_centre, load_sprite  # noqa: E402

S = 2  # 32-bit: 2 device px per logical unit
WOLF = '../pixellab/b32-wolf.png'
GRIFFIN = '../pixellab/optB-griffin.png'
ROSTERS = {
    'myth': ['satyr.png', 'harpy.png', GRIFFIN, 'centaur.png', 'minotaur.png', 'cyclops.png', 'titan.png'],
    'mixed': ['slinger.png', 'hoplite.png', 'spartan.png', 'centaur.png', 'minotaur.png', 'cyclops.png', 'titan.png'],
}
FAILED = {'centaur.png'}  # generator drew a horse and rider three times; shown dimmed
# Early-game battle: tiers 1-3 plus the minotaur (shared), vs two wolf stacks.
# (roster index or 'wolf', logical foot x, foot y, count, side)
BATTLE = [(0, 72, 123, 20, 'player'), (2, 149, 136, 8, 'player'), (1, 83, 162, 12, 'player'),
          (4, 138, 175, 3, 'player'), ('wolf', 215, 136, 12, 'neutral'), ('wolf', 259, 162, 9, 'neutral')]
ACTIVE_HEX = (149, 133)
SHADOW = (16, 30, 10, 90)


def place(img, over, spr, fx, fy):
    """Pastes spr with its feet on logical (fx, fy); returns its device-space box."""
    x0, y0, x1, y1 = spr.getbbox()
    X, Y = fx * S, fy * S
    ImageDraw.Draw(over).ellipse([X - (x1 - x0) // 3, Y - 2 * S, X + (x1 - x0) // 3, Y + 2 * S], fill=SHADOW)
    pos = (X - foot_centre(spr, (x0, y0, x1, y1)), Y - y1 + 1)
    return spr, pos, X + (x1 - x0) // 2 - 2 * S, Y - 3 * S


def battle(key, bg_path):
    bg = Image.open(bg_path).convert('RGBA')
    over = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    draw_hexes(over, S, 0, 0, ACTIVE_HEX)
    roster = ROSTERS[key]
    placed = []
    for who, fx, fy, n, side in sorted(BATTLE, key=lambda u: u[2]):  # back to front
        spr = load_sprite(WOLF if who == 'wolf' else roster[who])
        placed.append(place(bg, over, spr, fx, fy) + (n, side))
    img = Image.alpha_composite(bg, over)
    for spr, pos, *_ in placed:
        img.paste(spr, pos, spr)
    for _, _, bx, by, n, side in placed:
        draw_badge(img, bx, by, n, side, S)
    img.convert('RGB').save(f'battle-{key}.png')
    print(f'battle-{key}.png', img.size)


def lineup(key):
    """All 7 tiers left to right on one ground line, cropped to their boxes, 1:1."""
    sprites = [load_sprite(p) for p in ROSTERS[key]]
    crops = [s.crop(s.getbbox()) for s in sprites]
    gap, pad, ground = 10, 12, 150
    width = 640
    used = sum(c.width for c in crops) + gap * (len(crops) - 1)
    x = (width - used) // 2
    img = Image.new('RGBA', (width, ground + 30), (21, 17, 13, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([0, ground + 1, width, ground + 3], fill=(58, 46, 34, 255))
    for tier, (path, c) in enumerate(zip(ROSTERS[key], crops), start=1):
        if os.path.basename(path) in FAILED:
            c = c.copy()
            c.putalpha(c.getchannel('A').point(lambda a: 90 if a else 0))
        img.alpha_composite(c, (x, ground - c.height + 1))
        draw_badge(img, x + c.width // 2 - 5, ground + 8, tier,
                   'neutral' if tier > 3 else 'player', S)
        x += c.width + gap
    img.convert('RGB').save(f'lineup-{key}.png')
    print(f'lineup-{key}.png', img.size, 'free px', width - used, 'pad', pad)


if __name__ == '__main__':
    bg_path = sys.argv[1] if len(sys.argv) > 1 else 'bg.png'
    for k in ROSTERS:
        battle(k, bg_path)
        lineup(k)
