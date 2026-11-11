"""The Norse ring fort, log by log, in the battle world's units. Every part is modular, and a state of a part is the same stones with some gone.

  python3 dev/pixel/siege3d/castle_norse.py          every part, in every state -> out/norse/
  python3 dev/pixel/siege3d/castle_norse.py --view   only the castle whole and broken, to look at the model
  python3 dev/pixel/siege3d/castle_norse.py --obj    also the 3D scene as OBJ files, for a 3D tool

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
OUT = HERE / 'out' / 'norse'

hex_x = lambda c, r: 161 + 44 * c + (22 if r % 2 else 0)  # noqa: E731
hex_y = lambda r: 88 + 42 * r  # noqa: E731
WALL_COL = [12, 11, 11, 10, 10, 9, 10, 10, 11, 11, 12]  # as src/logic/siege.ts
W = [(hex_x(c, r), hex_y(r)) for r, c in enumerate(WALL_COL)]

COURSE = 8.0
BANNER = stone_colour(0.03, 0.52, 0.42)
IRON = np.array([0.2, 0.2, 0.24])
WALL = dict(h=58.0, t=26.0)
# The gatehouse stands in the line of the wall, on the gate's hex: two square turrets with the passage running east to west between them.
# Its door faces the attacker, which this view sees edge-on, so a shut gate can't be seen: the game lowers a bridge when it opens.
GATE = dict(x0=556.0, x1=600.0, north=252.0, south=344.0, half=20.0, h=84.0, roof=52.0)
DRUM = dict(r=26.0, h=84.0)
# The corner towers stay low: the north one for its company to stay on a 16:9 screen, the south one to leave the court's last rows in sight.
TOWER = dict(r=30.0, h=66.0)
# The hall: a long house of logs behind the last column, its west end where the keep's steps stop.
HALL = dict(x0=832.0, x1=950.0, d=52.0, h=44.0, roof=30.0, loft=36.0, loft_h=70.0)
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


LOG_HUE, LOG_SAT, LOG_LIGHT = 0.07, 0.34, 0.36
EARTH = stone_colour(0.075, 0.28, 0.27)
SNOW = stone_colour(0.58, 0.22, 0.93)
CHAR = stone_colour(0.06, 0.12, 0.12)
DARK = np.array([0.15, 0.1, 0.07])
PLANK = stone_colour(0.085, 0.4, 0.45)
BANK = 22.0


def col(tone: float = 1.0) -> np.ndarray:
    return stone_colour(LOG_HUE, LOG_SAT, LOG_LIGHT * tone)


def snowy(k: float = 0.5, tone: float = 1.0) -> np.ndarray:
    return col(tone) * (1 - k) + SNOW * k


def jagged(seed: int, base, swing: float):
    """A broken edge: base(t) with a wandering offset, the same every time."""
    r = random.Random(seed)
    pts = [r.uniform(-swing / 2, swing / 2) for _ in range(15)]

    def edge(t: float) -> float:
        f = max(0.0, min(0.999, t)) * 13
        i = int(f)
        return base(t) + pts[i] * (1 - (f - i)) + pts[i + 1] * (f - i)
    return edge


def spike(m: Mesh, x: float, y: float, z: float, w: float, h: float, colour: np.ndarray, a: float = 0.0) -> None:
    """A sharpened tip: a four-sided point on a square of side `w`."""
    u = np.array([math.cos(a), math.sin(a), 0.0]) * w / 2
    v = np.array([-math.sin(a), math.cos(a), 0.0]) * w / 2
    c = np.array([x, y, z])
    apex = c + np.array([0, 0, h])
    corners = [c - u - v, c + u - v, c + u + v, c - u + v]
    for i in range(4):
        m.face([corners[i], corners[(i + 1) % 4], apex], colour, c + np.array([0, 0, -1]))


def stake(m: Mesh, x: float, y: float, z0: float, top: float, a: float, keep, tt: float, shade: float, burn: bool, r: random.Random, w: float = 6.2) -> None:
    """An upright log from z0 to `top`, sharpened if it stands whole; cut off and splintered, its top scorched, if the keep has taken the rest."""
    z, last = z0, z0
    while z < top - 0.1:
        zt = min(z + COURSE, top)
        if keep(tt, (z + zt) / 2):
            cut = zt >= top - 0.1 or not keep(tt, zt + 4)
            scorched = burn and ((cut and zt < top - 0.1) or r.random() < 0.1)
            m.box(x, y, (z + zt) / 2, w, w, zt - z + 0.2, a, CHAR * (0.8 + r.random() * 0.4) if scorched else col(shade * (0.78 if z < z0 + 6 else 1)))
            last = zt
        z = zt
    if last >= top - 0.1:
        spike(m, x, y, last, w, 9, snowy(0.55, shade), a)
    elif last > z0:
        m.box(x, y, last + 3, w - 2.4, w - 2.4, 9, a, CHAR if burn else col(shade * 0.8), (r.uniform(-0.5, 0.5), r.uniform(-0.5, 0.5)))


def palisade(m: Mesh, p0, p1, h: float, t: float, seed: int = 1, keep=lambda t, z: True, burn: bool = False, tone: float = 1.0) -> None:
    """A straight stretch of ring wall: an earth bank under snow, a tall row of sharpened logs and a lower inner row, rails, and a walk between them."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    length = math.hypot(dx, dy)
    a = math.atan2(dy, dx)
    ux, uy = dx / length, dy / length
    nx, ny = -uy, ux
    if nx * (INSIDE[0] - p0[0]) + ny * (INSIDE[1] - p0[1]) > 0:
        nx, ny = -nx, -ny
    r = random.Random(seed)
    half = t / 2
    at = lambda u, n: (p0[0] + ux * u + nx * n, p0[1] + uy * u + ny * n)  # noqa: E731
    P = lambda u, n, z: (*at(u, n), z)  # noqa: E731
    u = 0.0
    while u < length - 0.5:
        u1 = min(length, u + 6.0)
        tt = (u + u1) / 2 / length
        bh = BANK if keep(tt, BANK - 2) else 5.0
        w0, w1 = half + 10, half - 3
        shade = 0.9 + r.random() * 0.2
        mid = (*at((u + u1) / 2, 0), bh / 2)
        m.face([P(u, w0, 0), P(u1, w0, 0), P(u1, w1, bh), P(u, w1, bh)], EARTH * shade * (0.85 if bh < BANK else 1), np.array(mid))
        m.face([P(u, -w0, 0), P(u1, -w0, 0), P(u1, -w1, bh), P(u, -w1, bh)], EARTH * shade * 0.9, np.array(mid))
        m.face([P(u, -w1, bh), P(u1, -w1, bh), P(u1, w1, bh), P(u, w1, bh)], SNOW * (0.94 + r.random() * 0.06) if bh >= BANK else EARTH * 0.8, np.array(mid))
        for e in (u, u1):
            m.face([P(e, -w0, 0), P(e, w0, 0), P(e, w1, bh), P(e, -w1, bh)], EARTH * 0.9, np.array(mid))
        u = u1
    for row, (n, ht) in enumerate(((half - 4, h), (-half + 4, h - 12))):
        u = 3.0 + row * 3.3
        while u < length - 1:
            x, y = at(u, n)
            stake(m, x, y, BANK - 2, ht + r.uniform(-3, 5), a, keep, u / length, 0.8 + r.random() * 0.35, burn, r)
            u += 6.6
    deck = max(4.0, t - 14)
    u = 0.0
    while u < length:
        tt = (u + 4) / length
        for z in (BANK + 9, BANK + 25):
            if keep(tt, z):
                m.box(*at(u + 4, half - 0.6), z, 8.2, 2.6, 3, a, col(tone * 0.9))
        if keep(tt, BANK + 13):
            m.box(*at(u + 4, 0), BANK + 13, 8, deck, 2.5, a, col(tone * (0.8 + r.random() * 0.15)))
            m.box(*at(u + 4, 0), BANK + 15.2, 8, deck - 1, 1.6, a, SNOW * 0.92)
        u += 8


def blockhouse(m: Mesh, x0: float, x1: float, y0: float, y1: float, h: float, seed: int, keep, burn: bool, roof: bool) -> None:
    """A square log tower: laid logs with their ends crossing at the corners, a hoarding at the top, stakes round it or a snowy pitched roof."""
    r = random.Random(seed)
    span, yc, xc = x1 - x0, (y0 + y1) / 2, (x0 + x1) / 2
    ch = 12.0 if burn else h
    m.box(xc, yc, ch / 2, span - 4, y1 - y0 - 4, ch, 0.0, DARK)
    for c in range(math.ceil(h / COURSE)):
        z = c * COURSE + COURSE / 2
        ex = 3.0 if c % 2 else 0.0
        shade = lambda: (0.8 + r.random() * 0.3) * (0.74 if c < 2 else 1)  # noqa: E731
        for y in (y0 + 3.5, y1 - 3.5):
            for i in range(4):
                xs = x0 + span * (i + 0.5) / 4
                if keep((xs - x0) / span, z):
                    lo, hi = (x0 - ex if i == 0 else xs - span / 8), (x1 + ex if i == 3 else xs + span / 8)
                    m.box((lo + hi) / 2, y, z, hi - lo - 0.5, 6.8, COURSE - 0.8, 0.0, CHAR * 1.3 if burn and r.random() < 0.2 else col(shade()))
        for x in (x0 + 3.5, x1 - 3.5):
            for i in range(3):
                ys = y0 + (y1 - y0) * (i + 0.5) / 3
                if keep(0.03 if x < xc else 0.97, z):
                    lo, hi = (y0 - ex if i == 0 else ys - (y1 - y0) / 6), (y1 + ex if i == 2 else ys + (y1 - y0) / 6)
                    m.box(x, (lo + hi) / 2, z, 6.8, hi - lo - 0.5, COURSE - 0.8, 0.0, col(shade() * 0.9))
    for y, out in ((y0 - 1.5, -1), (y1 + 1.5, 1)):
        for i in range(5):
            xs = x0 + span * (i + 0.5) / 5
            if keep((xs - x0) / span, h - 4):
                m.box(xs, y, h - 5, span / 5 - 0.6, 5, 8, 0.0, col(0.88 + r.random() * 0.2))
    if roof:
        ridge = h + 24
        lo, hi = x0 - 4, x1 + 4
        for y, edge in ((y0 - 5, -1), (y1 + 5, 1)):
            inside = np.array([xc, yc, h + 6])
            slope(m, lo, hi, y, h - 2, yc, ridge, inside, r, 4)
            m.box(xc, y - edge * 0.3, h - 1, hi - lo, 2.5, 3, 0.0, col(0.9))
        for x in (lo, hi):
            m.face([(x, y0 - 5, h - 2), (x, y1 + 5, h - 2), (x, yc, ridge)], col(0.8), np.array([xc, yc, h]))
        return
    for i in range(math.ceil(span / 7)):
        xs = x0 + 3.5 + i * 7
        if xs > x1 - 2:
            break
        for y in (y0 + 2.5, y1 - 2.5):
            stake(m, xs, y, h - 6, h + 12, 0.0, keep, (xs - x0) / span, 0.85 + r.random() * 0.3, burn, r, 5.4)


def slope(m: Mesh, lo: float, hi: float, y_eave: float, z_eave: float, y_top: float, z_top: float, ins: np.ndarray, r: random.Random, bands: int = 5) -> None:
    """A pitched roof side in shingle courses, snow lying on them and the dark wood showing at the eaves."""
    for b in range(bands):
        f0, f1 = b / bands, (b + 1) / bands
        ya, yb = y_eave + (y_top - y_eave) * f0, y_eave + (y_top - y_eave) * f1
        za, zb = z_eave + (z_top - z_eave) * f0, z_eave + (z_top - z_eave) * f1
        for i in range(6):
            xa, xb = lo + (hi - lo) * i / 6, lo + (hi - lo) * (i + 1) / 6
            wood = b == 0 and r.random() < 0.6 or r.random() < 0.1
            c = col(0.62 + r.random() * 0.2) if wood else SNOW * (0.8 + r.random() * 0.1 - 0.03 * b)
            m.face([(xa, ya, za), (xb, ya, za), (xb, yb, zb), (xa, yb, zb)], c, ins)


def logpile(m: Mesh, x: float, y: float, spread: float, n: int, seed: int) -> None:
    """Fallen timber: logs and splinters heaped, charred, thickest in the middle."""
    r = random.Random(seed)
    for _ in range(n):
        d = r.random() ** 1.6 * spread
        th = r.random() * math.pi * 2
        height = (1 - d / spread) * 12 * r.random()
        c = CHAR * (0.8 + r.random() * 0.6) if r.random() < 0.55 else col(0.55 + r.random() * 0.4)
        m.box(x + math.cos(th) * d, y + math.sin(th) * d * 0.62, 3 + height, 6 + r.random() * 14, 4 + r.random() * 2.5, 3 + r.random() * 2.5, r.random() * 6, c, (r.uniform(-0.3, 0.3), r.uniform(-0.3, 0.3)))
    for _ in range(n // 6):
        d = r.random() * spread * 0.8
        th = r.random() * math.pi * 2
        m.box(x + math.cos(th) * d, y + math.sin(th) * d * 0.62, 2.4, 14, 9, 2, r.random() * 6, SNOW * 0.95)


def shield(m: Mesh, x: float, y: float, z: float, rad: float, colour: np.ndarray) -> None:
    ring = [(x + math.cos(i / 10 * math.pi * 2) * rad, y, z + math.sin(i / 10 * math.pi * 2) * rad) for i in range(10)]
    m.face(ring, colour, np.array([x, y - 3, z]))
    boss = [(x + math.cos(i / 8 * math.pi * 2) * rad * 0.3, y + 0.4, z + math.sin(i / 8 * math.pi * 2) * rad * 0.3) for i in range(8)]
    m.face(boss, np.array([0.62, 0.6, 0.58]), np.array([x, y - 3, z]))


def gate(m: Mesh, state: int) -> None:
    """The gatehouse: two timber towers, the road's plank floor between them, over it a low log deck with the dark of the passage above."""
    x0, x1, north, south, half, h, roof = (GATE[k] for k in ('x0', 'x1', 'north', 'south', 'half', 'h', 'roof'))
    mid = (north + south) / 2
    x = (x0 + x1) / 2
    broken = state == 0
    edge = jagged(41, lambda u: h * 0.36 + 20 * abs(2 * u - 1), 22)
    keep = (lambda u, z: z < edge(u)) if broken else (lambda u, z: True)
    blockhouse(m, x0, x1, north, mid - half, h, 9, keep, broken, not broken)
    blockhouse(m, x0, x1, mid + half, south, h, 10, keep, broken, not broken)
    m.box(x, mid, 1, x1 - x0, half * 2, 2, 0.0, col(0.5))
    if broken:
        logpile(m, x, mid + 20, 36, 60, 77)
        return
    m.box(x, mid, roof - 4, x1 - x0, half * 2, 8, 0.0, col(0.5))
    m.box(x, mid, roof + 1, x1 - x0, half * 2, 2, 0.0, SNOW * 0.9)
    m.box(x, mid - half + 1, (roof + h - 8) / 2, x1 - x0 - 4, 2, h - 8 - roof, 0.0, np.array([0.1, 0.07, 0.05]))
    y = south + 5.4
    top, bottom = h - 6, h - 48
    m.face([(x - 7, y, top), (x + 7, y, top), (x + 7, y, bottom + 7), (x, y, bottom), (x - 7, y, bottom + 7)], BANNER, np.array([x, y - 3, top]))
    for dx, c in ((-14, BANNER), (14, stone_colour(0.1, 0.5, 0.5))):
        shield(m, x + dx, y + 0.2, h - 62, 7, c)


def stretch_keep(state: int, h: float, seed: int):
    """What a stretch keeps: cracked loses a few logs and some points; down opens a gap, wider at the top."""
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


def tower(into: Mesh, p, r: float, h: float, seed: int = 2, keep=lambda th, z: True, burn: bool = False) -> None:
    """A log tower: upright staves round a dark inside, iron bands, a hoarding, a plank floor under snow and a ring of stakes."""
    m = Mesh()
    rnd = random.Random(seed)
    n = round(2 * math.pi * r / 7.5)
    whole = all(keep(t, h + 1) for t in (0, math.pi / 2, math.pi, 3 * math.pi / 2))
    for i in range(n):
        th = i / n * math.pi * 2
        shade, j = 0.8 + rnd.random() * 0.35, rnd.random()
        ln = 2 * math.pi * (r - 3) / n
        for c in range(math.ceil(h / COURSE)):
            z = c * COURSE + COURSE / 2
            if keep(th, z):
                scorched = burn and rnd.random() < 0.3
                m.box(p[0] + math.cos(th) * (r - 3 + j * 0.8 - 0.4), p[1] + math.sin(th) * (r - 3 + j * 0.8 - 0.4), z, ln - 0.2, 6, COURSE + 0.2, th + math.pi / 2, CHAR if scorched else col(shade * (0.74 if c < 1 else 1)))
        for z in (h * 0.3, h * 0.66):
            if keep(th, z):
                m.box(p[0] + math.cos(th) * (r - 0.4), p[1] + math.sin(th) * (r - 0.4), z, ln + 0.4, 2, 2.4, th + math.pi / 2, IRON)
    core = [(p[0] + math.cos(i / 40 * math.pi * 2) * (r - 5.5), p[1] + math.sin(i / 40 * math.pi * 2) * (r - 5.5)) for i in range(40)]
    m.prism(core, 0, h if whole else 8, DARK)
    if keep(0, h + 1) or keep(math.pi, h + 1):
        hc = round(2 * math.pi * (r + 2) / 9)
        for i in range(hc):
            th = i / hc * math.pi * 2
            if keep(th, h + 4):
                m.box(p[0] + math.cos(th) * (r + 2.5), p[1] + math.sin(th) * (r + 2.5), h + 4, 2 * math.pi * (r + 2.5) / hc - 0.4, 8, 8, th + math.pi / 2, col(0.85 + rnd.random() * 0.25))
        if whole:
            floor = [(p[0] + math.cos(i / 40 * math.pi * 2) * (r + 1), p[1] + math.sin(i / 40 * math.pi * 2) * (r + 1)) for i in range(40)]
            m.prism(floor, h + 9, h + 12.5, col(0.62), snowy(0.45, 0.8))
        count = round(2 * math.pi * r / 8) | 1
        for i in range(count):
            th = i / count * math.pi * 2
            if keep(th, h + 18):
                stake(m, p[0] + math.cos(th) * (r + 3.5), p[1] + math.sin(th) * (r + 3.5), h + 10, h + 27 + rnd.random() * 4, th + math.pi / 2, lambda t_, z_: True, 0.5, 0.85 + rnd.random() * 0.3, burn, rnd, 5.6)
    for t in m.tris:
        t[:, 1] = p[1] + (t[:, 1] - p[1]) * ROUND
    into.tris += m.tris
    into.cols += m.cols


IRON = np.array([0.2, 0.2, 0.24])


def longhouse(m: Mesh, state: int) -> None:
    """The hall: a long timber house with a steep snowy roof and a door, a high log loft at its west end where the keep's company keeps watch, its steps climbing from the keep's hex. Burnt down, it is stumps, fallen rafters and ash."""
    x0, x1, xl = HALL['x0'], HALL['x1'], HALL['x0'] + HALL['loft']
    y0, y1 = hex_y(5) - HALL['d'] / 2, hex_y(5) + HALL['d'] / 2
    yc = (y0 + y1) / 2
    h, ridge = HALL['h'], HALL['h'] + HALL['roof']
    r = random.Random(71)
    whole = state == 1
    edge = jagged(52, lambda u: 12 + 12 * abs(math.sin(u * 5)), 14)
    keep = (lambda u, z: True) if whole else (lambda u, z: z < edge(u))
    blockhouse(m, x0, xl, y0, y1, HALL['loft_h'], 12, keep, not whole, False)
    if whole:
        m.box((x0 + xl) / 2, yc, HALL['loft_h'] + 1.5, xl - x0 - 2, y1 - y0 - 2, 3, 0.0, col(0.62))
        m.box((x0 + xl) / 2, yc, HALL['loft_h'] + 3.2, xl - x0 - 8, y1 - y0 - 8, 1.6, 0.0, SNOW * 0.9)
    xc = (xl + x1) / 2
    ch = h if whole else 10
    m.box(xc, yc, ch / 2, x1 - xl - 4, y1 - y0 - 4, ch, 0.0, DARK)
    for c in range(math.ceil(h / COURSE)):
        z = c * COURSE + COURSE / 2
        for y in (y0 + 3.5, y1 - 3.5):
            for i in range(7):
                xs = xl + (x1 - xl) * (i + 0.5) / 7
                if keep((xs - xl) / (x1 - xl), z):
                    m.box(xs, y, z, (x1 - xl) / 7 - 0.4, 6.8, COURSE - 0.8, 0.0, CHAR if not whole and r.random() < 0.35 else col((0.8 + r.random() * 0.3) * (0.74 if c < 2 else 1)))
        for i in range(4):
            ys = y0 + (y1 - y0) * (i + 0.5) / 4
            if keep(0.97, z):
                m.box(x1 - 3.5, ys, z, 6.8, (y1 - y0) / 4 - 0.4, COURSE - 0.8, 0.0, col(0.8 + r.random() * 0.3))
    if whole:
        lo, hi = xl - 2, x1 + 10
        for y in (y0 - 9, y1 + 9):
            ins = np.array([xc, yc, h + 10])
            slope(m, lo, hi, y, h - 3, yc, ridge, ins, r, 5)
            m.box((lo + hi) / 2, y, h - 2, hi - lo, 2.6, 3.4, 0.0, col(0.8))
        m.face([(hi, y0 - 9, h - 3), (hi, y1 + 9, h - 3), (hi, yc, ridge)], col(0.8), np.array([xc, yc, h]))
        m.box((lo + hi) / 2, yc, ridge + 1, hi - lo, 4, 4, 0.0, col(0.7))
        m.box(hi + 1, yc, ridge + 5, 3, 3.4, 13, 0.0, col(0.7), (0.0, 0.6))
        m.box(hi - 3, yc, ridge + 12, 7, 3.4, 3.4, 0.0, col(0.85))
        door = xl + 28
        m.box(door, y1 + 1.2, 16, 20, 3, 32, 0.0, np.array([0.18, 0.11, 0.07]))
        m.box(door, y1 + 3.2, 33, 26, 3, 3, 0.0, col(0.85))
        for i, c in enumerate((BANNER, stone_colour(0.1, 0.5, 0.5), BANNER, stone_colour(0.58, 0.4, 0.4))):
            shield(m, xl + 7 + i * 10 + (22 if i > 1 else 0) + (6 if i > 1 else 0), y1 + 4, h - 12, 5, c)
    else:
        for _ in range(9):
            m.box(x0 + r.random() * (x1 - x0), y0 + r.random() * (y1 - y0), 10, 5, 5, 38, 0.0, CHAR, (r.uniform(-1, 1), r.uniform(-1, 1)))
        logpile(m, (x0 + x1) / 2, yc + 4, 52, 90, 29)


def steps(m: Mesh) -> None:
    """The hall's steps, plank by plank, climbing east from the keep's hex to its door."""
    x, y = KEEP_HEX
    r = random.Random(61)
    for i in range(5):
        run = HALL['x0'] - (x - 20) - i * 9
        m.box(x - 20 + i * 9 + run / 2, y, 2 + i * 3, run, 40 - i * 2, 3, 0.0, col(0.95 + r.random() * 0.14))


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
    burn = state != PARTS[name][0]
    if name == 'wallNorth':
        palisade(m, line(*NORTH_ARM, 0.06), line(*NORTH_ARM, 0.46), h, t, seed=21, keep=stretch_keep(state, h, 5), burn=burn)
        if state == 0:
            x, y = line(*NORTH_ARM, 0.26)
            logpile(m, x + 6, y + 6, 40, 70, 31)
    elif name == 'wallNorthInner':
        palisade(m, line(*NORTH_ARM, 0.46), line(*NORTH_ARM, 0.92), h, t, seed=22)
    elif name == 'wallSouthInner':
        palisade(m, line(*SOUTH_ARM, 0.06), line(*SOUTH_ARM, 0.54), h, t, seed=23)
    elif name == 'wallSouth':
        palisade(m, line(*SOUTH_ARM, 0.54), line(*SOUTH_ARM, 0.95), h, t, seed=24, keep=stretch_keep(state, h, 6), burn=burn)
        if state == 0:
            x, y = line(*SOUTH_ARM, 0.74)
            logpile(m, x, y + 6, 40, 70, 32)
    elif name == 'wallSouthEnd':
        palisade(m, line(*SOUTH_ARM, 0.95), line(*SOUTH_ARM, SOUTH_END - 0.05), h, t, seed=28)
    elif name == 'gate':
        gate(m, state)
    elif name == 'farWall':
        palisade(m, (W[0][0], FAR['y']), (FAR['x1'], FAR['y']), FAR['h'], FAR['t'], seed=26)
    elif name == 'nearWall':
        palisade(m, (NEAR['x0'], NEAR['y']), (NEAR['x1'], NEAR['y']), NEAR['h'], NEAR['t'], seed=27)
    elif name == 'keep':
        longhouse(m, state)
        steps(m)
    else:
        p, o = {'wallGateNorth': (NORTH_DRUM, DRUM), 'wallGateSouth': (SOUTH_DRUM, DRUM), 'towerNorth': (W[0], TOWER), 'towerSouth': (SOUTH_TOWER, TOWER)}[name]
        full = PARTS[name][0]
        damage = 2 if state == full else 0 if state == 0 else 1
        tower(m, p, o['r'], o['h'], seed=len(name) * 7, keep=tower_keep(damage, o['h'], len(name) * 13), burn=burn)
        if state == 0:
            logpile(m, p[0] + 4, p[1] + 10, o['r'] * 1.6, 50, len(name))
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
    only = [a[7:] for a in sys.argv if a.startswith('--only=')]
    pieces = json.loads((OUT / 'pieces.json').read_text()) if only and (OUT / 'pieces.json').exists() else {}
    for name, states in PARTS.items():
        if only and name not in only[0].split(','):
            continue
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
