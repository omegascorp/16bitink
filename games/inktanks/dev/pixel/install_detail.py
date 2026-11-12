"""Puts the detail test's parts and grounds in ../detail-test/assets/<A|B|C>/.

  python3 dev/pixel/install_detail.py

Run after `tank_parts.py --density=A|B|C`, `frames.py cut hullsB|hullsC|turrets` and the grounds' download to
paint/ground/<D>.png. Density A keeps the art test's painted hulls and drives (assets/parts) and takes the new turrets;
B and C are painted at their own density. As install.py: the stripe goes back to the model's grey with a mask, and a
drive's frames 1 and 2 are frame 0's painting plus the model's change between frames.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
ART_TEST = HERE.parent / 'art-test' / 'assets' / 'parts'
DEST = HERE.parent / 'detail-test' / 'assets'
HULLS = ['hullLight', 'hullMedium', 'hullHeavy']
DRIVES = ['driveWheels', 'driveHalftrack', 'driveTracks']
TURRETS = ['turretMG', 'turretCannon', 'turretRocket', 'turretCannon3']


def arr(p: Path) -> np.ndarray:
    return np.array(Image.open(p).convert('RGBA')).astype(float)


def save(a: np.ndarray, p: Path) -> None:
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(p)


def install(d: str) -> None:
    dest = DEST / d
    shutil.rmtree(dest, ignore_errors=True)
    dest.mkdir(parents=True)
    models = OUT / f'parts-{d}'
    meta = json.loads((models / 'parts.json').read_text())
    stripe = []
    for key in HULLS + DRIVES + TURRETS:
        if d == 'A' and key not in TURRETS:
            for f in ART_TEST.glob(f'{key}*.png'):
                shutil.copy(f, dest / f.name)
            if (dest / f'{key}-stripe.png').exists():
                stripe.append(key)
            continue
        art = arr(OUT / 'painted' / d / f'{key}.png')
        model = arr(models / f'{key}.png')
        mask = np.array(Image.open(models / f'{key}-stripe.png')) > 0
        if mask.any():
            art[mask, :3] = model[mask, :3]
            Image.fromarray((mask * 255).astype(np.uint8)).save(dest / f'{key}-stripe.png')
            stripe.append(key)
        save(art, dest / f'{key}.png')
        if key in DRIVES:
            for f in (1, 2):
                frame = art.copy()
                frame[..., :3] += (arr(models / f'{key}-f{f}.png')[..., :3] - model[..., :3]) * 0.9
                save(frame, dest / f'{key}-f{f}.png')
    shutil.copy(HERE / 'paint' / 'ground' / f'{d}.png', dest / 'ground.png')
    size = Image.open(dest / 'hullHeavy.png').width
    (dest / 'manifest.json').write_text(json.dumps({'density': d, 'unit': meta['unit'], 'size': size, 'ring': meta['ring'], 'stripe': stripe,
                                                    'hulls': HULLS, 'drives': DRIVES, 'turrets': TURRETS}, indent=1))
    print(d, 'installed; part canvas', size, 'stripes', stripe)


if __name__ == '__main__':
    for density in 'ABC':
        install(density)
