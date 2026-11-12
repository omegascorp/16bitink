"""InkTanks' tank parts as 3D models, rendered straight down: hulls, drives, turrets, projectiles and the loot crate.

  python3 dev/pixel/tank_parts.py           out/parts/<key>.png (native, 64 x 64, pivot at the centre) + masks + frames.png
  python3 dev/pixel/tank_parts.py --view    out/parts/view.png only: every part 4x, to check the shapes by eye

Units are native pixels. x runs east, y south, z up; every part faces north (-y), so the game turns it by angle + 90 deg.
Each part's pivot is the canvas centre: a hull and its drive turn about the same point, and a turret about its ring,
which sits at RING[hull] on the hull. The team stripe is modelled in STRIPE grey and the tread links in TREAD, so the
game can tint the one and roll the other exactly where the model put them.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from render3d import Mesh, mask_of, render_top, shrink

HERE = Path(__file__).resolve().parent
# Densities for the detail test: native pixels per model unit, and the part canvas. A is the art test's own.
DENSITY = {'A': (1.0, 64), 'B': (4 / 3, 86), 'C': (2.0, 128)}
DENS = next((a.split('=')[1] for a in sys.argv if a.startswith('--density=')), None)
UNIT, SIZE = DENSITY[DENS or 'A']
OUT = HERE / 'out' / (f'parts-{DENS}' if DENS else 'parts')
K = 4 if DENS != 'C' else 3

OLIVE = np.array([0.36, 0.38, 0.22])
OLIVE_D = np.array([0.27, 0.29, 0.17])
SAND = np.array([0.64, 0.56, 0.38])
RUST = np.array([0.50, 0.29, 0.16])
GUN = np.array([0.27, 0.29, 0.31])
GUN_D = np.array([0.17, 0.18, 0.19])
RUBBER = np.array([0.13, 0.12, 0.12])
TREAD = np.array([0.30, 0.28, 0.26])
STRIPE = np.array([0.5, 0.5, 0.5])
BRASS = np.array([0.72, 0.56, 0.26])
WOOD = np.array([0.52, 0.36, 0.20])
WOOD_D = np.array([0.38, 0.25, 0.13])
GLOW = np.array([1.0, 0.86, 0.45])
RED = np.array([0.62, 0.18, 0.12])
BLACK = np.array([0.05, 0.05, 0.05])
RIVET = np.array([0.58, 0.58, 0.5])
SEAM = np.array([0.13, 0.13, 0.1])

# Where the turret ring sits on each hull, from the hull's centre.
RING = {'hullLight': (0, 1), 'hullMedium': (0, 1), 'hullHeavy': (0, 2)}
# The deck's height, where a turret stands.
DECK = {'hullLight': 6.5, 'hullMedium': 7.0, 'hullHeavy': 8.0}


def rect(w: float, l: float, c: float = 0.0, cx: float = 0.0, cy: float = 0.0) -> list[tuple[float, float]]:
    """A w x l rectangle round (cx, cy) with corners cut by c, clockwise from the front left."""
    x, y = w / 2, l / 2
    pts = [(-x + c, -y), (x - c, -y), (x, -y + c), (x, y - c), (x - c, y), (-x + c, y), (-x, y - c), (-x, -y + c)]
    return [(px + cx, py + cy) for px, py in pts]


def frustum(m: Mesh, low: list, high: list, z0: float, z1: float, col: np.ndarray, top: np.ndarray | None = None) -> None:
    """A slab whose top polygon is smaller than its foot: sloped armour."""
    cx, cy = np.mean(low, axis=0)
    inside = np.array([cx, cy, (z0 + z1) / 2])
    n = len(low)
    for i in range(n):
        a, b = low[i], low[(i + 1) % n]
        c, d = high[(i + 1) % n], high[i]
        m.face([(a[0], a[1], z0), (b[0], b[1], z0), (c[0], c[1], z1), (d[0], d[1], z1)], col, inside)
    m.face([(x, y, z1) for x, y in high], col if top is None else top, inside)


def box(m: Mesh, cx: float, cy: float, z0: float, sx: float, sy: float, sz: float, col: np.ndarray) -> None:
    m.box(cx, cy, z0 + sz / 2, sx, sy, sz, 0.0, col)


def cyl(m: Mesh, axis: str, c: tuple[float, float, float], length: float, r: float, col: np.ndarray, n: int = 10, cap: np.ndarray | None = None) -> None:
    """A cylinder along x, y or z, centred on c."""
    ring = [(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n)) for i in range(n)]

    def pt(a: float, b: float, t: float) -> tuple[float, float, float]:
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


def placed(m: Mesh, local: Mesh, at: tuple[float, float, float], pitch: float = 0.0) -> None:
    """Adds `local` tipped by `pitch` (radians, + lifts the north end) and moved to `at`."""
    tris, cols = local.arrays()
    c, s = math.cos(pitch), math.sin(pitch)
    # Rotation about x: y towards z. North is -y, so lifting the north end turns -y up.
    r = np.array([[1, 0, 0], [0, c, s], [0, -s, c]])
    t = tris @ r.T + np.array(at)
    for tri, col in zip(t, cols):
        m.tris.append(tri)
        m.cols.append(col)


def rivets(m: Mesh, poly: list, z: float, step: float, col: np.ndarray, inset: float = 0.7) -> None:
    """Rivet heads along a polygon's edges, `inset` in from them: sub-pixel at density A, a dotted seam at B and C."""
    cx, cy = np.mean(poly, axis=0)
    for (ax, ay), (bx, by) in zip(poly, poly[1:] + poly[:1]):
        n = max(1, int(math.hypot(bx - ax, by - ay) / step))
        for i in range(n):
            t = (i + 0.5) / n
            x, y = ax + (bx - ax) * t, ay + (by - ay) * t
            d = math.hypot(cx - x, cy - y) or 1
            box(m, x + (cx - x) / d * inset, y + (cy - y) / d * inset, z, 0.6, 0.6, 0.3, RIVET)


def seam(m: Mesh, x0: float, y0: float, x1: float, y1: float, z: float, col: np.ndarray) -> None:
    """A plating seam: a thin dark line laid on a surface."""
    l = math.hypot(x1 - x0, y1 - y0)
    m.box((x0 + x1) / 2, (y0 + y1) / 2, z + 0.03, l, 0.35, 0.06, math.atan2(y1 - y0, x1 - x0), SEAM)


def hatch(m: Mesh, x: float, y: float, z: float, r: float, col: np.ndarray) -> None:
    """A round hatch with its hinge and handle."""
    cyl(m, 'z', (x, y, z + 0.25), 0.5, r, col, n=12)
    cyl(m, 'z', (x, y, z + 0.55), 0.2, r * 0.7, OLIVE_D, n=12)
    box(m, x, y + r * 0.9, z + 0.4, r * 1.2, 0.5, 0.5, GUN_D)
    box(m, x, y - r * 0.4, z + 0.65, 0.9, 0.3, 0.25, GUN)


# --- hulls -------------------------------------------------------------------------------------------------------

def hull(name: str) -> Mesh:
    m = Mesh()
    w, l, deck = {'hullLight': (14, 24, 6.5), 'hullMedium': (18, 30, 7.0), 'hullHeavy': (22, 38, 8.0)}[name]
    z0 = 2.5
    # The lower hull, then the sloped upper hull: glacis at the front, engine deck at the back.
    frustum(m, rect(w, l, 2.5), rect(w - 1.5, l - 1.5, 2.2), z0, z0 + 2.0, OLIVE_D)
    frustum(m, rect(w - 1.5, l - 1.5, 2.2), rect(w - 4, l - 8, 1.6, cy=0.8), z0 + 2.0, deck, OLIVE)
    rx, ry = RING[name]
    cyl(m, 'z', (rx, ry, deck + 0.3), 0.6, {'hullLight': 3.6, 'hullMedium': 4.6, 'hullHeavy': 5.6}[name], GUN_D, n=14)
    # The team stripe: a painted band across the glacis, kept flat grey for the game to tint.
    gy = -(l - 8) / 2 + 0.8 + 1.8
    box(m, 0, gy, deck - 0.1, w - 5.0, 2.2, 0.3, STRIPE)
    # Fine detail: rivets round the deck, seams between its plates, the driver's hatch, tow hooks.
    top = rect(w - 4, l - 8, 1.6, cy=0.8)
    rivets(m, top, deck, 1.6, GUN)
    for f in (-0.18, 0.28):
        seam(m, -(w - 5) / 2, l * f, (w - 5) / 2, l * f, deck, OLIVE_D)
    seam(m, 0, gy + 1.6, 0, -l * 0.18, deck, OLIVE_D)
    hatch(m, -w * 0.22, gy + 2.6, deck, 1.3, OLIVE)
    for sx in (-1, 1):
        box(m, sx * (w / 2 - 3.2), -l / 2 + 0.2, z0 + 1.6, 1.0, 1.0, 0.8, GUN_D)
        seam(m, sx * (w / 2 - 0.9), -l / 2 + 3, sx * (w / 2 - 0.9), l / 2 - 3, z0 + 2.0, OLIVE_D)
    # Engine deck: grille slats and exhausts at the back.
    back = l / 2 - 3.5
    for i in range(-2, 3):
        box(m, i * (w * 0.12), back, deck - 0.2, w * 0.08, 4.0, 0.5, GUN)
    for sx in (-1, 1):
        cyl(m, 'y', (sx * (w / 2 - 2.5), l / 2 - 0.6, z0 + 3.0), 1.8, 0.9, RUST, n=8)
        # Headlights and tool boxes.
        box(m, sx * (w / 2 - 2.2), -l / 2 + 0.8, z0 + 2.0, 1.6, 1.2, 1.2, SAND)
        box(m, sx * (w / 2 - 1.2), 1.0, z0 + 2.0, 1.6, l * 0.35, 1.6, OLIVE_D if name != 'hullLight' else SAND)
    if name == 'hullLight':
        # A spare wheel and a jerrycan on the back.
        cyl(m, 'z', (3.2, l / 2 - 5.5, deck), 1.4, 2.0, RUBBER, n=10, cap=GUN_D)
        box(m, -3.0, l / 2 - 5.5, deck - 0.3, 2.4, 3.0, 1.8, RUST)
    if name == 'hullMedium':
        box(m, 4.5, l / 2 - 8.5, deck - 0.2, 3.0, 4.0, 1.4, SAND)
        cyl(m, 'x', (-4.0, l / 2 - 8.0, deck + 0.6), 5.0, 0.9, OLIVE_D, n=8)
    if name == 'hullHeavy':
        # Side skirts over the tracks' upper run and a log for unditching.
        for sx in (-1, 1):
            for i in range(4):
                box(m, sx * (w / 2 + 0.2), -l / 2 + 6 + i * 8.2, z0 + 3.0, 2.0, 7.6, 1.2, OLIVE if i % 2 else OLIVE_D)
        cyl(m, 'x', (0, l / 2 - 1.8, deck - 0.2), w - 4, 1.3, WOOD, n=8, cap=WOOD_D)
        box(m, 0, -l / 2 + 6.5, deck - 0.4, 3.0, 2.0, 1.4, GUN)
    return m


# --- drives (frame 0..2: tread links move back by a third of a link each frame) -----------------------------------

def track(m: Mesh, x: float, y0: float, y1: float, wid: float, h: float, frame: int, pitch: float = 3.0) -> None:
    """One track: rubber belt with steel links across it, rounded ends."""
    frustum(m, rect(wid, y1 - y0, 1.2, cx=x, cy=(y0 + y1) / 2), rect(wid - 0.4, y1 - y0 - 2.2, 1.0, cx=x, cy=(y0 + y1) / 2), 0.0, h, RUBBER)
    off = frame * pitch / 3
    y = y0 + 1.6 + off
    while y < y1 - 1.6:
        box(m, x, y, h - 0.1, wid - 0.6, pitch * 0.45, 0.5, TREAD)
        box(m, x, y + pitch * 0.5, h - 0.1, wid - 0.4, 0.22, 0.35, GUN_D)
        box(m, x, y, h + 0.35, 0.7, pitch * 0.3, 0.35, TREAD)
        y += pitch


def wheel(m: Mesh, x: float, y: float, wid: float, r: float, frame: int) -> None:
    """A wheel seen from above: a tyre turning about x, its tread ribs moved by a third of a rib each frame."""
    cyl(m, 'x', (x, y, r), wid, r, RUBBER, n=12, cap=GUN_D)
    for i in range(-2, 3):
        yy = y + (i + frame / 3) * 1.6
        if abs(yy - y) < r * 0.85:
            box(m, x, yy, r * 2 - 0.2 - 0.35 * abs(yy - y), wid - 0.4, 0.7, 0.4, TREAD)


def drive(name: str, frame: int) -> Mesh:
    m = Mesh()
    if name == 'driveWheels':
        for sx in (-1, 1):
            box(m, sx * 6.0, 0, 1.5, 3.0, 20, 1.2, GUN_D)
            for y in (-9.0, -3.0, 3.0, 9.0):
                wheel(m, sx * 8.8, y, 3.8, 2.35, frame)
    elif name == 'driveHalftrack':
        for sx in (-1, 1):
            box(m, sx * 7.0, 0, 1.5, 3.0, 26, 1.2, GUN_D)
            for y in (-12.5, -7.0):
                wheel(m, sx * 10.2, y, 3.8, 2.8, frame)
            track(m, sx * 10.2, -2.5, 15.5, 5.2, 5.0, frame)
    else:
        for sx in (-1, 1):
            track(m, sx * 11.8, -20.0, 20.0, 6.6, 6.0, frame)
    return m


# --- turrets (pivot = ring centre) ----------------------------------------------------------------------------------

def turret(name: str) -> Mesh:
    m = Mesh()
    z = 7.0
    if name == 'turretMG':
        cyl(m, 'z', (0, 0.5, z + 0.8), 1.6, 4.8, OLIVE_D, n=14, cap=OLIVE)
        box(m, 0, -2.8, z + 1.6, 7.5, 1.6, 2.4, OLIVE)
        box(m, 0, 1.4, z + 1.6, 3.0, 3.0, 2.0, GUN)
        # Two barrels, each at least two native pixels thick at density A, a pixel apart.
        for sx in (-1.6, 1.6):
            cyl(m, 'y', (sx, -7.5, z + 3.0), 8.6, 1.0, GUN_D, n=8)
            cyl(m, 'y', (sx, -13.0, z + 3.0), 3.2, 0.85, GUN, n=8)
            cyl(m, 'y', (sx, -4.0, z + 3.0), 2.2, 1.2, GUN, n=8)
        rivets(m, rect(6.4, 6.4, 2.0, cy=0.5), z + 1.6, 1.4, GUN)
        box(m, 4.0, 0.0, z + 1.6, 2.2, 3.2, 1.8, SAND)
    elif name == 'turretRocket':
        cyl(m, 'z', (0, 0.5, z + 0.6), 1.2, 5.0, OLIVE_D, n=14, cap=GUN)
        box(m, 0, 0.8, z + 1.2, 3.0, 4.0, 2.5, GUN)
        for sx in (-1, 1):
            pod = Mesh()
            box(pod, 0, 0, -2.8, 6.0, 10.0, 5.6, OLIVE)
            box(pod, 0, -1.0, 2.8, 5.0, 4.0, 0.3, SAND)
            for tx in (-1.4, 1.4):
                for tz in (-1.35, 1.35):
                    cyl(pod, 'y', (tx, -5.0, tz), 0.6, 1.05, BLACK, n=10, cap=BLACK)
            placed(m, pod, (sx * 3.6, -1.2, z + 5.2), pitch=0.75)
    else:
        mk3 = name == 'turretCannon3'
        w = 13.0 if mk3 else 11.5
        frustum(m, rect(w, w + 0.5, 2.5, cy=1.0), rect(w - 3, w - 3.5, 2.0, cy=1.6), z, z + 4.2, OLIVE, top=OLIVE)
        box(m, 0, -w / 2 + 0.4, z + 0.8, 5.0 if not mk3 else 6.4, 2.4, 3.0, OLIVE_D)
        length = 15.0 if not mk3 else 17.0
        cyl(m, 'y', (0, -w / 2 - length / 2 + 1.0, z + 2.4), length, 1.15, GUN, n=10)
        cyl(m, 'y', (0, -w / 2 - 1.2, z + 2.4), 2.6, 1.7, GUN_D, n=10)
        cyl(m, 'z', (-2.0, 2.8, z + 4.5), 0.6, 1.6, GUN_D, n=10, cap=GUN)
        box(m, 2.6, 1.2, z + 4.2, 1.2, 1.6, 0.9, GUN_D)
        rivets(m, rect(w - 3, w - 3.5, 2.0, cy=1.6), z + 4.2, 1.5, GUN)
        for px in (-3.4, 0.8):
            box(m, px, -w / 2 + 3.2, z + 4.2, 1.1, 0.6, 0.6, GUN_D)
        seam(m, -(w - 4) / 2, 3.6, (w - 4) / 2, 3.6, z + 4.2, OLIVE_D)
        if mk3:
            # Mk III's extra kit: bolted plates, spare track links, a cupola machinegun and an aerial.
            for sx in (-1, 1):
                for i in range(4):
                    box(m, sx * (w / 2 + 0.6), -3.6 + i * 2.4, z + 3.4, 0.6, 0.6, 0.3, RIVET)
                for i in range(3):
                    box(m, sx * (w / 2 - 0.6), 3.0 + i * 1.5, z + 2.0, 1.6, 1.2, 0.6, TREAD)
            cyl(m, 'z', (-2.0, 2.8, z + 5.1), 0.8, 1.5, OLIVE_D, n=10, cap=GUN)
            cyl(m, 'y', (-2.0, 0.4, z + 5.8), 3.6, 0.35, GUN_D, n=6)
            cyl(m, 'z', (3.4, w / 2 - 0.5, z + 5.0), 0.8, 0.45, GUN_D, n=6)
            box(m, 3.4, w / 2 + 2.6, z + 5.3, 0.25, 6.0, 0.2, GUN_D)
            # Mk III: add-on plates on the cheeks, a muzzle brake, a stowage basket, smoke dischargers and decals.
            for sx in (-1, 1):
                frustum(m, rect(2.2, 9.5, 0.6, cx=sx * (w / 2 + 0.6), cy=0.0), rect(1.6, 8.5, 0.5, cx=sx * (w / 2 + 0.6), cy=0.0), z + 0.6, z + 3.4, OLIVE_D, top=SAND)
                for i in range(3):
                    cyl(m, 'y', (sx * (w / 2 - 1.0), -w / 2 + 1.4 - i * 0.0 + 0.2, z + 3.2 + i * 0.0), 1.4, 0.45, GUN_D, n=6)
            box(m, 0, -w / 2 - length + 0.4, z + 0.9, 3.6, 2.4, 3.0, GUN_D)
            box(m, 0, w / 2 + 2.2, z + 1.0, w - 3.0, 3.2, 2.6, WOOD)
            box(m, 0, w / 2 + 2.2, z + 3.4, w - 3.8, 2.6, 0.4, SAND)
            for dx in (-1.6, 1.6):
                box(m, dx, -0.6, z + 4.2, 1.3, 2.6, 0.25, SAND)
            box(m, 0, -w / 2 + 0.2, z + 3.6, 6.0, 1.0, 0.5, RUST)
    return m


# --- projectiles and the crate --------------------------------------------------------------------------------------

def projectile(name: str) -> Mesh:
    m = Mesh()
    if name == 'shotBullet':
        cyl(m, 'y', (0, 0, 1), 6.0, 0.9, GLOW, n=6)
        cyl(m, 'y', (0, -2.8, 1), 1.2, 0.55, BRASS, n=6)
    elif name == 'shotShell':
        cyl(m, 'y', (0, 0.6, 1), 5.0, 1.1, BRASS, n=8)
        cyl(m, 'y', (0, -2.6, 1), 1.8, 0.8, GUN, n=8)
    else:
        cyl(m, 'y', (0, 0, 1.2), 9.0, 1.0, OLIVE, n=8)
        cyl(m, 'y', (0, -5.0, 1.2), 1.6, 0.7, RED, n=8)
        for sx in (-1, 1):
            box(m, sx * 1.4, 3.6, 0.8, 1.6, 1.8, 0.4, GUN)
        box(m, 0, 3.6, 1.0, 0.4, 1.8, 2.6, GUN)
    return m


def crate() -> Mesh:
    m = Mesh()
    box(m, 0, 0, 0, 13, 13, 7, WOOD_D)
    for i in range(4):
        box(m, 0, -4.8 + i * 3.2, 7, 12, 2.7, 0.6, WOOD)
    for sx in (-1, 1):
        box(m, sx * 5.6, 0, 7, 1.6, 13, 1.0, GUN)
    box(m, 0, 0, 7.6, 4.4, 4.4, 0.4, SAND)
    return m


PARTS = {
    'hullLight': lambda: hull('hullLight'), 'hullMedium': lambda: hull('hullMedium'), 'hullHeavy': lambda: hull('hullHeavy'),
    'driveWheels': lambda: drive('driveWheels', 0), 'driveHalftrack': lambda: drive('driveHalftrack', 0), 'driveTracks': lambda: drive('driveTracks', 0),
    'turretMG': lambda: turret('turretMG'), 'turretCannon': lambda: turret('turretCannon'), 'turretRocket': lambda: turret('turretRocket'),
    'turretCannon3': lambda: turret('turretCannon3'),
    'shotBullet': lambda: projectile('shotBullet'), 'shotShell': lambda: projectile('shotShell'), 'shotRocket': lambda: projectile('shotRocket'),
    'crate': crate,
}
DRIVE_FRAMES = ('driveWheels', 'driveHalftrack', 'driveTracks')


def draw(mesh: Mesh) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    tris, cols = mesh.arrays()
    rgba, albedo = render_top(tris, cols, SIZE, K, UNIT)
    return shrink(rgba, K), mask_of(albedo, STRIPE, K), mask_of(albedo, TREAD, K)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {'size': SIZE, 'unit': UNIT, 'ring': {k: [v[0] * UNIT, v[1] * UNIT] for k, v in RING.items()}, 'deck': DECK, 'parts': {}}
    frames = []
    for key, make in PARTS.items():
        rgba, stripe, tread = draw(make())
        Image.fromarray(rgba).save(OUT / f'{key}.png')
        Image.fromarray((stripe * 255).astype(np.uint8)).save(OUT / f'{key}-stripe.png')
        Image.fromarray((tread * 255).astype(np.uint8)).save(OUT / f'{key}-tread.png')
        box_ = Image.fromarray(rgba).getbbox()
        meta['parts'][key] = {'bbox': box_}
        frames.append(rgba)
        if key in DRIVE_FRAMES and '--view' not in sys.argv:
            for f in (1, 2):
                rk, _, tk = draw(drive(key, f))
                Image.fromarray(rk).save(OUT / f'{key}-f{f}.png')
                Image.fromarray((tk * 255).astype(np.uint8)).save(OUT / f'{key}-f{f}-tread.png')
    # All parts side by side, 4x, on grey: for looking at the model.
    view = Image.new('RGBA', (SIZE * 7 * 4, SIZE * 2 * 4), (110, 112, 104, 255))
    for i, rgba in enumerate(frames):
        im = Image.fromarray(rgba).resize((SIZE * 4, SIZE * 4), Image.NEAREST)
        view.alpha_composite(im, ((i % 7) * SIZE * 4, (i // 7) * SIZE * 4))
    # The four builds assembled, as the game stacks them.
    builds = (('driveWheels', 'hullLight', 'turretMG'), ('driveHalftrack', 'hullMedium', 'turretCannon'), ('driveTracks', 'hullHeavy', 'turretRocket'), ('driveHalftrack', 'hullMedium', 'turretCannon3'))
    for i, (d, h, t) in enumerate(builds):
        tank = Image.new('RGBA', (SIZE, SIZE))
        tank.alpha_composite(Image.open(OUT / f'{d}.png'))
        tank.alpha_composite(Image.open(OUT / f'{h}.png'))
        rx, ry = RING[h]
        tank.alpha_composite(Image.open(OUT / f'{t}.png'), (round(rx * UNIT), round(ry * UNIT)))
        view.alpha_composite(tank.resize((SIZE * 4, SIZE * 4), Image.NEAREST), (((i + 3) % 7) * SIZE * 4, SIZE * 4 if i < 4 else 0))
    view.save(OUT / 'view.png')
    (OUT / 'parts.json').write_text(json.dumps(meta, indent=1))
    print(len(frames), 'parts')


if __name__ == '__main__':
    main()
