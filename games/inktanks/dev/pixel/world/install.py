"""Installs the Meadowlands world art in src/art/pixel/world/ and writes its manifest.json.

  python3 dev/pixel/world/install.py

Run after build.py, topdown.py, the sheets' cut (+ floors, unify) and the ground's seam steps. Everything here is PixelLab's
paint on the models' outlines; this script only copies, picks frames and measures.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from seam import wrap_blur

HERE = Path(__file__).resolve().parent
PAINTED = HERE / 'out' / 'painted'
RENDER = HERE / 'out' / 'render'
GROUND = HERE / 'paint' / 'ground'
DEST = HERE.parents[2] / 'src' / 'art' / 'pixel' / 'world'

# name: (source file, how it overlaps its neighbours: higher draws over lower at an edge)
GROUNDS = {'water': ('water.png', 0), 'mud': ('mud.png', 1), 'sand': ('sand.png', 2), 'dirt': ('dirt.png', 3), 'concrete': ('concrete.png', 4),
           'grassDry': ('grassDry.png', 5), 'grass': ('grass.png', 6)}
# Decals: the candidates picked by eye from paint/decals/<kind>-<n>.png.
DECALS = {'tuft': ('tuftg', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]), 'tuftDry': ('tuftd', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
          'tuftBig': ('tuftc', [3, 4, 7, 9, 11, 14, 15, 19, 20, 24]), 'flowers': ('flowersc', [1, 3, 5, 7, 9, 11, 14, 17, 21, 23]),
          'puddle': ('puddle', [0, 4, 8, 14]), 'crater': ('crater', [0, 1, 2]), 'scorch': ('scorch', [0, 1, 3]), 'ruts': ('ruts', [0, 3])}
LAYER_GROUND = {'bridgeDeck', 'railH', 'railV'}


def edge_mask(rgb: np.ndarray) -> np.ndarray:
    """A texture's own breakup: its fine light and dark, wrapped, 0..255. Edges between grounds follow it, so grass meets
    dirt along its painted blades, not along a line."""
    lum = rgb.astype(float).mean(axis=-1)
    hi = lum - wrap_blur(lum[..., None], 3)[..., 0]
    hi = (hi - hi.mean()) / (hi.std() + 1e-6)
    return np.clip(128 + hi * 48, 0, 255).astype(np.uint8)


def ground() -> dict:
    out = DEST / 'ground'
    out.mkdir(parents=True, exist_ok=True)
    meta = {}
    for name, (src, order) in GROUNDS.items():
        p = GROUND / src
        if not p.exists():
            print('  missing ground', name)
            continue
        im = Image.open(p).convert('RGB')
        im.save(out / f'{name}.png')
        Image.fromarray(edge_mask(np.array(im))).save(out / f'{name}-edge.png')
        meta[name] = {'file': f'ground/{name}.png', 'edge': f'ground/{name}-edge.png', 'size': im.width, 'order': order}
    return meta


def decals() -> dict:
    out = DEST / 'decals'
    out.mkdir(parents=True, exist_ok=True)
    meta = {}
    for kind, (prefix, picks) in DECALS.items():
        keys = []
        for i, n in enumerate(picks):
            p = HERE / 'paint' / 'decals' / f'{prefix}-{n}.png'
            if not p.exists():
                continue
            im = Image.open(p).convert('RGBA')
            a = np.array(im)
            # Drop stray near-transparent fringe pixels, then crop.
            a[a[..., 3] < 40] = 0
            im = Image.fromarray(a)
            im = im.crop(im.getbbox())
            key = f'{kind}{i + 1}'
            im.save(out / f'{key}.png')
            keys.append({'key': key, 'file': f'decals/{key}.png', 'size': [im.width, im.height]})
        meta[kind] = keys
    return meta


def structures() -> dict:
    out = DEST / 'structures'
    out.mkdir(parents=True, exist_ok=True)
    meta = json.loads((RENDER / 'structures.json').read_text())
    result = {}
    for name, m in meta.items():
        files = {}
        for key in m['pieces']:
            src = PAINTED / name / f'{key}.png'
            if not src.exists():
                print('  unpainted', key)
                src = RENDER / name / f'{key}.png'
            shutil.copy(src, out / f'{key}.png')
            files[key] = f'structures/{key}.png'
        for st in m['states']:
            shutil.copy(RENDER / name / f'{name}-{st}-shadow.png', out / f'{name}-{st}-shadow.png')
        result[name] = {
            'layer': 'ground' if name in LAYER_GROUND else 'structure',
            'anchor': m['anchor'], 'size': m['size'], 'states': m['states'], 'hp': m['hp'], 'height': m['height'],
            'flattenable': m['flattenable'], 'cover': m['cover'],
            'footprint': m['footprint'], 'roofFade': m['roofFade'],
            'pieces': {k: {'file': files[k], 'sortY': v['sortY']} for k, v in m['pieces'].items()},
            'shadows': {str(st): f'structures/{name}-{st}-shadow.png' for st in m['states']},
        }
    return result


def vehicles() -> dict:
    out = DEST / 'vehicles'
    out.mkdir(parents=True, exist_ok=True)
    meta = json.loads((RENDER / 'topdown.json').read_text())
    for key in ('truck-1', 'truck-0', 'fortress-body', 'fortress-treads', 'fortressCannon-1', 'fortressCannon-0', 'fortressMG-1', 'fortressMG-0',
                'fortressRockets-1', 'fortressRockets-0'):
        shutil.copy(PAINTED / key.split('-')[0] / f'{key}.png', out / f'{key}.png')
    # Second frames: frame 1's paint plus the model's change between the frames.
    for f1, f2 in (('truck-1', 'truck-1-f2'), ('fortress-treads', 'fortress-treads-f2')):
        name = f1.split('-')[0]
        art = np.array(Image.open(PAINTED / name / f'{f1}.png').convert('RGBA')).astype(float)
        m1 = np.array(Image.open(RENDER / name / f'{f1}.png').convert('RGBA')).astype(float)
        m2 = np.array(Image.open(RENDER / name / f'{f2}.png').convert('RGBA')).astype(float)
        frame = art.copy()
        frame[..., :3] += (m2[..., :3] - m1[..., :3]) * 0.9
        frame[..., 3] = np.maximum(art[..., 3], m2[..., 3])
        Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8)).save(out / f'{f2}.png')
    meta['truck']['files'] = {k: f'vehicles/{k}.png' for k in ('truck-1', 'truck-1-f2', 'truck-0')}
    meta['fortress']['files'] = {k: f'vehicles/{k}.png' for k in ('fortress-body', 'fortress-treads', 'fortress-treads-f2', 'fortressCannon-1', 'fortressCannon-0',
                                                                   'fortressMG-1', 'fortressMG-0', 'fortressRockets-1', 'fortressRockets-0')}
    return meta


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = {
        'density': 'C', 'unit': 2.0,
        'projection': 'structures: screen = (gx, gy - z), origin = anchor; vehicles: straight down, facing north, pivot = frame centre',
        'sun': {'shadow': [0.78, -0.58]},
        'ground': ground(), 'decals': decals(), 'structures': structures(), 'vehicles': vehicles(),
    }
    (DEST / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print('installed', len(manifest['structures']), 'structures,', len(manifest['ground']), 'grounds,', sum(len(v) for v in manifest['decals'].values()), 'decals')


if __name__ == '__main__':
    main()
