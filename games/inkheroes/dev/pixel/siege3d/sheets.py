"""Packs a castle's rendered parts onto 512 x 512 sheets for PixelLab, and cuts the painted sheets back up.

  python3 dev/pixel/siege3d/sheets.py pack greek                  out/greek/sheet-N.png + sheets.json
  python3 dev/pixel/siege3d/sheets.py pack greek gateLink nearWall  only these parts, on sheets of their own, the rest kept
  python3 dev/pixel/siege3d/sheets.py cut greek                   paint/greek/sheet-N.png -> out/greek/painted/<piece>.png

PixelLab repaints up to 512 x 512 and drifts by a few pixels, so each piece is found again on its sheet by its own
outline, and its shape stays the 3D model's: the painting only ever gives it colour. Details: docs/inkheroes-castles.md.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
SHEET = 512
GAP = 10
# How far a piece may have drifted on its sheet, either way.
DRIFT = 26


def pack(castle: str, *parts: str) -> None:
    out = HERE / 'out' / castle
    pieces = json.loads((out / 'pieces.json').read_text())
    chosen = [k for k in pieces if not parts or k.rsplit('-', 1)[0] in parts]
    kept = {k: p for k, p in json.loads((out / 'sheets.json').read_text()).items() if k not in chosen} if parts else {}
    first = 1 + max((p['sheet'] for p in kept.values()), default=-1)
    items = []
    for key in chosen:
        at = pieces[key]
        im = Image.open(out / f'{key}.png').convert('RGBA')
        box = im.getbbox()
        items.append((key, im.crop(box), at['x'] + box[0], at['y'] + box[1]))
    items.sort(key=lambda t: (-t[1].height, -t[1].width))
    sheets: list[dict] = []
    place: dict = dict(kept)
    for key, im, wx, wy in items:
        for n, sh in enumerate(sheets):
            spot = fit(sh['used'], im.width, im.height)
            if spot:
                break
        else:
            n = len(sheets)
            sheets.append({'im': Image.new('RGBA', (SHEET, SHEET), (0, 0, 0, 0)), 'used': np.zeros((SHEET, SHEET), bool)})
            spot = fit(sheets[n]['used'], im.width, im.height)
        x, y = spot
        sheets[n]['im'].alpha_composite(im, (x, y))
        sheets[n]['used'][max(0, y - GAP):y + im.height + GAP, max(0, x - GAP):x + im.width + GAP] = True
        place[key] = {'sheet': first + n, 'x': x, 'y': y, 'w': im.width, 'h': im.height, 'wx': wx, 'wy': wy}
    for n, sh in enumerate(sheets):
        sh['im'].save(out / f'sheet-{first + n}.png')
    (out / 'sheets.json').write_text(json.dumps(place, indent=1))
    print(len(items), 'pieces on', len(sheets), 'sheets')


def fit(used: np.ndarray, w: int, h: int):
    """The first free spot for a w x h piece, scanning rows, or None."""
    for y in range(GAP, SHEET - h - GAP + 1, 6):
        for x in range(GAP, SHEET - w - GAP + 1, 6):
            if not used[y:y + h, x:x + w].any():
                return x, y
    return None


def cut(castle: str) -> None:
    out = HERE / 'out' / castle
    paint = HERE / 'paint' / castle
    place = json.loads((out / 'sheets.json').read_text())
    painted = {}
    done = out / 'painted'
    done.mkdir(exist_ok=True)
    worst = 1.0
    for key, p in place.items():
        n = p['sheet']
        art = painted.setdefault(n, np.array(Image.open(paint / f'sheet-{n}.png').convert('RGBA')))
        im = Image.open(out / f'{key}.png').convert('RGBA')
        src = np.array(im.crop(im.getbbox()))
        mask = src[..., 3] > 0
        best = (-1.0, 0, 0)
        for dy in range(-DRIFT, DRIFT + 1, 2):
            for dx in range(-DRIFT, DRIFT + 1, 2):
                x, y = p['x'] + dx, p['y'] + dy
                if x < 0 or y < 0 or x + p['w'] > SHEET or y + p['h'] > SHEET:
                    continue
                on = art[y:y + p['h'], x:x + p['w'], 3] > 0
                score = (on & mask).sum() / max(1, (on | mask).sum())
                if score > best[0]:
                    best = (float(score), dx, dy)
        worst = min(worst, best[0])
        x, y = p['x'] + best[1], p['y'] + best[2]
        cutout = art[y:y + p['h'], x:x + p['w']]
        # The model's shape, the painting's colour; a spot the painting left empty keeps the model's own colour.
        rgb = np.where(cutout[..., 3:] > 0, cutout[..., :3], src[..., :3])
        Image.fromarray(np.dstack([rgb, src[..., 3]]).astype(np.uint8)).save(done / f'{key}.png')
    print(len(place), 'pieces cut; worst match', round(worst, 3))


if __name__ == '__main__':
    {'pack': pack, 'cut': cut}[sys.argv[1]](*sys.argv[2:])
