"""Puts the painted parts into the art test: ../art-test/assets/{parts,props}/ and art.json.

  python3 dev/pixel/install.py

Run after `frames.py cut tanks|props|house`. What it does to the painting, and nothing more:
- the team stripe (the model's STRIPE pixels) goes back to the model's flat grey, with a mask, so the game tints it;
- the drives' frames 1 and 2 are frame 0's painting plus the model's own change between frames (the links moving),
  so the treads roll exactly as the model's do and the painting doesn't flicker;
- projectiles stay the model's render: at 2 to 5 pixels there is nothing to paint.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
ASSETS = HERE.parent / 'art-test' / 'assets'
TANK = ['hullLight', 'hullMedium', 'hullHeavy', 'driveWheels', 'driveHalftrack', 'driveTracks', 'turretMG', 'turretCannon', 'turretRocket', 'turretCannon3', 'crate']
SHOTS = ['shotBullet', 'shotShell', 'shotRocket']
DRIVES = ['driveWheels', 'driveHalftrack', 'driveTracks']


def arr(p: Path) -> np.ndarray:
    return np.array(Image.open(p).convert('RGBA')).astype(float)


def save(a: np.ndarray, p: Path) -> None:
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(p)


def main() -> None:
    parts = ASSETS / 'parts'
    props = ASSETS / 'props'
    for d in (parts, props):
        shutil.rmtree(d, ignore_errors=True)
        d.mkdir(parents=True)
    for key in TANK:
        art = arr(OUT / 'painted' / f'{key}.png')
        model = arr(OUT / 'parts' / f'{key}.png')
        stripe = np.array(Image.open(OUT / 'parts' / f'{key}-stripe.png')) > 0
        if stripe.any():
            art[stripe, :3] = model[stripe, :3]
            Image.fromarray((stripe * 255).astype(np.uint8)).save(parts / f'{key}-stripe.png')
        save(art, parts / f'{key}.png')
        if key in DRIVES:
            for f in (1, 2):
                mk = arr(OUT / 'parts' / f'{key}-f{f}.png')
                frame = art.copy()
                frame[..., :3] += (mk[..., :3] - model[..., :3]) * 0.9
                save(frame, parts / f'{key}-f{f}.png')
    for key in SHOTS:
        shutil.copy(OUT / 'parts' / f'{key}.png', parts / f'{key}.png')
    smeta = json.loads((OUT / 'structures' / 'structures.json').read_text())
    for key in smeta['pieces']:
        shutil.copy(OUT / 'painted' / f'{key}.png', props / f'{key}.png')
    for name, at in smeta['shadows'].items():
        if at:
            shutil.copy(OUT / 'structures' / f'{name}-shadow.png', props / f'{name}-shadow.png')
    pmeta = json.loads((OUT / 'parts' / 'parts.json').read_text())
    art = {
        'partSize': pmeta['size'], 'ring': pmeta['ring'], 'deck': pmeta['deck'],
        'stripe': [k for k in TANK if (parts / f'{k}-stripe.png').exists()],
        'parts': TANK + SHOTS, 'drives': DRIVES,
        'props': smeta['pieces'], 'shadows': {k: v for k, v in smeta['shadows'].items() if v},
        'wall': smeta['wall'], 'house': smeta['house'], 'sun': smeta['sun'],
    }
    (ASSETS / 'art.json').write_text(json.dumps(art, indent=1))
    print('installed', len(TANK) + len(SHOTS), 'parts and', len(smeta['pieces']), 'props')


if __name__ == '__main__':
    main()
