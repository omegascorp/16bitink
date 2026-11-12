"""The Meadowlands farm and village set as 3D models (native density-C pixels, origin = middle of the footprint).

A builder takes a state (2 whole, 1 cracked, 0 breached; or 1 and 0) and returns its pieces:
  body   what stands (sorts at its south edge, or its north edge when there is a front)
  front  the south wall of a building tanks drive into (barn, hangar), sorting at its foot
  roof   what fades when a tank is under or behind it (roofs, canopies, tall crops)
"""
from __future__ import annotations

import math
import random

import numpy as np

from kit import (BARK, BRICK, DOOR, FIELDSTONE, FLOOR, GLASS, LEAF, METAL, NEEDLE, PLANK, PLASTER, REDPLANK, RUST, SHINGLE, SLATE, STONE,
                 STRAW, TILE, TIMBER, WHITE, PMesh, blocks, cylinder, gable, gable_ends, hls, lump, panel, rafters, ragged, rubble, window)

REGISTRY: dict[str, dict] = {}


def structure(name: str, states: list[int], foot: str = 'hull', hp: int = 100, flattenable: bool = False, cover: bool = False, view: str = 'oblique'):
    def wrap(fn):
        REGISTRY[name] = {'build': fn, 'states': states, 'foot': foot, 'hp': hp, 'flattenable': flattenable, 'cover': cover, 'view': view}
        return fn
    return wrap


def rotate(m: PMesh, ang: float) -> PMesh:
    """The mesh turned by ang about the vertical axis (a proper rotation keeps faces outward)."""
    c, s = math.cos(ang), math.sin(ang)
    out = PMesh()
    for t, col in zip(m.tris, m.cols):
        t = np.array(t)
        out.tris.append(np.stack([t[:, 0] * c - t[:, 1] * s, t[:, 0] * s + t[:, 1] * c, t[:, 2]], axis=1))
        out.cols.append(col)
    out.runs = [[(x * c - y * s, x * s + y * c) for x, y in r] for r in m.runs]
    return out


def boards(m: PMesh, a: tuple, b: tuple, t: float, top, rng: random.Random, colour, bw: float = 4.0, holes=(), gone=None, solid: bool = True) -> None:
    """Vertical boards from a to b, each to its own height top(s); holes are (s0, s1, z0, z1) cut out of a board."""
    ax, ay = a
    bx, by = b
    length = math.hypot(bx - ax, by - ay)
    ang = math.atan2(by - ay, bx - ax)
    ux, uy = (bx - ax) / length, (by - ay) / length
    s, runs = 0.0, []
    while s < length - 0.5:
        s1 = min(length, s + bw)
        mid = (s + s1) / 2
        h = top(mid) - rng.uniform(0, 0.6)
        spans = [(0.0, h)]
        for h0, h1, z0, z1 in holes:
            if h0 <= mid <= h1:
                spans = [p for q in spans for p in ((q[0], min(q[1], z0)), (max(q[0], z1), q[1])) if p[1] - p[0] > 0.5]
        if not (gone and gone(mid)):
            col = colour(rng)
            for z0, z1 in spans:
                m.box(ax + ux * mid, ay + uy * mid + rng.uniform(-0.15, 0.15), (z0 + z1) / 2, s1 - s - 0.45, t, z1 - z0, ang, col)
            if spans and spans[0][0] < 0.5:
                runs.append((s, s1))
        s = s1
    if solid and runs:
        r0, r1 = runs[0]
        for s0, s1 in runs[1:]:
            if s0 <= r1 + 1:
                r1 = s1
            else:
                m.solid_rect(a, b, r0, r1, t)
                r0, r1 = s0, s1
        m.solid_rect(a, b, r0, r1, t)


def holes_in(pts: list[tuple[float, float, float]]):
    """keep(x, y) for a roof: False within r of any (x, y, r)."""
    return lambda x, y: all(math.hypot(x - hx, (y - hy) * 1.3) > r for hx, hy, r in pts)


# --- the farmhouse ------------------------------------------------------------------------------------------------------

FARMHOUSE = {'w': 150.0, 'd': 84.0, 't': 4.0, 'h': 40.0, 'ridge': 30.0}


@structure('farmhouse', [2, 1, 0], foot='hull', hp=600)
def farmhouse(state: int) -> dict:
    w, d, t, h = FARMHOUSE['w'], FARMHOUSE['d'], FARMHOUSE['t'], FARMHOUSE['h']
    x0, x1, y0, y1 = -w / 2, w / 2, -d / 2, d / 2
    rng = random.Random(41)
    body, roof = PMesh(), PMesh()
    full = lambda s: h  # noqa: E731
    door = (w / 2 - 14, w / 2 + 2, 0, 22)
    wins_low = [(22, 8, 19), (48, 8, 19), (104, 8, 19), (128, 8, 19)]
    wins_up = [(22, 26, 35), (60, 26, 35), (96, 26, 35), (128, 26, 35)]
    holes = [door] + [(s - 6, s + 6, z0, z1) for s, z0, z1 in wins_low + wins_up]
    if state == 2:
        top_s = top_e = top_n = top_w = full
        gone_s = None
    elif state == 1:
        top_s = lambda s: h - (10 if s > w - 24 else 0)  # noqa: E731
        top_e = lambda s: h - (8 if s > d - 20 else 0)  # noqa: E731
        top_n = top_w = full
        gone_s = lambda c, s, z: (abs(s - 80 - (z - 24) * 0.5) < 2.4 and 12 < z < 36) or (s > w - 30 and z > h - 14 and (c + int(s)) % 3 == 0)  # noqa: E731
    else:
        rs = ragged(h, 3, 0.25, 4)
        top_s = lambda s: 0 if 58 < s < 104 else rs(s, w) * (0.75 if s > 104 else 1)  # noqa: E731
        top_e = lambda s: h * 0.35 + 6 * math.sin(s * 0.3)  # noqa: E731
        rn = ragged(h, 8, 0.5)
        top_n = lambda s: rn(s, w) * (1 - 0.5 * s / w)  # noqa: E731
        top_w = lambda s: h  # noqa: E731
        gone_s = None
    # A stone plinth under plastered walls.
    for (a, b, top, hl) in (((x0, y1), (x1, y1), top_s, holes), ((x0, y0), (x1, y0), top_n, []),
                            ((x0, y0 + t), (x0, y1 - t), top_w, []), ((x1, y0 + t), (x1, y1 - t), top_e, [])):
        blocks(body, a, b, t + 0.6, lambda s, top=top: min(6, top(s)), rng, STONE, bl=7, ch=3, holes=[q for q in hl if q[2] < 6], gone=gone_s)
        blocks(body, a, b, t, top, rng, PLASTER, bl=9, ch=4.5, holes=hl, gone=gone_s, z_base=6, solid=False)
    # Timber: corner posts and a beam between the floors, on the south face.
    for x in (x0 + 1.5, x1 - 1.5):
        if top_s(x - x0) > 30:
            panel(body, (x, y1), 3.4, 6, top_s(x - x0), TIMBER(rng), out=t / 2 + 0.6)
    if state:
        for s in np.arange(0, w if state == 2 else w - 26, 6):
            if not (door[0] <= s + 3 <= door[1]):
                panel(body, (x0 + s + 3, y1), 6.2, 21.5, 23.5, TIMBER(rng), out=t / 2 + 0.6)
    for i, (s, z0, z1) in enumerate(wins_low + wins_up):
        if top_s(s) > z1 + 1:
            window(body, x0 + s, y1 + t / 2, z0, z1, 9, rng, broken=(state == 1 and i in (5, 2)) or state == 0)
    if state:
        panel(body, (x0 + (door[0] + door[1]) / 2, y1), 14, 0, 22, DOOR(rng), out=0.0, d=t - 1)
        panel(body, (x0 + (door[0] + door[1]) / 2, y1), 18, 22, 24, TIMBER(rng), out=t / 2 + 0.8)
        body.box(x0 + (door[0] + door[1]) / 2, y1 + 4, 1, 20, 6, 2, 0, hls(0.1, 0.08, 0.55))
    body.floor(0, 0, 0.6, w - 2 * t, d - 2 * t, 1.0, 0, FLOOR(rng))
    # The chimney, through the roof at the east end.
    ch_top = {2: h + FARMHOUSE['ridge'] + 10, 1: h + FARMHOUSE['ridge'] + 2, 0: h * 0.8}[state]
    blocks(body, (44, -12), (54, -12), 9, lambda s: ch_top, rng, BRICK, bl=5, ch=2.5, solid=False, z_base=h - 6 if state else 0)
    zr = h + FARMHOUSE['ridge']
    if state == 2:
        gable(roof, x0, x1, y0, y1, h, zr, rng, TILE, tile=5, rows=10, ridge_col=hls(0.03, 0.4, 0.3))
    elif state == 1:
        keep = holes_in([(-30, 20, 9), (40, 26, 6), (-55, -20, 7), (62, -6, 10)])
        gable(roof, x0, x1, y0, y1, h, zr, rng, TILE, tile=5, rows=10, keep=keep, ridge_col=hls(0.03, 0.4, 0.3))
        rafters(roof, x0, x1, y0, y1, h - 1, zr - 1, 12, TIMBER(rng), rng)
    else:
        keep = lambda x, y: x < -20 + 25 * math.sin(y * 0.09) and (x < -55 or y < 10 or random.Random(int(x * 7 + y)).random() > 0.4)  # noqa: E731
        gable(roof, x0, x1, y0, y1, h, zr, rng, TILE, tile=5, rows=10, keep=keep)
        rafters(roof, x0, x1 - 30, y0, y1, h - 1, zr - 1, 12, TIMBER(rng), rng, skip=lambda x: x > -20 and int(x) % 3 == 0)
    if state == 2:
        gable_ends(body, x0 + t / 2, y0, y1, h, zr - 1, PLASTER(rng))
    if state < 2:
        rubble(body, 20 if state == 0 else 64, y1 + 8, 30 if state == 0 else 10, 6 if state == 0 else 3, 60 if state == 0 else 14, random.Random(3 + state), PLASTER, 4.5)
        rubble(body, -10, y1 + 6, 16, 4, 20 if state == 0 else 6, random.Random(9), TILE, 3.5)
    if state == 0:
        rubble(body, 20, 0, 40, 20, 70, random.Random(12), TILE, 4)
    return {'body': body, 'roof': roof}


# --- the barn: tanks drive in through its doors ------------------------------------------------------------------------

BARN = {'w': 156.0, 'd': 108.0, 't': 3.0, 'h': 32.0, 'door': (46.0, 110.0)}


def gambrel(m: PMesh, x0, x1, y0, y1, z_eave, rng, colour, keep=None, over=3.0):
    """A barn roof: a steep lower slope and a shallow upper one, as two gable bands."""
    yc = (y0 + y1) / 2
    half = (y1 - y0) / 2
    zb, zr = z_eave + 22, z_eave + 34
    # Lower band: eave to the break, then upper band to the ridge (gable() with its own ridge at the break line).
    for side in (-1, 1):
        ye, yb = yc + side * (half + over), yc + side * half * 0.55
        rows = 6
        for (ya0, za0, ya1, za1, n) in ((ye, z_eave, yb, zb, rows), (yb, zb, yc, zr, rows)):
            for r in range(n):
                f0, f1 = r / n, (r + 1) / n
                ya, yb2 = ya0 + (ya1 - ya0) * f0, ya0 + (ya1 - ya0) * f1
                za, zb2 = za0 + (za1 - za0) * f0, za0 + (za1 - za0) * f1
                x = x0 - over - (2.5 if r % 2 else 0)
                while x < x1 + over:
                    xa, xb = max(x0 - over, x), min(x1 + over, x + 5)
                    if xb - xa > 0.8 and (keep is None or keep((xa + xb) / 2, (ya + yb2) / 2)):
                        lift = 0.5 + 0.3 * rng.random()
                        m.face([(xa + 0.2, ya, za + lift + 0.6), (xb - 0.2, ya, za + lift + 0.6), (xb - 0.2, yb2, zb2 + lift), (xa + 0.2, yb2, zb2 + lift)],
                               colour(rng), np.array([(xa + xb) / 2, yc, z_eave - 5]))
                    x += 5
    return zb, zr


@structure('barn', [2, 1, 0], foot='runs', hp=700)
def barn(state: int) -> dict:
    w, d, t, h = BARN['w'], BARN['d'], BARN['t'], BARN['h']
    x0, x1, y0, y1 = -w / 2, w / 2, -d / 2, d / 2
    rng = random.Random(51)
    back, front, roof = PMesh(), PMesh(), PMesh()
    a, b = BARN['door']
    full = lambda s: h  # noqa: E731
    if state == 2:
        tn = te = tw = full
        ts = lambda s: h  # noqa: E731
        gone = None
    elif state == 1:
        tn = lambda s: h - (6 if 30 < s < 50 else 0)  # noqa: E731
        te, tw = (lambda s: h - (9 if s > 70 else 0)), full
        ts = lambda s: h - (8 if s > w - 22 else 0)  # noqa: E731
        gone = lambda s: int(s) % 23 == 3  # noqa: E731
    else:
        rn = ragged(h, 4, 0.3, 4)
        tn = lambda s: rn(s, w)  # noqa: E731
        te = lambda s: h * 0.4 * (1 - s / d) + 4  # noqa: E731
        tw = lambda s: h * (0.9 - 0.4 * s / d)  # noqa: E731
        rs = ragged(h, 6, 0.2, 3)
        ts = lambda s: rs(s, w) * (0.6 if s > b else 1)  # noqa: E731
        gone = lambda s: int(s * 3) % 5 == 1  # noqa: E731
    boards(back, (x0, y0), (x1, y0), t, tn, rng, REDPLANK, gone=gone)
    boards(back, (x0, y0 + t), (x0, y1 - t), t, tw, rng, REDPLANK, gone=gone)
    boards(back, (x1, y0 + t), (x1, y1 - t), t, te, rng, REDPLANK, gone=gone)
    # The south wall over and beside the big doorway; the doors stand open flat against it.
    boards(front, (x0, y1), (x1, y1), t, lambda s: ts(s), rng, REDPLANK, holes=[(a, b, 0, 27)], gone=gone if state else None)
    white = WHITE(rng)
    for s0, s1 in ((0, a), (b, w)):
        for z in (1.5, h - 1.5):
            if ts((s0 + s1) / 2) > z + 1:
                panel(front, (x0 + (s0 + s1) / 2, y1), s1 - s0, z - 1.2, z + 1.2, white, out=t / 2 + 0.5)
    if state:
        panel(front, (x0 + (a + b) / 2, y1), b - a + 4, 26.5, 29, white, out=t / 2 + 0.5)
        for side, s in ((-1, a - 16), (1, b + 16)):
            if state == 1 and side > 0:
                continue
            c = (x0 + s, y1 + t / 2 + 1.2)
            panel(front, c, 30, 0.5, 26, REDPLANK(rng), out=0.6, d=1.4)
            for z0, z1 in ((0.5, 2.5), (24, 26)):
                panel(front, c, 30, z0, z1, white, out=1.6)
            # The white X brace on each door.
            for k in range(10):
                f = (k + 0.5) / 10
                panel(front, (c[0] - 13 + 26 * f, c[1]), 3.4, 2 + 22 * f - 1.2, 2 + 22 * f + 1.2, white, out=1.6)
                panel(front, (c[0] + 13 - 26 * f, c[1]), 3.4, 2 + 22 * f - 1.2, 2 + 22 * f + 1.2, white, out=1.6)
        # A hay loft door in the gable is in the roof piece; hay bales inside the north-east corner.
    back.box(0, 0, 0.5, w - 2 * t, d - 2 * t, 0.8, 0, FLOOR(rng))
    hay = lambda r: hls(0.13, 0.55, 0.58 + r.uniform(-0.04, 0.04))  # noqa: E731
    for i, (hx, hy, hz) in enumerate(((x1 - 22, y0 + 14, 4), (x1 - 42, y0 + 14, 4), (x1 - 22, y0 + 34, 4), (x1 - 32, y0 + 14, 12))):
        if state == 2 or i < 3:
            back.box(hx, hy, hz, 18, 12, 8, 0, hay(rng))
    if state == 2:
        gambrel(roof, x0, x1, y0, y1, h, rng, SHINGLE)
    elif state == 1:
        gambrel(roof, x0, x1, y0, y1, h, rng, SHINGLE, keep=holes_in([(-40, 10, 12), (30, -16, 9), (60, 30, 8)]))
        rafters(roof, x0, x1, y0, y1, h - 1, h + 33, 14, TIMBER(rng), rng)
    else:
        gambrel(roof, x0, x1, y0, y1, h, rng, SHINGLE, keep=lambda x, y: x < -40 + 18 * math.sin(y * 0.1) and (x + y * 0.5) % 17 > 4)
        rafters(roof, x0, x1, y0, y1, h - 1, h + 33, 14, TIMBER(rng), rng, skip=lambda x: x > -30 and int(x) % 28 > 6)
    if state < 2:
        rubble(front, x1 - 14, y1 + 6, 12, 3, 12 if state == 1 else 30, random.Random(5), REDPLANK, 4)
    if state == 0:
        rubble(back, 20, 0, 50, 30, 80, random.Random(15), SHINGLE, 4.5)
        rubble(back, -30, 10, 30, 20, 30, random.Random(16), REDPLANK, 5)
    return {'body': back, 'front': front, 'roof': roof}


# --- village houses ----------------------------------------------------------------------------------------------------

def cottage(state: int, w: float, d: float, h: float, ridge: float, walls, roof_col, seed: int, ridge_along_y: bool = False, chimney_x: float = -30) -> dict:
    x0, x1, y0, y1 = -w / 2, w / 2, -d / 2, d / 2
    rng = random.Random(seed)
    body, roof = PMesh(), PMesh()
    t = 4.0
    door = (w * 0.62 - 6, w * 0.62 + 6, 0, 20)
    wins = [(w * 0.22, 8, 18), (w * 0.86, 8, 18)] if w > 90 else [(w * 0.25, 8, 18)]
    if h > 32:
        wins.append((w * 0.3, 24, 32))
    holes = [door] + [(s - 5.5, s + 5.5, z0, z1) for s, z0, z1 in wins]
    if state == 2:
        ts = tn = te = tw = lambda s: h  # noqa: E731
        gone = None
    elif state == 1:
        ts = lambda s: h - (7 if s < 14 else 0)  # noqa: E731
        tn = tw = lambda s: h  # noqa: E731
        te = lambda s: h - (6 if s > d - 18 else 0)  # noqa: E731
        gone = lambda c, s, z: abs(s - w * 0.45 - (z - 16) * 0.6) < 2.2 and 6 < z < 26  # noqa: E731
    else:
        rs = ragged(h, seed, 0.2, 3)
        ts = lambda s: 0 if w * 0.3 < s < w * 0.72 else rs(s, w)  # noqa: E731
        tn = lambda s: h * (0.95 - 0.5 * s / w)  # noqa: E731
        tw = lambda s: h  # noqa: E731
        te = lambda s: h * 0.4  # noqa: E731
        gone = None
    for (a, b, top, hl) in (((x0, y1), (x1, y1), ts, holes), ((x0, y0), (x1, y0), tn, []), ((x0, y0 + t), (x0, y1 - t), tw, []), ((x1, y0 + t), (x1, y1 - t), te, [])):
        blocks(body, a, b, t, top, rng, walls, bl=6 if walls is STONE else 9, ch=3.5 if walls is STONE else 4.5, holes=hl, gone=gone)
    if walls is PLASTER and state:
        # Dark half-timbering on the south face.
        for s in np.linspace(2, w - 2, 7):
            if not (door[0] - 2 <= s <= door[1] + 2) and ts(s) > h - 2:
                panel(body, (x0 + s, y1), 2.6, 0, h, TIMBER(rng), out=t / 2 + 0.5)
        for z in (1.2, 21, h - 1.2):
            panel(body, (0, y1), w, z - 1.2, z + 1.2, TIMBER(rng), out=t / 2 + 0.5)
    for i, (s, z0, z1) in enumerate(wins):
        if ts(s) > z1 + 1:
            window(body, x0 + s, y1 + t / 2, z0, z1, 8, rng, broken=state == 0 or (state == 1 and i == 0), shutters=walls is STONE)
    if state:
        panel(body, (x0 + (door[0] + door[1]) / 2, y1), 11, 0, 20, DOOR(rng), out=0.0, d=t - 1)
        body.box(x0 + (door[0] + door[1]) / 2, y1 + 3.5, 0.8, 15, 5, 1.6, 0, hls(0.1, 0.08, 0.55))
    body.floor(0, 0, 0.6, w - 2 * t, d - 2 * t, 1.0, 0, FLOOR(rng))
    zr = h + ridge
    ch_top = {2: zr + 8, 1: zr, 0: h * 0.7}[state]
    blocks(body, (chimney_x - 4, 0), (chimney_x + 4, 0), 8, lambda s: ch_top, rng, BRICK if walls is STONE else STONE, bl=4, ch=3, solid=False, z_base=h - 6 if state else 0)
    if state == 2:
        keep = None
    elif state == 1:
        keep = holes_in([(w * 0.18, d * 0.2, 8), (-w * 0.2, -d * 0.15, 6)])
    else:
        keep = lambda x, y: x < -w * 0.15 + 10 * math.sin(y * 0.2) and (int(x * 3 + y) % 7 > 1)  # noqa: E731
    if ridge_along_y:
        r = PMesh()
        gable(r, y0, y1, -x1, -x0, h, zr, rng, roof_col, tile=4.5, rows=9, keep=(lambda x, y: keep(-y, x)) if keep else None, ridge_col=hls(0.03, 0.35, 0.3) if state == 2 else None)
        roof.add(rotate(r, math.pi / 2))
        if state >= 1:
            # The south gable end shows; an attic window in it.
            body.face([(x0, y1 - 0.4, h), (x1, y1 - 0.4, h), (0, y1 - 0.4, zr)], walls(rng), np.array([0, 0, h + 2]))
            window(body, 0, y1, h + 4, h + 11, 6, rng, shutters=False, broken=state == 1)
    else:
        gable(roof, x0, x1, y0, y1, h, zr, rng, roof_col, tile=4.5, rows=9, keep=keep, ridge_col=hls(0.6, 0.1, 0.28) if state == 2 else None)
        if state == 2:
            gable_ends(body, x0 + t / 2, y0, y1, h, zr - 1, walls(rng))
    if state < 2:
        rafters(roof, x0, x1, y0, y1, h - 1, zr - 1, 11, TIMBER(rng), rng, skip=(lambda x: x > -w * 0.1 and int(x) % 2 == 0) if state == 0 else None) if not ridge_along_y else None
        rubble(body, w * 0.1, y1 + 6, 22 if state == 0 else 8, 4, 40 if state == 0 else 10, random.Random(seed + state), walls, 4)
    if state == 0:
        rubble(body, 10, 0, w * 0.35, d * 0.3, 50, random.Random(seed + 9), SLATE if roof_col is SLATE else TILE, 4)
    return {'body': body, 'roof': roof}


@structure('houseStone', [2, 1, 0], foot='hull', hp=450)
def house_stone(state: int) -> dict:
    return cottage(state, 104, 70, 30, 24, STONE, SLATE, 61, chimney_x=-34)


@structure('houseTimber', [2, 1, 0], foot='hull', hp=400)
def house_timber(state: int) -> dict:
    return cottage(state, 84, 78, 34, 28, PLASTER, TILE, 71, ridge_along_y=True, chimney_x=22)


@structure('shed', [1, 0], foot='hull', hp=160)
def shed(state: int) -> dict:
    w, d, h = 58.0, 40.0, 22.0
    x0, x1, y0, y1 = -w / 2, w / 2, -d / 2, d / 2
    rng = random.Random(81)
    body, roof = PMesh(), PMesh()
    t = 2.6
    if state:
        tn, ts = (lambda s: h + 6), (lambda s: h)
        te = tw = lambda s: h + 6 * (1 - s / d)  # noqa: E731
    else:
        tn = lambda s: (h + 6) * (0.5 + 0.4 * math.sin(s * 0.15))  # noqa: E731
        ts = lambda s: 0 if s > 20 else h * 0.6  # noqa: E731
        te, tw = (lambda s: 6.0), (lambda s: (h + 6) * (1 - s / d) * 0.8)
    boards(body, (x0, y0), (x1, y0), t, tn, rng, PLANK)
    boards(body, (x0, y0 + t), (x0, y1 - t), t, tw, rng, PLANK)
    boards(body, (x1, y0 + t), (x1, y1 - t), t, te, rng, PLANK)
    boards(body, (x0, y1), (x1, y1), t, ts, rng, PLANK, holes=[(34, 46, 0, 17)])
    if state:
        panel(body, (x0 + 40, y1), 12, 0, 17, DOOR(rng), out=-0.2, d=1.2)
        window(body, x0 + 16, y1 + t / 2, 9, 16, 8, rng, shutters=False)
        # A lean-to roof of corrugated sheets, high at the back.
        for i, x in enumerate(np.arange(x0 - 3, x1 + 3, 7.5)):
            col = (RUST if i % 3 == 1 else METAL)(rng)
            n = 6
            for k in range(n):
                xa, xb = x + k * 7.5 / n, x + (k + 1) * 7.5 / n
                dz = 0.8 if k % 2 else 0
                roof.face([(xa, y1 + 3, h + dz), (xb, y1 + 3, h + dz), (xb, y0 - 2, h + 7.2 + dz), (xa, y0 - 2, h + 7.2 + dz)], col, np.array([x, 0, h - 5]))
    else:
        rubble(body, 4, 4, 22, 14, 30, rng, PLANK, 5)
        rubble(body, 12, y1 + 4, 12, 3, 8, rng, METAL, 6)
    body.floor(0, 0, 0.5, w - 2 * t, d - 2 * t, 0.8, 0, FLOOR(rng))
    return {'body': body, 'roof': roof}


# --- walls and fences: H runs east-west, V north-south, post joins and ends them ----------------------------------------

def wall_states(state: int, length: float, h: float, seed: int):
    if state == 2:
        return (lambda s: h), None, None
    if state == 1:
        return ((lambda s: h - (h * 0.4 if 0.55 * length < s < 0.75 * length else 0)),
                (lambda c, s, z: abs(s - length * 0.4 - (z - h / 2) * 0.8) < 2.4 and 2 < z < h - 2), None)
    return (lambda s: 0 if abs(s - length / 2) < length * 0.24 + 3 * math.sin(s) else h * (0.7 + 0.3 * math.cos(s * 0.4))), None, None


def run_wall(state: int, vertical: bool, length: float, t: float, h: float, colour, bl: float, ch: float, seed: int, cap=None) -> dict:
    rng = random.Random(seed + state)
    body = PMesh()
    top, gone, _ = wall_states(state, length, h, seed)
    a, b = ((0, -length / 2), (0, length / 2)) if vertical else ((-length / 2, 0), (length / 2, 0))
    blocks(body, a, b, t, top, rng, colour, bl=bl, ch=ch, gone=gone)
    if cap is not None and state == 2:
        blocks(body, a, b, t + 1.2, lambda s: h + 2, rng, cap, bl=bl * 1.5, ch=2, solid=False, z_base=h)
    if state < 2:
        n = 10 if state == 1 else 34
        if vertical:
            rubble(body, 5, 0, 4, length * 0.3, n, random.Random(seed + 7), colour, ch * 1.3)
        else:
            rubble(body, 0, 5, length * 0.3, 4, n, random.Random(seed + 7), colour, ch * 1.3)
            if state == 0:
                rubble(body, 0, -5, length * 0.2, 3, n // 2, random.Random(seed + 8), colour, ch * 1.3)
    return {'body': body}


for _v in (False, True):
    _k = 'V' if _v else 'H'
    structure(f'brickWall{_k}', [2, 1, 0], foot='runs', hp=220)(lambda s, v=_v: run_wall(s, v, 64, 5, 16, BRICK, 5, 2.5, 91, cap=STONE))
    structure(f'stoneWall{_k}', [2, 1, 0], foot='runs', hp=260)(lambda s, v=_v: run_wall(s, v, 64, 8, 11, FIELDSTONE, 6, 3.4, 95))


@structure('brickPost', [2, 0], foot='hull', hp=220)
def brick_post(state: int) -> dict:
    m = PMesh()
    rng = random.Random(97)
    h = 20 if state else 8
    blocks(m, (-4, 0), (4, 0), 8, lambda s: h, rng, BRICK, bl=4, ch=2.5)
    if state:
        m.box(0, 0, h + 1, 10, 10, 2, 0, STONE(rng))
    else:
        rubble(m, 2, 4, 7, 4, 12, rng, BRICK, 3)
    return {'body': m}


def fence(state: int, vertical: bool) -> dict:
    m = PMesh()
    rng = random.Random(101 + state)
    length, h = 64.0, 13.0
    post = lambda r: hls(0.07, 0.3, 0.3 + r.uniform(-0.04, 0.04))  # noqa: E731
    rail = lambda r: hls(0.08, 0.28, 0.44 + r.uniform(-0.05, 0.05))  # noqa: E731
    for i in range(5):
        s = -length / 2 + i * 16
        x, y = (0, s) if vertical else (s, 0)
        if state:
            m.box(x, y, h / 2 + 1, 2.6, 2.6, h + 2, 0, post(rng))
        else:
            m.box(x + (2 if vertical else 0), y + (0 if vertical else 3), 1.2, 2.6 if vertical else 2.6, 2.6 if vertical else h, 2.4, 0, post(rng))
    for z in (5.0, 11.0):
        if state:
            if vertical:
                m.box(0.8, 0, z, 1.4, length, 2.2, 0, rail(rng))
            else:
                m.box(0, 0.8, z, length, 1.4, 2.2, 0, rail(rng))
        else:
            for k in range(4):
                off = rng.uniform(-3, 3)
                if vertical:
                    m.box(3 + off, -length / 2 + 8 + k * 16, 0.8, 1.4, 15, 1.2, rng.uniform(-0.3, 0.3), rail(rng))
                else:
                    m.box(-length / 2 + 8 + k * 16, 3 + off, 0.8, 15, 1.4, 1.2, rng.uniform(-0.3, 0.3), rail(rng))
    m.solid_poly([(-1.5, -length / 2), (1.5, -length / 2), (1.5, length / 2), (-1.5, length / 2)] if vertical else
                 [(-length / 2, -1.5), (length / 2, -1.5), (length / 2, 1.5), (-length / 2, 1.5)])
    return {'body': m}


structure('fenceH', [1, 0], foot='runs', hp=40, flattenable=True)(lambda s: fence(s, False))
structure('fenceV', [1, 0], foot='runs', hp=40, flattenable=True)(lambda s: fence(s, True))


# --- trees, bushes, crops, rocks ---------------------------------------------------------------------------------------

def trunk_foot(m: PMesh, r: float) -> None:
    m.solid_poly([(r * math.cos(a), r * 0.8 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 9)[:-1]])


@structure('oak', [1, 0], foot='hull', hp=180)
def oak(state: int) -> dict:
    rng = random.Random(111)
    body, roof = PMesh(), PMesh()
    if state:
        cylinder(body, (0, 0), 4.2, 0, 30, BARK, rng, sides=10, ry=3.4)
        for k in range(5):
            a = k * 2 * math.pi / 5 + 0.3
            body.box(math.cos(a) * 5, math.sin(a) * 4, 1.0, 7, 2.2, 2.2, a, BARK(rng))
        for a, z in ((0.6, 22), (2.4, 25), (-0.9, 27)):
            body.box(math.cos(a) * 6, math.sin(a) * 3, z, 13, 2.2, 2.2, a, BARK(rng), (0, -0.5))
        for (dx, dy, dz, r) in ((0, 0, 40, 20), (-15, 4, 33, 14), (15, 2, 34, 15), (-6, -10, 47, 14), (8, -9, 48, 13), (2, 12, 30, 14), (-10, 10, 44, 10), (14, 12, 42, 10)):
            lump(roof, (dx, dy, dz), (r, r * 0.9, r * 0.82), LEAF, rng, n=8, jag=0.12)
    else:
        cylinder(body, (0, 0), 4.2, 0, 7, BARK, rng, sides=10, ry=3.4, top=lambda r: hls(0.09, 0.4, 0.55))
        # The felled trunk lies to the east, its crown crushed flat.
        body.box(22, 3, 3.5, 34, 6.5, 6.5, 0.15, BARK(rng))
        for (dx, dy, r) in ((46, 2, 13), (40, 10, 10), (50, -6, 9)):
            lump(body, (dx, dy, 2), (r, r * 0.8, 5), LEAF, rng, n=6, jag=0.2, floor=0.5)
    trunk_foot(body, 4.5)
    return {'body': body, 'roof': roof}


@structure('pine', [1, 0], foot='hull', hp=120, flattenable=True)
def pine(state: int) -> dict:
    rng = random.Random(121)
    body, roof = PMesh(), PMesh()
    if state:
        cylinder(body, (0, 0), 2.6, 0, 14, BARK, rng, sides=8, ry=2.2)
        for z0, z1, r in ((8, 26, 17.0), (17, 36, 13.5), (27, 46, 10.0), (37, 54, 6.5), (46, 62, 3.5)):
            sides = 14
            for i in range(sides):
                a0, a1 = 2 * math.pi * i / sides, 2 * math.pi * (i + 1) / sides
                jag = 1 + 0.16 * ((i * 7) % 3 - 1)
                roof.face([(r * jag * math.cos(a0), r * 0.85 * math.sin(a0), z0), (r * jag * math.cos(a1), r * 0.85 * math.sin(a1), z0), (0, 0, z1)], NEEDLE(rng), np.array([0, 0, z0 + 1]))
            roof.face([(r * math.cos(2 * math.pi * i / sides), r * 0.85 * math.sin(2 * math.pi * i / sides), z0) for i in range(sides)], NEEDLE(rng), np.array([0, 0, z0 + 5]))
    else:
        cylinder(body, (0, 0), 2.6, 0, 5, BARK, rng, sides=8, ry=2.2, top=lambda r: hls(0.09, 0.4, 0.55))
        body.box(18, -2, 2.4, 30, 4, 4, -0.2, BARK(rng))
        for k, r in enumerate((12, 10, 8, 6)):
            lump(body, (12 + k * 8, -2 - k * 1.6, 1.5), (r * 0.7, r, 3.5), NEEDLE, rng, n=6, jag=0.25, floor=0.4)
    trunk_foot(body, 3)
    return {'body': body, 'roof': roof}


@structure('bush', [1, 0], foot='hull', hp=30, flattenable=True, cover=True)
def bush(state: int) -> dict:
    rng = random.Random(131)
    body, roof = PMesh(), PMesh()
    if state:
        for (dx, dy, dz, r) in ((0, 0, 8, 10), (-9, 2, 6, 7.5), (9, 1, 6, 8), (2, 6, 5, 7), (-4, -5, 9, 7)):
            lump(roof, (dx, dy, dz), (r, r * 0.85, r * 0.8), LEAF, rng, n=7, jag=0.18, floor=0.3)
    else:
        for (dx, dy, r) in ((0, 0, 10), (-10, 3, 7), (10, 2, 8), (3, 8, 6)):
            lump(body, (dx, dy, 1), (r * 1.1, r * 0.9, 2.5), LEAF, rng, n=6, jag=0.3, floor=0.3)
        for k in range(6):
            body.box(rng.uniform(-10, 10), rng.uniform(-6, 6), 1.2, 7, 1, 1, rng.uniform(0, 3), BARK(rng))
    body.solid_poly([(-16, -8), (16, -8), (16, 8), (-16, 8)])
    return {'body': body, 'roof': roof}


@structure('crops', [1, 0], foot='hull', hp=10, flattenable=True, cover=True)
def crops(state: int) -> dict:
    rng = random.Random(141)
    body, roof = PMesh(), PMesh()
    w, d = 96.0, 64.0
    ear = lambda r: hls(0.12, 0.6, 0.66 + r.uniform(-0.05, 0.05))  # noqa: E731
    for row in range(int(d / 5)):
        y = -d / 2 + 2.5 + row * 5
        x = -w / 2 + 1.5 + (row % 2) * 1.5
        while x < w / 2 - 1:
            hgt = 15 + rng.uniform(-2.5, 2.5)
            if state:
                roof.box(x, y, hgt / 2, 2.2, 2.2, hgt, rng.uniform(0, 1), STRAW(rng), (rng.uniform(-0.12, 0.12), rng.uniform(-0.12, 0.12)))
                roof.box(x, y, hgt + 1.5, 2.4, 2.4, 3.2, rng.uniform(0, 1), ear(rng))
            else:
                roof.box(x + 2, y, 0.8, 2.2, 7, 1.0, 0.4 + rng.uniform(-0.3, 0.3), STRAW(rng))
            x += 3 + rng.uniform(-0.4, 0.6)
    body.solid_poly([(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)])
    if not state:
        return {'body': roof}
    return {'body': body, 'roof': roof}


def rock(seed: int, size: float) -> dict:
    m = PMesh()
    rng = random.Random(seed)
    for k in range(3):
        c = (rng.uniform(-size * 0.4, size * 0.4), rng.uniform(-size * 0.2, size * 0.2), size * 0.15)
        r = rng.uniform(0.5, 0.75) * size
        lump(m, c, (r, r * 0.75, r * 0.62), FIELDSTONE, rng, n=5, jag=0.18, floor=0.0)
    pts = [(p[0], p[1]) for t in m.tris for p in t if p[2] < 1.0]
    m.solid_poly(pts)
    return {'body': m}


structure('rockA', [1], foot='hull', hp=0)(lambda s: rock(1, 12))
structure('rockB', [1], foot='hull', hp=0)(lambda s: rock(2, 18))
structure('rockC', [1], foot='hull', hp=0)(lambda s: rock(5, 26))
