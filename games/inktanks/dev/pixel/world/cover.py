"""Low cover for InkTanks: sandbag walls (east-west and north-south) and a hay bale, states 2 whole, 1 cracked, 0 scattered.

A tank fires over these, so they stay low: the sandbag wall is about 15 px tall in the projection, the bale 16.
Imported by build.py so the pieces land in the same REGISTRY as the farm and props.
"""
from __future__ import annotations

import math
import random

import numpy as np

from farm import rotate, structure
from kit import STRAW, PMesh, cylinder, lump, tone

BAG = tone(0.115, 0.32, 0.5, 0.012, 0.06)
BAG_DARK = tone(0.1, 0.3, 0.4, 0.01, 0.04)
TWINE = tone(0.08, 0.4, 0.3, 0.005, 0.03)

SAND = {'l': 96.0, 'bag': 10.4, 'ch': 4.8, 'rows': 2}


def bag(m: PMesh, x: float, y: float, z: float, rng: random.Random, tilt: float = 0.0, flat: bool = False, col=BAG) -> None:
    """One sandbag: a lumpy ellipsoid, a little pinched at the ends."""
    r = (5.5 + rng.uniform(-0.3, 0.4), 3.5 + rng.uniform(-0.2, 0.3), 2.5 + rng.uniform(-0.1, 0.2))
    sub = PMesh()
    lump(sub, (0, 0, 0), r, col, rng, n=6, jag=0.05, floor=-r[2] * 0.7)
    c, s = math.cos(tilt), math.sin(tilt)
    for t, cl in zip(sub.tris, sub.cols):
        t = np.array(t)
        m.tris.append(np.stack([t[:, 0] * c - t[:, 1] * s + x, t[:, 0] * s + t[:, 1] * c + y, t[:, 2] + z], axis=1))
        m.cols.append(cl)
    m.tris[-1] = m.tris[-1]


def sandbags(state: int) -> dict:
    m = PMesh()
    rng = random.Random(401)
    l, bl, ch = SAND['l'], SAND['bag'], SAND['ch']
    n = int(l // bl)
    x0 = -l / 2 + bl / 2 + (l - n * bl) / 2
    for course in range(3):
        z = 1.9 + course * ch
        off = (course % 2) * bl / 2 * (-1 if course else 1)
        for row, y in enumerate((-3.3, 3.3)):
            for i in range(n + (0 if course % 2 == 0 else -1)):
                x = x0 + i * bl + (bl / 2 if course % 2 else 0) + rng.uniform(-0.4, 0.4)
                yy = y + rng.uniform(-0.4, 0.4) + (course == 2) * (-0.6 if row == 0 else 0.6) * -1
                key = (course, row, i)
                if state == 2:
                    pass
                elif state == 1:
                    # Cracked: the top course burst open in the middle, a bag or two knocked from the second.
                    if course == 2 and 3 <= i <= 5:
                        continue
                    if course == 1 and row == 1 and i in (4, 5):
                        continue
                    if course == 2 and i == 6 and row == 0:
                        continue
                elif state == 0:
                    # Scattered: the ends survive one bag high, the middle is flat.
                    if course > 0 and not (i <= 1 or i >= n - 2):
                        continue
                    if course == 2:
                        continue
                    if course == 0 and 3 <= i <= 6 and row == 1:
                        continue
                zz = z
                tilt = rng.uniform(-0.12, 0.12)
                if state == 1 and course == 2 and i in (2, 6):
                    zz -= 0.9
                    tilt += 0.3
                bag(m, x, yy, zz, rng, tilt, col=BAG if course % 2 else BAG_DARK if rng.random() < 0.2 else BAG)
    if state == 1:
        for _ in range(4):
            bag(m, rng.uniform(-14, 14), rng.uniform(8, 13), 1.6, rng, rng.uniform(0, 3))
    if state == 0:
        for _ in range(9):
            bag(m, rng.uniform(-40, 40), rng.uniform(-9, 14), 1.5, rng, rng.uniform(0, 3))
    if state:
        w = 11.0
        m.solid_poly([(-l / 2, -w / 2), (l / 2, -w / 2), (l / 2, w / 2), (-l / 2, w / 2)] if state == 2 else
                     [(-l / 2, -w / 2), (-l / 2 + 22, -w / 2), (-l / 2 + 22, w / 2), (-l / 2, w / 2)])
        if state == 1:
            pass
    return {'body': m}


structure('sandbagH', [2, 1, 0], foot='runs', hp=150)(lambda s: sandbags(s))


def sandbag_v(state: int) -> dict:
    parts = sandbags(state)
    return {k: rotate(v, math.pi / 2) for k, v in parts.items()}


structure('sandbagV', [2, 1, 0], foot='runs', hp=150)(sandbag_v)

HAY = {'r': 19.0, 'h': 15.0}


def straw_wisp(m: PMesh, x: float, y: float, z: float, rng: random.Random, n: int, spread: float, size: float = 5.0) -> None:
    for _ in range(n):
        a = rng.uniform(0, math.pi)
        m.box(x + rng.uniform(-spread, spread), y + rng.uniform(-spread * 0.6, spread * 0.6), z + rng.uniform(0, 1.2),
              size * rng.uniform(0.6, 1.3), 0.9, 0.9, a, STRAW(rng), (rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3)))


def hay_bale(state: int) -> dict:
    m = PMesh()
    rng = random.Random(433)
    r, h = HAY['r'], HAY['h']
    if state == 2:
        cylinder(m, (0, 0, 0), r, 0, h - 2, STRAW, rng, sides=22)
        cylinder(m, (0, 0, 0), r - 1.4, h - 2, h, STRAW, rng, sides=22)
        # Twine bands and the coiled top.
        for z0 in (3.0, 9.0):
            cylinder(m, (0, 0, 0), r + 0.35, z0, z0 + 1.0, TWINE, rng, sides=22)
        for k, rr in enumerate((r - 5, r - 10, r - 14.5)):
            cylinder(m, (0, 0, 0), rr, h, h + 0.4 + k * 0.01, tone(0.11, 0.5, 0.5 + 0.06 * (k % 2), 0.01, 0.03), rng, sides=18)
        m.solid_poly([(r * math.cos(2 * math.pi * i / 12), r * math.sin(2 * math.pi * i / 12)) for i in range(12)])
    elif state == 1:
        # Cracked: sagged and split, straw spilling south, one band snapped.
        cylinder(m, (0, 0, 0), r, 0, h - 5, STRAW, rng, sides=22)
        cylinder(m, (-1, -1, 0), r - 2.5, h - 5, h - 3.5, STRAW, rng, sides=22)
        cylinder(m, (0, 0, 0), r + 0.35, 3.0, 4.0, TWINE, rng, sides=22)
        straw_wisp(m, 4, r - 2, 1.0, rng, 22, 11, 6)
        straw_wisp(m, -6, -4, h - 4, rng, 14, 8, 5)
        m.solid_poly([(r * math.cos(2 * math.pi * i / 12), r * math.sin(2 * math.pi * i / 12)) for i in range(12)])
    else:
        # Scattered: a low pile of loose straw and a torn band.
        straw_wisp(m, 0, 0, 0.6, rng, 70, 17, 6)
        straw_wisp(m, 0, 0, 2.0, rng, 40, 9, 5)
        m.box(-9, 6, 0.5, 9, 0.7, 0.7, 0.4, TWINE(rng))
    return {'body': m}


structure('hayBale', [2, 1, 0], foot='hull', hp=90)(hay_bale)
