"""Packs rendered structure pieces onto 512 x 512 sheets for PixelLab, and cuts the painted sheets back.

  python3 dev/pixel/world/sheets.py pack <set> [name ...]   out/sheets/<set>/sheet-N.png + place.json
  python3 dev/pixel/world/sheets.py cut <set>               paint/<set>/sheet-N.png -> out/painted/<name>/<key>.png

As the castle's sheets.py (docs/inkheroes-castles.md): a piece keeps the model's outline and takes only colour from the
painting. A damaged state's pixels that the model leaves unchanged from state 2 (or 1) take that state's paint, so the
states of one building read as one building.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
RENDER = HERE / 'out' / 'render'
SIZE = 512
GAP = 6
DRIFT = 8


def pieces(names: list[str]) -> list[tuple[str, str]]:
    meta = json.loads((RENDER / 'structures.json').read_text())
    out = []
    for name in names or list(meta):
        for key in meta[name]['pieces']:
            out.append((name, key))
    return out


def pack(set_name: str, *names: str) -> None:
    out = HERE / 'out' / 'sheets' / set_name
    out.mkdir(parents=True, exist_ok=True)
    items = []
    for name, key in pieces(list(names)):
        im = Image.open(RENDER / name / f'{key}.png').convert('RGBA')
        bb = im.getbbox()
        if bb:
            items.append((name, key, im, bb))
    items.sort(key=lambda t: (-(t[3][3] - t[3][1]), -(t[3][2] - t[3][0])))
    sheets: list[Image.Image] = []
    shelves: list[list] = []  # per sheet: [y, row height, x]
    place = {}
    for name, key, im, (bx0, by0, bx1, by1) in items:
        w, h = bx1 - bx0, by1 - by0
        if w + 2 * GAP > SIZE or h + 2 * GAP > SIZE:
            raise SystemExit(f'{key} is {w}x{h}, too big for a sheet')
        spot = None
        for n, sh in enumerate(shelves):
            y, row, x = sh
            if x + w + GAP <= SIZE and y + h + GAP <= SIZE and (h <= row or row == 0):
                spot = (n, x, y)
                break
            if y + row + GAP + h + GAP <= SIZE:
                sh[0], sh[1], sh[2] = y + row + GAP, 0, GAP
                if w + 2 * GAP <= SIZE:
                    spot = (n, GAP, sh[0])
                    break
        if spot is None:
            sheets.append(Image.new('RGBA', (SIZE, SIZE)))
            shelves.append([GAP, 0, GAP])
            spot = (len(sheets) - 1, GAP, GAP)
        n, x, y = spot
        sheets[n].alpha_composite(im.crop((bx0, by0, bx1, by1)), (x, y))
        sh = shelves[n]
        sh[1] = max(sh[1], h)
        sh[2] = x + w + GAP
        place[key] = {'name': name, 'sheet': n, 'x': x - bx0, 'y': y - by0}
    for n, s in enumerate(sheets):
        s.save(out / f'sheet-{n}.png')
    (out / 'place.json').write_text(json.dumps(place, indent=1))
    print(len(place), 'pieces on', len(sheets), 'sheets')


def match(art: np.ndarray, src: np.ndarray, x: int, y: int) -> tuple[float, int, int]:
    mask = src[..., 3] > 0
    h, w = mask.shape
    best = (-1.0, 0, 0)
    for dy in range(-DRIFT, DRIFT + 1):
        for dx in range(-DRIFT, DRIFT + 1):
            ax, ay = x + dx, y + dy
            if ax < 0 or ay < 0 or ax + w > art.shape[1] or ay + h > art.shape[0]:
                continue
            on = art[ay:ay + h, ax:ax + w, 3] > 0
            score = (on & mask).sum() / max(1, (on | mask).sum())
            if score > best[0]:
                best = (float(score), dx, dy)
    return best


def cut(set_name: str) -> None:
    place = json.loads((HERE / 'out' / 'sheets' / set_name / 'place.json').read_text())
    worst = (1.0, '')
    arts: dict[int, np.ndarray] = {}
    for key, p in place.items():
        n = p['sheet']
        if n not in arts:
            arts[n] = np.array(Image.open(HERE / 'paint' / set_name / f'sheet-{n}.png').convert('RGBA'))
        art = arts[n]
        full = np.array(Image.open(RENDER / p['name'] / f'{key}.png').convert('RGBA'))
        ys, xs = np.nonzero(full[..., 3])
        by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        src = full[by0:by1, bx0:bx1]
        score, dx, dy = match(art, src, p['x'] + bx0, p['y'] + by0)
        if score < worst[0]:
            worst = (score, key)
        ax, ay = p['x'] + bx0 + dx, p['y'] + by0 + dy
        piece = art[ay:ay + by1 - by0, ax:ax + bx1 - bx0]
        rgb = np.where(piece[..., 3:] > 0, piece[..., :3], src[..., :3])
        whole = np.zeros_like(full)
        whole[by0:by1, bx0:bx1] = np.dstack([rgb, src[..., 3]])
        dest = HERE / 'out' / 'painted' / p['name']
        dest.mkdir(parents=True, exist_ok=True)
        Image.fromarray(whole).save(dest / f'{key}.png')
        print(f'  {key:28s} match {score:.3f} shift {dx:+d},{dy:+d}')
    print(len(place), 'cut; worst match', round(worst[0], 3), worst[1])


def unify(name: str) -> None:
    """A damaged state's unchanged pixels take the paint of the state above it."""
    meta = json.loads((RENDER / 'structures.json').read_text())[name]
    states = sorted(meta['states'], reverse=True)
    painted = HERE / 'out' / 'painted' / name
    for piece in ('', '-front', '-roof'):
        for hi, lo in zip(states, states[1:]):
            a, b = painted / f'{name}-{hi}{piece}.png', painted / f'{name}-{lo}{piece}.png'
            if not (a.exists() and b.exists()):
                continue
            ra = np.array(Image.open(RENDER / name / a.name).convert('RGBA')).astype(int)
            rb = np.array(Image.open(RENDER / name / b.name).convert('RGBA')).astype(int)
            pa = np.array(Image.open(a).convert('RGBA'))
            pb = np.array(Image.open(b).convert('RGBA'))
            same = (np.abs(ra - rb).sum(axis=-1) < 10) & (ra[..., 3] > 0) & (rb[..., 3] > 0)
            pb[same] = pa[same]
            Image.fromarray(pb).save(b)


def floors(*names: str) -> None:
    """A building's visible floor takes the barn's painted plank floor, lit as the model lights it there.
    PixelLab tends to paint a roof over an empty floor, which would show when the roof fades."""
    meta = json.loads((RENDER / 'structures.json').read_text())
    barn = np.array(Image.open(HERE / 'out' / 'painted' / 'barn' / 'barn-2.png').convert('RGBA')).astype(float)
    ax, ay = meta['barn']['anchor']
    src = barn[ay - 20:ay + 44, ax - 70:ax + 10, :3]
    concrete = HERE / 'paint' / 'ground' / 'concrete.png'
    for name in names:
        source = np.array(Image.open(concrete).convert('RGB')).astype(float) if name == 'hangar' else src
        for key in meta[name]['pieces']:
            fm = RENDER / name / f'{key}-floor.png'
            if not fm.exists():
                continue
            mask = np.array(Image.open(fm)) > 0
            ren = np.array(Image.open(RENDER / name / f'{key}.png').convert('RGB')).astype(float).mean(axis=-1)
            path = HERE / 'out' / 'painted' / name / f'{key}.png'
            art = np.array(Image.open(path).convert('RGBA')).astype(float)
            ys, xs = np.nonzero(mask)
            light = ren[ys, xs] / max(1.0, float(np.median(ren[ys, xs])))
            tex = source[ys % source.shape[0], xs % source.shape[1]]
            art[ys, xs, :3] = np.clip(tex * light[:, None] ** 0.8, 0, 255)
            Image.fromarray(art.astype(np.uint8)).save(path)
            print('  floor', key, len(ys), 'px')


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'pack':
        pack(*sys.argv[2:])
    elif cmd == 'cut':
        cut(sys.argv[2])
    elif cmd == 'floors':
        floors(*sys.argv[2:])
    elif cmd == 'unify':
        for nm in sys.argv[2:]:
            unify(nm)
