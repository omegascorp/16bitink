"""Looks at the parts by eye: every family's three tiers side by side, plus assembled tanks.

  python3 dev/pixel/parts/view.py <dir> <out.png> [zoom]     dir holds <family>-mk<N>.png (render or install)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
FAMILIES = ['hullLight', 'hullMedium', 'hullHeavy', 'driveWheels', 'driveHalftrack', 'driveTracks', 'turretMG', 'turretCannon', 'turretRocket']
RING = {'hullLight': (0, 2), 'hullMedium': (0, 2), 'hullHeavy': (0, 4)}
BUILDS = [('driveWheels', 'hullLight', 'turretMG'), ('driveHalftrack', 'hullMedium', 'turretCannon'), ('driveTracks', 'hullHeavy', 'turretRocket'),
          ('driveTracks', 'hullHeavy', 'turretCannon'), ('driveHalftrack', 'hullMedium', 'turretRocket'), ('driveWheels', 'hullLight', 'turretCannon')]
BG = (110, 112, 104, 255)
SIZE_OF = {'hullLight': 'L', 'hullMedium': 'M', 'hullHeavy': 'H'}
CELL = 96  # tight crop of the 128 frame: every part fits


def part(d: Path, key: str) -> Image.Image:
    return Image.open(d / f'{key}.png').convert('RGBA')


def tank(d: Path, drive: str, hull: str, gun: str, t: int) -> Image.Image:
    im = Image.new('RGBA', (128, 128))
    im.alpha_composite(part(d, f'{drive}-{SIZE_OF[hull]}-mk{t}'))
    im.alpha_composite(part(d, f'{hull}-mk{t}'))
    rx, ry = RING[hull]
    im.alpha_composite(part(d, f'{gun}-mk{t}'), (rx, ry))
    return im


def crop(im: Image.Image) -> Image.Image:
    o = (128 - CELL) // 2
    return im.crop((o, o, o + CELL, o + CELL))


def main() -> None:
    d, out = Path(sys.argv[1]), Path(sys.argv[2])
    z = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    cols = 9
    # Drives: one row per hull size, drives across at Mk I to III; then the assembled builds.
    rows = [[crop(part(d, f'{dr}-{s}-mk{t}')) for dr in FAMILIES[3:6] for t in (1, 2, 3)] for s in 'LMH']
    rows += [[crop(tank(d, *b, t)) for b in BUILDS for t in (1, 2, 3)][i * 9:(i + 1) * 9] for i in range(2)]
    sheet = Image.new('RGBA', (CELL * cols * z, CELL * len(rows) * z), BG)
    for r, row in enumerate(rows):
        for c, im in enumerate(row):
            sheet.alpha_composite(im.resize((CELL * z, CELL * z), Image.NEAREST), (c * CELL * z, r * CELL * z))
    sheet.save(out)
    print('saved', out, sheet.size)


if __name__ == '__main__':
    main()
