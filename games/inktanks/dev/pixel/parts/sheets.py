"""Packs the rendered parts onto 256 x 256 sheets for PixelLab edit_image, and cuts the painted sheets back.

  python3 dev/pixel/parts/sheets.py pack <set>        out/sheets/<set>.png + <set>.json
  python3 dev/pixel/parts/sheets.py cut <set> [run]   paint/<set>[-run].png -> out/painted/<key>.png, prints the worst match

As dev/pixel/frames.py (the detail test): a part keeps the model's outline and takes only colour from the painting.
One sheet holds one kind of part at all three tiers, so the tiers of a family are painted by one call with one seed.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
RENDER = HERE / 'out' / 'render'
SHEETS = HERE / 'out' / 'sheets'
PAINTED = HERE / 'out' / 'painted'
SIZE, GAP, DRIFT = 256, 12, 10
FAM = {'hulls': ['hullLight', 'hullMedium', 'hullHeavy'], 'drives': ['driveWheels', 'driveHalftrack', 'driveTracks'],
       'turrets': ['turretMG', 'turretCannon', 'turretRocket']}
SETS = {k: [f'{f}-mk{t}' for f in v for t in (1, 2, 3)] for k, v in FAM.items() if k != 'drives'}
# Drives are per hull size (27 of them): one sheet per drive family, and each drive packed as its two sides
# ('key|L', 'key|R'), since the space between them is empty and would waste most of a sheet.
for fam in FAM['drives']:
    SETS[fam] = [f'{fam}-{s}-mk{t}|{side}' for s in 'LMH' for t in (1, 2, 3) for side in 'LR']


def source(key: str) -> Image.Image:
    """A part's render; a side piece keeps only its half of the frame."""
    name, _, side = key.partition('|')
    im = Image.open(RENDER / f'{name}.png').convert('RGBA')
    if side:
        a = np.array(im)
        a[:, 64:] = 0 if side == 'L' else a[:, 64:]
        a[:, :64] = 0 if side == 'R' else a[:, :64]
        im = Image.fromarray(a)
    return im


def pack(name: str) -> None:
    SHEETS.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGBA', (SIZE, SIZE))
    items = []
    for key in SETS[name]:
        im = source(key)
        items.append((key, im, im.getbbox()))
    items.sort(key=lambda t: -(t[2][3] - t[2][1]))
    x = y = GAP
    row = 0
    place = {}
    for key, im, (bx0, by0, bx1, by1) in items:
        w, h = bx1 - bx0, by1 - by0
        if x + w + GAP > SIZE:
            x, y, row = GAP, y + row + GAP, 0
        if y + h + GAP > SIZE:
            raise SystemExit(f'{name}: {key} does not fit')
        sheet.alpha_composite(im.crop((bx0, by0, bx1, by1)), (x, y))
        place[key] = {'x': x - bx0, 'y': y - by0}
        x += w + GAP
        row = max(row, h)
    sheet.save(SHEETS / f'{name}.png')
    (SHEETS / f'{name}.json').write_text(json.dumps(place, indent=1))
    print(name, len(place), 'parts, rows down to', y + row)


def cut(name: str, run: str = '') -> None:
    place = json.loads((SHEETS / f'{name}.json').read_text())
    art = np.array(Image.open(HERE / 'paint' / f'{name}{"-" + run if run else ""}.png').convert('RGBA'))
    PAINTED.mkdir(parents=True, exist_ok=True)
    worst = (1.0, '')
    whole_of = {}
    for key, p in place.items():
        full = source(key)
        bx0, by0, bx1, by1 = full.getbbox()
        src = np.array(full.crop((bx0, by0, bx1, by1)))
        w, h = bx1 - bx0, by1 - by0
        mask = src[..., 3] > 0
        best = (-1.0, 0, 0)
        for dy in range(-DRIFT, DRIFT + 1):
            for dx in range(-DRIFT, DRIFT + 1):
                x, y = p['x'] + bx0 + dx, p['y'] + by0 + dy
                if x < 0 or y < 0 or x + w > art.shape[1] or y + h > art.shape[0]:
                    continue
                on = art[y:y + h, x:x + w, 3] > 0
                score = (on & mask).sum() / max(1, (on | mask).sum())
                if score > best[0]:
                    best = (float(score), dx, dy)
        worst = min(worst, (best[0], key))
        x, y = p['x'] + bx0 + best[1], p['y'] + by0 + best[2]
        piece = art[y:y + h, x:x + w]
        rgb = np.where(piece[..., 3:] > 0, piece[..., :3], src[..., :3])
        whole = np.zeros((full.height, full.width, 4), np.uint8)
        whole[by0:by1, bx0:bx1] = np.dstack([rgb, src[..., 3]])
        part = key.partition('|')[0]
        if part in whole_of:
            whole = np.where(whole[..., 3:] > 0, whole, whole_of[part])
        whole_of[part] = whole
        Image.fromarray(whole).save(PAINTED / f'{part}{"-" + run if run else ""}.png')
        print(f'  {key:20s} match {best[0]:.3f} shift {best[1]:+d},{best[2]:+d}')
    print(name, 'cut; worst match', round(worst[0], 3), worst[1])


if __name__ == '__main__':
    {'pack': pack, 'cut': cut}[sys.argv[1]](*sys.argv[2:])
