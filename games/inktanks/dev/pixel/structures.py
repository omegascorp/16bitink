"""InkTanks' structures as 3D models in the InkHeroes field projection: screen = (gx, gy - z), sun from the front left.

  python3 dev/pixel/structures.py          out/structures/<key>.png + <key>-shadow.png + structures.json
  python3 dev/pixel/structures.py --view   out/structures/view.png only

Every structure is modelled round its own origin, the middle of its footprint on the ground; structures.json gives each
piece's top-left on screen from that origin, its sort line (gy where the game sorts it among the tanks) and the boxes
tanks collide with. Pieces a tank can be behind or under (the roof, the canopies) are separate, so the game can fade them,
and nothing is painted twice: the walls under the roof are their own pieces (docs/inkheroes-castles.md, "Traps").
"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from render3d import SUN, Mesh, ShadowMap, render, shrink, stone_colour

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out' / 'structures'
K = 3
BOUNDS = (-300.0, 300.0, -300.0, 300.0)


def brick(rng: random.Random) -> np.ndarray:
    return stone_colour(0.03 + rng.uniform(-0.012, 0.015), 0.42 + rng.uniform(-0.08, 0.06), 0.38 + rng.uniform(-0.06, 0.06))


def plaster(rng: random.Random) -> np.ndarray:
    return stone_colour(0.1 + rng.uniform(-0.01, 0.01), 0.22, 0.66 + rng.uniform(-0.05, 0.04))


def bricks(m: Mesh, a: tuple, b: tuple, t: float, top, rng: random.Random, holes=(), gone=frozenset(), loose=frozenset(), bl=3.6, ch=1.8, colour=brick) -> list:
    """A wall of bricks from a to b, `t` thick, courses up to top(s) (s: 0 to length); holes are (s0, s1, z0, z1).
    `gone` drops bricks by their (course, index); `loose` tips them. Returns the keys it laid, for a damage pattern."""
    ax, ay = a
    bx, by = b
    length = math.hypot(bx - ax, by - ay)
    ang = math.atan2(by - ay, bx - ax)
    ux, uy = (bx - ax) / length, (by - ay) / length
    laid = []
    course = 0
    z = 0.0
    while z < 60:
        off = (course % 2) * bl / 2
        s = -off
        i = 0
        while s < length:
            s0, s1 = max(0.0, s), min(length, s + bl)
            mid = (s0 + s1) / 2
            col = colour(rng)
            key = (course, i)
            jitter = rng.uniform(-0.12, 0.12)
            if s1 - s0 > 0.6 and z + ch <= top(mid) + 0.01 and not any(h0 <= mid <= h1 and z0 <= z + ch / 2 <= z1 for h0, h1, z0, z1 in holes):
                laid.append(key)
                if key not in gone:
                    tilt = (rng.uniform(-0.35, 0.35), rng.uniform(-0.3, 0.3)) if key in loose else None
                    m.box(ax + ux * mid, ay + uy * mid + jitter * 0.3, z + ch / 2, s1 - s0 - 0.28, t + jitter, ch - 0.26, ang, col, tilt)
            s += bl
            i += 1
        z += ch
        course += 1
        if z >= max(top(x) for x in np.linspace(0, length, 24)):
            break
    return laid


def rubble(m: Mesh, cx: float, cy: float, rx: float, ry: float, n: int, rng: random.Random, colour=brick) -> None:
    """Fallen bricks in a heap: more and higher in the middle."""
    for _ in range(n):
        r = rng.random() ** 0.7
        a = rng.uniform(0, 2 * math.pi)
        x, y = cx + math.cos(a) * rx * r, cy + math.sin(a) * ry * r
        z = (1 - r) * 2.6 + 0.5
        m.box(x, y, z, rng.uniform(2.0, 3.6), rng.uniform(1.4, 2.2), rng.uniform(1.0, 1.8), rng.uniform(0, math.pi), colour(rng), (rng.uniform(-0.5, 0.5), rng.uniform(-0.5, 0.5)))


# --- the breakable wall: 2 whole, 1 cracked, 0 breached --------------------------------------------------------------

WALL = {'l': 60.0, 't': 4.0, 'h': 14.4}


def wall(state: int) -> Mesh:
    m = Mesh()
    rng = random.Random(7)
    l, t, h = WALL['l'], WALL['t'], WALL['h']
    probe = bricks(Mesh(), (-l / 2, 0), (l / 2, 0), t, lambda s: h, random.Random(7))
    cy = h / 1.8
    gone: set = set()
    loose: set = set()
    if state == 1:
        # Cracked: a few bricks knocked out in a diagonal run through the middle, their neighbours loosened.
        for (c, i) in probe:
            if abs(i - 8 - (c - 4) * 0.6) < 0.7 and 2 <= c <= 7:
                gone.add((c, i))
            elif abs(i - 8 - (c - 4) * 0.6) < 1.8 and 1 <= c <= 7:
                loose.add((c, i))
        gone |= {(7, 7), (7, 8), (7, 9), (6, 9), (7, 12)}
    if state == 0:
        # Breached: a hole a tank fits through, down to the ground, ragged at its edges.
        for (c, i) in probe:
            half = 5.1 + (c * 0.3) + (0.7 if (c + i) % 3 == 0 else 0)
            if abs(i - 8.3) < half:
                gone.add((c, i))
            elif abs(i - 8.3) < half + 1:
                loose.add((c, i))
    bricks(m, (-l / 2, 0), (l / 2, 0), t, lambda s: h - (0.0 if state else 0.0), rng, gone=frozenset(gone), loose=frozenset(loose))
    if state == 1:
        rubble(m, 1.0, 4.5, 6, 2.0, 7, random.Random(3))
    if state == 0:
        rubble(m, -1.0, 5.5, 14, 4.0, 34, random.Random(4))
        rubble(m, 2.0, -5.0, 12, 3.0, 18, random.Random(5))
    return m


# --- the ruined house: back walls, front wall, roof --------------------------------------------------------------------

HOUSE = {'w': 76.0, 'd': 52.0, 't': 3.2, 'h': 22.0, 'door': (26.0, 62.0)}


def ragged(h: float, seed: int, low: float = 0.55) -> callable:
    """A broken wall top: full height at the corners, bitten down in between."""
    rng = random.Random(seed)
    bites = [(rng.uniform(0.15, 0.85), rng.uniform(0.06, 0.16), rng.uniform(0.15, 1 - low)) for _ in range(3)]

    def top(s: float, length: float = 1.0) -> float:
        f = s / length
        cut = max([d * h * max(0, 1 - abs(f - c) / wdt) for c, wdt, d in bites] + [0])
        return h - cut
    return top


def house(piece: str) -> Mesh:
    m = Mesh()
    w, d, t, h = HOUSE['w'], HOUSE['d'], HOUSE['t'], HOUSE['h']
    x0, x1, y0, y1 = -w / 2, w / 2, -d / 2, d / 2
    rng = random.Random(11 + len(piece))
    if piece == 'houseBack':
        top_n = ragged(h, 2, 0.75)
        bricks(m, (x0, y0), (x1, y0), t, lambda s: top_n(s, w), rng, holes=[(14, 22, 9, 17), (50, 58, 9, 17)], colour=plaster)
        # West wall whole (the roof rests on it), east wall broken down to a stub.
        bricks(m, (x0, y0 + t), (x0, y1 - t), t, lambda s: h, rng, colour=plaster)
        bricks(m, (x1, y0 + t), (x1, y1 - t), t, lambda s: h * (0.95 - 0.55 * s / d), rng, colour=plaster)
        # No floor: grass has grown in; only fallen plaster and bricks lie inside.
        for i in range(10):
            rng.uniform(-1, 1)
        rubble(m, x1 - 12, y0 + 10, 9, 6, 26, rng, colour=plaster)
    elif piece == 'houseFront':
        top_s = ragged(h, 5, 0.6)
        a, b = HOUSE['door']
        # The south wall, with the breach a tank drives in by and one window.
        bricks(m, (x0, y1), (x1, y1), t, lambda s: 0 if a < s < b else top_s(s, w) if s > b else h, rng, holes=[(10, 18, 8, 16)], colour=plaster)
        rubble(m, x0 + (a + b) / 2, y1 + 3, 10, 3, 16, rng, colour=plaster)
        rubble(m, x0 + b + 4, y1 + 4, 6, 3, 10, random.Random(9), colour=plaster)
    else:
        # The roof over the west half: tiles on a gable, ridge running east-west, broken off ragged to the east.
        rx1 = x0 + w * 0.58
        tile = lambda: stone_colour(0.6 + rng.uniform(-0.02, 0.02), 0.12, 0.3 + rng.uniform(-0.05, 0.05))  # noqa: E731
        ridge_z = h + 12
        for side in (-1, 1):
            rows = 7
            for r in range(rows):
                f0, f1 = r / rows, (r + 1) / rows
                ya, yb = side * (d / 2 + 2) * (1 - f0), side * (d / 2 + 2) * (1 - f1)
                za, zb = h + (ridge_z - h) * f0, h + (ridge_z - h) * f1
                end = rx1 - (4 if r % 2 else 0) - (rng.uniform(0, 10) if r < 4 else rng.uniform(0, 3))
                x = x0 - 2
                while x < end:
                    xe = min(end, x + 4.2)
                    col = tile()
                    lift = 0.35
                    m.face([(x, ya, za + lift), (xe, ya, za + lift), (xe, yb, zb + lift), (x, yb, zb + lift)], col, np.array([(x + xe) / 2, 0, h]))
                    x = xe + 0.3
            # Rafters showing past the broken edge.
        m.box((x0 - 2 + rx1) / 2, 0, ridge_z + 0.8, rx1 - x0 + 2, 2.2, 1.6, 0.0, stone_colour(0.03, 0.35, 0.28))
        # Its gable wall on the west, under the roof.
        m.face([(x0, -d / 2, h), (x0, d / 2, h), (x0, 0, ridge_z)], plaster(rng), np.array([0, 0, h]))
    return m


# --- the corner ruin: an L of broken wall with no roof ------------------------------------------------------------------

def corner() -> Mesh:
    m = Mesh()
    rng = random.Random(21)
    top_a = ragged(16, 8, 0.5)
    top_b = ragged(14, 12, 0.4)
    bricks(m, (-20, 8), (16, 8), 3.2, lambda s: top_a(s, 36) * (1 - 0.6 * s / 36), rng)
    bricks(m, (-20, -14), (-20, 5), 3.2, lambda s: top_b(s, 19), rng)
    rubble(m, 2, 12, 12, 3, 18, rng)
    return m


# --- trees and rocks: a trunk and its canopy are separate pieces -----------------------------------------------------

def sphere(m: Mesh, c: tuple, r: tuple, col_fn, n: int = 8) -> None:
    """A lumpy ellipsoid, `r` its radii."""
    for i in range(n):
        th0, th1 = math.pi * i / n, math.pi * (i + 1) / n
        for j in range(n * 2):
            ph0, ph1 = 2 * math.pi * j / (n * 2), 2 * math.pi * (j + 1) / (n * 2)
            pts = []
            for th, ph in ((th0, ph0), (th0, ph1), (th1, ph1), (th1, ph0)):
                pts.append((c[0] + r[0] * math.sin(th) * math.cos(ph), c[1] + r[1] * math.sin(th) * math.sin(ph), c[2] + r[2] * math.cos(th)))
            m.face(pts, col_fn(), np.array(c))


def tree(kind: str, piece: str) -> Mesh:
    m = Mesh()
    rng = random.Random(31 if kind == 'oak' else 37)
    bark = stone_colour(0.07, 0.3, 0.24)
    leaf = lambda: stone_colour(0.24 + rng.uniform(-0.02, 0.02), 0.42, 0.3 + rng.uniform(-0.04, 0.04))  # noqa: E731
    if kind == 'oak':
        if piece == 'trunk':
            for k in range(6):
                a = k * math.pi / 3
                m.box(math.cos(a) * 1.6, math.sin(a) * 1.2, 0.6, 4.0, 1.2, 1.2, a, bark)
            sides = 8
            pts = [(1.8 * math.cos(2 * math.pi * i / sides), 1.5 * math.sin(2 * math.pi * i / sides)) for i in range(sides)]
            m.prism(pts, 0, 16, bark)
        else:
            for (dx, dy, dz, r) in ((0, 0, 20, 10), (-7, 2, 16, 7), (7, 1, 17, 7.5), (-3, -5, 24, 7), (4, -4, 25, 6.5), (1, 5, 14, 7)):
                sphere(m, (dx, dy, dz), (r, r * 0.9, r * 0.85), leaf)
    else:
        if piece == 'trunk':
            sides = 6
            pts = [(1.2 * math.cos(2 * math.pi * i / sides), 1.0 * math.sin(2 * math.pi * i / sides)) for i in range(sides)]
            m.prism(pts, 0, 8, bark)
        else:
            dark = lambda: stone_colour(0.36 + rng.uniform(-0.02, 0.02), 0.35, 0.22 + rng.uniform(-0.03, 0.03))  # noqa: E731
            for z0, z1, r in ((6, 18, 9.0), (13, 25, 7.0), (20, 32, 5.0), (27, 37, 3.0)):
                sides = 10
                for i in range(sides):
                    a0, a1 = 2 * math.pi * i / sides, 2 * math.pi * (i + 1) / sides
                    jag = 1 + 0.12 * ((i * 7) % 3 - 1)
                    m.face([(r * jag * math.cos(a0), r * 0.85 * math.sin(a0), z0), (r * jag * math.cos(a1), r * 0.85 * math.sin(a1), z0), (0, 0, z1)], dark(), np.array([0, 0, z0 + 1]))
    return m


def rock(seed: int, size: float) -> Mesh:
    m = Mesh()
    rng = random.Random(seed)
    grey = lambda: stone_colour(0.1 + rng.uniform(-0.02, 0.03), 0.08 + rng.uniform(0, 0.06), 0.45 + rng.uniform(-0.06, 0.05))  # noqa: E731
    for _ in range(3):
        c = (rng.uniform(-size * 0.4, size * 0.4), rng.uniform(-size * 0.2, size * 0.2), size * 0.2)
        r = rng.uniform(0.5, 0.75) * size
        n = 5
        pts_m = Mesh()
        sphere(pts_m, c, (r, r * 0.75, r * 0.6), grey, n=n)
        tris, cols = pts_m.arrays()
        # Faceted: push vertices about, deterministically, and keep only what's above ground.
        jit = np.array([math.sin(p[0] * 1.7 + seed) * 0.12 + 1 for t in tris for p in t]).reshape(len(tris), 3, 1)
        tris = c + (tris - c) * jit
        tris[..., 2] = np.maximum(tris[..., 2], 0)
        for tri, col in zip(tris, cols):
            m.tris.append(tri)
            m.cols.append(col)
    return m


PIECES = {
    'wall-2': lambda: wall(2), 'wall-1': lambda: wall(1), 'wall-0': lambda: wall(0),
    'oakTrunk': lambda: tree('oak', 'trunk'), 'oakCanopy': lambda: tree('oak', 'canopy'),
    'pineTrunk': lambda: tree('pine', 'trunk'), 'pineCanopy': lambda: tree('pine', 'canopy'),
    'rockA': lambda: rock(1, 9), 'rockB': lambda: rock(2, 6), 'rockC': lambda: rock(5, 12),
    'houseBack': lambda: house('houseBack'), 'houseFront': lambda: house('houseFront'), 'houseRoof': lambda: house('roof'),
    'corner': corner,
}
# Pieces that cast a ground shadow of their own (the roof's goes with the house; the canopy's with its tree).
SHADOW_OF = {'wall-2': ['wall-2'], 'wall-1': ['wall-1'], 'wall-0': ['wall-0'], 'oak': ['oakTrunk', 'oakCanopy'], 'pine': ['pineTrunk', 'pineCanopy'],
             'rockA': ['rockA'], 'rockB': ['rockB'], 'rockC': ['rockC'], 'house': ['houseBack', 'houseFront', 'houseRoof'], 'corner': ['corner']}
# Where each piece sorts among the tanks, as gy from its origin: its own foot, nearest the viewer.
SORT = {'wall-2': 2, 'wall-1': 2, 'wall-0': 2, 'oakTrunk': 1, 'pineTrunk': 1, 'rockA': 3, 'rockB': 2, 'rockC': 4,
        'houseBack': -HOUSE['d'] / 2 + 2, 'houseFront': HOUSE['d'] / 2 + 2, 'corner': 9, 'oakCanopy': 999, 'pineCanopy': 999, 'houseRoof': 999}


def ground_shadow(meshes: list[Mesh], name: str) -> dict:
    sm = ShadowMap(BOUNDS)
    for mesh in meshes:
        sm.add(mesh.arrays()[0])
    x0, y0, w, h = -70, -90, 150, 150
    ys, xs = np.mgrid[0:h * 2, 0:w * 2]
    pts = np.stack([xs.ravel() / 2 + x0 + 0.25, ys.ravel() / 2 + y0 + 0.25, np.zeros(w * h * 4)], axis=1)
    lit = sm.lit(pts).reshape(h * 2, w * 2)
    dark = 1 - lit.reshape(h, 2, w, 2).mean(axis=(1, 3))
    alpha = (dark > 0.5) * 92.0
    im = Image.fromarray(np.dstack([np.full((h, w, 3), 18.0), alpha]).astype(np.uint8))
    box = im.getbbox()
    if not box:
        return {}
    im.crop(box).save(OUT / f'{name}-shadow.png')
    return {'x': x0 + box[0], 'y': y0 + box[1]}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    meta: dict = {'pieces': {}, 'shadows': {}, 'wall': WALL, 'house': HOUSE, 'sun': SUN.tolist()}
    meshes = {k: f() for k, f in PIECES.items()}
    rendered = {}
    for key, mesh in meshes.items():
        tris, cols = mesh.arrays()
        sm = ShadowMap(BOUNDS).add(tris)
        if key.startswith('house'):
            for other in ('houseBack', 'houseFront', 'houseRoof'):
                if other != key:
                    sm.add(meshes[other].arrays()[0])
        if key.endswith('Trunk'):
            sm.add(meshes[key.replace('Trunk', 'Canopy')].arrays()[0])
        rgba, x, y = render(tris, cols, sm, K)
        im = Image.fromarray(shrink(rgba, K))
        box = im.getbbox()
        im = im.crop(box)
        im.save(OUT / f'{key}.png')
        rendered[key] = im
        meta['pieces'][key] = {'x': x + box[0], 'y': y + box[1], 'w': im.width, 'h': im.height, 'sort': SORT[key]}
    if '--view' not in sys.argv:
        for name, keys in SHADOW_OF.items():
            meta['shadows'][name] = ground_shadow([meshes[k] for k in keys], name)
    view = Image.new('RGBA', (900, 300), (110, 112, 104, 255))
    x = 4
    for key, im in rendered.items():
        big = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
        if x + big.width > 900:
            break
        view.alpha_composite(big, (x, 300 - big.height - 4 if not key.startswith('house') else 4))
        x += big.width + 4
    house_view = Image.new('RGBA', (220, 200), (110, 112, 104, 255))
    for key in ('houseBack', 'houseFront', 'houseRoof'):
        p = meta['pieces'][key]
        house_view.alpha_composite(rendered[key], (int(p['x']) + 110, int(p['y']) + 120))
    view.alpha_composite(house_view.resize((440, 400), Image.NEAREST).crop((0, 0, 440, 300)), (460, 0))
    view.save(OUT / 'view.png')
    (OUT / 'structures.json').write_text(json.dumps(meta, indent=1))
    print(len(rendered), 'pieces', {k: (v.width, v.height) for k, v in rendered.items()})


if __name__ == '__main__':
    main()
