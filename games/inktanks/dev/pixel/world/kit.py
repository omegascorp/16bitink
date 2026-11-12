"""Building blocks for the Meadowlands structures: walls of blocks, plank walls, tiled roofs, rubble, lumps.

Every model is in native density-C pixels (960 x 540 view): a point is (gx, gy, z), on screen (gx, gy - z).
A mesh remembers its solid ground runs, so a structure's footprint comes from the model, never from a guess.
"""
from __future__ import annotations

import math
import random
from typing import Callable

import numpy as np

from render3d import Mesh, stone_colour

Colour = Callable[[random.Random], np.ndarray]


def hls(h: float, s: float, l: float) -> np.ndarray:
    return stone_colour(h, s, l)


def tone(h: float, s: float, l: float, dh: float = 0.01, dl: float = 0.05) -> Colour:
    return lambda r: hls(h + r.uniform(-dh, dh), s, l + r.uniform(-dl, dl))


BRICK = tone(0.025, 0.45, 0.38, 0.01, 0.06)
PLASTER = tone(0.11, 0.28, 0.72, 0.006, 0.03)
STONE = tone(0.1, 0.07, 0.52, 0.03, 0.07)
FIELDSTONE = tone(0.09, 0.1, 0.48, 0.04, 0.09)
TIMBER = tone(0.07, 0.35, 0.24, 0.01, 0.03)
PLANK = tone(0.075, 0.33, 0.4, 0.01, 0.06)
REDPLANK = tone(0.005, 0.5, 0.36, 0.008, 0.04)
TILE = tone(0.035, 0.5, 0.42, 0.012, 0.06)
SLATE = tone(0.6, 0.12, 0.36, 0.02, 0.05)
SHINGLE = tone(0.08, 0.18, 0.36, 0.015, 0.05)
GLASS = lambda r: hls(0.58, 0.3, 0.2)  # noqa: E731
WHITE = lambda r: hls(0.12, 0.15, 0.86)  # noqa: E731
DOOR = tone(0.06, 0.4, 0.3, 0.005, 0.02)
FLOOR = tone(0.08, 0.25, 0.3, 0.01, 0.03)
METAL = tone(0.25, 0.12, 0.42, 0.02, 0.04)
RUST = tone(0.05, 0.45, 0.33, 0.01, 0.05)
LEAF = tone(0.25, 0.42, 0.32, 0.02, 0.05)
NEEDLE = tone(0.38, 0.35, 0.23, 0.02, 0.03)
BARK = tone(0.07, 0.3, 0.25, 0.01, 0.03)
STRAW = tone(0.12, 0.55, 0.58, 0.015, 0.06)


class PMesh(Mesh):
    """A mesh that also records its solid ground runs: rectangles (as polygons) a tank collides with."""

    def __init__(self) -> None:
        super().__init__()
        self.runs: list[list[tuple[float, float]]] = []
        self.hull_pts: list[tuple[float, float]] = []
        self.floor_ids: set[int] = set()

    def floor(self, *args) -> None:
        """A box that is a building's floor: after painting it takes the barn's painted planks (see sheets.py floors)."""
        start = len(self.tris)
        self.box(*args)
        self.floor_ids.update(range(start, len(self.tris)))

    def add(self, other: 'PMesh') -> 'PMesh':
        self.floor_ids |= {i + len(self.tris) for i in other.floor_ids}
        self.tris += other.tris
        self.cols += other.cols
        self.runs += other.runs
        self.hull_pts += other.hull_pts
        return self

    def solid_rect(self, a: tuple, b: tuple, s0: float, s1: float, t: float) -> None:
        ax, ay = a
        bx, by = b
        length = math.hypot(bx - ax, by - ay)
        ux, uy = (bx - ax) / length, (by - ay) / length
        nx, ny = -uy * t / 2, ux * t / 2
        p0 = (ax + ux * s0, ay + uy * s0)
        p1 = (ax + ux * s1, ay + uy * s1)
        self.runs.append([(p0[0] - nx, p0[1] - ny), (p1[0] - nx, p1[1] - ny), (p1[0] + nx, p1[1] + ny), (p0[0] + nx, p0[1] + ny)])

    def solid_poly(self, pts: list[tuple[float, float]]) -> None:
        self.runs.append([(float(x), float(y)) for x, y in pts])


def hull(pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Convex hull, monotone chain, counter-clockwise on screen."""
    p = sorted(set((round(x, 1), round(y, 1)) for x, y in pts))
    if len(p) < 3:
        return p

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo: list = []
    for q in p:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], q) <= 0:
            lo.pop()
        lo.append(q)
    hi: list = []
    for q in reversed(p):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], q) <= 0:
            hi.pop()
        hi.append(q)
    return lo[:-1] + hi[:-1]


def blocks(m: PMesh, a: tuple, b: tuple, t: float, top: Callable[[float], float], rng: random.Random, colour: Colour,
           bl: float = 6.0, ch: float = 3.0, holes=(), gone: Callable | None = None, loose: Callable | None = None,
           solid: bool = True, z_base: float = 0.0) -> None:
    """A wall of blocks from a to b, `t` thick, courses up to top(s) (s from 0 to its length).
    holes are (s0, s1, z0, z1); gone(course, s, z) drops a block, loose(course, s, z) tips it.
    Its bottom course's contiguous runs become solid ground runs."""
    ax, ay = a
    bx, by = b
    length = math.hypot(bx - ax, by - ay)
    ang = math.atan2(by - ay, bx - ax)
    ux, uy = (bx - ax) / length, (by - ay) / length
    course, z = 0, z_base
    hi = max(top(x) for x in np.linspace(0, length, 48))
    bottom: list[tuple[float, float]] = []
    while z + ch <= hi + 0.01:
        off = (course % 2) * bl / 2
        s = -off
        while s < length:
            s0, s1 = max(0.0, s), min(length, s + bl)
            mid = (s0 + s1) / 2
            zc = z + ch / 2
            if s1 - s0 > 1.0 and z + ch <= top(mid) + 0.01 and not any(h0 <= mid <= h1 and z0 <= zc <= z1 for h0, h1, z0, z1 in holes):
                if not (gone and gone(course, mid, zc)):
                    tilt = (rng.uniform(-0.4, 0.4), rng.uniform(-0.3, 0.3)) if loose and loose(course, mid, zc) else None
                    j = rng.uniform(-0.25, 0.25)
                    m.box(ax + ux * mid - uy * j, ay + uy * mid + ux * j, zc, s1 - s0 - 0.5, t + rng.uniform(-0.3, 0.3), ch - 0.45, ang, colour(rng), tilt)
                    if course == 0:
                        bottom.append((s0, s1))
            s += bl
        z += ch
        course += 1
    if solid and bottom:
        bottom.sort()
        r0, r1 = bottom[0]
        for s0, s1 in bottom[1:]:
            if s0 <= r1 + 2.5:
                r1 = max(r1, s1)
            else:
                m.solid_rect(a, b, r0, r1, t)
                r0, r1 = s0, s1
        m.solid_rect(a, b, r0, r1, t)


def panel(m: PMesh, c: tuple, w: float, z0: float, z1: float, colour: np.ndarray, out: float = 0.6, ang: float = 0.0, d: float = 1.2) -> None:
    """A thin box on a wall face: a window pane, a door, a timber, `out` proud of the face (along +y when ang=0)."""
    x, y = c
    m.box(x - math.sin(ang) * out, y + math.cos(ang) * out, (z0 + z1) / 2, w, d, z1 - z0, ang, colour)


def window(m: PMesh, x: float, y: float, z0: float, z1: float, w: float, rng: random.Random, broken: bool = False, shutters: bool = True) -> None:
    """A window on a south face at y: dark glass, white frame and cross, a sill, shutters."""
    panel(m, (x, y), w, z0, z1, GLASS(rng), out=-0.2, d=1.0)
    frame = WHITE(rng)
    for zz in (z0, z1):
        panel(m, (x, y), w + 1.4, zz - 0.6, zz + 0.6, frame, out=0.5)
    for xx in (x - w / 2, x + w / 2):
        panel(m, (xx, y), 1.2, z0, z1, frame, out=0.5)
    if not broken:
        panel(m, (x, y), 0.9, z0, z1, frame, out=0.4)
        panel(m, (x, y), w, (z0 + z1) / 2 - 0.4, (z0 + z1) / 2 + 0.4, frame, out=0.4)
    panel(m, (x, y), w + 3, z0 - 1.6, z0 - 0.4, hls(0.1, 0.1, 0.62), out=1.4, d=2.4)
    if shutters:
        sc = hls(0.36, 0.3, 0.34)
        for sx in (-1, 1):
            panel(m, (x + sx * (w / 2 + 2.4), y), 3.6, z0, z1, sc, out=0.7)


def gable(m: PMesh, x0: float, x1: float, y0: float, y1: float, z_eave: float, z_ridge: float, rng: random.Random, colour: Colour,
          tile: float = 5.0, rows: int = 8, keep: Callable | None = None, over: float = 3.0, ridge_col: np.ndarray | None = None) -> None:
    """A gable roof, ridge along x at the middle of y0..y1, of overlapping tiles; keep(x, y) False leaves a hole."""
    yc = (y0 + y1) / 2
    for side in (-1, 1):
        ye = (y0 - over) if side < 0 else (y1 + over)
        for r in range(rows):
            f0, f1 = r / rows, (r + 1) / rows
            ya, yb = ye + (yc - ye) * f0, ye + (yc - ye) * f1
            za, zb = z_eave + (z_ridge - z_eave) * f0, z_eave + (z_ridge - z_eave) * f1
            x = x0 - over - (tile / 2 if r % 2 else 0)
            while x < x1 + over:
                xa, xb = max(x0 - over, x), min(x1 + over, x + tile)
                if xb - xa > 0.8 and (keep is None or keep((xa + xb) / 2, (ya + yb) / 2)):
                    lift = 0.5 + 0.25 * rng.random()
                    # Each tile's lower edge stands proud of the row below, which is what reads as a tiled roof.
                    m.face([(xa + 0.2, ya, za + lift + 0.6), (xb - 0.2, ya, za + lift + 0.6), (xb - 0.2, yb, zb + lift), (xa + 0.2, yb, zb + lift)],
                           colour(rng), np.array([(xa + xb) / 2, yc, z_eave - 5]))
                x += tile
    if ridge_col is not None:
        m.box((x0 + x1) / 2, yc, z_ridge + 1.0, x1 - x0 + 2 * over, 3.0, 2.0, 0.0, ridge_col)


def gable_ends(m: PMesh, x: float, y0: float, y1: float, z_eave: float, z_ridge: float, col: np.ndarray, t: float = 2.0) -> None:
    """The triangular wall under a gable at x (east or west end)."""
    yc = (y0 + y1) / 2
    for dx in (-t / 2, t / 2):
        m.face([(x + dx, y0, z_eave), (x + dx, y1, z_eave), (x + dx, yc, z_ridge)], col, np.array([x - dx * 4, yc, z_eave + 1]))


def rafters(m: PMesh, x0: float, x1: float, y0: float, y1: float, z_eave: float, z_ridge: float, every: float, col: np.ndarray, rng: random.Random, skip: Callable | None = None) -> None:
    yc = (y0 + y1) / 2
    x = x0 + every / 2
    while x < x1:
        if skip is None or not skip(x):
            for ye in (y0, y1):
                n = 8
                for i in range(n):
                    f0, f1 = i / n, (i + 1) / n
                    ya, yb = ye + (yc - ye) * f0, ye + (yc - ye) * f1
                    za, zb = z_eave + (z_ridge - z_eave) * f0, z_eave + (z_ridge - z_eave) * f1
                    m.box(x, (ya + yb) / 2, (za + zb) / 2, 1.8, abs(yb - ya) + 0.4, abs(zb - za) + 1.6, 0.0, col)
        x += every


def rubble(m: PMesh, cx: float, cy: float, rx: float, ry: float, n: int, rng: random.Random, colour: Colour, size: float = 4.0) -> None:
    """Fallen blocks in a heap, more and higher in the middle."""
    for _ in range(n):
        r = rng.random() ** 0.7
        a = rng.uniform(0, 2 * math.pi)
        x, y = cx + math.cos(a) * rx * r, cy + math.sin(a) * ry * r
        z = (1 - r) * size * 0.9 + 0.6
        m.box(x, y, z, rng.uniform(0.6, 1.1) * size, rng.uniform(0.4, 0.7) * size, rng.uniform(0.3, 0.55) * size, rng.uniform(0, math.pi), colour(rng),
              (rng.uniform(-0.5, 0.5), rng.uniform(-0.5, 0.5)))


def lump(m: PMesh, c: tuple, r: tuple, colour: Colour, rng: random.Random, n: int = 8, jag: float = 0.0, floor: float | None = None) -> None:
    """A lumpy ellipsoid of radii r; `jag` pushes its vertices in and out; `floor` flattens it at a height."""
    pts = {}
    for i in range(n + 1):
        th = math.pi * i / n
        for j in range(n * 2):
            ph = 2 * math.pi * j / (n * 2)
            k = 1 + jag * math.sin(i * 2.3 + j * 1.7 + c[0]) * (0 < i < n)
            z = c[2] + r[2] * math.cos(th) * k
            if floor is not None:
                z = max(z, floor)
            pts[i, j] = (c[0] + r[0] * math.sin(th) * math.cos(ph) * k, c[1] + r[1] * math.sin(th) * math.sin(ph) * k, z)
    for i in range(n):
        for j in range(n * 2):
            j1 = (j + 1) % (n * 2)
            m.face([pts[i, j], pts[i, j1], pts[i + 1, j1], pts[i + 1, j]], colour(rng), np.array(c))


def cylinder(m: PMesh, c: tuple, r: float, z0: float, z1: float, colour: Colour, rng: random.Random, sides: int = 12, ry: float | None = None, top: Colour | None = None) -> None:
    ry = r if ry is None else ry
    pts = [(c[0] + r * math.cos(2 * math.pi * i / sides), c[1] + ry * math.sin(2 * math.pi * i / sides)) for i in range(sides)]
    inside = np.array([c[0], c[1], (z0 + z1) / 2])
    for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
        m.face([(ax, ay, z0), (bx, by, z0), (bx, by, z1), (ax, ay, z1)], colour(rng), inside)
    m.face([(x, y, z1) for x, y in pts], (top or colour)(rng), inside)


def ragged(h: float, seed: int, low: float = 0.5, n: int = 3) -> Callable[[float, float], float]:
    """A broken wall top: bitten down in places. top(s, length)."""
    rng = random.Random(seed)
    bites = [(rng.uniform(0.1, 0.9), rng.uniform(0.08, 0.2), rng.uniform(0.25, 1 - low)) for _ in range(n)]

    def top(s: float, length: float = 1.0) -> float:
        f = s / length
        cut = max([d * h * max(0.0, 1 - abs(f - c) / w) for c, w, d in bites] + [0.0])
        return h - cut
    return top
