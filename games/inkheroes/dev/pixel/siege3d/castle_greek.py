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
GATE = dict(a=(518.0, 273.0), b=(597.0, 313.0), h=86.0, t=30.0, half=17.0, spring=32.0)
DRUM = dict(r=26.0, h=84.0)
TURRET = dict(r=16.0, h=98.0)
TOWER = dict(r=30.0, h=96.0)
# The north tower stops low enough for its company to stay on a 16:9 screen.
NORTH_TOWER = dict(r=30.0, h=66.0)
KEEP = dict(r=38.0, h=150.0)
FAR = dict(y=70.0, h=52.0, t=20.0, x1=1100.0)
# The wall nearest the viewer, along the field's bottom edge. It starts at the south tower's side and the game shows it see-through.
NEAR = dict(y=526.0, h=52.0, t=20.0, x0=707.0, x1=1100.0)
# A point in the court: a wall's battlements go on the side away from it.
INSIDE = (900.0, 300.0)
NORTH_DRUM = (W[4][0] + 8.0, W[4][1] - 6.0)
SOUTH_DRUM = (W[6][0] + 8.0, W[6][1] + 4.0)
# A round tower's foot is squashed north to south: the field shows the ground at full depth, which would make its top a full circle.
ROUND = 0.58
KEEP_AT = (hex_x(14, 3), hex_y(3))
# Every part and its states: 2 whole, 1 cracked, 0 down (a gate, keep or tower has only whole and down).
PARTS = {
    'wallNorth': (2, 1, 0), 'wallSouth': (2, 1, 0), 'wallGateNorth': (2, 1, 0), 'wallGateSouth': (2, 1, 0),
    'gate': (1, 0), 'keep': (1, 0), 'towerNorth': (1, 0), 'towerSouth': (1, 0),
    'wallNorthInner': (2,), 'wallSouthInner': (2,), 'gateLink': (2,), 'gateTurret': (2,), 'farWall': (2,), 'nearWall': (2,),
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


def gate(m: Mesh, state: int) -> None:
    """The gate: a thick stretch of wall with a real passage through it, its face turned to the attacker."""
    A, B, h, t, half, spring = GATE['a'], GATE['b'], GATE['h'], GATE['t'], GATE['half'], GATE['spring']
    dx, dy = B[0] - A[0], B[1] - A[1]
    length = math.hypot(dx, dy)
    a = math.atan2(dy, dx)
    mid = length * 0.5
    broken = state == 0
    edge = jagged(41, lambda u: h * 0.62 + 16 * abs(2 * u - 1), 22)

    def in_arch(u: float, z: float) -> bool:
        return abs(u - mid) < half + 3 and z < spring + math.sqrt(max(0.0, (half + 3) ** 2 - (u - mid) ** 2))
    wall(m, A, B, h, t, seed=9, hole=in_arch, keep=(lambda u, z: z < edge(u)) if broken else (lambda u, z: True), merlons=not broken)
    ux, uy = dx / length, dy / length
    nx, ny = -uy, ux
    at = lambda u, n: (A[0] + ux * u + nx * n, A[1] + uy * u + ny * n)  # noqa: E731
    # The arch's ring of cut stones, standing proud of the face.
    for i in range(14):
        th = i / 13 * math.pi
        if broken and 3 < i < 9:
            continue
        x, y = at(mid + math.cos(th) * (half + 2.5), t / 2 + 0.8)
        m.box(x, y, spring + math.sin(th) * (half + 2.5), 6.5, 4, 7, a, col(1.16), (0, 0))
    # The passage: its floor, its sides and its dark far end.
    fx, fy = at(mid, 0)
    m.box(fx, fy, 1, half * 2 + 6, t, 2, a, col(0.5))
    for side in (-1, 1):
        sx, sy = at(mid + side * (half + 1.5), 0)
        m.box(sx, sy, spring / 2 + 2, 3, t, spring + 4, a, col(0.46))
    bx, by = at(mid, -t / 2 + 1.5)
    m.box(bx, by, spring / 2 + 8, half * 2 + 6, 3, spring + 16, a, np.array([0.1, 0.075, 0.06]) if not broken else np.array([0.16, 0.12, 0.09]))
    if broken:
        x, y = at(mid, t / 2 + 12)
        rubble(m, x, y, 40, 60, 77)
        return
    px, py = at(mid, t / 2 - 5)
    for i in range(-3, 4):
        m.box(px + ux * i * 6, py + uy * i * 6, spring / 2 + 8, 1.8, 2, spring + 14, a, IRON)
    for j in range(6):
        m.box(px, py, 5 + j * 9, half * 2, 2, 1.8, a, IRON)
    # The Greek front: a pediment over the arch, a frieze, pilasters.
    gx, gy = at(mid, t / 2 + 1)
    base = spring + half + 8
    pale = col(1.14)
    span = 28
    tri = [(gx - ux * span, gy - uy * span, base), (gx + ux * span, gy + uy * span, base), (gx, gy, base + 14)]
    m.face(tri, pale, np.array([gx - nx * 4, gy - ny * 4, base]))
    m.box(gx, gy, base - 2, 60, 5, 4, a, col(1.18))
    for side in (-1, 1):
        cx, cy = at(mid + side * 24, t / 2 + 1.5)
        z = 4.0
        while z < base - 4:
            m.box(cx, cy, z, 5, 4, 7.2, a, col(1.08))
            z += 8
    # Two banners either side of the pediment.
    for side in (-1, 1):
        cx, cy = at(mid + side * 33, t / 2 + 1.2)
        top, bottom = h - 2, h - 40
        m.face([(cx - ux * 4, cy - uy * 4, top), (cx + ux * 4, cy + uy * 4, top), (cx + ux * 4, cy + uy * 4, bottom + 5), (cx, cy, bottom), (cx - ux * 4, cy - uy * 4, bottom + 5)], BANNER, np.array([cx - nx * 3, cy - ny * 3, top]))


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


def line(a, b, t: float) -> tuple[float, float]:
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


NORTH_ARM = (W[0], NORTH_DRUM)
SOUTH_ARM = (SOUTH_DRUM, W[10])


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
    elif name == 'gateLink':
        wall(m, GATE['a'], NORTH_DRUM, GATE['h'] - 8, 22, seed=25)
    elif name == 'gateTurret':
        tower(m, GATE['a'], TURRET['r'], TURRET['h'], seed=40)
    elif name == 'gate':
        gate(m, state)
    elif name == 'farWall':
        wall(m, (W[0][0], FAR['y']), (FAR['x1'], FAR['y']), FAR['h'], FAR['t'], seed=26)
    elif name == 'nearWall':
        wall(m, (NEAR['x0'], NEAR['y']), (NEAR['x1'], NEAR['y']), NEAR['h'], NEAR['t'], seed=27)
    else:
        p, o = {'wallGateNorth': (NORTH_DRUM, DRUM), 'wallGateSouth': (SOUTH_DRUM, DRUM), 'towerNorth': (W[0], NORTH_TOWER), 'towerSouth': (W[10], TOWER), 'keep': (KEEP_AT, KEEP)}[name]
        full = PARTS[name][0]
        damage = 2 if state == full else 0 if state == 0 else 1
        tower(m, p, o['r'], o['h'], seed=len(name) * 7, keep=tower_keep(damage, o['h'], len(name) * 13))
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
