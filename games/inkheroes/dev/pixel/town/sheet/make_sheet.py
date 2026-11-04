"""Draws every part of the city's walls on one sheet, for PixelLab to repaint in a single call, so they share one
stone, one light and one brushwork. All of it comes from the one profile below, so a wall, a turret, a round tower
and the gatehouse are built alike: same blocks, same foot course, same battlements. Only the arch and its doors are
art (gate-source.png). A part is drawn far to near, as it stands: a wall coming towards the viewer leaves the side of
its tower in front of it, one going away ends behind it, and a turret or tower stands proud of the wall on both faces.
  python3 dev/pixel/town/sheet/make_sheet.py  -> guide.png, parts.json, corner/corners.json, corner/front-*.png
Then repaint it (edit_image) to sheet/master.png and run cut_sheet.py."""
from __future__ import annotations

import json
import math
import random
from pathlib import Path
from statistics import median

from PIL import Image, ImageChops, ImageDraw

HERE = Path(__file__).resolve().parent
TOWN = HERE.parent

# The wall's one profile, pixels. Lengths are along the screen's x; the city's edges fall 1 in 2.
WALL_H = 30
WALL_T = 10
MERLON = {'w': 5, 'gap': 4, 'h': 6, 'd': 2}
TURRET_MERLON = {'w': 4, 'gap': 3, 'h': 6, 'd': 2}
COURSE = 6
BLOCK = 11
PLINTH = 5
# An edge of the city is 512 across: a corner's wall, four sections and a corner's wall, or on the front left a corner's
# wall, a section, the gatehouse's whole length, a section and a corner's wall, so everything meets exactly.
STUB = 68
SECTION = 94
GATE_FOOT = 188
# A turret is wider than the wall, so it stands out of both faces. A wall leaves it through its side, half a turret along.
TURRET = {'side': 18, 'h': WALL_H + 14}
LEAVES_TURRET = TURRET['side'] // 2 - 1
# The round tower, and how far along its wall the tower's side is from its middle.
ROUND = {'r': 25, 'h': 66, 'crown': 13, 'over': 3, 'drum': 11, 'drum_h': 12, 'pole': 16}
LEAVES_TOWER = 16
# The gatehouse: its towers stand either side of the middle of its length, the arch between them.
GATE = {'side': 24, 'h': WALL_H + 34, 'at': (58, 130), 'curtain_h': 46}
# The arch and doors in the old gatehouse art: its foot at column 0, the columns kept, and the column of the arch's middle.
ARCH = {'foot': 71, 'cols': (48, 80), 'top': 56, 'middle': 64}

SHEET_W = 512
GAP = 8
LIGHT = 1.0
SHADE = 0.8
TOP = 0.88
SOFT = (104, 70, 42)
INK = (46, 28, 16, 255)
STONE = (225, 190, 140)
BLUE = (44, 76, 200, 255)
GOLD = (222, 176, 84, 255)


def tinted(c: tuple[float, ...], k: float) -> tuple[int, int, int, int]:
    return (*(min(255, round(v * k)) for v in c[:3]), 255)


def stone_at(u: float, v: int, light: float, tints: dict, rng: random.Random, h: int) -> tuple[int, int, int, int]:
    """The stone at `u` along a face and `v` up it: blocks in courses over the unbroken foot course."""
    if v < PLINTH:
        return tinted(STONE, light * (0.66 if v == PLINTH - 1 else 0.82))
    if v >= h - 1:
        return tinted(STONE, light * 1.1)
    course = (v - PLINTH) // COURSE
    along = int(u) + course % 2 * (BLOCK // 2)
    if (v - PLINTH) % COURSE == 0 or along % BLOCK == 0:
        return tinted(STONE, light * 0.72)
    return tinted(STONE, light * tints.setdefault((course, along // BLOCK), rng.uniform(0.93, 1.07)))


def face(px, x0: int, foot: int, w: int, h: int, fall: int, light: float, seed: int) -> None:
    """A wall's face `w` wide from column x0, its foot at row `foot` there, falling (1) or rising (-1) 1 in 2."""
    rng = random.Random(seed)
    tints: dict = {}
    for u in range(w):
        y0 = foot + fall * ((u + (1 if fall < 0 else 0)) // 2)
        for v in range(h):
            px[x0 + u, y0 - v] = stone_at(u, v, light, tints, rng, h)


def box(im: Image.Image, x: int, y: int, a: int, b: int, h: int, seed: int = 1, merlon: dict[str, int] | None = MERLON) -> None:
    """A block of the stone, its front bottom corner at (x, y): `a` along the left face (falling to the corner), `b` along
    the right (rising from it), `h` tall. The left face takes the light. Battlements stand round its rim."""
    d = ImageDraw.Draw(im)
    px = im.load()
    t = y - h
    left, right = (x - a, t - a // 2), (x + b, t - b // 2)
    back = (x - a + b, t - a // 2 - b // 2)
    front = (x, t)

    def rim_merlons(start: tuple[int, int], n: int, fall: int) -> None:
        """Battlements along one rim, none on a wall's short end."""
        if not merlon or n <= WALL_T:
            return
        m = merlon
        for at in range(0, n - m['w'] + 1, m['w'] + m['gap']):
            mx, my = start[0] + at, start[1] + fall * (at // 2)
            if fall > 0:
                box(im, mx + m['w'], my + m['w'] // 2, m['w'], m['d'], m['h'], seed + at, None)
            else:
                box(im, mx, my, m['d'], m['w'], m['h'], seed + at, None)

    d.polygon([front, left, back, right], fill=tinted(STONE, TOP))
    rim_merlons(left, b, -1)
    rim_merlons(back, a, 1)
    face(px, x - a, y - a // 2, a, h, 1, LIGHT, seed)
    face(px, x, y, b, h, -1, SHADE, seed + 7)
    d.line([front, (x, y - 1)], fill=SOFT)
    rim_merlons(left, a, 1)
    rim_merlons(front, b, -1)


def falling(im: Image.Image, x: int, y: int, start: int, end: int, seed: int, h: int = WALL_H) -> None:
    """Wall from `start` to `end` along a foot that leaves (x, y) falling to the right (even lengths, to keep to the 1 in 2)."""
    start -= (end - start) % 2
    box(im, x + end, y + end // 2, end - start, WALL_T, h, seed)


def rising(im: Image.Image, x: int, y: int, start: int, end: int, seed: int) -> None:
    """Wall from `start` to `end` along a foot that leaves (x, y) rising to the right."""
    box(im, x + start, y - start // 2, WALL_T, end - start, WALL_H, seed)


def square_tower(im: Image.Image, cx: int, cy: int, side: int, h: int, seed: int) -> None:
    """A square tower astride the wall, the middle of its foot at (cx, cy)."""
    box(im, cx, cy + side // 2, side, side, h, seed, TURRET_MERLON)


def on_wall(x: int, y: int, u: int, fall: int) -> tuple[int, int]:
    """The middle of the wall's thickness, `u` along a foot leaving (x, y): the thickness runs away from the viewer."""
    return x + u + (WALL_T // 2 if fall > 0 else -WALL_T // 2), y + fall * (u // 2) - WALL_T // 4


def section(im: Image.Image, x: int, y: int, up: bool) -> None:
    """A straight section between two turrets, its foot from (x, y). The far turret, the wall leaving it, the near turret."""
    s = TURRET['side']
    if up:
        square_tower(im, *on_wall(x, y, SECTION, -1), s, TURRET['h'], 20)
        rising(im, x, y, 0, SECTION - LEAVES_TURRET, 11)
        square_tower(im, *on_wall(x, y, 0, -1), s, TURRET['h'], 21)
    else:
        square_tower(im, *on_wall(x, y, 0, 1), s, TURRET['h'], 22)
        falling(im, x, y, LEAVES_TURRET, SECTION, 12)
        square_tower(im, *on_wall(x, y, SECTION, 1), s, TURRET['h'], 23)


def round_tower(im: Image.Image, cx: int, cy: int) -> None:
    """The round tower, the middle of its foot at (cx, cy), in the wall's own courses, under an oversailing crown."""
    r = ROUND['r']
    px = im.load()
    rng = random.Random(9)
    tints: dict = {}

    def drum(radius: int, base: float, top: int, low: int) -> None:
        for dx in range(-radius, radius + 1):
            t = math.asin(dx / radius)
            foot = base + radius / 2 * math.cos(t)
            light = 0.98 - 0.2 * (dx / radius + 0.2) - 0.12 * abs(dx / radius) ** 4
            for v in range(low, top):
                px[cx + dx, round(foot) - v] = stone_at(radius * t + 40, v, light, tints, rng, top)

    def rim(radius: int, base: float, back: bool) -> None:
        count = round(2 * math.pi * radius / (MERLON['w'] + MERLON['gap']))
        for i in range(count):
            a = 2 * math.pi * i / count
            mx, my = cx + radius * math.sin(a), base + radius / 2 * math.cos(a)
            if (math.cos(a) < 0) != back:
                continue
            light = 0.98 - 0.2 * math.sin(a)
            ImageDraw.Draw(im).rectangle([round(mx) - 2, round(my) - MERLON['h'], round(mx) + 2, round(my)], fill=tinted(STONE, light))

    drum(r, cy, ROUND['h'], 0)
    crown = r + ROUND['over']
    base = cy - ROUND['h'] + ROUND['crown']
    drum(crown, base, ROUND['crown'], 0)
    top = base - ROUND['crown']
    rim(crown - 1, top, True)
    ImageDraw.Draw(im).ellipse([cx - crown, top - crown / 2, cx + crown, top + crown / 2], fill=tinted(STONE, TOP))
    d = ROUND['drum']
    drum(d, top, ROUND['drum_h'], 0)
    ImageDraw.Draw(im).ellipse([cx - d, top - ROUND['drum_h'] - d / 2, cx + d, top - ROUND['drum_h'] + d / 2], fill=tinted(STONE, TOP))
    rim(crown - 1, top, False)
    # The flag on its pole.
    head = top - ROUND['drum_h'] - ROUND['pole']
    ImageDraw.Draw(im).line([(cx, top - ROUND['drum_h']), (cx, head)], fill=(120, 84, 50, 255))
    ImageDraw.Draw(im).polygon([(cx + 1, head), (cx + 10, head + 3), (cx + 1, head + 7)], fill=BLUE)


def corner(name: str, im: Image.Image, x: int, y: int, front_only: bool = False) -> None:
    """A corner, far to near: walls going away, the round tower where their feet meet at (x, y), walls coming towards the viewer."""
    n, tower = STUB, (x, y - WALL_T // 2)
    if name == 'back':
        round_tower(im, *tower)
        rising(im, x - n, y + n // 2, 0, n - LEAVES_TOWER, 31)
        falling(im, x, y, LEAVES_TOWER, n, 32)
    elif name == 'left':
        if not front_only:
            rising(im, x, y, 0, n - LEAVES_TURRET, 33)
        round_tower(im, *tower)
        falling(im, x, y, LEAVES_TOWER, n, 34)
    elif name == 'right':
        if not front_only:
            falling(im, x - n, y - n // 2, LEAVES_TURRET, n, 35)
        round_tower(im, *tower)
        rising(im, x - n, y + n // 2, 0, n - LEAVES_TOWER, 36)
    else:
        falling(im, x - n, y - n // 2, LEAVES_TURRET, n, 37)
        rising(im, x, y, 0, n - LEAVES_TURRET, 38)
        round_tower(im, *tower)


def banner(im: Image.Image, cx: int, cy: int, side: int, h: int) -> None:
    """A blue banner hung down a gate tower's lit face."""
    px = im.load()
    x0 = cx - side // 2 - 2
    y0 = cy + side // 2 - side // 4 - 1 - h + 8
    for u in range(5):
        for v in range(20 - (2 if u in (0, 4) else 0)):
            px[x0 + u, y0 + (u + 1) // 2 + v] = GOLD if u in (0, 4) else BLUE


def arch(im: Image.Image, x: int, y: int) -> None:
    """The arch and doors from the old art, set into the curtain so that its foot lies on the gate's foot at `x` along."""
    art = levelled(Image.open(HERE / 'gate-source.png').convert('RGBA'))
    px, dst = art.load(), im.load()
    lo, hi = ARCH['cols']
    for gx in range(lo, hi):
        shift = (gx - ARCH['middle']) // 2
        for gy in range(ARCH['top'] + shift, art.height):
            if px[gx, gy][3]:
                dst[x + gx - ARCH['middle'], y + gy - ARCH['foot'] - ARCH['middle'] // 2 - 1] = px[gx, gy]


def gate(im: Image.Image, x: int, y: int) -> None:
    """The gatehouse in its length of wall, far to near: wall, left tower, curtain and arch, right tower, wall."""
    s, near, far = GATE['side'], GATE['at'][1], GATE['at'][0]
    falling(im, x, y, LEAVES_TURRET, far, 41)
    square_tower(im, *on_wall(x, y, far, 1), s, GATE['h'], 43)
    banner(im, *on_wall(x, y, far, 1), s, GATE['h'])
    falling(im, x, y, far + s // 2 - 1, near, 44, GATE['curtain_h'])
    mid = (far + near) // 2
    arch(im, x + mid, y + mid // 2 + 1)
    square_tower(im, *on_wall(x, y, near, 1), s, GATE['h'], 45)
    banner(im, *on_wall(x, y, near, 1), s, GATE['h'])
    falling(im, x, y, near + s // 2 - 1, GATE_FOOT, 42)


def levelled(im: Image.Image) -> Image.Image:
    """Scales each channel so the art's lit stone comes to the profile's stone."""
    px = [p for p in im.getdata() if p[3] and sum(p[:3]) > 300 and p[0] > p[2]]
    now = [median(p[i] for p in px) for i in range(3)]
    r, g, b, a = im.split()
    ch = [c.point(lambda v, k=STONE[i] / now[i]: min(255, round(v * k))) for i, c in enumerate((r, g, b))]
    return Image.merge('RGBA', (*ch, a))


def shut_in(im: Image.Image) -> list[tuple[int, int]]:
    """The clear pixels with no way out to the part's edge: holes you would see the city through."""
    w, h = im.size
    mask = Image.new('L', (w + 2, h + 2), 0)
    mask.paste(255, (1, 1, w + 1, h + 1), im.split()[3].point(lambda v: 255 if v else 0))
    ImageDraw.floodfill(mask, (0, 0), 128)
    px = mask.load()
    return [(x - 1, y - 1) for y in range(1, h + 1) for x in range(1, w + 1) if px[x, y] == 0]


def filled(im: Image.Image, colour: tuple[int, int, int, int]) -> Image.Image:
    """The part with its holes stopped."""
    out = im.copy()
    px = out.load()
    for x, y in shut_in(im):
        px[x, y] = colour
    return out


def outlined(im: Image.Image) -> Image.Image:
    """Inks the rim of the whole part, so the outline goes round the building and not round each block of it."""
    out = im.copy()
    px, dst = im.load(), out.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if px[x, y][3] and any(not (0 <= x + dx < w and 0 <= y + dy < h) or not px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                dst[x, y] = INK
    return out


def drawn(paint) -> tuple[Image.Image, tuple[int, int], tuple[int, int, int, int]]:
    """What `paint(image, x, y)` draws, trimmed and inked, where (x, y) falls in the trimmed picture, and the crop."""
    im = Image.new('RGBA', (420, 420), (0, 0, 0, 0))
    paint(im, 170, 250)
    crop = im.getbbox()
    return outlined(filled(im.crop(crop), tinted(STONE, TOP * 0.8))), (170 - crop[0], 250 - crop[1]), crop


def front_mask(name: str, crop: tuple[int, int, int, int]) -> None:
    """Which pixels of a side corner stand before the city (the tower and front wall): the rest is its rear wall."""
    im = Image.new('RGBA', (420, 420), (0, 0, 0, 0))
    corner(name, im, 170, 250, True)
    alpha = im.crop(crop).split()[3].point(lambda v: 255 if v else 0)
    ImageChops.lighter(alpha, alpha).save(TOWN / f'corner/front-{name}.png')


def main() -> None:
    parts = {
        **{f'corner-{n}': drawn(lambda im, x, y, n=n: corner(n, im, x, y)) for n in ('back', 'left', 'right', 'front')},
        'wall': drawn(lambda im, x, y: section(im, x, y, False)),
        'gate': drawn(gate),
        'wall-up': drawn(lambda im, x, y: section(im, x, y, True)),
    }
    placed, x, y, row = {}, GAP, GAP, 0
    for name, (im, point, _) in parts.items():
        if x + im.width + GAP > SHEET_W:
            x, y, row = GAP, y + row + GAP, 0
        placed[name] = {'x': x, 'y': y, 'w': im.width, 'h': im.height, 'point': point}
        x, row = x + im.width + GAP, max(row, im.height)
    sheet = Image.new('RGBA', (SHEET_W, (y + row + GAP + 3) // 4 * 4), (0, 0, 0, 0))
    for name, (im, *_) in parts.items():
        sheet.alpha_composite(im, (placed[name]['x'], placed[name]['y']))
    sheet.save(HERE / 'guide.png')
    (HERE / 'parts.json').write_text(json.dumps(placed, indent=2) + '\n')
    for n in ('left', 'right'):
        front_mask(n, parts[f'corner-{n}'][2])
    corners = {n: {'x': placed[f'corner-{n}']['point'][0], 'y': placed[f'corner-{n}']['point'][1], 'w': placed[f'corner-{n}']['w'], 'h': placed[f'corner-{n}']['h']} for n in ('front', 'left', 'right', 'back')}
    (TOWN / 'corner/corners.json').write_text(json.dumps(corners, indent=2) + '\n')
    print(sheet.size, {k: (v['w'], v['h'], v['point']) for k, v in placed.items()})


if __name__ == '__main__':
    main()
