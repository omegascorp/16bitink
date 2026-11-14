"""The Meadowlands mission props as 3D models, in the field projection (native density-C pixels, origin = middle of the footprint).

Crates and the supply drop, fuel barrels (Raid), the radar mast (Hold and Raid), the bridge (its deck is ground, its rails are
structures), rail track and a wagon, the airfield hangar, and the old fort's walls, tower and gate.
"""
from __future__ import annotations

import math
import random

import numpy as np

from farm import boards, rotate, structure
from kit import (DOOR, FIELDSTONE, FLOOR, METAL, PLANK, RUST, STONE, TIMBER, WHITE, PMesh, blocks, cylinder, hls, lump, panel, ragged, rubble,
                 tone)

STEEL = tone(0.3, 0.1, 0.45, 0.02, 0.04)
OLIVE = tone(0.2, 0.3, 0.33, 0.01, 0.03)
DRUM_RED = tone(0.01, 0.55, 0.38, 0.005, 0.03)
DRUM_OLIVE = tone(0.19, 0.3, 0.32, 0.005, 0.03)
CANVAS = tone(0.12, 0.25, 0.7, 0.01, 0.04)
SOOT = tone(0.08, 0.1, 0.16, 0.01, 0.03)
FORTSTONE = tone(0.11, 0.12, 0.56, 0.02, 0.07)
CORRUGATED = tone(0.33, 0.06, 0.55, 0.02, 0.05)


def bar(m: PMesh, p: tuple, q: tuple, r: float, col: np.ndarray) -> None:
    """A square beam from p to q, r thick."""
    p, q = np.array(p, float), np.array(q, float)
    d = q - p
    n = d / max(1e-9, np.linalg.norm(d))
    a = np.array([0.0, 0.0, 1.0]) if abs(n[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    u = np.cross(n, a)
    u /= np.linalg.norm(u)
    v = np.cross(n, u)
    c = [u * r / 2 + v * r / 2, -u * r / 2 + v * r / 2, -u * r / 2 - v * r / 2, u * r / 2 - v * r / 2]
    mid = (p + q) / 2
    for i in range(4):
        j = (i + 1) % 4
        m.face([p + c[i], p + c[j], q + c[j], q + c[i]], col, mid)
    m.face([p + x for x in c], col, mid)
    m.face([q + x for x in c], col, mid)


def transformed(m: PMesh, fn) -> PMesh:
    out = PMesh()
    for t, col in zip(m.tris, m.cols):
        out.tris.append(np.array([fn(np.array(p)) for p in t]))
        out.cols.append(col)
    out.runs = m.runs
    return out


# --- crates and the supply drop ----------------------------------------------------------------------------------------

def crate_mesh(m: PMesh, cx: float, cy: float, s: float, h: float, rng: random.Random, broken: bool = False) -> None:
    wood = tone(0.08, 0.4, 0.45, 0.01, 0.06)
    if not broken:
        m.box(cx, cy, h / 2, s, s, h, 0, wood(rng))
        for z in (1.2, h - 1.2):
            panel(m, (cx, cy + s / 2), s + 0.4, z - 1.1, z + 1.1, TIMBER(rng), out=0.4)
        for k in range(3):
            panel(m, (cx - s / 3 + k * s / 3, cy + s / 2), 0.6, 2.3, h - 2.3, hls(0.07, 0.35, 0.3), out=0.2, d=0.6)
        for x in (cx - s / 2 + 1, cx + s / 2 - 1):
            panel(m, (x, cy + s / 2), 2, 0, h, STEEL(rng), out=0.5)
        m.box(cx, cy, h + 0.3, s - 2, 1.6, 0.6, 0, TIMBER(rng))
        m.box(cx, cy, h + 0.3, 1.6, s - 2, 0.6, 0, TIMBER(rng))
    else:
        for k in range(9):
            m.box(cx + rng.uniform(-s, s) * 0.8, cy + rng.uniform(-s, s) * 0.6, 0.8, s * rng.uniform(0.5, 0.9), 2.6, 1.0, rng.uniform(0, math.pi), wood(rng), (rng.uniform(-0.2, 0.2), 0))
        m.box(cx - s * 0.2, cy, 2, s * 0.6, s * 0.7, 4, 0.3, wood(rng))


@structure('crate', [1, 0], foot='hull', hp=40, flattenable=True)
def crate(state: int) -> dict:
    m = PMesh()
    crate_mesh(m, 0, 0, 18, 15, random.Random(201), broken=not state)
    if state:
        m.solid_poly([(-9, -9), (9, -9), (9, 9), (-9, 9)])
    return {'body': m}


@structure('supplyDrop', [1], foot='hull', hp=0)
def supply_drop(state: int) -> dict:
    m = PMesh()
    rng = random.Random(211)
    crate_mesh(m, 0, 0, 22, 18, rng)
    # Steel bands and a beacon on top.
    for x in (-6, 6):
        panel(m, (x, 11), 2.2, 0, 18, STEEL(rng), out=0.5)
    cylinder(m, (0, 0), 2, 18.5, 22, lambda r: hls(0.02, 0.8, 0.5), rng, sides=8)
    # The parachute lies collapsed behind and to the right, in cream and olive panels, its cords running to the crate.
    for k, (dx, dy, rx, ry, hz) in enumerate(((22, -18, 16, 10, 4.5), (36, -10, 12, 9, 3.5), (12, -28, 12, 7, 3.5), (30, -26, 10, 7, 3))):
        lump(m, (dx, dy, 0.5), (rx, ry, hz), CANVAS if k % 2 == 0 else OLIVE, rng, n=7, jag=0.25, floor=0.3)
    for (x, y) in ((14, -14), (24, -6), (8, -22), (28, -18)):
        bar(m, (8, -4, 14), (x, y, 2.5), 0.5, hls(0.1, 0.1, 0.8))
    m.solid_poly([(-11, -11), (11, -11), (11, 11), (-11, 11)])
    return {'body': m}


# --- fuel barrels (Raid target) ----------------------------------------------------------------------------------------

DRUMS = [(-12, -6), (0, -7), (12, -6), (-6, 4), (6, 4), (18, 5), (-18, 5)]


@structure('fuelBarrels', [1, 0], foot='hull', hp=120)
def fuel_barrels(state: int) -> dict:
    m = PMesh()
    rng = random.Random(221)
    m.box(0, -1, 1, 46, 22, 2, 0, PLANK(rng))
    for i, (x, y) in enumerate(DRUMS):
        col = DRUM_RED if i % 3 else DRUM_OLIVE
        if state:
            cylinder(m, (x, y), 5.4, 2, 17, col, rng, sides=14, ry=4.6, top=lambda r: hls(0.03, 0.2, 0.45))
            for z in (6, 12):
                cylinder(m, (x, y), 5.7, z - 0.6, z + 0.6, lambda r: hls(0.03, 0.15, 0.3), rng, sides=14, ry=4.9)
            m.box(x + 2, y - 1, 17.4, 1.8, 1.8, 0.8, 0, hls(0.1, 0.1, 0.25))
        elif i % 2:
            # Tipped over and split, the rest a scorched stub.
            drum = PMesh()
            cylinder(drum, (0, 0), 5.4, -7, 7, SOOT if i % 4 == 1 else col, rng, sides=14)
            ang = rng.uniform(0, math.pi)
            drum = transformed(drum, lambda p, a=ang, x=x, y=y: np.array([x + p[2] * math.cos(a), y + p[2] * math.sin(a) * 0.8, 5.4 + p[1] * 0.9]))
            m.add(drum)
        else:
            cylinder(m, (x, y), 5.4, 2, 6 + rng.uniform(0, 4), SOOT, rng, sides=14, ry=4.6, top=SOOT)
    if not state:
        rubble(m, 0, 0, 26, 14, 30, random.Random(5), SOOT, 3)
    m.solid_poly([(-24, -12), (24, -12), (24, 10), (-24, 10)])
    return {'body': m}


# --- the radar mast (Hold and Raid) ------------------------------------------------------------------------------------

def mast_mesh(state: int, rng: random.Random) -> PMesh:
    m = PMesh()
    base, top_w, hgt = 22.0, 6.0, 92.0
    legs = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    at = lambda sx, sy, z: (sx * (base / 2 - (base - top_w) / 2 * z / hgt), sy * (base / 2 - (base - top_w) / 2 * z / hgt), z)  # noqa: E731
    steel = hls(0.02, 0.5, 0.42)
    white = WHITE(rng)
    for i, (sx, sy) in enumerate(legs):
        bar(m, at(sx, sy, 0), at(sx, sy, hgt), 1.8, steel)
    levels = np.linspace(0, hgt, 9)
    for k, (z0, z1) in enumerate(zip(levels, levels[1:])):
        for i in range(4):
            (ax, ay), (bx, by) = legs[i], legs[(i + 1) % 4]
            if state == 1 and k == 4 and i == 0:
                continue
            c = white if k % 2 else steel
            bar(m, at(ax, ay, z1), at(bx, by, z1), 1.1, c)
            bar(m, at(ax, ay, z0), at(bx, by, z1), 0.8, c)
    # The platform, the dish and the feed.
    m.box(0, 0, hgt + 1, 14, 14, 2, 0, STEEL(rng))
    dish = PMesh()
    for i in range(14):
        a0, a1 = 2 * math.pi * i / 14, 2 * math.pi * (i + 1) / 14
        for r0, r1 in ((0, 7), (7, 13)):
            dz0, dz1 = -0.06 * r0 * r0, -0.06 * r1 * r1
            dish.face([(r0 * math.cos(a0), r0 * math.sin(a0), -dz0), (r1 * math.cos(a0), r1 * math.sin(a0), -dz1),
                       (r1 * math.cos(a1), r1 * math.sin(a1), -dz1), (r0 * math.cos(a1), r0 * math.sin(a1), -dz0)],
                      hls(0.12, 0.08, 0.8), np.array([0, 0, -20]))
    bar(dish, (0, 0, 0), (0, 0, 12), 0.8, steel)
    tilt = 0.9 if state == 2 else 1.5
    turn = 0.4 if state == 2 else -0.6

    def aim(p):
        # Turn the dish's axis from straight up towards the south-west, then lift it onto the platform.
        x, y, z = p
        y, z = y * math.cos(tilt) + z * math.sin(tilt), -y * math.sin(tilt) + z * math.cos(tilt)
        x, y = x * math.cos(turn) - y * math.sin(turn), x * math.sin(turn) + y * math.cos(turn)
        return np.array([x, y, z + hgt + 12])
    m.add(transformed(dish, aim))
    bar(m, (0, 0, hgt + 2), (0, 0, hgt + 12), 2, STEEL(rng))
    cylinder(m, (0, 0), 1.2, hgt + 12, hgt + 26, lambda r: hls(0.0, 0.7, 0.5), rng, sides=6)
    return m


@structure('radarMast', [2, 1, 0], foot='hull', hp=300)
def radar_mast(state: int) -> dict:
    rng = random.Random(231)
    m = PMesh()
    # A small concrete pad and an equipment hut at the foot.
    m.box(0, 0, 1, 34, 34, 2, 0, hls(0.1, 0.05, 0.6))
    if state == 0:
        mast = mast_mesh(1, rng)
        th = math.radians(84)

        def fall(p):
            x, z = p[0] - 11, p[2]
            return np.array([11 + x * math.cos(th) + z * math.sin(th), p[1] * 1.0 + 0.05 * z, max(0.6, -x * math.sin(th) + z * math.cos(th) + 2)])
        m.add(transformed(mast, fall))
        rubble(m, 4, 4, 14, 10, 20, rng, STEEL, 3)
    else:
        m.add(mast_mesh(state, rng))
    hut = PMesh()
    blocks(hut, (-30, 20), (-14, 20), 2, lambda s: 14, rng, CORRUGATED, bl=3, ch=14, solid=True)
    hut.box(-22, 14, 7, 16, 12, 14, 0, CORRUGATED(rng))
    panel(hut, (-22, 20), 6, 0, 11, DOOR(rng), out=1.2)
    hut.box(-22, 14, 14.8, 18, 14, 1.6, 0, RUST(rng))
    m.add(hut)
    m.solid_poly([(-12, -12), (12, -12), (12, 12), (-12, 12)])
    m.solid_poly([(-30, 8), (-14, 8), (-14, 21), (-30, 21)])
    return {'body': m}


# --- the bridge: its deck is ground, its rails are structures ----------------------------------------------------------

BRIDGE = {'l': 240.0, 'w': 100.0}


@structure('bridgeDeck', [1], foot='hull', hp=0)
def bridge_deck(state: int) -> dict:
    """Ground, drawn under everything: planks across a timber deck, its south edge and two stone piers below."""
    m = PMesh()
    rng = random.Random(241)
    l, w = BRIDGE['l'], BRIDGE['w']
    x = -l / 2
    while x < l / 2:
        m.box(x + 2, 0, -1.2, 3.6, w, 2.4, 0, PLANK(rng))
        x += 4
    for y in (-w / 2 + 3, w / 2 - 3, -6, 6):
        m.box(0, y, -3.6, l, 3, 2.4, 0, TIMBER(rng))
    for x in (-l / 2 + 40, l / 2 - 40):
        blocks(m, (x - 10, w / 2 + 1), (x + 10, w / 2 + 1), 6, lambda s: 0.0, rng, STONE, bl=5, ch=3, solid=False, z_base=-14)
    return {'body': m}


def rail(state: int, side: int) -> dict:
    m = PMesh()
    rng = random.Random(251 + side + state)
    l, w = BRIDGE['l'], BRIDGE['w']
    y = side * (w / 2 - 1.5)
    for i, x in enumerate(np.arange(-l / 2, l / 2 + 0.1, 20)):
        if state or not (-30 < x < 30):
            m.box(x, y, 7, 3, 3, 14, 0, TIMBER(rng))
        elif state == 0 and i % 2:
            m.box(x, y, 2.5, 3, 3, 5, 0, SOOT(rng))
    for z in (6.0, 13.0):
        if state:
            m.box(0, y, z, l, 2, 2.2, 0, PLANK(rng))
        else:
            for x0, x1 in ((-l / 2, -34), (34, l / 2)):
                m.box((x0 + x1) / 2, y, z, x1 - x0, 2, 2.2, 0, PLANK(rng))
            m.box(-24, y + side * 4, 1.5, 18, 2, 2, 0.5 * side, SOOT(rng), (0.3, 0))
    m.solid_poly([(-l / 2, y - 1.5), (l / 2, y - 1.5), (l / 2, y + 1.5), (-l / 2, y + 1.5)])
    return {'body': m}


structure('bridgeRailN', [1, 0], foot='runs', hp=120)(lambda s: rail(s, -1))
structure('bridgeRailS', [1, 0], foot='runs', hp=120)(lambda s: rail(s, 1))


def turned(fn, *args) -> dict:
    """A bridge piece turned a quarter turn, for a bridge that runs north-south."""
    return {k: rotate(m, math.pi / 2) for k, m in fn(*args).items()}


structure('bridgeDeckV', [1], foot='hull', hp=0)(lambda s: turned(bridge_deck, s))
structure('bridgeRailE', [1, 0], foot='runs', hp=120)(lambda s: turned(rail, s, -1))
structure('bridgeRailW', [1, 0], foot='runs', hp=120)(lambda s: turned(rail, s, 1))


# --- the cage: a captured crew's, iron bars on a plank floor; the front bars sort over the crew inside ------------------------

CAGE = {'s': 56.0, 'h': 34.0}


@structure('cage', [1, 0], foot='hull', hp=60)
def cage(state: int) -> dict:
    body, front = PMesh(), PMesh()
    rng = random.Random(281 + state)
    s, h = CAGE['s'], CAGE['h']
    a = s / 2
    iron = tone(0.6, 0.12, 0.22, 0.01, 0.03)
    for i in range(7):
        body.box(0, -a + 4 + i * (s - 8) / 6, 1.2, s - 2, 6, 2.4, 0, PLANK(rng))
    for x, y in ((-a + 1.5, -a + 1.5), (a - 1.5, -a + 1.5), (-a + 1.5, a - 1.5), (a - 1.5, a - 1.5)):
        (front if y > 0 else body).box(x, y, h / 2, 3.6, 3.6, h, 0, TIMBER(rng))
    if state:
        for side_y, mesh in ((-a + 1.5, body), (a - 1.5, front)):
            for z in (h - 1.5, 4):
                mesh.box(0, side_y, z, s, 3, 3, 0, TIMBER(rng))
            for x in np.arange(-a + 8, a - 4, 6.5):
                mesh.box(x, side_y, h / 2, 1.4, 1.4, h - 4, 0, iron(rng))
        for side_x in (-a + 1.5, a - 1.5):
            body.box(side_x, 0, h - 1.5, 3, s, 3, 0, TIMBER(rng))
            for y in np.arange(-a + 8, a - 4, 6.5):
                body.box(side_x, y, h / 2, 1.4, 1.4, h - 4, 0, iron(rng))
        front.box(0, a - 1.5, 17, 12, 1.2, 22, 0, SOOT(rng))
    else:
        for x in (-a + 8, -a + 14.5, a - 8):
            body.box(x, -a + 1.5, 7 + 5 * (x % 3), 1.4, 1.4, 12 + 5 * (x % 3), 0.1, iron(rng))
        body.box(0, -a + 1.5, h - 5, s * 0.55, 3, 3, 0.18, TIMBER(rng))
        body.box(-a + 1.5, -6, 9, 3, 22, 3, 0, TIMBER(rng))
        for k in range(5):
            body.box(rng.uniform(-a, a), rng.uniform(-a + 8, a + 6), 1.2, 1.4, 12 + 4 * k, 1.4, rng.uniform(0, 3), iron(rng))
        front.box(-a + 10, a + 2, 1.5, 26, 3, 3, 0.25, TIMBER(rng))
        front.box(a - 12, a - 4, 1.5, 14, 3, 3, -0.2, SOOT(rng))
    body.solid_poly([(-a, -a), (a, -a), (a, a), (-a, a)])
    return {'body': body, 'front': front}


# --- rail track and a wagon ----------------------------------------------------------------------------------------------

def track(vertical: bool) -> dict:
    m = PMesh()
    rng = random.Random(261)
    l = 64.0
    ballast = tone(0.1, 0.06, 0.45, 0.03, 0.08)
    for k in range(40):
        s, o = rng.uniform(-l / 2, l / 2), rng.uniform(-14, 14)
        x, y = (o, s) if vertical else (s, o)
        m.box(x, y, 0.3, 3, 2.4, 0.8, rng.uniform(0, 3), ballast(rng))
    for s in np.arange(-l / 2 + 4, l / 2, 8):
        x, y = (0, s) if vertical else (s, 0)
        m.box(x, y, 0.8, 22 if vertical else 4, 4 if vertical else 22, 1.4, 0, TIMBER(rng))
    for o in (-7, 7):
        if vertical:
            m.box(o, 0, 2.2, 1.6, l, 1.6, 0, STEEL(rng))
        else:
            m.box(0, o, 2.2, l, 1.6, 1.6, 0, STEEL(rng))
    return {'body': m}


structure('railH', [1], foot='runs', hp=0)(lambda s: track(False))
structure('railV', [1], foot='runs', hp=0)(lambda s: track(True))


@structure('wagon', [1, 0], foot='hull', hp=260)
def wagon(state: int) -> dict:
    m = PMesh()
    rng = random.Random(271)
    l, w, h = 84.0, 24.0, 28.0
    for x in (-l / 2 + 12, l / 2 - 12):
        for y in (-7, 7):
            cylinder(m, (x - 5, y), 4, 0, 1.6, STEEL, rng)
            cylinder(m, (x + 5, y), 4, 0, 1.6, STEEL, rng)
        m.box(x, 0, 4, 18, 18, 3, 0, SOOT(rng))
    m.box(0, 0, 6.5, l, w, 2, 0, TIMBER(rng))
    top = (lambda s: h) if state else ragged(h, 3, 0.2)
    wood = tone(0.03, 0.45, 0.32, 0.01, 0.04) if state else SOOT
    boards(m, (-l / 2, w / 2), (l / 2, w / 2), 2, lambda s: top(s, l) if not state else h, rng, wood, bw=4.5, holes=[(30, 54, 0, 8)], solid=False)
    boards(m, (-l / 2, -w / 2), (l / 2, -w / 2), 2, lambda s: (top(s, l) if not state else h), rng, wood, bw=4.5, holes=[(0, 84, 0, 8)], solid=False)
    if state:
        for x in (-l / 2 + 1, l / 2 - 1, -12, 12):
            panel(m, (x, w / 2), 2.4, 8, h, STEEL(rng), out=1.2)
        panel(m, (0, w / 2), 22, 8, h - 1, tone(0.03, 0.4, 0.28, 0.005, 0.02)(rng), out=1.4)
        for i in range(8):
            panel(m, (-10 + i * 20 / 7, w / 2), 2.4, 8 + i * 2.6, 9.5 + i * 2.6, WHITE(rng), out=1.8)
            panel(m, (10 - i * 20 / 7, w / 2), 2.4, 8 + i * 2.6, 9.5 + i * 2.6, WHITE(rng), out=1.8)
        for k in range(12):
            x0 = -l / 2 - 1 + k * (l + 2) / 12
            m.face([(x0, w / 2 + 2, h), (x0 + (l + 2) / 12, w / 2 + 2, h), (x0 + (l + 2) / 12, 0, h + 5), (x0, 0, h + 5)], RUST(rng), np.array([0, 0, h - 4]))
            m.face([(x0, 0, h + 5), (x0 + (l + 2) / 12, 0, h + 5), (x0 + (l + 2) / 12, -w / 2 - 2, h), (x0, -w / 2 - 2, h)], RUST(rng), np.array([0, 0, h - 4]))
    else:
        rubble(m, 8, w / 2 + 6, 16, 4, 14, rng, SOOT, 4)
        m.box(0, 0, 7.8, l - 4, w - 4, 0.6, 0, SOOT(rng))
    m.solid_poly([(-l / 2, -w / 2), (l / 2, -w / 2), (l / 2, w / 2), (-l / 2, w / 2)])
    return {'body': m}


# --- the airfield hangar: an arched shed tanks drive into from the south --------------------------------------------------

HANGAR = {'w': 168.0, 'd': 140.0, 'rz': 58.0, 'door': 112.0, 'door_h': 40.0}


def arch_z(x: float) -> float:
    rx = HANGAR['w'] / 2
    return HANGAR['rz'] * math.sqrt(max(0.0, 1 - (x / rx) ** 2))


@structure('hangar', [2, 1, 0], foot='runs', hp=800)
def hangar(state: int) -> dict:
    rng = random.Random(281)
    back, front, roof = PMesh(), PMesh(), PMesh()
    w, d = HANGAR['w'], HANGAR['d']
    rx = w / 2
    y0, y1 = -d / 2, d / 2
    keep = {2: lambda a, y: True,
            1: lambda a, y: math.hypot((a - 1.0) * 40, y - 20) > 16 and math.hypot((a - 2.2) * 40, y + 30) > 12,
            0: lambda a, y: a < 0.9 + 0.3 * math.sin(y * 0.08) or (a > 2.6 and y < -20)}[state]
    n = 28
    for i in range(n):
        a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
        x0, x1 = -rx * math.cos(a0), -rx * math.cos(a1)
        z0, z1 = HANGAR['rz'] * math.sin(a0), HANGAR['rz'] * math.sin(a1)
        for y in np.arange(y0 - 2, y1 + 2, 8):
            if keep((a0 + a1) / 2, y + 4):
                col = RUST(rng) if rng.random() < 0.08 else CORRUGATED(rng)
                dz = 0.5 if i % 2 else 0
                roof.face([(x0, y, z0 + dz), (x1, y, z1 + dz), (x1, y + 8, z1 + dz), (x0, y + 8, z0 + dz)], col, np.array([0, y + 4, 0]))
        if state < 2 or i % 4 == 0:
            for yy in np.arange(y0, y1 + 0.1, 20 if state else 28):
                if state == 0 and not keep((a0 + a1) / 2, yy) and i % 3:
                    continue
                bar(roof, (x0, yy, z0 - 0.6), (x1, yy, z1 - 0.6), 1.4, STEEL(rng))
    # The north end wall, closing the arch; the south end, with its big doorway; the sliding doors stand open to the sides.
    end = lambda s: arch_z(s - rx) - 1  # noqa: E731
    tn = end if state else (lambda s: end(s) * (0.4 + 0.3 * math.sin(s * 0.07)))
    boards(back, (-rx + 1, y0), (rx - 1, y0), 2.4, tn, rng, CORRUGATED, bw=5)
    for x in (-rx + 2, rx - 2):
        back.solid_poly([(x - 2, y0), (x + 2, y0), (x + 2, y1), (x - 2, y1)])
    back.floor(0, 0, 0.5, w - 6, d - 4, 0.8, 0, tone(0.1, 0.04, 0.5, 0.01, 0.03)(rng))
    for k, (cx, cy) in enumerate(((-50, -50), (-36, -50), (-50, -38), (56, -48))):
        if state or k < 2:
            back.box(cx, cy, 6, 12, 10, 12, 0, OLIVE(rng))
    door_half = HANGAR['door'] / 2
    ts = (lambda s: end(s)) if state else (lambda s: end(s) * (0.55 if s > rx else 1.0))
    boards(front, (-rx + 1, y1), (rx - 1, y1), 2.4, ts, rng, CORRUGATED, bw=5, holes=[(rx - door_half, rx + door_half, 0, HANGAR['door_h'])])
    if state:
        for side in (-1, 1):
            if state == 1 and side > 0:
                continue
            c = side * (door_half + 14)
            panel(front, (c, y1), 28, 0.5, HANGAR['door_h'], tone(0.3, 0.08, 0.5, 0.01, 0.03)(rng), out=3, d=1.6)
            for z in (10, 20, 30):
                panel(front, (c, y1), 28, z - 0.6, z + 0.6, STEEL(rng), out=4)
        panel(front, (0, y1), HANGAR['door'] + 4, HANGAR['door_h'], HANGAR['door_h'] + 3, STEEL(rng), out=1.6)
        # A big painted number over the door.
        panel(front, (0, y1), 18, 44, 52, WHITE(rng), out=1.4)
    else:
        rubble(front, 40, y1 + 6, 22, 5, 30, random.Random(8), CORRUGATED, 6)
        rubble(back, 30, 0, 40, 40, 40, random.Random(9), CORRUGATED, 6)
    return {'body': back, 'front': front, 'roof': roof}


# --- the old fort: thick crenellated walls, a round corner tower, a gatehouse --------------------------------------------

FORT = {'t': 14.0, 'h': 30.0}


def merlons(m: PMesh, a: tuple, b: tuple, t: float, z: float, rng: random.Random, keep=lambda s: True) -> None:
    ax, ay = a
    bx, by = b
    length = math.hypot(bx - ax, by - ay)
    ang = math.atan2(by - ay, bx - ax)
    ux, uy = (bx - ax) / length, (by - ay) / length
    nx, ny = -uy, ux
    s = 4.0
    while s < length - 2:
        if keep(s):
            # On the outer (south or east) edge of the walk.
            m.box(ax + ux * s + nx * (t / 2 - 2.5), ay + uy * s + ny * (t / 2 - 2.5), z + 4, 7, 5, 8, ang, FORTSTONE(rng))
        s += 12


def fort_wall(state: int, vertical: bool) -> dict:
    m = PMesh()
    rng = random.Random(291 + state)
    l, t, h = 64.0, FORT['t'], FORT['h']
    a, b = ((0, -l / 2), (0, l / 2)) if vertical else ((-l / 2, 0), (l / 2, 0))
    if state == 2:
        top, gone = (lambda s: h), None
    elif state == 1:
        top = lambda s: h - (8 if 34 < s < 52 else 0)  # noqa: E731
        gone = lambda c, s, z: abs(s - 22 - (z - 14) * 0.5) < 3 and 4 < z < 24  # noqa: E731
    else:
        top = lambda s: 0 if abs(s - 32) < 15 + 3 * math.sin(s * 0.7) else h * (0.55 + 0.25 * math.cos(s * 0.3))  # noqa: E731
        gone = None
    blocks(m, a, b, t, top, rng, FORTSTONE, bl=9, ch=5, gone=gone)
    if state:
        merlons(m, a, b, t, h, rng, keep=(lambda s: True) if state == 2 else (lambda s: not 30 < s < 56))
    if state < 2:
        if vertical:
            rubble(m, 10, 6, 5, 18, 12 if state else 40, random.Random(4), FORTSTONE, 6)
        else:
            rubble(m, 6 if state else 0, 10, 18, 5, 12 if state else 40, random.Random(4), FORTSTONE, 6)
    return {'body': m}


structure('fortWallH', [2, 1, 0], foot='runs', hp=500)(lambda s: fort_wall(s, False))
structure('fortWallV', [2, 1, 0], foot='runs', hp=500)(lambda s: fort_wall(s, True))


@structure('fortTower', [1, 0], foot='hull', hp=700)
def fort_tower(state: int) -> dict:
    """A round corner tower, squashed north to south as the castle's ROUND, so its top doesn't look like a plate."""
    m = PMesh()
    rng = random.Random(301)
    r, h = 22.0, 44.0 if state else 20.0
    sides = 20
    for course, z in enumerate(np.arange(0, h, 5)):
        for i in range(sides):
            a0, a1 = 2 * math.pi * (i + 0.5 * (course % 2)) / sides, 2 * math.pi * (i + 1 + 0.5 * (course % 2)) / sides
            if state == 0 and z > 10 and math.sin(a0 * 2 + z) > 0.3:
                continue
            p0, p1 = (r * math.cos(a0), r * 0.8 * math.sin(a0)), (r * math.cos(a1), r * 0.8 * math.sin(a1))
            col = FORTSTONE(rng)
            m.face([(p0[0], p0[1], z), (p1[0], p1[1], z), (p1[0], p1[1], z + 4.6), (p0[0], p0[1], z + 4.6)], col, np.array([0, 0, z + 2]))
    m.face([(r * math.cos(2 * math.pi * i / sides), r * 0.8 * math.sin(2 * math.pi * i / sides), h - 0.4) for i in range(sides)], hls(0.1, 0.1, 0.45), np.array([0, 0, 0]))
    if state:
        for i in range(0, sides, 2):
            a = 2 * math.pi * (i + 0.5) / sides
            m.box((r - 2.5) * math.cos(a), (r - 2.5) * 0.8 * math.sin(a), h + 4, 6, 4, 8, a + math.pi / 2, FORTSTONE(rng))
        for a in (2.2, 1.3):
            panel(m, ((r - 0.5) * math.cos(a), (r - 0.5) * 0.8 * math.sin(a)), 2.4, 22, 30, hls(0.1, 0.2, 0.12), out=0.3, ang=a - math.pi / 2)
    else:
        rubble(m, 10, 14, 24, 8, 50, rng, FORTSTONE, 6)
    m.solid_poly([(r * math.cos(2 * math.pi * i / 12), r * 0.8 * math.sin(2 * math.pi * i / 12)) for i in range(12)])
    return {'body': m}


@structure('fortGate', [1, 0], foot='runs', hp=900)
def fort_gate(state: int) -> dict:
    """In an east-west wall: two square towers either side of an arched passage a heavy tank drives through (64 px), once
    the doors are down."""
    m = PMesh()
    rng = random.Random(311)
    t, h = FORT['t'] + 6, FORT['h'] + 14
    half, tw = 32.0, 26.0
    for cx in (-half - tw / 2, half + tw / 2):
        top = (lambda s: h) if state else ragged(h, 5 + int(cx), 0.3)
        blocks(m, (cx - tw / 2, 0), (cx + tw / 2, 0), t, (lambda s, top=top: top(s, tw) if not state else h), rng, FORTSTONE, bl=8, ch=5)
        if state:
            for k in range(3):
                m.box(cx - 9 + k * 9, t / 2 - 2.5, h + 4, 6, 5, 8, 0, FORTSTONE(rng))
            panel(m, (cx, t / 2), 3, 24, 34, hls(0.1, 0.2, 0.12), out=0.3)
    # The arch over the passage and its doors.
    if state:
        blocks(m, (-half, 0), (half, 0), t - 2, lambda s: FORT['h'], rng, FORTSTONE, bl=7, ch=4, holes=[(0, 2 * half, 0, 24)], solid=False)
        for k in range(16):
            panel(m, (-half + 2 + k * 4, t / 2 - 3), 3.8, 0, 24, DOOR(rng), out=0.0, d=2)
        for z in (5, 18):
            panel(m, (0, t / 2 - 2), 2 * half, z - 1, z + 1, STEEL(rng), out=0.6)
        m.solid_rect((-half, 0), (half, 0), 0, 2 * half, 4)
    else:
        for k in range(8):
            m.box(rng.uniform(-24, 24), t / 2 + rng.uniform(2, 12), 1, 4, 22, 1.6, rng.uniform(-0.6, 0.6), DOOR(rng))
        rubble(m, 0, t / 2 + 6, 26, 5, 24, rng, FORTSTONE, 5)
    return {'body': m}
