"""Builds the town walls of a siege battle, piece by piece on the hex grid, so a stretch can crack and fall in place.
Each piece is a sprite placed at a fixed point of the 960 x 540 battle world.
  python3 dev/pixel/siege/build_siege.py   (from games/inkheroes)
  -> src/art/pixel/siege/*.png, src/art/pixel/siege.ts (generated; do not edit by hand)"""
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image

GAME = Path(__file__).resolve().parents[3]
OUT = GAME / 'src' / 'art' / 'pixel' / 'siege'
TS = GAME / 'src' / 'art' / 'pixel' / 'siege.ts'

# The field, as in src/scenes/battle/pixelLayout.ts and src/logic/siege.ts.
WALL_COL = [12, 11, 11, 10, 10, 9, 10, 10, 11, 11, 12]
GATE_ROW = 5
hex_x = lambda c, r: 161 + 44 * c + (22 if r % 2 else 0)  # noqa: E731
hex_y = lambda r: 88 + 42 * r  # noqa: E731
WALL = [(hex_x(c, r), hex_y(r)) for r, c in enumerate(WALL_COL)]

WALL_Z = 54
CREN_Z = 7
CREN_W = 8
THICK = {'up': (11, 4), 'down': (-11, 4)}
# Warm limestone, shadow to light, matching the town's walls.
RAMP = np.array([(58, 40, 30), (92, 64, 45), (130, 95, 66), (168, 128, 88), (200, 162, 114), (226, 194, 144), (244, 220, 172)], dtype=float)
MORTAR = 0.62
OUTLINE = (40, 27, 20, 255)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - 0.5


def tone(v: float, x: int, y: int) -> tuple[int, int, int, int]:
    """A brightness 0-1 as a colour of the ramp, dithered between steps so the shading stays pixel art."""
    p = max(0.0, min(0.999, v)) * (len(RAMP) - 1) + BAYER[y % 4, x % 4] * 0.55
    i = int(max(0, min(len(RAMP) - 1, round(p))))
    return (*RAMP[i].astype(int), 255)


class Bricks:
    """Coursed ashlar: each block a little lighter or darker, seeded so a wall reads the same in every state."""

    def __init__(self, seed: int, course: int = 7, length: int = 14):
        self.course, self.length = course, length
        self.r = random.Random(seed)
        self.cells: dict[tuple[int, int], float] = {}

    def at(self, u: float, v: float) -> float:
        row = int(v // self.course)
        shift = (row % 2) * self.length / 2 + (hash((row, 1)) % 5)
        col = int((u + shift) // self.length)
        fu, fv = (u + shift) % self.length, v % self.course
        if fu < 1 or fv < 1:
            return MORTAR
        key = (row, col)
        if key not in self.cells:
            self.cells[key] = 1 + self.r.uniform(-0.09, 0.09)
        return self.cells[key]


def blank(w: int, h: int) -> Image.Image:
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def outline(im: Image.Image, seam=None) -> Image.Image:
    """A dark line round the shape; `seam` marks pixels where a piece meets its neighbour, which stay open."""
    a = np.array(im)
    solid = a[..., 3] > 0
    pad = np.pad(solid, 1)
    edge = solid & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    if seam is not None:
        edge &= ~seam
    a[edge] = OUTLINE
    return Image.fromarray(a)


def stretch(p0, p1, arm: str, bricks: Bricks, gone=None):
    """A length of wall from ground point p0 to p1: its parapet, the walk on top and the long face that looks south.
    `gone(t, z)` says where a breach has taken it away. Returns a sprite and its top-left."""
    gone = gone or (lambda t, z: False)
    nx, ny = THICK[arm]
    x0 = int(min(p0[0], p1[0]) - abs(nx) - 3)
    x1 = int(max(p0[0], p1[0]) + abs(nx) + 3)
    y0 = int(min(p0[1], p1[1]) - WALL_Z - CREN_Z - abs(ny) - 3)
    y1 = int(max(p0[1], p1[1]) + abs(ny) + 3)
    im = blank(x1 - x0, y1 - y0)
    px = im.load()
    seam = np.zeros((y1 - y0, x1 - x0), dtype=bool)
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    length = math.hypot(dx, dy)
    cren = lambda t: ((t * length) % (CREN_W * 2)) < CREN_W  # noqa: E731
    lit_face = 0.72 if arm == 'down' else 0.3  # the lower arm's face looks to the light, the upper's away
    det = dx * ny - dy * nx
    for sy in range(y0, y1):
        for sx in range(x0, x1):
            ix, iy = sx - x0, sy - y0
            colour = None
            # The upper arm's parapet stands on the far rim.
            if arm == 'up':
                t = (sx - (p0[0] - nx)) / dx
                if 0 <= t <= 1:
                    z = (p0[1] - ny + dy * t) - sy
                    if WALL_Z <= z <= WALL_Z + CREN_Z and cren(t) and not gone(t, z):
                        colour = tone(0.8 * bricks.at(t * length, z), sx, sy)
            # The walk on top: solve C(t) + s n + (0, -WALL_Z).
            rx, ry = sx - p0[0], sy - p0[1] + WALL_Z
            t = (rx * ny - ry * nx) / det
            s = (dx * ry - dy * rx) / det
            if 0 <= t <= 1 and -1 <= s <= 1 and not gone(t, WALL_Z):
                colour = tone(0.5 * bricks.at(t * length, (s + 1) * 6), sx, sy)
                seam[iy, ix] = t < 0.09 or t > 0.91
            # The long face.
            t = (sx - (p0[0] + nx)) / dx
            if 0 <= t <= 1:
                z = (p0[1] + ny + dy * t) - sy
                crown = WALL_Z + (CREN_Z if arm == 'down' and cren(t) else 0)
                if 0 <= z <= crown and not gone(t, z):
                    shade = lit_face * bricks.at(t * length, z)
                    if z < 12:
                        shade *= 0.8 + 0.2 * z / 12
                    colour = tone(shade, sx, sy)
                    seam[iy, ix] = t < 0.09 or t > 0.91
            if colour:
                px[ix, iy] = colour
    return outline(im, seam), (x0, y0)


def torn(im: Image.Image, height, seed: int) -> Image.Image:
    """`im` (a tower) with its top torn off: each column keeps `height(t)` pixels up from its foot, its broken edge dark."""
    out = im.copy()
    px = out.load()
    r = random.Random(seed)
    x0, _, x1, _ = im.getbbox()
    walk = 0.0
    for x in range(x0, x1):
        ys = [y for y in range(im.height) if px[x, y][3]]
        if not ys:
            continue
        walk = max(-5.0, min(5.0, walk + r.uniform(-2.2, 2.2)))
        edge = ys[-1] - max(3, int(height((x - x0) / (x1 - x0 - 1)) + walk))
        for y in ys:
            if y < edge:
                px[x, y] = (0, 0, 0, 0)
            elif y <= edge + 1:
                px[x, y] = OUTLINE
            elif y <= edge + 3:
                v = px[x, y]
                px[x, y] = (int(v[0] * 0.72), int(v[1] * 0.72), int(v[2] * 0.72), 255)
    return out


def cracked(im: Image.Image, seed: int, n: int = 4) -> Image.Image:
    """Dark cracks running down a wall."""
    out = im.copy()
    px = out.load()
    r = random.Random(seed)
    x0, _, x1, _ = im.getbbox()
    for _ in range(n):
        x = r.randrange(x0 + 4, x1 - 4)
        ys = [y for y in range(im.height) if px[x, y][3]]
        if not ys:
            continue
        y = ys[len(ys) // 3]
        for _ in range(r.randint(14, 26)):
            if 0 <= x < out.width and 0 <= y < out.height and px[x, y][3]:
                px[x, y] = OUTLINE
            y += 1
            x += r.choice((-1, 0, 0, 1))
    return out


def breach(seed: int):
    """A stretch brought down: a gap wider at the top than at the foot, its sides rough, its ends still joined to the wall."""
    r = random.Random(seed)
    rough = [r.uniform(-0.05, 0.05) for _ in range(12)]
    return lambda t, z: abs(t - 0.5) < 0.2 + 0.2 * z / WALL_Z + rough[int(z // 6) % 12]


def pile(w: int, h: int, seed: int, n: int = 16) -> Image.Image:
    """A heap of fallen blocks."""
    r = random.Random(seed)
    im = blank(w, h)
    px = im.load()
    stones = sorted([(r.uniform(4, w - 5), r.uniform(h * 0.25, h - 4), r.randint(3, 5), r.randint(2, 4), r.uniform(0.42, 0.8)) for _ in range(n)], key=lambda s: s[1])
    for x0, y0, a, b, v in stones:
        for y in range(int(y0 - b), int(y0 + b) + 1):
            for x in range(int(x0 - a), int(x0 + a) + 1):
                if 0 <= x < w and 0 <= y < h and ((x - x0) / a) ** 2 + ((y - y0) / b) ** 2 <= 1:
                    px[x, y] = tone(v + (y0 - y) * 0.04 - (x - x0) * 0.015, x, y)
    return outline(im)


def tower(radius: int, height: int, seed: int):
    """A round tower with a battlemented head, lit from the left, its foot at (radius+3, bottom-ish)."""
    bricks = Bricks(seed, 7, 12)
    w = radius * 2 + 12
    ry = max(5, radius // 2 - 1)
    h = height + CREN_Z + ry * 2 + 8
    im = blank(w, h)
    px = im.load()
    cx = w / 2 - 0.5
    foot_y = h - ry - 3
    for ix in range(w):
        nx = (ix - cx) / radius
        if abs(nx) > 1:
            continue
        arc = math.sqrt(1 - nx * nx)
        low = foot_y + ry * arc
        top = foot_y - height
        for iy in range(h):
            z = low - iy
            if z < 0:
                continue
            if iy >= top + ry * arc * 0.2:
                u = math.asin(nx) * radius
                light = 0.84 - 0.56 * (nx + 0.35) if nx > -0.35 else 0.84 + 0.2 * (nx + 0.35)
                px[ix, iy] = tone(light * bricks.at(u, z), ix, iy)
    # The head: a wider band, the walk inside it, the merlons round its rim.
    for iy in range(h):
        for ix in range(w):
            nx = (ix - cx) / (radius + 2)
            if abs(nx) >= 1:
                continue
            arc = math.sqrt(1 - nx * nx)
            head_y = foot_y - height
            if head_y + ry * arc - 2 <= iy <= head_y + ry * arc + 4:
                light = 0.9 - 0.5 * (nx + 0.3)
                px[ix, iy] = tone(light * 0.92, ix, iy)
            if ((ix - cx) / (radius - 1)) ** 2 + ((iy - head_y) / (ry - 1)) ** 2 <= 1:
                px[ix, iy] = tone(0.5 + 0.1 * ((iy - head_y) / ry), ix, iy)
    head_y = foot_y - height
    for k in range(14):
        a = k / 14 * 2 * math.pi
        mx, my = cx + (radius + 1) * math.cos(a), head_y + ry * math.sin(a)
        for yy in range(int(my - CREN_Z), int(my) + 2):
            for xx in range(int(mx - 2), int(mx + 2)):
                if 0 <= xx < w and 0 <= yy < h:
                    if math.sin(a) < 0 and ((xx - cx) / radius) ** 2 + ((yy + CREN_Z - head_y) / ry) ** 2 > 2:
                        continue
                    px[xx, yy] = tone(0.86 - 0.42 * ((xx - cx) / radius + 0.3), xx, yy)
    return outline(im), (w // 2, int(foot_y))


def gate(state: str):
    """The gatehouse in the wall's point: a block turned to the attacker with an arch in its face, all on the gate's own hex."""
    cx, cy = WALL[GATE_ROW]
    p0, p1 = (cx - 19, cy - 26), (cx + 21, cy + 22)
    back = (26, -8)
    tall = WALL_Z + 12
    x0, y0, w, h = cx - 30, cy - 110, 96, 150
    im = blank(w, h)
    px = im.load()
    bricks = Bricks(77, 7, 14)
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    length = math.hypot(dx, dy)
    det = dx * back[1] - dy * back[0]
    # The walk on top, then its parapet round the back, then the face.
    for iy in range(h):
        for ix in range(w):
            rx, ry = ix + x0 - p0[0], iy + y0 - p0[1] + tall
            t = (rx * back[1] - ry * back[0]) / det
            s = (dx * ry - dy * rx) / det
            if 0 <= t <= 1 and 0 <= s <= 1:
                px[ix, iy] = tone(0.48 * bricks.at(t * length, s * 22), ix, iy)
    for sx in range(p0[0], p1[0] + 1):
        t = (sx - p0[0]) / dx
        ground = p0[1] + dy * t
        for z in range(0, tall + CREN_Z + 1):
            ix, iy = sx - x0, int(ground - z) - y0
            if z > tall and (t * length % 14) >= 7:
                continue
            u = t - 0.5
            arch = 42 * (1 - (abs(u) / 0.36) ** 2.6) if abs(u) < 0.36 else -1
            if z <= arch:
                if state == 'whole':
                    plank = int(t * length) // 6
                    band = z % 15 in (0, 1)
                    wood = 0.8 + 0.2 * ((plank * 37) % 5) / 5
                    px[ix, iy] = (150, 108, 58, 255) if band else (int(112 * wood), int(72 * wood), int(42 * wood), 255)
                else:
                    px[ix, iy] = (24, 17, 13, 255)
            elif z <= arch + 4 and abs(u) < 0.42:
                px[ix, iy] = tone(0.86, ix, iy)
            else:
                px[ix, iy] = tone(0.74 * bricks.at(t * length, z), ix, iy)
    out = outline(im)
    if state != 'whole':
        out.alpha_composite(pile(44, 22, 5, 22), (cx - 22 - x0, cy - 2 - y0))
    return out, (x0, y0)


def moat():
    """The water before the wall: a bank, a band of water following the hexes, ripples. Ground level, under the grid."""
    pts = [(hex_x(c - 1, r), hex_y(r)) for r, c in enumerate(WALL_COL)]
    pts = [(pts[0][0] + 44, pts[0][1] - 84)] + pts + [(pts[-1][0] + 44, pts[-1][1] + 84)]
    x0, y0, w, h = 470, 40, 300, 500
    im = blank(w, h)
    px = im.load()
    rng = random.Random(9)
    ripples = {(rng.randrange(w) // 3, rng.randrange(h)) for _ in range(900)}
    for iy in range(h):
        sy = iy + y0
        for i in range(len(pts) - 1):
            (ax, ay), (bx, by) = pts[i], pts[i + 1]
            if ay <= sy <= by:
                cx = ax + (bx - ax) * (sy - ay) / (by - ay)
                break
        else:
            continue
        for ix in range(w):
            d = ix + x0 - cx
            wob = 1.6 * math.sin(sy * 0.09) + 1.2 * math.sin(sy * 0.031 + 2)
            e = abs(d + wob)
            if e > 27:
                continue
            if e > 22:
                px[ix, iy] = (112, 84, 56, 255) if (ix + iy) % 7 else (92, 68, 46, 255)
            elif e > 20:
                px[ix, iy] = (70, 52, 38, 255)
            else:
                deep = 1 - e / 20
                c = (46 + int(-10 * deep), 92 + int(-22 * deep), 118 + int(12 * deep))
                if (ix // 3, iy) in ripples:
                    c = (112, 160, 176)
                elif e > 17:
                    c = (84, 134, 140)
                px[ix, iy] = (*c, 255)
    return im, (x0, y0)


def bridge():
    w, h = 62, 34
    im = blank(w, h)
    px = im.load()
    for y in range(h):
        for x in range(w):
            plank = x // 7
            v = 0.2 * ((plank * 37) % 5) / 5
            c = (int(112 + 60 * v), int(74 + 40 * v), int(44 + 20 * v), 255)
            if x % 7 == 0:
                c = (60, 40, 26, 255)
            if y < 3 or y >= h - 3:
                c = (74, 50, 32, 255)
            px[x, y] = c
    return outline(im), (hex_x(8, GATE_ROW) - 31, hex_y(GATE_ROW) - 17)


pieces: list[tuple[str, Image.Image, tuple[int, int], int]] = []


def add(key: str, im: Image.Image, at: tuple[int, int], row_y: int) -> None:
    box = im.getbbox()
    cut = im.crop(box)
    cut.save(OUT / f'{key}.png')
    pieces.append((key, cut, (at[0] + box[0], at[1] + box[1]), row_y))


def build_wall() -> None:
    mids = [WALL[0]] + [((WALL[i][0] + WALL[i + 1][0]) / 2, (WALL[i][1] + WALL[i + 1][1]) / 2) for i in range(len(WALL) - 1)] + [WALL[-1]]
    open_rows = {1: 'wallNorth', 4: 'wallGateNorth', 6: 'wallGateSouth', 9: 'wallSouth'}
    for r in range(len(WALL)):
        if r == GATE_ROW:
            continue
        arm = 'up' if r < GATE_ROW else 'down'
        p0, p1 = (mids[r], mids[r + 1]) if arm == 'down' else (mids[r + 1], mids[r])
        foot = hex_y(r)
        name = open_rows.get(r)
        whole, at = stretch(p0, p1, arm, Bricks(100 + r))
        if not name:
            add(f'wall{r}', whole, at, foot)
            continue
        add(f'{name}-2', whole, at, foot)
        add(f'{name}-1', cracked(whole, r, 7), at, foot)
        down, at = stretch(p0, p1, arm, Bricks(100 + r), breach(r))
        add(f'{name}-0', down, at, foot)
        add(f'{name}-rubble', pile(54, 34, r, 30), (WALL[r][0] - 27, WALL[r][1] - 16), foot)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for f in OUT.glob('*.png'):
        f.unlink()
    build_wall()
    im, at = gate('whole')
    add('gate-1', im, at, hex_y(GATE_ROW))
    im, at = gate('broken')
    add('gate-0', im, at, hex_y(GATE_ROW))
    for key, (x, y), radius, height, seed in (('keep', (hex_x(14, 3), hex_y(3)), 26, 112, 11), ('towerNorth', WALL[0], 22, 60, 12), ('towerSouth', WALL[-1], 22, 84, 13)):
        im, (fx, fy) = tower(radius, height, seed)
        add(f'{key}-1', im, (x - fx, y - fy + 6), y)
        add(f'{key}-0', torn(im, lambda t: height * 0.42 + radius * 0.3 * (1 - abs(2 * t - 1)), seed), (x - fx, y - fy + 6), y)
    im, at = moat()
    add('moat', im, at, 0)
    im, at = bridge()
    add('bridge', im, at, 0)
    write_ts()


def write_ts() -> None:
    cap = lambda s: ''.join(p[0].upper() + p[1:] for p in s.split('-'))  # noqa: E731
    lines = [f"import {'p' + cap(k)} from './siege/{k}.png?url';" for k, *_ in pieces]
    rows = [f"  '{k}': {{ url: p{cap(k)}, x: {at[0]}, y: {at[1]}, foot: {foot} }}," for k, _, at, foot in pieces]
    TS.write_text('\n'.join([
        '// Generated by dev/pixel/siege/build_siege.py: do not edit by hand.',
        *lines, '',
        '/** One piece of a town\'s walls: its picture, its top-left in the 960 x 540 battle world, and the ground line it sorts on. */',
        'export interface SiegePiece {', '  readonly url: string;', '  readonly x: number;', '  readonly y: number;', '  readonly foot: number;', '}', '',
        'export const SIEGE_ART: Readonly<Record<string, SiegePiece>> = {', *rows, '};', '']))


if __name__ == '__main__':
    main()
