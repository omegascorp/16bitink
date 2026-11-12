"""Puts rendered parts into the equal frames PixelLab edit_image paints together, and cuts the painted frames back.

  python3 dev/pixel/frames.py pack <set>   out/frames/<set>/NN.png (+ frames.json)
  python3 dev/pixel/frames.py cut <set>    paint/<set>/NN.png -> out/painted/<key>.png, prints the worst match

One edit_image call paints up to 16 frames of 64 x 64 (4 of 128 x 128) with the same prompt and seed, which is the
castle's "one seed for every sheet" in a cheaper form. As in the castle's sheets.py, a painted part keeps the model's
outline and takes only colour from the painting (docs/inkheroes-castles.md).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
DRIFT = 26

SETS = {
    'tanks': {'size': 64, 'src': 'parts', 'keys': ['hullLight', 'hullMedium', 'hullHeavy', 'driveWheels', 'driveHalftrack', 'driveTracks',
                                                    'turretMG', 'turretCannon', 'turretRocket', 'turretCannon3', 'shotBullet', 'shotShell', 'shotRocket', 'crate']},
    'props': {'size': 64, 'src': 'structures', 'keys': ['wall-2', 'wall-1', 'wall-0', 'oakTrunk', 'oakCanopy', 'pineTrunk', 'pineCanopy',
                                                         'rockA', 'rockB', 'rockC', 'corner']},
    'house': {'size': 128, 'src': 'structures', 'keys': ['houseBack', 'houseFront', 'houseRoof']},
}
# The detail test's sheets: one 256 x 256 sheet per batch, parts of one kind, keyed '<density>:<part>'.
HULLS = ['hullLight', 'hullMedium', 'hullHeavy', 'driveWheels', 'driveHalftrack', 'driveTracks']
TURRETS = ['turretMG', 'turretCannon', 'turretRocket', 'turretCannon3']
SETS['hullsB'] = {'sheet': 256, 'keys': [f'B:{k}' for k in HULLS]}
SETS['hullsC'] = {'sheet': 256, 'keys': [f'C:{k}' for k in HULLS]}
SETS['turrets'] = {'sheet': 256, 'keys': [f'{d}:{k}' for d in 'CBA' for k in TURRETS]}
SHEET_GAP = 12


def source(st: dict, key: str) -> Path:
    if ':' in key:
        d, k = key.split(':')
        return HERE / 'out' / f'parts-{d}' / f'{k}.png'
    return HERE / 'out' / st['src'] / f'{key}.png'


def pack_sheet(name: str) -> None:
    """Shelf-packs the parts' outlines onto one sheet; a part's entry is where its whole canvas would sit."""
    st = SETS[name]
    out = HERE / 'out' / 'frames' / name
    out.mkdir(parents=True, exist_ok=True)
    size = st['sheet']
    sheet = Image.new('RGBA', (size, size))
    items = []
    for key in st['keys']:
        im = Image.open(source(st, key)).convert('RGBA')
        items.append((key, im, im.getbbox()))
    items.sort(key=lambda t: -(t[2][3] - t[2][1]))
    x = y = SHEET_GAP
    row = 0
    place = {}
    for key, im, (bx0, by0, bx1, by1) in items:
        w, h = bx1 - bx0, by1 - by0
        if x + w + SHEET_GAP > size:
            x, y = SHEET_GAP, y + row + SHEET_GAP
            row = 0
        if y + h + SHEET_GAP > size:
            raise SystemExit(f'{name}: {key} does not fit')
        sheet.alpha_composite(im.crop((bx0, by0, bx1, by1)), (x, y))
        place[key] = {'frame': 0, 'x': x - bx0, 'y': y - by0, 'w': im.width, 'h': im.height}
        x += w + SHEET_GAP
        row = max(row, h)
    sheet.save(out / '00.png')
    (out / 'frames.json').write_text(json.dumps(place, indent=1))
    print(len(place), 'parts on one', size, 'sheet, rows down to', y + row)



def pack(name: str) -> None:
    st = SETS[name]
    if 'sheet' in st:
        return pack_sheet(name)
    out = HERE / 'out' / 'frames' / name
    out.mkdir(parents=True, exist_ok=True)
    place = {}
    for n, key in enumerate(st['keys']):
        im = Image.open(HERE / 'out' / st['src'] / f'{key}.png').convert('RGBA')
        frame = Image.new('RGBA', (st['size'], st['size']))
        x, y = (st['size'] - im.width) // 2, (st['size'] - im.height) // 2
        frame.alpha_composite(im, (x, y))
        frame.save(out / f'{n:02d}.png')
        place[key] = {'frame': n, 'x': x, 'y': y, 'w': im.width, 'h': im.height}
    (out / 'frames.json').write_text(json.dumps(place, indent=1))
    print(len(place), 'frames of', st['size'])


def cut(name: str, *fixed: str) -> None:
    """`fixed` pins a part's shift (key=dx,dy), for a model changed after painting so its outline no longer finds the painting."""
    pins = {k: tuple(int(v) for v in s.split(',')) for k, s in (f.split('=') for f in fixed)}
    st = SETS[name]
    place = json.loads((HERE / 'out' / 'frames' / name / 'frames.json').read_text())
    done = HERE / 'out' / 'painted'
    done.mkdir(parents=True, exist_ok=True)
    worst = (1.0, '')
    for key, p in place.items():
        art = np.array(Image.open(HERE / 'paint' / name / f'{p["frame"]:02d}.png').convert('RGBA'))
        full = Image.open(source(st, key)).convert('RGBA')
        # Match on the part's own outline, so a part rendered on a whole frame (the tank parts) can still be found where it drifted.
        if full.getbbox() is None:
            print(f'  {key:16s} empty render, skipped')
            continue
        bx0, by0, bx1, by1 = full.getbbox()
        src = np.array(full.crop((bx0, by0, bx1, by1)))
        w, h = bx1 - bx0, by1 - by0
        mask = src[..., 3] > 0
        best = (-1.0, 0, 0)
        drift = 10 if 'sheet' in st else DRIFT
        for dy in range(-drift, drift + 1):
            for dx in range(-drift, drift + 1):
                if key in pins and (dx, dy) != pins[key]:
                    continue
                x, y = p['x'] + bx0 + dx, p['y'] + by0 + dy
                if x < 0 or y < 0 or x + w > art.shape[1] or y + h > art.shape[0]:
                    continue
                on = art[y:y + h, x:x + w, 3] > 0
                score = (on & mask).sum() / max(1, (on | mask).sum())
                if score > best[0]:
                    best = (float(score), dx, dy)
        if best[0] < worst[0]:
            worst = (best[0], key)
        x, y = p['x'] + bx0 + best[1], p['y'] + by0 + best[2]
        piece = art[y:y + h, x:x + w]
        rgb = np.where(piece[..., 3:] > 0, piece[..., :3], src[..., :3])
        whole = np.zeros((full.height, full.width, 4), np.uint8)
        whole[by0:by1, bx0:bx1] = np.dstack([rgb, src[..., 3]])
        dest = done / key.replace(':', '/')
        dest.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(whole).save(dest.with_suffix('.png') if ':' in key else done / f'{key}.png')
        print(f'  {key:16s} match {best[0]:.3f} shift {best[1]:+d},{best[2]:+d}')
    print(len(place), 'cut; worst match', round(worst[0], 3), worst[1])


if __name__ == '__main__':
    {'pack': pack, 'cut': cut}[sys.argv[1]](*sys.argv[2:])
