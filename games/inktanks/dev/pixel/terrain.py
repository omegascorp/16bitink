"""Lays the art test's ground from the three PixelLab Wang tilesets (grass/dirt, grass/sand, sand/water).

  python3 dev/pixel/terrain.py    ../art-test/assets/ground.png + terrain.json

The map is a grid of corners, each grass, dirt, sand or water; a cell picks the tile whose four corners match from the
set that joins its two terrains. Cells of one terrain take that terrain's full tile turned or flipped at random, so the
grid doesn't repeat at a glance. The layout (road, beach, pond) is drawn here; the art is PixelLab's.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
TILES = HERE / 'terrain'
ASSETS = HERE.parent / 'art-test' / 'assets'
T = 32
COLS, ROWS = 32, 18
GRASS, DIRT, SAND, WATER, DRY = 0, 1, 2, 3, 4
# Which set joins which pair: (lower, upper).
SETS = {'dirt': (DIRT, GRASS), 'sand': (SAND, GRASS), 'water': (WATER, SAND), 'dry': (DRY, GRASS)}
ROAD = [(-40, 300), (480, 300), (560, 260), (600, 180), (610, -40)]
ROAD_HALF = 30
BEACH = ((810, 470), (250, 150))
POND = ((900, 540), (150, 80))


def dist_to_road(x: float, y: float) -> float:
    best = 1e9
    for (ax, ay), (bx, by) in zip(ROAD, ROAD[1:]):
        dx, dy = bx - ax, by - ay
        t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
        best = min(best, math.hypot(x - ax - t * dx, y - ay - t * dy))
    return best


def inside(x: float, y: float, ell, wobble: float = 0.0) -> bool:
    (cx, cy), (rx, ry) = ell
    a = math.atan2(y - cy, x - cx)
    k = 1 + wobble * math.sin(a * 3 + 1.3) + wobble * 0.6 * math.sin(a * 5 + 0.4)
    return ((x - cx) / (rx * k)) ** 2 + ((y - cy) / (ry * k)) ** 2 < 1


def patchy(x: float, y: float) -> float:
    """Smooth noise from a few sines: where the dry patches lie."""
    return (math.sin(x * 0.011 + 1.7) * math.sin(y * 0.017 + 0.4) + 0.6 * math.sin(x * 0.023 - y * 0.019 + 2.2) + 0.35 * math.sin(x * 0.041 + y * 0.037)) / 1.6


def corners() -> np.ndarray:
    g = np.zeros((ROWS + 1, COLS + 1), int)
    for j in range(ROWS + 1):
        for i in range(COLS + 1):
            x, y = i * T, j * T
            if inside(x, y, POND, 0.12):
                g[j, i] = WATER
            elif inside(x, y, BEACH, 0.1):
                g[j, i] = SAND
            elif dist_to_road(x, y) < ROAD_HALF:
                g[j, i] = DIRT
            elif patchy(x, y) > 0.58:
                # Patches of dry, trampled grass break up the meadow so its tile doesn't repeat at a glance.
                g[j, i] = DRY
    # A cell may only join two terrains that have a set: water next to grass becomes sand, dirt next to sand grass.
    for _ in range(3):
        for j in range(ROWS):
            for i in range(COLS):
                cell = g[j:j + 2, i:i + 2]
                kinds = set(cell.ravel())
                if WATER in kinds and (GRASS in kinds or DIRT in kinds):
                    cell[(cell == GRASS) | (cell == DIRT)] = SAND
                if DIRT in kinds and SAND in kinds:
                    cell[cell == DIRT] = GRASS
                if DRY in kinds and kinds - {DRY, GRASS}:
                    cell[cell == DRY] = GRASS
    return g


def load_sets() -> dict:
    sets = {}
    for name in SETS:
        sheet = Image.open(TILES / f'{name}.png').convert('RGBA')
        meta = json.loads((TILES / f'{name}.json').read_text())
        by = {}
        for t in meta['tileset_data']['tiles']:
            c = t['corners']
            b = t['bounding_box']
            key = tuple(c[k] == 'upper' for k in ('NW', 'NE', 'SW', 'SE'))
            by[key] = sheet.crop((b['x'], b['y'], b['x'] + b['width'], b['y'] + b['height']))
        sets[name] = by
    return sets


def main() -> None:
    rng = random.Random(5)
    g = corners()
    sets = load_sets()
    full = {GRASS: sets['dirt'][(True,) * 4], DIRT: sets['dirt'][(False,) * 4], SAND: sets['sand'][(False,) * 4], WATER: sets['water'][(False,) * 4], DRY: sets['dry'][(False,) * 4]}
    ground = Image.new('RGBA', (COLS * T, ROWS * T))
    for j in range(ROWS):
        for i in range(COLS):
            c = (g[j, i], g[j, i + 1], g[j + 1, i], g[j + 1, i + 1])
            kinds = set(c)
            if len(kinds) == 1:
                tile = full[c[0]]
                # Grass has no grain, so it takes any of the eight turns and flips; ruts, ripples and waves keep theirs.
                if c[0] in (GRASS, DRY):
                    if rng.random() < 0.5:
                        tile = tile.transpose(Image.FLIP_LEFT_RIGHT)
                    tile = tile.rotate(90 * rng.randrange(4))
                elif c[0] in (SAND, WATER):
                    # Ripples and waves run across: mirrored either way they still do.
                    if rng.random() < 0.5:
                        tile = tile.transpose(Image.FLIP_LEFT_RIGHT)
                    if rng.random() < 0.5:
                        tile = tile.transpose(Image.FLIP_TOP_BOTTOM)
                elif rng.random() < 0.5:
                    # Ruts run diagonally: a half turn keeps them so.
                    tile = tile.rotate(180)
            else:
                name = next(n for n, (lo, up) in SETS.items() if kinds == {lo, up})
                up = SETS[name][1]
                tile = sets[name][tuple(k == up for k in c)]
            ground.alpha_composite(tile, (i * T, j * T))
    ASSETS.mkdir(parents=True, exist_ok=True)
    ground.save(ASSETS / 'ground.png')
    names = {GRASS: 'grass', DIRT: 'dirt', SAND: 'sand', WATER: 'water', DRY: 'grass'}
    (ASSETS / 'terrain.json').write_text(json.dumps({'tile': T, 'cols': COLS, 'rows': ROWS, 'kinds': names, 'corners': g.tolist()}))
    print('ground', ground.size)


if __name__ == '__main__':
    main()
