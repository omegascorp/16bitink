"""The straight-down world pieces, drawn like the tanks: the supply truck (Escort) and the Boar land fortress (the chapter boss).

  python3 dev/pixel/world/topdown.py          out/render/<name>/<key>.png, out/sheets/topdown/sheet-0.png + place.json, topdown.json

Everything faces north (up) with its pivot at the frame's centre, in native density-C pixels, as the tank parts
(dev/detail-test/assets/C/manifest.json). Moving parts have frame f1 and f2; the paint goes on f1 and f2 is f1's paint plus
the model's change between them (as install_detail.py does for the drives).
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image

from kit import PMesh, cylinder, hls, lump, tone
from props import bar
from render3d import render_top, shrink

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out' / 'render'
S = 4

ARMOUR = tone(0.055, 0.38, 0.34, 0.008, 0.03)
ARMOUR_DARK = tone(0.05, 0.3, 0.24, 0.008, 0.02)
STEEL = tone(0.3, 0.06, 0.32, 0.02, 0.03)
LINK = tone(0.08, 0.06, 0.24, 0.01, 0.03)
IVORY = tone(0.12, 0.35, 0.8, 0.01, 0.03)
SOOT = tone(0.07, 0.08, 0.15, 0.01, 0.03)
TRUCK = tone(0.2, 0.28, 0.34, 0.01, 0.02)
TARP = tone(0.13, 0.25, 0.55, 0.01, 0.04)
GLASS = lambda r: hls(0.58, 0.3, 0.22)  # noqa: E731
TYRE = tone(0.0, 0.0, 0.14, 0.0, 0.02)


def rivets(m: PMesh, x0: float, y0: float, x1: float, y1: float, z: float, every: float, rng: random.Random) -> None:
    n = max(2, int(math.hypot(x1 - x0, y1 - y0) / every))
    for i in range(n + 1):
        f = i / n
        m.box(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, z + 0.5, 1.4, 1.4, 1.0, 0, STEEL(rng))


# --- the supply truck --------------------------------------------------------------------------------------------------

def truck(state: int, phase: int) -> PMesh:
    m = PMesh()
    rng = random.Random(401)
    for (y, x) in ((-30, -17), (-30, 17), (16, -17), (16, 17), (30, -17), (30, 17)):
        # Tyres stick out past the body; their tread blocks move a half step between frames.
        m.box(x, y, 5, 7, 14, 10, 0, TYRE(rng))
        for k in range(-3, 4):
            yy = y + k * 2 + phase
            if abs(yy - y) < 6.5:
                m.box(x + (2.5 if x > 0 else -2.5), yy, 9.6, 2.4, 1.0, 1.0, 0, hls(0, 0, 0.2))
    body = ARMOUR_DARK if not state else TRUCK
    # Bonnet, cab, then the cargo bed with its canvas tilt.
    m.box(0, -36, 13, 26, 16, 6, 0, body(rng))
    m.box(0, -44, 11, 24, 2, 4, 0, STEEL(rng))
    for x in (-8, -4, 0, 4, 8):
        m.box(x, -44.5, 12, 1.2, 1.4, 3, 0, hls(0, 0, 0.15))
    m.box(0, -22, 17, 30, 14, 14, 0, body(rng))
    if state:
        m.box(0, -27.5, 22, 24, 3, 6, 0, GLASS(rng))
        m.box(0, -20, 24.2, 26, 10, 0.6, 0, body(rng))
    m.box(0, 14, 10, 34, 50, 4, 0, body(rng))
    if state:
        for k in range(6):
            y = -8 + k * 9
            n = 8
            for i in range(n):
                a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
                xa, xb = -16 * math.cos(a0), -16 * math.cos(a1)
                za, zb = 12 + 12 * math.sin(a0), 12 + 12 * math.sin(a1)
                m.face([(xa, y, za), (xb, y, zb), (xb, y + 9, zb), (xa, y + 9, za)], TARP(rng), np.array([0, y + 4.5, 8]))
        for y in (-8, 10, 28, 46):
            bar(m, (-16, y - 7.5, 22), (16, y - 7.5, 22), 1.0, hls(0.08, 0.3, 0.3))
        m.box(0, 39, 20, 20, 2, 4, 0, hls(0.13, 0.25, 0.48))
    else:
        for y in (-6, 6, 18, 30):
            n = 6
            for i in range(n):
                a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
                if (i + y) % 4 == 0:
                    continue
                bar(m, (-16 * math.cos(a0), y, 12 + 12 * math.sin(a0)), (-16 * math.cos(a1), y, 12 + 12 * math.sin(a1)), 1.4, SOOT(rng))
        for k in range(5):
            m.box(rng.uniform(-10, 10), rng.uniform(0, 34), 13, rng.uniform(5, 10), rng.uniform(4, 8), 3, rng.uniform(0, 3), SOOT(rng))
    return m


# --- the Boar land fortress --------------------------------------------------------------------------------------------

MOUNTS = {'cannon': (0, 14), 'mgLeft': (-40, -56), 'mgRight': (40, -56), 'rockets': (0, 74)}


def treads(phase: int) -> PMesh:
    m = PMesh()
    rng = random.Random(411)
    for side in (-1, 1):
        x = side * 68
        m.box(x, 0, 7, 22, 212, 8, 0, LINK(rng))
        y = -104 + phase
        while y < 104:
            m.box(x, y, 11.6, 22, 3.4, 1.4, 0, STEEL(rng))
            m.box(x, y, 12.4, 4, 3.4, 1.0, 0, hls(0.08, 0.1, 0.4))
            y += 6
    return m


def fortress_body() -> PMesh:
    m = PMesh()
    rng = random.Random(421)
    # The armoured hull: a deck over the treads' inner edges, fenders over their outer halves.
    m.box(0, 4, 12, 114, 196, 20, 0, ARMOUR(rng))
    m.box(0, 4, 22.5, 104, 186, 1.4, 0, ARMOUR(rng))
    for side in (-1, 1):
        m.box(side * 70, 4, 18.5, 22, 200, 1.4, 0, ARMOUR_DARK(rng))
        rivets(m, side * 60, -94, side * 60, 102, 19.4, 8, rng)
        # Spare links and tool boxes along the fenders.
        for y in (-70, -40, 30, 60):
            m.box(side * 70, y, 20.6, 16, 10, 3, 0, LINK(rng))
    # Deck plates with seams and rivets.
    for (x0, y0, x1, y1) in ((-50, -86, 50, -30), (-50, -26, -18, 50), (18, -26, 50, 50), (-50, 54, 50, 100)):
        m.box((x0 + x1) / 2, (y0 + y1) / 2, 23.8, x1 - x0 - 2, y1 - y0 - 2, 1.2, 0, ARMOUR(rng))
        for (a, b, c, d) in ((x0, y0, x1, y0), (x0, y1, x1, y1), (x0, y0, x0, y1), (x1, y0, x1, y1)):
            rivets(m, a + 2 * (x0 == a == c), b + 2, c - 2 * (x1 == a == c), d - 2, 24.4, 7, rng)
    # The sloped glacis, then the ram: a heavy plough with two great tusks (the Boars' mark), and a round emblem plate.
    m.face([(-52, -96, 22), (52, -96, 22), (56, -112, 10), (-56, -112, 10)], ARMOUR_DARK(rng), np.array([0, -90, 0]))
    m.box(0, -116, 8, 132, 10, 12, 0, STEEL(rng))
    for k in range(-5, 6):
        m.box(k * 11, -121, 8, 6, 4, 10, 0, STEEL(rng))
    for side in (-1, 1):
        tusk = PMesh()
        n = 10
        for i in range(n):
            f0, f1 = i / n, (i + 1) / n
            p0 = (side * (34 + 22 * f0 ** 1.4), -112 - 26 * f0, 12 + 5 * math.sin(f0 * math.pi))
            p1 = (side * (34 + 22 * f1 ** 1.4), -112 - 26 * f1, 12 + 5 * math.sin(f1 * math.pi))
            bar(tusk, p0, p1, 7.5 * (1 - f0 * 0.75), IVORY(rng))
        m.add(tusk)
    cylinder(m, (0, -100), 9, 20, 23, lambda r: hls(0.1, 0.45, 0.6), rng, sides=14)
    lump(m, (0, -100, 23), (6, 6, 2), lambda r: hls(0.05, 0.4, 0.3), rng, n=6)
    # The engine deck at the rear: a grille, two exhaust stacks, a hatch on each side of the main turret.
    for k in range(9):
        m.box(0, 84 + k * 2.2, 25, 40, 1.2, 1.0, 0, hls(0, 0, 0.16))
    for side in (-1, 1):
        cylinder(m, (side * 40, 92), 6, 24, 34, STEEL, rng, sides=12, top=lambda r: hls(0, 0, 0.08))
        cylinder(m, (side * 36, -14), 6.5, 24, 26, ARMOUR_DARK, rng, sides=12)
        bar(m, (side * 30, -14, 26.5), (side * 42, -14, 26.5), 1.6, STEEL(rng))
    # The turret rings.
    for name, (x, y) in MOUNTS.items():
        r = {'cannon': 30, 'rockets': 22}.get(name, 14)
        cylinder(m, (x, y), r, 24, 25, lambda q: hls(0, 0, 0.12), rng, sides=24)
    return m


def cannon_turret(state: int) -> PMesh:
    m = PMesh()
    rng = random.Random(431)
    sides = 8
    pts = [(28 * math.cos(2 * math.pi * (i + 0.5) / sides), 26 * math.sin(2 * math.pi * (i + 0.5) / sides) + 4) for i in range(sides)]
    if state:
        m.prism(pts, 0, 16, ARMOUR(rng), ARMOUR(rng))
        m.prism([(x * 0.8, y * 0.8 + 1) for x, y in pts], 16, 18, ARMOUR_DARK(rng))
        m.box(0, -24, 12, 24, 10, 10, 0, ARMOUR_DARK(rng))
        for x in (-6, 6):
            cylinder_y(m, (x, -28), -62, 3.2, 12, STEEL, rng)
            cylinder_y(m, (x, -62), -66, 4.2, 12, STEEL, rng)
        cylinder(m, (12, 10), 7, 18, 24, ARMOUR, rng, sides=12)
        cylinder(m, (-12, 12), 5, 18, 20, ARMOUR_DARK, rng, sides=10)
        for (x0, y0, x1, y1) in zip([p[0] for p in pts], [p[1] for p in pts], [p[0] for p in pts[1:] + pts[:1]], [p[1] for p in pts[1:] + pts[:1]]):
            rivets(m, x0 * 0.9, y0 * 0.9, x1 * 0.9, y1 * 0.9, 16, 6, rng)
    else:
        m.prism(pts, 0, 7, SOOT(rng), SOOT(rng))
        for k in range(10):
            a = rng.uniform(0, 2 * math.pi)
            m.box(math.cos(a) * 20, math.sin(a) * 18, 8, rng.uniform(5, 10), rng.uniform(3, 6), 3, a, ARMOUR_DARK(rng), (rng.uniform(-0.4, 0.4), 0))
        cylinder_y(m, (-6, -24), -40, 3.2, 8, SOOT, rng)
        bar(m, (6, -24, 8), (14, -40, 3), 6, SOOT(rng))
        lump(m, (0, 2, 7), (16, 14, 2), SOOT, rng, n=6, jag=0.3)
    return m


def cylinder_y(m: PMesh, c: tuple, y1: float, r: float, z: float, colour, rng: random.Random, sides: int = 10) -> None:
    """A barrel lying along y from c to y1, its axis at height z."""
    x, y0 = c
    for i in range(sides):
        a0, a1 = 2 * math.pi * i / sides, 2 * math.pi * (i + 1) / sides
        p = lambda a, y: (x + r * math.cos(a), y, z + r * math.sin(a))  # noqa: E731
        m.face([p(a0, y0), p(a1, y0), p(a1, y1), p(a0, y1)], colour(rng), np.array([x, (y0 + y1) / 2, z]))


def mg_turret(state: int) -> PMesh:
    m = PMesh()
    rng = random.Random(441)
    if state:
        lump(m, (0, 2, 0), (13, 12, 12), ARMOUR, rng, n=8, floor=0)
        m.box(0, -10, 8, 12, 6, 6, 0, ARMOUR_DARK(rng))
        for x in (-3, 3):
            cylinder_y(m, (x, -12), -28, 1.4, 8, STEEL, rng, sides=8)
        m.box(0, 6, 12, 6, 6, 1, 0, ARMOUR_DARK(rng))
    else:
        lump(m, (0, 2, 0), (12, 11, 5), SOOT, rng, n=8, jag=0.35, floor=0)
        bar(m, (-2, -6, 5), (-6, -16, 2), 2.4, SOOT(rng))
    return m


def rocket_turret(state: int) -> PMesh:
    m = PMesh()
    rng = random.Random(451)
    if state:
        m.box(0, 4, 6, 36, 26, 12, 0, ARMOUR(rng))
        for side in (-1, 1):
            m.box(side * 11, -2, 16, 12, 30, 8, 0, ARMOUR_DARK(rng))
            for k in (-1, 1):
                cylinder_y(m, (side * 11 + k * 3, 13), -18, 2.6, 16, STEEL, rng, sides=8)
                m.box(side * 11 + k * 3, -18.5, 16, 3.6, 1, 3.6, 0, hls(0.02, 0.7, 0.45))
        m.box(0, 12, 13, 8, 6, 2, 0, STEEL(rng))
    else:
        m.box(0, 4, 4, 34, 24, 8, 0.1, SOOT(rng))
        for side in (-1, 1):
            m.box(side * 12, 0, 9, 11, 26, 4, side * 0.3, SOOT(rng), (0.2 * side, 0))
    return m


def frame(mesh: PMesh, size: int) -> tuple[np.ndarray, np.ndarray]:
    tris, cols = mesh.arrays()
    rgba, albedo = render_top(tris, cols, size, S, 1.0)
    return shrink(rgba, S), albedo


PIECES = {
    'truck-1': (lambda: truck(1, 0), 128), 'truck-1-f2': (lambda: truck(1, 1), 128), 'truck-0': (lambda: truck(0, 0), 128),
    'fortress-body': (fortress_body, 288), 'fortress-treads': (lambda: treads(0), 288), 'fortress-treads-f2': (lambda: treads(3), 288),
    'fortressCannon-1': (lambda: cannon_turret(1), 144), 'fortressCannon-0': (lambda: cannon_turret(0), 144),
    'fortressMG-1': (lambda: mg_turret(1), 64), 'fortressMG-0': (lambda: mg_turret(0), 64),
    'fortressRockets-1': (lambda: rocket_turret(1), 64), 'fortressRockets-0': (lambda: rocket_turret(0), 64),
}
# Where each painted frame sits on the one 512 sheet (f2 frames aren't painted).
SHEET = {'fortress-body': (0, -4), 'fortress-treads': (224, -16), 'truck-1': (0, 256), 'truck-0': (128, 256),
         'fortressCannon-1': (256, 256), 'fortressCannon-0': (368, 256), 'fortressMG-1': (256, 400), 'fortressMG-0': (320, 400),
         'fortressRockets-1': (384, 400), 'fortressRockets-0': (448, 400)}
# Muzzles: native px from the frame centre at rotation 0 (facing north), one per barrel.
MUZZLE = {'fortressCannon': [[-6, -66], [6, -66]], 'fortressMG': [[-3, -28], [3, -28]], 'fortressRockets': [[-14, -19], [-8, -19], [8, -19], [14, -19]]}


def main() -> None:
    sheet = Image.new('RGBA', (512, 512))
    place = {}
    for key, (fn, size) in PIECES.items():
        name = key.split('-')[0]
        d = OUT / name
        d.mkdir(parents=True, exist_ok=True)
        img, _ = frame(fn(), size)
        Image.fromarray(img).save(d / f'{key}.png')
        if key in SHEET:
            x, y = SHEET[key]
            im = Image.fromarray(img)
            # The cannon's frame is bigger than its slot; it's centred and only its drawn pixels must fit.
            px, py = (x - (size - 112) // 2 if size == 144 else x), (y - 16 if size == 144 else y)
            cx, cy = max(0, -px), max(0, -py)
            assert not im.crop((0, 0, im.width, cy)).getbbox() and not im.crop((0, 0, cx, im.height)).getbbox(), key
            sheet.alpha_composite(im.crop((cx, cy, im.width, im.height)), (px + cx, py + cy))
            place[key] = {'name': name, 'sheet': 0, 'x': x - (size - 112) // 2 if size == 144 else x, 'y': y - 16 if size == 144 else y}
        print(key, size, flush=True)
    out = HERE / 'out' / 'sheets' / 'topdown'
    out.mkdir(parents=True, exist_ok=True)
    sheet.save(out / 'sheet-0.png')
    (out / 'place.json').write_text(json.dumps(place, indent=1))
    meta = {'truck': {'size': 128, 'frames': ['truck-1', 'truck-1-f2'], 'wreck': 'truck-0', 'facing': 'north'},
            'fortress': {'size': 288, 'body': 'fortress-body', 'treads': ['fortress-treads', 'fortress-treads-f2'],
                         'mounts': {k: {'at': list(v), 'turret': 'fortressCannon' if k == 'cannon' else 'fortressRockets' if k == 'rockets' else 'fortressMG'}
                                    for k, v in MOUNTS.items()},
                         'turrets': {'fortressCannon': {'size': 144, 'muzzle': MUZZLE['fortressCannon']}, 'fortressMG': {'size': 64, 'muzzle': MUZZLE['fortressMG']},
                                     'fortressRockets': {'size': 64, 'muzzle': MUZZLE['fortressRockets']}}, 'facing': 'north'}}
    (OUT / 'topdown.json').write_text(json.dumps(meta, indent=1))


if __name__ == '__main__':
    main()
