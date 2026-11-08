"""The Greek castle, stone by stone, in the battle world's units. Every part is modular, and a state of a part is the same stones with some gone.

  python3 dev/pixel/siege3d/castle_greek.py          every part, in every state -> out/greek/
  python3 dev/pixel/siege3d/castle_greek.py --view   only the castle whole and broken, to look at the model
  python3 dev/pixel/siege3d/castle_greek.py --obj    also the 3D scene as OBJ files, for a 3D tool

The steps from here to the game are in docs/inkheroes-castles.md.
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from render3d import Mesh, ShadowMap, render, stone_colour

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out' / 'greek'

hex_x = lambda c, r: 161 + 44 * c + (22 if r % 2 else 0)  # noqa: E731
hex_y = lambda r: 88 + 42 * r  # noqa: E731
WALL_COL = [12, 11, 11, 10, 10, 9, 10, 10, 11, 11, 12]  # as src/logic/siege.ts
W = [(hex_x(c, r), hex_y(r)) for r, c in enumerate(WALL_COL)]

COURSE = 8.0
STONE = dict(hue=0.104, sat=0.40, light=0.68)
BANNER = stone_colour(0.03, 0.52, 0.42)
BRONZE = stone_colour(0.09, 0.46, 0.44)
IRON = np.array([0.2, 0.2, 0.24])
WALL = dict(h=58.0, t=26.0)
# The gatehouse stands in the line of the wall, on the gate's hex: two square turrets with the passage running east to west between them.
# Its door faces the attacker, which this view sees edge-on, so a shut gate can't be seen: the game lowers a bridge when it opens.
GATE = dict(x0=556.0, x1=600.0, north=252.0, south=344.0, half=20.0, h=92.0, roof=54.0)
DRUM = dict(r=26.0, h=84.0)
# The corner towers stay low: the north one for its company to stay on a 16:9 screen, the south one to leave the court's last rows in sight.
TOWER = dict(r=30.0, h=66.0)
KEEP = dict(r=38.0, h=150.0)
FAR = dict(y=70.0, h=52.0, t=20.0, x1=1100.0)
# The wall nearest the viewer, below the field's bottom row. It starts at the south tower and the game shows it see-through.
NEAR = dict(y=550.0, h=52.0, t=20.0, x0=730.0, x1=1100.0)
# A point in the court: a wall's battlements go on the side away from it.
INSIDE = (900.0, 300.0)
# The round towers stand back from the gatehouse's line, so the south one leaves its turrets in sight. The arms still end where they did, inside them.
NORTH_DRUM = (W[4][0] + 20.0, W[4][1] - 6.0)
SOUTH_DRUM = (W[6][0] + 20.0, W[6][1] + 4.0)
# A round tower's foot is squashed north to south: the field shows the ground at full depth, which would make its top a full circle.
ROUND = 0.58
# The keep stands behind the last column, level with the gate, so it hides no one. Its steps cover the hex it holds on the field.
KEEP_AT = (858.0, hex_y(5))
KEEP_HEX = (hex_x(14, 5), hex_y(5))
# Every part and its states: 2 whole, 1 cracked, 0 down (a gate, keep or tower has only whole and down).
PARTS = {
    'wallNorth': (2, 1, 0), 'wallSouth': (2, 1, 0), 'wallGateNorth': (2, 1, 0), 'wallGateSouth': (2, 1, 0),
    'gate': (1, 0), 'keep': (1, 0), 'towerNorth': (1, 0), 'towerSouth': (1, 0),
    'wallNorthInner': (2,), 'wallSouthInner': (2,), 'wallSouthEnd': (2,), 'farWall': (2,), 'nearWall': (2,),
}


def col(tone: float = 1.0) -> np.ndarray:
    return stone_colour(STONE['hue'], STONE['sat'], STONE['light'] * tone)


def jagged(seed: int, base, swing: float):
    """A broken edge: base(t) with a wandering offset, the same every time."""
    r = random.Random(seed)
    pts = [r.uniform(-swing / 2, swing / 2) for _ in range(15)]

    def edge(t: float) -> float:
        f = max(0.0, min(0.999, t)) * 13
        i = int(f)
        return base(t) + pts[i] * (1 - (f - i)) + pts[i + 1] * (f - i)
    return edge


def wall(m: Mesh, p0, p1, h: float, t: float, seed: int = 1, keep=lambda t, z: True, hole=lambda u, z: False, merlons: bool = True, tone: float = 1.0) -> None:
    """A straight wall: dressed skins on both faces, a rubble core, a walk, a string course, battlements on the side away from the court."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    length = math.hypot(dx, dy)
    a = math.atan2(dy, dx)
    ux, uy = dx / length, dy / length
    nx, ny = -uy, ux
    if nx * (INSIDE[0] - p0[0]) + ny * (INSIDE[1] - p0[1]) > 0:
        nx, ny = -nx, -ny
    r = random.Random(seed)
    at = lambda u, n: (p0[0] + ux * u + nx * n, p0[1] + uy * u + ny * n)  # noqa: E731
    for c in range(math.ceil(h / COURSE)):
        z = c * COURSE + COURSE / 2
        for side in (-1, 1):
            u = -(c % 2) * 9 - r.random() * 4
            while u < length:
                l = 11 + r.random() * 10
                u0, u1 = max(0.0, u), min(length, u + l)
                jitter, shade = r.random(), 0.84 + r.random() * 0.26
                u += l
                if u1 - u0 < 1.5:
                    continue
                mid = (u0 + u1) / 2
                if hole(mid, z) or not keep(mid / length, z):
                    continue
                x, y = at(mid, side * (t / 2 - 2.5) + side * (jitter - 0.5) * 1.1)
                m.box(x, y, z, u1 - u0 - 0.9, 5, COURSE - 0.9, a, col(tone * shade * (0.72 if c < 2 else 1)))
        u = 4.0
        while u < length:
            if not hole(u, z) and keep(u / length, z - 3):
                x, y = at(u, 0)
                m.box(x, y, z, 8, t - 8, COURSE, a, col(tone * 0.42))
            u += 8
    u = 3.0
    while u < length:
        if keep(u / length, h):
            x, y = at(u, 0)
            m.box(x, y, h + 1, 6.6, t - 1, 2.4, a, col(tone * (0.74 + r.random() * 0.12)))
        u += 7
    u = 0.0
    while u < length:
        if keep(u / length, h):
            x, y = at(u + 3, t / 2 + 0.6)
            m.box(x, y, h - 7, 6, 2.2, 3.4, a, col(tone * 1.1))
        u += 6
    if merlons:
        u = 3.0
        while u < length - 4:
            if keep((u + 4) / length, h + 8):
                x, y = at(u + 4, t / 2 - 2.5)
                m.box(x, y, h + 7, 9.5, 5, 12, a, col(tone * (0.95 + r.random() * 0.1)))
            u += 15
        u = 0.0
        while u < length:
            if keep((u + 4) / length, h + 3):
                x, y = at(u + 4, -t / 2 + 2)
                m.box(x, y, h + 3, 7.4, 4, 4, a, col(tone * 0.82))
            u += 8


def tower(into: Mesh, p, r: float, h: float, seed: int = 2, keep=lambda th, z: True) -> None:
    """A round tower: rings of dressed stones round a dark inside, a corbelled head, a floor and merlons."""
    m = Mesh()
    round_tower(m, p, r, h, seed, keep)
    for t in m.tris:
        t[:, 1] = p[1] + (t[:, 1] - p[1]) * ROUND
    into.tris += m.tris
    into.cols += m.cols


def round_tower(m: Mesh, p, r: float, h: float, seed: int, keep) -> None:
    rnd = random.Random(seed)

    def ring(rad: float, z: float, height: float, count: int, depth: float, tone: float, turn: float = 0.0) -> None:
        for i in range(count):
            th = (i + turn) / count * math.pi * 2
            shade, j = 0.84 + rnd.random() * 0.26, rnd.random()
            if keep(th, z):
                ln = 2 * math.pi * rad / count
                m.box(p[0] + math.cos(th) * (rad + j - 0.5), p[1] + math.sin(th) * (rad + j - 0.5), z, ln - 0.5, depth, height - 0.9, th + math.pi / 2, col(tone * shade))

    for c in range(math.ceil(h / COURSE)):
        ring(r - 3, c * COURSE + COURSE / 2, COURSE, round(2 * math.pi * r / 10), 6, 0.72 if c < 2 else 1, 0.5 if c % 2 else 0)
    whole = all(keep(t, h + 1) for t in (0, math.pi / 2, math.pi, 3 * math.pi / 2))
    core = [(p[0] + math.cos(i / 40 * math.pi * 2) * (r - 5.5), p[1] + math.sin(i / 40 * math.pi * 2) * (r - 5.5)) for i in range(40)]
    m.prism(core, 0, h if whole else 8, np.array([0.22, 0.17, 0.13]))
    if not (keep(0, h + 1) or keep(math.pi, h + 1)):
        return
    ring(r - 1, h + 3, 6, round(2 * math.pi * r / 11), 6, 0.78, 0.25)
    ring(r + 1.5, h + 9, 7, round(2 * math.pi * (r + 2) / 13), 6.5, 1.04)
    if whole:
        floor = [(p[0] + math.cos(i / 40 * math.pi * 2) * (r + 1), p[1] + math.sin(i / 40 * math.pi * 2) * (r + 1)) for i in range(40)]
        m.prism(floor, h + 9, h + 12.5, col(0.62), col(0.6))
    count = round(2 * math.pi * r / 15) | 1
    for i in range(count):
        th = i / count * math.pi * 2
        if keep(th, h + 18):
            m.box(p[0] + math.cos(th) * (r + 2), p[1] + math.sin(th) * (r + 2), h + 19, 9, 6, 13, th + math.pi / 2, col(0.98 + rnd.random() * 0.08))


def rubble(m: Mesh, x: float, y: float, spread: float, n: int, seed: int) -> None:
    """Fallen stones: a heap, thickest in the middle, tumbled."""
    r = random.Random(seed)
    for _ in range(n):
        d = r.random() ** 1.6 * spread
        th = r.random() * math.pi * 2
        height = (1 - d / spread) * 13 * r.random()
        m.box(x + math.cos(th) * d, y + math.sin(th) * d * 0.62, 3 + height, 7 + r.random() * 9, 5 + r.random() * 6, 4 + r.random() * 4, r.random() * 6, col(0.8 + r.random() * 0.3), (r.uniform(-0.35, 0.35), r.uniform(-0.35, 0.35)))


def turret(m: Mesh, x0: float, x1: float, y0: float, y1: float, h: float, seed: int, keep) -> None:
    """A square turret: a thick stretch of wall with battlements all round."""
    y = (y0 + y1) / 2
    wall(m, (x0, y), (x1, y), h, y1 - y0, seed=seed, keep=keep, merlons=False)
    r = random.Random(seed)
    span = x1 - x0
    u = 2.0
    while u < span - 4:
        if keep((u + 4) / span, h + 8):
            for edge in (y0 + 2.5, y1 - 2.5):
                m.box(x0 + u + 4, edge, h + 7, 8.5, 5, 12, 0.0, col(0.95 + r.random() * 0.1))
        u += 13
    for x in (x0 + 2.5, x1 - 2.5):
        if keep((x - x0) / span, h + 8):
            m.box(x, y, h + 7, 5, 8, 12, 0.0, col(0.95 + r.random() * 0.1))


def gate(m: Mesh, state: int) -> None:
    """The gatehouse: two turrets, the road's stone floor between them, and over it a low roof with the portcullis's slot."""
    x0, x1, north, south, half, h, roof = (GATE[k] for k in ('x0', 'x1', 'north', 'south', 'half', 'h', 'roof'))
    mid = (north + south) / 2
    x = (x0 + x1) / 2
    broken = state == 0
    edge = jagged(41, lambda u: h * 0.36 + 20 * abs(2 * u - 1), 22)
    keep = (lambda u, z: z < edge(u)) if broken else (lambda u, z: True)
    turret(m, x0, x1, north, mid - half, h, 9, keep)
    turret(m, x0, x1, mid + half, south, h, 10, keep)
    m.box(x, mid, 1, x1 - x0, half * 2, 2, 0.0, col(0.5))
    if broken:
        rubble(m, x, mid + 20, 36, 60, 77)
        return
    # Deep in the gap between the turrets, so it reads as the dark of the passage.
    wall(m, (x, mid - half), (x, mid + half), roof, x1 - x0, seed=11, merlons=False, tone=0.42)
    m.box(x, mid - half + 1, (roof + h - 8) / 2, x1 - x0 - 4, 2, h - 8 - roof, 0.0, np.array([0.13, 0.1, 0.08]))
    # A banner on the south turret, the one face of the gatehouse this view sees.
    top, bottom, y = h - 4, h - 46, south + 0.8
    m.face([(x - 7, y, top), (x + 7, y, top), (x + 7, y, bottom + 7), (x, y, bottom), (x - 7, y, bottom + 7)], BANNER, np.array([x, y - 3, top]))


def stretch_keep(state: int, h: float, seed: int):
    """What a stretch keeps: cracked loses a few stones and some battlements; down opens a gap, wider at the top."""
    if state == 2:
        return lambda t, z: True
    r = random.Random(seed)
    holes = [(r.random(), r.random() * h, 5 + r.random() * 9) for _ in range(16)]
    if state == 1:
        top = jagged(seed, lambda t: h + 16, 18)
        return lambda t, z: z < top(t) and not any(abs(t - a) * 90 < s and abs(z - b) < s * 0.55 for a, b, s in holes)
    left = jagged(seed + 1, lambda v: 0.16 + v * 0.17, 0.09)
    right = jagged(seed + 2, lambda v: 0.84 - v * 0.17, 0.09)
    return lambda t, z: t < left(z / h) or t > right(z / h)


def tower_keep(damage: int, h: float, seed: int):
    """What a round tower keeps; `th` runs round it."""
    if damage >= 2:
        return lambda th, z: True
    edge = jagged(seed, (lambda t: h + 30) if damage == 1 else (lambda t: h * 0.42 + 22 * abs(math.sin(t * math.pi * 1.5))), 26 if damage == 1 else 34)
    r = random.Random(seed + 3)
    holes = [(r.random() * math.pi * 2, r.random() * h, 6 + r.random() * 7) for _ in range(12)] if damage == 1 else []
    tau = math.pi * 2

    def keep(th: float, z: float) -> bool:
        t = (th % tau) / tau
        return z < edge(t) and not any(abs(th - a) * 28 < s and abs(z - b) < s * 0.55 for a, b, s in holes)
    return keep


def steps(m: Mesh) -> None:
    """The keep's steps, climbing east from its hex to its door."""
    x, y = KEEP_HEX
    r = random.Random(61)
    for i in range(5):
        run = KEEP_AT[0] - 26 - (x - 20) - i * 9
        z = 2 + i * 3
        m.box(x - 20 + i * 9 + run / 2, y, z, run, 40 - i * 2, 3, 0.0, col(0.9 + r.random() * 0.14))


def line(a, b, t: float) -> tuple[float, float]:
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


NORTH_ARM = (W[0], (W[4][0] + 8.0, W[4][1] - 6.0))
SOUTH_ARM = ((W[6][0] + 8.0, W[6][1] + 4.0), W[10])
# The south tower stands a row past the arm's last hex, in line with it, so its foot may run off a 16:9 screen.
SOUTH_END = 1.25
SOUTH_TOWER = line(*SOUTH_ARM, SOUTH_END)


def build(name: str, state: int) -> Mesh:
    """One part in one state."""
    m = Mesh()
    h, t = WALL['h'], WALL['t']
    if name == 'wallNorth':
        wall(m, line(*NORTH_ARM, 0.06), line(*NORTH_ARM, 0.46), h, t, seed=21, keep=stretch_keep(state, h, 5))
        if state == 0:
            x, y = line(*NORTH_ARM, 0.26)
            rubble(m, x + 6, y + 6, 40, 70, 31)
    elif name == 'wallNorthInner':
        wall(m, line(*NORTH_ARM, 0.46), line(*NORTH_ARM, 0.92), h, t, seed=22)
    elif name == 'wallSouthInner':
        wall(m, line(*SOUTH_ARM, 0.06), line(*SOUTH_ARM, 0.54), h, t, seed=23)
    elif name == 'wallSouth':
        wall(m, line(*SOUTH_ARM, 0.54), line(*SOUTH_ARM, 0.95), h, t, seed=24, keep=stretch_keep(state, h, 6))
        if state == 0:
            x, y = line(*SOUTH_ARM, 0.74)
            rubble(m, x, y + 6, 40, 70, 32)
    elif name == 'wallSouthEnd':
        wall(m, line(*SOUTH_ARM, 0.95), line(*SOUTH_ARM, SOUTH_END - 0.05), h, t, seed=28)
    elif name == 'gate':
        gate(m, state)
    elif name == 'farWall':
        wall(m, (W[0][0], FAR['y']), (FAR['x1'], FAR['y']), FAR['h'], FAR['t'], seed=26)
    elif name == 'nearWall':
        wall(m, (NEAR['x0'], NEAR['y']), (NEAR['x1'], NEAR['y']), NEAR['h'], NEAR['t'], seed=27)
    else:
        p, o = {'wallGateNorth': (NORTH_DRUM, DRUM), 'wallGateSouth': (SOUTH_DRUM, DRUM), 'towerNorth': (W[0], TOWER), 'towerSouth': (SOUTH_TOWER, TOWER), 'keep': (KEEP_AT, KEEP)}[name]
        full = PARTS[name][0]
        damage = 2 if state == full else 0 if state == 0 else 1
        tower(m, p, o['r'], o['h'], seed=len(name) * 7, keep=tower_keep(damage, o['h'], len(name) * 13))
        if name == 'keep':
            steps(m)
        if state == 0:
            rubble(m, p[0] + 4, p[1] + 10, o['r'] * 1.6, 50, len(name))
    return m


def save(rgba: np.ndarray, path: Path, shrink: int) -> None:
    """Down to the world's own pixels, a pixel kept where most of it was covered."""
    im = Image.fromarray(rgba)
    w, h = im.width // shrink, im.height // shrink
    a = np.array(im.convert('RGBA'), dtype=float)
    a = a[:h * shrink, :w * shrink].reshape(h, shrink, w, shrink, 4)
    cover = a[..., 3].mean(axis=(1, 3)) / 255
    rgb = (a[..., :3] * a[..., 3:] / 255).sum(axis=(1, 3)) / np.maximum(1e-6, (a[..., 3:] / 255).sum(axis=(1, 3)))
    Image.fromarray(np.dstack([rgb, (cover > 0.5) * 255.0]).astype(np.uint8)).save(path)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    scale = 3
    bounds = (-1600.0, 1600.0, -1400.0, 1400.0)
    wholes = {n: build(n, s[0]).arrays() for n, s in PARTS.items()}
    shadows = {n: ShadowMap(bounds).add(arr[0]) for n, arr in wholes.items()}
    everything = ShadowMap(bounds)
    for sm in shadows.values():
        everything = everything.merged(sm)
    for name, states in (('castle-whole', 0), ('castle-broken', -1)):
        meshes = [build(n, s[states]).arrays() for n, s in PARTS.items()]
        tris = np.concatenate([m[0] for m in meshes])
        cols = np.concatenate([m[1] for m in meshes])
        sm = ShadowMap(bounds).add(tris)
        rgba, x, y = render(tris, cols, sm, scale)
        save(rgba, OUT / f'{name}.png', scale)
        print(name, len(tris), 'triangles, at', x, y)
    if '--obj' in sys.argv:
        for name, s in PARTS.items():
            for st in s:
                (OUT / f'{name}-{st}.obj').write_text(build(name, st).obj())
    if '--view' in sys.argv:
        return
    pieces = {}
    for name, states in PARTS.items():
        others = ShadowMap(bounds)
        for n, sm in shadows.items():
            if n != name:
                others = others.merged(sm)
        for st in states:
            tris, cols = build(name, st).arrays()
            rgba, x, y = render(tris, cols, others.merged(ShadowMap(bounds).add(tris)), scale)
            save(rgba, OUT / f'{name}-{st}.png', scale)
            pieces[f'{name}-{st}'] = {'x': x, 'y': y}
    (OUT / 'pieces.json').write_text(json.dumps(pieces, indent=1))
    ground_shadows(shadows, bounds)
    print('pieces', len(pieces))


def ground_shadows(shadows: dict, bounds) -> None:
    """The shadow the whole castle casts on the ground, for the court, and the keep's alone, which goes when the keep falls."""
    x0, y0, w, h = 540, 40, 1160, 540
    ys, xs = np.mgrid[0:h, 0:w]
    pts = np.stack([xs.ravel() + x0 + 0.5, ys.ravel() + y0 + 0.5, np.zeros(w * h)], axis=1)
    walls = ShadowMap(bounds)
    for n, sm in shadows.items():
        if n != 'keep':
            walls = walls.merged(sm)
    lit = walls.lit(pts).reshape(h, w)
    Image.fromarray((lit * 255).astype(np.uint8)).save(OUT / 'ground.png')
    keep = shadows['keep'].lit(pts).reshape(h, w)
    alpha = (1 - keep) * lit * 96
    Image.fromarray(np.dstack([np.full((h, w, 3), 20.0), alpha]).astype(np.uint8)).save(OUT / 'keepShadow.png')
    (OUT / 'ground.json').write_text(json.dumps({'x': x0, 'y': y0}))


if __name__ == '__main__':
    main()
