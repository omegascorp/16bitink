"""Chapter 1's tank parts at density C, Mk I to III, as 3D models rendered straight down.

  python3 dev/pixel/parts/model.py     out/render/<family>-mk<N>.png (+ -stripe, drive -f1/-f2) and out/render/meta.json

Mk I is the detail test's C model unchanged (dev/pixel/tank_parts.py, owner-approved). Mk II and III keep every
Mk I shape, so the family reads the same, and add kit on top: bolted plates, rivet rows, spare track links, aerials,
cupola guns, sandbags, extra rocket tubes, rust and wear. Every tier of a hull keeps the same turret ring.

Units are model units; native px = units x UNIT. x east, y south, z up; parts face north (-y).
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from render3d import Mesh, mask_of, render_top, shrink  # noqa: E402  (shared, read-only)

UNIT, SIZE, K = 2.0, 128, 3
OUT = HERE / 'out' / 'render'

OLIVE = np.array([0.36, 0.38, 0.22])
OLIVE_D = np.array([0.27, 0.29, 0.17])
SAND = np.array([0.64, 0.56, 0.38])
SAND_D = np.array([0.52, 0.45, 0.30])
RUST = np.array([0.50, 0.29, 0.16])
GUN = np.array([0.27, 0.29, 0.31])
GUN_D = np.array([0.17, 0.18, 0.19])
RUBBER = np.array([0.13, 0.12, 0.12])
TREAD = np.array([0.30, 0.28, 0.26])
STRIPE = np.array([0.5, 0.5, 0.5])
WOOD = np.array([0.52, 0.36, 0.20])
WOOD_D = np.array([0.38, 0.25, 0.13])
BLACK = np.array([0.05, 0.05, 0.05])
RIVET = np.array([0.58, 0.58, 0.5])
SEAM = np.array([0.13, 0.13, 0.1])
BAG = np.array([0.60, 0.53, 0.38])
CANVAS = np.array([0.42, 0.40, 0.27])
BRASS = np.array([0.72, 0.56, 0.26])

RING = {'hullLight': (0, 1), 'hullMedium': (0, 1), 'hullHeavy': (0, 2)}
DECK = {'hullLight': 6.5, 'hullMedium': 7.0, 'hullHeavy': 8.0}
DIMS = {'hullLight': (14, 24, 6.5), 'hullMedium': (18, 30, 7.0), 'hullHeavy': (22, 38, 8.0)}
HULLS = ['hullLight', 'hullMedium', 'hullHeavy']
DRIVES = ['driveWheels', 'driveHalftrack', 'driveTracks']
TURRETS = ['turretMG', 'turretCannon', 'turretRocket']


# --- primitives (as tank_parts.py) ----------------------------------------------------------------------------------

def rect(w, l, c=0.0, cx=0.0, cy=0.0):
    x, y = w / 2, l / 2
    pts = [(-x + c, -y), (x - c, -y), (x, -y + c), (x, y - c), (x - c, y), (-x + c, y), (-x, y - c), (-x, -y + c)]
    return [(px + cx, py + cy) for px, py in pts]


def frustum(m, low, high, z0, z1, col, top=None):
    cx, cy = np.mean(low, axis=0)
    inside = np.array([cx, cy, (z0 + z1) / 2])
    n = len(low)
    for i in range(n):
        a, b = low[i], low[(i + 1) % n]
        c, d = high[(i + 1) % n], high[i]
        m.face([(a[0], a[1], z0), (b[0], b[1], z0), (c[0], c[1], z1), (d[0], d[1], z1)], col, inside)
    m.face([(x, y, z1) for x, y in high], col if top is None else top, inside)


def box(m, cx, cy, z0, sx, sy, sz, col, a=0.0):
    m.box(cx, cy, z0 + sz / 2, sx, sy, sz, a, col)


def cyl(m, axis, c, length, r, col, n=10, cap=None):
    ring = [(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n)) for i in range(n)]

    def pt(a, b, t):
        if axis == 'x':
            return (c[0] + t, c[1] + a, c[2] + b)
        if axis == 'y':
            return (c[0] + a, c[1] + t, c[2] + b)
        return (c[0] + a, c[1] + b, c[2] + t)

    h = length / 2
    inside = np.array(c)
    for i in range(n):
        (a0, b0), (a1, b1) = ring[i], ring[(i + 1) % n]
        m.face([pt(a0, b0, -h), pt(a1, b1, -h), pt(a1, b1, h), pt(a0, b0, h)], col, inside)
    m.face([pt(a, b, h) for a, b in ring], col if cap is None else cap, inside)
    m.face([pt(a, b, -h) for a, b in ring], col if cap is None else cap, inside)


def pitch_pt(p, pitch):
    c, s = math.cos(pitch), math.sin(pitch)
    x, y, z = p
    return (x, c * y + s * z, -s * y + c * z)


def placed(m, local, at, pitch=0.0):
    tris, cols = local.arrays()
    c, s = math.cos(pitch), math.sin(pitch)
    r = np.array([[1, 0, 0], [0, c, s], [0, -s, c]])
    t = tris @ r.T + np.array(at)
    for tri, col in zip(t, cols):
        m.tris.append(tri)
        m.cols.append(col)


def rivets(m, poly, z, step, col, inset=0.7):
    cx, cy = np.mean(poly, axis=0)
    for (ax, ay), (bx, by) in zip(poly, poly[1:] + poly[:1]):
        n = max(1, int(math.hypot(bx - ax, by - ay) / step))
        for i in range(n):
            t = (i + 0.5) / n
            x, y = ax + (bx - ax) * t, ay + (by - ay) * t
            d = math.hypot(cx - x, cy - y) or 1
            box(m, x + (cx - x) / d * inset, y + (cy - y) / d * inset, z, 0.6, 0.6, 0.3, RIVET)


def rivet_line(m, x0, y0, x1, y1, z, step=1.5):
    n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
    for i in range(n + 1):
        t = i / n
        box(m, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z, 0.6, 0.6, 0.3, RIVET)


def seam(m, x0, y0, x1, y1, z, col=SEAM):
    l = math.hypot(x1 - x0, y1 - y0)
    m.box((x0 + x1) / 2, (y0 + y1) / 2, z + 0.03, l, 0.35, 0.06, math.atan2(y1 - y0, x1 - x0), SEAM)


def hatch(m, x, y, z, r, col):
    cyl(m, 'z', (x, y, z + 0.25), 0.5, r, col, n=12)
    cyl(m, 'z', (x, y, z + 0.55), 0.2, r * 0.7, OLIVE_D, n=12)
    box(m, x, y + r * 0.9, z + 0.4, r * 1.2, 0.5, 0.5, GUN_D)
    box(m, x, y - r * 0.4, z + 0.65, 0.9, 0.3, 0.25, GUN)


def plate(m, cx, cy, z, w, l, col=OLIVE, step=1.5):
    """A bolted add-on armour plate: a thin slab with a rivet border."""
    frustum(m, rect(w, l, 0.5, cx, cy), rect(w - 0.4, l - 0.4, 0.4, cx, cy), z, z + 0.6, col)
    rivets(m, rect(w, l, 0.5, cx, cy), z + 0.6, step, RIVET, inset=0.55)


def links(m, x, y, z, n, along='y', w=2.6, col=TREAD):
    """Spare track links hung on armour: n steel shoes with a pin between."""
    for i in range(n):
        if along == 'y':
            box(m, x, y + i * 1.3, z, w, 1.05, 0.5, col)
            box(m, x, y + i * 1.3 + 0.6, z + 0.2, w + 0.3, 0.2, 0.35, GUN_D)
        else:
            box(m, x + i * 1.3, y, z, 1.05, w, 0.5, col)
            box(m, x + i * 1.3 + 0.6, y, z + 0.2, 0.2, w + 0.3, 0.35, GUN_D)


def sandbags(m, x0, x1, y, z, rows=1, bag=(2.2, 1.4, 0.9)):
    """A row (or two) of sandbags, staggered."""
    bx, by, bz = bag
    for r in range(rows):
        off = (r % 2) * bx / 2
        n = int((x1 - x0 - off) / bx)
        for i in range(n):
            cx = x0 + off + bx / 2 + i * bx
            col = BAG if (i + r) % 3 else SAND_D
            frustum(m, rect(bx - 0.15, by, 0.45, cx, y + r * (by - 0.15)), rect(bx - 0.6, by - 0.45, 0.35, cx, y + r * (by - 0.15)), z, z + bz, col)


def aerial(m, x, y, z, h=5.0):
    cyl(m, 'z', (x, y, z + 0.4), 0.8, 0.5, GUN_D, n=6)
    box(m, x, y + 2.6, z + 1.1, 0.22, 5.2, 0.18, GUN_D)
    box(m, x, y + 5.3, z + 1.1, 0.4, 0.4, 0.25, BLACK)


def wear(m, spots, z):
    """Rust and scuffed paint: flat patches laid on the armour."""
    for x, y, w, l, col in spots:
        box(m, x, y, z, w, l, 0.08, col)


# --- hulls ------------------------------------------------------------------------------------------------------------

def hull_base(name):
    """The detail test's hull, unchanged (Mk I)."""
    m = Mesh()
    w, l, deck = DIMS[name]
    z0 = 2.5
    frustum(m, rect(w, l, 2.5), rect(w - 1.5, l - 1.5, 2.2), z0, z0 + 2.0, OLIVE_D)
    frustum(m, rect(w - 1.5, l - 1.5, 2.2), rect(w - 4, l - 8, 1.6, cy=0.8), z0 + 2.0, deck, OLIVE)
    rx, ry = RING[name]
    cyl(m, 'z', (rx, ry, deck + 0.3), 0.6, {'hullLight': 3.6, 'hullMedium': 4.6, 'hullHeavy': 5.6}[name], GUN_D, n=14)
    gy = -(l - 8) / 2 + 0.8 + 1.8
    box(m, 0, gy, deck - 0.1, w - 5.0, 2.2, 0.3, STRIPE)
    top = rect(w - 4, l - 8, 1.6, cy=0.8)
    rivets(m, top, deck, 1.6, GUN)
    for f in (-0.18, 0.28):
        seam(m, -(w - 5) / 2, l * f, (w - 5) / 2, l * f, deck)
    seam(m, 0, gy + 1.6, 0, -l * 0.18, deck)
    hatch(m, -w * 0.22, gy + 2.6, deck, 1.3, OLIVE)
    for sx in (-1, 1):
        box(m, sx * (w / 2 - 3.2), -l / 2 + 0.2, z0 + 1.6, 1.0, 1.0, 0.8, GUN_D)
        seam(m, sx * (w / 2 - 0.9), -l / 2 + 3, sx * (w / 2 - 0.9), l / 2 - 3, z0 + 2.0)
    back = l / 2 - 3.5
    for i in range(-2, 3):
        box(m, i * (w * 0.12), back, deck - 0.2, w * 0.08, 4.0, 0.5, GUN)
    for sx in (-1, 1):
        cyl(m, 'y', (sx * (w / 2 - 2.5), l / 2 - 0.6, z0 + 3.0), 1.8, 0.9, RUST, n=8)
        box(m, sx * (w / 2 - 2.2), -l / 2 + 0.8, z0 + 2.0, 1.6, 1.2, 1.2, SAND)
        box(m, sx * (w / 2 - 1.2), 1.0, z0 + 2.0, 1.6, l * 0.35, 1.6, OLIVE_D if name != 'hullLight' else SAND)
    if name == 'hullLight':
        cyl(m, 'z', (3.2, l / 2 - 5.5, deck), 1.4, 2.0, RUBBER, n=10, cap=GUN_D)
        box(m, -3.0, l / 2 - 5.5, deck - 0.3, 2.4, 3.0, 1.8, RUST)
    if name == 'hullMedium':
        box(m, 4.5, l / 2 - 8.5, deck - 0.2, 3.0, 4.0, 1.4, SAND)
        cyl(m, 'x', (-4.0, l / 2 - 8.0, deck + 0.6), 5.0, 0.9, OLIVE_D, n=8)
    if name == 'hullHeavy':
        for sx in (-1, 1):
            for i in range(4):
                box(m, sx * (w / 2 + 0.2), -l / 2 + 6 + i * 8.2, z0 + 3.0, 2.0, 7.6, 1.2, OLIVE if i % 2 else OLIVE_D)
        cyl(m, 'x', (0, l / 2 - 1.8, deck - 0.2), w - 4, 1.3, WOOD, n=8, cap=WOOD_D)
        box(m, 0, -l / 2 + 6.5, deck - 0.4, 3.0, 2.0, 1.4, GUN)
    return m


def hull(name, tier):
    m = hull_base(name)
    if tier == 1:
        return m
    w, l, deck = DIMS[name]
    z0 = 2.5
    gy = -(l - 8) / 2 + 0.8 + 1.8           # the stripe: kept clear of every add-on
    rx, ry = RING[name]
    # Mk II: bolted cheek plates along the upper hull's sides, rivet rows on the glacis, spare links on the nose.
    # The turret ring as a bolted race with a cover plate (the Mk I painting reads that way; a bare dark disk reads as a hole).
    rr = {'hullLight': 3.6, 'hullMedium': 4.6, 'hullHeavy': 5.6}[name]
    cyl(m, 'z', (rx, ry, deck + 0.7), 0.2, rr - 0.8, OLIVE_D, n=14)
    rivets(m, [(rx + (rr - 0.4) * math.cos(a), ry + (rr - 0.4) * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 10, endpoint=False)], deck + 0.6, 1.4, RIVET, inset=0.0)
    hatch(m, rx - rr * 0.3, ry + rr * 0.2, deck + 0.8, rr * 0.38, OLIVE)
    side_l = l * 0.42
    for sx in (-1, 1):
        plate(m, sx * (w / 2 - 1.6), 1.0 + l * 0.02, z0 + 3.6, 2.2, side_l, OLIVE)
        rivet_line(m, sx * (w / 2 - 2.6), gy - 1.6, sx * (w / 2 - 2.6), gy + 1.4, deck)
    nose_y = -l / 2 + 1.3
    links(m, -(w - 7) / 2, nose_y + 0.2, z0 + 2.0, int((w - 6) / 1.3), along='x', w=1.6)
    # A second hatch for the radio operator, and a jerrycan rack at the back.
    hatch(m, w * 0.22, gy + 2.6, deck, 1.1, OLIVE)
    for i, sx in enumerate((-1, 1)):
        box(m, sx * (w / 2 - 2.4), l / 2 - 2.2, deck - 0.6, 2.0, 1.4, 1.6, RUST if i else OLIVE_D)
    wear(m, [(-w * 0.18, l * 0.1, 1.6, 1.0, RUST), (w * 0.25, -l * 0.08, 1.2, 0.8, GUN)], deck)
    if name == 'hullHeavy':
        for sx in (-1, 1):
            for i in range(4):
                rivets(m, rect(2.0, 7.6, 0.3, sx * (w / 2 + 0.2), -l / 2 + 6 + i * 8.2), z0 + 4.2, 1.8, RIVET, inset=0.45)
    if tier == 2:
        return m
    # Mk III: the full kit. Sandbags across the nose, spaced plates on the flanks, an aerial, a stowage box,
    # a rolled camouflage net, spare links on the flanks and heavier wear.
    sandbags(m, -(w - 3.0) / 2, (w - 3.0) / 2, -l / 2 + 0.9, z0 + 2.6, rows=1, bag=(2.0, 1.5, 1.0))
    for sx in (-1, 1):
        plate(m, sx * (w / 2 + 0.4), 1.0, z0 + 2.6, 1.4, l * 0.55, OLIVE_D, step=1.4)
        links(m, sx * (w / 2 - 1.6), -l * 0.14, z0 + 4.25, 3, w=1.8)
    aerial(m, -w / 2 + 2.6, l / 2 - 6.0, deck)
    box(m, 0, l / 2 - 1.6, deck - 0.4, w * 0.5, 1.8, 1.4, WOOD)
    box(m, 0, l / 2 - 1.6, deck + 1.0, w * 0.5 - 0.6, 1.4, 0.2, WOOD_D)
    cyl(m, 'x', (0, l / 2 - 5.6, deck + 0.3), w * 0.55, 0.9, CANVAS, n=8, cap=SAND_D)
    wear(m, [(w * 0.12, -l * 0.25, 1.4, 1.2, RUST), (-w * 0.28, l * 0.3, 1.0, 1.6, RUST), (w * 0.3, l * 0.24, 1.4, 0.8, GUN)], deck)
    return m


# --- drives -------------------------------------------------------------------------------------------------------------

def track(m, x, y0, y1, wid, h, frame, pitch=3.0, grousers=False):
    frustum(m, rect(wid, y1 - y0, 1.2, cx=x, cy=(y0 + y1) / 2), rect(wid - 0.4, y1 - y0 - 2.2, 1.0, cx=x, cy=(y0 + y1) / 2), 0.0, h, RUBBER)
    off = frame * pitch / 3
    y = y0 + 1.6 + off
    while y < y1 - 1.6:
        box(m, x, y, h - 0.1, wid - 0.6, pitch * 0.45, 0.5, TREAD)
        box(m, x, y + pitch * 0.5, h - 0.1, wid - 0.4, 0.22, 0.35, GUN_D)
        box(m, x, y, h + 0.35, 0.7, pitch * 0.3, 0.35, TREAD)
        if grousers:
            # End connectors: steel lugs at both edges of every shoe.
            for e in (-1, 1):
                box(m, x + e * (wid / 2 - 0.55), y, h + 0.3, 0.8, pitch * 0.5, 0.35, GUN)
        y += pitch


def wheel(m, x, y, wid, r, frame, chains=False):
    cyl(m, 'x', (x, y, r), wid, r, RUBBER, n=12, cap=GUN_D)
    for i in range(-2, 3):
        yy = y + (i + frame / 3) * 1.6
        if abs(yy - y) < r * 0.85:
            box(m, x, yy, r * 2 - 0.2 - 0.35 * abs(yy - y), wid - 0.4, 0.7, 0.4, TREAD)
            if chains:
                box(m, x, yy + 0.8, r * 2 - 0.15 - 0.35 * abs(yy - y), wid + 0.1, 0.3, 0.35, GUN)


def hub(m, x, y, r, outward, big=False):
    """A hub cap on the wheel's outer face, seen from above as a short stub."""
    cyl(m, 'x', (x + outward, y, r), 0.8, r * (0.55 if big else 0.45), GUN, n=8, cap=GUN_D)


# Each drive is modelled per hull size, so it sits at that hull's sides and runs its length (coordinator, 2026-11-12).
SIZES = {'L': 'hullLight', 'M': 'hullMedium', 'H': 'hullHeavy'}
# How far a hull's widest kit reaches past its half width: Mk III side plates, the Heavy's skirts.
EDGE = {'L': 0.6, 'M': 0.6, 'H': 1.2}


def drive(name, size, tier, frame):
    m = Mesh()
    w, l, _ = DIMS[SIZES[size]]
    e = w / 2 + EDGE[size]          # the hull's outer edge: a drive tucks just under it and shows outside
    i = 'LMH'.index(size)
    if name == 'driveWheels':
        # Four separate tyres a side, narrower and smaller than a half-track's, with clear gaps between them.
        r = (2.2, 2.5, 2.8)[i]
        wid = (3.4, 3.8, 4.2)[i] + 0.3 * (tier - 1)
        x = e - 1.0 + wid / 2
        ys = [f * l for f in (-0.375, -0.125, 0.125, 0.375)]
        for sx in (-1, 1):
            box(m, sx * (e - 2.6), 0, 1.5, 2.6, l * 0.8, 1.2, GUN_D)
            for y in ys:
                box(m, sx * (e - 1.8), y, 1.8, 2.2, 1.0, 0.8, GUN_D)   # the axle stub
                wheel(m, sx * x, y, wid, r, frame, chains=tier == 3)
                hub(m, sx * (x + wid / 2), y, r, sx * 0.3, big=tier == 3)
            if tier >= 2:
                # Mudguards just ahead of the front tyres and behind the rear ones, and a leaf-spring bar.
                for y in (ys[0] - r - 0.9, ys[-1] + r + 0.9):
                    box(m, sx * (x - 0.4), y, r * 2 + 0.2, wid - 0.4, 1.4, 0.4, OLIVE)
                box(m, sx * (e - 2.4), 0, 2.8, 1.6, l * 0.6, 0.6, GUN)
            if tier == 3:
                for y in (ys[0] - r - 0.9, ys[-1] + r + 0.9):
                    rivet_line(m, sx * (x - wid / 2 + 0.4), y, sx * (x + wid / 2 - 0.8), y, r * 2 + 0.6, step=1.2)
    elif name == 'driveHalftrack':
        r = (2.5, 2.8, 3.1)[i]
        wid = (4.6, 5.2, 5.8)[i] + 0.4 * (tier - 1)
        x = e - 1.0 + wid / 2
        y1 = -l / 2 + r - 0.3
        y2 = y1 + 2 * r + 0.5
        t0, t1 = y2 + r + 0.8, l / 2 + 0.8
        for sx in (-1, 1):
            box(m, sx * (e - 2.6), 0, 1.5, 3.0, l * 0.85, 1.2, GUN_D)
            for y in (y1, y2):
                wheel(m, sx * x, y, wid - 1.4, r, frame, chains=tier == 3)
                if tier >= 2:
                    hub(m, sx * (x + (wid - 1.4) / 2), y, r, sx * 0.3, big=tier == 3)
            track(m, sx * x, t0, t1, wid, 5.0, frame, grousers=tier >= 2)
            if tier >= 2:
                # A mudguard between the wheels and the track, and a guard over the track's rear idler.
                box(m, sx * x, t0 - 1.7, 5.4, wid - 0.6, 1.2, 0.4, OLIVE)
                box(m, sx * x, t1 + 0.7, 4.2, wid - 0.2, 1.0, 0.5, OLIVE_D)
            if tier == 3:
                # A spaced skirt plate over the track's outer half.
                plate(m, sx * (x + wid / 2 - 1.0), (t0 + t1) / 2, 5.6, 2.0, (t1 - t0) * 0.75, OLIVE_D, step=1.4)
    else:
        wid = (5.6, 6.2, 6.6)[i] + 0.3 * (tier - 1)
        x = e - 1.6 + wid / 2
        y0, y1 = -l / 2 - 1.0, l / 2 + 1.0
        for sx in (-1, 1):
            track(m, sx * x, y0, y1, wid, 6.0, frame, grousers=tier >= 2)
            if tier >= 2:
                # Mud guards over both ends of the track.
                for y in (y0 + 0.4, y1 - 0.4):
                    box(m, sx * x, y, 6.6, wid + 0.2, 2.4, 0.4, OLIVE)
                    rivet_line(m, sx * (x - wid / 2 + 0.5), y, sx * (x + wid / 2 - 0.5), y, 7.0, step=1.6)
            if tier == 3:
                # Spaced skirt plates over the outer half of the run.
                n = (3, 3, 4)[i]
                pl = (y1 - y0 - 6.0) / n
                for k in range(n):
                    plate(m, sx * (x + wid / 2 - 1.3), y0 + 3.0 + pl * (k + 0.5), 7.0, 2.6, pl - 0.6, OLIVE if k % 2 else OLIVE_D, step=2.4)
    return m


# --- turrets (pivot = ring centre) ---------------------------------------------------------------------------------------

def turret(name, tier):
    """Returns the mesh and its muzzles (model units, rotation 0, from the ring)."""
    m = Mesh()
    z = 7.0
    muzzles = []
    if name == 'turretMG':
        cyl(m, 'z', (0, 0.5, z + 0.8), 1.6, 4.8 + 0.3 * (tier - 1), OLIVE_D, n=14, cap=OLIVE)
        box(m, 0, -2.8, z + 1.6, 7.5 + 0.8 * (tier - 1), 1.6, 2.4, OLIVE)
        box(m, 0, 1.4, z + 1.6, 3.0, 3.0, 2.0, GUN)
        tip = -14.6 - 0.8 * (tier - 1)
        for sx in (-1.6, 1.6):
            cyl(m, 'y', (sx, -7.5, z + 3.0), 8.6, 1.0, GUN_D, n=8)
            cyl(m, 'y', (sx, -13.0 - 0.4 * (tier - 1), z + 3.0), 3.2 + 0.8 * (tier - 1), 0.85, GUN, n=8)
            cyl(m, 'y', (sx, -4.0, z + 3.0), 2.2, 1.2, GUN, n=8)
            if tier >= 2:
                # Cooling jackets with vent holes, and a flash hider at the tip.
                for i in range(3):
                    box(m, sx, -6.0 - i * 1.6, z + 3.95, 0.5, 0.5, 0.15, BLACK)
                cyl(m, 'y', (sx, tip + 0.5, z + 3.0), 1.0, 1.05, GUN_D, n=8)
            muzzles.append((sx, tip))
        rivets(m, rect(6.4, 6.4, 2.0, cy=0.5), z + 1.6, 1.4, GUN)
        box(m, 4.0, 0.0, z + 1.6, 2.2, 3.2, 1.8, SAND)
        if tier >= 2:
            # A bolted gun shield in front, a second ammo box, a brass belt feed.
            frustum(m, rect(9.0, 1.4, 0.4, cy=-4.0), rect(8.6, 1.0, 0.3, cy=-4.0), z + 1.0, z + 4.0, OLIVE)
            rivet_line(m, -4.0, -4.0, 4.0, -4.0, z + 4.0, step=1.3)
            box(m, -4.0, 0.0, z + 1.6, 2.2, 3.2, 1.8, SAND)
            box(m, 2.6, -0.6, z + 3.4, 1.4, 0.6, 0.3, BRASS)
        if tier == 3:
            # A ring of sandbags round the mount, an aerial and a spare barrel.
            for i in range(11):
                a = math.radians(-150 + i * 30)
                cx, cy = 6.4 * math.sin(a), 0.9 + 6.4 * math.cos(a)
                turn = lambda pts: [(cx + (px - cx) * math.cos(-a) - (py - cy) * math.sin(-a), cy + (px - cx) * math.sin(-a) + (py - cy) * math.cos(-a)) for px, py in pts]
                frustum(m, turn(rect(3.0, 1.9, 0.6, cx, cy)), turn(rect(2.4, 1.35, 0.45, cx, cy)), z, z + 1.4, BAG if i % 3 else SAND_D)
            aerial(m, -3.0, 3.6, z + 1.8, 4.0)
            cyl(m, 'y', (5.6, 2.0, z + 2.2), 6.0, 0.5, GUN_D, n=6)
    elif name == 'turretRocket':
        cyl(m, 'z', (0, 0.5, z + 0.6), 1.2, 5.0 + 0.4 * (tier - 1), OLIVE_D, n=14, cap=GUN)
        box(m, 0, 0.8, z + 1.2, 3.0, 4.0, 2.5, GUN)
        cols, rows = {1: (2, 2), 2: (3, 2), 3: (3, 3)}[tier]
        pw, ph = 0.4 + 2.8 * cols, 0.2 + 2.7 * rows
        pitch = 0.75
        for sx in (-1, 1):
            pod = Mesh()
            box(pod, 0, 0, -ph / 2, pw, 10.0 + 0.6 * (tier - 1), ph, OLIVE)
            box(pod, 0, -1.0, ph / 2, pw - 1.0, 4.0, 0.3, SAND)
            if tier >= 2:
                # Riveted pod frames and a hinged blast cover folded back.
                rivets(pod, rect(pw - 0.6, 8.0, 0.3, cy=0.6), ph / 2, 1.4, RIVET, inset=0.3)
                box(pod, 0, 3.6, ph / 2, pw - 0.6, 2.6, 0.4, OLIVE_D)
            if tier == 3:
                for e in (-1, 1):
                    frustum(pod, rect(0.8, 9.0, 0.2, cx=e * (pw / 2 + 0.5)), rect(0.5, 8.6, 0.15, cx=e * (pw / 2 + 0.5)), -ph / 2, ph / 2, OLIVE_D, top=SAND_D)
            at = (sx * (pw / 2 + 0.6), -1.2, z + 5.2 + 0.2 * (tier - 1))
            for ci in range(cols):
                tx = (ci - (cols - 1) / 2) * 2.8
                for ri in range(rows):
                    tz = (ri - (rows - 1) / 2) * 2.7
                    y0 = -5.0 - 0.3 * (tier - 1)
                    cyl(pod, 'y', (tx, y0, tz), 0.6, 1.05, BLACK, n=10, cap=BLACK)
                    px, py, pz = pitch_pt((tx, y0 - 0.3, tz), pitch)
                    muzzles.append((px + at[0], py + at[1]))
            placed(m, pod, at, pitch=pitch)
        if tier >= 2:
            # A sight box between the pods.
            box(m, 0, -2.4, z + 3.6, 1.6, 2.0, 1.4, GUN_D)
            box(m, 0, -3.5, z + 4.4, 1.0, 0.3, 0.4, BLACK)
        if tier == 3:
            aerial(m, 0, 3.4, z + 3.7, 4.0)
            box(m, 0, 4.4, z + 1.2, 4.0, 2.0, 2.0, WOOD)
    else:
        w = (11.5, 12.2, 13.0)[tier - 1]
        frustum(m, rect(w, w + 0.5, 2.5, cy=1.0), rect(w - 3, w - 3.5, 2.0, cy=1.6), z, z + 4.2, OLIVE, top=OLIVE)
        box(m, 0, -w / 2 + 0.4, z + 0.8, (5.0, 5.6, 6.4)[tier - 1], 2.4, 3.0, OLIVE_D)
        length = (15.0, 16.0, 17.0)[tier - 1]
        cyl(m, 'y', (0, -w / 2 - length / 2 + 1.0, z + 2.4), length, 1.15, GUN, n=10)
        cyl(m, 'y', (0, -w / 2 - 1.2, z + 2.4), 2.6, 1.7, GUN_D, n=10)
        cyl(m, 'z', (-2.0, 2.8, z + 4.5), 0.6, 1.6, GUN_D, n=10, cap=GUN)
        box(m, 2.6, 1.2, z + 4.2, 1.2, 1.6, 0.9, GUN_D)
        rivets(m, rect(w - 3, w - 3.5, 2.0, cy=1.6), z + 4.2, 1.5, GUN)
        for px in (-3.4, 0.8):
            box(m, px, -w / 2 + 3.2, z + 4.2, 1.1, 0.6, 0.6, GUN_D)
        seam(m, -(w - 4) / 2, 3.6, (w - 4) / 2, 3.6, z + 4.2)
        tip = -w / 2 - length + 1.0
        if tier >= 2:
            # Mk II: bolted cheek rivets, spare links on the sides, a cupola machinegun and an aerial.
            for sx in (-1, 1):
                for i in range(4):
                    box(m, sx * (w / 2 + 0.6), -3.6 + i * 2.4, z + 3.4, 0.6, 0.6, 0.3, RIVET)
                for i in range(3):
                    box(m, sx * (w / 2 - 0.6), 3.0 + i * 1.5, z + 2.0, 1.6, 1.2, 0.6, TREAD)
            cyl(m, 'z', (-2.0, 2.8, z + 5.1), 0.8, 1.5, OLIVE_D, n=10, cap=GUN)
            cyl(m, 'y', (-2.0, 0.4, z + 5.8), 3.6, 0.35, GUN_D, n=6)
            cyl(m, 'z', (3.4, w / 2 - 0.5, z + 5.0), 0.8, 0.45, GUN_D, n=6)
            box(m, 3.4, w / 2 + 2.6, z + 5.3, 0.25, 6.0, 0.2, GUN_D)
            if tier == 2:
                box(m, 0, tip + 0.6, z + 1.4, 3.0, 1.8, 2.0, GUN_D)
        if tier == 3:
            # Mk III (the detail test's turretCannon3): cheek plates, muzzle brake, stowage basket, smoke dischargers.
            for sx in (-1, 1):
                frustum(m, rect(2.2, 9.5, 0.6, cx=sx * (w / 2 + 0.6), cy=0.0), rect(1.6, 8.5, 0.5, cx=sx * (w / 2 + 0.6), cy=0.0), z + 0.6, z + 3.4, OLIVE_D, top=SAND)
                for i in range(3):
                    cyl(m, 'y', (sx * (w / 2 - 1.0), -w / 2 + 1.6, z + 3.2), 1.4, 0.45, GUN_D, n=6)
            box(m, 0, -w / 2 - length + 0.4, z + 0.9, 3.6, 2.4, 3.0, GUN_D)
            box(m, 0, w / 2 + 2.2, z + 1.0, w - 3.0, 3.2, 2.6, WOOD)
            box(m, 0, w / 2 + 2.2, z + 3.4, w - 3.8, 2.6, 0.4, SAND)
            for dx in (-1.6, 1.6):
                box(m, dx, -0.6, z + 4.2, 1.3, 2.6, 0.25, SAND)
            box(m, 0, -w / 2 + 0.2, z + 3.6, 6.0, 1.0, 0.5, RUST)
        muzzles.append((0.0, tip - (1.2 if tier == 3 else 0.0)))
    return m, muzzles


# --- render ---------------------------------------------------------------------------------------------------------------

def draw(mesh):
    tris, cols = mesh.arrays()
    rgba, albedo = render_top(tris, cols, SIZE, K, UNIT)
    return shrink(rgba, K), mask_of(albedo, STRIPE, K)


def save(a, p):
    Image.fromarray(a).save(p)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {'size': SIZE, 'unit': UNIT, 'ring': {k: [v[0] * UNIT, v[1] * UNIT] for k, v in RING.items()}, 'muzzle': {}, 'bbox': {}}
    for t in (1, 2, 3):
        for name in HULLS:
            rgba, stripe = draw(hull(name, t))
            save(rgba, OUT / f'{name}-mk{t}.png')
            save((stripe * 255).astype(np.uint8), OUT / f'{name}-mk{t}-stripe.png')
        for name in DRIVES:
            for size in SIZES:
                for f in (0, 1, 2):
                    rgba, _ = draw(drive(name, size, t, f))
                    save(rgba, OUT / f'{name}-{size}-mk{t}{"" if f == 0 else f"-f{f}"}.png')
        for name in TURRETS:
            mesh, muzzles = turret(name, t)
            rgba, _ = draw(mesh)
            save(rgba, OUT / f'{name}-mk{t}.png')
            meta['muzzle'][f'{name}-mk{t}'] = [[round(x * UNIT, 1), round(y * UNIT, 1)] for x, y in muzzles]
    for p in sorted(OUT.glob('*mk?.png')):
        meta['bbox'][p.stem] = Image.open(p).getbbox()
    (OUT / 'meta.json').write_text(json.dumps(meta, indent=1))
    print('rendered', len(meta['bbox']), 'parts')


if __name__ == '__main__':
    main()
